---
id: e-mg-l3-07
engine: mongodb
level: L3
module: esr-explain
title: "Đoán kế hoạch: index kép nào đọc ít khóa hơn?"
title_en: "Predict the plan: which compound index reads fewer keys?"
kind: predict
minutes: 7
runtime: docs
objectives:
  - vi: "So hai index kép bằng totalKeysExamined"
    en: "Compare two compound indexes by totalKeysExamined"
  - vi: "Giải thích vì sao trường so bằng nên đứng trước trường khoảng"
    en: "Explain why the equality field should come before the range field"
requires: [e-mg-l3-06]
sources:
  - https://www.mongodb.com/docs/manual/tutorial/analyze-query-plan/
  - https://www.mongodb.com/docs/manual/tutorial/equality-sort-range-guideline/
predict:
  sql: |
    db.movies.createIndex( { year: 1, rated: 1 } )
    db.movies.createIndex( { rated: 1, year: 1 } )
    db.movies.find(
       { year: { $gte: 2000, $lte: 2005 }, rated: "PG" }
    ).hint( { rated: 1, year: 1 } ).explain("executionStats")
  q:
    vi: "Truy vấn khớp 235 tài liệu. Với `hint` mỗi index một lần, index nào cho `totalKeysExamined` nhỏ hơn?"
    en: "The query matches 235 documents. With `hint` on each index once, which one gives the smaller `totalKeysExamined`?"
  options:
    - vi: "`{ year: 1, rated: 1 }`"
      en: "`{ year: 1, rated: 1 }`"
    - vi: "`{ rated: 1, year: 1 }`"
      en: "`{ rated: 1, year: 1 }`"
    - vi: "Bằng nhau, vì cùng hai trường"
      en: "The same, because both hold the same two fields"
  answer: 1
  trap: 2
  why:
    vi: "Nghe hợp lý vì hai index chứa cùng hai trường, nhưng thứ tự quyết định khóa nào nằm liền nhau. Với `{ rated: 1, year: 1 }`, `rated: \"PG\"` cố định một khối, trong đó các `year` từ 2000 đến 2005 liền nhau: đọc đúng 235 khóa. Với `{ year: 1, rated: 1 }`, khóa PG rải trong sáu khối năm; MongoDB nhảy qua từng khối nên đọc thêm vài khóa ở chỗ chuyển: 246 khóa."
    en: "It sounds right because both indexes hold the same two fields, but the order decides which keys sit together. With `{ rated: 1, year: 1 }`, `rated: \"PG\"` fixes one block, and inside it the `year` values 2000 to 2005 are contiguous: exactly 235 keys. With `{ year: 1, rated: 1 }`, the PG keys sit in six separate year blocks; MongoDB jumps from block to block and reads a few extra keys at each boundary: 246 keys."
  recorded:
    tier: docs
    server: MongoDB
    version: "9.0"
    date: "2026-11-20"
    url: https://www.mongodb.com/docs/manual/tutorial/analyze-query-plan/
    output: |
      hint { year: 1, rated: 1 }:
        totalKeysExamined: 246
        totalDocsExamined: 235
        nReturned: 235
      hint { rated: 1, year: 1 }:
        totalKeysExamined: 235
        totalDocsExamined: 235
        nReturned: 235
quiz:
  - q:
      vi: "Truy vấn mới: `{ rated: \"PG\", year: 2003 }` (cả hai so bằng). Hai index khác nhau thế nào?"
      en: "A new query: `{ rated: \"PG\", year: 2003 }` (both equality). How do the two indexes differ?"
    options:
      - { vi: "Gần như không khác: hai trường bằng cố định một khối liền với cả hai thứ tự", en: "Hardly at all: two equality fields fix one contiguous block in either order" }
      - { vi: "`{ year: 1, rated: 1 }` luôn đọc gấp sáu lần", en: "`{ year: 1, rated: 1 }` always reads six times more" }
      - { vi: "Chỉ `{ rated: 1, year: 1 }` dùng được", en: "Only `{ rated: 1, year: 1 }` can be used" }
    answer: 0
    why:
      vi: "Thứ tự giữa các trường so bằng không đổi vùng quét: cặp `(PG, 2003)` hay `(2003, PG)` đều là một đoạn liền. Khác biệt chỉ xuất hiện khi có trường khoảng hoặc trường sắp."
      en: "The order among equality fields does not change the scanned range: the pair `(PG, 2003)` or `(2003, PG)` is one contiguous run either way. The difference only appears with a range or sort field."
---
## Mở bài

Hai đồng nghiệp tạo hai index trên cùng hai trường, chỉ khác thứ tự. Cả hai đều trả 235 phim đúng. Index nào làm ít việc hơn, và nhìn vào đâu để biết?

## Ý chính

Ví dụ trong docs chính thức của MongoDB (chưa chạy trong trình duyệt): hai kết quả ở thẻ "Theo tài liệu" in trong trang "Interpret Explain Plan Results" (mục Compare Performance of Indexes). Cả hai đều `FETCH` trên `IXSCAN` và trả 235 tài liệu; khác nhau ở số khóa đọc.

- `{ year: 1, rated: 1 }`: `totalKeysExamined` 246.
- `{ rated: 1, year: 1 }`: `totalKeysExamined` 235, bằng đúng số tài liệu trả về.

Nhiều người nghĩ index chứa cùng các trường thì như nhau. Thật ra B-tree sắp theo trường đầu trước, nên trường so bằng đứng trước gom mọi khóa cần vào một khối, còn khoảng đứng trước thì rải chúng ra. Đây chính là phần E đứng trước R của luật ESR; với dữ liệu lớn, khoảng cách 246 so với 235 có thể thành gấp nhiều lần.

## Tóm tắt

- `totalKeysExamined` so với `nReturned` đo index đọc thừa bao nhiêu khóa.
- Cùng trường, khác thứ tự, có thể khác số khóa đọc.
- Trường so bằng trước trường khoảng: khóa cần nằm liền một khối.
- Giữa các trường đều so bằng, thứ tự không đổi vùng quét.

# EN

## Opening

Two colleagues build two indexes on the same two fields, differing only in order. Both return the right 235 movies. Which index does less work, and where do you look to tell?

## Key idea

Example from the official MongoDB docs (not run in the browser): the two results in the "From the docs" card are printed on the page "Interpret Explain Plan Results" (section Compare Performance of Indexes). Both are `FETCH` over `IXSCAN` and return 235 documents; they differ in the number of keys read.

- `{ year: 1, rated: 1 }`: `totalKeysExamined` 246.
- `{ rated: 1, year: 1 }`: `totalKeysExamined` 235, exactly the number of documents returned.

Many people think indexes holding the same fields are equal. In fact a B-tree sorts by the leading field first, so an equality field in front gathers every needed key into one block, while a range in front scatters them. This is the E-before-R part of the ESR rule; on large data the gap of 246 against 235 can become many times larger.

## Recap

- `totalKeysExamined` against `nReturned` measures how many extra keys the index read.
- Same fields in a different order can read a different number of keys.
- Equality field before range field: the needed keys sit in one block.
- Among fields that are all equality, the order does not change the scanned range.
