---
id: e-pg-l5-22
engine: postgres
level: L5
module: multi-tenant
title: "Hàng xóm ồn ào: đo tải theo khách và đặt hạn mức"
title_en: "The noisy neighbour: per-tenant load and quotas"
kind: lab
runtime: browser
minutes: 20
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-25" }
objectives:
  - { vi: "Tìm khách đang chiếm tài nguyên chung từ bảng ghi mức dùng, theo việc làm thật chứ không theo số câu", en: "Find the tenant hogging the shared resources from a usage table, by the real work done, not by query count" }
  - { vi: "Đặt hạn mức số dòng theo hạng dịch vụ bằng trigger báo lỗi `P0001`", en: "Enforce a row quota per plan tier with a trigger that raises `P0001`" }
  - { vi: "Biết giới hạn nào đặt được theo vai trò (`statement_timeout`, `CONNECTION LIMIT`) và giới hạn nào phải nằm ở tầng trên database", en: "Know which limits can be set per role (`statement_timeout`, `CONNECTION LIMIT`) and which must live above the database" }
requires: [e-pg-l5-21]
sources:
  - https://www.postgresql.org/docs/18/sql-alterrole.html
  - https://www.postgresql.org/docs/18/runtime-config-client.html
  - https://www.postgresql.org/docs/18/plpgsql-trigger.html
  - https://www.postgresql.org/docs/18/errcodes-appendix.html
