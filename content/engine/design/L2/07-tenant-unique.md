---
id: e-ds-l2-07
engine: design
level: L2
module: er-mapping
title: Duy nhất theo từng khách hàng - UNIQUE (tenant_id, email)
title_en: Unique per tenant - UNIQUE (tenant_id, email)
kind: lab
runtime: browser
minutes: 16
figures: [{ name: pg-tenancy-models, at: idea, step: 3 }]
objectives:
  - vi: Viết luật duy nhất trong phạm vi một khách hàng thay vì cho cả hệ thống.
    en: Write a uniqueness rule scoped to one tenant instead of the whole system.
  - vi: Làm luật đó không phân biệt hoa thường bằng index duy nhất trên biểu thức.
    en: Make that rule case-insensitive with a unique index on an expression.
  - vi: Dùng index duy nhất một phần cho giá trị không bắt buộc.
    en: Use a partial unique index for an optional value.
requires: [e-ds-l2-06]
sources:
  - url: https://www.postgresql.org/docs/18/ddl-constraints.html#DDL-CONSTRAINTS-UNIQUE-CONSTRAINTS
    title: "Constraints › Unique Constraints"
  - url: https://www.postgresql.org/docs/18/indexes-unique.html
    title: "Unique Indexes"
  - url: https://www.postgresql.org/docs/18/indexes-partial.html
    title: "Partial Indexes"
  - url: https://www.postgresql.org/docs/18/ddl-rowsecurity.html
    title: "Row Security Policies"
lab:
  setup: |
    CREATE TABLE sellers (id int PRIMARY KEY, name text NOT NULL);
    INSERT INTO sellers VALUES (1, 'Lan Silk'), (2, 'Minh Tea'), (3, 'Hoa Lamp');
    CREATE TABLE shoppers (
      tenant_id int NOT NULL REFERENCES sellers (id),
      id int NOT NULL,
      email text NOT NULL,
      tax_code text NOT NULL DEFAULT '',
      PRIMARY KEY (tenant_id, id)
    );
    INSERT INTO shoppers VALUES
      (1, 1, 'an@mail.vn', ''), (1, 2, 'binh@mail.vn', '0101'), (1, 3, 'dung@mail.vn', ''),
      (2, 1, 'an@mail.vn', '0101'), (2, 2, 'chi@mail.vn', ''),
      (3, 1, 'An@Mail.vn', ''), (3, 2, 'giang@mail.vn', '0202');
  steps:
    - task:
        vi: "Mỗi người bán chỉ có một người mua với mỗi email: thêm ràng buộc duy nhất trên `shoppers (tenant_id, email)`. Đừng đặt tên ràng buộc."
        en: "Each seller has one shopper per email: add a unique constraint on `shoppers (tenant_id, email)`. Do not name the constraint."
      solution: ALTER TABLE shoppers ADD UNIQUE (tenant_id, email)
      check: catalog
      hint:
        vi: "`ALTER TABLE shoppers ADD UNIQUE (tenant_id, email)`: `tenant_id` đầu, như khóa chính."
        en: "`ALTER TABLE shoppers ADD UNIQUE (tenant_id, email)`: `tenant_id` first, like the primary key."
    - task:
        vi: "`An@mail.vn` và `an@mail.vn` là một người. Tạo index duy nhất tên `shoppers_email_ci` trên `shoppers (tenant_id, lower(email))`."
        en: "`An@mail.vn` and `an@mail.vn` are one person. Create a unique index named `shoppers_email_ci` on `shoppers (tenant_id, lower(email))`."
      solution: CREATE UNIQUE INDEX shoppers_email_ci ON shoppers (tenant_id, lower(email))
      check: catalog
      hint:
        vi: "`CREATE UNIQUE INDEX shoppers_email_ci ON shoppers (tenant_id, lower(email))`: biểu thức đứng ngay trong danh sách cột."
        en: "`CREATE UNIQUE INDEX shoppers_email_ci ON shoppers (tenant_id, lower(email))`: the expression sits right in the column list."
    - task:
        vi: "Mã số thuế không bắt buộc (`''` = chưa có), nhưng đã có thì không trùng trong một người bán. Tạo index duy nhất tên `shoppers_tax` trên `shoppers (tenant_id, tax_code)`, chỉ cho các dòng `tax_code <> ''`."
        en: "A tax code is optional (`''` = none yet), but once given it is unique within a seller. Create a unique index named `shoppers_tax` on `shoppers (tenant_id, tax_code)`, only for rows with `tax_code <> ''`."
      solution: CREATE UNIQUE INDEX shoppers_tax ON shoppers (tenant_id, tax_code) WHERE tax_code <> ''
      check: catalog
      hint:
        vi: "Index một phần: thêm `WHERE tax_code <> ''` sau danh sách cột. Không có nó thì hai dòng `''` của người bán 1 làm lệnh lỗi 23505."
        en: "A partial index: add `WHERE tax_code <> ''` after the column list. Without it, seller 1's two `''` rows make the command fail with 23505."
