---
id: e-pg-l4-20
engine: postgres
level: L4
module: partitioning
title: "Phân vùng theo khách: LIST cho khách lớn, DEFAULT cho phần còn lại"
title_en: "Partitioning by tenant: LIST for big tenants, DEFAULT for the rest"
kind: lab
runtime: browser
minutes: 18
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-25" }
objectives:
  - { vi: "Cho một khách lớn phân vùng riêng bằng `PARTITION BY LIST (tenant_id)` và để các khách nhỏ chung phân vùng `DEFAULT`", en: "Give a big tenant its own partition with `PARTITION BY LIST (tenant_id)` and keep the small tenants together in a `DEFAULT` partition" }
  - { vi: "Biết vì sao HASH theo khách lệch khi ít khách và không cho chọn chỗ cho một khách", en: "Know why HASH on the tenant skews with few tenants and cannot place one tenant on purpose" }
  - { vi: "Chọn đúng giữa phân vùng theo khách và phân vùng theo thời gian cho một tình huống", en: "Choose correctly between partitioning by tenant and by time for a scenario" }
requires: [e-pg-l4-08]
viz: pg-partition-prune
sources:
  - url: https://www.postgresql.org/docs/18/ddl-partitioning.html
    title: "Table Partitioning"
  - url: https://www.postgresql.org/docs/18/sql-createtable.html
    title: "CREATE TABLE"
  - url: https://www.postgresql.org/docs/18/sql-altertable.html
    title: "ALTER TABLE"
lab:
  setup: |
    -- Lantern Market: seller 1 sells as much as all the others together
    CREATE TABLE seller_orders (tenant_id int NOT NULL, id int NOT NULL, created_on date NOT NULL, amount int NOT NULL, PRIMARY KEY (tenant_id, id)) PARTITION BY LIST (tenant_id);
    CREATE TABLE seller_orders_t1 PARTITION OF seller_orders FOR VALUES IN (1);
    CREATE TABLE seller_orders_pool PARTITION OF seller_orders DEFAULT;
    INSERT INTO seller_orders SELECT CASE WHEN g % 2 = 0 THEN 1 ELSE g % 9 + 2 END, g, date '2026-08-01' + g % 92, g % 700 + 50 FROM generate_series(1, 6000) g;
    ANALYZE seller_orders;
  steps:
    - task: { vi: "Người bán 1 và 2 nằm ở phân vùng nào, mỗi người bao nhiêu đơn? Ba cột tenant_id, part (`tableoid::regclass::text`), n. Sắp theo tenant_id.", en: "Which partition holds sellers 1 and 2, and how many orders each? Three columns tenant_id, part (`tableoid::regclass::text`), n. Order by tenant_id." }
      solution: "SELECT tenant_id, tableoid::regclass::text AS part, count(*) AS n FROM seller_orders WHERE tenant_id IN (1, 2) GROUP BY 1, 2 ORDER BY 1"
      check: rows
      ordered: true
      hint: { vi: "`tableoid` là bảng thật chứa dòng; gom theo `tenant_id` và nó.", en: "`tableoid` is the real table holding the row; group by `tenant_id` and it." }
    - task: { vi: "Đếm đơn của người bán 1. Kế hoạch chỉ được đọc phân vùng `seller_orders_t1`.", en: "Count seller 1's orders. The plan must read partition `seller_orders_t1` only." }
      solution: "SELECT count(*) FROM seller_orders WHERE tenant_id = 1"
      check: plan
      hint: { vi: "So thẳng cột khóa phân vùng với hằng: `WHERE tenant_id = 1`.", en: "Compare the partition key column itself with a constant: `WHERE tenant_id = 1`." }
    - task: { vi: "Người bán 11 vừa ký gói lớn và chưa có đơn nào. Tạo trước phân vùng riêng `seller_orders_t11` cho họ. Chấm bằng catalog (giới hạn phân vùng).", en: "Seller 11 just signed a big contract and has no orders yet. Create their own partition `seller_orders_t11` ahead of time. Graded on the catalog (partition bounds)." }
      solution: "CREATE TABLE seller_orders_t11 PARTITION OF seller_orders FOR VALUES IN (11)"
      check: catalog
      hint: { vi: "`CREATE TABLE … PARTITION OF seller_orders FOR VALUES IN (11)`.", en: "`CREATE TABLE … PARTITION OF seller_orders FOR VALUES IN (11)`." }
    - task: { vi: "Người bán 1 chuyển sang server riêng. Tách phân vùng của họ khỏi `seller_orders` (bảng vẫn còn để chép đi). Chấm bằng số đơn của người bán 1 còn trong `seller_orders` và số dòng trong bảng đã tách.", en: "Seller 1 is moving to a server of its own. Detach their partition from `seller_orders` (the table stays, to be copied away). Graded on seller 1's orders left in `seller_orders` and the rows in the detached table." }
      solution: "ALTER TABLE seller_orders DETACH PARTITION seller_orders_t1"
      after: "SELECT 1 AS tenant_id, (SELECT count(*) FROM seller_orders WHERE tenant_id = 1) AS in_table, (SELECT count(*) FROM seller_orders_t1) AS detached"
      check: rows
      hint: { vi: "`ALTER TABLE seller_orders DETACH PARTITION seller_orders_t1`.", en: "`ALTER TABLE seller_orders DETACH PARTITION seller_orders_t1`." }
