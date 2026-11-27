---
id: e-ds-l3-01
engine: design
level: L3
module: fd
title: Phụ thuộc hàm và luật Armstrong
title_en: Functional dependencies and Armstrong's rules
kind: concept
runtime: browser
minutes: 15
figures: [{ name: ds-fd-check, at: example }]
objectives:
  - vi: Đọc và viết một phụ thuộc hàm X → Y, phân biệt tầm thường, đầy đủ, bộ phận và bắc cầu.
    en: Read and write a functional dependency X → Y and tell trivial, full, partial and transitive ones apart.
  - vi: Suy ra phụ thuộc mới bằng ba luật Armstrong và các luật hệ quả.
    en: Derive new dependencies with Armstrong's three rules and the rules that follow from them.
  - vi: Dùng SQL để bác bỏ một phụ thuộc trên dữ liệu, và hiểu vì sao dữ liệu không chứng minh được nó.
    en: Use SQL to refute a dependency on data, and see why data can never prove one.
requires: [e-ds-l2-03]
sources:
  - { url: https://doi.org/10.1145/362384.362685, title_vi: "Bài báo ACM 10.1145/362384.362685" }
  - { url: https://www.bkent.net/Doc/simple5.htm, title_vi: "William Kent: hướng dẫn đơn giản về năm dạng chuẩn" }
  - { url: https://www.postgresql.org/docs/18/queries-table-expressions.html, title_vi: "Biểu thức bảng" }
lab:
  setup: |
    CREATE TABLE deliveries (
      id int PRIMARY KEY,
      postcode text NOT NULL,
      city text NOT NULL,
      carrier text NOT NULL,
      carrier_phone text NOT NULL,
      weight_kg numeric(6,2) NOT NULL
    );
    INSERT INTO deliveries VALUES
      (1, '550000', 'Da Nang', 'FastGo', '0901', 2.50),
      (2, '550000', 'Da Nang', 'FastGo', '0901', 1.00),
      (3, '700000', 'HCM', 'SlowShip', '0902', 3.00),
      (4, '700000', 'Ho Chi Minh', 'FastGo', '0901', 4.00),
      (5, '100000', 'Ha Noi', 'SlowShip', '0903', 0.50),
      (6, '100000', 'Ha Noi', 'QuickBox', '0904', 2.00);
  steps:
    - task:
        vi: "Phụ thuộc `postcode → city` có đứng vững trên dữ liệu này không? Trả mỗi mã bưu chính vi phạm cùng số thành phố khác nhau của nó (`postcode`, `cities`)."
        en: "Does `postcode → city` hold on this data? Return each postcode that breaks it with its number of different cities (`postcode`, `cities`)."
      solution: SELECT postcode, count(DISTINCT city) AS cities FROM deliveries GROUP BY postcode HAVING count(DISTINCT city) > 1
      check: rows
      hint:
        vi: "Gom theo vế trái, đếm giá trị khác nhau của vế phải: `GROUP BY postcode HAVING count(DISTINCT city) > 1`."
        en: "Group by the left side, count the distinct values of the right side: `GROUP BY postcode HAVING count(DISTINCT city) > 1`."
    - task:
        vi: "Kiểm `carrier → carrier_phone`: trả tên các hãng vận chuyển có hơn một số điện thoại (`carrier`)."
        en: "Test `carrier → carrier_phone`: return the carriers that have more than one phone number (`carrier`)."
      solution: SELECT carrier FROM deliveries GROUP BY carrier HAVING count(DISTINCT carrier_phone) > 1
      check: rows
      hint:
        vi: "Cùng khuôn: `GROUP BY carrier HAVING count(DISTINCT carrier_phone) > 1`."
        en: "Same pattern: `GROUP BY carrier HAVING count(DISTINCT carrier_phone) > 1`."
quiz:
  - q:
      vi: "Bảng hiện có 10 000 dòng và không dòng nào vi phạm `email → customer_id`. Kết luận nào đúng?"
      en: "The table has 10,000 rows and none breaks `email → customer_id`. Which conclusion is right?"
    options:
      - { vi: "Phụ thuộc đã được chứng minh, khai báo luôn là luật", en: "The dependency is proven; declare it as a rule" }
      - { vi: "Dữ liệu chỉ cho biết chưa có phản ví dụ; luật phải đến từ nghĩa nghiệp vụ", en: "The data only shows there is no counter-example yet; the rule must come from the business meaning" }
      - { vi: "Phụ thuộc sai, vì 10 000 dòng là quá ít", en: "The dependency is false, because 10,000 rows are too few" }
    answer: 1
    trap: 0
    why:
      vi: "\"Đã chứng minh\" nghe hợp lý vì 10 000 dòng có vẻ là bằng chứng mạnh, nhưng một phụ thuộc hàm (functional dependency) là luật cho mọi dữ liệu có thể có, kể cả dòng ghi ngày mai: chỉ cần một người đăng ký hai tài khoản cùng email là nó gãy. Dữ liệu chỉ bác bỏ được, một phản ví dụ (counter-example) là đủ. Ngược lại, \"phụ thuộc sai\" cũng vô căn cứ: không có phản ví dụ nào thì không bác được. Luật chỉ đến từ nghĩa nghiệp vụ: hệ thống có cho một email nhiều tài khoản không."
      en: "\"Proven\" sounds right because 10,000 rows look like strong evidence, but a functional dependency is a rule for every possible state, tomorrow's rows included: one person signing up twice with the same email breaks it. Data can only refute one, and a single counter-example is enough. \"False\" has no ground either: with no counter-example, nothing refutes it. The rule only comes from the business meaning: does the system allow several accounts per email or not."
  - q:
      vi: "Biết `A → B` và `B → C`. Luật nào cho ra `A → C`?"
      en: "Given `A → B` and `B → C`. Which rule gives `A → C`?"
    options:
      - { vi: "Phản xạ", en: "Reflexivity" }
      - { vi: "Tăng trưởng", en: "Augmentation" }
      - { vi: "Bắc cầu", en: "Transitivity" }
    answer: 2
    trap: 1
    why:
      vi: "Nhiều người nghĩ cứ \"thêm vào\" là tăng trưởng (augmentation), nhưng tăng trưởng là thêm cùng một thuộc tính vào hai vế của một phụ thuộc (`AZ → BZ`), không nối hai phụ thuộc. Phản xạ (reflexivity) chỉ cho phụ thuộc tầm thường, khi vế phải nằm trong vế trái. Ở đây hai phụ thuộc nối nhau qua thuộc tính chung `B`: A quyết định B, B quyết định C, nên A quyết định C. Đó là bắc cầu (transitivity)."
      en: "Many people think any \"adding\" is augmentation, but augmentation adds the same attribute to both sides of one dependency (`AZ → BZ`); it does not chain two. Reflexivity only gives trivial dependencies, where the right side is inside the left. Here two dependencies chain through the shared attribute `B`: A determines B, B determines C, so A determines C. That is transitivity."
---
## Mở bài

Một bảng giao hàng ghi mã bưu chính và tên thành phố trên mỗi dòng. Nếu mã bưu chính quyết định thành phố, ghi lặp lại là thừa và có thể lệch nhau. Phụ thuộc hàm là cách nói chính xác chữ "quyết định" đó.

## Ý chính

Phụ thuộc hàm `X → Y` (X quyết định Y) nghĩa là: hai dòng bất kỳ giống nhau ở X thì phải giống nhau ở Y. X là vế trái (định thuộc), Y là vế phải. Khóa của bảng quyết định mọi cột, nên mọi khóa đều là vế trái của một phụ thuộc.

Vài loại cần gọi đúng tên. **Tầm thường**: Y nằm trong X, như `(postcode, city) → city`, luôn đúng. **Đầy đủ**: Y phụ thuộc cả X, bỏ bớt thuộc tính nào của X là không còn đúng. **Bộ phận**: Y chỉ cần một phần của khóa ghép, như `course_id → course_title` khi khóa là `(student_id, course_id)`. **Bắc cầu**: `id → postcode` và `postcode → city` cho `id → city` đi vòng qua một cột không phải khóa.

Ba luật Armstrong suy ra mọi phụ thuộc kéo theo từ một tập cho trước: **phản xạ** (Y ⊆ X thì X → Y), **tăng trưởng** (X → Y thì XZ → YZ), **bắc cầu** (X → Y, Y → Z thì X → Z). Ba luật này đúng (không suy ra điều sai) và đủ (suy ra được mọi điều đúng). Từ chúng có thêm luật **hợp** (X → Y, X → Z thì X → YZ), **tách** (X → YZ thì X → Y) và **bắc cầu giả** (X → Y, WY → Z thì WX → Z).

Nhiều người nghĩ cứ chạy truy vấn thấy không vi phạm là phụ thuộc đúng. Thật ra phụ thuộc hàm là phát biểu về nghĩa của dữ liệu, cho mọi trạng thái có thể có. Dữ liệu chỉ bác bỏ được: một cặp dòng trái nhau là đủ.

## Cú pháp

```text
X → Y     reflexivity:   Y ⊆ X            ⇒  X → Y
          augmentation:  X → Y            ⇒  XZ → YZ
          transitivity:  X → Y, Y → Z     ⇒  X → Z
          union:         X → Y, X → Z     ⇒  X → YZ
          decomposition: X → YZ           ⇒  X → Y
          pseudotransitivity: X → Y, WY → Z ⇒ WX → Z
```

Khuôn SQL để tìm phản ví dụ của `X → Y`:

```sql
SELECT x_cols FROM t GROUP BY x_cols HAVING count(DISTINCT y_col) > 1;
```

## Ví dụ

`carrier → carrier_phone`: đếm số điện thoại khác nhau của mỗi hãng.

```sql
SELECT carrier, count(DISTINCT carrier_phone) AS phones
FROM deliveries
GROUP BY carrier
ORDER BY carrier;
```

`SlowShip` có hai số, nên phụ thuộc bị bác bỏ trên dữ liệu này; hai hãng còn lại chưa có phản ví dụ.

Phụ thuộc tầm thường luôn đúng: gom theo `(postcode, city)` thì mỗi nhóm chỉ có một `city`.

```sql
SELECT postcode, city, count(DISTINCT city) AS cities
FROM deliveries
GROUP BY postcode, city
ORDER BY postcode, city;
```

Khóa chính quyết định mọi cột: số dòng bằng số `id` khác nhau.

```sql
SELECT count(*) AS row_count, count(DISTINCT id) AS ids FROM deliveries;
```

Hình cuối mục này xếp các dòng `deliveries` theo `carrier`: SlowShip có hai số điện thoại, đủ để bác `carrier → carrier_phone`.

## Lỗi hay gặp

Kiểm trên một phần dữ liệu rồi kết luận cho cả bảng.

```sql
-- WRONG: a filtered sample hides the counter-example
SELECT carrier FROM deliveries WHERE weight_kg > 1
GROUP BY carrier HAVING count(DISTINCT carrier_phone) > 1;
```

```sql
-- FIX: test on every row
SELECT carrier FROM deliveries
GROUP BY carrier HAVING count(DISTINCT carrier_phone) > 1;
```

Câu sai ra rỗng vì dòng `0903` của `SlowShip` bị lọc mất. Ngay cả kiểm trên cả bảng cũng chỉ nói "chưa thấy phản ví dụ".

Đếm số dòng thay vì số giá trị khác nhau.

```sql
-- WRONG: count(city) counts rows, so every repeated postcode looks guilty
SELECT postcode FROM deliveries GROUP BY postcode HAVING count(city) > 1 ORDER BY postcode;
```

```sql
-- FIX: count the distinct values of the right side
SELECT postcode FROM deliveries GROUP BY postcode HAVING count(DISTINCT city) > 1 ORDER BY postcode;
```

Câu sai báo cả ba mã; chỉ `700000` thật sự có hai tên thành phố.

## Thực hành

Lab bác bỏ hai phụ thuộc trên bảng `deliveries` bằng `GROUP BY` và `HAVING`.

## Tóm tắt

- `X → Y`: hai dòng giống nhau ở X thì giống nhau ở Y; khóa quyết định mọi cột.
- Tầm thường, đầy đủ, bộ phận (một phần khóa ghép), bắc cầu (qua cột không phải khóa).
- Armstrong: phản xạ, tăng trưởng, bắc cầu; hệ quả: hợp, tách, bắc cầu giả.
- Phụ thuộc đến từ nghĩa nghiệp vụ; dữ liệu chỉ bác bỏ được bằng `HAVING count(DISTINCT …) > 1`.

# EN

## Opening

A delivery table stores the postcode and the city name on every row. If the postcode decides the city, repeating it is redundant and the copies can drift apart. A functional dependency is the precise way to say "decides".

## Key idea

A functional dependency `X → Y` (X determines Y) means: any two rows that agree on X must agree on Y. X is the left side (the determinant), Y the right side. A table's key determines every column, so every key is the left side of a dependency.

Some kinds need their proper names. **Trivial**: Y is inside X, like `(postcode, city) → city`, always true. **Full**: Y needs all of X; drop any attribute of X and it no longer holds. **Partial**: Y needs only part of a composite key, like `course_id → course_title` when the key is `(student_id, course_id)`. **Transitive**: `id → postcode` and `postcode → city` give `id → city` by going through a non-key column.

Armstrong's three rules derive every dependency implied by a given set: **reflexivity** (Y ⊆ X gives X → Y), **augmentation** (X → Y gives XZ → YZ), **transitivity** (X → Y and Y → Z give X → Z). They are sound (derive nothing false) and complete (derive everything true). From them follow **union** (X → Y and X → Z give X → YZ), **decomposition** (X → YZ gives X → Y) and **pseudotransitivity** (X → Y and WY → Z give WX → Z).

Many people think a query that finds no violation proves a dependency. In fact a functional dependency is a statement about what the data means, for every possible state. Data can only refute it: one pair of conflicting rows is enough.

## Syntax

```text
X → Y     reflexivity:   Y ⊆ X            ⇒  X → Y
          augmentation:  X → Y            ⇒  XZ → YZ
          transitivity:  X → Y, Y → Z     ⇒  X → Z
          union:         X → Y, X → Z     ⇒  X → YZ
          decomposition: X → YZ           ⇒  X → Y
          pseudotransitivity: X → Y, WY → Z ⇒ WX → Z
```

The SQL pattern that finds counter-examples to `X → Y`:

```sql
SELECT x_cols FROM t GROUP BY x_cols HAVING count(DISTINCT y_col) > 1;
```

## Example

`carrier → carrier_phone`: count the different phone numbers of each carrier.

```sql
SELECT carrier, count(DISTINCT carrier_phone) AS phones
FROM deliveries
GROUP BY carrier
ORDER BY carrier;
```

`SlowShip` has two numbers, so the dependency is refuted on this data; the other two carriers have no counter-example yet.

A trivial dependency always holds: group by `(postcode, city)` and each group has one `city`.

```sql
SELECT postcode, city, count(DISTINCT city) AS cities
FROM deliveries
GROUP BY postcode, city
ORDER BY postcode, city;
```

The primary key determines every column: the row count equals the number of distinct `id` values.

```sql
SELECT count(*) AS row_count, count(DISTINCT id) AS ids FROM deliveries;
```

The figure at the end of this section orders the `deliveries` rows by `carrier`: SlowShip has two phone numbers, enough to refute `carrier → carrier_phone`.

## Common mistakes

Testing part of the data and concluding for the whole table.

```sql
-- WRONG: a filtered sample hides the counter-example
SELECT carrier FROM deliveries WHERE weight_kg > 1
GROUP BY carrier HAVING count(DISTINCT carrier_phone) > 1;
```

```sql
-- FIX: test on every row
SELECT carrier FROM deliveries
GROUP BY carrier HAVING count(DISTINCT carrier_phone) > 1;
```

The wrong query returns nothing because the `0903` row of `SlowShip` is filtered out. Even a test on the whole table only says "no counter-example yet".

Counting rows instead of distinct values.

```sql
-- WRONG: count(city) counts rows, so every repeated postcode looks guilty
SELECT postcode FROM deliveries GROUP BY postcode HAVING count(city) > 1 ORDER BY postcode;
```

```sql
-- FIX: count the distinct values of the right side
SELECT postcode FROM deliveries GROUP BY postcode HAVING count(DISTINCT city) > 1 ORDER BY postcode;
```

The wrong query flags all three postcodes; only `700000` really has two city names.

## Practice

The lab refutes two dependencies on table `deliveries` with `GROUP BY` and `HAVING`.

## Recap

- `X → Y`: rows equal on X are equal on Y; a key determines every column.
- Trivial, full, partial (part of a composite key), transitive (through a non-key column).
- Armstrong: reflexivity, augmentation, transitivity; derived: union, decomposition, pseudotransitivity.
- Dependencies come from business meaning; data can only refute them, with `HAVING count(DISTINCT …) > 1`.
