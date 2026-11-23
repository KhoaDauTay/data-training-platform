---
id: e-dy-l4-10
engine: dynamodb
level: L4
module: patterns
title: "Sort key phân cấp và item phiên bản"
title_en: "Hierarchical sort keys and version items"
kind: lab
runtime: browser
minutes: 12
objectives:
  - { vi: "Ghép sort key theo cấp (thành phố, quận, cửa hàng) để Query ở cấp nào cũng được", en: "Build a sort key by level (city, district, store) so a Query works at any level" }
  - { vi: "Giữ lịch sử phiên bản với item `v000` luôn là bản mới nhất", en: "Keep a version history with a `v000` item that is always the latest copy" }
  - { vi: "Đánh số phiên bản có số 0 đứng trước để thứ tự chuỗi đúng", en: "Zero-pad version numbers so string order is right" }
requires: []
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-sort-keys.html
viz: dy-single-table
lab:
  setup: |
    {"tables": [
      {"TableName":"Places","KeySchema":[{"AttributeName":"pk","KeyType":"HASH"},{"AttributeName":"sk","KeyType":"RANGE"}],"AttributeDefinitions":[{"AttributeName":"pk","AttributeType":"S"},{"AttributeName":"sk","AttributeType":"S"}],"BillingMode":"PAY_PER_REQUEST"},
      {"TableName":"Policies","KeySchema":[{"AttributeName":"pk","KeyType":"HASH"},{"AttributeName":"sk","KeyType":"RANGE"}],"AttributeDefinitions":[{"AttributeName":"pk","AttributeType":"S"},{"AttributeName":"sk","AttributeType":"S"}],"BillingMode":"PAY_PER_REQUEST"}
    ], "items": {
      "Places": [
        {"pk":"COUNTRY#VN","sk":"DN#HAI_CHAU#S01","label":"Bach Dang"},
        {"pk":"COUNTRY#VN","sk":"DN#HAI_CHAU#S02","label":"Han Market"},
        {"pk":"COUNTRY#VN","sk":"DN#SON_TRA#S03","label":"My Khe"},
        {"pk":"COUNTRY#VN","sk":"DN#SON_TRA#S04","label":"An Thuong"},
        {"pk":"COUNTRY#VN","sk":"DN#SON_TRA#S05","label":"Man Thai"},
        {"pk":"COUNTRY#VN","sk":"DN#LIEN_CHIEU#S06","label":"Nam O"},
        {"pk":"COUNTRY#VN","sk":"HUE#PHU_HOI#S07","label":"Le Loi"},
        {"pk":"COUNTRY#VN","sk":"HUE#THUAN_HOA#S08","label":"Citadel"},
        {"pk":"COUNTRY#VN","sk":"HCM#Q1#S09","label":"Ben Thanh"},
        {"pk":"COUNTRY#VN","sk":"HCM#Q1#S10","label":"Nguyen Hue"},
        {"pk":"COUNTRY#VN","sk":"HCM#Q3#S11","label":"Turtle Lake"},
        {"pk":"COUNTRY#VN","sk":"HN#HOAN_KIEM#S12","label":"Old Quarter"}
      ],
      "Policies": [
        {"pk":"POLICY#refund","sk":"v001","text":"Refund within 7 days","author":"ops"},
        {"pk":"POLICY#refund","sk":"v002","text":"Refund within 14 days","author":"legal"},
        {"pk":"POLICY#refund","sk":"v003","text":"Refund within 14 days, receipt needed","author":"ops"},
        {"pk":"POLICY#refund","sk":"v004","text":"Refund within 30 days, receipt needed","author":"legal"},
        {"pk":"POLICY#refund","sk":"v000","text":"Refund within 30 days, receipt needed","author":"legal","latest":4},
        {"pk":"POLICY#shipping","sk":"v001","text":"Free shipping over 500k","author":"ops"},
        {"pk":"POLICY#shipping","sk":"v002","text":"Free shipping over 300k","author":"ops"},
        {"pk":"POLICY#shipping","sk":"v000","text":"Free shipping over 300k","author":"ops","latest":2}
      ]
    }}
  steps:
    - task: { vi: "Bảng `Places`: partition key `COUNTRY#VN`, sort key ghép thành phố, quận và cửa hàng bằng dấu thăng, ví dụ `DN#SON_TRA#S03`. Đọc mọi cửa hàng ở thành phố `DN`.", en: "The `Places` table: partition key `COUNTRY#VN`, sort key joining city, district and store with hash signs, for example `DN#SON_TRA#S03`. Read every store in the city `DN`." }
      solution: |
        {"op": "Query", "input": {"TableName": "Places", "KeyConditionExpression": "pk = :c AND begins_with(sk, :p)", "ExpressionAttributeValues": {":c": {"S": "COUNTRY#VN"}, ":p": {"S": "DN#"}}}}
      check: doc
      perf: { table: Places }
      slow: |
        {"op":"Scan","input":{"TableName":"Places","ExpressionAttributeValues":{":c":{"S":"COUNTRY#VN"},":p":{"S":"DN#"}},"FilterExpression":"(pk = :c AND begins_with(sk, :p))"}}
      expect: { Count: 6, ScannedCount: 6 }
      hint: { vi: "Giữ dấu `#` cuối tiền tố, để `DN` không khớp nhầm một thành phố bắt đầu bằng `DN` khác.", en: "Keep the trailing `#` in the prefix so `DN` cannot match another city that starts with `DN`." }
    - task: { vi: "Hạ một cấp: đọc mọi cửa hàng ở quận `SON_TRA` của thành phố `DN`.", en: "One level down: read every store in district `SON_TRA` of the city `DN`." }
      solution: |
        {"op": "Query", "input": {"TableName": "Places", "KeyConditionExpression": "pk = :c AND begins_with(sk, :p)", "ExpressionAttributeValues": {":c": {"S": "COUNTRY#VN"}, ":p": {"S": "DN#SON_TRA#"}}}}
      check: doc
      perf: { table: Places }
      slow: |
        {"op":"Scan","input":{"TableName":"Places","ExpressionAttributeValues":{":c":{"S":"COUNTRY#VN"},":p":{"S":"DN#SON_TRA#"}},"FilterExpression":"(pk = :c AND begins_with(sk, :p))"}}
      expect: { Count: 3, ScannedCount: 3 }
      hint: { vi: "Cùng Query, chỉ dài tiền tố hơn.", en: "Same Query, just a longer prefix." }
    - task: { vi: "Bảng `Policies` giữ lịch sử chính sách: `v001`, `v002`… là các bản cũ, `v000` là bản sao của bản mới nhất. Đọc bản mới nhất của chính sách `POLICY#refund` bằng một GetItem.", en: "The `Policies` table keeps a policy's history: `v001`, `v002`… are past versions, `v000` is a copy of the latest. Read the latest version of policy `POLICY#refund` with one GetItem." }
      solution: |
        {"op": "GetItem", "input": {"TableName": "Policies", "Key": {"pk": {"S": "POLICY#refund"}, "sk": {"S": "v000"}}}}
      check: doc
      perf: { table: Policies }
      slow: |
        {"op":"Scan","input":{"TableName":"Policies","FilterExpression":"#k0 = :k0 AND #k1 = :k1","ExpressionAttributeNames":{"#k0":"pk","#k1":"sk"},"ExpressionAttributeValues":{":k0":{"S":"POLICY#refund"},":k1":{"S":"v000"}}}}
      expect: { Count: 1 }
      hint: { vi: "Bản mới nhất luôn nằm ở sort key `v000`.", en: "The latest copy always lives at sort key `v000`." }
    - task: { vi: "Đọc toàn bộ lịch sử của `POLICY#refund` theo thứ tự phiên bản, bỏ bản sao `v000`.", en: "Read the whole history of `POLICY#refund` in version order, without the `v000` copy." }
      solution: |
        {"op": "Query", "input": {"TableName": "Policies", "KeyConditionExpression": "pk = :p AND sk > :z", "ExpressionAttributeValues": {":p": {"S": "POLICY#refund"}, ":z": {"S": "v000"}}}}
      check: doc
      perf: { table: Policies }
      slow: |
        {"op":"Scan","input":{"TableName":"Policies","ExpressionAttributeValues":{":p":{"S":"POLICY#refund"},":z":{"S":"v000"}},"FilterExpression":"(pk = :p AND sk > :z)"}}
      ordered: true
      expect: { Count: 4, ScannedCount: 4 }
      hint: { vi: "Điều kiện `>` trên sort key bỏ được `v000` mà không cần FilterExpression.", en: "A `>` condition on the sort key drops `v000` without a FilterExpression." }
