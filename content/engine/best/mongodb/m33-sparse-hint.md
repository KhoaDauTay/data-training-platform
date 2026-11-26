---
id: e-bp-m33
engine: best
track: mongodb
level: L3
module: m
title: "Đừng hint index sparse khi cần đủ tài liệu"
title_en: "Never hint a sparse index for complete results"
kind: quiz
minutes: 3
objectives:
  - vi: "Không dùng `hint()` trỏ tới index sparse (hay partial) cho truy vấn hoặc phép đếm cần mọi tài liệu; muốn đếm tập con thì viết điều kiện khớp đúng tập con đó."
    en: "Never `hint()` a sparse (or partial) index for a query or a count that needs every document; to count a subset, write a condition that matches exactly that subset."
avoid:
  vi: "Một con số \"tổng số phim\" thiếu mọi phim không có trường được index."
  en: "A \"total movies\" figure missing every movie that lacks the indexed field."
requires: [e-mg-l3-16]
skills: [index_design]
adv: []
sources:
  - https://www.mongodb.com/docs/manual/core/index-sparse/
verified: { version: "MongoDB manual 9.0", date: "2026-11-20" }
pair:
  runtime: none
  check: syntax
  setup: null
  bad: |
    db.movies.find().hint({ rated: 1 }).count()
  good: |
    db.movies.countDocuments({})
  expect: null
quiz:
  - q:
      vi: "Collection `movies` có index sparse `{ rated: 1 }`, và một số phim không có trường `rated`. `db.movies.find().hint({ rated: 1 }).count()` đếm gì?"
      en: "The `movies` collection has a sparse index `{ rated: 1 }`, and some movies have no `rated` field. What does `db.movies.find().hint({ rated: 1 }).count()` count?"
    options:
      - { vi: "Mọi phim trong collection", en: "Every movie in the collection" }
      - { vi: "Chỉ phim có trường `rated`", en: "Only movies that have a `rated` field" }
      - { vi: "Báo lỗi vì index sparse không hint được", en: "An error, because a sparse index cannot be hinted" }
    answer: 1
    why:
      vi: "Index sparse chỉ chứa tài liệu có trường được index. Docs: với `count()` không có điều kiện lọc mà có `hint`, MongoDB vẫn dùng index sparse, nên chỉ đếm phim có `rated` và bỏ sót phim thiếu trường; không có lỗi nào. Không có `hint`, MongoDB tự tránh index sparse khi nó làm thiếu kết quả."
      en: "A sparse index holds only documents that have the indexed field. The docs: for a `count()` with no filter but a `hint`, MongoDB still uses the sparse index, so it counts only movies with `rated` and misses the others; no error is raised. Without a `hint`, MongoDB avoids a sparse index when it would give incomplete results."
---

## Ý chính

Không `hint()` một index sparse (hay partial) cho truy vấn hoặc phép đếm cần mọi tài liệu. Đếm cả collection thì dùng `countDocuments({})`; đếm tập con thì viết điều kiện khớp đúng tập con đó.

## Vì sao

- Index sparse bỏ qua tài liệu không có trường được index.
- MongoDB tự tránh index sparse khi nó cho kết quả thiếu, nhưng `hint()` ép dùng nó.
- Kết quả sai trông vẫn hợp lý, và không có lỗi nào.
- Thẻ này chỉ cú pháp: mingo không có index nên không ép được kế hoạch.

# EN

## Key idea

Never `hint()` a sparse (or partial) index for a query or a count that needs every document. Count the whole collection with `countDocuments({})`; count a subset with a condition that matches exactly that subset.

## Why

- A sparse index skips documents that lack the indexed field.
- MongoDB avoids a sparse index on its own when it would give incomplete results, but `hint()` forces it.
- The wrong result still looks plausible, and there is no error.
- This card is syntax only: mingo has no indexes, so it cannot force a plan.
