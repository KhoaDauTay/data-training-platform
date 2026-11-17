# Cargo Query — Plan 3: chương 7–9 (truy vấn con, CTE và tỷ giá, đối soát) và nội dung ticket tải lười

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trước hết đưa nội dung ticket ra khỏi bundle `main` (L41: `main` về ≤ 270 KB gzip). Sau đó thêm chương 7 "Báo giá & so sánh", 8 "Công nợ & tỷ giá", 9 "Đối soát chứng từ" (18 ticket VI + EN, 10 kỹ năng mới, xong ch9 lên ★ Lead DA) theo L30 và `docs/team/curriculum.md` §4, giữ nguyên định dạng và luật phương pháp học của Plan 2 (worked → faded → open → twist → rest → cột mốc; `reflect` mọi ticket thường; `wrong:` khác Solution ở mọi biến thể và có dòng; 3 biến thể cho mỗi kỹ năng mới).

**Architecture:**
- Task 1: `src/ticketSources.ts` (glob eager) chỉ được `import()` động từ `src/content.ts`, nên thành một chunk riêng; `main.ts` chờ `loadContent()` trước lần vẽ đầu (có dải đang tải VI + EN), `tests/setup.ts` chờ cho Vitest. Chữ ký đồng bộ `loadTickets()`/`loadTicketTemplates()` giữ nguyên.
- Seed: 8 bảng mới thêm vào **cuối** `schema.sql`, 8 khối seed (mỗi khối một `setseed()`) thêm vào **cuối** `seed.sql`. 13 bảng cũ giữ nguyên từng byte: `tests/seed.test.ts` ghim md5 của chúng, và ghim móc biên lợi nhuận quý 3 cho ch12.
- Engine: chỉ từ khóa kỹ năng twist (`SKILL_SQL`), 5 giải thích lỗi mới, bỏ bảng `charges` khỏi `CHAPTER_TABLES`. Không route, không trường save, không `SAVE_VERSION` mới.
- Nội dung: 18 file `content/tickets/ch7..ch9/*.md`, `skills.yml` (+10 thẻ), `chapters.yml` (outcomes ch7–9), `people.yml` (bảng phụ trách), `kpis.yml` (+3 ô).

**Tech Stack:** như HEAD. **Không thêm dependency.**

**Spec / nguồn quyết định:** `docs/superpowers/specs/2026-11-16-cargo-query-design.md` §4–§6; `docs/team/curriculum.md` §3, §4 (ch7–9), §5, §7.1; `docs/team/problem-design.md` §1; `docs/team/amendments.md` D1–D6; `docs/team/decision-log.md` L22, L24, L25, L30, L31, L37, L40, L41 (dòng mới thắng); `docs/team/review-log.md` mục Plan 2 (bài học nội dung). Plan mẫu: `docs/superpowers/plans/2026-11-17-cargo-query-plan-2-ch4-6.md`. Quyết định mới: R1–R13 (dưới).

**Tiền đề:** Plan 1, 1d, 1b, 1c, Import, Deploy (phần local), Plan 2 đã xong. Plan viết và replay trên HEAD `fd96e31` (789 test xanh, `tsc` sạch); anchor kiểm lại trên HEAD mới nhất ở mục "Đã kiểm khi viết plan".

## Đã có trên HEAD (không làm lại)

| Curriculum / brief | Trạng thái HEAD |
|---|---|
| `chapters.yml` ch7–9: tiêu đề, `career`, `tier` (ch9 ★ Lead DA), `story` | Có. Plan này chỉ điền `outcomes`. |
| `CHAPTER_TABLES` 7–9 | Có (ch7 `rate_contracts, quotations`; ch8 năm bảng; ch9 `master_bills, house_bills`). Plan này bỏ `charges` (R2). |
| Người hỏi: pricing (Đặng Hà), sales (Hoàng Dũng, Lê Bình), AR (Phạm Tâm), AP (Hoàng Thảo), kế toán trưởng (Nguyễn Quang), chứng từ (Võ Lan), Giám đốc | Có trong `people.yml`. Không thêm người (R9). |
| Tab "Thứ tự thực thi" gặp WITH/UNION | Đã báo `steps.withUnion` ("xem tab EXPLAIN"); ch8–9 không cần thêm. |
| Luật phương pháp học từ ch4 trong `tests/content.test.ts` (worked, đúng một faded, reflect, `wrong:` có dòng và khác Solution mọi biến thể, bảng trong `wrong:`/Example đã mở, 3 biến thể mỗi kỹ năng) | Có (Plan 2 + `66f0ec7`); ch7–9 dùng nguyên. |

## Quyết định sản phẩm của plan này (R1–R13, để orchestrator ghi L-số)

| # | Quyết định | Lý do |
|---|---|---|
| R1 | **Một chunk lazy cho mọi ticket, tải ngay khi mở trang**, trước lần vẽ đầu (dải "Đang tải nội dung các ticket…"/"Loading the tickets…", lỗi thì "Tải lại trang"). Không tải theo chương. Nhóm ngân sách mới `tickets` = 70 KB (đo 64 KB sau ch7–9, luật L40). **Cần user xem:** tổng byte lúc mở trang không giảm. | Tiến độ, Hộp thư, lưới chương, XP, hàng ôn, `contentProblems` cần frontmatter mọi ticket. Đã thử chunk theo chương (glob không eager + `codeSplitting.groups`): Vite thêm một chunk 0,1 KB cho **mỗi file** (33 request, 51 sau Plan 3) và chia lại Mermaid, không lợi gì khi mọi chương đều tải lúc đầu. Tải theo nhu cầu cần tách frontmatter khỏi thân ticket: việc riêng. |
| R2 | **Bỏ bảng `charges`** (spec §4 còn 24 bảng). Doanh thu là `invoices.amount_vnd`, chi phí là `vendor_bills`. | Không ticket ch7–9 nào cần dòng phí riêng; bảng không ai dùng chỉ thêm việc seed và rối ERD. Đảo ngược: Plan 4 thêm `charges` ở chương cần nó. |
| R3 | **Bảng tối giản:** `exchange_rates(currency USD/EUR, rate_date, vnd_per_unit)`; `rate_contracts(id, pol, pod, container_type, valid_from, valid_to, buy_usd)` (không có hãng tàu); `quotations(id, quote_no, customer_id, sales_rep_id, pol, pod, container_type, quote_date, sell_usd, shipment_id NULL được)`; `invoices(id, invoice_no, shipment_id, customer_id, issue_date, due_date, amount_vnd)`; `payments(id, invoice_id, pay_date, amount_vnd)`; `vendor_bills(id, bill_no, shipment_id, bill_date, currency USD/EUR, amount)`; `master_bills(id, mbl_no, carrier_id, pol, pod, issue_date, gross_weight_kg)`; `house_bills(id, hbl_no, master_bill_id, shipment_id, issue_date, gross_weight_kg)`. | Đủ cho 18 Solution và móc ch12, không hơn. Một giá mua mỗi tuyến/loại container/ngày (không theo hãng) để "hợp đồng còn hiệu lực" luôn ra đúng một dòng. |
| R4 | **Cửa sổ thời gian:** hợp đồng 2026-04-01..12-31 theo quý (châu Âu tách 01–14/07 và từ 15/07, tăng 40 %); báo giá, hóa đơn, thanh toán, hóa đơn nhà cung cấp cho booking từ 2026-04-01; vận đơn cho lô xuất biển chạy từ 2026-05-01; tỷ giá 2026-03-02..10-30. | Bản từ 01/2026 làm seed +0,8 s; cắt từ quý 2 còn +0,5 s mà vẫn đủ mọi biến thể và so sánh quý 2 → quý 3 của ch12. |
| R5 | **Tiền:** hóa đơn bán và thanh toán bằng VND (số nguyên); hóa đơn nhà cung cấp USD (thêm EUR cho tuyến châu Âu); tỷ giá chỉ có ngày làm việc (bỏ thứ Bảy, Chủ nhật và 27/04, 30/04, 01/05, 01/09, 02/09/2026), không có dòng VND. Ticket nào làm tròn tiền đều nói làm tròn ở đâu (từng dòng hay chỉ số cuối). | Bẫy thật của kế toán (curriculum §4 ch8); tránh lỗi "không nói quy tắc làm tròn" của review Plan 2. |
| R6 | **Seed bắt đầu bằng `ANALYZE shipments, containers;`** và `ANALYZE` từng bảng mới trước khối dùng nó. | Bảng vừa seed không có thống kê, planner chọn nested loop: khối báo giá 10 s. `ANALYZE` không đổi dữ liệu (md5 giữ nguyên). |
| R7 | Kết quả không chứa chữ phụ thuộc ngôn ngữ: loại vận đơn ghi mã `MBL`/`HBL` (thuật ngữ nghề như FCL/LCL, được phép trong đề); nhóm tuổi nợ là 4 cột số. ch8-04 `ordered: false` (DISTINCT ON buộc ORDER BY theo mã hóa đơn, đề nói "không cần sắp xếp"). | Grader so chuỗi chính xác. |
| R8 | Lệch nhỏ so với curriculum §4: ch7-02 trả **số báo giá mỗi khách chủ lực** (danh sách từng báo giá là 208 dòng); ch7-03 hỏi **từng báo giá**; ch8-01 dạy CTE một bước (cộng thanh toán theo hóa đơn); ch8-04 dùng **một tuần** có ngày nghỉ làm biến thể (19–25/10, 31/08–06/09, 27/04–03/05); ch8-06 bước 1 là **một dòng tổng**; ch9-01 theo **tuần**; ch9-04 (twist) đối soát **từng lô** trong tháng (dòng lệch ở cả hai bên), bảng **theo tháng** dời sang cột mốc ch9-06 bước 3; ch9-05 do **Hoàng Khánh** gửi; ba cột mốc do Giám đốc gửi (L22, như Plan 2 Q10a). | Giữ "đề rõ, kết quả đọc được, FULL JOIN thật sự cần" và luật chỉ dùng kỹ năng đã dạy (ch7 không CTE). |
| R9 | Không thêm người. `people.yml` thêm bảng phụ trách cho Lê Bình, Đặng Hà, Nguyễn Quang, Phạm Tâm, Hoàng Thảo, Võ Lan. | Vai trò cần đã có. |
| R10 | 3 ô KPI mới: báo giá quý 3 dưới giá mua (ch7-04), khách có nợ quá hạn (ch8-03), lô giao tháng 10 chưa xuất hóa đơn (ch9-02), đều đếm dòng. Ô biên lợi nhuận quý 3 vẫn thuộc ch12-06; không ô nào lộ con số đó trước. | L18 ★5; giữ móc ch12. |
| R11 | **Engine chỉ thêm:** `SKILL_SQL` cho `correlated_value`, `distinct_on`, `full_join`; giải thích lỗi `21000`, `42P10`, lệch số cột/kiểu ở UNION/EXCEPT/INTERSECT, `IN` với truy vấn con nhiều cột. **Để sau** (curriculum §5.7 xếp Plan 3, không chặn ch7–9): lint SQL soi trước khi chạy, chế độ "Thẻ úp", tab Thứ tự thực thi cho WITH/UNION (đã có thông báo chuyển sang EXPLAIN). | Mã lỗi đo trên PGlite 0.5.16 thật; ba việc để sau là việc M–L, ch7–9 học được không cần chúng. |
| R12 | Luật dừng seed: `seed.sql` > 1,8 s (Node, máy dev; đo được 1,43–1,63 s tùy tải máy) hoặc nhóm `worker` > 150 KB thì dừng, cắt cửa sổ thời gian trước, không cắt móc. | Như Plan 2. |
| R13 | Icon kỹ năng (L42, `tests/icons.test.ts` đòi mỗi kỹ năng một icon riêng): `in_subquery` → `list`, `correlated_value` → `link`, `multi_cte` → `repeat`, `distinct_on` → `clockOff` (bảng cũ cho chúng trùng `nested`/`steps`/`distinct`). Các kỹ năng khác giữ icon đã định. | Dùng hình có sẵn để không vẽ SVG mới trong plan nội dung; agent UI có thể thay bằng icon riêng sau. |

## Kết quả spike seed (2026-11-17, Node 24 + PGlite 0.5.16, trước khi viết nội dung)

| Đo | HEAD `fd96e31` | Sau Plan 3 |
|---|---|---|
| Thời gian chạy `seed.sql` (Node) | 0,93–1,0 s | 1,43–1,63 s (**+0,5–0,6 s**; lúc máy bận lên 2,5 s) |
| Từng khối mới (ms) | — | `ANALYZE` 105, tỷ giá 2, hợp đồng 9, báo giá 88, hóa đơn 105, thanh toán 30, hóa đơn NCC 80, MBL 41, HBL 37 |
| Số dòng mới | — | tỷ giá 340 · hợp đồng 504 · báo giá 2.928 (900 không thành booking) · hóa đơn 5.161 · thanh toán 4.582 · hóa đơn NCC 6.658 · MBL 2.429 · HBL 2.498 |
| Nhóm `worker` | 136 / 160 KB | 140 / 160 KB |
| Nhóm `main` | 284 / 300 KB | 246 sau Task 1, 249 sau ch7–9 (replay trên `fd96e31`); **254 / 270 KB** khi replay trên `f2c4cbf` (L42 làm `main` lớn thêm) |
| Nhóm `tickets` (mới) | — | 37 KB (ch1–6) → 64–65 / 70 KB (ch1–9) |
| md5 13 bảng ch1–6 | ghim | giữ nguyên từng byte |
| Móc ch12 (biên lợi nhuận gộp theo vùng, booking quý 2 → quý 3/2026) | — | châu Âu 19,5 % → 7,0 %; châu Á 23,6 → 23,4; Bắc Mỹ 19,7 → 19,6; châu Đại Dương 22,7 → 22,4; Nam Á 20,0 → 21,4 |

Edge: Task 8 Step 4 đo lại thời gian khởi động; vượt 1,5 lần số trước Plan 3 thì ghi `decision-log.md` và báo, **không** cắt dữ liệu ticket đang dùng.

## Tên dùng từ HEAD (Task 0 kiểm bằng grep)

| File | Tên dùng trong plan này |
|---|---|
| `src/content.ts` | `loadTicketTemplates`, `loadTickets` (thay cả file) |
| `src/main.ts` | `import { loadTickets } from './content';`, `app.tickets = loadTickets();`, `byId`, `h`, `t` |
| `src/ui/modes.ts` | `const templates = new Map(loadTicketTemplates()…)` và 4 chỗ dùng `templates.` |
| `src/progress.ts` | `SKILL_SQL` (dòng `cast`), `CHAPTER_TABLES[8]` |
| `src/ui/sqlErrors.ts` | `BY_MESSAGE` (dòng `sqlerr.multi`), `BY_CODE` (dòng `22P02`) |
| `tests/seed.test.ts` | `hashOf`, `TABLES`, `PLAN2`, `one`, `db` |
| `tests/scene.test.ts` | bảng mong đợi kết thúc bằng dòng `ch6-05`/`ch6-06` |
| `scripts/check-budget.mjs` | `GROUPS` (dòng `main`) |

**Cách đọc các bước sửa code** (như Plan 2): **Tạo `path`:** ghi cả file. **Sửa `path`** — thay: khối thứ nhất phải xuất hiện **đúng một lần**; thay bằng khối sau "bằng:". **Thêm vào cuối `path`:** nối khối vào cuối file (dòng trống đầu khối là cố ý). Khối "thay" không khớp (HEAD đã đổi) thì áp ý của bước vào code trên đĩa (L7) và ghi chỗ lệch vào mô tả commit.

## Global Constraints

- Mọi ràng buộc của các plan trước vẫn áp dụng: PGlite **0.5.16** pin; không `innerHTML`; mọi chữ UI qua `t()`, khóa mới thêm vào **cả** `vi.ts` và `en.ts` trong cùng task; không dùng chữ "boss" trên UI hay trong chữ ticket (L22, `tests/i18n.test.ts`); đề không ghi tên bậc nghề. Mọi bước "xác nhận PASS" chạy thêm `npx tsc --noEmit`.
- **Luật render:** `main.ts` chỉ chờ nội dung **trước** lần vẽ đầu; không chỗ nào tạo lại editor vì nội dung.
- **Seed:** chỉ thêm vào **cuối** `schema.sql` và `seed.sql`; mỗi khối có `setseed()` riêng; không `ALTER` bảng cũ; không ngày thực tế nào sau 2026-10-31. Sau mỗi task chạy lại **mọi** Solution (`npm test`).
- **Đề bài** (problem-design §1): thân đề, `## Task`, đề bước không có tên bảng/cột, từ khóa SQL viết hoa, mã trạng thái, backtick; EN không dấu tiếng Việt, không tên người; code span VI = EN; ngày cố định; ticket `ordered` nêu đủ quy tắc phá hòa bằng lời; tiền nói rõ đơn vị (VND, USD mỗi container) và cách làm tròn.
- **Solution chỉ dùng kỹ năng đã dạy:** ch7 không CTE; ch7–9 không hàm cửa sổ.
- `src/ui/*`, `src/main.ts` không có unit test mới (Vitest chạy Node). Kiểm tay theo checklist Task 8 trên **Edge, cổng khác 5173**.
- Mỗi task một commit (bước cuối của task). Chỉ `git add` đúng các file của task.

## File Structure

```
src/ticketSources.ts          glob eager mọi ticket, chỉ import() động                       (tạo)
src/content.ts                loadContent() + loader đồng bộ ném lỗi khi chưa tải              (thay cả file)
src/main.ts                   chờ loadContent() trước lần vẽ đầu, dải đang tải/lỗi            (sửa)
src/ui/modes.ts               map ticket dựng lúc dùng lần đầu                               (sửa)
tests/setup.ts, vite.config.ts  setupFiles cho Vitest                                       (tạo, sửa)
scripts/check-budget.mjs      main 300 → 270, nhóm tickets 70                                 (sửa)
src/db/schema.sql, seed.sql   + 8 bảng, + khối Plan 3 (móc ở đầu khối)                         (sửa, thêm cuối)
src/progress.ts               + SKILL_SQL correlated_value/distinct_on/full_join; bỏ charges   (sửa)
src/ui/sqlErrors.ts           + 21000, 42P10, setColumns, setTypes, subqueryColumns           (sửa)
src/i18n/vi.ts, en.ts         + content.loading/failed, 5 sqlerr                              (sửa)
content/skills.yml            + 10 thẻ kỹ năng ch7–9                                          (sửa, thêm cuối)
content/chapters.yml, people.yml, kpis.yml                                                    (sửa)
content/tickets/ch7..ch9/*.md 18 ticket                                                       (tạo)
tests/seed.test.ts, progress.test.ts, sqlErrors.test.ts, scene.test.ts                        (sửa)
CLAUDE.md                                                                                     (sửa)
```

## Số dòng kết quả mong đợi (đã chạy, biến thể 0 | 1 | 2; trong ngoặc: câu `wrong:`)

| Ticket | Dạng | Dạy | Dòng |
|---|---|---|---|
| ch7-01 | teach · worked | `scalar_subquery` | 51 (51) \| 56 (54) \| 52 (56); ví dụ mẫu 4 |
| ch7-02 | develop · faded | `in_subquery` | 7 (29) \| 7 (29) \| 7 (29) |
| ch7-03 | develop · open | `exists` | 119 (394) \| 100 (378) \| 61 (128) |
| ch7-04 | twist | `correlated_value` | 196 (280) \| 19 (326) \| 63 (72) |
| ch7-05 | rest | — | 5 |
| ch7-06 | cột mốc | — | 9 / 12 / 84 |
| ch8-01 | teach · worked | `cte` | 173 (176) \| 175 (177) \| 175 (176); ví dụ mẫu 384 |
| ch8-02 | develop · faded | `multi_cte` | 56 (62) \| 53 (64) \| 58 (70) |
| ch8-03 | develop · open | (ôn `cte`, `conditional_agg`) | 160 (160, có ô trống thay vì 0) |
| ch8-04 | twist | `distinct_on` | 259 (174, 259) \| 234 (98, 234) \| 156 (44, 156) |
| ch8-05 | rest | — | 12 |
| ch8-06 | cột mốc | — | 1 / 54 / 14 |
| ch9-01 | teach · worked | `union` | 189 (2529) \| 202 (2531) \| 195 (2523); ví dụ mẫu 16 |
| ch9-02 | develop · faded | `except` | 24 (824) \| 20 (783) \| 35 (827) |
| ch9-03 | develop · open | (ôn `cte`) | 41 (81) |
| ch9-04 | twist | `full_join` | 30 (12) \| 36 (16) \| 33 (13) |
| ch9-05 | rest | — | 29 |
| ch9-06 | cột mốc | — | 24 / 6 / 5 |

Đáp án đúng viết kiểu khác cũng qua grader (đã chạy `compareResults`, 16 câu): trung bình bằng `AVG` trên bảng con gom theo khách (ch7-01); `EXISTS … HAVING` thay `IN` (ch7-02); nối trái có điều kiện ngày trong `ON` + `IS NULL`, và so với ngày booking cuối cùng (ch7-03); `JOIN` hợp đồng theo khoảng hiệu lực thay truy vấn con (ch7-04); hai bảng con gom sẵn thay CTE (ch8-01); `COALESCE(SUM(…) FILTER …, 0)` (ch8-03); `LATERAL … ORDER BY … LIMIT 1` thay `DISTINCT ON` (ch8-04); nối thẳng `shipments` (ch8-05); `UNION` thay `UNION ALL` (ch9-01); `NOT EXISTS` và `LEFT JOIN … IS NULL` thay `EXCEPT` (ch9-02); `GROUP BY … HAVING` không CTE (ch9-03); hai vế một chiều nối bằng `UNION ALL` thay `FULL JOIN` (ch9-04); nối kiểu dấu phẩy + `atd + 2` (ch9-05).

---

### Task 0: Kiểm tiền đề (không sửa file)

- [ ] **Step 1: Test và kiểu đang sạch**

Run: `npm test && npx tsc --noEmit`
Expected: mọi test PASS, `tsc` không lỗi.

- [ ] **Step 2: Grep các điểm neo**

Run:
```bash
for p in "import { loadTickets } from './content';" "app.tickets = loadTickets();" "const templates = new Map(loadTicketTemplates()" "templates.has(i.ticketId)" "  cast: /::" "  8: ['charges', 'invoices'" "'22P02': 'sqlerr.22P02'," "[/^cannot insert multiple commands/, 'sqlerr.multi']," "  'db.loading': " "['main', /^index-.*\\.js\$/, 300]" "const PLAN2 = " "'ch6-05': { kind: 'ship' }, 'ch6-06': { kind: 'promotion' }," "reserved for Plan 3" "test: { testTimeout: 60_000, hookTimeout: 60_000 }"; do printf '%-60s' "$p"; grep -rlF -- "$p" src tests scripts vite.config.ts | wc -l; done
grep -c "outcomes: \[\]" content/chapters.yml
ls content/tickets
```
Expected: mỗi mẫu có trong ít nhất một file (cột cuối ≥ 1); `chapters.yml` có 6 dòng `outcomes: []` (ch7–12); `content/tickets` có `ch1` … `ch6`.

---

### Task 1: Nội dung ticket ra khỏi bundle chính (chunk lazy, L41)

**Files:**
- Modify: `src/content.ts`, `src/main.ts`, `src/ui/modes.ts`, `vite.config.ts`, `src/i18n/vi.ts`, `src/i18n/en.ts`, `scripts/check-budget.mjs`
- Create: `src/ticketSources.ts`, `tests/setup.ts`

**Interfaces:**
- Produces: `loadContent(): Promise<void>` (tải nội dung ticket một lần, gọi lại an toàn, lỗi thì lần sau thử lại); `loadTicketTemplates()`/`loadTickets()` giữ chữ ký đồng bộ nhưng ném lỗi nếu gọi trước khi `loadContent()` xong. Khóa i18n `content.loading`, `content.failed`. Nhóm ngân sách `tickets` (`ticketSources-*.js`).
- Không đổi: luật render (editor không bị tạo lại; `main.ts` chỉ chờ nội dung trước lần vẽ đầu tiên), mọi chỗ gọi `loadTickets()`/`loadTicketTemplates()` trong `src/` và `tests/`.

Cách làm (R1): toàn bộ markdown ticket vào **một** chunk lazy (`src/ticketSources.ts`, glob eager nhưng chỉ được `import()` động từ `content.ts`), tải ngay khi mở trang. Tiến độ, Hộp thư, lưới chương Trang chủ, XP, hàng ôn và `contentProblems` đều cần frontmatter của mọi ticket, nên chương nào cũng phải có trước lần vẽ đầu. Đã thử một chunk mỗi chương (glob không eager + `codeSplitting.groups` của Rolldown): Vite tạo thêm một chunk "mặt tiền" 0,1 KB cho **mỗi file** (33 request, sau Plan 3 là 51) và chia lại chunk của Mermaid; vì mọi chương đều tải lúc mở trang, tách theo chương không lợi gì. `main` về dưới 270 KB và không lớn thêm theo chương; **tổng byte lúc mở trang không giảm** (chunk ticket tải sau `main`).

- [ ] **Step 1: Đo trước khi sửa**

Run: `npm run build && node scripts/check-budget.mjs`
Expected: `ok main 284 KB gz / 300 KB` (HEAD `fd96e31`). Ghi số này vào mô tả commit.

- [ ] **Step 2: Nạp nội dung bất đồng bộ**

**Tạo `src/ticketSources.ts`:**
```ts
// Every ticket file as raw markdown. Only src/content.ts imports this, and only with import(), so it is its own lazy chunk.
export const sources = import.meta.glob<string>('../content/tickets/**/*.md', { query: '?raw', import: 'default', eager: true });
```

**Tạo `src/content.ts`:**
```ts
import { byOrder, parseTicket, type Ticket } from './tickets';
import { applyVariant } from './variants';

let templates: Ticket[] | undefined;
let loading: Promise<void> | undefined;

/**
 * Ticket markdown is a lazy chunk (Plan 3, L41: src/ticketSources.ts), so new chapters never grow the main bundle.
 * Everything is fetched at once: progression, the inbox, Home and the review queue need every ticket.
 * main.ts and tests/setup.ts await this before anything reads tickets. A failed load can be retried.
 */
export function loadContent(): Promise<void> {
  return (loading ??= import('./ticketSources')
    .then(({ sources }) => {
      templates = Object.entries(sources).map(([path, source]) => parseTicket(source, path)).sort(byOrder);
    })
    .catch((e: unknown) => {
      loading = undefined;
      throw e;
    }));
}

/** Raw tickets with their {{x}} templates, parsed once and shared (Practice and the review queue read these). Do not mutate. */
export function loadTicketTemplates(): Ticket[] {
  if (!templates) throw new Error('loadContent() has not finished');
  return templates;
}

/** Story mode always plays variants[0]. */
export function loadTickets(): Ticket[] {
  return loadTicketTemplates().map((t) => applyVariant(t, 0));
}
```

**Tạo `tests/setup.ts`:**
```ts
// Ticket content is lazy in the app (src/content.ts); tests read it synchronously, so load it once per test file.
import { loadContent } from '../src/content';

await loadContent();
```

**Sửa `vite.config.ts`** — thay:
```ts
  test: { testTimeout: 60_000, hookTimeout: 60_000 },
```
bằng:
```ts
  test: { testTimeout: 60_000, hookTimeout: 60_000, setupFiles: ['tests/setup.ts'] },
```

- [ ] **Step 3: `main.ts` chờ nội dung trước lần vẽ đầu, có trạng thái đang tải (VI + EN)**

**Sửa `src/main.ts`** — thay:
```ts
import { loadTickets } from './content';
```
bằng:
```ts
import { loadContent, loadTickets } from './content';
```

**Sửa `src/main.ts`** — thay:
```ts
app.tickets = loadTickets();
```
bằng:
```ts
// Ticket text is a lazy chunk (src/content.ts): say so while it loads, and offer a reload if it fails.
// Nothing else is drawn yet, so the banner is set by hand; renderNotice() owns it from the first rerender on.
const loadingNotice = byId('notice');
loadingNotice.hidden = false;
loadingNotice.replaceChildren(h('span', {}, t('content.loading')));
try {
  await loadContent();
} catch (e) {
  loadingNotice.replaceChildren(h('span', {}, t('content.failed')), h('button', { type: 'button', onclick: () => location.reload() }, t('app.reload')));
  throw e;
}
loadingNotice.hidden = true;

app.tickets = loadTickets();
```

`t()` đọc ngôn ngữ từ `cargo-query/prefs` ngay lần gọi đầu (`getLang()` trong `src/i18n/index.ts`), nên câu đang tải đúng ngôn ngữ người chơi đã chọn. `DbClient` được tạo sau đoạn này như trước, nên worker bắt đầu nạp DB sau khi chunk ticket về (chunk nhỏ, tải từ cùng origin); Task 8 Step 4 đo lại thời gian khởi động trên Edge.

**Sửa `src/ui/modes.ts`** — thay:
```ts
const templates = new Map(loadTicketTemplates().map((tk) => [tk.id, tk]));
```
bằng:
```ts
let templateMap: Map<string, Ticket> | undefined;
/** Built on first use: ticket content arrives after this module loads (main.ts awaits loadContent()). */
const templates = (): Map<string, Ticket> => (templateMap ??= new Map(loadTicketTemplates().map((tk) => [tk.id, tk])));
```

**Sửa `src/ui/modes.ts`** — thay:
```ts
templates.has(i.ticketId)
```
bằng:
```ts
templates().has(i.ticketId)
```

**Sửa `src/ui/modes.ts`** — thay:
```ts
applyVariant(templates.get(i.ticketId)!, i.variant)
```
bằng:
```ts
applyVariant(templates().get(i.ticketId)!, i.variant)
```

**Sửa `src/ui/modes.ts`** — thay:
```ts
[...templates.values()]
```
bằng:
```ts
[...templates().values()]
```

