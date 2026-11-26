---
id: e-ds-l5-11
engine: design
level: L5
module: tenant-platform
title: Tổng hợp - Chợ Lồng Đèn từ pool sang lai
title_en: Capstone - Lantern Market from pool to hybrid
kind: capstone
runtime: browser
minutes: 30
figures: [{ name: ds-pool-to-hybrid, at: practice }]
objectives:
  - vi: Tìm shard quá tải và người bán làm nó quá tải từ dữ liệu đơn hàng.
    en: Find the overloaded shard, and the seller overloading it, from the order data.
  - vi: Đặt lưới chính sách theo dòng cho pool, đóng an toàn khi chưa có khách hiện tại.
    en: Put the row-policy net on the pool, closed safely when no current tenant is set.
  - vi: Chuyển người bán lớn sang shard riêng bằng một dòng danh mục, rồi làm trang của họ nhanh và chứng minh bằng thanh tốc độ.
    en: Move the big seller to a dedicated shard with one catalog row, then make their page fast and prove it with the speed bar.
requires: [e-ds-l5-10]
sources:
  - url: https://www.postgresql.org/docs/18/ddl-rowsecurity.html
    title: "Row Security Policies"
  - url: https://www.postgresql.org/docs/18/functions-admin.html#FUNCTIONS-ADMIN-SET
    title: "System Administration Functions › Configuration Settings"
  - url: https://www.postgresql.org/docs/18/indexes-multicolumn.html
    title: "Multicolumn Indexes"
