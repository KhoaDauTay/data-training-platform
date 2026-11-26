---
id: e-ds-l2-02
engine: design
level: L2
module: er
title: Thực thể yếu, tổng quát hóa và mô hình EER
title_en: Weak entities, generalisation and the EER model
kind: concept
runtime: browser
minutes: 15
figures: [{ name: ds-er-weak-isa, at: idea }, { name: ds-er-to-tables, at: example, variant: weak }, { name: ds-er-weak-isa, at: example, variant: isa }]
objectives:
  - vi: Nhận ra thực thể yếu và đưa nó lên bảng với khóa gồm khóa của chủ cộng khóa bộ phận.
    en: Spot a weak entity and map it to a table keyed by its owner's key plus a partial key.
  - vi: Phân biệt chuyên biệt hóa rời nhau hay chồng nhau, toàn phần hay bộ phận.
    en: Tell disjoint from overlapping and total from partial specialisation.
  - vi: Chọn một trong ba cách đưa cây cha - con lên bảng và biết giới hạn của `INHERITS`.
    en: Pick one of three ways to map a supertype hierarchy to tables and know the limits of `INHERITS`.
requires: [e-ds-l2-01]
sources:
  - https://doi.org/10.1145/320434.320440
  - https://www.postgresql.org/docs/18/ddl-inherit.html
  - https://www.postgresql.org/docs/18/ddl-constraints.html
lab:
  setup: |
    CREATE TABLE accounts (
      id int PRIMARY KEY,
      owner text NOT NULL,
      kind text NOT NULL CHECK (kind IN ('saving', 'checking'))
    );
    INSERT INTO accounts VALUES (1, 'An', 'saving'), (2, 'Binh', 'checking'), (3, 'Chi', 'saving');
  steps:
    - task:
        vi: "Tài khoản tiết kiệm là một loại con của `accounts` và có thêm lãi suất. Tạo bảng `saving_accounts`: `id int` vừa là khóa chính vừa trỏ tới `accounts (id)`, `rate numeric(5,2)` không null. Đừng đặt tên ràng buộc."
        en: "A saving account is a subtype of `accounts` with an extra interest rate. Create table `saving_accounts`: `id int` that is both the primary key and points to `accounts (id)`, and `rate numeric(5,2)` not null. Do not name the constraints."
      solution: CREATE TABLE saving_accounts (id int PRIMARY KEY REFERENCES accounts (id), rate numeric(5,2) NOT NULL)
      check: catalog
      hint:
        vi: "Một cột có thể mang cả `PRIMARY KEY` lẫn `REFERENCES accounts (id)`."
        en: "One column can carry both `PRIMARY KEY` and `REFERENCES accounts (id)`."
    - task:
        vi: "Ghi lãi suất 4.5 cho tài khoản số 1."
        en: "Record an interest rate of 4.5 for account 1."
      solution: INSERT INTO saving_accounts VALUES (1, 4.5)
      after: SELECT a.id, a.owner, s.rate FROM accounts a JOIN saving_accounts s ON s.id = a.id ORDER BY a.id
      check: rows
      ordered: true
      hint:
        vi: "`INSERT INTO saving_accounts VALUES (1, 4.5)`; lab đọc lại phép nối cha - con để chấm."
        en: "`INSERT INTO saving_accounts VALUES (1, 4.5)`; the lab reads the parent-child join back to grade it."
    - task:
        vi: "Khóa ngoại chỉ giữ một chiều. Tìm các tài khoản loại `saving` chưa có dòng trong `saving_accounts`: trả `id`, xếp tăng dần."
        en: "The foreign key only holds one way. Find the `saving` accounts with no row in `saving_accounts`: return `id`, ascending."
      solution: SELECT a.id FROM accounts a WHERE a.kind = 'saving' AND NOT EXISTS (SELECT 1 FROM saving_accounts s WHERE s.id = a.id) ORDER BY a.id
      check: rows
      ordered: true
      hint:
        vi: "Lọc `kind = 'saving'` rồi phản nối bằng `NOT EXISTS`."
        en: "Filter `kind = 'saving'`, then anti-join with `NOT EXISTS`."
