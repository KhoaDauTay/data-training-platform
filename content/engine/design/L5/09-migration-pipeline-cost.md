---
id: e-ds-l5-09
engine: design
level: L5
module: tenant-platform
title: Đổi cấu trúc từng shard và thẻ chi phí
title_en: Per-shard migrations and cost tags
kind: lab
runtime: browser
minutes: 20
objectives:
  - vi: Tìm shard chậm phiên bản và đưa chúng lên, từng shard một, ghi phiên bản chỉ khi thay đổi đã thật sự có.
    en: Find shards behind on version and bring them up one at a time, recording the version only once the change really exists.
  - vi: Giải thích vì sao một lần chạy hỏng phải dừng và báo lỗi, không bao giờ báo "xong".
    en: Explain why a failed run must stop and report an error, never "done".
  - vi: Chỉ bật một shard khi schema của nó đã có, và chia chi phí theo thẻ shard và gói.
    en: Switch a shard on only once its schema exists, and split cost by shard and tier tags.
requires: [e-ds-l5-08]
sources:
  - url: https://www.postgresql.org/docs/18/plpgsql-transactions.html
    title: "PL/pgSQL › Transaction Management"
  - url: https://www.postgresql.org/docs/18/plpgsql-statements.html#PLPGSQL-STATEMENTS-EXECUTING-DYN
    title: "PL/pgSQL › Executing Dynamic Commands"
  - url: https://www.postgresql.org/docs/18/infoschema-columns.html
    title: "information_schema.columns"
