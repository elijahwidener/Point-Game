// Unit tests for the atomic state + action-log commit.
//
// The DynamoDB client is mocked so we can force the cancellation shapes the
// real service returns without touching AWS.

const mockSend = jest.fn();

jest.mock('../../shared/persistence/dynamo/client', () => ({
  ddb: {send: mockSend},
}));

import {ConflictError} from '../../shared/errors';
import {commitActionAtomic} from '../../shared/persistence/commit';
import {ActionLog, GameState} from '../../shared/persistence/types';

function makeState(gameSeq: number): GameState {
  return {
    tableID: 'table-1',
    handSeq: 4,
    config: {ante: 0, smallBlind: 1, bigBlind: 2, maxPlayers: 6},
    seats: [{
      seat: 0,
      playerID: 'player-1',
      stack: 100,
      bet: 2,
      holeCards: [],
      folded: false,
      acted: true,
      active: true,
    }],
    deck: [],
    street: 'Preflop',
    boardCards: [],
    button: 0,
    pots: [{amount: 0, eligibleSeats: []}],
    currentPlayerSeat: 0,
    currentBet: 2,
    minRaise: 4,
    timerSeq: 7,
    gameSeq,
  };
}

function makeEntry(actionSeq: number): ActionLog {
  return {
    handID: 'table-1#4',
    actionSeq,
    playerID: 'player-1',
    action: 'call',
    payload: [],
    timestamp: 1_700_000_000_000,
  };
}

/**
 * A cancelled transaction: name + positional CancellationReasons, matching what
 * the SDK throws. Index 0 is GameState, index 1 is ActionLog.
 */
function transactionCancelled(reasons: Array<{Code: string}>): Error {
  const error = new Error('Transaction cancelled, please refer cancellation reasons');
  error.name = 'TransactionCanceledException';
  (error as any).CancellationReasons = reasons;
  return error;
}

beforeEach(() => {
  mockSend.mockReset();
});

describe('commitActionAtomic', () => {
  it('writes state and action log in one transaction guarded by gameSeq', async () => {
    mockSend.mockResolvedValue({});

    const newGameSeq =
        await commitActionAtomic('table-1', makeState(11), 11, makeEntry(12));

    expect(newGameSeq).toBe(12);
    expect(mockSend).toHaveBeenCalledTimes(1);

    const {TransactItems} = mockSend.mock.calls[0][0].input;
    expect(TransactItems).toHaveLength(2);

    // OCC guard preserved exactly as the non-transactional write had it.
    const statePut = TransactItems[0].Put;
    expect(statePut.TableName).toBe('GameState');
    expect(statePut.ConditionExpression).toBe('gameSeq = :expectedSeq');
    expect(statePut.ExpressionAttributeValues[':expectedSeq']).toEqual({N: '11'});
    expect(statePut.Item.gameSeq).toEqual({N: '12'});

    const logPut = TransactItems[1].Put;
    expect(logPut.TableName).toBe('ActionLog');
    expect(logPut.ConditionExpression).toBe('attribute_not_exists(actionSeq)');
  });

  it('writes timerSeq only when a new turn begins', async () => {
    mockSend.mockResolvedValue({});

    await commitActionAtomic('table-1', makeState(11), 11, makeEntry(12), 8);
    expect(mockSend.mock.calls[0][0].input.TransactItems[0].Put.Item.timerSeq)
        .toEqual({N: '8'});

    mockSend.mockReset();
    mockSend.mockResolvedValue({});

    // Omitted: state keeps whatever timerSeq it already carried.
    await commitActionAtomic('table-1', makeState(11), 11, makeEntry(12));
    expect(mockSend.mock.calls[0][0].input.TransactItems[0].Put.Item.timerSeq)
        .toEqual({N: '7'});
  });

  it('detects a version conflict and surfaces it as ConflictError', async () => {
    // The regression this guards: a conflict inside a transaction arrives as
    // TransactionCanceledException, never ConditionalCheckFailedException. If
    // the Code is not read out of CancellationReasons the mismatch looks like
    // an unrelated 500 and the client never learns to resync.
    mockSend.mockRejectedValue(transactionCancelled(
        [{Code: 'ConditionalCheckFailed'}, {Code: 'None'}]));

    await expect(commitActionAtomic('table-1', makeState(11), 11, makeEntry(12)))
        .rejects.toThrow(ConflictError);
  });

  it('reports a duplicate action log entry as a conflict', async () => {
    mockSend.mockRejectedValue(transactionCancelled(
        [{Code: 'None'}, {Code: 'ConditionalCheckFailed'}]));

    await expect(commitActionAtomic('table-1', makeState(11), 11, makeEntry(12)))
        .rejects.toThrow(ConflictError);
  });

  it('does not swallow cancellations that are not conflicts', async () => {
    mockSend.mockRejectedValue(transactionCancelled(
        [{Code: 'ThrottlingError'}, {Code: 'None'}]));

    const thrown = await commitActionAtomic('table-1', makeState(11), 11, makeEntry(12))
                       .catch((e: Error) => e);

    expect(thrown).not.toBeInstanceOf(ConflictError);
    expect((thrown as Error).name).toBe('TransactionCanceledException');
  });

  it('rethrows unrelated errors untouched', async () => {
    mockSend.mockRejectedValue(new Error('network down'));

    await expect(commitActionAtomic('table-1', makeState(11), 11, makeEntry(12)))
        .rejects.toThrow('network down');
  });
});
