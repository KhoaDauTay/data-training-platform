---
id: e-dy-l4-06
engine: dynamodb
level: L4
module: scale
title: "On-demand hay provisioned, và ước lượng chi phí"
title_en: "On-demand or provisioned, and estimating cost"
kind: concept
runtime: docs
minutes: 8
objectives:
  - { vi: "Chọn chế độ capacity theo hình dạng tải", en: "Choose a capacity mode from the shape of the load" }
  - { vi: "Ước lượng RCU/WCU mỗi giây của một ứng dụng từ danh sách mẫu truy cập", en: "Estimate an application's RCU/WCU per second from its list of access patterns" }
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
    why: { vi: "On-demand không cần dự báo capacity và tự co giãn. Provisioned hợp khi tải đều, tăng trưởng dự đoán được, vì bạn trả theo capacity đã đặt mỗi giờ dù có dùng hay không.", en: "On-demand needs no capacity forecast and scales by itself. Provisioned fits steady load with predictable growth, since you pay hourly for the capacity you set whether you use it or not." }
  - q: { vi: "Mỗi giây: 200 lần ghi item 0,8 KB và 600 lần đọc nhất quán cuối cùng item 2 KB. Cần bao nhiêu WCU và RCU?", en: "Per second: 200 writes of a 0.8 KB item and 600 eventually consistent reads of a 2 KB item. How many WCU and RCU?" }
    options:
      - { vi: "200 WCU và 300 RCU", en: "200 WCU and 300 RCU" }
      - { vi: "160 WCU và 600 RCU", en: "160 WCU and 600 RCU" }
      - { vi: "200 WCU và 600 RCU", en: "200 WCU and 600 RCU" }
    answer: 0
    why: { vi: "Ghi làm tròn 0,8 KB lên 1 KB: 200 × 1 = 200 WCU. Đọc làm tròn 2 KB lên 4 KB = 1 RCU nếu mạnh, nửa RCU nếu cuối cùng: 600 × 0,5 = 300 RCU.", en: "Writes round 0.8 KB up to 1 KB: 200 × 1 = 200 WCU. Reads round 2 KB up to 4 KB = 1 RCU if strong, half if eventual: 600 × 0.5 = 300 RCU." }
---

## Ý chính

DynamoDB có hai chế độ throughput, chọn theo từng bảng:

- **On-demand**: chế độ **mặc định và được khuyên dùng** cho đa số tải. Không khai báo capacity, trả tiền theo từng request đọc/ghi, tự co giãn.
- **Provisioned**: bạn đặt số RCU/WCU mỗi giây và trả theo giờ cho phần đã đặt, dùng hay không. Hợp khi tải đều, tăng trưởng dự đoán được; thường đi cùng auto scaling.

Dù chọn chế độ nào, phép tính đơn vị vẫn giống nhau, và trần mỗi partition (3000 RCU / 1000 WCU) vẫn còn. On-demand không cứu được một khóa nóng.

Ước lượng chi phí theo ba bước:

- liệt kê mẫu truy cập và số lần mỗi giây của từng mẫu;
- đổi từng mẫu ra RCU/WCU (cỡ item, kiểu đọc, transaction thì nhân 2);
- cộng lại cho cả bảng, rồi xem khóa nào gánh phần lớn nhất để quyết định shard.

Bài này nói về hóa đơn AWS nên **chưa chạy được trong trình duyệt**; `ConsumedCapacity` trong các lab là con số để bạn tập đối chiếu.

## Ví dụ

```text
pattern            per second  size    type       units
add a score        200         0.8 KB  write      200 x 1   = 200 WCU
open a profile     600         2 KB    eventual   600 x 0.5 = 300 RCU
transfer coins     20          2 x 0.5 KB  transaction  20 x 2 x 2 = 80 WCU
total                                              280 WCU, 300 RCU
```

# EN

## Key idea

DynamoDB has two throughput modes, chosen per table:

- **On-demand**: the **default and recommended** mode for most workloads. No capacity to declare, you pay per read and write request, it scales by itself.
- **Provisioned**: you set RCU/WCU per second and pay hourly for what you set, used or not. It fits steady load with predictable growth; usually paired with auto scaling.

Whichever mode you choose, the unit arithmetic is the same, and the per-partition ceiling (3000 RCU / 1000 WCU) still applies. On-demand does not rescue a hot key.

Estimate cost in three steps:

- list the access patterns and how many times per second each runs;
- turn each pattern into RCU/WCU (item size, read type, times 2 for a transaction);
- add them up for the table, then see which key carries the biggest share to decide on sharding.

This lesson is about the AWS bill, so it does not run in the browser yet; `ConsumedCapacity` in the labs is the number you practise checking against.

## Example

```text
pattern            per second  size    type       units
add a score        200         0.8 KB  write      200 x 1   = 200 WCU
open a profile     600         2 KB    eventual   600 x 0.5 = 300 RCU
transfer coins     20          2 x 0.5 KB  transaction  20 x 2 x 2 = 80 WCU
total                                              280 WCU, 300 RCU
```
