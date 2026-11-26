---
id: e-ds-l2-01
engine: design
level: L2
module: er
title: Thực thể, thuộc tính, quan hệ và bậc
title_en: Entities, attributes, relationships and degree
kind: concept
runtime: browser
minutes: 15
figures: [{ name: ds-er-attribute-kinds, at: idea }, { name: ds-cardinality, at: example }]
objectives:
  - vi: Phân loại thuộc tính đơn, phức hợp, đa trị, dẫn xuất và thuộc tính khóa.
    en: Classify simple, composite, multivalued, derived and key attributes.
  - vi: Đọc bậc, lực lượng (1:1, 1:N, M:N) và mức tham gia của một mối quan hệ trên sơ đồ ER.
    en: Read the degree, cardinality (1:1, 1:N, M:N) and participation of a relationship on an ER diagram.
  - vi: Biến thuộc tính dẫn xuất thành cột sinh và thuộc tính đa trị thành bảng con.
    en: Turn a derived attribute into a generated column and a multivalued attribute into a child table.
requires: [e-ds-l1-02]
sources:
  - https://doi.org/10.1145/320434.320440
  - https://www.postgresql.org/docs/18/ddl-generated-columns.html
  - https://www.postgresql.org/docs/18/ddl-constraints.html
lab:
  setup: |
    CREATE TABLE customers (id int PRIMARY KEY, first_name text NOT NULL, last_name text NOT NULL);
    CREATE TABLE order_lines (
      id int PRIMARY KEY,
      customer_id int NOT NULL REFERENCES customers (id),
      qty int NOT NULL,
      unit_price numeric(10,2) NOT NULL
    );
    INSERT INTO customers VALUES (1, 'An', 'Tran'), (2, 'Binh', 'Le');
    INSERT INTO order_lines VALUES (1, 1, 2, 30.00), (2, 1, 5, 40.00), (3, 2, 1, 150.00), (4, 2, 10, 8.50);
  steps:
    - task:
        vi: "Thành tiền của một dòng là thuộc tính dẫn xuất. Thêm vào `order_lines` cột `line_total` kiểu `numeric(12,2)`, luôn tính bằng `qty * unit_price` và được lưu."
        en: "A line's total is a derived attribute. Add to `order_lines` a column `line_total` of type `numeric(12,2)`, always computed as `qty * unit_price` and stored."
      solution: ALTER TABLE order_lines ADD COLUMN line_total numeric(12,2) GENERATED ALWAYS AS (qty * unit_price) STORED
      after: SELECT id, line_total FROM order_lines ORDER BY id
      check: rows
      ordered: true
      hint:
        vi: "`ADD COLUMN … GENERATED ALWAYS AS (qty * unit_price) STORED`."
        en: "`ADD COLUMN … GENERATED ALWAYS AS (qty * unit_price) STORED`."
    - task:
        vi: "Một khách có nhiều số điện thoại: thuộc tính đa trị. Tạo bảng `customer_phones` với `customer_id int` trỏ tới `customers (id)`, `phone text`, khóa chính là cặp (`customer_id`, `phone`). Đừng đặt tên ràng buộc."
        en: "A customer has several phone numbers: a multivalued attribute. Create table `customer_phones` with `customer_id int` pointing to `customers (id)`, `phone text`, and the pair (`customer_id`, `phone`) as primary key. Do not name the constraints."
      solution: CREATE TABLE customer_phones (customer_id int REFERENCES customers (id), phone text, PRIMARY KEY (customer_id, phone))
      check: catalog
      hint:
        vi: "Khóa chính gồm hai cột: `PRIMARY KEY (customer_id, phone)` đặt cuối danh sách cột."
        en: "A two-column primary key: `PRIMARY KEY (customer_id, phone)` at the end of the column list."
    - task:
        vi: "Dùng cột vừa sinh: liệt kê `id`, `qty`, `unit_price`, `line_total` của các dòng có thành tiền trên 100, xếp theo `id`."
        en: "Use the new column: list `id`, `qty`, `unit_price`, `line_total` of the lines whose total is over 100, ordered by `id`."
      solution: SELECT id, qty, unit_price, line_total FROM order_lines WHERE line_total > 100 ORDER BY id
      check: rows
      ordered: true
      hint:
        vi: Cột sinh đọc như mọi cột khác, lọc được trong `WHERE`.
        en: A generated column reads like any other column and can be filtered in `WHERE`.
