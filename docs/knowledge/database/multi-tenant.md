# Multi-tenant database design: models, keys, isolation, NoSQL keys, platform

Status: verified (examples; prose from the primary sources listed in §5). ```` ```sql ```` blocks ran in order on PGlite 0.5.16 (PostgreSQL 18.6) with asserted `-- expect:` lines (`node ~/.claude/skills/sql/scripts/run.mjs multi-tenant.md`). Blocks marked `norun` need a real server.

Scope: tenancy models, `tenant_id` in keys, uniqueness per tenant (v34); row-level security and the tenant setting behind a pool (§4–§5, v35); the tenant in NoSQL keys (§6, v36); the platform around the shards: catalog, lifecycle, provisioning, routing, per-shard migrations, cost tags (§7, v37). RLS basics are also in [security.md](security.md) §3. BoonData lessons: `e-ds-l2-06`, `e-ds-l2-07`, `e-ds-l4-08` … `e-ds-l4-11`, `e-ds-l5-08` … `e-ds-l5-11` (Design track); `e-pg-l5-10`, `e-pg-l5-19`, `e-pg-l5-20` (RLS, pooling); `e-mg-l3-19`, `e-mg-l5-12`; `e-dy-l3-14`, `e-dy-l4-16`, `e-dy-l5-09`; cards S10, X08, M39. Only `sql` blocks run; `js` and `json` blocks are shown, not run.

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

## 4. Row-level security in a pool (PostgreSQL)

- RLS is the net for the query that forgets its `WHERE tenant_id = …`; keys and filters are still needed, because unique and foreign key checks do not go through policies (§3).
- **Who skips policies:** superusers, roles with `BYPASSRLS`, and the table owner unless the table has `FORCE ROW LEVEL SECURITY`. The application's role must therefore not own the tables and must not have `BYPASSRLS`. Keep three roles: a migration owner, an application role, and an audited support role (https://www.postgresql.org/docs/18/ddl-rowsecurity.html, https://www.postgresql.org/docs/18/sql-createrole.html).
- **Default deny:** RLS on and no policy that applies = no rows.
- **`USING` and `WITH CHECK`:**
  - `USING` filters the rows a command can see or target. A row it hides is skipped silently, so an `UPDATE` can report 0 rows.
  - `WITH CHECK` tests new rows and fails with `42501`. Without it, a `FOR ALL`/`UPDATE` policy reuses `USING` as the check.
- **Several policies:** permissive policies are combined with OR, so one broad "support can read everything" policy widens every command it covers. A rule that must always hold is written `AS RESTRICTIVE` (combined with AND). Scope extra policies with `FOR SELECT` and `TO role` (https://www.postgresql.org/docs/18/sql-createpolicy.html).
- **Speed:** keep indexes that lead with `tenant_id`, and wrap the setting in a scalar subquery, `(SELECT current_setting(…))`, so the planner evaluates it once and can use it as an index condition.
- **Limit:** RLS stops bugs, not a forged tenant. If an attacker can set the tenant setting (SQL injection, a header the backend trusts), RLS scopes to the forged tenant. The tenant must come from a verified identity, such as a signed token claim.
- A view is run with its owner's rights, so a plain view over an RLS table owned by a superuser shows every tenant; `WITH (security_invoker = true)` runs it with the caller's policies (https://www.postgresql.org/docs/18/sql-createview.html).

The owner is filtered only after `FORCE`; a normal role sees only its tenant (PGlite connects as a superuser, so the demo switches role):

```sql
-- expect: [["2"]]
CREATE ROLE app NOLOGIN;
CREATE TABLE notes (tenant_id int NOT NULL, id int NOT NULL, PRIMARY KEY (tenant_id, id));
INSERT INTO notes SELECT t, i FROM generate_series(1, 3) t, generate_series(1, 2) i;
GRANT SELECT ON notes TO app;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY notes_rows ON notes TO app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::int);
SET app.tenant_id = '2';
SET ROLE app;
SELECT count(*) FROM notes;
```

```sql
-- expect: [["0"]]
RESET ROLE;
RESET app.tenant_id;
SET ROLE app;
SELECT count(*) FROM notes;
```

## 5. The current tenant behind a connection pool

- `SET LOCAL x = …` and `set_config('x', …, true)` last until the transaction ends; `SET` and `set_config(…, false)` last for the session (https://www.postgresql.org/docs/18/sql-set.html, https://www.postgresql.org/docs/18/functions-admin.html#FUNCTIONS-ADMIN-SET).
- Behind a pool, a session `SET` leaks: the next request that borrows the connection inherits the previous tenant. Bind the tenant per transaction: `BEGIN; SET LOCAL app.tenant_id = '…'; …; COMMIT;`.
- `current_setting(name)` fails with `42704` when the setting was never defined (loud). With `missing_ok = true` it returns `NULL`, so a policy matches nothing (closed, silent).
- Once a session has defined the setting (for example by a `SET LOCAL` that ended), reading it returns `''`, not `NULL`, and `''::int` fails with `22P02`. `NULLIF(current_setting('app.tenant_id', true), '')::int` makes both cases the same: no tenant, no rows, no error. Pick loud or silent on purpose, and keep the setting's name in one constant: a typo with `missing_ok = true` is silent forever.
- Poolers differ. A transaction-mode pooler does not keep session state between transactions, which is exactly why `SET LOCAL` fits it. Some proxies "pin" a client to one server connection when they see session state, and the exact statements that pin differ by product (one documents that `set_config(…, true)` pins while `SET LOCAL` inside `BEGIN … COMMIT` does not). Read your pooler's documentation before choosing the statement, and watch its pinning metric (https://www.pgbouncer.org/features.html, https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy-pinning.html).
- A data fix that commits several times must bind the tenant again after every commit, or bind it per session on a connection it does not return to a pool.
- A job running under RLS cannot discover tenants by itself, because RLS hides them: give it the tenant list, or run discovery as a separate audited role.

```sql
-- expect: [["","true"]]
RESET ROLE;
BEGIN;
SET LOCAL app.region = 'north';
COMMIT;
SELECT current_setting('app.region', true),
       NULLIF(current_setting('app.region', true), '') IS NULL;
