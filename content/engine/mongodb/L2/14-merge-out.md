---
id: e-mg-l2-14
engine: mongodb
level: L2
module: modeling
title: Lưu kết quả pipeline với $out và $merge
title_en: Saving pipeline results with $out and $merge
kind: quiz
runtime: docs
minutes: 8
objectives:
  - vi: Chọn giữa `$out` (thay cả collection) và `$merge` (gộp vào collection có sẵn).
    en: Choose between `$out` (replace a whole collection) and `$merge` (merge into an existing collection).
  - vi: Đặt `whenMatched` và `whenNotMatched` của `$merge` cho một báo cáo cập nhật dần.
    en: Set `whenMatched` and `whenNotMatched` of `$merge` for an incrementally updated report.
requires: [e-mg-l2-06]
demo_setup: '{"collections": {"orders": [{"_id": 1, "store": "S1", "status": "paid", "total": 95000}, {"_id": 2, "store": "S2", "status": "shipped", "total": 120000}, {"_id": 3, "store": "S1", "status": "cancelled", "total": 150000}, {"_id": 4, "store": "S2", "status": "paid", "total": 210000}], "store_revenue": [{"_id": "S1", "revenue": 1, "manager": "Lan"}, {"_id": "S3", "revenue": 50000, "manager": "Hoa"}]}}'
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
    trap: 1
    why:
      vi: 'Pipeline chỉ tính một ngày nên có vẻ chỉ thêm một ngày, nhưng `$out` không gộp: nó thay hoàn toàn collection đích bằng kết quả, nên 30 ngày cũ mất và chỉ còn hôm nay. Lệnh cũng không báo lỗi khi collection đã tồn tại: thay collection có sẵn chính là cách `$out` làm việc. Muốn thêm hoặc cập nhật mà giữ dữ liệu cũ thì dùng `$merge`.'
      en: 'The pipeline computes only one day, so it seems to add one day, but `$out` does not merge: it replaces the whole target collection with the result, so the 30 old days are gone and only today remains. Nor does the command fail because the collection exists: replacing an existing collection is exactly how `$out` works. To add or update while keeping old data, use `$merge`.'
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
      vi: '`"replace"` thay tài liệu khớp bằng tài liệu kết quả, `"insert"` thêm tài liệu chưa có: đúng hai yêu cầu. Lựa chọn thứ hai làm ngược lại: `"keepExisting"` giữ số cũ của hôm nay nên chạy lại không có tác dụng, còn `"discard"` bỏ tài liệu của ngày chưa có nên hôm nay không bao giờ được thêm. `"fail"` dừng lệnh ngay khi gặp ngày đã có, nên không chạy lại được.'
      en: '`"replace"` swaps the matching document for the result document, `"insert"` adds a missing one: exactly the two requirements. The second option does the opposite: `"keepExisting"` keeps today''s old figure, so a re-run has no effect, and `"discard"` drops the document of a missing day, so today is never added. `"fail"` stops the command as soon as it meets an existing day, so it cannot be re-run.'
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
      vi: 'Hai tham số đều có giá trị mặc định nên không thiếu gì: `whenMatched: "merge"` (giống `$mergeObjects`: trường mới ghi đè, trường cũ khác vẫn giữ) và `whenNotMatched: "insert"`. Vì vậy trong ví dụ của bài, `S1` giữ `manager`, `S2` được thêm và `S3` vẫn còn, khác hẳn `$out` vốn xóa `S3`. `$merge` và `$out` đều phải là stage cuối của pipeline.'
      en: 'Both options have defaults, so nothing is missing: `whenMatched: "merge"` (like `$mergeObjects`: new fields overwrite, other old fields stay) and `whenNotMatched: "insert"`. So in the lesson''s example `S1` keeps `manager`, `S2` is inserted and `S3` stays, unlike `$out`, which removes `S3`. Both `$merge` and `$out` must be the last stage of the pipeline.'
---
## Mở bài

Báo cáo doanh thu theo cửa hàng chạy mỗi đêm, và sáng ra màn hình chỉ đọc kết quả đã lưu. Pipeline phải ghi kết quả vào đâu, và chạy lại thì dữ liệu cũ ra sao?

## Ý chính

`aggregate` thường chỉ trả kết quả về. Hai stage ghi kết quả vào một collection, và cả hai phải đứng cuối pipeline:

