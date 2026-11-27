---
id: e-sr-l4-02
engine: search
level: L4
module: tuning
title: "Đồng nghĩa: mũ là nón, chè là trà"
title_en: "Synonyms: mũ means nón, chè means trà"
kind: lab
runtime: browser
minutes: 20
figures: [{ name: sr-synonym-position, at: idea }]
objectives:
  - vi: "Khai báo bộ lọc `synonym_graph` trong analyzer lúc tìm (`search_analyzer`) để `mũ` tìm ra `nón` và `chè` tìm ra `trà`."
    en: "Declare a `synonym_graph` filter in the search-time analyzer (`search_analyzer`) so `mũ` finds `nón` and `chè` finds `trà`."
  - vi: "Đọc `_analyze` để thấy hai token đồng nghĩa đứng cùng một vị trí, và giải thích vì sao đồng nghĩa nên đặt lúc tìm chứ không phải lúc lưu."
    en: "Read `_analyze` to see two synonym tokens at the same position, and explain why synonyms belong at search time rather than write time."
requires: [e-sr-l1-02]
sources:
  - https://www.elastic.co/docs/reference/text-analysis/analysis-synonym-graph-tokenfilter
  - https://www.elastic.co/docs/solutions/search/full-text/search-with-synonyms
lab:
  setup: |
    {"index": "shop",
     "settings": {"analysis": {
       "filter": {"vi_syn": {"type": "synonym_graph", "synonyms": ["mũ, nón", "chè, trà"]}},
       "analyzer": {
         "vi_fold": {"tokenizer": "standard", "filter": ["lowercase", "asciifolding"]},
         "vi_search": {"tokenizer": "standard", "filter": ["lowercase", "asciifolding", "vi_syn"]}}}},
     "mappings": {"properties": {
       "name": {"type": "text", "analyzer": "vi_fold", "search_analyzer": "vi_search"},
       "brand": {"type": "keyword"},
       "price": {"type": "integer"}}},
     "docs": [
      {"_id": "1", "name": "Đèn lồng lụa đỏ", "brand": "HoiAnLight", "price": 180},
      {"_id": "2", "name": "Đèn lồng tre nhỏ", "brand": "HoiAnLight", "price": 95},
      {"_id": "3", "name": "Lồng đèn giấy kéo quân", "brand": "SaiGonCraft", "price": 60},
      {"_id": "4", "name": "Nón lá bài thơ Huế", "brand": "HueHat", "price": 120},
      {"_id": "5", "name": "Nón lá trẻ em", "brand": "HueHat", "price": 70},
      {"_id": "6", "name": "Áo dài lụa tơ tằm", "brand": "SilkHouse", "price": 950},
      {"_id": "7", "name": "Khăn lụa tơ tằm đỏ", "brand": "SilkHouse", "price": 320},
      {"_id": "8", "name": "Trà sen Tây Hồ", "brand": "TeaLotus", "price": 250},
      {"_id": "9", "name": "Trà ô long Đà Lạt", "brand": "TeaLotus", "price": 210},
      {"_id": "10", "name": "Cà phê Buôn Ma Thuột", "brand": "BMTCoffee", "price": 150},
      {"_id": "11", "name": "Đèn lồng Hội An đỏ lớn", "brand": "HoiAnLight", "price": 260},
      {"_id": "12", "name": "Tranh lụa phố cổ Hội An", "brand": "SilkHouse", "price": 480}]}
  steps:
    - task:
        vi: "Xem analyzer `vi_search` cắt `Mũ lá` thành những token nào, ở vị trí nào."
        en: "See which tokens, at which positions, the `vi_search` analyzer makes of `Mũ lá`."
      solution: |
        GET shop/_analyze
        {"analyzer": "vi_search",
         "text": "Mũ lá"}
      check: rows
      hint:
        vi: "`_analyze` với `\"analyzer\": \"vi_search\"`."
        en: "`_analyze` with `\"analyzer\": \"vi_search\"`."
    - task:
        vi: "Khách miền Bắc gõ `mũ`. Tìm trên `name` bằng `match`: cửa hàng chỉ ghi `nón`."
        en: "A customer from the North types `mũ`. Search `name` with `match`: the shop only writes `nón`."
      solution: |
        GET shop/_search
        {"query": {"match": {
          "name": "mũ"}}}
      check: rows
      hint:
        vi: "Chỉ cần `match` thường: `search_analyzer` của trường đã có đồng nghĩa."
        en: "A plain `match` is enough: the field's `search_analyzer` already has the synonyms."
    - task:
        vi: "Khách gõ `chè sen`. Mọi từ đều phải khớp (`operator` `and`)."
        en: "A customer types `chè sen`. Every word must match (`operator` `and`)."
      solution: |
        GET shop/_search
        {"query": {"match": {
          "name": {"query": "chè sen",
                   "operator": "and"}}}}
      check: rows
      hint:
        vi: "`{\"query\": \"chè sen\", \"operator\": \"and\"}`: `chè` và `trà` là một vị trí, `sen` là vị trí thứ hai."
        en: "`{\"query\": \"chè sen\", \"operator\": \"and\"}`: `chè` and `trà` are one position, `sen` the second."
