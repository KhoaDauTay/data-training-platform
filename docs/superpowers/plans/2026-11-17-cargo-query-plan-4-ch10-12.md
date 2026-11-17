# Cargo Query — Plan 4: chương 10–12 (hàm cửa sổ, kế hoạch thực thi và phòng thí nghiệm chỉ mục, điều tra cuối năm)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm chương 10 "Xu hướng & xếp hạng", 11 "Truy vấn nhanh hơn", 12 "Điều tra cuối năm" (18 ticket VI + EN, 6 kỹ năng mới, xong ch12 lên ★ Trưởng nhóm Phân tích) theo L30 và `docs/team/curriculum.md` §4, §6, §7.1. Chương 11 chấm thêm trên **kế hoạch thực thi** (chỉ mục dựng sẵn) và có **phòng thí nghiệm chỉ mục** (CREATE INDEX + EXPLAIN trong một transaction luôn ROLLBACK). Chương 12 trả móc biên lợi nhuận quý 3 (châu Âu 19,5 % → 7,0 %). Giữ nguyên định dạng và luật phương pháp học của Plan 2/3.

**Architecture:**
- Seed: 3 bảng mới cuối `schema.sql` (`free_time_terms`, `container_events`, `claims`), 3 khối seed cuối `seed.sql` (mỗi khối một `setseed()`), rồi 2 chỉ mục dựng sẵn trên `shipments` và `ANALYZE`. 21 bảng cũ giữ nguyên từng byte (`tests/seed.test.ts` ghim md5, kể cả 8 bảng Plan 3).
- Engine: `src/planCheck.ts` (đọc cây `EXPLAIN (FORMAT JSON)` không ANALYZE: bảng có bị đọc cả bảng không, tỷ lệ chi phí); trường `plan:`/`lab:` trong `src/tickets.ts`; request mới `lab` của worker (`runLab`, `src/db/run.ts`); `ui/work.ts` chấm kế hoạch sau khi kết quả đúng và chạy phòng thí nghiệm; `ui/brief.ts` có thẻ "Câu truy vấn cần tăng tốc"; huy hiệu "mới" của tab EXPLAIN ở ch11-01. Không đổi save, không `SAVE_VERSION` mới.
- Nội dung: 18 file `content/tickets/ch10..ch12/*.md`, `skills.yml` (+6 thẻ), `chapters.yml` (outcomes ch10–12), `people.yml` (bảng phụ trách), `kpis.yml` (+1 ô, `q3margin` có `unit: %`), `TEMPLATE.md`.

**Tech Stack:** như HEAD. **Không thêm dependency.**

**Spec / nguồn quyết định:** `docs/superpowers/specs/2026-11-16-cargo-query-design.md` §4–§6; `docs/team/curriculum.md` §3, §4 (ch10–12), §5, §6, §7.1; `docs/team/problem-design.md` §1; `docs/team/amendments.md` D1–D6; `docs/team/decision-log.md` L22, L24, L25, L30, L35, L40, L41, L43, L44 (dòng mới thắng); `docs/team/review-log.md` mục Plan 2, Plan 3 (bài học nội dung). Plan mẫu: `docs/superpowers/plans/2026-11-17-cargo-query-plan-3-ch7-9.md`. Quyết định mới: S1–S14 (dưới).

**Tiền đề:** Plan 1, 1d, 1b, 1c, Import, Deploy (phần local), Plan 2, Plan 3 đã xong. Plan viết và replay trên HEAD `2ddc893` (tsc sạch, test xanh).

## Đã có trên HEAD (không làm lại)

| Curriculum / brief | Trạng thái HEAD |
|---|---|
| `chapters.yml` ch10–12: tiêu đề, `career`, `tier` (ch12 ★ Trưởng nhóm Phân tích / Head of Analytics), `story` | Có. Plan này chỉ điền `outcomes`. |
| `CHAPTER_TABLES` 10–12 | Có (ch10 `free_time_terms, container_events`; ch11 không bảng; ch12 `claims`). Bảng chưa có trong `schema.sql`: Plan này tạo. |
| Icon kỹ năng `window_rank`, `window_lag`, `window_agg`, `explain_read`, `index_design` | Có trong `SKILL_ICON`. Thiếu `sargable`: Plan này vẽ. |
| Người hỏi: Giám đốc, Lê Bình, Hoàng Dũng, Bùi Long, Phạm Tâm, Hoàng Khánh, Đặng Trang, Hoàng Thảo, Nguyễn Quang, Đặng Hà, Võ Thu; IT là **Đỗ Tùng** (`employee: null`) | Có trong `people.yml`. Không thêm người (S4). |
| Tab "Thứ tự thực thi" gặp WITH/UNION/hàm cửa sổ | Đã báo `steps.withUnion` / `steps.window` ("xem tab EXPLAIN"); ch10 không cần thêm. |
| Request `explain` (EXPLAIN ANALYZE, tab EXPLAIN + Luồng dữ liệu) | Có; chấm kế hoạch dùng `EXPLAIN (FORMAT JSON)` không ANALYZE qua `run` (S6). |
| Luật phương pháp học từ ch4 (`tests/content.test.ts`) | Có; ch10–12 dùng nguyên (ch12 cũng cần đúng một bài `faded`). |

## Quyết định sản phẩm của plan này (S1–S14, để orchestrator ghi L-số)

| # | Quyết định | Lý do |
|---|---|---|
| S1 | **Bảng tối giản:** `free_time_terms(id, customer_id, valid_from, valid_to, free_days, usd_per_day)` (hai kỳ mỗi khách: 2024-11-01..2026-06-30 và 2026-07-01..12-31; số ngày miễn phí 7/10/14 không đổi, đơn giá +20 % từ 01/07/2026); `container_events(id, container_id, event, event_time timestamp)` với 6 bước `GATE_OUT_EMPTY → GATE_IN_FULL → LOADED → DISCHARGED → GATE_OUT_FULL → EMPTY_RETURNED`, chỉ cho container của lô chạy (ETD) từ 2025-05-01 (**108.982 dòng**); `claims(id, claim_no, shipment_id, claim_date, reason, amount_usd)`. D&D chỉ tính cho container **hàng nhập**: ngày trả rỗng trừ ngày dỡ hàng. | Đủ cho 18 Solution và các móc, không hơn. Cửa sổ từ 05/2025 giữ ≥ 100k dòng mà seed nhẹ nhất (cửa sổ từ 11/2024 cho 145.656 dòng, +0,13 s). |
| S2 | **Luật dừng seed nâng từ 1,8 s lên 2,0 s (Node)**. Đo cùng máy cùng lúc: HEAD 1,49–1,53 s, sau Plan 4 1,81–1,84 s (+0,32 s; trên seed cuối: `container_events` 0,15 s nạp + 0,04 s khóa + 0,08 s `ANALYZE`, claims 0,03 s, chỉ mục 0,01 s). **Cần user xem** cùng số đo khởi động Edge ở Task 7. | Curriculum §6.3 đòi ≥ 100k dòng. Nạp lười chỉ khi tới ch11 không đơn giản hơn: ch10-03/04, ch10-06, ch12-03/06 cũng đọc bảng này, và mọi query vẫn phải chờ trong hàng đợi worker. |
| S3 | **Không làm DB dựng sẵn (L44).** Spike trên Node (PGlite 0.5.16): `dumpDataDir('gzip')` của DB đã seed (seed cuối của plan này) = **14.741 KB** (DB rỗng 4.414 KB → ~10 MB là dữ liệu game); `loadDataDir` khởi động 0,63 s so với 0,95 s boot + 1,84 s seed trong Node; md5 bảng và JSON của `EXPLAIN` giống hệt (tất định đạt). **Chưa thử trong Web Worker trên trình duyệt** (tiêu chí a): không làm vì tiêu chí (b) đã trượt. | +~10–15 MB tải lần đầu (gấp 2–3 nhóm `pglite` 5,3 MB) để đổi lấy ~2 s seed (L44: ~3,5 s trong trình duyệt); với mạng 10 Mbit/s lần đầu chậm hơn. Đảo ngược: task riêng nếu user chấp nhận tải lớn để lần mở sau nhanh (cache trình duyệt). |
| S4 | **Không thêm nhân viên id 41.** Đỗ Tùng (IT) giữ `employee: null` như HEAD; chỉ thêm bảng phụ trách. | `employees` bị ghim md5; `tests/people.test.ts` đòi đúng một người `employee: null` thuộc IT. Curriculum §2 cho phép phương án persona. |
| S5 | **Chỉ mục dựng sẵn:** `shipments(booking_date)`, `shipments(customer_id)`. Không có chỉ mục trên `containers(shipment_id)` (bước "đọc nhiều dòng nhất" của ch11-01, câu kết luận ch11-06) và trên `container_events(container_id)` (phòng thí nghiệm). Không chỉ mục `vendor_bills(shipment_id)`: planner vẫn chọn băm + đọc cả bảng 6,6k dòng (đo được), nên không Solution nào dùng nó. | Chỉ mục nào cũng phải có Solution dùng thật; bài học "đọc cả bảng không phải lúc nào cũng xấu" nằm ở câu ngẫm lại ch11-05. |
| S6 | **Chấm theo kế hoạch, bản gọn:** tầng A (`plan: { index: <bảng> }`) chạy `EXPLAIN (FORMAT JSON)` qua `run` có sẵn, không đổi worker. Tầng B (`lab:`) thêm đúng **một** request worker `lab` (BEGIN → EXPLAIN → `CREATE INDEX` qua `query()` → EXPLAIN → ROLLBACK, kiểm `isCreateIndex` trong worker). **Một editor**: Solution của bước lab là câu chậm (hiện ở thẻ "Câu truy vấn cần tăng tốc" thay thẻ kết quả mong đợi, Recap hiện `lab.ddl` làm đáp án mẫu); editor chỉ chứa một `CREATE INDEX`; Chạy và Nộp đều hiện một dòng kế hoạch trước/sau; nút EXPLAIN ẩn ở bước lab; bước lab không có `wrong:`. Đạt khi bảng được đọc qua chỉ mục và chi phí gốc ≤ `max_cost_ratio` × trước. | Curriculum §6.3 vẽ hai editor + hai cây kế hoạch cạnh nhau (L). Một editor + một dòng trước/sau đủ để thấy kế hoạch đổi; hai cây cạnh nhau để sau nếu người chơi cần. |
| S7 | **Ngân sách `tickets` 70 → 110 KB** (đo 99 KB sau ch10–12, luật L40: số đo + 5 % làm tròn 10 KB). `main` 254 → 259 / 270 KB, `worker` 142 / 160 KB. **Cần user xem** cùng R1. | Ticket ch10–12 dài hơn (CTE nhiều bước, ví dụ mẫu EXPLAIN). |
| S8 | **Hàm cửa sổ dạy 3 kỹ năng** (`window_rank`, `window_lag`, `window_agg`): ROW_NUMBER/RANK/DENSE_RANK, PARTITION BY, LAG, SUM OVER lũy kế. Khung trượt (`ROWS BETWEEN 2 PRECEDING AND CURRENT ROW`) chỉ có trong `trap` của `window_agg` và câu ngẫm lại ch10-04; **NTILE/percentile không dạy**. | Curriculum §4 ch10 có 3 kỹ năng; không ticket ch10–12 nào cần chia nhóm phân vị. Đảo ngược: thêm kỹ năng `window_frame` cùng một ticket. |
| S9 | **Lệch nhỏ so với curriculum §4:** ch10-01 do Lê Bình gửi (Giám đốc chỉ gửi cột mốc), biến thể đổi cả N (3/5/4) và kỳ; ch10-03 do Bùi Long; ch10-04 biến thể theo **quý** (Q3/Q2/Q1 2026, 105–130 dòng) thay cả năm; ch10-05 thu hẹp còn nợ quá hạn **trên 90 ngày** + lô **nhập** đang trên đường (37 dòng); ch10-06 bước 3 là ngày vượt **toàn công ty** theo tháng. ch11-01 chấm kết quả + kế hoạch, phần "đọc kế hoạch" nằm ở câu ngẫm lại (không mở `conclusion` cho ticket thường); ch11-02 theo **tuần**; ch11-05 dùng `vendor_bills` (R2 bỏ `charges`); ch11-06 ba bước: 2 bước `plan:` + 1 bước lab (hành trình container của một khách). ch12-01 do Nguyễn Quang gửi; ch12-02 là bài **faded** (luật một faded mỗi chương); ch12-03 so quý 3 với quý 2 bằng đếm có điều kiện (LAG trên quý thưa sẽ so nhầm quý); ch12-04 trả mọi hãng kèm cột "gấp mấy lần trung bình"; ch12-05 doanh thu từng cặp khách trùng; ch12-06 **bốn bước** (biên lãi gộp + ba nghi vấn quy ra đồng) và câu kết luận so độ lớn. | Đề rõ, kết quả đọc được, luật chỉ dùng kỹ năng đã dạy. |
| S10 | **Việc dời từ L35/L41/L43:** làm `plan:`/`lab:` và chấm "mới" của tab EXPLAIN ở ch11-01. Thêm giải thích lỗi hàm cửa sổ (`42P20` lọc theo hàm cửa sổ ở WHERE, `sqlerr.windowOver` thiếu OVER; curriculum §5.4). **Dời tiếp:** lint SQL (M: cần duyệt AST + UI cảnh báo, không ticket ch10–12 nào cần); tab Thứ tự thực thi cho WITH/UNION/cửa sổ (giữ thông báo chuyển sang EXPLAIN); chế độ thẻ lật; danh sách chỉ mục trong tab Cột (đề ch11 nêu tên chỉ mục bằng lời). | Giữ plan nội dung gọn; mỗi việc dời không chặn ticket nào. |
| S11 | **KPI:** thêm `stuckContainers` (ch10-03, đếm dòng); `q3margin` thêm `unit: %`, nhãn "Biên lợi nhuận gộp quý 3/2026", số lấy cột 0 của bước 1 ch12-06 (biên quý 3). ch11 không có ô KPI. | Review L42 ghi `q3margin` thiếu đơn vị. |
| S12 | Icon `sargable` vẽ mới (cột đứng một mình đi thẳng vào chỉ mục); `tests/icons.test.ts` đòi mỗi kỹ năng một icon riêng. | |
| S13 | **Ngày giờ:** `event_time` là cột `timestamp` đầu tiên của game. Mọi đề tính "số ngày" bằng hiệu **ngày lịch** (`a::date - b::date`), nói rõ trong đề. Seed test bảo đảm một container không có hai sự kiện cùng thời điểm (ROW_NUMBER không gặp hòa). | Tránh lệch do giờ trong ngày. |
| S14 | **Điều tra ch12 quy về cùng đơn vị:** USD quy ra đồng theo tỷ giá USD ngày 30/09/2026 (có trong `exchange_rates`). Ba con số của ch12-06: châu Âu mất ~8,19 tỷ đồng lãi gộp; D&D quý 3 của khách 1 ~1,70 tỷ; claim quý 3 của Blue Anchor Lines ~1,09 tỷ (và **không** tăng so với quý 2) → nguyên nhân chính là giá bán châu Âu. | Câu kết luận cột mốc hỏi điều mới (so độ lớn), trả lời được từ các bước. |

## Kết quả spike (2026-11-17, Node 24 + PGlite 0.5.16, trước khi viết nội dung)

| Đo | Kết quả |
|---|---|
| Seed `container_events` có PK + FK khi nạp | 0,90 s (kiểm FK từng dòng ~0,55 s) → nạp trần rồi `ALTER TABLE … ADD PRIMARY KEY, ADD FOREIGN KEY`: 0,27 s cho cùng số dòng |
| `ANALYZE` bảng > 30.000 dòng | Mẫu ngẫu nhiên **không** theo `setseed()` → chi phí kế hoạch đổi theo lần khởi động. `SET default_statistics_target = 500` (mẫu 150.000 dòng ≥ cả bảng) → đọc đủ, tất định (test hai DB). |
| Kế hoạch có chỉ mục dựng sẵn | `booking_date = ngày`, tuần, tháng, quý: Bitmap Index Scan; `to_char`, `date_trunc`, `::text`, `extract`: Seq Scan; `upper(ref) = …`: Seq Scan; `ref = upper('…')`: Index Only Scan; `customer_id = 42`: Bitmap Index Scan |
| Phòng thí nghiệm (hành trình một container, nối theo số container) | trước 2168 (Seq Scan `container_events`); `(container_id)` 35,25; `(container_id, event_time)` 35,38; `(event_time, container_id)` và `(event)`: vẫn Seq Scan 2168 |
| Phòng thí nghiệm (mọi container của khách 57 từ 01/07/2026) | trước 2932; `(container_id)` 659,6 (0,225); `(event_time, container_id)`: vẫn Seq Scan; `containers(shipment_id)`: không được chọn (băm rẻ hơn) |
| "Mới nhất mỗi container" cho cả bảng | chỉ mục chỉ đổi Seq Scan + Sort thành Index Scan + Incremental Sort (13774 → 8713): không dùng làm bài lab |
| DB dựng sẵn (L44) | xem S3 |

## Tên dùng từ HEAD (Task 0 kiểm bằng grep)

| File | Tên dùng trong plan này |
|---|---|
| `src/db/run.ts` | `runSandboxed`, `runExplain`, `sqlErrorInfo`, `SqlError` |
| `src/db/worker.ts` | `handle()` (dòng `body.kind === 'explain'`) |
| `src/db/client.ts` | `WorkerBody` (dòng `dropImport`), `enqueue`, `explain()` |
| `src/tickets.ts` | `Step`, khối `if (fm.starter !== undefined)` |
| `src/progress.ts` | `SKILL_SQL` (dòng `full_join`), `twistUsed(skill, st.solution)` |
| `src/ui/work.ts` | `wrongTipper`, `run()`, `submit()`, `setButtons()` |
| `src/ui/brief.ts` | `shapeCard`, `recap` (dòng `recap.reference`), `renderBrief` |
| `src/ui/vizTabs.ts` | `registerTab({ id: 'explain'` … `// newAt: Plan 4` |
| `tests/seed.test.ts` | `PLAN3`, `hashOf`, `one`, `db` |
| `tests/scene.test.ts` | bảng mong đợi kết thúc bằng dòng `ch9-05`/`ch9-06` |
| `scripts/check-budget.mjs` | `GROUPS` (dòng `tickets`) |

**Cách đọc các bước sửa code** (như Plan 2/3): **Tạo `path`:** ghi cả file. **Sửa `path`** — thay: khối thứ nhất phải xuất hiện **đúng một lần**; thay bằng khối sau "bằng:". **Thêm vào cuối `path`:** nối khối vào cuối file (dòng trống đầu khối là cố ý). Khối "thay" không khớp (HEAD đã đổi) thì áp ý của bước vào code trên đĩa (L7) và ghi chỗ lệch vào mô tả commit.

## Global Constraints

- Mọi ràng buộc của các plan trước vẫn áp dụng: PGlite **0.5.16** pin; không `innerHTML`; mọi chữ UI qua `t()`, khóa mới thêm vào **cả** `vi.ts` và `en.ts` trong cùng task; không dùng chữ "boss" trên UI hay trong chữ ticket (L22); đề không ghi tên bậc nghề. Mọi bước "xác nhận PASS" chạy thêm `npx tsc --noEmit`.
- **Seed:** chỉ thêm vào **cuối** `schema.sql` và `seed.sql` (ngoài dòng móc ở đầu file); mỗi khối có `setseed()` riêng; không `ALTER` bảng cũ (chỉ `container_events` mới tạo được thêm khóa sau khi nạp); không ngày thực tế nào sau 2026-10-31. Sau mỗi task chạy lại **mọi** Solution (`npm test`).
- **Phòng thí nghiệm:** chỉ `CREATE [UNIQUE] INDEX` (không `CONCURRENTLY`), kiểm trong worker, gửi bằng `query()` (một câu lệnh), luôn `ROLLBACK` trong `finally`.
- **Đề bài** (problem-design §1): thân đề, `## Task`, đề bước không có tên bảng/cột, từ khóa SQL viết hoa, mã trạng thái, backtick; EN không dấu tiếng Việt, không tên người; code span VI = EN; ngày cố định; ticket `ordered` nêu đủ quy tắc phá hòa bằng lời; ticket xếp hạng nói rõ cách xử lý bằng nhau (cùng hạng và nhảy hạng); tiền nói rõ đơn vị và chỗ làm tròn; "số ngày" là hiệu ngày lịch.
- **Solution chỉ dùng kỹ năng đã dạy**; ch12 không dạy gì mới.
- `src/ui/*`, `src/main.ts`: chỉ luồng Nộp của `ui/work.ts` có test mới (`tests/workRace.test.ts`, DOM giả như các test sẵn có); phần còn lại kiểm tay theo checklist Task 7 trên **Edge, cổng khác 5173**.
- Mỗi task một commit (bước cuối của task). Chỉ `git add` đúng các file của task.

## File Structure

```
src/db/schema.sql, seed.sql   + 3 bảng, + khối Plan 4 (móc ở đầu khối), + 2 chỉ mục dựng sẵn và ANALYZE   (thêm cuối)
src/planCheck.ts              đọc cây EXPLAIN JSON: checkPlan, checkLab, planLine, isCreateIndex            (tạo)
src/db/run.ts, worker.ts, client.ts   runLab + request 'lab' + DbClient.lab()                             (sửa)
src/tickets.ts                Step.plan / Step.lab, đọc plan:/lab: (ticket thường: bảng; cột mốc: danh sách) (sửa)
src/progress.ts               SKILL_SQL window_agg, index_design; luật twist đọc lab.ddl                    (sửa)
src/ui/work.ts, brief.ts, vizTabs.ts, sqlErrors.ts, i18n/vi.ts, en.ts   chấm kế hoạch, phòng thí nghiệm, thẻ lab, "mới" EXPLAIN (sửa)
content/skills.yml, chapters.yml, people.yml, kpis.yml, TEMPLATE.md, src/ui/icons.ts                      (sửa)
content/tickets/ch10..ch12/*.md   18 ticket                                                               (tạo)
tests/seed.test.ts, tickets.test.ts, progress.test.ts, scene.test.ts, home.test.ts                        (sửa)
tests/planCheck.test.ts       Solution đạt plan:/lab: mọi biến thể; cách chậm và chỉ mục sai không đạt; tất định (tạo)
scripts/check-budget.mjs, CLAUDE.md                                                                       (sửa)
```

## Số dòng kết quả mong đợi (đã chạy, biến thể 0 | 1 | 2; trong ngoặc: câu `wrong:`; [ms]: thời gian Node)

| Ticket | Dạng | Dạy | Dòng |
|---|---|---|---|
| ch10-01 | teach · worked | `window_rank` | 33 (30) \| 31 (30) \| 26 (24); ví dụ mẫu 16 |
| ch10-02 | develop · faded | `window_lag` | 24 (24) \| 12 (12) \| 12 (12) (câu sai cùng số dòng, khác giá trị) |
| ch10-03 | develop · open | (ôn `window_rank`, `date_math`) | 50 (18.104) \| 21 (17.973) \| 18 (17.783) |
| ch10-04 | twist | `window_agg` | 130 (130, 130) \| 122 (122, 122) \| 105 (105, 105) |
| ch10-05 | rest | — | 37 (37) |
| ch10-06 | cột mốc | — | 9 / 7 / 10 |
| ch11-01 | teach · worked | `explain_read` | 103 \| 83 \| 74; ví dụ mẫu 4 (dòng kế hoạch) |
| ch11-02 | develop · faded | `sargable` | 193 \| 190 \| 206 |
| ch11-03 | develop · open | (ôn `sargable`) | 1 \| 1 \| 1 |
| ch11-04 | twist · lab | `index_design` | 6 \| 6 \| 6 (câu chậm); chi phí 2168 → 35 |
| ch11-05 | rest | — | 2 |
| ch11-06 | cột mốc | — | 24 / 22 / 165 (lab: 2932 → 660) |
| ch12-01 | teach · worked | — | 5 (6); ví dụ mẫu 4 [462 ms] |
| ch12-02 | develop · faded | — | 6 (6) |
| ch12-03 | develop · open | — | 4 (4) |
| ch12-04 | twist | — | 9 (9) |
| ch12-05 | rest | — | 10 (9) |
| ch12-06 | cột mốc | — | 1 / 1 / 1 / 1 [455 / 463 / 19 / 0 ms] |

Kết quả chính (để kiểm câu kết luận): ch12-01 châu Âu 19,5 → 7,0 (−12,6 điểm), các vùng khác trong ±1,5; ch12-06 bước 1 `16,6 · 21,1 · −4,5`; bước 2 8.193.434.648 đ; bước 3 1.703.999.160 đ; bước 4 1.092.664.618 đ; ch10-06 bước 3 ngày vượt mỗi tháng 152–227 tới tháng 7, rồi 469 / 777 / 609 (tháng 8–10); ch12-04 Blue Anchor Lines 6,01 claim/100 lô = 2,80 lần trung bình.

Đáp án đúng viết kiểu khác cũng qua grader (đã chạy `grade()`, 17 câu; câu nào có `plan:` cũng đạt kế hoạch): hạng bằng truy vấn con đếm khách lớn hơn (ch10-01); tự nối tháng trước thay LAG (ch10-02); `DISTINCT ON` thay ROW_NUMBER (ch10-03); lũy kế bằng truy vấn con tương quan (ch10-04); `IN` thay `EXISTS` (ch10-05); `greatest(0, …)` + `SUM(SUM(…)) OVER` (ch10-06 bước 3); đếm container bằng truy vấn con (ch11-01); `BETWEEN` hai ngày (ch11-02); gõ thẳng mã chữ hoa, nối kiểu dấu phẩy (ch11-03); `IN (truy vấn con)` thay JOIN (ch11-05); đảo thứ tự điều kiện (ch11-06 bước 2); gom theo quý rồi tự nối (ch12-01); JOIN hợp đồng theo khoảng hiệu lực + tự nối quý trước (ch12-02); `SUM(CASE …)` thay `FILTER` (ch12-03); một lần nối trái + `count(DISTINCT)` (ch12-04); truy vấn con vô hướng + `replace` (ch12-05); hai quý thành hai dòng rồi tự nối (ch12-06 bước 2). Ở ch10-01, `ROW_NUMBER` khác kết quả ở cả 3 biến thể (là câu `wrong:`); `DENSE_RANK` trùng `RANK` ở biến thể 0 và 2 nhưng khác ở biến thể 1 (32 so với 31 dòng), đúng như đề "khách kế tiếp nhảy hạng".

---

### Task 0: Kiểm tiền đề (không sửa file)

- [ ] **Step 1: Test và kiểu đang sạch**

Run: `npm test && npx tsc --noEmit`
Expected: mọi test PASS, `tsc` không lỗi.

- [ ] **Step 2: Grep các điểm neo**

Run:
```bash
for p in "if (body.kind === 'explain') return runExplain(db, body.sql);" "  | { kind: 'dropImport'; table?: string };" "  if (fm.starter !== undefined) {" "  full_join: /\\bFULL\\s+(OUTER\\s+)?JOIN\\b/i," "twistUsed(skill, st.solution)" "    isDone ? null : shapeCard(tk, stepIndex)," "// newAt: Plan 4" "  'work.trap': " "  '21000': 'sqlerr.21000'," "const PLAN3 = " "'ch9-05': { kind: 'ship' }, 'ch9-06': { kind: 'promotion' }," "reserved for Plan 4" "['tickets', /^ticketSources-/, 70]"; do printf '%-70s' "$p"; grep -rlF -- "$p" src tests scripts | wc -l; done
grep -c "outcomes: \[\]" content/chapters.yml
ls content/tickets
```
Expected: mỗi mẫu có trong ít nhất một file (cột cuối ≥ 1); `chapters.yml` có 3 dòng `outcomes: []` (ch10–12); `content/tickets` có `ch1` … `ch9`.

---

### Task 1: Seed chương 10–12 và chỉ mục dựng sẵn (spike trước, đo rồi mới viết nội dung)

**Files:**
- Modify: `src/db/schema.sql`, `src/db/seed.sql`, `tests/seed.test.ts`

**Interfaces:**
- Produces: bảng `free_time_terms`, `container_events`, `claims` (cột ở S1) và các móc ghi ở đầu khối Plan 4 trong `seed.sql`; chỉ mục `shipments_booking_date_idx`, `shipments_customer_id_idx`; không có chỉ mục nào trên `container_events.container_id`.

- [ ] **Step 1: Viết test seed (md5 21 bảng cũ, móc Plan 4, kích thước bảng sự kiện)**

**Sửa `tests/seed.test.ts`** — thay:
```ts
const PLAN3 = ['exchange_rates', 'rate_contracts', 'quotations', 'invoices', 'payments', 'vendor_bills', 'master_bills', 'house_bills'];
const hashOf = (t: string) => `SELECT md5(string_agg(x::text, '|' ORDER BY x::text)) AS h FROM ${t} x`;
```
bằng:
```ts
const PLAN3 = ['exchange_rates', 'rate_contracts', 'quotations', 'invoices', 'payments', 'vendor_bills', 'master_bills', 'house_bills'];
/** Plan 4 (chapters 10–12), appended after PLAN3. */
const PLAN4 = ['free_time_terms', 'container_events', 'claims'];
const hashOf = (t: string) => `SELECT md5(string_agg(x::text, '|' ORDER BY x::text)) AS h FROM ${t} x`;
```

**Sửa `tests/seed.test.ts`** — thay:
```ts
    const [a, b] = await Promise.all([freshDb(), freshDb()]);
    for (const t of [...TABLES, ...PLAN2, ...PLAN3]) {
      const ha = (await a.query<{ h: string }>(hashOf(t))).rows[0].h;
```
bằng:
```ts
    const [a, b] = await Promise.all([freshDb(), freshDb()]);
    for (const t of [...TABLES, ...PLAN2, ...PLAN3, ...PLAN4]) {
      const ha = (await a.query<{ h: string }>(hashOf(t))).rows[0].h;
```

**Sửa `tests/seed.test.ts`** — thay:
```ts

  // Appending blocks must never re-roll older tables: ch1–3 hashes taken before Plan 2 (HEAD 646d9e0), Plan 2 hashes before Plan 3 (HEAD fd96e31).
  it('bảng cũ giữ nguyên từng byte khi thêm khối seed mới', async () => {
```
bằng:
```ts

  // Appending blocks must never re-roll older tables: ch1–3 hashes taken before Plan 2 (HEAD 646d9e0), Plan 2 hashes before Plan 3 (HEAD fd96e31),
  // Plan 3 hashes before Plan 4 (HEAD 2ddc893). The chapter 11 indexes and ANALYZE change plans, never rows.
  it('bảng cũ giữ nguyên từng byte khi thêm khối seed mới', async () => {
```

**Sửa `tests/seed.test.ts`** — thay:
```ts
      incoterms: 'f25ab8a8b131594e64bbb55b131e0134',
    };
    for (const t of [...TABLES, ...PLAN2]) expect((await one<{ h: string }>(hashOf(t))).h, t).toBe(before[t]);
  });
```
bằng:
```ts
      incoterms: 'f25ab8a8b131594e64bbb55b131e0134',
      exchange_rates: '139f40a81f709388c1a50e14231c7601',
      rate_contracts: '8f9893abee3531cc1d18e5a981af0201',
      quotations: 'fe3c52d3047a84aeb9796c9347ec7615',
      invoices: 'e44cc2eb4dc468236fd3249728f1461f',
      payments: '02f630083dfd442e82ab62550e9457c8',
      vendor_bills: 'fc1cae4b377366523d6e3ad01c464712',
      master_bills: '718148ac3166c207d4c6925bf3097411',
      house_bills: '97308ee315ed7ddab557e0ce7302725e',
    };
    for (const t of [...TABLES, ...PLAN2, ...PLAN3]) expect((await one<{ h: string }>(hashOf(t))).h, t).toBe(before[t]);
  });
```

**Sửa `tests/seed.test.ts`** — thay:
```ts

  it('móc câu chuyện: khách 171-190 ngừng book từ 2026-03-01', async () => {
```
bằng:
```ts

  it('Plan 4: container_events 100k–150k dòng, không trùng thời điểm trong một container, không có gì sau 2026-10-31', async () => {
    // ≥ 100k so the index lab shows a real difference; < 150k because the seed's ANALYZE (statistics target 500) reads every row.
    const n = (await one<{ n: number }>('SELECT count(*)::int AS n FROM container_events')).n;
    expect(n).toBeGreaterThan(100_000);
    expect(n).toBeLessThan(150_000);
    expect((await one<{ n: number }>(`SELECT count(*)::int AS n FROM (SELECT container_id, event_time FROM container_events
      GROUP BY 1, 2 HAVING count(*) > 1) x`)).n).toBe(0); // ROW_NUMBER over event_time never meets a tie (ch10-03)
    expect((await one<{ n: number }>(`SELECT (SELECT count(*) FROM container_events WHERE event_time >= '2026-11-01')
      + (SELECT count(*) FROM claims WHERE claim_date > '2026-10-31') AS n`)).n).toBe(0);
    // every events row has a valid container, and events of one container follow the journey order
    expect((await one<{ n: number }>(`SELECT count(*)::int AS n FROM (SELECT e.container_id, e.event,
      lag(e.event) OVER (PARTITION BY e.container_id ORDER BY e.event_time) AS prev FROM container_events e) x
      WHERE (event, prev) NOT IN (('GATE_IN_FULL', 'GATE_OUT_EMPTY'), ('LOADED', 'GATE_IN_FULL'), ('DISCHARGED', 'LOADED'),
        ('GATE_OUT_FULL', 'DISCHARGED'), ('EMPTY_RETURNED', 'GATE_OUT_FULL')) AND prev IS NOT NULL`)).n).toBe(0);
    expect((await one<{ n: number }>(`SELECT count(*)::int AS n FROM pg_indexes WHERE tablename = 'container_events' AND indexdef ILIKE '%container_id%'`)).n).toBe(0);
  });

  it('móc Plan 4: khách 1 vượt D&D từ quý 3/2026; container kẹt ngày 31/10/2026 (ch10-03, ch10-04, ch12-03)', async () => {
    const over = await db().then((d) => d.query<{ q: string; c1: number; others: number }>(`WITH t AS (SELECT container_id,
        max(event_time) FILTER (WHERE event = 'DISCHARGED') AS dis, max(event_time) FILTER (WHERE event = 'EMPTY_RETURNED') AS ret
        FROM container_events GROUP BY 1),
      o AS (SELECT s.customer_id, to_char(t.ret, 'YYYY-Q') AS q, greatest(0, t.ret::date - t.dis::date - f.free_days) AS over
        FROM t JOIN containers c ON c.id = t.container_id JOIN shipments s ON s.id = c.shipment_id
        JOIN free_time_terms f ON f.customer_id = s.customer_id AND t.dis::date BETWEEN f.valid_from AND f.valid_to
        WHERE s.direction = 'IMPORT' AND t.ret IS NOT NULL)
      SELECT q, (sum(over) FILTER (WHERE customer_id = 1))::int AS c1, (sum(over) FILTER (WHERE customer_id <> 1))::int AS others
      FROM o WHERE q IN ('2026-2', '2026-3') GROUP BY q ORDER BY q`));
    const [q2, q3] = over.rows;
    expect(q2.c1).toBe(0);
    expect(q3.c1).toBeGreaterThan(q3.others); // the jump comes from customer 1 alone
    expect(Math.abs(q3.others - q2.others)).toBeLessThan(q2.others * 0.3);
    const stuck = await one<{ n5: number; n10: number }>(`WITH l AS (SELECT DISTINCT ON (container_id) container_id, event, event_time
        FROM container_events ORDER BY container_id, event_time DESC)
      SELECT count(*) FILTER (WHERE DATE '2026-10-31' - event_time::date > 5)::int AS n5,
             count(*) FILTER (WHERE DATE '2026-10-31' - event_time::date > 10)::int AS n10
      FROM l WHERE event NOT IN ('LOADED', 'EMPTY_RETURNED')`);
    expect(stuck.n5).toBeGreaterThan(stuck.n10);
    expect(stuck.n10).toBeGreaterThan(5);
    // free time: one row per customer and period, rate +20% from 2026-07-01, free days unchanged
    expect((await one<{ n: number }>(`SELECT count(*)::int AS n FROM free_time_terms a JOIN free_time_terms b
      ON b.customer_id = a.customer_id AND b.valid_from = '2026-07-01' WHERE a.valid_to = '2026-06-30'
      AND b.free_days = a.free_days AND b.usd_per_day = round(a.usd_per_day * 1.2, 2)`)).n).toBe(200);
  });

  it('móc Plan 4: Blue Anchor Lines có tỷ lệ claim năm 2026 gấp hơn 2 lần mọi hãng khác (ch12-04, ch12-06)', async () => {
    const r = await db().then((d) => d.query<{ id: number; rate: number }>(`SELECT s.carrier_id AS id,
        (count(c.id) * 100.0 / count(DISTINCT s.id))::float AS rate
      FROM shipments s LEFT JOIN claims c ON c.shipment_id = s.id
      WHERE s.ata >= '2026-01-01' AND s.ata < '2026-10-01' GROUP BY 1`));
    const bal = r.rows.find((x) => x.id === 3)!.rate;
    for (const x of r.rows.filter((x) => x.id !== 3)) expect(bal, String(x.id)).toBeGreaterThan(2 * x.rate);
  });

  it('móc câu chuyện: khách 171-190 ngừng book từ 2026-03-01', async () => {
```


- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/seed.test.ts`
Expected: FAIL ở các test Plan 4 với `relation "free_time_terms" does not exist` (và các bảng mới khác). Test md5 21 bảng cũ PASS ngay.

- [ ] **Step 3: Thêm bảng vào cuối `schema.sql`**

**Thêm vào cuối `src/db/schema.sql`:**
```sql

-- Plan 4 (chapters 10-12): container tracking, free time (D&D), claims. Seed blocks for them are appended at the end of seed.sql.
CREATE TABLE free_time_terms (
  id int PRIMARY KEY,
  customer_id int NOT NULL REFERENCES customers(id),
  valid_from date NOT NULL,
  valid_to date NOT NULL,
  free_days int NOT NULL,
  usd_per_day numeric(8, 2) NOT NULL
);

-- ~145k rows: the seed bulk-loads it first and adds the primary key and the foreign key afterwards (3x faster).
-- Deliberately no index on container_id: that is the chapter 11 index lab.
CREATE TABLE container_events (
  id int NOT NULL,
  container_id int NOT NULL,
  event text NOT NULL CHECK (event IN ('GATE_OUT_EMPTY', 'GATE_IN_FULL', 'LOADED', 'DISCHARGED', 'GATE_OUT_FULL', 'EMPTY_RETURNED')),
  event_time timestamp NOT NULL
);

CREATE TABLE claims (
  id int PRIMARY KEY,
  claim_no text NOT NULL UNIQUE,
  shipment_id int NOT NULL REFERENCES shipments(id),
  claim_date date NOT NULL,
  reason text NOT NULL CHECK (reason IN ('DAMAGE', 'SHORTAGE', 'DELAY')),
  amount_usd numeric(10, 2) NOT NULL
);
```


- [ ] **Step 4: Thêm khối seed Plan 4**

**Sửa `src/db/seed.sql`** — thay:
```sql
--   * chapters 7-9 (Plan 3), incl. the Europe lane (NLRTM/DEHAM/BEANR) margin drop in Q3 2026: head of the Plan 3 block at the end
--   * reserved for Plan 4: customer 1 D&D spike, carrier 3 (Blue Anchor Lines) high claim rate

```
bằng:
```sql
--   * chapters 7-9 (Plan 3), incl. the Europe lane (NLRTM/DEHAM/BEANR) margin drop in Q3 2026: head of the Plan 3 block at the end
--   * chapters 10-12 (Plan 4): customer 1 D&D spike, carrier 3 (Blue Anchor Lines) high claim rate, container_events for the chapter 11 index lab: head of the Plan 4 block at the end

```

**Sửa `src/db/seed.sql`** — thay:
```sql
FROM d WHERE issue_date <= DATE '2026-10-31';
```
bằng:
```sql
FROM d WHERE issue_date <= DATE '2026-10-31';

-- ===== Plan 4 (chapters 10-12). Story hooks (tickets and tests/seed.test.ts depend on them):
--   * free_time_terms: one row per customer and period (2024-11-01..2026-06-30, 2026-07-01..2026-12-31); free days 7/10/14
--     never change, the daily rate rises 20% from 2026-07-01 (ch10-04, ch12-03)
--   * container_events (id = container_id * 10 + step): the life of every FCL container whose shipment sailed (ETD) from
--     2025-05-01, when container tracking went live: empty out, full in, loaded, discharged, full out, empty back;
--     about 109k rows (the chapter 11 lab needs a big table; ANALYZE below reads all of it, keep it under 150k); nothing after 2026-10-31 (ch10-03, ch11)
--   * D&D = days from DISCHARGED to EMPTY_RETURNED of import containers; customer 1 keeps its import containers about
--     2 weeks longer once discharged from 2026-07-01, so its overrun jumps in Q3 2026 and its October boxes are the
--     ones stuck at full gate-out on 2026-10-31 (ch10-03, ch10-04, ch12-03, ch12-06)
--   * claims: about 1.5% of non-cancelled shipments; carrier 3 (Blue Anchor Lines) about 4x that rate in 2026 (ch12-04, ch12-06)
--   * prebuilt indexes for chapter 11 at the very end; container_events has none on container_id (the index lab)
SELECT setseed(0.717);
WITH d AS (
  SELECT id, (ARRAY[7, 10, 14])[1 + floor(random() * 3)::int] AS free, 40 + floor(random() * 5)::int * 5 AS rate FROM customers ORDER BY id
)
INSERT INTO free_time_terms (id, customer_id, valid_from, valid_to, free_days, usd_per_day)
SELECT row_number() OVER (ORDER BY d.id, p.k), d.id, p.f, p.t, d.free, round((d.rate * p.mult)::numeric, 2)
FROM d CROSS JOIN (VALUES (1, DATE '2024-11-01', DATE '2026-06-30', 1.0), (2, DATE '2026-07-01', DATE '2026-12-31', 1.2)) p(k, f, t, mult);

SELECT setseed(0.727);
WITH c AS (
  SELECT c.id, s.direction, s.customer_id, s.status, s.etd, s.atd, s.ata,
    random() AS r1, random() AS r2, random() AS r3, random() AS r4, random() AS r5, random() AS r6
  FROM containers c JOIN shipments s ON s.id = c.shipment_id
  WHERE s.status <> 'CANCELLED' AND s.etd >= DATE '2025-05-01'
  ORDER BY c.id
), t AS (
  SELECT id, direction, customer_id, status,
    etd - 3 - floor(r1 * 4)::int + make_interval(hours => 7 + floor(r2 * 10)::int) AS gate_out_empty,
    etd - 1 - floor(r3 * 2)::int + make_interval(hours => 6 + floor(r4 * 12)::int) AS gate_in_full,
    atd + make_interval(hours => 2 + floor(r5 * 20)::int) AS loaded,
    ata + make_interval(hours => 1 + floor(r6 * 20)::int) AS discharged,
    r1, r2, r3
  FROM c
), u AS (
  SELECT t.*,
    CASE WHEN status = 'DELIVERED' THEN discharged + make_interval(days => 1 + floor(r2 * 4)::int, hours => 3) END AS gate_out_full
  FROM t
), v AS (
  SELECT u.*, gate_out_full + make_interval(days => 2 + floor(r3 * 7)::int
      + CASE WHEN customer_id = 1 AND direction = 'IMPORT' AND discharged >= '2026-07-01' THEN 12 + floor(r1 * 8)::int ELSE 0 END,
      hours => 5) AS empty_returned
  FROM u
), e AS (
  SELECT id, 1 AS k, 'GATE_OUT_EMPTY' AS event, gate_out_empty AS at FROM v
  UNION ALL SELECT id, 2, 'GATE_IN_FULL', gate_in_full FROM v
  UNION ALL SELECT id, 3, 'LOADED', loaded FROM v
  UNION ALL SELECT id, 4, 'DISCHARGED', discharged FROM v
  UNION ALL SELECT id, 5, 'GATE_OUT_FULL', gate_out_full FROM v
  UNION ALL SELECT id, 6, 'EMPTY_RETURNED', empty_returned FROM v
)
INSERT INTO container_events (id, container_id, event, event_time)
SELECT id * 10 + k, id, event, at FROM e WHERE at IS NOT NULL AND at < TIMESTAMP '2026-11-01';
ALTER TABLE container_events ADD PRIMARY KEY (id), ADD FOREIGN KEY (container_id) REFERENCES containers(id);

SELECT setseed(0.737);
WITH s AS (
  SELECT s.id, s.carrier_id, s.etd, s.atd, s.ata, s.gross_weight_kg, random() AS r_claim, random() AS r_reason, random() AS r_amt, random() AS r_day
  FROM shipments s WHERE s.status IN ('DELIVERED', 'ARRIVED') ORDER BY s.id
), k AS (
  SELECT s.*, ata + 3 + floor(r_day * 40)::int AS claim_date FROM s
  WHERE r_claim < CASE WHEN carrier_id = 3 AND ata >= DATE '2026-01-01' THEN 0.06 ELSE 0.015 END
)
INSERT INTO claims (id, claim_no, shipment_id, claim_date, reason, amount_usd)
SELECT row_number() OVER (ORDER BY claim_date, id), 'CL' || to_char(claim_date, 'YYMM') || lpad((row_number() OVER (ORDER BY claim_date, id))::text, 4, '0'),
  id, claim_date, (ARRAY['DAMAGE', 'SHORTAGE', 'DELAY'])[1 + floor(r_reason * 3)::int], round((150 + r_amt * 4850)::numeric, 2)
FROM k WHERE claim_date <= DATE '2026-10-31';

-- Chapter 11: the company's indexes on the busiest lookups. ANALYZE so plan costs are the same on every boot.
CREATE INDEX shipments_booking_date_idx ON shipments (booking_date);
CREATE INDEX shipments_customer_id_idx ON shipments (customer_id);
-- container_events is larger than ANALYZE's default 30,000-row sample, and the sample is not seeded by setseed():
-- read every row so plan costs are identical on every boot.
SET default_statistics_target = 500;
ANALYZE container_events;
RESET default_statistics_target;
ANALYZE free_time_terms, claims;
```


- [ ] **Step 5: Chạy test, xác nhận PASS**

Run: `npx vitest run tests/seed.test.ts && npx tsc --noEmit`
Expected: mọi test PASS.

- [ ] **Step 6: Đo seed và ngân sách**

Run:
```bash
node --input-type=module -e "import {PGlite} from '@electric-sql/pglite'; import {readFileSync as r} from 'node:fs'; for (let i = 0; i < 3; i++) { const d = new PGlite(); await d.exec(r('src/db/schema.sql','utf8')); const t = Date.now(); await d.exec(r('src/db/seed.sql','utf8')); console.log('seed', Date.now() - t, 'ms'); } process.exit(0)"
npm run build && node scripts/check-budget.mjs
```
Expected: seed ≈ 1,8 s mỗi lần trên máy dev (HEAD ≈ 1,5 s); `worker ≈ 142 KB gz / 160 KB` ok (nhóm `tickets` chỉ vượt sau Task 4–6, sửa ở Task 7). **Luật dừng (S2):** seed > 2,0 s hoặc `worker` > 150 KB thì dừng, thu hẹp cửa sổ `container_events` (ETD từ 2025-06-01 còn 103.047 dòng), không cắt móc, không xuống dưới 100.000 dòng.

- [ ] **Step 7: Chạy toàn bộ rồi commit**

Run: `npm test && npx tsc --noEmit`
Expected: tất cả PASS (mọi Solution ch1–9 không đổi kết quả; chỉ mục chỉ đổi kế hoạch).

```bash
git add src/db/schema.sql src/db/seed.sql tests/seed.test.ts
git commit -m "feat(seed): chapter 10-12 tables (free time terms, container events, claims), story hooks and prebuilt shipment indexes"
```

---

### Task 2: Engine: chấm theo kế hoạch, phòng thí nghiệm chỉ mục, từ khóa kỹ năng twist

**Files:**
- Create: `src/planCheck.ts`
- Modify: `src/db/run.ts`, `src/db/worker.ts`, `src/db/client.ts`, `src/tickets.ts`, `src/progress.ts`, `src/ui/work.ts`, `src/ui/brief.ts`, `src/ui/vizTabs.ts`, `src/ui/sqlErrors.ts`, `src/i18n/vi.ts`, `src/i18n/en.ts`, `tests/tickets.test.ts`, `tests/progress.test.ts`, `tests/sqlErrors.test.ts`, `tests/workRace.test.ts`

**Interfaces:**
- Produces: `PlanSpec { index }`, `LabSpec { table, ddl, max_cost_ratio }`, `checkPlan(json, table)`, `checkLab(before, after, spec)`, `planLine(json)`, `isCreateIndex(sql)` (`src/planCheck.ts`); `runLab(db, ddl, sql): Promise<LabResult>` (`src/db/run.ts`); `DbClient.lab(ddl, sql)`; `Step.plan`, `Step.lab`; `SKILL_SQL.window_agg`, `SKILL_SQL.index_design`; khóa i18n `sqlerr.42P20`, `sqlerr.windowOver`, `plan.seqScan`, `plan.noIndex`, `lab.title`, `lab.howto`, `lab.notIndex`, `lab.before`, `lab.after`, `lab.seqScan`, `lab.noIndex`, `lab.cost`, `sqlerr.labOnly`.
- Luồng Nộp: kết quả đúng + bước có `plan:` → `run('EXPLAIN (FORMAT JSON) …')` → `checkPlan`; sai thì báo bảng nào bị đọc cả bảng, mở tab EXPLAIN, tính là nộp sai. Bước có `lab:` → `labPlans` (kiểm `isCreateIndex` ở UI, worker kiểm lại) → `checkLab`. Ghi điểm, Recap, bước tiếp, câu kết luận đi qua một hàm chung `solved()` (tách từ `submit()`, không đổi hành vi).

- [ ] **Step 1: Viết test**

**Thêm vào cuối `tests/tickets.test.ts`:**
```ts

