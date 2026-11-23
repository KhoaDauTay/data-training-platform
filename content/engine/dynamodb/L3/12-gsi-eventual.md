---
id: e-dy-l3-12
engine: dynamodb
level: L3
module: secondary
title: "GSI chỉ đọc nhất quán cuối"
title_en: "A GSI only has eventually consistent reads"
kind: predict
runtime: browser
minutes: 12
objectives:
  - vi: Thấy DynamoDB từ chối `ConsistentRead` trên GSI (global secondary index) bằng `ValidationException`.
    en: See DynamoDB refuse `ConsistentRead` on a GSI (global secondary index) with a `ValidationException`.
  - vi: Lấy khóa từ GSI rồi đọc bản mới nhất ở bảng chính bằng `GetItem` nhất quán mạnh.
    en: Take the key from the GSI, then read the latest version from the base table with a strongly consistent `GetItem`.
  - vi: Đọc `ConsumedCapacity` của một lần ghi làm đổi khóa GSI.
    en: Read the `ConsumedCapacity` of a write that changes a GSI key.
requires: [e-dy-l3-04]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/read-write-operations.html
predict:
  sql: |
    {"op": "Query", "input": {"TableName": "Orders", "IndexName": "byStatus",
      "KeyConditionExpression": "#s = :s",
      "ExpressionAttributeNames": {"#s": "status"},
      "ExpressionAttributeValues": {":s": {"S": "NEW"}},
      "ConsistentRead": true}}
  q:
    vi: 'Kho muốn chắc chắn thấy cả đơn vừa tạo, nên thêm `"ConsistentRead": true` vào Query trên GSI `byStatus`. Kết quả là gì?'
    en: 'The warehouse wants to be sure it sees the order just created, so it adds `"ConsistentRead": true` to the Query on GSI `byStatus`. What happens?'
  options:
    - vi: Trả 3 đơn `NEW`, đọc nhất quán mạnh, giá gấp đôi
      en: It returns the 3 `NEW` orders with a strong read, at twice the price
    - vi: '`ValidationException`: GSI không có đọc nhất quán mạnh'
      en: '`ValidationException`: a GSI has no strongly consistent reads'
    - vi: DynamoDB bỏ qua tham số và đọc nhất quán cuối
      en: DynamoDB ignores the parameter and reads eventually consistent
  answer: 1
  trap: 0
  why:
    vi: 'Nhiều người nghĩ GSI chỉ là một bảng khác nên đọc mạnh được như bảng chính. Thật ra DynamoDB cập nhật GSI bất đồng bộ ("asynchronously, using an eventually consistent model", docs GSI), nên không có bản "chắc chắn mới nhất" để đọc mạnh. Request bị từ chối bằng một `ValidationException`, thông báo `Consistent reads are not supported on global secondary indexes`. Bước 1 cho bạn thấy thông báo này thật (trang chỉ hiện thông báo, không hiện tên loại lỗi).'
    en: 'Many people think a GSI is just another table, so it allows strong reads like the base table. In fact DynamoDB updates a GSI asynchronously ("asynchronously, using an eventually consistent model", GSI docs), so there is no "surely latest" copy to read strongly. The request is refused with a `ValidationException`, message `Consistent reads are not supported on global secondary indexes`. Step 1 shows you this message for real (the page shows the message, not the error type name).'
