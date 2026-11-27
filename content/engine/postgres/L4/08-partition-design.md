---
id: e-pg-l4-08
engine: postgres
level: L4
module: partitioning
title: "Thiết kế phân vùng: khóa, ràng buộc và giới hạn"
title_en: "Designing partitions: key, constraints and limits"
kind: quiz
runtime: browser
minutes: 12
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - { vi: "Chọn khóa phân vùng theo câu hỏi hay gặp nhất và cách xóa dữ liệu cũ", en: "Choose the partition key from the most frequent queries and the way old data is removed" }
  - { vi: "Biết ràng buộc UNIQUE/PRIMARY KEY phải chứa mọi cột khóa phân vùng", en: "Know that UNIQUE/PRIMARY KEY constraints must contain every partition key column" }
  - { vi: "Cân nhắc số phân vùng, phân vùng mặc định và index trên bảng cha", en: "Weigh the number of partitions, the default partition and indexes on the parent" }
requires: [e-pg-l4-07]
viz: pg-partition-prune
sources:
  - { url: https://www.postgresql.org/docs/18/ddl-partitioning.html, title_vi: "Phân vùng bảng (partitioning)" }
  - { url: https://www.postgresql.org/docs/18/sql-createindex.html, title_vi: "CREATE INDEX" }
  - { url: https://www.postgresql.org/docs/18/sql-createtable.html, title_vi: "CREATE TABLE" }
lab:
  setup: |
    CREATE TABLE events (id bigint NOT NULL, created_on date NOT NULL, kind text NOT NULL) PARTITION BY RANGE (created_on);
    CREATE TABLE events_2026_09 PARTITION OF events FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
    CREATE TABLE events_2026_10 PARTITION OF events FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
    INSERT INTO events SELECT g, date '2026-09-01' + (g % 61), CASE WHEN g % 3 = 0 THEN 'click' ELSE 'view' END FROM generate_series(1, 610) AS g;
  steps:
    - task:
        vi: "`ALTER TABLE events ADD PRIMARY KEY (id)` bị từ chối (thử xem). Thêm khóa chính mà Postgres chấp nhận: cột `id` rồi cột khóa phân vùng."
        en: "`ALTER TABLE events ADD PRIMARY KEY (id)` is refused (try it). Add the primary key Postgres accepts: column `id`, then the partition key column."
      solution: ALTER TABLE events ADD PRIMARY KEY (id, created_on)
      check: catalog
      hint:
        vi: "Khóa chính của bảng phân vùng phải chứa mọi cột khóa phân vùng: `PRIMARY KEY (id, created_on)`."
        en: "A partitioned table's primary key must contain every partition key column: `PRIMARY KEY (id, created_on)`."
    - task:
        vi: "Mỗi dòng nằm ở phân vùng nào? Trả về tên phân vùng (`tableoid::regclass::text`) và số dòng, theo tên phân vùng."
        en: "Which partition holds each row? Return the partition name (`tableoid::regclass::text`) and the row count, by partition name."
      solution: SELECT tableoid::regclass::text AS part, count(*) FROM events GROUP BY 1 ORDER BY 1
      check: rows
      ordered: true
      hint:
        vi: "`tableoid` là cột hệ thống: bảng thật chứa dòng. Gom theo nó."
        en: "`tableoid` is a system column: the real table holding the row. Group by it."
      fact:
        vi: "Tháng 9 có 300 dòng, tháng 10 có 310: bảng cha `events` không tự chứa dòng nào, mọi dòng nằm trong một phân vùng."
        en: "September holds 300 rows, October 310: the parent `events` holds no rows itself, every row lives in a partition."
        probe: SELECT tableoid::regclass::text, count(*) FROM events GROUP BY 1 ORDER BY 1
        expect: [[events_2026_09, 300], [events_2026_10, 310]]
quiz:
  - q: { vi: "Bảng sự kiện theo `created_on`, phân vùng theo tháng. Bạn chạy `ALTER TABLE events ADD PRIMARY KEY (id)`. Chuyện gì xảy ra?", en: "An events table is partitioned by month on `created_on`. You run `ALTER TABLE events ADD PRIMARY KEY (id)`. What happens?" }
    options:
      - { vi: "Thành công; Postgres kiểm tra trùng giữa mọi phân vùng", en: "It succeeds; Postgres checks duplicates across every partition" }
      - { vi: "Lỗi 0A000: ràng buộc unique trên bảng phân vùng phải chứa mọi cột phân vùng. Dùng `PRIMARY KEY (id, created_on)`", en: "Error 0A000: a unique constraint on a partitioned table must include all partitioning columns. Use `PRIMARY KEY (id, created_on)`" }
      - { vi: "Thành công nhưng chỉ unique trong từng phân vùng", en: "It succeeds, but is only unique within each partition" }
    answer: 1
    trap: 0
    why: { vi: "Với bảng thường, khóa chính kiểm tra trùng trên cả bảng nhờ một unique index, nhưng bảng phân vùng không có index chung cho cả bảng: mỗi phân vùng có index riêng, chỉ thấy dòng của mình. Hai dòng cùng `id` mà khác tháng sẽ nằm ở hai index khác nhau, nên không ai bắt được trùng. Postgres không chấp nhận một khóa chính \"chỉ duy nhất trong từng phân vùng\"; nó từ chối với mã 0A000 (tính năng không hỗ trợ). Thêm `created_on` vào khóa thì hai dòng trùng khóa luôn rơi vào cùng một phân vùng, và index của phân vùng đó bắt được.", en: "On a plain table a primary key checks duplicates across the whole table through one unique index, but a partitioned table has no index spanning all of it: each partition has its own index that only sees its own rows. Two rows with the same `id` in different months would sit in two different indexes, so nothing would catch the duplicate. Postgres does not accept a primary key that is \"only unique per partition\"; it refuses with code 0A000 (feature not supported). Adding `created_on` to the key makes two equal keys always land in the same partition, whose index catches them." }
  - q: { vi: "Hệ thống nhiều khách hàng (tenant), 90 % câu hỏi là \"tenant X trong 30 ngày qua\", và dữ liệu quá 13 tháng phải xóa. Khóa phân vùng nào hợp lý nhất?", en: "A multi-tenant system: 90% of queries are \"tenant X over the last 30 days\", and data older than 13 months must be deleted. Which partition key fits best?" }
    options:
      - { vi: "RANGE theo thời gian (tháng), index `(tenant_id, created_at)` trên bảng cha", en: "RANGE by time (month), with an index `(tenant_id, created_at)` on the parent" }
      - { vi: "HASH theo `tenant_id` với 1000 phân vùng", en: "HASH on `tenant_id` with 1000 partitions" }
      - { vi: "LIST theo từng tenant, một phân vùng mỗi tenant", en: "LIST by tenant, one partition per tenant" }
    answer: 0
    trap: 2
    why: { vi: "Phân vùng theo tenant nghe hợp lý vì 90 % câu hỏi lọc theo tenant, nhưng phần lọc tenant đã có index `(tenant_id, created_at)` lo. Thứ index không làm được là xóa dữ liệu quá 13 tháng: phân vùng theo tháng biến việc đó thành `DROP` một phân vùng thay vì `DELETE` hàng triệu dòng, và điều kiện \"30 ngày qua\" chỉ đọc một hai phân vùng. HASH 1 000 phân vùng hay LIST mỗi tenant một phân vùng đều không giúp xóa theo thời gian, và tạo hàng nghìn bảng nhỏ phải quản lý; với LIST, số phân vùng còn tăng theo số khách.", en: "Partitioning by tenant sounds right because 90% of the questions filter by tenant, but the `(tenant_id, created_at)` index already handles the tenant filter. What an index cannot do is delete data older than 13 months: monthly partitions turn that into a `DROP` of one partition instead of a `DELETE` of millions of rows, and \"the last 30 days\" reads only one or two partitions. HASH with 1,000 partitions or LIST with one partition per tenant does not help time-based deletion, and leaves thousands of small tables to manage; with LIST the count also grows with the number of tenants." }
  - q: { vi: "`CREATE INDEX ON events (tenant_id)` trên bảng cha phân vùng làm gì?", en: "What does `CREATE INDEX ON events (tenant_id)` on a partitioned parent do?" }
    options:
      - { vi: "Tạo một index toàn cục duy nhất trên mọi phân vùng", en: "Creates one global index over every partition" }
      - { vi: "Tạo index \"ảo\" ở bảng cha và một index thật trên mỗi phân vùng; phân vùng tạo sau cũng tự có index", en: "Creates a \"virtual\" index on the parent and a real index on each partition; partitions created later get one too" }
      - { vi: "Không được phép, phải tạo trên từng phân vùng", en: "It is not allowed; you must create it on each partition" }
    answer: 1
    trap: 0
    why: { vi: "\"Một index toàn cục\" nghe hợp lý vì lệnh chỉ chạy một lần trên bảng cha, nhưng bảng cha không chứa dòng nào, và Postgres không có index trải trên nhiều phân vùng. Lệnh vẫn được phép: index trên bảng cha là khuôn mẫu, Postgres tạo một index thật trên từng phân vùng, và phân vùng tạo sau cũng tự nhận một cái. Riêng `CONCURRENTLY` (tạo index không chặn ghi) không dùng được trên bảng cha: tạo trên từng phân vùng rồi `ATTACH` vào index cha.", en: "\"One global index\" sounds right because the command runs once on the parent, but the parent holds no rows, and Postgres has no index spanning several partitions. The command is allowed: the parent's index is a template, Postgres builds a real index on each partition, and a partition created later gets one automatically. Only `CONCURRENTLY` (building without blocking writes) does not work on the parent: build it per partition, then `ATTACH` it to the parent index." }
  - q: { vi: "Một phân vùng `DEFAULT` đang chứa nhiều dòng. Bạn thêm phân vùng mới cho tháng 11. Rủi ro là gì?", en: "A `DEFAULT` partition holds many rows. You add a new partition for November. What is the risk?" }
    options:
      - { vi: "Không có rủi ro", en: "There is none" }
      - { vi: "Postgres phải quét phân vùng mặc định để chắc không có dòng nào thuộc tháng 11; nếu có thì lệnh thất bại", en: "Postgres must scan the default partition to make sure no row belongs to November; if one does, the command fails" }
      - { vi: "Các dòng tháng 11 trong phân vùng mặc định tự chuyển sang", en: "November rows in the default partition move over automatically" }
    answer: 1
    trap: 2
    why: { vi: "\"Tự chuyển sang\" nghe hợp lý vì khi ghi, Postgres đưa mỗi dòng mới vào đúng phân vùng, nhưng nó không di chuyển dòng đã nằm sẵn trong phân vùng mặc định. Vì một dòng chỉ được thuộc một phân vùng, thêm phân vùng tháng 11 buộc Postgres quét cả phân vùng mặc định để chắc không có dòng tháng 11 nào; bảng mặc định càng lớn, lần quét càng lâu. Có dù chỉ một dòng, lệnh thất bại với mã 23514 (vi phạm ràng buộc kiểm tra). Giữ phân vùng mặc định gần rỗng và tạo trước các phân vùng tương lai.", en: "\"They move over\" sounds right because on write Postgres routes each new row to the right partition, but it does not move rows already sitting in the default partition. Since a row may belong to only one partition, adding November forces Postgres to scan the whole default partition to make sure no November row is there; the bigger the default, the longer the scan. If even one row matches, the command fails with code 23514 (check violation). Keep the default partition nearly empty and create future partitions ahead of time." }
---
## Mở bài

Bạn đã biết pruning bỏ được phân vùng thừa. Câu hỏi khó hơn là chia theo cột nào, khóa chính đặt thế nào, và cái gì sẽ hỏng khi bảng chạy được một năm.

## Ý chính

Chọn khóa phân vùng theo hai câu hỏi. Câu truy vấn hay gặp nhất lọc theo cột nào, để pruning bỏ được phần lớn phân vùng? Dữ liệu cũ bị xóa theo cột nào, để việc xóa là `DROP` một phân vùng thay vì `DELETE` hàng triệu dòng? Với dữ liệu sự kiện, câu trả lời thường là thời gian.

Nhiều người nghĩ bảng phân vùng có index chung cho cả bảng, như bảng thường. Thật ra mỗi phân vùng có index riêng; index tạo trên bảng cha chỉ là khuôn mẫu, được tạo xuống mọi phân vùng, kể cả phân vùng tạo sau. Vì không có index toàn cục, `PRIMARY KEY` và `UNIQUE` trên bảng phân vùng phải chứa mọi cột của khóa phân vùng: chỉ khi đó hai dòng trùng khóa chắc chắn rơi vào cùng một phân vùng và bị index của nó bắt.

Số phân vùng có giá. Tài liệu chính thức cho biết planner xử lý khá tốt tới vài nghìn phân vùng nếu câu hay gặp được pruning còn ít phân vùng. Không pruning được thì thời gian lập kế hoạch và bộ nhớ tăng theo số phân vùng.

Phân vùng `DEFAULT` tiện vì không dòng nào bị từ chối, nhưng mỗi lần thêm phân vùng mới, Postgres phải quét nó để chắc không có dòng nào thuộc khoảng mới. Tạo trước phân vùng cho các tháng sắp tới và giữ phân vùng mặc định gần rỗng.

## Ví dụ

Index trên bảng cha được tạo xuống từng phân vùng:

```sql
CREATE INDEX events_kind_idx ON events (kind);
SELECT tablename, indexname FROM pg_indexes WHERE tablename LIKE 'events%' ORDER BY tablename, indexname;
```

Phân vùng tạo sau cũng tự có index:

```sql
CREATE TABLE events_2026_11 PARTITION OF events FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
SELECT tablename, indexname FROM pg_indexes WHERE tablename = 'events_2026_11';
```

Bảng cha và index của nó không chứa dữ liệu:

```sql
SELECT relname, relkind FROM pg_class
WHERE relname IN ('events', 'events_2026_09', 'events_kind_idx') ORDER BY relname;
```

`relkind` = `p` là bảng phân vùng, `I` là index phân vùng: cả hai chỉ là khung. `events_2026_09` có `relkind` = `r`, một bảng thật. Xóa cả một tháng dữ liệu:

```sql
ALTER TABLE events DETACH PARTITION events_2026_09;
SELECT count(*) AS rows_left FROM events;
```

Còn 310 dòng của tháng 10. Bảng `events_2026_09` vẫn còn, đứng riêng: lưu trữ hay `DROP TABLE` tùy bạn, đều nhanh như nhau dù tháng đó có bao nhiêu dòng.

## Lỗi hay gặp

Khóa chính thiếu khóa phân vùng:

```sql
-- ERROR 0A000: unique constraint on partitioned table must include all partitioning columns
ALTER TABLE events ADD PRIMARY KEY (id);
```

Tạo index trên bảng cha mà không chặn lệnh ghi:

```sql
-- ERROR 0A000: cannot create index on partitioned table "events" concurrently
CREATE INDEX CONCURRENTLY events_day_idx ON events (created_on);
```

Tạo index `ON ONLY events` (chưa hợp lệ), tạo `CONCURRENTLY` trên từng phân vùng, rồi `ALTER INDEX … ATTACH PARTITION` từng cái.

Thêm phân vùng khi phân vùng mặc định đang giữ dòng của khoảng mới:

```sql
CREATE TABLE events_default PARTITION OF events DEFAULT;
INSERT INTO events VALUES (9999, '2026-12-05', 'view');
-- ERROR 23514: updated partition constraint for default partition "events_default" would be violated by some row
CREATE TABLE events_2026_12 PARTITION OF events FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');
```

Dòng ngày 2026-12-05 đã nằm trong `events_default`, và Postgres không tự chuyển nó. Chuyển các dòng đó ra trước (hoặc `DETACH` phân vùng mặc định), hoặc tạo phân vùng tháng 12 trước khi dữ liệu tới.

## Thực hành

Lab hai bước trên bảng phân vùng theo tháng: thêm khóa chính đúng luật, rồi xem mỗi dòng nằm ở phân vùng nào. Sau đó là bốn tình huống thiết kế.

## Tóm tắt

- Chọn khóa phân vùng theo câu truy vấn hay gặp nhất và theo cách xóa dữ liệu cũ; thường là thời gian.
- Không có index toàn cục: `PRIMARY KEY`/`UNIQUE` phải chứa mọi cột khóa phân vùng.
- Index trên bảng cha là khuôn mẫu, được tạo xuống mọi phân vùng; `CONCURRENTLY` phải làm từng phân vùng.
- Xóa dữ liệu cũ bằng `DETACH`/`DROP`; giữ phân vùng `DEFAULT` gần rỗng và tạo trước các phân vùng tương lai.
- Khi vài khách lớn cần tách riêng hay chuyển đi, phân vùng theo khách: `e-pg-l4-20`.

# EN

## Opening

You already know pruning can skip the extra partitions. The harder questions are which column to split on, how to define the primary key, and what will break once the table has run for a year.

## Key idea

Choose the partition key from two questions. Which column do the most frequent queries filter on, so that pruning skips most partitions? Which column is old data deleted by, so that deleting is a `DROP` of one partition instead of a `DELETE` of millions of rows? For event data the answer is usually time.

Many people think a partitioned table has one index over the whole table, like a plain table. In fact each partition has its own index; an index created on the parent is only a template, created on every partition, including partitions created later. Because there is no global index, a `PRIMARY KEY` or `UNIQUE` constraint on a partitioned table must contain every column of the partition key: only then do two rows with the same key surely land in the same partition, where its index catches them.

The number of partitions has a price. The official documentation says the planner handles up to a few thousand partitions fairly well if typical queries prune all but a few. Without pruning, planning time and memory grow with the partition count.

A `DEFAULT` partition is handy because no row is ever refused, but each time you add a partition, Postgres must scan it to make sure no row belongs to the new range. Create partitions for the coming months ahead of time and keep the default partition nearly empty.

## Example

An index on the parent is created on each partition:

```sql
CREATE INDEX events_kind_idx ON events (kind);
SELECT tablename, indexname FROM pg_indexes WHERE tablename LIKE 'events%' ORDER BY tablename, indexname;
```

A partition created later gets the index too:

```sql
CREATE TABLE events_2026_11 PARTITION OF events FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
SELECT tablename, indexname FROM pg_indexes WHERE tablename = 'events_2026_11';
```

The parent and its index hold no data:

```sql
SELECT relname, relkind FROM pg_class
WHERE relname IN ('events', 'events_2026_09', 'events_kind_idx') ORDER BY relname;
```

`relkind` = `p` is a partitioned table, `I` a partitioned index: both are only frames. `events_2026_09` has `relkind` = `r`, a real table. Removing a whole month of data:

```sql
ALTER TABLE events DETACH PARTITION events_2026_09;
SELECT count(*) AS rows_left FROM events;
```

October's 310 rows are left. Table `events_2026_09` still exists on its own: archive it or `DROP TABLE` it as you like, equally fast however many rows that month held.

## Common mistakes

A primary key without the partition key:

```sql
-- ERROR 0A000: unique constraint on partitioned table must include all partitioning columns
ALTER TABLE events ADD PRIMARY KEY (id);
```

Building an index on the parent without blocking writes:

```sql
-- ERROR 0A000: cannot create index on partitioned table "events" concurrently
CREATE INDEX CONCURRENTLY events_day_idx ON events (created_on);
```

Create the index `ON ONLY events` (not valid yet), build it `CONCURRENTLY` on each partition, then `ALTER INDEX … ATTACH PARTITION` each one.

Adding a partition while the default partition holds rows of the new range:

```sql
CREATE TABLE events_default PARTITION OF events DEFAULT;
INSERT INTO events VALUES (9999, '2026-12-05', 'view');
-- ERROR 23514: updated partition constraint for default partition "events_default" would be violated by some row
CREATE TABLE events_2026_12 PARTITION OF events FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');
```

The row dated 2026-12-05 already sits in `events_default`, and Postgres does not move it. Move those rows out first (or `DETACH` the default partition), or create the December partition before the data arrives.

## Practice

A two-step lab on a table partitioned by month: add a primary key that follows the rule, then see which partition holds each row. Then four design scenarios.

## Recap

- Choose the partition key from the most frequent queries and from how old data is removed; usually time.
- There is no global index: `PRIMARY KEY`/`UNIQUE` must contain every partition key column.
- An index on the parent is a template created on every partition; `CONCURRENTLY` must be done partition by partition.
- Remove old data with `DETACH`/`DROP`; keep the `DEFAULT` partition nearly empty and create future partitions ahead of time.
- When a few big tenants must be isolated or moved, partition by tenant: `e-pg-l4-20`.
