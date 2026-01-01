import {APIGatewayProxyEvent, APIGatewayProxyResult} from 'aws-lambda';

import {registerConnection} from '../../../shared/persistence/connectionStore';
import {loadGameTable} from '../../../shared/persistence/gameTable'

export async function handler(event: APIGatewayProxyEvent):
    Promise<APIGatewayProxyResult> {
  const connectionID = event.requestContext.connectionId!;
  const {tableID, userID} = JSON.parse(event.body || '{}');

  try {
    const table = await loadGameTable(tableID);
    if (!table) {
      return {statusCode: 404, body: 'Table not found'};
    }

    await registerConnection(tableID, connectionID, userID);
    return {statusCode: 200, body: 'Connected'};
  } catch (error: any) {
    return {statusCode: 500, body: error.message};
  }
}
