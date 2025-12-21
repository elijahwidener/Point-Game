import {GetItemCommand, PutItemCommand} from '@aws-sdk/client-dynamodb';
import {marshall, unmarshall} from '@aws-sdk/util-dynamodb';

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

export async function createUser(
    userID: string, username: string, password: string,
    balance: number): Promise<string> {
  const user: User = {
    userID,
    username,
    password,
    balance,
  };

  await ddb.send(new PutItemCommand({
    TableName: TABLES.USERS,
    Item: marshall(user),
    ConditionExpression: 'attribute_not_exists(userID)',

  }));
  return userID;
}