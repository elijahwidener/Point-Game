import {ApiGatewayManagementApiClient, PostToConnectionCommand} from '@aws-sdk/client-apigatewaymanagementapi';

import {loadTableConnections, removeConnection} from '../../shared/persistence/connectionStore';
import {loadGameState} from '../../shared/persistence/gameState';
import {applyPrivacyFiltering} from '../../shared/utils/privacyFilter'

const apiGateway = new ApiGatewayManagementApiClient(
    {endpoint: process.env.WEBSOCKET_API_ENDPOINT});

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


export async function broadcastAction(
    tableID: string, action: any, gameSeq: number): Promise<void> {
  const connections = await loadTableConnections(tableID);
  if (!connections) return;

  const message = {type: 'action', payload: {...action, gameSeq}};

  await Promise.allSettled(connections.map(
      conn => postToConnection(tableID, conn.connectionID, message)));
}

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