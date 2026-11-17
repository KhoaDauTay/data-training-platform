-- Chợ Lồng Đèn (Lantern Market) seed, schema `ecom` (Plan 9). Deterministic: every random block starts with its own
-- setseed(), so a block appended later never re-rolls an earlier one. Append new blocks at the END.
-- Game "today" = 2026-10-31 (same as Logistics). Solutions use literal dates, never CURRENT_DATE/now().
-- Story hooks (tickets and tests/ecomSeed.test.ts depend on them):
--   * ~10% of customers never order: 493 of 5,000 (anti join, E3)
--   * Retention by first channel: referral > organic > social > ads (cohort/window, E6; CAC in E5 boss)
--   * Sale days 2025-09-09, 2025-10-10, 2025-11-11, 2025-12-12, 2026-09-09, 2026-10-10: ~300 extra orders each,
--     most with that day's voucher (date_bucket, window_lag)
--   * Courier "Kite Logistics" is late in the central cities (Da Nang, Hue, Nha Trang) for parcels shipped from
--     2026-09-01: 60% arrive 3-7 days after the promised date (date_math, E4)
--   * Cash on delivery (cod) orders that were cancelled, or are not delivered yet, have NO payment row (left join, E3)
--   * Some card payments fail first: one 'failed' row, then a 'paid' row for the same order (join fan-out trap, E3)
--   * Seller 7 (Highland Gadget Hub): phones/audio items delivered in Q3 2026 come back 'damaged' ~15% of the time (14.7%; 1.2% for other shops) and
--     get low ratings (returns, E5 / E6)
--   * birth_year is NULL for ~25% of customers, reviews.comment is NULL for ~45% (null_logic / coalesce, E4)
--   * orders placed on 2026-10-30/31 are 'pending' (no delivery row); orders shipped and not delivered by 2026-10-31
--     are 'shipping' with delivered_on NULL

INSERT INTO categories VALUES
  (1, 'Electronics', NULL),
  (2, 'Phones & Tablets', 1),
  (3, 'Audio', 1),
  (4, 'Home & Kitchen', NULL),
  (5, 'Cookware', 4),
  (6, 'Bedding', 4),
  (7, 'Fashion', NULL),
  (8, 'Women Fashion', 7),
  (9, 'Men Fashion', 7),
  (10, 'Beauty', NULL),
  (11, 'Skincare', 10),
  (12, 'Books & Stationery', NULL),
  (13, 'Toys & Baby', NULL),
  (14, 'Groceries', NULL);

-- 40 sellers, 5 per kind of shop (ids 1-5 Lantern Craft, 6-10 Gadget Hub, ...); seller 7 is the returns hook.
INSERT INTO sellers (id, name, city, joined_on, is_official)
SELECT i,
  (ARRAY['Hoi An','Saigon','Ha Noi','Da Nang','Mekong','Hue','Highland','Coastal','Lotus','Bamboo'])[1 + (i - 1) % 10] || ' ' ||
  (ARRAY['Lantern Craft','Gadget Hub','Home Corner','Style Studio','Green Pantry','Book Nook','Kids Planet','Beauty Lab'])[1 + (i - 1) / 5],
  (ARRAY['Da Nang','Ho Chi Minh City','Ha Noi','Da Nang','Can Tho','Hue','Ha Noi','Nha Trang','Ho Chi Minh City','Hai Phong'])[1 + (i - 1) % 10],
  DATE '2023-03-01' + (i * 37) % 700,
  i % 4 = 1
FROM generate_series(1, 40) i;

INSERT INTO vouchers VALUES
  (1, 'NEWUSER10', 'New customer', 10, 0, '2025-01-01', '2026-12-31'),
  (2, 'BDAY5', 'Birthday', 5, 100000, '2025-01-01', '2026-12-31'),
  (3, 'SALE99-25', '9.9 Sale 2025', 15, 200000, '2025-09-09', '2025-09-09'),
  (4, 'SALE1010-25', '10.10 Sale 2025', 15, 200000, '2025-10-10', '2025-10-10'),
  (5, 'SALE1111-25', '11.11 Sale 2025', 20, 300000, '2025-11-11', '2025-11-11'),
  (6, 'SALE1212-25', '12.12 Sale 2025', 15, 200000, '2025-12-12', '2025-12-12'),
  (7, 'TET-26', 'Tet Sale 2026', 10, 150000, '2026-02-01', '2026-02-10'),
  (8, 'SALE99-26', '9.9 Sale 2026', 15, 200000, '2026-09-09', '2026-09-09'),
  (9, 'SALE1010-26', '10.10 Sale 2026', 20, 300000, '2026-10-10', '2026-10-10'),
  (10, 'BACK2SCHOOL', 'Back to school 2026', 10, 100000, '2026-08-15', '2026-09-05');

