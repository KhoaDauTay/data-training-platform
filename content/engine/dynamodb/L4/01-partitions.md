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
minutes: 8
objectives:
  - { vi: "Giải thích cách DynamoDB băm partition key để chọn partition", en: "Explain how DynamoDB hashes the partition key to pick a partition" }
  - { vi: "Nêu giới hạn 3000 thao tác đọc và 1000 thao tác ghi mỗi giây của một partition", en: "State the limit of 3000 reads and 1000 writes per second for one partition" }
  - { vi: "Biết vì sao một partition key ít giá trị khác nhau dễ thành điểm nóng", en: "Know why a partition key with few distinct values easily becomes a hot spot" }
requires: []
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.Partitions.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/burst-adaptive-capacity.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-design.html
figures: [{ name: dy-partitions, at: example }]
quiz:
  - q: { vi: "Hai item có cùng partition key nhưng khác sort key. DynamoDB đặt chúng ở đâu?", en: "Two items share a partition key but have different sort keys. Where does DynamoDB put them?" }
    options:
      - { vi: "Cạnh nhau, sắp tăng dần theo sort key, trong cùng item collection", en: "Next to each other, in ascending sort key order, in the same item collection" }
      - { vi: "Ở hai partition ngẫu nhiên, vì sort key cũng được băm", en: "In two random partitions, because the sort key is hashed too" }
      - { vi: "Ở partition có ít dữ liệu nhất lúc ghi", en: "In whichever partition holds the least data at write time" }
    answer: 0
    trap: 1
    why: { vi: "Băm cả sort key nghe hợp lý vì khóa chính gồm hai phần, nhưng chỉ partition key đi qua hàm băm, nên hai item cùng partition key luôn về cùng một partition. Trong đó chúng nằm cạnh nhau, sắp tăng dần theo sort key: đó là item collection (nhóm item cùng partition key) mà một Query đọc liền một mạch. DynamoDB cũng không chọn partition theo chỗ trống lúc ghi: kết quả băm quyết định, nên lần đọc sau mới tìm lại được item.", en: "Hashing the sort key too sounds right because the primary key has two parts, but only the partition key goes through the hash function, so two items with the same partition key always land in the same partition. There they sit side by side in ascending sort key order: that is the item collection (the items sharing a partition key) that one Query reads in a single pass. DynamoDB does not pick a partition by free space at write time either: the hash decides, which is how a later read finds the item again." }
  - q: { vi: "Một partition nhận 1200 thao tác ghi mỗi giây, mỗi item dưới 1 KB. Chuyện gì xảy ra?", en: "One partition receives 1200 writes per second, each item under 1 KB. What happens?" }
    options:
      - { vi: "Không sao, bảng on-demand không có giới hạn nào", en: "Nothing, an on-demand table has no limit at all" }
      - { vi: "Phần vượt 1000 ghi mỗi giây có thể bị throttle, dù tổng capacity của bảng còn dư", en: "The part above 1000 writes per second can be throttled, even if the table's total capacity has room left" }
      - { vi: "DynamoDB tự chuyển sang đọc nhất quán cuối cùng", en: "DynamoDB switches to eventually consistent reads by itself" }
    answer: 1
    trap: 0
    why: { vi: "On-demand tự co giãn theo tổng tải của bảng, nhưng mỗi partition vẫn có trần riêng 1000 WCU (write capacity unit, đơn vị ghi 1 KB) mỗi giây, ở mọi chế độ capacity. Item dưới 1 KB nên mỗi lần ghi tốn 1 WCU: 1200 × 1 = 1200 WCU, vượt 1000, nên khoảng 200 lần ghi mỗi giây có thể bị throttle (bị DynamoDB từ chối vì vượt mức) dù bảng còn dư. Còn kiểu nhất quán chỉ áp cho đọc và do request chọn, DynamoDB không tự đổi, và nó không giảm tải ghi.", en: "On-demand scales with the table's total load, but each partition still has its own ceiling of 1000 WCU (write capacity unit, 1 KB) per second, in every capacity mode. The items are under 1 KB, so each write costs 1 WCU: 1200 × 1 = 1200 WCU, above 1000, so about 200 writes per second can be throttled (refused by DynamoDB for going over the limit) even though the table has room left. Consistency applies only to reads and is chosen by the request; DynamoDB never switches it, and it would not reduce write load anyway." }
