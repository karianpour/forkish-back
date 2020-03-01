insert into pbl.book (id, code, name, fiscal_year_props, currency_props, currency_id) 
  values ('f473b9f0-8be3-4ee6-9c08-f5b8e8862559', '01', 'تست', '{"start": "13970101"}', null, 1);

insert into pbl.fiscal (id, book_id, code, name, period, locked_date, locked)
  values
    ('f473b9f0-8be3-4ee6-9c08-f5b8e8862551', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559',
      '1397', 'سال ۹۷', daterange(jalali.jalali2gregorian('1397-01-01')::date, jalali.jalali2gregorian('1398-01-01')::date), null, false
    ),
    ('f473b9f0-8be3-4ee6-9c08-f5b8e8862552', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559',
      '1398', 'سال ۹۸', daterange(jalali.jalali2gregorian('1398-01-01')::date, jalali.jalali2gregorian('1399-01-01')::date), null, false
    );

insert into pbl.oper (id, mobile_number, title, name, lastname, email, password)
  values ('937c662e-0f07-4a91-a407-bae9e98639f6', '09121161998', '', 'Kayvan', 'Arianpour', 'karianpour@gmail.com', '123456');

insert into pbl.oper (id, mobile_number, title, name, lastname, email, password)
  values ('937c662e-0f07-4a91-a407-bae9e98639f7', '09123028848', '', 'Matin', 'Firoozi', 'firoozimo@gmail.com', '123456');

