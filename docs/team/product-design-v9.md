# Product Design v9: Domain Finance (đề xuất build)

**Trạng thái: ĐÃ DUYỆT (2026-11-19).** User duyệt bằng "Build đi": mọi quyết định ở §9 lấy mặc định in đậm (decision-log L124). Phát hành v14 (Plan 11, T0…T7).

Ngày: 2026-11-18 · Vai trò: Product Designer · **Chỉ đề xuất**: không sửa `src/`, `content/`, test hay `decision-log.md`.
Yêu cầu của user (giữ ý): *"Gọi Agent Product Design ra hoàn thiện nốt Finance. Các UI/UX hiện tại ok."* Vì vậy tài liệu này **không đề xuất kiểu UI mới**. Finance dùng lại đúng khuôn E-commerce (Plan 9) và các thay đổi của v12.0 (màn chọn domain, seed lười theo schema) và v13 (gợi ý → điền khung ở mọi bài; Boon chỉ hướng dẫn trong khu General).

Đầu vào:
- `product-design-v7.md` §3 (phác thảo Finance, D-F1…D-F3) và §8 (lộ trình).
- `product-design-v8.md` (v13, L94–L100).
- Plan 9 (`docs/superpowers/plans/2026-11-17-cargo-query-plan-9-ecom-domain.md`, D9-1…D9-20).
- `decision-log.md` tới L100 (L82: trang General không nhắc domain).
- `problem-design.md` §1 (luật đề), `curriculum.md` §4 (Logistics ch7–9).
- Mã: `src/domains.ts`, `src/content.ts`, `src/save.ts`, `src/progress.ts` (`contentProblems`, `domainSkills`, `REST_RULE_FROM = 4`), `src/starterCards.ts`, `src/art/ecommerce.ts`, `src/ui/ecomArt.ts`, `src/ui/welcome.ts`, `src/route.ts`, `src/ui/stage.ts`, `src/db/lab.ts`, `src/session.ts`, `scripts/check-budget.mjs`, `src/i18n/vi.ts` (khóa `ecom.*`), các chỗ `activeDomain()`.
- Nội dung: `content/domains/ecom/**`, `content/skills.yml`, `content/general/adv.yml`. Test: `tests/ecomContent.test.ts`.

**Mọi con số trong tài liệu này (số dòng, kết quả Solution, đáp án câu kết luận, KB) là mục tiêu thiết kế, chưa đo.** Plan 9 đã chạy thật trên PGlite trước khi viết; v9 thì chưa. Plan 11 Task 0/1 phải đo và sửa lại số trước khi viết ticket.

---

## 0. Tóm tắt một trang

| Chủ đề | Đề xuất v9 | Cỡ |
|---|---|---|
| Công ty | Công ty cho vay tiêu dùng + trả góp hư cấu ở Đà Nẵng, 8 chi nhánh miền Trung. **Đổi tên**: "Lighthouse Finance" trùng nhiều công ty tài chính có thật (§2.1). Mặc định mới: **"Tín dụng Hũ Bạc" / *Silver Jar Credit*** (chưa kiểm thương hiệu đầy đủ). | — |
| Dạy gì | 6 chương × 5 việc = **30 việc** (`fin-chN-0M`). Finance **tự dạy 23 kỹ năng** có sẵn trong `skills.yml` theo thang riêng. v7 muốn "không dạy lại kỹ năng nền", nhưng `contentProblems` bắt mọi `requires` phải được dạy trước trong cùng domain, và màn chọn domain cho người mới vào thẳng Finance. Chương 1 vì vậy gọn: một chương dạy 6 kỹ năng. Có 3 kỹ năng E-com không dạy: `full_join`, `scalar_subquery`, `multi_cte`. Bốn bài nâng cao General được **áp dụng** qua trường mới `adv:`: A2 (phân vị), A3 (trục ngày), A4 (ROLLUP), B2 (cohort). | L |
| Dữ liệu | Schema `finance`, **12 bảng, ~88k dòng (mục tiêu)**. Có bảng ảnh chụp cuối tháng `loan_snapshots` (DPD và dư nợ của từng khoản), để chương 3–6 không phải tự tính quá hạn từ lịch trả. Seed tất định theo luật Plan 9 (file riêng, `setseed()` từng khối, md5 ghim). Luật dừng: 2,0 s Node. | M |
| UI | Không thêm kiểu UI mới: Tổng quan/Làm việc/Dữ liệu/Bảng điều hành/Bản đồ như E-com. Có ba thứ mới nhỏ: chip **"Dựa vào"** (link sang bài nâng cao, chỉ chiều domain → General); cảnh **hũ bạc** đầy dần theo số việc xong; **bản đồ chi nhánh** mở thêm một chi nhánh sau mỗi đánh giá thăng tiến. Hoàn thành việc giống E-com: `celebrate()` + một câu đọc to, không hoạt cảnh mới. | M |
| Hạ tầng | Save **v5** (`byDomain.finance`, `FIN_ID`). Chunk lười mới `finSources` (50 KB), `finSeed` (10 KB), `finance` art (10 KB). Gỡ trang "Sắp có" (route `soon`, khóa `soon.*`, `financeSoon()`). Main ước **+1,4–1,8 KB** (287,7 → ~289,1–289,5/290): sát trần, có phương án dự phòng (§6.5). | M |
| Build | 8 task (T0…T7), mốc **M1** chơi được trọn sau T5, **M2** có cảnh sau T6. ~8–10 ngày agent + 1 ngày review. | L |

---

## 1. Phạm vi: Finance dạy gì, khác gì Logistics và E-com

### 1.1 Nghiệp vụ

Người chơi là chuyên viên phân tích mới ở phòng Quản trị rủi ro của một công ty tài chính tiêu dùng. Bạn trả lời những câu một công ty cho vay hỏi mỗi tháng:

1. **Sổ vay hôm nay**: hồ sơ, khoản giải ngân, dư nợ theo sản phẩm và chi nhánh.
2. **Lịch trả nợ vs tiền về**: kỳ đến hạn, kỳ đã trả, trả trễ bao nhiêu ngày, kỳ chưa thu.
3. **Quá hạn**: nhóm nợ theo số ngày quá hạn (DPD, *days past due*), tỷ lệ nợ xấu theo chi nhánh và theo dải điểm tín dụng.
4. **Cohort giải ngân (vintage)**: khoản giải ngân cùng tháng xấu đi thế nào theo thời gian; tỷ lệ chuyển nhóm (roll rate).
5. **Ngân sách vs thực tế**: chi phí theo khoản mục và chi nhánh, lũy kế từ đầu năm, tổng phụ theo vùng.
6. **Báo cáo rủi ro quý** cho ban điều hành: xếp hạng chi nhánh, hiệu quả gọi nhắc nợ, khoản quá hạn chưa ai gọi, trung vị khoản vay.

### 1.2 Khác Logistics chương 7–9 và E-com

| | Logistics ch7–9 | E-com | **Finance** |
|---|---|---|---|
| Đối tượng tiền | Công nợ của một công ty giao nhận: hóa đơn, thu, chi nhà cung cấp, tỷ giá, biên lãi | Doanh thu bán lẻ, tiền thu theo đơn | **Danh mục cho vay**: gốc, lãi, kỳ trả, quá hạn |
| Thời gian | Hạn thanh toán, tỷ giá theo ngày | Ngày giao, theo tuần/tháng | **Tuổi khoản vay** (tháng thứ N sau giải ngân), ảnh chụp cuối tháng |
| Mẫu phân tích chính | Đối chiếu, chuyển đổi tiền | Phễu, giữ chân khách | **Nhóm DPD, vintage, roll rate, ngân sách vs thực tế** |
| Tiền tệ | VND + USD/EUR | VND | **Chỉ VND** (không lặp bài tỷ giá) |
| Kỹ năng riêng | truy vấn con, CTE, `multi_cte`… | `having`, `window_rank`… | `full_join` (ngân sách vs thực tế), `scalar_subquery`, `multi_cte`; **áp dụng** A2/A3/A4/B2 |

### 1.3 Thang kỹ năng (giải quyết mâu thuẫn với v7 §3.1)

v7 nói chương 1 Finance "`requires` kỹ năng General/Logistics". Làm vậy thì vỡ hai chỗ:

1. **`contentProblems`** (`src/progress.ts`): một `requires` chưa được ticket nào trước đó **trong cùng danh sách** dạy thì báo soft-lock. `tests/ecomContent.test.ts` chỉ đưa vào ticket của domain đó.
2. **Màn chọn domain** (`welcome.ts`) cho người mới chọn mọi domain sống, nên `fin-ch1-01` có thể là bài đầu tiên của một người chưa biết SQL.

**Đề xuất (D-F4): Finance tự dạy, thang gọn.** Mỗi kỹ năng được dạy đúng một lần (luật `contentProblems`). Chương 1 dồn 6 kỹ năng nền vào 3 việc dạy, mỗi việc hai kỹ năng, như E-com cho phép tối đa. Người đã biết SQL đi qua nhanh: ví dụ mẫu, gợi ý miễn phí ở chương 1 (`FREE_HINT_CHAPTER`), nút điền khung (v13). Người mới có bài học nhanh của từng kỹ năng (chạy trên `lab`, L84). Phương án khác là thêm vào engine "kỹ năng giả định đã có" kèm cổng chặn; cách này tốn mã ở main và làm người mới bị chặn ở domain họ vừa chọn, nên không chọn.

| Chương | teach (worked) | develop (faded) | twist | Mới so với E-com |
|---|---|---|---|---|
| F1 | `select` + `where` | `order_by` + `limit` | `aggregate` + `group_by` | |
| F2 | `join` | `date_math` | `left_join` + `coalesce` | |
| F3 | `case_when` | `conditional_agg` | `multi_join` + `having` | |
| F4 ★ | `cte` | `date_bucket` | `window_lag` | |
| F5 | `full_join` | `window_agg` | `scalar_subquery` | `full_join`, `scalar_subquery` |
| F6 ★ | `window_rank` | `multi_cte` | `anti_join` | `multi_cte` |

Tổng **23 kỹ năng**.

**Luật viết suy ra từ thang**, kiểm tay lúc review; không test nào bắt được:
- Trước F3 (`multi_join`), mỗi câu truy vấn chỉ ghép tối đa 2 bảng. CTE tính theo từng khối.
- Trước F4 không dùng `WITH`.
- Trước F5 không dùng truy vấn con.

**Không dạy ở Finance:** `distinct`, `string_fn`, `pattern_match`, `cast`, `self_join`, `null_logic`, `in_subquery`, `exists`, `correlated_value`, `distinct_on`, `union`, `except`, `explain_read`, `sargable`, `index_design`. Không có chương chỉ mục, không `runLab`.
- **Ngoại lệ biết trước:**
  - Cách đổi kiểu `::date`/`::numeric` được viết sẵn trong gợi ý 2 và ví dụ mẫu, theo tiền lệ D9-4.
  - `DISTINCT` trong hàm gom (`COUNT(DISTINCT branch_id)` ở F5-03) và `SELECT DISTINCT` (F6-02) cũng được viết sẵn trong gợi ý 2. `requires` không ghi `distinct`.
- **Chỗ trống `IS NULL`:** F6-03 dạy `anti_join` bằng `LEFT JOIN … IS NULL`. Thẻ kỹ năng `anti_join` đã giải thích `IS NULL`, nên không cần `null_logic`.

### 1.4 Áp dụng bài nâng cao General (`adv:`)

Ticket có thêm trường tùy chọn `adv: [a3]` (id nút trong `content/general/adv.yml`, status `in` hoặc `partial`).
- **Hiện ở đâu:** brief của ticket và hàng chương trên Tổng quan có chip **"Dựa vào: Trục ngày"**, link tới `#/learn/adv/a3`.
- **Chỉ một chiều** (domain → General). Trang nút nâng cao **không** nhắc Finance (L82).
- **Không vào `requires`:** `adv` không phải id của `skills.yml`. Ôn Leitner vẫn chỉ theo kỹ năng.
- **Cú pháp:** viết sẵn trong gợi ý 2 (`percentile_cont(0.5) WITHIN GROUP (ORDER BY …)`, `generate_series`, `GROUP BY ROLLUP (…)`), như D9-4.

| Nút | Ticket | Dùng để |
|---|---|---|
| A3 Trục ngày | `fin-ch4-04` | Giải ngân từng ngày quanh Tết, kể cả ngày không giải ngân |
| B2 Cohort và retention | `fin-ch4-05` (bước 2) | Vintage: tỷ lệ quá hạn ở tháng thứ 3 theo tháng giải ngân |
| A4 Tổng phụ (ROLLUP) | `fin-ch5-04` | Chi phí quý theo vùng → chi nhánh, có dòng tổng vùng và tổng công ty |
| A2 Phân vị | `fin-ch6-04` | Trung vị tiền gốc mỗi sản phẩm |

**Tên chip:** lấy từ `adv.yml`, tức chunk `generalSources`.
- Brief chỉ gọi `loadGeneral()` khi ticket có `adv:`. Chỉ 4 ticket.
- Trong lúc chờ, chip ghi "Bài nâng cao liên quan".
- Tải lỗi thì chip vẫn là link, không chặn gì.

---

## 2. Công ty và dàn nhân vật

### 2.1 Tên: kiểm trùng (D-F1)

Kiểm 2026-11-18 bằng tìm kiếm web, mỗi tên một lần tìm. **Chưa phải kiểm thương hiệu**: chưa tra Cục Sở hữu trí tuệ, WIPO Global Brand Database hay Cổng thông tin doanh nghiệp quốc gia.

