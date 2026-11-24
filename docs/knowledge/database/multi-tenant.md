# Multi-tenant database design: models, keys, per-tenant uniqueness

Status: verified (examples; prose from the primary sources listed in §5). ```` ```sql ```` blocks ran in order on PGlite 0.5.16 (PostgreSQL 18.6) with asserted `-- expect:` lines (`node ~/.claude/skills/sql/scripts/run.mjs multi-tenant.md`). Blocks marked `norun` need a real server.

Scope (v34, first draft): tenancy models, `tenant_id` in keys, uniqueness per tenant. Row-level security, the tenant setting under a connection pool, schema-per-tenant operations, partitioning by tenant, offboarding and the NoSQL side come in later releases; RLS basics are in [security.md](security.md) §3. BoonData lessons: `e-ds-l2-06`, `e-ds-l2-07`, `e-ds-l4-08` … `e-ds-l4-11` (Design track); `e-pg-l5-10` (RLS); card S10.

Vocabulary: a **tenant** is a customer organisation whose data must stay apart from every other one; **multi-tenancy** is one system serving many tenants. Examples use a neutral marketplace: sellers are tenants.

## 1. Tenancy models

| Model | Data layout | Isolation | Cost per tenant | Operations | Fits |
|---|---|---|---|---|---|
| **Silo** | a database (or cluster) per tenant | strongest: own credentials, backups, region | highest (fixed cost × tenants) | every migration, backup and pool × N | a few large, regulated or contract-bound tenants |
| **Bridge** (storage sense) | one database, a schema per tenant | logical: namespaces, per-schema privileges | medium | migrations × N schemas; the catalog grows with tenants × tables | tens of tenants that need per-tenant customisation |
| **Pool** | shared tables, every row has `tenant_id` | logical: query filters, composite keys, RLS | lowest | one migration; per-tenant export/restore becomes a data job | many small, similar tenants |

- The AWS SaaS Lens uses *silo* (dedicated resources) and *pool* (shared resources), and *bridge* for a mix of the two per service or tier. Older AWS storage guidance used *bridge* for schema-per-tenant. Say which meaning you use (https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/silo-pool-and-bridge-models.html).
- Real systems mix: small tenants pooled, large or regulated tenants alone, **with one table design everywhere**. A tier is then only where a tenant is placed, and moving a tenant is a data copy plus one routing-table change.
- Tenancy (who the tenant is) and isolation (the tenant cannot reach another's data) are separate concerns (AWS SaaS Tenant Isolation Strategies whitepaper, https://docs.aws.amazon.com/pdfs/whitepapers/latest/saas-tenant-isolation-strategies/saas-tenant-isolation-strategies.pdf).
- PostgreSQL cannot query across databases on one connection, so a silo needs a connection pool per tenant (https://www.postgresql.org/docs/18/manage-ag-overview.html).
- Schema-per-tenant relies on `search_path`, which is session state: a pooled connection that still points at the previous tenant's schema reads that tenant's rows without any error (https://www.postgresql.org/docs/18/ddl-schemas.html).

```sql
-- expect: [["public","1"],["seller_a","1"],["seller_b","1"]]
CREATE TABLE invoices (tenant_id int NOT NULL, id int NOT NULL, amount int NOT NULL, PRIMARY KEY (tenant_id, id));
CREATE SCHEMA seller_a;
CREATE SCHEMA seller_b;
CREATE TABLE seller_a.invoices (id int PRIMARY KEY, amount int NOT NULL);
CREATE TABLE seller_b.invoices (id int PRIMARY KEY, amount int NOT NULL);
SELECT table_schema, count(*) FROM information_schema.tables
WHERE table_name = 'invoices' GROUP BY 1 ORDER BY 1;
```

```sql norun
-- Silo: one database per tenant; the application opens a separate connection (and pool) to each.
CREATE DATABASE seller_a;
```

## 2. `tenant_id` in the keys

- Every tenant-owned table has `tenant_id … NOT NULL` and a primary key that **starts** with it: `PRIMARY KEY (tenant_id, id)`. Each tenant numbers its own rows, one tenant's rows sit together in the key's B-tree, and moving a tenant to another database cannot collide on ids.
- Children reference parents with a **composite foreign key**: `FOREIGN KEY (tenant_id, customer_id) REFERENCES customers (tenant_id, id)`. Both columns must match, so a row can never point at another tenant's parent. A single-column foreign key on `id` cannot see the tenant (https://www.postgresql.org/docs/18/ddl-constraints.html#DDL-CONSTRAINTS-FK).
- A composite foreign key gets no index on the child side automatically; create one, or deleting a parent scans the child table.
- Join tenant tables on both columns. A join on `id` alone matches rows of every tenant with the same number.
- Keep foreign keys acyclic (parent → child) so a whole tenant can be copied parents-first and deleted in reverse.
- A CI gate can read `pg_constraint` and fail when a tenant table's primary or foreign key does not start with `tenant_id`.

Single-column foreign key: the cross-tenant reference is accepted.

```sql
-- expect: [["1"]]
CREATE TABLE clients (id int PRIMARY KEY, tenant_id int NOT NULL);
INSERT INTO clients VALUES (10, 1), (20, 2);
CREATE TABLE sales (tenant_id int NOT NULL, id int NOT NULL, client_id int REFERENCES clients, PRIMARY KEY (tenant_id, id));
INSERT INTO sales VALUES (1, 1, 20);
SELECT count(*) FROM sales s JOIN clients c ON c.id = s.client_id WHERE c.tenant_id <> s.tenant_id;
```

Composite foreign key: the same row is refused.

```sql
-- expect: error 23503
DELETE FROM sales;
ALTER TABLE clients ADD UNIQUE (tenant_id, id);
ALTER TABLE sales ADD FOREIGN KEY (tenant_id, client_id) REFERENCES clients (tenant_id, id);
INSERT INTO sales VALUES (1, 1, 20);
```

A join that forgets the tenant multiplies rows across tenants (3 tenants × 4 invoices, each invoice matched to the payment with the same number at every tenant):

```sql
-- expect: [["12","4"]]
CREATE TABLE bills (tenant_id int NOT NULL, id int NOT NULL, PRIMARY KEY (tenant_id, id));
CREATE TABLE pays (tenant_id int NOT NULL, id int NOT NULL, bill_id int NOT NULL, PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, bill_id) REFERENCES bills (tenant_id, id));
INSERT INTO bills SELECT t, i FROM generate_series(1, 3) t, generate_series(1, 4) i;
INSERT INTO pays SELECT t, i, i FROM generate_series(1, 3) t, generate_series(1, 4) i;
SELECT (SELECT count(*) FROM bills b JOIN pays p ON p.bill_id = b.id WHERE b.tenant_id = 2),
       (SELECT count(*) FROM bills b JOIN pays p ON p.tenant_id = b.tenant_id AND p.bill_id = b.id WHERE b.tenant_id = 2);
