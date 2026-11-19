---
id: e-pg-l1-01
engine: postgres
level: L1
module: types
title: numeric hay float8?
title_en: numeric or float8?
kind: concept
minutes: 4
objectives:
  - vi: Biết vì sao `float8` cộng 0.1 với 0.2 không ra đúng 0.3
    en: Know why `float8` does not add 0.1 and 0.2 to exactly 0.3
  - vi: Chọn `numeric` cho tiền và mọi số cần chính xác
    en: Pick `numeric` for money and every number that must be exact
requires: []
sources:
  - https://www.postgresql.org/docs/current/datatype-numeric.html
---

## Ý chính

`float8` (double precision) lưu số theo hệ nhị phân IEEE 754, nên nhiều số thập phân như 0.1 chỉ được lưu gần đúng. Phép tính nhanh, nhưng sai số nhỏ cộng dồn lại.

`numeric` lưu từng chữ số thập phân, nên kết quả đúng tuyệt đối. Đổi lại, nó chậm hơn và tốn chỗ hơn.

## Ví dụ

Cùng một phép cộng, hai kiểu cho hai đáp án:

```sql
SELECT 0.1::float8 + 0.2::float8 AS f, 0.1::numeric + 0.2::numeric AS n;
```

- `f` ra 0.30000000000000004
- `n` ra đúng 0.3

## Thực hành

Gặp cột tiền, số lượng có lẻ hay tỉ lệ cần so bằng `=`, hãy dùng `numeric`. Dùng `float8` cho số đo khoa học, nơi sai số rất nhỏ là chấp nhận được.

# EN

## Key idea

`float8` (double precision) stores numbers in IEEE 754 binary, so many decimals such as 0.1 are stored only approximately. Arithmetic is fast, but the small errors add up.

`numeric` stores every decimal digit, so results are exact. In exchange it is slower and takes more space.

## Example

The same addition gives two answers with the two types:

```sql
SELECT 0.1::float8 + 0.2::float8 AS f, 0.1::numeric + 0.2::numeric AS n;
```

- `f` is 0.30000000000000004
- `n` is exactly 0.3

## Practice

For money, fractional quantities or ratios you compare with `=`, use `numeric`. Use `float8` for scientific measurements, where a tiny error is acceptable.
