---
id: e-pg-l2-17
engine: postgres
level: L2
module: capstone-l2
title: "Kiểm tra cấp L2: trang tìm sản phẩm chậm"
title_en: "Level L2 check: the slow product search page"
kind: capstone
runtime: browser
minutes: 15
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
objectives:
  - vi: Với mỗi câu chậm, chọn đúng loại index (trigram, GIN jsonb, BRIN) và chứng minh bằng kế hoạch thật.
    en: For each slow query, choose the right index type (trigram, GIN jsonb, BRIN) and prove it with the real plan.
requires: [e-pg-l2-16]
sources:
  - https://www.postgresql.org/docs/18/indexes-types.html
  - https://www.postgresql.org/docs/18/pgtrgm.html
  - https://www.postgresql.org/docs/18/gin.html
  - https://www.postgresql.org/docs/18/brin.html
  - https://www.postgresql.org/docs/18/using-explain.html
lab:
  setup: |
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
    CREATE TABLE catalog (
      id int PRIMARY KEY,
      name text NOT NULL,
      attrs jsonb NOT NULL,
      added_at timestamptz NOT NULL
    );
    INSERT INTO catalog
    SELECT g,
           (ARRAY['Steel', 'Rubber', 'Copper', 'Plastic'])[1 + g % 4] || ' '
           || (ARRAY['bolt', 'hose', 'valve', 'gasket', 'bracket'])[1 + (g / 4) % 5] || ' ' || g,
           jsonb_build_object('color', (ARRAY['red', 'blue', 'grey'])[1 + g % 3],
                              'origin', CASE WHEN g % 89 = 0 THEN 'JP' ELSE 'VN' END),
           timestamptz '2025-01-01 00:00+00' + g * interval '20 minutes'
    FROM generate_series(1, 30000) AS g;
    ANALYZE catalog;
  steps:
    - task:
        vi: "Ô tìm kiếm chạy `name ILIKE '%valve 12%'` và đang quét cả bảng. Tạo index tên `catalog_name_trgm` để câu \"chứa chuỗi\" này dùng được index."
        en: "The search box runs `name ILIKE '%valve 12%'` and scans the whole table. Create an index named `catalog_name_trgm` so this \"contains\" query can use an index."
      solution: CREATE INDEX catalog_name_trgm ON catalog USING gin (name gin_trgm_ops)
      target: SELECT id, name FROM catalog WHERE name ILIKE '%valve 12%'
      check: catalog
      hint:
        vi: "B-tree không giúp `%` ở đầu. Cần GIN với opclass trigram (`pg_trgm` đã bật)."
        en: "A B-tree cannot help a leading `%`. You need GIN with the trigram opclass (`pg_trgm` is enabled)."
    - task:
        vi: "Bộ lọc \"hàng xuất xứ Nhật\" chạy `attrs @> '{\"origin\":\"JP\"}'`. Tạo index GIN tên `catalog_attrs_idx` nhỏ nhất có thể cho đúng toán tử này."
        en: "The \"made in Japan\" filter runs `attrs @> '{\"origin\":\"JP\"}'`. Create the smallest GIN index for exactly this operator, named `catalog_attrs_idx`."
      solution: CREATE INDEX catalog_attrs_idx ON catalog USING gin (attrs jsonb_path_ops)
      target: SELECT id FROM catalog WHERE attrs @> '{"origin":"JP"}'
      check: catalog
      hint:
        vi: "Chỉ cần `@>`, nên chọn opclass `jsonb_path_ops`."
        en: "Only `@>` is needed, so choose the `jsonb_path_ops` opclass."
    - task:
        vi: "Báo cáo \"hàng mới thêm trong một tuần\" lọc theo `added_at`. Hàng được thêm theo đúng thứ tự thời gian. Tạo index BRIN tên `catalog_added_brin` trên `added_at`, với `pages_per_range = 8`."
        en: "The \"added this week\" report filters on `added_at`. Items are added in time order. Create a BRIN index named `catalog_added_brin` on `added_at`, with `pages_per_range = 8`."
      solution: CREATE INDEX catalog_added_brin ON catalog USING brin (added_at) WITH (pages_per_range = 8)
      target: SELECT count(*) FROM catalog WHERE added_at >= timestamptz '2025-06-01 00:00+00' AND added_at < timestamptz '2025-06-08 00:00+00'
      check: catalog
      hint:
        vi: "`USING brin (added_at) WITH (pages_per_range = 8)`."
        en: "`USING brin (added_at) WITH (pages_per_range = 8)`."
    - task:
        vi: "Đếm số hàng thêm từ 2025-06-01 tới hết 2025-06-07 (UTC). Kế hoạch phải dùng `catalog_added_brin`."
        en: "Count the items added from 2025-06-01 through 2025-06-07 (UTC). The plan must use `catalog_added_brin`."
      solution: SELECT count(*) FROM catalog WHERE added_at >= timestamptz '2025-06-01 00:00+00' AND added_at < timestamptz '2025-06-08 00:00+00'
      check: plan
      hint:
        vi: "Điều kiện khoảng `>=` và `<` trên `added_at`."
        en: "A range condition with `>=` and `<` on `added_at`."
