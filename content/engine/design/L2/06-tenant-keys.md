---
id: e-ds-l2-06
engine: design
level: L2
module: er-mapping
title: Khóa cho nhiều khách hàng - tenant_id trong khóa chính và khóa ngoại
title_en: Keys for many tenants - tenant_id in the primary and foreign keys
kind: lab
runtime: browser
minutes: 18
figures: [{ name: pg-tenancy-models, at: idea, step: 3 }, { name: ds-tenant-composite-fk, at: idea }]
objectives:
  - vi: Đặt `tenant_id` đầu khóa chính của mọi bảng thuộc về một khách hàng.
    en: Put `tenant_id` first in the primary key of every table a tenant owns.
  - vi: Viết khóa ngoại ghép để một dòng không thể trỏ sang dữ liệu của khách hàng khác.
    en: Write a composite foreign key so a row can never point at another tenant's data.
  - vi: Nối hai bảng của một khách hàng bằng cả hai cột khóa.
    en: Join two of a tenant's tables on both key columns.
requires: [e-ds-l2-03]
sources:
  - url: https://www.postgresql.org/docs/18/ddl-constraints.html#DDL-CONSTRAINTS-FK
    title: "Constraints › Foreign Keys"
    title_vi: "Ràng buộc › khóa ngoại"
  - url: https://www.postgresql.org/docs/18/sql-createtable.html
    title: "CREATE TABLE"
    title_vi: "CREATE TABLE"
  - url: https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/silo-pool-and-bridge-models.html
    title: "Silo, Pool, and Bridge Models"
    title_vi: "Mô hình silo, pool và bridge"
lab:
  setup: |
    CREATE TABLE sellers (id int PRIMARY KEY, name text NOT NULL);
    INSERT INTO sellers VALUES (1, 'Lan Silk'), (2, 'Minh Tea'), (3, 'Hoa Lamp');
    CREATE TABLE customers (
      tenant_id int NOT NULL REFERENCES sellers (id),
      id int NOT NULL,
      name text NOT NULL,
      PRIMARY KEY (tenant_id, id)
    );
    INSERT INTO customers
    SELECT t, c, 'Customer ' || t || '-' || c
    FROM generate_series(1, 3) t, generate_series(1, 10) c;
  steps:
    - task:
        vi: "Tạo bảng `orders` theo đúng thứ tự cột: `tenant_id int NOT NULL`, `id int NOT NULL`, `customer_id int NOT NULL`, `total int NOT NULL`. Khóa chính `(tenant_id, id)`, khóa ngoại `(tenant_id, customer_id)` trỏ tới `customers (tenant_id, id)`. Đừng đặt tên ràng buộc."
        en: "Create table `orders` with these columns in this order: `tenant_id int NOT NULL`, `id int NOT NULL`, `customer_id int NOT NULL`, `total int NOT NULL`. Primary key `(tenant_id, id)`, foreign key `(tenant_id, customer_id)` pointing to `customers (tenant_id, id)`. Do not name the constraints."
      solution: CREATE TABLE orders (tenant_id int NOT NULL, id int NOT NULL, customer_id int NOT NULL, total int NOT NULL, PRIMARY KEY (tenant_id, id), FOREIGN KEY (tenant_id, customer_id) REFERENCES customers (tenant_id, id))
      check: catalog
      hint:
        vi: "Khóa ghép viết ở cuối danh sách cột: `PRIMARY KEY (tenant_id, id)`, rồi `FOREIGN KEY (tenant_id, customer_id) REFERENCES customers (tenant_id, id)`."
        en: "Composite keys go at the end of the column list: `PRIMARY KEY (tenant_id, id)`, then `FOREIGN KEY (tenant_id, customer_id) REFERENCES customers (tenant_id, id)`."
    - task:
        vi: "Đánh index cho khóa ngoại ghép ở bảng con: một index trên `orders (tenant_id, customer_id)`. Đừng đặt tên index."
        en: "Index the composite foreign key on the child side: one index on `orders (tenant_id, customer_id)`. Do not name the index."
      solution: CREATE INDEX ON orders (tenant_id, customer_id)
      check: catalog
      hint:
        vi: "`CREATE INDEX ON orders (tenant_id, customer_id)`: không có tên thì Postgres tự đặt."
        en: "`CREATE INDEX ON orders (tenant_id, customer_id)`: without a name Postgres picks one."
    - task:
        vi: "Người bán 2 ghi hai đơn cho khách số 7 của mình: đơn 1 tổng `120000`, đơn 2 tổng `80000`. Bài chấm bằng toàn bộ bảng `orders`."
        en: "Seller 2 records two orders for its own customer 7: order 1 with total `120000`, order 2 with total `80000`. It is graded on the whole `orders` table."
      solution: INSERT INTO orders VALUES (2, 1, 7, 120000), (2, 2, 7, 80000)
      after: SELECT tenant_id, id, customer_id, total FROM orders ORDER BY tenant_id, id
      check: rows
      ordered: true
      hint:
        vi: "Giá trị theo thứ tự cột: `tenant_id`, `id`, `customer_id`, `total`."
        en: "Values in column order: `tenant_id`, `id`, `customer_id`, `total`."
    - task:
        vi: "Trang đơn hàng của người bán 2: `tenant_id`, mã đơn `id`, tên khách `name`, `total`, xếp theo mã đơn. Nối `orders` với `customers` bằng cả hai cột."
        en: "Seller 2's order page: `tenant_id`, order `id`, customer `name`, `total`, ordered by order id. Join `orders` to `customers` on both columns."
      solution: SELECT o.tenant_id, o.id, c.name, o.total FROM orders o JOIN customers c ON c.tenant_id = o.tenant_id AND c.id = o.customer_id WHERE o.tenant_id = 2 ORDER BY o.id
      check: rows
      ordered: true
      hint:
        vi: "Khách số 7 có ở cả ba người bán; chỉ nối theo `id` thì mỗi đơn ra ba dòng. Thêm `c.tenant_id = o.tenant_id` vào điều kiện nối."
        en: "Customer 7 exists at all three sellers; joining on `id` alone gives three rows per order. Add `c.tenant_id = o.tenant_id` to the join condition."
