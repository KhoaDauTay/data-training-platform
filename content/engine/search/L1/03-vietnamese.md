---
id: e-sr-l1-03
engine: search
level: L1
module: index
title: "Tiếng Việt: dấu, không dấu và chữ đ"
title_en: "Vietnamese: accents, no accents and the crossed d"
kind: lab
runtime: browser
minutes: 18
figures: [{ name: sr-vi-folding, at: idea }]
objectives:
  - vi: Khai báo một analyzer có bộ lọc `asciifolding` để `den long` khớp `Đèn lồng`, kể cả chữ `đ`.
    en: Declare an analyzer with the `asciifolding` filter so that `den long` matches `Đèn lồng`, the letter `đ` included.
  - vi: "Thấy cái giá của việc bỏ dấu: `lồng` và `long` thành cùng một từ, nên trà ô long lẫn vào kết quả tìm đèn lồng."
    en: "See the price of removing accents: `lồng` and `long` become the same word, so oolong tea slips into a lamp search."
  - vi: "Giữ thêm một trường con có dấu (multi-field) để tìm chính xác khi khách gõ có dấu."
    en: Keep an extra sub-field with accents (a multi-field) for exact search when the customer types accents.
requires: [e-sr-l1-02]
sources:
  - https://www.elastic.co/docs/reference/text-analysis/analysis-asciifolding-tokenfilter
  - https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/multi-fields
  - https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-match-query