```

## 6. NoSQL: the tenant in the key

MongoDB (https://www.mongodb.com/docs/atlas/build-multi-tenant-arch/, https://www.mongodb.com/docs/manual/core/zone-sharding/):
- For a growing number of similar tenants, MongoDB recommends shared collections with a `tenantId` field in every document, every filter and every write. Isolation then lives in the application: one database user can read every tenant.
- Every compound index starts with `tenantId` (the equality field first, then sort and range fields), and so does the shard key. Without the prefix a tenant query reads every tenant's keys.
- A database per tenant fits a small, stable set (up to a few hundred tenants by MongoDB's guidance): per-tenant users, backups and indexes, but each collection and index is a file, so watch the files per node. Avoid a collection per tenant in one database.
- Zone sharding pins ranges of the shard key to chosen shards. Because zones follow the shard key prefix, a key that starts with `tenantId` lets one tenant's range sit on dedicated or regional hardware.

```js
db.orders.createIndex({ tenantId: 1, status: 1, createdAt: -1 })
db.orders.find({ tenantId: "t-04", status: "open" }).sort({ createdAt: -1 })
```

DynamoDB (https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/specifying-conditions.html, https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-sharding.html):
- Put the tenant in the partition key: `PK = TENANT#t-04`, `SK = ORDER#2026-10-25#81`. A tenant's items are then one `Query`; a `Scan` with a filter on the tenant still reads (and bills) every tenant.
- Global secondary indexes need the tenant prefix too (`GSI1PK = TENANT#t-04#STATUS#open`); an index keyed only by status mixes tenants.
- Hot tenants: one large tenant on one partition key value concentrates load on one partition. Spread only that tenant's writes with a suffix (`TENANT#t-04#3`); a suffix computed from an attribute keeps point reads cheap, a random one means reading every suffix and merging. A small tenant → shard-count lookup lets only big tenants pay for the fan-out. AWS publishes per-partition throughput limits; check the current numbers in its docs rather than quoting old ones.
- `dynamodb:LeadingKeys` in an IAM policy limits a caller to items whose partition key equals its tenant. `ForAllValues:StringEquals` is also true when the key is absent, and a `Scan` carries no leading key, so add a `"Null": {"dynamodb:LeadingKeys": "false"}` condition and never grant `Scan`. It only works when every key, table and index, starts with the tenant.
- A table per tenant gives per-tenant settings, backups and a small blast radius, but tables per account and region have a quota (https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ServiceQuotas.html), and alarms and capacity multiply by tenants. Cost tags attach to tables, so a shared table needs per-tenant metering in the application (for example from `ReturnConsumedCapacity`).

