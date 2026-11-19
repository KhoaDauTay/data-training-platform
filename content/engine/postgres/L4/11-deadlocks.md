---
id: e-pg-l4-11
engine: postgres
level: L4
module: locks
title: "Deadlock: Postgres phát hiện thế nào và cách phòng"
title_en: "Deadlocks: how Postgres detects them and how to prevent them"
kind: concept
runtime: docs
minutes: 12
objectives:
  - { vi: "Đi từng bước một deadlock hai phiên và chỉ ra chu trình chờ", en: "Walk through a two-session deadlock step by step and point to the wait cycle" }
  - { vi: "Biết Postgres phát hiện sau `deadlock_timeout` và hủy một giao dịch với lỗi 40P01", en: "Know that Postgres detects it after `deadlock_timeout` and aborts one transaction with error 40P01" }
  - { vi: "Phòng deadlock bằng thứ tự khóa nhất quán và giao dịch ngắn", en: "Prevent deadlocks with a consistent lock order and short transactions" }
requires: [e-pg-l4-10]
sources:
  - https://www.postgresql.org/docs/18/explicit-locking.html
  - https://www.postgresql.org/docs/18/runtime-config-locks.html
  - https://www.postgresql.org/docs/18/errcodes-appendix.html
viz: pg-lock-matrix
quiz:
  - q: { vi: "Hai job chuyển tiền chạy song song: job 1 chuyển 1 → 2, job 2 chuyển 2 → 1, mỗi job cập nhật tài khoản nguồn trước rồi tài khoản đích. Cách sửa gốc là gì?", en: "Two transfer jobs run in parallel: job 1 moves money 1 → 2, job 2 moves 2 → 1, each updating the source account first, then the destination. What is the root fix?" }
    options:
      - { vi: "Tăng `deadlock_timeout`", en: "Raise `deadlock_timeout`" }
      - { vi: "Luôn cập nhật tài khoản có mã nhỏ hơn trước, bất kể chiều chuyển", en: "Always update the account with the smaller id first, whatever the direction" }
      - { vi: "Chuyển sang mức cô lập SERIALIZABLE", en: "Switch to SERIALIZABLE isolation" }
    answer: 1
    why: { vi: "Deadlock cần một chu trình. Khi mọi giao dịch lấy khóa theo cùng một thứ tự, chu trình không thể hình thành. Tăng thời gian chờ chỉ làm phát hiện chậm hơn.", en: "A deadlock needs a cycle. When every transaction takes its locks in the same order, no cycle can form. A longer timeout only makes detection slower." }
  - q: { vi: "Postgres giải quyết deadlock thế nào?", en: "How does Postgres resolve a deadlock?" }
    options:
      - { vi: "Cả hai giao dịch chờ mãi", en: "Both transactions wait forever" }
      - { vi: "Sau khi chờ một khóa quá `deadlock_timeout` (mặc định 1s), phiên đó kiểm tra chu trình; nếu có, một giao dịch bị hủy với SQLSTATE 40P01 và bên kia đi tiếp", en: "After waiting on a lock longer than `deadlock_timeout` (default 1s), that session checks for a cycle; if there is one, one transaction is aborted with SQLSTATE 40P01 and the other proceeds" }
      - { vi: "Postgres hủy giao dịch bắt đầu sau", en: "Postgres always aborts the transaction that started later" }
    answer: 1
    why: { vi: "Kiểm tra deadlock tốn kém nên chỉ chạy khi đã chờ đủ `deadlock_timeout`. Tài liệu nói không đoán trước được giao dịch nào bị hủy, nên ứng dụng phải sẵn sàng thử lại.", en: "Deadlock checking is expensive, so it only runs after waiting `deadlock_timeout`. The docs say which transaction is aborted is hard to predict, so the application must be ready to retry." }
---

## Ý chính

