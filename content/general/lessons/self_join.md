---
id: self_join
title: "Self-join: nối một bảng với chính nó"
title_en: "Self-join: join a table to itself"
minutes: 20
figures: [{ name: sql-self-join-tree, at: idea }]
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Đặt hai alias cho cùng một bảng để mỗi dòng gặp được dòng nó trỏ tới, như nhân viên và quản lý.
    en: Give one table two aliases so each row can meet the row it points to, such as an employee and their manager.
  - vi: Đi lên hai cấp (quản lý của quản lý) bằng một lần nối nữa.
    en: Climb two levels (the manager's manager) with one more join.
  - vi: Ghép cặp các dòng cùng nhóm mà không lặp và không tự bắt cặp với mình.
    en: Pair rows of the same group without repeats and without a row pairing with itself.
syntax: |-
  SELECT e.name, m.name AS manager
  FROM staff e
  [LEFT] JOIN staff m ON m.id = e.manager_id
options:
  - { code: "staff e, staff m", vi: "hai alias, hai vai: người được hỏi và người họ trỏ tới", en: "two aliases, two roles: the person asked about and the one they point to" }
  - { code: "ON m.id = e.manager_id", vi: "chiều nối: khóa của người quản lý bằng cột trỏ của nhân viên", en: "the direction: the manager's key equals the employee's pointer column" }
  - { code: "LEFT JOIN", vi: "giữ cả người không có quản lý (cấp cao nhất)", en: "keeps people with no manager (the top level)" }
  - { code: "a.id < b.id", vi: "khi ghép cặp: bỏ cặp tự thân và cặp đảo ngược", en: "when pairing: drops self-pairs and reversed pairs" }
examples:
  - title: { vi: "Nhân viên cửa hàng 3 và quản lý trực tiếp", en: "Store 3 staff and their direct manager" }
    sql: |-
      SELECT e.name, e.role, m.name AS manager
      FROM staff e
      JOIN staff m ON m.id = e.manager_id
      WHERE e.store_id = 3
    read:
      vi: "4 người: Ta Vy (quản lý cửa hàng) báo cáo cho Ly Quan, hai thu ngân báo cáo cho Ta Vy. Cùng một bảng đóng hai vai nhờ hai alias `e` và `m`."
      en: "4 people: Ta Vy (the store manager) reports to Ly Quan, two cashiers report to Ta Vy. One table plays two roles thanks to the aliases `e` and `m`."
  - title: { vi: "Giữ cả người đứng đầu", en: "Keeping the person at the top" }
    sql: |-
      SELECT e.name, m.name AS manager
      FROM staff e
      LEFT JOIN staff m ON m.id = e.manager_id
      WHERE e.store_id IS NULL
    read:
      vi: "5 người ở văn phòng. Ha Minh (CEO) không có quản lý nên `manager` trống; với `JOIN` thường, chị ấy sẽ biến mất."
      en: "5 office people. Ha Minh (the CEO) has no manager, so `manager` is empty; with a plain `JOIN` she would disappear."
  - title: { vi: "Mỗi người quản lý bao nhiêu người", en: "How many people each manager has" }
    sql: |-
      SELECT m.name AS manager, count(*) AS reports
      FROM staff e
      JOIN staff m ON m.id = e.manager_id
      GROUP BY m.name
      ORDER BY reports DESC, m.name
    read:
      vi: "12 người có cấp dưới; Do Lan và Ha Minh mỗi người 3. Gom nhóm theo phía `m` (người quản lý), đếm phía `e` (người báo cáo)."
      en: "12 people have direct reports; Do Lan and Ha Minh have 3 each. Group on the `m` side (the managers), count the `e` side (the reports)."
  - title: { vi: "Hai cấp: quản lý của quản lý", en: "Two levels: the manager's manager" }
    sql: |-
      SELECT e.name, m.name AS manager, g.name AS grand_manager
      FROM staff e
      JOIN staff m ON m.id = e.manager_id
      JOIN staff g ON g.id = m.manager_id
      WHERE e.role = 'Stock clerk'
    read:
      vi: "3 nhân viên kho, mỗi người hai cấp trên. Mỗi cấp thêm một alias và một lần nối; với số cấp không biết trước, cần truy vấn đệ quy (nâng cao)."
      en: "3 stock clerks, each with two levels above. Each level adds one alias and one join; for an unknown number of levels you need a recursive query (advanced)."
  - title: { vi: "Hai cửa hàng cùng thành phố", en: "Two stores in the same city" }
    sql: |-
      SELECT a.name, b.name
      FROM stores a
      JOIN stores b ON a.city = b.city AND a.id < b.id
    read:
      vi: "2 cặp: Hai Chau–Son Tra (Đà Nẵng) và Ben Thanh–Thao Dien (TP.HCM). `a.id < b.id` giữ mỗi cặp một lần và bỏ cặp một cửa hàng với chính nó."
      en: "2 pairs: Hai Chau–Son Tra (Da Nang) and Ben Thanh–Thao Dien (Ho Chi Minh City). `a.id < b.id` keeps each pair once and drops a store paired with itself."
pitfalls:
  - title: { vi: "Ghép cặp mà quên bỏ trùng", en: "Pairing without removing repeats" }
    wrong: "SELECT a.name, b.name FROM stores a JOIN stores b ON a.city = b.city"
    fix: "SELECT a.name, b.name FROM stores a JOIN stores b ON a.city = b.city AND a.id < b.id ORDER BY a.name"
    why:
      vi: "Mỗi cửa hàng khớp với chính nó, và mỗi cặp ra hai lần (A–B và B–A): 9 dòng thay vì 2. Thêm `a.id < b.id`."
      en: "Every store matches itself, and every pair comes out twice (A–B and B–A): 9 rows instead of 2. Add `a.id < b.id`."
  - title: { vi: "Nối ngược chiều", en: "Joining in the wrong direction" }
    wrong: "SELECT e.name, m.name FROM staff e JOIN staff m ON e.id = m.manager_id WHERE e.store_id = 3"
    fix: "SELECT e.name, m.name FROM staff e JOIN staff m ON m.id = e.manager_id WHERE e.store_id = 3"
    why:
      vi: "Câu sai đọc thành \"m là người báo cáo cho e\": cột thứ hai liệt kê cấp dưới, không phải quản lý (3 dòng sai nghĩa thay vì 4). Đọc `ON` thành câu: \"m là người có id bằng manager_id của e\"."
      en: "The wrong query reads \"m reports to e\": the second column lists reports, not managers (3 rows with the wrong meaning instead of 4). Read the `ON` aloud: \"m is the person whose id equals e's manager_id\"."
  - title: { vi: "Hai lần cùng một bảng mà không alias", en: "The same table twice without aliases" }
    wrong: "SELECT name, name FROM staff JOIN staff ON id = manager_id"
    fix: "SELECT e.name, m.name FROM staff e JOIN staff m ON m.id = e.manager_id"
    why:
      vi: "Không có alias, Postgres không phân biệt được hai lần xuất hiện của `staff`: lỗi 42712. Self-join luôn cần hai tên khác nhau."
      en: "Without aliases, Postgres cannot tell the two copies of `staff` apart: error 42712. A self-join always needs two different names."
quiz:
  - q:
      vi: "Self-join có tạo ra một bản sao của bảng trong cơ sở dữ liệu không?"
      en: "Does a self-join create a copy of the table in the database?"
    options:
      - { vi: "Có, Postgres chép bảng sang tên mới", en: "Yes, Postgres copies the table under the new name" }
      - { vi: "Không, alias chỉ là hai cách gọi cùng một bảng trong câu truy vấn", en: "No, the aliases are just two names for the same table inside the query" }
      - { vi: "Có, nhưng chỉ tạm thời trên đĩa", en: "Yes, but only temporarily on disk" }
    answer: 1
    trap: 0
    why:
      vi: "\"Hai bảng\" trong câu làm người ta hình dung hai bản dữ liệu. Thật ra chỉ có một bảng; `e` và `m` là hai cái tên để mỗi dòng đóng một vai khác nhau trong phép nối."
      en: "\"Two tables\" in the query makes people picture two copies of the data. There is only one table; `e` and `m` are two names so each row can play a different role in the join."
  - q:
      vi: "Bảng có 5 cửa hàng, ghép mọi cặp cùng thành phố với `a.id < b.id`. Vì sao dùng `<` chứ không `<>`?"
      en: "Pairing stores in the same city with `a.id < b.id`. Why `<` and not `<>`?"
    options:
      - { vi: "`<>` cũng bỏ cặp tự thân nhưng vẫn giữ cả A–B lẫn B–A", en: "`<>` also drops self-pairs but still keeps both A–B and B–A" }
      - { vi: "`<>` không dùng được với số", en: "`<>` does not work on numbers" }
      - { vi: "Hai cách ra cùng kết quả", en: "Both give the same result" }
    answer: 0
    trap: 2
    why:
      vi: "`<>` đúng là bỏ được cửa hàng tự bắt cặp với mình, nên trông đủ. Nhưng A–B và B–A đều thỏa `<>`, nên mỗi cặp vẫn ra hai lần. `<` chỉ giữ chiều có id nhỏ trước."
      en: "`<>` does remove a store paired with itself, so it looks enough. But A–B and B–A both pass `<>`, so each pair still appears twice. `<` keeps only the direction with the smaller id first."
recap:
  - vi: "Self-join = cùng một bảng, hai alias, hai vai."
    en: "Self-join = one table, two aliases, two roles."
  - vi: "Đọc `ON` thành câu để chắc chiều nối; `LEFT JOIN` để giữ người không có cấp trên."
    en: "Read the `ON` as a sentence to get the direction right; `LEFT JOIN` keeps people with nobody above."
  - vi: "Ghép cặp trong cùng nhóm: thêm `a.id < b.id`."
    en: "Pairing inside a group: add `a.id < b.id`."
sources:
  - https://www.postgresql.org/docs/current/queries-table-expressions.html#QUERIES-TABLE-ALIASES
---
## Mở bài

Phòng nhân sự hỏi: "Mỗi nhân viên báo cáo cho ai?" Bảng `staff` có cột `manager_id`, nhưng đó chỉ là một con số. Tên của người quản lý nằm trong chính bảng `staff`, ở một dòng khác.

## Ý chính

Self-join là nối một bảng với chính nó. Bạn viết bảng hai lần với hai alias, mỗi alias một vai: `e` là nhân viên, `m` là người quản lý. Điều kiện `ON m.id = e.manager_id` nói dòng `m` nào đi với dòng `e` nào. Mọi thứ khác (alias trước cột, `LEFT JOIN`, đếm) như một phép nối bình thường.

Nhiều người nghĩ **self-join là một loại phép nối đặc biệt**. Thật ra không có cú pháp riêng nào: đó là `JOIN` thường, chỉ khác là hai bên là cùng một bảng. Phần khó duy nhất là giữ đúng vai và đúng chiều của hai alias.

Hình cuối mục này vẽ một nhánh của bảng `staff`: mỗi mũi tên là `manager_id` trỏ lên người quản lý. Bên dưới, cùng một bảng đóng vai `e` và `m`, nối bằng `m.id = e.manager_id`.

## Cú pháp

Đặt tên alias theo vai (`e`, `m`) thay vì `a`, `b` khi có thể; đọc lại sẽ dễ hơn.

# EN

## Opening

HR asks: "Who does each employee report to?" The `staff` table has a `manager_id` column, but that is just a number. The manager's name lives in the same `staff` table, on another row.

## Key idea

A self-join joins a table to itself. You write the table twice with two aliases, one role each: `e` is the employee, `m` the manager. The condition `ON m.id = e.manager_id` says which `m` row goes with which `e` row. Everything else (aliases before columns, `LEFT JOIN`, counting) works like any join.

Many people think **a self-join is a special kind of join**. There is no special syntax at all: it is a plain `JOIN`, the only difference being that both sides are the same table. The only hard part is keeping the two aliases' roles and direction straight.

The figure at the end of this section draws one branch of the `staff` table: every arrow is a `manager_id` pointing up to the manager. Below it, the same table plays `e` and `m`, joined on `m.id = e.manager_id`.

## Syntax

Name aliases after their role (`e`, `m`) rather than `a`, `b` when you can; it reads more easily later.
