---
id: e-ds-l4-09
engine: design
level: L4
module: multi-tenant
title: Nhiều khách hàng - ba lớp bảo vệ và bản đồ chủ đề
title_en: Multi-tenant - three layers of protection and the topic map
kind: concept
runtime: browser
minutes: 12
objectives:
  - vi: Kể ba lớp giữ dữ liệu các khách hàng tách nhau trong pool - câu lọc, khóa, chính sách - và lớp nào chặn lỗi nào.
    en: Name the three layers that keep tenants apart in a pool - query filters, keys, policies - and which mistake each one stops.
  - vi: Nối hai bảng của khách hàng bằng cả hai cột và thấy phép nối thiếu tenant_id nhân dòng giữa các khách.
    en: Join two tenant tables on both columns and see a join without tenant_id multiply rows across tenants.
  - vi: Biết bài và thẻ nào học tiếp cho từng lớp.
    en: Know which lesson and card to read next for each layer.
requires: [e-ds-l4-08]
sources:
  - https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/silo-pool-and-bridge-models.html
  - https://www.postgresql.org/docs/18/ddl-constraints.html#DDL-CONSTRAINTS-FK
  - https://www.postgresql.org/docs/18/ddl-rowsecurity.html
lab:
  setup: |
    CREATE TABLE invoices (
      tenant_id int NOT NULL,
      id int NOT NULL,
      amount int NOT NULL,
      PRIMARY KEY (tenant_id, id)
    );
    CREATE TABLE payments (
      tenant_id int NOT NULL,
      id int NOT NULL,
      invoice_id int NOT NULL,
      paid int NOT NULL,
      PRIMARY KEY (tenant_id, id),
      FOREIGN KEY (tenant_id, invoice_id) REFERENCES invoices (tenant_id, id)
    );
    INSERT INTO invoices
    SELECT t, i, 100 * i + t FROM generate_series(1, 3) t, generate_series(1, 4) i;
    INSERT INTO payments
    SELECT t, i, i, 50 * i + t FROM generate_series(1, 3) t, generate_series(1, 4) i;
  steps:
    - task:
        vi: "Sổ thu của người bán 3: mỗi hóa đơn một dòng `tenant_id`, `id`, `amount`, số đã trả `paid`, xếp theo `id`. Nối `invoices` với `payments` bằng cả hai cột."
        en: "Seller 3's receipts book: one row per invoice with `tenant_id`, `id`, `amount`, the `paid` amount, ordered by `id`. Join `invoices` to `payments` on both columns."
      solution: SELECT i.tenant_id, i.id, i.amount, p.paid FROM invoices i JOIN payments p ON p.tenant_id = i.tenant_id AND p.invoice_id = i.id WHERE i.tenant_id = 3 ORDER BY i.id
      check: rows
      ordered: true
      hint:
        vi: "`ON p.tenant_id = i.tenant_id AND p.invoice_id = i.id`: thiếu vế đầu thì mỗi hóa đơn ra ba dòng."
        en: "`ON p.tenant_id = i.tenant_id AND p.invoice_id = i.id`: without the first part each invoice gives three rows."
    - task:
        vi: "Đánh index cho khóa ngoại ghép của `payments`: một index trên `payments (tenant_id, invoice_id)`. Đừng đặt tên index."
        en: "Index the composite foreign key of `payments`: one index on `payments (tenant_id, invoice_id)`. Do not name the index."
      solution: CREATE INDEX ON payments (tenant_id, invoice_id)
      check: catalog
      hint:
        vi: "`CREATE INDEX ON payments (tenant_id, invoice_id)`."
        en: "`CREATE INDEX ON payments (tenant_id, invoice_id)`."
