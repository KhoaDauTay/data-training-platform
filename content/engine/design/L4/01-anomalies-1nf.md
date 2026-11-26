---
id: e-ds-l4-01
engine: design
level: L4
module: normal-forms
title: Dị thường dữ liệu và dạng chuẩn 1
title_en: Data anomalies and first normal form
kind: concept
runtime: browser
minutes: 15
figures: [{ name: ds-anomalies, at: idea }]
objectives:
  - vi: Chỉ ra dị thường sửa, thêm và xóa trên một bảng gom nhiều sự thật vào một dòng.
    en: Point out update, insert and delete anomalies in a table that packs several facts into one row.
  - vi: Nói 1NF đòi hỏi gì và khi nào một mảng hay jsonb trong Postgres vẫn ổn.
    en: Say what 1NF requires and when an array or jsonb in Postgres is still fine.
  - vi: Tách một cột danh sách cách nhau bằng dấu phẩy thành bảng con.
    en: Split a comma-separated list column into a child table.
requires: [e-ds-l3-03]
sources:
  - https://doi.org/10.1145/362384.362685
  - https://www.bkent.net/Doc/simple5.htm
  - https://www.postgresql.org/docs/18/functions-srf.html
  - https://www.postgresql.org/docs/18/functions-string.html
lab:
  setup: |
    CREATE TABLE customers_raw (id int PRIMARY KEY, name text NOT NULL, phones text);
    INSERT INTO customers_raw VALUES (1, 'An', '0901, 0902'), (2, 'Binh', '0905'), (3, 'Chi', '09012, 0907');
  steps:
    - task:
        vi: "Tạo bảng con `customer_phones` với `customer_id int NOT NULL` trỏ tới `customers_raw (id)`, `phone text NOT NULL`, khóa chính `(customer_id, phone)`. Đừng đặt tên ràng buộc."
        en: "Create the child table `customer_phones` with `customer_id int NOT NULL` pointing to `customers_raw (id)`, `phone text NOT NULL`, primary key `(customer_id, phone)`. Do not name the constraints."
      solution: CREATE TABLE customer_phones (customer_id int NOT NULL REFERENCES customers_raw (id), phone text NOT NULL, PRIMARY KEY (customer_id, phone))
      check: catalog
      hint:
        vi: "Khóa ngoại viết ngay sau cột: `customer_id int NOT NULL REFERENCES customers_raw (id)`; khóa chính gộp hai cột ở cuối."
        en: "The foreign key goes right after the column: `customer_id int NOT NULL REFERENCES customers_raw (id)`; the two-column primary key goes at the end."
    - task:
        vi: "Đổ dữ liệu: mỗi số trong `phones` thành một dòng của `customer_phones`, đã bỏ khoảng trắng hai đầu."
        en: "Fill it: every number in `phones` becomes one row of `customer_phones`, with spaces trimmed at both ends."
      solution: INSERT INTO customer_phones SELECT c.id, trim(p) FROM customers_raw c, string_to_table(c.phones, ',') AS p
      after: SELECT customer_id, phone FROM customer_phones ORDER BY customer_id, phone
      check: rows
      ordered: true
      hint:
        vi: "`string_to_table(c.phones, ',')` trả mỗi phần tử một dòng; `trim(p)` bỏ khoảng trắng."
        en: "`string_to_table(c.phones, ',')` returns one row per element; `trim(p)` removes the spaces."
    - task:
        vi: "Giờ tìm đúng khách có số `0901` (không phải mọi số chứa `0901`): trả `name`."
        en: "Now find exactly the customer whose number is `0901` (not every number containing `0901`): return `name`."
      solution: SELECT c.name FROM customers_raw c JOIN customer_phones p ON p.customer_id = c.id WHERE p.phone = '0901'
      check: rows
      hint:
        vi: "Nối hai bảng rồi so bằng `=`, không cần `LIKE`."
        en: "Join the two tables and compare with `=`; no `LIKE` needed."
