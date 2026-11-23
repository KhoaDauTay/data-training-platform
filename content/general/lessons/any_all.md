---
id: any_all
title: "ANY và ALL: so một giá trị với cả danh sách"
title_en: "ANY and ALL: compare one value with a whole list"
minutes: 25
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: "Viết \"lớn hơn ít nhất một\" bằng `> ANY` và \"lớn hơn tất cả\" bằng `> ALL`."
    en: "Write \"greater than at least one\" with `> ANY` and \"greater than all\" with `> ALL`."
  - vi: Dùng `= ANY` với truy vấn con hoặc với một mảng giá trị.
    en: Use `= ANY` with a subquery or with an array of values.
  - vi: Biết hai bẫy của `ALL`, danh sách rỗng và danh sách có NULL.
    en: Know the two traps of `ALL`, an empty list and a list holding NULL.
syntax: |-
  SELECT column
  FROM table_name
  WHERE value operator { ANY | ALL } (SELECT other_column FROM other_table [WHERE ...])
  -- or with an array: WHERE value = ANY (ARRAY['a', 'b'])
options:
  - { code: "> ANY (…)", vi: "lớn hơn ít nhất một giá trị (tức là lớn hơn giá trị nhỏ nhất)", en: "greater than at least one value (that is, greater than the smallest)" }
  - { code: "> ALL (…)", vi: "lớn hơn mọi giá trị (tức là lớn hơn giá trị lớn nhất)", en: "greater than every value (that is, greater than the largest)" }
  - { code: "= ANY (…)", vi: "bằng một trong các giá trị: giống `IN`", en: "equal to one of the values: the same as `IN`" }
  - { code: "SOME", vi: "tên khác của `ANY`", en: "another name for `ANY`" }
  - { code: "ANY (ARRAY[…])", vi: "danh sách viết thành mảng thay vì truy vấn con", en: "the list written as an array instead of a subquery" }
  - { code: "> ALL (SELECT … 'Toys')", vi: "luôn đúng; `ANY` (rỗng) luôn sai", en: "always true; `ANY` over an empty list is always false" }
examples:
  - title: { vi: "Rẻ hơn ít nhất một đồ uống", en: "Cheaper than at least one drink" }
    sql: |-
      SELECT name, price_vnd
      FROM products
      WHERE category = 'Snacks'
        AND price_vnd < ANY (SELECT price_vnd FROM products WHERE category = 'Drinks')
    read:
      vi: "4 món ăn vặt rẻ hơn đồ uống đắt nhất (nước cam, 35.000 đồng). `< ANY` chỉ cần một giá trị trong danh sách thỏa, nên thực chất là so với giá trị lớn nhất."
      en: "4 snacks cheaper than the priciest drink (orange juice, 35,000 VND). `< ANY` needs just one value of the list to pass, so it really compares with the largest one."
  - title: { vi: "Trẻ bằng hoặc hơn mọi khách ở Huế", en: "At least as young as every Hue customer" }
    sql: |-
      SELECT id, name
      FROM customers
      WHERE birth_year >= ALL (SELECT birth_year FROM customers WHERE city = 'Hue')
    read:
      vi: "8 khách sinh năm 2004, bằng người trẻ nhất ở Huế. `>= ALL` phải thỏa với mọi giá trị; ở Huế không ai thiếu năm sinh nên danh sách không có NULL."
      en: "8 customers born in 2004, the same as the youngest in Hue. `>= ALL` must hold for every value; nobody in Hue lacks a birth year, so the list has no NULL."
  - title: { vi: "So với một mảng viết tay", en: "Comparing with a hand-written array" }
    sql: |-
      SELECT name, category
      FROM products
      WHERE category = ANY (ARRAY['Snacks', 'Drinks'])
        AND price_vnd >= 25000
    read:
      vi: "5 món. `= ANY (ARRAY[…])` cho cùng kết quả với `IN ('Snacks', 'Drinks')`; dạng mảng tiện khi danh sách được truyền từ ứng dụng như một tham số."
      en: "5 items. `= ANY (ARRAY[…])` gives the same result as `IN ('Snacks', 'Drinks')`; the array form is handy when an application passes the list as one parameter."
  - title: { vi: "= ANY với truy vấn con", en: "= ANY with a subquery" }
    sql: |-
      SELECT name, price_vnd
      FROM products
      WHERE price_vnd = ANY (SELECT unit_price_vnd FROM order_items WHERE order_id = 1416)
    read:
      vi: "Nước rửa chén, 32.000 đồng: giá niêm yết của nó bằng một trong các đơn giá của đơn 1416. Giá niêm yết của hai món còn lại không có trong danh sách đơn giá đó."
      en: "The dish soap, 32,000 VND: its list price equals one of the unit prices in order 1416. The list prices of the order's other two items are not in that list of unit prices."