lab:
  setup: |
    CREATE TABLE shards (
      shard_id text PRIMARY KEY,
      schema_name text NOT NULL UNIQUE,
      tier text NOT NULL,
      state text NOT NULL CHECK (state IN ('creating', 'serving', 'draining')),
      version int NOT NULL
    );
    INSERT INTO shards VALUES
      ('s1', 'shard_1', 'pool', 'serving', 3), ('s2', 'shard_2', 'pool', 'serving', 3),
      ('s3', 'shard_3', 'dedicated', 'serving', 2), ('s4', 'shard_4', 'pool', 'creating', 3),
      ('s5', 'shard_5', 'pool', 'creating', 0);
    CREATE SCHEMA shard_1;
    CREATE SCHEMA shard_2;
    CREATE SCHEMA shard_3;
    CREATE SCHEMA shard_4;
    CREATE TABLE shard_1.orders (tenant_id text NOT NULL, id int NOT NULL, amount int NOT NULL, note text, PRIMARY KEY (tenant_id, id));
    CREATE TABLE shard_2.orders (tenant_id text NOT NULL, id int NOT NULL, amount int NOT NULL, note text, PRIMARY KEY (tenant_id, id));
    CREATE TABLE shard_3.orders (tenant_id text NOT NULL, id int NOT NULL, amount int NOT NULL, PRIMARY KEY (tenant_id, id));
    CREATE TABLE shard_4.orders (tenant_id text NOT NULL, id int NOT NULL, amount int NOT NULL, note text, PRIMARY KEY (tenant_id, id));
    CREATE TABLE job_runs (
      run_id int PRIMARY KEY,
      exit_code int NOT NULL,
      applied int NOT NULL,
      expected int NOT NULL
    );
    INSERT INTO job_runs VALUES (11, 0, 3, 3), (12, 0, 1, 3), (13, 1, 0, 3), (14, 0, 0, 0);
    CREATE TABLE costs (
      resource text PRIMARY KEY,
      shard_id text,
      tier text,
      usd numeric NOT NULL
    );
    INSERT INTO costs VALUES
      ('db-s1', 's1', 'pool', 300), ('proxy-s1', 's1', 'pool', 40),
      ('db-s2', 's2', 'pool', 300), ('proxy-s2', 's2', 'pool', 40),
      ('db-s3', 's3', 'dedicated', 520), ('proxy-s3', 's3', 'dedicated', 40),
      ('bucket-exports', NULL, NULL, 25);
    CREATE TABLE usage (
      tenant_id text NOT NULL,
      shard_id text NOT NULL,
      requests int NOT NULL,
      PRIMARY KEY (tenant_id, shard_id)
    );
    INSERT INTO usage VALUES
      ('t-01', 's1', 500), ('t-02', 's1', 300), ('t-03', 's1', 200),
      ('t-05', 's2', 900), ('t-07', 's2', 100), ('t-04', 's3', 1000);
  steps:
    - task:
        vi: "Phiên bản đích là 3. Shard nào đang phục vụ (`serving`) mà còn chậm phiên bản? Lấy `shard_id`, `schema_name`, `version`, xếp theo `shard_id`."
        en: "The target version is 3. Which serving shards (`serving`) are still behind? Get `shard_id`, `schema_name`, `version`, ordered by `shard_id`."
      solution: SELECT shard_id, schema_name, version FROM shards WHERE state = 'serving' AND version < 3 ORDER BY shard_id
      check: rows
      ordered: true
      hint:
        vi: "`WHERE state = 'serving' AND version < 3`."
        en: "`WHERE state = 'serving' AND version < 3`."
    - task:
        vi: "Phiên bản 3 thêm cột `note text` vào `orders`. Áp nó cho shard chậm: bảng `orders` trong schema `shard_3`."
        en: "Version 3 adds a `note text` column to `orders`. Apply it to the lagging shard: the `orders` table in schema `shard_3`."
      solution: ALTER TABLE shard_3.orders ADD COLUMN note text
      check: catalog
      hint:
        vi: "Ghi rõ schema: `ALTER TABLE shard_3.orders ADD COLUMN note text`."
        en: "Name the schema: `ALTER TABLE shard_3.orders ADD COLUMN note text`."
    - task:
        vi: "Ghi phiên bản 3 vào danh mục, nhưng chỉ cho shard mà bảng `orders` của nó thật sự đã có cột `note` (đọc `information_schema.columns`). Bài chấm bằng phiên bản của mọi shard."
        en: "Record version 3 in the catalog, but only for shards whose `orders` table really has the `note` column (read `information_schema.columns`). It is graded by every shard's version."
      solution: UPDATE shards s SET version = 3 WHERE s.version < 3 AND EXISTS (SELECT FROM information_schema.columns c WHERE c.table_schema = s.schema_name AND c.table_name = 'orders' AND c.column_name = 'note')
      after: SELECT shard_id, version FROM shards ORDER BY shard_id
      check: rows
      ordered: true
      hint:
        vi: "`UPDATE shards s SET version = 3 WHERE s.version < 3 AND EXISTS (SELECT FROM information_schema.columns c WHERE c.table_schema = s.schema_name AND …)`: `s5` chưa có schema nên phải giữ 0."
        en: "`UPDATE shards s SET version = 3 WHERE s.version < 3 AND EXISTS (SELECT FROM information_schema.columns c WHERE c.table_schema = s.schema_name AND …)`: `s5` has no schema yet, so it must stay at 0."
    - task:
        vi: "Bật các shard đang tạo (`creating`) sang `serving`, nhưng chỉ shard mà schema đã có bảng `orders` (đọc `information_schema.tables`). Bài chấm bằng trạng thái của mọi shard."
        en: "Switch the shards being created (`creating`) to `serving`, but only those whose schema already has the `orders` table (read `information_schema.tables`). It is graded by every shard's state."
      solution: UPDATE shards s SET state = 'serving' WHERE s.state = 'creating' AND EXISTS (SELECT FROM information_schema.tables t WHERE t.table_schema = s.schema_name AND t.table_name = 'orders')
      after: SELECT shard_id, state FROM shards ORDER BY shard_id
      check: rows
      ordered: true
      hint:
        vi: "Như bước 3, với `information_schema.tables`: `s4` có bảng nên được bật, `s5` thì chưa."
        en: "As in step 3, with `information_schema.tables`: `s4` has the table so it is switched on, `s5` is not."
    - task:
        vi: "Chi phí theo khách: chi phí của mỗi shard (tổng `usd` của tài nguyên gắn thẻ shard đó) chia theo phần `requests` của từng khách trên shard ấy. Lấy `tenant_id`, `shard_id`, `usd` (làm tròn tới đơn vị), xếp theo `tenant_id`."
        en: "Cost per tenant: each shard's cost (the total `usd` of the resources tagged with that shard) split by each tenant's share of `requests` on it. Get `tenant_id`, `shard_id`, `usd` (rounded to a whole number), ordered by `tenant_id`."
      solution: SELECT u.tenant_id, u.shard_id, round(c.usd * u.requests / sum(u.requests) OVER (PARTITION BY u.shard_id)) AS usd FROM usage u JOIN (SELECT shard_id, sum(usd) AS usd FROM costs GROUP BY shard_id) c ON c.shard_id = u.shard_id ORDER BY u.tenant_id
      check: rows
      ordered: true
      hint:
        vi: "Gộp `costs` theo `shard_id` trong một bảng con, nối với `usage`, rồi `u.requests / sum(u.requests) OVER (PARTITION BY u.shard_id)` là phần của khách."
        en: "Sum `costs` by `shard_id` in a subquery, join it to `usage`, then `u.requests / sum(u.requests) OVER (PARTITION BY u.shard_id)` is the tenant's share."
