---
id: e-bp-m23
engine: best
track: mongodb
level: L3
module: m
title: "Bật profiler có ngưỡng và đọc truy vấn chậm"
title_en: "Use the profiler with a threshold"
kind: quiz
minutes: 3
objectives:
  - vi: "Bật profiler mức 1 với ngưỡng `slowms` (và `sampleRate` khi tải cao), đọc `system.profile` theo thời gian chạy, kế hoạch và số tài liệu đã xét, rồi tắt khi xong."
    en: "Turn on profiler level 1 with a `slowms` threshold (and a `sampleRate` under heavy load), read `system.profile` by run time, plan and documents examined, then switch it off when done."
avoid:
  vi: "Để profiler mức 2 ghi mọi thao tác, làm chậm chính hệ thống đang soi."
  en: "Leaving the profiler at level 2, recording every operation and slowing the very system you are inspecting."
requires: [e-mg-l3-11]
skills: []
adv: []
sources:
  - https://www.mongodb.com/docs/manual/tutorial/manage-the-database-profiler/
verified: { version: "MongoDB manual 9.0", date: "2026-11-20" }
pair:
  runtime: none
  check: syntax
  setup: null
  bad: |
    db.setProfilingLevel(2)
  good: |
    db.setProfilingLevel(1, { slowms: 100, sampleRate: 0.5 })
    db.system.profile.find({ millis: { $gt: 100 } }).sort({ millis: -1 }).limit(10)
  expect: null
quiz:
  - q:
      vi: "Profiler ở mức 2 ghi lại những thao tác nào?"
      en: "Which operations does the profiler record at level 2?"
    options:
      - { vi: "Chỉ thao tác chậm hơn `slowms`", en: "Only operations slower than `slowms`" }
      - { vi: "Mọi thao tác, bỏ qua `slowms`", en: "Every operation, ignoring `slowms`" }
      - { vi: "Không thao tác nào, mức 2 là tắt", en: "None, level 2 means off" }
    answer: 1
    why:
      vi: "Mức 0 là tắt (mặc định), mức 1 ghi thao tác vượt `slowms` hoặc khớp bộ lọc, mức 2 ghi mọi thao tác và bỏ qua `slowms`. Docs cảnh báo profiler có thể làm MongoDB chậm đi."
      en: "Level 0 is off (the default), level 1 records operations over `slowms` or matching a filter, level 2 records every operation and ignores `slowms`. The docs warn that the profiler can degrade MongoDB performance."
---

## Ý chính

Khi cần tìm truy vấn chậm, bật profiler mức 1 với ngưỡng `slowms` (mặc định 100 ms), thêm `sampleRate` khi tải cao. Đọc `system.profile` theo `millis`, `planSummary` và tỷ lệ tài liệu đã xét trên tài liệu trả về. Xong thì tắt.

## Vì sao

- Đoán truy vấn nào chậm hay sai; profiler cho số thật của từng thao tác.
- Profiler tốn tài nguyên, và `system.profile` là capped collection có cỡ giới hạn.
- Mức 2 ghi mọi thao tác, nên đè lên chính tải bạn đang muốn đo.
- Thẻ này chỉ cú pháp: profiler cần một `mongod` thật.

# EN

## Key idea

To find slow queries, turn on profiler level 1 with a `slowms` threshold (100 ms by default) and add a `sampleRate` under heavy load. Read `system.profile` by `millis`, `planSummary` and the ratio of documents examined to documents returned. Switch it off afterwards.

## Why

- Guessing which query is slow is often wrong; the profiler gives real numbers per operation.
- The profiler costs resources, and `system.profile` is a capped collection of limited size.
- Level 2 records every operation, adding load on top of the very load you want to measure.
- This card is syntax only: the profiler needs a real `mongod`.
