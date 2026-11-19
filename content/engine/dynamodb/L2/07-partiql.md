---
id: e-dy-l2-07
engine: dynamodb
level: L2
module: partiql-cost
title: "PartiQL: cú pháp giống SQL, luật vẫn của DynamoDB"
title_en: "PartiQL: SQL-like syntax, DynamoDB rules"
kind: lab
runtime: browser
minutes: 12
objectives:
  - vi: Viết `SELECT`, `UPDATE`, `INSERT` bằng PartiQL qua `ExecuteStatement`.
    en: Write `SELECT`, `UPDATE` and `INSERT` in PartiQL through `ExecuteStatement`.
  - vi: Nhận ra `SELECT` nào thành Query và `SELECT` nào thành Scan.
    en: Tell which `SELECT` becomes a Query and which `SELECT` becomes a Scan.
requires: [e-dy-l2-02]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ql-reference.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ql-reference.select.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ql-reference.update.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ql-reference.insert.html
lab:
  setup: |
    {"tables": [{"TableName":"Orders","KeySchema":[{"AttributeName":"customerId","KeyType":"HASH"},{"AttributeName":"orderId","KeyType":"RANGE"}],"AttributeDefinitions":[{"AttributeName":"customerId","AttributeType":"S"},{"AttributeName":"orderId","AttributeType":"S"}],"BillingMode":"PAY_PER_REQUEST"}],
     "items": {"Orders": [
      {"customerId":"C-01","orderId":"2026-07-28#O-101","status":"DELIVERED","total":770000,"city":"Quy Nhon"},
      {"customerId":"C-01","orderId":"2026-08-28#O-102","status":"DELIVERED","total":770000,"city":"Quy Nhon"},
      {"customerId":"C-01","orderId":"2026-09-17#O-103","status":"SHIPPED","total":800000,"city":"Quy Nhon"},
      {"customerId":"C-01","orderId":"2026-10-19#O-104","status":"DELIVERED","total":120000,"city":"Quy Nhon"},
      {"customerId":"C-02","orderId":"2026-07-25#O-105","status":"SHIPPED","total":640000,"city":"Da Nang"},
      {"customerId":"C-02","orderId":"2026-08-26#O-106","status":"PAID","total":910000,"city":"Da Nang"},
      {"customerId":"C-02","orderId":"2026-09-17#O-107","status":"DELIVERED","total":210000,"city":"Da Nang"},
      {"customerId":"C-02","orderId":"2026-10-03#O-108","status":"NEW","total":820000,"city":"Da Nang"},
      {"customerId":"C-03","orderId":"2026-07-05#O-109","status":"SHIPPED","total":560000,"city":"Da Nang"},
      {"customerId":"C-03","orderId":"2026-08-03#O-110","status":"PAID","total":310000,"city":"Da Nang"},
      {"customerId":"C-03","orderId":"2026-09-28#O-111","status":"DELIVERED","total":750000,"city":"Da Nang"},
      {"customerId":"C-03","orderId":"2026-10-13#O-112","status":"NEW","total":580000,"city":"Da Nang"},
      {"customerId":"C-04","orderId":"2026-07-15#O-113","status":"SHIPPED","total":420000,"city":"Hue"},
      {"customerId":"C-04","orderId":"2026-08-16#O-114","status":"DELIVERED","total":900000,"city":"Hue"},
      {"customerId":"C-04","orderId":"2026-09-02#O-115","status":"SHIPPED","total":120000,"city":"Hue"},
      {"customerId":"C-04","orderId":"2026-10-15#O-116","status":"SHIPPED","total":130000,"city":"Hue"},
      {"customerId":"C-05","orderId":"2026-07-24#O-117","status":"DELIVERED","total":440000,"city":"Hoi An"},
      {"customerId":"C-05","orderId":"2026-08-02#O-118","status":"DELIVERED","total":260000,"city":"Hoi An"},
      {"customerId":"C-05","orderId":"2026-09-09#O-119","status":"DELIVERED","total":670000,"city":"Hoi An"},
      {"customerId":"C-05","orderId":"2026-10-20#O-120","status":"NEW","total":680000,"city":"Hoi An"},
      {"customerId":"C-06","orderId":"2026-07-18#O-121","status":"PAID","total":280000,"city":"Hue"},
      {"customerId":"C-06","orderId":"2026-08-25#O-122","status":"SHIPPED","total":440000,"city":"Hue"},
      {"customerId":"C-06","orderId":"2026-09-22#O-123","status":"DELIVERED","total":80000,"city":"Hue"},
      {"customerId":"C-06","orderId":"2026-10-18#O-124","status":"NEW","total":690000,"city":"Hue"},
      {"customerId":"C-07","orderId":"2026-07-23#O-125","status":"PAID","total":210000,"city":"Hoi An"},
      {"customerId":"C-07","orderId":"2026-08-08#O-126","status":"DELIVERED","total":790000,"city":"Hoi An"},
      {"customerId":"C-07","orderId":"2026-09-02#O-127","status":"DELIVERED","total":690000,"city":"Hoi An"},
      {"customerId":"C-07","orderId":"2026-10-05#O-128","status":"PAID","total":680000,"city":"Hoi An"},
      {"customerId":"C-08","orderId":"2026-07-17#O-129","status":"SHIPPED","total":680000,"city":"Da Nang"},
      {"customerId":"C-08","orderId":"2026-08-20#O-130","status":"SHIPPED","total":440000,"city":"Da Nang"},
      {"customerId":"C-08","orderId":"2026-09-07#O-131","status":"SHIPPED","total":660000,"city":"Da Nang"},
      {"customerId":"C-08","orderId":"2026-10-06#O-132","status":"NEW","total":590000,"city":"Da Nang"},
      {"customerId":"C-09","orderId":"2026-07-23#O-133","status":"PAID","total":280000,"city":"Hoi An"},
      {"customerId":"C-09","orderId":"2026-08-26#O-134","status":"DELIVERED","total":790000,"city":"Hoi An"},
      {"customerId":"C-09","orderId":"2026-09-18#O-135","status":"SHIPPED","total":710000,"city":"Hoi An"},
      {"customerId":"C-09","orderId":"2026-10-01#O-136","status":"NEW","total":140000,"city":"Hoi An"},
      {"customerId":"C-10","orderId":"2026-07-24#O-137","status":"SHIPPED","total":90000,"city":"Quy Nhon"},
      {"customerId":"C-10","orderId":"2026-08-01#O-138","status":"PAID","total":910000,"city":"Quy Nhon"},
      {"customerId":"C-10","orderId":"2026-09-12#O-139","status":"PAID","total":490000,"city":"Quy Nhon"},
      {"customerId":"C-10","orderId":"2026-10-04#O-140","status":"NEW","total":400000,"city":"Quy Nhon"},
      {"customerId":"C-11","orderId":"2026-07-05#O-141","status":"SHIPPED","total":500000,"city":"Hoi An"},
      {"customerId":"C-11","orderId":"2026-08-12#O-142","status":"SHIPPED","total":930000,"city":"Hoi An"},
      {"customerId":"C-11","orderId":"2026-09-22#O-143","status":"PAID","total":350000,"city":"Hoi An"},
      {"customerId":"C-11","orderId":"2026-10-21#O-144","status":"SHIPPED","total":90000,"city":"Hoi An"},
      {"customerId":"C-12","orderId":"2026-07-27#O-145","status":"SHIPPED","total":110000,"city":"Hoi An"},
      {"customerId":"C-12","orderId":"2026-08-28#O-146","status":"DELIVERED","total":900000,"city":"Hoi An"},
      {"customerId":"C-12","orderId":"2026-09-28#O-147","status":"SHIPPED","total":160000,"city":"Hoi An"},
      {"customerId":"C-12","orderId":"2026-10-18#O-148","status":"SHIPPED","total":560000,"city":"Hoi An"},
      {"customerId":"C-13","orderId":"2026-07-26#O-149","status":"DELIVERED","total":930000,"city":"Quy Nhon"},
      {"customerId":"C-13","orderId":"2026-08-01#O-150","status":"PAID","total":920000,"city":"Quy Nhon"},
      {"customerId":"C-13","orderId":"2026-09-28#O-151","status":"PAID","total":150000,"city":"Quy Nhon"},
      {"customerId":"C-13","orderId":"2026-10-25#O-152","status":"NEW","total":170000,"city":"Quy Nhon"},
      {"customerId":"C-14","orderId":"2026-07-27#O-153","status":"SHIPPED","total":620000,"city":"Hue"},
      {"customerId":"C-14","orderId":"2026-08-06#O-154","status":"SHIPPED","total":640000,"city":"Hue"},
      {"customerId":"C-14","orderId":"2026-09-06#O-155","status":"SHIPPED","total":480000,"city":"Hue"},
      {"customerId":"C-14","orderId":"2026-10-17#O-156","status":"NEW","total":440000,"city":"Hue"},
      {"customerId":"C-15","orderId":"2026-07-07#O-157","status":"SHIPPED","total":740000,"city":"Da Nang"},
      {"customerId":"C-15","orderId":"2026-08-06#O-158","status":"SHIPPED","total":400000,"city":"Da Nang"},
      {"customerId":"C-15","orderId":"2026-09-28#O-159","status":"DELIVERED","total":790000,"city":"Da Nang"},
      {"customerId":"C-15","orderId":"2026-10-28#O-160","status":"SHIPPED","total":220000,"city":"Da Nang"},
      {"customerId":"C-16","orderId":"2026-07-08#O-161","status":"SHIPPED","total":590000,"city":"Da Nang"},
      {"customerId":"C-16","orderId":"2026-08-21#O-162","status":"PAID","total":640000,"city":"Da Nang"},
      {"customerId":"C-16","orderId":"2026-09-26#O-163","status":"SHIPPED","total":490000,"city":"Da Nang"},
      {"customerId":"C-16","orderId":"2026-10-07#O-164","status":"DELIVERED","total":670000,"city":"Da Nang"},
      {"customerId":"C-17","orderId":"2026-07-25#O-165","status":"PAID","total":360000,"city":"Da Nang"},
      {"customerId":"C-17","orderId":"2026-08-26#O-166","status":"DELIVERED","total":100000,"city":"Da Nang"},
      {"customerId":"C-17","orderId":"2026-09-17#O-167","status":"SHIPPED","total":170000,"city":"Da Nang"},
      {"customerId":"C-17","orderId":"2026-10-08#O-168","status":"NEW","total":400000,"city":"Da Nang"},
      {"customerId":"C-18","orderId":"2026-07-21#O-169","status":"SHIPPED","total":710000,"city":"Quy Nhon"},
      {"customerId":"C-18","orderId":"2026-08-01#O-170","status":"SHIPPED","total":700000,"city":"Quy Nhon"},
      {"customerId":"C-18","orderId":"2026-09-05#O-171","status":"PAID","total":910000,"city":"Quy Nhon"},
      {"customerId":"C-18","orderId":"2026-10-01#O-172","status":"NEW","total":160000,"city":"Quy Nhon"},
      {"customerId":"C-19","orderId":"2026-07-20#O-173","status":"SHIPPED","total":940000,"city":"Da Nang"},
      {"customerId":"C-19","orderId":"2026-08-17#O-174","status":"PAID","total":370000,"city":"Da Nang"},
      {"customerId":"C-19","orderId":"2026-09-06#O-175","status":"PAID","total":850000,"city":"Da Nang"},
      {"customerId":"C-19","orderId":"2026-10-06#O-176","status":"NEW","total":260000,"city":"Da Nang"},
      {"customerId":"C-20","orderId":"2026-07-13#O-177","status":"PAID","total":780000,"city":"Hue"},
      {"customerId":"C-20","orderId":"2026-08-06#O-178","status":"PAID","total":780000,"city":"Hue"},
      {"customerId":"C-20","orderId":"2026-09-19#O-179","status":"SHIPPED","total":910000,"city":"Hue"},
      {"customerId":"C-20","orderId":"2026-10-09#O-180","status":"SHIPPED","total":910000,"city":"Hue"},
      {"customerId":"C-21","orderId":"2026-07-15#O-181","status":"PAID","total":630000,"city":"Da Nang"},
      {"customerId":"C-21","orderId":"2026-08-20#O-182","status":"DELIVERED","total":840000,"city":"Da Nang"},
      {"customerId":"C-21","orderId":"2026-09-25#O-183","status":"DELIVERED","total":530000,"city":"Da Nang"},
      {"customerId":"C-21","orderId":"2026-10-10#O-184","status":"SHIPPED","total":830000,"city":"Da Nang"},
      {"customerId":"C-22","orderId":"2026-07-01#O-185","status":"PAID","total":380000,"city":"Da Nang"},
      {"customerId":"C-22","orderId":"2026-08-12#O-186","status":"DELIVERED","total":580000,"city":"Da Nang"},
      {"customerId":"C-22","orderId":"2026-09-24#O-187","status":"SHIPPED","total":920000,"city":"Da Nang"},
      {"customerId":"C-22","orderId":"2026-10-04#O-188","status":"SHIPPED","total":400000,"city":"Da Nang"},
      {"customerId":"C-23","orderId":"2026-07-22#O-189","status":"PAID","total":510000,"city":"Quy Nhon"},
      {"customerId":"C-23","orderId":"2026-08-22#O-190","status":"DELIVERED","total":510000,"city":"Quy Nhon"},
      {"customerId":"C-23","orderId":"2026-09-26#O-191","status":"DELIVERED","total":520000,"city":"Quy Nhon"},
      {"customerId":"C-23","orderId":"2026-10-28#O-192","status":"NEW","total":440000,"city":"Quy Nhon"},
      {"customerId":"C-24","orderId":"2026-07-20#O-193","status":"DELIVERED","total":720000,"city":"Hue"},
      {"customerId":"C-24","orderId":"2026-08-10#O-194","status":"DELIVERED","total":160000,"city":"Hue"},
      {"customerId":"C-24","orderId":"2026-09-22#O-195","status":"DELIVERED","total":800000,"city":"Hue"},
      {"customerId":"C-24","orderId":"2026-10-08#O-196","status":"NEW","total":440000,"city":"Hue"},
      {"customerId":"C-25","orderId":"2026-07-16#O-197","status":"DELIVERED","total":690000,"city":"Da Nang"},
      {"customerId":"C-25","orderId":"2026-08-06#O-198","status":"PAID","total":590000,"city":"Da Nang"},
      {"customerId":"C-25","orderId":"2026-09-11#O-199","status":"DELIVERED","total":870000,"city":"Da Nang"},
      {"customerId":"C-25","orderId":"2026-10-03#O-200","status":"NEW","total":460000,"city":"Da Nang"},
      {"customerId":"C-26","orderId":"2026-07-28#O-201","status":"SHIPPED","total":280000,"city":"Hoi An"},
      {"customerId":"C-26","orderId":"2026-08-11#O-202","status":"SHIPPED","total":170000,"city":"Hoi An"},
      {"customerId":"C-26","orderId":"2026-09-08#O-203","status":"SHIPPED","total":850000,"city":"Hoi An"},
      {"customerId":"C-26","orderId":"2026-10-12#O-204","status":"NEW","total":370000,"city":"Hoi An"},
      {"customerId":"C-27","orderId":"2026-07-27#O-205","status":"DELIVERED","total":730000,"city":"Hue"},
      {"customerId":"C-27","orderId":"2026-08-06#O-206","status":"SHIPPED","total":480000,"city":"Hue"},
      {"customerId":"C-27","orderId":"2026-09-02#O-207","status":"SHIPPED","total":810000,"city":"Hue"},
      {"customerId":"C-27","orderId":"2026-10-24#O-208","status":"NEW","total":260000,"city":"Hue"},
      {"customerId":"C-28","orderId":"2026-07-04#O-209","status":"SHIPPED","total":260000,"city":"Hoi An"},
      {"customerId":"C-28","orderId":"2026-08-04#O-210","status":"PAID","total":550000,"city":"Hoi An"},
      {"customerId":"C-28","orderId":"2026-09-20#O-211","status":"SHIPPED","total":530000,"city":"Hoi An"},
      {"customerId":"C-28","orderId":"2026-10-18#O-212","status":"PAID","total":850000,"city":"Hoi An"},
      {"customerId":"C-29","orderId":"2026-07-17#O-213","status":"SHIPPED","total":210000,"city":"Quy Nhon"},
      {"customerId":"C-29","orderId":"2026-08-11#O-214","status":"SHIPPED","total":890000,"city":"Quy Nhon"},
      {"customerId":"C-29","orderId":"2026-09-04#O-215","status":"SHIPPED","total":740000,"city":"Quy Nhon"},
      {"customerId":"C-29","orderId":"2026-10-18#O-216","status":"NEW","total":410000,"city":"Quy Nhon"},
      {"customerId":"C-30","orderId":"2026-07-25#O-217","status":"DELIVERED","total":410000,"city":"Quy Nhon"},
      {"customerId":"C-30","orderId":"2026-08-18#O-218","status":"DELIVERED","total":250000,"city":"Quy Nhon"},
      {"customerId":"C-30","orderId":"2026-09-14#O-219","status":"SHIPPED","total":520000,"city":"Quy Nhon"},
      {"customerId":"C-30","orderId":"2026-10-18#O-220","status":"DELIVERED","total":240000,"city":"Quy Nhon"}
    ]}}
  steps:
    - task:
        vi: Bằng PartiQL, lấy mọi đơn của khách `C-04`.
        en: With PartiQL, get every order of customer `C-04`.
      solution: |
        SELECT * FROM Orders WHERE customerId = 'C-04'
      check: doc
      ordered: true
      hint:
        vi: Chuỗi trong PartiQL dùng nháy đơn. Điều kiện bằng trên partition key biến câu này thành một Query.
        en: PartiQL strings use single quotes. An equality on the partition key turns this into a Query.
    - task:
        vi: Bằng PartiQL, lấy `orderId` và `total` các đơn tháng 10/2026 của `C-15`.
        en: With PartiQL, get the `orderId` and `total` of the October 2026 orders of `C-15`.
      solution: |
        SELECT orderId, "total" FROM Orders WHERE customerId = 'C-15' AND begins_with(orderId, '2026-10')
      check: doc
      ordered: true
      hint:
        vi: 'Tên trùng từ dành riêng được bọc nháy kép: `"total"`. `begins_with` dùng được trong `WHERE`.'
        en: 'Names that clash with reserved words go in double quotes: `"total"`. `begins_with` works in `WHERE`.'
    - task:
        vi: Bằng PartiQL, đổi `status` của đơn `2026-10-15#O-116` (khách `C-04`) thành `DELIVERED`.
        en: With PartiQL, change the `status` of order `2026-10-15#O-116` (customer `C-04`) to `DELIVERED`.
      solution: |
        UPDATE Orders SET "status" = 'DELIVERED' WHERE customerId = 'C-04' AND orderId = '2026-10-15#O-116'
      check: doc
      hint:
        vi: '`UPDATE` của PartiQL sửa đúng một item, nên `WHERE` phải nêu khóa chính đầy đủ.'
        en: 'A PartiQL `UPDATE` changes exactly one item, so `WHERE` must name the full primary key.'
    - task:
        vi: 'Bằng PartiQL, thêm đơn mới cho `C-04` - `orderId` `2026-10-30#O-221`, `status` `NEW`, `total` `260000`, `city` "Hue".'
        en: 'With PartiQL, add a new order for `C-04` - `orderId` `2026-10-30#O-221`, `status` `NEW`, `total` `260000`, `city` "Hue".'
      solution: |
        INSERT INTO Orders VALUE {'customerId': 'C-04', 'orderId': '2026-10-30#O-221', 'status': 'NEW', 'total': 260000, 'city': 'Hue'}
      check: doc
      hint:
        vi: '`INSERT INTO Orders VALUE {…}` với tên thuộc tính trong nháy đơn. Khác `PutItem`, `INSERT` lỗi nếu khóa đã có.'
        en: '`INSERT INTO Orders VALUE {…}` with attribute names in single quotes. Unlike `PutItem`, `INSERT` fails if the key already exists.'