quiz:
  - q:
      vi: "Thư mục chuyển đổi hôm nay bị thiếu, nên bộ chạy áp dụng 0 thay đổi và thoát mã 0. Nó nên báo gì?"
      en: "Today the migrations folder is missing, so the runner applies 0 changes and exits with code 0. What should it report?"
    options:
      - { vi: "Cảnh báo, rồi chạy tiếp ở shard sau", en: "A warning, then carry on to the next shard" }
      - { vi: "Thành công, vì không còn gì để áp", en: "Success, as there is nothing left to apply" }
      - { vi: "Thất bại, vì thiếu thư mục là lỗi", en: "Failure, as a missing folder is an error" }
    answer: 2
    trap: 1
    why:
      vi: "0 thay đổi trông như \"đã cập nhật\", nhưng bộ chạy không đọc được thư mục nào, nên nó không biết shard đã ở phiên bản mới chưa. Cảnh báo rồi chạy tiếp thì lỗi lặp lại ở mọi shard sau. Thiếu thư mục, hay 0 áp dụng khi đang chờ có thay đổi, là thất bại: dừng và thoát mã khác 0."
      en: "0 changes looks like \"up to date\", but the runner read no folder, so it cannot know whether the shard is on the new version. A warning and carrying on repeats the fault on every later shard. A missing folder, or 0 applied when changes are expected, is a failure: stop and exit with a non-zero code."
  - q:
      vi: "Hóa đơn tháng có 25 USD của tài nguyên không gắn thẻ shard. Chia khoản đó thế nào?"
      en: "The monthly bill has 25 USD from a resource with no shard tag. How should that amount be split?"
    options:
      - { vi: "Gắn thẻ trước, rồi mới chia", en: "Tag it first, then split it" }
      - { vi: "Chia đều cho mọi khách", en: "Split it evenly across tenants" }
      - { vi: "Cộng vào shard đắt nhất", en: "Add it to the costliest shard" }
    answer: 0
    trap: 1
    why:
      vi: "Chia đều hay cộng vào shard đắt nhất đều là đoán: 25 USD rơi vào khách không dùng nó, và tháng sau vẫn có tài nguyên không thẻ. Gắn thẻ shard, gói, môi trường và người sở hữu trước; khi đó khoản 25 USD vào đúng shard và chia theo `requests` như các khoản khác."
      en: "An even split and the costliest shard are both guesses: the 25 USD lands on tenants who did not use it, and next month there are still untagged resources. Tag shard, tier, environment and owner first; then the 25 USD goes to the right shard and is split by `requests` like the rest."
---
## Mở bài

