---
id: e-pg-l4-08
engine: postgres
level: L4
module: partitioning
title_en: "Designing partitions: key, keys and limits"
kind: quiz
minutes: 12
objectives:
  - { vi: "Chọn khóa phân vùng theo câu hỏi hay gặp nhất và cách xóa dữ liệu cũ", en: "Choose the partition key from the most frequent queries and the way old data is removed" }
  - { vi: "Biết ràng buộc UNIQUE/PRIMARY KEY phải chứa mọi cột khóa phân vùng", en: "Know that UNIQUE/PRIMARY KEY constraints must contain every partition key column" }
  - { vi: "Cân nhắc số phân vùng, phân vùng mặc định và index trên bảng cha", en: "Weigh the number of partitions, the default partition and indexes on the parent" }
requires: [e-pg-l4-07]
sources:
  - https://www.postgresql.org/docs/18/ddl-partitioning.html
  - https://www.postgresql.org/docs/18/sql-createindex.html
  - https://www.postgresql.org/docs/18/sql-createtable.html
quiz:
  - q: { vi: "Bảng sự kiện theo `created_on`, phân vùng theo tháng. Bạn chạy `ALTER TABLE events ADD PRIMARY KEY (id)`. Chuyện gì xảy ra?", en: "An events table is partitioned by month on `created_on`. You run `ALTER TABLE events ADD PRIMARY KEY (id)`. What happens?" }
    options:
      - { vi: "Thành công; Postgres kiểm tra trùng giữa mọi phân vùng", en: "It succeeds; Postgres checks duplicates across every partition" }
      - { vi: "Lỗi 0A000: ràng buộc unique trên bảng phân vùng phải chứa mọi cột phân vùng. Dùng `PRIMARY KEY (id, created_on)`", en: "Error 0A000: a unique constraint on a partitioned table must include all partitioning columns. Use `PRIMARY KEY (id, created_on)`" }
      - { vi: "Thành công nhưng chỉ unique trong từng phân vùng", en: "It succeeds, but is only unique within each partition" }
    answer: 1
    why: { vi: "Mỗi phân vùng có index riêng; Postgres chỉ bảo đảm duy nhất toàn bảng khi khóa phân vùng nằm trong khóa, để hai dòng trùng khóa luôn rơi vào cùng phân vùng.", en: "Each partition has its own index; Postgres can only guarantee table-wide uniqueness when the partition key is part of the key, so two equal keys always land in the same partition." }
  - q: { vi: "Hệ thống nhiều khách hàng (tenant), 90% câu hỏi là \"tenant X trong 30 ngày qua\", và dữ liệu quá 13 tháng phải xóa. Khóa phân vùng nào hợp lý nhất?", en: "A multi-tenant system: 90% of queries are \"tenant X over the last 30 days\", and data older than 13 months must be deleted. Which partition key fits best?" }
    options:
      - { vi: "RANGE theo thời gian (tháng), index `(tenant_id, created_at)` trên bảng cha", en: "RANGE by time (month), with an index `(tenant_id, created_at)` on the parent" }
      - { vi: "HASH theo `tenant_id` với 1000 phân vùng", en: "HASH on `tenant_id` with 1000 partitions" }
      - { vi: "LIST theo từng tenant, một phân vùng mỗi tenant", en: "LIST by tenant, one partition per tenant" }
    answer: 0
    why: { vi: "Phân vùng tháng cho pruning trên điều kiện 30 ngày và xóa dữ liệu cũ bằng `DROP` một phân vùng. Index tenant + thời gian xử lý phần lọc tenant. Phân vùng theo tenant không giúp xóa theo thời gian, và số phân vùng tăng theo số khách.", en: "Monthly partitions prune the 30-day condition and turn retention into `DROP` of one partition. The tenant + time index handles the tenant filter. Partitioning by tenant does not help time-based retention, and the partition count grows with the number of customers." }
  - q: { vi: "`CREATE INDEX ON events (tenant_id)` trên bảng cha phân vùng làm gì?", en: "What does `CREATE INDEX ON events (tenant_id)` on a partitioned parent do?" }
    options:
      - { vi: "Tạo một index toàn cục duy nhất trên mọi phân vùng", en: "Creates one global index over every partition" }
      - { vi: "Tạo index \"ảo\" ở bảng cha và một index thật trên mỗi phân vùng; phân vùng tạo sau cũng tự có index", en: "Creates a \"virtual\" index on the parent and a real index on each partition; partitions created later get one too" }
      - { vi: "Không được phép, phải tạo trên từng phân vùng", en: "It is not allowed; you must create it on each partition" }
    answer: 1
    why: { vi: "Postgres không có index toàn cục; index trên bảng cha là khuôn mẫu, mỗi phân vùng giữ index thật của mình. `CONCURRENTLY` không dùng được trên bảng cha: tạo trên từng phân vùng rồi `ATTACH`.", en: "Postgres has no global index; the parent's index is a template and each partition holds its own real index. `CONCURRENTLY` does not work on the parent: build it per partition, then `ATTACH`." }
  - q: { vi: "Một phân vùng `DEFAULT` đang chứa nhiều dòng. Bạn thêm phân vùng mới cho tháng 11. Rủi ro là gì?", en: "A `DEFAULT` partition holds many rows. You add a new partition for November. What is the risk?" }
    options:
      - { vi: "Không có rủi ro", en: "There is none" }
      - { vi: "Postgres phải quét phân vùng mặc định để chắc không có dòng nào thuộc tháng 11; nếu có thì lệnh thất bại", en: "Postgres must scan the default partition to make sure no row belongs to November; if one does, the command fails" }
      - { vi: "Các dòng tháng 11 trong phân vùng mặc định tự chuyển sang", en: "November rows in the default partition move over automatically" }
    answer: 1
    why: { vi: "Thêm phân vùng phải chứng minh phân vùng mặc định không chứa dòng thuộc khoảng mới. Giữ phân vùng mặc định gần rỗng và tạo trước các phân vùng tương lai.", en: "Adding a partition must prove the default partition holds no row of the new range. Keep the default partition nearly empty and create future partitions ahead of time." }