SELECT setseed(0.111);
-- 400 products in the 10 leaf categories; products 1-100 launched in 2024, the rest spread to 2026-09.
INSERT INTO products (id, sku, name, category_id, seller_id, price, cost, launched_on, is_active)
SELECT i,
  'SKU' || lpad(i::text, 5, '0'),
  (ARRAY['Classic','Smart','Mini','Premium','Eco','Daily','Pro','Soft','Bright','Lucky'])[1 + floor(random() * 10)::int] || ' ' ||
  (ARRAY['Phone','Earbuds','Pan','Pillow','Dress','Shirt','Serum','Notebook','Puzzle','Coffee'])[1 + (i - 1) % 10] || ' ' || lpad(i::text, 3, '0'),
  (ARRAY[2, 3, 5, 6, 8, 9, 11, 12, 13, 14])[1 + (i - 1) % 10],
  -- the shop kind that sells this category (Gadget Hub sells phones and audio, ...), one of its 5 shops
  (ARRAY[6, 6, 11, 1, 16, 16, 36, 26, 31, 21])[1 + (i - 1) % 10] + (i / 10) % 5,
  round(((ARRAY[4500000, 650000, 420000, 280000, 350000, 260000, 310000, 60000, 190000, 120000])[1 + (i - 1) % 10]
        * (0.5 + random()))::numeric, -3),
  0,
  CASE WHEN i <= 100 THEN DATE '2024-06-01' + floor(random() * 200)::int ELSE DATE '2025-01-01' + floor(random() * 620)::int END,
  random() > 0.08
FROM generate_series(1, 400) i;
UPDATE products SET cost = round(price * (0.55 + (id % 7) * 0.04), -3);

SELECT setseed(0.222);
-- 5000 customers signed up 2025-01-01 .. 2026-10-24, growing over time.
INSERT INTO customers (id, full_name, email, city, signup_date, birth_year, channel)
SELECT i,
  (ARRAY['Nguyễn','Trần','Lê','Phạm','Hoàng','Huỳnh','Phan','Vũ','Võ','Đặng','Bùi','Đỗ','Hồ','Ngô','Dương','Lý'])[1 + floor(random() * 16)::int] || ' ' ||
  (ARRAY['Văn','Thị','Minh','Ngọc','Thanh','Quốc','Gia','Hoài'])[1 + floor(random() * 8)::int] || ' ' ||
  (ARRAY['An','Bảo','Chi','Duy','Giang','Hà','Hải','Hân','Hiếu','Hoa','Huy','Khang','Khoa','Lam','Linh','Long','Mai','Minh',
         'My','Nam','Nhi','Phúc','Quân','Quyên','Sơn','Tâm','Thảo','Trang','Tú','Vy'])[1 + floor(random() * 30)::int],
  'user' || i || '@mail.example',
  (ARRAY['Ho Chi Minh City','Ho Chi Minh City','Ho Chi Minh City','Ha Noi','Ha Noi','Ha Noi','Da Nang','Da Nang',
         'Hai Phong','Can Tho','Hue','Nha Trang'])[1 + floor(random() * 12)::int],
  DATE '2025-01-01' + floor(661 * sqrt(random()))::int,
  CASE WHEN random() < 0.25 THEN NULL ELSE 1968 + floor(random() * 39)::int END,
  (ARRAY['ads','ads','ads','ads','ads','ads','ads','organic','organic','organic','organic','organic','organic',
         'social','social','social','social','referral','referral','referral'])[1 + floor(random() * 20)::int]
FROM generate_series(1, 5000) i;

-- Monthly marketing spend (no random): referral = a 50,000 VND bonus per referral signup of that month.
INSERT INTO ad_spend (month, channel, amount)
SELECT m, 'ads', 90000000 + 3000000 * (extract(year FROM m) * 12 + extract(month FROM m) - 24301)
                 + CASE WHEN extract(month FROM m) IN (9, 10, 11, 12) THEN 40000000 ELSE 0 END
