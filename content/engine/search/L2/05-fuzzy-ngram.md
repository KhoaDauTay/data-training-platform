---
id: e-sr-l2-05
engine: search
level: L2
module: query
title: "Gõ sai và gõ dở: fuzziness và n-gram"
title_en: "Typos and half-typed words: fuzziness and n-grams"
kind: lab
runtime: browser
minutes: 20
figures: [{ name: sr-edge-ngram, at: idea }]
objectives:
  - vi: "Dùng `fuzziness: AUTO` trong `match` để chấp nhận một hai lỗi gõ, và biết số lỗi được phép tăng theo độ dài từ."
    en: "Use `fuzziness: AUTO` in `match` to accept one or two typos, and know the allowed edits grow with the word's length."
  - vi: "Dựng gợi ý khi đang gõ (autocomplete) bằng bộ lọc `edge_ngram` lúc lưu và một analyzer thường lúc tìm."
    en: "Build search-as-you-type (autocomplete) with an `edge_ngram` filter at write time and a plain analyzer at search time."
  - vi: "Biết cái giá của n-gram: chỉ mục lớn hơn nhiều và kết quả rộng hơn."
    en: "Know the price of n-grams: a much bigger index and broader results."
requires: [e-sr-l1-03]
sources:
  - https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-match-query
  - https://www.elastic.co/docs/reference/elasticsearch/rest-apis/common-options
  - https://www.elastic.co/docs/reference/text-analysis/analysis-edgengram-tokenfilter
  - https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/search-analyzer
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
    - task:
        vi: "Khách gõ nhầm `khna` (đảo hai chữ của `khan`). Tìm trên `name` với `fuzziness` là `AUTO` để vẫn ra chiếc khăn. Bước này chấm danh sách tài liệu, không chấm điểm."
        en: "A customer mistypes `khna` (two letters of `khan` swapped). Search `name` with `fuzziness` set to `AUTO` so the scarf still comes back. This step grades the documents, not the scores."
      solution: |
        GET shop/_search
        {"query": {"match": {"name": {
          "query": "khna",
          "fuzziness": "AUTO"}}}}
      check: rows
      hint:
        vi: "Dạng dài của `match`: `{\"name\": {\"query\": \"khna\", \"fuzziness\": \"AUTO\"}}`."
        en: "The long form of `match`: `{\"name\": {\"query\": \"khna\", \"fuzziness\": \"AUTO\"}}`."
    - task:
        vi: "Khách mới gõ `tra` trong ô tìm. Tìm trên trường con `name.ac` (lưu bằng `edge_ngram`) để gợi ý mọi hàng có từ bắt đầu bằng `tra`."
        en: "The customer has typed only `tra` so far. Search the sub-field `name.ac` (stored with `edge_ngram`) to suggest every product with a word starting with `tra`."
      solution: |
        GET shop/_search
        {"query": {"match": {
          "name.ac": "tra"}}}
      check: rows
      hint:
        vi: "Một `match` trên `name.ac`."
        en: "One `match` on `name.ac`."
    - task:
        vi: "Xem trường `name.ac` lưu `Đèn` thành những từ nào (`_analyze` với `field`)."
        en: "See which words the field `name.ac` stores `Đèn` as (`_analyze` with `field`)."
      solution: |
        GET shop/_analyze
        {"field": "name.ac",
         "text": "Đèn"}
      check: rows
      hint:
        vi: "`{\"field\": \"name.ac\", \"text\": \"Đèn\"}`."
        en: "`{\"field\": \"name.ac\", \"text\": \"Đèn\"}`."