quiz:
  - q:
      vi: "Chợ có 300 người bán. Một bạn đề xuất `UNIQUE (email)` trên bảng người mua cho chắc. Chuyện gì xảy ra khi người mua `an@mail.vn` của Lan Silk đăng ký ở Minh Tea?"
      en: "The market has 300 sellers. Someone proposes `UNIQUE (email)` on the shopper table to be safe. What happens when Lan Silk's shopper `an@mail.vn` signs up at Minh Tea?"
    options:
      - { vi: "Không sao: luật càng chặt thì dữ liệu của mọi người bán càng an toàn", en: "Nothing bad: the stricter the rule, the safer every seller's data is" }
      - { vi: "Bị từ chối (23505), và lỗi lộ rằng email đã có ở người bán khác", en: "Refused (23505), and the error reveals the email exists at another seller" }
      - { vi: "Được nhận, vì mỗi người bán có tenant_id khác nhau", en: "It is accepted, because each seller has a different tenant_id" }
    answer: 1
    trap: 0
    why:
      vi: "\"Luật càng chặt càng an toàn\" nghe hợp lý, nhưng `UNIQUE (email)` xét cả 300 người bán chung một lượt: `an@mail.vn` đã có ở Lan Silk, nên lần đăng ký ở Minh Tea bị từ chối với lỗi 23505 (trùng giá trị duy nhất), dù đó là một người mua hợp lệ. Lỗi ấy còn là kênh rò rỉ: phép kiểm duy nhất không đi qua bảo mật theo dòng (row-level security, RLS), nên Minh Tea biết email đã có ở người bán khác. `tenant_id` khác nhau không cứu được vì nó không nằm trong luật; `UNIQUE (tenant_id, email)` mới đúng phạm vi."
      en: "\"The stricter the safer\" sounds right, but `UNIQUE (email)` checks all 300 sellers at once: `an@mail.vn` already exists at Lan Silk, so the sign-up at Minh Tea is refused with error 23505 (duplicate unique value), even though the shopper is valid. The error also leaks: unique checks do not go through row-level security (RLS), so Minh Tea learns the email exists at another seller. Different `tenant_id` values do not help because that column is not in the rule; `UNIQUE (tenant_id, email)` has the right scope."
  - q:
      vi: "Vì sao luật mã số thuế cần `WHERE tax_code <> ''`?"
      en: "Why does the tax code rule need `WHERE tax_code <> ''`?"
    options:
      - { vi: "Để index nhỏ hơn, ngoài ra luật không đổi gì", en: "To make the index smaller, the rule itself is unchanged" }
      - { vi: "Vì `''` nghĩa là chưa có mã và được lặp lại", en: "Because `''` means no code yet and may repeat" }
      - { vi: "Vì index duy nhất không nhận chuỗi rỗng", en: "Because a unique index does not accept empty strings" }
    answer: 1
    trap: 0
    why:
      vi: "Nhiều người nghĩ điều kiện của index một phần (partial index) chỉ để tiết kiệm chỗ, nhưng nó đổi luật: dòng ngoài điều kiện không bị kiểm. Người bán 1 có hai người mua chưa có mã (`''`); không có điều kiện thì hai chuỗi rỗng ấy bị coi là trùng và lệnh tạo index lỗi 23505. Index duy nhất vẫn nhận chuỗi rỗng, chỉ không nhận hai chuỗi rỗng trùng nhau. Nếu ghi \"chưa có\" bằng `NULL` thay cho `''` thì không cần điều kiện, vì mặc định hai `NULL` không bị coi là trùng."
      en: "Many people think a partial index's condition only saves space, but it changes the rule: rows outside the condition are not checked. Seller 1 has two shoppers with no code yet (`''`); without the condition those two empty strings count as duplicates and creating the index fails with 23505. A unique index does accept an empty string, just not two equal ones. If \"none yet\" were stored as `NULL` instead of `''`, no condition would be needed, since by default two `NULL`s are not duplicates."
