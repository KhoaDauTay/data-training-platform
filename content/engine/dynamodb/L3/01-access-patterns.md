---
id: e-dy-l3-01
engine: dynamodb
level: L3
module: secondary
title: "Mẫu truy cập trước, khóa sau"
title_en: "Access patterns first, keys second"
kind: concept
runtime: docs
minutes: 8
objectives:
  - vi: Liệt kê mẫu truy cập của một ứng dụng trước khi chọn khóa.
    en: List an application's access patterns before choosing keys.
  - vi: Áp dụng các nguyên tắc thiết kế của AWS - ít bảng, dữ liệu liên quan nằm cạnh nhau, dùng thứ tự sort, rải tải.
    en: Apply the AWS design principles - few tables, related data kept together, sort order used, load spread out.
requires: [e-dy-l2-02]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-general-nosql-design.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-design.html
quiz:
  - q:
      vi: Theo AWS, bước đầu tiên khi thiết kế bảng DynamoDB là gì?
      en: According to AWS, what is the first step when designing a DynamoDB table?
    options:
      - vi: Vẽ sơ đồ thực thể chuẩn hóa như SQL, rồi mỗi thực thể một bảng.
        en: Draw a normalised entity diagram as in SQL, then one table per entity.
      - vi: Hiểu các mẫu truy cập (câu hỏi ứng dụng sẽ hỏi) trước, rồi mới thiết kế khóa.
        en: Understand the access patterns (the questions the app will ask) first, then design the keys.
      - vi: Tạo bảng với khóa tự tăng rồi thêm index sau.
        en: Create a table with an auto-increment key and add indexes later.
    answer: 1
    why:
      vi: AWS ghi rõ - không nên bắt đầu thiết kế schema khi chưa biết những câu hỏi nó cần trả lời. Mẫu truy cập quyết định khóa và index.
      en: AWS says you should not start designing the schema until you know the questions it must answer. Access patterns decide the keys and indexes.
  - q:
      vi: Partition key nào dễ gây partition nóng nhất cho bảng đơn hàng có hàng triệu đơn mỗi ngày?
      en: Which partition key is most likely to create a hot partition for an order table with millions of orders a day?
    options:
      - vi: '`customerId`'
        en: '`customerId`'
      - vi: '`orderDate` (ví dụ `2026-10-31`)'
        en: '`orderDate` (for example `2026-10-31`)'
      - vi: '`orderId`'
        en: '`orderId`'
    answer: 1
    why:
      vi: Mọi đơn của cùng một ngày dồn vào một giá trị partition key, nên một partition gánh toàn bộ lượt ghi của ngày đó. Khóa có nhiều giá trị khác nhau và được truy cập đều thì rải tải tốt hơn.
      en: Every order of the same day lands on one partition key value, so one partition takes all of that day's writes. Keys with many distinct, evenly used values spread the load better.
---

## Ý chính

Với SQL, bạn chuẩn hóa dữ liệu trước rồi viết câu hỏi nào cũng được. Với DynamoDB thì ngược lại: **liệt kê câu hỏi trước**, rồi chọn khóa để mỗi câu hỏi là một `GetItem` hoặc một `Query`.

Bốn nguyên tắc từ hướng dẫn thiết kế của AWS:

- **Ít bảng nhất có thể.** Phần lớn ứng dụng chỉ cần một bảng.
- **Dữ liệu đọc cùng nhau thì nằm cạnh nhau**, trong cùng một item collection.
- **Dùng thứ tự sort key** để gom và sắp những thứ liên quan.
- **Rải tải** - partition key có nhiều giá trị, mỗi giá trị được dùng tương đối đều, tránh partition nóng.

## Ví dụ

Bảng mẫu truy cập của tiệm trà trong các bài sau:

```text
1. One customer profile            -> GetItem  PK = CUST#id, SK = PROFILE
2. A customer's orders over time  -> Query    PK = CUST#id, SK begins_with ORDER#
3. The lines of one order          -> Query    PK = ORDER#id
4. Orders that contain a product   -> Query    GSI1 PK = PRODUCT#id
5. Stores in one district          -> Query    PK = STORE, SK begins_with VN#DA-NANG#HAI-CHAU#
6. Open orders by city             -> Query    sparse GSI
```

## Thực hành

Mẫu truy cập mới xuất hiện sau khi ra mắt thì sao? Thêm một GSI (bài kế tiếp). Đó là lý do L3 bắt đầu bằng chỉ mục phụ.

# EN

## Key idea

With SQL you normalise the data first and can then ask any question. DynamoDB works the other way round: **list the questions first**, then pick keys so that each question is one `GetItem` or one `Query`.

Four principles from the AWS design guide:

- **As few tables as possible.** Most applications need only one table.
- **Data read together lives together**, in the same item collection.
- **Use sort key order** to group and sort related things.
- **Spread the load** - a partition key with many values, each used fairly evenly, avoids hot partitions.

## Example

The access pattern table of the tea shop in the next lessons:

```text
1. One customer profile            -> GetItem  PK = CUST#id, SK = PROFILE
2. A customer's orders over time  -> Query    PK = CUST#id, SK begins_with ORDER#
3. The lines of one order          -> Query    PK = ORDER#id
4. Orders that contain a product   -> Query    GSI1 PK = PRODUCT#id
5. Stores in one district          -> Query    PK = STORE, SK begins_with VN#DA-NANG#HAI-CHAU#
6. Open orders by city             -> Query    sparse GSI
```

## Practice

What about an access pattern that appears after launch? Add a GSI (next lesson). That is why L3 starts with secondary indexes.
