---
id: e-st-l2-06
engine: stack
level: L2
module: dbt
title: "Snapshot: giữ lịch sử thay đổi (SCD2)"
title_en: "Snapshots: keeping change history (SCD2)"
kind: lab
runtime: browser
minutes: 30
figures: [{ name: st-scd2, at: idea }]
objectives:
  - vi: Hiểu một snapshot giữ mọi phiên bản của một dòng bằng `dbt_valid_from` và `dbt_valid_to`.
    en: Understand how a snapshot keeps every version of a row with `dbt_valid_from` and `dbt_valid_to`.
  - vi: Cập nhật snapshot bằng `MERGE` (đóng bản cũ, thêm khóa mới) rồi `INSERT` bản mới.
    en: Update a snapshot with `MERGE` (close old versions, add new keys) and then `INSERT` the new versions.
  - vi: Viết câu "tại thời điểm" và nối fact với snapshot mà không nhân dòng.
    en: Write an "as of" query and join a fact to a snapshot without multiplying rows.
requires: [e-st-l2-04]
sources:
  - { url: "https://docs.getdbt.com/docs/build/snapshots", title: "dbt docs: Add snapshots to your DAG" }
  - https://www.postgresql.org/docs/18/sql-merge.html
  - { url: "https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/type-2/", title: "Kimball Group: Type 2 slowly changing dimension" }
