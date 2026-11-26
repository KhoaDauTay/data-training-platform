---
id: e-dy-l5-02
engine: dynamodb
level: L5
module: streams-ttl
title: "TTL: hết hạn chưa có nghĩa là đã biến mất"
title_en: "TTL: expired does not mean gone"
kind: lab
runtime: browser
minutes: 10
objectives:
  - { vi: "Lưu thời điểm hết hạn bằng số giây epoch kiểu Number", en: "Store the expiry time as epoch seconds of type Number" }
  - { vi: "Lọc item đã hết hạn khỏi kết quả đọc, vì TTL xóa trễ tới vài ngày", en: "Filter expired items out of a read, since TTL deletes up to a few days late" }
  - { vi: "Lùi hạn một item chỉ khi nó chưa hết hạn, bằng ghi có điều kiện", en: "Push an item's expiry back only while it has not expired, with a conditional write" }
requires: [e-dy-l5-01]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ttl-expired-items.html
lab:
  setup: |
    {"tables": [
      {"TableName":"Sessions","KeySchema":[{"AttributeName":"pk","KeyType":"HASH"},{"AttributeName":"sk","KeyType":"RANGE"}],"AttributeDefinitions":[{"AttributeName":"pk","AttributeType":"S"},{"AttributeName":"sk","AttributeType":"S"}],"BillingMode":"PAY_PER_REQUEST"}
    ], "items": {
      "Sessions": [
        {"pk":"USER#u1","sk":"SES#01","device":"web","expires_at":1794873600},
        {"pk":"USER#u1","sk":"SES#02","device":"ios","expires_at":1795129200},
        {"pk":"USER#u1","sk":"SES#03","device":"android","expires_at":1795132740},
        {"pk":"USER#u1","sk":"SES#04","device":"web","expires_at":1794268800},
        {"pk":"USER#u1","sk":"SES#05","device":"ios","expires_at":1795136400},
        {"pk":"USER#u1","sk":"SES#06","device":"android","expires_at":1795651200},
        {"pk":"USER#u2","sk":"SES#01","device":"web","expires_at":1795125600},
        {"pk":"USER#u2","sk":"SES#02","device":"ios","expires_at":1795140000},
        {"pk":"USER#u2","sk":"SES#03","device":"android","expires_at":1795219200},
        {"pk":"USER#u3","sk":"SES#01","device":"web","expires_at":1794960000},
        {"pk":"USER#u3","sk":"SES#02","device":"ios","expires_at":1795132799}
      ]
    }}
  steps:
    - task: { vi: "Bảng `Sessions` lưu phiên đăng nhập; `expires_at` là thời điểm hết hạn (giây epoch). Bây giờ là `1795132800` (2026-11-20 00:00 UTC). Đọc các phiên **còn hiệu lực** của người dùng `USER#u1`.", en: "The `Sessions` table stores login sessions; `expires_at` is the expiry time (epoch seconds). Now is `1795132800` (2026-11-20 00:00 UTC). Read the **still valid** sessions of user `USER#u1`." }
      solution: |
        {"op": "Query", "input": {"TableName": "Sessions", "KeyConditionExpression": "pk = :u", "FilterExpression": "expires_at > :now", "ExpressionAttributeValues": {":u": {"S": "USER#u1"}, ":now": {"N": "1795132800"}}}}
      check: doc
      perf: { table: Sessions }
      slow: |
        {"op":"Scan","input":{"TableName":"Sessions","ExpressionAttributeValues":{":u":{"S":"USER#u1"},":now":{"N":"1795132800"}},"FilterExpression":"(pk = :u) AND (expires_at > :now)"}}
      expect: { Count: 2, ScannedCount: 6 }
      hint: { vi: "`expires_at` không phải khóa, nên điều kiện thời gian nằm trong `FilterExpression`.", en: "`expires_at` is not a key, so the time condition goes in `FilterExpression`." }
    - task: { vi: "Người dùng vừa thao tác trên phiên `SES#05` của `USER#u1`, nên lùi hạn phiên đó tới `1795140000`. Chỉ lùi khi phiên **chưa hết hạn** lúc này (`1795132800`): một phiên đã hết hạn có thể đang chờ TTL xóa.", en: "The user just acted on session `SES#05` of `USER#u1`, so push its expiry to `1795140000`. Only do it while the session is **not yet expired** now (`1795132800`): an expired session may be waiting for TTL to delete it." }
      solution: |
        {"op": "UpdateItem", "input": {"TableName": "Sessions", "Key": {"pk": {"S": "USER#u1"}, "sk": {"S": "SES#05"}}, "UpdateExpression": "SET expires_at = :later", "ConditionExpression": "expires_at > :now", "ExpressionAttributeValues": {":later": {"N": "1795140000"}, ":now": {"N": "1795132800"}}}}
      check: doc
      hint: { vi: "`UpdateItem` với `ConditionExpression` so `expires_at` với thời điểm hiện tại.", en: "`UpdateItem` with a `ConditionExpression` comparing `expires_at` to the current time." }
    - task: { vi: "Viết lại bước 1 bằng PartiQL cho người dùng `USER#u2`: mọi phiên còn hiệu lực lúc `1795132800`.", en: "Rewrite step 1 in PartiQL for user `USER#u2`: every session still valid at `1795132800`." }
      solution: |
        SELECT * FROM "Sessions" WHERE pk = 'USER#u2' AND expires_at > 1795132800
      check: doc
      hint: { vi: "Bằng trên `pk` để engine đọc như một Query; điều kiện thời gian đi kèm bằng `AND`.", en: "Equality on `pk` so the engine reads it like a Query; the time condition joins with `AND`." }
