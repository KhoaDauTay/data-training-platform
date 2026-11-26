---
id: e-ds-l3-03
engine: design
level: L3
module: keys
title: Bao đóng, phủ tối thiểu, khóa ứng viên và siêu khóa
title_en: Closure, minimal cover, candidate keys and superkeys
kind: concept
runtime: browser
minutes: 20
figures: [{ name: ds-closure-rounds, at: example }]
objectives:
  - vi: Tính bao đóng X⁺ của một tập thuộc tính và dùng nó để biết X có phải siêu khóa không.
    en: Compute the closure X⁺ of a set of attributes and use it to tell whether X is a superkey.
  - vi: Tìm mọi khóa ứng viên của một lược đồ nhỏ và gọi tên các loại khóa.
    en: Find every candidate key of a small schema and name the kinds of key.
  - vi: Rút một tập phụ thuộc về phủ tối thiểu, và kiểm hai tập có tương đương không.
    en: Reduce a set of dependencies to a minimal cover, and check whether two sets are equivalent.
requires: [e-ds-l3-01]
sources:
  - https://doi.org/10.1145/362384.362685
  - https://www.bkent.net/Doc/simple5.htm
  - https://www.postgresql.org/docs/18/queries-with.html
  - https://www.postgresql.org/docs/18/ddl-constraints.html
lab:
  setup: |
    CREATE TABLE fds (id int PRIMARY KEY, lhs text[] NOT NULL, rhs text NOT NULL);
    INSERT INTO fds VALUES (1, '{a}', 'b'), (2, '{b}', 'c'), (3, '{c,d}', 'e');
  steps:
    - task:
        vi: "Lược đồ R(a, b, c, d, e) có các phụ thuộc trong bảng `fds`. Tính bao đóng của `{a}`: một dòng, cột `closure` là các thuộc tính xếp theo chữ cái, nối bằng dấu phẩy."
        en: "Schema R(a, b, c, d, e) has the dependencies in table `fds`. Compute the closure of `{a}`: one row, column `closure` holding the attributes in alphabetical order, joined with commas."
      solution: |
        WITH RECURSIVE c(n, attrs) AS (
          SELECT 0, ARRAY['a']
          UNION ALL
          SELECT n + 1, ARRAY(SELECT DISTINCT x FROM unnest(attrs || ARRAY(SELECT rhs FROM fds WHERE lhs <@ attrs)) AS x ORDER BY x)
          FROM c WHERE n < 5
        )
        SELECT array_to_string(attrs, ',') AS closure FROM c ORDER BY n DESC LIMIT 1
      check: rows
      hint:
        vi: "Mỗi vòng thêm `rhs` của mọi phụ thuộc có `lhs <@ attrs`; lặp vài vòng bằng `WITH RECURSIVE`, rồi lấy vòng cuối và `array_to_string(attrs, ',')`."
        en: "Each round adds the `rhs` of every dependency with `lhs <@ attrs`; repeat a few rounds with `WITH RECURSIVE`, then take the last round and `array_to_string(attrs, ',')`."
    - task:
        vi: "Giờ tính bao đóng của `{a,d}`, cùng định dạng. Nếu nó chứa cả năm thuộc tính thì `{a,d}` là siêu khóa."
        en: "Now compute the closure of `{a,d}`, same format. If it holds all five attributes, `{a,d}` is a superkey."
      solution: |
        WITH RECURSIVE c(n, attrs) AS (
          SELECT 0, ARRAY['a', 'd']
          UNION ALL
          SELECT n + 1, ARRAY(SELECT DISTINCT x FROM unnest(attrs || ARRAY(SELECT rhs FROM fds WHERE lhs <@ attrs)) AS x ORDER BY x)
          FROM c WHERE n < 5
        )
        SELECT array_to_string(attrs, ',') AS closure FROM c ORDER BY n DESC LIMIT 1
      check: rows
      hint:
        vi: "Cùng câu như bước trước, chỉ đổi điểm xuất phát thành `ARRAY['a', 'd']`."
        en: "The same query as the step before, only the start becomes `ARRAY['a', 'd']`."
    - task:
        vi: "Thuộc tính nào trong `a`, `b`, `c`, `d`, `e` không bao giờ nằm ở vế phải? Chúng phải có trong mọi khóa. Trả cột `attr`, xếp theo chữ cái."
        en: "Which of `a`, `b`, `c`, `d`, `e` never appear on a right side? They must be in every key. Return column `attr`, in alphabetical order."
      solution: SELECT attr FROM unnest(ARRAY['a', 'b', 'c', 'd', 'e']) AS attr WHERE attr NOT IN (SELECT rhs FROM fds) ORDER BY attr
      check: rows
      ordered: true
      hint:
        vi: "`unnest(ARRAY['a', 'b', 'c', 'd', 'e'])` cho năm dòng; bỏ những dòng có trong `SELECT rhs FROM fds`."
        en: "`unnest(ARRAY['a', 'b', 'c', 'd', 'e'])` gives five rows; drop those found in `SELECT rhs FROM fds`."
