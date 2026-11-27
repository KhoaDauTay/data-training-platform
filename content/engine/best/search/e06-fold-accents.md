---
id: e-bp-e06
engine: best
track: search
level: L1
module: e
title: "Tiếng Việt: thêm một trường bỏ dấu cho người gõ không dấu"
title_en: "Vietnamese: add an accent-folded field for unaccented typing"
kind: quiz
minutes: 4
objectives:
  - vi: "Thêm trường con phân tích bằng `asciifolding` (bỏ dấu, `đ` thành `d`) và tìm trên đó khi người dùng gõ không dấu."
    en: "Add a sub-field analysed with `asciifolding` (accents removed, `đ` becomes `d`) and search it when users type without accents."
avoid:
  vi: "Khách gõ `den long` mà kết quả chỉ có trà ô long, không có cái đèn nào."
  en: "A customer types `den long` and gets only oolong tea, not a single lantern."
requires: [e-sr-l1-03]
skills: []
adv: []
sources:
  - https://www.elastic.co/docs/reference/text-analysis/analysis-asciifolding-tokenfilter
  - https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/multi-fields
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
    {"query": {"match": {
      "name": "den long"}}}
  good: |
    GET shop/_search
    {"query": {"match": {
      "name.fold": "den long"}}}
  expect: null
quiz:
  - q:
      vi: "Trên trường `name` (analyzer chuẩn, giữ dấu), vì sao `den long` khớp `Trà ô long Đà Lạt` mà không khớp `Đèn lồng tre nhỏ`?"
      en: "On the `name` field (standard analyzer, accents kept), why does `den long` match `Trà ô long Đà Lạt` but not `Đèn lồng tre nhỏ`?"
    options:
      - { vi: "Vì `long` không dấu có trong tên trà, còn `đèn` và `lồng` có dấu nên khác `den` và `long`", en: "Because unaccented `long` is in the tea's name, while `đèn` and `lồng` carry accents and differ from `den` and `long`" }
      - { vi: "Vì trà ô long có giá cao hơn nên điểm cao hơn", en: "Because the oolong tea costs more, so it scores higher" }
      - { vi: "Vì analyzer chuẩn bỏ hết các từ ngắn hơn bốn chữ cái", en: "Because the standard analyzer drops every word shorter than four letters" }
    answer: 0
    why:
      vi: "Giá không ảnh hưởng điểm của `match`, và analyzer chuẩn không bỏ từ ngắn. Analyzer chuẩn chỉ đổi chữ thường, giữ dấu: `Đèn lồng` thành `đèn`, `lồng`, là hai từ khác `den`, `long`. Tên trà tình cờ có từ `long` không dấu, nên chỉ nó khớp. Trường con `name.fold` lưu `den`, `long` sau khi bỏ dấu, nên các cây đèn khớp đủ hai từ."
      en: "Price does not affect a `match` score, and the standard analyzer does not drop short words. It only lowercases and keeps accents: `Đèn lồng` becomes `đèn`, `lồng`, two words that differ from `den`, `long`. The tea's name happens to contain an unaccented `long`, so only it matches. The sub-field `name.fold` stores `den`, `long` after folding, so the lanterns match both words."
---

## Ý chính

Người Việt hay gõ không dấu. Map tên hàng hai lần: trường gốc giữ dấu, và trường con (multi-field) phân tích bằng analyzer có `lowercase` + `asciifolding`. Tìm trên trường con khi câu tìm không dấu.

## Vì sao

- Analyzer chuẩn giữ dấu: `đèn` và `den` là hai từ khác nhau trong index.
- `asciifolding` bỏ dấu và đổi `đ` thành `d`, nên `Đèn lồng` được lưu thành `den`, `long`.
- Giữ cả trường gốc: người gõ có dấu vẫn được kết quả chính xác hơn, và hai trường có thể ghép trong một `bool` `should`.
- Bản Không nên chỉ trả `Trà ô long Đà Lạt`. Bản Nên trả bốn cây đèn trước, trà ô long xếp cuối vì chỉ khớp một từ.

# EN

## Key idea

Vietnamese users often type without accents. Map the product name twice: the original field keeps accents, and a sub-field (multi-field) is analysed with `lowercase` + `asciifolding`. Search the sub-field when the search words carry no accents.

## Why

- The standard analyzer keeps accents: `đèn` and `den` are two different words in the index.
- `asciifolding` removes accents and turns `đ` into `d`, so `Đèn lồng` is stored as `den`, `long`.
- Keep the original field too: users who type accents still get more precise results, and both fields can be combined in one `bool` `should`.
- The Avoid version returns only `Trà ô long Đà Lạt`. The Prefer version returns the four lanterns first, with the oolong tea last because it matches only one word.
