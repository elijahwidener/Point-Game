import {APIGatewayProxyEvent, APIGatewayProxyResult} from 'aws-lambda';

import {loadConnectionByConnectionID} from '../../shared/persistence/connectionStore';
import {loadGameState} from '../../shared/persistence/gameState';
import {applyPrivacyFiltering} from '../../shared/utils/privacyFilter';

import {sendToConnection} from './broadcaster';
import {processPlayerAction} from './engine';

export async function handler(event: APIGatewayProxyEvent):
    Promise<APIGatewayProxyResult> {
  const connectionID = event.requestContext.connectionId!;
  const message = JSON.parse(event.body || '{}');

  try {
    switch (message.type) {
      case 'player_action':
        await processPlayerAction(
            message.tableID, message.userID, message.action, message.payload);
        break;

      case 'resync':
        await handleResync(connectionID, message.tableID);
        break;

      default:
        console.warn(`Unknown message type: ${message.type}`);
        return {statusCode: 400, body: 'Unknown message type'};
    }

    return {statusCode: 200, body: 'OK'};
  } catch (error: any) {
    console.error('Game handler error:', error);
    try {
      const conn = await loadConnectionByConnectionID(connectionID);
      if (conn) {
        await sendToConnection(conn.tableID, connectionID, {
          type: 'error',
          payload: {
            code: error.statusCode || 500,
            message: error.message || 'Internal server error'
          }
        });
      }
    } catch (sendError) {
      console.error('Failed to send error to client:', sendError);
    }

    return {statusCode: error.statusCode || 500, body: error.message};
  }
}


async function handleResync(
    connectionID: string, tableID: string): Promise<void> {
  const conn = await loadConnectionByConnectionID(connectionID);
  if (!conn) {
    console.error(`Resync requested but connection ${connectionID} not found`);
    return;
  }

  const state = await loadGameState(tableID);
  if (!state) {
    // No game state - send system message
    await sendToConnection(tableID, connectionID, {
      type: 'system',
      payload: {event: 'no_game', message: 'No active game at this table'}
    });
    return;
  }

  const displayState = applyPrivacyFiltering(state, conn.playerID);
  await sendToConnection(
      tableID, connectionID, {type: 'state', payload: displayState});

  console.log(`Resync sent to ${connectionID} for table ${tableID}`);
}