lab:
  setup: |
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_basic') THEN CREATE ROLE app_basic NOLOGIN; END IF;
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_pro') THEN CREATE ROLE app_pro NOLOGIN; END IF;
    END $$;
    -- Lantern Market: four sellers on shared tables; plans = the tier and its row quota
    CREATE TABLE plans (tenant_id int PRIMARY KEY, tier text NOT NULL CHECK (tier IN ('basic', 'pro')), row_quota int NOT NULL);
    INSERT INTO plans VALUES (1, 'basic', 30), (2, 'basic', 30), (3, 'pro', 500), (4, 'basic', 30);
    CREATE TABLE products (tenant_id int NOT NULL REFERENCES plans, id int NOT NULL, name text NOT NULL, PRIMARY KEY (tenant_id, id));
    INSERT INTO products SELECT g % 4 + 1, g, 'product ' || g FROM generate_series(1, 100) g;
    INSERT INTO products SELECT 2, g, 'product ' || g FROM generate_series(101, 105) g;
    -- one row per seller and day in October: queries sent, rows read
    CREATE TABLE usage_log (tenant_id int NOT NULL, day date NOT NULL, queries int NOT NULL, rows_read bigint NOT NULL, PRIMARY KEY (tenant_id, day));
    INSERT INTO usage_log SELECT t, date '2026-10-01' + d, 200 + t * 10 + d, CASE WHEN t = 2 THEN 900000 + d * 1000 ELSE 20000 + t * 1000 + d * 100 END
      FROM generate_series(1, 4) t, generate_series(0, 30) d;
  steps:
    - task: { vi: "Ai đang chiếm việc đọc của cả hệ thống? Mỗi người bán một dòng: tenant_id, rows_read (tổng tháng 10), pct (phần trăm trên tổng của mọi người bán, làm tròn 1 chữ số). Sắp theo tenant_id.", en: "Who is taking the system's reads? One row per seller: tenant_id, rows_read (October total), pct (percent of all sellers' total, rounded to 1 decimal). Order by tenant_id." }
      solution: "SELECT tenant_id, sum(rows_read) AS rows_read, round(100.0 * sum(rows_read) / sum(sum(rows_read)) OVER (), 1) AS pct FROM usage_log GROUP BY tenant_id ORDER BY tenant_id"
      check: rows
      ordered: true
      hint: { vi: "Tổng của mọi nhóm: `sum(sum(rows_read)) OVER ()`.", en: "The total over all groups: `sum(sum(rows_read)) OVER ()`." }
      fact:
        vi: "Người bán 2, gói basic, chiếm khoảng 92,7 % số dòng đọc, dù số câu gửi đi không nhiều hơn ai."
        en: "Seller 2, on the basic tier, accounts for about 92.7% of the rows read, though it sends no more queries than anyone."
        probe: SELECT round(100.0 * sum(rows_read) FILTER (WHERE tenant_id = 2) / sum(rows_read), 1) FROM usage_log
        expect: [[92.7]]
    - task: { vi: "Viết hàm trigger `check_row_quota()` (PL/pgSQL, trả `trigger`): nếu số sản phẩm hiện có của `NEW.tenant_id` đã bằng hoặc vượt `row_quota` trong `plans` thì `RAISE EXCEPTION` với `ERRCODE = 'P0001'`, ngược lại `RETURN NEW`. Chấm bằng catalog.", en: "Write trigger function `check_row_quota()` (PL/pgSQL, returns `trigger`): if `NEW.tenant_id` already has as many products as its `row_quota` in `plans`, or more, `RAISE EXCEPTION` with `ERRCODE = 'P0001'`, else `RETURN NEW`. Graded on the catalog." }
      solution: |
        CREATE FUNCTION check_row_quota() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
          IF (SELECT count(*) FROM products WHERE tenant_id = NEW.tenant_id)
             >= (SELECT row_quota FROM plans WHERE tenant_id = NEW.tenant_id) THEN
            RAISE EXCEPTION 'tenant % is over its row quota', NEW.tenant_id USING ERRCODE = 'P0001';
          END IF;
          RETURN NEW;
        END $$
      check: catalog
      hint: { vi: "`CREATE FUNCTION … RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF … THEN RAISE EXCEPTION … USING ERRCODE = 'P0001'; END IF; RETURN NEW; END $$`.", en: "`CREATE FUNCTION … RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF … THEN RAISE EXCEPTION … USING ERRCODE = 'P0001'; END IF; RETURN NEW; END $$`." }
    - task: { vi: "Gắn hàm vào bảng: trigger `products_quota`, `BEFORE INSERT`, cho từng dòng của `products`. Chấm bằng catalog.", en: "Attach the function to the table: trigger `products_quota`, `BEFORE INSERT`, for each row of `products`. Graded on the catalog." }
      solution: "CREATE TRIGGER products_quota BEFORE INSERT ON products FOR EACH ROW EXECUTE FUNCTION check_row_quota()"
      check: catalog
      hint: { vi: "`CREATE TRIGGER … BEFORE INSERT ON products FOR EACH ROW EXECUTE FUNCTION check_row_quota()`.", en: "`CREATE TRIGGER … BEFORE INSERT ON products FOR EACH ROW EXECUTE FUNCTION check_row_quota()`." }
    - task: { vi: "Cho mọi phiên mới của vai trò `app_basic` (gói basic) giới hạn 2 giây mỗi câu. Chấm bằng catalog (thiết lập theo vai trò).", en: "Give every new session of role `app_basic` (the basic tier) a 2-second limit per statement. Graded on the catalog (per-role settings)." }
      solution: "ALTER ROLE app_basic SET statement_timeout = '2s'"
      check: catalog
      hint: { vi: "`ALTER ROLE … SET statement_timeout = '2s'`.", en: "`ALTER ROLE … SET statement_timeout = '2s'`." }
