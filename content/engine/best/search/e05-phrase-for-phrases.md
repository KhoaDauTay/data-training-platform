---
id: e-bp-e05
engine: best
track: search
level: L2
module: e
title: "Cụm từ cố định tìm bằng match_phrase"
title_en: "Search fixed phrases with match_phrase"
kind: quiz
minutes: 3
objectives:
  - vi: "Dùng `match_phrase` khi các từ phải đứng liền nhau và đúng thứ tự, vì `match` chỉ cần một từ bất kỳ."
    en: "Use `match_phrase` when the words must be next to each other and in order, because `match` needs any one word."
avoid:
  vi: "Tìm cụm `lụa đỏ` bằng `match`: ra cả áo lụa không đỏ và đèn đỏ không phải lụa."
  en: "Searching the phrase `lụa đỏ` with `match`: silk that is not red and red lanterns that are not silk come back too."
requires: [e-sr-l2-04]
skills: []
adv: []
sources:
  - https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-match-query-phrase
  - https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-match-query
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
      "name": "lụa đỏ"}}}
  good: |
    GET shop/_search
    {"query": {"match_phrase": {
      "name": "lụa đỏ"}}}
  expect: null
quiz:
  - q:
      vi: "`Khăn lụa tơ tằm đỏ` có cả `lụa` và `đỏ`. Nó có khớp `match_phrase` với `lụa đỏ` không?"
      en: "`Khăn lụa tơ tằm đỏ` contains both `lụa` and `đỏ`. Does it match `match_phrase` with `lụa đỏ`?"
    options:
      - { vi: "Có, vì có đủ hai từ", en: "Yes, because both words are there" }
      - { vi: "Không, vì giữa hai từ còn `tơ tằm`", en: "No, because `tơ tằm` sits between the two words" }
      - { vi: "Có, nhưng điểm thấp hơn", en: "Yes, but with a lower score" }
    answer: 1
    why:
      vi: "Có đủ hai từ là điều kiện của `match`, không phải của `match_phrase`. Index lưu vị trí của từng từ: trong tên này `lụa` ở vị trí 1 còn `đỏ` ở vị trí 4. `match_phrase` cần `đỏ` đứng ngay sau `lụa` (vị trí 2), nên tài liệu bị loại hẳn chứ không chỉ bị hạ điểm. Muốn cho phép vài từ chen giữa thì thêm `slop`."
      en: "Having both words is the condition of `match`, not of `match_phrase`. The index stores each word's position: in this name `lụa` is at position 1 and `đỏ` at position 4. `match_phrase` needs `đỏ` right after `lụa` (position 2), so the document is dropped, not just scored lower. To allow a few words in between, add `slop`."
---

## Ý chính

Khi người dùng gõ một cụm cố định (tên màu, tên dòng sản phẩm), tìm bằng `match_phrase`: các từ phải liền nhau, đúng thứ tự. `match` mặc định chỉ cần một trong các từ.

## Vì sao

- `match` tách câu tìm thành từ rồi nối bằng `OR`: tài liệu chứa `lụa` hoặc `đỏ` đều khớp.
- `match_phrase` dùng vị trí của từ trong index: `đỏ` phải đứng ngay sau `lụa`.
- Bản Không nên trả 5 tài liệu, gồm `Áo dài lụa tơ tằm` (không đỏ) và `Đèn lồng Hội An đỏ lớn` (không phải lụa). Bản Nên chỉ trả `Đèn lồng lụa đỏ`.
- Muốn mọi từ đều có nhưng không cần liền nhau thì dùng `match` với `"operator": "and"`.

# EN

## Key idea

When users type a fixed phrase (a colour name, a product line), search with `match_phrase`: the words must be adjacent and in order. By default `match` needs just one of the words.

## Why

- `match` splits the search into words and joins them with `OR`: a document with `lụa` or `đỏ` matches.
- `match_phrase` uses the words' positions in the index: `đỏ` must come right after `lụa`.
- The Avoid version returns 5 documents, including `Áo dài lụa tơ tằm` (not red) and `Đèn lồng Hội An đỏ lớn` (not silk). The Prefer version returns only `Đèn lồng lụa đỏ`.
- To require every word without requiring them to be adjacent, use `match` with `"operator": "and"`.