lab:
  setup: |
    CREATE SCHEMA raw_shop;
    CREATE SCHEMA snapshots;
    CREATE TABLE raw_shop.customers (
      customer_id int, tier text,
      updated_at timestamp
    );
    INSERT INTO raw_shop.customers VALUES
      (21, 'gold', '2026-10-20'),
      (22, 'gold', '2026-09-15'),
      (23, 'bronze', '2026-10-28'),
      (24, 'silver', '2026-10-25');
    CREATE TABLE snapshots.customers_snapshot (
      customer_id int, tier text,
      updated_at timestamp,
      dbt_valid_from timestamp,
      dbt_valid_to timestamp
    );
    INSERT INTO snapshots.customers_snapshot VALUES
      (21, 'silver', '2026-09-01', '2026-09-01', NULL),
      (22, 'silver', '2026-08-01', '2026-08-01', '2026-09-15'),
      (22, 'gold', '2026-09-15', '2026-09-15', NULL),
      (23, 'silver', '2026-10-01', '2026-10-01', NULL);
    CREATE TABLE raw_shop.orders (
      order_id int, customer_id int,
      order_date date, amount_vnd int
    );
    INSERT INTO raw_shop.orders VALUES
      (601, 22, '2026-08-20', 100000),
      (602, 22, '2026-09-20', 100000),
      (603, 22, '2026-10-10', 100000),
      (604, 21, '2026-10-12', 300000);
  steps:
    - task:
        vi: "Khách nào đã đổi ở nguồn so với bản hiện hành trong snapshot (bản có `dbt_valid_to` trống)? Trả `customer_id`, `old_tier` (trong snapshot), `new_tier` (ở nguồn), chỉ những khách có `updated_at` ở nguồn mới hơn."
        en: "Which customers changed at the source compared with the snapshot's current version (the one with an empty `dbt_valid_to`)? Return `customer_id`, `old_tier` (snapshot), `new_tier` (source), only customers whose source `updated_at` is newer."
      solution: |
        select c.customer_id,
          s.tier as old_tier,
          c.tier as new_tier
        from raw_shop.customers c
        join snapshots.customers_snapshot s
          on s.customer_id = c.customer_id
          and s.dbt_valid_to is null
        where c.updated_at > s.updated_at
      check: rows
      hint:
        vi: "Nối nguồn với bản hiện hành (`dbt_valid_to is null`) rồi so `updated_at`."
        en: "Join the source to the current version (`dbt_valid_to is null`) and compare `updated_at`."
    - task:
        vi: "Một câu `MERGE` vào `snapshots.customers_snapshot` từ `raw_shop.customers`, khớp theo `customer_id` trên bản hiện hành: bản nào có `updated_at` ở nguồn mới hơn thì đặt `dbt_valid_to` = `updated_at` của nguồn; khách chưa có thì thêm một dòng với `dbt_valid_from` = `updated_at` và `dbt_valid_to` trống."
        en: "One `MERGE` into `snapshots.customers_snapshot` from `raw_shop.customers`, matching `customer_id` on the current version: when the source `updated_at` is newer, set `dbt_valid_to` = the source `updated_at`; a customer not there yet gets a row with `dbt_valid_from` = `updated_at` and an empty `dbt_valid_to`."
      solution: |
        merge into snapshots.customers_snapshot s
        using raw_shop.customers c
        on s.customer_id = c.customer_id
          and s.dbt_valid_to is null
        when matched
          and c.updated_at > s.updated_at then
          update set dbt_valid_to = c.updated_at
        when not matched then
          insert values (c.customer_id, c.tier,
            c.updated_at, c.updated_at, null)
      after: SELECT customer_id, tier, dbt_valid_from, dbt_valid_to FROM snapshots.customers_snapshot
      check: rows
      hint:
        vi: "`on … and s.dbt_valid_to is null`, `when matched and c.updated_at > s.updated_at then update …`, `when not matched then insert …`."
        en: "`on … and s.dbt_valid_to is null`, `when matched and c.updated_at > s.updated_at then update …`, `when not matched then insert …`."
    - task:
        vi: "Các khách vừa được đóng bản cũ giờ không còn bản hiện hành. Thêm cho mỗi khách ở nguồn chưa có bản hiện hành một dòng mới: `tier` và `updated_at` của nguồn, `dbt_valid_from` = `updated_at`, `dbt_valid_to` trống."
        en: "The customers whose old version was just closed now have no current version. For every source customer without a current version, insert a new row: the source `tier` and `updated_at`, `dbt_valid_from` = `updated_at`, an empty `dbt_valid_to`."
      solution: |
        insert into snapshots.customers_snapshot
        select c.customer_id, c.tier,
          c.updated_at, c.updated_at, null
        from raw_shop.customers c
        where not exists (
          select 1
          from snapshots.customers_snapshot s
          where s.customer_id = c.customer_id
            and s.dbt_valid_to is null)
      after: SELECT customer_id, tier, dbt_valid_from, dbt_valid_to FROM snapshots.customers_snapshot
      check: rows
      hint:
        vi: "`insert into … select … where not exists (… s.dbt_valid_to is null)`."
        en: "`insert into … select … where not exists (… s.dbt_valid_to is null)`."
    - task:
        vi: "Hạng của mỗi khách vào `2026-10-22`: `customer_id`, `tier`, từ phiên bản có hiệu lực ngày đó (bắt đầu không sau ngày đó, và chưa kết thúc tới ngày đó hoặc còn hiện hành)."
        en: "Each customer's tier on `2026-10-22`: `customer_id`, `tier`, from the version valid that day (started on or before it, and not ended by it, or still current)."
      solution: |
        select customer_id, tier
        from snapshots.customers_snapshot
        where dbt_valid_from <= '2026-10-22'
          and (dbt_valid_to > '2026-10-22'
            or dbt_valid_to is null)
      check: rows
      hint:
        vi: "`dbt_valid_from <= d and (dbt_valid_to > d or dbt_valid_to is null)`."
        en: "`dbt_valid_from <= d and (dbt_valid_to > d or dbt_valid_to is null)`."
