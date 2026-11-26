---
id: e-sr-l3-05
engine: search
level: L3
module: capstone
title: "Bài tổng hợp: ô tìm kiếm cho Chợ Lồng Đèn"
title_en: "Capstone: a search box for Lantern Market"
kind: capstone
runtime: browser
minutes: 30
figures: [{ name: sr-capstone-flow, at: idea }]
objectives:
  - vi: "Ghép mọi phần của R1 thành một ô tìm kiếm: bỏ dấu, nhiều từ, lọc giá, chịu lỗi gõ, bộ lọc bên và gợi ý khi gõ."
    en: "Put every part of R1 together into one search box: no accents, several words, a price filter, typo tolerance, facets and search-as-you-type."
  - vi: "Chọn đúng ngăn của `bool` cho từng điều kiện để điểm không bị lệch."
    en: "Pick the right `bool` slot for each condition so the scores are not skewed."
requires: [e-sr-l2-03, e-sr-l2-05, e-sr-l3-01]
sources:
  - https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-bool-query
  - https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-match-query
  - https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-terms-aggregation
lab:
  setup: |
    {"index": "shop",
     "settings": {"analysis": {
       "filter": {"prefixes": {"type": "edge_ngram",
         "min_gram": 2, "max_gram": 10}},
       "analyzer": {
         "vi_fold": {"tokenizer": "standard",
           "filter": ["lowercase", "asciifolding"]},
         "ac": {"tokenizer": "standard",
           "filter": ["lowercase", "asciifolding", "prefixes"]}}}},
     "mappings": {"properties": {
       "name": {"type": "text", "analyzer": "vi_fold",
         "fields": {"ac": {"type": "text", "analyzer": "ac",
           "search_analyzer": "vi_fold"}}},
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
    - name: { vi: "Không dấu", en: "No accents" }
      task:
        vi: "Khách gõ `den long`. Chỉ trả hàng có cả hai từ (không lẫn trà ô long), tìm trên `name`."
        en: "A customer types `den long`. Return only products with both words (no oolong tea), searching `name`."
      solution: |
        GET shop/_search
        {"query": {"match": {"name": {
          "query": "den long",
          "operator": "and"}}}}
      check: rows
      hint:
        vi: "`operator` là `and` trong dạng dài của `match`."
        en: "`operator` set to `and` in the long form of `match`."
    - name: { vi: "Lọc giá", en: "Price filter" }
      task:
        vi: "Khách gõ `lua` và chọn giá tới 400. Giá không được đổi điểm: `match` trong `must`, `range` trong `filter`."
        en: "A customer types `lua` and picks prices up to 400. The price must not change the scores: `match` in `must`, `range` in `filter`."
      solution: |
        GET shop/_search
        {"query": {"bool": {
          "must": {"match": {"name": "lua"}},
          "filter": {"range": {
            "price": {"lte": 400}}}}}}
      check: rows
      hint:
        vi: "Một `bool` với `must` và `filter`."
        en: "One `bool` with `must` and `filter`."
    - name: { vi: "Lỗi gõ", en: "Typos" }
      task:
        vi: "Khách gõ `khan lau` (đảo chữ của `lua`). Tìm với `fuzziness` là `AUTO` và `operator` là `and` để chỉ ra chiếc khăn lụa. Bước này chấm danh sách tài liệu."
        en: "A customer types `khan lau` (`lua` with two letters swapped). Search with `fuzziness` set to `AUTO` and `operator` set to `and` so only the silk scarf comes back. This step grades the list of documents."
      solution: |
        GET shop/_search
        {"query": {"match": {"name": {
          "query": "khan lau",
          "operator": "and",
          "fuzziness": "AUTO"}}}}
      check: rows
      hint:
        vi: "Ba khóa trong dạng dài của `match`: `query`, `operator`, `fuzziness`."
        en: "Three keys in the long form of `match`: `query`, `operator`, `fuzziness`."
    - name: { vi: "Bộ lọc bên", en: "Facets" }
      task:
        vi: "Cột bên trái của trang kết quả cho `lua`: đếm các kết quả theo `brand`, không cần danh sách (`size` là 0)."
        en: "The left column of the results page for `lua`: count the hits per `brand`, without the list (`size` set to 0)."
      solution: |
        GET shop/_search
        {"size": 0,
         "query": {"match": {"name": "lua"}},
         "aggs": {"by_brand": {"terms": {
           "field": "brand"}}}}
      check: rows
      hint:
        vi: "`query` và `aggs` trong cùng một request."
        en: "`query` and `aggs` in the same request."
    - name: { vi: "Gợi ý khi gõ", en: "As you type" }
      task:
        vi: "Khách mới gõ `hoi` trong mục đèn. Gợi ý trên `name.ac`, chỉ trong loại `den` (lọc, không tính điểm)."
        en: "A customer has typed only `hoi` in the lamps section. Suggest on `name.ac`, only in category `den` (a filter, not scored)."
      solution: |
        GET shop/_search
        {"query": {"bool": {
          "must": {"match": {"name.ac": "hoi"}},
          "filter": {"term": {
            "category": "den"}}}}}
      check: rows
      hint:
        vi: "`match` trên `name.ac` trong `must`, `term` trên `category` trong `filter`."
        en: "`match` on `name.ac` in `must`, `term` on `category` in `filter`."
quiz:
  - q:
      vi: "Bước 2 đặt `range` giá trong `filter`. Nếu đặt nó trong `must`, khách thấy gì khác?"
      en: "Step 2 puts the price `range` in `filter`. If it went into `must`, what would the customer see differently?"
    options:
      - { vi: "Ít kết quả hơn, vì `must` lọc chặt hơn", en: "Fewer hits, because `must` filters harder" }
      - { vi: "Cùng các kết quả, điểm mỗi cái cộng thêm 1", en: "The same hits, each score plus 1" }
      - { vi: "Báo lỗi vì `range` không dùng được trong `must`", en: "An error, as `range` is not allowed in `must`" }
    answer: 1
    trap: 0
    why:
      vi: "`must` và `filter` loại đúng cùng những tài liệu, nên số kết quả không đổi. Khác ở điểm: trong `must`, `range` là truy vấn có điểm hằng 1, nên mỗi kết quả được cộng 1. Thứ tự giữ nguyên ở đây, nhưng con số khó đọc hơn và Elasticsearch không cache được phần lọc. `range` dùng được ở mọi ngăn."
      en: "`must` and `filter` drop exactly the same documents, so the number of hits is unchanged. The difference is the score: inside `must`, `range` is a query with a constant score of 1, so each hit gains 1. The order stays the same here, but the numbers are harder to read and Elasticsearch cannot cache the filter part. `range` works in every slot."
  - q:
      vi: "Vì sao bước 5 tìm trên `name.ac` mà không thêm `edge_ngram` vào trường `name` chính?"
      en: "Why does step 5 search `name.ac` instead of adding `edge_ngram` to the main `name` field?"
    options:
      - { vi: "`name` chính không được có trường con", en: "The main `name` cannot have sub-fields" }
      - { vi: "Tiền tố làm `name` khớp quá rộng và chỉ mục to ra", en: "Prefixes would make `name` match too broadly and grow" }
      - { vi: "`edge_ngram` chỉ dùng được cho trường `keyword`", en: "`edge_ngram` only works on `keyword` fields" }
    answer: 1
    trap: 0
    why:
      vi: "Trường chính có trường con được, chính `name.ac` là ví dụ. Lý do là nếu `name` lưu cả tiền tố, mọi câu tìm thường như `lua` cũng khớp các từ chỉ bắt đầu bằng `lu`, và chỉ mục của trường chính lớn ra nhiều lần. Đặt tiền tố trong trường con riêng thì ô tìm chính giữ điểm chính xác, còn gợi ý khi gõ dùng trường con. `edge_ngram` là bộ lọc cho trường `text`."
      en: "A main field can have sub-fields; `name.ac` is one. The reason is that if `name` stored prefixes, every ordinary search such as `lua` would also match words that merely start with `lu`, and the main field's index would grow several times. Keeping prefixes in a separate sub-field leaves the main search precise, while search-as-you-type uses the sub-field. `edge_ngram` is a filter for `text` fields."
---
## Mở bài

Chủ Chợ Lồng Đèn muốn một ô tìm kiếm thật: gõ không dấu, gõ sai, gõ dở đều ra hàng, có lọc giá và cột đếm theo thương hiệu. Năm bước dưới đây dựng từng phần trên cùng một chỉ mục. Mỗi bước dùng một bài đã học.

## Ý chính

Chỉ mục `shop` gom các quyết định của R1:

- `name` lưu bằng `vi_fold` (bỏ dấu), nên `den long` khớp `Đèn lồng`; `operator: and` giữ trà ô long ở ngoài.
- Điều kiện có/không như giá hay loại hàng vào `filter`, nên điểm BM25 chỉ phản ánh chữ khách gõ.
- `fuzziness: AUTO` cứu lỗi gõ; trình mô phỏng chấm bước này theo danh sách tài liệu.
- Aggregation `terms` trên `brand` (kiểu `keyword`) cho cột đếm bên trái, trên đúng các kết quả của câu tìm.
- Trường con `name.ac` lưu tiền tố bằng `edge_ngram` cho gợi ý khi gõ, tìm bằng `vi_fold`.

Đây là bản mô phỏng một phần Elasticsearch; trên cụm thật, cùng các request này chạy y hệt, chỉ khác là trả hits và aggregations trong một JSON.

## Cú pháp

```text
{"query": {"bool": {
  "must":   {"match": {"name": {
    "query": "...",
    "operator": "and",
    "fuzziness": "AUTO"}}},
  "filter": [{"range": {...}},
             {"term": {...}}]}},
 "size": 0,
 "aggs": {"by_brand": {"terms": {
   "field": "brand"}}}}
```

- Chữ gõ: `must`; điều kiện có/không: `filter`.
- `name` cho tìm thường, `name.ac` cho gợi ý khi gõ.

## Ví dụ

Gõ không dấu một cụm hai từ:

```json
GET shop/_search
{"query": {"match": {"name": {
  "query": "non la",
  "operator": "and"}}}}
```

Tìm và lọc theo thương hiệu:

```json
GET shop/_search
{"query": {"bool": {
  "must": {"match": {"name": "tra"}},
  "filter": {"term": {
    "brand": "TeaLotus"}}}}}
```

Bộ lọc bên theo loại hàng:

```json
GET shop/_search
{"size": 0,
 "query": {"match": {"name": "do"}},
 "aggs": {"by_cat": {"terms": {
   "field": "category"}}}}
```

## Lỗi hay gặp

Gợi ý khi gõ trên trường chính: `tran` chưa phải một từ trọn vẹn nên không khớp gì.

```json
// WRONG: no prefixes in the main field
GET shop/_search
{"query": {"match": {
  "name": "tran"}}}
```

```json
// FIX: the prefix sub-field
GET shop/_search
{"query": {"match": {
  "name.ac": "tran"}}}
```

Đếm theo thương hiệu bằng tên trường sai kiểu: `name` là `text`.

```json
// ERROR illegal_argument_exception
GET shop/_search
{"size": 0,
 "aggs": {"by_name": {"terms": {
   "field": "name"}}}}
```

## Thực hành

Năm bước, mỗi bước một phần của ô tìm kiếm: không dấu, lọc giá, lỗi gõ, bộ lọc bên, gợi ý khi gõ.

## Tóm tắt

- Bỏ dấu khi lưu và khi tìm; `operator: and` để không lẫn từ trùng.
- Chữ gõ vào `must`, giá và loại hàng vào `filter`.
- `fuzziness: AUTO` cho lỗi gõ; `edge_ngram` trên trường con cho gợi ý khi gõ.
- Aggregation `terms` trên `keyword` cho bộ lọc bên của đúng các kết quả.

# EN

## Opening

Lantern Market's owner wants a real search box: typing without accents, with typos or half a word all find products, with a price filter and a count per brand. The five steps below build each part on one index. Each step uses a lesson you have done.

## Key idea

The `shop` index gathers R1's decisions:

- `name` is stored with `vi_fold` (no accents), so `den long` matches `Đèn lồng`; `operator: and` keeps the oolong tea out.
- Yes/no conditions such as price or category go into `filter`, so the BM25 score reflects only the typed words.
- `fuzziness: AUTO` rescues typos; the simulator grades that step by the list of documents.
- A `terms` aggregation on `brand` (a `keyword`) gives the left column of counts, over exactly the search's hits.
- The sub-field `name.ac` stores prefixes with `edge_ngram` for search-as-you-type, searched with `vi_fold`.

This is a simulation of part of Elasticsearch; on a real cluster the same requests run unchanged, except that hits and aggregations come back in one JSON.

## Syntax

```text
{"query": {"bool": {
  "must":   {"match": {"name": {
    "query": "...",
    "operator": "and",
    "fuzziness": "AUTO"}}},
  "filter": [{"range": {...}},
             {"term": {...}}]}},
 "size": 0,
 "aggs": {"by_brand": {"terms": {
   "field": "brand"}}}}
```

- Typed words: `must`; yes/no conditions: `filter`.
- `name` for ordinary search, `name.ac` for search-as-you-type.

## Example

A two-word phrase typed without accents:

```json
GET shop/_search
{"query": {"match": {"name": {
  "query": "non la",
  "operator": "and"}}}}
```

Search and filter by brand:

```json
GET shop/_search
{"query": {"bool": {
  "must": {"match": {"name": "tra"}},
  "filter": {"term": {
    "brand": "TeaLotus"}}}}}
```

Facets per category:

```json
GET shop/_search
{"size": 0,
 "query": {"match": {"name": "do"}},
 "aggs": {"by_cat": {"terms": {
   "field": "category"}}}}
```

## Common mistakes

Search-as-you-type on the main field: `tran` is not a whole word yet, so nothing matches.

```json
// WRONG: no prefixes in the main field
GET shop/_search
{"query": {"match": {
  "name": "tran"}}}
```

```json
// FIX: the prefix sub-field
GET shop/_search
{"query": {"match": {
  "name.ac": "tran"}}}
```

Counting per brand with a field of the wrong type: `name` is `text`.

```json
// ERROR illegal_argument_exception
GET shop/_search
{"size": 0,
 "aggs": {"by_name": {"terms": {
   "field": "name"}}}}
```

## Practice

Five steps, one part of the search box each: no accents, a price filter, typos, facets, search-as-you-type.

## Recap

- Remove accents when storing and when searching; `operator: and` avoids colliding words.
- Typed words go into `must`, price and category into `filter`.
- `fuzziness: AUTO` for typos; `edge_ngram` on a sub-field for search-as-you-type.
- A `terms` aggregation on a `keyword` gives facets over exactly the hits.
