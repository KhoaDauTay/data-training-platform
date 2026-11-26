---
id: e-dy-l5-03
engine: dynamodb
level: L5
module: global-ops
title: "Global tables: MREC hay MRSC"
title_en: "Global tables: MREC or MRSC"
kind: concept
runtime: docs
minutes: 8
figures: [{ name: dy-global-lww, at: example }]
objectives:
  - { vi: "Phân biệt nhất quán cuối cùng đa vùng (MREC, mặc định) và nhất quán mạnh đa vùng (MRSC)", en: "Tell multi-Region eventual consistency (MREC, the default) from multi-Region strong consistency (MRSC)" }
  - { vi: "Biết cách MREC giải xung đột (last writer wins) và các giới hạn của MRSC", en: "Know how MREC resolves conflicts (last writer wins) and the limits of MRSC" }
requires: [e-dy-l4-11]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/V2globaltables_HowItWorks.html
quiz:
  - q: { vi: "Ứng dụng thanh toán chạy ở hai vùng, yêu cầu RPO bằng 0 và đọc mạnh ở vùng nào cũng thấy bản mới nhất. Chọn gì?", en: "A payments app runs in two Regions, needs an RPO of zero and strong reads that see the latest version in any Region. Which choice?" }
    options:
      - { vi: "MREC, vì là mặc định", en: "MREC, because it is the default" }
      - { vi: "MRSC: ba vùng (ba bản sao, hoặc hai bản sao và một witness), ghi chậm hơn", en: "MRSC: three Regions (three replicas, or two replicas and a witness), slower writes" }
      - { vi: "Một bảng một vùng và PITR", en: "A single-Region table with PITR" }
    answer: 1
    trap: 0
    why: { vi: "MRSC đồng bộ mỗi lần ghi sang ít nhất một vùng khác trước khi trả về, cho RPO 0. Nó phải triển khai đúng ba vùng; hai bản sao cộng một witness là cách cho ứng dụng hai vùng.", en: "MRSC replicates each write to at least one other Region before returning, giving an RPO of zero. It must span exactly three Regions; two replicas plus a witness is the way for a two-Region app." }
  - q: { vi: "Bảng MREC: cùng một item bị sửa ở Singapore và Tokyo gần như cùng lúc. Kết quả cuối?", en: "An MREC table: the same item is changed in Singapore and Tokyo almost at once. The final result?" }
    options:
      - { vi: "Cả hai lần ghi bị từ chối", en: "Both writes are rejected" }
      - { vi: "Mọi bản sao hội tụ về lần ghi có dấu thời gian nội bộ muộn nhất (last writer wins)", en: "Every replica converges to the write with the latest internal timestamp (last writer wins)" }
      - { vi: "Hai phiên bản được giữ song song", en: "Both versions are kept side by side" }
    answer: 1
    why: { vi: "MREC giải xung đột theo từng item bằng last writer wins. MRSC thì khác: lần ghi va chạm bị từ chối với `ReplicatedWriteConflictException` và có thể thử lại.", en: "MREC resolves conflicts per item with last writer wins. MRSC differs: a colliding write is refused with `ReplicatedWriteConflictException` and can be retried." }
---

## Mở bài

Ứng dụng của bạn có khách ở Singapore và Tokyo, và một Region sập thì cả hai nơi đều không mua được hàng. Bạn muốn mỗi vùng đọc ghi ngay tại chỗ và sống sót khi một vùng mất. Đổi lại phải chấp nhận điều gì?

## Ý chính

**Global table** sao chép một bảng sang nhiều Region; mỗi Region giữ một bản sao (replica), đọc ghi được ở mọi bản sao. SLA 99,999 %, so với 99,99 % của bảng một vùng. Chế độ nhất quán chọn lúc tạo và **không đổi được** sau đó.

**MREC** (mặc định): sao chép **bất đồng bộ**, thường dưới một giây. Xung đột trên cùng item giải bằng **last writer wins** theo dấu thời gian nội bộ. Đọc mạnh có thể thấy dữ liệu cũ nếu item vừa sửa ở vùng khác. RPO bằng độ trễ sao chép. Transaction chỉ nguyên khối trong Region gọi nó; vùng khác có thể thấy transaction xong một nửa.

**MRSC**: mỗi lần ghi đồng bộ sang ít nhất một vùng khác trước khi trả về; đọc mạnh ở mọi bản sao thấy bản mới nhất; **RPO bằng 0**. Phải đúng **ba** vùng (ba bản sao, hoặc hai bản sao và một witness). Ghi va chạm bị từ chối với `ReplicatedWriteConflictException`. Không hỗ trợ TTL, LSI và transaction.

Nhiều người nghĩ đọc mạnh (`ConsistentRead: true`) trên MREC thấy mọi lần ghi ở mọi vùng. Thật ra đọc mạnh chỉ mạnh trong Region đó; muốn thấy bản mới nhất ở mọi vùng thì cần MRSC.

Global table chỉ có trên AWS thật, nên bài này chưa chạy được trong trình duyệt.

## Cú pháp

```text
UpdateTable { TableName, ReplicaUpdates: [ { Create: { RegionName: "ap-northeast-1" } } ] }
UpdateTable { TableName, ReplicaUpdates: [...], MultiRegionConsistency: EVENTUAL | STRONG }
GlobalTableWitnessUpdates: [ { Create: { RegionName } } ]      (MRSC, 2 replicas + witness)
```

