---
id: e-dy-l4-02
engine: dynamodb
level: L4
module: scale
title: "Burst, adaptive capacity và giới hạn của chúng"
title_en: "Burst, adaptive capacity and where they stop"
kind: concept
runtime: docs
minutes: 7
objectives:
  - { vi: "Giải thích burst capacity giữ tối đa 300 giây capacity chưa dùng", en: "Explain that burst capacity keeps up to 300 seconds of unused capacity" }
  - { vi: "Giải thích adaptive capacity tăng throughput cho partition nóng ngay lập tức và cô lập item nóng", en: "Explain that adaptive capacity instantly raises throughput for a hot partition and isolates hot items" }
  - { vi: "Biết trần cứng còn lại: 3000 RCU và 1000 WCU cho một khóa chính, và không tách collection khi bảng có LSI", en: "Know the hard ceiling that remains: 3000 RCU and 1000 WCU for one primary key, and no collection split when the table has an LSI" }
requires: [e-dy-l4-01]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/burst-adaptive-capacity.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.Partitions.html
viz: dy-partitions
quiz:
  - q: { vi: "Một item duy nhất nhận 1500 thao tác ghi mỗi giây, mỗi lần dưới 1 KB. Adaptive capacity có cứu được không?", en: "A single item receives 1500 writes per second, each under 1 KB. Can adaptive capacity save it?" }
    options:
      - { vi: "Có, nó tách item ra nhiều partition", en: "Yes, it splits the item over several partitions" }
      - { vi: "Không, một khóa chính tối đa nhận 1000 WCU kể cả khi được cô lập trong partition riêng", en: "No, one primary key gets at most 1000 WCU even when isolated in its own partition" }
      - { vi: "Có, nếu bảng ở chế độ on-demand", en: "Yes, if the table is in on-demand mode" }
    answer: 1
    why: { vi: "Adaptive capacity có thể để một partition chỉ chứa đúng item nóng đó, nhưng trần vẫn là 3000 RCU và 1000 WCU cho khóa chính ấy. Một item không thể chia nhỏ hơn: phải đổi thiết kế (shard khóa).", en: "Adaptive capacity can leave that hot item alone in its own partition, but the ceiling is still 3000 RCU and 1000 WCU for that primary key. One item cannot be split further: the design has to change (shard the key)." }
  - q: { vi: "Bảng có LSI. Một item collection rất nóng. Điều gì đúng?", en: "The table has an LSI. One item collection is very hot. What is true?" }
    options:
      - { vi: "Adaptive capacity không tách item collection qua nhiều partition khi bảng có LSI", en: "Adaptive capacity does not split an item collection over several partitions when the table has an LSI" }
      - { vi: "LSI làm collection được tách nhanh hơn", en: "The LSI makes the collection split faster" }
      - { vi: "LSI không ảnh hưởng gì tới việc tách", en: "The LSI has no effect on splitting" }
    answer: 0
    why: { vi: "Docs chính thức của AWS nói rõ adaptive capacity không tách collection khi bảng có local secondary index. Đó là một lý do chọn GSI thay cho LSI khi tải dồn vào ít partition key.", en: "The AWS docs state that adaptive capacity does not split item collections when the table has a local secondary index. That is one reason to prefer a GSI over an LSI when load piles onto few partition keys." }
---

## Ý chính

DynamoDB có hai cơ chế đỡ cho tải không đều. Cả hai đều có giới hạn.

- **Burst capacity**: khi bạn không dùng hết throughput, DynamoDB giữ lại tối đa **5 phút (300 giây)** capacity chưa dùng để đỡ một đợt tăng ngắn. DynamoDB cũng có thể tiêu phần này cho việc bảo trì nền mà không báo trước, nên đừng tính nó vào kế hoạch.
- **Adaptive capacity**: bật sẵn cho mọi bảng, không tốn thêm tiền. Khi một partition nhận nhiều tải hơn phần chia đều, DynamoDB **tăng ngay** throughput cho partition đó, miễn là không vượt tổng capacity của bảng và trần của partition.
- **Cô lập item nóng**: nếu vài item nhận tải lệch, DynamoDB sắp xếp lại để chúng không nằm chung partition. Có thể tới mức một partition chỉ chứa một item; khi đó item ấy nhận tối đa **3000 RCU và 1000 WCU**.
- Adaptive capacity **không tách** item collection khi bảng có **LSI**.

Kết luận: adaptive capacity che được tải lệch vừa phải, không che được một khóa duy nhất bị ghi quá 1000 WCU. Lúc đó phải đổi thiết kế khóa (bài 4, bài 5).

Throttle, burst và adaptive capacity chỉ có trên DynamoDB thật, nên bài này **chưa chạy được trong trình duyệt**.

## Ví dụ

Ví dụ của AWS: bảng provisioned 400 WCU chia đều cho 4 partition, mỗi partition 100 WCU. Partition 1–3 nhận 50 WCU/giây, partition 4 nhận 150 WCU/giây.

```text
P1 50/100   P2 50/100   P3 50/100   P4 150/100  -> burst, then throttle
adaptive capacity: P4 -> 150/150                -> no throttle (table total 300 <= 400)
```

Partition 4 dùng burst trong lúc chờ, rồi adaptive capacity nâng nó lên đủ 150 WCU vì tổng của bảng (300) vẫn dưới 400.

# EN

## Key idea

DynamoDB has two mechanisms that absorb uneven load. Both have limits.

- **Burst capacity**: when you do not use all of your throughput, DynamoDB keeps up to **5 minutes (300 seconds)** of unused capacity to absorb a short spike. DynamoDB may also spend it on background maintenance without notice, so do not plan on it.
- **Adaptive capacity**: on for every table, at no extra cost. When one partition gets more than its even share, DynamoDB **instantly** raises that partition's throughput, as long as the table's total capacity and the partition ceiling are not exceeded.
- **Isolating hot items**: if a few items get skewed traffic, DynamoDB rebalances so they do not share a partition. This can go as far as one partition holding one item; that item then gets at most **3000 RCU and 1000 WCU**.
- Adaptive capacity does **not split** item collections when the table has an **LSI**.

Takeaway: adaptive capacity hides moderate skew, not a single key written above 1000 WCU. Then the key design has to change (lessons 4 and 5).

Throttling, burst and adaptive capacity only exist on real DynamoDB, so this lesson does not run in the browser yet.

## Example

The AWS example: a provisioned table with 400 WCU spread evenly over 4 partitions, 100 WCU each. Partitions 1 to 3 receive 50 WCU per second, partition 4 receives 150 WCU per second.

```text
P1 50/100   P2 50/100   P3 50/100   P4 150/100  -> burst, then throttle
adaptive capacity: P4 -> 150/150                -> no throttle (table total 300 <= 400)
```

Partition 4 lives on burst capacity for a while, then adaptive capacity raises it to the full 150 WCU because the table total (300) is still below 400.
