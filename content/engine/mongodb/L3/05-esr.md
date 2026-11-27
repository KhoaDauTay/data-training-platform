---
id: e-mg-l3-05
engine: mongodb
level: L3
module: esr-explain
title: "Index kép và luật ESR"
title_en: "Compound indexes and the ESR rule"
kind: concept
minutes: 12
runtime: browser
viz: mg-esr
objectives:
  - vi: "Giải thích vì sao thứ tự trường trong index kép quyết định vùng quét"
    en: "Explain why field order in a compound index decides the scanned range"
  - vi: "Xếp trường theo Equality, Sort, Range và biết khi nào đổi sang ERS"
    en: "Order fields as Equality, Sort, Range and know when to switch to ERS"
  - vi: "Nhận ra toán tử nào là range: $ne, $nin, $regex, $in với mảng lớn"
    en: "Recognise which operators act as a range: $ne, $nin, $regex, $in with a large array"
requires: [e-mg-l3-01]
lab:
  setup: |
    {"collections": {"movies": [
      {"_id": 1, "title": "Blue Velvet", "directors": ["David Lynch"], "year": 1986, "runtime": 120},
      {"_id": 2, "title": "Dune", "directors": ["David Lynch"], "year": 1984, "runtime": 137},
      {"_id": 3, "title": "Mulholland Drive", "directors": ["David Lynch"], "year": 2001, "runtime": 147},
      {"_id": 4, "title": "Fargo", "directors": ["Joel Coen", "Ethan Coen"], "year": 1996, "runtime": 98}
    ]}}
  steps:
    - name: { vi: "Index theo ESR", en: "An ESR index" }
      task:
        vi: "Cửa hàng phim chạy truy vấn `db.movies.find({ directors: \"Joel Coen\", year: { $gte: 1990 } }).sort({ title: 1 })`. Viết một `createIndex` theo ESR cho nó."
        en: "The film shop runs the query `db.movies.find({ directors: \"Joel Coen\", year: { $gte: 1990 } }).sort({ title: 1 })`. Write one `createIndex` for it that follows ESR."
      solution: 'db.movies.createIndex({ directors: 1, title: 1, year: 1 })'
      check: doc
      rule: esr
      target: 'db.movies.find({ directors: "Joel Coen", year: { $gte: 1990 } }).sort({ title: 1 })'
      slow: 'db.movies.createIndex({ directors: 1, year: 1, title: 1 })'
      hint:
        vi: "`directors` so bằng, `title` là trường sắp, `year` là khoảng (`$gte`)."
        en: "`directors` is an equality, `title` is the sort field, `year` is a range (`$gte`)."
      fact:
        vi: "Bước này chấm theo luật ESR (Equality, Sort, Range: trường so bằng, rồi trường sắp xếp, rồi trường so khoảng) trong docs chính thức, chỉ xét thứ tự trường của index, không đo trên `mongod`: mingo không có index."
        en: "This step is graded by the ESR rule in the official docs (Equality, Sort, Range: equality fields, then sort fields, then range fields), checking only the index's field order, not measured on `mongod`: mingo has no indexes."
