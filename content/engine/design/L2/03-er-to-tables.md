---
id: e-ds-l2-03
engine: design
level: L2
module: er-mapping
title: Từ sơ đồ ER sang bảng
title_en: From an ER diagram to tables
kind: lab
runtime: browser
minutes: 20
figures: [{ name: ds-er-to-tables, at: idea }]
objectives:
  - vi: Áp bảy luật chuyển ER sang bảng cho thực thể, 1:N, M:N, 1:1, đa trị, thực thể yếu và loại con.
    en: Apply the seven ER-to-table rules for entities, 1:N, M:N, 1:1, multivalued attributes, weak entities and subtypes.
  - vi: Đặt khóa ngoại đúng phía và chọn khóa chính cho bảng nối.
    en: Put each foreign key on the right side and choose the primary key of a junction table.
  - vi: Đọc lại catalog để kiểm sơ đồ đã lên bảng đúng.
    en: Read the catalog back to check that the diagram became the right tables.
requires: [e-ds-l2-02]
sources:
  - https://doi.org/10.1145/320434.320440
  - https://www.postgresql.org/docs/18/ddl-constraints.html
  - https://www.postgresql.org/docs/18/catalog-pg-constraint.html
lab:
  setup: |
    CREATE TABLE customers (id int PRIMARY KEY, name text NOT NULL);
    CREATE TABLE products (id int PRIMARY KEY, name text NOT NULL);
    INSERT INTO customers VALUES (1, 'An'), (2, 'Binh');
    INSERT INTO products VALUES (10, 'pen'), (11, 'notebook');
  steps:
    - task:
        vi: "Sơ đồ: một khách đặt nhiều đơn, mỗi đơn của đúng một khách (1:N, phía đơn toàn phần). Tạo bảng `orders` với `id int` khóa chính và `customer_id int` không null trỏ tới `customers (id)`. Đừng đặt tên ràng buộc."
        en: "Diagram: a customer places many orders, each order belongs to exactly one customer (1:N, total on the order side). Create table `orders` with `id int` as primary key and `customer_id int` not null pointing to `customers (id)`. Do not name the constraints."
      solution: CREATE TABLE orders (id int PRIMARY KEY, customer_id int NOT NULL REFERENCES customers (id))
      check: catalog
      hint:
        vi: Khóa ngoại nằm ở phía N (đơn hàng); tham gia toàn phần nghĩa là `NOT NULL`.
        en: The foreign key sits on the N side (orders); total participation means `NOT NULL`.
    - task:
        vi: "Đơn và sản phẩm là M:N, mối quan hệ có thuộc tính số lượng. Tạo bảng nối `order_items`: `order_id int` trỏ tới `orders (id)`, `product_id int` trỏ tới `products (id)`, `qty int` không null, khóa chính là cặp (`order_id`, `product_id`). Đừng đặt tên ràng buộc."
        en: "Orders and products are M:N, and the relationship has a quantity attribute. Create junction table `order_items`: `order_id int` pointing to `orders (id)`, `product_id int` pointing to `products (id)`, `qty int` not null, primary key the pair (`order_id`, `product_id`). Do not name the constraints."
      solution: CREATE TABLE order_items (order_id int REFERENCES orders (id), product_id int REFERENCES products (id), qty int NOT NULL, PRIMARY KEY (order_id, product_id))
      check: catalog
      hint:
        vi: "Hai khóa ngoại, rồi `PRIMARY KEY (order_id, product_id)` ở cuối."
        en: "Two foreign keys, then `PRIMARY KEY (order_id, product_id)` at the end."
    - task:
        vi: "Mỗi khách có tối đa một thẻ thành viên, mỗi thẻ của đúng một khách (1:1). Tạo `loyalty_cards`: `id int` khóa chính, `customer_id int` không null, duy nhất, trỏ tới `customers (id)`. Đừng đặt tên ràng buộc."
        en: "Each customer has at most one loyalty card, each card belongs to exactly one customer (1:1). Create `loyalty_cards`: `id int` primary key, `customer_id int` not null, unique, pointing to `customers (id)`. Do not name the constraints."
      solution: CREATE TABLE loyalty_cards (id int PRIMARY KEY, customer_id int NOT NULL UNIQUE REFERENCES customers (id))
      check: catalog
      hint:
        vi: "1:1 = khóa ngoại cộng `UNIQUE` trên cùng cột."
        en: "1:1 = a foreign key plus `UNIQUE` on the same column."
    - task:
        vi: "Kiểm lại bằng catalog: liệt kê mọi khóa ngoại trong database, mỗi dòng gồm bảng con (`child`) và bảng cha (`parent`) dạng chữ, xếp theo hai cột đó."
        en: "Check with the catalog: list every foreign key in the database, each row the child table (`child`) and the parent table (`parent`) as text, ordered by those two columns."
      solution: SELECT conrelid::regclass::text AS child, confrelid::regclass::text AS parent FROM pg_constraint WHERE contype = 'f' ORDER BY child, parent
      check: rows
      ordered: true
      hint:
        vi: "`pg_constraint` có `contype = 'f'` cho khóa ngoại, `conrelid` là bảng con, `confrelid` là bảng cha."
        en: "`pg_constraint` has `contype = 'f'` for foreign keys, `conrelid` is the child, `confrelid` the parent."
