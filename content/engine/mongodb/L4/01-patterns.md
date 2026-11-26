---
id: e-mg-l4-01
engine: mongodb
level: L4
module: patterns
title: "Mẫu thiết kế schema của MongoDB"
title_en: "MongoDB schema design patterns"
kind: concept
minutes: 12
runtime: docs
objectives:
  - vi: "Kể tên sáu nhóm mẫu thiết kế trong docs chính thức của MongoDB hiện hành"
    en: "Name the six pattern groups in the current MongoDB manual"
  - vi: "Chọn mẫu theo cách ứng dụng đọc và ghi dữ liệu"
    en: "Pick a pattern from how the application reads and writes data"
  - vi: "Nhận ra cái giá của mỗi mẫu: dữ liệu lặp, việc giữ đồng bộ, mã đọc nhiều dạng"
    en: "See the price of each pattern: duplicated data, keeping it in sync, code that reads several shapes"
requires: []
sources:
  - https://www.mongodb.com/docs/manual/data-modeling/design-patterns/
  - https://www.mongodb.com/docs/manual/data-modeling/design-patterns/group-data/
  - https://www.mongodb.com/docs/manual/data-modeling/design-patterns/data-versioning/
quiz:
  - q:
      vi: "Một cuốn sách mới nhận nhiều đánh giá hơn hẳn các sách khác, làm tài liệu của nó rất to. Mẫu nào?"
      en: "A new book gets far more reviews than the others, which makes its document very large. Which pattern?"
    options:
      - { vi: "Bucket: gom đánh giá của mọi sách thành bucket theo tháng", en: "Bucket: group the reviews of every book into monthly buckets" }
      - { vi: "Outlier: đánh dấu sách đó và để phần đánh giá dư ở tài liệu riêng", en: "Outlier: flag that book and keep its extra reviews in separate documents" }
      - { vi: "Archive", en: "Archive" }
    answer: 1
    trap: 0
    why:
      vi: "Bucket cũng chia nhỏ dữ liệu nên nghe hợp lý, nhưng ở đây chỉ một cuốn sách quá to, các sách khác vẫn bình thường: gom đánh giá của mọi sách theo tháng sẽ đổi dạng tài liệu và mã đọc của tất cả sách. Outlier giữ dạng cũ cho số đông, gắn một cờ cho riêng cuốn sách đó và chuyển phần đánh giá dư sang tài liệu riêng, nên mã đọc sách thường không đổi. Archive chuyển dữ liệu cũ, ít ai đọc, đi chỗ khác; đánh giá của một sách mới đang được đọc nhiều, nên không hợp."
      en: "Bucket also splits data, so it sounds right, but here only one book is too large and the others are normal: grouping the reviews of every book by month would change the document shape and the reading code of all books. Outlier keeps the usual shape for the many, sets a flag on that one book and moves its extra reviews to separate documents, so the code that reads normal books does not change. Archive moves old, rarely read data elsewhere; the reviews of a new book are read a lot, so it does not fit."
  - q:
      vi: "Dữ liệu cảm biến đo mỗi phút. Docs chính thức khuyên gì trước khi tự viết mẫu bucket?"
      en: "Sensor data arrives every minute. What do the docs suggest before hand-writing the bucket pattern?"
    options:
      - { vi: "Dùng collection time series, nó áp dụng mẫu bucket tự động", en: "Use a time series collection, it applies the bucket pattern automatically" }
      - { vi: "Dùng một tài liệu cho mỗi phép đo, không gom", en: "Use one document per measurement, no grouping" }
      - { vi: "Dùng transaction cho mỗi phép đo", en: "Use a transaction for every measurement" }
    answer: 0
    why:
      vi: "Trang Group Data của docs ghi: collection time series tự gom các phép đo thành bucket bên trong, và hợp với hầu hết trường hợp bạn định tự viết bucket. Một tài liệu cho mỗi phép đo chính là dạng chưa gom: mỗi cảm biến sinh 60 × 24 = 1.440 tài liệu mỗi ngày. Transaction chỉ giúp nhiều lệnh ghi cùng thành công hoặc cùng thất bại; ghi một phép đo là ghi một tài liệu, vốn đã nguyên tử, nên transaction chỉ thêm chi phí."
      en: "The Group Data page of the docs says a time series collection groups the readings into buckets internally and suits most cases where you would hand-write a bucket. One document per measurement is the ungrouped shape: each sensor makes 60 × 24 = 1,440 documents a day. A transaction only makes several writes succeed or fail together; recording one measurement writes one document, which is already atomic, so a transaction only adds cost."