- `$out`: ghi kết quả thành collection đích. Collection đã có thì bị thay hoàn toàn;
- `$merge`: gộp kết quả vào collection đích, theo trường `on` (mặc định `_id`):
  - `whenMatched`: `"merge"` (mặc định), `"replace"`, `"keepExisting"`, `"fail"`, hoặc một pipeline update;
  - `whenNotMatched`: `"insert"` (mặc định), `"discard"`, `"fail"`.

`$merge` hợp với báo cáo cập nhật dần (mỗi đêm chỉ tính ngày mới) hay một "materialized view" tự làm. `$out` hợp khi luôn dựng lại toàn bộ.

Trong trình duyệt, mỗi lần chạy bắt đầu lại từ dữ liệu gốc, và kết quả hiện ra là collection đích sau khi ghi. Collection `store_revenue` có sẵn hai tài liệu: `S1` với số cũ và trường `manager`, `S3` không có trong `orders`.

## Ví dụ

`$out` thay cả `store_revenue`: `S3` và trường `manager` mất:

```js
db.orders.aggregate([{ $match: { status: { $ne: "cancelled" } } }, { $group: { _id: "$store", revenue: { $sum: "$total" } } }, { $out: "store_revenue" }])
```

`$merge` mặc định: `S1` được cập nhật `revenue` và giữ `manager`, `S2` được thêm, `S3` vẫn còn:

```js
db.orders.aggregate([{ $match: { status: { $ne: "cancelled" } } }, { $group: { _id: "$store", revenue: { $sum: "$total" } } }, { $merge: { into: "store_revenue" } }])
```

`whenMatched: "replace"` thay cả tài liệu `S1`, nên `manager` mất:

```js
db.orders.aggregate([{ $match: { status: { $ne: "cancelled" } } }, { $group: { _id: "$store", revenue: { $sum: "$total" } } }, { $merge: { into: "store_revenue", on: "_id", whenMatched: "replace", whenNotMatched: "insert" } }])
```

## Tóm tắt

- `$out` và `$merge` ghi kết quả pipeline và phải là stage cuối.
- `$out` thay hoàn toàn collection đích.
- `$merge` gộp theo `on` (mặc định `_id`); mặc định `"merge"` và `"insert"`.
- `"replace"` thay cả tài liệu khớp, `"keepExisting"` giữ bản cũ.

# EN

## Opening

The per-store revenue report runs every night, and in the morning the screen only reads the saved result. Where does the pipeline write its result, and what happens to the old data on a re-run?

## Key idea

`aggregate` usually just returns results. Two stages write the result into a collection, and both must be the last stage of the pipeline:

- `$out`: writes the result as the target collection. An existing collection is replaced completely;
- `$merge`: merges the result into the target collection, by the `on` field (`_id` by default):
  - `whenMatched`: `"merge"` (default), `"replace"`, `"keepExisting"`, `"fail"`, or an update pipeline;
  - `whenNotMatched`: `"insert"` (default), `"discard"`, `"fail"`.

`$merge` suits incrementally updated reports (each night computes only the new day) or a home-made "materialized view". `$out` suits rebuilding everything every time.

In the browser, every run starts again from the original data, and the result shown is the target collection after the write. Collection `store_revenue` already holds two documents: `S1` with an old figure and a `manager` field, and `S3`, which is not in `orders`.

## Example

`$out` replaces all of `store_revenue`: `S3` and the `manager` field are gone:

```js
db.orders.aggregate([{ $match: { status: { $ne: "cancelled" } } }, { $group: { _id: "$store", revenue: { $sum: "$total" } } }, { $out: "store_revenue" }])
```

`$merge` with defaults: `S1` gets the new `revenue` and keeps `manager`, `S2` is inserted, `S3` stays:

```js
db.orders.aggregate([{ $match: { status: { $ne: "cancelled" } } }, { $group: { _id: "$store", revenue: { $sum: "$total" } } }, { $merge: { into: "store_revenue" } }])
```

`whenMatched: "replace"` swaps the whole `S1` document, so `manager` is gone:

```js
db.orders.aggregate([{ $match: { status: { $ne: "cancelled" } } }, { $group: { _id: "$store", revenue: { $sum: "$total" } } }, { $merge: { into: "store_revenue", on: "_id", whenMatched: "replace", whenNotMatched: "insert" } }])
```

## Recap

- `$out` and `$merge` write a pipeline's result and must be the last stage.
- `$out` replaces the target collection completely.
- `$merge` merges by `on` (`_id` by default); the defaults are `"merge"` and `"insert"`.
- `"replace"` swaps the whole matching document, `"keepExisting"` keeps the old one.