lab:
  setup: |
    CREATE TABLE shards (
      shard_id text PRIMARY KEY,
      tier text NOT NULL,
      state text NOT NULL
    );
    INSERT INTO shards VALUES ('s1', 'pool', 'serving'), ('s2', 'pool', 'serving'), ('s3', 'dedicated', 'serving');
    CREATE TABLE directory (
      tenant_id int PRIMARY KEY,
      tier text NOT NULL,
      shard_id text NOT NULL REFERENCES shards,
      version int NOT NULL
    );
    INSERT INTO directory
    SELECT g, 'pro', CASE WHEN g % 2 = 1 THEN 's1' ELSE 's2' END, 1 FROM generate_series(1, 50) g;
    CREATE TABLE orders (
      tenant_id int NOT NULL REFERENCES directory,
      id int NOT NULL,
      placed_on date NOT NULL,
      qty int NOT NULL,
      PRIMARY KEY (tenant_id, id)
    );
    INSERT INTO orders
    SELECT CASE WHEN g % 5 = 0 THEN 1 ELSE g % 49 + 2 END, g,
           DATE '2026-10-01' + g % 31, 1 + g % 3
    FROM generate_series(1, 30000) g;
    ANALYZE;
  steps:
    - name: { vi: Shard quá tải, en: Busy shard }
      task:
        vi: "Tải theo shard: với mỗi `shard_id` trong `directory`, số đơn `orders` của các người bán ở đó. Lấy `shard_id`, `orders`, xếp theo `shard_id`."
        en: "Load per shard: for each `shard_id` in `directory`, the number of orders `orders` of the sellers living there. Get `shard_id`, `orders`, ordered by `shard_id`."
      solution: SELECT d.shard_id, count(*) AS orders FROM orders o JOIN directory d ON d.tenant_id = o.tenant_id GROUP BY d.shard_id ORDER BY d.shard_id
      check: rows
      ordered: true
      hint:
        vi: "Nối `orders` với `directory` bằng `tenant_id`, rồi `GROUP BY d.shard_id`."
        en: "Join `orders` to `directory` on `tenant_id`, then `GROUP BY d.shard_id`."
    - name: { vi: Bật RLS, en: RLS on }
      task:
        vi: "Pool cần lưới: bật bảo mật theo dòng cho bảng `orders`."
        en: "The pool needs its net: turn on row-level security for table `orders`."
      solution: ALTER TABLE orders ENABLE ROW LEVEL SECURITY
      check: catalog
      hint:
        vi: "`ALTER TABLE orders ENABLE ROW LEVEL SECURITY`."
        en: "`ALTER TABLE orders ENABLE ROW LEVEL SECURITY`."
    - name: { vi: Chính sách, en: Policy }
      task:
        vi: "Tạo chính sách `seller_rows` trên `orders`: một dòng chỉ thấy được khi `tenant_id` bằng `NULLIF(current_setting('app.tenant_id', true), '')::int`, để khi chưa đặt khách thì không thấy dòng nào."
        en: "Create the policy `seller_rows` on `orders`: a row is visible only when `tenant_id` equals `NULLIF(current_setting('app.tenant_id', true), '')::int`, so that with no tenant set no row is visible."
      solution: CREATE POLICY seller_rows ON orders USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::int)
      check: catalog
      hint:
        vi: "`CREATE POLICY seller_rows ON orders USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::int)`."
        en: "`CREATE POLICY seller_rows ON orders USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::int)`."
    - name: { vi: Dời người bán 1, en: Move seller 1 }
      task:
        vi: "Dữ liệu của người bán 1 đã chép sang shard riêng `s3`. Đổi dòng danh mục của họ: gói `dedicated`, shard `s3`, `version` tăng 1, chỉ khi `version` vẫn là 1. Bài chấm bằng ba dòng đầu của danh mục."
        en: "Seller 1's data has been copied to the dedicated shard `s3`. Change their catalog row: tier `dedicated`, shard `s3`, `version` up by 1, only if `version` is still 1. It is graded by the first three catalog rows."
      solution: UPDATE directory SET tier = 'dedicated', shard_id = 's3', version = version + 1 WHERE tenant_id = 1 AND version = 1
      after: SELECT tenant_id, tier, shard_id, version FROM directory WHERE tenant_id <= 3 ORDER BY tenant_id
      check: rows
      ordered: true
      hint:
        vi: "Như bài `e-ds-l5-10`: một `UPDATE` có `AND version = 1`."
        en: "As in lesson `e-ds-l5-10`: one `UPDATE` with `AND version = 1`."
    - name: { vi: Index trang, en: Page index }
      task:
        vi: "Trang của người bán 1 luôn hỏi đơn của họ trong một khoảng ngày. Tạo index trên `orders (tenant_id, placed_on)`. Đừng đặt tên index."
        en: "Seller 1's page always asks for their orders over a date range. Create an index on `orders (tenant_id, placed_on)`. Do not name the index."
      solution: CREATE INDEX ON orders (tenant_id, placed_on)
      check: catalog
      hint:
        vi: "Cột so bằng `tenant_id` trước, cột khoảng `placed_on` sau."
        en: "The equality column `tenant_id` first, the range column `placed_on` second."
    - name: { vi: Tuần người bán 1, en: Seller 1's week }
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
      vi: "Cùng cổng người bán này trên MongoDB, trang 'đơn của một người bán trong một tuần' nên dùng index nào?"
      en: "The same seller portal on MongoDB: which index should the page 'one seller's orders in one week' use?"
    options:
      - { vi: "`{ placedOn: 1, tenantId: 1 }`", en: "`{ placedOn: 1, tenantId: 1 }`" }
      - { vi: "`{ tenantId: 1, placedOn: 1 }`", en: "`{ tenantId: 1, placedOn: 1 }`" }
      - { vi: "`{ _id: 1 }`, vì nó là duy nhất", en: "`{ _id: 1 }`, as it is unique" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì ngày là thứ lọc hẹp nhất trong một tuần. Nhưng ngày đầu index thì một tuần chứa đơn của mọi người bán xen nhau. Như ở Postgres, cột so bằng (`tenantId`) đứng đầu, khoảng ngày đứng sau; khóa shard cũng nên bắt đầu bằng `tenantId` (bài `e-mg-l3-19`)."
      en: "It sounds right because the date is the narrowest filter within a week. But with the date first, one week holds every seller's orders interleaved. As in Postgres, the equality field (`tenantId`) comes first and the date range second; the shard key should start with `tenantId` too (lesson `e-mg-l3-19`)."
  - q:
      vi: "Trên DynamoDB, khóa nào giữ đơn của người bán 1 cùng nhau để đọc bằng Query, không cần Scan?"
      en: "On DynamoDB, which key keeps seller 1's orders together so they are read with a Query, not a Scan?"
    options:
      - { vi: "PK `TENANT#1`, SK `ORDER#<date>#<id>`", en: "PK `TENANT#1`, SK `ORDER#<date>#<id>`" }
      - { vi: "PK `ORDER#<id>`, rồi lọc theo người bán", en: "PK `ORDER#<id>`, then filter by seller" }
      - { vi: "PK `<date>`, SK `TENANT#1#<id>`", en: "PK `<date>`, SK `TENANT#1#<id>`" }
    answer: 0
    trap: 1
    why:
      vi: "Nhiều người nghĩ lọc theo người bán sau là đủ. Thật ra bộ lọc chạy sau khi đọc, nên Scan vẫn đọc và tính phí đơn của mọi người bán. Tiền tố người bán trong khóa phân vùng cho một Query gọn, và quyền `dynamodb:LeadingKeys` chỉ giữ được người bán trong phần của họ khi mọi khóa bắt đầu bằng người bán (bài `e-dy-l3-14`)."
      en: "Many people think filtering by seller afterwards is enough. In fact a filter runs after the read, so a Scan still reads and bills every seller's orders. A seller prefix in the partition key gives one tight Query, and the `dynamodb:LeadingKeys` permission can only keep a seller inside their own share when every key starts with the seller (lesson `e-dy-l3-14`)."
---
## Mở bài

Cổng người bán của Chợ Lồng Đèn chạy trên hai shard dùng chung, và một shard đang chậm hẳn. Lần này bạn làm cả đường: tìm shard và người bán nặng, đặt lưới chính sách cho pool, chuyển người bán đó sang shard riêng bằng danh mục, rồi làm trang của họ nhanh lại. Hai câu hỏi cuối đặt cùng thiết kế lên MongoDB và DynamoDB.

## Thực hành

Ba bảng: `shards` (`s1`, `s2` dùng chung, `s3` riêng), `directory` (50 người bán, lẻ ở `s1`, chẵn ở `s2`) và `orders` (30.000 đơn tháng 10, khóa `(tenant_id, id)`). Người bán 1 có một phần năm số đơn.

Sáu bước. Bước 1 đo tải theo shard. Bước 2 và 3 đặt bảo mật theo dòng và chính sách `seller_rows` (chấm bằng catalog); `NULLIF(…, '')` làm chính sách đóng khi chưa đặt khách: không dòng nào, không báo lỗi. Bước 4 chuyển người bán 1 sang `s3` bằng một dòng danh mục có kiểm phiên bản. Bước 5 tạo index bắt đầu bằng `tenant_id`, và bước 6 hỏi tuần cuối của người bán 1, có thanh tốc độ.

Lab chạy bằng superuser, nên chính sách không lọc câu của bạn ở bước 6; cách thử nó bằng một vai trò thường có ở `e-pg-l5-19`, cách tách người bán lớn ra partition riêng ở `e-pg-l4-20`. Cả cụm thật (nhiều shard, chép dữ liệu) không chạy trong trình duyệt: ở đây danh mục và dữ liệu là một database.

## Tóm tắt

- Đo trước khi chuyển: nối đơn với danh mục cho thấy shard nào và người bán nào nặng.
- Pool cần lưới chính sách; `NULLIF(current_setting('app.tenant_id', true), '')::int` đóng an toàn khi chưa đặt khách.
- Chuyển người bán = chép dữ liệu, rồi đổi một dòng danh mục có kiểm phiên bản; mọi khóa bắt đầu bằng `tenant_id` nên dữ liệu đi trọn.
- Cùng một ý ở mọi engine: `tenant_id` đầu index ở Postgres, `tenantId` đầu index và khóa shard ở MongoDB, `TENANT#` đầu khóa phân vùng ở DynamoDB.
- Đọc tiếp: bản đồ chủ đề `e-ds-l4-09`, `e-pg-l5-20` (khách hiện tại qua pool).

# EN

## Opening

Lantern Market's seller portal runs on two shared shards, and one of them is clearly slower. This time you do the whole path: find the heavy shard and seller, put the policy net on the pool, move that seller to a dedicated shard through the catalog, then make their page fast again. The two closing questions put the same design on MongoDB and DynamoDB.

## Practice

Three tables: `shards` (`s1`, `s2` shared, `s3` dedicated), `directory` (50 sellers, odd ones on `s1`, even ones on `s2`) and `orders` (30,000 October orders, keyed `(tenant_id, id)`). Seller 1 has a fifth of all orders.

Six steps. Step 1 measures load per shard. Steps 2 and 3 turn on row-level security and the `seller_rows` policy (graded on the catalog); `NULLIF(…, '')` makes the policy closed when no tenant is set: no rows, no error. Step 4 moves seller 1 to `s3` with one version-checked catalog row. Step 5 creates an index that starts with `tenant_id`, and step 6 asks for seller 1's last week, with a speed bar.

The lab runs as a superuser, so the policy does not filter your query in step 6; how to test it with a normal role is in `e-pg-l5-19`, and how to give a big seller its own partition is in `e-pg-l4-20`. The real cluster (several shards, data copies) does not run in the browser: here the catalog and the data are one database.

## Recap

- Measure before moving: joining orders to the catalog shows which shard and which seller are heavy.
- A pool needs the policy net; `NULLIF(current_setting('app.tenant_id', true), '')::int` closes safely when no tenant is set.
- Moving a seller = copy the data, then change one version-checked catalog row; every key starts with `tenant_id`, so the data moves whole.
- One idea on every engine: `tenant_id` first in Postgres indexes, `tenantId` first in MongoDB indexes and shard keys, `TENANT#` first in DynamoDB partition keys.
- Read next: the topic map `e-ds-l4-09`, `e-pg-l5-20` (the current tenant through a pool).