FROM generate_series(DATE '2025-01-01', DATE '2026-10-01', interval '1 month') m
UNION ALL
SELECT m, 'social', 45000000 + 1500000 * (extract(year FROM m) * 12 + extract(month FROM m) - 24301)
FROM generate_series(DATE '2025-01-01', DATE '2026-10-01', interval '1 month') m
UNION ALL
SELECT date_trunc('month', signup_date)::date, 'referral', 50000 * count(*)
FROM customers WHERE channel = 'referral' GROUP BY 1;

SELECT setseed(0.333);
-- Orders: each customer orders n times (0 for 12%), mean by first channel; plus the sale-day rush.
-- Built in a temp table so payments and deliveries can reuse the same random draws.
CREATE TEMP TABLE _o AS
WITH cust AS (
  SELECT id, signup_date, city, channel, random() AS r_n, random() AS r_gap, random() AS r_first
  FROM customers ORDER BY id
), slots AS (
  SELECT c.id AS customer_id, c.city, k,
    c.signup_date + floor(c.r_first * 7)::int
      + floor(k * (20 + c.r_gap * 60))::int + floor(random() * 9)::int - 4 AS d,
    random() AS r_hour, random() AS r_pay, random() AS r_cancel, random() AS r_ship, random() AS r_late,
    random() AS r_courier, random() AS r_v, random() AS r_plat
  FROM cust c, generate_series(0, 23) k
  WHERE c.r_n >= 0.12
    AND k < 1 + floor(-ln(1 - (c.r_n - 0.12) / 0.88)
                * CASE c.channel WHEN 'ads' THEN 0.9 WHEN 'social' THEN 1.8 WHEN 'organic' THEN 3.2 ELSE 4.5 END)::int
), sale AS (
  SELECT s.day, g, random() AS r_c, random() AS r_hour, random() AS r_pay, random() AS r_cancel, random() AS r_ship,
    random() AS r_late, random() AS r_courier, random() AS r_v, random() AS r_plat
  FROM unnest(ARRAY[DATE '2025-09-09', DATE '2025-10-10', DATE '2025-11-11', DATE '2025-12-12', DATE '2026-09-09', DATE '2026-10-10']) s(day),
       generate_series(1, 300) g
), cr AS (
  SELECT id, city, row_number() OVER (ORDER BY signup_date, id)::int AS rn FROM customers
), before_day AS MATERIALIZED (
  SELECT day, (SELECT count(*) FROM customers WHERE signup_date < day)::int AS n
  FROM unnest(ARRAY[DATE '2025-09-09', DATE '2025-10-10', DATE '2025-11-11', DATE '2025-12-12', DATE '2026-09-09', DATE '2026-10-10']) day
), sale_p AS (
  SELECT s.*, 1 + floor(s.r_c * b.n)::int AS pick FROM sale s JOIN before_day b ON b.day = s.day
), sale_c AS (
  -- a random customer among those who had signed up before the sale day
  SELECT s.*, c.id AS customer_id, c.city
  FROM sale_p s JOIN cr c ON c.rn = s.pick
), allo AS (
  SELECT customer_id, city, d, 0 AS src, k, r_hour, r_pay, r_cancel, r_ship, r_late, r_courier, r_v, r_plat FROM slots WHERE d <= DATE '2026-10-31'
  UNION ALL
  SELECT customer_id, city, day, 1, g, r_hour, r_pay, r_cancel, r_ship, r_late, r_courier, r_v, r_plat FROM sale_c
), t AS (
  SELECT a.*,
    a.d + make_interval(hours => 7 + floor(16 * power(a.r_hour, 0.6))::int, mins => floor(a.r_hour * 6000)::int % 60) AS ordered_at,
    CASE WHEN a.r_pay < 0.40 THEN 'cod' WHEN a.r_pay < 0.70 THEN 'ewallet' WHEN a.r_pay < 0.90 THEN 'card' ELSE 'bank_transfer' END AS method,
    a.r_cancel < CASE WHEN a.r_pay < 0.40 THEN 0.12 ELSE 0.05 END AS cancelled,
    CASE WHEN a.city IN ('Da Nang', 'Hue', 'Nha Trang') AND a.r_courier < 0.35 THEN 'Lantern Fleet'
         WHEN a.r_courier < 0.70 THEN 'BeeRun Express' ELSE 'Kite Logistics' END AS courier,
    CASE a.city WHEN 'Da Nang' THEN 1 WHEN 'Hue' THEN 2 WHEN 'Nha Trang' THEN 2 WHEN 'Can Tho' THEN 4 ELSE 3 END AS lead_days
  FROM allo a
)
SELECT row_number() OVER (ORDER BY ordered_at, customer_id, src, k)::int AS id, t.*,
  d + floor(r_ship * 2.5)::int AS shipped_on
