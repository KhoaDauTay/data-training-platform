---
id: e-tm-l2-05
engine: telemetry
level: L2
module: query
title: "SLO và ngân sách lỗi bằng SQL"
title_en: "SLOs and error budgets in SQL"
kind: lab
runtime: browser
minutes: 30
figures: [{ name: tm-error-budget, at: idea }]
objectives:
  - vi: Phân biệt SLI (con số đo), SLO (mục tiêu trong một khoảng thời gian) và ngân sách lỗi.
    en: Tell an SLI (the measured number) from an SLO (a target over a time window) and the error budget.
  - vi: Tính SLI, ngân sách lỗi đã dùng và còn lại bằng SQL.
    en: Compute the SLI and the error budget used and left with SQL.
  - vi: Tính tốc độ đốt ngân sách (burn rate) của một ngày.
    en: Compute one day's error budget burn rate.
requires: [e-tm-l1-02]
sources:
  - { url: "https://grafana.com/docs/grafana-cloud/alerting-and-irm/slo/introduction/", title: "Grafana: Introduction to Grafana SLO" }
  - { url: "https://prometheus.io/docs/practices/histograms/", title: "Prometheus: Histograms (share of requests within a target)" }
lab:
  setup: |
    CREATE TABLE requests_daily (
      day date, route text,
      total int, errors int
    );
    INSERT INTO requests_daily
    SELECT date '2026-10-21' + i::int, '/track',
      10000, e
    FROM unnest(ARRAY[20, 30, 25, 10, 40, 35, 20,
      15, 30, 120]) WITH ORDINALITY AS t(e, i);
  steps:
    - task:
        vi: "SLI mỗi ngày: phần trăm request thành công (không lỗi). Trả `day`, `sli_pct`."
        en: "The daily SLI: the percentage of successful (non-error) requests. Return `day`, `sli_pct`."
      solution: |
        SELECT day, 100 * (1 - errors::numeric
          / total) AS sli_pct
        FROM requests_daily
      check: rows
      hint:
        vi: "`100 * (1 - errors::numeric / total)`; ép `::numeric` để không chia nguyên."
        en: "`100 * (1 - errors::numeric / total)`; cast `::numeric` to avoid integer division."
    - task:
        vi: "SLI của cả 10 ngày (mọi request gộp lại), theo phần trăm. Trả `sli_pct`."
        en: "The SLI over all 10 days (every request together), as a percentage. Return `sli_pct`."
      solution: |
        SELECT 100 * (1 - sum(errors)::numeric
          / sum(total)) AS sli_pct
        FROM requests_daily
      check: rows
      hint:
        vi: "Gộp trước rồi chia: `100 * (1 - sum(errors)::numeric / sum(total))`, không lấy trung bình các SLI ngày."
        en: "Sum first, then divide: `100 * (1 - sum(errors)::numeric / sum(total))`, not the average of the daily SLIs."
    - task:
        vi: "SLO là 99,5% request thành công trong 10 ngày. Ngân sách lỗi = 0,5% tổng request. Trả `budget` (số lỗi được phép), `used` (số lỗi thật), `left_share` (phần ngân sách còn lại, 0 tới 1)."
        en: "The SLO is 99.5% successful requests over the 10 days. The error budget = 0.5% of all requests. Return `budget` (errors allowed), `used` (actual errors), `left_share` (the share of the budget left, 0 to 1)."
      solution: |
        SELECT 0.005 * sum(total) AS budget,
          sum(errors) AS used,
          1 - sum(errors) / (0.005 * sum(total))
            AS left_share
        FROM requests_daily
      check: rows
      hint:
        vi: "`budget` = `0.005 * sum(total)`, `used` = `sum(errors)`, `left_share` = `1 - used / budget`."
        en: "`budget` = `0.005 * sum(total)`, `used` = `sum(errors)`, `left_share` = `1 - used / budget`."
    - task:
        vi: "Burn rate của ngày cuối (2026-10-31) = tỉ lệ lỗi của ngày đó chia tỉ lệ lỗi cho phép (0,005). Trả `burn_rate`."
        en: "The burn rate of the last day (2026-10-31) = that day's error rate divided by the allowed error rate (0.005). Return `burn_rate`."
      solution: |
        SELECT errors::numeric / total / 0.005
          AS burn_rate
        FROM requests_daily
        WHERE day = '2026-10-31'
      check: rows
      hint:
        vi: "`errors::numeric / total / 0.005` trên dòng `day = '2026-10-31'`."
        en: "`errors::numeric / total / 0.005` on the row `day = '2026-10-31'`."
