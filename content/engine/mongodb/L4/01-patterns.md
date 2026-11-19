---
id: e-mg-l4-01
engine: mongodb
level: L4
module: patterns
title: "Mẫu thiết kế schema của MongoDB"
title_en: "MongoDB schema design patterns"
kind: concept
minutes: 10
runtime: docs
objectives:
  - vi: "Kể tên sáu nhóm mẫu thiết kế trong tài liệu MongoDB hiện hành"
    en: "Name the six pattern groups in the current MongoDB manual"
  - vi: "Chọn mẫu theo cách ứng dụng đọc và ghi dữ liệu"
    en: "Pick a pattern from how the application reads and writes data"
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
      - { vi: "Bucket", en: "Bucket" }
      - { vi: "Outlier", en: "Outlier" }
      - { vi: "Archive", en: "Archive" }
    answer: 1
    why:
      vi: "Tài liệu MongoDB: mẫu outlier tách phần đánh giá của sách nổi tiếng sang tài liệu riêng, để một tài liệu quá lớn không làm chậm các tài liệu bình thường."
      en: "The MongoDB docs: the outlier pattern moves the popular book's reviews into separate documents, so one oversized document does not slow down the typical ones."
  - q:
      vi: "Dữ liệu cảm biến đo mỗi phút. Tài liệu khuyên gì trước khi tự viết mẫu bucket?"
      en: "Sensor data arrives every minute. What do the docs suggest before hand-writing the bucket pattern?"
    options:
      - { vi: "Dùng collection time series, nó áp dụng mẫu bucket tự động", en: "Use a time series collection, it applies the bucket pattern automatically" }
      - { vi: "Dùng một tài liệu cho mỗi phép đo, không gom", en: "Use one document per measurement, no grouping" }
      - { vi: "Dùng transaction cho mỗi phép đo", en: "Use a transaction for every measurement" }
    answer: 0
    why:
      vi: "Trang Group Data ghi: collection time series áp dụng mẫu bucket tự động và hợp với hầu hết trường hợp dùng bucket."
      en: "The Group Data page says time series collections apply the bucket pattern automatically and suit most bucket use cases."
---

## Ý chính

Mẫu thiết kế giúp schema khớp với cách ứng dụng đọc dữ liệu. Tài liệu MongoDB hiện hành chia thành sáu nhóm:

- Computed Values: tính sẵn trong cơ sở dữ liệu để kết quả có ngay khi đọc.
- Group Data: gom dữ liệu thành nhiều chuỗi nhỏ (bucket), và tách phần bất thường (outlier).
- Polymorphic Data: nhiều dạng tài liệu khác trường trong một collection.
- Document and Schema Versioning: giữ lịch sử phiên bản tài liệu, hoặc ghi `schemaVersion` để ứng dụng đọc được nhiều dạng schema mà không phải di chuyển hết dữ liệu một lần.
- Archive: chuyển dữ liệu cũ ra chỗ khác để phần hay dùng nhanh hơn.
- Single Collection: gom tài liệu liên quan của nhiều loại vào một collection, nối bằng tham chiếu.

Các tên cũ như subset hay extended reference không còn là mục riêng trên trang này.

## Ví dụ

Các lab sau làm từng mẫu bằng aggregation trên mingo: pipeline nhận dạng cũ và trả ra dạng mới. Trên `mongod`, bạn sẽ ghi kết quả đó bằng `$merge` hoặc cập nhật hàng loạt; trình duyệt chỉ chạy phần đọc.

Đúng với tài liệu MongoDB hiện hành, kiểm ngày 2026-11-20.

# EN

## Key idea

Design patterns make the schema match how the application reads data. The current MongoDB manual groups them into six:

- Computed Values: compute in the database so results are ready when read.
- Group Data: group data into smaller series (bucket), and split off the unusual part (outlier).
- Polymorphic Data: several document shapes with different fields in one collection.
- Document and Schema Versioning: keep a history of document versions, or store `schemaVersion` so the application reads several schema shapes without migrating all data at once.
- Archive: move old data elsewhere so the frequently used part is faster.
- Single Collection: group related documents of several types into one collection, linked by references.

Older names such as subset or extended reference are no longer separate entries on this page.

## Example

The next labs build each pattern with aggregation on mingo: the pipeline reads the old shape and returns the new one. On `mongod` you would write that result with `$merge` or a bulk update; the browser runs only the read part.

Matches the current MongoDB manual, checked 2026-11-20.
