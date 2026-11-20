---
id: e-pg-l1-03
engine: postgres
level: L1
module: types
title: Kiểm tra nhanh về kiểu số
title_en: Quick check on number types
kind: quiz
minutes: 3
objectives:
  - vi: Chọn đúng kiểu số cho từng tình huống
    en: Pick the right number type for each case
requires: [e-pg-l1-01]
sources:
  - https://www.postgresql.org/docs/current/datatype-numeric.html
predict:
  sql: SELECT 0.1::float8 + 0.2::float8 = 0.3::float8;
  q:
    vi: Câu này trả về gì?
    en: What does this query return?
  options:
    - vi: "true"
      en: "true"
    - vi: "false"
      en: "false"
    - vi: Báo lỗi kiểu dữ liệu
      en: A type error
  answer: 1
  why:
    vi: Tổng `float8` là 0.30000000000000004, khác 0.3, nên phép so ra false.
    en: The `float8` sum is 0.30000000000000004, not 0.3, so the comparison is false.
quiz:
  - q:
      vi: Cột lưu số tiền của hóa đơn nên dùng kiểu nào?
      en: Which type should a column holding invoice amounts use?
    options:
      - vi: "`float8`"
        en: "`float8`"
      - vi: "`numeric`"
        en: "`numeric`"
      - vi: "`real`"
        en: "`real`"
    answer: 1
    why:
      vi: Tiền cần đúng tới từng đồng; `numeric` lưu số thập phân chính xác.
      en: Money must be exact to the last unit; `numeric` stores decimals exactly.
  - q:
      vi: Vì sao `float8` tính nhanh hơn `numeric`?
      en: Why is `float8` arithmetic faster than `numeric`?
    options:
      - vi: Bộ xử lý tính số nhị phân dấu phẩy động trực tiếp
        en: The CPU does binary floating point arithmetic directly
      - vi: "`float8` không lưu phần thập phân"
        en: "`float8` stores no fractional part"
      - vi: "`numeric` luôn được nén"
        en: "`numeric` is always compressed"
    answer: 0
    why:
      vi: Phần cứng tính `float8` sẵn; `numeric` được tính bằng phần mềm, từng nhóm chữ số.
      en: The hardware computes `float8` natively; `numeric` is computed in software, digit group by digit group.
---

## Ý chính

Đoán trước, rồi đọc giải thích. Sai không bị trừ gì: chọn lại tới khi đúng.

# EN

## Key idea

Guess first, then read the explanation. A wrong pick costs nothing: try again until it is right.
