# DBMS theory: architecture, relational model, algebra, transactions, storage, query processing, recovery

Status: concepts written from the sources listed per section (link-checked; the papers and manual pages were not re-read during this work, see [README.md](README.md#verification-levels)); ```` ```sql ```` blocks verified on PGlite 0.5.16 (PostgreSQL 18.6). Two-session behaviour (locking, anomalies) is not verified here because PGlite has one connection; the Engine L4 lessons cover it.

Route points: tutorialspoint DBMS tutorial, sections in its order ([tutorial-routes.md](tutorial-routes.md#dbms)). PostgreSQL's own documentation is used as the concrete reference implementation.

## 1. What a DBMS does

Status: concept.

- A DBMS stores data and offers a query language, integrity rules, concurrent access, crash recovery and access control, so applications do not each reimplement them.
- **Three-schema architecture** (ANSI/SPARC): external views per user, a conceptual schema (tables, constraints) and an internal schema (files, indexes). **Logical data independence**: the conceptual schema can change without breaking views; **physical data independence**: storage can change without changing queries (an index added later changes no query text).
- **Data models** over time: hierarchical (IBM IMS), network (CODASYL), relational (Codd 1970), object-relational (PostgreSQL), and the NoSQL families: document (MongoDB), key-value/wide-column (DynamoDB), graph.
- PostgreSQL is a client/server system: one server process per connection, shared memory buffers, background writer, WAL writer and autovacuum workers (https://www.postgresql.org/docs/18/tutorial-arch.html). PGlite compiles the same server to WebAssembly and runs it single-user inside the page or a worker (https://pglite.dev/docs/about).

## 2. Relational model

Status: concept; example verified.

- A **relation** is a set of tuples over named attributes with domains; SQL tables differ: rows may repeat unless a key forbids it, and columns may be `NULL` (Codd 1970, https://doi.org/10.1145/362384.362685).
- **Integrity**: domain constraints (types, `CHECK`), entity integrity (primary key not null), referential integrity (foreign keys), key constraints (`UNIQUE`).
- Codd's rules (1985; usually called the twelve rules, numbered 0 to 12, so thirteen in all) describe what "fully relational" means; useful history, not a checklist any product meets.
- Handling violations: the statement fails (default), or the foreign key action cascades, sets null or sets default.

```sql
-- expect: [["0"]]
CREATE TABLE parent (id int PRIMARY KEY);
CREATE TABLE child (id int PRIMARY KEY, parent_id int REFERENCES parent (id) ON DELETE CASCADE);
INSERT INTO parent VALUES (1); INSERT INTO child VALUES (10, 1), (11, 1);
DELETE FROM parent WHERE id = 1;
SELECT count(*) FROM child;
```

## 3. Relational algebra and calculus

Status: verified (SQL equivalents). BoonData: `content/engine/design/L5/01-relational-algebra.md`, `L5/02-division.md`, `L5/03-relational-calculus.md`.

Algebra is a set of operators that take relations and return a relation; SQL is declarative but every query maps to an algebra tree (the planner's plan is one).

| Operator | Symbol | SQL |
|---|---|---|
| selection | σ | `WHERE` |
| projection | π | `SELECT DISTINCT cols` (algebra removes duplicates) |
| rename | ρ | `AS` |
| union, difference, intersection | ∪ − ∩ | `UNION`, `EXCEPT`, `INTERSECT` |
| Cartesian product | × | `CROSS JOIN` |
| join (theta, natural, outer) | ⋈ | `JOIN … ON`, `NATURAL JOIN`, `LEFT/RIGHT/FULL JOIN` |
| division | ÷ | "for all": double `NOT EXISTS` |
| aggregation (extended) | γ | `GROUP BY` |

**Tuple relational calculus** describes the result by a predicate over tuple variables ({t | P(t)}); **domain calculus** over column variables. Both are as expressive as the algebra (Codd's theorem); SQL's `EXISTS` subqueries read like calculus.

Division, "students who took every course":

```sql
-- expect: [["An"]]
CREATE TABLE s (name text); CREATE TABLE c (course text); CREATE TABLE took (name text, course text);
INSERT INTO s VALUES ('An'), ('Binh');
INSERT INTO c VALUES ('SQL'), ('NoSQL');
INSERT INTO took VALUES ('An', 'SQL'), ('An', 'NoSQL'), ('Binh', 'SQL');
SELECT s.name FROM s
WHERE NOT EXISTS (SELECT 1 FROM c WHERE NOT EXISTS (SELECT 1 FROM took t WHERE t.name = s.name AND t.course = c.course));
```

## 4. Transactions and concurrency control

Status: concept; single-session parts verified in [sql-core.md §14](sql-core.md#14-transactions); two-session parts not verified.

- **ACID**: atomicity (all or nothing), consistency (constraints hold before and after), isolation (concurrent transactions do not see each other's partial work, to the degree the level promises), durability (a committed change survives a crash).
- **Schedule**: an interleaving of operations from several transactions. **Serial** schedules run one after another. A schedule is **conflict-serializable** if swapping non-conflicting operations turns it into a serial one; test: build the precedence graph (edge Ti → Tj when an operation of Ti conflicts with a later one of Tj on the same item, at least one a write) and check it has no cycle. **View serializability** is broader and NP-hard to test.
- **Anomalies** (PostgreSQL never shows a dirty read: Read Uncommitted behaves as Read Committed): dirty read (reading uncommitted data), non-repeatable read, phantom (a re-run query sees new rows), lost update, write skew (two transactions each read, then write disjoint rows, breaking a rule that spans both).
- **Protocols**:
  - Two-phase locking (2PL): a growing phase, then a shrinking phase; strict 2PL holds write locks to commit; guarantees conflict-serializability but can deadlock.
  - Timestamp ordering: each transaction gets a timestamp and conflicting operations must follow it; the Thomas write rule skips obsolete writes instead of aborting.
  - MVCC: readers see a snapshot, writers create new versions.
- **PostgreSQL** uses MVCC snapshots, row locks for writer–writer conflicts, and for Serializable, Serializable Snapshot Isolation (SSI) that detects dangerous read/write dependency cycles and aborts one transaction (Ports & Grittner, VLDB 2012, https://arxiv.org/abs/1208.4179; https://www.postgresql.org/docs/18/transaction-iso.html#XACT-SERIALIZABLE). Read Committed takes a new snapshot per statement; Repeatable Read one per transaction.
- **Deadlock**: a wait-for cycle. Detection (PostgreSQL checks after `deadlock_timeout`), prevention (lock in a fixed order), or wait-die/wound-wait schemes.

BoonData: Engine `content/engine/postgres/L4/09-table-lock-modes.md` … `L4/14-advisory-locks.md`, `L3/04-mvcc.md`; the theory (schedules, precedence graph, 2PL, timestamp ordering, Thomas write rule) is the design track, `content/engine/design/L5/04-schedules.md` and `L5/05-locking-timestamps.md`.

## 5. Storage and indexing structures

Status: verified (ctid/page facts); internals labs live in Engine L3/L5.

- Data lives in fixed-size pages (PostgreSQL: 8 kB) on disk and is cached in a buffer pool; a page holds a header, an array of line pointers and the tuples (https://www.postgresql.org/docs/18/storage-page-layout.html).
- File organisations: heap (unordered; PostgreSQL tables), sorted/clustered (MySQL InnoDB stores rows in primary-key order), hashed.
- Index structures:
  - **B+ tree**: balanced, sorted keys in leaves linked left-to-right; O(log n) lookups and range scans. PostgreSQL's "btree" is a B+ tree variant (Lehman–Yao) (https://www.postgresql.org/docs/18/btree.html).
  - **Hash index**: equality only.
  - **Multi-level / sparse vs dense**: an index over an index; a sparse index has one entry per block of a sorted file.
  - **Bitmap**: one bit per row per value; PostgreSQL builds bitmaps on the fly (Bitmap Index Scan) rather than storing them.
- Large values are compressed and moved out of line (TOAST) when a row would exceed about 2 kB (https://www.postgresql.org/docs/18/storage-toast.html).

```sql
-- expect: [["8192","(0,1)"]]
CREATE TABLE pages (x int);
INSERT INTO pages VALUES (1);
SELECT current_setting('block_size'), ctid::text FROM pages;
```

BoonData: Engine `L3/01-heap-page.md`, `L3/03-toast-lab.md`, `L5/01-btree-page-splits.md`, `L2/05-hash.md`.

## 6. Query processing

Status: concept; plan reading verified in [postgresql.md §16](postgresql.md#16-explain-and-the-planner).

- Steps: parse → rewrite (views, rules) → plan/optimise → execute (https://www.postgresql.org/docs/18/query-path.html).
- **Heuristic** optimisation pushes selections and projections down and joins small results first; **cost-based** optimisation estimates rows from statistics and picks the cheapest plan (PostgreSQL does both; it switches to a genetic search (GEQO) for many-table joins).
- Join algorithms: nested loop (good with an index on the inner side and few outer rows), hash join (equality, one side fits in `work_mem`), merge join (both inputs sorted).
- **External sorting**: sort runs that fit in memory, write them out, merge; PostgreSQL shows `Sort Method: external merge  Disk: …kB` when `work_mem` is too small.

BoonData: Engine `L4/01-cost-model.md`, `L4/04-join-algorithms.md`, `L4/05-join-order.md`, `L3/14-buffers-workmem-lab.md`; the algorithms in general: `content/engine/design/L5/06-query-algorithms.md`.

## 7. Recovery

Status: concept.

- **Write-ahead logging**: a change is written to the log before the data page reaches disk; after a crash the system redoes logged changes from the last checkpoint (https://www.postgresql.org/docs/18/wal-intro.html). ARIES is the classic analysis–redo–undo algorithm (Mohan et al., TODS 1992, https://doi.org/10.1145/128765.128770); PostgreSQL needs no undo phase because MVCC leaves aborted row versions invisible.
- **Checkpoints** bound how much log must be replayed; full-page writes protect against torn pages.
- **Backups**: logical (`pg_dump`, SQL or archive format), physical (`pg_basebackup`) plus WAL archiving for point-in-time recovery (https://www.postgresql.org/docs/18/backup.html).
- Replication ships WAL to standbys (physical) or decoded changes (logical).

BoonData: Engine `L3/12-wal.md`, `L3/13-wal-records-lab.md`, `L5/09-wal-full-page-writes.md`, `L5/13-replication-slots.md`, `L5/14-backup-pitr-ha.md`. The app's own persistence (IndexedDB snapshot of the PGlite data directory) is in CLAUDE.md "Seeded-DB snapshot".

## Sources

Cited inline. Coverage suggested by https://www.tutorialspoint.com/dbms/index.htm (no text taken).
