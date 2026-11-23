-- Cargo Query seed. Deterministic: every random block starts with its own setseed(),
-- so adding tables later never re-rolls existing ones. Append new blocks at the END.
-- Game "today" = 2026-10-31. Ticket solutions use literal dates, never CURRENT_DATE/now().
-- Story hooks (tickets and tests depend on them):
--   * customers 171-190 stop booking from 2026-03-01 (churn, Ch3)
--   * customers 191-200 duplicate customers 1-10 with English-style names (trap, Ch4+)
--   * ~2% of AIR shipments carry incoterm FOB (trap: FOB is sea-only, Ch6)
--   * chapters 4-6 (Plan 2): listed at the head of the Plan 2 block near the end of this file
--   * chapters 7-9 (Plan 3), incl. the Europe lane (NLRTM/DEHAM/BEANR) margin drop in Q3 2026: head of the Plan 3 block at the end
--   * chapters 10-12 (Plan 4): customer 1 D&D spike, carrier 3 (Blue Anchor Lines) high claim rate, container_events for the chapter 11 index lab: head of the Plan 4 block at the end

-- ports.region = the continent of the port (one level for every row, L302): Asia, Europe, North America, Oceania. Vietnam's own ports are Asia too: tell them apart by country.
INSERT INTO ports VALUES
  ('VNSGN', 'Ho Chi Minh (Cat Lai)', 'Vietnam', 'Asia', 'SEAPORT', 0),
  ('VNHPH', 'Hai Phong', 'Vietnam', 'Asia', 'SEAPORT', 0),
  ('VNDAD', 'Da Nang', 'Vietnam', 'Asia', 'SEAPORT', 0),
  ('CNSHA', 'Shanghai', 'China', 'Asia', 'SEAPORT', 5),
  ('CNNGB', 'Ningbo', 'China', 'Asia', 'SEAPORT', 5),
  ('SGSIN', 'Singapore', 'Singapore', 'Asia', 'SEAPORT', 3),
  ('KRPUS', 'Busan', 'South Korea', 'Asia', 'SEAPORT', 6),
  ('JPTYO', 'Tokyo', 'Japan', 'Asia', 'SEAPORT', 8),
  ('THLCH', 'Laem Chabang', 'Thailand', 'Asia', 'SEAPORT', 3),
  ('INNSA', 'Nhava Sheva', 'India', 'Asia', 'SEAPORT', 14),
  ('NLRTM', 'Rotterdam', 'Netherlands', 'Europe', 'SEAPORT', 30),
  ('DEHAM', 'Hamburg', 'Germany', 'Europe', 'SEAPORT', 32),
  ('BEANR', 'Antwerp', 'Belgium', 'Europe', 'SEAPORT', 31),
  ('USLAX', 'Los Angeles', 'United States', 'North America', 'SEAPORT', 20),
  ('USNYC', 'New York', 'United States', 'North America', 'SEAPORT', 35),
  ('AUSYD', 'Sydney', 'Australia', 'Oceania', 'SEAPORT', 16),
  ('SGN', 'Tan Son Nhat Airport', 'Vietnam', 'Asia', 'AIRPORT', 0),
  ('HAN', 'Noi Bai Airport', 'Vietnam', 'Asia', 'AIRPORT', 0),
  ('PVG', 'Shanghai Pudong Airport', 'China', 'Asia', 'AIRPORT', 1),
  ('ICN', 'Incheon Airport', 'South Korea', 'Asia', 'AIRPORT', 1),
  ('NRT', 'Narita Airport', 'Japan', 'Asia', 'AIRPORT', 1),
  ('FRA', 'Frankfurt Airport', 'Germany', 'Europe', 'AIRPORT', 2),
  ('LAX', 'Los Angeles Airport', 'United States', 'North America', 'AIRPORT', 2),
  ('SYD', 'Sydney Airport', 'Australia', 'Oceania', 'AIRPORT', 2);

INSERT INTO carriers VALUES
  (1, 'Oceanic Star Line', 'OSL', 'SEA'),
  (2, 'Pacific Bridge Shipping', 'PBS', 'SEA'),
  (3, 'Blue Anchor Lines', 'BAL', 'SEA'),
  (4, 'Golden Lotus Container', 'GLC', 'SEA'),
  (5, 'Northwind Maritime', 'NWM', 'SEA'),
  (6, 'Meridian Express Line', 'MEL', 'SEA'),
  (7, 'SkyBridge Cargo', 'SBC', 'AIR'),
  (8, 'Lotus Air Freight', 'LAF', 'AIR'),
  (9, 'Eastwing Cargo', 'EWC', 'AIR');

INSERT INTO employees (id, full_name, dept, title, manager_id, hired_at)
SELECT i,
  (ARRAY['Nguyễn','Trần','Lê','Phạm','Hoàng','Huỳnh','Võ','Đặng','Bùi','Đỗ'])[1 + i % 10] || ' ' ||
  (ARRAY['An','Bình','Châu','Dũng','Duyên','Giang','Hà','Hải','Hạnh','Hiếu','Hoa','Hùng','Hương','Khánh','Khoa','Lan','Linh','Long','Mai','Minh',
         'My','Nam','Ngân','Ngọc','Nhung','Phong','Phúc','Phương','Quân','Quang','Quỳnh','Sơn','Tâm','Thảo','Thắng','Thu','Trang','Trung','Tuấn','Vy'])[i],
  CASE WHEN i = 1 THEN 'Management' WHEN i <= 13 THEN 'Sales' WHEN i <= 23 THEN 'Ops'
       WHEN i <= 29 THEN 'Customs' WHEN i <= 35 THEN 'Finance' ELSE 'CS' END,
  CASE WHEN i = 1 THEN 'Director' WHEN i IN (2, 14, 24, 30, 36) THEN 'Manager' ELSE 'Staff' END,
  CASE WHEN i = 1 THEN NULL WHEN i IN (2, 14, 24, 30, 36) THEN 1 WHEN i <= 13 THEN 2
       WHEN i <= 23 THEN 14 WHEN i <= 29 THEN 24 WHEN i <= 35 THEN 30 ELSE 36 END,
  DATE '2018-01-01' + (i * 97) % 2400
FROM generate_series(1, 40) i;

