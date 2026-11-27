---
id: e-dy-l1-06
engine: dynamodb
level: L1
module: crud
title: "PutItem: thêm hoặc thay cả item"
title_en: "PutItem: insert or replace a whole item"
kind: lab
runtime: browser
minutes: 8
figures: [{ name: dy-put-replaces, at: idea }]
objectives:
  - vi: Thêm một item bằng `PutItem`.
    en: Insert an item with `PutItem`.
  - vi: Biết `PutItem` lên khóa đã có sẽ thay cả item, và dùng `ReturnValues` để thấy bản cũ.
    en: Know that `PutItem` on an existing key replaces the whole item, and use `ReturnValues` to see the old image.
requires: [e-dy-l1-05]
sources:
  - { url: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithItems.html, title_vi: "Làm việc với item" }
  - { url: https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_PutItem.html, title_vi: "API PutItem" }
lab:
  setup: |
    {"tables": [{"TableName":"Books","KeySchema":[{"AttributeName":"isbn","KeyType":"HASH"}],"AttributeDefinitions":[{"AttributeName":"isbn","AttributeType":"S"}],"BillingMode":"PAY_PER_REQUEST"}],
     "items": {"Books": [
      {"isbn":"978-0-01","title":"Data at Rest","author":"Mai Lan","price":120000,"stock":14,"tags":["db","storage"]},
      {"isbn":"978-0-02","title":"Keys and Values","author":"Tran Binh","price":95000,"stock":3,"tags":["nosql"]},
      {"isbn":"978-0-03","title":"The Partition Book","author":"Le Hoa","price":150000,"stock":0,"tags":["nosql","scale"]},
      {"isbn":"978-0-04","title":"Query Not Scan","author":"Pham An","price":88000,"stock":22,"tags":["nosql","perf"]},
      {"isbn":"978-0-05","title":"Indexes by Hand","author":"Mai Lan","price":132000,"stock":7,"tags":["db"]},
      {"isbn":"978-0-06","title":"Small Items Fast","author":"Vo Khanh","price":70000,"stock":41,"tags":["perf"]},
      {"isbn":"978-0-07","title":"One Table","author":"Le Hoa","price":160000,"stock":5,"tags":["nosql","design"]},
      {"isbn":"978-0-08","title":"Eventually","author":"Tran Binh","price":99000,"stock":12,"tags":["nosql"]}
    ]}}
  steps:
    - task:
        vi: 'Thêm vào `Books` cuốn mới - `isbn` `978-0-09`, `title` "Write Paths", `author` "Vo Khanh", `price` `110000`, `stock` 10.'
        en: 'Add a new book to `Books` - `isbn` `978-0-09`, `title` "Write Paths", `author` "Vo Khanh", `price` `110000`, `stock` 10.'
      solution: |
        {"op": "PutItem", "input": {"TableName": "Books", "Item": {
          "isbn": {"S": "978-0-09"}, "title": {"S": "Write Paths"}, "author": {"S": "Vo Khanh"},
          "price": {"N": "110000"}, "stock": {"N": "10"}}}}
      check: doc
      hint:
        vi: '`Item` chứa mọi thuộc tính, mỗi giá trị có nhãn kiểu. Số viết trong chuỗi - `{"N": "110000"}`.'
        en: '`Item` holds every attribute, each value with a type tag. Numbers go inside a string - `{"N": "110000"}`.'
    - task:
        vi: 'Ghi đè cuốn `978-0-02` bằng item chỉ có `isbn`, `title` "Keys and Values" và `price` `90000`, và trả về bản cũ. Trước khi chạy, đoán xem sau lệnh này cuốn đó còn `author` và `stock` không.'
        en: 'Overwrite book `978-0-02` with an item that has only `isbn`, `title` "Keys and Values" and `price` `90000`, and return the old image. Before you run it, guess whether the book still has `author` and `stock` afterwards.'
      solution: |
        {"op": "PutItem", "input": {"TableName": "Books",
          "Item": {"isbn": {"S": "978-0-02"}, "title": {"S": "Keys and Values"}, "price": {"N": "90000"}},
          "ReturnValues": "ALL_OLD"}}
      check: doc
      hint:
        vi: '`PutItem` chỉ nhận `ReturnValues` là `NONE` hoặc `ALL_OLD`.'
        en: '`PutItem` accepts `ReturnValues` of `NONE` or `ALL_OLD` only.'
    - task:
        vi: 'Thêm cuốn `978-0-11` - `title` "Hash Rings", `price` `105000` và danh sách `tags` gồm "nosql" và "scale".'
        en: 'Add book `978-0-11` - `title` "Hash Rings", `price` `105000` and a `tags` list holding "nosql" and "scale".'
      solution: |
        {"op": "PutItem", "input": {"TableName": "Books", "Item": {
          "isbn": {"S": "978-0-11"}, "title": {"S": "Hash Rings"}, "price": {"N": "105000"},
          "tags": {"L": [{"S": "nosql"}, {"S": "scale"}]}}}}
      check: doc
      hint:
        vi: 'Danh sách có nhãn `L`, mỗi phần tử lại có nhãn riêng - `{"L": [{"S": "nosql"}, …]}`.'
        en: 'A list has the `L` tag, and each element carries its own tag - `{"L": [{"S": "nosql"}, …]}`.'
