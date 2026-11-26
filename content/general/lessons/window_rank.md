---
id: window_rank
title: "Xếp hạng trong nhóm: ROW_NUMBER, RANK, DENSE_RANK"
title_en: "Ranking within groups: ROW_NUMBER, RANK, DENSE_RANK"
minutes: 25
figures: [{ name: sql-window-vs-group, at: idea }, { name: sql-rank-ties, at: examples }]
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Đánh số và xếp hạng dòng trong từng nhóm bằng `OVER (PARTITION BY … ORDER BY …)`.
    en: Number and rank rows inside each group with `OVER (PARTITION BY … ORDER BY …)`.
  - vi: Chọn đúng giữa `ROW_NUMBER`, `RANK` và `DENSE_RANK` khi có đồng hạng.
    en: Pick the right one of `ROW_NUMBER`, `RANK` and `DENSE_RANK` when there are ties.
  - vi: Lấy top N mỗi nhóm bằng cách xếp hạng trong một CTE rồi lọc ở câu ngoài.
    en: Get the top N per group by ranking in a CTE and filtering in the outer query.
syntax: |-
  SELECT column,
         ROW_NUMBER() OVER (PARTITION BY group_col ORDER BY sort_col [DESC]) AS rn,
         RANK()       OVER (...) AS rk,
         DENSE_RANK() OVER (...) AS drk
  FROM table_name
options:
  - { code: "OVER (…)", vi: "biến hàm thành hàm cửa sổ: mọi dòng ở lại, thêm một cột", en: "makes it a window function: every row stays, one column is added" }
  - { code: "PARTITION BY col", vi: "xếp hạng lại từ 1 trong mỗi nhóm; bỏ trống là cả bảng một nhóm", en: "restart the ranking at 1 in each group; left out, the whole table is one group" }
  - { code: "ORDER BY col", vi: "thứ tự xếp hạng; không có nó thì hạng vô nghĩa", en: "the ranking order; without it the ranks mean nothing" }
  - { code: "ROW_NUMBER()", vi: "1, 2, 3, 4: luôn khác nhau, đồng hạng thì chia tùy ý", en: "1, 2, 3, 4: always distinct, ties broken arbitrarily" }
  - { code: "RANK()", vi: "1, 2, 2, 4: đồng hạng cùng số, bỏ qua số sau", en: "1, 2, 2, 4: ties share a number, the next one is skipped" }
  - { code: "DENSE_RANK()", vi: "1, 2, 2, 3: đồng hạng cùng số, không bỏ số", en: "1, 2, 2, 3: ties share a number, nothing is skipped" }
  - { code: "NTILE(n)", vi: "chia dòng thành n nhóm gần bằng nhau theo thứ tự", en: "splits the rows into n nearly equal bands, in order" }
examples:
  - title: { vi: "Đánh số trong từng nhóm", en: "Numbering inside each group" }
    sql: |-
      SELECT name, category, price_vnd,
             ROW_NUMBER() OVER (PARTITION BY category ORDER BY price_vnd DESC) AS rn
      FROM products
      WHERE category IN ('Drinks', 'Snacks')
      ORDER BY category, rn
    read:
      vi: "12 dòng, mỗi nhóm đánh số lại từ 1: nước cam là đồ uống đắt nhất, hạt điều là món ăn vặt đắt nhất. Không dòng nào bị gộp, chỉ thêm cột `rn`."
      en: "12 rows, numbered from 1 again in each group: the orange juice is the priciest drink, the cashew nuts the priciest snack. No row is collapsed; only the `rn` column is added."
  - title: { vi: "Ba cách xử lý đồng hạng", en: "Three ways to handle ties" }
    sql: |-
      SELECT id, name, birth_year,
             ROW_NUMBER() OVER (ORDER BY birth_year DESC) AS rn,
             RANK() OVER (ORDER BY birth_year DESC) AS rk,
             DENSE_RANK() OVER (ORDER BY birth_year DESC) AS drk
      FROM customers
      WHERE city = 'Hue' AND birth_year >= 1998
      ORDER BY birth_year DESC, id
    read:
      vi: "Hai khách sinh năm 1998: `ROW_NUMBER` cho họ số 3 và 4 (ai trước là tùy), `RANK` và `DENSE_RANK` đều cho cả hai hạng 3. Khác nhau ở người kế tiếp: `RANK` sẽ nhảy sang 5, `DENSE_RANK` sang 4. Hình cuối mục này vẽ bảng đó cùng một dòng minh họa người kế tiếp."
      en: "Two customers born in 1998: `ROW_NUMBER` gives them 3 and 4 (which one first is arbitrary), `RANK` and `DENSE_RANK` both give them rank 3. The difference is the next person: `RANK` would jump to 5, `DENSE_RANK` to 4. The figure at the end of this section draws that table with an illustrative next person."
  - title: { vi: "Top 2 mỗi nhóm", en: "The top 2 per group" }
    sql: |-
      WITH r AS (
        SELECT name, category, price_vnd,
               ROW_NUMBER() OVER (PARTITION BY category ORDER BY price_vnd DESC, name) AS rn
        FROM products
      )
      SELECT category, name, price_vnd
      FROM r
      WHERE rn <= 2
      ORDER BY category, rn
    read:
      vi: "10 dòng, hai món đắt nhất của mỗi nhóm trong 5 nhóm. Hạng được tính trong CTE, rồi câu ngoài lọc `rn <= 2`: đây là mẫu top N mỗi nhóm. `name` sau `price_vnd DESC` làm thứ tự chắc chắn khi hai món cùng giá."
      en: "10 rows, the two priciest items of each of the 5 categories. The rank is computed in the CTE, then the outer query filters `rn <= 2`: this is the top-N-per-group pattern. `name` after `price_vnd DESC` makes the order certain when two items share a price."
  - title: { vi: "Chia thành dải", en: "Splitting into bands" }
    sql: |-
      SELECT name, price_vnd,
             NTILE(3) OVER (ORDER BY price_vnd) AS band
      FROM products
      WHERE category = 'Personal care'
      ORDER BY price_vnd
    read:
      vi: "6 món chăm sóc cá nhân chia thành 3 dải giá, mỗi dải 2 món: rẻ (1), vừa (2), đắt (3). `NTILE` hữu ích để chia khách hay sản phẩm thành nhóm phần trăm."
      en: "6 personal care items split into 3 price bands of 2 items each: cheap (1), middle (2), expensive (3). `NTILE` is handy for splitting customers or products into percentile groups."
