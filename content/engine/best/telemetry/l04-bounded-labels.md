---
id: e-bp-l04
engine: best
track: telemetry
level: L1
module: l
title: "Nhãn metric chỉ nhận ít giá trị, không gắn mã người dùng"
title_en: "Metric labels take few values, never user ids"
kind: quiz
minutes: 3
objectives:
  - vi: "Chọn nhãn có số giá trị nhỏ và cố định (route, mã trạng thái), và đếm số series một metric tạo ra."
    en: "Pick labels with a small, fixed set of values (route, status code), and count the series a metric creates."
avoid:
  vi: "Nhãn `user_id` trên metric: mỗi người dùng một series, số series tăng theo số khách."
  en: "A `user_id` label on a metric: one series per user, so the series count grows with the customer base."
requires: [e-tm-l1-03]
skills: []
adv: []
sources:
  - https://prometheus.io/docs/practices/naming/
  - https://prometheus.io/docs/concepts/data_model/
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-27" }
pair:
  runtime: engine
  check: diff
  setup: |
    CREATE TABLE samples (metric text, labels jsonb, ts timestamp, value float8);
    INSERT INTO samples SELECT 'http_requests_by_user', jsonb_build_object('route', '/track', 'user_id', u), timestamp '2026-10-31 10:00', 1 FROM generate_series(1, 300) AS u;
    INSERT INTO samples SELECT 'http_requests_total', jsonb_build_object('route', r, 'code', c), timestamp '2026-10-31 10:00', 100 FROM unnest(ARRAY['/track', '/quote', '/book']) AS r, unnest(ARRAY['200', '500']) AS c;
  bad: |
    SELECT count(DISTINCT labels) AS series
    FROM samples
    WHERE metric = 'http_requests_by_user'
  good: |
    SELECT count(DISTINCT labels) AS series
    FROM samples
    WHERE metric = 'http_requests_total'
  expect: { compare: count }
quiz:
  - q:
      vi: "Metric có nhãn `route` (3 giá trị) và `code` (2 giá trị). Thêm nhãn `user_id` với 300 khách thì có tối đa bao nhiêu series?"
      en: "A metric has labels `route` (3 values) and `code` (2 values). Adding a `user_id` label with 300 customers gives at most how many series?"
    options:
      - { vi: "306", en: "306" }
      - { vi: "1 800", en: "1,800" }
      - { vi: "6", en: "6" }
    answer: 1
    why:
      vi: "Series không cộng theo nhãn mà nhân: mỗi tổ hợp giá trị nhãn khác nhau là một series riêng. 3 route × 2 mã × 300 khách = 1 800 series, chứ không phải 3 + 2 + 300 = 306; còn 6 là số series khi chưa có `user_id`. Mỗi series tốn bộ nhớ và chỗ lưu trên Prometheus, nên tài liệu khuyên không dùng nhãn có nhiều giá trị như mã người dùng; thông tin đó thuộc về log hoặc trace."
      en: "Series do not add up per label, they multiply: every distinct combination of label values is its own series. 3 routes × 2 codes × 300 customers = 1,800 series, not 3 + 2 + 300 = 306; and 6 is the count before `user_id`. Every series costs memory and storage in Prometheus, so the docs advise against labels with many values such as user ids; that detail belongs in logs or traces."
---

## Ý chính

Mỗi tổ hợp giá trị nhãn là một series. Chỉ dùng nhãn có ít giá trị và biết trước (route, mã trạng thái, môi trường). Mã người dùng, mã đơn hay địa chỉ IP không bao giờ là nhãn.

## Vì sao

- Số series bằng tích số giá trị của các nhãn (cardinality). Một nhãn không giới hạn làm số series tăng theo dữ liệu, không theo hệ thống.
- Mỗi series chiếm bộ nhớ và chỗ lưu riêng; tài liệu Prometheus cảnh báo không dùng nhãn có nhiều giá trị như mã người dùng.
- Muốn biết từng người dùng gặp gì thì ghi log hoặc trace, rồi lọc theo mã đó khi cần.
- Bảng `samples` mô phỏng series như trong bài về nhãn: bản Không nên đếm được `300` series cho một route, bản Nên chỉ `6` cho ba route và hai mã.

# EN

## Key idea

Every combination of label values is a series. Use only labels with a few values known in advance (route, status code, environment). User ids, order ids or IP addresses are never labels.

## Why

- The number of series is the product of each label's number of values (cardinality). One unbounded label makes the series count grow with the data, not with the system.
- Each series takes its own memory and storage; the Prometheus docs warn against labels with many values such as user ids.
- To know what one user went through, write logs or traces and filter by that id when needed.
- The `samples` table models series as in the lesson on labels: the Avoid version counts `300` series for one route, the Prefer version only `6` for three routes and two codes.