---
## Mở bài

Bảng phiếu bầu chịu được 40.000 ghi mỗi giây theo cấu hình, vậy mà ngày bầu cử vẫn báo throttle ở 1.200 ghi mỗi giây. Thủ phạm không phải tổng capacity mà là chỗ dữ liệu thật sự nằm. Mỗi item nằm ở đâu, và vì sao điều đó quyết định tốc độ?

## Ý chính

DynamoDB chia dữ liệu của bảng thành nhiều **partition**: mỗi partition là một phần lưu trữ trên SSD, được sao chép sang nhiều Availability Zone. Bạn không bao giờ tự quản partition. Khi ghi, giá trị **partition key** đi qua một hàm băm nội bộ, và kết quả băm chọn partition. Sort key không được băm: các item cùng partition key nằm gần nhau, sắp tăng dần theo sort key, đó là **item collection**.

DynamoDB thêm partition khi bạn tăng throughput vượt sức partition hiện có, hoặc khi một partition đầy. Bảng không có LSI thì một collection lớn cũng có thể bị tách qua nhiều partition.

Mỗi partition chịu tối đa **3000 đơn vị đọc** và **1000 đơn vị ghi** mỗi giây. Vượt mức đó trên một partition thì có thể bị throttle (request bị từ chối tạm thời, phải gửi lại), kể cả khi cả bảng còn dư capacity.

Nhiều người nghĩ tổng capacity của bảng là con số duy nhất cần lo. Thật ra tốc độ cả bảng phụ thuộc vào việc tải có rải đều trên nhiều giá trị partition key không. Một partition key chỉ có vài giá trị (ngày hôm nay, một cửa hàng lớn) sẽ dồn tải vào một chỗ.

Bộ máy trong trình duyệt là một nút đơn, không có partition thật và không throttle, nên bài này chưa chạy được trong trình duyệt: sơ đồ và câu hỏi thay cho lab.

## Cú pháp

```text
partition = hash(partition key)          -- sort key is not hashed
per partition, per second: 3000 RCU and 1000 WCU at most
item collection = all items with the same partition key, sorted by sort key
```

- Partition key: chọn partition, nên phải có nhiều giá trị được dùng đều.
- Sort key: chỉ xếp thứ tự bên trong collection.
- Trần mỗi partition áp cho cả on-demand lẫn provisioned.

## Ví dụ

Bảng `Votes` lưu phiếu theo ngày. Partition key là ngày thì mọi phiếu trong ngày vào một partition; 1500 phiếu mỗi giây, mỗi phiếu dưới 1 KB, là 1500 WCU, vượt 1000: cả 1500 lần ghi mỗi giây của `VOTE#2026-11-20` dồn vào một partition nóng.

```text
PK = "VOTE#2026-11-20"                       one value for the whole day
PK = "VOTE#2026-11-20#0" ... "VOTE#2026-11-20#9"   ten values for the same day
```

Thêm hậu tố sau ngày (`VOTE#2026-11-20#0`, `VOTE#2026-11-20#1`…) làm số giá trị partition key tăng lên, mỗi giá trị được băm về một partition riêng, tải được rải ra. Bài 4 làm việc này trong lab chạy bằng dynoxide.

Ngược lại, partition key là mã người dùng thì có hàng triệu giá trị, mỗi giá trị chỉ vài thao tác mỗi giây. Không partition nào gần trần, nên bảng chịu được tổng tải lớn. Sơ đồ dưới đi từng bước: băm khóa, tải đều, một khóa nóng, rồi rải khóa nóng bằng hậu tố.

## Lỗi hay gặp

Chọn partition key có ít giá trị:

```text
// WRONG: one value per day, every write of the day hits one partition
PK = "VOTE#2026-11-20"
```

```text
// FIX: many values, written evenly
PK = "VOTE#2026-11-20#" + (voterId mod 10)
```

Kết quả đọc giống nhau, nhưng thiết kế sai dồn mọi phiếu trong ngày vào một partition, tức tối đa 1000 WCU (write capacity unit, đơn vị ghi) mỗi giây cho cả ngày. Thêm hậu tố `voterId mod 10` tạo 10 giá trị khóa, rải ra tối đa 10 partition.

Tin rằng on-demand xóa mọi giới hạn:

