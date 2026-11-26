---
id: e-ds-l4-06
engine: design
level: L4
module: denormalize
title: Tổng hợp - từ bảng tính phẳng tới schema 3NF
title_en: Capstone - from a flat spreadsheet to a 3NF schema
kind: capstone
runtime: browser
minutes: 30
figures: [{ name: ds-2nf-split, at: practice }]
objectives:
  - vi: Đọc phụ thuộc hàm từ một bảng phẳng và thiết kế các bảng 3NF có khóa, khóa ngoại và CHECK.
    en: Read the functional dependencies of a flat table and design 3NF tables with keys, foreign keys and a CHECK.
  - vi: Chuyển dữ liệu cũ sang thiết kế mới theo đúng thứ tự cha trước con sau.
    en: Move the old data into the new design in the right order, parents before children.
  - vi: Kiểm thiết kế bằng một truy vấn nghiệp vụ thật.
    en: Check the design with a real business query.
requires: [e-ds-l4-03]
sources:
  - https://www.bkent.net/Doc/simple5.htm
  - https://www.postgresql.org/docs/18/ddl-constraints.html
  - https://www.postgresql.org/docs/18/sql-insert.html
lab:
  setup: |
    CREATE TABLE loans_flat (
      loan_id int PRIMARY KEY,
      member_email text NOT NULL,
      member_name text NOT NULL,
      isbn text NOT NULL,
      title text NOT NULL,
      borrowed_on date NOT NULL,
      returned_on date
    );
    INSERT INTO loans_flat VALUES
      (1, 'an@example.com', 'An', '978-1', 'Databases', '2026-10-01', '2026-10-10'),
      (2, 'binh@example.com', 'Binh', '978-1', 'Databases', '2026-10-12', NULL),
      (3, 'an@example.com', 'An', '978-2', 'Networks', '2026-10-15', NULL),
      (4, 'chi@example.com', 'Chi', '978-3', 'Algorithms', '2026-10-03', '2026-10-20');
  steps:
    - name: { vi: Bạn đọc, en: Members }
      task:
        vi: "`member_email` → `member_name`. Tạo bảng `members` với `email text` làm khóa chính và `name text NOT NULL`."
        en: "`member_email` → `member_name`. Create table `members` with `email text` as primary key and `name text NOT NULL`."
      solution: CREATE TABLE members (email text PRIMARY KEY, name text NOT NULL)
      check: catalog
      hint:
        vi: "`CREATE TABLE members (email text PRIMARY KEY, name text NOT NULL)`."
        en: "`CREATE TABLE members (email text PRIMARY KEY, name text NOT NULL)`."
    - name: { vi: Sách, en: Books }
      task:
        vi: "`isbn` → `title`. Tạo bảng `books` với `isbn text` làm khóa chính và `title text NOT NULL`."
        en: "`isbn` → `title`. Create table `books` with `isbn text` as primary key and `title text NOT NULL`."
      solution: CREATE TABLE books (isbn text PRIMARY KEY, title text NOT NULL)
      check: catalog
      hint:
        vi: "Cùng khuôn với `members`."
        en: "Same pattern as `members`."
    - name: { vi: Lượt mượn, en: Loans }
      task:
        vi: "Tạo bảng `loans`: `id int` khóa chính, `member_email text NOT NULL` trỏ tới `members (email)`, `isbn text NOT NULL` trỏ tới `books (isbn)`, `borrowed_on date NOT NULL`, `returned_on date`, và một `CHECK (returned_on >= borrowed_on)`. Đừng đặt tên ràng buộc."
        en: "Create table `loans`: `id int` primary key, `member_email text NOT NULL` pointing to `members (email)`, `isbn text NOT NULL` pointing to `books (isbn)`, `borrowed_on date NOT NULL`, `returned_on date`, and a `CHECK (returned_on >= borrowed_on)`. Do not name the constraints."
      solution: CREATE TABLE loans (id int PRIMARY KEY, member_email text NOT NULL REFERENCES members (email), isbn text NOT NULL REFERENCES books (isbn), borrowed_on date NOT NULL, returned_on date, CHECK (returned_on >= borrowed_on))
      check: catalog
      hint:
        vi: "Khóa ngoại viết ngay sau cột bằng `REFERENCES`; `CHECK` của bảng đặt cuối danh sách cột."
        en: "Foreign keys go right after the column with `REFERENCES`; the table `CHECK` goes at the end of the column list."
    - name: { vi: Chép bạn đọc, en: Copy members }
      task:
        vi: "Chép mỗi bạn đọc một lần từ `loans_flat` vào `members`."
        en: "Copy each member once from `loans_flat` into `members`."
      solution: INSERT INTO members SELECT DISTINCT member_email, member_name FROM loans_flat
      after: SELECT email, name FROM members ORDER BY email
      check: rows
      ordered: true
      hint:
        vi: "`INSERT INTO members SELECT DISTINCT …`: thứ tự cột theo bảng đích."
        en: "`INSERT INTO members SELECT DISTINCT …`: columns in the target table's order."
    - name: { vi: Chép sách, en: Copy books }
      task:
        vi: "Chép mỗi cuốn sách một lần vào `books`."
        en: "Copy each book once into `books`."
      solution: INSERT INTO books SELECT DISTINCT isbn, title FROM loans_flat
      after: SELECT isbn, title FROM books ORDER BY isbn
      check: rows
      ordered: true
      hint:
        vi: "Như bước trước, với `isbn`, `title`."
        en: "Like the step before, with `isbn`, `title`."
    - name: { vi: Chép lượt mượn, en: Copy loans }
      task:
        vi: "Chép mọi lượt mượn vào `loans` (cha đã có nên khóa ngoại sẽ qua). Lab chấm bằng câu hỏi nghiệp vụ: sách nào đang được ai mượn chưa trả."
        en: "Copy every loan into `loans` (the parents exist, so the foreign keys pass). The lab grades it with a business question: which books are out, and with whom."
      solution: INSERT INTO loans SELECT loan_id, member_email, isbn, borrowed_on, returned_on FROM loans_flat
      after: SELECT b.title, m.name FROM loans l JOIN books b ON b.isbn = l.isbn JOIN members m ON m.email = l.member_email WHERE l.returned_on IS NULL ORDER BY b.title
      check: rows
      ordered: true
      hint:
        vi: "`INSERT INTO loans SELECT loan_id, member_email, isbn, borrowed_on, returned_on FROM loans_flat`."
        en: "`INSERT INTO loans SELECT loan_id, member_email, isbn, borrowed_on, returned_on FROM loans_flat`."
