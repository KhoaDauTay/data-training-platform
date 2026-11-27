---
id: e-tm-l1-03
engine: telemetry
level: L1
module: signals
title: "Nhãn và cardinality"
title_en: "Labels and cardinality"
kind: lab
runtime: browser
minutes: 25
figures: [{ name: tm-cardinality, at: idea }]
objectives:
  - vi: Biết rằng mỗi tổ hợp nhãn khác nhau là một chuỗi thời gian (series) riêng.
    en: Know that every distinct combination of labels is its own time series.
  - vi: Đếm series và số giá trị của từng nhãn bằng SQL để tìm nhãn làm bùng nổ cardinality.
    en: Count series and the values of each label in SQL to find the label that blows up cardinality.
  - vi: Giải thích vì sao mã người dùng hay mã đơn không được làm nhãn.
    en: Explain why a user id or an order id must not be a label.
requires: [e-tm-l1-02]
sources:
  - { url: "https://prometheus.io/docs/practices/naming/", title: "Prometheus: Metric and label naming", title_vi: "Prometheus: đặt tên metric và label" }
  - { url: "https://prometheus.io/docs/concepts/data_model/", title: "Prometheus: Data model", title_vi: "Prometheus: mô hình dữ liệu" }
lab:
  setup: |
    CREATE TABLE metrics (
      ts timestamp, name text,
      labels jsonb, value float8
    );
    INSERT INTO metrics
    SELECT '2026-10-31 10:00', 'http_requests_total',
      jsonb_build_object('route', r, 'method', m, 'code', c), 1
    FROM unnest(ARRAY['/track', '/quote', '/book']) r,
      unnest(ARRAY['GET', 'POST']) m,
      unnest(ARRAY['200', '404', '500']) c;
    INSERT INTO metrics
    SELECT '2026-10-31 10:00', 'http_requests_by_user_total',
      jsonb_build_object('route', r, 'user_id', u::text), 1
    FROM unnest(ARRAY['/track', '/quote', '/book']) r,
      generate_series(1, 500) u;
  steps:
    - task:
        vi: "Mỗi metric có bao nhiêu series (tổ hợp nhãn khác nhau)? Trả `name`, `series`."
        en: "How many series (distinct label combinations) does each metric have? Return `name`, `series`."
      solution: |
        SELECT name,
          count(DISTINCT labels) AS series
        FROM metrics
        GROUP BY name
      check: rows
      hint:
        vi: "Một tổ hợp nhãn là một giá trị `labels`: `count(DISTINCT labels)` theo `name`."
        en: "One label combination is one `labels` value: `count(DISTINCT labels)` per `name`."
    - task:
        vi: "Với `http_requests_total`: mỗi nhãn có bao nhiêu giá trị khác nhau? Trả `label`, `n_values`."
        en: "For `http_requests_total`: how many distinct values does each label have? Return `label`, `n_values`."
      solution: |
        SELECT e.k AS label,
          count(DISTINCT e.v) AS n_values
        FROM metrics,
          jsonb_each_text(labels) AS e(k, v)
        WHERE name = 'http_requests_total'
        GROUP BY e.k
      check: rows
      hint:
        vi: "`jsonb_each_text(labels) AS e(k, v)` tách mỗi nhãn thành một dòng; rồi `count(DISTINCT e.v)` theo `e.k`."
        en: "`jsonb_each_text(labels) AS e(k, v)` splits each label into a row; then `count(DISTINCT e.v)` per `e.k`."
    - task:
        vi: "Với `http_requests_by_user_total`: nhãn nào có nhiều giá trị nhất? Trả `label`, `n_values`, chỉ một dòng."
        en: "For `http_requests_by_user_total`: which label has the most values? Return `label`, `n_values`, one row only."
      solution: |
        SELECT e.k AS label,
          count(DISTINCT e.v) AS n_values
        FROM metrics,
          jsonb_each_text(labels) AS e(k, v)
        WHERE name = 'http_requests_by_user_total'
        GROUP BY e.k
        ORDER BY n_values DESC
        LIMIT 1
      check: rows
      ordered: true
      hint:
        vi: "Như bước trước, đổi `name`, thêm `ORDER BY n_values DESC LIMIT 1`."
        en: "As in the previous step, change `name`, add `ORDER BY n_values DESC LIMIT 1`."
    - task:
        vi: "Bỏ nhãn `user_id` khỏi `http_requests_by_user_total` thì còn bao nhiêu series? Trả `series`."
        en: "If `http_requests_by_user_total` drops the `user_id` label, how many series are left? Return `series`."
      solution: |
        SELECT count(DISTINCT labels - 'user_id')
          AS series
        FROM metrics
        WHERE name = 'http_requests_by_user_total'
      check: rows
      hint:
        vi: "Toán tử `-` của jsonb bỏ một khóa: `count(DISTINCT labels - 'user_id')`."
        en: "jsonb's `-` operator removes a key: `count(DISTINCT labels - 'user_id')`."