FROM t;

INSERT INTO orders (id, code, customer_id, ordered_at, status, voucher_id, shipping_fee, platform)
SELECT id,
  'LD' || to_char(ordered_at, 'YYMMDD') || lpad(id::text, 6, '0'),
  customer_id, ordered_at,
  'pending',   -- set below, once delivery dates are known
  CASE WHEN src = 1 AND r_v < 0.7 THEN (SELECT v.id FROM vouchers v WHERE v.starts_on = d AND v.code LIKE 'SALE%')
       WHEN d BETWEEN DATE '2026-02-01' AND DATE '2026-02-10' AND r_v < 0.4 THEN 7
       WHEN d BETWEEN DATE '2026-08-15' AND DATE '2026-09-05' AND r_v < 0.25 THEN 10
       WHEN k = 0 AND src = 0 AND r_v < 0.35 THEN 1
       WHEN r_v > 0.97 THEN 2 END,
  0,
  CASE WHEN r_plat < 0.68 THEN 'app' ELSE 'web' END
FROM _o ORDER BY id;

SELECT setseed(0.444);
-- 1-4 lines per order; popular products are picked more often; a product is never sold before its launch.
WITH lines AS (
  SELECT o.id AS order_id, o.ordered_at::date AS d, l AS line_no, random() AS r_p, random() AS r_q
  FROM orders o, generate_series(1, 4) l
  WHERE l <= 1 + floor(power(((o.id * 7919) % 1000) / 1000.0, 2) * 4)::int
)
INSERT INTO order_items (order_id, line_no, product_id, quantity, unit_price)
SELECT l.order_id, l.line_no, p.id,
  CASE WHEN l.r_q < 0.75 THEN 1 WHEN l.r_q < 0.93 THEN 2 ELSE 3 END,
  p.price
FROM lines l
JOIN products p0 ON p0.id = 1 + floor(400 * power(l.r_p, 1.4))::int
JOIN products p ON p.id = CASE WHEN p0.launched_on <= l.d THEN p0.id ELSE 1 + (p0.id - 1) % 100 END
ORDER BY l.order_id, l.line_no;

-- A voucher only applies when the items reach its minimum; shipping is free from 300,000 VND.
WITH tot AS (SELECT order_id, sum(quantity * unit_price) AS items FROM order_items GROUP BY order_id)
UPDATE orders o SET
  voucher_id = CASE WHEN v.min_order <= tot.items THEN o.voucher_id END,
  shipping_fee = CASE WHEN tot.items >= 300000 THEN 0
                      WHEN c.city IN ('Da Nang', 'Hue') THEN 15000 ELSE 30000 END
FROM tot, customers c, orders o2 LEFT JOIN vouchers v ON v.id = o2.voucher_id
WHERE tot.order_id = o.id AND c.id = o.customer_id AND o2.id = o.id;

-- Deliveries: Kite Logistics runs late in the central cities from 2026-09-01 (hook).
INSERT INTO deliveries (order_id, courier, city, shipped_on, promised_on, delivered_on)
SELECT x.id, x.courier, x.city, x.shipped_on, x.shipped_on + x.lead_days,
  CASE WHEN x.arrive > DATE '2026-10-31' THEN NULL ELSE x.arrive END
FROM (
  SELECT _o.*, shipped_on + lead_days +
    CASE WHEN courier = 'Kite Logistics' AND city IN ('Da Nang', 'Hue', 'Nha Trang') AND shipped_on >= DATE '2026-09-01' AND r_late < 0.6
           THEN 3 + floor(r_late * 8.3)::int
         WHEN r_late < 0.35 THEN -1 WHEN r_late < 0.78 THEN 0 WHEN r_late < 0.92 THEN 1 ELSE 2 + floor((r_late - 0.92) * 30)::int END AS arrive
  FROM _o
) x
WHERE NOT x.cancelled AND x.d < DATE '2026-10-30' AND x.shipped_on <= DATE '2026-10-31'
ORDER BY x.id;