quiz:
  - q:
      vi: "Vì sao phải chép `members` và `books` trước `loans`?"
      en: "Why must `members` and `books` be copied before `loans`?"
    options:
      - { vi: "Vì Postgres chép bảng theo thứ tự chữ cái", en: "Because Postgres copies tables in alphabetical order" }
      - { vi: "Vì khóa ngoại của `loans` đòi dòng cha có trước; chép con trước sẽ lỗi 23503", en: "Because the foreign keys of `loans` need the parent rows first; copying the child first fails with 23503" }
      - { vi: "Không cần: khóa ngoại chỉ kiểm lúc COMMIT", en: "No need: foreign keys are only checked at COMMIT" }
    answer: 1
    trap: 2
    why:
      vi: "Postgres không chép theo thứ tự chữ cái; thứ tự là do bạn chạy câu nào trước. Khóa ngoại mặc định cũng không chờ tới COMMIT: nó được kiểm ở cuối mỗi câu `INSERT`, chỉ ràng buộc khai báo `DEFERRABLE` và đặt `DEFERRED` mới chờ. Vì vậy chép `loans` trước thì mỗi dòng trỏ tới một email và một ISBN chưa có trong `members`, `books`, và câu bị từ chối với mã 23503 (vi phạm khóa ngoại)."
      en: "Postgres does not copy in alphabetical order; the order is whichever statement you run first. A foreign key does not wait for COMMIT by default either: it is checked at the end of each `INSERT`, and only a constraint declared `DEFERRABLE` and set `DEFERRED` waits. So copying `loans` first makes each row point to an email and an ISBN not yet in `members` and `books`, and the statement is refused with code 23503 (foreign key violation)."