quiz:
  - q: { vi: "Bạn chạy `ALTER ROLE app_basic SET statement_timeout = '2s'` lúc ứng dụng đang có 20 kết nối mở bằng vai trò đó. Kết nối nào nhận giới hạn?", en: "You run `ALTER ROLE app_basic SET statement_timeout = '2s'` while the application holds 20 open connections as that role. Which connections get the limit?" }
    options:
      - { vi: "Cả 20 kết nối đang mở, ngay lập tức", en: "All 20 open connections, at once" }
      - { vi: "Chỉ các phiên mới đăng nhập bằng vai trò đó từ giờ", en: "Only sessions that log in as that role from now on" }
      - { vi: "Không phiên nào cho tới khi khởi động lại server", en: "None until the server restarts" }
    answer: 1
    trap: 0
    why: { vi: "Nghe hợp lý vì lệnh đổi ngay trong catalog, nhưng thiết lập theo vai trò chỉ được nạp khi một phiên bắt đầu. Kết nối cũ trong pool giữ giá trị cũ cho tới khi bị thay. Vì thế pool cần làm mới kết nối sau khi đổi.", en: "It sounds right because the command changes the catalog at once, but per-role settings are only loaded when a session starts. Old pooled connections keep the old value until they are replaced. That is why the pool must recycle connections after the change." }
  - q: { vi: "Người bán 2 (gói basic) đọc 92 % số dòng của cả hệ thống và làm chậm mọi người bán khác. Hướng nào đúng?", en: "Seller 2 (basic tier) reads 92% of the whole system's rows and slows every other seller down. Which way is right?" }
    options:
      - { vi: "Đổi `tenant_id` của họ để dữ liệu nằm chỗ khác", en: "Change their `tenant_id` so their data lives elsewhere" }
      - { vi: "Index dẫn đầu bằng `tenant_id`, hạn mức theo hạng, rồi hạng riêng", en: "Indexes led by `tenant_id`, per-tier quotas, then a dedicated tier" }
      - { vi: "Giảm `work_mem` của cả server cho mọi người bán", en: "Lower the whole server's `work_mem` for every seller" }
    answer: 1
    trap: 0
    why: { vi: "Nghe hợp lý vì tách dữ liệu ra là hết ồn, nhưng đổi định danh của khách làm vỡ mọi tham chiếu và nhật ký. Trước hết sửa nguyên nhân (thường là index không dẫn đầu bằng `tenant_id`, xem `e-pg-l2-26`), rồi hạn mức; khách vẫn quá lớn thì đổi hạng: cùng định danh, chỗ đặt khác.", en: "It sounds right because moving the data away ends the noise, but changing a tenant's identity breaks every reference and log. Fix the cause first (often an index that does not lead with `tenant_id`, see `e-pg-l2-26`), then quotas; a tenant still too big changes tier: same identity, another placement." }
---
## Mở bài

Cả Chợ Lồng Đèn chậm mỗi chiều, và chỉ một người bán gói basic gây ra. Họ không gửi nhiều câu hơn ai, nhưng mỗi câu đọc gần triệu dòng. Bài này tìm họ bằng số liệu, rồi đặt rào trong database và nói rõ rào nào phải đặt ở tầng khác.

## Ý chính

Khi nhiều khách dùng chung bảng và server, một khách nặng làm chậm mọi người: đó là hàng xóm ồn ào (noisy neighbour). Đo tải theo khách từ bảng ghi mức dùng, và đo bằng việc làm thật (số dòng đọc, thời gian) chứ không bằng số câu.

Trong Postgres có ba loại rào. Hạn mức dữ liệu kiểm lúc ghi: một trigger đếm dòng của khách và báo lỗi `P0001` khi vượt hạn mức của hạng. Giới hạn theo vai trò: `ALTER ROLE … SET statement_timeout` và `CONNECTION LIMIT`, với một vai trò cho mỗi hạng. Index dẫn đầu bằng `tenant_id` để câu của một khách không quét dòng của mọi khách.

Nhiều người nghĩ database tự chia đều tài nguyên giữa các khách. Thật ra nó không biết "khách" là gì: giới hạn tần suất theo khách, hàng đợi công bằng và việc chuyển khách lớn sang hạng riêng nằm ở tầng trên (ứng dụng, cổng API). PGlite cũng không hủy câu khi quá `statement_timeout`, nên lab chỉ lưu và đọc lại thiết lập; tác dụng của nó chỉ thấy trên server thật.

## Cú pháp

```sql
ALTER ROLE app_basic
  SET statement_timeout = '2s';
ALTER ROLE app_basic CONNECTION LIMIT 5;
RAISE EXCEPTION 'over quota'
  USING ERRCODE = 'P0001';
CREATE TRIGGER name BEFORE INSERT ON t
  FOR EACH ROW EXECUTE FUNCTION f();
```

- `ALTER ROLE … SET`: nạp khi một phiên của vai trò bắt đầu.
- `CONNECTION LIMIT`: số kết nối đồng thời tối đa của vai trò.
- `P0001`: mã của `RAISE EXCEPTION` mặc định, ứng dụng bắt được.

