---
id: e-dy-l3-02
engine: dynamodb
level: L3
module: secondary
title: "LSI và GSI: hai loại index phụ"
title_en: "LSI and GSI: two kinds of secondary index"
kind: concept
runtime: docs
minutes: 10
viz: dy-gsi
objectives:
  - vi: So sánh LSI và GSI về khóa, lúc tạo, consistency, throughput và giới hạn cỡ.
    en: Compare LSI and GSI on keys, creation time, consistency, throughput and size limits.
  - vi: Chọn projection `KEYS_ONLY`, `INCLUDE` hay `ALL` theo câu hỏi sẽ đọc index.
    en: Choose a `KEYS_ONLY`, `INCLUDE` or `ALL` projection from the questions that will read the index.
requires: [e-dy-l3-01]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/SecondaryIndexes.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/LSI.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ServiceQuotas.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Constraints.html
quiz:
  - q:
      vi: Bảng đã chạy một năm. Bạn cần tìm đơn theo `status`. Thêm loại index nào được?
      en: The table has been live for a year. You need to find orders by `status`. Which kind of index can you add?
    options:
      - vi: LSI, vì nó rẻ hơn.
        en: An LSI, because it is cheaper.
      - vi: GSI - LSI chỉ tạo được cùng lúc tạo bảng, và phải dùng chung partition key với bảng.
        en: A GSI - an LSI can only be created together with the table, and must share the table's partition key.
      - vi: Không thêm được index nào sau khi tạo bảng.
        en: No index can be added after the table is created.
    answer: 1
    why:
      vi: GSI thêm hoặc xóa lúc nào cũng được và có partition key tùy ý (ở đây `status`). LSI chỉ tạo khi tạo bảng và dùng cùng partition key.
      en: A GSI can be added or removed at any time and can use any partition key (here `status`). An LSI is created only with the table and keeps the same partition key.
  - q:
      vi: Một GSI có projection `KEYS_ONLY`. Query trên GSI đó xin thêm thuộc tính `city`. Được gì?
      en: A GSI has a `KEYS_ONLY` projection. A Query on it asks for the attribute `city`. What comes back?
    options:
      - vi: '`city` được lấy tự động từ bảng gốc.'
        en: '`city` is fetched from the base table automatically.'
      - vi: 'Không có `city` - GSI chỉ trả được thuộc tính đã project. Muốn có thì GetItem bảng gốc, hoặc project thêm.'
        en: 'No `city` - a GSI can only return projected attributes. Get it with a GetItem on the base table, or project it.'
      - vi: Request lỗi vì bảng gốc đang bị giữ lock.
        en: The request fails because the base table is locked.
    answer: 1
    why:
      vi: GSI không tự đọc ngược về bảng gốc. LSI thì có thể lấy thuộc tính chưa project từ bảng (tốn thêm lượt đọc).
      en: A GSI never reads back from the base table. An LSI can fetch unprojected attributes from the table (at an extra read cost).
---

## Ý chính

Một index (chỉ mục) phụ là một bản sao có khóa khác của một phần dữ liệu, để thêm mẫu truy cập mà không Scan.

**GSI (global secondary index)**:

- partition key và sort key tùy ý, không cần duy nhất;
- thêm hoặc xóa **bất cứ lúc nào**;
- cập nhật **bất đồng bộ**, chỉ đọc **eventually consistent**;
- throughput riêng; mỗi lần ghi làm đổi index tốn thêm WCU;
- chỉ trả thuộc tính đã project.

**LSI (local secondary index)**:

- **cùng partition key** với bảng, chỉ khác sort key;
- chỉ tạo **cùng lúc tạo bảng**;
- đọc strongly consistent được; dùng chung throughput với bảng;
- mỗi giá trị partition key (item collection) tối đa **10 GB** khi bảng có LSI.

Hạn mức: 5 LSI mỗi bảng; 20 GSI mỗi bảng (mặc định, xin tăng được); tổng 100 thuộc tính `INCLUDE` trên mọi index của bảng.

## Ví dụ

Projection quyết định index mang theo gì:

- `KEYS_ONLY`: khóa của bảng và khóa của index. Nhỏ nhất, rẻ nhất khi ghi.
- `INCLUDE`: thêm vài thuộc tính bạn chỉ định trong `NonKeyAttributes`.
- `ALL`: cả item. Đọc được mọi thuộc tính, nhưng mỗi item được lưu và ghi thêm một bản đầy đủ trong index.

Bấm "Tiếp" trên sơ đồ: một lần ghi vào bảng `Orders`, rồi bản chiếu sang GSI `byStatus` tới sau một chút.

## Thực hành

Chọn projection từ câu hỏi: nếu trang danh sách chỉ cần `orderId` và `total`, dùng `INCLUDE ["total"]` thay vì `ALL`.

# EN

## Key idea

A secondary index is a copy of part of the data under a different key, so you can add an access pattern without a Scan.

**GSI (global secondary index)**:

- any partition key and sort key, not required to be unique;
- added or removed **at any time**;
- updated **asynchronously**, so only **eventually consistent** reads;
- its own throughput; every table write that changes the index costs extra WCU for the index;
- returns only projected attributes.

**LSI (local secondary index)**:

- **same partition key** as the table, only the sort key differs;
- created **only together with the table**;
- supports strongly consistent reads; shares the table's throughput;
- each partition key value (item collection) is limited to **10 GB** when the table has an LSI.

Quotas: 5 LSIs per table; 20 GSIs per table (default, can be raised); 100 `INCLUDE` attributes in total across all indexes of a table.

## Example

The projection decides what the index carries:

- `KEYS_ONLY`: the table's key and the index's key. Smallest and cheapest to write.
- `INCLUDE`: plus a few attributes you list in `NonKeyAttributes`.
- `ALL`: the whole item. Every attribute is readable, but each item is stored and written again in full in the index.

Press "Next" on the diagram: one write to table `Orders`, then the copy reaches GSI `byStatus` a moment later.

## Practice

Choose the projection from the question: if the list page needs only `orderId` and `total`, use `INCLUDE ["total"]` rather than `ALL`.