---
## Mở bài

Thư viện của khoa lưu mọi lượt mượn trong một bảng tính phẳng: email và tên bạn đọc, ISBN và tên sách, ngày mượn, ngày trả. Tên sách lặp ở mỗi lượt mượn, tên bạn đọc cũng vậy. Bài tổng hợp này đi trọn đường từ bảng phẳng tới một schema 3NF có luật, rồi kiểm bằng câu hỏi thật.

## Thực hành

Mô tả ER: một **bạn đọc** (khóa email, có tên) mượn nhiều **sách** (khóa ISBN, có tên sách); mỗi **lượt mượn** nối đúng một bạn đọc với một cuốn sách, có ngày mượn bắt buộc và ngày trả có thể chưa có. Đây là quan hệ nhiều–nhiều giữa bạn đọc và sách, mang thuộc tính riêng, nên lượt mượn là một bảng.

Phụ thuộc hàm trên `loans_flat`: `loan_id` → mọi cột; `member_email` → `member_name`; `isbn` → `title`. Hai phụ thuộc sau là bắc cầu qua `loan_id`, nên bảng chỉ ở 2NF. Tách theo vế trái của chúng ra `members` và `books`, giữ `loans` với hai khóa ngoại; thêm luật ngày trả không trước ngày mượn.

Sáu bước: ba bước tạo bảng (chấm bằng catalog, đừng đặt tên ràng buộc), ba bước chép dữ liệu theo thứ tự cha trước con sau. Bước cuối được chấm bằng câu hỏi của thủ thư: sách nào đang được mượn và ai đang giữ.

Hình cuối mục này nhắc lại một phép tách không mất dòng (bài `e-ds-l4-02`): làm cùng cách cho thành viên và sách.

## Tóm tắt

- Đọc phụ thuộc hàm trước, rồi tách theo vế trái của từng phụ thuộc bắc cầu.
- Quan hệ nhiều–nhiều có thuộc tính thành một bảng riêng với hai khóa ngoại.
- Luật nghiệp vụ (ngày trả sau ngày mượn) là một `CHECK`, không phải một ghi chú.
- Chép dữ liệu cha trước con sau; kiểm thiết kế bằng một câu hỏi nghiệp vụ.

# EN

## Opening

The faculty library keeps every loan in one flat spreadsheet: member email and name, ISBN and title, borrow date, return date. The title repeats on every loan, and so does the member's name. This capstone goes all the way from the flat table to a 3NF schema with rules, then checks it with a real question.

## Practice

The ER description: a **member** (keyed by email, with a name) borrows many **books** (keyed by ISBN, with a title); each **loan** links exactly one member to one book, with a required borrow date and a return date that may not exist yet. It is a many-to-many relationship between members and books that carries its own attributes, so a loan is a table.

Functional dependencies on `loans_flat`: `loan_id` → every column; `member_email` → `member_name`; `isbn` → `title`. The last two are transitive through `loan_id`, so the table is only in 2NF. Split on their left sides into `members` and `books`, keep `loans` with two foreign keys, and add the rule that a return date is never before the borrow date.

Six steps: three create tables (graded on the catalog, do not name the constraints), three copy the data, parents before children. The last step is graded with the librarian's question: which books are out, and who has them.

The figure at the end of this section recalls a lossless split (lesson `e-ds-l4-02`): do the same for members and books.

## Recap

- Read the functional dependencies first, then split on the left side of each transitive one.
- A many-to-many relationship with attributes becomes its own table with two foreign keys.
- A business rule (return after borrow) is a `CHECK`, not a comment.
- Copy parents before children; check the design with a business question.
