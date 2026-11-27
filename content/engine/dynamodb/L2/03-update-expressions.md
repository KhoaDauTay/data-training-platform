---
id: e-dy-l2-03
engine: dynamodb
level: L2
module: expressions
title: "UpdateExpression: SET, REMOVE, list_append, if_not_exists"
title_en: "UpdateExpression: SET, REMOVE, list_append, if_not_exists"
kind: lab
runtime: browser
minutes: 14
objectives:
  - vi: Sửa số tại chỗ bằng `SET a = a - :d`, không cần đọc trước.
    en: Change a number in place with `SET a = a - :d`, without reading it first.
  - vi: Xóa thuộc tính bằng `REMOVE`, nối danh sách bằng `list_append`, đặt giá trị mặc định bằng `if_not_exists`.
    en: Remove an attribute with `REMOVE`, append to a list with `list_append`, and set a default with `if_not_exists`.
requires: [e-dy-l2-01, e-dy-l1-07]
sources:
  - { url: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.UpdateExpressions.html, title_vi: "Biểu thức cập nhật (update expression)" }
  - { url: https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_UpdateItem.html, title_vi: "API UpdateItem" }
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
        vi: Giảm giá cuốn `978-0-05` thêm `12000` so với giá hiện tại, không đọc giá trước, và trả về item sau khi sửa.
        en: Lower the price of `978-0-05` by `12000` from its current price, without reading the price first, and return the item after the change.
      solution: |
        {"op": "UpdateItem", "input": {"TableName": "Books",
          "Key": {"isbn": {"S": "978-0-05"}},
          "UpdateExpression": "SET price = price - :d",
          "ExpressionAttributeValues": {":d": {"N": "12000"}},
          "ReturnValues": "ALL_NEW"}}
      check: doc
      hint:
        vi: '`SET` nhận phép `+` và `-` giữa một thuộc tính và một giá trị.'
        en: '`SET` accepts `+` and `-` between an attribute and a value.'
    - task:
        vi: Cuốn `978-0-08` không còn được gắn nhãn. Xóa hẳn thuộc tính `tags` của nó.
        en: Book `978-0-08` is no longer tagged. Remove its `tags` attribute entirely.
      solution: |
        {"op": "UpdateItem", "input": {"TableName": "Books",
          "Key": {"isbn": {"S": "978-0-08"}},
          "UpdateExpression": "REMOVE tags"}}
      check: doc
      hint:
        vi: '`REMOVE` theo sau là tên thuộc tính, không cần giá trị.'
        en: '`REMOVE` is followed by the attribute name, no value needed.'
    - task:
        vi: Thêm nhãn "classic" vào cuối danh sách `tags` của cuốn `978-0-01`.
        en: Append the tag "classic" to the end of the `tags` list of book `978-0-01`.
      solution: |
        {"op": "UpdateItem", "input": {"TableName": "Books",
          "Key": {"isbn": {"S": "978-0-01"}},
          "UpdateExpression": "SET tags = list_append(tags, :t)",
          "ExpressionAttributeValues": {":t": {"L": [{"S": "classic"}]}},
          "ReturnValues": "UPDATED_NEW"}}
      check: doc
      hint:
        vi: '`list_append` nối hai danh sách, nên giá trị mới cũng phải là một danh sách `L`.'
        en: '`list_append` joins two lists, so the new value must be an `L` list too.'
    - task:
        vi: 'Đếm lượt xem cuốn `978-0-07` trong thuộc tính `views`. Thuộc tính này chưa có - nếu chưa có thì coi là 0, rồi cộng 1.'
        en: 'Count the views of book `978-0-07` in the attribute `views`. It does not exist yet - treat a missing value as 0, then add 1.'
      solution: |
        {"op": "UpdateItem", "input": {"TableName": "Books",
          "Key": {"isbn": {"S": "978-0-07"}},
          "UpdateExpression": "SET #v = if_not_exists(#v, :z) + :one",
          "ExpressionAttributeNames": {"#v": "views"},
          "ExpressionAttributeValues": {":z": {"N": "0"}, ":one": {"N": "1"}},
          "ReturnValues": "UPDATED_NEW"}}
      check: doc
      hint:
        vi: '`if_not_exists(views, :z)` trả về `views` nếu có, ngược lại trả `:z`. `views` cũng là từ dành riêng.'
        en: '`if_not_exists(views, :z)` returns `views` when it exists, otherwise `:z`. `views` is a reserved word too.'
