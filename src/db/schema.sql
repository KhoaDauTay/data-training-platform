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