/** Chapter 11 (Plan 4): plan: and lab: follow columns: (one object on a normal ticket, one entry per step on a promotion review). */
describe('plan: và lab: (chương 11)', () => {
  const LAB = 'lab: { table: container_events, ddl: "CREATE INDEX ON container_events (container_id)", max_cost_ratio: 0.1 }';
  const withFm = (src: string, line: string) => src.replace('tables: [ports]\n', `tables: [ports]\n${line}\n`).replace('tables: [shipments]\n', `tables: [shipments]\n${line}\n`);

  it('ticket thường: plan: gắn vào bước duy nhất; lab: đọc bảng, câu mẫu và ngưỡng', () => {
    expect(parseTicket(withFm(NORMAL, 'plan: { index: ports }'), 'p.md').steps[0].plan).toEqual({ index: 'ports' });
    expect(parseTicket(withFm(NORMAL, LAB), 'l.md').steps[0].lab).toEqual({ table: 'container_events', ddl: 'CREATE INDEX ON container_events (container_id)', max_cost_ratio: 0.1 });
  });

  it('cột mốc: một mục mỗi bước, null = không có', () => {
    const t = parseTicket(withFm(BOSS, `plan: [{ index: shipments }, null]\nlab: [null, ${LAB.slice(5)}]`), 'b.md');
    expect(t.steps.map((s) => [s.plan, s.lab?.table])).toEqual([[{ index: 'shipments' }, undefined], [undefined, 'container_events']]);
  });

  it('báo lỗi định dạng', () => {
    const bad = (src: string) => () => parseTicket(src, 'bad.md');
    expect(bad(withFm(NORMAL, 'plan: { index: "Ports; DROP" }'))).toThrow(/plan:/);
    expect(bad(withFm(BOSS, 'plan: { index: shipments }'))).toThrow(/plan:/); // a promotion review needs one entry per step
    expect(bad(withFm(NORMAL, LAB.replace('0.1', '2')))).toThrow(/lab:/);
    expect(bad(withFm(NORMAL, `plan: { index: ports }\n${LAB}`))).toThrow(/cả plan: và lab:/);
    expect(bad(withFm(NORMAL, `${LAB}\nwrong:\n  - { sql: "SELECT 1", vi: "a", en: "b" }`))).toThrow(/wrong:/);
  });
});
```


**Sửa `tests/progress.test.ts`** — thay:
```ts
    ['full_join', 'SELECT * FROM a FULL OUTER JOIN b ON true', 'SELECT * FROM a LEFT JOIN b ON true'],
  ])('%s', (skill, yes, no) => {
```
bằng:
```ts
    ['full_join', 'SELECT * FROM a FULL OUTER JOIN b ON true', 'SELECT * FROM a LEFT JOIN b ON true'],
    ['window_agg', 'SELECT SUM(days) OVER (PARTITION BY name ORDER BY month) FROM m', 'SELECT RANK() OVER (ORDER BY teu DESC), LAG(teu) OVER (ORDER BY month) FROM m'],
    ['index_design', 'create unique index on container_events (container_id)', 'SELECT * FROM pg_indexes'],
  ])('%s', (skill, yes, no) => {
```


**Sửa `tests/sqlErrors.test.ts`** — thay:
```ts
  ['SELECT q.quote_no, (SELECT r.buy_usd FROM rate_contracts r WHERE r.pod = q.pod) FROM quotations q', 'sqlerr.21000'],
  ['SELECT mbl_no, issue_date FROM master_bills UNION SELECT hbl_no FROM house_bills', 'sqlerr.setColumns'],
```
bằng:
```ts
  ['SELECT q.quote_no, (SELECT r.buy_usd FROM rate_contracts r WHERE r.pod = q.pod) FROM quotations q', 'sqlerr.21000'],
  ['SELECT ref FROM shipments WHERE ROW_NUMBER() OVER (ORDER BY ref) <= 3', 'sqlerr.42P20'],
  ['SELECT ref, LAG(ref) FROM shipments', 'sqlerr.windowOver'],
  ['SELECT mbl_no, issue_date FROM master_bills UNION SELECT hbl_no FROM house_bills', 'sqlerr.setColumns'],
```


**Thêm vào cuối `tests/workRace.test.ts`:**
```ts

/** Chapter 11 (Plan 4): the plan check after a right result, and the index lab. Plans are minimal EXPLAIN JSON. */
describe('chương 11: chấm kế hoạch và phòng thí nghiệm chỉ mục', () => {
  const SEQ = [{ Plan: { 'Node Type': 'Seq Scan', 'Relation Name': 't', 'Total Cost': 100 } }];
  const IDX = [{ Plan: { 'Node Type': 'Index Scan', 'Relation Name': 't', 'Index Name': 'x', 'Total Cost': 5 } }];
  function setup11(plan: unknown) {
    const db = {
      run: vi.fn((sql: string) => Promise.resolve(sql.startsWith('EXPLAIN') ? { columns: ['QUERY PLAN'], types: [114], rows: [[plan]] } : result)),
      lab: vi.fn(() => Promise.resolve({ before: SEQ, after: plan })),
    };
    const panel = { show: vi.fn(), refresh: vi.fn(), active: 'columns' };
    const deps = { db, panel, onSolved: vi.fn(), onStepSolved: vi.fn(), onConclusion: vi.fn(), onRun: vi.fn(), onWrong: vi.fn() };
    return { work: mountWork(fakeEl() as unknown as HTMLElement, deps as never), deps };
  }
  const planTicket = (): Ticket => ({ ...ticket('P'), steps: [{ title: '', prompt: '', solution: 'SELECT 1 AS n', plan: { index: 't' } }] });
  const labTicket = (): Ticket => ({ ...ticket('L'), steps: [{ title: '', prompt: '', solution: 'SELECT 1 AS n', lab: { table: 't', ddl: 'CREATE INDEX ON t (a)', max_cost_ratio: 0.1 } }] });

  it('kết quả đúng nhưng kế hoạch đọc cả bảng: nộp sai, mở tab EXPLAIN, không ghi điểm', async () => {
    app.save.drafts['P#0'] = 'SELECT 1  AS n';
    const { work, deps } = setup11(SEQ);
    open(work, planTicket());
    editors[0].opts.onSubmit();
    await flush();
    expect(deps.onWrong).toHaveBeenCalledOnce();
    expect(deps.onSolved).not.toHaveBeenCalled();
    expect(deps.panel.show).toHaveBeenLastCalledWith('explain');
    expect(app.save.graded).toEqual({});
  });

  it('kết quả đúng và kế hoạch dùng chỉ mục: qua', async () => {
    app.save.drafts['P#0'] = 'SELECT 1  AS n';
    const { work, deps } = setup11(IDX);
    open(work, planTicket());
    editors[0].opts.onSubmit();
    await flush();
    expect(deps.onSolved).toHaveBeenCalledOnce();
    expect(deps.db.run).toHaveBeenCalledWith('EXPLAIN (FORMAT JSON) SELECT 1  AS n');
  });

  it('phòng thí nghiệm: chỉ mục làm kế hoạch đọc qua chỉ mục và đủ rẻ thì qua, lưu câu CREATE INDEX làm bài đã chấm', async () => {
    app.save.drafts['L#0'] = 'CREATE INDEX ON t (a)';
    const { work, deps } = setup11(IDX);
    open(work, labTicket());
    editors[0].opts.onSubmit();
    await flush();
    expect(deps.db.lab).toHaveBeenCalledWith('CREATE INDEX ON t (a)', 'SELECT 1 AS n');
    expect(deps.onSolved).toHaveBeenCalledOnce();
    expect(app.save.graded).toEqual({ 'L#0': 'CREATE INDEX ON t (a)' });
  });

  it('phòng thí nghiệm: kế hoạch vẫn đọc cả bảng thì nộp sai; câu không phải CREATE INDEX thì không chạy, không tính sai', async () => {
    app.save.drafts['L#0'] = 'CREATE INDEX ON t (b)';
    const a = setup11(SEQ);
    open(a.work, labTicket());
    editors[0].opts.onSubmit();
    await flush();
    expect(a.deps.onWrong).toHaveBeenCalledOnce();
    expect(a.deps.onSolved).not.toHaveBeenCalled();

    app.save.drafts['L#0'] = 'SELECT 1';
    const b = setup11(IDX);
    open(b.work, labTicket());
    editors[editors.length - 1].opts.onSubmit();
    await flush();
    expect(b.deps.db.lab).not.toHaveBeenCalled();
    expect(b.deps.onWrong).not.toHaveBeenCalled();
  });
});
```


- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/tickets.test.ts tests/progress.test.ts tests/sqlErrors.test.ts tests/workRace.test.ts`
Expected: FAIL: `steps[0].plan` là `undefined`, parser không báo lỗi `plan:`/`lab:`; `twistUsed('window_agg', …)` là `undefined`; hai lỗi hàm cửa sổ chưa có giải thích; 4 test chương 11 của `workRace` (kế hoạch không được kiểm, `db.lab` không được gọi).

- [ ] **Step 3: `src/planCheck.ts` và phòng thí nghiệm trong worker**

**Tạo `src/planCheck.ts`:**
```ts
/**
 * Chapter 11 grading on the execution plan (curriculum §6.3): node types and planner cost from
 * EXPLAIN (FORMAT JSON) without ANALYZE, never milliseconds (WASM timing is noisy, costs are deterministic).
 */

/** `plan:` of a step: the result must be right AND the plan must read `index` (a table) through an index. */
export interface PlanSpec { index: string }
/**
 * `lab:` of a step (index lab): the player's editor holds one CREATE INDEX; the step's Solution is the slow query.
 * Passes when, after the player's index, `table` is read through an index and the root cost is ≤ max_cost_ratio × before.
 * `ddl` is the reference answer (Recap, content tests).
 */
export interface LabSpec { table: string; ddl: string; max_cost_ratio: number }

interface RawNode { 'Node Type': string; 'Relation Name'?: string; 'Index Name'?: string; 'Total Cost'?: number; Plans?: RawNode[] }

/** Seq Scan: reads the whole table. Index / Index Only / Bitmap Heap Scan: reads it through an index. */
const INDEX_READS = new Set(['Index Scan', 'Index Only Scan', 'Bitmap Heap Scan']);

/** EXPLAIN (FORMAT JSON) output (the cell PGlite returns) → every node, root first. */
export function planNodes(json: unknown): RawNode[] {
  const root = (Array.isArray(json) ? json[0] : undefined) as { Plan?: RawNode } | undefined;
  const out: RawNode[] = [];
  const walk = (n: RawNode) => {
    out.push(n);
    for (const c of n.Plans ?? []) walk(c);
  };
  if (root?.Plan) walk(root.Plan);
  return out;
}

export const rootCost = (json: unknown): number => planNodes(json)[0]?.['Total Cost'] ?? 0;

/** Why the plan does not read `table` through an index, or undefined when it does. */
export type PlanFail = { reason: 'seqScan' | 'noIndex'; table: string } | { reason: 'cost'; table: string; ratio: number };

export function checkPlan(json: unknown, table: string): PlanFail | undefined {
  const nodes = planNodes(json).filter((n) => n['Relation Name'] === table);
  if (nodes.some((n) => n['Node Type'] === 'Seq Scan')) return { reason: 'seqScan', table };
  if (!nodes.some((n) => INDEX_READS.has(n['Node Type']))) return { reason: 'noIndex', table };
  return undefined;
}

export function checkLab(before: unknown, after: unknown, spec: LabSpec): PlanFail | undefined {
  const fail = checkPlan(after, spec.table);
  if (fail) return fail;
  const ratio = rootCost(after) / Math.max(rootCost(before), 1e-9);
  return ratio <= spec.max_cost_ratio ? undefined : { reason: 'cost', table: spec.table, ratio };
}

/** One line per plan for the feedback: the scan and index nodes and the total cost, e.g. "Seq Scan container_events · 2168". */
export function planLine(json: unknown): string {
  const scans = planNodes(json).filter((n) => n['Relation Name'] || n['Index Name'])
    .map((n) => [n['Node Type'], n['Relation Name'], n['Index Name'] && `(${n['Index Name']})`].filter(Boolean).join(' '));
  return `${scans.join(', ')} · ${Math.round(rootCost(json))}`;
}

/**
 * The index lab accepts exactly one CREATE [UNIQUE] INDEX (comments allowed). Checked in the worker, not only in the UI;
 * PGlite's query() also refuses a second statement. CONCURRENTLY cannot run inside the lab's transaction.
 */
export function isCreateIndex(sql: string): boolean {
  const body = sql.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
  return /^CREATE\s+(UNIQUE\s+)?INDEX\b/i.test(body) && !/\bCONCURRENTLY\b/i.test(body);
}
```


**Sửa `src/db/run.ts`** — thay:
```ts
import type { PGlite } from '@electric-sql/pglite';

```
bằng:
```ts
import type { PGlite } from '@electric-sql/pglite';
import { isCreateIndex } from '../planCheck';

```

**Sửa `src/db/run.ts`** — thay:
```ts
    throw info ? new SqlError({ ...info, position: undefined }) : e;
  } finally {
    await db.exec('ROLLBACK');
  }
}
```
bằng:
```ts
    throw info ? new SqlError({ ...info, position: undefined }) : e;
  } finally {
    await db.exec('ROLLBACK');
  }
}

/** The index lab's answer: plans of the step's query before and after the player's index (planCheck.ts). */
export interface LabResult { before: unknown; after: unknown }

/**
 * Index lab (chapter 11): EXPLAIN `sql`, create the player's index, EXPLAIN again, all in one transaction that is
 * always rolled back, so the index never outlives the request. `ddl` must be one CREATE INDEX: checked here, in the
 * worker, and sent through query() (one statement only), never exec().
 */
export async function runLab(db: PGlite, ddl: string, sql: string): Promise<LabResult> {
  if (!isCreateIndex(ddl)) throw new SqlError({ message: 'only one CREATE INDEX statement is allowed here', code: 'LAB01' });
  const explain = async () => (await db.query<unknown[]>(`EXPLAIN (FORMAT JSON) ${sql}`, [], { rowMode: 'array' })).rows[0][0];
  await db.exec('BEGIN');
  try {
    const before = await explain();
    await db.query(ddl);
    return { before, after: await explain() };
  } catch (e) {
    const info = sqlErrorInfo(e);
    throw info ? new SqlError(info) : e;
  } finally {
    await db.exec('ROLLBACK');
  }
}
```


**Sửa `src/db/worker.ts`** — thay:
```ts
import { dropImport, importCsv } from './import';
import { runExplain, runSandboxed, sqlErrorInfo } from './run';

```
bằng:
```ts
import { dropImport, importCsv } from './import';
import { runExplain, runLab, runSandboxed, sqlErrorInfo } from './run';

```

**Sửa `src/db/worker.ts`** — thay:
```ts
  if (body.kind === 'explain') return runExplain(db, body.sql);
  if (body.kind === 'steps') {
```
bằng:
```ts
  if (body.kind === 'explain') return runExplain(db, body.sql);
  if (body.kind === 'lab') return runLab(db, body.ddl, body.sql);
  if (body.kind === 'steps') {
```


**Sửa `src/db/client.ts`** — thay:
```ts
import type { LoadProgress } from './loadProgress';
import { SqlError, type QueryResult, type SqlErrorInfo } from './run';

```
bằng:
```ts
import type { LoadProgress } from './loadProgress';
import { SqlError, type LabResult, type QueryResult, type SqlErrorInfo } from './run';

```

**Sửa `src/db/client.ts`** — thay:
```ts
  | { kind: 'import'; req: ImportRequest; file: Blob }
  | { kind: 'dropImport'; table?: string };

```
bằng:
```ts
  | { kind: 'import'; req: ImportRequest; file: Blob }
  | { kind: 'dropImport'; table?: string }
  /** Index lab (chapter 11): `ddl` is the player's CREATE INDEX, `sql` the step's query; see runLab. */
  | { kind: 'lab'; ddl: string; sql: string };

```

**Sửa `src/db/client.ts`** — thay:
```ts
    return this.request<QueryResult>('run', sql);
  }
```
bằng:
```ts
    return this.request<QueryResult>('run', sql);
  }

  /** Plans of `sql` before and after the player's index, in one rolled-back transaction (chapter 11 index lab). */
  lab(ddl: string, sql: string): Promise<LabResult> {
    return this.enqueue<LabResult>({ kind: 'lab', ddl, sql }, this.timeoutMs);
  }
```


- [ ] **Step 4: Đọc `plan:`/`lab:`, từ khóa twist**

**Sửa `src/tickets.ts`** — thay:
```ts
import { bilingualOf, type Bilingual } from './progress';
import { parseScene, type Scene } from './scene';
```
bằng:
```ts
import { bilingualOf, type Bilingual } from './progress';
import type { LabSpec, PlanSpec } from './planCheck';
import { parseScene, type Scene } from './scene';
```

**Sửa `src/tickets.ts`** — thay:
```ts
  columns?: Bilingual[];
}
```
bằng:
```ts
  columns?: Bilingual[];
  /** Chapter 11 `plan:`: after a correct result, the plan must read this table through an index. */
  plan?: PlanSpec;
  /** Chapter 11 `lab:`: the player writes a CREATE INDEX that speeds up this step's Solution (the slow query). */
  lab?: LabSpec;
}
```

**Sửa `src/tickets.ts`** — thay:
```ts

  if (fm.starter !== undefined) {
```
bằng:
```ts

  // plan:/lab: like columns: one object on a normal ticket, one entry per step (null = none) on a promotion review.
  const perStep = (key: 'plan' | 'lab', check: (v: Record<string, unknown>) => boolean): Record<string, unknown>[] | undefined => {
    const v = fm[key];
    if (v === undefined) return undefined;
    const list = t.beat === 'boss' ? v : [v];
    if (!Array.isArray(list) || list.length !== t.steps.length
      || list.some((x) => x !== null && (!x || typeof x !== 'object' || Array.isArray(x) || !check(x as Record<string, unknown>)))) {
      fail(`${key}: ticket thường một bảng, cột mốc một danh sách mỗi bước (null = không có); xem content/TEMPLATE.md`);
    }
    return list as Record<string, unknown>[];
  };
  const isName = (x: unknown) => typeof x === 'string' && /^[a-z_]+$/.test(x);
  perStep('plan', (x) => isName(x.index))?.forEach((x, i) => { if (x) t.steps[i].plan = { index: x.index as string }; });
  perStep('lab', (x) => isName(x.table) && typeof x.ddl === 'string' && typeof x.max_cost_ratio === 'number' && x.max_cost_ratio > 0 && x.max_cost_ratio < 1)
    ?.forEach((x, i) => { if (x) t.steps[i].lab = { table: x.table as string, ddl: x.ddl as string, max_cost_ratio: x.max_cost_ratio as number }; });
  if (t.steps.some((st) => st.plan && st.lab)) fail('một bước không thể có cả plan: và lab:');
  if (t.steps.some((st) => st.lab) && fm.wrong !== undefined) fail('bước lab: không có kết quả để so với wrong:');

  if (fm.starter !== undefined) {
```


**Sửa `src/progress.ts`** — thay:
```ts
  full_join: /\bFULL\s+(OUTER\s+)?JOIN\b/i,
};
```
bằng:
```ts
  full_join: /\bFULL\s+(OUTER\s+)?JOIN\b/i,
  // An aggregate used as a window (running total, moving average), not ROW_NUMBER/LAG: `SUM(x) OVER`, `count(*) OVER`.
  window_agg: /\b(SUM|AVG|COUNT|MIN|MAX)\s*\([^()]*\)\s*OVER\b/i,
  index_design: /\bCREATE\s+(UNIQUE\s+)?INDEX\b/i,
};
```

**Sửa `src/progress.ts`** — thay:
```ts
        if (!boss.requires.includes(skill)) problems.push(`${boss.id}: boss phải kiểm tra kỹ năng twist "${skill}" (thêm vào requires)`);
        if (boss.steps.every((st) => twistUsed(skill, st.solution) === false)) {
          problems.push(`${boss.id}: không Solution nào của boss dùng kỹ năng twist "${skill}"`);
```
bằng:
```ts
        if (!boss.requires.includes(skill)) problems.push(`${boss.id}: boss phải kiểm tra kỹ năng twist "${skill}" (thêm vào requires)`);
        // A lab step's answer is its reference CREATE INDEX (lab.ddl), not the slow query in its Solution.
        if (boss.steps.every((st) => twistUsed(skill, st.lab?.ddl ?? st.solution) === false)) {
          problems.push(`${boss.id}: không Solution nào của boss dùng kỹ năng twist "${skill}"`);
```


- [ ] **Step 5: UI: chấm kế hoạch, phòng thí nghiệm, thẻ lab, "mới" ở tab EXPLAIN, chữ VI + EN**

**Sửa `src/ui/work.ts`** — thay:
```ts
import { loadHistory, pushHistory, writeHistory } from '../history';
import { getLang, isMac, t } from '../i18n';
```
bằng:
```ts
import { loadHistory, pushHistory, writeHistory } from '../history';
import { checkLab, checkPlan, isCreateIndex, planLine, type PlanFail } from '../planCheck';
import { getLang, isMac, t } from '../i18n';
```

**Sửa `src/ui/work.ts`** — thay:
```ts
const SCHEMA_TABS = new Set(['erd', 'columns']);

```
bằng:
```ts
const SCHEMA_TABS = new Set(['erd', 'columns']);

/** Chapter 11: why the plan was not accepted. `lab` = after the player's index (index lab), else the prebuilt indexes. */
export function planFailText(f: PlanFail, lab: boolean): string {
  if (f.reason === 'cost') return t('lab.cost', { table: f.table, pct: Math.round(f.ratio * 100) });
  return t(lab ? (f.reason === 'seqScan' ? 'lab.seqScan' : 'lab.noIndex') : (f.reason === 'seqScan' ? 'plan.seqScan' : 'plan.noIndex'), { table: f.table });
}

```

**Sửa `src/ui/work.ts`** — thay:
```ts
    explainBtn.disabled = busy;
    submitBtn.disabled = busy;
```
bằng:
```ts
    explainBtn.disabled = busy;
    explainBtn.hidden = !!ticket?.steps[stepIndex]?.lab; // a lab editor holds CREATE INDEX: Run already shows both plans
    submitBtn.disabled = busy;
```

**Sửa `src/ui/work.ts`** — thay:
```ts
    const { sql, offset } = ed.runTarget();
    const k = tk ? stepKey(tk.id, stepIndex) : '';
```
bằng:
```ts
    const { sql, offset } = ed.runTarget();
    const lab = tk?.steps[stepIndex].lab;
    if (lab && tk) return labRun(ed, sql, tk.steps[stepIndex].solution);
    const k = tk ? stepKey(tk.id, stepIndex) : '';
```

**Sửa `src/ui/work.ts`** — thay:
```ts

  async function submit(): Promise<void> {
```
bằng:
```ts

  /**
   * Index lab (chapter 11): the editor holds one CREATE INDEX; the step's Solution is the slow query. Shows its plan before
   * and after the index (rolled back). Returns the check result, or undefined when nothing was run (not an index, error).
   */
  async function labPlans(ed: Editor, ddl: string, query: string, spec?: Parameters<typeof checkLab>[2]): Promise<PlanFail | null | undefined> {
    if (!isCreateIndex(ddl)) {
      say('bad', () => t('lab.notIndex'));
      return undefined;
    }
    busy = true;
    setButtons();
    try {
      const { before, after } = await deps.db.lab(ddl, query);
      if (editor !== ed) return undefined;
      const fail = spec ? checkLab(before, after, spec) ?? null : null;
      const lines = () => h('div', {}, h('p', { class: 'm-0' }, t('lab.before', { plan: planLine(before) })), h('p', { class: 'm-0' }, t('lab.after', { plan: planLine(after) })),
        fail ? h('p', { class: 'mt-2 mb-0' }, planFailText(fail, true)) : null);
      say(spec && !fail ? 'good' : spec ? 'bad' : 'good', lines);
      return fail;
    } catch (e) {
      if (editor !== ed) return undefined;
      underline(e, 0);
      say('bad', () => errorView(e));
      return undefined;
    } finally {
      busy = false;
      setButtons();
    }
  }

  async function labRun(ed: Editor, ddl: string, query: string): Promise<void> {
    ed.closeCompletion();
    ed.clearError();
    await labPlans(ed, ddl, query);
  }

  async function submit(): Promise<void> {
```

**Sửa `src/ui/work.ts`** — thay:
```ts
    }
    ed.closeCompletion();
    ed.clearError();
    busy = true;
    setButtons();
```
bằng:
```ts
    }
    ed.closeCompletion();
    ed.clearError();
    const lab = tk.steps[i].lab;
    if (lab) {
      const fail = await labPlans(ed, sql, tk.steps[i].solution, lab);
      if (fail === undefined || editor !== ed) return;
      if (fail) {
        deps.onWrong?.();
        return;
      }
      return void solved(tk, i, k, sql, story);
    }
    busy = true;
    setButtons();
```

**Sửa `src/ui/work.ts`** — thay:
```ts
    let tip: (() => string) | undefined;
    try {
```
bằng:
```ts
    let tip: (() => string) | undefined;
    let planFail: PlanFail | undefined;
    try {
```

**Sửa `src/ui/work.ts`** — thay:
```ts
      if (!r.ok && r.reason !== 'error') tip = await wrongTip(tk, played?.result, r);
    } catch (e) {
```
bằng:
```ts
      if (!r.ok && r.reason !== 'error') tip = await wrongTip(tk, played?.result, r);
      // Chapter 11: a right result must also read the table through an index. EXPLAIN without ANALYZE: costs, no run.
      const plan = tk.steps[i].plan;
      if (r.ok && plan) planFail = checkPlan((await deps.db.run(`EXPLAIN (FORMAT JSON) ${sql}`)).rows[0]?.[0], plan.index);
    } catch (e) {
```

**Sửa `src/ui/work.ts`** — thay:
```ts
    }
    deps.panel.show('result'); // the graded run, not the Columns tab left open from before
    if (story) {
```
bằng:
```ts
    }
    if (planFail) {
      deps.onWrong?.();
      const f = planFail;
      say('bad', () => planFailText(f, false));
      deps.panel.show('explain'); // the plan that was refused
      return;
    }
    deps.panel.show('result'); // the graded run, not the Columns tab left open from before
    solved(tk, i, k, sql, story);
  }

  /** Credit for a correct step: graded SQL for the Recap, next step / conclusion / solved, message and celebration. */
  function solved(tk: Ticket, i: number, k: string, sql: string, story: boolean): void {
    if (story) {
```


**Sửa `src/ui/brief.ts`** — thay:
```ts
  return card;
}
```
bằng:
```ts
  return card;
}

/** Index lab step (chapter 11): the slow query (the step's Solution) the player's CREATE INDEX must speed up. Replaces the shape card. */
function labCard(sql: string): HTMLElement {
  return h('section', { class: 'my-3 rounded-xl bg-panel p-3 ring-1 ring-line', 'aria-label': t('lab.title') },
    h('h3', { class: 'mt-0' }, t('lab.title')),
    h('pre', { class: 'sql' }, sql),
    h('p', { class: 'mt-1 mb-0 text-sm text-muted' }, t('lab.howto')));
}
```

**Sửa `src/ui/brief.ts`** — thay:
```ts
      h('figure', {}, h('figcaption', { class: 'mb-1 text-sm text-muted' }, t('recap.yours')), h('pre', { class: 'sql' }, gradedSql(tk, i))),
      h('figure', {}, h('figcaption', { class: 'mb-1 text-sm text-muted' }, t('recap.reference')), h('pre', { class: 'sql' }, s.solution)))),
    next
```
bằng:
```ts
      h('figure', {}, h('figcaption', { class: 'mb-1 text-sm text-muted' }, t('recap.yours')), h('pre', { class: 'sql' }, gradedSql(tk, i))),
      h('figure', {}, h('figcaption', { class: 'mb-1 text-sm text-muted' }, t('recap.reference')), h('pre', { class: 'sql' }, s.lab?.ddl ?? s.solution)))), // lab step: the reference index, not the slow query
    next
```

**Sửa `src/ui/brief.ts`** — thay:
```ts
      : null,
    isDone ? null : shapeCard(tk, stepIndex),
    coach('hints'),
```
bằng:
```ts
      : null,
    isDone ? null : tk.steps[stepIndex].lab ? labCard(tk.steps[stepIndex].solution) : shapeCard(tk, stepIndex),
    coach('hints'),
```


**Sửa `src/ui/vizTabs.ts`** — thay:
```ts
  };
  registerTab({ id: 'explain', label: 'tab.explain', group: 'query', order: 20, render: withPlan(renderExplain) }); // newAt: Plan 4 (EXPLAIN is taught in ch11, L30/L35)
  registerTab({ id: 'flow', label: 'tab.flow', group: 'query', order: 30, render: withPlan(renderFlow) });
```
bằng:
```ts
  };
  registerTab({ id: 'explain', label: 'tab.explain', group: 'query', order: 20, newAt: 'ch11-01', render: withPlan(renderExplain) }); // EXPLAIN is taught in ch11 (L30/L35)
  registerTab({ id: 'flow', label: 'tab.flow', group: 'query', order: 30, render: withPlan(renderFlow) });
```


**Sửa `src/ui/sqlErrors.ts`** — thay:
```ts
  [/^(ORDER|GROUP) BY position \d+ is not in select list/, 'sqlerr.position'],
];
```
bằng:
```ts
  [/^(ORDER|GROUP) BY position \d+ is not in select list/, 'sqlerr.position'],
  // 42809 is shared with other wrong-object errors; this one is a ranking/LAG function written without OVER.
  [/^window function \S+ requires an OVER clause/, 'sqlerr.windowOver'],
];
```

**Sửa `src/ui/sqlErrors.ts`** — thay:
```ts
  '21000': 'sqlerr.21000',
};
```
bằng:
```ts
  '21000': 'sqlerr.21000',
  '42P20': 'sqlerr.42P20',
  LAB01: 'sqlerr.labOnly', // runLab (src/db/run.ts): the worker refused anything but one CREATE INDEX
};
```


**Sửa `src/i18n/vi.ts`** — thay:
```ts
  'work.trap': 'Bẫy hay gặp: {trap}',
  'recap.reflect': 'Ngẫm lại',
```
bằng:
```ts
  'work.trap': 'Bẫy hay gặp: {trap}',
  'plan.seqScan': 'Kết quả đúng, nhưng kế hoạch thực thi vẫn đọc toàn bộ bảng {table} (Seq Scan). Viết lại điều kiện để dùng được chỉ mục có sẵn (đừng bọc cột trong hàm), rồi nộp lại. Tab EXPLAIN đang mở kế hoạch đó.',
  'plan.noIndex': 'Kết quả đúng, nhưng kế hoạch không đọc bảng {table} qua chỉ mục nào. Xem tab EXPLAIN rồi nộp lại.',
  'lab.notIndex': 'Ở bài này editor chỉ chứa đúng một câu CREATE INDEX: chỉ mục bạn đề xuất. Câu truy vấn chậm nằm ở thẻ bên trái.',
  'lab.title': 'Câu truy vấn cần tăng tốc',
  'lab.howto': 'Viết một câu CREATE INDEX vào editor. Chạy để xem kế hoạch trước và sau khi có chỉ mục (chỉ mục bị hủy ngay sau đó), rồi nộp.',
  'lab.before': 'Trước: {plan}',
  'lab.after': 'Sau khi tạo chỉ mục: {plan}',
  'lab.seqScan': 'Chỉ mục này không giúp được: kế hoạch vẫn đọc toàn bộ bảng {table}. Cột đầu tiên của chỉ mục phải là cột mà truy vấn lọc hoặc dùng để nối.',
  'lab.noIndex': 'Kế hoạch mới không đọc bảng {table} qua chỉ mục nào. Đặt chỉ mục trên bảng {table}.',
  'lab.cost': 'Chỉ mục có được dùng, nhưng chi phí vẫn còn {pct}% so với trước. Xem lại cột và thứ tự cột trong chỉ mục.',
  'sqlerr.42P20': 'Hàm cửa sổ (ROW_NUMBER, RANK, LAG, SUM … OVER) chạy sau WHERE, nên không lọc theo nó ở WHERE được. Tính nó trong một CTE rồi lọc ở câu ngoài.',
  'sqlerr.windowOver': 'ROW_NUMBER, RANK, LAG, LEAD cần OVER (…) ngay sau: nói chia nhóm theo gì (PARTITION BY) và xếp theo gì (ORDER BY).',
  'sqlerr.labOnly': 'Phòng thí nghiệm chỉ chạy đúng một câu CREATE INDEX.',
  'recap.reflect': 'Ngẫm lại',
```


**Sửa `src/i18n/en.ts`** — thay:
```ts
  'work.trap': 'Common trap: {trap}',
  'recap.reflect': 'Think it over',
```
bằng:
```ts
  'work.trap': 'Common trap: {trap}',
  'plan.seqScan': 'The result is right, but the execution plan still reads the whole {table} table (Seq Scan). Rewrite the condition so the existing index can be used (do not wrap the column in a function), then submit again. The EXPLAIN tab shows that plan.',
  'plan.noIndex': 'The result is right, but the plan does not read the {table} table through any index. Look at the EXPLAIN tab, then submit again.',
  'lab.notIndex': 'In this task the editor holds exactly one CREATE INDEX statement: the index you propose. The slow query is in the card on the left.',
  'lab.title': 'The query to speed up',
  'lab.howto': 'Write one CREATE INDEX statement in the editor. Run it to see the plan before and with the index (the index is dropped right after), then submit.',
  'lab.before': 'Before: {plan}',
  'lab.after': 'With your index: {plan}',
  'lab.seqScan': 'This index does not help: the plan still reads the whole {table} table. The first column of the index must be the column the query filters or joins on.',
  'lab.noIndex': 'The new plan does not read the {table} table through any index. Put the index on the {table} table.',
  'lab.cost': 'The index is used, but the cost is still {pct}% of what it was. Check the columns and their order in the index.',
  'sqlerr.42P20': 'Window functions (ROW_NUMBER, RANK, LAG, SUM … OVER) run after WHERE, so WHERE cannot filter on them. Compute it in a CTE, then filter in the outer query.',
  'sqlerr.windowOver': 'ROW_NUMBER, RANK, LAG and LEAD need OVER (…) right after them: what to split by (PARTITION BY) and what to order by (ORDER BY).',
  'sqlerr.labOnly': 'The lab runs exactly one CREATE INDEX statement.',
  'recap.reflect': 'Think it over',
```


- [ ] **Step 6: Chạy test, xác nhận PASS rồi commit**

Run: `npx vitest run tests/tickets.test.ts tests/progress.test.ts tests/sqlErrors.test.ts tests/workRace.test.ts tests/i18n.test.ts tests/content.test.ts && npx tsc --noEmit`
Expected: tất cả PASS.

```bash
git add src/planCheck.ts src/db/run.ts src/db/worker.ts src/db/client.ts src/tickets.ts src/progress.ts src/ui/work.ts src/ui/brief.ts src/ui/vizTabs.ts src/ui/sqlErrors.ts src/i18n/vi.ts src/i18n/en.ts tests/tickets.test.ts tests/progress.test.ts tests/sqlErrors.test.ts tests/workRace.test.ts
git commit -m "feat(engine): grade chapter 11 on the execution plan, index lab worker request, twist keywords for window aggregates and CREATE INDEX"
```

---

### Task 3: Khung nội dung ch10–12 (thẻ kỹ năng, mục tiêu chương, bảng phụ trách, KPI, icon, mẫu ticket)

**Files:**
- Modify: `content/skills.yml`, `content/chapters.yml`, `content/people.yml`, `content/kpis.yml`, `content/TEMPLATE.md`, `src/ui/icons.ts`

Kỹ năng thêm **trước** ticket (luật `skills.yml`); `contentProblems` chỉ bắt "dạy đúng một lần" với chương đã có ticket nên task này xanh khi chưa có ticket ch10–12. Ô KPI trỏ tới ticket chưa có thì khóa.

- [ ] **Step 1: Thêm 6 thẻ kỹ năng**

**Thêm vào cuối `content/skills.yml`:**
```yaml

- id: window_rank
  chapter: 10
  label: { vi: "Xếp hạng trong nhóm (RANK, ROW_NUMBER)", en: "Ranking within groups (RANK, ROW_NUMBER)" }
  syntax: "RANK() OVER (PARTITION BY month ORDER BY teu DESC)"
  when: { vi: "Cần mấy dòng đứng đầu trong mỗi nhóm, hoặc dòng mới nhất của từng container, mà vẫn giữ nguyên từng dòng.", en: "You need the top rows in each group, or each container's latest row, while keeping every row as it is." }
  trap: { vi: "Không lọc hạng ở WHERE của chính câu đó: tính hạng trong CTE rồi lọc ở câu ngoài. ROW_NUMBER cắt hòa tùy ý; muốn bằng nhau cùng hạng thì dùng RANK (1, 1, 3) hoặc DENSE_RANK (1, 1, 2).", en: "Do not filter on the rank in that query's own WHERE: rank in a CTE and filter outside. ROW_NUMBER breaks ties arbitrarily; for equal values to share a rank use RANK (1, 1, 3) or DENSE_RANK (1, 1, 2)." }

- id: window_lag
  chapter: 10
  label: { vi: "So với dòng trước (LAG, LEAD)", en: "Compare with the previous row (LAG, LEAD)" }
  syntax: "teu - LAG(teu) OVER (ORDER BY month)"
  when: { vi: "So tháng này với tháng trước, quý này với quý trước, lô này với lô kế tiếp của cùng khách.", en: "Compare this month with last month, this quarter with the previous one, a shipment with the customer's next one." }
  trap: { vi: "Dòng đầu không có dòng trước nên ra NULL. Dòng trước là theo ORDER BY trong OVER, không theo ORDER BY cuối câu; thiếu PARTITION BY thì khách này bị so với khách khác.", en: "The first row has no previous row, so it gets NULL. The previous row follows the ORDER BY inside OVER, not the one at the end of the query; without PARTITION BY one customer is compared with another." }

- id: window_agg
  chapter: 10
  label: { vi: "Cộng dồn trong nhóm (SUM OVER)", en: "Running totals (SUM OVER)" }
  syntax: "SUM(days) OVER (PARTITION BY name ORDER BY month)"
  when: { vi: "Tổng lũy kế từ đầu kỳ, hoặc trung bình trượt mấy tháng gần nhất, trên từng dòng.", en: "A running total since the start of the period, or a moving average over the last few months, on every row." }
  trap: { vi: "Thiếu ORDER BY trong OVER thì dòng nào cũng nhận tổng cả nhóm, không phải lũy kế; thiếu PARTITION BY thì cộng dồn chạy qua mọi khách. Trung bình trượt 3 tháng: AVG(x) OVER (ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW).", en: "Without ORDER BY inside OVER every row gets the whole group's total, not a running total; without PARTITION BY the total runs across every customer. A 3-month moving average: AVG(x) OVER (ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)." }

- id: explain_read
  chapter: 11
  label: { vi: "Đọc kế hoạch thực thi (EXPLAIN)", en: "Reading an execution plan (EXPLAIN)" }
  syntax: "EXPLAIN SELECT ref FROM shipments WHERE customer_id = 42"
  when: { vi: "Một báo cáo chạy chậm: xem bước nào đọc nhiều dòng nhất trước khi đoán nguyên nhân.", en: "A report runs slowly: see which step reads the most rows before guessing why." }
  trap: { vi: "Chi phí (cost) là ước tính tương đối của Postgres, không phải mili-giây. So chi phí của hai kế hoạch cho cùng một câu hỏi, đừng so với một câu khác.", en: "Cost is Postgres' relative estimate, not milliseconds. Compare the cost of two plans for the same question, never with another query." }

- id: sargable
  chapter: 11
  label: { vi: "Điều kiện dùng được chỉ mục", en: "Index-friendly conditions" }
  syntax: "WHERE booking_date >= '2026-10-12' AND booking_date < '2026-10-19'"
  when: { vi: "Cột có chỉ mục mà câu lọc vẫn đọc cả bảng: viết lại điều kiện sao cho cột đứng một mình.", en: "A column has an index but the filter still reads the whole table: rewrite the condition so the column stands alone." }
  trap: { vi: "Bọc cột trong hàm hay ép kiểu (to_char, date_trunc, upper, ::text) là chỉ mục thường không dùng được. Biến đổi giá trị bên kia dấu bằng, hoặc đổi thành khoảng nửa mở.", en: "Wrapping the column in a function or a cast (to_char, date_trunc, upper, ::text) stops a plain index from being used. Transform the value on the other side, or use a half-open range." }

- id: index_design
  chapter: 11
  label: { vi: "Thiết kế chỉ mục", en: "Designing an index" }
  syntax: "CREATE INDEX ON container_events (container_id, event_time)"
  when: { vi: "Một câu tra cứu hay dùng phải đọc cả bảng lớn: đề xuất chỉ mục trên cột nó lọc hoặc nối.", en: "A frequent lookup has to read a whole big table: propose an index on the column it filters or joins on." }
  trap: { vi: "Cột đầu tiên của chỉ mục phải là cột được lọc hoặc nối; chỉ mục (event_time, container_id) không giúp tra theo container. Mỗi chỉ mục làm ghi dữ liệu chậm hơn, nên chỉ đặt cho câu tra cứu thật sự cần.", en: "The first column of the index must be the one filtered or joined on; an index on (event_time, container_id) does not help a lookup by container. Every index slows down writes, so add one only where a lookup really needs it." }
```


- [ ] **Step 2: Mục tiêu chương, bảng phụ trách, KPI, icon, mẫu ticket**

**Sửa `content/chapters.yml`** — thay:
```yaml
    en: "The board wants to see trends: which customers grow, which shrink, this month against last month."
  outcomes: []

```
bằng:
```yaml
    en: "The board wants to see trends: which customers grow, which shrink, this month against last month."
  outcomes:
    - { vi: "Xếp hạng trong từng nhóm và lấy mấy dòng đầu mỗi nhóm", en: "Rank inside each group and keep the top rows of each", skills: [window_rank] }
    - { vi: "So mỗi kỳ với kỳ liền trước", en: "Compare each period with the one before", skills: [window_lag] }
    - { vi: "Cộng dồn theo thời gian trong từng nhóm", en: "Keep a running total over time inside each group", skills: [window_agg] }

```

**Sửa `content/chapters.yml`** — thay:
```yaml
    en: "Reports get slower as the data grows. Together with IT, you read execution plans and propose indexes."
  outcomes: []

```
bằng:
```yaml
    en: "Reports get slower as the data grows. Together with IT, you read execution plans and propose indexes."
  outcomes:
    - { vi: "Đọc kế hoạch thực thi, thấy bước nào đọc cả bảng", en: "Read an execution plan and spot the step that reads a whole table", skills: [explain_read] }
    - { vi: "Viết điều kiện lọc để chỉ mục có sẵn dùng được", en: "Write filters that the existing indexes can use", skills: [sargable] }
    - { vi: "Đề xuất chỉ mục đúng cột, đúng thứ tự, có số chứng minh", en: "Propose an index on the right columns in the right order, with figures to prove it", skills: [index_design] }

```

**Sửa `content/chapters.yml`** — thay:
```yaml
    en: "The Q3 2026 margin fell. The board needs three causes, each backed by a number."
  outcomes: []
```
bằng:
```yaml
    en: "The Q3 2026 margin fell. The board needs three causes, each backed by a number."
  outcomes:
    - { vi: "Biến một câu hỏi của ban lãnh đạo thành con số so được giữa hai kỳ", en: "Turn a board question into a figure that compares fairly between periods", skills: [multi_cte, conditional_agg] }
    - { vi: "Kiểm tra chéo một con số bằng cách tách nó theo một chiều khác", en: "Cross-check a figure by splitting it along another dimension", skills: [window_lag, correlated_value] }
    - { vi: "Đưa nhiều giả thuyết về cùng một đơn vị để chọn nguyên nhân chính", en: "Bring several hypotheses to one unit to pick the main cause", skills: [distinct_on, case_when] }
```


**Sửa `content/people.yml`** — thay:
```yaml
  bio: { vi: "Kiên nhẫn, luôn nói \"từng bước một\".", en: "Patient, always says \"one step at a time\"." }
  tables: [shipments, containers, shipment_events]
  look: { skin: tan, hair: black, style: short, accessory: helmet }
```
bằng:
```yaml
  bio: { vi: "Kiên nhẫn, luôn nói \"từng bước một\".", en: "Patient, always says \"one step at a time\"." }
  tables: [shipments, containers, shipment_events, claims]
  look: { skin: tan, hair: black, style: short, accessory: helmet }
```

**Sửa `content/people.yml`** — thay:
```yaml
  bio: { vi: "Lúc nào cũng ở bãi, đếm xe kéo và ca bốc xếp.", en: "Always out in the yard, counting trucks and loading shifts." }
  tables: [containers, trucking_orders, cfs_receipts]
  look: { skin: tan, hair: black, style: short, accessory: helmet }
```
bằng:
```yaml
  bio: { vi: "Lúc nào cũng ở bãi, đếm xe kéo và ca bốc xếp.", en: "Always out in the yard, counting trucks and loading shifts." }
  tables: [containers, trucking_orders, cfs_receipts, container_events]
  look: { skin: tan, hair: black, style: short, accessory: helmet }
```

**Sửa `content/people.yml`** — thay:
```yaml
  bio: { vi: "Nhắc nợ nhẹ nhàng nhưng không bỏ sót ai.", en: "Chases payments politely but never misses anyone." }
  tables: [customers, invoices, payments]
  look: { skin: light, hair: black, style: long, accessory: glasses }
```
bằng:
```yaml
  bio: { vi: "Nhắc nợ nhẹ nhàng nhưng không bỏ sót ai.", en: "Chases payments politely but never misses anyone." }
  tables: [customers, invoices, payments, free_time_terms]
  look: { skin: light, hair: black, style: long, accessory: glasses }
```

**Sửa `content/people.yml`** — thay:
```yaml
  bio: { vi: "Chỉ tin vào kế hoạch thực thi, không tin vào cảm giác \"chạy chậm\".", en: "Trusts execution plans, not the feeling that something \"runs slow\"." }
  tables: [employees]
  look: { skin: medium, hair: black, style: short, accessory: glasses }
```
bằng:
```yaml
  bio: { vi: "Chỉ tin vào kế hoạch thực thi, không tin vào cảm giác \"chạy chậm\".", en: "Trusts execution plans, not the feeling that something \"runs slow\"." }
  tables: [shipments, containers, container_events]
  look: { skin: medium, hair: black, style: short, accessory: glasses }
```


**Sửa `content/kpis.yml`** — thay:
```yaml
- { id: unbilledDelivered, ticket: ch9-02, kind: rowcount, label: { vi: "Lô giao tháng 10/2026 chưa xuất hóa đơn", en: "Shipments delivered in October 2026 and not invoiced" }, icon: minus }
- { id: q3margin, ticket: ch12-06, kind: number, label: { vi: "Biên lợi nhuận quý 3/2026", en: "Q3 2026 gross margin" }, icon: percent }
```
bằng:
```yaml
- { id: unbilledDelivered, ticket: ch9-02, kind: rowcount, label: { vi: "Lô giao tháng 10/2026 chưa xuất hóa đơn", en: "Shipments delivered in October 2026 and not invoiced" }, icon: minus }
- { id: stuckContainers, ticket: ch10-03, kind: rowcount, label: { vi: "Container kẹt hơn 5 ngày ở một bước (31/10/2026)", en: "Containers stuck at one step for over 5 days (31 October 2026)" }, icon: clockAlert }
- { id: q3margin, ticket: ch12-06, kind: number, label: { vi: "Biên lợi nhuận gộp quý 3/2026", en: "Q3 2026 gross margin" }, icon: percent, unit: { vi: "%", en: "%" } }
```


**Sửa `src/ui/icons.ts`** — thay:
```ts
  bookIndex: 'M4 4h12a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2z M18 7h3v3h-3 M18 12h3v3h-3',
} as const satisfies Record<string, Entry>;
```
bằng:
```ts
  bookIndex: 'M4 4h12a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2z M18 7h3v3h-3 M18 12h3v3h-3',
  // Index-friendly condition: the bare column (bar) goes straight to the index (arrow), nothing wrapped around it.
  sargable: 'M4 4v16 M8 12h12 M16 8l4 4-4 4',
} as const satisfies Record<string, Entry>;
```

**Sửa `src/ui/icons.ts`** — thay:
```ts
  cte: 'steps', multi_cte: 'stepsMerge', window_agg: 'window', window_lag: 'windowLag', window_rank: 'windowRank',
  union: 'stack', except: 'minus', full_join: 'fullJoin', distinct_on: 'firstPerGroup', explain_read: 'plan', index_design: 'bookIndex',
};
```
bằng:
```ts
  cte: 'steps', multi_cte: 'stepsMerge', window_agg: 'window', window_lag: 'windowLag', window_rank: 'windowRank',
  union: 'stack', except: 'minus', full_join: 'fullJoin', distinct_on: 'firstPerGroup', explain_read: 'plan', index_design: 'bookIndex', sargable: 'sargable',
};
```


**Sửa `content/TEMPLATE.md`** — thay:
```markdown
# variants: từ ch4, mỗi kỹ năng mới cần một ticket thường có ≥ 3 biến thể (biến thể 0 + 2) để hàng ôn có bài khác (L37).
id: ch0-01
```
bằng:
```markdown
# variants: từ ch4, mỗi kỹ năng mới cần một ticket thường có ≥ 3 biến thể (biến thể 0 + 2) để hàng ôn có bài khác (L37).
# Chương 11 (src/planCheck.ts): plan: { index: <bảng> } — kết quả đúng rồi, kế hoạch (EXPLAIN, không ANALYZE) còn phải đọc bảng đó qua chỉ mục.
#   lab: { table: <bảng>, ddl: "CREATE INDEX …", max_cost_ratio: 0.1 } — phòng thí nghiệm: editor chứa một CREATE INDEX, Solution là câu chậm
#   (giữ nguyên, hiện ở thẻ bên trái); đạt khi bảng được đọc qua chỉ mục và chi phí sau ≤ tỷ lệ × trước. Không có wrong: ở bước lab.
#   Ticket thường: một bảng; cột mốc: một danh sách mỗi bước, null = không có. tests/planCheck.test.ts kiểm Solution đạt và cách viết chậm không đạt.
id: ch0-01
```


- [ ] **Step 3: Chạy test, xác nhận PASS rồi commit**

Run: `npx vitest run tests/content.test.ts tests/progress.test.ts tests/people.test.ts tests/home.test.ts tests/icons.test.ts && npx tsc --noEmit`
Expected: tất cả PASS.

```bash
git add content/skills.yml content/chapters.yml content/people.yml content/kpis.yml content/TEMPLATE.md src/ui/icons.ts
git commit -m "content: chapter 10-12 skill cards, outcomes, table owners, KPI tiles, sargable icon"
```

---

### Task 4: Chương 10 · Xu hướng & xếp hạng (6 ticket)

**Files:**
- Create: `content/tickets/ch10/ch10-01.md` … `ch10-06.md`
- Modify: `tests/scene.test.ts`

Người hỏi: Lê Bình (Trưởng phòng Sales), Hoàng Dũng (Sales), Bùi Long (điều độ vận tải), Phạm Tâm (kế toán AR), Giám đốc. Bẫy twist: thiếu `ORDER BY` trong `OVER` (mỗi dòng nhận tổng cả nhóm) hoặc thiếu `PARTITION BY` (lũy kế chạy qua mọi khách); điều khoản D&D lấy theo ngày dỡ hàng. Cột mốc kiểm `window_agg` (regex `SUM(…) OVER` ở bước 3), `window_rank`, `window_lag`.

- [ ] **Step 1: Bảng hoạt cảnh mong đợi (test viết trước)**

**Sửa `tests/scene.test.ts`** — thay:
```ts
      'ch9-05': { kind: 'ship' }, 'ch9-06': { kind: 'promotion' },
    });
```
bằng:
```ts
      'ch9-05': { kind: 'ship' }, 'ch9-06': { kind: 'promotion' },
      'ch10-01': { kind: 'yard' }, 'ch10-02': { kind: 'yard' }, 'ch10-03': { kind: 'truck' }, 'ch10-04': { kind: 'ledger' },
      'ch10-05': { kind: 'ledger' }, 'ch10-06': { kind: 'promotion' },
    });
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/scene.test.ts`
Expected: FAIL: thiếu `ch10-01` … `ch10-06`.

- [ ] **Step 3: Viết 6 ticket**

**Tạo `content/tickets/ch10/ch10-01.md`:**
````markdown
---
id: ch10-01
chapter: 10
title: Khách dẫn đầu mỗi tháng
title_en: The top customers of each month
from: { name: Lê Bình, dept: Sales }
difficulty: 3
beat: teach
format: worked
requires: [cte, date_bucket, join, aggregate, group_by]
grants: [window_rank]
tables: [shipments, containers, customers]
ordered: true
scene: { kind: yard }
columns:
  - { vi: "Tháng", en: "Month" }
  - { vi: "Tên khách hàng", en: "Customer name" }
  - { vi: "Tổng TEU", en: "Total TEU" }
  - { vi: "Hạng trong tháng", en: "Rank in the month" }
variants:
  - { from: "2026-01-01", to: "2026-11-01", n: "3", d1: "01/2026", d2: "10/2026", d1_en: "January 2026", d2_en: "October 2026" }
  - { from: "2025-07-01", to: "2026-01-01", n: "5", d1: "07/2025", d2: "12/2025", d1_en: "July 2025", d2_en: "December 2025" }
  - { from: "2025-01-01", to: "2025-07-01", n: "4", d1: "01/2025", d2: "06/2025", d1_en: "January 2025", d2_en: "June 2025" }
reflect:
  q: { vi: "Vì sao không đặt điều kiện hạng nhỏ hơn hoặc bằng {{n}} ngay ở WHERE của câu tính hạng?", en: "Why not put the condition rank at most {{n}} straight into the WHERE of the query that computes the rank?" }
  options:
    - { vi: "Hàm cửa sổ chạy sau WHERE, nên lúc lọc chưa có hạng; tính hạng trong một bước có tên rồi lọc ở câu ngoài", en: "Window functions run after WHERE, so the rank does not exist yet while filtering; compute it in a named step and filter outside" }
    - { vi: "Được, chỉ là chạy chậm hơn", en: "You can, it is only slower" }
    - { vi: "Vì hạng là chữ, không so được với số", en: "Because the rank is text and cannot be compared with a number" }
  answer: 0
  why: { vi: "Thứ tự chạy: FROM, WHERE, GROUP BY, HAVING, rồi mới đến hàm cửa sổ trong SELECT. Muốn lọc theo hạng thì xếp hạng trong CTE, câu ngoài lọc.", en: "The order is FROM, WHERE, GROUP BY, HAVING, and only then the window functions in SELECT. To filter on a rank, rank in a CTE and filter in the outer query." }
wrong:
  - sql: "WITH m AS (SELECT date_trunc('month', s.booking_date)::date AS month, c.name, SUM(ct.teu) AS teu FROM shipments s JOIN customers c ON c.id = s.customer_id JOIN containers ct ON ct.shipment_id = s.id WHERE s.status <> 'CANCELLED' AND s.booking_date >= '{{from}}' AND s.booking_date < '{{to}}' GROUP BY 1, c.id, c.name), r AS (SELECT m.*, ROW_NUMBER() OVER (PARTITION BY month ORDER BY teu DESC, name) AS rk FROM m) SELECT month, name, teu, rk FROM r WHERE rk <= {{n}} ORDER BY month, rk, name"
    vi: "Bạn đang đánh số liên tiếp không trùng nên khách bằng TEU bị cắt theo tên. Đề muốn khách bằng TEU cùng hạng và lấy hết các khách đó."
    en: "You are numbering rows one after another with no repeats, so customers with equal TEU are cut by name. The request wants equal TEU to share a rank and keeps all of them."
---
Mình cần cho Ban giám đốc thấy khách lớn có giữ phong độ không: tháng nào cũng là mấy cái tên quen, hay có khách mới chen lên. Mỗi tháng một bảng xếp hạng nhỏ là đủ.

Đây là lần đầu bạn xếp hạng bên trong từng nhóm mà không gộp mất các dòng, nên mình gửi kèm ví dụ mẫu. Đọc ví dụ, chạy thử, rồi làm phần của bạn.

## Task
Mỗi tháng từ {{d1}} đến hết {{d2}} (theo ngày đặt chỗ, không tính lô đã hủy), những khách nào có tổng TEU đứng trong {{n}} hạng đầu của tháng đó? Khách bằng TEU trong cùng tháng thì cùng hạng, và khách kế tiếp nhảy hạng (hai khách cùng hạng nhất thì khách sau đứng hạng ba); lấy mọi khách có hạng từ 1 đến {{n}}, nên một tháng có thể nhiều hơn {{n}} khách. Gửi tháng (ngày đầu tháng), tên khách, tổng TEU và hạng; xếp theo tháng, rồi hạng, rồi tên khách theo thứ tự chữ cái.

## Example
```sql
WITH a AS (
  SELECT pod, ref, gross_weight_kg,
    ROW_NUMBER() OVER (                          -- ①
      PARTITION BY pod                           -- ②
      ORDER BY gross_weight_kg DESC, ref         -- ③
    ) AS rn
  FROM shipments
  WHERE mode = 'AIR' AND atd >= '2026-09-01' AND atd < '2026-10-01'
)
SELECT pod, ref, gross_weight_kg, rn
FROM a
WHERE rn <= 2                                    -- ④
ORDER BY pod, rn
```
Ví dụ: trong các lô hàng không bay tháng 9/2026, ở mỗi sân bay đến, hai lô nào nặng nhất? Đội kho cần biết trước để đặt xe nâng.

① Hàm cửa sổ tính một giá trị cho từng dòng mà không gộp dòng như khi gom nhóm. ROW_NUMBER đánh số liên tiếp, không bao giờ trùng.

② PARTITION BY chia dòng thành từng nhóm: mỗi sân bay đánh số lại từ 1.

③ ORDER BY trong ngoặc quyết định ai đứng số 1. Thêm mã lô để hai lô nặng bằng nhau vẫn có thứ tự cố định. Muốn bằng nhau thì cùng hạng, dùng RANK (dòng sau nhảy hạng) hoặc DENSE_RANK (không nhảy hạng) thay cho ROW_NUMBER.

④ Số thứ tự chỉ có sau khi câu trong CTE chạy xong, nên lọc ở câu ngoài.

## Hints
1. Bước đầu cộng TEU theo tháng và theo khách như ở chương 4. Bước sau xếp hạng khách trong từng tháng, khách bằng TEU cùng hạng. Câu ngoài giữ hạng từ 1 đến {{n}}.
2. Bảng `shipments` nối `customers` và `containers`; tháng là `date_trunc('month', s.booking_date)::date`. Xếp hạng: `RANK() OVER (PARTITION BY month ORDER BY teu DESC)`.
3. `WITH m AS (SELECT date_trunc(...)::date AS month, c.name, SUM(ct.teu) AS teu FROM ... GROUP BY 1, c.id, c.name), r AS (SELECT m.*, RANK() OVER (...) AS rk FROM m) SELECT month, name, teu, rk FROM r WHERE rk <= {{n}} ORDER BY month, rk, name`

## Solution
```sql
WITH m AS (
  SELECT date_trunc('month', s.booking_date)::date AS month, c.name, SUM(ct.teu) AS teu
  FROM shipments s
  JOIN customers c ON c.id = s.customer_id
  JOIN containers ct ON ct.shipment_id = s.id
  WHERE s.status <> 'CANCELLED'
    AND s.booking_date >= '{{from}}' AND s.booking_date < '{{to}}'
  GROUP BY 1, c.id, c.name
), r AS (
  SELECT m.*, RANK() OVER (PARTITION BY month ORDER BY teu DESC) AS rk
  FROM m
)
SELECT month, name, teu, rk
FROM r
WHERE rk <= {{n}}
ORDER BY month, rk, name
```

# EN
I need to show the board whether our big customers are holding up: the same familiar names every month, or new ones moving in. A small ranking per month is enough.

This is the first time you rank inside each group without collapsing the rows, so I am sending a worked example along. Read it, run it, then do your part.

## Task
For each month from {{d1_en}} to {{d2_en}} inclusive (by booking date, cancelled shipments left out), which customers have a total TEU within the top {{n}} ranks of that month? Customers with equal TEU in the same month share a rank, and the next customer skips ranks (two customers ranked first make the next one third); keep every customer ranked 1 to {{n}}, so a month can have more than {{n}} customers. Send the month (its first day), the customer name, the total TEU and the rank; sorted by month, then rank, then customer name alphabetically.

## Example
Example: among the air shipments that left in September 2026, which two were the heaviest at each destination airport? The warehouse team needs to know ahead to book a forklift.

① A window function computes a value for each row without collapsing rows the way grouping does. ROW_NUMBER numbers the rows one after another and never repeats.

② PARTITION BY splits the rows into groups: each airport starts again from 1.

③ The ORDER BY inside the parentheses decides who is number 1. The shipment ref keeps two equally heavy shipments in a fixed order. If equal values should share a rank, use RANK (the next row skips ranks) or DENSE_RANK (no skipping) instead of ROW_NUMBER.

④ The numbers exist only once the query in the CTE has run, so filter in the outer query.

## Hints
1. The first step adds up TEU per month and per customer, as in chapter 4. The next step ranks the customers inside each month, equal TEU sharing a rank. The outer query keeps ranks 1 to {{n}}.
2. Table `shipments` joined to `customers` and `containers`; the month is `date_trunc('month', s.booking_date)::date`. Ranking: `RANK() OVER (PARTITION BY month ORDER BY teu DESC)`.
3. `WITH m AS (SELECT date_trunc(...)::date AS month, c.name, SUM(ct.teu) AS teu FROM ... GROUP BY 1, c.id, c.name), r AS (SELECT m.*, RANK() OVER (...) AS rk FROM m) SELECT month, name, teu, rk FROM r WHERE rk <= {{n}} ORDER BY month, rk, name`
````


**Tạo `content/tickets/ch10/ch10-02.md`:**
````markdown
---
id: ch10-02
chapter: 10
title: TEU tháng này so với tháng trước
title_en: TEU this month against last month
from: { name: Hoàng Dũng, dept: Sales }
difficulty: 3
beat: develop
format: faded
requires: [cte, date_bucket, join, aggregate, cast]
grants: [window_lag]
tables: [shipments, containers]
ordered: true
scene: { kind: yard }
columns:
  - { vi: "Tháng", en: "Month" }
  - { vi: "Tổng TEU", en: "Total TEU" }
  - { vi: "Tăng giảm so với tháng trước (TEU)", en: "Change on the previous month (TEU)" }
  - { vi: "Tăng giảm so với tháng trước (%)", en: "Change on the previous month (%)" }
starter: |
  WITH m AS (
    SELECT date_trunc('month', s.booking_date)::date AS month, SUM(c.teu) AS teu
    FROM shipments s
    JOIN containers c ON c.shipment_id = s.id
    WHERE s.status <> 'CANCELLED'
      AND s.booking_date >= '{{from}}' AND s.booking_date < '{{to}}'
    GROUP BY 1
  )
  SELECT month, teu,
    teu - ___ OVER (ORDER BY month),
    round(100.0 * (teu - LAG(teu) OVER (ORDER BY month)) / ___, 1)
  FROM m
  ORDER BY month
variants:
  - { from: "2024-11-01", to: "2026-11-01", d1: "11/2024", d2: "10/2026", d1_en: "November 2024", d2_en: "October 2026" }
  - { from: "2025-01-01", to: "2026-01-01", d1: "01/2025", d2: "12/2025", d1_en: "January 2025", d2_en: "December 2025" }
  - { from: "2025-07-01", to: "2026-07-01", d1: "07/2025", d2: "06/2026", d1_en: "July 2025", d2_en: "June 2026" }
reflect:
  q: { vi: "Dòng của tháng đầu kỳ có ô trống ở hai cột tăng giảm. Vì sao?", en: "The first month of the period has empty cells in both change columns. Why?" }
  options:
    - { vi: "Trong kết quả không có dòng nào đứng trước nó, nên LAG trả về NULL và phép tính với NULL cũng ra NULL", en: "No row comes before it in the result, so LAG returns NULL, and arithmetic with NULL gives NULL too" }
    - { vi: "Tháng đó không có lô nào", en: "That month has no shipments" }
    - { vi: "LAG bỏ qua tháng đầu tiên của mỗi năm", en: "LAG skips the first month of every year" }
  answer: 0
  why: { vi: "LAG chỉ nhìn các dòng còn lại sau WHERE. Tháng trước kỳ đã bị lọc đi, nên tháng đầu kỳ không có gì để so; muốn so thì lấy rộng thêm một tháng rồi lọc ở câu ngoài.", en: "LAG only sees the rows left after WHERE. The month before the period was filtered out, so the first month has nothing to compare with; to compare it, read one more month and filter in the outer query." }
wrong:
  - sql: "WITH m AS (SELECT date_trunc('month', s.booking_date)::date AS month, SUM(c.teu) AS teu FROM shipments s JOIN containers c ON c.shipment_id = s.id WHERE s.status <> 'CANCELLED' AND s.booking_date >= '{{from}}' AND s.booking_date < '{{to}}' GROUP BY 1) SELECT month, teu, teu - LAG(teu) OVER (ORDER BY month DESC), round(100.0 * (teu - LAG(teu) OVER (ORDER BY month DESC)) / LAG(teu) OVER (ORDER BY month DESC), 1) FROM m ORDER BY month"
    vi: "Bạn đang so mỗi tháng với tháng sau nó: thứ tự trong OVER là giảm dần nên dòng đứng trước là tháng sau. Thứ tự trong OVER quyết định dòng nào là dòng trước, không phải thứ tự cuối câu."
    en: "You are comparing each month with the month after it: the order inside OVER is descending, so the previous row is the next month. The order inside OVER decides which row comes before, not the order at the end of the query."
---
Khách hỏi mình mùa này hàng đi nhiều hay ít. Mình muốn có bảng TEU từng tháng kèm mức tăng giảm so với tháng liền trước, cả số TEU lẫn phần trăm, để trả lời cho nhanh.

Câu SQL trong editor gần xong, chỉ còn mấy chỗ trống ___. Bạn điền cho đủ rồi nộp.

## Task
Mỗi tháng từ {{d1}} đến hết {{d2}} (theo ngày đặt chỗ, không tính lô đã hủy): tổng TEU, số TEU tăng giảm so với tháng liền trước, và phần trăm tăng giảm so với tháng liền trước (làm tròn 1 chữ số thập phân). Tháng đầu kỳ không có tháng trước trong bảng nên để trống hai ô tăng giảm. Gửi tháng (ngày đầu tháng), tổng TEU, số tăng giảm và phần trăm tăng giảm; xếp theo tháng từ cũ đến mới.

## Hints
1. Tổng TEU từng tháng đã có trong bước có tên. Cần thêm giá trị của dòng đứng ngay trước theo thứ tự tháng, rồi lấy hiệu và chia cho chính giá trị đó.
2. Chỗ trống thứ nhất là TEU của tháng trước: `LAG(teu)`. Chỗ trống thứ hai là mẫu số của phần trăm, cũng là TEU tháng trước: `LAG(teu) OVER (ORDER BY month)`.
3. `SELECT month, teu, teu - LAG(teu) OVER (ORDER BY month), round(100.0 * (teu - LAG(teu) OVER (ORDER BY month)) / LAG(teu) OVER (ORDER BY month), 1) FROM m ORDER BY month`

## Solution
```sql
WITH m AS (
  SELECT date_trunc('month', s.booking_date)::date AS month, SUM(c.teu) AS teu
  FROM shipments s
  JOIN containers c ON c.shipment_id = s.id
  WHERE s.status <> 'CANCELLED'
    AND s.booking_date >= '{{from}}' AND s.booking_date < '{{to}}'
  GROUP BY 1
)
SELECT month, teu,
  teu - LAG(teu) OVER (ORDER BY month),
  round(100.0 * (teu - LAG(teu) OVER (ORDER BY month)) / LAG(teu) OVER (ORDER BY month), 1)
FROM m
ORDER BY month
```

# EN
Customers keep asking me whether volumes are up or down this season. I want a table of TEU per month with the change on the month before, both in TEU and in percent, so I can answer quickly.

The SQL in the editor is almost done; only a few ___ blanks are left. Fill them in, then submit.

## Task
For each month from {{d1_en}} to {{d2_en}} inclusive (by booking date, cancelled shipments left out): the total TEU, the change in TEU on the month just before, and the change in percent on the month just before (rounded to 1 decimal place). The first month of the period has no previous month in the table, so leave its two change cells empty. Send the month (its first day), the total TEU, the change and the percent change; sorted by month from oldest to newest.

## Hints
1. The TEU per month is already in the named step. You also need the value of the row just before it in month order, then the difference, divided by that same value.
2. The first blank is last month's TEU: `LAG(teu)`. The second blank is the denominator of the percent, also last month's TEU: `LAG(teu) OVER (ORDER BY month)`.
3. `SELECT month, teu, teu - LAG(teu) OVER (ORDER BY month), round(100.0 * (teu - LAG(teu) OVER (ORDER BY month)) / LAG(teu) OVER (ORDER BY month), 1) FROM m ORDER BY month`
````


**Tạo `content/tickets/ch10/ch10-03.md`:**
````markdown
---
id: ch10-03
chapter: 10
title: Container đang kẹt ở đâu?
title_en: Where are containers stuck?
from: { name: Bùi Long, dept: Ops }
difficulty: 3
beat: develop
requires: [window_rank, cte, date_math, join]
grants: []
tables: [container_events, containers]
ordered: true
scene: { kind: truck }
columns:
  - { vi: "Số container", en: "Container number" }
  - { vi: "Bước hiện tại", en: "Current step" }
  - { vi: "Số ngày ở bước này", en: "Days at this step" }
variants:
  - { d: "5" }
  - { d: "7" }
  - { d: "10" }
reflect:
  q: { vi: "Một bạn lọc bỏ bước xếp lên tàu và bước trả rỗng trước, rồi mới lấy sự kiện mới nhất. Kết quả sai thế nào?", en: "A colleague drops the loaded-on-vessel and empty-returned steps first, and only then takes the latest event. How is that wrong?" }
  options:
    - { vi: "Container đang trên tàu bị lấy nhầm bước trước đó (vào cảng) và hiện ra như đang kẹt rất lâu", en: "A container on a vessel gets the step before (gate-in at the port) and shows up as stuck for a long time" }
    - { vi: "Không sai, chỉ khác thứ tự dòng", en: "Nothing is wrong, only the row order differs" }
    - { vi: "Kết quả rỗng", en: "The result is empty" }
  answer: 0
  why: { vi: "Phải tìm bước mới nhất của từng container trên toàn bộ lịch sử trước, rồi mới lọc theo bước. Lọc trước thì bước mới nhất còn lại không còn là bước thật.", en: "Find each container's latest step over its whole history first, then filter on the step. Filter first and the latest remaining step is no longer the real one." }
wrong:
  - sql: "WITH l AS (SELECT e.container_id, e.event, e.event_time, ROW_NUMBER() OVER (PARTITION BY e.container_id ORDER BY e.event_time DESC) AS rn FROM container_events e WHERE e.event NOT IN ('LOADED', 'EMPTY_RETURNED')) SELECT c.container_no, l.event, DATE '2026-10-31' - l.event_time::date FROM l JOIN containers c ON c.id = l.container_id WHERE l.rn = 1 AND DATE '2026-10-31' - l.event_time::date > {{d}} ORDER BY 3 DESC, c.container_no"
    vi: "Bạn bỏ bước trên tàu và bước trả rỗng trước khi tìm bước mới nhất, nên container đã trả rỗng hay đang trên tàu bị lấy nhầm một bước cũ. Tìm bước mới nhất trên cả lịch sử trước, rồi mới lọc."
    en: "You drop the on-vessel and empty-returned steps before finding the latest one, so containers already returned or at sea get an old step. Find the latest step over the whole history first, then filter."
---
Bãi báo có container nằm im mấy ngày không ai đụng tới. Container dừng ở một bước quá lâu là container bị kẹt: tốn phí lưu bãi, lưu container, và khách sẽ gọi hỏi.

## Task
Tính đến hết ngày 31/10/2026, mỗi container đang ở bước nào trong hành trình (bước mới nhất đã ghi nhận), và đã ở bước đó bao nhiêu ngày (31/10/2026 trừ ngày của bước đó, tính theo ngày lịch)? Bỏ qua container đang ở trên tàu (bước mới nhất là xếp lên tàu) và container đã trả rỗng về bãi (đã xong hành trình). Gửi số container, bước hiện tại và số ngày, chỉ các container ở bước đó quá {{d}} ngày; lâu nhất lên đầu, bằng nhau thì xếp theo số container.

## Hints
1. Mỗi container có nhiều sự kiện. Đánh số sự kiện của từng container từ mới nhất về cũ, giữ sự kiện số 1, rồi mới bỏ các container đang trên tàu hoặc đã trả rỗng.
2. Bảng `container_events` (cột `container_id`, `event`, `event_time`), nối `containers` để lấy `container_no`. Mới nhất: `ROW_NUMBER() OVER (PARTITION BY e.container_id ORDER BY e.event_time DESC)`. Bước trên tàu là `'LOADED'`, đã trả rỗng là `'EMPTY_RETURNED'`. Số ngày: `DATE '2026-10-31' - l.event_time::date`.
3. `WITH l AS (SELECT ..., ROW_NUMBER() OVER (...) AS rn FROM container_events e) SELECT c.container_no, l.event, DATE '2026-10-31' - l.event_time::date FROM l JOIN containers c ON ... WHERE l.rn = 1 AND l.event NOT IN (...) AND ... > {{d}} ORDER BY 3 DESC, c.container_no`

## Solution
```sql
WITH l AS (
  SELECT e.container_id, e.event, e.event_time,
    ROW_NUMBER() OVER (PARTITION BY e.container_id ORDER BY e.event_time DESC) AS rn
  FROM container_events e
)
SELECT c.container_no, l.event, DATE '2026-10-31' - l.event_time::date
FROM l
JOIN containers c ON c.id = l.container_id
WHERE l.rn = 1
  AND l.event NOT IN ('LOADED', 'EMPTY_RETURNED')
  AND DATE '2026-10-31' - l.event_time::date > {{d}}
ORDER BY 3 DESC, c.container_no
```

# EN
The yard reports containers sitting for days with nobody touching them. A container that stays at one step too long is stuck: it runs up storage and detention fees, and the customer will call.

## Task
As of the end of 31 October 2026, which step of its journey is each container at (the latest step recorded), and how many days has it been at that step (31 October 2026 minus the date of that step, counted in calendar days)? Skip containers that are at sea (the latest step is loaded on the vessel) and containers already returned empty to the depot (journey finished). Send the container number, the current step and the number of days, only for containers at that step for more than {{d}} days; longest first, and on a tie, by container number.

## Hints
1. Each container has several events. Number each container's events from newest to oldest, keep event number 1, and only then drop the containers at sea or already returned.
2. Table `container_events` (columns `container_id`, `event`, `event_time`), joined to `containers` for `container_no`. Latest: `ROW_NUMBER() OVER (PARTITION BY e.container_id ORDER BY e.event_time DESC)`. At sea is `'LOADED'`, returned empty is `'EMPTY_RETURNED'`. Days: `DATE '2026-10-31' - l.event_time::date`.
3. `WITH l AS (SELECT ..., ROW_NUMBER() OVER (...) AS rn FROM container_events e) SELECT c.container_no, l.event, DATE '2026-10-31' - l.event_time::date FROM l JOIN containers c ON ... WHERE l.rn = 1 AND l.event NOT IN (...) AND ... > {{d}} ORDER BY 3 DESC, c.container_no`
````


**Tạo `content/tickets/ch10/ch10-04.md`:**
````markdown
---
id: ch10-04
chapter: 10
title: Ngày vượt miễn phí lưu container, cộng dồn theo tháng
title_en: Free-time overrun days, running total by month
from: { name: Phạm Tâm, dept: Finance }
difficulty: 4
beat: twist
requires: [cte, conditional_agg, date_math, date_bucket, join]
grants: [window_agg]
tables: [container_events, containers, shipments, customers, free_time_terms]
ordered: true
scene: { kind: ledger }
columns:
  - { vi: "Tên khách hàng", en: "Customer name" }
  - { vi: "Tháng trả rỗng", en: "Month returned" }
  - { vi: "Ngày vượt trong tháng", en: "Overrun days in the month" }
  - { vi: "Ngày vượt cộng dồn", en: "Overrun days to date" }
variants:
  - { from: "2026-07-01", to: "2026-10-01", d1: "01/07/2026", d2: "30/09/2026", d1_en: "1 July 2026", d2_en: "30 September 2026" }
  - { from: "2026-04-01", to: "2026-07-01", d1: "01/04/2026", d2: "30/06/2026", d1_en: "1 April 2026", d2_en: "30 June 2026" }
  - { from: "2026-01-01", to: "2026-04-01", d1: "01/01/2026", d2: "31/03/2026", d1_en: "1 January 2026", d2_en: "31 March 2026" }
reflect:
  q: { vi: "Trong OVER (PARTITION BY khách ORDER BY tháng), phần ORDER BY làm gì?", en: "In OVER (PARTITION BY customer ORDER BY month), what does the ORDER BY part do?" }
  options:
    - { vi: "Biến tổng thành tổng lũy kế: mỗi dòng cộng từ tháng đầu của khách đến tháng của dòng đó", en: "It turns the total into a running total: each row adds from the customer's first month up to its own month" }
    - { vi: "Chỉ sắp xếp kết quả cuối cùng", en: "It only sorts the final result" }
    - { vi: "Không có tác dụng khi đã có PARTITION BY", en: "Nothing once PARTITION BY is there" }
  answer: 0
  why: { vi: "Có ORDER BY, khung mặc định của hàm cửa sổ là từ đầu nhóm đến dòng hiện tại, nên ra lũy kế. Không có ORDER BY, khung là cả nhóm, nên dòng nào cũng nhận tổng của khách. Trung bình trượt dùng khung hẹp hơn, ví dụ ROWS BETWEEN 2 PRECEDING AND CURRENT ROW.", en: "With ORDER BY, the window's default frame runs from the start of the group to the current row, so you get a running total. Without ORDER BY the frame is the whole group, so every row gets the customer's total. A moving average uses a narrower frame, such as ROWS BETWEEN 2 PRECEDING AND CURRENT ROW." }
wrong:
  - sql: "WITH t AS (SELECT container_id, max(event_time) FILTER (WHERE event = 'DISCHARGED') AS discharged, max(event_time) FILTER (WHERE event = 'EMPTY_RETURNED') AS returned FROM container_events GROUP BY container_id), o AS (SELECT cu.name, date_trunc('month', t.returned)::date AS month, t.returned::date - t.discharged::date - f.free_days AS over FROM t JOIN containers c ON c.id = t.container_id JOIN shipments s ON s.id = c.shipment_id JOIN customers cu ON cu.id = s.customer_id JOIN free_time_terms f ON f.customer_id = s.customer_id AND t.discharged::date BETWEEN f.valid_from AND f.valid_to WHERE s.direction = 'IMPORT' AND t.returned >= '{{from}}' AND t.returned < '{{to}}'), m AS (SELECT name, month, SUM(over) AS days FROM o WHERE over > 0 GROUP BY name, month) SELECT name, month, days, SUM(days) OVER (PARTITION BY name) FROM m ORDER BY name, month"
    vi: "Cột cuối của bạn là tổng cả kỳ của khách, lặp ở mọi dòng. Muốn cộng dồn đến tháng của từng dòng thì trong OVER phải có thứ tự theo tháng."
    en: "Your last column is the customer's total for the whole period, repeated on every row. To add up to each row's month, the OVER needs an order by month."
  - sql: "WITH t AS (SELECT container_id, max(event_time) FILTER (WHERE event = 'DISCHARGED') AS discharged, max(event_time) FILTER (WHERE event = 'EMPTY_RETURNED') AS returned FROM container_events GROUP BY container_id), o AS (SELECT cu.name, date_trunc('month', t.returned)::date AS month, t.returned::date - t.discharged::date - f.free_days AS over FROM t JOIN containers c ON c.id = t.container_id JOIN shipments s ON s.id = c.shipment_id JOIN customers cu ON cu.id = s.customer_id JOIN free_time_terms f ON f.customer_id = s.customer_id AND t.discharged::date BETWEEN f.valid_from AND f.valid_to WHERE s.direction = 'IMPORT' AND t.returned >= '{{from}}' AND t.returned < '{{to}}'), m AS (SELECT name, month, SUM(over) AS days FROM o WHERE over > 0 GROUP BY name, month) SELECT name, month, days, SUM(days) OVER (ORDER BY name, month) FROM m ORDER BY name, month"
    vi: "Số cộng dồn của bạn chạy qua mọi khách: khách sau cộng tiếp số của khách trước. Mỗi khách phải cộng dồn riêng, bắt đầu lại từ 0."
    en: "Your running total runs across every customer: each customer continues from the previous one. Each customer needs its own running total, starting again from 0."
---
Hãng tàu đã gửi hóa đơn phí lưu container quá hạn (D&D). Trước khi chuyển phí cho khách, mình cần biết mỗi khách vượt thời gian miễn phí bao nhiêu ngày, tháng nào, và cộng dồn tới đâu rồi.

## Task
Chỉ tính container hàng nhập đã trả rỗng về bãi trong khoảng từ {{d1}} đến hết {{d2}}. Số ngày dùng của một container là ngày trả rỗng trừ ngày dỡ khỏi tàu (tính theo ngày lịch). Số ngày miễn phí lấy theo điều khoản của khách còn hiệu lực vào ngày dỡ hàng. Ngày vượt là số ngày dùng trừ số ngày miễn phí; container không vượt thì không tính. Với mỗi khách và mỗi tháng trả rỗng có ngày vượt: tổng ngày vượt trong tháng, và tổng ngày vượt cộng dồn của khách đó từ tháng đầu kỳ đến tháng này. Gửi tên khách, tháng (ngày đầu tháng), ngày vượt trong tháng và ngày vượt cộng dồn; xếp theo tên khách theo thứ tự chữ cái, rồi theo tháng.

## Hints
1. Ba bước: mỗi container một dòng có ngày dỡ hàng và ngày trả rỗng; rồi ngày vượt của từng container theo điều khoản đúng ngày; rồi cộng theo khách và tháng. Cột cộng dồn là một tổng chạy trong từng khách, theo thứ tự tháng.
2. Một dòng mỗi container: `max(event_time) FILTER (WHERE event = 'DISCHARGED')` và tương tự cho `'EMPTY_RETURNED'`, gom theo `container_id`. Điều khoản: `free_time_terms f ON f.customer_id = s.customer_id AND t.discharged::date BETWEEN f.valid_from AND f.valid_to`. Hàng nhập: `s.direction = 'IMPORT'`. Cộng dồn: `SUM(days) OVER (PARTITION BY name ORDER BY month)`.
3. `WITH t AS (...), o AS (SELECT cu.name, date_trunc('month', t.returned)::date AS month, t.returned::date - t.discharged::date - f.free_days AS over FROM t JOIN ...), m AS (SELECT name, month, SUM(over) AS days FROM o WHERE over > 0 GROUP BY name, month) SELECT name, month, days, SUM(days) OVER (PARTITION BY name ORDER BY month) FROM m ORDER BY name, month`

## Solution
```sql
WITH t AS (
  SELECT container_id,
    max(event_time) FILTER (WHERE event = 'DISCHARGED') AS discharged,
    max(event_time) FILTER (WHERE event = 'EMPTY_RETURNED') AS returned
  FROM container_events
  GROUP BY container_id
), o AS (
  SELECT cu.name, date_trunc('month', t.returned)::date AS month,
    t.returned::date - t.discharged::date - f.free_days AS over
  FROM t
  JOIN containers c ON c.id = t.container_id
  JOIN shipments s ON s.id = c.shipment_id
  JOIN customers cu ON cu.id = s.customer_id
  JOIN free_time_terms f ON f.customer_id = s.customer_id
    AND t.discharged::date BETWEEN f.valid_from AND f.valid_to
  WHERE s.direction = 'IMPORT'
    AND t.returned >= '{{from}}' AND t.returned < '{{to}}'
), m AS (
  SELECT name, month, SUM(over) AS days
  FROM o
  WHERE over > 0
  GROUP BY name, month
)
SELECT name, month, days, SUM(days) OVER (PARTITION BY name ORDER BY month)
FROM m
ORDER BY name, month
```

# EN
The carriers have sent their detention and demurrage (D&D) invoices. Before we pass the fees on, I need to know how many days past free time each customer went, in which month, and the running total so far.

## Task
Count only import containers returned empty to the depot from {{d1_en}} to {{d2_en}} inclusive. A container's days used are its empty-return date minus the date it was discharged from the vessel (calendar dates). The free days come from the customer's terms in force on the discharge date. Overrun days are the days used minus the free days; a container that did not go over does not count. For each customer and each month of return that has overrun days: the overrun days in that month, and the customer's running total of overrun days from the first month of the period up to that month. Send the customer name, the month (its first day), the overrun days in the month and the running total; sorted by customer name alphabetically, then by month.

## Hints
1. Three steps: one row per container with its discharge date and empty-return date; then each container's overrun under the terms in force that day; then the totals per customer and month. The running-total column is a total that runs inside each customer, in month order.
2. One row per container: `max(event_time) FILTER (WHERE event = 'DISCHARGED')` and the same for `'EMPTY_RETURNED'`, grouped by `container_id`. Terms: `free_time_terms f ON f.customer_id = s.customer_id AND t.discharged::date BETWEEN f.valid_from AND f.valid_to`. Imports: `s.direction = 'IMPORT'`. Running total: `SUM(days) OVER (PARTITION BY name ORDER BY month)`.
3. `WITH t AS (...), o AS (SELECT cu.name, date_trunc('month', t.returned)::date AS month, t.returned::date - t.discharged::date - f.free_days AS over FROM t JOIN ...), m AS (SELECT name, month, SUM(over) AS days FROM o WHERE over > 0 GROUP BY name, month) SELECT name, month, days, SUM(days) OVER (PARTITION BY name ORDER BY month) FROM m ORDER BY name, month`
````


**Tạo `content/tickets/ch10/ch10-05.md`:**
````markdown
---
id: ch10-05
chapter: 10
title: Tạm giữ lệnh giao hàng của khách nợ lâu
title_en: Holding delivery orders for long-overdue customers
from: { name: Phạm Tâm, dept: Finance }
difficulty: 3
beat: rest
requires: [cte, exists, left_join, coalesce, having, order_by]
grants: []
tables: [invoices, payments, customers, shipments]
ordered: true
scene: { kind: ledger }
columns:
  - { vi: "Tên khách hàng", en: "Customer name" }
  - { vi: "Nợ quá hạn trên 90 ngày (VND)", en: "Debt overdue by more than 90 days (VND)" }
reflect:
  q: { vi: "Vì sao điều kiện có lô hàng nhập đang trên đường viết bằng EXISTS mà không nối thẳng bảng lô hàng vào bước tính nợ?", en: "Why is the condition that there is an import shipment in transit written with EXISTS instead of joining the shipments table into the debt step?" }
  options:
    - { vi: "Một khách có nhiều lô đang trên đường; nối thẳng sẽ nhân số nợ lên theo số lô", en: "A customer has several shipments in transit; a straight join would multiply the debt by the number of shipments" }
    - { vi: "Vì bảng lô hàng không nối được với hóa đơn", en: "Because the shipments table cannot be joined to invoices" }
    - { vi: "Không có lý do, hai cách cho cùng kết quả", en: "No reason, both give the same result" }
  answer: 0
  why: { vi: "EXISTS chỉ hỏi có hay không, không thêm dòng. Nối thẳng thì mỗi hóa đơn lặp lại theo số lô đang chạy của khách, cùng bẫy nhân dòng ở chương 8.", en: "EXISTS only asks yes or no and adds no rows. A straight join repeats each invoice once per shipment in transit, the same row-multiplying trap as in chapter 8." }
wrong:
  - sql: "WITH paid AS (SELECT invoice_id, SUM(amount_vnd) AS paid FROM payments GROUP BY invoice_id) SELECT c.name, SUM(i.amount_vnd - COALESCE(p.paid, 0)) FROM invoices i LEFT JOIN paid p ON p.invoice_id = i.id JOIN customers c ON c.id = i.customer_id JOIN shipments s ON s.customer_id = i.customer_id AND s.status = 'IN_TRANSIT' AND s.direction = 'IMPORT' WHERE i.due_date < '2026-08-02' GROUP BY c.id, c.name HAVING SUM(i.amount_vnd - COALESCE(p.paid, 0)) > 0 ORDER BY 2 DESC, c.name"
    vi: "Bạn nối thẳng các lô đang trên đường vào phép cộng nợ, nên nợ của khách bị nhân lên theo số lô. Chỉ cần hỏi khách có lô như vậy hay không."
    en: "You join the shipments in transit straight into the debt total, so each customer's debt is multiplied by the number of shipments. You only need to ask whether the customer has such a shipment."
---
Kế toán trưởng duyệt chính sách mới: khách nợ quá hạn lâu mà vẫn đang có hàng nhập trên đường về thì tạm giữ lệnh giao hàng tới khi thanh toán. Mình cần danh sách để báo bộ phận chứng từ.

## Task
Tính đến hết ngày 31/10/2026: nợ quá hạn trên 90 ngày của một khách là phần chưa trả của các hóa đơn có hạn thanh toán trước ngày 02/08/2026. Khách nào có khoản nợ này lớn hơn 0 và đang có ít nhất một lô hàng nhập đang trên đường (đã chạy, chưa cập cảng)? Gửi tên khách và số nợ quá hạn trên 90 ngày (đồng); nhiều nhất lên đầu, bằng nhau thì xếp theo tên khách theo thứ tự chữ cái.

## Hints
1. Hai câu hỏi ghép lại: khách còn nợ bao nhiêu ở các hóa đơn quá hạn lâu (như bài nhắc nợ chương 8), và khách có lô hàng nhập đang trên đường hay không (như bài báo giá chưa thấy khách quay lại ở chương 7).
2. Bước tiền đã trả theo hóa đơn, rồi `LEFT JOIN` vào `invoices` với `i.due_date < '2026-08-02'`, gom theo khách, giữ `HAVING SUM(i.amount_vnd - COALESCE(p.paid, 0)) > 0`. Lô đang trên đường: `EXISTS (SELECT 1 FROM shipments s WHERE s.customer_id = c.id AND s.status = 'IN_TRANSIT' AND s.direction = 'IMPORT')`.
3. `WITH paid AS (...) SELECT c.name, SUM(...) FROM invoices i LEFT JOIN paid p ON ... JOIN customers c ON ... WHERE i.due_date < '2026-08-02' AND EXISTS (...) GROUP BY c.id, c.name HAVING ... > 0 ORDER BY 2 DESC, c.name`

## Solution
```sql
WITH paid AS (
  SELECT invoice_id, SUM(amount_vnd) AS paid
  FROM payments
  GROUP BY invoice_id
)
SELECT c.name, SUM(i.amount_vnd - COALESCE(p.paid, 0))
FROM invoices i
LEFT JOIN paid p ON p.invoice_id = i.id
JOIN customers c ON c.id = i.customer_id
WHERE i.due_date < '2026-08-02'
  AND EXISTS (
    SELECT 1 FROM shipments s
    WHERE s.customer_id = c.id AND s.status = 'IN_TRANSIT' AND s.direction = 'IMPORT'
  )
GROUP BY c.id, c.name
HAVING SUM(i.amount_vnd - COALESCE(p.paid, 0)) > 0
ORDER BY 2 DESC, c.name
```

# EN
The chief accountant has approved a new rule: when a customer is long overdue and still has import cargo on its way, we hold the delivery order until they pay. I need the list for the documentation team.

## Task
As of the end of 31 October 2026: a customer's debt overdue by more than 90 days is the unpaid part of the invoices due before 2 August 2026. Which customers have such debt above 0 and at least one import shipment in transit (sailed, not yet arrived)? Send the customer name and the debt overdue by more than 90 days (VND); highest first, and on a tie, by customer name alphabetically.

## Hints
1. Two questions combined: how much the customer still owes on long-overdue invoices (like the debt-chasing task in chapter 8), and whether the customer has an import shipment in transit (like the quotes with no booking since, in chapter 7).
2. The amount paid per invoice, then `LEFT JOIN` it to `invoices` with `i.due_date < '2026-08-02'`, group by customer and keep `HAVING SUM(i.amount_vnd - COALESCE(p.paid, 0)) > 0`. Shipment in transit: `EXISTS (SELECT 1 FROM shipments s WHERE s.customer_id = c.id AND s.status = 'IN_TRANSIT' AND s.direction = 'IMPORT')`.
3. `WITH paid AS (...) SELECT c.name, SUM(...) FROM invoices i LEFT JOIN paid p ON ... JOIN customers c ON ... WHERE i.due_date < '2026-08-02' AND EXISTS (...) GROUP BY c.id, c.name HAVING ... > 0 ORDER BY 2 DESC, c.name`
````


**Tạo `content/tickets/ch10/ch10-06.md`:**
````markdown
---
id: ch10-06
chapter: 10
title: "Đánh giá thăng tiến: báo cáo xu hướng cho Ban giám đốc"
title_en: "Promotion review: the trend report for the board"
from: { name: Trần An, dept: Management }
difficulty: 4
beat: boss
requires: [window_agg, window_rank, window_lag, cte, conditional_agg, date_bucket, join]
grants: []
tables: [shipments, containers, customers, container_events, free_time_terms]
ordered: true
columns:
  - [{ vi: "Quý", en: "Quarter" }, { vi: "Tên khách hàng", en: "Customer name" }, { vi: "Tổng TEU", en: "Total TEU" }, { vi: "Hạng trong quý", en: "Rank in the quarter" }]
  - [{ vi: "Quý", en: "Quarter" }, { vi: "Tổng TEU", en: "Total TEU" }, { vi: "Tăng giảm so với quý trước (%)", en: "Change on the previous quarter (%)" }]
  - [{ vi: "Tháng trả rỗng", en: "Month returned" }, { vi: "Ngày vượt trong tháng", en: "Overrun days in the month" }, { vi: "Ngày vượt cộng dồn từ đầu năm", en: "Overrun days since January" }]
conclusion:
  question: "Nhìn bảng ở bước 3, ngày vượt thời gian miễn phí thay đổi thế nào trong năm 2026?"
  options:
    - "Từ tháng 8/2026 mỗi tháng vượt hơn gấp đôi mức các tháng đầu năm, nên số cộng dồn tăng dốc hẳn"
    - "Đều đặn cả năm, số cộng dồn tăng theo một đường thẳng"
    - "Giảm dần từ giữa năm vì khách trả container nhanh hơn"
  answer: 0
conclusion_en:
  question: "Looking at the step 3 table, how did the days past free time change during 2026?"
  options:
    - "From August 2026 each month went over by more than twice the early-year months, so the running total climbs much more steeply"
    - "Steady all year, the running total rises in a straight line"
    - "Falling from mid-year because customers returned containers faster"
---
Đây là buổi đánh giá thăng tiến của bạn. Ban giám đốc họp tổng kết và muốn thấy xu hướng, không chỉ con số từng tháng. Mình cần ba bảng. Làm đúng cả ba là từ nay bạn phụ trách báo cáo điều hành.

Ở cả ba bước, TEU tính theo ngày đặt chỗ và không tính lô đã hủy.

## Step 1: Ba khách lớn nhất mỗi quý
Mỗi quý từ quý 1 đến quý 3/2026, những khách nào có tổng TEU đứng trong 3 hạng đầu của quý? Khách bằng TEU cùng hạng, khách kế tiếp nhảy hạng (1, 1, 3); lấy mọi khách có hạng từ 1 đến 3. Gửi quý (ngày đầu quý), tên khách, tổng TEU và hạng; xếp theo quý, rồi hạng, rồi tên khách theo thứ tự chữ cái.
```sql
WITH q AS (
  SELECT date_trunc('quarter', s.booking_date)::date AS quarter, c.name, SUM(ct.teu) AS teu
  FROM shipments s
  JOIN customers c ON c.id = s.customer_id
  JOIN containers ct ON ct.shipment_id = s.id
  WHERE s.status <> 'CANCELLED'
    AND s.booking_date >= '2026-01-01' AND s.booking_date < '2026-10-01'
  GROUP BY 1, c.id, c.name
), r AS (
  SELECT q.*, RANK() OVER (PARTITION BY quarter ORDER BY teu DESC) AS rk
  FROM q
)
SELECT quarter, name, teu, rk
FROM r
WHERE rk <= 3
ORDER BY quarter, rk, name
```

## Step 2: TEU từng quý so với quý trước
Mỗi quý từ quý 1/2025 đến quý 3/2026: tổng TEU và phần trăm tăng giảm so với quý liền trước (làm tròn 1 chữ số thập phân; quý đầu để trống). Gửi quý (ngày đầu quý), tổng TEU và phần trăm; xếp theo quý từ cũ đến mới.
```sql
WITH q AS (
  SELECT date_trunc('quarter', s.booking_date)::date AS quarter, SUM(c.teu) AS teu
  FROM shipments s
  JOIN containers c ON c.shipment_id = s.id
  WHERE s.status <> 'CANCELLED'
    AND s.booking_date >= '2025-01-01' AND s.booking_date < '2026-10-01'
  GROUP BY 1
)
SELECT quarter, teu,
  round(100.0 * (teu - LAG(teu) OVER (ORDER BY quarter)) / LAG(teu) OVER (ORDER BY quarter), 1)
FROM q
ORDER BY quarter
```

## Step 3: Ngày vượt thời gian miễn phí, cộng dồn từ đầu năm
Dùng cùng cách tính như bài ngày vượt của kế toán: container hàng nhập đã trả rỗng, số ngày dùng là ngày trả rỗng trừ ngày dỡ hàng (ngày lịch), trừ số ngày miễn phí theo điều khoản của khách còn hiệu lực vào ngày dỡ hàng; container không vượt thì không tính. Mỗi tháng trả rỗng từ 01/2026 đến 10/2026 của toàn công ty: tổng ngày vượt trong tháng và tổng cộng dồn từ tháng 1. Gửi tháng (ngày đầu tháng), ngày vượt trong tháng và ngày vượt cộng dồn; xếp theo tháng.
```sql
WITH t AS (
  SELECT container_id,
    max(event_time) FILTER (WHERE event = 'DISCHARGED') AS discharged,
    max(event_time) FILTER (WHERE event = 'EMPTY_RETURNED') AS returned
  FROM container_events
  GROUP BY container_id
), o AS (
  SELECT date_trunc('month', t.returned)::date AS month,
    t.returned::date - t.discharged::date - f.free_days AS over
  FROM t
  JOIN containers c ON c.id = t.container_id
  JOIN shipments s ON s.id = c.shipment_id
  JOIN free_time_terms f ON f.customer_id = s.customer_id
    AND t.discharged::date BETWEEN f.valid_from AND f.valid_to
  WHERE s.direction = 'IMPORT'
    AND t.returned >= '2026-01-01' AND t.returned < '2026-11-01'
), m AS (
  SELECT month, SUM(over) AS days
  FROM o
  WHERE over > 0
  GROUP BY month
)
SELECT month, days, SUM(days) OVER (ORDER BY month)
FROM m
ORDER BY month
```

## Hints
1. Bước 1 là bảng xếp hạng như bài khách dẫn đầu mỗi tháng, nhưng theo quý. Bước 2 so mỗi quý với dòng đứng trước theo thứ tự quý. Bước 3 là bài ngày vượt của kế toán, gom cho cả công ty theo tháng, kèm một tổng chạy theo tháng.
2. Quý: `date_trunc('quarter', s.booking_date)::date`. Bước 1: `RANK() OVER (PARTITION BY quarter ORDER BY teu DESC)`. Bước 2: `LAG(teu) OVER (ORDER BY quarter)`. Bước 3: `SUM(days) OVER (ORDER BY month)` (một nhóm duy nhất nên không cần PARTITION BY).
3. `WITH q AS (...), r AS (SELECT q.*, RANK() OVER (PARTITION BY quarter ORDER BY teu DESC) AS rk FROM q) SELECT quarter, name, teu, rk FROM r WHERE rk <= 3 ORDER BY quarter, rk, name`

# EN
This is your promotion review. The board is holding its year-end meeting and wants to see trends, not just monthly figures. I need three tables. Get all three right and executive reporting is yours from now on.

In all three steps, TEU counts by booking date and leaves out cancelled shipments.

## Step 1: The top three customers of each quarter
For each quarter from Q1 to Q3 2026, which customers have a total TEU within the top 3 ranks of the quarter? Equal TEU shares a rank and the next customer skips ranks (1, 1, 3); keep every customer ranked 1 to 3. Send the quarter (its first day), the customer name, the total TEU and the rank; sorted by quarter, then rank, then customer name alphabetically.

## Step 2: TEU per quarter against the previous quarter
For each quarter from Q1 2025 to Q3 2026: the total TEU and the percent change on the quarter just before (rounded to 1 decimal place; empty for the first quarter). Send the quarter (its first day), the total TEU and the percent; sorted by quarter from oldest to newest.

## Step 3: Days past free time, running total since January
Use the same calculation as accounting's overrun task: import containers returned empty, days used are the empty-return date minus the discharge date (calendar dates), minus the free days in the customer's terms in force on the discharge date; a container that did not go over does not count. For each month of return from January 2026 to October 2026, for the whole company: the overrun days in the month and the running total since January. Send the month (its first day), the overrun days in the month and the running total; sorted by month.

## Hints
1. Step 1 is a ranking like the top customers of each month, but per quarter. Step 2 compares each quarter with the row before it in quarter order. Step 3 is accounting's overrun task, totalled for the whole company per month, with a total that runs by month.
2. Quarter: `date_trunc('quarter', s.booking_date)::date`. Step 1: `RANK() OVER (PARTITION BY quarter ORDER BY teu DESC)`. Step 2: `LAG(teu) OVER (ORDER BY quarter)`. Step 3: `SUM(days) OVER (ORDER BY month)` (a single group, so no PARTITION BY).
3. `WITH q AS (...), r AS (SELECT q.*, RANK() OVER (PARTITION BY quarter ORDER BY teu DESC) AS rk FROM q) SELECT quarter, name, teu, rk FROM r WHERE rk <= 3 ORDER BY quarter, rk, name`
````


- [ ] **Step 4: Chạy toàn bộ, xác nhận PASS rồi commit**

Run: `npm test && npx tsc --noEmit`
Expected: tất cả PASS; `contentProblems` rỗng; số dòng như bảng "Số dòng kết quả mong đợi".

```bash
git add content/tickets/ch10 tests/scene.test.ts
git commit -m "content: chapter 10 Trends and rankings (6 tickets, VI + EN)"
```

---

### Task 5: Chương 11 · Truy vấn nhanh hơn (6 ticket, chấm theo kế hoạch, phòng thí nghiệm)

**Files:**
- Create: `content/tickets/ch11/ch11-01.md` … `ch11-06.md`, `tests/planCheck.test.ts`
- Modify: `tests/scene.test.ts`

Người hỏi: Đỗ Tùng (IT), Hoàng Khánh (Trưởng phòng Ops), Đặng Trang (CSKH), Hoàng Thảo (kế toán AP), Giám đốc. Ticket có `plan: { index: shipments }` chỉ qua khi kết quả đúng **và** kế hoạch đọc `shipments` qua chỉ mục. ch11-04 và bước 3 của ch11-06 là phòng thí nghiệm (`lab:`). Bẫy twist: chỉ mục mà cột đầu không phải cột được lọc/nối thì kế hoạch vẫn đọc cả bảng. Luật twist → cột mốc: `index_design` kiểm trên `lab.ddl` của bước 3.

- [ ] **Step 1: Test kế hoạch và bảng hoạt cảnh (viết trước)**

**Tạo `tests/planCheck.test.ts`:**
```ts
import { describe, expect, it } from 'vitest';
import { loadTicketTemplates } from '../src/content';
import { runLab, runSandboxed } from '../src/db/run';
import { compareResults } from '../src/grader';
import { checkLab, checkPlan, isCreateIndex, planLine, planNodes } from '../src/planCheck';
import { explainError } from '../src/ui/sqlErrors';
import { applyVariant, variantsOf } from '../src/variants';
import { freshDb, seededDb } from './helpers';

const explain = async (sql: string) => (await runSandboxed(await seededDb(), `EXPLAIN (FORMAT JSON) ${sql}`)).rows[0][0];

/** Every step with plan:/lab:, in every variant. */
const steps = loadTicketTemplates().flatMap((t) => Array.from({ length: Math.max(1, variantsOf(t).length) }, (_, v) => applyVariant(t, v))
  .flatMap((tv, v) => tv.steps.map((s, i) => ({ name: `${t.id}#${v} step ${i + 1}`, id: t.id, v, i, step: s })))
  .filter((x) => x.step.plan || x.step.lab));

/**
 * The slow way each plan: step replaces (same result, whole-table read), so a plan check can never pass by accident.
 * {{…}} filled per variant from the ticket's own variant values.
 */
const SLOW: Record<string, (vars: Record<string, string>) => string> = {
  'ch11-01#0': ({ cust }) => `SELECT s.ref, s.booking_date, count(c.id) FROM shipments s LEFT JOIN containers c ON c.shipment_id = s.id WHERE s.customer_id + 0 = ${cust} GROUP BY s.id, s.ref, s.booking_date ORDER BY s.booking_date DESC, s.ref`,
  'ch11-02#0': ({ w }) => `SELECT s.ref, c.name, s.booking_date FROM shipments s JOIN customers c ON c.id = s.customer_id WHERE date_trunc('week', s.booking_date) = '${w}' ORDER BY s.booking_date, s.ref`,
  'ch11-03#0': ({ typed }) => `SELECT s.ref, c.name, s.status, s.eta FROM shipments s JOIN customers c ON c.id = s.customer_id WHERE upper(s.ref) = upper('${typed}')`,
  'ch11-05#0': () => `SELECT b.currency, count(*), SUM(b.amount) FROM vendor_bills b JOIN shipments s ON s.id = b.shipment_id WHERE to_char(s.booking_date, 'YYYY-MM') = '2026-09' GROUP BY b.currency ORDER BY b.currency`,
  'ch11-06#0': () => `SELECT p.name, count(*), SUM(s.gross_weight_kg) FROM shipments s JOIN ports p ON p.code = s.pod WHERE to_char(s.booking_date, 'YYYY-MM') = '2026-10' GROUP BY p.name ORDER BY 2 DESC, p.name`,
  'ch11-06#1': () => `SELECT s.ref, s.booking_date, s.status FROM shipments s WHERE s.customer_id::text = '57' AND s.booking_date::text >= '2026-07-01' ORDER BY s.booking_date, s.ref`,
};

/** Indexes a player might propose that must NOT pass the lab (wrong first column, wrong table). */
const NEAR_MISS = [
  'CREATE INDEX ON container_events (event_time, container_id)',
  'CREATE INDEX ON container_events (event)',
  'CREATE INDEX ON containers (shipment_id)',
];

describe('planCheck: chấm theo kế hoạch thực thi (chương 11)', () => {
  it('isCreateIndex: đúng một CREATE INDEX, cho phép chú thích, cấm CONCURRENTLY và câu khác', () => {
    expect(isCreateIndex('CREATE INDEX ON t (a)')).toBe(true);
    expect(isCreateIndex('-- my idea\n  create unique index x on t (a, b)')).toBe(true);
    expect(isCreateIndex('CREATE INDEX CONCURRENTLY ON t (a)')).toBe(false);
    expect(isCreateIndex('DROP TABLE shipments')).toBe(false);
    expect(isCreateIndex('/* CREATE INDEX */ DELETE FROM shipments')).toBe(false);
  });

  it('runLab: từ chối câu không phải CREATE INDEX và câu ghép; chỉ mục không còn sau khi chạy', async () => {
    const db = await seededDb();
    await expect(runLab(db, 'DROP TABLE shipments', 'SELECT 1')).rejects.toMatchObject({ code: 'LAB01' });
    expect(explainError({ message: 'x', code: 'LAB01' })).toBe('sqlerr.labOnly');
    await expect(runLab(db, 'CREATE INDEX ON shipments (eta); DROP TABLE shipments', 'SELECT 1')).rejects.toThrow();
    const r = await runLab(db, 'CREATE INDEX lab_probe ON container_events (container_id)', 'SELECT * FROM container_events WHERE container_id = 7');
    expect(planLine(r.before)).toMatch(/^Seq Scan container_events/);
    expect(planLine(r.after)).toMatch(/lab_probe/);
    expect((await db.query(`SELECT count(*)::int AS n FROM pg_indexes WHERE indexname = 'lab_probe'`)).rows).toEqual([{ n: 0 }]);
    expect((await db.query('SELECT count(*)::int AS n FROM shipments')).rows).toEqual([{ n: 20000 }]);
  });

  it('có bước chấm theo kế hoạch', () => {
    expect(steps.length).toBeGreaterThanOrEqual(10);
  });

  it.each(steps)('$name: Solution đạt plan:/lab: ở mọi biến thể', async ({ step }) => {
    if (step.plan) expect(checkPlan(await explain(step.solution), step.plan.index)).toBeUndefined();
    if (step.lab) {
      const r = await runLab(await seededDb(), step.lab.ddl, step.solution);
      expect(checkLab(r.before, r.after, step.lab)).toBeUndefined();
      expect(checkPlan(r.before, step.lab.table)).toMatchObject({ reason: 'seqScan' }); // the lab starts from a whole-table read
    }
  });

  it.each(steps.filter((x) => x.step.lab))('$name: chỉ mục sai cột đầu hoặc sai bảng không đạt', async ({ step }) => {
    for (const ddl of NEAR_MISS) {
      const r = await runLab(await seededDb(), ddl, step.solution);
      expect(checkLab(r.before, r.after, step.lab!), ddl).toBeDefined();
    }
  });

  it.each(steps.filter((x) => x.step.plan && SLOW[`${x.id}#${x.i}`]))('$name: cách viết chậm cho cùng kết quả nhưng không đạt plan:', async ({ id, v, i, step }) => {
    const t = loadTicketTemplates().find((x) => x.id === id)!;
    const slow = SLOW[`${id}#${i}`](variantsOf(t)[v] ?? {});
    const db = await seededDb();
    expect(compareResults(await runSandboxed(db, step.solution), await runSandboxed(db, slow), t.ordered).ok).toBe(true);
    expect(checkPlan(await explain(slow), step.plan!.index)).toMatchObject({ reason: 'seqScan' });
  });

  it('ch11-06 bước 2 ghép hai chỉ mục dựng sẵn bằng BitmapAnd (câu kết luận của cột mốc)', async () => {
    const boss = loadTicketTemplates().find((t) => t.id === 'ch11-06')!;
    const nodes = planNodes(await explain(boss.steps[1].solution));
    expect(nodes.map((n) => n['Node Type'])).toContain('BitmapAnd');
    expect(nodes.map((n) => n['Index Name']).filter(Boolean).sort()).toEqual(['shipments_booking_date_idx', 'shipments_customer_id_idx']);
  });

  it('kế hoạch giống hệt nhau trên hai DB vừa seed (ANALYZE đọc đủ dòng)', async () => {
    const other = await freshDb();
    for (const { step } of steps.filter((x) => x.v === 0)) {
      const a = await explain(step.solution);
      const b = (await runSandboxed(other, `EXPLAIN (FORMAT JSON) ${step.solution}`)).rows[0][0];
      expect(JSON.stringify(b)).toBe(JSON.stringify(a));
    }
  });
});
```


**Sửa `tests/scene.test.ts`** — thay:
```ts
      'ch10-05': { kind: 'ledger' }, 'ch10-06': { kind: 'promotion' },
    });