quiz:
  - q:
      vi: 'Hai thu ngân cùng lúc gửi `SET stock = stock - :one` cho cùng một cuốn đang còn 5. Sau hai lần ghi, `stock` là bao nhiêu?'
      en: 'Two cashiers send `SET stock = stock - :one` for the same book at the same time, while it has 5 left. After both writes, what is `stock`?'
    options:
      - vi: 4, vì cả hai cùng đọc 5 rồi cùng ghi 4
        en: 4, because both read 5 and both write 4
      - vi: "3"
        en: "3"
      - vi: Lần ghi thứ hai báo lỗi
        en: The second write fails
    answer: 1
    trap: 0
    why:
      vi: 'Nghe hợp lý vì trong code ứng dụng "đọc rồi ghi" hay mất một lần cập nhật, nhưng `stock - :one` được tính ở phía server, trên item, một cách nguyên tử (atomic: đọc, tính và ghi là một bước không bị chen ngang). DynamoDB xếp hai lần ghi nối nhau, lần sau thấy kết quả của lần trước, nên 5 − 1 − 1 = 3. Lần ghi thứ hai cũng không lỗi, vì không có điều kiện nào bị vi phạm; nó chỉ chờ lượt.'
      en: 'It sounds right because "read then write" in application code often loses an update, but `stock - :one` is computed on the server, on the item, atomically (read, compute and write are one step nothing can cut into). DynamoDB applies the two writes one after the other, the second sees the result of the first, so 5 − 1 − 1 = 3. The second write does not fail either, because no condition is broken; it simply waits its turn.'
  - q:
      vi: '`SET tags = list_append(:new, tags)` thêm `:new` vào đâu?'
      en: 'Where does `SET tags = list_append(:new, tags)` add `:new`?'
    options:
      - vi: Cuối danh sách, như mọi lệnh "append"
        en: At the end of the list, like every "append"
      - vi: Đầu danh sách
        en: At the front of the list
      - vi: Thay cả danh sách
        en: It replaces the whole list
    answer: 1
    trap: 0
    why:
      vi: 'Nghe hợp lý vì tên hàm là "append", nhưng `list_append` nối danh sách thứ nhất với danh sách thứ hai theo đúng thứ tự viết. `:new` đứng trước nên nằm ở đầu; muốn thêm vào cuối, viết `list_append(tags, :new)`. Danh sách cũ không bị thay, vì `tags` vẫn là một trong hai danh sách được nối; chỉ `SET tags = :new` mới thay cả danh sách.'
      en: 'It sounds right because the function is called "append", but `list_append` joins the first list and the second list in the order you write them. `:new` comes first, so it lands at the front; to add at the end, write `list_append(tags, :new)`. The old list is not replaced, because `tags` is still one of the two lists being joined; only `SET tags = :new` replaces the whole list.'
---

## Mở bài

Một cuốn sách giảm giá 12000. Bạn có cần đọc giá hiện tại, trừ trong ứng dụng rồi ghi lại không? Với `UpdateExpression`, DynamoDB tự tính trên item.

## Ý chính

`UpdateExpression` có bốn mệnh đề, mỗi mệnh đề xuất hiện tối đa một lần, có thể ghép trong một request:

- `SET`: gán hoặc tính giá trị (`+`, `-`, `list_append`, `if_not_exists`).
- `REMOVE`: xóa thuộc tính, hoặc xóa phần tử danh sách theo vị trí (`REMOVE tags[0]`).
- `ADD`: cộng vào số, hoặc thêm phần tử vào tập hợp (bài bộ đếm).
- `DELETE`: bớt phần tử khỏi tập hợp `SS`/`NS`/`BS`.

