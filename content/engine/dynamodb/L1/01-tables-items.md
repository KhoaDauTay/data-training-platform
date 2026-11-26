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
figures: [{ name: dy-item-attributes, at: idea }]
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
    trap: 0
    why:
      vi: Nghe hợp lý vì bảng SQL bắt mọi dòng có đủ cột, nhưng bảng DynamoDB không khai báo cột nào ngoài khóa chính, nên cuốn này có `tags`, cuốn kia không vẫn hợp lệ. Mỗi item phải có đủ thuộc tính khóa, còn lại tùy item. Câu "kể cả khóa chính cũng không bắt buộc" sai vì DynamoDB tìm và lưu item theo khóa chính; một PutItem thiếu khóa bị từ chối bằng `ValidationException`.
      en: It sounds right because an SQL table makes every row carry every column, but a DynamoDB table declares nothing beyond the primary key, so one book with `tags` and one without are both valid. Every item must carry the key attributes, the rest is up to the item. "Not even the primary key" is wrong because DynamoDB finds and stores each item by its primary key; a PutItem without the key is refused with a `ValidationException`.
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
    trap: 0
    why:
      vi: 'Nghe hợp lý vì 42 là số trong JSON, nhưng số JSON thường bị đọc thành số thực 64 bit, chỉ giữ chừng 15–17 chữ số, còn DynamoDB nhận số tới 38 chữ số. Vì vậy chữ số được gửi trong chuỗi, và nhãn `N` cho DynamoDB biết đó là số. Bản `{"S": "42"}` lưu một chuỗi, nên khi so hay sắp, "42" đứng trước "5" như chữ, không như số.'
      en: 'It sounds right because 42 is a JSON number, but a JSON number is usually read as a 64-bit float that keeps only about 15–17 digits, while DynamoDB accepts numbers of up to 38 digits. So the digits travel inside a string, and the `N` tag tells DynamoDB it is a number. The `{"S": "42"}` version stores a string, so when compared or sorted "42" comes before "5" as text, not as a number.'
demo_setup: |
  {"tables": [{"TableName":"Books","KeySchema":[{"AttributeName":"isbn","KeyType":"HASH"}],"AttributeDefinitions":[{"AttributeName":"isbn","AttributeType":"S"}],"BillingMode":"PAY_PER_REQUEST"}],
   "items": {"Books": [
    {"isbn":"978-0-04","title":"Query Not Scan","price":88000,"tags":["nosql","perf"]},
    {"isbn":"978-0-05","title":"Indexes by Hand","price":132000}
  ]}}
---
## Mở bài

Bạn quen bảng SQL: khai cột trước, mỗi dòng có đủ cột. Sang DynamoDB, hai cuốn sách trong cùng một bảng lại có bộ thuộc tính khác nhau. Bảng ở đây thật sự là gì?

## Ý chính

DynamoDB lưu dữ liệu trong **bảng**. Mỗi bảng chứa các **item**, giống một dòng. Mỗi item là một tập **thuộc tính** (attribute), giống một ô có tên.

Bảng không khai báo cột. Lúc tạo bảng bạn chỉ khai báo **khóa chính** (primary key): tên và kiểu của thuộc tính khóa. Mọi thuộc tính khác do từng item tự mang. Vì vậy hai sách trong bảng `Books` có thể khác nhau: cuốn này có `tags`, cuốn kia không.

Câu hỏi cũng đổi. Với SQL bạn hỏi "mọi dòng thỏa điều kiện X". Với DynamoDB bạn hỏi "đưa tôi item có khóa này" hoặc "mọi item có partition key (khóa phân vùng) này". Bài sau nói về khóa.

Nhiều người nghĩ "không schema" nghĩa là không cần thiết kế. Thật ra schema chuyển sang code của bạn: ứng dụng quyết định item nào mang thuộc tính gì, kiểu gì, và DynamoDB không kiểm hộ ngoài thuộc tính khóa. Hai đoạn code ghi `price` với hai nhãn kiểu khác nhau đều thành công; lỗi chỉ lộ ra khi đọc hay so sánh. Vì vậy các đội thường giữ một mô tả item duy nhất trong code và kiểm dữ liệu ở đó trước khi ghi.

