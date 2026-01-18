import {ApiGatewayManagementApiClient, PostToConnectionCommand} from '@aws-sdk/client-apigatewaymanagementapi';

import {loadTableConnections, removeConnection} from '../../shared/persistence/connectionStore';
import {loadGameState} from '../../shared/persistence/gameState';
import {applyPrivacyFiltering} from '../../shared/utils/privacyFilter'

const apiGateway = new ApiGatewayManagementApiClient(
    {endpoint: process.env.WEBSOCKET_API_ENDPOINT});


/**
 * Broadcasts the full game state to all connected players.
 * Each player receives a filtered view based on privacy rules.
 */
export async function broadcastState(tableID: string): Promise<void> {
  const state = await loadGameState(tableID);
  const connections = await loadTableConnections(tableID);

  if (!state || !connections) return;

  await Promise.allSettled(connections.map(conn => {
    const filteredState = applyPrivacyFiltering(state, conn.playerID);
    const message = {type: 'state', payload: filteredState};
    return postToConnection(tableID, conn.connectionID, message);
  }));
}


/**
 * Action payload for broadcasting
 */
interface BroadcastableAction {
  playerID: string;
  action: string;
  payload?: any;
  username?: string;
}


/**
 * Broadcasts a player action to all connected players.
 *
 * @param tableID - The table to broadcast to
 * @param action - The action details including playerID, action type, and
 *     payload
 * @param gameSeq - The game sequence number for ordering
 * @param currentStreet - Current game street for privacy filtering
 */
export async function broadcastAction(
    tableID: string, action: BroadcastableAction, gameSeq: number,
    currentStreet: string): Promise<void> {
  const connections = await loadTableConnections(tableID);
  if (!connections) return;
  let sanitizedAction = action;
  if (action.action === 'declare') {
    sanitizedAction = {...action, payload: undefined};
  }
  const message = {type: 'action', payload: {...sanitizedAction, gameSeq}};
  await Promise.allSettled(connections.map(
      conn => postToConnection(tableID, conn.connectionID, message)));
}

/**
 * Broadcasts a system message to all connected players.
 * System messages include things like:
 * - showdown_results: Winner announcements at start of next hand
 * - discards: Cards discarded by players
 * - street_change: When the game advances to a new street
 */
export async function broadcastSystem(
    tableID: string, event: string, data?: any): Promise<void> {
  const connections = await loadTableConnections(tableID);
  if (!connections) return;

  const message = {type: 'system', payload: {event, ...data}};

  await Promise.allSettled(connections.map(
      conn => postToConnection(tableID, conn.connectionID, message)));
}


async function postToConnection(
    tableID: string, connectionID: string, message: any): Promise<void> {
  try {
    await apiGateway.send(new PostToConnectionCommand({
      ConnectionId: connectionID,
      Data: Buffer.from(JSON.stringify(message))
    }));
  } catch (error: any) {
    if (error.statusCode === 410) {
      await removeConnection(tableID, connectionID);
      console.log(`Removed stale connection: ${connectionID}`);
    } else {
      console.error(`Failed to send to ${connectionID}: ${error.message}`);
    }
  }
}

/**
 * Sends a message directly to a specific connection.
 * Used for resync requests and targeted messages.
 */
export async function sendToConnection(
    tableID: string, connectionID: string, message: any): Promise<void> {
  await postToConnection(tableID, connectionID, message);
}