quiz:
  - q:
      vi: 'Ứng dụng vừa `PutItem` một đơn `NEW` thành công. Ngay sau đó nó Query `byStatus = NEW`. Đơn mới có chắc nằm trong kết quả không?'
      en: 'The app has just completed a `PutItem` of a `NEW` order. Right after, it queries `byStatus = NEW`. Is the new order sure to be in the result?'
    options:
      - vi: Có, vì `PutItem` đã trả thành công
        en: Yes, because the `PutItem` succeeded
      - vi: Không chắc, GSI có thể chưa nhận bản ghi đó
        en: Not for sure, the GSI may not have the write yet
      - vi: Không bao giờ, GSI chỉ cập nhật mỗi phút một lần
        en: Never, a GSI is only updated once a minute
    answer: 1
    why:
      vi: 'Lần ghi thành công ở bảng chính, rồi DynamoDB mới chép sang GSI, thường dưới một giây nhưng không có gì bảo đảm. Ứng dụng phải chịu được việc GSI trả dữ liệu cũ ("your applications need to anticipate and handle situations", docs GSI). Lưu ý: dynoxide trong trình duyệt cập nhật GSI ngay trong lần ghi, nên ở đây bạn luôn thấy đơn mới. Đó là khác biệt của bộ mô phỏng, không phải bằng chứng cho lựa chọn đầu.'
      en: 'The write succeeds on the base table, and only then does DynamoDB copy it to the GSI, usually in under a second but with no guarantee. The app must cope with the GSI returning stale data ("your applications need to anticipate and handle situations", GSI docs). Note: dynoxide in the browser updates the GSI inside the write, so here you always see the new order. That is a difference of the emulator, not evidence for the first option.'
  - q:
      vi: 'GSI `byStatus` là `KEYS_ONLY`. Một `UpdateItem` chỉ đổi `total` (không phải khóa, không được project) của item nặng dưới 1 KB. Tổng WCU là bao nhiêu?'
      en: 'GSI `byStatus` is `KEYS_ONLY`. An `UpdateItem` changes only `total` (not a key, not projected) of an item under 1 KB. How many WCU in total?'
    options:
      - vi: "1"
        en: "1"
      - vi: "2"
        en: "2"
      - vi: "3"
        en: "3"
    answer: 0
    why:
      vi: 'Chỉ bảng chính tốn 1 WCU. Thuộc tính không có trong GSI thì "no write capacity is consumed for that index" (docs GSI). Đổi `status` thì khác: GSI phải xóa mục cũ và ghi mục mới, nên tốn 2 WCU ở index, như bước 3. dynoxide trả đúng các số này.'
      en: 'Only the base table pays 1 WCU. When the attribute is not in the GSI, "no write capacity is consumed for that index" (GSI docs). Changing `status` is different: the GSI must delete the old entry and write a new one, so the index pays 2 WCU, as in step 3. dynoxide reports these same numbers.'
