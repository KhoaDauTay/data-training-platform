---
id: e-sr-l2-03
engine: search
level: L2
module: query
title: "bool: tính điểm hay chỉ lọc"
title_en: "bool: scoring or only filtering"
kind: lab
runtime: browser
minutes: 18
figures: [{ name: sr-bool-context, at: idea }]
objectives:
  - vi: "Ghép truy vấn bằng `bool` với bốn phần `must`, `should`, `filter`, `must_not`."
    en: "Combine queries with `bool` and its four parts `must`, `should`, `filter`, `must_not`."
  - vi: "Phân biệt ngữ cảnh truy vấn (query context, có điểm) với ngữ cảnh lọc (filter context, không điểm, được cache)."
    en: "Tell query context (scored) from filter context (not scored, cacheable)."
  - vi: "Đặt điều kiện có/không (giá, loại hàng) vào `filter` để chúng không làm lệch thứ hạng."
    en: "Put yes/no conditions (price, category) into `filter` so they do not skew the ranking."
requires: [e-sr-l2-02]
sources:
  - { url: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-bool-query, title_vi: "Truy vấn bool" }
  - { url: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-filter-context, title_vi: "Ngữ cảnh truy vấn và ngữ cảnh lọc" }
  - { url: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-range-query, title_vi: "Truy vấn range" }
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
        vi: "Tìm `đèn` trên `name`, nhưng chỉ hàng giá tới 200 (nghìn đồng): `match` trong `must`, `range` trên `price` trong `filter`. Điểm phải bằng điểm của `match` một mình."
        en: "Search `đèn` on `name`, but only products priced up to 200 (thousand dong): `match` in `must`, a `range` on `price` in `filter`. The scores must equal those of the `match` alone."
      solution: |
        GET shop/_search
        {"query": {"bool": {
          "must": {"match": {"name": "đèn"}},
          "filter": {"range": {
            "price": {"lte": 200}}}}}}
      check: rows
      hint:
        vi: "`{\"bool\": {\"must\": {...}, \"filter\": {\"range\": {\"price\": {\"lte\": 200}}}}}`."
        en: "`{\"bool\": {\"must\": {...}, \"filter\": {\"range\": {\"price\": {\"lte\": 200}}}}}`."
    - task:
        vi: "Liệt kê mọi hàng loại `tra` (trường `category`) chỉ bằng `filter`: không có gì để tính điểm, nên `_score` là 0."
        en: "List every product of category `tra` (field `category`) with `filter` only: nothing is scored, so `_score` is 0."
      solution: |
        GET shop/_search
        {"query": {"bool": {
          "filter": {"term": {
            "category": "tra"}}}}}
      check: rows
      hint:
        vi: "Một `bool` chỉ có `filter` chứa một `term`."
        en: "A `bool` with only a `filter` holding one `term`."
    - task:
        vi: "Tìm `lụa` trên `name` (`must`), ưu tiên hàng có thêm `đỏ` (`should`), và bỏ hẳn hàng loại `ao` (`must_not`)."
        en: "Search `lụa` on `name` (`must`), prefer products that also say `đỏ` (`should`), and drop category `ao` entirely (`must_not`)."
      solution: |
        GET shop/_search
        {"query": {"bool": {
          "must": {"match": {"name": "lụa"}},
          "should": {"match": {"name": "đỏ"}},
          "must_not": {"term": {
            "category": "ao"}}}}}
      check: rows
      ordered: true
      hint:
        vi: "Ba khóa trong cùng một `bool`: `must`, `should`, `must_not`."
        en: "Three keys in one `bool`: `must`, `should`, `must_not`."