quiz:
  - q: { vi: "Tình huống của `e-pg-l4-08`: 90 % câu hỏi là \"khách X trong 30 ngày qua\" và dữ liệu quá 13 tháng phải xóa. Khóa phân vùng nào?", en: "The `e-pg-l4-08` scenario: 90% of queries are \"tenant X over the last 30 days\" and data older than 13 months must be deleted. Which partition key?" }
    options:
      - { vi: "LIST theo khách, mỗi khách một phân vùng", en: "LIST by tenant, one partition per tenant" }
      - { vi: "RANGE theo tháng, cộng index `(tenant_id, created_at)`", en: "RANGE by month, plus an index `(tenant_id, created_at)`" }
      - { vi: "HASH theo khách, chia đều thành 16 phần", en: "HASH on the tenant, split evenly into 16" }
    answer: 1
    trap: 0
    why: { vi: "Nghe hợp lý vì câu nào cũng lọc theo khách, nhưng ở đây việc xóa theo thời gian mới cần phân vùng: `DROP` một tháng thay vì `DELETE` hàng triệu dòng. Phần lọc khách do index lo. Bài này không trái với `e-pg-l4-08`: phân vùng theo khách chỉ đáng khi vài khách cần được tách, chuyển đi hay xóa nguyên khối.", en: "It sounds right because every query filters by tenant, but here time-based deletion is what needs partitions: `DROP` a month instead of a `DELETE` of millions of rows. The index handles the tenant filter. This lesson does not contradict `e-pg-l4-08`: partitioning by tenant only pays off when a few tenants must be isolated, moved or deleted as a whole." }
  - q: { vi: "2.000 người bán; 3 người chiếm 60 % số dòng, và một trong ba sẽ chuyển sang server riêng quý sau. Thiết kế nào?", en: "2,000 sellers; 3 of them hold 60% of the rows, and one of the three moves to its own server next quarter. Which design?" }
    options:
      - { vi: "HASH theo `tenant_id` với 16 phân vùng", en: "HASH on `tenant_id` with 16 partitions" }
      - { vi: "LIST: mỗi khách lớn một phần, còn lại `DEFAULT`", en: "LIST: one per big tenant, the rest in `DEFAULT`" }
      - { vi: "Một phân vùng riêng cho mỗi người bán", en: "One partition of its own for each seller" }
    answer: 1
    trap: 0
    why: { vi: "Nghe hợp lý vì HASH chia đều, nhưng nó chia theo giá trị băm: không chọn được khách nào nằm riêng, và khách lớn vẫn chung phân vùng với khách khác. LIST cho mỗi khách lớn một phân vùng có tên, `DETACH` được khi họ chuyển đi; 1.997 khách nhỏ nằm chung `DEFAULT` nên số phân vùng không tăng theo số khách.", en: "It sounds right because HASH spreads evenly, but it spreads by hash value: you cannot choose which tenant sits alone, and a big tenant still shares a partition with others. LIST gives each big tenant a named partition you can `DETACH` when they move; the 1,997 small ones share `DEFAULT`, so the partition count does not grow with the tenants." }
  - q: { vi: "Bảng `PARTITION BY HASH (tenant_id)` với `MODULUS 2`, nạp 10 khách có `tenant_id` 1 tới 10. Mỗi phân vùng có mấy khách?", en: "A table `PARTITION BY HASH (tenant_id)` with `MODULUS 2` gets 10 tenants with `tenant_id` 1 to 10. How many tenants in each partition?" }
    options:
      - { vi: "Luôn 5 và 5, vì băm chia đều", en: "Always 5 and 5, a hash splits evenly" }
      - { vi: "Tùy giá trị băm; trong PGlite là 2 và 8", en: "It depends on the hash values; in PGlite it is 2 and 8" }
      - { vi: "10 và 0, vì các mã liền nhau", en: "10 and 0, because the ids are consecutive" }
    answer: 1
    trap: 0
    why: { vi: "Nghe hợp lý vì băm \"chia đều\", nhưng chỉ đều khi có rất nhiều giá trị. Với 10 khách, phần ví dụ đo được 2 và 8. Ít khách thì HASH lệch, và một khách lớn vẫn làm lệch phân vùng của nó.", en: "It sounds right because hashing \"spreads evenly\", but only with very many values. With 10 tenants the example measures 2 and 8. With few tenants HASH skews, and one big tenant still skews its partition." }
