---
id: e-ds-l5-04
engine: design
level: L5
module: transactions
title: Lịch, khả tuần tự xung đột và đồ thị tiền nhiệm
title_en: Schedules, conflict serializability and the precedence graph
kind: quiz
runtime: browser
minutes: 15
objectives:
  - vi: Chỉ ra các cặp thao tác xung đột trong một lịch và vẽ đồ thị tiền nhiệm.
    en: Find the conflicting pairs of operations in a schedule and draw its precedence graph.
  - vi: Kết luận một lịch có khả tuần tự xung đột không, và phân biệt với khả tuần tự view, khả phục hồi.
    en: Decide whether a schedule is conflict serializable, and tell it apart from view serializable and recoverable.
  - vi: Tìm cạnh và chu trình của đồ thị bằng SQL trên một bảng ghi lịch.
    en: Find the graph's edges and cycles with SQL over a table that records the schedule.
requires: [e-ds-l1-01]
sources:
  - https://www.postgresql.org/docs/18/transaction-iso.html
  - https://arxiv.org/abs/1208.4179
lab:
  setup: |
    CREATE TABLE ops (step int PRIMARY KEY, tx text NOT NULL, op text NOT NULL CHECK (op IN ('R', 'W')), item text NOT NULL);
    INSERT INTO ops VALUES
      (1, 'T1', 'R', 'A'), (2, 'T2', 'R', 'A'), (3, 'T1', 'W', 'A'),
      (4, 'T2', 'W', 'A'), (5, 'T3', 'R', 'B'), (6, 'T2', 'W', 'B');
  steps:
    - task:
        vi: "Liệt kê các cạnh của đồ thị tiền nhiệm: `from_tx`, `to_tx`, mỗi cạnh một lần, xếp theo hai cột đó. Có cạnh Ti → Tj khi một thao tác của Ti đứng trước một thao tác của Tj trên cùng mục, khác giao dịch, và ít nhất một trong hai là ghi."
        en: "List the edges of the precedence graph: `from_tx`, `to_tx`, each edge once, ordered by those two columns. There is an edge Ti → Tj when an operation of Ti comes before one of Tj on the same item, in different transactions, and at least one of them is a write."
      solution: SELECT DISTINCT a.tx AS from_tx, b.tx AS to_tx FROM ops a JOIN ops b ON a.item = b.item AND a.tx <> b.tx AND a.step < b.step AND (a.op = 'W' OR b.op = 'W') ORDER BY from_tx, to_tx
      check: rows
      ordered: true
      hint:
        vi: "Tự nối `ops` với chính nó; bốn điều kiện nối: cùng `item`, khác `tx`, `a.step < b.step`, có một `W`."
        en: "Join `ops` to itself; four join conditions: same `item`, different `tx`, `a.step < b.step`, one `W`."
    - task:
        vi: "Tìm chu trình độ dài 2: các cạnh `from_tx`, `to_tx` mà cạnh ngược lại cũng có. Xếp theo hai cột."
        en: "Find cycles of length 2: the edges `from_tx`, `to_tx` whose reverse edge also exists. Order by the two columns."
      solution: WITH e AS (SELECT DISTINCT a.tx AS from_tx, b.tx AS to_tx FROM ops a JOIN ops b ON a.item = b.item AND a.tx <> b.tx AND a.step < b.step AND (a.op = 'W' OR b.op = 'W')) SELECT e1.from_tx, e1.to_tx FROM e e1 JOIN e e2 ON e1.from_tx = e2.to_tx AND e1.to_tx = e2.from_tx ORDER BY e1.from_tx, e1.to_tx
      check: rows
      ordered: true
      hint:
        vi: "Đặt câu bước 1 vào `WITH e AS (…)`, rồi nối `e` với chính nó theo chiều ngược."
        en: "Put step 1's query in `WITH e AS (…)`, then join `e` to itself the other way round."