lab:
  setup: |
    {"tables": [{"TableName":"Orders","BillingMode":"PAY_PER_REQUEST","KeySchema":[{"AttributeName":"customerId","KeyType":"HASH"},{"AttributeName":"orderId","KeyType":"RANGE"}],"AttributeDefinitions":[{"AttributeName":"customerId","AttributeType":"S"},{"AttributeName":"orderId","AttributeType":"S"},{"AttributeName":"status","AttributeType":"S"}],"GlobalSecondaryIndexes":[{"IndexName":"byStatus","KeySchema":[{"AttributeName":"status","KeyType":"HASH"},{"AttributeName":"orderId","KeyType":"RANGE"}],"Projection":{"ProjectionType":"KEYS_ONLY"}}]}],
     "items": {"Orders": [
      {"customerId":"C-01","orderId":"2026-10-02#O-401","status":"PAID","total":250000,"city":"Da Nang"},
      {"customerId":"C-01","orderId":"2026-10-21#O-402","status":"NEW","total":410000,"city":"Da Nang"},
      {"customerId":"C-02","orderId":"2026-10-09#O-403","status":"NEW","total":95000,"city":"Hue"},
      {"customerId":"C-02","orderId":"2026-10-28#O-404","status":"SHIPPED","total":620000,"city":"Hue"},
      {"customerId":"C-03","orderId":"2026-10-30#O-405","status":"NEW","total":180000,"city":"Hoi An"}
    ]}}
  steps:
    - task:
        vi: 'Chạy request ở câu đoán và đọc lỗi. Rồi sửa nó cho chạy được: lấy khóa của mọi đơn `NEW` từ GSI `byStatus`, đơn cũ trước.'
        en: 'Run the request from the prediction and read the error. Then fix it so it runs: get the keys of every `NEW` order from GSI `byStatus`, oldest first.'
      solution: |
        {"op": "Query", "input": {"TableName": "Orders", "IndexName": "byStatus",
          "KeyConditionExpression": "#s = :s",
          "ExpressionAttributeNames": {"#s": "status"},
          "ExpressionAttributeValues": {":s": {"S": "NEW"}}}}
      check: doc
      perf: { table: Orders }
      slow: |
        {"op":"Scan","input":{"TableName":"Orders","IndexName":"byStatus","ExpressionAttributeNames":{"#s":"status"},"ExpressionAttributeValues":{":s":{"S":"NEW"}},"FilterExpression":"(#s = :s)"}}
      ordered: true
      expect: { Count: 3 }
      hint:
        vi: 'Bỏ `"ConsistentRead": true`. Query trên GSI luôn là đọc nhất quán cuối.'
        en: 'Drop `"ConsistentRead": true`. A Query on a GSI is always an eventually consistent read.'
    - task:
        vi: 'Trước khi đóng gói đơn `2026-10-09#O-403` của `C-02`, kho cần trạng thái mới nhất, không phải bản GSI có thể đã cũ. Đọc item đó ở bảng chính bằng đọc nhất quán mạnh.'
        en: 'Before packing order `2026-10-09#O-403` of `C-02`, the warehouse needs the latest status, not a GSI copy that may be stale. Read that item from the base table with a strongly consistent read.'
      solution: |
        {"op": "GetItem", "input": {"TableName": "Orders",
          "Key": {"customerId": {"S": "C-02"}, "orderId": {"S": "2026-10-09#O-403"}},
          "ConsistentRead": true,
          "ReturnConsumedCapacity": "TOTAL"}}
      check: doc
      perf: { table: Orders }
      slow: |
        {"op":"Scan","input":{"TableName":"Orders","FilterExpression":"#k0 = :k0 AND #k1 = :k1","ExpressionAttributeNames":{"#k0":"customerId","#k1":"orderId"},"ExpressionAttributeValues":{":k0":{"S":"C-02"},":k1":{"S":"2026-10-09#O-403"}}}}
      hint:
        vi: '`GetItem` theo khóa bảng chính (`customerId`, `orderId`) lấy từ bước 1, thêm `"ConsistentRead": true`. Item dưới 4 KB nên tốn 1 RCU thay vì 0,5.'
        en: '`GetItem` by the base table key (`customerId`, `orderId`) taken from step 1, plus `"ConsistentRead": true`. The item is under 4 KB, so it costs 1 RCU instead of 0.5.'
    - task:
        vi: 'Khách đã trả tiền: đổi `status` của đơn `2026-10-09#O-403` từ `NEW` sang `PAID`. Thêm `"ReturnConsumedCapacity": "INDEXES"` và đọc tổng WCU ở dòng `ConsumedCapacity`.'
        en: 'The customer has paid: change the `status` of order `2026-10-09#O-403` from `NEW` to `PAID`. Add `"ReturnConsumedCapacity": "INDEXES"` and read the total WCU on the `ConsumedCapacity` line.'
      solution: |
        {"op": "UpdateItem", "input": {"TableName": "Orders",
          "Key": {"customerId": {"S": "C-02"}, "orderId": {"S": "2026-10-09#O-403"}},
          "UpdateExpression": "SET #s = :p",
          "ExpressionAttributeNames": {"#s": "status"},
          "ExpressionAttributeValues": {":p": {"S": "PAID"}},
          "ReturnConsumedCapacity": "INDEXES"}}
      check: doc
      hint:
        vi: '`SET #s = :p`, với `#s` là `status` (từ dành riêng). Tổng là 3 WCU: 1 cho bảng, 2 cho GSI (xóa mục `NEW`, ghi mục `PAID`). Trang chỉ hiện tổng; phản hồi của DynamoDB tách `Table` và `GlobalSecondaryIndexes`.'
        en: '`SET #s = :p`, with `#s` for `status` (a reserved word). The total is 3 WCU: 1 for the table, 2 for the GSI (delete the `NEW` entry, write the `PAID` one). The page shows only the total; the DynamoDB response splits it into `Table` and `GlobalSecondaryIndexes`.'