---
## Mở bài

Một người bán ở Chợ Lồng Đèn có số đơn bằng mọi người bán khác cộng lại, và quý sau họ sẽ chuyển sang server riêng. Nếu đơn của họ đã nằm riêng một phân vùng, việc chuyển đi là một lệnh `DETACH`. Bài này chia bảng theo khách, và nói rõ khi nào chia theo thời gian vẫn tốt hơn.

## Ý chính

`PARTITION BY LIST (tenant_id)` cho mỗi khách lớn một phân vùng có tên (`FOR VALUES IN (1)`), còn các khách nhỏ vào chung phân vùng `DEFAULT`. Câu lọc `tenant_id = 1` chỉ đọc phân vùng của khách 1; tách, chuyển hay xóa khách đó là `DETACH` rồi `DROP` một bảng, nhanh như nhau dù họ có bao nhiêu dòng.

Nhiều người nghĩ HASH theo khách là cách chia đều tốt nhất. Thật ra băm chỉ đều khi có rất nhiều giá trị: 10 khách chia 2 phân vùng có thể thành 2 và 8, và không có cách nào đặt một khách chọn trước vào chỗ riêng.

Bài này không trái với `e-pg-l4-08`. Ở đó câu hỏi lọc theo thời gian và dữ liệu cũ phải xóa theo tháng, nên RANGE theo thời gian cộng index `(tenant_id, created_at)` là đúng. Phân vùng theo khách đáng làm khi vài khách lớn cần được tách riêng, chuyển đi hay xóa nguyên khối. Luật cũ vẫn giữ: khóa chính phải chứa `tenant_id`, và thêm phân vùng cho một khách đang nằm trong `DEFAULT` sẽ bị từ chối.

## Cú pháp

```sql
CREATE TABLE t (tenant_id int, …,
  PRIMARY KEY (tenant_id, id))
  PARTITION BY LIST (tenant_id);
CREATE TABLE t_1 PARTITION OF t
  FOR VALUES IN (1);
CREATE TABLE t_rest PARTITION OF t
  DEFAULT;
ALTER TABLE t DETACH PARTITION t_1;
```

- `FOR VALUES IN (…)`: các khách của phân vùng này.
- `DEFAULT`: mọi khách không có phân vùng riêng.
- `DETACH PARTITION`: phân vùng thành bảng riêng, dữ liệu còn nguyên.

## Ví dụ

Mỗi phân vùng giữ bao nhiêu đơn:

```sql
SELECT tableoid::regclass::text AS part,
  count(*) AS n
FROM seller_orders
GROUP BY 1 ORDER BY 1;
```