pitfalls:
  - title: { vi: "Nhầm ANY với ALL", en: "Mixing up ANY and ALL" }
    wrong: "SELECT name FROM products WHERE price_vnd > ANY (SELECT price_vnd FROM products WHERE category = 'Household')"
    fix: "SELECT name FROM products WHERE price_vnd > ALL (SELECT price_vnd FROM products WHERE category = 'Household')"
    why:
      vi: "Câu hỏi là \"đắt hơn mọi món đồ gia dụng\". `> ANY` chỉ cần đắt hơn món gia dụng rẻ nhất (túi rác, 27.000), nên ra 17 món thay vì 3. Đọc to: ANY = \"ít nhất một\", ALL = \"tất cả\"."
      en: "The question is \"pricier than every household item\". `> ANY` only needs to beat the cheapest household item (trash bags, 27,000), so it returns 17 items instead of 3. Say it aloud: ANY = \"at least one\", ALL = \"all of them\"."
  - title: { vi: "ALL trên danh sách có NULL", en: "ALL over a list holding NULL" }
    wrong: "SELECT id, name, birth_year FROM customers WHERE city = 'Hue' AND birth_year <= ALL (SELECT birth_year FROM customers WHERE city = 'Hanoi')"
    fix: "SELECT id, name, birth_year FROM customers WHERE city = 'Hue' AND birth_year <= ALL (SELECT birth_year FROM customers WHERE city = 'Hanoi' AND birth_year IS NOT NULL)"
    why:
      vi: "4 khách Hà Nội không có năm sinh. So với NULL ra \"không biết\", nên `ALL` không bao giờ đúng hẳn: 0 dòng, không lỗi. Lọc NULL trong truy vấn con: ra 3 khách Huế sinh năm 1965."
      en: "4 Hanoi customers have no birth year. Comparing with NULL is \"unknown\", so `ALL` is never fully true: 0 rows, no error. Filter NULLs in the subquery: 3 Hue customers born in 1965."
quiz:
  - q:
      vi: "Truy vấn con trả 0 dòng (không có món nào nhóm `Toys`). `price_vnd > ALL (SELECT … 'Toys')` giữ bao nhiêu sản phẩm?"
      en: "The subquery returns 0 rows (there is no `Toys` category). How many products does `price_vnd > ALL (SELECT … 'Toys')` keep?"
    options:
      - { vi: "Không món nào, vì không có gì để so", en: "None, because there is nothing to compare with" }
      - { vi: "Cả 30 món: \"lớn hơn mọi phần tử của tập rỗng\" luôn đúng", en: "All 30: \"greater than every element of an empty set\" is always true" }
      - { vi: "Báo lỗi", en: "An error" }
    answer: 1
    trap: 0
    why:
      vi: "\"Không có gì để so\" nghe như phải ra rỗng. Nhưng `ALL` chỉ sai khi tìm thấy một phần tử làm nó sai; tập rỗng không có phần tử nào như vậy, nên điều kiện đúng với mọi dòng. Kiểm tra danh sách có rỗng không khi dùng `ALL`."
      en: "\"Nothing to compare with\" sounds like it should return nothing. But `ALL` is only false when it finds an element that breaks it; an empty set has none, so the condition holds for every row. Check whether the list can be empty when you use `ALL`."
  - q:
      vi: "`x = ANY (SELECT …)` giống điều kiện nào?"
      en: "Which condition is `x = ANY (SELECT …)` the same as?"
    options:
      - { vi: "`x IN (SELECT …)`", en: "`x IN (SELECT …)`" }
      - { vi: "`x = (SELECT …)`", en: "`x = (SELECT …)`" }
      - { vi: "`x = ALL (SELECT …)`", en: "`x = ALL (SELECT …)`" }
    answer: 0
    trap: 1
    why:
      vi: "Bỏ chữ `ANY` trông vẫn như cũ, nhưng `x = (SELECT …)` đòi truy vấn con trả đúng một dòng (lỗi 21000 nếu nhiều hơn). `= ANY` nhận cả danh sách, đúng như `IN`."
      en: "Dropping the word `ANY` looks harmless, but `x = (SELECT …)` needs the subquery to return exactly one row (error 21000 otherwise). `= ANY` takes the whole list, exactly like `IN`."
