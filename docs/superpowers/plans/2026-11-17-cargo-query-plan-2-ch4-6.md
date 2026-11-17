# Cargo Query — Plan 2: chương 4–6 và phương pháp học (ví dụ mẫu, làm cùng, ngẫm lại, sai lầm điển hình, ôn đầu chương)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm chương 4 "Lịch tàu & thời gian", 5 "Hải quan & phân loại", 6 "Làm sạch dữ liệu" (18 ticket VI + EN, 11 kỹ năng mới, xong ch6 lên ★ Senior DA) và bộ máy phương pháp học của curriculum §5 mà các chương đó cần:
- `format: worked | faded | open`, mục `## Example` (ví dụ mẫu có chú thích ①…), chỗ trống `___` trong `starter`;
- `reflect:` (câu ngẫm lại trong Recap), `wrong:` (câu sai điển hình kèm giải thích), bẫy của kỹ năng khi nộp sai;
- luật ticket `rest` ôn xen kẽ trong `contentProblems`;
- card "Ôn đầu chương" trên Trang chủ (curriculum §5.2, Plan 1c P4 để lại).

**Architecture:**
- Seed: 7 bảng mới thêm vào **cuối** `schema.sql`, 5 khối seed mới (mỗi khối một `setseed()`) thêm vào **cuối** `seed.sql`. 6 bảng cũ giữ nguyên từng byte: `tests/seed.test.ts` ghim md5 của chúng.
- Parser (`src/tickets.ts`) đọc các trường mới; mọi luật định dạng nằm ở parser, luật nội dung nằm ở `tests/content.test.ts` và `contentProblems`.
- Giao diện chỉ thêm khối nhỏ vào module đã có: `ui/brief.ts` (thẻ Ví dụ mẫu, câu ngẫm lại), `ui/work.ts` (chặn `___`, giải thích câu sai), `ui/modes.ts` (card Ôn đầu chương). Không route mới, không trường save mới, không `SAVE_VERSION` mới.
- Nội dung: 18 file `content/tickets/ch4..ch6/*.md`, `skills.yml` (+11 thẻ), `chapters.yml` (outcomes ch4–6), `people.yml` (bảng phụ trách), `kpis.yml` (+3 ô).

**Tech Stack:** như HEAD. **Không thêm dependency.**

**Spec:** `docs/superpowers/specs/2026-11-16-cargo-query-design.md` §4–§6. **Nguồn quyết định:** `docs/team/curriculum.md` §3, §4 (ch4–6), §5, §7.1–7.2; `docs/team/problem-design.md` §1; `docs/team/completion-animations.md` §3; `docs/team/amendments.md` D1, D2, D4; `docs/team/decision-log.md` L22, L24, L25, L30, L31, L35, L37, L40 (dòng mới thắng). Quyết định mới của plan này: Q1–Q16 (mục dưới).

**Tiền đề:** Mốc 1 xong (Plan 1, 1d, 1b, 1c, Import, Deploy phần local). Plan viết trên HEAD `646d9e0`: 497 test xanh, `tsc` sạch. Toàn bộ plan đã được replay lên một bản `git archive HEAD` sạch: `tsc`, 763 test và `npm run build` đều sạch (mục "Đã kiểm" cuối plan).

## Đã có trên HEAD (không làm lại)

| Curriculum §7.2 / brief | Trạng thái HEAD |
|---|---|
| `chapters.yml` 12 chương, `career`, `tier`, `story` ch4–6 | Có (Plan 1d). Plan này chỉ điền `outcomes` ch4–6. |
| `CHAPTER_TABLES` khóa 1–12 theo curriculum §3 | Có. Ch4 `shipment_events, trucking_orders, cfs_receipts`; ch5 `customs_declarations, hs_codes, duties_taxes`; ch6 `incoterms`. Không sửa. |
| i18n `top.chapter` `{n}/{total}`, màu 12 chương, `rankOf` 6 tier | Có (Plan 1d/1c). |
| `people.yml` đủ vai trò Staff (chứng từ, khai báo viên, điều độ/CFS, pricing, AR, AP, CSKH, sales) | Có. Plan này chỉ thêm bảng phụ trách mới. |
| `sqlerr.22012` (chia cho 0) | Có. Plan này thêm `42804`, `22P02`. |

## Quyết định sản phẩm của plan này (Q1–Q16, để orchestrator ghi L-số)

| # | Quyết định | Lý do |
|---|---|---|
| Q1 | **Bảng seed tối giản.** `shipment_events(id, shipment_id, event DEPARTED/ARRIVED/DELIVERED, event_date)` chỉ ghi từ **2026-07-01** (ngày hệ thống theo dõi chạy); `trucking_orders(id, shipment_id, order_date)` (không có ngày giao: chưa ticket nào cần); `cfs_receipts(id, shipment_id, received_date, packages, volume_cbm, cargo_desc)` cho hàng LCL cả hai chiều; `hs_codes`, `duties_taxes` (3 mã không có thuế suất); `customs_declarations(... lane, submitted_date, cleared_date, declared_value_usd, amended_from_id)` từ **2026-06-01**, chuỗi khai lại chỉ ở tờ khai **xuất**, tờ bị thay không có ngày thông quan; `incoterms(code, name, sea_only)`. | Đủ cho 18 Solution, không hơn. Nhật ký đủ 2 năm làm seed chậm thêm ~0,3 s; cắt từ 07/2026 còn +0,06 s. Khai lại chỉ ở tờ khai xuất để bài ôn ch5-05 (hàng nhập) không vô tình cần kỹ năng tự nối. |
| Q2 | **Ngân sách `main` 270 → 300 KB gzip.** Đo thật sau Plan 2: 282 KB (HEAD 254). Theo luật L40 (số đo + 5 %, làm tròn 10 KB). **Cần user xem** cùng P-D3. Khuyến nghị cho Plan 3: tách nội dung ticket thành chunk tải lười theo chương trước khi thêm ch7–9 (mỗi plan nội dung thêm ~25–28 KB gzip vào `main`). | `content.ts` nạp ticket bằng `import.meta.glob(..., eager)` nên ticket nằm trong `main`; 18 ticket VI+EN có ví dụ mẫu/ngẫm lại/câu sai ≈ 25 KB gzip. Đổi sang nạp bất đồng bộ đụng mọi chỗ gọi `loadTickets()` đồng bộ: việc riêng, không nhét vào plan nội dung. Worker (seed) chỉ +3 KB (133 → 136 / 160). |
| Q3 | Kết quả ticket **không chứa chữ phụ thuộc ngôn ngữ**: nhóm phân loại là số (ch5-01: 1 nhanh, 2 bình thường, 3 chậm), cờ là đúng/sai (ch5-03: thiếu thuế suất). | Grader so chuỗi chính xác; người chơi VI và EN sẽ gõ nhãn khác nhau. |
| Q4 | `format` tùy chọn (không khai = `open`; ch1–3 không đổi). `## Example`: khối SQL chỉ ở phần VI, đánh dấu `-- ①…`; lời giải thích mỗi dấu một đoạn ở cả VI và EN. Thẻ "Ví dụ mẫu" có nút "Chép ví dụ vào editor" (thay nội dung editor, hoàn tác được). **Để sau:** tô sáng mệnh đề khi rê chuột qua chú thích, Tab/Shift-Tab nhảy giữa các `___`. | Đủ cho nhịp ví dụ mẫu → bài cặp đôi; phần tô sáng cần ánh xạ dấu → vị trí trong editor, không chặn việc học. |
| Q5 | Ticket `faded` nộp khi còn `___`: báo "còn N chỗ trống", **không chấm, không tính là nộp sai** (không gọi `onWrong`, Luyện tập không bị trừ hộp). Chạy (Run) thì Postgres báo lỗi cú pháp như thường. Ticket không phải `faded` không chặn `___`, vì `LIKE '___'` (ba ký tự bất kỳ) là SQL hợp lệ. | Curriculum §5.1. |
| Q6 | Sau khi Nộp sai **kết quả** (không phải lỗi SQL): chạy lần lượt các câu `wrong:` của ticket; câu nào cho kết quả trùng kết quả người chơi thì hiện lời giải thích của câu đó. Không trùng câu nào thì hiện `trap` của kỹ năng ticket dạy (`grants`). Ticket không dạy gì (rest) và cột mốc: không thêm gì. | Curriculum §5.4 dòng 2–3. Chỉ chạy thêm ≤ 2 query, chỉ khi nộp sai. |
| Q7 | `reflect:` hiện trong Recap (chỉ chế độ Làm việc, sau khi xong việc), không chấm, không XP, không lưu. **Bắt buộc từ ch4**; `reflect:` cho 15 ticket ch1–3 **để sau** (plan này không sửa ticket cũ). | Curriculum §5.5; giữ diff gọn, ch1–3 đã kiểm. |
| Q8 | Card "Ôn đầu chương": section Trang chủ order 21 (ngay trên card Ôn tập 22). Chỉ hiện khi chương hiện tại N ≥ 2 **chưa có ticket nào xong**; tối đa 3 bài từ `warmupQueue` (kỹ năng các chương < N, hộp Leitner thấp nhất → đến hạn sớm nhất → id; mỗi ticket một lần; ưu tiên ticket có biến thể). Kết quả tính như Luyện tập (0 XP, đổi hộp Leitner). Không thêm trường save. **Để sau:** card trong Hộp thư, chế độ "Thẻ úp" (§5.3, Plan 3). | Curriculum §5.2; điều kiện "chưa có ticket nào của chương xong" tính lại được từ `completed`. |
| Q9 | `plan:` (kiểm theo kế hoạch thực thi) và `lab:` (phòng thí nghiệm index) **để Plan 4**. | Ch4–6 không cần; curriculum §5.7 xếp Plan 4. |
| Q10 | Lệch nhỏ so với curriculum §4: (a) cột mốc ch6-06 do **Giám đốc** gửi (như mọi cột mốc, L22 + bio `people.yml`), thân đề nói nhu cầu là của kế toán trưởng; (b) ch6-02 hỏi **mô tả hàng gõ tay ở kho CFS** (Bùi Long) thay vì tên khách (Sales), vì tên khách trùng đúng cột ngành hàng nên `ILIKE` trên tên là thừa; (c) ch5-03 gom theo **mã HS** chứ không theo 2 số đầu (cắt chuỗi là kỹ năng ch6); (d) ch5-06 bước 1 trả **số lô và số lô đúng hẹn**, không phải tỷ lệ (ép kiểu là kỹ năng ch6); (e) ch4-03 dùng `trucking_orders`, ch4-06 bước 2 dùng `shipment_events` (curriculum §3 ghi lẫn thứ tự). | Giữ đúng luật "chỉ dùng kỹ năng đã dạy" và "dữ liệu buộc dùng kỹ năng mới". |
| Q11 | Biến thể tháng dùng **tháng không liền nhau** (10, 8, 6), ch4-04 lấy **ngày mốc** làm biến thể (31/10, 29/10, 27/10) nên đề ch4-04 không in ngày hôm nay. | Test "không sót giá trị biến thể 0" so chuỗi con: tháng liền kề làm `to` của biến thể này trùng `from` của biến thể 0. |
| Q12 | Thêm giải thích lỗi `42804` (CASE trả cột chữ và số) và `22P02` (chuỗi không đọc được thành số/ngày, gặp khi trộn nhãn chữ với số trong CASE). Không có bẫy "viết tiền tố dài trước": regex của Postgres (ARE) chọn khớp **dài nhất** giữa các lựa chọn `|`, đã kiểm thực tế. | Curriculum §5.4 dòng 1. |
| Q13 | Không thêm người mới. `people.yml` thêm bảng phụ trách: Hoàng Khánh `shipment_events`; Hoàng Ngọc `customs_declarations`; Võ Lan `incoterms`; Bùi Long `trucking_orders, cfs_receipts`; Võ Phong đổi thành `customs_declarations, hs_codes, duties_taxes`. | Vai trò Staff có sẵn đủ cho người hỏi ch4–6 (curriculum §2). |
| Q14 | Thêm 3 ô KPI: lô quá hạn chưa đến (ch4-04, đếm dòng), số ngày thông quan trung bình quý 3 theo luồng (ch5-06 bước 2, cột), khách bị nhập trùng (ch6-06 bước 1, đếm dòng). | L18 ★5: ô mở khi xong ticket nguồn. |
| Q15 | Luật `rest` ôn xen kẽ áp **từ chương 4** (`REST_RULE_FROM = 4`): `requires` ≥ 2 kỹ năng của chương trước, ≥ 1 kỹ năng từ chương N−2 trở về trước. | Curriculum §5.1; ch1–3 không đổi. |
| Q16 | `tests/content.test.ts` thêm khối "phương pháp học" cho ch ≥ 4: teach là `worked`, mỗi chương đúng một `faded`, mọi ticket thường có `reflect`, mọi câu `wrong` chạy được và khác Solution **ở mọi biến thể**, mỗi kỹ năng mới có ticket thường ≥ 3 biến thể (L37), SQL ví dụ mẫu chạy được. | Biến luật của curriculum thành test chặn, như các luật nội dung khác. |

## Kết quả spike seed (2026-11-17, Node 24 + PGlite 0.5.16, trước khi viết plan)

| Đo | HEAD `646d9e0` | Sau Plan 2 |
|---|---|---|
| Thời gian chạy `seed.sql` (Node, 3 lần) | 0,79 / 0,75 / 0,71 s | 0,97 / 0,97 / 0,98 s (**+0,22 s**) |
| Từng khối mới | — | `shipment_events` 64 ms (bản đủ 2 năm: 314 ms, xem Q1), `trucking_orders` 39 ms, `cfs_receipts` 50 ms, `customs_declarations` 100 ms, `hs_codes`/`duties_taxes`/`incoterms` < 2 ms |
| `seed.sql` gzip -9 | 3,6 KB | 6,3 KB |
| Nhóm ngân sách `worker` (seed nằm ở đây) | 133 / 160 KB | 136 / 160 KB |
| Nhóm `main` (ticket nằm ở đây) | 254 / 270 KB | **282 KB → vượt**, xem Q2 |
| Số dòng mới | — | events 9.955 · trucking 6.406 · CFS 4.912 · tờ khai 4.250 (152 bản sửa) |
| md5 6 bảng cũ | giữ nguyên từng byte (test ghim) | |

Edge: thời gian boot cộng thêm tỷ lệ tương tự (~+30 % phần seed). Task 10 Step 4 đo lại trên Edge; nếu boot (từ lúc mở trang đến "DB sẵn sàng") vượt 1,5 lần số trước Plan 2 thì ghi vào `decision-log.md` và báo, **không** cắt dữ liệu ticket đang dùng.

**Nếu seed vượt ngân sách `worker` (160 KB) ở plan sau:** thứ tự xử lý là (1) cắt khoảng thời gian của bảng nhật ký mới (như Q1), (2) bỏ cột không ticket nào dùng, (3) nâng ngân sách theo luật L40 kèm "cần user xem". Không nén/tách seed ra file riêng chỉ để qua ngân sách.

## Tên dùng từ HEAD (Task 0 kiểm bằng grep)

| File | Tên dùng trong plan này |
|---|---|
| `src/tickets.ts` | `Beat`, `TicketText`, `Ticket`, `BEATS`, `parseSections(part, fail, lang)`, `templateNames(t)`, `parseTicket`, `textOf`, `bilingualOf` (từ `progress.ts`) |
| `src/progress.ts` | `SKILL_SQL`, `twistUsed`, `contentProblems(tickets, skills, chapters)`, `CHAPTER_TABLES` |
| `src/practice.ts` | `Card`, `Review`, `PracticeItem`, `cardOf`, `variantFor`, `covers`, `practicePool`, `retryItem` |
| `src/session.ts` | `reviewToday`, `reviewCount`, `today()`, `done()`, `app` |
| `src/ui/modes.ts` | `startPractice`, `reviewCard`, `registerHomeSection({ id: 'review', order: 22 … })`, `CARD`, `BTN_GO`, `cx` |
| `src/ui/brief.ts` | `picked`, `story(tk)`, `recap(tk, x)`, `renderBrief`, `richText`, `actions` |
| `src/ui/work.ts` | `mountWork`, `WorkArea`, `say`, `submit()`, `gradeMessage`, `voice`, `played` |
| `src/state.ts` | `actions` (`rerender, selectTicket, complete, retryDb, copyDiagnostics`) |
| `src/ui/sqlErrors.ts` | `BY_CODE` |
| `tests/helpers.ts` | `runner()`, `seededDb()`, `freshDb()` |

**Cách đọc các bước sửa code.** Mỗi bước dùng một trong ba dạng dưới đây, áp đúng thứ tự trong plan.
- **Tạo `path`:** ghi cả file, ghi đè nếu file đã có.
- **Sửa `path`** — thay: khối thứ nhất phải xuất hiện **đúng một lần** trong file. Thay nó bằng khối sau chữ "bằng:".
- **Thêm vào cuối `path`:** nối khối vào cuối file (dòng trống đầu khối là cố ý).

Nếu một khối "thay" không khớp đúng một lần (HEAD đã đổi), thì áp ý của bước vào code trên đĩa (L7) và ghi lại chỗ lệch trong mô tả commit.

## Global Constraints

- Mọi ràng buộc của các plan trước vẫn áp dụng: PGlite **0.5.16** pin; không `innerHTML`; mọi chữ UI qua `t()`, khóa mới thêm vào **cả** `vi.ts` và `en.ts` trong cùng task; message EN dạng hàm dùng `num()`/`count()`; không dùng chữ "boss" trên UI (L22). Mọi bước "xác nhận PASS" chạy thêm `npx tsc --noEmit` và phải không lỗi.
- **Seed:** chỉ thêm vào **cuối** `schema.sql` và `seed.sql`; mỗi khối có `setseed()` riêng; không `ALTER` bảng cũ; không ngày thực tế nào sau 2026-10-31. Sau mỗi task chạy lại **mọi** Solution (`npm test`).
- **Đề bài** (problem-design §1): thân đề, `## Task`, đề bước không có tên bảng/cột, từ khóa SQL viết hoa, mã trạng thái, backtick; EN không dấu tiếng Việt và không nhắc tên người; code span VI = EN; Solution chỉ dùng ngày cố định; ticket `ordered` nêu đủ quy tắc phá hòa bằng lời.
- **Solution chỉ dùng kỹ năng đã dạy** tới chương đó: không CTE, không truy vấn con, không hàm cửa sổ ở ch4–6.
- `src/ui/*`, `src/session.ts`, `src/state.ts`, `src/main.ts` không có unit test mới (Vitest chạy Node, không DOM). Kiểm tay theo checklist Task 10, **trên Edge, ở origin riêng** (cổng khác 5173), không bao giờ đụng save của user ở `:5173`.
- Mỗi task một commit (bước cuối của task). Chỉ `git add` đúng các file của task.

## File Structure

```
src/db/schema.sql             + 7 bảng chương 4–6                                         (sửa, thêm cuối)
src/db/seed.sql               + dòng móc ở đầu file, + khối Plan 2 ở cuối                  (sửa)
src/tickets.ts                + Format, BLANK, Reflect, Wrong; ## Example; format/reflect/wrong (sửa)
src/progress.ts               + SKILL_SQL null_logic/cast, REST_RULE_FROM, luật rest           (sửa)
src/practice.ts               + WARMUP_SIZE, warmupQueue                                    (sửa)
src/session.ts                + warmupToday                                                 (sửa)
src/state.ts                  + actions.useSql                                              (sửa)
src/main.ts                   gắn actions.useSql → work.setDoc                              (sửa)
src/ui/modes.ts               + card "Ôn đầu chương" (order 21)                             (sửa)
src/ui/brief.ts               + thẻ Ví dụ mẫu, câu ngẫm lại trong Recap                      (sửa)
src/ui/work.ts                + chặn ___, giải thích câu sai / bẫy kỹ năng, setDoc          (sửa)
src/ui/sqlErrors.ts           + 42804, 22P02                                               (sửa)
src/i18n/vi.ts, en.ts         + warmup.*, brief.example/useExample, work.blanks/trap, recap.reflect*, sqlerr.42804/22P02 (sửa)
content/skills.yml            + 11 thẻ kỹ năng ch4–6                                        (sửa, thêm cuối)
content/chapters.yml          outcomes ch4–6                                               (sửa)
content/people.yml, kpis.yml, TEMPLATE.md                                                   (sửa)
content/tickets/ch4/ch4-01..06.md, ch5/ch5-01..06.md, ch6/ch6-01..06.md                     (tạo)
scripts/check-budget.mjs      main 270 → 300 (Q2)                                          (sửa)
tests/seed.test.ts, tickets.test.ts, progress.test.ts, practice.test.ts, sqlErrors.test.ts, content.test.ts, scene.test.ts (sửa)
CLAUDE.md                                                                                   (sửa)
```

## Số dòng kết quả mong đợi (đã chạy, biến thể 0 | 1 | 2)

| Ticket | Dạng | Dạy | Dòng | Ghi chú |
|---|---|---|---|---|
| ch4-01 | teach · worked | `date_math` | 73 \| 80 \| 58 | ví dụ mẫu 8 dòng |
| ch4-02 | develop · faded | `date_bucket` | 12 \| 12 \| 12 | |
| ch4-03 | develop · open | (ôn `anti_join`, `date_math`) | 13 | |
| ch4-04 | twist | `null_logic` | 19 \| 10 \| 4 | bẫy `= NULL` ra 0 dòng; quên lô hủy ra 666 dòng |
| ch4-05 | rest | — | 6 | đủ 6 ngày 26–31/10 |
| ch4-06 | cột mốc | — | 19 / 24 / 5 | 3 bước |
| ch5-01 | teach · worked | `case_when` | 3 \| 3 \| 3 | ví dụ mẫu 3 dòng |
| ch5-02 | develop · faded | `conditional_agg` | 2 \| 2 \| 1 | |
| ch5-03 | develop · open | `coalesce` | 18 \| 18 \| 18 | 2 mã thiếu thuế suất có tờ khai nhập |
| ch5-04 | twist | `self_join` | 29 \| 27 \| 24 | có chuỗi sửa 2 cấp ở mọi biến thể |
| ch5-05 | rest | — | 11 | |
| ch5-06 | cột mốc | — | 2 / 3 / 1 | 3 bước |
| ch6-01 | teach · worked | `string_fn` | 29 \| 16 \| 28 | ví dụ mẫu 6 dòng |
| ch6-02 | develop · faded | `pattern_match` | 17 \| 14 \| 6 | LIKE (sai) ra 4 \| 4 \| 4 |
| ch6-03 | develop · open | `distinct` | 16 \| 37 \| 8 | |
| ch6-04 | twist | `cast` | 151 \| 121 \| 45 | |
| ch6-05 | rest | — | 14 | |
| ch6-06 | cột mốc | — | 10 / 10 / 10 | 3 bước |

Đáp án đúng viết kiểu khác cũng qua grader (đã chạy `compareResults`): `date_trunc(...)::date` thay `date_trunc(...)`; `BETWEEN ... '2026-10-31'` thay khoảng nửa mở; `count(*) FILTER (...)` thay `SUM(CASE ...)`; `extract(month/year ...)` + `ata > eta + 3` cho ch4-01; ba `replace` lồng nhau cho ch6-01; so tên đã `lower()` hai phía cho ch6-06 bước 1.

---

### Task 0: Kiểm tiền đề (không sửa file)

- [ ] **Step 1: Test và kiểu đang sạch**

Run: `npm test && npx tsc --noEmit`
Expected: 497 test PASS, `tsc` không lỗi.

- [ ] **Step 2: Grep các điểm neo**

Run:
```bash
for p in "export type Beat = " "interface Sections { body: string; task: string; hints: string[]; steps: Step[] }" "const BEATS: Beat[] = " "anti_join: /" "const boss = inChapter.find" "Practise this task again" "export const reviewCount" "registerHomeSection({ id: 'review', order: 22" "const picked = new Map" "x.task ? h('section'" "async function submit" "setSchema: (ns) => editor?.setSchema(ns)," "'22012': 'sqlerr.22012'," "copyDiagnostics(): void {}," "Object.assign(actions, {" "'prac.done'" "15 ticket ch1–3 ra đúng bảng" "['main', /^index-"; do printf '%-60s' "$p"; grep -rlF -- "$p" src tests scripts | wc -l; done
grep -c "outcomes: \[\]" content/chapters.yml
ls content/tickets
```
Expected: mỗi mẫu có trong ít nhất một file (cột cuối ≥ 1); `chapters.yml` có 9 dòng `outcomes: []` (ch4–12); `content/tickets` chỉ có `ch1 ch2 ch3`.

---

### Task 1: Seed chương 4–6 (spike trước, đo rồi mới viết nội dung)

**Files:**
- Modify: `src/db/schema.sql`, `src/db/seed.sql`, `tests/seed.test.ts`

**Interfaces:**
- Produces: 7 bảng `shipment_events`, `trucking_orders`, `cfs_receipts`, `hs_codes`, `duties_taxes`, `customs_declarations`, `incoterms` (cột ở Q1) và các móc câu chuyện ghi ở đầu khối Plan 2 trong `seed.sql`.

- [ ] **Step 1: Viết test seed (móc, quy mô, md5 bảng cũ)**

**Sửa `tests/seed.test.ts`** — thay:
```ts
const TABLES = ['ports', 'carriers', 'employees', 'customers', 'shipments', 'containers'];
```
bằng:
```ts
const TABLES = ['ports', 'carriers', 'employees', 'customers', 'shipments', 'containers'];
/** Plan 2 (chapters 4–6), appended after TABLES; their blocks come after every older block in seed.sql. */
const PLAN2 = ['shipment_events', 'trucking_orders', 'cfs_receipts', 'hs_codes', 'duties_taxes', 'customs_declarations', 'incoterms'];
const hashOf = (t: string) => `SELECT md5(string_agg(x::text, '|' ORDER BY x::text)) AS h FROM ${t} x`;
```

**Sửa `tests/seed.test.ts`** — thay:
```ts
    for (const t of TABLES) {
      const q = `SELECT md5(string_agg(x::text, '|' ORDER BY x::text)) AS h FROM ${t} x`;
      const ha = (await a.query<{ h: string }>(q)).rows[0].h;
      const hb = (await b.query<{ h: string }>(q)).rows[0].h;
      expect(ha, t).toBe(hb);
    }
  });
```
bằng:
```ts
    for (const t of [...TABLES, ...PLAN2]) {
      const ha = (await a.query<{ h: string }>(hashOf(t))).rows[0].h;
      const hb = (await b.query<{ h: string }>(hashOf(t))).rows[0].h;
      expect(ha, t).toBe(hb);
    }
  });

  // Appending blocks must never re-roll older tables: these hashes were taken before Plan 2 (HEAD 646d9e0) and after it.
  it('bảng cũ giữ nguyên từng byte khi thêm khối seed mới', async () => {
    const before: Record<string, string> = {
      ports: 'ec1c84dddcf5646f1e3b5fc1d57f69f7',
      carriers: '2f8f365a6e8494e6e9d7131f01caa183',
      employees: 'b4d52d87c1e60bea9d7e993a622c5487',
      customers: 'd8c05c7b97d841c1090ec122fdf6093a',
      shipments: '84be2f8c5de722f32edc58ac7f347a46',
      containers: 'd8edef4637ee3684f04f1112b74fb304',
    };
    for (const t of TABLES) expect((await one<{ h: string }>(hashOf(t))).h, t).toBe(before[t]);
  });
```