quiz:
  - q: { vi: "Phiên bản được đánh `v1`, `v2`, …, `v10`. Query lịch sử theo sort key tăng dần trả thứ tự nào?", en: "Versions are numbered `v1`, `v2`, …, `v10`. A history Query in ascending sort key order returns which order?" }
    options:
      - { vi: "`v1`, `v2`, …, `v10`, đúng thứ tự số", en: "`v1`, `v2`, …, `v10`, in numeric order" }
      - { vi: "`v1`, `v10`, `v2`, …: sort key chuỗi so từng ký tự", en: "`v1`, `v10`, `v2`, …: a string sort key compares character by character" }
      - { vi: "Thứ tự ghi vào bảng", en: "The order they were written" }
    answer: 1
    trap: 0
    why: { vi: "Nghe hợp lý vì con người đọc số, nhưng sort key kiểu chuỗi so byte: `v10` có `1` ở vị trí thứ hai nên đứng trước `v2`. Đánh `v001`, `v002`, …, `v010` thì thứ tự chuỗi trùng thứ tự số.", en: "It sounds right because people read numbers, but a string sort key compares bytes: `v10` has `1` in second place, so it comes before `v2`. Numbering `v001`, `v002`, …, `v010` makes string order match numeric order." }
  - q: { vi: "Vì sao tiền tố `DN#` có dấu `#` ở cuối?", en: "Why does the prefix `DN#` end with a `#`?" }
    options:
      - { vi: "Để `begins_with` không khớp nhầm một thành phố khác có mã bắt đầu bằng `DN`", en: "So `begins_with` cannot also match another city whose code starts with `DN`" }
      - { vi: "DynamoDB bắt buộc sort key kết thúc bằng `#`", en: "DynamoDB requires sort keys to end with `#`" }
      - { vi: "Để Query nhất quán mạnh", en: "To make the Query strongly consistent" }
    answer: 0
    why: { vi: "`begins_with(sk, 'DN')` cũng khớp một mã như `DNG#…`. Dấu phân cách cuối tiền tố giới hạn đúng một cấp.", en: "`begins_with(sk, 'DN')` would also match a code such as `DNG#…`. The separator at the end of the prefix limits it to exactly one level." }