**Sửa `src/ui/modes.ts`** — thay:
```ts
const tpl = templates.get(ticketId);
```
bằng:
```ts
const tpl = templates().get(ticketId);
```

**Sửa `src/i18n/vi.ts`** — thay:
```ts
  'db.loading': 'Đang khởi tạo database…',
```
bằng:
```ts
  'db.loading': 'Đang khởi tạo database…',
  'content.loading': 'Đang tải nội dung các ticket…',
  'content.failed': 'Không tải được nội dung ticket. Kiểm tra kết nối mạng rồi tải lại trang.',
```

**Sửa `src/i18n/en.ts`** — thay:
```ts
  'db.loading': 'Starting the database…',
```
bằng:
```ts
  'db.loading': 'Starting the database…',
  'content.loading': 'Loading the tickets…',
  'content.failed': 'Could not load the tickets. Check your connection, then reload the page.',
```

- [ ] **Step 4: Ngân sách `main` về 270 KB, nhóm `tickets` riêng**

**Sửa `scripts/check-budget.mjs`** — thay:
```js
  ['main', /^index-.*\.js$/, 300], // Plan 2: 282 KB after ch4–6 tickets + learning-method engine (Q2, cần user xem cùng P-D3)
```
bằng:
```js
  ['main', /^index-.*\.js$/, 270], // Plan 3 Task 1: ticket markdown moved to a lazy chunk (L41); was 300 after Plan 2
  ['tickets', /^ticketSources-/, 70], // all ticket markdown, one lazy chunk fetched at boot (src/content.ts): 37 KB after ch1–6, 64 KB after ch7–9
```

- [ ] **Step 5: Đo sau khi sửa, chạy toàn bộ rồi commit**

Run:
```bash
npx tsc --noEmit && npm test && npm run build && node scripts/check-budget.mjs && grep -c ticketSources dist/index.html
```
Expected: mọi test PASS; `ok main ≈ 246–251 KB gz / 270 KB`; `ok tickets ≈ 37 KB gz / 70 KB`; `rest` tăng ≈ 7 KB (Rolldown tách `preload-helper` và vài chunk nhỏ của Mermaid khi `main` có thêm một import động: không ảnh hưởng tải trang). `grep` in `0`: `index.html` không preload chunk ticket (chunk được tải bằng `import()` lúc chạy, ngay sau `main`).

```bash
git add src/content.ts src/ticketSources.ts src/main.ts src/ui/modes.ts vite.config.ts src/i18n/vi.ts src/i18n/en.ts scripts/check-budget.mjs tests/setup.ts
git commit -m "perf: ticket markdown in one lazy chunk loaded before the first render; main budget back to 270 KB (L41)"
```

---

### Task 2: Seed chương 7–9 (spike trước, đo rồi mới viết nội dung)

**Files:**
- Modify: `src/db/schema.sql`, `src/db/seed.sql`, `tests/seed.test.ts`

**Interfaces:**
- Produces: 8 bảng `exchange_rates`, `rate_contracts`, `quotations`, `invoices`, `payments`, `vendor_bills`, `master_bills`, `house_bills` (cột ở R3) và các móc ghi ở đầu khối Plan 3 trong `seed.sql`, gồm móc biên lợi nhuận quý 3 cho ch12 (test ghim).

- [ ] **Step 1: Viết test seed (móc, md5 13 bảng cũ, móc ch12)**

**Sửa `tests/seed.test.ts`** — thay:
```ts
const hashOf = (t: string) => `SELECT md5(string_agg(x::text, '|' ORDER BY x::text)) AS h FROM ${t} x`;
```
bằng:
```ts
/** Plan 3 (chapters 7–9), appended after PLAN2. */
const PLAN3 = ['exchange_rates', 'rate_contracts', 'quotations', 'invoices', 'payments', 'vendor_bills', 'master_bills', 'house_bills'];
const hashOf = (t: string) => `SELECT md5(string_agg(x::text, '|' ORDER BY x::text)) AS h FROM ${t} x`;
```

**Sửa `tests/seed.test.ts`** — thay:
```ts
    for (const t of [...TABLES, ...PLAN2]) {
      const ha = (await a.query<{ h: string }>(hashOf(t))).rows[0].h;
```
bằng:
```ts
    for (const t of [...TABLES, ...PLAN2, ...PLAN3]) {
      const ha = (await a.query<{ h: string }>(hashOf(t))).rows[0].h;
```

**Sửa `tests/seed.test.ts`** — thay:
```ts
  // Appending blocks must never re-roll older tables: these hashes were taken before Plan 2 (HEAD 646d9e0) and after it.
```
bằng:
```ts
  // Appending blocks must never re-roll older tables: ch1–3 hashes taken before Plan 2 (HEAD 646d9e0), Plan 2 hashes before Plan 3 (HEAD fd96e31).
```

**Sửa `tests/seed.test.ts`** — thay:
```ts
      containers: 'd8edef4637ee3684f04f1112b74fb304',
    };
    for (const t of TABLES) expect((await one<{ h: string }>(hashOf(t))).h, t).toBe(before[t]);
```
bằng:
```ts
      containers: 'd8edef4637ee3684f04f1112b74fb304',
      shipment_events: '84ebea93ebceb917a385efe57a09cab0',
      trucking_orders: '6097a8edda39c70b4f63e7f2bc9d7d03',
      cfs_receipts: '115cc55bc341566156f3ab839427a523',
      hs_codes: '893dcf20280cd8edac2936ef47d05d56',
      duties_taxes: '822e41e4aa914801d2872e4bb98f7ef5',
      customs_declarations: 'a3efef8f8caa18df6203dc5a7f21812c',
      incoterms: 'f25ab8a8b131594e64bbb55b131e0134',
    };
    for (const t of [...TABLES, ...PLAN2]) expect((await one<{ h: string }>(hashOf(t))).h, t).toBe(before[t]);
```

**Sửa `tests/seed.test.ts`** — thay:
```ts
  it('móc câu chuyện: khách 171-190 ngừng book từ 2026-03-01', async () => {
```
bằng:
```ts
  it('Plan 3: không có ngày sau 2026-10-31; tỷ giá chỉ có vào ngày làm việc', async () => {
    const later = await one<{ n: number }>(`SELECT
      (SELECT count(*) FROM exchange_rates WHERE rate_date > '2026-10-31') + (SELECT count(*) FROM quotations WHERE quote_date > '2026-10-31')
      + (SELECT count(*) FROM invoices WHERE issue_date > '2026-10-31') + (SELECT count(*) FROM payments WHERE pay_date > '2026-10-31')
      + (SELECT count(*) FROM vendor_bills WHERE bill_date > '2026-10-31') + (SELECT count(*) FROM master_bills WHERE issue_date > '2026-10-31')
      + (SELECT count(*) FROM house_bills WHERE issue_date > '2026-10-31') AS n`);
    expect(later.n).toBe(0);
    expect((await one<{ n: number }>(`SELECT count(*) AS n FROM exchange_rates
      WHERE extract(isodow FROM rate_date) > 5 OR rate_date IN ('2026-04-27', '2026-04-30', '2026-05-01', '2026-09-01', '2026-09-02')`)).n).toBe(0);
    // ch8-04: every bill has a rate on or before its date
    expect((await one<{ n: number }>(`SELECT count(*) AS n FROM vendor_bills b
      WHERE NOT EXISTS (SELECT 1 FROM exchange_rates r WHERE r.currency = b.currency AND r.rate_date <= b.bill_date)`)).n).toBe(0);
  });

  it('móc Plan 3: đúng một hợp đồng cước hiệu lực cho mỗi báo giá; tuyến châu Âu tăng giá từ 15/07/2026 (ch7-04, ch7-06)', async () => {
    expect((await one<{ n: number }>(`SELECT count(*) AS n FROM quotations q
      WHERE (SELECT count(*) FROM rate_contracts r WHERE r.pol = q.pol AND r.pod = q.pod AND r.container_type = q.container_type
             AND q.quote_date BETWEEN r.valid_from AND r.valid_to) <> 1`)).n).toBe(0);
    const below = await one<{ q2: number; q3eu: number; q3other: number; oct: number }>(`SELECT
      count(*) FILTER (WHERE q.quote_date < '2026-07-01') AS q2,
      count(*) FILTER (WHERE q.quote_date >= '2026-07-01' AND q.quote_date < '2026-10-01' AND q.pod IN ('NLRTM', 'DEHAM', 'BEANR')) AS q3eu,
      count(*) FILTER (WHERE q.quote_date >= '2026-07-01' AND q.quote_date < '2026-10-01' AND q.pod NOT IN ('NLRTM', 'DEHAM', 'BEANR')) AS q3other,
      count(*) FILTER (WHERE q.quote_date >= '2026-10-01') AS oct
      FROM quotations q JOIN rate_contracts r ON r.pol = q.pol AND r.pod = q.pod AND r.container_type = q.container_type
        AND q.quote_date BETWEEN r.valid_from AND r.valid_to
      WHERE q.sell_usd < r.buy_usd`);
    expect(below.q3eu).toBeGreaterThan(100);
    expect(below.q3other).toBeGreaterThan(0);
    expect(below.q3other).toBeLessThan(below.q3eu / 5);
    expect(below.q2).toBeGreaterThan(0);
    expect(below.oct).toBeGreaterThan(0);
  });

  it('móc Plan 3: báo giá không thành booking, cả cho khách 171-190 đã ngừng gửi hàng (ch7-03)', async () => {
    const r = await one<{ lost: number; churned: number }>(`SELECT count(*) AS lost,
      count(*) FILTER (WHERE customer_id BETWEEN 171 AND 190 AND quote_date >= '2026-07-01' AND quote_date < '2026-10-01') AS churned
      FROM quotations WHERE shipment_id IS NULL`);
    expect(r.lost).toBe(900);
    expect(r.churned).toBeGreaterThan(10);
  });

  it('móc Plan 3: hóa đơn trả nhiều lần, nợ quá hạn ở đủ 4 nhóm tuổi nợ (ch8-01, ch8-03)', async () => {
    expect((await one<{ n: number }>(`SELECT count(*) AS n FROM (SELECT invoice_id FROM payments GROUP BY invoice_id HAVING count(*) >= 2) x`)).n)
      .toBeGreaterThan(100);
    const r = await db().then((d) => d.query<{ b: number }>(`WITH paid AS (SELECT invoice_id, SUM(amount_vnd) AS paid FROM payments GROUP BY invoice_id)
      SELECT DISTINCT CASE WHEN DATE '2026-10-31' - i.due_date <= 30 THEN 1 WHEN DATE '2026-10-31' - i.due_date <= 60 THEN 2
                           WHEN DATE '2026-10-31' - i.due_date <= 90 THEN 3 ELSE 4 END AS b
      FROM invoices i LEFT JOIN paid p ON p.invoice_id = i.id
      WHERE i.due_date < '2026-10-31' AND i.amount_vnd - COALESCE(p.paid, 0) > 0 ORDER BY 1`));
    expect(r.rows.map((x) => x.b)).toEqual([1, 2, 3, 4]);
    expect((await one<{ n: number }>(`SELECT count(*) AS n FROM invoices i
      JOIN (SELECT invoice_id, SUM(amount_vnd) AS paid FROM payments GROUP BY invoice_id) p ON p.invoice_id = i.id WHERE p.paid > i.amount_vnd`)).n).toBe(0);
  });

  it('móc Plan 3: hóa đơn nhà cung cấp vào ngày nghỉ ở mọi tuần của ch8-04; lô hủy vẫn có hóa đơn (ch8-05)', async () => {
    const r = await db().then((d) => d.query<{ w: string; n: number }>(`SELECT w, count(*) AS n FROM vendor_bills b,
      LATERAL (SELECT CASE WHEN b.bill_date BETWEEN '2026-10-19' AND '2026-10-25' THEN 'oct' WHEN b.bill_date BETWEEN '2026-08-31' AND '2026-09-06' THEN 'sep'
                           WHEN b.bill_date BETWEEN '2026-04-27' AND '2026-05-03' THEN 'apr' END AS w) x
      WHERE w IS NOT NULL AND NOT EXISTS (SELECT 1 FROM exchange_rates r WHERE r.currency = b.currency AND r.rate_date = b.bill_date)
      GROUP BY w ORDER BY w`));
    expect(r.rows.map((x) => x.w)).toEqual(['apr', 'oct', 'sep']);
    for (const x of r.rows) expect(x.n).toBeGreaterThan(20);
    expect((await one<{ n: number }>(`SELECT count(*) AS n FROM vendor_bills b JOIN shipments s ON s.id = b.shipment_id
      WHERE s.status = 'CANCELLED' AND b.bill_date >= '2026-10-01'`)).n).toBeGreaterThan(3);
  });

  it('móc Plan 3: lô đã giao chưa xuất hóa đơn, vận đơn chủ lệch trọng lượng, HBL phát hành muộn (ch9)', async () => {
    const months = await db().then((d) => d.query<{ m: string; n: number }>(`SELECT to_char(e.event_date, 'MM') AS m, count(*) AS n
      FROM shipment_events e LEFT JOIN invoices i ON i.shipment_id = e.shipment_id
      WHERE e.event = 'DELIVERED' AND e.event_date >= '2026-08-01' AND i.id IS NULL GROUP BY 1 ORDER BY 1`));
    expect(months.rows.map((x) => x.m)).toEqual(['08', '09', '10']);
    for (const x of months.rows) expect(x.n).toBeGreaterThan(10);
    expect((await one<{ n: number }>(`SELECT count(*) AS n FROM master_bills m
      JOIN (SELECT master_bill_id, SUM(gross_weight_kg) AS kg FROM house_bills GROUP BY master_bill_id) h ON h.master_bill_id = m.id
      WHERE m.issue_date >= '2026-07-01' AND m.issue_date < '2026-10-01' AND abs(h.kg - m.gross_weight_kg) > m.gross_weight_kg * 0.01`)).n)
      .toBeGreaterThan(20);
    // ch9-04: in every variant month, rows that exist only in the booking book and only in the documents book
    for (const [from, to] of [['2026-10-01', '2026-11-01'], ['2026-08-01', '2026-09-01'], ['2026-06-01', '2026-07-01']]) {
      const r = await one<{ booked: number; issued: number }>(`SELECT
        (SELECT count(*) FROM shipments s WHERE s.direction = 'EXPORT' AND s.mode = 'SEA' AND s.atd >= '${from}' AND s.atd < '${to}'
           AND NOT EXISTS (SELECT 1 FROM house_bills h WHERE h.shipment_id = s.id AND h.issue_date >= '${from}' AND h.issue_date < '${to}')) AS booked,
        (SELECT count(*) FROM house_bills h JOIN shipments s ON s.id = h.shipment_id
          WHERE h.issue_date >= '${from}' AND h.issue_date < '${to}' AND NOT (s.atd >= '${from}' AND s.atd < '${to}')) AS issued`);
      expect(r.booked, from).toBeGreaterThan(5);
      expect(r.issued, from).toBeGreaterThan(5);
    }
  });

  // The Q3 margin story pays off in ch12 (curriculum §4 ch12): Plan 4 appends to these tables but must not break this.
  it('móc ch12: biên lợi nhuận gộp tuyến châu Âu giảm mạnh nhất từ quý 2 sang quý 3/2026', async () => {
    const r = await db().then((d) => d.query<{ region: string; q2: number; q3: number }>(`WITH rate AS (
        SELECT DISTINCT ON (b.id) b.shipment_id, b.amount * r.vnd_per_unit AS vnd FROM vendor_bills b
        JOIN exchange_rates r ON r.currency = b.currency AND r.rate_date <= b.bill_date ORDER BY b.id, r.rate_date DESC
      ), cost AS (SELECT shipment_id, SUM(vnd) AS cost FROM rate GROUP BY shipment_id),
      rev AS (SELECT shipment_id, SUM(amount_vnd) AS rev FROM invoices GROUP BY shipment_id),
      m AS (SELECT p.region, date_trunc('quarter', s.booking_date) AS q, 100 * (SUM(rev.rev) - SUM(cost.cost)) / SUM(rev.rev) AS margin
        FROM shipments s JOIN rev ON rev.shipment_id = s.id JOIN cost ON cost.shipment_id = s.id
        JOIN ports p ON p.code = CASE WHEN s.direction = 'EXPORT' THEN s.pod ELSE s.pol END
        WHERE s.booking_date >= '2026-04-01' AND s.booking_date < '2026-10-01' GROUP BY 1, 2)
      SELECT region, max(margin) FILTER (WHERE q = '2026-04-01') AS q2, max(margin) FILTER (WHERE q = '2026-07-01') AS q3 FROM m GROUP BY region`));
    const drop = Object.fromEntries(r.rows.map((x) => [x.region, Number(x.q2) - Number(x.q3)]));
    expect(drop.Europe).toBeGreaterThan(8);
    for (const [region, d] of Object.entries(drop)) if (region !== 'Europe') expect(d, region).toBeLessThan(3);
  });

  it('móc câu chuyện: khách 171-190 ngừng book từ 2026-03-01', async () => {
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/seed.test.ts`
Expected: FAIL ở các test Plan 3 với `relation "exchange_rates" does not exist` (và các bảng mới khác). Test md5 13 bảng cũ PASS ngay.

- [ ] **Step 3: Thêm bảng vào cuối `schema.sql`**

**Thêm vào cuối `src/db/schema.sql`:**
```sql

-- Plan 3 (chapters 7-9): pricing, receivables/payables, bills of lading. Seed blocks for them are appended at the end of seed.sql.
CREATE TABLE exchange_rates (
  currency text NOT NULL CHECK (currency IN ('USD', 'EUR')),
  rate_date date NOT NULL,
  vnd_per_unit numeric(10, 2) NOT NULL,
  PRIMARY KEY (currency, rate_date)
);

CREATE TABLE rate_contracts (
  id int PRIMARY KEY,
  pol text NOT NULL REFERENCES ports(code),
  pod text NOT NULL REFERENCES ports(code),
  container_type text NOT NULL CHECK (container_type IN ('20GP', '40GP', '40HC', '40RF')),
  valid_from date NOT NULL,
  valid_to date NOT NULL,
  buy_usd numeric(10, 2) NOT NULL
);

CREATE TABLE quotations (
  id int PRIMARY KEY,
  quote_no text NOT NULL UNIQUE,
  customer_id int NOT NULL REFERENCES customers(id),
  sales_rep_id int NOT NULL REFERENCES employees(id),
  pol text NOT NULL REFERENCES ports(code),
  pod text NOT NULL REFERENCES ports(code),
  container_type text NOT NULL CHECK (container_type IN ('20GP', '40GP', '40HC', '40RF')),
  quote_date date NOT NULL,
  sell_usd numeric(10, 2) NOT NULL,
  shipment_id int REFERENCES shipments(id)
);

CREATE TABLE invoices (
  id int PRIMARY KEY,
  invoice_no text NOT NULL UNIQUE,
  shipment_id int NOT NULL REFERENCES shipments(id),
  customer_id int NOT NULL REFERENCES customers(id),
  issue_date date NOT NULL,
  due_date date NOT NULL,
  amount_vnd numeric(14, 0) NOT NULL
);

CREATE TABLE payments (
  id int PRIMARY KEY,
  invoice_id int NOT NULL REFERENCES invoices(id),
  pay_date date NOT NULL,
  amount_vnd numeric(14, 0) NOT NULL
);

CREATE TABLE vendor_bills (
  id int PRIMARY KEY,
  bill_no text NOT NULL UNIQUE,
  shipment_id int NOT NULL REFERENCES shipments(id),
  bill_date date NOT NULL,
  currency text NOT NULL CHECK (currency IN ('USD', 'EUR')),
  amount numeric(12, 2) NOT NULL
);

CREATE TABLE master_bills (
  id int PRIMARY KEY,
  mbl_no text NOT NULL UNIQUE,
  carrier_id int NOT NULL REFERENCES carriers(id),
  pol text NOT NULL REFERENCES ports(code),
  pod text NOT NULL REFERENCES ports(code),
  issue_date date NOT NULL,
  gross_weight_kg numeric(12, 2) NOT NULL
);

CREATE TABLE house_bills (
  id int PRIMARY KEY,
  hbl_no text NOT NULL UNIQUE,
  master_bill_id int NOT NULL REFERENCES master_bills(id),
  shipment_id int NOT NULL UNIQUE REFERENCES shipments(id),
  issue_date date NOT NULL,
  gross_weight_kg numeric(10, 2) NOT NULL
);
```

- [ ] **Step 4: Thêm khối seed**

**Sửa `src/db/seed.sql`** — thay:
```sql
--   * reserved for Plan 3: Europe lane (NLRTM/DEHAM/BEANR) margin drop in Q3 2026,
--     customer 1 D&D spike, carrier 3 (Blue Anchor Lines) high claim rate
```
bằng:
```sql
--   * chapters 7-9 (Plan 3), incl. the Europe lane (NLRTM/DEHAM/BEANR) margin drop in Q3 2026: head of the Plan 3 block at the end
--   * reserved for Plan 4: customer 1 D&D spike, carrier 3 (Blue Anchor Lines) high claim rate
```

