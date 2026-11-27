---
id: e-sr-l4-01
engine: search
level: L4
module: tuning
title: "multi_match: tìm trên nhiều trường, trường nào nặng hơn"
title_en: "multi_match: search several fields, weight some more"
kind: lab
runtime: browser
minutes: 20
figures: [{ name: sr-multi-match, at: idea }]
objectives:
  - vi: "Dùng `multi_match` để tìm một câu gõ trên cả tên và mô tả, và đọc điểm của kiểu `best_fields`."
    en: "Use `multi_match` to search one typed text across the name and the description, and read the `best_fields` score."
  - vi: "Nâng trọng số một trường bằng `^`, và chọn giữa `tie_breaker` và `most_fields` khi muốn cộng thêm trường thứ hai."
    en: "Boost a field with `^`, and choose between `tie_breaker` and `most_fields` when the second field should count too."
requires: [e-sr-l2-03]
sources:
  - https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-multi-match-query
  - https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-dis-max-query
lab:
  setup: |
    {"index": "shop",
     "settings": {"analysis": {"analyzer": {"vi_fold": {"tokenizer": "standard", "filter": ["lowercase", "asciifolding"]}}}},
     "mappings": {"properties": {
       "name": {"type": "text", "analyzer": "vi_fold"},
       "desc": {"type": "text", "analyzer": "vi_fold"},
       "brand": {"type": "keyword"},
       "price": {"type": "integer"}}},
     "docs": [
      {"_id": "1", "name": "Đèn lồng lụa đỏ", "desc": "Đèn treo hiên nhà, khung tre, vải lụa đỏ", "brand": "HoiAnLight", "price": 180},
      {"_id": "2", "name": "Đèn lồng tre nhỏ", "desc": "Đèn nhỏ để bàn, khung tre đan tay", "brand": "HoiAnLight", "price": 95},
      {"_id": "3", "name": "Lồng đèn giấy kéo quân", "desc": "Đồ chơi Trung thu cho trẻ em, giấy màu", "brand": "SaiGonCraft", "price": 60},
      {"_id": "4", "name": "Nón lá bài thơ Huế", "desc": "Nón lá có bài thơ giữa hai lớp lá", "brand": "HueHat", "price": 120},
      {"_id": "5", "name": "Nón lá trẻ em", "desc": "Nón nhỏ cho trẻ em, quai lụa", "brand": "HueHat", "price": 70},
      {"_id": "6", "name": "Áo dài lụa tơ tằm", "desc": "Áo dài may đo, lụa tơ tằm Bảo Lộc", "brand": "SilkHouse", "price": 950},
      {"_id": "7", "name": "Khăn lụa tơ tằm đỏ", "desc": "Khăn quàng cổ, lụa tơ tằm màu đỏ", "brand": "SilkHouse", "price": 320},
      {"_id": "8", "name": "Trà sen Tây Hồ", "desc": "Trà ướp hoa sen, hộp quà", "brand": "TeaLotus", "price": 250},
      {"_id": "9", "name": "Trà ô long Đà Lạt", "desc": "Trà ô long trồng ở Đà Lạt", "brand": "TeaLotus", "price": 210},
      {"_id": "10", "name": "Cà phê Buôn Ma Thuột", "desc": "Cà phê rang xay, hạt robusta", "brand": "BMTCoffee", "price": 150},
      {"_id": "11", "name": "Đèn lồng Hội An đỏ lớn", "desc": "Đèn lớn treo cửa hàng, lụa đỏ Hội An", "brand": "HoiAnLight", "price": 260},
      {"_id": "12", "name": "Tranh lụa phố cổ Hội An", "desc": "Tranh vẽ trên lụa, phố cổ về đêm", "brand": "SilkHouse", "price": 480}]}
  steps:
    - task:
        vi: "Khách gõ `khung tre`. Tìm trên cả `name` và `desc` bằng một `multi_match` kiểu mặc định."
        en: "A customer types `khung tre`. Search both `name` and `desc` with one `multi_match` of the default type."
      solution: |
        GET shop/_search
        {"query": {"multi_match": {
          "query": "khung tre",
          "fields": ["name", "desc"]}}}
      check: rows
      hint:
        vi: "`\"fields\": [\"name\", \"desc\"]`, không cần `type`: mặc định là `best_fields`."
        en: "`\"fields\": [\"name\", \"desc\"]`, no `type` needed: the default is `best_fields`."
    - task:
        vi: "Khách gõ `lụa đỏ`. Tên sản phẩm đáng tin hơn mô tả: cho `name` trọng số 3, `desc` giữ 1."
        en: "A customer types `lụa đỏ`. The product name is more telling than the description: weight `name` by 3, keep `desc` at 1."
      solution: |
        GET shop/_search
        {"query": {"multi_match": {
          "query": "lụa đỏ",
          "fields": ["name^3", "desc"]}}}
      check: rows
      hint:
        vi: "Viết trọng số ngay sau tên trường: `\"name^3\"`."
        en: "Write the boost right after the field name: `\"name^3\"`."
    - task:
        vi: "Vẫn `lụa đỏ` trên `name^3` và `desc`, nhưng tài liệu khớp cả hai trường phải được cộng thêm 0.3 lần điểm của trường còn lại."
        en: "Still `lụa đỏ` on `name^3` and `desc`, but a document matching both fields should get 0.3 times the other field's score on top."
      solution: |
        GET shop/_search
        {"query": {"multi_match": {
          "query": "lụa đỏ",
          "fields": ["name^3", "desc"],
          "tie_breaker": 0.3}}}
      check: rows
      hint:
        vi: "`\"tie_breaker\": 0.3` trong cùng `multi_match`."
        en: "`\"tie_breaker\": 0.3` inside the same `multi_match`."
    - task:
        vi: "Khách gõ `trẻ em`. Cộng điểm của mọi trường khớp (không lấy trường tốt nhất) trên `name` và `desc`."
        en: "A customer types `trẻ em`. Add up the scores of every matching field (not the best one only) on `name` and `desc`."
      solution: |
        GET shop/_search
        {"query": {"multi_match": {
          "query": "trẻ em",
          "fields": ["name", "desc"],
          "type": "most_fields"}}}
      check: rows
      hint:
        vi: "`\"type\": \"most_fields\"`."
        en: "`\"type\": \"most_fields\"`."