---
## Mở bài

Trang cửa hàng cần lọc theo thành phố, rồi theo quận; trang chính sách cần bản mới nhất và cả lịch sử sửa đổi. Bốn câu hỏi này có thể là bốn Query trên đúng một kiểu khóa. Bí quyết nằm ở cách ghép sort key.

## Ý chính

Sort key tốt gom dữ liệu liên quan vào một chỗ và cho phép đọc theo khoảng (`begins_with`, `BETWEEN`, `>`, `<`). Sort key phân cấp ghép các cấp từ to tới nhỏ, ví dụ `[thành phố]#[quận]#[cửa hàng]`. Một Query với tiền tố dài ngắn khác nhau trả về đúng một cấp; giữ dấu `#` cuối tiền tố để không khớp nhầm cấp khác.

Item phiên bản: mỗi lần sửa, ghi một item mới với số phiên bản kế tiếp (`v001`, `v002`…) và chép nội dung mới vào item `v000`. Bản mới nhất là một GetItem; lịch sử là một Query `sk > v000`. Ghi phiên bản mới là hai lần ghi; muốn cả hai cùng thành công hoặc cùng không thì dùng transaction (bài 11).

Nhiều người nghĩ `v2` luôn đứng trước `v10`. Thật ra sort key là chuỗi, so từng byte: `v10` đứng trước `v2`. Đánh số có số 0 đứng trước (`v002`, `v010`) thì thứ tự chuỗi trùng thứ tự số.

Lab chạy bằng dynoxide trong trình duyệt.

## Cú pháp

