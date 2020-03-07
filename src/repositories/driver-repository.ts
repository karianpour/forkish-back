import { Server } from "../server";
import { Model, RouteOptions, NotificationListener } from "../services/interfaces";
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
import { heartbeat, WSSocket } from "../services/http-server";
 
let debug = Debug('4kish-driver');

export const BookAccessRoles = ['owner', 'adviser', 'bookkeeper'];

const fields: string[] = snakeCasedFields([
  'id',
  'mobile',
  'firstname',
  'lastname',
  'firstnameEn',
  'lastnameEn',
  'photoUrl',
]);

const vehicleField: string[] = snakeCasedFields([
  'id',
  'vehicleType',
  'plateNo',
  'capacity',
]);

const rideProgressFields: string[] = snakeCasedFields([
  'id',
  'driverId',
  'driverArrivedAt',
  'driverArrivedPoint',
  'passengerOnboardAt',
  'passengerOnboardPoint',
  'passengerLeftAt',
  'passengerLeftPoint',
  'driverCanceledAt',
  'driverCanceledPoint',
  'passengerCanceledAt',
  'passengerCanceledPoint',
]);

class Driver implements Model {
  private server: Server;
  private drivers: Map<string, WSSocket> = new Map();

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
      wsHandler: this.handleWs.bind(this),
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
      },{
        address: () => '/initialState',
        public: false,
        act: this.actInitialState,
      },{
        address: () => '/ready',
        public: false,
        act: this.actReady,
      },{
        address: () => '/off',
        public: false,
        act: this.actOff,
      },{
        address: () => '/accept',
        public: false,
        act: this.actAccept,
      },{
        address: () => '/arrived',
        public: false,
        act: this.actArrived,
      },{
        address: () => '/boarded',
        public: false,
        act: this.actBoarded,
      },{
        address: () => '/left',
        public: false,
        act: this.actLeft,
      },{
        address: () => '/reject',
        public: false,
        act: this.actReject,
      },{
        address: () => '/cancel',
        public: false,
        act: this.actCancel,
      },{
        address: () => '/pointUpdate',
        public: false,
        act: this.actPointUpdate,
      },{
        address: () => '/statusChanged',
        public: true,
        act: this.actStatusChanged,
      },{
        address: () => '/offer',
        public: true,
        act: this.actOffer,
      },{
        address: () => '/offerDrawBack',
        public: true,
        act: this.actOfferDrawBack,
      },{
        address: () => '/passengerConfirmed',
        public: true,
        act: this.actPassengerConfirmed,
      },{
        address: () => '/passengerCanceled',
        public: true,
        act: this.actPassengerCanceled,
      },{
        address: () => '/tryOffer',
        public: true,
        act: this.actTryOffer,
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

    await this.server.getDataService().act(this.address()+'/sendActivation', actionParam);
    reply.send({ succeed: true });
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
    if(!driver) return true;


    const code = '1234';

    const result = await client.query({
      text: `
        insert into pbl.driver_otp (
          driver_id, code, created_at, activation_failed_count, activated, used
        ) values ($1, $2, now(), 0, false, false);
      `,
      values: [ driver.id, code ],
    });

    if(result.rowCount === 1){
      sendActivationSMS(driver.mobile, code);
    }

    return true;
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
      reply.send(result);
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
          select otp.id, otp.driver_id, otp.code, otp.activation_failed_count
          from pbl.driver d
          inner join pbl.driver_otp otp on d.id = otp.driver_id
          where not used and d.mobile = $1;
        `,
        values: [ mobile ],
      });

      if(result.rows.length === 0){
        return false;
      }
      const otp = camelCaseObject(result.rows[0]);
      if(otp.code === code){
        const result = await client.query({
          text: `
            update pbl.driver_otp set used = true, activated = true, used_at = now()
            where id = $1 and code = $2
            returning activated;
          `,
          values: [ otp.id, code ],
        });
      
        if(result.rows.length > 0){
          if (result.rows[0].activated){
            let driver: any;
            {
              let select = sql.select(...(fields.map(f => 'a.'+f)));
              select = select.from('pbl.driver a');
              select = select.where({id: otp.driverId});
          
              const query = select.toParams();
          
              const result = await client.query(query);
              driver = camelCaseObject(result.rows[0]);
            }
            {
              let select = sql.select(...vehicleField.map(f => 'v.'+f));
              select = select.from('pbl.driver_vehicle dv');
              select = select.join('pbl.vehicle v').on({'dv.vehicle_id': 'v.id'});
              select = select.where({'dv.invalid': false});
              select = select.where({'dv.driver_id': otp.driverId});
          
              const query = select.toParams();
          
              const result = await client.query(query);
              driver.vehicles = camelCaseObject(result.rows);
            }
            
            driver.token = this.server.getHttpServer().sign({ id: driver.id, roles: ['driver'] });
            {
              await client.query({
                text: `
                  insert into log.jwt (
                    entity_id, entity, jwt, created_at
                  ) values ($1, 'driver', $2, now());
                `,
                values: [ driver.id, driver.token ],
              });
            }
            return driver;
          }
        }
      }else{
        const result = await client.query({
          text: `
            update pbl.driver_otp set activation_failed_count = activation_failed_count + 1, used = (activation_failed_count + 1) > 3, used_at = now()
            where id = $1
            returning activation_failed_count;
          `,
          values: [ otp.id ],
        });
    
        // if(result.rows.length > 0){
        //   if(result.rows[0].activation_failed_count > 3){
        //     throwError('activationCode', 'expired', 'activationCode is expired!', 'auth.activationCode');
        //   }
        // }
      }
    }

    return false;
  }

  handleAuthenticate(token: any, conn: WSSocket) {
    const jwt = this.server.getHttpServer().verify(token) as any;
    //TODO we have to check it on database if the token is still available
    if(jwt.id && jwt.roles && jwt.roles.indexOf('driver')!==-1){
      conn.user = jwt;
      this.drivers.set(jwt.id, conn);
      conn.socket.send(JSON.stringify({
        method: 'authenticated',
        payload: {
          succeed: true,
        },
      }));
    }else{
      conn.socket.terminate();
    }
  }

  handleClose(conn: WSSocket) {
    if(conn.user?.id){
      this.drivers.delete(conn.user.id);
    }
  }

  async handleInitialState(payload: any, conn: WSSocket) {
    try{
      const result = await this.server.getDataService().act(this.address()+'/initialState', payload, conn.user);
      conn.socket.send(JSON.stringify({
        method: 'initialState',
        payload: result,
      }));
    }catch(err){
      debug(err);
      conn.socket.send(JSON.stringify({
        method: 'initialState',
        payload: {
          failed: true,
        },
      }));
    }
  }

  actInitialState = async (client: PoolClient, actionParam: any, driver: any) => {
    let status;
    {
      const result = await client.query({
        text: `
          select ds.status
          from ride.driver_status ds
          where ds.driver_id = $1;
        `,
        values: [ driver.id ],
      });
      if(result.rows.length > 0) {
        status = camelCaseObject(result.rows[0]);
      };
    }
    let offer;
    {
      const result = await client.query({
        text: `
          select o.id, pr.pickup::json, pr.destination::json, od.price, od.distance, od.time
          from ride.driver_offer o
          inner join ride.passenger_request pr on o.passenger_request_id = pr.id
          inner join unnest(pr.offers) od on pr.requested_vehicle_type = od.vehicle_type
          where o.driver_id = $1
            and o.driver_respond_at is null and o.expired_at is null and o.canceled_at is null;
        `,
        values: [ driver.id ],
      });
      if(result.rows.length > 0) {
        offer = camelCaseObject(result.rows[0]);
      };
    }
    let ride;
    {
      const result = await client.query({
        text: `
          select pr.id, pr.pickup::json, pr.destination::json, od.price, od.distance, od.time,
            json_build_object(
              'firstname', p.firstname,
              'lastname', p.lastname,
              'mobile', p.mobile
            ) as passenger,
            true as accepted,
            rp.driver_arrived_at is not null as arrived,
            rp.passenger_got_it_at is not null as confirmed,
            rp.passenger_onboard_at is not null as pickedup,
            rp.passenger_left_at is not null as accomplished
          from ride.passenger_request pr
          inner join ride.ride_progress rp on pr.id = rp.id
          inner join unnest(pr.offers) od on pr.requested_vehicle_type = od.vehicle_type
          inner join pbl.passenger p on pr.passenger_id = p.id
          where rp.driver_id = $1
            and rp.passenger_left_at is null
            and rp.driver_canceled_at is null
            and rp.passenger_canceled_at is null
            ;
        `,
        values: [ driver.id ],
      });
      if(result.rows.length > 0) {
        ride = camelCaseObject(result.rows[0]);
      };
    }
    return {
      status,
      offer,
      ride,
    };
  }

  async handleReady(payload: any, conn: WSSocket) {
    try{
      const result = await this.server.getDataService().act(this.address()+'/ready', payload, conn.user);
      this.server.getDataService().act(this.address()+'/tryOffer', { forAll: true });
      conn.socket.send(JSON.stringify({
        method: 'readyResult',
        payload: result,
      }));
    }catch(err){
      debug(err);
      conn.socket.send(JSON.stringify({
        method: 'readyResult',
        payload: {
          failed: true,
        },
      }));
    }
  }

  actReady = async (client: PoolClient, actionParam: any, driver: any) => {
    const { vehicleId, lat, lng, heading, speed } = actionParam;

    if (!vehicleId) {
      throwError('vehicleId', 'required', 'vehicleId is missing!', 'pbl.vehicleId');
    }
    if (!lat) {
      throwError('lat', 'required', 'lat is missing!', 'pbl.lat');
    }
    if (!lng) {
      throwError('lng', 'required', 'lng is missing!', 'pbl.lng');
    }
    if (!heading) {
      throwError('heading', 'required', 'heading is missing!', 'pbl.heading');
    }
    if (!speed) {
      throwError('speed', 'required', 'speed is missing!', 'pbl.speed');
    }

    {
      // const result = await client.query({
      //   text: `
      //     select do.id, do.code, do.activation_failed_count
      //     from driver d
      //     inner join driver_otp do
      //     where !used and do.mobile = $1;
      //   `,
      //   values: [ mobile ],
      // });

      // if(result.rows.length === 0){
      //   return false;
      // }
      await client.query({
        text: `
          insert into log.driver_signal (driver_id, occured_at, payload)
            values ($1, now(), $2);
        `,
        values: [ driver.id, 
          {
            vehicleId,
            point:{ lat, lng },
            heading,
            speed,
            status: 'ready',
          },
        ],
      });
      await client.query({
        text: `
          insert into ride.driver_status (driver_id, vehicle_id, point, heading, speed,
            status, ride_progress_id)
            values ($1, $2, pbl.to_point($3, $4), $5, $6, $7, null)
            on conflict (driver_id) do update set
            point = excluded.point, status = excluded.status, ride_progress_id = null;
        `,
        values: [ driver.id, vehicleId, lat, lng, heading, speed, 'ready' ],
      });
  
    }
    return true;
  }

  async handleOff(payload: any, conn: WSSocket) {
    try{
      const result = await this.server.getDataService().act(this.address()+'/off', payload, conn.user);
      conn.socket.send(JSON.stringify({
        method: 'offResult',
        payload: result,
      }));
    }catch(err){
      debug(err);
      conn.socket.send(JSON.stringify({
        method: 'offResult',
        payload: {
          failed: true,
        },
      }));
    }
  }

  actOff = async (client: PoolClient, actionParam: any, driver: any) => {
    const { lat, lng, heading, speed } = actionParam;

    if (!lat) {
      throwError('lat', 'required', 'lat is missing!', 'pbl.lat');
    }
    if (!lng) {
      throwError('lng', 'required', 'lng is missing!', 'pbl.lng');
    }
    if (!heading) {
      throwError('heading', 'required', 'heading is missing!', 'pbl.heading');
    }
    if (!speed) {
      throwError('speed', 'required', 'speed is missing!', 'pbl.speed');
    }


    {
      const result = await client.query({
        text: `
          select o.id
          from ride.driver_offer o
          inner join ride.passenger_request pr on o.passenger_request_id = pr.id
          inner join unnest(pr.offers) od on pr.requested_vehicle_type = od.vehicle_type
          where o.driver_id = $1
            and o.driver_respond_at is null and o.expired_at is null and o.canceled_at is null;
        `,
        values: [ driver.id ],
      });
      if(result.rows.length > 0) {
        return false;
      }
    }
    {
      const result = await client.query({
        text: `
          select pr.id
          from ride.passenger_request pr
          inner join ride.ride_progress rp on pr.id = rp.id
          where rp.driver_id = $1
            and rp.passenger_left_at is null
            and rp.driver_canceled_at is null
            and rp.passenger_canceled_at is null
            ;
        `,
        values: [ driver.id ],
      });
      if(result.rows.length > 0) {
        return false;
      }
    }

    {
      await client.query({
        text: `
          insert into log.driver_signal (driver_id, occured_at, payload)
            values ($1, now(), $2);
        `,
        values: [ driver.id, 
          {
            point:{ lat, lng },
            heading,
            speed,
            status: 'off',
          },
        ],
      });
      await client.query({
        text: `
          update ride.driver_status set 
            (point, heading, speed, status, ride_progress_id)
            = (pbl.to_point($2, $3), $4, $5, $6, null)
            where driver_id = $1;
        `,
        values: [ driver.id, lat, lng, heading, speed, 'off' ],
      });
    }
    return true;
  }

  async handleAccept(payload: any, conn: WSSocket) {
    try{
      const result = await this.server.getDataService().act(this.address()+'/accept', payload, conn.user);
      conn.socket.send(JSON.stringify({
        method: 'acceptResult',
        payload: !result ? {
          failed: true,
        } : result,
      }));
    }catch(err){
      debug(err);
      conn.socket.send(JSON.stringify({
        method: 'acceptResult',
        payload: {
          failed: true,
        },
      }));
    }
  }

  actAccept = async (client: PoolClient, actionParam: any, driver: any) => {
    const { driverOfferId, lat, lng, heading, speed } = actionParam;

    if (!driver?.id) {
      throwError('driverId', 'required', 'driverId is missing!', 'pbl.driverId');
    }
    if (!driverOfferId) {
      throwError('driverOfferId', 'required', 'driverOfferId is missing!', 'pbl.driverOfferId');
    }
    if (!lat) {
      throwError('lat', 'required', 'lat is missing!', 'pbl.lat');
    }
    if (!lng) {
      throwError('lng', 'required', 'lng is missing!', 'pbl.lng');
    }
    if (!heading) {
      throwError('heading', 'required', 'heading is missing!', 'pbl.heading');
    }
    if (!speed) {
      throwError('speed', 'required', 'speed is missing!', 'pbl.speed');
    }

    let id;
    {
      let driverOffer;
      {
        const lockResult = await client.query({
          text: `
            select id
            from ride.driver_offer
            where passenger_request_id = (
              select passenger_request_id
              from ride.driver_offer
              where id = $1
            )
            for update;
          `,
          values: [ driverOfferId ],
        });
        if(lockResult.rowCount===0){
          return false;
        }

        const result = await client.query({
          text: `
            select driver_id, vehicle_id, passenger_request_id, driver_respond_at, canceled_at, expired_at
            from ride.driver_offer
            where id = $1;
          `,
          values: [ driverOfferId ],
        });
  
        if(result.rows.length === 0){
          return false;
        }
        driverOffer = camelCaseObject(result.rows[0]);
        if(
          driverOffer.driverRespondAt != null
          || driverOffer.expiredAt != null
          || driverOffer.canceledAt != null
          || driverOffer.driverId != driver.id
        ){
          return false;
        }
      }
      id = driverOffer.passengerRequestId;

      await client.query({
        text: `
          update ride.driver_offer set (driver_point, driver_response, driver_respond_at)
            = (pbl.to_point($3, $4), $5, now())
          where driver_id = $1 and id = $2;
        `,
        values: [ driver.id, driverOfferId, lat, lng, 'accepted' ],
      });
      await client.query({
        text: `
          update ride.driver_offer set expired_at = now()
          where passenger_request_id = $1 and id != $2
            and expired_at is null and driver_response is null;
        `,
        values: [ driverOffer.passengerRequestId, driverOfferId ],
      });
      await client.query({
        text: `
          update ride.driver_status set 
            (point, heading, speed, status, ride_progress_id)
            = (pbl.to_point($2, $3), $4, $5, $6, $7)
            where driver_id = $1;
        `,
        values: [ driver.id, lat, lng, heading, speed, 'occupied', driverOffer.passengerRequestId ],
      });
      await client.query({
        text: `
          insert into ride.ride_progress (id, driver_id, vehicle_id)
            values ($1, $2, $3);
        `,
        values: [ driverOffer.passengerRequestId, driver.id, driverOffer.vehicleId ],
      });
  
    }
    
    const result = await client.query({
      text: `
        select pr.id as ride_id, pr.pickup::json, pr.destination::json, od.price, od.distance, od.time,
          json_build_object('firstname', p.firstname, 'lastname', p.lastname, 'mobile', p.mobile) as passenger
        from ride.passenger_request pr
        inner join ride.ride_progress rp on pr.id = rp.id
        inner join unnest(pr.offers) od on pr.requested_vehicle_type = od.vehicle_type
        inner join pbl.passenger p on pr.passenger_id = p.id
        where pr.id = $1;
      `,
      values: [ id ],
    });

    if(result.rows.length === 0){
      return false;
    }
    return camelCaseObject(result.rows[0]);
  }

  async handleReject(payload: any, conn: WSSocket) {
    try{
      const result = await this.server.getDataService().act(this.address()+'/reject', payload, conn.user);
      conn.socket.send(JSON.stringify({
        method: 'rejectResult',
        payload: result,
      }));
    }catch(err){
      debug(err);
      conn.socket.send(JSON.stringify({
        method: 'rejectResult',
        payload: {
          failed: true,
        },
      }));
    }
  }

  actReject = async (client: PoolClient, actionParam: any, driver: any) => {
    const { driverOfferId, lat, lng, rejectReason } = actionParam;

    if (!driver?.id) {
      throwError('driverId', 'required', 'driverId is missing!', 'pbl.driverId');
    }
    if (!driverOfferId) {
      throwError('driverOfferId', 'required', 'driverOfferId is missing!', 'pbl.driverOfferId');
    }
    if (!lat) {
      throwError('lat', 'required', 'lat is missing!', 'pbl.lat');
    }
    if (!lng) {
      throwError('lng', 'required', 'lng is missing!', 'pbl.lng');
    }
    if (!rejectReason) {
      throwError('rejectReason', 'required', 'rejectReason is missing!', 'pbl.rejectReason');
    }
    if (rejectReason && RejectReasonEnum.indexOf(rejectReason)===-1 ) {
      throwError('rejectReason', 'unacceptable', `rejectReason '${rejectReason}' is not acceptable!`, 'pbl.rejectReason');
    }

    {
      let driverOffer;
      {
        const result = await client.query({
          text: `
            select driver_id, passenger_request_id, driver_response, expired_at
            from ride.driver_offer
            where id = $1
            for update;
          `,
          values: [ driverOfferId ],
        });
  
        if(result.rows.length === 0){
          return false;
        }
        driverOffer = camelCaseObject(result.rows[0]);
        if(
          driverOffer.driverResponse != null
          || driverOffer.expiredAt != null
          || driverOffer.driverId != driver.id
        ){
          return false;
        }
      }

      const result = await client.query({
        text: `
          update ride.driver_offer set (driver_point, driver_response, driver_respond_at)
            = (pbl.to_point($3, $4), $5, now())
          where driver_id = $1 and id = $2
          ;
        `,
        values: [ driver.id, driverOfferId, lat, lng, `rejected_${rejectReason}` ],
      });
      if(result.rowCount===0){
        return false;
      }
  
    }
    return true;
  }

  async handleCancel(payload: any, conn: WSSocket) {
    try{
      const result = await this.server.getDataService().act(this.address()+'/cancel', payload, conn.user);
      conn.socket.send(JSON.stringify({
        method: 'cancelResult',
        payload: result,
      }));
    }catch(err){
      debug(err);
      conn.socket.send(JSON.stringify({
        method: 'cancelResult',
        payload: {
          failed: true,
        },
      }));
    }
  }

  actCancel = async (client: PoolClient, actionParam: any, driver: any) => {
    const { rideProgressId, lat, lng, heading, speed } = actionParam;

    if (!driver?.id) {
      throwError('driverId', 'required', 'driverId is missing!', 'pbl.driverId');
    }
    if (!rideProgressId) {
      throwError('rideProgressId', 'required', 'rideProgressId is missing!', 'pbl.rideProgressId');
    }
    if (!lat) {
      throwError('lat', 'required', 'lat is missing!', 'pbl.lat');
    }
    if (!lng) {
      throwError('lng', 'required', 'lng is missing!', 'pbl.lng');
    }
    if (!heading) {
      throwError('heading', 'required', 'heading is missing!', 'pbl.heading');
    }
    if (!speed) {
      throwError('speed', 'required', 'speed is missing!', 'pbl.speed');
    }

    {
      let rideProgress;
      {
        const result = await client.query({
          text: `
            select ${rideProgressFields.join(', ')}
            from ride.ride_progress
            where id = $1
            for update;
          `,
          values: [ rideProgressId ],
        });
  
        if(result.rows.length === 0){
          return false;
        }
        rideProgress = camelCaseObject(result.rows[0]);
        if(
          rideProgress.driverId != driver.id
          || rideProgress.passengerLeftAt !== null
          || rideProgress.driverCanceledAt !== null
          || rideProgress.passengerCanceledAt !== null
        ){
          return false;
        }
      }

      const result = await client.query({
        text: `
          update ride.ride_progress set (driver_canceled_at, driver_canceled_point)
            = (now(), pbl.to_point($2, $3))
          where id = $1
          ;
        `,
        values: [ rideProgress.id, lat, lng ],
      });

      if(result.rowCount===0){
        return false;
      }

      await client.query({
        text: `
          update ride.driver_status set 
            (point, heading, speed, status, ride_progress_id)
            = (pbl.to_point($2, $3), $4, $5, $6, null)
            where driver_id = $1;
        `,
        values: [ driver.id, lat, lng, heading, speed, 'ready' ],
      });
      
    }
    return true;
  }

  async handlePointUpdate(payload: any, conn: WSSocket) {
    try{
      await this.server.getDataService().act(this.address()+'/pointUpdate', payload, conn.user);
    }catch(err){
      debug(err);
    }
  }

  actPointUpdate = async (client: PoolClient, actionParam: any, driver: any) => {
    const { lat, lng, heading, speed } = actionParam;

    if (!driver?.id) {
      throwError('driverId', 'required', 'driverId is missing!', 'pbl.driverId');
    }
    if (!lat) {
      throwError('lat', 'required', 'lat is missing!', 'pbl.lat');
    }
    if (!lng) {
      throwError('lng', 'required', 'lng is missing!', 'pbl.lng');
    }
    if (!heading) {
      throwError('heading', 'required', 'heading is missing!', 'pbl.heading');
    }
    if (!speed) {
      throwError('speed', 'required', 'speed is missing!', 'pbl.speed');
    }

    await client.query({
      text: `
        insert into log.driver_signal (driver_id, occured_at, payload)
          values ($1, now(), $2);
      `,
      values: [ driver.id, 
        {
          point:{ lat, lng },
          heading,
          speed,
          status: 'ready',
        }
      ],
    });

    await client.query({
      text: `
        update ride.driver_status set (point, heading, speed) = (pbl.to_point($2, $3), $4, $5)
        where driver_id = $1
        ;
      `,
      values: [ driver.id, lat, lng, heading, speed ],
    });

    return true;
  }

  async handleArrived(payload: any, conn: WSSocket) {
    try{
      const result = await this.server.getDataService().act(this.address()+'/arrived', payload, conn.user);
      conn.socket.send(JSON.stringify({
        method: 'arrivedResult',
        payload: result,
      }));
    }catch(err){
      debug(err);
      conn.socket.send(JSON.stringify({
        method: 'arrivedResult',
        payload: {
          failed: true,
        },
      }));
    }
  }

  actArrived = async (client: PoolClient, actionParam: any, driver: any) => {
    const { rideProgressId, lat, lng } = actionParam;

    if (!driver?.id) {
      throwError('driverId', 'required', 'driverId is missing!', 'pbl.driverId');
    }
    if (!rideProgressId) {
      throwError('rideProgressId', 'required', 'rideProgressId is missing!', 'pbl.rideProgressId');
    }
    if (!lat) {
      throwError('lat', 'required', 'lat is missing!', 'pbl.lat');
    }
    if (!lng) {
      throwError('lng', 'required', 'lng is missing!', 'pbl.lng');
    }

    {
      let rideProgress;
      {
        const result = await client.query({
          text: `
            select ${rideProgressFields.join(', ')}
            from ride.ride_progress
            where id = $1
            for update;
          `,
          values: [ rideProgressId ],
        });
  
        if(result.rows.length === 0){
          return false;
        }
        rideProgress = camelCaseObject(result.rows[0]);
        if(
          rideProgress.driverId != driver.id
          || rideProgress.driverArrivedAt !== null
          || rideProgress.passengerLeftAt !== null
          || rideProgress.driverCanceledAt !== null
          || rideProgress.passengerCanceledAt !== null
        ){
          return false;
        }
      }

      const result = await client.query({
        text: `
          update ride.ride_progress set (driver_arrived_at, driver_arrived_point)
            = (now(), pbl.to_point($2, $3))
          where id = $1
          ;
        `,
        values: [ rideProgress.id, lat, lng ],
      });

      if(result.rowCount===0){
        return false;
      }
  
    }
    return true;
  }


  async handleBoarded(payload: any, conn: WSSocket) {
    try{
      const result = await this.server.getDataService().act(this.address()+'/boarded', payload, conn.user);
      conn.socket.send(JSON.stringify({
        method: 'boardedResult',
        payload: result,
      }));
    }catch(err){
      debug(err);
      conn.socket.send(JSON.stringify({
        method: 'boardedResult',
        payload: {
          failed: true,
        },
      }));
    }
  }

  actBoarded = async (client: PoolClient, actionParam: any, driver: any) => {
    const { rideProgressId, lat, lng } = actionParam;

    if (!driver?.id) {
      throwError('driverId', 'required', 'driverId is missing!', 'pbl.driverId');
    }
    if (!rideProgressId) {
      throwError('rideProgressId', 'required', 'rideProgressId is missing!', 'pbl.rideProgressId');
    }
    if (!lat) {
      throwError('lat', 'required', 'lat is missing!', 'pbl.lat');
    }
    if (!lng) {
      throwError('lng', 'required', 'lng is missing!', 'pbl.lng');
    }

    {
      let rideProgress;
      {
        const result = await client.query({
          text: `
            select ${rideProgressFields.join(', ')}
            from ride.ride_progress
            where id = $1
            for update;
          `,
          values: [ rideProgressId ],
        });
  
        if(result.rows.length === 0){
          return false;
        }
        rideProgress = camelCaseObject(result.rows[0]);
        if(
          rideProgress.driverId != driver.id
          || rideProgress.driverArrivedAt === null
          || rideProgress.passengerOnboardAt !== null
          || rideProgress.passengerLeftAt !== null
          || rideProgress.driverCanceledAt !== null
          || rideProgress.passengerCanceledAt !== null
        ){
          return false;
        }
      }

      const result = await client.query({
        text: `
          update ride.ride_progress set (passenger_onboard_at, passenger_onboard_point)
            = (now(), pbl.to_point($2, $3))
          where id = $1
          ;
        `,
        values: [ rideProgress.id, lat, lng ],
      });

      if(result.rowCount===0){
        return false;
      }
  
    }
    return true;
  }


  async handleLeft(payload: any, conn: WSSocket) {
    try{
      const result = await this.server.getDataService().act(this.address()+'/left', payload, conn.user);
      conn.socket.send(JSON.stringify({
        method: 'leftResult',
        payload: result,
      }));
    }catch(err){
      debug(err);
      conn.socket.send(JSON.stringify({
        method: 'leftResult',
        payload: {
          failed: true,
        },
      }));
    }
  }

  actLeft = async (client: PoolClient, actionParam: any, driver: any) => {
    const { rideProgressId, lat, lng, heading, speed } = actionParam;

    if (!driver?.id) {
      throwError('driverId', 'required', 'driverId is missing!', 'pbl.driverId');
    }
    if (!rideProgressId) {
      throwError('rideProgressId', 'required', 'rideProgressId is missing!', 'pbl.rideProgressId');
    }
    if (!lat) {
      throwError('lat', 'required', 'lat is missing!', 'pbl.lat');
    }
    if (!lng) {
      throwError('lng', 'required', 'lng is missing!', 'pbl.lng');
    }
    if (!heading) {
      throwError('heading', 'required', 'heading is missing!', 'pbl.heading');
    }
    if (!speed) {
      throwError('speed', 'required', 'speed is missing!', 'pbl.speed');
    }

    {
      let rideProgress;
      {
        const result = await client.query({
          text: `
            select ${rideProgressFields.join(', ')}
            from ride.ride_progress
            where id = $1
            for update;
          `,
          values: [ rideProgressId ],
        });
  
        if(result.rows.length === 0){
          return false;
        }
        rideProgress = camelCaseObject(result.rows[0]);
        if(
          rideProgress.driverId != driver.id
          || rideProgress.driverArrivedAt === null
          || rideProgress.passengerOnboardAt === null
          || rideProgress.passengerLeftAt !== null
          || rideProgress.driverCanceledAt !== null
          || rideProgress.passengerCanceledAt !== null
        ){
          return false;
        }
      }

      const result = await client.query({
        text: `
          update ride.ride_progress set (passenger_left_at, passenger_left_point)
            = (now(), pbl.to_point($2, $3))
          where id = $1
          ;
        `,
        values: [ rideProgress.id, lat, lng ],
      });

      if(result.rowCount===0){
        return false;
      }
  
      await client.query({
        text: `
          update ride.driver_status set
            (point, heading, speed, status, ride_progress_id)
            = (pbl.to_point($2, $3), $4, $5, $6, null)
            where driver_id = $1;
        `,
        values: [ driver.id, lat, lng, heading, speed, 'ready' ],
      });

    }
    return true;
  }

  actStatusChanged = async (client: PoolClient, actionParam: any) => {
    const { driverId, status } = actionParam;


    const conn = this.drivers.get(driverId);
    if(!conn) return;

    conn.socket.send(JSON.stringify({
      method: 'statusChanged',
      payload: {
        status,
      },
    }));
  }

  actOffer = async (client: PoolClient, actionParam: any) => {
    const { driverId, driverOfferId } = actionParam;

    const result = await client.query({
      text: `
        select o.id, pr.pickup::json, pr.destination::json, od.price, od.distance, od.time
        from ride.driver_offer o
        inner join ride.passenger_request pr on o.passenger_request_id = pr.id
        inner join unnest(pr.offers) od on pr.requested_vehicle_type = od.vehicle_type
        where o.id = $1;
      `,
      values: [ driverOfferId ],
    });

    if(result.rows.length === 0){
      return;
    }
    const offer = camelCaseObject(result.rows[0]);

    const conn = this.drivers.get(driverId);
    if(!conn) return;

    conn.socket.send(JSON.stringify({
      method: 'offer',
      payload: {
        offer,
      },
    }));
  }

  actOfferDrawBack = async (client: PoolClient, actionParam: any) => {
    const { driverId, driverOfferId } = actionParam;


    const conn = this.drivers.get(driverId);
    if(!conn) return;

    conn.socket.send(JSON.stringify({
      method: 'offerDrawBack',
      payload: {
        driverOfferId,
      },
    }));
  }

  actPassengerConfirmed = async (client: PoolClient, actionParam: any) => {
    const { driverId, rideProgressId } = actionParam;

    const conn = this.drivers.get(driverId);
    if(!conn) return;

    conn.socket.send(JSON.stringify({
      method: 'passengerConfirmed',
      payload: {
        rideProgressId,
      },
    }));
  }

  actPassengerCanceled = async (client: PoolClient, actionParam: any) => {
    const { driverId, passengerId, rideProgressId } = actionParam;


    const conn = this.drivers.get(driverId);
    if(!conn) return;

    conn.socket.send(JSON.stringify({
      method: 'passengerCanceled',
      payload: {
        rideProgressId,
      },
    }));
  }

  actTryOffer = async (client: PoolClient, actionParam: any) => {
    const { passengerRequestId, forAll } = actionParam;


    if(passengerRequestId){
      //TODO the driver should be filtered to be close, only limmited amount
      await client.query({
        text: `
          insert into ride.driver_offer
            (id, driver_id, vehicle_id, passenger_request_id, vehicle_type, offered_at, driver_point)
          select public.gen_random_uuid(), ds.driver_id, ds.vehicle_id, pr.id, pr.requested_vehicle_type, now(), ds.point
          from ride.passenger_request pr
          inner join ride.driver_status ds on ds.status = 'ready' --TODO filter driver
          where pr.id = $1;
        `,
        values: [ passengerRequestId ],
      });
    }else if(forAll){
      //TODO the driver should be filtered to be close, only limmited amount
      //TODO the driver which already rejected a ride should not be notified again
      await client.query({
        text: `
          insert into ride.driver_offer
            (id, driver_id, vehicle_id, passenger_request_id, vehicle_type, offered_at, driver_point)
          select public.gen_random_uuid(), ds.driver_id, ds.vehicle_id, pr.id, pr.requested_vehicle_type, now(), ds.point
          from ride.passenger_request pr
          inner join ride.driver_status ds on ds.status = 'ready' --TODO filter driver
          where
            pr.requested_at is not null and pr.abondoned_at is null and pr.expired_at is null
            and pr.id not in (
              select id from ride.ride_progress
            )
            and pr.id not in (
              select passenger_request_id
              from ride.driver_offer
              where driver_response is null and canceled_at is null and expired_at is null
            )
          ;
        `,
        values: [  ],
      });
    }
  }

  handleWs(conn: WSSocket,
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
        return;
      }
      try{
        const json = JSON.parse(data);
        const {method, payload} = json;
        if(!method){
          debug('error on json, no method defined.', data);
          return;
        }
        if(method==='authenticate'){
          this.handleAuthenticate(payload, conn);
        }else{
          if(!conn.user){
            conn.socket.send('authentication required!');
          }else if(method==='initialState'){
            this.handleInitialState(payload, conn);
          }else if(method==='ready'){
            this.handleReady(payload, conn);
          }else if(method==='off'){
            this.handleOff(payload, conn);
          }else if(method==='accept'){
            this.handleAccept(payload, conn);
          }else if(method==='arrived'){
            this.handleArrived(payload, conn);
          }else if(method==='boarded'){
            this.handleBoarded(payload, conn);
          }else if(method==='left'){
            this.handleLeft(payload, conn);
          }else if(method==='reject'){
            this.handleReject(payload, conn);
          }else if(method==='cancel'){
            this.handleCancel(payload, conn);
          }else if(method==='pointUpdate'){
            this.handlePointUpdate(payload, conn);
          }
        }
        
      }catch(err){
        debug('error parsing json', data, err);
        return;
      }
    });
    conn.on('close', ()=>{
      debug('closed');
      this.handleClose(conn);
    });
    conn.on('end', ()=>{
      debug('end');
      this.handleClose(conn);
    });
    conn.on('error', (err)=>{
      debug('error');
      debug(err);
    });
  }

}
class DriverStatusListener implements NotificationListener{
  private server: Server;