quiz:
  - q: { vi: "Kết quả bước 1 có `Count` 2 và `ScannedCount` 6. Bạn trả tiền đọc cho bao nhiêu item?", en: "Step 1 returns `Count` 2 and `ScannedCount` 6. How many items do you pay to read?" }
    options:
      - { vi: "2", en: "2" }
      - { vi: "6: item đã hết hạn nhưng chưa bị xóa vẫn tính vào chi phí đọc và lưu trữ", en: "6: expired items not yet deleted still count toward read and storage cost" }
      - { vi: "0, vì TTL miễn phí", en: "0, because TTL is free" }
    answer: 1
    trap: 0
    why: { vi: "2 là số item còn lại sau `FilterExpression`, nhưng bộ lọc chạy sau khi đọc: Query đã đọc cả 6 phiên của `USER#u1` rồi mới bỏ 4 phiên hết hạn, và tiền đọc tính trên 6. TTL (time to live, hạn sống của item) chỉ miễn phí cho lần xóa; item hết hạn còn nằm trong bảng tới khi tiến trình nền xóa nó, nên vẫn tốn đọc lẫn lưu trữ.", en: "2 is the number of items left after the `FilterExpression`, but the filter runs after the read: the Query read all 6 sessions of `USER#u1` and only then dropped the 4 expired ones, and the read is billed on 6. TTL (time to live) is free only for the delete itself; an expired item stays in the table until the background process deletes it, so it still costs reads and storage." }
  - q: { vi: "TTL xóa một item. Điều gì đúng?", en: "TTL deletes an item. What is true?" }
    options:
      - { vi: "Lần xóa không tốn WCU, và hiện trong Streams như service deletion (`principalId` là `dynamodb.amazonaws.com`)", en: "The delete consumes no WCU, and appears in Streams as a service deletion (`principalId` is `dynamodb.amazonaws.com`)" }
      - { vi: "Tốn 1 WCU mỗi item như DeleteItem", en: "It costs 1 WCU per item like DeleteItem" }
      - { vi: "Không xuất hiện trong Streams", en: "It does not appear in Streams" }
    answer: 0
    why: { vi: "Lần xóa do TTL (time to live, hạn sống của item) là việc của tiến trình nền DynamoDB, không phải request `DeleteItem` của bạn, nên không tốn WCU (write capacity unit, đơn vị ghi) ở Region nơi item hết hạn. Nó vẫn vào Streams như mọi lần xóa khác, kèm `userIdentity` loại `Service`. Bộ xử lý dựa vào đó để tách xóa do hết hạn với xóa do người dùng.", en: "A TTL (time to live) delete is done by DynamoDB's background process, not by a `DeleteItem` request of yours, so it consumes no WCU (write capacity unit) in the Region where the item expires. It still reaches Streams like any other delete, with a `userIdentity` of type `Service`. Consumers use that to tell expiry deletes from user deletes." }
