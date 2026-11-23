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
objectives:
  - vi: Ghép nhiều cấp vào sort key (`VN#DA-NANG#HAI-CHAU#S-01`) để đọc ở bất kỳ cấp nào bằng `begins_with`.
    en: Join several levels into a sort key (`VN#DA-NANG#HAI-CHAU#S-01`) to read at any level with `begins_with`.
requires: [e-dy-l3-08]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-sort-keys.html
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
---

## Ý chính

AWS gợi ý ghép các cấp vào sort key theo thứ tự từ rộng tới hẹp: `[country]#[region]#[city]#[store]`. Khi đó mỗi cấp là một tiền tố, và `begins_with` đọc được đúng cấp đó bằng một Query.

- `VN#` - cả nước;
- `VN#DA-NANG#` - một tỉnh;
- `VN#DA-NANG#HAI-CHAU#` - một quận.

Kết thúc tiền tố bằng `#` để `VN#HUE` không khớp nhầm `VN#HUE-SOUTH`.

## Ví dụ

Cùng mẫu này dùng cho phiên bản: lưu bản hiện tại ở `v0_…` và bản cũ ở `v1_…`, `v2_…`. Query `begins_with(SK, "v0_")` lấy bản mới nhất của mọi phần.

```text
SK = v0_PROFILE   current
SK = v1_PROFILE   older
SK = v2_PROFILE   older
```

## Thực hành

Ở đây mọi cửa hàng dùng chung một `PK = STORE`. Với vài chục cửa hàng thì ổn; với hàng triệu item, một partition key duy nhất sẽ thành điểm nóng, nên ta tách theo quốc gia hoặc tỉnh (`PK = STORE#VN`).

# EN

## Key idea

AWS suggests joining the levels into the sort key from broad to narrow: `[country]#[region]#[city]#[store]`. Each level is then a prefix, and `begins_with` reads exactly that level with one Query.

- `VN#` - the whole country;
- `VN#DA-NANG#` - one city;
- `VN#DA-NANG#HAI-CHAU#` - one district.

End a prefix with `#` so that `VN#HUE` never matches `VN#HUE-SOUTH` by mistake.

## Example

The same pattern works for versions: keep the current version at `v0_…` and older ones at `v1_…`, `v2_…`. A Query with `begins_with(SK, "v0_")` gets the latest version of every part.

```text
SK = v0_PROFILE   current
SK = v1_PROFILE   older
SK = v2_PROFILE   older
```

## Practice

Here every store shares one `PK = STORE`. For a few dozen stores that is fine; with millions of items one partition key value becomes a hot spot, so you split by country or city (`PK = STORE#VN`).