---
## Mở bài

Người mua `an@mail.vn` thích cả lụa của Lan Silk lẫn trà của Minh Tea. Nếu bảng người mua có luật email duy nhất cho cả chợ, lần đăng ký thứ hai bị từ chối, và thông báo lỗi tiết lộ cho Minh Tea rằng email này đã là khách ở đâu đó. Luật duy nhất của hệ thống nhiều khách hàng phải có cùng phạm vi với tenant.

## Ý chính

Trong mô hình pool, "duy nhất" gần như luôn có nghĩa "duy nhất trong một tenant". Viết luật ấy là đặt `tenant_id` lên đầu: `UNIQUE (tenant_id, email)`. Hai người bán có thể cùng có `an@mail.vn`; một người bán thì không thể có nó hai lần. Index đứng sau luật cũng bắt đầu bằng `tenant_id`, đúng thứ tự mà mọi câu tra cứu dùng.

Nhiều người nghĩ luật toàn cục chỉ chặt hơn, không hại gì. Thật ra nó chặn khách hợp lệ, và tài liệu Postgres nói rõ kiểm duy nhất, khóa chính và khóa ngoại không đi qua bảo mật theo dòng: lỗi 23505 cho người bán này biết một giá trị đã có ở người bán khác. Đó là một kênh rò rỉ, dù không ai đọc được dòng kia.

Hai biến thể hay gặp. Email không phân biệt hoa thường: index duy nhất trên biểu thức `(tenant_id, lower(email))`. Giá trị không bắt buộc ghi bằng `''`: index duy nhất một phần `WHERE tax_code <> ''`. Một luật thật sự toàn cục (một số sê-ri chỉ được một tenant đăng ký) không có chỗ trong bảng chia theo tenant; nó cần một bảng chỉ mục riêng.

**NULL không đụng nhau**: theo mặc định, hai dòng `(2, NULL)` không vi phạm `UNIQUE (tenant_id, tax_code)`, vì NULL không bằng NULL. Muốn mỗi người bán có tối đa một dòng thiếu mã số thuế, viết `UNIQUE NULLS NOT DISTINCT (tenant_id, tax_code)` (Postgres 15 trở lên). Bảng ở bài này ghi giá trị thiếu bằng `''`, nên dùng index một phần thay vào đó.

**Thêm hoặc bỏ qua, theo tenant**: `INSERT … ON CONFLICT (tenant_id, email) DO NOTHING` chỉ dùng được khi có một luật duy nhất đúng trên các cột ấy. Với index biểu thức, đích xung đột phải viết đúng biểu thức: `ON CONFLICT (tenant_id, lower(email))`. Viết `ON CONFLICT (email)` thì Postgres báo lỗi 42P10 vì không có luật nào khớp, và đó là dấu hiệu tốt: luật toàn cục đã không còn.