  setServer(s: Server) { this.server = s; }
  channel = 'driver_status';

  callback(payloadStr?: string){
    const payload = JSON.parse(payloadStr);
    const {driverId, status} = payload;
    if(!driverId || !status) return;
    const actionParam = {
      driverId,
      status,
    }
    this.server.getDataService().act('/driver/statusChanged', actionParam);
  }
}
class DriverOfferListener implements NotificationListener{
  private server: Server;

  setServer(s: Server) { this.server = s; }
  channel = 'driver_offer';

  callback(payloadStr?: string){
    const payload = JSON.parse(payloadStr);
    const {driverId, driverOfferId} = payload;
    if(!driverId || !driverOfferId) return;
    const actionParam = {
      driverId,
      driverOfferId,
    }
    this.server.getDataService().act('/driver/offer', actionParam);
  }
}

class DriverOfferDrawBackListener implements NotificationListener{
  private server: Server;

  setServer(s: Server) { this.server = s; }
  channel = 'driver_offer_drawback';

  callback(payloadStr?: string){
    const payload = JSON.parse(payloadStr);
    const {driverId, driverOfferId} = payload;
    if(!driverId || !driverOfferId) return;
    const actionParam = {
      driverId,
      driverOfferId,
    }
    this.server.getDataService().act('/driver/offerDrawBack', actionParam);
  }
}

