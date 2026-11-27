---
id: e-bp-e02
engine: best
track: search
level: L2
module: e
title: "Điều kiện có/không đặt trong filter"
title_en: "Yes/no conditions go in filter"
kind: quiz
minutes: 4
objectives:
  - vi: "Đặt điều kiện lọc (giá, loại hàng, trạng thái) vào `filter` của `bool`, để chúng không cộng vào điểm `_score`."
    en: "Put filtering conditions (price, category, status) in the `filter` of a `bool`, so they add nothing to `_score`."
avoid:
  vi: "Đặt `range` giá trong `must`: mọi tài liệu khớp được cộng điểm như nhau, điểm bị lệch khỏi mức độ liên quan."
  en: "A price `range` inside `must`: every matching document gets the same extra score, and scores drift away from relevance."
requires: [e-sr-l2-03]
skills: []
adv: []
sources:
  - https://www.elastic.co/docs/reference/query-languages/query-dsl/query-filter-context
  - https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-bool-query
verified: { version: "BoonData Elasticsearch simulation (Elasticsearch 9 docs)", date: "2026-11-27" }
pair:
  runtime: es
  check: diff
  setup: |
    {"index": "shop",
     "settings": {"analysis": {"analyzer": {
       "vi_fold": {"tokenizer": "standard",
         "filter": ["lowercase", "asciifolding"]}}}},
     "mappings": {"properties": {
       "name": {"type": "text",
         "fields": {"fold": {"type": "text", "analyzer": "vi_fold"}}},
       "brand": {"type": "keyword"},
       "category": {"type": "keyword"},
       "price": {"type": "integer"}}},
     "docs": [
      {"_id": "1", "name": "Đèn lồng lụa đỏ", "brand": "HoiAnLight", "category": "den", "price": 180},
      {"_id": "2", "name": "Đèn lồng tre nhỏ", "brand": "HoiAnLight", "category": "den", "price": 95},
      {"_id": "3", "name": "Lồng đèn giấy kéo quân", "brand": "SaiGonCraft", "category": "den", "price": 60},
      {"_id": "4", "name": "Nón lá bài thơ Huế", "brand": "HueHat", "category": "non", "price": 120},
      {"_id": "5", "name": "Nón lá trẻ em", "brand": "HueHat", "category": "non", "price": 70},
      {"_id": "6", "name": "Áo dài lụa tơ tằm", "brand": "SilkHouse", "category": "ao", "price": 950},
      {"_id": "7", "name": "Khăn lụa tơ tằm đỏ", "brand": "SilkHouse", "category": "khan", "price": 320},
      {"_id": "8", "name": "Trà sen Tây Hồ", "brand": "TeaLotus", "category": "tra", "price": 250},
      {"_id": "9", "name": "Trà ô long Đà Lạt", "brand": "TeaLotus", "category": "tra", "price": 210},
      {"_id": "10", "name": "Cà phê Buôn Ma Thuột", "brand": "BMTCoffee", "category": "caphe", "price": 150},
      {"_id": "11", "name": "Đèn lồng Hội An đỏ lớn", "brand": "HoiAnLight", "category": "den", "price": 260},
      {"_id": "12", "name": "Tranh lụa phố cổ Hội An", "brand": "SilkHouse", "category": "tranh", "price": 480}]}
  bad: |
    GET shop/_search
    {"query": {"bool": {"must": [
      {"match": {"name": "đèn"}},
      {"range": {"price": {"lte": 200}}}
    ]}}}
  good: |
    GET shop/_search
    {"query": {"bool": {
      "must": {"match": {"name": "đèn"}},
      "filter": {"range": {
        "price": {"lte": 200}}}}}}
  expect: null
quiz:
  - q:
      vi: "Bạn chuyển `range` trên `price` từ `must` sang `filter`, giữ nguyên `match`. Danh sách tài liệu và điểm thay đổi thế nào?"
      en: "You move the `range` on `price` from `must` to `filter` and keep the `match`. How do the documents and their scores change?"
    options:
      - { vi: "Cùng tài liệu, mỗi điểm thấp hơn đúng 1 (phần `range` không còn cộng điểm)", en: "Same documents, each score exactly 1 lower (the `range` no longer adds to it)" }
      - { vi: "Thêm các tài liệu giá trên 200, vì `filter` chỉ là gợi ý", en: "Documents above 200 appear too, because `filter` is only a hint" }
      - { vi: "Mọi điểm thành 0, vì có `filter` thì không tính điểm nữa", en: "Every score becomes 0, because a `filter` turns scoring off" }
    answer: 0
    why:
      vi: "`filter` vẫn loại tài liệu như `must`, nên hàng giá trên 200 không xuất hiện. Điểm chỉ về 0 khi `bool` không có phần nào tính điểm; ở đây `match` trong `must` vẫn tính. Trong `must`, `range` khớp và cộng thêm một điểm không đổi (1) cho mọi tài liệu; đưa nó vào `filter` (ngữ cảnh lọc, filter context) bỏ phần cộng đó, nên điểm chỉ còn phản ánh chữ `đèn`."
      en: "`filter` still removes documents just like `must`, so products above 200 do not appear. Scores only drop to 0 when nothing in the `bool` scores; here the `match` in `must` still does. Inside `must`, the `range` matches and adds a constant score (1) to every document; moving it to `filter` (filter context) drops that addition, so the score reflects only the word `đèn`."
---

## Ý chính

Trong `bool`, phần nào quyết định "liên quan đến đâu" thì đặt ở `must`/`should`; phần nào chỉ là có/không (giá, loại, trạng thái, ngày) thì đặt ở `filter`.

## Vì sao

- Mệnh đề trong `must` chạy ở ngữ cảnh truy vấn (query context) và cộng vào `_score`. Một `range` khớp thì cộng cùng một số cho mọi tài liệu, không nói gì về mức độ liên quan.
- Mệnh đề trong `filter` chạy ở ngữ cảnh lọc (filter context): chỉ trả lời có/không, không tính điểm. Elasticsearch có thể cache kết quả lọc hay dùng.
- Ở đây cả hai bản trả cùng ba tài liệu. Bản Không nên cho điểm `2.14`, `2.14`, `2.05`; bản Nên cho `1.14`, `1.14`, `1.05`: phần chênh 1 là của `range`.
- Khi trộn với `should` hay sắp theo điểm, phần cộng thừa đó làm lệch thứ hạng.

# EN

## Key idea

In a `bool`, what decides "how relevant" goes in `must`/`should`; what is only yes/no (price, category, status, date) goes in `filter`.

## Why

- A clause in `must` runs in query context and adds to `_score`. A matching `range` adds the same number to every document and says nothing about relevance.
- A clause in `filter` runs in filter context: it only answers yes or no and computes no score. Elasticsearch can cache frequently used filters.
- Here both versions return the same three documents. The Avoid version scores `2.14`, `2.14`, `2.05`; the Prefer version `1.14`, `1.14`, `1.05`: the difference of 1 comes from the `range`.
- Mixed with `should`, or when sorting by score, that extra amount skews the ranking.