SELECT setseed(0.101);
INSERT INTO customers (id, name, industry, city, country, sales_rep_id, created_at)
SELECT i,
  (ARRAY['Công ty TNHH','Công ty CP','Công ty TNHH MTV'])[1 + floor(random() * 3)::int] || ' ' ||
  (ARRAY['Thành Công','Phú Thịnh','Hưng Phát','Đại Việt','Sao Mai','Hoàng Long','Tân Tiến','Minh Phát','An Khang','Bảo Ngọc',
         'Việt Hưng','Đông Á','Nam Phong','Kim Sơn','Thiên Phúc','Trường An','Hải Âu','Phương Đông','Toàn Cầu','Lạc Hồng'])[1 + (i - 1) % 20] || ' ' ||
  (ARRAY['Textile','Seafood','Furniture','Coffee','Electronics','Footwear','Rice','Cashew','Steel','Plastics'])[1 + ((i - 1) / 20) % 10],
  (ARRAY['Textile','Seafood','Furniture','Coffee','Electronics','Footwear','Rice','Cashew','Steel','Plastics'])[1 + ((i - 1) / 20) % 10],
  (ARRAY['Ho Chi Minh','Ho Chi Minh','Binh Duong','Dong Nai','Ha Noi','Hai Phong','Da Nang','Can Tho'])[1 + floor(random() * 8)::int],
  'Vietnam',
  2 + i % 12,
  DATE '2019-01-01' + floor(random() * 2100)::int
FROM generate_series(1, 190) i;

-- Duplicates of customers 1-10: same company, English-style name, created later.
INSERT INTO customers (id, name, industry, city, country, sales_rep_id, created_at)
SELECT 190 + id,
  regexp_replace(name, '^Công ty (TNHH MTV|TNHH|CP) ', '') || ' Co., Ltd',
  industry, city, country, sales_rep_id, DATE '2025-06-01' + id
FROM customers WHERE id <= 10;

SELECT setseed(0.202);
WITH base AS (
  SELECT g AS id,
    DATE '2024-11-01' + floor(random() * 730)::int AS booking_date,
    random() AS r_cust, random() AS r_dup, random() AS r_dir, random() AS r_mode, random() AS r_load,
    random() AS r_vn, random() AS r_far, random() AS r_carrier, random() AS r_inc, random() AS r_lead,
    random() AS r_transit, random() AS r_dep, random() AS r_arr, random() AS r_cancel, random() AS r_deliv,
    random() AS r_w, random() AS r_v
  FROM generate_series(1, 20000) g
), c AS (
  SELECT b.*,
    CASE WHEN b.r_dup < 0.01 AND b.booking_date >= DATE '2025-07-01' THEN 191 + floor(b.r_dup * 1000)::int % 10
         ELSE 1 + floor(190 * power(b.r_cust, 2.2))::int END AS cid0,
    CASE WHEN b.r_dir < 0.6 THEN 'EXPORT' ELSE 'IMPORT' END AS direction,
    CASE WHEN b.r_mode < 0.85 THEN 'SEA' ELSE 'AIR' END AS mode
  FROM base b
), d AS (
  SELECT c.*,
    CASE WHEN cid0 BETWEEN 171 AND 190 AND booking_date >= DATE '2026-03-01' THEN 1 + cid0 % 50 ELSE cid0 END AS customer_id,
    CASE WHEN mode = 'SEA' THEN (ARRAY['VNSGN','VNSGN','VNHPH','VNDAD'])[1 + floor(r_vn * 4)::int]
         ELSE (ARRAY['SGN','SGN','HAN'])[1 + floor(r_vn * 3)::int] END AS vn_port,
    CASE WHEN mode = 'SEA' THEN (ARRAY['CNSHA','CNNGB','SGSIN','KRPUS','JPTYO','THLCH','INNSA','NLRTM',
                                       'DEHAM','BEANR','USLAX','USNYC','AUSYD','CNSHA','NLRTM','USLAX'])[1 + floor(r_far * 16)::int]
         ELSE (ARRAY['PVG','ICN','NRT','FRA','LAX','SYD'])[1 + floor(r_far * 6)::int] END AS far_port,
    CASE WHEN mode = 'SEA' THEN 1 + floor(r_carrier * 6)::int ELSE 7 + floor(r_carrier * 3)::int END AS carrier_id,
    CASE WHEN mode = 'AIR' THEN NULL WHEN r_load < 0.7 THEN 'FCL' ELSE 'LCL' END AS load_type,
    CASE WHEN mode = 'SEA' THEN (ARRAY['FOB','FOB','CIF','CFR','EXW','FCA','DAP'])[1 + floor(r_inc * 7)::int]
         WHEN r_inc < 0.02 THEN 'FOB'
         ELSE (ARRAY['FCA','CPT','CIP','EXW','DAP'])[1 + floor(r_inc * 5)::int] END AS incoterm
  FROM c
), e AS (
  SELECT d.*, p.base_transit_days, d.booking_date + 3 + floor(d.r_lead * 8)::int AS etd
  FROM d JOIN ports p ON p.code = d.far_port
), f AS (
  SELECT e.*,
    etd + base_transit_days + floor(r_transit * 3)::int AS eta,
    etd + CASE WHEN r_dep < 0.8 THEN 0 WHEN r_dep < 0.95 THEN 1 ELSE 2 + floor((r_dep - 0.95) * 60)::int END AS atd0
  FROM e
), g AS (
  SELECT f.*,
    eta + (atd0 - etd) + CASE WHEN r_arr < 0.6 THEN 0 WHEN r_arr < 0.8 THEN -1
                              WHEN r_arr < 0.93 THEN 1 + floor((r_arr - 0.8) * 20)::int
                              ELSE 4 + floor((r_arr - 0.93) * 100)::int END AS ata0
  FROM f
)
INSERT INTO shipments (id, ref, customer_id, direction, mode, load_type, pol, pod, carrier_id, incoterm,
                       sales_rep_id, booking_date, etd, eta, atd, ata, status, gross_weight_kg, volume_cbm)
SELECT g.id,
  'CQ' || to_char(g.booking_date, 'YYMM') || lpad(g.id::text, 5, '0'),
  g.customer_id, g.direction, g.mode, g.load_type,
  CASE WHEN g.direction = 'EXPORT' THEN g.vn_port ELSE g.far_port END,
  CASE WHEN g.direction = 'EXPORT' THEN g.far_port ELSE g.vn_port END,
  g.carrier_id, g.incoterm, cu.sales_rep_id, g.booking_date, g.etd, g.eta,
  CASE WHEN g.r_cancel < 0.03 OR g.atd0 > DATE '2026-10-31' THEN NULL ELSE g.atd0 END,
  CASE WHEN g.r_cancel < 0.03 OR g.ata0 > DATE '2026-10-31' THEN NULL ELSE g.ata0 END,
  CASE WHEN g.r_cancel < 0.03 THEN 'CANCELLED'
       WHEN g.atd0 > DATE '2026-10-31' THEN 'BOOKED'
       WHEN g.ata0 > DATE '2026-10-31' THEN 'IN_TRANSIT'
       WHEN g.ata0 + 3 + floor(g.r_deliv * 5)::int > DATE '2026-10-31' THEN 'ARRIVED'
       ELSE 'DELIVERED' END,
  round((CASE WHEN g.mode = 'AIR' THEN 20 + g.r_w * 1980
              WHEN g.load_type = 'LCL' THEN 100 + g.r_w * 4900
              ELSE 2000 + g.r_w * 48000 END)::numeric, 2),
  round((CASE WHEN g.mode = 'AIR' THEN 0.1 + g.r_v * 12
              WHEN g.load_type = 'LCL' THEN 0.5 + g.r_v * 14.5
              ELSE 20 + g.r_v * 180 END)::numeric, 2)
