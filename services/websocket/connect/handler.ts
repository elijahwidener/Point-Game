import {APIGatewayProxyEvent, APIGatewayProxyResult} from 'aws-lambda';

import {registerConnection} from '../../../shared/persistence/connectionStore';
import {loadGameTable} from '../../../shared/persistence/gameTable'

export async function handler(event: APIGatewayProxyEvent):
    Promise<APIGatewayProxyResult> {
  const connectionID = event.requestContext.connectionId!;

  // Parse tableID and userID from query string (or custom headers)
  const tableID = event.queryStringParameters?.tableID;
  const userID = event.queryStringParameters?.userID;

  if (!tableID || !userID) {
    return {statusCode: 400, body: 'Missing tableID or userID'};
  }

  const table = await loadGameTable(tableID);
  if (!table) return {statusCode: 404, body: 'Table not found'};

  await registerConnection(tableID, connectionID, userID);

  console.log(`Connection ${connectionID} registered for table ${
      tableID} and user ${userID}`);
  return {statusCode: 200, body: ''};
}