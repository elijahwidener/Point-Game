import {GetItemCommand, PutItemCommand, QueryCommand} from '@aws-sdk/client-dynamodb';
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

export async function getAuthByUsername(username: string):
    Promise<{userID: string; passwordHash: string;}|null> {
  const result = await ddb.send(new QueryCommand({
    TableName: TABLES.USERS,
    IndexName: 'UsernameIndex',
    KeyConditionExpression: 'username = :u',
    ExpressionAttributeValues: {
      ':u': {S: username},
    },
    Limit: 1,
  }));

  if (!result.Items || result.Items.length === 0) {
    return null;
  }
  const user = unmarshall(result.Items[0]);

  return {
    userID: user.userID,
    passwordHash: user.passwordHash,
  };
}

export async function createUser(
    userID: string, username: string, passwordHash: string,
    balance: number): Promise<string> {
  const user: User = {
    userID,
    username,
    passwordHash,
    balance,
  };

  await ddb.send(new PutItemCommand({
    TableName: TABLES.USERS,
    Item: marshall(user),
    ConditionExpression: 'attribute_not_exists(userID)',

  }));
  return userID;
}