quiz:
  - q:
      vi: "Bảng `orders` có `customer_id int REFERENCES customers (id)`, với `customers.id` là khóa chính chung cho mọi người bán. Cả hai bảng đều có cột `tenant_id`. Database có chặn đơn của người bán 1 trỏ tới khách của người bán 2 không?"
      en: "Table `orders` has `customer_id int REFERENCES customers (id)`, where `customers.id` is one primary key across all sellers. Both tables have a `tenant_id` column. Does the database stop an order of seller 1 from pointing at a customer of seller 2?"
    options:
      - { vi: "Có, vì cả hai bảng đều có cột tenant_id riêng", en: "Yes, because both tables have their own tenant_id column" }
      - { vi: "Không: phải là khóa ngoại ghép trên cả hai cột", en: "No: it takes a composite foreign key on both columns" }
      - { vi: "Có, miễn là bảng đã bật bảo mật theo dòng", en: "Yes, as long as the table has row-level security on" }
    answer: 1
    trap: 0
    why:
      vi: "\"Có\" nghe hợp lý vì cột `tenant_id` có mặt ở cả hai bảng, nhưng database chỉ kiểm những cột nằm trong ràng buộc. Khóa ngoại trên `id` chỉ hỏi \"có khách mang mã này không\", không nhìn `tenant_id`, nên đơn của người bán 1 trỏ tới khách của người bán 2 vẫn qua. Bảo mật theo dòng (row-level security, RLS) cũng không cứu: theo docs chính thức của Postgres, phép kiểm khóa ngoại bỏ qua RLS. Chỉ khóa ngoại ghép `(tenant_id, customer_id)` bắt hai cột khớp cùng lúc."
      en: "\"Yes\" sounds right because `tenant_id` is in both tables, but the database only checks the columns inside the constraint. A foreign key on `id` only asks \"does a customer with this id exist\", never looking at `tenant_id`, so seller 1's order pointing at seller 2's customer passes. Row-level security (RLS) does not help either: per the official Postgres docs, foreign key checks bypass RLS. Only a composite foreign key `(tenant_id, customer_id)` forces both columns to match at once."
  - q:
      vi: "Vì sao khóa chính là `(tenant_id, id)` mà không phải `(id, tenant_id)`?"
      en: "Why is the primary key `(tenant_id, id)` and not `(id, tenant_id)`?"
    options:
      - { vi: "Thứ tự cột trong khóa không quan trọng, chỉ cần đủ các cột", en: "The column order in a key does not matter, only the set of columns" }
      - { vi: "Mọi câu lọc theo tenant, nên cột đầu giữ dòng tenant liền nhau", en: "Queries filter by tenant, so leading with it keeps their rows together" }
      - { vi: "Postgres bắt cột NOT NULL phải đứng đầu khóa chính ghép", en: "Postgres requires NOT NULL columns first in a composite primary key" }
    answer: 1
    trap: 0
    why:
      vi: "Nhiều người nghĩ khóa chỉ là luật duy nhất, nên thứ tự cột không đổi gì. Thật ra khóa chính tạo một index B-tree sắp theo đúng thứ tự cột: cột đầu trước, cột sau chỉ sắp trong cùng một giá trị cột đầu. Đặt `tenant_id` đầu thì mọi dòng của người bán 2 nằm liền nhau, và câu `WHERE tenant_id = …` đọc một đoạn liền của index; với `(id, tenant_id)`, dòng của người bán 2 rải khắp index. Postgres không có luật nào về cột NOT NULL đứng đầu: mọi cột khóa chính đều tự thành NOT NULL."
      en: "Many people think a key is only a uniqueness rule, so the column order changes nothing. In fact the primary key builds a B-tree index sorted in exactly that column order: first column first, the next one only within each first-column value. With `tenant_id` first, all of seller 2's rows sit together and `WHERE tenant_id = …` reads one contiguous range of the index; with `(id, tenant_id)`, seller 2's rows are spread across the whole index. Postgres has no rule about NOT NULL columns going first: every primary key column becomes NOT NULL anyway."