Trong các lab, dữ liệu mẫu được ghi bằng JSON thường cho dễ đọc. Request bạn viết vẫn là DynamoDB JSON có nhãn kiểu, đúng như SDK cấp thấp gửi đi, bọc trong `{"op": …, "input": …}`.

Hình ở cuối mục này đặt ba cuốn sách của bảng `Books` cạnh nhau: cùng khóa `isbn`, mỗi cuốn một bộ thuộc tính.

## Cú pháp

```text
{"<attribute>": {"<type tag>": <value>}, ...}
```

- `S` là chuỗi: `{"S": "Hue"}`; `N` là số, gửi bằng chuỗi: `{"N": "120000"}`.
- `BOOL` và `NULL`: `{"BOOL": true}`, `{"NULL": true}`; `B` là nhị phân, gửi bằng base64.
- `L` là danh sách, `M` là map lồng nhau: `{"L": [{"S": "nosql"}]}`.
- `SS`, `NS`, `BS` là tập hợp chuỗi, số, nhị phân, không trùng phần tử.
- Lồng nhau tối đa 32 tầng; số có tối đa 38 chữ số.

## Ví dụ

Bảng `Books` nhỏ có hai cuốn. Cuốn `978-0-04` có `tags`:

```json
{"op": "GetItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-04"}}}}
```

Phản hồi có một `Item` với bốn thuộc tính: `isbn`, `title`, `price` và danh sách `tags`. Lần đọc tốn 0.5 RCU, con số engine trả về.

Cuốn `978-0-05` không có `tags`, và bảng không phàn nàn gì:

```json
{"op": "GetItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-05"}}}}
```

Item này chỉ có ba thuộc tính. Không có ô `tags` mang giá trị rỗng nào: thuộc tính vắng mặt thì đơn giản là không có trong item.

Thêm một cuốn có thuộc tính mới `pages` mà không cần sửa bảng:

```json
{"op": "PutItem", "input": {"TableName": "Books", "Item": {"isbn": {"S": "978-0-06"}, "title": {"S": "Small Items Fast"}, "pages": {"N": "212"}}}}
```

Bảng giờ có ba cuốn, và chỉ cuốn mới mang `pages`. Không cần lệnh nào giống `ALTER TABLE`; lần ghi tốn 1 WCU.

## Lỗi hay gặp

Quên thuộc tính khóa, vì nghĩ bảng không có schema thì thuộc tính nào cũng tùy ý:

```json
// ERROR ValidationException
{"op": "PutItem", "input": {"TableName": "Books", "Item": {"title": {"S": "No Key"}}}}
```

Khóa chính là phần schema duy nhất, và item nào cũng phải có nó. Trong trình duyệt, dynoxide báo thiếu khóa `isbn`; AWS cũng trả `ValidationException`, câu chữ có thể khác.

Ghi số bằng nhãn `S`:

```json
// WRONG: the price is stored as a string, so it no longer compares as a number
{"op": "PutItem", "input": {"TableName": "Books", "Item": {"isbn": {"S": "978-0-07"}, "price": {"S": "160000"}}}}
```

```json
// FIX: the N tag, with the digits inside a string
{"op": "PutItem", "input": {"TableName": "Books", "Item": {"isbn": {"S": "978-0-07"}, "price": {"N": "160000"}}}}
```

Chuỗi `"160000"` đứng trước chuỗi `"88000"` khi so, nên lọc hay sắp theo giá sẽ sai. Bản sai vẫn được ghi im lặng, vì DynamoDB chỉ ép kiểu cho thuộc tính khóa; hãy kiểm kiểu ở code trước khi ghi.

## Tóm tắt

- Bảng chứa item, item chứa thuộc tính có tên.
- Bảng chỉ khai khóa chính; các thuộc tính khác do từng item tự mang.
- Mọi item phải có đủ thuộc tính khóa.
- Request dùng DynamoDB JSON: mỗi giá trị có nhãn kiểu, số viết trong chuỗi.