```
bằng:
```ts
      'ch10-05': { kind: 'ledger' }, 'ch10-06': { kind: 'promotion' },
      'ch11-01': { kind: 'yard' }, 'ch11-02': { kind: 'yard' }, 'ch11-03': { kind: 'chat' }, 'ch11-04': { kind: 'truck' },
      'ch11-05': { kind: 'ledger' }, 'ch11-06': { kind: 'promotion' },
    });
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/planCheck.test.ts tests/scene.test.ts`
Expected: FAIL: "có bước chấm theo kế hoạch" (0 bước), test BitmapAnd của ch11-06 (chưa có ticket); thiếu `ch11-01` … `ch11-06`. Test `isCreateIndex`, `runLab` và tất định PASS ngay.

- [ ] **Step 3: Viết 6 ticket**

**Tạo `content/tickets/ch11/ch11-01.md`:**
````markdown
---
id: ch11-01
chapter: 11
title: Màn hình tra lô theo khách mở chậm
title_en: The customer shipment screen is slow
from: { name: Đỗ Tùng, dept: IT }
difficulty: 3
beat: teach
format: worked
requires: [left_join, aggregate, group_by, order_by]
grants: [explain_read]
tables: [shipments, containers]
ordered: true
scene: { kind: yard }
plan: { index: shipments }
columns:
  - { vi: "Mã lô", en: "Shipment ref" }
  - { vi: "Ngày đặt chỗ", en: "Booking date" }
  - { vi: "Số container", en: "Number of containers" }
variants:
  - { cust: "42" }
  - { cust: "57" }
  - { cust: "88" }
reflect:
  q: { vi: "Mở tab EXPLAIN cho câu của bạn. Bước nào đọc nhiều dòng nhất, và vì sao?", en: "Open the EXPLAIN tab for your query. Which step reads the most rows, and why?" }
  options:
    - { vi: "Seq Scan trên bảng container: không có chỉ mục theo mã lô nên phải đọc hết hơn 25 nghìn container để tìm vài chục cái", en: "The Seq Scan on the containers table: there is no index on the shipment id, so it reads all 25 thousand-odd containers to find a few dozen" }
    - { vi: "Bước đọc bảng lô hàng, vì bảng lô hàng lớn nhất", en: "The step that reads the shipments table, because it is the biggest table" }
    - { vi: "Bước gom nhóm, vì gom nhóm luôn chậm nhất", en: "The grouping step, because grouping is always the slowest" }
  answer: 0
  why: { vi: "Bảng lô hàng được đọc qua chỉ mục theo khách (Bitmap Index Scan), chỉ lấy khoảng trăm dòng. Bảng container thì bị đọc toàn bộ (Seq Scan): đó là chỗ IT sẽ đề xuất chỉ mục ở các bài sau.", en: "The shipments table is read through the customer index (Bitmap Index Scan), about a hundred rows. The containers table is read in full (Seq Scan): that is where IT will propose an index in later tasks." }
---
Bộ phận chăm sóc khách hàng than màn hình tra lô theo khách mở rất chậm. Trước khi sửa gì, mình muốn bạn biết cách hỏi chính Postgres xem nó định làm gì: đó là kế hoạch thực thi. Từ chương này, việc nào có ghi "dùng chỉ mục" thì ngoài kết quả đúng, kế hoạch của câu bạn nộp cũng phải đọc bảng qua chỉ mục.

Đây là lần đầu bạn đọc kế hoạch thực thi, nên mình gửi kèm ví dụ mẫu. Chạy ví dụ, đọc từng dòng, rồi làm phần của bạn.

## Task
Màn hình cần, cho khách mã {{cust}}: mọi lô của khách (kể cả lô hủy và lô hàng không), kèm ngày đặt chỗ và số container của lô (lô không có container ghi 0). Lô mới đặt nhất lên đầu, cùng ngày thì xếp theo mã lô. Kế hoạch phải đọc bảng lô hàng qua chỉ mục theo khách có sẵn. Nộp xong, mở tab EXPLAIN và tìm bước đọc nhiều dòng nhất.

## Example
```sql
EXPLAIN                                          -- ①
SELECT ref, eta
FROM shipments
WHERE booking_date = '2026-10-15'
```
Ví dụ: kế hoạch của câu lấy các lô đặt chỗ ngày 15/10/2026.

① Đặt EXPLAIN trước một câu SELECT thì Postgres không chạy câu đó mà trả về kế hoạch: mỗi dòng là một bước, bước thụt vào trong chạy trước và đưa dòng lên bước bên ngoài.

Dòng "Bitmap Index Scan on shipments_booking_date_idx" nghĩa là Postgres tra chỉ mục theo ngày đặt chỗ để biết những dòng nào cần đọc; dòng "Bitmap Heap Scan on shipments" đọc đúng các dòng đó. Nếu thấy "Seq Scan on shipments" thì Postgres đọc cả bảng từ đầu đến cuối.

Mỗi bước có "cost=a..b": b là chi phí ước tính để xong bước đó, tính bằng đơn vị riêng của Postgres, không phải mili-giây. "rows=" là số dòng Postgres đoán bước đó trả về. Tab EXPLAIN vẽ cùng kế hoạch thành cây, kèm số dòng thật đã đọc.

## Hints
1. Mỗi lô một dòng, kèm số container, nên nối bảng container kiểu giữ cả lô không có container, rồi gom theo lô. Điều kiện khách đặt thẳng trên cột mã khách để chỉ mục có sẵn dùng được.
2. `shipments s LEFT JOIN containers c ON c.shipment_id = s.id`, `WHERE s.customer_id = {{cust}}`, đếm `count(c.id)` (không phải `count(*)`, để lô không có container ra 0).
3. `SELECT s.ref, s.booking_date, count(c.id) FROM shipments s LEFT JOIN containers c ON ... WHERE s.customer_id = {{cust}} GROUP BY s.id, s.ref, s.booking_date ORDER BY s.booking_date DESC, s.ref`

## Solution
```sql
SELECT s.ref, s.booking_date, count(c.id)
FROM shipments s
LEFT JOIN containers c ON c.shipment_id = s.id
WHERE s.customer_id = {{cust}}
GROUP BY s.id, s.ref, s.booking_date
ORDER BY s.booking_date DESC, s.ref
```

# EN
Customer service complains that the customer shipment screen opens very slowly. Before changing anything, I want you to know how to ask Postgres itself what it plans to do: the execution plan. From this chapter on, when a task says "use the index", besides a right result the plan of the query you submit must also read the table through an index.

This is the first time you read an execution plan, so I am sending a worked example along. Run it, read it line by line, then do your part.

## Task
For customer number {{cust}}, the screen needs every shipment of the customer (cancelled and air ones included), with its booking date and its number of containers (0 for a shipment without containers). Newest booking first, and on the same date, by shipment ref. The plan must read the shipments table through the existing customer index. After submitting, open the EXPLAIN tab and find the step that reads the most rows.

## Example
Example: the plan of the query that lists the shipments booked on 15 October 2026.

① Put EXPLAIN in front of a SELECT and Postgres does not run it; it returns the plan instead: each line is a step, and an indented step runs first and hands its rows to the step outside it.

The line "Bitmap Index Scan on shipments_booking_date_idx" means Postgres looks up the booking-date index to learn which rows it needs; the line "Bitmap Heap Scan on shipments" reads exactly those rows. If you see "Seq Scan on shipments", Postgres reads the whole table from start to end.

Each step has "cost=a..b": b is the estimated cost to finish that step, in Postgres' own units, not milliseconds. "rows=" is how many rows Postgres expects the step to return. The EXPLAIN tab draws the same plan as a tree, with the rows actually read.

## Hints
1. One row per shipment, with its container count, so join the containers in a way that keeps shipments without containers, then group by shipment. Put the customer condition straight on the customer number column so the existing index can be used.
2. `shipments s LEFT JOIN containers c ON c.shipment_id = s.id`, `WHERE s.customer_id = {{cust}}`, count `count(c.id)` (not `count(*)`, so shipments without containers give 0).
3. `SELECT s.ref, s.booking_date, count(c.id) FROM shipments s LEFT JOIN containers c ON ... WHERE s.customer_id = {{cust}} GROUP BY s.id, s.ref, s.booking_date ORDER BY s.booking_date DESC, s.ref`
````


**Tạo `content/tickets/ch11/ch11-02.md`:**
````markdown
---
id: ch11-02
chapter: 11
title: Báo cáo booking theo tuần chạy chậm
title_en: The weekly booking report is slow
from: { name: Hoàng Khánh, dept: Ops }
difficulty: 3
beat: develop
format: faded
requires: [explain_read, join, date_bucket, order_by]
grants: [sargable]
tables: [shipments, customers]
ordered: true
scene: { kind: yard }
plan: { index: shipments }
columns:
  - { vi: "Mã lô", en: "Shipment ref" }
  - { vi: "Tên khách hàng", en: "Customer name" }
  - { vi: "Ngày đặt chỗ", en: "Booking date" }
starter: |
  SELECT s.ref, c.name, s.booking_date
  FROM shipments s
  JOIN customers c ON c.id = s.customer_id
  WHERE s.booking_date >= ___
    AND s.booking_date < ___
  ORDER BY s.booking_date, s.ref
variants:
  - { w: "2026-10-12", w2: "2026-10-19", d1: "12/10/2026", d2: "18/10/2026", d1_en: "12 October 2026", d2_en: "18 October 2026" }
  - { w: "2026-09-14", w2: "2026-09-21", d1: "14/09/2026", d2: "20/09/2026", d1_en: "14 September 2026", d2_en: "20 September 2026" }
  - { w: "2026-08-03", w2: "2026-08-10", d1: "03/08/2026", d2: "09/08/2026", d1_en: "3 August 2026", d2_en: "9 August 2026" }
reflect:
  q: { vi: "Báo cáo cũ lọc bằng cách cắt ngày đặt chỗ về đầu tuần rồi so với ngày {{d1}}. Kết quả giống hệt, vì sao lại chậm?", en: "The old report trimmed each booking date to the start of its week and compared it with {{d1_en}}. The result is the same, so why was it slow?" }
  options:
    - { vi: "Chỉ mục lưu ngày đặt chỗ gốc, không lưu ngày đã cắt; bọc cột trong hàm thì Postgres phải tính lại cho mọi dòng (Seq Scan)", en: "The index stores the raw booking date, not the trimmed one; wrapping the column in a function makes Postgres compute it for every row (Seq Scan)" }
    - { vi: "Hàm cắt ngày chạy chậm hơn phép so sánh", en: "The trimming function is slower than a comparison" }
    - { vi: "Vì so ngày phải dùng khoảng nửa mở mới đúng", en: "Because comparing dates is only correct with a half-open range" }
  answer: 0
  why: { vi: "Chỉ mục sắp sẵn các giá trị của cột. Điều kiện để cột đứng một mình (lớn hơn hoặc bằng ngày đầu, nhỏ hơn ngày đầu tuần sau) thì Postgres nhảy thẳng vào đoạn đó của chỉ mục.", en: "An index keeps the column's values in order. With the column standing alone (on or after the first day, before the first day of the next week), Postgres jumps straight to that stretch of the index." }
---
Bảng giao ban "booking trong tuần" mình mở mỗi sáng thứ Hai giờ mất cả chục giây. IT bảo cột ngày đặt chỗ có chỉ mục sẵn rồi, nhưng báo cáo cũ cắt ngày về đầu tuần rồi mới so, nên chỉ mục không dùng được.

Câu SQL trong editor đã viết lại gần xong, chỉ còn hai chỗ trống ___. Bạn điền cho đủ rồi nộp: kết quả phải giống báo cáo cũ và kế hoạch phải dùng chỉ mục ngày đặt chỗ.

## Task
Các lô đặt chỗ trong tuần từ thứ Hai {{d1}} đến hết Chủ nhật {{d2}} (tính cả lô đã hủy): gửi mã lô, tên khách và ngày đặt chỗ; xếp theo ngày đặt chỗ, cùng ngày thì theo mã lô. Kế hoạch phải đọc bảng lô hàng qua chỉ mục ngày đặt chỗ, không đọc cả bảng.

## Hints
1. Thay vì biến đổi ngày đặt chỗ rồi so, để cột đứng một mình và so với hai mốc: từ ngày đầu tuần, và trước ngày đầu tuần sau (khoảng nửa mở như ở chương 4).
2. Chỗ trống thứ nhất là ngày đầu tuần trong nháy đơn: `'{{w}}'`. Chỗ trống thứ hai là ngày đầu tuần sau: `'{{w2}}'`.
3. `... WHERE s.booking_date >= '{{w}}' AND s.booking_date < '{{w2}}' ORDER BY s.booking_date, s.ref`

## Solution
```sql
SELECT s.ref, c.name, s.booking_date
FROM shipments s
JOIN customers c ON c.id = s.customer_id
WHERE s.booking_date >= '{{w}}'
  AND s.booking_date < '{{w2}}'