**Sửa `tests/seed.test.ts`** — thay:
```ts
  it('không có ngày thực tế sau "hôm nay" 2026-10-31', async () => {
    const r = await one<{ n: number }>(`SELECT count(*) AS n FROM shipments WHERE atd > '2026-10-31' OR ata > '2026-10-31' OR booking_date > '2026-10-31'`);
    expect(r.n).toBe(0);
  });
```
bằng:
```ts
  it('không có ngày thực tế sau "hôm nay" 2026-10-31', async () => {
    const r = await one<{ n: number }>(`SELECT count(*) AS n FROM shipments WHERE atd > '2026-10-31' OR ata > '2026-10-31' OR booking_date > '2026-10-31'`);
    expect(r.n).toBe(0);
    const later = await one<{ n: number }>(`SELECT
      (SELECT count(*) FROM shipment_events WHERE event_date > '2026-10-31') + (SELECT count(*) FROM trucking_orders WHERE order_date > '2026-10-31')
      + (SELECT count(*) FROM cfs_receipts WHERE received_date > '2026-10-31')
      + (SELECT count(*) FROM customs_declarations WHERE submitted_date > '2026-10-31' OR cleared_date > '2026-10-31') AS n`);
    expect(later.n).toBe(0);
  });

  it('Plan 2: quy mô và khớp với lô hàng', async () => {
    expect((await one<{ n: number }>('SELECT count(*) AS n FROM shipment_events')).n).toBeGreaterThan(9000);
    expect((await one<{ n: number }>(`SELECT count(*) AS n FROM shipment_events e JOIN shipments s ON s.id = e.shipment_id
      WHERE (e.event = 'DEPARTED' AND e.event_date <> s.atd) OR (e.event = 'ARRIVED' AND e.event_date <> s.ata)
         OR (e.event = 'DELIVERED' AND (s.status <> 'DELIVERED' OR e.event_date < s.ata))`)).n).toBe(0);
    expect((await one<{ n: number }>(`SELECT count(*) AS n FROM customs_declarations WHERE cleared_date < submitted_date`)).n).toBe(0);
    expect((await one<{ n: number }>('SELECT count(*) AS n FROM incoterms')).n).toBe(11);
  });

  it('móc Plan 2: lô nhập đường biển đã cập hơn 3 ngày chưa có lệnh xe (ch4-03)', async () => {
    const r = await one<{ n: number }>(`SELECT count(*) AS n FROM shipments s LEFT JOIN trucking_orders t ON t.shipment_id = s.id
      WHERE s.direction = 'IMPORT' AND s.mode = 'SEA' AND DATE '2026-10-31' - s.ata > 3 AND t.id IS NULL`);
    expect(r.n).toBeGreaterThanOrEqual(5);
  });

  it('móc Plan 2: kho CFS có phiếu mọi ngày 26–31/10/2026, mô tả hàng viết hoa thường lẫn lộn (ch4-05, ch6-02)', async () => {
    expect((await one<{ n: number }>(`SELECT count(DISTINCT received_date) AS n FROM cfs_receipts WHERE received_date BETWEEN '2026-10-26' AND '2026-10-31'`)).n).toBe(6);
    const c = await one<{ i: number; l: number }>(`SELECT count(*) FILTER (WHERE cargo_desc ILIKE '%frozen%') AS i,
      count(*) FILTER (WHERE cargo_desc LIKE '%frozen%') AS l FROM cfs_receipts`);
    expect(c.i).toBeGreaterThan(c.l);
    expect(c.l).toBeGreaterThan(0);
  });

  it('móc Plan 2: 3 mã HS chưa có thuế suất (ch5-03)', async () => {
    const r = await db().then((d) => d.query<{ code: string }>(`SELECT h.code FROM hs_codes h LEFT JOIN duties_taxes t ON t.hs_code = h.code WHERE t.hs_code IS NULL ORDER BY 1`));
    expect(r.rows.map((x) => x.code)).toEqual(['100640', '392690', '851712']);
  });

  it('móc Plan 2: tờ khai hủy rồi khai lại, có chuỗi sửa 2 cấp, chỉ ở tờ khai xuất (ch5-04, ch5-06)', async () => {
    const r = await one<{ one: number; two: number; imports: number; replacedCleared: number }>(`SELECT
      count(*) FILTER (WHERE a2.id IS NULL) AS one, count(*) FILTER (WHERE a2.id IS NOT NULL) AS two,
      count(*) FILTER (WHERE s.direction = 'IMPORT') AS imports, count(*) FILTER (WHERE o.cleared_date IS NOT NULL) AS "replacedCleared"
      FROM customs_declarations o
      JOIN customs_declarations a1 ON a1.amended_from_id = o.id
      LEFT JOIN customs_declarations a2 ON a2.amended_from_id = a1.id
      JOIN shipments s ON s.id = o.shipment_id
      WHERE o.amended_from_id IS NULL`);
    expect(r.one).toBeGreaterThan(50);
    expect(r.two).toBeGreaterThan(20);
    expect(r.imports).toBe(0);
    expect(r.replacedCleared).toBe(0);
  });

  it('móc Plan 2: lô nhập cập cảng hơn 5 ngày, tờ khai chưa thông quan (ch5-05)', async () => {
    const r = await one<{ n: number }>(`SELECT count(*) AS n FROM shipments s JOIN customs_declarations d ON d.shipment_id = s.id
      WHERE s.direction = 'IMPORT' AND DATE '2026-10-31' - s.ata > 5 AND d.cleared_date IS NULL`);
    expect(r.n).toBeGreaterThanOrEqual(5);
  });
```

**Sửa `tests/seed.test.ts`** — thay:
```ts
async function one<T>(sql: string): Promise<T> {
  const db = await seededDb();
  return (await db.query<T>(sql)).rows[0];
}
```
bằng:
```ts
const db = seededDb;
async function one<T>(sql: string): Promise<T> {
  return (await (await db()).query<T>(sql)).rows[0];
}
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/seed.test.ts`
Expected: FAIL ở các test Plan 2 với `relation "shipment_events" does not exist` (và các bảng mới khác). Test "bảng cũ giữ nguyên từng byte" PASS ngay (md5 lấy từ HEAD).

- [ ] **Step 3: Thêm bảng vào cuối `schema.sql`**

**Thêm vào cuối `src/db/schema.sql`:**
```sql

-- Plan 2 (chapters 4-6): ops, customs and documents. Seed blocks for them are appended at the end of seed.sql.
CREATE TABLE shipment_events (
  id int PRIMARY KEY,
  shipment_id int NOT NULL REFERENCES shipments(id),
  event text NOT NULL CHECK (event IN ('DEPARTED', 'ARRIVED', 'DELIVERED')),
  event_date date NOT NULL
);

CREATE TABLE trucking_orders (
  id int PRIMARY KEY,
  shipment_id int NOT NULL REFERENCES shipments(id),
  order_date date NOT NULL
);

CREATE TABLE cfs_receipts (
  id int PRIMARY KEY,
  shipment_id int NOT NULL REFERENCES shipments(id),
  received_date date NOT NULL,
  packages int NOT NULL,
  volume_cbm numeric(8, 2) NOT NULL,
  cargo_desc text NOT NULL
);

CREATE TABLE hs_codes (
  code text PRIMARY KEY,
  description text NOT NULL
);

CREATE TABLE duties_taxes (
  hs_code text PRIMARY KEY REFERENCES hs_codes(code),
  import_duty_pct numeric(5, 2) NOT NULL,
  vat_pct numeric(5, 2) NOT NULL
);

CREATE TABLE customs_declarations (
  id int PRIMARY KEY,
  decl_no text NOT NULL UNIQUE,
  shipment_id int NOT NULL REFERENCES shipments(id),
  hs_code text NOT NULL REFERENCES hs_codes(code),
  lane text NOT NULL CHECK (lane IN ('GREEN', 'YELLOW', 'RED')),
  submitted_date date NOT NULL,
  cleared_date date,
  declared_value_usd numeric(12, 2) NOT NULL,
  amended_from_id int REFERENCES customs_declarations(id)
);

CREATE TABLE incoterms (
  code text PRIMARY KEY,
  name text NOT NULL,
  sea_only boolean NOT NULL
);
```

- [ ] **Step 4: Thêm khối seed**

**Sửa `src/db/seed.sql`** — thay:
```sql
--   * ~2% of AIR shipments carry incoterm FOB (trap: FOB is sea-only, Ch6)
```
bằng:
```sql
--   * ~2% of AIR shipments carry incoterm FOB (trap: FOB is sea-only, Ch6)
--   * chapters 4-6 (Plan 2): listed at the head of the Plan 2 block near the end of this file
```

**Thêm vào cuối `src/db/seed.sql`:**
```sql

-- ===== Plan 2 (chapters 4-6). Story hooks (tickets and tests/seed.test.ts depend on them):
--   * shipment_events (milestone log) starts 2026-07-01, when the tracking system went live
--   * sea imports that ARRIVED (not delivered): about half have no trucking order yet (ch4-03)
--   * cancelled shipments have no ATA either: "overdue" = ETA passed, ATA empty, not cancelled (ch4-04, ch4-06)
--   * CFS receipts (LCL export cargo before ETD, LCL import cargo after ATA) on every day 2026-10-26..31 (ch4-05); cargo descriptions typed in mixed case (ch6-02)
--   * HS codes 851712, 100640, 392690 have no duty rate (ch5-03); declarations exist from 2026-06-01
--   * ~5% of export declarations were cancelled and filed again, some twice (ch5-04, ch5-06)
--   * red-lane imports filed in October: about half still not cleared (ch5-05)

SELECT setseed(0.404);
WITH d AS (
  SELECT s.id, s.status, s.atd, s.ata, 3 + floor(random() * 5)::int AS lag FROM shipments s
), ev AS (
  SELECT id AS shipment_id, 1 AS k, 'DEPARTED' AS event, atd AS event_date FROM d WHERE atd IS NOT NULL
  UNION ALL SELECT id, 2, 'ARRIVED', ata FROM d WHERE ata IS NOT NULL
  UNION ALL SELECT id, 3, 'DELIVERED', LEAST(ata + lag, DATE '2026-10-31') FROM d WHERE status = 'DELIVERED'
)
INSERT INTO shipment_events (id, shipment_id, event, event_date)
SELECT row_number() OVER (ORDER BY shipment_id, k), shipment_id, event, event_date FROM ev
WHERE event_date >= DATE '2026-07-01';

SELECT setseed(0.505);
WITH d AS (
  SELECT s.id, s.status, s.ata, random() AS r_skip, floor(random() * 2)::int AS wait
  FROM shipments s
  WHERE s.direction = 'IMPORT' AND s.mode = 'SEA' AND s.status IN ('ARRIVED', 'DELIVERED')
)
INSERT INTO trucking_orders (id, shipment_id, order_date)
SELECT row_number() OVER (ORDER BY id), id, LEAST(ata + wait, DATE '2026-10-31')
FROM d WHERE NOT (status = 'ARRIVED' AND r_skip < 0.5)
ORDER BY id;

SELECT setseed(0.606);
WITH d AS (
  SELECT s.id, s.direction, s.etd, s.ata, s.volume_cbm, c.industry,
    random() AS r_day, random() AS r_pk, random() AS r_cbm, random() AS r_desc, random() AS r_case
  FROM shipments s JOIN customers c ON c.id = s.customer_id
  WHERE s.load_type = 'LCL' AND s.status <> 'CANCELLED' AND (s.direction = 'EXPORT' OR s.ata IS NOT NULL)
), e AS (
  SELECT d.*,
    CASE WHEN d.direction = 'EXPORT' THEN d.etd - 1 - floor(d.r_day * 3)::int ELSE d.ata + 1 + floor(d.r_day * 2)::int END AS received_date,
    (CASE d.industry
      WHEN 'Textile' THEN ARRAY['Cotton T-shirts', 'Polyester jackets', 'Denim trousers']
      WHEN 'Seafood' THEN ARRAY['Frozen shrimp', 'Frozen pangasius fillet', 'Dried squid']
      WHEN 'Furniture' THEN ARRAY['Wooden chairs', 'Wooden dining tables', 'Rattan sofas']
      WHEN 'Coffee' THEN ARRAY['Robusta coffee beans', 'Roasted coffee', 'Instant coffee']
      WHEN 'Electronics' THEN ARRAY['Mobile phone parts', 'Laptop chargers', 'LED panels']
      WHEN 'Footwear' THEN ARRAY['Leather shoes', 'Sports shoes', 'Rubber sandals']
      WHEN 'Rice' THEN ARRAY['Jasmine rice', 'Broken white rice', 'Glutinous rice']
      WHEN 'Cashew' THEN ARRAY['Cashew kernels W320', 'Roasted cashew', 'Cashew kernels W240']
      WHEN 'Steel' THEN ARRAY['Galvanized steel coils', 'Steel pipes', 'Steel wire']
      ELSE ARRAY['Plastic bags', 'PET bottles', 'Plastic household goods'] END)[1 + floor(d.r_desc * 3)::int] AS base
  FROM d
)
INSERT INTO cfs_receipts (id, shipment_id, received_date, packages, volume_cbm, cargo_desc)
SELECT row_number() OVER (ORDER BY id), id, received_date, 1 + floor(r_pk * 120)::int,
  round((volume_cbm * (0.95 + r_cbm * 0.1))::numeric, 2),
  CASE WHEN r_case < 0.4 THEN base WHEN r_case < 0.7 THEN upper(base) ELSE lower(base) END
FROM e WHERE received_date <= DATE '2026-10-31'
ORDER BY id;

INSERT INTO hs_codes VALUES
  ('610910', 'Cotton T-shirts'), ('620342', 'Cotton trousers'),
  ('030617', 'Frozen shrimps and prawns'), ('030462', 'Frozen catfish fillets'),
  ('940360', 'Wooden furniture'), ('940161', 'Upholstered wooden seats'),
  ('090111', 'Coffee, not roasted'), ('090121', 'Coffee, roasted'),
  ('851712', 'Mobile phones'), ('847130', 'Portable computers'),
  ('640399', 'Leather footwear'), ('640411', 'Sports footwear'),
  ('100630', 'Milled rice'), ('100640', 'Broken rice'),
  ('080132', 'Cashew nuts, shelled'), ('080131', 'Cashew nuts, in shell'),
  ('721049', 'Galvanized flat steel'), ('730890', 'Steel structures'),
  ('392321', 'Plastic bags'), ('392690', 'Other plastic articles');

INSERT INTO duties_taxes VALUES
  ('610910', 20, 10), ('620342', 20, 10), ('030617', 15, 8), ('030462', 18, 8),
  ('940360', 25, 10), ('940161', 25, 10), ('090111', 15, 8), ('090121', 20, 10),
  ('847130', 0, 10), ('640399', 30, 10), ('640411', 30, 10), ('100630', 40, 8),
  ('080132', 25, 8), ('080131', 5, 8), ('721049', 10, 10), ('730890', 15, 10), ('392321', 15, 10);

SELECT setseed(0.707);
WITH hs (industry, code1, code2) AS (VALUES
  ('Textile', '610910', '620342'), ('Seafood', '030617', '030462'), ('Furniture', '940360', '940161'),
  ('Coffee', '090111', '090121'), ('Electronics', '851712', '847130'), ('Footwear', '640399', '640411'),
  ('Rice', '100630', '100640'), ('Cashew', '080132', '080131'), ('Steel', '721049', '730890'),
  ('Plastics', '392321', '392690')
), d AS (
  SELECT s.id AS shipment_id, s.direction, hs.code1, hs.code2,
    CASE WHEN s.direction = 'EXPORT' THEN s.etd - 1 - floor(random() * 2)::int ELSE s.ata + floor(random() * 2)::int END AS submitted,
    random() AS r_hs, random() AS r_value, random() AS r_amend, random() AS r_stuck,
    random() AS r_lane0, random() AS r_days0, random() AS r_lane1, random() AS r_days1, random() AS r_lane2, random() AS r_days2
  FROM shipments s JOIN customers c ON c.id = s.customer_id JOIN hs ON hs.industry = c.industry
  WHERE s.status <> 'CANCELLED' AND (s.direction = 'EXPORT' OR s.ata IS NOT NULL)
), o AS (
  SELECT d.*,
    row_number() OVER (ORDER BY shipment_id) AS rn,
    count(*) OVER () AS n,
    d.direction = 'EXPORT' AND d.r_amend < 0.05 AND d.submitted <= DATE '2026-10-29' AS amend1,
    d.direction = 'EXPORT' AND d.r_amend < 0.015 AND d.submitted <= DATE '2026-10-29' AS amend2
  FROM d WHERE d.submitted BETWEEN DATE '2026-06-01' AND DATE '2026-10-31'
), r AS (
  SELECT o.*,
    sum(amend1::int) OVER (ORDER BY rn) AS k1, sum(amend1::int) OVER () AS n1,
    sum(amend2::int) OVER (ORDER BY rn) AS k2
  FROM o
), v (shipment_id, direction, id, from_id, hs_code, submitted, r_lane, r_days, replaced, stuck, value) AS (
  SELECT shipment_id, direction, rn, NULL::bigint, CASE WHEN r_hs < 0.5 THEN code1 ELSE code2 END, submitted,
    r_lane0, r_days0, amend1, direction = 'IMPORT' AND r_stuck < 0.5 AND submitted >= DATE '2026-10-01', r_value FROM r
  UNION ALL
  SELECT shipment_id, direction, n + k1, rn, CASE WHEN r_hs < 0.5 THEN code2 ELSE code1 END, submitted + 1,
    r_lane1, r_days1, amend2, false, r_value FROM r WHERE amend1
  UNION ALL
  SELECT shipment_id, direction, n + n1 + k2, n + k1, CASE WHEN r_hs < 0.5 THEN code1 ELSE code2 END, submitted + 2,
    r_lane2, r_days2, false, false, r_value FROM r WHERE amend2
), w AS (
  SELECT v.*, CASE WHEN r_lane < 0.6 THEN 'GREEN' WHEN r_lane < 0.9 THEN 'YELLOW' ELSE 'RED' END AS lane FROM v
), x AS (
  SELECT w.*, submitted + CASE lane WHEN 'GREEN' THEN floor(r_days * 2)::int WHEN 'YELLOW' THEN 1 + floor(r_days * 3)::int
                                    ELSE 2 + floor(r_days * 5)::int END AS cleared
  FROM w
)
INSERT INTO customs_declarations (id, decl_no, shipment_id, hs_code, lane, submitted_date, cleared_date, declared_value_usd, amended_from_id)
SELECT id, CASE WHEN direction = 'IMPORT' THEN '10' ELSE '30' END || lpad(id::text, 10, '0'), shipment_id, hs_code, lane, submitted,
  CASE WHEN replaced OR (stuck AND lane = 'RED') OR cleared > DATE '2026-10-31' THEN NULL ELSE cleared END,
  round((1000 + value * 99000)::numeric, 2), from_id
FROM x ORDER BY id;

INSERT INTO incoterms VALUES
  ('EXW', 'Ex Works', false), ('FCA', 'Free Carrier', false), ('CPT', 'Carriage Paid To', false),
  ('CIP', 'Carriage and Insurance Paid To', false), ('DAP', 'Delivered at Place', false),
  ('DPU', 'Delivered at Place Unloaded', false), ('DDP', 'Delivered Duty Paid', false),
  ('FAS', 'Free Alongside Ship', true), ('FOB', 'Free on Board', true),
  ('CFR', 'Cost and Freight', true), ('CIF', 'Cost, Insurance and Freight', true);
```

- [ ] **Step 5: Chạy test, xác nhận PASS**

Run: `npx vitest run tests/seed.test.ts && npx tsc --noEmit`
Expected: 13 test PASS.

- [ ] **Step 6: Đo seed và ngân sách**

Run:
```bash
node --input-type=module -e "import {PGlite} from '@electric-sql/pglite'; import {readFileSync as r} from 'node:fs'; for (let i = 0; i < 3; i++) { const d = new PGlite(); await d.exec(r('src/db/schema.sql','utf8')); const t = Date.now(); await d.exec(r('src/db/seed.sql','utf8')); console.log('seed', Date.now() - t, 'ms'); }"
npm run build && node scripts/check-budget.mjs
```
Expected: seed ≈ 0,9–1,1 s mỗi lần trên máy dev (HEAD ≈ 0,7–0,8 s); `worker ≈ 136 KB gz / 160 KB` ok; `main` vẫn 254 KB (chưa có ticket mới). Nếu seed > 1,5 s hoặc `worker` > 150 KB: dừng, xem lại Q1 trước khi viết nội dung.

- [ ] **Step 7: Chạy toàn bộ rồi commit**

Run: `npm test && npx tsc --noEmit`
Expected: tất cả PASS (mọi Solution ch1–3 không đổi kết quả).

```bash
git add src/db/schema.sql src/db/seed.sql tests/seed.test.ts
git commit -m "feat(seed): chapter 4-6 tables (events, trucking, CFS, customs, HS duties, incoterms) with story hooks"
```

---

### Task 2: Parser: `format`, `## Example`, `reflect`, `wrong`

**Files:**
- Modify: `src/tickets.ts`, `tests/tickets.test.ts`

