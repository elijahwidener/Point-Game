import {
  DynamoDBClient,
  GetItemCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";

const dynamoClient = new DynamoDBClient({});
const TABLE_NAME = process.env.TABLE_NAME!;
const WEBSOCKET_ENDPOINT = process.env.WEBSOCKET_ENDPOINT!;

// Store active connections (in production, use DynamoDB)
const COUNTER_KEY = "GLOBAL_COUNTER";
const CONNECTIONS_KEY = "CONNECTIONS";

interface WebSocketEvent {
  requestContext: {
    connectionId: string;
    routeKey: string;
    domainName: string;
    stage: string;
  };
  body?: string;
}

interface ActionPayload {
  action: string;
}

async function getCounter(): Promise<number> {
  const result = await dynamoClient.send(
    new GetItemCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: { S: COUNTER_KEY },
      },
    })
  );

  return result.Item?.counter?.N ? parseInt(result.Item.counter.N, 10) : 0;
}

async function incrementCounter(): Promise<number> {
  const result = await dynamoClient.send(
    new UpdateItemCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: { S: COUNTER_KEY },
      },
      UpdateExpression:
        "SET #counter = if_not_exists(#counter, :zero) + :inc",
      ExpressionAttributeNames: {
        "#counter": "counter",
      },
      ExpressionAttributeValues: {
        ":inc": { N: "1" },
        ":zero": { N: "0" },
      },
      ReturnValues: "UPDATED_NEW",
    })
  );

  return result.Attributes?.counter?.N
    ? parseInt(result.Attributes.counter.N, 10)
    : 0;
}

async function getConnections(): Promise<string[]> {
  const result = await dynamoClient.send(
    new GetItemCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: { S: CONNECTIONS_KEY },
      },
    })
  );

  return result.Item?.connections?.SS || [];
}

async function addConnection(connectionId: string): Promise<void> {
  await dynamoClient.send(
    new UpdateItemCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: { S: CONNECTIONS_KEY },
      },
      UpdateExpression: "ADD #connections :connection",
      ExpressionAttributeNames: {
        "#connections": "connections",
      },
      ExpressionAttributeValues: {
        ":connection": { SS: [connectionId] },
      },
    })
  );
}

async function removeConnection(connectionId: string): Promise<void> {
  await dynamoClient.send(
    new UpdateItemCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: { S: CONNECTIONS_KEY },
      },
      UpdateExpression: "DELETE #connections :connection",
      ExpressionAttributeNames: {
        "#connections": "connections",
      },
      ExpressionAttributeValues: {
        ":connection": { SS: [connectionId] },
      },
    })
  );
}

async function broadcastToAll(
  apiClient: ApiGatewayManagementApiClient,
  message: object
): Promise<void> {
  const connections = await getConnections();
  const messageData = JSON.stringify(message);

  const sendPromises = connections.map(async (connectionId) => {
    try {
      await apiClient.send(
        new PostToConnectionCommand({
          ConnectionId: connectionId,
          Data: Buffer.from(messageData),
        })
      );
    } catch (error: unknown) {
      const err = error as { statusCode?: number };
      if (err.statusCode === 410) {
        // Connection is stale, remove it
        await removeConnection(connectionId);
      } else {
        console.error(`Failed to send to ${connectionId}:`, error);
      }
    }
  });

  await Promise.all(sendPromises);
}

async function sendToConnection(
  apiClient: ApiGatewayManagementApiClient,
  connectionId: string,
  message: object
): Promise<void> {
  try {
    await apiClient.send(
      new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: Buffer.from(JSON.stringify(message)),
      })
    );
  } catch (error) {
    console.error(`Failed to send to ${connectionId}:`, error);
  }
}

export const handler = async (event: WebSocketEvent) => {
  const { connectionId, routeKey, domainName, stage } = event.requestContext;

  console.log(`Route: ${routeKey}, ConnectionId: ${connectionId}`);

  const apiClient = new ApiGatewayManagementApiClient({
    endpoint: `https://${domainName}/${stage}`,
  });

  try {
    switch (routeKey) {
      case "$connect":
        await addConnection(connectionId);
        console.log(`Connection added: ${connectionId}`);
        return { statusCode: 200, body: "Connected" };

      case "$disconnect":
        await removeConnection(connectionId);
        console.log(`Connection removed: ${connectionId}`);
        return { statusCode: 200, body: "Disconnected" };

      case "$default": {
        if (!event.body) {
          return { statusCode: 400, body: "No message body" };
        }

        let payload: ActionPayload;
        try {
          payload = JSON.parse(event.body);
        } catch {
          return { statusCode: 400, body: "Invalid JSON" };
        }

        const { action } = payload;

        if (action === "increment") {
          const newCounter = await incrementCounter();
          await broadcastToAll(apiClient, { counter: newCounter });
          return { statusCode: 200, body: "Counter incremented" };
        }

        if (action === "getCounter") {
          const counter = await getCounter();
          await sendToConnection(apiClient, connectionId, { counter });
          return { statusCode: 200, body: "Counter sent" };
        }

        return { statusCode: 400, body: `Unknown action: ${action}` };
      }

      default:
        return { statusCode: 400, body: `Unknown route: ${routeKey}` };
    }
  } catch (error) {
    console.error("Error:", error);
    return { statusCode: 500, body: "Internal server error" };
  }
};
