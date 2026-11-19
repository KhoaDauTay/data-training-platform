---
id: e-dy-l1-02
engine: dynamodb
level: L1
module: keys
title: "Khóa chính: partition key và sort key"
title_en: "Primary key: partition key and sort key"
kind: concept
runtime: docs
minutes: 8
viz: dy-partitions
objectives:
  - vi: Phân biệt khóa đơn (chỉ partition key) và khóa kép (partition key + sort key).
    en: Tell a simple key (partition key only) from a composite key (partition key + sort key).
  - vi: Mô tả cách DynamoDB băm partition key để chọn partition, và vì sao item cùng partition key nằm cạnh nhau theo thứ tự sort key.
    en: Describe how DynamoDB hashes the partition key to pick a partition, and why items with the same partition key sit together in sort key order.
requires: [e-dy-l1-01]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.CoreComponents.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.Partitions.html
quiz:
  - q:
      vi: Bảng `Orders` có khóa (`customerId`, `orderId`). Hai item nào không thể cùng tồn tại?
      en: Table `Orders` has the key (`customerId`, `orderId`). Which two items cannot both exist?
    options:
      - vi: Cùng `customerId`, khác `orderId`.
        en: Same `customerId`, different `orderId`.
      - vi: Khác `customerId`, cùng `orderId`.
        en: Different `customerId`, same `orderId`.
      - vi: Cùng `customerId` và cùng `orderId`.
        en: Same `customerId` and same `orderId`.
    answer: 2
    why:
      vi: Với khóa kép, cặp (partition key, sort key) phải duy nhất. Ghi item thứ hai cùng cặp khóa sẽ thay item cũ.
      en: With a composite key the pair (partition key, sort key) must be unique. Writing a second item with the same pair replaces the old one.
  - q:
      vi: Vì sao mọi đơn của khách `C-07` đọc được trong một request, theo thứ tự `orderId`?
      en: Why can every order of customer `C-07` be read in one request, in `orderId` order?
    options:
      - vi: Vì DynamoDB sắp cả bảng theo `orderId`.
        en: Because DynamoDB sorts the whole table by `orderId`.
      - vi: Vì item cùng partition key được lưu cùng nhau, sắp theo sort key.
        en: Because items with the same partition key are stored together, sorted by sort key.
      - vi: Vì DynamoDB tự tạo index trên mọi thuộc tính.
        en: Because DynamoDB indexes every attribute automatically.
    answer: 1
    why:
      vi: Hàm băm trên partition key chọn partition. Trong partition, các item cùng partition key (một item collection) được sắp theo sort key. Cả bảng không có thứ tự chung.
      en: The hash of the partition key picks the partition. Inside it, items with the same partition key (one item collection) are sorted by sort key. The table as a whole has no order.
---

## Ý chính

Mỗi bảng có một **khóa chính**, chọn lúc tạo bảng và không đổi được nữa. Có hai loại:

- **Khóa đơn**: chỉ có **partition key**. Bảng `Books` dùng `isbn`, mỗi `isbn` là một item.
- **Khóa kép**: **partition key + sort key**. Bảng `Orders` dùng `customerId` + `orderId`. Một khách có nhiều đơn, mỗi đơn một `orderId`.

Thuộc tính khóa chỉ được là chuỗi, số hoặc nhị phân.

**Partition key chọn chỗ ở.** DynamoDB đưa giá trị partition key qua một hàm băm nội bộ. Kết quả băm quyết định item nằm ở **partition** nào. Partition là một đơn vị lưu trữ, được nhân bản sang nhiều Availability Zone.

**Sort key chọn thứ tự.** Các item cùng partition key được lưu cạnh nhau, sắp theo sort key. Nhóm đó gọi là một **item collection**.

## Ví dụ

Bấm "Tiếp" trên sơ đồ: `C-01`, `C-02`, `C-03` đi qua hàm băm và rơi vào các partition khác nhau. Bốn đơn của `C-02` nằm chung một chỗ, xếp theo `orderId`:

```text
C-02 | 2026-07-25#O-105
C-02 | 2026-08-26#O-106
C-02 | 2026-09-17#O-107
C-02 | 2026-10-03#O-108
```

Vì `orderId` bắt đầu bằng ngày, thứ tự sort key cũng là thứ tự thời gian. Đây là mẹo thiết kế đầu tiên: đặt thứ bạn muốn sắp vào đầu sort key.

## Thực hành

Hệ quả cần nhớ: cả bảng không có thứ tự chung, và không có "tìm theo thuộc tính bất kỳ" rẻ. Muốn đọc nhanh, câu hỏi phải bắt đầu bằng partition key.

# EN

## Key idea

Every table has a **primary key**, chosen when the table is created and never changed. There are two kinds:

- **Simple key**: only a **partition key**. Table `Books` uses `isbn`, each `isbn` is one item.
- **Composite key**: **partition key + sort key**. Table `Orders` uses `customerId` + `orderId`. One customer has many orders, each with its own `orderId`.

Key attributes can only be strings, numbers or binary.

**The partition key picks the home.** DynamoDB passes the partition key value through an internal hash function. The hash decides which **partition** the item lives in. A partition is a unit of storage, replicated across several Availability Zones.

**The sort key picks the order.** Items with the same partition key are stored next to each other, sorted by sort key. That group is called an **item collection**.

## Example

Press "Next" on the diagram: `C-01`, `C-02`, `C-03` go through the hash and land in different partitions. The four orders of `C-02` sit together, ordered by `orderId`:

```text
C-02 | 2026-07-25#O-105
C-02 | 2026-08-26#O-106
C-02 | 2026-09-17#O-107
C-02 | 2026-10-03#O-108
```

Because `orderId` starts with the date, sort key order is also time order. That is the first design trick: put what you want to sort by at the front of the sort key.

## Practice

The consequence to remember: the table as a whole has no order, and there is no cheap "find by any attribute". To read fast, a question must start with the partition key.
