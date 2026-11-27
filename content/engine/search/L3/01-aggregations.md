---
id: e-sr-l3-01
engine: search
level: L3
module: facets
title: "Aggregation: đếm theo nhóm như GROUP BY"
title_en: "Aggregations: counting by group like GROUP BY"
kind: lab
runtime: browser
minutes: 18
figures: [{ name: sr-terms-agg, at: idea }]
objectives:
  - vi: "Đếm tài liệu theo nhóm bằng aggregation `terms` trên trường `keyword`, như `GROUP BY` trong SQL."
    en: "Count documents per group with a `terms` aggregation on a `keyword` field, like `GROUP BY` in SQL."
  - vi: "Thêm số liệu cho từng nhóm (`avg`, `max`) bằng aggregation con."
    en: "Add a figure to each group (`avg`, `max`) with a sub-aggregation."
  - vi: "Dựng bộ lọc bên (facet) cho ô tìm: aggregation chạy trên đúng các tài liệu khớp câu tìm."
    en: "Build facets for a search box: the aggregation runs on exactly the documents that match the search."
requires: [e-sr-l1-04]
sources:
  - { url: https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-terms-aggregation, title_vi: "Aggregation terms" }
  - { url: https://www.elastic.co/docs/reference/aggregations/search-aggregations-metrics-avg-aggregation, title_vi: "Aggregation avg" }
  - { url: https://www.elastic.co/docs/explore-analyze/query-filter/aggregations, title_vi: "Aggregation" }
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
        vi: "Đếm số sản phẩm của mỗi thương hiệu (trường `brand`), không cần danh sách sản phẩm (`size` là 0)."
        en: "Count the products of each brand (field `brand`), without the product list (`size` set to 0)."
      solution: |
        GET shop/_search
        {"size": 0,
         "aggs": {"by_brand": {
           "terms": {"field": "brand"}}}}
      check: rows
      hint:
        vi: "`{\"size\": 0, \"aggs\": {\"by_brand\": {\"terms\": {\"field\": \"brand\"}}}}`: tên `by_brand` do bạn đặt."
        en: "`{\"size\": 0, \"aggs\": {\"by_brand\": {\"terms\": {\"field\": \"brand\"}}}}`: you choose the name `by_brand`."
    - task:
        vi: "Với mỗi loại hàng (`category`), đếm sản phẩm và tính giá trung bình (`avg` trên `price`)."
        en: "For each category (`category`), count the products and compute the average price (`avg` on `price`)."
      solution: |
        GET shop/_search
        {"size": 0,
         "aggs": {"by_cat": {
           "terms": {"field": "category"},
           "aggs": {"avg_price": {
             "avg": {"field": "price"}}}}}}
      check: rows
      hint:
        vi: "Đặt một `aggs` thứ hai bên trong aggregation `terms`."
        en: "Put a second `aggs` inside the `terms` aggregation."
    - task:
        vi: "Bộ lọc bên cho ô tìm: khách tìm `lụa` trên `name`; đếm các kết quả đó theo thương hiệu."
        en: "Facets for the search box: a customer searches `lụa` on `name`; count those hits per brand."
      solution: |
        GET shop/_search
        {"size": 0,
         "query": {"match": {"name": "lụa"}},
         "aggs": {"by_brand": {
           "terms": {"field": "brand"}}}}
      check: rows
      hint:
        vi: "Thêm `query` vào cùng request với `aggs`."
        en: "Add a `query` to the same request as the `aggs`."
quiz:
  - q:
      vi: "Hai thương hiệu cùng có 1 sản phẩm. Aggregation `terms` mặc định xếp chúng thế nào?"
      en: "Two brands both have 1 product. How does a `terms` aggregation order them by default?"
    options:
      - { vi: "Ngẫu nhiên, mỗi lần chạy một khác", en: "At random, differently on each run" }
      - { vi: "Theo thứ tự tài liệu được lưu", en: "In the order the documents were stored" }
      - { vi: "Theo khóa tăng dần khi số lượng bằng nhau", en: "By key ascending when the counts tie" }
    answer: 2
    trap: 1
    why:
      vi: "Thứ tự lưu nghe hợp lý vì nhiều thứ trong máy theo thứ tự đó, nhưng `terms` có luật riêng: nhóm nhiều tài liệu đứng trước (`_count` giảm dần), bằng nhau thì theo khóa tăng dần. Vì vậy BMTCoffee (1) đứng trước SaiGonCraft (1). Kết quả lặp lại được, không ngẫu nhiên."
      en: "Storage order sounds plausible because much inside the engine follows it, but `terms` has its own rule: the group with more documents first (`_count` descending), and on a tie the key ascending. So BMTCoffee (1) comes before SaiGonCraft (1). The result repeats; it is not random."
  - q:
      vi: "Aggregation `terms` trên trường `text` `name` thì sao?"
      en: "What happens with a `terms` aggregation on the `text` field `name`?"
    options:
      - { vi: "Bị từ chối: trường `text` không có dữ liệu để nhóm", en: "Refused: a `text` field has no data to group by" }
      - { vi: "Mỗi tên một nhóm, như `GROUP BY name`", en: "One group per name, like `GROUP BY name`" }
      - { vi: "Mỗi từ một nhóm, đếm theo từ", en: "One group per word, counted by word" }
    answer: 0
    trap: 1
    why:
      vi: "Trong SQL nhóm theo tên là bình thường, nên dễ nghĩ Elasticsearch cũng vậy. Nhưng trường `text` chỉ lưu từng từ đã cắt trong chỉ mục đảo, không lưu một giá trị nguyên cho mỗi tài liệu để nhóm (doc values), nên Elasticsearch báo lỗi `illegal_argument_exception` và gợi ý dùng trường `keyword`. Nhóm theo từng từ chỉ có khi bật `fielddata`, rất tốn bộ nhớ."
      en: "In SQL grouping by name is normal, so you might expect the same here. But a `text` field keeps only the cut words in the inverted index, not one whole value per document to group by (doc values), so Elasticsearch raises `illegal_argument_exception` and suggests a `keyword` field. Grouping by each word happens only with `fielddata` turned on, which costs a lot of memory."
---
## Mở bài

Trang tìm kiếm của Chợ Lồng Đèn có cột bên trái: "SilkHouse (3), HoiAnLight (1)". Con số đó đếm các kết quả khớp câu tìm theo thương hiệu. Bài này dựng cột đó bằng aggregation.

## Ý chính

Aggregation là phép tính trên tập tài liệu khớp câu tìm. Aggregation `terms` chia tài liệu thành nhóm (bucket) theo giá trị của một trường và đếm mỗi nhóm (`doc_count`), giống `SELECT brand, count(*) ... GROUP BY brand`. Nhóm xếp theo số lượng giảm dần, bằng nhau thì theo khóa tăng dần; mặc định trả 10 nhóm đầu (`size`).

Trường dùng để nhóm phải là `keyword`, số hay ngày: chúng có dữ liệu theo cột (doc values), một giá trị nguyên cho mỗi tài liệu. Trường `text` chỉ có chỉ mục đảo, nên nhóm theo nó bị từ chối.

Đặt aggregation con bên trong `terms` để tính số liệu cho từng nhóm: `avg`, `sum`, `min`, `max`. Khi request có cả `query` và `aggs`, aggregation chỉ chạy trên các tài liệu khớp, đó là cách dựng bộ lọc bên (facet). Đặt `size: 0` khi chỉ cần các nhóm, không cần danh sách kết quả.

Trình mô phỏng của BoonData in bảng nhóm thay cho danh sách kết quả khi request có `aggs`; Elasticsearch thật trả cả hai trong một JSON.

## Cú pháp

```text
{"size": 0,
 "query": {...},
 "aggs": {"<name>": {
   "terms": {"field": "<keyword>",
             "size": 10},
   "aggs": {"<name>": {
     "avg": {"field": "<number>"}}}}}}
```

- Tên aggregation do bạn đặt; nó là cột `agg` trong bảng kết quả.
- Mỗi nhóm: `key` (giá trị) và `doc_count` (số tài liệu).

## Ví dụ

Ba loại hàng nhiều sản phẩm nhất:

```json
GET shop/_search
{"size": 0,
 "aggs": {"top_cat": {"terms": {
   "field": "category",
   "size": 3}}}}
```

Giá cao nhất của mỗi thương hiệu:

```json
GET shop/_search
{"size": 0,
 "aggs": {"by_brand": {
   "terms": {"field": "brand"},
   "aggs": {"top_price": {
     "max": {"field": "price"}}}}}}
```

Bộ lọc bên cho câu tìm `đèn`:

```json
GET shop/_search
{"size": 0,
 "query": {"match": {"name": "đèn"}},
 "aggs": {"by_brand": {"terms": {
   "field": "brand"}}}}
```

## Lỗi hay gặp

Nhóm theo trường `text`: Elasticsearch từ chối và bảo dùng `keyword`.

```json
// ERROR illegal_argument_exception
GET shop/_search
{"size": 0,
 "aggs": {"by_name": {"terms": {
   "field": "name"}}}}
```

Quên `query`: bộ lọc bên đếm cả cửa hàng chứ không phải các kết quả khách đang xem.

```json
// WRONG: counts the whole shop
GET shop/_search
{"size": 0,
 "aggs": {"by_brand": {"terms": {
   "field": "brand"}}}}
```

```json
// FIX: count the hits of the search
GET shop/_search
{"size": 0,
 "query": {"match": {"name": "nón"}},
 "aggs": {"by_brand": {"terms": {
   "field": "brand"}}}}
```

## Thực hành

Ba bước: đếm theo thương hiệu, thêm giá trung bình theo loại, rồi dựng bộ lọc bên cho câu tìm `lụa`.

## Tóm tắt

- `terms` chia tài liệu thành nhóm theo một trường `keyword`, như `GROUP BY`.
- Nhóm xếp theo số lượng giảm dần, bằng nhau thì theo khóa tăng dần.
- Aggregation con (`avg`, `max`…) tính số liệu cho từng nhóm.
- Có `query` thì aggregation chỉ đếm các tài liệu khớp: đó là bộ lọc bên.

# EN

## Opening

Lantern Market's search page has a left column: "SilkHouse (3), HoiAnLight (1)". That number counts the search's hits per brand. This lesson builds that column with an aggregation.

## Key idea

An aggregation is a computation over the documents that match the search. A `terms` aggregation splits the documents into groups (buckets) by one field's value and counts each group (`doc_count`), like `SELECT brand, count(*) ... GROUP BY brand`. Groups are ordered by count descending, ties by key ascending; the first 10 come back by default (`size`).

The grouping field must be a `keyword`, a number or a date: these have column data (doc values), one whole value per document. A `text` field has only the inverted index, so grouping by it is refused.

Put a sub-aggregation inside `terms` to compute a figure per group: `avg`, `sum`, `min`, `max`. When a request holds both a `query` and `aggs`, the aggregation runs only on the matching documents, which is how facets are built. Set `size: 0` when you need only the groups and no list of hits.

BoonData's simulator prints the bucket table instead of the hit list when a request has `aggs`; a real Elasticsearch returns both in one JSON.

## Syntax

```text
{"size": 0,
 "query": {...},
 "aggs": {"<name>": {
   "terms": {"field": "<keyword>",
             "size": 10},
   "aggs": {"<name>": {
     "avg": {"field": "<number>"}}}}}}
```

- You choose the aggregation's name; it is the `agg` column of the result table.
- Each bucket: a `key` (the value) and a `doc_count` (the number of documents).

## Example

The three categories with the most products:

```json
GET shop/_search
{"size": 0,
 "aggs": {"top_cat": {"terms": {
   "field": "category",
   "size": 3}}}}
```

The highest price of each brand:

```json
GET shop/_search
{"size": 0,
 "aggs": {"by_brand": {
   "terms": {"field": "brand"},
   "aggs": {"top_price": {
     "max": {"field": "price"}}}}}}
```

Facets for the search `đèn`:

```json
GET shop/_search
{"size": 0,
 "query": {"match": {"name": "đèn"}},
 "aggs": {"by_brand": {"terms": {
   "field": "brand"}}}}
```

## Common mistakes

Grouping by a `text` field: Elasticsearch refuses and points to `keyword`.

```json
// ERROR illegal_argument_exception
GET shop/_search
{"size": 0,
 "aggs": {"by_name": {"terms": {
   "field": "name"}}}}
```

A missing `query`: the facets count the whole shop, not the hits the customer is looking at.

```json
// WRONG: counts the whole shop
GET shop/_search
{"size": 0,
 "aggs": {"by_brand": {"terms": {
   "field": "brand"}}}}
```

```json
// FIX: count the hits of the search
GET shop/_search
{"size": 0,
 "query": {"match": {"name": "nón"}},
 "aggs": {"by_brand": {"terms": {
   "field": "brand"}}}}
```

## Practice

Three steps: count by brand, add the average price per category, then build facets for the search `lụa`.

## Recap

- `terms` splits documents into groups by a `keyword` field, like `GROUP BY`.
- Groups are ordered by count descending, ties by key ascending.
- Sub-aggregations (`avg`, `max`…) compute a figure per group.
- With a `query`, the aggregation counts only the matching documents: those are facets.
