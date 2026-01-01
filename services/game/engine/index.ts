import {writeAction} from '../../../shared/persistence/actionLog';
import {loadGameState, updateGameState} from '../../../shared/persistence/gameState';
import {broadcastAction, broadcastState} from '../broadcaster';

export async function processPlayerAction(
    tableID: string, playerID: string, action: string,
    payload: any): Promise<void> {
  // 1. Load current state
  const state = await loadGameState(tableID);
  if (!state) throw new Error('Game state not found');

  // 2. Validate action
  validateAction(state, playerID, action, payload);

  // 3. Apply action
  const newState = applyAction(state, playerID, action, payload);

  // 4. Update game state
  const newGameSeq = await updateGameState(tableID, newState, state.gameSeq);

  // 5. Log action
  await writeAction({
    handID: `${tableID}#${state.handSeq || 0}`,
    actionID: newGameSeq,
    playerID,
    action,
    payload,
    timestamp: Date.now()
  });

  // 6. Broadcast
  await broadcastAction(tableID, {playerID, action, payload});

  // 7. Check if action closes the round
  if (isActionClosed(newState)) {
    await processGameAction(tableID);
  }
}