Câu của khách 1 chỉ đọc phân vùng của khách 1:

```sql
EXPLAIN (COSTS OFF)
SELECT count(*) FROM seller_orders
WHERE tenant_id = 1;
```

Khách 5 nằm trong `DEFAULT`, nên chỉ đọc phân vùng đó:

```sql
EXPLAIN (COSTS OFF)
SELECT count(*) FROM seller_orders
WHERE tenant_id = 5;
```

HASH theo khách với ít khách:

```sql
CREATE TABLE h (tenant_id int NOT NULL)
  PARTITION BY HASH (tenant_id);
CREATE TABLE h0 PARTITION OF h
  FOR VALUES WITH (
    MODULUS 2, REMAINDER 0);
CREATE TABLE h1 PARTITION OF h
  FOR VALUES WITH (
    MODULUS 2, REMAINDER 1);
INSERT INTO h
  SELECT generate_series(1, 10);
SELECT tableoid::regclass::text AS part,
  count(*) AS tenants
FROM h GROUP BY 1 ORDER BY 1;
```

10 khách chia thành 2 và 8.

## Lỗi hay gặp

Thêm phân vùng cho khách 3 khi đơn của họ đang nằm trong `DEFAULT`:

```sql
-- ERROR 23514
CREATE TABLE seller_orders_t3
  PARTITION OF seller_orders
  FOR VALUES IN (3);
```

Postgres không tự chuyển dòng ra khỏi `DEFAULT`. Tách `DEFAULT` ra, tạo phân vùng mới, chép dòng của khách 3 sang rồi xóa chúng khỏi bảng vừa tách, rồi mới gắn lại (còn sót một dòng là lệnh gắn bị từ chối); hoặc tạo phân vùng trước khi khách có dữ liệu. Khóa chính thiếu khóa phân vùng:

```sql
-- ERROR 0A000
CREATE TABLE bad_orders (
  tenant_id int NOT NULL,
  id int PRIMARY KEY)
  PARTITION BY LIST (tenant_id);
```

Bọc cột khóa trong biểu thức:

```sql
-- WRONG: the key inside an expression
EXPLAIN (COSTS OFF)
SELECT count(*) FROM seller_orders
WHERE tenant_id + 0 = 1;
```

```sql
-- FIX: the key column itself
EXPLAIN (COSTS OFF)
SELECT count(*) FROM seller_orders
WHERE tenant_id = 1;
```

Câu sai đọc cả hai phân vùng, câu đúng chỉ một.

## Thực hành

Bốn bước trên đơn của người bán: phân vùng nào giữ ai, kế hoạch chỉ đọc một phân vùng, tạo trước phân vùng cho khách lớn mới, rồi tách khách lớn để chuyển đi. Giới hạn phân vùng được đọc từ catalog.

## Tóm tắt

- `PARTITION BY LIST (tenant_id)`: mỗi khách lớn một phân vùng, khách nhỏ chung `DEFAULT`.
- Lọc `tenant_id = …` chỉ đọc phân vùng của khách đó; tách khách là `DETACH`.
- HASH lệch khi ít khách và không cho chọn chỗ cho một khách.
- Xóa theo thời gian thì RANGE theo thời gian vẫn đúng, như `e-pg-l4-08`. Đọc tiếp: `e-pg-l5-21`, `e-ds-l4-09`.

# EN

## Opening

One Lantern Market seller has as many orders as all the other sellers together, and next quarter they move to a server of their own. If their orders already sit in a partition of their own, the move is one `DETACH`. This lesson partitions by tenant, and says plainly when partitioning by time is still better.

## Key idea

`PARTITION BY LIST (tenant_id)` gives each big tenant a named partition (`FOR VALUES IN (1)`), while the small tenants share a `DEFAULT` partition. A query filtering `tenant_id = 1` reads only tenant 1's partition; isolating, moving or deleting that tenant is a `DETACH` then `DROP` of one table, equally fast however many rows they have.

Many people think HASH on the tenant is the best way to spread evenly. In fact hashing is only even with very many values: 10 tenants over 2 partitions can come out as 2 and 8, and there is no way to put one chosen tenant in a place of its own.