quiz:
  - q:
      vi: 'Cuốn `978-0-02` có `author` và `stock`. Bạn `PutItem` lên khóa đó một item chỉ có `isbn`, `title`, `price`. Sau đó cuốn sách còn `author` không?'
      en: 'Book `978-0-02` has `author` and `stock`. You `PutItem` an item with only `isbn`, `title`, `price` onto that key. Does the book still have `author` afterwards?'
    options:
      - vi: Còn, `PutItem` gộp thuộc tính mới vào item cũ
        en: Yes, `PutItem` merges the new attributes into the old item
      - vi: Không, item cũ bị thay toàn bộ
        en: No, the old item is replaced entirely
      - vi: Lệnh bị từ chối vì khóa đã có
        en: The command is refused because the key exists
    answer: 1
    trap: 0
    why:
      vi: 'Nghe hợp lý vì nhiều API "lưu" chỉ sửa trường được gửi, nhưng `PutItem` ghi cả item: thuộc tính nào không có trong item mới thì mất, nên `author` và `stock` của `978-0-02` biến mất. Lệnh cũng không bị từ chối: khác `INSERT` của SQL, `PutItem` ghi đè khóa đã có một cách im lặng, trừ khi bạn thêm điều kiện `attribute_not_exists`. Muốn sửa một phần, dùng `UpdateItem`.'
      en: 'It sounds right because many "save" APIs change only the fields you send, but `PutItem` writes the whole item: any attribute missing from the new item is gone, so `author` and `stock` of `978-0-02` disappear. The command is not refused either: unlike an SQL `INSERT`, `PutItem` silently overwrites an existing key unless you add an `attribute_not_exists` condition. To change part of an item, use `UpdateItem`.'
  - q:
      vi: '`PutItem` một khóa **mới** với `"ReturnValues": "ALL_OLD"`. Phản hồi có gì?'
      en: '`PutItem` on a **new** key with `"ReturnValues": "ALL_OLD"`. What does the response hold?'
    options:
      - vi: Lỗi, vì không có bản cũ để trả
        en: An error, because there is no old image to return
      - vi: 'Không có `Attributes`; item mới vẫn được thêm'
        en: 'No `Attributes`; the new item is still added'
      - vi: Item mới vừa ghi
        en: The new item just written
    answer: 1
    trap: 0
    why:
      vi: 'Nghe hợp lý vì bạn xin một bản cũ không tồn tại, nhưng xin bản cũ khi không có gì để trả không phải lỗi: phản hồi chỉ thiếu `Attributes`, và item mới vẫn được ghi. Phản hồi cũng không chứa item mới, vì `ALL_OLD` nghĩa là "trả item trước khi ghi"; bản mới chính là `Item` bạn vừa gửi.'
      en: 'It sounds right because you asked for an old image that does not exist, but asking for an old image when there is none is not an error: the response simply has no `Attributes`, and the new item is still written. The response does not hold the new item either, because `ALL_OLD` means "return the item as it was before the write"; the new image is the `Item` you just sent.'
---
## Mở bài

Nhà phát hành gửi bản cập nhật của một cuốn sách, nhưng chỉ có tên và giá. Bạn ghi nó bằng `PutItem` lên khóa cũ. Tác giả và tồn kho của cuốn đó còn không?

## Ý chính

`PutItem` ghi **cả một item**. Nếu khóa chưa có, item mới được thêm. Nếu khóa đã có, item cũ bị **thay toàn bộ**: thuộc tính nào không có trong item mới thì mất.