---
## Mở bài

Hai ứng dụng cùng lưu đơn hàng: một bên đọc tổng tiền mỗi giây, bên kia hiếm khi đọc nhưng ghi liên tục. Một schema khó tối ưu cho cả hai. Mẫu thiết kế là cách chọn hình dạng tài liệu theo việc ứng dụng thật sự làm.

## Ý chính

Trong MongoDB, schema đi theo cách ứng dụng đọc, không theo các thực thể trên giấy. Docs chính thức hiện hành chia mẫu thành sáu nhóm: Computed Values (tính sẵn lúc ghi), Group Data (bucket gom chuỗi dài, outlier tách phần bất thường), Polymorphic Data (nhiều dạng tài liệu trong một collection), Document and Schema Versioning (lịch sử phiên bản, hoặc `schemaVersion` để đọc nhiều dạng mà không phải di chuyển hết dữ liệu một lần), Archive (chuyển dữ liệu cũ đi) và Single Collection (nhiều loại tài liệu liên quan trong một collection, nối bằng tham chiếu).

Mỗi mẫu là một đổi chác. Computed Values làm đọc rẻ nhưng mọi lệnh ghi phải giữ giá trị đúng. Bucket giảm số tài liệu nhưng cần giới hạn kích thước bucket. Versioning tránh một lần di chuyển lớn nhưng mã đọc phải hiểu mọi phiên bản còn sống.

Nhiều người nghĩ mẫu là khuôn cố định phải áp cho mọi collection. Thật ra mẫu chỉ đáng dùng khi có một vấn đề đo được: một truy vấn chậm, một tài liệu quá to, một lần di chuyển không được dừng hệ thống. Các tên cũ như subset hay extended reference không còn là mục riêng trên trang này.

## Cú pháp

```text
pattern              sign                              document shape
Computed Values      reads >> writes, repeated math    { ..., total: 65 }
Bucket               long series over time             { sensor, hour, count, temps: [ ... ] }
Outlier              a few oversized documents         { ..., hasOverflow: true }
Polymorphic          several kinds, several fields     { kind: "car" | "home", ... }
Schema Versioning    schema changes, old data stays    { schemaVersion: 2, ... }
Archive              old data rarely read              move to another collection
```

- Mỗi dòng: mẫu, dấu hiệu nên dùng, và hình dạng tài liệu mẫu đó tạo ra.

## Ví dụ

Computed Values: một trường lưu sẵn thay cho phép cộng ở mỗi lần đọc.

```text
before: { _id: 101, lines: [ { qty: 2, price: 12.5 }, { qty: 1, price: 40 } ] }
after:  { _id: 101, lines: [ ... ], itemCount: 3, total: 65 }
```

Bucket: bảy phép đo của một cảm biến trong một giờ thành một tài liệu.

```text
before: { sensor: "s1", ts: "08:05", temp: 21.0 }  x 7
after:  { _id: { sensor: "s1", hour: "08:00" }, count: 7, temps: [ 21.0, ... ] }
```

Schema Versioning: tài liệu cũ và mới sống cạnh nhau, mã đọc nhìn `schemaVersion`.

```text
{ _id: 1, name: "An", cellPhone: "090-111" }
{ _id: 3, schemaVersion: 2, name: "Chi", contacts: [ { type: "cell", value: "090-333" } ] }
```

Các lab sau làm từng mẫu bằng aggregation trên mingo: pipeline đọc dạng cũ và trả dạng mới. Trên `mongod`, bạn ghi kết quả bằng `$merge` hoặc cập nhật hàng loạt.

## Lỗi hay gặp

Lưu giá trị tính sẵn rồi quên cập nhật nó:

```text
// WRONG: lines change, total stays old
{ $push: { lines: { qty: 1, price: 12.5 } } }
```

```text
// FIX: the same write keeps total right
{ $push: { lines: { qty: 1, price: 12.5 } }, $inc: { total: 12.5 } }
```

Bucket không có giới hạn, lớn mãi:

```text
// WRONG: one bucket per sensor, forever
{ _id: "s1", temps: [ ... every reading since 2020 ... ] }
```

```text
// FIX: a bucket per sensor and hour (or a time series collection)
{ _id: { sensor: "s1", hour: ISODate("2026-10-01T08:00:00Z") }, count: 7, temps: [ ... ] }
```