Mọi phép tính chạy **ở phía server, trên một item, nguyên tử** (atomic): không cần đọc rồi ghi lại, nên hai người sửa cùng lúc không đè lên nhau.

`list_append(:first, tags)` thêm vào **đầu** danh sách, `list_append(tags, :last)` thêm vào **cuối**. `if_not_exists` đặt giá trị mặc định mà không cần biết item đã có thuộc tính hay chưa; kết hợp với `+` ta có bộ đếm an toàn cho item mới.

## Cú pháp

```text
SET price = price - :d, tags = list_append(tags, :t), #v = if_not_exists(#v, :z) + :one
REMOVE promo, tags[0]
```

- Các phép gán trong một mệnh đề cách nhau bằng dấu phẩy.
- Mỗi mệnh đề (`SET`, `REMOVE`, `ADD`, `DELETE`) xuất hiện tối đa một lần.
- `"ReturnValues": "ALL_NEW"` hoặc `"UPDATED_NEW"` trả về item sau khi sửa.

## Ví dụ

Tăng giá cuốn `978-0-02` thêm 5000 và trả về phần đã đổi:

```json
{"op": "UpdateItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-02"}}, "UpdateExpression": "SET price = price + :d", "ExpressionAttributeValues": {":d": {"N": "5000"}}, "ReturnValues": "UPDATED_NEW"}}
```

Giá cuốn `978-0-02` từ 95000 lên 100000. `UPDATED_NEW` chỉ trả các thuộc tính vừa đổi, ở đây là `price`.

Hai mệnh đề trong một request: đặt `stock` mới và xóa phần tử đầu của `tags`:

```json
{"op": "UpdateItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-04"}}, "UpdateExpression": "SET stock = :s REMOVE tags[0]", "ExpressionAttributeValues": {":s": {"N": "30"}}, "ReturnValues": "ALL_NEW"}}
```

Sau lệnh, `stock` là 30 và `tags` từ `["nosql", "perf"]` chỉ còn `["perf"]`: hai mệnh đề chạy trong cùng một lần ghi.

## Lỗi hay gặp

Viết số thẳng vào biểu thức như trong SQL:

```json
// ERROR ValidationException
{"op": "UpdateItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-05"}}, "UpdateExpression": "SET price = price - 12000"}}
```

DynamoDB báo lỗi cú pháp ngay ở con số: số cũng phải đi qua chỗ giữ chỗ, như `SET price = price - :d` với `:d` là `12000`.

Gán thẳng danh sách mới khi chỉ muốn thêm một nhãn:

```json
// WRONG: tags becomes ["classic"], the old tags are gone
{"op": "UpdateItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-01"}}, "UpdateExpression": "SET tags = :t", "ExpressionAttributeValues": {":t": {"L": [{"S": "classic"}]}}, "ReturnValues": "ALL_NEW"}}
```

```json
// FIX: list_append keeps the old tags
{"op": "UpdateItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-01"}}, "UpdateExpression": "SET tags = list_append(tags, :t)", "ExpressionAttributeValues": {":t": {"L": [{"S": "classic"}]}}, "ReturnValues": "ALL_NEW"}}
```

Bản sai để `tags` chỉ còn `["classic"]`, bản sửa cho `["db", "storage", "classic"]`. Không có lỗi nào báo cho bạn: nhãn bị mất chỉ lộ ra khi đọc lại item.

## Thực hành

Bảng `Books` có 8 cuốn. Mỗi bước chạy lại từ dữ liệu gốc và được chấm bằng trạng thái bảng sau khi ghi. Bước 1 trừ giá ngay trên server. Bước 2 xóa hẳn một thuộc tính bằng `REMOVE`. Bước 3 nối một nhãn vào cuối danh sách. Bước 4 dùng `if_not_exists` để đếm từ một thuộc tính chưa có.

## Tóm tắt

- Bốn mệnh đề: `SET`, `REMOVE`, `ADD`, `DELETE`, mỗi cái tối đa một lần.
- Phép tính chạy ở server, trên một item, nguyên tử.
- Giá trị luôn đi qua `:x`, kể cả số.
- `list_append` nối theo thứ tự viết; `if_not_exists` cho giá trị mặc định.

