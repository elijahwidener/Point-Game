import {APIGatewayProxyEvent, APIGatewayProxyResult} from 'aws-lambda';

import {removeConnection} from '../../shared/persistence/connectionStore';

import {connectToTable, createGameTable, endGame, getTable, listGameTables, takeSeat, togglePause, updateConfig} from './service';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function success(statusCode: number, body?: any): APIGatewayProxyResult {
  return {
    statusCode,
    headers: corsHeaders,
    body: body ? JSON.stringify(body) : '',
  };
}

function error(statusCode: number, message: string): APIGatewayProxyResult {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify({message}),
  };
}

export async function handler(event: APIGatewayProxyEvent):
    Promise<APIGatewayProxyResult> {
  try {
    const route =
        `${event.httpMethod} ${event.resource}`;  // ✅ Use resource, not path

    switch (route) {
      case 'POST /tables': {
        if (!event.body) throw new Error('Invalid');

        const {userID, config} = JSON.parse(event.body);
        if (!userID || !config) {
          throw new Error('Invalid');
        }
        const tableID = await createGameTable(userID, config);

        return success(201, tableID);
      }

      case 'GET /tables': {
        const filter = event.queryStringParameters || {};
        const tables: any[] = await listGameTables(filter);
        return success(200, {tables});
      }

      case 'GET /tables/{tableID}': {
        const tableID = event.pathParameters?.tableID!;
        if (!tableID) return error(400, 'Missing tableID');

        const table = await getTable(tableID);
        return success(200, table);
      }

      // not going to stop gameplay, just stop hands from being dealt
      case 'POST /tables/{tableID}/pause_unpause': {
        if (!event.body) throw new Error('Invalid');
        const tableID = event.pathParameters?.tableID!;
        const {userID} = JSON.parse(event.body);
        if (!userID || !tableID) {
          throw new Error('Invalid');
        }
        await togglePause(tableID, userID);
        return success(204);
      }

      case 'POST /tables/{tableID}/connect': {
        if (!event.body) throw new Error('Invalid');

        const tableID = event.pathParameters?.tableID!;
        const {userID} = JSON.parse(event.body);
        const table = await connectToTable(tableID);
        return success(200, table);

        // join needs to connect to websocket
        // then returns the user the table's game state...? or no... we return
        // the tableID or and a confirmation then the frontend receives the
        // web sockets thing...? need to think about how this works with
        // frontend especially if we want multi tables.
      }

      case 'POST /tables/{tableID}/sit': {
        if (!event.body) throw new Error('Invalid');

        const tableID = event.pathParameters?.tableID!;
        const {userID, buyIn} = JSON.parse(event.body);

        await takeSeat(tableID, userID, buyIn);
        return success(204);
      }

      case 'POST /tables/{tableID}/leave': {
        if (!event.body) throw new Error('Invalid');
        const tableID = event.pathParameters?.tableID!;
        const {userID} = JSON.parse(event.body);
        // disconnects the websocket
        await removeConnection(tableID, userID);
        return success(200, {message: 'Disconnected'});
      }

      // DONE
      case 'POST /tables/{tableID}/end': {
        if (!event.body) throw new Error('Invalid');

        const tableID = event.pathParameters?.tableID!;
        const {userID} = JSON.parse(event.body);
        if (!userID || !tableID) {
          throw new Error('Invalid');
        }
        await endGame(tableID, userID);  // finalizes ledger, removes game
                                         // state, sets table status to ended
        return success(204);
      }
      // DONE
      case 'PATCH /tables/{tableID}/update_config': {
        if (!event.body) throw new Error('Invalid');

        const tableID = event.pathParameters?.tableID!;
        const {userID, config} = JSON.parse(event.body);
        if (!userID || !tableID || !config) {
          throw new Error('Invalid');
        }

        await updateConfig(tableID, userID, config);

        return success(204);
      }

      default:
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify({message: 'Not Found'}),
        };
    }
  } catch (err: any) {
    return {
      statusCode: err.statusCode || 500,
      headers: corsHeaders,
      body: JSON.stringify({message: err.message}),
    };
  }
}