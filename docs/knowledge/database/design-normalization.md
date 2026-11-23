# Database design: ER modelling, keys, functional dependencies, normal forms

Status: concepts written from the sources below (link-checked, not re-read during this work; see [README.md](README.md#verification-levels)); ```` ```sql ```` blocks verified on PGlite 0.5.16 (PostgreSQL 18.6) with asserted results.

Route points: tutorialspoint DBMS "Entity Relationship Model", "Relational Database Design" (both groups) and "Normalization in Database Designing" sections; SQL/MySQL "Keys" sections ([tutorial-routes.md](tutorial-routes.md#dbms)). The textbook-level sources here are the PostgreSQL manual for SQL behaviour and E. F. Codd's and W. Kent's papers for theory; no tutorial text was used.

## 1. Entity-relationship modelling

Status: concept (no runnable example).

- **Entity**: a thing with identity (customer, shipment). **Attribute**: a property. **Relationship**: an association between entities with a cardinality (1:1, 1:N, M:N) and participation (optional/mandatory) (P. P. Chen, "The Entity-Relationship Model", ACM TODS 1976, https://doi.org/10.1145/320434.320440).
- **Weak entity**: identified only together with its owner (an order line, keyed by order + line number).
- **Generalisation/specialisation** (EER): a supertype with subtypes; mapped to tables as one table with a type column, one table per subtype, or a shared table plus subtype tables.
- Mapping to tables:
  - entity → table, identifier → primary key;
  - 1:N → foreign key on the N side;
  - M:N → junction table whose primary key is both foreign keys (plus any relationship attributes);
  - 1:1 → foreign key with `UNIQUE` on either side;
  - multivalued attribute → child table.

```sql
-- expect: [["1"]]
CREATE TABLE students (id int PRIMARY KEY, name text NOT NULL);
CREATE TABLE courses  (id int PRIMARY KEY, title text NOT NULL);
CREATE TABLE enrolments (            -- M:N junction table
  student_id int REFERENCES students (id),
  course_id  int REFERENCES courses (id),
  grade      numeric(3,1),
  PRIMARY KEY (student_id, course_id)
);
INSERT INTO students VALUES (1, 'An'); INSERT INTO courses VALUES (10, 'SQL');
INSERT INTO enrolments VALUES (1, 10, 8.5);
SELECT count(*) FROM enrolments;
```

BoonData: the ER tab and the Data page draw real ER diagrams from `information_schema` (`src/viz/erd.ts`); the design track teaches ER modelling, keys and normal forms (`content/engine/design/L2`–`L4`, v28 R4; see [boondata-gap-map.md](boondata-gap-map.md)).

## 2. Keys and functional dependencies

Status: verified (FD check query).

- **Superkey**: a set of columns whose values identify a row. **Candidate key**: a minimal superkey. **Primary key**: the candidate key chosen; the others are **alternate keys** (enforce them with `UNIQUE`). **Composite key**: more than one column. **Surrogate key**: a generated identifier with no business meaning; keep the natural key `UNIQUE` too.
- **Functional dependency** X → Y: rows that agree on X agree on Y. A key determines every column.
- **Armstrong's axioms** (reflexivity, augmentation, transitivity) derive every implied FD; the **closure** X⁺ is everything X determines; X is a superkey iff X⁺ contains all columns. A **minimal cover** is an equivalent FD set with single-column right sides, no extraneous column on any left side and no redundant FD (W. W. Armstrong, "Dependency Structures of Data Base Relationships", IFIP 1974).
- In SQL you can test whether data violates a supposed FD:

```sql
-- expect: [["HCM"]]
-- does postcode → city hold? A postcode with more than one city breaks it.
CREATE TABLE addresses (id int PRIMARY KEY, postcode text, city text);
INSERT INTO addresses VALUES (1, '550000', 'Da Nang'), (2, '550000', 'Da Nang'), (3, '700000', 'HCM'), (4, '700000', 'Ho Chi Minh');
SELECT min(city) FROM addresses GROUP BY postcode HAVING count(DISTINCT city) > 1;
```

## 3. Normal forms

Status: concept; example verified.

Short, own-words definitions (E. F. Codd, "Further Normalization of the Data Base Relational Model", 1971; W. Kent, "A Simple Guide to Five Normal Forms in Relational Database Theory", CACM 1983, https://www.bkent.net/Doc/simple5.htm):

| Form | Rule | Typical violation |
|---|---|---|
| 1NF | every column holds one atomic value; no repeating groups | `phones = '090…, 091…'` |
| 2NF | 1NF, and no non-key column depends on part of a composite key | `enrolments(student_id, course_id, course_title)` |
| 3NF | 2NF, and no non-key column depends on another non-key column | `orders(id, customer_id, customer_city)` |
| BCNF | for every non-trivial FD X → Y, X is a superkey ("every determinant is a candidate key" in the informal wording) | `(student, subject) → teacher` but `teacher → subject` |
| 4NF | no independent multi-valued facts in one table | `(employee, skill, language)` holding all combinations |
| 5NF | no join dependency not implied by the keys | three-way relationship that is really three pairs |

Why: each fact stored once means an update cannot leave two copies disagreeing (update, insertion and deletion anomalies).

When to denormalise: read-heavy reporting (star schemas, adv node `c2`), document stores (MongoDB embeds data read together; [nosql-mongodb.md §1](nosql-mongodb.md#1-data-model)) and DynamoDB single-table design ([nosql-dynamodb.md §5](nosql-dynamodb.md#5-modelling)) all trade redundancy for fewer reads, and must then keep the copies consistent on write.

```sql
-- expect: [["1"]]
-- 3NF fix: city lives with the customer, orders refer to the customer
CREATE TABLE customers3 (id int PRIMARY KEY, city text NOT NULL);
CREATE TABLE orders3 (id int PRIMARY KEY, customer_id int NOT NULL REFERENCES customers3 (id));
INSERT INTO customers3 VALUES (1, 'Hue'); INSERT INTO orders3 VALUES (100, 1), (101, 1);
UPDATE customers3 SET city = 'Da Nang' WHERE id = 1;   -- one row changes, every order sees it
SELECT count(DISTINCT c.city) FROM orders3 o JOIN customers3 c ON c.id = o.customer_id;
```

## 4. Modelling choices that matter in PostgreSQL

Status: summary; details in [postgresql.md](postgresql.md#1-data-types).

- Name things in `snake_case`, singular or plural consistently, no reserved words (catalogue S08).
- Put rules in constraints (`NOT NULL`, `CHECK`, `UNIQUE`, `FOREIGN KEY`, `EXCLUDE`) so the database rejects bad data (catalogue S06).
- Record history explicitly when you need it (valid-from/valid-to columns, SCD type 2: adv node `c3`).
- Model money as `numeric`, instants as `timestamptz`.

## Sources

Chen 1976 (DOI above); Codd, "A Relational Model of Data for Large Shared Data Banks", CACM 1970, https://doi.org/10.1145/362384.362685; Kent 1983 (above); PostgreSQL 18 constraints https://www.postgresql.org/docs/18/ddl-constraints.html. Coverage suggested by https://www.tutorialspoint.com/dbms/index.htm (no text taken).