pitfalls:
  - title: { vi: "Lọc hạng ngay trong WHERE", en: "Filtering the rank right in WHERE" }
    wrong: "SELECT name, category, price_vnd FROM products WHERE ROW_NUMBER() OVER (PARTITION BY category ORDER BY price_vnd DESC) <= 2"
    fix: "WITH r AS (SELECT name, category, price_vnd, ROW_NUMBER() OVER (PARTITION BY category ORDER BY price_vnd DESC) AS rn FROM products) SELECT name, category, price_vnd FROM r WHERE rn <= 2"
    why:
      vi: "Hàm cửa sổ chạy sau `WHERE`, nên `WHERE` chưa thấy hạng: Postgres báo 42P20. Tính hạng trong một CTE (hoặc truy vấn con) rồi lọc ở câu ngoài."
      en: "Window functions run after `WHERE`, so `WHERE` cannot see the rank yet: Postgres raises 42P20. Compute the rank in a CTE (or a subquery) and filter in the outer query."
  - title: { vi: "ROW_NUMBER khi đề bài nói đồng hạng", en: "ROW_NUMBER when the question allows ties" }
    wrong: "WITH r AS (SELECT id, name, birth_year, ROW_NUMBER() OVER (ORDER BY birth_year DESC) AS rn FROM customers WHERE city = 'Hue') SELECT id, name, birth_year FROM r WHERE rn <= 3"
    fix: "WITH r AS (SELECT id, name, birth_year, RANK() OVER (ORDER BY birth_year DESC) AS rk FROM customers WHERE city = 'Hue' AND birth_year IS NOT NULL) SELECT id, name, birth_year FROM r WHERE rk <= 3"
    why:
      vi: "\"Ba khách trẻ nhất ở Huế, đồng hạng thì lấy cả\": `ROW_NUMBER` cắt đúng 3 dòng và bỏ một trong hai người sinh năm 1998, chọn ai là tùy. `RANK` giữ cả hai (4 dòng). Thêm `IS NOT NULL`, vì khi sắp giảm dần NULL đứng đầu."
      en: "\"The three youngest customers in Hue, keep everyone tied\": `ROW_NUMBER` cuts exactly 3 rows and drops one of the two born in 1998, arbitrarily. `RANK` keeps both (4 rows). Add `IS NOT NULL`, because NULLs come first in a descending sort."
