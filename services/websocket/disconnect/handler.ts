import {APIGatewayProxyEvent, APIGatewayProxyResult} from 'aws-lambda';

import {loadConnectionByConnectionID, removeConnection} from '../../../shared/persistence/connectionStore';

export async function handler(event: APIGatewayProxyEvent):
    Promise<APIGatewayProxyResult> {
  const connectionID = event.requestContext.connectionId!;
  const conn = await loadConnectionByConnectionID(connectionID);
  if (conn) {
    await removeConnection(conn.tableID, connectionID);
  }

  return {statusCode: 200, body: 'Disconnected'};
}