quiz:
  - q:
      vi: "Dòng hóa đơn được đánh số 1, 2, 3 lại từ đầu trong mỗi hóa đơn. Khóa của bảng dòng hóa đơn là gì?"
      en: "Invoice lines are numbered 1, 2, 3 again inside every invoice. What is the key of the invoice line table?"
    options:
      - { vi: "`line_no` một mình", en: "`line_no` alone" }
      - { vi: "(`invoice_id`, `line_no`): khóa của chủ cộng khóa bộ phận", en: "(`invoice_id`, `line_no`): the owner's key plus the partial key" }
      - { vi: "Không cần khóa, vì dòng hóa đơn là thực thể yếu", en: "No key is needed, because an invoice line is a weak entity" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì `line_no` trông như một mã, nhưng nó chỉ duy nhất trong một hóa đơn: hai hóa đơn đều có dòng 1. Thực thể yếu được nhận diện qua chủ của nó, nên khóa phải gồm `invoice_id`."
      en: "It sounds right because `line_no` looks like an id, but it is unique only within one invoice: two invoices both have line 1. A weak entity is identified through its owner, so the key must include `invoice_id`."
  - q:
      vi: "Bạn dùng `CREATE TABLE companies (...) INHERITS (parties)`. `parties` có khóa chính `id`. Điều gì đúng?"
      en: "You use `CREATE TABLE companies (...) INHERITS (parties)`. `parties` has primary key `id`. What is true?"
    options:
      - { vi: "`id` vẫn duy nhất trên cả cha lẫn con", en: "`id` stays unique across parent and child" }
      - { vi: "Khóa chính không được kế thừa: con có thể trùng `id` với cha, và khóa ngoại trỏ tới `parties` không thấy dòng của con", en: "The primary key is not inherited: the child can repeat a parent `id`, and a foreign key to `parties` does not see the child's rows" }
      - { vi: "Postgres cấm `INHERITS` trên bảng có khóa chính", en: "Postgres forbids `INHERITS` on a table with a primary key" }
    answer: 1
    trap: 0
    why:
      vi: "Nhiều người nghĩ kế thừa bảng là cách tự nhiên để vẽ EER. Thật ra theo tài liệu Postgres, index, `UNIQUE` và khóa ngoại chỉ áp lên một bảng, không lan sang con. Bảng cha dùng chung khóa với bảng con (khóa chính đồng thời là khóa ngoại) giữ được luật."
      en: "Many people think table inheritance is the natural way to draw EER. In fact, per the Postgres docs, indexes, `UNIQUE` and foreign keys apply to one table only, not to its children. A shared-key design (the primary key is also the foreign key) keeps the rules."
---
## Mở bài

Một dòng hóa đơn không tự đứng được: "dòng số 2" chỉ có nghĩa khi biết của hóa đơn nào. Còn khách hàng có thể là cá nhân hoặc doanh nghiệp, chung nhiều thứ nhưng khác vài thứ. Mô hình ER mở rộng (EER) có từ vựng cho cả hai trường hợp này.

## Ý chính

**Thực thể yếu** không có khóa đủ để tự phân biệt; nó được nhận diện qua một thực thể chủ, bằng một **mối quan hệ định danh**. Phần khóa riêng của nó gọi là **khóa bộ phận** (số dòng trong hóa đơn). Lên bảng, khóa chính = khóa của chủ + khóa bộ phận, khóa ngoại tới chủ thường kèm `ON DELETE CASCADE`: chủ mất thì phần phụ thuộc cũng mất. Thực thể yếu luôn tham gia toàn phần.

**Chuyên biệt hóa** chia một tập thực thể cha thành các tập con có thuộc tính riêng; **tổng quát hóa** là chiều ngược lại, gom các tập giống nhau thành cha. Hai câu hỏi định hình cây: **rời nhau** hay **chồng nhau** (một thực thể có thể thuộc hai con không), và **toàn phần** hay **bộ phận** (mọi cha có phải thuộc một con không). **Tổng hợp** (aggregation) coi cả một mối quan hệ như một thực thể để nó tham gia mối quan hệ khác.

Đưa cây cha - con lên bảng có ba cách. Một bảng với cột loại và `CHECK`: đơn giản, nhưng nhiều cột NULL. Mỗi con một bảng đủ cột: không NULL, nhưng truy vấn "mọi tài khoản" phải `UNION`. Bảng cha chung cộng bảng con có khóa chính đồng thời là khóa ngoại tới cha: chuẩn nhất, phải JOIN khi đọc. Postgres có `INHERITS`, nhưng `UNIQUE`, khóa chính và khóa ngoại không lan qua cây, nên ít dùng cho mô hình dữ liệu.

Hình từng bước cuối mục này vẽ cả hai: dòng hóa đơn mượn khóa của hóa đơn, rồi cây xe đưa lên bảng bằng bảng cha chung và hai bảng con.

## Ví dụ

Thực thể yếu: dòng hóa đơn, khóa gồm hóa đơn và số dòng.

```sql
CREATE TABLE ex_invoice (id int PRIMARY KEY, issued_on date NOT NULL);
CREATE TABLE ex_invoice_line (
  invoice_id int REFERENCES ex_invoice (id) ON DELETE CASCADE,
  line_no int,
  amount numeric(10,2) NOT NULL,
  PRIMARY KEY (invoice_id, line_no)
);
INSERT INTO ex_invoice VALUES (1, '2026-10-01'), (2, '2026-10-02');
INSERT INTO ex_invoice_line VALUES (1, 1, 100), (1, 2, 40), (2, 1, 75);
SELECT invoice_id, line_no, amount FROM ex_invoice_line ORDER BY invoice_id, line_no;
```

Hai hóa đơn đều có dòng 1; khóa ghép không bị trùng. Xóa chủ, các dòng đi theo:

```sql
DELETE FROM ex_invoice WHERE id = 1;
SELECT count(*) AS lines_left FROM ex_invoice_line;
```

Cách một bảng cho cây rời nhau: cột `kind` cộng `CHECK` giữ đúng cột nào thuộc loại nào.

```sql
CREATE TABLE ex_vehicle (
  id int PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('car', 'truck')),
  seats int,
  payload_kg int,
  CHECK ((kind = 'car' AND payload_kg IS NULL) OR (kind = 'truck' AND seats IS NULL))
);
INSERT INTO ex_vehicle VALUES (1, 'car', 5, NULL), (2, 'truck', NULL, 3000), (3, 'car', 7, NULL);
SELECT kind, count(*) AS vehicles FROM ex_vehicle GROUP BY kind ORDER BY kind;
```

Hình thứ nhất cuối mục này vẽ `ex_invoice_line` thành bảng có khóa ghép `(invoice_id, line_no)`. Hình thứ hai vẽ cùng cây xe theo cách bảng cha chung cộng bảng con, nơi khóa chính của bảng con cũng là khóa ngoại tới cha, thay cho một bảng `ex_vehicle` ở trên.

## Lỗi hay gặp

Dùng `INHERITS` và tin rằng khóa chính phủ cả cây.

```sql
-- WRONG: the child table repeats id 1; the parent's primary key does not cover it
CREATE TABLE ex_party (id int PRIMARY KEY, name text);
CREATE TABLE ex_company (tax_code text) INHERITS (ex_party);
INSERT INTO ex_party VALUES (1, 'An');
INSERT INTO ex_company VALUES (1, 'Acme', '0101');
SELECT count(*) AS rows_with_id_1 FROM ex_party WHERE id = 1;
```

```sql
-- FIX: a shared key; the subtype's primary key is also a foreign key to the supertype
CREATE TABLE ex_party2 (id int PRIMARY KEY, name text);
CREATE TABLE ex_company2 (id int PRIMARY KEY REFERENCES ex_party2 (id), tax_code text);
INSERT INTO ex_party2 VALUES (1, 'Acme');
INSERT INTO ex_company2 VALUES (1, '0101');
SELECT count(*) AS rows_with_id_1 FROM ex_party2 WHERE id = 1;
```

Câu sai ra 2: đọc bảng cha cũng đọc bảng con, và hai dòng cùng `id` 1. Câu sửa ra 1.

Cách một bảng chỉ an toàn khi có `CHECK`: thiếu nó, một xe tải có số ghế vẫn lọt vào.

```sql
-- ERROR 23514: new row for relation "ex_vehicle" violates check constraint "ex_vehicle_check"
INSERT INTO ex_vehicle VALUES (9, 'truck', 4, 1000);
```

## Thực hành

Lab tạo bảng con dùng chung khóa với `accounts`, ghi một dòng, rồi tìm các tài khoản tiết kiệm còn thiếu dòng con: khóa ngoại không ép được mức tham gia toàn phần từ phía cha.

## Tóm tắt

- Thực thể yếu: khóa = khóa của chủ + khóa bộ phận, khóa ngoại tới chủ thường `ON DELETE CASCADE`.
- Chuyên biệt hóa: rời nhau hay chồng nhau, toàn phần hay bộ phận.
- Ba cách lên bảng: một bảng + `CHECK`, mỗi con một bảng, bảng cha + bảng con dùng chung khóa.
- `INHERITS` không kế thừa `UNIQUE`, khóa chính, khóa ngoại; ưu tiên cách dùng chung khóa.

# EN

## Opening

An invoice line cannot stand alone: "line 2" only means something once you know which invoice. A customer can be a person or a company, sharing many things and differing in a few. The enhanced ER model (EER) has words for both cases.

## Key idea

A **weak entity** has no key strong enough to tell it apart by itself; it is identified through an owner entity, by an **identifying relationship**. Its own part of the key is the **partial key** (the line number within an invoice). On tables, primary key = the owner's key + the partial key, and the foreign key to the owner usually carries `ON DELETE CASCADE`: when the owner goes, its dependants go too. A weak entity always takes part totally.

**Specialisation** splits a parent entity set into subsets with their own attributes; **generalisation** goes the other way, gathering similar sets under a parent. Two questions shape the tree: **disjoint** or **overlapping** (can one entity belong to two children), and **total** or **partial** (must every parent belong to some child). **Aggregation** treats a whole relationship as an entity so that it can take part in another relationship.

There are three ways to put the hierarchy into tables. One table with a type column and a `CHECK`: simple, but many NULL columns. One full table per child: no NULLs, but "every account" needs a `UNION`. A shared parent table plus child tables whose primary key is also a foreign key to the parent: the cleanest, at the price of a JOIN on read. Postgres has `INHERITS`, but `UNIQUE`, primary keys and foreign keys do not spread across the tree, so it is rarely used for data models.

The step-through figure at the end of this section draws both: an invoice line borrowing its invoice's key, then the vehicle tree on tables as a shared parent plus two subtype tables.

## Example

A weak entity: invoice lines, keyed by invoice and line number.

```sql
CREATE TABLE ex_invoice (id int PRIMARY KEY, issued_on date NOT NULL);
CREATE TABLE ex_invoice_line (
  invoice_id int REFERENCES ex_invoice (id) ON DELETE CASCADE,
  line_no int,
  amount numeric(10,2) NOT NULL,
  PRIMARY KEY (invoice_id, line_no)
);
INSERT INTO ex_invoice VALUES (1, '2026-10-01'), (2, '2026-10-02');
INSERT INTO ex_invoice_line VALUES (1, 1, 100), (1, 2, 40), (2, 1, 75);
SELECT invoice_id, line_no, amount FROM ex_invoice_line ORDER BY invoice_id, line_no;
```

Both invoices have a line 1; the composite key does not clash. Delete the owner and its lines follow:

```sql
DELETE FROM ex_invoice WHERE id = 1;
SELECT count(*) AS lines_left FROM ex_invoice_line;
```

The one-table mapping for a disjoint tree: a `kind` column plus a `CHECK` keeps each column with its own type.

```sql
CREATE TABLE ex_vehicle (
  id int PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('car', 'truck')),
  seats int,
  payload_kg int,
  CHECK ((kind = 'car' AND payload_kg IS NULL) OR (kind = 'truck' AND seats IS NULL))
);
INSERT INTO ex_vehicle VALUES (1, 'car', 5, NULL), (2, 'truck', NULL, 3000), (3, 'car', 7, NULL);
SELECT kind, count(*) AS vehicles FROM ex_vehicle GROUP BY kind ORDER BY kind;
```

The first figure at the end of this section draws `ex_invoice_line` as a table with the composite key `(invoice_id, line_no)`. The second draws the same vehicle tree the shared-parent way, where each subtype table's primary key is also a foreign key to the parent, instead of the one table `ex_vehicle` above.

## Common mistakes

Using `INHERITS` and trusting the primary key to cover the whole tree.

```sql
-- WRONG: the child table repeats id 1; the parent's primary key does not cover it
CREATE TABLE ex_party (id int PRIMARY KEY, name text);
CREATE TABLE ex_company (tax_code text) INHERITS (ex_party);
INSERT INTO ex_party VALUES (1, 'An');
INSERT INTO ex_company VALUES (1, 'Acme', '0101');
SELECT count(*) AS rows_with_id_1 FROM ex_party WHERE id = 1;
```

```sql
-- FIX: a shared key; the subtype's primary key is also a foreign key to the supertype
CREATE TABLE ex_party2 (id int PRIMARY KEY, name text);
CREATE TABLE ex_company2 (id int PRIMARY KEY REFERENCES ex_party2 (id), tax_code text);
INSERT INTO ex_party2 VALUES (1, 'Acme');
INSERT INTO ex_company2 VALUES (1, '0101');
SELECT count(*) AS rows_with_id_1 FROM ex_party2 WHERE id = 1;
```

The wrong query returns 2: reading the parent also reads the child, and two rows share `id` 1. The fix returns 1.

The one-table mapping is only safe with its `CHECK`: without it a truck with seats slips in.

```sql
-- ERROR 23514: new row for relation "ex_vehicle" violates check constraint "ex_vehicle_check"
INSERT INTO ex_vehicle VALUES (9, 'truck', 4, 1000);
```

## Practice

The lab creates a child table sharing its key with `accounts`, writes one row, then finds the saving accounts still missing their child row: a foreign key cannot force total participation from the parent's side.

## Recap

- Weak entity: key = the owner's key + the partial key, foreign key to the owner usually `ON DELETE CASCADE`.
- Specialisation: disjoint or overlapping, total or partial.
- Three mappings: one table + `CHECK`, one table per child, parent table + child tables sharing the key.
- `INHERITS` does not pass on `UNIQUE`, primary keys or foreign keys; prefer the shared-key design.