## Ví dụ

Hai người bán đọc nhiều nhất:

```sql
SELECT tenant_id,
  sum(rows_read) AS rows_read
FROM usage_log
GROUP BY tenant_id
ORDER BY rows_read DESC
LIMIT 2;
```

Hạn mức số sản phẩm theo gói, kiểm lúc ghi:

```sql
CREATE FUNCTION check_row_quota()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT count(*) FROM products
      WHERE tenant_id = NEW.tenant_id)
   >= (SELECT row_quota FROM plans
       WHERE tenant_id = NEW.tenant_id)
  THEN
    RAISE EXCEPTION 'over quota: %',
      NEW.tenant_id
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER products_quota
  BEFORE INSERT ON products FOR EACH ROW
  EXECUTE FUNCTION check_row_quota();
INSERT INTO products
  VALUES (3, 200, 'lamp')
RETURNING tenant_id, id;
```

Người bán 3 gói pro còn xa hạn mức nên ghi được. Giới hạn theo vai trò được lưu trong catalog:

```sql
ALTER ROLE app_basic
  SET statement_timeout = '2s';
ALTER ROLE app_basic CONNECTION LIMIT 5;
SELECT r.rolname::text, r.rolconnlimit,
  s.setconfig::text AS settings
FROM pg_roles r
LEFT JOIN pg_db_role_setting s
  ON s.setrole = r.oid
WHERE r.rolname IN
  ('app_basic', 'app_pro')
ORDER BY 1;
```

Trên server thật, một câu chạy quá 2 giây của `app_basic` bị hủy. PGlite không làm điều này, nên đây chỉ là chữ:

```text
-- real server, as app_basic:
SELECT pg_sleep(5);
ERROR:  canceling statement due to
        statement timeout
```

## Lỗi hay gặp

Người bán 2 gói basic đã có đủ 30 sản phẩm:

```sql
-- ERROR P0001
INSERT INTO products
  VALUES (2, 201, 'one too many');
```

Đây là điều bạn muốn: ứng dụng bắt `P0001` và mời họ nâng gói. Đo tải bằng số câu:

```sql
-- WRONG: busiest by query count
SELECT tenant_id, sum(queries) AS load
FROM usage_log GROUP BY tenant_id
ORDER BY load DESC LIMIT 1;
```

```sql
-- FIX: by the work done (rows read)
SELECT tenant_id, sum(rows_read) AS load
FROM usage_log GROUP BY tenant_id
ORDER BY load DESC LIMIT 1;
```

Câu sai chỉ người bán 4, gửi nhiều câu nhẹ; câu đúng chỉ người bán 2, mỗi câu đọc gần triệu dòng.

## Thực hành

Bốn bước: phần trăm dòng đọc của từng người bán, hàm hạn mức, trigger, rồi giới hạn 2 giây cho vai trò gói basic. Ba bước sau chấm bằng catalog: hàm, trigger và thiết lập theo vai trò đều được đọc.

## Tóm tắt

- Đo tải theo khách bằng việc làm thật (dòng đọc, thời gian), không bằng số câu.
- Hạn mức dữ liệu kiểm lúc ghi: trigger báo `P0001` khi vượt hạn mức của hạng.
- `ALTER ROLE … SET statement_timeout` và `CONNECTION LIMIT` theo vai trò, nạp ở phiên mới; PGlite không hủy câu.
- Giới hạn tần suất, hàng đợi công bằng và đổi hạng nằm trên database. Đọc tiếp: `e-pg-l2-26`, `e-ds-l4-09`.

# EN

## Opening

All of Lantern Market slows down every afternoon, and one basic-tier seller causes it. They send no more queries than anyone, but each one reads close to a million rows. This lesson finds them with numbers, then puts fences in the database and says plainly which fences belong in another layer.

## Key idea

When many tenants share tables and a server, one heavy tenant slows everyone down: the noisy neighbour. Measure load per tenant from a usage table, and measure the real work (rows read, time), not the number of queries.

Postgres offers three kinds of fence. A data quota checked at write time: a trigger counts the tenant's rows and raises `P0001` past its tier's quota. Per-role limits: `ALTER ROLE … SET statement_timeout` and `CONNECTION LIMIT`, with one role per tier. Indexes that lead with `tenant_id`, so one tenant's query does not scan every tenant's rows.