sources:
  - { url: https://www.mongodb.com/docs/manual/tutorial/equality-sort-range-guideline/, title_vi: "Quy tắc ESR (so bằng, sắp xếp, khoảng)" }
  - { url: https://www.mongodb.com/docs/manual/reference/explain-results/, title_vi: "Đọc kết quả explain" }
  - { url: https://www.mongodb.com/docs/manual/indexes/, title_vi: "Index" }
quiz:
  - q:
      vi: "Truy vấn `find({ status: \"A\", qty: { $gt: 10 } }).sort({ day: 1 })`. Index nào theo đúng ESR?"
      en: "Query `find({ status: \"A\", qty: { $gt: 10 } }).sort({ day: 1 })`. Which index follows ESR?"
    options:
      - { vi: "`{ status: 1, qty: 1, day: 1 }`", en: "`{ status: 1, qty: 1, day: 1 }`" }
      - { vi: "`{ status: 1, day: 1, qty: 1 }`", en: "`{ status: 1, day: 1, qty: 1 }`" }
      - { vi: "`{ day: 1, qty: 1, status: 1 }`", en: "`{ day: 1, qty: 1, status: 1 }`" }
    answer: 1
    trap: 0
    why:
      vi: "`status`, `qty`, `day` là thứ tự các trường trong câu lệnh, nhưng luật ESR (Equality, Sort, Range: trường so bằng, rồi trường sắp xếp, rồi trường so khoảng) xếp theo vai trò: `status` so bằng nên đầu, `day` là trường sắp xếp nên thứ hai, `qty` là khoảng nên cuối. Đặt `qty` trước `day` thì trong khối `status` A các khóa xếp theo `qty`, không theo `day`, nên MongoDB phải sắp lại trong bộ nhớ (stage `SORT`). Đặt `day` đầu tiên thì có sẵn thứ tự nhưng phải quét cả tài liệu có `status` khác A."
      en: "`status`, `qty`, `day` is the order the fields appear in the command, but the ESR rule (Equality, Sort, Range: equality fields, then sort fields, then range fields) orders by role: `status` is equality so it comes first, `day` is the sort field so it is second, `qty` is a range so it is last. With `qty` before `day`, the keys inside the `status` A block are ordered by `qty`, not `day`, so MongoDB must sort again in memory (a `SORT` stage). With `day` first the order is there, but the scan also walks documents whose `status` is not A."
  - q:
      vi: "Trong luật ESR, `$ne` được tính là gì?"
      en: "Under ESR, what does `$ne` count as?"
    options:
      - { vi: "Equality", en: "Equality" }
      - { vi: "Range", en: "Range" }
      - { vi: "Sort", en: "Sort" }
    answer: 1
    trap: 0
    why:
      vi: "Equality nghe hợp lý vì `$ne` nhắc một giá trị cố định, nhưng nó chọn mọi giá trị trừ một, tức hai khoảng trong index (nhỏ hơn và lớn hơn giá trị đó). Vì vậy trong luật ESR (Equality, Sort, Range: trường so bằng, rồi trường sắp xếp, rồi trường so khoảng), docs chính thức xếp `$ne` cùng `$nin` vào Range; `$regex` cũng là range. Sort chỉ dành cho trường trong `.sort()`, còn `$ne` là điều kiện lọc."
      en: "Equality sounds right because `$ne` names one fixed value, but it selects every value but one, which is two ranges in the index (below and above that value). So under the ESR rule (Equality, Sort, Range: equality fields, then sort fields, then range fields), the docs put `$ne` with `$nin` under Range; `$regex` is a range too. Sort is only for fields in `.sort()`, while `$ne` is a filter condition."
---
## Mở bài

Cửa hàng phim có màn hình "phim của một đạo diễn, ngắn hơn 130 phút, theo năm". Bạn tạo index trên đúng ba trường đó mà truy vấn vẫn phải sắp trong bộ nhớ. Thứ tự ba trường mới là điều quyết định.

## Ý chính

Index MongoDB là B-tree. Index kép `{ a: 1, b: 1, c: 1 }` sắp khóa theo `a`, trong cùng `a` thì theo `b`, rồi theo `c`, như danh bạ xếp theo họ rồi tên. Truy vấn chỉ quét được một đoạn liền của index khi các trường đứng trước đã bị cố định bằng phép so bằng.

Docs chính thức khuyên xếp theo ESR: Equality (so bằng) trước, Sort (trường sắp xếp) sau, Range (khoảng) cuối. Trong một khối bằng, khóa đã có sẵn thứ tự nên MongoDB đọc theo index mà không sắp lại. Nếu range đứng trước sort, thứ tự sort vỡ qua các giá trị range và explain có stage `SORT`. Khi khoảng rất chọn lọc, ERS (range trước sort) có thể rẻ hơn vì chỉ còn vài tài liệu phải sắp.

Nhiều người nghĩ `$ne` là so bằng vì nó nhắc một giá trị. Thật ra `$ne`, `$nin`, `$regex` là range. `$in` một mình như nhiều phép bằng; đi với `.sort()`, mảng dưới 201 phần tử được tách thành phép bằng rồi trộn (`SORT_MERGE`), từ 201 trở lên thì như range, và docs nói ngưỡng này có thể đổi.

Ví dụ chạy bằng mingo; mingo không có index nên `createIndex` chỉ trả danh sách index, không đo kế hoạch.

## Cú pháp

```text
db.<coll>.createIndex({ <equality fields>: 1, <sort fields>: 1 | -1, <range fields>: 1 })
```

- Equality: `{ f: v }`, `$eq`, `$in` với mảng nhỏ.
- Sort: các trường trong `.sort()`, đúng thứ tự (và chiều, hoặc đảo cả bộ).
- Range: `$gt`, `$gte`, `$lt`, `$lte`, `$ne`, `$nin`, `$regex`.

## Ví dụ

Truy vấn mẫu: `directors` là bằng, `year` là sắp, `runtime` là khoảng.

```javascript
db.movies.find({ directors: "David Lynch", runtime: { $lt: 130 } }, { title: 1, year: 1, runtime: 1 }).sort({ year: 1 })
```

Chỉ `Blue Velvet` (120 phút) khớp.

Index theo ESR cho truy vấn đó:

```javascript
db.movies.createIndex({ directors: 1, year: 1, runtime: 1 })
```

Trên `mongod`, trong khối `"David Lynch"` các khóa đã theo `year`, nên không cần stage `SORT`.

`$in` với vài giá trị vẫn tính như phép bằng:

```javascript
db.movies.find({ directors: { $in: ["Joel Coen", "David Lynch"] } }, { title: 1 }).sort({ title: 1 })
```

## Lỗi hay gặp

Đặt range trước sort:

```javascript
// WRONG: range before sort, mongod must sort in memory
db.movies.createIndex({ directors: 1, runtime: 1, year: 1 })
```

```javascript
// FIX: equality, sort, range
db.movies.createIndex({ directors: 1, year: 1, runtime: 1 })
```

Cả hai index đều có đủ ba trường, nên lỗi này không lộ ra trong kết quả; chỉ explain trên `mongod` cho thấy stage `SORT`.

Coi `$ne` là phép bằng:

```javascript
// WRONG: $ne treated as equality, placed first
db.movies.createIndex({ directors: 1, year: 1 })
```

```javascript
// FIX: for find({ directors: { $ne: "David Lynch" } }).sort({ year: 1 }), sort field first
db.movies.createIndex({ year: 1, directors: 1 })
```

Với `$ne`, index bắt đầu bằng `directors` phải quét hai khoảng rồi sắp lại theo `year`; đặt `year` trước thì thứ tự có sẵn.

## Tóm tắt

- Index kép quét liền chỉ khi các trường đứng trước bị cố định bằng phép bằng.
- ESR: Equality, rồi Sort, rồi Range.
- `$ne`, `$nin`, `$regex` là range; `$in` với mảng nhỏ là nhiều phép bằng.
- Range trước sort gây stage `SORT`; ERS chỉ khi khoảng rất chọn lọc.

# EN

## Opening

The film shop has a screen "a director's films shorter than 130 minutes, by year". You index exactly those three fields and the query still sorts in memory. The order of the three fields is what decides it.

## Key idea

MongoDB indexes are B-trees. The compound index `{ a: 1, b: 1, c: 1 }` sorts keys by `a`, then within the same `a` by `b`, then by `c`, like a phone book ordered by family name then given name. A query scans one contiguous part of the index only when the fields in front are fixed by equality.

The docs recommend ESR: Equality fields first, then Sort fields, then Range fields last. Inside an equality block the keys are already ordered, so MongoDB reads in index order with no extra sort. If the range comes before the sort, the sort order breaks across range values and explain shows a `SORT` stage. When the range is very selective, ERS (range before sort) can be cheaper because only a few documents are left to sort.

Many people think `$ne` is an equality because it names one value. In fact `$ne`, `$nin` and `$regex` are ranges. `$in` alone acts as several equality matches; with `.sort()`, an array of fewer than 201 elements is expanded into equalities and merged (`SORT_MERGE`), with 201 or more it acts like a range, and the docs say this threshold may change.

The examples run on mingo; mingo has no indexes, so `createIndex` only returns the index list and measures no plan.

## Syntax

```text
db.<coll>.createIndex({ <equality fields>: 1, <sort fields>: 1 | -1, <range fields>: 1 })
```

- Equality: `{ f: v }`, `$eq`, `$in` with a small array.
- Sort: the fields in `.sort()`, in the same order (and direction, or the whole set reversed).
- Range: `$gt`, `$gte`, `$lt`, `$lte`, `$ne`, `$nin`, `$regex`.

## Example

The sample query: `directors` is equality, `year` is sort, `runtime` is range.

```javascript
db.movies.find({ directors: "David Lynch", runtime: { $lt: 130 } }, { title: 1, year: 1, runtime: 1 }).sort({ year: 1 })
```

Only `Blue Velvet` (120 minutes) matches.

The ESR index for that query:

```javascript
db.movies.createIndex({ directors: 1, year: 1, runtime: 1 })
```

On `mongod`, inside the `"David Lynch"` block the keys are already ordered by `year`, so no `SORT` stage is needed.

`$in` with a few values still counts as equality:

```javascript
db.movies.find({ directors: { $in: ["Joel Coen", "David Lynch"] } }, { title: 1 }).sort({ title: 1 })
```

## Common mistakes

Putting the range before the sort:

```javascript
// WRONG: range before sort, mongod must sort in memory
db.movies.createIndex({ directors: 1, runtime: 1, year: 1 })
```

```javascript
// FIX: equality, sort, range
db.movies.createIndex({ directors: 1, year: 1, runtime: 1 })
```

Both indexes hold all three fields, so this mistake never shows in the result; only explain on `mongod` reveals the `SORT` stage.

Treating `$ne` as equality:

```javascript
// WRONG: $ne treated as equality, placed first
db.movies.createIndex({ directors: 1, year: 1 })
```

```javascript
// FIX: for find({ directors: { $ne: "David Lynch" } }).sort({ year: 1 }), sort field first
db.movies.createIndex({ year: 1, directors: 1 })
```

With `$ne`, an index starting with `directors` must scan two ranges and then sort again by `year`; with `year` first the order is already there.

## Recap

- A compound index scans contiguously only when the leading fields are fixed by equality.
- ESR: Equality, then Sort, then Range.
- `$ne`, `$nin`, `$regex` are ranges; `$in` with a small array is several equalities.
- Range before sort causes a `SORT` stage; ERS only when the range is very selective.
