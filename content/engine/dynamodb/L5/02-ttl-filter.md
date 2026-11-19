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
      expect: { Count: 2, ScannedCount: 6 }
      hint: { vi: "`expires_at` không phải khóa, nên điều kiện thời gian nằm trong `FilterExpression`.", en: "`expires_at` is not a key, so the time condition goes in `FilterExpression`." }
quiz:
  - q: { vi: "Kết quả bước 1 có `Count` 2 và `ScannedCount` 6. Bạn trả tiền đọc cho bao nhiêu item?", en: "Step 1 returns `Count` 2 and `ScannedCount` 6. How many items do you pay to read?" }
    options:
      - { vi: "2", en: "2" }
      - { vi: "6: item đã hết hạn nhưng chưa bị xóa vẫn tính vào chi phí đọc và lưu trữ", en: "6: expired items not yet deleted still count toward read and storage cost" }
      - { vi: "0, vì TTL miễn phí", en: "0, because TTL is free" }
    answer: 1
    why: { vi: "Bộ lọc chạy sau khi đọc. Item hết hạn còn nằm trong bảng tới khi tiến trình nền xóa nó, và vẫn tốn đọc lẫn lưu trữ.", en: "The filter runs after the read. An expired item stays in the table until the background process deletes it, and still costs reads and storage." }
  - q: { vi: "TTL xóa một item. Điều gì đúng?", en: "TTL deletes an item. What is true?" }
    options:
      - { vi: "Lần xóa không tốn WCU, và hiện trong Streams như service deletion (`principalId` là `dynamodb.amazonaws.com`)", en: "The delete consumes no WCU, and appears in Streams as a service deletion (`principalId` is `dynamodb.amazonaws.com`)" }
      - { vi: "Tốn 1 WCU mỗi item như DeleteItem", en: "It costs 1 WCU per item like DeleteItem" }
      - { vi: "Không xuất hiện trong Streams", en: "It does not appear in Streams" }
    answer: 0
    why: { vi: "TTL xóa không tốn throughput ghi ở Region nơi item hết hạn; bản ghi stream có `userIdentity` loại `Service`. Bộ xử lý dựa vào đó để tách xóa do hết hạn với xóa do người dùng.", en: "TTL deletes use no write throughput in the Region where the item expires; the stream record has a `userIdentity` of type `Service`. Consumers use that to tell expiry deletes from user deletes." }
---

## Ý chính

**TTL** (Time to Live) cho mỗi item một thời điểm hết hạn; DynamoDB tự xóa item đã hết hạn **trong vòng vài ngày**, không tốn WCU.

- Thuộc tính TTL phải là **Number**, giá trị là **giây epoch Unix**. Kiểu khác thì bị bỏ qua.
- Item hết hạn nhưng chưa bị xóa **vẫn hiện** trong Query/Scan, vẫn tính tiền đọc và lưu trữ. Phải lọc bằng `FilterExpression` (`expires_at > :now`).
- Trước khi bị xóa, bạn vẫn sửa được item hoặc lùi hạn; khi đó nên dùng điều kiện để chắc item chưa bị xóa.
- Lần xóa của TTL vào Streams như **service deletion** và được gỡ khỏi LSI/GSI như lần xóa thường.

Bộ máy trong trình duyệt chưa có tiến trình TTL (`UpdateTimeToLive` trả `UnsupportedOperation`), nên ở đây không item nào tự biến mất. Đó lại đúng là tình huống cần học: item hết hạn vẫn còn, bạn phải tự lọc.

## Ví dụ

```text
pk        sk      expires_at    now = 1795132800
USER#u1   SES#01  1794873600    expired (3 days ago) -> filtered out
USER#u1   SES#05  1795136400    valid (1 hour left)  -> returned
```

## Thực hành

`USER#u1` có 6 phiên, 4 phiên đã hết hạn nhưng chưa bị xóa.

# EN

## Key idea

**TTL** (Time to Live) gives each item an expiry time; DynamoDB deletes expired items by itself **within a few days**, without consuming WCU.

- The TTL attribute must be a **Number** holding **Unix epoch seconds**. Any other type is ignored.
- An expired item not yet deleted **still shows** in Query/Scan and still costs reads and storage. Filter it with a `FilterExpression` (`expires_at > :now`).
- Before deletion you can still update the item or push the expiry back; use a condition to make sure it has not been deleted meanwhile.
- A TTL delete reaches Streams as a **service deletion** and is removed from LSIs/GSIs like a normal delete.

The in-browser engine has no TTL process (`UpdateTimeToLive` returns `UnsupportedOperation`), so no item disappears by itself here. That is exactly the situation to learn: expired items are still there and you must filter them yourself.

## Example

```text
pk        sk      expires_at    now = 1795132800
USER#u1   SES#01  1794873600    expired (3 days ago) -> filtered out
USER#u1   SES#05  1795136400    valid (1 hour left)  -> returned
```

## Practice

`USER#u1` has 6 sessions, 4 of them expired but not yet deleted.
