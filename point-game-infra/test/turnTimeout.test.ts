// Unit tests for the turn timeout handler.
//
// Schedules are never cancelled, so the handler fires on every turn whether or
// not the player acted. The timerSeq comparison is the whole safety mechanism:
// these tests pin both sides of it.

const mockLoadGameState = jest.fn();
const mockProcessPlayerAction = jest.fn();

jest.mock('../../shared/persistence/gameState', () => ({
  loadGameState: mockLoadGameState,
}));

jest.mock('../../services/game/engine', () => ({
  processPlayerAction: mockProcessPlayerAction,
}));

import {ConflictError} from '../../shared/errors';
import {handler} from '../../services/game/timeout/handler';
import {GameState} from '../../shared/persistence/types';

interface StateOverrides {
  timerSeq?: number;
  street?: string;
  currentBet?: number;
  seatBet?: number;
  folded?: boolean;
}

function makeState(overrides: StateOverrides = {}): GameState {
  const {
    timerSeq = 3,
    street = 'Flop',
    currentBet = 10,
    seatBet = 10,
    folded = false,
  } = overrides;

  return {
    tableID: 'table-1',
    handSeq: 2,
    config: {ante: 0, smallBlind: 1, bigBlind: 2, maxPlayers: 6},
    seats: [{
      seat: 0,
      playerID: 'player-1',
      stack: 100,
      bet: seatBet,
      holeCards: [],
      folded,
      acted: false,
      active: true,
    }],
    deck: [],
    street,
    boardCards: [],
    button: 0,
    pots: [{amount: 0, eligibleSeats: []}],
    currentPlayerSeat: 0,
    currentBet,
    minRaise: 20,
    timerSeq,
    gameSeq: 42,
  };
}

beforeEach(() => {
  mockLoadGameState.mockReset();
  mockProcessPlayerAction.mockReset();
  mockProcessPlayerAction.mockResolvedValue(undefined);
});

describe('turn timeout handler', () => {
  it('no-ops when the timerSeq does not match (turn already advanced)', async () => {
    mockLoadGameState.mockResolvedValue(makeState({timerSeq: 5}));

    await handler({tableID: 'table-1', timerSeq: 3});

    expect(mockProcessPlayerAction).not.toHaveBeenCalled();
  });

  it('checks when the player owes nothing', async () => {
    mockLoadGameState.mockResolvedValue(
        makeState({timerSeq: 3, currentBet: 10, seatBet: 10}));

    await handler({tableID: 'table-1', timerSeq: 3});

    expect(mockProcessPlayerAction)
        .toHaveBeenCalledWith('table-1', 'player-1', 'check', {});
  });

  it('folds when checking would be illegal', async () => {
    mockLoadGameState.mockResolvedValue(
        makeState({timerSeq: 3, currentBet: 10, seatBet: 0}));

    await handler({tableID: 'table-1', timerSeq: 3});

    expect(mockProcessPlayerAction)
        .toHaveBeenCalledWith('table-1', 'player-1', 'fold', {});
  });

  it('no-ops when there is no game state', async () => {
    mockLoadGameState.mockResolvedValue(null);

    await handler({tableID: 'table-1', timerSeq: 3});

    expect(mockProcessPlayerAction).not.toHaveBeenCalled();
  });

  it('no-ops when nobody is on the clock', async () => {
    // Declare has no single current actor, so it is never force-acted.
    mockLoadGameState.mockResolvedValue(makeState({street: 'Declare'}));

    await handler({tableID: 'table-1', timerSeq: 3});

    expect(mockProcessPlayerAction).not.toHaveBeenCalled();
  });

  it('swallows a conflict when the player wins the race', async () => {
    // timerSeq matched, but the player acted before the forced write landed and
    // the OCC guard rejected the timeout. That is the mechanism working, not an
    // error worth failing the invocation over.
    mockLoadGameState.mockResolvedValue(makeState({timerSeq: 3}));
    mockProcessPlayerAction.mockRejectedValue(
        new ConflictError('State conflict during game action'));

    await expect(handler({tableID: 'table-1', timerSeq: 3}))
        .resolves.toBeUndefined();
  });

  it('propagates unexpected errors', async () => {
    mockLoadGameState.mockResolvedValue(makeState({timerSeq: 3}));
    mockProcessPlayerAction.mockRejectedValue(new Error('dynamo exploded'));

    await expect(handler({tableID: 'table-1', timerSeq: 3}))
        .rejects.toThrow('dynamo exploded');
  });
});