class PassengerConfirmedListener implements NotificationListener{
  private server: Server;

  setServer(s: Server) { this.server = s; }
  channel = 'ride_progress_confirmed';

  callback(payloadStr?: string){
    const payload = JSON.parse(payloadStr);
    const {driverId, passengerId, rideProgressId} = payload;
    if(!driverId || !passengerId || !rideProgressId) return;
    const actionParam = {
      driverId,
      passengerId,
      rideProgressId,
    }
    this.server.getDataService().act('/driver/passengerConfirmed', actionParam);
  }
}

class PassengerCancelledListener implements NotificationListener{
  private server: Server;

  setServer(s: Server) { this.server = s; }
  channel = 'ride_progress_canceled';

  callback(payloadStr?: string){
    const payload = JSON.parse(payloadStr);
    const {driverId, passengerId, rideProgressId} = payload;
    if(!driverId || !rideProgressId) return;
    const actionParam = {
      driverId,
      passengerId,
      rideProgressId,
    }
    this.server.getDataService().act('/driver/passengerCanceled', actionParam);
  }


}

export const models: Model[] = [ 
  new Driver(),
];

export const notifications: NotificationListener[] = [
  new DriverStatusListener(),
  new DriverOfferListener(),
  new DriverOfferDrawBackListener(),
  new PassengerConfirmedListener(),
  new PassengerCancelledListener(),
];

const RejectReasonEnum = [
  'cheap',
  'far',
  'misc',
];
