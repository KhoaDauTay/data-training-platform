---
id: e-dy-l4-14
engine: dynamodb
level: L4
module: design-case
title: "Kiểm tra cấp L4: thiết kế bảng cho ứng dụng thi đấu trực tuyến"
title_en: "Level L4 check: designing the table for an online quiz app"
kind: capstone
runtime: browser
minutes: 25
objectives:
  - { vi: "Đi từ danh sách mẫu truy cập tới khóa chính, GSI thưa và khóa shard", en: "Go from a list of access patterns to the primary key, a sparse GSI and sharded keys" }
  - { vi: "Trả lời mỗi mẫu truy cập bằng đúng một request, không Scan", en: "Answer each access pattern with exactly one request, no Scan" }
  - { vi: "Ước lượng WCU/RCU và số shard cho bảng xếp hạng", en: "Estimate WCU/RCU and the shard count for the leaderboard" }
requires: [e-dy-l4-05, e-dy-l4-08, e-dy-l4-10]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-general-nosql-design.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-sharding.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-indexes-general-sparse-indexes.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/read-write-operations.html
viz: dy-single-table
lab:
  setup: |
    {"tables": [
      {"TableName":"QuizApp","KeySchema":[{"AttributeName":"pk","KeyType":"HASH"},{"AttributeName":"sk","KeyType":"RANGE"}],"AttributeDefinitions":[{"AttributeName":"pk","AttributeType":"S"},{"AttributeName":"sk","AttributeType":"S"},{"AttributeName":"live_region","AttributeType":"S"},{"AttributeName":"live_since","AttributeType":"S"}],"BillingMode":"PAY_PER_REQUEST","GlobalSecondaryIndexes":[{"IndexName":"LiveNow","KeySchema":[{"AttributeName":"live_region","KeyType":"HASH"},{"AttributeName":"live_since","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}]}
    ], "items": {
      "QuizApp": [
        {"pk":"PLAYER#p1","sk":"PROFILE","name":"An","country":"VN"},
        {"pk":"PLAYER#p1","sk":"MATCH#2026-11-16T09:00#m01","score":100},
        {"pk":"PLAYER#p1","sk":"MATCH#2026-11-17T10:00#m02","score":630},
        {"pk":"PLAYER#p1","sk":"MATCH#2026-11-18T11:00#m03","score":260},
        {"pk":"PLAYER#p1","sk":"MATCH#2026-11-19T12:00#m04","score":790,"live_region":"VN","live_since":"2026-11-20T08:15"},
        {"pk":"PLAYER#p2","sk":"PROFILE","name":"Binh","country":"VN"},
        {"pk":"PLAYER#p2","sk":"MATCH#2026-11-16T10:00#m05","score":470},
        {"pk":"PLAYER#p2","sk":"MATCH#2026-11-17T11:00#m06","score":100},
        {"pk":"PLAYER#p2","sk":"MATCH#2026-11-18T12:00#m07","score":630},
        {"pk":"PLAYER#p2","sk":"MATCH#2026-11-19T13:00#m08","score":260},
        {"pk":"PLAYER#p3","sk":"PROFILE","name":"Chi","country":"TH"},
        {"pk":"PLAYER#p3","sk":"MATCH#2026-11-16T11:00#m09","score":840},
        {"pk":"PLAYER#p3","sk":"MATCH#2026-11-17T12:00#m10","score":470},
        {"pk":"PLAYER#p3","sk":"MATCH#2026-11-18T13:00#m11","score":100},
        {"pk":"PLAYER#p3","sk":"MATCH#2026-11-19T14:00#m12","score":630},
        {"pk":"PLAYER#p4","sk":"PROFILE","name":"Dung","country":"VN"},
        {"pk":"PLAYER#p4","sk":"MATCH#2026-11-16T12:00#m13","score":310},
        {"pk":"PLAYER#p4","sk":"MATCH#2026-11-17T13:00#m14","score":840},
        {"pk":"PLAYER#p4","sk":"MATCH#2026-11-18T14:00#m15","score":470},
        {"pk":"PLAYER#p4","sk":"MATCH#2026-11-19T15:00#m16","score":100,"live_region":"VN","live_since":"2026-11-20T11:15"},
        {"pk":"PLAYER#p5","sk":"PROFILE","name":"Giang","country":"SG"},
        {"pk":"PLAYER#p5","sk":"MATCH#2026-11-16T13:00#m17","score":680},
        {"pk":"PLAYER#p5","sk":"MATCH#2026-11-17T14:00#m18","score":310},
        {"pk":"PLAYER#p5","sk":"MATCH#2026-11-18T15:00#m19","score":840},
        {"pk":"PLAYER#p5","sk":"MATCH#2026-11-19T16:00#m20","score":470},
        {"pk":"PLAYER#p6","sk":"PROFILE","name":"Hoa","country":"VN"},
        {"pk":"PLAYER#p6","sk":"MATCH#2026-11-16T14:00#m21","score":150},
        {"pk":"PLAYER#p6","sk":"MATCH#2026-11-17T15:00#m22","score":680},
        {"pk":"PLAYER#p6","sk":"MATCH#2026-11-18T16:00#m23","score":310},
        {"pk":"PLAYER#p6","sk":"MATCH#2026-11-19T17:00#m24","score":840},
        {"pk":"PLAYER#p7","sk":"PROFILE","name":"Khanh","country":"TH"},
        {"pk":"PLAYER#p7","sk":"MATCH#2026-11-16T15:00#m25","score":520},
        {"pk":"PLAYER#p7","sk":"MATCH#2026-11-17T16:00#m26","score":150},
        {"pk":"PLAYER#p7","sk":"MATCH#2026-11-18T17:00#m27","score":680},
        {"pk":"PLAYER#p7","sk":"MATCH#2026-11-19T18:00#m28","score":310,"live_region":"TH","live_since":"2026-11-20T14:15"},
        {"pk":"PLAYER#p8","sk":"PROFILE","name":"Lam","country":"VN"},
        {"pk":"PLAYER#p8","sk":"MATCH#2026-11-16T16:00#m29","score":890},
        {"pk":"PLAYER#p8","sk":"MATCH#2026-11-17T17:00#m30","score":520},
        {"pk":"PLAYER#p8","sk":"MATCH#2026-11-18T18:00#m31","score":150},
        {"pk":"PLAYER#p8","sk":"MATCH#2026-11-19T09:00#m32","score":680},
        {"pk":"BOARD#2026-11-20#0","sk":"S#00010#p1","player":"p1","score":10},
        {"pk":"BOARD#2026-11-20#0","sk":"S#00141#p2","player":"p2","score":141},
        {"pk":"BOARD#2026-11-20#0","sk":"S#00272#p3","player":"p3","score":272},
        {"pk":"BOARD#2026-11-20#0","sk":"S#00403#p4","player":"p4","score":403},
        {"pk":"BOARD#2026-11-20#0","sk":"S#00534#p5","player":"p5","score":534},
        {"pk":"BOARD#2026-11-20#0","sk":"S#00665#p6","player":"p6","score":665},
        {"pk":"BOARD#2026-11-20#0","sk":"S#00796#p7","player":"p7","score":796},
        {"pk":"BOARD#2026-11-20#0","sk":"S#00927#p8","player":"p8","score":927},
        {"pk":"BOARD#2026-11-20#1","sk":"S#00068#p2","player":"p2","score":68},
        {"pk":"BOARD#2026-11-20#1","sk":"S#00199#p3","player":"p3","score":199},
        {"pk":"BOARD#2026-11-20#1","sk":"S#00330#p4","player":"p4","score":330},
        {"pk":"BOARD#2026-11-20#1","sk":"S#00461#p5","player":"p5","score":461},
        {"pk":"BOARD#2026-11-20#1","sk":"S#00592#p6","player":"p6","score":592},
        {"pk":"BOARD#2026-11-20#1","sk":"S#00723#p7","player":"p7","score":723},
        {"pk":"BOARD#2026-11-20#1","sk":"S#00854#p8","player":"p8","score":854},
        {"pk":"BOARD#2026-11-20#1","sk":"S#00985#p1","player":"p1","score":985},
        {"pk":"BOARD#2026-11-20#2","sk":"S#00126#p3","player":"p3","score":126},
        {"pk":"BOARD#2026-11-20#2","sk":"S#00257#p4","player":"p4","score":257},
        {"pk":"BOARD#2026-11-20#2","sk":"S#00388#p5","player":"p5","score":388},
        {"pk":"BOARD#2026-11-20#2","sk":"S#00519#p6","player":"p6","score":519},
        {"pk":"BOARD#2026-11-20#2","sk":"S#00650#p7","player":"p7","score":650},
        {"pk":"BOARD#2026-11-20#2","sk":"S#00781#p8","player":"p8","score":781},
        {"pk":"BOARD#2026-11-20#2","sk":"S#00912#p1","player":"p1","score":912},
        {"pk":"BOARD#2026-11-20#2","sk":"S#00053#p2","player":"p2","score":53},
        {"pk":"BOARD#2026-11-20#3","sk":"S#00184#p4","player":"p4","score":184},
        {"pk":"BOARD#2026-11-20#3","sk":"S#00315#p5","player":"p5","score":315},
        {"pk":"BOARD#2026-11-20#3","sk":"S#00446#p6","player":"p6","score":446},
        {"pk":"BOARD#2026-11-20#3","sk":"S#00577#p7","player":"p7","score":577},
        {"pk":"BOARD#2026-11-20#3","sk":"S#00708#p8","player":"p8","score":708},
        {"pk":"BOARD#2026-11-20#3","sk":"S#00839#p1","player":"p1","score":839},
        {"pk":"BOARD#2026-11-20#3","sk":"S#00970#p2","player":"p2","score":970},
        {"pk":"BOARD#2026-11-20#3","sk":"S#00111#p3","player":"p3","score":111}
      ]
    }}
  steps:
    - task: { vi: "Mẫu 1, mở hồ sơ người chơi: đọc hồ sơ của người chơi `p3` (`pk` = `PLAYER#p3`, `sk` = `PROFILE`) bằng một request.", en: "Pattern 1, open a player's profile: read the profile of player `p3` (`pk` = `PLAYER#p3`, `sk` = `PROFILE`) with one request." }
      solution: |
        {"op": "GetItem", "input": {"TableName": "QuizApp", "Key": {"pk": {"S": "PLAYER#p3"}, "sk": {"S": "PROFILE"}}}}
      check: doc
      expect: { Count: 1 }
      hint: { vi: "Biết đủ khóa chính thì dùng GetItem.", en: "When you know the full primary key, use GetItem." }
    - task: { vi: "Mẫu 2, lịch sử thi đấu: đọc 3 trận gần nhất của người chơi `p1`, mới nhất trước. Sort key của trận là `MATCH#<time>#<match>`.", en: "Pattern 2, match history: read the 3 most recent matches of player `p1`, newest first. A match's sort key is `MATCH#<time>#<match>`." }
      solution: |
        {"op": "Query", "input": {"TableName": "QuizApp", "KeyConditionExpression": "pk = :p AND begins_with(sk, :m)", "ExpressionAttributeValues": {":p": {"S": "PLAYER#p1"}, ":m": {"S": "MATCH#"}}, "ScanIndexForward": false, "Limit": 3}}
      check: doc
      ordered: true
      expect: { Count: 3, ScannedCount: 3 }
      hint: { vi: "Thời điểm ISO sắp đúng theo chuỗi; đảo chiều bằng `ScanIndexForward`.", en: "ISO timestamps sort correctly as strings; reverse the order with `ScanIndexForward`." }
    - task: { vi: "Mẫu 3, trận đang diễn ra theo khu vực: chỉ trận đang chạy mới có `live_region` và `live_since`, là khóa của GSI `LiveNow`. Đọc mọi trận đang chạy ở khu vực `VN`.", en: "Pattern 3, live matches by region: only running matches carry `live_region` and `live_since`, the keys of the GSI `LiveNow`. Read every running match in region `VN`." }
      solution: |
        {"op": "Query", "input": {"TableName": "QuizApp", "IndexName": "LiveNow", "KeyConditionExpression": "live_region = :r", "ExpressionAttributeValues": {":r": {"S": "VN"}}}}
      check: doc
      expect: { Count: 2, ScannedCount: 2 }
      hint: { vi: "Đây là GSI thưa: Query trên nó, không Scan bảng.", en: "This is a sparse GSI: Query it, do not Scan the table." }
    - task: { vi: "Mẫu 4, bảng xếp hạng trong ngày: điểm của ngày 2026-11-20 được rải ra 4 shard `BOARD#2026-11-20#<shard>`, sort key `S#<score>#<player>`. Đọc 3 điểm cao nhất của shard 2 (ứng dụng sẽ gộp 4 shard).", en: "Pattern 4, today's leaderboard: the scores of 2026-11-20 are spread over 4 shards `BOARD#2026-11-20#<shard>`, sort key `S#<score>#<player>`. Read the top 3 scores of shard 2 (the application merges the 4 shards)." }
      solution: |
        {"op": "Query", "input": {"TableName": "QuizApp", "KeyConditionExpression": "pk = :b", "ExpressionAttributeValues": {":b": {"S": "BOARD#2026-11-20#2"}}, "ScanIndexForward": false, "Limit": 3}}
      check: doc
      ordered: true
      expect: { Count: 3, ScannedCount: 3 }
      hint: { vi: "Điểm được đệm số 0 nên sắp theo chuỗi cũng là sắp theo số.", en: "Scores are zero-padded, so string order is numeric order." }
quiz:
  - q: { vi: "Theo AWS, bước nào phải làm trước tiên khi thiết kế bảng DynamoDB?", en: "According to AWS, which step comes first when designing a DynamoDB table?" }
    options:
      - { vi: "Vẽ sơ đồ thực thể chuẩn hóa như SQL", en: "Draw a normalized entity diagram as in SQL" }
      - { vi: "Liệt kê các mẫu truy cập và tần suất của chúng", en: "List the access patterns and how often they run" }
      - { vi: "Tạo một GSI cho mỗi thuộc tính", en: "Create one GSI per attribute" }
    answer: 1
    why: { vi: "Với DynamoDB, đừng thiết kế schema trước khi biết các câu hỏi cần trả lời. Mẫu truy cập quyết định khóa chính, GSI và shard.", en: "With DynamoDB, do not design the schema until you know the questions it must answer. The access patterns decide the primary key, the GSIs and the shards." }
  - q: { vi: "Giờ cao điểm có 2000 điểm được ghi mỗi giây vào bảng xếp hạng của ngày, mỗi item 0,6 KB. Cần ít nhất bao nhiêu shard, và vì sao bài chọn 4?", en: "At peak, 2000 scores per second are written to the day's leaderboard, 0.6 KB per item. How many shards are needed at least, and why does the lesson pick 4?" }
    options:
      - { vi: "1 shard là đủ vì bảng on-demand", en: "1 shard is enough because the table is on-demand" }
      - { vi: "Ít nhất 2 (2000 WCU / 1000); chọn 4 để mỗi shard chỉ 500 WCU, dư cho tải lệch", en: "At least 2 (2000 WCU / 1000); 4 is picked so each shard carries only 500 WCU, leaving room for skew" }
      - { vi: "Ít nhất 4 vì mỗi item tốn 2 WCU", en: "At least 4 because each item costs 2 WCU" }
    answer: 1
    why: { vi: "0,6 KB làm tròn lên 1 KB = 1 WCU, tổng 2000 WCU. Trần 1000 WCU mỗi partition nên tối thiểu 2 shard; 4 shard cho mỗi shard 500 WCU, an toàn khi hậu tố không rải đều tuyệt đối.", en: "0.6 KB rounds up to 1 KB = 1 WCU, 2000 WCU in total. The ceiling is 1000 WCU per partition, so at least 2 shards; 4 shards give 500 WCU each, safe when the suffix does not spread perfectly." }
  - q: { vi: "Mỗi lần xem bảng xếp hạng gửi 4 Query (một mỗi shard), mỗi Query đọc 3 item tổng dưới 4 KB, đọc nhất quán cuối cùng. 300 lượt xem mỗi giây tốn bao nhiêu RCU?", en: "Each leaderboard view sends 4 Queries (one per shard), each reading 3 items totalling under 4 KB, eventually consistent. How many RCU do 300 views per second cost?" }
    options:
      - { vi: "150 RCU", en: "150 RCU" }
      - { vi: "600 RCU", en: "600 RCU" }
      - { vi: "3600 RCU", en: "3600 RCU" }
    answer: 1
    why: { vi: "Mỗi Query: tổng dưới 4 KB làm tròn thành 4 KB = 1 RCU nếu mạnh, 0,5 nếu cuối cùng. 4 × 0,5 = 2 RCU mỗi lượt xem, × 300 = 600 RCU. Đó là giá đọc của write sharding: số Query nhân theo số shard.", en: "Each Query: under 4 KB rounds to 4 KB = 1 RCU if strong, 0.5 if eventual. 4 × 0.5 = 2 RCU per view, × 300 = 600 RCU. That is the read price of write sharding: the Query count grows with the shard count." }
---

## Ý chính

Bạn thiết kế bảng `QuizApp` cho một ứng dụng thi đố vui trực tuyến. Làm theo thứ tự access-pattern-first của AWS:

- **Liệt kê mẫu truy cập** (và tần suất) trước khi nghĩ tới khóa.
- **Khóa chính** phục vụ các mẫu theo người chơi: `pk = PLAYER#<id>`, `sk = PROFILE` cho hồ sơ, `sk = MATCH#<time>#<match>` cho lịch sử.
- **GSI thưa** `LiveNow` (`live_region`, `live_since`) cho các trận đang chạy: chỉ trận đang chạy có hai thuộc tính này.
- **Khóa shard** cho bảng xếp hạng: một ngày là một khóa rất nóng, nên rải ra 4 shard `BOARD#<day>#<shard>`, sort key là điểm đệm số 0.
- **Ước lượng chi phí** cho mẫu nặng nhất (câu hỏi cuối bài).

Mỗi bước dưới đây là một mẫu truy cập, trả lời bằng đúng một request.

## Ví dụ

```text
#  access pattern               request                       key / index
1  open a profile               GetItem                       PLAYER#p3 | PROFILE
2  last 3 matches of a player   Query, newest first, Limit 3  PLAYER#p1 | begins_with MATCH#
3  live matches in a region     Query on GSI LiveNow          live_region = VN
4  today's top scores           Query per shard, merge        BOARD#2026-11-20#k, descending
```

## Thực hành

Bảng có 72 item: 8 hồ sơ, 32 trận (3 trận đang chạy) và 32 điểm trong 4 shard. Làm 4 bước, rồi trả lời 3 câu hỏi về thiết kế và chi phí.

# EN

## Key idea

You are designing the `QuizApp` table for an online quiz game. Follow the AWS access-pattern-first order:

- **List the access patterns** (and their frequency) before thinking about keys.
- The **primary key** serves the per-player patterns: `pk = PLAYER#<id>`, `sk = PROFILE` for the profile, `sk = MATCH#<time>#<match>` for the history.
- A **sparse GSI** `LiveNow` (`live_region`, `live_since`) for running matches: only running matches carry these two attributes.
- **Sharded keys** for the leaderboard: one day is a very hot key, so it is spread over 4 shards `BOARD#<day>#<shard>`, with the zero-padded score as sort key.
- A **cost estimate** for the heaviest pattern (the questions at the end).

Each step below is one access pattern, answered with exactly one request.

## Example

```text
#  access pattern               request                       key / index
1  open a profile               GetItem                       PLAYER#p3 | PROFILE
2  last 3 matches of a player   Query, newest first, Limit 3  PLAYER#p1 | begins_with MATCH#
3  live matches in a region     Query on GSI LiveNow          live_region = VN
4  today's top scores           Query per shard, merge        BOARD#2026-11-20#k, descending
```

## Practice

The table holds 72 items: 8 profiles, 32 matches (3 of them running) and 32 scores over 4 shards. Do the 4 steps, then answer 3 questions on design and cost.
