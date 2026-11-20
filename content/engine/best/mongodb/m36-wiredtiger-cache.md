---
id: e-bp-m36
engine: best
track: mongodb
level: L5
module: m
title: "Cache WiredTiger: để mặc định, chừa RAM cho filesystem cache"
title_en: "Leave the WiredTiger cache at its default"
kind: quiz
minutes: 3
objectives:
  - vi: "Để cache WiredTiger ở mặc định, chỉ giảm khi nhiều tiến trình chung máy, và không nâng gần hết RAM vì MongoDB còn dùng filesystem cache của hệ điều hành."
    en: "Leave the WiredTiger cache at its default, lower it only when several processes share the machine, and never raise it to nearly all RAM, because MongoDB also uses the operating system's filesystem cache."
avoid:
  vi: "Nâng cache lên 14 GB trên máy 16 GB, làm filesystem cache co lại và đĩa đọc nhiều hơn."
  en: "Raising the cache to 14 GB on a 16 GB machine, shrinking the filesystem cache and sending more reads to disk."
requires: [e-mg-l5-01]
skills: []
adv: []
sources:
  - https://www.mongodb.com/docs/manual/core/wiredtiger/
verified: { version: "MongoDB manual 9.0", date: "2026-11-20" }
pair:
  runtime: none
  check: syntax
  setup: null
  bad: |
    // mongod.conf on a 16 GB machine shared with an app server:
    // storage.wiredTiger.engineConfig.cacheSizeGB: 14
    db.serverStatus().wiredTiger.cache
  good: |
    // leave the default (≈ 7.5 GB here) and watch the cache numbers
    db.serverStatus().wiredTiger.cache
  expect: null
quiz:
  - q:
      vi: "Máy có 4 GB RAM, cấu hình mặc định. Cache WiredTiger lấy bao nhiêu?"
      en: "A machine has 4 GB of RAM and default settings. How large is the WiredTiger cache?"
    options:
      - { vi: "1,5 GB", en: "1.5 GB" }
      - { vi: "2 GB", en: "2 GB" }
      - { vi: "3,5 GB", en: "3.5 GB" }
    answer: 0
    why:
      vi: "Mặc định là số lớn hơn giữa 50% × (RAM − 1 GB) và 0,256 GB: 0,5 × (4 − 1) = 1,5 GB. Phần RAM còn lại dành cho filesystem cache và các tiến trình khác."
      en: "The default is the larger of 50% × (RAM − 1 GB) and 0.256 GB: 0.5 × (4 − 1) = 1.5 GB. The rest of the RAM is left for the filesystem cache and other processes."
---

## Ý chính

Để cache WiredTiger ở mặc định. Chỉ giảm khi nhiều `mongod` hay tiến trình khác chung một máy. Đừng nâng gần hết RAM; docs khuyên tránh nâng trên mức mặc định.

## Vì sao

- MongoDB dùng **hai** lớp cache: cache WiredTiger (dữ liệu ở dạng dùng trong bộ nhớ) và filesystem cache của hệ điều hành (dữ liệu nén y như trên đĩa).
- Filesystem cache tự dùng RAM còn trống; nâng cache WiredTiger làm nó co lại, nên đĩa phải đọc nhiều hơn.
- Thẻ này chỉ cú pháp: đây là cấu hình máy chủ, mingo không có storage engine.

# EN

## Key idea

Leave the WiredTiger cache at its default. Lower it only when several `mongod` or other processes share a machine. Never raise it to nearly all RAM; the docs advise against raising it above the default.

## Why

- MongoDB uses **two** cache layers: the WiredTiger cache (data in its in-memory form) and the operating system's filesystem cache (compressed data exactly as on disk).
- The filesystem cache uses whatever RAM is free; a bigger WiredTiger cache shrinks it, so more reads go to disk.
- This card is syntax only: it is server configuration, and mingo has no storage engine.