UPDATE orders o SET status = CASE
    WHEN x.cancelled THEN 'cancelled'
    WHEN dl.order_id IS NULL THEN 'pending'
    WHEN dl.delivered_on IS NULL THEN 'shipping'
    ELSE 'delivered' END
FROM _o x LEFT JOIN deliveries dl ON dl.order_id = x.id
WHERE x.id = o.id;

-- Payments: cod is paid on delivery (no row before that, none when cancelled); prepaid orders pay at checkout,
-- 6% of card payments fail once first; a cancelled prepaid order is refunded.
WITH due AS (
  SELECT o.id AS order_id, x.method, o.status, o.ordered_at, dl.delivered_on, x.r_hour,
    round(sum(i.quantity * i.unit_price) * (100 - coalesce(v.discount_pct, 0)) / 100.0, -3) + o.shipping_fee AS amount
  FROM orders o
  JOIN _o x ON x.id = o.id
  JOIN order_items i ON i.order_id = o.id
  LEFT JOIN vouchers v ON v.id = o.voucher_id
  LEFT JOIN deliveries dl ON dl.order_id = o.id
  GROUP BY o.id, x.method, o.status, o.ordered_at, dl.delivered_on, x.r_hour, v.discount_pct
), rows AS (
  SELECT order_id, 0 AS attempt, 'card' AS method, amount, 'failed' AS status, NULL::timestamp AS paid_at
  FROM due WHERE method = 'card' AND (order_id * 31) % 100 < 6
  UNION ALL
  SELECT order_id, 1, method, amount,
    CASE WHEN status = 'cancelled' THEN 'refunded' ELSE 'paid' END,
    CASE WHEN method = 'cod' THEN delivered_on + time '18:00' ELSE ordered_at + make_interval(mins => 1 + floor(r_hour * 50)::int) END
  FROM due
  WHERE method <> 'cod' OR status = 'delivered'
)
INSERT INTO payments (id, order_id, method, amount, status, paid_at)
SELECT row_number() OVER (ORDER BY order_id, attempt)::int, order_id, method, amount, status, paid_at
FROM rows ORDER BY order_id, attempt;

SELECT setseed(0.555);
-- Returns and reviews on delivered items. Seller 7's phones/audio delivered in Q3 2026 come back damaged (hook).
CREATE TEMP TABLE _i AS
SELECT i.order_id, i.line_no, i.product_id, i.quantity, i.unit_price, dl.delivered_on, dl.delivered_on - dl.promised_on AS late,
  p.seller_id = 7 AND dl.delivered_on >= DATE '2026-07-01' AND dl.delivered_on < DATE '2026-10-01' AS bad_batch,
  random() AS r_ret, random() AS r_why, random() AS r_ok, random() AS r_rev, random() AS r_star, random() AS r_txt, random() AS r_day
FROM order_items i
JOIN orders o ON o.id = i.order_id AND o.status = 'delivered'
JOIN deliveries dl ON dl.order_id = i.order_id
JOIN products p ON p.id = i.product_id
ORDER BY i.order_id, i.line_no;

INSERT INTO returns (id, order_id, product_id, requested_on, reason, refund, status)
SELECT row_number() OVER (ORDER BY order_id, line_no)::int, order_id, product_id,
  LEAST(delivered_on + 1 + floor(r_day * 10)::int, DATE '2026-10-31'),
  CASE WHEN bad_batch AND r_why < 0.85 THEN 'damaged'
       WHEN late >= 3 AND r_why < 0.6 THEN 'late'
       WHEN r_why < 0.3 THEN 'damaged' WHEN r_why < 0.5 THEN 'wrong_item' WHEN r_why < 0.85 THEN 'changed_mind' ELSE 'late' END,
  CASE WHEN r_ok < 0.85 THEN quantity * unit_price ELSE 0 END,
  CASE WHEN r_ok < 0.85 THEN 'approved' ELSE 'rejected' END
FROM _i
WHERE r_ret < CASE WHEN bad_batch THEN 0.25 WHEN late >= 3 THEN 0.08 ELSE 0.03 END
ORDER BY order_id, line_no;

