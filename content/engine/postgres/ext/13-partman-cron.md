---
id: e-pg-ext-13
engine: postgres
level: EXT
module: ext-server
title: "pg_partman và pg_cron: tự bảo trì phân vùng và lịch chạy"
title_en: "pg_partman and pg_cron: partition upkeep and schedules"
kind: concept
runtime: docs
docs_why: ext
minutes: 14
verified: { version: "PostgreSQL 18.x (PGlite 0.5.16)", date: "2026-11-26" }
figures:
  - { name: pg-ext-partition-calendar, at: idea }
objectives:
  - vi: Nói được pg_partman làm gì cho bảng phân vùng theo thời gian - tạo trước, giữ dữ liệu - và pg_cron chạy nó ra sao.
    en: Say what pg_partman does for a time-partitioned table - make ahead, retention - and how pg_cron runs it.
  - vi: Tự làm phần đó bằng Postgres lõi - `PARTITION OF`, `DETACH PARTITION`, một hàm tạo tháng.
    en: Do the same in core Postgres - `PARTITION OF`, `DETACH PARTITION`, a month-making function.
  - vi: Tránh hai lỗi khi thêm phân vùng - khoảng chồng nhau và dòng đã nằm trong phân vùng `DEFAULT`.
    en: Avoid two errors when adding a partition - overlapping ranges and rows already in the `DEFAULT` partition.
demo_setup: |
  CREATE TABLE container_events (
    container_id int NOT NULL,
    event_time timestamp NOT NULL,
    port text NOT NULL
  ) PARTITION BY RANGE (event_time);
  CREATE TABLE container_events_2026_08 PARTITION OF container_events
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
  CREATE TABLE container_events_2026_09 PARTITION OF container_events
    FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
  CREATE TABLE container_events_2026_10 PARTITION OF container_events
    FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
  INSERT INTO container_events
  SELECT g % 40 + 1, timestamp '2026-08-01' + g * interval '13 minutes',
         (ARRAY['VNDAD', 'VNSGN', 'VNHPH'])[g % 3 + 1]
  FROM generate_series(0, 10150) AS g;
sources:
  - https://github.com/pgpartman/pg_partman
  - https://github.com/pgpartman/pg_partman/blob/master/doc/pg_partman_howto.md
  - https://github.com/citusdata/pg_cron
  - https://www.postgresql.org/docs/18/ddl-partitioning.html
  - https://www.postgresql.org/docs/18/sql-altertable.html
