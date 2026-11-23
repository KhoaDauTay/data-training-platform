---
id: e-dy-l4-06
engine: dynamodb
level: L4
module: scale
title: "On-demand hay provisioned, và ước lượng chi phí"
title_en: "On-demand or provisioned, and estimating cost"
kind: concept
runtime: docs
minutes: 9
objectives:
  - { vi: "Chọn chế độ capacity theo hình dạng tải", en: "Choose a capacity mode from the shape of the load" }
  - { vi: "Ước lượng RCU/WCU mỗi giây của một ứng dụng từ danh sách mẫu truy cập", en: "Estimate an application's RCU/WCU per second from its list of access patterns" }
  - { vi: "Biết chế độ nào cũng không vượt được trần của một partition", en: "Know that no mode goes past the ceiling of one partition" }
requires: [e-dy-l4-03]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/capacity-mode.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/read-write-operations.html
quiz:
  - q: { vi: "Ứng dụng mới, chưa biết lượng truy cập, có ngày vắng ngày đông. Chọn chế độ nào?", en: "A new application, traffic unknown, quiet days and busy days. Which mode?" }
    options:
      - { vi: "On-demand: mặc định và được khuyên dùng cho đa số tải, trả theo request", en: "On-demand: the default and recommended for most workloads, pay per request" }
      - { vi: "Provisioned với số RCU/WCU cao nhất có thể", en: "Provisioned with the highest RCU/WCU possible" }
      - { vi: "Provisioned với 1 RCU và 1 WCU cho rẻ", en: "Provisioned with 1 RCU and 1 WCU to keep it cheap" }
    answer: 0
    trap: 2
    why: { vi: "Đặt 1 RCU và 1 WCU nghe rẻ, nhưng provisioned trả theo phần đã đặt và từ chối phần vượt: ngày đông sẽ throttle. On-demand không cần dự báo capacity và tự co giãn; provisioned hợp khi tải đều, tăng trưởng dự đoán được.", en: "Setting 1 RCU and 1 WCU sounds cheap, but provisioned pays for what you set and refuses what goes over: busy days will throttle. On-demand needs no capacity forecast and scales by itself; provisioned fits steady load with predictable growth." }
  - q: { vi: "Mỗi giây: 200 lần ghi item 0,8 KB và 600 lần đọc nhất quán cuối cùng item 2 KB. Cần bao nhiêu WCU và RCU?", en: "Per second: 200 writes of a 0.8 KB item and 600 eventually consistent reads of a 2 KB item. How many WCU and RCU?" }
    options:
      - { vi: "200 WCU và 300 RCU", en: "200 WCU and 300 RCU" }
      - { vi: "160 WCU và 600 RCU", en: "160 WCU and 600 RCU" }
      - { vi: "200 WCU và 600 RCU", en: "200 WCU and 600 RCU" }
    answer: 0
    trap: 1
    why: { vi: "160 nghe hợp lý nếu tính theo đúng 0,8 KB, nhưng ghi làm tròn lên 1 KB: 200 × 1 = 200 WCU. Đọc làm tròn 2 KB lên 4 KB = 1 RCU nếu mạnh, nửa RCU nếu cuối cùng: 600 × 0,5 = 300 RCU.", en: "160 sounds right if you count exactly 0.8 KB, but writes round up to 1 KB: 200 × 1 = 200 WCU. Reads round 2 KB up to 4 KB = 1 RCU if strong, half if eventual: 600 × 0.5 = 300 RCU." }
---
## Mở bài

Sếp hỏi: "Bảng này mỗi tháng tốn bao nhiêu, và có nên đặt trước capacity không?" Bạn chưa có hóa đơn nào, chỉ có danh sách việc ứng dụng sẽ làm. Bài này đổi danh sách đó ra con số và chọn chế độ.

## Ý chính

DynamoDB có hai chế độ throughput, chọn theo từng bảng. On-demand là chế độ mặc định và được AWS khuyên dùng cho đa số tải: không khai báo capacity, trả tiền theo từng request đọc/ghi, tự co giãn. Provisioned: bạn đặt số RCU/WCU mỗi giây và trả theo giờ cho phần đã đặt, dùng hay không; phần vượt có thể bị throttle. Nó hợp khi tải đều, tăng trưởng dự đoán được, và thường đi cùng auto scaling.

Ước lượng chi phí theo ba bước: liệt kê mẫu truy cập và số lần mỗi giây của từng mẫu; đổi từng mẫu ra RCU/WCU (cỡ item, kiểu đọc, transaction thì nhân 2); cộng lại cho cả bảng, rồi xem khóa nào gánh phần lớn nhất để quyết định shard.

Nhiều người nghĩ on-demand nghĩa là không còn giới hạn nào. Thật ra phép tính đơn vị vẫn giống nhau, và trần mỗi partition (3000 RCU / 1000 WCU) vẫn còn: on-demand không cứu được một khóa nóng.

Bài này nói về hóa đơn AWS nên chưa chạy được trong trình duyệt; `ConsumedCapacity` trong các lab là con số để bạn tập đối chiếu.

## Cú pháp

```text
{"op": "CreateTable", "input": {..., "BillingMode": "PAY_PER_REQUEST"}}
{"op": "CreateTable", "input": {..., "BillingMode": "PROVISIONED",
  "ProvisionedThroughput": {"ReadCapacityUnits": <n>, "WriteCapacityUnits": <n>}}}
```

