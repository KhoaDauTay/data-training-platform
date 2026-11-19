---
id: e-pg-l5-03
engine: postgres
level: L5
module: index-internals
title: "B-tree tự dọn: simple và bottom-up deletion"
title_en: "How B-tree indexes clean themselves: simple and bottom-up deletion"
kind: concept
minutes: 12
objectives:
  - { vi: "Phân biệt ba cách dọn mục chết trong B-tree: simple deletion, bottom-up deletion, VACUUM", en: "Tell apart the three ways a B-tree drops dead items: simple deletion, bottom-up deletion and VACUUM" }
  - { vi: "Giải thích \"version churn\": UPDATE không phải HOT tạo bản sao mục trong mọi index, kể cả index có cột không đổi", en: "Explain \"version churn\": a non-HOT UPDATE adds a new entry to every index, even indexes whose columns did not change" }
  - { vi: "Biết vì sao từ PostgreSQL 14 index ít phình hơn dưới tải UPDATE nặng", en: "Know why, since PostgreSQL 14, indexes bloat less under heavy UPDATE load" }
requires: [e-pg-l5-02]
sources:
  - https://www.postgresql.org/docs/18/btree.html
  - https://www.postgresql.org/docs/18/storage-hot.html
  - https://www.postgresql.org/docs/18/routine-vacuuming.html
viz: btree
quiz:
  - q: { vi: "Bảng `sessions` có index trên `user_id` và `last_seen`. Ứng dụng cập nhật `last_seen` liên tục. Index `user_id` nhận gì sau mỗi UPDATE?", en: "Table `sessions` has indexes on `user_id` and `last_seen`. The app updates `last_seen` constantly. What does the `user_id` index get after each UPDATE?" }
    options:
      - { vi: "Không gì, vì `user_id` không đổi", en: "Nothing, because `user_id` did not change" }
      - { vi: "Một mục mới trỏ tới phiên bản dòng mới, vì cột được index `last_seen` đổi nên UPDATE không thể là HOT", en: "A new entry pointing to the new row version, because an indexed column (`last_seen`) changed, so the UPDATE cannot be HOT" }
      - { vi: "Mục cũ bị sửa tại chỗ", en: "The old entry is changed in place" }
    answer: 1
    why: { vi: "Không phải HOT thì mọi index đều nhận mục mới, kể cả index \"không liên quan\". Mục cũ trỏ tới phiên bản chết: đó là version churn mà bottom-up deletion được thiết kế để dọn trước khi lá phải tách.", en: "Without HOT, every index gets a new entry, even the \"unrelated\" ones. The old entries point to dead versions: that is the version churn bottom-up deletion is designed to clear before a leaf has to split." }
  - q: { vi: "Điều gì kích hoạt một lượt bottom-up deletion?", en: "What triggers a bottom-up deletion pass?" }
    options:
      - { vi: "Autovacuum vượt ngưỡng số dòng chết của bảng", en: "Autovacuum crossing the table's dead-row threshold" }
      - { vi: "Một lần tách lá sắp xảy ra mà Postgres đoán là do version churn (index không bị UPDATE sửa về mặt logic)", en: "An imminent leaf split that Postgres suspects is caused by version churn (an index not logically changed by the UPDATE)" }
      - { vi: "Lệnh `REINDEX`", en: "A `REINDEX` command" }
    answer: 1
    why: { vi: "Tài liệu: bottom-up deletion là phản ứng với một \"version churn page split\" dự kiến, nhắm vào một lá, dựa trên phân biệt định tính giữa dòng logic và phiên bản. Ngược lại, VACUUM là dọn \"từ trên xuống\" theo ngưỡng định lượng của cả bảng.", en: "The docs: bottom-up deletion reacts to an anticipated \"version churn page split\", targets one leaf, and is based on qualitative distinctions between logical rows and versions. VACUUM, by contrast, is \"top-down\" cleanup driven by table-wide quantitative thresholds." }
---

## Ý chính

Ba cơ chế dọn mục chết trong B-tree:

