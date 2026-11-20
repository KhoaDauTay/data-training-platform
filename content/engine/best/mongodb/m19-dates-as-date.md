---
id: e-bp-m19
engine: best
track: mongodb
level: L1
module: m
title: "Ngày giờ lưu kiểu Date, không lưu chuỗi"
title_en: "Store dates as Date, not strings"
kind: quiz
minutes: 3
objectives:
  - vi: "Lưu thời điểm bằng kiểu `Date` của BSON, và đổi chuỗi sang `Date` lúc nạp (`$dateFromString`) thay vì để mỗi truy vấn so chuỗi."
    en: "Store instants as the BSON `Date` type, and convert strings to `Date` on load (`$dateFromString`) instead of comparing strings in every query."
avoid:
  vi: "Báo cáo theo tháng thiếu dòng âm thầm vì `'2026-9-30'` được so như chữ, không như ngày."
  en: "A monthly report silently missing rows because `'2026-9-30'` is compared as text, not as a date."
requires: [e-mg-l1-01]
skills: [date_math, cast]
adv: []
sources:
  - https://www.mongodb.com/docs/manual/reference/bson-type-comparison-order/
  - https://www.mongodb.com/docs/manual/reference/operator/aggregation/datefromstring/
verified: { version: "mingo 7.2.6", date: "2026-11-20" }
pair:
  runtime: mingo
  check: diff
  setup: |
    {"collections": {
      "logins": [
        {"_id": 1, "userId": 1, "at": "2026-9-30"},
        {"_id": 2, "userId": 2, "at": "2026-10-02"},
        {"_id": 3, "userId": 4, "at": "2026-11-01"}
      ],
      "logins_typed": [
        {"_id": 1, "userId": 1, "at": {"$date": "2026-09-30T00:00:00Z"}},
        {"_id": 2, "userId": 2, "at": {"$date": "2026-10-02T00:00:00Z"}},
        {"_id": 3, "userId": 4, "at": {"$date": "2026-11-01T00:00:00Z"}}
      ]
    }}
  bad: |
    db.logins.find({ at: { $gte: '2026-09-01', $lt: '2026-10-01' } }, { _id: 1 })
  good: |
    db.logins_typed.find({ at: { $gte: ISODate('2026-09-01'), $lt: ISODate('2026-10-01') } }, { _id: 1 })
  expect: null
quiz:
  - q:
      vi: "Trường `at` lưu chuỗi `'2026-9-30'`. Truy vấn `{ at: { $gte: '2026-09-01', $lt: '2026-10-01' } }` có trả tài liệu này không?"
      en: "The `at` field holds the string `'2026-9-30'`. Does `{ at: { $gte: '2026-09-01', $lt: '2026-10-01' } }` return this document?"
    options:
      - { vi: "Có, ngày 30/9 nằm trong tháng 9", en: "Yes, 30 September is in September" }
      - { vi: "Không, vì chuỗi so từng ký tự và `'9'` lớn hơn `'1'`", en: "No, because strings compare character by character and `'9'` is greater than `'1'`" }
      - { vi: "Báo lỗi kiểu dữ liệu", en: "It raises a type error" }
    answer: 1
    why:
      vi: "Chuỗi so theo byte: tới ký tự thứ sáu, `'9'` lớn hơn `'1'` của `'2026-10-01'`, nên `'2026-9-30'` rơi ra ngoài khoảng. Không có lỗi nào. Với kiểu `Date`, so sánh theo thời điểm thật."
      en: "Strings compare byte by byte: at the sixth character, `'9'` is greater than the `'1'` of `'2026-10-01'`, so `'2026-9-30'` falls outside the range. No error is raised. With the `Date` type the comparison uses the real instant."
---

## Ý chính

Thời điểm lưu kiểu `Date` (BSON date, UTC). Dữ liệu nguồn là chuỗi thì đổi một lần lúc nạp bằng `$dateFromString`, không để mỗi truy vấn tự so chuỗi.

## Vì sao

- Chuỗi được so theo byte, nên thứ tự chữ không trùng thứ tự ngày khi tháng hay ngày thiếu số 0 ở đầu.
- Toán tử so sánh chỉ so giá trị cùng kiểu BSON. Một trường trộn chuỗi và `Date` làm khoảng thời gian thiếu tài liệu mà không báo lỗi.
- `Date` cho phép dùng toán tử ngày trong pipeline, như `$dateTrunc` hay `$year`.

# EN

## Key idea

Store instants as `Date` (BSON date, UTC). When the source data is a string, convert it once on load with `$dateFromString` instead of comparing strings in every query.

## Why

- Strings compare byte by byte, so text order is not date order when a month or day lacks its leading zero.
- Comparison operators only compare values of the same BSON type. A field that mixes strings and `Date` makes a time range miss documents without any error.
- `Date` lets the pipeline use date operators such as `$dateTrunc` or `$year`.
