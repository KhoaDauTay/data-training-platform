---
id: e-mg-l4-05
engine: mongodb
level: L4
module: patterns
title: "Lab: mẫu Outlier cho sản phẩm có quá nhiều đánh giá"
title_en: "Lab: the Outlier pattern for products with too many reviews"
kind: lab
minutes: 14
runtime: browser
viz: mg-pipeline
objectives:
  - vi: "Giữ một số mục đầu trong tài liệu chính và đánh dấu phần tràn"
    en: "Keep the first entries in the main document and flag the overflow"
  - vi: "Tìm tài liệu bất thường bằng điều kiện trên vị trí trong mảng"
    en: "Find the unusual documents with a condition on an array position"
  - vi: "Cắt mảng của một tài liệu bất thường mà vẫn giữ tổng số"
    en: "Trim an unusual document's array while keeping the total count"
requires: [e-mg-l4-01]
sources:
  - https://www.mongodb.com/docs/manual/data-modeling/design-patterns/group-data/outlier-pattern/
  - https://www.mongodb.com/docs/manual/data-modeling/design-patterns/group-data/
  - https://www.mongodb.com/docs/manual/reference/operator/query/size/
lab:
  setup: |
    {"collections": {"products": [
      {"_id": "p1", "name": "Lantern", "reviews": [{"by": "u1", "stars": 5}, {"by": "u2", "stars": 4}]},
      {"_id": "p2", "name": "Kite", "reviews": [{"by": "u1", "stars": 3}, {"by": "u3", "stars": 5}, {"by": "u4", "stars": 4}, {"by": "u5", "stars": 5}, {"by": "u6", "stars": 2}]},
      {"_id": "p3", "name": "Drum", "reviews": []},
      {"_id": "p4", "name": "Fan", "reviews": [{"by": "u2", "stars": 4}, {"by": "u7", "stars": 4}, {"by": "u8", "stars": 1}]}
    ]}}
  steps:
    - task:
        vi: "Mỗi sản phẩm chỉ giữ tối đa 3 đánh giá đầu trong tài liệu chính. Trả `_id`, `name`, `reviewCount` (tổng số đánh giá), `reviews` (3 đánh giá đầu theo thứ tự đang có), `hasOverflow` (đúng khi có hơn 3 đánh giá). Xếp theo `_id` tăng dần."
        en: "Each product keeps at most its first 3 reviews in the main document. Return `_id`, `name`, `reviewCount` (the total number of reviews), `reviews` (the first 3 reviews in their current order), `hasOverflow` (true when there are more than 3 reviews). Order by `_id` ascending."
      solution: |
        db.products.aggregate([
          { $project: {
              name: 1,
              reviewCount: { $size: "$reviews" },
              reviews: { $slice: [ "$reviews", 3 ] },
              hasOverflow: { $gt: [ { $size: "$reviews" }, 3 ] }
          } },
          { $sort: { _id: 1 } }
        ])
      check: doc
      ordered: true
      hint:
        vi: "`$size` đếm phần tử, `$slice` với số 3 lấy 3 phần tử đầu, `$gt` cho cờ."
        en: "`$size` counts elements, `$slice` with 3 takes the first 3 elements, `$gt` gives the flag."
    - task:
        vi: "Tìm các sản phẩm bất thường, có hơn 3 đánh giá. Trả `_id` và `name`. Gợi ý cách nghĩ: mảng có hơn 3 phần tử khi phần tử thứ tư (vị trí 3) tồn tại."
        en: "Find the unusual products, those with more than 3 reviews. Return `_id` and `name`. A way to think about it: an array has more than 3 elements when its fourth element (position 3) exists."
      solution: 'db.products.find({ "reviews.3": { $exists: true } }, { name: 1 })'
      check: doc
      hint:
        vi: "`\"reviews.3\"` trỏ vào phần tử ở vị trí 3 (đếm từ 0); kết hợp với `$exists: true`."
        en: "`\"reviews.3\"` points at the element at position 3 (counting from 0); combine it with `$exists: true`."
    - task:
        vi: "Áp mẫu cho `p2` bằng một `updateOne` dạng pipeline: lưu `reviewCount` (tổng số đánh giá hiện có), cắt `reviews` còn 3 mục đầu, đặt `hasOverflow: true`."
        en: "Apply the pattern to `p2` with one pipeline-style `updateOne`: store `reviewCount` (the current number of reviews), trim `reviews` to its first 3 entries, set `hasOverflow: true`."
      solution: 'db.products.updateOne({ _id: "p2" }, [ { $set: { reviewCount: { $size: "$reviews" }, reviews: { $slice: [ "$reviews", 3 ] }, hasOverflow: true } } ])'
      check: doc
      hint:
        vi: "Trong một stage `$set`, mọi biểu thức đọc tài liệu trước khi đổi, nên `$size` vẫn đếm được 5."
        en: "Inside one `$set` stage every expression reads the document before the change, so `$size` still counts 5."