FROM g JOIN customers cu ON cu.id = g.customer_id
ORDER BY g.id;

SELECT setseed(0.303);
WITH fcl AS (
  SELECT s.id AS shipment_id, s.gross_weight_kg,
    1 + floor(power(random(), 1.5) * 4)::int AS n, random() AS r_type
  FROM shipments s WHERE s.load_type = 'FCL'
), boxes AS (
  SELECT f.shipment_id, k,
    (ARRAY['20GP','40GP','40HC','40HC','40RF'])[1 + floor(f.r_type * 5)::int] AS container_type,
    round(f.gross_weight_kg / f.n, 2) AS w
  FROM fcl f CROSS JOIN LATERAL generate_series(1, f.n) k
)
INSERT INTO containers (id, container_no, shipment_id, container_type, teu, gross_weight_kg)
SELECT row_number() OVER (ORDER BY shipment_id, k),
  'CQLU' || lpad((row_number() OVER (ORDER BY shipment_id, k))::text, 7, '0'),
  shipment_id, container_type,
  CASE WHEN container_type = '20GP' THEN 1 ELSE 2 END,
  w
FROM boxes;

-- ===== Plan 2 (chapters 4-6). Story hooks (tickets and tests/seed.test.ts depend on them):
--   * shipment_events (milestone log) starts 2026-07-01, when the tracking system went live
--   * sea imports that ARRIVED (not delivered): about half have no trucking order yet (ch4-03)
--   * cancelled shipments have no ATA either: "overdue" = ETA passed, ATA empty, not cancelled (ch4-04, ch4-06)
--   * CFS receipts (LCL export cargo before ETD, LCL import cargo after ATA) on every day 2026-10-26..31 (ch4-05); cargo descriptions typed in mixed case (ch6-02)
--   * HS codes 851712, 100640, 392690 have no duty rate (ch5-03); declarations exist from 2026-06-01
--   * ~5% of export declarations were cancelled and filed again, some twice (ch5-04, ch5-06)
--   * red-lane imports filed in October: about half still not cleared (ch5-05)

SELECT setseed(0.404);
WITH d AS (
  SELECT s.id, s.status, s.atd, s.ata, 3 + floor(random() * 5)::int AS lag FROM shipments s
), ev AS (
  SELECT id AS shipment_id, 1 AS k, 'DEPARTED' AS event, atd AS event_date FROM d WHERE atd IS NOT NULL
  UNION ALL SELECT id, 2, 'ARRIVED', ata FROM d WHERE ata IS NOT NULL
  UNION ALL SELECT id, 3, 'DELIVERED', LEAST(ata + lag, DATE '2026-10-31') FROM d WHERE status = 'DELIVERED'
)
INSERT INTO shipment_events (id, shipment_id, event, event_date)
SELECT row_number() OVER (ORDER BY shipment_id, k), shipment_id, event, event_date FROM ev
WHERE event_date >= DATE '2026-07-01';

SELECT setseed(0.505);
WITH d AS (
  SELECT s.id, s.status, s.ata, random() AS r_skip, floor(random() * 2)::int AS wait
  FROM shipments s
  WHERE s.direction = 'IMPORT' AND s.mode = 'SEA' AND s.status IN ('ARRIVED', 'DELIVERED')
)
INSERT INTO trucking_orders (id, shipment_id, order_date)
SELECT row_number() OVER (ORDER BY id), id, LEAST(ata + wait, DATE '2026-10-31')
FROM d WHERE NOT (status = 'ARRIVED' AND r_skip < 0.5)
ORDER BY id;

SELECT setseed(0.606);
WITH d AS (
  SELECT s.id, s.direction, s.etd, s.ata, s.volume_cbm, c.industry,
    random() AS r_day, random() AS r_pk, random() AS r_cbm, random() AS r_desc, random() AS r_case
  FROM shipments s JOIN customers c ON c.id = s.customer_id
  WHERE s.load_type = 'LCL' AND s.status <> 'CANCELLED' AND (s.direction = 'EXPORT' OR s.ata IS NOT NULL)
), e AS (
  SELECT d.*,
    CASE WHEN d.direction = 'EXPORT' THEN d.etd - 1 - floor(d.r_day * 3)::int ELSE d.ata + 1 + floor(d.r_day * 2)::int END AS received_date,
    (CASE d.industry
      WHEN 'Textile' THEN ARRAY['Cotton T-shirts', 'Polyester jackets', 'Denim trousers']
      WHEN 'Seafood' THEN ARRAY['Frozen shrimp', 'Frozen pangasius fillet', 'Dried squid']
      WHEN 'Furniture' THEN ARRAY['Wooden chairs', 'Wooden dining tables', 'Rattan sofas']
      WHEN 'Coffee' THEN ARRAY['Robusta coffee beans', 'Roasted coffee', 'Instant coffee']
      WHEN 'Electronics' THEN ARRAY['Mobile phone parts', 'Laptop chargers', 'LED panels']
      WHEN 'Footwear' THEN ARRAY['Leather shoes', 'Sports shoes', 'Rubber sandals']
      WHEN 'Rice' THEN ARRAY['Jasmine rice', 'Broken white rice', 'Glutinous rice']
      WHEN 'Cashew' THEN ARRAY['Cashew kernels W320', 'Roasted cashew', 'Cashew kernels W240']
      WHEN 'Steel' THEN ARRAY['Galvanized steel coils', 'Steel pipes', 'Steel wire']
      ELSE ARRAY['Plastic bags', 'PET bottles', 'Plastic household goods'] END)[1 + floor(d.r_desc * 3)::int] AS base
  FROM d
)
INSERT INTO cfs_receipts (id, shipment_id, received_date, packages, volume_cbm, cargo_desc)
SELECT row_number() OVER (ORDER BY id), id, received_date, 1 + floor(r_pk * 120)::int,
  round((volume_cbm * (0.95 + r_cbm * 0.1))::numeric, 2),
  CASE WHEN r_case < 0.4 THEN base WHEN r_case < 0.7 THEN upper(base) ELSE lower(base) END
FROM e WHERE received_date <= DATE '2026-10-31'
ORDER BY id;

