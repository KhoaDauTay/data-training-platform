-- Tín dụng Hũ Bạc (Silver Jar Credit) seed, schema `finance` (Plan 11). Deterministic: every random block starts with
-- its own setseed(), so a block appended later never re-rolls an earlier one. Append new blocks at the END.
-- Game "today" = 2026-10-31 (same as the other domains). Solutions use literal dates, never CURRENT_DATE/now().
-- Deliberate simplifications: an instalment is paid in full once or not at all (no partial or early payment, so
-- repayments.schedule_id is UNIQUE); flat interest (interest_due = principal x monthly rate, principal_due =
-- principal / term rounded to 1,000 VND, the last instalment takes the remainder); a loan that stops paying never
-- resumes and is written off 181 days after its oldest unpaid due date; loans are disbursed on the application day.
-- Story hooks (tickets and tests/finSeed.test.ts depend on them):
--   H1 Quang Ngai (branch 7, region south): loans disbursed 2026-03..05 through the partner channel with a score
--      under 700 default 55% of the time, from instalment 3 on (so not before their month-3 snapshot), and the
--      branch's share of outstanding with dpd > 30 climbs from 4.2% (June) to 14.2% (October 2026)
--   H2 Tet cohorts: loans disbursed in 2026-01 and 2026-02 default 2.5 times as often, at instalment 1 or 2
--   H3 Hoi An (branch 3): Marketing in Q3 2026 is 60% over budget; every other expense line is within +-6% a month;
--      Other Opex is small
--   H4 applications scoring < 520 are rejected; base default odds x3.0 / x1.5 / x0.8 for scores < 600 / 600-699 / >= 700
--   H5 no applications (so no disbursals) on Sundays or during the Tet break 2026-02-14..2026-02-22
--   H6 ~18% of customers did not declare a monthly income (NULL)
--   H7 collection calls skip some overdue loans; in October 2026 Quang Ngai skips more than half of them
--   H8 IT is budgeted monthly but billed once a quarter (no IT actual in the first two months of a quarter);
--      Other Opex has actuals but no budget
--   H9 auto_debit is almost never late; cash is late most often and longest
--   H10 written_off loans have no snapshot from their write-off date on
--   H11 Motorbike Instalment has the largest average and median principal, Salary Advance the smallest

INSERT INTO branches VALUES
  (1, 'Da Nang', 'Da Nang', 'central', '2024-06-03'),
  (2, 'Dong Ha', 'Dong Ha', 'north', '2024-06-10'),
  (3, 'Hoi An', 'Hoi An', 'central', '2024-06-10'),
  (4, 'Tam Ky', 'Tam Ky', 'central', '2024-06-17'),
  (5, 'Hue', 'Hue', 'north', '2024-06-03'),
  (6, 'Lien Chieu', 'Da Nang', 'north', '2024-06-24'),
  (7, 'Quang Ngai', 'Quang Ngai', 'south', '2024-06-24'),
  (8, 'Quy Nhon', 'Quy Nhon', 'south', '2024-07-01');

INSERT INTO products VALUES
  (1, 'CASH', 'Cash Loan', 'cash', 2.50, 6, 12),
  (2, 'PHONE', 'Phone Instalment', 'instalment', 1.80, 6, 12),
  (3, 'MOTO', 'Motorbike Instalment', 'instalment', 1.50, 12, 24),
  (4, 'APPL', 'Appliance Instalment', 'instalment', 1.70, 6, 12),
  (5, 'SALARY', 'Salary Advance', 'cash', 3.00, 1, 3);

INSERT INTO accounts VALUES
  (1, 'INT', 'Interest Income', 'income'),
  (2, 'FEE', 'Fee Income', 'income'),
  (3, 'STAFF', 'Staff Cost', 'expense'),
  (4, 'RENT', 'Rent', 'expense'),
  (5, 'MKT', 'Marketing', 'expense'),
  (6, 'IT', 'IT', 'expense'),
  (7, 'COLL', 'Collection Cost', 'expense'),
  (8, 'PROV', 'Credit Loss Provision', 'expense'),
  (9, 'OTHER', 'Other Opex', 'expense');