quiz:
  - q:
      vi: "Câu \"tại thời điểm\" viết `dbt_valid_from <= d AND dbt_valid_to > d`. Dòng nào bị mất?"
      en: "An \"as of\" query is written `dbt_valid_from <= d AND dbt_valid_to > d`. Which rows does it lose?"
    options:
      - { vi: "Các bản đã đóng đúng vào ngày d", en: "Versions closed exactly on day d" }
      - { vi: "Các bản còn hiện hành", en: "The versions that are still current" }
      - { vi: "Không dòng nào, câu đã đủ", en: "None, the query is complete" }
    answer: 1
    trap: 0
    why:
      vi: "Bản đóng đúng ngày d nghe như bị mất, nhưng nó đúng là không còn hiệu lực ngày d (bản mới bắt đầu từ d), nên bỏ nó là đúng. Cái thật sự mất là bản hiện hành: `dbt_valid_to` trống, và `NULL > d` không ra đúng, nên mọi khách chưa đổi biến mất. Thêm `OR dbt_valid_to IS NULL`."
      en: "A version closed exactly on d sounds lost, but it really is no longer valid on d (the new one starts on d), so dropping it is right. What is truly lost is the current version: `dbt_valid_to` is empty, and `NULL > d` is not true, so every customer who never changed disappears. Add `OR dbt_valid_to IS NULL`."
  - q:
      vi: "Khách 22 có 2 phiên bản trong snapshot và 3 đơn, mỗi đơn 100.000 đồng. Nối đơn với snapshot chỉ theo `customer_id` rồi cộng tiền: ra bao nhiêu?"
      en: "Customer 22 has 2 versions in the snapshot and 3 orders of 100,000 VND each. Join the orders to the snapshot on `customer_id` only and sum the amount: what comes out?"
    options:
      - { vi: "300.000 đồng", en: "300,000 VND" }
      - { vi: "200.000 đồng", en: "200,000 VND" }
      - { vi: "600.000 đồng", en: "600,000 VND" }
    answer: 2
    trap: 0
    why:
      vi: "300.000 là số đúng nên dễ chọn, nhưng câu nối không biết phiên bản nào có hiệu lực: mỗi đơn khớp cả 2 phiên bản, thành 3 × 2 = 6 dòng, và tổng là 6 × 100.000 = 600.000. 200.000 không có cách nối nào ra. Nối thêm điều kiện ngày đơn nằm trong `dbt_valid_from`…`dbt_valid_to` thì mỗi đơn còn đúng một dòng."
      en: "300,000 is the true figure, so it is tempting, but the join does not know which version was valid: each order matches both versions, giving 3 × 2 = 6 rows, and the sum is 6 × 100,000 = 600,000. No join gives 200,000. Add the condition that the order date falls inside `dbt_valid_from`…`dbt_valid_to` and each order keeps exactly one row."
---
## Mở bài

Chợ Lồng Đèn xếp khách thành hạng bạc, vàng, đồng, và hệ thống bán hàng chỉ giữ hạng hiện tại. Khi sếp hỏi "doanh thu tháng 9 của khách hạng vàng", bạn cần biết hạng của từng khách vào tháng 9, không phải hôm nay.

## Ý chính

Một **snapshot** (bảng lịch sử kiểu SCD2) giữ mọi phiên bản của một dòng. Mỗi phiên bản có `dbt_valid_from` (bắt đầu hiệu lực) và `dbt_valid_to` (hết hiệu lực); bản hiện hành có `dbt_valid_to` trống. Khi nguồn đổi, bản cũ được đóng lại và một bản mới được thêm, nên không gì bị ghi đè.

dbt chạy snapshot theo lịch: so nguồn với bản hiện hành, theo cột `updated_at` (chiến lược `timestamp`) hoặc theo các cột chỉ định (chiến lược `check`). Trong Postgres, cùng việc đó là một `MERGE` đóng bản cũ và thêm khóa mới, rồi một `INSERT` cho bản mới của khóa vừa đóng. dbt còn thêm `dbt_scd_id` và `dbt_updated_at`; bài này giữ hai cột chính.

Đọc snapshot luôn cần một ngày: "tại thời điểm d" là bản có `dbt_valid_from <= d` và `dbt_valid_to` sau d hoặc còn trống. Nối fact với snapshot cũng phải kèm ngày, nếu không mỗi đơn khớp mọi phiên bản. Hình cuối mục cho thấy khách 21 trước và sau lần chạy snapshot.

