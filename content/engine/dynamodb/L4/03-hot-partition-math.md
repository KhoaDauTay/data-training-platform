---
id: e-dy-l4-03
engine: dynamodb
level: L4
module: scale
title: "Tính xem partition nào sẽ nóng"
title_en: "Work out which partition will run hot"
kind: quiz
runtime: docs
minutes: 7
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
    why: { vi: "Đọc làm tròn cỡ item lên bội 4 KB: 3 KB thành 4 KB = 1 khối, và mỗi khối đọc nhất quán mạnh tốn 1 RCU (read capacity unit, đơn vị đọc). 4500 lần × 1 RCU = 4500 RCU, vượt trần 3000 RCU mỗi giây của một partition. 2250 là giá đọc nhất quán cuối (nửa giá); 3375 là tính theo 3 KB thật (4500 × 3/4) mà quên làm tròn.", en: "Reads round the item size up to a multiple of 4 KB: 3 KB becomes 4 KB = 1 block, and each block read strongly consistent costs 1 RCU (read capacity unit). 4500 reads × 1 RCU = 4500 RCU, over the 3000 RCU per second ceiling of one partition. 2250 is the eventually consistent price (half); 3375 prices the real 3 KB (4500 × 3/4) and forgets the rounding." }
  - q: { vi: "Cùng tải đó nhưng đổi sang đọc nhất quán cuối. Kết quả?", en: "Same load, but switched to eventually consistent reads. Result?" }
    options:
      - { vi: "2250 RCU, dưới trần 3000", en: "2250 RCU, under the 3000 ceiling" }
      - { vi: "Vẫn 4500 RCU", en: "Still 4500 RCU" }
      - { vi: "9000 RCU", en: "9000 RCU" }
    answer: 0
    why: { vi: "Đọc nhất quán cuối (eventually consistent) tốn nửa RCU mỗi khối 4 KB: 4500 × 0,5 = 2250 RCU, dưới trần 3000. Giá không giữ nguyên 4500 vì chỉ đọc nhất quán mạnh mới tốn trọn 1 RCU; 9000 là nhân đôi như đọc trong transaction. Đây là cách rẻ nhất để hạ tải đọc, nếu màn hình chấp nhận thấy dữ liệu cũ trong chốc lát.", en: "An eventually consistent read costs half an RCU per 4 KB block: 4500 × 0.5 = 2250 RCU, under the 3000 ceiling. It does not stay at 4500 because only a strongly consistent read costs a full RCU; 9000 doubles it like a transactional read. It is the cheapest way to cut read load, if the screen accepts slightly stale data for a moment." }
  - q: { vi: "Một khóa nhận 1800 lần ghi mỗi giây, item 1,5 KB. Rải đều qua N shard, N nhỏ nhất là bao nhiêu để mỗi shard dưới 1000 WCU?", en: "One key receives 1800 writes per second, item size 1.5 KB. Spread evenly over N shards, what is the smallest N that keeps each shard under 1000 WCU?" }
    options:
      - { vi: "2", en: "2" }
      - { vi: "3", en: "3" }
      - { vi: "4", en: "4" }
    answer: 2
    trap: 0
    why: { vi: "2 nghe hợp lý nếu coi mỗi lần ghi là 1 WCU (write capacity unit, đơn vị ghi 1 KB): 1800 / 2 = 900. Nhưng ghi làm tròn lên bội 1 KB: 1,5 KB thành 2 KB = 2 WCU. Tổng 1800 × 2 = 3600 WCU. 3 shard còn 1200 mỗi shard (vượt), 4 shard còn 900 (dưới 1000).", en: "2 sounds right if each write counts as 1 WCU (write capacity unit, 1 KB): 1800 / 2 = 900. But writes round up to a multiple of 1 KB: 1.5 KB becomes 2 KB = 2 WCU. Total 1800 × 2 = 3600 WCU. 3 shards leave 1200 each (over), 4 shards leave 900 (under 1000)." }
  - q: { vi: "Một Query trả 10 item, tổng cỡ 40,8 KB, đọc nhất quán mạnh. Tốn bao nhiêu RCU?", en: "A Query returns 10 items totalling 40.8 KB, strongly consistent. How many RCU does it consume?" }
    options:
      - { vi: "10 RCU, mỗi item một RCU", en: "10 RCU, one per item" }
      - { vi: "11 RCU: tổng được làm tròn lên 44 KB", en: "11 RCU: the total is rounded up to 44 KB" }
      - { vi: "20 RCU", en: "20 RCU" }
    answer: 1
    trap: 0
    why: { vi: "Mỗi item một RCU nghe hợp lý vì GetItem một item nhỏ tốn như vậy, nhưng Query cộng cỡ mọi item rồi mới làm tròn lên bội 4 KB: 40,8 KB thành 44 KB = 11 khối, đọc nhất quán mạnh nên 11 RCU. 20 RCU là làm tròn từng item (mỗi item khoảng 4,08 KB → 8 KB = 2 khối, × 10), đó là cách BatchGetItem tính, không phải Query.", en: "One RCU per item sounds right because a GetItem of a small item costs that, but a Query adds up all item sizes and then rounds up to a multiple of 4 KB: 40.8 KB becomes 44 KB = 11 blocks, strongly consistent, so 11 RCU. 20 RCU rounds each item (about 4.08 KB → 8 KB = 2 blocks, × 10), which is how BatchGetItem counts, not a Query." }