quiz:
  - q:
      vi: "Trong một `bool` có `must`, một điều kiện `range` trên giá nên nằm ở đâu?"
      en: "In a `bool` with a `must`, where should a `range` condition on price go?"
    options:
      - { vi: "`must`: điều kiện phải đúng thì để ở must", en: "`must`: a condition that must hold goes in must" }
      - { vi: "`filter`: lọc có/không, không đổi điểm", en: "`filter`: a yes/no filter that keeps the score" }
      - { vi: "`should`: để giá rẻ được cộng điểm", en: "`should`: so cheap items gain score" }
    answer: 1
    trap: 0
    why:
      vi: "Cả `must` và `filter` đều loại tài liệu không thỏa, nên tên `must` nghe đúng. Khác nhau ở điểm: trong `must`, `range` cộng 1 điểm cho mọi tài liệu khớp, làm lệch thứ hạng mà không thêm thông tin. Trong `filter` nó chỉ quyết định có hay không, không cộng điểm, và Elasticsearch còn cache được kết quả lọc. `should` thì không bắt buộc, nên hàng đắt vẫn lọt."
      en: "Both `must` and `filter` drop documents that fail, so the name `must` sounds right. The difference is the score: inside `must`, `range` adds 1 point to every matching document, skewing the ranking without adding information. Inside `filter` it only decides yes or no, adds nothing, and Elasticsearch can cache the filter's result. `should` is optional, so expensive items would still get in."
  - q:
      vi: "Một `bool` chỉ có `should` (không `must`, không `filter`). Tài liệu không khớp `should` nào có được trả về không?"
      en: "A `bool` has only `should` clauses (no `must`, no `filter`). Is a document that matches no `should` clause returned?"
    options:
      - { vi: "Có, `should` không bao giờ bắt buộc", en: "Yes, `should` is never required" }
      - { vi: "Có, nhưng với `_score` bằng 0", en: "Yes, but with a `_score` of 0" }
      - { vi: "Không: khi đứng một mình phải khớp ít nhất một", en: "No: on its own, at least one must match" }
    answer: 2
    trap: 0
    why:
      vi: "`should` đúng là tùy chọn khi bên cạnh có `must` hay `filter`: lúc đó nó chỉ cộng điểm. Nhưng khi `bool` chỉ có `should`, mặc định `minimum_should_match` là 1, nên tài liệu phải khớp ít nhất một vế mới được trả về. Không có tài liệu nào được trả với điểm 0 chỉ vì không khớp gì."
      en: "`should` is indeed optional next to a `must` or `filter`: then it only adds score. But when a `bool` has only `should` clauses, `minimum_should_match` defaults to 1, so a document must match at least one of them to come back. No document is returned with a score of 0 just for matching nothing."
---
## Mở bài

Khách tìm `đèn` và chọn mức giá tới 200 nghìn. Giá là chuyện có hay không, không phải chuyện hợp nhiều hay ít. Bài này đặt mỗi điều kiện vào đúng ngăn của `bool`.

## Ý chính

`bool` ghép nhiều truy vấn, mỗi truy vấn vào một trong bốn ngăn:

- `must`: phải khớp, **có cộng điểm**.
- `should`: khớp thì cộng điểm; bắt buộc ít nhất một vế chỉ khi không có `must` và `filter`.
- `filter`: phải khớp, **không cộng điểm**.
- `must_not`: khớp thì bị loại, không cộng điểm.

Hai ngữ cảnh: phần nằm trong `must`/`should` chạy ở **ngữ cảnh truy vấn** (query context), trả lời "hợp tới mức nào" bằng một con số. Phần trong `filter`/`must_not` chạy ở **ngữ cảnh lọc** (filter context), chỉ trả lời "có hay không"; Elasticsearch không phải tính điểm và giữ kết quả lọc trong cache để dùng lại.

Quy tắc dùng: chữ khách gõ vào `must` hoặc `should`; giá, loại hàng, trạng thái, ngày vào `filter`. Đặt `range` vào `must` không sai kết quả nhưng cộng 1 điểm cho mọi tài liệu khớp, làm thứ hạng khó đọc và mất cache.

## Cú pháp

```text
{"query": {"bool": {
  "must":     {...},
  "should":   [{...}, {...}],
  "filter":   [{...}],
  "must_not": {...}}}}

{"range": {"price": {
  "gte": 100, "lte": 200}}}
```

- Mỗi ngăn nhận một truy vấn hoặc một mảng truy vấn.
- `range`: `gt`, `gte`, `lt`, `lte`.

## Ví dụ

Lọc giá, không đổi điểm của chữ gõ:

```json
GET shop/_search
{"query": {"bool": {
  "must": {"match": {
    "name": "lụa"}},
  "filter": {"range": {
    "price": {"lt": 500}}}}}}
```

Chỉ lọc: mọi `_score` bằng 0.

```json
GET shop/_search
{"query": {"bool": {
  "filter": {"term": {
    "brand": "HueHat"}}}}}
```

Loại một thương hiệu:

```json
GET shop/_search
{"query": {"bool": {
  "must": {"match": {
    "name": "đèn"}},
  "must_not": {"term": {
    "brand": "SaiGonCraft"}}}}}
```

## Lỗi hay gặp