quiz:
  - q:
      vi: "R(A, B, C, D) với `A → B`, `B → C`. Bao đóng của `A` là gì?"
      en: "R(A, B, C, D) with `A → B`, `B → C`. What is the closure of `A`?"
    options:
      - { vi: "`{A, B}`", en: "`{A, B}`" }
      - { vi: "`{A, B, C}`", en: "`{A, B, C}`" }
      - { vi: "`{A, B, C, D}`", en: "`{A, B, C, D}`" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý nếu chỉ áp các phụ thuộc một lượt, nhưng thuật toán bao đóng lặp tới khi không thêm được gì: có B thì `B → C` thêm C. D không nằm ở vế phải nào nên không bao giờ vào."
      en: "It sounds right if you apply the dependencies only once, but the closure algorithm repeats until nothing new is added: having B, `B → C` adds C. D is on no right side, so it never gets in."
  - q:
      vi: "`{A, D, E}` có bao đóng là mọi thuộc tính, và `{A, D}` cũng vậy. `{A, D, E}` là gì?"
      en: "`{A, D, E}` has every attribute in its closure, and so does `{A, D}`. What is `{A, D, E}`?"
    options:
      - { vi: "Một khóa ứng viên", en: "A candidate key" }
      - { vi: "Một siêu khóa nhưng không phải khóa ứng viên", en: "A superkey but not a candidate key" }
      - { vi: "Không phải khóa", en: "Not a key at all" }
    answer: 1
    trap: 0
    why:
      vi: "Nhiều người nghĩ mọi tập xác định được cả dòng đều là khóa ứng viên. Thật ra khóa ứng viên phải tối thiểu: bỏ E đi vẫn là siêu khóa, nên `{A, D, E}` chỉ là siêu khóa."
      en: "Many people think every set that determines the whole row is a candidate key. In fact a candidate key must be minimal: dropping E still leaves a superkey, so `{A, D, E}` is only a superkey."
---
## Mở bài

Cho một lược đồ và vài phụ thuộc, câu hỏi đầu tiên của người thiết kế luôn là: cột nào làm khóa được? Đoán theo cảm giác dễ sót một khóa, hoặc chọn một tập cột thừa. Bao đóng thuộc tính trả lời câu đó một cách máy móc, và SQL tính được nó.

## Ý chính

**Bao đóng** X⁺ là mọi thuộc tính mà X quyết định, theo tập phụ thuộc F. Thuật toán: bắt đầu với X; lặp, mỗi phụ thuộc `L → R` có L nằm trong tập hiện tại thì thêm R; dừng khi một vòng không thêm gì. X là **siêu khóa** khi X⁺ chứa mọi thuộc tính. **Khóa ứng viên** là siêu khóa tối thiểu: bỏ bất kỳ thuộc tính nào thì hết là siêu khóa. Thuộc tính nằm trong ít nhất một khóa ứng viên gọi là **thuộc tính khóa** (prime).

Tìm khóa ứng viên có một mẹo: thuộc tính không bao giờ nằm ở vế phải thì không gì quyết định nó, nên nó phải có trong mọi khóa. Bắt đầu từ tập đó, tính bao đóng, thêm dần thuộc tính khác nếu chưa đủ.

Hai tập phụ thuộc F và G **tương đương** khi mỗi tập suy ra được từng phụ thuộc của tập kia (F⁺ = G⁺); kiểm bằng bao đóng: với mỗi `L → R` của G, R phải nằm trong L⁺ tính theo F, và ngược lại. **Phủ tối thiểu** là một tập tương đương gọn nhất: mỗi vế phải một thuộc tính, không thuộc tính thừa ở vế trái, không phụ thuộc nào suy ra được từ các phụ thuộc còn lại.

Các tên khóa trong thực tế: **khóa chính** là khóa ứng viên được chọn; các khóa ứng viên còn lại là **khóa thay thế**, giữ bằng `UNIQUE`. **Khóa ghép** có nhiều cột. **Khóa thay thế nhân tạo** (surrogate) là mã sinh ra không mang nghĩa nghiệp vụ; khi dùng nó, khóa tự nhiên vẫn phải có `UNIQUE`. **Khóa ngoại** là cột trỏ tới khóa của bảng khác.

## Cú pháp

```text
closure(X, F):
  result := X
  repeat
    for each L → R in F: if L ⊆ result then result := result ∪ R
  until result does not change
X is a superkey      ⇔ closure(X, F) = all attributes
X is a candidate key ⇔ X is a superkey and no proper subset of X is
```

## Ví dụ

Bao đóng của `{b}`, xem từng vòng: vòng 0 là `b`, vòng 1 thêm `c`, sau đó không đổi.

```sql
WITH RECURSIVE c(n, attrs) AS (
  SELECT 0, ARRAY['b']
  UNION ALL
  SELECT n + 1, ARRAY(SELECT DISTINCT x FROM unnest(attrs || ARRAY(SELECT rhs FROM fds WHERE lhs <@ attrs)) AS x ORDER BY x)
  FROM c WHERE n < 3
)
SELECT n, array_to_string(attrs, ',') AS closure FROM c ORDER BY n;
```

Thuộc tính không nằm ở vế phải nào: `a` và `d`. Mọi khóa phải chứa chúng; bao đóng của `{a,d}` lại là cả năm thuộc tính, nên `{a,d}` là khóa ứng viên duy nhất.

```sql
SELECT attr FROM unnest(ARRAY['a', 'b', 'c', 'd', 'e']) AS attr
WHERE attr NOT IN (SELECT rhs FROM fds)
ORDER BY attr;
```

Phủ tối thiểu làm bằng tay, trên tập `{A → BC, B → C, A → B}`:

```text
1. split right sides:  A → B, A → C, B → C, A → B
2. drop duplicates:    A → B, A → C, B → C
3. A → C follows from A → B, B → C: drop it
minimal cover:         A → B, B → C
```

Hình cuối mục này tính bao đóng của `{a,d}` từng vòng một, tới khi đủ năm thuộc tính.

## Lỗi hay gặp

Áp các phụ thuộc một lượt rồi dừng.

```sql
-- WRONG: one pass finds b but not c
SELECT array_to_string(ARRAY(SELECT DISTINCT x FROM unnest(ARRAY['a'] || ARRAY(SELECT rhs FROM fds WHERE lhs <@ ARRAY['a'])) AS x ORDER BY x), ',') AS closure;
```

```sql
-- FIX: repeat until nothing new is added
WITH RECURSIVE c(n, attrs) AS (
  SELECT 0, ARRAY['a']
  UNION ALL
  SELECT n + 1, ARRAY(SELECT DISTINCT x FROM unnest(attrs || ARRAY(SELECT rhs FROM fds WHERE lhs <@ attrs)) AS x ORDER BY x)
  FROM c WHERE n < 5
)
SELECT array_to_string(attrs, ',') AS closure FROM c ORDER BY n DESC LIMIT 1;
```

Một lượt cho `a,b`; lặp tới khi đứng yên cho `a,b,c`, vì có `b` rồi thì `b → c` mới dùng được.

Dùng khóa nhân tạo và quên giữ khóa tự nhiên.

```sql
-- WRONG: the surrogate key accepts the same country twice
CREATE TABLE ex_country (id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY, iso text NOT NULL);
INSERT INTO ex_country (iso) VALUES ('VN'), ('VN');
SELECT count(*) AS vn_rows FROM ex_country WHERE iso = 'VN';
```

```sql
-- FIX: the natural key stays a key, with UNIQUE
CREATE TABLE ex_country2 (id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY, iso text NOT NULL UNIQUE);
INSERT INTO ex_country2 (iso) VALUES ('VN');
SELECT count(*) AS vn_rows FROM ex_country2 WHERE iso = 'VN';
```

Bảng thứ nhất có hai dòng `VN`; bảng thứ hai sẽ từ chối dòng `VN` thứ hai với `23505`.

## Thực hành

Lab tính bao đóng của `{a}` và `{a,d}` bằng `WITH RECURSIVE`, rồi tìm các thuộc tính phải có trong mọi khóa.

## Tóm tắt

- X⁺: lặp thêm vế phải của mọi phụ thuộc có vế trái nằm trong tập hiện tại, tới khi đứng yên.
- Siêu khóa: X⁺ là mọi thuộc tính; khóa ứng viên: siêu khóa tối thiểu.
- Thuộc tính không nằm ở vế phải nào phải có trong mọi khóa ứng viên.
- Phủ tối thiểu: vế phải một thuộc tính, vế trái không thừa, không phụ thuộc dư.
- Khóa nhân tạo làm khóa chính thì khóa tự nhiên vẫn cần `UNIQUE`.

# EN

## Opening

Given a schema and a few dependencies, a designer's first question is always: which columns can be the key? Guessing by feel easily misses a key or picks a set with extra columns. Attribute closure answers it mechanically, and SQL can compute it.

## Key idea

The **closure** X⁺ is every attribute X determines under the dependency set F. The algorithm: start with X; repeat, and for every dependency `L → R` whose L is inside the current set, add R; stop when a round adds nothing. X is a **superkey** when X⁺ holds every attribute. A **candidate key** is a minimal superkey: drop any attribute and it is no longer a superkey. An attribute that belongs to at least one candidate key is a **prime** attribute.

Finding candidate keys has a shortcut: an attribute that is never on a right side is determined by nothing, so it must be in every key. Start from that set, compute its closure, and add other attributes only if it falls short.

Two dependency sets F and G are **equivalent** when each derives every dependency of the other (F⁺ = G⁺); check it with closures: for every `L → R` of G, R must lie in L⁺ computed under F, and the other way round. A **minimal cover** is the leanest equivalent set: one attribute per right side, no extraneous attribute on a left side, no dependency that the others already derive.

The names used in practice: the **primary key** is the chosen candidate key; the other candidate keys are **alternate keys**, kept with `UNIQUE`. A **composite key** has several columns. A **surrogate key** is a generated code with no business meaning; when you use one, the natural key still needs `UNIQUE`. A **foreign key** is a column pointing at another table's key.

## Syntax

```text
closure(X, F):
  result := X
  repeat
    for each L → R in F: if L ⊆ result then result := result ∪ R
  until result does not change
X is a superkey      ⇔ closure(X, F) = all attributes
X is a candidate key ⇔ X is a superkey and no proper subset of X is
```

## Example

The closure of `{b}`, round by round: round 0 is `b`, round 1 adds `c`, then nothing changes.

```sql
WITH RECURSIVE c(n, attrs) AS (
  SELECT 0, ARRAY['b']
  UNION ALL
  SELECT n + 1, ARRAY(SELECT DISTINCT x FROM unnest(attrs || ARRAY(SELECT rhs FROM fds WHERE lhs <@ attrs)) AS x ORDER BY x)
  FROM c WHERE n < 3
)
SELECT n, array_to_string(attrs, ',') AS closure FROM c ORDER BY n;
```

The attributes on no right side: `a` and `d`. Every key must contain them; the closure of `{a,d}` is all five attributes, so `{a,d}` is the only candidate key.

```sql
SELECT attr FROM unnest(ARRAY['a', 'b', 'c', 'd', 'e']) AS attr
WHERE attr NOT IN (SELECT rhs FROM fds)
ORDER BY attr;
```

A minimal cover by hand, for the set `{A → BC, B → C, A → B}`:

```text
1. split right sides:  A → B, A → C, B → C, A → B
2. drop duplicates:    A → B, A → C, B → C
3. A → C follows from A → B, B → C: drop it
minimal cover:         A → B, B → C
```

The figure at the end of this section computes the closure of `{a,d}` round by round, until it holds all five attributes.

## Common mistakes

Applying the dependencies once and stopping.

```sql
-- WRONG: one pass finds b but not c
SELECT array_to_string(ARRAY(SELECT DISTINCT x FROM unnest(ARRAY['a'] || ARRAY(SELECT rhs FROM fds WHERE lhs <@ ARRAY['a'])) AS x ORDER BY x), ',') AS closure;
```

```sql
-- FIX: repeat until nothing new is added
WITH RECURSIVE c(n, attrs) AS (
  SELECT 0, ARRAY['a']
  UNION ALL
  SELECT n + 1, ARRAY(SELECT DISTINCT x FROM unnest(attrs || ARRAY(SELECT rhs FROM fds WHERE lhs <@ attrs)) AS x ORDER BY x)
  FROM c WHERE n < 5
)
SELECT array_to_string(attrs, ',') AS closure FROM c ORDER BY n DESC LIMIT 1;
```

One pass gives `a,b`; repeating until stable gives `a,b,c`, because `b → c` only applies once `b` is in.

Using a surrogate key and forgetting to keep the natural key.

```sql
-- WRONG: the surrogate key accepts the same country twice
CREATE TABLE ex_country (id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY, iso text NOT NULL);
INSERT INTO ex_country (iso) VALUES ('VN'), ('VN');
SELECT count(*) AS vn_rows FROM ex_country WHERE iso = 'VN';
```

```sql
-- FIX: the natural key stays a key, with UNIQUE
CREATE TABLE ex_country2 (id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY, iso text NOT NULL UNIQUE);
INSERT INTO ex_country2 (iso) VALUES ('VN');
SELECT count(*) AS vn_rows FROM ex_country2 WHERE iso = 'VN';
```

The first table has two `VN` rows; the second would refuse a second `VN` row with `23505`.

## Practice

The lab computes the closures of `{a}` and `{a,d}` with `WITH RECURSIVE`, then finds the attributes every key must contain.

## Recap

- X⁺: keep adding the right side of every dependency whose left side is inside the current set, until stable.
- Superkey: X⁺ is every attribute; candidate key: a minimal superkey.
- An attribute on no right side belongs to every candidate key.
- Minimal cover: one attribute per right side, no extraneous left-side attribute, no redundant dependency.
- With a surrogate primary key, the natural key still needs `UNIQUE`.
