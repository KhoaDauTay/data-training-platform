---
id: e-sr-l2-02
engine: search
level: L2
module: query
title: "match hay term"
title_en: "match or term"
kind: lab
runtime: browser
minutes: 15
figures: [{ name: sr-match-term, at: idea }]
objectives:
  - vi: "Biết `match` đưa chữ qua analyzer của trường, còn `term` dùng nguyên văn giá trị bạn đưa."
    en: "Know that `match` runs the text through the field's analyzer, while `term` uses your value literally."
  - vi: "Dùng `term` cho trường `keyword` và số, `match` cho trường `text`."
    en: "Use `term` on `keyword` fields and numbers, `match` on `text` fields."
  - vi: "Nhận ra lỗi kinh điển: `term` với chữ hoa hay nhiều từ trên một trường `text` không ra gì."
    en: "Spot the classic miss: `term` with capitals or several words on a `text` field returns nothing."
requires: [e-sr-l1-04]
sources:
  - { url: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-term-query, title_vi: "Truy vấn term" }
  - { url: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-match-query, title_vi: "Truy vấn match" }
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
        vi: "Khách gõ `Nón Lá` (viết hoa). Tìm trên `name` sao cho vẫn ra hai chiếc nón."
        en: "A customer types `Nón Lá` (with capitals). Search `name` so both hats still come back."
      solution: |
        GET shop/_search
        {"query": {"match": {
          "name": "Nón Lá"}}}
      check: rows
      hint:
        vi: "`match` viết thường chữ gõ trước khi tra."
        en: "`match` lower-cases the typed text before the lookup."
    - task:
        vi: "Lọc thương hiệu `HueHat` bằng `term` trên trường `keyword` `brand`."
        en: "Filter the brand `HueHat` with `term` on the `keyword` field `brand`."
      solution: |
        GET shop/_search
        {"query": {"term": {
          "brand": "HueHat"}}}
      check: rows
      hint:
        vi: "`{\"term\": {\"brand\": \"HueHat\"}}`, viết hoa đúng như lúc lưu."
        en: "`{\"term\": {\"brand\": \"HueHat\"}}`, capitals exactly as stored."
    - task:
        vi: "Dùng `term` trên trường `text` `name` mà vẫn ra kết quả: đưa đúng một từ như chỉ mục đã lưu, `nón` viết thường."
        en: "Use `term` on the `text` field `name` and still get hits: pass exactly one word as the index stored it, lower-case `nón`."
      solution: |
        GET shop/_search
        {"query": {"term": {
          "name": "nón"}}}
      check: rows
      hint:
        vi: "Từ trong chỉ mục của `name` là chữ thường, từng từ một."
        en: "The words in the `name` index are lower case, one word each."
quiz:
  - q:
      vi: "`{\"term\": {\"name\": \"Nón lá\"}}` trên trường `text` trả bao nhiêu kết quả?"
      en: "How many hits does `{\"term\": {\"name\": \"Nón lá\"}}` return on a `text` field?"
    options:
      - { vi: "0: chỉ mục không có từ nào là `Nón lá`", en: "0: no single word in the index is `Nón lá`" }
      - { vi: "2: hai chiếc nón có cụm từ đó", en: "2: both hats hold that phrase" }
      - { vi: "Báo lỗi vì `term` không dùng cho `text`", en: "An error, as `term` is not allowed on `text`" }
    answer: 0
    trap: 1
    why:
      vi: "Hai chiếc nón có cụm `Nón lá` trong tên, nhưng chỉ mục của `name` lưu từng từ đã viết thường: `nón`, `lá`. `term` không cắt và không viết thường chữ bạn đưa, nên nó tìm một từ duy nhất `Nón lá` và không thấy. Elasticsearch không báo lỗi, nó chỉ trả 0, nên lỗi này dễ lọt. Dùng `match`."
      en: "Both hats have `Nón lá` in their names, but the `name` index stores each lower-case word: `nón`, `lá`. `term` neither cuts nor lower-cases your value, so it looks for one single word `Nón lá` and finds none. Elasticsearch raises no error, it just returns 0, which is why this mistake slips through. Use `match`."
  - q:
      vi: "Trường `brand` kiểu `keyword` lưu `HueHat`. `{\"match\": {\"brand\": \"HueHat\"}}` có ra kết quả không?"
      en: "The `keyword` field `brand` stores `HueHat`. Does `{\"match\": {\"brand\": \"HueHat\"}}` return hits?"
    options:
      - { vi: "Không, vì `match` chỉ dùng được cho `text`", en: "No, because `match` only works on `text`" }
      - { vi: "Không, vì `match` viết thường thành `huehat`", en: "No, because `match` lower-cases it to `huehat`" }
      - { vi: "Có, `match` dùng cách xử lý của trường `keyword`", en: "Yes, `match` uses the `keyword` field's handling" }
    answer: 2
    trap: 1
    why:
      vi: "`match` không viết thường theo một luật chung; nó dùng đúng cách xử lý của trường. Trường `keyword` không có analyzer, chỉ giữ nguyên chuỗi, nên `match` thành một phép so nguyên văn như `term`, và `HueHat` khớp. `match` dùng được trên mọi kiểu trường."
      en: "`match` does not lower-case by one fixed rule; it uses the field's own handling. A `keyword` field has no analyzer and keeps the string whole, so `match` becomes a literal comparison like `term`, and `HueHat` matches. `match` works on every field type."