quiz:
  - q:
      vi: "Truy vấn `mũ` thành hai token `mu` và `non` ở cùng vị trí 0. Lucene chấm điểm chúng thế nào?"
      en: "The query `mũ` becomes two tokens, `mu` and `non`, both at position 0. How does Lucene score them?"
    options:
      - { vi: "Như hai từ riêng, cộng hai điểm BM25", en: "As two separate words, adding two BM25 scores" }
      - { vi: "Như một từ: df lớn nhất, tf cộng lại", en: "As one word: the largest df, the tfs added" }
      - { vi: "Chỉ chấm từ khách gõ, bỏ từ đồng nghĩa", en: "Only the typed word, ignoring the synonym" }
    answer: 1
    trap: 0
    why:
      vi: "Hai token trông như hai từ, nhưng chúng đứng cùng một vị trí nên `match` gộp chúng thành một truy vấn đồng nghĩa (SynonymQuery). Nó coi cả nhóm là một từ: số tài liệu chứa từ (df) lấy giá trị lớn nhất trong nhóm, còn số lần xuất hiện trong một tài liệu (tf) thì cộng lại. Nhờ vậy tài liệu có `nón` không bị chấm cao hơn chỉ vì `nón` hiếm hơn `mũ`."
      en: "Two tokens look like two words, but they share one position, so `match` turns them into one synonym query (SynonymQuery). It treats the group as one word: the number of documents holding it (df) is the largest in the group, and the occurrences in one document (tf) are added. So a document with `nón` does not score higher just because `nón` is rarer than `mũ`."
  - q:
      vi: "Đội muốn thêm cặp mới `nón, nón lá`. Nên đặt đồng nghĩa ở analyzer lúc lưu hay lúc tìm?"
      en: "The team wants a new pair, `nón, nón lá`. Should the synonyms sit in the write-time analyzer or the search-time one?"
    options:
      - { vi: "Lúc lưu, để chỉ mục nhỏ hơn", en: "Write time, to keep the index smaller" }
      - { vi: "Lúc tìm, đổi danh sách không cần lưu lại", en: "Search time, a list change needs no reindex" }
      - { vi: "Cả hai, cho chắc", en: "Both, to be safe" }
    answer: 1
    trap: 0
    why:
      vi: "Đặt lúc lưu không làm chỉ mục nhỏ hơn: mỗi tài liệu có `nón` sẽ lưu thêm token `mu`, nên chỉ mục còn to ra. Tệ hơn, mỗi lần sửa danh sách đồng nghĩa phải lưu lại (reindex) toàn bộ tài liệu. Đặt trong `search_analyzer` thì chỉ mục giữ nguyên, sửa danh sách là có tác dụng với truy vấn sau. Tài liệu Elasticsearch cũng dành `synonym_graph` cho analyzer lúc tìm, và chỉ nó xử lý đúng đồng nghĩa nhiều từ như `nón lá`."
      en: "Write time does not make the index smaller: every document with `nón` stores an extra `mu` token, so the index grows. Worse, every change to the list means writing all documents again (reindex). In the `search_analyzer` the index stays as it is, and a list change works on the next query. Elasticsearch's docs also reserve `synonym_graph` for search-time analyzers, and only it handles multi-word synonyms such as `nón lá` correctly."
---
## Mở bài

Người miền Bắc gõ `mũ`, người miền Nam gõ `nón`; người Bắc gọi `chè`, cửa hàng ghi `trà`. Chỉ mục chỉ biết đúng chữ đã lưu. Bài này dạy ô tìm kiếm rằng hai từ là một.

## Ý chính

Bộ lọc `synonym_graph` đọc một danh sách quy tắc. `mũ, nón` nghĩa là hai từ tương đương: gặp từ nào cũng phát ra cả hai. `mũ => nón` nghĩa là thay `mũ` bằng `nón`. Quy tắc đi qua các bộ lọc đứng trước nó, nên `mũ` có dấu được viết thường và bỏ dấu thành `mu`, khớp với chữ trong chỉ mục.

Token đồng nghĩa đứng **cùng vị trí** với token gốc: `Mũ lá` thành `mu` (0), `non` (0), `la` (1). Khi `match` thấy nhiều token cùng vị trí, nó tạo một truy vấn đồng nghĩa (SynonymQuery): cả nhóm được chấm như một từ, df là df lớn nhất trong nhóm, tf cộng lại.

Nên đặt đồng nghĩa trong `search_analyzer`: chỉ mục không đổi, sửa danh sách không cần lưu lại tài liệu. Elasticsearch xử lý được đồng nghĩa nhiều từ (`nón lá`) bằng `synonym_graph` lúc tìm; trình mô phỏng của BoonData chỉ nhận đồng nghĩa một từ.

## Cú pháp