Many people think the database shares its resources fairly between tenants. In fact it has no idea what a "tenant" is: per-tenant rate limits, fair queues and moving a big tenant to its own tier live in a layer above (the application, the API gateway). PGlite also never cancels a query past `statement_timeout`, so the lab only stores the setting and reads it back; its effect shows only on a real server.

## Syntax

```sql
ALTER ROLE app_basic
  SET statement_timeout = '2s';
ALTER ROLE app_basic CONNECTION LIMIT 5;
RAISE EXCEPTION 'over quota'
  USING ERRCODE = 'P0001';
CREATE TRIGGER name BEFORE INSERT ON t
  FOR EACH ROW EXECUTE FUNCTION f();
```

- `ALTER ROLE … SET`: loaded when a session of the role starts.
- `CONNECTION LIMIT`: the role's maximum number of concurrent connections.
- `P0001`: the default code of `RAISE EXCEPTION`, which the application can catch.

## Example

The two sellers that read the most:

```sql
SELECT tenant_id,
  sum(rows_read) AS rows_read
FROM usage_log
GROUP BY tenant_id
ORDER BY rows_read DESC
LIMIT 2;
```

A product quota per tier, checked at write time:

```sql
CREATE FUNCTION check_row_quota()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT count(*) FROM products
      WHERE tenant_id = NEW.tenant_id)
   >= (SELECT row_quota FROM plans
       WHERE tenant_id = NEW.tenant_id)
  THEN
    RAISE EXCEPTION 'over quota: %',
      NEW.tenant_id
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER products_quota
  BEFORE INSERT ON products FOR EACH ROW
  EXECUTE FUNCTION check_row_quota();
INSERT INTO products
  VALUES (3, 200, 'lamp')
RETURNING tenant_id, id;
```

Seller 3 on the pro tier is far below its quota, so the write passes. Per-role limits are stored in the catalog:

```sql
ALTER ROLE app_basic
  SET statement_timeout = '2s';
ALTER ROLE app_basic CONNECTION LIMIT 5;
SELECT r.rolname::text, r.rolconnlimit,
  s.setconfig::text AS settings
FROM pg_roles r
LEFT JOIN pg_db_role_setting s
  ON s.setrole = r.oid
WHERE r.rolname IN
  ('app_basic', 'app_pro')
ORDER BY 1;
```

On a real server, a statement of `app_basic` running past 2 seconds is cancelled. PGlite does not do this, so this is text only:

```text
-- real server, as app_basic:
SELECT pg_sleep(5);
ERROR:  canceling statement due to
        statement timeout
```

## Common mistakes

Seller 2 on the basic tier already has its 30 products:

```sql
-- ERROR P0001
INSERT INTO products
  VALUES (2, 201, 'one too many');
```

That is what you want: the application catches `P0001` and offers an upgrade. Measuring load by query count:

```sql
-- WRONG: busiest by query count
SELECT tenant_id, sum(queries) AS load
FROM usage_log GROUP BY tenant_id
ORDER BY load DESC LIMIT 1;
```

```sql
-- FIX: by the work done (rows read)
SELECT tenant_id, sum(rows_read) AS load
FROM usage_log GROUP BY tenant_id
ORDER BY load DESC LIMIT 1;
```

The wrong one points at seller 4, who sends many light queries; the right one at seller 2, whose every query reads close to a million rows.

## Practice

Four steps: each seller's share of rows read, the quota function, the trigger, then a 2-second limit for the basic tier's role. The last three are graded on the catalog: functions, triggers and per-role settings are all read.

## Recap

- Measure load per tenant by real work (rows read, time), not by query count.
- A data quota is checked at write time: a trigger raises `P0001` past the tier's quota.
- `ALTER ROLE … SET statement_timeout` and `CONNECTION LIMIT` work per role, loaded in new sessions; PGlite never cancels.
- Rate limits, fair queues and tier changes live above the database. Read next: `e-pg-l2-26`, `e-ds-l4-09`.
