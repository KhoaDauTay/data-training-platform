-- Tín dụng Hũ Bạc (Silver Jar Credit): consumer-finance domain, schema `finance` (Plan 11).
-- Created by ensureSchema after `SET search_path TO finance`; table names are bare, like the other domains.
-- Money is VND (numeric(14,0)). Status/channel/method codes are lowercase ASCII words.

CREATE TABLE branches (
  id        int PRIMARY KEY,
  name      text NOT NULL UNIQUE,
  city      text NOT NULL,
  region    text NOT NULL,            -- north | central | south
  opened_on date NOT NULL
);

CREATE TABLE products (
  id             int PRIMARY KEY,
  code           text NOT NULL UNIQUE,
  name           text NOT NULL,
  kind           text NOT NULL,       -- cash | instalment
  rate_month_pct numeric(4,2) NOT NULL, -- flat interest per month, % of principal
  min_term       int NOT NULL,
  max_term       int NOT NULL
);

CREATE TABLE customers (
  id             int PRIMARY KEY,
  full_name      text NOT NULL,
  birth_year     int NOT NULL,
  city           text NOT NULL,
  monthly_income numeric(14,0),       -- NULL: not declared
  joined_on      date NOT NULL,
  home_branch_id int NOT NULL REFERENCES branches(id)
);

CREATE TABLE applications (
  id          int PRIMARY KEY,
  customer_id int NOT NULL REFERENCES customers(id),
  product_id  int NOT NULL REFERENCES products(id),
  branch_id   int NOT NULL REFERENCES branches(id),
  applied_on  date NOT NULL,
  amount      numeric(14,0) NOT NULL,
  term_months int NOT NULL,
  score       int NOT NULL,           -- credit score 300-850 at application time
  channel     text NOT NULL,          -- branch | app | partner
  decision    text NOT NULL           -- approved | rejected | cancelled
);

CREATE TABLE loans (
  id             int PRIMARY KEY,
  code           text NOT NULL UNIQUE,
  application_id int NOT NULL UNIQUE REFERENCES applications(id),
  customer_id    int NOT NULL REFERENCES customers(id),
  product_id     int NOT NULL REFERENCES products(id),
  branch_id      int NOT NULL REFERENCES branches(id),
  disbursed_on   date NOT NULL,
  principal      numeric(14,0) NOT NULL,
  term_months    int NOT NULL,
  rate_month_pct numeric(4,2) NOT NULL,
  status         text NOT NULL,       -- active | closed | written_off
  closed_on      date                 -- NULL while active
);

CREATE TABLE schedules (
  id            int PRIMARY KEY,
  loan_id       int NOT NULL REFERENCES loans(id),
  instalment_no int NOT NULL,
  due_on        date NOT NULL,
  principal_due numeric(14,0) NOT NULL,
  interest_due  numeric(14,0) NOT NULL,
  UNIQUE (loan_id, instalment_no)
);

CREATE TABLE repayments (
  id          int PRIMARY KEY,
  schedule_id int NOT NULL UNIQUE REFERENCES schedules(id),
  loan_id     int NOT NULL REFERENCES loans(id),
  paid_on     date NOT NULL,
  amount      numeric(14,0) NOT NULL,
  method      text NOT NULL           -- cash | bank_transfer | ewallet | auto_debit
);

CREATE TABLE loan_snapshots (
  loan_id     int NOT NULL REFERENCES loans(id),
  month_end   date NOT NULL,
  outstanding numeric(14,0) NOT NULL, -- principal not yet repaid at month_end
  dpd         int NOT NULL,           -- days past due of the oldest unpaid instalment due by month_end (0 = none)
  PRIMARY KEY (loan_id, month_end)
);

CREATE TABLE accounts (
  id   int PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  kind text NOT NULL                  -- income | expense
);

CREATE TABLE budgets (
  branch_id  int NOT NULL REFERENCES branches(id),
  account_id int NOT NULL REFERENCES accounts(id),
  month      date NOT NULL,           -- first day of the month
  amount     numeric(14,0) NOT NULL,
  PRIMARY KEY (branch_id, account_id, month)
);

CREATE TABLE gl_entries (
  id         int PRIMARY KEY,
  branch_id  int NOT NULL REFERENCES branches(id),
  account_id int NOT NULL REFERENCES accounts(id),
  posted_on  date NOT NULL,
  amount     numeric(14,0) NOT NULL,  -- always positive; accounts.kind says income or expense
  memo       text NOT NULL
);

CREATE TABLE collection_calls (
  id        int PRIMARY KEY,
  loan_id   int NOT NULL REFERENCES loans(id),
  called_on date NOT NULL,
  outcome   text NOT NULL             -- promise | no_answer | refused | paid
);