- `PAY_PER_REQUEST`: on-demand, không cần `ProvisionedThroughput`.
- `PROVISIONED`: phải có `ProvisionedThroughput`; GSI cũng có capacity riêng.
- Đổi chế độ được về sau, có giới hạn số lần đổi.

## Ví dụ

Ba mẫu truy cập của một trò chơi, đổi ra đơn vị:

```text
pattern            per second  size        type         units
add a score        200         0.8 KB      write        200 x 1     = 200 WCU
open a profile     600         2 KB        eventual     600 x 0.5   = 300 RCU
transfer coins     20          2 x 0.5 KB  transaction  20 x 2 x 2  = 80 WCU
total                                                   280 WCU, 300 RCU
```

Chuyển tiền là transaction ghi hai item, mỗi item tính gấp đôi.

Chọn chế độ theo hình dạng tải:

```text
steady 280 WCU all day, slow growth  -> provisioned + auto scaling
spikes to 10x at 8 pm, idle at night  -> on-demand
new app, unknown traffic             -> on-demand
```

## Lỗi hay gặp

Tính theo cỡ item thật thay vì cỡ đã làm tròn:

```text
// WRONG: 200 writes x 0.8 KB = 160 WCU
```

```text
// FIX: each write rounds up to 1 KB -> 200 x 1 = 200 WCU
```

Sai 20 % thì bảng provisioned bị throttle đúng lúc đông nhất.

Đặt provisioned thấp để tiết kiệm:

```text
// WRONG: PROVISIONED with 5 WCU for a load that peaks at 280 WCU
```

```text
// FIX: on-demand, or provisioned sized for the peak with auto scaling
```

Provisioned không tự vượt phần đã đặt; phần dư chỉ đỡ được nhờ burst ngắn rồi bị throttle.

## Tóm tắt

- On-demand: mặc định, trả theo request, tự co giãn.
- Provisioned: đặt RCU/WCU, trả theo giờ, hợp tải đều và dự đoán được.
- Ước lượng: mẫu truy cập × số lần mỗi giây × đơn vị đã làm tròn.
- Chế độ nào cũng giữ trần 3000 RCU / 1000 WCU mỗi partition.

# EN

## Opening

Your manager asks: "How much will this table cost each month, and should we reserve capacity?" You have no bill yet, only the list of what the application will do. This lesson turns that list into numbers and picks a mode.

## Key idea

DynamoDB has two throughput modes, chosen per table. On-demand is the default mode and the one AWS recommends for most workloads: no capacity to declare, you pay per read and write request, and it scales by itself. Provisioned: you set RCU/WCU per second and pay hourly for what you set, used or not; going over can be throttled. It fits steady load with predictable growth, usually paired with auto scaling.

Estimate cost in three steps: list the access patterns and how many times per second each runs; turn each pattern into RCU/WCU (item size, read type, times 2 for a transaction); add them up for the table, then see which key carries the biggest share to decide on sharding.

Many people think on-demand means there are no limits left. In fact the unit arithmetic is the same, and the per-partition ceiling (3000 RCU / 1000 WCU) still applies: on-demand does not rescue a hot key.

This lesson is about the AWS bill, so it does not run in the browser yet; `ConsumedCapacity` in the labs is the number you practise checking against.

## Syntax

```text
{"op": "CreateTable", "input": {..., "BillingMode": "PAY_PER_REQUEST"}}
{"op": "CreateTable", "input": {..., "BillingMode": "PROVISIONED",
  "ProvisionedThroughput": {"ReadCapacityUnits": <n>, "WriteCapacityUnits": <n>}}}
```

- `PAY_PER_REQUEST`: on-demand, no `ProvisionedThroughput` needed.
- `PROVISIONED`: needs `ProvisionedThroughput`; a GSI has its own capacity too.
- The mode can be changed later, with a limit on how often.

## Example

Three access patterns of a game, turned into units:

```text
pattern            per second  size        type         units
add a score        200         0.8 KB      write        200 x 1     = 200 WCU
open a profile     600         2 KB        eventual     600 x 0.5   = 300 RCU
transfer coins     20          2 x 0.5 KB  transaction  20 x 2 x 2  = 80 WCU
total                                                   280 WCU, 300 RCU
```

Transferring coins is a transaction writing two items, each counted twice.

Choosing the mode from the shape of the load:

```text
steady 280 WCU all day, slow growth  -> provisioned + auto scaling
spikes to 10x at 8 pm, idle at night  -> on-demand
new app, unknown traffic             -> on-demand
```

## Common mistakes

Counting the real item size instead of the rounded size:

```text
// WRONG: 200 writes x 0.8 KB = 160 WCU
```

```text
// FIX: each write rounds up to 1 KB -> 200 x 1 = 200 WCU
```

Being 20% short means a provisioned table throttles right at the busiest moment.

Setting provisioned low to save money:

```text
// WRONG: PROVISIONED with 5 WCU for a load that peaks at 280 WCU
```

```text
// FIX: on-demand, or provisioned sized for the peak with auto scaling
```

Provisioned does not go past what you set by itself; the excess is absorbed only by a short burst, then throttled.

## Recap

- On-demand: the default, pay per request, scales by itself.
- Provisioned: set RCU/WCU, pay hourly, fits steady and predictable load.
- Estimate: access pattern × times per second × rounded units.
- Every mode keeps the 3000 RCU / 1000 WCU ceiling per partition.