SELECT setseed(0.11);
-- 3,200 customers joining 2024-06-01 .. 2026-10-30 at a steady pace (id order = join order).
INSERT INTO customers (id, full_name, birth_year, city, monthly_income, joined_on, home_branch_id)
SELECT i, x.full_name, x.birth_year, b.city, x.income, DATE '2024-06-01' + (881 * (i - 1)) / 3199, b.id
FROM (
  SELECT i,
    (ARRAY['Nguyễn','Trần','Lê','Phạm','Hoàng','Huỳnh','Phan','Võ','Đặng','Bùi','Đỗ','Hồ','Ngô','Dương','Trương','Đoàn'])[1 + floor(random() * 16)::int] || ' ' ||
    (ARRAY['Văn','Thị','Minh','Ngọc','Thanh','Quốc','Hữu','Kim'])[1 + floor(random() * 8)::int] || ' ' ||
    (ARRAY['An','Bình','Châu','Dũng','Giang','Hà','Hải','Hằng','Hiếu','Hoa','Hùng','Khánh','Lan','Linh','Lộc','Mai','Nam',
           'Nga','Nhân','Phúc','Phương','Quang','Sang','Tâm','Thảo','Thắng','Trinh','Tuấn','Uyên','Yến'])[1 + floor(random() * 30)::int] AS full_name,
    1966 + floor(random() * 39)::int AS birth_year,
    CASE WHEN random() < 0.18 THEN NULL ELSE 500000 * (12 + floor(random() * 49)::int) END AS income,
    (ARRAY[1,1,1,1,2,2,3,3,3,4,4,5,5,5,6,6,7,7,7,8,8])[1 + floor(random() * 21)::int] AS branch
  FROM generate_series(1, 3200) i
) x JOIN branches b ON b.id = x.branch
ORDER BY i;

SELECT setseed(0.22);
-- Application candidates: dates grow over time (sqrt), Sundays and the Tet break dropped, first 5,500 kept.
-- Every random draw the later blocks need per application/loan is taken here, in one pass.
CREATE TEMP TABLE _c AS
SELECT g, DATE '2024-07-01' + floor(851 * sqrt(random()))::int AS d,
  random() AS r_cust, random() AS r_away, random() AS r_branch, random() AS r_ch, random() AS r_prod, random() AS r_term,
  random() AS r_amt, sqrt(-2 * ln(1 - random())) * cos(2 * pi() * random()) AS z, random() AS r_dec,
  random() AS r_bad, random() AS r_k, random() AS r_method
FROM generate_series(1, 7000) g;

CREATE TEMP TABLE _a AS
SELECT row_number() OVER (ORDER BY d, g)::int AS id, *
FROM (
  SELECT * FROM _c
  WHERE extract(isodow FROM d) <> 7 AND d NOT BETWEEN DATE '2026-02-14' AND DATE '2026-02-22'
  ORDER BY g LIMIT 5500
) k;

-- Customer: one who had joined by that day, recent joiners more likely. Branch: the home branch 90% of the time.
CREATE TEMP TABLE _a2 AS
WITH base AS (
  SELECT a.*, floor(3200 * (a.d - DATE '2024-06-01') / 881.0)::int AS cnt FROM _a a
)
SELECT b.id, b.d, b.r_ch, b.r_prod, b.r_term, b.r_amt, b.r_dec, b.r_bad, b.r_k, b.r_method,
  c.id AS customer_id,
  CASE WHEN b.r_away < 0.9 THEN c.home_branch_id ELSE 1 + floor(b.r_branch * 8)::int END AS branch_id,
  least(850, greatest(300, round(615 + 85 * b.z)))::int AS score
FROM base b
JOIN customers c ON c.id = least(3200, greatest(1, b.cnt - floor(b.cnt * b.r_cust * b.r_cust)::int));

