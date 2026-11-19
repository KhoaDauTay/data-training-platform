---
id: e-dy-l4-03
engine: dynamodb
level: L4
module: scale
title: "Tính xem partition nào sẽ nóng"
title_en: "Work out which partition will run hot"
kind: quiz
runtime: docs
minutes: 6
objectives:
  - { vi: "Đổi số thao tác mỗi giây thành RCU/WCU theo cỡ item và kiểu đọc", en: "Turn operations per second into RCU/WCU from item size and read type" }
  - { vi: "So với trần 3000 RCU / 1000 WCU của một partition và tính số shard tối thiểu", en: "Compare with the 3000 RCU / 1000 WCU ceiling of one partition and work out the minimum number of shards" }
requires: [e-dy-l4-01, e-dy-l4-02]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/read-write-operations.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/burst-adaptive-capacity.html
quiz:
  - q: { vi: "Một khóa nhận 4500 lần đọc nhất quán mạnh mỗi giây, item 3 KB. Partition chứa nó cần bao nhiêu RCU, có vượt trần không?", en: "One key receives 4500 strongly consistent reads per second, item size 3 KB. How many RCU does its partition need, and is it over the ceiling?" }
    options:
      - { vi: "2250 RCU, dưới trần", en: "2250 RCU, under the ceiling" }
      - { vi: "4500 RCU, vượt trần 3000", en: "4500 RCU, over the 3000 ceiling" }
      - { vi: "3375 RCU, vượt trần 3000", en: "3375 RCU, over the 3000 ceiling" }
    answer: 1
    why: { vi: "Đọc làm tròn lên bội 4 KB: 3 KB thành 4 KB = 1 RCU mỗi lần đọc mạnh. 4500 × 1 = 4500 RCU > 3000.", en: "Reads round up to a multiple of 4 KB: 3 KB becomes 4 KB = 1 RCU per strong read. 4500 × 1 = 4500 RCU > 3000." }
  - q: { vi: "Cùng tải đó nhưng đổi sang đọc nhất quán cuối cùng. Kết quả?", en: "Same load, but switched to eventually consistent reads. Result?" }
    options:
      - { vi: "2250 RCU, dưới trần 3000", en: "2250 RCU, under the 3000 ceiling" }
      - { vi: "Vẫn 4500 RCU", en: "Still 4500 RCU" }
      - { vi: "9000 RCU", en: "9000 RCU" }
    answer: 0
    why: { vi: "Đọc nhất quán cuối cùng tốn nửa RCU: 4500 × 0,5 = 2250. Đây là cách rẻ nhất để hạ tải đọc nếu ứng dụng chấp nhận dữ liệu trễ chút ít.", en: "An eventually consistent read costs half an RCU: 4500 × 0.5 = 2250. It is the cheapest way to cut read load if the application accepts slightly stale data." }
  - q: { vi: "Một khóa nhận 1800 lần ghi mỗi giây, item 1,5 KB. Rải đều qua N shard, N nhỏ nhất là bao nhiêu để mỗi shard dưới 1000 WCU?", en: "One key receives 1800 writes per second, item size 1.5 KB. Spread evenly over N shards, what is the smallest N that keeps each shard under 1000 WCU?" }
    options:
      - { vi: "2", en: "2" }
      - { vi: "3", en: "3" }
      - { vi: "4", en: "4" }
    answer: 2
    why: { vi: "Ghi làm tròn lên bội 1 KB: 1,5 KB thành 2 KB = 2 WCU. Tổng 1800 × 2 = 3600 WCU. 3 shard còn 1200 mỗi shard (vượt), 4 shard còn 900 (dưới 1000).", en: "Writes round up to a multiple of 1 KB: 1.5 KB becomes 2 KB = 2 WCU. Total 1800 × 2 = 3600 WCU. 3 shards leave 1200 each (over), 4 shards leave 900 (under 1000)." }
  - q: { vi: "Một Query trả 10 item, tổng cỡ 40,8 KB, đọc nhất quán mạnh. Tốn bao nhiêu RCU?", en: "A Query returns 10 items totalling 40.8 KB, strongly consistent. How many RCU does it consume?" }
    options:
      - { vi: "10 RCU, mỗi item một RCU", en: "10 RCU, one per item" }
      - { vi: "11 RCU: tổng được làm tròn lên 44 KB", en: "11 RCU: the total is rounded up to 44 KB" }
      - { vi: "20 RCU", en: "20 RCU" }
    answer: 1
    why: { vi: "Query cộng cỡ mọi item rồi mới làm tròn lên bội 4 KB: 40,8 KB thành 44 KB = 11 RCU. BatchGetItem thì làm tròn từng item trước khi cộng.", en: "A Query adds up all item sizes and then rounds up to a multiple of 4 KB: 40.8 KB becomes 44 KB = 11 RCU. BatchGetItem rounds each item first, then adds." }
---

## Ý chính

Ba quy tắc đủ để ước lượng một partition nóng:

- Đọc: làm tròn cỡ item lên bội **4 KB**. 1 RCU = một lần đọc nhất quán mạnh hoặc hai lần đọc nhất quán cuối cùng. Query cộng cỡ các item rồi mới làm tròn.
- Ghi: làm tròn lên bội **1 KB**. 1 WCU = một lần ghi.
- Trần của một partition: **3000 RCU** và **1000 WCU** mỗi giây.

Chia tổng của một khóa cho trần là ra số shard tối thiểu. Thực tế nên để dư, vì tải hiếm khi rải đều tuyệt đối.

# EN

## Key idea

Three rules are enough to estimate a hot partition:

- Reads: round the item size up to a multiple of **4 KB**. 1 RCU = one strongly consistent read or two eventually consistent reads. A Query adds the item sizes first, then rounds.
- Writes: round up to a multiple of **1 KB**. 1 WCU = one write.
- The ceiling of one partition: **3000 RCU** and **1000 WCU** per second.

Divide one key's total by the ceiling to get the minimum number of shards. In practice leave headroom, since load is rarely spread perfectly evenly.