**Thêm luật vào bảng đang chạy**: `CREATE UNIQUE INDEX CONCURRENTLY` dựng index mà không chặn ghi. Nếu dữ liệu cũ đã có hai dòng trùng trong cùng một tenant, lệnh dừng với lỗi 23505 và để lại một index ở trạng thái INVALID, phải xóa đi rồi dựng lại. Vì vậy tìm và gộp các dòng trùng trước, bằng `GROUP BY tenant_id, lower(email) HAVING count(*) > 1`. Index trên cột trần còn có thể thành ràng buộc nhờ `ADD CONSTRAINT … UNIQUE USING INDEX`; index biểu thức thì giữ là index.

Hình từng bước ở cuối mục này so ba cách chia khách và mở ở bước Pool; khi nhiều khách dùng chung bảng, mỗi ràng buộc duy nhất phải bắt đầu bằng `tenant_id`.

## Cú pháp

```sql
ALTER TABLE t
  ADD UNIQUE (tenant_id, email);
CREATE UNIQUE INDEX name
  ON t (tenant_id, lower(email));
CREATE UNIQUE INDEX name
  ON t (tenant_id, code)
  WHERE code <> '';
UNIQUE NULLS NOT DISTINCT
  (tenant_id, code)
```

- `tenant_id` đứng đầu mọi luật duy nhất của bảng thuộc tenant.
- Index trên biểu thức chỉ giúp câu dùng đúng biểu thức đó: tra bằng `lower(email)`.
- `NULLS NOT DISTINCT` (Postgres 15+) coi hai `NULL` là trùng; mặc định chúng không trùng.

## Ví dụ

Cùng một email ở ba người bán là ba người mua hợp lệ:

```sql
SELECT tenant_id, id, email
FROM shoppers
WHERE lower(email) = 'an@mail.vn'
ORDER BY tenant_id;
```

Luật theo tenant nhận email lặp ở tenant khác:

```sql
CREATE TABLE ex_buyers (
  tenant_id int NOT NULL,
  email text NOT NULL,
  UNIQUE (tenant_id, email)
);
INSERT INTO ex_buyers
VALUES (1, 'an@mail.vn'),
       (2, 'an@mail.vn');
SELECT * FROM ex_buyers
ORDER BY tenant_id;
```

## Lỗi hay gặp

Luật toàn cục chặn khách của người bán thứ hai:

```sql
CREATE TABLE ex_global (
  tenant_id int NOT NULL,
  email text NOT NULL UNIQUE
);
INSERT INTO ex_global
VALUES (1, 'an@mail.vn');
-- ERROR 23505: taken at seller 1
INSERT INTO ex_global
VALUES (2, 'an@mail.vn');
```

Luật phân biệt hoa thường để lọt một người thành hai:

```sql
-- WRONG: case makes a second shopper
CREATE TABLE ex_case (
  tenant_id int NOT NULL,
  email text NOT NULL,
  UNIQUE (tenant_id, email)
);
INSERT INTO ex_case
VALUES (1, 'an@mail.vn');
INSERT INTO ex_case
VALUES (1, 'An@mail.vn');
SELECT count(*) AS shoppers
FROM ex_case;
```

```sql
-- FIX: unique on lower(email)
CREATE TABLE ex_case2 (
  tenant_id int NOT NULL,
  email text NOT NULL
);
CREATE UNIQUE INDEX ex_case2_ci
  ON ex_case2 (tenant_id, lower(email));
INSERT INTO ex_case2
VALUES (1, 'an@mail.vn');
INSERT INTO ex_case2
VALUES (1, 'An@mail.vn')
ON CONFLICT (tenant_id, lower(email))
DO NOTHING;
SELECT count(*) AS shoppers
FROM ex_case2;
```