quiz:
  - q:
      vi: "Một sinh viên có nhiều email. Trên sơ đồ ER, `email` là thuộc tính gì, và lên bảng ra sao?"
      en: "A student has several emails. On the ER diagram what kind of attribute is `email`, and how does it become tables?"
    options:
      - { vi: "Thuộc tính phức hợp: tách thành nhiều cột `email1`, `email2`", en: "A composite attribute: split it into columns `email1`, `email2`" }
      - { vi: "Thuộc tính đa trị: một bảng con, mỗi email một dòng", en: "A multivalued attribute: a child table, one row per email" }
      - { vi: "Thuộc tính dẫn xuất: không cần lưu", en: "A derived attribute: no need to store it" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì vài cột là đủ cho đa số người, nhưng số email không có trần, và tìm một email phải dò mọi cột. Phức hợp là một giá trị có nhiều phần (địa chỉ = phố, thành phố); đa trị là nhiều giá trị, nên thành bảng con."
      en: "It sounds right because a few columns cover most people, but the number of emails has no ceiling and finding one email means checking every column. Composite is one value with parts (address = street, city); multivalued is several values, so it becomes a child table."
  - q:
      vi: "Mỗi đơn hàng thuộc đúng một khách, một khách có thể chưa có đơn nào. Phía đơn hàng tham gia mối quan hệ thế nào?"
      en: "Every order belongs to exactly one customer, and a customer may have no orders yet. How does the order side take part in the relationship?"
    options:
      - { vi: "Toàn phần: mọi đơn phải có khách, nên `customer_id` là `NOT NULL`", en: "Total: every order must have a customer, so `customer_id` is `NOT NULL`" }
      - { vi: "Bộ phận, vì có khách chưa có đơn", en: "Partial, because some customers have no orders" }
      - { vi: "Quan hệ M:N", en: "An M:N relationship" }
    answer: 0
    trap: 1
    why:
      vi: "Nhiều người đọc mức tham gia của cả mối quan hệ một lần. Thật ra mỗi phía có mức riêng: phía khách là bộ phận (có khách không đơn), phía đơn là toàn phần (đơn nào cũng có khách), và trên bảng toàn phần thành `NOT NULL`."
      en: "Many people read participation once for the whole relationship. In fact each side has its own: the customer side is partial (a customer with no order exists), the order side total (every order has a customer), and on tables total becomes `NOT NULL`."
---
## Mở bài

Trước khi viết một câu `CREATE TABLE`, người thiết kế cần một bức tranh: thế giới này có những thứ gì và chúng gắn với nhau ra sao. Mô hình thực thể - quan hệ (ER) của Peter Chen, công bố năm 1976, là bức tranh đó. Bài này dạy đọc và vẽ nó, rồi đưa vài phần lên bảng thật.

## Ý chính

**Thực thể** là một thứ có danh tính riêng: một khách, một đơn hàng, một sản phẩm. **Tập thực thể** là mọi thứ cùng loại, sau này thành một bảng. **Thuộc tính** mô tả thực thể. Thuộc tính đơn chỉ có một phần (`price`); phức hợp gồm nhiều phần (họ tên = họ + tên); đa trị có nhiều giá trị cho một thực thể (nhiều số điện thoại); dẫn xuất tính được từ thuộc tính khác (thành tiền = số lượng × đơn giá). Thuộc tính khóa phân biệt hai thực thể với nhau.

**Mối quan hệ** nối các thực thể. **Bậc** là số tập thực thể tham gia: một ngôi (nhân viên quản lý nhân viên), hai ngôi (khách đặt đơn), ba ngôi (bác sĩ kê thuốc cho bệnh nhân). **Lực lượng** cho biết một thực thể bên này gắn với bao nhiêu bên kia: 1:1, 1:N, M:N. **Mức tham gia** toàn phần nghĩa là thực thể nào cũng phải có mặt trong mối quan hệ; bộ phận là có thể không.

Có hai lối vẽ phổ biến. Lối Chen vẽ thực thể là hình chữ nhật, mối quan hệ là hình thoi, thuộc tính là hình bầu dục. Lối "chân chim" (crow's foot) gọn hơn: chỉ hộp và đường nối, đầu đường có ký hiệu một, nhiều, không hoặc một. Sơ đồ ER trong tab ER của BoonData dùng lối chân chim.

## Ví dụ

Thuộc tính phức hợp (họ tên, địa chỉ) lên bảng thành nhiều cột; ghép lại khi đọc.

```sql
CREATE TABLE ex_person (id int PRIMARY KEY, first_name text NOT NULL, last_name text NOT NULL, street text, city text);
INSERT INTO ex_person VALUES (1, 'An', 'Tran', '12 Bach Dang', 'Da Nang'), (2, 'Binh', 'Le', NULL, 'Hue');
SELECT first_name || ' ' || last_name AS full_name, city FROM ex_person ORDER BY id;
```

Mối quan hệ một ngôi: khóa ngoại trỏ về chính bảng của nó.

```sql
CREATE TABLE ex_employee (id int PRIMARY KEY, name text NOT NULL, manager_id int REFERENCES ex_employee (id));
INSERT INTO ex_employee VALUES (1, 'Lan', NULL), (2, 'Minh', 1), (3, 'Nga', 1);
SELECT e.name AS employee, m.name AS manager FROM ex_employee e JOIN ex_employee m ON m.id = e.manager_id ORDER BY e.id;
```

`manager_id` cho phép NULL: người đứng đầu không có quản lý, phía "được quản lý" tham gia bộ phận.

Hình cuối mục vẽ một phần sơ đồ cửa hàng theo lối chân chim: mỗi khách đặt 0..n đơn, mỗi đơn thuộc đúng 1 khách; mỗi đơn gồm 1..n dòng; mỗi nhân viên có 0..1 người quản lý, một người quản lý 0..n nhân viên. Mỗi ký hiệu nói thực thể bên cạnh nó có bao nhiêu dòng, và đường nối đi từ khóa chính tới cột khóa ngoại trỏ về nó.

## Lỗi hay gặp

Nhét thuộc tính đa trị vào một ô dạng danh sách: tìm một giá trị bằng `=` không ra.

```sql
-- WRONG: two phone numbers packed into one text cell
CREATE TABLE ex_contact (id int PRIMARY KEY, phones text);
INSERT INTO ex_contact VALUES (1, '0901, 0902');
SELECT count(*) AS found FROM ex_contact WHERE phones = '0902';
```

```sql
-- FIX: one row per phone in a child table
CREATE TABLE ex_contact_phone (contact_id int REFERENCES ex_contact (id), phone text, PRIMARY KEY (contact_id, phone));
INSERT INTO ex_contact_phone VALUES (1, '0901'), (1, '0902');
SELECT count(*) AS found FROM ex_contact_phone WHERE phone = '0902';
```

Câu sai ra 0, câu sửa ra 1. Bảng con còn cho khóa chính chặn trùng và khóa ngoại giữ đúng chủ.

Thuộc tính dẫn xuất lưu bằng cột sinh thì không ghi tay được; database tự tính.

```sql
CREATE TABLE ex_line (id int PRIMARY KEY, qty int NOT NULL, price numeric(10,2) NOT NULL,
  total numeric(12,2) GENERATED ALWAYS AS (qty * price) STORED);
-- ERROR 428C9: cannot insert a non-DEFAULT value into column "total"
INSERT INTO ex_line VALUES (1, 2, 5.00, 99.00);
```

Đó là điều bạn muốn: thành tiền không bao giờ lệch khỏi số lượng và đơn giá. Ghi `INSERT INTO ex_line (id, qty, price) VALUES (…)` thì cột sinh tự điền.

## Thực hành

Lab đưa thuộc tính dẫn xuất thành cột sinh, thuộc tính đa trị thành bảng con, rồi lọc theo cột sinh.

## Tóm tắt

- Thực thể có danh tính; thuộc tính có thể đơn, phức hợp, đa trị, dẫn xuất; thuộc tính khóa phân biệt thực thể.
- Bậc = số tập thực thể tham gia; lực lượng 1:1, 1:N, M:N; mức tham gia toàn phần hay bộ phận, xét riêng từng phía.
- Phức hợp thành nhiều cột, đa trị thành bảng con, dẫn xuất thành cột sinh (hoặc tính khi đọc).
- Tham gia toàn phần lên bảng thường là `NOT NULL` trên khóa ngoại.

# EN

## Opening

Before writing a single `CREATE TABLE`, a designer needs a picture: which things exist in this world and how they connect. Peter Chen's entity-relationship (ER) model, published in 1976, is that picture. This lesson teaches you to read and draw it, then puts a few parts into real tables.

## Key idea

An **entity** is a thing with its own identity: a customer, an order, a product. An **entity set** is all things of one kind, which later becomes a table. **Attributes** describe an entity. A simple attribute has one part (`price`); a composite one has parts (full name = first name + last name); a multivalued one has several values for one entity (several phone numbers); a derived one can be computed from others (line total = quantity × unit price). A key attribute tells two entities apart.

A **relationship** connects entities. Its **degree** is how many entity sets take part: unary (an employee manages employees), binary (a customer places orders), ternary (a doctor prescribes a drug to a patient). **Cardinality** says how many entities on one side link to one on the other: 1:1, 1:N, M:N. **Total participation** means every entity must appear in the relationship; partial means it may not.

Two drawing styles are common. Chen's style draws entities as rectangles, relationships as diamonds and attributes as ovals. The "crow's foot" style is leaner: boxes and lines only, with marks for one, many, zero or one at the line ends. The ER tab in BoonData uses crow's foot.

## Example

Composite attributes (full name, address) become several columns, joined back when read.

```sql
CREATE TABLE ex_person (id int PRIMARY KEY, first_name text NOT NULL, last_name text NOT NULL, street text, city text);
INSERT INTO ex_person VALUES (1, 'An', 'Tran', '12 Bach Dang', 'Da Nang'), (2, 'Binh', 'Le', NULL, 'Hue');
SELECT first_name || ' ' || last_name AS full_name, city FROM ex_person ORDER BY id;
```

A unary relationship: a foreign key that points back at its own table.

```sql
CREATE TABLE ex_employee (id int PRIMARY KEY, name text NOT NULL, manager_id int REFERENCES ex_employee (id));
INSERT INTO ex_employee VALUES (1, 'Lan', NULL), (2, 'Minh', 1), (3, 'Nga', 1);
SELECT e.name AS employee, m.name AS manager FROM ex_employee e JOIN ex_employee m ON m.id = e.manager_id ORDER BY e.id;
```

`manager_id` allows NULL: the person at the top has no manager, so the "managed" side takes part partially.

The figure at the end of this section draws part of the shop's diagram in crow's foot style: each customer places 0..n orders, each order belongs to exactly 1 customer; each order contains 1..n lines; each employee has 0..1 manager, and a manager manages 0..n employees. Each mark says how many rows of the entity beside it take part, and each line runs from a primary key to the foreign-key column that points at it.

## Common mistakes

Packing a multivalued attribute into one cell as a list: searching for one value with `=` finds nothing.

```sql
-- WRONG: two phone numbers packed into one text cell
CREATE TABLE ex_contact (id int PRIMARY KEY, phones text);
INSERT INTO ex_contact VALUES (1, '0901, 0902');
SELECT count(*) AS found FROM ex_contact WHERE phones = '0902';
```

```sql
-- FIX: one row per phone in a child table
CREATE TABLE ex_contact_phone (contact_id int REFERENCES ex_contact (id), phone text, PRIMARY KEY (contact_id, phone));
INSERT INTO ex_contact_phone VALUES (1, '0901'), (1, '0902');
SELECT count(*) AS found FROM ex_contact_phone WHERE phone = '0902';
```

The wrong query returns 0, the fix 1. The child table also lets a primary key block duplicates and a foreign key keep the right owner.

A derived attribute stored as a generated column cannot be written by hand; the database computes it.

```sql
CREATE TABLE ex_line (id int PRIMARY KEY, qty int NOT NULL, price numeric(10,2) NOT NULL,
  total numeric(12,2) GENERATED ALWAYS AS (qty * price) STORED);
-- ERROR 428C9: cannot insert a non-DEFAULT value into column "total"
INSERT INTO ex_line VALUES (1, 2, 5.00, 99.00);
```

That is what you want: the total can never drift from quantity and price. Write `INSERT INTO ex_line (id, qty, price) VALUES (…)` and the generated column fills itself.

## Practice

The lab turns a derived attribute into a generated column and a multivalued attribute into a child table, then filters on the generated column.

## Recap

- An entity has identity; attributes can be simple, composite, multivalued or derived; a key attribute tells entities apart.
- Degree = how many entity sets take part; cardinality 1:1, 1:N, M:N; participation total or partial, judged per side.
- Composite becomes several columns, multivalued a child table, derived a generated column (or a value computed on read).
- Total participation on tables is usually `NOT NULL` on the foreign key.
