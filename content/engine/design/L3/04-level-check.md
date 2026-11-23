---
id: e-ds-l3-04
engine: design
level: L3
module: keys
title: Kiểm tra cấp 3 - phụ thuộc hàm và khóa
title_en: Level 3 check - functional dependencies and keys
kind: quiz
runtime: browser
minutes: 12
objectives:
  - vi: Tự kiểm tra cách tính bao đóng, tìm khóa ứng viên và rút phủ tối thiểu trên giấy.
    en: Check yourself on computing closures, finding candidate keys and reducing to a minimal cover on paper.
  - vi: Phân biệt phụ thuộc bộ phận và bắc cầu, và nhớ dữ liệu chỉ bác bỏ được một phụ thuộc.
    en: Tell partial from transitive dependencies, and remember that data can only refute a dependency.
requires: [e-ds-l3-03]
sources:
  - https://doi.org/10.1145/362384.362685
  - https://www.bkent.net/Doc/simple5.htm
  - https://www.postgresql.org/docs/18/queries-with.html
lab:
  setup: |
    CREATE TABLE fds (id int PRIMARY KEY, lhs text[] NOT NULL, rhs text NOT NULL);
    INSERT INTO fds VALUES (1, '{a}', 'b'), (2, '{b}', 'c'), (3, '{c}', 'a');
  steps:
    - task:
        vi: "Lược đồ R(a, b, c, d) có ba phụ thuộc vòng trong `fds`. Thuộc tính nào không nằm ở vế phải nào? Trả cột `attr`, xếp theo chữ cái."
        en: "Schema R(a, b, c, d) has three circular dependencies in `fds`. Which attribute is on no right side? Return column `attr`, in alphabetical order."
      solution: SELECT attr FROM unnest(ARRAY['a', 'b', 'c', 'd']) AS attr WHERE attr NOT IN (SELECT rhs FROM fds) ORDER BY attr
      check: rows
      ordered: true
      hint:
        vi: "`unnest(ARRAY['a', 'b', 'c', 'd'])` rồi bỏ những giá trị có trong `SELECT rhs FROM fds`."
        en: "`unnest(ARRAY['a', 'b', 'c', 'd'])`, then drop the values found in `SELECT rhs FROM fds`."
    - task:
        vi: "Tính bao đóng của `{b,d}` (cột `closure`, thuộc tính xếp theo chữ cái nối bằng dấu phẩy). Đủ bốn thuộc tính thì `{b,d}` là một khóa ứng viên."
        en: "Compute the closure of `{b,d}` (column `closure`, attributes in alphabetical order joined with commas). If it has all four attributes, `{b,d}` is a candidate key."
      solution: |
        WITH RECURSIVE c(n, attrs) AS (
          SELECT 0, ARRAY['b', 'd']
          UNION ALL
          SELECT n + 1, ARRAY(SELECT DISTINCT x FROM unnest(attrs || ARRAY(SELECT rhs FROM fds WHERE lhs <@ attrs)) AS x ORDER BY x)
          FROM c WHERE n < 5
        )
        SELECT array_to_string(attrs, ',') AS closure FROM c ORDER BY n DESC LIMIT 1
      check: rows
      hint:
        vi: "Dùng lại câu `WITH RECURSIVE` của bài bao đóng, điểm xuất phát `ARRAY['b', 'd']`."
        en: "Reuse the `WITH RECURSIVE` query from the closure lesson, starting from `ARRAY['b', 'd']`."