quiz:
  - q:
      vi: "Với `best_fields` và `tie_breaker` mặc định, một sản phẩm khớp `lụa đỏ` ở cả `name` (điểm 4) và `desc` (điểm 1). Điểm cuối là bao nhiêu?"
      en: "With `best_fields` and the default `tie_breaker`, a product matches `lụa đỏ` in both `name` (score 4) and `desc` (score 1). What is the final score?"
    options:
      - { vi: "5, vì cộng hai trường", en: "5, the two fields added" }
      - { vi: "4, chỉ trường tốt nhất", en: "4, the best field only" }
      - { vi: "2.5, trung bình hai trường", en: "2.5, the average of both" }
    answer: 1
    trap: 0
    why:
      vi: "Cộng hai trường là cách của `most_fields`, không phải mặc định. `best_fields` chạy một `match` trên từng trường rồi gói vào `dis_max`: lấy điểm lớn nhất, cộng thêm `tie_breaker` × các điểm còn lại. `tie_breaker` mặc định là 0, nên điểm là 4 + 0 × 1 = 4."
      en: "Adding both fields is what `most_fields` does, not the default. `best_fields` runs one `match` per field and wraps them in `dis_max`: it takes the highest score and adds `tie_breaker` × the others. The default `tie_breaker` is 0, so the score is 4 + 0 × 1 = 4."
  - q:
      vi: "Thêm `\"operator\": \"and\"` vào `multi_match` `lụa đỏ` trên `name` và `desc`. Một sản phẩm có `lụa` trong tên và `đỏ` chỉ trong mô tả có khớp không?"
      en: "Add `\"operator\": \"and\"` to the `multi_match` for `lụa đỏ` on `name` and `desc`. Does a product with `lụa` in its name and `đỏ` only in its description match?"
    options:
      - { vi: "Có, vì mỗi từ đều có ở một trường", en: "Yes, each word is in some field" }
      - { vi: "Không, cả hai từ phải ở cùng một trường", en: "No, both words must be in one field" }
      - { vi: "Có, nhưng điểm bằng 0", en: "Yes, but with a score of 0" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe thì như \"mỗi từ có mặt ở đâu đó là đủ\", nhưng với `best_fields` thì `operator` áp dụng **trong từng trường**: trường `name` phải có cả `lụa` và `đỏ`, hoặc trường `desc` phải có cả hai. Ở đây không trường nào đủ cả hai từ, nên sản phẩm không khớp. Muốn coi các trường như một trường lớn thì cần kiểu `cross_fields`, trình mô phỏng chưa có."
      en: "It sounds like \"each word present somewhere is enough\", but with `best_fields` the `operator` applies **within each field**: `name` must hold both `lụa` and `đỏ`, or `desc` must hold both. Neither field holds both words here, so the product does not match. Treating the fields as one big field takes the `cross_fields` type, which the simulator does not have yet."
---
## Mở bài

Khách gõ một câu, còn sản phẩm có nhiều trường: tên, mô tả, thương hiệu. Một `match` chỉ nhìn một trường. Bài này tìm trên nhiều trường cùng lúc, và cho trường quan trọng nặng hơn.

## Ý chính

`multi_match` chạy cùng một `match` trên từng trường trong `fields`, rồi gộp điểm. Kiểu mặc định là `best_fields`: nó gói các `match` vào một `dis_max`, nên điểm của tài liệu là **điểm của trường tốt nhất**. `tie_breaker` (mặc định 0) cộng thêm phần còn lại: điểm = lớn nhất + `tie_breaker` × tổng các trường khác.

Kiểu `most_fields` thì **cộng** điểm mọi trường khớp, như một `bool` với các `should`. Nó hợp khi cùng một nội dung được lưu nhiều cách (ví dụ có dấu và không dấu) và càng khớp nhiều trường càng đáng tin.

`^` sau tên trường là trọng số: `name^3` nhân trọng số (boost) của từng từ trên `name` lên 3, nên điểm BM25 của trường đó gấp 3. Lưu ý `operator` và `minimum_should_match` áp dụng trong **từng trường**: với `"operator": "and"`, mọi từ phải có trong cùng một trường.

## Cú pháp

```text
{"query": {"multi_match": {
  "query": "<chữ khách gõ>",
  "fields": ["name^3", "desc"],
  "type": "best_fields",
  "tie_breaker": 0.3}}}
```

- `type`: `best_fields` (mặc định), `most_fields`, `phrase`.
- `field^n`: nhân trọng số của trường lên n.
- `tie_breaker`: 0 tới 1, chỉ dùng với `best_fields`.

## Ví dụ

Mỗi tài liệu lấy điểm của trường tốt nhất:

```json
GET shop/_search
{"query": {"multi_match": {
  "query": "hội an",
  "fields": ["name", "desc"]}}}
```

Cùng câu đó viết bằng `dis_max`, ra cùng kết quả:

```json
GET shop/_search
{"query": {"dis_max": {"queries": [
  {"match": {"name": "hội an"}},
  {"match": {"desc": "hội an"}}]}}}
```

Tên nặng gấp 3 lần mô tả:

```json
GET shop/_search
{"query": {"multi_match": {
  "query": "trà",
  "fields": ["name^3", "desc"]}}}
```

## Lỗi hay gặp

Muốn tài liệu khớp cả hai trường đứng trên, nhưng quên rằng `best_fields` bỏ trường thứ hai:

```json
// WRONG: only the best field counts
GET shop/_search
{"query": {"multi_match": {
  "query": "trẻ em",
  "fields": ["name", "desc"]}}}
```

```json
// FIX: add every matching field
GET shop/_search
{"query": {"multi_match": {
  "query": "trẻ em",
  "fields": ["name", "desc"],
  "type": "most_fields"}}}
```

`multi_match` cần `query`:

```json
// ERROR parsing_exception
GET shop/_search
{"query": {"multi_match": {
  "fields": ["name", "desc"]}}}
```

## Thực hành

Bốn bước: tìm trên hai trường, cho tên nặng gấp 3, thêm `tie_breaker`, rồi cộng mọi trường bằng `most_fields`.

## Tóm tắt

- `multi_match` chạy một `match` trên từng trường trong `fields`.
- `best_fields` (mặc định) lấy điểm trường tốt nhất; `tie_breaker` cộng thêm phần còn lại.
- `most_fields` cộng điểm mọi trường khớp.
- `name^3` nhân trọng số của trường `name` lên 3.
- `operator: and` đòi mọi từ trong cùng một trường.

# EN

## Opening

A customer types one text, while a product has several fields: name, description, brand. A `match` looks at one field only. This lesson searches several fields at once and makes the important field weigh more.

## Key idea

`multi_match` runs the same `match` on each field in `fields`, then combines the scores. The default type is `best_fields`: it wraps the `match` queries in one `dis_max`, so a document's score is **the score of its best field**. `tie_breaker` (default 0) adds the rest: score = the highest + `tie_breaker` × the sum of the other fields.

The `most_fields` type **adds up** the scores of every matching field, like a `bool` of `should` clauses. It fits when the same content is stored in several ways (for example with and without accents) and matching more fields means more confidence.

A `^` after a field name is a weight: `name^3` multiplies the boost of each word on `name` by 3, so that field's BM25 score triples. Note that `operator` and `minimum_should_match` apply **within each field**: with `"operator": "and"`, every word must be in the same field.

## Syntax

```text
{"query": {"multi_match": {
  "query": "<chữ khách gõ>",
  "fields": ["name^3", "desc"],
  "type": "best_fields",
  "tie_breaker": 0.3}}}
```

- `type`: `best_fields` (default), `most_fields`, `phrase`.
- `field^n`: multiplies the field's weight by n.
- `tie_breaker`: 0 to 1, used with `best_fields` only.

## Example

Each document takes the score of its best field:

```json
GET shop/_search
{"query": {"multi_match": {
  "query": "hội an",
  "fields": ["name", "desc"]}}}
```

The same query written as `dis_max` gives the same result:

```json
GET shop/_search
{"query": {"dis_max": {"queries": [
  {"match": {"name": "hội an"}},
  {"match": {"desc": "hội an"}}]}}}
```

The name weighs three times the description:

```json
GET shop/_search
{"query": {"multi_match": {
  "query": "trà",
  "fields": ["name^3", "desc"]}}}
```

## Common mistakes

Wanting documents that match both fields on top, but forgetting that `best_fields` drops the second field:

```json
// WRONG: only the best field counts
GET shop/_search
{"query": {"multi_match": {
  "query": "trẻ em",
  "fields": ["name", "desc"]}}}
```

```json
// FIX: add every matching field
GET shop/_search
{"query": {"multi_match": {
  "query": "trẻ em",
  "fields": ["name", "desc"],
  "type": "most_fields"}}}
```

`multi_match` needs `query`:

```json
// ERROR parsing_exception
GET shop/_search
{"query": {"multi_match": {
  "fields": ["name", "desc"]}}}
```

## Practice

Four steps: search two fields, make the name three times heavier, add a `tie_breaker`, then add every field with `most_fields`.

## Recap

- `multi_match` runs one `match` on each field in `fields`.
- `best_fields` (default) takes the best field's score; `tie_breaker` adds the rest.
- `most_fields` adds up the scores of every matching field.
- `name^3` multiplies the `name` field's weight by 3.
- `operator: and` needs every word in the same field.