```text
hierarchy:  sk = "<city>#<district>#<store>"
level read: "pk = :c AND begins_with(sk, :prefix)"     -- prefix ends with #
versions:   sk = "v000" (latest copy), "v001", "v002", ... (zero-padded)
latest:     {"op": "GetItem", "input": {..., "Key": {"pk": ..., "sk": {"S": "v000"}}}}
history:    "pk = :p AND sk > :z"    with :z = "v000"
```

- Cấp to đứng trước, cấp nhỏ đứng sau.
- Tiền tố kết thúc bằng dấu phân cách.
- Số phiên bản có độ dài cố định.

## Ví dụ

Mọi cửa hàng ở `HCM`:

```json
{"op": "Query", "input": {"TableName": "Places", "KeyConditionExpression": "pk = :c AND begins_with(sk, :p)", "ExpressionAttributeValues": {":c": {"S": "COUNTRY#VN"}, ":p": {"S": "HCM#"}}}}
```

Ba cửa hàng; thêm `Q1#` vào tiền tố thì còn hai.

Bản mới nhất của chính sách giao hàng:

```json
{"op": "GetItem", "input": {"TableName": "Policies", "Key": {"pk": {"S": "POLICY#shipping"}, "sk": {"S": "v000"}}}}
```

`Free shipping over 300k`, với `latest` là 2.

Phiên bản cũ gần nhất, đọc ngược sort key:

```json
{"op": "Query", "input": {"TableName": "Policies", "KeyConditionExpression": "pk = :p AND sk > :z", "ExpressionAttributeValues": {":p": {"S": "POLICY#refund"}, ":z": {"S": "v000"}}, "ScanIndexForward": false, "Limit": 1}}
```

`v004`, cùng nội dung với `v000`.

## Lỗi hay gặp

Tiền tố thiếu dấu phân cách:

```json
// WRONG: "H" matches HN, HUE and HCM
{"op": "Query", "input": {"TableName": "Places", "KeyConditionExpression": "pk = :c AND begins_with(sk, :p)", "ExpressionAttributeValues": {":c": {"S": "COUNTRY#VN"}, ":p": {"S": "H"}}}}
```

```json
// FIX: the whole level plus the separator
{"op": "Query", "input": {"TableName": "Places", "KeyConditionExpression": "pk = :c AND begins_with(sk, :p)", "ExpressionAttributeValues": {":c": {"S": "COUNTRY#VN"}, ":p": {"S": "HUE#"}}}}
```

Câu sai trả 6 cửa hàng ở ba thành phố; câu sửa chỉ 2 cửa hàng ở `HUE`.

Đọc lịch sử mà quên bỏ `v000`:

```json
// WRONG: the latest copy appears twice (v000 and v004)
{"op": "Query", "input": {"TableName": "Policies", "KeyConditionExpression": "pk = :p", "ExpressionAttributeValues": {":p": {"S": "POLICY#refund"}}}}
```

```json
// FIX: start after v000
{"op": "Query", "input": {"TableName": "Policies", "KeyConditionExpression": "pk = :p AND sk > :z", "ExpressionAttributeValues": {":p": {"S": "POLICY#refund"}, ":z": {"S": "v000"}}}}
```

Câu sai trả 5 item, trong đó một bản là bản sao; câu sửa trả đúng 4 phiên bản.

## Thực hành

12 cửa hàng ở 4 thành phố trong `Places`; hai chính sách trong `Policies`. Đọc theo thành phố, theo quận, đọc bản mới nhất và cả lịch sử.

## Tóm tắt

- Sort key phân cấp: cấp to trước, nối bằng dấu phân cách; `begins_with` chọn một cấp.
- Giữ dấu phân cách cuối tiền tố để không khớp nhầm.
- `v000` là bản sao mới nhất: một GetItem; lịch sử là `sk > v000`.
- Sort key chuỗi so byte: đánh số có số 0 đứng trước.

# EN

## Opening

The store page filters by city, then by district; the policy page needs the latest version and the whole edit history. These four questions can be four Queries on a single key design. The trick is how the sort key is built.

## Key idea

