# Database security: injection, roles, privileges, row-level security

Status: verified (examples; prose link-checked, see [README.md](README.md#verification-levels)). ```` ```sql ```` blocks ran in order on PGlite 0.5.16 (PostgreSQL 18.6) with asserted `-- expect:` lines. Driver code (JavaScript) is not run and is marked so.

Route points: tutorialspoint SQL "Injection", MySQL "Users" section and "SQL Injection", PostgreSQL "Role & Permission" and "Privileges", SQLite "Injection" ([tutorial-routes.md](tutorial-routes.md)). Related catalogue items: X01 (parameterise), X02 (least privilege), X06 (read-only analyst), X09 (dynamic SQL with `format`), S10 (tenant RLS with `FORCE`).

## 1. SQL injection

Status: verified (SQL side); driver snippet not run.

- Injection happens when user input is pasted into SQL text, so the input can change the statement's structure (OWASP: https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html).
- Primary defence: bind parameters. The value travels separately from the SQL text and is never parsed as SQL (PostgreSQL extended query protocol, https://www.postgresql.org/docs/18/protocol-flow.html#PROTOCOL-FLOW-EXT-QUERY).
- Identifiers (table/column names) cannot be bound. Pick them from an allow-list, or quote them with `quote_ident` / `format('%I', name)`; quote literals with `%L` (https://www.postgresql.org/docs/18/functions-string.html#FUNCTIONS-STRING-FORMAT).
- Escaping by hand is not a defence; stored procedures are not a defence if they build SQL by concatenation.
- Least privilege limits the damage when something slips through (§2).

Not run (illustration of the driver API, PGlite and node-postgres both accept `$n` parameters):

```js
// wrong: input becomes SQL
db.query(`SELECT * FROM users WHERE name = '${name}'`);
// right: input is a parameter
db.query('SELECT * FROM users WHERE name = $1', [name]);
```

Dynamic SQL inside the database, done safely:

```sql
-- expect: [["SELECT count(*) FROM \"Odd Table\" WHERE note = 'x''; DROP TABLE t; --'"]]
SELECT format('SELECT count(*) FROM %I WHERE note = %L', 'Odd Table', 'x''; DROP TABLE t; --');
```

PGlite rejects multi-statement input in `query()`, which is one reason BoonData can run player SQL inside `BEGIN … ROLLBACK` safely (`runSandboxed`, `src/db/run.ts`); the index lab re-checks its statement with `isCreateIndex` before running it.

## 2. Roles and privileges

Status: verified.

- PostgreSQL has one concept, the role; a role with `LOGIN` is a user, a role without it is a group. Membership: `GRANT group_role TO user_role` (https://www.postgresql.org/docs/18/user-manag.html).
- Object owners have every privilege on their objects; others get only what is granted: `SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER` on tables, `USAGE`/`CREATE` on schemas, `EXECUTE` on functions (https://www.postgresql.org/docs/18/ddl-priv.html).
- A role needs `USAGE` on the schema as well as `SELECT` on the table.
- `ALTER DEFAULT PRIVILEGES` covers tables created later.
- Predefined roles such as `pg_read_all_data` and `pg_read_all_stats` exist for common cases (https://www.postgresql.org/docs/18/predefined-roles.html).
- Since PostgreSQL 15, `PUBLIC` no longer has `CREATE` on the `public` schema.

```sql
CREATE SCHEMA app;
CREATE TABLE app.orders (id int, tenant text, amount numeric);
INSERT INTO app.orders VALUES (1, 'a', 10), (2, 'b', 20), (3, 'a', 5);
CREATE ROLE analyst NOLOGIN;
GRANT USAGE ON SCHEMA app TO analyst;
GRANT SELECT ON app.orders TO analyst;
```

```sql
-- expect: [["3"]]
SET ROLE analyst;
SELECT count(*) FROM app.orders;
```

```sql
-- expect: error 42501
-- analyst has SELECT only
DELETE FROM app.orders;
```

```sql
RESET ROLE;
```

## 3. Row-level security

Status: verified.

- `ALTER TABLE t ENABLE ROW LEVEL SECURITY` plus `CREATE POLICY` filters which rows each role sees (`USING`) and may write (`WITH CHECK`). With RLS on and no policy, ordinary roles see nothing (https://www.postgresql.org/docs/18/ddl-rowsecurity.html).
- Superusers and roles with `BYPASSRLS` skip policies; the table owner also skips them unless `FORCE ROW LEVEL SECURITY` is set (catalogue S10).
- A common tenant pattern keys the policy on a setting: `USING (tenant = current_setting('app.tenant'))`, set per transaction with `SET LOCAL`.
- Policies are added to every query as extra conditions; index the policy column.

```sql
ALTER TABLE app.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_rows ON app.orders USING (tenant = current_setting('app.tenant', true));
```

```sql
-- expect: [["2","15"]]
SET ROLE analyst;
SET app.tenant = 'a';
SELECT count(*), sum(amount) FROM app.orders;
```

```sql
-- expect: [["0"]]
SET app.tenant = 'zzz';
SELECT count(*) FROM app.orders;
```

```sql
RESET ROLE;
```

BoonData: Engine lesson `content/engine/postgres/L5/10-row-level-security.md`; best-practice cards `content/engine/best/postgres/s10-tenant-rls-force.md`, `x02-least-privilege.md`, `x06-read-only-analyst.md`.

## 4. Other controls (not run)

- Authentication is configured in `pg_hba.conf` (host, database, user, method such as `scram-sha-256`) (https://www.postgresql.org/docs/18/auth-pg-hba-conf.html). Not applicable to PGlite.
- `SECURITY DEFINER` functions should set `search_path` explicitly (`SET search_path = pg_catalog, app`) so a caller cannot shadow objects (https://www.postgresql.org/docs/18/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY).
- Password hashing in the database: `pgcrypto`'s `crypt(pw, gen_salt('bf'))` (verified in [postgresql.md §20](postgresql.md#20-extensions)); in applications prefer a vetted library.
- MySQL: users are `'name'@'host'` pairs; `GRANT … ON db.* TO 'u'@'%'` (https://dev.mysql.com/doc/refman/8.4/en/grant.html). SQLite has no users or `GRANT`: access control is the file system's.
- DynamoDB and MongoDB access control: see [nosql-dynamodb.md §7](nosql-dynamodb.md#7-operations) and [nosql-mongodb.md §6](nosql-mongodb.md#6-replication-sharding-operations).

## Sources

PostgreSQL 18: Database Roles https://www.postgresql.org/docs/18/user-manag.html · Privileges https://www.postgresql.org/docs/18/ddl-priv.html · Row Security https://www.postgresql.org/docs/18/ddl-rowsecurity.html · format() https://www.postgresql.org/docs/18/functions-string.html#FUNCTIONS-STRING-FORMAT. OWASP SQL Injection Prevention Cheat Sheet (above). MySQL GRANT (above). Coverage suggested by tutorialspoint SQL/MySQL/PostgreSQL tables of contents (no text taken).