quiz:
  - q:
      vi: "Bảng `orders` lưu cả `customer_city` ở mỗi đơn. Khách chuyển nhà, bạn sửa thành phố ở một đơn. Chuyện gì xảy ra?"
      en: "Table `orders` stores `customer_city` on every order. A customer moves and you change the city on one order. What happens?"
    options:
      - { vi: "Postgres tự sửa các đơn còn lại vì cùng khách", en: "Postgres fixes the other orders because they share the customer" }
      - { vi: "Các đơn khác vẫn giữ thành phố cũ: một khách có hai thành phố", en: "The other orders keep the old city: one customer now has two cities" }
      - { vi: "Câu `UPDATE` báo lỗi vì vi phạm khóa", en: "The `UPDATE` fails with a key violation" }
    answer: 1
    trap: 0
    why:
      vi: "Postgres không tự sửa các đơn khác: với nó, `customer_city` ở mỗi đơn là một ô riêng, không luật nào nói chúng phải bằng nhau. Câu `UPDATE` cũng không lỗi, vì không khóa hay ràng buộc nào nằm trên cột thành phố. Kết quả là dị thường sửa (update anomaly): thành phố của khách lưu ở nhiều đơn, sửa một đơn thì các đơn còn lại vẫn ghi thành phố cũ. Cách chữa là lưu thành phố một lần, trong bảng khách."
      en: "Postgres does not fix the other orders: to it, `customer_city` on each order is a separate cell, and no rule says they must match. The `UPDATE` does not fail either, because no key or constraint sits on the city column. The result is an update anomaly: the customer's city is stored on many orders, so changing one leaves the others with the old city. The cure is to store the city once, in a customers table."
  - q:
      vi: "Cột `tags text[]` trên bảng bài viết có phạm 1NF không?"
      en: "Does a `tags text[]` column on an articles table break 1NF?"
    options:
      - { vi: "Luôn phạm: mảng không bao giờ được phép", en: "Always: arrays are never allowed" }
      - { vi: "Tùy cách dùng: nếu bạn chỉ đọc cả mảng thì ổn; nếu hay tìm, đếm, nối theo từng thẻ thì nên là bảng con", en: "It depends on use: reading the whole array is fine; if you often search, count or join by single tag, it should be a child table" }
      - { vi: "Không bao giờ phạm vì Postgres hỗ trợ mảng", en: "Never, because Postgres supports arrays" }
    answer: 1
    trap: 2
    why:
      vi: "\"Postgres hỗ trợ mảng\" chỉ nói mảng lưu được, không nói thiết kế đúng; \"mảng luôn bị cấm\" thì quá cứng. Dạng chuẩn 1 (1NF) hỏi mỗi ô có phải một giá trị theo nghĩa nghiệp vụ không. Nếu bạn luôn đọc và ghi cả danh sách thẻ, mảng là một giá trị và ổn. Nếu bạn tìm, đếm hay nối theo từng thẻ, mỗi thẻ là một sự thật riêng và nên là một dòng của bảng con có khóa chính và khóa ngoại."
      en: "\"Postgres supports arrays\" only says arrays can be stored, not that the design is right; \"arrays are never allowed\" is too rigid. First normal form (1NF) asks whether each cell is one value in business terms. If you always read and write the whole tag list, the array is one value and fine. If you search, count or join by single tag, each tag is a separate fact and should be a row of a child table with a primary key and a foreign key."
---
## Mở bài

Một bảng tính "đơn hàng" lưu luôn tên khách, thành phố, số điện thoại ở mỗi dòng: dễ nhập, dễ xem. Rồi một ngày khách đổi thành phố, và báo cáo bắt đầu ra hai thành phố cho cùng một người. Bài này gọi tên các lỗi đó và bước đầu tiên để chữa: dạng chuẩn 1.

## Ý chính

Khi một bảng gom nhiều sự thật độc lập vào một dòng, ba loại **dị thường** xuất hiện. **Dị thường sửa**: một sự thật (thành phố của khách) nằm ở nhiều dòng, sửa sót một dòng là mâu thuẫn. **Dị thường thêm**: không ghi được một sự thật khi thiếu sự thật kia (khách mới chưa có đơn thì không có dòng nào để ghi). **Dị thường xóa**: xóa đơn cuối cùng của khách là mất luôn thành phố của khách.

