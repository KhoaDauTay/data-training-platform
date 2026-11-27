---
id: e-bp-e03
engine: best
track: search
level: L3
module: e
title: "Đếm theo nhóm trên trường keyword"
title_en: "Group and count on keyword fields"
kind: quiz
minutes: 3
objectives:
  - vi: "Chạy aggregation `terms` trên trường `keyword` (hoặc một trường con `keyword`), không trên trường `text`."
    en: "Run a `terms` aggregation on a `keyword` field (or a `keyword` sub-field), never on a `text` field."
avoid:
  vi: "Nhóm theo trường `text`: Elasticsearch từ chối với `illegal_argument_exception`."
  en: "Grouping on a `text` field: Elasticsearch refuses with `illegal_argument_exception`."
requires: [e-sr-l1-04, e-sr-l3-01]
skills: []
adv: []
sources:
  - https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/text
  - https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/keyword
verified: { version: "BoonData Elasticsearch simulation (Elasticsearch 9 docs)", date: "2026-11-27" }
pair:
  runtime: es
  check: error
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
    {"size": 0, "aggs": {"by_name": {
      "terms": {"field": "name"}}}}
  good: |
    GET shop/_search
    {"size": 0, "aggs": {"by_brand": {
      "terms": {"field": "brand"}}}}
  expect: { code: illegal_argument_exception }
quiz:
  - q:
      vi: "Bạn cần đếm số hàng theo nhãn hiệu, và nhãn hiệu đang là trường `text`. Cách sửa nào đúng?"
      en: "You need to count products per brand, and the brand is a `text` field. Which fix is right?"
    options:
      - { vi: "Đổi `size` thành 100 để Elasticsearch đọc hết tài liệu", en: "Set `size` to 100 so Elasticsearch reads every document" }
      - { vi: "Map nhãn hiệu là `keyword` (hoặc thêm trường con `keyword`) rồi nhóm trên đó", en: "Map the brand as `keyword` (or add a `keyword` sub-field) and group on that" }
      - { vi: "Dùng `match` trên nhãn hiệu trước rồi mới `terms`", en: "Run a `match` on the brand first, then the `terms`" }
    answer: 1
    why:
      vi: "`size` chỉ đổi số tài liệu trả về, còn lỗi nằm ở chính trường đem nhóm; `match` trước đó cũng không đổi kiểu trường. Trường `text` chỉ có index đảo ngược (các từ đã tách), không có giá trị nguyên văn của từng tài liệu (doc values), nên Elasticsearch từ chối nhóm trên nó. Trường `keyword` lưu nguyên giá trị, đúng thứ `terms` cần để đếm."
      en: "`size` only changes how many documents come back, while the error is about the grouped field itself; a `match` beforehand does not change the field's type either. A `text` field only has the inverted index (the split words), not each document's whole value (doc values), so Elasticsearch refuses to group on it. A `keyword` field stores the whole value, which is what `terms` needs to count."
---

## Ý chính

Aggregation (`terms`, sắp xếp) chạy trên trường `keyword`, số hoặc ngày. Trường cần vừa tìm toàn văn vừa đếm thì map hai lần: `text` để tìm, trường con `keyword` để nhóm.

## Vì sao

- Trường `text` chỉ có index đảo ngược: từ trỏ về tài liệu. Muốn nhóm thì cần chiều ngược lại, từ tài liệu ra giá trị, mà `text` mặc định không có.
- Elasticsearch tắt sẵn `fielddata` cho `text` vì nó tốn bộ nhớ, nên báo `illegal_argument_exception` và gợi ý dùng trường `keyword`.
- Trường `keyword` lưu nguyên giá trị (`HoiAnLight`), đếm nhóm đúng theo nhãn hiệu, không theo từng từ.
- Bản Không nên bị từ chối. Bản Nên trả số hàng của sáu nhãn hiệu.

# EN

## Key idea

Aggregations (`terms`, sorting) run on `keyword`, number or date fields. A field you both search and count is mapped twice: `text` to search, a `keyword` sub-field to group.

## Why

- A `text` field only has the inverted index: words pointing to documents. Grouping needs the other direction, from a document to its value, which `text` does not have by default.
- Elasticsearch turns `fielddata` off for `text` because it costs memory, so it answers `illegal_argument_exception` and suggests a `keyword` field.
- A `keyword` field stores the whole value (`HoiAnLight`) and groups by brand, not by single words.
- The Avoid version is refused. The Prefer version returns the product counts of six brands.
