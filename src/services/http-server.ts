import * as fastify from 'fastify';
import { Server, IncomingMessage, ServerResponse } from 'http';
import 'fastify-cors';
import 'fastify-jwt';
import 'fastify-file-upload';
import 'fastify-websocket';

import * as fastifyCors from 'fastify-cors';
import * as fastifyJwt from 'fastify-jwt';
import * as fastifyFileUpload from 'fastify-file-upload';
import * as fastifyWebSocket from 'fastify-websocket';
import { DataService } from './data-service';
import { InternalServerError } from 'http-errors';
import * as Debug from 'debug';
import { Model } from './interfaces';
import { SignOptions } from 'jsonwebtoken';
import websocketPlugin = require('fastify-websocket');

let debug = Debug('4kish-http-server');

export class HttpServer {

  private fastifyServer:fastify.FastifyInstance<Server, IncomingMessage, ServerResponse>;
  private pongInteval: NodeJS.Timeout;

  constructor(
    private dataService: DataService,
    private host: string,
    private port: number,
    private logger: boolean,
    private origin: boolean,
  ){
  }

  start(){
    this.fastifyServer = fastify({
      bodyLimit: 100 * 1024,
      logger: this.logger,
    });


    // TODO we might consider using fastify-graceful-shutdown

    this.fastifyServer.register(fastifyCors, { 
      origin: this.origin,
    });

    this.fastifyServer.register(fastifyJwt, {
      secret: process.env.JWT_SECRET_KEY,
    });

    this.fastifyServer.register(fastifyFileUpload, {
      limits: { fileSize: 2 * 1024 * 1024 },
      abortOnLimit: true,
    });

    this.fastifyServer.register(fastifyWebSocket, {
        handle: (conn)=>{
          debug('unhandled ws connection');
          conn.socket.send('not implemented');
        },
        options: {
          maxPayload: 10 * 1024,
        }
    });

    this.fastifyServer.decorate("authenticate", async function(request, reply) {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.send(err)
      }
    });

    this.fastifyServer.route({
      method: 'GET',
      url: '/data/:queryData',
      handler: async (req, reply)=>{
        const query = req.params.queryData;
        const queryParams = req.query;
        try {
          const result = await this.dataService.query(query, queryParams);
          reply.type('application/json').code(200);
          return result;
        } catch (error) {
          if(error.statusCode){
            reply.send(error);
          }else{
            console.error(`error while processing data with query : ${query}\n params: ${JSON.stringify(queryParams, null, 2)}\n${error}`);
            reply.send(new InternalServerError());
          }
        }
      },
    });

    this.fastifyServer.route({
      method: 'GET',
      url: '/private/data/:queryData',
      preValidation: [this.fastifyServer.authenticate],
      handler: async (req, reply)=>{
        const query = req.params.queryData;
        const queryParams = req.query;
        try {
          const result = await this.dataService.query(query, queryParams, req.user);
          reply.type('application/json').code(200);
          return result;
        } catch (error) {
          if(error.statusCode){
            reply.send(error);
          }else{
            console.error(`error while processing private/data with query : ${query}\n params: ${JSON.stringify(queryParams, null, 2)}\n${error}`);
            reply.send(new InternalServerError());
          }
        }
      },
    });

    this.fastifyServer.listen(this.port, this.host, (err, address)=>{
      if(err) throw err;
      debug(`listen on ${address}`);

      this.pongInteval = setInterval(() => {
        // debug('pongInterval');
        (this.fastifyServer as any).websocketServer.clients.forEach((ws) => {
          if (ws.isAlive === false) return ws.terminate();
       
          ws.isAlive = false;
        });
      }, 30000 + 1000);
  
    });
  }

  async stop() {
    debug('stopping http server');
    clearInterval(this.pongInteval);
    this.closeWebSockets();
    await this.fastifyServer.close();
  }

  private closeWebSockets(){
    (this.fastifyServer as any).websocketServer.clients.forEach((ws) => {
      return ws.terminate();
    });
  }

  sign(payload: fastify.JWTTypes.SignPayloadType, options?: SignOptions): string{
    return this.fastifyServer.jwt.sign(payload, options);
  }

  verify(token: string, options?: SignOptions): fastify.JWTTypes.VerifyPayloadType{
    return this.fastifyServer.jwt.verify(token, options);
  }

  registerModelRoutes(models: Model[]){//routes: fastify.RouteOptions<Server, IncomingMessage, ServerResponse, fastify.DefaultQuery, fastify.DefaultParams, fastify.DefaultHeaders, any>[]){
    models.map(m => {
      const address = m.address();
      const routes = m.routes();
      routes.forEach( route => {
        route.url = address + route.url;
        if(!route.public){
          route.preValidation = this.fastifyServer.authenticate;
        }
        this.fastifyServer.route(route);
      });
    });
  }
}

export function heartbeat() {
  debug('ping recieved');
  this.socket.isAlive = true;
  this.socket.send('pong');
}

export type WSSocket = websocketPlugin.SocketStream & { socket: {isAlive: boolean}, user: any };