Chuẩn hóa là tách bảng sao cho mỗi sự thật được lưu đúng một lần, dựa trên phụ thuộc hàm đã học ở cấp 3. Các dạng chuẩn đi từ dễ tới khó: 1NF, 2NF, 3NF, BCNF, rồi 4NF, 5NF.

**Dạng chuẩn 1 (1NF)**: mỗi ô giữ một giá trị, không có nhóm lặp (không `phone1`, `phone2`, `phone3`, không chuỗi "0901, 0902"). Postgres có mảng và `jsonb`, nên câu hỏi thực tế là: bạn có tìm, đếm, nối theo từng phần tử không? Nếu có, đó là nhiều sự thật và thuộc về một bảng con có khóa. Nếu bạn chỉ luôn đọc và ghi cả khối, một mảng hay tài liệu jsonb là chấp nhận được.

Hình cuối mục này cho thấy ba kiểu hỏng trên bảng `ex_orders`, mỗi bước một kiểu.

## Ví dụ

Một bảng rộng: mỗi đơn lặp lại thành phố của khách.

```sql
CREATE TABLE ex_orders (order_id int PRIMARY KEY, customer_id int NOT NULL, customer_city text NOT NULL, product text NOT NULL);
INSERT INTO ex_orders VALUES (1, 1, 'Hue', 'pen'), (2, 1, 'Hue', 'ink'), (3, 1, 'Hue', 'paper'), (4, 2, 'Hoi An', 'bag');
SELECT customer_id, customer_city, count(*) AS copies FROM ex_orders GROUP BY customer_id, customer_city ORDER BY customer_id;
```

Thành phố của khách 1 được lưu ba lần. Dị thường sửa: đổi ở một đơn.

```sql
UPDATE ex_orders SET customer_city = 'Da Nang' WHERE order_id = 1;
SELECT customer_id, count(DISTINCT customer_city) AS cities FROM ex_orders GROUP BY customer_id ORDER BY customer_id;
```

Khách 1 giờ có hai thành phố. Dị thường xóa: hủy đơn duy nhất của khách 2.

```sql
DELETE FROM ex_orders WHERE customer_id = 2;
SELECT count(*) AS rows_about_customer_2 FROM ex_orders WHERE customer_id = 2;
```

Không còn dòng nào biết khách 2 ở Hội An. Còn cột danh sách thì đọc từng phần tử bằng hàm trả tập:

```sql
SELECT c.id, trim(p) AS phone FROM customers_raw c, string_to_table(c.phones, ',') AS p ORDER BY c.id, phone;
```

## Lỗi hay gặp

Tìm trong cột danh sách bằng `LIKE`: khớp cả số chỉ chứa chuỗi đó.

```sql
-- WRONG: LIKE also matches 09012
SELECT count(*) AS customers FROM customers_raw WHERE phones LIKE '%0901%';
```

```sql
-- FIX: compare each element exactly
SELECT count(DISTINCT c.id) AS customers FROM customers_raw c, string_to_table(c.phones, ',') AS p WHERE trim(p) = '0901';
```

Câu sai đếm 2 khách, câu đúng đếm 1. Mỗi lần tìm phải tách chuỗi là dấu hiệu cột đó nên là bảng con.

Dị thường thêm: bảng rộng không cho ghi khách mới khi chưa có đơn, vì khóa chính là mã đơn.

```sql
-- ERROR 23502: null value in column "order_id" of relation "ex_orders" violates not-null constraint
INSERT INTO ex_orders (customer_id, customer_city, product) VALUES (3, 'Hue', 'none');
```

Muốn ghi khách mà không bịa ra một đơn, khách phải có bảng riêng.

## Thực hành

Lab tạo bảng con `customer_phones`, tách cột `phones` vào đó, rồi tìm khách theo số chính xác bằng một phép nối.

## Tóm tắt

- Một sự thật lưu nhiều chỗ sinh ra dị thường sửa, thêm và xóa.
- Chuẩn hóa tách bảng để mỗi sự thật được lưu đúng một lần.
- 1NF: mỗi ô một giá trị, không nhóm lặp, không chuỗi danh sách.
- Mảng, jsonb ổn khi luôn đọc cả khối; tìm hay nối theo phần tử thì dùng bảng con.

