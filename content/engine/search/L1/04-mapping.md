---
id: e-sr-l1-04
engine: search
level: L1
module: index
title: "Mapping: text hay keyword"
title_en: "Mappings: text or keyword"
kind: lab
runtime: browser
minutes: 16
figures: [{ name: sr-text-keyword, at: idea }]
objectives:
  - vi: "Phân biệt kiểu `text` (cắt thành từ, để tìm) và `keyword` (giữ nguyên chuỗi, để lọc, nhóm, sắp)."
    en: "Tell the `text` type (cut into words, for search) from `keyword` (the string kept whole, for filters, grouping and sorting)."
  - vi: "Đọc mapping động (dynamic mapping) mà Elasticsearch tự đặt: một chuỗi thành `text` kèm trường con `.keyword`."
    en: "Read the dynamic mapping Elasticsearch sets by itself: a string becomes `text` with a `.keyword` sub-field."
  - vi: "Chọn đúng trường cho `term`: trường `keyword`, với đúng chữ hoa chữ thường đã lưu."
    en: "Pick the right field for `term`: a `keyword` field, with the exact capitals that were stored."
requires: [e-sr-l1-01]
sources:
  - https://www.elastic.co/docs/manage-data/data-store/mapping/dynamic-field-mapping
  - https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/text
  - https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/keyword
