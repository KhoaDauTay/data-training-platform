---
id: e-tm-l3-01
engine: telemetry
level: L3
module: promql
title: "PromQL: selector và label matcher"
title_en: "PromQL: selectors and label matchers"
kind: lab
runtime: browser
minutes: 25
figures: [{ name: tm-promql-selector, at: idea }]
objectives:
  - vi: Chọn series bằng tên metric và label matcher `=`, `!=`, `=~`, `!~`.
    en: Select series by metric name and the label matchers `=`, `!=`, `=~`, `!~`.
  - vi: Biết regex của PromQL luôn neo cả hai đầu, và selector phải có tên hay một matcher không khớp chuỗi rỗng.
    en: Know that PromQL regexes are always anchored at both ends, and that a selector needs a name or a matcher that does not match the empty string.
  - vi: Phân biệt instant vector (một mẫu mỗi series) với range vector `[1m]` (mọi mẫu trong khoảng mở bên trái).
    en: Tell an instant vector (one sample per series) from a range vector `[1m]` (every sample in a left-open window).
requires: [e-tm-l1-03]
sources:
  - { url: "https://prometheus.io/docs/prometheus/latest/querying/basics/", title: "Prometheus: Querying basics", title_vi: "Prometheus: truy vấn cơ bản" }
  - { url: "https://prometheus.io/docs/concepts/data_model/", title: "Prometheus: Data model", title_vi: "Prometheus: mô hình dữ liệu" }
lab:
  setup: |
    CREATE TABLE samples (
      metric text, labels jsonb,
      ts timestamp, value float8
    );
    INSERT INTO samples
    SELECT 'http_requests_total',
      jsonb_build_object('job', 'api',
        'route', r, 'code', c),
      timestamp '2026-10-31 09:55'
        + n * interval '15 seconds',
      n * k
    FROM (VALUES ('/track', '200', 30),
        ('/track', '500', 3), ('/quote', '200', 12),
        ('/quote', '500', 1), ('/book', '200', 6),
        ('/book', '500', 0)) AS v(r, c, k),
      generate_series(0, 20) n;
  steps:
    - task:
        vi: "Mọi series của `http_requests_total` cho route `/track`, giá trị mới nhất."
        en: "Every series of `http_requests_total` for route `/track`, at its newest value."
      solution: 'http_requests_total{route="/track"}'
      lang: promql
      check: rows
      hint:
        vi: "Tên metric rồi matcher trong ngoặc nhọn: `http_requests_total{route=\"/track\"}`."
        en: "The metric name, then a matcher in braces: `http_requests_total{route=\"/track\"}`."
    - task:
        vi: "Series lỗi (`code` là `500`) của route `/track` hoặc `/quote`, bằng một regex."
        en: "The error series (`code` is `500`) of route `/track` or `/quote`, with one regex."
      solution: 'http_requests_total{route=~"/track|/quote", code="500"}'
      lang: promql
      check: rows
      hint:
        vi: "`=~` với `\"/track|/quote\"` (regex neo cả hai đầu), thêm `code=\"500\"`, cách nhau dấu phẩy."
        en: "`=~` with `\"/track|/quote\"` (the regex is anchored at both ends), plus `code=\"500\"`, separated by a comma."
    - task:
        vi: "Mọi series có `code` khác `200`."
        en: "Every series whose `code` is not `200`."
      solution: 'http_requests_total{code!="200"}'
      lang: promql
      check: rows
      hint:
        vi: "`!=` là khác: `http_requests_total{code!=\"200\"}`."
        en: "`!=` means not equal: `http_requests_total{code!=\"200\"}`."
    - task:
        vi: "Mọi mẫu trong 1 phút cuối của series `/book` mã `200` (range vector)."
        en: "Every sample in the last minute of the `/book` series with code `200` (a range vector)."
      solution: 'http_requests_total{route="/book", code="200"}[1m]'
      lang: promql
      check: rows
      hint:
        vi: "Thêm `[1m]` sau selector; khoảng mở bên trái nên mẫu đúng 09:59:00 không vào."
        en: "Add `[1m]` after the selector; the window is left-open, so the sample at exactly 09:59:00 is out."