Một tài liệu BSON tối đa 16 MiB; một mảng lớn mãi sớm muộn chạm giới hạn đó, và trước đó đã làm mỗi lần đọc chậm đi.

## Tóm tắt

- Schema đi theo cách ứng dụng đọc và ghi, không theo sơ đồ thực thể.
- Sáu nhóm: Computed Values, Group Data, Polymorphic, Versioning, Archive, Single Collection.
- Mỗi mẫu trả một cái giá: dữ liệu lặp, việc giữ đồng bộ, hoặc mã đọc nhiều dạng.
- Dùng mẫu khi có vấn đề đo được, không phải theo thói quen.

# EN

## Opening

Two applications both store orders: one reads totals every second, the other rarely reads but writes all the time. One schema can hardly be best for both. Design patterns are how you pick a document shape from what the application really does.

## Key idea

In MongoDB the schema follows how the application reads, not the entities on paper. The current manual groups patterns into six: Computed Values (compute at write time), Group Data (bucket groups a long series, outlier splits off the unusual part), Polymorphic Data (several document shapes in one collection), Document and Schema Versioning (a history of versions, or `schemaVersion` to read several shapes without migrating everything at once), Archive (move old data away) and Single Collection (several related document types in one collection, linked by references).

Each pattern is a trade. Computed Values makes reads cheap but every write must keep the value right. Bucket cuts the number of documents but needs a limit on bucket size. Versioning avoids one big migration but the reading code must understand every live version.

Many people think a pattern is a fixed template to apply to every collection. In fact a pattern is only worth it when there is a measured problem: a slow query, an oversized document, a migration that must not stop the system. Older names such as subset or extended reference are no longer separate entries on this page.

## Syntax

```text
pattern              sign                              document shape
Computed Values      reads >> writes, repeated math    { ..., total: 65 }
Bucket               long series over time             { sensor, hour, count, temps: [ ... ] }
Outlier              a few oversized documents         { ..., hasOverflow: true }
Polymorphic          several kinds, several fields     { kind: "car" | "home", ... }
Schema Versioning    schema changes, old data stays    { schemaVersion: 2, ... }
Archive              old data rarely read              move to another collection
```

- Each row: the pattern, the sign that calls for it, and the document shape it produces.

## Example

Computed Values: a stored field instead of a sum on every read.

```text
before: { _id: 101, lines: [ { qty: 2, price: 12.5 }, { qty: 1, price: 40 } ] }
after:  { _id: 101, lines: [ ... ], itemCount: 3, total: 65 }
```

Bucket: seven readings of one sensor in one hour become one document.

```text
before: { sensor: "s1", ts: "08:05", temp: 21.0 }  x 7
after:  { _id: { sensor: "s1", hour: "08:00" }, count: 7, temps: [ 21.0, ... ] }
```

Schema Versioning: old and new documents live side by side, the reading code looks at `schemaVersion`.

```text
{ _id: 1, name: "An", cellPhone: "090-111" }
{ _id: 3, schemaVersion: 2, name: "Chi", contacts: [ { type: "cell", value: "090-333" } ] }
```

The next labs build each pattern with aggregation on mingo: the pipeline reads the old shape and returns the new one. On `mongod` you write the result with `$merge` or a bulk update.

## Common mistakes

Storing a computed value and forgetting to update it:

```text
// WRONG: lines change, total stays old
{ $push: { lines: { qty: 1, price: 12.5 } } }
```

```text
// FIX: the same write keeps total right
{ $push: { lines: { qty: 1, price: 12.5 } }, $inc: { total: 12.5 } }
```

A bucket with no limit that grows forever:

```text
// WRONG: one bucket per sensor, forever
{ _id: "s1", temps: [ ... every reading since 2020 ... ] }
```

```text
// FIX: a bucket per sensor and hour (or a time series collection)
{ _id: { sensor: "s1", hour: ISODate("2026-10-01T08:00:00Z") }, count: 7, temps: [ ... ] }
```

A BSON document is at most 16 MiB; an array that grows forever hits that limit sooner or later, and long before that it slows every read.

## Recap

- The schema follows how the application reads and writes, not the entity diagram.
- Six groups: Computed Values, Group Data, Polymorphic, Versioning, Archive, Single Collection.
- Each pattern pays a price: duplicated data, keeping it in sync, or code that reads several shapes.
- Use a pattern when there is a measured problem, not out of habit.