---
## Mở bài

Hai truy vấn trông gần giống nhau: `match` và `term`. Đặt nhầm chỗ, cái thứ hai trả 0 kết quả mà không báo lỗi. Bài này cho thấy chúng khác nhau ở một bước: có đi qua analyzer hay không.

## Ý chính

`match` là truy vấn **toàn văn** (full-text): nó lấy analyzer của trường, cắt và viết thường chữ bạn gõ, rồi tìm từng từ. Trên trường `keyword` hay số, nó so nguyên giá trị.

`term` là truy vấn **mức từ** (term-level): nó dùng nguyên văn giá trị bạn đưa, không qua analyzer. Hợp với trường `keyword` (mã, thương hiệu, trạng thái), số và ngày, nơi giá trị lưu đúng như lúc ghi.

Lỗi kinh điển: `term` trên trường `text`. Chỉ mục của trường đó chứa từng từ đã viết thường, nên `term` với chữ hoa, có dấu câu hay nhiều từ đều trượt. Elasticsearch không báo lỗi, chỉ trả 0 kết quả.

Cả hai đều tính điểm BM25. Trên trường `keyword` không có độ dài (norms), nên điểm của `term` chỉ là IDF.

## Cú pháp

```text
{"query": {"match": {
  "<text field>": "<words>"}}}

{"query": {"term": {
  "<keyword field>": "<value>"}}}
```

- Chữ người dùng gõ: `match`.
- Giá trị chính xác (mã, thương hiệu, số): `term` trên `keyword` hay số.

## Ví dụ

`match` viết thường chữ gõ:

```json
GET shop/_search
{"query": {"match": {
  "name": "TRÀ"}}}
```

`term` trên trường `keyword`:

```json
GET shop/_search
{"query": {"term": {
  "brand": "TeaLotus"}}}
```

`term` trên số:

```json
GET shop/_search
{"query": {"term": {
  "price": 250}}}
```

## Lỗi hay gặp

`term` với cả cụm trên trường `text` không ra gì:

```json
// WRONG: term on a text field
GET shop/_search
{"query": {"term": {
  "name": "Nón lá"}}}
```

```json
// FIX: match analyzes the words
GET shop/_search
{"query": {"match": {
  "name": "Nón lá"}}}
```

`term` nhận một giá trị, không nhận một mảng (mảng là việc của `terms`):

```json
// ERROR parsing_exception
GET shop/_search
{"query": {"term": {
  "brand": ["HueHat"]}}}
```

## Thực hành

Ba bước: `match` với chữ hoa, `term` trên `keyword`, rồi `term` trên `text` khi đưa đúng một từ đã lưu.

## Tóm tắt

- `match` đi qua analyzer của trường; `term` dùng nguyên văn.
- `term` cho `keyword`, số và ngày; `match` cho chữ người dùng gõ.
- `term` sai chỗ trả 0 kết quả mà không báo lỗi.
- Trên `keyword`, điểm của `term` chỉ là IDF.

# EN

## Opening

Two queries look almost the same: `match` and `term`. Put the second one in the wrong place and it returns 0 hits without an error. This lesson shows that they differ in one step: whether the text goes through the analyzer.

## Key idea

`match` is a **full-text** query: it takes the field's analyzer, cuts and lower-cases what you type, then looks up each word. On a `keyword` or number field it compares the whole value.

`term` is a **term-level** query: it uses your value literally, without the analyzer. It fits `keyword` fields (codes, brands, statuses), numbers and dates, where the stored value is exactly what was written.

The classic miss: `term` on a `text` field. That field's index holds each lower-case word, so a `term` with capitals, punctuation or several words misses. Elasticsearch raises no error; it just returns 0 hits.

Both compute a BM25 score. A `keyword` field has no length (norms), so a `term` score there is just the IDF.

## Syntax

```text
{"query": {"match": {
  "<text field>": "<words>"}}}

{"query": {"term": {
  "<keyword field>": "<value>"}}}
```

- What users type: `match`.
- An exact value (a code, a brand, a number): `term` on `keyword` or a number.

## Example

`match` lower-cases the typed text:

```json
GET shop/_search
{"query": {"match": {
  "name": "TRÀ"}}}
```

`term` on a `keyword` field:

```json
GET shop/_search
{"query": {"term": {
  "brand": "TeaLotus"}}}
```

`term` on a number:

```json
GET shop/_search
{"query": {"term": {
  "price": 250}}}
```

## Common mistakes

`term` with a whole phrase on a `text` field finds nothing:

```json
// WRONG: term on a text field
GET shop/_search
{"query": {"term": {
  "name": "Nón lá"}}}
```

```json
// FIX: match analyzes the words
GET shop/_search
{"query": {"match": {
  "name": "Nón lá"}}}
```

`term` takes one value, not an array (an array is the job of `terms`):

```json
// ERROR parsing_exception
GET shop/_search
{"query": {"term": {
  "brand": ["HueHat"]}}}
```

## Practice

Three steps: `match` with capitals, `term` on `keyword`, then `term` on `text` when you pass exactly one stored word.

## Recap

- `match` goes through the field's analyzer; `term` is literal.
- `term` is for `keyword`, numbers and dates; `match` is for what users type.
- A misplaced `term` returns 0 hits without an error.
- On `keyword`, a `term` score is just the IDF.
