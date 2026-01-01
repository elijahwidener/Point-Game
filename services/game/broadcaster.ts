import {ApiGatewayManagementApiClient, PostToConnectionCommand} from '@aws-sdk/client-apigatewaymanagementapi';

import {loadTableConnections, removeConnection} from '../../shared/persistence/connectionStore';
import {loadGameState} from '../../shared/persistence/gameState';

const apiGateway = new ApiGatewayManagementApiClient(
    {endpoint: process.env.WEBSOCKET_API_ENDPOINT});

export async function broadcastState(tableID: string): Promise<void> {
  const state = await loadGameState(tableID);
  const connections = await loadTableConnections(tableID);

  if (!state || !connections) return;

  for (const conn of connections) {
    const filteredState = applyPrivacyFiltering(state, conn.playerID);
    await postToConnection(tableID, conn.connectionID, filteredState);
  }
}

export async function broadcastAction(
    tableID: string, action: any): Promise<void> {
  const connections = await loadTableConnections(tableID);

  if (!connections) return;

  for (const conn of connections) {
    await postToConnection(
        tableID, conn.connectionID, {type: 'action', action});
  }
}

function applyPrivacyFiltering(state: any, playerID: string): any {
  // Filter out other players' hole cards
  const filtered = {...state};
  filtered.seats = state.seats.map((seat: any) => {
    if (seat.playerID !== playerID) {
      return {...seat, holeCards: null};
    }
    return seat;
  });
  return filtered;
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
      console.log('Stale connection:', connectionID);
    }
  }
}