lab:
  setup: |
    {"index": "shop",
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
        vi: "Chỉ mục `shop` được tạo không khai báo mapping. Xem Elasticsearch tự đặt kiểu gì cho từng trường (`_mapping`)."
        en: "The index `shop` was created without a mapping. See which type Elasticsearch set for each field by itself (`_mapping`)."
      solution: |
        GET shop/_mapping
      check: rows
      hint:
        vi: "Chỉ một dòng `GET shop/_mapping`, không có thân."
        en: "Just one line `GET shop/_mapping`, no body."
    - task:
        vi: "Lọc đúng thương hiệu `SilkHouse` bằng `term` trên trường con `brand.keyword`."
        en: "Filter the exact brand `SilkHouse` with `term` on the sub-field `brand.keyword`."
      solution: |
        GET shop/_search
        {"query": {"term": {
          "brand.keyword": "SilkHouse"}}}
      check: rows
      hint:
        vi: "`{\"term\": {\"brand.keyword\": \"SilkHouse\"}}`: viết hoa đúng như lúc lưu."
        en: "`{\"term\": {\"brand.keyword\": \"SilkHouse\"}}`: capitals exactly as stored."
    - task:
        vi: "Tìm đúng nguyên tên `Nón lá trẻ em` (cả chuỗi, không phải từng từ) bằng `term` trên `name.keyword`."
        en: "Find the whole name `Nón lá trẻ em` (the full string, not word by word) with `term` on `name.keyword`."
      solution: |
        GET shop/_search
        {"query": {"term": {
          "name.keyword": "Nón lá trẻ em"}}}
      check: rows
      hint:
        vi: "Trường con `.keyword` giữ cả chuỗi; `term` so nguyên văn."
        en: "The `.keyword` sub-field keeps the whole string; `term` compares it literally."
    - task:
        vi: "Trường `price` được đặt kiểu `long`. Tìm sản phẩm giá đúng `120` bằng `term`."
        en: "The `price` field was mapped as `long`. Find the product priced exactly `120` with `term`."
      solution: |
        GET shop/_search
        {"query": {"term": {
          "price": 120}}}
      check: rows
      hint:
        vi: "`{\"term\": {\"price\": 120}}`: số viết không có nháy."
        en: "`{\"term\": {\"price\": 120}}`: the number without quotes."
quiz:
  - q:
      vi: "Bạn gửi tài liệu `{\"brand\": \"SilkHouse\"}` vào một chỉ mục chưa có mapping. Elasticsearch đặt `brand` kiểu gì?"
      en: "You send the document `{\"brand\": \"SilkHouse\"}` to an index with no mapping. Which type does Elasticsearch give `brand`?"
    options:
      - { vi: "Chỉ `keyword`, vì giá trị ngắn", en: "Only `keyword`, because the value is short" }
      - { vi: "Chỉ `text`, vì mọi chuỗi đều là chữ", en: "Only `text`, because every string is text" }
      - { vi: "`text`, kèm trường con `brand.keyword`", en: "`text`, with a `brand.keyword` sub-field" }
    answer: 2
    trap: 0
    why:
      vi: "Giá trị ngắn trông giống một mã nên dễ đoán `keyword`, nhưng mapping động không đo độ dài. Với mọi chuỗi, nó đặt `text` để tìm theo từ, và thêm trường con `brand.keyword` (kiểu `keyword`, bỏ qua chuỗi dài hơn 256 ký tự) để lọc, nhóm và sắp. Vì vậy lọc đúng thương hiệu phải dùng `brand.keyword`."
      en: "A short value looks like a code, so `keyword` is a tempting guess, but dynamic mapping does not look at length. For every string it sets `text` for word search, and adds a `brand.keyword` sub-field (type `keyword`, skipping strings over 256 characters) for filters, grouping and sorting. That is why an exact brand filter must use `brand.keyword`."
  - q:
      vi: "`{\"term\": {\"brand\": \"SilkHouse\"}}` trả 0 kết quả, dù có 3 sản phẩm SilkHouse. Vì sao?"
      en: "`{\"term\": {\"brand\": \"SilkHouse\"}}` returns 0 hits, although 3 products are SilkHouse. Why?"
    options:
      - { vi: "`term` cần thêm tùy chọn `operator: and`", en: "`term` needs the `operator: and` option" }
      - { vi: "`brand` là `text`, đã lưu thành `silkhouse`", en: "`brand` is `text`, stored as `silkhouse`" }
      - { vi: "Chỉ mục chưa kịp làm mới sau khi ghi", en: "The index has not refreshed since the write" }
    answer: 1
    trap: 2
    why:
      vi: "Làm mới chậm (refresh) có thật, nhưng ở đây dữ liệu đã có từ trước và `match` trên cùng trường vẫn thấy. Lý do là `brand` kiểu `text`: analyzer `standard` đã lưu nó thành `silkhouse` viết thường. `term` không đưa chữ qua analyzer, nên tìm `SilkHouse` viết hoa và trượt. Dùng `brand.keyword` (giữ nguyên chuỗi) hoặc `match`."
      en: "Refresh delay is real, but here the data was there long before, and `match` on the same field finds it. The reason is that `brand` is `text`: the `standard` analyzer stored it as lower-case `silkhouse`. `term` does not run its value through the analyzer, so it looks for `SilkHouse` with capitals and misses. Use `brand.keyword` (the whole string kept) or `match`."
---
## Mở bài

Đội bán hàng muốn lọc đúng thương hiệu `SilkHouse` và nhóm doanh số theo loại hàng. Ô tìm thì cần tìm theo từng từ trong tên. Hai nhu cầu này cần hai kiểu lưu khác nhau cho cùng một chuỗi.

## Ý chính

Mapping là lược đồ của chỉ mục: mỗi trường có một kiểu. Hai kiểu chuỗi hay dùng nhất:

- `text`: chữ đi qua analyzer và được cắt thành từ. Dùng để **tìm** (`match`). Không sắp và không nhóm được, vì sau khi cắt thì không còn một giá trị nguyên vẹn cho mỗi tài liệu.
- `keyword`: cả chuỗi là một từ, giữ nguyên chữ hoa. Dùng để **lọc chính xác**, **nhóm** (aggregation) và **sắp xếp**.

Nếu không khai báo, Elasticsearch đoán kiểu khi gặp tài liệu đầu tiên (dynamic mapping): số nguyên thành `long`, chuỗi thành `text` kèm trường con `.keyword`. Tiện để thử, nhưng chỉ mục thật nên khai báo mapping trước, vì kiểu của một trường đã có dữ liệu thì không đổi được nếu không tạo lại chỉ mục (reindex).

`term` so nguyên văn, không qua analyzer. Đặt `term` lên một trường `text` là lỗi kinh điển: chữ lưu đã viết thường và bị cắt, còn chữ bạn đưa thì không.

## Cú pháp

```text
GET <index>/_mapping

"properties": {
  "name":  {"type": "text"},
  "brand": {"type": "keyword"},
  "price": {"type": "integer"}}

{"query": {"term": {
  "<keyword field>": "<value>"}}}
```

- Trường con động tên là `<field>.keyword`.
- `term` trên số: viết số không có nháy.

## Ví dụ

Mapping động của chỉ mục:

```json
GET shop/_mapping
```

Lọc đúng một loại hàng bằng trường `keyword`:

```json
GET shop/_search
{"query": {"term": {
  "category.keyword": "tra"}}}
```

Tìm theo từ trên trường `text`:

```json
GET shop/_search
{"query": {"match": {
  "name": "nón lá"}}}
```

## Lỗi hay gặp

`term` trên trường `text`: chữ lưu là `silkhouse`, chữ tìm là `SilkHouse`, không khớp.

```json
// WRONG: brand is text
GET shop/_search
{"query": {"term": {
  "brand": "SilkHouse"}}}
```

```json
// FIX: the keyword sub-field
GET shop/_search
{"query": {"term": {
  "brand.keyword": "SilkHouse"}}}
```

Sắp xếp theo một trường `text` bị từ chối (cần `keyword`):

```json
// ERROR illegal_argument_exception
GET shop/_search
{"sort": ["name"]}
```

## Thực hành

Bốn bước: đọc mapping động, lọc thương hiệu, tìm đúng một tên trọn vẹn, rồi lọc theo số.

## Tóm tắt

- `text` để tìm theo từ; `keyword` để lọc chính xác, nhóm và sắp.
- Mapping động biến chuỗi thành `text` kèm `.keyword`, số nguyên thành `long`.
- `term` không qua analyzer: dùng nó trên `keyword` hay số.
- Đổi kiểu một trường đã có dữ liệu cần tạo lại chỉ mục.

# EN

## Opening

The sales team wants to filter the exact brand `SilkHouse` and group sales by category. The search box needs to find each word inside a name. These two needs call for two different ways of storing the same string.

## Key idea

A mapping is the index's schema: each field has a type. The two most used string types:

- `text`: the string goes through an analyzer and is cut into words. Used to **search** (`match`). It cannot be sorted or grouped, because once cut there is no single whole value per document.
- `keyword`: the whole string is one word, capitals kept. Used to **filter exactly**, **group** (aggregations) and **sort**.

Without a declared mapping, Elasticsearch guesses each type from the first document it sees (dynamic mapping): an integer becomes `long`, a string becomes `text` with a `.keyword` sub-field. Handy for trying things, but a real index should declare its mapping first, because a field's type cannot change once it holds data without building the index again (a reindex).

`term` compares literally, without the analyzer. Putting `term` on a `text` field is the classic mistake: the stored words are lower case and cut, while the value you pass is not.

## Syntax

```text
GET <index>/_mapping

"properties": {
  "name":  {"type": "text"},
  "brand": {"type": "keyword"},
  "price": {"type": "integer"}}

{"query": {"term": {
  "<keyword field>": "<value>"}}}
```

- A dynamic sub-field is named `<field>.keyword`.
- `term` on a number: write the number without quotes.

## Example

The index's dynamic mapping:

```json
GET shop/_mapping
```

Filter one exact category with the `keyword` field:

```json
GET shop/_search
{"query": {"term": {
  "category.keyword": "tra"}}}
```

Search by words on the `text` field:

```json
GET shop/_search
{"query": {"match": {
  "name": "nón lá"}}}
```

## Common mistakes

`term` on a `text` field: the stored word is `silkhouse`, the searched one `SilkHouse`, no match.

```json
// WRONG: brand is text
GET shop/_search
{"query": {"term": {
  "brand": "SilkHouse"}}}
```

```json
// FIX: the keyword sub-field
GET shop/_search
{"query": {"term": {
  "brand.keyword": "SilkHouse"}}}
```

Sorting by a `text` field is refused (it needs `keyword`):

```json
// ERROR illegal_argument_exception
GET shop/_search
{"sort": ["name"]}
```

## Practice

Four steps: read the dynamic mapping, filter a brand, find one whole name, then filter by a number.

## Recap

- `text` is for word search; `keyword` is for exact filters, grouping and sorting.
- Dynamic mapping turns a string into `text` plus `.keyword`, an integer into `long`.
- `term` skips the analyzer: use it on `keyword` or numbers.
- Changing the type of a field that holds data needs a new index.
