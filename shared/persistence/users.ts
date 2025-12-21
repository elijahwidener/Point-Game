import {GetItemCommand} from '@aws-sdk/client-dynamodb';
import {unmarshall} from '@aws-sdk/util-dynamodb';

import {ddb} from './dynamo/client';
import {TABLES} from './dynamo/tables';
import {User} from './types';


export async function loadUser(userId: string): Promise<User|null> {
  const result = await ddb.send(new GetItemCommand({
    TableName: TABLES.USERS,
    Key: {
      userId: {S: userId},
    },
  }));

  return result.Item ? (unmarshall(result.Item) as User) : null;
}