quiz:
  - q:
      vi: "Chỉ 1 trong 1.000 sản phẩm có hàng nghìn đánh giá. Mẫu Outlier làm gì với 999 sản phẩm còn lại?"
      en: "Only 1 in 1,000 products has thousands of reviews. What does the Outlier pattern do to the other 999?"
    options:
      - { vi: "Chuyển đánh giá của mọi sản phẩm sang collection riêng cho đồng đều", en: "Moves every product's reviews into a separate collection, to keep them uniform" }
      - { vi: "Không đổi gì: chúng giữ dạng nhúng như cũ, chỉ sản phẩm bất thường có cờ và tài liệu tràn", en: "Nothing: they keep the embedded shape, only the unusual product gets a flag and overflow documents" }
      - { vi: "Xóa đánh giá cũ của chúng", en: "Deletes their old reviews" }
    answer: 1
    trap: 0
    why:
      vi: "Một dạng cho mọi tài liệu có vẻ gọn, nhưng thế là bắt 999 sản phẩm trả giá cho một trường hợp hiếm: trang của mỗi sản phẩm phải đọc thêm một collection, trong khi vài đánh giá của chúng vừa vặn nằm nhúng trong tài liệu. Outlier không xóa gì: đánh giá nào cũng được giữ, chỉ phần dư của sản phẩm bất thường chuyển sang tài liệu tràn. 999 sản phẩm thường giữ nguyên dạng nhúng và vẫn chỉ một lần đọc; riêng sản phẩm bất thường có cờ báo cần đọc thêm."
      en: "One shape for every document looks tidy, but then 999 products pay for one rare case: every product page has to read a second collection, while their few reviews fit fine embedded in the document. Outlier deletes nothing: every review is kept, only the unusual product's extra reviews move to overflow documents. The 999 normal products keep the embedded shape and stay a single read; only the unusual product gets a flag saying more must be read."
  - q:
      vi: "`find({ reviews: { $size: 3 } })` trả gì trong lab này?"
      en: "What does `find({ reviews: { $size: 3 } })` return in this lab?"
    options:
      - { vi: "Các sản phẩm có từ 3 đánh giá trở lên", en: "Products with 3 or more reviews" }
      - { vi: "Chỉ sản phẩm có đúng 3 đánh giá, ở đây là `p4`", en: "Only the product with exactly 3 reviews, here `p4`" }
      - { vi: "Báo lỗi vì thiếu `$gt`", en: "An error, because `$gt` is missing" }
    answer: 1
    why:
      vi: "`$size` trong truy vấn chỉ so bằng một số cụ thể, không hiểu là \"từ 3 trở lên\": `p2` có 5 đánh giá nên không khớp, chỉ `p4` có đúng 3 là khớp. Câu này cũng không lỗi: `$size` một mình là bộ lọc hợp lệ, không cần `$gt` đi kèm. Muốn \"hơn 3\" thì hỏi phần tử vị trí 3 có tồn tại không, hoặc dùng `$expr` với `$size` của aggregation."
      en: "`$size` in a query only matches one exact number, it does not mean \"3 or more\": `p2` has 5 reviews so it does not match, only `p4` with exactly 3 does. The query raises no error either: `$size` alone is a valid filter, it needs no `$gt` beside it. For \"more than 3\", ask whether the element at position 3 exists, or use `$expr` with the aggregation `$size`."
---
## Mở bài

Gần như mọi sản phẩm có vài đánh giá, nhưng một món hàng lên mạng xã hội và nhận hàng nghìn đánh giá. Tài liệu của nó phình to, và mỗi lần mở trang sản phẩm đó đều chậm. Có nên đổi thiết kế của mọi sản phẩm chỉ vì một món?