---
## Mở bài

Ở Chợ Lồng Đèn, khách số 7 của Lan Silk không phải khách số 7 của Minh Tea. Nếu khóa chỉ là `id`, một đơn của người bán này có thể lặng lẽ trỏ sang khách của người bán kia, và trang quản lý hiện tên người lạ. Bài này đặt `tenant_id` vào chính các khóa, để database tự chặn chuyện đó.

## Ý chính

Một **tenant** (khách hàng thuê hệ thống) là một tổ chức mà dữ liệu phải tách khỏi các tổ chức khác; ở đây mỗi người bán là một tenant. Khi mọi tenant dùng chung bảng (mô hình pool, `e-ds-l4-08`), mỗi dòng mang `tenant_id`. Nhiều người nghĩ thêm cột là đủ. Thật ra cột chỉ ghi chủ của dòng; khóa mới là thứ database kiểm.

Khóa chính `(tenant_id, id)` cho mỗi tenant đánh số riêng, giữ dữ liệu một tenant nằm liền nhau trong index, và khi chuyển một tenant sang máy khác thì số của họ không đụng số của ai. Khóa ngoại ghép `(tenant_id, customer_id)` trỏ tới `(tenant_id, id)` của bảng cha: hai cột phải khớp cùng lúc, nên một đơn chỉ trỏ được tới khách của chính người bán đó. Khóa ngoại một cột trên `id` không biết chủ là ai, nên nó nhận cả tham chiếu chéo.

Ba thói quen đi kèm: đánh index cho khóa ngoại ghép ở bảng con (xóa dòng cha khỏi phải quét cả bảng con), nối hai bảng bằng cả hai cột, và giữ khóa ngoại một chiều cha → con để chép hay xóa trọn một tenant theo đúng thứ tự.

**Khi id đã là số toàn cục**: nhiều hệ thống có sẵn `id` sinh từ một sequence chung hay UUID, duy nhất trên cả chợ. Không cần đánh số lại. Thêm `UNIQUE (tenant_id, id)` ở bảng cha là đủ để khóa ngoại ghép trỏ vào; khóa chính vẫn có thể là `id`. Cái giá: hai index thay vì một, và dòng của một tenant không còn nằm liền nhau trong index của khóa chính. Với bảng mới, `(tenant_id, id)` làm khóa chính vẫn gọn hơn.