Câu sai đếm 2 người mua, câu sửa đếm 1. Luật mã số thuế không có điều kiện thì không tạo được, vì người bán 1 đã có hai dòng `''`:

```sql
-- ERROR 23505: two '' rows at seller 1
CREATE UNIQUE INDEX ex_tax
  ON shoppers (tenant_id, tax_code);
```

## Thực hành

Ba bước, đều chấm bằng catalog: luật email theo người bán, luật email không phân biệt hoa thường, và luật mã số thuế một phần. Mỗi luật sửa một lỗi vừa thấy ở phần trên: luật toàn cục chặn khách hợp lệ, chữ hoa làm một người thành hai, và chuỗi rỗng đụng nhau dù không ai nhập mã. Sau đó là hai câu hỏi về phạm vi của luật.

## Tóm tắt

- "Duy nhất" trong pool là duy nhất trong một tenant: `UNIQUE (tenant_id, email)`.
- Luật toàn cục chặn khách hợp lệ và để lỗi 23505 tiết lộ dữ liệu của tenant khác.
- Không phân biệt hoa thường: index trên `(tenant_id, lower(email))`; giá trị không bắt buộc: index một phần.
- Đọc tiếp: thẻ `e-bp-s07` (`NULLS NOT DISTINCT`), `e-ds-l2-06` (khóa ghép) và `e-ds-l4-09` (bản đồ chủ đề).

# EN

## Opening

Shopper `an@mail.vn` likes both Lan Silk's silk and Minh Tea's tea. If the shopper table has one unique email rule for the whole market, the second sign-up is refused, and the error tells Minh Tea that this email is already a customer somewhere. A uniqueness rule in a multi-tenant system must have the same scope as the tenant.

## Key idea

In the pool model, "unique" almost always means "unique within one tenant". Writing that rule means putting `tenant_id` first: `UNIQUE (tenant_id, email)`. Two sellers can both have `an@mail.vn`; one seller cannot have it twice. The index behind the rule also starts with `tenant_id`, the order every lookup uses.

Many people think a global rule is only stricter and does no harm. In fact it blocks valid customers, and the Postgres docs say plainly that unique, primary key and foreign key checks do not go through row-level security: error 23505 tells this seller that a value exists at another seller. That is a leak channel, even though no one can read the other row.

Two common variants. Case-insensitive email: a unique index on the expression `(tenant_id, lower(email))`. An optional value written as `''`: a partial unique index `WHERE tax_code <> ''`. A truly global rule (a serial number only one tenant may register) has no home in a table split by tenant; it needs a separate lookup table.

**NULLs never collide**: by default two rows `(2, NULL)` do not break `UNIQUE (tenant_id, tax_code)`, because NULL is not equal to NULL. To allow at most one row without a tax code per seller, write `UNIQUE NULLS NOT DISTINCT (tenant_id, tax_code)` (Postgres 15 and later). This lesson's table records a missing value as `''`, so it uses a partial index instead.

**Upserts per tenant**: `INSERT … ON CONFLICT (tenant_id, email) DO NOTHING` only works when there is a unique rule on exactly those columns. With an expression index, the conflict target must spell out the expression: `ON CONFLICT (tenant_id, lower(email))`. Writing `ON CONFLICT (email)` makes Postgres fail with 42P10, as no rule matches, and that is a good sign: the global rule is gone.

**Adding the rule to a live table**: `CREATE UNIQUE INDEX CONCURRENTLY` builds the index without blocking writes. If the old data already holds two duplicate rows inside one tenant, the command stops with error 23505 and leaves an INVALID index behind, which must be dropped and built again. So find and merge the duplicates first, with `GROUP BY tenant_id, lower(email) HAVING count(*) > 1`. An index on plain columns can then become a constraint through `ADD CONSTRAINT … UNIQUE USING INDEX`; an expression index stays an index.