quiz:
  - q:
      vi: "Bảng đã bật bảo mật theo dòng, mỗi người bán chỉ đọc được dòng của mình. Còn cần khóa ngoại ghép có tenant_id không?"
      en: "The table has row-level security on, and each seller reads only its own rows. Is a composite foreign key with tenant_id still needed?"
    options:
      - { vi: "Không: chính sách đã lọc mọi lần đọc và ghi", en: "No: the policy already filters every read and write" }
      - { vi: "Có: kiểm khóa ngoại không đi qua chính sách", en: "Yes: foreign key checks do not go through the policy" }
      - { vi: "Chỉ cần khi bảng chưa có index trên tenant_id", en: "Only when the table has no index on tenant_id" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì chính sách chặn mọi lần đọc nhầm, nhưng nó không kiểm một tham chiếu trỏ tới đâu. Mỗi lớp chặn một loại lỗi: câu lọc chặn đọc nhầm, khóa chặn ghi sai, chính sách là lưới khi một câu quên lọc."
      en: "It sounds right because the policy stops every wrong read, but it does not check where a reference points. Each layer stops one kind of mistake: filters stop wrong reads, keys stop wrong writes, the policy is the net when a query forgets its filter."
  - q:
      vi: "Một báo cáo nối `invoices` với `payments` chỉ bằng `p.invoice_id = i.id`, rồi lọc `i.tenant_id = 2`. Kết quả sai thế nào?"
      en: "A report joins `invoices` to `payments` only on `p.invoice_id = i.id`, then filters `i.tenant_id = 2`. How is the result wrong?"
    options:
      - { vi: "Không sai: điều kiện tenant ở WHERE áp cho cả câu", en: "It is not wrong: the tenant filter in WHERE covers the whole query" }
      - { vi: "Dòng bị nhân: khoản trả cùng số của mọi khách khớp vào", en: "Rows multiply: payments with the same number at every tenant match" }
      - { vi: "Câu báo lỗi, vì khóa ngoại ghép mà phép nối chỉ một cột", en: "The query fails, as the key is composite but the join uses one column" }
    answer: 1
    trap: 0
    why:
      vi: "Nhiều người nghĩ một điều kiện tenant ở WHERE là đủ cho cả câu. Thật ra WHERE chỉ lọc bảng mà nó nhắc tới; bảng kia vẫn khớp theo số hóa đơn ở mọi khách. Trong lab, câu này ra 12 dòng thay vì 4."
      en: "Many people think one tenant condition in WHERE covers the whole query. In fact WHERE only filters the table it names; the other table still matches by invoice number at every tenant. In the lab this query gives 12 rows instead of 4."
---
## Mở bài

Một sáng, người bán Minh Tea gọi lên: báo cáo thu tiền của họ có những khoản không phải của họ. Không ai đột nhập cả, chỉ là một phép nối thiếu một vế. Bài này gom ba lớp bảo vệ của mô hình pool vào một chỗ và chỉ đường tới các bài đào sâu từng lớp.

## Ý chính

Trong pool, ba lớp giữ dữ liệu các khách tách nhau, và mỗi lớp chặn một loại lỗi. **Câu lọc**: mọi câu nhắc tới `tenant_id`, kể cả trong điều kiện nối, nếu không thì đọc nhầm. **Khóa**: `tenant_id` đầu khóa chính, khóa ngoại ghép và luật duy nhất theo tenant, để database từ chối ghi sai. **Chính sách**: bảo mật theo dòng thêm điều kiện tenant vào mọi câu, làm lưới khi một câu quên lọc.

Bản đồ chủ đề: mỗi lớp một nhóm, mỗi dòng một bài đào sâu lớp đó.

**Mô hình**: dữ liệu nằm ở đâu.

- `e-ds-l4-08`
- `e-ds-l4-10`
- `e-ds-l5-08`
- `e-pg-l1-19`
- `e-mg-l5-12`

**Câu lọc**: chặn đọc nhầm, giữ câu nhanh.

- `e-pg-l2-26`
- `e-pg-l4-20`
- `e-mg-l3-19`
- `e-bp-m39`

**Khóa**: chặn ghi sai.

- `e-ds-l2-06`
- `e-ds-l2-07`
- `e-dy-l3-14`

**Chính sách**: lưới khi câu quên lọc.

- `e-pg-l5-10`
- `e-pg-l5-19`
- `e-pg-l5-20`
- `e-bp-x08`
- `e-bp-s10`
- `e-dy-l5-09`

**Vận hành** (khách rời đi, khách quá tải, đổi cấu trúc từng shard, định tuyến) và bài tổng hợp.

- `e-ds-l5-09`
- `e-ds-l5-10`
- `e-pg-l5-21`
- `e-pg-l5-22`
- `e-dy-l4-16`
- `e-ds-l4-11`
- `e-ds-l5-11`

Nhiều người nghĩ có một lớp là đủ. Thật ra chúng không thay nhau được: chính sách không kiểm khóa ngoại trỏ đi đâu, kiểm duy nhất và khóa ngoại cũng không đi qua chính sách, còn khóa thì không ngăn một câu đọc thiếu điều kiện. Silo và bridge đẩy phần lớn việc cô lập xuống hạ tầng; pool đặt nó vào dữ liệu, nên cần đủ cả ba.

## Ví dụ

Mỗi người bán 4 hóa đơn trong cùng một bảng:

```sql
SELECT tenant_id,
  count(*) AS invoices
FROM invoices
GROUP BY tenant_id
ORDER BY tenant_id;
```

Nối bằng cả hai cột: 4 dòng của đúng người bán 2.

```sql
SELECT i.id, i.amount, p.paid
FROM invoices i
JOIN payments p
  ON p.tenant_id = i.tenant_id
 AND p.invoice_id = i.id
WHERE i.tenant_id = 2
ORDER BY i.id;
```

## Lỗi hay gặp

Phép nối thiếu vế tenant nhân mỗi hóa đơn với khoản trả cùng số của cả ba người bán:

```sql
-- WRONG: the join forgets the tenant
SELECT count(*) AS rows_seen
FROM invoices i
JOIN payments p
  ON p.invoice_id = i.id
WHERE i.tenant_id = 2;
```

```sql
-- FIX: join on both columns
SELECT count(*) AS rows_seen
FROM invoices i
JOIN payments p
  ON p.tenant_id = i.tenant_id
 AND p.invoice_id = i.id
WHERE i.tenant_id = 2;
```

Câu sai thấy 12 dòng, câu đúng 4. Lớp khóa thì chặn khoản trả cho hóa đơn không có ở người bán đó:

```sql
-- ERROR 23503: seller 1 has no invoice 9
INSERT INTO payments
VALUES (1, 5, 9, 10);
```

## Tóm tắt

- Pool có ba lớp: câu lọc (kể cả điều kiện nối), khóa có `tenant_id`, chính sách theo dòng; mỗi lớp chặn một loại lỗi.
- Nối hai bảng của khách bằng cả hai cột; thiếu vế `tenant_id` thì dòng bị nhân giữa các khách.
- Kiểm khóa ngoại và kiểm duy nhất không đi qua chính sách, nên lớp khóa vẫn cần khi đã bật bảo mật theo dòng.
- Bản đồ chủ đề ở phần Ý chính; nên đi tiếp `e-ds-l4-10`, rồi tổng hợp ở `e-ds-l4-11` và, ở tầm nền tảng, `e-ds-l5-11`.

# EN

## Opening

One morning seller Minh Tea calls: their payments report holds amounts that are not theirs. Nobody broke in, a join was just missing one condition. This lesson gathers the pool model's three layers of protection in one place and points to the lessons that go deep on each.

## Key idea

In a pool, three layers keep tenants apart, and each layer stops one kind of mistake. **Query filters**: every query names `tenant_id`, join conditions included, otherwise it reads the wrong rows. **Keys**: `tenant_id` first in primary keys, composite foreign keys and per-tenant uniqueness rules, so the database refuses wrong writes. **Policies**: row-level security adds the tenant condition to every query, a net for the query that forgets its filter.

The topic map: one group per layer, one line per lesson that goes deep on it.

**Models**: where the data lives.

- `e-ds-l4-08`
- `e-ds-l4-10`
- `e-ds-l5-08`
- `e-pg-l1-19`
- `e-mg-l5-12`

**Query filters**: stop wrong reads, keep queries fast.

- `e-pg-l2-26`
- `e-pg-l4-20`
- `e-mg-l3-19`
- `e-bp-m39`

**Keys**: stop wrong writes.

- `e-ds-l2-06`
- `e-ds-l2-07`
- `e-dy-l3-14`

**Policies**: the net for a query that forgets its filter.

- `e-pg-l5-10`
- `e-pg-l5-19`
- `e-pg-l5-20`
- `e-bp-x08`
- `e-bp-s10`
- `e-dy-l5-09`

**Operations** (a tenant leaves, a tenant overloads, per-shard migrations, routing) and the capstones.

- `e-ds-l5-09`
- `e-ds-l5-10`
- `e-pg-l5-21`
- `e-pg-l5-22`
- `e-dy-l4-16`
- `e-ds-l4-11`
- `e-ds-l5-11`

Many people think one layer is enough. In fact they cannot replace each other: a policy does not check where a foreign key points, unique and foreign key checks do not go through the policy, and keys do not stop a query that reads without its condition. Silo and bridge push most isolation down into the infrastructure; a pool puts it into the data, so it needs all three.

## Example

Each seller has 4 invoices in the same table:

```sql
SELECT tenant_id,
  count(*) AS invoices
FROM invoices
GROUP BY tenant_id
ORDER BY tenant_id;
```

Join on both columns: the 4 rows of seller 2 only.

```sql
SELECT i.id, i.amount, p.paid
FROM invoices i
JOIN payments p
  ON p.tenant_id = i.tenant_id
 AND p.invoice_id = i.id
WHERE i.tenant_id = 2
ORDER BY i.id;
```

## Common mistakes

A join without the tenant term multiplies each invoice by the payments with the same number at all three sellers:

```sql
-- WRONG: the join forgets the tenant
SELECT count(*) AS rows_seen
FROM invoices i
JOIN payments p
  ON p.invoice_id = i.id
WHERE i.tenant_id = 2;
```

```sql
-- FIX: join on both columns
SELECT count(*) AS rows_seen
FROM invoices i
JOIN payments p
  ON p.tenant_id = i.tenant_id
 AND p.invoice_id = i.id
WHERE i.tenant_id = 2;
```

The wrong version sees 12 rows, the right one 4. The key layer stops a payment for an invoice that seller does not have:

```sql
-- ERROR 23503: seller 1 has no invoice 9
INSERT INTO payments
VALUES (1, 5, 9, 10);
```

## Recap

- A pool has three layers: query filters (join conditions included), keys with `tenant_id`, row policies; each layer stops one kind of mistake.
- Join two tenant tables on both columns; without the `tenant_id` term rows multiply across tenants.
- Foreign key and unique checks do not go through the policy, so the key layer is still needed with row-level security on.
- The topic map is in the Key idea; go on with `e-ds-l4-10`, then the capstone `e-ds-l4-11` and, at platform level, `e-ds-l5-11`.