quiz:
  - q:
      vi: "Bảng có phân vùng `DEFAULT`. Đêm qua job tạo tháng không chạy, nên vài dòng tháng 11 đã vào `DEFAULT`. Sáng nay bạn tạo phân vùng tháng 11. Kết quả?"
      en: "The table has a `DEFAULT` partition. Last night the month job did not run, so some November rows went into `DEFAULT`. This morning you create November's partition. The result?"
    options:
      - { vi: "Lỗi 23514: phân vùng `DEFAULT` đang giữ dòng thuộc tháng 11", en: "Error 23514: the `DEFAULT` partition holds rows that belong to November" }
      - { vi: "Thành công, Postgres tự chuyển các dòng đó sang tháng 11", en: "Success, and Postgres moves those rows into November by itself" }
      - { vi: "Thành công, các dòng đó ở lại `DEFAULT` và vẫn đọc được", en: "Success, and those rows stay in `DEFAULT`, still readable" }
    answer: 0
    trap: 1
    why:
      vi: "Nghe hợp lý vì Postgres định tuyến dòng mới vào đúng phân vùng, nhưng nó không dời dòng cũ: nó từ chối tạo phân vùng có khoảng mà `DEFAULT` đang chứa dòng. Phải chuyển các dòng đó ra trước. Vì vậy pg_partman tạo trước vài tháng (premake): `DEFAULT` gần như không bao giờ nhận dòng."
      en: "It sounds right because Postgres routes new rows to the right partition, but it does not move existing ones: it refuses to create a partition whose range `DEFAULT` already holds rows for. Move those rows out first. That is why pg_partman makes a few months ahead (premake): `DEFAULT` almost never gets a row."
  - q:
      vi: "pg_cron đã được `CREATE EXTENSION` trên server, nhưng job `0 3 * * *` không bao giờ chạy. Thiếu gì nhiều khả năng nhất?"
      en: "pg_cron was created with `CREATE EXTENSION` on the server, but the `0 3 * * *` job never runs. What is most likely missing?"
    options:
      - { vi: "Một trigger trên bảng `cron.job` để đánh thức job đúng giờ", en: "A trigger on the `cron.job` table to wake the job on time" }
      - { vi: "`shared_preload_libraries = 'pg_cron'` và khởi động lại server", en: "`shared_preload_libraries = 'pg_cron'` and a server restart" }
      - { vi: "Quyền `SELECT` trên `cron.job_run_details` cho tài khoản chạy job", en: "`SELECT` on `cron.job_run_details` for the job's account" }
    answer: 1
    trap: 0
    why:
      vi: "Trigger nghe hợp lý vì job nằm trong một bảng, nhưng trigger chỉ chạy khi có câu ghi, không theo giờ. pg_cron chạy job bằng một tiến trình nền, mà tiến trình nền chỉ khởi động khi thư viện có trong `shared_preload_libraries` lúc server bật. `cron.database_name` cũng phải trỏ đúng database giữ job."
      en: "A trigger sounds right because jobs live in a table, but a trigger fires on writes, not on a clock. pg_cron runs jobs from a background worker, and a background worker starts only when the library is in `shared_preload_libraries` at server start. `cron.database_name` must also point at the database that holds the jobs."
---
## Mở bài

Bảng sự kiện container của Cargo Query chia theo tháng. Ai đó phải nhớ tạo tháng mới trước nửa đêm cuối tháng và tách tháng quá hạn, mỗi tháng, không quên lần nào. Hai extension nhận việc đó: pg_partman lo phân vùng, pg_cron lo giờ chạy.

## Ý chính

pg_partman quản lý bảng phân vùng theo thời gian hoặc theo số. Từ bản 5 nó chỉ dùng phân vùng khai báo của Postgres lõi (`PARTITION BY RANGE`), không còn trigger. Bạn đăng ký bảng một lần bằng `partman.create_parent`; từ đó `run_maintenance` tạo trước một số phân vùng tương lai (`premake`, mặc định 4) và, nếu đặt `retention`, tách hoặc xóa phân vùng quá hạn. `retention_keep_table = true` chỉ tách bảng ra, còn dữ liệu.

pg_cron chạy câu SQL theo lịch kiểu cron ngay trong Postgres: `cron.schedule('name', '0 3 * * *', 'command')`. Job nằm trong bảng `cron.job`, lịch sử ở `cron.job_run_details`. Nó cần `shared_preload_libraries = 'pg_cron'` và khởi động lại, vì job chạy trong một tiến trình nền. pg_partman cũng có tiến trình nền riêng, nhưng nhiều đội gọi `run_maintenance_proc` bằng pg_cron để mọi lịch nằm một chỗ.

Cả hai cần server, không chạy trong trình duyệt. Phần chạy được ở bài này là việc chúng tự động hóa, viết bằng Postgres lõi. Nhiều người nghĩ phân vùng `DEFAULT` là lưới an toàn thay cho việc tạo trước. Thật ra `DEFAULT` nhận dòng của tháng chưa có, rồi chính những dòng đó chặn việc tạo tháng ấy sau này.

## Cú pháp

```text
SELECT partman.create_parent(
  p_parent_table :=
    'public.container_events',
  p_control := 'event_time',
  p_interval := '1 month',
  p_premake := 4);
UPDATE partman.part_config
SET retention = '3 months',
    retention_keep_table = true
WHERE parent_table =
  'public.container_events';
SELECT cron.schedule(
  'partman-nightly', '0 3 * * *',
  $$CALL partman
    .run_maintenance_proc()$$);
```

