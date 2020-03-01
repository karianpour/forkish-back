drop schema jalali cascade;

create schema jalali;
alter schema jalali owner to divano;

set search_path=jalali;

/*
these functions have problem before 1372 and after 1408, so not a problem for now

*/
-- drop function if exists constructdate;

create function constructdate (_year int, _month int, _day int)
returns text
as $$ 
declare
	_yeary text; _monthm text; _dayd text;
begin
	_dayd := _day::text;
	_dayd := left('00', 2 - char_length(_dayd)) || _dayd;
	_monthm := _month::text;
	_monthm := left('00', 2 - char_length(_monthm)) || _monthm;
	_yeary := _year::text;
	_yeary := left('0000', 4 - char_length(_yeary)) || _yeary;
	return _yeary || '-' || _monthm || '-' || _dayd;
end; $$
language PLPGSQL
IMMUTABLE
LEAKPROOF
RETURNS NULL ON NULL INPUT;


-- drop function if exists gregorianmonthdays;

create function gregorianmonthdays (_month int)
returns int
as $$
declare _month_days int;
begin
  case _month
	when 0  then _month_days := 31;
	when 1  then _month_days := 28;
	when 2  then _month_days := 31;
	when 3  then _month_days := 30;
	when 4  then _month_days := 31;
	when 5  then _month_days := 30;
	when 6  then _month_days := 31;
	when 7  then _month_days := 31;
	when 8  then _month_days := 30;
	when 9  then _month_days := 31;
	when 10 then _month_days := 30;
	when 11 then _month_days := 31;
  end case;
	return _month_days;
end; $$
language PLPGSQL
IMMUTABLE
LEAKPROOF
RETURNS NULL ON NULL INPUT;



-- drop function if exists jalalimonthdays;

create function jalalimonthdays (_month int)
returns int
as $$
declare _month_days int;
begin
  case _month
	when 0  then _month_days := 31;
	when 1  then _month_days := 31;
	when 2  then _month_days := 31;
	when 3  then _month_days := 31;
	when 4  then _month_days := 31;
	when 5  then _month_days := 31;
	when 6  then _month_days := 30;
	when 7  then _month_days := 30;
	when 8  then _month_days := 30;
	when 9  then _month_days := 30;
	when 10 then _month_days := 30;
	when 11 then _month_days := 29;
  end case;
	return _month_days;
end; $$
language PLPGSQL
IMMUTABLE
LEAKPROOF
RETURNS NULL ON NULL INPUT;



-- drop function if exists JalaliGoFirstDateOfMonth;

create function JalaliGoFirstDateOfMonth (_date text)
returns text
as $$
declare _day int; _d int; _m int; _y int;
begin
		_day := 0;
    _date := replace(_date, '-', '');
		_d := 1;
		_m := substring(_date, 5, 2)::int;
		_y := substring(_date, 1, 4)::int;

	return jalali.constructdate(_y, _m, _d);
end; $$
language PLPGSQL
IMMUTABLE
LEAKPROOF
RETURNS NULL ON NULL INPUT;


-- drop function if exists JalaliGoLastDateOfMonth;

create function JalaliGoLastDateOfMonth (_date text)
returns text
as $$
begin
  return jalali.JalaliDaysToDate(jalali.JalaliDateToDays(jalali.JalaliGoFirstDateOfMonth(jalali.JalaliDaysToDate(jalali.JalaliDateToDays(jalali.JalaliGoFirstDateOfMonth(_date)) + 31))) - 1);
end; $$
language PLPGSQL
IMMUTABLE
LEAKPROOF
RETURNS NULL ON NULL INPUT;


-- drop function if exists JalaliDateToDays;

create function JalaliDateToDays (_date text)
returns int
as $$
declare _day int; _d int; _m int; _y int;
begin
		_day := 0;
    _date := replace(_date, '-', '');
		_d := substring(_date, 7, 2);
		_m := substring(_date, 5, 2);
		_y := substring(_date, 1, 4);

		_day := _day + _d;
		if (_m > 6) then
			_day := _day + (6 * 31) + ((_m - 7) * 30);
		else
			_day := _day + ((_m - 1) * 31);
    end if;

		_y := _y - 1371;
		_day := _day + (_y * 365) + ((_y + 3) / 4); --  - (_y / 32)
		return _day;
end; $$
language PLPGSQL
IMMUTABLE
LEAKPROOF
RETURNS NULL ON NULL INPUT;


-- drop function if exists JalaliDaysToDate;

create function JalaliDaysToDate (_days int) 
returns text
as $$
declare _d int; _m int; _y int; _i int; _ly int;
begin
	_y := _days / 365;
	_ly := (_y + 3) / 4;
	if (_days % 365 <= _ly) then 
    _y := _y-1;
  end if;

	_days := _days - (_y * 365 + (_y + 3) / 4);
	_m := 1;
	_i := 0;

	while (_i < 11) loop
		if (_days > jalali.jalalimonthdays(_i)) then
			_m := _m + 1;
			_days := _days - jalali.jalalimonthdays(_i);
			_i := _i + 1;
		else
			exit;
    end if;
	end loop;

	_d := _days;
	_y := _y + 1371;
	return jalali.constructdate(_y, _m, _d);