## Ý chính

Mẫu Outlier: thiết kế cho trường hợp thường gặp, và xử lý riêng vài tài liệu bất thường. Tài liệu chính giữ một số mục đầu cùng cờ `hasOverflow` và tổng số `reviewCount`; phần tràn nằm ở tài liệu riêng. Ứng dụng đọc cờ để biết khi nào cần lấy thêm, còn sản phẩm bình thường vẫn chỉ một lần đọc.

Điều này giữ tài liệu dưới giới hạn 16 MiB của BSON, và tránh một mảng không trần làm index multikey phình. Tìm tài liệu bất thường cũng cần chú ý: `$size` trong truy vấn chỉ so bằng một số, không nhận khoảng. Cách quen dùng là hỏi phần tử ở một vị trí có tồn tại không: `"reviews.3": { $exists: true }` nghĩa là có ít nhất 4 phần tử.

Nhiều người nghĩ nên chuyển đánh giá của mọi sản phẩm ra collection riêng cho đồng đều. Thật ra thế là bắt số đông trả giá cho một trường hợp hiếm: mỗi trang sản phẩm phải đọc thêm một collection.

Lab chạy bằng mingo trong trình duyệt; mỗi lần chạy bắt đầu lại từ dữ liệu gốc.

## Cú pháp

```text
{ $size: "$<array>" }                          // aggregation: number of elements
{ $slice: [ "$<array>", <n> ] }                // aggregation: first n elements
db.<coll>.find({ "<array>.<n>": { $exists: true } })   // at least n + 1 elements
db.<coll>.find({ <array>: { $size: <n> } })    // exactly n elements
db.<coll>.updateOne(<filter>, [ { $set: { <array>: { $slice: [ "$<array>", <n> ] }, hasOverflow: true } } ])
```

- `$size` của aggregation đếm phần tử; `$size` của truy vấn chỉ so bằng.
- `"<array>.<n>"` trỏ vào phần tử thứ n (đếm từ 0).
- Update dạng pipeline cắt mảng và đặt cờ trong một lần ghi.

## Ví dụ

Số đánh giá của từng sản phẩm:

```javascript
db.products.aggregate([{ $project: { n: { $size: "$reviews" } } }])
```

`p2` có 5, các sản phẩm khác từ 0 tới 3.

Ba đánh giá đầu của mỗi sản phẩm:

```javascript
db.products.aggregate([{ $project: { top: { $slice: ["$reviews", 3] } } }])
```

Sản phẩm ít hơn 3 đánh giá giữ nguyên mảng; `p3` ra mảng rỗng.

Sản phẩm bất thường, tìm bằng `$expr`:

```javascript
db.products.find({ $expr: { $gt: [{ $size: "$reviews" }, 3] } }, { name: 1 })
```

Chỉ `Kite`. `$expr` tính biểu thức trên từng tài liệu, nên cách này đọc mọi tài liệu.

## Lỗi hay gặp

Dùng `$size` của truy vấn như một khoảng:

```javascript
// WRONG: $size matches exactly 3, not "3 or more"
db.products.find({ reviews: { $size: 3 } }, { name: 1 })
```

```javascript
// FIX: the fourth element exists
db.products.find({ "reviews.3": { $exists: true } }, { name: 1 })
```

Câu sai ra `Fan` (đúng 3 đánh giá) và bỏ sót `Kite`, sản phẩm thật sự bất thường.

Cắt mảng mà mất tổng số:

```javascript
// WRONG: the trimmed array forgets there were 5 reviews
db.products.updateOne({ _id: "p2" }, [{ $set: { reviews: { $slice: ["$reviews", 3] }, hasOverflow: true } }])
```

```javascript
// FIX: store the count before the array shrinks
db.products.updateOne({ _id: "p2" }, [{ $set: { reviewCount: { $size: "$reviews" }, reviews: { $slice: ["$reviews", 3] }, hasOverflow: true } }])
```

Sau câu sai, `p2` chỉ còn mảng 3 mục và không trường nào nhớ con số 5, nên trang sản phẩm đếm được 3 đánh giá. Trong một stage `$set`, `$size` đọc mảng trước khi cắt, nên câu đúng lưu được 5.

## Thực hành

Ba bước: đọc dạng tài liệu chính sau khi áp mẫu, tìm các sản phẩm bất thường, rồi áp mẫu thật cho `p2`.

