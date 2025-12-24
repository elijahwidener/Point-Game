import {GetItemCommand, PutItemCommand, QueryCommand, UpdateItemCommand} from '@aws-sdk/client-dynamodb';
import {marshall, unmarshall} from '@aws-sdk/util-dynamodb';

import {ddb} from './dynamo/client';
import {TABLES} from './dynamo/tables';
import {User} from './types';


export async function loadUser(userId: string):
    Promise<{userID: string; username: string; balance: number}|null> {
  const result = await ddb.send(new GetItemCommand({
    TableName: TABLES.USERS,
    Key: {
      userId: {S: userId},
    },
  }));

  if (!result.Item) return null;

  const user = unmarshall(result.Item) as User;

  return {
    userID: user.userID,
    username: user.username,
    balance: user.balance,
  };
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

export async function applyBalanceUpdate(
    userID: string, delta: number): Promise<number> {
  const result = await ddb.send(new UpdateItemCommand({
    TableName: TABLES.USERS,
    Key: {
      userID: {S: userID},
    },
    UpdateExpression: 'ADD balance :delta',
    ConditionExpression: 'attribute_exists(userID) AND balance >= :min',
    ExpressionAttributeValues: {
      ':delta': {N: delta.toString()},
      ':min': {N: '0'},

    },
    ReturnValues: 'UPDATED_NEW',
  }));

  const newBalance = result.Attributes?.balance?.N;

  if (newBalance === undefined) {
    throw new Error('Balance update failed');
  }

  return Number(newBalance);
}