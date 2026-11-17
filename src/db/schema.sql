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