INSERT INTO reviews (id, order_id, product_id, rating, created_on, comment)
SELECT row_number() OVER (ORDER BY order_id, line_no)::int, order_id, product_id,
  GREATEST(1, (CASE WHEN r_star < 0.07 THEN 1 WHEN r_star < 0.13 THEN 2 WHEN r_star < 0.25 THEN 3 WHEN r_star < 0.5 THEN 4 ELSE 5 END)
              - CASE WHEN bad_batch THEN 2 WHEN late >= 3 THEN 1 ELSE 0 END),
  LEAST(delivered_on + 1 + floor(r_day * 14)::int, DATE '2026-10-31'),
  CASE WHEN r_txt < 0.45 THEN NULL
       ELSE (ARRAY['Great quality','Fast delivery','As described','Packaging could be better','Arrived late',
                   'Not as pictured','Will buy again','Good value'])[1 + floor((r_txt - 0.45) / 0.55 * 8)::int] END
FROM _i
WHERE r_rev < 0.35
ORDER BY order_id, line_no;

SELECT setseed(0.666);
-- Web sessions: one per order (it ended in that order) plus 18,000 browsing sessions that did not buy.
-- Mobile browsers add to cart less often than desktop ones (funnel, E5).
WITH buy AS (
  SELECT o.id AS order_id, o.customer_id, o.ordered_at - make_interval(mins => 3 + floor(random() * 40)::int) AS started_at,
    CASE WHEN o.platform = 'app' OR random() < 0.4 THEN 'mobile' ELSE 'desktop' END AS device,
    CASE c.channel WHEN 'referral' THEN 'organic' WHEN 'organic' THEN CASE WHEN random() < 0.2 THEN 'email' ELSE 'organic' END ELSE c.channel END AS source
  FROM orders o JOIN customers c ON c.id = o.customer_id
  ORDER BY o.id
), browse AS (
  SELECT g, random() AS r_c, random() AS r_t, random() AS r_d, random() AS r_s, random() AS r_v, random() AS r_a
  FROM generate_series(1, 18000) g
), cr AS (
  SELECT id, row_number() OVER (ORDER BY signup_date, id)::int AS rn FROM customers
), cnt AS MATERIALIZED (
  -- customers signed up on or before each day (running total)
  SELECT g.day::date AS day, (sum(count(c.id)) OVER (ORDER BY g.day))::int AS n
  FROM generate_series(DATE '2025-01-01', DATE '2026-10-31', interval '1 day') g(day)
  LEFT JOIN customers c ON c.signup_date = g.day::date
  GROUP BY g.day
), browse_d AS (
  SELECT b.*, DATE '2025-01-01' + floor(669 * sqrt(b.r_t))::int AS d FROM browse b
), browse_c AS (
  SELECT b.*, x.n, 1 + floor((b.r_c - 0.35) / 0.65 * x.n)::int AS pick
  FROM browse_d b JOIN cnt x ON x.day = b.d
), allsess AS (
  SELECT 0 AS src, order_id AS k, customer_id, started_at, device, source, true AS viewed, true AS cart, order_id FROM buy
  UNION ALL
  -- 35% guests (no customer); the others are a random customer who had already signed up that day
  SELECT 1, b.g, CASE WHEN b.r_c >= 0.35 AND b.n > 0 THEN c.id END,
    b.d + make_interval(hours => 6 + floor(b.r_t * 1700)::int % 17, mins => floor(b.r_t * 100000)::int % 60),
    CASE WHEN b.r_d < 0.7 THEN 'mobile' ELSE 'desktop' END,
    CASE WHEN b.r_s < 0.35 THEN 'ads' WHEN b.r_s < 0.65 THEN 'organic' WHEN b.r_s < 0.9 THEN 'social' ELSE 'email' END,
    b.r_v < 0.75,
    b.r_v < 0.75 AND b.r_a < CASE WHEN b.r_d < 0.7 THEN 0.18 ELSE 0.32 END,
    NULL
  FROM browse_c b LEFT JOIN cr c ON c.rn = b.pick
)
INSERT INTO web_sessions (id, customer_id, started_at, device, source, viewed_product, added_to_cart, order_id)
SELECT row_number() OVER (ORDER BY started_at, src, k)::int, customer_id, started_at, device, source, viewed, cart, order_id
FROM allsess ORDER BY started_at, src, k;

DROP TABLE _o;
DROP TABLE _i;
-- Planner statistics for the ecom tables only (a bare ANALYZE would also re-read every Logistics table).
ANALYZE categories, sellers, products, customers, vouchers, orders, order_items, payments, deliveries, returns, reviews, web_sessions, ad_spend;
