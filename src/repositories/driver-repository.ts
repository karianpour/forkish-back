import { Server } from "../server";
import { Model, RouteOptions } from "../services/interfaces";
import { PoolClient } from "pg";
import { HTTPMethod, FastifyRequest } from "fastify";
import { addFailureForBanned, checkForBanned } from '../services/banned';
import { mapToLatin } from '../utils/farsiUtils';
import { pause, camelCaseObject } from '../utils/generalUtils';
import { hasRole } from '../services/auth-functions';
import { Unauthorized } from 'http-errors';
import { throwError } from '../services/value-validators';
import * as sql from 'sql-bricks-postgres';
import * as Debug from 'debug';
import { snakeCasedFields } from "../utils/dbUtils";
import { sendActivationSMS } from "../services/sms";
import websocketPlugin = require("fastify-websocket");
import { heartbeat } from "../services/http-server";
 
let debug = Debug('4kish-driver');

export const BookAccessRoles = ['owner', 'adviser', 'bookkeeper'];

const fields: string[] = snakeCasedFields([
  'id',
  'mobile',
  'firstname',
  'lastname',
  'title',
  'email',
  'extendedData',
]);

class Driver implements Model {
  private server: Server;

  setServer(s: Server) { this.server = s; }

  address() { return '/driver'; }

  routes(): RouteOptions[] {
    return [{
      method: 'GET' as HTTPMethod,
      public: false,
      url: '/:id',
      schema: {
      },
      handler: this.handleFindById
    },{
      method: 'POST' as HTTPMethod,
      public: true,
      url: '/send_activation',
      schema: {
      },
      handler: this.handleSendActivation
    },{
      method: 'POST' as HTTPMethod,
      public: true,
      url: '/verify_activation',
      schema: {
      },
      handler: this.handleVerifyActivation, 
    },{
      method: 'GET' as HTTPMethod,
      public: true,
      url: '/ws',
      schema: {
      },
      handler: () => {},
      wsHandler: this.handleWs, 
    }];
  }

  actions() {
    return [
      {
        address: () => '/findById',
        public: false,
        act: this.actFindById,
      },{
        address: () => '/sendActivation',
        public: true,
        act: this.actSendActivation,
      },{
        address: () => '/verifyActivation',
        public: true,
        act: this.actVerifyActivation,
      },
    ]
  }

  handleFindById = async (request, reply) => {
    const actionParam = {id: request.params.id};
    const result = await this.server.getDataService().act(this.address()+'/findById', actionParam, request.user);
    reply.send(result);
  }

  actFindById = async (client: PoolClient, actionParam: any, driver: any) => {
    const { id } = actionParam;

    if(!(driver.id === id || hasRole(driver, 'admin'))){
      throw new Unauthorized(`only admin or the owner can execute this action!`);
    }

    let select = sql.select(...(fields.map(f => 'a.'+f)));
    select = select.from('pbl.driver a');
    select = select.where({id});

    const query = select.toParams();

    const result = await client.query(query);

    return result.rows.length === 0 ? null :  result.rows[0];
  }

  handleSendActivation = async (request, reply) => {
    const realIp = request.headers['x-real-ip'];
    if(realIp){
      checkForBanned(realIp);
      addFailureForBanned(realIp);// K1 : actually it does not fail but I want to limit the number of times an IP request it
    }else{
      debug(`I cannot check the remote ip for banned.
      If it is on production env, set the reverse proxy config to send the real remote ip address.`);
    }
    const mobile = mapToLatin(request.body.mobile);
    const actionParam = {
      mobile,
    };

    const result = await this.server.getDataService().act(this.address()+'/sendActivation', actionParam);
    if(result){
      const driver = result;
      driver.token = this.server.getHttpServer().sign({ id: driver.id, roles: driver.roles });
      reply.send(driver);
      return;
    }
  }

