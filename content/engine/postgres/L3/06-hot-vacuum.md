---
id: e-pg-l3-06
engine: postgres
level: L3
module: vacuum-hot
title: HOT, prune và VACUUM
title_en: HOT, pruning and VACUUM
kind: concept
runtime: docs
minutes: 10
viz: pg-hot
objectives:
  - vi: Nêu hai điều kiện của một HOT update
    en: State the two conditions for a HOT update
  - vi: Kể bốn việc VACUUM làm
    en: List the four jobs of VACUUM
requires: [e-pg-l3-04]
sources:
  - https://www.postgresql.org/docs/18/storage-hot.html
  - https://www.postgresql.org/docs/18/routine-vacuuming.html
  - https://www.postgresql.org/docs/18/storage-vm.html
  - https://www.postgresql.org/docs/18/storage-fsm.html
quiz:
  - q:
      vi: "Bảng `orders` có index trên `id` và `updated_at`. Câu nào sau đây **không bao giờ** được HOT?"
      en: "Table `orders` has indexes on `id` and `updated_at`. Which statement can **never** be a HOT update?"
    options:
      - { vi: "`UPDATE orders SET note = 'x' WHERE id = 1`", en: "`UPDATE orders SET note = 'x' WHERE id = 1`" }
      - { vi: "`UPDATE orders SET updated_at = now() WHERE id = 1`", en: "`UPDATE orders SET updated_at = now() WHERE id = 1`" }
      - { vi: "Cả hai đều có thể HOT nếu trang còn chỗ", en: "Both can be HOT if the page has room" }
    answer: 1
    why:
      vi: "HOT cần cả hai: không đổi cột nào mà index dùng (trừ BRIN), và trang còn chỗ. Câu thứ hai đổi `updated_at`, một cột có index, nên luôn phải chèn mục mới vào mọi index."
      en: "HOT needs both: no column used by an index changes (BRIN aside), and the page has room. The second statement changes `updated_at`, an indexed column, so it always inserts new entries into every index."
  - q:
      vi: "Việc nào **không** phải là một trong bốn lý do chạy VACUUM theo docs chính thức?"
      en: "Which of these is **not** one of the four reasons to VACUUM listed in the docs?"
    options:
      - { vi: "Thu hồi chỗ của dead tuple", en: "Recover the space of dead rows" }
      - { vi: "Cập nhật visibility map cho index-only scan", en: "Update the visibility map for index-only scans" }
      - { vi: "Sắp lại dòng theo khóa chính", en: "Reorder rows by primary key" }
      - { vi: "Chống mất dữ liệu do XID wraparound", en: "Protect against data loss from XID wraparound" }
    answer: 2
    why:
      vi: "Bốn lý do là: thu hồi chỗ, cập nhật thống kê cho planner, cập nhật visibility map, chống wraparound. VACUUM không sắp xếp lại dòng (đó là `CLUSTER`)."
      en: "The four reasons are: recover space, update planner statistics, update the visibility map, protect against wraparound. VACUUM never reorders rows (that is `CLUSTER`)."
---

## Ý chính

Hai bảng cùng bị UPDATE cả nghìn lần: vì sao một bảng phình to còn bảng kia gần như không?

**HOT** (heap-only tuple): UPDATE mà bản mới nằm cùng trang và không cần mục index mới. Hai điều kiện:

- không đổi cột nào mà index dùng (trừ index tóm tắt như BRIN);
- trang cũ còn đủ chỗ. Giảm `fillfactor` để chừa chỗ cho việc này.

Bản cũ trỏ sang bản mới qua `t_ctid`, tạo một **chuỗi HOT**. Index vẫn trỏ vào line pointer đầu chuỗi.

**Prune**: khi một trang gần đầy được đọc, Postgres có thể dọn chuỗi HOT ngay trong trang. Line pointer đầu chuỗi thành **redirect** trỏ tới bản sống.

**VACUUM** làm bốn việc: thu hồi chỗ của dead tuple (ghi vào **free space map**), cập nhật thống kê, bật bit all-visible trong **visibility map**, và freeze tuple cũ để chống XID wraparound.

## Ví dụ

```sql
SELECT n_tup_upd, n_tup_hot_upd FROM pg_stat_user_tables WHERE relname = 'wallet';
```

Tỉ lệ `n_tup_hot_upd / n_tup_upd` thấp trên bảng UPDATE nhiều là dấu hiệu "HOT miss".

## Thực hành

Bấm qua sơ đồ chuỗi HOT: UPDATE → bản mới cùng trang → index vẫn trỏ lp 1 → prune: lp 1 thành redirect. Học xong mô-đun này bạn chọn được fillfactor cho bảng cập nhật nhiều và kiểm HOT bằng số đếm.

# EN

## Key idea

Two tables each take a thousand UPDATEs: why does one bloat while the other barely grows?

**HOT** (heap-only tuple): an UPDATE whose new version stays on the same page and needs no new index entry. Two conditions:

- no column used by an index changes (summarizing indexes such as BRIN aside);
- the old page has enough room. Lower the `fillfactor` to keep room for this.

The old version points to the new one through `t_ctid`, forming a **HOT chain**. Indexes keep pointing at the line pointer at the head of the chain.

**Pruning**: when a nearly full page is read, Postgres may clean HOT chains inside the page. The head line pointer becomes a **redirect** to the live version.

**VACUUM** has four jobs: recover the space of dead tuples (recorded in the **free space map**), update statistics, set all-visible bits in the **visibility map**, and freeze old tuples to protect against XID wraparound.

## Example

```sql
SELECT n_tup_upd, n_tup_hot_upd FROM pg_stat_user_tables WHERE relname = 'wallet';
```

A low `n_tup_hot_upd / n_tup_upd` ratio on an update-heavy table is the sign of "HOT misses".

## Practice

Step through the HOT chain diagram: UPDATE → new version on the same page → index still points at lp 1 → pruning: lp 1 becomes a redirect. After this module you can pick a fillfactor for an update-heavy table and check HOT with the counters.