insert into pbl.oper_book (id, oper_id, book_id, mobile_number, name, roles)
  values 
    ('f473b9f0-8be3-4ee6-9c08-f5b8e8862541', '937c662e-0f07-4a91-a407-bae9e98639f6', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', '09121161998', 'Kayvan', array['owner']::pbl.oper_role[]),
    ('f473b9f0-8be3-4ee6-9c08-f5b8e8862542', '937c662e-0f07-4a91-a407-bae9e98639f7', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', '09123028848', 'Matin', array['owner']::pbl.oper_role[]);


insert into bkg.acc_level (id, book_id, level, name, code_length, code_cumu)
  values 
    ('f473b9f0-8be3-4ee6-9c08-f5b8e8862550', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', 0, '', 0, 0),
    ('f473b9f0-8be3-4ee6-9c08-f5b8e8862551', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', 1, 'گروه', 1, 1),
    ('f473b9f0-8be3-4ee6-9c08-f5b8e8862552', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', 2, 'کل', 2, 3),
    ('f473b9f0-8be3-4ee6-9c08-f5b8e8862553', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', 3, 'معین', 2, 5);

insert into bkg.contact_cat (id, book_id, code, name, field_title)
  values
    ('f473b9f0-8be3-4ee6-9c08-f5b8e8862551', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', '01', 'تامین‌کنندگان', 'تامین‌کننده'),
    ('f473b9f0-8be3-4ee6-9c08-f5b8e8862552', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', '02', 'مشتریان', 'مشتری'),
    ('f473b9f0-8be3-4ee6-9c08-f5b8e8862553', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', '03', 'حسابهای‌بانکی', 'حساب‌بانکی'),
    ('f473b9f0-8be3-4ee6-9c08-f5b8e8862554', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', '04', 'کارمندان', 'کارمند'),
    ('f473b9f0-8be3-4ee6-9c08-f5b8e8862555', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', '05', 'سهامداران', 'سهامدار'),
    ('f473b9f0-8be3-4ee6-9c08-f5b8e8862556', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', '06', 'نهادهای‌دولتی', 'نهاد‌دولتی');


insert into bkg.aux_cat (id, book_id, code, name, field_title, for_article, for_contact)
  values 
    ('f473b9f0-8be3-4ee6-9c08-f5b8e8862551', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', '01', 'پروژه‌های', 'پروژه‌', true, false),
    ('f473b9f0-8be3-4ee6-9c08-f5b8e8862552', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', '02', 'مراکزهزینه', 'مرکزهزینه', true, false),
    ('f473b9f0-8be3-4ee6-9c08-f5b8e8862553', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', '03', 'قراردادها', 'قرارداد', true, false);
    
insert into bkg.acc (
    id, book_id, parent_id, 
    code, name, nature_type, acc_level_id, acc_cat, leaf
  )
  values 
    ('f473b9f0-8be3-4ee6-9c08-f5b8e8862550', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862550',
      '', 'حساب مادر', 'debit', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862550', 'balance_sheet', false),
    ('f473b9f0-8be3-4ee6-9c08-f5b8e8862551', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862550',
      '1', 'دارایی‌ها', 'debit', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862551', 'balance_sheet', false),
    ('f473b9f0-8be3-4ee6-9c08-f5b8e8862552', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862550',
      '2', 'بدهی‌ها', 'credit', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862551', 'balance_sheet', false),
    ('f473b9f0-8be3-4ee6-9c08-f5b8e8862553', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862550',
      '3', 'درآمد‌ها', 'credit', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862551', 'income_statement_operating', false),
    ('f473b9f0-8be3-4ee6-9c08-f5b8e8862554', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862550',
      '4', 'هزینه‌ها', 'debit', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862551', 'income_statement_operating', false),

    ('f473b9f0-8be3-4ee6-9c08-f5b8e8862561', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862551',
      '101', 'دارایی‌های جاری', 'debit', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862552', 'balance_sheet', false),
    ('f473b9f0-8be3-4ee6-9c08-f5b8e8862562', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862551',
      '102', 'بدهکاران تجاری', 'debit', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862552', 'balance_sheet', false),

    ('f473b9f0-8be3-4ee6-9c08-f5b8e8862571', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862552',
      '201', 'بدهی‌های جاری', 'debit', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862552', 'balance_sheet', false),
    ('f473b9f0-8be3-4ee6-9c08-f5b8e8862572', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862552',
      '202', 'بستانکاران تجاری', 'debit', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862552', 'balance_sheet', false),

    ('f473b9f0-8be3-4ee6-9c08-f5b8e8862581', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862553',
      '301', 'درآمد سایت', 'credit', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862552', 'income_statement_operating', false),
    ('f473b9f0-8be3-4ee6-9c08-f5b8e8862582', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862553',
      '302', 'سایر درآمدها', 'credit', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862552', 'income_statement_non_operating', false),

    ('f473b9f0-8be3-4ee6-9c08-f5b8e8862591', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862554',
      '401', 'هزینه سایت', 'debit', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862552', 'income_statement_operating', false),
    ('f473b9f0-8be3-4ee6-9c08-f5b8e8862592', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862554',
      '402', 'سایر هزینه‌ها', 'debit', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862552', 'income_statement_non_operating', false);

insert into bkg.acc (
    id, book_id, parent_id, 
    code, name, nature_type, acc_level_id, acc_cat, leaf,
    contact_cats, aux_cats
  )
  values 
    ('f473b9f0-8be3-4ee6-9c08-f5b8e8862661', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862561',
      '10101', 'حسابهای بانکی', 'debit', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862553', 'balance_sheet', true,
      '[{"contactCatId": "f473b9f0-8be3-4ee6-9c08-f5b8e8862553"}]'::jsonb, null
      ),
    ('f473b9f0-8be3-4ee6-9c08-f5b8e8862662', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862562',
      '10201', 'مشتریان سایت', 'debit', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862553', 'balance_sheet', true,
      '[{"contactCatId": "f473b9f0-8be3-4ee6-9c08-f5b8e8862552"}]'::jsonb, null
      ),

    ('f473b9f0-8be3-4ee6-9c08-f5b8e8862671', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862571',
      '20101', 'وامها', 'credit', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862553', 'balance_sheet', true,
      null, null
      ),
    ('f473b9f0-8be3-4ee6-9c08-f5b8e8862672', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862572',
      '20201', 'تامین کنندگان', 'credit', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862553', 'balance_sheet', true,
      '[{"contactCatId": "f473b9f0-8be3-4ee6-9c08-f5b8e8862551"}]'::jsonb, '[{"auxCatId": "f473b9f0-8be3-4ee6-9c08-f5b8e8862553", "seq": 0}]'::jsonb
      ),

    ('f473b9f0-8be3-4ee6-9c08-f5b8e8862681', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862581',
      '30101', 'درآمد دیوانو', 'credit', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862553', 'income_statement_operating', true,
      null, null
      ),
    ('f473b9f0-8be3-4ee6-9c08-f5b8e8862682', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862582',
      '30201', 'درآمد سودبانکی', 'credit', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862553', 'income_statement_non_operating', true,
      null, null
      ),

    ('f473b9f0-8be3-4ee6-9c08-f5b8e8862691', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862591',
      '40101', 'هزینه سرورها', 'debit', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862553', 'income_statement_operating', true,
      null, '[{"auxCatId": "f473b9f0-8be3-4ee6-9c08-f5b8e8862552", "seq": 0}]'::jsonb
      ),
    ('f473b9f0-8be3-4ee6-9c08-f5b8e8862692', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862592',
      '40201', 'هزینه کارمزد بانکی', 'debit', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862553', 'income_statement_non_operating', true,
      null, null
      );


insert into bkg.contact (id, book_id, code, name, contact_kind, contact_kind_props, contact_cats, mobile_number, has_access)
  values 
    ('f473b9f0-8be3-4ee6-9c08-f5b8e8862551', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', '0001', 'کیوان', 'general', '{}', '[{"contactCatId": "f473b9f0-8be3-4ee6-9c08-f5b8e8862551"}]'::jsonb, '09121161998', true),
    ('f473b9f0-8be3-4ee6-9c08-f5b8e8862552', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', '0002', 'متین', 'general', '{}', '[{"contactCatId": "f473b9f0-8be3-4ee6-9c08-f5b8e8862552"}]'::jsonb, '09123028848', true),
    ('f473b9f0-8be3-4ee6-9c08-f5b8e8862553', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', '0003', 'حساب بانک xx', 'general', '{}', '[{"contactCatId": "f473b9f0-8be3-4ee6-9c08-f5b8e8862553"}]'::jsonb, null, null),
    ('f473b9f0-8be3-4ee6-9c08-f5b8e8862554', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', '0004', 'کارمند خوب', 'general', '{}', '[{"contactCatId": "f473b9f0-8be3-4ee6-9c08-f5b8e8862554"}]'::jsonb, null, null);
    

insert into bkg.aux (id, book_id, aux_cat_id, parent_id, code, name, contact_id)
  values
    ('f473b9f0-8be3-4ee6-9c08-f5b8e8862551', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862552', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862551',
      '01', 'مرکزهزینه ۱', null
    ),
    ('f473b9f0-8be3-4ee6-9c08-f5b8e8862552', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862552', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862552',
      '02', 'مرکزهزینه ۲', null
    ),
    ('f473b9f0-8be3-4ee6-9c08-f5b8e8862553', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862553', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862553',
      'Q01', 'قرارداد کیوان ۱', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862551'
    ),
    ('f473b9f0-8be3-4ee6-9c08-f5b8e8862554', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862553', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862554',
      'Q02', 'قرارداد کیوان ۲', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862551'
    ),
    ('f473b9f0-8be3-4ee6-9c08-f5b8e8862555', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862553', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862555',
      'Q03', 'قرارداد متین ۳', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862552'
    );


INSERT INTO bkg.voucher VALUES ('3ce4cf04-eb2b-4b76-bb59-fca8704236d8', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862551', '2019-10-01', 1, NULL, 'بیا بریم مزار', '', 'normal', false, true);
INSERT INTO bkg.voucher VALUES ('99a5dc67-ae92-49ba-861d-3c12d5f56717', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862551', '2019-10-17', 2, NULL, '', '', 'normal', false, true);
INSERT INTO bkg.voucher VALUES ('f266cc41-21f6-4c48-9ee3-426a0a77bd2c', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862552', '2019-10-01', 1, NULL, 'تذذد', '', 'normal', false, true);
INSERT INTO bkg.voucher VALUES ('250884e2-3e35-40f4-9ffa-38627a8d619a', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862551', '2019-10-02', 4, NULL, '', '', 'normal', false, true);
INSERT INTO bkg.voucher VALUES ('7ff3c5ce-8df2-4265-ace8-bdbc08da49b9', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862551', '2019-09-26', 3, NULL, '', '', 'currency_correction', false, true);
INSERT INTO bkg.voucher VALUES ('c9acb558-9838-4094-97c7-32339363d357', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862551', '2019-10-14', 5, NULL, '', '', 'normal', false, true);
INSERT INTO bkg.voucher VALUES ('cfa6e37d-706d-4879-8650-2bddc9fc386b', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862551', '2019-10-20', 8, NULL, '', '', 'normal', false, true);
INSERT INTO bkg.voucher VALUES ('86af1c1a-073a-43bf-b1bb-fc49c4c87782', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862551', '2019-09-26', 6, NULL, 'ها', '', 'operation', false, false);
INSERT INTO bkg.voucher VALUES ('2135cbb3-943b-443a-b147-3fc929fdbdc8', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862552', '2019-10-29', 2, NULL, '', '', 'normal', false, false);
INSERT INTO bkg.voucher VALUES ('a866517b-c9aa-4e8d-a8dd-a4f1457b42aa', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862551', '2019-10-22', 10, NULL, '', '', 'closing', false, false);
INSERT INTO bkg.voucher VALUES ('3e16dee3-bdf0-4516-bba2-a2d82977a106', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862551', '2019-10-22', 9, NULL, '', '', 'normal', false, true);
INSERT INTO bkg.voucher VALUES ('74854fc0-dd05-422b-9301-bdd6114d1fdc', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862551', '2019-09-25', 7, NULL, '', '', 'normal', false, true);
INSERT INTO bkg.voucher VALUES ('ce3e2962-e93e-4001-a5bd-87920f2d12f8', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862551', '2019-10-29', 11, NULL, '', '', 'normal', false, false);


INSERT INTO bkg.article VALUES ('3c0109ca-b280-41ba-95fd-48d2617c87fc', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', '99a5dc67-ae92-49ba-861d-3c12d5f56717', 1, 'f473b9f0-8be3-4ee6-9c08-f5b8e8862551', NULL, NULL, NULL, 12000.0000, NULL, NULL, '', '', NULL, NULL, NULL);
INSERT INTO bkg.article VALUES ('c3b11b3e-80f3-4c01-9117-b78a151e1d87', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', '3ce4cf04-eb2b-4b76-bb59-fca8704236d8', 1, 'f473b9f0-8be3-4ee6-9c08-f5b8e8862551', NULL, NULL, NULL, -840000.0000, NULL, NULL, '', 'نداریم', NULL, NULL, NULL);
INSERT INTO bkg.article VALUES ('c7fac015-5a04-4cd5-8f08-bc586ce977c9', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', '99a5dc67-ae92-49ba-861d-3c12d5f56717', 2, 'f473b9f0-8be3-4ee6-9c08-f5b8e8862662', NULL, 'f473b9f0-8be3-4ee6-9c08-f5b8e8862552', NULL, -12000.0000, NULL, NULL, '', '', NULL, NULL, NULL);
INSERT INTO bkg.article VALUES ('ed4c59bf-0084-48a0-9e69-e6d12f008ba4', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', '250884e2-3e35-40f4-9ffa-38627a8d619a', 1, 'f473b9f0-8be3-4ee6-9c08-f5b8e8862691', NULL, NULL, '{f473b9f0-8be3-4ee6-9c08-f5b8e8862552}', 80000.0000, NULL, NULL, '', '', NULL, NULL, NULL);
INSERT INTO bkg.article VALUES ('da5fa691-d6f1-466b-9f19-1674cac5637f', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', '250884e2-3e35-40f4-9ffa-38627a8d619a', 2, 'f473b9f0-8be3-4ee6-9c08-f5b8e8862671', NULL, NULL, NULL, -80000.0000, NULL, NULL, '', '', NULL, NULL, NULL);
INSERT INTO bkg.article VALUES ('2757ac00-96c1-4552-8310-251dc3f9b6b3', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', '7ff3c5ce-8df2-4265-ace8-bdbc08da49b9', 1, 'f473b9f0-8be3-4ee6-9c08-f5b8e8862661', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862553', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862553', NULL, 5000000.0000, NULL, NULL, '', '', NULL, NULL, NULL);
INSERT INTO bkg.article VALUES ('b8daf288-66a6-401e-9281-ca3b8f931a2e', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', '7ff3c5ce-8df2-4265-ace8-bdbc08da49b9', 11, 'f473b9f0-8be3-4ee6-9c08-f5b8e8862682', NULL, NULL, NULL, -5000000.0000, NULL, NULL, '', '', NULL, NULL, NULL);
INSERT INTO bkg.article VALUES ('7187c558-440c-401d-8057-8f868b3073b6', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', 'c9acb558-9838-4094-97c7-32339363d357', 1, 'f473b9f0-8be3-4ee6-9c08-f5b8e8862671', NULL, NULL, NULL, 1000.0000, NULL, NULL, '', '', NULL, NULL, NULL);
INSERT INTO bkg.article VALUES ('d92a2dd2-e54a-4eb0-99eb-29164fd32bf7', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', 'c9acb558-9838-4094-97c7-32339363d357', 2, 'f473b9f0-8be3-4ee6-9c08-f5b8e8862681', NULL, NULL, NULL, -1000.0000, NULL, NULL, '', '', NULL, NULL, NULL);
INSERT INTO bkg.article VALUES ('513b2a4a-fa03-4093-abd4-478c3f825c5d', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', '86af1c1a-073a-43bf-b1bb-fc49c4c87782', 1, 'f473b9f0-8be3-4ee6-9c08-f5b8e8862681', NULL, NULL, NULL, 660000.0000, NULL, NULL, '', '', NULL, NULL, NULL);
INSERT INTO bkg.article VALUES ('23aa6cfa-8ca9-4bbd-8fb4-ab44302dc2a3', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', '86af1c1a-073a-43bf-b1bb-fc49c4c87782', 2, 'f473b9f0-8be3-4ee6-9c08-f5b8e8862671', NULL, NULL, NULL, -660000.0000, NULL, NULL, '', '', NULL, NULL, NULL);
INSERT INTO bkg.article VALUES ('2d1bc54e-8909-4636-a8b8-99ccf020a3c2', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', 'cfa6e37d-706d-4879-8650-2bddc9fc386b', 1, 'f473b9f0-8be3-4ee6-9c08-f5b8e8862691', NULL, NULL, '{f473b9f0-8be3-4ee6-9c08-f5b8e8862551}', 2000000.0000, NULL, NULL, '', '', NULL, NULL, NULL);
INSERT INTO bkg.article VALUES ('e2b2418f-27bf-4cf8-946d-735333b07690', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', 'cfa6e37d-706d-4879-8650-2bddc9fc386b', 2, 'f473b9f0-8be3-4ee6-9c08-f5b8e8862692', NULL, NULL, NULL, 2000000.0000, NULL, NULL, '', '', NULL, NULL, NULL);
INSERT INTO bkg.article VALUES ('5953ac66-9aa0-4281-b5b7-e1318574bdce', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', '3e16dee3-bdf0-4516-bba2-a2d82977a106', 1, 'f473b9f0-8be3-4ee6-9c08-f5b8e8862681', NULL, NULL, NULL, 12000.0000, NULL, NULL, '', '', NULL, NULL, NULL);
INSERT INTO bkg.article VALUES ('a91e74b0-9dc9-48af-9ecf-54c822f9bb9b', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', '2135cbb3-943b-443a-b147-3fc929fdbdc8', 1, 'f473b9f0-8be3-4ee6-9c08-f5b8e8862671', NULL, NULL, NULL, -1000.0000, NULL, NULL, '', '', NULL, NULL, NULL);
INSERT INTO bkg.article VALUES ('35ea8523-268a-4412-ab89-e2283f9e75f5', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', '2135cbb3-943b-443a-b147-3fc929fdbdc8', 2, 'f473b9f0-8be3-4ee6-9c08-f5b8e8862681', NULL, NULL, NULL, 4.0000, NULL, NULL, '', '', NULL, NULL, NULL);
INSERT INTO bkg.article VALUES ('75f81ea9-0463-4555-bebe-6a5717688d1c', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', '74854fc0-dd05-422b-9301-bdd6114d1fdc', 2, 'f473b9f0-8be3-4ee6-9c08-f5b8e8862682', NULL, NULL, NULL, -48000.0000, NULL, NULL, '', '', NULL, NULL, NULL);
INSERT INTO bkg.article VALUES ('a9966b78-0e5a-4536-b804-bcb41d28e4cb', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', 'a866517b-c9aa-4e8d-a8dd-a4f1457b42aa', 1, 'f473b9f0-8be3-4ee6-9c08-f5b8e8862691', NULL, NULL, '{f473b9f0-8be3-4ee6-9c08-f5b8e8862551}', 23000.0000, NULL, NULL, '', 'تتاللل', NULL, NULL, NULL);
INSERT INTO bkg.article VALUES ('48d46f9c-4405-4f86-9151-a0703a64045c', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', 'a866517b-c9aa-4e8d-a8dd-a4f1457b42aa', 2, 'f473b9f0-8be3-4ee6-9c08-f5b8e8862691', NULL, NULL, '{f473b9f0-8be3-4ee6-9c08-f5b8e8862552}', 63222.0000, NULL, NULL, '', '', NULL, NULL, NULL);
INSERT INTO bkg.article VALUES ('7d2b15a6-9bb5-43b9-8a11-076139779c4a', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', '3e16dee3-bdf0-4516-bba2-a2d82977a106', 11, 'f473b9f0-8be3-4ee6-9c08-f5b8e8862671', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862554', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862554', NULL, 5585.0000, NULL, NULL, '', '', NULL, NULL, NULL);
INSERT INTO bkg.article VALUES ('86f46a31-9927-48d1-b5f5-d5db82d388ab', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862559', '74854fc0-dd05-422b-9301-bdd6114d1fdc', 1, 'f473b9f0-8be3-4ee6-9c08-f5b8e8862671', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862554', 'f473b9f0-8be3-4ee6-9c08-f5b8e8862554', NULL, 25000.0000, NULL, NULL, '', '', NULL, NULL, NULL);