---

## Mở bài

Phiên đăng nhập hết hạn sau 30 ngày, và bạn bật TTL để DynamoDB tự dọn. Sáng nay một người dùng vẫn thấy phiên đã hết hạn từ ba ngày trước trong danh sách thiết bị. TTL hỏng, hay bạn đọc sai?

## Ý chính

**TTL** (Time to Live) cho mỗi item một thời điểm hết hạn; một tiến trình nền xóa item đã hết hạn, thường **trong vòng vài ngày**, và lần xóa đó không tốn WCU. Thuộc tính TTL phải là **Number** chứa **giây epoch Unix**; kiểu khác (ví dụ chuỗi) bị bỏ qua, còn giá trị mili giây là một thời điểm rất xa, nên item không bao giờ hết hạn.

Nhiều người nghĩ hết hạn là biến mất. Thật ra item hết hạn mà chưa bị xóa **vẫn hiện** trong `GetItem`, Query, Scan, vẫn tính tiền đọc và lưu trữ. Mọi lần đọc phải tự lọc: `FilterExpression` `expires_at > :now`. Bộ lọc chạy sau khi đọc, nên `ScannedCount` vẫn đếm cả item đã hết hạn.

Trước khi bị xóa, item vẫn sửa được. Muốn lùi hạn một phiên đang dùng, hãy ghi có điều kiện (`expires_at > :now`) để không vô tình hồi sinh một phiên đã hết hạn. Lần xóa của TTL vào Streams như **service deletion** và được gỡ khỏi LSI/GSI như lần xóa thường.

Bộ máy trong trình duyệt chưa có tiến trình TTL (`UpdateTimeToLive` bị từ chối), nên ở đây không item nào tự biến mất: đúng tình huống cần tập lọc.

## Cú pháp

```text
UpdateTimeToLive { TableName, TimeToLiveSpecification: { Enabled: true, AttributeName: "expires_at" } }
"FilterExpression": "expires_at > :now"            ":now": {"N": "<epoch seconds>"}
"ConditionExpression": "expires_at > :now"         on UpdateItem / PutItem / DeleteItem
```

- `AttributeName`: thuộc tính Number giữ giây epoch; mỗi bảng một thuộc tính TTL.
- `FilterExpression`: bỏ item hết hạn khỏi kết quả, không bớt phần đọc.
- `ConditionExpression`: ghi chỉ khi item còn hạn.

## Ví dụ

Phiên còn hiệu lực của `USER#u2` lúc `1795132800`:

```json
{"op": "Query", "input": {"TableName": "Sessions", "KeyConditionExpression": "pk = :u", "FilterExpression": "expires_at > :now", "ExpressionAttributeValues": {":u": {"S": "USER#u2"}, ":now": {"N": "1795132800"}}}}
```

`Count` 2, `ScannedCount` 3: phiên `SES#01` đã hết hạn vẫn được đọc rồi mới bị lọc.

Đọc thẳng một phiên đã hết hạn ba ngày:

```json
{"op": "GetItem", "input": {"TableName": "Sessions", "Key": {"pk": {"S": "USER#u1"}, "sk": {"S": "SES#01"}}}}
```

Item vẫn trả về đủ: `GetItem` không biết gì về TTL.

Cùng câu hỏi bằng PartiQL:

```partiql
SELECT sk, expires_at FROM "Sessions" WHERE pk = 'USER#u1' AND expires_at > 1795132800
```

Hai phiên `SES#05` và `SES#06`.

## Lỗi hay gặp

Đọc mà quên lọc:

```json
// WRONG: returns all 6 sessions, 4 of them expired
{"op": "Query", "input": {"TableName": "Sessions", "KeyConditionExpression": "pk = :u", "ExpressionAttributeValues": {":u": {"S": "USER#u1"}}}}
```

