// Atomic per-action commit.
//
// GameState and ActionLog used to be written by two independent PutItems
// (updateGameState + writeAction). If the Lambda died between them the action
// log could gap relative to state. Both writes now go out as a single
// TransactWriteItems so they commit together or not at all.
//
// The OCC guarantee is unchanged: the GameState Put carries the same
// `gameSeq = :expectedSeq` ConditionExpression it always has.

import {TransactWriteItemsCommand} from '@aws-sdk/client-dynamodb';
import {marshall} from '@aws-sdk/util-dynamodb';

import {ConflictError} from '../errors';

import {ddb} from './dynamo/client';
import {FIELDS} from './dynamo/fields';
import {TABLES} from './dynamo/tables';
import {ActionLog, GameState} from './types';

// Index of each item inside the TransactItems array below. A cancelled
// transaction reports one reason per item, positionally.
const GAME_STATE_ITEM = 0;
const ACTION_LOG_ITEM = 1;

interface CancellationReason {
  Code?: string;
  Message?: string;
}

/**
 * Commits a player action: the mutated GameState and its ActionLog entry, in
 * one transaction.
 *
 * @param tableID - The table being written
 * @param mutatedState - State after the action was applied
 * @param expectedGameSeq - gameSeq the caller read; the OCC guard
 * @param entry - ActionLog row for this action
 * @param timerSeq - Set only when this action begins a new turn
 * @returns The new gameSeq
 * @throws ConflictError if another writer won the race
 */
export async function commitActionAtomic(
    tableID: string, mutatedState: GameState, expectedGameSeq: number,
    entry: ActionLog, timerSeq?: number): Promise<number> {
  const nextGameSeq = expectedGameSeq + 1;
  const nextState = {
    ...mutatedState,
    tableID,
    gameSeq: nextGameSeq,
    ...(timerSeq !== undefined ? {timerSeq} : {}),
  };

  try {
    await ddb.send(new TransactWriteItemsCommand({
      TransactItems: [
        {
          Put: {
            TableName: TABLES.GAME_STATE,
            Item: marshall(nextState, {removeUndefinedValues: true}),
            ConditionExpression: `${FIELDS.GAME_STATE.GAME_SEQ} = :expectedSeq`,
            ExpressionAttributeValues: {
              ':expectedSeq': {N: expectedGameSeq.toString()},
            },
          },
        },
        {
          Put: {
            TableName: TABLES.ACTION_LOG,
            Item: marshall(entry, {removeUndefinedValues: true}),
            ConditionExpression:
                `attribute_not_exists(${FIELDS.ACTION_LOG.ACTION_SEQ})`,
          },
        },
      ],
    }));
  } catch (error) {
    throw translateTransactionError(error);
  }

  return nextGameSeq;
}

/**
 * A conditional check that fails inside a transaction surfaces as
 * TransactionCanceledException, NOT ConditionalCheckFailedException - the
 * per-item Codes live in CancellationReasons. Without this translation a
 * version mismatch would look like an unrelated 500 and never be recognised as
 * a conflict.
 *
 * Matching on `name` rather than `instanceof` on purpose: the SDK can resolve
 * to more than one copy on disk here, and `instanceof` fails across copies.
 */
function translateTransactionError(error: unknown): Error {
  const err = error as Error&{CancellationReasons?: CancellationReason[]};
  if (err?.name !== 'TransactionCanceledException') {
    return err;
  }

  const reasons = err.CancellationReasons ?? [];
  const failed = (index: number) =>
      reasons[index]?.Code === 'ConditionalCheckFailed';

  if (failed(GAME_STATE_ITEM)) {
    // Same shape advanceGameState already raises, so the client gets an error
    // and can resync.
    return new ConflictError('State conflict during game action');
  }

  if (failed(ACTION_LOG_ITEM)) {
    return new ConflictError('Action already recorded for this sequence');
  }

  // Cancelled for some other reason (throttling, capacity, ...). Surface it
  // rather than swallowing it.
  return err;
}
