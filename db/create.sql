/*
-- create collation public."fa_IR" (provider = libc, locale = 'fa_IR');

-- create collation public."fa_IR.utf8" (provider = libc, locale = 'fa_IR.utf8');


for upgrade visit : https://www.kostolansky.sk/posts/upgrading-to-postgresql-12/


please install the following extension:
  https://github.com/furstenheim/is_jsonb_valid


download the zip file from github
 wget https://github.com/furstenheim/is_jsonb_valid/archive/master.zip
 unzip master.zip
 cd is_jsonb_valid-master/
 make PG_CONFIG=/usr/lib/postgresql/12/bin/pg_config install


CREATE USER forkish WITH ENCRYPTED PASSWORD 'forkish';

create database forkish encoding = 'utf8' lc_collate = 'fa_IR.utf8' template template0;
\c forkish
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA public;
CREATE EXTENSION IF NOT EXISTS btree_gist SCHEMA public;
CREATE EXTENSION IF NOT EXISTS is_jsonb_valid SCHEMA public;
CREATE EXTENSION IF NOT EXISTS postgis SCHEMA public;
ALTER DATABASE forkish OWNER TO forkish;


-- for uuid-v4 generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
select gen_random_uuid();


-- this is not used
create extension if not exists ltree with schema public;
comment on extension ltree is 'data type for hierarchical tree-like structures';
-------------------

*/

/*
run it as forkish
*/

set statement_timeout = 0;
set lock_timeout = 0;
set idle_in_transaction_session_timeout = 0;

select pg_catalog.set_config('search_path', '', false);
set standard_conforming_strings = on;


DROP SCHEMA if exists pbl  CASCADE;
DROP SCHEMA if exists ride  CASCADE;
DROP SCHEMA if exists archive  CASCADE;
DROP SCHEMA if exists log  CASCADE;

CREATE SCHEMA if not exists pbl;
CREATE SCHEMA if not exists ride;
CREATE SCHEMA if not exists archive;
CREATE SCHEMA if not exists log;


drop function if exists public.fa_trim;

create function public.fa_trim (_str text)
returns text
as $$
begin
		return translate(regexp_replace(_str, E'[ \t\n\r_\\-‌ًٌٍَُِّْٔ ٰٓٔ‍ٕ]', '', 'gi'), '١٢٣٤٥٦٧٨٩٠1234567890يىئؤآأإكء', '۱۲۳۴۵۶۷۸۹۰۱۲۳۴۵۶۷۸۹۰یییواااکا');
end; $$
language PLPGSQL
IMMUTABLE
RETURNS NULL ON NULL INPUT;

create or replace function public.to_number_digits (_str text)
returns text
as $$
begin
		return translate(_str, '۱۲۳۴۵۶۷۸۹۰۱۲۳۴۵۶۷۸۹۰', '12345678901234567890');
end; $$
language PLPGSQL
IMMUTABLE
RETURNS NULL ON NULL INPUT;

create domain pbl.mobile_number as text check (value  ~ '^09\d{9}$');

create type pbl.vehicle_type_enum as enum (
  'sedan',
  'hatchback',
  'van'
);

create type log.entity_types_enum as enum(
  'passenger', 'driver', 'ride'
);

create table log.action_log (
  id bigserial primary key not null,
  entity_id uuid not null,
  entity log.entity_types_enum not null,
  payload_patch json not null,
  creator_id uuid not null,
  created_at timestamptz not null default now()
);

create table log.jwt (
  id bigserial primary key not null,
  entity_id uuid not null,
  entity log.entity_types_enum not null,
  jwt text not null,
  created_at timestamptz not null default now(),
  invalidated_at timestamptz null
);

create table pbl.driver (
  id uuid primary key not null,
  mobile pbl.mobile_number not null unique,
  firstname text not null,
  lastname text not null,
  firstname_en text not null,
  lastname_en text not null,
  photo_url text not null,
  created_at timestamptz null,
  unique (mobile)
);