end; $$
language PLPGSQL
IMMUTABLE
LEAKPROOF
RETURNS NULL ON NULL INPUT;



-- drop function if exists GregorianDateToDays;

create function GregorianDateToDays (_date text)
returns int
as $$
declare _day int; _d int; _m int; _y int; _i int;
begin
		_day := 0;
    _date := replace(_date, '-', '');
		_d := substring(_date, 7, 2);
		_m := substring(_date, 5, 2);
		_y := substring(_date, 1, 4);

		_day := _day + _d;
		_i := 1;
		while(_i < _m) loop
			_day := _day + jalali.gregorianmonthdays(_i - 1);
			_i := _i + 1;
		end loop;

		_y := _y - 1992;
		_day := _day + (_y * 365) + ((_y + 3) / 4); -- - (_y / 32)

		if ((_y % 4) = 0 and _m > 2) then
			_day := _day + 1;
    end if;

		_day := _day - (31 + 29 + 19);
		return _day;
end; $$
language PLPGSQL
IMMUTABLE
LEAKPROOF
RETURNS NULL ON NULL INPUT;



-- drop function if exists GregorianDaysToDate;

create function GregorianDaysToDate (_days int) 
returns text
as $$
declare _d int; _m int; _y int; _i int; _ly int;
begin
	_days := _days + (31 + 29 + 19);
	_y := _days / 365;
	_ly := (_y + 3) / 4;
	if (_days % 365 <= _ly) then 
    _y := _y-1; 
  end if;

	_days := _days - (_y * 365 + (_y + 3) / 4);
	_m := 1;
	_i := 0;

	while (_i < 12) loop
		if (_i = 1 and (_y % 4)=0) then
			if (_days > (jalali.gregorianmonthdays(_i) + 1)) then
				_m := _m+1;
				_days := _days - (jalali.gregorianmonthdays(_i) + 1);
			end if;
		elseif (_days > jalali.gregorianmonthdays(_i)) then
			_m := _m+1;
			_days := _days - jalali.gregorianmonthdays(_i);
		else 
      exit;
    end if;
		_i := _i + 1;
	end loop;
	_d := _days;
	_y := _y + 1992;
	return jalali.constructdate(_y, _m, _d);
end; $$
language PLPGSQL
IMMUTABLE
LEAKPROOF
RETURNS NULL ON NULL INPUT;



-- drop function if exists jalali2gregorian;

create function jalali2gregorian (_jalaliDate text) 
returns text
as $$
begin
		return jalali.GregorianDaysToDate(jalali.JalaliDateToDays(_jalaliDate));
end; $$
language PLPGSQL
IMMUTABLE
LEAKPROOF
RETURNS NULL ON NULL INPUT;



-- drop function if exists gregorian2jalali;

create function gregorian2jalali (_gregorianDate text)
returns text
as $$
begin
		return jalali.JalaliDaysToDate(jalali.GregorianDateToDays(_gregorianDate));
end; $$
language PLPGSQL
IMMUTABLE
LEAKPROOF
RETURNS NULL ON NULL INPUT;



-- drop function if exists jalali2timestamp;

create function jalali2timestamp (_jalaliDate text)
returns text
as $$
begin
		return to_timestamp(jalali.JalaliDateToDays(_jalaliDate) * 86400 + 700950600);
end; $$
language PLPGSQL
IMMUTABLE
LEAKPROOF
RETURNS NULL ON NULL INPUT;

-- drop function if exists g2j;

create function g2j (_gDate date)
returns text
as $$
begin
		return jalali.gregorian2jalali(_gDate::text);
end; $$
language PLPGSQL
IMMUTABLE
LEAKPROOF
RETURNS NULL ON NULL INPUT;

-- drop function if exists j2g;

create function j2g (_gDate text)
returns text
as $$
begin
		return jalali.jalali2gregorian(_gDate);
end; $$
language PLPGSQL
IMMUTABLE
LEAKPROOF
RETURNS NULL ON NULL INPUT;


/*

select jalali.gregorian2jalali(now()::text);

select jalali.jalali2gregorian('1397-10-02'), jalali.gregorian2jalali('2018-12-23');
select jalali.JalaliGoFirstDateOfMonth('1397-01-02'), jalali.JalaliGoLastDateOfMonth('1397-01-02');
select jalali.jalali2timestamp('1397-10-02');

select jalali.JalaliGoFirstDateOfMonth(jalali.gregorian2jalali(now()::text)), jalali.JalaliGoLastDateOfMonth(jalali.gregorian2jalali(now()::text));
select 
  jalali.jalali2timestamp(jalali.JalaliGoFirstDateOfMonth(jalali.gregorian2jalali(now()::text))), 
  jalali.jalali2timestamp(jalali.JalaliGoLastDateOfMonth(jalali.gregorian2jalali(now()::text)));


select count(*) from (select generate_series(1, 10000), jalali.JalaliGoFirstDateOfMonth (jalali.gregorian2jalali(current_date::text))) a;


*/
