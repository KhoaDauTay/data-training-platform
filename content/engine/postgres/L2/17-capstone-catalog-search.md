---
id: e-pg-l2-17
engine: postgres
level: L2
module: capstone-l2
title: "Kiểm tra cấp L2: trang tìm sản phẩm chậm"
title_en: "Level L2 check: the slow product search page"
kind: capstone
runtime: browser
minutes: 18
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Với mỗi câu chậm, chọn đúng loại index (trigram, GIN jsonb, BRIN) và chứng minh bằng kế hoạch thật.
    en: For each slow query, choose the right index type (trigram, GIN jsonb, BRIN) and prove it with the real plan.
  - vi: Viết câu tìm sao cho nó thật sự đi qua index vừa tạo, không bọc cột trong một hàm làm mất index.
    en: Write searches that really go through the index you built, without wrapping the column in a function that loses it.
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
        vi: "Báo cáo \"hàng mới thêm trong một tuần\" lọc theo `added_at`. Hàng được thêm theo đúng thứ tự thời gian. Tạo index BRIN tên `catalog_added_brin` trên `added_at`, với `pages_per_range = 8` (tham số lưu trữ của index viết trong `WITH (...)` sau danh sách cột)."
        en: "The \"added this week\" report filters on `added_at`. Items are added in time order. Create a BRIN index named `catalog_added_brin` on `added_at`, with `pages_per_range = 8` (an index storage parameter goes in `WITH (...)` after the column list)."
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
    - task:
        vi: "Ô tìm kiếm giờ cần `id` và `name` của mọi hàng có tên chứa \"valve 12\", không phân biệt hoa thường. Câu phải nhanh: đi qua `catalog_name_trgm`, không quét cả 30.000 dòng."
        en: "The search box now needs the `id` and `name` of every item whose name contains \"valve 12\", ignoring case. The query must be fast: through `catalog_name_trgm`, not a scan of all 30,000 rows."
      solution: SELECT id, name FROM catalog WHERE name ILIKE '%valve 12%'
      check: rows
      perf: { table: catalog }
      slow: SELECT id, name FROM catalog WHERE lower(name) LIKE '%valve 12%'
      hint:
        vi: "Index trigram nằm trên chính cột `name` và đã hiểu `ILIKE`. Bọc cột trong `lower(...)` cho cùng dòng nhưng index không còn khớp."
        en: "The trigram index is on column `name` itself and already understands `ILIKE`. Wrapping the column in `lower(...)` gives the same rows, but the index no longer matches."
