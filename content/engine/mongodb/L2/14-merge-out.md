---
id: e-mg-l2-14
engine: mongodb
level: L2
module: modeling
title: Lưu kết quả pipeline với $out và $merge
title_en: Saving pipeline results with $out and $merge
kind: quiz
minutes: 8
objectives:
  - vi: Chọn giữa `$out` (thay cả collection) và `$merge` (gộp vào collection có sẵn).
    en: Choose between `$out` (replace a whole collection) and `$merge` (merge into an existing collection).
  - vi: Đặt `whenMatched` và `whenNotMatched` của `$merge` cho một báo cáo cập nhật dần.
    en: Set `whenMatched` and `whenNotMatched` of `$merge` for an incrementally updated report.
requires: [e-mg-l2-06]
sources:
  - https://www.mongodb.com/docs/manual/reference/operator/aggregation/merge/
  - https://www.mongodb.com/docs/manual/reference/operator/aggregation/out/
quiz:
  - q:
      vi: 'Collection `daily_sales` đã có số liệu của 30 ngày. Bạn chạy một pipeline chỉ tính ngày hôm nay rồi kết thúc bằng `{ $out: "daily_sales" }`. Sau đó collection có gì?'
      en: 'Collection `daily_sales` already holds 30 days of figures. You run a pipeline that computes only today and ends with `{ $out: "daily_sales" }`. What does the collection hold afterwards?'
    options:
      - vi: Chỉ số liệu của hôm nay
        en: Only today's figures
      - vi: 31 ngày, hôm nay được thêm vào
        en: 31 days, with today added
      - vi: Lệnh báo lỗi vì collection đã tồn tại
        en: The command fails because the collection exists
    answer: 0
    why:
      vi: '`$out` thay hoàn toàn collection đích nếu nó đã có. Muốn thêm hoặc cập nhật mà giữ dữ liệu cũ thì dùng `$merge`.'
      en: '`$out` completely replaces the target collection if it exists. To add or update while keeping old data, use `$merge`.'
  - q:
      vi: 'Báo cáo theo ngày, `_id` là ngày. Chạy lại cho hôm nay: ngày đã có thì ghi đè cả tài liệu, ngày chưa có thì thêm. Chọn `$merge` nào?'
      en: 'A per-day report with the day as `_id`. Re-running it for today: an existing day is overwritten as a whole, a missing day is inserted. Which `$merge`?'
    options:
      - vi: '`{ $merge: { into: "daily_sales", on: "_id", whenMatched: "replace", whenNotMatched: "insert" } }`'
        en: '`{ $merge: { into: "daily_sales", on: "_id", whenMatched: "replace", whenNotMatched: "insert" } }`'
      - vi: '`{ $merge: { into: "daily_sales", whenMatched: "keepExisting", whenNotMatched: "discard" } }`'
        en: '`{ $merge: { into: "daily_sales", whenMatched: "keepExisting", whenNotMatched: "discard" } }`'
      - vi: '`{ $merge: { into: "daily_sales", whenMatched: "fail" } }`'
        en: '`{ $merge: { into: "daily_sales", whenMatched: "fail" } }`'
    answer: 0
    why:
      vi: '`"replace"` thay tài liệu khớp bằng tài liệu kết quả, `"insert"` thêm tài liệu chưa có. `"keepExisting"` giữ bản cũ, `"discard"` bỏ tài liệu mới, `"fail"` dừng lệnh.'
      en: '`"replace"` swaps the matching document for the result document, `"insert"` adds a missing one. `"keepExisting"` keeps the old one, `"discard"` drops the new one, `"fail"` stops the command.'
  - q:
      vi: Không ghi `whenMatched` và `whenNotMatched` thì `$merge` làm gì?
      en: Without `whenMatched` and `whenNotMatched`, what does `$merge` do?
    options:
      - vi: 'Trộn trường vào tài liệu khớp (`"merge"`) và thêm tài liệu chưa có (`"insert"`)'
        en: 'Merge fields into the matching document (`"merge"`) and insert missing documents (`"insert"`)'
      - vi: Thay cả collection như `$out`
        en: Replace the whole collection like `$out`
      - vi: Báo lỗi vì thiếu tham số
        en: Fail because options are missing
    answer: 0
    why:
      vi: 'Mặc định là `whenMatched: "merge"` (giống `$mergeObjects`: trường mới ghi đè, trường cũ khác vẫn giữ) và `whenNotMatched: "insert"`. `$merge` và `$out` đều phải là stage cuối của pipeline.'
      en: 'The defaults are `whenMatched: "merge"` (like `$mergeObjects`: new fields overwrite, other old fields stay) and `whenNotMatched: "insert"`. Both `$merge` and `$out` must be the last stage of the pipeline.'
---
## Ý chính

`aggregate` thường chỉ trả kết quả về. Hai stage ghi kết quả vào một collection, và cả hai phải đứng cuối pipeline:

- `$out`: ghi kết quả thành collection đích. Collection đã có thì bị thay hoàn toàn;
- `$merge`: gộp kết quả vào collection đích, theo trường `on` (mặc định `_id`):
  - `whenMatched`: `"merge"` (mặc định), `"replace"`, `"keepExisting"`, `"fail"`, hoặc một pipeline update;
  - `whenNotMatched`: `"insert"` (mặc định), `"discard"`, `"fail"`.

`$merge` hợp với báo cáo cập nhật dần (mỗi đêm chỉ tính ngày mới) hay một "materialized view" tự làm. `$out` hợp khi luôn dựng lại toàn bộ.

Bài này là bài đọc: bản chạy trong trình duyệt chỉ cho đọc, mọi lệnh ghi đều bị bỏ sau khi chạy, nên không chạy thử `$out`/`$merge` ở đây.

Làm được: lưu kết quả một báo cáo thành collection và chọn cách gộp đúng khi chạy lại.

## Ví dụ

```js
db.orders.aggregate([
  { $match: { status: { $ne: "cancelled" } } },
  { $group: { _id: "$store", revenue: { $sum: "$total" } } },
  { $merge: { into: "store_revenue", on: "_id", whenMatched: "replace", whenNotMatched: "insert" } }
])
```

## Thực hành

Ba câu hỏi về cách `$out` và `$merge` ghi kết quả.

# EN

## Key idea

`aggregate` usually just returns its result. Two stages write the result into a collection, and both must be the last stage of the pipeline:

- `$out`: writes the result as the target collection. An existing collection is replaced completely;
- `$merge`: merges the result into the target collection, matching on the `on` field (`_id` by default):
  - `whenMatched`: `"merge"` (default), `"replace"`, `"keepExisting"`, `"fail"`, or an update pipeline;
  - `whenNotMatched`: `"insert"` (default), `"discard"`, `"fail"`.

`$merge` suits reports updated incrementally (each night computes only the new day) or a hand-made "materialized view". `$out` suits rebuilding everything every time.

This is a reading lesson: the in-browser runtime discards every write after it runs, so `$out`/`$merge` are not run here.

You can now: save a report's result as a collection and choose the right merge behaviour when it runs again.

## Example

```js
db.orders.aggregate([
  { $match: { status: { $ne: "cancelled" } } },
  { $group: { _id: "$store", revenue: { $sum: "$total" } } },
  { $merge: { into: "store_revenue", on: "_id", whenMatched: "replace", whenNotMatched: "insert" } }
])
```

## Practice

Three questions about how `$out` and `$merge` write results.