-- Channel (H1: Quang Ngai pushes the partner channel in 2026-03..05), product by channel, term and amount by product.
CREATE TEMP TABLE _a3 AS
SELECT *,
  CASE prod WHEN 1 THEN (ARRAY[6,9,12])[1 + floor(r_term * 3)::int]
            WHEN 2 THEN (ARRAY[6,9,12])[1 + floor(r_term * 3)::int]
            WHEN 3 THEN (ARRAY[12,18,24])[1 + floor(r_term * 3)::int]
            WHEN 4 THEN (ARRAY[6,9,12])[1 + floor(r_term * 3)::int]
            ELSE (ARRAY[1,2,3])[1 + floor(r_term * 3)::int] END AS term,
  CASE prod WHEN 1 THEN 1000000 * (10 + floor(r_amt * 41)::int)
            WHEN 2 THEN 500000 * (10 + floor(r_amt * 41)::int)
            WHEN 3 THEN 1000000 * (20 + floor(r_amt * 41)::int)
            WHEN 4 THEN 500000 * (8 + floor(r_amt * 33)::int)
            ELSE 500000 * (4 + floor(r_amt * 13)::int) END AS amount,
  CASE WHEN score < 520 THEN 'rejected'
       WHEN r_dec < CASE WHEN score < 600 THEN 0.60 ELSE 0.70 END THEN 'approved'
       WHEN r_dec < CASE WHEN score < 600 THEN 0.66 ELSE 0.76 END THEN 'cancelled'
       ELSE 'rejected' END AS decision
FROM (
  SELECT *,
    CASE WHEN ch = 'branch' THEN CASE WHEN r_prod < 0.35 THEN 1 WHEN r_prod < 0.50 THEN 2 WHEN r_prod < 0.70 THEN 3 WHEN r_prod < 0.85 THEN 4 ELSE 5 END
         WHEN ch = 'app' THEN CASE WHEN r_prod < 0.55 THEN 1 WHEN r_prod < 0.65 THEN 2 WHEN r_prod < 0.70 THEN 4 ELSE 5 END
         ELSE CASE WHEN r_prod < 0.45 THEN 2 WHEN r_prod < 0.75 THEN 3 ELSE 4 END END AS prod
  FROM (
    SELECT *,
      CASE WHEN branch_id = 7 AND d BETWEEN DATE '2026-03-01' AND DATE '2026-05-31'
           THEN CASE WHEN r_ch < 0.20 THEN 'branch' WHEN r_ch < 0.30 THEN 'app' ELSE 'partner' END
           ELSE CASE WHEN r_ch < 0.45 THEN 'branch' WHEN r_ch < 0.80 THEN 'app' ELSE 'partner' END END AS ch
    FROM _a2
  ) x
) y;

INSERT INTO applications (id, customer_id, product_id, branch_id, applied_on, amount, term_months, score, channel, decision)
SELECT id, customer_id, prod, branch_id, d, amount, term, score, ch, decision FROM _a3 ORDER BY id;

-- Loans: one per approved application, disbursed the same day; id order = disbursal order.
-- Default model (H1, H2, H4): a "bad" loan stops paying from instalment k.
CREATE TEMP TABLE _l AS
SELECT row_number() OVER (ORDER BY a.d, a.id)::int AS id, a.id AS application_id, a.customer_id, a.prod AS product_id,
  a.branch_id, a.d AS disbursed_on, a.amount AS principal, a.term, p.rate_month_pct AS rate,
  (ARRAY['auto_debit','auto_debit','auto_debit','auto_debit','bank_transfer','bank_transfer','bank_transfer','bank_transfer',
         'bank_transfer','bank_transfer','bank_transfer','ewallet','ewallet','ewallet','ewallet','ewallet','cash','cash','cash','cash'])
    [1 + floor(a.r_method * 20)::int] AS method,
  CASE
    WHEN a.branch_id = 7 AND a.ch = 'partner' AND a.d BETWEEN DATE '2026-03-01' AND DATE '2026-05-31' THEN
      CASE WHEN a.score < 700 AND a.r_bad < 0.55 THEN least(a.term, 3 + floor(a.r_k * 3)::int) END
    WHEN a.d BETWEEN DATE '2026-01-01' AND DATE '2026-02-28' THEN
      CASE WHEN a.r_bad < 0.075 * CASE WHEN a.score < 600 THEN 3.0 WHEN a.score < 700 THEN 1.5 ELSE 0.8 END THEN 1 + floor(a.r_k * 2)::int END
    WHEN a.r_bad < 0.03 * CASE WHEN a.score < 600 THEN 3.0 WHEN a.score < 700 THEN 1.5 ELSE 0.8 END THEN
      least(a.term, 1 + floor(a.r_k * a.r_k * a.term)::int)
  END AS k
