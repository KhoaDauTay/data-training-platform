CREATE TABLE ports (
  code text PRIMARY KEY,
  name text NOT NULL,
  country text NOT NULL,
  region text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('SEAPORT', 'AIRPORT')),
  base_transit_days int NOT NULL
);

CREATE TABLE carriers (
  id int PRIMARY KEY,
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  mode text NOT NULL CHECK (mode IN ('SEA', 'AIR'))
);

CREATE TABLE employees (
  id int PRIMARY KEY,
  full_name text NOT NULL,
  dept text NOT NULL,
  title text NOT NULL,
  manager_id int REFERENCES employees(id),
  hired_at date NOT NULL
);

CREATE TABLE customers (
  id int PRIMARY KEY,
  name text NOT NULL,
  industry text NOT NULL,
  city text NOT NULL,
  country text NOT NULL,
  sales_rep_id int NOT NULL REFERENCES employees(id),
  created_at date NOT NULL
);

CREATE TABLE shipments (
  id int PRIMARY KEY,
  ref text NOT NULL UNIQUE,
  customer_id int NOT NULL REFERENCES customers(id),
  direction text NOT NULL CHECK (direction IN ('EXPORT', 'IMPORT')),
  mode text NOT NULL CHECK (mode IN ('SEA', 'AIR')),
  load_type text CHECK (load_type IN ('FCL', 'LCL')),
  pol text NOT NULL REFERENCES ports(code),
  pod text NOT NULL REFERENCES ports(code),
  carrier_id int NOT NULL REFERENCES carriers(id),
  incoterm text NOT NULL,
  sales_rep_id int NOT NULL REFERENCES employees(id),
  booking_date date NOT NULL,
  etd date NOT NULL,
  eta date NOT NULL,
  atd date,
  ata date,
  status text NOT NULL CHECK (status IN ('BOOKED', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED', 'CANCELLED')),
  gross_weight_kg numeric(10, 2) NOT NULL,
  volume_cbm numeric(8, 2) NOT NULL
);

CREATE TABLE containers (
  id int PRIMARY KEY,
  container_no text NOT NULL UNIQUE,
  shipment_id int NOT NULL REFERENCES shipments(id),
  container_type text NOT NULL CHECK (container_type IN ('20GP', '40GP', '40HC', '40RF')),
  teu int NOT NULL,
  gross_weight_kg numeric(10, 2) NOT NULL
);

-- Plan 2 (chapters 4-6): ops, customs and documents. Seed blocks for them are appended at the end of seed.sql.
CREATE TABLE shipment_events (
  id int PRIMARY KEY,
  shipment_id int NOT NULL REFERENCES shipments(id),
  event text NOT NULL CHECK (event IN ('DEPARTED', 'ARRIVED', 'DELIVERED')),
  event_date date NOT NULL
);

CREATE TABLE trucking_orders (
  id int PRIMARY KEY,
  shipment_id int NOT NULL REFERENCES shipments(id),
  order_date date NOT NULL
);

CREATE TABLE cfs_receipts (
  id int PRIMARY KEY,
  shipment_id int NOT NULL REFERENCES shipments(id),
  received_date date NOT NULL,
  packages int NOT NULL,
  volume_cbm numeric(8, 2) NOT NULL,
  cargo_desc text NOT NULL
);

CREATE TABLE hs_codes (
  code text PRIMARY KEY,
  description text NOT NULL
);

CREATE TABLE duties_taxes (
  hs_code text PRIMARY KEY REFERENCES hs_codes(code),
  import_duty_pct numeric(5, 2) NOT NULL,
  vat_pct numeric(5, 2) NOT NULL
);

CREATE TABLE customs_declarations (
  id int PRIMARY KEY,
  decl_no text NOT NULL UNIQUE,
  shipment_id int NOT NULL REFERENCES shipments(id),
  hs_code text NOT NULL REFERENCES hs_codes(code),
  lane text NOT NULL CHECK (lane IN ('GREEN', 'YELLOW', 'RED')),
  submitted_date date NOT NULL,
  cleared_date date,
  declared_value_usd numeric(12, 2) NOT NULL,
  amended_from_id int REFERENCES customs_declarations(id)
);

CREATE TABLE incoterms (
  code text PRIMARY KEY,
  name text NOT NULL,
  sea_only boolean NOT NULL
);

-- Plan 3 (chapters 7-9): pricing, receivables/payables, bills of lading. Seed blocks for them are appended at the end of seed.sql.
CREATE TABLE exchange_rates (
  currency text NOT NULL CHECK (currency IN ('USD', 'EUR')),
  rate_date date NOT NULL,
  vnd_per_unit numeric(10, 2) NOT NULL,
  PRIMARY KEY (currency, rate_date)
);

CREATE TABLE rate_contracts (
  id int PRIMARY KEY,
  pol text NOT NULL REFERENCES ports(code),
  pod text NOT NULL REFERENCES ports(code),
  container_type text NOT NULL CHECK (container_type IN ('20GP', '40GP', '40HC', '40RF')),
  valid_from date NOT NULL,
  valid_to date NOT NULL,
  buy_usd numeric(10, 2) NOT NULL
);

CREATE TABLE quotations (
  id int PRIMARY KEY,
  quote_no text NOT NULL UNIQUE,
  customer_id int NOT NULL REFERENCES customers(id),
  sales_rep_id int NOT NULL REFERENCES employees(id),
  pol text NOT NULL REFERENCES ports(code),
  pod text NOT NULL REFERENCES ports(code),
  container_type text NOT NULL CHECK (container_type IN ('20GP', '40GP', '40HC', '40RF')),
  quote_date date NOT NULL,
  sell_usd numeric(10, 2) NOT NULL,
  shipment_id int REFERENCES shipments(id)
);

CREATE TABLE invoices (
  id int PRIMARY KEY,
  invoice_no text NOT NULL UNIQUE,
  shipment_id int NOT NULL REFERENCES shipments(id),
  customer_id int NOT NULL REFERENCES customers(id),
  issue_date date NOT NULL,
  due_date date NOT NULL,
  amount_vnd numeric(14, 0) NOT NULL
);

CREATE TABLE payments (
  id int PRIMARY KEY,
  invoice_id int NOT NULL REFERENCES invoices(id),
  pay_date date NOT NULL,
  amount_vnd numeric(14, 0) NOT NULL
);

CREATE TABLE vendor_bills (
  id int PRIMARY KEY,
  bill_no text NOT NULL UNIQUE,
  shipment_id int NOT NULL REFERENCES shipments(id),
  bill_date date NOT NULL,
  currency text NOT NULL CHECK (currency IN ('USD', 'EUR')),
  amount numeric(12, 2) NOT NULL
);

CREATE TABLE master_bills (
  id int PRIMARY KEY,
  mbl_no text NOT NULL UNIQUE,
  carrier_id int NOT NULL REFERENCES carriers(id),
  pol text NOT NULL REFERENCES ports(code),
  pod text NOT NULL REFERENCES ports(code),
  issue_date date NOT NULL,
  gross_weight_kg numeric(12, 2) NOT NULL
);

CREATE TABLE house_bills (
  id int PRIMARY KEY,
  hbl_no text NOT NULL UNIQUE,
  master_bill_id int NOT NULL REFERENCES master_bills(id),
  shipment_id int NOT NULL UNIQUE REFERENCES shipments(id),
  issue_date date NOT NULL,
  gross_weight_kg numeric(10, 2) NOT NULL
);

-- Plan 4 (chapters 10-12): container tracking, free time (D&D), claims. Seed blocks for them are appended at the end of seed.sql.
CREATE TABLE free_time_terms (
  id int PRIMARY KEY,
  customer_id int NOT NULL REFERENCES customers(id),
  valid_from date NOT NULL,
  valid_to date NOT NULL,
  free_days int NOT NULL,
  usd_per_day numeric(8, 2) NOT NULL
);

-- ~145k rows: the seed bulk-loads it first and adds the primary key and the foreign key afterwards (3x faster).
-- Deliberately no index on container_id: that is the chapter 11 index lab.
CREATE TABLE container_events (
  id int NOT NULL,
  container_id int NOT NULL,
  event text NOT NULL CHECK (event IN ('GATE_OUT_EMPTY', 'GATE_IN_FULL', 'LOADED', 'DISCHARGED', 'GATE_OUT_FULL', 'EMPTY_RETURNED')),
  event_time timestamp NOT NULL
);

CREATE TABLE claims (
  id int PRIMARY KEY,
  claim_no text NOT NULL UNIQUE,
  shipment_id int NOT NULL REFERENCES shipments(id),
  claim_date date NOT NULL,
  reason text NOT NULL CHECK (reason IN ('DAMAGE', 'SHORTAGE', 'DELAY')),
  amount_usd numeric(10, 2) NOT NULL
);

-- Plan 5 (lanes, seed option B, L48): two small hand-written tables for the lane side tasks. Seed block at the end of seed.sql.
-- One row per lane from a Vietnamese seaport, valid both ways. via_port NULL = direct sailing.
CREATE TABLE lane_profiles (
  pol text NOT NULL REFERENCES ports(code),
  pod text NOT NULL REFERENCES ports(code),
  distance_nm int NOT NULL,
  via_port text REFERENCES ports(code),
  sea_days numeric(4, 1) NOT NULL,
  fuel_t_per_day numeric(5, 1) NOT NULL,
  vessel_teu int NOT NULL,
  PRIMARY KEY (pol, pod)
);

-- Monthly bunker (ship fuel) price, first day of the month.
CREATE TABLE bunker_prices (
  month date PRIMARY KEY,
  usd_per_tonne numeric(7, 2) NOT NULL
);
