---
# ENGINE-CONTENT-V1 · DynamoDB. Lab data (`lab.setup.items`) is plain JSON; every request is native DynamoDB JSON
# wrapped as {"op", "input"}, or a PartiQL string. Checked against @dynoxide/wasm-engine 1.5.0 and the AWS docs, 2026-11-20.
id: e-dy-l4-01
engine: dynamodb
level: L4
module: scale
title: "Partition: nơi một item thật sự nằm"
title_en: "Partitions: where an item really lives"
kind: concept
runtime: docs
minutes: 6
objectives:
  - { vi: "Giải thích cách DynamoDB băm partition key để chọn partition", en: "Explain how DynamoDB hashes the partition key to pick a partition" }
  - { vi: "Nêu giới hạn 3000 thao tác đọc và 1000 thao tác ghi mỗi giây của một partition", en: "State the limit of 3000 reads and 1000 writes per second for one partition" }
  - { vi: "Biết vì sao một partition key ít giá trị khác nhau dễ thành điểm nóng", en: "Know why a partition key with few distinct values easily becomes a hot spot" }
requires: []
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.Partitions.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/burst-adaptive-capacity.html
viz: dy-partitions
quiz:
  - q: { vi: "Hai item có cùng partition key nhưng khác sort key. DynamoDB đặt chúng ở đâu?", en: "Two items share a partition key but have different sort keys. Where does DynamoDB put them?" }
    options:
      - { vi: "Cạnh nhau, sắp tăng dần theo sort key, trong cùng item collection", en: "Next to each other, in ascending sort key order, in the same item collection" }
      - { vi: "Ở hai partition ngẫu nhiên, vì sort key cũng được băm", en: "In two random partitions, because the sort key is hashed too" }
      - { vi: "Ở partition có ít dữ liệu nhất lúc ghi", en: "In whichever partition holds the least data at write time" }
    answer: 0
    why: { vi: "Chỉ partition key đi qua hàm băm. Các item cùng partition key nằm gần nhau, sắp theo sort key; đó là item collection mà Query đọc.", en: "Only the partition key goes through the hash function. Items with the same partition key sit close together, ordered by sort key; that is the item collection a Query reads." }
  - q: { vi: "Một partition nhận 1200 thao tác ghi mỗi giây, mỗi item dưới 1 KB. Chuyện gì xảy ra?", en: "One partition receives 1200 writes per second, each item under 1 KB. What happens?" }
    options:
      - { vi: "Không sao, bảng on-demand không có giới hạn nào", en: "Nothing, an on-demand table has no limit at all" }
      - { vi: "Phần vượt 1000 ghi mỗi giây có thể bị throttle, dù tổng capacity của bảng còn dư", en: "The part above 1000 writes per second can be throttled, even if the table's total capacity has room left" }
      - { vi: "DynamoDB tự chuyển sang đọc nhất quán cuối cùng", en: "DynamoDB switches to eventually consistent reads by itself" }
    answer: 1
    why: { vi: "Đọc và ghi trên một partition được quản lý riêng: quá 3000 đọc hoặc 1000 ghi mỗi giây trên một partition là có thể bị throttle, bất kể chế độ capacity.", en: "Reads and writes on a partition are managed independently: more than 3000 reads or 1000 writes per second on one partition can be throttled, whatever the capacity mode." }
---

## Ý chính

DynamoDB chia dữ liệu của bảng thành nhiều **partition**: mỗi partition là một phần lưu trữ trên SSD, được sao chép sang nhiều Availability Zone. Bạn không bao giờ tự quản partition.

- Khi ghi, giá trị **partition key** đi qua một hàm băm nội bộ. Kết quả băm chọn partition. Sort key không được băm.
- Các item cùng partition key nằm gần nhau, sắp tăng dần theo sort key: đó là **item collection**. Bảng không có LSI thì DynamoDB còn tự chia một collection lớn qua nhiều partition.
- DynamoDB thêm partition khi bạn tăng throughput vượt sức partition hiện có, hoặc khi một partition đầy.
- Mỗi partition chịu tối đa **3000 thao tác đọc** và **1000 thao tác ghi** mỗi giây. Vượt mức đó trên một partition thì có thể bị throttle, kể cả khi cả bảng còn dư capacity.

Hệ quả: cả bảng nhanh hay chậm phụ thuộc vào việc tải có rải đều trên nhiều giá trị partition key hay không. Một partition key chỉ có vài giá trị (ngày hôm nay, một mã cửa hàng lớn) sẽ dồn tải vào một chỗ.

Bộ máy trong trình duyệt là một nút đơn, không có partition thật và không throttle, nên phần này **chưa chạy được trong trình duyệt**: sơ đồ và câu hỏi thay cho lab.

## Ví dụ

Bảng `Votes` lưu phiếu bầu theo ngày. Nếu partition key là ngày (`VOTE#2026-11-20`), mọi phiếu trong ngày đi vào một partition. Với 1500 phiếu mỗi giây, mỗi phiếu dưới 1 KB, partition đó phải nhận 1500 WCU, vượt mức 1000.

```text
hash("VOTE#2026-11-20")   -> partition 2   (1500 writes/s: hot)
hash("VOTE#2026-11-20#0") -> partition 0
hash("VOTE#2026-11-20#1") -> partition 3
```

Thêm hậu tố sau ngày làm số giá trị partition key tăng lên, tải được rải ra. Bài 4 làm việc này trên dữ liệu thật.

# EN

## Key idea

DynamoDB splits a table's data into many **partitions**: each partition is an allocation of SSD storage, replicated across several Availability Zones. You never manage partitions yourself.

- On a write, the **partition key** value goes through an internal hash function. The hash output picks the partition. The sort key is not hashed.
- Items with the same partition key sit close together, in ascending sort key order: that is an **item collection**. Without an LSI, DynamoDB can also split a large collection over several partitions.
- DynamoDB adds partitions when you raise throughput beyond what the current partitions support, or when a partition fills up.
- Each partition handles at most **3000 reads** and **1000 writes** per second. Going over that on one partition can be throttled, even when the table as a whole has spare capacity.

The consequence: how fast the whole table is depends on whether the load is spread over many partition key values. A partition key with only a few values (today's date, one big store id) piles the load in one place.

The in-browser engine is a single node with no real partitions and no throttling, so this part does not run in the browser yet: a diagram and questions replace the lab.

## Example

The `Votes` table stores votes by day. If the partition key is the date (`VOTE#2026-11-20`), every vote of the day goes to one partition. At 1500 votes per second, each under 1 KB, that partition must take 1500 WCU, above the 1000 limit.

```text
hash("VOTE#2026-11-20")   -> partition 2   (1500 writes/s: hot)
hash("VOTE#2026-11-20#0") -> partition 0
hash("VOTE#2026-11-20#1") -> partition 3
```

Adding a suffix after the date multiplies the partition key values and spreads the load. Lesson 4 does this on real data.