# EN

## Opening

An "orders" spreadsheet stores the customer's name, city and phone on every row: easy to type, easy to read. Then one day a customer changes city, and reports start showing two cities for the same person. This lesson names those faults and takes the first step to cure them: first normal form.

## Key idea

When a table packs several independent facts into one row, three kinds of **anomaly** appear. **Update anomaly**: one fact (the customer's city) sits in many rows, and missing one row makes the data contradict itself. **Insert anomaly**: you cannot record one fact without the other (a new customer with no order has no row to live in). **Delete anomaly**: deleting a customer's last order also loses the customer's city.

Normalisation splits tables so that every fact is stored exactly once, based on the functional dependencies of level 3. The normal forms go from easy to hard: 1NF, 2NF, 3NF, BCNF, then 4NF and 5NF.

**First normal form (1NF)**: every cell holds one value, with no repeating groups (no `phone1`, `phone2`, `phone3`, no string "0901, 0902"). Postgres has arrays and `jsonb`, so the practical question is: do you search, count or join on single elements? If so, they are several facts and belong in a child table with a key. If you always read and write the whole block, an array or a jsonb document is acceptable.

The figure at the end of this section shows the three kinds of damage on the `ex_orders` table, one per step.

## Example

A wide table: every order repeats the customer's city.

```sql
CREATE TABLE ex_orders (order_id int PRIMARY KEY, customer_id int NOT NULL, customer_city text NOT NULL, product text NOT NULL);
INSERT INTO ex_orders VALUES (1, 1, 'Hue', 'pen'), (2, 1, 'Hue', 'ink'), (3, 1, 'Hue', 'paper'), (4, 2, 'Hoi An', 'bag');
SELECT customer_id, customer_city, count(*) AS copies FROM ex_orders GROUP BY customer_id, customer_city ORDER BY customer_id;
```

Customer 1's city is stored three times. Update anomaly: change it on one order.

```sql
UPDATE ex_orders SET customer_city = 'Da Nang' WHERE order_id = 1;
SELECT customer_id, count(DISTINCT customer_city) AS cities FROM ex_orders GROUP BY customer_id ORDER BY customer_id;
```

Customer 1 now has two cities. Delete anomaly: cancel customer 2's only order.

```sql
DELETE FROM ex_orders WHERE customer_id = 2;
SELECT count(*) AS rows_about_customer_2 FROM ex_orders WHERE customer_id = 2;
```

No row remembers that customer 2 lives in Hoi An. A list column is read element by element with a set-returning function:

```sql
SELECT c.id, trim(p) AS phone FROM customers_raw c, string_to_table(c.phones, ',') AS p ORDER BY c.id, phone;
```

## Common mistakes

Searching a list column with `LIKE`: it also matches numbers that merely contain the string.

```sql
-- WRONG: LIKE also matches 09012
SELECT count(*) AS customers FROM customers_raw WHERE phones LIKE '%0901%';
```

```sql
-- FIX: compare each element exactly
SELECT count(DISTINCT c.id) AS customers FROM customers_raw c, string_to_table(c.phones, ',') AS p WHERE trim(p) = '0901';
```

The wrong query counts 2 customers, the fixed one 1. Having to split a string on every search is the sign the column should be a child table.

Insert anomaly: the wide table cannot record a new customer without an order, because its primary key is the order id.

```sql
-- ERROR 23502: null value in column "order_id" of relation "ex_orders" violates not-null constraint
INSERT INTO ex_orders (customer_id, customer_city, product) VALUES (3, 'Hue', 'none');
```

To record a customer without inventing an order, customers need their own table.

## Practice

The lab creates the child table `customer_phones`, splits the `phones` column into it, then finds a customer by exact number with a join.

## Recap

- A fact stored in many places causes update, insert and delete anomalies.
- Normalisation splits tables so that each fact is stored exactly once.
- 1NF: one value per cell, no repeating groups, no list strings.
- Arrays and jsonb are fine when always read as a whole; search or join by element and you want a child table.