INSERT INTO hs_codes VALUES
  ('610910', 'Cotton T-shirts'), ('620342', 'Cotton trousers'),
  ('030617', 'Frozen shrimps and prawns'), ('030462', 'Frozen catfish fillets'),
  ('940360', 'Wooden furniture'), ('940161', 'Upholstered wooden seats'),
  ('090111', 'Coffee, not roasted'), ('090121', 'Coffee, roasted'),
  ('851712', 'Mobile phones'), ('847130', 'Portable computers'),
  ('640399', 'Leather footwear'), ('640411', 'Sports footwear'),
  ('100630', 'Milled rice'), ('100640', 'Broken rice'),
  ('080132', 'Cashew nuts, shelled'), ('080131', 'Cashew nuts, in shell'),
  ('721049', 'Galvanized flat steel'), ('730890', 'Steel structures'),
  ('392321', 'Plastic bags'), ('392690', 'Other plastic articles');

INSERT INTO duties_taxes VALUES
  ('610910', 20, 10), ('620342', 20, 10), ('030617', 15, 8), ('030462', 18, 8),
  ('940360', 25, 10), ('940161', 25, 10), ('090111', 15, 8), ('090121', 20, 10),
  ('847130', 0, 10), ('640399', 30, 10), ('640411', 30, 10), ('100630', 40, 8),
  ('080132', 25, 8), ('080131', 5, 8), ('721049', 10, 10), ('730890', 15, 10), ('392321', 15, 10);

SELECT setseed(0.707);
WITH hs (industry, code1, code2) AS (VALUES
  ('Textile', '610910', '620342'), ('Seafood', '030617', '030462'), ('Furniture', '940360', '940161'),
  ('Coffee', '090111', '090121'), ('Electronics', '851712', '847130'), ('Footwear', '640399', '640411'),
  ('Rice', '100630', '100640'), ('Cashew', '080132', '080131'), ('Steel', '721049', '730890'),
  ('Plastics', '392321', '392690')
), d AS (
  SELECT s.id AS shipment_id, s.direction, hs.code1, hs.code2,
    CASE WHEN s.direction = 'EXPORT' THEN s.etd - 1 - floor(random() * 2)::int ELSE s.ata + floor(random() * 2)::int END AS submitted,
    random() AS r_hs, random() AS r_value, random() AS r_amend, random() AS r_stuck,
    random() AS r_lane0, random() AS r_days0, random() AS r_lane1, random() AS r_days1, random() AS r_lane2, random() AS r_days2
  FROM shipments s JOIN customers c ON c.id = s.customer_id JOIN hs ON hs.industry = c.industry
  WHERE s.status <> 'CANCELLED' AND (s.direction = 'EXPORT' OR s.ata IS NOT NULL)
), o AS (
  SELECT d.*,
    row_number() OVER (ORDER BY shipment_id) AS rn,
    count(*) OVER () AS n,
    d.direction = 'EXPORT' AND d.r_amend < 0.05 AND d.submitted <= DATE '2026-10-29' AS amend1,
    d.direction = 'EXPORT' AND d.r_amend < 0.015 AND d.submitted <= DATE '2026-10-29' AS amend2
  FROM d WHERE d.submitted BETWEEN DATE '2026-06-01' AND DATE '2026-10-31'
), r AS (
  SELECT o.*,
    sum(amend1::int) OVER (ORDER BY rn) AS k1, sum(amend1::int) OVER () AS n1,
    sum(amend2::int) OVER (ORDER BY rn) AS k2
  FROM o
), v (shipment_id, direction, id, from_id, hs_code, submitted, r_lane, r_days, replaced, stuck, value) AS (
  SELECT shipment_id, direction, rn, NULL::bigint, CASE WHEN r_hs < 0.5 THEN code1 ELSE code2 END, submitted,
    r_lane0, r_days0, amend1, direction = 'IMPORT' AND r_stuck < 0.5 AND submitted >= DATE '2026-10-01', r_value FROM r
  UNION ALL
  SELECT shipment_id, direction, n + k1, rn, CASE WHEN r_hs < 0.5 THEN code2 ELSE code1 END, submitted + 1,
    r_lane1, r_days1, amend2, false, r_value FROM r WHERE amend1
  UNION ALL
  SELECT shipment_id, direction, n + n1 + k2, n + k1, CASE WHEN r_hs < 0.5 THEN code1 ELSE code2 END, submitted + 2,
    r_lane2, r_days2, false, false, r_value FROM r WHERE amend2
), w AS (
  SELECT v.*, CASE WHEN r_lane < 0.6 THEN 'GREEN' WHEN r_lane < 0.9 THEN 'YELLOW' ELSE 'RED' END AS lane FROM v
), x AS (
  SELECT w.*, submitted + CASE lane WHEN 'GREEN' THEN floor(r_days * 2)::int WHEN 'YELLOW' THEN 1 + floor(r_days * 3)::int
                                    ELSE 2 + floor(r_days * 5)::int END AS cleared
  FROM w
)
INSERT INTO customs_declarations (id, decl_no, shipment_id, hs_code, lane, submitted_date, cleared_date, declared_value_usd, amended_from_id)
SELECT id, CASE WHEN direction = 'IMPORT' THEN '10' ELSE '30' END || lpad(id::text, 10, '0'), shipment_id, hs_code, lane, submitted,
  CASE WHEN replaced OR (stuck AND lane = 'RED') OR cleared > DATE '2026-10-31' THEN NULL ELSE cleared END,
  round((1000 + value * 99000)::numeric, 2), from_id
FROM x ORDER BY id;

INSERT INTO incoterms VALUES
  ('EXW', 'Ex Works', false), ('FCA', 'Free Carrier', false), ('CPT', 'Carriage Paid To', false),
  ('CIP', 'Carriage and Insurance Paid To', false), ('DAP', 'Delivered at Place', false),
  ('DPU', 'Delivered at Place Unloaded', false), ('DDP', 'Delivered Duty Paid', false),
  ('FAS', 'Free Alongside Ship', true), ('FOB', 'Free on Board', true),
  ('CFR', 'Cost and Freight', true), ('CIF', 'Cost, Insurance and Freight', true);

