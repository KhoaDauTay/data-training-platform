---
id: e-sr-l4-03
engine: search
level: L4
module: tuning
title: "Cụm từ có slop: cho phép các từ cách nhau"
title_en: "Phrase slop: letting the words stand apart"
kind: lab
runtime: browser
minutes: 20
figures: [{ name: sr-phrase-slop, at: idea }]
objectives:
  - vi: "Dùng `slop` của `match_phrase` để cụm từ vẫn khớp khi giữa các từ có từ khác, hoặc khi hai từ đổi chỗ."
    en: "Use the `slop` of `match_phrase` so a phrase still matches when other words stand between its words, or when two words swap."
  - vi: "Tính slop cần cho một tài liệu từ vị trí của từ, và giải thích vì sao tài liệu khớp sát hơn được điểm cao hơn."
    en: "Work out the slop a document needs from its word positions, and explain why a closer match scores higher."
requires: [e-sr-l2-04]
sources:
  - https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-match-query-phrase
  - https://lucene.apache.org/core/9_12_0/core/org/apache/lucene/search/PhraseQuery.html
lab:
  setup: |
    {"index": "shop",
     "settings": {"analysis": {"analyzer": {"vi_fold": {"tokenizer": "standard", "filter": ["lowercase", "asciifolding"]}}}},
     "mappings": {"properties": {
       "name": {"type": "text", "analyzer": "vi_fold"},
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
        vi: "Khách gõ `đèn đỏ`. Tìm cụm này trên `name` với `slop` 2: chỉ một sản phẩm."
        en: "A customer types `đèn đỏ`. Search this phrase on `name` with a `slop` of 2: one product only."
      solution: |
        GET shop/_search
        {"query": {"match_phrase": {
          "name": {"query": "đèn đỏ",
                   "slop": 2}}}}
      check: rows
      hint:
        vi: "`{\"query\": \"đèn đỏ\", \"slop\": 2}` trong `match_phrase`."
        en: "`{\"query\": \"đèn đỏ\", \"slop\": 2}` inside `match_phrase`."
    - task:
        vi: "Nới `slop` lên 3: thêm `Đèn lồng Hội An đỏ lớn`, và sản phẩm sát hơn vẫn đứng trên."
        en: "Raise the `slop` to 3: `Đèn lồng Hội An đỏ lớn` joins, and the closer product stays on top."
      solution: |
        GET shop/_search
        {"query": {"match_phrase": {
          "name": {"query": "đèn đỏ",
                   "slop": 3}}}}
      check: rows
      hint:
        vi: "Như bước 1, đổi `slop`."
        en: "Like step 1, with another `slop`."
    - task:
        vi: "Khách gõ ngược `lồng đèn` nhưng muốn cả `đèn lồng`. Tìm cụm `lồng đèn` với `slop` đủ để hai từ đổi chỗ."
        en: "A customer types `lồng đèn` but wants `đèn lồng` too. Search the phrase `lồng đèn` with a `slop` large enough for the two words to swap."
      solution: |
        GET shop/_search
        {"query": {"match_phrase": {
          "name": {"query": "lồng đèn",
                   "slop": 2}}}}
      check: rows
      hint:
        vi: "Đổi chỗ hai từ liền nhau cần `slop` 2."
        en: "Swapping two adjacent words takes a `slop` of 2."
quiz:
  - q:
      vi: "Tên `Đèn lồng lụa đỏ`: `đèn` ở vị trí 0, `đỏ` ở 3. Cụm `đèn đỏ` cần `slop` tối thiểu bao nhiêu?"
      en: "In the name `Đèn lồng lụa đỏ`, `đèn` is at position 0 and `đỏ` at 3. What is the smallest `slop` the phrase `đèn đỏ` needs?"
    options:
      - { vi: "3, bằng vị trí của đỏ", en: "3, the position of đỏ" }
      - { vi: "2, số từ chen giữa", en: "2, the words in between" }
      - { vi: "1, vì chỉ có một khoảng", en: "1, there is one gap only" }
    answer: 1
    trap: 0
    why:
      vi: "3 là vị trí của `đỏ`, chưa phải số bước phải dời. Trong cụm, `đỏ` đứng ngay sau `đèn`, tức là ở vị trí 0 + 1 = 1. Trong tên, nó ở 3, nên phải dời 3 − 1 = 2 vị trí, đúng bằng hai từ chen giữa (`lồng`, `lụa`). Vì vậy `slop` 2 là vừa đủ."
      en: "3 is the position of `đỏ`, not the number of moves. In the phrase, `đỏ` comes right after `đèn`, at position 0 + 1 = 1. In the name it is at 3, so it must move 3 − 1 = 2 positions, exactly the two words in between (`lồng`, `lụa`). So a `slop` of 2 is just enough."
  - q:
      vi: "Với `slop` 3, `Đèn lồng lụa đỏ` (cách 2) và `Đèn lồng Hội An đỏ lớn` (cách 3) đều khớp. Vì sao tài liệu đầu điểm cao hơn?"
      en: "With a `slop` of 3, `Đèn lồng lụa đỏ` (2 apart) and `Đèn lồng Hội An đỏ lớn` (3 apart) both match. Why does the first score higher?"
    options:
      - { vi: "Tf của cụm là 1/(1 + khoảng cách)", en: "The phrase tf is 1/(1 + distance)" }
      - { vi: "Mọi khớp có tf 1, chỉ tên ngắn hơn", en: "Every match has tf 1, the name is just shorter" }
      - { vi: "Slop cộng thêm điểm cho tài liệu đầu", en: "The slop adds points to the first one" }
    answer: 0
    trap: 1
    why:
      vi: "Tên ngắn hơn có góp phần, nhưng không phải lý do chính. Với `slop` lớn hơn 0, Lucene không đếm mỗi lần khớp là 1: nó tính tf = 1 / (1 + khoảng cách). Tài liệu 1 cách 2 nên tf = 1/3, tài liệu 11 cách 3 nên tf = 1/4. Tf lớn hơn cho điểm BM25 lớn hơn, nên khớp sát hơn đứng trên."
      en: "The shorter name helps, but it is not the main reason. With a `slop` above 0, Lucene does not count each match as 1: it uses tf = 1 / (1 + distance). Document 1 is 2 apart, so tf = 1/3; document 11 is 3 apart, so tf = 1/4. A larger tf gives a larger BM25 score, so the closer match ranks higher."
---
## Mở bài

`match_phrase` với `slop` 0 đòi các từ liền nhau. Khách gõ `đèn đỏ` thì không thấy `Đèn lồng lụa đỏ`, vì có hai từ chen giữa. Bài này nới điều kiện đó mà vẫn giữ thứ tự có ý nghĩa.

## Ý chính

`slop` là số bước dời từ tối đa được phép. Lucene so vị trí từng từ trong tài liệu với vị trí của nó trong cụm. Với cụm `đèn đỏ`, `đỏ` phải đứng ở vị trí của `đèn` + 1. Trong `Đèn lồng lụa đỏ`, `đỏ` ở 3 thay vì 1, nên khoảng cách là 2: cần `slop` ít nhất 2. Hai từ liền nhau mà đổi chỗ thì khoảng cách là 2, nên `lồng đèn` với `slop` 2 khớp cả `đèn lồng`.

Khi `slop` lớn hơn 0, mỗi lần khớp không còn đếm là 1. Lucene tính tf = 1 / (1 + khoảng cách): khớp sát thì tf gần 1, khớp xa thì tf nhỏ. Vì vậy sản phẩm có các từ gần nhau hơn được điểm cao hơn, dù cả hai đều khớp.

IDF của cụm vẫn là tổng IDF các từ, như cụm liền nhau. Trình mô phỏng tính khoảng cách theo đúng thuật toán của Lucene, trừ cụm có một từ lặp lại (trường hợp đó bị từ chối).

## Cú pháp

```text
{"query": {"match_phrase": {
  "<field>": {"query": "<words>",
              "slop": 2}}}}
```

- `slop`: số nguyên ≥ 0, mặc định 0.
- Đổi chỗ hai từ liền nhau cần `slop` 2.

## Ví dụ

`slop` 0: chỉ tài liệu 1 có `lụa đỏ` liền nhau:

```json
GET shop/_search
{"query": {"match_phrase": {
  "name": "lụa đỏ"}}}
```

`lụa đỏ` với `slop` 2: thêm `Khăn lụa tơ tằm đỏ`, điểm thấp hơn:

```json
GET shop/_search
{"query": {"match_phrase": {
  "name": {"query": "lụa đỏ",
           "slop": 2}}}}
```

Đổi chỗ: `đèn lồng` với `slop` 2 thêm cả đồ chơi `Lồng đèn`:

```json
GET shop/_search
{"query": {"match_phrase": {
  "name": {"query": "đèn lồng",
           "slop": 2}}}}
```

## Lỗi hay gặp

Nghĩ rằng `slop` 1 đủ cho hai từ đổi chỗ:

```json
// WRONG: slop 1 cannot swap two words
GET shop/_search
{"query": {"match_phrase": {
  "name": {"query": "đèn lồng",
           "slop": 1}}}}
```

```json
// FIX: a swap takes slop 2
GET shop/_search
{"query": {"match_phrase": {
  "name": {"query": "đèn lồng",
           "slop": 2}}}}
```

Dùng `match` có `slop`: `match` không có tham số này.

```json
// ERROR parsing_exception
GET shop/_search
{"query": {"match": {
  "name": {"query": "đèn đỏ",
           "slop": 2}}}}
```

## Thực hành

Ba bước: `đèn đỏ` với `slop` 2, rồi 3, rồi `lồng đèn` đủ để đổi chỗ.

## Tóm tắt

- `slop` là số bước dời từ tối đa so với vị trí trong cụm.
- Đổi chỗ hai từ liền nhau cần `slop` 2.
- Với `slop` > 0, tf = 1 / (1 + khoảng cách): khớp sát điểm cao hơn.
- IDF của cụm vẫn là tổng IDF các từ.

# EN

## Opening

`match_phrase` with a `slop` of 0 needs the words side by side. A customer typing `đèn đỏ` does not find `Đèn lồng lụa đỏ`, because two words stand in between. This lesson loosens that rule while keeping word order meaningful.

## Key idea

`slop` is the largest number of word moves allowed. Lucene compares each word's position in the document with its position in the phrase. In the phrase `đèn đỏ`, `đỏ` must stand at the position of `đèn` + 1. In `Đèn lồng lụa đỏ`, `đỏ` is at 3 instead of 1, so the distance is 2: it needs a `slop` of at least 2. Two adjacent words that swap are 2 apart, so `lồng đèn` with a `slop` of 2 matches `đèn lồng` too.

With a `slop` above 0, a match no longer counts as 1. Lucene uses tf = 1 / (1 + distance): a close match has a tf near 1, a far one a small tf. So the product whose words stand closer scores higher, even though both match.

The phrase's IDF is still the sum of its words' IDFs, as for an adjacent phrase. The simulator measures the distance with Lucene's own algorithm, except for a phrase that repeats a word (that case is refused).

## Syntax

```text
{"query": {"match_phrase": {
  "<field>": {"query": "<words>",
              "slop": 2}}}}
```

- `slop`: a whole number ≥ 0, 0 by default.
- Swapping two adjacent words takes a `slop` of 2.

## Example

`slop` 0: only document 1 has `lụa đỏ` side by side:

```json
GET shop/_search
{"query": {"match_phrase": {
  "name": "lụa đỏ"}}}
```

`lụa đỏ` with a `slop` of 2: `Khăn lụa tơ tằm đỏ` joins, with a lower score:

```json
GET shop/_search
{"query": {"match_phrase": {
  "name": {"query": "lụa đỏ",
           "slop": 2}}}}
```

A swap: `đèn lồng` with a `slop` of 2 brings in the toy `Lồng đèn` as well:

```json
GET shop/_search
{"query": {"match_phrase": {
  "name": {"query": "đèn lồng",
           "slop": 2}}}}
```

## Common mistakes

Thinking a `slop` of 1 is enough for two words to swap:

```json
// WRONG: slop 1 cannot swap two words
GET shop/_search
{"query": {"match_phrase": {
  "name": {"query": "đèn lồng",
           "slop": 1}}}}
```

```json
// FIX: a swap takes slop 2
GET shop/_search
{"query": {"match_phrase": {
  "name": {"query": "đèn lồng",
           "slop": 2}}}}
```

Putting `slop` on `match`: `match` has no such parameter.

```json
// ERROR parsing_exception
GET shop/_search
{"query": {"match": {
  "name": {"query": "đèn đỏ",
           "slop": 2}}}}
```

## Practice

Three steps: `đèn đỏ` with a `slop` of 2, then 3, then `lồng đèn` loose enough to swap.

## Recap

- `slop` is the largest number of word moves from the phrase positions.
- Swapping two adjacent words takes a `slop` of 2.
- With a `slop` > 0, tf = 1 / (1 + distance): a closer match scores higher.
- The phrase's IDF is still the sum of its words' IDFs.