| Tên | Kết quả | Kết luận |
|---|---|---|
| *Lighthouse Finance* (EN của v7) | Trùng nhiều công ty tài chính có thật: Lighthouse Financial Corp. (cho vay thương mại, Mỹ), Lighthouse Finance Limited (Anh, Companies House 08860934), Lighthouse Finance Solutions (xử lý nợ, Mỹ), Lighthouse Financial Services. Nguồn: [sfnet.com](https://www.sfnet.com/home/chapters/canada/news-detail/2022/06/15/lighthouse-financial-corp-celebrates-35-years), [Companies House](https://pay.company-information.service.gov.uk/company/08860934), [curadebt.com](https://www.curadebt.com/lighthouse-finance-solutions-reviews/amp), [crunchbase](https://www.crunchbase.com/organization/lighthouse-financial-services) | **Không dùng.** Điều kiện "đổi tên nếu trùng" của D-F1 đã xảy ra. |
| "Hải Đăng" (VI của v7) | Có doanh nghiệp thật tên Hải Đăng (bất động sản, thương mại): [vnbusiness.vn](https://vnbusiness.vn/bat-dong-san-hai-dang-thu-ve-2500-ty-dong-trong-1-ngay-tu-phat-hanh-trai-phieu.html), [yellowpages.vn](https://yellowpages.vn/lgs/1187940558/cong-ty-tnhh-dau-tu-phat-trien-hai-dang.html). Không thấy công ty tài chính tên này. | Tránh: là danh từ chung, dễ trùng. |
| **"Hũ Bạc" / *Silver Jar*** | Tìm EN: không thấy công ty nào tên đúng như vậy. Có tên gần: JAR Finance LLC, MyJar (Anh), Silver Finance Inc. (Philippines). Nguồn: [village.ai](https://village.ai/company/jar-finance-llc), [zoominfo](https://www.zoominfo.com/c/myjar/375205231). Tìm VI không cho kết quả liên quan. Đó là **không có dữ liệu**, chưa chứng minh được là không trùng. | **Mặc định: "Tín dụng Hũ Bạc" / *Silver Jar Credit*.** Cần kiểm tay ở ba nguồn trên trước khi build (T0). |

**Kết quả T0(a), 2026-11-18.** Không thấy trùng; **chưa phải "đã kiểm sạch"**.
- Danh sách 16 công ty tài chính được Ngân hàng Nhà nước cấp phép (cập nhật 30/06/2026, [sbv.gov.vn](https://sbv.gov.vn/en/finance-companies)) không có tên nào gần "Hũ Bạc" hay "Silver Jar".
- Tìm web "Silver Jar" (cho vay, tín dụng, nhãn hiệu), "Silver Jar Credit", "Hũ Bạc" và "Hu Bac" (công ty, tài chính, tín dụng): không có doanh nghiệp tài chính nào. Nhãn hiệu Mỹ gần nhất là *SILVER JA* (nhóm 12, phụ tùng ô tô, [justia](https://trademarks.justia.com/994/11/silver-99411990.html)). "Hũ" chỉ ra nhà bán hũ, lọ và các trang "nổ hũ" (cờ bạc), đúng nỗi lo ở đoạn dưới.
- **Không truy cập tự động được:** WIPO Global Brand Database (chặn bằng captcha) và tra cứu doanh nghiệp masothue.com (trả 403).
- **Chưa thử:** Cục SHTT (IP Lib) và Cổng thông tin doanh nghiệp quốc gia.
- **Kết luận:** giữ tên mặc định. Trước khi phát hành v14, một người tra tay WIPO (nhóm 36) và Cổng thông tin doanh nghiệp quốc gia ("Hũ Bạc"), khoảng 5 phút.

Lý do chọn: hũ đựng tiền tiết kiệm là hình quen ở Việt Nam, vẽ được thành cảnh (hũ đầy dần) mà không cần logo, và cùng kiểu đặt tên với "Chợ Lồng Đèn".

**Cần user đọc bằng tai người Việt:** "hũ" còn gợi tiếng lóng "nổ hũ" (trò cờ bạc), và "bạc" gần "cờ bạc". Với một công ty cho vay, hai liên tưởng này có thể không hợp. Nếu thấy không ổn, tên khác cùng hình ảnh tiết kiệm là "Tín dụng Ống Heo" / *Piggy Credit*; tên này **chưa kiểm**.

- **Tên chỉ nằm trong i18n và lời văn.** Không vào schema (`finance`), id (`fin-`), route (`#/d/finance`) hay tên file, nên đổi tên sau này chỉ sửa chữ.
- **Hệ quả của việc đổi tên:** bỏ motif hải đăng của v7 §3.4 (logo, "hải đăng bật đèn"). Thay bằng hũ bạc (§5.3).
- **Không thương hiệu thật nào khác** trong dữ liệu: không ngân hàng, ví, mạng thẻ hay đại lý có thật. Phương thức trả là mã chung `cash | bank_transfer | ewallet | auto_debit`. Kênh đối tác là `partner`, không tên shop.

**Câu chuyện:** Hũ Bạc mở tháng 6/2024 ở Đà Nẵng. Công ty cho vay tiền mặt và trả góp mua điện thoại, xe máy, điện máy, có 8 chi nhánh từ Quảng Trị tới Bình Định. Bạn vào phòng Quản trị rủi ro tháng 10/2026, đúng lúc tỷ lệ quá hạn ở một chi nhánh bắt đầu tăng.

### 2.2 Dàn nhân vật: `content/domains/fin/people.yml`

Cùng định dạng `people.yml`, `employee: null`. Tên không trùng 15 người Logistics hay 7 người E-com (`personOf` tìm theo tên; test kiểm cả hai). Bảng trong `tables:` là tên thật trong `src/db/fin/schema.sql`.

| Tên | `dept` | Vai trò (VI / EN) | `tables:` | Gửi | `look` |
|---|---|---|---|---|---|
| Lương Bảo Châu | Management | Tổng giám đốc / CEO | `loans`, `branches` | Mọi đánh giá thăng tiến | light, black, bun, none |
| Tạ Minh Nhật | IT | Trưởng nhóm dữ liệu, người kèm / Data team lead, your mentor | `loan_snapshots`, `applications` | Việc dạy công cụ | tan, black, short, glasses |
| Huỳnh Kim Ngân | **Risk** (mới) | Giám đốc Quản trị rủi ro / Head of Credit Risk | `loan_snapshots`, `loans`, `applications` | DPD, vintage, xếp hạng | medium, black, long, scarf |
| Mạc Văn Toàn | **Collections** (mới) | Trưởng nhóm thu hồi nợ / Collections lead | `collection_calls`, `repayments` | Trả trễ, roll rate, gọi nhắc nợ | deep, black, short, headset |
| Lư Thảo Vy | Finance | Kế toán trưởng / Chief accountant | `gl_entries`, `budgets`, `accounts` | Ngân sách, tiền thu | light, brown, side, none |
| Phùng Đức Lâm | Sales | Giám đốc kinh doanh, mạng lưới chi nhánh / Head of sales and branches | `branches`, `products`, `applications` | Giải ngân, sản phẩm | tan, grey, short, tie |
| Tôn Nữ Hạnh | CS | Trưởng nhóm chăm sóc khách hàng / Customer care lead | `customers`, `schedules` | Lịch trả của khách | medium, black, long, lanyard |

**Phòng mới trong `DEPT` (`src/theme.ts`):**
- `Risk`: `bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200`, shirt `#b91c1c`.
- `Collections`: `bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200`, shirt `#4338ca`.
- Mỗi phòng 4 câu cảm ơn VI/EN (`chat.thanksRisk…4`, `chat.thanksCollections…4`).
- `tests/theme.test.ts` kiểm tương phản ≥ 4,5:1.

**Phòng có sẵn:** `Finance`, `Sales`, `CS`, `IT`, `Management` dùng lại; màu và câu cảm ơn chung với Logistics, như E-com.

**Cảnh hoàn thành:** `scene.ts` đang đổi phòng `Finance` thành cảnh `ledger`. Cảnh này chỉ chạy ở Logistics (`stage.ts` dừng sớm ngoài Logistics), nên không ảnh hưởng Finance.

---

## 3. Schema `finance`

### 3.1 Bảng

Tiền là VND `numeric(14,0)`. Mã trạng thái/kênh/phương thức là chữ thường ASCII. Tên chi nhánh, thành phố, sản phẩm, khoản mục là ASCII tiếng Anh (luật D9-18: đề EN không có dấu; kết quả không chứa chữ theo ngôn ngữ). Họ tên khách có dấu, như E-com. Số dòng là **số đo ở T0** (bản nháp `fin-t0`, §3.4).

| Bảng | Cột | Dòng (T0) | Mở ở chương |
|---|---|---|---|
| `branches` | `id` PK, `name`, `city`, `region` (`north \| central \| south`, 3/3/2), `opened_on`. Id: 1 Da Nang, 2 Dong Ha, 3 Hoi An, 4 Tam Ky, 5 Hue, 6 Lien Chieu, 7 Quang Ngai, 8 Quy Nhon. `north` = 2, 5, 6; `central` = 1, 3, 4; `south` = 7, 8. | 8 | F1 |
| `products` | `id` PK, `code` UNIQUE, `name` (1 `Cash Loan`, 2 `Phone Instalment`, 3 `Motorbike Instalment`, 4 `Appliance Instalment`, 5 `Salary Advance`), `kind` (`cash \| instalment`), `rate_month_pct numeric(4,2)` (lãi phẳng/tháng), `min_term`, `max_term` | 5 | F1 |
| `customers` | `id` PK, `full_name`, `birth_year`, `city`, `monthly_income numeric(14,0)` (NULL 17,8%: không khai), `joined_on` (2024-06-01…2026-10-30, tăng đều theo id), `home_branch_id` FK | 3.200 | F1 |
| `applications` | `id` PK, `customer_id` FK, `product_id` FK, `branch_id` FK, `applied_on`, `amount`, `term_months`, `score int` (300–850), `channel` (`branch \| app \| partner`), `decision` (`approved \| rejected \| cancelled`) | 5.500 | F1 |
| `loans` | `id` PK, `code` UNIQUE (`L00001`…), `application_id` UNIQUE FK, `customer_id` FK, `product_id` FK, `branch_id` FK, `disbursed_on` (= ngày nộp hồ sơ, 2024-07-12…2026-10-29), `principal`, `term_months`, `rate_month_pct`, `status` (`active` 1.557 \| `closed` 1.547 \| `written_off` 78), `closed_on` (NULL khi `active`) | 3.182 | F1 |
| `schedules` | `id` PK, `loan_id` FK, `instalment_no`, `due_on` (= ngày giải ngân + N tháng), `principal_due`, `interest_due`; UNIQUE (`loan_id`, `instalment_no`). Gồm cả kỳ chưa tới hạn. | 28.754 | F2 |
| `repayments` | `id` PK, `schedule_id` UNIQUE FK, `loan_id` FK, `paid_on`, `amount` (= gốc + lãi của kỳ), `method` (`cash \| bank_transfer \| ewallet \| auto_debit`, cố định theo khoản vay) | 17.319 | F2 |
| `loan_snapshots` | `loan_id` FK, `month_end` (ngày cuối tháng, 2025-11-30…2026-10-31), `outstanding` (gốc còn lại), `dpd int` (số ngày từ kỳ chưa trả lâu nhất đã đến hạn tới `month_end`, 0 nếu không có); PK (`loan_id`, `month_end`). Mỗi khoản còn dư nợ ở cuối tháng đó có một dòng. | 14.625 | F3 |
| `accounts` | `id` PK, `code` UNIQUE, `name` (1 `Interest Income`, 2 `Fee Income`, 3 `Staff Cost`, 4 `Rent`, 5 `Marketing`, 6 `IT`, 7 `Collection Cost`, 8 `Credit Loss Provision`, 9 `Other Opex`), `kind` (`income \| expense`) | 9 | F5 |
| `budgets` | `branch_id` FK, `account_id` FK, `month` (ngày đầu tháng, 2025-01…2026-12), `amount`; PK (3 cột). 8 khoản mục × 8 chi nhánh × 24 tháng; `Other Opex` **không có ngân sách** (móc FULL JOIN). | 1.536 | F5 |
| `gl_entries` | `id` PK, `branch_id` FK, `account_id` FK, `posted_on` (2025-01…2026-10), `amount` (luôn dương; `accounts.kind` cho biết thu hay chi), `memo` | 2.537 | F5 |
| `collection_calls` | `id` PK, `loan_id` FK, `called_on`, `outcome` (`promise \| no_answer \| refused \| paid`) | 1.411 | F6 |

Tổng **78.086 dòng**. Seed Node đo ở T0: PGlite 0.5.16, chạy `CREATE SCHEMA` + `schema.sql` + `seed.sql` như `ensureSchema`.
- **Máy rảnh:** 1,0–1,2 s. E-com đo cùng lúc 1,5–1,8 s, nên Finance bằng khoảng 0,7 lần E-com.
- **Máy bận** (một workflow khác chạy test song song): có lần Finance 1,9–2,6 s, E-com 2,6–3,5 s.
- **Phần tốn nhất:** các `INSERT` có khóa ngoại (`schedules`, `repayments`, mỗi bảng ~0,2 s) và khối `loan_snapshots` (~0,17 s).
- Seed hai lần cho cùng md5 ở cả 12 bảng.
- `gl_entries` và `collection_calls` ít hơn mục tiêu cũ (6.000, 4.000). Lương, thuê, IT và dự phòng mỗi tháng chỉ một bút toán; cuộc gọi chỉ dành cho khoản DPD ≥ 5 ở cuối tháng. Mọi ticket vẫn có kết quả (§4), nên không cần thêm dòng.

**Đơn giản hóa có chủ ý.** Ghi ở đầu `seed.sql`; tooltip của tab Cột có thể nhắc.
- **Một kỳ trả đủ một lần hoặc chưa trả.** Không trả một phần, không trả trước hạn, nên `repayments.schedule_id` là UNIQUE. DPD vì vậy đọc được bằng phép trừ ngày.
- **Lãi phẳng.** `interest_due` = gốc × lãi tháng; `principal_due` = gốc / kỳ hạn, làm tròn 1.000 đồng, kỳ cuối bù phần lẻ.
- **Khoản ngừng trả thì không trả lại.**
  - Khoản "xấu" ngừng từ kỳ k và bị xóa nợ 181 ngày sau kỳ chưa trả đầu tiên (`closed_on` = ngày xóa nợ).
  - Khoản trả hết là `closed`, `closed_on` = lần trả cuối.
- **Giải ngân ngay ngày nộp hồ sơ.**
- **`loan_snapshots` tính bằng SQL trong seed** từ `schedules` + `repayments`, nên luôn khớp. Người chơi không phải tự dựng DPD từ lịch trả: việc đó cần trục ngày và truy vấn con lồng nhau, quá sớm cho chương 3.
- **`gl_entries` dòng `Interest Income`** cộng từ phần lãi của `repayments` theo chi nhánh × tháng (khớp sổ vay).
- **Các khoản chi là ngẫu nhiên** có `setseed()`. Mỗi tháng lệch ngân sách ±2% (`Staff Cost`, `Rent`) hoặc ±6% (các khoản còn lại).
- **`IT` lập ngân sách theo tháng, hạch toán theo quý:** một bút toán vào ngày 28 của tháng cuối quý.

### 3.2 Móc cốt truyện (đầu `src/db/fin/seed.sql`, ticket và `tests/finSeed.test.ts` dựa vào)

Số trong bảng đo trên bản nháp T0.

| # | Móc | Ticket dùng |
|---|---|---|
| H1 | Chi nhánh **Quang Ngai** (id 7, vùng `south`) có 58 khoản giải ngân 2026-03…2026-05 qua kênh `partner`. Trong nhóm này, khoản điểm < 700 vỡ nợ 55%, từ kỳ 3 trở đi, nên không lẫn vào cohort Tết ở tháng thứ 3. Tỷ lệ dư nợ DPD > 30 của chi nhánh tăng 4 tháng liền: 4,2% (cuối 6) → 6,4 → 10,0 → 11,1 → **14,2% (cuối 10/2026)**. Cuối 10/2026 các chi nhánh khác ở 1,4–3,4% (cao nhất Da Nang 3,4%). Lưu ý: tháng 4–7/2026, Lien Chieu và Quy Nhon từng lên 8–10% vì cohort Tết (H2), rồi giảm. | F3 bước 2, **F6 kết luận** |
| H2 | **Cohort Tết**: khoản giải ngân 2026-01 và 2026-02 (Tết 17/02/2026) vỡ nợ gấp 2,5 lần bình thường, ngay kỳ 1–2. Tỷ lệ DPD > 30 ở cuối tháng thứ 3: **1/2026 12,43%, 2/2026 7,61%**. Các cohort khác trong 2025-08…2026-06 ở 1,29–5,31%, trung bình 2,86%, nên hai cohort Tết gấp 4,3 và 2,7 lần. Ảnh chụp bắt đầu 2025-11-30, nên cohort sớm nhất đọc được ở tháng thứ 3 là 2025-08. | **F4 kết luận** |
| H3 | Chi nhánh **Hoi An**: `Marketing` quý 3/2026 thực chi 144,8 tr. so với ngân sách 90,5 tr., **vượt 60%**. Mọi khoản chi khác của mọi chi nhánh lệch ≤ ±6% mỗi quý. Toàn công ty quý 3: `Marketing` vượt 53,1 tr., lớn nhất; kế đến `Other Opex` 13,5 tr. (không có ngân sách). | **F5 kết luận** |
| H4 | Điểm tín dụng: hồ sơ < 520 luôn bị từ chối; hồ sơ được duyệt thấp nhất 520 điểm. Tỷ lệ vỡ nợ gốc nhân 3,0 / 1,5 / 0,8 cho dải < 600 / 600–699 / ≥ 700. Cuối 10/2026, tỷ lệ khoản DPD > 30 theo dải là **5,92% (28/473), 3,33% (26/781), 1,32% (4/303)**: dải 1 gấp ~4,5 lần dải 3. | **F3 kết luận** |
| H5 | Không có hồ sơ (nên không giải ngân) vào Chủ nhật và trong kỳ nghỉ Tết 2026-02-14…2026-02-22. Trục ngày của F4-04 có 9 ngày bằng 0 liền nhau. | F4-04 |
| H6 | 17,8% khách không khai thu nhập (`monthly_income` NULL). | Thẻ Cột/Dữ liệu; F2 `coalesce` không dùng cột này (để dành cho bài thêm) |
| H7 | Cuối tháng 10/2026 có 58 khoản DPD > 30 (28 ở Quang Ngai). Trong tháng 10, cuộc gọi bỏ sót 60% khoản quá hạn của Quang Ngai và 15% ở nơi khác; các tháng khác bỏ sót 8%. Kết quả: **24 khoản DPD > 30 không có cuộc gọi nào trong tháng 10, 21 ở Quang Ngai**. 16 trong số đó là khoản kênh đối tác giải ngân 3–5/2026 (F6 bước 3). Tháng 9 và tháng 8 mỗi tháng còn 3 khoản như vậy. | F6-03, F6 bước 3 |
| H8 | `IT` có ngân sách mỗi tháng nhưng chỉ hạch toán ở tháng cuối quý: tháng 1–2 của quý có ngân sách mà không có thực chi. `Other Opex` có thực chi mỗi tháng ở mọi chi nhánh (0,1–0,9 tr.) mà không có ngân sách. | F5-01 (FULL JOIN) |
| H9 | Phương thức trả cố định theo khoản vay. Tỷ lệ kỳ trả trễ: `auto_debit` 0,88% (trễ trung bình 1,6 ngày), `ewallet` 24,4%, `bank_transfer` 28,4%, `cash` 54,4% (trễ trung bình 12,7 ngày, có lần 31–55 ngày). Riêng tháng 10/2026: `auto_debit` 4 lần trễ; `cash` 149 lần, trung bình 13,46 ngày. | **F2 kết luận** |
| H10 | Khoản `written_off` (78) không còn dòng snapshot từ ngày xóa nợ. **Khác bản cũ:** kỳ đến hạn 30–31/10/2026 phần lớn **đã trả** (29/35 và 30/40), vì trả đúng hạn là trả ngay ngày đến hạn. Kỳ chưa trả của ngày 30/10 thuộc khoản trả trễ hoặc khoản đã ngừng trả, đủ cho twist F2-03. | F2, F3 |
| H11 | Trung bình / trung vị tiền gốc của mọi khoản: `Motorbike Instalment` 40,45 tr. / 41 tr., `Cash Loan` 30,29 / 30,5, `Phone Instalment` 15,01 / 15, `Appliance Instalment` 11,71 / 11,5, `Salary Advance` 5,07 / 5. Khoản giải ngân năm 2026: Motorbike 40.178.295 / 41.000.000, Salary Advance 5.195.238 / 5.500.000. | F1 kết luận, F6-04 |

### 3.3 Luật seed (giữ nguyên luật Plan 9)

- File riêng `src/db/fin/schema.sql` + `src/db/fin/seed.sql`. **Không đụng** `src/db/schema.sql`, `seed.sql`, `lab.sql`, `src/db/ecom/*`: md5 các schema cũ không đổi.
- Mỗi khối ngẫu nhiên mở bằng `setseed()` riêng; khối mới chỉ nối **cuối** file. Khối cuối `ANALYZE` chỉ 12 bảng `finance` (không `ANALYZE` trần).
- "Hôm nay" = 2026-10-31. Solution dùng ngày cố định, không `CURRENT_DATE`/`now()`.
- md5 cả 12 bảng ghim trong `tests/finSeed.test.ts`; thêm khối làm lệch md5 thì phải chạy lại `tests/finContent.test.ts` và đọc lại các câu kết luận.
- PGlite giữ bản pin 0.5.16 (`random()` phụ thuộc bản Postgres).
- Nạp lười: `ensureSchema(db, 'fin')` → `import('./finSeed')` (chunk `finSeed`) → `CREATE SCHEMA finance; SET search_path TO finance;` → schema + seed → `SANDBOX_SETUP_SQL`. Đường dẫn theo request = `finance, sandbox`.
- `SCHEMAS = { game, lab, ecom, fin: 'finance' }`. Tên schema chỉ lấy từ hằng này.
- `FIN_TABLES` (12 tên, tĩnh) đưa vào luật tên CSV nhập (`_my`) cùng `LOGISTICS_TABLES` ∪ `ECOM_TABLES`. Bảng trùng tên giữa schema (`customers`, `products`) đã an toàn nhờ `search_path` theo request (Plan 9).

### 3.4 Kết quả T0 (b)–(d), 2026-11-18

**Thư mục nháp** `C:\Users\KHOA~1.HUY\AppData\Local\Temp\claude\be8c95d1f89f2452\e927c5e6-22a4-40fa-bff6-3a9e8af9fcbc\scratchpad\fin-t0\`. Thư mục tạm, có thể bị xóa khi dọn máy, nên T1 chép sớm.

| File | Dùng cho |
|---|---|
| `schema.sql`, `seed.sql` | T1 chép nguyên vào `src/db/fin/`. |
| `tickets.mjs` | SQL Solution của 30 việc (mọi bước, mọi biến thể) và `wrong:`. T3 chép vào ticket. |
| `runall.mjs` | Chạy Solution và kiểm luật (`-v` in kết quả); `results.txt` là lần chạy cuối. |
| `seedcheck.mjs` | md5 của 12 bảng và thời gian seed. |
| `hooks.mjs`, `h1.mjs`, `picks.mjs` | Đo móc H1–H11 và chọn biến thể. |
| `framecheck.mjs` | Chạy `frameOf()` (`-v` in khung). |

**md5 ghim cho `tests/finSeed.test.ts`** (cùng `hashOf` với `ecomSeed.test.ts`; seed hai lần trùng):

| Bảng | md5 |
|---|---|
| `branches` | `29ea83fd3b09d4042b492af5e6d480ce` |
| `products` | `4bdb8346cfbd8072efab7c80e527dbd3` |
| `customers` | `883cfae002b49a040bbddb6aa3cb5a03` |
| `applications` | `11fd57c75cb1bcb9c5a52757df1d070a` |
| `loans` | `49a87fa31caf957dd9ff0a0c696d7062` |
| `schedules` | `3b58631edf2395c5b7e33cd09bd4f0d2` |
| `repayments` | `df9c07904109d81a7ced52c49ddc32d6` |
| `loan_snapshots` | `3a80ac28c9cd3054cd3c5a152fe7b553` |
| `accounts` | `ee29a1debd8f07acca52de160e9726b8` |
| `budgets` | `907e7b22b71012356656c9272484a1d6` |
| `gl_entries` | `1417358b46ad6985a738bdfd3c03644f` |
| `collection_calls` | `a180801e6b5ccf26b39d801593066ac4` |

**(d) `frameOf()` trên 78 Solution Finance** (mọi bước × biến thể; `framecheck.mjs`, `fc2.mjs`):
- **Đạt mọi bất biến của `tests/frame.test.ts`:**
  - khung khác Solution, ≥ 2 chỗ trống;
  - không còn chuỗi, số hay tên cột `finance`;
  - điền lại ra đúng Solution;
  - xuống dòng cân ngoặc.
- **Đọc tốt, không cần sửa:**
  - `count(*) FILTER (WHERE s.___ > ___)`;
  - `percentile_cont(___) WITHIN GROUP (ORDER BY ___)::numeric`;
  - `LAG(___) OVER (PARTITION BY ___ ORDER BY ___)`;
  - `FROM generate_series(___::date, ___, interval ___) AS d`;
  - `FULL JOIN x ON x.___ = b.___`.

Ba điểm T3/T7 phải xử lý (trong `src/frame.ts`, chunk `frame`; không sửa ở T0):
1. **`GROUP BY ROLLUP (b.region, b.name)` thành một `___`** (`GROUP BY ___`), vì cả mục GROUP BY gộp thành một chỗ trống. Khung của F5-04 giấu đúng kỹ năng của bài.
   - Sửa: giữ `ROLLUP (` … `)` (cả `CUBE`, `GROUPING SETS`) và cho mỗi phần tử bên trong một `___`.
   - Thêm ca vào `tests/frame.test.ts`.
2. **`ORDER BY b.region NULLS LAST, b.name NULLS LAST` thành `ORDER BY ___, ___`**, mất `NULLS LAST`. F5-04 cần `NULLS LAST` để dòng tổng đứng cuối nhóm.
   - Cách 1: giữ `NULLS FIRST/LAST` ngoài chỗ trống.
   - Cách 2: chấp nhận, và gợi ý 2 của F5-04 ghi sẵn `NULLS LAST`.
   - Đây là hành vi chung với `DESC` hiện nay (cả mục ORDER BY là một `___`), nên đổi sẽ đụng khung Logistics/E-com: chạy lại `frame.test.ts`.
3. **Khung để lộ từ khóa của twist:**
   - `PARTITION BY` ở F4-03 (twist "thiếu `PARTITION BY`");
   - `FULL JOIN` ở F5-01;
   - `LEFT JOIN … c.___ IS NULL` ở F6-03.
   
   Cùng mức lộ như `LEFT JOIN` ở Logistics/E-com. Khung là gợi ý bậc cuối nên chấp nhận được. Nếu muốn giấu, truyền `wrong:` của twist làm `trapWrongs` (D-H3) để gộp mệnh đề khác nhau thành một `___`.

**Dễ đọc (T3 cân nhắc):** mệnh đề dài vẫn nằm trên một dòng. Ví dụ: chuỗi `CASE WHEN … WHEN … ELSE … END` trong CTE đầu của F4-03, và `WHERE` 7 điều kiện của F6-05 bước 3. Luật L88 chỉ ngắt theo mệnh đề, `AND` chỉ xuống dòng khi mở truy vấn con.

---

## 4. Sáu chương, 30 việc

Mỗi chương đi theo khuôn Plan 9: teach (`worked`) → develop (`faded`) → twist → rest → đánh giá thăng tiến (`boss`, 3 bước + câu kết luận). Ticket nằm ở `content/domains/fin/tickets/chN/fin-chN-0M.md`.

**Luật áp cho mọi ticket.** Đã có trong `tests/ecomContent.test.ts`; `tests/finContent.test.ts` chép lại và thêm (§7).
- **Bắt buộc có:** VI + `# EN`, `columns:` (mỗi cột Solution một nhãn nghiệp vụ), `reflect:` và ≥ 1 `wrong:` ở mọi việc thường.
- **Biến thể:** ≥ 3 ở mọi việc dạy kỹ năng (trừ việc chỉ dạy `select`; `fin-ch1-01` dạy cả `where` nên vẫn có 3).
- **Ticket xếp thứ tự** (`ordered: true`): có `ORDER BY` và đề nói đủ thứ tự phụ.
- **Tiền:** làm tròn ở đâu thì đề nói rõ (từng dòng hay chỉ con số cuối).
- **Nhóm nợ trả số** (0 đúng hạn, 1 = 1–30 ngày, 2 = 31–90, 3 = trên 90), không trả chữ "1–30". Cờ trả boolean.
- **Đề không có:** tên bảng/cột, từ khóa SQL, mã trạng thái, backtick. Ngoài danh sách cấm của E-com (`OVER|PARTITION|CASE|WITH`), Finance cấm thêm `ROLLUP|CUBE|GROUPING|FILTER|COALESCE|NULL|EXISTS`. Lời đề được dùng "trung vị", "lũy kế", "tổng phụ", "DPD", "nợ xấu".
- **Gợi ý ba bậc** (problem-design §1.5). Gợi ý 2 ghi sẵn cú pháp của bài nâng cao (§1.4).
- **`ordered` là của cả ticket** (`ecomContent.test.ts` áp `t.ordered` cho mọi bước). Vì vậy mọi đánh giá thăng tiến đều `ordered: true`: mỗi bước có `ORDER BY` và đề nói thứ tự phụ; bước một dòng vẫn có `ORDER BY 1`.
- **Không ticket nào cần `precision:`.** Đề nói làm tròn bao nhiêu chữ số thì Solution `ROUND` đúng như vậy; grader làm tròn 2 chữ số khi so.

Trong các bảng dưới:
- **Biến thể** liệt kê giá trị của `variants[0]`, `[1]`, `[2]`.
- Cột **Solution** là hướng làm một dòng. Plan 11 viết SQL đầy đủ và chạy kiểm.
- Kết quả và đáp án kết luận **đã đo ở T0** trên seed nháp (§3.4). SQL đầy đủ của mọi bước, biến thể và `wrong:` nằm trong `tickets.mjs` ở thư mục nháp. Mọi Solution × biến thể có > 0 dòng, các biến thể khác nhau từng đôi, mọi `wrong:` khác Solution.

**Luật "≤ 2 bảng trước F3"** (§1.3). Ở F1–F2:
- Việc nào cần mã khoản vay mà chỉ có `schedules`/`repayments` thì trả **số khoản vay** (`loan_id`), không trả mã `L…`.
- Đề gọi cột đó là "số khoản vay".

### F1 · Tuần đầu ở Hũ Bạc

- `career`: Chuyên viên phân tích tập sự / *Junior Credit Analyst* · `tier: true` ★
- `tables`: `branches`, `products`, `customers`, `applications`, `loans`
- `story`: Hũ Bạc cho vay tiêu dùng và trả góp ở 8 chi nhánh miền Trung. Tuần đầu, trưởng nhóm dữ liệu dẫn bạn làm quen hồ sơ vay và sổ vay; cuối tuần, tổng giám đốc đánh giá thử việc.
- `outcomes`:
  - Lấy và lọc đúng khoản vay cần xem (`select`, `where`).
  - Xếp hạng có thứ tự phụ, lấy top N (`order_by`, `limit`).
  - Đếm, cộng, gom theo sản phẩm (`aggregate`, `group_by`).

| Id | Beat | Gửi | Câu hỏi (VI, rút gọn) | Solution (hướng) | Ghi chú |
|---|---|---|---|---|---|
| fin-ch1-01 | teach, worked; grants `select`, `where` | Tạ Minh Nhật | Khoản vay của chi nhánh {{branch}} (mã {{id}}) giải ngân trong tháng 10/2026: mã khoản vay, ngày giải ngân, tiền gốc, kỳ hạn (tháng). | `SELECT code, disbursed_on, principal, term_months FROM loans WHERE branch_id = {{id}} AND disbursed_on >= '2026-10-01' AND disbursed_on < '2026-11-01'` | Không xếp thứ tự. Biến thể: Hoi An (3) / Hue (5) / Quy Nhon (8). Ví dụ mẫu: khách tham gia tháng 9/2026 ở một thành phố (bảng `customers`). Wrong: chỉ lọc tháng, quên chi nhánh. |
| fin-ch1-02 | develop, faded; grants `order_by`, `limit` | Phùng Đức Lâm | Mười khoản vay lớn nhất của sản phẩm {{product}} giải ngân trong quý 3/2026: mã, ngày giải ngân, tiền gốc. Lớn nhất trước; bằng nhau thì mã theo thứ tự chữ cái. | `WHERE product_id = … AND disbursed_on` trong quý 3 `ORDER BY principal DESC, code LIMIT 10` | `ordered`. Biến thể: Motorbike / Phone / Appliance Instalment (đề ghi tên + mã). Starter trống ở `ORDER BY ___` và `LIMIT ___`. Wrong (T0): thứ tự phụ ngược (`code DESC`). Câu "thiếu thứ tự phụ" cho thứ tự hòa tùy ý, có thể trùng Solution, nên không dùng làm `wrong:`. |
| fin-ch1-03 | twist; grants `aggregate`, `group_by` | Huỳnh Kim Ngân | Khoản giải ngân trong {{quarter}}, theo từng sản phẩm: mã sản phẩm, số khoản, tổng tiền gốc. **Tính cả khoản đã tất toán hay đã xóa nợ.** Twist: câu hỏi về lượng giải ngân, không phải dư nợ hôm nay. | `SELECT product_id, count(*), sum(principal) FROM loans WHERE disbursed_on … GROUP BY product_id` | Không xếp thứ tự. Biến thể: Q1/Q2/Q3 2026. Wrong: chỉ khoản đang trả. |
| fin-ch1-04 | rest | Tôn Nữ Hạnh | Khách có chi nhánh nhà là Hue, tham gia từ 03/09/2026: họ tên, ngày tham gia; sớm nhất trước, cùng ngày thì mã khách nhỏ trước. | `SELECT full_name, joined_on FROM customers WHERE home_branch_id = 5 AND joined_on >= '2026-09-03' ORDER BY joined_on, id` | `ordered`. Không biến thể. 29 dòng. T0 đổi 01/09 → 03/09: ngày 01/09 không có khách Hue, nên câu sai `>` sẽ trùng Solution; ngày 03/09 có đúng một khách. Wrong: `>`. |
| fin-ch1-05 | boss | Lương Bảo Châu | **Đánh giá thử việc: bức tranh sổ vay.** (1) Năm hồ sơ điểm cao nhất bị từ chối trong tháng 10/2026: mã hồ sơ, điểm, số tiền xin (điểm cao trước, bằng nhau mã nhỏ trước). (2) Mỗi chi nhánh: mã chi nhánh, số khoản đang trả và tổng tiền gốc của chúng; theo mã chi nhánh. (3) Mỗi sản phẩm: mã sản phẩm, tiền gốc trung bình của khoản giải ngân năm 2026, làm tròn tới đồng; theo mã sản phẩm. | (1) `applications` lọc + `ORDER BY score DESC, id LIMIT 5`. (2) `loans WHERE status = 'active' GROUP BY branch_id`. (3) `ROUND(AVG(principal))` theo `product_id`. | `ordered: true` (mọi bước). `requires` 6 kỹ năng F1. Kết luận: "Sản phẩm nào có khoản vay trung bình lớn nhất?" → Motorbike Instalment (H11). **T0:** (1) 5 dòng, điểm 766…737. (2) 8 dòng. (3) sản phẩm 3: 40.178.295, kế đến sản phẩm 1: 29.797.320. |

### F2 · Lịch trả nợ và tiền về

- `career`: Chuyên viên phân tích tập sự · sổ vay / *Junior Credit Analyst · loan book*
- `tables`: `schedules`, `repayments`
- `story`: Mỗi khoản vay là một lịch trả nhiều kỳ. Thu hồi nợ và kế toán cần biết kỳ nào đã đến hạn, đã trả hay chưa, trả trễ bao nhiêu ngày.
- `outcomes`:
  - Ghép khoản vay với lịch trả (`join`).
  - Đếm số ngày giữa hạn trả và ngày trả (`date_math`).
  - Giữ cả kỳ chưa trả, ghi 0 thay ô trống (`left_join`, `coalesce`).

| Id | Beat | Gửi | Câu hỏi | Solution | Ghi chú |
|---|---|---|---|---|---|
| fin-ch2-01 | teach, worked; grants `join` | Tôn Nữ Hạnh | Các kỳ đến hạn ngày {{day}}: mã khoản vay, kỳ số, tiền gốc phải trả, tiền lãi phải trả. Theo mã khoản vay (chữ cái), rồi kỳ số. | `schedules s JOIN loans l ON l.id = s.loan_id WHERE s.due_on = '{{day}}' ORDER BY l.code, s.instalment_no` | `ordered`. Biến thể: 2026-10-05 / 2026-10-15 / 2026-09-25. Ví dụ mẫu: khoản vay ghép khách hàng (`loans` + `customers`). Wrong: ghép nhầm `s.id = l.id`. |
| fin-ch2-02 | develop, faded; grants `date_math` | Mạc Văn Toàn | Kỳ đến hạn trong tháng {{month}}, đã trả nhưng trả trễ: số khoản vay, kỳ số, ngày đến hạn, ngày trả, số ngày trễ. Trễ lâu nhất trước; bằng nhau theo số khoản vay, rồi kỳ số. | `schedules s JOIN repayments r ON r.schedule_id = s.id WHERE s.due_on …  AND r.paid_on > s.due_on ORDER BY 5 DESC, 1, 2` | `ordered`. `requires` `join`. Biến thể: 10/2026, 9/2026, 8/2026. Starter trống ở phép trừ và điều kiện trễ. Wrong: `>=` (gồm trả đúng ngày). |
| fin-ch2-03 | twist; grants `left_join`, `coalesce` | Lư Thảo Vy | Mọi kỳ đến hạn ngày {{day}}: mã kỳ, số tiền phải thu (gốc + lãi), số tiền đã thu tính đến hôm nay; kỳ chưa thu ghi 0. Theo mã kỳ. | `schedules s LEFT JOIN repayments r ON r.schedule_id = s.id WHERE s.due_on = … ORDER BY s.id`; cột 3 = `COALESCE(r.amount, 0)` | `ordered`. Twist: ghép thường làm mất kỳ chưa trả. Biến thể: 2026-10-30 / 2026-10-25 / 2026-10-20, có 35 / 45 / 36 dòng. Mỗi ngày có vài kỳ chưa thu (ngày 30/10: 6/35), từ khoản trả trễ hoặc đã ngừng trả (H10). Wrong: `JOIN` thường. |
| fin-ch2-04 | rest | Phùng Đức Lâm | Hồ sơ nộp trong tháng 10/2026 và được duyệt, theo kênh nộp: số hồ sơ và tổng tiền xin vay. | `applications WHERE decision = 'approved' AND applied_on … GROUP BY channel` | Không xếp thứ tự. |
| fin-ch2-05 | boss | Lương Bảo Châu | **Đánh giá thăng tiến: kỳ thu tháng 10.** (1) Kỳ đến hạn từ 01/10 đến hết 31/10/2026: tổng phải thu, tổng đã thu (kỳ chưa thu tính 0); một dòng. (2) Mười kỳ trả trễ lâu nhất trong các lần trả của tháng 10/2026: số khoản vay, kỳ số, số ngày trễ (bằng nhau: số khoản vay, kỳ số). (3) Mỗi phương thức trả, chỉ các lần trả trễ trong tháng 10/2026: phương thức, số lần và số ngày trễ trung bình, làm tròn 2 chữ số; theo phương thức (chữ cái). | (1) `LEFT JOIN` + `SUM(COALESCE(…))`. (2) `JOIN` + phép trừ + `ORDER BY … LIMIT 10`. (3) `GROUP BY method`, `ROUND(AVG(paid_on - due_on), 2)`. | `ordered: true`; bước 1 một dòng vẫn có `ORDER BY 1`. `requires` `join`, `left_join`, `coalesce`, `date_math`, `aggregate`, `group_by`, `order_by`, `limit`. Kết luận: "Phương thức nào gần như không trả trễ?" → trích nợ tự động (H9). **T0:** (1) phải thu 4.487.058.000, đã thu 4.006.630.000. (2) trễ 55…44 ngày. (3) `auto_debit` 4 lần / 2,00 ngày; `bank_transfer` 131 / 4,41; `cash` 149 / 13,46; `ewallet` 84 / 4,75. |

### F3 · Quá hạn và nhóm nợ

- `career`: Chuyên viên phân tích tín dụng / *Credit Analyst*
- `tables`: `loan_snapshots`
- `story`: Phòng Rủi ro chụp sổ vay vào cuối mỗi tháng: dư nợ còn lại và số ngày quá hạn của từng khoản. Từ nay bạn chia khoản vay vào nhóm nợ và đo nợ xấu theo chi nhánh.
- `outcomes`:
  - Chia khoản vay vào nhóm theo luật (`case_when`).
  - Đếm nhiều điều kiện trong một lần gom (`conditional_agg`).
  - Đi qua ba bảng, lọc nhóm sau khi gom (`multi_join`, `having`).

| Id | Beat | Gửi | Câu hỏi | Solution | Ghi chú |
|---|---|---|---|---|---|
| fin-ch3-01 | teach, worked; grants `case_when` | Huỳnh Kim Ngân | Cuối tháng {{month}}, khoản vay của chi nhánh mã {{id}}: mã khoản vay, số ngày quá hạn, nhóm nợ (0 đúng hạn, 1 quá hạn 1–30 ngày, 2 quá hạn 31–90, 3 quá hạn trên 90). Quá hạn lâu nhất trước, bằng nhau theo mã. | `loan_snapshots s JOIN loans l …`, `CASE WHEN dpd = 0 THEN 0 WHEN dpd <= 30 THEN 1 WHEN dpd <= 90 THEN 2 ELSE 3 END` | `ordered`. Biến thể (T0): (7/2026, 7), (6/2026, 8), (3/2026, 3), có 213 / 131 / 151 dòng (cả khoản DPD 0). Cả seed chỉ có 5 cặp (tháng, chi nhánh) có khoản DPD đúng 30, nên các biến thể được chọn trong số đó; nếu không, câu sai `< 30` trùng Solution. Ví dụ mẫu: chia hồ sơ theo dải điểm. Wrong: `dpd < 30` (đúng 30 ngày rơi sang nhóm 2). |
| fin-ch3-02 | develop, faded; grants `conditional_agg` | Tạ Minh Nhật | Mỗi cuối tháng từ {{first}} tới {{last}}: số khoản còn dư nợ, số khoản quá hạn trên 30 ngày, tổng dư nợ của các khoản quá hạn trên 30 ngày. Tháng sớm nhất trước. | `GROUP BY month_end`, `COUNT(*) FILTER (WHERE dpd > 30)`, `SUM(outstanding) FILTER (…)` (hoặc `SUM(CASE …)`) | `ordered`. Biến thể: 5–10/2026, 11/2025–4/2026, 2–7/2026. Wrong: lọc quá hạn ở WHERE (cột 1 sai). |
| fin-ch3-03 | twist; grants `multi_join`, `having` | Huỳnh Kim Ngân | Cuối tháng {{month}}: chi nhánh nào có hơn {{n}} khoản quá hạn trên 30 ngày? Tên chi nhánh, vùng, số khoản; nhiều trước, bằng nhau theo tên. | `snapshots → loans → branches WHERE dpd > 30 GROUP BY b.name, b.region HAVING count(*) > {{n}}` | `ordered`. Biến thể (T0): (10/2026, 4), (9/2026, 5), (7/2026, 6). Kết quả: 3 dòng (Quang Ngai 28, Da Nang 8, Hue 5); 2 dòng (Quang Ngai 21, Da Nang 14); 3 dòng (Da Nang 15, Quang Ngai 9, Quy Nhon 9: bằng nhau nên xếp theo tên). Mỗi biến thể có một chi nhánh đúng bằng ngưỡng, nên `>=` khác Solution. Wrong: `>=`. |
| fin-ch3-04 | rest | Tôn Nữ Hạnh | Khách đang có từ hai khoản vay chưa tất toán trở lên: mã khách, số khoản; nhiều trước, bằng nhau mã khách nhỏ trước. | `loans WHERE status = 'active' GROUP BY customer_id HAVING count(*) >= 2 ORDER BY 2 DESC, 1` | `ordered`. |
| fin-ch3-05 | boss | Lương Bảo Châu | **Đánh giá thăng tiến: báo cáo nợ xấu tháng 10.** (1) Cuối tháng 10/2026, theo nhóm nợ 0–3: số khoản và tổng dư nợ (nhóm 0 trước). (2) Chi nhánh có dư nợ quá hạn trên 30 ngày lớn hơn 3% tổng dư nợ của chính nó: tên, tỷ lệ % làm tròn 2 chữ số; cao trước. (3) Theo dải điểm lúc xét duyệt (1: dưới 600, 2: 600–699, 3: từ 700): số khoản còn dư nợ và tỷ lệ % đang quá hạn trên 30 ngày, làm tròn 2 chữ số; dải 1 trước. | (1) `CASE` + `GROUP BY 1`. (2) 3 bảng + `SUM(…) FILTER` / `SUM(…)` + `HAVING`. (3) `snapshots → loans → applications`, `CASE` trên `score`. | `ordered: true`; bước 2 bằng tỷ lệ thì theo tên. `requires` `case_when`, `conditional_agg`, `multi_join`, `having`, `join`, `aggregate`, `group_by`, `order_by`. Kết luận: "Dải điểm 1 có tỷ lệ quá hạn gấp khoảng bao nhiêu lần dải 3?" → **khoảng 4,5 lần** (T0: 5,92% so với 1,32%; H4). Phương án nhiễu nên là 1, 2, 10 lần. **T0:** (1) nhóm 0–3: 1.417 / 82 / 30 / 28 khoản. (2) 2 dòng: Quang Ngai 14,24, Da Nang 3,43 (sát ngưỡng 3%). (3) dải 2: 3,33%. |

### F4 ★ · Cohort giải ngân

- `career`: Chuyên viên rủi ro tín dụng / *Credit Risk Analyst* · `tier: true` ★
- `tables`: (không mở bảng mới)
- `story`: Hội đồng tín dụng hỏi: khoản cho vay mùa Tết có xấu hơn bình thường không? Câu trả lời nằm ở cohort giải ngân, tức những khoản giải ngân cùng tháng được theo dõi theo tuổi.
- `outcomes`:
  - Chia truy vấn dài thành từng bước có tên (`cte`).
  - Gom theo tháng giải ngân (`date_bucket`).
  - So với tháng trước của cùng khoản vay (`window_lag`).

| Id | Beat | Gửi | Câu hỏi | Solution | Ghi chú |
|---|---|---|---|---|---|
| fin-ch4-01 | teach, worked; grants `cte` | Huỳnh Kim Ngân | Khoản giải ngân trong tháng {{month}}: bao nhiêu khoản, bao nhiêu khoản **từng** quá hạn trên 30 ngày ở một cuối tháng nào đó, và tỷ lệ % (làm tròn 2 chữ số, chỉ ở con số cuối). | `WITH worst AS (SELECT loan_id, MAX(dpd) AS max_dpd FROM loan_snapshots GROUP BY loan_id) SELECT count(*), count(*) FILTER (WHERE max_dpd > 30), ROUND(100.0 * … / count(*), 2) FROM loans l LEFT JOIN worst w …` | 1 dòng. Biến thể: 12/2025, 1/2026, 4/2026. Ví dụ mẫu: CTE đếm hồ sơ theo kênh rồi lọc. Wrong: dùng DPD của cuối tháng 10 thay vì "từng". |
| fin-ch4-02 | develop, faded; grants `date_bucket` | Phùng Đức Lâm | Mỗi tháng từ {{first}} tới {{last}}: tháng (ghi bằng ngày đầu tháng), số khoản giải ngân, tổng tiền gốc. Tháng sớm nhất trước. | `date_trunc('month', disbursed_on)::date`, `GROUP BY 1 ORDER BY 1` | `ordered`. Biến thể: 11/2025–10/2026, 1–12/2025, 7/2024–6/2025. Wrong: gom theo số tháng 1–12. |
| fin-ch4-03 | twist; grants `window_lag` | Mạc Văn Toàn | Tỷ lệ chuyển nhóm: các khoản đang ở nhóm nợ 1 cuối tháng {{prev}}, cuối tháng {{month}} nằm ở nhóm nào? Mỗi nhóm 0–3: số khoản; nhóm 0 trước. Khoản đã tất toán hay xóa nợ (không còn trong ảnh chụp tháng sau) thì bỏ. | `WITH b AS (SELECT loan_id, month_end, CASE … AS bucket FROM loan_snapshots), l AS (SELECT *, LAG(bucket) OVER (PARTITION BY loan_id ORDER BY month_end) AS prev FROM b) SELECT bucket, count(*) FROM l WHERE month_end = … AND prev = 1 GROUP BY 1 ORDER BY 1` | `ordered`. Biến thể: (9→10/2026), (8→9/2026), (7→8/2026). Twist: `LAG` phải chia theo từng khoản. Wrong: thiếu `PARTITION BY`. |
| fin-ch4-04 | rest; `adv: [a3]` | Lư Thảo Vy | Mỗi ngày từ 10/02 đến hết 24/02/2026, **kể cả ngày không giải ngân**: ngày, tổng tiền giải ngân (0 nếu không có). Ngày sớm trước. | `generate_series('2026-02-10'::date, '2026-02-24', interval '1 day')` `LEFT JOIN loans …` `COALESCE(SUM(principal), 0)` | `ordered`. `requires` `left_join`, `coalesce` (F2), `aggregate`, `group_by`, `order_by` (F1): đạt luật rest. Gợi ý 2 ghi sẵn `generate_series`. Móc H5. |
| fin-ch4-05 | boss; `adv: [b2]` | Lương Bảo Châu | **Đánh giá thăng tiến: cohort mùa Tết.** (1) Mỗi tháng giải ngân từ 8/2025 tới 6/2026: tháng (ngày đầu tháng), số khoản; tháng sớm trước. (2) Mỗi tháng giải ngân đó: tỷ lệ % khoản quá hạn trên 30 ngày **ở cuối tháng thứ 3 sau tháng giải ngân** (khoản không còn trong ảnh chụp tính là không quá hạn), làm tròn 2 chữ số; tháng sớm trước. (3) Tổng dư nợ toàn công ty cuối mỗi tháng 5–10/2026 và mức tăng so với cuối tháng trước; tháng sớm trước. | (1) `date_trunc` + `GROUP BY`. (2) CTE cohort, ảnh chụp có `month_end = (date_trunc('month', disbursed_on) + interval '4 month' - interval '1 day')::date`. (3) CTE tổng theo tháng + `LAG`. | `ordered: true`. `requires` `cte`, `date_bucket`, `window_lag`, `case_when`, `conditional_agg`, `join`, `aggregate`, `group_by`, `order_by`. Kết luận: "Cohort nào xấu nhất ở tháng thứ 3?" → giải ngân tháng 1 và 2/2026, mùa Tết (H2). **T0:** (1) 11 tháng, 92 (2/2026) tới 186 khoản. (2) 1/2026 12,43, 2/2026 7,61, các tháng khác 1,29–5,31. (3) **chốt: tháng 5 có mức tăng** (CTE lấy từ cuối tháng 4, lọc `>= 2026-05-31` sau `LAG`): dư nợ 19,40 tỷ (5) → 24,58 tỷ (10), mức tăng 1,13 / 0,83 / 1,16 / 1,63 / 1,04 / 0,51 tỷ. Đề phải nói "tháng 5 so với cuối tháng 4". |

### F5 · Ngân sách và thực tế

- `career`: Chuyên viên rủi ro tín dụng · ngân sách / *Credit Risk Analyst · budgeting*
- `tables`: `accounts`, `budgets`, `gl_entries`
- `story`: Mùa lập ngân sách 2027. Kế toán trưởng cần biết chi nhánh nào chi vượt, khoản mục nào chưa có kế hoạch, và lũy kế từ đầu năm đang ở đâu.
- `outcomes`:
  - Đặt ngân sách cạnh thực chi mà không mất dòng nào ở hai bên (`full_join`).
  - Lũy kế và tỷ trọng mà không mất dòng (`window_agg`).
  - So với một con số tính từ cả bảng (`scalar_subquery`).

| Id | Beat | Gửi | Câu hỏi | Solution | Ghi chú |
|---|---|---|---|---|---|
| fin-ch5-01 | teach, worked; grants `full_join` | Lư Thảo Vy | Tháng {{month}}, chi nhánh {{branch}}: mọi khoản mục chi phí có ngân sách hoặc có chi, gồm mã khoản mục, ngân sách, thực chi; bên nào không có ghi 0. Theo mã khoản mục. | `WITH b AS (ngân sách theo khoản mục), a AS (thực chi theo khoản mục) SELECT COALESCE(b.account_id, a.account_id), COALESCE(b.amount, 0), COALESCE(a.amount, 0) FROM b FULL JOIN a ON a.account_id = b.account_id ORDER BY 1` (mỗi CTE lọc khoản chi bằng ghép `accounts`) | `ordered`. Biến thể (T0): (8/2026, Hoi An), (7/2026, Tam Ky), (5/2026, Hue), mỗi biến thể 7 dòng. Cả ba là tháng 1–2 của quý, nên `IT` có ngân sách mà thực chi 0 (H8); tháng cuối quý thì `LEFT JOIN` từ phía thực chi sẽ trùng Solution. Ví dụ mẫu: FULL JOIN ngân sách quý với chi quý theo chi nhánh. Wrong: `LEFT JOIN` từ ngân sách (mất `Other Opex`); `LEFT JOIN` từ thực chi (mất `IT`). |
| fin-ch5-02 | develop, faded; grants `window_agg` | Phùng Đức Lâm | Năm 2026, sản phẩm {{product}}: mỗi tháng, tiền giải ngân trong tháng và lũy kế từ đầu năm. Tháng sớm trước. | CTE theo tháng + `SUM(x) OVER (ORDER BY month)` | `ordered`. Biến thể: Cash Loan, Phone Instalment, Motorbike Instalment. Wrong: `SUM(x) OVER ()`. |
| fin-ch5-03 | twist; grants `scalar_subquery` | Tạ Minh Nhật | Quý {{q}}/2026: chi nhánh nào có tổng chi phí cao hơn mức chi trung bình **mỗi chi nhánh** của cả công ty? Mã chi nhánh, tổng chi; cao trước, bằng nhau thì mã nhỏ trước. | `… GROUP BY branch_id HAVING SUM(amount) > (SELECT SUM(amount) / COUNT(DISTINCT branch_id) FROM … ) ORDER BY 2 DESC, 1` (chỉ khoản chi) | `ordered`. Biến thể: Q3, Q2, Q1; mỗi biến thể 4 dòng, cùng các chi nhánh 1, 5, 3, 7 nhưng tổng chi khác nhau. Twist: trung bình mỗi bút toán ≠ trung bình mỗi chi nhánh. Wrong: `> (SELECT AVG(amount) …)`. |
| fin-ch5-04 | rest; `adv: [a4]` | Lư Thảo Vy | Tổng thực chi quý 3/2026 theo vùng và chi nhánh, kèm dòng tổng của từng vùng và dòng tổng công ty. Vùng, tên chi nhánh, tổng chi; theo vùng rồi chi nhánh, dòng tổng đứng cuối nhóm của nó. | `gl_entries → branches → accounts`, `GROUP BY ROLLUP (b.region, b.name) ORDER BY b.region NULLS LAST, b.name NULLS LAST` | `ordered`. `requires` `multi_join` (F3), `aggregate`, `group_by`, `order_by` (F1): đạt luật rest. Gợi ý 2 ghi sẵn `ROLLUP`. Nhãn `columns:` nói ô trống ở dòng tổng. |
| fin-ch5-05 | boss | Lương Bảo Châu | **Đánh giá thăng tiến: ngân sách quý 3.** (1) Toàn công ty quý 3/2026: mọi khoản mục chi phí có ngân sách hoặc có chi, gồm mã, ngân sách, thực chi, chênh lệch (thực chi trừ ngân sách); bên trống ghi 0; chênh lệch lớn trước, bằng nhau theo mã. (2) Chi nhánh có thực chi Marketing quý 3 cao hơn mức Marketing trung bình mỗi chi nhánh: tên, vùng, số tiền; cao trước. (3) Chi nhánh Hoi An năm 2026: mỗi tháng, thực chi lũy kế và ngân sách lũy kế từ đầu năm; tháng sớm trước. | (1) `FULL JOIN` hai CTE. (2) 3 bảng + truy vấn con vô hướng. (3) `FULL JOIN` theo tháng rồi hai cột `SUM() OVER (ORDER BY month)`. | `ordered: true`; bước 2 bằng số tiền thì theo tên. `requires` `full_join`, `window_agg`, `scalar_subquery`, `multi_join`, `cte`, `aggregate`, `group_by`, `order_by`. Kết luận: "Phần vượt ngân sách quý 3 đến từ đâu?" → Marketing ở Hoi An (H3). **T0:** (1) 7 dòng; đầu bảng là `Marketing` +53.091.000, rồi `Other Opex` +13.467.000 (ngân sách 0). Cả quý luôn có thực chi `IT`, nên ở bước này `LEFT JOIN` từ phía thực chi trùng Solution; chỉ `LEFT JOIN` từ phía ngân sách là sai. (2) 3 dòng: Hoi An 144.800.000, Da Nang 128.888.000, Hue 99.143.000. (3) 12 dòng: lũy kế thực chi dừng ở 3.108.159.000 sau tháng 10, lũy kế ngân sách tới 3.682.200.000 (tháng 12). |

### F6 ★ · Báo cáo rủi ro quý

- `career`: Chuyên viên rủi ro cao cấp / *Senior Risk Analyst* · `tier: true` ★
- `tables`: `collection_calls`
- `story`: Ban điều hành họp quý. Tỷ lệ quá hạn chung vẫn ổn, nhưng một chi nhánh đang xấu đi nhanh. Bạn soạn báo cáo: ai xếp cuối, vì sao, và đội thu hồi nợ đã gọi đủ chưa.
- `outcomes`:
  - Xếp hạng trong từng nhóm (`window_rank`).
  - Chia một báo cáo thành nhiều bước có tên (`multi_cte`).
  - Tìm thứ không có: khoản quá hạn chưa ai gọi (`anti_join`).

| Id | Beat | Gửi | Câu hỏi | Solution | Ghi chú |
|---|---|---|---|---|---|
| fin-ch6-01 | teach, worked; grants `window_rank` | Huỳnh Kim Ngân | Cuối tháng {{month}}, trong mỗi vùng: xếp hạng chi nhánh theo **số khoản** quá hạn trên 30 ngày (nhiều nhất hạng 1; bằng nhau cùng hạng, hạng sau nhảy cách). Vùng, tên chi nhánh, số khoản, hạng; theo vùng, hạng, tên. | CTE `count(*) FILTER (WHERE dpd > 30)` theo chi nhánh (3 bảng) + `RANK() OVER (PARTITION BY region ORDER BY overdue DESC)` | `ordered`. **T0 đổi tỷ lệ → số khoản:** tỷ lệ 2 chữ số không bao giờ bằng nhau, nên `ROW_NUMBER` sẽ trùng `RANK`; số khoản thì có hòa. Biến thể (T0): 10/2026 (north: Dong Ha = Lien Chieu = 4), 7/2026 (north: Hue = Lien Chieu = 6; south: Quang Ngai = Quy Nhon = 9), 6/2026 (north: Hue = Lien Chieu = 4). Tháng 8/2026 không có hòa nên bị bỏ. Ví dụ mẫu: xếp hạng sản phẩm theo tổng giải ngân trong từng loại sản phẩm. Wrong: `ROW_NUMBER`. |
| fin-ch6-02 | develop, faded; grants `multi_cte` | Mạc Văn Toàn | Tháng {{month}}: với mỗi kết quả cuộc gọi nhắc nợ, số cuộc gọi và số cuộc mà khoản vay có tiền về trong 7 ngày kể từ ngày gọi (tính cả ngày gọi và ngày thứ 7). | `WITH calls AS (…), paid AS (SELECT DISTINCT c.id FROM calls c JOIN repayments r ON r.loan_id = c.loan_id AND r.paid_on BETWEEN c.called_on AND c.called_on + 7) SELECT c.outcome, count(*), count(p.id) FROM calls c LEFT JOIN paid p ON p.id = c.id GROUP BY c.outcome` | Không xếp thứ tự. Biến thể: 10, 9, 8/2026. Starter có sẵn hai khối `WITH`, trống ở điều kiện ngày và cột đếm. Wrong: `< c.called_on + 7`. |
| fin-ch6-03 | twist; grants `anti_join` | Mạc Văn Toàn | Khoản quá hạn trên 30 ngày ở cuối tháng {{month}} mà **cả tháng đó chưa có cuộc gọi nhắc nợ nào**: mã khoản vay, mã chi nhánh, số ngày quá hạn; quá hạn lâu nhất trước, bằng nhau theo mã. | `snapshots → loans LEFT JOIN collection_calls c ON c.loan_id = l.id AND c.called_on` trong tháng `WHERE c.id IS NULL` | `ordered`. Biến thể: 10, 9, 8/2026. Twist: điều kiện tháng đặt ở WHERE thì thành "chưa bao giờ được gọi". Wrong: điều kiện ngày ở WHERE. Móc H7. |
| fin-ch6-04 | rest; `adv: [a2]` | Phùng Đức Lâm | Khoản giải ngân năm 2026, mỗi sản phẩm: tên sản phẩm, trung vị tiền gốc, tiền gốc trung bình (cả hai làm tròn tới đồng); trung vị lớn trước, bằng nhau theo tên sản phẩm. | `round(percentile_cont(0.5) WITHIN GROUP (ORDER BY principal)::numeric)`, ghép `products`, `ORDER BY 2 DESC, 1` | `ordered`. `requires` `join` (F2), `aggregate`, `group_by`, `order_by` (F1): đạt luật rest. Gợi ý 2 ghi sẵn cú pháp. Móc H11. **T0:** 5 dòng. Motorbike 41.000.000 / 40.178.295, …, Salary Advance 5.500.000 / 5.195.238. Wrong: `round(avg(…))` ở cột 2. |
| fin-ch6-05 | boss | Lương Bảo Châu | **Đánh giá thăng tiến: báo cáo rủi ro quý 3 cho ban điều hành.** (1) Mỗi chi nhánh, cuối mỗi tháng 7–10/2026: tỷ lệ % dư nợ quá hạn trên 30 ngày và mức thay đổi so với cuối tháng trước (điểm %, 2 chữ số; tháng 7 so với tháng 6); theo tên chi nhánh rồi tháng. (2) Cuối tháng 10/2026, hạng của từng chi nhánh trong vùng theo tỷ lệ đó (cùng luật hạng F6-01); theo vùng, hạng, tên. (3) Chi nhánh Quang Ngai: khoản giải ngân tháng 3–5/2026 qua kênh đối tác, quá hạn trên 30 ngày cuối tháng 10 mà tháng 10 chưa ai gọi: mã khoản, số ngày quá hạn; quá hạn lâu trước, bằng nhau theo mã. | (1) Hai khối `WITH` + `LAG` theo chi nhánh. (2) `RANK() OVER (PARTITION BY region …)`. (3) `snapshots → loans → applications` + anti join `collection_calls`. | `ordered: true`. `requires` `window_rank`, `multi_cte`, `anti_join`, `window_lag`, `cte`, `case_when`, `conditional_agg`, `multi_join`, `aggregate`, `group_by`, `order_by`. Kết luận: "Nợ quá hạn đang tăng ở đâu và vì đâu?" → Quang Ngai, khoản qua kênh đối tác giải ngân tháng 3–5/2026, nhiều khoản chưa được gọi (H1, H7). **T0:** (1) 32 dòng; Quang Ngai 6,39 (+2,17) → 9,96 (+3,57) → 11,14 (+1,18) → 14,24 (+3,10), tăng cả 4 tháng; tháng 10 mọi chi nhánh khác ≤ 3,43. (2) Quang Ngai hạng 1 vùng `south` (14,24); Da Nang hạng 1 vùng `central` (3,43). Bước 2 xếp theo tỷ lệ, không có hòa, nên `RANK` = `ROW_NUMBER` ở bước này (không phải bẫy). (3) 16 khoản, DPD 132…33. |

**Đếm kiểm** (để Plan 11 đối chiếu với `contentProblems`):
- **Grants:** F1 6, F2 4, F3 4, F4 3, F5 3, F6 3 = 23. Mỗi kỹ năng đúng một lần; không boss nào dạy kỹ năng.
- **Twist → boss:** kỹ năng của mọi twist có trong `requires` của boss chương đó.
- **Rest từ F4** (`REST_RULE_FROM`) đạt luật: F4-04, F5-04, F6-04.
- **Một `faded` mỗi chương**, là develop đầu. Teach mọi chương là `worked`.
- **Biến thể ≥ 3** ở 18 việc dạy.
- **`requires` của việc thường** ghi đủ các kỹ năng Solution dùng (vd. `fin-ch2-03` cần `join`; `fin-ch4-01` cần `left_join`, `conditional_agg`). Plan 11 điền đủ khi viết SQL.

---

## 5. Bảng điều hành, thẻ khởi đầu, cảnh và hoạt cảnh

### 5.1 KPI: `content/domains/fin/kpis.yml`

Cùng định dạng `kpis.yml`. Số tính lúc chạy từ Solution (biến thể 0) trên schema `finance`; ô mở khi xong ticket nguồn.

| id | ticket | kind | Nhãn VI / EN | icon, unit |
|---|---|---|---|---|
| `finDisbursedByProduct` | fin-ch1-03 | bar (col 2) | Tiền giải ngân quý 1/2026 theo sản phẩm / Q1 2026 disbursements by product | chart, đồng/VND |
| `finLateRepayments` | fin-ch2-02 | rowcount | Kỳ đến hạn tháng 10/2026 trả trễ / October 2026 instalments paid late | clockAlert |
| `finOver30Trend` | fin-ch3-02 | bar (col 2) | Khoản quá hạn trên 30 ngày, cuối mỗi tháng 5–10/2026 / Loans over 30 days past due, month ends May–Oct 2026 | chart |
| `finDisbursedMonthly` | fin-ch4-02 | bar (col 2) | Tiền giải ngân từng tháng, 11/2025–10/2026 / Monthly disbursements, Nov 2025–Oct 2026 | trophy, đồng/VND |
| `finUncalled` | fin-ch6-03 | rowcount | Khoản quá hạn trên 30 ngày chưa được gọi trong tháng 10 / Loans over 30 days past due with no call in October | clockOff |

Icon dùng tên có sẵn trong `icons.ts`. Không cần icon mới.

### 5.2 Thẻ khởi đầu: `STARTERS.finance` (`src/starterCards.ts`)

Bốn thẻ, chỉ bảng mở ở F1, ngày cố định, `ORDER BY` đủ, **không trùng Solution hay ô KPI nào** (`tests/starterCards.test.ts` chạy trên DB đã seed).
- `s-customers` (number): `SELECT COUNT(*) AS customers FROM customers`.
- `s-channel` (bar, col 1): hồ sơ theo kênh nộp, `GROUP BY channel ORDER BY applications DESC, channel`.
- `s-applications` (line, col 1): số **hồ sơ** nộp mỗi tháng 11/2025–10/2026. Hồ sơ, không phải khoản giải ngân, để khác `fin-ch4-02`.
- `s-products` (table): `SELECT name, kind, rate_month_pct FROM products ORDER BY kind, name`. Khác mọi cột Solution F1.

Tiêu đề: `starter.fi.customers|channel|applications|products` (4 khóa VI/EN).

### 5.3 Cảnh và bản đồ: `src/art/finance.ts`, chunk lười `finance`

Theo đúng khuôn `src/art/ecommerce.ts`: hàm thuần, `initArt({ t, chapterColor, s })`, không `import` giá trị từ main (Plan 6 U3), chữ SVG ẩn dưới `lg` và lặp lại bằng HTML (L35), phần trang trí `aria-hidden`. Hai hình cùng khung (`aspect-*`, `bg-accent-soft`) như E-com.

- **Cảnh Tổng quan** (`jarScene`, `aspect-[1100/400]`, cao tối đa ~240 px như v11 UX #2):
  - Quầy giao dịch nhỏ: mái hiên, hai ô cửa, cây cau. Giữa cảnh là **một hũ thủy tinh**.
  - **Mỗi việc xong là một đồng xu trong hũ**, màu theo chương (`chapterColor`), xếp từ đáy lên. 30 việc = hũ đầy.
  - **Đánh giá thăng tiến dán một nhãn sao** lên hũ (3 sao ở F1/F4/F6).
  - Theme tối: đèn trong quầy sáng, cùng cơ chế ban đêm của v12.1.
  - Cảnh này thay motif hải đăng của v7, vì tên mới không còn "hải đăng".
- **Bản đồ chi nhánh** (`branchMap`, `aspect-[980/300]`; trang `#/d/finance/map`, section tuyến trên Tổng quan, hộp thoại bản đồ của thanh việc):
  - Bờ biển miền Trung cách điệu, trụ sở ở Da Nang.
  - **8 chi nhánh = 2 mở từ đầu + 1 sau mỗi đánh giá thăng tiến F1…F6**: Da Nang (Hai Chau) và Hoi An từ đầu; Hue (F1), Da Nang Lien Chieu (F2), Tam Ky (F3), Dong Ha (F4), Quang Ngai (F5), Quy Nhon (F6).
  - Tên phải khớp `branches.name` (`tests/finArt.test.ts`, như `ecomArt.test.ts`).
  - **Không vẽ dòng tiền hay độ dày theo số tiền** (khác v7 §3.4). Bản đồ chi nhánh giữ đúng mẫu "mở theo thăng tiến" của E-com; không có kiểu biểu đồ mới (D-F7).
- **Chữ của art chia hai nơi (D-F11):**
  - **Main (`vi.ts`/`en.ts`)**: chữ hiện **trước khi** chunk art tải, và hiện cả ở M1 khi chưa có chunk art: tiêu đề cảnh (`fin.scene.title`: "Quầy Hũ Bạc, Đà Nẵng"), tiêu đề bản đồ (`fin.map.title`: "Bản đồ chi nhánh"), dòng chú giải (`fin.scene.callout`: "Mỗi việc xong là một đồng xu vào hũ; mỗi lần thăng tiến mở thêm một chi nhánh."). Tính vào main ở §6.5.
  - **Chunk art** (bảng VI/EN nhỏ trong `src/art/finance.ts`, như `src/i18n/learn.ts`): chữ chỉ hình vẽ dùng: "{name}: đang hoạt động", "{name}: mở sau đánh giá thăng tiến chương {n}", nhãn `aria-label` của cảnh và bản đồ.
- **Nối vào trang:**
  - Đổi `src/ui/ecomArt.ts` thành `src/ui/domainArt.ts`: một `loadDomainArt(domain)` với map `{ ecommerce: () => import('../art/ecommerce'), finance: () => import('../art/finance') }`, và một `domainArt(kind)` theo `activeDomain()`.
  - Ba chỗ gọi (`homeView.ts` ×2, `mapStrip.ts`) đổi tên, không thêm nhánh.
  - Hai art xuất cùng tên hàm (`scene`, `map`, `items`).
  - Không thêm interface chung: hai module cùng hình dạng là đủ (D9-13 nói "tạo interface khi có Finance"; ở đây kiểu `typeof import(...)` đã đủ kiểm).

### 5.4 Khi xong việc

Giống E-com (D9-14): `celebrate()` + một câu qua `#announce`. Không dock, không hoạt cảnh mới.
- **Sửa `stage.ts:156`:** hiện ở mọi domain không phải Logistics đều đọc câu E-com ("kiện hàng lên kệ"). Đổi thành khóa theo domain: `domain.done.<id>` / `domain.promoted.<id>`.
- **Finance VI:**
  - "Xong việc: {title}. Thêm một đồng vào hũ."
  - "Lên bậc mới: {rank}. Thêm một chi nhánh trên bản đồ." (chung chung như E-com: tên chi nhánh nằm trong chunk art, câu này ở main)
- **Finance EN:**
  - "Task done: {title}. One more coin in the jar."
  - "New step: {rank}. One more branch on the map."
- Hoạt cảnh đồng xu rơi vào hũ / hũ sáng lên (thay "hải đăng bật đèn" của v7) là **M3 tùy chọn**, không nằm trong build này (D-F6). Khi làm thì theo luật L29/L31: ≤ 3 s, bỏ qua được, reduced motion chỉ hiện trạng thái cuối.

### 5.5 Linh vật và hướng dẫn

- **Không hướng dẫn Boon nào trong Finance.** Ranh giới v13 vẫn đúng: `offeredIds` rỗng ở mọi trang domain (L82, L98); test thêm ca Finance.
- **Tour 8 bước giữ nguyên ở ticket 1 Logistics.** Cổng tab theo tiến độ (`TabSpec.from`) chỉ có ở Logistics (L76), nên người chọn Finance từ màn chào thấy đủ tab như ở E-com.
- **Gợi ý → điền khung** (v13) tự có ở mọi ticket Finance, vì khung sinh từ Solution. Không ticket nào có bước lab chỉ mục.
- **Lily** vẫn lớn theo `knownSkills` của Logistics (L87). Không đổi.

---

## 6. Save, chunk, route, Trang chủ

### 6.1 Save v5

- **Mã:** `SAVE_VERSION = 5`.
  - `byDomain: { ecommerce: DomainSlot; finance: DomainSlot }`.
  - `MIGRATIONS[4] = (d) => ({ ...d, byDomain: { ...d.byDomain, finance: emptySlot() } })`.
  - `emptySave()` và `parseSave` (`readSlot`) thêm slot `finance`.
- **Id:** `FIN_ID = /^fin-ch\d{1,2}-\d{2}$/` vào `isWorkId` (`src/save.ts:125`), cạnh `DRILL_ID`, `ECOM_ID`.
- **`domainSlot(save, id)`:** `id === 'logistics' ? save : save.byDomain[id]`. Bỏ nhánh `=== 'ecommerce'`.
- **Vì sao phải nâng version** (như D9-11): một bản build v4 gặp save có id `fin-` sẽ lọc mất các id đó và slot Finance khi ghi đè. Nâng lên v5 thì bản cũ đẩy save v5 vào `.bak` (`NewerSaveError`).
- **Fixture:** `tests/fixtures/save-v5.json` mới, có `fin-ch1-01`, một card Finance, nháp Sandbox Finance. Fixture v1–v4 giữ mãi, không sửa.
- **Test:** `tests/saveV5.test.ts` (chép khuôn `saveV4.test.ts`): v4 → v5, đọc nguyên v5, id `fin-x` bị bỏ, build v4 gặp v5 → `NewerSaveError`, `domainSlot` ba domain. Trong `saveV4.test.ts`, ca "SAVE_VERSION 4" dời sang v5; ca so object dùng `parseSave(…, MIGRATIONS, 4)`.
- **Phát hành riêng** (luật CLAUDE.md, Plan 1c): release Finance chỉ mang thay đổi Save này.
- **Tên release:** v7 gọi là v12.3, nhưng v13 đã ra trước. Đề xuất gọi **v14**.

### 6.2 Domain và route

**`src/domains.ts`:**
- `finance` → `live: true`; `desc` mới.
- `SCHEMAS.fin = 'finance'`; `DOMAIN_SCHEMA.finance = 'fin'`.
- `FIN_TABLES` (12 tên).
- `FIN_ID`.
- Thêm `DOMAIN_ID: Record<Exclude<DomainId,'logistics'>, RegExp>` để `topbar.ts:54` (dòng "{n} việc đã xong") và `main.ts:269` (domain sở hữu một ticket id) đọc một bảng, không viết `if` thứ ba.

**Route:**
- `#/d/finance`, `#/d/finance/play|data[/t]|dashboard|map` hoạt động như E-com, không cần route mới.
- **Gỡ "Sắp có"** (D-F8): sau Finance không còn domain nào `live: false`.
  - Bỏ `soon` khỏi `ROUTES`, `soonDomainOf`, nhánh `soon` trong `parseRoute`, section `soon` (`homeView.ts:101,414`), khóa `soon.*` (5 khóa VI + EN), `financeSoon()` trong `src/art/illustrations.ts`.
  - Kiểu `DomainId` giữ nguyên.
  - Domain thứ tư sau này thì lấy lại trang này từ git.
  - Hash cũ `#/d/finance` nay là Tổng quan Finance, nên link cũ vẫn chạy.
  - Pref `cargo-query/route` đã lưu `'soon'`: `initialRoute` chỉ nhận giá trị có trong `ROUTES` (`isRoute`), nên đọc thành `'home'`. Thêm một ca vào `tests/route.test.ts`.
  - `tests/route.test.ts` và `tests/noDeadEnds.test.ts` sửa theo.

**Màn chọn domain (`welcome.ts`):**
- Tự liệt kê domain `live`, nên Finance hiện mà không sửa mã.
- Sửa chú thích dòng 38.
- `domain.financeDesc` mới: "Tín dụng Hũ Bạc, công ty cho vay tiêu dùng hư cấu ở miền Trung: 6 chương từ sổ vay, kỳ trả, nợ quá hạn, cohort, ngân sách tới báo cáo rủi ro." EN không dấu.
- Thứ tự `DOMAINS` giữ: Logistics, Finance, E-commerce.

**Trang chủ:**
- Thẻ domain Finance có dòng "{n} việc đã xong", qua `DOMAIN_ID`.
- Dòng tiếp tục (`resumeLine`) đã liên domain, không đổi.

**Chuyển domain:**
- `enterDomain('finance')` dùng nguyên luồng E-com: `loadDomain`, `ensure('fin')`, `clearMemos`, `resetCards`, story mode, cột autocomplete.
- `loadDomain` (`src/content.ts:47`) đổi từ `if (id !== 'ecommerce')` sang map `{ ecommerce: () => import('./ecomSources'), finance: () => import('./finSources') }` với cùng phần thân.
- Banner: `ecom.loading`/`ecom.failed` đổi thành `domain.loading`/`domain.failed` có `{name}`. Bỏ hai khóa E-com, thêm hai khóa chung, nên main không tăng.

**`src/import/myData.ts`:**
- Tên CSV trùng = `LOGISTICS_TABLES` ∪ `ECOM_TABLES` ∪ `FIN_TABLES`.
- Có thêm `loans.csv` → `loans_my` ở mọi domain.

**Các chỗ rẽ nhánh theo domain** (`grep "activeDomain() [!=]== 'logistics'"`, 12 chỗ). Có hai loại:
- **Chặn phần riêng Logistics, đúng sẵn cho Finance:** `state.ts:115` (bảng làn), `tabs.ts:79` (cổng tab), `brief.ts:272` (cú pháp thẻ kỹ năng), `homeView.ts:448`, `mapStrip.ts:209` (đếm làn).
- **Nhánh "không phải Logistics" thật ra là E-com.** Ở M1 sẽ hiện chữ/hình E-com trong Finance, nên **phải sửa ở T5** (không đợi T6):
  - `brief.ts:242` (`ecom.briefStory` "Tuần này ở Chợ Lồng Đèn") và `dataView.ts:79` (`ecom.dataIntro`): đổi sang một bảng khóa theo domain trong main (`fin.briefStory` "Tuần này ở Hũ Bạc", `fin.dataIntro`).
  - `homeView.ts:285/317` và `mapStrip.ts:58`: đang gọi `ecomArt()` và in `ecom.scene.title`, `ecom.map.title`, `ecom.scene.callout`. Ở T5, nhánh Finance vẽ khung giữ chỗ + tiêu đề + dòng chú giải `fin.*` (không gọi `ecomArt`); T6 thay khung bằng hình.
  - `stage.ts:156`: câu hoàn thành theo domain (§5.4).
  - `session.ts:98` (`sandboxStarter` ngoài Logistics = `SELECT * FROM products LIMIT 20`): bảng `products` có ở Finance chương 1, chạy đúng; không sửa, chỉ sửa chú thích.
- Tên công ty (`ecom.company`) cũng thành bảng theo domain (`fin.company`).

**Neo grep cho Plan 11:**

```
grep -rn "'ecommerce'\|ECOM_ID\|ECOM_TABLES\|ecomArt\|ecom\.\(loading\|failed\|done\|promoted\|homeLine\)" src --include=*.ts
grep -rn "soon\|financeSoon\|soonDomainOf" src tests --include=*.ts
grep -rn "activeDomain() [!=]== 'logistics'" src --include=*.ts
```

### 6.3 Nội dung

- `content/domains/fin/`: `chapters.yml` (có `tables:`), `people.yml`, `kpis.yml`, `tickets/ch1..6/*.md`.
- `src/finSources.ts`: `import.meta.glob` giống `src/ecomSources.ts`.
- Kỹ năng dùng lại id `skills.yml`; chương của kỹ năng trong domain = chương ticket dạy nó (`domainSkills`).
- **`adv:` trong frontmatter** (`src/tickets.ts`):
  - Mảng id, kiểm lúc parse bằng `/^[a-d]\d{1,2}$/`.
  - Chip "Dựa vào" ở `ui/brief.ts`; hàng chương trên Tổng quan lấy hợp các `adv` của ticket trong chương.
  - Khóa i18n: `brief.adv` ("Dựa vào") và `brief.advLoading` ("Bài nâng cao liên quan").
  - Ticket Logistics/E-com không có `adv:` nên không đổi gì.

### 6.4 Ngân sách gzip (`scripts/check-budget.mjs`)

| Nhóm | Regex | Trần | Ước | Căn cứ |
|---|---|---|---|---|
| `fin` (mới) | `/^finSources-/` | 50 KB | ~40 | 30 ticket + 3 yml; E-com đo 38,7 KB |
| `finseed` (mới) | `/^finSeed-/` | 10 KB | ~8 | `ecomSeed` 7,6 KB; seed Finance có thêm khối tính `loan_snapshots` |
| `finart` (mới) | `/^finance-/` | 10 KB | ~4 | `ecomart` cùng cỡ + bảng chữ VI/EN |
| `illustrations` | có | 15 | −1–2 | bỏ `financeSoon()` |
| `general` | có | 70 | 0 | chip `adv` dùng chunk sẵn có |

Đặt ba nhóm mới trước `rest`.

**Lưu ý regex `finart`:** `/^finance-/` không được bắt nhầm `finSources-`/`finSeed-`. Hai tên kia bắt đầu bằng `finS`, nên khác `finance-` ở ký tự thứ 4. Đặt nhóm art **sau** `fin` và `finseed`.

### 6.5 Main (287,7 / 290 KB, L99): cộng trừ từng phần

| Phần | KB gz (ước) |
|---|---|
| `domains.ts`: `FIN_TABLES`, `FIN_ID`, `DOMAIN_ID`, `SCHEMAS.fin` | +0,15 |
| Save v5 (migration, slot, `domainSlot` tổng quát) | +0,1 |
| `loadDomain` dạng map, `domainArt` tổng quát (thay `ecomArt`) | +0,1 |
| Chip `adv` (parse + brief + hàng chương) | +0,25 |
| `DEPT` Risk + Collections + 8 câu cảm ơn VI | +0,35 |
| `STARTERS.finance` (4 câu SQL + 4 tiêu đề VI) | +0,4 |
| Câu hoàn thành Finance (2 khóa) + `domain.financeDesc` dài hơn | +0,1 |
| Chữ trang domain ở main: `fin.company`, `fin.briefStory`, `fin.dataIntro`, `fin.scene.title`, `fin.scene.callout`, `fin.map.title` + bảng khóa theo domain | +0,3 |
| `domain.loading`/`failed` chung thay khóa `ecom.*` | ±0 |
| Gỡ trang "Sắp có" (route, section, 5 khóa `soon.*`) | −0,4 |
| **Cộng** | **+1,35 … +1,8 → ~289,1–289,5** |

**Dự phòng (D-F9)**, theo thứ tự, chỉ làm khi số đo sau T5 > 289,5:
1. Dời `STARTERS.finance` vào `content/domains/fin/starters.yml` trong chunk `finSources` (−0,4). Thẻ khởi đầu chỉ hiện trong domain, sau khi nội dung domain đã tải.
2. Dời 8 câu cảm ơn của Risk/Collections vào `people.yml` của Finance (−0,3). Việc này đổi kiểu `Dept.thanks` (Key → chuỗi theo ngôn ngữ), nên chỉ làm khi cần.
3. Nâng trần main lên 295 KB, **cần user đồng ý** (luật dừng L59).

---

## 7. Kế hoạch build (Plan 11): T0…T7

Mỗi task một commit (chỉ `git add` file của task).
- **Cổng mọi task sửa `src/`:** `npx tsc --noEmit && npm test`.
- **Task có build:** thêm `npm run build && node scripts/check-budget.mjs`, ghi `main`, `fin`, `finseed`, `finart`, `worker` vào commit.
- **Kiểm tay:** Edge, preview, hồ sơ mới; sáng + tối; 1440 / 1100 / 375 px (như L89/L92).

| Task | Nội dung | File chính | Test thêm/sửa | Cỡ |
|---|---|---|---|---|
| **T0** | Kiểm tiền đề, đo, chốt tên. (a) Kiểm thương hiệu tay "Hũ Bạc / Silver Jar Credit" (Cục SHTT, WIPO, Cổng DN quốc gia); trùng thì dừng, hỏi user. (b) Viết `schema.sql` + `seed.sql` nháp ở scratch, seed hai lần, so md5, **đo thời gian Node** (luật dừng 2,0 s). (c) Chạy Solution nháp của 30 ticket và 3 bước mỗi đánh giá, **sửa §4 theo số thật**: ngưỡng F3-03, đáp án kết luận, số dòng. Mọi kết quả phải > 0 dòng, các biến thể khác nhau từng đôi. (d) Chạy `frameOf()` trên SQL mẫu có `FULL JOIN`, `ROLLUP`, `WITHIN GROUP`, `generate_series`, `FILTER`, `LAG … OVER (PARTITION BY …)` (rủi ro R3). | scratch | — | S–M |
| **T1** | Schema `finance` + seed lười: `src/db/fin/{schema,seed}.sql`, `src/db/finSeed.ts` (`?raw`), loader `fin` trong `src/db/lab.ts`, `SCHEMAS.fin`, `FIN_TABLES`, `search_path` `finance, sandbox`. Nhóm ngân sách `finseed`. | `src/db/fin/*`, `src/db/finSeed.ts`, `src/db/lab.ts`, `src/domains.ts`, `scripts/check-budget.mjs` | **`tests/finSeed.test.ts`** (md5 12 bảng, móc H1–H11, `FIN_TABLES` = `CREATE TABLE` trong schema, hai schema cùng lúc: `customers` không tiền tố trả đúng domain), `tests/helpers.ts` (`finRunner`), `tests/lab.test.ts`/`ecomSeed.test.ts` không đổi | M |
| **T2** | Nạp nội dung domain + `adv:`: `src/finSources.ts`, `loadDomain` dạng map, parse `adv`, chip "Dựa vào" ở brief + hàng chương Tổng quan. Nhóm `fin`. | `src/content.ts`, `src/finSources.ts`, `src/tickets.ts`, `src/ui/brief.ts`, `src/ui/homeView.ts`, `src/i18n/{vi,en}.ts` | **`tests/finContent.test.ts`** (chép `ecomContent.test.ts`, đổi domain, thêm từ cấm ở §4, kiểm `adv`: id có trong `adv.yml` với status `in`/`partial`, chỉ ở ticket Finance; `requires` không chứa id `adv`), `tests/tickets.test.ts` (parse `adv`) | M |
| **T3** | Nội dung: 30 ticket VI + EN, `chapters.yml`, `people.yml`, `kpis.yml`; `DEPT` Risk/Collections + câu cảm ơn; `STARTERS.finance` + 4 tiêu đề. | `content/domains/fin/**`, `src/theme.ts`, `src/starterCards.ts`, `src/i18n/{vi,en}.ts` | `finContent` xanh trọn (~240 ca); **`tests/frame.test.ts`** gồm Solution Finance (mọi biến thể); `tests/blanks.test.ts` gồm Finance; `tests/starterCards.test.ts` thêm Finance; `tests/theme.test.ts` (tương phản 2 phòng mới); `tests/i18n.test.ts` quét `content/domains/fin/**` (không "boss", EN không dấu) | **L** (phần lớn công sức) |
| **T4** | Save v5. | `src/save.ts` | **`tests/saveV5.test.ts`**, `tests/fixtures/save-v5.json`, sửa `tests/saveV4.test.ts` | S |
| **T5** | Mở domain: `finance` live, `DOMAIN_SCHEMA`, `DOMAIN_ID`, `domainSlot` tổng quát, `topbar.ts:54`, `main.ts:269`, `myData.ts`, `stage.ts` câu theo domain, banner chung, các nhánh E-com ở `brief.ts:242`, `dataView.ts:79`, `homeView.ts:285/317`, `mapStrip.ts:58` (§6.2: khung giữ chỗ + chữ `fin.*`), gỡ trang "Sắp có", `financeSoon()`, mô tả domain. **Mốc M1:** Finance chơi được trọn 6 chương; Tổng quan và Bản đồ có khung giữ chỗ + dòng HTML, không chữ "sắp có". | `src/domains.ts`, `src/route.ts`, `src/ui/router.ts`, `src/main.ts`, `src/ui/topbar.ts`, `src/ui/homeView.ts`, `src/ui/brief.ts`, `src/ui/dataView.ts`, `src/ui/mapStrip.ts`, `src/ui/stage.ts`, `src/ui/welcome.ts`, `src/import/myData.ts`, `src/art/illustrations.ts`, `src/i18n/{vi,en}.ts` | `tests/route.test.ts`, `tests/noDeadEnds.test.ts`, `tests/startup.test.ts` (boot thẳng vào `#/d/finance` không seed Logistics), **`tests/guides.test.ts`** (`offeredIds` rỗng trong Finance), `tests/myData`/import (tên `loans` → `loans_my`) | M |
| **T6** | Art: `src/art/finance.ts` (`scene` hũ bạc, `map` chi nhánh, `items`, bảng chữ VI/EN), `src/ui/ecomArt.ts` → `src/ui/domainArt.ts`. Nhóm `finart`. **Mốc M2.** | `src/art/finance.ts`, `src/ui/domainArt.ts`, `src/ui/homeView.ts`, `src/ui/mapStrip.ts`, `scripts/check-budget.mjs` | **`tests/finArt.test.ts`** (tên chi nhánh = `branches.name`; 2 mở từ đầu; mỗi chương 1–6 mở đúng một), sửa `tests/ecomArt.test.ts` theo tên module mới | M |
| **T7** | Tài liệu và kiểm toàn bộ. (a) `CLAUDE.md` thêm mục "Domain Finance (Plan 11)": schema, chunk, `FIN_ID`, Save v5, `adv:`, luật nội dung, art, ngân sách; sửa câu "Coming soon". (b) Đo seed `finance` trên trình duyệt 3 lần (bấm thẻ Finance → Tổng quan có số); > 15 s thì báo. (c) Đi trọn 30 việc bằng Solution, đủ bước + câu kết luận; chức danh đổi ở F1/F4/F6; bản đồ mở đủ 8 chi nhánh; Ôn tập có thẻ từ việc Finance; Luyện tập chạy biến thể khác; gợi ý → điền khung ở một việc mỗi chương; chuyển qua lại 3 domain (editor, tab Cột, autocomplete, Bảng điều hành theo domain). (d) Ghi `review-log.md`. Orchestrator ghi L-số vào `decision-log.md`. | `CLAUDE.md`, `docs/team/review-log.md` | — | S–M |

**Thứ tự:** T0 → T1 → T2 → T3 → T4 → T5 (M1) → T6 (M2) → T7.
- **T4 phải xong trước T5.** Nếu Finance sống mà Save chưa biết `FIN_ID`, id `fin-` sẽ bị lọc khi ghi save và người chơi mất tiến độ.
- **T2 và T4 chạy song song được** (khác file).
- **Hết giờ giữa M1 và M2:** phát hành M1. Khung giữ chỗ + dòng HTML là trạng thái không ngõ cụt (như D9-20).

**Cỡ:** ~8–10 ngày agent + 1 ngày review end-user. T3 chiếm ~4 ngày.

---

## 8. Rủi ro

| # | Rủi ro | Giảm thiểu |
|---|---|---|
| R1 | **Main vượt 290 KB** (ước 289,1–289,5). | Đo ở T3 và T5; dự phòng §6.5 theo thứ tự. Nâng trần chỉ khi user đồng ý. |
| R2 | **Seed > 2,0 s Node** (~88k dòng + khối tính `loan_snapshots` bằng SQL). Trình duyệt ~5–8 lần chậm hơn (tỷ lệ L46). | Đo ở T0 trước khi viết ticket. Giảm `loans` trước. `loan_snapshots` tính bằng một `INSERT … SELECT` trên `generate_series` tháng, không vòng lặp. Banner "Đang chuẩn bị dữ liệu {name}…". |
| R3 | **(T0: đã kiểm, §3.4 (d): bất biến đạt; `ROLLUP` và `NULLS LAST` bị giấu, T3 sửa.)** **`frameOf()` (v13) chưa gặp** `FULL JOIN`, `ROLLUP (…)`, `WITHIN GROUP (ORDER BY …)`, `FILTER (WHERE …)`, `generate_series` trong FROM. Khung có thể lộ đáp án hoặc khó đọc; `tests/frame.test.ts` sẽ đỏ. | Kiểm ở T0(d). Chỉnh luật trong `src/frame.ts` (chunk `frame` đang 2,9/3 KB: có thể cần +1 KB trần nhóm này; nằm trong quyền của plan, không phải main). |
| R4 | **Số liệu ở §4 là mục tiêu**, chưa đo. Kết luận có thể sai, biến thể có thể trùng kết quả. | T0(c) chạy hết trước khi viết ticket. `finContent` kiểm mọi Solution × biến thể có dòng và khác nhau, mọi `wrong:` khác Solution. |
| R5 | **Tên chưa kiểm thương hiệu.** | T0(a) kiểm tay. Tên chỉ nằm trong i18n và lời văn, đổi dễ. |
| R6 | **Người mới vào thẳng Finance** gặp F1 dạy 6 kỹ năng trong 3 việc. | Ví dụ mẫu ở mọi teach; gợi ý chương 1 miễn phí; bài học nhanh của từng kỹ năng (chip kỹ năng → `openLesson`); điền khung. Theo dõi trong review end-user T7; nếu nặng, tách F1 thành 6 việc (luật chương không giới hạn số việc). |
| R7 | **`percentile_cont` trả `double precision`**; `ROUND(x)` cần ép `::numeric` (Postgres không có `round(double, int)`). Dòng tổng `ROLLUP` có NULL; grader so NULL theo vị trí. | Gợi ý 2 ghi sẵn `::numeric`. `finContent` chạy thật. Nhãn `columns:` nói ô trống ở dòng tổng. |
| R8 | **Ba schema cùng tên bảng** (`customers` ở cả ba, `products` ở E-com + Finance). | `search_path` theo request (Plan 9). Test hai schema cùng lúc ở T1. Kiểm tay: chạy `SELECT * FROM shipments` trong Finance → 42P01 có giải thích. |
| R9 | **Viết 30 ticket VI + EN** (~40 KB) là phần tốn nhất, dễ lệch luật đề. | Copy `content/TEMPLATE.md`. `finContent` quét luật đề. Review nội dung riêng trước T5. |
| R10 | **Gỡ trang "Sắp có"** làm mất chỗ sẵn cho domain thứ tư. | Lấy lại từ git khi cần (YAGNI). Hash cũ `#/d/finance` vẫn chạy. |

---

## 9. Quyết định cần duyệt (mặc định in đậm)

- **D-F1 (sửa).** Bỏ "Hải Đăng Tài Chính / Lighthouse Finance" vì trùng nhiều công ty tài chính có thật (§2.1). Dùng tên nào?
  - **Mặc định: "Tín dụng Hũ Bạc" / *Silver Jar Credit*, sau khi kiểm thương hiệu tay ở T0.**
  - Khác: user đặt tên.
- **D-F2 (giữ).** Bài nâng cao A2/A3/A4/B2 qua trường `adv:`, không thêm kỹ năng mới vào `skills.yml`? **(có)**
- **D-F3 (sửa).** Finance ra ở release riêng sau v13, có Save v5. **(có; gọi là v14)**
- **D-F4.** Finance tự dạy 23 kỹ năng theo thang §1.3, F1 dồn 6 kỹ năng nền, thay vì "kỹ năng giả định" trong engine? **(có)**
- **D-F5.** Có bảng ảnh chụp cuối tháng `loan_snapshots` (DPD + dư nợ, tính trong seed) để chương 3–6 không phải tự dựng DPD từ lịch trả? **(có)**
- **D-F6.** Xong việc ở Finance = `celebrate()` + một câu đọc to, như E-com; hoạt cảnh đồng xu / hũ sáng là M3 tùy chọn? **(có)**
- **D-F7.** Bản đồ Finance là **bản đồ chi nhánh** mở theo thăng tiến (cùng mẫu E-com), không phải "bản đồ dòng tiền" của v7? **(có)**
- **D-F8.** Gỡ trang "Sắp có" (route `soon`, section, khóa `soon.*`, `financeSoon()`) vì không còn domain nào chưa mở? **(có)**
- **D-F9.** Ngân sách mới `fin` 50, `finseed` 10, `finart` 10 KB.
  - **(có; main không xin nâng trần; quá 289,5 thì dời thẻ khởi đầu, rồi câu cảm ơn, vào chunk Finance)**
- **D-F10.** Chip "Dựa vào" (link bài nâng cao) ở brief và hàng chương Tổng quan, chỉ chiều domain → General? **(có)**
  - Tên chip lấy từ chunk General, tải lười khi ticket có `adv:`.
- **D-F11.** Chữ chỉ hình vẽ dùng (nhãn chi nhánh, `aria-label`) nằm trong chunk art (bảng VI/EN riêng); tiêu đề và dòng chú giải hiện trước khi chunk tải thì ở `vi.ts`/`en.ts`? **(có)**
- **D-F12.** Bậc nghề có ★ ở F1, F4, F6 (theo v7)? **(có)**
  - Chức danh: Chuyên viên phân tích tập sự → Chuyên viên rủi ro tín dụng → Chuyên viên rủi ro cao cấp.
- **D-F13.** Hai phòng mới `Risk`, `Collections` trong `DEPT`; các phòng khác (Finance, Sales, CS, IT, Management) dùng chung màu và câu cảm ơn với Logistics? **(có)**
