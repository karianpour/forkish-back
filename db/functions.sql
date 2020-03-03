drop trigger if exists driver_offer_notify on ride.driver_offer;
drop function if exists ride.driver_offer_notify;

create or replace function ride.driver_offer_notify() returns trigger as $$
begin
  if tg_op = 'INSERT' then
    perform pg_notify('driver_offer', json_build_object('driverOfferId', NEW.id, 'driverId', NEW.driver_id)::text);
  elsif tg_op = 'UPDATE' then
    if (OLD.canceled_at is null and NEW.canceled_at is not null)
      or (OLD.expired_at is null and NEW.expired_at is not null) then
      perform pg_notify('driver_offer_drawback', json_build_object('driverOfferId', NEW.id, 'driverId', NEW.driver_id)::text);
    end if;
  end if;
  
  return null;
end;
$$ language plpgsql;

create trigger driver_offer_notify after insert or update on ride.driver_offer for each row execute procedure ride.driver_offer_notify();


drop trigger if exists driver_status_notify on ride.driver_status;
drop function if exists ride.driver_status_notify;

create or replace function ride.driver_status_notify() returns trigger as $$
declare
  passenger_id uuid;
begin
  if tg_op = 'UPDATE' then
    if NEW.status = 'occupied' and NEW.ride_progress_id is not null then
      select pr.passenger_id into passenger_id
      from ride.ride_progress rp
      inner join ride.passenger_request pr on rp.id = pr.id
      where rp.id = NEW.ride_progress_id;
      perform pg_notify('driver_moved',
        json_build_object('driverId', NEW.driver_id, 'passengerId', passenger_id, 'point', json_build_object('lat', public.st_y(NEW.point),'lng', public.st_x(NEW.point)))::text);
    end if;
  end if;

  return null;
end;
$$ language plpgsql;

create trigger driver_status_notify after insert or update on ride.driver_status for each row execute procedure ride.driver_status_notify();

drop trigger if exists ride_progress_notify on ride.ride_progress;
drop function if exists ride.ride_progress_notify;

create or replace function ride.ride_progress_notify() returns trigger as $$
declare
  passenger_id uuid;
begin
  select pr.passenger_id into passenger_id from ride.passenger_request pr where pr.id = NEW.id;

  if tg_op = 'INSERT' then
    perform pg_notify('ride_progress_created', json_build_object('rideProgressId', NEW.id, 'passengerId', passenger_id, 'driverId', NEW.driver_id)::text);
  elsif tg_op = 'UPDATE' then
    if OLD.driver_arrived_at is null and NEW.driver_arrived_at is not null then
      perform pg_notify('ride_progress_arrived', json_build_object('rideProgressId', NEW.id, 'passengerId', passenger_id, 'driverId', NEW.driver_id)::text);
    elsif OLD.passenger_onboard_at is null and NEW.passenger_onboard_at is not null then
      perform pg_notify('ride_progress_boarded', json_build_object('rideProgressId', NEW.id, 'passengerId', passenger_id, 'driverId', NEW.driver_id)::text);
    elsif OLD.passenger_left_at is null and NEW.passenger_left_at is not null then
      perform pg_notify('ride_progress_left', json_build_object('rideProgressId', NEW.id, 'passengerId', passenger_id, 'driverId', NEW.driver_id)::text);
    elsif OLD.driver_canceled_at is null and NEW.driver_canceled_at is not null then
      perform pg_notify('ride_progress_driver_canceled', json_build_object('rideProgressId', NEW.id, 'passengerId', passenger_id, 'driverId', NEW.driver_id)::text);
    elsif OLD.passenger_canceled_at is null and NEW.passenger_canceled_at is not null then
      perform pg_notify('ride_progress_canceled', json_build_object('rideProgressId', NEW.id, 'passengerId', passenger_id, 'driverId', NEW.driver_id)::text);
    end if;
  end if;
  return null;
end;
$$ language plpgsql;


create trigger ride_progress_notify after insert or update on ride.ride_progress for each row execute procedure ride.ride_progress_notify();

create or replace function pbl.to_point(lat real, lng real) returns public.geometry(point, 4326) as $$
  select public.ST_SetSRID( public.ST_Point(lng, lat), 4326)::public.geometry(point, 4326);
$$ language sql immutable;

create or replace function pbl.location_to_json(pbl.location) returns json as $$
  select json_build_object(
    'lat', public.st_y($1.point),
    'lng', public.st_x($1.point),
    'address', $1.address
  );
$$ language sql immutable;
create cast (pbl.location as json) with function pbl.location_to_json(pbl.location) as assignment;

create or replace function pbl.to_location(lat real, lng real, address text) returns pbl.location as $$
  select (pbl.to_point(lat, lng), address)::pbl.location;
$$ language sql immutable;


create or replace function pbl.vehicle_type_offer_to_json(pbl.vehicle_type_offer) returns json as $$
  select json_build_object(
    'vehicleType', $1.vehicle_type,
    'price', $1.price,
    'distance', $1.distance,
    'time', $1.time
  );
$$ language sql;
create cast (pbl.vehicle_type_offer as json) with function pbl.vehicle_type_offer_to_json(pbl.vehicle_type_offer) as assignment;


create or replace function pbl.vehicle_type_offers_to_json(pbl.vehicle_type_offer[]) returns json as $$
  select array_to_json($1);
$$ language sql;
create cast (pbl.vehicle_type_offer[] as json) with function pbl.vehicle_type_offers_to_json(pbl.vehicle_type_offer[]) as assignment;

