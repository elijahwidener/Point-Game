// services/game/handler.ts
import {APIGatewayProxyEvent, APIGatewayProxyResult} from 'aws-lambda';

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
        // TODO: Handle resync request
        break;

      default:
        return {statusCode: 400, body: 'Unknown message type'};
    }

    return {statusCode: 200, body: 'OK'};
  } catch (error: any) {
    console.error('Game handler error:', error);
    return {statusCode: 500, body: error.message};
  }
}