A good sort key gathers related data in one place and allows range reads (`begins_with`, `BETWEEN`, `>`, `<`). A hierarchical sort key joins the levels from broad to narrow, for example `[city]#[district]#[store]`. A Query with a longer or shorter prefix returns exactly one level; keep the `#` at the end of the prefix so it cannot match another level.

Version items: on each change, write a new item with the next version number (`v001`, `v002`…) and copy the new content into the `v000` item. The latest copy is one GetItem; the history is one Query with `sk > v000`. Writing a new version is two writes; to make both succeed or neither, use a transaction (lesson 11).

Many people think `v2` always comes before `v10`. In fact the sort key is a string, compared byte by byte: `v10` comes before `v2`. Zero-padded numbers (`v002`, `v010`) make string order match numeric order.

The lab runs on dynoxide in the browser.

## Syntax

```text
hierarchy:  sk = "<city>#<district>#<store>"
level read: "pk = :c AND begins_with(sk, :prefix)"     -- prefix ends with #
versions:   sk = "v000" (latest copy), "v001", "v002", ... (zero-padded)
latest:     {"op": "GetItem", "input": {..., "Key": {"pk": ..., "sk": {"S": "v000"}}}}
history:    "pk = :p AND sk > :z"    with :z = "v000"
```

- Broad levels first, narrow levels after.
- The prefix ends with the separator.
- Version numbers have a fixed length.

## Example

Every store in `HCM`:

```json
{"op": "Query", "input": {"TableName": "Places", "KeyConditionExpression": "pk = :c AND begins_with(sk, :p)", "ExpressionAttributeValues": {":c": {"S": "COUNTRY#VN"}, ":p": {"S": "HCM#"}}}}
```

Three stores; add `Q1#` to the prefix and two remain.

The latest shipping policy:

```json
{"op": "GetItem", "input": {"TableName": "Policies", "Key": {"pk": {"S": "POLICY#shipping"}, "sk": {"S": "v000"}}}}
```

`Free shipping over 300k`, with `latest` set to 2.

The most recent past version, reading the sort key backwards:

```json
{"op": "Query", "input": {"TableName": "Policies", "KeyConditionExpression": "pk = :p AND sk > :z", "ExpressionAttributeValues": {":p": {"S": "POLICY#refund"}, ":z": {"S": "v000"}}, "ScanIndexForward": false, "Limit": 1}}
```

`v004`, with the same content as `v000`.

## Common mistakes

A prefix without the separator:

```json
// WRONG: "H" matches HN, HUE and HCM
{"op": "Query", "input": {"TableName": "Places", "KeyConditionExpression": "pk = :c AND begins_with(sk, :p)", "ExpressionAttributeValues": {":c": {"S": "COUNTRY#VN"}, ":p": {"S": "H"}}}}
```

```json
// FIX: the whole level plus the separator
{"op": "Query", "input": {"TableName": "Places", "KeyConditionExpression": "pk = :c AND begins_with(sk, :p)", "ExpressionAttributeValues": {":c": {"S": "COUNTRY#VN"}, ":p": {"S": "HUE#"}}}}
```

The wrong query returns 6 stores in three cities; the fix returns only the 2 stores in `HUE`.

Reading the history and forgetting to skip `v000`:

```json
// WRONG: the latest copy appears twice (v000 and v004)
{"op": "Query", "input": {"TableName": "Policies", "KeyConditionExpression": "pk = :p", "ExpressionAttributeValues": {":p": {"S": "POLICY#refund"}}}}
```

```json
// FIX: start after v000
{"op": "Query", "input": {"TableName": "Policies", "KeyConditionExpression": "pk = :p AND sk > :z", "ExpressionAttributeValues": {":p": {"S": "POLICY#refund"}, ":z": {"S": "v000"}}}}
```

The wrong query returns 5 items, one of them a copy; the fix returns exactly the 4 versions.

## Practice

12 stores in 4 cities in `Places`; two policies in `Policies`. Read by city, by district, read the latest version and the whole history.

## Recap

- Hierarchical sort key: broad level first, joined by a separator; `begins_with` picks one level.
- Keep the separator at the end of the prefix to avoid false matches.
- `v000` is the latest copy: one GetItem; the history is `sk > v000`.
- A string sort key compares bytes: zero-pad the numbers.
