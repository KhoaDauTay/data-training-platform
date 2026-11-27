---
id: e-dy-l3-09
engine: dynamodb
level: L3
module: single-table
title: "Sort key phân cấp: quốc gia, tỉnh, quận, cửa hàng"
title_en: "Hierarchical sort keys: country, city, district, store"
kind: lab
runtime: browser
minutes: 10
figures: [{ name: dy-sk-hierarchy, at: idea }]
objectives:
  - vi: Ghép nhiều cấp vào sort key (`VN#DA-NANG#HAI-CHAU#S-01`) để đọc ở bất kỳ cấp nào bằng `begins_with`.
    en: Join several levels into a sort key (`VN#DA-NANG#HAI-CHAU#S-01`) to read at any level with `begins_with`.
  - vi: Xếp cấp từ rộng tới hẹp và kết thúc tiền tố bằng dấu phân cách.
    en: Order the levels from broad to narrow and end each prefix with the separator.
requires: [e-dy-l3-08]
sources:
  - { url: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-sort-keys.html, title_vi: "Thực hành tốt: sort key" }
lab:
  setup: |
    {"tables": [{"TableName":"Shop","BillingMode":"PAY_PER_REQUEST","KeySchema":[{"AttributeName":"PK","KeyType":"HASH"},{"AttributeName":"SK","KeyType":"RANGE"}],"AttributeDefinitions":[{"AttributeName":"PK","AttributeType":"S"},{"AttributeName":"SK","AttributeType":"S"},{"AttributeName":"GSI1PK","AttributeType":"S"},{"AttributeName":"GSI1SK","AttributeType":"S"}],"GlobalSecondaryIndexes":[{"IndexName":"GSI1","KeySchema":[{"AttributeName":"GSI1PK","KeyType":"HASH"},{"AttributeName":"GSI1SK","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}]}],
     "items": {"Shop": [
      {"PK":"PRODUCT#P-01","SK":"PRODUCT#P-01","type":"product","name":"Green tea","price":45000},
      {"PK":"PRODUCT#P-02","SK":"PRODUCT#P-02","type":"product","name":"Lotus tea","price":60000},
      {"PK":"PRODUCT#P-03","SK":"PRODUCT#P-03","type":"product","name":"Coffee beans","price":120000},
      {"PK":"PRODUCT#P-04","SK":"PRODUCT#P-04","type":"product","name":"Tea cup","price":80000},
      {"PK":"PRODUCT#P-05","SK":"PRODUCT#P-05","type":"product","name":"Kettle","price":350000},
      {"PK":"CUST#C-01","SK":"PROFILE","type":"customer","name":"An","city":"Da Nang"},
      {"PK":"CUST#C-01","SK":"ORDER#2026-08-26#O-501","type":"order","orderId":"O-501","total":160000},
      {"PK":"ORDER#O-501","SK":"PRODUCT#P-04","type":"line","qty":2,"price":80000,"GSI1PK":"PRODUCT#P-04","GSI1SK":"ORDER#O-501"},
      {"PK":"CUST#C-01","SK":"ORDER#2026-09-08#O-502","type":"order","orderId":"O-502","total":380000},
      {"PK":"ORDER#O-502","SK":"PRODUCT#P-03","type":"line","qty":2,"price":120000,"GSI1PK":"PRODUCT#P-03","GSI1SK":"ORDER#O-502"},
      {"PK":"ORDER#O-502","SK":"PRODUCT#P-02","type":"line","qty":1,"price":60000,"GSI1PK":"PRODUCT#P-02","GSI1SK":"ORDER#O-502"},
      {"PK":"ORDER#O-502","SK":"PRODUCT#P-04","type":"line","qty":1,"price":80000,"GSI1PK":"PRODUCT#P-04","GSI1SK":"ORDER#O-502"},
      {"PK":"CUST#C-02","SK":"PROFILE","type":"customer","name":"Binh","city":"Hue"},
      {"PK":"CUST#C-02","SK":"ORDER#2026-08-28#O-503","type":"order","orderId":"O-503","total":355000},
      {"PK":"ORDER#O-503","SK":"PRODUCT#P-04","type":"line","qty":2,"price":80000,"GSI1PK":"PRODUCT#P-04","GSI1SK":"ORDER#O-503"},
      {"PK":"ORDER#O-503","SK":"PRODUCT#P-01","type":"line","qty":3,"price":45000,"GSI1PK":"PRODUCT#P-01","GSI1SK":"ORDER#O-503"},
      {"PK":"ORDER#O-503","SK":"PRODUCT#P-02","type":"line","qty":1,"price":60000,"GSI1PK":"PRODUCT#P-02","GSI1SK":"ORDER#O-503"},
      {"PK":"CUST#C-02","SK":"ORDER#2026-09-05#O-504","type":"order","orderId":"O-504","total":440000},
      {"PK":"ORDER#O-504","SK":"PRODUCT#P-03","type":"line","qty":3,"price":120000,"GSI1PK":"PRODUCT#P-03","GSI1SK":"ORDER#O-504"},
      {"PK":"ORDER#O-504","SK":"PRODUCT#P-04","type":"line","qty":1,"price":80000,"GSI1PK":"PRODUCT#P-04","GSI1SK":"ORDER#O-504"},
      {"PK":"CUST#C-03","SK":"PROFILE","type":"customer","name":"Chi","city":"Hoi An"},
      {"PK":"CUST#C-03","SK":"ORDER#2026-08-12#O-505","type":"order","orderId":"O-505","total":135000},
      {"PK":"ORDER#O-505","SK":"PRODUCT#P-01","type":"line","qty":3,"price":45000,"GSI1PK":"PRODUCT#P-01","GSI1SK":"ORDER#O-505"},
      {"PK":"CUST#C-03","SK":"ORDER#2026-09-12#O-506","type":"order","orderId":"O-506","total":405000},
      {"PK":"ORDER#O-506","SK":"PRODUCT#P-03","type":"line","qty":3,"price":120000,"GSI1PK":"PRODUCT#P-03","GSI1SK":"ORDER#O-506"},
      {"PK":"ORDER#O-506","SK":"PRODUCT#P-01","type":"line","qty":1,"price":45000,"GSI1PK":"PRODUCT#P-01","GSI1SK":"ORDER#O-506"},
      {"PK":"CUST#C-04","SK":"PROFILE","type":"customer","name":"Dung","city":"Da Nang"},
      {"PK":"CUST#C-04","SK":"ORDER#2026-08-08#O-507","type":"order","orderId":"O-507","total":165000},
      {"PK":"ORDER#O-507","SK":"PRODUCT#P-01","type":"line","qty":1,"price":45000,"GSI1PK":"PRODUCT#P-01","GSI1SK":"ORDER#O-507"},
      {"PK":"ORDER#O-507","SK":"PRODUCT#P-02","type":"line","qty":2,"price":60000,"GSI1PK":"PRODUCT#P-02","GSI1SK":"ORDER#O-507"},
      {"PK":"CUST#C-04","SK":"ORDER#2026-09-02#O-508","type":"order","orderId":"O-508","total":700000},
      {"PK":"ORDER#O-508","SK":"PRODUCT#P-05","type":"line","qty":2,"price":350000,"GSI1PK":"PRODUCT#P-05","GSI1SK":"ORDER#O-508"},
      {"PK":"STORE","SK":"VN#DA-NANG#HAI-CHAU#S-01","type":"store","storeId":"S-01"},
      {"PK":"STORE","SK":"VN#DA-NANG#HAI-CHAU#S-02","type":"store","storeId":"S-02"},
      {"PK":"STORE","SK":"VN#DA-NANG#SON-TRA#S-03","type":"store","storeId":"S-03"},
      {"PK":"STORE","SK":"VN#HUE#PHU-HOI#S-04","type":"store","storeId":"S-04"},
      {"PK":"STORE","SK":"VN#QUANG-NAM#HOI-AN#S-05","type":"store","storeId":"S-05"},
      {"PK":"STORE","SK":"VN#DA-NANG#LIEN-CHIEU#S-06","type":"store","storeId":"S-06"}
    ]}}
  steps:
    - task:
        vi: Liệt kê mọi cửa hàng ở Đà Nẵng (mã tỉnh `DA-NANG`).
        en: List every store in Da Nang (city code `DA-NANG`).
      solution: |
        {"op": "Query", "input": {"TableName": "Shop",
          "KeyConditionExpression": "PK = :pk AND begins_with(SK, :loc)",
          "ExpressionAttributeValues": {":pk": {"S": "STORE"}, ":loc": {"S": "VN#DA-NANG#"}}}}
      check: doc
      perf: { table: Shop }
      slow: |
        {"op":"Scan","input":{"TableName":"Shop","ExpressionAttributeValues":{":pk":{"S":"STORE"},":loc":{"S":"VN#DA-NANG#"}},"FilterExpression":"(PK = :pk AND begins_with(SK, :loc))"}}
      ordered: true
      expect: { Count: 4, ScannedCount: 4 }
      hint:
        vi: 'Mọi cửa hàng nằm dưới `PK = STORE`; tiền tố sort key là `VN#DA-NANG#`.'
        en: 'Every store sits under `PK = STORE`; the sort key prefix is `VN#DA-NANG#`.'
    - task:
        vi: Chỉ lấy các cửa hàng ở quận Hải Châu của Đà Nẵng (mã `HAI-CHAU`).
        en: Get only the stores in the Hai Chau district of Da Nang (code `HAI-CHAU`).
      solution: |
        {"op": "Query", "input": {"TableName": "Shop",
          "KeyConditionExpression": "PK = :pk AND begins_with(SK, :loc)",
          "ExpressionAttributeValues": {":pk": {"S": "STORE"}, ":loc": {"S": "VN#DA-NANG#HAI-CHAU#"}}}}
      check: doc
      perf: { table: Shop }
      slow: |
        {"op":"Scan","input":{"TableName":"Shop","ExpressionAttributeValues":{":pk":{"S":"STORE"},":loc":{"S":"VN#DA-NANG#HAI-CHAU#"}},"FilterExpression":"(PK = :pk AND begins_with(SK, :loc))"}}
      ordered: true
      expect: { Count: 2 }
      hint:
        vi: Thêm một cấp vào tiền tố, kết thúc bằng `#` để không khớp nhầm một mã dài hơn.
        en: Add one more level to the prefix, ending with `#` so it never matches a longer code by mistake.
    - task:
        vi: Liệt kê mọi cửa hàng ở Huế (mã tỉnh `HUE`). Bước này có thanh chi phí.
        en: List every store in Hue (city code `HUE`). This step has a cost bar.
      solution: |
        {"op": "Query", "input": {"TableName": "Shop",
          "KeyConditionExpression": "PK = :pk AND begins_with(SK, :loc)",
          "ExpressionAttributeValues": {":pk": {"S": "STORE"}, ":loc": {"S": "VN#HUE#"}}}}
      check: doc
      perf: { table: Shop }
      slow: |
        {"op":"Scan","input":{"TableName":"Shop","ExpressionAttributeValues":{":pk":{"S":"STORE"},":loc":{"S":"VN#HUE#"}},"FilterExpression":"(PK = :pk AND begins_with(SK, :loc))"}}
      ordered: true
      expect: { Count: 1, ScannedCount: 1 }
      hint:
        vi: Cùng mẫu với bước 1, đổi mã tỉnh.
        en: The same pattern as step 1 with another city code.
quiz:
  - q:
      vi: Sort key là `VN#DA-NANG#HAI-CHAU#S-01`. Một ngày ứng dụng cần "mọi cửa hàng ở quận Hải Châu, bất kể tỉnh". Query `begins_with` có làm được không?
      en: The sort key is `VN#DA-NANG#HAI-CHAU#S-01`. One day the app needs "every store in Hai Chau district, whatever the city". Can a `begins_with` Query do it?
    options:
      - { vi: "Có, dùng `contains(SK, :d)` trong `KeyConditionExpression`", en: "Yes, with `contains(SK, :d)` in the `KeyConditionExpression`" }
      - { vi: "Không: tiền tố chỉ đọc được từ cấp đầu trở xuống; cần một GSI có khóa khác", en: "No: a prefix only reads from the first level down; it needs a GSI keyed differently" }
      - { vi: "Có, `begins_with(SK, \"HAI-CHAU\")`", en: "Yes, `begins_with(SK, \"HAI-CHAU\")`" }
    answer: 1
    trap: 0
    why:
      vi: '`contains` có trong DynamoDB, nhưng chỉ dùng được trong `FilterExpression` (lọc sau khi đọc), không trong điều kiện khóa. `begins_with(SK, "HAI-CHAU")` hợp lệ nhưng không khớp item nào, vì mọi sort key bắt đầu bằng `VN#`, không phải bằng mã quận. Sort key phân cấp chỉ đọc theo đúng thứ tự cấp đã ghép, từ trái sang; muốn hỏi theo quận trước thì cần một GSI có khóa bắt đầu bằng quận.'
      en: '`contains` exists in DynamoDB, but only in a `FilterExpression` (filtering after the read), never in a key condition. `begins_with(SK, "HAI-CHAU")` is valid but matches no item, because every sort key starts with `VN#`, not with a district code. A hierarchical sort key only reads in the order its levels were joined, from the left; to ask by district first you need a GSI whose key starts with the district.'
  - q:
      vi: Vì sao nên kết thúc tiền tố bằng `#`, như `VN#HUE#`?
      en: Why should a prefix end with `#`, as in `VN#HUE#`?
    options:
      - { vi: "Để `VN#HUE` không khớp nhầm một mã dài hơn như `VN#HUE-SOUTH`", en: "So that `VN#HUE` never matches a longer code such as `VN#HUE-SOUTH`" }
      - { vi: "DynamoDB bắt buộc", en: "DynamoDB requires it" }
      - { vi: "Để Query nhanh hơn", en: "To make the Query faster" }
    answer: 0
    why:
      vi: "`begins_with` chỉ so chuỗi theo byte, nên tiền tố `VN#HUE` cũng khớp `VN#HUE-SOUTH#…` và trả nhầm cửa hàng của mã đó. Dấu `#` cuối đánh dấu hết một cấp: `VN#HUE#` chỉ khớp đúng tỉnh Huế. DynamoDB không bắt buộc dấu này, và nó không làm Query nhanh hơn; nó chỉ làm kết quả đúng."
      en: "`begins_with` only compares strings by bytes, so the prefix `VN#HUE` also matches `VN#HUE-SOUTH#…` and wrongly returns that code's stores. The closing `#` marks the end of a level: `VN#HUE#` matches only Hue. DynamoDB does not require it, and it does not make the Query faster; it only makes the result right."
---

## Mở bài

Chuỗi trà có cửa hàng ở nhiều tỉnh, mỗi tỉnh nhiều quận. Có trang xem cả nước, trang xem một tỉnh, trang xem một quận. Ba trang, mà bạn muốn mỗi trang chỉ là một Query trên cùng một khóa.

## Ý chính

AWS gợi ý ghép các cấp vào sort key theo thứ tự từ rộng tới hẹp: `[country]#[region]#[city]#[store]`. Khi đó mỗi cấp là một tiền tố, và `begins_with` đọc được đúng cấp đó bằng một Query: `VN#` là cả nước, `VN#DA-NANG#` là một tỉnh, `VN#DA-NANG#HAI-CHAU#` là một quận. Sort key sắp theo byte, nên các cửa hàng cùng tỉnh, cùng quận nằm liền nhau.

Kết thúc tiền tố bằng `#` để `VN#HUE` không khớp nhầm `VN#HUE-SOUTH`. Cùng mẫu này dùng cho phiên bản: bản hiện tại ở `v0_…`, bản cũ ở `v1_…`, `v2_…`; `begins_with(SK, "v0_")` lấy bản mới nhất của mọi phần.

Nhiều người nghĩ sort key phân cấp trả lời được mọi câu hỏi về vị trí. Thật ra nó chỉ đọc từ cấp đầu trở xuống: "mọi quận Hải Châu bất kể tỉnh" không phải một tiền tố, và `contains` không dùng được trong điều kiện khóa. Câu hỏi theo thứ tự khác cần một GSI khác.

Ở đây mọi cửa hàng dùng chung `PK = STORE`. Với vài chục cửa hàng thì ổn; với hàng triệu item, một giá trị partition key sẽ thành điểm nóng, nên ta tách theo quốc gia hoặc tỉnh (`PK = STORE#VN`).

Hình từng bước ở cuối mục này tách sort key của sáu cửa hàng thành từng cấp và đọc một tỉnh, một quận, rồi một quận không kèm tỉnh.

## Cú pháp

```text
SK = <level1>#<level2>#<level3>#<id>
Query  PK = :pk AND begins_with(SK, "<level1>#")
Query  PK = :pk AND begins_with(SK, "<level1>#<level2>#")
Query  PK = :pk AND SK BETWEEN :from AND :to
```

- Cấp rộng đứng trước, cấp hẹp đứng sau.
- Mỗi tiền tố kết thúc bằng dấu phân cách.
- `begins_with` chỉ dùng trên sort key, không trên partition key.

## Ví dụ

Mọi cửa hàng trong cả nước:

```json
{"op": "Query", "input": {"TableName": "Shop", "KeyConditionExpression": "PK = :pk AND begins_with(SK, :loc)", "ExpressionAttributeValues": {":pk": {"S": "STORE"}, ":loc": {"S": "VN#"}}}}
```

Sáu cửa hàng, đã xếp theo tỉnh rồi quận: Đà Nẵng trước, Huế, rồi Quảng Nam.

Chỉ quận Sơn Trà của Đà Nẵng:

```json
{"op": "Query", "input": {"TableName": "Shop", "KeyConditionExpression": "PK = :pk AND begins_with(SK, :loc)", "ExpressionAttributeValues": {":pk": {"S": "STORE"}, ":loc": {"S": "VN#DA-NANG#SON-TRA#"}}}}
```

Một cửa hàng, `S-03`, `ScannedCount` 1.

## Lỗi hay gặp

Tìm quận bằng bộ lọc trên cả bảng:

```json
// WRONG: reads the whole table to find one district
{"op": "Scan", "input": {"TableName": "Shop", "FilterExpression": "contains(SK, :d)", "ExpressionAttributeValues": {":d": {"S": "#HAI-CHAU#"}}}}
```

```json
// FIX: the district is a prefix of the sort key
{"op": "Query", "input": {"TableName": "Shop", "KeyConditionExpression": "PK = :pk AND begins_with(SK, :loc)", "ExpressionAttributeValues": {":pk": {"S": "STORE"}, ":loc": {"S": "VN#DA-NANG#HAI-CHAU#"}}}}
```

Cùng hai cửa hàng, nhưng câu sai đọc cả bảng (38 item), câu sửa đọc 2.

Đặt `begins_with` lên partition key:

```json
// ERROR ValidationException
{"op": "Query", "input": {"TableName": "Shop", "KeyConditionExpression": "begins_with(PK, :p)", "ExpressionAttributeValues": {":p": {"S": "STORE"}}}}
```

Partition key được băm (hash) để chọn partition, nên các giá trị gần nhau không nằm cạnh nhau và DynamoDB chỉ nhận phép bằng trên nó. Mọi điều kiện tiền tố hay khoảng nằm trên sort key, thứ được sắp trong từng partition.

## Thực hành

Ba bước trên `PK = STORE`: mọi cửa hàng ở một tỉnh, chỉ một quận, rồi một tỉnh khác. Mọi bước có thanh chi phí.

## Tóm tắt

- Ghép cấp vào sort key từ rộng tới hẹp, mỗi cấp là một tiền tố.
- `begins_with` đọc đúng một cấp bằng một Query.
- Kết thúc tiền tố bằng dấu phân cách để không khớp nhầm.
- Câu hỏi không bắt đầu từ cấp đầu cần một GSI khác.

# EN

## Opening

The tea chain has stores in several cities, each with several districts. There is a page for the whole country, one for a city, one for a district. Three pages, and you want each to be one Query on the same key.

## Key idea

AWS suggests joining the levels into the sort key from broad to narrow: `[country]#[region]#[city]#[store]`. Each level is then a prefix, and `begins_with` reads exactly that level with one Query: `VN#` is the whole country, `VN#DA-NANG#` one city, `VN#DA-NANG#HAI-CHAU#` one district. The sort key sorts by bytes, so stores of the same city and district sit next to each other.

End a prefix with `#` so that `VN#HUE` never matches `VN#HUE-SOUTH`. The same pattern works for versions: the current version at `v0_…`, older ones at `v1_…`, `v2_…`; `begins_with(SK, "v0_")` gets the latest version of every part.

Many people think a hierarchical sort key answers every location question. In fact it reads only from the first level down: "every Hai Chau district whatever the city" is not a prefix, and `contains` cannot be used in a key condition. A question in another order needs another GSI.

Here every store shares `PK = STORE`. For a few dozen stores that is fine; with millions of items one partition key value becomes a hot spot, so you split by country or city (`PK = STORE#VN`).

The step-through figure at the end of this section splits the six stores' sort keys into their levels and reads one city, one district, then a district without its city.

## Syntax

```text
SK = <level1>#<level2>#<level3>#<id>
Query  PK = :pk AND begins_with(SK, "<level1>#")
Query  PK = :pk AND begins_with(SK, "<level1>#<level2>#")
Query  PK = :pk AND SK BETWEEN :from AND :to
```

- Broad levels first, narrow levels after.
- Each prefix ends with the separator.
- `begins_with` works only on the sort key, never on the partition key.

## Example

Every store in the country:

```json
{"op": "Query", "input": {"TableName": "Shop", "KeyConditionExpression": "PK = :pk AND begins_with(SK, :loc)", "ExpressionAttributeValues": {":pk": {"S": "STORE"}, ":loc": {"S": "VN#"}}}}
```

Six stores, already ordered by city and then district: Da Nang first, then Hue, then Quang Nam.

Only the Son Tra district of Da Nang:

```json
{"op": "Query", "input": {"TableName": "Shop", "KeyConditionExpression": "PK = :pk AND begins_with(SK, :loc)", "ExpressionAttributeValues": {":pk": {"S": "STORE"}, ":loc": {"S": "VN#DA-NANG#SON-TRA#"}}}}
```

One store, `S-03`, `ScannedCount` 1.

## Common mistakes

Finding a district with a filter over the whole table:

```json
// WRONG: reads the whole table to find one district
{"op": "Scan", "input": {"TableName": "Shop", "FilterExpression": "contains(SK, :d)", "ExpressionAttributeValues": {":d": {"S": "#HAI-CHAU#"}}}}
```

```json
// FIX: the district is a prefix of the sort key
{"op": "Query", "input": {"TableName": "Shop", "KeyConditionExpression": "PK = :pk AND begins_with(SK, :loc)", "ExpressionAttributeValues": {":pk": {"S": "STORE"}, ":loc": {"S": "VN#DA-NANG#HAI-CHAU#"}}}}
```

The same two stores, but the wrong one reads the whole table (38 items), the fix reads 2.

Putting `begins_with` on the partition key:

```json
// ERROR ValidationException
{"op": "Query", "input": {"TableName": "Shop", "KeyConditionExpression": "begins_with(PK, :p)", "ExpressionAttributeValues": {":p": {"S": "STORE"}}}}
```

The partition key is hashed to pick a partition, so nearby values do not sit next to each other and DynamoDB accepts only equality on it. Every prefix or range condition goes on the sort key, which is sorted inside each partition.

## Practice

Three steps on `PK = STORE`: every store in one city, only one district, then another city. Every step has a cost bar.

## Recap

- Join the levels into the sort key from broad to narrow; each level is a prefix.
- `begins_with` reads exactly one level with one Query.
- End each prefix with the separator so it never matches by mistake.
- A question that does not start at the first level needs another GSI.