quiz:
  - q:
      vi: "Với `fuzziness: AUTO`, từ gõ `non` (3 chữ) được phép sai mấy chữ?"
      en: "With `fuzziness: AUTO`, how many edits may the typed word `non` (3 letters) have?"
    options:
      - { vi: "2, vì AUTO luôn cho tối đa 2", en: "2, because AUTO always allows up to 2" }
      - { vi: "1: từ 3 tới 5 chữ được sai 1", en: "1: words of 3 to 5 letters allow 1" }
      - { vi: "0, vì từ ngắn không được sửa", en: "0, because short words are never fixed" }
    answer: 1
    trap: 0
    why:
      vi: "2 là mức cao nhất Elasticsearch cho phép, nên dễ nghĩ AUTO dùng luôn mức đó. AUTO chia theo độ dài: 1 hoặc 2 chữ thì không được sai, 3 tới 5 chữ được sai 1, từ 6 chữ trở lên được sai 2. Lý do: cho từ 3 chữ sai 2 thì `non` khớp gần như mọi từ 3 chữ trong chỉ mục."
      en: "2 is the most Elasticsearch allows, so it is tempting to think AUTO always uses it. AUTO goes by length: 1 or 2 letters allow no edit, 3 to 5 letters allow 1, 6 letters or more allow 2. The reason: with 2 edits a 3-letter `non` would match almost every 3-letter word in the index."
  - q:
      vi: "Trường `name.ac` lưu bằng `edge_ngram` nhưng tìm bằng `vi_fold`. Nếu tìm cũng bằng `edge_ngram` thì sao?"
      en: "The `name.ac` field is stored with `edge_ngram` but searched with `vi_fold`. What if the search used `edge_ngram` too?"
    options:
      - { vi: "Không đổi gì, hai phía giống nhau là tốt", en: "Nothing changes; matching sides are good" }
      - { vi: "Gõ `tra` sẽ khớp mọi từ bắt đầu bằng `tr`", en: "Typing `tra` would match every word starting with `tr`" }
      - { vi: "Chỉ mục sẽ nhỏ đi một nửa", en: "The index would shrink by half" }
    answer: 1
    trap: 0
    why:
      vi: "Quy tắc thường là hai phía dùng cùng analyzer, nhưng n-gram là ngoại lệ. Nếu chữ gõ cũng bị cắt thành tiền tố, `tra` thành `tr` và `tra`, rồi `tr` khớp cả `tre` và `trẻ`, nên kết quả quá rộng. Vì vậy tiền tố chỉ tạo lúc lưu (`analyzer`), còn lúc tìm dùng analyzer thường (`search_analyzer`). Chỉ mục không đổi kích thước theo cách tìm."
      en: "The usual rule is the same analyzer on both sides, but n-grams are the exception. If the typed text were cut into prefixes too, `tra` would become `tr` and `tra`, and `tr` would match `tre` and `trẻ` as well, so the results get far too broad. That is why prefixes are made only at write time (`analyzer`) while the search uses a plain analyzer (`search_analyzer`). How you search does not change the index's size."
---
## Mở bài

Khách gõ vội: `khna` thay vì `khan`, hay mới gõ được `tra` đã muốn thấy gợi ý. Chỉ mục chỉ khớp những từ có thật, nên cả hai trường hợp đều trượt. Bài này dùng hai công cụ: sửa lỗi gõ khi tìm, và lưu sẵn tiền tố khi ghi.

## Ý chính

**Fuzziness** (tìm gần đúng) cho phép từ gõ khác từ trong chỉ mục vài chữ, đo bằng khoảng cách sửa (edit distance): thêm, bớt, thay một chữ, hay đảo hai chữ cạnh nhau, mỗi việc tính là 1. Với `AUTO`, từ 1 tới 2 chữ không được sai, 3 tới 5 chữ được sai 1, từ 6 chữ được sai 2. Máy tìm mọi từ trong chỉ mục nằm trong khoảng đó rồi tìm theo chúng. Điểm của các từ gần đúng trong Elasticsearch được trộn theo một luật riêng; trình mô phỏng của BoonData không chép luật đó, nên bước có `fuzziness` chỉ chấm danh sách tài liệu.

**N-gram** cắt từ thành các mẩu. `edge_ngram` chỉ lấy tiền tố: `den` thành `de`, `den`. Lưu tiền tố lúc ghi thì khách gõ `de` đã khớp `Đèn`, đó là gợi ý khi đang gõ (autocomplete). Hai điều cần nhớ:

- Tiền tố chỉ tạo **lúc lưu**. Lúc tìm dùng analyzer thường qua `search_analyzer`, nếu không `tra` sẽ bị cắt thành `tr` và khớp quá rộng.
- Mỗi từ sinh ra nhiều mẩu, nên chỉ mục lớn hơn nhiều. Thường đặt n-gram vào một trường con riêng (ở đây `name.ac`) chứ không thay trường chính.

## Cú pháp

```text
{"match": {"name": {
  "query": "khna",
  "fuzziness": "AUTO"}}}

"filter": {"prefixes": {
  "type": "edge_ngram",
  "min_gram": 2, "max_gram": 10}}
"ac": {"type": "text",
  "analyzer": "ac",
  "search_analyzer": "vi_fold"}
```

- `fuzziness`: `AUTO`, `0`, `1` hoặc `2`.
- `min_gram` và `max_gram`: độ dài ngắn nhất và dài nhất của tiền tố.

## Ví dụ

Gõ thừa một chữ vẫn ra hai chiếc nón:

```json
GET shop/_search
{"query": {"match": {"name": {
  "query": "nonn",
  "fuzziness": "AUTO"}}}}
```

Gõ dở `hoi` đã gợi ý hai hàng Hội An:

```json
GET shop/_search
{"query": {"match": {
  "name.ac": "hoi"}}}
```

