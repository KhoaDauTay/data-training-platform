---
id: e-dy-l3-07
engine: dynamodb
level: L3
module: single-table
title: "Thiết kế một bảng: nhiều loại item, một item collection"
title_en: "Single-table design: many item types, one item collection"
kind: concept
runtime: docs
minutes: 10
viz: dy-single-table
objectives:
  - vi: Đặt nhiều loại thực thể vào một bảng bằng khóa chung `PK`/`SK` và tiền tố như `CUST#`, `ORDER#`.
    en: Put several entity types in one table with generic `PK`/`SK` keys and prefixes such as `CUST#`, `ORDER#`.
  - vi: Giải thích vì sao một Query lấy được "khách và các đơn của khách" thay cho JOIN.
    en: Explain why one Query can return "a customer and their orders" in place of a JOIN.
requires: [e-dy-l3-01]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-general-nosql-design.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-sort-keys.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-adjacency-graphs.html
quiz:
  - q:
      vi: 'Trong bảng `Shop`, item `{PK: "CUST#C-02", SK: "PROFILE"}` và các item `{PK: "CUST#C-02", SK: "ORDER#…"}` nằm cùng nhau. Query `PK = CUST#C-02` trả về gì?'
      en: 'In table `Shop`, the item `{PK: "CUST#C-02", SK: "PROFILE"}` and the items `{PK: "CUST#C-02", SK: "ORDER#…"}` sit together. What does the Query `PK = CUST#C-02` return?'
    options:
      - vi: Chỉ hồ sơ khách.
        en: Only the customer profile.
      - vi: Hồ sơ và mọi đơn của khách, trong một request, sắp theo `SK`.
        en: The profile and every order of the customer, in one request, sorted by `SK`.
      - vi: Lỗi, vì các item khác loại.
        en: An error, because the items are of different types.
    answer: 1
    why:
      vi: Mọi item cùng `PK` là một item collection, dù khác loại. `SK` sắp chúng - "ORDER#…" đứng trước "PROFILE" theo thứ tự byte.
      en: Every item with the same `PK` is one item collection, whatever its type. `SK` sorts them - "ORDER#..." comes before "PROFILE" in byte order.
  - q:
      vi: Vì sao bảng một-bảng thường đặt tên khóa là `PK`, `SK` thay vì `customerId`, `orderId`?
      en: Why does a single table usually name its keys `PK`, `SK` rather than `customerId`, `orderId`?
    options:
      - vi: Vì DynamoDB bắt buộc tên đó.
        en: Because DynamoDB requires those names.
      - vi: Vì mỗi loại item đặt một thứ khác vào khóa (khách, đơn, cửa hàng), nên tên chung mô tả đúng hơn.
        en: Because each item type puts something different in the key (customer, order, store), so a generic name fits better.
      - vi: Vì tên ngắn làm Query nhanh hơn.
        en: Because short names make Queries faster.
    answer: 1
    why:
      vi: Khóa chung cho phép nhiều loại thực thể dùng chung bảng và chung index (GSI overloading). Tên ngắn cũng làm item nhẹ hơn, nhưng đó không phải lý do chính.
      en: Generic keys let many entity types share the table and its indexes (GSI overloading). Short names also make items lighter, but that is not the main reason.
---

## Ý chính

DynamoDB không có JOIN, nên thay vì nối lúc đọc, ta **đặt sẵn dữ liệu cạnh nhau lúc ghi**. Bảng một-bảng (single-table) chứa nhiều loại item, phân biệt bằng tiền tố trong khóa:

- `PK = CUST#C-02`, `SK = PROFILE`: hồ sơ khách.
- `PK = CUST#C-02`, `SK = ORDER#2026-08-28#O-503`: một đơn của khách đó.
- `PK = ORDER#O-503`, `SK = PRODUCT#P-04`: một dòng hàng của đơn.
- `PK = STORE`, `SK = VN#DA-NANG#HAI-CHAU#S-01`: một cửa hàng.

Mỗi `PK` là một item collection. Một Query trên `CUST#C-02` trả cả hồ sơ lẫn đơn, đúng việc mà SQL cần một JOIN.

## Ví dụ

Bấm "Tiếp" trên sơ đồ: các item xếp thành từng item collection, mỗi màu một loại thực thể.

```text
PK            SK                          type
CUST#C-02     ORDER#2026-08-28#O-503      order
CUST#C-02     ORDER#2026-09-05#O-504      order
CUST#C-02     PROFILE                     customer
ORDER#O-503   PRODUCT#P-01                line
ORDER#O-503   PRODUCT#P-02                line
ORDER#O-503   PRODUCT#P-04                line
```

## Thực hành

Một thuộc tính `type` giúp code ứng dụng biết item thuộc loại nào. `type` là từ dành riêng, nên trong biểu thức cần viết qua tên thay thế.

# EN

## Key idea

DynamoDB has no JOIN, so instead of joining at read time we **place data together at write time**. A single table holds many item types, told apart by prefixes in the key:

- `PK = CUST#C-02`, `SK = PROFILE`: the customer profile.
- `PK = CUST#C-02`, `SK = ORDER#2026-08-28#O-503`: one order of that customer.
- `PK = ORDER#O-503`, `SK = PRODUCT#P-04`: one line of the order.
- `PK = STORE`, `SK = VN#DA-NANG#HAI-CHAU#S-01`: one store.

Each `PK` is one item collection. One Query on `CUST#C-02` returns both the profile and the orders, the job SQL needs a JOIN for.

## Example

Press "Next" on the diagram: the items line up into item collections, one colour per entity type.

```text
PK            SK                          type
CUST#C-02     ORDER#2026-08-28#O-503      order
CUST#C-02     ORDER#2026-09-05#O-504      order
CUST#C-02     PROFILE                     customer
ORDER#O-503   PRODUCT#P-01                line
ORDER#O-503   PRODUCT#P-02                line
ORDER#O-503   PRODUCT#P-04                line
```

## Practice

A `type` attribute tells application code what kind of item it is reading. `type` is a reserved word, so expressions must use a stand-in name for it.