The step-through figure at the end of this section compares the three ways to split tenants and opens on the Pool step; when tenants share tables, every unique constraint must start with `tenant_id`.

## Syntax

```sql
ALTER TABLE t
  ADD UNIQUE (tenant_id, email);
CREATE UNIQUE INDEX name
  ON t (tenant_id, lower(email));
CREATE UNIQUE INDEX name
  ON t (tenant_id, code)
  WHERE code <> '';
UNIQUE NULLS NOT DISTINCT
  (tenant_id, code)
```

- `tenant_id` comes first in every uniqueness rule of a tenant table.
- An index on an expression only helps queries that use the same expression: look up by `lower(email)`.
- `NULLS NOT DISTINCT` (Postgres 15+) treats two `NULL` values as equal; by default they are not.

## Example

The same email at three sellers is three valid shoppers:

```sql
SELECT tenant_id, id, email
FROM shoppers
WHERE lower(email) = 'an@mail.vn'
ORDER BY tenant_id;
```

A per-tenant rule accepts the email again at another tenant:

```sql
CREATE TABLE ex_buyers (
  tenant_id int NOT NULL,
  email text NOT NULL,
  UNIQUE (tenant_id, email)
);
INSERT INTO ex_buyers
VALUES (1, 'an@mail.vn'),
       (2, 'an@mail.vn');
SELECT * FROM ex_buyers
ORDER BY tenant_id;
```

## Common mistakes

A global rule blocks the second seller's shopper:

```sql
CREATE TABLE ex_global (
  tenant_id int NOT NULL,
  email text NOT NULL UNIQUE
);
INSERT INTO ex_global
VALUES (1, 'an@mail.vn');
-- ERROR 23505: taken at seller 1
INSERT INTO ex_global
VALUES (2, 'an@mail.vn');
```

A case-sensitive rule lets one person in twice:

```sql
-- WRONG: case makes a second shopper
CREATE TABLE ex_case (
  tenant_id int NOT NULL,
  email text NOT NULL,
  UNIQUE (tenant_id, email)
);
INSERT INTO ex_case
VALUES (1, 'an@mail.vn');
INSERT INTO ex_case
VALUES (1, 'An@mail.vn');
SELECT count(*) AS shoppers
FROM ex_case;
```

```sql
-- FIX: unique on lower(email)
CREATE TABLE ex_case2 (
  tenant_id int NOT NULL,
  email text NOT NULL
);
CREATE UNIQUE INDEX ex_case2_ci
  ON ex_case2 (tenant_id, lower(email));
INSERT INTO ex_case2
VALUES (1, 'an@mail.vn');
INSERT INTO ex_case2
VALUES (1, 'An@mail.vn')
ON CONFLICT (tenant_id, lower(email))
DO NOTHING;
SELECT count(*) AS shoppers
FROM ex_case2;
```

The wrong version counts 2 shoppers, the fix counts 1. A tax code rule without a condition cannot be created, because seller 1 already has two `''` rows:

```sql
-- ERROR 23505: two '' rows at seller 1
CREATE UNIQUE INDEX ex_tax
  ON shoppers (tenant_id, tax_code);
```

## Practice

Three steps, all graded on the catalog: the per-seller email rule, the case-insensitive email rule, and the partial tax code rule. Each rule fixes a mistake shown above: the global rule blocks a valid customer, upper case turns one person into two, and empty strings collide although nobody typed a code. Then two questions on the scope of a rule.

## Recap

- "Unique" in a pool means unique within one tenant: `UNIQUE (tenant_id, email)`.
- A global rule blocks valid customers and lets error 23505 reveal another tenant's data.
- Case-insensitive: an index on `(tenant_id, lower(email))`; optional values: a partial index.
- Read next: card `e-bp-s07` (`NULLS NOT DISTINCT`), `e-ds-l2-06` (composite keys) and `e-ds-l4-09` (the topic map).
