---
id: e-sr-l1-02
engine: search
level: L1
module: index
title: "Analyzer: chữ thành từ như thế nào"
title_en: "Analyzers: how text becomes words"
kind: lab
runtime: browser
minutes: 15
figures: [{ name: sr-analyzer-chain, at: idea }]
objectives:
  - vi: Kể ba phần của một analyzer (character filter, tokenizer, token filter) và việc của từng phần.
    en: Name the three parts of an analyzer (character filter, tokenizer, token filter) and the job of each.
  - vi: So kết quả của tokenizer `standard`, `whitespace` và `keyword` trên cùng một câu bằng `_analyze`.
    en: Compare the `standard`, `whitespace` and `keyword` tokenizers on the same text with `_analyze`.
  - vi: Biết rằng chữ lưu vào và chữ khách gõ phải đi qua analyzer giống nhau thì mới khớp.
    en: Know that the stored text and the typed text must go through matching analyzers to match.
requires: [e-sr-l1-01]
sources:
  - https://www.elastic.co/docs/manage-data/data-store/text-analysis/anatomy-of-an-analyzer
  - https://www.elastic.co/docs/reference/text-analysis/analysis-standard-tokenizer
  - https://www.elastic.co/docs/reference/text-analysis/analysis-whitespace-tokenizer
  - https://www.elastic.co/docs/reference/text-analysis/analysis-keyword-tokenizer
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
        vi: "Cắt câu `Nón lá, Huế!` bằng tokenizer `whitespace` rồi bộ lọc `lowercase`. Để ý dấu phẩy và dấu chấm than còn dính trong từ."
        en: "Cut the text `Nón lá, Huế!` with the `whitespace` tokenizer, then the `lowercase` filter. Notice the comma and the exclamation mark still stuck to the words."
      solution: |
        GET shop/_analyze
        {"tokenizer": "whitespace",
         "filter": ["lowercase"],
         "text": "Nón lá, Huế!"}
      check: rows
      hint:
        vi: "Thân request có ba khóa: `tokenizer`, `filter` (một mảng) và `text`."
        en: "The body has three keys: `tokenizer`, `filter` (an array) and `text`."
    - task:
        vi: "Cắt cùng câu `Nón lá, Huế!` bằng analyzer `standard`."
        en: "Cut the same text `Nón lá, Huế!` with the `standard` analyzer."
      solution: |
        GET shop/_analyze
        {"analyzer": "standard",
         "text": "Nón lá, Huế!"}
      check: rows
      hint:
        vi: "Dùng khóa `analyzer` thay cho `tokenizer` và `filter`."
        en: "Use the `analyzer` key instead of `tokenizer` and `filter`."
    - task:
        vi: "Cắt câu `Nón lá, Huế!` bằng analyzer `keyword`: cả câu thành đúng một từ."
        en: "Cut `Nón lá, Huế!` with the `keyword` analyzer: the whole text becomes exactly one word."
      solution: |
        GET shop/_analyze
        {"analyzer": "keyword",
         "text": "Nón lá, Huế!"}
      check: rows
      hint:
        vi: "Như bước 2, đổi tên analyzer."
        en: "Like step 2, with another analyzer name."
    - task:
        vi: "Khách gõ `NÓN, lá!` vào ô tìm. Tìm trên trường `name` bằng `match` với đúng chuỗi đó: analyzer `standard` của trường bỏ dấu câu và chữ hoa."
        en: "A customer types `NÓN, lá!` into the search box. Search the `name` field with `match` and that exact string: the field's `standard` analyzer drops the punctuation and the capitals."
      solution: |
        GET shop/_search
        {"query": {"match": {
          "name": "NÓN, lá!"}}}
      check: rows
      hint:
        vi: "Một `match` trên `name` với chuỗi khách gõ."
        en: "One `match` on `name` with the typed string."