- Deadlock: A giữ khóa X và chờ Y; B giữ Y và chờ X. Không ai nhả được. Có thể xảy ra với khóa dòng, khóa bảng hay khóa tư vấn (advisory).
- Postgres tự phát hiện: phiên nào chờ một khóa lâu hơn `deadlock_timeout` (mặc định 1s, đo trên PGlite: 1000 ms) sẽ dò đồ thị chờ. Có chu trình thì một giao dịch bị hủy với `ERROR: deadlock detected` (SQLSTATE 40P01).
- Phòng ngừa: lấy khóa theo thứ tự nhất quán (ví dụ theo khóa chính tăng dần); khóa cái mạnh nhất cần dùng ngay từ đầu thay vì nâng cấp giữa chừng; giữ giao dịch ngắn; ứng dụng luôn bắt 40P01 và thử lại.
- `lock_timeout` khác `deadlock_timeout`: cái đầu là giới hạn chờ của chính bạn (lỗi 55P03), cái sau chỉ là lúc bắt đầu dò chu trình.

## Ví dụ

Diễn từng bước (mô phỏng có giải thích; PGlite chỉ có một phiên nên không chạy thật được hai phiên):

```text
t1  A: BEGIN; UPDATE acct SET bal = bal - 10 WHERE id = 1;   -- A locks row 1
t2  B: BEGIN; UPDATE acct SET bal = bal - 10 WHERE id = 2;   -- B locks row 2
t3  A: UPDATE acct SET bal = bal + 10 WHERE id = 2;          -- A waits for B
t4  B: UPDATE acct SET bal = bal + 10 WHERE id = 1;          -- B waits for A: cycle
t4 + deadlock_timeout:
    ERROR:  deadlock detected   (SQLSTATE 40P01)  -- one side aborted, the other goes on
```

Sửa: cả hai job cập nhật `id = 1` trước `id = 2`. Khi đó B ở t2 phải chờ A ngay ở dòng 1, và không có chu trình.

## Thực hành

Bấm qua từng bước trên sơ đồ hai làn thời gian, rồi trả lời hai câu hỏi. Kỹ năng chuyên gia: đọc log deadlock, tìm hai câu lệnh tạo chu trình và sửa thứ tự khóa trong code.

# EN

## Key idea

- A deadlock: A holds lock X and waits for Y; B holds Y and waits for X. Neither can let go. It can happen with row locks, table locks or advisory locks.
- Postgres detects it on its own: a session that waits on a lock longer than `deadlock_timeout` (default 1s, measured on PGlite: 1000 ms) searches the wait graph. If there is a cycle, one transaction is aborted with `ERROR: deadlock detected` (SQLSTATE 40P01).
- Prevention: take locks in a consistent order (for example by ascending primary key); take the strongest lock you need up front instead of upgrading halfway; keep transactions short; and have the application always catch 40P01 and retry.
- `lock_timeout` is not `deadlock_timeout`: the first is your own wait limit (error 55P03), the second only says when the cycle search starts.

## Example

Step by step (an explained simulation; PGlite has a single session, so two sessions cannot really run here):

```text
t1  A: BEGIN; UPDATE acct SET bal = bal - 10 WHERE id = 1;   -- A locks row 1
t2  B: BEGIN; UPDATE acct SET bal = bal - 10 WHERE id = 2;   -- B locks row 2
t3  A: UPDATE acct SET bal = bal + 10 WHERE id = 2;          -- A waits for B
t4  B: UPDATE acct SET bal = bal + 10 WHERE id = 1;          -- B waits for A: cycle
t4 + deadlock_timeout:
    ERROR:  deadlock detected   (SQLSTATE 40P01)  -- one side aborted, the other goes on
```

Fix: both jobs update `id = 1` before `id = 2`. Then B at t2 has to wait for A right at row 1, and there is no cycle.

## Practice

Step through the two-lane timeline diagram, then answer two questions. Expert skill: read a deadlock log, find the two statements that form the cycle and fix the lock order in the code.