**Thêm vào cuối `src/db/seed.sql`:**
```sql

-- ===== Plan 3 (chapters 7-9). Story hooks (tickets and tests/seed.test.ts depend on them):
--   * exchange_rates (VND per USD/EUR) only on working days 2026-03-02..2026-10-30: no weekends, no public holidays (ch8-04)
--   * rate_contracts: one buy rate per lane (VN port -> overseas sea port), container type and day from 2026-04-01 to 2026-12-31, no gaps or overlaps;
--     Europe lanes (NLRTM/DEHAM/BEANR) +40% from 2026-07-15 (general rate increase) and stay high in Q4 (ch7-04, ch12)
--   * quotations from 2026-04-01: one per FCL sea export booked from 2026-04-06 (shipment_id set) plus 900 that never
--     became a booking (shipment_id NULL, a quarter of them for the churned customers 171-190) (ch7-02, ch7-03)
--   * quotes keep pricing Europe from the pre-increase rate, so many Europe quotes from 2026-07-15 sell below the buy rate;
--     about 1.5% of all other quotes are discounted below cost (ch7-04, ch7-06, ch12 margin story)
--   * invoices (VND) for shipments booked from 2026-04-01 once they sail (exports) or arrive (imports); ~3% of DELIVERED
--     shipments were never invoiced (ch9-02, ch9-06); due 30 days after issue
--   * payments: 5% of invoices never paid, 20% paid in two instalments, so overdue debt reaches every aging bucket (ch8-01..03)
--   * vendor_bills in USD (and EUR for Europe lanes), dated any day of the week; cancelled shipments still carry a bill (ch8-04, ch8-05)
--   * master_bills group sea exports sailing from 2026-05-01 by carrier, ports and sailing day; ~4% weigh more than 1% off their house bills (ch9-03)
--   * the Q3 2026 margin story (ch12): Europe lanes lose about 12 margin points from Q2 to Q3, other regions stay flat
--   * house_bills: ~8% issued 3-7 days after sailing, the rest within 2 days; none issued after 2026-10-31 (ch9-04, ch9-05)

-- The planner has no statistics for freshly seeded tables and picks nested loops (10+ s); one ANALYZE keeps this block fast.
ANALYZE shipments, containers;

SELECT setseed(0.808);
WITH d AS (
  SELECT g::date AS rate_date, random() AS r_usd, random() AS r_eur
  FROM generate_series(DATE '2026-03-02', DATE '2026-10-30', INTERVAL '1 day') g
  WHERE extract(isodow FROM g) < 6
    AND g::date NOT IN (DATE '2026-04-27', DATE '2026-04-30', DATE '2026-05-01', DATE '2026-09-01', DATE '2026-09-02')
  ORDER BY 1
), w AS (
  SELECT rate_date, 26150 + 25 * sum(r_usd - 0.47) OVER (ORDER BY rate_date) AS usd,
                    30200 + 60 * sum(r_eur - 0.48) OVER (ORDER BY rate_date) AS eur
  FROM d
)
INSERT INTO exchange_rates (currency, rate_date, vnd_per_unit)
SELECT 'USD', rate_date, round(usd) FROM w
UNION ALL SELECT 'EUR', rate_date, round(eur) FROM w;

SELECT setseed(0.909);
WITH lane AS (
  SELECT o.code AS pol, p.code AS pod, p.region = 'Europe' AS eu, p.base_transit_days AS days,
    CASE o.code WHEN 'VNSGN' THEN 1.0 WHEN 'VNHPH' THEN 1.03 ELSE 1.06 END AS f_pol
  FROM ports o CROSS JOIN ports p
  WHERE o.code IN ('VNSGN', 'VNHPH', 'VNDAD') AND p.kind = 'SEAPORT' AND p.region <> 'Vietnam'
), typ (container_type, f_type) AS (VALUES ('20GP', 1.0), ('40GP', 1.75), ('40HC', 1.85), ('40RF', 2.6)),
period (valid_from, valid_to, who, gri) AS (VALUES
  (DATE '2026-04-01', DATE '2026-06-30', 'all', 1.0),
  (DATE '2026-07-01', DATE '2026-09-30', 'asia', 1.0), (DATE '2026-07-01', DATE '2026-07-14', 'eu', 1.0),
  (DATE '2026-07-15', DATE '2026-09-30', 'eu', 1.4), (DATE '2026-10-01', DATE '2026-12-31', 'asia', 1.0),
  (DATE '2026-10-01', DATE '2026-12-31', 'eu', 1.38)
), c AS (
  SELECT x.*, random() AS r FROM (
    SELECT lane.pol, lane.pod, lane.days, lane.f_pol, typ.container_type, typ.f_type, period.valid_from, period.valid_to, period.gri
    FROM lane CROSS JOIN typ CROSS JOIN period
    WHERE period.who = 'all' OR (period.who = 'eu') = lane.eu
    ORDER BY lane.pol, lane.pod, typ.container_type, period.valid_from
  ) x
)
INSERT INTO rate_contracts (id, pol, pod, container_type, valid_from, valid_to, buy_usd)
SELECT row_number() OVER (ORDER BY pol, pod, container_type, valid_from), pol, pod, container_type, valid_from, valid_to,
  round(((250 + days * 38) * f_pol * f_type * gri * (0.94 + r * 0.12))::numeric, 0)
FROM c;

ANALYZE exchange_rates, rate_contracts;
SELECT setseed(0.111);
WITH won AS (
  SELECT s.id AS shipment_id, s.customer_id, s.sales_rep_id, s.pol, s.pod, k.container_type, s.booking_date
  FROM shipments s
  JOIN (SELECT DISTINCT ON (shipment_id) shipment_id, container_type FROM containers ORDER BY shipment_id, id) k ON k.shipment_id = s.id
  WHERE s.direction = 'EXPORT' AND s.mode = 'SEA' AND s.booking_date >= DATE '2026-04-06'
  ORDER BY s.id
), w AS (
  SELECT won.*, booking_date - 1 - floor(random() * 5)::int AS quote_date, random() AS r_disc, random() AS r_mark FROM won
), lost AS (
  SELECT g, random() AS r_cust, random() AS r_churn, random() AS r_pol, random() AS r_pod, random() AS r_type, random() AS r_day,
    random() AS r_disc, random() AS r_mark
  FROM generate_series(1, 900) g
), l AS (
  SELECT NULL::int AS shipment_id,
    CASE WHEN r_churn < 0.25 THEN 171 + floor(r_cust * 20)::int ELSE 1 + floor(190 * power(r_cust, 1.5))::int END AS customer_id,
    (ARRAY['VNSGN','VNSGN','VNHPH','VNDAD'])[1 + floor(r_pol * 4)::int] AS pol,
    (ARRAY['CNSHA','CNNGB','SGSIN','KRPUS','JPTYO','THLCH','INNSA','NLRTM','DEHAM','BEANR','USLAX','USNYC','AUSYD','CNSHA','NLRTM','USLAX'])[1 + floor(r_pod * 16)::int] AS pod,
    (ARRAY['20GP','40GP','40HC','40HC','40RF'])[1 + floor(r_type * 5)::int] AS container_type,
    DATE '2026-04-01' + floor(r_day * 213)::int AS quote_date, r_disc, r_mark
  FROM lost
), q AS (
  SELECT shipment_id, customer_id, sales_rep_id, pol, pod, container_type, quote_date, r_disc, r_mark FROM w
  UNION ALL
  SELECT l.shipment_id, l.customer_id, cu.sales_rep_id, l.pol, l.pod, l.container_type, l.quote_date, l.r_disc, l.r_mark
  FROM l JOIN customers cu ON cu.id = l.customer_id
), pre AS MATERIALIZED ( -- Europe lanes only: the buy rate before the 2026-07-15 increase
  SELECT pol, pod, container_type, buy_usd FROM rate_contracts WHERE valid_to = DATE '2026-07-14'
), priced AS (
  SELECT q.*, CASE WHEN q.quote_date >= DATE '2026-07-15' THEN pre.buy_usd END AS pre_buy, cur.buy_usd AS cur_buy,
    row_number() OVER (ORDER BY q.quote_date, q.shipment_id NULLS LAST, q.customer_id, q.pol, q.pod, q.container_type, q.r_mark) AS id
  FROM q
  JOIN rate_contracts cur ON cur.pol = q.pol AND cur.pod = q.pod AND cur.container_type = q.container_type
                         AND q.quote_date BETWEEN cur.valid_from AND cur.valid_to
  LEFT JOIN pre ON pre.pol = q.pol AND pre.pod = q.pod AND pre.container_type = q.container_type
)
INSERT INTO quotations (id, quote_no, customer_id, sales_rep_id, pol, pod, container_type, quote_date, sell_usd, shipment_id)
SELECT id, 'QT' || to_char(quote_date, 'YYMM') || lpad(id::text, 5, '0'), customer_id, sales_rep_id, pol, pod, container_type, quote_date,
  round((COALESCE(pre_buy, cur_buy) * CASE WHEN r_disc < 0.015 THEN 0.90 + r_mark * 0.08 WHEN pre_buy IS NOT NULL THEN 1.12 + r_mark * 0.40
                                            ELSE 1.08 + r_mark * 0.17 END)::numeric, 0),
  shipment_id
FROM priced ORDER BY id;

ANALYZE quotations;
SELECT setseed(0.212);
WITH s AS (
  SELECT s.id, s.customer_id, s.direction, s.mode, s.load_type, s.status, s.gross_weight_kg, s.volume_cbm,
    CASE WHEN s.direction = 'EXPORT' THEN s.atd ELSE s.ata END AS served,
    CASE WHEN s.direction = 'EXPORT' THEN s.pod ELSE s.pol END AS far,
    random() AS r_issue, random() AS r_forget, random() AS r_rev
  FROM shipments s
  WHERE s.booking_date >= DATE '2026-04-01' AND s.status <> 'CANCELLED'
  ORDER BY s.id
), r AS (
  SELECT s.*, p.base_transit_days AS days, q.sell_usd, k.boxes, s.served + 1 + floor(s.r_issue * 3)::int AS issue_date
  FROM s JOIN ports p ON p.code = s.far LEFT JOIN quotations q ON q.shipment_id = s.id
  LEFT JOIN (SELECT shipment_id, count(*) AS boxes FROM containers GROUP BY shipment_id) k ON k.shipment_id = s.id
  WHERE s.served IS NOT NULL AND NOT (s.status = 'DELIVERED' AND s.r_forget < 0.03)
), v AS (
  SELECT r.*, CASE
      WHEN sell_usd IS NOT NULL THEN sell_usd * boxes + 120
      WHEN mode = 'AIR' THEN gross_weight_kg * (3.6 + r_rev * 1.2)
      WHEN load_type = 'LCL' THEN volume_cbm * (50 + r_rev * 35) + 60
      ELSE boxes * (700 + days * 30) * (1.0 + r_rev * 0.2) END AS rev_usd,
    row_number() OVER (ORDER BY issue_date, id) AS n
  FROM r WHERE issue_date <= DATE '2026-10-31'
)
INSERT INTO invoices (id, invoice_no, shipment_id, customer_id, issue_date, due_date, amount_vnd)
SELECT n, 'INV' || to_char(issue_date, 'YYMM') || lpad(n::text, 5, '0'), id, customer_id, issue_date, issue_date + 30,
  round((rev_usd * (SELECT x.vnd_per_unit FROM exchange_rates x WHERE x.currency = 'USD' AND x.rate_date <= v.issue_date
                    ORDER BY x.rate_date DESC LIMIT 1))::numeric, -3)
FROM v ORDER BY n;

ANALYZE invoices;
SELECT setseed(0.313);
WITH i AS (
  SELECT id, due_date, amount_vnd, random() AS r_kind, random() AS r_d1, random() AS r_d2 FROM invoices ORDER BY id
), p AS (
  SELECT id AS invoice_id, 1 AS k, due_date - 15 + floor(r_d1 * 45)::int AS pay_date, amount_vnd AS amount FROM i WHERE r_kind >= 0.25
  UNION ALL
  SELECT id, 1, due_date - 5 + floor(r_d1 * 20)::int, round(amount_vnd * 0.5, -3) FROM i WHERE r_kind >= 0.05 AND r_kind < 0.25
  UNION ALL
  SELECT id, 2, due_date + 15 + floor(r_d1 * 20)::int + floor(r_d2 * 40)::int, amount_vnd - round(amount_vnd * 0.5, -3)
  FROM i WHERE r_kind >= 0.05 AND r_kind < 0.25
)
INSERT INTO payments (id, invoice_id, pay_date, amount_vnd)
SELECT row_number() OVER (ORDER BY pay_date, invoice_id, k), invoice_id, pay_date, amount FROM p WHERE pay_date <= DATE '2026-10-31';

SELECT setseed(0.414);
WITH s AS (
  SELECT s.id, s.status, s.mode, s.load_type, s.pol, s.pod, s.booking_date, s.gross_weight_kg, s.volume_cbm,
    CASE WHEN s.direction = 'EXPORT' THEN s.atd ELSE s.ata END AS served,
    CASE WHEN s.direction = 'EXPORT' THEN s.pod ELSE s.pol END AS far,
    random() AS r_cost, random() AS r_d1, random() AS r_d2, random() AS r_cancel
  FROM shipments s WHERE s.booking_date >= DATE '2026-04-01' ORDER BY s.id
), c AS (
  SELECT s.*, p.region = 'Europe' AS eu, p.base_transit_days AS days, rc.buy_usd, n.boxes
  FROM s JOIN ports p ON p.code = s.far
  LEFT JOIN (SELECT shipment_id, count(*) AS boxes FROM containers GROUP BY shipment_id) n ON n.shipment_id = s.id
  LEFT JOIN quotations q ON q.shipment_id = s.id
  LEFT JOIN rate_contracts rc ON rc.pol = s.pol AND rc.pod = s.pod AND rc.container_type = q.container_type
                             AND s.served BETWEEN rc.valid_from AND rc.valid_to
), k AS (
  SELECT c.*, CASE
      WHEN buy_usd IS NOT NULL THEN buy_usd * boxes + 80
      WHEN mode = 'AIR' THEN gross_weight_kg * (2.6 + r_cost * 0.8)
      WHEN load_type = 'LCL' THEN volume_cbm * (32 + r_cost * 13) + 30
      ELSE boxes * (700 + days * 30) * (0.78 + r_cost * 0.14) END AS cost_usd
  FROM c
), b AS (
  SELECT id AS shipment_id, 1 AS k, served + floor(r_d1 * 7)::int AS bill_date, 'USD' AS currency,
    round((cost_usd * CASE WHEN eu THEN 0.85 ELSE 1 END)::numeric, 2) AS amount
  FROM k WHERE status <> 'CANCELLED' AND served IS NOT NULL
  UNION ALL
  SELECT id, 2, served + 2 + floor(r_d2 * 6)::int, 'EUR', round((cost_usd * 0.15 * 26150 / 30200)::numeric, 2)
  FROM k WHERE status <> 'CANCELLED' AND served IS NOT NULL AND eu
  UNION ALL
  SELECT id, 1, booking_date + 3 + floor(r_d1 * 8)::int, 'USD', round((80 + r_cost * 170)::numeric, 2)
  FROM k WHERE status = 'CANCELLED' AND r_cancel < 0.6
), n AS (
  SELECT b.*, row_number() OVER (ORDER BY bill_date, shipment_id, k) AS id FROM b WHERE bill_date <= DATE '2026-10-31'
)
INSERT INTO vendor_bills (id, bill_no, shipment_id, bill_date, currency, amount)
SELECT id, 'VB' || to_char(bill_date, 'YYMM') || lpad(id::text, 5, '0'), shipment_id, bill_date, currency, amount FROM n ORDER BY id;

SELECT setseed(0.515);
WITH grp AS (
  SELECT carrier_id, pol, pod, atd, sum(gross_weight_kg) AS w
  FROM shipments WHERE direction = 'EXPORT' AND mode = 'SEA' AND atd >= DATE '2026-05-01'
  GROUP BY carrier_id, pol, pod, atd
  ORDER BY atd, carrier_id, pol, pod
), m AS (
  SELECT row_number() OVER (ORDER BY atd, carrier_id, pol, pod) AS id, grp.*, random() AS r_dev, random() AS r_size FROM grp
)
INSERT INTO master_bills (id, mbl_no, carrier_id, pol, pod, issue_date, gross_weight_kg)
SELECT m.id, c.code || lpad((400000 + m.id)::text, 8, '0'), m.carrier_id, m.pol, m.pod, m.atd,
  round((m.w * CASE WHEN m.r_dev >= 0.04 THEN 1 WHEN m.r_size < 0.5 THEN 0.94 + m.r_size * 0.07 ELSE 1.015 + (m.r_size - 0.5) * 0.09 END)::numeric, 2)
FROM m JOIN carriers c ON c.id = m.carrier_id ORDER BY m.id;

ANALYZE master_bills;
SELECT setseed(0.616);
WITH h AS (
  SELECT s.id AS shipment_id, s.ref, s.atd, s.gross_weight_kg, m.id AS master_bill_id, random() AS r_late, random() AS r_day
  FROM shipments s
  JOIN master_bills m ON m.carrier_id = s.carrier_id AND m.pol = s.pol AND m.pod = s.pod AND m.issue_date = s.atd
  WHERE s.direction = 'EXPORT' AND s.mode = 'SEA' AND s.atd >= DATE '2026-05-01'
  ORDER BY s.id
), d AS (
  SELECT h.*, atd + CASE WHEN r_late < 0.08 THEN 3 + floor(r_day * 5)::int ELSE floor(r_day * 3)::int END AS issue_date FROM h
)
INSERT INTO house_bills (id, hbl_no, master_bill_id, shipment_id, issue_date, gross_weight_kg)
SELECT row_number() OVER (ORDER BY issue_date, shipment_id), 'HB' || substr(ref, 3), master_bill_id, shipment_id, issue_date, gross_weight_kg
FROM d WHERE issue_date <= DATE '2026-10-31';
```

- [ ] **Step 5: Chạy test, xác nhận PASS**

Run: `npx vitest run tests/seed.test.ts && npx tsc --noEmit`
Expected: mọi test PASS.

- [ ] **Step 6: Đo seed và ngân sách**

Run:
```bash
node --input-type=module -e "import {PGlite} from '@electric-sql/pglite'; import {readFileSync as r} from 'node:fs'; for (let i = 0; i < 3; i++) { const d = new PGlite(); await d.exec(r('src/db/schema.sql','utf8')); const t = Date.now(); await d.exec(r('src/db/seed.sql','utf8')); console.log('seed', Date.now() - t, 'ms'); }"
npm run build && node scripts/check-budget.mjs
```
Expected: seed ≈ 1,4–1,6 s mỗi lần trên máy dev (HEAD ≈ 0,95 s); `worker ≈ 140 KB gz / 160 KB` ok. **Luật dừng (R12):** seed > 1,8 s hoặc `worker` > 150 KB thì dừng, xem lại R4 (cắt cửa sổ thời gian trước, không cắt móc).

- [ ] **Step 7: Chạy toàn bộ rồi commit**

Run: `npm test && npx tsc --noEmit`
Expected: tất cả PASS (mọi Solution ch1–6 không đổi kết quả).

```bash
git add src/db/schema.sql src/db/seed.sql tests/seed.test.ts
git commit -m "feat(seed): chapter 7-9 tables (rates, contracts, quotes, invoices, payments, vendor bills, MBL/HBL) with story hooks"
```

---

### Task 3: Engine nhỏ: từ khóa kỹ năng twist, bỏ bảng `charges`, giải thích lỗi truy vấn con / phép tập hợp / DISTINCT ON

**Files:**
- Modify: `src/progress.ts`, `src/ui/sqlErrors.ts`, `src/i18n/vi.ts`, `src/i18n/en.ts`, `tests/progress.test.ts`, `tests/sqlErrors.test.ts`

**Interfaces:**
- Produces: `SKILL_SQL` thêm `correlated_value`, `distinct_on`, `full_join` (luật twist → cột mốc kiểm được SQL); `CHAPTER_TABLES[8]` = `invoices, payments, vendor_bills, exchange_rates` (R2); khóa i18n `sqlerr.21000`, `sqlerr.42P10`, `sqlerr.setColumns`, `sqlerr.setTypes`, `sqlerr.subqueryColumns`.
- Không đổi: tab "Thứ tự thực thi" đã báo "Query có WITH hoặc UNION — xem tab EXPLAIN" (`steps.withUnion`) nên ch8–9 không cần gì thêm ở đó.

Mã lỗi lấy từ PGlite 0.5.16 thật (đã chạy): truy vấn con trả nhiều dòng → `21000`; `UNION`/`EXCEPT` lệch số cột → `42601` "each UNION query must have the same number of columns"; lệch kiểu → `42804` "UNION types text and integer cannot be matched" (giải thích `42804` hiện có nói về CASE nên cần thông điệp riêng); `DISTINCT ON` khác `ORDER BY` → `42P10`; `IN (SELECT a, b …)` → `42601` "subquery has too many columns". `NOT IN` gặp NULL không báo lỗi mà trả 0 dòng: dạy bằng `trap` của `in_subquery` và câu ngẫm lại ch7-02.

- [ ] **Step 1: Viết test**

**Sửa `tests/progress.test.ts`** — thay:
```ts
    ['cast', 'SELECT CAST(count(*) AS numeric)', 'SELECT count(*)'],
```
bằng:
```ts
    ['cast', 'SELECT CAST(count(*) AS numeric)', 'SELECT count(*)'],
    ['correlated_value', 'SELECT (SELECT r.buy_usd FROM r WHERE r.id = q.id) FROM q', 'SELECT q.id FROM q JOIN r ON r.id = q.id'],
    ['distinct_on', 'SELECT DISTINCT ON (b.id) b.id FROM b ORDER BY b.id', 'SELECT DISTINCT b.id FROM b'],
    ['full_join', 'SELECT * FROM a FULL OUTER JOIN b ON true', 'SELECT * FROM a LEFT JOIN b ON true'],
```

**Sửa `tests/progress.test.ts`** — thay:
```ts
  it('CHAPTER_TABLES: 25 bảng của spec §4, mỗi bảng đúng một lần, mở theo curriculum §3', () => {
    const all = Object.values(CHAPTER_TABLES).flat();
    expect(Object.keys(CHAPTER_TABLES).map(Number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(all).toHaveLength(25);
    expect(new Set(all).size).toBe(25);
```
bằng:
```ts
  it('CHAPTER_TABLES: 24 bảng (spec §4 trừ charges, Plan 3 R2), mỗi bảng đúng một lần, mở theo curriculum §3', () => {
    const all = Object.values(CHAPTER_TABLES).flat();
    expect(Object.keys(CHAPTER_TABLES).map(Number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(all).toHaveLength(24);
    expect(new Set(all).size).toBe(24);
    expect(all).not.toContain('charges');
```

**Sửa `tests/sqlErrors.test.ts`** — thay:
```ts
  [`SELECT CASE WHEN eta < '2026-10-31' THEN 1 ELSE 'late' END FROM shipments`, 'sqlerr.22P02'],
```
bằng:
```ts
  [`SELECT CASE WHEN eta < '2026-10-31' THEN 1 ELSE 'late' END FROM shipments`, 'sqlerr.22P02'],
  ['SELECT q.quote_no, (SELECT r.buy_usd FROM rate_contracts r WHERE r.pod = q.pod) FROM quotations q', 'sqlerr.21000'],
  ['SELECT mbl_no, issue_date FROM master_bills UNION SELECT hbl_no FROM house_bills', 'sqlerr.setColumns'],
  ['SELECT id, ref FROM shipments EXCEPT SELECT shipment_id FROM invoices', 'sqlerr.setColumns'],
  ['SELECT mbl_no FROM master_bills UNION SELECT id FROM house_bills', 'sqlerr.setTypes'],
  [`SELECT DISTINCT ON (b.id) b.bill_no FROM vendor_bills b JOIN exchange_rates r ON r.currency = b.currency ORDER BY r.rate_date DESC`, 'sqlerr.42P10'],
  ['SELECT ref FROM shipments WHERE customer_id IN (SELECT id, name FROM customers)', 'sqlerr.subqueryColumns'],
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/progress.test.ts tests/sqlErrors.test.ts`
Expected: FAIL: `twistUsed('correlated_value', …)` là `undefined`; CHAPTER_TABLES còn 25 bảng; 6 lỗi mới chưa có giải thích (`undefined`).

- [ ] **Step 3: Sửa code và i18n**

**Sửa `src/progress.ts`** — thay:
```ts
  cast: /::\s*\w+|\bCAST\s*\(/i,
};
```
bằng:
```ts
  cast: /::\s*\w+|\bCAST\s*\(/i,
  correlated_value: /\(\s*SELECT\b/i,
  distinct_on: /\bDISTINCT\s+ON\b/i,
  full_join: /\bFULL\s+(OUTER\s+)?JOIN\b/i,
};
```

**Sửa `src/progress.ts`** — thay:
```ts
  8: ['charges', 'invoices', 'payments', 'vendor_bills', 'exchange_rates'],
```
bằng:
```ts
  8: ['invoices', 'payments', 'vendor_bills', 'exchange_rates'], // no `charges` (Plan 3 R2): revenue is invoices.amount_vnd
```

**Sửa `src/ui/sqlErrors.ts`** — thay:
```ts
  [/^function \S+\(.*\) does not exist/, 'sqlerr.fnArgs'],
];
```
bằng:
```ts
  [/^function \S+\(.*\) does not exist/, 'sqlerr.fnArgs'],
  [/^each (UNION|INTERSECT|EXCEPT) query must have the same number of columns/, 'sqlerr.setColumns'],
  [/^(UNION|INTERSECT|EXCEPT) types .* cannot be matched/, 'sqlerr.setTypes'],
  [/^subquery has too many columns/, 'sqlerr.subqueryColumns'],
];
```

**Sửa `src/ui/sqlErrors.ts`** — thay:
```ts
  '22P02': 'sqlerr.22P02',
};
```
bằng:
```ts
  '22P02': 'sqlerr.22P02',
  '21000': 'sqlerr.21000',
  '42P10': 'sqlerr.42P10',
};
```

**Sửa `src/i18n/vi.ts`** — thay:
```ts
  'sqlerr.multi': 'Mỗi lần chỉ chạy được một câu lệnh. Xóa câu thừa, hoặc bôi đen câu muốn chạy rồi bấm Chạy.',
```
bằng:
```ts
  'sqlerr.multi': 'Mỗi lần chỉ chạy được một câu lệnh. Xóa câu thừa, hoặc bôi đen câu muốn chạy rồi bấm Chạy.',
  'sqlerr.21000': 'Truy vấn con đặt ở chỗ cần một giá trị lại trả về nhiều dòng. Thêm điều kiện để chỉ còn một dòng, ví dụ hợp đồng còn hiệu lực vào đúng ngày.',
  'sqlerr.42P10': 'Các cột trong DISTINCT ON (…) phải đứng đầu ORDER BY, đúng thứ tự, rồi mới đến cột chọn dòng nào giữ lại.',
  'sqlerr.setColumns': 'Hai câu SELECT nối bằng UNION, EXCEPT hay INTERSECT phải có cùng số cột.',
  'sqlerr.setTypes': 'Cột cùng vị trí ở hai câu SELECT phải cùng kiểu: chữ đi với chữ, số đi với số.',
  'sqlerr.subqueryColumns': 'Truy vấn con sau IN chỉ được trả về một cột: cột để so với giá trị bên trái IN.',
```

**Sửa `src/i18n/en.ts`** — thay:
```ts
  'sqlerr.multi': 'Only one statement can run at a time. Delete the extra one, or select the statement you want and press Run.',
```
bằng:
```ts
  'sqlerr.multi': 'Only one statement can run at a time. Delete the extra one, or select the statement you want and press Run.',
  'sqlerr.21000': 'A subquery used where one value is needed returned several rows. Add a condition so only one row is left, for example the contract in force on that exact date.',
  'sqlerr.42P10': 'The columns in DISTINCT ON (…) must come first in ORDER BY, in the same order, before the column that picks which row to keep.',
  'sqlerr.setColumns': 'Two SELECTs joined with UNION, EXCEPT or INTERSECT must have the same number of columns.',
  'sqlerr.setTypes': 'Columns in the same position of both SELECTs must have the same type: text with text, numbers with numbers.',
  'sqlerr.subqueryColumns': 'A subquery after IN may return only one column: the one compared with the value left of IN.',
```

- [ ] **Step 4: Chạy test, xác nhận PASS rồi commit**

Run: `npx vitest run tests/progress.test.ts tests/sqlErrors.test.ts tests/i18n.test.ts tests/content.test.ts && npx tsc --noEmit`
Expected: tất cả PASS.

```bash
git add src/progress.ts src/ui/sqlErrors.ts src/i18n/vi.ts src/i18n/en.ts tests/progress.test.ts tests/sqlErrors.test.ts
git commit -m "feat(engine): twist keywords for subqueries, DISTINCT ON and FULL JOIN; teaching notes for subquery, set-operation and DISTINCT ON errors; drop the charges table"
```

---

### Task 4: Khung nội dung ch7–9 (thẻ kỹ năng, mục tiêu chương, bảng phụ trách, KPI)

**Files:**
- Modify: `content/skills.yml`, `content/chapters.yml`, `content/people.yml`, `content/kpis.yml`, `src/ui/icons.ts`

Kỹ năng thêm **trước** ticket (luật `skills.yml`); `contentProblems` chỉ bắt "dạy đúng một lần" với chương đã có ticket nên task này xanh khi chưa có ticket ch7–9. Không thêm người mới (R9): vai trò pricing, sales, AR, AP, kế toán trưởng, chứng từ đã có trong `people.yml`. Ô KPI trỏ tới ticket chưa có thì khóa.

- [ ] **Step 1: Thêm 10 thẻ kỹ năng**

**Thêm vào cuối `content/skills.yml`:**
```yaml

- id: scalar_subquery
  chapter: 7
  label: { vi: "Truy vấn con trả một giá trị", en: "Scalar subquery" }
  syntax: "HAVING count(*) > (SELECT count(*)::numeric / count(DISTINCT customer_id) FROM shipments WHERE ...)"
  when: { vi: "So từng dòng hay từng nhóm với một con số tính từ cả bảng: trung bình, mức cao nhất.", en: "Compare each row or group with one number computed over the whole table: an average, a maximum." }
  trap: { vi: "Truy vấn con phải tự lọc lại đúng tập dữ liệu; điều kiện của câu ngoài không áp vào nó.", en: "The subquery has to filter the same data again; the outer query's conditions do not apply inside it." }

- id: in_subquery
  chapter: 7
  label: { vi: "IN với truy vấn con", en: "IN with a subquery" }
  syntax: "WHERE customer_id IN (SELECT customer_id FROM shipments ... GROUP BY customer_id HAVING count(*) > 150)"
  when: { vi: "Lọc theo một danh sách mà chính danh sách đó phải tính ra.", en: "Filter by a list that has to be computed first." }
  trap: { vi: "NOT IN với danh sách có NULL không trả dòng nào. Lọc IS NOT NULL trong truy vấn con, hoặc dùng NOT EXISTS.", en: "NOT IN against a list that contains NULL returns no rows. Filter IS NOT NULL inside the subquery, or use NOT EXISTS." }

- id: exists
  chapter: 7
  label: { vi: "EXISTS và NOT EXISTS", en: "EXISTS and NOT EXISTS" }
  syntax: "WHERE NOT EXISTS (SELECT 1 FROM shipments s WHERE s.customer_id = q.customer_id AND s.booking_date >= q.quote_date)"
  when: { vi: "Hỏi có hay chưa có bản ghi liên quan, kể cả khi điều kiện so ngày hay so khoảng.", en: "Ask whether a related record exists, even when the match compares dates or ranges." }
  trap: { vi: "Quên điều kiện nối với câu ngoài (s.customer_id = q.customer_id) thì EXISTS hỏi cả bảng, đúng hoặc sai cho mọi dòng.", en: "Without the link to the outer row (s.customer_id = q.customer_id), EXISTS asks about the whole table and is true or false for every row." }

- id: correlated_value
  chapter: 7
  label: { vi: "Tra giá trị theo từng dòng", en: "Correlated lookup" }
  syntax: "(SELECT r.buy_usd FROM rate_contracts r WHERE r.pod = q.pod AND q.quote_date BETWEEN r.valid_from AND r.valid_to)"
  when: { vi: "Mỗi dòng cần một giá trị từ bảng khác, đúng tại ngày của dòng đó: giá đang hiệu lực, tỷ giá ngày đó.", en: "Each row needs one value from another table as of its own date: the rate in force, that day's price." }
  trap: { vi: "Thiếu điều kiện ngày hiệu lực thì truy vấn con trả nhiều dòng và báo lỗi, hoặc lấy nhầm giá của kỳ khác.", en: "Without the validity-date condition the subquery returns several rows and fails, or picks the price of another period." }

- id: cte
  chapter: 8
  label: { vi: "CTE (WITH)", en: "CTE (WITH)" }
  syntax: "WITH paid AS (SELECT invoice_id, SUM(amount_vnd) AS paid FROM payments GROUP BY invoice_id) SELECT ... LEFT JOIN paid p ON ..."
  when: { vi: "Cộng riêng một bảng trước khi nối, hoặc đặt tên cho một bước tính để đọc dễ.", en: "Total one table before joining it, or give a calculation step a name so it reads clearly." }
  trap: { vi: "Nối thẳng hóa đơn với thanh toán rồi mới cộng thì hóa đơn trả hai lần bị cộng hai lần. Cộng thanh toán theo hóa đơn trước.", en: "Joining invoices to payments and then summing counts an invoice paid twice twice. Total the payments per invoice first." }

- id: multi_cte
  chapter: 8
  label: { vi: "Nhiều CTE nối tiếp", en: "Chained CTEs" }
  syntax: "WITH paid AS (...), overdue AS (SELECT ... FROM invoices i LEFT JOIN paid p ...) SELECT ... WHERE o.overdue > (SELECT AVG(overdue) FROM overdue)"
  when: { vi: "Phép tính nhiều bước: bước sau dùng kết quả bước trước.", en: "A calculation in several steps, each step using the one before." }
  trap: { vi: "Các CTE cách nhau bằng dấu phẩy, chỉ một chữ WITH ở đầu. Một CTE dùng được nhiều lần trong câu chính.", en: "CTEs are separated by commas, with one WITH at the start. A CTE can be used several times in the main query." }

- id: distinct_on
  chapter: 8
  label: { vi: "Dòng mới nhất mỗi nhóm (DISTINCT ON)", en: "Latest row per group (DISTINCT ON)" }
  syntax: "SELECT DISTINCT ON (b.id) b.bill_no, r.vnd_per_unit FROM vendor_bills b JOIN exchange_rates r ON r.rate_date <= b.bill_date ORDER BY b.id, r.rate_date DESC"
  when: { vi: "Cần một dòng mới nhất cho mỗi khách, mỗi hóa đơn: tỷ giá gần nhất trước ngày hóa đơn.", en: "You need one latest row per customer or per bill: the most recent rate before the bill date." }
  trap: { vi: "ORDER BY phải bắt đầu bằng đúng các cột trong DISTINCT ON, rồi mới đến cột chọn dòng giữ lại; thiếu DESC là lấy dòng cũ nhất.", en: "ORDER BY must start with exactly the DISTINCT ON columns, then the column that picks the row; without DESC you keep the oldest row." }

- id: union
  chapter: 9
  label: { vi: "Gộp danh sách (UNION)", en: "Combine lists (UNION)" }
  syntax: "SELECT mbl_no, 'MBL' FROM master_bills WHERE ... UNION ALL SELECT hbl_no, 'HBL' FROM house_bills WHERE ..."
  when: { vi: "Hai nguồn cùng loại thông tin cần nằm trong một danh sách.", en: "Two sources of the same kind of information belong in one list." }
  trap: { vi: "UNION bỏ dòng trùng, UNION ALL giữ lại. Mỗi câu SELECT có WHERE riêng; ORDER BY chỉ viết một lần ở cuối.", en: "UNION drops duplicate rows, UNION ALL keeps them. Each SELECT has its own WHERE; ORDER BY is written once, at the end." }

- id: except
  chapter: 9
  label: { vi: "Hiệu và giao (EXCEPT, INTERSECT)", en: "Difference and intersection (EXCEPT, INTERSECT)" }
  syntax: "SELECT s.ref FROM ... delivered ... EXCEPT SELECT s.ref FROM invoices i JOIN shipments s ON s.id = i.shipment_id"
  when: { vi: "Thứ có ở sổ này mà sổ kia chưa có (EXCEPT), hoặc có ở cả hai (INTERSECT).", en: "What one book has and the other does not (EXCEPT), or what both have (INTERSECT)." }
  trap: { vi: "So cả dòng: hai bên phải cùng số cột, cùng ý nghĩa. Thêm một cột lệch nhau (ví dụ ngày) thì dòng nào cũng thành khác.", en: "Whole rows are compared: both sides need the same columns with the same meaning. One extra column that differs (a date) makes every row different." }

- id: full_join
  chapter: 9
  label: { vi: "Đối chiếu hai phía (FULL JOIN)", en: "Two-sided reconciliation (FULL JOIN)" }
  syntax: "WITH b AS (...), d AS (...) SELECT COALESCE(b.ref, d.ref), b.atd, d.hbl_no FROM b FULL JOIN d ON d.shipment_id = b.id WHERE b.id IS NULL OR d.shipment_id IS NULL"
  when: { vi: "Đối chiếu hai sổ mà dòng lệch có thể nằm ở bất kỳ bên nào.", en: "Reconcile two books when a mismatch can sit on either side." }
  trap: { vi: "Lọc tháng ở WHERE sau FULL JOIN là bỏ mất dòng chỉ có ở một bên. Lọc mỗi sổ trước, trong CTE hoặc truy vấn con, rồi mới nối.", en: "A month filter in WHERE after the FULL JOIN throws away the one-sided rows. Filter each book first, in a CTE or subquery, then join." }
```

- [ ] **Step 2: Mục tiêu chương, bảng phụ trách, KPI, icon kỹ năng**