This lesson does not contradict `e-pg-l4-08`. There the queries filter on time and old data is deleted by month, so RANGE by time plus an index `(tenant_id, created_at)` is right. Partitioning by tenant pays off when a few big tenants must be isolated, moved or deleted as a whole. The old rules still hold: the primary key must contain `tenant_id`, and adding a partition for a tenant that already sits in `DEFAULT` is refused.

## Syntax

```sql
CREATE TABLE t (tenant_id int, …,
  PRIMARY KEY (tenant_id, id))
  PARTITION BY LIST (tenant_id);
CREATE TABLE t_1 PARTITION OF t
  FOR VALUES IN (1);
CREATE TABLE t_rest PARTITION OF t
  DEFAULT;
ALTER TABLE t DETACH PARTITION t_1;
```

- `FOR VALUES IN (…)`: the tenants of this partition.
- `DEFAULT`: every tenant without a partition of its own.
- `DETACH PARTITION`: the partition becomes a table of its own, data intact.

## Example

How many orders each partition holds:

```sql
SELECT tableoid::regclass::text AS part,
  count(*) AS n
FROM seller_orders
GROUP BY 1 ORDER BY 1;
```

Tenant 1's query reads only tenant 1's partition:

```sql
EXPLAIN (COSTS OFF)
SELECT count(*) FROM seller_orders
WHERE tenant_id = 1;
```

Tenant 5 lives in `DEFAULT`, so only that partition is read:

```sql
EXPLAIN (COSTS OFF)
SELECT count(*) FROM seller_orders
WHERE tenant_id = 5;
```

HASH on the tenant with few tenants:

```sql
CREATE TABLE h (tenant_id int NOT NULL)
  PARTITION BY HASH (tenant_id);
CREATE TABLE h0 PARTITION OF h
  FOR VALUES WITH (
    MODULUS 2, REMAINDER 0);
CREATE TABLE h1 PARTITION OF h
  FOR VALUES WITH (
    MODULUS 2, REMAINDER 1);
INSERT INTO h
  SELECT generate_series(1, 10);
SELECT tableoid::regclass::text AS part,
  count(*) AS tenants
FROM h GROUP BY 1 ORDER BY 1;
```

10 tenants split into 2 and 8.

## Common mistakes

Adding a partition for tenant 3 while their orders sit in `DEFAULT`:

```sql
-- ERROR 23514
CREATE TABLE seller_orders_t3
  PARTITION OF seller_orders
  FOR VALUES IN (3);
```

Postgres does not move rows out of `DEFAULT` by itself. Detach `DEFAULT`, create the new partition, copy tenant 3's rows over and delete them from the detached table, and only then attach it again (one row left behind and the attach is refused); or create the partition before the tenant has data. A primary key without the partition key:

```sql
-- ERROR 0A000
CREATE TABLE bad_orders (
  tenant_id int NOT NULL,
  id int PRIMARY KEY)
  PARTITION BY LIST (tenant_id);
```

Wrapping the key column in an expression:

```sql
-- WRONG: the key inside an expression
EXPLAIN (COSTS OFF)
SELECT count(*) FROM seller_orders
WHERE tenant_id + 0 = 1;
```

```sql
-- FIX: the key column itself
EXPLAIN (COSTS OFF)
SELECT count(*) FROM seller_orders
WHERE tenant_id = 1;
```

The wrong one reads both partitions, the right one only one.

## Practice

Four steps on the sellers' orders: which partition holds whom, a plan that reads one partition, a partition created ahead for a new big tenant, then detaching the big tenant to move it. Partition bounds are read from the catalog.

## Recap

- `PARTITION BY LIST (tenant_id)`: one partition per big tenant, the small ones share `DEFAULT`.
- Filtering `tenant_id = …` reads only that tenant's partition; isolating a tenant is a `DETACH`.
- HASH skews with few tenants and cannot place one tenant on purpose.
- For time-based deletion, RANGE by time is still right, as in `e-pg-l4-08`. Read next: `e-pg-l5-21`, `e-ds-l4-09`.
