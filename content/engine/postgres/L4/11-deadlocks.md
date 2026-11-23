---
id: e-pg-l4-11
engine: postgres
level: L4
module: locks
title: "Deadlock: Postgres phát hiện thế nào và cách phòng"
title_en: "Deadlocks: how Postgres detects them and how to prevent them"
kind: concept
runtime: docs
docs_why: sessions
minutes: 12
objectives:
  - { vi: "Đi từng bước một deadlock hai phiên và chỉ ra chu trình chờ", en: "Walk through a two-session deadlock step by step and point to the wait cycle" }
  - { vi: "Biết Postgres phát hiện sau `deadlock_timeout` và hủy một transaction với lỗi 40P01", en: "Know that Postgres detects it after `deadlock_timeout` and aborts one transaction with error 40P01" }
  - { vi: "Phòng deadlock bằng thứ tự lock nhất quán và transaction ngắn", en: "Prevent deadlocks with a consistent lock order and short transactions" }
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
      - { vi: "Chuyển sang mức cô lập Serializable", en: "Switch to Serializable isolation" }
    answer: 1
    why: { vi: "Tăng `deadlock_timeout` hấp dẫn vì lỗi xuất hiện khi chờ lock, nhưng nó không gỡ được chu trình. Deadlock cần một chu trình. Khi mọi transaction lấy lock theo cùng một thứ tự, chu trình không thể hình thành. Tăng thời gian chờ chỉ làm phát hiện chậm hơn.", en: "Raising `deadlock_timeout` is tempting because the error shows up while waiting for a lock, but it cannot break the cycle. A deadlock needs a cycle. When every transaction takes its locks in the same order, no cycle can form. A longer timeout only makes detection slower." }
  - q: { vi: "Postgres giải quyết deadlock thế nào?", en: "How does Postgres resolve a deadlock?" }
    options:
      - { vi: "Cả hai transaction chờ mãi", en: "Both transactions wait forever" }
      - { vi: "Sau khi chờ một lock quá `deadlock_timeout` (mặc định 1s), phiên đó kiểm tra chu trình; nếu có, một transaction bị hủy với SQLSTATE 40P01 và bên kia đi tiếp", en: "After waiting on a lock longer than `deadlock_timeout` (default 1s), that session checks for a cycle; if there is one, one transaction is aborted with SQLSTATE 40P01 and the other proceeds" }
      - { vi: "Postgres hủy transaction bắt đầu sau", en: "Postgres always aborts the transaction that started later" }
    answer: 1
    why: { vi: "Hủy transaction bắt đầu sau nghe công bằng, như quy tắc ai đến trước được phục vụ trước, nhưng Postgres không chọn theo thứ tự bắt đầu. Kiểm tra deadlock tốn kém nên chỉ chạy khi đã chờ đủ `deadlock_timeout`. Docs chính thức nói không đoán trước được transaction nào bị hủy, nên ứng dụng phải sẵn sàng thử lại.", en: "Cancelling the transaction that started later sounds fair, like first come first served, but Postgres does not choose by start order. Deadlock checking is expensive, so it only runs after waiting `deadlock_timeout`. The docs say which transaction is aborted is hard to predict, so the application must be ready to retry." }
---

## Ý chính

Hai job chuyển tiền chạy cùng lúc theo hai chiều ngược nhau, và một job bị hủy: vì sao?

- Deadlock: A giữ lock X và chờ Y; B giữ Y và chờ X. Có thể xảy ra với row lock, lock trên bảng hay advisory lock.
- Postgres tự phát hiện: phiên nào chờ một lock lâu hơn `deadlock_timeout` (mặc định 1 giây) sẽ dò đồ thị chờ. Có chu trình thì một transaction bị hủy với `ERROR: deadlock detected` (SQLSTATE 40P01).
- Phòng ngừa: lấy lock theo thứ tự nhất quán (ví dụ khóa chính tăng dần); lấy lock mạnh nhất cần dùng ngay từ đầu thay vì nâng cấp giữa chừng; giữ transaction ngắn; ứng dụng luôn bắt 40P01 và thử lại.
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

Chạy thật cần nhiều phiên cùng lúc trên một server Postgres; PGlite chỉ có một phiên. Bài này dùng sơ đồ và kết quả ghi sẵn.

Bấm qua sơ đồ lock tới hai bước cuối: đồ thị chờ có vòng T1 → T2 → T1, rồi Postgres hủy một giao dịch (40P01). Sau đó trả lời hai câu hỏi. Kỹ năng chuyên gia: đọc log deadlock, tìm hai câu lệnh tạo chu trình và sửa thứ tự lock trong code.

# EN

## Key idea

Two money-transfer jobs run at the same time in opposite directions, and one of them is aborted: why?

- A deadlock: A holds lock X and waits for Y; B holds Y and waits for X. It can happen with row locks, table locks or advisory locks.
- Postgres detects it on its own: a session that waits on a lock longer than `deadlock_timeout` (default 1 second) searches the wait graph. If there is a cycle, one transaction is aborted with `ERROR: deadlock detected` (SQLSTATE 40P01).
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

A real run needs several concurrent sessions on one Postgres server; PGlite has only one session. This lesson uses diagrams and recorded output.

Step through the lock diagram to its last two steps: the waits-for graph has a cycle T1 -> T2 -> T1, then Postgres aborts one transaction (40P01). Then answer two questions. Expert skill: read a deadlock log, find the two statements that form the cycle and fix the lock order in the code.
