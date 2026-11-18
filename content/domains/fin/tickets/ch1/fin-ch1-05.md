---
id: fin-ch1-05
chapter: 1
title: "Đánh giá thử việc: bức tranh sổ vay"
title_en: "Probation review: the loan book at a glance"
from: { name: Lương Bảo Châu, dept: Management }
difficulty: 2
beat: boss
requires: [select, where, order_by, limit, aggregate, group_by]
grants: []
tables: [applications, loans]
ordered: true
columns:
  - [{ vi: "Mã hồ sơ", en: "Application number" }, { vi: "Điểm tín dụng", en: "Credit score" }, { vi: "Số tiền xin vay", en: "Amount requested" }]
  - [{ vi: "Mã chi nhánh", en: "Branch number" }, { vi: "Số khoản đang trả", en: "Loans being repaid" }, { vi: "Tổng tiền gốc", en: "Total principal" }]
  - [{ vi: "Mã sản phẩm", en: "Product number" }, { vi: "Tiền gốc trung bình (đồng)", en: "Average principal (VND)" }]
conclusion:
  question: "Theo bước 3, sản phẩm nào có khoản vay trung bình lớn nhất trong các khoản giải ngân năm 2026?"
  options:
    - "Trả góp xe máy (mã sản phẩm 3)"
    - "Vay tiền mặt (mã sản phẩm 1)"
    - "Trả góp điện thoại (mã sản phẩm 2)"
  answer: 0
conclusion_en:
  question: "According to step 3, which product has the largest average loan among the loans paid out in 2026?"
  options:
    - "Motorbike instalment loans (product number 3)"
    - "Cash loans (product number 1)"
    - "Phone instalment loans (product number 2)"
---
Chào bạn, mình là Châu, tổng giám đốc. Hết tuần đầu rồi, đây là buổi đánh giá thử việc của bạn. Mình cần ba bảng số để nắm sổ vay trước cuộc họp với hội đồng tín dụng. Làm đúng cả ba là bạn qua thử việc.

## Step 1: Hồ sơ điểm cao mà bị từ chối
Năm hồ sơ có điểm tín dụng cao nhất bị từ chối trong tháng 10/2026: mã hồ sơ, điểm tín dụng, số tiền xin vay. Điểm cao nhất lên đầu; bằng điểm thì mã hồ sơ nhỏ hơn lên trước.
```sql
SELECT id, score, amount
FROM applications
WHERE decision = 'rejected' AND applied_on >= '2026-10-01' AND applied_on < '2026-11-01'
ORDER BY score DESC, id
LIMIT 5
```

## Step 2: Khoản đang trả ở từng chi nhánh
Mỗi chi nhánh: mã chi nhánh, số khoản vay còn đang trả và tổng tiền gốc của các khoản đó. Xếp theo mã chi nhánh.
```sql
SELECT branch_id, count(*), sum(principal)
FROM loans
WHERE status = 'active'
GROUP BY branch_id
ORDER BY branch_id
```

## Step 3: Khoản vay trung bình theo sản phẩm
Các khoản giải ngân trong năm 2026, theo từng sản phẩm: mã sản phẩm và tiền gốc trung bình một khoản, làm tròn tới đồng. Xếp theo mã sản phẩm.
```sql
SELECT product_id, round(avg(principal))
FROM loans
WHERE disbursed_on >= '2026-01-01' AND disbursed_on < '2027-01-01'
GROUP BY product_id
ORDER BY product_id
```

## Hints
1. Bước 1 lọc hồ sơ rồi xếp hạng và lấy năm dòng đầu. Bước 2 và 3 gom nhóm: bước 2 theo chi nhánh, chỉ khoản đang trả; bước 3 theo sản phẩm, tính trung bình.
2. Bước 1: bảng `applications`, `decision = 'rejected'`, `ORDER BY score DESC, id LIMIT 5`. Bước 2: bảng `loans`, `status = 'active'`, `GROUP BY branch_id`. Bước 3: `round(avg(principal))`, `GROUP BY product_id`.
3. `SELECT product_id, round(avg(principal)) FROM loans WHERE ... GROUP BY product_id ORDER BY product_id`

# EN
Hello, I am Chau, the CEO. Your first week is over, so this is your probation review. I need three tables to get a grip on the loan book before the credit committee meets. Get all three right and you pass your probation.

## Step 1: High-score applications that were rejected
The five applications with the highest credit score that were rejected in October 2026: application number, credit score, amount requested. Highest score first; on the same score, the smaller application number first.

## Step 2: Loans being repaid at each branch
For each branch: branch number, how many loans are still being repaid and their total principal. Sort by branch number.

## Step 3: Average loan per product
The loans paid out in 2026, per product: product number and the average principal per loan, rounded to the dong. Sort by product number.

## Hints
1. Step 1 filters applications, then ranks them and takes the first five. Steps 2 and 3 group rows: step 2 by branch, loans being repaid only; step 3 by product, with an average.
2. Step 1: table `applications`, `decision = 'rejected'`, `ORDER BY score DESC, id LIMIT 5`. Step 2: table `loans`, `status = 'active'`, `GROUP BY branch_id`. Step 3: `round(avg(principal))`, `GROUP BY product_id`.
3. `SELECT product_id, round(avg(principal)) FROM loans WHERE ... GROUP BY product_id ORDER BY product_id`