- Simple deletion: khi một Index Scan thấy mục trỏ tới tuple đã chết với mọi giao dịch, nó đặt bit `LP_DEAD` trên mục. Khi lá sắp tách, các mục có bit này bị xóa trước.
- Bottom-up deletion (từ 14): khi lá sắp tách mà Postgres đoán nguyên nhân là version churn (nhiều phiên bản của cùng dòng logic, do UPDATE không sửa cột của index này), nó kiểm tra heap cho các mục nghi là rác trong đúng lá đó và xóa chúng. Thường tránh được việc tách.
- VACUUM (kể cả autovacuum): dọn "từ trên xuống" mọi mục trỏ tới tuple chết, kích hoạt bởi ngưỡng số lượng của cả bảng.

- Tại sao cần bottom-up deletion: UPDATE không HOT (vì đổi một cột có index, hoặc trang heap hết chỗ) chèn mục mới vào mọi index. Trước 14, các index "không liên quan" phình dần cho tới khi VACUUM chạy; tách lá thì không bao giờ gộp lại.
- Kết hợp với dedup: posting list của các phiên bản trùng khóa giúp lá chịu được churn lâu hơn trước khi phải dọn.
- Giảm churn từ gốc: để UPDATE thành HOT (không index cột hay đổi; `fillfactor` heap thấp hơn để còn chỗ trên trang).

## Ví dụ

Dòng thời gian một lá của index `user_id` dưới tải UPDATE `last_seen` (sơ đồ có giải thích, không đo được ổn định trong PGlite vì phụ thuộc thời điểm):

```text
leaf: [u42 -> (7,1)] [u42 -> (7,5)] [u42 -> (9,2)] ... full
insert u42 -> (9,8)       -- would split
  bottom-up pass: check heap for (7,1), (7,5): dead to everyone -> delete
  room again -> no split
```

## Thực hành

Bấm qua sơ đồ một lá B-tree đầy lên vì version churn, rồi hai câu hỏi. Kỹ năng chuyên gia: giải thích index phình dưới tải UPDATE và chọn cách sửa: thiết kế cho HOT, fillfactor, hay `REINDEX CONCURRENTLY` khi đã phình.

# EN

## Key idea

Three mechanisms remove dead items from a B-tree:

- Simple deletion: when an Index Scan sees an item pointing to a tuple that is dead to every transaction, it sets the `LP_DEAD` bit on the item. When the leaf is about to split, items with this bit are deleted first.
- Bottom-up deletion (since 14): when a leaf is about to split and Postgres suspects version churn (many versions of the same logical row, from UPDATEs that did not change this index's columns), it checks the heap for the suspected garbage items in that one leaf and deletes them. It usually avoids the split.
- VACUUM (including autovacuum): "top-down" removal of every item that points to a dead tuple, triggered by table-wide quantitative thresholds.

- Why bottom-up deletion is needed: a non-HOT UPDATE (an indexed column changed, or the heap page was full) inserts a new entry into every index. Before 14, the "unrelated" indexes slowly bloated until VACUUM ran, and a leaf split is never merged back.
- With deduplication: posting lists of same-key versions let a leaf absorb churn longer before cleanup is needed.
- Reduce churn at the source: make UPDATEs HOT (do not index columns that change often; a lower heap `fillfactor` leaves room on the page).

## Example

The timeline of one leaf of the `user_id` index under a `last_seen` UPDATE load (an explained diagram; it cannot be measured reliably in PGlite because it depends on timing):

```text
leaf: [u42 -> (7,1)] [u42 -> (7,5)] [u42 -> (9,2)] ... full
insert u42 -> (9,8)       -- would split
  bottom-up pass: check heap for (7,1), (7,5): dead to everyone -> delete
  room again -> no split
```

## Practice

Step through the diagram of a B-tree leaf filling up with version churn, then two questions. Expert skill: explain index bloat under UPDATE load and pick the fix: design for HOT, fillfactor, or `REINDEX CONCURRENTLY` once it has bloated.
