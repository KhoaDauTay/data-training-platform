---
id: case_when
title: "CASE WHEN: chia dòng vào các nhóm theo điều kiện"
title_en: "CASE WHEN: sort rows into buckets by condition"
minutes: 25
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Tạo một cột mới có giá trị theo từng điều kiện, như hạng giá 1/2/3.
    en: Build a new column whose value depends on conditions, such as price tiers 1/2/3.
  - vi: Sắp các nhánh `WHEN` đúng thứ tự, vì nhánh đúng đầu tiên thắng.
    en: Order the `WHEN` branches correctly, because the first true branch wins.
  - vi: Có `ELSE` cho trường hợp còn lại, kể cả ô trống.
    en: Give an `ELSE` for what is left, empty cells included.
syntax: |-
  SELECT CASE
           WHEN condition_1 THEN result_1
           WHEN condition_2 THEN result_2
           [ELSE other_result]
         END AS new_column
  FROM table_name
options:
  - { code: "WHEN … THEN …", vi: "một nhánh: điều kiện và giá trị trả về", en: "one branch: a condition and the value it returns" }
  - { code: "WHEN a … WHEN b", vi: "Postgres thử từ trên xuống, dừng ở nhánh đúng đầu tiên", en: "Postgres tries top to bottom and stops at the first true branch" }
  - { code: "ELSE", vi: "giá trị khi không nhánh nào đúng; thiếu thì là NULL", en: "the value when no branch is true; without it, NULL" }
  - { code: "CASE col WHEN 'a' THEN …", vi: "dạng ngắn khi chỉ so bằng một cột", en: "short form when you only test one column for equality" }
  - { code: "END", vi: "luôn phải có; đặt tên cột bằng `AS` sau nó", en: "always required; name the column with `AS` after it" }
examples:
  - title: { vi: "Hạng giá của đồ gia dụng", en: "Price tiers of household items" }
    sql: |-
      SELECT name, price_vnd,
             CASE WHEN price_vnd >= 100000 THEN 3
                  WHEN price_vnd >= 30000 THEN 2
                  ELSE 1 END AS tier
      FROM products
      WHERE category = 'Household'
    read:
      vi: "6 món: bột giặt hạng 3, túi rác hạng 1, còn lại hạng 2. Mức cao nhất đứng đầu, nên món 129.000 đồng dừng ở nhánh đầu tiên."
      en: "6 items: the laundry powder in tier 3, the trash bags in tier 1, the rest in tier 2. The highest bar comes first, so the 129,000 VND item stops at the first branch."
  - title: { vi: "Đếm theo hạng vừa tạo", en: "Counting by the new tier" }
    sql: |-
      SELECT CASE WHEN price_vnd >= 100000 THEN 3 WHEN price_vnd >= 30000 THEN 2 ELSE 1 END AS tier, count(*)
      FROM products
      GROUP BY 1
      ORDER BY 1
    read:
      vi: "15 món hạng 1, 11 món hạng 2, 4 món hạng 3. Cột tạo bằng `CASE` dùng được trong `GROUP BY` như mọi cột khác."
      en: "15 items in tier 1, 11 in tier 2, 4 in tier 3. A column built with `CASE` works in `GROUP BY` like any other column."
  - title: { vi: "Dạng ngắn cho một cột", en: "The short form on one column" }
    sql: |-
      SELECT id, CASE channel WHEN 'ONLINE' THEN true ELSE false END AS is_online
      FROM orders
      WHERE order_date = '2026-10-31'
    read:
      vi: "5 đơn ngày 31/10, chỉ đơn 1419 là online. Kết quả là `true`/`false`, không phải chữ: bộ chấm so giá trị y hệt, nên cờ đúng/sai an toàn hơn chữ có dấu."
      en: "5 orders on 31 October; only order 1419 is online. The result is `true`/`false`, not text: values are compared exactly, so a true/false flag is safer than words."
  - title: { vi: "Một nhánh riêng cho ô trống", en: "A branch of its own for empty cells" }
    sql: |-
      SELECT name, birth_year,
             CASE WHEN birth_year IS NULL THEN 0
                  WHEN birth_year >= 1995 THEN 1
                  ELSE 2 END AS grp
      FROM customers
      WHERE id BETWEEN 9 AND 12
    read:
      vi: "Vo Lan không có năm sinh nên vào nhóm 0. Kiểm tra NULL trước tiên: không có nhánh đó thì ô trống rơi xuống `ELSE` và bị coi là nhóm 2."
      en: "Vo Lan has no birth year, so she goes to group 0. Test for NULL first: without that branch, an empty cell falls to the `ELSE` and is treated as group 2."
pitfalls:
  - title: { vi: "Nhánh rộng đứng trước nhánh hẹp", en: "A broad branch before a narrow one" }
    wrong: "SELECT name, CASE WHEN price_vnd >= 30000 THEN 2 WHEN price_vnd >= 100000 THEN 3 ELSE 1 END AS tier FROM products WHERE category = 'Household'"
    fix: "SELECT name, CASE WHEN price_vnd >= 100000 THEN 3 WHEN price_vnd >= 30000 THEN 2 ELSE 1 END AS tier FROM products WHERE category = 'Household'"
    why:
      vi: "Món 129.000 đồng thỏa `>= 30000` ngay ở nhánh đầu nên nhận hạng 2; nhánh hạng 3 không bao giờ được thử. Với các mức lồng nhau, viết mức cao nhất trước."
      en: "The 129,000 VND item passes `>= 30000` in the first branch and gets tier 2; the tier 3 branch is never tried. With nested thresholds, write the highest one first."
  - title: { vi: "Thiếu ELSE nên ô trống thành NULL", en: "No ELSE, so the gaps become NULL" }
    wrong: "SELECT name, CASE WHEN birth_year >= 1995 THEN 1 WHEN birth_year < 1995 THEN 2 END AS grp FROM customers WHERE id BETWEEN 9 AND 12"
    fix: "SELECT name, CASE WHEN birth_year >= 1995 THEN 1 WHEN birth_year < 1995 THEN 2 ELSE 0 END AS grp FROM customers WHERE id BETWEEN 9 AND 12"
    why:
      vi: "Hai nhánh trông như phủ hết mọi năm sinh, nhưng với ô trống cả hai đều ra NULL. Không có `ELSE`, `CASE` trả NULL và nhóm \"không rõ\" biến mất khỏi báo cáo. Luôn viết `ELSE`."
      en: "The two branches look as if they cover every birth year, but for an empty cell both are NULL. With no `ELSE`, `CASE` returns NULL and the \"unknown\" group vanishes from the report. Always write an `ELSE`."
