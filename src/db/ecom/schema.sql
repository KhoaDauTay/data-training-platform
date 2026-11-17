-- Chợ Lồng Đèn (Lantern Market): e-commerce domain, schema `ecom` (Plan 9).
-- Created by initDb after `SET search_path TO ecom`; table names are bare, like the Logistics schema.
-- Money is VND (numeric(12,0)). Status/method/reason codes are lowercase ASCII words.

CREATE TABLE categories (
  id        int PRIMARY KEY,
  name      text NOT NULL UNIQUE,
  parent_id int REFERENCES categories(id)
);

CREATE TABLE sellers (
  id          int PRIMARY KEY,
  name        text NOT NULL,
  city        text NOT NULL,
  joined_on   date NOT NULL,
  is_official boolean NOT NULL
);

CREATE TABLE products (
  id          int PRIMARY KEY,
  sku         text NOT NULL UNIQUE,
  name        text NOT NULL,
  category_id int NOT NULL REFERENCES categories(id),
  seller_id   int NOT NULL REFERENCES sellers(id),
  price       numeric(12,0) NOT NULL,
  cost        numeric(12,0) NOT NULL,
  launched_on date NOT NULL,
  is_active   boolean NOT NULL
);

CREATE TABLE customers (
  id          int PRIMARY KEY,
  full_name   text NOT NULL,
  email       text NOT NULL UNIQUE,
  city        text NOT NULL,
  signup_date date NOT NULL,
  birth_year  int,                       -- NULL: not given at signup
  channel     text NOT NULL              -- ads | organic | social | referral (how they first came)
);

CREATE TABLE vouchers (
  id           int PRIMARY KEY,
  code         text NOT NULL UNIQUE,
  campaign     text NOT NULL,
  discount_pct int NOT NULL,
  min_order    numeric(12,0) NOT NULL,
  starts_on    date NOT NULL,
  ends_on      date NOT NULL
);

CREATE TABLE orders (
  id           int PRIMARY KEY,
  code         text NOT NULL UNIQUE,
  customer_id  int NOT NULL REFERENCES customers(id),
  ordered_at   timestamp NOT NULL,
  status       text NOT NULL,            -- pending | shipping | delivered | cancelled
  voucher_id   int REFERENCES vouchers(id),
  shipping_fee numeric(12,0) NOT NULL,
  platform     text NOT NULL             -- app | web
);

CREATE TABLE order_items (
  order_id   int NOT NULL REFERENCES orders(id),
  line_no    int NOT NULL,
  product_id int NOT NULL REFERENCES products(id),
  quantity   int NOT NULL,
  unit_price numeric(12,0) NOT NULL,
  PRIMARY KEY (order_id, line_no)
);

CREATE TABLE payments (
  id       int PRIMARY KEY,
  order_id int NOT NULL REFERENCES orders(id),
  method   text NOT NULL,                -- cod | ewallet | card | bank_transfer
  amount   numeric(12,0) NOT NULL,
  status   text NOT NULL,                -- paid | failed | refunded
  paid_at  timestamp                     -- NULL unless paid or refunded
);

CREATE TABLE deliveries (
  order_id     int PRIMARY KEY REFERENCES orders(id),
  courier      text NOT NULL,
  city         text NOT NULL,
  shipped_on   date NOT NULL,
  promised_on  date NOT NULL,
  delivered_on date                      -- NULL: still on the way
);

CREATE TABLE returns (
  id           int PRIMARY KEY,
  order_id     int NOT NULL REFERENCES orders(id),
  product_id   int NOT NULL REFERENCES products(id),
  requested_on date NOT NULL,
  reason       text NOT NULL,            -- damaged | wrong_item | changed_mind | late
  refund       numeric(12,0) NOT NULL,
  status       text NOT NULL             -- approved | rejected
);

CREATE TABLE reviews (
  id         int PRIMARY KEY,
  order_id   int NOT NULL REFERENCES orders(id),
  product_id int NOT NULL REFERENCES products(id),
  rating     int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_on date NOT NULL,
  comment    text                        -- NULL: stars only
);

CREATE TABLE web_sessions (
  id             int PRIMARY KEY,
  customer_id    int REFERENCES customers(id),   -- NULL: guest
  started_at     timestamp NOT NULL,
  device         text NOT NULL,                  -- mobile | desktop
  source         text NOT NULL,                  -- ads | organic | social | email
  viewed_product boolean NOT NULL,
  added_to_cart  boolean NOT NULL,
  order_id       int REFERENCES orders(id)       -- set when the session ended in an order
);

CREATE TABLE ad_spend (
  month   date NOT NULL,                 -- first day of the month
  channel text NOT NULL,                 -- ads | social | referral
  amount  numeric(14,0) NOT NULL,
  PRIMARY KEY (month, channel)
);
