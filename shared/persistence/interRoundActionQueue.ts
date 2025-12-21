import {AttributeValue, QueryCommand} from '@aws-sdk/client-dynamodb';
import {unmarshall} from '@aws-sdk/util-dynamodb';

import {ddb} from './dynamo/client';
import {TABLES} from './dynamo/tables';
import {InterroundAction} from './types';

export async function loadInterroundActions(tableID: string):
    Promise<InterroundAction[]> {
  const result = await ddb.send(new QueryCommand({
    TableName: TABLES.INTER_ROUND_ACTION_QUEUE,
    KeyConditionExpression: 'tableID = :tableID',
    ExpressionAttributeValues: {
      ':tableID': {S: tableID},
    },
    ScanIndexForward: true,  // ascending actionSeq
  }));

  return (result.Items ?? [])
      .map(
          (item: Record<string, AttributeValue>) =>
              unmarshall(item) as InterroundAction);
}