-- ===== Plan 3 (chapters 7-9). Story hooks (tickets and tests/seed.test.ts depend on them):
--   * exchange_rates (VND per USD/EUR) only on working days 2026-03-02..2026-10-30: no weekends, no public holidays (ch8-04)
--   * rate_contracts: one buy rate per lane (VN port -> overseas sea port), container type and day from 2026-04-01 to 2026-12-31, no gaps or overlaps;
--     Europe lanes (NLRTM/DEHAM/BEANR) +40% from 2026-07-15 (general rate increase) and stay high in Q4 (ch7-04, ch12)
--   * quotations from 2026-04-01: one per FCL sea export booked from 2026-04-06 (shipment_id set) plus 900 that never
--     became a booking (shipment_id NULL, a quarter of them for the churned customers 171-190) (ch7-02, ch7-03)
--   * quotes keep pricing Europe from the pre-increase rate, so many Europe quotes from 2026-07-15 sell below the buy rate;
--     about 1.5% of all other quotes are discounted below cost (ch7-04, ch7-06, ch12 margin story)
--   * invoices (VND) for shipments booked from 2026-04-01 once they sail (exports) or arrive (imports); ~3% of DELIVERED
--     shipments were never invoiced (ch9-02, ch9-06); due 30 days after issue
--   * payments: 5% of invoices never paid, 20% paid in two instalments, so overdue debt reaches every aging bucket (ch8-01..03)
--   * vendor_bills in USD (and EUR for Europe lanes), dated any day of the week; cancelled shipments still carry a bill (ch8-04, ch8-05)
--   * master_bills group sea exports sailing from 2026-05-01 by carrier, ports and sailing day; ~4% weigh more than 1% off their house bills (ch9-03)
--   * the Q3 2026 margin story (ch12): Europe lanes lose about 12 margin points from Q2 to Q3, other regions stay flat
--   * house_bills: ~8% issued 3-7 days after sailing, the rest within 2 days; none issued after 2026-10-31 (ch9-04, ch9-05)

-- The planner has no statistics for freshly seeded tables and picks nested loops (10+ s); one ANALYZE keeps this block fast.
ANALYZE shipments, containers;

SELECT setseed(0.808);
WITH d AS (
  SELECT g::date AS rate_date, random() AS r_usd, random() AS r_eur
  FROM generate_series(DATE '2026-03-02', DATE '2026-10-30', INTERVAL '1 day') g
  WHERE extract(isodow FROM g) < 6
    AND g::date NOT IN (DATE '2026-04-27', DATE '2026-04-30', DATE '2026-05-01', DATE '2026-09-01', DATE '2026-09-02')
  ORDER BY 1
), w AS (
  SELECT rate_date, 26150 + 25 * sum(r_usd - 0.47) OVER (ORDER BY rate_date) AS usd,
                    30200 + 60 * sum(r_eur - 0.48) OVER (ORDER BY rate_date) AS eur
  FROM d
)
INSERT INTO exchange_rates (currency, rate_date, vnd_per_unit)
SELECT 'USD', rate_date, round(usd) FROM w
UNION ALL SELECT 'EUR', rate_date, round(eur) FROM w;

SELECT setseed(0.909);
WITH lane AS (
  SELECT o.code AS pol, p.code AS pod, p.region = 'Europe' AS eu, p.base_transit_days AS days,
    CASE o.code WHEN 'VNSGN' THEN 1.0 WHEN 'VNHPH' THEN 1.03 ELSE 1.06 END AS f_pol
  FROM ports o CROSS JOIN ports p
  WHERE o.code IN ('VNSGN', 'VNHPH', 'VNDAD') AND p.kind = 'SEAPORT' AND p.country <> 'Vietnam'
), typ (container_type, f_type) AS (VALUES ('20GP', 1.0), ('40GP', 1.75), ('40HC', 1.85), ('40RF', 2.6)),
period (valid_from, valid_to, who, gri) AS (VALUES
  (DATE '2026-04-01', DATE '2026-06-30', 'all', 1.0),
  (DATE '2026-07-01', DATE '2026-09-30', 'asia', 1.0), (DATE '2026-07-01', DATE '2026-07-14', 'eu', 1.0),
  (DATE '2026-07-15', DATE '2026-09-30', 'eu', 1.4), (DATE '2026-10-01', DATE '2026-12-31', 'asia', 1.0),
  (DATE '2026-10-01', DATE '2026-12-31', 'eu', 1.38)
), c AS (
  SELECT x.*, random() AS r FROM (
    SELECT lane.pol, lane.pod, lane.days, lane.f_pol, typ.container_type, typ.f_type, period.valid_from, period.valid_to, period.gri
    FROM lane CROSS JOIN typ CROSS JOIN period
    WHERE period.who = 'all' OR (period.who = 'eu') = lane.eu
    ORDER BY lane.pol, lane.pod, typ.container_type, period.valid_from
  ) x
)
INSERT INTO rate_contracts (id, pol, pod, container_type, valid_from, valid_to, buy_usd)
SELECT row_number() OVER (ORDER BY pol, pod, container_type, valid_from), pol, pod, container_type, valid_from, valid_to,
  round(((250 + days * 38) * f_pol * f_type * gri * (0.94 + r * 0.12))::numeric, 0)
FROM c;

ANALYZE exchange_rates, rate_contracts;
SELECT setseed(0.111);
WITH won AS (
  SELECT s.id AS shipment_id, s.customer_id, s.sales_rep_id, s.pol, s.pod, k.container_type, s.booking_date
  FROM shipments s
  JOIN (SELECT DISTINCT ON (shipment_id) shipment_id, container_type FROM containers ORDER BY shipment_id, id) k ON k.shipment_id = s.id
  WHERE s.direction = 'EXPORT' AND s.mode = 'SEA' AND s.booking_date >= DATE '2026-04-06'
  ORDER BY s.id
), w AS (
  SELECT won.*, booking_date - 1 - floor(random() * 5)::int AS quote_date, random() AS r_disc, random() AS r_mark FROM won
), lost AS (
  SELECT g, random() AS r_cust, random() AS r_churn, random() AS r_pol, random() AS r_pod, random() AS r_type, random() AS r_day,
    random() AS r_disc, random() AS r_mark
  FROM generate_series(1, 900) g
), l AS (
  SELECT NULL::int AS shipment_id,
    CASE WHEN r_churn < 0.25 THEN 171 + floor(r_cust * 20)::int ELSE 1 + floor(190 * power(r_cust, 1.5))::int END AS customer_id,
    (ARRAY['VNSGN','VNSGN','VNHPH','VNDAD'])[1 + floor(r_pol * 4)::int] AS pol,
    (ARRAY['CNSHA','CNNGB','SGSIN','KRPUS','JPTYO','THLCH','INNSA','NLRTM','DEHAM','BEANR','USLAX','USNYC','AUSYD','CNSHA','NLRTM','USLAX'])[1 + floor(r_pod * 16)::int] AS pod,
    (ARRAY['20GP','40GP','40HC','40HC','40RF'])[1 + floor(r_type * 5)::int] AS container_type,
    DATE '2026-04-01' + floor(r_day * 213)::int AS quote_date, r_disc, r_mark
  FROM lost
), q AS (
  SELECT shipment_id, customer_id, sales_rep_id, pol, pod, container_type, quote_date, r_disc, r_mark FROM w
  UNION ALL
  SELECT l.shipment_id, l.customer_id, cu.sales_rep_id, l.pol, l.pod, l.container_type, l.quote_date, l.r_disc, l.r_mark
  FROM l JOIN customers cu ON cu.id = l.customer_id
), pre AS MATERIALIZED ( -- Europe lanes only: the buy rate before the 2026-07-15 increase
  SELECT pol, pod, container_type, buy_usd FROM rate_contracts WHERE valid_to = DATE '2026-07-14'
), priced AS (
  SELECT q.*, CASE WHEN q.quote_date >= DATE '2026-07-15' THEN pre.buy_usd END AS pre_buy, cur.buy_usd AS cur_buy,
    row_number() OVER (ORDER BY q.quote_date, q.shipment_id NULLS LAST, q.customer_id, q.pol, q.pod, q.container_type, q.r_mark) AS id
  FROM q
  JOIN rate_contracts cur ON cur.pol = q.pol AND cur.pod = q.pod AND cur.container_type = q.container_type
                         AND q.quote_date BETWEEN cur.valid_from AND cur.valid_to
  LEFT JOIN pre ON pre.pol = q.pol AND pre.pod = q.pod AND pre.container_type = q.container_type
)
INSERT INTO quotations (id, quote_no, customer_id, sales_rep_id, pol, pod, container_type, quote_date, sell_usd, shipment_id)
SELECT id, 'QT' || to_char(quote_date, 'YYMM') || lpad(id::text, 5, '0'), customer_id, sales_rep_id, pol, pod, container_type, quote_date,
  round((COALESCE(pre_buy, cur_buy) * CASE WHEN r_disc < 0.015 THEN 0.90 + r_mark * 0.08 WHEN pre_buy IS NOT NULL THEN 1.12 + r_mark * 0.40
                                            ELSE 1.08 + r_mark * 0.17 END)::numeric, 0),
  shipment_id