## Cú pháp

```text
# snapshots/customers_snapshot.yml
snapshots:
  - name: customers_snapshot
    relation: source('shop','customers')
    config:
      unique_key: customer_id
      strategy: timestamp
      updated_at: updated_at
```

```sql
-- as of day d
SELECT customer_id, tier
FROM snapshots.customers_snapshot
WHERE dbt_valid_from <= d
  AND (dbt_valid_to > d
    OR dbt_valid_to IS NULL);
```

- `MERGE … WHEN MATCHED … UPDATE` đóng bản cũ; `WHEN NOT MATCHED … INSERT` thêm khóa mới.
- Mỗi khóa có đúng một bản với `dbt_valid_to` trống.

## Ví dụ

Bản hiện hành của mỗi khách:

```sql
SELECT customer_id, tier, dbt_valid_from
FROM snapshots.customers_snapshot
WHERE dbt_valid_to IS NULL
ORDER BY customer_id;
```

Hạng của mỗi khách vào ngày 20/08: khách 22 khi đó còn là bạc.

```sql
SELECT customer_id, tier
FROM snapshots.customers_snapshot
WHERE dbt_valid_from <= '2026-08-20'
  AND (dbt_valid_to > '2026-08-20'
    OR dbt_valid_to IS NULL);
```

## Lỗi hay gặp

Câu "tại thời điểm" quên bản hiện hành: khách 22 ngày 10/10 biến mất.

```sql
-- WRONG: NULL valid_to never matches
SELECT customer_id, tier
FROM snapshots.customers_snapshot
WHERE dbt_valid_from <= '2026-10-10'
  AND dbt_valid_to > '2026-10-10';
```

```sql
-- FIX: an open version is valid too
SELECT customer_id, tier
FROM snapshots.customers_snapshot
WHERE dbt_valid_from <= '2026-10-10'
  AND (dbt_valid_to > '2026-10-10'
    OR dbt_valid_to IS NULL);
```

Nối đơn với snapshot chỉ theo khóa: ba đơn của khách 22 khớp cả hai phiên bản.

```sql
-- WRONG: every version matches
SELECT sum(o.amount_vnd) AS revenue
FROM raw_shop.orders o
JOIN snapshots.customers_snapshot s
  ON s.customer_id = o.customer_id
WHERE o.customer_id = 22;
```

```sql
-- FIX: the version valid that day
SELECT sum(o.amount_vnd) AS revenue
FROM raw_shop.orders o
JOIN snapshots.customers_snapshot s
  ON s.customer_id = o.customer_id
 AND o.order_date >= s.dbt_valid_from
 AND (o.order_date < s.dbt_valid_to
   OR s.dbt_valid_to IS NULL)
WHERE o.customer_id = 22;
```

## Thực hành

Bốn bước của một lần chạy snapshot viết tay: tìm khách đã đổi, `MERGE` đóng bản cũ và thêm khách mới, `INSERT` bản mới cho khách vừa đóng, rồi đọc hạng của mọi khách vào ngày 22/10. Mỗi bước được chấm bằng cách đọc lại cả bảng snapshot.

## Tóm tắt

- Snapshot giữ mọi phiên bản: `dbt_valid_from`, `dbt_valid_to`, bản hiện hành có `dbt_valid_to` trống.
- Một lần chạy: đóng bản cũ, thêm khóa mới, thêm bản mới cho khóa vừa đóng.
- "Tại thời điểm d" phải tính cả bản còn trống `dbt_valid_to`.
- Nối fact với snapshot luôn kèm ngày, nếu không mỗi dòng nhân theo số phiên bản.

# EN

## Opening

Lantern Market ranks customers as silver, gold and bronze, and the sales system keeps only the current tier. When your manager asks for "September revenue from gold customers", you need each customer's tier in September, not today.

## Key idea

A **snapshot** (an SCD2 history table) keeps every version of a row. Each version has `dbt_valid_from` (when it became valid) and `dbt_valid_to` (when it stopped); the current version has an empty `dbt_valid_to`. When the source changes, the old version is closed and a new one is added, so nothing is overwritten.