Đổi cấu trúc trên một database là một lệnh; trên năm shard, đó là năm lần chạy, và lần thứ ba có thể hỏng. Nếu bộ chạy chuyển đổi (migration runner) nuốt lỗi và báo "xong", danh mục nói mọi shard đã ở phiên bản mới trong khi một shard vẫn ở bản cũ. Bài này chạy năm shard bằng năm schema để thấy cách dừng đúng lúc và cách chia hóa đơn.

## Ý chính

Mỗi shard có một số phiên bản trong danh mục. Bộ chạy lấy danh sách shard từ danh mục, không bao giờ từ một biến tên máy viết tay, rồi đưa từng shard lên: thử trước trên một shard ít rủi ro, sau đó lần lượt các shard còn lại. Nó dừng ở lỗi đầu tiên và báo lỗi. Phiên bản chỉ được ghi sau khi thay đổi đã thật sự có trên shard đó.

Nhiều người nghĩ thoát mã 0 là xong. Thật ra một lần chạy được đánh giá bằng dòng kết quả rõ ràng ("đã áp dụng 3/3"), không chỉ mã thoát: đã có bộ chạy hỏng giữa chừng mà vẫn thoát 0. Chạy mà 0 thay đổi, hay không tìm thấy thư mục chuyển đổi, là thất bại. Một shard chỉ được bật (`serving`) khi schema của nó đã có; bật dựa trên danh mục mà không nhìn vào database thì khách sẽ được gửi tới một shard rỗng.

Chi phí: gắn thẻ chi phí (tag của nhà cung cấp đám mây) cho mọi tài nguyên, gồm `shard_id`, gói (`tier`), môi trường và người sở hữu. Chi phí mỗi shard là tổng các tài nguyên mang thẻ đó; chia cho khách theo phần tải (số yêu cầu) để thấy ai đã lớn hơn gói của mình. Tài nguyên không thẻ thì gắn thẻ bổ sung, đừng chia đại.

**Chạy lại phải an toàn**: lần chạy sau bắt đầu lại từ shard còn ở phiên bản cũ, nên mỗi bước chuyển đổi phải chạy lại được mà không hỏng: `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`. Thay đổi phá vỡ (đổi tên hay xóa cột) chia làm hai đợt: đợt một thêm cái mới và ứng dụng đọc được cả hai; đợt hai, khi mọi shard đã lên, mới bỏ cái cũ. Nhờ vậy trong lúc các shard lệch phiên bản, ứng dụng vẫn chạy trên cả hai.

## Cú pháp

```sql
FOR s IN SELECT * FROM shards
  WHERE version < 3
  ORDER BY shard_id
LOOP
  EXECUTE format(
    'ALTER TABLE %I.orders ...',
    s.schema_name);
  COMMIT;
END LOOP;
```

- `format('%I', name)` đặt tên schema vào câu lệnh một cách an toàn, kể cả tên lạ.
- `COMMIT` trong thủ tục (`CALL`) giữ từng shard đã xong; lỗi ở shard sau làm cả lệnh dừng với lỗi.
- Đọc `information_schema.tables`/`columns` để biết thay đổi đã thật sự có, trước khi ghi danh mục.

## Ví dụ

Cột `note` của phiên bản 3 có ở schema nào; `shard_3` còn thiếu:

```sql
SELECT table_schema
FROM information_schema.columns
WHERE table_name = 'orders'
  AND column_name = 'note'
ORDER BY table_schema;
```

Bộ chạy: mỗi shard đang phục vụ một lần `ALTER`, ghi phiên bản, `COMMIT`; không có chỗ nào nuốt lỗi:

```sql
CREATE PROCEDURE migrate(want text)
LANGUAGE plpgsql AS $$
DECLARE s record;
BEGIN
  FOR s IN SELECT * FROM shards
    WHERE state = want
      AND version < 3
    ORDER BY shard_id
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.orders
         ADD COLUMN note text',
      s.schema_name);
    UPDATE shards SET version = 3
    WHERE shard_id = s.shard_id;
    COMMIT;
  END LOOP;
END $$;
CALL migrate('serving');
SELECT shard_id, state, version
FROM shards
ORDER BY shard_id;
```

