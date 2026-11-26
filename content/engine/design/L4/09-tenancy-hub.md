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
figures: [{ name: ds-tenant-layers, at: idea }]
objectives:
  - vi: Kể ba lớp giữ dữ liệu các khách hàng tách nhau trong pool - câu lọc, khóa, chính sách - và lớp nào chặn lỗi nào.
    en: Name the three layers that keep tenants apart in a pool - query filters, keys, policies - and which mistake each one stops.
  - vi: Nối hai bảng của khách hàng bằng cả hai cột và thấy phép nối thiếu tenant_id nhân dòng giữa các khách.
    en: Join two tenant tables on both columns and see a join without tenant_id multiply rows across tenants.
  - vi: Biết bài và thẻ nào học tiếp cho từng lớp.
    en: Know which lesson and card to read next for each layer.
requires: [e-ds-l4-08]
sources:
  - url: https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/silo-pool-and-bridge-models.html
    title: "Silo, Pool, and Bridge Models"
  - url: https://www.postgresql.org/docs/18/ddl-constraints.html#DDL-CONSTRAINTS-FK
    title: "Constraints › Foreign Keys"
  - url: https://www.postgresql.org/docs/18/ddl-rowsecurity.html
    title: "Row Security Policies"
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
      vi: "Chính sách nghe như đã đủ vì nó chặn mọi lần đọc nhầm, nhưng Postgres kiểm khóa ngoại bên dưới chính sách: phép kiểm đó không bị bảo mật theo dòng (row-level security) lọc. Vì vậy chỉ khóa ngoại ghép `(tenant_id, invoice_id)` mới chặn một khoản trả của người bán 3 trỏ tới hóa đơn của người bán 2. Index trên `tenant_id` không liên quan: index làm câu nhanh, không giữ luật."
      en: "The policy sounds like enough because it stops every wrong read, but Postgres checks foreign keys underneath the policy: that check is not filtered by row-level security. So only the composite foreign key `(tenant_id, invoice_id)` stops a payment of seller 3 from pointing to an invoice of seller 2. An index on `tenant_id` is beside the point: an index makes queries fast, it does not enforce a rule."
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
      vi: "`i.tenant_id = 2` chỉ lọc `invoices`; `payments` vẫn khớp theo số hóa đơn ở mọi khách, vì số hóa đơn 1–4 lặp lại ở cả ba người bán. Câu không báo lỗi: nối một cột vẫn là SQL hợp lệ, khóa ngoại chỉ kiểm lúc ghi. Trong lab, 4 hóa đơn của người bán 2 mỗi cái khớp 3 khoản trả, ra 4 × 3 = 12 dòng thay vì 4. Sửa bằng `p.tenant_id = i.tenant_id` trong điều kiện nối."
      en: "`i.tenant_id = 2` filters only `invoices`; `payments` still matches by invoice number at every tenant, because invoice numbers 1–4 repeat at all three sellers. The query raises no error: a one-column join is valid SQL, and the foreign key is checked only on writes. In the lab, seller 2's 4 invoices each match 3 payments, giving 4 × 3 = 12 rows instead of 4. The fix is `p.tenant_id = i.tenant_id` in the join condition."
---
## Mở bài

Một sáng, người bán Minh Tea gọi lên: báo cáo thu tiền của họ có những khoản không phải của họ. Không ai đột nhập cả, chỉ là một phép nối thiếu một vế. Bài này gom ba lớp bảo vệ của mô hình pool vào một chỗ và chỉ đường tới các bài đào sâu từng lớp.

## Ý chính

Trong pool, ba lớp giữ dữ liệu các khách tách nhau, và mỗi lớp chặn một loại lỗi. **Câu lọc**: mọi câu nhắc tới `tenant_id`, kể cả trong điều kiện nối, nếu không thì đọc nhầm. **Khóa**: `tenant_id` đầu khóa chính, khóa ngoại ghép và luật duy nhất theo tenant, để database từ chối ghi sai. **Chính sách**: bảo mật theo dòng thêm điều kiện tenant vào mọi câu, làm lưới khi một câu quên lọc.

**Thứ tự dựng**: khóa trước, vì sửa khóa chính và khóa ngoại khi bảng đã đầy dữ liệu là việc lớn nhất (thêm `tenant_id` vào khóa phải dựng lại index và kiểm lại mọi tham chiếu). Câu lọc đi cùng từng câu SQL ngay từ đầu, và index có `tenant_id` đứng đầu giữ chúng nhanh. Chính sách theo dòng bật sau cùng, khi ứng dụng đã đặt ngữ cảnh khách ở mọi yêu cầu; bật sớm hơn thì câu nào thiếu ngữ cảnh cũng ra 0 dòng, rất khó dò.