lab:
  setup: |
    {"index": "shop",
     "settings": {"analysis": {"analyzer": {
       "vi_fold": {"tokenizer": "standard",
         "filter": ["lowercase", "asciifolding"]}}}},
     "mappings": {"properties": {
       "name": {"type": "text", "analyzer": "vi_fold",
         "fields": {"exact": {"type": "text"}}},
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
        vi: "Khách gõ không dấu `den long`. Tìm trên trường `name` (lưu bằng analyzer `vi_fold`, đã bỏ dấu). Để ý trà ô long cũng hiện ra."
        en: "A customer types `den long` without accents. Search the `name` field (stored with the `vi_fold` analyzer, accents removed). Notice the oolong tea shows up too."
      solution: |
        GET shop/_search
        {"query": {"match": {
          "name": "den long"}}}
      check: rows
      hint:
        vi: "Một `match` trên `name` với `den long`."
        en: "One `match` on `name` with `den long`."
    - task:
        vi: "Vẫn `den long` trên `name`, nhưng bắt tài liệu phải có cả hai từ (`operator` là `and`), để trà ô long rơi ra."
        en: "Still `den long` on `name`, but require both words (`operator` set to `and`), so the oolong tea drops out."
      solution: |
        GET shop/_search
        {"query": {"match": {"name": {
          "query": "den long",
          "operator": "and"}}}}
      check: rows
      hint:
        vi: "Dạng dài của `match`: `{\"name\": {\"query\": \"den long\", \"operator\": \"and\"}}`."
        en: "The long form of `match`: `{\"name\": {\"query\": \"den long\", \"operator\": \"and\"}}`."
    - task:
        vi: "Khách gõ có dấu `lồng`. Tìm trên trường con `name.exact` (analyzer `standard`, giữ dấu) để chỉ ra đèn lồng, không ra trà."
        en: "A customer types `lồng` with its accent. Search the sub-field `name.exact` (the `standard` analyzer, accents kept) so only lamps come back, no tea."
      solution: |
        GET shop/_search
        {"query": {"match": {
          "name.exact": "lồng"}}}
      check: rows
      hint:
        vi: "Tên trường con viết có dấu chấm: `name.exact`."
        en: "A sub-field is named with a dot: `name.exact`."
    - task:
        vi: "Xem trường `name` lưu `Đà Nẵng` thành những từ nào (`_analyze` với `field`)."
        en: "See which words the `name` field stores `Đà Nẵng` as (`_analyze` with `field`)."
      solution: |
        GET shop/_analyze
        {"field": "name",
         "text": "Đà Nẵng"}
      check: rows
      hint:
        vi: "`{\"field\": \"name\", \"text\": \"Đà Nẵng\"}`."
        en: "`{\"field\": \"name\", \"text\": \"Đà Nẵng\"}`."
quiz:
  - q:
      vi: "Vì sao chỉ chuẩn hóa Unicode (NFD) rồi xóa dấu thì `Đà Nẵng` chưa thành `da nang`?"
      en: "Why does Unicode normalisation (NFD) plus deleting the marks not turn `Đà Nẵng` into `da nang`?"
    options:
      - { vi: "Vì `đ` là một chữ riêng, không phải `d` có dấu", en: "Because `đ` is a letter of its own, not `d` with a mark" }
      - { vi: "Vì NFD chỉ chạy được trên chữ viết thường", en: "Because NFD only works on lower-case letters" }
      - { vi: "Vì dấu thanh và dấu mũ phải bỏ ở hai bước", en: "Because tone marks and hats need two separate passes" }
    answer: 0
    trap: 2
    why:
      vi: "Tiếng Việt có hai lớp dấu (dấu thanh và dấu mũ, móc), nên nghe như phải bỏ hai lần, nhưng NFD tách cả hai thành ký tự dấu kết hợp và xóa được một lần. Chỗ sót là `đ`: Unicode coi nó là một chữ riêng (U+0111), không có dấu nào để tách. Bộ lọc `asciifolding` có luật riêng đổi `đ` thành `d`."
      en: "Vietnamese stacks two kinds of marks (tones and hats or horns), so it sounds as if they need two passes, but NFD splits both into combining marks that one pass deletes. What it misses is `đ`: Unicode treats it as a letter of its own (U+0111), with no mark to split off. The `asciifolding` filter has its own rule turning `đ` into `d`."
  - q:
      vi: "Trường `name` bỏ dấu khi lưu. Khách gõ `lồng`. Có khớp `Trà ô long Đà Lạt` không?"
      en: "The `name` field removes accents when storing. A customer types `lồng`. Does it match `Trà ô long Đà Lạt`?"
    options:
      - { vi: "Không, vì khách đã gõ có dấu", en: "No, because the customer typed the accent" }
      - { vi: "Có, vì chữ gõ cũng bị bỏ dấu thành `long`", en: "Yes, because the typed word is folded to `long` too" }
      - { vi: "Chỉ khớp khi dùng `operator` là `and`", en: "Only when `operator` is set to `and`" }
    answer: 1
    trap: 0
    why:
      vi: "Khách gõ có dấu nên tưởng máy sẽ giữ dấu, nhưng `match` đưa chữ gõ qua analyzer của trường, ở đây là `vi_fold`, nên `lồng` cũng thành `long` và khớp trà ô long. Muốn tôn trọng dấu khách gõ thì tìm thêm trên trường con giữ dấu `name.exact`. `operator` chỉ quyết định cần một hay mọi từ, không đổi việc bỏ dấu."
      en: "The customer typed the accent, so you might expect it to be kept, but `match` runs the typed text through the field's analyzer, here `vi_fold`, so `lồng` also becomes `long` and matches the oolong tea. To respect the typed accents, also search the accent-keeping sub-field `name.exact`. `operator` decides whether one word or every word is needed; it does not change the folding."
---
## Mở bài

Người Việt gõ tìm kiếm thường không dấu: `den long`, `da nang`. Tên hàng trong kho thì có đủ dấu. Bài này dạy máy tìm bỏ dấu cả hai phía, rồi chỉ ra cái giá phải trả.

## Ý chính

Analyzer `standard` giữ nguyên dấu: `Đèn` thành `đèn`, còn khách gõ `den` thì không khớp. Muốn khớp, thêm bộ lọc `asciifolding` sau `lowercase`: nó đổi `đèn` thành `den`, `lồng` thành `long`, và đổi riêng `đ` thành `d` (vì `đ` là một chữ riêng chứ không phải `d` có dấu). Analyzer này dùng cho cả lúc lưu và lúc tìm, nên `Đèn lồng` và `den long` gặp nhau ở `den long`.

Cái giá: bỏ dấu làm nhiều từ khác nghĩa trùng nhau. `lồng` (đèn lồng) và `long` (trà ô long) thành một từ; `lụa` và `lúa` cũng vậy. Kết quả tìm `den long` có cả trà.

Cách hay dùng là lưu một trường hai kiểu (multi-field): `name` bỏ dấu để khách gõ không dấu vẫn thấy, và trường con `name.exact` giữ dấu để tìm chính xác khi khách gõ có dấu. Bài bool sẽ cộng hai trường này lại để tài liệu khớp đúng dấu lên trên.

## Cú pháp

```text
"settings": {"analysis": {
  "analyzer": {"vi_fold": {
    "tokenizer": "standard",
    "filter": ["lowercase",
               "asciifolding"]}}}}
"name": {"type": "text",
  "analyzer": "vi_fold",
  "fields": {"exact": {
    "type": "text"}}}
```

- `filter` chạy theo thứ tự: viết thường trước, rồi bỏ dấu.
- `fields` thêm trường con; tìm nó bằng tên có dấu chấm, `name.exact`.
- `operator: and` bắt mọi từ khách gõ phải có trong tài liệu.

## Ví dụ

Analyzer `vi_fold` của chỉ mục bỏ dấu và đổi `đ`:

```json
GET shop/_analyze
{"analyzer": "vi_fold",
 "text": "Đèn lồng Hội An"}
```

Gõ không dấu vẫn tìm ra trà ô long Đà Lạt:

```json
GET shop/_search
{"query": {"match": {
  "name": "tra o long da lat"}}}
```

Trường con giữ dấu cho kết quả chặt hơn:

```json
GET shop/_search
{"query": {"match": {
  "name.exact": "lụa"}}}
```

## Lỗi hay gặp

Tên bộ lọc viết sai (`ascii_folding` thay vì `asciifolding`) bị từ chối:

```json
// ERROR illegal_argument_exception
GET shop/_analyze
{"tokenizer": "standard",
 "filter": ["ascii_folding"],
 "text": "Đà Nẵng"}
```

Tìm chữ không dấu trên trường giữ dấu: không ra gì.

```json
// WRONG: name.exact keeps accents
GET shop/_search
{"query": {"match": {
  "name.exact": "den long"}}}
```

```json
// FIX: the folded field
GET shop/_search
{"query": {"match": {
  "name": "den long"}}}
```

## Thực hành

Bốn bước: tìm không dấu, siết bằng `and`, tìm có dấu trên trường con, rồi xem `Đà Nẵng` thành từ gì.

## Tóm tắt

- `asciifolding` sau `lowercase` cho `den long` khớp `Đèn lồng`, kể cả chữ `đ`.
- Bỏ dấu làm từ khác nghĩa trùng nhau: `lồng` và `long`, `lụa` và `lúa`.
- Multi-field: một trường bỏ dấu để dễ tìm, một trường con giữ dấu để tìm chính xác.
- Analyzer lúc lưu và lúc tìm phải khớp nhau.

# EN

## Opening

Vietnamese users usually type searches without accents: `den long`, `da nang`. The product names in the shop carry every accent. This lesson teaches the search engine to remove accents on both sides, then shows the price of doing so.

## Key idea

The `standard` analyzer keeps accents: `Đèn` becomes `đèn`, and a customer typing `den` does not match. To match, add the `asciifolding` filter after `lowercase`: it turns `đèn` into `den`, `lồng` into `long`, and has its own rule turning `đ` into `d` (because `đ` is a letter of its own, not `d` with a mark). The analyzer is used both when storing and when searching, so `Đèn lồng` and `den long` meet at `den long`.

The price: removing accents makes different words collide. `lồng` (lantern) and `long` (oolong tea) become one word; so do `lụa` and `lúa` (silk and rice). A search for `den long` now returns tea as well.

The usual answer is to store one field two ways (a multi-field): `name` without accents, so a customer typing without accents still finds things, and a sub-field `name.exact` that keeps accents for exact search when the customer does type them. The bool lesson adds the two fields together so that documents matching the exact accents rank higher.

## Syntax

```text
"settings": {"analysis": {
  "analyzer": {"vi_fold": {
    "tokenizer": "standard",
    "filter": ["lowercase",
               "asciifolding"]}}}}
"name": {"type": "text",
  "analyzer": "vi_fold",
  "fields": {"exact": {
    "type": "text"}}}
```

- `filter` runs in order: lower case first, then accent removal.
- `fields` adds a sub-field; search it by its dotted name, `name.exact`.
- `operator: and` requires every typed word in the document.

## Example

The index's `vi_fold` analyzer removes accents, `đ` included:

```json
GET shop/_analyze
{"analyzer": "vi_fold",
 "text": "Đèn lồng Hội An"}
```

Typing without accents still finds the Da Lat oolong tea:

```json
GET shop/_search
{"query": {"match": {
  "name": "tra o long da lat"}}}
```

The accent-keeping sub-field gives a tighter result:

```json
GET shop/_search
{"query": {"match": {
  "name.exact": "lụa"}}}
```

## Common mistakes

A misspelt filter name (`ascii_folding` instead of `asciifolding`) is refused:

```json
// ERROR illegal_argument_exception
GET shop/_analyze
{"tokenizer": "standard",
 "filter": ["ascii_folding"],
 "text": "Đà Nẵng"}
```

Searching without accents on the accent-keeping field: nothing comes back.

```json
// WRONG: name.exact keeps accents
GET shop/_search
{"query": {"match": {
  "name.exact": "den long"}}}
```

```json
// FIX: the folded field
GET shop/_search
{"query": {"match": {
  "name": "den long"}}}
```

## Practice

Four steps: search without accents, tighten with `and`, search with accents on the sub-field, then see what `Đà Nẵng` becomes.

## Recap

- `asciifolding` after `lowercase` lets `den long` match `Đèn lồng`, the letter `đ` included.
- Removing accents makes different words collide: `lồng` and `long`, `lụa` and `lúa`.
- A multi-field: one field without accents to find things easily, one sub-field with accents for exact search.
- The analyzers at storing time and at search time must agree.