quiz:
  - q:
      vi: "Metric có nhãn `route` (3 giá trị), `method` (2) và `code` (3). Tối đa có bao nhiêu series?"
      en: "A metric has labels `route` (3 values), `method` (2) and `code` (3). At most how many series?"
    options:
      - { vi: "8, cộng số giá trị", en: "8, adding the values" }
      - { vi: "3, số nhãn", en: "3, the number of labels" }
      - { vi: "18, nhân số giá trị", en: "18, multiplying the values" }
    answer: 2
    trap: 0
    why:
      vi: "Cộng 3 + 2 + 3 = 8 nghe hợp lý, nhưng mỗi tổ hợp nhãn là một series riêng, nên số series tối đa là tích: 3 × 2 × 3 = 18 (bước 1 của lab ra đúng 18). 3 là số nhãn, không phải số series. Vì là phép nhân, thêm một nhãn 500 giá trị biến 3 series thành 1.500."
      en: "Adding 3 + 2 + 3 = 8 sounds right, but each label combination is its own series, so the most there can be is the product: 3 × 2 × 3 = 18 (step 1 of the lab gives exactly 18). 3 is the number of labels, not of series. Because it multiplies, one more label with 500 values turns 3 series into 1,500."
  - q:
      vi: "Muốn biết người dùng nào gọi API nhiều nhất. Nên làm gì?"
      en: "You want to know which user calls the API most. What should you do?"
    options:
      - { vi: "Ghi `user_id` vào log của request", en: "Put `user_id` in the request's log" }
      - { vi: "Thêm nhãn `user_id` vào counter", en: "Add a `user_id` label to the counter" }
      - { vi: "Tạo một metric riêng cho mỗi user", en: "Create one metric per user" }
    answer: 0
    trap: 1
    why:
      vi: "Thêm nhãn là cách nhanh nhất để tách số theo user, nhưng tài liệu Prometheus dặn không dùng nhãn cho chiều có nhiều giá trị như mã người dùng hay email: mỗi user thành một series, lưu và quét đều nặng lên. Một metric cho mỗi user còn tệ hơn, vẫn là một series mỗi user. Mã người dùng thuộc về log (hay thuộc tính của span), nơi mỗi request là một bản ghi; đếm theo user bằng truy vấn trên log."
      en: "A label is the quickest way to split numbers by user, but the Prometheus docs say not to use labels for dimensions with many values such as user ids or email addresses: each user becomes a series, so storing and scanning grow heavy. One metric per user is worse, still one series per user. A user id belongs in the logs (or a span attribute), where each request is one record; count by user with a query on the logs."
---
## Mở bài

Một kỹ sư thêm nhãn `user_id` vào counter request "cho tiện tra". Số series nhảy từ 3 lên 1.500 chỉ trong một lần triển khai. Bài này đo hiện tượng đó bằng SQL và chỉ ra nhãn thủ phạm.

## Ý chính

Trong mô hình dữ liệu của Prometheus, một **series** (chuỗi thời gian) được định danh bởi tên metric cộng tập nhãn của nó. Tài liệu đặt tên của Prometheus nói rõ: mỗi tổ hợp cặp nhãn - giá trị khác nhau là một series mới, có thể làm lượng dữ liệu tăng vọt. **Cardinality** là số series. Vì các tổ hợp nhân với nhau, số series tối đa bằng tích số giá trị của từng nhãn: `route` 3 × `method` 2 × `code` 3 = 18.

Nhãn có tập giá trị không giới hạn (mã người dùng, email, mã đơn) làm cardinality bùng nổ: tài liệu dặn không dùng nhãn cho các chiều như vậy. Những giá trị đó thuộc về log hay thuộc tính của span, nơi mỗi sự kiện là một bản ghi. Bằng SQL ta đếm `count(DISTINCT labels)` cho số series và tách nhãn bằng `jsonb_each_text` để thấy nhãn nào nhiều giá trị nhất. Hình cuối mục cho thấy phép nhân.

## Cú pháp

```sql
-- series = distinct label sets
SELECT name,
  count(DISTINCT labels) AS series
FROM metrics
GROUP BY name;
```

- `jsonb_each_text(labels)` tách mỗi nhãn thành một dòng `(key, value)`.
- `labels - 'user_id'` bỏ một nhãn khỏi tập nhãn.
- Số series tối đa = tích số giá trị của các nhãn.

## Ví dụ

Vài series của `http_requests_total`.

```sql
SELECT labels
FROM metrics
WHERE name = 'http_requests_total'
ORDER BY labels::text
LIMIT 4;
```

Tích số giá trị của các nhãn, bằng `exp(sum(ln(n)))`.

```sql
SELECT round(exp(sum(ln(n))))
  AS max_series
FROM (
  SELECT count(DISTINCT e.v) AS n
  FROM metrics,
    jsonb_each_text(labels) e(k, v)
  WHERE name = 'http_requests_total'
  GROUP BY e.k) t;
```