FROM _a3 a JOIN products p ON p.id = a.prod
WHERE a.decision = 'approved';

SELECT setseed(0.33);
-- Instalments with their lateness draws; paid ones become repayments when paid by 2026-10-31.
CREATE TEMP TABLE _s AS
SELECT row_number() OVER (ORDER BY l.id, n)::int AS id, l.id AS loan_id, n, (l.disbursed_on + n * interval '1 month')::date AS due_on,
  CASE WHEN n < l.term THEN round(l.principal / l.term, -3) ELSE l.principal - (l.term - 1) * round(l.principal / l.term, -3) END AS principal_due,
  round(l.principal * l.rate / 100, -3) AS interest_due,
  l.method, (l.k IS NULL OR n < l.k) AS pays,
  CASE l.method
    WHEN 'auto_debit' THEN CASE WHEN r1 < 0.99 THEN 0 ELSE 1 + floor(r2 * 2)::int END
    WHEN 'bank_transfer' THEN CASE WHEN r1 < 0.72 THEN 0 WHEN r1 < 0.95 THEN 1 + floor(r2 * 5)::int ELSE 6 + floor(r2 * 15)::int END
    WHEN 'ewallet' THEN CASE WHEN r1 < 0.75 THEN 0 WHEN r1 < 0.96 THEN 1 + floor(r2 * 5)::int ELSE 6 + floor(r2 * 10)::int END
    ELSE CASE WHEN r1 < 0.45 THEN 0 WHEN r1 < 0.80 THEN 1 + floor(r2 * 10)::int WHEN r1 < 0.95 THEN 11 + floor(r2 * 20)::int ELSE 31 + floor(r2 * 25)::int END
  END AS late
FROM _l l
CROSS JOIN LATERAL (SELECT n, random() AS r1, random() AS r2 FROM generate_series(1, l.term) n) x;

CREATE TEMP TABLE _st AS
SELECT l.id,
  CASE WHEN l.k IS NOT NULL AND min(s.due_on) FILTER (WHERE NOT s.pays) + 181 <= DATE '2026-10-31' THEN 'written_off'
       WHEN bool_and(s.pays AND s.due_on + s.late <= DATE '2026-10-31') THEN 'closed'
       ELSE 'active' END AS status,
  CASE WHEN l.k IS NOT NULL AND min(s.due_on) FILTER (WHERE NOT s.pays) + 181 <= DATE '2026-10-31' THEN min(s.due_on) FILTER (WHERE NOT s.pays) + 181
       WHEN bool_and(s.pays AND s.due_on + s.late <= DATE '2026-10-31') THEN max(s.due_on + s.late) END AS closed_on
FROM _l l JOIN _s s ON s.loan_id = l.id
GROUP BY l.id, l.k;

INSERT INTO loans (id, code, application_id, customer_id, product_id, branch_id, disbursed_on, principal, term_months, rate_month_pct, status, closed_on)
SELECT l.id, 'L' || lpad(l.id::text, 5, '0'), l.application_id, l.customer_id, l.product_id, l.branch_id, l.disbursed_on,
  l.principal, l.term, l.rate, st.status, st.closed_on
FROM _l l JOIN _st st ON st.id = l.id ORDER BY l.id;

INSERT INTO schedules (id, loan_id, instalment_no, due_on, principal_due, interest_due)
SELECT id, loan_id, n, due_on, principal_due, interest_due FROM _s ORDER BY id;

INSERT INTO repayments (id, schedule_id, loan_id, paid_on, amount, method)
SELECT row_number() OVER (ORDER BY due_on + late, id)::int, id, loan_id, due_on + late, principal_due + interest_due, method
FROM _s WHERE pays AND due_on + late <= DATE '2026-10-31';