# EN

## Opening

You are used to SQL tables: declare the columns first, every row has them all. In DynamoDB, two books in the same table carry different attributes. So what is a table here?

## Key idea

DynamoDB stores data in **tables**. A table holds **items**, much like rows. Each item is a set of **attributes**, much like named cells.

A table declares no columns. When you create it you declare only the **primary key**: the name and type of the key attributes. Every other attribute belongs to the item that carries it. So two books in the `Books` table can differ: one has `tags`, the other does not.

The question changes too. In SQL you ask "every row that matches X". In DynamoDB you ask "give me the item with this key" or "every item with this partition key". The next lesson is about keys.

Many people think "schemaless" means no design is needed. In fact the schema moves into your code: the application decides which item carries which attributes and of what type, and DynamoDB checks nothing beyond the key attributes. Two pieces of code that write `price` with two different type tags both succeed; the mistake shows only when you read or compare. That is why teams usually keep one description of each item in their code and check the data there before writing.

In the labs the sample data is written as plain JSON so it is easy to read. The requests you write are still DynamoDB JSON with type tags, exactly what a low-level SDK sends, wrapped in `{"op": …, "input": …}`.

The figure at the end of this section puts three books of table `Books` side by side: the same key `isbn`, a different set of attributes each.

## Syntax

```text
{"<attribute>": {"<type tag>": <value>}, ...}
```

- `S` is a string: `{"S": "Hue"}`; `N` is a number, sent as a string: `{"N": "120000"}`.
- `BOOL` and `NULL`: `{"BOOL": true}`, `{"NULL": true}`; `B` is binary, sent as base64.
- `L` is a list, `M` a nested map: `{"L": [{"S": "nosql"}]}`.
- `SS`, `NS`, `BS` are sets of strings, numbers, binary, with no duplicates.
- Nesting goes at most 32 levels deep; a number holds at most 38 digits.

## Example

A small `Books` table with two books. Book `978-0-04` has `tags`:

```json
{"op": "GetItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-04"}}}}
```

The response holds one `Item` with four attributes: `isbn`, `title`, `price` and the `tags` list. The read costs 0.5 RCU, the figure the engine returns.

Book `978-0-05` has no `tags`, and the table does not mind:

```json
{"op": "GetItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-05"}}}}
```

This item has only three attributes. There is no empty `tags` cell: an absent attribute is simply not in the item.

Add a book with a new attribute `pages` without changing the table:

```json
{"op": "PutItem", "input": {"TableName": "Books", "Item": {"isbn": {"S": "978-0-06"}, "title": {"S": "Small Items Fast"}, "pages": {"N": "212"}}}}
```

The table now holds three books, and only the new one carries `pages`. Nothing like `ALTER TABLE` is needed; the write costs 1 WCU.

## Common mistakes

Leaving out the key attribute, thinking a schemaless table takes any attributes:

```json
// ERROR ValidationException
{"op": "PutItem", "input": {"TableName": "Books", "Item": {"title": {"S": "No Key"}}}}
```

The primary key is the only schema there is, and every item must carry it. In the browser, dynoxide reports the missing key `isbn`; AWS also returns a `ValidationException`, possibly worded differently.

Writing a number with the `S` tag:

```json
// WRONG: the price is stored as a string, so it no longer compares as a number
{"op": "PutItem", "input": {"TableName": "Books", "Item": {"isbn": {"S": "978-0-07"}, "price": {"S": "160000"}}}}
```

```json
// FIX: the N tag, with the digits inside a string
{"op": "PutItem", "input": {"TableName": "Books", "Item": {"isbn": {"S": "978-0-07"}, "price": {"N": "160000"}}}}
```

The string `"160000"` sorts before the string `"88000"`, so filtering or sorting by price goes wrong. The wrong version is still written without a word, because DynamoDB enforces types only on key attributes; check types in your code before writing.

## Recap

- A table holds items, and an item holds named attributes.
- A table declares only the primary key; every other attribute belongs to its item.
- Every item must carry all key attributes.
- Requests use DynamoDB JSON: every value has a type tag, numbers go inside strings.