**Đổi một bảng đang chạy**: thêm khóa ngoại ghép vào bảng lớn thì Postgres phải kiểm mọi dòng cũ. Cách êm có hai bước: `ADD FOREIGN KEY … NOT VALID` chỉ kiểm dòng ghi từ lúc đó, rồi `VALIDATE CONSTRAINT` quét dòng cũ mà không chặn ghi. Nếu bước kiểm báo lỗi 23503, đó chính là những tham chiếu chéo đã lọt vào từ trước: sửa dữ liệu, rồi kiểm lại.

**Số riêng cho từng tenant**: một sequence chung vẫn đủ cho `(tenant_id, id)`, số chỉ có khoảng trống. Khi người bán muốn hóa đơn của mình bắt đầu từ 1 và liền nhau, dùng một bảng đếm theo tenant: `UPDATE counters SET n = n + 1 WHERE tenant_id = 2 RETURNING n` trong cùng transaction ghi hóa đơn. Lệnh này giữ lock trên dòng đếm của đúng một tenant, nên hai người bán không phải chờ nhau.

Hình từng bước thứ nhất ở cuối mục này so ba cách chia khách; nó mở ở bước Pool (mọi khách chung bảng), cho thấy vì sao `tenant_id` phải đứng đầu khóa. Hình thứ hai vẽ khóa ngoại ghép của lab: ba người bán cùng có khách số 7, và đơn của người bán 1 ghi khách 7 chỉ trỏ tới (1, 7), không bao giờ tới (2, 7).

## Cú pháp

```sql
CREATE TABLE child (
  tenant_id int NOT NULL,
  id int NOT NULL,
  parent_id int NOT NULL,
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, parent_id)
    REFERENCES parent (tenant_id, id)
);
CREATE INDEX ON child
  (tenant_id, parent_id);
```

- Bảng cha phải có khóa chính hoặc `UNIQUE` trên đúng `(tenant_id, id)` thì khóa ngoại ghép mới tạo được.
- Khóa ngoại ghép không tự có index ở bảng con; tạo nó bằng tay.
- Câu nối: `ON c.tenant_id = o.tenant_id AND c.id = o.customer_id`.

## Ví dụ

Mỗi người bán có khách số 7 của riêng mình: cùng `id`, khác `tenant_id`.

```sql
SELECT tenant_id, id, name
FROM customers
WHERE id = 7
ORDER BY tenant_id;
```

Bảng con mang khóa ghép ở cả hai đầu:

```sql
CREATE TABLE ex_orders (
  tenant_id int NOT NULL,
  id int NOT NULL,
  customer_id int NOT NULL,
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, customer_id)
    REFERENCES customers (tenant_id, id)
);
INSERT INTO ex_orders VALUES (1, 1, 7);
SELECT * FROM ex_orders;
```

Một cổng kiểm trong CI có thể đọc `pg_constraint` và báo bảng nào có khóa không bắt đầu bằng `tenant_id`:

```sql
SELECT conname,
  pg_get_constraintdef(oid) AS def
FROM pg_constraint
WHERE conrelid = 'ex_orders'::regclass
ORDER BY conname;
```

## Lỗi hay gặp

Khóa ngoại một cột nhận tham chiếu sang tenant khác:

```sql
-- WRONG: the key knows no tenant
CREATE TABLE ex_clients (
  id int PRIMARY KEY,
  tenant_id int NOT NULL
);
INSERT INTO ex_clients
VALUES (10, 1), (20, 2);
CREATE TABLE ex_sales (
  tenant_id int NOT NULL,
  id int NOT NULL,
  client_id int REFERENCES ex_clients,
  PRIMARY KEY (tenant_id, id)
);
INSERT INTO ex_sales VALUES (1, 1, 20);
SELECT count(*) AS cross_tenant
FROM ex_sales s
JOIN ex_clients c ON c.id = s.client_id
WHERE c.tenant_id <> s.tenant_id;
```

```sql
-- FIX: carry tenant_id into the key
DELETE FROM ex_sales;
ALTER TABLE ex_clients
  ADD UNIQUE (tenant_id, id);
ALTER TABLE ex_sales
  ADD FOREIGN KEY (tenant_id, client_id)
  REFERENCES ex_clients (tenant_id, id);
SELECT count(*) AS cross_tenant
FROM ex_sales s
JOIN ex_clients c ON c.id = s.client_id
WHERE c.tenant_id <> s.tenant_id;
```