quiz:
  - q:
      vi: "Một hàm cửa sổ có làm giảm số dòng của kết quả không?"
      en: "Does a window function reduce the number of result rows?"
    options:
      - { vi: "Có, như `GROUP BY`: mỗi nhóm còn một dòng", en: "Yes, like `GROUP BY`: one row per group remains" }
      - { vi: "Không: mọi dòng ở lại, hàm chỉ thêm một cột tính trên nhóm của dòng đó", en: "No: every row stays; the function only adds a column computed over that row's group" }
      - { vi: "Chỉ khi có `PARTITION BY`", en: "Only when there is a `PARTITION BY`" }
    answer: 1
    trap: 0
    why:
      vi: "`PARTITION BY` nghe giống `GROUP BY`, nhưng nó chỉ định \"cửa sổ\" mà hàm nhìn vào; dòng không bị gộp. Đó là lý do muốn top N vẫn phải lọc ở câu ngoài."
      en: "`PARTITION BY` sounds like `GROUP BY`, but it only defines the \"window\" the function looks at; rows are not collapsed. That is why a top N still needs a filter in the outer query."
  - q:
      vi: "Điểm số 90, 85, 85, 80. `DENSE_RANK` cho điểm 80 hạng mấy?"
      en: "Scores 90, 85, 85, 80. Which rank does `DENSE_RANK` give the 80?"
    options:
      - { vi: "4", en: "4" }
      - { vi: "3", en: "3" }
      - { vi: "2", en: "2" }
    answer: 1
    trap: 0
    why:
      vi: "Hạng 4 là của `RANK` (bỏ số 3 vì hai người cùng hạng 2). `DENSE_RANK` không bỏ số: 1, 2, 2, 3."
      en: "Rank 4 is what `RANK` gives (it skips 3 because two people share rank 2). `DENSE_RANK` skips nothing: 1, 2, 2, 3."
recap:
  - vi: "`OVER (PARTITION BY … ORDER BY …)`: giữ mọi dòng, xếp hạng lại trong từng nhóm."
    en: "`OVER (PARTITION BY … ORDER BY …)`: keeps every row and ranks again inside each group."
  - vi: "`ROW_NUMBER` không đồng hạng; `RANK` đồng hạng rồi bỏ số; `DENSE_RANK` đồng hạng, không bỏ số."
    en: "`ROW_NUMBER` has no ties; `RANK` ties then skips; `DENSE_RANK` ties without skipping."
  - vi: "Top N mỗi nhóm: xếp hạng trong CTE, lọc ở câu ngoài; hàm cửa sổ không dùng được trong `WHERE`."
    en: "Top N per group: rank in a CTE, filter outside; window functions cannot be used in `WHERE`."
sources:
  - https://www.postgresql.org/docs/current/tutorial-window.html
  - https://www.postgresql.org/docs/current/functions-window.html
  - https://www.postgresql.org/docs/current/sql-expressions.html#SYNTAX-WINDOW-FUNCTIONS
---
## Mở bài

Phòng mua hàng muốn biết hai món đắt nhất của từng nhóm, còn phòng marketing muốn ba khách trẻ nhất ở Huế. Cả hai là câu hỏi "xếp hạng trong nhóm", và `GROUP BY` không trả lời được vì nó gộp mất từng dòng.

## Ý chính

Hàm cửa sổ tính trên một nhóm dòng mà **không gộp** chúng: mỗi dòng ở lại và nhận thêm một cột. `PARTITION BY` chia nhóm, `ORDER BY` trong `OVER` cho thứ tự. `ROW_NUMBER` đánh số 1, 2, 3; `RANK` và `DENSE_RANK` cho các dòng bằng nhau cùng hạng.

Nhiều người nghĩ **có thể lọc hạng ngay trong `WHERE`**. Thật ra hàm cửa sổ chạy sau `WHERE` (và sau `GROUP BY`, `HAVING`), nên `WHERE` chưa thấy nó. Muốn top N mỗi nhóm: tính hạng trong một CTE, rồi lọc ở câu ngoài.

Hình cuối mục này nhắc lại điểm khác giữa gộp nhóm và hàm cửa sổ: hàm cửa sổ thêm một cột mà không bỏ dòng nào, và hàm xếp hạng cũng vậy.

## Cú pháp

Có thể đặt nhiều hàm cửa sổ trong cùng một `SELECT`, mỗi hàm một `OVER` riêng.

# EN

## Opening

Purchasing wants the two priciest items of each category, and marketing wants the three youngest customers in Hue. Both are "rank within a group" questions, and `GROUP BY` cannot answer them because it collapses the rows.

## Key idea

A window function computes over a group of rows **without collapsing** them: every row stays and gets one more column. `PARTITION BY` sets the groups, `ORDER BY` inside `OVER` sets the order. `ROW_NUMBER` numbers 1, 2, 3; `RANK` and `DENSE_RANK` give equal rows the same rank.

Many people think **the rank can be filtered right in `WHERE`**. In fact window functions run after `WHERE` (and after `GROUP BY`, `HAVING`), so `WHERE` cannot see them yet. For the top N per group: compute the rank in a CTE, then filter in the outer query.

The figure at the end of this section recalls the difference between grouping and a window function: a window function adds a column without removing any row, and so does a ranking function.

## Syntax

One `SELECT` can hold several window functions, each with its own `OVER`.
