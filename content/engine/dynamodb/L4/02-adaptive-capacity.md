---
id: e-dy-l4-02
engine: dynamodb
level: L4
module: scale
title: "Burst, adaptive capacity và giới hạn của chúng"
title_en: "Burst, adaptive capacity and where they stop"
kind: concept
runtime: docs
minutes: 8
objectives:
  - { vi: "Giải thích burst capacity giữ tối đa 300 giây capacity chưa dùng", en: "Explain that burst capacity keeps up to 300 seconds of unused capacity" }
  - { vi: "Giải thích adaptive capacity tăng throughput cho partition nóng ngay lập tức và cô lập item nóng", en: "Explain that adaptive capacity instantly raises throughput for a hot partition and isolates hot items" }
  - { vi: "Biết trần cứng còn lại: 3000 RCU và 1000 WCU cho một khóa chính, và không tách collection khi bảng có LSI", en: "Know the hard ceiling that remains: 3000 RCU and 1000 WCU for one primary key, and no collection split when the table has an LSI" }
requires: [e-dy-l4-01]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/burst-adaptive-capacity.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.Partitions.html
viz: dy-partitions
figures: [{ name: dy-adaptive-capacity, at: example }]
quiz:
  - q: { vi: "Một item duy nhất nhận 1500 thao tác ghi mỗi giây, mỗi lần dưới 1 KB. Adaptive capacity có cứu được không?", en: "A single item receives 1500 writes per second, each under 1 KB. Can adaptive capacity save it?" }
    options:
      - { vi: "Có, nó tách item ra nhiều partition", en: "Yes, it splits the item over several partitions" }
      - { vi: "Không, một khóa chính tối đa nhận 1000 WCU kể cả khi được cô lập trong partition riêng", en: "No, one primary key gets at most 1000 WCU even when isolated in its own partition" }
      - { vi: "Có, nếu bảng ở chế độ on-demand", en: "Yes, if the table is in on-demand mode" }
    answer: 1
    trap: 0
    why: { vi: "Adaptive capacity đúng là sắp lại partition, nhưng đơn vị nhỏ nhất nó di chuyển được là một item, không thể cắt một item ra nhiều partition. Item nóng nằm một mình một partition thì vẫn chỉ nhận tối đa 1000 WCU (write capacity unit, đơn vị ghi 1 KB): 1500 lần ghi × 1 WCU = 1500, nên khoảng 500 lần mỗi giây bị throttle. On-demand cũng không nâng trần một khóa. Phải đổi thiết kế: shard khóa thành nhiều khóa con.", en: "Adaptive capacity does rebalance partitions, but the smallest unit it can move is one item; it cannot cut one item over several partitions. Alone in its own partition, the hot item still gets at most 1000 WCU (write capacity unit, 1 KB): 1500 writes × 1 WCU = 1500, so about 500 writes per second are throttled. On-demand does not raise the one-key ceiling either. The design has to change: shard the key into several sub-keys." }
  - q: { vi: "Bảng có LSI. Một item collection rất nóng. Điều gì đúng?", en: "The table has an LSI. One item collection is very hot. What is true?" }
    options:
      - { vi: "Adaptive capacity không tách item collection qua nhiều partition khi bảng có LSI", en: "Adaptive capacity does not split an item collection over several partitions when the table has an LSI" }
      - { vi: "LSI làm collection được tách nhanh hơn", en: "The LSI makes the collection split faster" }
      - { vi: "LSI không ảnh hưởng gì tới việc tách", en: "The LSI has no effect on splitting" }
    answer: 0
    why: { vi: "Docs AWS ghi rõ: khi bảng có LSI (local secondary index, index phụ cục bộ), adaptive capacity không tách item collection qua nhiều partition, vì LSI phải giữ cả collection và các mục index của nó trên cùng một partition. Vậy LSI không làm việc tách nhanh hơn, và cũng không phải \"không ảnh hưởng\": nó chặn hẳn việc tách. Khi tải dồn vào ít partition key, đó là một lý do chọn GSI (global secondary index, index phụ toàn bảng), vốn được lưu riêng.", en: "The AWS docs are explicit: when the table has an LSI (local secondary index), adaptive capacity does not split an item collection over several partitions, because an LSI must keep the whole collection and its index entries on the same partition. So the LSI does not make splitting faster, and it is not \"no effect\" either: it blocks the split. When load piles onto few partition keys, that is one reason to prefer a GSI (global secondary index), which is stored separately." }