Chi phí theo thẻ gói; khoản không thẻ hiện riêng thay vì biến mất:

```sql
SELECT coalesce(tier, '(no tag)')
    AS tier,
  sum(usd) AS usd
FROM costs
GROUP BY 1
ORDER BY 1;
```

## Lỗi hay gặp

Shard `s5` có trong danh mục nhưng chưa có schema. Bộ chạy dừng ở đó và báo lỗi; không có dòng "xong" nào:

```sql
-- ERROR 3F000
CALL migrate('creating');
```

Đánh giá lần chạy bằng mã thoát thì lần 12 (hỏng giữa chừng) và lần 14 (0 thay đổi) cũng "thành công". Đòi đủ số thay đổi và nhiều hơn 0 thì chỉ còn lần 11:

```sql
-- WRONG
SELECT run_id
FROM job_runs
WHERE exit_code = 0
ORDER BY run_id;
```

```sql
-- FIX
SELECT run_id
FROM job_runs
WHERE exit_code = 0
  AND applied = expected
  AND expected > 0
ORDER BY run_id;
```

Bật mọi shard đang tạo thì bật cả `s5`, chưa có bảng nào. Hỏi database trước thì chỉ `s4` đủ điều kiện:

```sql
-- WRONG
SELECT shard_id
FROM shards
WHERE state = 'creating'
ORDER BY shard_id;
```

```sql
-- FIX
SELECT s.shard_id
FROM shards s
WHERE s.state = 'creating'
  AND EXISTS (
    SELECT FROM
      information_schema.tables t
    WHERE t.table_schema
        = s.schema_name
      AND t.table_name = 'orders')
ORDER BY s.shard_id;
```

## Thực hành

Năm bước: tìm shard chậm phiên bản, áp thay đổi cho `shard_3` (chấm bằng catalog), ghi phiên bản chỉ nơi thay đổi đã có, bật shard có schema, rồi chia chi phí theo khách. Lab chạy năm shard bằng năm schema trong một database; ở hệ thật mỗi shard là một database riêng, và bộ chạy cũng làm đúng các bước ấy. Sau đó là hai câu hỏi.

## Tóm tắt

- Bộ chạy lấy shard từ danh mục, thử một shard trước, rồi từng shard một và dừng ở lỗi đầu tiên.
- Ghi phiên bản và bật shard chỉ sau khi database cho thấy thay đổi đã có.
- Đánh giá lần chạy bằng dòng kết quả, không chỉ mã thoát; 0 thay đổi khi đang chờ thay đổi là thất bại.
- Gắn thẻ mọi tài nguyên (shard, gói, môi trường, người sở hữu) rồi mới chia chi phí theo khách.
- Đọc tiếp: `e-ds-l5-10` (định tuyến), `e-pg-l1-19` (schema mỗi khách) và bản đồ chủ đề `e-ds-l4-09`.

# EN

## Opening

A schema change on one database is one command; on five shards it is five runs, and the third may fail. If the runner swallows the error and reports "done", the catalog says every shard is on the new version while one is still on the old one. This lesson runs five shards as five schemas to see how to stop at the right moment and how to split the bill.

## Key idea

Each shard has a version number in the catalog. The runner takes the shard list from the catalog, never from a hand-written host variable, and brings each shard up: first a low-risk shard as a trial, then the others one at a time. It stops at the first error and reports it. The version is recorded only after the change really exists on that shard.

Many people think exit code 0 means done. In fact a run is judged by an explicit result line ("applied 3 of 3"), not only by its exit code: runners have failed halfway and still exited 0. A run with 0 changes, or one that cannot find its migrations folder, is a failure. A shard is switched on (`serving`) only once its schema exists; switching on from the catalog without looking at the database sends tenants to an empty shard.

Cost: tag every resource with `shard_id`, tier (`tier`), environment and owner. A shard's cost is the sum of the resources carrying its tag; split it across tenants by their share of the load (requests) to see who has outgrown their tier. Fix untagged resources; do not split them at random.