**Sửa `src/ui/icons.ts`** — thay:
```ts
  in_subquery: 'nested', scalar_subquery: 'nested', correlated_value: 'nested', exists: 'nestedCheck',
  cte: 'steps', multi_cte: 'steps', window_agg: 'window', window_lag: 'windowLag', window_rank: 'windowRank',
  union: 'stack', except: 'minus', full_join: 'fullJoin', distinct_on: 'distinct', explain_read: 'plan', index_design: 'bookIndex',
```
bằng:
```ts
  // Plan 3: every skill needs its own icon (tests/icons.test.ts); existing shapes until the UI draws dedicated ones (R13).
  in_subquery: 'list', scalar_subquery: 'nested', correlated_value: 'link', exists: 'nestedCheck',
  cte: 'steps', multi_cte: 'repeat', window_agg: 'window', window_lag: 'windowLag', window_rank: 'windowRank',
  union: 'stack', except: 'minus', full_join: 'fullJoin', distinct_on: 'clockOff', explain_read: 'plan', index_design: 'bookIndex',
```

**Sửa `content/chapters.yml`** — thay:
```yaml
    en: "Pricing sends quotes every day. Is any of them selling below cost? You compare them with subqueries."
  outcomes: []
```
bằng:
```yaml
    en: "Pricing sends quotes every day. Is any of them selling below cost? You compare them with subqueries."
  outcomes:
    - { vi: "So từng dòng hay từng nhóm với một con số tính từ cả bảng", en: "Compare each row or group with a number computed over the whole table", skills: [scalar_subquery] }
    - { vi: "Lọc theo danh sách tính từ truy vấn khác, tránh bẫy NOT IN với ô trống", en: "Filter by a list computed by another query, without the NOT IN and NULL trap", skills: [in_subquery] }
    - { vi: "Tìm thứ đã có hoặc chưa có bản ghi liên quan", en: "Find what does or does not have a related record", skills: [exists] }
    - { vi: "Tra giá còn hiệu lực đúng vào ngày của từng dòng", en: "Look up the price in force on each row's own date", skills: [correlated_value] }
```

**Sửa `content/chapters.yml`** — thay:
```yaml
    en: "Receivables, payables, several currencies, exchange rates only on working days. Accounting needs calculations broken into clear steps."
  outcomes: []
```
bằng:
```yaml
    en: "Receivables, payables, several currencies, exchange rates only on working days. Accounting needs calculations broken into clear steps."
  outcomes:
    - { vi: "Cộng riêng từng bảng tiền trước khi nối để không nhân đôi", en: "Total each money table before joining so nothing is counted twice", skills: [cte] }
    - { vi: "Chia phép tính dài thành nhiều bước có tên", en: "Break a long calculation into named steps", skills: [multi_cte] }
    - { vi: "Lấy dòng mới nhất trong mỗi nhóm, như tỷ giá gần nhất", en: "Take the latest row in each group, such as the most recent rate", skills: [distinct_on] }
```

**Sửa `content/chapters.yml`** — thay:
```yaml
    en: "Master bills, house bills, the booking book and the invoices must all agree. You reconcile them so no shipment slips through."
  outcomes: []
```
bằng:
```yaml
    en: "Master bills, house bills, the booking book and the invoices must all agree. You reconcile them so no shipment slips through."
  outcomes:
    - { vi: "Gộp hai danh sách thành một", en: "Combine two lists into one", skills: [union] }
    - { vi: "Tìm thứ có ở sổ này mà sổ kia còn thiếu", en: "Find what one book has and the other is missing", skills: [except] }
    - { vi: "Đối chiếu hai sổ, thấy cả dòng chỉ có ở một bên", en: "Reconcile two books and see the rows found on one side only", skills: [full_join] }
```

**Sửa `content/people.yml`** — thay:
```yaml
  tables: [customers, carriers]
```
bằng:
```yaml
  tables: [customers, carriers, quotations]
```

**Sửa `content/people.yml`** — thay:
```yaml
  bio: { vi: "Cẩn thận từng đồng, luôn hỏi \"làm tròn mấy số?\".", en: "Careful with every cent, always asks \"rounded to how many decimals?\"." }
  tables: [customers]
```
bằng:
```yaml
  bio: { vi: "Cẩn thận từng đồng, luôn hỏi \"làm tròn mấy số?\".", en: "Careful with every cent, always asks \"rounded to how many decimals?\"." }
  tables: [customers, invoices, payments, vendor_bills, exchange_rates]
```

**Sửa `content/people.yml`** — thay:
```yaml
  tables: [shipments, containers, incoterms]
```
bằng:
```yaml
  tables: [shipments, containers, incoterms, master_bills, house_bills]
```

**Sửa `content/people.yml`** — thay:
```yaml
  tables: [carriers, ports]
```
bằng:
```yaml
  tables: [carriers, ports, rate_contracts, quotations]
```

**Sửa `content/people.yml`** — thay:
```yaml
  bio: { vi: "Nhắc nợ nhẹ nhàng nhưng không bỏ sót ai.", en: "Chases payments politely but never misses anyone." }
  tables: [customers]
```
bằng:
```yaml
  bio: { vi: "Nhắc nợ nhẹ nhàng nhưng không bỏ sót ai.", en: "Chases payments politely but never misses anyone." }
  tables: [customers, invoices, payments]
```

**Sửa `content/people.yml`** — thay:
```yaml
  tables: [carriers]
```
bằng:
```yaml
  tables: [carriers, vendor_bills, exchange_rates]
```

**Sửa `content/kpis.yml`** — thay:
```yaml
- { id: q3margin, ticket: ch12-06, kind: number, label: { vi: "Biên lợi nhuận quý 3/2026", en: "Q3 2026 gross margin" }, icon: percent }
```
bằng:
```yaml
- { id: belowCostQuotes, ticket: ch7-04, kind: rowcount, label: { vi: "Báo giá quý 3/2026 bán dưới giá mua", en: "Q3 2026 quotes priced below the buy rate" }, icon: nestedCheck }
- { id: overdueCustomers, ticket: ch8-03, kind: rowcount, label: { vi: "Khách đang có nợ quá hạn (31/10/2026)", en: "Customers with overdue debt (31 October 2026)" }, icon: clockAlert }
- { id: unbilledDelivered, ticket: ch9-02, kind: rowcount, label: { vi: "Lô giao tháng 10/2026 chưa xuất hóa đơn", en: "Shipments delivered in October 2026 and not invoiced" }, icon: minus }
- { id: q3margin, ticket: ch12-06, kind: number, label: { vi: "Biên lợi nhuận quý 3/2026", en: "Q3 2026 gross margin" }, icon: percent }
```

Ô biên lợi nhuận quý 3 vẫn thuộc ch12-06; Plan 3 không thêm ô nào lộ con số đó trước (R10).

- [ ] **Step 3: Chạy test, xác nhận PASS rồi commit**

Run: `npx vitest run tests/content.test.ts tests/progress.test.ts tests/people.test.ts tests/home.test.ts tests/icons.test.ts && npx tsc --noEmit`
Expected: tất cả PASS.

```bash
git add content/skills.yml content/chapters.yml content/people.yml content/kpis.yml src/ui/icons.ts
git commit -m "content: chapter 7-9 skill cards, outcomes, table owners, KPI tiles"
```

---

### Task 5: Chương 7 · Báo giá & so sánh (6 ticket)

**Files:**
- Create: `content/tickets/ch7/ch7-01.md` … `ch7-06.md`
- Modify: `tests/scene.test.ts`

Người hỏi: Hoàng Dũng (Sales), Đặng Hà (pricing), Lê Bình (Trưởng phòng Sales), Giám đốc. Bẫy twist: hợp đồng cước đổi theo kỳ, tuyến châu Âu đổi giữa quý (15/07/2026); thiếu điều kiện ngày hiệu lực thì truy vấn con trả nhiều dòng (`21000`) hoặc lấy nhầm giá. Cột mốc kiểm `correlated_value` (regex `(SELECT` ở mọi bước) và `exists` (bước 3). Solution ch7 không dùng CTE (kỹ năng ch8).

- [ ] **Step 1: Bảng hoạt cảnh mong đợi (test viết trước)**

**Sửa `tests/scene.test.ts`** — thay:
```ts
      'ch6-05': { kind: 'ship' }, 'ch6-06': { kind: 'promotion' },
    });
```
bằng:
```ts
      'ch6-05': { kind: 'ship' }, 'ch6-06': { kind: 'promotion' },
      'ch7-01': { kind: 'yard' }, 'ch7-02': { kind: 'quote' }, 'ch7-03': { kind: 'quote' }, 'ch7-04': { kind: 'quote' },
      'ch7-05': { kind: 'yard' }, 'ch7-06': { kind: 'promotion' },
    });
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/scene.test.ts`
Expected: FAIL: thiếu `ch7-01` … `ch7-06`.

- [ ] **Step 3: Viết 6 ticket**

**Tạo `content/tickets/ch7/ch7-01.md`:**
````markdown
---
id: ch7-01
chapter: 7
title: Khách nào vào nhóm chăm sóc ưu tiên?
title_en: Who joins the priority-care group?
from: { name: Hoàng Dũng, dept: Sales }
difficulty: 2
beat: teach
format: worked
requires: [join, group_by, having, cast]
grants: [scalar_subquery]
tables: [shipments, customers]
ordered: true
columns:
  - { vi: "Tên khách hàng", en: "Customer name" }
  - { vi: "Số lô trong kỳ", en: "Shipments in the period" }
variants:
  - { from: "2025-01-01", to: "2026-01-01", d1: "01/01/2025", d2: "31/12/2025", d1_en: "1 January 2025", d2_en: "31 December 2025" }
  - { from: "2026-01-01", to: "2026-07-01", d1: "01/01/2026", d2: "30/06/2026", d1_en: "1 January 2026", d2_en: "30 June 2026" }
  - { from: "2026-07-01", to: "2026-10-01", d1: "01/07/2026", d2: "30/09/2026", d1_en: "1 July 2026", d2_en: "30 September 2026" }
reflect:
  q: { vi: "Vì sao truy vấn con tính mức trung bình phải tự lọc lại kỳ và bỏ lô hủy?", en: "Why does the subquery that computes the average have to filter the period and the cancelled shipments again?" }
  options:
    - { vi: "Truy vấn con chạy riêng; điều kiện của câu ngoài không áp vào nó", en: "The subquery runs on its own; the outer query's conditions do not apply inside it" }
    - { vi: "Không cần: truy vấn con tự dùng điều kiện của câu ngoài", en: "It does not: the subquery reuses the outer query's conditions" }
    - { vi: "Để truy vấn con chạy nhanh hơn", en: "Only to make the subquery faster" }
  answer: 0
  why: { vi: "Truy vấn con là một câu SELECT độc lập. Muốn trung bình tính trên đúng tập lô đang so thì phải viết lại đủ điều kiện bên trong nó.", en: "A subquery is a separate SELECT. For the average to cover the same shipments you compare against, repeat every condition inside it." }
wrong:
  - sql: "SELECT c.name, count(*) FROM shipments s JOIN customers c ON c.id = s.customer_id WHERE s.booking_date >= '{{from}}' AND s.booking_date < '{{to}}' GROUP BY c.id, c.name HAVING count(*) > (SELECT count(*)::numeric / count(DISTINCT customer_id) FROM shipments WHERE booking_date >= '{{from}}' AND booking_date < '{{to}}') ORDER BY count(*) DESC, c.name"
    vi: "Bạn đang đếm cả lô đã hủy. Đề chỉ tính lô không bị hủy, cả khi đếm cho từng khách lẫn khi tính mức trung bình."
    en: "You are counting cancelled shipments too. The request counts only shipments that were not cancelled, both per customer and in the average."
---
Giám đốc muốn lập nhóm chăm sóc ưu tiên: khách gửi nhiều hơn một khách bình thường thì được gọi hỏi thăm hằng tháng. "Bình thường" ở đây là mức trung bình, nên mình cần so từng khách với một con số tính từ cả danh sách.

Đây là lần đầu bạn đặt một câu truy vấn bên trong câu khác, nên mình gửi kèm ví dụ mẫu. Đọc ví dụ, chạy thử, rồi làm phần của bạn.

## Task
Từ {{d1}} đến hết {{d2}}, khách nào gửi nhiều lô hơn mức trung bình mỗi khách? Mức trung bình bằng tổng số lô chia cho số khách có gửi hàng trong kỳ (tính cả phần lẻ). Không tính lô đã hủy, cả khi đếm lẫn khi tính trung bình. Gửi mình tên khách và số lô; nhiều lô nhất lên đầu, bằng nhau thì xếp theo tên khách theo thứ tự chữ cái.

## Example
```sql
SELECT ref, gross_weight_kg
FROM shipments
WHERE mode = 'AIR'
  AND atd >= '2026-10-01' AND atd < '2026-11-01'
  AND gross_weight_kg > 1.8 * (                     -- ①
        SELECT AVG(gross_weight_kg)                  -- ②
        FROM shipments
        WHERE mode = 'AIR'
          AND atd >= '2026-10-01' AND atd < '2026-11-01'  -- ③
      )
ORDER BY gross_weight_kg DESC, ref
```
Ví dụ: lô hàng không bay trong tháng 10/2026 nào nặng hơn 1,8 lần trọng lượng trung bình của các lô hàng không bay cùng tháng? Kho cần biết trước để xếp xe nâng.

① Một câu SELECT trong ngoặc trả về đúng một giá trị, nên đặt được ở chỗ cần một con số, như vế phải của phép so sánh.

② Truy vấn con tính một con số cho cả nhóm: trọng lượng trung bình.

③ Truy vấn con không thấy điều kiện của câu ngoài. Muốn trung bình chỉ tính trên lô hàng không tháng 10 thì phải lọc lại bên trong.

## Hints
1. Đếm lô theo từng khách như ở chương 2, rồi giữ nhóm có số lô lớn hơn một con số. Con số đó là mức trung bình, tính bằng một truy vấn riêng đặt trong ngoặc, như ví dụ mẫu.
2. Bảng `shipments` nối `customers`. Lọc `s.status <> 'CANCELLED'` và kỳ ngày ở cả hai câu. Trung bình mỗi khách: `count(*)::numeric / count(DISTINCT customer_id)`. Điều kiện trên nhóm đặt ở `HAVING`.
3. `SELECT c.name, count(*) FROM shipments s JOIN customers c ON ... WHERE ... GROUP BY c.id, c.name HAVING count(*) > (SELECT count(*)::numeric / count(DISTINCT customer_id) FROM shipments WHERE ...) ORDER BY count(*) DESC, c.name`

## Solution
```sql
SELECT c.name, count(*)
FROM shipments s
JOIN customers c ON c.id = s.customer_id
WHERE s.booking_date >= '{{from}}' AND s.booking_date < '{{to}}'
  AND s.status <> 'CANCELLED'
GROUP BY c.id, c.name
HAVING count(*) > (
  SELECT count(*)::numeric / count(DISTINCT customer_id)
  FROM shipments
  WHERE booking_date >= '{{from}}' AND booking_date < '{{to}}'
    AND status <> 'CANCELLED'
)
ORDER BY count(*) DESC, c.name
```

# EN
The director wants a priority-care group: customers who ship more than an ordinary customer get a call every month. "Ordinary" means the average, so I need to compare each customer with one number computed from the whole list.

This is the first time you put one query inside another, so I am sending a worked example along. Read it, run it, then do your part.

## Task
From {{d1_en}} to {{d2_en}} inclusive, which customers shipped more than the average per customer? The average is the total number of shipments divided by the number of customers who shipped in the period (keep the decimals). Leave out cancelled shipments, both in the counts and in the average. Send me the customer name and the number of shipments; most shipments first, and on a tie, by customer name alphabetically.

## Example
Example: which air shipments that left in October 2026 weigh more than 1.8 times the average weight of the air shipments that left that month? The warehouse needs to know ahead to book a forklift.

① A SELECT in parentheses that returns exactly one value can go wherever a number is needed, such as the right side of a comparison.

② The subquery computes one number for the whole group: the average weight.

③ The subquery cannot see the outer query's conditions. For the average to cover only October air shipments, filter again inside it.

## Hints
1. Count shipments per customer as in chapter 2, then keep the groups whose count is above one number. That number is the average, computed by a separate query in parentheses, like the worked example.
2. Table `shipments` joined to `customers`. Filter `s.status <> 'CANCELLED'` and the date range in both queries. Average per customer: `count(*)::numeric / count(DISTINCT customer_id)`. A condition on groups goes in `HAVING`.
3. `SELECT c.name, count(*) FROM shipments s JOIN customers c ON ... WHERE ... GROUP BY c.id, c.name HAVING count(*) > (SELECT count(*)::numeric / count(DISTINCT customer_id) FROM shipments WHERE ...) ORDER BY count(*) DESC, c.name`
````

**Tạo `content/tickets/ch7/ch7-02.md`:**
````markdown
---
id: ch7-02
chapter: 7
title: Báo giá gửi khách chủ lực
title_en: Quotes sent to key accounts
from: { name: Đặng Hà, dept: Sales }
difficulty: 2
beat: develop
format: faded
requires: [join, group_by, having, order_by]
grants: [in_subquery]
tables: [quotations, customers, shipments]
ordered: true
scene: { kind: quote }
columns:
  - { vi: "Tên khách hàng", en: "Customer name" }
  - { vi: "Số báo giá", en: "Number of quotes" }
starter: |
  SELECT c.name, count(*)
  FROM quotations q
  JOIN customers c ON c.id = q.customer_id
  WHERE q.quote_date >= '{{from}}' AND q.quote_date < '{{to}}'
    AND q.customer_id IN (
      SELECT ___
      FROM shipments
      WHERE booking_date >= '2025-01-01' AND booking_date < '2026-01-01'
      GROUP BY customer_id
      HAVING ___
    )
  GROUP BY c.id, c.name
  ORDER BY count(*) DESC, c.name
variants:
  - { from: "2026-07-01", to: "2026-10-01", d1: "01/07/2026", d2: "30/09/2026", d1_en: "1 July 2026", d2_en: "30 September 2026" }
  - { from: "2026-04-01", to: "2026-07-01", d1: "01/04/2026", d2: "30/06/2026", d1_en: "1 April 2026", d2_en: "30 June 2026" }
  - { from: "2026-10-01", to: "2026-11-01", d1: "01/10/2026", d2: "31/10/2026", d1_en: "1 October 2026", d2_en: "31 October 2026" }
reflect:
  q: { vi: "Nếu đổi sang tìm lô hàng chưa từng có báo giá bằng điều kiện mã lô không nằm trong danh sách mã lô của các báo giá, kết quả sẽ thế nào?", en: "If you looked for shipments that never had a quote with the condition that the shipment id is not in the list of the quotes' shipment ids, what would you get?" }
  options:
    - { vi: "Không dòng nào, vì danh sách có ô trống (báo giá chưa thành booking)", en: "No rows at all, because the list contains empty values (quotes that never became a booking)" }
    - { vi: "Đúng các lô không có báo giá", en: "Exactly the shipments without a quote" }
    - { vi: "Postgres báo lỗi vì danh sách có ô trống", en: "Postgres raises an error because the list contains empty values" }
  answer: 0
  why: { vi: "So khác với NULL ra chưa biết, nên NOT IN gặp một ô trống là loại mọi dòng. Lọc IS NOT NULL trong truy vấn con, hoặc dùng NOT EXISTS (bài sau).", en: "Comparing with NULL gives unknown, so a single empty value makes NOT IN drop every row. Filter IS NOT NULL inside the subquery, or use NOT EXISTS (next task)." }
wrong:
  - sql: "SELECT c.name, count(*) FROM quotations q JOIN customers c ON c.id = q.customer_id WHERE q.quote_date >= '{{from}}' AND q.quote_date < '{{to}}' AND q.customer_id IN (SELECT customer_id FROM shipments GROUP BY customer_id HAVING count(*) > 150) GROUP BY c.id, c.name ORDER BY count(*) DESC, c.name"
    vi: "Danh sách khách chủ lực đang đếm lô của mọi năm. Đề chỉ tính khách gửi hơn 150 lô trong năm 2025."
    en: "Your key-account list counts shipments from every year. The request is customers with more than 150 shipments in 2025."
---
Mình đang soát lại giá đã chào cho khách chủ lực: những khách gửi hơn 150 lô trong năm 2025, như báo cáo khách chủ lực ở chương 2. Khách lớn hay ép giá, nên mình muốn biết mỗi khách đã nhận bao nhiêu báo giá.

Câu SQL trong editor gần xong, chỉ còn mấy chỗ trống ___. Bạn điền cho đủ rồi nộp.

## Task
Từ {{d1}} đến hết {{d2}}, mỗi khách chủ lực (hơn 150 lô trong năm 2025, tính cả lô đã hủy như báo cáo chương 2) đã nhận bao nhiêu báo giá? Gửi tên khách và số báo giá; nhiều báo giá nhất lên đầu, bằng nhau thì xếp theo tên khách theo thứ tự chữ cái. Khách chủ lực không nhận báo giá nào trong kỳ thì không cần ghi.

## Hints
1. Danh sách khách chủ lực là một câu truy vấn riêng: đếm lô năm 2025 theo khách, giữ khách hơn 150 lô. Câu chính chỉ giữ báo giá của khách nằm trong danh sách đó.
2. Chỗ trống thứ nhất là cột so với `q.customer_id`: `customer_id`. Chỗ trống thứ hai là điều kiện trên nhóm: `count(*) > 150`.
3. `... AND q.customer_id IN (SELECT customer_id FROM shipments WHERE ... GROUP BY customer_id HAVING count(*) > 150) ...`

## Solution
```sql
SELECT c.name, count(*)
FROM quotations q
JOIN customers c ON c.id = q.customer_id
WHERE q.quote_date >= '{{from}}' AND q.quote_date < '{{to}}'
  AND q.customer_id IN (
    SELECT customer_id
    FROM shipments
    WHERE booking_date >= '2025-01-01' AND booking_date < '2026-01-01'
    GROUP BY customer_id
    HAVING count(*) > 150
  )
GROUP BY c.id, c.name
ORDER BY count(*) DESC, c.name
```

# EN
I am reviewing the prices we offered our key accounts: the customers with more than 150 shipments in 2025, as in the key-account report in chapter 2. Big customers push hard on price, so I want to know how many quotes each of them received.

The SQL in the editor is almost done; only a few ___ blanks are left. Fill them in, then submit.

## Task
From {{d1_en}} to {{d2_en}} inclusive, how many quotes did each key account (more than 150 shipments in 2025, cancelled ones included as in the chapter 2 report) receive? Send the customer name and the number of quotes; most quotes first, and on a tie, by customer name alphabetically. Key accounts with no quote in the period can be left out.

## Hints
1. The key-account list is a query of its own: count 2025 shipments per customer and keep those above 150. The main query keeps only the quotes of customers in that list.
2. The first blank is the column compared with `q.customer_id`: `customer_id`. The second blank is the condition on groups: `count(*) > 150`.
3. `... AND q.customer_id IN (SELECT customer_id FROM shipments WHERE ... GROUP BY customer_id HAVING count(*) > 150) ...`
````

**Tạo `content/tickets/ch7/ch7-03.md`:**
````markdown
---
id: ch7-03
chapter: 7
title: Báo giá chưa thấy khách quay lại
title_en: Quotes with no booking since
from: { name: Hoàng Dũng, dept: Sales }
difficulty: 3
beat: develop
requires: [join, anti_join, order_by, date_math]
grants: [exists]
tables: [quotations, customers, shipments]
ordered: true
scene: { kind: quote }
columns:
  - { vi: "Số báo giá", en: "Quote number" }
  - { vi: "Tên khách hàng", en: "Customer name" }
  - { vi: "Ngày báo giá", en: "Quote date" }
variants:
  - { from: "2026-07-01", to: "2026-10-01", d1: "01/07/2026", d2: "30/09/2026", d1_en: "1 July 2026", d2_en: "30 September 2026" }
  - { from: "2026-04-01", to: "2026-07-01", d1: "01/04/2026", d2: "30/06/2026", d1_en: "1 April 2026", d2_en: "30 June 2026" }
  - { from: "2026-10-01", to: "2026-11-01", d1: "01/10/2026", d2: "31/10/2026", d1_en: "1 October 2026", d2_en: "31 October 2026" }
reflect:
  q: { vi: "Vì sao bài này khó viết bằng phép nối trái quen thuộc ở chương 3 mà dễ viết với EXISTS?", en: "Why is this task awkward with the familiar left join of chapter 3 but easy with EXISTS?" }
  options:
    - { vi: "Điều kiện ghép là so ngày (từ ngày báo giá trở đi), không chỉ so mã; EXISTS đặt được điều kiện đó ngay trong câu hỏi có hay không", en: "The match compares dates (from the quote date on), not just ids; EXISTS holds that condition right inside the yes-or-no question" }
    - { vi: "Phép nối trái không dùng được với bảng báo giá", en: "A left join cannot be used with the quotes table" }
    - { vi: "EXISTS luôn trả ít dòng hơn phép nối", en: "EXISTS always returns fewer rows than a join" }
  answer: 0
  why: { vi: "Phép nối trái vẫn làm được nếu đưa điều kiện ngày vào ON rồi giữ dòng IS NULL. NOT EXISTS nói thẳng ý: không có lô nào của khách này từ ngày báo giá trở đi.", en: "A left join still works if the date condition goes into ON and you keep the IS NULL rows. NOT EXISTS says it directly: no shipment of this customer from the quote date on." }
wrong:
  - sql: "SELECT q.quote_no, c.name, q.quote_date FROM quotations q JOIN customers c ON c.id = q.customer_id WHERE q.quote_date >= '{{from}}' AND q.quote_date < '{{to}}' AND q.shipment_id IS NULL ORDER BY q.quote_date, q.quote_no"
    vi: "Bạn đang lấy báo giá chưa thành booking. Đề hỏi khách chưa đặt lô nào từ ngày báo giá, kể cả lô không theo báo giá đó: khách vẫn đặt hàng đều thì không cần gọi."
    en: "You are listing quotes that did not turn into a booking. The request is customers with no booking at all since the quote date, even one not based on that quote: a customer who keeps booking needs no call."
---
Báo giá gửi đi mà khách im lặng là dấu hiệu mình sắp mất khách. Mình muốn gọi lại những khách đã nhận báo giá mà từ hôm đó tới giờ chưa đặt thêm lô nào với công ty.

## Task
Trong các báo giá gửi từ {{d1}} đến hết {{d2}}: báo giá nào mà khách nhận nó chưa có booking nào, theo ngày đặt chỗ, từ ngày báo giá đến hết 31/10/2026? Tính mọi booking của khách, kể cả booking không theo báo giá đó và booking đã hủy. Gửi số báo giá, tên khách và ngày báo giá; ngày báo giá sớm nhất lên đầu, cùng ngày thì số báo giá nhỏ hơn đứng trước.

## Hints
1. Với mỗi báo giá, câu hỏi là "có lô nào của khách này đặt từ ngày báo giá trở đi không?". Giữ báo giá mà câu trả lời là không, như bài khách lâu không gửi hàng ở chương 3 nhưng điều kiện ghép là so ngày.
2. `NOT EXISTS (SELECT 1 FROM shipments s WHERE s.customer_id = q.customer_id AND s.booking_date >= q.quote_date)`. Nối `customers` để lấy tên.
3. `SELECT q.quote_no, c.name, q.quote_date FROM quotations q JOIN customers c ON ... WHERE q.quote_date >= '{{from}}' AND q.quote_date < '{{to}}' AND NOT EXISTS (...) ORDER BY q.quote_date, q.quote_no`

## Solution
```sql
SELECT q.quote_no, c.name, q.quote_date
FROM quotations q
JOIN customers c ON c.id = q.customer_id
WHERE q.quote_date >= '{{from}}' AND q.quote_date < '{{to}}'
  AND NOT EXISTS (
    SELECT 1 FROM shipments s
    WHERE s.customer_id = q.customer_id AND s.booking_date >= q.quote_date
  )
ORDER BY q.quote_date, q.quote_no
```

# EN
A quote followed by silence is a sign we are about to lose the customer. I want to call back the customers who received a quote and have not booked anything with us since that day.

## Task
Among the quotes sent from {{d1_en}} to {{d2_en}} inclusive: for which quotes has the customer made no booking at all, by booking date, from the quote date up to 31 October 2026? Count every booking of the customer, including bookings not based on that quote and cancelled ones. Send the quote number, customer name and quote date; earliest quote date first, and on the same date, the smaller quote number first.

## Hints
1. For each quote the question is "does this customer have any shipment booked from the quote date on?". Keep the quotes where the answer is no, like the customers who went quiet in chapter 3, but the match compares dates.
2. `NOT EXISTS (SELECT 1 FROM shipments s WHERE s.customer_id = q.customer_id AND s.booking_date >= q.quote_date)`. Join `customers` for the name.
3. `SELECT q.quote_no, c.name, q.quote_date FROM quotations q JOIN customers c ON ... WHERE q.quote_date >= '{{from}}' AND q.quote_date < '{{to}}' AND NOT EXISTS (...) ORDER BY q.quote_date, q.quote_no`
````

**Tạo `content/tickets/ch7/ch7-04.md`:**
````markdown
---
id: ch7-04
chapter: 7
title: Báo giá thấp hơn giá mua
title_en: Quotes below the buy rate
from: { name: Đặng Hà, dept: Sales }
difficulty: 3
beat: twist
requires: [scalar_subquery, where, order_by]
grants: [correlated_value]
tables: [quotations, rate_contracts]
ordered: true
scene: { kind: quote }
columns:
  - { vi: "Số báo giá", en: "Quote number" }
  - { vi: "Ngày báo giá", en: "Quote date" }
  - { vi: "Giá bán (USD/container)", en: "Sell rate (USD per container)" }
  - { vi: "Giá mua đang hiệu lực (USD/container)", en: "Buy rate in force (USD per container)" }
variants:
  - { from: "2026-07-01", to: "2026-10-01", d1: "01/07/2026", d2: "30/09/2026", d1_en: "1 July 2026", d2_en: "30 September 2026" }
  - { from: "2026-04-01", to: "2026-07-01", d1: "01/04/2026", d2: "30/06/2026", d1_en: "1 April 2026", d2_en: "30 June 2026" }
  - { from: "2026-10-01", to: "2026-11-01", d1: "01/10/2026", d2: "31/10/2026", d1_en: "1 October 2026", d2_en: "31 October 2026" }
