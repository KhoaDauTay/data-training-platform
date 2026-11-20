---
id: e-bp-m03
engine: best
track: mongodb
level: L2
module: m
title: "Tài liệu gọn: tách phần nặng ít dùng"
title_en: "Avoid bloated documents"
kind: quiz
minutes: 3
objectives:
  - vi: "Giữ trong tài liệu chính những gì màn hình chính cần, và tách trường lớn mà hiếm khi đọc (mô tả dài, tệp, lịch sử) sang collection khác, nối bằng reference."
    en: "Keep in the main document what the main screen needs, and move large, rarely read fields (long descriptions, files, history) to another collection, linked by a reference."
avoid:
  vi: "Danh sách sản phẩm chậm dần vì mỗi tài liệu kéo theo vài MB dữ liệu không ai xem."
  en: "A product list getting slower because every document drags along a few MB that nobody looks at."
requires: []
skills: []
adv: []
sources:
  - https://www.mongodb.com/docs/manual/data-modeling/design-antipatterns/bloated-documents/
verified: { version: "MongoDB manual 9.0", date: "2026-11-20" }
pair:
  runtime: none
  check: syntax
  setup: null
  bad: |
    db.products.insertOne({ _id: 'A', name: 'Tea', price: 100, manualPdfBase64: '…2 MB…', reviews: [ /* thousands */ ] })
  good: |
    db.products.insertOne({ _id: 'A', name: 'Tea', price: 100, topReviews: [ /* newest 3 */ ] })
    db.product_details.insertOne({ productId: 'A', manualUrl: 'https://…', specs: { /* … */ } })
  expect: null
quiz:
  - q:
      vi: "Vì sao tài liệu phình to làm cả hệ thống chậm, kể cả với truy vấn không đọc các trường lớn?"
      en: "Why do bloated documents slow the whole system down, even for queries that never read the large fields?"
    options:
      - { vi: "Vì MongoDB giới hạn mỗi collection 1.000 tài liệu", en: "Because MongoDB limits each collection to 1,000 documents" }
      - { vi: "Vì working set (dữ liệu và index hay dùng) không còn vừa RAM, nên phải đọc đĩa nhiều hơn", en: "Because the working set (frequently used data and indexes) no longer fits in RAM, so more reads go to disk" }
      - { vi: "Vì projection không bỏ được trường lớn", en: "Because a projection cannot leave out large fields" }
    answer: 1
    why:
      vi: "Docs: working set được giữ trong RAM; tài liệu quá lớn thì working set không vừa, và MongoDB phải đọc đĩa. Projection chỉ bớt dữ liệu gửi đi, cả tài liệu vẫn nằm trong cache."
      en: "The docs: the working set is held in RAM; when documents are too large it no longer fits, and MongoDB has to read from disk. A projection only trims what is sent, the whole document still sits in the cache."
---

## Ý chính

Trường lớn và hiếm khi đọc (tệp, mô tả dài, toàn bộ đánh giá) để ở collection khác. Tài liệu chính chỉ giữ những gì màn hình chính cần, cùng một tập con nhỏ nếu cần.

## Vì sao

- Working set gồm dữ liệu và index hay dùng, và được giữ trong RAM.
- Tài liệu phình làm RAM chứa ít tài liệu hơn, nên MongoDB phải đọc đĩa nhiều hơn.
- Docs gọi đây là bloated documents: các trường liên quan nhưng không được đọc cùng nhau.
- Thẻ này chỉ cú pháp: mingo không có cache hay đĩa, nên không đo được việc tài liệu chiếm bao nhiêu RAM.

# EN

## Key idea

Large, rarely read fields (files, long descriptions, every review) live in another collection. The main document keeps only what the main screen needs, plus a small subset if useful.

## Why

- The working set is the frequently used data and indexes, and it is held in RAM.
- Bloated documents mean fewer documents fit in RAM, so MongoDB reads from disk more often.
- The docs call these bloated documents: fields that are related but not read together.
- This card is syntax only: mingo has no cache or disk, so it cannot measure how much RAM a document takes.