quiz:
  - q:
      vi: "`http_requests_total{route=~\"/tr\"}` trả về gì trên dữ liệu bài này?"
      en: "What does `http_requests_total{route=~\"/tr\"}` return on this lesson's data?"
    options:
      - { vi: "Hai series của `/track`", en: "The two `/track` series" }
      - { vi: "Không series nào", en: "No series at all" }
      - { vi: "Mọi series", en: "Every series" }
    answer: 1
    trap: 0
    why:
      vi: "Quen với `LIKE` hay `grep`, ta nghĩ `/tr` khớp một phần của `/track`. Nhưng tài liệu Prometheus ghi regex luôn neo cả hai đầu: `=~\"/tr\"` hiểu như `^/tr$`, và không route nào đúng bằng `/tr`. Muốn khớp tiền tố thì viết `=~\"/tr.*\"`."
      en: "Used to `LIKE` or `grep`, we expect `/tr` to match part of `/track`. But the Prometheus docs say regex matches are always fully anchored: `=~\"/tr\"` means `^/tr$`, and no route is exactly `/tr`. For a prefix, write `=~\"/tr.*\"`."
  - q:
      vi: "Đồng hồ ảo dừng lúc 10:00:00, mẫu cách nhau 15 giây. `[1m]` lấy bao nhiêu mẫu mỗi series?"
      en: "The virtual clock stands at 10:00:00 and samples are 15 seconds apart. How many samples per series does `[1m]` take?"
    options:
      - { vi: "5 mẫu, từ 09:59:00", en: "5 samples, from 09:59:00" }
      - { vi: "4 mẫu, từ 09:59:15", en: "4 samples, from 09:59:15" }
      - { vi: "1 mẫu, mẫu mới nhất", en: "1 sample, the newest" }
    answer: 1
    trap: 0
    why:
      vi: "09:59:00, 09:59:15, 09:59:30, 09:59:45, 10:00:00 là năm mốc trong một phút, nên 5 nghe đúng. Nhưng khoảng của range vector mở bên trái và đóng bên phải: mẫu trùng đúng mép trái bị loại. Còn 4 mẫu từ 09:59:15 tới 10:00:00 (bước 4 của lab). Một mẫu mới nhất là instant vector, không có `[1m]`."
      en: "09:59:00, 09:59:15, 09:59:30, 09:59:45 and 10:00:00 are five marks in a minute, so 5 sounds right. But a range vector's window is left-open and right-closed: a sample exactly on the left edge is excluded. That leaves 4 samples from 09:59:15 to 10:00:00 (step 4 of the lab). One newest sample is an instant vector, without `[1m]`."
---
## Mở bài

Prometheus không có bảng: nó có series, mỗi series là một tên metric cộng một tập nhãn. Bài này chọn series bằng PromQL trên một bản mô phỏng chạy ngay trong trình duyệt, đọc từ bảng `samples` của lab. Câu SQL tương đương đi kèm để bạn thấy PromQL đang làm gì.

## Ý chính

Một **selector** gồm tên metric và các **label matcher** trong ngoặc nhọn: `=` bằng, `!=` khác, `=~` khớp regex, `!~` không khớp regex. Theo tài liệu Prometheus, regex dùng cú pháp RE2 và luôn **neo cả hai đầu**: `=~"/tr"` nghĩa là `^/tr$`. Một selector phải có tên metric hoặc ít nhất một matcher không khớp chuỗi rỗng, nên `{route=~".*"}` bị từ chối.

**Instant vector** cho mỗi series một mẫu: mẫu mới nhất tại hoặc trước thời điểm đánh giá, trong khoảng nhìn lại mặc định 5 phút. **Range vector** thêm `[1m]`, cho mọi mẫu trong khoảng mở bên trái, đóng bên phải. Ở đây BoonData tự đánh giá PromQL bằng một bộ mô phỏng nhỏ (mô phỏng, không phải Prometheus): đồng hồ ảo dừng ở mẫu mới nhất, 10:00:00, và dữ liệu được scrape mỗi 15 giây. Kết quả là bảng `series`, `value` (range vector thêm `time`). Hình cuối mục đặt PromQL cạnh SQL.

## Cú pháp

```promql
http_requests_total{route="/track"}
http_requests_total{code=~"5.."}
http_requests_total{code!="200"}[1m]
```

- Bản mô phỏng: selector, `= != =~ !~`, `[5m]`, và ở bài sau `rate`, `increase`, `sum by`, `avg by`, `histogram_quantile`.
- Regex neo cả hai đầu; regex không được khớp mọi thứ kể cả chuỗi rỗng khi đứng một mình.
- Đồng hồ ảo: 10:00:00, scrape mỗi 15 giây, nhìn lại 5 phút.

## Ví dụ

SQL của instant vector `http_requests_total{route="/track"}`: mẫu lúc 10:00 của từng series.

```sql
SELECT labels, value
FROM samples
WHERE labels->>'route' = '/track'
  AND ts = '2026-10-31 10:00'
ORDER BY labels->>'code';
```

SQL của range vector `[1m]`: mẫu trong khoảng (09:59:00, 10:00:00].

```sql
SELECT ts, value
FROM samples
WHERE labels->>'route' = '/book'
  AND labels->>'code' = '200'
  AND ts > '2026-10-31 09:59'
  AND ts <= '2026-10-31 10:00'
ORDER BY ts;
```

