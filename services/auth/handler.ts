import {APIGatewayProxyEvent, APIGatewayProxyResult} from 'aws-lambda';

import {getMe} from '../user/service';

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

      case '/me': {
        if (event.httpMethod !== 'GET') {
          return {
            statusCode: 405,
            body: 'Method Not Allowed',
          };
        }

        const myID = event.queryStringParameters?.userID;
        if (!myID) {
          return {
            statusCode: 400,
            body: 'Missing userID',
          };
        }

        const me = await getMe(myID);
        return {
          statusCode: 200, body: JSON.stringify(me)
        }
      }

      default:
        return {
          statusCode: 404,
          body: JSON.stringify({message: 'Not Found'}),
        };
    }
  } catch (err: any) {
    return {
      statusCode: err.message === 'Invalid' ? 401 : 400,
      body: JSON.stringify({message: err.message}),
    };
  }
}