quiz:
  - q:
      vi: "Hai thao tác nào dưới đây xung đột?"
      en: "Which two operations below conflict?"
    options:
      - { vi: "`R1(A)` và `R2(A)`: cùng đọc A", en: "`R1(A)` and `R2(A)`: both read A" }
      - { vi: "`R1(A)` và `W2(A)`: khác giao dịch, cùng A, có một ghi", en: "`R1(A)` and `W2(A)`: different transactions, same A, one write" }
      - { vi: "`W1(A)` và `W1(B)`: cùng giao dịch", en: "`W1(A)` and `W1(B)`: same transaction" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì hai người cùng chạm A, nhưng hai lần đọc không đổi gì nên đổi chỗ được. Xung đột cần đủ ba điều: khác giao dịch, cùng mục, ít nhất một ghi."
      en: "It sounds right because both touch A, but two reads change nothing, so they can swap. A conflict needs all three: different transactions, the same item, at least one write."
  - q:
      vi: "Đồ thị tiền nhiệm của lịch trong lab có chu trình T1 → T2 → T1. Kết luận?"
      en: "The lab schedule's precedence graph has the cycle T1 → T2 → T1. Conclusion?"
    options:
      - { vi: "Lịch không khả tuần tự xung đột", en: "The schedule is not conflict serializable" }
      - { vi: "Lịch chắc chắn không khả tuần tự theo bất kỳ nghĩa nào", en: "The schedule is surely not serializable in any sense" }
      - { vi: "Chỉ cần đổi T3 ra đầu là ổn", en: "Moving T3 to the front fixes it" }
    answer: 0
    trap: 1
    why:
      vi: "Nhiều người nghĩ có chu trình là hết đường. Thật ra chu trình chỉ nói lịch không khả tuần tự xung đột; khả tuần tự view rộng hơn và có lịch qua được (với ghi mù). Kiểm khả tuần tự view là bài toán NP-đầy đủ, nên hệ thống thật dùng khả tuần tự xung đột."
      en: "Many people think a cycle closes every door. In fact a cycle only says the schedule is not conflict serializable; view serializability is broader and some such schedules pass it (with blind writes). Testing view serializability is NP-complete, so real systems use conflict serializability."
  - q:
      vi: "T2 đọc giá trị T1 vừa ghi, rồi T2 commit trước khi T1 commit. Sau đó T1 hủy. Lịch này thế nào?"
      en: "T2 reads a value T1 just wrote, then T2 commits before T1 commits. Then T1 aborts. What is this schedule?"
    options:
      - { vi: "Không khả phục hồi: T2 đã commit dựa trên dữ liệu bị hủy", en: "Not recoverable: T2 committed on data that was rolled back" }
      - { vi: "Ổn, vì T2 commit trước", en: "Fine, because T2 committed first" }
      - { vi: "Khả tuần tự nên khả phục hồi", en: "Serializable, so recoverable" }
    answer: 0
    trap: 2
    why:
      vi: "Nghe hợp lý vì khả tuần tự có vẻ là đủ an toàn, nhưng khả tuần tự nói về thứ tự, không nói về hủy. Khả phục hồi đòi: ai đọc của ai thì commit sau người đó. Tránh luôn hủy dây chuyền (cascadeless) thì chỉ đọc dữ liệu đã commit."
      en: "It sounds right because serializable feels safe enough, but serializability is about order, not aborts. Recoverable requires: whoever reads from someone commits after them. To avoid cascading aborts (cascadeless), read only committed data."
  - q:
      vi: "Lịch tuần tự là gì?"
      en: "What is a serial schedule?"
    options:
      - { vi: "Lịch chạy hết một giao dịch rồi mới tới giao dịch khác", en: "A schedule that runs one transaction to the end before the next starts" }
      - { vi: "Lịch có số thứ tự tăng dần", en: "A schedule whose steps are numbered upwards" }
      - { vi: "Lịch chỉ có thao tác đọc", en: "A schedule with only reads" }
    answer: 0
    trap: 1
    why:
      vi: "Nhiều người nghĩ \"tuần tự\" là các bước đánh số theo thứ tự. Thật ra lịch nào cũng có thứ tự bước; tuần tự nghĩa là không xen kẽ. Khả tuần tự nghĩa là cho cùng kết quả với một lịch tuần tự nào đó."
      en: "Many people think \"serial\" means steps numbered in order. In fact every schedule has ordered steps; serial means no interleaving. Serializable means it gives the same result as some serial schedule."
---
## Mở bài

Hai giao dịch chạy xen kẽ, kết quả có giống như chạy lần lượt không? Lý thuyết lịch trả lời câu đó mà không cần chạy thử. Bài này đọc lịch, vẽ đồ thị, và để SQL tìm chu trình hộ bạn.

## Ý chính

Một **lịch** là thứ tự xen kẽ các thao tác đọc `R` và ghi `W` của nhiều giao dịch. Lịch **tuần tự** chạy hết giao dịch này mới tới giao dịch kia; nó luôn đúng nhưng chậm. Lịch **khả tuần tự** cho cùng kết quả với một lịch tuần tự nào đó.

Hai thao tác **xung đột** khi thuộc hai giao dịch khác nhau, chạm cùng một mục, và ít nhất một là ghi. Đổi chỗ hai thao tác kề nhau không xung đột thì kết quả không đổi. Lịch **khả tuần tự xung đột** khi đổi chỗ như vậy được tới một lịch tuần tự. Cách kiểm: vẽ **đồ thị tiền nhiệm**, mỗi giao dịch một đỉnh, cạnh Ti → Tj khi một thao tác của Ti xung đột với một thao tác đứng sau của Tj. Không có chu trình thì khả tuần tự xung đột, và thứ tự topo của đồ thị cho lịch tuần tự tương đương.

**Khả tuần tự view** rộng hơn: chỉ đòi cùng ai đọc của ai và cùng lần ghi cuối. Nó nhận thêm vài lịch có ghi mù, nhưng kiểm nó là NP-đầy đủ. **Khả phục hồi** là chuyện khác: ai đọc dữ liệu của ai thì phải commit sau người đó; **không hủy dây chuyền** khi chỉ đọc dữ liệu đã commit.

## Ví dụ

Lịch trong lab, mỗi dòng một bước:

```text
step  T1      T2      T3
1     R(A)
2             R(A)
3     W(A)
4             W(A)
5                     R(B)
6             W(B)
```

Cặp xung đột và cạnh:

```text
R1(A) step 1  before  W2(A) step 4   ->  T1 -> T2
R2(A) step 2  before  W1(A) step 3   ->  T2 -> T1
W1(A) step 3  before  W2(A) step 4   ->  T1 -> T2
R3(B) step 5  before  W2(B) step 6   ->  T3 -> T2
cycle T1 -> T2 -> T1: not conflict serializable
```

Đây là mẫu "cập nhật bị mất": cả hai đọc A rồi cùng ghi, lần ghi của T1 bị T2 đè.

## Tóm tắt

- Xung đột = khác giao dịch, cùng mục, ít nhất một ghi.
- Đồ thị tiền nhiệm không có chu trình ⇔ khả tuần tự xung đột; thứ tự topo cho lịch tuần tự.
- Khả tuần tự view rộng hơn nhưng kiểm là NP-đầy đủ.
- Khả phục hồi: đọc của ai thì commit sau người đó; không hủy dây chuyền: chỉ đọc dữ liệu đã commit.

# EN

## Opening

Two transactions run interleaved: is the result the same as running them one after the other? Schedule theory answers that without running anything. This lesson reads schedules, draws the graph, and lets SQL find the cycles for you.

## Key idea

A **schedule** is an interleaved order of the reads `R` and writes `W` of several transactions. A **serial** schedule finishes one transaction before the next starts; it is always correct but slow. A **serializable** schedule gives the same result as some serial schedule.

Two operations **conflict** when they belong to different transactions, touch the same item, and at least one is a write. Swapping two adjacent non-conflicting operations does not change the result. A schedule is **conflict serializable** when such swaps can turn it into a serial schedule. The test: draw the **precedence graph**, one node per transaction, an edge Ti → Tj when an operation of Ti conflicts with a later operation of Tj. No cycle means conflict serializable, and a topological order of the graph gives the equivalent serial schedule.

**View serializability** is broader: it only requires the same reads-from pairs and the same final writes. It accepts a few more schedules with blind writes, but testing it is NP-complete. **Recoverability** is a separate matter: whoever reads data written by another transaction must commit after it; a schedule is **cascadeless** when it reads only committed data.

## Example

The lab's schedule, one step per line:

```text
step  T1      T2      T3
1     R(A)
2             R(A)
3     W(A)
4             W(A)
5                     R(B)
6             W(B)
```

Conflicting pairs and edges:

```text
R1(A) step 1  before  W2(A) step 4   ->  T1 -> T2
R2(A) step 2  before  W1(A) step 3   ->  T2 -> T1
W1(A) step 3  before  W2(A) step 4   ->  T1 -> T2
R3(B) step 5  before  W2(B) step 6   ->  T3 -> T2
cycle T1 -> T2 -> T1: not conflict serializable
```

This is the "lost update" pattern: both read A and then both write it, and T2's write overwrites T1's.

## Recap

- A conflict = different transactions, the same item, at least one write.
- Precedence graph without a cycle ⇔ conflict serializable; a topological order gives the serial schedule.
- View serializability is broader, but testing it is NP-complete.
- Recoverable: commit after whoever you read from; cascadeless: read only committed data.