quiz:
  - q:
      vi: "Ngày 31 có burn rate 2,4. Điều đó nghĩa là gì?"
      en: "October 31 has a burn rate of 2.4. What does that mean?"
    options:
      - { vi: "Đã dùng 2,4% ngân sách lỗi", en: "2.4% of the error budget is used" }
      - { vi: "Đốt ngân sách nhanh gấp 2,4 lần mức cho phép", en: "Burning the budget 2.4 times too fast" }
      - { vi: "SLO đã thủng từ trước ngày đó", en: "The SLO broke before that day" }
    answer: 1
    trap: 0
    why:
      vi: "2,4 dễ đọc thành phần trăm, nhưng burn rate là tốc độ: tài liệu Grafana định nghĩa burn rate 1 là dùng hết ngân sách đúng lúc hết khoảng SLO, trên 1 là hết sớm hơn. Ngày 31 có 120 lỗi trên 10.000 request = 1,2%, gấp 1,2 / 0,5 = 2,4 lần tỉ lệ cho phép; giữ tốc độ đó cả 10 ngày thì ngân sách hết sau khoảng 10 / 2,4 ≈ 4,2 ngày. SLO chưa thủng: tới ngày 31 vẫn còn 31% ngân sách."
      en: "2.4 is easy to read as a percentage, but a burn rate is a speed: the Grafana docs define a burn rate of 1 as using up the budget exactly at the end of the SLO window, and above 1 as running out early. October 31 had 120 errors in 10,000 requests = 1.2%, which is 1.2 / 0.5 = 2.4 times the allowed rate; kept up for the whole 10 days, the budget would last about 10 / 2.4 ≈ 4.2 days. The SLO has not broken: 31% of the budget is still left on the 31st."
  - q:
      vi: "SLO 99,5% trên 100.000 request. Ngân sách lỗi là bao nhiêu request?"
      en: "An SLO of 99.5% over 100,000 requests. How many requests is the error budget?"
    options:
      - { vi: "99.500 request", en: "99,500 requests" }
      - { vi: "500 request", en: "500 requests" }
      - { vi: "5.000 request", en: "5,000 requests" }
    answer: 1
    why:
      vi: "Ngân sách lỗi là phần thất bại SLO cho phép: 100% - 99,5% = 0,5%, và 0,5% của 100.000 là 500 request. 99.500 là số request phải thành công, không phải ngân sách. 5.000 là 5%, sai một chữ số thập phân."
      en: "The error budget is the failure the SLO allows: 100% - 99.5% = 0.5%, and 0.5% of 100,000 is 500 requests. 99,500 is how many requests must succeed, not the budget. 5,000 is 5%, off by one decimal place."
---
## Mở bài

Cargo Query hứa với khách: 99,5% request tra cứu container thành công trong mỗi khoảng 10 ngày. Ngày 31 tháng 10 có 120 lỗi, gấp mấy lần ngày thường. Bài này tính bằng SQL còn bao nhiêu "quyền được lỗi" và đang tiêu nó nhanh tới đâu.

## Ý chính

Theo tài liệu Grafana SLO: **SLI** (chỉ số mức dịch vụ) là con số đo dịch vụ chạy tốt thế nào, ở đây là tỉ lệ request thành công. **SLO** đặt mục tiêu cho SLI với hai thông số: mức mục tiêu (99,5%) và khoảng thời gian (10 ngày). **Ngân sách lỗi** (error budget) suy ra từ mục tiêu: phần thất bại SLO cho phép, 0,5% số request. Trên 100.000 request, đó là 500 lỗi.

**Burn rate** đo tốc độ tiêu ngân sách: tỉ lệ lỗi hiện tại chia tỉ lệ lỗi cho phép. Burn rate 1 là tiêu hết đúng lúc hết khoảng thời gian; trên 1 là hết sớm. Hai điều cần nhớ khi tính bằng SQL: gộp số request rồi mới chia (không lấy trung bình SLI của các ngày, vì các ngày có thể khác lượng request), và ép kiểu để không chia nguyên. Prometheus tính SLI kiểu "xong trong 300 ms" bằng ngăn histogram, như bài phân vị. Hình cuối mục cho thấy ngân sách bị tiêu theo ngày.

## Cú pháp

```sql
-- SLI and budget left, SLO 99.5%
SELECT 1 - sum(errors)::numeric
    / sum(total) AS sli,
  1 - sum(errors)
    / (0.005 * sum(total)) AS left_share
FROM requests_daily;
```

- SLI = thành công / tổng; ngân sách = (1 - mục tiêu) × tổng.
- Phần ngân sách còn = 1 - lỗi thật / ngân sách.
- Burn rate = tỉ lệ lỗi / (1 - mục tiêu).

## Ví dụ

Lỗi mỗi ngày: ngày cuối vọt lên.

```sql
SELECT day, errors
FROM requests_daily
ORDER BY day;
```