```json
{
  "TableName": "Portal",
  "KeyConditionExpression": "PK = :t",
  "ExpressionAttributeValues": { ":t": { "S": "TENANT#t-04" } }
}
```

## 7. The platform around the shards

**Catalog.** One service owns the tenant → shard directory and the shard catalog (tier, state, schema version, proxy address). Infrastructure code creates clusters and reports them; the registry validates and writes the catalog, and never trusts tags blindly. A cluster that exists but is not registered receives no tenants, which makes it safe. Keep where a tenant lives over time (a date range per placement) so one tenant has one home at any moment: an exclusion constraint `EXCLUDE USING gist (tenant_id WITH =, during WITH &&)` (needs `btree_gist` for `=` on a plain column), or, without the extension, a partial unique index on the open placement (https://www.postgresql.org/docs/18/rangetypes.html#RANGETYPES-CONSTRAINT).

```sql
-- expect: error 23505
CREATE TABLE placements (tenant_id text NOT NULL, shard_id text NOT NULL, during daterange NOT NULL,
  PRIMARY KEY (tenant_id, during));
CREATE UNIQUE INDEX one_open_home ON placements (tenant_id) WHERE upper_inf(during);
INSERT INTO placements VALUES ('t-04', 's2', '[2026-01-20,)');
INSERT INTO placements VALUES ('t-04', 's3', '[2026-09-01,)');
```

**Shard lifecycle.** Creating → schema applied → serving → draining → retired. Draining keeps serving the tenants it has and takes no new ones. A shard that ever held tenant data is never destroyed in place: it drains, is verified empty, gets a final snapshot, then retires. Failures are acceptable only before a shard serves.

**Tier placement.** Shared and dedicated shards come from one infrastructure module with different inputs (size, backup retention, account, region), never a fork; residency is a parameter. A new tenant goes to the least-loaded serving shard of its tier below a capacity watermark; a tenant that outgrows its tier moves to a dedicated shard with the same id.

**Provisioning.** Each shard is a fixed unit: cluster, its own pooling proxy, a versioned parameter profile, an encryption key, a secret per database role, baseline alarms, deletion protection and a mandatory final snapshot. The bootstrap creates roles but no tables, creates each role before granting to it, and sets ownership and default privileges in one session. Test it on a brand-new environment: where the roles already exist, a wrong order passes.

```sql
-- expect: error 42704
GRANT SELECT ON notes TO router_ro;
```

**Proxy and routing.** One pooler per shard, not a cross-shard router; it bounds the connection count (tasks × pools × shards against `max_connections`). Migrations connect directly to the writer as the owner. The routing catalog holds only proxy addresses, so applications cannot fall back to the writer when the proxy is down, and health checks follow the same path as applications. The router reads the tenant from the verified identity and looks the shard up; tokens carry identity, never placement, because placement changes during a move while tokens live on. A move is: block the tenant's writes, copy in keyset batches, compare counts and hashes, flip one catalog row with a version check, verify routing, purge the source last.

**Migrations per shard.** The runner reads its targets from the registry, never from hand-written host lists. It tries one low-risk shard first, then the rest one at a time, and halts on the first failure or drift. It fails when the registry does not answer or the migrations folder is missing, and "0 applied" when changes were expected is a failure, not a success. Judge a run by an explicit result line, not only the exit code. Promote a shard to serving through a checked step (schema version, roles, forced RLS, proxy health), never by editing the catalog by hand. Schema changes follow expand → deploy code that reads both shapes → backfill → contract; data fixes are idempotent, resumable, tenant-bound and recorded per shard.

```sql
-- expect: [["11"]]
CREATE TABLE job_runs (run_id int PRIMARY KEY, exit_code int NOT NULL, applied int NOT NULL, expected int NOT NULL);
INSERT INTO job_runs VALUES (11, 0, 3, 3), (12, 0, 1, 3), (13, 1, 0, 3), (14, 0, 0, 0);
SELECT run_id FROM job_runs WHERE exit_code = 0 AND applied = expected AND expected > 0;
```

**Cost tags.** Tag every resource with shard id, tier, environment and owner, and turn those tags on for cost allocation. A shard's cost is the denominator for capacity and pricing; split it across tenants by their measured usage. Fix untagged resources instead of spreading them evenly.

**Observability and safety.**
- Every log line, metric, trace and cost record carries the tenant id; alarm per shard on pool exhaustion, pinned connections and capacity saturation.
- Logical replication slots that go inactive keep WAL and block vacuum on the source; alarm on inactive slots and slot lag (https://www.postgresql.org/docs/18/logicaldecoding-explanation.html#LOGICALDECODING-REPLICATION-SLOTS). Enabling logical replication can need a server restart; applying infrastructure code alone may not be enough.
- A cache in a pooled data plane must include the tenant in every key; a cache keyed by primary key alone can serve one tenant's row to another, around RLS.
- Least privilege per job; temporary admin grants for one-off setup are removed afterwards.
- Load-test the data tier on its own: a ceiling found in the compute layer says nothing about the database's.

## 8. Choosing

- Tenant count, size spread, contracts/residency and service tier decide the model; the answer is usually a mix.
- Design day one as if the largest tenant must move tomorrow: `tenant_id` first in every key makes one tenant's data selectable and movable as a unit.
- Measure before moving: a `GROUP BY tenant_id` over the busiest table shows who carries the load; an index that leads with `tenant_id` (equality first, then range) keeps each tenant's page fast in the meantime (https://www.postgresql.org/docs/18/indexes-multicolumn.html).

## 9. Sources

- AWS Well-Architected SaaS Lens, silo, pool and bridge models: https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/silo-pool-and-bridge-models.html
- AWS SaaS Tenant Isolation Strategies (PDF): https://docs.aws.amazon.com/pdfs/whitepapers/latest/saas-tenant-isolation-strategies/saas-tenant-isolation-strategies.pdf
- PostgreSQL 18, constraints: https://www.postgresql.org/docs/18/ddl-constraints.html
- PostgreSQL 18, schemas and `search_path`: https://www.postgresql.org/docs/18/ddl-schemas.html
- PostgreSQL 18, databases: https://www.postgresql.org/docs/18/manage-ag-overview.html
- PostgreSQL 18, row security policies: https://www.postgresql.org/docs/18/ddl-rowsecurity.html
- PostgreSQL 18, CREATE POLICY, CREATE ROLE, CREATE VIEW: https://www.postgresql.org/docs/18/sql-createpolicy.html, https://www.postgresql.org/docs/18/sql-createrole.html, https://www.postgresql.org/docs/18/sql-createview.html
- PostgreSQL 18, SET and configuration functions: https://www.postgresql.org/docs/18/sql-set.html, https://www.postgresql.org/docs/18/functions-admin.html
- PostgreSQL 18, range types and exclusion constraints: https://www.postgresql.org/docs/18/rangetypes.html
- PostgreSQL 18, replication slots: https://www.postgresql.org/docs/18/logicaldecoding-explanation.html
- PgBouncer features: https://www.pgbouncer.org/features.html; AWS RDS Proxy pinning: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy-pinning.html
- MongoDB multi-tenant architecture and zone sharding: https://www.mongodb.com/docs/atlas/build-multi-tenant-arch/, https://www.mongodb.com/docs/manual/core/zone-sharding/
- DynamoDB fine-grained access, write sharding, service quotas: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/specifying-conditions.html, https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-sharding.html, https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ServiceQuotas.html
- PostgreSQL 18, unique, expression, partial and multicolumn indexes: https://www.postgresql.org/docs/18/indexes-unique.html, https://www.postgresql.org/docs/18/indexes-expressional.html, https://www.postgresql.org/docs/18/indexes-partial.html, https://www.postgresql.org/docs/18/indexes-multicolumn.html
