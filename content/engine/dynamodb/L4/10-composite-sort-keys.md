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
---

## Ý chính

Sort key tốt gom dữ liệu liên quan vào một chỗ và cho phép đọc theo khoảng (`begins_with`, `BETWEEN`, `>`, `<`).

- **Sort key phân cấp**: ghép các cấp từ to tới nhỏ, `[country]#[region]#[state]#[county]#[city]#[neighborhood]` như ví dụ của AWS. Một Query với tiền tố dài ngắn khác nhau trả về đúng một cấp.
- **Item phiên bản**: mỗi lần sửa, ghi một item mới với số phiên bản kế tiếp (`v001`, `v002`…) và chép nội dung mới vào item `v000`. Bản mới nhất là một GetItem; lịch sử là một Query bỏ `v000`.
- Đánh số có số 0 đứng trước (`v002`, không phải `v2`): sort key là chuỗi, nên `v10` đứng trước `v2`, còn `v010` đứng sau `v002`.

## Ví dụ

```text
pk            sk              text
POLICY#refund v000            Refund within 30 days, receipt needed   (copy of v004)
POLICY#refund v001            Refund within 7 days
POLICY#refund v004            Refund within 30 days, receipt needed
```

Ghi phiên bản mới là hai lần ghi (item `v005` và item `v000`). Muốn hai lần ghi cùng thành công hoặc cùng không thì dùng transaction, xem mô-đun về transaction.

## Thực hành

12 cửa hàng ở 4 thành phố trong `Places`; hai chính sách trong `Policies`.

# EN

## Key idea

A good sort key gathers related data in one place and allows range reads (`begins_with`, `BETWEEN`, `>`, `<`).

- **Hierarchical sort key**: join the levels from broad to narrow, `[country]#[region]#[state]#[county]#[city]#[neighborhood]` as in the AWS example. A Query with a longer or shorter prefix returns exactly one level.
- **Version items**: on each change, write a new item with the next version number (`v001`, `v002`…) and copy the new content into the `v000` item. The latest copy is one GetItem; the history is one Query that skips `v000`.
- Zero-pad the numbers (`v002`, not `v2`): the sort key is a string, so `v10` sorts before `v2`, while `v010` sorts after `v002`.

## Example

```text
pk            sk              text
POLICY#refund v000            Refund within 30 days, receipt needed   (copy of v004)
POLICY#refund v001            Refund within 7 days
POLICY#refund v004            Refund within 30 days, receipt needed
```

Writing a new version is two writes (the `v005` item and the `v000` item). To make both succeed or neither, use a transaction, see the Transactions module.

## Practice

12 stores in 4 cities in `Places`; two policies in `Policies`.