reflect:
  q: { vi: "Một tuyến có nhiều hợp đồng cước nối tiếp nhau. Vì sao điều kiện ngày báo giá nằm trong khoảng hiệu lực là bắt buộc?", en: "A lane has several contracts one after another. Why is the condition that the quote date falls inside the validity period required?" }
  options:
    - { vi: "Không có nó, truy vấn con trả nhiều giá mua (lỗi) hoặc lấy nhầm giá của kỳ khác", en: "Without it the subquery returns several buy rates (an error) or the rate of another period" }
    - { vi: "Để truy vấn con chạy nhanh hơn", en: "Only to make the subquery faster" }
    - { vi: "Vì mỗi tuyến chỉ có một hợp đồng", en: "Because each lane has only one contract" }
  answer: 0
  why: { vi: "Giá mua đổi theo kỳ, và tuyến châu Âu còn đổi giữa quý (từ 15/07/2026). Truy vấn con chạy lại cho từng báo giá, dùng ngày của chính báo giá đó để chọn đúng một hợp đồng.", en: "Buy rates change by period, and the Europe lanes even changed mid-quarter (from 15 July 2026). The subquery runs again for each quote and uses that quote's own date to pick exactly one contract." }
wrong:
  - sql: "SELECT q.quote_no, q.quote_date, q.sell_usd, (SELECT max(r.buy_usd) FROM rate_contracts r WHERE r.pol = q.pol AND r.pod = q.pod AND r.container_type = q.container_type) FROM quotations q WHERE q.quote_date >= '{{from}}' AND q.quote_date < '{{to}}' AND q.sell_usd < (SELECT max(r.buy_usd) FROM rate_contracts r WHERE r.pol = q.pol AND r.pod = q.pod AND r.container_type = q.container_type) ORDER BY q.quote_date, q.quote_no"
    vi: "Bạn đang so với giá mua cao nhất của tuyến trong cả năm. Đề cần giá của hợp đồng còn hiệu lực đúng vào ngày báo giá."
    en: "You are comparing with the lane's highest buy rate of the whole year. The request needs the rate of the contract in force on the quote date."
---
Hãng tàu đổi giá theo từng kỳ hợp đồng, có tuyến đổi cả giữa quý. Báo giá nào gửi khách mà giá bán thấp hơn giá mình mua thì mỗi container chở đi là một khoản lỗ. Mình cần danh sách để sửa giá trước khi khách đặt thêm.

## Task
Trong các báo giá gửi từ {{d1}} đến hết {{d2}}: báo giá nào có giá bán thấp hơn giá mua của hợp đồng cước còn hiệu lực vào đúng ngày báo giá, cùng cảng đi, cùng cảng đến và cùng loại container? Hợp đồng còn hiệu lực khi ngày báo giá nằm từ ngày bắt đầu đến hết ngày kết thúc của hợp đồng. Gửi số báo giá, ngày báo giá, giá bán và giá mua đó (USD mỗi container); ngày báo giá sớm nhất lên đầu, cùng ngày thì số báo giá nhỏ hơn đứng trước.

## Hints
1. Với mỗi báo giá, giá mua là một con số tra từ danh mục hợp đồng cước: cùng tuyến, cùng loại container, và hợp đồng bao trùm ngày báo giá. Đó là một truy vấn con chạy lại cho từng dòng, dùng giá trị của chính dòng đó.
2. Bảng `rate_contracts` (cột `pol`, `pod`, `container_type`, `valid_from`, `valid_to`, `buy_usd`). Truy vấn con: `(SELECT r.buy_usd FROM rate_contracts r WHERE r.pol = q.pol AND r.pod = q.pod AND r.container_type = q.container_type AND q.quote_date BETWEEN r.valid_from AND r.valid_to)`.
3. `SELECT q.quote_no, q.quote_date, q.sell_usd, (SELECT ...) FROM quotations q WHERE q.quote_date >= '{{from}}' AND q.quote_date < '{{to}}' AND q.sell_usd < (SELECT ...) ORDER BY q.quote_date, q.quote_no`

## Solution
```sql
SELECT q.quote_no, q.quote_date, q.sell_usd,
  (SELECT r.buy_usd FROM rate_contracts r
   WHERE r.pol = q.pol AND r.pod = q.pod AND r.container_type = q.container_type
     AND q.quote_date BETWEEN r.valid_from AND r.valid_to)
FROM quotations q
WHERE q.quote_date >= '{{from}}' AND q.quote_date < '{{to}}'
  AND q.sell_usd < (
    SELECT r.buy_usd FROM rate_contracts r
    WHERE r.pol = q.pol AND r.pod = q.pod AND r.container_type = q.container_type
      AND q.quote_date BETWEEN r.valid_from AND r.valid_to
  )
ORDER BY q.quote_date, q.quote_no
```

# EN
Carriers change their rates every contract period, and on some lanes even mid-quarter. A quote that sells below what we pay means a loss on every container we carry. I need the list so I can fix the prices before customers book more.

## Task
Among the quotes sent from {{d1_en}} to {{d2_en}} inclusive: which quotes sell below the buy rate of the freight contract in force on the quote date, for the same port of loading, the same destination port and the same container type? A contract is in force when the quote date is between its start date and its end date, both included. Send the quote number, quote date, sell rate and that buy rate (USD per container); earliest quote date first, and on the same date, the smaller quote number first.

## Hints
1. For each quote, the buy rate is one number looked up in the freight contracts: same lane, same container type, and a contract that covers the quote date. That is a subquery that runs again for each row, using that row's own values.
2. Table `rate_contracts` (columns `pol`, `pod`, `container_type`, `valid_from`, `valid_to`, `buy_usd`). Subquery: `(SELECT r.buy_usd FROM rate_contracts r WHERE r.pol = q.pol AND r.pod = q.pod AND r.container_type = q.container_type AND q.quote_date BETWEEN r.valid_from AND r.valid_to)`.
3. `SELECT q.quote_no, q.quote_date, q.sell_usd, (SELECT ...) FROM quotations q WHERE q.quote_date >= '{{from}}' AND q.quote_date < '{{to}}' AND q.sell_usd < (SELECT ...) ORDER BY q.quote_date, q.quote_no`
````

**Tạo `content/tickets/ch7/ch7-05.md`:**
````markdown
---
id: ch7-05
chapter: 7
title: Năm tuyến chở nhiều TEU nhất quý 3
title_en: Top five lanes by TEU in Q3
from: { name: Lê Bình, dept: Sales }
difficulty: 2
beat: rest
requires: [multi_join, aggregate, group_by, order_by, limit]
grants: []
tables: [shipments, containers, ports]
ordered: true
columns:
  - { vi: "Cảng đi", en: "Port of loading" }
  - { vi: "Cảng đến", en: "Destination port" }
  - { vi: "Tổng TEU", en: "Total TEU" }
reflect:
  q: { vi: "Vì sao phải nối danh mục cảng hai lần với hai tên gọi khác nhau?", en: "Why join the port list twice, under two different aliases?" }
  options:
    - { vi: "Mỗi lô có hai cảng (đi và đến); mỗi lần nối lấy tên cho một cảng", en: "Each shipment has two ports (loading and destination); each join fetches the name of one of them" }
    - { vi: "Để đếm mỗi container hai lần", en: "To count every container twice" }
    - { vi: "Vì một bảng chỉ được nối một lần", en: "Because a table can only be joined once" }
  answer: 0
  why: { vi: "Cùng một bảng đóng hai vai: cảng đi và cảng đến. Hai tên gọi (alias) giúp Postgres biết cột nào thuộc vai nào.", en: "The same table plays two roles: port of loading and destination. Two aliases tell Postgres which column belongs to which role." }
---
Mình chuẩn bị họp với các hãng tàu để xin giá năm sau. Muốn có giá tốt thì phải biết tuyến nào mình chở nhiều nhất.

## Task
Năm tuyến (cảng đi và cảng đến, ghi bằng tên cảng) nào chở nhiều TEU nhất, tính theo các lô có tàu chạy thực tế từ 01/07 đến hết 30/09/2026? Gửi tên cảng đi, tên cảng đến và tổng TEU; nhiều TEU nhất lên đầu, bằng nhau thì xếp theo tên cảng đi rồi tên cảng đến theo thứ tự chữ cái.

## Hints
1. TEU nằm ở từng container, cảng nằm ở lô hàng, tên cảng nằm ở danh mục cảng. Lô nào đã chạy thì có ngày tàu chạy thực tế, nên lô hủy tự rơi ra.
2. `shipments` nối `containers` (`c.shipment_id = s.id`), nối `ports` hai lần: `o.code = s.pol` và `d.code = s.pod`. Lọc `s.atd >= '2026-07-01' AND s.atd < '2026-10-01'`, cộng `SUM(c.teu)`.
3. `SELECT o.name, d.name, SUM(c.teu) FROM shipments s JOIN containers c ON ... JOIN ports o ON ... JOIN ports d ON ... WHERE ... GROUP BY o.name, d.name ORDER BY 3 DESC, o.name, d.name LIMIT 5`

## Solution
```sql
SELECT o.name, d.name, SUM(c.teu)
FROM shipments s
JOIN containers c ON c.shipment_id = s.id
JOIN ports o ON o.code = s.pol
JOIN ports d ON d.code = s.pod
WHERE s.atd >= '2026-07-01' AND s.atd < '2026-10-01'
GROUP BY o.name, d.name
ORDER BY 3 DESC, o.name, d.name
LIMIT 5
```

# EN
I am getting ready to meet the carriers and negotiate next year's rates. To get good rates I need to know which lanes we ship the most on.

## Task
Which five lanes (port of loading and destination port, by port name) carried the most TEU, counting the shipments that actually sailed from 1 July to 30 September 2026 inclusive? Send the port of loading name, the destination port name and the total TEU; most TEU first, and on a tie, by port of loading name and then destination port name alphabetically.

## Hints
1. TEU is on each container, the ports are on the shipment, and the port names are in the port list. A shipment that sailed has an actual departure date, so cancelled shipments drop out by themselves.
2. `shipments` joined to `containers` (`c.shipment_id = s.id`) and to `ports` twice: `o.code = s.pol` and `d.code = s.pod`. Filter `s.atd >= '2026-07-01' AND s.atd < '2026-10-01'` and add up `SUM(c.teu)`.
3. `SELECT o.name, d.name, SUM(c.teu) FROM shipments s JOIN containers c ON ... JOIN ports o ON ... JOIN ports d ON ... WHERE ... GROUP BY o.name, d.name ORDER BY 3 DESC, o.name, d.name LIMIT 5`
````

**Tạo `content/tickets/ch7/ch7-06.md`:**
````markdown
---
id: ch7-06
chapter: 7
title: "Đánh giá thăng tiến: rà báo giá bán lỗ quý 3"
title_en: "Promotion review: the Q3 below-cost quotes"
from: { name: Trần An, dept: Management }
difficulty: 3
beat: boss
requires: [correlated_value, exists, scalar_subquery, join, aggregate, group_by, order_by]
grants: []
tables: [quotations, rate_contracts, ports, employees, customers, shipments]
ordered: true
columns:
  - [{ vi: "Cảng đến", en: "Destination port" }, { vi: "Số báo giá dưới giá mua", en: "Quotes below the buy rate" }]
  - [{ vi: "Nhân viên kinh doanh", en: "Sales rep" }, { vi: "Số báo giá dưới giá mua", en: "Quotes below the buy rate" }]
  - [{ vi: "Tên khách hàng", en: "Customer name" }, { vi: "Số lô đặt theo giá lỗ", en: "Bookings at a loss" }]
conclusion:
  question: "Nhìn bảng ở bước 1, báo giá bán lỗ quý 3 tập trung ở đâu, và vì sao?"
  options:
    - "Ở ba cảng châu Âu: giá mua tăng từ 15/07/2026 mà báo giá vẫn tính theo giá cũ"
    - "Rải đều mọi tuyến, do nhân viên kinh doanh giảm giá tùy ý"
    - "Ở các tuyến châu Á, do cạnh tranh với hãng tàu"
  answer: 0
conclusion_en:
  question: "Looking at the step 1 table, where are the Q3 below-cost quotes concentrated, and why?"
  options:
    - "On the three European ports: buy rates rose from 15 July 2026 while quotes still used the old rate"
    - "Evenly across all lanes, because sales reps give discounts as they please"
    - "On the Asian lanes, because of competition with the carriers"
---
Đây là buổi đánh giá thăng tiến của bạn. Pricing báo có báo giá quý 3 đang bán dưới giá mua. Trước khi họp với Sales, mình cần ba bảng số. Làm đúng cả ba là bạn nhận thêm mảng phân tích giá.

Mọi bước dùng cùng một định nghĩa: báo giá gửi từ 01/07 đến hết 30/09/2026 có giá bán thấp hơn giá mua của hợp đồng cước còn hiệu lực vào ngày báo giá, cùng cảng đi, cảng đến và loại container.

## Step 1: Báo giá dưới giá mua theo cảng đến
Mỗi cảng đến có bao nhiêu báo giá như vậy? Gửi tên cảng đến và số báo giá; nhiều nhất lên đầu, bằng nhau thì xếp theo tên cảng theo thứ tự chữ cái.
```sql
SELECT p.name, count(*)
FROM quotations q
JOIN ports p ON p.code = q.pod
WHERE q.quote_date >= '2026-07-01' AND q.quote_date < '2026-10-01'
  AND q.sell_usd < (
    SELECT r.buy_usd FROM rate_contracts r
    WHERE r.pol = q.pol AND r.pod = q.pod AND r.container_type = q.container_type
      AND q.quote_date BETWEEN r.valid_from AND r.valid_to
  )
GROUP BY p.name
ORDER BY 2 DESC, p.name
```

## Step 2: Ai đã gửi những báo giá đó
Mỗi nhân viên kinh doanh phụ trách bao nhiêu báo giá như vậy? Gửi họ tên nhân viên và số báo giá; nhiều nhất lên đầu, bằng nhau thì xếp theo họ tên theo thứ tự chữ cái.
```sql
SELECT e.full_name, count(*)
FROM quotations q
JOIN employees e ON e.id = q.sales_rep_id
WHERE q.quote_date >= '2026-07-01' AND q.quote_date < '2026-10-01'
  AND q.sell_usd < (
    SELECT r.buy_usd FROM rate_contracts r
    WHERE r.pol = q.pol AND r.pod = q.pod AND r.container_type = q.container_type
      AND q.quote_date BETWEEN r.valid_from AND r.valid_to
  )
GROUP BY e.id, e.full_name
ORDER BY 2 DESC, e.full_name
```

## Step 3: Khách đã đặt hàng theo giá lỗ
Trong các báo giá như vậy, báo giá nào đã thành booking (lô gắn với báo giá) và lô đó không bị hủy? Theo từng khách: tên khách và số báo giá như vậy; nhiều nhất lên đầu, bằng nhau thì xếp theo tên khách theo thứ tự chữ cái.
```sql
SELECT c.name, count(*)
FROM quotations q
JOIN customers c ON c.id = q.customer_id
WHERE q.quote_date >= '2026-07-01' AND q.quote_date < '2026-10-01'
  AND q.sell_usd < (
    SELECT r.buy_usd FROM rate_contracts r
    WHERE r.pol = q.pol AND r.pod = q.pod AND r.container_type = q.container_type
      AND q.quote_date BETWEEN r.valid_from AND r.valid_to
  )
  AND EXISTS (SELECT 1 FROM shipments s WHERE s.id = q.shipment_id AND s.status <> 'CANCELLED')
GROUP BY c.id, c.name
ORDER BY 2 DESC, c.name
```

## Hints
1. Cả ba bước dùng cùng một bộ lọc "dưới giá mua đang hiệu lực" như bài báo giá lỗ của pricing, chỉ khác cách gom: theo cảng đến, theo nhân viên, theo khách. Bước 3 thêm câu hỏi có hay không: báo giá có lô đi kèm và lô đó không bị hủy.
2. Giá mua: `(SELECT r.buy_usd FROM rate_contracts r WHERE ... AND q.quote_date BETWEEN r.valid_from AND r.valid_to)`. Bước 1 nối `ports` qua `q.pod`; bước 2 nối `employees` qua `q.sales_rep_id`; bước 3 dùng `EXISTS (SELECT 1 FROM shipments s WHERE s.id = q.shipment_id AND s.status <> 'CANCELLED')`.
3. `SELECT p.name, count(*) FROM quotations q JOIN ports p ON p.code = q.pod WHERE ... AND q.sell_usd < (SELECT ...) GROUP BY p.name ORDER BY 2 DESC, p.name`

# EN
This is your promotion review. Pricing reports that some Q3 quotes sell below the buy rate. Before I meet Sales, I need three tables of figures. Get all three right and pricing analysis becomes part of your job.

Every step uses the same definition: quotes sent from 1 July to 30 September 2026 inclusive whose sell rate is below the buy rate of the freight contract in force on the quote date, for the same port of loading, destination port and container type.

## Step 1: Below-cost quotes by destination port
How many such quotes does each destination port have? Send the destination port name and the number of quotes; most first, and on a tie, by port name alphabetically.

## Step 2: Who sent those quotes
How many such quotes does each sales rep handle? Send the sales rep's full name and the number of quotes; most first, and on a tie, by full name alphabetically.

## Step 3: Customers who booked at a loss
Among those quotes, which ones became a booking (a shipment linked to the quote) that was not cancelled? Per customer: the customer name and the number of such quotes; most first, and on a tie, by customer name alphabetically.

## Hints
1. All three steps use the same "below the buy rate in force" filter as pricing's below-cost task; only the grouping changes: by destination port, by sales rep, by customer. Step 3 adds a yes-or-no question: the quote has a shipment and that shipment was not cancelled.
2. Buy rate: `(SELECT r.buy_usd FROM rate_contracts r WHERE ... AND q.quote_date BETWEEN r.valid_from AND r.valid_to)`. Step 1 joins `ports` through `q.pod`; step 2 joins `employees` through `q.sales_rep_id`; step 3 uses `EXISTS (SELECT 1 FROM shipments s WHERE s.id = q.shipment_id AND s.status <> 'CANCELLED')`.
3. `SELECT p.name, count(*) FROM quotations q JOIN ports p ON p.code = q.pod WHERE ... AND q.sell_usd < (SELECT ...) GROUP BY p.name ORDER BY 2 DESC, p.name`
````

- [ ] **Step 4: Chạy toàn bộ, xác nhận PASS rồi commit**

Run: `npm test && npx tsc --noEmit`
Expected: tất cả PASS; `contentProblems` rỗng; số dòng như bảng "Số dòng kết quả mong đợi".

```bash
git add content/tickets/ch7 tests/scene.test.ts
git commit -m "content: chapter 7 Quotes and comparisons (6 tickets, VI + EN)"
```

---

### Task 6: Chương 8 · Công nợ & tỷ giá (6 ticket)

**Files:**
- Create: `content/tickets/ch8/ch8-01.md` … `ch8-06.md`
- Modify: `tests/scene.test.ts`

Người hỏi: Phạm Tâm (AR), Nguyễn Quang (kế toán trưởng), Hoàng Thảo (AP), Giám đốc (cột mốc; nhu cầu là của kế toán trưởng, như Q10a của Plan 2). Bẫy twist: tỷ giá chỉ có vào ngày làm việc, hóa đơn nhà cung cấp có cả ngày nghỉ và ngày lễ. Cột mốc kiểm `distinct_on` (mọi bước) và `multi_cte`; bẫy "phí nhiều loại tiền" nằm ở câu kết luận.

- [ ] **Step 1: Bảng hoạt cảnh mong đợi (test viết trước)**

**Sửa `tests/scene.test.ts`** — thay:
```ts
      'ch7-05': { kind: 'yard' }, 'ch7-06': { kind: 'promotion' },
    });
```
bằng:
```ts
      'ch7-05': { kind: 'yard' }, 'ch7-06': { kind: 'promotion' },
      'ch8-01': { kind: 'ledger' }, 'ch8-02': { kind: 'ledger' }, 'ch8-03': { kind: 'ledger' }, 'ch8-04': { kind: 'ledger' },
      'ch8-05': { kind: 'ledger' }, 'ch8-06': { kind: 'promotion' },
    });
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/scene.test.ts`
Expected: FAIL: thiếu `ch8-01` … `ch8-06`.

- [ ] **Step 3: Viết 6 ticket**

**Tạo `content/tickets/ch8/ch8-01.md`:**
````markdown
---
id: ch8-01
chapter: 8
title: Mỗi khách còn nợ bao nhiêu?
title_en: How much does each customer still owe?
from: { name: Phạm Tâm, dept: Finance }
difficulty: 2
beat: teach
format: worked
requires: [join, left_join, group_by, having, coalesce]
grants: [cte]
tables: [invoices, payments, customers]
ordered: true
columns:
  - { vi: "Tên khách hàng", en: "Customer name" }
  - { vi: "Còn nợ (VND)", en: "Still owed (VND)" }
variants:
  - { cut: "2026-10-31", day: "31/10/2026", day_en: "31 October 2026" }
  - { cut: "2026-09-30", day: "30/09/2026", day_en: "30 September 2026" }
  - { cut: "2026-08-31", day: "31/08/2026", day_en: "31 August 2026" }
reflect:
  q: { vi: "Một hóa đơn 100 triệu được trả làm hai lần. Nối thẳng hóa đơn với thanh toán rồi cộng thì tổng tiền hóa đơn của nó thành bao nhiêu?", en: "A 100 million invoice was paid in two instalments. If you join invoices straight to payments and then sum, what does its invoiced total become?" }
  options:
    - { vi: "200 triệu: hóa đơn lặp lại một lần cho mỗi lần trả", en: "200 million: the invoice repeats once for every payment" }
    - { vi: "100 triệu: phép nối không đổi số dòng", en: "100 million: a join never changes the number of rows" }
    - { vi: "50 triệu: phép nối chia đôi", en: "50 million: the join splits it in half" }
  answer: 0
  why: { vi: "Mỗi dòng thanh toán ghép với hóa đơn của nó, nên hóa đơn trả hai lần xuất hiện hai lần. Cộng thanh toán theo hóa đơn trước (CTE), rồi mới nối: mỗi hóa đơn còn đúng một dòng.", en: "Every payment row is matched with its invoice, so an invoice paid twice appears twice. Total the payments per invoice first (a CTE), then join: each invoice stays one row." }
wrong:
  - sql: "SELECT c.name, SUM(i.amount_vnd) - COALESCE(SUM(p.amount_vnd), 0) FROM invoices i JOIN customers c ON c.id = i.customer_id LEFT JOIN payments p ON p.invoice_id = i.id AND p.pay_date <= '{{cut}}' WHERE i.issue_date <= '{{cut}}' GROUP BY c.id, c.name HAVING SUM(i.amount_vnd) - COALESCE(SUM(p.amount_vnd), 0) > 0 ORDER BY 2 DESC, c.name"
    vi: "Bạn nối thẳng hóa đơn với thanh toán rồi mới cộng, nên hóa đơn trả nhiều lần bị cộng nhiều lần. Cộng thanh toán theo từng hóa đơn trước, rồi mới nối."
    en: "You joined invoices straight to payments and then summed, so an invoice paid several times is counted several times. Total the payments per invoice first, then join."
---
Cuối tháng mình gửi thư xác nhận công nợ cho từng khách. Số trong thư phải khớp sổ: tổng hóa đơn đã xuất trừ tổng tiền khách đã trả. Khách trả một hóa đơn làm nhiều lần là chuyện thường, nên cộng cho cẩn thận.

Đây là lần đầu bạn chia một câu truy vấn thành bước có tên, nên mình gửi kèm ví dụ mẫu. Đọc ví dụ, chạy thử, rồi làm phần của bạn.

## Task
Tính đến hết ngày {{day}}, mỗi khách còn nợ bao nhiêu đồng? Số nợ bằng tổng các hóa đơn xuất đến hết ngày đó trừ tổng tiền khách đã trả đến hết ngày đó cho các hóa đơn ấy. Chỉ ghi khách còn nợ lớn hơn 0. Gửi tên khách và số còn nợ; nợ nhiều nhất lên đầu, bằng nhau thì xếp theo tên khách theo thứ tự chữ cái.

## Example
```sql
WITH paid AS (                                   -- ①
  SELECT invoice_id, SUM(amount_vnd) AS paid
  FROM payments
  GROUP BY invoice_id                            -- ②
)
SELECT i.invoice_no, i.amount_vnd,
       i.amount_vnd - COALESCE(p.paid, 0) AS open_vnd   -- ③
FROM invoices i
LEFT JOIN paid p ON p.invoice_id = i.id          -- ④
WHERE i.issue_date >= '2026-09-01' AND i.issue_date < '2026-10-01'
  AND i.amount_vnd - COALESCE(p.paid, 0) > 0
ORDER BY open_vnd DESC, i.invoice_no
```
Ví dụ: hóa đơn xuất trong tháng 9/2026 nào khách chưa trả đủ, và còn thiếu bao nhiêu?

① WITH đặt tên cho một bước tính (CTE): ở đây là bảng tạm "paid", dùng như một bảng thật trong câu chính.

② Cộng thanh toán theo từng hóa đơn trước: mỗi hóa đơn còn một dòng, dù khách trả mấy lần.

③ Hóa đơn chưa có đồng nào về thì không có dòng trong "paid", nên COALESCE đổi ô trống thành 0 trước khi trừ.

④ Nối trái để giữ cả hóa đơn chưa được trả.

## Hints
1. Giống ví dụ mẫu: cộng tiền đã trả theo từng hóa đơn trước, nối vào hóa đơn, rồi cộng phần còn thiếu theo khách. Hai mốc ngày: hóa đơn xuất đến hết ngày đó, tiền trả đến hết ngày đó.
2. `WITH paid AS (SELECT invoice_id, SUM(amount_vnd) AS paid FROM payments WHERE pay_date <= '{{cut}}' GROUP BY invoice_id)`. Câu chính: `invoices i` nối `customers`, nối trái `paid`, `WHERE i.issue_date <= '{{cut}}'`, cộng `i.amount_vnd - COALESCE(p.paid, 0)`, giữ nhóm `> 0` bằng `HAVING`.
3. `WITH paid AS (...) SELECT c.name, SUM(i.amount_vnd - COALESCE(p.paid, 0)) FROM invoices i JOIN customers c ON ... LEFT JOIN paid p ON ... WHERE ... GROUP BY c.id, c.name HAVING ... ORDER BY 2 DESC, c.name`

## Solution
```sql
WITH paid AS (
  SELECT invoice_id, SUM(amount_vnd) AS paid
  FROM payments
  WHERE pay_date <= '{{cut}}'
  GROUP BY invoice_id
)
SELECT c.name, SUM(i.amount_vnd - COALESCE(p.paid, 0))
FROM invoices i
JOIN customers c ON c.id = i.customer_id
LEFT JOIN paid p ON p.invoice_id = i.id
WHERE i.issue_date <= '{{cut}}'
GROUP BY c.id, c.name
HAVING SUM(i.amount_vnd - COALESCE(p.paid, 0)) > 0
ORDER BY 2 DESC, c.name
```

# EN
At the end of each month I send every customer a balance confirmation letter. The figure in the letter must match the books: total invoiced minus total the customer has paid. Customers often pay one invoice in several instalments, so add up carefully.

This is the first time you split a query into named steps, so I am sending a worked example along. Read it, run it, then do your part.

## Task
As of the end of {{day_en}}, how much does each customer still owe, in dong? The balance is the total of the invoices issued up to that day minus the total the customer paid on those invoices up to that day. List only customers whose balance is above 0. Send the customer name and the balance; largest balance first, and on a tie, by customer name alphabetically.

## Example
Example: which invoices issued in September 2026 are not fully paid, and how much is still open on each?

① WITH gives a calculation step a name (a CTE): here a temporary table "paid", used like a real table in the main query.

② Payments are totalled per invoice first: each invoice stays one row, however many times the customer paid.

③ An invoice with no payment at all has no row in "paid", so COALESCE turns the empty value into 0 before subtracting.

④ A left join keeps the invoices nobody has paid yet.

## Hints
1. Like the worked example: total the payments per invoice first, join them to the invoices, then add up what is still open per customer. Two cut-offs: invoices issued up to that day, payments made up to that day.
2. `WITH paid AS (SELECT invoice_id, SUM(amount_vnd) AS paid FROM payments WHERE pay_date <= '{{cut}}' GROUP BY invoice_id)`. Main query: `invoices i` joined to `customers`, left-joined to `paid`, `WHERE i.issue_date <= '{{cut}}'`, summing `i.amount_vnd - COALESCE(p.paid, 0)`, keeping groups `> 0` with `HAVING`.
3. `WITH paid AS (...) SELECT c.name, SUM(i.amount_vnd - COALESCE(p.paid, 0)) FROM invoices i JOIN customers c ON ... LEFT JOIN paid p ON ... WHERE ... GROUP BY c.id, c.name HAVING ... ORDER BY 2 DESC, c.name`
````

**Tạo `content/tickets/ch8/ch8-02.md`:**
````markdown
---
id: ch8-02
chapter: 8
title: Ưu tiên nhắc nợ quá hạn
title_en: Who to chase first for overdue debt
from: { name: Phạm Tâm, dept: Finance }
difficulty: 3
beat: develop
format: faded
requires: [cte, scalar_subquery, left_join, coalesce, having]
grants: [multi_cte]
tables: [invoices, payments, customers]
ordered: true
columns:
  - { vi: "Tên khách hàng", en: "Customer name" }
  - { vi: "Nợ quá hạn (VND)", en: "Overdue debt (VND)" }