## Lỗi hay gặp

Đếm dòng thay vì đếm tổ hợp nhãn: dòng của nhiều lần đọc cùng series bị đếm nhiều lần.

```sql
-- WRONG: rows, not series
SELECT count(*) AS series
FROM metrics, (VALUES (1), (2)) s(n)
WHERE name = 'http_requests_total';
```

```sql
-- FIX: distinct label sets
SELECT count(DISTINCT labels) AS series
FROM metrics, (VALUES (1), (2)) s(n)
WHERE name = 'http_requests_total';
```

Đếm giá trị của nhãn trên mọi metric: hai metric khác nhau bị trộn.

```sql
-- WRONG: mixes both metrics
SELECT count(DISTINCT labels->>'route')
  AS routes,
  count(DISTINCT labels) AS series
FROM metrics;
```

```sql
-- FIX: one metric at a time
SELECT count(DISTINCT labels->>'route')
  AS routes,
  count(DISTINCT labels) AS series
FROM metrics
WHERE name = 'http_requests_total';
```

## Thực hành

Bốn bước: đếm series của mỗi metric, đếm giá trị của từng nhãn, tìm nhãn nhiều giá trị nhất của metric có `user_id`, rồi đếm lại số series sau khi bỏ nhãn đó.

## Tóm tắt

- Series = tên metric + tập nhãn; mỗi tổ hợp nhãn là một series.
- Số series tối đa là tích số giá trị của các nhãn.
- Không làm nhãn với mã người dùng, email, mã đơn: đưa chúng vào log hoặc thuộc tính span.
- SQL: `count(DISTINCT labels)` và `jsonb_each_text` tìm nhãn thủ phạm.

# EN

## Opening

An engineer adds a `user_id` label to the request counter "to make lookups easy". The series count jumps from 3 to 1,500 in a single deploy. This lesson measures that with SQL and points at the culprit label.

## Key idea

In Prometheus' data model, a **series** (time series) is identified by the metric name plus its set of labels. Prometheus' naming guide says it plainly: every unique combination of key-value label pairs is a new series, which can dramatically increase the amount of data stored. **Cardinality** is the number of series. Because combinations multiply, the most series there can be is the product of each label's value count: `route` 3 × `method` 2 × `code` 3 = 18.

A label with an unbounded set of values (user ids, email addresses, order ids) blows cardinality up: the docs say not to use labels for such dimensions. Those values belong in logs or span attributes, where each event is one record. In SQL we count `count(DISTINCT labels)` for the series and split labels with `jsonb_each_text` to see which label has the most values. The figure at the end of this section shows the multiplication.

## Syntax

```sql
-- series = distinct label sets
SELECT name,
  count(DISTINCT labels) AS series
FROM metrics
GROUP BY name;
```

- `jsonb_each_text(labels)` splits each label into a `(key, value)` row.
- `labels - 'user_id'` removes one label from the set.
- The most series = the product of the labels' value counts.

## Example

A few series of `http_requests_total`.

```sql
SELECT labels
FROM metrics
WHERE name = 'http_requests_total'
ORDER BY labels::text
LIMIT 4;
```

The product of the labels' value counts, with `exp(sum(ln(n)))`.

```sql
SELECT round(exp(sum(ln(n))))
  AS max_series
FROM (
  SELECT count(DISTINCT e.v) AS n
  FROM metrics,
    jsonb_each_text(labels) e(k, v)
  WHERE name = 'http_requests_total'
  GROUP BY e.k) t;
```

## Common mistakes

Counting rows instead of label sets: several readings of the same series are counted several times.

```sql
-- WRONG: rows, not series
SELECT count(*) AS series
FROM metrics, (VALUES (1), (2)) s(n)
WHERE name = 'http_requests_total';
```

```sql
-- FIX: distinct label sets
SELECT count(DISTINCT labels) AS series
FROM metrics, (VALUES (1), (2)) s(n)
WHERE name = 'http_requests_total';
```

Counting a label's values across every metric: two different metrics get mixed.

```sql
-- WRONG: mixes both metrics
SELECT count(DISTINCT labels->>'route')
  AS routes,
  count(DISTINCT labels) AS series
FROM metrics;
```

```sql
-- FIX: one metric at a time
SELECT count(DISTINCT labels->>'route')
  AS routes,
  count(DISTINCT labels) AS series
FROM metrics
WHERE name = 'http_requests_total';
```

## Practice

Four steps: count the series of each metric, count the values of each label, find the label with the most values in the metric that has `user_id`, then count the series again after dropping that label.

## Recap

- A series = metric name + label set; each label combination is a series.
- The most series is the product of the labels' value counts.
- Never make a user id, an email or an order id a label: put them in logs or span attributes.
- SQL: `count(DISTINCT labels)` and `jsonb_each_text` find the culprit label.
