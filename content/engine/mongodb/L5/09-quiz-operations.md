---
id: e-mg-l5-09
engine: mongodb
level: L5
module: replication
title: "Kiểm tra: vận hành replica set và cluster"
title_en: "Check: running replica sets and clusters"
kind: quiz
minutes: 6
runtime: docs
objectives:
  - vi: "Áp các con số vận hành chính vào tình huống thật"
    en: "Apply the key operating numbers to real situations"
  - vi: "Nhận ra hiểu lầm hay gặp về oplog, balancer và priority"
    en: "Spot common misconceptions about the oplog, the balancer and priority"
requires: [e-mg-l5-03, e-mg-l5-05]
sources:
  - { url: https://www.mongodb.com/docs/manual/core/replica-set-oplog/, title_vi: "Oplog của replica set" }
  - { url: https://www.mongodb.com/docs/manual/core/sharding-balancer-administration/, title_vi: "Quản lý balancer" }
  - { url: https://www.mongodb.com/docs/manual/core/replica-set-elections/, title_vi: "Bầu primary trong replica set" }
quiz:
  - q:
      vi: "Oplog đầy sau 24 giờ ghi. Một secondary bảo trì 30 giờ rồi bật lại. Nó đồng bộ lại bằng replication được không?"
      en: "The oplog fills in 24 hours of writes. A secondary is down for 30 hours of maintenance, then restarts. Can it catch up through replication?"
    options:
      - { vi: "Được, oplog luôn giữ mọi thao tác", en: "Yes, the oplog always keeps every operation" }
      - { vi: "Không, nó đã ra ngoài cửa sổ oplog", en: "No, it is outside the oplog window" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý nếu coi oplog là nhật ký đầy đủ, nhưng oplog là capped collection: mục cũ bị cắt khi đầy. Secondary chỉ đồng bộ lại bằng replication nếu kết nối lại trong cửa sổ oplog; 30 giờ dài hơn 24 giờ, nên 6 giờ thao tác đầu tiên nó cần đã bị cắt khỏi oplog. Nó phải initial sync: xóa dữ liệu của mình và chép lại toàn bộ từ một thành viên khác."
      en: "It sounds right if the oplog were a full log, but the oplog is a capped collection: old entries are cut when it is full. A secondary can catch up through replication only within the oplog window; 30 hours is longer than 24, so the first 6 hours of operations it needs are already cut from the oplog. It needs an initial sync: drop its data and copy everything again from another member."
  - q:
      vi: "Range size mặc định 128 MB. Shard A giữ hơn shard B 300 MB của một collection. Balancer có di chuyển không?"
      en: "Default range size of 128 MB. Shard A holds 300 MB more of a collection than shard B. Does the balancer migrate?"
    options:
      - { vi: "Có, vì chênh hơn 128 MB", en: "Yes, because the difference exceeds 128 MB" }
      - { vi: "Không, phải chênh ít nhất 384 MB (ba lần range size)", en: "No, the difference must reach at least 384 MB (three times the range size)" }
    answer: 1
    trap: 0
    why:
      vi: "Chênh hơn một range nghe như đủ để chuyển, nhưng collection coi là cân bằng khi chênh lệch dưới ba lần range size đã cấu hình. Với 128 MB, ngưỡng là 3 × 128 = 384 MB; chênh 300 MB còn dưới ngưỡng, nên balancer chưa chuyển gì. Ngưỡng này tránh việc chuyển dữ liệu qua lại vì những chênh lệch nhỏ."
      en: "A gap larger than one range sounds like enough to move, but a collection counts as balanced while the difference is under three times the configured range size. With 128 MB the threshold is 3 × 128 = 384 MB; a 300 MB gap is below it, so the balancer moves nothing yet. The threshold avoids moving data back and forth over small gaps."
  - q:
      vi: "Thành viên nào không bao giờ thành primary?"
      en: "Which member never becomes primary?"
    options:
      - { vi: "Thành viên có `priority: 0`", en: "A member with `priority: 0`" }
      - { vi: "Thành viên có priority thấp nhất nhưng lớn hơn 0", en: "The member with the lowest priority above 0" }
    answer: 0
    trap: 1
    why:
      vi: "Priority thấp nghe như \"không bao giờ\", nhưng thành viên priority thấp vẫn có thể làm primary trong thời gian ngắn khi không còn ai hợp hơn. Chỉ `priority: 0` mới không thành primary và không gọi bầu."
      en: "Low priority sounds like \"never\", but a low-priority member can still be primary for short periods when nobody better is available. Only `priority: 0` never becomes primary and never calls an election."
---
## Mở bài

Ba tình huống vận hành, mỗi tình huống có một con số dễ nhớ sai. Đọc nhanh các con số dưới đây trước khi trả lời.

## Ý chính

Ba câu về cửa sổ oplog, ngưỡng của balancer và priority khi bầu primary. Nhiều người nghĩ các cơ chế này phản ứng ngay và giữ mọi thứ mãi mãi. Thật ra oplog có giới hạn, balancer có ngưỡng, và priority chỉ là ưu tiên chứ không phải cấm, trừ khi bằng 0. Đáp án theo docs chính thức của MongoDB hiện hành, kiểm ngày 2026-11-20.

## Ví dụ

Các con số dùng trong bài:

```text
oplog            capped; default 5% of free disk, 990 MB .. 50 GB
oplog window     time between the oldest and newest entry
balancer         moves when the gap reaches 3 x range size (128 MB -> 384 MB)
priority 0       never primary, never calls an election
election         after 10 s without an answer from the primary
```

## Tóm tắt

- Secondary tụt quá cửa sổ oplog phải initial sync.
- Balancer chỉ chuyển khi lệch từ ba lần range size.
- Chỉ `priority: 0` mới không bao giờ thành primary.

# EN

## Opening

Three operating situations, each with a number that is easy to remember wrong. Skim the numbers below before you answer.

## Key idea

Three questions on the oplog window, the balancer threshold and priority in elections. Many people think these mechanisms react at once and keep everything forever. In fact the oplog has a limit, the balancer has a threshold, and priority is a preference, not a ban, unless it is 0. Answers follow the current MongoDB manual, checked 2026-11-20.

## Example

The numbers used in this lesson:

```text
oplog            capped; default 5% of free disk, 990 MB .. 50 GB
oplog window     time between the oldest and newest entry
balancer         moves when the gap reaches 3 x range size (128 MB -> 384 MB)
priority 0       never primary, never calls an election
election         after 10 s without an answer from the primary
```

## Recap

- A secondary that falls past the oplog window needs an initial sync.
- The balancer moves data only from a gap of three times the range size.
- Only `priority: 0` never becomes primary.
