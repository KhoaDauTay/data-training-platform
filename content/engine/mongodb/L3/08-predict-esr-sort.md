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
  - vi: "Sửa thứ tự trường của index để bỏ stage SORT"
    en: "Fix an index's field order to remove the SORT stage"
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
  trap: 0
  why:
    vi: "Nghe hợp lý vì `year` có mặt trong index, nhưng có mặt chưa đủ: nó phải nằm liền thứ tự trong vùng quét. Trong khối `directors` cố định, khóa sắp theo `runtime` trước; đọc một khoảng `runtime` thì `year` nhảy lên xuống, nên MongoDB phải sắp trong bộ nhớ (stage `SORT`). Index ESR `{ directors: 1, year: 1, runtime: 1 }` không cần `SORT`."
    en: "It sounds right because `year` is in the index, but being there is not enough: it must be in order across the scanned range. Inside the fixed `directors` block the keys are ordered by `runtime` first; reading a `runtime` range makes `year` jump up and down, so MongoDB must sort in memory (a `SORT` stage). The ESR index `{ directors: 1, year: 1, runtime: 1 }` needs no `SORT`."
  recorded:
    tier: docs
    server: MongoDB
    version: "9.0"
    date: "2026-11-20"
    url: https://www.mongodb.com/docs/manual/tutorial/equality-sort-range-guideline/
quiz:
  - q:
      vi: "Index `{ directors: 1, year: 1, runtime: 1 }`. Truy vấn sắp `.sort({ year: -1 })`. Có cần stage `SORT` không?"
      en: "Index `{ directors: 1, year: 1, runtime: 1 }`. The query sorts with `.sort({ year: -1 })`. Is a `SORT` stage needed?"
    options:
      - { vi: "Có, vì index sắp `year` tăng dần", en: "Yes, because the index sorts `year` ascending" }
      - { vi: "Không, MongoDB đọc index theo chiều ngược trong khối `directors`", en: "No, MongoDB reads the index backwards inside the `directors` block" }
      - { vi: "Không, vì `$lt` tự sắp kết quả", en: "No, because `$lt` sorts the result by itself" }
    answer: 1
    why:
      vi: "Một index đọc được theo cả hai chiều. Với `directors` cố định, sắp theo một trường duy nhất `year` giảm dần chỉ là đọc ngược đoạn đó. Chiều chỉ quan trọng khi sắp theo nhiều trường với chiều khác nhau."
      en: "An index can be read in both directions. With `directors` fixed, sorting on the single field `year` descending is just reading that part backwards. Direction matters only when sorting on several fields with mixed directions."
---
## Mở bài

Index đã chứa đủ ba trường mà truy vấn dùng, kể cả trường sắp xếp `year`. Vậy mà màn hình vẫn chậm khi danh sách dài. Explain có giấu một stage sắp trong bộ nhớ không?

## Ý chính

Đây là bài đoán theo docs chính thức của MongoDB, không có `mongod` trong trình duyệt. Hai câu trong docs quyết định đáp án:

- Trang "Explain Results", mục Sort Stage: nếu MongoDB không dùng được index để có thứ tự, kết quả có stage `SORT` (sắp trong bộ nhớ); kế hoạch không có `SORT` nghĩa là thứ tự lấy từ index.
- Trang ESR: muốn tránh sắp trong bộ nhớ thì đặt trường khoảng sau trường sắp xếp.

Nhiều người nghĩ trường sắp chỉ cần có mặt trong index. Thật ra nó phải đứng ngay sau các trường so bằng, trước mọi trường khoảng. Ngoại lệ là ERS: nếu điều kiện khoảng rất chọn lọc, sắp vài tài liệu trong bộ nhớ có thể rẻ hơn.

## Tóm tắt

- Stage `SORT` trong explain = sắp trong bộ nhớ.
- Trường sắp phải đứng sau trường bằng và trước trường khoảng.
- Index đọc được theo cả hai chiều cho sắp một trường.
- ERS chỉ đáng khi khoảng rất chọn lọc.

# EN

## Opening

The index already holds all three fields the query uses, including the sort field `year`. Yet the screen is slow when the list is long. Is explain hiding an in-memory sort stage?

## Key idea

This is a prediction based on the MongoDB docs; there is no `mongod` in the browser. Two statements in the docs decide the answer:

- Page "Explain Results", section Sort Stage: if MongoDB cannot use an index to get the order, the result has a `SORT` stage (an in-memory sort); a plan without `SORT` got its order from the index.
- The ESR page: to avoid an in-memory sort, place the range field after the sort field.

Many people think the sort field only needs to be in the index. In fact it must come right after the equality fields, before any range field. The exception is ERS: when the range predicate is very selective, sorting a few documents in memory can be cheaper.

## Recap

- A `SORT` stage in explain = an in-memory sort.
- The sort field must come after the equality fields and before the range fields.
- An index can be read in both directions for a single-field sort.
- ERS is worth it only when the range is very selective.