---
## Mở bài

Đội sản phẩm báo: "Ngày ra mắt, bảng xếp hạng sẽ được đọc 4.500 lần mỗi giây." Trước khi mở bảng, bạn cần biết một partition có chịu nổi không, và nếu không thì chia ra bao nhiêu shard. Ba quy tắc làm tròn là đủ để tính trên giấy.

## Ý chính

Đọc: làm tròn cỡ item lên bội 4 KB. 1 RCU = một lần đọc nhất quán mạnh, hoặc hai lần đọc nhất quán cuối; đọc trong transaction tốn gấp đôi đọc nhất quán mạnh. Query và Scan cộng cỡ các item rồi mới làm tròn; GetItem và BatchGetItem làm tròn từng item.

Ghi: làm tròn lên bội 1 KB. 1 WCU = một lần ghi; ghi trong transaction tốn gấp đôi. Trần của một partition: 3000 RCU và 1000 WCU mỗi giây.

Nhiều người nghĩ mỗi lần ghi là 1 WCU, bất kể cỡ item. Thật ra một item 1,5 KB tốn 2 WCU, nên số shard cần gấp đôi. Chia tổng của một khóa cho trần là ra số shard tối thiểu; thực tế nên để dư, vì tải hiếm khi rải đều tuyệt đối.

## Ví dụ

Đọc nhất quán mạnh 4500 lần mỗi giây, item 3 KB:

```text
3 KB -> 4 KB = 1 RCU (strong)
4500 x 1   = 4500 RCU  > 3000  -> hot
4500 x 0.5 = 2250 RCU  < 3000  (eventually consistent)
```

Ghi 1800 lần mỗi giây, item 1,5 KB:

```text
1.5 KB -> 2 KB = 2 WCU
1800 x 2 = 3600 WCU
3600 / 3 = 1200 per shard  (over)
3600 / 4 =  900 per shard  (under 1000)  -> 4 shards
```

Một Query trả 10 item, tổng 40,8 KB:

```text
Query:        40.8 KB -> 44 KB = 11 RCU (strong)
BatchGetItem: 10 x (4.08 KB -> 8 KB) = 20 RCU (strong)
```

## Tóm tắt

- Đọc làm tròn lên bội 4 KB; ghi lên bội 1 KB.
- Đọc nhất quán cuối tốn nửa RCU; transaction tốn gấp đôi.
- Query và Scan làm tròn tổng; GetItem và BatchGetItem làm tròn từng item.
- Số shard tối thiểu = tổng của khóa / trần (3000 RCU hoặc 1000 WCU), rồi để dư.

# EN

## Opening

The product team says: "On launch day, the leaderboard will be read 4,500 times a second." Before the table goes live you need to know whether one partition can take it, and if not, how many shards to use. Three rounding rules are enough to work it out on paper.

## Key idea

Reads: round the item size up to a multiple of 4 KB. 1 RCU = one strongly consistent read, or two eventually consistent reads; a read in a transaction costs twice a strong read. Query and Scan add up the item sizes and then round; GetItem and BatchGetItem round each item.

Writes: round up to a multiple of 1 KB. 1 WCU = one write; a write in a transaction costs twice as much. The ceiling of one partition: 3000 RCU and 1000 WCU per second.

Many people think each write is 1 WCU whatever the item size. In fact a 1.5 KB item costs 2 WCU, so you need twice as many shards. Divide one key's total by the ceiling to get the minimum number of shards; in practice leave headroom, since load is rarely spread perfectly evenly.

## Example

4500 strong reads per second, item 3 KB:

```text
3 KB -> 4 KB = 1 RCU (strong)
4500 x 1   = 4500 RCU  > 3000  -> hot
4500 x 0.5 = 2250 RCU  < 3000  (eventually consistent)
```

1800 writes per second, item 1.5 KB:

```text
1.5 KB -> 2 KB = 2 WCU
1800 x 2 = 3600 WCU
3600 / 3 = 1200 per shard  (over)
3600 / 4 =  900 per shard  (under 1000)  -> 4 shards
```

A Query returns 10 items, 40.8 KB in total:

```text
Query:        40.8 KB -> 44 KB = 11 RCU (strong)
BatchGetItem: 10 x (4.08 KB -> 8 KB) = 20 RCU (strong)
```

## Recap

- Reads round up to a multiple of 4 KB; writes to a multiple of 1 KB.
- An eventually consistent read costs half an RCU; a transaction costs double.
- Query and Scan round the total; GetItem and BatchGetItem round each item.
- Minimum shards = the key's total / the ceiling (3000 RCU or 1000 WCU), then add headroom.
