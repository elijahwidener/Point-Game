import {CognitoJwtVerifier} from 'aws-jwt-verify';
import {APIGatewayProxyEvent, APIGatewayProxyResult} from 'aws-lambda';

import {registerConnection} from '../../../shared/persistence/connectionStore';
import {loadGameTable} from '../../../shared/persistence/gameTable';

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID!,
  clientId: process.env.COGNITO_CLIENT_ID!,
  tokenUse: 'id',
});

export async function handler(event: APIGatewayProxyEvent):
    Promise<APIGatewayProxyResult> {
  const connectionID = event.requestContext.connectionId!;
  const tableID = event.queryStringParameters?.tableID;
  const token = event.queryStringParameters?.token;

  if (!tableID) {
    console.log('WebSocket connect rejected: missing tableID');
    return {statusCode: 400, body: 'Missing tableID'};
  }

  if (!token) {
    console.log('WebSocket connect rejected: missing token');
    return {statusCode: 401, body: 'Missing token'};
  }

  try {
    const payload = await verifier.verify(token);
    const userID = payload.sub;
    const username = payload['cognito:username'] as string;

    const table = await loadGameTable(tableID);
    if (!table) {
      console.log(`WebSocket connect rejected: table ${tableID} not found`);
      return {statusCode: 404, body: 'Table not found'};
    }

    await registerConnection(tableID, connectionID, userID);
    console.log(`Connection ${connectionID} registered for table ${tableID}`);

    return {statusCode: 200, body: 'Connected'};

  } catch (err: any) {
    console.error(' Websocket connect failed:', err.message);

    if (err.name === 'JwtExpiredError') {
      return {statusCode: 401, body: 'Token expired'};
    }
    if (err.name === 'JwtInvalidSignatureError' ||
        err.name === 'JwtInvalidClaimError') {
      return {statusCode: 401, body: 'Invalid token'};
    }

    return {statusCode: 401, body: 'Authentication failed'};
  }
}