```json
// FIX: filter on the expiry time
{"op": "Query", "input": {"TableName": "Sessions", "KeyConditionExpression": "pk = :u", "FilterExpression": "expires_at > :now", "ExpressionAttributeValues": {":u": {"S": "USER#u1"}, ":now": {"N": "1795132800"}}}}
```

So với thời điểm tính bằng mili giây:

```json
// WRONG: now in milliseconds, every session looks expired
{"op": "Query", "input": {"TableName": "Sessions", "KeyConditionExpression": "pk = :u", "FilterExpression": "expires_at > :now", "ExpressionAttributeValues": {":u": {"S": "USER#u2"}, ":now": {"N": "1795132800000"}}}}
```

```json
// FIX: TTL values and comparisons use epoch seconds
{"op": "Query", "input": {"TableName": "Sessions", "KeyConditionExpression": "pk = :u", "FilterExpression": "expires_at > :now", "ExpressionAttributeValues": {":u": {"S": "USER#u2"}, ":now": {"N": "1795132800"}}}}
```

Câu sai ra 0 phiên mà không báo lỗi: `1795132800000` lớn cỡ 1000 lần mọi `expires_at` tính bằng giây, nên `expires_at > :now` sai với mọi phiên. Ngược lại, nếu lưu `expires_at` bằng mili giây, TTL coi đó là một thời điểm rất xa trong tương lai và không bao giờ xóa.

Lùi hạn một phiên đã hết hạn:

```json
// ERROR ConditionalCheckFailedException
{"op": "UpdateItem", "input": {"TableName": "Sessions", "Key": {"pk": {"S": "USER#u1"}, "sk": {"S": "SES#01"}}, "UpdateExpression": "SET expires_at = :later", "ConditionExpression": "expires_at > :now", "ExpressionAttributeValues": {":later": {"N": "1795140000"}, ":now": {"N": "1795132800"}}}}
```

Đây là lỗi bạn muốn: điều kiện chặn việc hồi sinh phiên `SES#01`. Bắt lỗi này và bắt người dùng đăng nhập lại.

## Thực hành

`USER#u1` có 6 phiên, 4 phiên đã hết hạn nhưng chưa bị xóa. Ba bước: đọc phiên còn hiệu lực, lùi hạn một phiên còn dùng, rồi viết lại phép đọc bằng PartiQL. Bước 1 có thanh chi phí: một Scan cho cùng item vẫn không đạt.

## Tóm tắt

- TTL cần thuộc tính Number chứa giây epoch; xóa trễ, thường trong vài ngày.
- Item hết hạn vẫn đọc được và vẫn tốn tiền tới khi bị xóa: luôn lọc `expires_at > :now`.
- Bộ lọc chạy sau khi đọc, nên `ScannedCount` vẫn đếm item hết hạn.
- Lùi hạn bằng ghi có điều kiện để không hồi sinh item đã hết hạn.

# EN

## Opening

Login sessions expire after 30 days, and you turned on TTL so DynamoDB cleans up by itself. This morning a user still sees a session that expired three days ago in their device list. Is TTL broken, or are you reading it wrong?

## Key idea

**TTL** (Time to Live) gives each item an expiry time; a background process deletes expired items, typically **within a few days**, and that delete consumes no WCU. The TTL attribute must be a **Number** holding **Unix epoch seconds**; any other type (a string, say) is ignored, and a millisecond value is a time far in the future, so the item never expires.

Many people think expired means gone. In fact an expired item that is not yet deleted **still shows** in `GetItem`, Query and Scan, and still costs reads and storage. Every read must filter by itself: `FilterExpression` `expires_at > :now`. The filter runs after the read, so `ScannedCount` still counts the expired items.

Before deletion the item can still be updated. To push back the expiry of a session in use, write with a condition (`expires_at > :now`) so you never revive an expired session by accident. A TTL delete reaches Streams as a **service deletion** and is removed from LSIs/GSIs like a normal delete.

The in-browser engine has no TTL process (`UpdateTimeToLive` is refused), so no item disappears by itself here: exactly the situation to practise filtering.

## Syntax