---

## Mở bài

Đơn vừa tạo, bạn Query GSI ngay và muốn chắc chắn thấy nó. Thêm `ConsistentRead: true` có được không?

## Ý chính

Không. GSI được DynamoDB cập nhật **sau** lần ghi vào bảng chính, bất đồng bộ. Vì vậy:

- Query hoặc Scan trên GSI chỉ đọc nhất quán cuối (eventually consistent). `ConsistentRead: true` bị từ chối bằng `ValidationException`.
- Ngay sau một lần ghi, GSI có thể chưa có item mới, hoặc vẫn giữ giá trị cũ.
- Cần bản mới nhất thì lấy khóa từ GSI, rồi `GetItem` ở bảng chính với `ConsistentRead: true`.

Đổi khóa GSI còn tốn WCU cho index: đổi `status` là 2 lần ghi ở GSI (xóa mục cũ, ghi mục mới).

## Ví dụ

Đọc trạng thái một đơn trước khi đóng gói:

```text
Query byStatus = NEW            -> keys (customerId, orderId), 0.5 RCU, maybe stale
GetItem Orders, ConsistentRead  -> latest version, 1 RCU
```

## Thực hành

Danh sách "đơn đang chờ" đọc từ GSI là đủ: chậm một chút không sao. Chỉ bước quyết định (đóng gói, trừ kho) mới cần đọc lại bảng chính bằng đọc nhất quán mạnh (strongly consistent).

**Khác biệt của bộ mô phỏng:** dynoxide cập nhật GSI ngay trong lần ghi, nên trong trình duyệt bạn không bao giờ thấy GSI chậm. DynamoDB thật cập nhật bất đồng bộ, thường dưới một giây. Thông báo lỗi `ValidationException` và các số WCU ở đây thì giống DynamoDB thật.

## Tóm tắt

- GSI chỉ đọc nhất quán cuối; `ConsistentRead: true` bị từ chối.
- Ngay sau khi ghi, GSI có thể chưa thấy item mới.
- Cần bản mới nhất: lấy khóa từ GSI, `GetItem` bảng chính đọc mạnh.
- Đổi khóa GSI tốn 2 WCU ở index; đổi thuộc tính không project thì không tốn gì ở index.

# EN

## Opening

An order was just created, you query the GSI right away and want to be sure you see it. Does adding `ConsistentRead: true` work?

## Key idea

No. DynamoDB updates a GSI **after** the write to the base table, asynchronously. So:

- A Query or Scan on a GSI is only eventually consistent. `ConsistentRead: true` is refused with a `ValidationException`.
- Right after a write, the GSI may not have the new item yet, or may still hold the old value.
- When you need the latest version, take the key from the GSI, then `GetItem` from the base table with `ConsistentRead: true`.

Changing a GSI key also costs WCU for the index: changing `status` is 2 writes on the GSI (delete the old entry, write the new one).

## Example

Reading an order's status before packing it:

```text
Query byStatus = NEW            -> keys (customerId, orderId), 0.5 RCU, maybe stale
GetItem Orders, ConsistentRead  -> latest version, 1 RCU
```

## Practice

A "waiting orders" list read from the GSI is fine: being a little late does not matter. Only the deciding step (packing, taking stock) needs to read the base table again with a strongly consistent read.

**Emulator difference:** dynoxide updates the GSI inside the write, so in the browser you never see a GSI lag. Real DynamoDB updates it asynchronously, usually in under a second. The `ValidationException` message and the WCU numbers here match real DynamoDB.

## Recap

- A GSI is only eventually consistent; `ConsistentRead: true` is refused.
- Right after a write, the GSI may not show the new item yet.
- For the latest version: take the key from the GSI, then a strong `GetItem` on the base table.
- Changing a GSI key costs 2 WCU on the index; changing an unprojected attribute costs the index nothing.