quiz:
  - q:
      vi: "Đồng nghiệp đề xuất thêm B-tree trên `attrs ->> 'color'` cho bộ lọc màu, vì \"index nào cũng làm câu nhanh hơn\". Màu chỉ có 3 giá trị, mỗi màu khoảng 1/3 bảng. Bạn trả lời gì?"
      en: "A colleague proposes a B-tree on `attrs ->> 'color'` for the color filter, because \"every index makes queries faster\". There are only 3 colors, each about 1/3 of the table. What do you answer?"
    options:
      - { vi: "Đồng ý, càng nhiều index càng nhanh", en: "Agree, more indexes are always faster" }
      - { vi: "Không nên: lọc ra 1/3 bảng thì planner vẫn chọn Seq Scan, còn index thì làm mọi lần ghi chậm thêm", en: "No: a filter keeping 1/3 of the table still gets a Seq Scan, while the index slows down every write" }
      - { vi: "Nên dùng Hash thay B-tree", en: "Use Hash instead of B-tree" }
    answer: 1
    why:
      vi: "Index chỉ có lợi khi câu lấy một phần nhỏ của bảng. Lấy 10.000 trên 30.000 dòng thì đọc tuần tự rẻ hơn; index thứ tư chỉ thêm một lần ghi index cho mỗi `INSERT`."
      en: "An index only pays off when a query reads a small part of the table. Reading 10,000 of 30,000 rows is cheaper sequentially; a fourth index just adds one more index write to every `INSERT`."
  - q:
      vi: "\"`SELECT count(*) FROM catalog` sẽ đếm bằng khóa chính, nên rất nhanh.\" Trên bảng vừa nạp (chưa VACUUM), kế hoạch thật là gì?"
      en: "\"`SELECT count(*) FROM catalog` counts through the primary key, so it is instant.\" On this freshly loaded (never vacuumed) table, what is the real plan?"
    options:
      - { vi: "Index Only Scan trên `catalog_pkey`, không đụng tới bảng", en: "Index Only Scan on `catalog_pkey`, never touching the table" }
      - { vi: "Aggregate trên Seq Scan: Postgres phải đọc từng dòng để biết dòng nào nhìn thấy được", en: "Aggregate over a Seq Scan: Postgres must read the rows to know which ones are visible" }
      - { vi: "Postgres đọc số dòng lưu sẵn trong catalog", en: "Postgres reads a stored row count from the catalog" }
    answer: 1
    why:
      vi: "Postgres không lưu sẵn số dòng chính xác: do MVCC, mỗi transaction có thể thấy số dòng khác nhau. Khi visibility map còn trống, index không giúp được và kế hoạch là `Aggregate` trên `Seq Scan on catalog`. Sau VACUUM, planner có thể chọn Index Only Scan, nhưng vẫn phải đi qua mọi mục index."
      en: "Postgres keeps no exact stored row count: with MVCC, each transaction may see a different number of rows. While the visibility map is empty the index cannot help, and the plan is an `Aggregate` over `Seq Scan on catalog`. After VACUUM the planner may pick an Index Only Scan, but it still walks every index entry."
---
## Ý chính

Trang tìm sản phẩm có ba câu chậm, mỗi câu cần một loại index khác:

- tìm tên "chứa chuỗi": trigram GIN;
- lọc thuộc tính trong `jsonb` bằng `@>`: GIN `jsonb_path_ops`;
- lọc theo ngày thêm, khi dữ liệu được ghi theo thời gian: BRIN rất nhỏ.

Bài này gộp cả cấp L2: chọn loại index theo toán tử của câu hỏi, đặt đúng opclass, và chứng minh bằng kế hoạch thật, không bằng thời gian.

## Ví dụ

```sql
EXPLAIN SELECT count(*) FROM catalog;
```

Không có index nào được dùng: `Aggregate` trên `Seq Scan on catalog`.

## Thực hành

Bốn bước, mỗi bước một câu lệnh, rồi hai câu hỏi kết luận.

# EN

## Key idea

The product search page has three slow queries, and each needs a different index type:

- "contains" name search: trigram GIN;
- filtering `jsonb` attributes with `@>`: GIN `jsonb_path_ops`;
- filtering by date added, when data is written in time order: a tiny BRIN.

This lesson pulls level L2 together: pick the index type from the query's operator, choose the right opclass, and prove it with the real plan, never with timings.

## Example

```sql
EXPLAIN SELECT count(*) FROM catalog;
```

No index is used: an `Aggregate` over `Seq Scan on catalog`.

## Practice

Four steps, one statement each, then two closing questions.
