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
requires: [e-mg-l5-03, e-mg-l5-05]
sources:
  - https://www.mongodb.com/docs/manual/core/replica-set-oplog/
  - https://www.mongodb.com/docs/manual/core/sharding-balancer-administration/
  - https://www.mongodb.com/docs/manual/core/replica-set-elections/
quiz:
  - q:
      vi: "Oplog đầy sau 24 giờ ghi. Một secondary bảo trì 30 giờ rồi bật lại. Nó đồng bộ lại bằng replication được không?"
      en: "The oplog fills in 24 hours of writes. A secondary is down for 30 hours of maintenance, then restarts. Can it catch up through replication?"
    options:
      - { vi: "Được, oplog luôn giữ mọi thao tác", en: "Yes, the oplog always keeps every operation" }
      - { vi: "Không, nó đã ra ngoài cửa sổ oplog", en: "No, it is outside the oplog window" }
    answer: 1
    why:
      vi: "Secondary chỉ đồng bộ lại bằng replication nếu kết nối lại trong cửa sổ oplog. 30 giờ dài hơn 24 giờ, nên các mục nó cần đã bị cắt."
      en: "A secondary can catch up through replication only if it reconnects within the oplog window. 30 hours is longer than 24, so the entries it needs were truncated."
  - q:
      vi: "Range size mặc định 128 MB. Shard A giữ hơn shard B 300 MB của một collection. Balancer có di chuyển không?"
      en: "Default range size of 128 MB. Shard A holds 300 MB more of a collection than shard B. Does the balancer migrate?"
    options:
      - { vi: "Có, vì chênh hơn 128 MB", en: "Yes, because the difference exceeds 128 MB" }
      - { vi: "Không, phải chênh ít nhất 384 MB (ba lần range size)", en: "No, the difference must reach at least 384 MB (three times the range size)" }
    answer: 1
    why:
      vi: "Collection coi là cân bằng khi chênh lệch dưới ba lần range size đã cấu hình. Với 128 MB, ngưỡng là 384 MB."
      en: "A collection counts as balanced while the difference is under three times the configured range size. With 128 MB the threshold is 384 MB."
  - q:
      vi: "Thành viên nào không bao giờ thành primary?"
      en: "Which member never becomes primary?"
    options:
      - { vi: "Thành viên có `priority: 0`", en: "A member with `priority: 0`" }
      - { vi: "Thành viên có priority thấp nhất nhưng lớn hơn 0", en: "The member with the lowest priority above 0" }
    answer: 0
    why:
      vi: "`priority: 0` không thành primary và không gọi bầu. Thành viên priority thấp vẫn có thể làm primary trong thời gian ngắn."
      en: "`priority: 0` never becomes primary and never calls an election. A low-priority member can still be primary for short periods."
---

## Ý chính

Ba câu về cửa sổ oplog, ngưỡng của balancer và priority khi bầu primary. Đáp án theo tài liệu MongoDB hiện hành, kiểm ngày 2026-11-20.

# EN

## Key idea

Three questions on the oplog window, the balancer threshold and priority in elections. Answers follow the current MongoDB manual, checked 2026-11-20.
