-- Cargo Query seed. Deterministic: every random block starts with its own setseed(),
-- so adding tables later never re-rolls existing ones. Append new blocks at the END.
-- Game "today" = 2026-10-31. Ticket solutions use literal dates, never CURRENT_DATE/now().
-- Story hooks (tickets and tests depend on them):
--   * customers 171-190 stop booking from 2026-03-01 (churn, Ch3)
--   * customers 191-200 duplicate customers 1-10 with English-style names (trap, Ch4+)
--   * ~2% of AIR shipments carry incoterm FOB (trap: FOB is sea-only, Ch6)
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