**Interfaces:**
- Produces:
  - `type Format = 'worked' | 'faded' | 'open'`, `const BLANK = '___'`
  - `interface Reflect { q: Bilingual; options: Bilingual[]; answer: number; why: Bilingual }`, `interface Wrong { sql: string; why: Bilingual }`
  - `Ticket.format?: Format` (undefined = open), `Ticket.example?: { sql; text }`, `Ticket.reflect?`, `Ticket.wrong?`; `TicketText.example?: string`
  - Lỗi parser: `worked` ⇔ có `## Example`; EN `## Example` không có ```sql; `faded` cần `___` trong `starter`; boss không có `reflect`/`wrong`; `reflect` 2–4 lựa chọn, `answer` hợp lệ; `wrong` mỗi mục `{ sql, vi, en }`.
  - `{{x}}` trong ví dụ mẫu, `reflect`, `wrong` được tính vào `templateNames` (biến thể áp lên chúng qua `applyVariant`, vốn đã duyệt mọi chuỗi).

- [ ] **Step 1: Viết test**

**Sửa `tests/tickets.test.ts`** — thay:
```ts
describe('variants', () => {
```
bằng:
````ts
/** NORMAL_BI as a worked example with reflect and wrong (Plan 2, curriculum §5). */
const WORKED = NORMAL_BI
  .replace('beat: develop\n', `beat: develop
format: worked
reflect:
  q: { vi: "Vì sao?", en: "Why?" }
  options: [{ vi: "Vì A", en: "Because of A" }, { vi: "Vì B", en: "Because of B" }]
  answer: 1
  why: { vi: "Vì B đúng.", en: "B is right." }
wrong:
  - { sql: "SELECT code FROM ports", vi: "Thiếu điều kiện.", en: "The filter is missing." }
`)
  .replace('## Task\nLấy mã cảng.\n', '## Task\nLấy mã cảng.\n\n## Example\n```sql\nSELECT name FROM ports -- ①\n```\n① Chọn cột `name`.\n')
  .replace('## Task\nReturn the port codes.\n', '## Task\nReturn the port codes.\n\n## Example\n① Pick the `name` column.\n');

describe('format, ## Example, reflect, wrong (Plan 2)', () => {
  it('đọc ví dụ mẫu, câu ngẫm lại và câu sai điển hình', () => {
    const t = parseTicket(WORKED, 'w.md');
    expect(t.format).toBe('worked');
    expect(t.example).toEqual({ sql: 'SELECT name FROM ports -- ①', text: '① Chọn cột `name`.' });
    expect(textOf(t, 'vi').example).toBe('① Chọn cột `name`.');
    expect(textOf(t, 'en').example).toBe('① Pick the `name` column.');
    expect(t.reflect).toEqual({
      q: { vi: 'Vì sao?', en: 'Why?' }, options: [{ vi: 'Vì A', en: 'Because of A' }, { vi: 'Vì B', en: 'Because of B' }],
      answer: 1, why: { vi: 'Vì B đúng.', en: 'B is right.' },
    });
    expect(t.wrong).toEqual([{ sql: 'SELECT code FROM ports', why: { vi: 'Thiếu điều kiện.', en: 'The filter is missing.' } }]);
    expect(parseTicket(NORMAL, 'n.md').format).toBeUndefined(); // ch1–3: open by default
  });

  it('faded cần chỗ trống ___ trong starter', () => {
    const faded = NORMAL.replace('beat: develop\n', 'beat: develop\nformat: faded\nstarter: SELECT ___ FROM ports\n');
    expect(parseTicket(faded, 'f.md').starter).toBe('SELECT ___ FROM ports');
    expect(() => parseTicket(faded.replace('SELECT ___ FROM ports', 'SELECT code FROM ports'), 'f.md')).toThrow(/___/);
  });

  it('báo lỗi định dạng', () => {
    const bad = (src: string) => () => parseTicket(src, 'bad.md');
    expect(bad(WORKED.replace('format: worked', 'format: guided'))).toThrow(/format/);
    expect(bad(WORKED.replace('format: worked\n', ''))).toThrow(/chỉ dành cho format: worked/);
    expect(bad(WORKED.replace(/## Example\n```sql\n.*\n```\n.*\n/, ''))).toThrow(/cần mục "## Example"/);
    expect(bad(WORKED.replace('## Example\n① Pick', '## Example\n```sql\nSELECT 1\n```\n① Pick'))).toThrow(/SQL dùng chung/);
    expect(bad(WORKED.replace('## Example\n① Pick the `name` column.\n', ''))).toThrow(/cả VI và EN/);
    expect(bad(WORKED.replace('  answer: 1\n', '  answer: 2\n'))).toThrow(/reflect/);
    expect(bad(WORKED.replace(', en: "The filter is missing."', ''))).toThrow(/wrong/);
    expect(bad(BOSS.replace('ordered: true\n', 'ordered: true\nwrong: [{ sql: "SELECT 1", vi: "a", en: "b" }]\n'))).toThrow(/boss/);
  });
});

describe('variants', () => {
````

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/tickets.test.ts`
Expected: FAIL: `mục lạ "## Example"`, `t.format` undefined.

- [ ] **Step 3: Sửa `src/tickets.ts`**

**Sửa `src/tickets.ts`** — thay:
```ts
export type Beat = 'teach' | 'develop' | 'twist' | 'rest' | 'boss';
```
bằng:
```ts
export type Beat = 'teach' | 'develop' | 'twist' | 'rest' | 'boss';
/** curriculum §5.1: worked = annotated example + paired task; faded = starter with ___ blanks; open = plain task. */
export type Format = 'worked' | 'faded' | 'open';
/** A blank in a faded starter; Submit refuses SQL that still contains one. */
export const BLANK = '___';
```

**Sửa `src/tickets.ts`** — thay:
```ts
  steps: { title: string; prompt: string }[];
  conclusion?: { question: string; options: string[] };
}
```
bằng:
```ts
  steps: { title: string; prompt: string }[];
  conclusion?: { question: string; options: string[] };
  /** "## Example" prose (format: worked): explains the ①… markers of Ticket.example.sql. */
  example?: string;
}
/** Multiple-choice question in the Recap after a correct submit (curriculum §5.5). Not graded, not saved. */
export interface Reflect { q: Bilingual; options: Bilingual[]; answer: number; why: Bilingual }
/** A common wrong answer: when the player's result equals this SQL's result, the feedback shows `why` (curriculum §5.4). */
export interface Wrong { sql: string; why: Bilingual }
```

**Sửa `src/tickets.ts`** — thay:
```ts
  variants?: Variant[];
  en?: TicketText;
}
```
bằng:
```ts
  variants?: Variant[];
  en?: TicketText;
  /** undefined = open (ch1–3 never declare it). */
  format?: Format;
  /** format: worked. `sql` (markers -- ①…) is shared; `text` is the VI prose (EN prose lives in en.example). */
  example?: { sql: string; text: string };
  reflect?: Reflect;
  wrong?: Wrong[];
}
```

**Sửa `src/tickets.ts`** — thay:
```ts
const BEATS: Beat[] = ['teach', 'develop', 'twist', 'rest', 'boss'];
```
bằng:
```ts
const BEATS: Beat[] = ['teach', 'develop', 'twist', 'rest', 'boss'];
const FORMATS: Format[] = ['worked', 'faded', 'open'];
```

**Sửa `src/tickets.ts`** — thay:
```ts
interface Sections { body: string; task: string; hints: string[]; steps: Step[] }
```
bằng:
```ts
interface Sections { body: string; task: string; hints: string[]; steps: Step[]; example?: { prose: string; sql: string } }
```

**Sửa `src/tickets.ts`** — thay:
```ts
    } else if (heading === 'Hints') {
```
bằng:
````ts
    } else if (heading === 'Example') {
      const sql = SQL_RE.exec(content);
      if (lang === 'en' && sql) fail('khối # EN không được chứa ```sql trong "## Example" — SQL dùng chung');
      if (lang === 'vi' && !sql) fail('"## Example" thiếu khối ```sql');
      out.example = { prose: content.replace(SQL_RE, '').trim(), sql: sql ? sql[1].trim() : '' };
    } else if (heading === 'Hints') {
````

**Sửa `src/tickets.ts`** — thay:
```ts
  const texts = (x: TicketText) => [x.title, x.body, x.task, ...x.hints, ...x.steps.flatMap((s) => [s.title, s.prompt]),
    ...(x.conclusion ? [x.conclusion.question, ...x.conclusion.options] : [])];
  const all = [
    ...texts(textOf(t, 'vi')),
    ...(t.en ? texts(t.en) : []),
    ...t.steps.flatMap((s) => [s.solution, ...(s.columns ?? []).flatMap((l) => [l.vi, l.en])]),
    t.starter ?? '',
  ];
```
bằng:
```ts
  const texts = (x: TicketText) => [x.title, x.body, x.task, ...x.hints, ...x.steps.flatMap((s) => [s.title, s.prompt]),
    ...(x.conclusion ? [x.conclusion.question, ...x.conclusion.options] : []), x.example ?? ''];
  const both = (b: Bilingual) => [b.vi, b.en];
  const all = [
    ...texts(textOf(t, 'vi')),
    ...(t.en ? texts(t.en) : []),
    ...t.steps.flatMap((s) => [s.solution, ...(s.columns ?? []).flatMap(both)]),
    t.starter ?? '',
    t.example?.sql ?? '',
    ...(t.reflect ? [t.reflect.q, ...t.reflect.options, t.reflect.why].flatMap(both) : []),
    ...(t.wrong ?? []).flatMap((w) => [w.sql, ...both(w.why)]),
  ];
```

**Sửa `src/tickets.ts`** — thay:
```ts
    hints: vi.hints,
    steps: vi.steps,
  };

```
bằng:
```ts
    hints: vi.hints,
    steps: vi.steps,
  };
  if (fm.format !== undefined) {
    t.format = FORMATS.includes(fm.format as Format) ? (fm.format as Format) : fail(`format phải là một trong ${FORMATS.join(', ')}`);
  }

```

**Sửa `src/tickets.ts`** — thay:
```ts
  if (fm.scene !== undefined) t.scene = parseScene(fm.scene, t.beat === 'boss', fail);
```
bằng:
````ts
  if (fm.scene !== undefined) t.scene = parseScene(fm.scene, t.beat === 'boss', fail);

  if (vi.example) {
    t.example = { sql: vi.example.sql, text: vi.example.prose };
    if (t.format !== 'worked') fail('"## Example" chỉ dành cho format: worked');
  } else if (t.format === 'worked') {
    fail('format: worked cần mục "## Example" (khối ```sql có chú thích ①… và lời giải thích)');
  }
  if (t.format === 'faded' && !t.starter?.includes(BLANK)) fail(`format: faded cần starter có ít nhất một chỗ trống ${BLANK}`);
  if (t.beat === 'boss' && (fm.reflect !== undefined || fm.wrong !== undefined)) fail('boss dùng conclusion, không có reflect/wrong');
  if (fm.reflect !== undefined) {
    const r = fm.reflect as { q?: unknown; options?: unknown; answer?: unknown; why?: unknown } | null;
    const options = Array.isArray(r?.options) ? r.options.map(bilingualOf) : [];
    const q = bilingualOf(r?.q);
    const why = bilingualOf(r?.why);
    const answer = r?.answer;
    if (!q || !why || options.length < 2 || options.length > 4 || options.some((o) => !o)
      || typeof answer !== 'number' || answer < 0 || answer >= options.length) {
      fail('reflect cần { q: {vi, en}, options: 2–4 × {vi, en}, answer: số thứ tự đáp án đúng (từ 0), why: {vi, en} }');
    }
    t.reflect = { q: q!, options: options as Bilingual[], answer: answer as number, why: why! };
  }
  if (fm.wrong !== undefined) {
    const ws = Array.isArray(fm.wrong) ? (fm.wrong as unknown[]) : [];
    if (ws.length === 0) fail('wrong: cần ít nhất một mục { sql, vi, en }');
    t.wrong = ws.map((w) => {
      const o = w as { sql?: unknown } | null;
      const why = bilingualOf(w);
      if (typeof o?.sql !== 'string' || !o.sql.trim() || !why) fail('wrong: mỗi mục là { sql, vi, en }');
      return { sql: (o!.sql as string).trim(), why: why! };
    });
  }
````

**Sửa `src/tickets.ts`** — thay:
```ts
      steps: t.beat === 'boss' ? en.steps.map((s) => ({ title: s.title, prompt: s.prompt })) : [{ title: '', prompt: '' }],
    };
```
bằng:
```ts
      steps: t.beat === 'boss' ? en.steps.map((s) => ({ title: s.title, prompt: s.prompt })) : [{ title: '', prompt: '' }],
      ...(en.example ? { example: en.example.prose } : {}),
    };
    if (!vi.example !== !en.example) fail('"## Example" phải có ở cả VI và EN');
```

**Sửa `src/tickets.ts`** — thay:
```ts
    ...(t.conclusion ? { conclusion: { question: t.conclusion.question, options: t.conclusion.options } } : {}),
    fallback: lang === 'en',
```
bằng:
```ts
    ...(t.conclusion ? { conclusion: { question: t.conclusion.question, options: t.conclusion.options } } : {}),
    ...(t.example ? { example: t.example.text } : {}),
    fallback: lang === 'en',
```

- [ ] **Step 4: Chạy test, xác nhận PASS rồi commit**

Run: `npx vitest run tests/tickets.test.ts tests/variants.test.ts tests/content.test.ts && npx tsc --noEmit`
Expected: tất cả PASS (ticket ch1–3 không khai trường mới nên không đổi).

```bash
git add src/tickets.ts tests/tickets.test.ts
git commit -m "feat(tickets): format worked/faded/open, ## Example, reflect and wrong fields"
```

---

### Task 3: Luật `rest` ôn xen kẽ và từ khóa kỹ năng twist mới

**Files:**
- Modify: `src/progress.ts`, `tests/progress.test.ts`

**Interfaces:**
- Produces: `REST_RULE_FROM = 4`; `contentProblems` báo `<id>: rest phải requires ≥ 2 kỹ năng của chương trước…`; `twistUsed('null_logic' | 'cast', sql)`.

- [ ] **Step 1: Viết test**

**Sửa `tests/progress.test.ts`** — thay:
```ts
    ['order_by', 'SELECT 1 ORDER BY 1', 'SELECT 1'],
  ])
```
bằng:
```ts
    ['order_by', 'SELECT 1 ORDER BY 1', 'SELECT 1'],
    ['null_logic', 'SELECT 1 FROM t WHERE ata IS NOT NULL', 'SELECT 1 FROM t WHERE ata = NULL'],
    ['cast', 'SELECT count(*)::numeric / 3', 'SELECT 100.0 * count(*) / 3'],
    ['cast', 'SELECT CAST(count(*) AS numeric)', 'SELECT count(*)'],
  ])
```

**Sửa `tests/progress.test.ts`** — thay:
```ts
describe('twistUsed: từ khóa theo kỹ năng', () => {
```
bằng:
```ts
describe('luật ticket rest ôn xen kẽ (từ chương 4, curriculum §5.1)', () => {
  const four = parseSkills([card('select', 1), card('where', 1), card('group_by', 2), card('join', 3), card('date_math', 4)].join('\n'));
  const ch4 = (requires: string[]) => [
    mk('ch4-01', 'teach', { grants: ['date_math'] }),
    mk('ch4-02', 'rest', { requires }),
    mk('ch4-03', 'boss', { requires: ['date_math'] }),
  ];
  const restProblems = (requires: string[]) => contentProblems(ch4(requires), four, chapters).filter((p) => p.includes('rest phải'));

  it('đủ 2 kỹ năng cũ, có 1 kỹ năng từ chương N−2 trở về trước → hợp lệ', () => {
    expect(restProblems(['join', 'group_by', 'date_math'])).toEqual([]);
  });

  it('thiếu kỹ năng cũ, hoặc chỉ ôn chương liền trước → báo lỗi', () => {
    expect(restProblems(['group_by', 'date_math'])).toHaveLength(1);
    expect(restProblems(['join', 'date_math'])).toHaveLength(1);
  });
});

describe('twistUsed: từ khóa theo kỹ năng', () => {
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/progress.test.ts`
Expected: FAIL: `twistUsed('null_logic', …)` là `undefined`; luật rest chưa báo lỗi.

- [ ] **Step 3: Sửa `src/progress.ts`**

**Sửa `src/progress.ts`** — thay:
```ts
  anti_join: /\bIS\s+NULL\b|\bNOT\s+EXISTS\b/i,
};
```
bằng:
```ts
  anti_join: /\bIS\s+NULL\b|\bNOT\s+EXISTS\b/i,
  null_logic: /\bIS\s+(NOT\s+)?NULL\b/i,
  cast: /::\s*\w+|\bCAST\s*\(/i,
};

/** curriculum §5.1: from this chapter on, a rest ticket must review older chapters (spaced, interleaved). */
export const REST_RULE_FROM = 4;
```

**Sửa `src/progress.ts`** — thay:
```ts
    const boss = inChapter.find((t) => t.beat === 'boss');
```
bằng:
```ts
    if (chapter >= REST_RULE_FROM) {
      for (const rest of inChapter.filter((t) => t.beat === 'rest')) {
        const older = rest.requires.map((s) => skillById.get(s)?.chapter ?? chapter).filter((c) => c < chapter);
        if (older.length < 2 || !older.some((c) => c <= chapter - 2)) {
          problems.push(`${rest.id}: rest phải requires ≥ 2 kỹ năng của chương trước, trong đó ≥ 1 kỹ năng từ chương ${chapter - 2} trở về trước`);
        }
      }
    }
    const boss = inChapter.find((t) => t.beat === 'boss');
```

- [ ] **Step 4: Chạy test, xác nhận PASS rồi commit**

Run: `npx vitest run tests/progress.test.ts tests/content.test.ts && npx tsc --noEmit`
Expected: tất cả PASS.

```bash
git add src/progress.ts tests/progress.test.ts
git commit -m "feat(progress): interleaved-review rule for rest tickets from chapter 4; null_logic and cast twist keywords"
```

---

### Task 4: Ôn đầu chương (`warmupQueue` + card Trang chủ)

**Files:**
- Modify: `src/practice.ts`, `tests/practice.test.ts`, `src/session.ts`, `src/ui/modes.ts`, `src/i18n/vi.ts`, `src/i18n/en.ts`

**Interfaces:**
- Produces: `WARMUP_SIZE = 3`; `warmupQueue(review, learned, templates, completed, chapter, today, rnd): PracticeItem[]`; `warmupToday(rnd?)` trong `session.ts` (rỗng khi chương hiện tại < 2 hoặc đã có ticket của chương xong); section Trang chủ `warmup` order 21; khóa `warmup.title`, `warmup.intro`, `warmup.start`.

- [ ] **Step 1: Viết test**

**Sửa `tests/practice.test.ts`** — thay:
```ts
  pickForSkill, QUEUE_MAX, retryItem, reviewQueue, seedReview, variantFor,
} from '../src/practice';
```
bằng:
```ts
  pickForSkill, QUEUE_MAX, retryItem, reviewQueue, seedReview, variantFor, WARMUP_SIZE, warmupQueue,
} from '../src/practice';
```

**Sửa `tests/practice.test.ts`** — thay:
```ts
  it('retryItem luyện các kỹ năng ticket đó dạy; ticket rest không dạy gì thì luyện kỹ năng nó cần', () => {
```
bằng:
```ts
  it('warmupQueue: chỉ kỹ năng của chương trước, hộp thấp trước, mỗi ticket một lần, tối đa WARMUP_SIZE', () => {
    const ch2 = mk('ch2-01', 'teach', { grants: ['aggregate'], variants: [{ x: '1' }, { x: '2' }, { x: '3' }] });
    const all = [...templates, ch2];
    const done = new Set([...completed, 'ch2-01']);
    const review = { select: { box: 3, due: T }, where: { box: 1, due: '2026-11-20' } };
    // chapter 2 starts: chapter-1 skills only; where (box 1) before select (box 3); ch1-02 is taken, so select goes to ch1-01
    expect(warmupQueue(review, ['select', 'where', 'aggregate'], all, done, 2, T, () => 0)).toEqual([
      { ticketId: 'ch1-02', variant: 1, skills: ['where'] },
      { ticketId: 'ch1-01', variant: 0, skills: ['select'] },
    ]);
    // chapter 3: chapter-2 skills join; where has no other ticket once ch1-02 is taken, so it is skipped
    expect(warmupQueue({}, ['select', 'where', 'aggregate'], all, done, 3, T, () => 0).map((i) => i.skills[0])).toEqual(['aggregate', 'select']);
    expect(warmupQueue({}, ['select'], all, done, 1, T, () => 0)).toEqual([]);
    const many = Array.from({ length: 6 }, (_, i) => mk(`ch1-2${i}`, 'develop', { grants: [`s${i}`] }));
    expect(warmupQueue({}, many.map((_, i) => `s${i}`), many, new Set(many.map((t) => t.id)), 2, T, () => 0)).toHaveLength(WARMUP_SIZE);
  });

  it('retryItem luyện các kỹ năng ticket đó dạy; ticket rest không dạy gì thì luyện kỹ năng nó cần', () => {
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/practice.test.ts`
Expected: FAIL: `warmupQueue` không được export.

- [ ] **Step 3: Viết `warmupQueue`**

**Sửa `src/practice.ts`** — thay:
```ts
/** "Practise this task again": the skills it teaches, or (a rest ticket teaches none) the skills it needs. */
```
bằng:
```ts
export const WARMUP_SIZE = 3;

/**
 * Chapter warm-up (curriculum §5.2): when chapter `chapter` ≥ 2 starts, up to WARMUP_SIZE items on skills of earlier
 * chapters: lowest Leitner box first, then earliest due, then id. One item per skill, never the same ticket twice.
 * Leitner runs on the calendar, so a player who clears three chapters in one sitting still gets a recall step at each start.
 */
export function warmupQueue(
  review: Review, learned: Iterable<string>, templates: Ticket[], completed: Set<string>, chapter: number, today: string, rnd: () => number,
): PracticeItem[] {
  const chapterOf = new Map(templates.flatMap((t) => t.grants.map((s) => [s, t.chapter] as const)));
  const card = (s: string): Card => cardOf(review, s, today);
  const skills = [...learned]
    .filter((s) => (chapterOf.get(s) ?? chapter) < chapter)
    .sort((a, b) => card(a).box - card(b).box || card(a).due.localeCompare(card(b).due) || a.localeCompare(b));
  const pool = practicePool(templates, completed);
  const out: PracticeItem[] = [];
  for (const skill of skills) {
    if (out.length >= WARMUP_SIZE) break;
    const cands = pool.filter((t) => covers(t).includes(skill) && !out.some((i) => i.ticketId === t.id));
    const withVariants = cands.filter((t) => variantsOf(t).length >= 2);
    const from = withVariants.length ? withVariants : cands;
    if (from.length === 0) continue;
    const t = from[Math.floor(rnd() * from.length)];
    out.push({ ticketId: t.id, variant: variantFor(t, rnd), skills: [skill] });
  }
  return out;
}

/** "Practise this task again": the skills it teaches, or (a rest ticket teaches none) the skills it needs. */
```

- [ ] **Step 4: Nối vào session và Trang chủ**

**Sửa `src/session.ts`** — thay:
```ts
import { localDay, reviewQueue, type PracticeItem } from './practice';
```
bằng:
```ts
import { localDay, reviewQueue, warmupQueue, type PracticeItem } from './practice';
import { currentChapter } from './progress';
```

**Sửa `src/session.ts`** — thay:
```ts
export const reviewCount = (): number => reviewToday(() => 0).length;
```
bằng:
```ts
export const reviewCount = (): number => reviewToday(() => 0).length;
/** Chapter warm-up (curriculum §5.2): only while chapter N ≥ 2 has no completed ticket yet. Length does not depend on `rnd`. */
export function warmupToday(rnd: () => number = Math.random): PracticeItem[] {
  const d = done();
  const chapter = currentChapter(app.tickets, d);
  if (chapter < 2 || app.tickets.some((t) => t.chapter === chapter && d.has(t.id))) return [];
  return warmupQueue(app.save.review, learnedSkills(app.tickets, d), loadTicketTemplates(), d, chapter, today(), rnd);
}
```

**Sửa `src/ui/modes.ts`** — thay:
```ts
import { activeStep, activeTicket, isStory, practiceFinished, reviewCount, reviewToday, session, today, type Mode, type PracticeRun } from '../session';
```
bằng:
```ts
import {
  activeStep, activeTicket, isStory, practiceFinished, reviewCount, reviewToday, session, today, warmupToday, type Mode, type PracticeRun,
} from '../session';
```

**Sửa `src/ui/modes.ts`** — thay:
```ts
// Same id replaces topbar.ts's 'play' entry: "Workspace" is current only in story mode.
```
bằng:
```ts
/** Home "Chapter warm-up" (curriculum §5.2): recall tasks from earlier chapters when a chapter starts. Never blocks its first ticket. */
function warmupCard(): HTMLElement | null {
  const n = warmupToday(() => 0).length;
  if (n === 0) return null;
  return h('section', { class: cx(CARD, 'flex flex-wrap items-center gap-4 p-5'), 'aria-labelledby': 'warmup-title' },
    h('div', { class: 'min-w-0 flex-1' },
      h('h2', { id: 'warmup-title', class: 'm-0 text-lg font-bold' }, t('warmup.title')),
      h('p', { class: 'mt-1 mb-0 text-[15px] text-muted' }, t('warmup.intro', { n }))),
    h('button', { type: 'button', class: cx(BTN_GO, 'px-4 py-2'), onclick: () => void startPractice(warmupToday()) }, t('warmup.start', { n })));
}

// Same id replaces topbar.ts's 'play' entry: "Workspace" is current only in story mode.
```

**Sửa `src/ui/modes.ts`** — thay:
```ts
registerHomeSection({ id: 'review', order: 22, span: 'full', render: reviewCard });
```
bằng:
```ts
registerHomeSection({ id: 'review', order: 22, span: 'full', render: reviewCard });
registerHomeSection({ id: 'warmup', order: 21, span: 'full', render: warmupCard });
```

**Sửa `src/i18n/vi.ts`** — thay:
```ts
  'prac.done': 'Xong lượt luyện: {ok}/{n} bài đạt.',
```
bằng:
```ts
  'prac.done': 'Xong lượt luyện: {ok}/{n} bài đạt.',
  'warmup.title': 'Ôn đầu chương · 0 XP',
  'warmup.intro': 'Trước khi vào chương mới, làm lại {n} việc ngắn dùng kỹ năng các chương trước. Không bắt buộc, nhưng nhớ lại bây giờ giúp nhớ lâu hơn.',
  'warmup.start': 'Ôn {n} bài',
```

**Sửa `src/i18n/en.ts`** — thay:
```ts
  'prac.done': 'Practice done: {ok}/{n} passed.',
```
bằng:
```ts
  'prac.done': 'Practice done: {ok}/{n} passed.',
  'warmup.title': 'Chapter warm-up · 0 XP',
  'warmup.intro': (p) => `Before the new chapter, redo ${count('short task', 'short tasks')(p)} that use skills from earlier chapters. Optional, but recalling them now makes them stick.`,
  'warmup.start': 'Warm up ({n})',
```

- [ ] **Step 5: Chạy test, xác nhận PASS rồi commit**

Run: `npx vitest run tests/practice.test.ts tests/i18n.test.ts tests/home.test.ts && npx tsc --noEmit`
Expected: tất cả PASS.

```bash
git add src/practice.ts tests/practice.test.ts src/session.ts src/ui/modes.ts src/i18n/vi.ts src/i18n/en.ts
git commit -m "feat(practice): chapter warm-up card with three recall tasks from earlier chapters (curriculum 5.2)"
```

---

### Task 5: Giao diện phương pháp học (ví dụ mẫu, chỗ trống, câu sai, ngẫm lại) và lỗi SQL mới

**Files:**
- Modify: `src/state.ts`, `src/main.ts`, `src/ui/brief.ts`, `src/ui/work.ts`, `src/ui/sqlErrors.ts`, `tests/sqlErrors.test.ts`, `src/i18n/vi.ts`, `src/i18n/en.ts`

**Interfaces:**
- Consumes: `Ticket.example/reflect/wrong`, `BLANK` (Task 2); `compareResults` (`grader.ts`); `SKILLS`.
- Produces: `actions.useSql(sql)`; `WorkArea.setDoc(sql)`; thẻ "Ví dụ mẫu" (đặt ngay trước khối Yêu cầu, ví dụ đọc trước bài cặp đôi), câu ngẫm lại trong Recap; ticket `faded` Nộp khi còn `___` → `work.blanks` (không chấm, không `onWrong`; ticket khác không chặn, vì `'___'` là mẫu LIKE hợp lệ); nộp sai kết quả → lời giải thích của câu `wrong:` khớp, hoặc `work.trap` với `trap` của kỹ năng ticket dạy; `sqlerr.42804`, `sqlerr.22P02`.

- [ ] **Step 1: Test lỗi SQL mới (chạy trên PGlite thật)**

**Sửa `tests/sqlErrors.test.ts`** — thay:
```ts
  ['SELECT 1/0', 'sqlerr.22012'],
```
bằng:
```ts
  ['SELECT 1/0', 'sqlerr.22012'],
  [`SELECT CASE WHEN eta < '2026-10-31' THEN ref ELSE 0 END FROM shipments`, 'sqlerr.42804'],
  [`SELECT CASE WHEN eta < '2026-10-31' THEN 1 ELSE 'late' END FROM shipments`, 'sqlerr.22P02'],
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/sqlErrors.test.ts`
Expected: FAIL ở 2 dòng mới (`explainError` trả `undefined`).

- [ ] **Step 3: Sửa code giao diện và i18n**

**Sửa `src/state.ts`** — thay:
```ts
  copyDiagnostics(): void {},
};
```
bằng:
```ts
  copyDiagnostics(): void {},
  /** Replaces the editor text ("Use this example" on a worked ticket). */
  useSql(_sql: string): void {},
};
```

**Sửa `src/main.ts`** — thay:
```ts
Object.assign(actions, { rerender, selectTicket, complete, retryDb: () => db.restart(), copyDiagnostics: () => void copyDiagnostics() });
```
bằng:
```ts
Object.assign(actions, {
  rerender, selectTicket, complete, retryDb: () => db.restart(), copyDiagnostics: () => void copyDiagnostics(), useSql: (sql: string) => work.setDoc(sql),
});
```

**Sửa `src/ui/brief.ts`** — thay:
```ts
/** Conclusion option picked per ticket: survives re-renders and language switches (not saved). */
const picked = new Map<string, number>();
```
bằng:
```ts
/** Conclusion option picked per ticket: survives re-renders and language switches (not saved). */
const picked = new Map<string, number>();
/** Reflect option picked per ticket (curriculum §5.5): same rules, never graded or saved. */
const reflected = new Map<string, number>();
```

**Sửa `src/ui/brief.ts`** — thay:
```ts
/** "This week at Cargo Query" (product-design-v2 ★4): the chapter's story, shown on its first ticket only. */
```
bằng:
```ts
/** format: worked (curriculum §5.1): the annotated example the task is paired with; the button loads it into the editor. */
function exampleCard(tk: Ticket, x: TicketText): HTMLElement | null {
  if (!tk.example || !x.example) return null;
  const sql = tk.example.sql;
  return h('section', { class: 'my-3 rounded-xl bg-panel p-3 ring-1 ring-line', 'aria-labelledby': 'example-title' },
    h('h3', { id: 'example-title', class: 'mt-0' }, t('brief.example')),
    h('pre', { class: 'sql' }, sql),
    richText(x.example),
    h('button', { type: 'button', onclick: () => actions.useSql(sql) }, t('brief.useExample')));
}

/** Recap question (curriculum §5.5): pick an option, then the right one and the reason show. */
function reflectCard(tk: Ticket): HTMLElement | null {
  const r = tk.reflect;
  if (!r) return null;
  const lang = getLang();
  const pick = reflected.get(tk.id);
  return h('section', { class: 'my-3 rounded-xl bg-panel p-3 ring-1 ring-line', 'aria-labelledby': 'reflect-title' },
    h('h4', { id: 'reflect-title', class: 'mt-0' }, t('recap.reflect')),
    h('p', {}, r.q[lang]),
    h('div', { class: 'flex flex-col items-start gap-1.5' }, ...r.options.map((o, i) => h('button', {
      type: 'button',
      class: cx('text-left', pick !== undefined && i === r.answer && 'ring-2 ring-emerald-500'),
      'aria-pressed': pick === i ? 'true' : 'false',
      onclick: () => {
        reflected.set(tk.id, i);
        actions.rerender();
      },
    }, o[lang]))),
    pick === undefined
      ? null
      : h('p', { role: 'status', class: pick === r.answer ? 'good' : 'bad' }, `${t(pick === r.answer ? 'recap.reflectRight' : 'recap.reflectWrong')} ${r.why[lang]}`));
}

/** "This week at Cargo Query" (product-design-v2 ★4): the chapter's story, shown on its first ticket only. */
```

**Sửa `src/ui/brief.ts`** — thay:
```ts
      h('li', {}, h('b', {}, s.label[lang]), ' ', h('code', {}, s.syntax), h('p', { class: 'muted' }, s.when[lang])))),
```
bằng:
```ts
      h('li', {}, h('b', {}, s.label[lang]), ' ', h('code', {}, s.syntax), h('p', { class: 'muted' }, s.when[lang])))),
    reflectCard(tk),
```

**Sửa `src/ui/brief.ts`** — thay:
```ts
    x.task ? h('section', { class: 'my-3 rounded-lg border-l-4 border-accent bg-accent-soft p-3' }, h('h3', { class: 'mt-0' }, t('brief.task')), richText(x.task)) : null,
```
bằng:
```ts
    exampleCard(tk, x),
    x.task ? h('section', { class: 'my-3 rounded-lg border-l-4 border-accent bg-accent-soft p-3' }, h('h3', { class: 'mt-0' }, t('brief.task')), richText(x.task)) : null,
```

**Sửa `src/ui/work.ts`** — thay:
```ts
import { grade, type GradeResult } from '../grader';
import { loadHistory, pushHistory, writeHistory } from '../history';
import { isMac, t } from '../i18n';
```
bằng:
```ts
import type { QueryResult } from '../db/run';
import { compareResults, grade, type GradeResult } from '../grader';
import { loadHistory, pushHistory, writeHistory } from '../history';
import { getLang, isMac, t } from '../i18n';
import { SKILLS } from '../progress';
```

**Sửa `src/ui/work.ts`** — thay:
```ts
import type { Ticket } from '../tickets';
```
bằng:
```ts
import { BLANK, type Ticket } from '../tickets';
```

**Sửa `src/ui/work.ts`** — thay:
```ts
  /** Exactly what Ctrl+Enter would run now (selection or whole editor), to compare with app.lastRun.sql. */
```
bằng:
```ts
  /** Replaces the editor text, undoable ("Use this example" on a worked ticket). */
  setDoc(sql: string): void;
  /** Exactly what Ctrl+Enter would run now (selection or whole editor), to compare with app.lastRun.sql. */
```

**Sửa `src/ui/work.ts`** — thay:
```ts
  async function submit(): Promise<void> {
    if (busy || !editor || !ticket || submitBtn.hidden) return;
    const ed = editor;
    const tk = ticket;
    const i = stepIndex;
    const k = stepKey(tk.id, i);
    const story = isStory(); // captured at click time, like the ticket
    const sql = ed.getValue(); // Submit always grades the whole editor
```
bằng:
```ts
  /**
   * After a wrong result (curriculum §5.4): the author's explanation when the result equals one of the ticket's `wrong:` SQL,
   * else the trap of the skill the ticket teaches. A `wrong:` SQL that fails is a content bug (tests/content.test.ts): skipped.
   */
  async function wrongTip(tk: Ticket, result: QueryResult | undefined): Promise<(() => string) | undefined> {
    if (result) {
      for (const w of tk.wrong ?? []) {
        try {
          if (compareResults(await deps.db.run(w.sql), result, tk.ordered).ok) return () => w.why[getLang()];
        } catch {
          // ignored, see above
        }
      }
    }
    const skill = SKILLS.find((s) => tk.grants.includes(s.id));
    return skill && (() => t('work.trap', { trap: skill.trap[getLang()] }));
  }

  async function submit(): Promise<void> {
    if (busy || !editor || !ticket || submitBtn.hidden) return;
    const ed = editor;
    const tk = ticket;
    const i = stepIndex;
    const k = stepKey(tk.id, i);
    const story = isStory(); // captured at click time, like the ticket
    const sql = ed.getValue(); // Submit always grades the whole editor
    const blanks = tk.format === 'faded' ? sql.split(BLANK).length - 1 : 0; // elsewhere ___ is a valid LIKE pattern
    if (blanks) {
      say('bad', () => t('work.blanks', { n: blanks })); // a faded starter not filled in yet: not graded, not a wrong submit
      return;
    }
```

**Sửa `src/ui/work.ts`** — thay:
```ts
      } else {
        if (fail.reason === 'rows' && played?.result) played.mark = fail.sample;
        say('bad', () => h('div', {}, gradeMessage(fail), voice()));
      }
```
bằng:
```ts
      } else {
        if (fail.reason === 'rows' && played?.result) played.mark = fail.sample;
        const tip = await wrongTip(tk, played?.result);
        if (editor !== ed) return;
        say('bad', () => h('div', {}, gradeMessage(fail), tip ? h('p', { class: 'mt-2 mb-0' }, tip()) : null, voice()));
      }
```

**Sửa `src/ui/work.ts`** — thay:
```ts
    setSchema: (ns) => editor?.setSchema(ns),
```
bằng:
```ts
    setSchema: (ns) => editor?.setSchema(ns),
    setDoc: (sql) => {
      editor?.setValue(sql);
      editor?.focus();
    },
```

**Sửa `src/ui/sqlErrors.ts`** — thay:
```ts
  '22012': 'sqlerr.22012',
```
bằng:
```ts
  '22012': 'sqlerr.22012',
  '42804': 'sqlerr.42804',
  '22P02': 'sqlerr.22P02',
```

**Sửa `src/i18n/vi.ts`** — thay:
```ts
  'sqlerr.22012': 'Chia cho 0. Dùng NULLIF(x, 0) ở mẫu số.',
```
bằng:
```ts
  'sqlerr.22012': 'Chia cho 0. Dùng NULLIF(x, 0) ở mẫu số.',
  'sqlerr.42804': 'Hai giá trị khác kiểu ở cùng một chỗ, ví dụ các nhánh THEN/ELSE của CASE trả về cột chữ và số. Cho mọi nhánh cùng một kiểu.',
  'sqlerr.22P02': 'Một chuỗi trong nháy đơn không đọc được thành kiểu cần dùng (số, ngày…). Kiểm tra lại giá trị; với CASE, cho mọi nhánh cùng một kiểu.',
  'brief.example': 'Ví dụ mẫu',
  'brief.useExample': 'Chép ví dụ vào editor',
  'work.blanks': 'Còn {n} chỗ trống ___ trong câu SQL. Điền hết rồi nộp; lần này không tính là nộp sai.',
  'work.trap': 'Bẫy hay gặp: {trap}',
  'recap.reflect': 'Ngẫm lại',
  'recap.reflectRight': 'Chính xác.',
  'recap.reflectWrong': 'Chưa đúng.',
```

**Sửa `src/i18n/en.ts`** — thay:
```ts
  'sqlerr.22012': 'Division by zero. Use NULLIF(x, 0) in the denominator.',
```
bằng:
```ts
  'sqlerr.22012': 'Division by zero. Use NULLIF(x, 0) in the denominator.',
  'sqlerr.42804': 'Two values of different types meet in one place, for example the THEN/ELSE branches of a CASE return a text column and a number. Give every branch the same type.',
  'sqlerr.22P02': 'A string in single quotes cannot be read as the type needed here (a number, a date…). Check the value; in a CASE, give every branch the same type.',
  'brief.example': 'Worked example',
  'brief.useExample': 'Copy the example into the editor',
  'work.blanks': (p) => `${p.n === 1 ? 'There is still 1 blank' : `There are still ${num(p.n)} blanks`} ___ in the SQL. Fill them in, then submit; this one does not count as a wrong submit.`,
  'work.trap': 'Common trap: {trap}',
  'recap.reflect': 'Think it over',
  'recap.reflectRight': 'Correct.',
  'recap.reflectWrong': 'Not quite.',
```

- [ ] **Step 4: Chạy test, xác nhận PASS rồi commit**

Run: `npm test && npx tsc --noEmit`
Expected: tất cả PASS (`tests/i18n.test.ts` kiểm placeholder `{n}`, `{trap}` khớp VI/EN).

```bash
git add src/state.ts src/main.ts src/ui/brief.ts src/ui/work.ts src/ui/sqlErrors.ts tests/sqlErrors.test.ts src/i18n/vi.ts src/i18n/en.ts
git commit -m "feat(ui): worked example card, faded blanks, wrong-answer explanations and skill traps, reflect question in the Recap"
```

---

### Task 6: Khung nội dung ch4–6 (thẻ kỹ năng, mục tiêu chương, người phụ trách, KPI, mẫu ticket, test phương pháp học)

**Files:**
- Modify: `content/skills.yml`, `content/chapters.yml`, `content/people.yml`, `content/kpis.yml`, `content/TEMPLATE.md`, `tests/content.test.ts`

Kỹ năng thêm **trước** ticket (luật `skills.yml`). `contentProblems` chỉ bắt "dạy đúng một lần" với chương đã có ticket, nên task này xanh khi chưa có ticket ch4–6. Ô KPI trỏ tới ticket chưa có thì khóa (`kpiTiles`).

- [ ] **Step 1: Test phương pháp học (ch ≥ 4)**

**Sửa `tests/content.test.ts`** — thay:
```ts
import { loadTickets } from '../src/content';
import { KPIS } from '../src/home';
import { CHAPTER_TABLES, contentProblems } from '../src/progress';
import { parseTicket, textOf, type TicketText } from '../src/tickets';
import { runner } from './helpers';
```
bằng:
```ts
import { loadTicketTemplates, loadTickets } from '../src/content';
import { compareResults } from '../src/grader';
import { KPIS } from '../src/home';
import { CHAPTER_TABLES, contentProblems, SKILLS } from '../src/progress';
import { parseTicket, textOf, type TicketText } from '../src/tickets';
import { applyVariant, variantsOf } from '../src/variants';
import { runner } from './helpers';
```

**Sửa `tests/content.test.ts`** — thay:
```ts
  ...(x.conclusion ? [x.conclusion.question, ...x.conclusion.options] : []),
].join('\n');
```
bằng:
```ts
  ...(x.conclusion ? [x.conclusion.question, ...x.conclusion.options] : []), x.example ?? '',
].join('\n');
```

**Sửa `tests/content.test.ts`** — thay:
```ts
describe('KPI (content/kpis.yml)', () => {
```
bằng:
```ts
/** curriculum §5: learning-method fields, required from chapter 4 (ch1–3 stay as they are). */
describe('phương pháp học (Plan 2, từ chương 4)', () => {
  const templates = loadTicketTemplates().filter((t) => t.chapter >= 4);
  const normal = templates.filter((t) => t.beat !== 'boss');
  const chapters = [...new Set(templates.map((t) => t.chapter))];
  /** Every variant of every `wrong:` SQL, so a variant cannot make a wrong answer accidentally right. */
  const wrongs = normal.flatMap((t) => Array.from({ length: Math.max(1, variantsOf(t).length) }, (_, v) => applyVariant(t, v))
    .flatMap((tv, v) => (tv.wrong ?? []).map((w, i) => ({ name: `${t.id}#${v} wrong[${i}]`, sql: w.sql, solution: tv.steps[0].solution, ordered: t.ordered }))));

  it.each(chapters)('chương %i: teach là ví dụ mẫu (worked), có đúng một bài làm cùng (faded)', (c) => {
    const inChapter = templates.filter((t) => t.chapter === c);
    expect(inChapter.find((t) => t.beat === 'teach')?.format).toBe('worked');
    expect(inChapter.filter((t) => t.format === 'faded')).toHaveLength(1);
  });

  it.each(normal)('$id: có câu ngẫm lại (reflect), EN không dấu', (t) => {
    expect(t.reflect).toBeDefined();
    const r = t.reflect!;
    expect([r.q, r.why, ...r.options].map((b) => b.en).join('\n')).not.toMatch(VI_DIACRITIC);
    for (const w of t.wrong ?? []) expect(w.why.en).not.toMatch(VI_DIACRITIC);
  });

  it.each(templates.filter((t) => t.example))('$id: SQL ví dụ mẫu chạy được, có dữ liệu, khác Solution', async (t) => {
    const run = await runner();
    const r = await run(t.example!.sql);
    expect(r.rows.length).toBeGreaterThan(0);
    expect(t.example!.sql).not.toBe(t.steps[0].solution);
  });

  it.each(wrongs)('$name: câu sai chạy được và cho kết quả khác Solution', async ({ sql, solution, ordered }) => {
    const run = await runner();
    expect(compareResults(await run(solution), await run(sql), ordered).ok).toBe(false);
  });

  // L37: the review queue needs other figures to practise with, not the same task again.
  it('mỗi kỹ năng mới có một ticket thường với ≥ 3 biến thể (biến thể 0 + 2)', () => {
    const missing = SKILLS.filter((s) => chapters.includes(s.chapter))
      .filter((s) => !normal.some((t) => [...t.requires, ...t.grants].includes(s.id) && variantsOf(t).length >= 3))
      .map((s) => s.id);
    expect(missing).toEqual([]);
  });
});