quiz:
  - q:
      vi: "Đồng nghiệp đề xuất thêm B-tree trên `attrs ->> 'color'` cho bộ lọc màu, vì \"index nào cũng làm câu nhanh hơn\". Màu chỉ có 3 giá trị, mỗi màu khoảng 1/3 bảng. Bạn trả lời gì?"
      en: "A colleague proposes a B-tree on `attrs ->> 'color'` for the color filter, because \"every index makes queries faster\". There are only 3 colors, each about 1/3 of the table. What do you answer?"
    options:
      - { vi: "Đồng ý, càng nhiều index càng nhanh", en: "Agree, more indexes are always faster" }
      - { vi: "Không nên: lọc ra 1/3 bảng thì planner vẫn chọn Seq Scan, còn index thì làm mọi lần ghi chậm thêm", en: "No: a filter keeping 1/3 of the table still gets a Seq Scan, while the index slows down every write" }
      - { vi: "Nên dùng Hash thay B-tree", en: "Use Hash instead of B-tree" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì index thường làm câu lọc nhanh hơn, nhưng index chỉ có lợi khi câu lấy một phần nhỏ của bảng. Lấy 10.000 trên 30.000 dòng thì đọc tuần tự rẻ hơn; bảng đã có bốn index (khóa chính và ba index vừa tạo), index thứ năm chỉ thêm một lần ghi index cho mỗi `INSERT`."
      en: "It sounds right because indexes usually speed up filters, but an index only pays off when a query reads a small part of the table. Reading 10,000 of 30,000 rows is cheaper sequentially; the table already has four indexes (the primary key and the three you built), and a fifth just adds one more index write to every `INSERT`."
  - q:
      vi: "\"`SELECT count(*) FROM catalog` sẽ đếm bằng khóa chính, nên rất nhanh.\" Trên bảng vừa nạp (chưa VACUUM), kế hoạch thật là gì?"
      en: "\"`SELECT count(*) FROM catalog` counts through the primary key, so it is instant.\" On this freshly loaded (never vacuumed) table, what is the real plan?"
    options:
      - { vi: "Index Only Scan trên `catalog_pkey`, không đụng tới bảng", en: "Index Only Scan on `catalog_pkey`, never touching the table" }
      - { vi: "Aggregate trên Seq Scan: Postgres phải đọc từng dòng để biết dòng nào nhìn thấy được", en: "Aggregate over a Seq Scan: Postgres must read the rows to know which ones are visible" }
      - { vi: "Postgres đọc số dòng lưu sẵn trong catalog", en: "Postgres reads a stored row count from the catalog" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì `catalog_pkey` nhỏ hơn bảng mà vẫn có mặt mọi dòng; nhưng Postgres không lưu sẵn số dòng chính xác: do MVCC, mỗi transaction có thể thấy số dòng khác nhau. Khi visibility map còn trống, index không giúp được và kế hoạch là `Aggregate` trên `Seq Scan on catalog`. Sau VACUUM, planner có thể chọn Index Only Scan, nhưng vẫn phải đi qua mọi mục index."
      en: "It sounds right because `catalog_pkey` is smaller than the table yet lists every row, but Postgres keeps no exact stored row count: with MVCC, each transaction may see a different number of rows. While the visibility map is empty the index cannot help, and the plan is an `Aggregate` over `Seq Scan on catalog`. After VACUUM the planner may pick an Index Only Scan, but it still walks every index entry."
---
## Mở bài

Trang tìm sản phẩm của kho phụ tùng mất vài giây mỗi lần lọc, và nhóm bán hàng đang than phiền. Có ba câu chậm, mỗi câu cần một loại index khác nhau. Bạn là người chọn, tạo và chứng minh từng index.

## Ý chính

Ba câu chậm và loại index hợp với mỗi câu:

- tìm tên "chứa chuỗi" (`ILIKE '%...%'`): GIN với opclass trigram `gin_trgm_ops`;
- lọc thuộc tính trong `jsonb` bằng `@>`: GIN `jsonb_path_ops`, nhỏ hơn bản mặc định;
- lọc theo ngày thêm, khi dữ liệu được ghi theo thời gian: BRIN, chỉ vài chục KB cho cả bảng.

Bài này gộp cả cấp L2: chọn loại index theo toán tử của câu hỏi, đặt đúng opclass, và chứng minh bằng kế hoạch thật, không bằng thời gian. Index chỉ giúp khi câu viết đúng dạng index hiểu: bọc cột trong một hàm là mất index.

## Ví dụ

```sql
EXPLAIN SELECT count(*) FROM catalog;
```

Không có index nào được dùng: `Aggregate` trên `Seq Scan on catalog`.

## Thực hành

Năm bước, mỗi bước một câu lệnh: ba index, một câu đếm qua BRIN, và một câu tìm tên đủ nhanh để qua thanh hiệu năng. Sau đó là hai câu hỏi kết luận.

## Tóm tắt

- Chọn loại index theo toán tử: `ILIKE '%...%'` cần trigram, `@>` cần GIN `jsonb_path_ops`, khoảng thời gian trên dữ liệu ghi theo thứ tự hợp với BRIN.
- Chứng minh bằng kế hoạch thật: tên index phải hiện trong `EXPLAIN`.
- Câu phải viết đúng dạng index hiểu; `lower(name) LIKE` làm mất index trigram trên `name`.
- Index nào cũng làm mỗi lần ghi chậm thêm; lọc ra phần lớn bảng thì không cần index.

# EN

## Opening

The spare-parts warehouse's product search takes seconds on every filter, and the sales team is complaining. There are three slow queries, and each needs a different kind of index. You are the one who picks, builds and proves each index.

## Key idea

The three slow queries and the index type that fits each:

- "contains" name search (`ILIKE '%...%'`): GIN with the trigram opclass `gin_trgm_ops`;
- filtering `jsonb` attributes with `@>`: GIN `jsonb_path_ops`, smaller than the default;
- filtering by date added, when data is written in time order: BRIN, only a few dozen KB for the whole table.

This lesson pulls level L2 together: pick the index type from the query's operator, choose the right opclass, and prove it with the real plan, never with timings. An index only helps when the query is written in a form the index understands: wrapping the column in a function loses the index.

## Example

```sql
EXPLAIN SELECT count(*) FROM catalog;
```

No index is used: an `Aggregate` over `Seq Scan on catalog`.

## Practice

Five steps, one statement each: three indexes, a count through BRIN, and a name search fast enough to pass the performance bar. Then two closing questions.

## Recap

- Pick the index type from the operator: `ILIKE '%...%'` needs trigrams, `@>` needs GIN `jsonb_path_ops`, a time range over data written in order fits BRIN.
- Prove it with the real plan: the index name must show up in `EXPLAIN`.
- Write the query in the form the index understands; `lower(name) LIKE` loses the trigram index on `name`.
- Every index slows each write a little; a filter that keeps most of the table needs no index.
