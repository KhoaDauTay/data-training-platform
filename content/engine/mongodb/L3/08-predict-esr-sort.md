---
id: e-mg-l3-08
engine: mongodb
level: L3
module: esr-explain
title: "Đoán kế hoạch: có stage SORT không?"
title_en: "Predict the plan: is there a SORT stage?"
kind: predict
minutes: 6
runtime: docs
objectives:
  - vi: "Đoán kế hoạch có sắp trong bộ nhớ hay lấy thứ tự từ index"
    en: "Predict whether a plan sorts in memory or takes its order from the index"
requires: [e-mg-l3-05]
sources:
  - https://www.mongodb.com/docs/manual/tutorial/equality-sort-range-guideline/
  - https://www.mongodb.com/docs/manual/reference/explain-results/
predict:
  sql: |
    db.movies.createIndex({ directors: 1, runtime: 1, year: 1 })
    db.movies.find(
      { directors: "David Lynch", runtime: { $lt: 130 } },
      { title: 1, year: 1, runtime: 1 }
    ).sort({ year: 1 })
  q:
    vi: "Chỉ có index `{ directors: 1, runtime: 1, year: 1 }` (range đứng trước sort). Kế hoạch thắng có stage `SORT` không?"
    en: "Only the index `{ directors: 1, runtime: 1, year: 1 }` exists (range before sort). Does the winning plan have a `SORT` stage?"
  options:
    - vi: "Không, vì `year` có trong index"
      en: "No, because `year` is in the index"
    - vi: "Có, vì qua nhiều giá trị `runtime`, các `year` không còn theo thứ tự trong index"
      en: "Yes, because across many `runtime` values the `year` keys are no longer in index order"
    - vi: "Không có stage nào, MongoDB quét cả collection"
      en: "No stage at all, MongoDB scans the whole collection"
  answer: 1
  why:
    vi: "Trong khối `directors` cố định, khóa sắp theo `runtime` trước. Đọc một khoảng `runtime` thì `year` nhảy lên xuống, nên MongoDB phải sắp trong bộ nhớ (stage `SORT`). Index ESR `{ directors: 1, year: 1, runtime: 1 }` giữ `year` liền thứ tự nên không cần `SORT`."
    en: "Inside the fixed `directors` block the keys are ordered by `runtime` first. Reading a `runtime` range makes `year` jump up and down, so MongoDB must sort in memory (a `SORT` stage). The ESR index `{ directors: 1, year: 1, runtime: 1 }` keeps `year` in order, so no `SORT` is needed."
---

## Ý chính

Đây là bài đoán theo docs chính thức của MongoDB, không có `mongod` trong trình duyệt. Hai câu trong docs chính thức quyết định đáp án:

- Trang "Explain Results", mục Sort Stage: nếu MongoDB không dùng được index (chỉ mục) để có thứ tự, kết quả có stage `SORT` (sắp trong bộ nhớ); kế hoạch không có `SORT` nghĩa là thứ tự lấy từ index.
- Trang ESR: muốn tránh sắp trong bộ nhớ thì đặt trường khoảng sau trường sắp xếp.

Ngoại lệ là ERS: nếu điều kiện khoảng rất chọn lọc, sắp vài tài liệu trong bộ nhớ có thể rẻ hơn.

## Ví dụ

```javascript
db.movies.createIndex({ directors: 1, year: 1, runtime: 1 })
```

Đúng với docs chính thức của MongoDB hiện hành, kiểm ngày 2026-11-20.

# EN

## Key idea

This is a prediction based on the MongoDB docs; there is no `mongod` in the browser. Two statements in the docs decide the answer:

- Page "Explain Results", section Sort Stage: if MongoDB cannot use an index to get the order, the result has a `SORT` stage (an in-memory sort); a plan without `SORT` got its order from the index.
- The ESR page: to avoid an in-memory sort, place the range field after the sort field.

The exception is ERS: when the range predicate is very selective, sorting a few documents in memory can be cheaper.

## Example

```javascript
db.movies.createIndex({ directors: 1, year: 1, runtime: 1 })
```

Matches the current MongoDB manual, checked 2026-11-20.