Đây là chỗ khác `UPDATE` của SQL. Muốn chỉ sửa vài thuộc tính, dùng `UpdateItem` (bài sau). Muốn "chỉ thêm, không bao giờ ghi đè", thêm điều kiện `attribute_not_exists` (bài L2).

Nhiều người nghĩ `PutItem` lên một khóa đã có sẽ báo trùng khóa, như `INSERT` của SQL. Thật ra nó ghi đè im lặng: không lỗi, không cảnh báo, và phản hồi mặc định cũng không cho biết đã có item cũ.

`ReturnValues: "ALL_OLD"` trả về item trước khi bị thay. Khi khóa còn mới, phản hồi không có `Attributes`. `PutItem` chỉ nhận `NONE` hoặc `ALL_OLD`.

Hình từng bước ở cuối mục này ghi cùng một giá mới lên cuốn `978-0-02`, một lần bằng `PutItem`, một lần bằng `UpdateItem`, để thấy thuộc tính nào còn lại.

## Cú pháp

```text
{"op": "PutItem", "input": {"TableName": "<table>",
  "Item": {"<pk>": {"S": "<value>"}, "<attr>": {"N": "<number>"}, ...},
  "ReturnValues": "ALL_OLD"}}
```

- `Item` phải có đủ thuộc tính khóa, cộng mọi thuộc tính muốn giữ.
- `ReturnValues`: `NONE` (mặc định) hoặc `ALL_OLD`.

## Ví dụ

Thêm một cuốn mới:

```json
{"op": "PutItem", "input": {"TableName": "Books", "Item": {"isbn": {"S": "978-0-12"}, "title": {"S": "Wide Rows"}, "price": {"N": "80000"}}}}
```

Bảng giờ có chín cuốn; cuốn mới chỉ mang ba thuộc tính đã ghi. Lần ghi tốn 1 WCU.

Ghi đè `978-0-02`: sau lệnh, cuốn đó mất `author`, `stock` và `tags`, vì item mới không có chúng. Kết quả dưới khối cho thấy cả bảng sau khi ghi:

```json
{"op": "PutItem", "input": {"TableName": "Books", "Item": {"isbn": {"S": "978-0-02"}, "title": {"S": "Keys and Values"}, "price": {"N": "90000"}}, "ReturnValues": "ALL_OLD"}}
```

Cuốn `978-0-02` giờ chỉ còn `isbn`, `title` và `price` 90000. Nhờ `ALL_OLD`, phản hồi trả bản cũ có `author` "Tran Binh" và `stock` 3: nơi duy nhất còn thấy dữ liệu vừa mất.

## Lỗi hay gặp

Xin bản mới từ `PutItem`:

```json
// ERROR ValidationException
{"op": "PutItem", "input": {"TableName": "Books", "Item": {"isbn": {"S": "978-0-12"}, "title": {"S": "Wide Rows"}}, "ReturnValues": "ALL_NEW"}}
```

Dynoxide báo "ReturnValues can only be ALL_OLD or NONE". `ALL_NEW` chỉ có ở `UpdateItem`; với `PutItem`, bản mới chính là `Item` bạn vừa gửi.

Dùng `PutItem` để đổi một thuộc tính:

```json
// WRONG: only the price was meant to change, but author, stock and tags are lost
{"op": "PutItem", "input": {"TableName": "Books", "Item": {"isbn": {"S": "978-0-05"}, "price": {"N": "125000"}}}}
```

```json
// FIX: UpdateItem changes only the attributes in SET
{"op": "UpdateItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-05"}}, "UpdateExpression": "SET price = :p", "ExpressionAttributeValues": {":p": {"N": "125000"}}}}
```

Bản sai để cuốn `978-0-05` chỉ còn `isbn` và `price`. Bản sửa đổi giá thành 125000 mà vẫn giữ `title`, `author`, `stock` và `tags`.

## Thực hành

Bước 1 thêm một cuốn mới, bước 2 ghi đè một cuốn có sẵn và xin bản cũ, bước 3 ghi một danh sách `L`. Trước bước 2, hãy đoán cuốn đó còn những thuộc tính nào rồi so với kết quả. Bước ghi được chấm bằng cách so **cả bảng** sau khi ghi với bảng sau đáp án. Mỗi bước bắt đầu lại từ dữ liệu gốc.

## Tóm tắt