recap:
  - vi: "`ANY` = ít nhất một giá trị thỏa; `ALL` = mọi giá trị thỏa."
    en: "`ANY` = at least one value passes; `ALL` = every value passes."
  - vi: "`> ANY` so với nhỏ nhất, `> ALL` so với lớn nhất; `= ANY` giống `IN`."
    en: "`> ANY` compares with the smallest, `> ALL` with the largest; `= ANY` is `IN`."
  - vi: "`ALL` trên danh sách rỗng luôn đúng; một NULL trong danh sách làm `ALL` không bao giờ đúng."
    en: "`ALL` over an empty list is always true; one NULL in the list keeps `ALL` from ever being true."
sources:
  - https://www.postgresql.org/docs/current/functions-subquery.html#FUNCTIONS-SUBQUERY-ANY-SOME
  - https://www.postgresql.org/docs/current/functions-subquery.html#FUNCTIONS-SUBQUERY-ALL
  - https://www.postgresql.org/docs/current/functions-comparisons.html#FUNCTIONS-COMPARISONS-ANY-SOME
---
## Mở bài

Phòng mua hàng hỏi: "Món nào đắt hơn **mọi** món đồ gia dụng?" và ngay sau đó: "Món ăn vặt nào rẻ hơn **ít nhất một** loại đồ uống?" Hai câu khác nhau đúng ở một chữ, và SQL có hai từ khóa cho hai chữ đó.

## Ý chính

`ANY` và `ALL` đặt sau một phép so (`=`, `<`, `>`…) và trước một danh sách (truy vấn con một cột, hoặc một mảng). `> ANY` đúng khi giá trị lớn hơn **ít nhất một** phần tử; `> ALL` đúng khi nó lớn hơn **mọi** phần tử. `= ANY` chính là `IN`.

Nhiều người nghĩ **`ALL` trên một danh sách rỗng phải ra rỗng**. Thật ra nó đúng với mọi dòng, vì không có phần tử nào làm nó sai. Ngược lại, chỉ một NULL trong danh sách là `ALL` không còn đúng với dòng nào. Cả hai đều chạy êm, không báo lỗi, nên hãy biết danh sách của bạn có thể rỗng hay có ô trống không.

## Cú pháp

`SOME` là tên khác của `ANY`. Danh sách luôn nằm trong ngoặc.

# EN

## Opening

Purchasing asks: "Which items cost more than **every** household item?" and right after: "Which snacks are cheaper than **at least one** drink?" The two questions differ by one word, and SQL has a keyword for each.

## Key idea

`ANY` and `ALL` come after a comparison (`=`, `<`, `>`…) and before a list (a one-column subquery, or an array). `> ANY` is true when the value is greater than **at least one** element; `> ALL` when it is greater than **every** element. `= ANY` is exactly `IN`.

Many people think **`ALL` over an empty list must return nothing**. In fact it is true for every row, because no element makes it false. In the other direction, a single NULL in the list keeps `ALL` from being true for any row. Both run quietly with no error, so know whether your list can be empty or hold empty cells.

## Syntax

`SOME` is another name for `ANY`. The list always sits in brackets.
