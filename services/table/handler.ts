import {APIGatewayProxyEvent, APIGatewayProxyResult} from 'aws-lambda';

import {registerConnection} from '../../shared/persistence/connectionStore';

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
        const tableID = await create_table(userID, config);

        return success(201, tableID);
      }

      case 'GET /tables': {
        const filter = event.queryStringParameters || {};
        const tables = await listTables(filter);
        return success(200, {tables});
      }

      case 'GET /tables/{tableID}': {
        const tableID = event.pathParameters?.tableID!;
        if (!tableID) return error(401, 'Missing tableID');

        const table = await getTable(tableID);
        return success(200, table);
      }

      case 'POST /tables/{tableID}/sit': {
        if (!event.body) throw new Error('Invalid');

        const tableID = event.pathParameters?.tableID!;
        const {userID, buyIn} = JSON.parse(event.body);
        // QUESTION: Should this be a call to the auth service, persistence
        // layer, or a user service inside table?
        const user = await getMe(userID);

        if (user.balance < buyIn) return error(409, 'Insufficient Funds');

        enqueueInterRoundAction(
            tableID, sitDown, userID, buyIn);  // Game service command
        // lives in game service since if we are in interround phase, we want to
        // process right away
        return success(204, true);
      }

      case 'POST /tables/{tableID}/stand': {
        if (!event.body) throw new Error('Invalid');

        const tableID = event.pathParameters?.tableID!;
        const {userID, buyIn} = JSON.parse(event.body);
        // QUESTION: Should this be a call to the auth service, persistence
        // layer, or a user service inside table?
        const user = await getMe(userID);

        enqueueInterRoundAction(
            tableID, standUp, userID, buyIn);  // Game service command
        // lives in game service since if we are in interround phase, we want to
        // process right away
        return success(204, true);
      }

      // not going to stop gameplay, just stop hands from being delt
      case 'POST /tables/{tableID}/pause_unpause': {
        if (!event.body) throw new Error('Invalid');

        const tableID = event.pathParameters?.tableID!;
        const {userID} = JSON.parse(event.body);
        if (!userID || !tableID) {
          throw new Error('Invalid');
        }
        const table = await getTable(tableID)

        if (table.owner != userID) return error(401, 'Unauthorized');

        await game.pause_unpause_table();

        if (table.status === 'running') {
          setTableStatus(paused);
        } else if (table.status === 'paused') {
          setTableStatus(running);
        } else
          return error(409, 'INVALID: Game has not started or is ended');


        return success(204, 'Game will pause after end of hand');
      }

      case 'POST /tables/{tableID}/join': {
        if (!event.body) throw new Error('Invalid');

        const tableID = event.pathParameters?.tableID!;
        const {userID} = JSON.parse(event.body);
        registerConnection(tableID, userID);
        return success(200, {message: 'Connected'});
        // join needs to connect to websocket
        // then returns the user the table's game state...? or no... we return
        // the tableID or and a confirmation then the frontend recieves the
        // websoccket thing...? need to think about how this works with
        // frontend especially if we want multi tables.
      }

      case 'POST /tables/{tableID}/leave': {
        if (!event.body) throw new Error('Invalid');
        const tableID = event.pathParameters?.tableID!;
        const {userID} = JSON.parse(event.body);
        // disconnects the websocket
        removeConnection(tableID, userID);
        return success(200, {message: 'Disconnected'});
      }


      case 'POST /tables/{tableID}/end': {
        if (!event.body) throw new Error('Invalid');

        const tableID = event.pathParameters?.tableID!;
        const {userID} = JSON.parse(event.body);
        if (!userID || !tableID) {
          throw new Error('Invalid');
        }
        const table = await getTable(tableID)

        if (table.owner != userID) return error(401, 'Unauthorized');
        if (table.status === 'ended')
          return error(409, 'INVALID: Game already ended');


        end_game(tableID);  // finalizes ledger, removes game state, sets
                            // table status to ended
        return success(204, 'Game session ended');
      }

      case 'PATCH /tables/{tableID}/update_config': {
        if (!event.body) throw new Error('Invalid');

        const tableID = event.pathParameters?.tableID!;
        const {userID, config} = JSON.parse(event.body);
        if (!userID || !tableID) {
          throw new Error('Invalid');
        }
        const table = await getTable(tableID)

        if (table.owner != userID) return error(401, 'Unauthorized');

        enqueueInterRoundAction(configUpdate, config)
        updateTableConfig(config);

        return success(204, 'Config will update after end of hand');
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
      statusCode: err.message === 'Invalid' ? 401 : 400,
      headers: corsHeaders,
      body: JSON.stringify({message: err.message}),
    };
  }
}