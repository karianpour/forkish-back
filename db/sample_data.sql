delete from ride.ride_progress;
delete from ride.driver_offer;
/*
delete from ride.passenger_request;
delete from pbl.driver;
delete from pbl.passenger;
*/

/*
insert into pbl.driver (id, mobile, firstname, lastname, firstname_en, lastname_en, photo_url, created_at) 
  values ('f473b9f0-8be3-4ee6-9c08-f5b8e8862559', '09121161998', 'کیوان', 'آرین‌پور', 'Kayvan', 'Arianpour', 'http://', now());

insert into pbl.passenger (id, mobile, firstname, lastname, created_at) 
  values ('f473b9f0-8be3-4ee6-9c08-f5b8e8862559', '09121161998', 'کیوان', 'آرین‌پور', now());

insert into ride.passenger_request
  (id, passenger_id, pickup, destination, car_type, price, distance, time, requested_at)
  values
  (
    'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559',
    ('srid=4326;point(56 31)', 'کمند'),
    ('srid=4326;point(56.5 31.5)', 'کمند ۲'),
    'sedan', 25000, 1000, 400, now()
  );
*/
insert into ride.driver_offer 
  (id, driver_id, passenger_request_id, offered_at, driver_point)
  values
  (
    'f473b9f0-8be3-4ee6-9c08-f5b8e8862559',
    'f473b9f0-8be3-4ee6-9c08-f5b8e8862559',
    'f473b9f0-8be3-4ee6-9c08-f5b8e8862559',
    now(), 'srid=4326;point(56 31)'
  );