quiz:
  - q:
      vi: "R(A, B, C, D) với `A → B`, `B → C`, `C → A`. Lược đồ có bao nhiêu khóa ứng viên?"
      en: "R(A, B, C, D) with `A → B`, `B → C`, `C → A`. How many candidate keys does the schema have?"
    options:
      - { vi: "Một: `{A, D}`", en: "One: `{A, D}`" }
      - { vi: "Ba: `{A, D}`, `{B, D}`, `{C, D}`", en: "Three: `{A, D}`, `{B, D}`, `{C, D}`" }
      - { vi: "Một: `{A, B, C, D}`", en: "One: `{A, B, C, D}`" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì người ta quen nghĩ mỗi bảng có một khóa, nhưng A, B, C quyết định lẫn nhau theo vòng, nên mỗi cái ghép với D đều thành siêu khóa tối thiểu. D không nằm ở vế phải nào nên có trong cả ba khóa."
      en: "It sounds right because people expect one key per table, but A, B and C determine each other in a cycle, so each of them with D is a minimal superkey. D is on no right side, so it is in all three keys."
  - q:
      vi: "Khóa là `(student_id, course_id)` và có `course_id → course_title`. Đó là phụ thuộc gì?"
      en: "The key is `(student_id, course_id)` and `course_id → course_title` holds. What kind of dependency is that?"
    options:
      - { vi: "Bắc cầu", en: "Transitive" }
      - { vi: "Bộ phận", en: "Partial" }
      - { vi: "Tầm thường", en: "Trivial" }
    answer: 1
    trap: 0
    why:
      vi: "Nhiều người gọi mọi phụ thuộc \"đi qua một cột khác\" là bắc cầu. Thật ra ở đây `course_title` phụ thuộc một phần của khóa ghép: đó là phụ thuộc bộ phận, thứ mà 2NF loại bỏ. Bắc cầu là đi qua một cột không thuộc khóa."
      en: "Many people call any dependency that \"goes through another column\" transitive. In fact here `course_title` depends on part of the composite key: a partial dependency, the thing 2NF removes. Transitive means going through a non-key column."
  - q:
      vi: "Phủ tối thiểu của `{A → BC, B → C, A → B}` là gì?"
      en: "What is the minimal cover of `{A → BC, B → C, A → B}`?"
    options:
      - { vi: "`{A → B, B → C}`", en: "`{A → B, B → C}`" }
      - { vi: "`{A → B, A → C, B → C}`", en: "`{A → B, A → C, B → C}`" }
      - { vi: "`{A → BC, B → C}`", en: "`{A → BC, B → C}`" }
    answer: 0
    trap: 1
    why:
      vi: "Tách vế phải xong, nhiều người dừng lại và giữ `A → C`. Thật ra `A → C` suy ra được từ `A → B` và `B → C` (bắc cầu) nên là thừa; phủ tối thiểu còn đúng hai phụ thuộc."
      en: "After splitting the right sides, many people stop and keep `A → C`. In fact `A → C` follows from `A → B` and `B → C` (transitivity), so it is redundant; the minimal cover keeps just two dependencies."
  - q:
      vi: "Hai tập phụ thuộc F và G khi nào tương đương?"
      en: "When are two dependency sets F and G equivalent?"
    options:
      - { vi: "Khi chúng có cùng số phụ thuộc", en: "When they have the same number of dependencies" }
      - { vi: "Khi mỗi phụ thuộc của tập này suy ra được từ tập kia, theo cả hai chiều", en: "When every dependency of each set can be derived from the other, both ways" }
      - { vi: "Khi chúng giống hệt nhau từng dòng", en: "When they are identical line by line" }
    answer: 1
    trap: 2
    why:
      vi: "Nghe hợp lý vì hai tập giống hệt chắc chắn tương đương, nhưng điều ngược lại không cần: `{A → BC}` và `{A → B, A → C}` khác chữ mà vẫn tương đương. Kiểm bằng bao đóng theo cả hai chiều."
      en: "It sounds right because identical sets are surely equivalent, but the converse is not needed: `{A → BC}` and `{A → B, A → C}` differ in text yet are equivalent. Check with closures in both directions."
  - q:
      vi: "Bảng `users` có `id` tự tăng làm khóa chính. Cột `email` cũng xác định duy nhất một người. Nên làm gì với `email`?"
      en: "Table `users` has an auto-generated `id` as primary key. Column `email` also identifies one person. What should you do with `email`?"
    options:
      - { vi: "Không cần gì: đã có khóa chính", en: "Nothing: there is already a primary key" }
      - { vi: "Giữ nó là khóa thay thế bằng `UNIQUE` (và `NOT NULL`)", en: "Keep it as an alternate key with `UNIQUE` (and `NOT NULL`)" }
      - { vi: "Đổi khóa chính sang `email` và xóa `id`", en: "Make `email` the primary key and drop `id`" }
    answer: 1
    trap: 0
    why:
      vi: "Nhiều người nghĩ có khóa chính rồi là đủ. Thật ra khóa nhân tạo chỉ chặn trùng `id`, không chặn hai dòng cùng `email`; khóa ứng viên còn lại phải được giữ bằng `UNIQUE`."
      en: "Many people think a primary key is enough. In fact a surrogate key only blocks duplicate `id` values, not two rows with the same `email`; the other candidate key must be kept with `UNIQUE`."
---
## Mở bài

Năm câu hỏi giải trên giấy và một lab nhỏ để chốt cấp 3. Sai câu nào thì đọc lời giải thích rồi quay lại bài bao đóng hoặc bài phụ thuộc hàm.

## Ý chính

Cấp 3 xoay quanh một công cụ: bao đóng thuộc tính. Phụ thuộc hàm `X → Y` là luật về nghĩa; dữ liệu chỉ bác bỏ được nó. Luật Armstrong suy ra mọi phụ thuộc kéo theo. Bao đóng X⁺ cho biết X quyết định những gì, nên trả lời được X có phải siêu khóa không, hai tập phụ thuộc có tương đương không, một phụ thuộc có thừa không.

Tìm khóa ứng viên: lấy các thuộc tính không nằm ở vế phải nào, tính bao đóng, thêm dần thuộc tính khác; giữ những tập tối thiểu. Một lược đồ có thể có nhiều khóa ứng viên khi các thuộc tính quyết định lẫn nhau.

## Ví dụ

Giải mẫu câu hỏi thứ nhất bằng bao đóng.

```text
R(A, B, C, D), F = {A → B, B → C, C → A}
D is on no right side → D is in every key
{D}+     = {D}                       not a key
{A, D}+  = {A, B, C, D}              key
{B, D}+  = {A, B, C, D}              key
{C, D}+  = {A, B, C, D}              key
candidate keys: {A, D}, {B, D}, {C, D}; prime attributes: A, B, C, D
```

## Tóm tắt

- Phụ thuộc đến từ nghĩa nghiệp vụ; dữ liệu chỉ bác bỏ được.
- Bao đóng lặp tới khi đứng yên; X là siêu khóa khi X⁺ là mọi thuộc tính.
- Khóa ứng viên là siêu khóa tối thiểu; thuộc tính không ở vế phải nào có trong mọi khóa.
- Phủ tối thiểu bỏ thuộc tính thừa ở vế trái và phụ thuộc suy ra được từ phần còn lại.

# EN

## Opening

Five paper exercises and a small lab to wrap up level 3. If you miss one, read the explanation and go back to the closure lesson or the functional dependency lesson.

## Key idea

Level 3 turns around one tool: attribute closure. A functional dependency `X → Y` is a rule about meaning; data can only refute it. Armstrong's rules derive every implied dependency. The closure X⁺ tells what X determines, so it answers whether X is a superkey, whether two dependency sets are equivalent, and whether a dependency is redundant.

Finding candidate keys: take the attributes on no right side, compute their closure, add other attributes step by step, and keep the minimal sets. A schema can have several candidate keys when attributes determine each other.

## Example

The first question worked out with closures.

```text
R(A, B, C, D), F = {A → B, B → C, C → A}
D is on no right side → D is in every key
{D}+     = {D}                       not a key
{A, D}+  = {A, B, C, D}              key
{B, D}+  = {A, B, C, D}              key
{C, D}+  = {A, B, C, D}              key
candidate keys: {A, D}, {B, D}, {C, D}; prime attributes: A, B, C, D
```

## Recap

- Dependencies come from business meaning; data can only refute them.
- Closure repeats until stable; X is a superkey when X⁺ is every attribute.
- A candidate key is a minimal superkey; an attribute on no right side is in every key.
- A minimal cover drops extraneous left-side attributes and dependencies the rest already derive.
