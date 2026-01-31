import {APIGatewayProxyEvent, APIGatewayProxyResult} from 'aws-lambda';

import {loadConnectionByConnectionID} from '../../shared/persistence/connectionStore';
import {loadGameState} from '../../shared/persistence/gameState';
import {logger} from '../../shared/utils/logger';
import {applyPrivacyFiltering} from '../../shared/utils/privacyFilter';

import {sendToConnection} from './broadcaster';
import {processPlayerAction} from './engine';

export async function handler(event: APIGatewayProxyEvent):
    Promise<APIGatewayProxyResult> {
  const connectionID = event.requestContext.connectionId!;
  const message = JSON.parse(event.body || '{}');

  try {
    const conn = await loadConnectionByConnectionID(connectionID);
    if (!conn) {
      return {statusCode: 401, body: 'Connection not authenticated'};
    }

    switch (message.type) {
      case 'player_action':
        await processPlayerAction(
            message.tableID, conn.playerID, message.action, message.payload);
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
  const log = logger.child({tableID, connectionID, fn: 'handleResync'});

  const conn = await loadConnectionByConnectionID(connectionID);
  if (!conn) {
    log.error('Resync requested but connection not found');
    return;
  }

  const state = await loadGameState(tableID);
  if (!state) {
    await sendToConnection(tableID, connectionID, {
      type: 'system',
      payload: {event: 'no_game', message: 'No active game at this table'}
    });
    return;
  }

  const displayState = applyPrivacyFiltering(state, conn.playerID);
  await sendToConnection(
      tableID, connectionID, {type: 'state', payload: displayState});
  log.info('Resync sent', {playerID: conn.playerID});
}