Đặt `range` vào `must`: kết quả đúng, nhưng mỗi tài liệu được cộng thêm 1 điểm.

```json
// WRONG: range adds 1 to every score
GET shop/_search
{"query": {"bool": {
  "must": [{"match": {
    "name": "đèn"}},
    {"range": {"price": {
      "lte": 200}}}]}}}
```

```json
// FIX: range in filter context
GET shop/_search
{"query": {"bool": {
  "must": {"match": {
    "name": "đèn"}},
  "filter": {"range": {"price": {
    "lte": 200}}}}}}
```

Viết `filters` thay cho `filter`: `bool` không có ngăn đó.

```json
// ERROR parsing_exception
GET shop/_search
{"query": {"bool": {
  "filters": {"term": {
    "brand": "HueHat"}}}}}
```

## Thực hành

Ba bước: tìm và lọc giá, chỉ lọc, rồi ghép đủ `must`, `should`, `must_not` (chấm cả thứ tự).

## Tóm tắt

- `must` và `should` tính điểm; `filter` và `must_not` chỉ lọc.
- Điều kiện có/không (giá, loại, ngày) vào `filter`: điểm không lệch, kết quả lọc được cache.
- `should` đứng một mình thì phải khớp ít nhất một vế.
- Một `bool` chỉ có `filter` cho mọi `_score` bằng 0.

# EN

## Opening

A customer searches `đèn` (lamp) and picks a price range up to 200 thousand dong. Price is a yes-or-no question, not a how-well-does-it-fit one. This lesson puts each condition into the right slot of `bool`.

## Key idea

`bool` combines several queries, each into one of four slots:

- `must`: has to match, **adds score**.
- `should`: adds score when it matches; at least one is required only when there is no `must` and no `filter`.
- `filter`: has to match, **adds no score**.
- `must_not`: a match is dropped, no score.

Two contexts: whatever sits in `must`/`should` runs in **query context**, answering "how well does it fit" with a number. Whatever sits in `filter`/`must_not` runs in **filter context**, answering only "yes or no"; Elasticsearch skips the scoring and keeps the filter's result in a cache to reuse.

The rule of thumb: what the customer types goes into `must` or `should`; price, category, status and dates go into `filter`. A `range` inside `must` gives the right hits but adds 1 point to every matching document, which makes the ranking harder to read and loses the cache.

## Syntax

```text
{"query": {"bool": {
  "must":     {...},
  "should":   [{...}, {...}],
  "filter":   [{...}],
  "must_not": {...}}}}

{"range": {"price": {
  "gte": 100, "lte": 200}}}
```

- Each slot takes one query or an array of queries.
- `range`: `gt`, `gte`, `lt`, `lte`.

## Example

Filter the price without changing the typed text's scores:

```json
GET shop/_search
{"query": {"bool": {
  "must": {"match": {
    "name": "lụa"}},
  "filter": {"range": {
    "price": {"lt": 500}}}}}}
```

Filtering only: every `_score` is 0.

```json
GET shop/_search
{"query": {"bool": {
  "filter": {"term": {
    "brand": "HueHat"}}}}}
```

Leave one brand out:

```json
GET shop/_search
{"query": {"bool": {
  "must": {"match": {
    "name": "đèn"}},
  "must_not": {"term": {
    "brand": "SaiGonCraft"}}}}}
```

## Common mistakes

A `range` inside `must`: the hits are right, but every document gains 1 point.

```json
// WRONG: range adds 1 to every score
GET shop/_search
{"query": {"bool": {
  "must": [{"match": {
    "name": "đèn"}},
    {"range": {"price": {
      "lte": 200}}}]}}}
```

```json
// FIX: range in filter context
GET shop/_search
{"query": {"bool": {
  "must": {"match": {
    "name": "đèn"}},
  "filter": {"range": {"price": {
    "lte": 200}}}}}}
```

Writing `filters` instead of `filter`: `bool` has no such slot.

```json
// ERROR parsing_exception
GET shop/_search
{"query": {"bool": {
  "filters": {"term": {
    "brand": "HueHat"}}}}}
```

## Practice

Three steps: search and filter by price, filter only, then put `must`, `should` and `must_not` together (the order is graded).

## Recap

- `must` and `should` score; `filter` and `must_not` only filter.
- Yes/no conditions (price, category, dates) go into `filter`: no skewed scores, and the filter's result is cached.
- `should` on its own needs at least one clause to match.
- A `bool` with only `filter` gives every hit a `_score` of 0.
