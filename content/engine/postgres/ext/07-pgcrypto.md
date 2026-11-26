---
id: e-pg-ext-07
engine: postgres
level: EXT
module: ext-security
title: "pgcrypto: băm mật khẩu, mã hóa một cột"
title_en: "pgcrypto: hash passwords, encrypt one column"
kind: lab
runtime: browser
minutes: 14
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-26" }
figures: [{ name: pg-ext-salted-hash, at: idea }]
objectives:
  - vi: Lưu mật khẩu bằng `crypt(pw, gen_salt('bf', 8))` và kiểm tra đăng nhập bằng `crypt(input, pw_hash) = pw_hash`.
    en: Store passwords with `crypt(pw, gen_salt('bf', 8))` and check a login with `crypt(input, pw_hash) = pw_hash`.
  - vi: Lấy dấu vân tay của một tệp bằng `digest(..., 'sha256')` để tìm bản trùng.
    en: Fingerprint a file with `digest(..., 'sha256')` to find duplicates.
  - vi: Mã hóa và giải mã một cột nhạy cảm bằng `pgp_sym_encrypt` và `pgp_sym_decrypt`, và biết khóa không nên nằm ở đâu.
    en: Encrypt and decrypt a sensitive column with `pgp_sym_encrypt` and `pgp_sym_decrypt`, and know where the key should not live.
requires: [e-pg-ext-01]
sources:
  - https://www.postgresql.org/docs/18/pgcrypto.html
  - https://www.postgresql.org/docs/18/monitoring-stats.html
  - https://www.postgresql.org/docs/18/runtime-config-logging.html
lab:
  setup: |
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    CREATE TABLE staff (
      login text PRIMARY KEY,
      pw_hash text NOT NULL
    );
    INSERT INTO staff VALUES
      ('an', crypt('lantern-2026', gen_salt('bf', 8))),
      ('binh', crypt('hoian123', gen_salt('bf', 8))),
      ('chi', crypt('hoian123', gen_salt('bf', 8))),
      ('dung', md5('dung-pass'));
    CREATE TABLE customers (
      id int PRIMARY KEY,
      name text NOT NULL,
      phone_enc bytea NOT NULL
    );
    INSERT INTO customers VALUES
      (1, 'Lan', pgp_sym_encrypt('0905 111 222', 'shop-key')),
      (2, 'Minh', pgp_sym_encrypt('0935 333 444', 'shop-key')),
      (3, 'Thu', pgp_sym_encrypt('0914 555 666', 'shop-key'));
    CREATE TABLE uploads (
      id int PRIMARY KEY,
      file_name text NOT NULL,
      body text NOT NULL
    );
    INSERT INTO uploads VALUES
      (1, 'invoice-11.csv', 'id,total;1,120;2,80'),
      (2, 'invoice-11-copy.csv', 'id,total;1,120;2,80'),
      (3, 'invoice-12.csv', 'id,total;1,95');
  steps:
    - task:
        vi: "Nhân viên `an` đăng nhập với mật khẩu `lantern-2026`. Mật khẩu có đúng không? Một cột `ok` kiểu đúng/sai."
        en: "Staff member `an` logs in with the password `lantern-2026`. Is it right? One true/false column `ok`."
      solution: SELECT crypt('lantern-2026', pw_hash) = pw_hash AS ok FROM staff WHERE login = 'an'
      check: rows
      hint:
        vi: "`crypt(input, pw_hash)` dùng lại muối nằm trong `pw_hash`; bằng nhau là đúng mật khẩu."
        en: "`crypt(input, pw_hash)` reuses the salt stored in `pw_hash`; equal means the right password."
    - task:
        vi: "Những ai đang dùng mật khẩu `hoian123`? Cột `login`, theo `login`."
        en: "Who uses the password `hoian123`? Column `login`, by `login`."
      solution: SELECT login FROM staff WHERE crypt('hoian123', pw_hash) = pw_hash ORDER BY login
      check: rows
      ordered: true
      hint:
        vi: "Cùng phép kiểm như bước 1, đặt trong `WHERE` cho mọi dòng."
        en: "The same check as step 1, in `WHERE` for every row."
    - task:
        vi: "Tài khoản `dung` còn lưu `md5`. Đặt mật khẩu mới `Sea-Lantern-9` cho `dung`, băm bằng bcrypt (`bf`) với 8 vòng."
        en: "Account `dung` still stores `md5`. Set the new password `Sea-Lantern-9` for `dung`, hashed with bcrypt (`bf`) at 8 rounds."
      solution: UPDATE staff SET pw_hash = crypt('Sea-Lantern-9', gen_salt('bf', 8)) WHERE login = 'dung'
      check: rows
      after: SELECT login, crypt('Sea-Lantern-9', pw_hash) = pw_hash AS ok, pw_hash LIKE '$2a$08$%' AS bcrypt FROM staff WHERE login = 'dung'
      hint:
        vi: "`UPDATE ... SET pw_hash = crypt(..., gen_salt('bf', 8))`."
        en: "`UPDATE ... SET pw_hash = crypt(..., gen_salt('bf', 8))`."
    - task:
        vi: "Bộ phận giao hàng cần số điện thoại của khách `2`. Giải mã cột `phone_enc` bằng khóa `shop-key` (một cột `phone`)."
        en: "Delivery needs the phone number of customer `2`. Decrypt `phone_enc` with the key `shop-key` (one column `phone`)."
      solution: SELECT pgp_sym_decrypt(phone_enc, 'shop-key') AS phone FROM customers WHERE id = 2
      check: rows
      hint:
        vi: "`pgp_sym_decrypt(col, key)` trả lại chuỗi gốc."
        en: "`pgp_sym_decrypt(col, key)` gives back the original text."
