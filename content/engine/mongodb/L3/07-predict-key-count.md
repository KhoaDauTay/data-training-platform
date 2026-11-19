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
  why:
    vi: "Với `{ rated: 1, year: 1 }`, phần `rated: \"PG\"` cố định một khối, trong khối đó các `year` từ 2000 đến 2005 nằm liền nhau: đọc đúng 235 khóa. Với `{ year: 1, rated: 1 }`, MongoDB phải đi qua mọi khóa của các năm 2000 đến 2005 và bỏ những khóa không phải PG: 246 khóa."
    en: "With `{ rated: 1, year: 1 }`, `rated: \"PG\"` fixes one block, and inside it the `year` values 2000 to 2005 are contiguous: exactly 235 keys. With `{ year: 1, rated: 1 }`, MongoDB walks every key of the years 2000 to 2005 and skips the non-PG ones: 246 keys."
---

## Ý chính

Explain từ tài liệu MongoDB: hai kết quả dưới đây in trong trang "Interpret Explain Plan Results" (mục Compare Performance of Indexes), không chạy trong trình duyệt. Cả hai đều `FETCH` trên `IXSCAN` và trả 235 tài liệu; khác nhau ở số khóa đọc.

- `{ year: 1, rated: 1 }`: `totalKeysExamined` 246.
- `{ rated: 1, year: 1 }`: `totalKeysExamined` 235, bằng đúng số tài liệu trả về.

Đây chính là phần E đứng trước R của luật ESR: trường so bằng thu hẹp về một khối, rồi khoảng nằm liền trong khối đó.

## Ví dụ

```javascript
{
  queryPlanner: {
    namespace: 'sample_mflix.movies',
    winningPlan: {
      stage: 'FETCH',
      inputStage: {
        stage: 'IXSCAN',
        keyPattern: {
          rated: 1,
          year: 1
        },
        '...': '...'
      },
      '...': '...'
    },
    '...': '...'
  },
  executionStats: {
    executionSuccess: true,
    nReturned: 235,
    totalKeysExamined: 235,
    totalDocsExamined: 235,
    '...': '...'
  },
  '...': '...'
}
```

Đúng với tài liệu MongoDB hiện hành, kiểm ngày 2026-11-20.

# EN

## Key idea

Explain from the MongoDB docs: the two results below are printed on the page "Interpret Explain Plan Results" (section Compare Performance of Indexes), not run in the browser. Both are `FETCH` over `IXSCAN` and return 235 documents; they differ in the number of keys read.

- `{ year: 1, rated: 1 }`: `totalKeysExamined` 246.
- `{ rated: 1, year: 1 }`: `totalKeysExamined` 235, exactly the number of documents returned.

This is the E-before-R part of the ESR rule: the equality field narrows the scan to one block, then the range is contiguous inside that block.

## Example

```javascript
{
  queryPlanner: {
    namespace: 'sample_mflix.movies',
    winningPlan: {
      stage: 'FETCH',
      inputStage: {
        stage: 'IXSCAN',
        keyPattern: {
          rated: 1,
          year: 1
        },
        '...': '...'
      },
      '...': '...'
    },
    '...': '...'
  },
  executionStats: {
    executionSuccess: true,
    nReturned: 235,
    totalKeysExamined: 235,
    totalDocsExamined: 235,
    '...': '...'
  },
  '...': '...'
}
```

Matches the current MongoDB manual, checked 2026-11-20.
