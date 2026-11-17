-- Cargo Query seed. Deterministic: every random block starts with its own setseed(),
-- so adding tables later never re-rolls existing ones. Append new blocks at the END.
-- Game "today" = 2026-10-31. Ticket solutions use literal dates, never CURRENT_DATE/now().
-- Story hooks (tickets and tests depend on them):
--   * customers 171-190 stop booking from 2026-03-01 (churn, Ch3)
--   * customers 191-200 duplicate customers 1-10 with English-style names (trap, Ch4+)
--   * ~2% of AIR shipments carry incoterm FOB (trap: FOB is sea-only, Ch6)
--   * chapters 4-6 (Plan 2): listed at the head of the Plan 2 block near the end of this file
--   * reserved for Plan 3: Europe lane (NLRTM/DEHAM/BEANR) margin drop in Q3 2026,
--     customer 1 D&D spike, carrier 3 (Blue Anchor Lines) high claim rate

INSERT INTO ports VALUES
  ('VNSGN', 'Ho Chi Minh (Cat Lai)', 'Vietnam', 'Vietnam', 'SEAPORT', 0),
  ('VNHPH', 'Hai Phong', 'Vietnam', 'Vietnam', 'SEAPORT', 0),
  ('VNDAD', 'Da Nang', 'Vietnam', 'Vietnam', 'SEAPORT', 0),
  ('CNSHA', 'Shanghai', 'China', 'Asia', 'SEAPORT', 5),
  ('CNNGB', 'Ningbo', 'China', 'Asia', 'SEAPORT', 5),
  ('SGSIN', 'Singapore', 'Singapore', 'Asia', 'SEAPORT', 3),
  ('KRPUS', 'Busan', 'South Korea', 'Asia', 'SEAPORT', 6),
  ('JPTYO', 'Tokyo', 'Japan', 'Asia', 'SEAPORT', 8),
  ('THLCH', 'Laem Chabang', 'Thailand', 'Asia', 'SEAPORT', 3),
  ('INNSA', 'Nhava Sheva', 'India', 'South Asia', 'SEAPORT', 14),
  ('NLRTM', 'Rotterdam', 'Netherlands', 'Europe', 'SEAPORT', 30),
  ('DEHAM', 'Hamburg', 'Germany', 'Europe', 'SEAPORT', 32),
  ('BEANR', 'Antwerp', 'Belgium', 'Europe', 'SEAPORT', 31),
  ('USLAX', 'Los Angeles', 'United States', 'North America', 'SEAPORT', 20),
  ('USNYC', 'New York', 'United States', 'North America', 'SEAPORT', 35),
  ('AUSYD', 'Sydney', 'Australia', 'Oceania', 'SEAPORT', 16),
  ('SGN', 'Tan Son Nhat Airport', 'Vietnam', 'Vietnam', 'AIRPORT', 0),
  ('HAN', 'Noi Bai Airport', 'Vietnam', 'Vietnam', 'AIRPORT', 0),
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