Các tiền tố lưu cho `lụa`:

```json
GET shop/_analyze
{"field": "name.ac",
 "text": "lụa"}
```

## Lỗi hay gặp

Không có `fuzziness`, một chữ gõ sai là trượt hẳn:

```json
// WRONG: no typo tolerance
GET shop/_search
{"query": {"match": {
  "name": "khna"}}}
```

```json
// FIX: allow edits
GET shop/_search
{"query": {"match": {"name": {
  "query": "khna",
  "fuzziness": "AUTO"}}}}
```

Tên bộ lọc là `edge_ngram` (có gạch dưới) khi khai báo kiểu; gọi một tên không có thì bị từ chối:

```json
// ERROR illegal_argument_exception
GET shop/_analyze
{"tokenizer": "standard",
 "filter": ["edgengram"],
 "text": "Đèn"}
```

## Thực hành

Ba bước: sửa một lỗi gõ, gợi ý khi gõ dở, rồi xem các tiền tố được lưu.

## Tóm tắt

- `fuzziness: AUTO`: 3 tới 5 chữ được sai 1, từ 6 chữ được sai 2.
- `edge_ngram` lưu tiền tố để gợi ý khi đang gõ.
- Tiền tố chỉ tạo lúc lưu; lúc tìm dùng `search_analyzer` thường.
- N-gram làm chỉ mục lớn hơn: đặt nó vào một trường con riêng.

# EN

## Opening

Customers type in a hurry: `khna` instead of `khan` (scarf), or only `tra` before they want suggestions. The index matches only words that exist, so both cases miss. This lesson uses two tools: fixing typos at search time, and storing prefixes at write time.

## Key idea

**Fuzziness** (approximate search) lets a typed word differ from an indexed word by a few letters, measured as an edit distance: adding, removing or replacing one letter, or swapping two neighbouring letters, each counts 1. With `AUTO`, words of 1 to 2 letters allow no edit, 3 to 5 letters allow 1, 6 letters or more allow 2. The engine finds every indexed word within that distance and searches with them. Elasticsearch blends the scores of these near words by its own rule; BoonData's simulator does not copy that rule, so a step with `fuzziness` grades the list of documents only.

**N-grams** cut words into pieces. `edge_ngram` takes the prefixes only: `den` becomes `de`, `den`. Storing prefixes at write time means a customer typing `de` already matches `Đèn`: search-as-you-type (autocomplete). Two things to remember:

- Prefixes are made **at write time** only. The search uses a plain analyzer through `search_analyzer`; otherwise `tra` would be cut into `tr` and match far too much.
- Each word produces many pieces, so the index grows a lot. N-grams usually go into a separate sub-field (here `name.ac`), not into the main field.

## Syntax

```text
{"match": {"name": {
  "query": "khna",
  "fuzziness": "AUTO"}}}

"filter": {"prefixes": {
  "type": "edge_ngram",
  "min_gram": 2, "max_gram": 10}}
"ac": {"type": "text",
  "analyzer": "ac",
  "search_analyzer": "vi_fold"}
```

- `fuzziness`: `AUTO`, `0`, `1` or `2`.
- `min_gram` and `max_gram`: the shortest and longest prefix.

## Example

One extra letter still finds both hats:

```json
GET shop/_search
{"query": {"match": {"name": {
  "query": "nonn",
  "fuzziness": "AUTO"}}}}
```

A half-typed `hoi` already suggests the two Hoi An products:

```json
GET shop/_search
{"query": {"match": {
  "name.ac": "hoi"}}}
```

The prefixes stored for `lụa`:

```json
GET shop/_analyze
{"field": "name.ac",
 "text": "lụa"}
```

## Common mistakes

Without `fuzziness`, one wrong letter misses completely:

```json
// WRONG: no typo tolerance
GET shop/_search
{"query": {"match": {
  "name": "khna"}}}
```

```json
// FIX: allow edits
GET shop/_search
{"query": {"match": {"name": {
  "query": "khna",
  "fuzziness": "AUTO"}}}}
```

The filter type is `edge_ngram` (with an underscore); a name that does not exist is refused:

```json
// ERROR illegal_argument_exception
GET shop/_analyze
{"tokenizer": "standard",
 "filter": ["edgengram"],
 "text": "Đèn"}
```

## Practice

Three steps: fix a typo, suggest while typing, then look at the stored prefixes.

## Recap

- `fuzziness: AUTO`: 3 to 5 letters allow 1 edit, 6 letters or more allow 2.
- `edge_ngram` stores prefixes for search-as-you-type.
- Prefixes are made at write time only; the search uses a plain `search_analyzer`.
- N-grams make the index bigger: put them in a separate sub-field.
