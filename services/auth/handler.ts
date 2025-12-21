import {APIGatewayProxyEvent} from 'aws-lambda';

import {signup} from './service';


export async function handler(event: APIGatewayProxyEvent) {
  if (!event.body) {
    throw new Error('Missing request body');
  }
  const {username, password} = JSON.parse(event.body);

  switch (event.path) {
    case 'auth/signup':
      return signup(username, password)
    case 'auth/login':
      return login(username, password)
  }
}