Câu sai đếm được 1 đơn chéo; sau khi sửa còn 0, và đơn chéo không vào được nữa:

```sql
-- ERROR 23503: client 20 is seller 2's
INSERT INTO ex_sales VALUES (1, 1, 20);
```

Khóa chính chỉ trên `id` thì hai tenant không thể cùng có hóa đơn số 1, và số hóa đơn lộ ra tổng số của cả chợ:

```sql
CREATE TABLE ex_invoices (
  id int PRIMARY KEY,
  tenant_id int NOT NULL
);
INSERT INTO ex_invoices VALUES (1, 1);
-- ERROR 23505: seller 2 needs no. 1
INSERT INTO ex_invoices VALUES (1, 2);
```

## Thực hành

Bốn bước: tạo `orders` với khóa ghép ở cả hai đầu, đánh index cho khóa ngoại, ghi hai đơn của người bán 2, rồi nối lại bằng cả hai cột cho trang đơn hàng. Sau đó là hai câu hỏi.

## Tóm tắt

- Mỗi bảng của tenant: `tenant_id` đầu khóa chính, `PRIMARY KEY (tenant_id, id)`.
- Khóa ngoại ghép `(tenant_id, x)` → `(tenant_id, id)`: database tự chặn tham chiếu chéo (lỗi 23503).
- Đánh index cho khóa ngoại ghép ở bảng con, và nối bảng bằng cả hai cột.
- Đọc tiếp: `e-ds-l2-07` (duy nhất theo từng tenant) và `e-ds-l4-09` (bản đồ chủ đề nhiều khách hàng).

# EN

## Opening

At Lantern Market, customer 7 of Lan Silk is not customer 7 of Minh Tea. If the key is only `id`, an order of one seller can quietly point at another seller's customer, and the seller page shows a stranger's name. This lesson puts `tenant_id` into the keys themselves, so the database stops that on its own.

## Key idea

A **tenant** is an organisation whose data must stay apart from every other organisation's; here each seller is a tenant. When all tenants share tables (the pool model, `e-ds-l4-08`), every row carries `tenant_id`. Many people think adding the column is enough. In fact the column only records the row's owner; the keys are what the database checks.

A primary key `(tenant_id, id)` lets each tenant number its own rows, keeps one tenant's rows together in the index, and when a tenant moves to another server its numbers collide with no one's. A composite foreign key `(tenant_id, customer_id)` points to the parent's `(tenant_id, id)`: both columns must match at once, so an order can only point at its own seller's customer. A single-column foreign key on `id` does not know the owner, so it accepts a cross-tenant reference too.

Three habits come with it: index the composite foreign key on the child side (deleting a parent then does not scan the whole child table), join two tables on both columns, and keep foreign keys one way, parent → child, so a whole tenant can be copied or deleted in the right order.

**When the id is already global**: many systems already have an `id` from a shared sequence or a UUID, unique across the whole market. There is no need to renumber. A `UNIQUE (tenant_id, id)` on the parent is enough for a composite foreign key to point at; the primary key can stay `id`. The price: two indexes instead of one, and one tenant's rows no longer sit together in the primary key's index. For a new table, `(tenant_id, id)` as the primary key is still tidier.

**Changing a live table**: adding a composite foreign key to a big table makes Postgres check every old row. The smooth way has two steps: `ADD FOREIGN KEY … NOT VALID` checks only rows written from then on, then `VALIDATE CONSTRAINT` scans the old rows without blocking writes. If that check reports error 23503, those are exactly the cross-tenant references that slipped in earlier: fix the data, then validate again.

**Per-tenant numbers**: one shared sequence is still enough for `(tenant_id, id)`; the numbers just have gaps. When a seller wants its invoices to start at 1 with no gaps, use a counter table per tenant: `UPDATE counters SET n = n + 1 WHERE tenant_id = 2 RETURNING n` in the same transaction that writes the invoice. It holds a lock on one tenant's counter row only, so two sellers never wait for each other.