Cùng hai truy vấn bằng PromQL (chỉ hiển thị; bấm Chạy ở các bước lab để chạy thật).

```promql
http_requests_total{route="/track"}
```

```promql
http_requests_total{
  route="/book", code="200"}[1m]
```

## Lỗi hay gặp

Regex không neo theo ý ta: `/tr` không khớp `/track`.

```promql
# WRONG: anchored, matches only "/tr"
http_requests_total{route=~"/tr"}
```

```promql
# FIX: allow the rest of the path
http_requests_total{route=~"/tr.*"}
```

Selector không tên với regex khớp cả chuỗi rỗng: Prometheus từ chối.

```promql
# ERROR promql: matches the empty string
{route=~".*"}
```

## Thực hành

Bốn bước PromQL trên bản mô phỏng: series của `/track`, series lỗi của hai route bằng một regex, series có mã khác 200, rồi range vector 1 phút của `/book`.

## Tóm tắt

- Series = tên metric + nhãn; selector chọn series bằng `=`, `!=`, `=~`, `!~`.
- Regex PromQL neo cả hai đầu (RE2).
- Instant vector: mẫu mới nhất trong 5 phút nhìn lại; range vector `[1m]`: mọi mẫu trong khoảng mở bên trái.
- Bản mô phỏng của BoonData không phải Prometheus; nó theo luật của tài liệu Prometheus.

# EN

## Opening

Prometheus has no tables: it has series, each a metric name plus a set of labels. This lesson selects series with PromQL on a simulation that runs right in your browser, reading from the lab's `samples` table. The equivalent SQL comes along so you can see what PromQL is doing.

## Key idea

A **selector** is a metric name with **label matchers** in braces: `=` equal, `!=` not equal, `=~` matches a regex, `!~` does not match a regex. According to the Prometheus docs, regexes use RE2 syntax and are always **fully anchored**: `=~"/tr"` means `^/tr$`. A selector must have a metric name or at least one matcher that does not match the empty string, so `{route=~".*"}` is refused.

An **instant vector** gives each series one sample: the newest at or before the evaluation time, within the default 5-minute lookback. A **range vector** adds `[1m]` and gives every sample in a window that is left-open and right-closed. Here BoonData evaluates PromQL itself with a small simulation (simulated, not Prometheus): the virtual clock stands at the newest sample, 10:00:00, and data is scraped every 15 seconds. The result is a `series`, `value` table (a range vector adds `time`). The figure at the end of this section puts PromQL beside SQL.

## Syntax

```promql
http_requests_total{route="/track"}
http_requests_total{code=~"5.."}
http_requests_total{code!="200"}[1m]
```

- The simulation: selectors, `= != =~ !~`, `[5m]`, and in the next lessons `rate`, `increase`, `sum by`, `avg by`, `histogram_quantile`.
- Regexes are anchored at both ends; on its own a regex may not match everything including the empty string.
- Virtual clock: 10:00:00, a scrape every 15 seconds, a 5-minute lookback.

## Example

The SQL of the instant vector `http_requests_total{route="/track"}`: each series' sample at 10:00.

```sql
SELECT labels, value
FROM samples
WHERE labels->>'route' = '/track'
  AND ts = '2026-10-31 10:00'
ORDER BY labels->>'code';
```

The SQL of the range vector `[1m]`: the samples in (09:59:00, 10:00:00].

```sql
SELECT ts, value
FROM samples
WHERE labels->>'route' = '/book'
  AND labels->>'code' = '200'
  AND ts > '2026-10-31 09:59'
  AND ts <= '2026-10-31 10:00'
ORDER BY ts;
```

The same two queries in PromQL (shown only; press Run in the lab steps to run them).

```promql
http_requests_total{route="/track"}
```

```promql
http_requests_total{
  route="/book", code="200"}[1m]
```

## Common mistakes

A regex anchored where we did not expect: `/tr` does not match `/track`.

```promql
# WRONG: anchored, matches only "/tr"
http_requests_total{route=~"/tr"}
```

```promql
# FIX: allow the rest of the path
http_requests_total{route=~"/tr.*"}
```

A nameless selector with a regex that matches the empty string: Prometheus refuses it.

```promql
# ERROR promql: matches the empty string
{route=~".*"}
```

## Practice

Four PromQL steps on the simulation: the `/track` series, the error series of two routes with one regex, the series whose code is not 200, then the 1-minute range vector of `/book`.

## Recap

- A series = metric name + labels; a selector picks series with `=`, `!=`, `=~`, `!~`.
- PromQL regexes are anchored at both ends (RE2).
- Instant vector: the newest sample within the 5-minute lookback; range vector `[1m]`: every sample in a left-open window.
- BoonData's simulation is not Prometheus; it follows the rules of the Prometheus docs.