  actSendActivation = async (client: PoolClient, actionParam: any) => {

    if (!actionParam.mobile) {
      throwError('mobile', 'required', 'mobile is missing!', 'auth.mobile');
    }

    let select = sql.select('id, mobile');
    select = select.from('pbl.driver a');
    select = select.where({'a.mobile': actionParam.mobile});

    const query = select.toParams();

    const driverResult = await client.query(query);

    const driver = driverResult.rows.length === 0 ? null : camelCaseObject(driverResult.rows[0]);
    if(!driver) return;


    const code = '1234';

    const result = await client.query({
      text: `
        insert into pbl.driver_otp (
          driver_id, code, created_at, activation_failed_count, activated, used
        ) values ($1, $2, now(), 0, false, false)
        returning ${fields};
      `,
      values: [ driver.id, code ],
    });

    if(result.rowCount === 1){
      sendActivationSMS(driver.mobile, code);
      // TODO send SMS to the client, till then the code is 1234
    }
  }

  handleVerifyActivation = async (request, reply) => {
    const realIp = request.headers['x-real-ip'];
    if(realIp){
      checkForBanned(realIp);
    }else{
      debug(`I cannot check the remote ip for banned.
      If it is on production env, set the reverse proxy config to send the real remote ip address.`);
    }
    const mobile = mapToLatin(request.body.mobile);
    const code = mapToLatin(request.body.code);
    const actionParam = {
      mobile,
      code,
    };

    const result = await this.server.getDataService().act(this.address()+'/verifyActivation', actionParam);
    if(result){
      const driver = result;
      driver.token = this.server.getHttpServer().sign({ id: driver.id, roles: ['driver'] });
      reply.send(driver);
    }
    addFailureForBanned(realIp);
    await pause(500);//this pause is to make the hacker life harder for brute-force attack
    throwError('code', 'mismatch', 'code mismatch!', 'auth.code');
  }

  actVerifyActivation = async (client: PoolClient, actionParam: any) => {
    const { mobile, code } = actionParam;

    if (!mobile) {
      throwError('mobile', 'required', 'mobile is missing!', 'auth.mobile');
    }
    if (!code) {
      throwError('code', 'required', 'code is missing!', 'auth.code');
    }

    {
      const result = await client.query({
        text: `
          select do.id, do.code, do.activation_failed_count
          from driver d
          inner join driver_otp do
          where !used and do.mobile = $1;
        `,
        values: [ mobile ],
      });

      if(result.rows.length === 0){
        return false;
      }
      const otp = result.rows[0];
      if(otp.code === code){
        const result = await client.query({
          text: `
            update driver_otp set used = true, activated = true, used_at = now()
            where id = $1 and code = $2
            returning activated;
          `,
          values: [ otp.id, code ],
        });
    
        if(result.rows.length > 0){
          return result.rows[0].activated;
        }
      }else{
        const result = await client.query({
          text: `
            update driver_otp set activation_failed_count = activation_failed_count + 1, used = (activation_failed_count + 1) > 3, used_at = now()
            where id = $1
            returning activation_failed_count;
          `,
          values: [ otp.id ],
        });
    
        if(result.rows.length > 0){
          if(result.rows[0].activation_failed_count > 3){
            throwError('activationCode', 'expired', 'activationCode is expired!', 'auth.activationCode');
          }
        }
      }
    }

    return false;
  }

  handleWs(conn: websocketPlugin.SocketStream & { socket: {isAlive: boolean} },
    request: FastifyRequest,
    params?: { [key: string]: any }
  ){
    conn.socket.isAlive = true;

    conn.on('data', (chunk)=>{
      debug('data');
      const data = chunk.toString();
      debug(data);
      if(data==='ping'){
        heartbeat.call(conn);
      }
    });
    conn.on('close', ()=>{
      debug('closed');
    });
    conn.on('error', (err)=>{
      debug('error');
      debug(err);
    });
  }
}

export const models: Model[] = [ 
  new Driver(),
];

