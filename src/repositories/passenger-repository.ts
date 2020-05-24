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
 
let debug = Debug('4kish-passenger');

export const BookAccessRoles = ['owner', 'adviser', 'bookkeeper'];

const fields: string[] = snakeCasedFields([
  'id',
  'mobile',
  'firstname',
  'lastname',
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

class Passenger implements Model {
  private server: Server;
  private passengers: Map<string, WSSocket> = new Map();

  setServer(s: Server) { this.server = s; }

  address() { return '/passenger'; }

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
        address: () => '/query',
        public: false,
        act: this.actQuery,
      },{
        address: () => '/request',
        public: false,
        act: this.actRequest,
      },{
        address: () => '/confirm',
        public: false,
        act: this.actConfirm,
      },{
        address: () => '/cancel',
        public: false,
        act: this.actCancel,
      },{
        address: () => '/rideFound',
        public: true,
        act: this.actRideFound,
      },{
        address: () => '/arrived',
        public: true,
        act: this.actArrived,
      },{
        address: () => '/boarded',
        public: true,
        act: this.actBoarded,
      },{
        address: () => '/left',
        public: true,
        act: this.actLeft,
      },{
        address: () => '/driverCanceled',
        public: true,
        act: this.actDriverCanceled,
      },{
        address: () => '/driverMoved',
        public: true,
        act: this.actDriverMoved,
      },
    ]
  }

  handleFindById = async (request, reply) => {
    const actionParam = {id: request.params.id};
    const result = await this.server.getDataService().act(this.address()+'/findById', actionParam, request.user);
    reply.send(result);
  }

  actFindById = async (client: PoolClient, actionParam: any, passenger: any) => {
    const { id } = actionParam;

    if(!(passenger.id === id || hasRole(passenger, 'admin'))){
      throw new Unauthorized(`only admin or the owner can execute this action!`);
    }

    let select = sql.select(...(fields.map(f => 'a.'+f)));
    select = select.from('pbl.passenger a');
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
    select = select.from('pbl.passenger a');
    select = select.where({'a.mobile': actionParam.mobile});

    const query = select.toParams();

    const passengerResult = await client.query(query);

    const passenger = passengerResult.rows.length === 0 ? null : camelCaseObject(passengerResult.rows[0]);
    if(!passenger) return true;


    const code = '1234';

    const result = await client.query({
      text: `
        insert into pbl.passenger_otp (
          passenger_id, code, created_at, activation_failed_count, activated, used
        ) values ($1, $2, now(), 0, false, false);
      `,
      values: [ passenger.id, code ],
    });

    if(result.rowCount === 1){
      sendActivationSMS(passenger.mobile, code);
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
          select otp.id, otp.passenger_id, otp.code, otp.activation_failed_count
          from pbl.passenger d
          inner join pbl.passenger_otp otp on d.id = otp.passenger_id
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
            update pbl.passenger_otp set used = true, activated = true, used_at = now()
            where id = $1 and code = $2
            returning activated;
          `,
          values: [ otp.id, code ],
        });
      
        if(result.rows.length > 0){
          if (result.rows[0].activated){
            let passenger: any;
            {
              let select = sql.select(...(fields.map(f => 'a.'+f)));
              select = select.from('pbl.passenger a');
              select = select.where({id: otp.passengerId});
          
              const query = select.toParams();
          
              const result = await client.query(query);
              passenger = camelCaseObject(result.rows[0]);
            }
            
            passenger.token = this.server.getHttpServer().sign({ id: passenger.id, roles: ['passenger'] });
            {
              await client.query({
                text: `
                  insert into log.jwt (
                    entity_id, entity, jwt, created_at
                  ) values ($1, 'passenger', $2, now());
                `,
                values: [ passenger.id, passenger.token ],
              });
            }
            return passenger;
          }
        }
      }else{
        const result = await client.query({
          text: `
            update pbl.passenger_otp set activation_failed_count = activation_failed_count + 1, used = (activation_failed_count + 1) > 3, used_at = now()
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
    if(jwt.id && jwt.roles && jwt.roles.indexOf('passenger')!==-1){
      conn.user = jwt;
      this.passengers.set(jwt.id, conn);
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
      this.passengers.delete(conn.user.id);
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

  actInitialState = async (client: PoolClient, actionParam: any, passenger: any) => {
    let passengerRequest;
    {
      const result = await client.query({
        text: `
          select pr.id, rp.id is null as requesting_ride, pr.pickup::json, pr.destination::json, pr.offers::json
          from ride.passenger_request pr
          left join ride.ride_progress rp on pr.id = rp.id
          where pr.passenger_id = $1
            and (pr.requested_at is null or rp.id is null)
            and pr.abondoned_at is null
            and pr.expired_at is null
          ;
      `,
        values: [ passenger.id ],
      });
      if(result.rows.length > 0) {
        passengerRequest = camelCaseObject(result.rows[0]);
      };
    }
    let rideProgress;
    {
      const result = await client.query({
        text: `
          select rp.id,
            json_build_object(
              'driver',
              json_build_object(
                'firstname', d.firstname,
                'lastname', d.lastname,
                'firstnameEn', d.firstname_en,
                'lastnameEn', d.lastname_en,
                'mobile', d.mobile,
                'score', 4
              ),
              'vehicle',
              json_build_object(
                'plateNo', v.plate_no,
                'vehicleType', v.vehicle_type
              ),
              'price', od.price,
              'paymentType', 'cash',
              'distance', od.distance,
              'time', od.time
            ) as ride,
            json_build_object(
              'distance', 1000,
              'eta', 300,
              'location', json_build_object(
                'lat', public.st_y(ds.point),
                'lng', public.st_x(ds.point)
              ),
              'heading', ds.heading,
              'speed', ds.speed,
              'rideReady', rp.driver_arrived_at is not null,
              'passengerReady', rp.passenger_got_it_at is not null
            ) as ride_approach,
            json_build_object(
              'onboard', rp.passenger_onboard_at is not null,
              'location', json_build_object(
                'lat', public.st_y(ds.point),
                'lng', public.st_x(ds.point)
              ),
              'heading', ds.heading,
              'speed', ds.speed
            ) as ride_progress,
            pr.pickup::json, pr.destination::json
          from ride.ride_progress rp
          inner join ride.driver_offer o on o.passenger_request_id = rp.id
          inner join ride.passenger_request pr on rp.id = pr.id
          inner join unnest(pr.offers) od on pr.requested_vehicle_type = od.vehicle_type
          inner join ride.driver_status ds on rp.driver_id = ds.driver_id
          inner join pbl.driver d on rp.driver_id = d.id
          inner join pbl.vehicle v on rp.vehicle_id = v.id
          where pr.passenger_id = $1
            and rp.passenger_left_at is null
            and rp.driver_canceled_at is null
            and rp.passenger_canceled_at is null
          ;
      `,
        values: [ passenger.id ],
      });
      if(result.rows.length > 0) {
        rideProgress = camelCaseObject(result.rows[0]);
      };
    }
    return {
      passengerRequest,
      rideProgress,
    };
  }

  async handleQuery(payload: any, conn: WSSocket) {
    try{
      const result = await this.server.getDataService().act(this.address()+'/query', payload, conn.user);
      conn.socket.send(JSON.stringify({
        method: 'queryResult',
        payload: result,
      }));
    }catch(err){
      debug(err);
      conn.socket.send(JSON.stringify({
        method: 'queryResult',
        payload: {
          failed: true,
        },
      }));
    }
  }

  actQuery = async (client: PoolClient, actionParam: any, passenger: any) => {
    const { id, pickup, destination } = actionParam;

    if (!id) {
      throwError('id', 'required', 'id is missing!', 'pbl.id');
    }
    if (!pickup.lat) {
      throwError('lat', 'required', 'lat is missing!', 'pbl.lat');
    }
    if (!pickup.lng) {
      throwError('lng', 'required', 'lng is missing!', 'pbl.lng');
    }
    if (!pickup.name) {
      throwError('name', 'required', 'name is missing!', 'pbl.name');
    }
    if (!pickup.address) {
      throwError('address', 'required', 'address is missing!', 'pbl.address');
    }
    if (!destination.lat) {
      throwError('lat', 'required', 'lat is missing!', 'pbl.lat');
    }
    if (!destination.lng) {
      throwError('lng', 'required', 'lng is missing!', 'pbl.lng');
    }
    if (!destination.name) {
      throwError('name', 'required', 'name is missing!', 'pbl.name');
    }
    if (!destination.address) {
      throwError('address', 'required', 'address is missing!', 'pbl.address');
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

      const offers = [
        {vehicleType: 'sedan', price: 25000, distance: 3000, time: 400, enabled: true},
        {vehicleType: 'van', price: 35000, distance: 3000, time: 400, enabled: false},
      ];

      const startIndex = 10;
      const arrayStr = [];
      const valuesArray = [];
      offers.forEach((offer, i)=>{
        arrayStr.push(`(
          $${startIndex + i * 5 + 1},
          $${startIndex + i * 5 + 2},
          $${startIndex + i * 5 + 3},
          $${startIndex + i * 5 + 4},
          $${startIndex + i * 5 + 5}
        )`);
        valuesArray.push(offer.vehicleType);
        valuesArray.push(offer.price);
        valuesArray.push(offer.distance);
        valuesArray.push(offer.time);
        valuesArray.push(offer.enabled);
      });


      const result = await client.query({
        text: `
          insert into ride.passenger_request
            (id, passenger_id, pickup, destination, offers, queried_at)
            values
            ($1, $2, 
              pbl.to_location($3, $4, $5, $6), 
              pbl.to_location($7, $8, $9, $10), 
              array[
                ${arrayStr.join(',\n')}
              ]::pbl.vehicle_type_offer[],
              now()
            )
          returning id, pickup::json, destination::json, offers::json;
        `,
        values: [
          id, passenger.id, 
          pickup.lat, pickup.lng, pickup.name, pickup.address,
          destination.lat, destination.lng, destination.name, destination.address,
          ...valuesArray,
        ],
      });
      if(result.rows.length>0)
        return camelCaseObject(result.rows[0]);
    }
    return false;
  }

  async handleRequest(payload: any, conn: WSSocket) {
    try{
      const result = await this.server.getDataService().act(this.address()+'/request', payload, conn.user);
      conn.socket.send(JSON.stringify({
        method: 'requestResult',
        payload: result,
      }));
    }catch(err){
      debug(err);
      conn.socket.send(JSON.stringify({
        method: 'requestResult',
        payload: {
          failed: true,
        },
      }));
    }
  }

  actRequest = async (client: PoolClient, actionParam: any, passenger: any) => {
    const { passengerRequestId, vehicleType } = actionParam;

    if (!passengerRequestId) {
      throwError('passengerRequestId', 'required', 'passengerRequestId is missing!', 'pbl.passengerRequestId');
    }
    if (!vehicleType) {
      throwError('vehicleType', 'required', 'vehicleType is missing!', 'pbl.vehicleType');
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
          update ride.passenger_request set (requested_vehicle_type, requested_at)
            = ($2, now())
          where id = $1;
        `,
        values: [ passengerRequestId, vehicleType ],
      });
      this.server.getDataService().act('/driver/tryOffer', { passengerRequestId });
    }
    return true;
  }

  async handleConfirm(payload: any, conn: WSSocket) {
    try{
      const result = await this.server.getDataService().act(this.address()+'/confirm', payload, conn.user);
      conn.socket.send(JSON.stringify({
        method: 'confirmResult',
        payload: result,
      }));
    }catch(err){
      debug(err);
      conn.socket.send(JSON.stringify({
        method: 'confirmResult',
        payload: {
          failed: true,
        },
      }));
    }
  }

  actConfirm = async (client: PoolClient, actionParam: any, passenger: any) => {
    const { rideProgressId, vehicleType } = actionParam;

    if (!rideProgressId) {
      throwError('rideProgressId', 'required', 'rideProgressId is missing!', 'pbl.rideProgressId');
    }

    {
      const result = await client.query({
        text: `
          select passenger_got_it_at
          from ride.ride_progress
          where id = $1 and passenger_got_it_at is null
          for update;
        `,
        values: [ rideProgressId ],
      });
      if(result.rows.length === 0){
        return false;
      }
      await client.query({
        text: `
          update ride.ride_progress set passenger_got_it_at = now()
          where id = $1;
        `,
        values: [ rideProgressId ],
      });
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

  actCancel = async (client: PoolClient, actionParam: any, passenger: any) => {
    const { rideProgressId, lat, lng } = actionParam;
    const passengerRequestId = rideProgressId;// it is the same

    if (!passenger?.id) {
      throwError('passengerId', 'required', 'passengerId is missing!', 'pbl.passengerId');
    }
    if (!passengerRequestId) {
      throwError('passengerRequestId', 'required', 'passengerRequestId is missing!', 'pbl.passengerRequestId');
    }
    if (!lat) {
      throwError('lat', 'required', 'lat is missing!', 'pbl.lat');
    }
    if (!lng) {
      throwError('lng', 'required', 'lng is missing!', 'pbl.lng');
    }

    {
      let passengerRequest;
      {
        const result = await client.query({
          text: `
            select id, passenger_id, requested_at, abondoned_at, expired_at
            from ride.passenger_request
            where id = $1
            for update;
          `,
          values: [ passengerRequestId ],
        });
  
        if(result.rows.length === 0){
          return false;
        }
        passengerRequest = camelCaseObject(result.rows[0]);
        if(
          passengerRequest.passengerId != passenger.id
        ){
          return false;
        }
      }
      let driverOffers;
      {
        const result = await client.query({
          text: `
            select id, driver_id
            from ride.driver_offer
            where passenger_request_id = $1
            for update;
          `,
          values: [ passengerRequestId ],
        });
        driverOffers = camelCaseObject(result.rows);
      }
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
  
        if(result.rows.length>0){
          rideProgress = camelCaseObject(result.rows[0]);
        }
      }

      if((driverOffers.length === 0 || !rideProgress) && passengerRequest){
        await client.query({
          text: `
            update ride.passenger_request set abondoned_at = now()
            where id = $1;
          `,
          values: [ passengerRequest.id ],
        });
      }

      if(driverOffers.length !== 0 && !rideProgress){
        await client.query({
          text: `
            update ride.driver_offer set canceled_at = now()
            where passenger_request_id = $1
              and driver_respond_at is null
              and canceled_at is null
              and expired_at is null;
          `,
          values: [ passengerRequest.id ],
        });
      }

      if(
        rideProgress?.passengerLeftAt === null
        && rideProgress?.driverCanceledAt === null
        && rideProgress?.passengerCanceledAt === null
      ){
        const result = await client.query({
          text: `
            update ride.ride_progress set (passenger_canceled_at, passenger_canceled_point)
              = (now(), pbl.to_point($2, $3))
            where id = $1
            returning driver_id;
          `,
          values: [ rideProgress.id, lat, lng ],
        });

        if(result.rowCount===0){
          return false;
        }
        const driverId = result.rows[0].driver_id;

        await client.query({
          text: `
            update ride.driver_status set status = $2, ride_progress_id = null
            where driver_id = $1;
          `,
          values: [ driverId, 'ready' ],
        });
      }
    }
    return true;
  }

  actRideFound = async (client: PoolClient, actionParam: any) => {
    const { driverId, passengerId, rideProgressId } = actionParam;

    const result = await client.query({
      text: `
        select rp.id,
          json_build_object(
            'driver',
            json_build_object(
              'firstname', d.firstname,
              'lastname', d.lastname,
              'firstnameEn', d.firstname_en,
              'lastnameEn', d.lastname_en,
              'mobile', d.mobile,
              'score', 4
          ),
            'vehicle',
            json_build_object(
              'plateNo', v.plate_no,
              'vehicleType', v.vehicle_type
            ),
            'price', od.price,
            'paymentType', 'cash',
            'distance', od.distance,
            'time', od.time
          ) as ride,
          json_build_object(
            'distance', 1000,
            'eta', 300,
            'location', json_build_object(
              'lat', public.st_y(ds.point),
              'lng', public.st_x(ds.point)
            ),
            'heading', ds.heading,
            'speed', ds.speed,
            'rideReady', rp.driver_arrived_at is not null,
            'passengerReady', rp.passenger_got_it_at is not null
          ) as ride_approach,
          json_build_object(
            'onboard', rp.passenger_onboard_at is not null,
            'location', json_build_object(
              'lat', public.st_y(ds.point),
              'lng', public.st_x(ds.point)
            ),
            'heading', ds.heading,
            'speed', ds.speed
          ) as ride_progress,
          pr.pickup::json, pr.destination::json
        from ride.ride_progress rp
        inner join ride.driver_offer o on o.passenger_request_id = rp.id
        inner join ride.passenger_request pr on rp.id = pr.id
        inner join unnest(pr.offers) od on pr.requested_vehicle_type = od.vehicle_type
        inner join ride.driver_status ds on rp.driver_id = ds.driver_id
        inner join pbl.driver d on rp.driver_id = d.id
        inner join pbl.vehicle v on rp.vehicle_id = v.id
        where rp.id = $1;
      `,
      values: [ rideProgressId ],
    });

    if(result.rows.length === 0){
      return;
    }
    const offer = camelCaseObject(result.rows[0]);

    const conn = this.passengers.get(passengerId);
    if(!conn) return;

    conn.socket.send(JSON.stringify({
      method: 'rideFound',
      payload: {
        offer,
      },
    }));
  }

  actArrived = async (client: PoolClient, actionParam: any) => {
    const { driverId, passengerId, rideProgressId } = actionParam;


    const conn = this.passengers.get(passengerId);
    if(!conn) return;

    conn.socket.send(JSON.stringify({
      method: 'driverArrived',
      payload: {
        rideProgressId,
      },
    }));
  }

  actBoarded = async (client: PoolClient, actionParam: any) => {
    const { driverId, passengerId, rideProgressId } = actionParam;


    const conn = this.passengers.get(passengerId);
    if(!conn) return;

    conn.socket.send(JSON.stringify({
      method: 'boarded',
      payload: {
        rideProgressId,
      },
    }));
  }

  actLeft = async (client: PoolClient, actionParam: any) => {
    const { driverId, passengerId, rideProgressId } = actionParam;


    const conn = this.passengers.get(passengerId);
    if(!conn) return;

    conn.socket.send(JSON.stringify({
      method: 'left',
      payload: {
        rideProgressId,
      },
    }));
  }

  actDriverCanceled = async (client: PoolClient, actionParam: any) => {
    const { driverId, passengerId, rideProgressId } = actionParam;


    const conn = this.passengers.get(passengerId);
    if(!conn) return;

    conn.socket.send(JSON.stringify({
      method: 'driverCanceled',
      payload: {
        rideProgressId,
      },
    }));
  }

  actDriverMoved = async (client: PoolClient, actionParam: any) => {
    const { driverId, passengerId, point } = actionParam;


    const conn = this.passengers.get(passengerId);
    if(!conn) return;

    conn.socket.send(JSON.stringify({
      method: 'driverMoved',
      payload: {
        point,
      },
    }));
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
        }else {
          if(!conn.user){
            conn.socket.send('authentication required!');
          }else if(method==='initialState'){
            this.handleInitialState(payload, conn);
          }else if(method==='query'){
            this.handleQuery(payload, conn);
          }else if(method==='request'){
            this.handleRequest(payload, conn);
          }else if(method==='confirm'){
            this.handleConfirm(payload, conn);
          }else if(method==='cancel'){
            this.handleCancel(payload, conn);
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

class RideFoundListener implements NotificationListener{
  private server: Server;

  setServer(s: Server) { this.server = s; }
  channel = 'ride_progress_created';

  callback(payloadStr?: string){
    const payload = JSON.parse(payloadStr);
    const {driverId, passengerId, rideProgressId} = payload;
    if(!driverId || !passengerId || !rideProgressId) return;
    const actionParam = {
      driverId,
      passengerId,
      rideProgressId,
    }
    this.server.getDataService().act('/passenger/rideFound', actionParam);
  }
}

class RideArrivedListener implements NotificationListener{
  private server: Server;

  setServer(s: Server) { this.server = s; }
  channel = 'ride_progress_arrived';

  callback(payloadStr?: string){
    const payload = JSON.parse(payloadStr);
    const {driverId, passengerId, rideProgressId} = payload;
    if(!driverId || !passengerId || !rideProgressId) return;
    const actionParam = {
      driverId,
      passengerId,
      rideProgressId,
    }
    this.server.getDataService().act('/passenger/arrived', actionParam);
  }
}

class RideBoardedListener implements NotificationListener{
  private server: Server;

  setServer(s: Server) { this.server = s; }
  channel = 'ride_progress_boarded';

  callback(payloadStr?: string){
    const payload = JSON.parse(payloadStr);
    const {driverId, passengerId, rideProgressId} = payload;
    if(!driverId || !passengerId || !rideProgressId) return;
    const actionParam = {
      driverId,
      passengerId,
      rideProgressId,
    }
    this.server.getDataService().act('/passenger/boarded', actionParam);
  }
}

class RideLeftListener implements NotificationListener{
  private server: Server;

  setServer(s: Server) { this.server = s; }
  channel = 'ride_progress_left';

  callback(payloadStr?: string){
    const payload = JSON.parse(payloadStr);
    const {driverId, passengerId, rideProgressId} = payload;
    if(!driverId || !passengerId || !rideProgressId) return;
    const actionParam = {
      driverId,
      passengerId,
      rideProgressId,
    }
    this.server.getDataService().act('/passenger/left', actionParam);
  }
}

class DriverCanceledListener implements NotificationListener{
  private server: Server;

  setServer(s: Server) { this.server = s; }
  channel = 'ride_progress_driver_canceled';

  callback(payloadStr?: string){
    const payload = JSON.parse(payloadStr);
    const {driverId, passengerId, rideProgressId} = payload;
    if(!driverId || !rideProgressId) return;
    const actionParam = {
      driverId,
      passengerId,
      rideProgressId,
    }
    this.server.getDataService().act('/passenger/driverCanceled', actionParam);
  }
}

class DriverMovedListener implements NotificationListener{
  private server: Server;

  setServer(s: Server) { this.server = s; }
  channel = 'driver_moved';

  callback(payloadStr?: string){
    const payload = JSON.parse(payloadStr);
    const {driverId, passengerId, point} = payload;
    if(!driverId || !passengerId || !point) return;
    const actionParam = {
      driverId,
      passengerId,
      point,
    }
    this.server.getDataService().act('/passenger/driverMoved', actionParam);
  }
}

export const models: Model[] = [ 
  new Passenger(),
];

export const notifications: NotificationListener[] = [
  new RideFoundListener(),
  new RideArrivedListener(),
  new RideBoardedListener(),
  new RideLeftListener(),
  new DriverCanceledListener(),
  new DriverMovedListener(),
];

const RejectReasonEnum = [
  'cheap',
  'far',
  'misc',
];
