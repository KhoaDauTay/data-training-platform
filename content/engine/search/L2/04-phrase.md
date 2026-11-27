---
id: e-sr-l2-04
engine: search
level: L2
module: query
title: "Cụm từ: thứ tự và vị trí"
title_en: "Phrases: order and position"
kind: lab
runtime: browser
minutes: 15
figures: [{ name: sr-phrase-positions, at: idea }]
objectives:
  - vi: "Dùng `match_phrase` để chỉ khớp khi các từ đứng liền nhau, đúng thứ tự."
    en: "Use `match_phrase` to match only when the words stand next to each other, in order."
  - vi: "Giải thích vì sao chỉ mục cần lưu vị trí của từng từ, và vì sao `đèn lồng` khác `lồng đèn`."
    en: "Explain why the index stores each word's position, and why `đèn lồng` differs from `lồng đèn`."
requires: [e-sr-l2-01]
sources:
  - { url: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-match-query-phrase, title_vi: "Truy vấn match_phrase" }
  - { url: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/index-options, title_vi: "Tham số index_options" }
lab:
  setup: |
    {"index": "shop",
     "mappings": {"properties": {
       "name": {"type": "text"},
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
  steps:
    - task:
        vi: "Tìm đúng cụm `tơ tằm` trên `name`."
        en: "Find the exact phrase `tơ tằm` on `name`."
      solution: |
        GET shop/_search
        {"query": {"match_phrase": {
          "name": "tơ tằm"}}}
      check: rows
      hint:
        vi: "`{\"match_phrase\": {\"name\": \"tơ tằm\"}}`."
        en: "`{\"match_phrase\": {\"name\": \"tơ tằm\"}}`."
    - task:
        vi: "Tìm đúng cụm `hội an` trên `name`."
        en: "Find the exact phrase `hội an` on `name`."
      solution: |
        GET shop/_search
        {"query": {"match_phrase": {
          "name": "hội an"}}}
      check: rows
      hint:
        vi: "Như bước 1, đổi cụm từ."
        en: "Like step 1, with another phrase."
    - task:
        vi: "Khách muốn đồ chơi `lồng đèn` (Trung thu), không muốn `đèn lồng` treo. Tìm đúng cụm `lồng đèn`: chỉ một sản phẩm."
        en: "A customer wants the Mid-Autumn toy `lồng đèn`, not the hanging `đèn lồng`. Find the exact phrase `lồng đèn`: one product only."
      solution: |
        GET shop/_search
        {"query": {"match_phrase": {
          "name": "lồng đèn"}}}
      check: rows
      hint:
        vi: "`match` sẽ ra cả bốn sản phẩm có hai từ này; `match_phrase` xét cả thứ tự."
        en: "`match` returns all four products with these two words; `match_phrase` checks the order too."
quiz:
  - q:
      vi: "Vì sao `match_phrase` cần chỉ mục lưu vị trí của từ?"
      en: "Why does `match_phrase` need the index to store word positions?"
    options:
      - { vi: "Để biết hai từ có đứng liền nhau, đúng thứ tự", en: "To know whether two words stand next to each other, in order" }
      - { vi: "Để tính số lần mỗi từ xuất hiện", en: "To count how often each word appears" }
      - { vi: "Để sắp kết quả theo vị trí trong tài liệu", en: "To sort hits by position in the document" }
    answer: 0
    trap: 1
    why:
      vi: "Số lần xuất hiện (tf) chỉ cần đếm, không cần vị trí, nên đó không phải lý do. Với cụm `lồng đèn`, máy lấy danh sách của `lồng` và của `đèn`, rồi giữ tài liệu có `lồng` ở vị trí p và `đèn` ở p + 1. Tài liệu 3 có `lồng` ở 0 và `đèn` ở 1; tài liệu 1 có `đèn` ở 0 và `lồng` ở 1, nên bị loại."
      en: "The occurrence count (tf) only needs counting, not positions, so that is not the reason. For the phrase `lồng đèn`, the engine takes the lists of `lồng` and of `đèn`, then keeps documents with `lồng` at position p and `đèn` at p + 1. Document 3 has `lồng` at 0 and `đèn` at 1; document 1 has `đèn` at 0 and `lồng` at 1, so it is dropped."
  - q:
      vi: "Trường `name` dùng analyzer `standard`. `match_phrase` với `Hội-An` có khớp `Tranh lụa phố cổ Hội An` không?"
      en: "The `name` field uses the `standard` analyzer. Does `match_phrase` with `Hội-An` match `Tranh lụa phố cổ Hội An`?"
    options:
      - { vi: "Không, vì dấu gạch nối không có trong tên", en: "No, because the hyphen is not in the name" }
      - { vi: "Có, vì analyzer cắt thành `hội` rồi `an`", en: "Yes, the analyzer cuts it into `hội` then `an`" }
      - { vi: "Chỉ khi đổi sang `match`", en: "Only after switching to `match`" }
    answer: 1
    trap: 0
    why:
      vi: "Gạch nối có trong chữ gõ mà không có trong tên, nên dễ nghĩ là trượt. Nhưng `match_phrase` cũng đưa chữ gõ qua analyzer của trường: `standard` bỏ gạch nối và viết thường, còn `hội` ở vị trí 0 và `an` ở vị trí 1. Tên lưu `hội` ở 4 và `an` ở 5, liền nhau đúng thứ tự, nên khớp."
      en: "The hyphen is in the typed text and not in the name, so a miss sounds likely. But `match_phrase` also runs the typed text through the field's analyzer: `standard` drops the hyphen and lower-cases, leaving `hội` at position 0 and `an` at 1. The stored name has `hội` at 4 and `an` at 5, adjacent and in order, so it matches."
---
## Mở bài

Trong tiếng Việt, `đèn lồng` (đèn treo) và `lồng đèn` (đồ chơi Trung thu) là hai món khác nhau, dù cùng hai từ. `match` không phân biệt được. Bài này dùng vị trí của từ để phân biệt.

## Ý chính

Chỉ mục đảo không chỉ ghi tài liệu nào có từ nào, mà còn ghi **vị trí** của từ trong tài liệu: `Lồng đèn giấy kéo quân` có `lồng` ở 0, `đèn` ở 1, `giấy` ở 2. `match` bỏ qua vị trí: tài liệu có `lồng` hoặc `đèn` ở đâu cũng khớp.

`match_phrase` cắt chữ gõ bằng cùng analyzer, rồi chỉ giữ tài liệu có các từ **liền nhau, đúng thứ tự**: từ đầu ở vị trí p, từ sau ở p + 1, và cứ thế. Vì vậy `lồng đèn` chỉ khớp tài liệu 3, còn `đèn lồng` khớp tài liệu 1, 2 và 11.

Điểm của cụm từ vẫn là BM25, với IDF bằng tổng IDF của các từ trong cụm và tf là số lần cả cụm xuất hiện. Elasticsearch còn có tùy chọn `slop` cho phép các từ cách nhau vài vị trí; trình mô phỏng của BoonData chỉ chạy cụm liền nhau (`slop` bằng 0).

## Cú pháp

```text
{"query": {"match_phrase": {
  "<field>": "<words in order>"}}}

{"query": {"match_phrase": {
  "<field>": {"query": "...",
              "slop": 0}}}}
```

- Các từ phải liền nhau và đúng thứ tự (khi `slop` là 0).
- Chữ gõ đi qua analyzer của trường như `match`.

## Ví dụ

`match` thấy bốn sản phẩm có `lồng` hoặc `đèn`:

```json
GET shop/_search
{"query": {"match": {
  "name": "lồng đèn"}}}
```

`match_phrase` chỉ giữ thứ tự `lồng` rồi `đèn`:

```json
GET shop/_search
{"query": {"match_phrase": {
  "name": "lồng đèn"}}}
```

Ba từ liền nhau:

```json
GET shop/_search
{"query": {"match_phrase": {
  "name": "lá bài thơ"}}}
```

## Lỗi hay gặp

Tìm `đèn lồng` bằng `match`: đồ chơi `lồng đèn` lẫn vào.

```json
// WRONG: word order ignored
GET shop/_search
{"query": {"match": {
  "name": "đèn lồng"}}}
```

```json
// FIX: the words in this order
GET shop/_search
{"query": {"match_phrase": {
  "name": "đèn lồng"}}}
```

Một `match_phrase` chỉ nhận một trường:

```json
// ERROR parsing_exception
GET shop/_search
{"query": {"match_phrase": {
  "name": "tơ tằm",
  "brand": "SilkHouse"}}}
```

## Thực hành

Ba bước: hai cụm từ quen thuộc, rồi tách `lồng đèn` khỏi `đèn lồng`.

## Tóm tắt

- Chỉ mục lưu vị trí của từng từ, nên tìm được cụm từ.
- `match_phrase` cần các từ liền nhau và đúng thứ tự.
- `đèn lồng` và `lồng đèn` chỉ phân biệt được bằng cụm từ.
- IDF của cụm = tổng IDF các từ; tf = số lần cả cụm xuất hiện.

# EN

## Opening

In Vietnamese, `đèn lồng` (a hanging lantern) and `lồng đèn` (a Mid-Autumn toy lantern) are two different products made of the same two words. `match` cannot tell them apart. This lesson uses word positions to do it.

## Key idea

The inverted index records not only which document holds which word, but also each word's **position** in the document: `Lồng đèn giấy kéo quân` has `lồng` at 0, `đèn` at 1, `giấy` at 2. `match` ignores positions: a document with `lồng` or `đèn` anywhere matches.

`match_phrase` cuts the typed text with the same analyzer, then keeps only documents where the words are **adjacent and in order**: the first word at position p, the next at p + 1, and so on. So `lồng đèn` matches only document 3, while `đèn lồng` matches documents 1, 2 and 11.

A phrase's score is still BM25, with an IDF equal to the sum of its words' IDFs and tf equal to how often the whole phrase appears. Elasticsearch also has a `slop` option that lets the words be a few positions apart; BoonData's simulator runs adjacent phrases only (`slop` of 0).

## Syntax

```text
{"query": {"match_phrase": {
  "<field>": "<words in order>"}}}

{"query": {"match_phrase": {
  "<field>": {"query": "...",
              "slop": 0}}}}
```

- The words must be adjacent and in order (when `slop` is 0).
- The typed text goes through the field's analyzer, as with `match`.

## Example

`match` sees four products holding `lồng` or `đèn`:

```json
GET shop/_search
{"query": {"match": {
  "name": "lồng đèn"}}}
```

`match_phrase` keeps only the order `lồng` then `đèn`:

```json
GET shop/_search
{"query": {"match_phrase": {
  "name": "lồng đèn"}}}
```

Three adjacent words:

```json
GET shop/_search
{"query": {"match_phrase": {
  "name": "lá bài thơ"}}}
```

## Common mistakes

Searching `đèn lồng` with `match`: the toy `lồng đèn` slips in.

```json
// WRONG: word order ignored
GET shop/_search
{"query": {"match": {
  "name": "đèn lồng"}}}
```

```json
// FIX: the words in this order
GET shop/_search
{"query": {"match_phrase": {
  "name": "đèn lồng"}}}
```

One `match_phrase` takes one field only:

```json
// ERROR parsing_exception
GET shop/_search
{"query": {"match_phrase": {
  "name": "tơ tằm",
  "brand": "SilkHouse"}}}
```

## Practice

Three steps: two familiar phrases, then tell `lồng đèn` apart from `đèn lồng`.

## Recap

- The index stores each word's position, which makes phrase search possible.
- `match_phrase` needs the words adjacent and in order.
- `đèn lồng` and `lồng đèn` can only be told apart with a phrase.
- A phrase's IDF = the sum of its words' IDFs; tf = how often the whole phrase appears.