starter: |
  WITH paid AS (
    SELECT invoice_id, SUM(amount_vnd) AS paid
    FROM payments
    WHERE pay_date <= '{{cut}}'
    GROUP BY invoice_id
  ), overdue AS (
    SELECT i.customer_id, SUM(i.amount_vnd - COALESCE(p.paid, 0)) AS overdue
    FROM invoices i
    LEFT JOIN ___ p ON p.invoice_id = i.id
    WHERE i.due_date < '{{cut}}'
    GROUP BY i.customer_id
    HAVING SUM(i.amount_vnd - COALESCE(p.paid, 0)) > 0
  )
  SELECT c.name, o.overdue
  FROM overdue o
  JOIN customers c ON c.id = o.customer_id
  WHERE o.overdue > (SELECT AVG(overdue) FROM ___)
  ORDER BY o.overdue DESC, c.name
variants:
  - { cut: "2026-10-31", day: "31/10/2026", day_en: "31 October 2026" }
  - { cut: "2026-09-30", day: "30/09/2026", day_en: "30 September 2026" }
  - { cut: "2026-08-31", day: "31/08/2026", day_en: "31 August 2026" }
reflect:
  q: { vi: "Vì sao bước \"overdue\" được dùng hai lần trong câu chính mà không phải viết lại?", en: "Why can the \"overdue\" step be used twice in the main query without writing it again?" }
  options:
    - { vi: "Mỗi CTE là một bảng tạm có tên; câu chính và truy vấn con đều đọc được nó", en: "Each CTE is a named temporary table; the main query and its subqueries can all read it" }
    - { vi: "Postgres tự nhớ kết quả của mọi câu SELECT trước đó", en: "Postgres remembers the result of every earlier SELECT" }
    - { vi: "Không được: phải chép lại phép tính vào truy vấn con", en: "It cannot: the calculation has to be copied into the subquery" }
  answer: 0
  why: { vi: "Các CTE nối tiếp nhau bằng dấu phẩy; bước sau đọc bước trước, và câu chính đọc mọi bước, kể cả bên trong truy vấn con tính trung bình.", en: "Chained CTEs are separated by commas; a later step reads the earlier ones, and the main query reads every step, including inside the subquery that takes the average." }
wrong:
  - sql: "WITH paid AS (SELECT invoice_id, SUM(amount_vnd) AS paid FROM payments WHERE pay_date <= '{{cut}}' GROUP BY invoice_id), overdue AS (SELECT i.customer_id, SUM(i.amount_vnd - COALESCE(p.paid, 0)) AS overdue FROM invoices i LEFT JOIN paid p ON p.invoice_id = i.id WHERE i.due_date < '{{cut}}' GROUP BY i.customer_id HAVING SUM(i.amount_vnd - COALESCE(p.paid, 0)) > 0) SELECT c.name, o.overdue FROM overdue o JOIN customers c ON c.id = o.customer_id WHERE o.overdue > (SELECT SUM(overdue) / (SELECT count(DISTINCT customer_id) FROM invoices) FROM overdue) ORDER BY o.overdue DESC, c.name"
    vi: "Mức trung bình của bạn đang chia cho mọi khách có hóa đơn. Đề lấy trung bình trên các khách đang có nợ quá hạn thôi."
    en: "Your average divides by every customer with an invoice. The request averages over the customers who have overdue debt only."
---
Tuần này mình chỉ đủ thời gian gọi cho một nhóm khách. Mình muốn ưu tiên những khách có nợ quá hạn cao hơn mức nợ quá hạn trung bình.

Câu SQL trong editor đã chia sẵn thành các bước có tên, chỉ còn mấy chỗ trống ___. Bạn điền cho đủ rồi nộp.

## Task
Tính đến hết ngày {{day}}: nợ quá hạn của một khách là phần chưa trả (tính tiền trả đến hết ngày đó) của các hóa đơn có hạn thanh toán trước ngày đó. Trong các khách có nợ quá hạn lớn hơn 0, khách nào nợ quá hạn cao hơn mức trung bình của chính nhóm khách ấy? Gửi tên khách và số nợ quá hạn (đồng); nhiều nhất lên đầu, bằng nhau thì xếp theo tên khách theo thứ tự chữ cái.

## Hints
1. Ba bước: tiền đã trả theo hóa đơn, rồi nợ quá hạn theo khách (chỉ giữ khách còn nợ), rồi so từng khách với trung bình của bước thứ hai.
2. Chỗ trống thứ nhất là bước tiền đã trả: `paid`. Chỗ trống thứ hai là bước có nợ quá hạn theo khách: `overdue`.
3. `... LEFT JOIN paid p ON p.invoice_id = i.id ... WHERE o.overdue > (SELECT AVG(overdue) FROM overdue) ...`

## Solution
```sql
WITH paid AS (
  SELECT invoice_id, SUM(amount_vnd) AS paid
  FROM payments
  WHERE pay_date <= '{{cut}}'
  GROUP BY invoice_id
), overdue AS (
  SELECT i.customer_id, SUM(i.amount_vnd - COALESCE(p.paid, 0)) AS overdue
  FROM invoices i
  LEFT JOIN paid p ON p.invoice_id = i.id
  WHERE i.due_date < '{{cut}}'
  GROUP BY i.customer_id
  HAVING SUM(i.amount_vnd - COALESCE(p.paid, 0)) > 0
)
SELECT c.name, o.overdue
FROM overdue o
JOIN customers c ON c.id = o.customer_id
WHERE o.overdue > (SELECT AVG(overdue) FROM overdue)
ORDER BY o.overdue DESC, c.name
```

# EN
This week I only have time to call one group of customers. I want to start with the customers whose overdue debt is above the average overdue debt.

The SQL in the editor is already split into named steps; only a few ___ blanks are left. Fill them in, then submit.

## Task
As of the end of {{day_en}}: a customer's overdue debt is the unpaid part (counting payments up to that day) of the invoices whose due date is before that day. Among the customers whose overdue debt is above 0, which ones owe more overdue debt than the average of that same group of customers? Send the customer name and the overdue debt (dong); largest first, and on a tie, by customer name alphabetically.

## Hints
1. Three steps: payments per invoice, then overdue debt per customer (keeping only customers who still owe), then compare each customer with the average of the second step.
2. The first blank is the payments step: `paid`. The second blank is the step with overdue debt per customer: `overdue`.
3. `... LEFT JOIN paid p ON p.invoice_id = i.id ... WHERE o.overdue > (SELECT AVG(overdue) FROM overdue) ...`
````

**Tạo `content/tickets/ch8/ch8-03.md`:**
````markdown
---
id: ch8-03
chapter: 8
title: Phân tuổi nợ cuối tháng 10
title_en: October receivables aging
from: { name: Nguyễn Quang, dept: Finance }
difficulty: 3
beat: develop
requires: [cte, conditional_agg, coalesce, date_math, left_join]
grants: []
tables: [invoices, payments, customers]
ordered: true
columns:
  - { vi: "Tên khách hàng", en: "Customer name" }
  - { vi: "Quá hạn 1–30 ngày (VND)", en: "1-30 days overdue (VND)" }
  - { vi: "Quá hạn 31–60 ngày (VND)", en: "31-60 days overdue (VND)" }
  - { vi: "Quá hạn 61–90 ngày (VND)", en: "61-90 days overdue (VND)" }
  - { vi: "Quá hạn trên 90 ngày (VND)", en: "Over 90 days overdue (VND)" }
reflect:
  q: { vi: "Vì sao mỗi nhóm tuổi nợ là một cột tính bằng tổng có điều kiện, chứ không lọc nhóm ở WHERE?", en: "Why is each aging bucket a column computed with a conditional sum, rather than a filter in WHERE?" }
  options:
    - { vi: "Lọc ở WHERE thì mỗi lần chỉ giữ một nhóm; bốn nhóm cần nằm cạnh nhau trên cùng một dòng của khách", en: "A WHERE filter keeps only one bucket at a time; the four buckets have to sit side by side on the customer's row" }
    - { vi: "WHERE không so được số ngày", en: "WHERE cannot compare numbers of days" }
    - { vi: "Tổng có điều kiện chạy nhanh hơn", en: "Conditional sums are faster" }
  answer: 0
  why: { vi: "Đây là kỹ năng đếm có điều kiện của chương 5, chạy trên bước tính phần chưa trả (CTE) của chương này.", en: "This is chapter 5's conditional aggregation, run on top of this chapter's step that computes the unpaid part (a CTE)." }
wrong:
  - sql: "WITH paid AS (SELECT invoice_id, SUM(amount_vnd) AS paid FROM payments GROUP BY invoice_id), unpaid AS (SELECT i.customer_id, DATE '2026-10-31' - i.due_date AS days, i.amount_vnd - COALESCE(p.paid, 0) AS amount FROM invoices i LEFT JOIN paid p ON p.invoice_id = i.id WHERE i.due_date < '2026-10-31' AND i.amount_vnd - COALESCE(p.paid, 0) > 0) SELECT c.name, SUM(amount) FILTER (WHERE days <= 30), SUM(amount) FILTER (WHERE days BETWEEN 31 AND 60), SUM(amount) FILTER (WHERE days BETWEEN 61 AND 90), SUM(amount) FILTER (WHERE days > 90) FROM unpaid u JOIN customers c ON c.id = u.customer_id GROUP BY c.id, c.name ORDER BY SUM(amount) DESC, c.name"
    vi: "Nhóm không có nợ đang để trống. Đề yêu cầu ghi 0: bọc từng tổng trong COALESCE(…, 0), hoặc dùng SUM(CASE … ELSE 0 END)."
    en: "Buckets with no debt are left empty. The request wants 0: wrap each sum in COALESCE(…, 0), or use SUM(CASE … ELSE 0 END)."
---
Kiểm toán đến vào tuần sau và việc đầu tiên họ xin là bảng phân tuổi nợ: nợ quá hạn của từng khách chia theo số ngày đã quá hạn. Nợ quá hạn càng lâu càng khó đòi, nên mình cần thấy rõ từng nhóm.

## Task
Tính đến hết ngày 31/10/2026 (tính mọi khoản khách đã trả đến hôm nay): với từng hóa đơn có hạn thanh toán trước 31/10/2026 mà chưa được trả đủ, phần chưa trả quá hạn bao nhiêu ngày (31/10/2026 trừ hạn thanh toán)? Mỗi khách có nợ quá hạn một dòng: tên khách và tổng phần chưa trả theo bốn nhóm số ngày quá hạn, mỗi nhóm một cột: 1 đến 30 ngày, 31 đến 60, 61 đến 90, trên 90 ngày. Nhóm không có nợ ghi 0. Khách có tổng nợ quá hạn lớn nhất lên đầu, bằng nhau thì xếp theo tên khách theo thứ tự chữ cái.

## Hints
1. Hai bước: tính phần chưa trả và số ngày quá hạn của từng hóa đơn (như bài nhắc nợ), rồi cộng theo khách, mỗi nhóm số ngày một cột như bảng đếm theo luồng ở chương 5.
2. Bước một (CTE): `invoices` nối trái tiền đã trả theo hóa đơn, `DATE '2026-10-31' - i.due_date AS days`, giữ `i.due_date < '2026-10-31'` và phần chưa trả `> 0`. Mỗi cột: `SUM(CASE WHEN days BETWEEN 31 AND 60 THEN amount ELSE 0 END)`.
3. `WITH paid AS (...), unpaid AS (...) SELECT c.name, SUM(CASE ...), SUM(CASE ...), SUM(CASE ...), SUM(CASE ...) FROM unpaid u JOIN customers c ON ... GROUP BY c.id, c.name ORDER BY SUM(amount) DESC, c.name`

## Solution
```sql
WITH paid AS (
  SELECT invoice_id, SUM(amount_vnd) AS paid
  FROM payments
  GROUP BY invoice_id
), unpaid AS (
  SELECT i.customer_id, DATE '2026-10-31' - i.due_date AS days, i.amount_vnd - COALESCE(p.paid, 0) AS amount
  FROM invoices i
  LEFT JOIN paid p ON p.invoice_id = i.id
  WHERE i.due_date < '2026-10-31' AND i.amount_vnd - COALESCE(p.paid, 0) > 0
)
SELECT c.name,
  SUM(CASE WHEN days <= 30 THEN amount ELSE 0 END),
  SUM(CASE WHEN days BETWEEN 31 AND 60 THEN amount ELSE 0 END),
  SUM(CASE WHEN days BETWEEN 61 AND 90 THEN amount ELSE 0 END),
  SUM(CASE WHEN days > 90 THEN amount ELSE 0 END)
FROM unpaid u
JOIN customers c ON c.id = u.customer_id
GROUP BY c.id, c.name
ORDER BY SUM(amount) DESC, c.name
```

# EN
The auditors arrive next week, and the first thing they ask for is the receivables aging table: each customer's overdue debt split by how many days overdue it is. The older the debt, the harder it is to collect, so I need each bucket clearly.

## Task
As of the end of 31 October 2026 (counting every payment received up to today): for each invoice whose due date is before 31 October 2026 and that is not fully paid, how many days overdue is the unpaid part (31 October 2026 minus the due date)? One row per customer with overdue debt: the customer name and the total unpaid amount in four buckets of days overdue, one column each: 1 to 30 days, 31 to 60, 61 to 90, over 90 days. A bucket with no debt shows 0. Customer with the largest total overdue debt first, and on a tie, by customer name alphabetically.

## Hints
1. Two steps: the unpaid part and days overdue of each invoice (as in the chasing task), then a total per customer with one column per bucket, like the per-lane count table in chapter 5.
2. Step one (a CTE): `invoices` left-joined to payments per invoice, `DATE '2026-10-31' - i.due_date AS days`, keeping `i.due_date < '2026-10-31'` and an unpaid part `> 0`. Each column: `SUM(CASE WHEN days BETWEEN 31 AND 60 THEN amount ELSE 0 END)`.
3. `WITH paid AS (...), unpaid AS (...) SELECT c.name, SUM(CASE ...), SUM(CASE ...), SUM(CASE ...), SUM(CASE ...) FROM unpaid u JOIN customers c ON ... GROUP BY c.id, c.name ORDER BY SUM(amount) DESC, c.name`
````

**Tạo `content/tickets/ch8/ch8-04.md`:**
````markdown
---
id: ch8-04
chapter: 8
title: Quy đổi hóa đơn nhà cung cấp ra VND
title_en: Supplier bills in dong
from: { name: Hoàng Thảo, dept: Finance }
difficulty: 3
beat: twist
requires: [join, where, order_by]
grants: [distinct_on]
tables: [vendor_bills, exchange_rates]
ordered: false
columns:
  - { vi: "Số hóa đơn nhà cung cấp", en: "Supplier bill number" }
  - { vi: "Ngày hóa đơn", en: "Bill date" }
  - { vi: "Loại tiền", en: "Currency" }
  - { vi: "Số tiền nguyên tệ", en: "Amount in that currency" }
  - { vi: "Tỷ giá dùng (VND)", en: "Rate used (VND)" }
  - { vi: "Số tiền VND", en: "Amount in VND" }
variants:
  - { from: "2026-10-19", to: "2026-10-25", d1: "19/10/2026", d2: "25/10/2026", d1_en: "19 October 2026", d2_en: "25 October 2026" }
  - { from: "2026-08-31", to: "2026-09-06", d1: "31/08/2026", d2: "06/09/2026", d1_en: "31 August 2026", d2_en: "6 September 2026" }
  - { from: "2026-04-27", to: "2026-05-03", d1: "27/04/2026", d2: "03/05/2026", d1_en: "27 April 2026", d2_en: "3 May 2026" }
reflect:
  q: { vi: "Trong DISTINCT ON (b.id) … ORDER BY b.id, r.rate_date DESC, phần nào quyết định giữ tỷ giá nào?", en: "In DISTINCT ON (b.id) … ORDER BY b.id, r.rate_date DESC, which part decides which rate is kept?" }
  options:
    - { vi: "r.rate_date DESC: trong mỗi hóa đơn, dòng có ngày tỷ giá muộn nhất (không sau ngày hóa đơn) đứng đầu và được giữ", en: "r.rate_date DESC: within each bill, the row with the latest rate date (not after the bill date) comes first and is kept" }
    - { vi: "b.id: hóa đơn có số nhỏ nhất được giữ", en: "b.id: the bill with the smallest id is kept" }
    - { vi: "DISTINCT ON tự chọn tỷ giá trung bình", en: "DISTINCT ON picks the average rate by itself" }
  answer: 0
  why: { vi: "DISTINCT ON giữ dòng đầu tiên của mỗi nhóm theo thứ tự ORDER BY. Cột nhóm đứng đầu ORDER BY, cột chọn dòng (ngày tỷ giá giảm dần) đứng sau.", en: "DISTINCT ON keeps the first row of each group in ORDER BY order. The group column comes first in ORDER BY, then the column that picks the row (rate date, newest first)." }
wrong:
  - sql: "SELECT b.bill_no, b.bill_date, b.currency, b.amount, r.vnd_per_unit, ROUND(b.amount * r.vnd_per_unit) FROM vendor_bills b JOIN exchange_rates r ON r.currency = b.currency AND r.rate_date = b.bill_date WHERE b.bill_date BETWEEN '{{from}}' AND '{{to}}'"
    vi: "Bạn chỉ ghép tỷ giá đúng ngày hóa đơn, nên hóa đơn vào thứ Bảy, Chủ nhật hay ngày lễ bị rơi mất. Những ngày đó không có tỷ giá: dùng tỷ giá của ngày làm việc gần nhất trước đó."
    en: "You only match the rate of the bill date itself, so bills dated on a Saturday, Sunday or public holiday disappear. Those days have no rate: use the rate of the latest working day before."
  - sql: "SELECT DISTINCT ON (b.id) b.bill_no, b.bill_date, b.currency, b.amount, r.vnd_per_unit, ROUND(b.amount * r.vnd_per_unit) FROM vendor_bills b JOIN exchange_rates r ON r.currency = b.currency AND r.rate_date <= b.bill_date WHERE b.bill_date BETWEEN '{{from}}' AND '{{to}}' ORDER BY b.id, r.rate_date"
    vi: "Bạn đang giữ tỷ giá cũ nhất trong bảng. Sắp ngày tỷ giá giảm dần (DESC) để dòng giữ lại là tỷ giá gần nhất trước ngày hóa đơn."
    en: "You are keeping the oldest rate in the table. Sort the rate date descending (DESC) so the row kept is the latest rate on or before the bill date."
---
Hãng tàu và đại lý nước ngoài gửi hóa đơn bằng đô la Mỹ hoặc euro, và gửi cả cuối tuần. Sổ của mình ghi bằng đồng, theo tỷ giá ngày hóa đơn. Ngân hàng chỉ công bố tỷ giá vào ngày làm việc, nên hóa đơn ngày nghỉ thì lấy tỷ giá của ngày làm việc gần nhất trước đó.

## Task
Với mọi hóa đơn nhà cung cấp có ngày hóa đơn từ {{d1}} đến hết {{d2}}: quy đổi ra đồng bằng tỷ giá của chính loại tiền đó vào ngày hóa đơn; ngày hóa đơn không có tỷ giá (thứ Bảy, Chủ nhật, ngày lễ) thì dùng tỷ giá của ngày gần nhất trước đó có tỷ giá. Gửi số hóa đơn, ngày hóa đơn, loại tiền, số tiền nguyên tệ, tỷ giá đã dùng và số tiền đồng (số tiền nhân tỷ giá, làm tròn tới đồng, không lấy số lẻ). Không cần sắp xếp.

## Hints
1. Mỗi hóa đơn ghép với mọi tỷ giá cùng loại tiền từ ngày hóa đơn trở về trước, rồi chỉ giữ một dòng cho mỗi hóa đơn: dòng có ngày tỷ giá muộn nhất.
2. Bảng `exchange_rates` (cột `currency`, `rate_date`, `vnd_per_unit`). Ghép `r.currency = b.currency AND r.rate_date <= b.bill_date`. Giữ một dòng mỗi hóa đơn: `SELECT DISTINCT ON (b.id) ... ORDER BY b.id, r.rate_date DESC`. Tiền đồng: `ROUND(b.amount * r.vnd_per_unit)`.
3. `SELECT DISTINCT ON (b.id) b.bill_no, b.bill_date, b.currency, b.amount, r.vnd_per_unit, ROUND(b.amount * r.vnd_per_unit) FROM vendor_bills b JOIN exchange_rates r ON ... WHERE b.bill_date BETWEEN '{{from}}' AND '{{to}}' ORDER BY b.id, r.rate_date DESC`

## Solution
```sql
SELECT DISTINCT ON (b.id) b.bill_no, b.bill_date, b.currency, b.amount, r.vnd_per_unit, ROUND(b.amount * r.vnd_per_unit)
FROM vendor_bills b
JOIN exchange_rates r ON r.currency = b.currency AND r.rate_date <= b.bill_date
WHERE b.bill_date BETWEEN '{{from}}' AND '{{to}}'
ORDER BY b.id, r.rate_date DESC
```

# EN
Carriers and overseas agents bill us in US dollars or euros, and they send bills at weekends too. Our books are kept in dong at the rate of the bill date. The bank only publishes rates on working days, so a bill dated on a day off takes the rate of the latest working day before it.

## Task
For every supplier bill dated from {{d1_en}} to {{d2_en}} inclusive: convert it to dong at the rate of its own currency on the bill date; when the bill date has no rate (Saturday, Sunday, public holiday), use the rate of the latest earlier day that has one. Send the bill number, bill date, currency, amount in that currency, the rate used and the amount in dong (amount times rate, rounded to the whole dong, no decimals). Any order.

## Hints
1. Match each bill with every rate of the same currency on or before the bill date, then keep one row per bill: the one with the latest rate date.
2. Table `exchange_rates` (columns `currency`, `rate_date`, `vnd_per_unit`). Match `r.currency = b.currency AND r.rate_date <= b.bill_date`. One row per bill: `SELECT DISTINCT ON (b.id) ... ORDER BY b.id, r.rate_date DESC`. Amount in dong: `ROUND(b.amount * r.vnd_per_unit)`.
3. `SELECT DISTINCT ON (b.id) b.bill_no, b.bill_date, b.currency, b.amount, r.vnd_per_unit, ROUND(b.amount * r.vnd_per_unit) FROM vendor_bills b JOIN exchange_rates r ON ... WHERE b.bill_date BETWEEN '{{from}}' AND '{{to}}' ORDER BY b.id, r.rate_date DESC`
````

**Tạo `content/tickets/ch8/ch8-05.md`:**
````markdown
---
id: ch8-05
chapter: 8
title: Hóa đơn của lô đã hủy
title_en: Bills for cancelled shipments
from: { name: Hoàng Thảo, dept: Finance }
difficulty: 2
beat: rest
requires: [in_subquery, where, order_by]
grants: []
tables: [vendor_bills, shipments]
ordered: true
columns:
  - { vi: "Số hóa đơn nhà cung cấp", en: "Supplier bill number" }
  - { vi: "Ngày hóa đơn", en: "Bill date" }
  - { vi: "Loại tiền", en: "Currency" }
  - { vi: "Số tiền nguyên tệ", en: "Amount in that currency" }
reflect:
  q: { vi: "Lô đã hủy thì sao vẫn có hóa đơn nhà cung cấp?", en: "How can a cancelled shipment still have a supplier bill?" }
  options:
    - { vi: "Hãng tàu, nhà xe vẫn tính phí hủy chỗ hay phí đã phát sinh; hủy trên sổ booking không xóa khoản phải trả", en: "Carriers and truckers still charge a cancellation fee or costs already incurred; cancelling in the booking book does not erase the bill" }
    - { vi: "Đó là lỗi dữ liệu, nên xóa đi", en: "It is a data error and should be deleted" }
    - { vi: "Hóa đơn được tạo trước khi lô tồn tại", en: "The bill was created before the shipment existed" }
  answer: 0
  why: { vi: "Dữ liệu tiền thường sống lâu hơn trạng thái lô. Muốn đòi hoàn hay dừng trả, phải tìm chúng bằng danh sách lô đã hủy.", en: "Money records often outlive the shipment's status. To claim a refund or stop a payment, you find them through the list of cancelled shipments." }
---
Lô đã hủy mà vẫn có hóa đơn nhà cung cấp thì hoặc mình đòi lại tiền, hoặc dừng thanh toán trước khi chuyển khoản. Mình cần danh sách tháng này để rà.

## Task
Hóa đơn nhà cung cấp nào có ngày hóa đơn trong tháng 10/2026 mà thuộc lô đã bị hủy? Gửi số hóa đơn, ngày hóa đơn, loại tiền và số tiền nguyên tệ; ngày hóa đơn sớm nhất lên đầu, cùng ngày thì số hóa đơn nhỏ hơn đứng trước.

## Hints
1. Danh sách lô đã hủy là một câu truy vấn riêng; giữ hóa đơn có mã lô nằm trong danh sách đó, như bài báo giá cho khách chủ lực.
2. `vendor_bills` lọc `bill_date >= '2026-10-01' AND bill_date < '2026-11-01'` và `shipment_id IN (SELECT id FROM shipments WHERE status = 'CANCELLED')`.
3. `SELECT bill_no, bill_date, currency, amount FROM vendor_bills WHERE ... AND shipment_id IN (SELECT ...) ORDER BY bill_date, bill_no`

## Solution
```sql
SELECT bill_no, bill_date, currency, amount
FROM vendor_bills
WHERE bill_date >= '2026-10-01' AND bill_date < '2026-11-01'
  AND shipment_id IN (SELECT id FROM shipments WHERE status = 'CANCELLED')
ORDER BY bill_date, bill_no
```

# EN
A cancelled shipment that still has a supplier bill means we either claim the money back or stop the payment before the transfer goes out. I need this month's list to check.

## Task
Which supplier bills dated in October 2026 belong to a shipment that was cancelled? Send the bill number, bill date, currency and amount in that currency; earliest bill date first, and on the same date, the smaller bill number first.

## Hints
1. The list of cancelled shipments is a query of its own; keep the bills whose shipment is in that list, as in the key-account quotes task.
2. `vendor_bills` filtered by `bill_date >= '2026-10-01' AND bill_date < '2026-11-01'` and `shipment_id IN (SELECT id FROM shipments WHERE status = 'CANCELLED')`.
3. `SELECT bill_no, bill_date, currency, amount FROM vendor_bills WHERE ... AND shipment_id IN (SELECT ...) ORDER BY bill_date, bill_no`
````

**Tạo `content/tickets/ch8/ch8-06.md`:**
````markdown
---
id: ch8-06
chapter: 8
title: "Đánh giá thăng tiến: lãi gộp các lô tháng 9"
title_en: "Promotion review: gross profit of the September bookings"
from: { name: Trần An, dept: Management }
difficulty: 4
beat: boss
requires: [distinct_on, multi_cte, cte, coalesce, join, multi_join, aggregate, group_by, order_by]
grants: []
tables: [shipments, invoices, vendor_bills, exchange_rates, ports]
ordered: true
columns:
  - [{ vi: "Tổng doanh thu (VND)", en: "Total revenue (VND)" }, { vi: "Tổng chi phí (VND)", en: "Total cost (VND)" }, { vi: "Lãi gộp (VND)", en: "Gross profit (VND)" }]
  - [{ vi: "Mã lô", en: "Shipment ref" }, { vi: "Cảng đến", en: "Destination port" }, { vi: "Lãi gộp (VND)", en: "Gross profit (VND)" }]
  - [{ vi: "Cảng đi", en: "Port of loading" }, { vi: "Cảng đến", en: "Destination port" }, { vi: "Tổng lỗ (VND)", en: "Total loss (VND)" }]
conclusion:
  question: "Kế toán trưởng hỏi: nếu cộng thẳng số tiền trên hóa đơn nhà cung cấp, không quy đổi, thì chi phí sai thế nào?"
  options:
    - "Sai hoàn toàn: đô la và euro bị cộng như thể là đồng, chi phí nhỏ đi hàng chục nghìn lần"
    - "Không sai, vì mọi hóa đơn nhà cung cấp đều ghi bằng đồng"
    - "Chỉ lệch vài đồng do làm tròn"
  answer: 0
conclusion_en:
  question: "The chief accountant asks: if the supplier bill amounts were added up as they are, without conversion, how wrong would the cost be?"
  options:
    - "Completely wrong: dollars and euros would be added as if they were dong, making the cost tens of thousands of times too small"
    - "Not wrong at all, because every supplier bill is in dong"
    - "Off by a few dong because of rounding"
---
Đây là buổi đánh giá thăng tiến của bạn. Kế toán trưởng đang chốt sổ quý 3 và nhờ mình xem lãi gộp các lô đặt trong tháng 9/2026. Bạn chuẩn bị ba bảng; làm đúng cả ba là bạn nhận thêm mảng báo cáo tài chính.

Mọi bước dùng cùng cách tính, cho các lô có ngày đặt chỗ trong tháng 9/2026 và đã có hóa đơn bán: doanh thu là tổng các hóa đơn bán của lô (đồng); chi phí là tổng các hóa đơn nhà cung cấp của lô, mỗi hóa đơn quy ra đồng theo tỷ giá ngày hóa đơn hoặc ngày gần nhất trước đó có tỷ giá; lô chưa có hóa đơn nhà cung cấp nào thì chi phí là 0; lãi gộp bằng doanh thu trừ chi phí. Không làm tròn từng hóa đơn, chỉ làm tròn con số cuối cùng của mỗi dòng tới đồng.