Ngân sách đã dùng cộng dồn theo ngày.

```sql
SELECT day, sum(errors) OVER (
    ORDER BY day) AS used_so_far
FROM requests_daily
ORDER BY day;
```

## Lỗi hay gặp

Chia hai số nguyên: PostgreSQL bỏ phần lẻ, SLI ra 1.

```sql
-- WRONG: integer division
SELECT day, 1 - errors / total AS sli
FROM requests_daily
ORDER BY day;
```

```sql
-- FIX: cast before dividing
SELECT day,
  1 - errors::numeric / total AS sli
FROM requests_daily
ORDER BY day;
```

Lấy tỉ lệ lỗi chia cho mục tiêu 99,5% thay vì cho 0,5%.

```sql
-- WRONG: divides by the target
SELECT errors::numeric / total / 0.995
  AS burn_rate
FROM requests_daily
WHERE day = '2026-10-31';
```

```sql
-- FIX: divide by the allowed error rate
SELECT errors::numeric / total / 0.005
  AS burn_rate
FROM requests_daily
WHERE day = '2026-10-31';
```

## Thực hành

Bốn bước: SLI từng ngày, SLI của cả 10 ngày, ngân sách lỗi được phép, đã dùng và phần còn lại, rồi burn rate của ngày 31.

## Tóm tắt

- SLI là con số đo; SLO là mục tiêu cho SLI trong một khoảng thời gian.
- Ngân sách lỗi = (1 - mục tiêu) × tổng request.
- Burn rate = tỉ lệ lỗi / tỉ lệ lỗi cho phép; trên 1 là hết ngân sách trước hạn.
- Gộp rồi mới chia, và ép kiểu để không chia nguyên.

# EN

## Opening

Cargo Query promises its customers that 99.5% of container lookups succeed in every 10-day window. October 31 had 120 errors, several times a normal day. This lesson computes with SQL how much "right to fail" is left and how fast it is being spent.

## Key idea

Following the Grafana SLO docs: an **SLI** (service level indicator) is a number that measures how well the service performs, here the share of successful requests. An **SLO** sets a goal for the SLI with two settings: the target (99.5%) and the time window (10 days). The **error budget** derives from the target: the failure the SLO allows, 0.5% of requests. Over 100,000 requests, that is 500 errors.

The **burn rate** measures how fast the budget is spent: the current error rate divided by the allowed error rate. A burn rate of 1 spends the budget exactly at the end of the window; above 1 runs out early. Two things to remember in SQL: add the requests up before dividing (do not average the daily SLIs, since days can carry different traffic), and cast to avoid integer division. Prometheus computes an SLI such as "done within 300 ms" from histogram buckets, as in the percentiles lesson. The figure at the end of this section shows the budget being spent day by day.

## Syntax

```sql
-- SLI and budget left, SLO 99.5%
SELECT 1 - sum(errors)::numeric
    / sum(total) AS sli,
  1 - sum(errors)
    / (0.005 * sum(total)) AS left_share
FROM requests_daily;
```

- SLI = successes / total; budget = (1 - target) × total.
- Budget left = 1 - actual errors / budget.
- Burn rate = error rate / (1 - target).

## Example

Errors per day: the last day jumps.

```sql
SELECT day, errors
FROM requests_daily
ORDER BY day;
```

The budget used, cumulative by day.

```sql
SELECT day, sum(errors) OVER (
    ORDER BY day) AS used_so_far
FROM requests_daily
ORDER BY day;
```

## Common mistakes

Dividing two integers: PostgreSQL drops the fraction and the SLI comes out as 1.

```sql
-- WRONG: integer division
SELECT day, 1 - errors / total AS sli
FROM requests_daily
ORDER BY day;
```

```sql
-- FIX: cast before dividing
SELECT day,
  1 - errors::numeric / total AS sli
FROM requests_daily
ORDER BY day;
```

Dividing the error rate by the 99.5% target instead of by 0.5%.

```sql
-- WRONG: divides by the target
SELECT errors::numeric / total / 0.995
  AS burn_rate
FROM requests_daily
WHERE day = '2026-10-31';
```

```sql
-- FIX: divide by the allowed error rate
SELECT errors::numeric / total / 0.005
  AS burn_rate
FROM requests_daily
WHERE day = '2026-10-31';
```

## Practice

Four steps: the daily SLI, the SLI over all 10 days, the error budget allowed, used and left, then the burn rate of October 31.

## Recap

- The SLI is the measured number; the SLO is the SLI's target over a time window.
- Error budget = (1 - target) × total requests.
- Burn rate = error rate / allowed error rate; above 1 runs out of budget early.
- Add up before dividing, and cast to avoid integer division.