dbt runs a snapshot on a schedule: it compares the source with the current versions, by an `updated_at` column (the `timestamp` strategy) or by chosen columns (the `check` strategy). In Postgres the same work is one `MERGE` that closes old versions and adds new keys, then one `INSERT` for the new versions of the keys just closed. dbt also adds `dbt_scd_id` and `dbt_updated_at`; this lesson keeps the two main columns.

Reading a snapshot always needs a date: "as of d" is the version with `dbt_valid_from <= d` and a `dbt_valid_to` after d or still empty. Joining a fact to a snapshot needs the date too, otherwise each order matches every version. The figure at the end of this section shows customer 21 before and after a snapshot run.

## Syntax

```text
# snapshots/customers_snapshot.yml
snapshots:
  - name: customers_snapshot
    relation: source('shop','customers')
    config:
      unique_key: customer_id
      strategy: timestamp
      updated_at: updated_at
```

```sql
-- as of day d
SELECT customer_id, tier
FROM snapshots.customers_snapshot
WHERE dbt_valid_from <= d
  AND (dbt_valid_to > d
    OR dbt_valid_to IS NULL);
```

- `MERGE … WHEN MATCHED … UPDATE` closes old versions; `WHEN NOT MATCHED … INSERT` adds new keys.
- Each key has exactly one version with an empty `dbt_valid_to`.

## Example

Each customer's current version:

```sql
SELECT customer_id, tier, dbt_valid_from
FROM snapshots.customers_snapshot
WHERE dbt_valid_to IS NULL
ORDER BY customer_id;
```

Each customer's tier on 20 Aug: customer 22 was still silver then.

```sql
SELECT customer_id, tier
FROM snapshots.customers_snapshot
WHERE dbt_valid_from <= '2026-08-20'
  AND (dbt_valid_to > '2026-08-20'
    OR dbt_valid_to IS NULL);
```

## Common mistakes

An "as of" query that forgets the current versions: customer 22 on 10 Oct disappears.

```sql
-- WRONG: NULL valid_to never matches
SELECT customer_id, tier
FROM snapshots.customers_snapshot
WHERE dbt_valid_from <= '2026-10-10'
  AND dbt_valid_to > '2026-10-10';
```

```sql
-- FIX: an open version is valid too
SELECT customer_id, tier
FROM snapshots.customers_snapshot
WHERE dbt_valid_from <= '2026-10-10'
  AND (dbt_valid_to > '2026-10-10'
    OR dbt_valid_to IS NULL);
```

Joining orders to the snapshot on the key only: customer 22's three orders match both versions.

```sql
-- WRONG: every version matches
SELECT sum(o.amount_vnd) AS revenue
FROM raw_shop.orders o
JOIN snapshots.customers_snapshot s
  ON s.customer_id = o.customer_id
WHERE o.customer_id = 22;
```

```sql
-- FIX: the version valid that day
SELECT sum(o.amount_vnd) AS revenue
FROM raw_shop.orders o
JOIN snapshots.customers_snapshot s
  ON s.customer_id = o.customer_id
 AND o.order_date >= s.dbt_valid_from
 AND (o.order_date < s.dbt_valid_to
   OR s.dbt_valid_to IS NULL)
WHERE o.customer_id = 22;
```

## Practice

The four steps of a hand-written snapshot run: find the customers who changed, `MERGE` to close old versions and add new customers, `INSERT` the new versions of the customers just closed, then read every customer's tier on 22 Oct. Each step is graded by reading the whole snapshot table back.

## Recap

- A snapshot keeps every version: `dbt_valid_from`, `dbt_valid_to`, and the current version has an empty `dbt_valid_to`.
- One run: close old versions, add new keys, add new versions for the keys just closed.
- "As of d" must include versions with an empty `dbt_valid_to`.
- Always join a fact to a snapshot with a date, or each row multiplies by the number of versions.