ORDER BY s.booking_date, s.ref
```

# EN
The "bookings this week" board I open every Monday morning now takes ten seconds or more. IT says the booking date column already has an index, but the old report trims each date to the start of its week before comparing, so the index cannot be used.

The SQL in the editor is almost rewritten; only two ___ blanks are left. Fill them in, then submit: the result must match the old report and the plan must use the booking date index.

## Task
The shipments booked in the week from Monday {{d1_en}} to Sunday {{d2_en}} inclusive (cancelled ones included): send the shipment ref, the customer name and the booking date; sorted by booking date, and on the same date, by shipment ref. The plan must read the shipments table through the booking date index, not the whole table.

## Hints
1. Instead of transforming the booking date and then comparing, let the column stand alone and compare it with two bounds: from the first day of the week, and before the first day of the next week (a half-open range as in chapter 4).
2. The first blank is the first day of the week in single quotes: `'{{w}}'`. The second blank is the first day of the next week: `'{{w2}}'`.
3. `... WHERE s.booking_date >= '{{w}}' AND s.booking_date < '{{w2}}' ORDER BY s.booking_date, s.ref`
````


**Tạo `content/tickets/ch11/ch11-03.md`:**
````markdown
---
id: ch11-03
chapter: 11
title: Tra mã lô khách đọc qua điện thoại
title_en: Looking up a ref read out on the phone
from: { name: Đặng Trang, dept: CS }
difficulty: 3
beat: develop
requires: [sargable, string_fn, join]
grants: []
tables: [shipments, customers]
scene: { kind: chat }
plan: { index: shipments }
columns:
  - { vi: "Mã lô", en: "Shipment ref" }
  - { vi: "Tên khách hàng", en: "Customer name" }
  - { vi: "Trạng thái", en: "Status" }
  - { vi: "Ngày đến dự kiến", en: "Estimated arrival" }
variants:
  - { typed: "cq261012345" }
  - { typed: "cq261018888" }
  - { typed: "cq250305000" }
reflect:
  q: { vi: "Vì sao chuyển chữ hoa ở phía giá trị khách đọc dùng được chỉ mục mã lô, còn chuyển chữ hoa ở phía cột thì không?", en: "Why does turning the typed value to upper case keep the ref index usable, while turning the column to upper case does not?" }
  options:
    - { vi: "Chỉ mục lưu mã lô gốc; đổi giá trị gõ vào chỉ tính một lần, đổi cột thì phải tính cho từng dòng của bảng", en: "The index stores the raw refs; changing the typed value is computed once, changing the column has to be computed for every row of the table" }
    - { vi: "Hàm đổi chữ hoa chỉ chạy được trên giá trị gõ tay", en: "The upper-case function only works on typed values" }
    - { vi: "Hai cách như nhau, Postgres tự chọn chỉ mục", en: "Both are the same; Postgres picks the index either way" }
  answer: 0
  why: { vi: "Mã lô trong bảng luôn viết hoa, nên biến đổi giá trị khách đọc cho khớp với cột là đủ. Nếu dữ liệu thật lẫn hoa thường thì phải tạo chỉ mục trên chính biểu thức đó, việc của bài thiết kế chỉ mục.", en: "Refs in the table are always upper case, so changing the value the customer read to match the column is enough. If real data mixed cases you would need an index on that exact expression, a job for the index design task." }
---
Khách gọi đọc mã lô qua điện thoại, nhân viên gõ nhanh nên hay gõ chữ thường. Màn hình tra cứu cũ đổi cả cột mã lô sang chữ hoa để so, nên lần nào tra cũng đọc hết hai mươi nghìn lô.

## Task
Nhân viên vừa gõ mã lô "{{typed}}" (chữ thường; mã lô trong hệ thống luôn viết hoa). Gửi mã lô, tên khách, trạng thái và ngày đến dự kiến của lô đó. Kế hoạch phải đọc bảng lô hàng qua chỉ mục mã lô có sẵn, không đọc cả bảng.

## Hints
1. Đổi giá trị nhân viên gõ cho khớp với cách mã lô được lưu, thay vì đổi cột mã lô cho khớp với giá trị gõ.
2. `WHERE s.ref = upper('{{typed}}')`, nối `customers` để lấy tên. Không viết `upper(s.ref) = ...`.
3. `SELECT s.ref, c.name, s.status, s.eta FROM shipments s JOIN customers c ON c.id = s.customer_id WHERE s.ref = upper('{{typed}}')`

## Solution
```sql
SELECT s.ref, c.name, s.status, s.eta
FROM shipments s
JOIN customers c ON c.id = s.customer_id
WHERE s.ref = upper('{{typed}}')
```

# EN
Customers read their shipment ref out on the phone, and staff type fast, often in lower case. The old lookup screen turns the whole ref column to upper case before comparing, so every lookup reads all twenty thousand shipments.

## Task
A colleague has just typed the ref "{{typed}}" (lower case; refs in the system are always upper case). Send the ref, the customer name, the status and the estimated arrival date of that shipment. The plan must read the shipments table through the existing ref index, not the whole table.

## Hints
1. Change the value the colleague typed to match how refs are stored, instead of changing the ref column to match the typed value.
2. `WHERE s.ref = upper('{{typed}}')`, joined to `customers` for the name. Do not write `upper(s.ref) = ...`.
3. `SELECT s.ref, c.name, s.status, s.eta FROM shipments s JOIN customers c ON c.id = s.customer_id WHERE s.ref = upper('{{typed}}')`
````


**Tạo `content/tickets/ch11/ch11-04.md`:**
````markdown
---
id: ch11-04
chapter: 11
title: Đề xuất chỉ mục cho màn hình hành trình container
title_en: Propose an index for the container journey screen
from: { name: Đỗ Tùng, dept: IT }
difficulty: 4
beat: twist
requires: [explain_read, sargable, join]
grants: [index_design]
tables: [container_events, containers]
ordered: true
scene: { kind: truck }
lab: { table: container_events, ddl: "CREATE INDEX ON container_events (container_id, event_time)", max_cost_ratio: 0.1 }
columns:
  - { vi: "Sự kiện", en: "Event" }
  - { vi: "Thời điểm", en: "Time" }
variants:
  - { no: "CQLU0020001" }
  - { no: "CQLU0022222" }
  - { no: "CQLU0024000" }
reflect:
  q: { vi: "Chỉ mục trên cột thời điểm rồi mới đến mã container không giúp gì cho màn hình này. Vì sao?", en: "An index on the time column first and the container id second does not help this screen at all. Why?" }
  options:
    - { vi: "Chỉ mục sắp theo cột đầu tiên; truy vấn lọc theo container chứ không theo thời điểm, nên không nhảy thẳng tới container cần tìm được", en: "An index is sorted by its first column; the query filters by container, not by time, so it cannot jump straight to the container it wants" }
    - { vi: "Chỉ mục nhiều cột không bao giờ được dùng", en: "Multi-column indexes are never used" }
    - { vi: "Cột thời điểm có kiểu ngày giờ nên không đặt chỉ mục được", en: "A timestamp column cannot be indexed" }
  answer: 0
  why: { vi: "Giống cuốn danh bạ sắp theo họ: tra theo họ thì nhanh, tra theo tên đệm thì phải đọc hết. Ở đây chỉ mục chỉ có mã container cũng đã đủ nhanh; thêm thời điểm làm cột thứ hai thì kết quả ra sẵn đúng thứ tự.", en: "Like a phone book sorted by surname: looking up a surname is fast, looking up a middle name means reading it all. Here an index on the container id alone is already fast enough; adding the time as the second column hands the rows over already in order." }
---
Bộ phận chăm sóc khách hàng mở màn hình hành trình container mỗi khi khách gọi hỏi, và mỗi lần mở mất mấy giây. Bảng sự kiện container đã hơn trăm nghìn dòng mà chưa có chỉ mục nào theo container, nên lần nào cũng đọc hết.

Bài này là phòng thí nghiệm chỉ mục: câu truy vấn của màn hình nằm ở thẻ bên trái và giữ nguyên. Bạn viết một câu tạo chỉ mục vào editor. Mỗi lần chạy, hệ thống tạo chỉ mục của bạn, so kế hoạch trước và sau, rồi hủy chỉ mục ngay, nên không có gì thay đổi thật.

## Task
Đề xuất một chỉ mục để màn hình hành trình của container {{no}} không phải đọc toàn bộ bảng sự kiện container. Đạt khi, với chỉ mục của bạn, kế hoạch đọc bảng sự kiện qua chỉ mục và chi phí ước tính của cả câu giảm còn không quá 10% so với trước.

## Hints
1. Xem kế hoạch trước: bước nào đọc cả bảng, và nó lọc theo cột nào? Chỉ mục phải bắt đầu bằng đúng cột đó.
2. Màn hình tìm sự kiện theo `container_id` rồi sắp theo `event_time`. Viết `CREATE INDEX ON container_events (...)`, cột đầu tiên là cột dùng để nối với `containers`.
3. `CREATE INDEX ON container_events (container_id, event_time)`

## Solution
```sql
SELECT e.event, e.event_time
FROM containers c
JOIN container_events e ON e.container_id = c.id
WHERE c.container_no = '{{no}}'
ORDER BY e.event_time DESC
```

# EN
Customer service opens the container journey screen every time a customer calls, and it takes a few seconds each time. The container events table has passed a hundred thousand rows with no index by container, so every lookup reads all of it.

This task is an index lab: the screen's query is in the card on the left and stays as it is. You write one statement that creates an index in the editor. On every run the system creates your index, compares the plan before and after, then drops the index right away, so nothing really changes.

## Task
Propose one index so that the journey screen for container {{no}} does not have to read the whole container events table. It passes when, with your index, the plan reads the events table through an index and the estimated cost of the whole query drops to no more than 10% of what it was.

## Hints
1. Look at the plan first: which step reads a whole table, and which column does it filter on? The index must start with exactly that column.
2. The screen finds events by `container_id` and sorts them by `event_time`. Write `CREATE INDEX ON container_events (...)`, with the column used to join to `containers` first.
3. `CREATE INDEX ON container_events (container_id, event_time)`
````


**Tạo `content/tickets/ch11/ch11-05.md`:**
````markdown
---
id: ch11-05
chapter: 11
title: Hóa đơn nhà cung cấp của các lô đặt tháng 9
title_en: Supplier bills for the September bookings
from: { name: Hoàng Thảo, dept: Finance }
difficulty: 3
beat: rest
requires: [join, aggregate, group_by, order_by, sargable]
grants: []
tables: [vendor_bills, shipments]
ordered: true
scene: { kind: ledger }
plan: { index: shipments }
columns:
  - { vi: "Loại tiền", en: "Currency" }
  - { vi: "Số hóa đơn", en: "Number of bills" }
  - { vi: "Tổng tiền (theo loại tiền đó)", en: "Total amount (in that currency)" }
reflect:
  q: { vi: "Kế hoạch của bạn vẫn đọc toàn bộ bảng hóa đơn nhà cung cấp. Có cần lo không?", en: "Your plan still reads the whole supplier bills table. Should you worry?" }
  options:
    - { vi: "Chưa cần: bảng này chỉ vài nghìn dòng, Postgres đọc hết một lượt rồi ghép bằng bảng băm còn rẻ hơn tra từng lô", en: "Not yet: the table has only a few thousand rows, and reading it once and matching with a hash table is cheaper than looking up each shipment" }
    - { vi: "Có: mọi bước đọc cả bảng đều là lỗi", en: "Yes: every step that reads a whole table is a mistake" }
    - { vi: "Có: phải tạo ngay chỉ mục cho mọi khóa ngoại", en: "Yes: every foreign key needs an index right away" }
  answer: 0
  why: { vi: "Đọc cả bảng không phải lúc nào cũng xấu. Postgres so chi phí và chọn cách rẻ nhất; chỉ mục đáng giá khi cần lấy một phần nhỏ của một bảng lớn.", en: "Reading a whole table is not always bad. Postgres compares costs and picks the cheapest way; an index pays off when you need a small part of a big table." }
---
Mình đang chốt sổ chi phí của các lô đặt chỗ tháng 9/2026. Câu cũ của mình lọc tháng bằng cách đổi ngày đặt chỗ thành chữ năm-tháng rồi so, IT bảo vì thế mà nó đọc cả bảng lô hàng.

## Task
Các hóa đơn nhà cung cấp thuộc những lô đặt chỗ từ 01/09/2026 đến hết 30/09/2026 (kể cả lô đã hủy): theo từng loại tiền, có bao nhiêu hóa đơn và tổng tiền bao nhiêu (giữ nguyên loại tiền, không quy đổi)? Gửi loại tiền, số hóa đơn và tổng tiền; xếp theo loại tiền theo thứ tự chữ cái. Kế hoạch phải đọc bảng lô hàng qua chỉ mục ngày đặt chỗ.

## Hints
1. Ngày đặt chỗ nằm ở lô hàng, tiền nằm ở hóa đơn nhà cung cấp: nối hai bảng, lọc tháng bằng khoảng nửa mở trên chính cột ngày đặt chỗ, rồi gom theo loại tiền.
2. `vendor_bills b JOIN shipments s ON s.id = b.shipment_id`, `WHERE s.booking_date >= '2026-09-01' AND s.booking_date < '2026-10-01'`, rồi `count(*)` và `SUM(b.amount)` theo `b.currency`.
3. `SELECT b.currency, count(*), SUM(b.amount) FROM vendor_bills b JOIN shipments s ON ... WHERE ... GROUP BY b.currency ORDER BY b.currency`

## Solution
```sql
SELECT b.currency, count(*), SUM(b.amount)
FROM vendor_bills b
JOIN shipments s ON s.id = b.shipment_id
WHERE s.booking_date >= '2026-09-01' AND s.booking_date < '2026-10-01'
GROUP BY b.currency
ORDER BY b.currency
```

# EN
I am closing the cost books for the shipments booked in September 2026. My old query filtered the month by turning the booking date into year-month text and comparing that, and IT says that is why it reads the whole shipments table.

## Task
The supplier bills of the shipments booked from 1 September 2026 to 30 September 2026 inclusive (cancelled ones included): per currency, how many bills and what total amount (kept in that currency, not converted)? Send the currency, the number of bills and the total amount; sorted by currency alphabetically. The plan must read the shipments table through the booking date index.

## Hints
1. The booking date is on the shipment and the money is on the supplier bill: join the two tables, filter the month with a half-open range on the booking date column itself, then group by currency.
2. `vendor_bills b JOIN shipments s ON s.id = b.shipment_id`, `WHERE s.booking_date >= '2026-09-01' AND s.booking_date < '2026-10-01'`, then `count(*)` and `SUM(b.amount)` per `b.currency`.
3. `SELECT b.currency, count(*), SUM(b.amount) FROM vendor_bills b JOIN shipments s ON ... WHERE ... GROUP BY b.currency ORDER BY b.currency`
````


**Tạo `content/tickets/ch11/ch11-06.md`:**
````markdown
---
id: ch11-06
chapter: 11
title: "Đánh giá thăng tiến: tăng tốc ba báo cáo trước mùa cao điểm"
title_en: "Promotion review: speed up three reports before peak season"
from: { name: Trần An, dept: Management }
difficulty: 4
beat: boss
requires: [index_design, sargable, explain_read, join, aggregate, group_by, order_by]
grants: []
tables: [shipments, ports, containers, container_events]
ordered: true
plan: [{ index: shipments }, { index: shipments }, null]
lab: [null, null, { table: container_events, ddl: "CREATE INDEX ON container_events (container_id)", max_cost_ratio: 0.5 }]
columns:
  - [{ vi: "Cảng đến", en: "Destination port" }, { vi: "Số lô", en: "Shipments" }, { vi: "Tổng trọng lượng (kg)", en: "Total weight (kg)" }]
  - [{ vi: "Mã lô", en: "Shipment ref" }, { vi: "Ngày đặt chỗ", en: "Booking date" }, { vi: "Trạng thái", en: "Status" }]
  - [{ vi: "Số container", en: "Container number" }, { vi: "Sự kiện", en: "Event" }, { vi: "Thời điểm", en: "Time" }]
conclusion:
  question: "Câu ở bước 2 lọc theo cả mã khách lẫn ngày đặt chỗ. Chạy lại câu đó rồi mở tab EXPLAIN: Postgres dùng chỉ mục nào?"
  options:
    - "Cả hai chỉ mục dựng sẵn: tra từng chỉ mục rồi giữ các dòng có ở cả hai (BitmapAnd), xong mới đọc bảng"
    - "Chỉ chỉ mục theo khách; điều kiện ngày lọc sau khi đã đọc từng dòng"
    - "Không chỉ mục nào: có hai điều kiện thì Postgres luôn đọc cả bảng"
  answer: 0
conclusion_en:
  question: "The step 2 query filters on both the customer number and the booking date. Run it again, then open the EXPLAIN tab: which index does Postgres use?"
  options:
    - "Both prebuilt indexes: it looks up each one and keeps the rows found in both (BitmapAnd), and only then reads the table"
    - "Only the customer index; the date condition is checked after reading each row"
    - "Neither: with two conditions Postgres always reads the whole table"
---
Đây là buổi đánh giá thăng tiến của bạn. Trước mùa cao điểm, IT đo được ba báo cáo chạy chậm nhất. Mỗi báo cáo cần kết quả đúng như cũ và một kế hoạch rẻ hơn. Làm được cả ba là từ nay bạn phụ trách hiệu năng dữ liệu, làm cầu nối với IT.

## Step 1: Sản lượng theo cảng đến tháng 10
Các lô đặt chỗ từ 01/10/2026 đến hết 31/10/2026 (kể cả lô đã hủy): theo tên cảng đến, số lô và tổng trọng lượng (kg). Nhiều lô nhất lên đầu, bằng nhau thì xếp theo tên cảng theo thứ tự chữ cái. Kế hoạch phải đọc bảng lô hàng qua chỉ mục ngày đặt chỗ.
```sql
SELECT p.name, count(*), SUM(s.gross_weight_kg)
FROM shipments s
JOIN ports p ON p.code = s.pod
WHERE s.booking_date >= '2026-10-01' AND s.booking_date < '2026-11-01'
GROUP BY p.name
ORDER BY 2 DESC, p.name
```

## Step 2: Lô gần đây của một khách
Các lô của khách mã 57 đặt chỗ từ 01/07/2026 trở đi: mã lô, ngày đặt chỗ và trạng thái; xếp theo ngày đặt chỗ, cùng ngày thì theo mã lô. Kế hoạch phải đọc bảng lô hàng qua chỉ mục, không đọc cả bảng.
```sql
SELECT s.ref, s.booking_date, s.status
FROM shipments s
WHERE s.customer_id = 57 AND s.booking_date >= '2026-07-01'
ORDER BY s.booking_date, s.ref
```

## Step 3: Hành trình container của khách đó
Báo cáo hành trình mọi container thuộc các lô ở bước 2 (số container, sự kiện, thời điểm; xếp theo số container rồi theo thời điểm) đang đọc toàn bộ bảng sự kiện container. Câu truy vấn nằm ở thẻ bên trái và giữ nguyên. Đề xuất một chỉ mục: đạt khi kế hoạch đọc bảng sự kiện container qua chỉ mục và chi phí ước tính của cả câu giảm còn không quá một nửa.
```sql
SELECT c.container_no, e.event, e.event_time
FROM shipments s
JOIN containers c ON c.shipment_id = s.id
JOIN container_events e ON e.container_id = c.id
WHERE s.customer_id = 57 AND s.booking_date >= '2026-07-01'
ORDER BY c.container_no, e.event_time
```

## Hints
1. Bước 1 và 2: để cột ngày đặt chỗ và cột mã khách đứng một mình trong điều kiện, như bài báo cáo booking theo tuần. Bước 3 là phòng thí nghiệm như bài màn hình hành trình container: xem bước nào đọc cả bảng sự kiện và nó nối theo cột nào.
2. Bước 1: `s.booking_date >= '2026-10-01' AND s.booking_date < '2026-11-01'`, nối `ports` qua `s.pod`. Bước 2: `s.customer_id = 57 AND s.booking_date >= '2026-07-01'`. Bước 3: `CREATE INDEX ON container_events (...)` với cột nối đứng đầu.
3. `SELECT p.name, count(*), SUM(s.gross_weight_kg) FROM shipments s JOIN ports p ON p.code = s.pod WHERE ... GROUP BY p.name ORDER BY 2 DESC, p.name`

# EN
This is your promotion review. Before peak season, IT measured the three slowest reports. Each one needs the same right result as before and a cheaper plan. Get all three and data performance is yours from now on, as the bridge to IT.

## Step 1: Volume by destination port in October
The shipments booked from 1 October 2026 to 31 October 2026 inclusive (cancelled ones included): per destination port name, the number of shipments and the total weight (kg). Most shipments first, and on a tie, by port name alphabetically. The plan must read the shipments table through the booking date index.

## Step 2: A customer's recent shipments
The shipments of customer number 57 booked from 1 July 2026 on: the shipment ref, the booking date and the status; sorted by booking date, and on the same date, by ref. The plan must read the shipments table through an index, not the whole table.

## Step 3: That customer's container journeys
The report of the journey of every container on the shipments of step 2 (container number, event, time; sorted by container number, then time) reads the whole container events table. The query is in the card on the left and stays as it is. Propose one index: it passes when the plan reads the container events table through an index and the estimated cost of the whole query drops to no more than half.

## Hints
1. Steps 1 and 2: let the booking date column and the customer number column stand alone in the conditions, as in the weekly booking report. Step 3 is a lab like the container journey screen: see which step reads the whole events table and which column it joins on.
2. Step 1: `s.booking_date >= '2026-10-01' AND s.booking_date < '2026-11-01'`, joined to `ports` through `s.pod`. Step 2: `s.customer_id = 57 AND s.booking_date >= '2026-07-01'`. Step 3: `CREATE INDEX ON container_events (...)` with the join column first.
3. `SELECT p.name, count(*), SUM(s.gross_weight_kg) FROM shipments s JOIN ports p ON p.code = s.pod WHERE ... GROUP BY p.name ORDER BY 2 DESC, p.name`
````


- [ ] **Step 4: Chạy toàn bộ, xác nhận PASS rồi commit**

Run: `npm test && npx tsc --noEmit`
Expected: tất cả PASS; `tests/planCheck.test.ts` 37 test (16 bước có `plan:`/`lab:` × biến thể).

```bash
git add content/tickets/ch11 tests/planCheck.test.ts tests/scene.test.ts
git commit -m "content: chapter 11 Faster queries (6 tickets, plan grading, index lab, VI + EN)"
```

---

### Task 6: Chương 12 · Điều tra cuối năm (6 ticket)

**Files:**
- Create: `content/tickets/ch12/ch12-01.md` … `ch12-06.md`
- Modify: `tests/scene.test.ts`, `tests/home.test.ts`

Người hỏi: Nguyễn Quang (kế toán trưởng), Đặng Hà (pricing), Võ Thu (Trưởng phòng CSKH), Hoàng Khánh, Giám đốc. Không kỹ năng mới (`grants: []` mọi ticket); mỗi ticket dùng kỹ năng của ít nhất 3 chương. Ô KPI `q3margin` mở khi xong ch12-06 (bước 1, cột 0 = biên quý 3).

- [ ] **Step 1: Bảng hoạt cảnh và ô KPI (test viết trước)**

**Sửa `tests/scene.test.ts`** — thay:
```ts
      'ch11-05': { kind: 'ledger' }, 'ch11-06': { kind: 'promotion' },
    });
