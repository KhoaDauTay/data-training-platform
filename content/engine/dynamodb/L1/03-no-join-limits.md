---
id: e-dy-l1-03
engine: dynamodb
level: L1
module: keys
title: "Không JOIN, và những giới hạn cứng"
title_en: "No JOIN, and the hard limits"
kind: concept
runtime: docs
minutes: 7
objectives:
  - vi: Giải thích vì sao DynamoDB không có JOIN, GROUP BY hay subquery phía server, và thay bằng gì.
    en: Explain why DynamoDB has no server-side JOIN, GROUP BY or subquery, and what replaces them.
  - vi: Nhớ các giới hạn cứng - item 400 KB tính cả tên thuộc tính, khóa 2048/1024 byte, mỗi lần Query/Scan tối đa 1 MB.
    en: Remember the hard limits - 400 KB per item including attribute names, keys of 2048/1024 bytes, at most 1 MB per Query/Scan call.
requires: [e-dy-l1-02]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Constraints.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-general-nosql-design.html
quiz:
  - q:
      vi: Một item có hai thuộc tính - "shirt-color" giá trị "R" và "shirt-size" giá trị "M". Cỡ item là bao nhiêu byte?
      en: An item has two attributes - "shirt-color" with value "R" and "shirt-size" with value "M". How many bytes is the item?
    options:
      - vi: 2 byte
        en: 2 bytes
      - vi: 23 byte
        en: 23 bytes
      - vi: 123 byte
        en: 123 bytes
    answer: 1
    why:
      vi: Tên thuộc tính tính vào cỡ item - 11 + 1 + 10 + 1 = 23 byte. 100 byte phụ phí mỗi item chỉ dùng để tính tiền lưu trữ, không tính vào giới hạn 400 KB.
      en: Attribute names count toward item size - 11 + 1 + 10 + 1 = 23 bytes. The 100 bytes of per-item overhead are for storage billing only, not for the 400 KB limit.
  - q:
      vi: Query đọc một item collection 3 MB. Chuyện gì xảy ra?
      en: A Query reads a 3 MB item collection. What happens?
    options:
      - vi: DynamoDB trả cả 3 MB trong một phản hồi.
        en: DynamoDB returns all 3 MB in one response.
      - vi: Request bị lỗi vì vượt 1 MB.
        en: The request fails because it is over 1 MB.
      - vi: Mỗi lần gọi trả tối đa 1 MB kèm `LastEvaluatedKey`; gọi tiếp từ khóa đó.
        en: Each call returns at most 1 MB plus a `LastEvaluatedKey`; call again from that key.
    answer: 2
    why:
      vi: Kết quả mỗi lần Query hoặc Scan tối đa 1 MB. Phần còn lại lấy bằng cách gửi `LastEvaluatedKey` vào `ExclusiveStartKey` của lần gọi sau.
      en: Each Query or Scan call returns at most 1 MB. You get the rest by passing `LastEvaluatedKey` as the next call's `ExclusiveStartKey`.
  - q:
      vi: Trang báo cáo cần "doanh thu theo tháng của mọi khách". DynamoDB làm thế nào?
      en: A report page needs "revenue per month across all customers". How does DynamoDB do it?
    options:
      - vi: Dùng GROUP BY trong Query.
        en: Use GROUP BY in a Query.
      - vi: Không làm phía server - cộng sẵn lúc ghi (một item tổng), hoặc đưa dữ liệu ra công cụ phân tích.
        en: Not on the server - keep a running total when writing (one total item), or export the data to an analytics tool.
      - vi: Dùng JOIN giữa bảng khách và bảng đơn.
        en: JOIN the customer table with the order table.
    answer: 1
    why:
      vi: DynamoDB không có JOIN hay GROUP BY phía server. Mô hình đúng là tính sẵn lúc ghi, hoặc phân tích ở nơi khác.
      en: DynamoDB has no server-side JOIN or GROUP BY. The right model is to precompute at write time, or analyse elsewhere.
---

## Ý chính

DynamoDB giữ tốc độ ổn định ở mọi cỡ bảng bằng một luật: mỗi request chỉ chạm **một item** hoặc **một item collection** tìm được qua khóa. Vì thế nó **không có** JOIN, GROUP BY, window hay subquery phía server.

Thay cho chúng:

- **JOIN**: đặt dữ liệu hay đọc cùng nhau vào chung một item collection (bài L3 "Thiết kế một bảng").
- **GROUP BY**: cộng sẵn lúc ghi, ví dụ một item tổng cập nhật bằng bộ đếm (bài L2).
- **Báo cáo lớn**: xuất dữ liệu sang công cụ phân tích.

Nguyên tắc của AWS: liệt kê mẫu truy cập trước, rồi mới thiết kế khóa.

## Ví dụ

Các giới hạn cứng cần thuộc:

- Item tối đa **400 KB**, tính cả độ dài **tên** thuộc tính lẫn giá trị. Item có "shirt-color" = "R" và "shirt-size" = "M" nặng 23 byte.
- Partition key dài 1–2048 byte, sort key dài 1–1024 byte.
- Lồng nhau tối đa 32 tầng.
- Mỗi lần `Query` hoặc `Scan` trả tối đa **1 MB**, kèm `LastEvaluatedKey` khi còn dữ liệu.
- Tên bảng và tên index dài 3–255 ký tự.

## Thực hành

Tên thuộc tính ngắn làm item nhẹ hơn, nên đọc ghi cũng rẻ hơn. Đó là lý do nhiều bảng DynamoDB dùng tên như `PK`, `SK`, `GSI1PK`.

# EN

## Key idea

DynamoDB keeps its speed steady at any table size with one rule: each request touches only **one item** or **one item collection**, found through a key. So it has **no** server-side JOIN, GROUP BY, window or subquery.

Instead:

- **JOIN**: put data that is read together into the same item collection (the L3 lessons on single-table design).
- **GROUP BY**: precompute at write time, for example a total item updated with a counter (level L2).
- **Large reports**: export the data to an analytics tool.

The AWS rule: list the access patterns first, then design the keys.

## Example

The hard limits to know:

- An item is at most **400 KB**, counting both attribute **names** and values. An item with "shirt-color" = "R" and "shirt-size" = "M" weighs 23 bytes.
- A partition key is 1-2048 bytes long, a sort key 1-1024 bytes.
- Nesting goes at most 32 levels deep.
- Each `Query` or `Scan` call returns at most **1 MB**, with a `LastEvaluatedKey` when there is more.
- Table and index names are 3-255 characters long.

## Practice

Short attribute names make items lighter, so reads and writes cost less. That is why many DynamoDB tables use names like `PK`, `SK`, `GSI1PK`.