quiz:
  - q:
      vi: "`binh` và `chi` cùng đặt mật khẩu `hoian123`, băm bằng `crypt(pw, gen_salt('bf', 8))`. Cột `pw_hash` của hai người ra sao?"
      en: "`binh` and `chi` both chose `hoian123`, hashed with `crypt(pw, gen_salt('bf', 8))`. What do their `pw_hash` values look like?"
    options:
      - { vi: "Giống hệt nhau, vì cùng một mật khẩu", en: "Exactly the same, because the password is the same" }
      - { vi: "Khác nhau, vì mỗi lần băm có một muối mới", en: "Different, because each hash gets a new salt" }
      - { vi: "Giống nhau nếu tạo trong cùng một phiên", en: "The same if created in the same session" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì `md5('hoian123')` lúc nào cũng ra một chuỗi, nhưng `gen_salt` sinh một muối ngẫu nhiên mỗi lần và `crypt` ghi muối đó ngay đầu chuỗi băm. Hai người cùng mật khẩu nên có hai chuỗi khác nhau, và kẻ lấy được bảng không biết họ trùng mật khẩu. Khi kiểm, `crypt(input, pw_hash)` đọc lại đúng muối đó."
      en: "It sounds right because `md5('hoian123')` always gives one string, but `gen_salt` makes a random salt every time and `crypt` writes it at the start of the hash. Two people with one password get two different strings, and whoever steals the table cannot tell they match. At login, `crypt(input, pw_hash)` reads that same salt back."
  - q:
      vi: "Trên server thật, vì sao không nên viết khóa `'shop-key'` thẳng vào câu SQL gửi lên?"
      en: "On a real server, why should the key `'shop-key'` not be written straight into the SQL text?"
    options:
      - { vi: "Không sao: Postgres tự che mọi hằng số trong log", en: "It is fine: Postgres masks every constant in its logs" }
      - { vi: "Câu đầy đủ có thể nằm trong log và `pg_stat_activity`", en: "The full text can land in logs and `pg_stat_activity`" }
      - { vi: "`pgcrypto` chỉ nhận khóa từ biến môi trường", en: "`pgcrypto` only accepts keys from environment variables" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì `pg_stat_statements` đổi hằng số thành `$1`, nhưng đó chỉ là thống kê. Log của server (khi bật `log_statement` hay ghi câu chậm) và `pg_stat_activity` giữ nguyên văn câu, kể cả khóa. Ứng dụng nên gửi khóa như một tham số, và chỉ người cần mới được đọc log."
      en: "It sounds right because `pg_stat_statements` turns constants into `$1`, but that is only statistics. The server log (with `log_statement` on, or when slow queries are logged) and `pg_stat_activity` keep the text as written, key included. The application should send the key as a parameter, and only the people who need it should read the logs."
---
## Mở bài

Bảng nhân viên của chuỗi cửa hàng còn một tài khoản lưu mật khẩu bằng `md5`, và cột số điện thoại khách đang để chữ trơn. Kho tệp thì có hóa đơn tải lên hai lần. `pgcrypto`, một extension đi kèm PostgreSQL, giải quyết cả ba việc ngay trong database.

## Ý chính

Ba nhóm hàm của `pgcrypto` giải ba bài toán khác nhau, và không nên dùng lẫn:

- Băm mật khẩu: `crypt(pw, gen_salt('bf', 8))` dùng bcrypt, cố ý chậm (8 là số vòng, mỗi vòng tăng gấp đôi công) và có muối ngẫu nhiên ghi ngay trong chuỗi băm. Kiểm đăng nhập bằng `crypt(input, pw_hash) = pw_hash`. Không giải ngược được.
- Dấu vân tay: `digest(data, 'sha256')` nhanh và luôn cùng kết quả cho cùng dữ liệu, hợp để tìm tệp trùng hay kiểm tệp có bị sửa. Không dùng cho mật khẩu: nhanh là điểm yếu khi kẻ gian thử hàng tỉ mật khẩu.
- Mã hóa: `pgp_sym_encrypt(text, key)` cho ra `bytea`, `pgp_sym_decrypt(bytea, key)` trả lại chữ gốc. Dùng khi cần đọc lại dữ liệu, như số điện thoại.

Nhiều người nghĩ `md5` là "mã hóa mật khẩu". Thật ra `md5` là một phép băm nhanh, không muối: hai người cùng mật khẩu có cùng chuỗi, và bảng tra sẵn đoán ra mật khẩu phổ biến ngay.

Khóa mã hóa là điểm yếu còn lại: câu SQL có khóa viết thẳng vào có thể nằm nguyên văn trong log và `pg_stat_activity`. Ứng dụng nên gửi khóa như một tham số.

Hình ở cuối mục này cho thấy một mật khẩu, hai muối, hai chuỗi băm khác nhau.

## Cú pháp

```sql
crypt(pw, gen_salt('bf', 8))
crypt(input, pw_hash) = pw_hash
digest(data, 'sha256')
pgp_sym_encrypt(data, key)
pgp_sym_decrypt(bytes, key)
```

`gen_salt` nhận `'bf'` (bcrypt, 4 đến 31 vòng), `'md5'`, `'xdes'`, `'des'`; dùng `'bf'`.

## Ví dụ

Cột mật khẩu trông thế nào:

```sql
SELECT login, left(pw_hash, 7) AS head,
       length(pw_hash) AS len
FROM staff ORDER BY login;
```

Ba tài khoản bcrypt bắt đầu bằng `$2a$08$` (thuật toán, 8 vòng) và dài 60 ký tự; `dung` là 32 ký tự hex của `md5`.

Tìm tệp tải lên trùng nội dung:

```sql
SELECT encode(digest(body, 'sha256'),
  'hex') AS sha256, count(*) AS files
FROM uploads
GROUP BY 1 HAVING count(*) > 1;
```

Hai tệp hóa đơn tháng 11 có cùng dấu vân tay: là một tệp tải lên hai lần.

Số điện thoại đã mã hóa chiếm bao nhiêu chỗ:

```sql
SELECT id, octet_length(phone_enc)
  AS bytes
FROM customers ORDER BY id;
```

Mỗi số 12 ký tự thành 78 byte mã hóa: gói PGP có thêm muối, phần đầu và mã kiểm tra.

## Lỗi hay gặp

Băm mật khẩu bằng `md5`:

```sql
-- WRONG: same password, same md5
SELECT count(DISTINCT md5(pw))
  AS hashes
FROM (VALUES ('hoian123'),
             ('hoian123')) AS v(pw);
```

```sql
-- FIX: bcrypt, a new salt each time
SELECT count(DISTINCT
  crypt(pw, gen_salt('bf', 8)))
  AS hashes
FROM (VALUES ('hoian123'),
             ('hoian123')) AS v(pw);
```

`md5` cho 1 chuỗi cho hai người; bcrypt cho 2.

Giải mã bằng sai khóa:

```sql
-- ERROR 39000: Wrong key or corrupt data
SELECT pgp_sym_decrypt(phone_enc,
  'wrong-key') AS phone
FROM customers WHERE id = 2;
```

Sai khóa thì không ra chữ rác mà báo lỗi; mất khóa là mất dữ liệu, nên khóa phải được cất giữ ngoài database.

Đặt số vòng ngoài khoảng cho phép:

```sql
-- ERROR 22023: gen_salt: Incorrect number of rounds
SELECT gen_salt('bf', 3);
```

bcrypt nhận từ 4 đến 31 vòng. Mỗi vòng thêm làm việc băm chậm gấp đôi, với cả kẻ đoán mật khẩu.

## Thực hành

Kiểm một lần đăng nhập, tìm những ai dùng chung một mật khẩu, chuyển tài khoản `md5` sang bcrypt, rồi giải mã một số điện thoại. Sau đó trả lời hai câu hỏi.

## Tóm tắt

- Mật khẩu: `crypt(pw, gen_salt('bf', 8))`, kiểm bằng `crypt(input, pw_hash) = pw_hash`; muối nằm sẵn trong chuỗi băm.
- `md5` và `digest` nhanh, không muối: hợp cho dấu vân tay tệp, không hợp cho mật khẩu.
- `pgp_sym_encrypt` và `pgp_sym_decrypt` mã hóa dữ liệu cần đọc lại; sai khóa là lỗi 39000.
- Khóa viết thẳng trong câu SQL có thể nằm trong log và `pg_stat_activity`; gửi nó như một tham số.

# EN

## Opening

The shop chain's staff table still has one account storing its password as `md5`, and the customers' phone numbers sit in plain text. The file store also holds an invoice uploaded twice. `pgcrypto`, an extension shipped with PostgreSQL, solves all three inside the database.

## Key idea

The three groups of `pgcrypto` functions solve three different problems, and they should not be mixed up:

- Password hashing: `crypt(pw, gen_salt('bf', 8))` uses bcrypt, slow on purpose (8 is the number of rounds, each round doubling the work) with a random salt written inside the hash. Check a login with `crypt(input, pw_hash) = pw_hash`. It cannot be reversed.
- Fingerprints: `digest(data, 'sha256')` is fast and always gives the same result for the same data, good for finding duplicate files or checking a file was not changed. Not for passwords: being fast is a weakness when an attacker tries billions of guesses.
- Encryption: `pgp_sym_encrypt(text, key)` gives `bytea`, and `pgp_sym_decrypt(bytea, key)` gives the original text back. Use it when the data must be read again, such as a phone number.

Many people think `md5` "encrypts the password". In fact `md5` is a fast hash with no salt: two people with one password get the same string, and a ready-made lookup table guesses common passwords at once.

The encryption key is the weak spot left: a SQL text with the key written into it can sit word for word in the logs and in `pg_stat_activity`. The application should send the key as a parameter.

The figure at the end of this section shows one password, two salts and two different hashes.

## Syntax

```sql
crypt(pw, gen_salt('bf', 8))
crypt(input, pw_hash) = pw_hash
digest(data, 'sha256')
pgp_sym_encrypt(data, key)
pgp_sym_decrypt(bytes, key)
```

`gen_salt` takes `'bf'` (bcrypt, 4 to 31 rounds), `'md5'`, `'xdes'` or `'des'`; use `'bf'`.

## Example

What the password column looks like:

```sql
SELECT login, left(pw_hash, 7) AS head,
       length(pw_hash) AS len
FROM staff ORDER BY login;
```

The three bcrypt accounts start with `$2a$08$` (the algorithm, 8 rounds) and are 60 characters long; `dung` is the 32 hex characters of `md5`.

Find uploaded files with the same content:

```sql
SELECT encode(digest(body, 'sha256'),
  'hex') AS sha256, count(*) AS files
FROM uploads
GROUP BY 1 HAVING count(*) > 1;
```

The two November invoices share one fingerprint: one file uploaded twice.

How much room an encrypted phone number takes:

```sql
SELECT id, octet_length(phone_enc)
  AS bytes
FROM customers ORDER BY id;
```

Each 12-character number becomes 78 encrypted bytes: the PGP packet adds a salt, a header and a check code.

## Common mistakes

Hashing passwords with `md5`:

```sql
-- WRONG: same password, same md5
SELECT count(DISTINCT md5(pw))
  AS hashes
FROM (VALUES ('hoian123'),
             ('hoian123')) AS v(pw);
```

```sql
-- FIX: bcrypt, a new salt each time
SELECT count(DISTINCT
  crypt(pw, gen_salt('bf', 8)))
  AS hashes
FROM (VALUES ('hoian123'),
             ('hoian123')) AS v(pw);
```

`md5` gives 1 string for both people; bcrypt gives 2.

Decrypting with the wrong key:

```sql
-- ERROR 39000: Wrong key or corrupt data
SELECT pgp_sym_decrypt(phone_enc,
  'wrong-key') AS phone
FROM customers WHERE id = 2;
```

A wrong key raises an error rather than returning garbage; a lost key is lost data, so the key must be kept outside the database.

Setting a number of rounds out of range:

```sql
-- ERROR 22023: gen_salt: Incorrect number of rounds
SELECT gen_salt('bf', 3);
```

bcrypt takes 4 to 31 rounds. Each extra round makes hashing twice as slow, for the password guesser too.

## Practice

Check one login, find who shares a password, move the `md5` account to bcrypt, then decrypt one phone number. Then answer two questions.

## Recap

- Passwords: `crypt(pw, gen_salt('bf', 8))`, checked with `crypt(input, pw_hash) = pw_hash`; the salt lives inside the hash.
- `md5` and `digest` are fast and unsalted: fine for file fingerprints, wrong for passwords.
- `pgp_sym_encrypt` and `pgp_sym_decrypt` encrypt data that must be read again; a wrong key is error 39000.
- A key written into the SQL text can end up in the logs and `pg_stat_activity`; send it as a parameter.