- `ReplicaUpdates`: thêm hay bớt bản sao ở một Region.
- `MultiRegionConsistency`: `EVENTUAL` = MREC, `STRONG` = MRSC; đặt khi tạo global table (bảng còn rỗng).
- Witness: giữ dữ liệu sao chép để bỏ phiếu, không phục vụ đọc ghi.

## Ví dụ

Chọn chế độ theo nhu cầu:

```text
need                                   choose
low write latency, stale reads OK      MREC
RPO = 0, strong reads in every Region  MRSC (3 Regions, or 2 + witness)
uses TTL or transactions               MREC
```

Hai vùng cùng sửa một item trên MREC: Singapore ghi `stock = 4` lúc 12:00:00.100, Tokyo ghi `stock = 7` lúc 12:00:00.180. Sau khi sao chép, mọi bản sao có 7 và lần ghi của Singapore mất, như hình dưới.

## Lỗi hay gặp

Giữ bộ đếm bằng đọc rồi ghi ở hai vùng trên MREC:

```text
// WRONG: both Regions read stock = 5, each writes 5 - 1
Singapore: SET stock = 4      Tokyo: SET stock = 4      -> final 4, two items sold
```

```text
// FIX: send writes for one item to one Region, or use an atomic counter there
Singapore only: SET stock = stock - 1 (twice)            -> final 3
```

Tin rằng có thể đổi chế độ sau:

```text
// WRONG: "start with MREC, switch to MRSC when we need RPO 0"
UpdateTable { MultiRegionConsistency: STRONG }   on an existing MREC global table
```

```text
// FIX: decide at creation; moving means a new global table and a data migration
new empty table: UpdateTable { ReplicaUpdates: [...], MultiRegionConsistency: STRONG }, then copy the data
```

## Tóm tắt

- Global table = bản sao đọc ghi được ở nhiều Region, SLA 99,999 %.
- MREC: bất đồng bộ, last writer wins, RPO bằng độ trễ sao chép.
- MRSC: RPO 0 và đọc mạnh ở mọi vùng, cần đúng ba vùng, không TTL, LSI, transaction.
- Chế độ chọn lúc tạo; ghi cùng item ở nhiều vùng trên MREC có thể mất một lần ghi.

# EN

## Opening

Your app has customers in Singapore and Tokyo, and when one Region goes down nobody can buy anything. You want each Region to read and write locally and survive the loss of a Region. What must you accept in return?

## Key idea

A **global table** replicates a table across several Regions; each Region holds a replica, readable and writable everywhere. SLA 99.999%, against 99.99% for a single-Region table. The consistency mode is chosen at creation and **cannot be changed** afterwards.

**MREC** (default): **asynchronous** replication, usually under a second. Conflicts on the same item are resolved with **last writer wins** by an internal timestamp. A strong read may return stale data if the item was just changed in another Region. RPO equals the replication delay. Transactions are atomic only in the Region that ran them; other Regions may see a half-applied transaction.

**MRSC**: each write is replicated to at least one other Region before returning; strong reads on any replica see the latest version; **RPO of zero**. It must span exactly **three** Regions (three replicas, or two replicas and a witness). A colliding write is refused with `ReplicatedWriteConflictException`. No TTL, no LSIs and no transactions.

Many people think a strong read (`ConsistentRead: true`) on MREC sees every write in every Region. In fact a strong read is strong only within that Region; to see the latest version in every Region you need MRSC.

Global tables exist only on real AWS, so this lesson does not run in the browser yet.

## Syntax

```text
UpdateTable { TableName, ReplicaUpdates: [ { Create: { RegionName: "ap-northeast-1" } } ] }
UpdateTable { TableName, ReplicaUpdates: [...], MultiRegionConsistency: EVENTUAL | STRONG }
GlobalTableWitnessUpdates: [ { Create: { RegionName } } ]      (MRSC, 2 replicas + witness)
```

- `ReplicaUpdates`: add or remove a replica in a Region.
- `MultiRegionConsistency`: `EVENTUAL` = MREC, `STRONG` = MRSC; set when the global table is created (the table still empty).
- Witness: holds replicated data to vote, serves no reads or writes.

## Example

Choosing the mode from the need:

```text
need                                   choose
low write latency, stale reads OK      MREC
RPO = 0, strong reads in every Region  MRSC (3 Regions, or 2 + witness)
uses TTL or transactions               MREC
```

Two Regions changing the same item on MREC: Singapore writes `stock = 4` at 12:00:00.100, Tokyo writes `stock = 7` at 12:00:00.180. After replication every replica has 7 and the Singapore write is lost, as the figure below shows.

## Common mistakes

Keeping a counter by read-then-write in two Regions on MREC:

```text
// WRONG: both Regions read stock = 5, each writes 5 - 1
Singapore: SET stock = 4      Tokyo: SET stock = 4      -> final 4, two items sold
```

```text
// FIX: send writes for one item to one Region, or use an atomic counter there
Singapore only: SET stock = stock - 1 (twice)            -> final 3
```

Believing the mode can be switched later:

```text
// WRONG: "start with MREC, switch to MRSC when we need RPO 0"
UpdateTable { MultiRegionConsistency: STRONG }   on an existing MREC global table
```

```text
// FIX: decide at creation; moving means a new global table and a data migration
new empty table: UpdateTable { ReplicaUpdates: [...], MultiRegionConsistency: STRONG }, then copy the data
```

## Recap

- A global table = replicas readable and writable in several Regions, SLA 99.999%.
- MREC: asynchronous, last writer wins, RPO equals the replication delay.
- MRSC: RPO 0 and strong reads everywhere, exactly three Regions, no TTL, LSIs or transactions.
- The mode is chosen at creation; writing one item in several Regions on MREC can lose a write.
