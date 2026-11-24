---
id: e-ds-l4-11
engine: design
level: L4
module: multi-tenant
title: Tổng hợp - cổng người bán của Chợ Lồng Đèn
title_en: Capstone - the Lantern Market seller portal
kind: capstone
runtime: browser
minutes: 30
objectives:
  - vi: Siết một pool có sẵn bằng khóa ngoại ghép và luật duy nhất theo người bán.
    en: Tighten an existing pool with a composite foreign key and a per-seller uniqueness rule.
  - vi: Tìm người bán nóng nhất từ dữ liệu đơn hàng.
    en: Find the hottest seller from the order data.
  - vi: Đánh index bắt đầu bằng tenant_id để trang của người bán đó nhanh, và chứng minh bằng thanh tốc độ.
    en: Add an index that starts with tenant_id so that seller's page is fast, and prove it with the speed bar.
requires: [e-ds-l4-10]
sources:
  - https://www.postgresql.org/docs/18/ddl-constraints.html
  - https://www.postgresql.org/docs/18/indexes-multicolumn.html
  - https://www.postgresql.org/docs/18/indexes-expressional.html
lab:
  setup: |
    CREATE TABLE sellers (
      id int PRIMARY KEY,
      name text NOT NULL
    );
    INSERT INTO sellers SELECT g, 'Seller ' || g FROM generate_series(1, 50) g;
    CREATE TABLE products (
      tenant_id int NOT NULL REFERENCES sellers (id),
      id int NOT NULL,
      sku text NOT NULL,
      PRIMARY KEY (tenant_id, id)
    );
    INSERT INTO products
    SELECT t, p, 'SKU-' || p FROM generate_series(1, 50) t, generate_series(1, 20) p;
    CREATE TABLE orders (
      tenant_id int NOT NULL REFERENCES sellers (id),
      id int NOT NULL,
      product_id int NOT NULL,
      placed_on date NOT NULL,
      qty int NOT NULL,
      PRIMARY KEY (tenant_id, id)
    );
    INSERT INTO orders
    SELECT CASE WHEN g % 5 = 0 THEN 1 ELSE g % 49 + 2 END, g, g % 20 + 1,
           DATE '2026-10-01' + g % 31, 1 + g % 3
    FROM generate_series(1, 30000) g;
    ANALYZE;
  steps:
    - name: { vi: Khóa ngoại ghép, en: Composite foreign key }
      task:
        vi: "Mỗi đơn phải trỏ tới sản phẩm của chính người bán đó: thêm khóa ngoại `(tenant_id, product_id)` của `orders` trỏ tới `products (tenant_id, id)`. Đừng đặt tên ràng buộc."
        en: "Every order must point at its own seller's product: add a foreign key `(tenant_id, product_id)` on `orders` pointing to `products (tenant_id, id)`. Do not name the constraint."
      solution: ALTER TABLE orders ADD FOREIGN KEY (tenant_id, product_id) REFERENCES products (tenant_id, id)
      check: catalog
      hint:
        vi: "`ALTER TABLE orders ADD FOREIGN KEY (tenant_id, product_id) REFERENCES products (tenant_id, id)`."
        en: "`ALTER TABLE orders ADD FOREIGN KEY (tenant_id, product_id) REFERENCES products (tenant_id, id)`."
    - name: { vi: Mã hàng theo người bán, en: SKU per seller }
      task:
        vi: "Mã hàng duy nhất trong một người bán, không phân biệt hoa thường: tạo index duy nhất tên `products_sku_ci` trên `products (tenant_id, lower(sku))`."
        en: "A SKU is unique within one seller, ignoring case: create a unique index named `products_sku_ci` on `products (tenant_id, lower(sku))`."
      solution: CREATE UNIQUE INDEX products_sku_ci ON products (tenant_id, lower(sku))
      check: catalog
      hint:
        vi: "Như bài `e-ds-l2-07`: `CREATE UNIQUE INDEX products_sku_ci ON products (tenant_id, lower(sku))`."
        en: "As in lesson `e-ds-l2-07`: `CREATE UNIQUE INDEX products_sku_ci ON products (tenant_id, lower(sku))`."
    - name: { vi: Người bán nóng, en: The hot seller }
      task:
        vi: "Ba người bán nhiều đơn nhất: `tenant_id`, số đơn `orders`, phần trăm trên tổng `share` (làm tròn 1 chữ số), xếp theo số đơn giảm dần rồi `tenant_id`."
        en: "The three sellers with the most orders: `tenant_id`, the order count `orders`, the percentage of the total `share` (rounded to 1 decimal), ordered by order count descending, then `tenant_id`."
      solution: SELECT tenant_id, count(*) AS orders, round(100.0 * count(*) / sum(count(*)) OVER (), 1) AS share FROM orders GROUP BY tenant_id ORDER BY orders DESC, tenant_id LIMIT 3
      check: rows
      ordered: true
      hint:
        vi: "`GROUP BY tenant_id`, rồi `sum(count(*)) OVER ()` là tổng của mọi nhóm; `LIMIT 3` sau `ORDER BY`."
        en: "`GROUP BY tenant_id`, then `sum(count(*)) OVER ()` is the total over every group; `LIMIT 3` after `ORDER BY`."
    - name: { vi: Index cho trang, en: Index for the page }
      task:
        vi: "Trang của người bán luôn hỏi đơn của một người bán trong một khoảng ngày. Tạo index trên `orders (tenant_id, placed_on)`. Đừng đặt tên index."
        en: "The seller page always asks for one seller's orders over a date range. Create an index on `orders (tenant_id, placed_on)`. Do not name the index."
      solution: CREATE INDEX ON orders (tenant_id, placed_on)
      check: catalog
      hint:
        vi: "Cột so bằng (`tenant_id`) đứng trước, cột khoảng (`placed_on`) đứng sau."
        en: "The equality column (`tenant_id`) first, the range column (`placed_on`) second."
    - name: { vi: Tuần của người bán 1, en: Seller 1's week }
      task:
        vi: "Tuần cuối tháng của người bán 1: số đơn `orders` và tổng số lượng `items` từ ngày `2026-10-25`. Thanh tốc độ chấm cả cách lọc: để nguyên hai cột trong điều kiện."
        en: "Seller 1's last week of the month: the order count `orders` and the total quantity `items` from `2026-10-25`. The speed bar grades the filter too: leave both columns bare in the condition."
      solution: SELECT count(*) AS orders, sum(qty) AS items FROM orders WHERE tenant_id = 1 AND placed_on >= DATE '2026-10-25'
      check: rows
      perf: { table: orders }
      slow: SELECT count(*) AS orders, sum(qty) AS items FROM orders WHERE tenant_id + 0 = 1 AND placed_on + 0 >= DATE '2026-10-25'
      hint:
        vi: "`WHERE tenant_id = 1 AND placed_on >= DATE '2026-10-25'`: bọc cột trong phép tính thì index không dùng được."
        en: "`WHERE tenant_id = 1 AND placed_on >= DATE '2026-10-25'`: wrapping a column in arithmetic makes the index unusable."
quiz:
  - q:
      vi: "Người bán 1 có 20% đơn của cả chợ và đang làm chậm hàng xóm. Bước tiếp theo hợp lý nhất?"
      en: "Seller 1 holds 20% of the market's orders and is slowing its neighbours. What is the most sensible next step?"
    options:
      - { vi: "Đổi cả chợ sang schema mỗi người bán", en: "Move the whole market to one schema per seller" }
      - { vi: "Giữ cùng cấu trúc bảng, chuyển riêng người bán 1 sang máy của họ: chọn dữ liệu theo tenant_id, chép cha trước con sau, rồi đổi một dòng định tuyến", en: "Keep the same table design and move seller 1 alone to its own server: select its data by tenant_id, copy parents first, then change one routing row" }
      - { vi: "Xóa bớt đơn cũ của mọi người bán", en: "Delete old orders of every seller" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì schema riêng tách mọi người khỏi nhau, nhưng 49 người bán nhỏ không có vấn đề gì và sẽ phải gánh việc đổi cấu trúc gấp 50. Vì mọi khóa bắt đầu bằng tenant_id, dữ liệu của người bán 1 tách ra được trọn vẹn."
      en: "It sounds right because own schemas separate everyone, but the 49 small sellers have no problem and would carry 50 times the schema changes. Because every key starts with tenant_id, seller 1's data comes out whole."
  - q:
      vi: "Bảng `orders` đã có khóa chính `(tenant_id, id)`. Vì sao trang của người bán 1 vẫn cần index `(tenant_id, placed_on)`?"
      en: "Table `orders` already has the primary key `(tenant_id, id)`. Why does seller 1's page still need the index `(tenant_id, placed_on)`?"
    options:
      - { vi: "Không cần: khóa chính đã bắt đầu bằng tenant_id nên đủ nhanh", en: "It does not: the primary key already starts with tenant_id, so it is fast enough" }
      - { vi: "Khóa chính chỉ thu hẹp tới mọi đơn của người bán 1; index thêm `placed_on` ngay sau `tenant_id` thì đọc thẳng đoạn một tuần", en: "The primary key only narrows to all of seller 1's orders; an index with `placed_on` right after `tenant_id` reads the one-week range directly" }
      - { vi: "Vì khóa chính không dùng được cho điều kiện bằng", en: "Because a primary key cannot serve an equality condition" }
    answer: 1
    trap: 0
    why:
      vi: "Nhiều người nghĩ cột đầu đúng là đủ. Thật ra với người bán nóng, `tenant_id = 1` vẫn còn 6.000 dòng; cột thứ hai của index phải là cột mà câu lọc theo khoảng, để đọc đúng tuần cần thiết."
      en: "Many people think the right first column is enough. In fact for the hot seller `tenant_id = 1` still leaves 6,000 rows; the index's second column must be the one the query filters by range, so it reads only the week it needs."
---
## Mở bài

Cổng người bán của Chợ Lồng Đèn đã chạy một năm trên một pool: 50 người bán, bảng sản phẩm và đơn hàng chung, khóa chính đã có `tenant_id`. Nhưng đơn có thể trỏ sang sản phẩm của người khác, mã hàng không có luật, và một người bán đang làm trang của mọi người chậm đi. Bài tổng hợp này siết khóa, đặt luật, tìm người bán nóng và làm trang của họ nhanh lại.

## Thực hành

Pool có sẵn: `sellers` (50 người bán), `products` (20 sản phẩm mỗi người bán, khóa `(tenant_id, id)`), `orders` (30.000 đơn tháng 10, khóa `(tenant_id, id)`). Còn thiếu khóa ngoại từ đơn tới sản phẩm, và mã hàng chưa có luật nào.

Năm bước. Hai bước đầu siết dữ liệu (chấm bằng catalog, đừng đặt tên ràng buộc): khóa ngoại ghép, rồi luật mã hàng không phân biệt hoa thường theo người bán. Bước 3 tìm người bán nóng. Bước 4 tạo index bắt đầu bằng `tenant_id`, và bước 5 hỏi tuần cuối của người bán đó, có thanh tốc độ: câu đúng mà không dùng được index vẫn bị từ chối.

## Tóm tắt

- Pool đủ chặt khi mọi khóa ngoại và luật duy nhất đều có `tenant_id` đứng đầu.
- Đo trước khi chuyển: một câu `GROUP BY tenant_id` cho thấy ai chiếm phần lớn tải.
- Index cho trang người bán: cột so bằng `tenant_id` trước, cột khoảng ngày sau.
- Đọc tiếp: `e-ds-l4-09` (bản đồ chủ đề) và `e-pg-l5-10` (lớp chính sách).

# EN

## Opening

The Lantern Market seller portal has run for a year on a pool: 50 sellers, shared product and order tables, primary keys that already carry `tenant_id`. But an order can point at another seller's product, SKUs follow no rule, and one seller is making everyone's pages slower. This capstone tightens the keys, sets the rule, finds the hot seller and makes their page fast again.

## Practice

The pool as it stands: `sellers` (50 sellers), `products` (20 products per seller, keyed `(tenant_id, id)`), `orders` (30,000 October orders, keyed `(tenant_id, id)`). The foreign key from orders to products is missing, and SKUs have no rule at all.

Five steps. The first two tighten the data (graded on the catalog, do not name the constraints): the composite foreign key, then a case-insensitive SKU rule per seller. Step 3 finds the hot seller. Step 4 creates an index that starts with `tenant_id`, and step 5 asks for that seller's last week, with a speed bar: a right answer that cannot use the index is still refused.

## Recap

- A pool is tight when every foreign key and uniqueness rule has `tenant_id` first.
- Measure before moving: one `GROUP BY tenant_id` query shows who carries most of the load.
- An index for the seller page: the equality column `tenant_id` first, the date range column second.
- Read next: `e-ds-l4-09` (the theme map) and `e-pg-l5-10` (the policy layer).