- `p_premake`: số phân vùng tương lai giữ sẵn.
- `retention`: tuổi dữ liệu tối đa; quá hạn thì tách hoặc xóa.
- `cron.schedule(name, schedule, command)`: năm trường phút, giờ, ngày, tháng, thứ.

## Ví dụ

Tạo trước tháng 11, việc `premake` làm:

```sql
CREATE TABLE container_events_2026_11
  PARTITION OF container_events
  FOR VALUES FROM ('2026-11-01')
  TO ('2026-12-01');
SELECT c.relname AS part,
  pg_get_expr(c.relpartbound, c.oid)
    AS bounds
FROM pg_inherits i
JOIN pg_class c ON c.oid = i.inhrelid
WHERE i.inhparent =
  'container_events'::regclass
ORDER BY 1;
```

Bốn phân vùng, từ tháng 8 đến tháng 11, mỗi dòng có khoảng của nó.

Một hàm tạo tháng bất kỳ, thứ một job đêm sẽ gọi:

```sql
CREATE FUNCTION add_month(m date)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  t text := 'container_events_'
    || to_char(m, 'YYYY_MM');
BEGIN
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I
     PARTITION OF container_events
     FOR VALUES FROM (%L) TO (%L)',
    t, m, m + interval '1 month');
  RETURN t;
END $$;
SELECT add_month(date '2026-12-01')
  AS made;
```

Hàm trả `container_events_2026_12`; gọi lại lần nữa thì `IF NOT EXISTS` bỏ qua, nên chạy mỗi đêm vẫn an toàn.

Giữ dữ liệu: tách tháng cũ nhất ra khỏi bảng:

```sql
ALTER TABLE container_events
  DETACH PARTITION
  container_events_2026_08;
SELECT min(event_time)::date
  AS first_day
FROM container_events;
```

Ngày đầu tiên còn đọc được là 01/09; bảng tháng 8 vẫn còn, riêng ra, như `retention_keep_table = true`.

## Lỗi hay gặp

Thêm phân vùng có khoảng chồng tháng đã có:

```sql
-- ERROR 42P17:
CREATE TABLE container_events_x
  PARTITION OF container_events
  FOR VALUES FROM ('2026-10-15')
  TO ('2026-11-15');
```

Mỗi khoảng phải rời nhau; hàm tạo tháng nên tính biên từ ngày đầu tháng, không từ hôm nay.

Để dòng rơi vào `DEFAULT` rồi mới tạo tháng:

```sql
-- ERROR 23514:
CREATE TABLE container_events_def
  PARTITION OF container_events
  DEFAULT;
INSERT INTO container_events
VALUES (7, '2027-01-02 08:00',
        'VNDAD');
SELECT add_month(date '2027-01-01');
```

`DEFAULT` đang giữ một dòng tháng 1/2027, nên Postgres từ chối tạo tháng đó. Tạo trước đủ xa để `DEFAULT` gần như luôn trống.

## Tóm tắt

- pg_partman tạo trước phân vùng tương lai (`premake`) và tách phân vùng quá hạn (`retention`).
- pg_cron chạy SQL theo lịch trong Postgres; cần `shared_preload_libraries` và khởi động lại.
- Bản lõi: `PARTITION OF` để thêm tháng, `DETACH PARTITION` để giữ dữ liệu, một hàm cho job đêm gọi.
- Khoảng không được chồng nhau; dòng trong `DEFAULT` chặn việc tạo tháng của chúng.

# EN

## Opening

Cargo Query's container event table is split by month. Someone must remember to create the new month before the last midnight of the month and detach the expired one, every month, never once forgetting. Two extensions take that job: pg_partman for the partitions, pg_cron for the clock.

## Key idea

pg_partman manages tables partitioned by time or by number. Since version 5 it uses only core Postgres declarative partitioning (`PARTITION BY RANGE`), no triggers. You register the table once with `partman.create_parent`; from then on `run_maintenance` makes a number of future partitions ahead (`premake`, 4 by default) and, if `retention` is set, detaches or drops expired ones. `retention_keep_table = true` only detaches the table and keeps the data.