## Tóm tắt

- Outlier: thiết kế cho số đông, xử lý riêng vài tài liệu bất thường.
- Tài liệu chính giữ vài mục đầu, `reviewCount` và cờ `hasOverflow`.
- `$size` trong truy vấn chỉ so bằng; "hơn n" là `"<array>.<n>": { $exists: true }`.
- Lưu tổng số trước khi cắt mảng, trong cùng một lần ghi.

# EN

## Opening

Nearly every product has a few reviews, but one item goes viral on social media and gets thousands. Its document swells, and every visit to that product page is slow. Should you change the design of every product because of one item?

## Key idea

The Outlier pattern: design for the common case, and handle a few unusual documents separately. The main document keeps its first entries with a `hasOverflow` flag and a `reviewCount` total; the overflow lives in separate documents. The application reads the flag to know when to fetch more, while a normal product is still a single read.

This keeps documents under the 16 MiB BSON limit, and stops an unbounded array from bloating a multikey index. Finding the unusual documents needs care too: `$size` in a query only matches one number and takes no range. The usual way is to ask whether the element at some position exists: `"reviews.3": { $exists: true }` means there are at least 4 elements.

Many people think every product's reviews should move into a separate collection, to keep things uniform. In fact that makes the many pay for one rare case: every product page has to read a second collection.

The lab runs on mingo in the browser; every run starts again from the original data.

## Syntax

```text
{ $size: "$<array>" }                          // aggregation: number of elements
{ $slice: [ "$<array>", <n> ] }                // aggregation: first n elements
db.<coll>.find({ "<array>.<n>": { $exists: true } })   // at least n + 1 elements
db.<coll>.find({ <array>: { $size: <n> } })    // exactly n elements
db.<coll>.updateOne(<filter>, [ { $set: { <array>: { $slice: [ "$<array>", <n> ] }, hasOverflow: true } } ])
```

- The aggregation `$size` counts elements; the query `$size` only matches equality.
- `"<array>.<n>"` points at the nth element (counting from 0).
- A pipeline-style update trims the array and sets the flag in one write.

## Example

Each product's number of reviews:

```javascript
db.products.aggregate([{ $project: { n: { $size: "$reviews" } } }])
```

`p2` has 5, the other products have 0 to 3.

The first three reviews of each product:

```javascript
db.products.aggregate([{ $project: { top: { $slice: ["$reviews", 3] } } }])
```

A product with fewer than 3 reviews keeps its whole array; `p3` gives an empty array.

The unusual products, found with `$expr`:

```javascript
db.products.find({ $expr: { $gt: [{ $size: "$reviews" }, 3] } }, { name: 1 })
```

Only `Kite`. `$expr` evaluates an expression on each document, so this reads every document.

## Common mistakes

Using the query `$size` as a range:

```javascript
// WRONG: $size matches exactly 3, not "3 or more"
db.products.find({ reviews: { $size: 3 } }, { name: 1 })
```

```javascript
// FIX: the fourth element exists
db.products.find({ "reviews.3": { $exists: true } }, { name: 1 })
```

The wrong query gives `Fan` (exactly 3 reviews) and misses `Kite`, the product that really is unusual.

Trimming the array and losing the total:

```javascript
// WRONG: the trimmed array forgets there were 5 reviews
db.products.updateOne({ _id: "p2" }, [{ $set: { reviews: { $slice: ["$reviews", 3] }, hasOverflow: true } }])
```

```javascript
// FIX: store the count before the array shrinks
db.products.updateOne({ _id: "p2" }, [{ $set: { reviewCount: { $size: "$reviews" }, reviews: { $slice: ["$reviews", 3] }, hasOverflow: true } }])
```

After the wrong command `p2` keeps a 3-entry array and no field remembers the number 5, so the product page counts 3 reviews. Inside one `$set` stage, `$size` reads the array before the trim, so the fix stores 5.

## Practice

Three steps: read the main document shape after applying the pattern, find the unusual products, then apply the pattern to `p2` for real.

## Recap

- Outlier: design for the many, handle a few unusual documents separately.
- The main document keeps a few entries, `reviewCount` and a `hasOverflow` flag.
- The query `$size` only matches equality; "more than n" is `"<array>.<n>": { $exists: true }`.
- Store the total before trimming the array, in the same write.