- `PutItem` thêm item mới, hoặc thay toàn bộ item cùng khóa.
- Thuộc tính không có trong item mới thì mất.
- `ReturnValues` chỉ là `NONE` hoặc `ALL_OLD`; khóa mới thì không có `Attributes`.
- Sửa một phần item thì dùng `UpdateItem`.

# EN

## Opening

The publisher sends an update for a book, but with only the title and the price. You write it with `PutItem` onto the old key. Does the book still have its author and stock?

## Key idea

`PutItem` writes **a whole item**. If the key is new, the item is added. If the key exists, the old item is **replaced entirely**: any attribute missing from the new item is gone.

This differs from SQL `UPDATE`. To change only some attributes, use `UpdateItem` (next lesson). For "insert only, never overwrite", add an `attribute_not_exists` condition (level L2).

Many people think a `PutItem` on an existing key reports a duplicate key, like an SQL `INSERT`. In fact it overwrites without a word: no error, no warning, and by default the response does not even say an old item was there.

`ReturnValues: "ALL_OLD"` returns the item as it was before the replace. When the key is new, the response has no `Attributes`. `PutItem` accepts only `NONE` or `ALL_OLD`.

The step-through figure at the end of this section writes the same new price to book `978-0-02`, once with `PutItem` and once with `UpdateItem`, to show which attributes survive.

## Syntax

```text
{"op": "PutItem", "input": {"TableName": "<table>",
  "Item": {"<pk>": {"S": "<value>"}, "<attr>": {"N": "<number>"}, ...},
  "ReturnValues": "ALL_OLD"}}
```

- `Item` must hold every key attribute, plus every attribute you want to keep.
- `ReturnValues`: `NONE` (the default) or `ALL_OLD`.

## Example

Add a new book:

```json
{"op": "PutItem", "input": {"TableName": "Books", "Item": {"isbn": {"S": "978-0-12"}, "title": {"S": "Wide Rows"}, "price": {"N": "80000"}}}}
```

The table now holds nine books; the new one carries only the three attributes written. The write costs 1 WCU.

Overwrite `978-0-02`: afterwards the book has lost `author`, `stock` and `tags`, because the new item does not have them. The result under the block shows the whole table after the write:

```json
{"op": "PutItem", "input": {"TableName": "Books", "Item": {"isbn": {"S": "978-0-02"}, "title": {"S": "Keys and Values"}, "price": {"N": "90000"}}, "ReturnValues": "ALL_OLD"}}
```

Book `978-0-02` now holds only `isbn`, `title` and `price` 90000. Thanks to `ALL_OLD`, the response returns the old image with `author` "Tran Binh" and `stock` 3: the only place the lost data still shows.

## Common mistakes

Asking `PutItem` for the new image:

```json
// ERROR ValidationException
{"op": "PutItem", "input": {"TableName": "Books", "Item": {"isbn": {"S": "978-0-12"}, "title": {"S": "Wide Rows"}}, "ReturnValues": "ALL_NEW"}}
```

Dynoxide reports "ReturnValues can only be ALL_OLD or NONE". `ALL_NEW` exists only on `UpdateItem`; with `PutItem` the new image is the `Item` you just sent.

Using `PutItem` to change one attribute:

```json
// WRONG: only the price was meant to change, but author, stock and tags are lost
{"op": "PutItem", "input": {"TableName": "Books", "Item": {"isbn": {"S": "978-0-05"}, "price": {"N": "125000"}}}}
```

```json
// FIX: UpdateItem changes only the attributes in SET
{"op": "UpdateItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-05"}}, "UpdateExpression": "SET price = :p", "ExpressionAttributeValues": {":p": {"N": "125000"}}}}
```

The wrong version leaves book `978-0-05` with only `isbn` and `price`. The fix changes the price to 125000 and keeps `title`, `author`, `stock` and `tags`.

## Practice

Step 1 adds a new book, step 2 overwrites an existing one and asks for the old image, step 3 writes an `L` list. Before step 2, guess which attributes the book keeps, then compare with the result. A write step is graded by comparing the **whole table** after your write with the table after the solution. Every step starts again from the original data.

## Recap

- `PutItem` adds a new item, or replaces the whole item with the same key.
- Attributes missing from the new item are gone.
- `ReturnValues` is only `NONE` or `ALL_OLD`; a new key gives no `Attributes`.
- To change part of an item, use `UpdateItem`.