quiz:
  - q:
      vi: "Một khách có nhiều đơn (1:N). Khóa ngoại đặt ở đâu?"
      en: "A customer has many orders (1:N). Where does the foreign key go?"
    options:
      - { vi: "Ở `customers`: một cột chứa danh sách mã đơn", en: "In `customers`: a column holding the list of order ids" }
      - { vi: "Ở `orders`: cột `customer_id`", en: "In `orders`: a column `customer_id`" }
      - { vi: "Luôn cần một bảng nối", en: "A junction table is always needed" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì khách \"sở hữu\" các đơn, nhưng một ô chỉ chứa một giá trị. Mỗi đơn có đúng một khách, nên phía N giữ một cột trỏ về phía 1. Bảng nối chỉ cần cho M:N."
      en: "It sounds right because the customer \"owns\" the orders, but a cell holds one value. Each order has exactly one customer, so the N side holds one column pointing to the 1 side. A junction table is only needed for M:N."
  - q:
      vi: "Bảng nối `order_items` không có khóa chính. Chuyện gì có thể xảy ra?"
      en: "Junction table `order_items` has no primary key. What can happen?"
    options:
      - { vi: "Không gì: hai khóa ngoại đã đủ chặn trùng", en: "Nothing: the two foreign keys already block duplicates" }
      - { vi: "Cùng một cặp đơn - sản phẩm có thể xuất hiện hai lần, và tổng số lượng bị đếm đôi", en: "The same order-product pair can appear twice, and quantities get counted twice" }
      - { vi: "Postgres từ chối tạo bảng", en: "Postgres refuses to create the table" }
    answer: 1
    trap: 0
    why:
      vi: "Nhiều người nghĩ khóa ngoại chặn trùng. Thật ra khóa ngoại chỉ kiểm tra dòng cha tồn tại; chặn trùng là việc của khóa chính hoặc `UNIQUE` trên cặp cột."
      en: "Many people think foreign keys block duplicates. In fact a foreign key only checks that the parent row exists; blocking duplicates is the job of a primary key or `UNIQUE` on the pair."
---
## Mở bài

Sơ đồ ER đẹp đến mấy cũng chưa lưu được dữ liệu nào. Từ hình vẽ sang `CREATE TABLE` có một bộ luật gần như máy móc. Bài này đi qua từng luật, rồi bạn tự dựng một sơ đồ bán hàng nhỏ.

## Ý chính

Bảy luật chuyển, theo thứ tự hay gặp. **Thực thể mạnh** thành một bảng, thuộc tính khóa thành khóa chính. **1:N** thành một khóa ngoại ở phía N trỏ về phía 1; phía N tham gia toàn phần thì thêm `NOT NULL`. **M:N** thành một bảng nối có hai khóa ngoại, khóa chính là cặp đó, và thuộc tính của mối quan hệ (số lượng, ngày) nằm trong bảng nối. **1:1** thành một khóa ngoại kèm `UNIQUE`, đặt ở phía tham gia toàn phần.

**Thuộc tính đa trị** thành bảng con: khóa ngoại tới chủ cộng giá trị, cả hai làm khóa chính. **Thực thể yếu** thành bảng có khóa chính = khóa của chủ + khóa bộ phận, khóa ngoại tới chủ với `ON DELETE CASCADE`. **Loại con** trong cây EER thành bảng có khóa chính đồng thời là khóa ngoại tới bảng cha.

Mối quan hệ ba ngôi trở lên đi như M:N: một bảng có một khóa ngoại cho mỗi tập thực thể tham gia. Sau khi dựng xong, đừng tin trí nhớ: đọc `pg_constraint` để thấy từng khóa ngoại nối bảng nào với bảng nào.

Hình cuối mục này đi qua ba luật, mỗi bước một luật: 1:N, M:N và thực thể yếu.

## Cú pháp

```sql
CREATE TABLE child (
  id int PRIMARY KEY,
  parent_id int [ NOT NULL ] [ UNIQUE ] REFERENCES parent (id) [ ON DELETE CASCADE ]
);
CREATE TABLE a_b (
  a_id int REFERENCES a (id),
  b_id int REFERENCES b (id),
  PRIMARY KEY (a_id, b_id)
);
```

- `NOT NULL` trên khóa ngoại: phía con tham gia toàn phần.
- `UNIQUE` trên khóa ngoại: biến 1:N thành 1:1.
- `PRIMARY KEY (a_id, b_id)`: mỗi cặp chỉ một lần trong bảng nối M:N.
- `ON DELETE CASCADE`: dùng cho thực thể yếu và thuộc tính đa trị.

## Ví dụ

1:N với tham gia toàn phần, rồi đọc phép nối:

```sql
CREATE TABLE ex_dept (id int PRIMARY KEY, name text NOT NULL);
CREATE TABLE ex_emp (id int PRIMARY KEY, name text NOT NULL, dept_id int NOT NULL REFERENCES ex_dept (id));
INSERT INTO ex_dept VALUES (1, 'sales'), (2, 'ops');
INSERT INTO ex_emp VALUES (1, 'Lan', 1), (2, 'Minh', 1), (3, 'Nga', 2);
SELECT d.name AS dept, count(*) AS people FROM ex_emp e JOIN ex_dept d ON d.id = e.dept_id GROUP BY d.name ORDER BY d.name;
```

Loại con dùng chung khóa với cha:

```sql
CREATE TABLE ex_member (id int PRIMARY KEY, name text NOT NULL);
CREATE TABLE ex_student (id int PRIMARY KEY REFERENCES ex_member (id), school text NOT NULL);
INSERT INTO ex_member VALUES (1, 'An'), (2, 'Binh');
INSERT INTO ex_student VALUES (2, 'DUT');
SELECT m.name, s.school FROM ex_member m LEFT JOIN ex_student s ON s.id = m.id ORDER BY m.id;
```

Đọc lại catalog: mỗi khóa ngoại một dòng.

```sql
SELECT conrelid::regclass::text AS child, confrelid::regclass::text AS parent
FROM pg_constraint
WHERE contype = 'f' AND conrelid::regclass::text LIKE 'ex\_%'
ORDER BY child, parent;
```

## Lỗi hay gặp

Bảng nối M:N không có khóa chính nhận cùng một cặp hai lần.

```sql
-- WRONG: no key on the junction table, the same pair goes in twice
CREATE TABLE ex_post_tag (post_id int, tag text);
INSERT INTO ex_post_tag VALUES (1, 'sql'), (1, 'sql');
SELECT count(*) AS pairs FROM ex_post_tag;
```

```sql
-- FIX: the pair is the primary key; the duplicate is skipped
CREATE TABLE ex_post_tag2 (post_id int, tag text, PRIMARY KEY (post_id, tag));
INSERT INTO ex_post_tag2 VALUES (1, 'sql'), (1, 'sql') ON CONFLICT DO NOTHING;
SELECT count(*) AS pairs FROM ex_post_tag2;
```

Quên `UNIQUE` khi muốn 1:1 thì bảng vẫn là 1:N. Có `UNIQUE`, thẻ thứ hai cho cùng người bị chặn:

```sql
CREATE TABLE ex_card (id int PRIMARY KEY, member_id int NOT NULL UNIQUE REFERENCES ex_member (id));
INSERT INTO ex_card VALUES (1, 1);
-- ERROR 23505: duplicate key value violates unique constraint "ex_card_member_id_key"
INSERT INTO ex_card VALUES (2, 1);
```

## Thực hành

Bảng `customers` và `products` có sẵn. Thêm đơn hàng (1:N), dòng đơn (M:N có thuộc tính), thẻ thành viên (1:1), rồi đọc catalog để kiểm từng khóa ngoại.

## Tóm tắt

- Thực thể thành bảng; 1:N thành khóa ngoại ở phía N; M:N thành bảng nối với khóa chính là cặp khóa ngoại.
- 1:1 = khóa ngoại + `UNIQUE`; tham gia toàn phần = `NOT NULL`.
- Đa trị và thực thể yếu thành bảng con có khóa ghép, thường `ON DELETE CASCADE`.
- Loại con: khóa chính đồng thời là khóa ngoại tới bảng cha.
- Kiểm kết quả bằng `pg_constraint`, không bằng trí nhớ.

# EN

## Opening

However good an ER diagram looks, it stores no data yet. Going from the drawing to `CREATE TABLE` follows an almost mechanical set of rules. This lesson walks through each rule, then you build a small sales diagram yourself.

## Key idea

Seven mapping rules, in the order you meet them most. A **strong entity** becomes a table, its key attribute the primary key. **1:N** becomes a foreign key on the N side pointing at the 1 side; if the N side takes part totally, add `NOT NULL`. **M:N** becomes a junction table with two foreign keys, the pair as primary key, and the relationship's own attributes (quantity, date) live in the junction table. **1:1** becomes a foreign key with `UNIQUE`, placed on the side with total participation.

A **multivalued attribute** becomes a child table: a foreign key to the owner plus the value, both as the primary key. A **weak entity** becomes a table whose primary key = the owner's key + the partial key, with a foreign key to the owner using `ON DELETE CASCADE`. A **subtype** in an EER tree becomes a table whose primary key is also a foreign key to the parent table.

Relationships of degree three or more go like M:N: one table with a foreign key for each entity set taking part. Once built, do not trust your memory: read `pg_constraint` to see which tables each foreign key joins.

The figure at the end of this section walks through the three rules, one per step: 1:N, M:N and the weak entity.

## Syntax

```sql
CREATE TABLE child (
  id int PRIMARY KEY,
  parent_id int [ NOT NULL ] [ UNIQUE ] REFERENCES parent (id) [ ON DELETE CASCADE ]
);
CREATE TABLE a_b (
  a_id int REFERENCES a (id),
  b_id int REFERENCES b (id),
  PRIMARY KEY (a_id, b_id)
);
```

- `NOT NULL` on a foreign key: the child side takes part totally.
- `UNIQUE` on a foreign key: turns 1:N into 1:1.
- `PRIMARY KEY (a_id, b_id)`: each pair once in an M:N junction table.
- `ON DELETE CASCADE`: for weak entities and multivalued attributes.

## Example

1:N with total participation, then read the join:

```sql
CREATE TABLE ex_dept (id int PRIMARY KEY, name text NOT NULL);
CREATE TABLE ex_emp (id int PRIMARY KEY, name text NOT NULL, dept_id int NOT NULL REFERENCES ex_dept (id));
INSERT INTO ex_dept VALUES (1, 'sales'), (2, 'ops');
INSERT INTO ex_emp VALUES (1, 'Lan', 1), (2, 'Minh', 1), (3, 'Nga', 2);
SELECT d.name AS dept, count(*) AS people FROM ex_emp e JOIN ex_dept d ON d.id = e.dept_id GROUP BY d.name ORDER BY d.name;
```

A subtype sharing its key with the parent:

```sql
CREATE TABLE ex_member (id int PRIMARY KEY, name text NOT NULL);
CREATE TABLE ex_student (id int PRIMARY KEY REFERENCES ex_member (id), school text NOT NULL);
INSERT INTO ex_member VALUES (1, 'An'), (2, 'Binh');
INSERT INTO ex_student VALUES (2, 'DUT');
SELECT m.name, s.school FROM ex_member m LEFT JOIN ex_student s ON s.id = m.id ORDER BY m.id;
```

Read the catalog back: one row per foreign key.

```sql
SELECT conrelid::regclass::text AS child, confrelid::regclass::text AS parent
FROM pg_constraint
WHERE contype = 'f' AND conrelid::regclass::text LIKE 'ex\_%'
ORDER BY child, parent;
```

## Common mistakes

An M:N junction table with no primary key takes the same pair twice.

```sql
-- WRONG: no key on the junction table, the same pair goes in twice
CREATE TABLE ex_post_tag (post_id int, tag text);
INSERT INTO ex_post_tag VALUES (1, 'sql'), (1, 'sql');
SELECT count(*) AS pairs FROM ex_post_tag;
```

```sql
-- FIX: the pair is the primary key; the duplicate is skipped
CREATE TABLE ex_post_tag2 (post_id int, tag text, PRIMARY KEY (post_id, tag));
INSERT INTO ex_post_tag2 VALUES (1, 'sql'), (1, 'sql') ON CONFLICT DO NOTHING;
SELECT count(*) AS pairs FROM ex_post_tag2;
```

Forget `UNIQUE` when you mean 1:1 and the table is still 1:N. With `UNIQUE`, a second card for the same person is refused:

```sql
CREATE TABLE ex_card (id int PRIMARY KEY, member_id int NOT NULL UNIQUE REFERENCES ex_member (id));
INSERT INTO ex_card VALUES (1, 1);
-- ERROR 23505: duplicate key value violates unique constraint "ex_card_member_id_key"
INSERT INTO ex_card VALUES (2, 1);
```

## Practice

Tables `customers` and `products` are ready. Add orders (1:N), order items (M:N with an attribute), loyalty cards (1:1), then read the catalog to check each foreign key.

## Recap

- An entity becomes a table; 1:N a foreign key on the N side; M:N a junction table keyed by the pair of foreign keys.
- 1:1 = foreign key + `UNIQUE`; total participation = `NOT NULL`.
- Multivalued attributes and weak entities become child tables with composite keys, usually `ON DELETE CASCADE`.
- Subtype: the primary key is also a foreign key to the parent table.
- Check the result with `pg_constraint`, not with your memory.