FROM priced ORDER BY id;

ANALYZE quotations;
SELECT setseed(0.212);
WITH s AS (
  SELECT s.id, s.customer_id, s.direction, s.mode, s.load_type, s.status, s.gross_weight_kg, s.volume_cbm,
    CASE WHEN s.direction = 'EXPORT' THEN s.atd ELSE s.ata END AS served,
    CASE WHEN s.direction = 'EXPORT' THEN s.pod ELSE s.pol END AS far,
    random() AS r_issue, random() AS r_forget, random() AS r_rev
  FROM shipments s
  WHERE s.booking_date >= DATE '2026-04-01' AND s.status <> 'CANCELLED'
  ORDER BY s.id
), r AS (
  SELECT s.*, p.base_transit_days AS days, q.sell_usd, k.boxes, s.served + 1 + floor(s.r_issue * 3)::int AS issue_date
  FROM s JOIN ports p ON p.code = s.far LEFT JOIN quotations q ON q.shipment_id = s.id
  LEFT JOIN (SELECT shipment_id, count(*) AS boxes FROM containers GROUP BY shipment_id) k ON k.shipment_id = s.id
  WHERE s.served IS NOT NULL AND NOT (s.status = 'DELIVERED' AND s.r_forget < 0.03)
), v AS (
  SELECT r.*, CASE
      WHEN sell_usd IS NOT NULL THEN sell_usd * boxes + 120
      WHEN mode = 'AIR' THEN gross_weight_kg * (3.6 + r_rev * 1.2)
      WHEN load_type = 'LCL' THEN volume_cbm * (50 + r_rev * 35) + 60
      ELSE boxes * (700 + days * 30) * (1.0 + r_rev * 0.2) END AS rev_usd,
    row_number() OVER (ORDER BY issue_date, id) AS n
  FROM r WHERE issue_date <= DATE '2026-10-31'
)
INSERT INTO invoices (id, invoice_no, shipment_id, customer_id, issue_date, due_date, amount_vnd)
SELECT n, 'INV' || to_char(issue_date, 'YYMM') || lpad(n::text, 5, '0'), id, customer_id, issue_date, issue_date + 30,
  round((rev_usd * (SELECT x.vnd_per_unit FROM exchange_rates x WHERE x.currency = 'USD' AND x.rate_date <= v.issue_date
                    ORDER BY x.rate_date DESC LIMIT 1))::numeric, -3)
FROM v ORDER BY n;

ANALYZE invoices;
SELECT setseed(0.313);
WITH i AS (
  SELECT id, due_date, amount_vnd, random() AS r_kind, random() AS r_d1, random() AS r_d2 FROM invoices ORDER BY id
), p AS (
  SELECT id AS invoice_id, 1 AS k, due_date - 15 + floor(r_d1 * 45)::int AS pay_date, amount_vnd AS amount FROM i WHERE r_kind >= 0.25
  UNION ALL
  SELECT id, 1, due_date - 5 + floor(r_d1 * 20)::int, round(amount_vnd * 0.5, -3) FROM i WHERE r_kind >= 0.05 AND r_kind < 0.25
  UNION ALL
  SELECT id, 2, due_date + 15 + floor(r_d1 * 20)::int + floor(r_d2 * 40)::int, amount_vnd - round(amount_vnd * 0.5, -3)
  FROM i WHERE r_kind >= 0.05 AND r_kind < 0.25
)
INSERT INTO payments (id, invoice_id, pay_date, amount_vnd)
SELECT row_number() OVER (ORDER BY pay_date, invoice_id, k), invoice_id, pay_date, amount FROM p WHERE pay_date <= DATE '2026-10-31';

SELECT setseed(0.414);
WITH s AS (
  SELECT s.id, s.status, s.mode, s.load_type, s.pol, s.pod, s.booking_date, s.gross_weight_kg, s.volume_cbm,
    CASE WHEN s.direction = 'EXPORT' THEN s.atd ELSE s.ata END AS served,
    CASE WHEN s.direction = 'EXPORT' THEN s.pod ELSE s.pol END AS far,
    random() AS r_cost, random() AS r_d1, random() AS r_d2, random() AS r_cancel
  FROM shipments s WHERE s.booking_date >= DATE '2026-04-01' ORDER BY s.id
), c AS (
  SELECT s.*, p.region = 'Europe' AS eu, p.base_transit_days AS days, rc.buy_usd, n.boxes
  FROM s JOIN ports p ON p.code = s.far
  LEFT JOIN (SELECT shipment_id, count(*) AS boxes FROM containers GROUP BY shipment_id) n ON n.shipment_id = s.id
  LEFT JOIN quotations q ON q.shipment_id = s.id
  LEFT JOIN rate_contracts rc ON rc.pol = s.pol AND rc.pod = s.pod AND rc.container_type = q.container_type
                             AND s.served BETWEEN rc.valid_from AND rc.valid_to
), k AS (
  SELECT c.*, CASE
      WHEN buy_usd IS NOT NULL THEN buy_usd * boxes + 80
      WHEN mode = 'AIR' THEN gross_weight_kg * (2.6 + r_cost * 0.8)
      WHEN load_type = 'LCL' THEN volume_cbm * (32 + r_cost * 13) + 30
      ELSE boxes * (700 + days * 30) * (0.78 + r_cost * 0.14) END AS cost_usd
  FROM c
), b AS (
  SELECT id AS shipment_id, 1 AS k, served + floor(r_d1 * 7)::int AS bill_date, 'USD' AS currency,
    round((cost_usd * CASE WHEN eu THEN 0.85 ELSE 1 END)::numeric, 2) AS amount
  FROM k WHERE status <> 'CANCELLED' AND served IS NOT NULL
  UNION ALL
  SELECT id, 2, served + 2 + floor(r_d2 * 6)::int, 'EUR', round((cost_usd * 0.15 * 26150 / 30200)::numeric, 2)
  FROM k WHERE status <> 'CANCELLED' AND served IS NOT NULL AND eu
  UNION ALL
  SELECT id, 1, booking_date + 3 + floor(r_d1 * 8)::int, 'USD', round((80 + r_cost * 170)::numeric, 2)
  FROM k WHERE status = 'CANCELLED' AND r_cancel < 0.6
), n AS (
  SELECT b.*, row_number() OVER (ORDER BY bill_date, shipment_id, k) AS id FROM b WHERE bill_date <= DATE '2026-10-31'
)
INSERT INTO vendor_bills (id, bill_no, shipment_id, bill_date, currency, amount)
SELECT id, 'VB' || to_char(bill_date, 'YYMM') || lpad(id::text, 5, '0'), shipment_id, bill_date, currency, amount FROM n ORDER BY id;