```text
UpdateTimeToLive { TableName, TimeToLiveSpecification: { Enabled: true, AttributeName: "expires_at" } }
"FilterExpression": "expires_at > :now"            ":now": {"N": "<epoch seconds>"}
"ConditionExpression": "expires_at > :now"         on UpdateItem / PutItem / DeleteItem
```

- `AttributeName`: a Number attribute holding epoch seconds; one TTL attribute per table.
- `FilterExpression`: drops expired items from the result, does not shrink the read.
- `ConditionExpression`: writes only while the item is still valid.

## Example

Sessions of `USER#u2` still valid at `1795132800`:

```json
{"op": "Query", "input": {"TableName": "Sessions", "KeyConditionExpression": "pk = :u", "FilterExpression": "expires_at > :now", "ExpressionAttributeValues": {":u": {"S": "USER#u2"}, ":now": {"N": "1795132800"}}}}
```

`Count` 2, `ScannedCount` 3: the expired session `SES#01` is still read, then filtered out.

Reading a session that expired three days ago directly:

```json
{"op": "GetItem", "input": {"TableName": "Sessions", "Key": {"pk": {"S": "USER#u1"}, "sk": {"S": "SES#01"}}}}
```

The item comes back in full: `GetItem` knows nothing about TTL.

The same question in PartiQL:

```partiql
SELECT sk, expires_at FROM "Sessions" WHERE pk = 'USER#u1' AND expires_at > 1795132800
```

Two sessions, `SES#05` and `SES#06`.

## Common mistakes

Reading without the filter:

```json
// WRONG: returns all 6 sessions, 4 of them expired
{"op": "Query", "input": {"TableName": "Sessions", "KeyConditionExpression": "pk = :u", "ExpressionAttributeValues": {":u": {"S": "USER#u1"}}}}
```

```json
// FIX: filter on the expiry time
{"op": "Query", "input": {"TableName": "Sessions", "KeyConditionExpression": "pk = :u", "FilterExpression": "expires_at > :now", "ExpressionAttributeValues": {":u": {"S": "USER#u1"}, ":now": {"N": "1795132800"}}}}
```

Comparing with a time in milliseconds:

```json
// WRONG: now in milliseconds, every session looks expired
{"op": "Query", "input": {"TableName": "Sessions", "KeyConditionExpression": "pk = :u", "FilterExpression": "expires_at > :now", "ExpressionAttributeValues": {":u": {"S": "USER#u2"}, ":now": {"N": "1795132800000"}}}}
```

```json
// FIX: TTL values and comparisons use epoch seconds
{"op": "Query", "input": {"TableName": "Sessions", "KeyConditionExpression": "pk = :u", "FilterExpression": "expires_at > :now", "ExpressionAttributeValues": {":u": {"S": "USER#u2"}, ":now": {"N": "1795132800"}}}}
```

The wrong query returns 0 sessions with no error: `1795132800000` is about 1000 times any `expires_at` in seconds, so `expires_at > :now` is false for every session. The other way round, if you store `expires_at` in milliseconds, TTL reads it as a time far in the future and never deletes.

Pushing back an expired session:

```json
// ERROR ConditionalCheckFailedException
{"op": "UpdateItem", "input": {"TableName": "Sessions", "Key": {"pk": {"S": "USER#u1"}, "sk": {"S": "SES#01"}}, "UpdateExpression": "SET expires_at = :later", "ConditionExpression": "expires_at > :now", "ExpressionAttributeValues": {":later": {"N": "1795140000"}, ":now": {"N": "1795132800"}}}}
```

This is the error you want: the condition stops session `SES#01` from being revived. Catch it and ask the user to log in again.

## Practice

`USER#u1` has 6 sessions, 4 of them expired but not yet deleted. Three steps: read the valid sessions, push back a session still in use, then rewrite the read in PartiQL. Step 1 has a cost bar: a Scan that gives the same items still does not pass.

## Recap

- TTL needs a Number attribute holding epoch seconds; it deletes late, typically within a few days.
- Expired items stay readable and billable until deleted: always filter `expires_at > :now`.
- The filter runs after the read, so `ScannedCount` still counts expired items.
- Push an expiry back with a conditional write so you never revive an expired item.
