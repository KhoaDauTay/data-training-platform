---
id: e-bp-e01
engine: best
track: search
level: L2
module: e
title: "Trường text tìm bằng match, không bằng term"
title_en: "Search text fields with match, not term"
kind: quiz
minutes: 3
objectives:
  - vi: "Dùng `match` cho trường `text` (câu tìm được phân tích như lúc lưu) và để `term` cho trường `keyword`."
    en: "Use `match` on `text` fields (the search words are analysed like the stored text) and keep `term` for `keyword` fields."
avoid:
  vi: "`term` trên trường `text`: tìm đúng tên hàng mà không ra tài liệu nào."
  en: "`term` on a `text` field: searching the exact product name returns no document."
requires: [e-sr-l2-02]
skills: []
adv: []
sources:
  - https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-term-query
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
    {"query": {"term": {
      "name": "Đèn lồng tre nhỏ"}}}
  good: |
    GET shop/_search
    {"query": {"match": {
      "name": "Đèn lồng tre nhỏ"}}}
  expect: null
quiz:
  - q:
      vi: "Trường `name` là `text` với analyzer chuẩn. Tài liệu có `name` là `Đèn lồng tre nhỏ`. Vì sao `term` với đúng chuỗi đó không ra tài liệu nào?"
      en: "Field `name` is `text` with the standard analyzer. A document has `name` set to `Đèn lồng tre nhỏ`. Why does a `term` query with exactly that string return no document?"
    options:
      - { vi: "Vì `term` phân biệt dấu, còn tài liệu lưu không dấu", en: "Because `term` is accent-sensitive and the document is stored without accents" }
      - { vi: "Vì index chỉ lưu các từ thường đã tách (`đèn`, `lồng`…), không lưu cả chuỗi", en: "Because the index only stores the split, lowercased words (`đèn`, `lồng`…), never the whole string" }
      - { vi: "Vì `term` chỉ chạy được trên trường số", en: "Because `term` only works on number fields" }
    answer: 1
    why:
      vi: "Analyzer chuẩn giữ nguyên dấu, nên vấn đề không nằm ở dấu; `term` cũng chạy được trên chuỗi. Lúc lưu, trường `text` bị tách thành các từ viết thường (`đèn`, `lồng`, `tre`, `nhỏ`), còn `term` tìm nguyên văn `Đèn lồng tre nhỏ`, có chữ hoa và khoảng trắng, nên không khớp từ nào trong index. `match` phân tích câu tìm theo cùng analyzer với lúc lưu, nên khớp đủ bốn từ."
      en: "The standard analyzer keeps accents, so accents are not the problem; `term` also works on strings. At index time a `text` field is split into lowercase words (`đèn`, `lồng`, `tre`, `nhỏ`), while `term` looks for the literal `Đèn lồng tre nhỏ`, capital letter and spaces included, so it matches no word in the index. `match` analyses the search words with the same analyzer as the stored text, so all four words match."
---

## Ý chính

Trên trường `text`, tìm bằng `match`. Dùng `term` khi so khớp nguyên văn trên trường `keyword` (mã, trạng thái, nhãn hiệu).

## Vì sao

- Trường `text` được phân tích (analyze) lúc lưu: tách từ, đổi về chữ thường. Index chỉ chứa các từ đó, không chứa chuỗi gốc.
- `term` không phân tích câu tìm. Chuỗi có chữ hoa hoặc nhiều từ sẽ không bao giờ khớp một từ đã tách; tài liệu của Elasticsearch khuyên tránh `term` trên trường `text`.
- `match` phân tích câu tìm theo cùng analyzer, rồi tìm từng từ, và xếp hạng bằng điểm (`_score`).
- Bản Không nên trả 0 tài liệu. Bản Nên trả 4, tài liệu `2` đứng đầu vì khớp đủ bốn từ.

# EN

## Key idea

On a `text` field, search with `match`. Use `term` for exact matches on `keyword` fields (codes, statuses, brands).

## Why

- A `text` field is analysed at index time: split into words and lowercased. The index holds those words, not the original string.
- `term` does not analyse the search string. A string with capitals or several words never matches a single split word; the Elasticsearch docs advise against `term` on `text` fields.
- `match` analyses the search words with the same analyzer, looks up each word, and ranks by score (`_score`).
- The Avoid version returns 0 documents. The Prefer version returns 4, with document `2` first because it matches all four words.