## Step 1: Tổng cả tháng
Một dòng: tổng doanh thu, tổng chi phí và tổng lãi gộp của các lô đó.
```sql
WITH rate AS (
  SELECT DISTINCT ON (b.id) b.shipment_id, b.amount * r.vnd_per_unit AS cost_vnd
  FROM vendor_bills b
  JOIN exchange_rates r ON r.currency = b.currency AND r.rate_date <= b.bill_date
  ORDER BY b.id, r.rate_date DESC
), cost AS (
  SELECT shipment_id, SUM(cost_vnd) AS cost FROM rate GROUP BY shipment_id
), rev AS (
  SELECT shipment_id, SUM(amount_vnd) AS rev FROM invoices GROUP BY shipment_id
)
SELECT ROUND(SUM(rev.rev)), ROUND(SUM(COALESCE(cost.cost, 0))), ROUND(SUM(rev.rev - COALESCE(cost.cost, 0)))
FROM shipments s
JOIN rev ON rev.shipment_id = s.id
LEFT JOIN cost ON cost.shipment_id = s.id
WHERE s.booking_date >= '2026-09-01' AND s.booking_date < '2026-10-01'
```

## Step 2: Những lô bị lỗ
Lô nào có lãi gộp nhỏ hơn 0? Gửi mã lô, tên cảng đến và lãi gộp; lỗ nhiều nhất lên đầu, bằng nhau thì mã lô nhỏ hơn đứng trước.
```sql
WITH rate AS (
  SELECT DISTINCT ON (b.id) b.shipment_id, b.amount * r.vnd_per_unit AS cost_vnd
  FROM vendor_bills b
  JOIN exchange_rates r ON r.currency = b.currency AND r.rate_date <= b.bill_date
  ORDER BY b.id, r.rate_date DESC
), cost AS (
  SELECT shipment_id, SUM(cost_vnd) AS cost FROM rate GROUP BY shipment_id
), rev AS (
  SELECT shipment_id, SUM(amount_vnd) AS rev FROM invoices GROUP BY shipment_id
)
SELECT s.ref, p.name, ROUND(rev.rev - COALESCE(cost.cost, 0))
FROM shipments s
JOIN rev ON rev.shipment_id = s.id
LEFT JOIN cost ON cost.shipment_id = s.id
JOIN ports p ON p.code = s.pod
WHERE s.booking_date >= '2026-09-01' AND s.booking_date < '2026-10-01'
  AND rev.rev - COALESCE(cost.cost, 0) < 0
ORDER BY 3, s.ref
```

## Step 3: Lỗ theo tuyến
Cộng lãi gộp của các lô bị lỗ theo tuyến (tên cảng đi và tên cảng đến). Gửi tên cảng đi, tên cảng đến và tổng lỗ (số âm); lỗ nhiều nhất lên đầu, bằng nhau thì xếp theo tên cảng đi rồi tên cảng đến theo thứ tự chữ cái.
```sql
WITH rate AS (
  SELECT DISTINCT ON (b.id) b.shipment_id, b.amount * r.vnd_per_unit AS cost_vnd
  FROM vendor_bills b
  JOIN exchange_rates r ON r.currency = b.currency AND r.rate_date <= b.bill_date
  ORDER BY b.id, r.rate_date DESC
), cost AS (
  SELECT shipment_id, SUM(cost_vnd) AS cost FROM rate GROUP BY shipment_id
), rev AS (
  SELECT shipment_id, SUM(amount_vnd) AS rev FROM invoices GROUP BY shipment_id
), profit AS (
  SELECT s.pol, s.pod, rev.rev - COALESCE(cost.cost, 0) AS profit
  FROM shipments s
  JOIN rev ON rev.shipment_id = s.id
  LEFT JOIN cost ON cost.shipment_id = s.id
  WHERE s.booking_date >= '2026-09-01' AND s.booking_date < '2026-10-01'
)
SELECT o.name, d.name, ROUND(SUM(profit))
FROM profit
JOIN ports o ON o.code = profit.pol
JOIN ports d ON d.code = profit.pod
WHERE profit < 0
GROUP BY o.name, d.name
ORDER BY 3, o.name, d.name
```

## Hints
1. Ba bước tính dùng lại cho cả ba bảng: chi phí từng hóa đơn nhà cung cấp quy ra đồng (tỷ giá gần nhất như bài của kế toán công nợ phải trả), cộng chi phí theo lô, cộng doanh thu theo lô. Cộng riêng từng bảng tiền rồi mới nối vào lô, để không nhân đôi.
2. `WITH rate AS (SELECT DISTINCT ON (b.id) b.shipment_id, b.amount * r.vnd_per_unit AS cost_vnd FROM vendor_bills b JOIN exchange_rates r ON ... ORDER BY b.id, r.rate_date DESC), cost AS (...), rev AS (...)`. Lô chưa có chi phí: `COALESCE(cost.cost, 0)`. Bước 2 nối `ports` qua `s.pod`; bước 3 nối `ports` hai lần.
3. `... SELECT ROUND(SUM(rev.rev)), ROUND(SUM(COALESCE(cost.cost, 0))), ROUND(SUM(rev.rev - COALESCE(cost.cost, 0))) FROM shipments s JOIN rev ON ... LEFT JOIN cost ON ... WHERE s.booking_date >= '2026-09-01' AND s.booking_date < '2026-10-01'`

# EN
This is your promotion review. The chief accountant is closing the Q3 books and has asked me to look at the gross profit of the shipments booked in September 2026. You prepare three tables; get all three right and financial reporting becomes part of your job.

Every step uses the same calculation, for the shipments with a booking date in September 2026 that already have a sales invoice: revenue is the total of the shipment's sales invoices (dong); cost is the total of the shipment's supplier bills, each converted to dong at the rate of the bill date or of the latest earlier day that has a rate; a shipment with no supplier bill yet has a cost of 0; gross profit is revenue minus cost. Do not round each bill; round only the final figure of each row to the whole dong.

## Step 1: The month in total
One row: total revenue, total cost and total gross profit of those shipments.

## Step 2: The loss-making shipments
Which shipments have a gross profit below 0? Send the shipment ref, the destination port name and the gross profit; biggest loss first, and on a tie, the smaller shipment ref first.

## Step 3: Losses by lane
Add up the gross profit of the loss-making shipments per lane (port of loading name and destination port name). Send the port of loading name, the destination port name and the total loss (a negative number); biggest loss first, and on a tie, by port of loading name and then destination port name alphabetically.

## Hints
1. Three calculation steps serve all three tables: each supplier bill's cost in dong (latest rate, as in the payables task), cost per shipment, revenue per shipment. Total each money table on its own before joining it to the shipments, so nothing is counted twice.
2. `WITH rate AS (SELECT DISTINCT ON (b.id) b.shipment_id, b.amount * r.vnd_per_unit AS cost_vnd FROM vendor_bills b JOIN exchange_rates r ON ... ORDER BY b.id, r.rate_date DESC), cost AS (...), rev AS (...)`. A shipment with no cost yet: `COALESCE(cost.cost, 0)`. Step 2 joins `ports` through `s.pod`; step 3 joins `ports` twice.
3. `... SELECT ROUND(SUM(rev.rev)), ROUND(SUM(COALESCE(cost.cost, 0))), ROUND(SUM(rev.rev - COALESCE(cost.cost, 0))) FROM shipments s JOIN rev ON ... LEFT JOIN cost ON ... WHERE s.booking_date >= '2026-09-01' AND s.booking_date < '2026-10-01'`
````

- [ ] **Step 4: Chạy toàn bộ, xác nhận PASS rồi commit**

Run: `npm test && npx tsc --noEmit`
Expected: tất cả PASS; `contentProblems` rỗng; số dòng như bảng "Số dòng kết quả mong đợi".

```bash
git add content/tickets/ch8 tests/scene.test.ts
git commit -m "content: chapter 8 Receivables and exchange rates (6 tickets, VI + EN)"
```

---

### Task 7: Chương 9 · Đối soát chứng từ (6 ticket)

**Files:**
- Create: `content/tickets/ch9/ch9-01.md` … `ch9-06.md`
- Modify: `tests/scene.test.ts`

Người hỏi: Võ Lan (chứng từ), Phạm Tâm (AR), Hoàng Khánh (Trưởng phòng Ops, bài ôn), Giám đốc. Bẫy twist: lọc tháng ở WHERE sau FULL JOIN làm mất dòng chỉ có ở một bên; dòng lệch nằm ở cả hai sổ (lô chạy mà chưa có HBL trong tháng, HBL trong tháng của lô tháng trước). Cột mốc kiểm `full_join` (bước 3) và `except` (bước 1); xong ch9 → ★ Lead DA.

- [ ] **Step 1: Bảng hoạt cảnh mong đợi (test viết trước)**

**Sửa `tests/scene.test.ts`** — thay:
```ts
      'ch8-05': { kind: 'ledger' }, 'ch8-06': { kind: 'promotion' },
    });
```
bằng:
```ts
      'ch8-05': { kind: 'ledger' }, 'ch8-06': { kind: 'promotion' },
      'ch9-01': { kind: 'yard' }, 'ch9-02': { kind: 'ledger' }, 'ch9-03': { kind: 'yard' }, 'ch9-04': { kind: 'ship' },
      'ch9-05': { kind: 'ship' }, 'ch9-06': { kind: 'promotion' },
    });
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/scene.test.ts`
Expected: FAIL: thiếu `ch9-01` … `ch9-06`.

- [ ] **Step 3: Viết 6 ticket**

**Tạo `content/tickets/ch9/ch9-01.md`:**
````markdown
---
id: ch9-01
chapter: 9
title: Sổ vận đơn phát hành trong tuần
title_en: This week's bills of lading
from: { name: Võ Lan, dept: Ops }
difficulty: 2
beat: teach
format: worked
requires: [where, order_by]
grants: [union]
tables: [master_bills, house_bills]
ordered: true
columns:
  - { vi: "Số vận đơn", en: "Bill of lading number" }
  - { vi: "Loại vận đơn (MBL/HBL)", en: "Bill type (MBL/HBL)" }
  - { vi: "Ngày phát hành", en: "Issue date" }
variants:
  - { from: "2026-10-19", to: "2026-10-25", d1: "19/10/2026", d2: "25/10/2026", d1_en: "19 October 2026", d2_en: "25 October 2026" }
  - { from: "2026-09-21", to: "2026-09-27", d1: "21/09/2026", d2: "27/09/2026", d1_en: "21 September 2026", d2_en: "27 September 2026" }
  - { from: "2026-08-17", to: "2026-08-23", d1: "17/08/2026", d2: "23/08/2026", d1_en: "17 August 2026", d2_en: "23 August 2026" }
reflect:
  q: { vi: "Ở bài này dùng UNION hay UNION ALL thì kết quả có khác không?", en: "In this task, does UNION or UNION ALL change the result?" }
  options:
    - { vi: "Không: số MBL và số HBL không bao giờ trùng, lại có cột loại vận đơn khác nhau, nên chẳng có dòng trùng nào để bỏ", en: "No: MBL and HBL numbers never repeat and the bill type column differs, so there is no duplicate row to drop" }
    - { vi: "Có: UNION luôn bỏ bớt dòng", en: "Yes: UNION always drops some rows" }
    - { vi: "Có: UNION ALL sắp xếp lại kết quả", en: "Yes: UNION ALL re-sorts the result" }
  answer: 0
  why: { vi: "UNION chỉ khác UNION ALL khi có dòng giống hệt nhau ở hai bên, như danh sách cảng trong ví dụ mẫu. Khi chắc không có dòng trùng, UNION ALL đỡ một bước so sánh.", en: "UNION only differs from UNION ALL when identical rows exist, like the port list in the worked example. When there can be no duplicates, UNION ALL skips a comparison step." }
wrong:
  - sql: "SELECT mbl_no, 'MBL', issue_date FROM master_bills UNION ALL SELECT hbl_no, 'HBL', issue_date FROM house_bills WHERE issue_date BETWEEN '{{from}}' AND '{{to}}' ORDER BY 3, 1"
    vi: "Điều kiện ngày chỉ áp cho câu SELECT ngay trước nó, nên danh sách đang có mọi vận đơn chủ từ trước tới nay. Lọc ngày ở cả hai câu SELECT."
    en: "The date condition only applies to the SELECT right before it, so your list has every master bill ever issued. Filter the dates in both SELECTs."
---
Cuối tuần mình nộp sổ vận đơn cho kế toán lưu hồ sơ: mọi vận đơn chủ (MBL, hãng tàu cấp cho mình) và vận đơn nhà (HBL, mình cấp cho khách) phát hành trong tuần, chung một danh sách. Hai loại nằm ở hai sổ khác nhau.

Đây là lần đầu bạn gộp hai danh sách thành một, nên mình gửi kèm ví dụ mẫu. Đọc ví dụ, chạy thử, rồi làm phần của bạn.

## Task
Gom mọi vận đơn chủ và vận đơn nhà phát hành từ {{d1}} đến hết {{d2}} vào một danh sách: số vận đơn, loại vận đơn (ghi MBL hoặc HBL) và ngày phát hành. Ngày phát hành sớm nhất lên đầu, cùng ngày thì xếp theo số vận đơn theo thứ tự chữ cái.

## Example
```sql
SELECT pol AS port                                          -- ①
FROM master_bills
WHERE issue_date >= '2026-09-01' AND issue_date < '2026-10-01'
UNION                                                       -- ②
SELECT pod
FROM master_bills
WHERE issue_date >= '2026-09-01' AND issue_date < '2026-10-01'  -- ③
ORDER BY port                                               -- ④
```
Ví dụ: cảng nào xuất hiện trên vận đơn chủ phát hành trong tháng 9/2026, dù là cảng xếp hàng hay cảng dỡ hàng? Mỗi cảng ghi một lần.

① Câu SELECT đầu đặt tên cột cho cả danh sách gộp.

② UNION xếp kết quả câu sau nối tiếp câu trước và bỏ dòng trùng. UNION ALL giữ cả dòng trùng: ở đây Cát Lái sẽ hiện hàng trăm lần.

③ Mỗi câu SELECT có điều kiện riêng. Hai câu phải có cùng số cột, cột cùng vị trí cùng kiểu.

④ ORDER BY viết một lần ở cuối, sắp cả danh sách gộp.

## Hints
1. Hai sổ, cùng một loại thông tin (số, loại, ngày phát hành): lấy từ từng sổ rồi xếp nối tiếp nhau thành một danh sách. Loại vận đơn là một giá trị cố định viết thẳng trong mỗi câu.
2. Bảng `master_bills` (cột `mbl_no`, `issue_date`) và `house_bills` (cột `hbl_no`, `issue_date`). Loại: `'MBL'` và `'HBL'`. Mỗi câu lọc `issue_date BETWEEN '{{from}}' AND '{{to}}'`.
3. `SELECT mbl_no, 'MBL', issue_date FROM master_bills WHERE ... UNION ALL SELECT hbl_no, 'HBL', issue_date FROM house_bills WHERE ... ORDER BY 3, 1`

## Solution
```sql
SELECT mbl_no, 'MBL', issue_date
FROM master_bills
WHERE issue_date BETWEEN '{{from}}' AND '{{to}}'
UNION ALL
SELECT hbl_no, 'HBL', issue_date
FROM house_bills
WHERE issue_date BETWEEN '{{from}}' AND '{{to}}'
ORDER BY 3, 1
```

# EN
At the end of each week I hand the bill of lading register to accounting for filing: every master bill (MBL, which the carrier issues to us) and every house bill (HBL, which we issue to the customer) issued that week, in one list. The two kinds live in two different books.

This is the first time you combine two lists into one, so I am sending a worked example along. Read it, run it, then do your part.

## Task
Put every master bill and house bill issued from {{d1_en}} to {{d2_en}} inclusive into one list: bill number, bill type (MBL or HBL) and issue date. Earliest issue date first, and on the same date, by bill number alphabetically.

## Example
Example: which ports appear on the master bills issued in September 2026, as port of loading or port of discharge? Each port once.

① The first SELECT names the columns of the whole combined list.

② UNION appends the second query's rows after the first and drops duplicate rows. UNION ALL keeps the duplicates: here Cat Lai would appear hundreds of times.

③ Each SELECT has its own conditions. Both need the same number of columns, with the same type in the same position.

④ ORDER BY is written once, at the end, and sorts the whole combined list.

## Hints
1. Two books, the same kind of information (number, type, issue date): take it from each book and append one list after the other. The bill type is a fixed value written straight into each query.
2. Tables `master_bills` (columns `mbl_no`, `issue_date`) and `house_bills` (columns `hbl_no`, `issue_date`). Type: `'MBL'` and `'HBL'`. Each query filters `issue_date BETWEEN '{{from}}' AND '{{to}}'`.
3. `SELECT mbl_no, 'MBL', issue_date FROM master_bills WHERE ... UNION ALL SELECT hbl_no, 'HBL', issue_date FROM house_bills WHERE ... ORDER BY 3, 1`
````

**Tạo `content/tickets/ch9/ch9-02.md`:**
````markdown
---
id: ch9-02
chapter: 9
title: Đã giao hàng mà chưa xuất hóa đơn
title_en: Delivered but not invoiced
from: { name: Phạm Tâm, dept: Finance }
difficulty: 2
beat: develop
format: faded
requires: [join, anti_join, order_by]
grants: [except]
tables: [shipment_events, shipments, invoices]
ordered: true
columns:
  - { vi: "Mã lô", en: "Shipment ref" }
starter: |
  SELECT s.ref
  FROM shipment_events e
  JOIN shipments s ON s.id = e.shipment_id
  WHERE e.event = 'DELIVERED' AND e.event_date >= '{{from}}' AND e.event_date < '{{to}}'
  ___
  SELECT s.ref
  FROM ___ i
  JOIN shipments s ON s.id = i.shipment_id
  ORDER BY 1
variants:
  - { from: "2026-10-01", to: "2026-11-01", month: "10/2026", month_en: "October 2026" }
  - { from: "2026-09-01", to: "2026-10-01", month: "09/2026", month_en: "September 2026" }
  - { from: "2026-08-01", to: "2026-09-01", month: "08/2026", month_en: "August 2026" }
reflect:
  q: { vi: "Nếu thêm ngày giao hàng làm cột thứ hai ở câu trên (và ngày xuất hóa đơn ở câu dưới), kết quả sẽ ra sao?", en: "If you added the delivery date as a second column in the first query (and the invoice date in the second), what would happen?" }
  options:
    - { vi: "Gần như mọi lô đã giao đều hiện ra, vì EXCEPT so cả dòng và hai ngày ấy khác nhau", en: "Almost every delivered shipment would show up, because EXCEPT compares whole rows and those two dates differ" }
    - { vi: "Không đổi gì, EXCEPT chỉ so cột đầu", en: "Nothing changes; EXCEPT only compares the first column" }
    - { vi: "Postgres báo lỗi vì cột ngày không so được", en: "Postgres raises an error because date columns cannot be compared" }
  answer: 0
  why: { vi: "EXCEPT bỏ một dòng chỉ khi bên kia có dòng giống hệt. Giữ hai bên đúng những cột cùng ý nghĩa (ở đây chỉ mã lô), rồi nối thêm thông tin khác sau.", en: "EXCEPT removes a row only when the other side has an identical row. Keep both sides to columns with the same meaning (here only the shipment ref), then join extra details afterwards." }
wrong:
  - sql: "SELECT s.ref FROM shipment_events e JOIN shipments s ON s.id = e.shipment_id WHERE e.event = 'DELIVERED' AND e.event_date >= '{{from}}' AND e.event_date < '{{to}}' INTERSECT SELECT s.ref FROM invoices i JOIN shipments s ON s.id = i.shipment_id ORDER BY 1"
    vi: "INTERSECT giữ lô có ở cả hai bên: đã giao và đã có hóa đơn. Đề cần lô có ở bên giao hàng mà thiếu ở bên hóa đơn: EXCEPT."
    en: "INTERSECT keeps shipments found on both sides: delivered and invoiced. The request needs the ones on the delivery side that are missing from the invoices: EXCEPT."
---
Lô đã giao cho khách mà chưa xuất hóa đơn là tiền mình làm rồi mà chưa đòi. Mình muốn xuất bù ngay trong kỳ.

Câu SQL trong editor có sẵn hai danh sách: lô đã giao trong tháng, và lô đã có hóa đơn. Bạn điền mấy chỗ trống ___ để lấy phần chênh rồi nộp.

## Task
Lô nào có mốc giao hàng trong tháng {{month}} (theo nhật ký các mốc của lô) mà đến nay chưa có hóa đơn bán nào? Gửi mã lô, xếp theo mã lô theo thứ tự chữ cái.

## Hints
1. Hai danh sách mã lô: một bên là lô đã giao trong tháng, một bên là lô đã có hóa đơn. Cần những mã có ở danh sách thứ nhất mà không có ở danh sách thứ hai.
2. Chỗ trống thứ nhất là phép lấy phần chênh giữa hai câu: `EXCEPT`. Chỗ trống thứ hai là sổ hóa đơn bán: `invoices`.
3. `SELECT s.ref FROM shipment_events e JOIN shipments s ON ... WHERE ... EXCEPT SELECT s.ref FROM invoices i JOIN shipments s ON ... ORDER BY 1`

## Solution
```sql
SELECT s.ref
FROM shipment_events e
JOIN shipments s ON s.id = e.shipment_id
WHERE e.event = 'DELIVERED' AND e.event_date >= '{{from}}' AND e.event_date < '{{to}}'
EXCEPT
SELECT s.ref
FROM invoices i
JOIN shipments s ON s.id = i.shipment_id
ORDER BY 1
```

# EN
A shipment delivered to the customer but never invoiced is work we did and have not billed. I want to invoice them within this period.

The SQL in the editor already has two lists: shipments delivered in the month, and shipments that have an invoice. Fill in the ___ blanks to take the difference, then submit.

## Task
Which shipments have a delivery milestone in {{month_en}} (in the shipment milestone log) and still have no sales invoice at all? Send the shipment ref, sorted by shipment ref alphabetically.

## Hints
1. Two lists of shipment refs: delivered in the month, and invoiced. You need the refs in the first list that are not in the second.
2. The first blank is the operation that takes the difference between the two queries: `EXCEPT`. The second blank is the sales invoice book: `invoices`.
3. `SELECT s.ref FROM shipment_events e JOIN shipments s ON ... WHERE ... EXCEPT SELECT s.ref FROM invoices i JOIN shipments s ON ... ORDER BY 1`
````

**Tạo `content/tickets/ch9/ch9-03.md`:**
````markdown
---
id: ch9-03
chapter: 9
title: Vận đơn chủ lệch trọng lượng
title_en: Master bills with the wrong weight
from: { name: Võ Lan, dept: Ops }
difficulty: 3
beat: develop
requires: [cte, join, aggregate, group_by, order_by]
grants: []
tables: [master_bills, house_bills]
ordered: true
columns:
  - { vi: "Số vận đơn chủ", en: "Master bill number" }
  - { vi: "Trọng lượng trên MBL (kg)", en: "Weight on the MBL (kg)" }
  - { vi: "Tổng trọng lượng các HBL (kg)", en: "Total weight of the HBLs (kg)" }
  - { vi: "Chênh lệch (%)", en: "Difference (%)" }
reflect:
  q: { vi: "Nếu nối thẳng vận đơn chủ với vận đơn nhà rồi cộng trọng lượng của vận đơn chủ, một MBL có 3 HBL sẽ ra bao nhiêu?", en: "If you join master bills straight to house bills and then sum the master bill's weight, what does an MBL with 3 HBLs come to?" }
  options:
    - { vi: "Gấp 3 trọng lượng thật, nên MBL đó luôn bị báo lệch", en: "Three times its real weight, so that MBL always shows as off" }
    - { vi: "Đúng trọng lượng thật", en: "Exactly its real weight" }
    - { vi: "Một phần ba trọng lượng thật", en: "A third of its real weight" }
  answer: 0
  why: { vi: "Cùng bẫy với bài công nợ ở chương 8: cộng trọng lượng các HBL theo MBL trước (CTE), rồi mới nối vào MBL; mỗi MBL còn đúng một dòng.", en: "The same trap as the receivables task in chapter 8: total the HBL weights per MBL first (a CTE), then join to the MBL; each MBL stays one row." }
wrong:
  - sql: "SELECT m.mbl_no, SUM(m.gross_weight_kg), SUM(h.gross_weight_kg), ROUND((SUM(h.gross_weight_kg) - SUM(m.gross_weight_kg)) * 100 / SUM(m.gross_weight_kg), 2) FROM master_bills m JOIN house_bills h ON h.master_bill_id = m.id WHERE m.issue_date >= '2026-07-01' AND m.issue_date < '2026-10-01' GROUP BY m.id, m.mbl_no HAVING abs(SUM(h.gross_weight_kg) - SUM(m.gross_weight_kg)) > SUM(m.gross_weight_kg) * 0.01 ORDER BY m.mbl_no"
    vi: "Bạn cộng trọng lượng MBL sau khi nối với các HBL, nên MBL có nhiều HBL bị nhân lên. Cộng trọng lượng các HBL theo MBL trước, rồi mới so với một con số trọng lượng của MBL."
    en: "You summed the MBL weight after joining it to its HBLs, so an MBL with several HBLs is multiplied. Total the HBL weights per MBL first, then compare with the MBL's single weight."
---
Hãng tàu tính cước và khai hải quan theo trọng lượng trên vận đơn chủ, khách thì nhìn vận đơn nhà. Hai bên lệch nhau là bị phạt khai sai hoặc tranh cãi cước. Mình cần soát lại quý 3.

## Task
Với mỗi vận đơn chủ phát hành từ 01/07 đến hết 30/09/2026: so trọng lượng ghi trên vận đơn chủ với tổng trọng lượng các vận đơn nhà thuộc nó. Vận đơn chủ nào lệch hơn 1% so với trọng lượng trên chính nó? Gửi số vận đơn chủ, trọng lượng trên vận đơn chủ, tổng trọng lượng các vận đơn nhà và chênh lệch phần trăm, bằng (tổng các vận đơn nhà trừ vận đơn chủ) chia vận đơn chủ nhân 100, làm tròn 2 chữ số thập phân (âm khi các vận đơn nhà nhẹ hơn). Xếp theo số vận đơn chủ theo thứ tự chữ cái.

## Hints
1. Hai bước: cộng trọng lượng các vận đơn nhà theo vận đơn chủ, rồi nối vào vận đơn chủ và so. Cộng trước rồi mới nối, như bài công nợ ở chương 8.
2. `WITH h AS (SELECT master_bill_id, SUM(gross_weight_kg) AS hbl_kg FROM house_bills GROUP BY master_bill_id)`, nối `master_bills m` qua `h.master_bill_id = m.id`. Lệch hơn 1%: `abs(h.hbl_kg - m.gross_weight_kg) > m.gross_weight_kg * 0.01`.
3. `WITH h AS (...) SELECT m.mbl_no, m.gross_weight_kg, h.hbl_kg, ROUND((h.hbl_kg - m.gross_weight_kg) * 100 / m.gross_weight_kg, 2) FROM master_bills m JOIN h ON ... WHERE ... ORDER BY m.mbl_no`

## Solution
```sql
WITH h AS (
  SELECT master_bill_id, SUM(gross_weight_kg) AS hbl_kg
  FROM house_bills
  GROUP BY master_bill_id
)
SELECT m.mbl_no, m.gross_weight_kg, h.hbl_kg, ROUND((h.hbl_kg - m.gross_weight_kg) * 100 / m.gross_weight_kg, 2)
FROM master_bills m
JOIN h ON h.master_bill_id = m.id
WHERE m.issue_date >= '2026-07-01' AND m.issue_date < '2026-10-01'
  AND abs(h.hbl_kg - m.gross_weight_kg) > m.gross_weight_kg * 0.01
ORDER BY m.mbl_no
```

# EN
Carriers charge freight and declare to customs by the weight on the master bill, while customers look at the house bills. When the two disagree we risk a misdeclaration fine or a freight dispute. I need Q3 checked.

## Task
For each master bill issued from 1 July to 30 September 2026 inclusive: compare the weight on the master bill with the total weight of its house bills. Which master bills are off by more than 1% of their own weight? Send the master bill number, the weight on the master bill, the total weight of the house bills and the percentage difference, which is (house bills total minus master bill) divided by the master bill, times 100, rounded to 2 decimals (negative when the house bills are lighter). Sort by master bill number alphabetically.

## Hints
1. Two steps: total the house bill weights per master bill, then join to the master bills and compare. Total first, then join, as in the chapter 8 receivables task.
2. `WITH h AS (SELECT master_bill_id, SUM(gross_weight_kg) AS hbl_kg FROM house_bills GROUP BY master_bill_id)`, joined to `master_bills m` through `h.master_bill_id = m.id`. More than 1% off: `abs(h.hbl_kg - m.gross_weight_kg) > m.gross_weight_kg * 0.01`.
3. `WITH h AS (...) SELECT m.mbl_no, m.gross_weight_kg, h.hbl_kg, ROUND((h.hbl_kg - m.gross_weight_kg) * 100 / m.gross_weight_kg, 2) FROM master_bills m JOIN h ON ... WHERE ... ORDER BY m.mbl_no`
````

**Tạo `content/tickets/ch9/ch9-04.md`:**
````markdown
---
id: ch9-04
chapter: 9
title: Đối chiếu sổ booking với sổ vận đơn
title_en: Booking book against the bill book
from: { name: Võ Lan, dept: Ops }
difficulty: 3
beat: twist
requires: [cte, coalesce, null_logic, order_by]
grants: [full_join]
tables: [shipments, house_bills]
ordered: true
columns:
  - { vi: "Mã lô", en: "Shipment ref" }
  - { vi: "Ngày tàu chạy (sổ booking)", en: "Sailing date (booking book)" }
  - { vi: "Số vận đơn nhà", en: "House bill number" }
  - { vi: "Ngày phát hành (sổ vận đơn)", en: "Issue date (bill book)" }
variants:
  - { from: "2026-10-01", to: "2026-11-01", month: "10/2026", month_en: "October 2026" }
  - { from: "2026-08-01", to: "2026-09-01", month: "08/2026", month_en: "August 2026" }
  - { from: "2026-06-01", to: "2026-07-01", month: "06/2026", month_en: "June 2026" }