# EN

## Opening

A book's price drops by 12000. Do you need to read the current price, subtract in the application and write it back? With an `UpdateExpression`, DynamoDB computes on the item itself.

## Key idea

An `UpdateExpression` has four clauses. Each appears at most once, and they can be combined in one request:

- `SET`: assign or compute a value (`+`, `-`, `list_append`, `if_not_exists`).
- `REMOVE`: delete an attribute, or a list element by position (`REMOVE tags[0]`).
- `ADD`: add to a number, or add elements to a set (counter lesson).
- `DELETE`: take elements out of an `SS`/`NS`/`BS` set.

Every computation runs **on the server, on one item, atomically**: no read-then-write, so two people changing the item at once do not overwrite each other.

`list_append(:first, tags)` adds to the **front** of the list, `list_append(tags, :last)` to the **end**. `if_not_exists` sets a default without knowing whether the item already has the attribute; combined with `+` it gives a safe counter for new items.

## Syntax

```text
SET price = price - :d, tags = list_append(tags, :t), #v = if_not_exists(#v, :z) + :one
REMOVE promo, tags[0]
```

- Assignments inside one clause are separated by commas.
- Each clause (`SET`, `REMOVE`, `ADD`, `DELETE`) appears at most once.
- `"ReturnValues": "ALL_NEW"` or `"UPDATED_NEW"` returns the item after the change.

## Example

Raise the price of `978-0-02` by 5000 and return what changed:

```json
{"op": "UpdateItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-02"}}, "UpdateExpression": "SET price = price + :d", "ExpressionAttributeValues": {":d": {"N": "5000"}}, "ReturnValues": "UPDATED_NEW"}}
```

The price of `978-0-02` goes from 95000 to 100000. `UPDATED_NEW` returns only the attributes that changed, here `price`.

Two clauses in one request: set a new `stock` and remove the first element of `tags`:

```json
{"op": "UpdateItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-04"}}, "UpdateExpression": "SET stock = :s REMOVE tags[0]", "ExpressionAttributeValues": {":s": {"N": "30"}}, "ReturnValues": "ALL_NEW"}}
```

Afterwards `stock` is 30 and `tags` goes from `["nosql", "perf"]` to `["perf"]`: both clauses run in the same write.

## Common mistakes

Writing a number straight into the expression, as in SQL:

```json
// ERROR ValidationException
{"op": "UpdateItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-05"}}, "UpdateExpression": "SET price = price - 12000"}}
```

DynamoDB reports a syntax error right at the number: numbers go through a placeholder too, as in `SET price = price - :d` with `:d` set to `12000`.

Assigning a new list when you only meant to add one tag:

```json
// WRONG: tags becomes ["classic"], the old tags are gone
{"op": "UpdateItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-01"}}, "UpdateExpression": "SET tags = :t", "ExpressionAttributeValues": {":t": {"L": [{"S": "classic"}]}}, "ReturnValues": "ALL_NEW"}}
```

```json
// FIX: list_append keeps the old tags
{"op": "UpdateItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-01"}}, "UpdateExpression": "SET tags = list_append(tags, :t)", "ExpressionAttributeValues": {":t": {"L": [{"S": "classic"}]}}, "ReturnValues": "ALL_NEW"}}
```

The wrong version leaves `tags` as just `["classic"]`, the fix gives `["db", "storage", "classic"]`. No error tells you: the lost tags show only when you read the item again.

## Practice

Table `Books` holds 8 books. Each step runs again from the original data and is graded by the table's state after the write. Step 1 lowers a price on the server. Step 2 removes an attribute with `REMOVE`. Step 3 appends a tag to the end of the list. Step 4 uses `if_not_exists` to count from an attribute that does not exist yet.

## Recap

- Four clauses: `SET`, `REMOVE`, `ADD`, `DELETE`, each at most once.
- Computations run on the server, on one item, atomically.
- Values always go through `:x`, numbers included.
- `list_append` joins in the order written; `if_not_exists` gives a default.