```
bằng:
```ts
      'ch11-05': { kind: 'ledger' }, 'ch11-06': { kind: 'promotion' },
      'ch12-01': { kind: 'ledger' }, 'ch12-02': { kind: 'quote' }, 'ch12-03': { kind: 'chat' }, 'ch12-04': { kind: 'chat' },
      'ch12-05': { kind: 'ledger' }, 'ch12-06': { kind: 'promotion' },
    });
```

**Sửa `tests/home.test.ts`** — thay:
```ts

  it('ô chỉ mở khi xong đúng việc tính ra nó; ô của chương chưa có nội dung luôn khóa', () => {
    const tiles = kpiTiles(KPIS, tickets, new Set([...ids(1), ...ids(2)]));
```
bằng:
```ts

  it('ô chỉ mở khi xong đúng việc tính ra nó', () => {
    const tiles = kpiTiles(KPIS, tickets, new Set([...ids(1), ...ids(2)]));
```

**Sửa `tests/home.test.ts`** — thay:
```ts
    expect(by('teuByCarrier')).toMatchObject({ open: false, ticket: { id: 'ch3-02' } });
    expect(by('q3margin')).toMatchObject({ open: false, ticket: undefined });
    expect(chapterOfId('ch12-06')).toBe(12);
```
bằng:
```ts
    expect(by('teuByCarrier')).toMatchObject({ open: false, ticket: { id: 'ch3-02' } });
    expect(by('q3margin')).toMatchObject({ open: false, ticket: { id: 'ch12-06' } }); // Plan 4 wrote chapter 12: locked until ch12-06 is done
    expect(chapterOfId('ch12-06')).toBe(12);
```


- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/scene.test.ts tests/home.test.ts`
Expected: FAIL: thiếu `ch12-01` … `ch12-06`; ô `q3margin` chưa có ticket.

- [ ] **Step 3: Viết 6 ticket**

**Tạo `content/tickets/ch12/ch12-01.md`:**
````markdown
---
id: ch12-01
chapter: 12
title: Biên lợi nhuận quý 3 giảm ở vùng nào?
title_en: Where did the Q3 margin fall?
from: { name: Nguyễn Quang, dept: Finance }
difficulty: 4
beat: teach
format: worked
requires: [multi_cte, distinct_on, conditional_agg, join, case_when]
grants: []
tables: [vendor_bills, exchange_rates, invoices, shipments, ports]
ordered: true
scene: { kind: ledger }
columns:
  - { vi: "Vùng", en: "Region" }
  - { vi: "Biên lãi gộp quý 2 (%)", en: "Q2 gross margin (%)" }
  - { vi: "Biên lãi gộp quý 3 (%)", en: "Q3 gross margin (%)" }
  - { vi: "Thay đổi (điểm phần trăm)", en: "Change (percentage points)" }
reflect:
  q: { vi: "Vì sao so biên lãi gộp (phần trăm) mà không so tổng tiền lãi giữa hai quý?", en: "Why compare the gross margin (a percentage) and not the total profit between the two quarters?" }
  options:
    - { vi: "Sản lượng mỗi quý khác nhau; tỷ lệ cho thấy mỗi đồng doanh thu còn lại bao nhiêu lãi, không bị lượng hàng che mất", en: "Volumes differ between quarters; a rate shows how much profit each dong of revenue keeps, without volume hiding it" }
    - { vi: "Vì tiền lãi có nhiều loại tiền", en: "Because profit is in several currencies" }
    - { vi: "Không có lý do, hai cách cho cùng kết luận", en: "No reason, both lead to the same conclusion" }
  answer: 0
  why: { vi: "Doanh thu châu Âu quý 3 còn tăng, nên tổng tiền lãi có thể chưa giảm nhiều mà biên đã giảm mạnh. Điều tra luôn bắt đầu bằng một con số so được giữa hai kỳ.", en: "Europe's Q3 revenue even went up, so total profit may barely move while the margin falls hard. An investigation always starts from a number that compares fairly between periods." }
wrong:
  - sql: "WITH rate AS (SELECT DISTINCT ON (b.id) b.shipment_id, ROUND(b.amount * r.vnd_per_unit) AS cost_vnd FROM vendor_bills b JOIN exchange_rates r ON r.currency = b.currency AND r.rate_date <= b.bill_date ORDER BY b.id, r.rate_date DESC), cost AS (SELECT shipment_id, SUM(cost_vnd) AS cost FROM rate GROUP BY shipment_id), rev AS (SELECT shipment_id, SUM(amount_vnd) AS rev FROM invoices GROUP BY shipment_id), m AS (SELECT p.region, 100 * SUM(rev.rev - cost.cost) FILTER (WHERE s.booking_date < '2026-07-01') / SUM(rev.rev) FILTER (WHERE s.booking_date < '2026-07-01') AS q2, 100 * SUM(rev.rev - cost.cost) FILTER (WHERE s.booking_date >= '2026-07-01') / SUM(rev.rev) FILTER (WHERE s.booking_date >= '2026-07-01') AS q3 FROM shipments s JOIN rev ON rev.shipment_id = s.id JOIN cost ON cost.shipment_id = s.id JOIN ports p ON p.code = s.pod WHERE s.booking_date >= '2026-04-01' AND s.booking_date < '2026-10-01' GROUP BY p.region) SELECT region, round(q2, 1), round(q3, 1), round(q3 - q2, 1) FROM m ORDER BY q3 - q2, region"
    vi: "Bạn đang lấy vùng theo cảng đến cho mọi lô. Với lô nhập, đầu bên kia là cảng đi; chỉ lô xuất mới lấy cảng đến."
    en: "You take the region from the destination port for every shipment. For an import the far end is the port of loading; only exports use the destination port."
---
Báo cáo quản trị quý 3/2026 cho thấy biên lãi gộp của công ty giảm. Hội đồng quản trị sẽ hỏi "giảm ở đâu?", nên trước khi đoán nguyên nhân, mình cần tách con số theo vùng.

Chương này không có kỹ năng mới: mọi việc dùng lại những gì bạn đã học. Cái mới là cách điều tra. Ví dụ mẫu dưới đây làm một cuộc điều tra nhỏ theo ba bước: biến giả thuyết thành một con số, tính cho cả hai kỳ trong cùng một câu, rồi cắt thêm một chiều để kiểm tra chéo.

## Task
Chỉ tính các lô đặt chỗ từ 01/04 đến hết 30/09/2026 có cả hóa đơn bán (doanh thu, đồng) và hóa đơn nhà cung cấp (chi phí). Chi phí của mỗi hóa đơn nhà cung cấp quy ra đồng bằng tỷ giá gần nhất vào hoặc trước ngày hóa đơn, làm tròn đến đồng từng hóa đơn, như khi chốt sổ quý 3. Vùng của lô là vùng của cảng đầu bên kia: cảng đến với lô xuất, cảng đi với lô nhập. Với mỗi vùng: biên lãi gộp quý 2 và quý 3 (theo quý của ngày đặt chỗ; biên lãi gộp = doanh thu trừ chi phí, chia doanh thu, nhân 100), và thay đổi tính bằng biên quý 3 trừ biên quý 2. Làm tròn cả ba số đến 1 chữ số thập phân, tính thay đổi trên hai số chưa làm tròn. Gửi vùng và ba số; vùng giảm nhiều nhất lên đầu, bằng nhau thì xếp theo tên vùng.

## Example
```sql
WITH q AS (                                              -- ①
  SELECT date_trunc('quarter', booking_date)::date AS quarter, direction,
    count(*) FILTER (WHERE status = 'CANCELLED') AS cancelled,
    count(*) AS total
  FROM shipments
  WHERE booking_date >= '2026-04-01' AND booking_date < '2026-10-01'
  GROUP BY 1, 2
)
SELECT quarter, direction, cancelled, total,
  round(100.0 * cancelled / total, 1) AS pct             -- ②
FROM q
ORDER BY direction, quarter                              -- ③
```
Ví dụ: Sales nghi quý 3 khách hủy booking nhiều hơn quý 2. Có đúng không, và nếu đúng thì ở chiều hàng nào?

① Biến giả thuyết thành một con số, và tính cho cả hai kỳ trong cùng một câu để hai kỳ dùng đúng một định nghĩa.

② So tỷ lệ chứ không so số lô hủy: sản lượng mỗi quý khác nhau, một quý đông hàng tự nhiên có nhiều lô hủy hơn.

③ Cắt thêm một chiều (ở đây là chiều hàng) để kiểm tra chéo: thay đổi nằm ở đâu, hay đều khắp nơi. Kết quả trả lời giả thuyết: tỷ lệ hủy có nhích lên ở cả hai chiều nhưng chưa tới 1 điểm phần trăm, quá nhỏ để giải thích một cú giảm lớn.

## Hints
1. Ba bước tiền như bài chốt sổ quý 3 ở chương 8: chi phí từng hóa đơn nhà cung cấp quy ra đồng, cộng theo lô; doanh thu cộng theo lô. Rồi gom theo vùng, tính riêng quý 2 và quý 3 trong cùng một câu.
2. Vùng: `JOIN ports p ON p.code = CASE WHEN s.direction = 'EXPORT' THEN s.pod ELSE s.pol END`. Hai quý trong một câu: `SUM(rev.rev - cost.cost) FILTER (WHERE s.booking_date < '2026-07-01')` và tương tự cho quý 3.
3. `WITH rate AS (SELECT DISTINCT ON (b.id) ...), cost AS (...), rev AS (...), m AS (SELECT p.region, 100 * SUM(...) FILTER (...) / SUM(rev.rev) FILTER (...) AS q2, ... AS q3 FROM shipments s JOIN rev ... JOIN cost ... JOIN ports p ON ... WHERE ... GROUP BY p.region) SELECT region, round(q2, 1), round(q3, 1), round(q3 - q2, 1) FROM m ORDER BY q3 - q2, region`

## Solution
```sql
WITH rate AS (
  SELECT DISTINCT ON (b.id) b.shipment_id, ROUND(b.amount * r.vnd_per_unit) AS cost_vnd
  FROM vendor_bills b
  JOIN exchange_rates r ON r.currency = b.currency AND r.rate_date <= b.bill_date
  ORDER BY b.id, r.rate_date DESC
), cost AS (
  SELECT shipment_id, SUM(cost_vnd) AS cost FROM rate GROUP BY shipment_id
), rev AS (
  SELECT shipment_id, SUM(amount_vnd) AS rev FROM invoices GROUP BY shipment_id
), m AS (
  SELECT p.region,
    100 * SUM(rev.rev - cost.cost) FILTER (WHERE s.booking_date < '2026-07-01')
        / SUM(rev.rev) FILTER (WHERE s.booking_date < '2026-07-01') AS q2,
    100 * SUM(rev.rev - cost.cost) FILTER (WHERE s.booking_date >= '2026-07-01')
        / SUM(rev.rev) FILTER (WHERE s.booking_date >= '2026-07-01') AS q3
  FROM shipments s
  JOIN rev ON rev.shipment_id = s.id
  JOIN cost ON cost.shipment_id = s.id
  JOIN ports p ON p.code = CASE WHEN s.direction = 'EXPORT' THEN s.pod ELSE s.pol END
  WHERE s.booking_date >= '2026-04-01' AND s.booking_date < '2026-10-01'
  GROUP BY p.region
)
SELECT region, round(q2, 1), round(q3, 1), round(q3 - q2, 1)
FROM m
ORDER BY q3 - q2, region
```

# EN
The Q3 2026 management report shows the company's gross margin fell. The board will ask "where did it fall?", so before guessing at causes I need the figure split by region.

This chapter teaches no new skill: every task reuses what you have learned. What is new is the way you investigate. The worked example below runs a small investigation in three moves: turn the hypothesis into a number, compute it for both periods in one query, then cut by one more dimension to cross-check.

## Task
Count only the shipments booked from 1 April to 30 September 2026 inclusive that have both a sales invoice (revenue, VND) and a supplier bill (cost). Convert each supplier bill to VND at the latest rate on or before the bill date, rounded to the dong per bill, as when closing the Q3 books. A shipment's region is the region of its far-end port: the destination port for an export, the port of loading for an import. For each region: the Q2 and Q3 gross margin (by the quarter of the booking date; gross margin = revenue minus cost, divided by revenue, times 100), and the change, Q3 margin minus Q2 margin. Round all three figures to 1 decimal place, computing the change from the two unrounded margins. Send the region and the three figures; the biggest fall first, and on a tie, by region name.

## Example
Example: Sales suspects customers cancelled more bookings in Q3 than in Q2. Is that true, and if so, in which direction of trade?

① Turn the hypothesis into a number, and compute it for both periods in one query so both use exactly the same definition.

② Compare a rate, not the number of cancellations: volumes differ by quarter, and a busy quarter naturally has more cancellations.

③ Cut by one more dimension (here the direction of trade) to cross-check: where does the change sit, or is it everywhere? The result answers the hypothesis: the cancellation rate crept up in both directions, but by less than 1 percentage point, far too little to explain a big drop.

## Hints
1. The same three money steps as closing the Q3 books in chapter 8: each supplier bill converted to VND, totalled per shipment; revenue totalled per shipment. Then group by region and compute Q2 and Q3 separately in the same query.
2. Region: `JOIN ports p ON p.code = CASE WHEN s.direction = 'EXPORT' THEN s.pod ELSE s.pol END`. Both quarters in one query: `SUM(rev.rev - cost.cost) FILTER (WHERE s.booking_date < '2026-07-01')`, and the same for Q3.
3. `WITH rate AS (SELECT DISTINCT ON (b.id) ...), cost AS (...), rev AS (...), m AS (SELECT p.region, 100 * SUM(...) FILTER (...) / SUM(rev.rev) FILTER (...) AS q2, ... AS q3 FROM shipments s JOIN rev ... JOIN cost ... JOIN ports p ON ... WHERE ... GROUP BY p.region) SELECT region, round(q2, 1), round(q3, 1), round(q3 - q2, 1) FROM m ORDER BY q3 - q2, region`
````


**Tạo `content/tickets/ch12/ch12-02.md`:**
````markdown
---
id: ch12-02
chapter: 12
title: Giá mua châu Âu tăng, giá bán có theo kịp?
title_en: Europe buy rates rose; did sell rates keep up?
from: { name: Đặng Hà, dept: Sales }
difficulty: 4
beat: develop
format: faded
requires: [window_lag, correlated_value, cte, date_bucket, join]
grants: []
tables: [quotations, rate_contracts, ports]
ordered: true
scene: { kind: quote }
columns:
  - { vi: "Cảng đến", en: "Destination port" }
  - { vi: "Quý", en: "Quarter" }
  - { vi: "Giá bán trung bình (USD/container)", en: "Average sell rate (USD per container)" }
  - { vi: "Giá mua trung bình (USD/container)", en: "Average buy rate (USD per container)" }
  - { vi: "Giá mua tăng so với quý trước (%)", en: "Buy rate change on the previous quarter (%)" }
  - { vi: "Giá bán tăng so với quý trước (%)", en: "Sell rate change on the previous quarter (%)" }
starter: |
  WITH q AS (
    SELECT p.name AS port, date_trunc('quarter', q.quote_date)::date AS quarter,
      AVG(q.sell_usd) AS sell,
      AVG((SELECT r.buy_usd FROM rate_contracts r
           WHERE r.pol = q.pol AND r.pod = q.pod AND r.container_type = q.container_type
             AND q.quote_date BETWEEN r.valid_from AND r.valid_to)) AS buy
    FROM quotations q
    JOIN ports p ON p.code = q.pod
    WHERE p.region = 'Europe' AND q.quote_date >= '2026-04-01' AND q.quote_date < '2026-10-01'
    GROUP BY 1, 2
  )
  SELECT port, quarter, round(sell, 2), round(buy, 2),
    round(100 * (buy - LAG(buy) OVER (___)) / LAG(buy) OVER (___), 1),
    round(100 * (sell - LAG(sell) OVER (___)) / LAG(sell) OVER (___), 1)
  FROM q
  ORDER BY port, quarter
reflect:
  q: { vi: "Nếu bỏ PARTITION BY trong OVER, dòng quý 2 của Hamburg sẽ so với gì?", en: "Without PARTITION BY inside OVER, what would Hamburg's Q2 row be compared with?" }
  options:
    - { vi: "Với dòng quý 3 của Antwerp, dòng đứng ngay trước nó: hai cảng khác nhau bị so với nhau", en: "With Antwerp's Q3 row, the row just before it: two different ports compared with each other" }
    - { vi: "Với quý 1 của Hamburg", en: "With Hamburg's Q1" }
    - { vi: "Không với gì, vẫn để trống", en: "Nothing, it stays empty" }
  answer: 0
  why: { vi: "Không chia nhóm thì mọi dòng nằm chung một hàng dài; dòng trước của cảng này là dòng cuối của cảng trước. PARTITION BY port làm mỗi cảng bắt đầu lại.", en: "Without groups every row sits in one long line; a port's previous row is the last row of the port before it. PARTITION BY port makes each port start again." }
wrong:
  - sql: "WITH q AS (SELECT p.name AS port, date_trunc('quarter', q.quote_date)::date AS quarter, AVG(q.sell_usd) AS sell, AVG((SELECT r.buy_usd FROM rate_contracts r WHERE r.pol = q.pol AND r.pod = q.pod AND r.container_type = q.container_type AND q.quote_date BETWEEN r.valid_from AND r.valid_to)) AS buy FROM quotations q JOIN ports p ON p.code = q.pod WHERE p.region = 'Europe' AND q.quote_date >= '2026-04-01' AND q.quote_date < '2026-10-01' GROUP BY 1, 2) SELECT port, quarter, round(sell, 2), round(buy, 2), round(100 * (buy - LAG(buy) OVER (ORDER BY port, quarter)) / LAG(buy) OVER (ORDER BY port, quarter), 1), round(100 * (sell - LAG(sell) OVER (ORDER BY port, quarter)) / LAG(sell) OVER (ORDER BY port, quarter), 1) FROM q ORDER BY port, quarter"
    vi: "Bạn chưa tách theo cảng, nên quý 2 của một cảng bị so với quý 3 của cảng đứng trước. Mỗi cảng phải so với chính nó."
    en: "You have not split by port, so one port's Q2 is compared with the Q3 of the port before it. Each port must be compared with itself."
---
Giám đốc hỏi mình một câu ngắn: hãng tàu tăng giá tuyến châu Âu từ giữa tháng 7, vậy giá mình chào khách có tăng theo không? Mình cần so giá mua và giá bán của từng cảng, quý 3 với quý 2.

Câu SQL trong editor gần xong, chỉ còn mấy chỗ trống ___. Bạn điền cho đủ rồi nộp.

## Task
Xét các báo giá gửi từ 01/04 đến hết 30/09/2026 tới ba cảng châu Âu. Với mỗi cảng đến và mỗi quý (theo ngày báo giá): giá bán trung bình trên báo giá, giá mua trung bình (giá mua của hợp đồng cước còn hiệu lực vào ngày của từng báo giá, cùng cảng đi, cảng đến và loại container), cả hai làm tròn 2 chữ số thập phân, USD mỗi container; rồi phần trăm tăng của giá mua và của giá bán so với quý trước của chính cảng đó (làm tròn 1 chữ số thập phân, tính trên trung bình chưa làm tròn; quý đầu để trống). Gửi tên cảng, quý (ngày đầu quý) và bốn số; xếp theo tên cảng, rồi theo quý.

## Hints
1. Giá mua từng báo giá là truy vấn con tra hợp đồng như bài báo giá lỗ ở chương 7; trung bình theo cảng và quý đã có trong bước có tên. Mỗi cảng phải so quý 3 với quý 2 của chính nó, nên dòng trước phải tìm trong từng cảng.
2. Cả bốn chỗ trống giống nhau: chia theo cảng, sắp theo quý.
3. `LAG(buy) OVER (PARTITION BY port ORDER BY quarter)` và `LAG(sell) OVER (PARTITION BY port ORDER BY quarter)`

## Solution
```sql
WITH q AS (
  SELECT p.name AS port, date_trunc('quarter', q.quote_date)::date AS quarter,
    AVG(q.sell_usd) AS sell,
    AVG((SELECT r.buy_usd FROM rate_contracts r
         WHERE r.pol = q.pol AND r.pod = q.pod AND r.container_type = q.container_type
           AND q.quote_date BETWEEN r.valid_from AND r.valid_to)) AS buy
  FROM quotations q
  JOIN ports p ON p.code = q.pod
  WHERE p.region = 'Europe' AND q.quote_date >= '2026-04-01' AND q.quote_date < '2026-10-01'
  GROUP BY 1, 2
)
SELECT port, quarter, round(sell, 2), round(buy, 2),
  round(100 * (buy - LAG(buy) OVER (PARTITION BY port ORDER BY quarter)) / LAG(buy) OVER (PARTITION BY port ORDER BY quarter), 1),
  round(100 * (sell - LAG(sell) OVER (PARTITION BY port ORDER BY quarter)) / LAG(sell) OVER (PARTITION BY port ORDER BY quarter), 1)
FROM q
ORDER BY port, quarter
```

# EN
The director asked me a short question: the carriers raised their Europe rates from mid-July, so did the prices we quote go up too? I need to compare buy and sell rates for each port, Q3 against Q2.

The SQL in the editor is almost done; only a few ___ blanks are left. Fill them in, then submit.

## Task
Take the quotes sent from 1 April to 30 September 2026 inclusive to the three European ports. For each destination port and each quarter (by quote date): the average sell rate on the quotes, the average buy rate (the buy rate of the freight contract in force on each quote's date, for the same port of loading, destination port and container type), both rounded to 2 decimal places, USD per container; then the percent increase of the buy rate and of the sell rate on that same port's previous quarter (rounded to 1 decimal place, computed from the unrounded averages; empty for the first quarter). Send the port name, the quarter (its first day) and the four figures; sorted by port name, then quarter.

## Hints
1. Each quote's buy rate is a subquery that looks up the contract, as in the below-cost quotes task of chapter 7; the averages per port and quarter are already in the named step. Each port must compare its Q3 with its own Q2, so the previous row has to be found within each port.
2. All four blanks are the same: split by port, ordered by quarter.
3. `LAG(buy) OVER (PARTITION BY port ORDER BY quarter)` and `LAG(sell) OVER (PARTITION BY port ORDER BY quarter)`
````


**Tạo `content/tickets/ch12/ch12-03.md`:**
````markdown
---
id: ch12-03
chapter: 12
title: Phí lưu container tăng đột biến ở khách nào?
title_en: Which customers' D&D fees jumped?
from: { name: Võ Thu, dept: CS }
difficulty: 4
beat: develop
requires: [cte, conditional_agg, coalesce, date_math, join]
grants: []
tables: [container_events, containers, shipments, customers, free_time_terms]
ordered: true
scene: { kind: chat }
columns:
  - { vi: "Tên khách hàng", en: "Customer name" }
  - { vi: "Ngày vượt quý 2", en: "Overrun days in Q2" }
  - { vi: "Ngày vượt quý 3", en: "Overrun days in Q3" }
  - { vi: "Phí quý 2 (USD)", en: "Q2 fee (USD)" }
  - { vi: "Phí quý 3 (USD)", en: "Q3 fee (USD)" }
reflect:
  q: { vi: "Đơn giá mỗi ngày vượt đã tăng 20% từ 01/07/2026 cho mọi khách. Với khách đứng đầu bảng, phí tăng vì đơn giá hay vì số ngày?", en: "The daily rate rose 20% from 1 July 2026 for every customer. For the customer at the top of the table, did the fee rise because of the rate or the days?" }
  options:
    - { vi: "Vì số ngày: từ không ngày nào vượt lên hàng trăm ngày; đơn giá chỉ thêm 20%", en: "The days: from no overrun at all to hundreds of days; the rate only added 20%" }
    - { vi: "Vì đơn giá, số ngày gần như không đổi", en: "The rate; the days barely changed" }
    - { vi: "Không biết được nếu chỉ có số ngày và số phí", en: "There is no way to tell from days and fees alone" }
  answer: 0
  why: { vi: "Tách một con số thành các thành phần (số ngày × đơn giá) cho biết thành phần nào đổi. Đây là bước kiểm tra chéo của cuộc điều tra.", en: "Splitting a figure into its parts (days × rate) shows which part moved. That is the cross-check step of the investigation." }
wrong:
  - sql: "WITH t AS (SELECT container_id, max(event_time) FILTER (WHERE event = 'DISCHARGED') AS discharged, max(event_time) FILTER (WHERE event = 'EMPTY_RETURNED') AS returned FROM container_events GROUP BY container_id), o AS (SELECT s.customer_id, t.returned, t.returned::date - t.discharged::date - f.free_days AS over, f.usd_per_day FROM t JOIN containers c ON c.id = t.container_id JOIN shipments s ON s.id = c.shipment_id JOIN free_time_terms f ON f.customer_id = s.customer_id AND t.returned::date BETWEEN f.valid_from AND f.valid_to WHERE s.direction = 'IMPORT' AND t.returned >= '2026-04-01' AND t.returned < '2026-10-01'), k AS (SELECT customer_id, COALESCE(SUM(over) FILTER (WHERE returned < '2026-07-01'), 0) AS d2, COALESCE(SUM(over) FILTER (WHERE returned >= '2026-07-01'), 0) AS d3, COALESCE(SUM(over * usd_per_day) FILTER (WHERE returned < '2026-07-01'), 0) AS f2, COALESCE(SUM(over * usd_per_day) FILTER (WHERE returned >= '2026-07-01'), 0) AS f3 FROM o WHERE over > 0 GROUP BY customer_id) SELECT cu.name, k.d2, k.d3, k.f2, k.f3 FROM k JOIN customers cu ON cu.id = k.customer_id WHERE k.f3 - k.f2 > 1000 ORDER BY k.f3 - k.f2 DESC, cu.name"
    vi: "Bạn chọn điều khoản theo ngày trả rỗng. Điều khoản phải là điều khoản còn hiệu lực vào ngày dỡ hàng: container dỡ cuối tháng 6 vẫn tính theo đơn giá cũ."
    en: "You pick the terms by the empty-return date. The terms must be those in force on the discharge date: a container discharged at the end of June still uses the old rate."
---
Kế toán vừa báo phí lưu container quá hạn (D&D) quý 3 tăng mạnh, và mấy khách bắt đầu gọi lên phàn nàn hóa đơn. Mình muốn biết phí tăng ở khách nào, và tăng vì khách giữ container lâu hơn hay vì đơn giá cao hơn, trước khi trả lời họ.

## Task
Dùng cùng cách tính như bài ngày vượt của kế toán ở chương 10: container hàng nhập đã trả rỗng; ngày vượt là ngày trả rỗng trừ ngày dỡ hàng (ngày lịch) trừ số ngày miễn phí; số ngày miễn phí và đơn giá mỗi ngày vượt (USD) lấy theo điều khoản của khách còn hiệu lực vào ngày dỡ hàng; container không vượt thì không tính. Phí của một container là ngày vượt nhân đơn giá. Theo quý của ngày trả rỗng, khách nào có phí quý 3/2026 cao hơn phí quý 2/2026 quá 1.000 USD? Khách không có ngày vượt trong quý nào thì quý đó tính 0. Gửi tên khách, ngày vượt quý 2, ngày vượt quý 3, phí quý 2 và phí quý 3; mức tăng phí lớn nhất lên đầu, bằng nhau thì xếp theo tên khách theo thứ tự chữ cái.

## Hints
1. Mỗi container một dòng (ngày dỡ, ngày trả rỗng), rồi ngày vượt và phí theo điều khoản đúng ngày dỡ, rồi gom theo khách với hai cột cho mỗi quý. So hai quý trên cùng một dòng nên đếm có điều kiện như chương 5 là gọn nhất.
2. Điều khoản: `t.discharged::date BETWEEN f.valid_from AND f.valid_to`. Một quý: `COALESCE(SUM(over * usd_per_day) FILTER (WHERE returned < '2026-07-01'), 0)`. Chỉ lấy container trả rỗng từ `'2026-04-01'` đến trước `'2026-10-01'`.
3. `WITH t AS (...), o AS (SELECT s.customer_id, t.returned, ... AS over, f.usd_per_day FROM t JOIN ... WHERE ...), k AS (SELECT customer_id, COALESCE(SUM(over) FILTER (...), 0) AS d2, ... FROM o WHERE over > 0 GROUP BY customer_id) SELECT cu.name, k.d2, k.d3, k.f2, k.f3 FROM k JOIN customers cu ON ... WHERE k.f3 - k.f2 > 1000 ORDER BY k.f3 - k.f2 DESC, cu.name`

## Solution
```sql
WITH t AS (
  SELECT container_id,
    max(event_time) FILTER (WHERE event = 'DISCHARGED') AS discharged,
    max(event_time) FILTER (WHERE event = 'EMPTY_RETURNED') AS returned
  FROM container_events
  GROUP BY container_id
), o AS (
  SELECT s.customer_id, t.returned,
    t.returned::date - t.discharged::date - f.free_days AS over, f.usd_per_day
  FROM t
  JOIN containers c ON c.id = t.container_id
  JOIN shipments s ON s.id = c.shipment_id
  JOIN free_time_terms f ON f.customer_id = s.customer_id
    AND t.discharged::date BETWEEN f.valid_from AND f.valid_to
  WHERE s.direction = 'IMPORT'
    AND t.returned >= '2026-04-01' AND t.returned < '2026-10-01'
), k AS (
  SELECT customer_id,
    COALESCE(SUM(over) FILTER (WHERE returned < '2026-07-01'), 0) AS d2,
    COALESCE(SUM(over) FILTER (WHERE returned >= '2026-07-01'), 0) AS d3,
    COALESCE(SUM(over * usd_per_day) FILTER (WHERE returned < '2026-07-01'), 0) AS f2,
    COALESCE(SUM(over * usd_per_day) FILTER (WHERE returned >= '2026-07-01'), 0) AS f3
  FROM o
  WHERE over > 0
  GROUP BY customer_id
)
SELECT cu.name, k.d2, k.d3, k.f2, k.f3
FROM k
JOIN customers cu ON cu.id = k.customer_id
WHERE k.f3 - k.f2 > 1000
ORDER BY k.f3 - k.f2 DESC, cu.name
```

# EN
Accounting has just reported that Q3 detention and demurrage (D&D) fees jumped, and some customers have started calling to complain about their invoices. Before I answer them, I want to know which customers' fees went up, and whether that is because they kept containers longer or because the rate is higher.

## Task
Use the same calculation as accounting's overrun task in chapter 10: import containers returned empty; overrun days are the empty-return date minus the discharge date (calendar dates) minus the free days; the free days and the daily overrun rate (USD) come from the customer's terms in force on the discharge date; a container that did not go over does not count. A container's fee is its overrun days times the rate. By the quarter of the empty-return date, which customers have a Q3 2026 fee more than 1,000 USD above their Q2 2026 fee? A customer with no overrun days in a quarter counts 0 for that quarter. Send the customer name, Q2 overrun days, Q3 overrun days, Q2 fee and Q3 fee; the biggest fee increase first, and on a tie, by customer name alphabetically.

## Hints
1. One row per container (discharge, empty return), then the overrun and fee under the terms in force on the discharge day, then group by customer with two columns per quarter. Comparing two quarters on one row is neatest with conditional counting, as in chapter 5.
2. Terms: `t.discharged::date BETWEEN f.valid_from AND f.valid_to`. One quarter: `COALESCE(SUM(over * usd_per_day) FILTER (WHERE returned < '2026-07-01'), 0)`. Only containers returned from `'2026-04-01'` up to before `'2026-10-01'`.
3. `WITH t AS (...), o AS (SELECT s.customer_id, t.returned, ... AS over, f.usd_per_day FROM t JOIN ... WHERE ...), k AS (SELECT customer_id, COALESCE(SUM(over) FILTER (...), 0) AS d2, ... FROM o WHERE over > 0 GROUP BY customer_id) SELECT cu.name, k.d2, k.d3, k.f2, k.f3 FROM k JOIN customers cu ON ... WHERE k.f3 - k.f2 > 1000 ORDER BY k.f3 - k.f2 DESC, cu.name`
````


**Tạo `content/tickets/ch12/ch12-04.md`:**
````markdown
---
id: ch12-04
chapter: 12
title: Bảng điểm bồi thường theo hãng vận chuyển
title_en: The claims scorecard by carrier
from: { name: Hoàng Khánh, dept: Ops }
difficulty: 4
beat: twist
requires: [cast, scalar_subquery, left_join, cte, aggregate, group_by]
grants: []
tables: [claims, shipments, carriers]
ordered: true
scene: { kind: chat }
columns:
  - { vi: "Hãng vận chuyển", en: "Carrier" }
  - { vi: "Số lô đã đến", en: "Shipments arrived" }
  - { vi: "Số claim", en: "Claims" }
  - { vi: "Claim trên 100 lô", en: "Claims per 100 shipments" }
  - { vi: "Gấp mấy lần trung bình các hãng", en: "Times the carriers' average" }
  - { vi: "Tổng giá trị claim (USD)", en: "Total claim value (USD)" }
reflect:
  q: { vi: "Vì sao tính số claim trên 100 lô mà không xếp hạng theo số claim?", en: "Why compute claims per 100 shipments instead of ranking by the number of claims?" }
  options:
    - { vi: "Hãng chở nhiều lô tự nhiên có nhiều claim hơn; chia cho số lô mới so được các hãng với nhau", en: "A carrier that moves more shipments naturally gets more claims; dividing by shipments makes carriers comparable" }
    - { vi: "Vì số claim là chữ, không xếp được", en: "Because claim counts are text and cannot be sorted" }
    - { vi: "Không có lý do, hai cách cho cùng thứ tự", en: "No reason, both give the same order" }
  answer: 0
  why: { vi: "Như tỷ lệ hủy ở ví dụ đầu chương: so tỷ lệ, không so số tuyệt đối, khi hai bên có quy mô khác nhau.", en: "Like the cancellation rate in the chapter's first example: compare rates, not raw counts, when the two sides differ in size." }
wrong:
  - sql: "WITH s AS (SELECT carrier_id, count(*) AS n FROM shipments WHERE ata >= '2026-01-01' AND ata < '2026-10-01' GROUP BY carrier_id), k AS (SELECT s.carrier_id, count(*) AS claims, SUM(c.amount_usd) AS usd FROM claims c JOIN shipments s ON s.id = c.shipment_id WHERE s.ata >= '2026-01-01' AND s.ata < '2026-10-01' GROUP BY s.carrier_id), r AS (SELECT ca.name, s.n, COALESCE(k.claims, 0) AS claims, COALESCE(k.claims, 0) * 100 / s.n AS rate, COALESCE(k.usd, 0) AS usd FROM carriers ca JOIN s ON s.carrier_id = ca.id LEFT JOIN k ON k.carrier_id = ca.id) SELECT name, n, claims, round(rate, 2), round(rate / (SELECT AVG(rate) FROM r), 2), usd FROM r ORDER BY rate DESC, name"
    vi: "Tỷ lệ của bạn bị chia số nguyên nên mất phần lẻ (6,01 thành 6). Đổi một vế sang số thập phân trước khi chia."
    en: "Your rate uses integer division, so the decimals are lost (6.01 becomes 6). Turn one side into a decimal number before dividing."
---
Phòng Ops họp với các hãng vận chuyển cuối năm. Mình nghe nói lô đi với một hãng hay bị claim (hàng hư, thiếu, trễ), nhưng cảm giác thì không mang vào phòng họp được. Mình cần bảng điểm có số.

## Task
Xét các lô đã đến nơi (có ngày đến thực tế) từ 01/01 đến hết 30/09/2026, theo hãng vận chuyển của lô. Với mỗi hãng có lô như vậy: số lô, số claim của các lô đó, số claim trên 100 lô (làm tròn 2 chữ số thập phân), tỷ lệ đó gấp mấy lần trung bình cộng tỷ lệ của các hãng (làm tròn 2 chữ số thập phân, tính trên tỷ lệ chưa làm tròn), và tổng giá trị claim (USD). Hãng không có claim nào vẫn phải có mặt với số claim 0. Gửi tên hãng và năm số; tỷ lệ cao nhất lên đầu, bằng nhau thì xếp theo tên hãng theo thứ tự chữ cái.

## Hints
1. Đếm lô theo hãng và đếm claim theo hãng riêng, rồi ghép vào danh mục hãng sao cho hãng không có claim vẫn còn. Mức trung bình các hãng là một con số tính từ chính bảng tỷ lệ đó.
2. Claim nối lô qua `c.shipment_id = s.id`, hãng là `s.carrier_id`. Tỷ lệ: `COALESCE(k.claims, 0) * 100.0 / s.n` (số thập phân, không chia số nguyên). Trung bình: `(SELECT AVG(rate) FROM r)`.
3. `WITH s AS (...), k AS (...), r AS (SELECT ca.name, s.n, COALESCE(k.claims, 0) AS claims, ... AS rate, COALESCE(k.usd, 0) AS usd FROM carriers ca JOIN s ON ... LEFT JOIN k ON ...) SELECT name, n, claims, round(rate, 2), round(rate / (SELECT AVG(rate) FROM r), 2), usd FROM r ORDER BY rate DESC, name`

## Solution
```sql
WITH s AS (
  SELECT carrier_id, count(*) AS n
  FROM shipments
  WHERE ata >= '2026-01-01' AND ata < '2026-10-01'
  GROUP BY carrier_id
), k AS (
  SELECT s.carrier_id, count(*) AS claims, SUM(c.amount_usd) AS usd
  FROM claims c
  JOIN shipments s ON s.id = c.shipment_id
  WHERE s.ata >= '2026-01-01' AND s.ata < '2026-10-01'
  GROUP BY s.carrier_id
), r AS (
  SELECT ca.name, s.n, COALESCE(k.claims, 0) AS claims,
    COALESCE(k.claims, 0) * 100.0 / s.n AS rate, COALESCE(k.usd, 0) AS usd
  FROM carriers ca
  JOIN s ON s.carrier_id = ca.id
  LEFT JOIN k ON k.carrier_id = ca.id
)
SELECT name, n, claims, round(rate, 2), round(rate / (SELECT AVG(rate) FROM r), 2), usd
FROM r
ORDER BY rate DESC, name
```

# EN
Ops is meeting the carriers at year end. I hear that shipments with one carrier keep getting claims (damage, shortage, delay), but a feeling is not something I can take into the meeting. I need a scorecard with numbers.

## Task
Take the shipments that arrived (with an actual arrival date) from 1 January to 30 September 2026 inclusive, by the shipment's carrier. For each carrier with such shipments: the number of shipments, the number of claims on them, the claims per 100 shipments (rounded to 2 decimal places), how many times that rate is the plain average of the carriers' rates (rounded to 2 decimal places, from the unrounded rates), and the total claim value (USD). A carrier with no claim must still appear, with 0 claims. Send the carrier name and the five figures; highest rate first, and on a tie, by carrier name alphabetically.

## Hints
1. Count shipments per carrier and claims per carrier separately, then attach both to the carrier list so that a carrier without claims stays. The carriers' average is one number computed from that same table of rates.
2. Claims join shipments through `c.shipment_id = s.id`, the carrier is `s.carrier_id`. Rate: `COALESCE(k.claims, 0) * 100.0 / s.n` (a decimal, no integer division). Average: `(SELECT AVG(rate) FROM r)`.
3. `WITH s AS (...), k AS (...), r AS (SELECT ca.name, s.n, COALESCE(k.claims, 0) AS claims, ... AS rate, COALESCE(k.usd, 0) AS usd FROM carriers ca JOIN s ON ... LEFT JOIN k ON ...) SELECT name, n, claims, round(rate, 2), round(rate / (SELECT AVG(rate) FROM r), 2), usd FROM r ORDER BY rate DESC, name`
````


**Tạo `content/tickets/ch12/ch12-05.md`:**
````markdown
---
id: ch12-05
chapter: 12
title: Doanh thu quý 3 của khách bị nhập hai lần
title_en: Q3 revenue of customers entered twice
from: { name: Nguyễn Quang, dept: Finance }
difficulty: 3
beat: rest
requires: [string_fn, self_join, cte, left_join, coalesce]
grants: []
tables: [customers, invoices]
ordered: true
scene: { kind: ledger }
columns:
  - { vi: "Tên khách (bản chính)", en: "Customer name (main record)" }
  - { vi: "Tên khách (bản trùng)", en: "Customer name (duplicate record)" }
  - { vi: "Doanh thu bản chính (VND)", en: "Revenue on the main record (VND)" }
  - { vi: "Doanh thu bản trùng (VND)", en: "Revenue on the duplicate record (VND)" }
  - { vi: "Doanh thu sau khi gộp (VND)", en: "Revenue once merged (VND)" }
reflect:
  q: { vi: "Doanh thu toàn công ty quý 3 có bị tính trùng vì khách bị nhập hai lần không?", en: "Is the company's Q3 revenue double counted because some customers were entered twice?" }
  options:
    - { vi: "Không: mỗi hóa đơn chỉ thuộc một mã khách; cái sai là doanh thu của một khách bị chia ra hai dòng, nên khách đó trông nhỏ hơn thật", en: "No: each invoice belongs to one customer record; what is wrong is that one customer's revenue is split over two rows, so the customer looks smaller than it is" }
    - { vi: "Có, mỗi hóa đơn của khách trùng bị cộng hai lần", en: "Yes, every invoice of a duplicated customer is counted twice" }
    - { vi: "Có, nhưng chỉ khi khách có lô hủy", en: "Yes, but only when the customer has cancelled shipments" }
  answer: 0
  why: { vi: "Kiểm tra chéo trước khi trình: tổng không sai, nhưng xếp hạng khách và báo cáo theo khách thì sai cho tới khi gộp hai mã.", en: "A cross-check before presenting: the total is right, but customer rankings and per-customer reports stay wrong until the two records are merged." }
wrong:
  - sql: "WITH rev AS (SELECT customer_id, SUM(amount_vnd) AS rev FROM invoices WHERE issue_date >= '2026-07-01' AND issue_date < '2026-10-01' GROUP BY customer_id) SELECT a.name, b.name, ra.rev, rb.rev, ra.rev + rb.rev FROM customers a JOIN customers b ON b.name = regexp_replace(a.name, '^Công ty (TNHH MTV|TNHH|CP) ', '') || ' Co., Ltd' JOIN rev ra ON ra.customer_id = a.id JOIN rev rb ON rb.customer_id = b.id ORDER BY 5 DESC, a.name"
    vi: "Bạn nối doanh thu bằng phép nối thường, nên cặp nào có một bản không xuất hóa đơn trong quý 3 thì mất khỏi danh sách. Giữ mọi cặp và ghi 0 cho bản không có doanh thu."
    en: "You attach revenue with a plain join, so a pair where one record has no invoice in Q3 drops out. Keep every pair and write 0 for a record with no revenue."
---
Trước khi trình hội đồng quản trị, mình phải chắc báo cáo doanh thu theo khách không lệch. Năm ngoái mình đã tìm ra các khách bị nhập hai lần với hai cách viết tên. Quý 3 thì sao?

## Task
Dùng cách ghép cặp như lần dọn dữ liệu ở chương 6: bản trùng có tên bằng tên bản chính bỏ phần loại hình công ty đứng đầu (Công ty TNHH MTV, Công ty TNHH, Công ty CP), thêm đuôi tiếng Anh "Co., Ltd". Với mỗi cặp: doanh thu quý 3/2026 (tổng hóa đơn bán có ngày xuất từ 01/07 đến hết 30/09/2026, đồng) ghi dưới bản chính, dưới bản trùng, và tổng hai bản. Bản không có hóa đơn nào trong quý ghi 0. Gửi tên bản chính, tên bản trùng và ba số tiền; tổng lớn nhất lên đầu, bằng nhau thì xếp theo tên bản chính theo thứ tự chữ cái.

## Hints
1. Ghép cặp bằng cách nối bảng khách với chính nó qua tên đã chuẩn hóa. Doanh thu quý 3 cộng sẵn theo mã khách trong một bước có tên, rồi gắn vào từng bản sao cho bản không có doanh thu vẫn còn.
2. `customers a JOIN customers b ON b.name = regexp_replace(a.name, '^Công ty (TNHH MTV|TNHH|CP) ', '') || ' Co., Ltd'`. Doanh thu: `LEFT JOIN rev ra ON ra.customer_id = a.id` và tương tự cho `b`, rồi `COALESCE(ra.rev, 0)`.
3. `WITH rev AS (SELECT customer_id, SUM(amount_vnd) AS rev FROM invoices WHERE ... GROUP BY customer_id) SELECT a.name, b.name, COALESCE(ra.rev, 0), COALESCE(rb.rev, 0), COALESCE(ra.rev, 0) + COALESCE(rb.rev, 0) FROM customers a JOIN customers b ON ... LEFT JOIN rev ra ON ... LEFT JOIN rev rb ON ... ORDER BY 5 DESC, a.name`

## Solution
```sql
WITH rev AS (
  SELECT customer_id, SUM(amount_vnd) AS rev
  FROM invoices
  WHERE issue_date >= '2026-07-01' AND issue_date < '2026-10-01'
  GROUP BY customer_id
)
SELECT a.name, b.name, COALESCE(ra.rev, 0), COALESCE(rb.rev, 0),
  COALESCE(ra.rev, 0) + COALESCE(rb.rev, 0)
FROM customers a
JOIN customers b ON b.name = regexp_replace(a.name, '^Công ty (TNHH MTV|TNHH|CP) ', '') || ' Co., Ltd'
LEFT JOIN rev ra ON ra.customer_id = a.id
LEFT JOIN rev rb ON rb.customer_id = b.id
ORDER BY 5 DESC, a.name
```

# EN
Before I present to the board, I have to be sure the revenue-by-customer report is not skewed. Last year you found the customers entered twice under two spellings. What about Q3?

## Task
Pair the records as in the data clean-up of chapter 6: the duplicate's name is the main record's name without its leading company-type prefix (the Vietnamese words for "company" followed by TNHH MTV, TNHH or CP), plus the English ending "Co., Ltd". For each pair: the Q3 2026 revenue (total of sales invoices issued from 1 July to 30 September 2026 inclusive, VND) recorded under the main record, under the duplicate, and for both together. A record with no invoice in the quarter counts 0. Send the main name, the duplicate name and the three amounts; the largest total first, and on a tie, by main name alphabetically.

## Hints
1. Pair the records by joining the customers table to itself on the cleaned name. Total the Q3 revenue per customer record in a named step first, then attach it to each record so that a record without revenue stays.
2. `customers a JOIN customers b ON b.name = regexp_replace(a.name, '^Công ty (TNHH MTV|TNHH|CP) ', '') || ' Co., Ltd'`. Revenue: `LEFT JOIN rev ra ON ra.customer_id = a.id` and the same for `b`, then `COALESCE(ra.rev, 0)`.
3. `WITH rev AS (SELECT customer_id, SUM(amount_vnd) AS rev FROM invoices WHERE ... GROUP BY customer_id) SELECT a.name, b.name, COALESCE(ra.rev, 0), COALESCE(rb.rev, 0), COALESCE(ra.rev, 0) + COALESCE(rb.rev, 0) FROM customers a JOIN customers b ON ... LEFT JOIN rev ra ON ... LEFT JOIN rev rb ON ... ORDER BY 5 DESC, a.name`
````


**Tạo `content/tickets/ch12/ch12-06.md`:**
````markdown
---
id: ch12-06
chapter: 12
title: "Đánh giá thăng tiến: ba nghi vấn về lợi nhuận quý 3"
title_en: "Promotion review: three suspects behind the Q3 profit"
from: { name: Trần An, dept: Management }
difficulty: 5
beat: boss
requires: [multi_cte, distinct_on, conditional_agg, case_when, date_math, join]
grants: []
tables: [vendor_bills, exchange_rates, invoices, shipments, ports, container_events, containers, free_time_terms, claims, carriers]
ordered: false
columns:
  - [{ vi: "Biên lãi gộp quý 3 (%)", en: "Q3 gross margin (%)" }, { vi: "Biên lãi gộp quý 2 (%)", en: "Q2 gross margin (%)" }, { vi: "Thay đổi (điểm phần trăm)", en: "Change (percentage points)" }]
  - [{ vi: "Lãi gộp châu Âu mất đi (VND)", en: "Europe gross profit lost (VND)" }]
  - [{ vi: "Phí D&D quý 3 của khách mã 1 (VND)", en: "Q3 D&D fees of customer 1 (VND)" }]
  - [{ vi: "Claim quý 3 của Blue Anchor Lines (VND)", en: "Q3 claims of Blue Anchor Lines (VND)" }]
conclusion:
  question: "So ba con số ở bước 2, 3 và 4: nghi vấn nào là nguyên nhân chính làm lợi nhuận quý 3/2026 giảm, và vì sao?"
  options:
    - "Giá bán tuyến châu Âu không theo kịp giá mua: khoản lãi mất đi lớn gấp nhiều lần hai nghi vấn kia, và là khoản duy nhất nằm ngay trong biên lãi gộp"
    - "Phí D&D của khách mã 1: tăng từ 0 lên hơn một tỷ đồng chỉ trong một quý"
    - "Claim của Blue Anchor Lines: tỷ lệ claim của hãng gần gấp ba trung bình các hãng"
  answer: 0
conclusion_en:
  question: "Compare the three figures of steps 2, 3 and 4: which suspect is the main cause of the lower Q3 2026 profit, and why?"
  options:
    - "Europe sell rates did not keep up with buy rates: the profit lost is several times the other two, and it is the only one inside the gross margin itself"
    - "Customer 1's D&D fees: up from 0 to over a billion dong in a single quarter"
    - "Blue Anchor Lines' claims: its claim rate is nearly three times the carriers' average"
---
Đây là buổi đánh giá thăng tiến cuối cùng của năm. Hội đồng quản trị hỏi vì sao lợi nhuận quý 3/2026 giảm. Ba phòng đưa ba nghi vấn: Pricing nghi giá bán tuyến châu Âu, Kế toán nghi phí lưu container quá hạn (D&D) của khách lớn nhất, Ops nghi bồi thường (claim) của một hãng tàu. Mỗi nghi vấn cần một con số cùng đơn vị (đồng) để so. Làm đúng cả bốn bước và trả lời đúng câu kết luận, chính bạn sẽ trình bày trước hội đồng.

Ở bước 1 và 2, doanh thu, chi phí và biên lãi gộp tính như bài biên lợi nhuận theo vùng: lô đặt chỗ từ 01/04 đến hết 30/09/2026 có cả hóa đơn bán và hóa đơn nhà cung cấp; chi phí quy ra đồng theo tỷ giá gần nhất vào hoặc trước ngày hóa đơn, làm tròn đến đồng từng hóa đơn; quý theo ngày đặt chỗ; vùng theo cảng đầu bên kia. Ở bước 3 và 4, số tiền USD quy ra đồng theo tỷ giá USD ngày 30/09/2026.

## Step 1: Biên lãi gộp toàn công ty
Một dòng: biên lãi gộp quý 3, biên lãi gộp quý 2 và thay đổi (quý 3 trừ quý 2, tính trên hai số chưa làm tròn), cả ba làm tròn 1 chữ số thập phân.
```sql
WITH rate AS (
  SELECT DISTINCT ON (b.id) b.shipment_id, ROUND(b.amount * r.vnd_per_unit) AS cost_vnd
  FROM vendor_bills b
  JOIN exchange_rates r ON r.currency = b.currency AND r.rate_date <= b.bill_date
  ORDER BY b.id, r.rate_date DESC
), cost AS (
  SELECT shipment_id, SUM(cost_vnd) AS cost FROM rate GROUP BY shipment_id
), rev AS (
  SELECT shipment_id, SUM(amount_vnd) AS rev FROM invoices GROUP BY shipment_id
), m AS (
  SELECT
    100 * SUM(rev.rev - cost.cost) FILTER (WHERE s.booking_date >= '2026-07-01')
        / SUM(rev.rev) FILTER (WHERE s.booking_date >= '2026-07-01') AS q3,
    100 * SUM(rev.rev - cost.cost) FILTER (WHERE s.booking_date < '2026-07-01')
        / SUM(rev.rev) FILTER (WHERE s.booking_date < '2026-07-01') AS q2
  FROM shipments s
  JOIN rev ON rev.shipment_id = s.id
  JOIN cost ON cost.shipment_id = s.id
  WHERE s.booking_date >= '2026-04-01' AND s.booking_date < '2026-10-01'
)
SELECT round(q3, 1), round(q2, 1), round(q3 - q2, 1)
FROM m
```

## Step 2: Nghi vấn của Pricing: giá bán tuyến châu Âu
Nếu vùng châu Âu giữ được biên lãi gộp của quý 2, quý 3 sẽ lãi thêm bao nhiêu? Một dòng: doanh thu châu Âu quý 3 nhân biên lãi gộp châu Âu quý 2 (dạng tỷ lệ, chưa làm tròn), trừ lãi gộp thực tế của châu Âu quý 3; làm tròn đến đồng.
```sql
WITH rate AS (
  SELECT DISTINCT ON (b.id) b.shipment_id, ROUND(b.amount * r.vnd_per_unit) AS cost_vnd
  FROM vendor_bills b
  JOIN exchange_rates r ON r.currency = b.currency AND r.rate_date <= b.bill_date
  ORDER BY b.id, r.rate_date DESC
), cost AS (
  SELECT shipment_id, SUM(cost_vnd) AS cost FROM rate GROUP BY shipment_id
), rev AS (
  SELECT shipment_id, SUM(amount_vnd) AS rev FROM invoices GROUP BY shipment_id
), eu AS (
  SELECT
    SUM(rev.rev) FILTER (WHERE s.booking_date < '2026-07-01') AS rev2,
    SUM(rev.rev - cost.cost) FILTER (WHERE s.booking_date < '2026-07-01') AS gp2,
    SUM(rev.rev) FILTER (WHERE s.booking_date >= '2026-07-01') AS rev3,
    SUM(rev.rev - cost.cost) FILTER (WHERE s.booking_date >= '2026-07-01') AS gp3
  FROM shipments s
  JOIN rev ON rev.shipment_id = s.id
  JOIN cost ON cost.shipment_id = s.id
  JOIN ports p ON p.code = CASE WHEN s.direction = 'EXPORT' THEN s.pod ELSE s.pol END
  WHERE p.region = 'Europe'
    AND s.booking_date >= '2026-04-01' AND s.booking_date < '2026-10-01'
)
SELECT round(rev3 * gp2 / rev2 - gp3)
FROM eu
```

## Step 3: Nghi vấn của Kế toán: phí D&D của khách mã 1
Tính như bài phí lưu container của chăm sóc khách hàng: container hàng nhập của khách mã 1 trả rỗng từ 01/07 đến hết 30/09/2026; ngày vượt là ngày trả rỗng trừ ngày dỡ hàng trừ số ngày miễn phí, phí là ngày vượt nhân đơn giá, điều khoản lấy theo ngày dỡ hàng; container không vượt thì không tính. Một dòng: tổng phí quy ra đồng, làm tròn đến đồng.
```sql
WITH t AS (
  SELECT container_id,
    max(event_time) FILTER (WHERE event = 'DISCHARGED') AS discharged,
    max(event_time) FILTER (WHERE event = 'EMPTY_RETURNED') AS returned
  FROM container_events
  GROUP BY container_id
), o AS (
  SELECT t.returned::date - t.discharged::date - f.free_days AS over, f.usd_per_day
  FROM t
  JOIN containers c ON c.id = t.container_id
  JOIN shipments s ON s.id = c.shipment_id
  JOIN free_time_terms f ON f.customer_id = s.customer_id
    AND t.discharged::date BETWEEN f.valid_from AND f.valid_to
  WHERE s.direction = 'IMPORT' AND s.customer_id = 1
    AND t.returned >= '2026-07-01' AND t.returned < '2026-10-01'
)
SELECT round(SUM(over * usd_per_day) * (
  SELECT vnd_per_unit FROM exchange_rates WHERE currency = 'USD' AND rate_date = '2026-09-30'))
FROM o
WHERE over > 0
```

## Step 4: Nghi vấn của Ops: claim của Blue Anchor Lines
Tổng giá trị các claim có ngày claim từ 01/07 đến hết 30/09/2026 của những lô do hãng Blue Anchor Lines vận chuyển. Một dòng: tổng quy ra đồng, làm tròn đến đồng.
```sql
SELECT round(SUM(c.amount_usd) * (
  SELECT vnd_per_unit FROM exchange_rates WHERE currency = 'USD' AND rate_date = '2026-09-30'))
FROM claims c
JOIN shipments s ON s.id = c.shipment_id
JOIN carriers ca ON ca.id = s.carrier_id
WHERE ca.name = 'Blue Anchor Lines'
  AND c.claim_date >= '2026-07-01' AND c.claim_date < '2026-10-01'
```

## Hints
1. Bước 1 là bài biên lợi nhuận theo vùng, gộp cho cả công ty. Bước 2 chỉ giữ vùng châu Âu và đặt hai quý cạnh nhau, rồi lấy lãi lẽ ra có (doanh thu quý 3 nhân biên quý 2) trừ lãi thực có. Bước 3 là bài phí D&D, chỉ cho khách mã 1 và quý 3. Bước 4 cộng claim của một hãng.
2. Hai quý trên một dòng: `SUM(...) FILTER (WHERE s.booking_date < '2026-07-01')`. Bước 2: `round(rev3 * gp2 / rev2 - gp3)`. Tỷ giá ngày 30/09/2026: `(SELECT vnd_per_unit FROM exchange_rates WHERE currency = 'USD' AND rate_date = '2026-09-30')`.
3. `SELECT round(SUM(c.amount_usd) * (SELECT vnd_per_unit FROM exchange_rates WHERE ...)) FROM claims c JOIN shipments s ON ... JOIN carriers ca ON ... WHERE ca.name = 'Blue Anchor Lines' AND ...`

# EN
This is the last promotion review of the year. The board asks why Q3 2026 profit fell. Three departments brought three suspects: Pricing suspects the Europe sell rates, Accounting suspects the detention and demurrage (D&D) fees of the biggest customer, and Ops suspects the claims of one carrier. Each suspect needs a figure in the same unit (VND) to compare. Get all four steps and the conclusion right, and you will present to the board yourself.

In steps 1 and 2, revenue, cost and gross margin are computed as in the margin-by-region task: shipments booked from 1 April to 30 September 2026 inclusive that have both a sales invoice and a supplier bill; cost converted to VND at the latest rate on or before the bill date, rounded to the dong per bill; the quarter by booking date; the region by the far-end port. In steps 3 and 4, USD amounts are converted to VND at the USD rate of 30 September 2026.

## Step 1: The company's gross margin
One row: the Q3 gross margin, the Q2 gross margin and the change (Q3 minus Q2, from the two unrounded margins), all three rounded to 1 decimal place.

## Step 2: Pricing's suspect: the Europe sell rates
Had the Europe region kept its Q2 gross margin, how much more would Q3 have earned? One row: Europe's Q3 revenue times Europe's Q2 gross margin (as a ratio, unrounded), minus Europe's actual Q3 gross profit; rounded to the dong.

## Step 3: Accounting's suspect: customer 1's D&D fees
Computed as in customer service's D&D fee task: import containers of customer number 1 returned empty from 1 July to 30 September 2026 inclusive; overrun days are the empty-return date minus the discharge date minus the free days, the fee is the overrun days times the rate, the terms are those in force on the discharge date; a container that did not go over does not count. One row: the total fee converted to VND, rounded to the dong.

## Step 4: Ops' suspect: the claims of Blue Anchor Lines
The total value of the claims dated from 1 July to 30 September 2026 inclusive on the shipments carried by Blue Anchor Lines. One row: the total converted to VND, rounded to the dong.

## Hints
1. Step 1 is the margin-by-region task, totalled for the whole company. Step 2 keeps only the Europe region and puts both quarters side by side, then takes the profit it should have made (Q3 revenue times the Q2 margin) minus the profit it made. Step 3 is the D&D fee task, for customer 1 and Q3 only. Step 4 adds up one carrier's claims.
2. Two quarters on one row: `SUM(...) FILTER (WHERE s.booking_date < '2026-07-01')`. Step 2: `round(rev3 * gp2 / rev2 - gp3)`. The rate of 30 September 2026: `(SELECT vnd_per_unit FROM exchange_rates WHERE currency = 'USD' AND rate_date = '2026-09-30')`.
3. `SELECT round(SUM(c.amount_usd) * (SELECT vnd_per_unit FROM exchange_rates WHERE ...)) FROM claims c JOIN shipments s ON ... JOIN carriers ca ON ... WHERE ca.name = 'Blue Anchor Lines' AND ...`
````


- [ ] **Step 4: Chạy toàn bộ, xác nhận PASS rồi commit**

Run: `npm test && npx tsc --noEmit`
Expected: tất cả PASS; `contentProblems` rỗng; ô KPI `q3margin` ra một dòng số (16,6).

```bash
git add content/tickets/ch12 tests/scene.test.ts tests/home.test.ts
git commit -m "content: chapter 12 Year-end investigation (6 tickets, VI + EN)"
```

---

### Task 7: Ngân sách, CLAUDE.md, kiểm toàn bộ, checklist Edge cho orchestrator

**Files:**
- Modify: `scripts/check-budget.mjs`, `CLAUDE.md`

- [ ] **Step 1: Ngân sách nhóm `tickets` (S7)**

**Sửa `scripts/check-budget.mjs`** — thay:
```js
  ['main', /^index-.*\.js$/, 270], // Plan 3 Task 1: ticket markdown moved to a lazy chunk (L41); was 300 after Plan 2
  ['tickets', /^ticketSources-/, 70], // all ticket markdown, one lazy chunk fetched at boot (src/content.ts): 37 KB after ch1–6, 64 KB after ch7–9
  ['css', /^index-.*\.css$/, 20],
```
bằng:
```js
  ['main', /^index-.*\.js$/, 270], // Plan 3 Task 1: ticket markdown moved to a lazy chunk (L41); was 300 after Plan 2
  ['tickets', /^ticketSources-/, 110], // all ticket markdown, one lazy chunk fetched at boot (src/content.ts): 37 KB after ch1–6, 64 KB after ch7–9, 99 KB after ch10–12 (Plan 4 S7, L40 rule)
  ['css', /^index-.*\.css$/, 20],
```


- [ ] **Step 2: Ghi luật mới vào CLAUDE.md**

**Sửa `CLAUDE.md`** — thay:
````markdown
- `src/db/client.ts` (`DbClient`) queues queries and posts one at a time, so the 5s timeout measures only the running query. `statement_timeout` does not work in PGlite, so a query over 5s terminates the worker and boots a fresh one. Errors are typed and carry no user-facing text (`SqlError` with `position`/`code`/`hint` for Postgres errors only, `WorkerTaskError` for non-Postgres worker failures such as an asset download or lazy chunk import, `QueryTimeoutError`, `DbRestartError`, `DbFailedError`); the UI translates them by class in `errorText()` (`src/ui/feedback.ts`). Do not switch to `PGliteWorker`: its multi-tab leader election breaks `terminate()`.
- `src/grader.ts` runs the player's SQL and the step's Solution on the same DB and compares by column position, as a row multiset (or sequence when `ordered: true`), with all numbers rounded to 2 decimals. PGlite returns `numeric` as strings and `date` as `Date`.
- Tickets are markdown files in `content/tickets/chN/`, loaded by `src/content.ts` and parsed by `src/tickets.ts`. Ticket markdown is one lazy chunk (`src/ticketSources.ts`, budget group `tickets`; L41): `main.ts` awaits `loadContent()` (banner `content.loading`/`content.failed`) before the first render, but creates the `DbClient` before that await so the DB boots in parallel (its callbacks only record state until `uiReady`), and `tests/setup.ts` does the same for Vitest, so `loadTickets()`/`loadTicketTemplates()` stay synchronous but throw if called earlier. Never read tickets at module top level (`ui/modes.ts` builds its map on first use). VI text comes first, then a `# EN` block with the same sections (no SQL; SQL and frontmatter exist once). Frontmatter: `title_en`, `conclusion_en` (boss), `ordered`, `columns:` (one `{ vi, en }` business label per result column for the shape card, L25: never the Solution's column name; bosses have one list per step), `starter:`, `variants:`. Optional `## Task` holds the concrete request. Normal tickets have one `## Solution`; boss tickets have `## Step N: …` sections plus a `conclusion`. Use `textOf(ticket, lang)` for any player-facing ticket text. Copy `content/TEMPLATE.md` to start a ticket. Learning-method fields (Plan 2, curriculum §5): `format: worked | faded | open` (undefined = open); worked tickets add `## Example` after `## Task` (a ```sql block with `-- ①` markers in the VI part only, one prose paragraph per marker in VI and EN; `brief.ts` shows it with "Copy into the editor"); faded tickets have `___` blanks in `starter` (Submit refuses them without counting a wrong submit, `BLANK` in `src/tickets.ts`); `reflect: { q, options, answer, why }` (bilingual, shown in the Recap, never saved); `wrong: [{ sql, vi, en }]` (`work.ts` shows the explanation when the player's wrong result equals one of them, else the trap of the skill the ticket teaches). Bosses use none of these. Prompts (body, Task, step text) are business questions with no table/column names, SQL keywords, status codes or backticks (`docs/team/problem-design.md` §1). `tests/content.test.ts` enforces backticks, uppercase SQL keywords, coded values and snake_case names; table names are plain English words, so those are review-only.
````
bằng:
````markdown
- `src/db/client.ts` (`DbClient`) queues queries and posts one at a time, so the 5s timeout measures only the running query. `statement_timeout` does not work in PGlite, so a query over 5s terminates the worker and boots a fresh one. Errors are typed and carry no user-facing text (`SqlError` with `position`/`code`/`hint` for Postgres errors only, `WorkerTaskError` for non-Postgres worker failures such as an asset download or lazy chunk import, `QueryTimeoutError`, `DbRestartError`, `DbFailedError`); the UI translates them by class in `errorText()` (`src/ui/feedback.ts`). Do not switch to `PGliteWorker`: its multi-tab leader election breaks `terminate()`.
- `src/grader.ts` runs the player's SQL and the step's Solution on the same DB and compares by column position, as a row multiset (or sequence when `ordered: true`), with all numbers rounded to 2 decimals. PGlite returns `numeric` as strings and `date` as `Date`. Chapter 11 also grades the plan (`src/planCheck.ts`, node types and planner cost from `EXPLAIN (FORMAT JSON)` without ANALYZE, never milliseconds): a step with `plan: { index: t }` must read table `t` through an index once the result is right; a step with `lab:` is an index lab, where the editor holds one `CREATE INDEX` and the worker (`runLab`, `src/db/run.ts`, request kind `lab`) explains the step's Solution before and after it inside one transaction that is always rolled back. The worker re-checks the statement (`isCreateIndex`) and runs it with `query()`, never `exec()`.
- Tickets are markdown files in `content/tickets/chN/`, loaded by `src/content.ts` and parsed by `src/tickets.ts`. Ticket markdown is one lazy chunk (`src/ticketSources.ts`, budget group `tickets`; L41): `main.ts` awaits `loadContent()` (banner `content.loading`/`content.failed`) before the first render, but creates the `DbClient` before that await so the DB boots in parallel (its callbacks only record state until `uiReady`), and `tests/setup.ts` does the same for Vitest, so `loadTickets()`/`loadTicketTemplates()` stay synchronous but throw if called earlier. Never read tickets at module top level (`ui/modes.ts` builds its map on first use). VI text comes first, then a `# EN` block with the same sections (no SQL; SQL and frontmatter exist once). Frontmatter: `title_en`, `conclusion_en` (boss), `ordered`, `columns:` (one `{ vi, en }` business label per result column for the shape card, L25: never the Solution's column name; bosses have one list per step), `starter:`, `variants:`. Optional `## Task` holds the concrete request. Normal tickets have one `## Solution`; boss tickets have `## Step N: …` sections plus a `conclusion`. Use `textOf(ticket, lang)` for any player-facing ticket text. Copy `content/TEMPLATE.md` to start a ticket. Learning-method fields (Plan 2, curriculum §5): `format: worked | faded | open` (undefined = open); worked tickets add `## Example` after `## Task` (a ```sql block with `-- ①` markers in the VI part only, one prose paragraph per marker in VI and EN; `brief.ts` shows it with "Copy into the editor"); faded tickets have `___` blanks in `starter` (Submit refuses them without counting a wrong submit, `BLANK` in `src/tickets.ts`); `reflect: { q, options, answer, why }` (bilingual, shown in the Recap, never saved); `wrong: [{ sql, vi, en }]` (`work.ts` shows the explanation when the player's wrong result equals one of them, else the trap of the skill the ticket teaches). Bosses use none of these. Prompts (body, Task, step text) are business questions with no table/column names, SQL keywords, status codes or backticks (`docs/team/problem-design.md` §1). `tests/content.test.ts` enforces backticks, uppercase SQL keywords, coded values and snake_case names; table names are plain English words, so those are review-only.
````

**Sửa `CLAUDE.md`** — thay:
```markdown
- Chapters 7–9 (Plan 3): ch7 Solutions use subqueries but no CTE; window functions wait for ch10. Money is VND in `invoices`/`payments` and USD/EUR in `vendor_bills`; convert with the latest `exchange_rates` row on or before the date (rates exist only on working days). Every ticket that rounds money says where (per row or only the final figure).
- Every ticket ships VI + EN (release gate: 0 tickets without `# EN`). Code spans must be identical in VI and EN, EN must contain no Vietnamese diacritics, and `columns:` must have one label per Solution column (`tests/content.test.ts`).
```
bằng:
```markdown
- Chapters 7–9 (Plan 3): ch7 Solutions use subqueries but no CTE; window functions wait for ch10. Money is VND in `invoices`/`payments` and USD/EUR in `vendor_bills`; convert with the latest `exchange_rates` row on or before the date (rates exist only on working days). Every ticket that rounds money says where (per row or only the final figure).
- Chapters 10–12 (Plan 4): ch10 teaches window functions (`window_rank`, `window_lag`, `window_agg`); a ranking ticket states its tie rule in words (shared rank and skipped ranks = RANK). Ch11 grades plans (above); `tests/planCheck.test.ts` lists for each plan step a slower way to the same result that must fail, and index proposals that must fail the lab. Ch12 teaches no skill. "Days" between two `event_time` timestamps are calendar-date differences (`a::date - b::date`).
- Every ticket ships VI + EN (release gate: 0 tickets without `# EN`). Code spans must be identical in VI and EN, EN must contain no Vietnamese diacritics, and `columns:` must have one label per Solution column (`tests/content.test.ts`).
```

**Sửa `CLAUDE.md`** — thay:
```markdown
- New senders go into `content/people.yml` first (real role, `tables:`; `employee` = id in the seed's `employees`, or null).
- Story hooks the later chapters rely on are listed at the top of `seed.sql` (chapters 4–6: at the head of the Plan 2 block); do not change them without updating tickets and `tests/seed.test.ts`. That test pins the md5 of the six chapter 1–3 tables, so a new block that re-rolls them fails. Plan 2 tables: `shipment_events` (log starts 2026-07-01), `trucking_orders`, `cfs_receipts`, `hs_codes`, `duties_taxes`, `customs_declarations` (from 2026-06-01, `amended_from_id` chains up to 2 steps, exports only), `incoterms`. Plan 3 tables (hooks at the head of the Plan 3 block, which starts with `ANALYZE` so the seed planner has statistics): `exchange_rates` (working days 2026-03-02..10-30), `rate_contracts` (exactly one buy rate per lane/container type/day from 2026-04-01; Europe +40% from 2026-07-15), `quotations` (from 2026-04-01; `shipment_id` NULL = never booked), `invoices`/`payments` (bookings from 2026-04-01), `vendor_bills`, `master_bills`/`house_bills` (sea exports sailing from 2026-05-01). The test pins the md5 of all 13 chapter 1–6 tables and the Q3 Europe margin drop that chapter 12 relies on. There is no `charges` table (Plan 3 R2).
- Project skills live in `.claude/skills/` (`web-games`, `level-design`, `save-systems`).
```
bằng:
```markdown
- New senders go into `content/people.yml` first (real role, `tables:`; `employee` = id in the seed's `employees`, or null).
- Story hooks the later chapters rely on are listed at the top of `seed.sql` (chapters 4–6: at the head of the Plan 2 block); do not change them without updating tickets and `tests/seed.test.ts`. That test pins the md5 of the six chapter 1–3 tables, so a new block that re-rolls them fails. Plan 2 tables: `shipment_events` (log starts 2026-07-01), `trucking_orders`, `cfs_receipts`, `hs_codes`, `duties_taxes`, `customs_declarations` (from 2026-06-01, `amended_from_id` chains up to 2 steps, exports only), `incoterms`. Plan 3 tables (hooks at the head of the Plan 3 block, which starts with `ANALYZE` so the seed planner has statistics): `exchange_rates` (working days 2026-03-02..10-30), `rate_contracts` (exactly one buy rate per lane/container type/day from 2026-04-01; Europe +40% from 2026-07-15), `quotations` (from 2026-04-01; `shipment_id` NULL = never booked), `invoices`/`payments` (bookings from 2026-04-01), `vendor_bills`, `master_bills`/`house_bills` (sea exports sailing from 2026-05-01). The test pins the md5 of all 13 chapter 1–6 tables and the Q3 Europe margin drop that chapter 12 relies on. There is no `charges` table (Plan 3 R2). Plan 4 tables (hooks at the head of the Plan 4 block): `free_time_terms` (two periods per customer, rate +20% from 2026-07-01), `container_events` (~109k rows for containers sailing from 2025-05-01; bulk-loaded, then its primary and foreign keys are added; deliberately no index on `container_id`, that is the index lab; kept under 150k rows because its ANALYZE reads every row so plan costs are identical on every boot), `claims`; then the prebuilt indexes `shipments(booking_date)` and `shipments(customer_id)` and `ANALYZE`. Seed stop rule after Plan 4: 2.0 s in Node (Plan 4 S5).
- Project skills live in `.claude/skills/` (`web-games`, `level-design`, `save-systems`).
```


- [ ] **Step 3: Kiểm toàn bộ**

Run: `npm test && npx tsc --noEmit && npm run build && node scripts/check-budget.mjs`
Expected: tất cả PASS (1390 test trên bản replay `2ddc893`); mọi nhóm ngân sách `ok` (`main ≈ 259 / 270`, `tickets ≈ 99 / 110`, `worker ≈ 142 / 160`).

- [ ] **Step 4: Commit**

```bash
git add scripts/check-budget.mjs CLAUDE.md
git commit -m "docs: CLAUDE.md notes for Plan 4 (plan grading, index lab, chapter 10-12 seed); tickets budget 110 KB"
```

- [ ] **Step 5: Checklist Edge (orchestrator; origin riêng, không đụng save ở :5173)**

Chạy ở cổng khác để có `localStorage` riêng: `npx vite --port 5174 --strictPort` (và `npm run build && npx vite preview --port 5175 --strictPort` cho mục 1), mở trên **Edge**. Không mở `:5173`.

Tạo file `save-ch9-done.json` (ngoài repo) rồi nạp bằng **Nhập tiến độ** (menu `⋯` của topbar): như file `save-ch6-done.json` của Plan 3 Task 8, thêm vào `completed` mọi id `ch7-01` … `ch9-06`.

Kiểm (mỗi dòng ✓/✗, ghi số đo):
1. **Boot (bản build, :5175):** từ lúc tải lại trang tới nút Chạy sẵn sàng, so với bản build của HEAD trước Plan 4 (cùng máy, L44 đo 8,3–8,6 s). Vượt 1,5 lần thì ghi `decision-log.md`, **không** cắt dữ liệu ticket đang dùng.
2. **Trang chủ:** ch10 "Đang học", ch11–12 khóa; ô KPI mới khóa; thẻ "Ôn đầu chương".
3. **ch10-01 (ví dụ mẫu):** thẻ ①–④, chạy ví dụ ra 16 dòng. Nộp bản ROW_NUMBER → lời giải thích riêng. Nộp đúng → hoạt cảnh `yard`, câu ngẫm lại. Tab Thứ tự thực thi → "Query có window function — xem tab EXPLAIN".
4. **ch10-02 (làm cùng):** Nộp khi còn `___` → "Còn 2 chỗ trống…".
5. **ch11-01:** chấm "mới" trên tab EXPLAIN; chạy ví dụ ra 4 dòng kế hoạch; nộp `WHERE customer_id + 0 = 42` → "Kết quả đúng, nhưng kế hoạch … đọc toàn bộ bảng shipments", tab EXPLAIN mở; nộp đúng → qua.
6. **ch11-04 (phòng thí nghiệm):** thẻ "Câu truy vấn cần tăng tốc" thay thẻ kết quả mong đợi, nút EXPLAIN ẩn; Chạy `CREATE INDEX ON container_events (event_time, container_id)` → hai dòng Trước/Sau, Sau vẫn Seq Scan; Nộp → giải thích `lab.seqScan`; Nộp `SELECT 1` → `lab.notIndex`; Nộp `CREATE INDEX ON container_events (container_id, event_time)` → qua; chạy `SELECT indexname FROM pg_indexes WHERE tablename = 'container_events'` → chỉ còn khóa chính.
7. **ch11-06 bước 3** (lab trong cột mốc) qua với `CREATE INDEX ON container_events (container_id)`; câu kết luận; xong → bậc "phụ trách hiệu năng dữ liệu".
8. **ch12-06:** 4 bước, câu kết luận; xong → màn thăng tiến **Trưởng nhóm Phân tích**, ô KPI "Biên lợi nhuận gộp quý 3/2026" hiện `16,6 %`.
9. **Luyện tập** từ chip `index_design` → biến thể container khác (phòng thí nghiệm chạy trong Luyện tập).
10. Màn hẹp 375 px và dark mode: thẻ lab, bảng 6 cột ch12-02/ch12-04 cuộn ngang trong bảng, không tràn trang.

Ghi kết quả vào `docs/team/decision-log.md` (dòng L-số mới) cùng S1–S14. **Cần user xem:** S2 (luật dừng seed 2,0 s), S3 (không làm DB dựng sẵn), S6 (phòng thí nghiệm một editor), S7 (ngân sách `tickets` 110 KB), số đo boot.

---

## Đã kiểm khi viết plan (2026-11-17)

- Viết trên bản `git archive` của HEAD **`2ddc893`** (`node_modules` nối bằng junction), sau đó sinh plan từ chính các file đã chạy và **replay** toàn bộ plan (đọc các khối `Tạo` / `Sửa … — thay/bằng` / `Thêm vào cuối`, mỗi khối "thay" phải khớp đúng một lần) lên một bản `git archive` sạch khác: 82 khối áp được, không khối nào lệch; `tsc` sạch, **1390 test PASS**, `npm run build` sạch, `check-budget` mọi nhóm `ok` (`main` 259/270, `tickets` 99/110, `worker` 142/160). Replay dừng sau Task 1, 2, 3, 4, 5, 6 trên bản sạch riêng: `tsc` sạch và mọi test PASS (1095, 1100, 1100, 1192, 1302, 1383 test). Các số này đo trước khi thêm 7 test cuối (BitmapAnd của ch11-06, 2 lỗi hàm cửa sổ, 4 test chương 11 của `workRace`); bản replay toàn bộ ở trên đã gồm chúng.
- Chạy từng Solution (mọi bước, mọi biến thể), ví dụ mẫu và câu `wrong:` trên PGlite: số dòng như bảng "Số dòng kết quả mong đợi", không kết quả rỗng; mọi câu `wrong:` có dòng và khác Solution ở mọi biến thể; mọi biến thể cho kết quả khác nhau từng đôi.
- 17 đáp án đúng viết kiểu khác qua `grade()` (và qua `checkPlan` khi bước có `plan:`); xem mục "Số dòng kết quả mong đợi".
- `tests/planCheck.test.ts`: mọi Solution có `plan:` đạt ở mọi biến thể; 6 cách viết chậm (cộng 0 vào cột, `date_trunc`, `upper(ref)`, `to_char`, ép `::text`) cho **cùng kết quả** mà không đạt; 3 chỉ mục sai không qua phòng thí nghiệm; `runLab` từ chối `DROP TABLE` và câu ghép, chỉ mục không còn sau khi chạy; JSON `EXPLAIN` của mọi Solution giống hệt trên hai DB vừa seed.
- md5 của 21 bảng ch1–9 trước và sau Plan 4 giống hệt (ghim trong `tests/seed.test.ts`); chỉ mục và `ANALYZE` không đổi dữ liệu.
- Móc ch12 (test Plan 3) vẫn đúng: châu Âu 19,5 % → 7,0 %, vùng khác lệch dưới 1,5 điểm.
- Chưa kiểm trên trình duyệt: checklist Edge ở Task 7 Step 5 (orchestrator, cổng riêng), gồm đo thời gian khởi động.
