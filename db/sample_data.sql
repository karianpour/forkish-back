insert into pbl.driver (id, mobile, firstname, lastname, firstname_en, lastname_en, photo_url, created_at) 
  values ('f473b9f0-8be3-4ee6-9c08-f5b8e8862559', '09121161998', 'کیوان', 'آرین‌پور', 'Kayvan', 'Arianpour', 'http://', now());
insert into pbl.vehicle (id, vehicle_type, plate_no, capacity) 
  values ('f473b9f0-8be3-4ee6-9c08-f5b8e8864559', 'sedan', '12345/22', 4);
insert into pbl.driver_vehicle (id, driver_id, vehicle_id, invalid) 
  values ('f473b9f0-8be3-4ee6-9c08-f5b8e8868559', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', 'f473b9f0-8be3-4ee6-9c08-f5b8e8864559', false);

insert into pbl.passenger (id, mobile, firstname, lastname, created_at) 
  values ('f473b9f0-8be3-4ee6-9c08-f5b8e8860559', '09121161998', 'کیوان', 'آرین‌پور', now());



insert into pbl.driver (id, mobile, firstname, lastname, firstname_en, lastname_en, photo_url, created_at) 
  values ('f473b9f0-8be3-4ee6-9c08-f5b8e8862560', '09124385396', 'مصطفی', 'خلیلی', 'Mostafa', 'Khalili', 'http://', now());
insert into pbl.vehicle (id, vehicle_type, plate_no, capacity) 
  values ('f473b9f0-8be3-4ee6-9c08-f5b8e8864560', 'sedan', '43215/22', 4);
insert into pbl.driver_vehicle (id, driver_id, vehicle_id, invalid) 
  values ('f473b9f0-8be3-4ee6-9c08-f5b8e8868560', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862560', 'f473b9f0-8be3-4ee6-9c08-f5b8e8864560', false);

insert into pbl.passenger (id, mobile, firstname, lastname, created_at) 
  values ('f473b9f0-8be3-4ee6-9c08-f5b8e8860560', '09124385396', 'مصطفی', 'خلیلی', now());