-- Month-end snapshots 2025-11-30 .. 2026-10-31 (no random): one row per loan with principal left at that month end.
INSERT INTO loan_snapshots (loan_id, month_end, outstanding, dpd)
SELECT l.id, m.month_end,
  l.principal - coalesce(sum(s.principal_due) FILTER (WHERE r.paid_on <= m.month_end), 0),
  coalesce(m.month_end - min(s.due_on) FILTER (WHERE s.due_on <= m.month_end AND (r.paid_on IS NULL OR r.paid_on > m.month_end)), 0)
FROM (SELECT (g - interval '1 day')::date AS month_end FROM generate_series(DATE '2025-12-01', DATE '2026-11-01', interval '1 month') g) m
JOIN loans l ON l.disbursed_on <= m.month_end AND (l.closed_on IS NULL OR l.closed_on > m.month_end)
JOIN schedules s ON s.loan_id = l.id
LEFT JOIN repayments r ON r.schedule_id = s.id
GROUP BY l.id, m.month_end
ORDER BY 2, 1;

SELECT setseed(0.44);
-- Collection calls: 1-2 calls in a month for a loan overdue >= 5 days at that month end, made after the oldest
-- unpaid due date. Some months are skipped (H7: Quang Ngai in October 2026 skips most).
CREATE TEMP TABLE _k AS
SELECT x.loan_id, x.month_end, x.from_day + floor(c.r * (x.month_end - x.from_day + 1))::int AS called_on, c.n, c.r2
FROM (
  SELECT s.loan_id, s.month_end, greatest(date_trunc('month', s.month_end)::date, s.month_end - s.dpd + 1) AS from_day,
    random() AS r_skip, random() AS r_n, l.branch_id
  FROM loan_snapshots s JOIN loans l ON l.id = s.loan_id
  WHERE s.dpd >= 5
  ORDER BY s.month_end, s.loan_id
) x
CROSS JOIN LATERAL (SELECT n, random() AS r, random() AS r2 FROM generate_series(1, 1 + floor(x.r_n * 2)::int) n) c
WHERE x.r_skip >= CASE WHEN x.month_end = DATE '2026-10-31' AND x.branch_id = 7 THEN 0.6
                       WHEN x.month_end = DATE '2026-10-31' THEN 0.15 ELSE 0.08 END;

INSERT INTO collection_calls (id, loan_id, called_on, outcome)
SELECT row_number() OVER (ORDER BY k.called_on, k.loan_id, k.n)::int, k.loan_id, k.called_on,
  CASE WHEN k.paid THEN CASE WHEN k.r2 < 0.6 THEN 'promise' ELSE 'paid' END
       ELSE CASE WHEN k.r2 < 0.5 THEN 'no_answer' WHEN k.r2 < 0.75 THEN 'refused' ELSE 'promise' END END
FROM (
  SELECT k.loan_id, k.called_on, k.n, k.r2, coalesce(bool_or(r.paid_on BETWEEN k.called_on AND k.called_on + 7), false) AS paid
  FROM _k k LEFT JOIN repayments r ON r.loan_id = k.loan_id
  GROUP BY k.loan_id, k.called_on, k.n, k.r2
) k;

SELECT setseed(0.55);
-- Budgets 2025-01 .. 2026-12 for every branch and account but Other Opex; actual expenses 2025-01 .. 2026-10
-- within +-6% of budget each month (H3: Hoi An Marketing Q3 2026 +60%; H8: IT billed once a quarter).
CREATE TEMP TABLE _b AS
SELECT b.id AS branch_id, a.id AS account_id, m::date AS month,
  round((ARRAY[0, 20000000, 180000000, 45000000, 30000000, 15000000, 12000000, 25000000])[a.id]
        * (ARRAY[1.4, 0.8, 1.0, 0.8, 1.1, 0.9, 1.0, 0.9])[b.id] * (0.97 + 0.06 * random()::numeric), -5) AS amount,
  random()::numeric AS r_act, random() AS r_n
FROM generate_series(DATE '2025-01-01', DATE '2026-12-01', interval '1 month') m
CROSS JOIN branches b CROSS JOIN accounts a
WHERE a.id BETWEEN 1 AND 8
ORDER BY 3, 1, 2;

