drop trigger if exists driver_offer_notify_insert on ride.driver_offer;
drop function if exists ride.driver_offer_notify;

create or replace function ride.driver_offer_notify() returns trigger as $$
begin
  perform pg_notify('driver_offer', json_build_object('driverOfferId', NEW.id, 'driverId', NEW.driver_id)::text);
  return null;
end;
$$ language plpgsql;


create trigger driver_offer_notify_insert after insert on ride.driver_offer for each row execute procedure ride.driver_offer_notify();