SELECT setseed(0.515);
WITH grp AS (
  SELECT carrier_id, pol, pod, atd, sum(gross_weight_kg) AS w
  FROM shipments WHERE direction = 'EXPORT' AND mode = 'SEA' AND atd >= DATE '2026-05-01'
  GROUP BY carrier_id, pol, pod, atd
  ORDER BY atd, carrier_id, pol, pod
), m AS (
  SELECT row_number() OVER (ORDER BY atd, carrier_id, pol, pod) AS id, grp.*, random() AS r_dev, random() AS r_size FROM grp
)
INSERT INTO master_bills (id, mbl_no, carrier_id, pol, pod, issue_date, gross_weight_kg)
SELECT m.id, c.code || lpad((400000 + m.id)::text, 8, '0'), m.carrier_id, m.pol, m.pod, m.atd,
  round((m.w * CASE WHEN m.r_dev >= 0.04 THEN 1 WHEN m.r_size < 0.5 THEN 0.94 + m.r_size * 0.07 ELSE 1.015 + (m.r_size - 0.5) * 0.09 END)::numeric, 2)
FROM m JOIN carriers c ON c.id = m.carrier_id ORDER BY m.id;

ANALYZE master_bills;
SELECT setseed(0.616);
WITH h AS (
  SELECT s.id AS shipment_id, s.ref, s.atd, s.gross_weight_kg, m.id AS master_bill_id, random() AS r_late, random() AS r_day
  FROM shipments s
  JOIN master_bills m ON m.carrier_id = s.carrier_id AND m.pol = s.pol AND m.pod = s.pod AND m.issue_date = s.atd
  WHERE s.direction = 'EXPORT' AND s.mode = 'SEA' AND s.atd >= DATE '2026-05-01'
  ORDER BY s.id
), d AS (
  SELECT h.*, atd + CASE WHEN r_late < 0.08 THEN 3 + floor(r_day * 5)::int ELSE floor(r_day * 3)::int END AS issue_date FROM h
)
INSERT INTO house_bills (id, hbl_no, master_bill_id, shipment_id, issue_date, gross_weight_kg)
SELECT row_number() OVER (ORDER BY issue_date, shipment_id), 'HB' || substr(ref, 3), master_bill_id, shipment_id, issue_date, gross_weight_kg
FROM d WHERE issue_date <= DATE '2026-10-31';

-- ===== Plan 4 (chapters 10-12). Story hooks (tickets and tests/seed.test.ts depend on them):
--   * free_time_terms: one row per customer and period (2024-11-01..2026-06-30, 2026-07-01..2026-12-31); free days 7/10/14
--     never change, the daily rate rises 20% from 2026-07-01 (ch10-04, ch12-03)
--   * container_events (id = container_id * 10 + step): the life of every FCL container whose shipment sailed (ETD) from
--     2025-05-01, when container tracking went live: empty out, full in, loaded, discharged, full out, empty back;
--     about 109k rows (the chapter 11 lab needs a big table; ANALYZE below reads all of it, keep it under 150k); nothing after 2026-10-31 (ch10-03, ch11)
--   * D&D = days from DISCHARGED to EMPTY_RETURNED of import containers; customer 1 keeps its import containers about
--     2 weeks longer once discharged from 2026-07-01, so its overrun jumps in Q3 2026 and its October boxes are the
--     ones stuck at full gate-out on 2026-10-31 (ch10-03, ch10-04, ch12-03, ch12-06)
--   * claims: about 1.5% of non-cancelled shipments; carrier 3 (Blue Anchor Lines) about 4x that rate in 2026 (ch12-04, ch12-06)
--   * prebuilt indexes for chapter 11 at the very end; container_events has none on container_id (the index lab)
SELECT setseed(0.717);
WITH d AS (
  SELECT id, (ARRAY[7, 10, 14])[1 + floor(random() * 3)::int] AS free, 40 + floor(random() * 5)::int * 5 AS rate FROM customers ORDER BY id
)
INSERT INTO free_time_terms (id, customer_id, valid_from, valid_to, free_days, usd_per_day)
SELECT row_number() OVER (ORDER BY d.id, p.k), d.id, p.f, p.t, d.free, round((d.rate * p.mult)::numeric, 2)
FROM d CROSS JOIN (VALUES (1, DATE '2024-11-01', DATE '2026-06-30', 1.0), (2, DATE '2026-07-01', DATE '2026-12-31', 1.2)) p(k, f, t, mult);