```text
// WRONG: "on-demand scales, so one hot key is fine"
1200 writes/s on PK = "STORE#big" in an on-demand table -> throttled above 1000 WCU
```

On-demand co giãn tổng throughput của bảng, không nâng trần của một partition. Cách sửa vẫn là rải khóa.

## Tóm tắt

- Partition key được băm để chọn partition; sort key thì không.
- Item cùng partition key là một item collection, sắp theo sort key.
- Mỗi partition: tối đa 3000 RCU và 1000 WCU mỗi giây, ở mọi chế độ capacity.
- Tải phải rải đều trên nhiều giá trị partition key, nếu không một partition nóng sẽ throttle cả bảng.

# EN

## Opening

The voting table is configured for 40,000 writes per second, yet on election day it throttles at 1,200 writes per second. The culprit is not total capacity but where the data actually lives. Where does each item go, and why does that decide the speed?

## Key idea

DynamoDB splits a table's data into many **partitions**: each partition is an allocation of SSD storage, replicated across several Availability Zones. You never manage partitions yourself. On a write, the **partition key** value goes through an internal hash function, and the hash output picks the partition. The sort key is not hashed: items with the same partition key sit close together, in ascending sort key order, and that is an **item collection**.

DynamoDB adds partitions when you raise throughput beyond what the current partitions support, or when a partition fills up. Without an LSI, a large collection can also be split over several partitions.

Each partition handles at most **3000 read units** and **1000 write units** per second. Going over that on one partition can be throttled (the request is refused for now and must be retried), even when the table as a whole has spare capacity.

Many people think the table's total capacity is the only number to worry about. In fact the whole table's speed depends on whether the load is spread over many partition key values. A partition key with only a few values (today's date, one big store) piles the load in one place.

The in-browser engine is a single node with no real partitions and no throttling, so this lesson does not run in the browser yet: a diagram and questions replace the lab.

## Syntax

```text
partition = hash(partition key)          -- sort key is not hashed
per partition, per second: 3000 RCU and 1000 WCU at most
item collection = all items with the same partition key, sorted by sort key
```

- Partition key: picks the partition, so it needs many values used evenly.
- Sort key: only orders items inside the collection.
- The per-partition ceiling applies to on-demand and provisioned alike.

## Example

The `Votes` table stores votes by day. With the date as partition key, every vote of the day goes to one partition; 1500 votes per second, each under 1 KB, is 1500 WCU, above 1000: all 1500 writes per second for `VOTE#2026-11-20` pile onto one hot partition.

```text
PK = "VOTE#2026-11-20"                       one value for the whole day
PK = "VOTE#2026-11-20#0" ... "VOTE#2026-11-20#9"   ten values for the same day
```

Adding a suffix after the date (`VOTE#2026-11-20#0`, `VOTE#2026-11-20#1`…) multiplies the partition key values; each value is hashed to its own partition and the load spreads. Lesson 4 does this in a lab that runs on dynoxide.

On the other hand, a user id as partition key has millions of values, each with only a few operations per second. No partition comes near its ceiling, so the table can take a large total load. The diagram below goes step by step: hashing the key, an even load, one hot key, then spreading the hot key with a suffix.

## Common mistakes

Choosing a partition key with few values:

```text
// WRONG: one value per day, every write of the day hits one partition
PK = "VOTE#2026-11-20"
```

```text
// FIX: many values, written evenly
PK = "VOTE#2026-11-20#" + (voterId mod 10)
```

Reads give the same data, but the wrong design piles every vote of the day into one partition, that is at most 1000 WCU (write capacity unit) per second for the whole day. The `voterId mod 10` suffix makes 10 key values, spread over up to 10 partitions.

Believing on-demand removes every limit:

```text
// WRONG: "on-demand scales, so one hot key is fine"
1200 writes/s on PK = "STORE#big" in an on-demand table -> throttled above 1000 WCU
```

On-demand scales the table's total throughput; it does not raise one partition's ceiling. The fix is still to spread the key.

## Recap

- The partition key is hashed to pick a partition; the sort key is not.
- Items with the same partition key form an item collection, sorted by sort key.
- Each partition: at most 3000 RCU and 1000 WCU per second, in every capacity mode.
- Spread the load over many partition key values, or one hot partition throttles the whole table.