```

## 3. Uniqueness per tenant

- In a pool, "unique" nearly always means unique **within one tenant**: `UNIQUE (tenant_id, email)`. A global `UNIQUE (email)` refuses a valid customer of a second tenant.
- Unique, primary key and foreign key checks are not filtered by row-level security (https://www.postgresql.org/docs/18/ddl-rowsecurity.html), so a global unique error tells one tenant that a value exists at another: a leak channel even when no row can be read.
- Case-insensitive: a unique index on the expression `(tenant_id, lower(email))` (https://www.postgresql.org/docs/18/indexes-expressional.html).
- Optional values stored as `''`: a partial unique index `WHERE code <> ''` (https://www.postgresql.org/docs/18/indexes-partial.html). Stored as `NULL`, no condition is needed (NULLs are distinct by default); `NULLS NOT DISTINCT` makes them collide (PostgreSQL 15+).
- A rule that is truly global across tenants (a serial number only one tenant may register) has no home once tenants live in different databases; it needs a separate, tenant-independent lookup table written with a condition.

```sql
-- expect: error 23505
CREATE TABLE buyers_global (tenant_id int NOT NULL, email text NOT NULL UNIQUE);
INSERT INTO buyers_global VALUES (1, 'an@mail.vn');
INSERT INTO buyers_global VALUES (2, 'an@mail.vn');
```

```sql
-- expect: [["2"]]
CREATE TABLE buyers (tenant_id int NOT NULL, email text NOT NULL, UNIQUE (tenant_id, email));
INSERT INTO buyers VALUES (1, 'an@mail.vn'), (2, 'an@mail.vn');
SELECT count(*) FROM buyers;
```

```sql
-- expect: [["1"]]
CREATE TABLE buyers_ci (tenant_id int NOT NULL, email text NOT NULL);
CREATE UNIQUE INDEX buyers_ci_email ON buyers_ci (tenant_id, lower(email));
INSERT INTO buyers_ci VALUES (1, 'an@mail.vn');
INSERT INTO buyers_ci VALUES (1, 'An@mail.vn') ON CONFLICT (tenant_id, lower(email)) DO NOTHING;
SELECT count(*) FROM buyers_ci;
```

```sql
-- expect: [["3"]]
CREATE TABLE shoppers (tenant_id int NOT NULL, id int NOT NULL, tax_code text NOT NULL DEFAULT '', PRIMARY KEY (tenant_id, id));
INSERT INTO shoppers VALUES (1, 1, ''), (1, 2, ''), (1, 3, '0101');
CREATE UNIQUE INDEX shoppers_tax ON shoppers (tenant_id, tax_code) WHERE tax_code <> '';
SELECT count(*) FROM shoppers;
```

## 4. Choosing

- Tenant count, size spread, contracts/residency and service tier decide the model; the answer is usually a mix.
- Design day one as if the largest tenant must move tomorrow: `tenant_id` first in every key makes one tenant's data selectable and movable as a unit.
- Measure before moving: a `GROUP BY tenant_id` over the busiest table shows who carries the load; an index that leads with `tenant_id` (equality first, then range) keeps each tenant's page fast in the meantime (https://www.postgresql.org/docs/18/indexes-multicolumn.html).

## 5. Sources

- AWS Well-Architected SaaS Lens, silo, pool and bridge models: https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/silo-pool-and-bridge-models.html
- AWS SaaS Tenant Isolation Strategies (PDF): https://docs.aws.amazon.com/pdfs/whitepapers/latest/saas-tenant-isolation-strategies/saas-tenant-isolation-strategies.pdf
- PostgreSQL 18, constraints: https://www.postgresql.org/docs/18/ddl-constraints.html
- PostgreSQL 18, schemas and `search_path`: https://www.postgresql.org/docs/18/ddl-schemas.html
- PostgreSQL 18, databases: https://www.postgresql.org/docs/18/manage-ag-overview.html
- PostgreSQL 18, row security policies: https://www.postgresql.org/docs/18/ddl-rowsecurity.html
- PostgreSQL 18, unique, expression, partial and multicolumn indexes: https://www.postgresql.org/docs/18/indexes-unique.html, https://www.postgresql.org/docs/18/indexes-expressional.html, https://www.postgresql.org/docs/18/indexes-partial.html, https://www.postgresql.org/docs/18/indexes-multicolumn.html