pg_cron runs SQL on a cron-style schedule inside Postgres: `cron.schedule('name', '0 3 * * *', 'command')`. Jobs live in table `cron.job`, their history in `cron.job_run_details`. It needs `shared_preload_libraries = 'pg_cron'` and a restart, because jobs run in a background worker. pg_partman has its own background worker too, but many teams call `run_maintenance_proc` from pg_cron to keep every schedule in one place.

Both need a server and do not run in the browser. What runs in this lesson is the work they automate, written in core Postgres. Many people think a `DEFAULT` partition is a safety net that replaces making months ahead. In fact `DEFAULT` takes the rows of a month that does not exist yet, and those very rows then block creating that month later.

## Syntax

```text
SELECT partman.create_parent(
  p_parent_table :=
    'public.container_events',
  p_control := 'event_time',
  p_interval := '1 month',
  p_premake := 4);
UPDATE partman.part_config
SET retention = '3 months',
    retention_keep_table = true
WHERE parent_table =
  'public.container_events';
SELECT cron.schedule(
  'partman-nightly', '0 3 * * *',
  $$CALL partman
    .run_maintenance_proc()$$);
```

- `p_premake`: how many future partitions to keep ready.
- `retention`: the maximum age of data; older partitions are detached or dropped.
- `cron.schedule(name, schedule, command)`: five fields, minute, hour, day, month, weekday.

## Example

Make November ahead, which is what `premake` does:

```sql
CREATE TABLE container_events_2026_11
  PARTITION OF container_events
  FOR VALUES FROM ('2026-11-01')
  TO ('2026-12-01');
SELECT c.relname AS part,
  pg_get_expr(c.relpartbound, c.oid)
    AS bounds
FROM pg_inherits i
JOIN pg_class c ON c.oid = i.inhrelid
WHERE i.inhparent =
  'container_events'::regclass
ORDER BY 1;
```

Four partitions, August to November, each row with its range.

A function that makes any month, which a nightly job would call:

```sql
CREATE FUNCTION add_month(m date)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  t text := 'container_events_'
    || to_char(m, 'YYYY_MM');
BEGIN
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I
     PARTITION OF container_events
     FOR VALUES FROM (%L) TO (%L)',
    t, m, m + interval '1 month');
  RETURN t;
END $$;
SELECT add_month(date '2026-12-01')
  AS made;
```

The function returns `container_events_2026_12`; call it again and `IF NOT EXISTS` skips, so running it every night is safe.

Retention: detach the oldest month from the table:

```sql
ALTER TABLE container_events
  DETACH PARTITION
  container_events_2026_08;
SELECT min(event_time)::date
  AS first_day
FROM container_events;
```

The first day still readable is 1 Sep; the August table still exists on its own, as with `retention_keep_table = true`.

## Common mistakes

Adding a partition whose range overlaps an existing month:

```sql
-- ERROR 42P17:
CREATE TABLE container_events_x
  PARTITION OF container_events
  FOR VALUES FROM ('2026-10-15')
  TO ('2026-11-15');
```

Ranges must not overlap; a month-making function should compute its bounds from the first day of the month, not from today.

Letting rows fall into `DEFAULT` before making the month:

```sql
-- ERROR 23514:
CREATE TABLE container_events_def
  PARTITION OF container_events
  DEFAULT;
INSERT INTO container_events
VALUES (7, '2027-01-02 08:00',
        'VNDAD');
SELECT add_month(date '2027-01-01');
```

`DEFAULT` holds a January 2027 row, so Postgres refuses to create that month. Make months far enough ahead that `DEFAULT` almost always stays empty.

## Recap

- pg_partman makes future partitions ahead (`premake`) and detaches expired ones (`retention`).
- pg_cron runs SQL on a schedule inside Postgres; it needs `shared_preload_libraries` and a restart.
- Core version: `PARTITION OF` to add a month, `DETACH PARTITION` for retention, a function for the nightly job to call.
- Ranges must not overlap; rows in `DEFAULT` block creating their month.