describe('KPI (content/kpis.yml)', () => {
```

- [ ] **Step 2: Thêm 11 thẻ kỹ năng**

**Thêm vào cuối `content/skills.yml`:**
```yaml

- id: date_math
  chapter: 4
  label: { vi: "Tính trên ngày", en: "Date arithmetic" }
  syntax: "ata - eta AS days_late, etd + 7, DATE '2026-10-31' - ata"
  when: { vi: "Cần số ngày giữa hai mốc, hoặc một ngày cách mốc N ngày.", en: "You need the days between two dates, or the date N days after one." }
  trap: { vi: "Ngày trừ ngày ra số ngày (số nguyên). Ngày cộng interval ra timestamp, không còn là ngày; cộng số nguyên thì vẫn là ngày.", en: "A date minus a date gives a number of days. A date plus an interval becomes a timestamp; plus an integer it stays a date." }

- id: date_bucket
  chapter: 4
  label: { vi: "Gom theo ngày, tuần, tháng", en: "Group by day, week or month" }
  syntax: "SELECT date_trunc('month', booking_date), count(*) ... GROUP BY 1 ORDER BY 1"
  when: { vi: "Cần một con số cho mỗi tháng, mỗi tuần, mỗi ngày.", en: "You need one number per month, week or day." }
  trap: { vi: "date_trunc('week', …) bắt đầu tuần từ thứ Hai; extract(month …) chỉ ra số tháng, gộp lẫn tháng 10 của hai năm.", en: "date_trunc('week', …) starts weeks on Monday; extract(month …) only gives the month number and merges October of two years." }

- id: null_logic
  chapter: 4
  label: { vi: "Giá trị trống (NULL)", en: "Missing values (NULL)" }
  syntax: "WHERE ata IS NULL AND status <> 'CANCELLED'"
  when: { vi: "Tìm thứ chưa được ghi: ngày đến thực tế, ngày thông quan…", en: "Find what has not been recorded yet: actual arrival, clearance date…" }
  trap: { vi: "= NULL không bao giờ đúng, phải viết IS NULL. Ô trống có thể vì nhiều lý do (lô hủy cũng không có ngày đến).", en: "= NULL is never true; write IS NULL. A value can be empty for several reasons (a cancelled shipment has no arrival either)." }

- id: case_when
  chapter: 5
  label: { vi: "Phân loại bằng CASE", en: "Classify with CASE" }
  syntax: "CASE WHEN x <= 1 THEN 1 WHEN x <= 3 THEN 2 ELSE 3 END"
  when: { vi: "Đặt mỗi dòng vào một nhóm theo điều kiện.", en: "Put each row into a group by a condition." }
  trap: { vi: "CASE dừng ở điều kiện đúng đầu tiên, nên xếp điều kiện hẹp lên trước. Thiếu ELSE thì ra NULL.", en: "CASE stops at the first true condition, so put the narrow ones first. Without ELSE you get NULL." }

- id: conditional_agg
  chapter: 5
  label: { vi: "Đếm có điều kiện", en: "Conditional aggregates" }
  syntax: "count(*) FILTER (WHERE lane = 'RED'), SUM(CASE WHEN ata <= eta THEN 1 ELSE 0 END)"
  when: { vi: "Cần nhiều con số theo điều kiện trên cùng một dòng, mỗi điều kiện một cột.", en: "You need several conditional counts side by side, one column per condition." }
  trap: { vi: "Lọc ở WHERE thì mất các dòng khác cho cột kia. Đặt điều kiện vào FILTER hoặc CASE của từng cột.", en: "A WHERE filter drops the rows the other columns need. Put each condition in that column's FILTER or CASE." }

- id: coalesce
  chapter: 5
  label: { vi: "Thay giá trị trống", en: "Fill in missing values" }
  syntax: "COALESCE(t.import_duty_pct, 0), NULLIF(x, 0)"
  when: { vi: "Dùng một giá trị mặc định khi dữ liệu còn trống.", en: "Use a default when the data is missing." }
  trap: { vi: "Phép tính với NULL ra NULL, và SUM bỏ qua NULL mà không báo. COALESCE trước khi tính.", en: "Arithmetic with NULL gives NULL, and SUM skips NULLs silently. COALESCE before you calculate." }

- id: self_join
  chapter: 5
  label: { vi: "Nối bảng với chính nó", en: "Self-join" }
  syntax: "FROM customs_declarations o JOIN customs_declarations a ON a.amended_from_id = o.id"
  when: { vi: "Một dòng trỏ tới dòng khác cùng bảng: tờ khai sửa, khách trùng, quản lý của nhân viên.", en: "A row points to another row of the same table: amendments, duplicates, an employee's manager." }
  trap: { vi: "Đặt hai alias khác nhau và nhớ chuỗi có thể dài hơn một bước (sửa rồi lại sửa).", en: "Use two different aliases, and remember a chain can be longer than one step (amended, then amended again)." }

- id: string_fn
  chapter: 6
  label: { vi: "Hàm chuỗi", en: "String functions" }
  syntax: "upper(name), trim(x), replace(x, 'a', 'b'), regexp_replace(name, '^Công ty (TNHH|CP) ', ''), a || b"
  when: { vi: "Chuẩn hóa hoặc ghép chữ trước khi in, so sánh hay gom nhóm.", en: "Normalise or build text before printing, comparing or grouping." }
  trap: { vi: "replace chỉ thay một chuỗi cố định, và thay mọi chỗ khớp kể cả giữa câu. Muốn bỏ một trong nhiều tiền tố thì dùng regexp_replace với ^ neo đầu chuỗi và | cho các lựa chọn.", en: "replace swaps one fixed string, everywhere it appears, even mid-text. To drop one of several prefixes, use regexp_replace with ^ to anchor the start and | between the options." }

- id: pattern_match
  chapter: 6
  label: { vi: "Tìm theo mẫu chữ", en: "Pattern matching" }
  syntax: "WHERE cargo_desc ILIKE '%frozen%'"
  when: { vi: "Tìm chữ nằm đâu đó trong một ô gõ tay.", en: "Find a word somewhere inside free text." }
  trap: { vi: "LIKE phân biệt hoa thường; ILIKE thì không. Thiếu % ở hai đầu thì chỉ khớp nguyên ô.", en: "LIKE is case-sensitive; ILIKE is not. Without % on both sides it only matches the whole value." }

- id: distinct
  chapter: 6
  label: { vi: "Đếm giá trị khác nhau", en: "Distinct values" }
  syntax: "SELECT DISTINCT pod FROM shipments; count(DISTINCT pod)"
  when: { vi: "Hỏi \"bao nhiêu loại\" hay \"bao nhiêu nơi\", không phải bao nhiêu dòng.", en: "The question is \"how many kinds\" or \"how many places\", not how many rows." }
  trap: { vi: "count(pod) đếm cả lần lặp; count(DISTINCT pod) mới đếm cảng khác nhau.", en: "count(pod) counts repeats too; count(DISTINCT pod) counts different ports." }

- id: cast
  chapter: 6
  label: { vi: "Ép kiểu, chia lấy số lẻ", en: "Casts and decimal division" }
  syntax: "ROUND(count(*) FILTER (WHERE status = 'CANCELLED')::numeric * 100 / count(*), 2)"
  when: { vi: "Tính tỷ lệ, phần trăm, hay đổi chữ thành số hoặc ngày.", en: "Compute a rate or a percentage, or turn text into a number or a date." }
  trap: { vi: "Số nguyên chia số nguyên bỏ phần lẻ: 3 / 4 = 0. Ép một vế sang numeric trước khi chia.", en: "Integer divided by integer drops the decimals: 3 / 4 = 0. Cast one side to numeric before dividing." }
```

- [ ] **Step 3: Mục tiêu chương, bảng phụ trách, KPI, mẫu ticket**

**Sửa `content/chapters.yml`** — thay:
```yaml
    en: "Ships run late, trucks wait, the CFS warehouse fills up. The dispatchers need you to work with dates, including the dates nobody has filled in yet."
  outcomes: []
```
bằng:
```yaml
    en: "Ships run late, trucks wait, the CFS warehouse fills up. The dispatchers need you to work with dates, including the dates nobody has filled in yet."
  outcomes:
    - { vi: "Tính số ngày trễ và ngày hẹn mới từ các mốc ngày", en: "Work out days late and new due dates from the recorded dates", skills: [date_math] }
    - { vi: "Lập báo cáo theo tháng, tuần, ngày", en: "Report by month, week or day", skills: [date_bucket] }
    - { vi: "Tìm thứ chưa được ghi mà không lẫn lô đã hủy", en: "Find what has not been recorded yet without mixing in cancelled shipments", skills: [null_logic] }
```

**Sửa `content/chapters.yml`** — thay:
```yaml
    en: "Customs peak season: green, yellow and red lanes, and declarations that had to be amended. The customs team needs you to classify and count by condition."
  outcomes: []
```
bằng:
```yaml
    en: "Customs peak season: green, yellow and red lanes, and declarations that had to be amended. The customs team needs you to classify and count by condition."
  outcomes:
    - { vi: "Phân loại từng dòng theo điều kiện", en: "Classify each row by a condition", skills: [case_when] }
    - { vi: "Đếm theo nhiều điều kiện trên cùng một dòng báo cáo", en: "Count by several conditions on one report line", skills: [conditional_agg] }
    - { vi: "Thay dữ liệu còn trống bằng giá trị mặc định", en: "Replace missing data with a default", skills: [coalesce] }
    - { vi: "Lần theo tờ khai sửa bằng cách nối bảng với chính nó", en: "Follow amended declarations by joining a table to itself", skills: [self_join] }
```

**Sửa `content/chapters.yml`** — thay:
```yaml
    en: "Customer names are spelled differently in every place, and some customers were entered twice. Before the annual report, the clean-up is yours."
  outcomes: []
```
bằng:
```yaml
    en: "Customer names are spelled differently in every place, and some customers were entered twice. Before the annual report, the clean-up is yours."
  outcomes:
    - { vi: "Chuẩn hóa tên và tìm chữ trong ô gõ tay", en: "Normalise names and search typed text", skills: [string_fn, pattern_match] }
    - { vi: "Đếm có bao nhiêu loại, bao nhiêu nơi khác nhau", en: "Count how many different kinds or places", skills: [distinct] }
    - { vi: "Tính tỷ lệ phần trăm đúng tới số lẻ", en: "Compute percentages with their decimals", skills: [cast] }
```

**Sửa `content/people.yml`** — thay:
```yaml
  role: { vi: "Trưởng phòng Ops, người kèm DA mới", en: "Head of Operations, your mentor" }
  bio: { vi: "Kiên nhẫn, luôn nói \"từng bước một\".", en: "Patient, always says \"one step at a time\"." }
  tables: [shipments, containers]
```
bằng:
```yaml
  role: { vi: "Trưởng phòng Ops, người kèm DA mới", en: "Head of Operations, your mentor" }
  bio: { vi: "Kiên nhẫn, luôn nói \"từng bước một\".", en: "Patient, always says \"one step at a time\"." }
  tables: [shipments, containers, shipment_events]
```

**Sửa `content/people.yml`** — thay:
```yaml
  tables: [shipments, ports]
  look: { skin: light, hair: black, style: bun, accessory: glasses }
```
bằng:
```yaml
  tables: [shipments, ports, customs_declarations]
  look: { skin: light, hair: black, style: bun, accessory: glasses }
```

**Sửa `content/people.yml`** — thay:
```yaml
  bio: { vi: "Soi từng số vận đơn, không để lô nào lệch sổ.", en: "Checks every bill of lading number and never lets a shipment drift off the books." }
  tables: [shipments, containers]
```
bằng:
```yaml
  bio: { vi: "Soi từng số vận đơn, không để lô nào lệch sổ.", en: "Checks every bill of lading number and never lets a shipment drift off the books." }
  tables: [shipments, containers, incoterms]
```

**Sửa `content/people.yml`** — thay:
```yaml
  bio: { vi: "Lúc nào cũng ở bãi, đếm xe kéo và ca bốc xếp.", en: "Always out in the yard, counting trucks and loading shifts." }
  tables: [containers]
```
bằng:
```yaml
  bio: { vi: "Lúc nào cũng ở bãi, đếm xe kéo và ca bốc xếp.", en: "Always out in the yard, counting trucks and loading shifts." }
  tables: [containers, trucking_orders, cfs_receipts]
```

**Sửa `content/people.yml`** — thay:
```yaml
  bio: { vi: "Khai tờ khai nhanh nhất phòng, sợ nhất luồng đỏ.", en: "Files declarations faster than anyone, dreads the red lane." }
  tables: [shipments]
```
bằng:
```yaml
  bio: { vi: "Khai tờ khai nhanh nhất phòng, sợ nhất luồng đỏ.", en: "Files declarations faster than anyone, dreads the red lane." }
  tables: [customs_declarations, hs_codes, duties_taxes]
```

**Sửa `content/kpis.yml`** — thay:
```yaml
- { id: q3margin, ticket: ch12-06, kind: number, label: { vi: "Biên lợi nhuận quý 3/2026", en: "Q3 2026 gross margin" } }
```
bằng:
```yaml
- { id: overdueArrivals, ticket: ch4-04, kind: rowcount, label: { vi: "Lô quá ngày đến dự kiến mà chưa ghi nhận ngày đến", en: "Shipments past their ETA with no arrival recorded" } }
- { id: clearanceDays, ticket: ch5-06, step: 1, kind: bar, label: { vi: "Số ngày thông quan trung bình quý 3/2026 theo luồng", en: "Average clearance days in Q3 2026 by lane" } }
- { id: duplicateCustomers, ticket: ch6-06, kind: rowcount, label: { vi: "Khách bị nhập hai lần với hai cách viết tên", en: "Customers entered twice under two spellings" } }
- { id: q3margin, ticket: ch12-06, kind: number, label: { vi: "Biên lợi nhuận quý 3/2026", en: "Q3 2026 gross margin" } }
```

**Sửa `content/TEMPLATE.md`** — thay:
```markdown
# Hoạt cảnh khi xong (tùy chọn, completion-animations.md §3): scene: { kind: ship|yard|customs|truck|quote|ledger|chat, to?: CNSHA|THLCH|SGSIN|NLRTM|KRPUS|USLAX|AUSYD, lane?: green|yellow|red }. Không khai thì dùng sceneOf().
```
bằng:
````markdown
# Hoạt cảnh khi xong (tùy chọn, completion-animations.md §3): scene: { kind: ship|yard|customs|truck|quote|ledger|chat, to?: CNSHA|THLCH|SGSIN|NLRTM|KRPUS|USLAX|AUSYD, lane?: green|yellow|red }. Không khai thì dùng sceneOf().
# Dạng bài (curriculum §5.1, từ ch4): format: worked | faded | open (mặc định open).
#   worked (ticket teach): thêm "## Example" ngay sau "## Task": một khối ```sql đánh dấu -- ①, -- ②… rồi mỗi dấu một đoạn giải thích
#   (các đoạn cách nhau một dòng trống). Khối # EN có "## Example" chỉ gồm lời giải thích, code span giống hệt bản VI.
#   faded: starter có ít nhất một chỗ trống ___ (Nộp khi còn ___ thì báo, không tính là nộp sai).
# reflect (mọi ticket thường từ ch4): { q: {vi, en}, options: [{vi, en}, …] (2–4), answer: số thứ tự đáp án đúng từ 0, why: {vi, en} } — câu ngẫm lại trong Recap.
# wrong (tùy chọn): [{ sql, vi, en }] — câu SQL sai hay gặp; kết quả người chơi trùng kết quả câu này thì phản hồi hiện lời giải thích.
#   Mỗi câu phải chạy được và khác kết quả Solution ở mọi biến thể (tests/content.test.ts).
# variants: từ ch4, mỗi kỹ năng mới cần một ticket thường có ≥ 3 biến thể (biến thể 0 + 2) để hàng ôn có bài khác (L37).
````

- [ ] **Step 4: Chạy test, xác nhận PASS rồi commit**

Run: `npx vitest run tests/content.test.ts tests/progress.test.ts tests/people.test.ts tests/home.test.ts && npx tsc --noEmit`
Expected: tất cả PASS (khối "phương pháp học" chưa có ticket nào để kiểm; `TEMPLATE.md` vẫn là ticket hợp lệ).

```bash
git add content/skills.yml content/chapters.yml content/people.yml content/kpis.yml content/TEMPLATE.md tests/content.test.ts
git commit -m "content: chapter 4-6 skill cards, outcomes, table owners, KPI tiles; learning-method content tests"
```

---

### Task 7: Chương 4 · Lịch tàu & thời gian (6 ticket)

**Files:**
- Create: `content/tickets/ch4/ch4-01.md` … `ch4-06.md`
- Modify: `tests/scene.test.ts`

Người hỏi: Đặng Trang (CSKH), Hoàng Khánh (Ops), Bùi Long (điều độ vận tải & CFS), Võ Thu (Trưởng phòng CSKH), Giám đốc. Bẫy twist: lô hủy cũng không có ngày đến thực tế; `= NULL` không bao giờ đúng. Cột mốc kiểm `null_logic` (`IS NULL` ở bước 1, regex twist), `date_math`, `date_bucket`.

- [ ] **Step 1: Bảng hoạt cảnh mong đợi (test viết trước)**

**Sửa `tests/scene.test.ts`** — thay:
```ts
  it('15 ticket ch1–3 ra đúng bảng §3.3 (sau 3 dòng scene: của Step 4)', () => {
```
bằng:
```ts
  it('mọi ticket ra đúng bảng §3.3 (ch1–3 sau 3 dòng scene: của Step 4; ch4–6 theo Plan 2)', () => {
```

**Sửa `tests/scene.test.ts`** — thay:
```ts
      'ch3-05': { kind: 'promotion' },
    });
```
bằng:
```ts
      'ch3-05': { kind: 'promotion' },
      'ch4-01': { kind: 'chat' }, 'ch4-02': { kind: 'ship' }, 'ch4-03': { kind: 'truck' }, 'ch4-04': { kind: 'chat' },
      'ch4-05': { kind: 'truck' }, 'ch4-06': { kind: 'promotion' },
    });
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/scene.test.ts`
Expected: FAIL: thiếu `ch4-01` … `ch4-06`.

- [ ] **Step 3: Viết 6 ticket**

**Tạo `content/tickets/ch4/ch4-01.md`:**
````markdown
---
id: ch4-01
chapter: 4
title: Thư xin lỗi khách vì tàu đến trễ
title_en: Apology letters for late arrivals
from: { name: Đặng Trang, dept: CS }
difficulty: 2
beat: teach
format: worked
requires: [join, order_by]
grants: [date_math]
tables: [shipments, customers]
ordered: true
columns:
  - { vi: "Mã lô", en: "Shipment ref" }
  - { vi: "Tên khách hàng", en: "Customer name" }
  - { vi: "Ngày đến dự kiến (ETA)", en: "Planned arrival (ETA)" }
  - { vi: "Ngày đến thực tế", en: "Actual arrival" }
  - { vi: "Số ngày trễ", en: "Days late" }
variants:
  - { month: "10/2026", month_en: "October 2026", from: "2026-10-01", to: "2026-11-01" }
  - { month: "8/2026", month_en: "August 2026", from: "2026-08-01", to: "2026-09-01" }
  - { month: "6/2026", month_en: "June 2026", from: "2026-06-01", to: "2026-07-01" }
reflect:
  q: { vi: "Lấy ngày đến thực tế trừ ngày đến dự kiến thì được gì?", en: "What do you get when you subtract the planned arrival from the actual arrival?" }
  options:
    - { vi: "Số ngày giữa hai mốc, là một số nguyên", en: "The number of days between them, an integer" }
    - { vi: "Một ngày mới", en: "A new date" }
    - { vi: "Một khoảng thời gian tính bằng giờ", en: "A time span in hours" }
  answer: 0
  why: { vi: "Ngày trừ ngày ra số ngày. Còn ngày cộng một số nguyên thì ra một ngày mới, như hạn gửi chứng từ trong ví dụ mẫu.", en: "A date minus a date is a number of days. A date plus an integer is a new date, like the document deadline in the worked example." }
wrong:
  - sql: "SELECT s.ref, c.name, s.eta, s.ata, s.ata - s.eta FROM shipments s JOIN customers c ON c.id = s.customer_id WHERE s.ata >= '{{from}}' AND s.ata < '{{to}}' AND s.ata > s.eta ORDER BY s.ata - s.eta DESC, s.ref"
    vi: "Danh sách đang có cả lô trễ 1 đến 3 ngày. Đề chỉ cần lô trễ hơn 3 ngày."
    en: "Your list also has shipments 1 to 3 days late. The request is only for more than 3 days late."
---
Tháng nào CSKH cũng gửi thư xin lỗi các khách có lô đến trễ nhiều. Thư phải ghi đúng lô, đúng ngày và đúng số ngày trễ; ghi sai một con số là khách càng thêm bực.

Đây là việc đầu tiên của bạn với ngày tháng, nên mình gửi kèm một ví dụ mẫu đã làm sẵn. Đọc ví dụ, chạy thử, rồi làm phần của bạn.

## Task
Những lô cập cảng trong tháng {{month}} mà đến trễ hơn 3 ngày so với ngày đến dự kiến (ETA): gửi mình mã lô, tên khách, ngày đến dự kiến, ngày đến thực tế và số ngày trễ. Trễ nhiều nhất lên đầu; trễ bằng nhau thì mã lô nhỏ hơn đứng trước.

## Example
```sql
SELECT ref, etd, atd,
       atd - etd AS days_late,                       -- ①
       atd + 2 AS docs_due                           -- ②
FROM shipments
WHERE atd >= '2026-09-14' AND atd < '2026-09-21'     -- ③
  AND atd - etd > 1                                  -- ④
ORDER BY days_late DESC, ref
```
Ví dụ: trong tuần 14–20/9/2026, lô nào rời cảng trễ hơn 1 ngày so với lịch, và hạn gửi bộ chứng từ cho khách (2 ngày sau ngày tàu chạy thực tế) là ngày nào?

① Ngày trừ ngày ra số ngày: `atd - etd` là số ngày tàu chạy trễ.

② Ngày cộng một số nguyên ra một ngày mới: `atd + 2` là hạn gửi chứng từ.

③ Khoảng ngày viết dạng nửa mở: từ ngày đầu, và trước ngày ngay sau ngày cuối. Viết vậy thì không phải nhớ tháng có 30 hay 31 ngày.

④ Điều kiện đặt thẳng lên phép trừ: chỉ giữ lô trễ hơn 1 ngày.

## Hints
1. Thông tin nằm trong danh mục lô hàng, cộng tên khách từ hồ sơ khách hàng. Số ngày trễ là phép trừ giữa hai mốc ngày, như ví dụ mẫu nhưng dùng ngày đến thay cho ngày đi.
2. Bảng `shipments` (cột `eta`, `ata`) nối `customers` qua `customer_id`. Lọc tháng bằng `s.ata >= '{{from}}' AND s.ata < '{{to}}'`, trễ hơn 3 ngày là `s.ata - s.eta > 3`, sắp xếp `ORDER BY s.ata - s.eta DESC, s.ref`.
3. `SELECT s.ref, c.name, s.eta, s.ata, s.ata - s.eta FROM shipments s JOIN customers c ON ... WHERE ... ORDER BY ...`

## Solution
```sql
SELECT s.ref, c.name, s.eta, s.ata, s.ata - s.eta
FROM shipments s
JOIN customers c ON c.id = s.customer_id
WHERE s.ata >= '{{from}}' AND s.ata < '{{to}}'
  AND s.ata - s.eta > 3
ORDER BY s.ata - s.eta DESC, s.ref
```

# EN
Every month customer service sends apology letters to customers whose shipments arrived very late. Each letter must name the right shipment, the right dates and the right number of days late; one wrong figure only makes the customer angrier.

This is your first task with dates, so I am sending a worked example along. Read it, run it, then do your part.

## Task
For the shipments that arrived in {{month_en}} more than 3 days after their planned arrival (ETA): send me the shipment ref, customer name, planned arrival, actual arrival and the number of days late. Latest first; on equal days late, the smaller shipment ref first.

## Example
Example: in the week of 14 to 20 September 2026, which shipments left port more than 1 day behind schedule, and when is their document set due to the customer (2 days after the actual departure)?

① A date minus a date gives a number of days: `atd - etd` is how many days late the ship sailed.

② A date plus an integer gives a new date: `atd + 2` is the document deadline.

③ Date ranges are written half-open: from the first day, and before the day after the last one. That way you never need to remember whether a month has 30 or 31 days.

④ The condition works on the subtraction itself: only shipments more than 1 day late stay.

## Hints
1. The information is in the shipment list, plus the customer name from the customer records. Days late is a subtraction between two dates, like the worked example but with arrival dates instead of departure dates.
2. Table `shipments` (columns `eta`, `ata`) joined to `customers` through `customer_id`. Filter the month with `s.ata >= '{{from}}' AND s.ata < '{{to}}'`, more than 3 days late is `s.ata - s.eta > 3`, and sort with `ORDER BY s.ata - s.eta DESC, s.ref`.
3. `SELECT s.ref, c.name, s.eta, s.ata, s.ata - s.eta FROM shipments s JOIN customers c ON ... WHERE ... ORDER BY ...`
````

**Tạo `content/tickets/ch4/ch4-02.md`:**
````markdown
---
id: ch4-02
chapter: 4
title: Mùa cao điểm booking
title_en: Booking peak season
from: { name: Hoàng Khánh, dept: Ops }
difficulty: 2
beat: develop
format: faded
requires: [aggregate, group_by, order_by]
grants: [date_bucket]
tables: [shipments]
ordered: true
columns:
  - { vi: "Tháng (ngày đầu tháng)", en: "Month (first day)" }
  - { vi: "Số booking", en: "Number of bookings" }
starter: |
  SELECT date_trunc(___, booking_date) AS month, count(*) AS bookings
  FROM shipments
  WHERE booking_date >= '{{from}}' AND booking_date < '{{to}}'
  GROUP BY ___
  ORDER BY month
variants:
  - { from: "2025-11-01", to: "2026-11-01", first: "11/2025", last: "10/2026", first_en: "November 2025", last_en: "October 2026" }
  - { from: "2025-01-01", to: "2026-01-01", first: "01/2025", last: "12/2025", first_en: "January 2025", last_en: "December 2025" }
  - { from: "2025-05-01", to: "2026-05-01", first: "05/2025", last: "04/2026", first_en: "May 2025", last_en: "April 2026" }
reflect:
  q: { vi: "Vì sao không gom theo số tháng (1 đến 12) mà phải ghi tháng bằng ngày đầu tháng?", en: "Why not group by the month number (1 to 12) instead of the first day of the month?" }
  options:
    - { vi: "Mười hai tháng có thể vắt qua hai năm; số tháng gộp chung cùng một tháng của hai năm", en: "Twelve months can span two years; the month number merges the same month of both years" }
    - { vi: "Gom theo số tháng chạy chậm hơn", en: "Grouping by the month number is slower" }
    - { vi: "Số tháng không sắp xếp được", en: "Month numbers cannot be sorted" }
  answer: 0
  why: { vi: "Ngày đầu tháng giữ cả năm lẫn tháng, nên mỗi tháng của mỗi năm là một nhóm riêng và vẫn sắp đúng thứ tự thời gian.", en: "The first day of the month keeps both the year and the month, so every month of every year is its own group and still sorts in time order." }
wrong:
  - sql: "SELECT extract(month FROM booking_date), count(*) FROM shipments WHERE booking_date >= '{{from}}' AND booking_date < '{{to}}' GROUP BY 1 ORDER BY 1"
    vi: "Bạn đang gom theo số tháng (1 đến 12). Đề cần ghi tháng bằng ngày đầu tháng, để không nhầm tháng của hai năm khác nhau."
    en: "You are grouping by the month number (1 to 12). The request wants each month as its first day, so months of different years never mix."
---
Đầu năm mình phải xin ngân sách thuê nhân viên thời vụ cho mùa cao điểm. Muốn xin đúng, mình cần thấy số booking từng tháng để biết tháng nào bận nhất.

Câu SQL trong editor đã viết gần xong, chỉ còn mấy chỗ trống ___. Bạn điền cho đủ rồi nộp.

## Task
Mỗi tháng từ {{first}} đến {{last}}, công ty nhận bao nhiêu booking? Tính mọi booking, kể cả lô đã hủy: hủy thì team booking vẫn phải xử lý. Mỗi tháng một dòng: tháng (ghi bằng ngày đầu tháng) và số booking; tháng sớm nhất lên đầu.

## Hints
1. Mỗi booking có một ngày đặt chỗ. Muốn đếm theo tháng thì đưa mọi ngày của cùng một tháng về một giá trị chung (ngày đầu tháng), rồi đếm theo giá trị đó.
2. `date_trunc('month', booking_date)` đưa mỗi ngày về ngày đầu tháng của nó. Chỗ trống thứ hai là thứ cần gom: `GROUP BY month` hoặc `GROUP BY 1` (cột thứ nhất).
3. `SELECT date_trunc('month', booking_date) AS month, count(*) AS bookings FROM shipments WHERE ... GROUP BY month ORDER BY month`

## Solution
```sql
SELECT date_trunc('month', booking_date) AS month, count(*) AS bookings
FROM shipments
WHERE booking_date >= '{{from}}' AND booking_date < '{{to}}'
GROUP BY month
ORDER BY month
```

# EN
At the start of the year I have to ask for a budget for seasonal staff for the peak season. To ask for the right amount, I need to see the bookings per month and which months are the busiest.

The SQL in the editor is almost done; only a few ___ blanks are left. Fill them in, then submit.

## Task
For each month from {{first_en}} to {{last_en}}, how many bookings did the company take? Count every booking, cancelled ones included: the booking team still had to handle them. One row per month: the month (as its first day) and the number of bookings; earliest month first.

## Hints
1. Every booking has a booking date. To count per month, bring every date of the same month to one shared value (the first day of the month), then count by that value.
2. `date_trunc('month', booking_date)` turns each date into the first day of its month. The second blank is what you group by: `GROUP BY month` or `GROUP BY 1` (the first column).
3. `SELECT date_trunc('month', booking_date) AS month, count(*) AS bookings FROM shipments WHERE ... GROUP BY month ORDER BY month`
````

**Tạo `content/tickets/ch4/ch4-03.md`:**
````markdown
---
id: ch4-03
chapter: 4
title: Lô nhập chờ xe kéo về kho
title_en: Imports waiting for a truck
from: { name: Bùi Long, dept: Ops }
difficulty: 3
beat: develop
requires: [anti_join, date_math, order_by]
grants: []
tables: [shipments, trucking_orders]
ordered: true
scene: { kind: truck }
columns:
  - { vi: "Mã lô", en: "Shipment ref" }
  - { vi: "Ngày cập cảng", en: "Arrival date" }
  - { vi: "Số ngày đã nằm ở cảng", en: "Days at the port" }
reflect:
  q: { vi: "Lô chưa cập cảng (chưa có ngày đến thực tế) có lọt vào danh sách không?", en: "Can a shipment that has not arrived yet (no actual arrival) end up in the list?" }
  options:
    - { vi: "Không: lấy hôm nay trừ một ô trống thì ra trống, và so trống với 3 không bao giờ đúng", en: "No: today minus an empty value is empty, and comparing empty with 3 is never true" }
    - { vi: "Có: ô trống được tính là 0", en: "Yes: an empty value counts as 0" }
    - { vi: "Không: Postgres báo lỗi khi gặp ô trống", en: "No: Postgres raises an error on an empty value" }
  answer: 0
  why: { vi: "Phép tính với giá trị trống ra trống, và điều kiện trống bị coi như không đúng nên dòng đó bị bỏ. Chương này còn gặp lại chuyện này.", en: "Arithmetic with an empty value gives empty, and an empty condition is treated as not true, so the row is dropped. You will meet this again in this chapter." }
wrong:
  - sql: "SELECT s.ref, s.ata, DATE '2026-10-31' - s.ata FROM shipments s LEFT JOIN trucking_orders t ON t.shipment_id = s.id WHERE s.direction = 'IMPORT' AND s.mode = 'SEA' AND DATE '2026-10-31' - s.ata >= 3 AND t.id IS NULL ORDER BY 3 DESC, s.ref"
    vi: "Danh sách đang có cả lô mới nằm ở cảng đúng 3 ngày. Đề hỏi lô đã nằm hơn 3 ngày."
    en: "Your list also has shipments that have been at the port for exactly 3 days. The request is for more than 3 days."
---
Hàng nhập đường biển cập cảng mà không kéo về kho sớm thì bắt đầu tốn phí lưu bãi, lưu container. Mình cần biết lô nào đang bị bỏ quên ở cảng để điều xe gấp.

## Task
Tính đến hôm nay 31/10/2026, lô hàng nhập khẩu đường biển nào đã cập cảng hơn 3 ngày mà vẫn chưa có lệnh xe kéo nào? Gửi mình mã lô, ngày cập cảng và số ngày lô đã nằm ở cảng (31/10/2026 trừ ngày cập cảng). Lô nằm lâu nhất lên đầu; bằng nhau thì mã lô nhỏ hơn đứng trước.

## Hints
1. Đây là câu hỏi về thứ không có (lô chưa có lệnh xe), như bài khách lâu không gửi hàng ở chương 3, cộng thêm một phép tính ngày như bài thư xin lỗi.
2. `shipments` nối trái `trucking_orders` qua `shipment_id`, giữ `t.id IS NULL`. Lô nhập đường biển: `s.direction = 'IMPORT' AND s.mode = 'SEA'`. Số ngày ở cảng: `DATE '2026-10-31' - s.ata`, hơn 3 ngày là `> 3`.
3. `SELECT s.ref, s.ata, DATE '2026-10-31' - s.ata FROM shipments s LEFT JOIN trucking_orders t ON ... WHERE ... ORDER BY 3 DESC, s.ref`

## Solution
```sql
SELECT s.ref, s.ata, DATE '2026-10-31' - s.ata
FROM shipments s
LEFT JOIN trucking_orders t ON t.shipment_id = s.id
WHERE s.direction = 'IMPORT' AND s.mode = 'SEA'
  AND DATE '2026-10-31' - s.ata > 3
  AND t.id IS NULL
ORDER BY 3 DESC, s.ref
```

# EN
Sea imports that arrive and are not trucked to the warehouse quickly start running up storage and container charges. I need to know which shipments are forgotten at the port so I can send trucks right away.

## Task
As of today, 31 October 2026, which sea import shipments arrived more than 3 days ago and still have no trucking order at all? Send me the shipment ref, the arrival date and how many days the shipment has been at the port (31 October 2026 minus the arrival date). Longest wait first; on equal days, the smaller shipment ref first.

## Hints
1. This is a question about something missing (shipments with no trucking order), like the customers who went quiet in chapter 3, plus a date calculation like the apology letters.
2. `shipments` left-joined to `trucking_orders` through `shipment_id`, keeping `t.id IS NULL`. Sea imports: `s.direction = 'IMPORT' AND s.mode = 'SEA'`. Days at the port: `DATE '2026-10-31' - s.ata`, and more than 3 days is `> 3`.
3. `SELECT s.ref, s.ata, DATE '2026-10-31' - s.ata FROM shipments s LEFT JOIN trucking_orders t ON ... WHERE ... ORDER BY 3 DESC, s.ref`
````

**Tạo `content/tickets/ch4/ch4-04.md`:**
````markdown
---
id: ch4-04
chapter: 4
title: Lô quá hạn mà chưa thấy đến
title_en: Overdue shipments with no arrival
from: { name: Võ Thu, dept: CS }
difficulty: 3
beat: twist
requires: [join, order_by]
grants: [null_logic]
tables: [shipments, customers]
ordered: true
columns:
  - { vi: "Mã lô", en: "Shipment ref" }
  - { vi: "Tên khách hàng", en: "Customer name" }
  - { vi: "Ngày đến dự kiến (ETA)", en: "Planned arrival (ETA)" }
variants:
  - { cut: "2026-10-31", day: "31/10/2026", day_en: "31 October 2026" }
  - { cut: "2026-10-29", day: "29/10/2026", day_en: "29 October 2026" }
  - { cut: "2026-10-27", day: "27/10/2026", day_en: "27 October 2026" }
reflect:
  q: { vi: "Vì sao điều kiện ata = NULL không trả về dòng nào?", en: "Why does the condition ata = NULL return no rows?" }
  options:
    - { vi: "NULL nghĩa là chưa biết, nên so bằng với nó cũng ra chưa biết, không phải đúng", en: "NULL means unknown, so an equality check against it is unknown too, never true" }
    - { vi: "Cột ngày không so được với bất kỳ giá trị nào", en: "A date column cannot be compared with anything" }
    - { vi: "Phải viết NULL trong nháy đơn", en: "NULL has to be written in single quotes" }
  answer: 0
  why: { vi: "Một dòng chỉ được giữ khi điều kiện ra đúng. So sánh với NULL luôn ra NULL, nên chỉ IS NULL và IS NOT NULL kiểm được ô trống.", en: "A row is kept only when the condition is true. Any comparison with NULL gives NULL, so only IS NULL and IS NOT NULL can test for an empty value." }
wrong:
  - sql: "SELECT s.ref, c.name, s.eta FROM shipments s JOIN customers c ON c.id = s.customer_id WHERE s.eta < '{{cut}}' AND s.ata = NULL AND s.status <> 'CANCELLED' ORDER BY s.eta, s.ref"
    vi: "Kết quả rỗng vì so bằng với NULL không bao giờ đúng. Ô trống phải kiểm bằng IS NULL."
    en: "The result is empty because an equality check against NULL is never true. Test an empty value with IS NULL."
  - sql: "SELECT s.ref, c.name, s.eta FROM shipments s JOIN customers c ON c.id = s.customer_id WHERE s.eta < '{{cut}}' AND s.ata IS NULL ORDER BY s.eta, s.ref"
    vi: "Danh sách đang có cả lô đã hủy. Lô hủy cũng không bao giờ có ngày đến thực tế, nhưng không ai cần gọi khách về chúng."
    en: "Your list includes cancelled shipments. A cancelled shipment never gets an actual arrival either, but nobody needs to call about it."
---
Khách gọi hỏi lô của mình đang ở đâu là chuyện CSKH sợ nhất. Mình muốn gọi trước cho những khách có lô đã quá ngày đến dự kiến mà hệ thống vẫn chưa ghi nhận ngày đến thực tế.

## Task
Lô nào có ngày đến dự kiến trước ngày {{day}} mà đến giờ vẫn chưa ghi nhận ngày đến thực tế? Lô đã hủy thì không cần gọi. Gửi mình mã lô, tên khách và ngày đến dự kiến; ngày đến dự kiến sớm nhất lên đầu, bằng nhau thì mã lô nhỏ hơn đứng trước.

## Hints
1. Lô chưa đến là lô mà ô ngày đến thực tế còn trống. Ô trống không phải số 0 hay chuỗi rỗng, nên không so bằng được như giá trị thường. Và để ý: lô đã hủy cũng không bao giờ có ngày đến.
2. Ô trống trong SQL là `NULL`, kiểm bằng `s.ata IS NULL` chứ không phải `s.ata = NULL`. Thêm `s.eta < '{{cut}}'` và `s.status <> 'CANCELLED'`, nối `customers` để lấy tên.
3. `SELECT s.ref, c.name, s.eta FROM shipments s JOIN customers c ON ... WHERE s.eta < '{{cut}}' AND s.ata IS NULL AND ... ORDER BY s.eta, s.ref`

## Solution
```sql
SELECT s.ref, c.name, s.eta
FROM shipments s
JOIN customers c ON c.id = s.customer_id
WHERE s.eta < '{{cut}}' AND s.ata IS NULL AND s.status <> 'CANCELLED'
ORDER BY s.eta, s.ref
```

# EN
A customer calling to ask where their shipment is: that is what customer service dreads most. I want to call first the customers whose shipments are past their planned arrival while the system still shows no actual arrival.

## Task
Which shipments have a planned arrival before {{day_en}} and still no actual arrival recorded? Cancelled shipments need no call. Send me the shipment ref, customer name and planned arrival; earliest planned arrival first, and on the same date the smaller shipment ref first.

## Hints
1. A shipment that has not arrived is one whose actual arrival is still empty. An empty value is not 0 and not an empty string, so you cannot test it with a normal equality check. And watch out: a cancelled shipment never gets an arrival date either.
2. An empty value in SQL is `NULL`; test it with `s.ata IS NULL`, not `s.ata = NULL`. Add `s.eta < '{{cut}}'` and `s.status <> 'CANCELLED'`, and join `customers` for the name.
3. `SELECT s.ref, c.name, s.eta FROM shipments s JOIN customers c ON ... WHERE s.eta < '{{cut}}' AND s.ata IS NULL AND ... ORDER BY s.eta, s.ref`
````

**Tạo `content/tickets/ch4/ch4-05.md`:**
````markdown
---
id: ch4-05
chapter: 4
title: Xếp ca bốc xếp kho CFS
title_en: Loading shifts at the CFS warehouse
from: { name: Bùi Long, dept: Ops }
difficulty: 2
beat: rest
requires: [aggregate, group_by, order_by, where]
grants: []
tables: [cfs_receipts]
ordered: true
scene: { kind: truck }
columns:
  - { vi: "Ngày nhận hàng", en: "Receiving date" }
  - { vi: "Số lô hàng lẻ", en: "LCL shipments" }
  - { vi: "Tổng CBM", en: "Total CBM" }
reflect:
  q: { vi: "Điều kiện từ ngày 26 đến ngày 31 viết bằng BETWEEN có lấy ngày 31 không?", en: "Does a BETWEEN condition from the 26th to the 31st include the 31st?" }
  options:
    - { vi: "Có: BETWEEN tính cả hai đầu", en: "Yes: BETWEEN includes both ends" }
    - { vi: "Không: BETWEEN bỏ ngày cuối", en: "No: BETWEEN leaves out the last day" }
    - { vi: "Chỉ khi viết ngày theo dạng ngày/tháng/năm", en: "Only when the date is written as day/month/year" }
  answer: 0
  why: { vi: "BETWEEN gồm cả hai đầu. Cột chỉ có ngày thì đúng ý; với cột có cả giờ, mọi lúc sau 0 giờ ngày 31 sẽ bị bỏ, nên khoảng nửa mở (trước ngày 01/11) an toàn hơn.", en: "BETWEEN includes both ends. That is right for a date-only column; with a column that also has a time, everything after midnight on the 31st is left out, so a half-open range (before 1 November) is safer." }
---
Kho CFS nhận hàng lẻ (LCL) cả hai chiều: hàng xuất mang tới để đóng chung container, và hàng nhập rút ra từ container. Mình xếp ca bốc xếp theo khối lượng hàng vào kho mỗi ngày, nên cần số liệu tuần vừa rồi.

## Task
Từ ngày 26 đến hết ngày 31/10/2026, mỗi ngày kho CFS nhận bao nhiêu lô hàng lẻ và tổng bao nhiêu CBM (theo số đo tại kho)? Mỗi ngày một dòng: ngày nhận, số lô, tổng CBM; ngày sớm nhất lên đầu.

## Hints
1. Mỗi lần kho nhận một lô là một phiếu nhập kho, có ngày nhận và số khối đo tại kho. Đây là bài đếm và cộng theo từng ngày, như các báo cáo sản lượng ở chương 2.
2. Bảng `cfs_receipts`, cột `received_date` và `volume_cbm`. Lọc `received_date BETWEEN '2026-10-26' AND '2026-10-31'`, gom theo `received_date`.
3. `SELECT received_date, count(*), SUM(volume_cbm) FROM cfs_receipts WHERE ... GROUP BY received_date ORDER BY received_date`

## Solution
```sql
SELECT received_date, count(*), SUM(volume_cbm)
FROM cfs_receipts
WHERE received_date BETWEEN '2026-10-26' AND '2026-10-31'
GROUP BY received_date
ORDER BY received_date
```

# EN
The CFS warehouse handles less-than-container (LCL) cargo both ways: export cargo brought in to be packed into shared containers, and import cargo unpacked from containers. I plan the loading shifts by how much cargo comes in each day, so I need last week's figures.

## Task
From 26 to 31 October 2026 inclusive, how many LCL shipments did the CFS warehouse receive each day, and how many CBM in total (as measured at the warehouse)? One row per day: receiving date, number of shipments, total CBM; earliest day first.

## Hints
1. Each shipment the warehouse receives gets one receipt, with a receiving date and the volume measured on site. This is counting and adding up per day, like the volume reports in chapter 2.
2. Table `cfs_receipts`, columns `received_date` and `volume_cbm`. Filter with `received_date BETWEEN '2026-10-26' AND '2026-10-31'` and group by `received_date`.
3. `SELECT received_date, count(*), SUM(volume_cbm) FROM cfs_receipts WHERE ... GROUP BY received_date ORDER BY received_date`
````

**Tạo `content/tickets/ch4/ch4-06.md`:**
````markdown
---
id: ch4-06
chapter: 4
title: "Đánh giá thăng tiến: giao ban vận hành tháng 10"
title_en: "Promotion review: the October operations meeting"
from: { name: Trần An, dept: Management }
difficulty: 3
beat: boss
requires: [null_logic, date_math, date_bucket, join, multi_join, aggregate, group_by, order_by]
grants: []
tables: [shipments, customers, shipment_events, ports]
ordered: true
columns:
  - [{ vi: "Mã lô", en: "Shipment ref" }, { vi: "Tên khách hàng", en: "Customer name" }, { vi: "Ngày đến dự kiến (ETA)", en: "Planned arrival (ETA)" }, { vi: "Số ngày quá hạn", en: "Days overdue" }]
  - [{ vi: "Cảng đến", en: "Destination port" }, { vi: "Số ngày trung bình từ cập cảng đến giao hàng", en: "Average days from arrival to delivery" }]
  - [{ vi: "Tuần (ngày thứ Hai đầu tuần)", en: "Week (its Monday)" }, { vi: "Số lô cập cảng", en: "Shipments arrived" }]
conclusion:
  question: "Ở bước 1, vì sao phải viết ata IS NULL thay vì ata = NULL?"
  options:
    - "So bằng với NULL không bao giờ đúng, nên sẽ không ra dòng nào"
    - "Hai cách viết như nhau, IS NULL chỉ dễ đọc hơn"
    - "Dấu bằng với NULL chỉ báo lỗi khi cột là kiểu ngày"
  answer: 0
conclusion_en:
  question: "In step 1, why must you write ata IS NULL instead of ata = NULL?"
  options:
    - "An equality check against NULL is never true, so no row would come back"
    - "Both mean the same; IS NULL is just easier to read"
    - "An equals sign with NULL only fails on date columns"
---
Đây là buổi đánh giá thăng tiến của bạn. Sáng thứ Hai mình chủ trì giao ban vận hành tháng 10 với Ops và CSKH, và mình cần ba bảng số. Làm đúng cả ba là bạn bước thêm một bước trong sự nghiệp.

## Step 1: Lô quá hạn mà chưa đến
Tính đến hôm nay 31/10/2026: các lô có ngày đến dự kiến trước hôm nay mà chưa ghi nhận ngày đến thực tế, không tính lô đã hủy. Gửi mã lô, tên khách, ngày đến dự kiến và số ngày đã quá hạn (31/10/2026 trừ ngày đến dự kiến). Quá hạn lâu nhất lên đầu; bằng nhau thì mã lô nhỏ hơn đứng trước.
```sql
SELECT s.ref, c.name, s.eta, DATE '2026-10-31' - s.eta
FROM shipments s
JOIN customers c ON c.id = s.customer_id
WHERE s.eta < '2026-10-31' AND s.ata IS NULL AND s.status <> 'CANCELLED'
ORDER BY 4 DESC, s.ref
```

## Step 2: Từ cập cảng đến giao hàng
Với các lô giao cho khách trong tháng 10/2026 (theo mốc giao hàng trong nhật ký các mốc của lô), từ ngày tàu cập cảng đến ngày giao mất trung bình bao nhiêu ngày, theo từng cảng đến? Gửi tên cảng đến và số ngày trung bình làm tròn 2 chữ số thập phân; xếp theo tên cảng theo thứ tự chữ cái.
```sql
SELECT p.name, ROUND(AVG(e.event_date - s.ata), 2)
FROM shipment_events e
JOIN shipments s ON s.id = e.shipment_id
JOIN ports p ON p.code = s.pod
WHERE e.event = 'DELIVERED' AND e.event_date >= '2026-10-01' AND e.event_date < '2026-11-01'
GROUP BY p.name
ORDER BY p.name
```

## Step 3: Lô cập cảng theo tuần
Mỗi tuần có bao nhiêu lô cập cảng trong tháng 10/2026? Tuần bắt đầu từ thứ Hai và ghi bằng ngày thứ Hai đó. Tuần đầu là tuần chứa ngày 01/10 (bắt đầu từ thứ Hai 28/9), nhưng chỉ đếm lô cập cảng từ 01/10 trở đi. Tuần sớm nhất lên đầu.
```sql
SELECT date_trunc('week', ata), count(*)
FROM shipments
WHERE ata >= '2026-10-01' AND ata < '2026-11-01'
GROUP BY 1
ORDER BY 1
```

## Hints
1. Bước 1 là bài lô quá hạn của CSKH, thêm cột số ngày. Bước 2 cần mốc giao hàng: mốc này nằm trong nhật ký các mốc của lô, không nằm trong danh mục lô. Bước 3 đưa mỗi ngày cập cảng về thứ Hai đầu tuần rồi đếm.
2. Bước 1: `s.ata IS NULL`, `s.status <> 'CANCELLED'`, `DATE '2026-10-31' - s.eta`. Bước 2: `shipment_events` với `event = 'DELIVERED'`, nối `shipments` và `ports` (`p.code = s.pod`), `ROUND(AVG(e.event_date - s.ata), 2)`. Bước 3: `date_trunc('week', ata)`.
3. `SELECT p.name, ROUND(AVG(e.event_date - s.ata), 2) FROM shipment_events e JOIN shipments s ON ... JOIN ports p ON ... WHERE e.event = 'DELIVERED' AND ... GROUP BY p.name ORDER BY p.name`

# EN
This is your promotion review. On Monday morning I chair the October operations meeting with Ops and customer service, and I need three tables of figures. Get all three right and you take another step in your career.

## Step 1: Overdue shipments that have not arrived
As of today, 31 October 2026: the shipments whose planned arrival is before today and that still have no actual arrival recorded, cancelled shipments excluded. Send the shipment ref, customer name, planned arrival and how many days overdue (31 October 2026 minus the planned arrival). Most overdue first; on equal days, the smaller shipment ref first.

## Step 2: From arrival to delivery
For the shipments delivered to the customer in October 2026 (by the delivery milestone in the shipment milestone log): how many days on average from the ship's arrival to delivery, per destination port? Send the destination port name and the average days rounded to 2 decimals, ordered by port name alphabetically.

## Step 3: Arrivals per week
How many shipments arrived in each week of October 2026? Weeks start on Monday and are shown as that Monday's date. The first week is the one containing 1 October (starting Monday 28 September), but only count arrivals from 1 October on. Earliest week first.

## Hints
1. Step 1 is customer service's overdue list with a days column added. Step 2 needs the delivery milestone: it is in the shipment milestone log, not in the shipment list. Step 3 brings each arrival date back to the Monday of its week, then counts.
2. Step 1: `s.ata IS NULL`, `s.status <> 'CANCELLED'`, `DATE '2026-10-31' - s.eta`. Step 2: `shipment_events` with `event = 'DELIVERED'`, joined to `shipments` and `ports` (`p.code = s.pod`), `ROUND(AVG(e.event_date - s.ata), 2)`. Step 3: `date_trunc('week', ata)`.
3. `SELECT p.name, ROUND(AVG(e.event_date - s.ata), 2) FROM shipment_events e JOIN shipments s ON ... JOIN ports p ON ... WHERE e.event = 'DELIVERED' AND ... GROUP BY p.name ORDER BY p.name`
````

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `npx vitest run tests/content.test.ts tests/variants.test.ts tests/scene.test.ts tests/people.test.ts tests/practice.test.ts tests/progress.test.ts && npx tsc --noEmit`
Expected: tất cả PASS. Số dòng mỗi Solution như bảng "Số dòng kết quả mong đợi".

- [ ] **Step 5: Đo ngân sách sau chương đầu tiên**

Run: `npm run build && node scripts/check-budget.mjs`
Expected: `main ≈ 267 KB` (còn dưới 270). Ghi số đo vào mô tả commit.

- [ ] **Step 6: Chạy toàn bộ rồi commit**

Run: `npm test && npx tsc --noEmit`
Expected: tất cả PASS.

```bash
git add content/tickets/ch4 tests/scene.test.ts
git commit -m "content: chapter 4 Schedules and time (6 tickets, VI + EN)"
```

---

### Task 8: Chương 5 · Hải quan & phân loại (6 ticket)

**Files:**
- Create: `content/tickets/ch5/ch5-01.md` … `ch5-06.md`
- Modify: `tests/scene.test.ts`

Người hỏi: Võ Phong (khai báo viên), Hoàng Ngọc (Trưởng phòng Hải quan), Đặng Trang (CSKH), Giám đốc. Bẫy twist: tờ khai hủy rồi khai lại, có chuỗi hai lần sửa (nối một bước là sai). Cột mốc kiểm `self_join` (bước 3, không có regex), `case_when`, `conditional_agg`.

- [ ] **Step 1: Bảng hoạt cảnh mong đợi**

**Sửa `tests/scene.test.ts`** — thay:
```ts
      'ch4-05': { kind: 'truck' }, 'ch4-06': { kind: 'promotion' },
    });
```
bằng:
```ts
      'ch4-05': { kind: 'truck' }, 'ch4-06': { kind: 'promotion' },
      'ch5-01': { kind: 'customs', lane: 'green' }, 'ch5-02': { kind: 'customs', lane: 'yellow' },
      'ch5-03': { kind: 'customs', lane: 'green' }, 'ch5-04': { kind: 'customs', lane: 'red' }, 'ch5-05': { kind: 'chat' },
      'ch5-06': { kind: 'promotion' },
    });
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/scene.test.ts`
Expected: FAIL: thiếu `ch5-01` … `ch5-06`.

- [ ] **Step 3: Viết 6 ticket**

**Tạo `content/tickets/ch5/ch5-01.md`:**
````markdown
---
id: ch5-01
chapter: 5
title: Tờ khai thông quan nhanh hay chậm
title_en: Fast and slow customs clearance
from: { name: Võ Phong, dept: Customs }
difficulty: 2
beat: teach
format: worked
requires: [date_math, group_by, order_by]
grants: [case_when]
tables: [customs_declarations]
ordered: true
scene: { kind: customs, lane: green }
columns:
  - { vi: "Nhóm tốc độ (1 nhanh, 2 bình thường, 3 chậm)", en: "Speed group (1 fast, 2 normal, 3 slow)" }
  - { vi: "Số tờ khai", en: "Declarations" }
variants:
  - { month: "10/2026", month_en: "October 2026", from: "2026-10-01", to: "2026-11-01" }
  - { month: "8/2026", month_en: "August 2026", from: "2026-08-01", to: "2026-09-01" }
  - { month: "6/2026", month_en: "June 2026", from: "2026-06-01", to: "2026-07-01" }
reflect:
  q: { vi: "Nếu xét điều kiện \"không quá 3 ngày\" trước \"không quá 1 ngày\" thì nhóm 1 sẽ ra sao?", en: "If the \"at most 3 days\" condition came before \"at most 1 day\", what would happen to group 1?" }
  options:
    - { vi: "Nhóm 1 trống: tờ khai 0 đến 1 ngày đã khớp điều kiện đầu và dừng ở đó", en: "Group 1 would be empty: declarations of 0 to 1 day already match the first condition and stop there" }
    - { vi: "Không đổi gì, CASE tự chọn điều kiện hẹp nhất", en: "Nothing changes; CASE picks the narrowest condition by itself" }
    - { vi: "Postgres báo lỗi vì hai điều kiện chồng nhau", en: "Postgres raises an error because the conditions overlap" }
  answer: 0
  why: { vi: "CASE dừng ở điều kiện đúng đầu tiên, nên điều kiện hẹp phải đứng trước.", en: "CASE stops at the first true condition, so the narrow condition must come first." }
wrong:
  - sql: "SELECT CASE WHEN cleared_date - submitted_date <= 3 THEN 2 WHEN cleared_date - submitted_date <= 1 THEN 1 ELSE 3 END AS speed, count(*) FROM customs_declarations WHERE cleared_date >= '{{from}}' AND cleared_date < '{{to}}' GROUP BY speed ORDER BY speed"
    vi: "Nhóm 1 đang trống: điều kiện \"không quá 3 ngày\" đứng trước nên bắt luôn các tờ khai 0 đến 1 ngày. Đặt điều kiện hẹp lên trước."
    en: "Group 1 is empty: the \"at most 3 days\" condition comes first and catches the 0 to 1 day declarations too. Put the narrow condition first."
---
Tháng nào phòng Hải quan cũng báo cáo tốc độ thông quan cho Ban giám đốc. Tờ khai được chia ba nhóm: nhanh (thông quan trong vòng 1 ngày kể từ ngày nộp), bình thường (2 đến 3 ngày) và chậm (hơn 3 ngày).

Đây là lần đầu bạn phân loại dữ liệu theo điều kiện, nên mình gửi kèm một ví dụ mẫu.

## Task
Với các tờ khai được thông quan trong tháng {{month}}: mỗi nhóm tốc độ có bao nhiêu tờ khai? Ghi nhóm bằng số: 1 là nhanh, 2 là bình thường, 3 là chậm. Mỗi nhóm một dòng gồm số nhóm và số tờ khai, nhóm 1 lên đầu.

## Example
```sql
SELECT CASE WHEN gross_weight_kg < 1000 THEN 1       -- ①
            WHEN gross_weight_kg < 10000 THEN 2      -- ②
            ELSE 3                                   -- ③
       END AS weight_band,
       count(*)
FROM shipments
WHERE booking_date >= '2026-09-14' AND booking_date < '2026-09-21'
GROUP BY weight_band                                 -- ④
ORDER BY weight_band
```
Ví dụ: trong tuần 14–20/9/2026, có bao nhiêu booking hàng nhẹ (dưới 1 tấn), hàng vừa (dưới 10 tấn) và hàng nặng?

① CASE xét điều kiện từ trên xuống; điều kiện đúng đầu tiên quyết định giá trị. Lô 800 kg vào nhóm 1 và dừng ở đó.

② Nhánh thứ hai chỉ còn gặp những lô từ 1 tấn trở lên, nên không cần viết lại `gross_weight_kg >= 1000`.

③ `ELSE` nhận mọi lô còn lại. Thiếu `ELSE` thì lô không khớp nhánh nào sẽ nhận giá trị trống.

④ Gom theo chính cột vừa phân loại để đếm mỗi nhóm.

## Hints
1. Số ngày thông quan là ngày thông quan trừ ngày nộp tờ khai. Mỗi tờ khai rơi vào đúng một nhóm theo số ngày đó, rồi đếm theo nhóm, như ví dụ mẫu.
2. Bảng `customs_declarations`, cột `submitted_date` và `cleared_date`. Lọc `cleared_date >= '{{from}}' AND cleared_date < '{{to}}'`. Nhóm: `CASE WHEN cleared_date - submitted_date <= 1 THEN 1 WHEN cleared_date - submitted_date <= 3 THEN 2 ELSE 3 END`.
3. `SELECT CASE ... END AS speed, count(*) FROM customs_declarations WHERE ... GROUP BY speed ORDER BY speed`

## Solution
```sql
SELECT CASE WHEN cleared_date - submitted_date <= 1 THEN 1
            WHEN cleared_date - submitted_date <= 3 THEN 2
            ELSE 3
       END AS speed,
       count(*)
FROM customs_declarations
WHERE cleared_date >= '{{from}}' AND cleared_date < '{{to}}'
GROUP BY speed
ORDER BY speed
```

# EN
Every month the customs team reports clearance speed to the board. Declarations fall into three groups: fast (cleared within 1 day of filing), normal (2 to 3 days) and slow (more than 3 days).

This is your first time sorting data into groups by a condition, so I am sending a worked example along.

## Task
For the declarations cleared in {{month_en}}: how many declarations are in each speed group? Write the group as a number: 1 is fast, 2 is normal, 3 is slow. One row per group with the group number and the number of declarations, group 1 first.

## Example
Example: in the week of 14 to 20 September 2026, how many bookings were light (under 1 tonne), medium (under 10 tonnes) and heavy?

① CASE checks its conditions from the top; the first true one decides the value. An 800 kg shipment goes into group 1 and stops there.

② The second branch only sees shipments of 1 tonne or more, so there is no need to repeat `gross_weight_kg >= 1000`.

③ `ELSE` takes every remaining shipment. Without `ELSE`, a shipment that matches no branch gets an empty value.

④ Group by the column you just classified to count each group.

## Hints
1. Clearance days are the clearance date minus the filing date. Each declaration falls into exactly one group by that number, then you count per group, like the worked example.
2. Table `customs_declarations`, columns `submitted_date` and `cleared_date`. Filter with `cleared_date >= '{{from}}' AND cleared_date < '{{to}}'`. The group: `CASE WHEN cleared_date - submitted_date <= 1 THEN 1 WHEN cleared_date - submitted_date <= 3 THEN 2 ELSE 3 END`.
3. `SELECT CASE ... END AS speed, count(*) FROM customs_declarations WHERE ... GROUP BY speed ORDER BY speed`
````

**Tạo `content/tickets/ch5/ch5-02.md`:**
````markdown
---
id: ch5-02
chapter: 5
title: Luồng xanh, vàng, đỏ theo tháng
title_en: Green, yellow and red lanes by month
from: { name: Hoàng Ngọc, dept: Customs }
difficulty: 2
beat: develop
format: faded
requires: [date_bucket, group_by, order_by]
grants: [conditional_agg]
tables: [customs_declarations]
ordered: true
scene: { kind: customs, lane: yellow }
columns:
  - { vi: "Tháng (ngày đầu tháng)", en: "Month (first day)" }
  - { vi: "Luồng xanh", en: "Green lane" }
  - { vi: "Luồng vàng", en: "Yellow lane" }
  - { vi: "Luồng đỏ", en: "Red lane" }
starter: |
  SELECT date_trunc('month', submitted_date) AS month,
         count(*) FILTER (WHERE lane = 'GREEN') AS green,
         count(*) FILTER (WHERE lane = ___) AS yellow,
         count(*) ___ AS red
  FROM customs_declarations
  WHERE submitted_date >= '{{from}}' AND submitted_date < '{{to}}'
  GROUP BY month
  ORDER BY month
variants:
  - { from: "2026-09-01", to: "2026-11-01", period: "9-10/2026", period_en: "September and October 2026" }
  - { from: "2026-06-01", to: "2026-08-01", period: "6-7/2026", period_en: "June and July 2026" }
  - { from: "2026-07-01", to: "2026-08-01", period: "7/2026", period_en: "July 2026" }
reflect:
  q: { vi: "Vì sao không đặt điều kiện luồng vào phần lọc chung của câu (chỉ lấy luồng đỏ chẳng hạn)?", en: "Why not put the lane condition in the query's main filter (red lane only, say)?" }
  options:
    - { vi: "Lọc chung bỏ dòng trước khi đếm, nên hai cột luồng còn lại ra 0", en: "The main filter drops rows before counting, so the other two lane columns come out as 0" }
    - { vi: "Lọc chung chạy chậm hơn", en: "The main filter is slower" }
    - { vi: "Không khác gì", en: "It makes no difference" }
  answer: 0
  why: { vi: "Phần lọc chung áp lên cả câu; FILTER chỉ áp lên đúng một cột đếm, nên ba luồng nằm cạnh nhau được trên cùng một dòng.", en: "The main filter applies to the whole query; FILTER applies to one count only, so the three lanes can sit side by side on one row." }
wrong:
  - sql: "SELECT date_trunc('month', submitted_date), lane, count(*) FROM customs_declarations WHERE submitted_date >= '{{from}}' AND submitted_date < '{{to}}' GROUP BY 1, 2 ORDER BY 1, 2"
    vi: "Bạn đang ra mỗi tháng ba dòng, mỗi luồng một dòng. Đề cần mỗi tháng một dòng, mỗi luồng một cột."
    en: "You get three rows per month, one per lane. The request wants one row per month and one column per lane."
---
Cuối tháng mình dự trù người đi kiểm hóa: luồng vàng phải kiểm tra hồ sơ, luồng đỏ phải kiểm tra thực tế hàng và tốn người nhất. Mình cần số tờ khai mỗi luồng theo từng tháng, mỗi luồng một cột để so cho nhanh.

Câu SQL trong editor đã viết gần xong, còn vài chỗ trống ___.

## Task
Trong tháng {{period}}, mỗi tháng có bao nhiêu tờ khai luồng xanh, luồng vàng, luồng đỏ, tính theo ngày nộp? Tính mọi tờ khai đã nộp, kể cả tờ khai sau đó bị hủy để khai lại, vì lần nộp nào cũng có người xử lý. Mỗi tháng một dòng: tháng (ghi bằng ngày đầu tháng), số tờ khai luồng xanh, luồng vàng, luồng đỏ; tháng sớm nhất lên đầu.

## Hints
1. Mỗi tháng là một dòng, nên vẫn gom theo tháng. Ba luồng là ba cột: mỗi cột chỉ đếm những tờ khai thuộc luồng của nó trong cùng nhóm tháng.
2. Luồng nằm ở cột `lane` với các giá trị `'GREEN'`, `'YELLOW'`, `'RED'`. `count(*) FILTER (WHERE lane = 'RED')` chỉ đếm các dòng luồng đỏ trong nhóm.
3. `count(*) FILTER (WHERE lane = 'YELLOW') AS yellow, count(*) FILTER (WHERE lane = 'RED') AS red`

## Solution
```sql
SELECT date_trunc('month', submitted_date) AS month,
       count(*) FILTER (WHERE lane = 'GREEN') AS green,
       count(*) FILTER (WHERE lane = 'YELLOW') AS yellow,
       count(*) FILTER (WHERE lane = 'RED') AS red
FROM customs_declarations
WHERE submitted_date >= '{{from}}' AND submitted_date < '{{to}}'
GROUP BY month
ORDER BY month
```

# EN
At the end of each month I plan who goes out to inspections: the yellow lane means a document check, the red lane a physical cargo check, which takes the most people. I need the number of declarations per lane for each month, one column per lane so they are easy to compare.

The SQL in the editor is almost done; a few ___ blanks are left.

## Task
In {{period_en}}, how many green, yellow and red lane declarations were there each month, by filing date? Count every declaration filed, including those later cancelled and filed again, because every filing was handled by someone. One row per month: the month (as its first day), then the green, yellow and red lane counts; earliest month first.

## Hints
1. Each month is one row, so you still group by month. The three lanes are three columns: each column counts only the declarations of its own lane within the month group.
2. The lane is in column `lane` with the values `'GREEN'`, `'YELLOW'`, `'RED'`. `count(*) FILTER (WHERE lane = 'RED')` counts only the red lane rows of the group.
3. `count(*) FILTER (WHERE lane = 'YELLOW') AS yellow, count(*) FILTER (WHERE lane = 'RED') AS red`
````

**Tạo `content/tickets/ch5/ch5-03.md`:**
````markdown
---
id: ch5-03
chapter: 5
title: Thuế nhập khẩu tạm tính theo mã HS
title_en: Estimated import duty by HS code
from: { name: Võ Phong, dept: Customs }
difficulty: 3
beat: develop
requires: [join, left_join, null_logic, aggregate, group_by]
grants: [coalesce]
tables: [customs_declarations, shipments, duties_taxes]
columns:
  - { vi: "Mã HS", en: "HS code" }
  - { vi: "Tổng trị giá khai báo (USD)", en: "Total declared value (USD)" }
  - { vi: "Thuế nhập khẩu tạm tính (USD)", en: "Estimated import duty (USD)" }
  - { vi: "Thiếu thuế suất", en: "Rate missing" }
variants:
  - { month: "10/2026", month_en: "October 2026", from: "2026-10-01", to: "2026-11-01" }
  - { month: "8/2026", month_en: "August 2026", from: "2026-08-01", to: "2026-09-01" }
  - { month: "6/2026", month_en: "June 2026", from: "2026-06-01", to: "2026-07-01" }
reflect:
  q: { vi: "Nếu bỏ COALESCE thì thuế tạm tính của mã chưa có thuế suất ra sao?", en: "Without COALESCE, what is the estimated duty of a code with no rate?" }
  options:
    - { vi: "Ra trống (NULL), vì nhân với giá trị trống thì ra trống", en: "Empty (NULL), because multiplying by an empty value gives empty" }
    - { vi: "Ra 0", en: "Zero" }
    - { vi: "Postgres báo lỗi", en: "Postgres raises an error" }
  answer: 0
  why: { vi: "Phép tính với NULL ra NULL. COALESCE thay giá trị trống bằng giá trị mặc định trước khi tính.", en: "Arithmetic with NULL gives NULL. COALESCE swaps the empty value for a default before you calculate." }
wrong:
  - sql: "SELECT d.hs_code, SUM(d.declared_value_usd), ROUND(SUM(d.declared_value_usd) * t.import_duty_pct / 100, 2), t.import_duty_pct IS NULL FROM customs_declarations d JOIN shipments s ON s.id = d.shipment_id LEFT JOIN duties_taxes t ON t.hs_code = d.hs_code WHERE s.direction = 'IMPORT' AND d.submitted_date >= '{{from}}' AND d.submitted_date < '{{to}}' GROUP BY d.hs_code, t.import_duty_pct"
    vi: "Mã chưa có thuế suất đang ra thuế trống. Đề yêu cầu tạm tính 0 cho các mã này."
    en: "Codes with no rate get an empty duty. The request says to count them as 0 for now."
  - sql: "SELECT d.hs_code, SUM(d.declared_value_usd), ROUND(SUM(d.declared_value_usd) * COALESCE(t.import_duty_pct, 0) / 100, 2), t.import_duty_pct IS NULL FROM customs_declarations d JOIN shipments s ON s.id = d.shipment_id JOIN duties_taxes t ON t.hs_code = d.hs_code WHERE s.direction = 'IMPORT' AND d.submitted_date >= '{{from}}' AND d.submitted_date < '{{to}}' GROUP BY d.hs_code, t.import_duty_pct"
    vi: "Các mã chưa có trong biểu thuế đã biến mất, vì phép nối thường chỉ giữ dòng khớp. Nối với biểu thuế bằng nối trái."
    en: "The codes missing from the tariff list disappeared, because an inner join keeps matching rows only. Join the tariff list with a left join."
---
Kế toán cần số thuế nhập khẩu tạm tính để chuẩn bị tiền nộp thuế thay khách. Biểu thuế của mình chưa có thuế suất cho vài mã HS mới; mấy mã đó tạm tính 0 và đánh dấu để mình tra biểu thuế sau.

## Task
Với các tờ khai hàng nhập khẩu nộp trong tháng {{month}}, theo từng mã HS: tổng trị giá khai báo (USD); thuế nhập khẩu tạm tính, bằng tổng trị giá nhân thuế suất nhập khẩu, làm tròn 2 chữ số thập phân (mã chưa có thuế suất thì tính 0); và một cột đúng/sai cho biết mã đó có đang thiếu thuế suất không. Mỗi mã HS một dòng, không cần sắp xếp.

## Hints
1. Tờ khai cho biết mã HS và trị giá; lô hàng cho biết hàng nhập hay xuất; thuế suất nằm ở biểu thuế riêng. Mã chưa có trong biểu thuế vẫn phải hiện, nên phép nối với biểu thuế phải giữ cả dòng không khớp.
2. `customs_declarations` nối `shipments` để lọc `s.direction = 'IMPORT'`, rồi `LEFT JOIN duties_taxes t ON t.hs_code = d.hs_code`. Thuế suất trống thì `COALESCE(t.import_duty_pct, 0)`; cột đánh dấu là `t.import_duty_pct IS NULL`.
3. `SELECT d.hs_code, SUM(d.declared_value_usd), ROUND(SUM(d.declared_value_usd) * COALESCE(t.import_duty_pct, 0) / 100, 2), t.import_duty_pct IS NULL FROM ... GROUP BY d.hs_code, t.import_duty_pct`

## Solution
```sql
SELECT d.hs_code, SUM(d.declared_value_usd),
       ROUND(SUM(d.declared_value_usd) * COALESCE(t.import_duty_pct, 0) / 100, 2),
       t.import_duty_pct IS NULL
FROM customs_declarations d
JOIN shipments s ON s.id = d.shipment_id
LEFT JOIN duties_taxes t ON t.hs_code = d.hs_code
WHERE s.direction = 'IMPORT' AND d.submitted_date >= '{{from}}' AND d.submitted_date < '{{to}}'
GROUP BY d.hs_code, t.import_duty_pct
```

# EN
Accounting needs the estimated import duty so it can prepare the duty payments we make for customers. Our tariff list has no rate yet for a few new HS codes; count those as 0 for now and flag them so I can look them up later.

## Task
For the import declarations filed in {{month_en}}, per HS code: the total declared value (USD); the estimated import duty, which is the total value times the import duty rate, rounded to 2 decimals (codes with no rate count as 0); and a true/false column saying whether the code is missing its rate. One row per HS code, any order.

## Hints
1. The declaration has the HS code and the value; the shipment tells you import or export; the rates are in a separate tariff list. Codes missing from the tariff list must still show up, so the join to the tariff list has to keep rows without a match.
2. `customs_declarations` joined to `shipments` to filter `s.direction = 'IMPORT'`, then `LEFT JOIN duties_taxes t ON t.hs_code = d.hs_code`. An empty rate becomes `COALESCE(t.import_duty_pct, 0)`; the flag column is `t.import_duty_pct IS NULL`.
3. `SELECT d.hs_code, SUM(d.declared_value_usd), ROUND(SUM(d.declared_value_usd) * COALESCE(t.import_duty_pct, 0) / 100, 2), t.import_duty_pct IS NULL FROM ... GROUP BY d.hs_code, t.import_duty_pct`
````

**Tạo `content/tickets/ch5/ch5-04.md`:**
````markdown
---
id: ch5-04
chapter: 5
title: Tờ khai hủy rồi khai lại
title_en: Declarations cancelled and filed again
from: { name: Hoàng Ngọc, dept: Customs }
difficulty: 3
beat: twist
requires: [left_join, null_logic, coalesce]
grants: [self_join]
tables: [customs_declarations]
scene: { kind: customs, lane: red }
columns:
  - { vi: "Số tờ khai gốc", en: "Original declaration no." }
  - { vi: "Số tờ khai đang có hiệu lực", en: "Declaration now in force" }
variants:
  - { month: "10/2026", month_en: "October 2026", from: "2026-10-01", to: "2026-11-01" }
  - { month: "7/2026", month_en: "July 2026", from: "2026-07-01", to: "2026-08-01" }
  - { month: "6/2026", month_en: "June 2026", from: "2026-06-01", to: "2026-07-01" }
reflect:
  q: { vi: "Vì sao bước nối sang bản sửa lần hai phải là nối trái?", en: "Why must the join to the second amendment be a left join?" }
  options:
    - { vi: "Phần lớn tờ khai chỉ sửa một lần; nối thường sẽ làm mất chúng", en: "Most declarations were amended only once; an inner join would drop them" }
    - { vi: "Nối trái chạy nhanh hơn", en: "A left join is faster" }
    - { vi: "Vì bản sửa lần hai lúc nào cũng trống", en: "Because the second amendment is always empty" }
  answer: 0
  why: { vi: "Nối trái giữ tờ khai gốc cả khi không có bản sửa lần hai; khi đó COALESCE lấy bản sửa lần một.", en: "The left join keeps the original even when there is no second amendment; COALESCE then takes the first amendment." }
wrong:
  - sql: "SELECT o.decl_no, a1.decl_no FROM customs_declarations o JOIN customs_declarations a1 ON a1.amended_from_id = o.id WHERE o.amended_from_id IS NULL AND o.submitted_date >= '{{from}}' AND o.submitted_date < '{{to}}'"
    vi: "Có tờ khai bị sửa hai lần: bản sửa lần một cũng đã bị thay. Nối thêm một bước nữa và lấy bản cuối cùng."
    en: "Some declarations were amended twice: the first amendment was replaced as well. Join one more step and take the last version."
---
Khai sai mã HS hay trị giá thì phải hủy tờ khai rồi khai lại; tờ khai mới ghi số tờ khai cũ mà nó thay thế. Có tờ còn bị sửa đến hai lần. Hải quan hỏi tờ nào đang có hiệu lực cho từng lô, mà sổ tờ khai chỉ cho biết từng bước một.

## Task
Với các tờ khai gốc (tờ khai đầu tiên của lô, không thay cho tờ nào) nộp trong tháng {{month}} mà đã bị hủy để khai lại: gửi mình số tờ khai gốc và số tờ khai đang có hiệu lực, tức là bản cuối cùng trong chuỗi khai lại. Không cần sắp xếp.

## Hints
1. Mỗi tờ khai sửa ghi lại tờ khai mà nó thay thế, ngay trong cùng sổ tờ khai. Muốn đi từ tờ gốc sang tờ thay nó, bạn ghép sổ tờ khai với chính nó. Chuỗi có thể dài hai bước: tờ gốc, bản sửa lần một, bản sửa lần hai.
2. Cột `amended_from_id` trỏ tới `id` của tờ khai bị thay. Dùng ba bản của `customs_declarations`: `o` là tờ gốc (`o.amended_from_id IS NULL`), `a1` là bản sửa lần một (`a1.amended_from_id = o.id`), `a2` là bản sửa lần hai, nối trái (`a2.amended_from_id = a1.id`). Bản cuối cùng là `COALESCE(a2.decl_no, a1.decl_no)`.
3. `SELECT o.decl_no, COALESCE(a2.decl_no, a1.decl_no) FROM customs_declarations o JOIN customs_declarations a1 ON ... LEFT JOIN customs_declarations a2 ON ... WHERE o.amended_from_id IS NULL AND ...`

## Solution
```sql
SELECT o.decl_no, COALESCE(a2.decl_no, a1.decl_no)
FROM customs_declarations o
JOIN customs_declarations a1 ON a1.amended_from_id = o.id
LEFT JOIN customs_declarations a2 ON a2.amended_from_id = a1.id
WHERE o.amended_from_id IS NULL
  AND o.submitted_date >= '{{from}}' AND o.submitted_date < '{{to}}'
```

# EN
When a declaration has the wrong HS code or value, it has to be cancelled and filed again; the new declaration records the number of the one it replaces. Some were amended twice. Customs asks which declaration is now in force for each shipment, but the declaration book only shows one step at a time.

## Task
For the original declarations (the first one for a shipment, replacing nothing) filed in {{month_en}} that were cancelled and filed again: send me the original declaration number and the number of the declaration now in force, which is the last one in the chain. Any order is fine.

## Hints
1. Each amended declaration records the declaration it replaces, in the same declaration book. To get from an original to the one that replaced it, you match the declaration book with itself. A chain can be two steps long: the original, the first amendment, the second amendment.
2. Column `amended_from_id` points to the `id` of the replaced declaration. Use three copies of `customs_declarations`: `o` for the original (`o.amended_from_id IS NULL`), `a1` for the first amendment (`a1.amended_from_id = o.id`), `a2` for the second amendment, left-joined (`a2.amended_from_id = a1.id`). The last version is `COALESCE(a2.decl_no, a1.decl_no)`.
3. `SELECT o.decl_no, COALESCE(a2.decl_no, a1.decl_no) FROM customs_declarations o JOIN customs_declarations a1 ON ... LEFT JOIN customs_declarations a2 ON ... WHERE o.amended_from_id IS NULL AND ...`
````

**Tạo `content/tickets/ch5/ch5-05.md`:**
````markdown
---
id: ch5-05
chapter: 5
title: Hàng nhập kẹt ở hải quan
title_en: Imports stuck in customs
from: { name: Đặng Trang, dept: CS }
difficulty: 3
beat: rest
requires: [multi_join, null_logic, date_math, order_by]
grants: []
tables: [shipments, customers, customs_declarations]
ordered: true
columns:
  - { vi: "Mã lô", en: "Shipment ref" }
  - { vi: "Tên khách hàng", en: "Customer name" }
  - { vi: "Số ngày chờ từ khi cập cảng", en: "Days waiting since arrival" }
reflect:
  q: { vi: "Vì sao \"chưa thông quan\" phải viết là ngày thông quan IS NULL, chứ không phải ngày thông quan lớn hơn hôm nay?", en: "Why is \"not cleared yet\" written as clearance date IS NULL rather than clearance date after today?" }
  options:
    - { vi: "Tờ khai chưa thông quan chưa có ngày nào để so; ô đó còn trống", en: "An uncleared declaration has no date to compare yet; the value is empty" }
    - { vi: "Hai cách cho cùng kết quả", en: "Both give the same result" }
    - { vi: "So sánh ngày với hôm nay không được phép", en: "Comparing a date with today is not allowed" }
  answer: 0
  why: { vi: "So một ô trống với bất kỳ ngày nào cũng không ra đúng, nên điều kiện \"lớn hơn hôm nay\" bỏ sót đúng những tờ khai cần tìm.", en: "Comparing an empty value with any date is never true, so an \"after today\" condition misses exactly the declarations you are looking for." }
---
Khách nhập khẩu gọi liên tục hỏi khi nào lấy được hàng. Mình muốn chủ động báo trước cho những khách có hàng về cảng đã lâu mà chưa thông quan, kèm số ngày đã chờ.

## Task
Tính đến hôm nay 31/10/2026, lô hàng nhập khẩu nào đã cập cảng hơn 5 ngày mà tờ khai vẫn chưa được thông quan? Gửi mã lô, tên khách và số ngày đã chờ kể từ ngày cập cảng (31/10/2026 trừ ngày cập cảng). Chờ lâu nhất lên đầu; bằng nhau thì mã lô nhỏ hơn đứng trước.

## Hints
1. Cần ba nguồn: lô hàng (ngày cập cảng), khách hàng (tên) và tờ khai (đã thông quan chưa). Tờ khai chưa thông quan là tờ khai còn trống ngày thông quan.
2. `shipments` nối `customers` và `customs_declarations` (`d.shipment_id = s.id`). Điều kiện: `s.direction = 'IMPORT'`, `DATE '2026-10-31' - s.ata > 5`, `d.cleared_date IS NULL`.
3. `SELECT s.ref, c.name, DATE '2026-10-31' - s.ata FROM shipments s JOIN customers c ON ... JOIN customs_declarations d ON ... WHERE ... ORDER BY 3 DESC, s.ref`

## Solution
```sql
SELECT s.ref, c.name, DATE '2026-10-31' - s.ata
FROM shipments s
JOIN customers c ON c.id = s.customer_id
JOIN customs_declarations d ON d.shipment_id = s.id
WHERE s.direction = 'IMPORT' AND DATE '2026-10-31' - s.ata > 5 AND d.cleared_date IS NULL
ORDER BY 3 DESC, s.ref
```

# EN
Import customers keep calling to ask when they can collect their cargo. I want to warn, before they call, the customers whose cargo reached port a while ago but is not cleared yet, with how many days they have been waiting.

## Task
As of today, 31 October 2026, which import shipments arrived more than 5 days ago and still have a declaration that is not cleared? Send the shipment ref, customer name and the days waited since arrival (31 October 2026 minus the arrival date). Longest wait first; on equal days, the smaller shipment ref first.

## Hints
1. You need three sources: the shipment (arrival date), the customer (name) and the declaration (cleared or not). An uncleared declaration is one whose clearance date is still empty.
2. `shipments` joined to `customers` and `customs_declarations` (`d.shipment_id = s.id`). Conditions: `s.direction = 'IMPORT'`, `DATE '2026-10-31' - s.ata > 5`, `d.cleared_date IS NULL`.
3. `SELECT s.ref, c.name, DATE '2026-10-31' - s.ata FROM shipments s JOIN customers c ON ... JOIN customs_declarations d ON ... WHERE ... ORDER BY 3 DESC, s.ref`
````

**Tạo `content/tickets/ch5/ch5-06.md`:**
````markdown
---
id: ch5-06
chapter: 5
title: "Đánh giá thăng tiến: chất lượng dịch vụ quý 3"
title_en: "Promotion review: Q3 service quality"
from: { name: Trần An, dept: Management }
difficulty: 4
beat: boss
requires: [self_join, case_when, conditional_agg, left_join, null_logic, date_math, group_by, aggregate, order_by]
grants: []
tables: [shipments, customs_declarations]
ordered: true
columns:
  - [{ vi: "Phương thức vận chuyển", en: "Transport mode" }, { vi: "Số lô đã đến", en: "Shipments arrived" }, { vi: "Số lô đến đúng hẹn", en: "Arrived on time" }]
  - [{ vi: "Luồng", en: "Lane" }, { vi: "Số ngày thông quan trung bình", en: "Average clearance days" }]
  - [{ vi: "Luồng xanh", en: "Green lane" }, { vi: "Luồng vàng", en: "Yellow lane" }, { vi: "Luồng đỏ", en: "Red lane" }]
conclusion:
  question: "Ở bước 3, vì sao phải nối sổ tờ khai với chính nó?"
  options:
    - "Để biết tờ khai nào đã bị thay, vì dấu vết đó nằm ở dòng của tờ khai thay thế"
    - "Để gộp luồng vàng với luồng đỏ"
    - "Để đếm nhanh hơn"
  answer: 0
conclusion_en:
  question: "In step 3, why do you join the declaration book with itself?"
  options:
    - "To find which declarations were replaced, because that trace sits on the replacing declaration's row"
    - "To merge the yellow and red lanes"
    - "To count faster"
---
Đây là buổi đánh giá thăng tiến của bạn. Ban giám đốc họp tổng kết chất lượng dịch vụ quý 3/2026 và mình cần ba bảng số. Làm đúng cả ba là bạn bước thêm một bước trong sự nghiệp.

## Step 1: Đến đúng hẹn theo phương thức
Các lô cập cảng trong quý 3/2026 (từ 01/07 đến hết 30/09): theo từng phương thức vận chuyển, có bao nhiêu lô và bao nhiêu lô đến đúng hẹn (ngày đến thực tế không muộn hơn ngày đến dự kiến)? Gửi phương thức, số lô, số lô đúng hẹn; đường hàng không trước, đường biển sau.
```sql
SELECT mode, count(*), SUM(CASE WHEN ata <= eta THEN 1 ELSE 0 END)
FROM shipments
WHERE ata >= '2026-07-01' AND ata < '2026-10-01'
GROUP BY mode
ORDER BY mode
```

## Step 2: Thông quan theo luồng
Các tờ khai được thông quan trong quý 3/2026: mỗi luồng mất trung bình bao nhiêu ngày từ lúc nộp đến lúc thông quan, làm tròn 2 chữ số thập phân? Gửi luồng và số ngày trung bình, luồng nhanh nhất lên đầu; bằng nhau thì xếp theo mã luồng trong hệ thống theo thứ tự chữ cái.
```sql
SELECT lane, ROUND(AVG(cleared_date - submitted_date), 2)
FROM customs_declarations
WHERE cleared_date >= '2026-07-01' AND cleared_date < '2026-10-01'
GROUP BY lane
ORDER BY 2, lane
```

## Step 3: Tờ khai theo luồng, chỉ tính bản cuối
Các tờ khai nộp trong quý 3/2026, chỉ tính bản cuối cùng: tờ khai đã bị hủy để khai lại thì không tính, chỉ tính tờ thay nó. Một dòng gồm ba con số: số tờ khai luồng xanh, luồng vàng, luồng đỏ.
```sql
SELECT count(*) FILTER (WHERE d.lane = 'GREEN'),
       count(*) FILTER (WHERE d.lane = 'YELLOW'),
       count(*) FILTER (WHERE d.lane = 'RED')
FROM customs_declarations d
LEFT JOIN customs_declarations n ON n.amended_from_id = d.id
WHERE n.id IS NULL
  AND d.submitted_date >= '2026-07-01' AND d.submitted_date < '2026-10-01'
ORDER BY 1
```

## Hints
1. Bước 1 đếm có điều kiện trên mỗi phương thức. Bước 2 là trung bình của một phép trừ ngày, theo luồng. Bước 3: tờ khai đã bị thay là tờ khai có một tờ khác trỏ về nó, nên tìm bằng cách ghép sổ tờ khai với chính nó rồi giữ những tờ không ai thay.
2. Bước 1: `SUM(CASE WHEN ata <= eta THEN 1 ELSE 0 END)` hoặc `count(*) FILTER (WHERE ata <= eta)`. Bước 2: `ROUND(AVG(cleared_date - submitted_date), 2)`. Bước 3: `LEFT JOIN customs_declarations n ON n.amended_from_id = d.id` rồi `WHERE n.id IS NULL`, ba cột `count(*) FILTER (WHERE d.lane = 'GREEN')`…
3. `SELECT count(*) FILTER (WHERE d.lane = 'GREEN'), ... FROM customs_declarations d LEFT JOIN customs_declarations n ON ... WHERE n.id IS NULL AND ...`

# EN
This is your promotion review. The board is reviewing Q3 2026 service quality and I need three tables of figures. Get all three right and you take another step in your career.

## Step 1: On-time arrival by mode
The shipments that arrived in Q3 2026 (1 July to 30 September inclusive): per transport mode, how many shipments, and how many arrived on time (actual arrival no later than planned arrival)? Send the mode, the number of shipments and the number on time; air first, then sea.

## Step 2: Clearance by lane
The declarations cleared in Q3 2026: on average, how many days did each lane take from filing to clearance, rounded to 2 decimals? Send the lane and the average days, fastest lane first; on a tie, by the lane's system code alphabetically.

## Step 3: Declarations by lane, last versions only
The declarations filed in Q3 2026, counting only the last version: a declaration that was cancelled and filed again does not count, only the one that replaced it. One row with three numbers: green, yellow and red lane declarations.

## Hints
1. Step 1 is a conditional count per mode. Step 2 is the average of a date subtraction, per lane. Step 3: a replaced declaration is one that another declaration points back to, so find it by matching the declaration book with itself and keep the ones nobody replaced.
2. Step 1: `SUM(CASE WHEN ata <= eta THEN 1 ELSE 0 END)` or `count(*) FILTER (WHERE ata <= eta)`. Step 2: `ROUND(AVG(cleared_date - submitted_date), 2)`. Step 3: `LEFT JOIN customs_declarations n ON n.amended_from_id = d.id`, then `WHERE n.id IS NULL`, with three columns `count(*) FILTER (WHERE d.lane = 'GREEN')`…
3. `SELECT count(*) FILTER (WHERE d.lane = 'GREEN'), ... FROM customs_declarations d LEFT JOIN customs_declarations n ON ... WHERE n.id IS NULL AND ...`
````

- [ ] **Step 4: Chạy toàn bộ, xác nhận PASS rồi commit**

Run: `npm test && npx tsc --noEmit`
Expected: tất cả PASS.

```bash
git add content/tickets/ch5 tests/scene.test.ts
git commit -m "content: chapter 5 Customs and classification (6 tickets, VI + EN)"
```

---

### Task 9: Chương 6 · Làm sạch dữ liệu (6 ticket) và ngân sách `main`

**Files:**
- Create: `content/tickets/ch6/ch6-01.md` … `ch6-06.md`
- Modify: `tests/scene.test.ts`, `scripts/check-budget.mjs`

Người hỏi: Đặng Trang (CSKH), Bùi Long (kho CFS), Hoàng Dũng (Sales), Nguyễn Quang (Kế toán trưởng), Võ Lan (chứng từ), Giám đốc. Bẫy twist: chia hai số đếm ra 0 hoặc số nguyên bị cắt. Cột mốc kiểm `cast` (bước 3 có `::numeric`, regex twist), `string_fn`, `self_join` (khách 191–200 trùng 1–10, móc có sẵn từ Plan 1). Qua cột mốc ch6 là ★ Senior DA (`chapters.yml` đã có `tier: true`).

- [ ] **Step 1: Bảng hoạt cảnh mong đợi**

**Sửa `tests/scene.test.ts`** — thay:
```ts
      'ch5-06': { kind: 'promotion' },
    });
```
bằng:
```ts
      'ch5-06': { kind: 'promotion' },
      'ch6-01': { kind: 'chat' }, 'ch6-02': { kind: 'truck' }, 'ch6-03': { kind: 'yard' }, 'ch6-04': { kind: 'ledger' },
      'ch6-05': { kind: 'ship' }, 'ch6-06': { kind: 'promotion' },
    });
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/scene.test.ts`
Expected: FAIL: thiếu `ch6-01` … `ch6-06`.

- [ ] **Step 3: Viết 6 ticket**

**Tạo `content/tickets/ch6/ch6-01.md`:**
````markdown
---
id: ch6-01
chapter: 6
title: Nhãn thư cảm ơn cuối năm
title_en: Year-end thank-you labels
from: { name: Đặng Trang, dept: CS }
difficulty: 2
beat: teach
format: worked
requires: [where]
grants: [string_fn]
tables: [customers]
columns:
  - { vi: "Mã khách hàng", en: "Customer code" }
  - { vi: "Tên in trên nhãn", en: "Name on the label" }
variants:
  - { city: "Da Nang" }
  - { city: "Ha Noi" }
  - { city: "Can Tho" }
reflect:
  q: { vi: "Vì sao bỏ tiền tố bằng regexp_replace có dấu ^ mà không dùng replace thường?", en: "Why remove the prefix with regexp_replace and ^ rather than a plain replace?" }
  options:
    - { vi: "Dấu ^ neo vào đầu tên và một mẫu bắt được cả ba loại hình; replace thay mọi chỗ khớp và mỗi lần chỉ một chuỗi cố định", en: "^ anchors the match to the start and one pattern covers all three company types; replace changes every match and only one fixed string at a time" }
    - { vi: "replace không chạy được với chữ có dấu", en: "replace does not work on accented text" }
    - { vi: "regexp_replace tự viết hoa kết quả", en: "regexp_replace upper-cases the result by itself" }
  answer: 0
  why: { vi: "Mẫu neo đầu chuỗi chỉ đụng tới phần đầu tên, nên chữ giống tiền tố nằm giữa tên vẫn được giữ nguyên.", en: "An anchored pattern only touches the start of the name, so similar words in the middle of a name stay as they are." }
wrong:
  - sql: "SELECT id, upper(replace(name, 'Công ty TNHH ', '')) FROM customers WHERE city = '{{city}}'"
    vi: "Một số tên còn sót loại hình công ty: replace chỉ thay đúng một chuỗi cố định, nên tên Công ty CP vẫn nguyên và tên Công ty TNHH MTV còn chữ MTV. Dùng regexp_replace với một mẫu gom cả ba loại hình."
    en: "Some names still carry a company type: replace only swaps one fixed string, so joint stock company names stay as they were and single-member LLC names keep MTV. Use regexp_replace with one pattern for all three types."
---
Cuối năm CSKH gửi thư cảm ơn kèm quà tới từng khách. Ô tên trên nhãn thư khá hẹp, nên tên in ra được viết hoa toàn bộ và bỏ phần loại hình công ty ở đầu tên.

Đây là lần đầu bạn xử lý chữ, nên mình gửi kèm một ví dụ mẫu.

## Task
Gửi mình nhãn cho các khách có thành phố ghi là {{city}} trong hồ sơ: mã khách và tên in trên nhãn. Tên in là tên khách viết hoa toàn bộ, đã bỏ loại hình công ty ở đầu tên (Công ty TNHH MTV, Công ty TNHH hoặc Công ty CP). Tên không bắt đầu bằng loại hình công ty thì chỉ cần viết hoa. Không cần sắp xếp.

## Example
```sql
SELECT full_name,
       upper(full_name) AS upper_name,                             -- ①
       split_part(full_name, ' ', 1) AS family_name,               -- ②
       'NV-' || id AS badge,                                       -- ③
       regexp_replace(full_name, '^(Hoàng|Võ) ', '') AS given_name -- ④
FROM employees
WHERE dept = 'Customs'
```
Ví dụ: làm thẻ tên cho phòng Hải quan.

① `upper` viết hoa toàn bộ, kể cả chữ có dấu.

② `split_part(full_name, ' ', 1)` cắt chuỗi theo dấu cách và lấy phần thứ nhất, ở đây là họ.

③ `||` nối chuỗi: `'NV-' || id` ra mã thẻ như NV-24.

④ `regexp_replace` thay phần khớp mẫu bằng chuỗi rỗng. Dấu `^` neo mẫu vào đầu chuỗi, nên chỉ họ `Hoàng` hoặc `Võ` ở đầu tên bị bỏ; dấu `|` nghĩa là "hoặc".

## Hints
1. Tên in là tên khách sau hai bước: bỏ loại hình công ty ở đầu, rồi viết hoa. Giống bước ④ rồi bước ① của ví dụ mẫu.
2. Bảng `customers`, cột `name` và `city`. Bỏ tiền tố: `regexp_replace(name, '^Công ty (TNHH MTV|TNHH|CP) ', '')`; viết hoa: `upper(...)`.
3. `SELECT id, upper(regexp_replace(name, ..., '')) FROM customers WHERE city = '{{city}}'`

## Solution
```sql
SELECT id, upper(regexp_replace(name, '^Công ty (TNHH MTV|TNHH|CP) ', ''))
FROM customers
WHERE city = '{{city}}'
```

# EN
At year end customer service sends a thank-you letter and a gift to every customer. The name box on the label is narrow, so the printed name is fully upper-cased and the company-type prefix at the start of the name is dropped.

This is your first task with text, so I am sending a worked example along.

## Task
Send me the labels for the customers whose city on file is {{city}}: the customer code and the name printed on the label. The printed name is the customer name in capitals, without the company-type prefix at the start (the Vietnamese words for a single-member limited liability company, a limited liability company or a joint stock company). Names that do not start with a company type only need upper-casing. Any order is fine.

## Example
Example: name badges for the customs team.

① `upper` upper-cases everything, accented letters included.

② `split_part(full_name, ' ', 1)` splits the text at spaces and takes the first part, here the family name.

③ `||` joins text: `'NV-' || id` gives a badge code like NV-24.

④ `regexp_replace` replaces the part that matches a pattern with an empty string. The `^` anchors the pattern to the start, so only a family name `Hoàng` or `Võ` at the start is removed; `|` means "or".

## Hints
1. The printed name is the customer name after two steps: drop the company type at the start, then upper-case it. Like step ④ then step ① of the worked example.
2. Table `customers`, columns `name` and `city`. Drop the prefix: `regexp_replace(name, '^Công ty (TNHH MTV|TNHH|CP) ', '')`; upper-case: `upper(...)`.
3. `SELECT id, upper(regexp_replace(name, ..., '')) FROM customers WHERE city = '{{city}}'`
````

**Tạo `content/tickets/ch6/ch6-02.md`:**
````markdown
---
id: ch6-02
chapter: 6
title: Tìm hàng theo mô tả gõ tay
title_en: Finding cargo by its typed description
from: { name: Bùi Long, dept: Ops }
difficulty: 2
beat: develop
format: faded
requires: [join, where]
grants: [pattern_match]
tables: [cfs_receipts, shipments]
scene: { kind: truck }
columns:
  - { vi: "Mã lô", en: "Shipment ref" }
  - { vi: "Ngày nhận hàng", en: "Receiving date" }
  - { vi: "Mô tả hàng", en: "Cargo description" }
starter: |
  SELECT s.ref, r.received_date, r.cargo_desc
  FROM cfs_receipts r
  JOIN shipments s ON s.id = r.shipment_id
  WHERE r.cargo_desc ___ '___'
    AND r.received_date >= '2026-10-01' AND r.received_date < '2026-11-01'
variants:
  - { word: frozen }
  - { word: wooden }
  - { word: coffee }
reflect:
  q: { vi: "Mẫu '{{word}}' không có dấu % ở hai đầu thì khớp những mô tả nào?", en: "Which descriptions does the pattern '{{word}}' match without % on either side?" }
  options:
    - { vi: "Chỉ mô tả đúng bằng chữ đó, không thêm gì", en: "Only a description that is exactly that word, nothing more" }
    - { vi: "Mọi mô tả có chứa chữ đó", en: "Every description containing that word" }
    - { vi: "Mọi mô tả bắt đầu bằng chữ đó", en: "Every description starting with that word" }
  answer: 0
  why: { vi: "Dấu % thay cho một đoạn chữ bất kỳ, kể cả rỗng. Thiếu % thì mẫu phải khớp cả ô.", en: "% stands for any run of characters, even none. Without % the pattern has to match the whole value." }
wrong:
  - sql: "SELECT s.ref, r.received_date, r.cargo_desc FROM cfs_receipts r JOIN shipments s ON s.id = r.shipment_id WHERE r.cargo_desc LIKE '%{{word}}%' AND r.received_date >= '2026-10-01' AND r.received_date < '2026-11-01'"
    vi: "Thiếu những phiếu ghi chữ hoa: LIKE phân biệt hoa thường. Dùng ILIKE."
    en: "The receipts written in capitals are missing: LIKE is case-sensitive. Use ILIKE."
---
Nhân viên kho gõ mô tả hàng trên phiếu nhập kho mỗi người một kiểu: chữ hoa, chữ thường, có khi lẫn cả hai. Mình cần tách các lô có chữ {{word}} trong mô tả để xếp vào khu riêng của kho.

Câu SQL trong editor còn hai chỗ trống ___.

## Task
Các phiếu nhập kho CFS trong tháng 10/2026 có chữ {{word}} ở bất kỳ đâu trong mô tả hàng, viết hoa hay thường đều tính: gửi mã lô, ngày nhận hàng và mô tả hàng đúng như trên phiếu. Không cần sắp xếp.

## Hints
1. Chữ cần tìm có thể nằm đầu, giữa hay cuối mô tả, và có thể viết hoa hay thường. Cần một phép so khớp theo mẫu không phân biệt hoa thường.
2. `ILIKE` so khớp không phân biệt hoa thường; `%` thay cho một đoạn chữ bất kỳ, kể cả rỗng. Mẫu cần tìm là `'%{{word}}%'`.
3. `WHERE r.cargo_desc ILIKE '%{{word}}%' AND ...`

## Solution
```sql
SELECT s.ref, r.received_date, r.cargo_desc
FROM cfs_receipts r
JOIN shipments s ON s.id = r.shipment_id
WHERE r.cargo_desc ILIKE '%{{word}}%'
  AND r.received_date >= '2026-10-01' AND r.received_date < '2026-11-01'
```

# EN
Warehouse staff type the cargo description on each receipt their own way: capitals, lower case, sometimes both. I need the shipments with the word {{word}} in the description, so they go to their own area of the warehouse.

The SQL in the editor has two ___ blanks left.

## Task
The CFS receipts of October 2026 with the word {{word}} anywhere in the cargo description, in capitals or lower case: send the shipment ref, the receiving date and the cargo description exactly as on the receipt. Any order is fine.

## Hints
1. The word can be at the start, in the middle or at the end of the description, in capitals or lower case. You need a pattern match that ignores case.
2. `ILIKE` matches without caring about case; `%` stands for any run of characters, even none. The pattern you need is `'%{{word}}%'`.
3. `WHERE r.cargo_desc ILIKE '%{{word}}%' AND ...`
````

**Tạo `content/tickets/ch6/ch6-03.md`:**
````markdown
---
id: ch6-03
chapter: 6
title: Khách đi nhiều cảng
title_en: Customers shipping to many ports
from: { name: Hoàng Dũng, dept: Sales }
difficulty: 3
beat: develop
requires: [join, group_by, having]
grants: [distinct]
tables: [shipments, customers]
columns:
  - { vi: "Tên khách hàng", en: "Customer name" }
  - { vi: "Số cảng đến khác nhau", en: "Different destination ports" }
variants:
  - { n: 18 }
  - { n: 16 }
  - { n: 19 }
reflect:
  q: { vi: "count(pod) khác count(DISTINCT pod) ở chỗ nào?", en: "How does count(pod) differ from count(DISTINCT pod)?" }
  options:
    - { vi: "count(pod) đếm mọi lô có cảng đến; DISTINCT chỉ đếm mỗi cảng một lần", en: "count(pod) counts every shipment with a destination; DISTINCT counts each port once" }
    - { vi: "Hai cách như nhau", en: "They are the same" }
    - { vi: "DISTINCT đếm cả cảng trống", en: "DISTINCT also counts empty ports" }
  answer: 0
  why: { vi: "Mười lô cùng đi Rotterdam là mười dòng nhưng chỉ một cảng. Câu hỏi \"bao nhiêu nơi\" cần DISTINCT.", en: "Ten shipments to Rotterdam are ten rows but one port. A \"how many places\" question needs DISTINCT." }
wrong:
  - sql: "SELECT c.name, count(s.pod) FROM shipments s JOIN customers c ON c.id = s.customer_id WHERE s.booking_date >= '2025-01-01' AND s.booking_date < '2026-01-01' AND s.direction = 'EXPORT' AND s.status <> 'CANCELLED' GROUP BY c.id, c.name HAVING count(s.pod) >= {{n}}"
    vi: "Bạn đang đếm số lô chứ không phải số cảng: count(pod) đếm cả cảng lặp lại. Thêm DISTINCT."
    en: "You are counting shipments, not ports: count(pod) counts repeated ports too. Add DISTINCT."
---
Sales sắp chào gói cước đa tuyến: một hợp đồng, nhiều cảng đến. Ứng viên tốt nhất là những khách năm ngoái đã xuất hàng đi nhiều cảng khác nhau.

## Task
Năm 2025, khách nào có lô hàng xuất khẩu đi tới từ {{n}} cảng đến khác nhau trở lên (tính theo ngày booking)? Không tính lô đã hủy. Gửi mình tên khách và số cảng đến khác nhau. Không cần sắp xếp.

## Hints
1. Câu hỏi là có bao nhiêu nơi khác nhau, không phải bao nhiêu lô: hai lô cùng đi Rotterdam chỉ tính là một cảng.
2. `count(DISTINCT s.pod)` đếm số cảng đến khác nhau. Lọc lô: booking năm 2025, `s.direction = 'EXPORT'`, `s.status <> 'CANCELLED'`; điều kiện trên số cảng đặt ở `HAVING`.
3. `SELECT c.name, count(DISTINCT s.pod) FROM shipments s JOIN customers c ON ... WHERE ... GROUP BY c.id, c.name HAVING count(DISTINCT s.pod) >= {{n}}`

## Solution
```sql
SELECT c.name, count(DISTINCT s.pod)
FROM shipments s
JOIN customers c ON c.id = s.customer_id
WHERE s.booking_date >= '2025-01-01' AND s.booking_date < '2026-01-01'
  AND s.direction = 'EXPORT' AND s.status <> 'CANCELLED'
GROUP BY c.id, c.name
HAVING count(DISTINCT s.pod) >= {{n}}
```

# EN
Sales is about to pitch a multi-lane freight package: one contract, many destination ports. The best candidates are the customers who exported to many different ports last year.

## Task
In 2025, which customers had export shipments going to {{n}} or more different destination ports (by booking date)? Leave out cancelled shipments. Send me the customer name and the number of different destination ports. Any order is fine.

## Hints
1. The question is how many different places, not how many shipments: two shipments to Rotterdam count as one port.
2. `count(DISTINCT s.pod)` counts the different destination ports. Filter the shipments: booked in 2025, `s.direction = 'EXPORT'`, `s.status <> 'CANCELLED'`; the condition on the number of ports goes in `HAVING`.
3. `SELECT c.name, count(DISTINCT s.pod) FROM shipments s JOIN customers c ON ... WHERE ... GROUP BY c.id, c.name HAVING count(DISTINCT s.pod) >= {{n}}`
````

**Tạo `content/tickets/ch6/ch6-04.md`:**
````markdown
---
id: ch6-04
chapter: 6
title: Tỷ lệ hủy booking của từng khách
title_en: Cancellation rate per customer
from: { name: Nguyễn Quang, dept: Finance }
difficulty: 3
beat: twist
requires: [conditional_agg, date_bucket, group_by, having]
grants: [cast]
tables: [shipments]
columns:
  - { vi: "Mã khách hàng", en: "Customer code" }
  - { vi: "Số booking", en: "Bookings" }
  - { vi: "Số booking bị hủy", en: "Cancelled bookings" }
  - { vi: "Tỷ lệ hủy (%)", en: "Cancellation rate (%)" }
variants:
  - { year: 2025 }
  - { year: 2026 }
  - { year: 2024 }
reflect:
  q: { vi: "Vì sao trong SQL 3 / 4 ra 0?", en: "Why does 3 / 4 give 0 in SQL?" }
  options:
    - { vi: "Hai số nguyên chia nhau cho ra số nguyên, phần lẻ bị bỏ", en: "Dividing two integers gives an integer; the decimals are dropped" }
    - { vi: "Vì phải làm tròn trước khi chia", en: "Because you must round before dividing" }
    - { vi: "Vì kết quả đếm là chuỗi", en: "Because a count is text" }
  answer: 0
  why: { vi: "Ép một vế sang numeric (::numeric) thì phép chia giữ phần lẻ, rồi mới làm tròn 2 chữ số.", en: "Cast one side to numeric (::numeric) and the division keeps its decimals; then round to 2 places." }
wrong:
  - sql: "SELECT customer_id, count(*), count(*) FILTER (WHERE status = 'CANCELLED'), count(*) FILTER (WHERE status = 'CANCELLED') * 100 / count(*) FROM shipments WHERE extract(year FROM booking_date) = {{year}} GROUP BY customer_id HAVING count(*) FILTER (WHERE status = 'CANCELLED') > 0"
    vi: "Tỷ lệ đang ra số nguyên bị cắt phần lẻ (3 thay vì 3,45): hai số đếm chia nhau là phép chia số nguyên. Ép một vế sang numeric trước khi chia."
    en: "The rate comes out as a whole number with the decimals cut off (3 instead of 3.45): two counts divided is an integer division. Cast one side to numeric first."
  - sql: "SELECT customer_id, count(*), count(*) FILTER (WHERE status = 'CANCELLED'), count(*) FILTER (WHERE status = 'CANCELLED') / count(*) * 100 FROM shipments WHERE extract(year FROM booking_date) = {{year}} GROUP BY customer_id HAVING count(*) FILTER (WHERE status = 'CANCELLED') > 0"
    vi: "Tỷ lệ ra 0 cho mọi khách: số bị hủy chia tổng là phép chia số nguyên nên ra 0 trước khi kịp nhân 100. Ép sang numeric trước khi chia."
    en: "Every rate is 0: cancelled divided by total is an integer division, so it is 0 before it is ever multiplied by 100. Cast to numeric before dividing."
---
Ban giám đốc đang cân nhắc thu phí hủy booking. Trước khi quyết, mình cần biết khách nào hay hủy, tính bằng phần trăm để so được khách lớn với khách nhỏ.

## Task
Trong năm {{year}} (theo ngày booking), với mỗi khách có ít nhất một booking bị hủy: gửi mã khách, số booking, số booking bị hủy và tỷ lệ hủy tính bằng phần trăm (số bị hủy chia tổng số booking, nhân 100), làm tròn 2 chữ số thập phân. Không cần sắp xếp.

## Hints
1. Mỗi khách một dòng, hai con số đếm trên cùng một nhóm (tổng và số bị hủy) như bài luồng xanh, vàng, đỏ, rồi đem chia cho nhau. Cẩn thận: chia hai số nguyên trong SQL sẽ bỏ hết phần lẻ.
2. `count(*) FILTER (WHERE status = 'CANCELLED')` là số bị hủy. Ép sang số thập phân trước khi chia: `...::numeric * 100 / count(*)`, rồi `ROUND(..., 2)`. Năm: `extract(year FROM booking_date) = {{year}}`; khách không có lô hủy bỏ bằng `HAVING`.
3. `SELECT customer_id, count(*), count(*) FILTER (...), ROUND(count(*) FILTER (...)::numeric * 100 / count(*), 2) FROM shipments WHERE ... GROUP BY customer_id HAVING ...`

## Solution
```sql
SELECT customer_id, count(*), count(*) FILTER (WHERE status = 'CANCELLED'),
       ROUND(count(*) FILTER (WHERE status = 'CANCELLED')::numeric * 100 / count(*), 2)
FROM shipments
WHERE extract(year FROM booking_date) = {{year}}
GROUP BY customer_id
HAVING count(*) FILTER (WHERE status = 'CANCELLED') > 0
```

# EN
The board is considering a booking cancellation fee. Before deciding, I need to know which customers cancel often, as a percentage so big and small customers can be compared.

## Task
In {{year}} (by booking date), for each customer with at least one cancelled booking: send the customer code, the number of bookings, the number of cancelled bookings and the cancellation rate as a percentage (cancelled divided by all bookings, times 100), rounded to 2 decimals. Any order is fine.

## Hints
1. One row per customer, with two counts on the same group (all and cancelled) like the green, yellow and red lanes, then divide one by the other. Careful: dividing two integers in SQL throws away every decimal.
2. `count(*) FILTER (WHERE status = 'CANCELLED')` is the cancelled count. Turn it into a decimal number before dividing: `...::numeric * 100 / count(*)`, then `ROUND(..., 2)`. The year: `extract(year FROM booking_date) = {{year}}`; drop customers with no cancellation using `HAVING`.
3. `SELECT customer_id, count(*), count(*) FILTER (...), ROUND(count(*) FILTER (...)::numeric * 100 / count(*), 2) FROM shipments WHERE ... GROUP BY customer_id HAVING ...`
````

**Tạo `content/tickets/ch6/ch6-05.md`:**
````markdown
---
id: ch6-05
chapter: 6
title: Lô air khai điều kiện giao hàng đường biển
title_en: Air shipments with a sea-only Incoterm
from: { name: Võ Lan, dept: Ops }
difficulty: 2
beat: rest
requires: [multi_join, where, order_by]
grants: []
tables: [shipments, incoterms, employees]
ordered: true
columns:
  - { vi: "Mã lô", en: "Shipment ref" }
  - { vi: "Điều kiện giao hàng", en: "Incoterm" }
  - { vi: "Sales làm lô", en: "Sales rep on the shipment" }
reflect:
  q: { vi: "Vì sao lấy sales từ lô hàng chứ không từ hồ sơ khách?", en: "Why take the sales rep from the shipment and not from the customer record?" }
  options:
    - { vi: "Người cần sửa chứng từ là sales làm lô đó; sales quản lý khách có thể là người khác", en: "The person who fixes the documents is the rep on that shipment; the account owner may be someone else" }
    - { vi: "Hồ sơ khách không có sales", en: "The customer record has no sales rep" }
    - { vi: "Hai cột luôn giống nhau", en: "The two columns are always the same" }
  answer: 0
  why: { vi: "Lô hàng và hồ sơ khách đều có cột sales, như bài chia lại khách ở chương 3. Đọc kỹ đề để chọn đúng cột.", en: "Both the shipment and the customer record have a sales rep column, as in the chapter 3 portfolio task. Read the request to pick the right one." }
---
Có những điều kiện giao hàng (Incoterms) chỉ dùng cho vận tải biển; danh mục Incoterms của công ty ghi rõ điều kiện nào. Lô hàng air mà khai các điều kiện đó thì vận đơn hàng không sẽ sai, và khách có thể bị phạt khi làm thủ tục hải quan. Mình cần sửa trước khi phát hành chứng từ.

## Task
Các lô hàng air booking từ 01/07/2026 trở đi, không tính lô đã hủy, đang khai một điều kiện giao hàng chỉ dành cho vận tải biển: gửi mã lô, điều kiện giao hàng và họ tên sales làm lô (sales trên từng lô, không phải sales quản lý khách). Xếp theo mã lô từ nhỏ đến lớn.

## Hints
1. Danh mục Incoterms cho biết điều kiện nào chỉ dùng cho đường biển. Ghép lô hàng với danh mục đó và với nhân viên sales của lô.
2. `shipments.incoterm` khớp `incoterms.code`, cột `sea_only` là đúng/sai; `shipments.sales_rep_id` khớp `employees.id`. Lọc `s.mode = 'AIR'`, `i.sea_only`, `s.status <> 'CANCELLED'`, `s.booking_date >= '2026-07-01'`.
3. `SELECT s.ref, s.incoterm, e.full_name FROM shipments s JOIN incoterms i ON ... JOIN employees e ON ... WHERE ... ORDER BY s.ref`

## Solution
```sql
SELECT s.ref, s.incoterm, e.full_name
FROM shipments s
JOIN incoterms i ON i.code = s.incoterm
JOIN employees e ON e.id = s.sales_rep_id
WHERE s.mode = 'AIR' AND i.sea_only AND s.status <> 'CANCELLED' AND s.booking_date >= '2026-07-01'
ORDER BY s.ref
```

# EN
Some delivery terms (Incoterms) are for sea transport only; the company's Incoterms list says which ones. An air shipment declared with one of them gets a wrong air waybill, and the customer may be fined at customs. I want to fix them before the documents are issued.

## Task
The air shipments booked from 1 July 2026 on, cancelled ones excluded, that carry a sea-only delivery term: send the shipment ref, the delivery term and the full name of the sales rep on the shipment (the rep on each shipment, not the account owner). Order by shipment ref, smallest first.

## Hints
1. The Incoterms list says which terms are sea-only. Match the shipments with that list and with the shipment's sales rep.
2. `shipments.incoterm` matches `incoterms.code`, and column `sea_only` is true/false; `shipments.sales_rep_id` matches `employees.id`. Filter `s.mode = 'AIR'`, `i.sea_only`, `s.status <> 'CANCELLED'`, `s.booking_date >= '2026-07-01'`.
3. `SELECT s.ref, s.incoterm, e.full_name FROM shipments s JOIN incoterms i ON ... JOIN employees e ON ... WHERE ... ORDER BY s.ref`
````

**Tạo `content/tickets/ch6/ch6-06.md`:**
````markdown
---
id: ch6-06
chapter: 6
title: "Đánh giá thăng tiến: dọn dữ liệu khách trước báo cáo năm"
title_en: "Promotion review: cleaning customer data before the annual report"
from: { name: Trần An, dept: Management }
difficulty: 4
beat: boss
requires: [string_fn, pattern_match, self_join, cast, conditional_agg, group_by, aggregate, order_by]
grants: []
tables: [customers, shipments]
ordered: true
columns:
  - [{ vi: "Mã khách gốc", en: "Original customer code" }, { vi: "Tên khách gốc", en: "Original customer name" }, { vi: "Mã bản trùng", en: "Duplicate code" }, { vi: "Tên bản trùng", en: "Duplicate name" }]
  - [{ vi: "Mã khách gốc", en: "Original customer code" }, { vi: "Tên khách gốc", en: "Original customer name" }, { vi: "Số lô năm 2025 sau khi gộp", en: "2025 shipments after merging" }]
  - [{ vi: "Mã khách gốc", en: "Original customer code" }, { vi: "Tên khách gốc", en: "Original customer name" }, { vi: "Số booking năm 2025", en: "Bookings in 2025" }, { vi: "Số booking bị hủy", en: "Cancelled bookings" }, { vi: "Tỷ lệ hủy (%)", en: "Cancellation rate (%)" }]
conclusion:
  question: "Ở bước 3, vì sao phải ép số booking bị hủy sang numeric trước khi chia?"
  options:
    - "Hai số nguyên chia nhau bỏ phần lẻ, nên tỷ lệ ra số nguyên hoặc 0"
    - "Để làm tròn được 2 chữ số"
    - "Vì tỷ lệ phải là chuỗi chữ"
  answer: 0
conclusion_en:
  question: "In step 3, why must the cancelled count be cast to numeric before dividing?"
  options:
    - "Dividing two integers drops the decimals, so the rate becomes a whole number or 0"
    - "So that it can be rounded to 2 decimals"
    - "Because the rate has to be text"
---
Đây là buổi đánh giá thăng tiến của bạn. Trước khi nộp báo cáo năm, kế toán trưởng phát hiện một số khách bị nhập hai lần: một bản có tên tiếng Việt với loại hình công ty ở đầu, một bản có tên kiểu tiếng Anh với đuôi Co., Ltd. Số liệu bị tách đôi làm khách lớn trông nhỏ đi. Dọn giúp mình ba việc; làm đúng cả ba là bạn lên một nấc trong sự nghiệp.

## Step 1: Cặp khách bị nhập hai lần
Tìm các cặp khách cùng một công ty: bỏ loại hình công ty ở đầu tên bản tiếng Việt (Công ty TNHH MTV, Công ty TNHH, Công ty CP) và bỏ đuôi Co., Ltd ở bản tiếng Anh thì hai tên giống hệt nhau. Gửi mã và tên bản gốc (tên tiếng Việt), rồi mã và tên bản trùng; xếp theo mã bản gốc từ nhỏ đến lớn.
```sql
SELECT a.id, a.name, b.id, b.name
FROM customers a
JOIN customers b ON b.name = regexp_replace(a.name, '^Công ty (TNHH MTV|TNHH|CP) ', '') || ' Co., Ltd'
ORDER BY a.id
```

## Step 2: Sản lượng 2025 sau khi gộp
Với mỗi cặp ở bước 1, đếm số lô booking trong năm 2025 của cả hai bản cộng lại, không tính lô đã hủy. Gửi mã và tên bản gốc cùng số lô; xếp theo mã bản gốc từ nhỏ đến lớn.
```sql
SELECT a.id, a.name, count(*)
FROM customers a
JOIN customers b ON b.name = regexp_replace(a.name, '^Công ty (TNHH MTV|TNHH|CP) ', '') || ' Co., Ltd'
JOIN shipments s ON s.customer_id IN (a.id, b.id)
WHERE s.booking_date >= '2025-01-01' AND s.booking_date < '2026-01-01' AND s.status <> 'CANCELLED'
GROUP BY a.id, a.name
ORDER BY a.id
```

## Step 3: Tỷ lệ hủy sau khi gộp
Vẫn các cặp đó, năm 2025, lần này tính cả lô đã hủy: số booking của cả hai bản, số booking bị hủy và tỷ lệ hủy tính bằng phần trăm, làm tròn 2 chữ số thập phân. Gửi mã và tên bản gốc rồi ba con số đó; xếp theo mã bản gốc từ nhỏ đến lớn.
```sql
SELECT a.id, a.name, count(*), count(*) FILTER (WHERE s.status = 'CANCELLED'),
       ROUND(count(*) FILTER (WHERE s.status = 'CANCELLED')::numeric * 100 / count(*), 2)
FROM customers a
JOIN customers b ON b.name = regexp_replace(a.name, '^Công ty (TNHH MTV|TNHH|CP) ', '') || ' Co., Ltd'
JOIN shipments s ON s.customer_id IN (a.id, b.id)
WHERE s.booking_date >= '2025-01-01' AND s.booking_date < '2026-01-01'
GROUP BY a.id, a.name
ORDER BY a.id
```

## Hints
1. Bước 1 ghép danh mục khách với chính nó: một bên tên tiếng Việt, bên kia tên kiểu tiếng Anh, so sau khi bỏ phần thừa ở mỗi bên. Bước 2 và 3 dùng lại cách ghép đó rồi lấy lô của cả hai mã. Bước 3 có phép chia: nhớ bẫy chia số nguyên.
2. `regexp_replace(a.name, '^Công ty (TNHH MTV|TNHH|CP) ', '')` bỏ loại hình công ty; đuôi tiếng Anh là `' Co., Ltd'`. Lô của cả hai mã: `JOIN shipments s ON s.customer_id IN (a.id, b.id)`. Tỷ lệ: `count(*) FILTER (WHERE s.status = 'CANCELLED')::numeric * 100 / count(*)`.
3. `SELECT a.id, a.name, b.id, b.name FROM customers a JOIN customers b ON b.name = regexp_replace(a.name, ..., '') || ' Co., Ltd' ORDER BY a.id`

# EN
This is your promotion review. Before the annual report goes out, the chief accountant found that some customers were entered twice: one record with a Vietnamese name starting with the company type, one with an English-style name ending in Co., Ltd. Split figures make big customers look small. Clean up three things for me; get all three right and you move up a step in your career.

## Step 1: Customers entered twice
Find the pairs of records for the same company: drop the company type at the start of the Vietnamese name (the Vietnamese words for a single-member limited liability company, a limited liability company or a joint stock company) and drop Co., Ltd at the end of the English name, and the two names are identical. Send the code and name of the original (the Vietnamese name), then the code and name of the duplicate; order by the original's code, smallest first.

## Step 2: 2025 volume after merging
For each pair from step 1, count the shipments booked in 2025 under both records together, cancelled shipments excluded. Send the original's code and name with the count; order by the original's code, smallest first.

## Step 3: Cancellation rate after merging
Same pairs, 2025, this time including cancelled shipments: the bookings under both records, the cancelled bookings and the cancellation rate as a percentage, rounded to 2 decimals. Send the original's code and name, then those three numbers; order by the original's code, smallest first.

## Hints
1. Step 1 matches the customer list with itself: one side has the Vietnamese name, the other the English-style name, compared after trimming the extra part on each side. Steps 2 and 3 reuse that match, then take the shipments of both codes. Step 3 divides: remember the integer division trap.
2. `regexp_replace(a.name, '^Công ty (TNHH MTV|TNHH|CP) ', '')` drops the company type; the English ending is `' Co., Ltd'`. Shipments of both codes: `JOIN shipments s ON s.customer_id IN (a.id, b.id)`. The rate: `count(*) FILTER (WHERE s.status = 'CANCELLED')::numeric * 100 / count(*)`.
3. `SELECT a.id, a.name, b.id, b.name FROM customers a JOIN customers b ON b.name = regexp_replace(a.name, ..., '') || ' Co., Ltd' ORDER BY a.id`
````

- [ ] **Step 4: Chạy toàn bộ, xác nhận PASS**

Run: `npm test && npx tsc --noEmit`
Expected: tất cả PASS (763 test trên bản replay).

- [ ] **Step 5: Ngân sách `main` (Q2)**

Run: `npm run build && node scripts/check-budget.mjs`
Expected: `FAIL main ≈ 282 KB gz / 270 KB`, các nhóm khác ok. Nâng ngân sách theo luật L40:

**Sửa `scripts/check-budget.mjs`** — thay:
```js
  ['main', /^index-.*\.js$/, 270],
```
bằng:
```js
  ['main', /^index-.*\.js$/, 300], // Plan 2: 282 KB after ch4–6 tickets + learning-method engine (Q2, cần user xem cùng P-D3)
```

Run: `node scripts/check-budget.mjs`
Expected: mọi nhóm `ok`.

- [ ] **Step 6: Commit**

```bash
git add content/tickets/ch6 tests/scene.test.ts scripts/check-budget.mjs
git commit -m "content: chapter 6 Cleaning the data (6 tickets, VI + EN); main budget 300 KB (Q2, needs user review)"
```

---

### Task 10: CLAUDE.md, kiểm toàn bộ, checklist Edge cho orchestrator

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Ghi luật mới vào CLAUDE.md**

**Sửa `CLAUDE.md`** — thay:
```markdown
Use `textOf(ticket, lang)` for any player-facing ticket text. Copy `content/TEMPLATE.md` to start a ticket.
```
bằng:
````markdown
Use `textOf(ticket, lang)` for any player-facing ticket text. Copy `content/TEMPLATE.md` to start a ticket. Learning-method fields (Plan 2, curriculum §5): `format: worked | faded | open` (undefined = open); worked tickets add `## Example` after `## Task` (a ```sql block with `-- ①` markers in the VI part only, one prose paragraph per marker in VI and EN; `brief.ts` shows it with "Copy into the editor"); faded tickets have `___` blanks in `starter` (Submit refuses them without counting a wrong submit, `BLANK` in `src/tickets.ts`); `reflect: { q, options, answer, why }` (bilingual, shown in the Recap, never saved); `wrong: [{ sql, vi, en }]` (`work.ts` shows the explanation when the player's wrong result equals one of them, else the trap of the skill the ticket teaches). Bosses use none of these.
````

**Sửa `CLAUDE.md`** — thay:
```markdown
and holds linear progression, XP, which tables each chapter reveals (`CHAPTER_TABLES`) and `contentProblems` (soft-lock, pacing, skill-map and twist→boss checks).
```
bằng:
```markdown
and holds linear progression, XP, which tables each chapter reveals (`CHAPTER_TABLES`) and `contentProblems` (soft-lock, pacing, skill-map, twist→boss and, from chapter 4, interleaved-review checks on rest tickets). `warmupQueue` (`src/practice.ts`, Home card "Chapter warm-up" in `ui/modes.ts`) offers up to 3 practice items on earlier chapters' skills while the current chapter (≥ 2) has no completed ticket; nothing extra is saved.
```

**Sửa `CLAUDE.md`** — thay:
```markdown
- Every ticket ships VI + EN (release gate: 0 tickets without `# EN`).
```
bằng:
```markdown
- From chapter 4 (`tests/content.test.ts`, "phương pháp học"): the teach ticket is `format: worked`, each chapter has exactly one `faded` ticket, every non-boss ticket has `reflect:`, every `wrong:` SQL runs and differs from the Solution in every variant, and every new skill has a non-boss ticket with ≥ 3 variants (L37). A rest ticket must `require` ≥ 2 skills of earlier chapters, one of them from chapter N−2 or older (`contentProblems`). Results never contain language-specific text: categories are numbers (1/2/3) and flags are booleans, because the grader compares strings exactly.
- Every ticket ships VI + EN (release gate: 0 tickets without `# EN`).
```

**Sửa `CLAUDE.md`** — thay:
```markdown
- Story hooks the later chapters rely on are listed at the top of `seed.sql`; do not change them without updating tickets and `tests/seed.test.ts`.
```
bằng:
```markdown
- Story hooks the later chapters rely on are listed at the top of `seed.sql` (chapters 4–6: at the head of the Plan 2 block); do not change them without updating tickets and `tests/seed.test.ts`. That test pins the md5 of the six chapter 1–3 tables, so a new block that re-rolls them fails. Plan 2 tables: `shipment_events` (log starts 2026-07-01), `trucking_orders`, `cfs_receipts`, `hs_codes`, `duties_taxes`, `customs_declarations` (from 2026-06-01, `amended_from_id` chains up to 2 steps, exports only), `incoterms`.
```

- [ ] **Step 2: Kiểm toàn bộ**

Run: `npm test && npx tsc --noEmit && npm run build && node scripts/check-budget.mjs`
Expected: tất cả PASS; `contentProblems` rỗng (test "soft-lock, nhịp chương…"); mọi nhóm ngân sách `ok`.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: CLAUDE.md notes for Plan 2 (learning-method fields, rest rule, warm-up card, chapter 4-6 seed)"
```

- [ ] **Step 4: Checklist Edge (orchestrator; origin riêng, không đụng save ở :5173)**

Chạy ở cổng khác để có `localStorage` riêng: `npx vite --port 5174 --strictPort`, mở `http://localhost:5174/` trên **Edge**. Không mở `:5173`.

Tạo file `save-ch3-done.json` (ngoài repo) rồi bấm **Nhập tiến độ** trên topbar để nạp:
```json
{
  "version": 2,
  "completed": ["ch1-01", "ch1-02", "ch1-03", "ch1-04", "ch1-05", "ch2-01", "ch2-02", "ch2-03", "ch2-04", "ch2-05",
                "ch3-01", "ch3-02", "ch3-03", "ch3-04", "ch3-05"],
  "xp": 3000,
  "hintsUsed": {},
  "drafts": {},
  "graded": {},
  "review": {
    "select": { "box": 4, "due": "2026-12-01" }, "where": { "box": 1, "due": "2026-11-10" },
    "order_by": { "box": 2, "due": "2026-11-12" }, "limit": { "box": 3, "due": "2026-11-30" },
    "aggregate": { "box": 1, "due": "2026-11-11" }, "group_by": { "box": 2, "due": "2026-11-20" },
    "having": { "box": 3, "due": "2026-11-25" }, "join": { "box": 1, "due": "2026-11-13" },
    "multi_join": { "box": 2, "due": "2026-11-28" }, "left_join": { "box": 4, "due": "2026-12-05" },
    "anti_join": { "box": 1, "due": "2026-11-14" }
  },
  "practice": { "solved": 0, "weak": 0 },
  "sandboxDraft": "",
  "bossStep": {}
}
```

Kiểm (mỗi dòng ✓/✗, ghi số đo):
1. **Boot:** từ lúc tải lại trang đến khi nút Chạy sẵn sàng; so với HEAD trước Plan 2 (cùng máy, cùng cổng). Vượt 1,5 lần thì ghi `decision-log.md` (xem "Kết quả spike seed"). Console không lỗi.
2. **Trang chủ:** card "Ôn đầu chương · 0 XP" hiện ngay trên card Ôn tập, nút "Ôn 3 bài"; bấm → Luyện tập 3 bài của ch1–3 (`where`, `aggregate`, `join` hộp 1 lên trước), banner "Luyện tập · 1/3 · 0 XP". Lưới chương: ch4 "Đang học", ch5–6 khóa 🔒, ch7–12 "Nội dung đang soạn". Ô KPI mới khóa.
3. **ch4-01 (ví dụ mẫu):** khối "Tuần này ở Cargo Query" của ch4, thẻ "Ví dụ mẫu" có SQL đánh dấu ①–④ và 4 đoạn giải thích; "Chép ví dụ vào editor" thay nội dung editor, Ctrl+Z hoàn tác được; Chạy ví dụ ra 8 dòng. Nộp chính ví dụ → sai, phản hồi có dòng "Bẫy hay gặp: …" (trap `date_math`). Nộp câu thiếu điều kiện "> 3" → hiện lời giải thích riêng của câu `wrong:`. Nộp đúng → hoạt cảnh `chat`, Recap có "Ngẫm lại": chọn sai → "Chưa đúng." + giải thích, chọn đúng → viền xanh. Đổi VI|EN: thẻ ví dụ, câu ngẫm lại đổi ngôn ngữ, editor giữ nguyên.
4. Card "Ôn đầu chương" biến mất sau khi xong ch4-01.
5. **ch4-02 (làm cùng):** editor mở sẵn câu có `___`; Nộp ngay → "Còn 2 chỗ trống ___…", không trừ gì, không hiện câu trả lời của người gửi; Chạy → lỗi cú pháp Postgres có gạch chân.
6. **ch4-04:** gõ `s.ata = NULL` → kết quả rỗng, Nộp → giải thích "so bằng với NULL…".
7. **ch5-01:** CASE trộn `ref` với `0` → lỗi 42804 kèm giải thích mới; CASE trộn `1` với `'late'` → 22P02 kèm giải thích.
8. **Cột mốc ch4-06, ch5-06, ch6-06** (dùng Solution trong plan): 3 bước, câu kết luận; ch6-06 xong → màn thăng tiến **Senior DA**; topbar đổi chức danh.
9. **Luyện tập** từ chip kỹ năng `date_math` → biến thể khác 10/2026 (tháng 8 hoặc 6), đề và Solution khớp nhau; Nộp đúng → "+1 hộp".
10. Màn hẹp 375 px: thẻ Ví dụ mẫu và câu ngẫm lại không tràn ngang; dark mode đọc rõ.

Ghi kết quả vào `docs/team/decision-log.md` (dòng L-số mới) cùng Q1–Q16. **Cần user xem:** Q2 (ngân sách `main`), số đo boot.

---

## Đã kiểm khi viết plan (2026-11-17)

- Áp toàn bộ plan bằng script replay (đọc các khối `Tạo` / `Sửa … — thay/bằng` / `Thêm vào cuối`, mỗi khối "thay" phải khớp đúng một lần) lên một bản `git archive HEAD` (`646d9e0`) sạch, `node_modules` nối bằng junction: 90 khối áp được, không khối "thay" nào lệch. Replay dừng sau từng task 1–8 trên bản sạch riêng: `tsc` sạch và mọi test PASS (504, 507, 512, 513, 515, 516, 599, 682 test). Toàn bộ plan: `tsc` sạch, 763 test PASS, `npm run build` sạch, `check-budget` mọi nhóm `ok` (main 282/300, worker 136/160).
- Chạy từng Solution (mọi bước, mọi biến thể) trên PGlite: số dòng như bảng trên, không có kết quả rỗng; mọi câu `wrong:` cho kết quả khác Solution ở mọi biến thể (test "phương pháp học").
- Đáp án đúng viết kiểu khác qua grader (mục "Số dòng kết quả mong đợi").
- md5 của 6 bảng ch1–3 trước và sau Plan 2 giống hệt (ghim trong `tests/seed.test.ts`).
- Kiểm trên PGlite: `upper()`/`ILIKE` xử lý đúng chữ có dấu (`C.UTF-8`); `date_trunc('week', …)` trả thứ Hai, kiểu `timestamptz`, so bằng với `::date` qua grader; regex `|` của Postgres chọn khớp dài nhất (Q12); `CASE … THEN 'late' ELSE 0` báo `22P02` chứ không phải `42804` (chuỗi trong nháy là kiểu `unknown`).