**Re-runs must be safe**: the next run starts again from the shard still on the old version, so every migration step must run twice without harm: `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`. A breaking change (renaming or dropping a column) goes in two waves: the first adds the new thing and the app reads both; the second, once every shard is up, removes the old one. That way the app keeps working on both while the shards are on different versions.

## Syntax

```sql
FOR s IN SELECT * FROM shards
  WHERE version < 3
  ORDER BY shard_id
LOOP
  EXECUTE format(
    'ALTER TABLE %I.orders ...',
    s.schema_name);
  COMMIT;
END LOOP;
```

- `format('%I', name)` puts a schema name into a statement safely, even an unusual one.
- `COMMIT` inside a procedure (`CALL`) keeps each finished shard; an error on a later shard stops the whole command with that error.
- Read `information_schema.tables`/`columns` to know a change really exists before writing the catalog.

## Example

Which schemas have version 3's `note` column; `shard_3` is missing it:

```sql
SELECT table_schema
FROM information_schema.columns
WHERE table_name = 'orders'
  AND column_name = 'note'
ORDER BY table_schema;
```

The runner: for each serving shard one `ALTER`, record the version, `COMMIT`; nothing swallows an error:

```sql
CREATE PROCEDURE migrate(want text)
LANGUAGE plpgsql AS $$
DECLARE s record;
BEGIN
  FOR s IN SELECT * FROM shards
    WHERE state = want
      AND version < 3
    ORDER BY shard_id
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.orders
         ADD COLUMN note text',
      s.schema_name);
    UPDATE shards SET version = 3
    WHERE shard_id = s.shard_id;
    COMMIT;
  END LOOP;
END $$;
CALL migrate('serving');
SELECT shard_id, state, version
FROM shards
ORDER BY shard_id;
```

Cost by tier tag; the untagged amount shows on its own instead of disappearing:

```sql
SELECT coalesce(tier, '(no tag)')
    AS tier,
  sum(usd) AS usd
FROM costs
GROUP BY 1
ORDER BY 1;
```

## Common mistakes

Shard `s5` is in the catalog but has no schema yet. The runner stops there and reports the error; no "done" line appears:

```sql
-- ERROR 3F000
CALL migrate('creating');
```

Judged by exit code, run 12 (failed halfway) and run 14 (0 changes) also "succeed". Requiring every expected change, and more than 0, leaves only run 11:

```sql
-- WRONG
SELECT run_id
FROM job_runs
WHERE exit_code = 0
ORDER BY run_id;
```

```sql
-- FIX
SELECT run_id
FROM job_runs
WHERE exit_code = 0
  AND applied = expected
  AND expected > 0
ORDER BY run_id;
```

Switching on every shard being created also switches on `s5`, which has no tables. Asking the database first leaves only `s4`:

```sql
-- WRONG
SELECT shard_id
FROM shards
WHERE state = 'creating'
ORDER BY shard_id;
```

```sql
-- FIX
SELECT s.shard_id
FROM shards s
WHERE s.state = 'creating'
  AND EXISTS (
    SELECT FROM
      information_schema.tables t
    WHERE t.table_schema
        = s.schema_name
      AND t.table_name = 'orders')
ORDER BY s.shard_id;
```

## Practice

Five steps: find the shards behind on version, apply the change to `shard_3` (graded on the catalog), record the version only where the change exists, switch on the shards that have a schema, then split cost per tenant. The lab runs five shards as five schemas in one database; in a real system each shard is its own database, and the runner does the same steps. Then two questions.

## Recap

- The runner takes shards from the catalog, tries one shard first, then goes one shard at a time and stops at the first error.
- Record the version and switch a shard on only after the database shows the change exists.
- Judge a run by its result line, not only its exit code; 0 changes when changes are expected is a failure.
- Tag every resource (shard, tier, environment, owner) before splitting cost across tenants.
- Read next: `e-ds-l5-10` (routing), `e-pg-l1-19` (a schema per tenant) and the topic map `e-ds-l4-09`.