quiz:
  - q:
      vi: "Ba phần của một analyzer chạy theo thứ tự nào?"
      en: "In which order do the three parts of an analyzer run?"
    options:
      - { vi: "Token filter, rồi tokenizer, rồi character filter", en: "Token filters, then the tokenizer, then character filters" }
      - { vi: "Tokenizer, rồi character filter, rồi token filter", en: "The tokenizer, then character filters, then token filters" }
      - { vi: "Character filter, rồi tokenizer, rồi token filter", en: "Character filters, then the tokenizer, then token filters" }
    answer: 2
    trap: 1
    why:
      vi: "Tokenizer là phần nổi tiếng nhất nên dễ nghĩ nó chạy trước, nhưng character filter làm việc trên cả chuỗi chữ thô (ví dụ bỏ thẻ HTML), nên phải chạy trước khi chữ bị cắt. Tokenizer cắt chuỗi thành từ (token). Token filter làm việc trên từng từ đã cắt: viết thường, bỏ dấu, tách n-gram."
      en: "The tokenizer is the best-known part, so it is easy to think it runs first, but character filters work on the raw string (for example removing HTML tags), so they must run before the text is cut. The tokenizer cuts the string into words (tokens). Token filters work on each cut word: lower case, accent removal, n-grams."
  - q:
      vi: "Trường `name` được lưu bằng analyzer `keyword`. Khách tìm `match` với `lụa`. Tài liệu `Khăn lụa tơ tằm đỏ` có khớp không?"
      en: "The `name` field is stored with the `keyword` analyzer. A customer runs `match` with `lụa`. Does the document `Khăn lụa tơ tằm đỏ` match?"
    options:
      - { vi: "Có, vì `lụa` nằm trong tên", en: "Yes, because `lụa` is inside the name" }
      - { vi: "Không, vì cả tên là một từ duy nhất", en: "No, because the whole name is one single word" }
      - { vi: "Có, nhưng điểm thấp hơn bình thường", en: "Yes, but with a lower score than usual" }
    answer: 1
    trap: 0
    why:
      vi: "Mắt người thấy `lụa` trong tên, nhưng chỉ mục không lưu tên như mắt người đọc. Analyzer `keyword` giữ nguyên cả chuỗi thành một từ, nên chỉ mục chỉ có từ `Khăn lụa tơ tằm đỏ`. `match` với `lụa` tra từ `lụa` và không thấy. Muốn tìm từng từ trong tên thì trường phải dùng analyzer cắt từ như `standard`."
      en: "A person sees `lụa` in the name, but the index does not store the name the way a person reads it. The `keyword` analyzer keeps the whole string as one word, so the index holds only the word `Khăn lụa tơ tằm đỏ`. `match` with `lụa` looks up the word `lụa` and finds nothing. To find words inside a name, the field needs an analyzer that cuts words, such as `standard`."
---
## Mở bài

Khách gõ `NÓN, lá!` có chữ hoa và dấu câu, còn tên trong kho là `Nón lá bài thơ Huế`. Hai chuỗi khác nhau, vậy mà máy tìm vẫn khớp. Bài này xem bước biến chữ thành từ, gọi là analyzer.

## Ý chính

Analyzer là một dây chuyền ba phần, chạy theo thứ tự:

- **Character filter** sửa chuỗi thô trước khi cắt, ví dụ bỏ thẻ HTML. Có thể không có.
- **Tokenizer** cắt chuỗi thành từ (token) và ghi vị trí của từng từ. Chỉ có đúng một.
- **Token filter** sửa từng từ đã cắt: viết thường (`lowercase`), bỏ dấu (`asciifolding`), tách n-gram. Có thể có nhiều, chạy lần lượt.

Ba tokenizer hay gặp: `standard` cắt theo ranh giới từ của Unicode và bỏ dấu câu; `whitespace` chỉ cắt ở khoảng trắng, nên `lá,` vẫn dính dấu phẩy; `keyword` không cắt gì, cả chuỗi là một từ. Analyzer `standard` là tokenizer `standard` cộng bộ lọc `lowercase`, và là mặc định của mọi trường `text`.

Quy tắc quan trọng nhất: **chữ lưu vào và chữ khách gõ phải đi qua cùng một analyzer** (hoặc hai analyzer khớp nhau). `match` tự làm điều đó, nên `NÓN, lá!` thành `nón` và `lá` rồi mới tra chỉ mục.

## Cú pháp

```text
GET <index>/_analyze
{"analyzer": "standard",
 "text": "<text>"}

GET <index>/_analyze
{"tokenizer": "whitespace",
 "filter": ["lowercase"],
 "text": "<text>"}
```

- `analyzer`: một analyzer có sẵn hay đã khai báo trong chỉ mục.
- `tokenizer` + `filter`: tự ráp một dây chuyền để thử.
- `field`: dùng đúng analyzer của một trường.

## Ví dụ

Analyzer `standard` trên một tên có dấu:

```json
GET shop/_analyze
{"analyzer": "standard",
 "text": "Áo dài lụa tơ tằm"}
```

Tokenizer `whitespace` không bỏ dấu câu:

```json
GET shop/_analyze
{"tokenizer": "whitespace",
 "text": "Trà sen, Tây Hồ."}
```

Analyzer `keyword` giữ cả chuỗi:

```json
GET shop/_analyze
{"analyzer": "keyword",
 "text": "Trà sen Tây Hồ"}
```

## Lỗi hay gặp

Elasticsearch không có analyzer tiếng Việt dựng sẵn; gọi tên không có thì bị từ chối:

```json
// ERROR illegal_argument_exception
GET shop/_analyze
{"analyzer": "vietnamese",
 "text": "Nón lá"}
```

Quên bộ lọc `lowercase`: `Nón` viết hoa sẽ không bao giờ khớp `nón` mà khách gõ.

```json
// WRONG: no lowercase filter
GET shop/_analyze
{"tokenizer": "standard",
 "text": "Nón Lá Huế"}
```

```json
// FIX: lowercase after the tokenizer
GET shop/_analyze
{"tokenizer": "standard",
 "filter": ["lowercase"],
 "text": "Nón Lá Huế"}
```

## Thực hành

Bốn bước: cắt cùng một câu bằng ba cách, rồi tìm bằng chính chuỗi lộn xộn khách gõ.

## Tóm tắt

- Analyzer = character filter, rồi một tokenizer, rồi các token filter.
- `standard` cắt theo ranh giới từ và bỏ dấu câu; `whitespace` chỉ cắt ở khoảng trắng; `keyword` giữ nguyên chuỗi.
- `_analyze` cho thử một analyzer trước khi lưu dữ liệu.
- Chữ lưu vào và chữ khách gõ phải đi qua analyzer khớp nhau.

# EN

## Opening

A customer types `NÓN, lá!` with capitals and punctuation, while the stored name is `Nón lá bài thơ Huế`. The two strings differ, yet the search engine still matches them. This lesson looks at the step that turns text into words: the analyzer.

## Key idea

An analyzer is a three-part chain that runs in order:

- **Character filters** fix the raw string before it is cut, for example by removing HTML tags. There may be none.
- **The tokenizer** cuts the string into words (tokens) and records each word's position. There is exactly one.
- **Token filters** fix each cut word: lower case (`lowercase`), accent removal (`asciifolding`), n-grams. There may be several, run one after another.

Three common tokenizers: `standard` cuts at Unicode word boundaries and drops punctuation; `whitespace` cuts only at spaces, so `lá,` keeps its comma; `keyword` cuts nothing, the whole string is one word. The `standard` analyzer is the `standard` tokenizer plus the `lowercase` filter, and it is the default of every `text` field.

The most important rule: **the stored text and the typed text must go through the same analyzer** (or two analyzers that agree). `match` does this for you, so `NÓN, lá!` becomes `nón` and `lá` before the lookup.

## Syntax

```text
GET <index>/_analyze
{"analyzer": "standard",
 "text": "<text>"}

GET <index>/_analyze
{"tokenizer": "whitespace",
 "filter": ["lowercase"],
 "text": "<text>"}
```

- `analyzer`: a built-in analyzer or one declared in the index.
- `tokenizer` + `filter`: put a chain together to try it.
- `field`: use exactly the analyzer of one field.

## Example

The `standard` analyzer on a name with accents:

```json
GET shop/_analyze
{"analyzer": "standard",
 "text": "Áo dài lụa tơ tằm"}
```

The `whitespace` tokenizer keeps punctuation:

```json
GET shop/_analyze
{"tokenizer": "whitespace",
 "text": "Trà sen, Tây Hồ."}
```

The `keyword` analyzer keeps the whole string:

```json
GET shop/_analyze
{"analyzer": "keyword",
 "text": "Trà sen Tây Hồ"}
```

## Common mistakes

Elasticsearch has no built-in Vietnamese analyzer; a name that does not exist is refused:

```json
// ERROR illegal_argument_exception
GET shop/_analyze
{"analyzer": "vietnamese",
 "text": "Nón lá"}
```

A missing `lowercase` filter: a capital `Nón` will never match the `nón` a customer types.

```json
// WRONG: no lowercase filter
GET shop/_analyze
{"tokenizer": "standard",
 "text": "Nón Lá Huế"}
```

```json
// FIX: lowercase after the tokenizer
GET shop/_analyze
{"tokenizer": "standard",
 "filter": ["lowercase"],
 "text": "Nón Lá Huế"}
```

## Practice

Four steps: cut the same text three ways, then search with the customer's own messy string.

## Recap

- An analyzer = character filters, then one tokenizer, then token filters.
- `standard` cuts at word boundaries and drops punctuation; `whitespace` cuts only at spaces; `keyword` keeps the string whole.
- `_analyze` lets you try an analyzer before storing data.
- The stored text and the typed text must go through analyzers that agree.