---
## Mở bài

Một chương trình khuyến mãi làm 10 % sản phẩm nhận 90 % lượt xem, nhưng bảng không throttle. Tuần sau, một bộ đếm lượt thích duy nhất bị ghi 1.500 lần mỗi giây và bảng throttle liên tục. DynamoDB đỡ được tải lệch tới đâu thì dừng?

## Ý chính

**Burst capacity**: khi bạn không dùng hết throughput, DynamoDB giữ lại tối đa 5 phút (300 giây) capacity chưa dùng để đỡ một đợt tăng ngắn. DynamoDB cũng có thể tiêu phần này cho việc bảo trì nền mà không báo trước, nên đừng tính nó vào kế hoạch.

**Adaptive capacity**: bật sẵn cho mọi bảng, không tốn thêm tiền. Khi một partition nhận nhiều hơn phần chia đều, DynamoDB tăng ngay throughput cho partition đó, miễn là không vượt tổng capacity của bảng và trần của partition. Nếu vài item nhận tải lệch, DynamoDB còn sắp lại để chúng không nằm chung partition, có thể tới mức một partition chỉ chứa một item. Adaptive capacity không tách item collection khi bảng có LSI.

Nhiều người nghĩ adaptive capacity xóa được mọi điểm nóng. Thật ra nó chỉ di chuyển được tới mức một item: item đó vẫn có trần 3000 RCU và 1000 WCU. Một khóa duy nhất bị ghi quá 1000 WCU thì phải đổi thiết kế khóa (bài 4, bài 5).

Throttle, burst và adaptive capacity chỉ có trên DynamoDB thật, nên bài này chưa chạy được trong trình duyệt.

## Cú pháp

```text
burst:     up to 300 s of unused capacity, may be spent on maintenance
adaptive:  hot partition gets more, while table total <= table capacity
isolation: hot items moved apart, down to 1 item per partition
ceiling:   one primary key <= 3000 RCU and <= 1000 WCU per second
```

- Burst: đệm ngắn, không có cam kết.
- Adaptive: tự động, tức thì, không có nút bật tắt.
- Trần một khóa: không cơ chế nào vượt được.

## Ví dụ

Ví dụ trong docs AWS: bảng provisioned 400 WCU chia đều cho 4 partition, mỗi partition 100 WCU. Partition 1–3 nhận 50 WCU/giây, partition 4 nhận 150 WCU/giây; sau đó cả tải dồn vào một item.

```text
table  provisioned 400 WCU, 4 partitions x 100 WCU
load   P1 50, P2 50, P3 50, P4 150 WCU per second
item   LIKES#post-1, 1500 writes per second
```

Partition 4 dùng burst trong lúc chờ, rồi adaptive capacity nâng nó lên đủ 150 WCU vì tổng của bảng (300) vẫn dưới 400.

Cùng bảng, nhưng tải dồn vào một item `LIKES#post-1`, 1500 lần ghi mỗi giây: item được cô lập trong partition riêng, nhận 1000 WCU, 500 bị throttle. Cô lập không giúp gì thêm: một item không thể chia nhỏ hơn. Hình dưới vẽ cả hai trường hợp.

## Lỗi hay gặp

Dựa vào burst cho một đợt tải dài:

```text
// WRONG: a 20-minute flash sale planned on burst capacity
burst holds at most 300 s of unused capacity, and may already be spent
```

```text
// FIX: plan capacity for the sale (or use on-demand) and spread hot keys
```

Burst đỡ vài giây tới vài phút, không phải cả buổi khuyến mãi.

Chờ adaptive capacity cứu một bộ đếm duy nhất:

```text
// WRONG: one counter item, 1500 writes/s, "adaptive capacity will handle it"
PK = "LIKES#post-1"
```

```text
// FIX: shard the counter and sum on read
PK = "LIKES#post-1#" + random(0..9)
```

