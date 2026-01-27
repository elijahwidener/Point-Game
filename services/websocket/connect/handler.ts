import {ApiGatewayManagementApiClient, PostToConnectionCommand} from '@aws-sdk/client-apigatewaymanagementapi';
import {APIGatewayProxyEvent, APIGatewayProxyResult} from 'aws-lambda';
import {isAwaitExpression} from 'typescript';

import {registerConnection} from '../../../shared/persistence/connectionStore';
import {loadGameState} from '../../../shared/persistence/gameState';
import {loadGameTable} from '../../../shared/persistence/gameTable';
import {applyPrivacyFiltering} from '../../../shared/utils/privacyFilter';

export async function handler(event: APIGatewayProxyEvent):
    Promise<APIGatewayProxyResult> {
  const connectionID = event.requestContext.connectionId!;
  const tableID = event.queryStringParameters?.tableID;
  const userID = event.queryStringParameters?.userID;

  if (!tableID || !userID) {
    return {statusCode: 400, body: 'Missing tableID or userID'};
  }

  const table = await loadGameTable(tableID);
  if (!table) return {statusCode: 404, body: 'Table not found'};

  await registerConnection(tableID, connectionID, userID);

  return {statusCode: 200, body: 'Connected'};
}
