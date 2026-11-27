---
id: e-sr-l1-01
engine: search
level: L1
module: index
title: "Chỉ mục đảo: từ trỏ về tài liệu"
title_en: "The inverted index: words point back to documents"
kind: lab
runtime: browser
minutes: 15
figures: [{ name: sr-inverted-index, at: idea }]
objectives:
  - vi: Giải thích chỉ mục đảo (inverted index) lưu gì cho mỗi từ, và vì sao nhờ nó tìm theo chữ không phải đọc hết mọi tài liệu.
    en: Explain what the inverted index stores for each word, and why it lets a text search skip reading every document.
  - vi: Viết một request `match` trong Query DSL và đọc cột `_id`, `_score` của kết quả.
    en: Write a `match` request in the Query DSL and read the `_id` and `_score` columns of the result.
  - vi: Dùng `_analyze` để xem một câu chữ thành những từ nào trong chỉ mục.
    en: Use `_analyze` to see which words a piece of text becomes in the index.
sources:
  - { url: https://www.elastic.co/docs/manage-data/data-store/index-basics, title_vi: "Kiến thức cơ bản về index" }
  - { url: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-match-query, title_vi: "Truy vấn match" }
  - { url: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-analyze, title_vi: "API _analyze" }
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
        vi: "Tìm các sản phẩm có từ `nón` trong tên (trường `name` của chỉ mục `shop`)."
        en: "Find the products whose name (field `name` of the index `shop`) holds the word `nón`."
      solution: |
        GET shop/_search
        {"query": {"match": {
          "name": "nón"}}}
      check: rows
      hint:
        vi: "`GET shop/_search` rồi thân `{\"query\": {\"match\": {\"name\": \"nón\"}}}`."
        en: "`GET shop/_search` then the body `{\"query\": {\"match\": {\"name\": \"nón\"}}}`."
    - task:
        vi: "Tìm các sản phẩm có từ `lụa` trong tên. Để ý cột `_score`: tên càng ngắn, điểm càng cao."
        en: "Find the products whose name holds the word `lụa`. Watch the `_score` column: the shorter the name, the higher the score."
      solution: |
        GET shop/_search
        {"query": {"match": {
          "name": "lụa"}}}
      check: rows
      hint:
        vi: "Giống bước 1, đổi từ thành `lụa`."
        en: "Like step 1, with the word `lụa`."
    - task:
        vi: "Xem chỉ mục cắt tên `Đèn lồng Hội An đỏ lớn` thành những từ nào: gọi `_analyze` với trường `name`."
        en: "See which words the index cuts the name `Đèn lồng Hội An đỏ lớn` into: call `_analyze` with the field `name`."
      solution: |
        GET shop/_analyze
        {"field": "name",
         "text": "Đèn lồng Hội An đỏ lớn"}
      check: rows
      hint:
        vi: "`GET shop/_analyze` với thân `{\"field\": \"name\", \"text\": \"...\"}`."
        en: "`GET shop/_analyze` with the body `{\"field\": \"name\", \"text\": \"...\"}`."
quiz:
  - q:
      vi: "Chỉ mục đảo lưu gì cho từ `lụa`?"
      en: "What does the inverted index store for the word `lụa`?"
    options:
      - { vi: "Bản sao đầy đủ của mọi tài liệu có từ đó", en: "A full copy of every document holding it" }
      - { vi: "Danh sách tài liệu có từ đó, kèm vị trí", en: "The list of documents holding it, with positions" }
      - { vi: "Chỉ số lần từ đó xuất hiện trong cả chỉ mục", en: "Only how often it appears in the whole index" }
    answer: 1
    trap: 0
    why:
      vi: "Tài liệu gốc được giữ riêng (trường `_source`), không chép vào từng từ. Chỉ mục đảo (inverted index) ghi cho mỗi từ một danh sách tài liệu chứa nó (posting list), kèm vị trí để tìm cụm từ. Vì vậy tìm `lụa` chỉ cần đọc một danh sách: 1, 6, 7, 12. Chỉ một con số tổng thì không cho biết tài liệu nào khớp."
      en: "The original document is kept apart (the `_source` field), never copied into each word. The inverted index keeps, for each word, the list of documents holding it (a posting list), with positions for phrase search. So searching `lụa` reads one list: 1, 6, 7, 12. A single total would not say which documents match."
  - q:
      vi: "Chỉ mục lưu `đèn` (chữ thường). Khách gõ `Đèn` vào `match`. Có ra kết quả không?"
      en: "The index stores `đèn` (lower case). A customer types `Đèn` into `match`. Are there hits?"
    options:
      - { vi: "Không, vì `Đèn` và `đèn` là hai từ khác nhau", en: "No, because `Đèn` and `đèn` are different words" }
      - { vi: "Có, chỉ khi thêm tùy chọn `fuzziness`", en: "Yes, but only with the `fuzziness` option" }
      - { vi: "Có, vì `match` cho chữ gõ qua cùng analyzer", en: "Yes, because `match` runs the text through the same analyzer" }
    answer: 2
    trap: 0
    why:
      vi: "Nếu so nguyên văn thì `Đèn` khác `đèn`, nhưng `match` không so nguyên văn. Nó đưa chữ khách gõ qua đúng analyzer của trường `name` (standard: tách từ rồi viết thường), nên `Đèn` thành `đèn` rồi mới tra chỉ mục. `fuzziness` dành cho lỗi gõ, không cần ở đây."
      en: "Compared literally, `Đèn` differs from `đèn`, but `match` does not compare literally. It runs the typed text through the analyzer of the `name` field (standard: split into words, then lower case), so `Đèn` becomes `đèn` before the lookup. `fuzziness` is for typos and is not needed here."
---
## Mở bài

Chợ Lồng Đèn có 12 mặt hàng và một ô tìm kiếm. Khách gõ `lụa` và muốn thấy ngay khăn, áo dài, tranh lụa, không phải chờ máy đọc từng tên. Bài này mở cái máy tìm ra xem nó lưu gì.

## Ý chính

Một công cụ tìm kiếm như Elasticsearch không đọc lần lượt từng tài liệu (document) khi bạn tìm. Lúc ghi, nó cắt chữ của mỗi tài liệu thành từ (token) bằng một analyzer, rồi ghi vào **chỉ mục đảo** (inverted index): với mỗi từ, danh sách các tài liệu chứa từ đó và vị trí trong tài liệu. Lúc tìm, nó cắt chữ khách gõ theo cùng cách, rồi chỉ đọc danh sách của những từ đó.

Giống mục lục cuối sách: muốn biết trang nào nói về `lụa`, bạn tra chữ `lụa` trong mục lục chứ không lật từng trang. Bảng trong Postgres với index B-tree cũng nhanh, nhưng B-tree sắp theo cả giá trị của cột; chỉ mục đảo sắp theo **từng từ bên trong** chữ.

Mỗi kết quả (hit) có `_id` (tên tài liệu) và `_score`: điểm độ liên quan, cao hơn là hợp hơn. Bài về BM25 giải thích công thức; ở đây chỉ cần biết tên ngắn hơn chứa cùng từ thì điểm cao hơn.

BoonData chạy những request này trên một trình mô phỏng tự viết, không phải Elasticsearch thật; điểm số theo đúng công thức BM25 của Elasticsearch cho dữ liệu bài học.

## Cú pháp

```text
GET <index>/_search
{"query": {"match": {
  "<field>": "<words>"}}}

GET <index>/_analyze
{"field": "<field>",
 "text": "<text>"}
```

- Dòng đầu là đường dẫn như trong Kibana Dev Tools; thân request là JSON.
- `match` cắt chữ gõ thành từ rồi tra chỉ mục.
- `_analyze` cho xem một câu chữ thành những từ nào, ở vị trí nào.

## Ví dụ

Các sản phẩm có từ `đèn`:

```json
GET shop/_search
{"query": {"match": {
  "name": "đèn"}}}
```

Tên `Đèn lồng Hội An` thành từ nào trong chỉ mục:

```json
GET shop/_analyze
{"field": "name",
 "text": "Đèn lồng Hội An"}
```

Hai từ một lúc: tài liệu có cả hai từ được cộng điểm của cả hai, nên lên đầu.

```json
GET shop/_search
{"query": {"match": {
  "name": "trà sen"}}}
```

## Lỗi hay gặp

Gõ sai tên loại truy vấn: máy không đoán, nó báo lỗi phân tích request.

```json
// ERROR parsing_exception
GET shop/_search
{"query": {"mach": {
  "name": "đèn"}}}
```

Sai tên chỉ mục: không có chỉ mục `shops`, chỉ có `shop`.

```json
// ERROR index_not_found_exception
GET shops/_search
{"query": {"match": {
  "name": "đèn"}}}
```

## Thực hành

Ba bước trên chỉ mục `shop`: tìm một từ, đọc điểm, rồi xem analyzer cắt một tên thành từ nào.

## Tóm tắt

- Chỉ mục đảo ghi cho mỗi từ danh sách tài liệu chứa nó, kèm vị trí.
- Lúc ghi và lúc tìm, chữ đi qua cùng một analyzer.
- `match` tìm theo từ; `_score` cho biết độ liên quan.
- `_analyze` cho xem chữ thành những từ nào.

# EN

## Opening

Lantern Market has 12 products and a search box. A customer types `lụa` (silk) and wants the scarf, the long dress and the silk painting at once, without waiting for the machine to read every name. This lesson opens the search engine to see what it stores.

## Key idea

A search engine such as Elasticsearch does not read documents one by one when you search. At write time it cuts each document's text into words (tokens) with an analyzer, then writes them into the **inverted index**: for each word, the list of documents holding it and the positions inside each document. At search time it cuts the typed text the same way and reads only the lists of those words.

It works like the index at the back of a book: to find the pages about `lụa` you look up `lụa` in the index instead of turning every page. A Postgres table with a B-tree index is fast too, but a B-tree sorts a column's whole values; the inverted index sorts **each word inside** the text.

Each result (a hit) has an `_id` (the document's name) and a `_score`: the relevance score, higher is a better fit. The BM25 lesson explains the formula; for now, a shorter name holding the same word scores higher.

BoonData runs these requests on a simulator it wrote itself, not on a real Elasticsearch; the scores follow Elasticsearch's own BM25 formula for the lesson data.

## Syntax

```text
GET <index>/_search
{"query": {"match": {
  "<field>": "<words>"}}}

GET <index>/_analyze
{"field": "<field>",
 "text": "<text>"}
```

- The first line is the path, as in Kibana Dev Tools; the request body is JSON.
- `match` cuts the typed text into words, then looks them up.
- `_analyze` shows which words a piece of text becomes, at which positions.

## Example

The products holding the word `đèn` (lamp):

```json
GET shop/_search
{"query": {"match": {
  "name": "đèn"}}}
```

Which words the name `Đèn lồng Hội An` becomes in the index:

```json
GET shop/_analyze
{"field": "name",
 "text": "Đèn lồng Hội An"}
```

Two words at once: a document holding both gets both scores added, so it comes first.

```json
GET shop/_search
{"query": {"match": {
  "name": "trà sen"}}}
```

## Common mistakes

A misspelt query type: the engine does not guess, it reports a request parsing error.

```json
// ERROR parsing_exception
GET shop/_search
{"query": {"mach": {
  "name": "đèn"}}}
```

A wrong index name: there is no index `shops`, only `shop`.

```json
// ERROR index_not_found_exception
GET shops/_search
{"query": {"match": {
  "name": "đèn"}}}
```

## Practice

Three steps on the index `shop`: search for one word, read the scores, then see which words the analyzer cuts a name into.

## Recap

- The inverted index keeps, for each word, the documents holding it, with positions.
- At write time and at search time, text goes through the same analyzer.
- `match` searches by words; `_score` says how relevant a hit is.
- `_analyze` shows which words a piece of text becomes.