1500 ghi mỗi giây chia cho mười khóa con là khoảng 150 ghi mỗi khóa: không khóa nào gần trần 1000 WCU (write capacity unit, đơn vị ghi). Muốn có tổng thì đọc đủ mười khóa con rồi cộng lại.

## Tóm tắt

- Burst giữ tối đa 300 giây capacity chưa dùng, nhưng có thể đã bị tiêu.
- Adaptive capacity tăng ngay throughput cho partition nóng, trong giới hạn của bảng.
- Item nóng có thể bị cô lập tới một item một partition, rồi dừng ở đó.
- Một khóa chính vẫn có trần 3000 RCU và 1000 WCU; LSI chặn việc tách collection.

# EN

## Opening

A promotion makes 10% of products get 90% of the views, yet the table does not throttle. A week later, one single like counter is written 1,500 times a second and the table throttles nonstop. How much skew can DynamoDB absorb, and where does it stop?

## Key idea

**Burst capacity**: when you do not use all of your throughput, DynamoDB keeps up to 5 minutes (300 seconds) of unused capacity to absorb a short spike. DynamoDB may also spend it on background maintenance without notice, so do not plan on it.

**Adaptive capacity**: on for every table, at no extra cost. When one partition gets more than its even share, DynamoDB instantly raises that partition's throughput, as long as the table's total capacity and the partition ceiling are not exceeded. If a few items get skewed traffic, DynamoDB also rebalances so they do not share a partition, possibly down to one item per partition. Adaptive capacity does not split item collections when the table has an LSI.

Many people think adaptive capacity removes every hot spot. In fact it can only go down to one item: that item still has a ceiling of 3000 RCU and 1000 WCU. A single key written above 1000 WCU needs a new key design (lessons 4 and 5).

Throttling, burst and adaptive capacity only exist on real DynamoDB, so this lesson does not run in the browser yet.

## Syntax

```text
burst:     up to 300 s of unused capacity, may be spent on maintenance
adaptive:  hot partition gets more, while table total <= table capacity
isolation: hot items moved apart, down to 1 item per partition
ceiling:   one primary key <= 3000 RCU and <= 1000 WCU per second
```

- Burst: a short buffer, with no promise.
- Adaptive: automatic, instant, no switch to turn on.
- The one-key ceiling: no mechanism goes past it.

## Example

The example in the AWS docs: a provisioned table with 400 WCU spread evenly over 4 partitions, 100 WCU each. Partitions 1 to 3 receive 50 WCU per second, partition 4 receives 150 WCU per second; then the whole load piles onto one item.

```text
table  provisioned 400 WCU, 4 partitions x 100 WCU
load   P1 50, P2 50, P3 50, P4 150 WCU per second
item   LIKES#post-1, 1500 writes per second
```

Partition 4 lives on burst capacity for a while, then adaptive capacity raises it to the full 150 WCU because the table total (300) is still below 400.

The same table, but the load piles onto one item, `LIKES#post-1`, at 1500 writes per second: the item is isolated in its own partition, 1000 WCU are accepted and 500 are throttled. Isolation does not help any further: one item cannot be split smaller. The figure below draws both cases.

## Common mistakes

Relying on burst for a long load:

```text
// WRONG: a 20-minute flash sale planned on burst capacity
burst holds at most 300 s of unused capacity, and may already be spent
```

```text
// FIX: plan capacity for the sale (or use on-demand) and spread hot keys
```

Burst absorbs seconds to a few minutes, not a whole promotion.

Waiting for adaptive capacity to save a single counter:

```text
// WRONG: one counter item, 1500 writes/s, "adaptive capacity will handle it"
PK = "LIKES#post-1"
```

```text
// FIX: shard the counter and sum on read
PK = "LIKES#post-1#" + random(0..9)
```

1500 writes per second over ten sub-keys is about 150 writes per key: no key comes near the 1000 WCU (write capacity unit) ceiling. To get the total, read all ten sub-keys and add them up.

## Recap

- Burst keeps up to 300 seconds of unused capacity, but it may already be spent.
- Adaptive capacity instantly raises a hot partition's throughput, within the table's limits.
- Hot items can be isolated down to one item per partition, and it stops there.
- One primary key still has a 3000 RCU and 1000 WCU ceiling; an LSI blocks collection splits.