quiz:
  - q:
      vi: "Một dòng thỏa cả `WHEN a` lẫn `WHEN b` (viết theo thứ tự đó). `CASE` trả gì?"
      en: "A row passes both `WHEN a` and `WHEN b` (written in that order). What does `CASE` return?"
    options:
      - { vi: "Kết quả của nhánh `a`, nhánh đúng đầu tiên", en: "The result of branch `a`, the first true branch" }
      - { vi: "Kết quả của nhánh `b`, nhánh sau ghi đè", en: "The result of branch `b`, the later one overrides" }
      - { vi: "Lỗi vì hai nhánh cùng đúng", en: "An error, because two branches are true" }
    answer: 0
    trap: 1
    why:
      vi: "Nếu quen với chuỗi `if` riêng rẽ, bạn sẽ nghĩ nhánh sau gán đè lên. `CASE` giống `if … else if`: nó dừng ở nhánh đúng đầu tiên và bỏ qua phần còn lại."
      en: "If you are used to separate `if` statements, you expect the later branch to overwrite. `CASE` is like `if … else if`: it stops at the first true branch and skips the rest."
  - q:
      vi: "Vì sao bài này cho kết quả dạng số (1/2/3) hay `true`/`false` thay vì chữ như \"Rẻ\"/\"Đắt\"?"
      en: "Why does this lesson return numbers (1/2/3) or `true`/`false` instead of words like \"Cheap\"/\"Expensive\"?"
    options:
      - { vi: "Vì `CASE` không trả được chữ", en: "Because `CASE` cannot return text" }
      - { vi: "Vì số và cờ không phụ thuộc ngôn ngữ, so sánh chính xác và dễ dùng tiếp", en: "Because numbers and flags do not depend on a language, compare exactly and are easy to reuse" }
      - { vi: "Vì chữ chạy chậm hơn", en: "Because text is slower" }
    answer: 1
    trap: 0
    why:
      vi: "`CASE` trả chữ thoải mái, nên lựa chọn này là quy ước, không phải giới hạn. Mã số hay cờ đúng/sai giống nhau ở mọi ngôn ngữ giao diện, và nhãn đọc được đặt ở lớp hiển thị."
      en: "`CASE` returns text just fine, so this is a convention, not a limit. A code or a true/false flag is the same in every interface language, and readable labels belong to the display layer."
recap:
  - vi: "`CASE WHEN … THEN … ELSE … END` tính một giá trị cho mỗi dòng."
    en: "`CASE WHEN … THEN … ELSE … END` computes one value per row."
  - vi: "Nhánh đúng đầu tiên thắng: mức cao nhất (hẹp nhất) viết trước."
    en: "The first true branch wins: write the highest (narrowest) threshold first."
  - vi: "Luôn có `ELSE`, và xét NULL bằng một nhánh riêng."
    en: "Always have an `ELSE`, and handle NULL in a branch of its own."
sources:
  - https://www.postgresql.org/docs/current/functions-conditional.html#FUNCTIONS-CASE
---
## Mở bài

Phòng mua hàng muốn chia sản phẩm thành ba hạng giá: rẻ, vừa, đắt. Bảng không có cột "hạng"; bạn phải tính nó cho từng dòng từ giá, theo các mốc do họ đặt.

## Ý chính

`CASE` là phép "nếu … thì …" của SQL. Với mỗi dòng, Postgres thử các nhánh `WHEN` từ trên xuống; nhánh đúng đầu tiên quyết định giá trị, các nhánh sau bị bỏ qua. Không nhánh nào đúng thì lấy `ELSE`, và không có `ELSE` thì ra NULL. Kết quả là một cột mới, dùng được trong `GROUP BY`, `ORDER BY` hay hàm gộp.

Nhiều người nghĩ **thứ tự các nhánh không quan trọng**, như một danh sách quy tắc. Thật ra với các mốc lồng nhau (`>= 30000` chứa cả `>= 100000`), nhánh rộng viết trước sẽ nuốt mọi dòng của nhánh hẹp.

## Cú pháp

Mỗi `CASE` kết thúc bằng `END`; mọi nhánh nên trả cùng một kiểu.

# EN

## Opening

Purchasing wants products split into three price tiers: cheap, middle, expensive. The table has no "tier" column; you have to compute it for every row from the price, using the bars they chose.

## Key idea

`CASE` is SQL's "if … then …". For each row, Postgres tries the `WHEN` branches from the top down; the first true branch decides the value and the later ones are skipped. If no branch is true it takes the `ELSE`, and with no `ELSE` the result is NULL. The result is a new column you can use in `GROUP BY`, `ORDER BY` or an aggregate.

Many people think **the order of the branches does not matter**, like a list of rules. In fact with nested thresholds (`>= 30000` includes `>= 100000`), a broad branch written first swallows every row of the narrow one.

## Syntax

Every `CASE` ends with `END`; all branches should return the same type.