quiz:
  - q:
      vi: "`SELECT * FROM Orders WHERE \"status\" = 'NEW'` chạy thế nào?"
      en: "How does `SELECT * FROM Orders WHERE \"status\" = 'NEW'` run?"
    options:
      - vi: Như một Query, vì có `WHERE`.
        en: As a Query, because it has a `WHERE`.
      - vi: Như một Scan cả bảng, vì `WHERE` không có điều kiện bằng trên partition key.
        en: As a full table Scan, because the `WHERE` has no equality on the partition key.
      - vi: Bị từ chối ngay.
        en: It is rejected right away.
    answer: 1
    why:
      vi: Có `WHERE` nên trông như SQL dùng index. Nhưng PartiQL chỉ đổi cú pháp. Không có điều kiện bằng (hoặc `IN`) trên partition key thì DynamoDB phải đọc cả bảng, với đúng giá và độ chậm của Scan.
      en: It has a `WHERE`, so it looks like SQL using an index. But PartiQL only changes the syntax. Without an equality (or `IN`) on the partition key, DynamoDB has to read the whole table, at the price and speed of a Scan.
---

## Ý chính

PartiQL cho phép viết request DynamoDB bằng cú pháp giống SQL, qua `ExecuteStatement`. Các luật của DynamoDB vẫn giữ nguyên:

- `SELECT` có điều kiện bằng (hoặc `IN`) trên partition key (khóa phân vùng) thành **Query**. Thiếu điều kiện đó thì thành **Scan** cả bảng.
- `UPDATE` và `DELETE` sửa **một item**, nên `WHERE` phải nêu khóa chính đầy đủ.
- `INSERT` lỗi nếu khóa đã có, khác `PutItem` vốn ghi đè.
- Không có JOIN, GROUP BY hay hàm gộp.

Cú pháp: chuỗi trong nháy đơn `'…'`, tên trùng từ dành riêng trong nháy kép `"…"`, map dạng `{'k': v}`.

## Ví dụ

Đọc từ một index (chỉ mục) ở bài L3 bằng tên dạng `"Orders"."byStatus"`:

```text
SELECT * FROM "Orders"."byStatus" WHERE "status" = 'NEW'
```

## Thực hành

Mỗi bước là một câu PartiQL, chạy thẳng qua `ExecuteStatement`. Bước ghi được chấm bằng trạng thái bảng sau khi ghi.

# EN

## Key idea

PartiQL lets you write DynamoDB requests in SQL-like syntax, through `ExecuteStatement`. DynamoDB's rules stay the same:

- A `SELECT` with an equality (or `IN`) on the partition key becomes a **Query**. Without it, it becomes a full table **Scan**.
- `UPDATE` and `DELETE` change **one item**, so `WHERE` must name the full primary key.
- `INSERT` fails if the key exists, unlike `PutItem`, which overwrites.
- No JOIN, GROUP BY or aggregate functions.

Syntax: strings in single quotes `'…'`, reserved-word names in double quotes `"…"`, maps written `{'k': v}`.

## Example

Read from an index (L3) with a name like `"Orders"."byStatus"`:

```text
SELECT * FROM "Orders"."byStatus" WHERE "status" = 'NEW'
```

## Practice

Each step is one PartiQL statement, run directly through `ExecuteStatement`. A write step is graded by the table's state after the write.