The first step-through figure at the end of this section compares the three ways to split tenants; it opens on the Pool step (every tenant in one table), which shows why `tenant_id` leads the key. The second draws the lab's composite foreign key: three sellers all have customer 7, and seller 1's order naming customer 7 points at (1, 7), never at (2, 7).

## Syntax

```sql
CREATE TABLE child (
  tenant_id int NOT NULL,
  id int NOT NULL,
  parent_id int NOT NULL,
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, parent_id)
    REFERENCES parent (tenant_id, id)
);
CREATE INDEX ON child
  (tenant_id, parent_id);
```

- The parent needs a primary key or a `UNIQUE` on exactly `(tenant_id, id)` before the composite foreign key can be created.
- A composite foreign key gets no index on the child side by itself; create it by hand.
- The join: `ON c.tenant_id = o.tenant_id AND c.id = o.customer_id`.

## Example

Each seller has its own customer 7: the same `id`, a different `tenant_id`.

```sql
SELECT tenant_id, id, name
FROM customers
WHERE id = 7
ORDER BY tenant_id;
```

The child table carries composite keys at both ends:

```sql
CREATE TABLE ex_orders (
  tenant_id int NOT NULL,
  id int NOT NULL,
  customer_id int NOT NULL,
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, customer_id)
    REFERENCES customers (tenant_id, id)
);
INSERT INTO ex_orders VALUES (1, 1, 7);
SELECT * FROM ex_orders;
```

A CI gate can read `pg_constraint` and report every table whose keys do not start with `tenant_id`:

```sql
SELECT conname,
  pg_get_constraintdef(oid) AS def
FROM pg_constraint
WHERE conrelid = 'ex_orders'::regclass
ORDER BY conname;
```

## Common mistakes

A single-column foreign key accepts a reference to another tenant:

```sql
-- WRONG: the key knows no tenant
CREATE TABLE ex_clients (
  id int PRIMARY KEY,
  tenant_id int NOT NULL
);
INSERT INTO ex_clients
VALUES (10, 1), (20, 2);
CREATE TABLE ex_sales (
  tenant_id int NOT NULL,
  id int NOT NULL,
  client_id int REFERENCES ex_clients,
  PRIMARY KEY (tenant_id, id)
);
INSERT INTO ex_sales VALUES (1, 1, 20);
SELECT count(*) AS cross_tenant
FROM ex_sales s
JOIN ex_clients c ON c.id = s.client_id
WHERE c.tenant_id <> s.tenant_id;
```

```sql
-- FIX: carry tenant_id into the key
DELETE FROM ex_sales;
ALTER TABLE ex_clients
  ADD UNIQUE (tenant_id, id);
ALTER TABLE ex_sales
  ADD FOREIGN KEY (tenant_id, client_id)
  REFERENCES ex_clients (tenant_id, id);
SELECT count(*) AS cross_tenant
FROM ex_sales s
JOIN ex_clients c ON c.id = s.client_id
WHERE c.tenant_id <> s.tenant_id;
```

The wrong version counts 1 cross-tenant order; after the fix it is 0, and a cross-tenant order can no longer get in:

```sql
-- ERROR 23503: client 20 is seller 2's
INSERT INTO ex_sales VALUES (1, 1, 20);
```

With a primary key on `id` alone, two tenants cannot both have invoice 1, and the invoice number gives away the count of the whole market:

```sql
CREATE TABLE ex_invoices (
  id int PRIMARY KEY,
  tenant_id int NOT NULL
);
INSERT INTO ex_invoices VALUES (1, 1);
-- ERROR 23505: seller 2 needs no. 1
INSERT INTO ex_invoices VALUES (1, 2);
```

## Practice

Four steps: create `orders` with composite keys at both ends, index the foreign key, record two orders of seller 2, then join back on both columns for the order page. Then two questions.

## Recap

- Every tenant table: `tenant_id` first in the primary key, `PRIMARY KEY (tenant_id, id)`.
- A composite foreign key `(tenant_id, x)` → `(tenant_id, id)`: the database blocks cross-tenant references itself (error 23503).
- Index the composite foreign key on the child side, and join tables on both columns.
- Read next: `e-ds-l2-07` (unique per tenant) and `e-ds-l4-09` (the multi-tenant topic map).
