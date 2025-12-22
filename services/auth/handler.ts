import {APIGatewayProxyEvent, APIGatewayProxyResult} from 'aws-lambda';

import {login, signup} from './service';


export async function handler(event: APIGatewayProxyEvent):
    Promise<APIGatewayProxyResult> {
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({message: 'Missing request body'}),
      };
    }

    const {username, password} = JSON.parse(event.body);

    switch (event.path) {
      case 'auth/signup':
        const user = await signup(username, password);
        return {
          statusCode: 201,
          body: JSON.stringify({user}),
        };
      case 'auth/login':
        const userID = await login(username, password);
        return {
          statusCode: 200,
          body: JSON.stringify({userID}),
        };
      default:
        return {
          statusCode: 404,
          body: JSON.stringify({message: 'Not Found'}),
        };
    }
  } catch (err: any) {
    return {
      statusCode: err.message === 'Invalid credentials' ? 401 : 400,
      body: JSON.stringify({message: err.message}),
    };
  }
}