---

## Ý chính

- Chọn khóa phân vùng theo **hai câu hỏi**: câu truy vấn hay gặp nhất lọc theo cột nào (để pruning), và dữ liệu cũ bị xóa theo cột nào (để `DROP` phân vùng).
- PRIMARY KEY/UNIQUE trên bảng phân vùng phải chứa mọi cột khóa phân vùng, và không được là biểu thức.
- Index trên bảng cha được lan xuống mọi phân vùng (kể cả phân vùng tạo sau). Không có index toàn cục.
- Số phân vùng: tài liệu nói planner xử lý khá tốt tới vài nghìn phân vùng **nếu** câu hay gặp pruning còn ít phân vùng; không pruning được thì thời gian lập kế hoạch và bộ nhớ tăng theo số phân vùng.
- Phân vùng `DEFAULT` tiện nhưng làm việc thêm phân vùng mới phải quét nó.

## Ví dụ

Lỗi thật trên PGlite khi thêm khóa chính chỉ có `id` vào bảng `events` phân vùng theo `created_on`:

```text
ALTER TABLE events ADD PRIMARY KEY (id);
ERROR:  unique constraint on partitioned table must include all partitioning columns  (SQLSTATE 0A000)
```

## Thực hành

Bốn tình huống thiết kế. Kỹ năng chuyên gia: thiết kế phân vùng từ mẫu truy vấn và quy tắc giữ dữ liệu, biết trước các giới hạn sẽ gặp.

# EN

## Key ideas

- Choose the partition key from **two questions**: which column the most frequent queries filter on (for pruning), and which column old data is deleted by (to `DROP` partitions).
- A PRIMARY KEY/UNIQUE constraint on a partitioned table must contain every partition key column, and the key cannot be an expression.
- An index on the parent is propagated to every partition (including ones created later). There is no global index.
- Number of partitions: the docs say the planner handles up to a few thousand partitions fairly well **if** typical queries prune all but a few; without pruning, planning time and memory grow with the partition count.
- A `DEFAULT` partition is handy but makes adding a new partition scan it.

## Example

Real error from PGlite when adding a primary key on `id` only to `events`, partitioned by `created_on`:

```text
ALTER TABLE events ADD PRIMARY KEY (id);
ERROR:  unique constraint on partitioned table must include all partitioning columns  (SQLSTATE 0A000)
```

## Practice

Four design scenarios. Expert skill: design partitions from the query pattern and the retention rule, knowing the limits ahead of time.