reflect:
  q: { vi: "Vì sao điều kiện tháng phải đặt trong từng CTE, không đặt ở WHERE sau FULL JOIN?", en: "Why must the month condition go inside each CTE rather than in a WHERE after the FULL JOIN?" }
  options:
    - { vi: "Ở dòng chỉ có một bên, cột của bên kia trống; điều kiện trên cột trống không bao giờ đúng nên dòng đó bị loại", en: "On a one-sided row the other side's columns are empty; a condition on an empty column is never true, so the row is dropped" }
    - { vi: "WHERE không dùng được sau FULL JOIN", en: "WHERE cannot follow a FULL JOIN" }
    - { vi: "Đặt ở đâu cũng như nhau", en: "It makes no difference where it goes" }
  answer: 0
  why: { vi: "Lọc ở WHERE sau phép nối biến FULL JOIN thành nối thường, đúng như bẫy lọc sau LEFT JOIN ở chương 3. Lọc mỗi sổ trước, rồi mới nối.", en: "Filtering in WHERE after the join turns the FULL JOIN into a plain join, just like the filter-after-LEFT-JOIN trap of chapter 3. Filter each book first, then join." }
wrong:
  - sql: "WITH booked AS (SELECT id, ref, atd FROM shipments WHERE direction = 'EXPORT' AND mode = 'SEA' AND atd >= '{{from}}' AND atd < '{{to}}'), issued AS (SELECT h.shipment_id, s.ref, h.hbl_no, h.issue_date FROM house_bills h JOIN shipments s ON s.id = h.shipment_id WHERE h.issue_date >= '{{from}}' AND h.issue_date < '{{to}}') SELECT b.ref, b.atd, i.hbl_no, i.issue_date FROM booked b LEFT JOIN issued i ON i.shipment_id = b.id WHERE i.shipment_id IS NULL ORDER BY 1"
    vi: "Bạn mới tìm một chiều: lô đã chạy mà chưa có vận đơn. Còn chiều kia: vận đơn phát hành trong tháng cho lô không chạy trong tháng."
    en: "You only looked one way: shipments that sailed with no house bill. The other way is missing: house bills issued in the month for shipments that did not sail that month."
---
Kế toán muốn sổ booking và sổ vận đơn khớp nhau từng tháng. Mỗi lô xuất khẩu đường biển chạy trong tháng phải có vận đơn nhà phát hành cùng tháng; lệch thì có thể do phát hành muộn, hoặc vận đơn của lô tháng trước.

## Task
Đối chiếu tháng {{month}}: một bên là các lô xuất khẩu đường biển có ngày tàu chạy thực tế trong tháng; bên kia là các vận đơn nhà phát hành trong tháng. Ghép theo lô. Liệt kê mọi dòng chỉ có ở một bên: mã lô, ngày tàu chạy (trống nếu lô không chạy trong tháng), số vận đơn nhà và ngày phát hành (trống nếu không có vận đơn phát hành trong tháng). Xếp theo mã lô theo thứ tự chữ cái.

## Hints
1. Lấy riêng từng sổ của tháng trước, rồi ghép theo lô sao cho giữ cả dòng chỉ có ở bên này lẫn bên kia. Cuối cùng chỉ giữ dòng thiếu một bên. Mã lô lấy từ bên nào có.
2. Hai CTE: lô đã chạy (`shipments`, `direction = 'EXPORT' AND mode = 'SEA'`, `atd` trong tháng) và vận đơn trong tháng (`house_bills` nối `shipments` để có `ref`). Ghép `FULL JOIN ... ON i.shipment_id = b.id`, giữ `b.id IS NULL OR i.shipment_id IS NULL`, mã lô `COALESCE(b.ref, i.ref)`.
3. `WITH booked AS (...), issued AS (...) SELECT COALESCE(b.ref, i.ref), b.atd, i.hbl_no, i.issue_date FROM booked b FULL JOIN issued i ON ... WHERE ... ORDER BY 1`

## Solution
```sql
WITH booked AS (
  SELECT id, ref, atd
  FROM shipments
  WHERE direction = 'EXPORT' AND mode = 'SEA' AND atd >= '{{from}}' AND atd < '{{to}}'
), issued AS (
  SELECT h.shipment_id, s.ref, h.hbl_no, h.issue_date
  FROM house_bills h
  JOIN shipments s ON s.id = h.shipment_id
  WHERE h.issue_date >= '{{from}}' AND h.issue_date < '{{to}}'
)
SELECT COALESCE(b.ref, i.ref), b.atd, i.hbl_no, i.issue_date
FROM booked b
FULL JOIN issued i ON i.shipment_id = b.id
WHERE b.id IS NULL OR i.shipment_id IS NULL
ORDER BY 1
```

# EN
Accounting wants the booking book and the bill book to agree every month. Every sea export that sails in a month should have a house bill issued the same month; a mismatch can mean a late bill, or a bill for last month's shipment.

## Task
Reconcile {{month_en}}: one side is the sea export shipments whose actual sailing date is in the month; the other side is the house bills issued in the month. Match them by shipment. List every row found on one side only: the shipment ref, the sailing date (empty if the shipment did not sail that month), the house bill number and its issue date (empty if no house bill was issued that month). Sort by shipment ref alphabetically.

## Hints
1. Take each book's month on its own first, then match by shipment so that rows found on only one side are kept, on either side. Finally keep only the rows missing a side. The shipment ref comes from whichever side has it.
2. Two CTEs: sailed shipments (`shipments`, `direction = 'EXPORT' AND mode = 'SEA'`, `atd` in the month) and bills of the month (`house_bills` joined to `shipments` for the `ref`). Match with `FULL JOIN ... ON i.shipment_id = b.id`, keep `b.id IS NULL OR i.shipment_id IS NULL`, ref `COALESCE(b.ref, i.ref)`.
3. `WITH booked AS (...), issued AS (...) SELECT COALESCE(b.ref, i.ref), b.atd, i.hbl_no, i.issue_date FROM booked b FULL JOIN issued i ON ... WHERE ... ORDER BY 1`
````

**Tạo `content/tickets/ch9/ch9-05.md`:**
````markdown
---
id: ch9-05
chapter: 9
title: Vận đơn nhà phát hành muộn
title_en: Late house bills
from: { name: Hoàng Khánh, dept: Ops }
difficulty: 2
beat: rest
requires: [multi_join, date_math, where, order_by]
grants: []
tables: [house_bills, shipments, employees]
ordered: true
columns:
  - { vi: "Số vận đơn nhà", en: "House bill number" }
  - { vi: "Mã lô", en: "Shipment ref" }
  - { vi: "Ngày tàu chạy", en: "Sailing date" }
  - { vi: "Ngày phát hành", en: "Issue date" }
  - { vi: "Số ngày sau khi tàu chạy", en: "Days after sailing" }
  - { vi: "Nhân viên kinh doanh", en: "Sales rep" }
reflect:
  q: { vi: "Số ngày phát hành sau khi tàu chạy là một số nguyên. Vì sao?", en: "The number of days between sailing and issue is an integer. Why?" }
  options:
    - { vi: "Ngày trừ ngày ra số ngày, như bài thư xin lỗi ở chương 4", en: "A date minus a date is a number of days, as in the apology letters of chapter 4" }
    - { vi: "Postgres tự làm tròn mọi phép trừ", en: "Postgres rounds every subtraction" }
    - { vi: "Vì cột ngày lưu số giây", en: "Because date columns store seconds" }
  answer: 0
  why: { vi: "Hai cột kiểu ngày trừ nhau cho số ngày nguyên, so được ngay với 2.", en: "Two date columns subtracted give a whole number of days, ready to compare with 2." }
---
Khách cần vận đơn nhà để nhận hàng và thanh toán. Quy định của phòng là phát hành trong vòng 2 ngày sau khi tàu chạy. Mình muốn biết tháng này vận đơn nào ra muộn và của sales nào, để nhắc từng người.

## Task
Vận đơn nhà nào phát hành trong tháng 10/2026 mà muộn hơn 2 ngày sau ngày tàu chạy thực tế của lô? Gửi số vận đơn nhà, mã lô, ngày tàu chạy, ngày phát hành, số ngày phát hành sau khi tàu chạy và họ tên nhân viên kinh doanh phụ trách lô. Muộn nhiều ngày nhất lên đầu, bằng nhau thì xếp theo số vận đơn nhà theo thứ tự chữ cái.

## Hints
1. Ngày phát hành nằm ở sổ vận đơn, ngày tàu chạy và người phụ trách nằm ở lô, tên người nằm ở danh sách nhân viên: ba bảng. Số ngày muộn là phép trừ hai ngày.
2. `house_bills h` nối `shipments s` (`s.id = h.shipment_id`), nối `employees e` (`e.id = s.sales_rep_id`). Lọc tháng theo `h.issue_date`, muộn: `h.issue_date - s.atd > 2`.
3. `SELECT h.hbl_no, s.ref, s.atd, h.issue_date, h.issue_date - s.atd, e.full_name FROM house_bills h JOIN shipments s ON ... JOIN employees e ON ... WHERE ... ORDER BY 5 DESC, h.hbl_no`

## Solution
```sql
SELECT h.hbl_no, s.ref, s.atd, h.issue_date, h.issue_date - s.atd, e.full_name
FROM house_bills h
JOIN shipments s ON s.id = h.shipment_id
JOIN employees e ON e.id = s.sales_rep_id
WHERE h.issue_date >= '2026-10-01' AND h.issue_date < '2026-11-01'
  AND h.issue_date - s.atd > 2
ORDER BY 5 DESC, h.hbl_no
```

# EN
Customers need the house bill to collect and pay for their cargo. Our rule is to issue it within 2 days after sailing. I want to know which bills came out late this month and whose shipments they were, so I can remind each person.

## Task
Which house bills issued in October 2026 came out more than 2 days after the shipment's actual sailing date? Send the house bill number, shipment ref, sailing date, issue date, days between sailing and issue, and the full name of the sales rep in charge of the shipment. Most days late first, and on a tie, by house bill number alphabetically.

## Hints
1. The issue date is in the bill book, the sailing date and the person in charge are on the shipment, and the name is in the staff list: three tables. Days late is a subtraction of two dates.
2. `house_bills h` joined to `shipments s` (`s.id = h.shipment_id`) and to `employees e` (`e.id = s.sales_rep_id`). Filter the month on `h.issue_date`; late: `h.issue_date - s.atd > 2`.
3. `SELECT h.hbl_no, s.ref, s.atd, h.issue_date, h.issue_date - s.atd, e.full_name FROM house_bills h JOIN shipments s ON ... JOIN employees e ON ... WHERE ... ORDER BY 5 DESC, h.hbl_no`
````

**Tạo `content/tickets/ch9/ch9-06.md`:**
````markdown
---
id: ch9-06
chapter: 9
title: "Đánh giá thăng tiến: đóng sổ đối soát tháng 10"
title_en: "Promotion review: closing the October reconciliation"
from: { name: Trần An, dept: Management }
difficulty: 3
beat: boss
requires: [full_join, except, cte, coalesce, date_bucket, join, multi_join, aggregate, group_by, order_by]
grants: []
tables: [shipment_events, invoices, shipments, customers, employees, master_bills, house_bills, carriers]
ordered: true
columns:
  - [{ vi: "Mã lô", en: "Shipment ref" }, { vi: "Tên khách hàng", en: "Customer name" }, { vi: "Nhân viên kinh doanh", en: "Sales rep" }]
  - [{ vi: "Hãng tàu", en: "Carrier" }, { vi: "Số vận đơn chủ lệch trọng lượng", en: "Master bills with a weight mismatch" }]
  - [{ vi: "Tháng (ngày đầu tháng)", en: "Month (first day)" }, { vi: "Số lô dự kiến chạy (sổ booking)", en: "Shipments due to sail (booking book)" }, { vi: "Số vận đơn nhà phát hành (sổ vận đơn)", en: "House bills issued (bill book)" }]
conclusion:
  question: "Ở bước 3, tháng 11/2026 chỉ có ở sổ booking. Điều đó nói gì?"
  options:
    - "Các lô dự kiến chạy tháng 11 chưa tới ngày tàu chạy nên chưa có vận đơn: không phải lỗi"
    - "Vận đơn tháng 11 đã bị mất, phải báo hãng tàu"
    - "Sổ booking ghi sai năm cho các lô tháng 11"
  answer: 0
conclusion_en:
  question: "In step 3, November 2026 appears only in the booking book. What does that tell you?"
  options:
    - "The shipments due to sail in November have not sailed yet, so they have no bill: not an error"
    - "The November bills were lost and the carrier must be told"
    - "The booking book has the wrong year for the November shipments"
---
Đây là buổi đánh giá thăng tiến của bạn. Trước khi đóng sổ tháng 10, mình muốn chắc chắn không lô nào lọt giữa các sổ: giao rồi mà chưa đòi tiền, vận đơn ghi sai trọng lượng, booking không có chứng từ đi kèm. Làm đúng cả ba bảng là bạn lên một nấc mới trong nghề.

## Step 1: Đã giao mà chưa xuất hóa đơn
Lô nào có mốc giao hàng trong tháng 10/2026 (theo nhật ký các mốc của lô) mà chưa có hóa đơn bán nào? Gửi mã lô, tên khách và họ tên nhân viên kinh doanh phụ trách lô, để từng người xuất bù; xếp theo mã lô theo thứ tự chữ cái.
```sql
WITH missing AS (
  SELECT shipment_id FROM shipment_events
  WHERE event = 'DELIVERED' AND event_date >= '2026-10-01' AND event_date < '2026-11-01'
  EXCEPT
  SELECT shipment_id FROM invoices
)
SELECT s.ref, c.name, e.full_name
FROM missing m
JOIN shipments s ON s.id = m.shipment_id
JOIN customers c ON c.id = s.customer_id
JOIN employees e ON e.id = s.sales_rep_id
ORDER BY s.ref
```

## Step 2: Vận đơn chủ lệch trọng lượng theo hãng tàu
Trong các vận đơn chủ phát hành từ 01/07 đến hết 30/09/2026, mỗi hãng tàu có bao nhiêu vận đơn chủ có trọng lượng lệch hơn 1% so với tổng trọng lượng các vận đơn nhà thuộc nó (1% tính trên trọng lượng của vận đơn chủ)? Gửi tên hãng tàu và số vận đơn chủ; nhiều nhất lên đầu, bằng nhau thì xếp theo tên hãng theo thứ tự chữ cái.
```sql
WITH h AS (
  SELECT master_bill_id, SUM(gross_weight_kg) AS hbl_kg
  FROM house_bills
  GROUP BY master_bill_id
)
SELECT ca.name, count(*)
FROM master_bills m
JOIN h ON h.master_bill_id = m.id
JOIN carriers ca ON ca.id = m.carrier_id
WHERE m.issue_date >= '2026-07-01' AND m.issue_date < '2026-10-01'
  AND abs(h.hbl_kg - m.gross_weight_kg) > m.gross_weight_kg * 0.01
GROUP BY ca.name
ORDER BY 2 DESC, ca.name
```

## Step 3: Sổ booking và sổ vận đơn theo tháng
Từ tháng 7/2026 trở đi, theo từng tháng: số lô xuất khẩu đường biển không bị hủy có ngày tàu chạy dự kiến trong tháng (sổ booking), và số vận đơn nhà phát hành trong tháng (sổ vận đơn). Tháng ghi bằng ngày đầu tháng; tháng chỉ có ở một sổ thì sổ kia ghi 0. Tháng sớm nhất lên đầu.
```sql
WITH booked AS (
  SELECT date_trunc('month', etd) AS month, count(*) AS n
  FROM shipments
  WHERE direction = 'EXPORT' AND mode = 'SEA' AND status <> 'CANCELLED' AND etd >= '2026-07-01'
  GROUP BY 1
), issued AS (
  SELECT date_trunc('month', issue_date) AS month, count(*) AS n
  FROM house_bills
  WHERE issue_date >= '2026-07-01'
  GROUP BY 1
)
SELECT COALESCE(b.month, i.month), COALESCE(b.n, 0), COALESCE(i.n, 0)
FROM booked b
FULL JOIN issued i ON i.month = b.month
ORDER BY 1
```

## Hints
1. Bước 1 là bài lô giao chưa có hóa đơn, lấy phần chênh theo mã lô rồi nối thêm tên khách và tên nhân viên. Bước 2 là bài vận đơn lệch trọng lượng, đếm theo hãng tàu. Bước 3 đếm từng sổ theo tháng riêng, rồi ghép hai bảng đếm sao cho tháng có ở bất kỳ sổ nào cũng hiện.
2. Bước 1: `shipment_id` của mốc `DELIVERED` trừ (`EXCEPT`) `shipment_id` trong `invoices`, rồi nối `shipments`, `customers`, `employees`. Bước 2: nối `carriers` qua `m.carrier_id`. Bước 3: `date_trunc('month', etd)` và `date_trunc('month', issue_date)`, ghép `FULL JOIN ... ON i.month = b.month`, ô trống thành 0 bằng `COALESCE`.
3. `WITH booked AS (...), issued AS (...) SELECT COALESCE(b.month, i.month), COALESCE(b.n, 0), COALESCE(i.n, 0) FROM booked b FULL JOIN issued i ON i.month = b.month ORDER BY 1`

# EN
This is your promotion review. Before closing October, I want to be sure no shipment has slipped between the books: delivered but not billed, bills of lading with the wrong weight, bookings with no documents. Get all three tables right and you move up a level in your career.

## Step 1: Delivered but not invoiced
Which shipments have a delivery milestone in October 2026 (in the shipment milestone log) and no sales invoice at all? Send the shipment ref, the customer name and the full name of the sales rep in charge, so each person can invoice them; sort by shipment ref alphabetically.

## Step 2: Master bills with a weight mismatch, by carrier
Among the master bills issued from 1 July to 30 September 2026 inclusive, how many master bills per carrier differ by more than 1% from the total weight of their house bills (1% of the master bill's own weight)? Send the carrier name and the number of master bills; most first, and on a tie, by carrier name alphabetically.

## Step 3: Booking book and bill book by month
From July 2026 on, per month: the number of sea export shipments, not cancelled, whose planned sailing date is in the month (booking book), and the number of house bills issued in the month (bill book). Show the month as its first day; a month found in only one book shows 0 for the other. Earliest month first.

## Hints
1. Step 1 is the delivered-but-not-invoiced task: take the difference by shipment id, then join the customer and sales rep names. Step 2 is the weight-mismatch task, counted per carrier. Step 3 counts each book per month on its own, then matches the two counts so that a month found in either book shows up.
2. Step 1: the `shipment_id` of the `DELIVERED` milestones minus (`EXCEPT`) the `shipment_id` in `invoices`, then join `shipments`, `customers`, `employees`. Step 2: join `carriers` through `m.carrier_id`. Step 3: `date_trunc('month', etd)` and `date_trunc('month', issue_date)`, matched with `FULL JOIN ... ON i.month = b.month`, empty counts turned into 0 with `COALESCE`.
3. `WITH booked AS (...), issued AS (...) SELECT COALESCE(b.month, i.month), COALESCE(b.n, 0), COALESCE(i.n, 0) FROM booked b FULL JOIN issued i ON i.month = b.month ORDER BY 1`
````

- [ ] **Step 4: Chạy toàn bộ, xác nhận PASS rồi commit**

Run: `npm test && npx tsc --noEmit`
Expected: tất cả PASS; `contentProblems` rỗng; số dòng như bảng "Số dòng kết quả mong đợi".

```bash
git add content/tickets/ch9 tests/scene.test.ts
git commit -m "content: chapter 9 Document reconciliation (6 tickets, VI + EN)"
```

---

### Task 8: CLAUDE.md, kiểm toàn bộ, checklist Edge cho orchestrator

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Ghi luật mới vào CLAUDE.md**

**Sửa `CLAUDE.md`** — thay:
```markdown
loaded by `src/content.ts` (`import.meta.glob`) and parsed by `src/tickets.ts`.
```
bằng:
```markdown
loaded by `src/content.ts` and parsed by `src/tickets.ts`. Ticket markdown is one lazy chunk (`src/ticketSources.ts`, budget group `tickets`; L41): `main.ts` awaits `loadContent()` (banner `content.loading`/`content.failed`) before the first render, and `tests/setup.ts` does the same for Vitest, so `loadTickets()`/`loadTicketTemplates()` stay synchronous but throw if called earlier. Never read tickets at module top level (`ui/modes.ts` builds its map on first use).
```

**Sửa `CLAUDE.md`** — thay:
```markdown
- Every ticket ships VI + EN (release gate: 0 tickets without `# EN`).
```
bằng:
```markdown
- Chapters 7–9 (Plan 3): ch7 Solutions use subqueries but no CTE; window functions wait for ch10. Money is VND in `invoices`/`payments` and USD/EUR in `vendor_bills`; convert with the latest `exchange_rates` row on or before the date (rates exist only on working days). Every ticket that rounds money says where (per row or only the final figure).
- Every ticket ships VI + EN (release gate: 0 tickets without `# EN`).
```

**Sửa `CLAUDE.md`** — thay:
```markdown
`customs_declarations` (from 2026-06-01, `amended_from_id` chains up to 2 steps, exports only), `incoterms`.
```
bằng:
```markdown
`customs_declarations` (from 2026-06-01, `amended_from_id` chains up to 2 steps, exports only), `incoterms`. Plan 3 tables (hooks at the head of the Plan 3 block, which starts with `ANALYZE` so the seed planner has statistics): `exchange_rates` (working days 2026-03-02..10-30), `rate_contracts` (exactly one buy rate per lane/container type/day from 2026-04-01; Europe +40% from 2026-07-15), `quotations` (from 2026-04-01; `shipment_id` NULL = never booked), `invoices`/`payments` (bookings from 2026-04-01), `vendor_bills`, `master_bills`/`house_bills` (sea exports sailing from 2026-05-01). The test pins the md5 of all 13 chapter 1–6 tables and the Q3 Europe margin drop that chapter 12 relies on. There is no `charges` table (Plan 3 R2).
```

- [ ] **Step 2: Kiểm toàn bộ**

Run: `npm test && npx tsc --noEmit && npm run build && node scripts/check-budget.mjs`
Expected: tất cả PASS (1078 test trên bản replay `f2c4cbf`); `contentProblems` rỗng (test "soft-lock, nhịp chương…"); mọi nhóm ngân sách `ok` (`main ≈ 254 / 270`, `tickets ≈ 65 / 70`, `worker ≈ 140 / 160`).

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: CLAUDE.md notes for Plan 3 (lazy ticket chunk, chapter 7-9 seed and money rules)"
```

- [ ] **Step 4: Checklist Edge (orchestrator; origin riêng, không đụng save ở :5173)**

Chạy ở cổng khác để có `localStorage` riêng: `npx vite --port 5174 --strictPort` (và `npm run build && npx vite preview --port 5175 --strictPort` cho mục 1), mở trên **Edge**. Không mở `:5173`.

Tạo file `save-ch6-done.json` (ngoài repo) rồi nạp bằng **Nhập tiến độ** (menu `⋯` của topbar sau L42):
```json
{
  "version": 2,
  "completed": ["ch1-01", "ch1-02", "ch1-03", "ch1-04", "ch1-05", "ch2-01", "ch2-02", "ch2-03", "ch2-04", "ch2-05",
                "ch3-01", "ch3-02", "ch3-03", "ch3-04", "ch3-05", "ch4-01", "ch4-02", "ch4-03", "ch4-04", "ch4-05", "ch4-06",
                "ch5-01", "ch5-02", "ch5-03", "ch5-04", "ch5-05", "ch5-06", "ch6-01", "ch6-02", "ch6-03", "ch6-04", "ch6-05", "ch6-06"],
  "xp": 9000,
  "hintsUsed": {},
  "drafts": {},
  "graded": {},
  "review": {
    "join": { "box": 1, "due": "2026-11-13" }, "having": { "box": 2, "due": "2026-11-20" }, "anti_join": { "box": 1, "due": "2026-11-14" },
    "date_math": { "box": 1, "due": "2026-11-12" }, "null_logic": { "box": 2, "due": "2026-11-18" }, "coalesce": { "box": 1, "due": "2026-11-15" },
    "case_when": { "box": 3, "due": "2026-11-25" }, "cast": { "box": 1, "due": "2026-11-16" }
  },
  "practice": { "solved": 0, "weak": 0 },
  "sandboxDraft": "",
  "bossStep": {}
}
```

Kiểm (mỗi dòng ✓/✗, ghi số đo):
1. **Boot (bản build, :5175):** từ lúc tải lại trang tới nút Chạy sẵn sàng, so với bản build của HEAD trước Plan 3 (cùng máy). Lúc đầu thấy dải "Đang tải nội dung các ticket…" (đổi EN thì "Loading the tickets…") rồi biến mất; tab Network có `ticketSources-*.js` tải sau `index-*.js`. Vượt 1,5 lần số trước thì ghi `decision-log.md`. Chặn `ticketSources-*.js` (DevTools → Network → Block request URL) rồi tải lại: dải báo lỗi + nút "Tải lại trang", không lỗi nào khác.
2. **Trang chủ:** card "Ôn đầu chương" (ch7 chưa xong ticket nào); lưới chương: ch7 "Đang học", ch8–9 khóa, ch10–12 "Nội dung đang soạn". Ô KPI mới khóa.
3. **ch7-01 (ví dụ mẫu):** thẻ "Ví dụ mẫu" ①–③; chạy ví dụ ra 4 dòng. Nộp câu đếm cả lô hủy → lời giải thích riêng. Nộp đúng → hoạt cảnh `yard`, Recap có câu ngẫm lại.
4. **ch7-02 (làm cùng):** Nộp khi còn `___` → "Còn 2 chỗ trống…". Hoạt cảnh `quote` khi xong.
5. **ch7-04:** truy vấn con không có điều kiện ngày → lỗi `21000` kèm giải thích mới.
6. **ch8-01:** tab Thứ tự thực thi với câu có WITH → "Query có WITH hoặc UNION — xem tab EXPLAIN". **ch8-04:** DISTINCT ON với ORDER BY sai → lỗi `42P10` kèm giải thích; kết quả không cần sắp xếp được chấm đúng.
7. **ch9-01:** UNION lệch số cột → giải thích `setColumns`.
8. **Cột mốc ch7-06, ch8-06, ch9-06** (Solution trong plan): 3 bước, câu kết luận; ch9-06 xong → màn thăng tiến **Lead DA**, topbar đổi chức danh.
9. **Luyện tập** từ chip `distinct_on` → biến thể tuần khác 19–25/10; Nộp đúng → "+1 hộp".
10. Màn hẹp 375 px và dark mode: thẻ ví dụ ch8-01, bảng kết quả 6 cột của ch8-04 cuộn ngang trong bảng, không tràn trang.

Ghi kết quả vào `docs/team/decision-log.md` (dòng L-số mới) cùng R1–R13. **Cần user xem:** R1 (tải mọi nội dung lúc mở trang), R2 (bỏ `charges`), số đo boot và seed.

---

## Đã kiểm khi viết plan (2026-11-17)

- Áp toàn bộ plan bằng script replay (đọc các khối `Tạo` / `Sửa … — thay/bằng` / `Thêm vào cuối`, mỗi khối "thay" phải khớp đúng một lần) lên bản `git archive HEAD` sạch, `node_modules` nối bằng junction. Viết trên `fd96e31`; replay cuối trên **`c847a3b`** (HEAD mới nhất lúc nộp, đã có L42): 67 khối áp được, không khối nào lệch; `tsc` sạch, **1078 test PASS**, `npm run build` sạch, `check-budget` mọi nhóm `ok` (`main` 254/270, `tickets` 65/70, `worker` 140/160). Replay dừng sau Task 1, 2, 3, 4 trên bản sạch riêng: `tsc` sạch và mọi test PASS (800, 807, 816, 816 test); Task 5–7 kiểm qua replay toàn bộ (mỗi task chỉ thêm ticket của một chương và dòng hoạt cảnh của nó).
- Anchor đã đổi giữa lúc viết và được sửa: `src/ui/sqlErrors.ts` (`75d27aa` thêm 3 dòng `BY_MESSAGE` → plan neo vào dòng `sqlerr.fnArgs`), `content/kpis.yml` (L42 thêm `icon:` → ô mới có `icon`), `tests/icons.test.ts` (L42: mỗi kỹ năng một icon riêng → R13).
- Chạy từng Solution (mọi bước, mọi biến thể), ví dụ mẫu và câu `wrong:` trên PGlite: số dòng như bảng "Số dòng kết quả mong đợi", không kết quả rỗng; mọi câu `wrong:` có dòng và khác Solution ở mọi biến thể (test "phương pháp học"); mọi biến thể cho kết quả khác nhau từng đôi (`tests/variants.test.ts`).
- 16 đáp án đúng viết kiểu khác qua grader (mục "Số dòng kết quả mong đợi"): truy vấn con ↔ CTE/bảng con, `NOT EXISTS` ↔ `LEFT JOIN … IS NULL`, `EXCEPT` ↔ `NOT EXISTS`, `UNION` ↔ `UNION ALL` ở ch9-01, `FULL JOIN` ↔ hai vế một chiều nối `UNION ALL`, `DISTINCT ON` ↔ `LATERAL … LIMIT 1`.
- md5 của 13 bảng ch1–6 trước và sau Plan 3 giống hệt (ghim trong `tests/seed.test.ts`); `ANALYZE` không đổi dữ liệu.
- Mã lỗi Postgres của các lỗi hay gặp (đo trên PGlite 0.5.16): `21000`, `42601` (lệch số cột ở UNION/EXCEPT, IN nhiều cột), `42804` (lệch kiểu ở UNION), `42P10`; `NOT IN` gặp NULL ra 0 dòng (không lỗi).
- Chưa kiểm trên trình duyệt: checklist Edge ở Task 8 Step 4 (orchestrator, cổng riêng).
