import { config as readEnv } from 'dotenv';
readEnv();

import * as Debug from 'debug';
import { Server } from './server';

import { models as driverModels, notifications as driverNotifications } from './repositories/driver-repository';
// import { queries as operQueries, models as operModels } from './repositories/driver-repository';

import {types} from 'pg';

const parseDate = function(val: string): string {
 //K1: I had a problem, the default behaviour case the reading to go back/forward
 return val+'T00:00:00.000Z';
}
types.setTypeParser(types.builtins.DATE, parseDate);

let server: Server;
let debug = Debug('4Kish-index');

async function main(){
  server = new Server();
  await server.run(
    process.env.SERVER_HOST || '0.0.0.0',
    parseInt(process.env.SERVER_PORT || '4080'),
    false, true,
    // process.env.WEBSOCKET_HOST || '0.0.0.0',
    // parseInt(process.env.WEBSOCKET_PORT || '4081'),
  );
  // server.registerQueryBuilder(operQueries);
  server.registerModel(driverModels);
  server.registerNotification(driverNotifications);
}

process.on('SIGINT', async function() {
  debug('stopping');
  try{
    await server.stop();
    process.exit(0);
  }catch(err){
    console.error(err);
    process.exit(1);
  }
});

debug(`starting...`);
main();