SELECT setseed(0.727);
WITH c AS (
  SELECT c.id, s.direction, s.customer_id, s.status, s.etd, s.atd, s.ata,
    random() AS r1, random() AS r2, random() AS r3, random() AS r4, random() AS r5, random() AS r6
  FROM containers c JOIN shipments s ON s.id = c.shipment_id
  WHERE s.status <> 'CANCELLED' AND s.etd >= DATE '2025-05-01'
  ORDER BY c.id
), t AS (
  SELECT id, direction, customer_id, status,
    etd - 3 - floor(r1 * 4)::int + make_interval(hours => 7 + floor(r2 * 10)::int) AS gate_out_empty,
    etd - 1 - floor(r3 * 2)::int + make_interval(hours => 6 + floor(r4 * 12)::int) AS gate_in_full,
    atd + make_interval(hours => 2 + floor(r5 * 20)::int) AS loaded,
    ata + make_interval(hours => 1 + floor(r6 * 20)::int) AS discharged,
    r1, r2, r3
  FROM c
), u AS (
  SELECT t.*,
    CASE WHEN status = 'DELIVERED' THEN discharged + make_interval(days => 1 + floor(r2 * 4)::int, hours => 3) END AS gate_out_full
  FROM t
), v AS (
  SELECT u.*, gate_out_full + make_interval(days => 2 + floor(r3 * 7)::int
      + CASE WHEN customer_id = 1 AND direction = 'IMPORT' AND discharged >= '2026-07-01' THEN 12 + floor(r1 * 8)::int ELSE 0 END,
      hours => 5) AS empty_returned
  FROM u
), e AS (
  SELECT id, 1 AS k, 'GATE_OUT_EMPTY' AS event, gate_out_empty AS at FROM v
  UNION ALL SELECT id, 2, 'GATE_IN_FULL', gate_in_full FROM v
  UNION ALL SELECT id, 3, 'LOADED', loaded FROM v
  UNION ALL SELECT id, 4, 'DISCHARGED', discharged FROM v
  UNION ALL SELECT id, 5, 'GATE_OUT_FULL', gate_out_full FROM v
  UNION ALL SELECT id, 6, 'EMPTY_RETURNED', empty_returned FROM v
)
INSERT INTO container_events (id, container_id, event, event_time)
SELECT id * 10 + k, id, event, at FROM e WHERE at IS NOT NULL AND at < TIMESTAMP '2026-11-01';
ALTER TABLE container_events ADD PRIMARY KEY (id), ADD FOREIGN KEY (container_id) REFERENCES containers(id);

SELECT setseed(0.737);
WITH s AS (
  SELECT s.id, s.carrier_id, s.etd, s.atd, s.ata, s.gross_weight_kg, random() AS r_claim, random() AS r_reason, random() AS r_amt, random() AS r_day
  FROM shipments s WHERE s.status IN ('DELIVERED', 'ARRIVED') ORDER BY s.id
), k AS (
  SELECT s.*, ata + 3 + floor(r_day * 40)::int AS claim_date FROM s
  WHERE r_claim < CASE WHEN carrier_id = 3 AND ata >= DATE '2026-01-01' THEN 0.06 ELSE 0.015 END
)
INSERT INTO claims (id, claim_no, shipment_id, claim_date, reason, amount_usd)
SELECT row_number() OVER (ORDER BY claim_date, id), 'CL' || to_char(claim_date, 'YYMM') || lpad((row_number() OVER (ORDER BY claim_date, id))::text, 4, '0'),
  id, claim_date, (ARRAY['DAMAGE', 'SHORTAGE', 'DELAY'])[1 + floor(r_reason * 3)::int], round((150 + r_amt * 4850)::numeric, 2)
FROM k WHERE claim_date <= DATE '2026-10-31';

-- Chapter 11: the company's indexes on the busiest lookups. ANALYZE so plan costs are the same on every boot.
CREATE INDEX shipments_booking_date_idx ON shipments (booking_date);
CREATE INDEX shipments_customer_id_idx ON shipments (customer_id);
-- container_events is larger than ANALYZE's default 30,000-row sample, and the sample is not seeded by setseed():
-- read every row so plan costs are identical on every boot.
SET default_statistics_target = 500;
ANALYZE container_events;
RESET default_statistics_target;
ANALYZE free_time_terms, claims;

-- Plan 5 (lanes, L48 option B). Hand-written, no random(): no setseed() needed. Illustrative, simplified figures.
-- Hooks (content/lanes/): from Da Nang (Tien Sa, the game's hub) Europe, India and New York change ship in SGSIN,
-- Los Angeles in KRPUS; Hai Phong to Sydney also calls at SGSIN. Fuel peaks in Aug 2026 (622 USD/t).
-- Per destination: distance and days from Da Nang; Ho Chi Minh (VNSGN) is 330 nm (1 day) closer to southern destinations
-- (side 1) and farther from northern ones (side -1), Hai Phong the other way round.
INSERT INTO lane_profiles (pol, pod, distance_nm, via_port, sea_days, fuel_t_per_day, vessel_teu)
SELECT v.pol, d.pod, d.dist + v.k * d.side * 330,
  CASE WHEN v.pol = 'VNHPH' AND d.pod = 'AUSYD' THEN 'SGSIN' ELSE d.via END,
  d.days + v.k * d.side, d.fuel, d.teu
FROM (VALUES ('VNDAD', 0), ('VNSGN', -1), ('VNHPH', 1)) AS v (pol, k)
CROSS JOIN (VALUES
  ('CNSHA', -1, 1250, NULL, 4.5, 28.0, 1800),
  ('CNNGB', -1, 1180, NULL, 4.3, 28.0, 1800),
  ('SGSIN', 1, 1020, NULL, 3.2, 28.0, 1800),
  ('KRPUS', -1, 1850, NULL, 5.8, 33.0, 2500),
  ('JPTYO', -1, 2280, NULL, 7.4, 33.0, 2500),
  ('THLCH', 1, 1090, NULL, 3.6, 22.0, 1100),
  ('INNSA', 1, 3520, 'SGSIN', 13.6, 48.0, 4200),
  ('NLRTM', 1, 9480, 'SGSIN', 30.2, 120.0, 13000),
  ('DEHAM', 1, 9790, 'SGSIN', 31.4, 120.0, 13000),
  ('BEANR', 1, 9600, 'SGSIN', 30.7, 120.0, 13000),
  ('USLAX', -1, 7120, 'KRPUS', 19.8, 95.0, 8500),
  ('USNYC', 1, 11850, 'SGSIN', 34.6, 120.0, 11000),
  ('AUSYD', 1, 4380, NULL, 15.6, 48.0, 4200)
) AS d (pod, side, dist, via, days, fuel, teu)
ORDER BY v.pol, d.pod;

INSERT INTO bunker_prices (month, usd_per_tonne) VALUES
  ('2025-01-01', 612.00), ('2025-02-01', 598.00), ('2025-03-01', 585.00), ('2025-04-01', 571.00),
  ('2025-05-01', 560.00), ('2025-06-01', 566.00), ('2025-07-01', 574.00), ('2025-08-01', 569.00),
  ('2025-09-01', 558.00), ('2025-10-01', 552.00), ('2025-11-01', 547.00), ('2025-12-01', 541.00),
  ('2026-01-01', 536.00), ('2026-02-01', 529.00), ('2026-03-01', 534.00), ('2026-04-01', 548.00),
  ('2026-05-01', 561.00), ('2026-06-01', 579.00), ('2026-07-01', 603.00), ('2026-08-01', 622.00),
  ('2026-09-01', 618.00), ('2026-10-01', 605.00);
ANALYZE lane_profiles, bunker_prices;