create table pbl.vehicle (
  id uuid primary key not null,
  vehicle_type pbl.vehicle_type_enum not null,
  plate_no text not null,
  capacity int not null
);

create table pbl.driver_vehicle (
  id uuid primary key not null,
  driver_id uuid not null references pbl.driver (id),
  vehicle_id uuid not null references pbl.vehicle (id),
  invalid boolean not null,
  unique (driver_id, vehicle_id)
);

create table pbl.driver_otp (
  id bigserial primary key not null,
  driver_id uuid not null references pbl.driver (id),
  code text not null,
  created_at timestamptz not null,
  activation_failed_count int not null,
  activated boolean not null,
  used boolean not null,
  used_at timestamptz null
);

create type pbl.driver_status_enum as enum (
  'ready',
  'off',
  'occupied'
);

create table log.driver_signal (
  id bigserial primary key not null,
  driver_id uuid not null references pbl.driver (id),
  point public.geometry(point, 4326) not null,
  status pbl.driver_status_enum not null,
  occured_at timestamptz null
);

create table ride.driver_status (
  driver_id uuid primary key not null references pbl.driver (id),
  point public.geometry(point, 4326) not null,
  status pbl.driver_status_enum not null,
  ride_progress_id uuid null
);

create table pbl.passenger (
  id uuid primary key not null,
  mobile pbl.mobile_number not null unique,
  firstname text not null,
  lastname text not null,
  created_at timestamptz null,
  unique (mobile)
);

create table pbl.passenger_otp (
  id bigserial primary key not null,
  passenger_id uuid not null references pbl.passenger (id),
  code text not null,
  created_at timestamptz not null,
  activation_failed_count int not null,
  activated boolean not null,
  used boolean not null,
  used_at timestamptz null
);

create type pbl.location as (
  point public.geometry(point, 4326),
  address text
);

create type pbl.vehicle_type_offer as (
  vehicle_type pbl.vehicle_type_enum,
  price numeric(10, 2),
  distance real,
  time real
);

create table ride.passenger_request (
  id uuid primary key not null,
  passenger_id uuid not null references pbl.passenger (id),
  pickup pbl.location not null,
  destination pbl.location not null,
  offers pbl.vehicle_type_offer[] not null,
  queried_at timestamptz not null,
  requested_vehicle_type pbl.vehicle_type_enum null,
  requested_at timestamptz null,
  abondoned_at timestamptz null,
  expired_at timestamptz null
);

create table archive.passenger_request_archive (
  data ride.passenger_request not null,
  archived_at timestamptz
);

create type pbl.driver_response_enum as enum (
  'accepted',
  'rejected_cheap',
  'rejected_far',
  'rejected_misc',
  'timedout'
);

create table ride.driver_offer (
  id uuid primary key not null,
  driver_id uuid not null references pbl.driver (id),
  passenger_request_id uuid not null references ride.passenger_request (id),
  vehicle_type pbl.vehicle_type_enum not null,
  offered_at timestamptz not null,
  driver_point public.geometry(point, 4326) null,
  driver_response pbl.driver_response_enum null,
  driver_respond_at timestamptz null,
  canceled_at timestamptz null,
  expired_at timestamptz null
);

create table archive.driver_offer_archive (
  data ride.driver_offer not null,
  archived_at timestamptz
);

create table ride.ride_progress (
  id uuid primary key not null references ride.passenger_request (id),
  driver_id uuid not null references pbl.driver (id),
  driver_arrived_at timestamptz null,
  driver_arrived_point public.geometry(point, 4326) null,
  passenger_onboard_at timestamptz null,
  passenger_onboard_point public.geometry(point, 4326) null,
  passenger_left_at timestamptz null,
  passenger_left_point public.geometry(point, 4326) null,
  driver_canceled_at timestamptz null,
  driver_canceled_point public.geometry(point, 4326) null,
  passenger_canceled_at timestamptz null,
  passenger_canceled_point public.geometry(point, 4326) null
);

create table archive.ride_progress_archive (
  data ride.ride_progress not null,
  archived_at timestamptz
);