**Kiểm từng lớp, mỗi lần đổi cấu trúc**: mỗi lớp có một phép kiểm tự động. Câu lọc: chạy cùng một câu với hai tenant khác nhau và so kết quả, không được có dòng chung. Khóa: đọc `pg_constraint` tìm khóa ngoại thiếu `tenant_id` (bài `e-ds-l2-06`). Chính sách: đọc `pg_class` tìm bảng có `tenant_id` mà chưa bật bảo mật theo dòng, như ví dụ cuối phần Ví dụ. Cả ba đều rẻ và chạy được trong CI.

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
- `e-bp-m39`: tenantId đứng đầu bộ lọc, index và shard key

**Khóa**: chặn ghi sai.

- `e-ds-l2-06`
- `e-ds-l2-07`
- `e-dy-l3-14`

**Chính sách**: lưới khi câu quên lọc.

- `e-pg-l5-10`
- `e-pg-l5-19`
- `e-pg-l5-20`
- `e-bp-x08`: view trên bảng có RLS dùng security_invoker
- `e-bp-s10`: tenant_id mọi nơi và RLS có FORCE
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

Hình từng bước cuối mục này dựng ba lớp theo đúng thứ tự trên, mỗi lớp cạnh loại lỗi nó chặn.

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

Lớp chính sách: bảng nào chưa bật bảo mật theo dòng? Cả hai bảng ở đây đều chưa, nên một câu quên lọc vẫn đọc được mọi khách; bài `e-pg-l5-10` bật nó.

```sql
SELECT relname,
  relrowsecurity AS rls_on
FROM pg_class
WHERE relname IN
  ('invoices', 'payments')
ORDER BY relname;
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
-- ERROR 23503: no invoice 9 (seller 1)
INSERT INTO payments
  (tenant_id, id, invoice_id, paid)
VALUES (1, 5, 9, 10);
```

Lỗi này là tin tốt: database chặn ngay lúc ghi, thay vì để một báo cáo sai lộ ra nhiều tháng sau, khi đã khó biết dòng nào thuộc về ai.

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

**Build order**: keys first, because changing primary and foreign keys once a table is full is the biggest job (adding `tenant_id` to a key rebuilds its index and re-checks every reference). Filters come with every SQL query from day one, and an index that leads with `tenant_id` keeps them fast. Row-level security goes on last, once the app sets the tenant context on every request; turned on earlier, any query without the context returns 0 rows, which is hard to trace.

**Check each layer on every schema change**: each layer has an automatic check. Filters: run the same query as two different tenants and compare, with no row in common. Keys: read `pg_constraint` for foreign keys without `tenant_id` (lesson `e-ds-l2-06`). Policies: read `pg_class` for tables that carry `tenant_id` but have row-level security off, as the last example shows. All three are cheap and can run in CI.

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
- `e-bp-m39`: tenantId leads filters, indexes and shard keys

**Keys**: stop wrong writes.

- `e-ds-l2-06`
- `e-ds-l2-07`
- `e-dy-l3-14`

**Policies**: the net for a query that forgets its filter.

- `e-pg-l5-10`
- `e-pg-l5-19`
- `e-pg-l5-20`
- `e-bp-x08`: views over RLS tables use security_invoker
- `e-bp-s10`: tenant_id everywhere, RLS forced
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

The step-through figure at the end of this section builds the three layers in that order, each beside the kind of mistake it stops.

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

The policy layer: which tables have row-level security off? Both tables here do, so a query that forgets its filter still reads every tenant; lesson `e-pg-l5-10` turns it on.

```sql
SELECT relname,
  relrowsecurity AS rls_on
FROM pg_class
WHERE relname IN
  ('invoices', 'payments')
ORDER BY relname;
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
-- ERROR 23503: no invoice 9 (seller 1)
INSERT INTO payments
  (tenant_id, id, invoice_id, paid)
VALUES (1, 5, 9, 10);
```

This error is good news: the database stops the write at once, instead of letting a wrong report surface months later, when it is hard to tell which row belongs to whom.

## Recap

- A pool has three layers: query filters (join conditions included), keys with `tenant_id`, row policies; each layer stops one kind of mistake.
- Join two tenant tables on both columns; without the `tenant_id` term rows multiply across tenants.
- Foreign key and unique checks do not go through the policy, so the key layer is still needed with row-level security on.
- The topic map is in the Key idea; go on with `e-ds-l4-10`, then the capstone `e-ds-l4-11` and, at platform level, `e-ds-l5-11`.