-- Interest income actuals = the interest part of repayments, per branch and month (matches the loan book).
CREATE TEMP TABLE _int AS
SELECT l.branch_id, date_trunc('month', r.paid_on)::date AS month, sum(s.interest_due) AS amount
FROM repayments r JOIN schedules s ON s.id = r.schedule_id JOIN loans l ON l.id = r.loan_id
WHERE r.paid_on >= DATE '2025-01-01'
GROUP BY 1, 2;

INSERT INTO budgets (branch_id, account_id, month, amount)
SELECT b.branch_id, b.account_id, b.month,
  CASE WHEN b.account_id <> 1 THEN b.amount
       ELSE round(coalesce(i.amount, (SELECT i2.amount FROM _int i2 WHERE i2.branch_id = b.branch_id AND i2.month = DATE '2026-10-01') * 1.03)
                  * (0.92 + 0.16 * b.r_act), -5) END
FROM _b b LEFT JOIN _int i ON i.branch_id = b.branch_id AND i.month = b.month
ORDER BY b.month, b.branch_id, b.account_id;

-- Monthly actual per branch x expense/fee line, then split into 1-4 entries.
CREATE TEMP TABLE _act AS
SELECT b.branch_id, b.account_id, b.month,
  round(CASE WHEN b.account_id = 6 THEN (SELECT sum(b3.amount) FROM _b b3 WHERE b3.branch_id = b.branch_id AND b3.account_id = 6
                                         AND date_trunc('quarter', b3.month) = date_trunc('quarter', b.month))
             ELSE b.amount END
        * CASE WHEN b.branch_id = 3 AND b.account_id = 5 AND b.month BETWEEN DATE '2026-07-01' AND DATE '2026-09-01' THEN 1.60
               WHEN b.account_id IN (3, 4) THEN 0.98 + 0.04 * b.r_act ELSE 0.94 + 0.12 * b.r_act END, -3) AS amount,
  CASE b.account_id WHEN 3 THEN 1 WHEN 4 THEN 1 WHEN 6 THEN 1 WHEN 8 THEN 1 ELSE 2 + floor(b.r_n * 3)::int END AS parts
FROM _b b
WHERE b.month <= DATE '2026-10-01' AND b.account_id >= 2
  AND (b.account_id <> 6 OR extract(month FROM b.month)::int % 3 = 0)
UNION ALL
SELECT b.id, 9, m::date, 1000 * (100 + floor(random() * 800)::int), 1
FROM generate_series(DATE '2025-01-01', DATE '2026-10-01', interval '1 month') m CROSS JOIN branches b;

CREATE TEMP TABLE _e AS
SELECT a.branch_id, a.account_id,
  CASE a.account_id WHEN 3 THEN a.month + 24 WHEN 4 THEN a.month + 4 WHEN 6 THEN a.month + 27
                    WHEN 8 THEN (a.month + interval '1 month' - interval '1 day')::date
                    ELSE a.month + floor(random() * 28)::int END AS posted_on,
  CASE WHEN p < a.parts THEN round(a.amount / a.parts, -3) ELSE a.amount - (a.parts - 1) * round(a.amount / a.parts, -3) END AS amount,
  (ARRAY['Interest collected','Service fees','Payroll','Office rent','Online ads','IT services','Field visits','Provision top-up','Office supplies'])[a.account_id] AS memo,
  p
FROM _act a CROSS JOIN LATERAL generate_series(1, a.parts) p
UNION ALL
SELECT i.branch_id, 1, least((i.month + interval '1 month' - interval '1 day')::date, DATE '2026-10-31'), i.amount, 'Interest collected', 1
FROM _int i;

INSERT INTO gl_entries (id, branch_id, account_id, posted_on, amount, memo)
SELECT row_number() OVER (ORDER BY posted_on, branch_id, account_id, p)::int, branch_id, account_id, posted_on, amount, memo
FROM _e;

DROP TABLE _c, _a, _a2, _a3, _l, _s, _st, _k, _b, _int, _act, _e;
-- Planner statistics for the finance tables only (a bare ANALYZE would also re-read the other schemas).
ANALYZE branches, products, customers, applications, loans, schedules, repayments, loan_snapshots, accounts, budgets, gl_entries, collection_calls;
