---
# ENGINE-CONTENT-V1 · DynamoDB. Lab data (`lab.setup.items`) is plain JSON; every request is native DynamoDB JSON
# wrapped as {"op", "input"}, or a PartiQL string. Checked against @dynoxide/wasm-engine 1.5.0, 2026-11-20.
id: e-dy-l1-01
engine: dynamodb
level: L1
module: keys
title: "Bảng, item, thuộc tính: DynamoDB nghĩ khác SQL"
title_en: "Tables, items, attributes: DynamoDB thinks differently from SQL"
kind: concept
runtime: docs
minutes: 6
objectives:
  - vi: Gọi đúng tên ba khối cơ bản của DynamoDB là bảng, item và thuộc tính.
    en: Name the three building blocks of DynamoDB, which are tables, items and attributes.
  - vi: Giải thích vì sao bảng DynamoDB không có schema, trừ khóa chính.
    en: Explain why a DynamoDB table has no schema except for the primary key.
  - vi: Đọc được nhãn kiểu của DynamoDB JSON (S, N, BOOL, NULL, L, M, SS, NS).
    en: Read the type tags of DynamoDB JSON (S, N, BOOL, NULL, L, M, SS, NS).
requires: []
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.CoreComponents.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.NamingRulesDataTypes.html
quiz:
  - q:
      vi: Hai item trong cùng một bảng DynamoDB có bắt buộc phải có cùng danh sách thuộc tính không?
      en: Must two items in the same DynamoDB table have the same list of attributes?
    options:
      - vi: Có, giống cột của bảng SQL.
        en: Yes, like the columns of an SQL table.
      - vi: Không, chỉ các thuộc tính của khóa chính là bắt buộc.
        en: No, only the primary key attributes are required.
      - vi: Không, kể cả khóa chính cũng không bắt buộc.
        en: No, not even the primary key is required.
    answer: 1
    why:
      vi: Bảng DynamoDB không có schema, trừ khóa chính. Mỗi item phải có đủ thuộc tính khóa, còn lại tùy item.
      en: A DynamoDB table is schemaless except for the primary key. Every item must carry the key attributes, the rest is up to the item.
  - q:
      vi: Trong DynamoDB JSON, số 42 được gửi đi dưới dạng nào?
      en: In DynamoDB JSON, how is the number 42 sent?
    options:
      - vi: '`{"N": 42}`'
        en: '`{"N": 42}`'
      - vi: '`{"N": "42"}`'
        en: '`{"N": "42"}`'
      - vi: '`{"S": "42"}`'
        en: '`{"S": "42"}`'
    answer: 1
    why:
      vi: Số được gửi bằng chuỗi JSON để không mất độ chính xác (tới 38 chữ số). Nhãn `N` cho DynamoDB biết đó là số.
      en: Numbers travel as JSON strings so no precision is lost (up to 38 digits). The `N` tag tells DynamoDB it is a number.
---

## Ý chính

DynamoDB lưu dữ liệu trong **bảng**. Mỗi bảng chứa các **item**, giống một dòng. Mỗi item là một tập **thuộc tính** (attribute), giống một ô có tên.

Bảng không khai báo cột. Lúc tạo bảng bạn chỉ khai báo **khóa chính** (primary key): tên và kiểu của thuộc tính khóa. Mọi thuộc tính khác do từng item tự mang. Vì vậy hai sách trong bảng `Books` có thể khác nhau: cuốn này có `tags`, cuốn kia không.

Câu hỏi cũng đổi. Với SQL bạn hỏi "mọi dòng thỏa điều kiện X". Với DynamoDB bạn hỏi "đưa tôi item có khóa này" hoặc "mọi item có partition key (khóa phân vùng) này". Bài sau nói về khóa.

## Ví dụ

Mỗi giá trị trong request đi kèm một nhãn kiểu:

- `S` là chuỗi: `{"S": "Hue"}`
- `N` là số, gửi bằng chuỗi: `{"N": "120000"}`
- `BOOL` và `NULL`: `{"BOOL": true}`, `{"NULL": true}`
- `L` là danh sách, `M` là map lồng nhau: `{"L": [{"S": "nosql"}]}`
- `SS`, `NS`, `BS` là tập hợp chuỗi, số, nhị phân, không trùng phần tử
- `B` là nhị phân, gửi bằng base64

Một cuốn sách trong bảng `Books`, viết bằng DynamoDB JSON:

```json
{"isbn": {"S": "978-0-04"}, "title": {"S": "Query Not Scan"}, "price": {"N": "88000"}, "tags": {"L": [{"S": "nosql"}, {"S": "perf"}]}}
```

Lồng nhau được tối đa 32 tầng. Số có tối đa 38 chữ số.

## Thực hành

Trong các lab, dữ liệu mẫu được ghi bằng JSON thường cho dễ đọc. Request bạn viết vẫn là DynamoDB JSON có nhãn kiểu, đúng như SDK cấp thấp gửi đi, bọc trong `{"op": …, "input": …}`.

# EN

## Key idea

DynamoDB stores data in **tables**. A table holds **items**, much like rows. Each item is a set of **attributes**, much like named cells.

A table declares no columns. When you create it you declare only the **primary key**: the name and type of the key attributes. Every other attribute belongs to the item that carries it. So two books in the `Books` table can differ: one has `tags`, the other does not.

The question changes too. In SQL you ask "every row that matches X". In DynamoDB you ask "give me the item with this key" or "every item with this partition key". The next lesson is about keys.

## Example

Every value in a request carries a type tag:

- `S` is a string: `{"S": "Hue"}`
- `N` is a number, sent as a string: `{"N": "120000"}`
- `BOOL` and `NULL`: `{"BOOL": true}`, `{"NULL": true}`
- `L` is a list, `M` a nested map: `{"L": [{"S": "nosql"}]}`
- `SS`, `NS`, `BS` are sets of strings, numbers, binary, with no duplicates
- `B` is binary, sent as base64

One book in the `Books` table, written in DynamoDB JSON:

```json
{"isbn": {"S": "978-0-04"}, "title": {"S": "Query Not Scan"}, "price": {"N": "88000"}, "tags": {"L": [{"S": "nosql"}, {"S": "perf"}]}}
```

Nesting goes at most 32 levels deep. A number holds at most 38 digits.

## Practice

In the labs the sample data is written as plain JSON so it is easy to read. The requests you write are still DynamoDB JSON with type tags, exactly what a low-level SDK sends, wrapped in `{"op": …, "input": …}`.