```text
"filter": {"vi_syn": {
  "type": "synonym_graph",
  "synonyms": ["mũ, nón",
               "chè => trà"]}}

"name": {"type": "text",
  "analyzer": "vi_fold",
  "search_analyzer": "vi_search"}
```

- `a, b`: tương đương, phát ra cả hai.
- `a => b`: thay `a` bằng `b`.
- Bộ lọc đồng nghĩa đứng sau `lowercase` và `asciifolding`.

## Ví dụ

Hai token cùng vị trí 0:

```json
GET shop/_analyze
{"analyzer": "vi_search",
 "text": "Chè sen"}
```

Gõ `chè`, ra các loại trà:

```json
GET shop/_search
{"query": {"match": {
  "name": "chè"}}}
```

Analyzer lúc lưu không có đồng nghĩa:

```json
GET shop/_analyze
{"analyzer": "vi_fold",
 "text": "Nón lá"}
```

## Lỗi hay gặp

Gọi analyzer lúc lưu khi muốn kiểm tra đồng nghĩa: không thấy token nào thêm.

```json
// WRONG: the write-time analyzer
GET shop/_analyze
{"analyzer": "vi_fold",
 "text": "Mũ lá"}
```

```json
// FIX: the search-time analyzer
GET shop/_analyze
{"analyzer": "vi_search",
 "text": "Mũ lá"}
```

Gọi một analyzer chưa khai báo:

```json
// ERROR illegal_argument_exception
GET shop/_analyze
{"analyzer": "vi_synonym",
 "text": "Mũ lá"}
```

## Thực hành

Ba bước: xem token của `Mũ lá`, tìm `mũ`, rồi tìm `chè sen` với mọi từ bắt buộc.

## Tóm tắt

- `synonym_graph` phát token đồng nghĩa ở cùng vị trí với token gốc.
- `a, b` là tương đương; `a => b` là thay thế.
- Nhiều token cùng vị trí thành một truy vấn đồng nghĩa: df lớn nhất, tf cộng lại.
- Đặt đồng nghĩa trong `search_analyzer`: sửa danh sách không cần lưu lại tài liệu.

# EN

## Opening

Northerners type `mũ` and southerners type `nón`; the North says `chè` while the shop writes `trà`. The index knows only the exact words it stored. This lesson teaches the search box that two words are one.

## Key idea

The `synonym_graph` filter reads a list of rules. `mũ, nón` means two equivalent words: either one emits both. `mũ => nón` means replace `mũ` with `nón`. The rules go through the filters placed before it, so `mũ` with its accent is lower-cased and folded into `mu`, matching the words in the index.

Synonym tokens stand at **the same position** as the original: `Mũ lá` becomes `mu` (0), `non` (0), `la` (1). When `match` sees several tokens at one position, it builds a synonym query (SynonymQuery): the group is scored as one word, its df is the largest df in the group, and the tfs are added.

Synonyms belong in the `search_analyzer`: the index does not change, and editing the list needs no rewrite of the documents. Elasticsearch handles multi-word synonyms (`nón lá`) with `synonym_graph` at search time; BoonData's simulator takes one-word synonyms only.

## Syntax

```text
"filter": {"vi_syn": {
  "type": "synonym_graph",
  "synonyms": ["mũ, nón",
               "chè => trà"]}}

"name": {"type": "text",
  "analyzer": "vi_fold",
  "search_analyzer": "vi_search"}
```

- `a, b`: equivalent, both are emitted.
- `a => b`: replace `a` with `b`.
- The synonym filter comes after `lowercase` and `asciifolding`.

## Example

Two tokens at position 0:

```json
GET shop/_analyze
{"analyzer": "vi_search",
 "text": "Chè sen"}
```

Typing `chè` brings up the teas:

```json
GET shop/_search
{"query": {"match": {
  "name": "chè"}}}
```

The write-time analyzer has no synonyms:

```json
GET shop/_analyze
{"analyzer": "vi_fold",
 "text": "Nón lá"}
```

## Common mistakes

Calling the write-time analyzer to check the synonyms: no extra token appears.

```json
// WRONG: the write-time analyzer
GET shop/_analyze
{"analyzer": "vi_fold",
 "text": "Mũ lá"}
```

```json
// FIX: the search-time analyzer
GET shop/_analyze
{"analyzer": "vi_search",
 "text": "Mũ lá"}
```

Calling an analyzer that was never declared:

```json
// ERROR illegal_argument_exception
GET shop/_analyze
{"analyzer": "vi_synonym",
 "text": "Mũ lá"}
```

## Practice

Three steps: see the tokens of `Mũ lá`, search `mũ`, then search `chè sen` with every word required.

## Recap

- `synonym_graph` emits synonym tokens at the same position as the original.
- `a, b` is equivalent; `a => b` replaces.
- Several tokens at one position become one synonym query: the largest df, the tfs added.
- Synonyms belong in the `search_analyzer`: editing the list needs no rewrite of the documents.
