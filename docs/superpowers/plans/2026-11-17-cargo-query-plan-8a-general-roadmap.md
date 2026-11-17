# BoonData — Plan 8a: Phần Chung đầy đủ (bài học 38 kỹ năng, drill trên `lab`, lộ trình DA nâng cao) và Lộ trình có trạng thái

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** phần "General đủ kiến thức cho mọi luồng" và "roadmap bài tập đầy đủ" của v11 (L58), gồm v5 N2 + N3 + N4 + N5 + N5b, v4 P4 và v6 F7:
- **Bài học nhanh cho cả 38 kỹ năng** (`content/lessons.yml`: 11 có sẵn + 27 mới ở Phụ lục B, ví dụ trên Logistics như 11 bài cũ).
- **Schema `lab`** (chuỗi cửa hàng trung tính, Phụ lục A, ~15k dòng) seed lười trong worker; mỗi request mang `schema`, worker đặt `SET LOCAL search_path` trong `BEGIN … ROLLBACK`.
- **114 drill** (3 mỗi kỹ năng: làm theo khung, tự làm, bẫy), Phụ lục C.
- **Lộ trình DA nâng cao:** 20 nút mỗi nút có bài học + 4 bài trên `lab` (làm theo khung, tự làm, bẫy, thử thách: 80 bài) cho A1–A10, B1–B7, C1–C3 (A10/B5/B7/C2 "một phần" có thêm link), và 8 nút D chỉ link, Phụ lục D.
- **Lộ trình có trạng thái:** `#/learn` liệt kê mọi module/nút → bài học → drill với trạng thái; trang kỹ năng `#/learn/skill/<id>`, trang nút `#/learn/adv/<node>`; workspace drill; Luyện SQL ôn bằng drill.
- **Domain ↔ Chung:** mỗi chương Logistics hiện "Dựa vào" (kỹ năng/nút Chung, bấm được, xanh khi đã học); mỗi trang kỹ năng/nút hiện "Áp dụng ở Logistics, chương n".
- **Không ngõ cụt:** mọi đường Chung (Lộ trình → module → bài học → drill → link domain) đi được tới cuối; không có "đợt sau"/"sắp có" trên đường Chung đã phát hành (test Task 12).

**Ngoài phạm vi:** domain Finance/E-commerce (Plan 9), Save v4, Sandbox trên `lab` (v5 §C.3 YAGNI), chuyển ví dụ 11 bài học cũ sang `lab` (D-G4 tùy chọn: không làm), chuyên đề nâng cao trong Logistics, chấm thời gian.

**Architecture:**
- **DB:** `src/db/lab.sql` (Phụ lục A, file riêng, **không** nối vào `seed.sql`: md5 ghim và luật seed của Logistics không bị chạm). Worker giữ `Set` schema đã seed; request kind mới `ensure` (seed `lab` lần đầu, hạn 30 s như `import`, không tính vào hạn 5 s của query). Mọi request `run | explain | steps | lab` mang `schema?: 'lab'`; vắng = schema của domain (Plan 7 `GAME_SCHEMA`). `runSandboxed`/`runExplain`/`runLab` nhận `{ schema }` và chạy `SET LOCAL search_path TO lab` ngay sau `BEGIN` (tên schema chỉ lấy từ hằng `SCHEMAS`, không bao giờ từ chuỗi người chơi). `DbClient` nhớ schema đã `ensure` và gửi lại sau `restart()` trước query kế tiếp.
- **Nội dung Chung:** `content/general/sql.yml` (drill theo kỹ năng) + `content/general/adv.yml` (nút nâng cao: bài học + drill + link), một chunk lười `src/generalSources.ts` (nhóm ngân sách `general`), **chỉ tải khi cần** (trang Chung, ôn tập, gợi ý drill ở Trang chủ), không tải lúc khởi động. Parser thuần `src/general.ts` (`parseDrills`, `parseAdv`, `drillTicket()` đổi một drill thành `Ticket` tổng hợp để `work.ts` chấm như việc thật).
- **Tiến độ:** `src/learn.ts` (thuần, có test): trạng thái drill/kỹ năng/module/nút từ Save; không trường Save mới: id drill `g-…` vào `completed` (v5 D-S1, đã duyệt L55); `Known` nhận mọi id khớp `DRILL_ID = /^g-[a-z0-9-]+$/` (không cần tải chunk Chung để đọc Save).
- **UI Chung** (`src/ui/learnView.ts`, `src/ui/drillBrief.ts`) là **chunk lười** nạp bằng `import()` khi vào `#/learn…` hoặc mở drill; nhận mọi thứ của `main` qua tham số `ctx` (tiêm phụ thuộc), chỉ `import type` từ module của `main` (Plan 6 U3: `import()` thường làm Rolldown tách module dùng chung ra chunk preload).
- **Workspace drill:** session mode mới `{ kind: 'drill'; ticket: Ticket; drill: Drill }` trong `#shell` (cùng mẫu `lane`): editor, Chạy/Nộp, tab Kết quả/Cột/ER trên `lab`, brief = đề + thẻ kết quả mong đợi (không nhãn cột) + 1 gợi ý miễn phí + bài học (của kỹ năng hoặc nút) + Recap "Drill tiếp".

**Tech Stack:** như HEAD sau Plan 7. **Không thêm dependency.**

**Spec / nguồn quyết định:**
- `docs/team/decision-log.md` L53–L58 (L55: General = bài nhỏ + lộ trình nâng cao có bài thật; "làm hết theo mặc định": D-G1..G4, D-S1, D-S2, D-R1, D-R2 của v5; L58: v11).
- `docs/team/product-design-v5.md` §B.7–B.9 (save, học ở đâu cũng tính, "Dựa vào"), §C (lab, drill, Luyện SQL), §D (nút nâng cao); `product-design-v6.md` §4.4 (schema theo request, seed lười, `ensure`), §5.1 (cảnh Chung: Plan 8b); `product-design-v4.md` §C (bài học), §D (lộ trình: trạng thái, ngăn chi tiết).
- Plan 6 (U2 lessons riêng chunk, U3 ngân sách), Plan 7 (V6 Lộ trình tối thiểu, "Điểm nối cho Plan 8").
- Plan 8b (cùng đợt v11): hình đầu trang module/nhóm, cảnh bàn học, trạng thái rỗng. Plan 8a chừa chỗ (`slot`) cho các hình đó; thiếu 8b thì chỗ đó rỗng, không vỡ.

## Tiền đề (Plan 7 làm gì, nếu chưa làm thì task nào của 8a làm)

Plan viết trên HEAD `d312e83` (Plan 7 đã viết xong, **chưa build**). Tên dưới đây lấy từ file Plan 7; Task 0 đối chiếu với code thật sau khi Plan 7 build.

| Plan 8a cần | Plan 7 (theo plan) | Nếu HEAD chưa có |
|---|---|---|
| Bảng game trong schema `logistics`, `GAME_SCHEMA` (`src/domains.ts`), `SANDBOX_SETUP_SQL` = `CREATE SCHEMA IF NOT EXISTS sandbox; SET search_path = logistics, sandbox;` (`src/db/import.ts`) | Plan 7 Task 1 | Task 1 vẫn làm được với game ở `public`: `SCHEMAS = { game: GAME_SCHEMA ?? 'public', lab: 'lab' }`; không sửa F1 |
| `runLab` so `pg_class.relname` (V16) | Plan 7 Task 1 | Task 1 Step 6 làm luôn (cần cho `lab`) |
| `parseRoute(hash)` trả id trang (`'learn'`, `'practice'`, `'map'`…), `learnModuleOf(hash)`, `ROUTE_HASH`, `canonicalHash`; `#/d/logistics/map` | Plan 7 Task 5 | Dừng: 8a không dựng lại khung route. Báo orchestrator |
| Sidebar, nav cấp 1 "Lộ trình · Luyện SQL" | Plan 7 Task 6 | Như trên |
| Trang Lộ trình tối thiểu (V6: 12 module; dòng nâng cao = khóa i18n `learn.advSoon` "…đợt sau.") | Plan 7 Task 5 | Task 9 thay trang và **xóa** `learn.advSoon` (cả `vi.ts`, `en.ts`) |
| `mascot(who, pose, cls?, label?)`, `POSES` | Plan 7 Task 3 | Bỏ linh vật ở trang Chung (chỉ trang trí) |
| Luyện SQL `#/practice` là trang hub; Luyện tập/Sandbox vẫn là session mode trong `play` (V5) | Plan 7 Task 5 | Task 8 theo V5: drill ôn tập chạy như một mode trong workspace |
| Dòng chương ở Tổng quan có **một** dòng phụ "Dựa vào: …" + một viên trạng thái → `#/learn/sql/n` (F5, không chip chồng) | Plan 7 Task 10 | Task 11 chỉ làm các mục trong dòng đó bấm được + dấu ✓ |
| Trần `main` 290 (V1, chờ user) | V1 | Ngân sách `main` của 8a = **+0 KB** bất kể trần: mọi UI mới ở chunk lười |

## Decisions (D8a-1 … D8a-16, để orchestrator ghi L-số)

**Cần user xem:** D8a-3 (lab seed lười, không seed lúc mở trang), D8a-6 (drill không có nhãn cột), D8a-12 (ngân sách).

| # | Quyết định | Lý do |
|---|---|---|
| D8a-1 | **Một schema `lab`, file `src/db/lab.sql` riêng** (Phụ lục A): 16 bảng, ~15k dòng (`customers` 300, `orders` 1.428, `order_items` 4.284, `payments` 1.395, `app_events` 1.928, `fact_sales` 3.894, `dim_customer` 342, `dim_date` 730…), mỗi khối ngẫu nhiên một `setseed()`, ngày cố định, "hôm nay" 2026-10-31. Không nối vào `seed.sql` (v5 §C.1 nói nối cuối): file riêng giữ md5 ghim và luật "chỉ nối cuối" của Logistics nguyên vẹn, và cho phép seed lười. | Seed Logistics trong Node đã sát luật dừng 2,0 s (L45 S2, L46 1,9–2,4 s). `lab` đo **~190–250 ms trong Node** (scratch, PGlite 0.5.16); nối vào seed lúc khởi động sẽ vượt luật. |
| D8a-2 | **Dữ liệu `lab` bằng ASCII** (tên cửa hàng, thành phố, sản phẩm không dấu: `Hai Chau`, `Da Nang`…). | Code span VI = EN và EN không dấu (luật nội dung); giá trị dữ liệu xuất hiện trong code span của đề. |
| D8a-3 | **Seed `lab` lười** (v6 F7): worker chỉ seed khi nhận `ensure('lab')`; client gửi `ensure` khi mở bất kỳ trang `#/learn…`/`#/practice` hay drill, và sau `restart()` nếu đã từng ensure. Lần đầu: thanh "Đang chuẩn bị dữ liệu luyện tập…" (≤ ~1 s trên Edge, **ước**, Task 1 đo). Người chỉ chơi Logistics không trả giá nào. **Cần user xem.** | v6 §4.4 điểm 4–5; không tăng thời gian mở trang 10–13 s (L46, L52). |
| D8a-4 | **`schema` theo request, không theo phiên.** `SET LOCAL search_path TO lab` (không thêm `sandbox`, không thêm schema game: một tên bảng Logistics trong drill báo 42P01 thay vì chạy nhầm). Tên schema chỉ từ hằng `SCHEMAS`. | v6 §4.4 điểm 3; drill không bao giờ đọc bảng domain. |
| D8a-5 | **Drill ở YAML** (`content/general/sql.yml`, `adv.yml`), không phải markdown ticket (lệch v5 §C.2). Một drill = `id, skill|node, kind (faded|open|trap|challenge), task {vi,en}, starter?, solution, ordered?, hint {vi,en}, wrong?, plan?`. `drillTicket()` dựng `Ticket` tổng hợp (chapter 0, beat `develop`, `format` theo `kind`, `hints: [hint]`, `wrong`) để `work.ts`, grader, `wrongTipper`, chặn `___` dùng lại nguyên. | 134 bài nhỏ ở markdown = 134 file × ~20 dòng (frontmatter + `# EN`) cho đề 1–2 câu; YAML gzip ~12 KB mỗi 60 drill. Parser riêng ~60 dòng, có test. |
| D8a-6 | **Drill không có `columns:`** (nhãn cột). Thẻ "Kết quả mong đợi" của drill chỉ hiện số cột, kiểu cột và số dòng; đề nói rõ lấy cột nào theo thứ tự. **Cần user xem.** | 134 × nhãn VI/EN là khối chữ lớn mà đề 1–2 câu đã nói đủ; L25 chỉ cấm lộ tên cột Solution, không bắt buộc nhãn. |
| D8a-7 | **Đề drill được nêu tên bảng/cột trong backtick** (vd. `products`, `price_vnd`), không bao giờ nêu từ khóa SQL là đáp án (gợi ý thì được nêu khái niệm). Luật SQLISH của ticket (`problem-design.md` §1) **không** áp cho drill; test nội dung drill có luật riêng (Task 4). | Drill là luyện kỹ năng trên bộ dữ liệu lạ, không phải việc nghiệp vụ; người học cần biết bảng nào. |
| D8a-8 | **Bài học 27 kỹ năng ch4–12 dùng bảng Logistics** như 11 bài cũ (D-G4), cùng định dạng, cùng mọi luật của `tests/lessons.test.ts` (mở rộng cho mọi chương). Bài học của **nút nâng cao** dùng `lab` (`dataset: lab` ngầm định trong `adv.yml`). Thẻ bài học chạy ví dụ/Thử ngay với `schema` theo bài (`lessonSchema(l) = l.node ? 'lab' : game`), nên mở bài học Logistics trong workspace drill vẫn đúng. | Bài học hiện trong brief của ticket Logistics; chuyển sang `lab` thì ticket teach phải chạy hai schema. |
| D8a-9 | **Không trường Save mới, không tăng `SAVE_VERSION`** (v5 D-S1, L55): drill đạt → id `g-…` vào `completed`; nháp/đáp án đạt/gợi ý theo `stepKey` như ticket. `Known` nhận id khớp `DRILL_ID` bằng **mẫu**, không bằng danh sách (chunk Chung lười). Id drill bị xóa khỏi nội dung sau này: vẫn nằm trong `completed`, vô hại (không ticket nào khớp). Mọi chỗ đọc `completed` đi qua danh sách ticket/drill nên không đếm nhầm (test Task 6: `rankOf`, `nextTicket`, `derive`, tổng kết chương, KPI bỏ qua `g-`). | Lane dùng trường riêng vì id lane trùng không gian ticket; `g-` có tiền tố riêng nên không cần. |
| D8a-10 | **XP drill: +10 lần đầu đạt, 0 sau** (v5 D-G2); thử thách nút nâng cao +20 lần đầu. Gợi ý drill miễn phí. Ôn tập vẫn 0 XP. Không XP cho bài học/Thử ngay (giữ Plan 6). | Không farm XP. |
| D8a-11 | **"Đã học" một kỹ năng** = ticket `grants` nó đã xong **hoặc** ≥ 2 drill của nó đạt **hoặc** có thẻ `review` (v5 §B.8). Drill đạt (0 lần nộp sai, ≤ 1 gợi ý: `isSuccess`) nâng/tạo thẻ Leitner của kỹ năng; nút nâng cao **không** có thẻ Leitner (không có trong `skills.yml`). **Nút xong** = mọi drill + thử thách đạt. **Module xong** = mọi kỹ năng của module đã học. Nút ↗ không bao giờ tự "xong" (v5 §D.4). | Một định nghĩa, một hàm (`learnedSkills`), dùng ở Lộ trình, chip "Dựa vào", Trang chủ. |
| D8a-12 | **Ngân sách** (đo thật ở scratch, gzip -9): bài học 38 kỹ năng ≈ 8 + 20,7 = **~29 KB** → nhóm `lessons` 20 → **35**; `general` (drill + nút) đo **22,2 KB (`sql.yml`) + 40,3 KB (`adv.yml`) = ~62,5 KB** → nhóm mới **`general` 70**; `learnui` (UI Chung lười) **25**; `worker` +~4 KB (`lab.sql` ~25 KB thô) trong trần 160 hiện có. `main` **+0** (mọi UI mới lười, i18n Chung nằm trong chunk UI, xem D8a-13). **Cần user xem.** | Plan 6 U2 đã dự báo `lessons` ~28 KB cho 38 bài. Luật L40 (+5%, làm tròn). |
| D8a-13 | **Chữ UI của phần Chung nằm trong chunk `learnui`**, không trong `vi.ts`/`en.ts` của `main`: `src/i18n/learn.ts` (`{ vi: {...}, en: {...} }`, cùng kiểm placeholder/khác VI-EN của `tests/i18n.test.ts`), tra bằng `lt(key)` đọc `getLang()`. | Từ điển VI nằm trong `main` (Plan 7 V1); ~80 khóa Chung sẽ làm `main` tăng 2–3 KB. |
| D8a-14 | **Lộ trình là của 8a từ đây** (thay trang tối thiểu Plan 7 V6): track SQL 12 module, track nâng cao 4 nhóm; mở khóa mềm: nút nâng cao **đọc được luôn**, drill mở khi `needs` đã học hoặc người chơi bấm "Tôi muốn thử" (không khóa cứng, v5 §D.4: track mở sau module 9 hoặc "Đã biết SQL", còn lại khóa mềm). | Không ngõ cụt: thứ gì hiện trên Lộ trình đều bấm được tới nội dung. |
| D8a-15 | **Không "đợt sau"/"sắp có" trên đường Chung.** Nút chỉ được hiện khi nội dung của nó đã có trong `adv.yml` và qua test (Task 12 kiểm: mọi nút trong v5 §D.3 có mặt; nút `in|partial` có bài học + ≥ 3 drill + thử thách; nút `external` có ≥ 1 link). "Sắp có" chỉ còn ở domain Finance/E-com (Plan 7/9). | Yêu cầu v11. |
| D8a-16 | **Thứ tự và đường cắt cho ngày deploy:** Task 1→5 (máy + nội dung, đều có test) → Task 6–8 (tiến độ, workspace drill, Luyện SQL) → **mốc phát hành được M1**: drill chơi được từ Luyện SQL và từ trang kỹ năng → Task 9–11 (Lộ trình đầy đủ, nút nâng cao, liên kết domain) → **M2**. Hết giờ ở giữa M1–M2: phát hành M1 với Lộ trình của Plan 7 + **bỏ dòng "nâng cao đợt sau"** (ẩn track nâng cao, không hiện "đợt sau"). | L58 deploy trước ngày mai; mỗi mốc là trạng thái không ngõ cụt. |

## Đã có trên HEAD (không làm lại)

| Hạng mục | Trạng thái |
|---|---|
| `grade()`, `compareResults` (theo vị trí cột), `wrongTipper`, chặn `___` (`BLANK`) | Có. Drill dùng nguyên qua `drillTicket()`. |
| `planCheck.ts` (`plan: { index: t }`) | Có. Drill ch11 có `plan:`; Task 1 Step 7 làm cho EXPLAIN chạy trên `lab` và tính **Bitmap Heap Scan(t)** là đọc `t` qua chỉ mục (scratch: mọi drill ch11 trên `lab` ra Bitmap Heap Scan > Bitmap Index Scan hoặc Index Scan). |
| `lessons.yml` + `parseLessons` + `lessonSlot`/`openLesson` + pref `cargo-query/lessons` | Có (Plan 6, 11 bài). |
| Leitner (`src/practice.ts`: `nextCard`, `dueSkills`, `reviewQueue`, `isSuccess`) | Có. Task 8 thêm nguồn drill. |
| Session mode `lane` (mẫu cho mode `drill`), `keepsWork()` | Có. |
| `memoByKey`, `erMeta(schema)`, `loadErMetadata(run, schema)` | Có. ER/Cột của `lab` = `erMeta('lab')`. |

## Global Constraints

- Mọi ràng buộc Plan 1–7 vẫn áp dụng (PGlite 0.5.16 pin; không `innerHTML` ngoài Mermaid; mọi chữ UI qua `t()`/`lt()`, VI + EN cùng task; không "boss"/"sự cố"; không emoji; không class Tailwind ghép bằng template literal; tương phản ≥ 4,5:1).
- **Seed:** không sửa `schema.sql`/`seed.sql`; md5 ghim của `tests/seed.test.ts` không đổi. `lab.sql` có test ghim riêng (Task 1).
- **Nội dung:** chép **nguyên văn** từ Phụ lục A–D (đã chạy trên PGlite 0.5.16, xem "Đã kiểm khi viết plan"). Sửa nội dung thì chạy lại test nội dung của task đó và ghi lý do vào commit.
- **Ngân sách:** sau mỗi task sửa `src/`: `npm run build && node scripts/check-budget.mjs`; ghi `main`, `lessons`, `general`, `learnui`, `worker` vào commit. `main` không tăng quá 0,5 KB so với mốc Task 0 (mã nối: router, hook, `loadGeneral`). Vượt → dời code sang chunk lười, không nâng trần.
- **Kiểm tay:** Edge, `npm run dev -- --port 5174 --strictPort` (không `:5173`), sáng/tối, 1440/1100/375 px.
- **Kiểm thử:** không chạy hai `vitest` song song; `npx tsc --noEmit` sau mỗi thay đổi.
- **Commit:** mỗi task một commit, `git add` đúng file; message kết thúc `Claude-Session: https://claude.ai/code/session_01PwPSBV1SVDP6quEZfKN56M`.

## File Structure

```
src/db/lab.sql                 schema lab (Phụ lục A)                                                    (tạo, T1)
src/db/run.ts, worker.ts, client.ts   { schema } theo request, kind 'ensure', re-ensure sau restart     (sửa, T1)
src/domains.ts                 SCHEMAS = { game, lab }                                                   (sửa, T1)
src/planCheck.ts               Bitmap Heap Scan(t) = qua chỉ mục                                          (sửa, T1)
content/lessons.yml            + 27 bài (Phụ lục B)                                                      (sửa, T2)
content/general/sql.yml        114 drill (Phụ lục C)                                                     (tạo, T4)
content/general/adv.yml        28 nút nâng cao, 80 bài (Phụ lục D)                                               (tạo, T5)
src/general.ts                 parseDrills, parseAdv, drillTicket, DRILL_ID                              (tạo, T3)
src/generalSources.ts          import ?raw hai file YAML (chunk lười)                                    (tạo, T3)
src/learn.ts                   learnedSkills, drillState, skillState, moduleState, nodeState, appliesIn, dependsOn (tạo, T6)
src/save.ts                    Known nhận DRILL_ID                                                       (sửa, T6)
src/session.ts, src/ui/work.ts mode 'drill'                                                               (sửa, T7)
src/ui/drillBrief.ts           brief của drill (lười)                                                     (tạo, T7)
src/ui/lessonCard.ts           schema theo bài, đầu bài theo module (slot hình 8b)                        (sửa, T2, T7)
src/practice.ts, src/ui/modes.ts   ôn tập bằng drill                                                      (sửa, T8)
src/ui/learnView.ts            #/learn, /sql/<n>, /skill/<id>, /adv/<node> (lười)                         (tạo, T9, T10)
src/i18n/learn.ts              chữ UI Chung VI + EN (trong chunk learnui)                                  (tạo, T7, T9)
src/route.ts                   learn/skill, learn/adv                                                     (sửa, T9)
src/ui/homeView.ts             chip "Dựa vào" ở chương Logistics, thẻ "Hôm nay"                           (sửa, T11)
scripts/check-budget.mjs       lessons 35, general 60, learnui 25                                          (sửa, T2, T3, T7)
tests/lab.test.ts, tests/general.test.ts, tests/learn.test.ts, tests/lessons.test.ts (mở rộng), tests/route.test.ts, tests/noDeadEnds.test.ts
CLAUDE.md                      mục "Phần Chung (Plan 8a)"                                                 (sửa, T13)
```

---

### Task 0: Kiểm tiền đề và đo

- [ ] **Step 1:** `git status`, `git log --oneline -20`: Plan 7 đã vào tới đâu. Điền bảng "Tiền đề" bằng thực tế (có/không, tên hàm thật). Thiếu khung route N1 → dừng, báo orchestrator.
- [ ] **Step 2:** `npx tsc --noEmit && npm test` xanh. `npm run build && node scripts/check-budget.mjs`: ghi **M0** (`main`, `lessons`, `worker`).
- [ ] **Step 3:** Đo seed `lab` trong Node trên máy build: tạo `tests/lab.test.ts` tạm chỉ với khối "đo" của Task 1 Step 2 (sau đó giữ làm test thật). Ghi thời gian vào commit Task 1.

### Task 1: Schema `lab`, `schema` theo request, `ensure`, EXPLAIN trên `lab`

**Files:** tạo `src/db/lab.sql`, `tests/lab.test.ts`; sửa `src/db/run.ts`, `src/db/worker.ts`, `src/db/client.ts`, `src/domains.ts`, `src/planCheck.ts`, `tests/planCheck.test.ts`.

- [ ] **Step 1:** Tạo `src/db/lab.sql` = **Phụ lục A** nguyên văn.
- [ ] **Step 2: test trước** `tests/lab.test.ts`:
```ts
import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';
import lab from '../src/db/lab.sql?raw';
import { ensureSchema, runSandboxed } from '../src/db/run';
import { seededDb } from './helpers';

const count = async (db: PGlite, t: string) => Number((await runSandboxed(db, `SELECT count(*) FROM ${t}`, undefined, { schema: 'lab' })).rows[0][0]);

describe('schema lab', () => {
  it('seed lười, nhanh, đúng số dòng và các móc nội dung', async () => {
    const db = await seededDb();
    const t0 = performance.now();
    await ensureSchema(db, 'lab');
    expect(performance.now() - t0).toBeLessThan(600); // scratch: 190–250 ms
    await ensureSchema(db, 'lab'); // lần hai: không làm gì
    expect(await count(db, 'customers')).toBe(300);
    expect(await count(db, 'stores')).toBe(5);
    expect(await count(db, 'products')).toBe(30);
    expect(await count(db, 'staff')).toBe(20);
    expect(await count(db, 'store_targets')).toBe(57);
    // móc: cửa hàng 4 mở 2025-09-01, không đơn trước đó
    expect(await count(db, "orders WHERE store_id = 4 AND order_date < '2025-09-01'")).toBe(0);
    // móc: 8 đơn sỉ ngày 2026-09-09 ở cửa hàng 3; thanh toán mồ côi 99901..99908
    expect(await count(db, "orders WHERE store_id = 3 AND order_date = '2026-09-09' AND customer_id IS NULL")).toBeGreaterThanOrEqual(8);
    expect(await count(db, 'payments p WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.id = p.order_id)')).toBe(8);
    // móc: mọi khách đều có ít nhất một đơn (drill anti-join dựa vào khoảng thời gian, không "chưa từng mua")
    expect(await count(db, 'customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id)')).toBe(0);
  });

  it('md5 mỗi bảng lab cố định (đổi seed = đổi nội dung drill)', async () => {
    const db = await seededDb();
    await ensureSchema(db, 'lab');
    const tables = (await db.query<{ t: string }>("SELECT tablename AS t FROM pg_tables WHERE schemaname = 'lab' ORDER BY 1")).rows.map((r) => r.t);
    const md5: Record<string, string> = {};
    for (const t of tables) md5[t] = (await db.query<{ m: string }>(`SELECT md5(string_agg(x::text, '|' ORDER BY x::text)) AS m FROM lab.${t} x`)).rows[0].m;
    expect(md5).toMatchInlineSnapshot(); // lần chạy đầu điền snapshot; sau đó cố định
  });

  it('search_path theo request: lab không thấy bảng game, game không thấy lab, rollback trả lại', async () => {
    const db = await seededDb();
    await ensureSchema(db, 'lab');
    await expect(runSandboxed(db, 'SELECT count(*) FROM shipments', undefined, { schema: 'lab' })).rejects.toThrow(/does not exist/);
    await expect(runSandboxed(db, 'SELECT count(*) FROM order_items')).rejects.toThrow(/does not exist/);
    expect((await runSandboxed(db, 'SELECT count(*) FROM shipments')).rows.length).toBe(1);
  });
});
```
  `npx vitest run tests/lab.test.ts` → FAIL (`ensureSchema`, tham số `schema` chưa có).
- [ ] **Step 3:** `src/domains.ts` thêm:
```ts
/** Every schema a request may name. Only these strings are ever inlined into SQL (never player input). */
export const SCHEMAS = { game: GAME_SCHEMA, lab: 'lab' } as const;
export type SchemaId = keyof typeof SCHEMAS;
```
- [ ] **Step 4:** `src/db/run.ts`:
  - `runSandboxed(db, sql, maxRows = MAX_ROWS_WORKER, opts: { schema?: SchemaId } = {})`: sau `BEGIN`, nếu `opts.schema === 'lab'` thì `await db.exec('SET LOCAL search_path TO lab')`. Cùng tham số cho `runExplain`, `runLab`, và hàm đếm của tab Thứ tự thực thi.
  - `ensureSchema(db, id)`: `const seeded = new WeakMap<PGlite, Set<string>>()`; nếu chưa có: `CREATE SCHEMA lab; SET search_path TO lab;` → `exec(lab)` (import `./lab.sql?raw`) → `exec(SANDBOX_SETUP_SQL)` (Plan 7, `src/db/import.ts`: trả đường dẫn phiên về `logistics, sandbox`). Lỗi giữa chừng → `DROP SCHEMA lab CASCADE` rồi ném lại (không để schema dở).
- [ ] **Step 5:** `worker.ts`: request `{ kind: 'ensure', schema }` → `ensureSchema`; mọi request khác đọc `schema` và chuyển xuống `run.ts`. `client.ts`: `ensure(schema)` dùng hạn 30 s (như `importCsv`), nhớ `ensured: Set<SchemaId>`; sau `restart()` gửi lại `ensure` cho từng schema trong `ensured` **trước** query kế tiếp (cùng hàng đợi). `run(sql, { schema })`, `request(kind, …, { schema })` thêm trường vào message.
- [ ] **Step 6:** Nếu Plan 7 chưa làm V16: `runLab` so `pg_class.relname` thay `regclass::text`.
- [ ] **Step 7:** `planCheck.ts`: node `Bitmap Heap Scan` có `Relation Name` = t (con là `Bitmap Index Scan`) tính là đọc t qua chỉ mục. Thêm ca vào `tests/planCheck.test.ts`: `SELECT id FROM orders WHERE order_date >= '2026-10-01'` trên `lab` → đạt `plan: { index: 'orders' }`; `… WHERE extract(month FROM order_date) = 10` → không đạt.
- [ ] **Step 8: xác nhận.** `npx vitest run tests/lab.test.ts tests/planCheck.test.ts tests/seed.test.ts && npx tsc --noEmit && npm test`. Build + budget: `worker` ≤ 160, `main` +0.
- [ ] **Step 9:** Commit `feat(db): lab schema seeded lazily on ensure, search_path per request, bitmap scans count as index reads`.

### Task 2: 27 bài học nhanh ch4–12 (Phụ lục B)

**Files:** sửa `content/lessons.yml`, `tests/lessons.test.ts`, `scripts/check-budget.mjs`, `src/ui/lessonCard.ts`.

- [ ] **Step 1: test trước.** `tests/lessons.test.ts`: đổi luật "mọi kỹ năng ch1–3 có bài" thành **mọi id trong `skills.yml` có đúng một bài** (38). Mọi luật khác giữ (cue trong việc mở kỹ năng, ví dụ/Thử ngay khác Solution ở mọi biến thể, chỉ bảng đã mở, starter chưa đạt, câu sai báo lỗi hoặc khác ví dụ, code span VI = EN, EN không dấu, khái niệm ≤ 60 từ, giải thích ≤ 90 từ). Chạy → FAIL (27 kỹ năng thiếu bài).
- [ ] **Step 2:** Nối **Phụ lục B** vào cuối `content/lessons.yml` (giữ nguyên 11 bài đầu).
- [ ] **Step 3:** `lessonCard.ts`: chạy ví dụ/Thử ngay với `{ schema: lessonSchema(lesson) }` (`'game'` cho bài trong `lessons.yml`, `'lab'` cho bài của nút nâng cao, Task 10). Không đổi gì khác.
- [ ] **Step 4:** `check-budget.mjs`: `lessons` 20 → 35 (đo scratch: 29 KB; ghi chú "Plan 8a: 38 bài, ~0,75 KB/bài").
- [ ] **Step 5: xác nhận.** `npx vitest run tests/lessons.test.ts && npx tsc --noEmit && npm test`; build + budget. Kiểm tay: mở ch4-01 (save đã xong ch3): thẻ "Bài học nhanh · Tính trên ngày" mở sẵn, Chạy ví dụ ra bảng, Thử ngay chấm; ch11-02 thẻ `sargable`.
- [ ] **Step 6:** Commit `content: quick lessons for the 27 skills of chapters 4–12 (every skill now has one)`.

> Lưu ý (từ lần kiểm): bài `index_design` dùng `payments(invoice_id)` cho ví dụ để **không lộ** đáp án lab ch11-04; câu sai của `explain_read` là gõ `EXPLAIN` vào câu nộp (kết quả là văn bản kế hoạch nên Nộp sai). Ghi ở mục "Đã kiểm khi viết plan".

### Task 3: Mô hình nội dung Chung (parser thuần, chunk lười)

**Files:** tạo `src/general.ts`, `src/generalSources.ts`, `tests/general.test.ts` (phần parser); sửa `src/content.ts` (`loadGeneral()`), `scripts/check-budget.mjs`.

- [ ] **Step 1: test trước** (`tests/general.test.ts`, khối "parser"): một drill hợp lệ đọc đúng (`ordered` mặc định `false`, `starter` mặc định `undefined`); thiếu `task.en`/`solution`/`hint` → ném lỗi có id; `kind` lạ → ném; `faded` không có `___` → ném; `trap` không có `wrong` → ném; id không khớp `DRILL_ID` → ném; id trùng giữa `sql.yml` và `adv.yml` → ném; nút: `status` lạ, `in|partial` thiếu `lesson`/thiếu `challenge`, `external` thiếu `links` → ném. `drillTicket(d)` ra `Ticket` có `id = d.id`, `chapter: 0`, `tables: []`, `ordered`, `steps[0].solution = d.solution`, `hints = [d.hint]`, `format = d.kind === 'faded' ? 'faded' : 'open'`, `starter`, `wrong` và `textOf(ticket, 'en').task === d.task.en`.
- [ ] **Step 2:** `src/general.ts`:
```ts
export const DRILL_ID = /^g-[a-z0-9-]+$/;
export type DrillKind = 'faded' | 'open' | 'trap' | 'challenge';
export interface Drill { id: string; skill?: string; node?: string; kind: DrillKind; task: Bilingual; starter?: string; solution: string; ordered: boolean; hint: Bilingual; wrong: Wrong[]; plan?: { index: string } }
export type NodeStatus = 'in' | 'partial' | 'external';
export interface AdvNode { id: string; group: 'A' | 'B' | 'C' | 'D'; status: NodeStatus; title: Bilingual; why: Bilingual; needs: string[]; applies?: Bilingual; lesson?: Lesson; drills: Drill[]; links: { title: Bilingual; url: string }[] }
export function parseDrills(src: string, origin: string): Drill[]
export function parseAdv(src: string, origin: string): AdvNode[]      // lesson parsed with the same field rules as parseLessons (minus cues)
export function drillTicket(d: Drill): Ticket
```
  Bài học của nút dùng lại phần kiểm trường của `parseLessons` (tách hàm `parseLessonBody` trong `src/lessons.ts`, không đổi hành vi bài cũ). `needs` của nút chứa id kỹ năng **hoặc** id nút; test kiểm mọi id tồn tại.
- [ ] **Step 3:** `src/generalSources.ts`:
```ts
// Drills and advanced nodes (content/general/*.yml). Only src/content.ts imports this, with import(), so it is its own lazy chunk (Plan 8a D8a-12).
export { default as sqlDrills } from '../content/general/sql.yml?raw';
export { default as advNodes } from '../content/general/adv.yml?raw';
```
  `src/content.ts`: `loadGeneral(): Promise<General>` (`once()`; lỗi tải → xóa cache để lần sau thử lại, như `ensureParser`), `General = { drills: Drill[]; nodes: AdvNode[]; bySkill: Map<string, Drill[]>; byId: Map<string, Drill> }`. **Không** gọi trong `loadContent()`. `tests/setup.ts` gọi `await loadGeneral()` để test đồng bộ dùng được.
- [ ] **Step 4:** `check-budget.mjs`: `['general', /^generalSources-/, 70]` trước `rest`.
- [ ] **Step 5:** Tạo `content/general/sql.yml` và `adv.yml` rỗng (`[]`) để build chạy; nội dung ở Task 4–5. `npx vitest run tests/general.test.ts && npx tsc --noEmit`. Commit `feat(general): drill and advanced-node model, parsers, lazy content chunk`.

### Task 4: 114 drill theo kỹ năng (Phụ lục C)

**Files:** tạo nội dung `content/general/sql.yml`; mở rộng `tests/general.test.ts` (khối "nội dung").

- [ ] **Step 1: test trước** (port luật đã dùng để kiểm Phụ lục C, chạy trên DB đã `ensureSchema('lab')`, mọi câu qua `runSandboxed(…, { schema: 'lab' })`):
  - mỗi id trong `skills.yml` có **đúng 3 drill**: một `faded`, một `open`, một `trap`;
  - Solution chạy, 1–500 dòng, < 1 s; `ordered: true` ⇒ có `ORDER BY`;
  - `starter` có `___` thì không bị chạy; `starter` không có `___` (nếu có) chưa đạt;
  - mỗi `wrong.sql` báo lỗi hoặc ra kết quả khác Solution (theo `ordered`);
  - hai drill cùng kỹ năng không cùng kết quả;
  - không `CURRENT_DATE`/`now()`; code span VI = EN (task, hint, wrong); EN không dấu;
  - không câu nào chạy được khi bỏ `schema` (tức là không dùng nhầm bảng game: chạy Solution **không** có `schema: 'lab'` phải lỗi 42P01);
  - drill có `plan:` đạt `planCheck` (Task 1 Step 7) với Solution, và mọi `wrong.sql` của nó không đạt hoặc ra kết quả khác.
  Chạy → FAIL (file rỗng).
- [ ] **Step 2:** `content/general/sql.yml` = **Phụ lục C** nguyên văn (đầu file giữ chú thích định dạng).
- [ ] **Step 3: xác nhận.** `npx vitest run tests/general.test.ts && npx tsc --noEmit && npm test`; build + budget (`general` ≤ 70). Commit `content: 114 drills on the lab shop data (faded, open, trap for every skill)`.

### Task 5: Lộ trình DA nâng cao: 28 nút (Phụ lục D)

**Files:** nội dung `content/general/adv.yml`; mở rộng `tests/general.test.ts` (khối "nâng cao").

- [ ] **Step 1: test trước:** đủ 28 id `a1…a10, b1…b7, c1…c3, d1…d8` theo đúng thứ tự và `status` của v5 §D.3 (`a10`, `b5`, `b7`, `c2` = `partial`; `d*` = `external`; còn lại `in`); `in|partial`: bài học (ví dụ, Thử ngay, câu sai: luật như Task 2 nhưng trên `lab`, không có cue; khái niệm ≤ 70 từ, giải thích ≤ 90 từ — bài nút dày hơn, đo max 65/82), ≥ 3 drill gồm đúng một `challenge`, luật drill như Task 4; `partial|external`: ≥ 1 link `https://`; `needs` toàn id có thật (kỹ năng hoặc nút) và không vòng (DFS).
- [ ] **Step 2:** `content/general/adv.yml` = **Phụ lục D** nguyên văn.
- [ ] **Step 3: xác nhận** như Task 4. Commit `content: advanced DA track (20 nodes with lessons and 80 drills/challenges on lab, 8 reading nodes)`.

### Task 6: Tiến độ phần Chung (`src/learn.ts`, `Known`)

**Files:** tạo `src/learn.ts`, `tests/learn.test.ts`; sửa `src/save.ts`, `tests/save.test.ts`.

- [ ] **Step 1: test trước** `tests/learn.test.ts` (dữ liệu giả nhỏ + nội dung thật):
  - `parseSave` giữ id `g-where-1` trong `completed` mà không cần tải nội dung Chung; giữ nháp/`graded`/`hintsUsed` của `g-…`; vẫn bỏ id lạ không có tiền tố.
  - `learnedSkills(save, tickets, skillIds)`: ticket `grants` xong ⇒ học; 2 drill của kỹ năng ⇒ học; 1 drill ⇒ chưa; có thẻ `review` ⇒ học. **Không cần chunk Chung:** kỹ năng của drill suy từ id (`skillOfDrill('g-conditional-agg-3')` = `conditional_agg`: bỏ `g-` và `-<số>`, đổi `-` thành `_`, chỉ nhận id có trong `skills.yml`; id nút `g-a1-2` → `undefined`). Test: mọi id trong `sql.yml` suy đúng `skill` của nó. Nhờ vậy Tổng quan Logistics (Task 11) tô dấu ✓ mà không tải `general`.
  - `drillState(id)` ∈ `todo | done`; `skillState(skill)` = `{ lesson: seen?, drills: n/3, learned, mastered (box ≥ 4) }`; `moduleState(n)` = kỹ năng của chương n; `nodeState(node)` = `{ done: mọi drill đạt, open: needs đã học }` (nút `external` không bao giờ `done`).
  - `appliesIn(skill)` = chương Logistics có ticket `requires ∪ grants` chứa kỹ năng (vd. `where` → 1, 2, 3, …); `dependsOn(chapter)` = `requires ∪ grants` của ticket chương đó ∪ `uses:` tùy chọn của `chapters.yml` (v5 §B.9).
  - XP: `drillXp(drill, firstPass)` = 10 (challenge 20) lần đầu, 0 sau.
  - Không đếm nhầm: `rankOf`, `nextTicket`, `derive` (cảng), tổng kết chương, `kpiTiles` cho cùng kết quả khi `completed` có thêm 10 id `g-…`.
- [ ] **Step 2:** `save.ts`: trong `parseSave`, `known.ticketIds.has(x) || DRILL_ID.test(x)` cho `completed`, và `pickRecord` nhận id thỏa `DRILL_ID` (qua `ticketOfKey`). Không đổi `SAVE_VERSION`.
- [ ] **Step 3:** `src/learn.ts` cài các hàm trên (thuần, không DOM).
- [ ] **Step 4: xác nhận.** `npx vitest run tests/learn.test.ts tests/save.test.ts && npx tsc --noEmit && npm test` (fixtures `save-v1/v2/v3.json` không đổi). Commit `feat(learn): progress for drills, skills, modules and advanced nodes; saves keep g- ids without loading General content`.

### Task 7: Workspace drill

**Files:** sửa `src/session.ts`, `src/ui/work.ts`, `src/ui/brief.ts` (chỉ nhánh chọn brief), `src/state.ts` (`erMeta`/autocomplete theo schema của mode); tạo `src/ui/drillBrief.ts`, `src/i18n/learn.ts`; sửa `scripts/check-budget.mjs` (`['learnui', /^(learnView|drillBrief)-/, 25]`).

- [ ] **Step 1: test trước** (thuần): `session.ts` `startDrill(drill)` đặt mode `drill`; `keepsWork()` true; `activeTicket()` = `drillTicket(drill)`; `activeSchema()` = `'lab'` (mode khác: `'game'`); `isDone(id)` đọc `completed`. `pageShortcutOf` không đổi.
- [ ] **Step 2:** `session.ts`: `Mode` thêm `{ kind: 'drill'; ticket: Ticket; drill: Drill }`; `activeSchema()`. Mọi chỗ `app.run(sql)` của workspace (Chạy, Nộp: cả câu người chơi lẫn Solution, thẻ kết quả mong đợi, `wrongTipper`, EXPLAIN/`plan:`, Thứ tự thực thi) truyền `{ schema: activeSchema() }`. Grep kiểm: `grep -n "app.run(\|db.run(" src/ui/work.ts src/state.ts src/ui/vizTabs.ts`.
- [ ] **Step 3:** `work.ts` Nộp trong mode `drill`: đạt lần đầu ⇒ `completed.push(id)`, `xp += drillXp`, `review` của `drill.skill` qua `nextCard(…, isSuccess(wrong, hints))` (nút nâng cao: không review), lưu `graded`; không `playCompletion` (hoạt cảnh là của domain), chỉ `celebrate()` + Lily reo (Plan 7 V7). Không ghi lịch sử chung `cargo-query/history`? **Có** ghi (khóa theo id drill, như lane).
- [ ] **Step 4:** `drillBrief.ts` (lười, tiêm `ctx`): tiêu đề "Drill · <nhãn kỹ năng hoặc tên nút> · n/3" (thử thách: "Thử thách"), đề (`task`), thẻ "Kết quả mong đợi" (D8a-6: không nhãn), nút "Gợi ý" (miễn phí, một bậc), thẻ bài học thu gọn (kỹ năng: bài trong `lessons.yml` chạy trên game; nút: bài của nút chạy trên `lab`), sau khi đạt: Recap (câu đã nộp) + "Drill tiếp" (drill chưa đạt kế tiếp của cùng kỹ năng/nút, hết thì "Về trang kỹ năng"/"Về nút") + "Áp dụng ở Logistics, chương n" (`appliesIn`, link `#/d/logistics` chọn chương đó). Không có người gửi, cảnh, thanh việc `#map`.
- [ ] **Step 5:** Tab Cột/ER trong mode `drill`: `erMeta('lab')` (mọi bảng `lab`, không lọc `unlockedTables`), giá trị cột chữ (`textValues`) theo schema. Autocomplete (`schemaHooks`) theo `activeSchema()`.
- [ ] **Step 6:** `src/i18n/learn.ts`: khóa VI + EN cho mọi chữ của Task 7 và 9–11; `tests/i18n.test.ts` mở rộng để quét cả file này (placeholder khớp, EN khác VI trừ `SAME_OK`).
- [ ] **Step 7: xác nhận.** `npx tsc --noEmit && npm test`; build + budget (`learnui` ≤ 25, `main` ≤ M0 + 0,5). Kiểm tay: từ console `location.hash = '#/learn/skill/where'` (route ở Task 9; tạm thời gọi `actions.startDrill('g-where-1')`): drill faded có `___`, Nộp khi còn `___` bị chặn không tính sai; điền đúng → +10 XP, Recap, "Drill tiếp"; Nộp lại → 0 XP; tab Cột liệt kê `products`…; gõ `SELECT * FROM shipments` → lỗi 42P01 có giải thích; sau timeout (chạy `SELECT pg_sleep(6)`) DB khởi động lại và drill vẫn chạy (re-ensure).
- [ ] **Step 8:** Commit `feat(drill): drill workspace on lab (shared editor, grader, hints, recap, next drill)`.

### Task 8: Luyện SQL và Ôn tập dùng drill

**Files:** sửa `src/practice.ts`, `src/ui/modes.ts`, `tests/practice.test.ts`.

- [ ] **Step 1: test trước:** `reviewQueue` với nguồn drill: mỗi kỹ năng đến hạn lấy **một drill chưa làm trong phiên** của kỹ năng đó (ưu tiên `open`, rồi `trap`, rồi `faded`), ngẫu nhiên qua `rnd`; kỹ năng không có drill (không còn sau Task 4, nhưng giữ đường cũ) → biến thể ticket như cũ; promotion review vẫn loại (L10).
- [ ] **Step 2:** Ôn tập chạy drill trong mode `drill` nhưng **0 XP** và không ghi `completed` (cờ `practice: true` trong mode); kết quả vẫn qua `applyResult` (Leitner, `practice` totals). Trang `#/practice` (Plan 7) thêm: "Hôm nay: N kỹ năng đến hạn", "Kỹ năng yếu nhất" (box thấp nhất trong đã học) → 1 drill gợi ý, "Tiếp tục drill dở" (drill có nháp chưa đạt). Trạng thái rỗng (chưa học gì): "Bắt đầu từ Module 1" → `#/learn/sql/1` (hình `emptyDrills` của Plan 8b nếu có).
- [ ] **Step 3: xác nhận.** `npx vitest run tests/practice.test.ts && npx tsc --noEmit && npm test`. Kiểm tay: save có thẻ `where` đến hạn → Ôn tập mở drill `where`, đạt → hộp Leitner tăng, XP không đổi. Commit `feat(practice): reviews and the practice hub use drills`.

> **Mốc M1** (phát hành được): drill chơi được từ Luyện SQL và từ link trực tiếp; Lộ trình vẫn là bản Plan 7. Nếu dừng ở đây: sửa trang Lộ trình Plan 7 bỏ dòng "nâng cao đợt sau" (D8a-16) và thêm ở mỗi kỹ năng nút "Luyện (3 drill)" mở drill đầu chưa đạt.

### Task 9: Lộ trình đầy đủ (`#/learn`, `#/learn/sql/<n>`, `#/learn/skill/<id>`)

**Files:** sửa `src/route.ts`, `tests/route.test.ts`; tạo `src/ui/learnView.ts` (lười); sửa chỗ Plan 7 đăng ký trang Lộ trình để gọi `loadLearnView()`.

- [ ] **Step 1: test trước** (`tests/route.test.ts`, cùng kiểu `learnModuleOf` của Plan 7): `parseRoute('#/learn/skill/where')` = `'learn'`, `learnSkillOf('#/learn/skill/where')` = `'where'`, `learnAdvOf('#/learn/adv/b2')` = `'b2'`; id không khớp `^[a-z0-9_]+$` → `undefined` (trang mở `#/learn`); `learnModuleOf('#/learn/sql/13')` vẫn `undefined`. Không thêm alias cũ nào.
- [ ] **Step 2:** `learnView.ts` (tiêm `ctx`; mọi chữ qua `lt()`):
  - **`#/learn`**: hai cột từ `lg` (một cột dưới `lg`, track nâng cao ở dưới). Cột 1 "SQL nền tảng": 12 dòng module (`moduleGlyph(n)` của 8b nếu có), mỗi dòng: tên chương-module, "k/m kỹ năng đã học", thanh tiến độ, "Áp dụng: Logistics ch n" (link). Cột 2 "DA nâng cao": 4 nhóm A–D, mỗi nút một dòng: icon + chữ trạng thái ▣ "Trong nền tảng" / ◐ "Một phần" / ↗ "Đọc ngoài" (không chỉ màu, L23), "x/y bài", khóa mềm ("Nên học trước: …" khi `needs` chưa học, vẫn bấm được). Đầu trang: "Đã học N/38 kỹ năng · M thành thạo · K/20 nút nâng cao".
  - **`#/learn/sql/<n>`**: mọi kỹ năng của module: mỗi kỹ năng một khối "thở" (Plan 7 F5): nhãn + trạng thái, dòng "Bài học nhanh" (mở `openLesson`, ✓ khi đã xem), 3 dòng drill (tên kiểu "Làm theo khung / Tự làm / Bẫy hay gặp", ✓ khi đạt, bấm mở workspace), cuối module "Áp dụng ở Logistics, chương n" + nút "Vào chương n" (mở được nếu chương đã mở trong domain, không thì "Mở sau khi xong chương n−1" — không phải "sắp có").
  - **`#/learn/skill/<id>`**: như một khối của trang module, thêm thẻ kỹ năng (`syntax`, `when`, `trap` của `skills.yml`), danh sách "Áp dụng ở" (mọi chương có `appliesIn`), docs PostgreSQL.
- [ ] **Step 3:** Mở trang Chung ⇒ `db.ensure('lab')` + `loadGeneral()` song song; trong lúc chờ: khung giữ chỗ cố định chiều cao + chữ "Đang chuẩn bị dữ liệu luyện tập…" (`aria-live="polite"`); lỗi tải → `errorView` + nút Thử lại (không trang trắng).
- [ ] **Step 4: xác nhận.** `npx vitest run tests/route.test.ts && npx tsc --noEmit && npm test`; build + budget. Kiểm tay 3 bề rộng: mọi dòng bấm được tới drill/bài học/chương. Commit `feat(learn): full learning path with status (modules, skills, lessons, drills, where each is used)`.

### Task 10: Trang nút nâng cao `#/learn/adv/<node>`

**Files:** sửa `src/ui/learnView.ts`, `src/ui/lessonCard.ts` (nhận bài học của nút).

- [ ] **Step 1:** Trang nút: tiêu đề, `why`, trạng thái, "Cần trước" (chip kỹ năng/nút, xanh khi đã học, bấm tới trang tương ứng), "Áp dụng ở" (`applies` nếu có), thẻ bài học (`openLesson` với bài của nút; ví dụ/Thử ngay chạy trên `lab`), danh sách drill + thử thách (✓), link ngoài (nút `partial`/`external`, `rel="noopener"`, `target="_blank"`, có icon "mở ra ngoài"). Nút `external` chỉ có `why` + link + "Trong nền tảng bạn luyện được: …" (vd. D3 → Bảng điều hành, D7 → thư đồng nghiệp ở Logistics) theo v5 §D.3.
- [ ] **Step 2:** Xong mọi drill + thử thách ⇒ dòng "Hoàn thành" + XP thử thách (+20 lần đầu).
- [ ] **Step 3: xác nhận.** `npx tsc --noEmit && npm test`. Kiểm tay: `#/learn/adv/a1` (Thử ngay trên `lab`, 4 bài), `#/learn/adv/b5` (◐ có link), `#/learn/adv/d2` (↗ chỉ link). Commit `feat(learn): advanced node pages (lesson, drills, challenge, reading links)`.

### Task 11: Domain ↔ Chung

**Files:** sửa `src/ui/homeView.ts` (Tổng quan Logistics: danh sách chương), `src/ui/chapterView.ts` (mục tiêu chương), `src/ui/lessonCard.ts` (thẻ thu gọn khi đã học ở Chung), `content/chapters.yml` (tùy chọn `uses:`), `tests/learn.test.ts`.

- [ ] **Step 1: test trước:** `dependsOn(n)` cho 12 chương không rỗng; `uses:` là **tùy chọn** và mọi id trong đó (nếu có) là kỹ năng hoặc nút. Plan này **không** thêm `uses:` nào (L45 S8: khung trung bình trượt không vào việc ch10; nút nâng cao chỉ hiện "Áp dụng ở" bằng chữ `applies`).
- [ ] **Step 2:** Dòng phụ "Dựa vào: …" mà Plan 7 Task 10 đã đặt trên mỗi dòng chương (giữ bố cục F5: một dòng, không chip chồng): mỗi tên kỹ năng thành link `#/learn/skill/<id>`, có "✓" khi đã học (`learnedSkills`, không tải chunk Chung); "+k" mở `#/learn/sql/n`. Mục tiêu chương (`chapterView.ts`) dùng cùng hàm.
- [ ] **Step 3:** Thẻ bài học ở việc teach của Logistics: kỹ năng đã học ở Chung (≥ 2 drill) ⇒ thẻ mở sẵn ở dạng thu gọn với dòng "Bạn đã luyện ở Luyện SQL" (v5 §B.8, D-G3); gợi ý không đổi.
- [ ] **Step 4:** Trang chủ nền tảng (Plan 7): thẻ "Hôm nay" thêm 1 drill gợi ý (kỹ năng yếu nhất) — nạp `loadGeneral()` lười, khung giữ chỗ.
- [ ] **Step 5: xác nhận.** `npx tsc --noEmit && npm test`. Kiểm tay: chương 3 hiện "Dựa vào: Nối bảng (JOIN) · Nhiều bảng · LEFT JOIN · …", chip đã học xanh. Commit `feat(learn): every Logistics chapter links the General skills it relies on, and back`.

### Task 12: Không ngõ cụt

**Files:** tạo `tests/noDeadEnds.test.ts`.

- [ ] **Step 1:** Test:
  - Mọi kỹ năng (38) có: bài học, 3 drill, ≥ 1 chương "Áp dụng ở".
  - Mọi nút `in|partial` có bài học, ≥ 3 drill, 1 thử thách; mọi nút có ≥ 1 đường vào từ `#/learn`; mọi `needs` tồn tại.
  - Mọi route tạo được từ trang Chung (`#/learn/sql/1..12`, `#/learn/skill/<38 id>`, `#/learn/adv/<28 id>`) đi qua `parseRoute` ra đúng trang (không rơi về `#/`).
  - `src/i18n/learn.ts` và mọi chữ trang Chung không chứa "đợt sau", "sắp có", "coming soon", "later batch" (không phân biệt hoa thường); khóa "đợt sau" của Lộ trình Plan 7 (nếu có) không còn được tham chiếu (`grep` trong test qua `import.meta.glob('../src/**/*.ts', { query: '?raw' })`).
- [ ] **Step 2:** `npx vitest run tests/noDeadEnds.test.ts && npm test`. Commit `test: no dead ends on the General paths`.

> **Mốc M2** = toàn bộ Plan 8a.

### Task 13: Tài liệu và kiểm cuối

- [ ] **Step 1:** `CLAUDE.md` thêm mục "Phần Chung (Plan 8a)": `lab` (file riêng, seed lười qua `ensure`, `schema` theo request, móc trong đầu `lab.sql`, md5 ghim ở `tests/lab.test.ts`), định dạng drill/nút, `DRILL_ID` trong `completed`, XP drill, chunk `general`/`learnui`/`lessons`, `src/i18n/learn.ts`, luật đề drill (D8a-7), "không ngõ cụt".
- [ ] **Step 2:** `npx tsc --noEmit && npm test && npm run build && node scripts/check-budget.mjs`; ghi bảng ngân sách cuối vào `docs/team/review-log.md` (mục Plan 8a). Edge :5174 đi trọn: Trang chủ → Lộ trình → Module 3 → bài học `join` → drill 1–3 → "Áp dụng ở Logistics ch3" → Tổng quan chương 3 → chip "Dựa vào" về lại kỹ năng; Lộ trình → B2 cohort → bài học → 4 bài; reload giữa chừng (nháp còn, `completed` còn).
- [ ] **Step 3:** Commit `docs: Plan 8a (General area) in CLAUDE.md, final budgets`.

## Rủi ro

| Rủi ro | Giảm thiểu |
|---|---|
| Plan 7 chưa xong khung route/sidebar khi 8a bắt đầu | Task 1–6 không cần khung (DB, nội dung, mô hình, test); Task 7+ chờ |
| `SET LOCAL search_path` quên ở một đường chạy (shape card, wrongTipper, EXPLAIN) ⇒ drill chạy trên game, lỗi 42P01 khó hiểu | Mọi đường đi qua `activeSchema()`; test Task 4 "Solution không chạy được khi bỏ schema"; kiểm tay Task 7 |
| Seed `lab` chậm trên máy yếu | Seed lười + thanh trạng thái; đo ở Task 0/Task 1; `ensure` hạn 30 s, không tính hạn 5 s |
| Timeout làm mất `lab` | `DbClient` re-ensure trước query kế tiếp (test Step 7 Task 7) |
| Nội dung lớn có lỗi chữ khó thấy | Đã qua máy kiểm (luật ở Task 2/4/5); review nội dung VI/EN độc lập theo L55 sau khi build |
| `main` vượt trần | UI Chung lười + tiêm phụ thuộc + i18n riêng (D8a-13); luật dừng ở Global Constraints |
| Dữ liệu `lab` không đổi được nữa (md5 ghim) | Đổi seed = chạy lại test nội dung Task 4/5, cập nhật snapshot md5 trong cùng commit |

## Đã kiểm khi viết plan (scratch, PGlite 0.5.16 bản pin, Node 24)

- `lab.sql` seed trong schema `lab` sau seed Logistics: **190–250 ms** (Node; seed Logistics cùng máy 2,9–3,3 s khi có tiến trình khác chạy).
- Số dòng (đo trên `lab.sql` đúng như Phụ lục A): `customers` 300, `orders` 1.428 (228 đơn vãng lai `customer_id` NULL = 220 + 8 đơn sỉ ngày 2026-09-09; 12 đơn online chưa hủy mà chưa giao), `order_items` 4.284, `payments` 1.395 (gồm 8 mồ côi, trùng ở đơn `id % 97 = 0`), `app_events` 1.928 (view 900 → add_to_cart 488 → checkout 299 → paid 241), `store_targets` 57, `fact_sales` 3.894, `dim_customer` 342; 160 ngày trong 2025-01-01..2026-10-31 không có đơn nào (trục ngày). Mọi khách có đúng 4 đơn.
- Bài học 27 kỹ năng (Phụ lục B): chạy bằng `vitest` với module thật của repo (`parseLessons`, `cueIn`, `compareResults`, `applyVariant`, `tablesUnlocked`) trên Logistics seed vào `public` (HEAD `d7f42d8`): **137/137 luật đạt** (chạy lại sau khi sửa một câu của bài `self_join`: quản lý phòng Hải quan, id 24, báo cáo lên id 1 = Director phòng Management, nên câu ghi "giám đốc công ty"); 79 KB thô, 20,7 KB gzip. Chỉ mục được nêu tên (`shipments_customer_id_idx`, `shipments_booking_date_idx`) giữ tên khi Plan 7 chuyển bảng sang `logistics`.
- Drill (Phụ lục C) và nút (Phụ lục D): `drillcheck.mjs` (luật của Task 4/5, đọc dòng theo vị trí cột `rowMode: 'array'`): ALL OK (114 drill kỹ năng; 28 nút, 20 bài học, 80 bài nâng cao; mọi câu ≤ 3 ms, kết quả lớn nhất 207 dòng). Drill ch11: Solution ra `Bitmap Heap Scan` > `Bitmap Index Scan` (orders) hoặc `Index Scan` (`app_events_user_id_ts_idx`); câu bẫy ra `Seq Scan`.
- Đặc điểm dữ liệu `lab` mà nội dung đã dựa vào (không sửa seed, mọi bài đã kiểm trên đúng dữ liệu này): số đơn mỗi khách **bằng nhau (4)** (`generate_series(1, floor(random()*15))` trong `LATERAL` không tham chiếu cột ngoài nên chỉ tính một lần) → RFM tần suất thô, bài B4 nêu tiêu chí phụ theo id khách; mọi khách có ≥ 1 đơn và ≥ 1 đơn PAID; không email trùng sau `lower/trim` trong `raw_signups` (C1 kiểm thanh toán trùng thay vào); không mốc giờ nào đúng nửa đêm; thí nghiệm 1: A 40/150, B 42/150, z ≈ 0,26 (B5 dạy "chưa đủ để kết luận"); B6 dựa vào đỉnh 2026-09-09 cửa hàng 3 (6.095.000 đồng, z ≈ 10,2). **Backlog v12:** sửa phân bố đơn mỗi khách = đổi md5 + chạy lại kiểm nội dung Task 4/5.
- Phát hiện khi kiểm: hai cột trùng tên (`count`, `count`) làm checker đọc theo tên nuốt mất một cột → mọi kiểm nội dung trong repo phải so theo **vị trí** (`compareResults` đã vậy); bẫy "`+ interval` thành timestamp" **không** chấm được vì PGlite trả `Date` cho cả `date` lẫn `timestamp` và grader so chuỗi ISO (bài `date_math` dùng bẫy "trừ ngược chiều" thay thế).

---

# Phụ lục (chép nguyên văn; đã kiểm, xem "Đã kiểm khi viết plan")

## Phụ lục A · `src/db/lab.sql`

Seed của schema `lab` (Task 1). Chạy với `search_path = lab`.

````sql
-- BoonData `lab`: a small neutral retail chain for the General drills (v5 §C.1, Plan 8a).
-- Seeded lazily by ensureSchema(db, 'lab') with search_path = lab (Plan 8a D8a-3). No story, no people from the domains.
-- Deterministic: one setseed() per random block, literal dates only, "today" = 2026-10-31.
-- Hooks the drills rely on (tests/lab.test.ts pins them; do not change without updating content/general):
--   store 4 (Thao Dien) opened 2025-09-01: no orders before, targets only from 2026-03 (full join, date spine)
--   2026-09-09 store 3 has a bulk-order spike (anomaly drills)
--   walk-in orders have customer_id NULL; ONLINE orders not yet delivered have delivered_on NULL
--   payments: duplicates (order id % 97 = 0) and 8 orphan order ids 99901..99908 on purpose (data quality)
--   raw_signups is dirty on purpose: spacing/case in names, bad or missing emails, mixed phone formats, future dates
--   (no duplicate emails after lower/trim)
--   every member has exactly 4 orders (the LATERAL count below is computed once: known quirk, kept so content stays valid)
--   dim_customer is SCD type 2: customers who moved have two rows (valid_to exclusive, NULL = current)

CREATE TABLE stores (
  id int PRIMARY KEY,
  name text NOT NULL,
  city text NOT NULL,
  opened_on date NOT NULL
);
INSERT INTO stores VALUES
  (1, 'Hai Chau', 'Da Nang', '2023-03-01'),
  (2, 'Son Tra', 'Da Nang', '2024-06-15'),
  (3, 'Ben Thanh', 'Ho Chi Minh City', '2022-11-20'),
  (4, 'Thao Dien', 'Ho Chi Minh City', '2025-09-01'),
  (5, 'Hoan Kiem', 'Hanoi', '2024-01-10');

CREATE TABLE products (
  id int PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL,
  price_vnd int NOT NULL
);
INSERT INTO products VALUES
  (1, 'Green tea 500ml', 'Drinks', 12000), (2, 'Iced coffee can', 'Drinks', 18000), (3, 'Orange juice 1l', 'Drinks', 35000),
  (4, 'Mineral water 1.5l', 'Drinks', 9000), (5, 'Milk tea bottle', 'Drinks', 25000), (6, 'Coconut water', 'Drinks', 22000),
  (7, 'Rice crackers', 'Snacks', 15000), (8, 'Dried mango', 'Snacks', 45000), (9, 'Cashew nuts 200g', 'Snacks', 89000),
  (10, 'Potato chips', 'Snacks', 20000), (11, 'Chocolate bar', 'Snacks', 28000), (12, 'Seaweed snack', 'Snacks', 16000),
  (13, 'Dish soap', 'Household', 32000), (14, 'Laundry powder 3kg', 'Household', 129000), (15, 'Paper towels', 'Household', 41000),
  (16, 'Trash bags', 'Household', 27000), (17, 'Floor cleaner', 'Household', 56000), (18, 'Light bulb', 'Household', 38000),
  (19, 'Toothpaste', 'Personal care', 31000), (20, 'Shampoo 650ml', 'Personal care', 149000), (21, 'Sunscreen', 'Personal care', 185000),
  (22, 'Hand soap', 'Personal care', 29000), (23, 'Face wash', 'Personal care', 99000), (24, 'Toothbrush', 'Personal care', 19000),
  (25, 'Notebook A5', 'Stationery', 24000), (26, 'Gel pen', 'Stationery', 8000), (27, 'Highlighter set', 'Stationery', 46000),
  (28, 'Sticky notes', 'Stationery', 14000), (29, 'Stapler', 'Stationery', 65000), (30, 'Desk lamp', 'Stationery', 259000);

CREATE TABLE customers (
  id int PRIMARY KEY,
  name text NOT NULL,
  email text,
  city text,
  signup_date date NOT NULL,
  birth_year int
);
SELECT setseed(0.81);
INSERT INTO customers
SELECT i,
       (ARRAY['Nguyen','Tran','Le','Pham','Hoang','Vo','Dang','Bui'])[1 + (i * 7) % 8] || ' ' ||
       (ARRAY['An','Binh','Chi','Dung','Giang','Hoa','Khanh','Lan','Minh','Nam','Phuong','Quan','Thao','Trang','Tuan','Vy'])[1 + (i * 5) % 16],
       CASE WHEN i % 23 = 0 THEN NULL ELSE
         lower((ARRAY['An','Binh','Chi','Dung','Giang','Hoa','Khanh','Lan','Minh','Nam','Phuong','Quan','Thao','Trang','Tuan','Vy'])[1 + (i * 5) % 16])
         || '.' || lower((ARRAY['Nguyen','Tran','Le','Pham','Hoang','Vo','Dang','Bui'])[1 + (i * 7) % 8]) || i || '@'
         || (ARRAY['gmail.com','yahoo.com','outlook.com','mail.vn'])[1 + (i * 3) % 4] END,
       CASE WHEN i % 17 = 0 THEN NULL ELSE (ARRAY['Da Nang','Da Nang','Ho Chi Minh City','Ho Chi Minh City','Hanoi','Hue','Can Tho'])[1 + floor(random() * 7)::int] END,
       DATE '2025-01-01' + floor(random() * 658)::int,
       CASE WHEN i % 11 = 0 THEN NULL ELSE 1965 + floor(random() * 40)::int END
FROM generate_series(1, 300) AS i;

CREATE TABLE orders (
  id int PRIMARY KEY,
  customer_id int REFERENCES customers (id),
  store_id int NOT NULL REFERENCES stores (id),
  order_date date NOT NULL,
  channel text NOT NULL,
  status text NOT NULL,
  shipped_on date,
  delivered_on date
);
SELECT setseed(0.82);
-- Member orders on or after signup (the series bound does not reference c, so it is drawn once: 4 per customer);
-- 220 walk-in orders have no customer.
-- Store: weighted pick; store 4 (Thao Dien) only from its opening day.
INSERT INTO orders (id, customer_id, store_id, order_date, channel, status)
SELECT row_number() OVER (ORDER BY d, cid NULLS LAST, k), cid,
       CASE WHEN d >= '2025-09-01' AND random() < 0.15 THEN 4 ELSE (ARRAY[1, 1, 2, 3, 3, 3, 5, 5])[1 + floor(random() * 8)::int] END,
       d, ch, st
FROM (
  SELECT c.id AS cid, k,
         c.signup_date + floor(random() * (DATE '2026-10-31' - c.signup_date + 1))::int AS d,
         CASE WHEN random() < 0.35 THEN 'ONLINE' ELSE 'STORE' END AS ch,
         CASE WHEN random() < 0.90 THEN 'PAID' WHEN random() < 0.6 THEN 'CANCELLED' ELSE 'REFUNDED' END AS st
  FROM customers c CROSS JOIN LATERAL generate_series(1, floor(random() * 15)::int) AS k
  UNION ALL
  SELECT NULL, k, DATE '2025-01-01' + floor(random() * 669)::int, 'STORE', 'PAID'
  FROM generate_series(1, 220) AS k
) x;
UPDATE orders SET shipped_on = order_date + floor(random() * 3)::int WHERE channel = 'ONLINE' AND status <> 'CANCELLED';
UPDATE orders SET delivered_on = shipped_on + 1 + floor(random() * 5)::int WHERE shipped_on IS NOT NULL;
UPDATE orders SET delivered_on = NULL WHERE delivered_on > '2026-10-31';
UPDATE orders SET shipped_on = NULL WHERE shipped_on > '2026-10-31';
-- Spike hook: 8 bulk walk-in orders at Ben Thanh on 2026-09-09.
INSERT INTO orders (id, customer_id, store_id, order_date, channel, status)
SELECT (SELECT max(id) FROM orders) + k, NULL, 3, '2026-09-09', 'STORE', 'PAID' FROM generate_series(1, 8) AS k;

CREATE TABLE order_items (
  order_id int NOT NULL REFERENCES orders (id),
  line_no int NOT NULL,
  product_id int NOT NULL REFERENCES products (id),
  qty int NOT NULL,
  unit_price_vnd int NOT NULL,
  PRIMARY KEY (order_id, line_no)
);
SELECT setseed(0.83);
INSERT INTO order_items
SELECT o.id, k, p, q, CASE WHEN disc THEN round(pr.price_vnd * 0.9)::int ELSE pr.price_vnd END
FROM orders o
CROSS JOIN LATERAL generate_series(1, 1 + floor(random() * 4)::int) AS k
CROSS JOIN LATERAL (SELECT 1 + ((o.id * 7 + k * 11 + floor(random() * 30)::int) % 30) AS p,
                           CASE WHEN o.order_date = '2026-09-09' AND o.store_id = 3 AND o.customer_id IS NULL THEN 6 ELSE 1 + floor(random() * 5)::int END AS q,
                           random() < 0.1 AS disc) r
JOIN products pr ON pr.id = r.p;

CREATE TABLE payments (
  id int PRIMARY KEY,
  order_id int NOT NULL,          -- no foreign key on purpose: orphans are a data-quality hook
  amount_vnd bigint NOT NULL,
  paid_at timestamp NOT NULL
);
SELECT setseed(0.84);
INSERT INTO payments
SELECT row_number() OVER (ORDER BY o.id, kind), o.id,
       CASE WHEN kind = 2 THEN -t.total ELSE t.total END,
       o.order_date + (kind * 2) + make_interval(hours => 8 + floor(random() * 12)::int, mins => floor(random() * 60)::int)
FROM orders o
JOIN (SELECT order_id, sum(qty * unit_price_vnd) AS total FROM order_items GROUP BY order_id) t ON t.order_id = o.id
CROSS JOIN LATERAL (VALUES (0), (1), (2)) AS v (kind)
WHERE o.status IN ('PAID', 'REFUNDED') AND (kind = 0 OR (kind = 1 AND o.id % 97 = 0) OR (kind = 2 AND o.status = 'REFUNDED'));
INSERT INTO payments
SELECT (SELECT max(id) FROM payments) + k, 99900 + k, 50000 * k, TIMESTAMP '2026-10-01 09:00' + k * interval '1 day'
FROM generate_series(1, 8) AS k;

CREATE TABLE store_targets (
  store_id int NOT NULL REFERENCES stores (id),
  month date NOT NULL,
  target_vnd bigint NOT NULL,
  PRIMARY KEY (store_id, month)
);
INSERT INTO store_targets
SELECT s.id, m::date, (CASE s.id WHEN 3 THEN 15 WHEN 1 THEN 10 WHEN 5 THEN 9 WHEN 2 THEN 5 ELSE 6 END) * 1000000
FROM stores s CROSS JOIN generate_series(DATE '2026-01-01', DATE '2026-12-01', interval '1 month') AS m
WHERE NOT (s.id = 4 AND m < '2026-03-01') AND NOT (s.id = 5 AND m = '2026-06-01');

CREATE TABLE staff (
  id int PRIMARY KEY,
  name text NOT NULL,
  role text NOT NULL,
  store_id int REFERENCES stores (id),
  manager_id int REFERENCES staff (id),
  hired_on date NOT NULL
);
INSERT INTO staff VALUES
  (1, 'Ha Minh', 'CEO', NULL, NULL, '2022-01-03'),
  (2, 'Do Lan', 'Regional manager', NULL, 1, '2022-06-01'),
  (3, 'Ly Quan', 'Regional manager', NULL, 1, '2023-02-15'),
  (4, 'Mai Thao', 'Store manager', 1, 2, '2023-03-01'),
  (5, 'Ngo Binh', 'Store manager', 2, 2, '2024-06-01'),
  (6, 'Ta Vy', 'Store manager', 3, 3, '2022-11-01'),
  (7, 'Kieu Nam', 'Store manager', 4, 3, '2025-08-15'),
  (8, 'Luu Hoa', 'Store manager', 5, 2, '2024-01-02'),
  (9, 'Cao An', 'Cashier', 1, 4, '2023-04-10'), (10, 'Duong Chi', 'Cashier', 1, 4, '2024-09-01'),
  (11, 'Tong Dung', 'Cashier', 2, 5, '2024-07-01'), (12, 'Vu Giang', 'Cashier', 3, 6, '2022-12-01'),
  (13, 'Phan Khanh', 'Cashier', 3, 6, '2023-05-20'), (14, 'Lam Phuong', 'Stock clerk', 3, 13, '2025-01-06'),
  (15, 'Quach Trang', 'Cashier', 4, 7, '2025-09-01'), (16, 'Trieu Tuan', 'Cashier', 5, 8, '2024-02-01'),
  (17, 'Mac Minh', 'Stock clerk', 5, 16, '2025-03-03'), (18, 'Ong Lan', 'Analyst', NULL, 1, '2025-05-12'),
  (19, 'Doan Thao', 'Stock clerk', 1, 9, '2026-02-02'), (20, 'Hua Binh', 'Analyst', NULL, 18, '2026-07-01');

CREATE TABLE app_events (
  id int PRIMARY KEY,
  session_id int NOT NULL,
  user_id int REFERENCES customers (id),
  event text NOT NULL,
  ts timestamp NOT NULL,
  props jsonb NOT NULL
);
SELECT setseed(0.85);
INSERT INTO app_events
SELECT row_number() OVER (ORDER BY s, step), s, u, ev, t0 + step * make_interval(mins => 1 + m),
       jsonb_build_object('screen', (ARRAY['home','product','cart','checkout','payment'])[step],
                          'device', dev,
                          'items', CASE WHEN step >= 2 THEN to_jsonb((ARRAY[1 + s % 30, 1 + (s * 7) % 30])[1:1 + s % 2]) ELSE '[]'::jsonb END)
FROM (
  SELECT s, CASE WHEN s % 9 = 0 THEN NULL ELSE 1 + (s * 13) % 300 END AS u,
         TIMESTAMP '2026-08-01 07:00' + floor(random() * 91) * interval '1 day' + floor(random() * 840) * interval '1 minute' AS t0,
         (ARRAY['ios','android','web'])[1 + floor(random() * 3)::int] AS dev,
         CASE WHEN random() < 0.55 THEN CASE WHEN random() < 0.6 THEN CASE WHEN random() < 0.8 THEN 4 ELSE 3 END ELSE 2 END ELSE 1 END AS depth,
         floor(random() * 5)::int AS m
  FROM generate_series(1, 900) AS s
) sess
CROSS JOIN LATERAL generate_series(1, depth) AS step
CROSS JOIN LATERAL (SELECT (ARRAY['view','add_to_cart','checkout','paid'])[step] AS ev) e;

CREATE TABLE experiments (
  id int PRIMARY KEY,
  name text NOT NULL,
  started_on date NOT NULL,
  ended_on date NOT NULL
);
INSERT INTO experiments VALUES (1, 'checkout_button', '2026-08-01', '2026-08-31'), (2, 'free_shipping_banner', '2026-09-15', '2026-10-15');

CREATE TABLE assignments (
  experiment_id int NOT NULL REFERENCES experiments (id),
  customer_id int NOT NULL REFERENCES customers (id),
  variant text NOT NULL,
  converted boolean NOT NULL,
  PRIMARY KEY (experiment_id, customer_id)
);
SELECT setseed(0.86);
INSERT INTO assignments
SELECT e, c, v, random() < CASE WHEN e = 1 AND v = 'B' THEN 0.32 WHEN e = 1 THEN 0.22 ELSE 0.18 END
FROM generate_series(1, 2) AS e
CROSS JOIN generate_series(1, 300) AS c
CROSS JOIN LATERAL (SELECT CASE WHEN (c * 31 + e) % 2 = 0 THEN 'A' ELSE 'B' END AS v) x;

CREATE TABLE raw_signups (
  id int PRIMARY KEY,
  full_name text,
  email text,
  phone text,
  signup_date date
);
SELECT setseed(0.87);
INSERT INTO raw_signups
SELECT i,
       CASE i % 4 WHEN 0 THEN '  ' || upper(n) WHEN 1 THEN lower(n) || '  ' WHEN 2 THEN n ELSE initcap(n) END,
       CASE WHEN i % 13 = 0 THEN NULL
            WHEN i % 10 = 0 THEN replace(e, '@', ' at ')
            WHEN i % 7 = 0 THEN upper(e)
            WHEN i % 9 = 0 THEN e || ' '
            ELSE e END,
       CASE i % 5 WHEN 0 THEN '0905 ' || lpad((i * 37 % 1000)::text, 3, '0') || ' ' || lpad((i * 91 % 1000)::text, 3, '0')
                  WHEN 1 THEN '+84905' || lpad((i * 37 % 1000)::text, 3, '0') || lpad((i * 91 % 1000)::text, 3, '0')
                  WHEN 2 THEN '090-5' || lpad((i * 37 % 1000)::text, 3, '0') || '-' || lpad((i * 91 % 1000)::text, 3, '0')
                  WHEN 3 THEN NULL
                  ELSE '0905' || lpad((i * 37 % 1000)::text, 3, '0') || lpad((i * 91 % 1000)::text, 3, '0') END,
       CASE WHEN i % 31 = 0 THEN DATE '2027-01-15' + i ELSE DATE '2026-09-01' + floor(random() * 60)::int END
FROM (
  SELECT i,
         (ARRAY['nguyen van an','tran thi binh','le minh chi','pham quoc dung','hoang gia huy','vo thanh lan'])[1 + i % 6] AS n,
         'user' || (i % 100) || '@' || (ARRAY['gmail.com','yahoo.com','mail.vn'])[1 + i % 3] AS e
  FROM generate_series(1, 140) AS i
) x;

-- Star schema (C2) built from the tables above; dim_customer is SCD type 2 (C3).
CREATE TABLE dim_date (
  date_key date PRIMARY KEY,
  year int NOT NULL,
  month int NOT NULL,
  iso_dow int NOT NULL,
  is_weekend boolean NOT NULL
);
INSERT INTO dim_date
SELECT d, extract(year FROM d), extract(month FROM d), extract(isodow FROM d), extract(isodow FROM d) >= 6
FROM generate_series(DATE '2025-01-01', DATE '2026-12-31', interval '1 day') AS g (d);

CREATE TABLE dim_product (
  product_key int PRIMARY KEY,
  product_id int NOT NULL,
  name text NOT NULL,
  category text NOT NULL
);
INSERT INTO dim_product SELECT 100 + id, id, name, category FROM products;

CREATE TABLE dim_customer (
  customer_key int PRIMARY KEY,
  customer_id int NOT NULL,
  city text,
  valid_from date NOT NULL,
  valid_to date,
  is_current boolean NOT NULL
);
SELECT setseed(0.88);
-- Every 7th customer moved: first row = old city until the move (valid_to exclusive), second row = current city.
INSERT INTO dim_customer
SELECT row_number() OVER (ORDER BY customer_id, valid_from), customer_id, city, valid_from, valid_to, valid_to IS NULL
FROM (
  SELECT id AS customer_id, CASE WHEN id % 7 = 0 THEN (ARRAY['Hue','Can Tho','Hanoi'])[1 + id % 3] ELSE city END AS city,
         signup_date AS valid_from,
         CASE WHEN id % 7 = 0 THEN signup_date + 30 + (id % 200) END AS valid_to
  FROM customers
  UNION ALL
  SELECT id, city, signup_date + 30 + (id % 200), NULL FROM customers WHERE id % 7 = 0
) x;

CREATE TABLE fact_sales (
  order_id int NOT NULL,
  line_no int NOT NULL,
  date_key date NOT NULL REFERENCES dim_date (date_key),
  product_key int NOT NULL REFERENCES dim_product (product_key),
  customer_key int REFERENCES dim_customer (customer_key),
  store_id int NOT NULL REFERENCES stores (id),
  qty int NOT NULL,
  revenue_vnd bigint NOT NULL,
  PRIMARY KEY (order_id, line_no)
);
INSERT INTO fact_sales
SELECT i.order_id, i.line_no, o.order_date, 100 + i.product_id, dc.customer_key, o.store_id, i.qty, i.qty * i.unit_price_vnd
FROM order_items i
JOIN orders o ON o.id = i.order_id
LEFT JOIN dim_customer dc ON dc.customer_id = o.customer_id AND o.order_date >= dc.valid_from AND (dc.valid_to IS NULL OR o.order_date < dc.valid_to)
WHERE o.status = 'PAID';

CREATE INDEX ON orders (customer_id);
CREATE INDEX ON orders (order_date);
CREATE INDEX ON app_events (user_id, ts);
ANALYZE stores; ANALYZE products; ANALYZE customers; ANALYZE orders; ANALYZE order_items; ANALYZE payments; ANALYZE store_targets;
ANALYZE staff; ANALYZE app_events; ANALYZE experiments; ANALYZE assignments; ANALYZE raw_signups;
ANALYZE dim_date; ANALYZE dim_product; ANALYZE dim_customer; ANALYZE fact_sales;
````

## Phụ lục B · 27 bài học nối vào cuối `content/lessons.yml`

Task 2. Ví dụ trên bảng Logistics, cue lấy từ chữ thật của việc mở kỹ năng.

````yaml
- id: date_math
  cues:
    vi: ["trễ hơn … ngày", "số ngày …", "… ngày sau …"]
    en: ["more than … days after", "the number of days …", "… days late"]
  concept:
    vi: "Ngày trừ ngày ra số ngày giữa hai mốc, là một số nguyên. Ngày cộng hoặc trừ một số nguyên ra một ngày mới. Muốn so khoảng cách thì so con số đó như mọi số khác: lớn hơn 3 ngày, bằng 0 ngày."
    en: "A date minus a date gives the number of days between them, an integer. A date plus or minus an integer gives a new date. To compare a gap, compare that number like any other: more than 3 days, exactly 0 days."
  example: "SELECT ref, booking_date, etd, etd - booking_date AS lead_days, etd + 30 AS follow_up FROM shipments WHERE booking_date = '2026-10-01' ORDER BY ref"
  explain:
    vi: "① `etd - booking_date`: số ngày từ lúc đặt chỗ tới ngày tàu chạy dự kiến; lô đầu tiên là 7 ngày. ② `etd + 30`: một ngày mới, 30 ngày sau ngày tàu chạy (2026-11-07 cho lô đầu). ③ `AS lead_days`: đặt tên cho cột tính ra. Kết quả: 23 lô đặt ngày 01/10/2026."
    en: "① `etd - booking_date`: the days from booking to the planned sailing; 7 days for the first shipment. ② `etd + 30`: a new date, 30 days after the sailing (2026-11-07 for the first shipment). ③ `AS lead_days`: names the computed column. Result: 23 shipments booked on 1 October 2026."
  mistake:
    sql: "SELECT ref, booking_date, etd, booking_date - etd AS lead_days, etd + 30 AS follow_up FROM shipments WHERE booking_date = '2026-10-01' ORDER BY ref"
    vi: "Trừ ngược: ngày sớm trừ ngày muộn ra số âm (-7 thay vì 7). Postgres không báo lỗi, nên luôn lấy mốc sau trừ mốc trước."
    en: "Subtracting the wrong way round: the earlier date minus the later one is negative (-7 instead of 7). Postgres does not complain, so always take the later date minus the earlier one."
  try:
    task:
      vi: "Các lô cập cảng ngày 05/10/2026: mã lô, ngày tàu chạy thực tế, ngày đến thực tế và số ngày trên đường (ngày đến trừ ngày chạy)."
      en: "The shipments that arrived on 5 October 2026: shipment ref, actual departure, actual arrival and the days in transit (arrival minus departure)."
    starter: "SELECT ref, booking_date, etd, etd - booking_date AS lead_days, etd + 30 AS follow_up FROM shipments WHERE booking_date = '2026-10-01' ORDER BY ref"
    solution: "SELECT ref, atd, ata, ata - atd FROM shipments WHERE ata = '2026-10-05' ORDER BY ref"
  docs: https://www.postgresql.org/docs/current/functions-datetime.html

- id: date_bucket
  cues:
    vi: ["từng tháng", "mỗi tháng …", "mỗi tuần …"]
    en: ["per month", "for each month …", "each week …"]
  concept:
    vi: "Muốn một con số cho mỗi tháng (hay tuần, ngày) thì cắt mỗi ngày về đầu kỳ của nó bằng date_trunc, rồi gom nhóm theo kết quả đó. Mọi ngày trong tháng 10 đều thành 2026-10-01, nên rơi vào cùng một nhóm."
    en: "For one number per month (or week, or day), cut each date back to the start of its period with date_trunc, then group by that result. Every date in October becomes 2026-10-01, so they all land in one group."
  example: "SELECT date_trunc('week', booking_date)::date AS week, count(*) FROM shipments WHERE booking_date >= '2026-10-05' AND booking_date < '2026-11-02' GROUP BY week ORDER BY week"
  explain:
    vi: "① `date_trunc('week', booking_date)`: đưa mỗi ngày về thứ Hai đầu tuần. ② `::date`: bỏ phần giờ cho dễ đọc. ③ `GROUP BY week`: mỗi tuần một dòng. Kết quả: 4 tuần, 178, 193, 172 và 142 booking. Đơn vị khác: `'day'`, `'month'`, `'year'`."
    en: "① `date_trunc('week', booking_date)`: moves each date back to the Monday of its week. ② `::date`: drops the time part so it reads easily. ③ `GROUP BY week`: one row per week. Result: 4 weeks, with 178, 193, 172 and 142 bookings. Other units: `'day'`, `'month'`, `'year'`."
  mistake:
    sql: "SELECT extract(month FROM booking_date) AS month, count(*) FROM shipments GROUP BY 1 ORDER BY 1"
    vi: "`extract(month …)` chỉ ra số tháng (10), nên tháng 10/2025 và tháng 10/2026 bị gộp chung một dòng. Dùng `date_trunc` để giữ cả năm."
    en: "`extract(month …)` only gives the month number (10), so October 2025 and October 2026 merge into one row. Use `date_trunc` to keep the year."
  try:
    task:
      vi: "Mỗi tháng của quý 3/2026 (tháng 7 đến tháng 9) có bao nhiêu lô đi đường hàng không? Tháng (ngày đầu tháng) và số lô, tháng sớm nhất lên đầu."
      en: "How many air shipments were booked in each month of Q3 2026 (July to September)? The month (its first day) and the count, earliest month first."
    starter: "SELECT date_trunc('week', booking_date)::date AS week, count(*) FROM shipments WHERE booking_date >= '2026-10-05' AND booking_date < '2026-11-02' GROUP BY week ORDER BY week"
    solution: "SELECT date_trunc('month', booking_date) AS month, count(*) FROM shipments WHERE mode = 'AIR' AND booking_date >= '2026-07-01' AND booking_date < '2026-10-01' GROUP BY month ORDER BY month"
    ordered: true
  docs: https://www.postgresql.org/docs/current/functions-datetime.html#FUNCTIONS-DATETIME-TRUNC

- id: null_logic
  cues:
    vi: ["vẫn chưa ghi nhận …", "chưa có …", "còn trống"]
    en: ["still … no …", "not recorded yet", "is still empty"]
  concept:
    vi: "NULL nghĩa là chưa có giá trị: chưa biết, chưa xảy ra. NULL không bằng gì cả, kể cả NULL khác, nên phép so sánh với NULL không bao giờ đúng. Tìm ô trống thì viết IS NULL, ô đã có giá trị thì IS NOT NULL."
    en: "NULL means no value yet: unknown, or not happened. NULL equals nothing, not even another NULL, so a comparison with NULL is never true. To find an empty cell write IS NULL; for a filled one, IS NOT NULL."
  example: "SELECT ref, atd, eta FROM shipments WHERE atd IS NOT NULL AND ata IS NULL AND eta < '2026-10-28' ORDER BY eta, ref"
  explain:
    vi: "① `atd IS NOT NULL`: tàu đã chạy. ② `ata IS NULL`: chưa ghi nhận ngày đến. ③ `eta < '2026-10-28'`: đáng lẽ đã đến trước ngày 28/10. Kết quả: các lô đang trên đường mà quá ngày đến dự kiến. Ô trống có thể vì nhiều lý do: lô hủy cũng không có ngày chạy."
    en: "① `atd IS NOT NULL`: the ship has sailed. ② `ata IS NULL`: no arrival recorded yet. ③ `eta < '2026-10-28'`: it should have arrived before 28 October. Result: the shipments still at sea past their planned arrival. A cell can be empty for several reasons: a cancelled shipment never sails either."
  mistake:
    sql: "SELECT ref, atd, eta FROM shipments WHERE atd IS NOT NULL AND ata = NULL AND eta < '2026-10-28' ORDER BY eta, ref"
    vi: "`ata = NULL` không bao giờ đúng, nên kết quả rỗng mà không báo lỗi. Viết `ata IS NULL`."
    en: "`ata = NULL` is never true, so the result is empty and nothing warns you. Write `ata IS NULL`."
  try:
    task:
      vi: "Lô nào chưa chạy (chưa có ngày tàu chạy thực tế) và không bị hủy? Mã lô, trạng thái và ngày tàu chạy dự kiến; ngày dự kiến sớm nhất lên đầu, bằng nhau thì theo mã lô."
      en: "Which shipments have not sailed yet (no actual departure) and are not cancelled? Shipment ref, status and planned departure; earliest planned departure first, then by shipment ref."
    starter: "SELECT ref, atd, eta FROM shipments WHERE atd IS NOT NULL AND ata IS NULL AND eta < '2026-10-28' ORDER BY eta, ref"
    solution: "SELECT ref, status, etd FROM shipments WHERE atd IS NULL AND status <> 'CANCELLED' ORDER BY etd, ref"
    ordered: true
  docs: https://www.postgresql.org/docs/current/functions-comparison.html

- id: case_when
  cues:
    vi: ["chia … nhóm", "ghi nhóm bằng số", "xếp mỗi … vào …"]
    en: ["fall into … groups", "write the group as a number", "put each … into …"]
  concept:
    vi: "CASE xếp mỗi dòng vào một nhóm theo điều kiện, như một chuỗi câu nếu… thì…. Postgres thử từng WHEN từ trên xuống và dừng ở điều kiện đúng đầu tiên; không điều kiện nào đúng thì lấy ELSE. Kết quả CASE là một cột mới, gom nhóm được."
    en: "CASE puts each row into a group by a condition, like a chain of if… then…. Postgres tries each WHEN from the top and stops at the first true one; if none is true it takes ELSE. The CASE result is a new column you can group by."
  example: "SELECT CASE WHEN gross_weight_kg < 1000 THEN 1 WHEN gross_weight_kg < 10000 THEN 2 ELSE 3 END AS size, count(*) FROM shipments WHERE booking_date >= '2026-10-01' AND booking_date < '2026-11-01' GROUP BY size ORDER BY size"
  explain:
    vi: "① `WHEN gross_weight_kg < 1000 THEN 1`: lô dưới 1 tấn vào nhóm 1. ② `WHEN … < 10000 THEN 2`: chỉ xét các lô còn lại, nên nhóm 2 là từ 1 đến dưới 10 tấn. ③ `ELSE 3`: còn lại. ④ `GROUP BY size`: đếm từng nhóm. Kết quả tháng 10/2026: 88, 276 và 425 lô."
    en: "① `WHEN gross_weight_kg < 1000 THEN 1`: shipments under 1 tonne go to group 1. ② `WHEN … < 10000 THEN 2`: only the remaining rows are checked, so group 2 is 1 to under 10 tonnes. ③ `ELSE 3`: the rest. ④ `GROUP BY size`: count each group. Result for October 2026: 88, 276 and 425 shipments."
  mistake:
    sql: "SELECT CASE WHEN gross_weight_kg < 10000 THEN 2 WHEN gross_weight_kg < 1000 THEN 1 ELSE 3 END AS size, count(*) FROM shipments WHERE booking_date >= '2026-10-01' AND booking_date < '2026-11-01' GROUP BY size ORDER BY size"
    vi: "Điều kiện rộng đứng trước: lô 500 kg đã khớp `< 10000` nên vào nhóm 2, nhóm 1 không bao giờ có dòng. Đặt điều kiện hẹp lên trước."
    en: "The wide condition comes first: a 500 kg shipment already matches `< 10000` and lands in group 2, so group 1 never gets a row. Put the narrow condition first."
  try:
    task:
      vi: "Chia các tờ khai nộp trong tháng 10/2026 theo trị giá khai báo: 1 là dưới 10.000 USD, 2 là từ 10.000 đến dưới 50.000 USD, 3 là từ 50.000 USD trở lên. Mỗi nhóm một dòng: số nhóm và số tờ khai, nhóm 1 lên đầu."
      en: "Split the declarations filed in October 2026 by declared value: 1 is under 10,000 USD, 2 is 10,000 to under 50,000 USD, 3 is 50,000 USD or more. One row per group: the group number and the number of declarations, group 1 first."
    starter: "SELECT CASE WHEN gross_weight_kg < 1000 THEN 1 WHEN gross_weight_kg < 10000 THEN 2 ELSE 3 END AS size, count(*) FROM shipments WHERE booking_date >= '2026-10-01' AND booking_date < '2026-11-01' GROUP BY size ORDER BY size"
    solution: "SELECT CASE WHEN declared_value_usd < 10000 THEN 1 WHEN declared_value_usd < 50000 THEN 2 ELSE 3 END AS band, count(*) FROM customs_declarations WHERE submitted_date >= '2026-10-01' AND submitted_date < '2026-11-01' GROUP BY band ORDER BY band"
    ordered: true
  docs: https://www.postgresql.org/docs/current/functions-conditional.html#FUNCTIONS-CASE

- id: conditional_agg
  cues:
    vi: ["mỗi … một cột", "đặt cạnh nhau", "bao nhiêu … và bao nhiêu …"]
    en: ["one column per …", "side by side", "how many … and how many …"]
  concept:
    vi: "Muốn nhiều con số theo điều kiện trên cùng một dòng, mỗi điều kiện một cột: đặt điều kiện vào chính hàm gộp. count(*) FILTER (WHERE …) chỉ đếm các dòng thỏa điều kiện đó, còn các cột khác vẫn thấy mọi dòng."
    en: "For several conditional numbers on one row, one column per condition, put the condition inside the aggregate itself. count(*) FILTER (WHERE …) counts only the rows that match it, while the other columns still see every row."
  example: "SELECT mode, count(*) AS total, count(*) FILTER (WHERE status = 'CANCELLED') AS cancelled FROM shipments WHERE booking_date >= '2026-10-01' AND booking_date < '2026-11-01' GROUP BY mode ORDER BY mode"
  explain:
    vi: "① `count(*)`: mọi lô của nhóm. ② `count(*) FILTER (WHERE status = 'CANCELLED')`: chỉ lô bị hủy, ngay trên cùng dòng. Kết quả tháng 10/2026: AIR 118 lô, hủy 5; SEA 671 lô, hủy 16. ③ Cách viết khác cùng ý: `SUM(CASE WHEN … THEN 1 ELSE 0 END)`."
    en: "① `count(*)`: every shipment in the group. ② `count(*) FILTER (WHERE status = 'CANCELLED')`: only the cancelled ones, on the same row. Result for October 2026: AIR 118 shipments, 5 cancelled; SEA 671, 16 cancelled. ③ Another way to write it: `SUM(CASE WHEN … THEN 1 ELSE 0 END)`."
  mistake:
    sql: "SELECT mode, count(*) AS total, count(*) AS cancelled FROM shipments WHERE booking_date >= '2026-10-01' AND booking_date < '2026-11-01' AND status = 'CANCELLED' GROUP BY mode ORDER BY mode"
    vi: "Đặt điều kiện hủy ở WHERE: mọi lô không hủy bị loại trước khi đếm, nên cột tổng cũng chỉ còn 5 và 16."
    en: "The cancelled condition in WHERE: every shipment that is not cancelled is dropped before counting, so the total column also shows only 5 and 16."
  try:
    task:
      vi: "Tháng 10/2026, theo hướng (xuất, nhập): số lô đường biển và số lô hàng không, mỗi phương thức một cột; hướng xếp theo thứ tự chữ cái."
      en: "In October 2026, per direction (export, import): the number of sea shipments and of air shipments, one column per mode; directions in alphabetical order."
    starter: "SELECT mode, count(*) AS total, count(*) FILTER (WHERE status = 'CANCELLED') AS cancelled FROM shipments WHERE booking_date >= '2026-10-01' AND booking_date < '2026-11-01' GROUP BY mode ORDER BY mode"
    solution: "SELECT direction, count(*) FILTER (WHERE mode = 'SEA') AS sea, count(*) FILTER (WHERE mode = 'AIR') AS air FROM shipments WHERE booking_date >= '2026-10-01' AND booking_date < '2026-11-01' GROUP BY direction ORDER BY direction"
  docs: https://www.postgresql.org/docs/current/sql-expressions.html#SYNTAX-AGGREGATES

- id: coalesce
  cues:
    vi: ["chưa có … thì tính …", "… tạm tính 0", "trống thì ghi …"]
    en: ["no … counted as …", "count those as 0", "if empty, use …"]
  concept:
    vi: "COALESCE(a, b) trả a nếu a có giá trị, còn a là NULL thì trả b. Dùng để thay ô trống bằng một giá trị mặc định (0, ngày dự kiến…) trước khi cộng, so sánh hay hiện ra. Mọi giá trị trong COALESCE phải cùng kiểu."
    en: "COALESCE(a, b) returns a when it has a value, and b when a is NULL. Use it to replace an empty cell with a default (0, a planned date…) before adding, comparing or showing it. Every value in COALESCE must have the same type."
  example: "SELECT ref, eta, ata, COALESCE(ata, eta) AS arrival FROM shipments WHERE eta >= '2026-10-29' AND eta < '2026-11-01' AND status <> 'CANCELLED' ORDER BY ref"
  explain:
    vi: "① `COALESCE(ata, eta)`: có ngày đến thực tế thì lấy, chưa có thì tạm lấy ngày đến dự kiến. ② Lô đã đến: `arrival` bằng `ata`; lô chưa đến: bằng `eta`. Kết quả: 86 lô dự kiến đến từ 29 đến 31/10/2026, không dòng nào trống ở cột cuối."
    en: "① `COALESCE(ata, eta)`: take the actual arrival if there is one, otherwise the planned arrival for now. ② Arrived shipments: `arrival` equals `ata`; the others: `eta`. Result: 86 shipments due from 29 to 31 October 2026, with no empty cell in the last column."
  mistake:
    sql: "SELECT ref, eta, ata, COALESCE(ata, 'none') AS arrival FROM shipments WHERE eta >= '2026-10-29' AND eta < '2026-11-01' AND status <> 'CANCELLED' ORDER BY ref"
    vi: "Trộn kiểu: `ata` là ngày còn `'none'` là chữ, nên Postgres báo lỗi invalid input syntax for type date. Giá trị thay thế phải cùng kiểu với cột."
    en: "Mixed types: `ata` is a date and `'none'` is text, so Postgres says invalid input syntax for type date. The fallback must have the same type as the column."
  try:
    task:
      vi: "Liệt kê mọi mã HS kèm thuế suất nhập khẩu; mã chưa có thuế suất thì ghi 0. Mã HS và thuế suất."
      en: "List every HS code with its import duty rate; a code with no rate shows 0. The HS code and the rate."
    starter: "SELECT h.code, t.import_duty_pct FROM hs_codes h LEFT JOIN duties_taxes t ON t.hs_code = h.code"
    solution: "SELECT h.code, COALESCE(t.import_duty_pct, 0) FROM hs_codes h LEFT JOIN duties_taxes t ON t.hs_code = h.code"
  docs: https://www.postgresql.org/docs/current/functions-conditional.html#FUNCTIONS-COALESCE-NVL-IFNULL

- id: self_join
  cues:
    vi: ["… mà nó thay thế", "ghi số … cũ", "người quản lý của …"]
    en: ["the one it replaces", "records the number of …", "the manager of …"]
  concept:
    vi: "Có bảng trỏ tới chính nó: nhân viên ghi mã người quản lý, cũng là một nhân viên. Muốn đặt hai dòng của cùng bảng cạnh nhau thì JOIN bảng đó với chính nó, đặt hai alias khác nhau để biết cột nào thuộc vai nào."
    en: "Some tables point to themselves: an employee records the id of their manager, who is also an employee. To put two rows of the same table side by side, JOIN the table to itself with two different aliases, so each column says which role it plays."
  example: "SELECT e.full_name, e.title, m.full_name AS manager FROM employees e JOIN employees m ON m.id = e.manager_id WHERE e.dept = 'Customs' ORDER BY e.full_name"
  explain:
    vi: "① `employees e`: nhân viên; `employees m`: cùng bảng, đóng vai người quản lý. ② `ON m.id = e.manager_id`: mã quản lý ghi trên nhân viên trỏ tới mã của người quản lý. Kết quả: 6 người phòng Hải quan; năm nhân viên chung một quản lý, còn quản lý phòng báo cáo lên giám đốc công ty."
    en: "① `employees e`: the employee; `employees m`: the same table, playing the manager. ② `ON m.id = e.manager_id`: the manager id on the employee points to the manager's id. Result: 6 people in Customs; five staff share one manager, and the department manager reports to the company director."
  mistake:
    sql: "SELECT e.full_name, e.title, m.full_name AS manager FROM employees e JOIN employees m ON m.manager_id = e.id WHERE e.dept = 'Customs' ORDER BY e.full_name"
    vi: "Ghép ngược chiều: `m.manager_id = e.id` tìm người mà `e` quản lý, không phải người quản lý `e`. Kết quả chỉ còn quản lý phòng, kèm năm nhân viên của họ."
    en: "Joined the wrong way round: `m.manager_id = e.id` finds the people `e` manages, not the manager of `e`. Only the department manager is left, listed with their five staff."
  try:
    task:
      vi: "Mỗi người quản lý có bao nhiêu nhân viên báo cáo trực tiếp? Tên người quản lý và số nhân viên."
      en: "How many direct reports does each manager have? The manager's name and the number of staff."
    starter: "SELECT e.full_name, e.title, m.full_name AS manager FROM employees e JOIN employees m ON m.id = e.manager_id WHERE e.dept = 'Customs' ORDER BY e.full_name"
    solution: "SELECT m.full_name, count(*) FROM employees e JOIN employees m ON m.id = e.manager_id GROUP BY m.id, m.full_name"
  docs: https://www.postgresql.org/docs/current/tutorial-join.html

- id: string_fn
  cues:
    vi: ["viết hoa toàn bộ", "bỏ … ở đầu …", "ghép … thành …"]
    en: ["in capitals", "upper-cased", "without the … prefix"]
  concept:
    vi: "Postgres có sẵn hàm xử lý chữ: upper và lower đổi hoa thường, length đếm ký tự, replace thay một đoạn, trim bỏ khoảng trắng hai đầu, và toán tử || ghép nhiều chữ thành một. Hàm trả về chữ mới; dữ liệu trong bảng không đổi."
    en: "Postgres has built-in text functions: upper and lower change case, length counts characters, replace swaps a piece of text, trim removes spaces at both ends, and the || operator joins pieces of text into one. Functions return new text; the data in the table is not changed."
  example: "SELECT code, upper(name) AS name_caps, length(name) AS letters, name || ' (' || country || ')' AS label FROM ports WHERE region = 'Europe' ORDER BY code"
  explain:
    vi: "① `upper(name)`: ANTWERP, HAMBURG… ② `length(name)`: số ký tự, Antwerp có 7. ③ `name || ' (' || country || ')'`: ghép tên và quốc gia thành một nhãn, như Antwerp (Belgium). Kết quả: 4 cảng châu Âu. Muốn bỏ một đoạn chỉ ở đầu chuỗi thì dùng `regexp_replace` với `^` (xem ví dụ mẫu của việc)."
    en: "① `upper(name)`: ANTWERP, HAMBURG… ② `length(name)`: the number of characters, 7 for Antwerp. ③ `name || ' (' || country || ')'`: joins name and country into one label, like Antwerp (Belgium). Result: 4 European ports. To drop a piece only at the start of the text, use `regexp_replace` with `^` (see the task's worked example)."
  mistake:
    sql: "SELECT code, upper(name) AS name_caps, length(name) AS letters, name + ' (' + country + ')' AS label FROM ports WHERE region = 'Europe' ORDER BY code"
    vi: "Ghép chữ bằng `+` như trong Excel hay một số ngôn ngữ khác: Postgres báo lỗi operator does not exist: text + unknown. Ghép chữ dùng `||`."
    en: "Joining text with `+` as in some other tools: Postgres says operator does not exist: text + unknown. Join text with `||`."
  try:
    task:
      vi: "Làm nhãn cho mọi hãng vận chuyển: một cột duy nhất gồm mã hãng, dấu cách, gạch ngang, dấu cách rồi tên hãng (ví dụ OSL - Oceanic Star Line)."
      en: "Make a label for every carrier: a single column with the carrier code, a space, a dash, a space, then the carrier name (for example OSL - Oceanic Star Line)."
    starter: "SELECT code, name FROM carriers"
    solution: "SELECT code || ' - ' || name FROM carriers"
  docs: https://www.postgresql.org/docs/current/functions-string.html

- id: pattern_match
  cues:
    vi: ["có chữ … ở bất kỳ đâu", "viết hoa hay thường đều tính", "bắt đầu bằng …"]
    en: ["anywhere in the …", "in capitals or lower case", "starts with …"]
  concept:
    vi: "LIKE so chữ theo mẫu: % thay cho một đoạn bất kỳ (kể cả rỗng), _ thay cho đúng một ký tự. LIKE phân biệt hoa thường; ILIKE thì không. '%cà phê%' nghĩa là có chữ đó ở bất kỳ đâu, 'Công ty%' nghĩa là bắt đầu bằng nó."
    en: "LIKE matches text against a pattern: % stands for any piece (even empty), _ for exactly one character. LIKE is case-sensitive; ILIKE is not. '%coffee%' means the word appears anywhere, 'Cong ty%' means the text starts with it."
  example: "SELECT code, description FROM hs_codes WHERE description ILIKE '%coffee%' ORDER BY code"
  explain:
    vi: "① `ILIKE '%coffee%'`: mô tả có chữ coffee ở bất kỳ đâu, hoa hay thường đều khớp. ② Kết quả: 2 mã HS, Coffee, not roasted và Coffee, roasted. ③ Cùng câu với `LIKE` thì ra 0 dòng, vì dữ liệu viết hoa chữ C."
    en: "① `ILIKE '%coffee%'`: the description has coffee anywhere, in any case. ② Result: 2 HS codes, Coffee, not roasted and Coffee, roasted. ③ The same query with `LIKE` returns 0 rows, because the data has a capital C."
  mistake:
    sql: "SELECT code, description FROM hs_codes WHERE description = '%coffee%' ORDER BY code"
    vi: "Dùng `=` với mẫu: `%` chỉ là ký tự thường với `=`, nên không mô tả nào bằng đúng chuỗi đó và kết quả rỗng. Mẫu cần `LIKE` hoặc `ILIKE`."
    en: "Using `=` with a pattern: `%` is an ordinary character for `=`, so no description equals that exact text and the result is empty. Patterns need `LIKE` or `ILIKE`."
  try:
    task:
      vi: "Khách nào ở Cần Thơ (thành phố ghi là Can Tho) có tên kết thúc bằng chữ Seafood? Tên khách và thành phố."
      en: "Which customers in Can Tho have a name ending in the word Seafood? The customer name and city."
    starter: "SELECT code, description FROM hs_codes WHERE description ILIKE '%coffee%' ORDER BY code"
    solution: "SELECT name, city FROM customers WHERE name LIKE '%Seafood' AND city = 'Can Tho'"
  docs: https://www.postgresql.org/docs/current/functions-matching.html#FUNCTIONS-LIKE

- id: distinct
  cues:
    vi: ["… khác nhau", "mỗi … một lần", "không trùng"]
    en: ["different …", "each … once", "no duplicates"]
  concept:
    vi: "DISTINCT bỏ các dòng trùng nhau trong kết quả. count(DISTINCT cột) đếm số giá trị khác nhau, không đếm số dòng: một khách gửi 10 lô vẫn chỉ tính là một khách."
    en: "DISTINCT removes duplicate rows from the result. count(DISTINCT column) counts the different values, not the rows: a customer with 10 shipments still counts as one customer."
  example: "SELECT carrier_id, count(*) AS shipments, count(DISTINCT customer_id) AS customers FROM shipments WHERE booking_date >= '2026-10-01' AND booking_date < '2026-11-01' GROUP BY carrier_id ORDER BY carrier_id"
  explain:
    vi: "① `count(*)`: số lô của mỗi hãng. ② `count(DISTINCT customer_id)`: số khách khác nhau đã gửi qua hãng đó. Kết quả tháng 10/2026: 9 hãng; hãng 1 có 114 lô nhưng chỉ 76 khách. ③ `SELECT DISTINCT industry FROM customers`: mỗi ngành một dòng."
    en: "① `count(*)`: the shipments of each carrier. ② `count(DISTINCT customer_id)`: the different customers who shipped with it. Result for October 2026: 9 carriers; carrier 1 has 114 shipments but only 76 customers. ③ `SELECT DISTINCT industry FROM customers`: one row per industry."
  mistake:
    sql: "SELECT carrier_id, count(*) AS shipments, count(customer_id) AS customers FROM shipments WHERE booking_date >= '2026-10-01' AND booking_date < '2026-11-01' GROUP BY carrier_id ORDER BY carrier_id"
    vi: "Quên DISTINCT: `count(customer_id)` đếm mọi dòng có mã khách, nên cột khách bằng đúng cột số lô (114 thay vì 76)."
    en: "DISTINCT is missing: `count(customer_id)` counts every row with a customer id, so the customer column equals the shipment column (114 instead of 76)."
  try:
    task:
      vi: "Khách của công ty thuộc những ngành nào? Mỗi ngành một dòng."
      en: "Which industries do our customers belong to? One row per industry."
    starter: "SELECT industry FROM customers"
    solution: "SELECT DISTINCT industry FROM customers"
  docs: https://www.postgresql.org/docs/current/queries-select-lists.html#QUERIES-DISTINCT

- id: cast
  cues:
    vi: ["tính bằng phần trăm", "làm tròn … chữ số", "tỷ lệ …"]
    en: ["as a percentage", "rounded to … decimals", "… rate …"]
  concept:
    vi: "Số nguyên chia số nguyên ra số nguyên: Postgres bỏ phần lẻ, 118 * 100 / 789 ra 14 chứ không phải 14,96. Đổi một vế sang numeric trước khi chia bằng ::numeric thì giữ được phần lẻ; ROUND(x, 2) làm tròn 2 chữ số."
    en: "An integer divided by an integer is an integer: Postgres drops the fraction, so 118 * 100 / 789 gives 14, not 14.96. Turn one side into numeric with ::numeric before dividing to keep the fraction; ROUND(x, 2) rounds to 2 decimals."
  example: "SELECT count(*) FILTER (WHERE mode = 'AIR') AS air, count(*) AS total, ROUND(count(*) FILTER (WHERE mode = 'AIR')::numeric * 100 / count(*), 2) AS air_pct FROM shipments WHERE booking_date >= '2026-10-01' AND booking_date < '2026-11-01'"
  explain:
    vi: "① `count(*) FILTER (…)::numeric`: đổi số lô hàng không sang numeric trước khi chia. ② `* 100 / count(*)`: tỷ lệ phần trăm. ③ `ROUND(…, 2)`: làm tròn 2 chữ số. Kết quả tháng 10/2026: 118 trên 789 lô, 14.96%. Đổi kiểu khác: `'2026-10-31'::date`, `'42'::int`."
    en: "① `count(*) FILTER (…)::numeric`: turns the air count into numeric before dividing. ② `* 100 / count(*)`: the percentage. ③ `ROUND(…, 2)`: rounds to 2 decimals. Result for October 2026: 118 of 789 shipments, 14.96%. Other casts: `'2026-10-31'::date`, `'42'::int`."
  mistake:
    sql: "SELECT count(*) FILTER (WHERE mode = 'AIR') AS air, count(*) AS total, count(*) FILTER (WHERE mode = 'AIR') * 100 / count(*) AS air_pct FROM shipments WHERE booking_date >= '2026-10-01' AND booking_date < '2026-11-01'"
    vi: "Thiếu `::numeric`: hai số nguyên chia nhau, phần lẻ bị bỏ mà không báo lỗi, ra 14 thay vì 14.96."
    en: "No `::numeric`: two integers divided, the fraction is dropped without a warning, giving 14 instead of 14.96."
  try:
    task:
      vi: "Trong các lô đường biển đặt tháng 10/2026, theo hướng (xuất, nhập): tỷ lệ phần trăm lô nguyên container (FCL), làm tròn 2 chữ số. Hướng và tỷ lệ."
      en: "Among the sea shipments booked in October 2026, per direction (export, import): the percentage of full-container (FCL) shipments, rounded to 2 decimals. The direction and the percentage."
    starter: "SELECT direction, count(*) FILTER (WHERE load_type = 'FCL') * 100 / count(*) FROM shipments WHERE mode = 'SEA' AND booking_date >= '2026-10-01' AND booking_date < '2026-11-01' GROUP BY direction"
    solution: "SELECT direction, ROUND(count(*) FILTER (WHERE load_type = 'FCL')::numeric * 100 / count(*), 2) FROM shipments WHERE mode = 'SEA' AND booking_date >= '2026-10-01' AND booking_date < '2026-11-01' GROUP BY direction"
  docs: https://www.postgresql.org/docs/current/sql-expressions.html#SQL-SYNTAX-TYPE-CASTS

- id: scalar_subquery
  cues:
    vi: ["hơn mức trung bình …", "so … với một con số …", "cao hơn mức …"]
    en: ["more than the average …", "compare each … with one number", "above the …"]
  concept:
    vi: "Truy vấn con (subquery) là một câu SELECT đặt trong ngoặc bên trong câu khác. Truy vấn con trả đúng một giá trị thì dùng được như một con số: so sánh trong WHERE, hiện trong SELECT. Postgres tính nó trước, rồi đem kết quả so với từng dòng."
    en: "A subquery is a SELECT in parentheses inside another query. A subquery that returns exactly one value can be used like a number: compared in WHERE, shown in SELECT. Postgres works it out first, then compares every row with the result."
  example: "SELECT ref, gross_weight_kg FROM shipments WHERE mode = 'AIR' AND booking_date >= '2026-10-25' AND gross_weight_kg > (SELECT AVG(gross_weight_kg) FROM shipments WHERE mode = 'AIR') ORDER BY gross_weight_kg DESC, ref"
  explain:
    vi: "① `(SELECT AVG(gross_weight_kg) FROM shipments WHERE mode = 'AIR')`: trọng lượng trung bình của mọi lô hàng không, khoảng 1.007 kg. ② `gross_weight_kg > (…)`: so từng lô với con số đó. Kết quả: 13 lô hàng không đặt từ 25/10/2026 nặng hơn mức trung bình. Chạy riêng truy vấn con để xem con số."
    en: "① `(SELECT AVG(gross_weight_kg) FROM shipments WHERE mode = 'AIR')`: the average weight of all air shipments, about 1,007 kg. ② `gross_weight_kg > (…)`: compares each shipment with that number. Result: 13 air shipments booked from 25 October 2026 heavier than the average. Run the subquery alone to see the number."
  mistake:
    sql: "SELECT ref, gross_weight_kg FROM shipments WHERE mode = 'AIR' AND booking_date >= '2026-10-25' AND gross_weight_kg > AVG(gross_weight_kg) ORDER BY gross_weight_kg DESC, ref"
    vi: "Đặt hàm gộp thẳng vào WHERE: Postgres báo lỗi aggregate functions are not allowed in WHERE. Con số trung bình phải tính trong một truy vấn con riêng."
    en: "An aggregate put straight into WHERE: Postgres says aggregate functions are not allowed in WHERE. The average has to come from its own subquery."
  try:
    task:
      vi: "Cảng nào có số ngày đi chuẩn lớn hơn mức trung bình của mọi cảng? Tên cảng và số ngày đi."
      en: "Which ports have more standard transit days than the average of all ports? The port name and the transit days."
    starter: "SELECT ref, gross_weight_kg FROM shipments WHERE mode = 'AIR' AND booking_date >= '2026-10-25' AND gross_weight_kg > (SELECT AVG(gross_weight_kg) FROM shipments WHERE mode = 'AIR') ORDER BY gross_weight_kg DESC, ref"
    solution: "SELECT name, base_transit_days FROM ports WHERE base_transit_days > (SELECT AVG(base_transit_days) FROM ports)"
  docs: https://www.postgresql.org/docs/current/sql-expressions.html#SQL-SYNTAX-SCALAR-SUBQUERIES

- id: in_subquery
  cues:
    vi: ["những khách gửi hơn …", "khách chủ lực", "thuộc danh sách …"]
    en: ["the customers with more than …", "key account", "on the list of …"]
  concept:
    vi: "IN (truy vấn con) giữ các dòng có giá trị nằm trong một danh sách do câu khác tính ra. Truy vấn con chỉ được trả đúng một cột. Dùng khi điều kiện nằm ở bảng khác mà bạn không cần lấy cột nào của bảng đó."
    en: "IN (subquery) keeps the rows whose value is in a list computed by another query. The subquery must return exactly one column. Use it when the condition lives in another table and you need none of that table's columns."
  example: "SELECT quote_no, quote_date, sell_usd FROM quotations WHERE customer_id IN (SELECT id FROM customers WHERE city = 'Can Tho') AND quote_date >= '2026-10-20' ORDER BY quote_no"
  explain:
    vi: "① `(SELECT id FROM customers WHERE city = 'Can Tho')`: danh sách mã các khách ở Cần Thơ. ② `customer_id IN (…)`: chỉ giữ báo giá của các khách đó. ③ `AND quote_date >= '2026-10-20'`: báo giá từ 20/10/2026. Kết quả: 20 báo giá."
    en: "① `(SELECT id FROM customers WHERE city = 'Can Tho')`: the list of ids of customers in Can Tho. ② `customer_id IN (…)`: keep only those customers' quotes. ③ `AND quote_date >= '2026-10-20'`: quotes from 20 October 2026. Result: 20 quotes."
  mistake:
    sql: "SELECT quote_no, quote_date, sell_usd FROM quotations WHERE customer_id IN (SELECT id, name FROM customers WHERE city = 'Can Tho') AND quote_date >= '2026-10-20' ORDER BY quote_no"
    vi: "Truy vấn con trả hai cột: Postgres báo lỗi subquery has too many columns. Sau IN chỉ để đúng cột cần so."
    en: "The subquery returns two columns: Postgres says subquery has too many columns. After IN, keep only the column being compared."
  try:
    task:
      vi: "Các lô đặt ngày 15/10/2026 đi tới một cảng ở châu Âu (vùng ghi là Europe): mã lô và mã cảng đến."
      en: "The shipments booked on 15 October 2026 going to a port in Europe: shipment ref and destination port code."
    starter: "SELECT quote_no, quote_date, sell_usd FROM quotations WHERE customer_id IN (SELECT id FROM customers WHERE city = 'Can Tho') AND quote_date >= '2026-10-20' ORDER BY quote_no"
    solution: "SELECT ref, pod FROM shipments WHERE pod IN (SELECT code FROM ports WHERE region = 'Europe') AND booking_date = '2026-10-15'"
  docs: https://www.postgresql.org/docs/current/functions-subquery.html#FUNCTIONS-SUBQUERY-IN

- id: exists
  cues:
    vi: ["chưa có booking nào", "chưa … nào", "có ít nhất một …"]
    en: ["no booking at all", "have not … anything", "at least one …"]
  concept:
    vi: "EXISTS (truy vấn con) đúng khi truy vấn con trả ít nhất một dòng; NOT EXISTS đúng khi nó không trả dòng nào. Truy vấn con thường nhắc tới cột của dòng bên ngoài, nên được kiểm lại cho từng dòng. Chọn cột gì trong đó không quan trọng, hay viết SELECT 1."
    en: "EXISTS (subquery) is true when the subquery returns at least one row; NOT EXISTS is true when it returns none. The subquery usually refers to the outer row's columns, so it is checked again for every row. What it selects does not matter; SELECT 1 is common."
  example: "SELECT s.ref, s.booking_date FROM shipments s WHERE s.booking_date >= '2026-10-28' AND NOT EXISTS (SELECT 1 FROM quotations q WHERE q.shipment_id = s.id) ORDER BY s.ref"
  explain:
    vi: "① `NOT EXISTS (SELECT 1 FROM quotations q WHERE q.shipment_id = s.id)`: với từng lô, tìm báo giá gắn với nó; không có cái nào thì giữ lô. ② `q.shipment_id = s.id`: truy vấn con nhắc tới `s` của câu ngoài. Kết quả: 59 lô đặt từ 28/10/2026 không đi theo báo giá nào."
    en: "① `NOT EXISTS (SELECT 1 FROM quotations q WHERE q.shipment_id = s.id)`: for each shipment, look for a quote linked to it; keep the shipment if there is none. ② `q.shipment_id = s.id`: the subquery refers to the outer `s`. Result: 59 shipments booked from 28 October 2026 that came from no quote."
  mistake:
    sql: "SELECT s.ref, s.booking_date FROM shipments s WHERE s.booking_date >= '2026-10-28' AND s.id NOT IN (SELECT shipment_id FROM quotations) ORDER BY s.ref"
    vi: "Dùng `NOT IN` khi danh sách có ô trống: nhiều báo giá chưa thành booking nên `shipment_id` là NULL, và `NOT IN` gặp NULL thì không bao giờ đúng. Kết quả 0 dòng, không báo lỗi. Dùng `NOT EXISTS`."
    en: "`NOT IN` on a list with empty cells: many quotes never became a booking, so their `shipment_id` is NULL, and `NOT IN` with a NULL is never true. The result has 0 rows and no warning. Use `NOT EXISTS`."
  try:
    task:
      vi: "Khách nào ở Hải Phòng (thành phố ghi là Hai Phong) có ít nhất một lô hàng không đặt từ 01/10/2026? Tên khách."
      en: "Which customers in Hai Phong have at least one air shipment booked from 1 October 2026? The customer name."
    starter: "SELECT s.ref, s.booking_date FROM shipments s WHERE s.booking_date >= '2026-10-28' AND NOT EXISTS (SELECT 1 FROM quotations q WHERE q.shipment_id = s.id) ORDER BY s.ref"
    solution: "SELECT c.name FROM customers c WHERE c.city = 'Hai Phong' AND EXISTS (SELECT 1 FROM shipments s WHERE s.customer_id = c.id AND s.mode = 'AIR' AND s.booking_date >= '2026-10-01')"
  docs: https://www.postgresql.org/docs/current/functions-subquery.html#FUNCTIONS-SUBQUERY-EXISTS

- id: correlated_value
  cues:
    vi: ["còn hiệu lực vào …", "… của chính …", "… vào đúng ngày …"]
    en: ["in force on …", "of its own …", "on the … date"]
  concept:
    vi: "Truy vấn con tương quan (correlated subquery) nhắc tới cột của dòng bên ngoài, nên Postgres tính lại nó cho từng dòng. Đặt trong SELECT, nó tra một giá trị riêng cho mỗi dòng: lần đặt hàng gần nhất của khách này, giá còn hiệu lực vào ngày của dòng này."
    en: "A correlated subquery refers to a column of the outer row, so Postgres works it out again for every row. Placed in SELECT, it looks up one value per row: this customer's latest booking, the rate in force on this row's date."
  example: "SELECT c.name, (SELECT max(s.booking_date) FROM shipments s WHERE s.customer_id = c.id) AS last_booking FROM customers c WHERE c.city = 'Dong Nai' ORDER BY c.name"
  explain:
    vi: "① Câu ngoài: mỗi khách ở Đồng Nai một dòng. ② `(SELECT max(s.booking_date) … WHERE s.customer_id = c.id)`: với khách của dòng đó, ngày đặt chỗ gần nhất. ③ Truy vấn con phải trả đúng một giá trị mỗi dòng. Kết quả: 21 khách, mỗi khách một ngày riêng."
    en: "① The outer query: one row per customer in Dong Nai. ② `(SELECT max(s.booking_date) … WHERE s.customer_id = c.id)`: that row's customer's latest booking date. ③ The subquery must return exactly one value per row. Result: 21 customers, each with its own date."
  mistake:
    sql: "SELECT c.name, (SELECT max(s.booking_date) FROM shipments s) AS last_booking FROM customers c WHERE c.city = 'Dong Nai' ORDER BY c.name"
    vi: "Quên điều kiện nối với dòng ngoài: truy vấn con tính một lần cho cả bảng, nên khách nào cũng nhận cùng một ngày (ngày đặt chỗ mới nhất của cả công ty)."
    en: "The link to the outer row is missing: the subquery runs once for the whole table, so every customer gets the same date (the company's latest booking)."
  try:
    task:
      vi: "Với mỗi cảng ở châu Âu (vùng ghi là Europe): tên cảng và tổng số lô có cảng đến là cảng đó."
      en: "For each port in Europe: the port name and the total number of shipments whose destination is that port."
    starter: "SELECT c.name, (SELECT max(s.booking_date) FROM shipments s WHERE s.customer_id = c.id) AS last_booking FROM customers c WHERE c.city = 'Dong Nai' ORDER BY c.name"
    solution: "SELECT p.name, (SELECT count(*) FROM shipments s WHERE s.pod = p.code) FROM ports p WHERE p.region = 'Europe'"
  docs: https://www.postgresql.org/docs/current/sql-expressions.html#SQL-SYNTAX-SCALAR-SUBQUERIES

- id: cte
  cues:
    vi: ["bước có tên", "tổng … trừ tổng …", "trước hết tính …"]
    en: ["named steps", "minus the total …", "first work out …"]
  concept:
    vi: "WITH đặt tên cho một bước trung gian (CTE): WITH ten AS (SELECT …) rồi câu chính dùng ten như một bảng. Câu dài được chia thành bước nhỏ, đọc từ trên xuống, chạy thử từng bước được. Bước đó chỉ tồn tại trong câu này."
    en: "WITH names an intermediate step (a CTE): WITH name AS (SELECT …), then the main query uses name like a table. A long query becomes small steps you read top to bottom and can test one by one. The step only exists inside this query."
  example: "WITH oct AS (SELECT customer_id, count(*) AS n FROM shipments WHERE booking_date >= '2026-10-01' AND booking_date < '2026-11-01' GROUP BY customer_id) SELECT c.name, oct.n FROM oct JOIN customers c ON c.id = oct.customer_id WHERE oct.n >= 20 ORDER BY oct.n DESC, c.name"
  explain:
    vi: "① `WITH oct AS (…)`: bước 1, số lô mỗi khách trong tháng 10/2026. ② `FROM oct JOIN customers c`: câu chính đọc `oct` như một bảng và nối lấy tên khách. ③ `WHERE oct.n >= 20`: lọc trên cột đã tính ở bước 1. Kết quả: 2 khách, nhiều nhất 82 lô."
    en: "① `WITH oct AS (…)`: step 1, the shipments per customer in October 2026. ② `FROM oct JOIN customers c`: the main query reads `oct` like a table and joins the customer name. ③ `WHERE oct.n >= 20`: filters on the column step 1 computed. Result: 2 customers, the top one with 82 shipments."
  mistake:
    sql: "WITH oct AS (SELECT customer_id, count(*) AS n FROM shipments WHERE booking_date >= '2026-10-01' AND booking_date < '2026-11-01' GROUP BY customer_id), SELECT c.name, oct.n FROM oct JOIN customers c ON c.id = oct.customer_id WHERE oct.n >= 20 ORDER BY oct.n DESC, c.name"
    vi: "Dấu phẩy thừa trước câu chính: Postgres báo lỗi syntax error at or near \"SELECT\". Dấu phẩy chỉ dùng để nối bước này với bước sau."
    en: "An extra comma before the main query: Postgres reports syntax error at or near \"SELECT\". The comma only joins one step to the next."
  try:
    task:
      vi: "Bước 1: tổng tiền hóa đơn mỗi khách xuất trong tháng 10/2026. Câu chính: tên khách và tổng đó, chỉ khách có tổng trên 1 tỷ đồng."
      en: "Step 1: each customer's invoice total issued in October 2026. Main query: the customer name and that total, only customers above 1 billion dong."
    starter: "WITH oct AS (SELECT customer_id, count(*) AS n FROM shipments WHERE booking_date >= '2026-10-01' AND booking_date < '2026-11-01' GROUP BY customer_id) SELECT c.name, oct.n FROM oct JOIN customers c ON c.id = oct.customer_id WHERE oct.n >= 20 ORDER BY oct.n DESC, c.name"
    solution: "WITH t AS (SELECT customer_id, SUM(amount_vnd) AS total FROM invoices WHERE issue_date >= '2026-10-01' AND issue_date < '2026-11-01' GROUP BY customer_id) SELECT c.name, t.total FROM t JOIN customers c ON c.id = t.customer_id WHERE t.total > 1000000000"
  docs: https://www.postgresql.org/docs/current/queries-with.html

- id: multi_cte
  cues:
    vi: ["các bước có tên", "cao hơn mức trung bình của …", "từ kết quả bước …"]
    en: ["named steps", "than the average of …", "from the result of …"]
  concept:
    vi: "Một WITH có thể có nhiều bước, cách nhau bằng dấu phẩy; bước sau đọc được kết quả của bước trước. Hay dùng khi cần một con số tính từ chính kết quả trung gian, ví dụ trung bình của các tổng vừa tính."
    en: "One WITH can hold several steps separated by commas; a later step can read an earlier step's result. Handy when you need a number computed from the intermediate result itself, such as the average of the totals you just worked out."
  example: "WITH m AS (SELECT date_trunc('month', issue_date)::date AS month, SUM(amount_vnd) AS total FROM invoices WHERE issue_date >= '2026-04-01' AND issue_date < '2026-10-01' GROUP BY 1), a AS (SELECT AVG(total) AS avg_total FROM m) SELECT m.month, m.total FROM m, a WHERE m.total > a.avg_total ORDER BY m.month"
  explain:
    vi: "① `m`: tổng hóa đơn mỗi tháng từ 4 đến 9/2026. ② `a`: đọc `m`, tính trung bình của 6 tổng đó. ③ `FROM m, a`: `a` chỉ có một dòng nên ghép được với mọi tháng. Kết quả: 5 tháng cao hơn trung bình; tháng 4 thấp vì sổ hóa đơn bắt đầu từ tháng đó."
    en: "① `m`: the invoice total per month from April to September 2026. ② `a`: reads `m` and averages those 6 totals. ③ `FROM m, a`: `a` has one row, so it pairs with every month. Result: 5 months above the average; April is low because invoicing starts that month."
  mistake:
    sql: "WITH m AS (SELECT date_trunc('month', issue_date)::date AS month, SUM(amount_vnd) AS total FROM invoices WHERE issue_date >= '2026-04-01' AND issue_date < '2026-10-01' GROUP BY 1) WITH a AS (SELECT AVG(total) AS avg_total FROM m) SELECT m.month, m.total FROM m, a WHERE m.total > a.avg_total ORDER BY m.month"
    vi: "Viết `WITH` hai lần: Postgres báo lỗi syntax error at or near \"WITH\". Chỉ một `WITH` ở đầu, các bước nối bằng dấu phẩy."
    en: "Writing `WITH` twice: Postgres reports syntax error at or near \"WITH\". Use one `WITH` at the top and join the steps with commas."
  try:
    task:
      vi: "Bước 1: số lô mỗi khách đặt trong tháng 10/2026. Bước 2: số lô nhiều nhất của bước 1. Câu chính: tên khách và số lô của các khách có số lô bằng mức nhiều nhất đó."
      en: "Step 1: the shipments per customer booked in October 2026. Step 2: the highest count from step 1. Main query: the customer name and count of the customers whose count equals that highest one."
    starter: "WITH m AS (SELECT date_trunc('month', issue_date)::date AS month, SUM(amount_vnd) AS total FROM invoices WHERE issue_date >= '2026-04-01' AND issue_date < '2026-10-01' GROUP BY 1), a AS (SELECT AVG(total) AS avg_total FROM m) SELECT m.month, m.total FROM m, a WHERE m.total > a.avg_total ORDER BY m.month"
    solution: "WITH n AS (SELECT customer_id, count(*) AS n FROM shipments WHERE booking_date >= '2026-10-01' AND booking_date < '2026-11-01' GROUP BY customer_id), top AS (SELECT max(n) AS n FROM n) SELECT c.name, n.n FROM n JOIN top ON top.n = n.n JOIN customers c ON c.id = n.customer_id"
  docs: https://www.postgresql.org/docs/current/queries-with.html

- id: distinct_on
  cues:
    vi: ["… gần nhất trước đó", "mới nhất của mỗi …", "một dòng cho mỗi …"]
    en: ["the latest earlier …", "the newest … per …", "latest … before …"]
  concept:
    vi: "DISTINCT ON (cột) giữ đúng một dòng cho mỗi giá trị của cột đó: dòng đứng đầu theo ORDER BY. ORDER BY phải bắt đầu bằng chính cột trong DISTINCT ON, rồi tới tiêu chí chọn dòng (mới nhất thì DESC). Đây là cách viết riêng của Postgres."
    en: "DISTINCT ON (column) keeps exactly one row per value of that column: the first one by ORDER BY. ORDER BY must start with the DISTINCT ON column itself, then the rule that picks the row (DESC for the newest). This is Postgres' own syntax."
  example: "SELECT DISTINCT ON (s.ref) s.ref, e.event, e.event_date FROM shipment_events e JOIN shipments s ON s.id = e.shipment_id WHERE s.booking_date = '2026-09-01' ORDER BY s.ref, e.event_date DESC"
  explain:
    vi: "① `DISTINCT ON (s.ref)`: mỗi lô một dòng. ② `ORDER BY s.ref, e.event_date DESC`: trong mỗi lô, mốc mới nhất đứng đầu nên được giữ. Kết quả: 28 lô đặt ngày 01/09/2026, mỗi lô kèm mốc gần nhất (phần lớn là DELIVERED). Cần tiêu chí phụ khi hai dòng cùng ngày."
    en: "① `DISTINCT ON (s.ref)`: one row per shipment. ② `ORDER BY s.ref, e.event_date DESC`: within each shipment the newest milestone comes first, so it is kept. Result: 28 shipments booked on 1 September 2026, each with its latest milestone (mostly DELIVERED). Add a tie-breaker when two rows share a date."
  mistake:
    sql: "SELECT DISTINCT ON (s.ref) s.ref, e.event, e.event_date FROM shipment_events e JOIN shipments s ON s.id = e.shipment_id WHERE s.booking_date = '2026-09-01' ORDER BY e.event_date DESC"
    vi: "ORDER BY không bắt đầu bằng cột của DISTINCT ON: Postgres báo lỗi SELECT DISTINCT ON expressions must match initial ORDER BY expressions."
    en: "ORDER BY does not start with the DISTINCT ON column: Postgres says SELECT DISTINCT ON expressions must match initial ORDER BY expressions."
  try:
    task:
      vi: "Hóa đơn mới nhất của mỗi khách: mã khách, số hóa đơn và ngày xuất. Hai hóa đơn cùng ngày thì lấy số hóa đơn nhỏ hơn."
      en: "Each customer's newest invoice: customer id, invoice number and issue date. If two invoices share the date, take the smaller invoice number."
    starter: "SELECT DISTINCT ON (s.ref) s.ref, e.event, e.event_date FROM shipment_events e JOIN shipments s ON s.id = e.shipment_id WHERE s.booking_date = '2026-09-01' ORDER BY s.ref, e.event_date DESC"
    solution: "SELECT DISTINCT ON (customer_id) customer_id, invoice_no, issue_date FROM invoices ORDER BY customer_id, issue_date DESC, invoice_no"
  docs: https://www.postgresql.org/docs/current/sql-select.html#SQL-DISTINCT

- id: union
  cues:
    vi: ["chung một danh sách", "gom … vào một danh sách", "hai sổ …"]
    en: ["in one list", "into one list", "two different books"]
  concept:
    vi: "UNION ALL nối kết quả của hai câu SELECT thành một danh sách, câu này nằm dưới câu kia. Hai câu phải có cùng số cột, cùng kiểu theo thứ tự. UNION (không ALL) còn bỏ các dòng trùng. ORDER BY viết một lần ở cuối, áp cho cả danh sách."
    en: "UNION ALL stacks the results of two SELECTs into one list, one under the other. Both must have the same number of columns, with matching types in order. UNION (without ALL) also removes duplicate rows. ORDER BY goes once at the end and sorts the whole list."
  example: "SELECT code, name, 'PORT' AS kind FROM ports WHERE country = 'Vietnam' UNION ALL SELECT code, name, 'CARRIER' FROM carriers ORDER BY kind, code"
  explain:
    vi: "① Câu trên: 5 cảng Việt Nam, cột thứ ba là chữ cố định `'PORT'`. ② Câu dưới: 9 hãng, cột thứ ba `'CARRIER'`. ③ Tên cột lấy theo câu đầu (`kind`). Kết quả: 14 dòng. Cột chữ cố định cho biết mỗi dòng đến từ đâu."
    en: "① The top query: 5 Vietnamese ports, the third column is the fixed text `'PORT'`. ② The bottom query: 9 carriers, third column `'CARRIER'`. ③ Column names come from the first query (`kind`). Result: 14 rows. The fixed text column tells where each row came from."
  mistake:
    sql: "SELECT code, name, 'PORT' AS kind FROM ports WHERE country = 'Vietnam' UNION ALL SELECT code, name FROM carriers ORDER BY kind, code"
    vi: "Hai câu khác số cột: Postgres báo lỗi each UNION query must have the same number of columns."
    en: "The two queries have different column counts: Postgres says each UNION query must have the same number of columns."
  try:
    task:
      vi: "Mọi cảng xuất hiện trong các lô đặt ngày 15/10/2026, là cảng đi hay cảng đến đều tính; mỗi cảng chỉ một lần. Một cột mã cảng."
      en: "Every port used by the shipments booked on 15 October 2026, as loading or destination port; each port only once. One column, the port code."
    starter: "SELECT code, name, 'PORT' AS kind FROM ports WHERE country = 'Vietnam' UNION ALL SELECT code, name, 'CARRIER' FROM carriers ORDER BY kind, code"
    solution: "SELECT pol FROM shipments WHERE booking_date = '2026-10-15' UNION SELECT pod FROM shipments WHERE booking_date = '2026-10-15'"
  docs: https://www.postgresql.org/docs/current/queries-union.html

- id: except
  cues:
    vi: ["mà đến nay chưa có …", "có trong … mà không có trong …", "… mà chưa …"]
    en: ["still have no …", "in … but not in …", "but never …"]
  concept:
    vi: "A EXCEPT B trả các dòng có trong kết quả A mà không có trong kết quả B, và bỏ dòng trùng. Thứ tự quan trọng: B EXCEPT A là câu hỏi khác. Hai câu phải cùng số cột, cùng kiểu, như UNION."
    en: "A EXCEPT B returns the rows in A's result that are not in B's, without duplicates. Order matters: B EXCEPT A is a different question. Both queries need the same columns and types, as with UNION."
  example: "SELECT customer_id FROM shipments WHERE booking_date >= '2026-09-01' AND booking_date < '2026-10-01' EXCEPT SELECT customer_id FROM shipments WHERE booking_date >= '2026-10-01' AND booking_date < '2026-11-01' ORDER BY 1"
  explain:
    vi: "① Câu trên: khách có booking trong tháng 9/2026. ② `EXCEPT`: bỏ đi những khách có trong câu dưới. ③ Câu dưới: khách có booking trong tháng 10/2026. Kết quả: 17 khách đặt hàng tháng 9 mà tháng 10 im lặng. Đảo hai câu thì ra 8 khách mới của tháng 10."
    en: "① The top query: customers with a booking in September 2026. ② `EXCEPT`: remove those found in the bottom query. ③ The bottom query: customers with a booking in October 2026. Result: 17 customers who booked in September but went quiet in October. Swap the two and you get 8 new October customers."
  mistake:
    sql: "SELECT customer_id FROM shipments WHERE booking_date >= '2026-10-01' AND booking_date < '2026-11-01' EXCEPT SELECT customer_id FROM shipments WHERE booking_date >= '2026-09-01' AND booking_date < '2026-10-01' ORDER BY 1"
    vi: "Đảo thứ tự hai câu: kết quả thành khách mới của tháng 10 (8 khách), không phải khách bỏ đi. Câu có danh sách cần giữ đứng trước `EXCEPT`."
    en: "The two queries swapped: the result becomes October's new customers (8), not the ones who left. The list you keep goes before `EXCEPT`."
  try:
    task:
      vi: "Hãng nào chưa từng có vận đơn chủ nào? Mã hãng."
      en: "Which carriers have no master bill at all? The carrier code."
    starter: "SELECT customer_id FROM shipments WHERE booking_date >= '2026-09-01' AND booking_date < '2026-10-01' EXCEPT SELECT customer_id FROM shipments WHERE booking_date >= '2026-10-01' AND booking_date < '2026-11-01' ORDER BY 1"
    solution: "SELECT code FROM carriers EXCEPT SELECT c.code FROM carriers c JOIN master_bills m ON m.carrier_id = c.id"
  docs: https://www.postgresql.org/docs/current/queries-union.html

- id: full_join
  cues:
    vi: ["chỉ có ở một bên", "đối chiếu …", "… khớp nhau"]
    en: ["on one side only", "reconcile …", "… agree …"]
  concept:
    vi: "FULL JOIN giữ mọi dòng của cả hai bên: dòng ghép được thì nằm chung, dòng chỉ có ở một bên vẫn có mặt, cột của bên kia để trống (NULL). Dùng để đối chiếu hai danh sách lệch nhau. COALESCE gộp khóa của hai bên thành một cột."
    en: "FULL JOIN keeps every row from both sides: matched rows sit together, a row found on one side only still appears, with the other side's columns empty (NULL). Use it to reconcile two lists that do not quite agree. COALESCE merges both sides' keys into one column."
  example: "SELECT COALESCE(t.shipment_id, r.shipment_id) AS shipment_id, t.order_date, r.received_date FROM (SELECT shipment_id, order_date FROM trucking_orders WHERE order_date BETWEEN '2026-10-01' AND '2026-10-02') t FULL JOIN (SELECT shipment_id, received_date FROM cfs_receipts WHERE received_date BETWEEN '2026-10-01' AND '2026-10-02') r ON r.shipment_id = t.shipment_id ORDER BY 1"
  explain:
    vi: "① `t`: lệnh xe tải ngày 1–2/10/2026; `r`: phiếu nhập kho cùng hai ngày. ② `FULL JOIN … ON r.shipment_id = t.shipment_id`: ghép theo lô, giữ cả lô chỉ có ở một bên. ③ `COALESCE(t.shipment_id, r.shipment_id)`: mã lô của bên nào có. Kết quả: 37 dòng, phần lớn chỉ có ở một bên."
    en: "① `t`: trucking orders on 1–2 October 2026; `r`: warehouse receipts on the same days. ② `FULL JOIN … ON r.shipment_id = t.shipment_id`: matches by shipment and keeps shipments found on one side only. ③ `COALESCE(t.shipment_id, r.shipment_id)`: the shipment id from whichever side has it. Result: 37 rows, most of them on one side only."
  mistake:
    sql: "SELECT COALESCE(t.shipment_id, r.shipment_id) AS shipment_id, t.order_date, r.received_date FROM (SELECT shipment_id, order_date FROM trucking_orders WHERE order_date BETWEEN '2026-10-01' AND '2026-10-02') t LEFT JOIN (SELECT shipment_id, received_date FROM cfs_receipts WHERE received_date BETWEEN '2026-10-01' AND '2026-10-02') r ON r.shipment_id = t.shipment_id ORDER BY 1"
    vi: "Dùng `LEFT JOIN`: phiếu nhập kho không có lệnh xe cùng kỳ bị mất, nên đối chiếu chỉ thấy một chiều."
    en: "Using `LEFT JOIN`: receipts with no trucking order in the period disappear, so the check only sees one direction."
  try:
    task:
      vi: "Sửa ví dụ để chỉ giữ các lô có ở một bên: có lệnh xe mà không có phiếu nhập kho, hoặc ngược lại."
      en: "Change the example to keep only the shipments found on one side: a trucking order with no receipt, or the other way round."
    starter: "SELECT COALESCE(t.shipment_id, r.shipment_id) AS shipment_id, t.order_date, r.received_date FROM (SELECT shipment_id, order_date FROM trucking_orders WHERE order_date BETWEEN '2026-10-01' AND '2026-10-02') t FULL JOIN (SELECT shipment_id, received_date FROM cfs_receipts WHERE received_date BETWEEN '2026-10-01' AND '2026-10-02') r ON r.shipment_id = t.shipment_id ORDER BY 1"
    solution: "SELECT COALESCE(t.shipment_id, r.shipment_id) AS shipment_id, t.order_date, r.received_date FROM (SELECT shipment_id, order_date FROM trucking_orders WHERE order_date BETWEEN '2026-10-01' AND '2026-10-02') t FULL JOIN (SELECT shipment_id, received_date FROM cfs_receipts WHERE received_date BETWEEN '2026-10-01' AND '2026-10-02') r ON r.shipment_id = t.shipment_id WHERE t.shipment_id IS NULL OR r.shipment_id IS NULL ORDER BY 1"
  docs: https://www.postgresql.org/docs/current/queries-table-expressions.html#QUERIES-JOIN

- id: window_rank
  cues:
    vi: ["cùng hạng", "… nhảy hạng", "… hạng đầu"]
    en: ["share a rank", "skips ranks", "top … ranks"]
  concept:
    vi: "Hàm cửa sổ (window function) tính trên một nhóm dòng mà không gộp các dòng lại: mỗi dòng vẫn còn, kèm thêm một cột. RANK() OVER (PARTITION BY nhóm ORDER BY tiêu chí) xếp hạng trong từng nhóm; bằng nhau thì cùng hạng và hạng kế tiếp bị nhảy."
    en: "A window function works over a group of rows without collapsing them: every row stays, with one more column. RANK() OVER (PARTITION BY group ORDER BY rule) ranks inside each group; ties share a rank and the next rank is skipped."
  example: "SELECT region, name, base_transit_days, RANK() OVER (PARTITION BY region ORDER BY base_transit_days DESC) AS rk FROM ports ORDER BY region, rk, name"
  explain:
    vi: "① `PARTITION BY region`: xếp hạng riêng trong từng vùng. ② `ORDER BY base_transit_days DESC`: xa nhất hạng 1. ③ Ở châu Á, Ningbo và Shanghai cùng 5 ngày nên cùng hạng 3, cảng sau nhảy lên hạng 5. Kết quả: 24 cảng, không dòng nào bị gộp. Không muốn nhảy hạng: `DENSE_RANK()`; luôn khác nhau: `ROW_NUMBER()`."
    en: "① `PARTITION BY region`: a separate ranking in each region. ② `ORDER BY base_transit_days DESC`: the farthest is rank 1. ③ In Asia, Ningbo and Shanghai both take 5 days, so both are rank 3 and the next port is rank 5. Result: 24 ports, no row collapsed. No skipped ranks: `DENSE_RANK()`; always distinct: `ROW_NUMBER()`."
  mistake:
    sql: "SELECT region, name, base_transit_days FROM ports WHERE RANK() OVER (PARTITION BY region ORDER BY base_transit_days DESC) <= 2"
    vi: "Lọc hàm cửa sổ ngay trong WHERE: Postgres báo lỗi window functions are not allowed in WHERE. Tính hạng trong một bước WITH, rồi lọc ở câu chính."
    en: "Filtering a window function in WHERE: Postgres says window functions are not allowed in WHERE. Compute the rank in a WITH step, then filter in the main query."
  try:
    task:
      vi: "Chỉ giữ các cảng đứng trong 2 hạng đầu của vùng mình (theo số ngày đi, xa nhất trước; cùng số ngày thì cùng hạng). Vùng, tên cảng, số ngày và hạng; xếp theo vùng, hạng, rồi tên cảng."
      en: "Keep only the ports within the top 2 ranks of their region (by transit days, farthest first; equal days share a rank). Region, port name, days and rank; sorted by region, rank, then port name."
    starter: "SELECT region, name, base_transit_days, RANK() OVER (PARTITION BY region ORDER BY base_transit_days DESC) AS rk FROM ports ORDER BY region, rk, name"
    solution: "WITH r AS (SELECT region, name, base_transit_days, RANK() OVER (PARTITION BY region ORDER BY base_transit_days DESC) AS rk FROM ports) SELECT region, name, base_transit_days, rk FROM r WHERE rk <= 2 ORDER BY region, rk, name"
    ordered: true
  docs: https://www.postgresql.org/docs/current/tutorial-window.html

- id: window_lag
  cues:
    vi: ["so với tháng liền trước", "tăng giảm so với …", "… liền trước"]
    en: ["on the month just before", "the change on …", "… just before"]
  concept:
    vi: "LAG(cột) OVER (ORDER BY …) lấy giá trị của dòng đứng ngay trước theo thứ tự đã cho; LEAD lấy dòng ngay sau. Dòng đầu không có dòng trước nên ra NULL. Lấy giá trị hiện tại trừ LAG là ra mức tăng giảm."
    en: "LAG(column) OVER (ORDER BY …) takes the value of the row just before in the given order; LEAD takes the row just after. The first row has no previous row, so it gets NULL. The current value minus LAG is the change."
  example: "WITH d AS (SELECT booking_date, count(*) AS n FROM shipments WHERE booking_date BETWEEN '2026-10-01' AND '2026-10-07' GROUP BY booking_date) SELECT booking_date, n, LAG(n) OVER (ORDER BY booking_date) AS prev, n - LAG(n) OVER (ORDER BY booking_date) AS change FROM d ORDER BY booking_date"
  explain:
    vi: "① `d`: số booking mỗi ngày từ 1 đến 7/10/2026. ② `LAG(n) OVER (ORDER BY booking_date)`: số của ngày liền trước. ③ `n - LAG(n) …`: tăng giảm. Ngày 01/10 có 23 booking và `prev` trống; ngày 02/10 có 30, tăng 7. Kết quả: 7 dòng."
    en: "① `d`: bookings per day from 1 to 7 October 2026. ② `LAG(n) OVER (ORDER BY booking_date)`: the previous day's number. ③ `n - LAG(n) …`: the change. 1 October has 23 bookings and an empty `prev`; 2 October has 30, up 7. Result: 7 rows."
  mistake:
    sql: "WITH d AS (SELECT booking_date, count(*) AS n FROM shipments WHERE booking_date BETWEEN '2026-10-01' AND '2026-10-07' GROUP BY booking_date) SELECT booking_date, n, LAG(n) OVER (ORDER BY booking_date DESC) AS prev, n - LAG(n) OVER (ORDER BY booking_date DESC) AS change FROM d ORDER BY booking_date"
    vi: "Thứ tự trong OVER bị đảo (`DESC`): \"dòng trước\" thành ngày hôm sau, nên mức tăng giảm ngược dấu và lệch một ngày. Thứ tự trong OVER quyết định dòng nào là dòng trước, không phải ORDER BY cuối câu."
    en: "The order inside OVER is reversed (`DESC`): the \"previous row\" becomes the next day, so the change has the wrong sign and is one day off. The order inside OVER decides the previous row, not the final ORDER BY."
  try:
    task:
      vi: "Tổng tiền hóa đơn mỗi tháng (theo ngày xuất) và mức tăng giảm so với tháng liền trước. Tháng (ngày đầu tháng), tổng và mức tăng giảm; tháng sớm nhất lên đầu."
      en: "The invoice total per month (by issue date) and the change on the month just before. Month (its first day), total and change; earliest month first."
    starter: "WITH d AS (SELECT booking_date, count(*) AS n FROM shipments WHERE booking_date BETWEEN '2026-10-01' AND '2026-10-07' GROUP BY booking_date) SELECT booking_date, n, LAG(n) OVER (ORDER BY booking_date) AS prev, n - LAG(n) OVER (ORDER BY booking_date) AS change FROM d ORDER BY booking_date"
    solution: "WITH m AS (SELECT date_trunc('month', issue_date)::date AS month, SUM(amount_vnd) AS total FROM invoices GROUP BY 1) SELECT month, total, total - LAG(total) OVER (ORDER BY month) FROM m ORDER BY month"
    ordered: true
  docs: https://www.postgresql.org/docs/current/functions-window.html

- id: window_agg
  cues:
    vi: ["cộng dồn", "… tới đâu rồi", "tính đến … này"]
    en: ["running total", "so far", "up to that …"]
  concept:
    vi: "Hàm gộp quen thuộc (SUM, AVG, COUNT) cũng dùng được như hàm cửa sổ. SUM(x) OVER (ORDER BY ngày) cộng dồn từ dòng đầu tới dòng hiện tại; SUM(x) OVER () là tổng của mọi dòng, đặt cạnh từng dòng để tính phần trăm."
    en: "The usual aggregates (SUM, AVG, COUNT) also work as window functions. SUM(x) OVER (ORDER BY date) is a running total from the first row to the current one; SUM(x) OVER () is the total of every row, placed next to each row to work out a share."
  example: "WITH d AS (SELECT booking_date, count(*) AS n FROM shipments WHERE booking_date BETWEEN '2026-10-01' AND '2026-10-07' GROUP BY booking_date) SELECT booking_date, n, SUM(n) OVER (ORDER BY booking_date) AS running, ROUND(n * 100.0 / SUM(n) OVER (), 1) AS pct FROM d ORDER BY booking_date"
  explain:
    vi: "① `SUM(n) OVER (ORDER BY booking_date)`: cộng dồn: 23, 53, 80… ② `SUM(n) OVER ()`: tổng cả tuần, giống nhau ở mọi dòng. ③ `n * 100.0 / …`: phần của từng ngày, ngày 01/10 là 13.6%. Thêm `PARTITION BY` để cộng dồn riêng cho từng khách. Kết quả: 7 dòng."
    en: "① `SUM(n) OVER (ORDER BY booking_date)`: a running total: 23, 53, 80… ② `SUM(n) OVER ()`: the whole week's total, the same on every row. ③ `n * 100.0 / …`: each day's share, 13.6% for 1 October. Add `PARTITION BY` to keep a separate running total per customer. Result: 7 rows."
  mistake:
    sql: "WITH d AS (SELECT booking_date, count(*) AS n FROM shipments WHERE booking_date BETWEEN '2026-10-01' AND '2026-10-07' GROUP BY booking_date) SELECT booking_date, n, SUM(n) OVER () AS running, ROUND(n * 100.0 / SUM(n) OVER (), 1) AS pct FROM d ORDER BY booking_date"
    vi: "Thiếu `ORDER BY` trong OVER: mọi dòng nhận tổng cả tuần chứ không cộng dồn. Cộng dồn cần thứ tự."
    en: "No `ORDER BY` inside OVER: every row gets the whole week's total instead of a running total. A running total needs an order."
  try:
    task:
      vi: "Các hóa đơn của khách mã 42 xuất từ 01/07/2026: số hóa đơn, ngày xuất, số tiền và tổng cộng dồn theo ngày xuất (cùng ngày thì theo số hóa đơn). Xếp theo ngày xuất rồi số hóa đơn."
      en: "The invoices of customer 42 issued from 1 July 2026: invoice number, issue date, amount and the running total by issue date (same date: by invoice number). Sorted by issue date, then invoice number."
    starter: "WITH d AS (SELECT booking_date, count(*) AS n FROM shipments WHERE booking_date BETWEEN '2026-10-01' AND '2026-10-07' GROUP BY booking_date) SELECT booking_date, n, SUM(n) OVER (ORDER BY booking_date) AS running, ROUND(n * 100.0 / SUM(n) OVER (), 1) AS pct FROM d ORDER BY booking_date"
    solution: "SELECT invoice_no, issue_date, amount_vnd, SUM(amount_vnd) OVER (ORDER BY issue_date, invoice_no) FROM invoices WHERE customer_id = 42 AND issue_date >= '2026-07-01' ORDER BY issue_date, invoice_no"
    ordered: true
  docs: https://www.postgresql.org/docs/current/tutorial-window.html

- id: explain_read
  cues:
    vi: ["kế hoạch thực thi", "… qua chỉ mục …", "định làm gì"]
    en: ["execution plan", "through the … index", "what it plans to do"]
  concept:
    vi: "Trước khi chạy, Postgres lập kế hoạch thực thi (execution plan): đọc bảng nào, theo cách nào, nối ra sao. Tab EXPLAIN vẽ kế hoạch đó thành cây, đọc từ dưới lên. Seq Scan là đọc cả bảng; Index Scan hay Bitmap Index Scan là tra qua chỉ mục (index), chỉ đọc dòng cần."
    en: "Before running a query, Postgres makes an execution plan: which tables to read, how, and how to join them. The EXPLAIN tab draws that plan as a tree, read from the bottom up. Seq Scan reads the whole table; Index Scan or Bitmap Index Scan looks rows up through an index, reading only what it needs."
  example: "SELECT ref, booking_date, mode FROM shipments WHERE customer_id = 7 AND booking_date >= '2026-09-01' ORDER BY booking_date DESC, ref"
  explain:
    vi: "① Chạy ví dụ rồi mở tab EXPLAIN. ② Bước dưới cùng: `Bitmap Index Scan on shipments_customer_id_idx`: tra các lô của khách 7 qua chỉ mục theo khách. ③ Bước trên: `Sort` xếp 21 dòng theo ngày. Mỗi bước ghi số dòng ước tính và chi phí (cost): con số để so, không phải mili giây."
    en: "① Run the example, then open the EXPLAIN tab. ② The bottom step: `Bitmap Index Scan on shipments_customer_id_idx`: looks up customer 7's shipments through the customer index. ③ The step above: `Sort` orders the 21 rows by date. Each step shows estimated rows and a cost: a number to compare, not milliseconds."
  mistake:
    sql: "EXPLAIN SELECT ref, booking_date, mode FROM shipments WHERE customer_id = 7 AND booking_date >= '2026-09-01' ORDER BY booking_date DESC, ref"
    vi: "Tự gõ `EXPLAIN` vào câu: kết quả thành các dòng chữ của kế hoạch chứ không còn là danh sách lô, nên nộp sẽ sai. Chạy câu bình thường rồi xem tab EXPLAIN."
    en: "Typing `EXPLAIN` into the query: the result becomes lines of plan text instead of the shipment list, so a submit fails. Run the plain query and look at the EXPLAIN tab."
  try:
    task:
      vi: "Các lô hàng không của khách mã 15: mã lô và mã cảng đến, xếp theo mã lô. Chạy xong, xem tab EXPLAIN có tra qua chỉ mục theo khách không."
      en: "The air shipments of customer 15: shipment ref and destination port code, sorted by ref. Then check in the EXPLAIN tab whether it uses the customer index."
    starter: "SELECT ref, booking_date, mode FROM shipments WHERE customer_id = 7 AND booking_date >= '2026-09-01' ORDER BY booking_date DESC, ref"
    solution: "SELECT ref, pod FROM shipments WHERE customer_id = 15 AND mode = 'AIR' ORDER BY ref"
    ordered: true
  docs: https://www.postgresql.org/docs/current/using-explain.html

- id: sargable
  cues:
    vi: ["chỉ mục không dùng được", "không đọc cả bảng", "cắt ngày … rồi mới so"]
    en: ["the index cannot be used", "not the whole table", "trims each date …"]
  concept:
    vi: "Chỉ mục trên một cột chỉ giúp được khi điều kiện so chính cột đó với một giá trị. Bọc cột trong hàm (date_trunc, extract, ::text…) thì Postgres phải tính hàm cho mọi dòng rồi mới so, nên đọc cả bảng. Viết lại thành khoảng giá trị trên cột trần."
    en: "An index on a column only helps when the condition compares that bare column with a value. Wrap the column in a function (date_trunc, extract, ::text…) and Postgres must compute it for every row before comparing, so it reads the whole table. Rewrite it as a range on the bare column."
  example: "SELECT ref, booking_date FROM shipments WHERE booking_date >= '2026-10-01' AND booking_date < '2026-10-03' ORDER BY booking_date, ref"
  explain:
    vi: "① `booking_date >= '2026-10-01' AND booking_date < '2026-10-03'`: khoảng nửa mở trên cột trần. ② Tab EXPLAIN: `Bitmap Index Scan on shipments_booking_date_idx`, chi phí khoảng 111. ③ Viết `date_trunc('month', booking_date) = '2026-10-01'` thì kế hoạch thành `Seq Scan`, chi phí 685. Kết quả: 53 lô."
    en: "① `booking_date >= '2026-10-01' AND booking_date < '2026-10-03'`: a half-open range on the bare column. ② EXPLAIN tab: `Bitmap Index Scan on shipments_booking_date_idx`, cost about 111. ③ Writing `date_trunc('month', booking_date) = '2026-10-01'` turns the plan into a `Seq Scan`, cost 685. Result: 53 shipments."
  mistake:
    sql: "SELECT ref, booking_date FROM shipments WHERE extract(day FROM booking_date) <= 2 AND extract(month FROM booking_date) = 10 ORDER BY booking_date, ref"
    vi: "Cắt ngày bằng `extract`: chỉ mục không dùng được, và còn sai vì gộp cả ngày 1–2/10/2025. Giữ cột trần, so với một khoảng ngày."
    en: "Cutting the date with `extract`: the index cannot be used, and it is also wrong because it picks up 1–2 October 2025 too. Keep the bare column and compare it with a date range."
  try:
    task:
      vi: "Các lô đặt trong tháng 9/2026: mã lô và ngày đặt chỗ; xếp theo ngày đặt chỗ rồi mã lô. Viết sao cho tab EXPLAIN dùng chỉ mục ngày đặt chỗ."
      en: "The shipments booked in September 2026: shipment ref and booking date; sorted by booking date, then ref. Write it so the EXPLAIN tab uses the booking date index."
    starter: "SELECT ref, booking_date FROM shipments WHERE booking_date >= '2026-10-01' AND booking_date < '2026-10-03' ORDER BY booking_date, ref"
    solution: "SELECT ref, booking_date FROM shipments WHERE booking_date >= '2026-09-01' AND booking_date < '2026-10-01' ORDER BY booking_date, ref"
    ordered: true
  docs: https://www.postgresql.org/docs/current/indexes-types.html

- id: index_design
  cues:
    vi: ["đề xuất một chỉ mục", "… không phải đọc toàn bộ …", "chưa có chỉ mục nào theo …"]
    en: ["propose one index", "does not have to read the whole …", "no index by …"]
  concept:
    vi: "Chọn chỉ mục theo câu truy vấn hay chạy: cột trong điều kiện bằng (=) là ứng viên đầu tiên. Chỉ mục nhiều cột thì đặt các cột so bằng trước, cột so khoảng (>=, BETWEEN) sau. Chỉ mục làm đọc nhanh nhưng ghi chậm hơn và tốn chỗ, nên chỉ thêm khi có câu cần."
    en: "Pick an index from the queries that run often: a column in an equality (=) condition is the first candidate. In a multi-column index put the equality columns first and the range column (>=, BETWEEN) last. Indexes speed up reads but slow down writes and take space, so add one only when a query needs it."
  example: "SELECT pay_date, amount_vnd FROM payments WHERE invoice_id = 100 ORDER BY pay_date"
  explain:
    vi: "① Câu tra các lần trả của một hóa đơn, chạy mỗi lần mở hóa đơn. ② Tab EXPLAIN: `Seq Scan on payments`, đọc hết 4.582 dòng để lấy 1 dòng, vì chưa có chỉ mục nào theo `invoice_id`. ③ Một chỉ mục trên `payments (invoice_id)` sẽ đổi bước đó thành tra qua chỉ mục."
    en: "① The query looks up an invoice's payments, run every time an invoice is opened. ② EXPLAIN tab: `Seq Scan on payments`, reading all 4,582 rows to return 1, because there is no index by `invoice_id`. ③ An index on `payments (invoice_id)` would turn that step into an index lookup."
  mistake:
    sql: "SELECT pay_date, amount_vnd FROM payments WHERE invoice_id::text LIKE '100%' ORDER BY pay_date"
    vi: "So cột dưới dạng chữ (`invoice_id::text`): cột bị bọc trong phép đổi kiểu nên chỉ mục không dùng được, và mẫu còn khớp cả hóa đơn 1000, 1001… Giữ cột trần: `invoice_id = 100`."
    en: "Comparing the column as text (`invoice_id::text`): the cast wraps the column so the index cannot be used, and the pattern also matches invoices 1000, 1001… Keep the column bare: `invoice_id = 100`."
  try:
    task:
      vi: "Màn hình tra giá mua cần: hợp đồng cước còn hiệu lực ngày 15/10/2026 cho tuyến cảng đi VNDAD, cảng đến NLRTM, container 40HC. Lấy mã hợp đồng và giá mua. Nghĩ xem chỉ mục nào phục vụ câu này: ba cột so bằng trước, cột ngày sau."
      en: "The buy-rate screen needs the freight contract in force on 15 October 2026 for loading port VNDAD, destination NLRTM, container 40HC. Get the contract id and buy rate. Think about which index serves it: the three equality columns first, the date column last."
    starter: "SELECT pay_date, amount_vnd FROM payments WHERE invoice_id = 100 ORDER BY pay_date"
    solution: "SELECT id, buy_usd FROM rate_contracts WHERE pol = 'VNDAD' AND pod = 'NLRTM' AND container_type = '40HC' AND DATE '2026-10-15' BETWEEN valid_from AND valid_to"
  docs: https://www.postgresql.org/docs/current/indexes-multicolumn.html
````

## Phụ lục C · `content/general/sql.yml` (114 drill)

Task 4.

````yaml
# Drill phần Chung theo kỹ năng (Plan 8a): 3 mỗi kỹ năng (faded, open, trap). Dữ liệu: schema `lab` (src/db/lab.sql).

# ---- select (ch1)
- id: g-select-1
  skill: select
  kind: faded
  task: { vi: "Lấy tên và danh mục của mọi sản phẩm.", en: "Get the name and the category of every product." }
  starter: "SELECT ___, ___ FROM products"
  solution: "SELECT name, category FROM products"
  hint: { vi: "Hai cột cần lấy là `name` và `category`, cách nhau bằng dấu phẩy.", en: "The two columns are `name` and `category`, separated by a comma." }
- id: g-select-2
  skill: select
  kind: open
  task: { vi: "Mỗi cửa hàng: tên, thành phố và ngày khai trương, theo đúng thứ tự cột đó.", en: "For each store: the name, the city and the opening date, in that column order." }
  solution: "SELECT name, city, opened_on FROM stores"
  hint: { vi: "Bảng `stores` có cột `opened_on` là ngày khai trương.", en: "The `stores` table has `opened_on` for the opening date." }
- id: g-select-3
  skill: select
  kind: trap
  task: { vi: "Lấy mã và tên của mọi khách hàng, chỉ hai cột đó.", en: "Get the id and the name of every customer, only those two columns." }
  solution: "SELECT id, name FROM customers"
  hint: { vi: "Liệt kê đúng hai cột `id`, `name`.", en: "List exactly the two columns `id`, `name`." }
  wrong:
    - { sql: "SELECT * FROM customers", vi: "`*` lấy mọi cột của bảng, nên kết quả thừa cột so với yêu cầu.", en: "`*` takes every column of the table, so the result has more columns than asked." }

# ---- where (ch1)
- id: g-where-1
  skill: where
  kind: faded
  task: { vi: "Sản phẩm nào giá trên 100.000 đồng? Lấy tên và giá.", en: "Which products cost more than 100,000 VND? Get the name and the price." }
  starter: "SELECT name, price_vnd FROM products WHERE ___"
  solution: "SELECT name, price_vnd FROM products WHERE price_vnd > 100000"
  hint: { vi: "So sánh `price_vnd` với một con số.", en: "Compare `price_vnd` with a number." }
- id: g-where-2
  skill: where
  kind: open
  task: { vi: "Khách ở `Hanoi` sinh sau năm 1990: lấy tên và năm sinh.", en: "Customers in `Hanoi` born after 1990: get the name and the birth year." }
  solution: "SELECT name, birth_year FROM customers WHERE city = 'Hanoi' AND birth_year > 1990"
  hint: { vi: "Hai điều kiện trên `city` và `birth_year` phải cùng đúng.", en: "Both conditions, on `city` and on `birth_year`, must hold." }
- id: g-where-3
  skill: where
  kind: trap
  task: { vi: "Đơn bán qua kênh `ONLINE` của cửa hàng 1 hoặc cửa hàng 2: lấy mã đơn và mã cửa hàng.", en: "Orders sold through the `ONLINE` channel at store 1 or store 2: get the order id and the store id." }
  solution: "SELECT id, store_id FROM orders WHERE channel = 'ONLINE' AND (store_id = 1 OR store_id = 2)"
  hint: { vi: "Khi trộn AND với OR, đặt phần \"cửa hàng 1 hoặc 2\" trong ngoặc.", en: "When mixing AND with OR, put the \"store 1 or 2\" part in parentheses." }
  wrong:
    - { sql: "SELECT id, store_id FROM orders WHERE channel = 'ONLINE' AND store_id = 1 OR store_id = 2", vi: "Không có ngoặc thì AND được tính trước: bạn lấy mọi đơn của cửa hàng 2, kể cả đơn bán tại quầy.", en: "Without parentheses AND is evaluated first: you get every order of store 2, in-store ones included." }

# ---- order_by (ch1)
- id: g-order-by-1
  skill: order_by
  kind: faded
  task: { vi: "Mọi sản phẩm: tên và giá, đắt nhất lên đầu; cùng giá thì theo tên A→Z.", en: "Every product: name and price, most expensive first; on the same price, by name A→Z." }
  starter: "SELECT name, price_vnd FROM products ORDER BY ___"
  solution: "SELECT name, price_vnd FROM products ORDER BY price_vnd DESC, name"
  ordered: true
  hint: { vi: "Sắp theo `price_vnd` giảm dần (DESC), rồi theo `name`.", en: "Sort by `price_vnd` descending (DESC), then by `name`." }
- id: g-order-by-2
  skill: order_by
  kind: open
  task: { vi: "Mọi nhân viên: tên và ngày vào làm, người vào sớm nhất lên đầu; cùng ngày thì mã nhân viên nhỏ hơn trước.", en: "Every staff member: name and hire date, earliest first; on the same date, the smaller staff id first." }
  solution: "SELECT name, hired_on FROM staff ORDER BY hired_on, id"
  ordered: true
  hint: { vi: "Ngày sớm hơn là nhỏ hơn, nên sắp tăng dần theo `hired_on`, rồi `id`.", en: "An earlier date is smaller, so sort ascending by `hired_on`, then `id`." }
- id: g-order-by-3
  skill: order_by
  kind: trap
  task: { vi: "Mọi sản phẩm: danh mục, tên, giá; xếp theo danh mục A→Z, trong mỗi danh mục thì đắt nhất lên đầu.", en: "Every product: category, name, price; sorted by category A→Z, and within each category the most expensive first." }
  solution: "SELECT category, name, price_vnd FROM products ORDER BY category, price_vnd DESC"
  ordered: true
  hint: { vi: "Mỗi cột trong ORDER BY có chiều riêng: DESC chỉ áp cho cột đứng ngay trước nó.", en: "Each column in ORDER BY has its own direction: DESC applies only to the column right before it." }
  wrong:
    - { sql: "SELECT category, name, price_vnd FROM products ORDER BY category, price_vnd", vi: "Thiếu DESC sau `price_vnd`: trong mỗi danh mục, rẻ nhất lại lên đầu.", en: "DESC is missing after `price_vnd`: within each category the cheapest comes first." }

# ---- limit (ch1)
- id: g-limit-1
  skill: limit
  kind: faded
  task: { vi: "5 sản phẩm đắt nhất: tên và giá, đắt nhất lên đầu.", en: "The 5 most expensive products: name and price, most expensive first." }
  starter: "SELECT name, price_vnd FROM products ORDER BY price_vnd DESC LIMIT ___"
  solution: "SELECT name, price_vnd FROM products ORDER BY price_vnd DESC LIMIT 5"
  ordered: true
  hint: { vi: "Sắp xếp đã có sẵn; chỉ cần nói giữ bao nhiêu dòng đầu.", en: "The sort is already there; just say how many top rows to keep." }
- id: g-limit-2
  skill: limit
  kind: open
  task: { vi: "3 khách đăng ký sớm nhất: tên và ngày đăng ký; cùng ngày thì mã khách nhỏ hơn trước.", en: "The 3 earliest customers to sign up: name and signup date; on the same date, the smaller customer id first." }
  solution: "SELECT name, signup_date FROM customers ORDER BY signup_date, id LIMIT 3"
  ordered: true
  hint: { vi: "Sắp theo `signup_date` rồi `id`, sau đó chỉ giữ 3 dòng.", en: "Sort by `signup_date` then `id`, then keep only 3 rows." }
- id: g-limit-3
  skill: limit
  kind: trap
  task: { vi: "10 đơn mới nhất: mã đơn và ngày đặt, mới nhất lên đầu; cùng ngày thì mã đơn lớn hơn trước.", en: "The 10 latest orders: order id and order date, latest first; on the same date, the larger order id first." }
  solution: "SELECT id, order_date FROM orders ORDER BY order_date DESC, id DESC LIMIT 10"
  ordered: true
  hint: { vi: "\"Mới nhất\" chỉ có nghĩa sau khi đã sắp xếp theo ngày.", en: "\"Latest\" only means something after sorting by date." }
  wrong:
    - { sql: "SELECT id, order_date FROM orders LIMIT 10", vi: "LIMIT không có ORDER BY lấy 10 dòng bất kỳ, không phải 10 đơn mới nhất.", en: "LIMIT without ORDER BY takes any 10 rows, not the 10 latest orders." }

# ---- aggregate (ch2)
- id: g-aggregate-1
  skill: aggregate
  kind: faded
  task: { vi: "Có tất cả bao nhiêu đơn, ngày đặt đầu tiên và ngày đặt gần nhất là ngày nào? Một dòng, ba con số.", en: "How many orders are there, and what are the first and the latest order dates? One row, three values." }
  starter: "SELECT ___(*), min(order_date), ___(order_date) FROM orders"
  solution: "SELECT count(*), min(order_date), max(order_date) FROM orders"
  hint: { vi: "Một hàm đếm dòng, một hàm lấy giá trị lớn nhất.", en: "One function counts rows, one takes the largest value." }
- id: g-aggregate-2
  skill: aggregate
  kind: open
  task: { vi: "Với các sản phẩm danh mục `Snacks`: giá trung bình (làm tròn tới đồng) và giá cao nhất.", en: "For the products in the `Snacks` category: the average price (rounded to the whole dong) and the highest price." }
  solution: "SELECT round(avg(price_vnd)), max(price_vnd) FROM products WHERE category = 'Snacks'"
  hint: { vi: "Lọc danh mục trước, rồi dùng hàm trung bình (bọc trong `round`) và hàm lớn nhất.", en: "Filter the category first, then use the average (wrapped in `round`) and the maximum." }
- id: g-aggregate-3
  skill: aggregate
  kind: trap
  task: { vi: "Có bao nhiêu khách hàng đã để lại email?", en: "How many customers have left an email?" }
  solution: "SELECT count(email) FROM customers"
  hint: { vi: "Hàm đếm trên một cột bỏ qua ô trống của cột đó.", en: "Counting a column skips the empty values of that column." }
  wrong:
    - { sql: "SELECT count(*) FROM customers", vi: "`count(*)` đếm mọi dòng, kể cả khách chưa có email.", en: "`count(*)` counts every row, customers without an email included." }

# ---- group_by (ch2)
- id: g-group-by-1
  skill: group_by
  kind: faded
  task: { vi: "Mỗi danh mục có bao nhiêu sản phẩm? Lấy danh mục và số sản phẩm.", en: "How many products does each category have? Get the category and the product count." }
  starter: "SELECT category, count(*) FROM products GROUP BY ___"
  solution: "SELECT category, count(*) FROM products GROUP BY category"
  hint: { vi: "Gom theo đúng cột đứng ngoài hàm gộp trong SELECT.", en: "Group by the column that sits outside the aggregate in SELECT." }
- id: g-group-by-2
  skill: group_by
  kind: open
  task: { vi: "Mỗi cửa hàng có bao nhiêu đơn đã thanh toán (`PAID`)? Lấy mã cửa hàng và số đơn.", en: "How many paid (`PAID`) orders does each store have? Get the store id and the order count." }
  solution: "SELECT store_id, count(*) FROM orders WHERE status = 'PAID' GROUP BY store_id"
  hint: { vi: "Lọc trạng thái trước, rồi gom theo `store_id`.", en: "Filter the status first, then group by `store_id`." }
- id: g-group-by-3
  skill: group_by
  kind: trap
  task: { vi: "Số đơn cho mỗi cặp kênh bán và trạng thái: lấy kênh, trạng thái, số đơn.", en: "The order count for each pair of channel and status: get the channel, the status and the count." }
  solution: "SELECT channel, status, count(*) FROM orders GROUP BY channel, status"
  hint: { vi: "Mọi cột trong SELECT nằm ngoài hàm gộp đều phải có trong GROUP BY.", en: "Every SELECT column outside an aggregate must be in GROUP BY." }
  wrong:
    - { sql: "SELECT channel, status, count(*) FROM orders GROUP BY channel", vi: "`status` không có trong GROUP BY, nên Postgres báo lỗi: nó không biết lấy trạng thái nào cho mỗi kênh.", en: "`status` is not in GROUP BY, so Postgres raises an error: it cannot tell which status to show for each channel." }

# ---- having (ch2)
- id: g-having-1
  skill: having
  kind: faded
  task: { vi: "Sản phẩm nào đã bán tổng cộng hơn 480 đơn vị? Lấy mã sản phẩm và tổng số lượng.", en: "Which products have sold more than 480 units in total? Get the product id and the total quantity." }
  starter: "SELECT product_id, sum(qty) FROM order_items GROUP BY product_id HAVING ___"
  solution: "SELECT product_id, sum(qty) FROM order_items GROUP BY product_id HAVING sum(qty) > 480"
  hint: { vi: "Điều kiện đặt trên tổng `sum(qty)` của mỗi nhóm.", en: "The condition is on each group's total `sum(qty)`." }
- id: g-having-2
  skill: having
  kind: open
  task: { vi: "Danh mục nào có giá trung bình trên 50.000 đồng? Lấy danh mục và giá trung bình (làm tròn tới đồng).", en: "Which categories have an average price above 50,000 VND? Get the category and the average price (rounded to the whole dong)." }
  solution: "SELECT category, round(avg(price_vnd)) FROM products GROUP BY category HAVING avg(price_vnd) > 50000"
  hint: { vi: "Lọc nhóm sau khi gom, bằng điều kiện trên `avg(price_vnd)`.", en: "Filter the groups after grouping, with a condition on `avg(price_vnd)`." }
- id: g-having-3
  skill: having
  kind: trap
  task: { vi: "Cửa hàng nào có hơn 250 đơn? Lấy mã cửa hàng và số đơn.", en: "Which stores have more than 250 orders? Get the store id and the order count." }
  solution: "SELECT store_id, count(*) FROM orders GROUP BY store_id HAVING count(*) > 250"
  hint: { vi: "Điều kiện trên số đơn của nhóm không đặt được ở bước lọc dòng.", en: "A condition on a group's count cannot go in the row filter." }
  wrong:
    - { sql: "SELECT store_id, count(*) FROM orders WHERE count(*) > 250 GROUP BY store_id", vi: "WHERE lọc từng dòng trước khi gom, lúc đó chưa có số đếm: Postgres báo lỗi. Điều kiện trên nhóm đặt ở HAVING.", en: "WHERE filters single rows before grouping, when there is no count yet: Postgres raises an error. A condition on groups goes in HAVING." }

# ---- join (ch3)
- id: g-join-1
  skill: join
  kind: faded
  task: { vi: "Các dòng hàng của đơn số 100: tên sản phẩm và số lượng.", en: "The lines of order 100: product name and quantity." }
  starter: "SELECT p.name, i.qty FROM order_items i JOIN products p ON ___ WHERE i.order_id = 100"
  solution: "SELECT p.name, i.qty FROM order_items i JOIN products p ON p.id = i.product_id WHERE i.order_id = 100"
  hint: { vi: "Dòng hàng trỏ tới sản phẩm qua `product_id`.", en: "An order line points to its product through `product_id`." }
- id: g-join-2
  skill: join
  kind: open
  task: { vi: "Nhân viên làm tại cửa hàng: tên nhân viên và tên cửa hàng (người ở văn phòng không tính).", en: "Staff who work at a store: staff name and store name (office staff are left out)." }
  solution: "SELECT e.name, s.name FROM staff e JOIN stores s ON s.id = e.store_id"
  hint: { vi: "Nối `staff` với `stores` qua `store_id`; phép nối thường tự bỏ người không có cửa hàng.", en: "Join `staff` to `stores` through `store_id`; a plain join drops people with no store." }
- id: g-join-3
  skill: join
  kind: trap
  task: { vi: "Đơn đặt ngày 2026-10-31 của khách thành viên: mã đơn và tên khách.", en: "Member orders placed on 2026-10-31: order id and customer name." }
  solution: "SELECT o.id, c.name FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.order_date = '2026-10-31'"
  hint: { vi: "Điều kiện nối phải ghép đúng cột khóa: khách của đơn nằm ở `customer_id`.", en: "The join condition must match the right key: an order's customer is in `customer_id`." }
  wrong:
    - { sql: "SELECT o.id, c.name FROM orders o JOIN customers c ON c.id = o.store_id WHERE o.order_date = '2026-10-31'", vi: "ON ghép nhầm cột (`store_id`): Postgres không báo lỗi, nhưng mỗi đơn gắn với một khách sai.", en: "ON matches the wrong column (`store_id`): Postgres does not complain, but each order gets the wrong customer." }

# ---- multi_join (ch3)
- id: g-multi-join-1
  skill: multi_join
  kind: faded
  task: { vi: "Các dòng hàng của đơn số 200: tên sản phẩm, số lượng và tên cửa hàng bán.", en: "The lines of order 200: product name, quantity and the name of the selling store." }
  starter: "SELECT p.name, i.qty, s.name FROM order_items i JOIN products p ON ___ JOIN orders o ON ___ JOIN stores s ON s.id = o.store_id WHERE i.order_id = 200"
  solution: "SELECT p.name, i.qty, s.name FROM order_items i JOIN products p ON p.id = i.product_id JOIN orders o ON o.id = i.order_id JOIN stores s ON s.id = o.store_id WHERE i.order_id = 200"
  hint: { vi: "Mỗi JOIN có ON riêng: sản phẩm qua `product_id`, đơn qua `order_id`.", en: "Each JOIN has its own ON: the product through `product_id`, the order through `order_id`." }
- id: g-multi-join-2
  skill: multi_join
  kind: open
  task: { vi: "Đơn của khách thành viên đặt ngày 2026-10-30: mã đơn, tên khách, tên cửa hàng.", en: "Member orders placed on 2026-10-30: order id, customer name, store name." }
  solution: "SELECT o.id, c.name, s.name FROM orders o JOIN customers c ON c.id = o.customer_id JOIN stores s ON s.id = o.store_id WHERE o.order_date = '2026-10-30'"
  hint: { vi: "Từ `orders` nối hai lần: tới `customers` và tới `stores`.", en: "Join twice from `orders`: to `customers` and to `stores`." }
- id: g-multi-join-3
  skill: multi_join
  kind: trap
  task: { vi: "Dòng hàng của các đơn đặt ngày 2026-10-29: mã đơn, tên sản phẩm, tên cửa hàng.", en: "Lines of the orders placed on 2026-10-29: order id, product name, store name." }
  solution: "SELECT i.order_id, p.name, s.name FROM order_items i JOIN products p ON p.id = i.product_id JOIN orders o ON o.id = i.order_id JOIN stores s ON s.id = o.store_id WHERE o.order_date = '2026-10-29'"
  hint: { vi: "Hai bảng cùng có cột `name`: ghi bí danh trước mỗi cột.", en: "Two tables both have a `name` column: put the alias before each column." }
  wrong:
    - { sql: "SELECT order_id, name, name FROM order_items i JOIN products p ON p.id = i.product_id JOIN orders o ON o.id = i.order_id JOIN stores s ON s.id = o.store_id WHERE o.order_date = '2026-10-29'", vi: "`name` có ở cả `products` lẫn `stores`, nên Postgres báo cột mơ hồ. Viết `p.name`, `s.name`.", en: "`name` exists in both `products` and `stores`, so Postgres says the column is ambiguous. Write `p.name`, `s.name`." }

# ---- left_join (ch3)
- id: g-left-join-1
  skill: left_join
  kind: faded
  task: { vi: "Mọi nhân viên: tên nhân viên và tên cửa hàng; người ở văn phòng vẫn hiện, cửa hàng để trống.", en: "Every staff member: staff name and store name; office staff still show, with an empty store." }
  starter: "SELECT e.name, s.name FROM staff e ___ JOIN stores s ON s.id = e.store_id"
  solution: "SELECT e.name, s.name FROM staff e LEFT JOIN stores s ON s.id = e.store_id"
  hint: { vi: "Phép nối giữ mọi dòng của bảng bên trái, kể cả dòng không ghép được.", en: "The join that keeps every row of the left table, even the unmatched ones." }
- id: g-left-join-2
  skill: left_join
  kind: open
  task: { vi: "Khách đăng ký từ 2026-10-01: tên khách và mã từng đơn của họ; khách chưa có đơn vẫn hiện, mã đơn để trống.", en: "Customers who signed up from 2026-10-01: customer name and the id of each of their orders; customers without orders still show, with an empty order id." }
  solution: "SELECT c.name, o.id FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE c.signup_date >= '2026-10-01'"
  hint: { vi: "Bắt đầu từ `customers` để giữ mọi khách, điều kiện lọc là trên bảng bên trái.", en: "Start from `customers` to keep every customer; the filter is on the left table." }
- id: g-left-join-3
  skill: left_join
  kind: trap
  task: { vi: "Mọi cửa hàng và mục tiêu doanh thu tháng 2026-06-01; cửa hàng chưa đặt mục tiêu vẫn hiện, mục tiêu để trống.", en: "Every store and its revenue target for month 2026-06-01; a store with no target still shows, with an empty target." }
  solution: "SELECT s.name, t.target_vnd FROM stores s LEFT JOIN store_targets t ON t.store_id = s.id AND t.month = '2026-06-01'"
  hint: { vi: "Điều kiện về tháng thuộc bảng bên phải, nên đặt nó trong ON.", en: "The month condition is about the right-hand table, so put it in ON." }
  wrong:
    - { sql: "SELECT s.name, t.target_vnd FROM stores s LEFT JOIN store_targets t ON t.store_id = s.id WHERE t.month = '2026-06-01'", vi: "Điều kiện trên bảng bên phải đặt ở WHERE loại mất cửa hàng không có mục tiêu: phép nối thành nối thường.", en: "A condition on the right table in WHERE drops the store with no target: the join turns back into an inner join." }

# ---- anti_join (ch3)
- id: g-anti-join-1
  skill: anti_join
  kind: faded
  task: { vi: "Khách nào không có đơn nào từ ngày 2026-07-01 trở đi? Lấy mã và tên.", en: "Which customers have no orders from 2026-07-01 onwards? Get the id and the name." }
  starter: "SELECT c.id, c.name FROM customers c LEFT JOIN orders o ON o.customer_id = c.id AND o.order_date >= '2026-07-01' WHERE ___ IS NULL"
  solution: "SELECT c.id, c.name FROM customers c LEFT JOIN orders o ON o.customer_id = c.id AND o.order_date >= '2026-07-01' WHERE o.id IS NULL"
  hint: { vi: "Khách không ghép được đơn nào thì mọi cột của `orders` đều trống; kiểm khóa của đơn.", en: "A customer with no matching order has every `orders` column empty; check the order's key." }
- id: g-anti-join-2
  skill: anti_join
  kind: open
  task: { vi: "Cửa hàng nào chưa có mục tiêu doanh thu cho tháng 2026-02-01? Lấy tên cửa hàng.", en: "Which stores have no revenue target for month 2026-02-01? Get the store name." }
  solution: "SELECT s.name FROM stores s LEFT JOIN store_targets t ON t.store_id = s.id AND t.month = '2026-02-01' WHERE t.store_id IS NULL"
  hint: { vi: "Nối giữ mọi cửa hàng với điều kiện tháng trong ON, rồi giữ dòng không ghép được.", en: "Join keeping every store with the month in ON, then keep the rows that did not match." }
- id: g-anti-join-3
  skill: anti_join
  kind: trap
  task: { vi: "Khách thành viên nào chưa từng mua ở cửa hàng 3? Lấy mã và tên khách.", en: "Which member customers have never bought at store 3? Get the customer id and name." }
  solution: "SELECT c.id, c.name FROM customers c LEFT JOIN orders o ON o.customer_id = c.id AND o.store_id = 3 WHERE o.id IS NULL"
  hint: { vi: "Đơn của cửa hàng 3 có cả khách vãng lai (khách trống), nên tránh so \"không nằm trong danh sách\".", en: "Store 3's orders include walk-ins (no customer), so avoid a \"not in the list\" comparison." }
  wrong:
    - { sql: "SELECT id, name FROM customers WHERE id NOT IN (SELECT customer_id FROM orders WHERE store_id = 3)", vi: "Danh sách có giá trị trống (đơn khách vãng lai), nên NOT IN không bao giờ đúng: kết quả rỗng.", en: "The list contains an empty value (walk-in orders), so NOT IN is never true: the result is empty." }

# ---- date_math (ch4)
- id: g-date-math-1
  skill: date_math
  kind: faded
  task: { vi: "Đơn giao trong tháng 10/2026: mã đơn và số ngày từ lúc đặt tới lúc giao.", en: "Orders delivered in October 2026: order id and the number of days from ordering to delivery." }
  starter: "SELECT id, ___ FROM orders WHERE delivered_on >= '2026-10-01' AND delivered_on < '2026-11-01'"
  solution: "SELECT id, delivered_on - order_date FROM orders WHERE delivered_on >= '2026-10-01' AND delivered_on < '2026-11-01'"
  hint: { vi: "Ngày trừ ngày ra số ngày.", en: "A date minus a date gives a number of days." }
- id: g-date-math-2
  skill: date_math
  kind: open
  task: { vi: "Khách đăng ký từ 2026-10-01: tên và hạn dùng mã chào mừng, là ngày thứ 30 sau ngày đăng ký.", en: "Customers who signed up from 2026-10-01: name and the expiry of their welcome code, 30 days after the signup date." }
  solution: "SELECT name, signup_date + 30 FROM customers WHERE signup_date >= '2026-10-01'"
  hint: { vi: "Ngày cộng một số nguyên ra một ngày mới.", en: "A date plus an integer gives a new date." }
- id: g-date-math-3
  skill: date_math
  kind: trap
  task: { vi: "Tính đến ngày 2026-10-31, mỗi cửa hàng đã mở được bao nhiêu ngày? Lấy tên và số ngày (số dương).", en: "As of 2026-10-31, how many days has each store been open? Get the name and the number of days (a positive number)." }
  solution: "SELECT name, DATE '2026-10-31' - opened_on FROM stores"
  hint: { vi: "Lấy ngày sau trừ ngày trước.", en: "Subtract the earlier date from the later one." }
  wrong:
    - { sql: "SELECT name, opened_on - DATE '2026-10-31' FROM stores", vi: "Trừ ngược chiều: ngày trước trừ ngày sau ra số âm.", en: "Subtracted the wrong way round: the earlier date minus the later one is negative." }

# ---- date_bucket (ch4)
- id: g-date-bucket-1
  skill: date_bucket
  kind: faded
  task: { vi: "Số đơn mỗi tháng của năm 2026, xếp theo tháng.", en: "The number of orders in each month of 2026, sorted by month." }
  starter: "SELECT date_trunc(___, order_date), count(*) FROM orders WHERE order_date >= '2026-01-01' GROUP BY 1 ORDER BY 1"
  solution: "SELECT date_trunc('month', order_date), count(*) FROM orders WHERE order_date >= '2026-01-01' GROUP BY 1 ORDER BY 1"
  ordered: true
  hint: { vi: "Đơn vị cắt ngày viết trong nháy đơn, bằng tiếng Anh.", en: "The unit to cut the date to goes in single quotes, in English." }
- id: g-date-bucket-2
  skill: date_bucket
  kind: open
  task: { vi: "Số khách đăng ký mỗi tháng của năm 2025, xếp theo tháng.", en: "The number of customers who signed up in each month of 2025, sorted by month." }
  solution: "SELECT date_trunc('month', signup_date), count(*) FROM customers WHERE signup_date >= '2025-01-01' AND signup_date < '2026-01-01' GROUP BY 1 ORDER BY 1"
  ordered: true
  hint: { vi: "Lọc năm 2025 bằng khoảng nửa mở, rồi gom theo đầu tháng.", en: "Filter 2025 with a half-open range, then group by the start of the month." }
- id: g-date-bucket-3
  skill: date_bucket
  kind: trap
  task: { vi: "Số đơn mỗi tháng từ 01/2025 tới 10/2026, mỗi tháng một dòng, xếp theo tháng.", en: "The number of orders in each month from January 2025 to October 2026, one row per month, sorted by month." }
  solution: "SELECT date_trunc('month', order_date), count(*) FROM orders GROUP BY 1 ORDER BY 1"
  ordered: true
  hint: { vi: "Một tháng ở đây gồm cả năm: tháng 3/2025 khác tháng 3/2026.", en: "A month here includes its year: March 2025 is not March 2026." }
  wrong:
    - { sql: "SELECT extract(month FROM order_date), count(*) FROM orders GROUP BY 1 ORDER BY 1", vi: "`extract(month …)` chỉ ra số tháng, nên tháng 3 của hai năm bị gộp: chỉ còn 12 dòng.", en: "`extract(month …)` only gives the month number, so March of two years is merged: only 12 rows are left." }

# ---- null_logic (ch4)
- id: g-null-logic-1
  skill: null_logic
  kind: faded
  task: { vi: "Khách nào chưa có thành phố? Lấy mã và tên.", en: "Which customers have no city? Get the id and the name." }
  starter: "SELECT id, name FROM customers WHERE city ___"
  solution: "SELECT id, name FROM customers WHERE city IS NULL"
  hint: { vi: "Ô trống không so bằng dấu `=` được.", en: "An empty value cannot be compared with `=`." }
- id: g-null-logic-2
  skill: null_logic
  kind: open
  task: { vi: "Đơn đã gửi đi nhưng chưa giao tới khách: mã đơn và ngày gửi.", en: "Orders that have shipped but are not delivered yet: order id and ship date." }
  solution: "SELECT id, shipped_on FROM orders WHERE shipped_on IS NOT NULL AND delivered_on IS NULL"
  hint: { vi: "Một cột phải có giá trị, cột kia phải trống.", en: "One column must have a value, the other must be empty." }
- id: g-null-logic-3
  skill: null_logic
  kind: trap
  task: { vi: "Khách nào chưa có email? Lấy mã và tên.", en: "Which customers have no email? Get the id and the name." }
  solution: "SELECT id, name FROM customers WHERE email IS NULL"
  hint: { vi: "Hỏi \"có trống không\" bằng IS, không bằng dấu bằng.", en: "Ask \"is it empty\" with IS, not with an equals sign." }
  wrong:
    - { sql: "SELECT id, name FROM customers WHERE email = NULL", vi: "`= NULL` không bao giờ đúng, nên kết quả rỗng. Viết `IS NULL`.", en: "`= NULL` is never true, so the result is empty. Write `IS NULL`." }

# ---- case_when (ch5)
- id: g-case-when-1
  skill: case_when
  kind: faded
  task: { vi: "Mỗi sản phẩm: tên và hạng giá: 1 nếu dưới 20.000 đồng, 2 nếu từ 20.000 đến dưới 100.000, 3 nếu từ 100.000 trở lên.", en: "Each product: name and price band: 1 if under 20,000 VND, 2 from 20,000 to under 100,000, 3 from 100,000 up." }
  starter: "SELECT name, CASE WHEN price_vnd < 20000 THEN 1 WHEN ___ THEN 2 ELSE ___ END FROM products"
  solution: "SELECT name, CASE WHEN price_vnd < 20000 THEN 1 WHEN price_vnd < 100000 THEN 2 ELSE 3 END FROM products"
  hint: { vi: "Điều kiện thứ hai chỉ được xét khi điều kiện đầu sai, nên chỉ cần mốc trên.", en: "The second condition is only checked when the first is false, so it only needs the upper bound." }
- id: g-case-when-2
  skill: case_when
  kind: open
  task: { vi: "Đơn `ONLINE` đặt từ 2026-10-01 (trừ đơn hủy): mã đơn và nhóm giao hàng: 1 nếu giao trong vòng 2 ngày sau khi đặt, 2 nếu lâu hơn, 3 nếu chưa giao.", en: "`ONLINE` orders placed from 2026-10-01 (cancelled ones left out): order id and delivery group: 1 if delivered within 2 days of ordering, 2 if later, 3 if not delivered yet." }
  solution: "SELECT id, CASE WHEN delivered_on IS NULL THEN 3 WHEN delivered_on - order_date <= 2 THEN 1 ELSE 2 END FROM orders WHERE channel = 'ONLINE' AND order_date >= '2026-10-01' AND status <> 'CANCELLED'"
  hint: { vi: "Xét trường hợp chưa giao trước, rồi tới số ngày giao.", en: "Handle the not-delivered case first, then the delivery days." }
- id: g-case-when-3
  skill: case_when
  kind: trap
  task: { vi: "Mỗi khách: mã khách và nhóm tuổi: 1 nếu sinh từ năm 1995, 2 nếu sinh từ 1980 đến 1994, 3 nếu trước 1980, 0 nếu không rõ năm sinh.", en: "Each customer: customer id and age group: 1 if born in 1995 or later, 2 if born 1980 to 1994, 3 if before 1980, 0 if the birth year is unknown." }
  solution: "SELECT id, CASE WHEN birth_year >= 1995 THEN 1 WHEN birth_year >= 1980 THEN 2 WHEN birth_year < 1980 THEN 3 ELSE 0 END FROM customers"
  hint: { vi: "CASE dừng ở điều kiện đúng đầu tiên: đặt điều kiện hẹp nhất lên trước.", en: "CASE stops at the first true condition: put the narrowest one first." }
  wrong:
    - { sql: "SELECT id, CASE WHEN birth_year >= 1980 THEN 2 WHEN birth_year >= 1995 THEN 1 WHEN birth_year < 1980 THEN 3 ELSE 0 END FROM customers", vi: "Người sinh 1995 cũng thỏa `>= 1980`, nên CASE dừng ở nhóm 2 và nhóm 1 không bao giờ xuất hiện.", en: "Someone born in 1995 also matches `>= 1980`, so CASE stops at group 2 and group 1 never appears." }

# ---- conditional_agg (ch5)
- id: g-conditional-agg-1
  skill: conditional_agg
  kind: faded
  task: { vi: "Mỗi cửa hàng: mã cửa hàng, tổng số đơn và số đơn bán qua kênh `ONLINE`.", en: "Each store: store id, total orders and the number of orders sold through the `ONLINE` channel." }
  starter: "SELECT store_id, count(*), count(*) FILTER (WHERE ___) FROM orders GROUP BY store_id"
  solution: "SELECT store_id, count(*), count(*) FILTER (WHERE channel = 'ONLINE') FROM orders GROUP BY store_id"
  hint: { vi: "Điều kiện của riêng cột thứ ba nằm trong FILTER.", en: "The third column's own condition goes inside FILTER." }
- id: g-conditional-agg-2
  skill: conditional_agg
  kind: open
  task: { vi: "Mỗi tháng của năm 2026: tháng, số đơn `PAID`, số đơn `CANCELLED`, số đơn `REFUNDED` (ba cột đếm).", en: "Each month of 2026: the month, the number of `PAID`, `CANCELLED` and `REFUNDED` orders (three count columns)." }
  solution: "SELECT date_trunc('month', order_date), count(*) FILTER (WHERE status = 'PAID'), count(*) FILTER (WHERE status = 'CANCELLED'), count(*) FILTER (WHERE status = 'REFUNDED') FROM orders WHERE order_date >= '2026-01-01' GROUP BY 1"
  hint: { vi: "Một nhóm mỗi tháng, mỗi trạng thái một cột đếm có điều kiện riêng.", en: "One group per month, one conditional count column per status." }
- id: g-conditional-agg-3
  skill: conditional_agg
  kind: trap
  task: { vi: "Mỗi kênh bán: kênh, tổng số đơn và số đơn bị hủy (`CANCELLED`).", en: "Each channel: the channel, total orders and the number of cancelled (`CANCELLED`) orders." }
  solution: "SELECT channel, count(*) AS orders, count(*) FILTER (WHERE status = 'CANCELLED') AS cancelled FROM orders GROUP BY channel"
  hint: { vi: "Cột tổng cần mọi đơn, nên điều kiện \"bị hủy\" không được nằm ở WHERE.", en: "The total column needs every order, so the \"cancelled\" condition must not be in WHERE." }
  wrong:
    - { sql: "SELECT channel, count(*) AS orders, count(*) AS cancelled FROM orders WHERE status = 'CANCELLED' GROUP BY channel", vi: "WHERE bỏ mọi đơn không bị hủy trước khi đếm, nên cột tổng cũng chỉ đếm đơn hủy.", en: "WHERE drops every order that is not cancelled before counting, so the total column only counts cancelled orders too." }

# ---- coalesce (ch5)
- id: g-coalesce-1
  skill: coalesce
  kind: faded
  task: { vi: "Mỗi cửa hàng: tên và mục tiêu doanh thu tháng 2026-06-01; cửa hàng chưa đặt mục tiêu thì ghi 0.", en: "Each store: name and revenue target for month 2026-06-01; a store with no target shows 0." }
  starter: "SELECT s.name, COALESCE(___, ___) FROM stores s LEFT JOIN store_targets t ON t.store_id = s.id AND t.month = '2026-06-01'"
  solution: "SELECT s.name, COALESCE(t.target_vnd, 0) FROM stores s LEFT JOIN store_targets t ON t.store_id = s.id AND t.month = '2026-06-01'"
  hint: { vi: "Giá trị đầu tiên không trống thắng: cột mục tiêu, rồi tới số thay thế.", en: "The first non-empty value wins: the target column, then the fallback number." }
- id: g-coalesce-2
  skill: coalesce
  kind: open
  task: { vi: "Đơn `ONLINE` đặt từ 2026-10-20 (trừ đơn hủy): mã đơn và số ngày giao; đơn chưa giao thì tính tới ngày 2026-10-31.", en: "`ONLINE` orders placed from 2026-10-20 (cancelled ones left out): order id and delivery days; for an order not delivered yet, count up to 2026-10-31." }
  solution: "SELECT id, COALESCE(delivered_on, DATE '2026-10-31') - order_date FROM orders WHERE channel = 'ONLINE' AND order_date >= '2026-10-20' AND status <> 'CANCELLED'"
  hint: { vi: "Thay ngày giao trống bằng ngày 2026-10-31 trước khi trừ.", en: "Replace an empty delivery date with 2026-10-31 before subtracting." }
- id: g-coalesce-3
  skill: coalesce
  kind: trap
  task: { vi: "Khách đăng ký từ 2026-09-01: mã khách và tuổi tính theo năm 2026 (2026 trừ năm sinh); không rõ năm sinh thì ghi 0.", en: "Customers who signed up from 2026-09-01: customer id and age in 2026 (2026 minus birth year); with an unknown birth year, show 0." }
  solution: "SELECT id, COALESCE(2026 - birth_year, 0) FROM customers WHERE signup_date >= '2026-09-01'"
  hint: { vi: "Phép tính với ô trống ra ô trống; thay kết quả trống bằng 0.", en: "Arithmetic with an empty value gives an empty value; replace the empty result with 0." }
  wrong:
    - { sql: "SELECT id, 2026 - birth_year FROM customers WHERE signup_date >= '2026-09-01'", vi: "Khách không rõ năm sinh ra tuổi trống thay vì 0: phép tính với NULL ra NULL.", en: "Customers with no birth year get an empty age instead of 0: arithmetic with NULL gives NULL." }

# ---- self_join (ch5)
- id: g-self-join-1
  skill: self_join
  kind: faded
  task: { vi: "Mỗi nhân viên có quản lý: tên nhân viên và tên quản lý trực tiếp.", en: "Each staff member who has a manager: staff name and direct manager's name." }
  starter: "SELECT e.name, m.name FROM staff e JOIN staff m ON ___"
  solution: "SELECT e.name, m.name FROM staff e JOIN staff m ON m.id = e.manager_id"
  hint: { vi: "Bảng `staff` dùng hai lần với hai bí danh; quản lý là dòng có `id` bằng `manager_id` của nhân viên.", en: "Use `staff` twice with two aliases; the manager is the row whose `id` equals the employee's `manager_id`." }
- id: g-self-join-2
  skill: self_join
  kind: open
  task: { vi: "Nhân viên nào vào làm trước quản lý trực tiếp của mình? Lấy tên nhân viên và tên quản lý.", en: "Which staff members were hired before their direct manager? Get the staff name and the manager's name." }
  solution: "SELECT e.name, m.name FROM staff e JOIN staff m ON m.id = e.manager_id WHERE e.hired_on < m.hired_on"
  hint: { vi: "Sau khi nối nhân viên với quản lý, so hai cột `hired_on`.", en: "After joining staff to manager, compare the two `hired_on` columns." }
- id: g-self-join-3
  skill: self_join
  kind: trap
  task: { vi: "Mỗi nhân viên: tên nhân viên và tên cấp trên hai bậc (quản lý của quản lý trực tiếp); ai không có cấp trên hai bậc thì không tính.", en: "Each staff member: staff name and the name of the boss two levels up (the direct manager's manager); people without one are left out." }
  solution: "SELECT e.name, g.name FROM staff e JOIN staff m ON m.id = e.manager_id JOIN staff g ON g.id = m.manager_id"
  hint: { vi: "Cần nối `staff` ba lần: nhân viên, quản lý, rồi quản lý của quản lý.", en: "Join `staff` three times: employee, manager, then the manager's manager." }
  wrong:
    - { sql: "SELECT e.name, m.name FROM staff e JOIN staff m ON m.id = e.manager_id", vi: "Mới đi lên một bậc: đó là quản lý trực tiếp, chưa phải cấp trên hai bậc.", en: "This only goes up one level: that is the direct manager, not the boss two levels up." }

# ---- string_fn (ch6)
- id: g-string-fn-1
  skill: string_fn
  kind: faded
  task: { vi: "Mỗi sản phẩm: tên viết hoa toàn bộ và số ký tự của tên.", en: "Each product: the name in capital letters and the number of characters in the name." }
  starter: "SELECT ___(name), ___(name) FROM products"
  solution: "SELECT upper(name), length(name) FROM products"
  hint: { vi: "Một hàm đổi sang chữ hoa, một hàm đếm ký tự.", en: "One function turns text to capitals, one counts characters." }
- id: g-string-fn-2
  skill: string_fn
  kind: open
  task: { vi: "Mỗi tên miền email của khách (phần sau dấu `@`): tên miền và số khách dùng; bỏ khách không có email.", en: "Each customer email domain (the part after `@`): the domain and the number of customers using it; leave out customers without an email." }
  solution: "SELECT split_part(email, '@', 2), count(*) FROM customers WHERE email IS NOT NULL GROUP BY 1"
  hint: { vi: "`split_part` cắt chuỗi theo một ký tự và lấy phần thứ n.", en: "`split_part` cuts text at a character and takes the n-th piece." }
- id: g-string-fn-3
  skill: string_fn
  kind: trap
  task: { vi: "Các đăng ký có mã từ 1 đến 12 trong `raw_signups`: mã và tên đã bỏ khoảng trắng thừa ở hai đầu, viết hoa chữ cái đầu mỗi từ.", en: "Sign-ups with ids 1 to 12 in `raw_signups`: id and the name with extra spaces removed from both ends, each word capitalised." }
  solution: "SELECT id, initcap(trim(full_name)) FROM raw_signups WHERE id <= 12"
  hint: { vi: "Chỉ bỏ khoảng trắng ở hai đầu, khoảng trắng giữa các từ phải giữ.", en: "Only remove spaces at both ends; the spaces between words must stay." }
  wrong:
    - { sql: "SELECT id, initcap(replace(full_name, ' ', '')) FROM raw_signups WHERE id <= 12", vi: "`replace` thay mọi chỗ, kể cả khoảng trắng giữa các từ, nên họ và tên dính liền. Dùng `trim`.", en: "`replace` swaps every occurrence, the spaces between words too, so the names run together. Use `trim`." }

# ---- pattern_match (ch6)
- id: g-pattern-match-1
  skill: pattern_match
  kind: faded
  task: { vi: "Sản phẩm nào có chữ `tea` trong tên, bất kể hoa thường? Lấy tên.", en: "Which products have `tea` in the name, in any letter case? Get the name." }
  starter: "SELECT name FROM products WHERE name ILIKE ___"
  solution: "SELECT name FROM products WHERE name ILIKE '%tea%'"
  hint: { vi: "Đặt `%` ở cả hai đầu để khớp ở bất kỳ vị trí nào.", en: "Put `%` on both sides to match anywhere." }
- id: g-pattern-match-2
  skill: pattern_match
  kind: open
  task: { vi: "Khách dùng email đuôi `@gmail.com`: mã và email.", en: "Customers whose email ends in `@gmail.com`: id and email." }
  solution: "SELECT id, email FROM customers WHERE email LIKE '%@gmail.com'"
  hint: { vi: "Chỉ đặt `%` ở đầu mẫu: email phải kết thúc bằng phần đó.", en: "Put `%` only at the start of the pattern: the email must end with that part." }
- id: g-pattern-match-3
  skill: pattern_match
  kind: trap
  task: { vi: "Trong `raw_signups`: đăng ký có email kết thúc bằng `gmail.com`, viết hoa hay thường đều tính. Lấy mã và email.", en: "In `raw_signups`: sign-ups whose email ends in `gmail.com`, upper or lower case both count. Get the id and email." }
  solution: "SELECT id, email FROM raw_signups WHERE email ILIKE '%gmail.com'"
  hint: { vi: "Có email được nhập bằng chữ hoa.", en: "Some emails were typed in capital letters." }
  wrong:
    - { sql: "SELECT id, email FROM raw_signups WHERE email LIKE '%gmail.com'", vi: "LIKE phân biệt hoa thường, nên bỏ sót email viết hoa. Dùng ILIKE.", en: "LIKE is case-sensitive, so it misses the emails in capitals. Use ILIKE." }

# ---- distinct (ch6)
- id: g-distinct-1
  skill: distinct
  kind: faded
  task: { vi: "Những thành phố nào có khách hàng? Mỗi thành phố một dòng (kể cả ô trống).", en: "Which cities have customers? One row per city (the empty value included)." }
  starter: "SELECT ___ city FROM customers"
  solution: "SELECT DISTINCT city FROM customers"
  hint: { vi: "Một từ khóa sau SELECT bỏ các dòng trùng nhau.", en: "One keyword after SELECT drops duplicate rows." }
- id: g-distinct-2
  skill: distinct
  kind: open
  task: { vi: "Mỗi cửa hàng có bao nhiêu khách thành viên khác nhau từng mua? Lấy mã cửa hàng và số khách.", en: "How many different member customers have bought at each store? Get the store id and the customer count." }
  solution: "SELECT store_id, count(DISTINCT customer_id) FROM orders GROUP BY store_id"
  hint: { vi: "Đếm khách, không đếm đơn: một khách mua nhiều lần chỉ tính một.", en: "Count customers, not orders: a customer who bought many times counts once." }
- id: g-distinct-3
  skill: distinct
  kind: trap
  task: { vi: "Trong tháng 10/2026, mỗi danh mục bán được bao nhiêu sản phẩm khác nhau? Lấy danh mục và số sản phẩm.", en: "In October 2026, how many different products did each category sell? Get the category and the product count." }
  solution: "SELECT p.category, count(DISTINCT i.product_id) FROM order_items i JOIN orders o ON o.id = i.order_id JOIN products p ON p.id = i.product_id WHERE o.order_date >= '2026-10-01' AND o.order_date < '2026-11-01' GROUP BY p.category"
  hint: { vi: "Một sản phẩm xuất hiện trong nhiều dòng hàng; chỉ đếm mỗi sản phẩm một lần.", en: "A product appears in many order lines; count each product once." }
  wrong:
    - { sql: "SELECT p.category, count(i.product_id) FROM order_items i JOIN orders o ON o.id = i.order_id JOIN products p ON p.id = i.product_id WHERE o.order_date >= '2026-10-01' AND o.order_date < '2026-11-01' GROUP BY p.category", vi: "`count(product_id)` đếm cả lần lặp, tức số dòng hàng, không phải số sản phẩm khác nhau.", en: "`count(product_id)` counts the repeats too, that is order lines, not different products." }

# ---- cast (ch6)
- id: g-cast-1
  skill: cast
  kind: faded
  task: { vi: "Mỗi cửa hàng: mã cửa hàng và tỉ lệ phần trăm đơn bị hủy (`CANCELLED`), làm tròn 2 chữ số.", en: "Each store: store id and the percentage of cancelled (`CANCELLED`) orders, rounded to 2 decimals." }
  starter: "SELECT store_id, round(count(*) FILTER (WHERE status = 'CANCELLED')::___ * 100 / count(*), 2) FROM orders GROUP BY store_id"
  solution: "SELECT store_id, round(count(*) FILTER (WHERE status = 'CANCELLED')::numeric * 100 / count(*), 2) FROM orders GROUP BY store_id"
  hint: { vi: "Đổi một vế sang kiểu số có phần thập phân trước khi chia.", en: "Cast one side to a decimal number type before dividing." }
- id: g-cast-2
  skill: cast
  kind: open
  task: { vi: "Mỗi đơn đặt ngày 2026-10-31: mã đơn và số lượng trung bình mỗi dòng hàng (tổng số lượng chia số dòng), làm tròn 2 chữ số.", en: "Each order placed on 2026-10-31: order id and the average quantity per line (total quantity divided by the number of lines), rounded to 2 decimals." }
  solution: "SELECT i.order_id, round(sum(i.qty)::numeric / count(*), 2) FROM order_items i JOIN orders o ON o.id = i.order_id WHERE o.order_date = '2026-10-31' GROUP BY i.order_id"
  hint: { vi: "Tổng số lượng là số nguyên; đổi sang `numeric` trước khi chia.", en: "The total quantity is an integer; cast it to `numeric` before dividing." }
- id: g-cast-3
  skill: cast
  kind: trap
  task: { vi: "Mỗi cửa hàng: mã cửa hàng và tỉ lệ đơn bán qua kênh `ONLINE` trên tổng số đơn, dạng số từ 0 đến 1, làm tròn 2 chữ số.", en: "Each store: store id and the share of orders sold through the `ONLINE` channel out of all orders, as a number from 0 to 1, rounded to 2 decimals." }
  solution: "SELECT store_id, round(count(*) FILTER (WHERE channel = 'ONLINE')::numeric / count(*), 2) FROM orders GROUP BY store_id"
  hint: { vi: "Số nguyên chia số nguyên bỏ phần thập phân.", en: "An integer divided by an integer drops the decimals." }
  wrong:
    - { sql: "SELECT store_id, round(count(*) FILTER (WHERE channel = 'ONLINE') / count(*), 2) FROM orders GROUP BY store_id", vi: "Hai số đếm đều là số nguyên, nên phép chia ra 0 cho mọi cửa hàng. Đổi một vế sang `numeric`.", en: "Both counts are integers, so the division gives 0 for every store. Cast one side to `numeric`." }


# ---- scalar_subquery (ch7)
- id: g-scalar-subquery-1
  skill: scalar_subquery
  kind: faded
  task: { vi: "Sản phẩm nào đắt hơn giá trung bình của mọi sản phẩm? Lấy tên và giá.", en: "Which products cost more than the average price of all products? Get the name and the price." }
  starter: "SELECT name, price_vnd FROM products WHERE price_vnd > (SELECT ___ FROM products)"
  solution: "SELECT name, price_vnd FROM products WHERE price_vnd > (SELECT AVG(price_vnd) FROM products)"
  hint: { vi: "Truy vấn con trả về đúng một con số: trung bình của `price_vnd`.", en: "The subquery returns exactly one number: the average of `price_vnd`." }
- id: g-scalar-subquery-2
  skill: scalar_subquery
  kind: open
  task: { vi: "Những đơn hàng nào được đặt vào ngày gần nhất có đơn trong dữ liệu? Lấy mã đơn, mã cửa hàng và ngày đặt.", en: "Which orders were placed on the latest order date in the data? Get the order id, the store id and the order date." }
  solution: "SELECT id, store_id, order_date FROM orders WHERE order_date = (SELECT MAX(order_date) FROM orders)"
  hint: { vi: "Tìm ngày lớn nhất của `order_date` trong một truy vấn con, rồi so với nó.", en: "Find the largest `order_date` in a subquery, then compare with it." }
- id: g-scalar-subquery-3
  skill: scalar_subquery
  kind: trap
  task: { vi: "Món ăn vặt (`Snacks`) nào rẻ hơn giá trung bình của chính nhóm ăn vặt? Lấy tên và giá.", en: "Which snacks (`Snacks`) are cheaper than the average price of the snacks themselves? Get the name and the price." }
  solution: "SELECT name, price_vnd FROM products WHERE category = 'Snacks' AND price_vnd < (SELECT AVG(price_vnd) FROM products WHERE category = 'Snacks')"
  hint: { vi: "Điều kiện nhóm phải viết cả trong truy vấn con.", en: "The category condition must be written inside the subquery too." }
  wrong:
    - sql: "SELECT name, price_vnd FROM products WHERE category = 'Snacks' AND price_vnd < (SELECT AVG(price_vnd) FROM products)"
      vi: "Truy vấn con đang tính trung bình của mọi sản phẩm. Điều kiện `category = 'Snacks'` của câu ngoài không áp vào truy vấn con: phải lọc lại bên trong."
      en: "The subquery averages every product. The outer `category = 'Snacks'` condition does not apply inside the subquery: filter again inside it."

# ---- in_subquery (ch7)
- id: g-in-subquery-1
  skill: in_subquery
  kind: faded
  task: { vi: "Khách nào đã từng mua ở cửa hàng số 4 (Thao Dien)? Lấy mã và tên khách.", en: "Which customers have ever bought at store 4 (Thao Dien)? Get the customer id and name." }
  starter: "SELECT id, name FROM customers WHERE id IN (SELECT ___ FROM orders WHERE store_id = 4)"
  solution: "SELECT id, name FROM customers WHERE id IN (SELECT customer_id FROM orders WHERE store_id = 4)"
  hint: { vi: "Truy vấn con trả về một cột: mã khách của các đơn ở cửa hàng 4.", en: "The subquery returns one column: the customer id of the orders at store 4." }
- id: g-in-subquery-2
  skill: in_subquery
  kind: open
  task: { vi: "Khách ở `Hue` nào có ít nhất một đơn mua online (`ONLINE`) trong tháng 10/2026? Lấy tên và email.", en: "Which customers in `Hue` placed at least one online (`ONLINE`) order in October 2026? Get the name and the email." }
  solution: "SELECT name, email FROM customers WHERE city = 'Hue' AND id IN (SELECT customer_id FROM orders WHERE channel = 'ONLINE' AND order_date >= '2026-10-01' AND order_date < '2026-11-01')"
  hint: { vi: "Lọc đơn online của tháng 10 trong truy vấn con, rồi giữ khách có mã nằm trong danh sách đó.", en: "Filter October's online orders in the subquery, then keep the customers whose id is in that list." }
- id: g-in-subquery-3
  skill: in_subquery
  kind: trap
  task: { vi: "Khách nào chưa từng mua ở cửa hàng số 3 (Ben Thanh)? Lấy mã và tên khách. Lưu ý: đơn khách vãng lai không có mã khách.", en: "Which customers have never bought at store 3 (Ben Thanh)? Get the customer id and name. Note: walk-in orders have no customer id." }
  solution: "SELECT id, name FROM customers WHERE id NOT IN (SELECT customer_id FROM orders WHERE store_id = 3 AND customer_id IS NOT NULL)"
  hint: { vi: "Danh sách trong truy vấn con có ô trống (NULL) thì phép phủ định không giữ dòng nào.", en: "If the subquery's list holds an empty value (NULL), the negated test keeps no rows." }
  wrong:
    - sql: "SELECT id, name FROM customers WHERE id NOT IN (SELECT customer_id FROM orders WHERE store_id = 3)"
      vi: "Ra 0 dòng: danh sách có `NULL` từ đơn khách vãng lai ở cửa hàng 3, và `NOT IN` với `NULL` không bao giờ đúng. Lọc `customer_id IS NOT NULL` trong truy vấn con, hoặc dùng `NOT EXISTS`."
      en: "0 rows: the list holds `NULL` from store 3's walk-in orders, and `NOT IN` against `NULL` is never true. Filter `customer_id IS NOT NULL` inside the subquery, or use `NOT EXISTS`."

# ---- exists (ch7)
- id: g-exists-1
  skill: exists
  kind: faded
  task: { vi: "Khách nào có ít nhất một đơn bị hoàn tiền (`REFUNDED`)? Lấy mã và tên khách.", en: "Which customers have at least one refunded (`REFUNDED`) order? Get the customer id and name." }
  starter: "SELECT c.id, c.name FROM customers c WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = ___ AND o.status = 'REFUNDED')"
  solution: "SELECT c.id, c.name FROM customers c WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id AND o.status = 'REFUNDED')"
  hint: { vi: "Nối đơn trong truy vấn con với khách của câu ngoài qua mã khách.", en: "Link the order in the subquery to the outer customer by the customer id." }
- id: g-exists-2
  skill: exists
  kind: open
  task: { vi: "Khách nào chưa từng mua online (`ONLINE`)? Lấy mã, tên và thành phố.", en: "Which customers have never bought online (`ONLINE`)? Get the id, name and city." }
  solution: "SELECT c.id, c.name, c.city FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id AND o.channel = 'ONLINE')"
  hint: { vi: "Hỏi \"không tồn tại đơn online nào của khách này\".", en: "Ask \"there is no online order of this customer\"." }
- id: g-exists-3
  skill: exists
  kind: trap
  task: { vi: "Khách nào đã từng mua ở cửa hàng số 2 (Son Tra)? Lấy mã và tên khách.", en: "Which customers have ever bought at store 2 (Son Tra)? Get the customer id and name." }
  solution: "SELECT c.id, c.name FROM customers c WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id AND o.store_id = 2)"
  hint: { vi: "Truy vấn con phải hỏi về đúng khách đang xét ở câu ngoài.", en: "The subquery must ask about the very customer of the outer row." }
  wrong:
    - sql: "SELECT c.id, c.name FROM customers c WHERE EXISTS (SELECT 1 FROM orders o WHERE o.store_id = 2)"
      vi: "Thiếu điều kiện `o.customer_id = c.id`: truy vấn con hỏi cả bảng đơn, đúng cho mọi khách, nên ra cả 300 khách."
      en: "The `o.customer_id = c.id` link is missing: the subquery asks about the whole order table, true for every customer, so you get all 300 customers."

# ---- correlated_value (ch7)
- id: g-correlated-value-1
  skill: correlated_value
  kind: faded
  task: { vi: "Với mỗi cửa hàng, ngày đặt đơn gần nhất là ngày nào? Lấy tên cửa hàng và ngày đó.", en: "For each store, what is its latest order date? Get the store name and that date." }
  starter: "SELECT s.name, (SELECT MAX(o.order_date) FROM orders o WHERE o.store_id = ___) FROM stores s"
  solution: "SELECT s.name, (SELECT MAX(o.order_date) FROM orders o WHERE o.store_id = s.id) FROM stores s"
  hint: { vi: "Truy vấn con dùng mã của cửa hàng đang xét ở câu ngoài.", en: "The subquery uses the id of the store of the outer row." }
- id: g-correlated-value-2
  skill: correlated_value
  kind: open
  task: { vi: "Mỗi khách ở `Can Tho` có bao nhiêu đơn? Lấy tên khách và số đơn; khách chưa có đơn ghi 0.", en: "How many orders does each customer in `Can Tho` have? Get the customer name and the order count; a customer with no orders shows 0." }
  solution: "SELECT c.name, (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id) FROM customers c WHERE c.city = 'Can Tho'"
  hint: { vi: "Một truy vấn con đếm đơn cho từng khách; đếm trên tập rỗng ra 0.", en: "A subquery counts the orders of each customer; counting an empty set gives 0." }
- id: g-correlated-value-3
  skill: correlated_value
  kind: trap
  task: { vi: "Các đơn tháng 10/2026 của khách số 14, 21, 28 và 35: lấy mã đơn và thành phố của khách tại ngày đặt đơn, theo lịch sử `dim_customer` (hiệu lực từ `valid_from`, tới trước `valid_to`; `valid_to` trống là hiện tại).", en: "The October 2026 orders of customers 14, 21, 28 and 35: get the order id and the customer's city on the order date, from the `dim_customer` history (valid from `valid_from`, until before `valid_to`; an empty `valid_to` means current)." }
  solution: "SELECT o.id, (SELECT d.city FROM dim_customer d WHERE d.customer_id = o.customer_id AND o.order_date >= d.valid_from AND (d.valid_to IS NULL OR o.order_date < d.valid_to)) FROM orders o WHERE o.customer_id IN (14, 21, 28, 35) AND o.order_date >= '2026-10-01' AND o.order_date < '2026-11-01'"
  hint: { vi: "Truy vấn con chỉ được trả một dòng: thêm điều kiện ngày đặt đơn nằm trong khoảng hiệu lực.", en: "The subquery may return only one row: add the condition that the order date falls in the validity range." }
  wrong:
    - sql: "SELECT o.id, (SELECT d.city FROM dim_customer d WHERE d.customer_id = o.customer_id) FROM orders o WHERE o.customer_id IN (14, 21, 28, 35) AND o.order_date >= '2026-10-01' AND o.order_date < '2026-11-01'"
      vi: "Thiếu điều kiện ngày hiệu lực: khách đã chuyển nhà có hai dòng lịch sử, truy vấn con trả hai dòng và Postgres báo lỗi more than one row returned by a subquery."
      en: "The validity-date condition is missing: a customer who moved has two history rows, the subquery returns two rows and Postgres reports more than one row returned by a subquery."

# ---- cte (ch8)
- id: g-cte-1
  skill: cte
  kind: faded
  task: { vi: "Đơn nào có tổng tiền đã thanh toán (cộng mọi dòng trong `payments`) trên 1.000.000 đồng? Lấy mã đơn và tổng đó.", en: "Which orders have total payments (all their rows in `payments` added up) above 1,000,000 VND? Get the order id and that total." }
  starter: "WITH paid AS (SELECT order_id, SUM(amount_vnd) AS total FROM payments GROUP BY ___) SELECT order_id, total FROM paid WHERE total > 1000000"
  solution: "WITH paid AS (SELECT order_id, SUM(amount_vnd) AS total FROM payments GROUP BY order_id) SELECT order_id, total FROM paid WHERE total > 1000000"
  hint: { vi: "Bước đặt tên cộng tiền theo từng đơn; câu chính chỉ lọc kết quả của bước đó.", en: "The named step totals the money per order; the main query only filters that step's result." }
- id: g-cte-2
  skill: cte
  kind: open
  task: { vi: "Cửa hàng nào có doanh số tháng 10/2026 (tổng số lượng × đơn giá của đơn `PAID`) trên 10.000.000 đồng? Lấy tên cửa hàng và doanh số.", en: "Which stores had October 2026 sales (sum of quantity × unit price over `PAID` orders) above 10,000,000 VND? Get the store name and the sales." }
  solution: "WITH sales AS (SELECT o.store_id, SUM(i.qty * i.unit_price_vnd) AS total FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.order_date >= '2026-10-01' AND o.order_date < '2026-11-01' GROUP BY o.store_id) SELECT s.name, sales.total FROM sales JOIN stores s ON s.id = sales.store_id WHERE sales.total > 10000000"
  hint: { vi: "Tính doanh số theo cửa hàng trong một bước có tên, rồi nối với `stores` để lấy tên.", en: "Compute sales per store in a named step, then join `stores` for the name." }
- id: g-cte-3
  skill: cte
  kind: trap
  task: { vi: "Với mỗi đơn đặt trong tháng 10/2026 có ít nhất một khoản thanh toán: lấy mã đơn, tổng giá trị hàng (số lượng × đơn giá) và tổng tiền đã thanh toán.", en: "For each order placed in October 2026 that has at least one payment: get the order id, the goods value (quantity × unit price) and the total paid." }
  solution: "WITH items AS (SELECT order_id, SUM(qty * unit_price_vnd) AS goods FROM order_items GROUP BY order_id), paid AS (SELECT order_id, SUM(amount_vnd) AS paid FROM payments GROUP BY order_id) SELECT o.id, items.goods, paid.paid FROM orders o JOIN items ON items.order_id = o.id JOIN paid ON paid.order_id = o.id WHERE o.order_date >= '2026-10-01' AND o.order_date < '2026-11-01'"
  hint: { vi: "Cộng hàng theo đơn và cộng tiền theo đơn ở hai bước riêng, rồi mới nối.", en: "Total the goods per order and the payments per order in two separate steps, then join." }
  wrong:
    - sql: "SELECT o.id, SUM(i.qty * i.unit_price_vnd), SUM(p.amount_vnd) FROM orders o JOIN order_items i ON i.order_id = o.id JOIN payments p ON p.order_id = o.id WHERE o.order_date >= '2026-10-01' AND o.order_date < '2026-11-01' GROUP BY o.id"
      vi: "Nối thẳng dòng hàng với thanh toán rồi mới cộng: đơn có 3 dòng hàng thì tiền thanh toán bị cộng 3 lần, đơn có 2 khoản thanh toán thì giá trị hàng bị cộng 2 lần."
      en: "Joining goods lines to payments before adding up: an order with 3 lines has its payment counted 3 times, an order with 2 payments has its goods counted twice."

# ---- multi_cte (ch8)
- id: g-multi-cte-1
  skill: multi_cte
  kind: faded
  task: { vi: "Tháng nào của năm 2026 có doanh số cao nhất (tổng số lượng × đơn giá của đơn `PAID`)? Lấy tháng và doanh số.", en: "Which month of 2026 had the highest sales (sum of quantity × unit price over `PAID` orders)? Get the month and the sales." }
  starter: "WITH m AS (SELECT date_trunc('month', o.order_date) AS month, SUM(i.qty * i.unit_price_vnd) AS sales FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.order_date >= '2026-01-01' GROUP BY 1), best AS (SELECT ___ AS sales FROM m) SELECT m.month, m.sales FROM m JOIN best ON best.sales = m.sales"
  solution: "WITH m AS (SELECT date_trunc('month', o.order_date) AS month, SUM(i.qty * i.unit_price_vnd) AS sales FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.order_date >= '2026-01-01' GROUP BY 1), best AS (SELECT MAX(sales) AS sales FROM m) SELECT m.month, m.sales FROM m JOIN best ON best.sales = m.sales"
  hint: { vi: "Bước thứ hai đọc kết quả của bước thứ nhất và lấy giá trị lớn nhất.", en: "The second step reads the first step's result and takes the largest value." }
- id: g-multi-cte-2
  skill: multi_cte
  kind: open
  task: { vi: "Cửa hàng nào có doanh số tháng 10/2026 (đơn `PAID`) cao hơn doanh số trung bình một cửa hàng trong tháng đó? Lấy mã cửa hàng và doanh số.", en: "Which stores had October 2026 sales (`PAID` orders) above the average store's sales that month? Get the store id and the sales." }
  solution: "WITH sales AS (SELECT o.store_id, SUM(i.qty * i.unit_price_vnd) AS total FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.order_date >= '2026-10-01' AND o.order_date < '2026-11-01' GROUP BY o.store_id), avg_sales AS (SELECT AVG(total) AS a FROM sales) SELECT sales.store_id, sales.total FROM sales, avg_sales WHERE sales.total > avg_sales.a"
  hint: { vi: "Một bước tính doanh số mỗi cửa hàng, bước sau tính trung bình của bước đó.", en: "One step computes each store's sales, the next step averages that step." }
- id: g-multi-cte-3
  skill: multi_cte
  kind: trap
  task: { vi: "Mỗi nhóm hàng chiếm bao nhiêu phần trăm doanh số năm 2026 (đơn `PAID`)? Lấy nhóm hàng và phần trăm, làm tròn 1 chữ số ở kết quả cuối.", en: "What percentage of 2026 sales (`PAID` orders) does each category make? Get the category and the percentage, rounded to 1 decimal on the final figure." }
  solution: "WITH by_cat AS (SELECT p.category, SUM(i.qty * i.unit_price_vnd) AS sales FROM orders o JOIN order_items i ON i.order_id = o.id JOIN products p ON p.id = i.product_id WHERE o.status = 'PAID' AND o.order_date >= '2026-01-01' GROUP BY p.category), total AS (SELECT SUM(sales) AS t FROM by_cat) SELECT by_cat.category, ROUND(100.0 * by_cat.sales / total.t, 1) FROM by_cat, total"
  hint: { vi: "Hai bước đặt tên, cách nhau bằng dấu phẩy, sau một chữ WITH duy nhất.", en: "Two named steps, separated by a comma, after a single WITH." }
  wrong:
    - sql: "WITH by_cat AS (SELECT p.category, SUM(i.qty * i.unit_price_vnd) AS sales FROM orders o JOIN order_items i ON i.order_id = o.id JOIN products p ON p.id = i.product_id WHERE o.status = 'PAID' AND o.order_date >= '2026-01-01' GROUP BY p.category) WITH total AS (SELECT SUM(sales) AS t FROM by_cat) SELECT by_cat.category, ROUND(100.0 * by_cat.sales / total.t, 1) FROM by_cat, total"
      vi: "Viết `WITH` hai lần là lỗi cú pháp. Chỉ một `WITH` ở đầu, các bước sau nối bằng dấu phẩy."
      en: "Writing `WITH` twice is a syntax error. One `WITH` at the start, the later steps joined with commas."

# ---- distinct_on (ch8)
- id: g-distinct-on-1
  skill: distinct_on
  kind: faded
  task: { vi: "Với mỗi khách có mã từ 1 đến 20, đơn mới nhất là đơn nào? Lấy mã khách, mã đơn và ngày đặt; cùng ngày thì lấy mã đơn lớn hơn.", en: "For each customer with id 1 to 20, which is their latest order? Get the customer id, order id and order date; on the same day take the larger order id." }
  starter: "SELECT DISTINCT ON (customer_id) customer_id, id, order_date FROM orders WHERE customer_id BETWEEN 1 AND 20 ORDER BY customer_id, ___"
  solution: "SELECT DISTINCT ON (customer_id) customer_id, id, order_date FROM orders WHERE customer_id BETWEEN 1 AND 20 ORDER BY customer_id, order_date DESC, id DESC"
  hint: { vi: "Sau cột của DISTINCT ON, sắp xếp sao cho dòng muốn giữ lên đầu mỗi nhóm.", en: "After the DISTINCT ON column, sort so the row you want to keep comes first in each group." }
- id: g-distinct-on-2
  skill: distinct_on
  kind: open
  task: { vi: "Mỗi nhóm hàng có sản phẩm đắt nhất là gì? Lấy nhóm hàng, tên và giá.", en: "What is the most expensive product in each category? Get the category, the name and the price." }
  solution: "SELECT DISTINCT ON (category) category, name, price_vnd FROM products ORDER BY category, price_vnd DESC, name"
  hint: { vi: "Một dòng cho mỗi nhóm hàng; dòng giữ lại là dòng giá cao nhất.", en: "One row per category; the row kept is the highest price." }
- id: g-distinct-on-3
  skill: distinct_on
  kind: trap
  task: { vi: "Mỗi cửa hàng có đơn online (`ONLINE`) gần đây nhất là đơn nào? Lấy mã cửa hàng, mã đơn và ngày đặt; cùng ngày thì lấy mã đơn lớn hơn.", en: "What is each store's most recent online (`ONLINE`) order? Get the store id, order id and order date; on the same day take the larger order id." }
  solution: "SELECT DISTINCT ON (store_id) store_id, id, order_date FROM orders WHERE channel = 'ONLINE' ORDER BY store_id, order_date DESC, id DESC"
  hint: { vi: "\"Gần đây nhất\" nghĩa là ngày lớn nhất phải lên đầu nhóm.", en: "\"Most recent\" means the largest date must come first in its group." }
  wrong:
    - sql: "SELECT DISTINCT ON (store_id) store_id, id, order_date FROM orders WHERE channel = 'ONLINE' ORDER BY store_id, order_date, id"
      vi: "Thiếu `DESC`: thứ tự tăng dần đưa đơn cũ nhất lên đầu, nên mỗi cửa hàng giữ đơn online đầu tiên chứ không phải gần nhất."
      en: "`DESC` is missing: ascending order puts the oldest order first, so each store keeps its first online order, not its latest."

# ---- union (ch9)
- id: g-union-1
  skill: union
  kind: faded
  task: { vi: "Liệt kê mọi thành phố có cửa hàng hoặc có khách (mỗi thành phố một lần, bỏ thành phố trống).", en: "List every city that has a store or a customer (each city once, leave out empty cities)." }
  starter: "SELECT city FROM stores UNION SELECT ___ FROM customers WHERE city IS NOT NULL"
  solution: "SELECT city FROM stores UNION SELECT city FROM customers WHERE city IS NOT NULL"
  hint: { vi: "Hai câu SELECT cần cùng số cột, cùng ý nghĩa.", en: "Both SELECTs need the same number of columns with the same meaning." }
- id: g-union-2
  skill: union
  kind: open
  task: { vi: "Một danh sách người cho buổi gặp ở `Ben Thanh`: tên nhân viên cửa hàng số 3 (loại 1) và tên khách ở `Ho Chi Minh City` đăng ký từ 01/10/2026 (loại 2). Lấy tên và loại.", en: "One guest list for a meeting at `Ben Thanh`: the names of store 3's staff (type 1) and of customers in `Ho Chi Minh City` who signed up from 2026-10-01 (type 2). Get the name and the type." }
  solution: "SELECT name, 1 FROM staff WHERE store_id = 3 UNION ALL SELECT name, 2 FROM customers WHERE city = 'Ho Chi Minh City' AND signup_date >= '2026-10-01'"
  hint: { vi: "Mỗi câu SELECT có WHERE riêng và tự đặt cột loại bằng một con số.", en: "Each SELECT has its own WHERE and sets the type column with a number." }
- id: g-union-3
  skill: union
  kind: trap
  task: { vi: "Liệt kê nhóm hàng của từng dòng hàng bán ngày 30/10/2026 ở cửa hàng 1, nối tiếp bằng nhóm hàng của từng dòng hàng bán cùng ngày ở cửa hàng 3. Mỗi dòng hàng một dòng, giữ cả các dòng lặp lại.", en: "List the category of every order line sold on 2026-10-30 at store 1, followed by the category of every line sold that day at store 3. One row per order line, keep the repeats." }
  solution: "SELECT p.category FROM order_items i JOIN orders o ON o.id = i.order_id JOIN products p ON p.id = i.product_id WHERE o.store_id = 1 AND o.order_date = '2026-10-30' UNION ALL SELECT p.category FROM order_items i JOIN orders o ON o.id = i.order_id JOIN products p ON p.id = i.product_id WHERE o.store_id = 3 AND o.order_date = '2026-10-30'"
  hint: { vi: "Có một cách ghép bỏ dòng trùng và một cách giữ nguyên; đề cần giữ.", en: "One way of stacking drops duplicate rows and one keeps them; the task needs them kept." }
  wrong:
    - sql: "SELECT p.category FROM order_items i JOIN orders o ON o.id = i.order_id JOIN products p ON p.id = i.product_id WHERE o.store_id = 1 AND o.order_date = '2026-10-30' UNION SELECT p.category FROM order_items i JOIN orders o ON o.id = i.order_id JOIN products p ON p.id = i.product_id WHERE o.store_id = 3 AND o.order_date = '2026-10-30'"
      vi: "`UNION` bỏ dòng trùng: mỗi nhóm hàng chỉ còn một dòng, mất các dòng hàng lặp lại. Dùng `UNION ALL`."
      en: "`UNION` drops duplicate rows: each category is left once and the repeated lines are lost. Use `UNION ALL`."

# ---- except (ch9)
- id: g-except-1
  skill: except
  kind: faded
  task: { vi: "Khách nào có đơn trong tháng 9/2026 nhưng không có đơn nào trong tháng 10/2026? Lấy mã khách.", en: "Which customers ordered in September 2026 but not in October 2026? Get the customer id." }
  starter: "SELECT customer_id FROM orders WHERE order_date >= '2026-09-01' AND order_date < '2026-10-01' AND customer_id IS NOT NULL EXCEPT SELECT ___ FROM orders WHERE order_date >= '2026-10-01' AND order_date < '2026-11-01'"
  solution: "SELECT customer_id FROM orders WHERE order_date >= '2026-09-01' AND order_date < '2026-10-01' AND customer_id IS NOT NULL EXCEPT SELECT customer_id FROM orders WHERE order_date >= '2026-10-01' AND order_date < '2026-11-01'"
  hint: { vi: "Bên phải phép trừ cũng trả về mã khách, nhưng của tháng 10.", en: "The right side of the subtraction also returns customer ids, but for October." }
- id: g-except-2
  skill: except
  kind: open
  task: { vi: "Thành phố nào có khách nhưng chưa có cửa hàng? Lấy tên thành phố.", en: "Which cities have customers but no store yet? Get the city name." }
  solution: "SELECT city FROM customers WHERE city IS NOT NULL EXCEPT SELECT city FROM stores"
  hint: { vi: "Lấy thành phố của khách, trừ đi thành phố của cửa hàng.", en: "Take the customers' cities, minus the stores' cities." }
- id: g-except-3
  skill: except
  kind: trap
  task: { vi: "Khách nào đã mua ở cửa hàng số 1 nhưng chưa bao giờ mua ở cửa hàng số 2? Lấy mã khách.", en: "Which customers have bought at store 1 but never at store 2? Get the customer id." }
  solution: "SELECT customer_id FROM orders WHERE store_id = 1 AND customer_id IS NOT NULL EXCEPT SELECT customer_id FROM orders WHERE store_id = 2"
  hint: { vi: "Phép trừ so cả dòng: chỉ để cột mã khách ở hai bên.", en: "The subtraction compares whole rows: keep only the customer id column on both sides." }
  wrong:
    - sql: "SELECT customer_id, order_date FROM orders WHERE store_id = 1 AND customer_id IS NOT NULL EXCEPT SELECT customer_id, order_date FROM orders WHERE store_id = 2"
      vi: "Thêm `order_date` vào hai bên thì dòng nào cũng khác nhau (khác ngày), nên gần như mọi đơn ở cửa hàng 1 đều còn lại, kể cả của khách từng mua ở cửa hàng 2."
      en: "With `order_date` on both sides almost every row differs (another date), so nearly every store 1 order stays, even for customers who also bought at store 2."

# ---- full_join (ch9)
- id: g-full-join-1
  skill: full_join
  kind: faded
  task: { vi: "So chỉ tiêu tháng 6/2026 (`store_targets`) với doanh số thật tháng đó (đơn `PAID`) cho mọi cửa hàng có ở một trong hai bên: lấy mã cửa hàng, chỉ tiêu và doanh số (bên nào thiếu thì để trống).", en: "Compare the June 2026 targets (`store_targets`) with that month's real sales (`PAID` orders) for every store found on either side: get the store id, the target and the sales (empty where a side is missing)." }
  starter: "WITH t AS (SELECT store_id, target_vnd FROM store_targets WHERE month = '2026-06-01'), a AS (SELECT o.store_id, SUM(i.qty * i.unit_price_vnd) AS sales FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.order_date >= '2026-06-01' AND o.order_date < '2026-07-01' GROUP BY o.store_id) SELECT COALESCE(t.store_id, a.store_id), t.target_vnd, a.sales FROM t ___ a ON a.store_id = t.store_id"
  solution: "WITH t AS (SELECT store_id, target_vnd FROM store_targets WHERE month = '2026-06-01'), a AS (SELECT o.store_id, SUM(i.qty * i.unit_price_vnd) AS sales FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.order_date >= '2026-06-01' AND o.order_date < '2026-07-01' GROUP BY o.store_id) SELECT COALESCE(t.store_id, a.store_id), t.target_vnd, a.sales FROM t FULL JOIN a ON a.store_id = t.store_id"
  hint: { vi: "Cần giữ dòng chỉ có ở bên trái và dòng chỉ có ở bên phải.", en: "You need to keep rows found only on the left and rows found only on the right." }
- id: g-full-join-2
  skill: full_join
  kind: open
  task: { vi: "Trong năm 2026, cặp cửa hàng × tháng nào chỉ có ở một bên: có chỉ tiêu mà không có doanh số (đơn `PAID`), hoặc có doanh số mà không có chỉ tiêu? Lấy mã cửa hàng, tháng, chỉ tiêu và doanh số.", en: "In 2026, which store × month pairs exist on one side only: a target with no sales (`PAID` orders), or sales with no target? Get the store id, the month, the target and the sales." }
  solution: "WITH t AS (SELECT store_id, month, target_vnd FROM store_targets), a AS (SELECT o.store_id, date_trunc('month', o.order_date)::date AS month, SUM(i.qty * i.unit_price_vnd) AS sales FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.order_date >= '2026-01-01' GROUP BY 1, 2) SELECT COALESCE(t.store_id, a.store_id), COALESCE(t.month, a.month), t.target_vnd, a.sales FROM t FULL JOIN a ON a.store_id = t.store_id AND a.month = t.month WHERE t.store_id IS NULL OR a.store_id IS NULL"
  hint: { vi: "Nối theo cả cửa hàng lẫn tháng, rồi giữ dòng mà một bên trống.", en: "Join on both store and month, then keep the rows where one side is empty." }
- id: g-full-join-3
  skill: full_join
  kind: trap
  task: { vi: "Tháng 2/2026: với mọi cửa hàng có chỉ tiêu hoặc có doanh số (đơn `PAID`), lấy mã cửa hàng, chỉ tiêu, doanh số và phần chênh (doanh số trừ chỉ tiêu; thiếu bên nào thì chênh để trống).", en: "February 2026: for every store with a target or with sales (`PAID` orders), get the store id, the target, the sales and the gap (sales minus target; empty when a side is missing)." }
  solution: "WITH t AS (SELECT store_id, target_vnd FROM store_targets WHERE month = '2026-02-01'), a AS (SELECT o.store_id, SUM(i.qty * i.unit_price_vnd) AS sales FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.order_date >= '2026-02-01' AND o.order_date < '2026-03-01' GROUP BY o.store_id) SELECT COALESCE(t.store_id, a.store_id), t.target_vnd, a.sales, a.sales - t.target_vnd FROM t FULL JOIN a ON a.store_id = t.store_id"
  hint: { vi: "Lọc tháng của mỗi bên trước khi nối, không phải sau.", en: "Filter each side's month before the join, not after it." }
  wrong:
    - sql: "WITH a AS (SELECT o.store_id, SUM(i.qty * i.unit_price_vnd) AS sales FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.order_date >= '2026-02-01' AND o.order_date < '2026-03-01' GROUP BY o.store_id) SELECT COALESCE(t.store_id, a.store_id), t.target_vnd, a.sales, a.sales - t.target_vnd FROM store_targets t FULL JOIN a ON a.store_id = t.store_id WHERE t.month = '2026-02-01'"
      vi: "Lọc `t.month` ở WHERE sau khi nối thì dòng chỉ có doanh số (cửa hàng 4 chưa có chỉ tiêu tháng 2) có `t.month` trống và bị bỏ. Lọc chỉ tiêu trong CTE trước khi nối."
      en: "Filtering `t.month` in WHERE after the join drops the sales-only row (store 4 has no February target): its `t.month` is empty. Filter the targets in a CTE before the join."

# ---- window_rank (ch10)
- id: g-window-rank-1
  skill: window_rank
  kind: faded
  task: { vi: "Xếp hạng sản phẩm theo giá trong từng nhóm hàng, đắt nhất hạng 1. Lấy nhóm hàng, tên, giá và hạng.", en: "Rank products by price within each category, the most expensive ranked 1. Get the category, name, price and rank." }
  starter: "SELECT category, name, price_vnd, RANK() OVER (PARTITION BY ___ ORDER BY price_vnd DESC) FROM products"
  solution: "SELECT category, name, price_vnd, RANK() OVER (PARTITION BY category ORDER BY price_vnd DESC) FROM products"
  hint: { vi: "Mỗi nhóm hàng xếp hạng riêng: chia nhóm theo cột nhóm hàng.", en: "Each category is ranked on its own: partition by the category column." }
- id: g-window-rank-2
  skill: window_rank
  kind: open
  task: { vi: "Với mỗi cửa hàng, 3 sản phẩm có doanh số cao nhất trong quý 3/2026 (đơn `PAID`, tháng 7–9) là gì? Lấy mã cửa hàng, mã sản phẩm, doanh số và hạng; bằng doanh số thì cùng hạng và bỏ qua hạng kế tiếp (1, 1, 3).", en: "For each store, which 3 products had the highest sales in Q3 2026 (`PAID` orders, July–September)? Get the store id, product id, sales and rank; equal sales share a rank and skip the next one (1, 1, 3)." }
  solution: "WITH s AS (SELECT o.store_id, i.product_id, SUM(i.qty * i.unit_price_vnd) AS sales FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.order_date >= '2026-07-01' AND o.order_date < '2026-10-01' GROUP BY 1, 2), r AS (SELECT store_id, product_id, sales, RANK() OVER (PARTITION BY store_id ORDER BY sales DESC) AS rk FROM s) SELECT store_id, product_id, sales, rk FROM r WHERE rk <= 3"
  hint: { vi: "Tính hạng trong một bước có tên, rồi lọc hạng ở câu ngoài.", en: "Compute the rank in a named step, then filter on it outside." }
- id: g-window-rank-3
  skill: window_rank
  kind: trap
  task: { vi: "Xếp hạng khách ở `Hue` theo số đơn, nhiều nhất hạng 1; bằng số đơn thì cùng hạng và bỏ qua hạng kế tiếp (1, 1, 3). Lấy tên khách, số đơn và hạng.", en: "Rank the customers in `Hue` by number of orders, the most ranked 1; equal counts share a rank and skip the next one (1, 1, 3). Get the customer name, order count and rank." }
  solution: "SELECT c.name, COUNT(*), RANK() OVER (ORDER BY COUNT(*) DESC) FROM customers c JOIN orders o ON o.customer_id = c.id WHERE c.city = 'Hue' GROUP BY c.id, c.name"
  hint: { vi: "Khi số đơn bằng nhau, hai khách phải nhận cùng hạng.", en: "When order counts are equal, both customers must get the same rank." }
  wrong:
    - sql: "SELECT c.name, COUNT(*), ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) FROM customers c JOIN orders o ON o.customer_id = c.id WHERE c.city = 'Hue' GROUP BY c.id, c.name"
      vi: "`ROW_NUMBER` đánh số liền nhau và xếp các khách bằng số đơn theo thứ tự tùy ý. Muốn bằng nhau cùng hạng (1, 1, 3) thì dùng `RANK`."
      en: "`ROW_NUMBER` numbers rows one after another and orders tied customers arbitrarily. For ties to share a rank (1, 1, 3) use `RANK`."

# ---- window_lag (ch10)
- id: g-window-lag-1
  skill: window_lag
  kind: faded
  task: { vi: "Doanh số mỗi tháng năm 2026 (đơn `PAID`) và doanh số của tháng liền trước. Lấy tháng, doanh số tháng đó và doanh số tháng trước.", en: "Sales for each month of 2026 (`PAID` orders) and the previous month's sales. Get the month, that month's sales and the previous month's sales." }
  starter: "WITH m AS (SELECT date_trunc('month', o.order_date) AS month, SUM(i.qty * i.unit_price_vnd) AS sales FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.order_date >= '2026-01-01' GROUP BY 1) SELECT month, sales, LAG(sales) OVER (ORDER BY ___) FROM m"
  solution: "WITH m AS (SELECT date_trunc('month', o.order_date) AS month, SUM(i.qty * i.unit_price_vnd) AS sales FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.order_date >= '2026-01-01' GROUP BY 1) SELECT month, sales, LAG(sales) OVER (ORDER BY month) FROM m"
  hint: { vi: "\"Dòng trước\" theo thứ tự tháng.", en: "\"The previous row\" in month order." }
- id: g-window-lag-2
  skill: window_lag
  kind: open
  task: { vi: "Quý 3/2026 (tháng 7–9), doanh số mỗi cửa hàng mỗi tháng (đơn `PAID`) thay đổi bao nhiêu so với tháng trước của chính cửa hàng đó? Lấy mã cửa hàng, tháng, doanh số và phần thay đổi (tháng đầu để trống).", en: "In Q3 2026 (July–September), how much did each store's monthly sales (`PAID` orders) change from that same store's previous month? Get the store id, the month, the sales and the change (empty for the first month)." }
  solution: "WITH m AS (SELECT o.store_id, date_trunc('month', o.order_date) AS month, SUM(i.qty * i.unit_price_vnd) AS sales FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.order_date >= '2026-07-01' AND o.order_date < '2026-10-01' GROUP BY 1, 2) SELECT store_id, month, sales, sales - LAG(sales) OVER (PARTITION BY store_id ORDER BY month) FROM m"
  hint: { vi: "Mỗi cửa hàng chỉ so với chính nó: chia nhóm theo cửa hàng, sắp theo tháng.", en: "Each store compares only with itself: partition by store, order by month." }
- id: g-window-lag-3
  skill: window_lag
  kind: trap
  task: { vi: "Với các đơn của khách số 1 đến 5: lấy mã khách, mã đơn, ngày đặt và ngày đặt đơn liền trước của chính khách đó (theo ngày, rồi theo mã đơn; đơn đầu tiên để trống).", en: "For the orders of customers 1 to 5: get the customer id, order id, order date and the date of that same customer's previous order (by date, then by order id; the first order is empty)." }
  solution: "SELECT customer_id, id, order_date, LAG(order_date) OVER (PARTITION BY customer_id ORDER BY order_date, id) FROM orders WHERE customer_id BETWEEN 1 AND 5"
  hint: { vi: "Đơn trước phải là của cùng một khách.", en: "The previous order must belong to the same customer." }
  wrong:
    - sql: "SELECT customer_id, id, order_date, LAG(order_date) OVER (ORDER BY order_date, id) FROM orders WHERE customer_id BETWEEN 1 AND 5"
      vi: "Thiếu `PARTITION BY customer_id`: \"đơn trước\" là đơn liền trước của bất kỳ khách nào, nên khách này bị so với khách khác."
      en: "`PARTITION BY customer_id` is missing: \"the previous order\" is the previous order of any customer, so one customer is compared with another."

# ---- window_agg (ch10)
- id: g-window-agg-1
  skill: window_agg
  kind: faded
  task: { vi: "Doanh số cộng dồn từ đầu năm 2026 (đơn `PAID`): lấy tháng, doanh số tháng đó và tổng cộng dồn tới hết tháng đó.", en: "Year-to-date 2026 sales (`PAID` orders): get the month, that month's sales and the running total up to the end of that month." }
  starter: "WITH m AS (SELECT date_trunc('month', o.order_date) AS month, SUM(i.qty * i.unit_price_vnd) AS sales FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.order_date >= '2026-01-01' GROUP BY 1) SELECT month, sales, SUM(sales) OVER (___) FROM m"
  solution: "WITH m AS (SELECT date_trunc('month', o.order_date) AS month, SUM(i.qty * i.unit_price_vnd) AS sales FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.order_date >= '2026-01-01' GROUP BY 1) SELECT month, sales, SUM(sales) OVER (ORDER BY month) FROM m"
  hint: { vi: "Tổng cộng dồn cần thứ tự trong cửa sổ.", en: "A running total needs an order inside the window." }
- id: g-window-agg-2
  skill: window_agg
  kind: open
  task: { vi: "Tháng 10/2026, mỗi cửa hàng chiếm bao nhiêu phần trăm doanh số cả chuỗi (đơn `PAID`)? Lấy mã cửa hàng, doanh số và phần trăm, làm tròn 1 chữ số ở kết quả cuối.", en: "In October 2026, what percentage of the chain's sales (`PAID` orders) does each store make? Get the store id, the sales and the percentage, rounded to 1 decimal on the final figure." }
  solution: "WITH s AS (SELECT o.store_id, SUM(i.qty * i.unit_price_vnd) AS sales FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.order_date >= '2026-10-01' AND o.order_date < '2026-11-01' GROUP BY 1) SELECT store_id, sales, ROUND(100.0 * sales / SUM(sales) OVER (), 1) FROM s"
  hint: { vi: "Tổng cả chuỗi đặt cạnh mỗi dòng: một cửa sổ rỗng bao mọi dòng.", en: "The chain total next to every row: an empty window covers all rows." }
- id: g-window-agg-3
  skill: window_agg
  kind: trap
  task: { vi: "Quý 3/2026 (tháng 7–9), doanh số cộng dồn theo tháng của từng cửa hàng (đơn `PAID`): lấy mã cửa hàng, tháng, doanh số và tổng cộng dồn của cửa hàng đó tới hết tháng.", en: "Q3 2026 (July–September), each store's running monthly sales (`PAID` orders): get the store id, the month, the sales and that store's running total up to the end of the month." }
  solution: "WITH m AS (SELECT o.store_id, date_trunc('month', o.order_date) AS month, SUM(i.qty * i.unit_price_vnd) AS sales FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.order_date >= '2026-07-01' AND o.order_date < '2026-10-01' GROUP BY 1, 2) SELECT store_id, month, sales, SUM(sales) OVER (PARTITION BY store_id ORDER BY month) FROM m"
  hint: { vi: "Cộng dồn trong từng cửa hàng, theo thứ tự tháng.", en: "Run the total inside each store, in month order." }
  wrong:
    - sql: "WITH m AS (SELECT o.store_id, date_trunc('month', o.order_date) AS month, SUM(i.qty * i.unit_price_vnd) AS sales FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.order_date >= '2026-07-01' AND o.order_date < '2026-10-01' GROUP BY 1, 2) SELECT store_id, month, sales, SUM(sales) OVER (PARTITION BY store_id) FROM m"
      vi: "Thiếu `ORDER BY` trong `OVER`: tháng nào cũng nhận tổng cả quý của cửa hàng, không phải tổng cộng dồn."
      en: "`ORDER BY` is missing inside `OVER`: every month gets the store's whole-quarter total, not a running total."

# ---- explain_read (ch11)
- id: g-explain-read-1
  skill: explain_read
  kind: faded
  task: { vi: "Lấy mã đơn và ngày đặt của mọi đơn của khách số 42. Chạy xong, mở tab EXPLAIN: bảng `orders` được đọc qua chỉ mục nào?", en: "Get the order id and order date of every order of customer 42. After running it, open the EXPLAIN tab: which index reads the `orders` table?" }
  starter: "SELECT id, order_date FROM orders WHERE ___ = 42"
  solution: "SELECT id, order_date FROM orders WHERE customer_id = 42"
  plan: { index: orders }
  hint: { vi: "Lọc theo cột có chỉ mục `orders(customer_id)`; trong kế hoạch tìm nút Index Scan hoặc Bitmap Index Scan.", en: "Filter on the column of the `orders(customer_id)` index; in the plan look for an Index Scan or Bitmap Index Scan node." }
- id: g-explain-read-2
  skill: explain_read
  kind: open
  task: { vi: "Mỗi ngày từ 01/10/2026 đến 07/10/2026 có bao nhiêu đơn? Lấy ngày và số đơn. Viết điều kiện ngày sao cho kế hoạch đọc `orders` qua chỉ mục `orders(order_date)`.", en: "How many orders were placed on each day from 2026-10-01 to 2026-10-07? Get the date and the count. Write the date condition so the plan reads `orders` through the `orders(order_date)` index." }
  solution: "SELECT order_date, COUNT(*) FROM orders WHERE order_date >= '2026-10-01' AND order_date < '2026-10-08' GROUP BY order_date"
  plan: { index: orders }
  hint: { vi: "So sánh trực tiếp cột ngày với hai mốc; đọc kế hoạch từ nút trong cùng ra ngoài.", en: "Compare the date column directly with two bounds; read the plan from the innermost node outwards." }
- id: g-explain-read-3
  skill: explain_read
  kind: trap
  task: { vi: "Khách số 42 có bao nhiêu đơn đã thanh toán (`PAID`)? Lấy một con số. Kế hoạch vẫn phải bắt đầu từ chỉ mục theo khách.", en: "How many paid (`PAID`) orders does customer 42 have? Get one number. The plan must still start from the customer index." }
  solution: "SELECT COUNT(*) FROM orders WHERE customer_id = 42 AND status = 'PAID'"
  plan: { index: orders }
  hint: { vi: "Hai điều kiện phải cùng đúng.", en: "Both conditions must hold." }
  wrong:
    - sql: "SELECT COUNT(*) FROM orders WHERE customer_id = 42 OR status = 'PAID'"
      vi: "`OR` đếm cả đơn `PAID` của mọi khách. Tab EXPLAIN cũng báo hiệu: kế hoạch chuyển sang Seq Scan đọc hết `orders`, vì không chỉ mục nào trả lời được vế `status`."
      en: "`OR` also counts every customer's `PAID` orders. The EXPLAIN tab gives it away too: the plan switches to a Seq Scan over all of `orders`, since no index answers the `status` side."

# ---- sargable (ch11)
- id: g-sargable-1
  skill: sargable
  kind: faded
  task: { vi: "Lấy mã đơn, mã cửa hàng và ngày đặt của các đơn trong tuần 05/10/2026–11/10/2026, viết điều kiện ngày dạng khoảng nửa mở để dùng được chỉ mục `orders(order_date)`.", en: "Get the order id, store id and order date of the orders in the week 2026-10-05 to 2026-10-11, writing the date condition as a half-open range so the `orders(order_date)` index can be used." }
  starter: "SELECT id, store_id, order_date FROM orders WHERE order_date >= '2026-10-05' AND order_date < ___"
  solution: "SELECT id, store_id, order_date FROM orders WHERE order_date >= '2026-10-05' AND order_date < '2026-10-12'"
  plan: { index: orders }
  hint: { vi: "Mốc trên là ngày ngay sau ngày cuối, dùng dấu nhỏ hơn.", en: "The upper bound is the day right after the last day, with less-than." }
- id: g-sargable-2
  skill: sargable
  kind: open
  task: { vi: "Tháng 10/2026, mỗi kênh bán (`channel`) có bao nhiêu đơn? Lấy kênh và số đơn; để cột ngày trần để chỉ mục `orders(order_date)` dùng được.", en: "In October 2026, how many orders did each sales channel (`channel`) get? Get the channel and the count; leave the date column bare so the `orders(order_date)` index can be used." }
  solution: "SELECT channel, COUNT(*) FROM orders WHERE order_date >= '2026-10-01' AND order_date < '2026-11-01' GROUP BY channel"
  plan: { index: orders }
  hint: { vi: "Không bọc cột ngày trong hàm; so nó với hai mốc ngày.", en: "Do not wrap the date column in a function; compare it with two dates." }
- id: g-sargable-3
  skill: sargable
  kind: trap
  task: { vi: "Lấy mã và ngày đặt của các đơn online (`ONLINE`) tháng 10/2026, viết sao cho chỉ mục `orders(order_date)` dùng được.", en: "Get the id and order date of the online (`ONLINE`) orders of October 2026, written so the `orders(order_date)` index can be used." }
  solution: "SELECT id, order_date FROM orders WHERE channel = 'ONLINE' AND order_date >= '2026-10-01' AND order_date < '2026-11-01'"
  plan: { index: orders }
  hint: { vi: "Lấy tháng ra khỏi cột vừa chậm vừa dễ sai: tháng 10 có ở cả hai năm.", en: "Pulling the month out of the column is both slow and easy to get wrong: October exists in two years." }
  wrong:
    - sql: "SELECT id, order_date FROM orders WHERE channel = 'ONLINE' AND extract(month FROM order_date) = 10"
      vi: "`extract(month …) = 10` lấy cả tháng 10/2025, và bọc cột trong hàm nên kế hoạch thành Seq Scan. Dùng khoảng nửa mở `>= '2026-10-01' AND < '2026-11-01'`."
      en: "`extract(month …) = 10` also takes October 2025, and wrapping the column in a function turns the plan into a Seq Scan. Use the half-open range `>= '2026-10-01' AND < '2026-11-01'`."

# ---- index_design (ch11)
- id: g-index-design-1
  skill: index_design
  kind: faded
  task: { vi: "Các sự kiện của người dùng số 77 trong tháng 9/2026: lấy tên sự kiện và thời điểm, theo thứ tự thời gian. Chỉ mục `app_events(user_id, ts)` đọc được cả hai điều kiện.", en: "User 77's events in September 2026: get the event name and the time, in time order. The `app_events(user_id, ts)` index can serve both conditions." }
  starter: "SELECT event, ts FROM app_events WHERE user_id = 77 AND ts >= ___ AND ts < ___ ORDER BY ts"
  solution: "SELECT event, ts FROM app_events WHERE user_id = 77 AND ts >= '2026-09-01' AND ts < '2026-10-01' ORDER BY ts"
  ordered: true
  plan: { index: app_events }
  hint: { vi: "Cột đầu của chỉ mục là `user_id` (so bằng), cột sau là `ts` (một khoảng).", en: "The index's first column is `user_id` (equality), the next is `ts` (a range)." }
- id: g-index-design-2
  skill: index_design
  kind: open
  task: { vi: "Sự kiện gần đây nhất của người dùng số 120 là gì? Lấy tên sự kiện, thời điểm và thiết bị (`device` trong `props`).", en: "What is user 120's most recent event? Get the event name, the time and the device (`device` in `props`)." }
  solution: "SELECT event, ts, props->>'device' FROM app_events WHERE user_id = 120 ORDER BY ts DESC LIMIT 1"
  plan: { index: app_events }
  hint: { vi: "Lọc theo cột đầu của chỉ mục, sắp theo cột thứ hai giảm dần, lấy một dòng.", en: "Filter on the index's first column, sort by its second column descending, take one row." }
- id: g-index-design-3
  skill: index_design
  kind: trap
  task: { vi: "Người dùng số 77 có những sự kiện nào trong ngày 05/09/2026? Lấy tên sự kiện và thời điểm. Chỉ mục `app_events(user_id, ts)` chỉ giúp khi cột đầu của nó được lọc.", en: "Which events did user 77 have on 2026-09-05? Get the event name and the time. The `app_events(user_id, ts)` index only helps when its first column is filtered." }
  solution: "SELECT event, ts FROM app_events WHERE user_id = 77 AND ts >= '2026-09-05' AND ts < '2026-09-06'"
  plan: { index: app_events }
  hint: { vi: "Lọc theo cả người dùng lẫn thời gian.", en: "Filter on both the user and the time." }
  wrong:
    - sql: "SELECT event, ts FROM app_events WHERE ts >= '2026-09-05' AND ts < '2026-09-06'"
      vi: "Thiếu `user_id = 77`: ra sự kiện của mọi người dùng ngày đó, và vì cột đầu của chỉ mục không được lọc nên kế hoạch thành Seq Scan."
      en: "`user_id = 77` is missing: you get every user's events that day, and since the index's first column is not filtered the plan becomes a Seq Scan."
````

## Phụ lục D · `content/general/adv.yml` (28 nút, 80 bài)

Task 5.

````yaml
# Lộ trình DA nâng cao (product-design-v5 §D.3, Plan 8a). Dữ liệu: schema `lab` (src/db/lab.sql).
# needs = id kỹ năng (content/skills.yml) hoặc id nút trong file này. status: in ▣ | partial ◐ | external ↗.
- id: a1
  group: A
  status: in
  title: { vi: "Khung cửa sổ (window frame)", en: "Window frames" }
  why: { vi: "Trung bình trượt và cộng dồn có giới hạn là phần của mọi báo cáo xu hướng.", en: "Moving averages and bounded running totals are part of every trend report." }
  needs: [window_agg, window_lag]
  applies: { vi: "Báo cáo doanh thu hằng ngày, theo dõi xu hướng.", en: "Daily revenue reports, trend tracking." }
  lesson:
    concept:
      vi: "Hàm cửa sổ (window function) nhìn vào một nhóm dòng quanh dòng hiện tại. Khung (frame) nói nhóm đó là những dòng nào: ROWS đếm theo số dòng (2 dòng trước và dòng này), RANGE đếm theo giá trị (7 ngày lịch gần nhất). Khi dữ liệu thiếu ngày, hai cách cho kết quả khác nhau."
      en: "A window function looks at a group of rows around the current row. The frame says which rows: ROWS counts rows (the 2 rows before and this one), RANGE counts by value (the last 7 calendar days). When days are missing, the two give different results."
    example: "WITH d AS (SELECT o.order_date, sum(i.qty * i.unit_price_vnd) AS revenue FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.store_id = 3 AND o.order_date >= '2026-10-01' GROUP BY o.order_date) SELECT order_date, revenue, round(avg(revenue) OVER (ORDER BY order_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)) AS avg_3 FROM d ORDER BY order_date"
    explain:
      vi: "① CTE `d` tính doanh thu mỗi ngày của cửa hàng 3 trong tháng 10/2026. ② `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW`: trung bình của dòng này và 2 dòng trước. Ngày 01/10 chỉ có chính nó (295.000), ngày 02/10 là trung bình 2 ngày (533.750). ③ `ORDER BY` trong `OVER` quyết định dòng nào là \"trước\". ④ Nếu một ngày không bán gì, ROWS lấy luôn ngày bán xa hơn; muốn đúng 3 ngày lịch thì dùng `RANGE` với `interval`."
      en: "① The CTE `d` gives store 3's revenue per day in October 2026. ② `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW`: the average of this row and the 2 before it. On 1 Oct there is only itself (295,000); on 2 Oct it averages 2 days (533,750). ③ The `ORDER BY` inside `OVER` decides which rows come before. ④ If a day had no sales, ROWS reaches back to an older day; for exactly 3 calendar days use `RANGE` with an `interval`."
    mistake:
      sql: "WITH d AS (SELECT o.order_date, sum(i.qty * i.unit_price_vnd) AS revenue FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.store_id = 3 AND o.order_date >= '2026-10-01' GROUP BY o.order_date) SELECT order_date, revenue, round(avg(revenue) OVER (ORDER BY order_date)) AS avg_3 FROM d ORDER BY order_date"
      vi: "Bỏ khung: với `ORDER BY` mà không ghi khung, Postgres lấy từ dòng đầu tới dòng hiện tại. Bạn nhận trung bình cộng dồn từ đầu tháng, không phải trung bình 3 dòng."
      en: "No frame: with `ORDER BY` and no frame, Postgres takes every row from the first to the current one. You get an average since the start of the month, not over 3 rows."
    try:
      task:
        vi: "Đổi sang trung bình 7 ngày lịch gần nhất (tính cả hôm nay), để ngày không bán không làm khung kéo dài."
        en: "Change it to the average over the last 7 calendar days (today included), so days without sales do not stretch the frame."
      starter: "WITH d AS (SELECT o.order_date, sum(i.qty * i.unit_price_vnd) AS revenue FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.store_id = 3 AND o.order_date >= '2026-10-01' GROUP BY o.order_date) SELECT order_date, revenue, round(avg(revenue) OVER (ORDER BY order_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)) AS avg_3 FROM d ORDER BY order_date"
      solution: "WITH d AS (SELECT o.order_date, sum(i.qty * i.unit_price_vnd) AS revenue FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.store_id = 3 AND o.order_date >= '2026-10-01' GROUP BY o.order_date) SELECT order_date, revenue, round(avg(revenue) OVER (ORDER BY order_date RANGE BETWEEN interval '6 days' PRECEDING AND CURRENT ROW)) AS avg_7 FROM d ORDER BY order_date"
      ordered: true
    docs: https://www.postgresql.org/docs/current/sql-expressions.html#SYNTAX-WINDOW-FUNCTIONS
  drills:
    - id: g-a1-1
      kind: faded
      task:
        vi: "Doanh thu cộng dồn từ đầu tháng 10/2026 của cửa hàng 1 (chỉ đơn `PAID`): mỗi ngày có bán một dòng gồm ngày, doanh thu ngày, doanh thu cộng dồn, xếp theo ngày."
        en: "Store 1's running revenue since the start of October 2026 (only `PAID` orders): one row per day with sales, with the date, the day's revenue and the running total, sorted by date."
      starter: "WITH d AS (SELECT o.order_date, sum(i.qty * i.unit_price_vnd) AS revenue FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.store_id = 1 AND o.order_date >= '2026-10-01' GROUP BY o.order_date) SELECT order_date, revenue, sum(revenue) OVER (ORDER BY order_date ROWS BETWEEN ___ AND CURRENT ROW) FROM d ORDER BY order_date"
      solution: "WITH d AS (SELECT o.order_date, sum(i.qty * i.unit_price_vnd) AS revenue FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.store_id = 1 AND o.order_date >= '2026-10-01' GROUP BY o.order_date) SELECT order_date, revenue, sum(revenue) OVER (ORDER BY order_date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) FROM d ORDER BY order_date"
      ordered: true
      hint: { vi: "Cộng dồn nghĩa là khung bắt đầu từ dòng đầu tiên: `UNBOUNDED PRECEDING`.", en: "A running total means the frame starts at the very first row: `UNBOUNDED PRECEDING`." }
    - id: g-a1-2
      kind: open
      task:
        vi: "Năm 2026, mỗi cửa hàng mỗi tháng: mã cửa hàng, tháng (`date_trunc`), doanh thu đơn `PAID`, và trung bình của tháng này cùng 2 tháng trước đó của chính cửa hàng đó (làm tròn tới đồng). Xếp theo cửa hàng rồi tháng."
        en: "For 2026, each store and month: store id, month (`date_trunc`), revenue from `PAID` orders, and the average of this month and the 2 months before for that same store (rounded to whole VND). Sort by store, then month."
      solution: "WITH m AS (SELECT o.store_id, date_trunc('month', o.order_date) AS month, sum(i.qty * i.unit_price_vnd) AS revenue FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.order_date >= '2026-01-01' GROUP BY o.store_id, date_trunc('month', o.order_date)) SELECT store_id, month, revenue, round(avg(revenue) OVER (PARTITION BY store_id ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)) AS avg_3m FROM m ORDER BY store_id, month"
      ordered: true
      hint: { vi: "Mỗi cửa hàng một cửa sổ riêng: `PARTITION BY store_id`, rồi khung 2 dòng trước.", en: "Each store gets its own window: `PARTITION BY store_id`, then a frame of 2 rows before." }
    - id: g-a1-3
      kind: trap
      task:
        vi: "Cửa hàng 2, tháng 10/2026: mỗi ngày có đơn `PAID` một dòng gồm ngày, doanh thu ngày và tổng doanh thu 7 ngày lịch gần nhất (tính cả ngày đó). Xếp theo ngày."
        en: "Store 2, October 2026: one row per day with a `PAID` order, with the date, the day's revenue and the total revenue of the last 7 calendar days (that day included). Sort by date."
      solution: "WITH d AS (SELECT o.order_date, sum(i.qty * i.unit_price_vnd) AS revenue FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.store_id = 2 AND o.order_date >= '2026-10-01' GROUP BY o.order_date) SELECT order_date, revenue, sum(revenue) OVER (ORDER BY order_date RANGE BETWEEN interval '6 days' PRECEDING AND CURRENT ROW) AS last_7_days FROM d ORDER BY order_date"
      ordered: true
      hint: { vi: "Cửa hàng 2 có 14 ngày trong tháng không bán gì. \"7 ngày lịch\" là khoảng theo giá trị ngày, không phải 7 dòng.", en: "Store 2 had no sales on 14 days of the month. \"7 calendar days\" is a range of date values, not 7 rows." }
      wrong:
        - sql: "WITH d AS (SELECT o.order_date, sum(i.qty * i.unit_price_vnd) AS revenue FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.store_id = 2 AND o.order_date >= '2026-10-01' GROUP BY o.order_date) SELECT order_date, revenue, sum(revenue) OVER (ORDER BY order_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS last_7_days FROM d ORDER BY order_date"
          vi: "`ROWS BETWEEN 6 PRECEDING` lấy 7 dòng, mà ngày không bán thì không có dòng: khung kéo về những ngày cũ hơn 7 ngày. Dùng `RANGE` với `interval '6 days'`."
          en: "`ROWS BETWEEN 6 PRECEDING` takes 7 rows, and a day without sales has no row: the frame reaches days older than 7 days. Use `RANGE` with `interval '6 days'`."
    - id: g-a1-4
      kind: challenge
      task:
        vi: "Tháng 9 và 10/2026, cửa hàng 3: ngày nào doanh thu `PAID` lớn hơn 3 lần trung bình doanh thu của các ngày có bán trong 7 ngày lịch ngay trước nó (không tính chính ngày đó)? Lấy ngày, doanh thu, trung bình đó (làm tròn tới đồng), xếp theo ngày."
        en: "September and October 2026, store 3: which days had `PAID` revenue above 3 times the average revenue of the selling days in the 7 calendar days just before (the day itself not included)? Get the date, the revenue and that average (rounded to whole VND), sorted by date."
      solution: "WITH d AS (SELECT o.order_date, sum(i.qty * i.unit_price_vnd) AS revenue FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.store_id = 3 AND o.order_date >= '2026-08-25' AND o.order_date < '2026-11-01' GROUP BY o.order_date), w AS (SELECT order_date, revenue, avg(revenue) OVER (ORDER BY order_date RANGE BETWEEN interval '7 days' PRECEDING AND interval '1 day' PRECEDING) AS prev_avg FROM d) SELECT order_date, revenue, round(prev_avg) FROM w WHERE order_date >= '2026-09-01' AND revenue > 3 * prev_avg ORDER BY order_date"
      ordered: true
      hint: { vi: "Khung có thể kết thúc trước dòng hiện tại: `... AND interval '1 day' PRECEDING`. Lấy dữ liệu từ cuối tháng 8 để ngày 01/09 cũng có 7 ngày trước.", en: "A frame can end before the current row: `... AND interval '1 day' PRECEDING`. Read data from late August so 1 September also has 7 days before it." }

- id: a2
  group: A
  status: in
  title: { vi: "Phân vị và phân phối", en: "Percentiles and distributions" }
  why: { vi: "Trung vị (median) đúng hơn trung bình khi dữ liệu lệch, và chia khách thành nhóm đều nhau là việc hằng ngày.", en: "The median is more honest than the average on skewed data, and splitting customers into equal groups is daily work." }
  needs: [aggregate, window_rank]
  applies: { vi: "Giá trị đơn điển hình, phân nhóm khách theo chi tiêu.", en: "Typical order value, customer spend groups." }
  lesson:
    concept:
      vi: "Trung bình bị vài đơn rất lớn kéo lên; trung vị là giá trị đứng giữa khi xếp tất cả. percentile_cont(0.5) WITHIN GROUP (ORDER BY x) tính trung vị, 0.9 cho phân vị 90. NTILE(4) OVER (ORDER BY x) chia các dòng thành 4 nhóm gần bằng nhau về số dòng."
      en: "A few very large orders pull the average up; the median is the middle value once everything is sorted. percentile_cont(0.5) WITHIN GROUP (ORDER BY x) gives the median, 0.9 the 90th percentile. NTILE(4) OVER (ORDER BY x) splits the rows into 4 groups of nearly equal size."
    example: "SELECT s.city, percentile_cont(0.5) WITHIN GROUP (ORDER BY t.total) AS median_vnd, round(avg(t.total)) AS avg_vnd FROM orders o JOIN stores s ON s.id = o.store_id JOIN (SELECT order_id, sum(qty * unit_price_vnd) AS total FROM order_items GROUP BY order_id) t ON t.order_id = o.id WHERE o.status = 'PAID' GROUP BY s.city ORDER BY s.city"
    explain:
      vi: "① Truy vấn con `t` tính giá trị mỗi đơn. ② `percentile_cont(0.5) WITHIN GROUP (ORDER BY t.total)`: trung vị, cú pháp riêng của hàm phân vị. ③ Kết quả 3 thành phố: ở Da Nang trung vị là 353.250 đồng còn trung bình là 465.112 đồng. Trung bình cao hơn vì vài đơn rất lớn. ④ Báo cáo \"đơn điển hình\" nên dùng trung vị."
      en: "① The subquery `t` gives each order's value. ② `percentile_cont(0.5) WITHIN GROUP (ORDER BY t.total)`: the median, with the special syntax of percentile functions. ③ Result, 3 cities: in Da Nang the median is 353,250 VND while the average is 465,112 VND. The average is higher because of a few very large orders. ④ A \"typical order\" report should use the median."
    mistake:
      sql: "SELECT s.city, percentile_cont(0.5) (ORDER BY t.total) AS median_vnd FROM orders o JOIN stores s ON s.id = o.store_id JOIN (SELECT order_id, sum(qty * unit_price_vnd) AS total FROM order_items GROUP BY order_id) t ON t.order_id = o.id GROUP BY s.city"
      vi: "Thiếu `WITHIN GROUP`: Postgres báo lỗi cú pháp. Hàm phân vị luôn viết `percentile_cont(0.5) WITHIN GROUP (ORDER BY ...)`."
      en: "`WITHIN GROUP` is missing: Postgres reports a syntax error. Percentile functions are always written `percentile_cont(0.5) WITHIN GROUP (ORDER BY ...)`."
    try:
      task:
        vi: "Sửa ví dụ để mỗi thành phố có phân vị 90 của giá trị đơn thay cho trung vị (giữ cột trung bình)."
        en: "Change the example so each city shows the 90th percentile of order value instead of the median (keep the average column)."
      starter: "SELECT s.city, percentile_cont(0.5) WITHIN GROUP (ORDER BY t.total) AS median_vnd, round(avg(t.total)) AS avg_vnd FROM orders o JOIN stores s ON s.id = o.store_id JOIN (SELECT order_id, sum(qty * unit_price_vnd) AS total FROM order_items GROUP BY order_id) t ON t.order_id = o.id WHERE o.status = 'PAID' GROUP BY s.city ORDER BY s.city"
      solution: "SELECT s.city, percentile_cont(0.9) WITHIN GROUP (ORDER BY t.total) AS p90_vnd, round(avg(t.total)) AS avg_vnd FROM orders o JOIN stores s ON s.id = o.store_id JOIN (SELECT order_id, sum(qty * unit_price_vnd) AS total FROM order_items GROUP BY order_id) t ON t.order_id = o.id WHERE o.status = 'PAID' GROUP BY s.city ORDER BY s.city"
    docs: https://www.postgresql.org/docs/current/functions-aggregate.html#FUNCTIONS-ORDEREDSET-TABLE
  drills:
    - id: g-a2-1
      kind: faded
      task:
        vi: "Giá trung vị của sản phẩm trong mỗi danh mục (`category`)."
        en: "The median product price in each `category`."
      starter: "SELECT category, percentile_cont(0.5) WITHIN GROUP (ORDER BY ___) FROM products GROUP BY category"
      solution: "SELECT category, percentile_cont(0.5) WITHIN GROUP (ORDER BY price_vnd) FROM products GROUP BY category"
      hint: { vi: "Trong `ORDER BY` của hàm phân vị là cột bạn muốn lấy trung vị.", en: "Inside the percentile's `ORDER BY` goes the column you want the median of." }
    - id: g-a2-2
      kind: open
      task:
        vi: "Chia khách thành viên thành 4 nhóm theo tổng chi tiêu đơn `PAID` (nhóm 4 chi nhiều nhất). Mỗi nhóm: số nhóm, số khách, chi tiêu nhỏ nhất và lớn nhất trong nhóm, xếp theo nhóm."
        en: "Split member customers into 4 groups by their total `PAID` spend (group 4 spends the most). For each group: the group number, the number of customers, and the smallest and largest spend in it, sorted by group."
      solution: "WITH spend AS (SELECT o.customer_id, sum(i.qty * i.unit_price_vnd) AS total FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.customer_id IS NOT NULL GROUP BY o.customer_id), g AS (SELECT customer_id, total, NTILE(4) OVER (ORDER BY total, customer_id) AS grp FROM spend) SELECT grp, count(*), min(total), max(total) FROM g GROUP BY grp ORDER BY grp"
      ordered: true
      hint: { vi: "Tính tổng chi tiêu mỗi khách trước (CTE), rồi `NTILE(4) OVER (ORDER BY ...)` tăng dần để nhóm 4 là cao nhất.", en: "First total each customer's spend (a CTE), then `NTILE(4) OVER (ORDER BY ...)` ascending so group 4 is the top." }
    - id: g-a2-3
      kind: trap
      task:
        vi: "Giá trị đơn điển hình theo kênh: với mỗi kênh (`channel`), lấy trung vị giá trị các đơn `PAID`."
        en: "Typical order value by channel: for each `channel`, the median value of its `PAID` orders."
      solution: "SELECT o.channel, percentile_cont(0.5) WITHIN GROUP (ORDER BY t.total) FROM orders o JOIN (SELECT order_id, sum(qty * unit_price_vnd) AS total FROM order_items GROUP BY order_id) t ON t.order_id = o.id WHERE o.status = 'PAID' GROUP BY o.channel"
      hint: { vi: "\"Điển hình\" ở đây là trung vị, không phải trung bình.", en: "\"Typical\" here means the median, not the average." }
      wrong:
        - sql: "SELECT o.channel, round(avg(t.total), 2) FROM orders o JOIN (SELECT order_id, sum(qty * unit_price_vnd) AS total FROM order_items GROUP BY order_id) t ON t.order_id = o.id WHERE o.status = 'PAID' GROUP BY o.channel"
          vi: "Đây là trung bình: vài đơn rất lớn kéo nó lên cao hơn đơn điển hình. Dùng `percentile_cont(0.5) WITHIN GROUP`."
          en: "This is the average: a few very large orders pull it above the typical order. Use `percentile_cont(0.5) WITHIN GROUP`."
    - id: g-a2-4
      kind: challenge
      task:
        vi: "Lấy trung vị giá trị đơn `PAID` của cả chuỗi. Với mỗi cửa hàng: mã cửa hàng và tỷ lệ % đơn `PAID` của cửa hàng có giá trị lớn hơn trung vị đó (làm tròn 1 chữ số thập phân), xếp theo mã cửa hàng."
        en: "Take the chain-wide median value of `PAID` orders. For each store: the store id and the % of its `PAID` orders worth more than that median (rounded to 1 decimal), sorted by store id."
      solution: "WITH t AS (SELECT o.id, o.store_id, sum(i.qty * i.unit_price_vnd) AS total FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' GROUP BY o.id, o.store_id), m AS (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY total) AS med FROM t) SELECT t.store_id, round(100.0 * count(*) FILTER (WHERE t.total > m.med) / count(*), 1) FROM t CROSS JOIN m GROUP BY t.store_id ORDER BY t.store_id"
      ordered: true
      hint: { vi: "Một CTE cho giá trị từng đơn, một CTE cho trung vị (một dòng), ghép bằng `CROSS JOIN`, rồi đếm có điều kiện.", en: "One CTE for each order's value, one for the median (a single row), join them with `CROSS JOIN`, then count with a condition." }

- id: a3
  group: A
  status: in
  title: { vi: "Trục ngày (date spine)", en: "Date spine" }
  why: { vi: "Ngày không bán vẫn phải hiện số 0; mất dòng làm biểu đồ và trung bình sai.", en: "A day without sales must still show 0; missing rows make charts and averages wrong." }
  needs: [date_bucket, left_join, coalesce]
  applies: { vi: "Biểu đồ theo ngày, trung bình mỗi ngày, báo cáo chuỗi thời gian.", en: "Daily charts, per-day averages, time-series reports." }
  lesson:
    concept:
      vi: "GROUP BY chỉ tạo dòng cho ngày có dữ liệu. Muốn đủ mọi ngày, tạo trước một \"trục\" gồm mọi ngày bằng generate_series, rồi LEFT JOIN dữ liệu vào trục. Ngày không có dữ liệu ra NULL; COALESCE đổi thành 0."
      en: "GROUP BY only makes rows for days that have data. To get every day, first build a \"spine\" of all days with generate_series, then LEFT JOIN the data onto it. Days with no data come out NULL; COALESCE turns that into 0."
    example: "SELECT g.d::date AS day, COALESCE(sum(i.qty * i.unit_price_vnd), 0) AS revenue FROM generate_series(DATE '2026-10-01', DATE '2026-10-31', interval '1 day') AS g (d) LEFT JOIN orders o ON o.order_date = g.d AND o.store_id = 2 AND o.status = 'PAID' LEFT JOIN order_items i ON i.order_id = o.id GROUP BY g.d ORDER BY g.d"
    explain:
      vi: "① `generate_series(DATE '2026-10-01', DATE '2026-10-31', interval '1 day')`: 31 dòng, mỗi ngày một dòng. ② Điều kiện cửa hàng và trạng thái nằm trong `ON`, để ngày không có đơn vẫn giữ dòng. ③ `COALESCE(sum(...), 0)`: ngày trống ra 0. Kết quả: 31 dòng, trong đó 14 ngày cửa hàng 2 không bán gì. Chỉ `GROUP BY` thì chỉ còn 17 dòng."
      en: "① `generate_series(DATE '2026-10-01', DATE '2026-10-31', interval '1 day')`: 31 rows, one per day. ② The store and status conditions sit in `ON`, so a day with no orders keeps its row. ③ `COALESCE(sum(...), 0)`: an empty day becomes 0. Result: 31 rows, and store 2 sold nothing on 14 of those days. A plain `GROUP BY` gives only 17 rows."
    mistake:
      sql: "SELECT g.d::date AS day, COALESCE(sum(i.qty * i.unit_price_vnd), 0) AS revenue FROM generate_series(DATE '2026-10-01', DATE '2026-10-31', interval '1 day') AS g (d) LEFT JOIN orders o ON o.order_date = g.d LEFT JOIN order_items i ON i.order_id = o.id WHERE o.store_id = 2 AND o.status = 'PAID' GROUP BY g.d ORDER BY g.d"
      vi: "Điều kiện đặt ở `WHERE` chạy sau `LEFT JOIN`: dòng của ngày trống có `o.store_id` là NULL nên bị bỏ, trục ngày mất tác dụng (còn 17 dòng). Đặt điều kiện của bảng bên phải vào `ON`."
      en: "A condition in `WHERE` runs after the `LEFT JOIN`: an empty day's row has `o.store_id` NULL, so it is dropped and the spine is lost (17 rows left). Put the right-hand table's conditions in `ON`."
    try:
      task:
        vi: "Đổi sang cửa hàng 5 và đếm số đơn `PAID` mỗi ngày tháng 10/2026 (ngày không có đơn ra 0)."
        en: "Switch to store 5 and count the `PAID` orders each day in October 2026 (0 on days without orders)."
      starter: "SELECT g.d::date AS day, COALESCE(sum(i.qty * i.unit_price_vnd), 0) AS revenue FROM generate_series(DATE '2026-10-01', DATE '2026-10-31', interval '1 day') AS g (d) LEFT JOIN orders o ON o.order_date = g.d AND o.store_id = 2 AND o.status = 'PAID' LEFT JOIN order_items i ON i.order_id = o.id GROUP BY g.d ORDER BY g.d"
      solution: "SELECT g.d::date AS day, count(o.id) AS orders FROM generate_series(DATE '2026-10-01', DATE '2026-10-31', interval '1 day') AS g (d) LEFT JOIN orders o ON o.order_date = g.d AND o.store_id = 5 AND o.status = 'PAID' GROUP BY g.d ORDER BY g.d"
      ordered: true
    docs: https://www.postgresql.org/docs/current/functions-srf.html
  drills:
    - id: g-a3-1
      kind: faded
      task:
        vi: "Số đơn mỗi tháng của cửa hàng 4 từ 07/2025 đến 10/2026, tháng chưa mở cửa ghi 0. Mỗi tháng một dòng: tháng, số đơn, xếp theo tháng."
        en: "Store 4's orders per month from July 2025 to October 2026, 0 for months before it opened. One row per month: the month and the order count, sorted by month."
      starter: "SELECT g.m::date AS month, count(o.id) FROM generate_series(DATE '2025-07-01', DATE '2026-10-01', interval '1 month') AS g (m) LEFT JOIN orders o ON date_trunc('month', o.order_date) = g.m AND ___ GROUP BY g.m ORDER BY g.m"
      solution: "SELECT g.m::date AS month, count(o.id) FROM generate_series(DATE '2025-07-01', DATE '2026-10-01', interval '1 month') AS g (m) LEFT JOIN orders o ON date_trunc('month', o.order_date) = g.m AND o.store_id = 4 GROUP BY g.m ORDER BY g.m"
      ordered: true
      hint: { vi: "Điều kiện cửa hàng phải nằm trong `ON`, nếu không tháng trống sẽ mất.", en: "The store condition must sit in `ON`, or the empty months disappear." }
    - id: g-a3-2
      kind: open
      task:
        vi: "Mỗi ngày tháng 9/2026: ngày và số khách đăng ký (`signup_date`) hôm đó, kể cả ngày không ai đăng ký (0). Xếp theo ngày."
        en: "Each day of September 2026: the date and the number of customers who signed up (`signup_date`) that day, including days with nobody (0). Sort by date."
      solution: "SELECT g.d::date AS day, count(c.id) FROM generate_series(DATE '2026-09-01', DATE '2026-09-30', interval '1 day') AS g (d) LEFT JOIN customers c ON c.signup_date = g.d GROUP BY g.d ORDER BY g.d"
      ordered: true
      hint: { vi: "Trục là 30 ngày tháng 9; đếm `count(c.id)` để ngày trống ra 0 thay vì 1.", en: "The spine is the 30 days of September; count `count(c.id)` so an empty day gives 0, not 1." }
    - id: g-a3-3
      kind: trap
      task:
        vi: "Cửa hàng 2, tháng 10/2026: mỗi ngày một dòng gồm ngày và số đơn `PAID` (0 nếu không có), xếp theo ngày."
        en: "Store 2, October 2026: one row per day with the date and the number of `PAID` orders (0 if none), sorted by date."
      solution: "SELECT g.d::date AS day, count(o.id) FROM generate_series(DATE '2026-10-01', DATE '2026-10-31', interval '1 day') AS g (d) LEFT JOIN orders o ON o.order_date = g.d AND o.store_id = 2 AND o.status = 'PAID' GROUP BY g.d ORDER BY g.d"
      ordered: true
      hint: { vi: "Đề cần đủ 31 ngày. Kiểm số dòng kết quả.", en: "The request needs all 31 days. Check the row count of your result." }
      wrong:
        - sql: "SELECT g.d::date AS day, count(o.id) FROM generate_series(DATE '2026-10-01', DATE '2026-10-31', interval '1 day') AS g (d) LEFT JOIN orders o ON o.order_date = g.d WHERE o.store_id = 2 AND o.status = 'PAID' GROUP BY g.d ORDER BY g.d"
          vi: "Điều kiện ở `WHERE` bỏ mất các ngày không có đơn của cửa hàng 2 (còn 17 ngày). Chuyển điều kiện vào `ON`."
          en: "The conditions in `WHERE` drop the days with no store 2 order (17 days left). Move them into `ON`."
    - id: g-a3-4
      kind: challenge
      task:
        vi: "Quý 3/2026 (01/07 đến 30/09): với mỗi cửa hàng, có bao nhiêu ngày không có đơn `PAID` nào? Lấy mã cửa hàng và số ngày đó, xếp theo mã cửa hàng."
        en: "Q3 2026 (1 July to 30 September): for each store, on how many days was there no `PAID` order? Get the store id and that number of days, sorted by store id."
      solution: "WITH spine AS (SELECT s.id AS store_id, g.d FROM stores s CROSS JOIN generate_series(DATE '2026-07-01', DATE '2026-09-30', interval '1 day') AS g (d)), per_day AS (SELECT sp.store_id, sp.d, count(o.id) AS n FROM spine sp LEFT JOIN orders o ON o.store_id = sp.store_id AND o.order_date = sp.d AND o.status = 'PAID' GROUP BY sp.store_id, sp.d) SELECT store_id, count(*) FILTER (WHERE n = 0) FROM per_day GROUP BY store_id ORDER BY store_id"
      ordered: true
      hint: { vi: "Trục là mọi cặp cửa hàng × ngày (`CROSS JOIN`), rồi `LEFT JOIN` đơn, đếm theo ngày, cuối cùng đếm ngày bằng 0.", en: "The spine is every store × day pair (`CROSS JOIN`), then `LEFT JOIN` the orders, count per day, and finally count the days at 0." }

- id: a4
  group: A
  status: in
  title: { vi: "Tổng phụ: ROLLUP, GROUPING SETS, CUBE", en: "Subtotals: ROLLUP, GROUPING SETS, CUBE" }
  why: { vi: "Báo cáo cho sếp thường có tổng phụ và tổng chung; một câu lệnh làm được cả hai.", en: "Reports for managers usually carry subtotals and a grand total; one query can do both." }
  needs: [group_by, case_when]
  applies: { vi: "Bảng doanh thu cửa hàng × danh mục có tổng phụ.", en: "Store × category revenue tables with subtotals." }
  lesson:
    concept:
      vi: "GROUP BY ROLLUP (a, b) gom theo (a, b), thêm dòng tổng phụ cho từng a và một dòng tổng chung. CUBE thêm cả tổng theo b. GROUPING SETS cho bạn tự liệt kê các cách gom. Ở dòng tổng, cột bị gộp là NULL; GROUPING(cột) ra 1 ở những dòng đó để phân biệt với NULL thật."
      en: "GROUP BY ROLLUP (a, b) groups by (a, b), adds a subtotal row for each a and one grand total row. CUBE also adds totals by b. GROUPING SETS lets you list the groupings yourself. On a total row the rolled-up column is NULL; GROUPING(column) returns 1 there, to tell it apart from a real NULL."
    example: "SELECT s.name, p.category, sum(i.qty * i.unit_price_vnd) AS revenue, GROUPING(s.name, p.category) AS level FROM orders o JOIN stores s ON s.id = o.store_id JOIN order_items i ON i.order_id = o.id JOIN products p ON p.id = i.product_id WHERE o.status = 'PAID' AND o.order_date >= '2026-10-01' GROUP BY ROLLUP (s.name, p.category) ORDER BY s.name, p.category"
    explain:
      vi: "① `ROLLUP (s.name, p.category)`: dòng chi tiết cửa hàng × danh mục, rồi tổng phụ mỗi cửa hàng, rồi tổng chung. ② `GROUPING(s.name, p.category)` ra 0 ở dòng chi tiết, 1 ở tổng phụ cửa hàng, 3 ở tổng chung. ③ Kết quả tháng 10/2026: 31 dòng = 25 chi tiết + 5 tổng phụ + 1 tổng chung. Tổng phụ của Ben Thanh là 30.483.200 đồng."
      en: "① `ROLLUP (s.name, p.category)`: detail rows store × category, then a subtotal per store, then a grand total. ② `GROUPING(s.name, p.category)` is 0 on detail rows, 1 on store subtotals, 3 on the grand total. ③ Result for October 2026: 31 rows = 25 details + 5 subtotals + 1 grand total. Ben Thanh's subtotal is 30,483,200 VND."
    mistake:
      sql: "SELECT s.name, p.category, sum(i.qty * i.unit_price_vnd) AS revenue, GROUPING(s.name, p.category) AS level FROM orders o JOIN stores s ON s.id = o.store_id JOIN order_items i ON i.order_id = o.id JOIN products p ON p.id = i.product_id WHERE o.status = 'PAID' AND o.order_date >= '2026-10-01' GROUP BY ROLLUP (p.category, s.name) ORDER BY s.name, p.category"
      vi: "Đảo thứ tự trong `ROLLUP`: tổng phụ giờ là theo danh mục, không theo cửa hàng. Cột đầu tiên trong `ROLLUP` là cấp lớn nhất."
      en: "The `ROLLUP` order is swapped: the subtotals are now per category, not per store. The first column in `ROLLUP` is the top level."
    try:
      task:
        vi: "Đổi để có thêm tổng mỗi danh mục trên mọi cửa hàng (giữ cột mức)."
        en: "Change it to also get a total per category across all stores (keep the level column)."
      starter: "SELECT s.name, p.category, sum(i.qty * i.unit_price_vnd) AS revenue, GROUPING(s.name, p.category) AS level FROM orders o JOIN stores s ON s.id = o.store_id JOIN order_items i ON i.order_id = o.id JOIN products p ON p.id = i.product_id WHERE o.status = 'PAID' AND o.order_date >= '2026-10-01' GROUP BY ROLLUP (s.name, p.category) ORDER BY s.name, p.category"
      solution: "SELECT s.name, p.category, sum(i.qty * i.unit_price_vnd) AS revenue, GROUPING(s.name, p.category) AS level FROM orders o JOIN stores s ON s.id = o.store_id JOIN order_items i ON i.order_id = o.id JOIN products p ON p.id = i.product_id WHERE o.status = 'PAID' AND o.order_date >= '2026-10-01' GROUP BY CUBE (s.name, p.category) ORDER BY s.name, p.category"
    docs: https://www.postgresql.org/docs/current/queries-table-expressions.html#QUERIES-GROUPING-SETS
  drills:
    - id: g-a4-1
      kind: faded
      task:
        vi: "Số đơn theo kênh (`channel`) và trạng thái (`status`), thêm tổng phụ mỗi kênh và một dòng tổng chung."
        en: "Order count by `channel` and `status`, plus a subtotal per channel and one grand total row."
      starter: "SELECT channel, status, count(*) FROM orders GROUP BY ROLLUP (___)"
      solution: "SELECT channel, status, count(*) FROM orders GROUP BY ROLLUP (channel, status)"
      hint: { vi: "Cấp lớn (kênh) đứng trước trong `ROLLUP`.", en: "The top level (channel) comes first in `ROLLUP`." }
    - id: g-a4-2
      kind: open
      task:
        vi: "Doanh thu đơn `PAID` năm 2026 theo cửa hàng và theo danh mục trong cùng một kết quả: mỗi cửa hàng một dòng, mỗi danh mục một dòng, không có dòng cửa hàng × danh mục, không có tổng chung. Cột: mã cửa hàng, danh mục, doanh thu."
        en: "2026 revenue from `PAID` orders by store and by category in one result: one row per store, one row per category, no store × category rows and no grand total. Columns: store id, category, revenue."
      solution: "SELECT o.store_id, p.category, sum(i.qty * i.unit_price_vnd) FROM orders o JOIN order_items i ON i.order_id = o.id JOIN products p ON p.id = i.product_id WHERE o.status = 'PAID' AND o.order_date >= '2026-01-01' GROUP BY GROUPING SETS ((o.store_id), (p.category))"
      hint: { vi: "Tự liệt kê hai cách gom: `GROUPING SETS ((...), (...))`.", en: "List the two groupings yourself: `GROUPING SETS ((...), (...))`." }
    - id: g-a4-3
      kind: trap
      task:
        vi: "Doanh thu đơn `PAID` tháng 10/2026 theo thành phố và cửa hàng, có tổng phụ mỗi thành phố và tổng chung. Cột: thành phố, tên cửa hàng, doanh thu."
        en: "October 2026 revenue from `PAID` orders by city and store, with a subtotal per city and a grand total. Columns: city, store name, revenue."
      solution: "SELECT s.city, s.name, sum(i.qty * i.unit_price_vnd) FROM orders o JOIN stores s ON s.id = o.store_id JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.order_date >= '2026-10-01' GROUP BY ROLLUP (s.city, s.name)"
      hint: { vi: "Tổng phụ theo cấp (thành phố rồi cửa hàng) là `ROLLUP`.", en: "Subtotals by level (city, then store) are `ROLLUP`." }
      wrong:
        - sql: "SELECT s.city, s.name, sum(i.qty * i.unit_price_vnd) FROM orders o JOIN stores s ON s.id = o.store_id JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.order_date >= '2026-10-01' GROUP BY CUBE (s.city, s.name)"
          vi: "`CUBE` thêm cả tổng mỗi cửa hàng trên mọi thành phố: thừa dòng. Cấp thành phố → cửa hàng chỉ cần `ROLLUP`."
          en: "`CUBE` also adds a total per store across all cities: extra rows. A city → store hierarchy only needs `ROLLUP`."
    - id: g-a4-4
      kind: challenge
      task:
        vi: "Quý 3/2026, doanh thu đơn `PAID` theo tháng và danh mục, có tổng phụ mỗi tháng và tổng chung. Cột: tháng (`date_trunc`), danh mục, doanh thu, mức (`GROUPING` của hai cột), và tỷ lệ % của dòng so với tổng chung (làm tròn 1 chữ số thập phân)."
        en: "Q3 2026 revenue from `PAID` orders by month and category, with a subtotal per month and a grand total. Columns: month (`date_trunc`), category, revenue, level (`GROUPING` of both columns), and the row's % of the grand total (rounded to 1 decimal)."
      solution: "WITH r AS (SELECT date_trunc('month', o.order_date) AS month, p.category, sum(i.qty * i.unit_price_vnd) AS revenue, GROUPING(date_trunc('month', o.order_date), p.category) AS level FROM orders o JOIN order_items i ON i.order_id = o.id JOIN products p ON p.id = i.product_id WHERE o.status = 'PAID' AND o.order_date >= '2026-07-01' AND o.order_date < '2026-10-01' GROUP BY ROLLUP (date_trunc('month', o.order_date), p.category)) SELECT month, category, revenue, level, round(100.0 * revenue / max(revenue) FILTER (WHERE level = 3) OVER (), 1) FROM r"
      hint: { vi: "Tổng chung là dòng có mức 3; lấy nó cho mọi dòng bằng một hàm cửa sổ `OVER ()` có `FILTER`.", en: "The grand total is the row at level 3; spread it to every row with a window aggregate `OVER ()` plus `FILTER`." }

- id: a5
  group: A
  status: in
  title: { vi: "Xoay bảng (pivot)", en: "Pivot" }
  why: { vi: "Bảng ngang tháng × nhóm là dạng sếp đọc nhanh nhất.", en: "A wide month × group table is the shape managers read fastest." }
  needs: [conditional_agg]
  applies: { vi: "Báo cáo tháng dạng ma trận.", en: "Monthly matrix reports." }
  lesson:
    concept:
      vi: "Pivot biến giá trị của một cột (tháng) thành nhiều cột. Trong Postgres cách gọn nhất là mỗi cột một hàm gộp có FILTER: sum(x) FILTER (WHERE tháng = 8), sum(x) FILTER (WHERE tháng = 9)… Số cột phải biết trước khi viết câu lệnh."
      en: "A pivot turns the values of one column (months) into several columns. In Postgres the neat way is one aggregate with FILTER per column: sum(x) FILTER (WHERE month = 8), sum(x) FILTER (WHERE month = 9)… You must know the columns before writing the query."
    example: "SELECT o.store_id, sum(i.qty * i.unit_price_vnd) FILTER (WHERE o.order_date >= '2026-08-01' AND o.order_date < '2026-09-01') AS aug, sum(i.qty * i.unit_price_vnd) FILTER (WHERE o.order_date >= '2026-09-01' AND o.order_date < '2026-10-01') AS sep, sum(i.qty * i.unit_price_vnd) FILTER (WHERE o.order_date >= '2026-10-01') AS oct FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.order_date >= '2026-08-01' GROUP BY o.store_id ORDER BY o.store_id"
    explain:
      vi: "① `WHERE` giữ mọi dòng của cả 3 tháng; mỗi cột tự lọc tháng của nó bằng `FILTER`. ② Mỗi cửa hàng một dòng, mỗi tháng một cột: kết quả 5 dòng × 4 cột. ③ Tháng không có dòng nào thì ô là NULL; muốn 0 thì bọc `COALESCE(..., 0)`. ④ Thêm tháng = thêm một cột `FILTER`."
      en: "① `WHERE` keeps every row of all 3 months; each column filters its own month with `FILTER`. ② One row per store, one column per month: the result is 5 rows × 4 columns. ③ A month with no rows gives NULL; wrap it in `COALESCE(..., 0)` for 0. ④ Another month = one more `FILTER` column."
    mistake:
      sql: "SELECT o.store_id, sum(i.qty * i.unit_price_vnd) FILTER (WHERE o.order_date >= '2026-08-01' AND o.order_date < '2026-09-01') AS aug, sum(i.qty * i.unit_price_vnd) FILTER (WHERE o.order_date >= '2026-09-01' AND o.order_date < '2026-10-01') AS sep, sum(i.qty * i.unit_price_vnd) FILTER (WHERE o.order_date >= '2026-10-01') AS oct FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.order_date >= '2026-08-01' AND o.order_date < '2026-09-01' GROUP BY o.store_id ORDER BY o.store_id"
      vi: "Lọc tháng 8 ở `WHERE` thì các dòng tháng 9 và 10 đã bị bỏ trước khi `FILTER` chạy: hai cột đó toàn NULL. `WHERE` phải giữ đủ mọi tháng của các cột."
      en: "Filtering August in `WHERE` drops the September and October rows before `FILTER` runs: those two columns are all NULL. `WHERE` must keep every month the columns need."
    try:
      task:
        vi: "Đổi thành số đơn `PAID` theo kênh: mỗi kênh một dòng, ba cột tháng 8, 9, 10/2026."
        en: "Change it to the number of `PAID` orders by channel: one row per channel, three columns for August, September and October 2026."
      starter: "SELECT o.store_id, sum(i.qty * i.unit_price_vnd) FILTER (WHERE o.order_date >= '2026-08-01' AND o.order_date < '2026-09-01') AS aug, sum(i.qty * i.unit_price_vnd) FILTER (WHERE o.order_date >= '2026-09-01' AND o.order_date < '2026-10-01') AS sep, sum(i.qty * i.unit_price_vnd) FILTER (WHERE o.order_date >= '2026-10-01') AS oct FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.order_date >= '2026-08-01' GROUP BY o.store_id ORDER BY o.store_id"
      solution: "SELECT o.channel, count(*) FILTER (WHERE o.order_date >= '2026-08-01' AND o.order_date < '2026-09-01') AS aug, count(*) FILTER (WHERE o.order_date >= '2026-09-01' AND o.order_date < '2026-10-01') AS sep, count(*) FILTER (WHERE o.order_date >= '2026-10-01') AS oct FROM orders o WHERE o.status = 'PAID' AND o.order_date >= '2026-08-01' GROUP BY o.channel ORDER BY o.channel"
    docs: https://www.postgresql.org/docs/current/sql-expressions.html#SYNTAX-AGGREGATES
  drills:
    - id: g-a5-1
      kind: faded
      task:
        vi: "Mỗi danh mục: số đơn vị bán (`qty`) ở kênh `STORE` và ở kênh `ONLINE`, hai cột, chỉ đơn `PAID`."
        en: "Each category: units sold (`qty`) in the `STORE` channel and in the `ONLINE` channel, two columns, `PAID` orders only."
      starter: "SELECT p.category, sum(i.qty) FILTER (WHERE ___) AS store_units, sum(i.qty) FILTER (WHERE ___) AS online_units FROM orders o JOIN order_items i ON i.order_id = o.id JOIN products p ON p.id = i.product_id WHERE o.status = 'PAID' GROUP BY p.category"
      solution: "SELECT p.category, sum(i.qty) FILTER (WHERE o.channel = 'STORE') AS store_units, sum(i.qty) FILTER (WHERE o.channel = 'ONLINE') AS online_units FROM orders o JOIN order_items i ON i.order_id = o.id JOIN products p ON p.id = i.product_id WHERE o.status = 'PAID' GROUP BY p.category"
      hint: { vi: "Mỗi `FILTER` giữ một kênh.", en: "Each `FILTER` keeps one channel." }
    - id: g-a5-2
      kind: open
      task:
        vi: "Năm 2026, mỗi cửa hàng: mã cửa hàng và ba cột số đơn `PAID`, `CANCELLED`, `REFUNDED`. Xếp theo mã cửa hàng."
        en: "For 2026, each store: the store id and three columns counting `PAID`, `CANCELLED` and `REFUNDED` orders. Sort by store id."
      solution: "SELECT store_id, count(*) FILTER (WHERE status = 'PAID'), count(*) FILTER (WHERE status = 'CANCELLED'), count(*) FILTER (WHERE status = 'REFUNDED') FROM orders WHERE order_date >= '2026-01-01' GROUP BY store_id ORDER BY store_id"
      ordered: true
      hint: { vi: "Một `count(*) FILTER (...)` cho mỗi trạng thái.", en: "One `count(*) FILTER (...)` per status." }
    - id: g-a5-3
      kind: trap
      task:
        vi: "Năm 2026, mỗi cửa hàng: mã cửa hàng, giá trị hàng của đơn `PAID` và của đơn `REFUNDED`, hai cột."
        en: "For 2026, each store: the store id, the goods value of `PAID` orders and of `REFUNDED` orders, two columns."
      solution: "SELECT o.store_id, sum(i.qty * i.unit_price_vnd) FILTER (WHERE o.status = 'PAID'), sum(i.qty * i.unit_price_vnd) FILTER (WHERE o.status = 'REFUNDED') FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.order_date >= '2026-01-01' GROUP BY o.store_id"
      hint: { vi: "Mỗi cột cần dòng của trạng thái riêng, nên trạng thái không được lọc ở `WHERE`.", en: "Each column needs its own status's rows, so the status cannot be filtered in `WHERE`." }
      wrong:
        - sql: "SELECT o.store_id, sum(i.qty * i.unit_price_vnd) FILTER (WHERE o.status = 'PAID'), sum(i.qty * i.unit_price_vnd) FILTER (WHERE o.status = 'REFUNDED') FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.order_date >= '2026-01-01' AND o.status = 'PAID' GROUP BY o.store_id"
          vi: "`o.status = 'PAID'` ở `WHERE` bỏ mọi đơn hoàn tiền trước khi gộp: cột `REFUNDED` toàn NULL."
          en: "`o.status = 'PAID'` in `WHERE` drops every refunded order before aggregating: the `REFUNDED` column is all NULL."
    - id: g-a5-4
      kind: challenge
      task:
        vi: "Mỗi cửa hàng: doanh thu đơn `PAID` tháng 8, 9, 10/2026 (ba cột, tháng trống ghi 0) và % thay đổi tháng 10 so với tháng 9 (làm tròn 1 chữ số thập phân). Xếp theo mã cửa hàng."
        en: "Each store: revenue from `PAID` orders in August, September and October 2026 (three columns, 0 for an empty month) and the % change of October versus September (rounded to 1 decimal). Sort by store id."
      solution: "WITH p AS (SELECT o.store_id, COALESCE(sum(i.qty * i.unit_price_vnd) FILTER (WHERE o.order_date < '2026-09-01'), 0) AS aug, COALESCE(sum(i.qty * i.unit_price_vnd) FILTER (WHERE o.order_date >= '2026-09-01' AND o.order_date < '2026-10-01'), 0) AS sep, COALESCE(sum(i.qty * i.unit_price_vnd) FILTER (WHERE o.order_date >= '2026-10-01'), 0) AS oct FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.order_date >= '2026-08-01' GROUP BY o.store_id) SELECT store_id, aug, sep, oct, round(100.0 * (oct - sep) / sep, 1) FROM p ORDER BY store_id"
      ordered: true
      hint: { vi: "Pivot trong một CTE, rồi tính % trên các cột đã xoay.", en: "Pivot in a CTE, then compute the % on the pivoted columns." }

- id: a6
  group: A
  status: in
  title: { vi: "CTE đệ quy (WITH RECURSIVE)", en: "Recursive CTEs (WITH RECURSIVE)" }
  why: { vi: "Cây tổ chức, cây danh mục, chuỗi phụ thuộc: số cấp không biết trước nên JOIN thường không đủ.", en: "Org charts, category trees, dependency chains: the depth is unknown, so plain JOINs are not enough." }
  needs: [multi_cte, self_join]
  applies: { vi: "Cây quản lý (Logistics cũng có `employees.manager_id`).", en: "Reporting lines (Logistics also has `employees.manager_id`)." }
  lesson:
    concept:
      vi: "WITH RECURSIVE có hai phần nối bằng UNION ALL: phần mở đầu (anchor) chọn các dòng xuất phát, phần đệ quy nối bảng với chính kết quả CTE để đi xuống thêm một cấp. Postgres lặp lại tới khi không còn dòng mới."
      en: "WITH RECURSIVE has two parts joined by UNION ALL: the anchor picks the starting rows, the recursive part joins the table to the CTE's own result to go one level further. Postgres repeats until no new rows appear."
    example: "WITH RECURSIVE t AS (SELECT id, name, manager_id, 0 AS depth FROM staff WHERE manager_id IS NULL UNION ALL SELECT s.id, s.name, s.manager_id, t.depth + 1 FROM staff s JOIN t ON s.manager_id = t.id) SELECT id, name, depth FROM t ORDER BY depth, id"
    explain:
      vi: "① Phần mở đầu: người không có quản lý (CEO, cấp 0). ② Phần đệ quy: nhân viên có `manager_id` là một người đã ở trong `t`, cấp + 1. ③ Kết quả: 20 người, 5 cấp (0 đến 4): 1 ở cấp 0, 3 ở cấp 1, 6 ở cấp 2, 7 ở cấp 3, 3 ở cấp 4. ④ JOIN thường chỉ đi được số cấp bạn viết sẵn."
      en: "① The anchor: the person with no manager (the CEO, level 0). ② The recursive part: staff whose `manager_id` is someone already in `t`, level + 1. ③ Result: 20 people over 5 levels (0 to 4): 1 at level 0, 3 at level 1, 6 at level 2, 7 at level 3, 3 at level 4. ④ A plain JOIN only goes as many levels as you write out."
    mistake:
      sql: "WITH t AS (SELECT id, name, manager_id, 0 AS depth FROM staff WHERE manager_id IS NULL UNION ALL SELECT s.id, s.name, s.manager_id, t.depth + 1 FROM staff s JOIN t ON s.manager_id = t.id) SELECT id, name, depth FROM t ORDER BY depth, id"
      vi: "Thiếu chữ `RECURSIVE`: CTE không được tự gọi chính nó, Postgres báo relation \"t\" does not exist."
      en: "The word `RECURSIVE` is missing: the CTE may not refer to itself, and Postgres says relation \"t\" does not exist."
    try:
      task:
        vi: "Chỉ lấy những người dưới quyền Do Lan (mã 2) ở mọi cấp, kể cả Do Lan (cấp 0)."
        en: "Get only the people under Do Lan (id 2) at every level, Do Lan included (level 0)."
      starter: "WITH RECURSIVE t AS (SELECT id, name, manager_id, 0 AS depth FROM staff WHERE manager_id IS NULL UNION ALL SELECT s.id, s.name, s.manager_id, t.depth + 1 FROM staff s JOIN t ON s.manager_id = t.id) SELECT id, name, depth FROM t ORDER BY depth, id"
      solution: "WITH RECURSIVE t AS (SELECT id, name, manager_id, 0 AS depth FROM staff WHERE id = 2 UNION ALL SELECT s.id, s.name, s.manager_id, t.depth + 1 FROM staff s JOIN t ON s.manager_id = t.id) SELECT id, name, depth FROM t ORDER BY depth, id"
      ordered: true
    docs: https://www.postgresql.org/docs/current/queries-with.html#QUERIES-WITH-RECURSIVE
  drills:
    - id: g-a6-1
      kind: faded
      task:
        vi: "Chuỗi quản lý phía trên Lam Phuong (mã 14), từ chính Lam Phuong tới CEO: mã, tên, bước (Lam Phuong là 0), xếp theo bước."
        en: "The chain of managers above Lam Phuong (id 14), from Lam Phuong up to the CEO: id, name, step (Lam Phuong is 0), sorted by step."
      starter: "WITH RECURSIVE up AS (SELECT id, name, manager_id, 0 AS step FROM staff WHERE id = 14 UNION ALL SELECT s.id, s.name, s.manager_id, up.step + 1 FROM staff s JOIN up ON s.id = up.___) SELECT id, name, step FROM up ORDER BY step"
      solution: "WITH RECURSIVE up AS (SELECT id, name, manager_id, 0 AS step FROM staff WHERE id = 14 UNION ALL SELECT s.id, s.name, s.manager_id, up.step + 1 FROM staff s JOIN up ON s.id = up.manager_id) SELECT id, name, step FROM up ORDER BY step"
      ordered: true
      hint: { vi: "Đi lên: người tiếp theo là quản lý của người vừa tìm được.", en: "Going up: the next person is the manager of the one just found." }
    - id: g-a6-2
      kind: open
      task:
        vi: "Mỗi quản lý vùng (`role` là `Regional manager`): mã, tên và tổng số người dưới quyền ở mọi cấp (không tính chính họ)."
        en: "Each regional manager (`role` is `Regional manager`): id, name and the total number of people under them at every level (not counting themselves)."
      solution: "WITH RECURSIVE t AS (SELECT id AS root, id FROM staff WHERE role = 'Regional manager' UNION ALL SELECT t.root, s.id FROM staff s JOIN t ON s.manager_id = t.id) SELECT r.id, r.name, count(*) - 1 FROM t JOIN staff r ON r.id = t.root GROUP BY r.id, r.name"
      hint: { vi: "Mang theo mã người gốc (`root`) qua mỗi bước đệ quy, rồi đếm theo gốc.", en: "Carry the starting person's id (`root`) through each recursive step, then count per root." }
    - id: g-a6-3
      kind: trap
      task:
        vi: "Mọi người dưới quyền Ta Vy (mã 6) ở bất kỳ cấp nào: mã và tên."
        en: "Everyone under Ta Vy (id 6) at any level: id and name."
      solution: "WITH RECURSIVE t AS (SELECT id, name FROM staff WHERE manager_id = 6 UNION ALL SELECT s.id, s.name FROM staff s JOIN t ON s.manager_id = t.id) SELECT id, name FROM t"
      hint: { vi: "\"Bất kỳ cấp nào\" nghĩa là cả người dưới quyền của người dưới quyền.", en: "\"Any level\" includes the reports of the reports." }
      wrong:
        - sql: "SELECT id, name FROM staff WHERE manager_id = 6"
          vi: "Chỉ ra cấp ngay dưới (2 người), thiếu Lam Phuong báo cáo cho Phan Khanh. Cần `WITH RECURSIVE`."
          en: "Only the level right below (2 people), missing Lam Phuong who reports to Phan Khanh. You need `WITH RECURSIVE`."
    - id: g-a6-4
      kind: challenge
      task:
        vi: "Mỗi nhân viên: mã và đường quản lý từ CEO tới họ, tên nối bằng ` > ` (ví dụ `Ha Minh > Do Lan`). Xếp theo đường quản lý."
        en: "Each staff member: id and the reporting path from the CEO down to them, names joined by ` > ` (for example `Ha Minh > Do Lan`). Sort by the path."
      solution: "WITH RECURSIVE t AS (SELECT id, name::text AS path FROM staff WHERE manager_id IS NULL UNION ALL SELECT s.id, t.path || ' > ' || s.name FROM staff s JOIN t ON s.manager_id = t.id) SELECT id, path FROM t ORDER BY path"
      ordered: true
      hint: { vi: "Phần đệ quy nối thêm tên vào cột `path` của cấp trên; phần mở đầu ép kiểu `::text` để hai phần cùng kiểu.", en: "The recursive part appends the name to the parent's `path`; the anchor casts with `::text` so both parts share a type." }

- id: a7
  group: A
  status: in
  title: { vi: "JSON và JSONB", en: "JSON and JSONB" }
  why: { vi: "Dữ liệu sự kiện của app và dữ liệu từ API thường ở dạng JSON.", en: "App event data and API data usually come as JSON." }
  needs: [where, group_by]
  applies: { vi: "Phân tích sự kiện app, dữ liệu từ API.", en: "App event analysis, API data." }
  lesson:
    concept:
      vi: "Cột jsonb chứa một đối tượng có khóa. props->>'device' lấy giá trị của khóa device dưới dạng chữ (dùng để so sánh, gom nhóm); props->'items' lấy dưới dạng jsonb (dùng tiếp với hàm JSON). jsonb_array_length đếm phần tử mảng, jsonb_array_elements_text tách mảng thành dòng."
      en: "A jsonb column holds an object with keys. props->>'device' gets the device key's value as text (for comparing, grouping); props->'items' gets it as jsonb (to pass on to JSON functions). jsonb_array_length counts array elements, jsonb_array_elements_text turns an array into rows."
    example: "SELECT props->>'device' AS device, count(*) FROM app_events GROUP BY props->>'device' ORDER BY device"
    explain:
      vi: "① Mỗi dòng của `app_events` có `props` như `{\"screen\": \"home\", \"device\": \"ios\", \"items\": []}`. ② `props->>'device'` ra chữ `ios`, `android` hoặc `web`. ③ Kết quả 3 dòng: android 653, ios 684, web 591 sự kiện. ④ `->` giữ kiểu jsonb, `->>` ra chữ: so sánh với chữ thường thì dùng `->>`."
      en: "① Each `app_events` row has `props` such as `{\"screen\": \"home\", \"device\": \"ios\", \"items\": []}`. ② `props->>'device'` gives the text `ios`, `android` or `web`. ③ Result, 3 rows: android 653, ios 684, web 591 events. ④ `->` keeps jsonb, `->>` gives text: to compare with plain text, use `->>`."
    mistake:
      sql: "SELECT count(*) FROM app_events WHERE props->'device' = 'ios'"
      vi: "`->` ra jsonb, nên Postgres thử đọc `'ios'` như JSON và báo lỗi invalid input syntax for type json. Dùng `props->>'device' = 'ios'`."
      en: "`->` returns jsonb, so Postgres tries to read `'ios'` as JSON and reports invalid input syntax for type json. Use `props->>'device' = 'ios'`."
    try:
      task:
        vi: "Đổi sang đếm sự kiện theo màn hình (khóa `screen`)."
        en: "Change it to count events by screen (the `screen` key)."
      starter: "SELECT props->>'device' AS device, count(*) FROM app_events GROUP BY props->>'device' ORDER BY device"
      solution: "SELECT props->>'screen' AS screen, count(*) FROM app_events GROUP BY props->>'screen' ORDER BY screen"
    docs: https://www.postgresql.org/docs/current/functions-json.html
  drills:
    - id: g-a7-1
      kind: faded
      task:
        vi: "Mỗi thiết bị (khóa `device`): số sự kiện thanh toán (`event` là `paid`)."
        en: "Each device (the `device` key): the number of payment events (`event` is `paid`)."
      starter: "SELECT props->>___, count(*) FROM app_events WHERE event = 'paid' GROUP BY 1"
      solution: "SELECT props->>'device', count(*) FROM app_events WHERE event = 'paid' GROUP BY 1"
      hint: { vi: "Tên khóa viết trong nháy đơn sau `->>`.", en: "The key name goes in single quotes after `->>`." }
    - id: g-a7-2
      kind: open
      task:
        vi: "Mỗi sản phẩm xuất hiện trong mảng `items` của sự kiện: mã sản phẩm, tên và số lần xuất hiện. Xếp theo số lần giảm dần, bằng nhau thì mã nhỏ trước; lấy 5 dòng đầu."
        en: "Each product that appears in the events' `items` array: product id, name and how many times it appears. Sort by that count descending, ties by smaller id first; keep the first 5 rows."
      solution: "SELECT p.id, p.name, count(*) AS n FROM app_events e CROSS JOIN LATERAL jsonb_array_elements_text(e.props->'items') AS x (item) JOIN products p ON p.id = x.item::int GROUP BY p.id, p.name ORDER BY n DESC, p.id LIMIT 5"
      ordered: true
      hint: { vi: "`jsonb_array_elements_text(props->'items')` cho mỗi phần tử một dòng (chữ); ép `::int` để nối với `products`.", en: "`jsonb_array_elements_text(props->'items')` gives one row (text) per element; cast `::int` to join `products`." }
    - id: g-a7-3
      kind: trap
      task:
        vi: "Có bao nhiêu sự kiện có ít nhất một sản phẩm trong `items`?"
        en: "How many events have at least one product in `items`?"
      solution: "SELECT count(*) FROM app_events WHERE jsonb_array_length(props->'items') > 0"
      hint: { vi: "Mảng rỗng `[]` vẫn là một giá trị, không phải NULL.", en: "An empty array `[]` is still a value, not NULL." }
      wrong:
        - sql: "SELECT count(*) FROM app_events WHERE props->'items' IS NOT NULL"
          vi: "Mọi sự kiện đều có khóa `items` (có thể là `[]`), nên điều kiện này luôn đúng. Đếm phần tử bằng `jsonb_array_length`."
          en: "Every event has an `items` key (maybe `[]`), so this is always true. Count the elements with `jsonb_array_length`."
    - id: g-a7-4
      kind: challenge
      task:
        vi: "Ở các sự kiện `checkout`: mỗi thiết bị, số sự kiện và số sản phẩm trung bình trong `items` (làm tròn 2 chữ số thập phân). Xếp theo thiết bị."
        en: "On `checkout` events: for each device, the number of events and the average number of products in `items` (rounded to 2 decimals). Sort by device."
      solution: "SELECT props->>'device' AS device, count(*), round(avg(jsonb_array_length(props->'items')), 2) FROM app_events WHERE event = 'checkout' GROUP BY props->>'device' ORDER BY device"
      ordered: true
      hint: { vi: "`jsonb_array_length` cho mỗi sự kiện một số; lấy trung bình theo thiết bị.", en: "`jsonb_array_length` gives each event a number; average it per device." }

- id: a8
  group: A
  status: in
  title: { vi: "Regex và làm sạch chữ", en: "Regex and text cleaning" }
  why: { vi: "Mã, số điện thoại, email nhập tay luôn lộn xộn; phải chuẩn hóa trước khi đếm hay nối bảng.", en: "Hand-typed codes, phone numbers and emails are always messy; normalise them before counting or joining." }
  needs: [string_fn, pattern_match]
  applies: { vi: "Làm sạch dữ liệu nhập tay, kiểm định dạng.", en: "Cleaning hand-entered data, format checks." }
  lesson:
    concept:
      vi: "Biểu thức chính quy (regex) mô tả một mẫu chữ. x ~ 'mẫu' đúng khi x khớp (phân biệt hoa thường), ~* thì không phân biệt, !~ là không khớp. ^ và $ neo đầu và cuối chuỗi. regexp_replace(x, 'mẫu', 'thay', 'g') thay mọi chỗ khớp."
      en: "A regular expression (regex) describes a text pattern. x ~ 'pattern' is true when x matches (case-sensitive), ~* ignores case, !~ means does not match. ^ and $ anchor the start and end. regexp_replace(x, 'pattern', 'replacement', 'g') replaces every match."
    example: |-
      SELECT id, email FROM raw_signups WHERE email !~ '^[a-z0-9._]+@[a-z0-9-]+(\.[a-z]+)+$' ORDER BY id
    explain:
      vi: "① Mẫu đọc là: đầu chuỗi, chữ thường/số/chấm/gạch dưới, `@`, tên miền, một hay nhiều đuôi `.xx`, cuối chuỗi. ② `!~`: giữ email không khớp. ③ Kết quả: 41 email sai trong 140 đăng ký: viết hoa, thừa khoảng trắng cuối, hay `at` thay cho `@`. ④ 10 email NULL không hiện: NULL không khớp cũng không \"không khớp\"."
      en: "① The pattern reads: start, lowercase letters/digits/dots/underscores, `@`, a domain, one or more `.xx` endings, end. ② `!~`: keep the emails that do not match. ③ Result: 41 bad emails out of 140 sign-ups: uppercase, a trailing space, or `at` instead of `@`. ④ The 10 NULL emails do not show: NULL neither matches nor fails to match."
    mistake:
      sql: "SELECT id, email FROM raw_signups WHERE email NOT LIKE '%@%' ORDER BY id"
      vi: "`LIKE` chỉ bắt được email thiếu `@` (13 dòng); email viết hoa hay thừa khoảng trắng vẫn lọt. Mẫu nhiều điều kiện cần regex."
      en: "`LIKE` only catches emails without `@` (13 rows); uppercase emails or trailing spaces still get through. A pattern with many rules needs a regex."
    try:
      task:
        vi: "Chuẩn hóa số điện thoại: bỏ mọi ký tự không phải số, rồi đổi `84` ở đầu thành `0`. Lấy mã và số đã chuẩn hóa, bỏ dòng không có số."
        en: "Normalise the phone numbers: remove every non-digit character, then turn a leading `84` into `0`. Get the id and the cleaned number, skipping rows without a phone."
      starter: "SELECT id, phone FROM raw_signups WHERE phone IS NOT NULL"
      solution: "SELECT id, regexp_replace(regexp_replace(phone, '[^0-9]', '', 'g'), '^84', '0') FROM raw_signups WHERE phone IS NOT NULL"
    docs: https://www.postgresql.org/docs/current/functions-matching.html#FUNCTIONS-POSIX-REGEXP
  drills:
    - id: g-a8-1
      kind: faded
      task:
        vi: "Những đăng ký có email thuộc tên miền `mail.vn`, không phân biệt hoa thường: mã và email."
        en: "The sign-ups whose email is on the `mail.vn` domain, ignoring case: id and email."
      starter: "SELECT id, email FROM raw_signups WHERE email ~* ___"
      solution: "SELECT id, email FROM raw_signups WHERE email ~* '@mail\\.vn\\s*$'"
      hint: { vi: "`~*` không phân biệt hoa thường; chấm trong mẫu phải viết `\\.`, và có thể có khoảng trắng thừa ở cuối.", en: "`~*` ignores case; a dot in the pattern is written `\\.`, and there may be trailing spaces." }
    - id: g-a8-2
      kind: open
      task:
        vi: "Sau khi đổi email sang chữ thường và bỏ khoảng trắng hai đầu, đếm số đăng ký theo tên miền (phần sau `@`), chỉ tính email hợp lệ có `@`. Cột: tên miền, số đăng ký."
        en: "After lowercasing the emails and trimming spaces at both ends, count sign-ups per domain (the part after `@`), only for valid emails that have an `@`. Columns: domain, number of sign-ups."
      solution: "SELECT substring(lower(trim(email)) FROM '@([a-z0-9.-]+)$') AS domain, count(*) FROM raw_signups WHERE lower(trim(email)) ~ '^[a-z0-9._]+@[a-z0-9.-]+$' GROUP BY 1"
      hint: { vi: "`substring(x FROM ...)` với một mẫu trả về phần nằm trong ngoặc tròn của mẫu.", en: "`substring(x FROM ...)` with a pattern returns the part inside the pattern's parentheses." }
    - id: g-a8-3
      kind: trap
      task:
        vi: "Những đăng ký có số điện thoại di động hợp lệ: sau khi bỏ ký tự không phải số, còn đúng 10 chữ số và bắt đầu bằng `0`. Lấy mã và số điện thoại gốc."
        en: "The sign-ups with a valid mobile number: after removing non-digits, exactly 10 digits starting with `0`. Get the id and the original phone."
      solution: "SELECT id, phone FROM raw_signups WHERE regexp_replace(phone, '[^0-9]', '', 'g') ~ '^0[0-9]{9}$'"
      hint: { vi: "\"Đúng 10 chữ số\" cần neo cả đầu `^` lẫn cuối `$`.", en: "\"Exactly 10 digits\" needs both anchors, `^` and `$`." }
      wrong:
        - sql: "SELECT id, phone FROM raw_signups WHERE phone ~ '[0-9]{10}'"
          vi: "Không neo và không làm sạch: `+84905…` (11 chữ số) vẫn khớp vì có 10 chữ số liền nhau, còn `0905 123 456` thì trượt vì có khoảng trắng."
          en: "No anchors and no cleaning: `+84905…` (11 digits) still matches because it holds 10 digits in a row, and `0905 123 456` fails because of the spaces."
    - id: g-a8-4
      kind: challenge
      task:
        vi: "Báo cáo chất lượng bảng đăng ký trong một dòng: số email trống, số email sai định dạng (dùng mẫu của ví dụ, không tính email trống), số điện thoại trống, số ngày đăng ký sau 31/10/2026."
        en: "A one-row quality report of the sign-ups table: empty emails, badly formatted emails (the example's pattern, empty ones not counted), empty phones, and sign-up dates after 31 October 2026."
      solution: |-
        SELECT count(*) FILTER (WHERE email IS NULL), count(*) FILTER (WHERE email !~ '^[a-z0-9._]+@[a-z0-9-]+(\.[a-z]+)+$'), count(*) FILTER (WHERE phone IS NULL), count(*) FILTER (WHERE signup_date > '2026-10-31') FROM raw_signups
      hint: { vi: "Một `count(*) FILTER (...)` cho mỗi loại lỗi.", en: "One `count(*) FILTER (...)` per kind of problem." }

- id: a9
  group: A
  status: in
  title: { vi: "LATERAL và top N mỗi nhóm", en: "LATERAL and top N per group" }
  why: { vi: "\"3 sản phẩm bán chạy nhất mỗi cửa hàng\" là câu hỏi rất hay gặp; LATERAL là cách thứ hai bên cạnh xếp hạng.", en: "\"The 3 best sellers per store\" is a very common question; LATERAL is the second way beside ranking." }
  needs: [window_rank, distinct_on]
  applies: { vi: "Top N mỗi nhóm, đơn gần nhất của mỗi khách.", en: "Top N per group, each customer's latest order." }
  lesson:
    concept:
      vi: "Truy vấn con trong FROM bình thường không được nhắc tới bảng đứng trước nó. Thêm LATERAL thì được: truy vấn con chạy lại cho từng dòng bên trái, nên có thể ORDER BY … LIMIT 3 riêng cho mỗi cửa hàng. LEFT JOIN LATERAL … ON true giữ cả dòng bên trái không có kết quả."
      en: "A subquery in FROM normally cannot mention the tables before it. With LATERAL it can: the subquery runs again for each row on the left, so it can ORDER BY … LIMIT 3 for each store separately. LEFT JOIN LATERAL … ON true keeps left rows that get no result."
    example: "SELECT s.name AS store, x.product, x.units FROM stores s CROSS JOIN LATERAL (SELECT p.name AS product, sum(i.qty) AS units FROM orders o JOIN order_items i ON i.order_id = o.id JOIN products p ON p.id = i.product_id WHERE o.store_id = s.id AND o.status = 'PAID' GROUP BY p.name ORDER BY units DESC, p.name LIMIT 3) x ORDER BY s.name, x.units DESC, x.product"
    explain:
      vi: "① Truy vấn con nhắc tới `s.id` của dòng cửa hàng bên trái: nhờ `LATERAL`. ② Với mỗi cửa hàng: gom theo sản phẩm, xếp giảm dần, `LIMIT 3`. ③ Kết quả 15 dòng = 5 cửa hàng × 3 sản phẩm; ở Ben Thanh đứng đầu là Highlighter set với 165 đơn vị. ④ `p.name` trong `ORDER BY` là tiêu chí phụ để top 3 không đổi giữa các lần chạy."
      en: "① The subquery mentions the left store row's `s.id`: that is what `LATERAL` allows. ② For each store: group by product, sort descending, `LIMIT 3`. ③ Result: 15 rows = 5 stores × 3 products; at Ben Thanh the top one is Highlighter set with 165 units. ④ `p.name` in `ORDER BY` is the tie-breaker so the top 3 stays the same between runs."
    mistake:
      sql: "SELECT s.name AS store, x.product, x.units FROM stores s CROSS JOIN (SELECT p.name AS product, sum(i.qty) AS units FROM orders o JOIN order_items i ON i.order_id = o.id JOIN products p ON p.id = i.product_id WHERE o.store_id = s.id AND o.status = 'PAID' GROUP BY p.name ORDER BY units DESC, p.name LIMIT 3) x ORDER BY s.name, x.units DESC, x.product"
      vi: "Thiếu `LATERAL`: truy vấn con không thấy `s`, Postgres báo invalid reference to FROM-clause entry for table \"s\"."
      en: "`LATERAL` is missing: the subquery cannot see `s`, and Postgres says invalid reference to FROM-clause entry for table \"s\"."
    try:
      task:
        vi: "Đổi thành 2 danh mục có doanh thu đơn `PAID` cao nhất mỗi cửa hàng (bằng nhau thì theo tên danh mục)."
        en: "Change it to each store's 2 categories with the highest `PAID` revenue (ties by category name)."
      starter: "SELECT s.name AS store, x.product, x.units FROM stores s CROSS JOIN LATERAL (SELECT p.name AS product, sum(i.qty) AS units FROM orders o JOIN order_items i ON i.order_id = o.id JOIN products p ON p.id = i.product_id WHERE o.store_id = s.id AND o.status = 'PAID' GROUP BY p.name ORDER BY units DESC, p.name LIMIT 3) x ORDER BY s.name, x.units DESC, x.product"
      solution: "SELECT s.name AS store, x.category, x.revenue FROM stores s CROSS JOIN LATERAL (SELECT p.category, sum(i.qty * i.unit_price_vnd) AS revenue FROM orders o JOIN order_items i ON i.order_id = o.id JOIN products p ON p.id = i.product_id WHERE o.store_id = s.id AND o.status = 'PAID' GROUP BY p.category ORDER BY revenue DESC, p.category LIMIT 2) x ORDER BY s.name, x.revenue DESC, x.category"
      ordered: true
    docs: https://www.postgresql.org/docs/current/queries-table-expressions.html#QUERIES-LATERAL
  drills:
    - id: g-a9-1
      kind: faded
      task:
        vi: "Mỗi khách ở `Hue`: mã khách, mã và ngày của đơn gần nhất (bằng ngày thì mã đơn lớn hơn là gần hơn)."
        en: "Each customer in `Hue`: customer id, and the id and date of their latest order (on the same date, the larger order id is the later one)."
      starter: "SELECT c.id, x.id, x.order_date FROM customers c CROSS JOIN LATERAL (SELECT o.id, o.order_date FROM orders o WHERE o.customer_id = c.id ORDER BY o.order_date DESC, o.id DESC LIMIT ___) x WHERE c.city = 'Hue'"
      solution: "SELECT c.id, x.id, x.order_date FROM customers c CROSS JOIN LATERAL (SELECT o.id, o.order_date FROM orders o WHERE o.customer_id = c.id ORDER BY o.order_date DESC, o.id DESC LIMIT 1) x WHERE c.city = 'Hue'"
      hint: { vi: "\"Đơn gần nhất\" là một đơn.", en: "\"The latest order\" is one order." }
    - id: g-a9-2
      kind: open
      task:
        vi: "Mỗi danh mục: 2 sản phẩm giá cao nhất (bằng giá thì theo tên). Cột: danh mục, tên sản phẩm, giá."
        en: "Each category: its 2 most expensive products (ties by name). Columns: category, product name, price."
      solution: "SELECT c.category, x.name, x.price_vnd FROM (SELECT DISTINCT category FROM products) c CROSS JOIN LATERAL (SELECT p.name, p.price_vnd FROM products p WHERE p.category = c.category ORDER BY p.price_vnd DESC, p.name LIMIT 2) x"
      hint: { vi: "Bên trái là danh sách danh mục (`DISTINCT`), bên phải là truy vấn con `LATERAL` có `LIMIT 2`.", en: "On the left the list of categories (`DISTINCT`), on the right a `LATERAL` subquery with `LIMIT 2`." }
    - id: g-a9-3
      kind: trap
      task:
        vi: "Mọi khách ở `Hue`: mã khách và ngày đơn `ONLINE` gần nhất của họ; khách chưa từng mua online vẫn có dòng, ngày để trống."
        en: "Every customer in `Hue`: customer id and the date of their latest `ONLINE` order; customers who never ordered online still get a row with an empty date."
      solution: "SELECT c.id, x.order_date FROM customers c LEFT JOIN LATERAL (SELECT o.order_date FROM orders o WHERE o.customer_id = c.id AND o.channel = 'ONLINE' ORDER BY o.order_date DESC LIMIT 1) x ON true WHERE c.city = 'Hue'"
      hint: { vi: "Đề nói khách không có đơn online vẫn phải có dòng.", en: "The request says customers with no online order must still have a row." }
      wrong:
        - sql: "SELECT c.id, x.order_date FROM customers c CROSS JOIN LATERAL (SELECT o.order_date FROM orders o WHERE o.customer_id = c.id AND o.channel = 'ONLINE' ORDER BY o.order_date DESC LIMIT 1) x WHERE c.city = 'Hue'"
          vi: "`CROSS JOIN LATERAL` bỏ khách mà truy vấn con không trả dòng nào. Dùng `LEFT JOIN LATERAL (...) x ON true`."
          en: "`CROSS JOIN LATERAL` drops customers for whom the subquery returns no row. Use `LEFT JOIN LATERAL (...) x ON true`."
    - id: g-a9-4
      kind: challenge
      task:
        vi: "Mỗi cửa hàng: 3 đơn `PAID` có giá trị lớn nhất tháng 10/2026 (bằng giá trị thì mã đơn nhỏ trước). Cột: mã cửa hàng, mã đơn, giá trị. Xếp theo cửa hàng, giá trị giảm dần, mã đơn."
        en: "Each store: its 3 largest `PAID` orders of October 2026 (equal values: smaller order id first). Columns: store id, order id, value. Sort by store, value descending, order id."
      solution: "SELECT s.id, x.id, x.total FROM stores s CROSS JOIN LATERAL (SELECT o.id, sum(i.qty * i.unit_price_vnd) AS total FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.store_id = s.id AND o.status = 'PAID' AND o.order_date >= '2026-10-01' GROUP BY o.id ORDER BY total DESC, o.id LIMIT 3) x ORDER BY s.id, x.total DESC, x.id"
      ordered: true
      hint: { vi: "Trong `LATERAL`: gom theo đơn, xếp theo giá trị rồi mã đơn, `LIMIT 3`.", en: "Inside `LATERAL`: group by order, sort by value then id, `LIMIT 3`." }

- id: a10
  group: A
  status: partial
  title: { vi: "Hiệu năng sâu hơn", en: "Deeper performance" }
  why: { vi: "Một truy vấn chậm làm cả dashboard chậm; đọc được kế hoạch thực thi giúp viết điều kiện dùng được chỉ mục.", en: "One slow query slows the whole dashboard; reading the plan helps you write conditions that can use an index." }
  needs: [explain_read, sargable, index_design]
  applies: { vi: "Dashboard, truy vấn chạy định kỳ.", en: "Dashboards, scheduled queries." }
  lesson:
    concept:
      vi: "EXPLAIN cho xem kế hoạch Postgres định dùng: Seq Scan đọc cả bảng, Index Scan hay Bitmap Index Scan đi qua chỉ mục (index). Chỉ mục chỉ dùng được khi điều kiện so sánh thẳng cột với giá trị; bọc cột trong hàm (extract, ::text) thì thường mất chỉ mục. Ở đây chỉ chấm kế hoạch, không chấm mili giây."
      en: "EXPLAIN shows the plan Postgres means to use: a Seq Scan reads the whole table, an Index Scan or Bitmap Index Scan goes through an index. An index only helps when the condition compares the column directly with a value; wrapping the column in a function (extract, ::text) usually loses the index. Only the plan is graded here, never milliseconds."
    example: "EXPLAIN SELECT id FROM orders WHERE order_date = '2026-09-09'"
    explain:
      vi: "① `lab` có sẵn chỉ mục trên `orders(order_date)`, `orders(customer_id)` và `app_events(user_id, ts)`. ② Kế hoạch có `Bitmap Index Scan on orders_order_date_idx`: Postgres dùng chỉ mục và ước khoảng 11 dòng. ③ Viết `extract(day FROM order_date) = 9 AND ...` thì cùng kết quả nhưng kế hoạch thành `Seq Scan`, đọc cả 1.428 đơn."
      en: "① `lab` already has indexes on `orders(order_date)`, `orders(customer_id)` and `app_events(user_id, ts)`. ② The plan shows `Bitmap Index Scan on orders_order_date_idx`: Postgres uses the index and expects about 11 rows. ③ Writing `extract(day FROM order_date) = 9 AND ...` gives the same rows but the plan becomes a `Seq Scan` over all 1,428 orders."
    mistake:
      sql: "EXPLAIN SELECT id FROM orders WHERE extract(year FROM order_date) = 2026 AND extract(month FROM order_date) = 9 AND extract(day FROM order_date) = 9"
      vi: "Cột bị bọc trong `extract(...)`: chỉ mục trên `order_date` không dùng được, kế hoạch là `Seq Scan`."
      en: "The column is wrapped in `extract(...)`: the index on `order_date` cannot be used, and the plan is a `Seq Scan`."
    try:
      task:
        vi: "Lấy mã và ngày của các đơn từ 25/10/2026 tới hết 31/10/2026, viết sao cho dùng được chỉ mục trên ngày đặt."
        en: "Get the id and date of the orders from 25 October 2026 through 31 October 2026, written so the order-date index can be used."
      starter: "SELECT id, order_date FROM orders WHERE order_date = '2026-09-09'"
      solution: "SELECT id, order_date FROM orders WHERE order_date >= '2026-10-25' AND order_date < '2026-11-01'"
    docs: https://www.postgresql.org/docs/current/using-explain.html
  drills:
    - id: g-a10-1
      kind: faded
      task:
        vi: "Mọi đơn của khách 42: mã đơn, ngày, trạng thái. Kế hoạch phải đọc `orders` qua chỉ mục."
        en: "Every order of customer 42: order id, date, status. The plan must read `orders` through an index."
      starter: "SELECT id, order_date, status FROM orders WHERE ___ = 42"
      solution: "SELECT id, order_date, status FROM orders WHERE customer_id = 42"
      plan: { index: orders }
      hint: { vi: "So sánh thẳng cột có chỉ mục với giá trị.", en: "Compare the indexed column directly with the value." }
    - id: g-a10-2
      kind: open
      task:
        vi: "Số đơn mỗi trạng thái trong tuần 25–31/10/2026, viết điều kiện ngày sao cho kế hoạch đọc `orders` qua chỉ mục."
        en: "The number of orders per status in the week of 25–31 October 2026, with a date condition the plan can use to read `orders` through an index."
      solution: "SELECT status, count(*) FROM orders WHERE order_date >= '2026-10-25' AND order_date < '2026-11-01' GROUP BY status"
      plan: { index: orders }
      hint: { vi: "Khoảng nửa mở trên chính cột `order_date`: `>=` ngày đầu và `<` ngày sau ngày cuối.", en: "A half-open range on the `order_date` column itself: `>=` the first day and `<` the day after the last." }
    - id: g-a10-3
      kind: trap
      task:
        vi: "Mọi sự kiện của người dùng 140 trong tháng 9/2026 (tới hết ngày 30/9): mã, sự kiện, thời điểm. Kế hoạch phải đọc `app_events` qua chỉ mục."
        en: "Every event of user 140 in September 2026 (through the end of 30 September): id, event, timestamp. The plan must read `app_events` through an index."
      solution: "SELECT id, event, ts FROM app_events WHERE user_id = 140 AND ts >= '2026-09-01' AND ts < '2026-10-01'"
      plan: { index: app_events }
      hint: { vi: "`ts` có cả giờ. Ngày cuối cần trọn cả ngày.", en: "`ts` carries a time of day. The last day needs all of its hours." }
      wrong:
        - sql: "SELECT id, event, ts FROM app_events WHERE user_id = 140 AND ts BETWEEN '2026-09-01' AND '2026-09-30'"
          vi: "`'2026-09-30'` là 00:00 ngày 30/9, nên sự kiện lúc 09:19 ngày 30/9 bị bỏ. Dùng `ts < '2026-10-01'`."
          en: "`'2026-09-30'` means 00:00 on 30 September, so the event at 09:19 that day is dropped. Use `ts < '2026-10-01'`."
    - id: g-a10-4
      kind: challenge
      task:
        vi: "Sự kiện cuối cùng của người dùng 77 trước ngày 01/10/2026: mã, sự kiện, thời điểm (một dòng). Kế hoạch phải đọc `app_events` qua chỉ mục."
        en: "User 77's last event before 1 October 2026: id, event, timestamp (one row). The plan must read `app_events` through an index."
      solution: "SELECT id, event, ts FROM app_events WHERE user_id = 77 AND ts < '2026-10-01' ORDER BY ts DESC LIMIT 1"
      ordered: true
      plan: { index: app_events }
      hint: { vi: "Chỉ mục `(user_id, ts)` đã sắp sẵn theo người dùng rồi thời điểm: lọc người dùng, xếp `ts` giảm dần, lấy 1.", en: "The `(user_id, ts)` index is already sorted by user, then time: filter the user, sort `ts` descending, take 1." }
  links:
    - { title: { vi: "PostgreSQL: Dùng EXPLAIN", en: "PostgreSQL: Using EXPLAIN" }, url: "https://www.postgresql.org/docs/current/using-explain.html" }
    - { title: { vi: "PostgreSQL: Chỉ mục nhiều cột", en: "PostgreSQL: Multicolumn indexes" }, url: "https://www.postgresql.org/docs/current/indexes-multicolumn.html" }


- id: b1
  group: B
  status: in
  title: { vi: "KPI và so sánh kỳ (MoM, YoY, tỷ lệ)", en: "KPIs and period comparison (MoM, YoY, ratios)" }
  why: { vi: "Báo cáo nào cũng có doanh thu, giá trị đơn trung bình và tăng trưởng so với kỳ trước; sai tử số hay mẫu số là sai cả báo cáo.", en: "Every report has revenue, average order value and growth against the previous period; a wrong numerator or denominator breaks the whole report." }
  needs: [window_lag, cast, date_bucket, cte]
  applies: { vi: "Mọi domain: thẻ KPI ở Bảng điều hành", en: "Every domain: KPI tiles on the dashboard" }
  lesson:
    concept:
      vi: "Một KPI là một phân số có định nghĩa rõ: tử số là gì, mẫu số là gì, tính trên kỳ nào. Giá trị đơn trung bình (AOV) = doanh thu chia số đơn, không phải trung bình các dòng hàng. Tăng trưởng so với tháng trước (MoM) = (tháng này − tháng trước) / tháng trước; LAG lấy giá trị tháng trước."
      en: "A KPI is a fraction with a clear definition: what the numerator is, what the denominator is, over which period. Average order value (AOV) = revenue divided by the number of orders, not the average of item lines. Month-over-month growth (MoM) = (this month − last month) / last month; LAG fetches last month's value."
    example: "SELECT date_trunc('month', o.order_date)::date AS month, sum(i.qty * i.unit_price_vnd) AS revenue, count(DISTINCT o.id) AS orders, round(sum(i.qty * i.unit_price_vnd)::numeric / count(DISTINCT o.id)) AS aov FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.order_date >= '2026-07-01' GROUP BY 1 ORDER BY 1"
    explain:
      vi: "① `count(DISTINCT o.id)`: sau khi nối với dòng hàng, mỗi đơn lặp lại nhiều lần, nên phải đếm mã đơn khác nhau. ② `::numeric` trước khi chia để không mất phần lẻ. ③ Kết quả: 4 tháng; tháng 7 có 115 đơn, AOV 486.231 đồng; tháng 10 có 200 đơn, doanh thu 97.162.500 đồng, AOV 485.813 đồng. Doanh thu tăng mạnh nhưng AOV gần như đứng yên: tăng là do nhiều đơn hơn, không phải đơn to hơn."
      en: "① `count(DISTINCT o.id)`: after the join with item lines each order repeats, so count distinct order ids. ② `::numeric` before dividing so the fraction is not lost. ③ Result: 4 months; July has 115 orders, AOV 486,231 VND; October has 200 orders, revenue 97,162,500 VND, AOV 485,813 VND. Revenue grew a lot but AOV barely moved: growth came from more orders, not bigger ones."
    mistake:
      sql: "SELECT date_trunc('month', o.order_date)::date AS month, round(avg(i.qty * i.unit_price_vnd)) AS aov FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.order_date >= '2026-07-01' GROUP BY 1"
      vi: "`avg` trên các dòng hàng cho giá trị trung bình của một dòng, không phải của một đơn: mỗi đơn có 1 đến 4 dòng nên con số nhỏ hơn AOV thật nhiều lần."
      en: "`avg` over item lines gives the average value of a line, not of an order: each order has 1 to 4 lines, so the number is several times smaller than the real AOV."
    try:
      task:
        vi: "Với mỗi tháng của năm 2026: doanh thu và % tăng so với tháng trước (làm tròn 1 chữ số thập phân). Tháng 1 không có tháng trước nên để trống."
        en: "For each month of 2026: revenue and the % change from the previous month (rounded to 1 decimal). January has no previous month, so leave it empty."
      starter: "SELECT date_trunc('month', o.order_date)::date AS month, sum(i.qty * i.unit_price_vnd) AS revenue, count(DISTINCT o.id) AS orders, round(sum(i.qty * i.unit_price_vnd)::numeric / count(DISTINCT o.id)) AS aov FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.order_date >= '2026-07-01' GROUP BY 1 ORDER BY 1"
      solution: "WITH m AS (SELECT date_trunc('month', o.order_date)::date AS month, sum(i.qty * i.unit_price_vnd) AS revenue FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.order_date >= '2026-01-01' GROUP BY 1) SELECT month, revenue, round(100.0 * (revenue - lag(revenue) OVER (ORDER BY month)) / lag(revenue) OVER (ORDER BY month), 1) AS mom_pct FROM m"
    docs: https://www.postgresql.org/docs/current/functions-window.html
  drills:
    - id: g-b1-1
      kind: faded
      task: { vi: "Giá trị đơn trung bình (AOV) của từng cửa hàng trong tháng 10/2026, chỉ đơn đã thanh toán, làm tròn tới đồng.", en: "Average order value (AOV) of each store in October 2026, paid orders only, rounded to the dong." }
      starter: "SELECT o.store_id, round(sum(i.qty * i.unit_price_vnd)::numeric / ___) AS aov FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.order_date >= '2026-10-01' AND o.order_date < '2026-11-01' GROUP BY o.store_id"
      solution: "SELECT o.store_id, round(sum(i.qty * i.unit_price_vnd)::numeric / count(DISTINCT o.id)) AS aov FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.order_date >= '2026-10-01' AND o.order_date < '2026-11-01' GROUP BY o.store_id"
      hint: { vi: "Mẫu số là số đơn, không phải số dòng hàng: đếm mã đơn khác nhau.", en: "The denominator is the number of orders, not item lines: count distinct order ids." }
    - id: g-b1-2
      kind: open
      task: { vi: "Tỷ lệ đơn bị hủy (`CANCELLED`) trên tổng số đơn của từng tháng năm 2026, tính theo %, làm tròn 1 chữ số thập phân.", en: "The share of cancelled orders (`CANCELLED`) among all orders for each month of 2026, as a %, rounded to 1 decimal." }
      solution: "SELECT date_trunc('month', order_date)::date AS month, round(100.0 * count(*) FILTER (WHERE status = 'CANCELLED') / count(*), 1) AS cancel_pct FROM orders WHERE order_date >= '2026-01-01' GROUP BY 1"
      hint: { vi: "Tử số là đơn hủy, mẫu số là mọi đơn của tháng: đếm có điều kiện trên cùng một nhóm.", en: "The numerator is cancelled orders, the denominator every order of the month: a conditional count over the same group." }
    - id: g-b1-3
      kind: trap
      task: { vi: "Doanh thu (đơn đã thanh toán) tháng 10/2026 tăng bao nhiêu % so với tháng 10/2025 (YoY)? Một con số, làm tròn 1 chữ số thập phân.", en: "By what % did paid revenue in October 2026 grow against October 2025 (YoY)? One number, rounded to 1 decimal." }
      solution: "SELECT round(100.0 * (n - o) / o, 1) AS yoy_pct FROM (SELECT sum(i.qty * i.unit_price_vnd) FILTER (WHERE o.order_date >= '2026-10-01') AS n, sum(i.qty * i.unit_price_vnd) FILTER (WHERE o.order_date < '2025-11-01') AS o FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND ((o.order_date >= '2026-10-01' AND o.order_date < '2026-11-01') OR (o.order_date >= '2025-10-01' AND o.order_date < '2025-11-01'))) t"
      hint: { vi: "Tăng trưởng chia cho kỳ gốc (năm trước), không chia cho kỳ mới.", en: "Growth is divided by the base period (last year), not by the new one." }
      wrong:
        - sql: "SELECT round(100.0 * (n - o) / n, 1) AS yoy_pct FROM (SELECT sum(i.qty * i.unit_price_vnd) FILTER (WHERE o.order_date >= '2026-10-01') AS n, sum(i.qty * i.unit_price_vnd) FILTER (WHERE o.order_date < '2025-11-01') AS o FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND ((o.order_date >= '2026-10-01' AND o.order_date < '2026-11-01') OR (o.order_date >= '2025-10-01' AND o.order_date < '2025-11-01'))) t"
          vi: "Bạn chia cho doanh thu năm nay. Mẫu số của tăng trưởng là kỳ gốc: tháng 10/2025."
          en: "You divided by this year's revenue. The growth denominator is the base period: October 2025."
    - id: g-b1-4
      kind: challenge
      task: { vi: "Bảng KPI năm 2026, mỗi tháng một dòng theo thứ tự tháng: tháng, doanh thu, số đơn, AOV (làm tròn tới đồng) và % tăng doanh thu so với tháng trước (1 chữ số thập phân). Chỉ tính đơn đã thanh toán.", en: "A 2026 KPI table, one row per month in month order: month, revenue, number of orders, AOV (rounded to the dong) and revenue % change from the previous month (1 decimal). Paid orders only." }
      solution: "WITH m AS (SELECT date_trunc('month', o.order_date)::date AS month, sum(i.qty * i.unit_price_vnd) AS revenue, count(DISTINCT o.id) AS orders FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.order_date >= '2026-01-01' GROUP BY 1) SELECT month, revenue, orders, round(revenue::numeric / orders) AS aov, round(100.0 * (revenue - lag(revenue) OVER (ORDER BY month)) / lag(revenue) OVER (ORDER BY month), 1) AS mom_pct FROM m ORDER BY month"
      ordered: true
      hint: { vi: "Gom theo tháng trong một CTE trước, rồi tính AOV và LAG trên kết quả đã gom.", en: "Group by month in a CTE first, then compute AOV and LAG on the grouped result." }

- id: b2
  group: B
  status: in
  title: { vi: "Cohort và retention", en: "Cohorts and retention" }
  why: { vi: "Khách mới có quay lại không là câu hỏi số một ở bán lẻ và sản phẩm số.", en: "Whether new customers come back is the number one question in retail and digital products." }
  needs: [date_bucket, cte, conditional_agg, left_join]
  applies: { vi: "E-commerce: báo cáo giữ chân khách", en: "E-commerce: retention reports" }
  lesson:
    concept:
      vi: "Cohort (nhóm khách cùng lứa) là các khách bắt đầu trong cùng một kỳ, ví dụ cùng tháng đăng ký. Retention (tỷ lệ giữ chân) tháng N là phần khách của cohort còn mua ở đúng tháng thứ N sau tháng bắt đầu. Cách làm: một CTE gán cohort cho khách, một CTE lấy các tháng có mua, nối trái rồi đếm có điều kiện."
      en: "A cohort is the group of customers who started in the same period, for example the same signup month. Month-N retention is the share of the cohort who buy in exactly the Nth month after the start month. Recipe: one CTE assigns each customer a cohort, one CTE lists the months with purchases, then left join and count with conditions."
    example: "WITH f AS (SELECT id, date_trunc('month', signup_date)::date AS cohort FROM customers WHERE signup_date >= '2026-01-01' AND signup_date < '2026-07-01'), a AS (SELECT DISTINCT customer_id, date_trunc('month', order_date)::date AS m FROM orders WHERE status = 'PAID') SELECT f.cohort, count(DISTINCT f.id) AS size, count(DISTINCT a.customer_id) FILTER (WHERE a.m = f.cohort + interval '1 month') AS m1 FROM f LEFT JOIN a ON a.customer_id = f.id GROUP BY 1 ORDER BY 1"
    explain:
      vi: "① CTE `f`: mỗi khách đăng ký từ 01/2026 tới 06/2026 và tháng cohort của họ. ② CTE `a`: mỗi cặp khách, tháng có đơn đã thanh toán. ③ `LEFT JOIN` giữ cả khách chưa mua lại để cỡ cohort đúng. ④ `FILTER (WHERE a.m = f.cohort + interval '1 month')`: chỉ đúng tháng kế tiếp. Kết quả: 6 cohort; tháng 1 có 17 khách, 4 người mua lại ở tháng 2; tháng 6 có 15 khách, 12 người mua lại."
      en: "① CTE `f`: each customer who signed up from 01/2026 to 06/2026 and their cohort month. ② CTE `a`: each customer and month pair with a paid order. ③ `LEFT JOIN` keeps customers who never came back, so the cohort size is right. ④ `FILTER (WHERE a.m = f.cohort + interval '1 month')`: exactly the next month. Result: 6 cohorts; January has 17 customers, 4 bought again in February; June has 15 customers, 12 came back."
    mistake:
      sql: "WITH f AS (SELECT id, date_trunc('month', signup_date)::date AS cohort FROM customers WHERE signup_date >= '2026-01-01' AND signup_date < '2026-07-01'), a AS (SELECT DISTINCT customer_id, date_trunc('month', order_date)::date AS m FROM orders WHERE status = 'PAID') SELECT f.cohort, count(DISTINCT f.id) AS size, count(DISTINCT a.customer_id) FILTER (WHERE a.m > f.cohort) AS m1 FROM f LEFT JOIN a ON a.customer_id = f.id GROUP BY 1 ORDER BY 1"
      vi: "`a.m > f.cohort` đếm khách mua ở bất kỳ tháng nào sau đó, không phải đúng tháng thứ nhất: số giữ chân bị thổi phồng."
      en: "`a.m > f.cohort` counts customers who bought in any later month, not exactly month one: retention is inflated."
    try:
      task:
        vi: "Giữ 6 cohort trong ví dụ, nhưng thay cột số người bằng tỷ lệ % mua lại ở tháng thứ nhất (làm tròn 1 chữ số thập phân). Kết quả: tháng cohort, cỡ cohort, tỷ lệ."
        en: "Keep the 6 cohorts of the example, but replace the head count with the % who bought again in month one (rounded to 1 decimal). Result: cohort month, cohort size, rate."
      starter: "WITH f AS (SELECT id, date_trunc('month', signup_date)::date AS cohort FROM customers WHERE signup_date >= '2026-01-01' AND signup_date < '2026-07-01'), a AS (SELECT DISTINCT customer_id, date_trunc('month', order_date)::date AS m FROM orders WHERE status = 'PAID') SELECT f.cohort, count(DISTINCT f.id) AS size, count(DISTINCT a.customer_id) FILTER (WHERE a.m = f.cohort + interval '1 month') AS m1 FROM f LEFT JOIN a ON a.customer_id = f.id GROUP BY 1 ORDER BY 1"
      solution: "WITH f AS (SELECT id, date_trunc('month', signup_date)::date AS cohort FROM customers WHERE signup_date >= '2026-01-01' AND signup_date < '2026-07-01'), a AS (SELECT DISTINCT customer_id, date_trunc('month', order_date)::date AS m FROM orders WHERE status = 'PAID') SELECT f.cohort, count(DISTINCT f.id) AS size, round(100.0 * count(DISTINCT a.customer_id) FILTER (WHERE a.m = f.cohort + interval '1 month') / count(DISTINCT f.id), 1) AS m1_pct FROM f LEFT JOIN a ON a.customer_id = f.id GROUP BY 1"
    docs: https://www.postgresql.org/docs/current/queries-with.html
  drills:
    - id: g-b2-1
      kind: faded
      task: { vi: "Cỡ của từng cohort tháng đăng ký trong năm 2026: tháng đăng ký và số khách.", en: "The size of each signup-month cohort in 2026: signup month and number of customers." }
      starter: "SELECT date_trunc('___', signup_date)::date AS cohort, count(*) AS size FROM customers WHERE signup_date >= '2026-01-01' GROUP BY 1"
      solution: "SELECT date_trunc('month', signup_date)::date AS cohort, count(*) AS size FROM customers WHERE signup_date >= '2026-01-01' GROUP BY 1"
      hint: { vi: "Cohort ở đây là tháng: cắt ngày đăng ký về đầu tháng.", en: "The cohort here is a month: truncate the signup date to the start of the month." }
    - id: g-b2-2
      kind: open
      task: { vi: "Mỗi tháng năm 2026 có bao nhiêu khách mua đơn đã thanh toán đầu tiên của họ? Tháng và số khách.", en: "How many customers made their first paid order in each month of 2026? Month and number of customers." }
      solution: "SELECT first_month, count(*) AS customers FROM (SELECT customer_id, date_trunc('month', min(order_date))::date AS first_month FROM orders WHERE status = 'PAID' AND customer_id IS NOT NULL GROUP BY customer_id) f WHERE first_month >= '2026-01-01' GROUP BY first_month"
      hint: { vi: "Tìm tháng mua đầu tiên của mỗi khách trước (MIN theo khách), rồi mới đếm theo tháng đó.", en: "Find each customer's first purchase month first (MIN per customer), then count by that month." }
    - id: g-b2-3
      kind: trap
      task: { vi: "Với các cohort đăng ký từ tháng 7 tới tháng 12/2025: cỡ cohort và số khách có đơn đã thanh toán ở đúng tháng ngay sau tháng đăng ký. Chú ý cohort tháng 12.", en: "For the signup cohorts from July to December 2025: cohort size and the number of customers with a paid order in exactly the month after their signup month. Watch the December cohort." }
      solution: "WITH f AS (SELECT id, date_trunc('month', signup_date)::date AS cohort FROM customers WHERE signup_date >= '2025-07-01' AND signup_date < '2026-01-01'), a AS (SELECT DISTINCT customer_id, date_trunc('month', order_date)::date AS m FROM orders WHERE status = 'PAID') SELECT f.cohort, count(DISTINCT f.id) AS size, count(DISTINCT a.customer_id) FILTER (WHERE a.m = f.cohort + interval '1 month') AS m1 FROM f LEFT JOIN a ON a.customer_id = f.id GROUP BY 1"
      hint: { vi: "So sánh cả ngày tháng (đầu tháng), không chỉ số tháng: tháng sau của 12/2025 là 01/2026.", en: "Compare whole dates (month starts), not month numbers: the month after 12/2025 is 01/2026." }
      wrong:
        - sql: "WITH f AS (SELECT id, date_trunc('month', signup_date)::date AS cohort FROM customers WHERE signup_date >= '2025-07-01' AND signup_date < '2026-01-01'), a AS (SELECT DISTINCT customer_id, date_trunc('month', order_date)::date AS m FROM orders WHERE status = 'PAID') SELECT f.cohort, count(DISTINCT f.id) AS size, count(DISTINCT a.customer_id) FILTER (WHERE extract(month FROM a.m) = extract(month FROM f.cohort) + 1) AS m1 FROM f LEFT JOIN a ON a.customer_id = f.id GROUP BY 1"
          vi: "So số tháng bằng `extract(month …)` thì tháng 12 + 1 = 13 không bao giờ khớp, và tháng 8/2026 cũng bị tính là \"tháng sau\" của 7/2025. So cả ngày đầu tháng."
          en: "Comparing month numbers with `extract(month …)` means 12 + 1 = 13 never matches, and August 2026 also counts as the \"next month\" of July 2025. Compare whole month-start dates."
    - id: g-b2-4
      kind: challenge
      task: { vi: "Bảng retention cho các cohort đăng ký tháng 1 tới tháng 6/2026, theo thứ tự tháng: tháng cohort, cỡ cohort, rồi % khách mua lại ở tháng thứ 1, thứ 2, thứ 3 sau tháng đăng ký (mỗi tỷ lệ làm tròn 1 chữ số thập phân).", en: "A retention table for the signup cohorts January to June 2026, in month order: cohort month, cohort size, then the % of customers buying again in month 1, 2 and 3 after the signup month (each rate rounded to 1 decimal)." }
      solution: "WITH f AS (SELECT id, date_trunc('month', signup_date)::date AS cohort FROM customers WHERE signup_date >= '2026-01-01' AND signup_date < '2026-07-01'), a AS (SELECT DISTINCT customer_id, date_trunc('month', order_date)::date AS m FROM orders WHERE status = 'PAID') SELECT f.cohort, count(DISTINCT f.id) AS size, round(100.0 * count(DISTINCT a.customer_id) FILTER (WHERE a.m = f.cohort + interval '1 month') / count(DISTINCT f.id), 1) AS m1_pct, round(100.0 * count(DISTINCT a.customer_id) FILTER (WHERE a.m = f.cohort + interval '2 month') / count(DISTINCT f.id), 1) AS m2_pct, round(100.0 * count(DISTINCT a.customer_id) FILTER (WHERE a.m = f.cohort + interval '3 month') / count(DISTINCT f.id), 1) AS m3_pct FROM f LEFT JOIN a ON a.customer_id = f.id GROUP BY 1 ORDER BY 1"
      ordered: true
      hint: { vi: "Một cột cho mỗi tháng thứ N: cùng một phép đếm có điều kiện, chỉ đổi khoảng cách tháng.", en: "One column per month N: the same conditional count, only the month offset changes." }

- id: b3
  group: B
  status: in
  title: { vi: "Phễu chuyển đổi (funnel)", en: "Conversion funnels" }
  why: { vi: "Biết khách rơi rụng ở bước nào thì mới biết sửa chỗ nào trên ứng dụng.", en: "Knowing where users drop out tells you which part of the app to fix." }
  needs: [conditional_agg, cte, distinct]
  applies: { vi: "E-commerce: phễu mua hàng trên ứng dụng", en: "E-commerce: the in-app purchase funnel" }
  lesson:
    concept:
      vi: "Funnel (phễu) đếm có bao nhiêu phiên (session) đi tới từng bước: xem, thêm vào giỏ, thanh toán, đã trả tiền. Mỗi bước là một phép đếm phiên khác nhau có điều kiện. Tỷ lệ chuyển đổi của một bước là số phiên ở bước đó chia cho số phiên ở bước trước."
      en: "A funnel counts how many sessions reach each step: view, add to cart, checkout, paid. Each step is a conditional count of distinct sessions. A step's conversion rate is the sessions at that step divided by the sessions at the step before."
    example: "SELECT count(DISTINCT session_id) FILTER (WHERE event = 'view') AS viewed, count(DISTINCT session_id) FILTER (WHERE event = 'add_to_cart') AS carted, count(DISTINCT session_id) FILTER (WHERE event = 'checkout') AS checked_out, count(DISTINCT session_id) FILTER (WHERE event = 'paid') AS paid FROM app_events"
    explain:
      vi: "① Mỗi cột là một bước, cùng một bảng sự kiện, khác điều kiện trong `FILTER`. ② `count(DISTINCT session_id)` đếm phiên, không đếm sự kiện. ③ Kết quả: 900 phiên xem, 488 thêm vào giỏ, 299 tới thanh toán, 241 trả tiền. Tỷ lệ cả phễu: 241 / 900 ≈ 26,8%; bước rơi nhiều nhất là từ xem sang giỏ (còn 54%)."
      en: "① Each column is a step: same event table, a different condition in `FILTER`. ② `count(DISTINCT session_id)` counts sessions, not events. ③ Result: 900 sessions viewed, 488 added to cart, 299 reached checkout, 241 paid. Whole-funnel conversion: 241 / 900 ≈ 26.8%; the biggest drop is from view to cart (54% stay)."
    mistake:
      sql: "SELECT count(DISTINCT user_id) FILTER (WHERE event = 'view') AS viewed, count(DISTINCT user_id) FILTER (WHERE event = 'add_to_cart') AS carted, count(DISTINCT user_id) FILTER (WHERE event = 'checkout') AS checked_out, count(DISTINCT user_id) FILTER (WHERE event = 'paid') AS paid FROM app_events"
      vi: "Đếm theo `user_id` thì mất mọi phiên khách vãng lai (`user_id` trống) và gộp nhiều phiên của cùng một khách: đó là phễu theo người, không phải theo phiên."
      en: "Counting by `user_id` drops every anonymous session (empty `user_id`) and merges several sessions of one customer: that is a funnel by person, not by session."
    try:
      task: { vi: "Tách phễu theo thiết bị (`device` trong cột JSON `props`): thiết bị và số phiên ở 4 bước như ví dụ.", en: "Split the funnel by device (`device` in the JSON column `props`): device and the session counts of the 4 steps as in the example." }
      starter: "SELECT count(DISTINCT session_id) FILTER (WHERE event = 'view') AS viewed, count(DISTINCT session_id) FILTER (WHERE event = 'add_to_cart') AS carted, count(DISTINCT session_id) FILTER (WHERE event = 'checkout') AS checked_out, count(DISTINCT session_id) FILTER (WHERE event = 'paid') AS paid FROM app_events"
      solution: "SELECT props ->> 'device' AS device, count(DISTINCT session_id) FILTER (WHERE event = 'view') AS viewed, count(DISTINCT session_id) FILTER (WHERE event = 'add_to_cart') AS carted, count(DISTINCT session_id) FILTER (WHERE event = 'checkout') AS checked_out, count(DISTINCT session_id) FILTER (WHERE event = 'paid') AS paid FROM app_events GROUP BY 1"
    docs: https://www.postgresql.org/docs/current/sql-expressions.html#SYNTAX-AGGREGATES
  drills:
    - id: g-b3-1
      kind: faded
      task: { vi: "Tỷ lệ chuyển đổi cả phễu: % phiên có xem (`view`) mà đi tới trả tiền (`paid`), làm tròn 1 chữ số thập phân.", en: "Whole-funnel conversion: the % of sessions with a view (`view`) that reached payment (`paid`), rounded to 1 decimal." }
      starter: "SELECT round(100.0 * count(DISTINCT session_id) FILTER (WHERE event = 'paid') / count(DISTINCT session_id) FILTER (WHERE event = ___), 1) AS conversion_pct FROM app_events"
      solution: "SELECT round(100.0 * count(DISTINCT session_id) FILTER (WHERE event = 'paid') / count(DISTINCT session_id) FILTER (WHERE event = 'view'), 1) AS conversion_pct FROM app_events"
      hint: { vi: "Mẫu số là bước đầu tiên của phễu.", en: "The denominator is the first step of the funnel." }
    - id: g-b3-2
      kind: open
      task: { vi: "Tỷ lệ chuyển đổi từng bước, theo %, làm tròn 1 chữ số thập phân: xem → giỏ, giỏ → thanh toán, thanh toán → trả tiền (3 cột).", en: "Step-by-step conversion, as %, rounded to 1 decimal: view → cart, cart → checkout, checkout → paid (3 columns)." }
      solution: "WITH s AS (SELECT count(DISTINCT session_id) FILTER (WHERE event = 'view') AS v, count(DISTINCT session_id) FILTER (WHERE event = 'add_to_cart') AS a, count(DISTINCT session_id) FILTER (WHERE event = 'checkout') AS c, count(DISTINCT session_id) FILTER (WHERE event = 'paid') AS p FROM app_events) SELECT round(100.0 * a / v, 1) AS view_to_cart, round(100.0 * c / a, 1) AS cart_to_checkout, round(100.0 * p / c, 1) AS checkout_to_paid FROM s"
      hint: { vi: "Đếm 4 bước trong một CTE, rồi chia mỗi bước cho bước ngay trước nó.", en: "Count the 4 steps in a CTE, then divide each step by the one right before it." }
    - id: g-b3-3
      kind: trap
      task: { vi: "Mỗi tháng (theo thời điểm sự kiện): số phiên có xem và số phiên có trả tiền.", en: "For each month (by event time): the number of sessions with a view and the number with a payment." }
      solution: "SELECT date_trunc('month', ts)::date AS month, count(DISTINCT session_id) FILTER (WHERE event = 'view') AS viewed, count(DISTINCT session_id) FILTER (WHERE event = 'paid') AS paid FROM app_events GROUP BY 1"
      hint: { vi: "Mỗi cột một điều kiện riêng; không lọc chung ở WHERE.", en: "Each column has its own condition; no shared filter in WHERE." }
      wrong:
        - sql: "SELECT date_trunc('month', ts)::date AS month, count(DISTINCT session_id) FILTER (WHERE event = 'view') AS viewed, count(DISTINCT session_id) AS paid FROM app_events WHERE event = 'paid' GROUP BY 1"
          vi: "Lọc `event = 'paid'` ở WHERE thì các sự kiện xem bị bỏ trước khi đếm: cột xem về 0. Đặt điều kiện vào từng cột."
          en: "Filtering `event = 'paid'` in WHERE drops the view events before counting: the view column drops to 0. Put the condition in each column."
    - id: g-b3-4
      kind: challenge
      task: { vi: "So sánh thiết bị: thiết bị, số phiên có xem, số phiên trả tiền, tỷ lệ % (1 chữ số thập phân). Tỷ lệ cao nhất lên đầu; bằng nhau thì theo tên thiết bị.", en: "Compare devices: device, sessions with a view, sessions that paid, conversion % (1 decimal). Highest rate first; on a tie, by device name." }
      solution: "WITH d AS (SELECT props ->> 'device' AS device, count(DISTINCT session_id) FILTER (WHERE event = 'view') AS viewed, count(DISTINCT session_id) FILTER (WHERE event = 'paid') AS paid FROM app_events GROUP BY 1) SELECT device, viewed, paid, round(100.0 * paid / viewed, 1) AS conversion_pct FROM d ORDER BY conversion_pct DESC, device"
      ordered: true
      hint: { vi: "Lấy thiết bị bằng `->>` từ `props`, gom theo thiết bị trong CTE rồi tính tỷ lệ.", en: "Read the device with `->>` from `props`, group by device in a CTE, then compute the rate." }

- id: b4
  group: B
  status: in
  title: { vi: "Phân khúc RFM", en: "RFM segmentation" }
  why: { vi: "Marketing cần biết ai là khách tốt, ai sắp rời bỏ, để gửi đúng ưu đãi cho đúng người.", en: "Marketing needs to know who the best customers are and who is about to leave, to send the right offer to the right people." }
  needs: [window_rank, cte, case_when, date_math, a2]
  applies: { vi: "E-commerce: chia nhóm khách cho chiến dịch", en: "E-commerce: customer segments for campaigns" }
  lesson:
    concept:
      vi: "RFM chấm mỗi khách theo ba trục: Recency (bao lâu rồi chưa mua), Frequency (mua bao nhiêu đơn), Monetary (chi bao nhiêu). NTILE(5) chia khách đã xếp hạng thành 5 nhóm bằng nhau, cho điểm 1 tới 5. Với Recency, mua càng gần thì điểm càng cao, nên xếp giảm dần theo số ngày."
      en: "RFM scores each customer on three axes: Recency (how long since the last purchase), Frequency (how many orders), Monetary (how much spent). NTILE(5) splits the ranked customers into 5 equal groups, scoring 1 to 5. For Recency the more recent buyer scores higher, so sort by days descending."
    example: "WITH c AS (SELECT o.customer_id, DATE '2026-10-31' - max(o.order_date) AS recency, count(DISTINCT o.id) AS frequency, sum(i.qty * i.unit_price_vnd) AS monetary FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.customer_id IS NOT NULL GROUP BY 1) SELECT customer_id, recency, frequency, monetary FROM c ORDER BY monetary DESC, customer_id LIMIT 10"
    explain:
      vi: "① `DATE '2026-10-31' - max(o.order_date)`: số ngày từ đơn gần nhất tới hôm nay. ② `count(DISTINCT o.id)`: số đơn, không phải số dòng hàng. ③ `sum(...)`: tổng chi. Cả 300 khách đều có đơn đã thanh toán; recency từ 0 tới 465 ngày, frequency từ 1 tới 4 đơn. Kết quả: 10 khách chi nhiều nhất, người đầu tiên chi 4.071.400 đồng."
      en: "① `DATE '2026-10-31' - max(o.order_date)`: days from the latest order to today. ② `count(DISTINCT o.id)`: number of orders, not item lines. ③ `sum(...)`: total spend. All 300 customers have a paid order; recency runs from 0 to 465 days, frequency from 1 to 4 orders. Result: the 10 biggest spenders, the first one spent 4,071,400 VND."
    mistake:
      sql: "WITH c AS (SELECT o.customer_id, max(o.order_date) - DATE '2026-10-31' AS recency, count(DISTINCT o.id) AS frequency, sum(i.qty * i.unit_price_vnd) AS monetary FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.customer_id IS NOT NULL GROUP BY 1) SELECT customer_id, recency, frequency, monetary FROM c ORDER BY monetary DESC, customer_id LIMIT 10"
      vi: "Trừ ngược chiều: recency thành số âm, và mọi phép xếp hạng theo recency sau đó đảo ngược."
      en: "Subtracting the wrong way round: recency becomes negative, and every later ranking by recency flips."
    try:
      task: { vi: "Chấm điểm M từ 1 tới 5 bằng NTILE theo tổng chi (chi ít = 1). Với mỗi điểm: điểm, số khách, tổng chi nhỏ nhất và lớn nhất trong nhóm.", en: "Score M from 1 to 5 with NTILE on total spend (lowest spend = 1). For each score: the score, number of customers, smallest and largest spend in the group." }
      starter: "WITH c AS (SELECT o.customer_id, DATE '2026-10-31' - max(o.order_date) AS recency, count(DISTINCT o.id) AS frequency, sum(i.qty * i.unit_price_vnd) AS monetary FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.customer_id IS NOT NULL GROUP BY 1) SELECT customer_id, recency, frequency, monetary FROM c ORDER BY monetary DESC, customer_id LIMIT 10"
      solution: "WITH c AS (SELECT o.customer_id, sum(i.qty * i.unit_price_vnd) AS monetary FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.customer_id IS NOT NULL GROUP BY 1), s AS (SELECT monetary, ntile(5) OVER (ORDER BY monetary) AS m_score FROM c) SELECT m_score, count(*) AS customers, min(monetary) AS low, max(monetary) AS high FROM s GROUP BY m_score"
    docs: https://www.postgresql.org/docs/current/functions-window.html
  drills:
    - id: g-b4-1
      kind: faded
      task: { vi: "Chấm điểm R từ 1 tới 5 bằng NTILE: mua càng gần đây điểm càng cao. Với mỗi điểm: điểm, số khách, số ngày nhỏ nhất và lớn nhất.", en: "Score R from 1 to 5 with NTILE: the more recent the purchase, the higher the score. For each score: the score, number of customers, smallest and largest number of days." }
      starter: "WITH c AS (SELECT customer_id, DATE '2026-10-31' - max(order_date) AS recency FROM orders WHERE status = 'PAID' AND customer_id IS NOT NULL GROUP BY 1), s AS (SELECT recency, ntile(5) OVER (ORDER BY recency ___) AS r_score FROM c) SELECT r_score, count(*) AS customers, min(recency) AS low, max(recency) AS high FROM s GROUP BY r_score"
      solution: "WITH c AS (SELECT customer_id, DATE '2026-10-31' - max(order_date) AS recency FROM orders WHERE status = 'PAID' AND customer_id IS NOT NULL GROUP BY 1), s AS (SELECT recency, ntile(5) OVER (ORDER BY recency DESC) AS r_score FROM c) SELECT r_score, count(*) AS customers, min(recency) AS low, max(recency) AS high FROM s GROUP BY r_score"
      hint: { vi: "Nhiều ngày = lâu rồi chưa mua = điểm thấp: xếp số ngày giảm dần.", en: "Many days = long since the last purchase = low score: sort days descending." }
    - id: g-b4-2
      kind: open
      task: { vi: "Chấm điểm F từ 1 tới 5 bằng NTILE theo số đơn đã thanh toán (ít đơn = 1). Với mỗi điểm: điểm, số khách, số đơn nhỏ nhất và lớn nhất.", en: "Score F from 1 to 5 with NTILE on the number of paid orders (fewest = 1). For each score: the score, number of customers, smallest and largest order count." }
      solution: "WITH c AS (SELECT customer_id, count(*) AS frequency FROM orders WHERE status = 'PAID' AND customer_id IS NOT NULL GROUP BY 1), s AS (SELECT frequency, ntile(5) OVER (ORDER BY frequency) AS f_score FROM c) SELECT f_score, count(*) AS customers, min(frequency) AS low, max(frequency) AS high FROM s GROUP BY f_score"
      hint: { vi: "Đếm đơn của mỗi khách trong CTE, rồi NTILE(5) trên số đơn.", en: "Count each customer's orders in a CTE, then NTILE(5) on that count." }
    - id: g-b4-3
      kind: trap
      task: { vi: "Phân bố tần suất: với mỗi số đơn đã thanh toán (1, 2, 3…), có bao nhiêu khách mua đúng ngần ấy đơn?", en: "Frequency distribution: for each number of paid orders (1, 2, 3…), how many customers bought exactly that many orders?" }
      solution: "SELECT frequency, count(*) AS customers FROM (SELECT o.customer_id, count(DISTINCT o.id) AS frequency FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.customer_id IS NOT NULL GROUP BY 1) c GROUP BY frequency"
      hint: { vi: "Sau khi nối với dòng hàng, một đơn có nhiều dòng: đếm mã đơn khác nhau.", en: "After joining item lines, one order has several rows: count distinct order ids." }
      wrong:
        - sql: "SELECT frequency, count(*) AS customers FROM (SELECT o.customer_id, count(*) AS frequency FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.customer_id IS NOT NULL GROUP BY 1) c GROUP BY frequency"
          vi: "`count(*)` sau khi nối đếm dòng hàng, không đếm đơn: khách có đơn 4 dòng bị tính như mua 4 lần."
          en: "`count(*)` after the join counts item lines, not orders: a customer with one 4-line order counts as 4 purchases."
    - id: g-b4-4
      kind: challenge
      task: { vi: "Chấm R và F (1–5, NTILE; R: mua càng gần điểm càng cao; F: nhiều đơn điểm cao; bằng nhau thì mã khách nhỏ hơn được điểm thấp hơn). Nhóm 1 = R ≥ 4 và F ≥ 4, nhóm 2 = R ≤ 2 và F ≥ 4 (khách tốt sắp rời), còn lại nhóm 3. Mỗi nhóm: mã nhóm và số khách.", en: "Score R and F (1–5, NTILE; R: more recent scores higher; F: more orders scores higher; on a tie the smaller customer id gets the lower score). Segment 1 = R ≥ 4 and F ≥ 4, segment 2 = R ≤ 2 and F ≥ 4 (good customers drifting away), everyone else segment 3. Per segment: the segment number and the number of customers." }
      solution: "WITH c AS (SELECT customer_id, DATE '2026-10-31' - max(order_date) AS recency, count(*) AS frequency FROM orders WHERE status = 'PAID' AND customer_id IS NOT NULL GROUP BY 1), s AS (SELECT customer_id, ntile(5) OVER (ORDER BY recency DESC, customer_id) AS r, ntile(5) OVER (ORDER BY frequency, customer_id) AS f FROM c) SELECT CASE WHEN r >= 4 AND f >= 4 THEN 1 WHEN r <= 2 AND f >= 4 THEN 2 ELSE 3 END AS segment, count(*) AS customers FROM s GROUP BY 1"
      hint: { vi: "Hai NTILE trong cùng một CTE, mỗi cái một thứ tự; CASE xếp điều kiện hẹp lên trước.", en: "Two NTILEs in the same CTE, each with its own order; CASE puts the narrow conditions first." }

- id: b5
  group: B
  status: partial
  title: { vi: "A/B test cơ bản", en: "A/B testing basics" }
  why: { vi: "Đọc kết quả thí nghiệm đúng cách giúp tránh tuyên bố \"B thắng\" chỉ vì may.", en: "Reading an experiment correctly avoids declaring \"B wins\" because of luck." }
  needs: [conditional_agg, cast, cte, a2]
  applies: { vi: "E-commerce: thử nút, banner, giá", en: "E-commerce: testing buttons, banners, prices" }
  lesson:
    concept:
      vi: "A/B test chia khách ngẫu nhiên thành nhóm A (bản cũ) và B (bản mới), rồi so tỷ lệ chuyển đổi. Chênh lệch nhỏ có thể chỉ do ngẫu nhiên; z-score cho biết chênh lệch lớn cỡ nào so với độ nhiễu. Trị tuyệt đối dưới khoảng 2 thường là chưa đủ bằng chứng. Kiểm định và cỡ mẫu: xem tài liệu bên ngoài."
      en: "An A/B test splits customers at random into group A (the old version) and B (the new one), then compares conversion rates. A small difference can be pure chance; the z-score tells how big the difference is compared with the noise. An absolute value below about 2 is usually not enough evidence. Testing and sample size: see the outside material."
    example: "SELECT experiment_id, variant, count(*) AS users, count(*) FILTER (WHERE converted) AS conversions, round(100.0 * count(*) FILTER (WHERE converted) / count(*), 1) AS rate_pct FROM assignments GROUP BY 1, 2 ORDER BY 1, 2"
    explain:
      vi: "① Mỗi dòng là một nhóm của một thí nghiệm. ② `count(*) FILTER (WHERE converted)`: số khách chuyển đổi. ③ `100.0 *` trước khi chia để ra số thập phân. Kết quả: thí nghiệm 1 có A 40/150 = 26,7%, B 42/150 = 28,0%; thí nghiệm 2 có A 20,7%, B 17,3%. B của thí nghiệm 1 hơn 1,3 điểm %, nhưng chỉ là 2 khách: còn quá sớm để kết luận."
      en: "① Each row is one group of one experiment. ② `count(*) FILTER (WHERE converted)`: the customers who converted. ③ `100.0 *` before dividing to get decimals. Result: experiment 1 has A 40/150 = 26.7%, B 42/150 = 28.0%; experiment 2 has A 20.7%, B 17.3%. B in experiment 1 is 1.3 points ahead, but that is only 2 customers: too early to call."
    mistake:
      sql: "SELECT experiment_id, variant, avg(converted) AS rate FROM assignments GROUP BY 1, 2"
      vi: "`avg` không nhận kiểu boolean: Postgres báo lỗi function avg(boolean) does not exist. Đổi sang số trước (`converted::int`) hoặc đếm có điều kiện."
      en: "`avg` does not take a boolean: Postgres says function avg(boolean) does not exist. Cast to a number first (`converted::int`) or use a conditional count."
    try:
      task: { vi: "Chỉ thí nghiệm 1, một dòng: tỷ lệ % của A, của B và chênh lệch B − A (điểm %), mỗi số làm tròn 1 chữ số thập phân.", en: "Experiment 1 only, one row: the % rate of A, of B and the difference B − A (points), each rounded to 1 decimal." }
      starter: "SELECT experiment_id, variant, count(*) AS users, count(*) FILTER (WHERE converted) AS conversions, round(100.0 * count(*) FILTER (WHERE converted) / count(*), 1) AS rate_pct FROM assignments GROUP BY 1, 2 ORDER BY 1, 2"
      solution: "WITH r AS (SELECT 100.0 * count(*) FILTER (WHERE variant = 'A' AND converted) / count(*) FILTER (WHERE variant = 'A') AS a, 100.0 * count(*) FILTER (WHERE variant = 'B' AND converted) / count(*) FILTER (WHERE variant = 'B') AS b FROM assignments WHERE experiment_id = 1) SELECT round(a, 1) AS rate_a, round(b, 1) AS rate_b, round(b - a, 1) AS diff_pts FROM r"
    docs: https://www.postgresql.org/docs/current/functions-math.html
  drills:
    - id: g-b5-1
      kind: faded
      task: { vi: "Thí nghiệm 2: tỷ lệ chuyển đổi % của từng nhóm, làm tròn 1 chữ số thập phân.", en: "Experiment 2: the conversion rate % of each group, rounded to 1 decimal." }
      starter: "SELECT variant, round(100.0 * count(*) FILTER (WHERE ___) / count(*), 1) AS rate_pct FROM assignments WHERE experiment_id = 2 GROUP BY variant"
      solution: "SELECT variant, round(100.0 * count(*) FILTER (WHERE converted) / count(*), 1) AS rate_pct FROM assignments WHERE experiment_id = 2 GROUP BY variant"
      hint: { vi: "Cột `converted` đã là đúng/sai: dùng thẳng làm điều kiện.", en: "The `converted` column is already true/false: use it directly as the condition." }
    - id: g-b5-2
      kind: open
      task: { vi: "Thí nghiệm 1: B tốt hơn A bao nhiêu phần trăm tương đối (lift = (tỷ lệ B − tỷ lệ A) / tỷ lệ A × 100)? Một con số, làm tròn 1 chữ số thập phân.", en: "Experiment 1: by what relative % is B better than A (lift = (rate B − rate A) / rate A × 100)? One number, rounded to 1 decimal." }
      solution: "WITH r AS (SELECT avg(converted::int) FILTER (WHERE variant = 'A') AS a, avg(converted::int) FILTER (WHERE variant = 'B') AS b FROM assignments WHERE experiment_id = 1) SELECT round(100 * (b - a) / a, 1) AS lift_pct FROM r"
      hint: { vi: "Trung bình của `converted::int` chính là tỷ lệ chuyển đổi của nhóm.", en: "The average of `converted::int` is the group's conversion rate." }
    - id: g-b5-3
      kind: trap
      task: { vi: "Tỷ lệ chuyển đổi chung (cả hai nhóm) của từng thí nghiệm, dạng số thập phân từ 0 tới 1, làm tròn 3 chữ số.", en: "The overall conversion rate (both groups) of each experiment, as a decimal from 0 to 1, rounded to 3 decimals." }
      solution: "SELECT experiment_id, round(count(*) FILTER (WHERE converted)::numeric / count(*), 3) AS rate FROM assignments GROUP BY experiment_id"
      hint: { vi: "Chia hai số nguyên trong Postgres thì bỏ phần lẻ: đổi một vế sang `numeric`.", en: "Dividing two integers in Postgres drops the fraction: cast one side to `numeric`." }
      wrong:
        - sql: "SELECT experiment_id, round(count(*) FILTER (WHERE converted) / count(*), 3) AS rate FROM assignments GROUP BY experiment_id"
          vi: "Số nguyên chia số nguyên ra số nguyên: 82 / 300 = 0. Ép kiểu một vế trước khi chia."
          en: "Integer divided by integer is an integer: 82 / 300 = 0. Cast one side before dividing."
    - id: g-b5-4
      kind: challenge
      task: { vi: "Thí nghiệm 1, một dòng: số khách A, số khách B, tỷ lệ A, tỷ lệ B (số thập phân, 4 chữ số) và z-score = (pB − pA) / căn(p × (1 − p) × (1/nA + 1/nB)), với p là tỷ lệ chung của cả hai nhóm (z làm tròn 2 chữ số).", en: "Experiment 1, one row: customers in A, customers in B, rate A, rate B (decimals, 4 places) and the z-score = (pB − pA) / sqrt(p × (1 − p) × (1/nA + 1/nB)), where p is the pooled rate of both groups (z rounded to 2 decimals)." }
      solution: "WITH r AS (SELECT count(*) FILTER (WHERE variant = 'A') AS n_a, count(*) FILTER (WHERE variant = 'B') AS n_b, avg(converted::int) FILTER (WHERE variant = 'A') AS p_a, avg(converted::int) FILTER (WHERE variant = 'B') AS p_b, avg(converted::int) AS p FROM assignments WHERE experiment_id = 1) SELECT n_a, n_b, round(p_a, 4) AS p_a, round(p_b, 4) AS p_b, round((p_b - p_a) / sqrt(p * (1 - p) * (1.0 / n_a + 1.0 / n_b)), 2) AS z FROM r"
      hint: { vi: "Tính n, p của từng nhóm và p chung trong một CTE; `sqrt` cho căn bậc hai. Nhớ `1.0 /` để không chia nguyên.", en: "Compute each group's n and p and the pooled p in a CTE; `sqrt` gives the square root. Remember `1.0 /` to avoid integer division." }
  links:
    - { title: { vi: "Khan Academy: Thống kê và xác suất (kiểm định ý nghĩa)", en: "Khan Academy: Statistics and probability (significance tests)" }, url: "https://www.khanacademy.org/math/statistics-probability" }

- id: b6
  group: B
  status: in
  title: { vi: "Phát hiện bất thường", en: "Anomaly detection" }
  why: { vi: "Một ngày doanh thu vọt lên hay tụt xuống cần được báo trước khi sếp hỏi.", en: "A day when revenue jumps or drops should be flagged before the boss asks." }
  needs: [window_agg, cte, date_bucket, a1, a2]
  applies: { vi: "Mọi domain: cảnh báo trên Bảng điều hành", en: "Every domain: alerts on the dashboard" }
  lesson:
    concept:
      vi: "Một ngày là bất thường khi nó lệch xa so với các ngày trước đó. Cách đơn giản: tính trung bình và độ lệch chuẩn của 28 ngày bán trước (khung cửa sổ không gồm ngày đang xét), rồi đánh dấu ngày vượt trung bình + 3 lần độ lệch chuẩn."
      en: "A day is unusual when it sits far from the days before it. A simple method: compute the mean and standard deviation of the previous 28 sales days (a window frame that excludes the current day), then flag days above the mean + 3 standard deviations."
    example: "WITH d AS (SELECT o.order_date AS day, sum(i.qty * i.unit_price_vnd) AS revenue FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.store_id = 3 GROUP BY 1), s AS (SELECT day, revenue, avg(revenue) OVER w AS mean_28, stddev_samp(revenue) OVER w AS sd_28 FROM d WINDOW w AS (ORDER BY day ROWS BETWEEN 28 PRECEDING AND 1 PRECEDING)) SELECT day, revenue, round(mean_28) AS mean_28, round(sd_28) AS sd_28 FROM s WHERE day BETWEEN '2026-09-01' AND '2026-09-15' ORDER BY day"
    explain:
      vi: "① CTE `d`: doanh thu mỗi ngày có bán của cửa hàng 3. ② `ROWS BETWEEN 28 PRECEDING AND 1 PRECEDING`: 28 ngày bán trước, không gồm hôm nay. ③ Lọc ngày sau khi tính cửa sổ, để ngày đầu tháng vẫn có đủ quá khứ. Kết quả: 14 ngày; ngày 09/09/2026 bán 6.095.000 đồng trong khi trung bình 918.425 và độ lệch chuẩn 507.111: lệch hơn 10 lần độ lệch chuẩn."
      en: "① CTE `d`: revenue for each sales day of store 3. ② `ROWS BETWEEN 28 PRECEDING AND 1 PRECEDING`: the 28 previous sales days, not today. ③ Filter dates after the window is computed, so early-month days still have their history. Result: 14 days; on 2026-09-09 the store sold 6,095,000 VND against a mean of 918,425 and a standard deviation of 507,111: more than 10 standard deviations above."
    mistake:
      sql: "WITH d AS (SELECT o.order_date AS day, sum(i.qty * i.unit_price_vnd) AS revenue FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.store_id = 3 GROUP BY 1), s AS (SELECT day, revenue, avg(revenue) OVER w AS mean_28, stddev_samp(revenue) OVER w AS sd_28 FROM d WINDOW w AS (ORDER BY day ROWS BETWEEN 28 PRECEDING AND CURRENT ROW)) SELECT day, revenue, round(mean_28) AS mean_28, round(sd_28) AS sd_28 FROM s WHERE day BETWEEN '2026-09-01' AND '2026-09-15' ORDER BY day"
      vi: "Khung gồm cả ngày đang xét (`CURRENT ROW`): ngày đột biến tự kéo trung bình và độ lệch chuẩn của chính nó lên, nên trông bớt bất thường."
      en: "The frame includes the current day (`CURRENT ROW`): a spike pulls up its own mean and standard deviation, so it looks less unusual."
    try:
      task: { vi: "Năm 2026, những ngày nào cửa hàng 3 bán vượt trung bình + 3 lần độ lệch chuẩn của 28 ngày bán trước? Ngày và doanh thu.", en: "In 2026, on which days did store 3 sell more than the mean + 3 standard deviations of the 28 previous sales days? Day and revenue." }
      starter: "WITH d AS (SELECT o.order_date AS day, sum(i.qty * i.unit_price_vnd) AS revenue FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.store_id = 3 GROUP BY 1), s AS (SELECT day, revenue, avg(revenue) OVER w AS mean_28, stddev_samp(revenue) OVER w AS sd_28 FROM d WINDOW w AS (ORDER BY day ROWS BETWEEN 28 PRECEDING AND 1 PRECEDING)) SELECT day, revenue, round(mean_28) AS mean_28, round(sd_28) AS sd_28 FROM s WHERE day BETWEEN '2026-09-01' AND '2026-09-15' ORDER BY day"
      solution: "WITH d AS (SELECT o.order_date AS day, sum(i.qty * i.unit_price_vnd) AS revenue FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.store_id = 3 GROUP BY 1), s AS (SELECT day, revenue, avg(revenue) OVER w AS m, stddev_samp(revenue) OVER w AS sd FROM d WINDOW w AS (ORDER BY day ROWS BETWEEN 28 PRECEDING AND 1 PRECEDING)) SELECT day, revenue FROM s WHERE day >= '2026-01-01' AND revenue > m + 3 * sd"
    docs: https://www.postgresql.org/docs/current/sql-expressions.html#SYNTAX-WINDOW-FUNCTIONS
  drills:
    - id: g-b6-1
      kind: faded
      task: { vi: "Doanh thu cả chuỗi mỗi ngày có bán trong tháng 10/2026, kèm trung bình trượt 7 ngày bán (hôm nay và 6 ngày bán trước), làm tròn tới đồng.", en: "Chain revenue for each sales day in October 2026, with a 7-sales-day moving average (today and the 6 previous sales days), rounded to the dong." }
      starter: "WITH d AS (SELECT o.order_date AS day, sum(i.qty * i.unit_price_vnd) AS revenue FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' GROUP BY 1), s AS (SELECT day, revenue, round(avg(revenue) OVER (ORDER BY day ROWS BETWEEN ___ PRECEDING AND CURRENT ROW)) AS avg_7 FROM d) SELECT day, revenue, avg_7 FROM s WHERE day >= '2026-10-01'"
      solution: "WITH d AS (SELECT o.order_date AS day, sum(i.qty * i.unit_price_vnd) AS revenue FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' GROUP BY 1), s AS (SELECT day, revenue, round(avg(revenue) OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)) AS avg_7 FROM d) SELECT day, revenue, avg_7 FROM s WHERE day >= '2026-10-01'"
      hint: { vi: "Hôm nay cộng 6 dòng trước là 7 dòng.", en: "Today plus 6 rows before it is 7 rows." }
    - id: g-b6-2
      kind: open
      task: { vi: "Ngày 09/09/2026 của cửa hàng 3 lệch bao nhiêu lần độ lệch chuẩn so với 28 ngày bán trước (z = (doanh thu − trung bình) / độ lệch chuẩn)? Một con số, làm tròn 2 chữ số.", en: "How many standard deviations from the 28 previous sales days was store 3 on 2026-09-09 (z = (revenue − mean) / standard deviation)? One number, rounded to 2 decimals." }
      solution: "WITH d AS (SELECT o.order_date AS day, sum(i.qty * i.unit_price_vnd) AS revenue FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.store_id = 3 GROUP BY 1), s AS (SELECT day, revenue, avg(revenue) OVER w AS m, stddev_samp(revenue) OVER w AS sd FROM d WINDOW w AS (ORDER BY day ROWS BETWEEN 28 PRECEDING AND 1 PRECEDING)) SELECT round((revenue - m) / sd, 2) AS z FROM s WHERE day = '2026-09-09'"
      hint: { vi: "Tính trung bình và độ lệch chuẩn bằng cửa sổ trên mọi ngày trước, rồi mới lọc ra ngày đó.", en: "Compute the mean and standard deviation with a window over all earlier days, then filter that one day." }
    - id: g-b6-3
      kind: trap
      task: { vi: "Tháng 9/2026, những ngày nào cửa hàng 3 bán hơn gấp đôi trung bình của 28 ngày bán trước đó? Ngày và doanh thu.", en: "In September 2026, on which days did store 3 sell more than twice the average of the 28 previous sales days? Day and revenue." }
      solution: "WITH d AS (SELECT o.order_date AS day, sum(i.qty * i.unit_price_vnd) AS revenue FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.store_id = 3 GROUP BY 1), s AS (SELECT day, revenue, avg(revenue) OVER (ORDER BY day ROWS BETWEEN 28 PRECEDING AND 1 PRECEDING) AS m FROM d) SELECT day, revenue FROM s WHERE day >= '2026-09-01' AND day < '2026-10-01' AND revenue > 2 * m"
      hint: { vi: "Lọc tháng sau khi tính cửa sổ, không phải trước.", en: "Filter the month after the window is computed, not before." }
      wrong:
        - sql: "WITH d AS (SELECT o.order_date AS day, sum(i.qty * i.unit_price_vnd) AS revenue FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.store_id = 3 AND o.order_date >= '2026-09-01' AND o.order_date < '2026-10-01' GROUP BY 1), s AS (SELECT day, revenue, avg(revenue) OVER (ORDER BY day ROWS BETWEEN 28 PRECEDING AND 1 PRECEDING) AS m FROM d) SELECT day, revenue FROM s WHERE revenue > 2 * m"
          vi: "Lọc tháng 9 trước khi tính cửa sổ thì đầu tháng không còn 28 ngày quá khứ: trung bình chỉ dựa trên vài ngày của chính tháng 9."
          en: "Filtering September before the window means early days lose their 28 days of history: the average rests on a few September days only."
    - id: g-b6-4
      kind: challenge
      task: { vi: "Năm 2026, mỗi cửa hàng có bao nhiêu ngày bán vượt trung bình + 3 lần độ lệch chuẩn của 28 ngày bán trước của chính cửa hàng đó? Mã cửa hàng và số ngày.", en: "In 2026, how many days did each store sell more than the mean + 3 standard deviations of its own 28 previous sales days? Store id and number of days." }
      solution: "WITH d AS (SELECT o.store_id, o.order_date AS day, sum(i.qty * i.unit_price_vnd) AS revenue FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' GROUP BY 1, 2), s AS (SELECT store_id, day, revenue, avg(revenue) OVER w AS m, stddev_samp(revenue) OVER w AS sd FROM d WINDOW w AS (PARTITION BY store_id ORDER BY day ROWS BETWEEN 28 PRECEDING AND 1 PRECEDING)) SELECT store_id, count(*) AS anomaly_days FROM s WHERE day >= '2026-01-01' AND revenue > m + 3 * sd GROUP BY store_id"
      hint: { vi: "Thêm `PARTITION BY` cửa hàng vào cửa sổ để mỗi cửa hàng so với chính nó.", en: "Add a `PARTITION BY` store to the window so each store is compared with itself." }

- id: b7
  group: B
  status: partial
  title: { vi: "Thống kê mô tả trong SQL", en: "Descriptive statistics in SQL" }
  why: { vi: "Trung bình, trung vị, độ lệch chuẩn và tương quan là ngôn ngữ chung khi trình bày số liệu.", en: "Mean, median, standard deviation and correlation are the common language for presenting numbers." }
  needs: [aggregate, group_by, cte]
  applies: { vi: "Mọi domain: mô tả phân phối trước khi kết luận", en: "Every domain: describe a distribution before drawing conclusions" }
  lesson:
    concept:
      vi: "Trung bình (`avg`) nhạy với vài giá trị rất lớn; trung vị (`percentile_cont(0.5)`) thì không. Độ lệch chuẩn (`stddev_samp`) đo mức phân tán. `corr` cho hệ số tương quan từ −1 tới 1. Trước khi tính, xác định đơn vị: một đơn hàng hay một dòng hàng."
      en: "The mean (`avg`) is pulled by a few very large values; the median (`percentile_cont(0.5)`) is not. The standard deviation (`stddev_samp`) measures spread. `corr` gives the correlation from −1 to 1. Before computing, fix the unit: one order or one item line."
    example: "WITH o AS (SELECT o.id, sum(i.qty * i.unit_price_vnd) AS value FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.order_date >= '2026-01-01' GROUP BY o.id) SELECT count(*) AS orders, round(avg(value)) AS mean, round(stddev_samp(value)) AS sd, min(value) AS low, max(value) AS high FROM o"
    explain:
      vi: "① CTE `o`: một dòng mỗi đơn, với giá trị đơn. ② Các hàm gộp tính trên đơn, không trên dòng hàng. ③ Kết quả năm 2026: 958 đơn, trung bình 483.612 đồng, độ lệch chuẩn 358.511, nhỏ nhất 46.500, lớn nhất 2.628.000. Độ lệch chuẩn gần bằng trung bình: giá trị đơn phân tán rộng, nên xem thêm trung vị."
      en: "① CTE `o`: one row per order, with the order value. ② The aggregates work on orders, not on item lines. ③ Result for 2026: 958 orders, mean 483,612 VND, standard deviation 358,511, smallest 46,500, largest 2,628,000. The standard deviation is close to the mean: order values are widely spread, so also look at the median."
    mistake:
      sql: "SELECT count(*) AS orders, round(avg(i.qty * i.unit_price_vnd)) AS mean, round(stddev_samp(i.qty * i.unit_price_vnd)) AS sd, min(i.qty * i.unit_price_vnd) AS low, max(i.qty * i.unit_price_vnd) AS high FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.order_date >= '2026-01-01'"
      vi: "Tính thẳng trên dòng hàng: \"đơn vị\" thành một dòng, số đếm thành số dòng, mọi thống kê nói về dòng hàng chứ không về đơn."
      en: "Computing straight on item lines: the unit becomes a line, the count becomes the number of lines, and every statistic describes lines, not orders."
    try:
      task: { vi: "Như ví dụ nhưng tách theo kênh bán (`channel`): kênh, số đơn, trung bình, độ lệch chuẩn (làm tròn tới đồng).", en: "Like the example but split by sales channel (`channel`): channel, number of orders, mean, standard deviation (rounded to the dong)." }
      starter: "WITH o AS (SELECT o.id, sum(i.qty * i.unit_price_vnd) AS value FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.order_date >= '2026-01-01' GROUP BY o.id) SELECT count(*) AS orders, round(avg(value)) AS mean, round(stddev_samp(value)) AS sd, min(value) AS low, max(value) AS high FROM o"
      solution: "WITH o AS (SELECT o.id, o.channel, sum(i.qty * i.unit_price_vnd) AS value FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.order_date >= '2026-01-01' GROUP BY o.id, o.channel) SELECT channel, count(*) AS orders, round(avg(value)) AS mean, round(stddev_samp(value)) AS sd FROM o GROUP BY channel"
    docs: https://www.postgresql.org/docs/current/functions-aggregate.html
  drills:
    - id: g-b7-1
      kind: faded
      task: { vi: "Trung vị giá trị đơn (đơn đã thanh toán, năm 2026).", en: "The median order value (paid orders, 2026)." }
      starter: "WITH o AS (SELECT o.id, sum(i.qty * i.unit_price_vnd) AS value FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.order_date >= '2026-01-01' GROUP BY o.id) SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY ___) AS median FROM o"
      solution: "WITH o AS (SELECT o.id, sum(i.qty * i.unit_price_vnd) AS value FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.order_date >= '2026-01-01' GROUP BY o.id) SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY value) AS median FROM o"
      hint: { vi: "Trung vị cần xếp đúng cột giá trị đơn.", en: "The median needs the order value column in its ordering." }
    - id: g-b7-2
      kind: open
      task: { vi: "Trên mọi dòng hàng: hệ số tương quan giữa đơn giá và số lượng, làm tròn 4 chữ số. Hàng đắt có bị mua ít hơn không?", en: "Over every item line: the correlation between unit price and quantity, rounded to 4 decimals. Are expensive items bought in smaller quantities?" }
      solution: "SELECT round(corr(qty, unit_price_vnd)::numeric, 4) AS correlation FROM order_items"
      hint: { vi: "`corr` trả kiểu số thực; đổi sang `numeric` để làm tròn.", en: "`corr` returns a float; cast to `numeric` to round it." }
    - id: g-b7-3
      kind: trap
      task: { vi: "Giá trị đơn trung bình của từng cửa hàng năm 2026 (đơn đã thanh toán), làm tròn tới đồng.", en: "The average order value of each store in 2026 (paid orders), rounded to the dong." }
      solution: "WITH o AS (SELECT o.id, o.store_id, sum(i.qty * i.unit_price_vnd) AS value FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.order_date >= '2026-01-01' GROUP BY o.id, o.store_id) SELECT store_id, round(avg(value)) AS avg_order FROM o GROUP BY store_id"
      hint: { vi: "Gom về một dòng mỗi đơn trước, rồi mới lấy trung bình theo cửa hàng.", en: "Collapse to one row per order first, then average by store." }
      wrong:
        - sql: "SELECT o.store_id, round(avg(i.qty * i.unit_price_vnd)) AS avg_order FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'PAID' AND o.order_date >= '2026-01-01' GROUP BY o.store_id"
          vi: "Đây là trung bình của một dòng hàng, không phải của một đơn: số nhỏ hơn thật nhiều lần."
          en: "This is the average of an item line, not of an order: the number is several times too small."
    - id: g-b7-4
      kind: challenge
      task: { vi: "Mỗi danh mục sản phẩm, theo thứ tự tên danh mục: số lượng trung bình mỗi dòng hàng (2 chữ số), độ lệch chuẩn (2 chữ số) và hệ số biến thiên = độ lệch chuẩn / trung bình (3 chữ số).", en: "For each product category, in category-name order: the average quantity per item line (2 decimals), the standard deviation (2 decimals) and the coefficient of variation = standard deviation / mean (3 decimals)." }
      solution: "SELECT p.category, round(avg(i.qty), 2) AS mean_qty, round(stddev_samp(i.qty), 2) AS sd_qty, round(stddev_samp(i.qty) / avg(i.qty), 3) AS cv FROM order_items i JOIN products p ON p.id = i.product_id GROUP BY p.category ORDER BY p.category"
      ordered: true
      hint: { vi: "Ở đây đơn vị là dòng hàng; chia hai hàm gộp trong cùng một nhóm.", en: "Here the unit is the item line; divide two aggregates of the same group." }
  links:
    - { title: { vi: "Khan Academy: Thống kê và xác suất", en: "Khan Academy: Statistics and probability" }, url: "https://www.khanacademy.org/math/statistics-probability" }

- id: c1
  group: C
  status: in
  title: { vi: "Kiểm chất lượng dữ liệu", en: "Data quality checks" }
  why: { vi: "Phần lớn con số sai trong báo cáo đến từ dữ liệu bẩn: trùng, mồ côi, trống, ngày vô lý.", en: "Most wrong numbers in reports come from dirty data: duplicates, orphans, blanks, impossible dates." }
  needs: [anti_join, null_logic, having, union, pattern_match]
  applies: { vi: "Mọi domain: chạy trước mỗi báo cáo quan trọng", en: "Every domain: run before every important report" }
  lesson:
    concept:
      vi: "Kiểm chất lượng là một bộ câu hỏi \"có dòng nào vi phạm luật không\": mồ côi (thanh toán trỏ tới đơn không tồn tại), trùng (một đơn trả hai lần), ngày trong tương lai, ô trống bắt buộc. Gộp các phép kiểm bằng UNION ALL thành một bảng: số thứ tự phép kiểm và số dòng vi phạm."
      en: "A quality check is a set of \"does any row break a rule\" questions: orphans (a payment pointing at an order that does not exist), duplicates (an order paid twice), dates in the future, required blanks. Stack the checks with UNION ALL into one table: the check number and the count of offending rows."
    example: "SELECT 1 AS check_no, count(*) AS problems FROM payments p WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.id = p.order_id) UNION ALL SELECT 2, count(*) FROM (SELECT order_id FROM payments WHERE amount_vnd > 0 GROUP BY order_id HAVING count(*) > 1) d UNION ALL SELECT 3, count(*) FROM raw_signups WHERE signup_date > '2026-10-31'"
    explain:
      vi: "① Phép 1: `NOT EXISTS` tìm thanh toán mồ côi: 8 dòng. ② Phép 2: đơn có hơn một khoản thanh toán dương: 13 đơn trả trùng (khoản âm là hoàn tiền, hợp lệ). ③ Phép 3: ngày đăng ký sau hôm nay (31/10/2026): 4 dòng. Một bảng 3 dòng, mỗi số khác 0 là một việc phải hỏi bộ phận nhập liệu."
      en: "① Check 1: `NOT EXISTS` finds orphan payments: 8 rows. ② Check 2: orders with more than one positive payment: 13 orders paid twice (negative amounts are refunds, which are fine). ③ Check 3: signup dates after today (2026-10-31): 4 rows. One 3-row table, and every non-zero number is a question for the people who enter the data."
    mistake:
      sql: "SELECT 1 AS check_no, count(*) AS problems FROM payments p WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.id = p.order_id) UNION ALL SELECT 2, count(*) FROM (SELECT order_id FROM payments GROUP BY order_id HAVING count(*) > 1) d UNION ALL SELECT 3, count(*) FROM raw_signups WHERE signup_date > '2026-10-31'"
      vi: "Bỏ điều kiện `amount_vnd > 0` thì mọi đơn có hoàn tiền (một khoản trả + một khoản âm) cũng bị tính là trùng: 51 thay vì 13. Luật kiểm phải đúng với nghiệp vụ."
      en: "Without `amount_vnd > 0`, every refunded order (one payment + one negative amount) also counts as a duplicate: 51 instead of 13. A check must match the business rule."
    try:
      task: { vi: "Liệt kê chi tiết các thanh toán mồ côi: mã thanh toán, mã đơn và số tiền.", en: "List the orphan payments in detail: payment id, order id and amount." }
      starter: "SELECT 1 AS check_no, count(*) AS problems FROM payments p WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.id = p.order_id) UNION ALL SELECT 2, count(*) FROM (SELECT order_id FROM payments WHERE amount_vnd > 0 GROUP BY order_id HAVING count(*) > 1) d UNION ALL SELECT 3, count(*) FROM raw_signups WHERE signup_date > '2026-10-31'"
      solution: "SELECT p.id, p.order_id, p.amount_vnd FROM payments p WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.id = p.order_id)"
    docs: https://www.postgresql.org/docs/current/functions-subquery.html
  drills:
    - id: g-c1-1
      kind: faded
      task: { vi: "Những đăng ký thô nào có ngày đăng ký sau hôm nay (31/10/2026)? Mã và ngày đăng ký.", en: "Which raw signups have a signup date after today (2026-10-31)? Id and signup date." }
      starter: "SELECT id, signup_date FROM raw_signups WHERE signup_date > ___"
      solution: "SELECT id, signup_date FROM raw_signups WHERE signup_date > '2026-10-31'"
      hint: { vi: "So với ngày hôm nay viết dạng ngày trong nháy đơn.", en: "Compare with today's date written in single quotes." }
    - id: g-c1-2
      kind: open
      task: { vi: "Trong bảng đăng ký thô: bao nhiêu dòng thiếu email, bao nhiêu dòng thiếu số điện thoại? Một dòng, hai số.", en: "In the raw signups: how many rows have no email, how many have no phone? One row, two numbers." }
      solution: "SELECT count(*) FILTER (WHERE email IS NULL) AS no_email, count(*) FILTER (WHERE phone IS NULL) AS no_phone FROM raw_signups"
      hint: { vi: "Ô trống là NULL: kiểm bằng IS NULL, mỗi cột một điều kiện riêng.", en: "A blank is NULL: test with IS NULL, one condition per column." }
    - id: g-c1-3
      kind: trap
      task: { vi: "Những đơn nào bị thu tiền hai lần (hơn một khoản thanh toán dương)? Mã đơn và số khoản dương. Khoản âm là hoàn tiền, không tính.", en: "Which orders were charged twice (more than one positive payment)? Order id and number of positive payments. Negative amounts are refunds and do not count." }
      solution: "SELECT order_id, count(*) AS payments FROM payments WHERE amount_vnd > 0 GROUP BY order_id HAVING count(*) > 1"
      hint: { vi: "Bỏ khoản âm trước khi gom (WHERE), rồi giữ nhóm có hơn một dòng (HAVING).", en: "Drop negative amounts before grouping (WHERE), then keep groups with more than one row (HAVING)." }
      wrong:
        - sql: "SELECT order_id, count(*) AS payments FROM payments GROUP BY order_id HAVING count(*) > 1"
          vi: "Không lọc khoản âm thì mọi đơn có hoàn tiền cũng hiện ra như bị thu hai lần."
          en: "Without dropping negative amounts, every refunded order also shows up as charged twice."
    - id: g-c1-4
      kind: challenge
      task: { vi: "Một bảng kiểm gồm 5 phép, mỗi phép một dòng (số phép, số dòng vi phạm): 1 thanh toán mồ côi, 2 đơn thu tiền dương hơn một lần, 3 đăng ký thô có ngày sau 31/10/2026, 4 đăng ký thô có email không đúng dạng chữ-thường@tên-miền (gồm cả email trống), 5 khách hàng không có email.", en: "A check table with 5 checks, one row each (check number, offending rows): 1 orphan payments, 2 orders with more than one positive payment, 3 raw signups dated after 2026-10-31, 4 raw signups whose email is not lowercase@domain (blank emails included), 5 customers without an email." }
      solution: "SELECT 1 AS check_no, count(*) AS problems FROM payments p WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.id = p.order_id) UNION ALL SELECT 2, count(*) FROM (SELECT order_id FROM payments WHERE amount_vnd > 0 GROUP BY order_id HAVING count(*) > 1) d UNION ALL SELECT 3, count(*) FROM raw_signups WHERE signup_date > '2026-10-31' UNION ALL SELECT 4, count(*) FROM raw_signups WHERE email IS NULL OR email !~ '^[a-z0-9._]+@[a-z0-9.-]+[.][a-z]+$' UNION ALL SELECT 5, count(*) FROM customers WHERE email IS NULL"
      hint: { vi: "Mỗi phép một câu đếm, nối bằng UNION ALL. Email trống không khớp mẫu nào, nên phải kiểm IS NULL riêng.", en: "One count per check, joined with UNION ALL. A blank email matches no pattern, so test IS NULL separately." }

- id: c2
  group: C
  status: partial
  title: { vi: "Star schema và grain", en: "Star schemas and grain" }
  why: { vi: "Hầu hết kho dữ liệu BI là bảng fact ở giữa và các bảng dimension xung quanh; đọc sai grain là đếm sai.", en: "Most BI warehouses are a fact table in the middle with dimension tables around it; misreading the grain means counting wrong." }
  needs: [multi_join, group_by, left_join]
  applies: { vi: "Mọi domain: đọc kho dữ liệu của công ty", en: "Every domain: reading the company's data warehouse" }
  lesson:
    concept:
      vi: "Bảng fact ghi sự kiện đo được (ở đây một dòng hàng đã bán: số lượng, doanh thu), các bảng dimension mô tả ngữ cảnh (ngày, sản phẩm, khách). Grain là \"một dòng fact là gì\". Hỏi về đơn mà fact ở grain dòng hàng thì phải đếm mã đơn khác nhau. Thiết kế schema (DDL) học ở tài liệu Kimball."
      en: "The fact table records measurable events (here one sold item line: quantity, revenue); dimension tables describe the context (date, product, customer). The grain is \"what one fact row is\". Asking about orders when the fact grain is the item line means counting distinct order ids. Schema design (DDL) is covered by the Kimball material."
    example: "SELECT d.year, d.month, sum(f.revenue_vnd) AS revenue FROM fact_sales f JOIN dim_date d ON d.date_key = f.date_key WHERE d.year = 2026 GROUP BY d.year, d.month ORDER BY d.year, d.month"
    explain:
      vi: "① `fact_sales` là fact, grain = một dòng hàng của đơn đã thanh toán. ② `dim_date` cho năm, tháng, thứ trong tuần mà không cần hàm ngày. ③ Kết quả: 10 tháng của năm 2026, từ 21.451.200 đồng (tháng 1) tới 97.162.500 đồng (tháng 10), khớp với tổng tính từ bảng đơn hàng."
      en: "① `fact_sales` is the fact table, grain = one item line of a paid order. ② `dim_date` gives year, month and weekday without date functions. ③ Result: the 10 months of 2026, from 21,451,200 VND (January) to 97,162,500 VND (October), matching the totals computed from the orders table."
    mistake:
      sql: "SELECT d.month, sum(f.revenue_vnd) AS revenue FROM fact_sales f JOIN dim_date d ON d.date_key = f.date_key GROUP BY d.month ORDER BY d.month"
      vi: "Gom theo tháng mà không theo năm (và bỏ lọc năm) thì tháng 1/2025 và tháng 1/2026 cộng chung một dòng."
      en: "Grouping by month without the year (and dropping the year filter) adds January 2025 and January 2026 into one row."
    try:
      task: { vi: "Doanh thu theo danh mục sản phẩm trong quý 3/2026 (tháng 7 tới 9), dùng `dim_product` và `dim_date`.", en: "Revenue by product category in Q3 2026 (July to September), using `dim_product` and `dim_date`." }
      starter: "SELECT d.year, d.month, sum(f.revenue_vnd) AS revenue FROM fact_sales f JOIN dim_date d ON d.date_key = f.date_key WHERE d.year = 2026 GROUP BY d.year, d.month ORDER BY d.year, d.month"
      solution: "SELECT p.category, sum(f.revenue_vnd) AS revenue FROM fact_sales f JOIN dim_product p ON p.product_key = f.product_key JOIN dim_date d ON d.date_key = f.date_key WHERE d.year = 2026 AND d.month BETWEEN 7 AND 9 GROUP BY p.category"
    docs: https://www.postgresql.org/docs/current/queries-table-expressions.html
  drills:
    - id: g-c2-1
      kind: faded
      task: { vi: "Tổng doanh thu ngày cuối tuần và ngày thường (cột `is_weekend` của `dim_date`).", en: "Total revenue on weekend days and on weekdays (the `is_weekend` column of `dim_date`)." }
      starter: "SELECT d.is_weekend, sum(f.revenue_vnd) AS revenue FROM fact_sales f JOIN dim_date d ON d.date_key = ___ GROUP BY d.is_weekend"
      solution: "SELECT d.is_weekend, sum(f.revenue_vnd) AS revenue FROM fact_sales f JOIN dim_date d ON d.date_key = f.date_key GROUP BY d.is_weekend"
      hint: { vi: "Fact nối với dimension qua khóa của dimension có trong fact.", en: "The fact joins a dimension through that dimension's key stored in the fact." }
    - id: g-c2-2
      kind: open
      task: { vi: "Doanh thu năm 2026 theo thành phố của cửa hàng và danh mục sản phẩm.", en: "2026 revenue by store city and product category." }
      solution: "SELECT s.city, p.category, sum(f.revenue_vnd) AS revenue FROM fact_sales f JOIN stores s ON s.id = f.store_id JOIN dim_product p ON p.product_key = f.product_key JOIN dim_date d ON d.date_key = f.date_key WHERE d.year = 2026 GROUP BY s.city, p.category"
      hint: { vi: "Ba bảng quanh fact: cửa hàng, sản phẩm, ngày; gom theo hai cột mô tả.", en: "Three tables around the fact: store, product, date; group by the two describing columns." }
    - id: g-c2-3
      kind: trap
      task: { vi: "Số đơn đã bán mỗi tháng trong quý 3/2026, chỉ dùng `fact_sales` và `dim_date`.", en: "The number of orders sold each month in Q3 2026, using only `fact_sales` and `dim_date`." }
      solution: "SELECT d.month, count(DISTINCT f.order_id) AS orders FROM fact_sales f JOIN dim_date d ON d.date_key = f.date_key WHERE d.year = 2026 AND d.month BETWEEN 7 AND 9 GROUP BY d.month"
      hint: { vi: "Grain của fact là dòng hàng; một đơn có nhiều dòng.", en: "The fact grain is the item line; one order has several lines." }
      wrong:
        - sql: "SELECT d.month, count(*) AS orders FROM fact_sales f JOIN dim_date d ON d.date_key = f.date_key WHERE d.year = 2026 AND d.month BETWEEN 7 AND 9 GROUP BY d.month"
          vi: "`count(*)` đếm dòng hàng (grain của fact), không đếm đơn: tháng 7 ra 345 thay vì 115."
          en: "`count(*)` counts item lines (the fact grain), not orders: July gives 345 instead of 115."
    - id: g-c2-4
      kind: challenge
      task: { vi: "Từ 01/01 tới 31/10/2026: doanh thu trung bình mỗi ngày lịch của ngày thường và ngày cuối tuần, tính cả ngày không bán được gì (doanh thu 0), làm tròn tới đồng.", en: "From 2026-01-01 to 2026-10-31: the average revenue per calendar day for weekdays and weekend days, counting days with no sales as 0, rounded to the dong." }
      solution: "SELECT d.is_weekend, round(sum(coalesce(f.revenue_vnd, 0))::numeric / count(DISTINCT d.date_key)) AS avg_per_day FROM dim_date d LEFT JOIN fact_sales f ON f.date_key = d.date_key WHERE d.date_key BETWEEN '2026-01-01' AND '2026-10-31' GROUP BY d.is_weekend"
      hint: { vi: "Bắt đầu từ `dim_date` và nối trái tới fact, để ngày không bán vẫn còn.", en: "Start from `dim_date` and left join the fact, so days without sales stay." }
  links:
    - { title: { vi: "Kimball Group: Kỹ thuật mô hình hóa chiều (dimensional modeling)", en: "Kimball Group: Dimensional modeling techniques" }, url: "https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/" }

- id: c3
  group: C
  status: in
  title: { vi: "SCD loại 2 (lịch sử thuộc tính)", en: "SCD type 2 (attribute history)" }
  why: { vi: "Báo cáo phải dùng thuộc tính đúng tại lúc giao dịch, ví dụ thành phố của khách khi họ mua, không phải thành phố hôm nay.", en: "Reports must use attributes as they were at transaction time, for example the customer's city when they bought, not today's city." }
  needs: [join, null_logic, date_math, c2]
  applies: { vi: "Mọi domain: báo cáo theo vùng, theo hạng khách qua thời gian", en: "Every domain: reports by region or customer tier over time" }
  lesson:
    concept:
      vi: "SCD loại 2 (slowly changing dimension) giữ mỗi phiên bản thuộc tính một dòng, có `valid_from` và `valid_to`. Ở đây `valid_to` là ngày đầu tiên phiên bản hết hiệu lực (không tính), trống nghĩa là phiên bản hiện tại. Muốn giá trị tại ngày X: `valid_from <= X` và (`valid_to` trống hoặc `valid_to > X`)."
      en: "SCD type 2 (slowly changing dimension) keeps one row per version of an attribute, with `valid_from` and `valid_to`. Here `valid_to` is the first day the version no longer applies (exclusive), blank means the current version. For the value on date X: `valid_from <= X` and (`valid_to` is blank or `valid_to > X`)."
    example: "SELECT dc.city, sum(f.revenue_vnd) AS revenue FROM fact_sales f JOIN dim_customer dc ON dc.customer_key = f.customer_key GROUP BY dc.city ORDER BY revenue DESC"
    explain:
      vi: "① Fact đã lưu `customer_key` của đúng phiên bản lúc bán, nên chỉ cần nối khóa. ② 42 khách đã chuyển thành phố có hai dòng trong `dim_customer`. ③ Kết quả: 6 dòng (gồm thành phố trống của khách không khai); Ho Chi Minh City 157.954.100 đồng, Da Nang 137.323.200 đồng. Doanh thu bán lẻ không qua thẻ thành viên (khóa khách trống) không nằm trong phép nối này."
      en: "① The fact already stores the `customer_key` of the version valid at sale time, so a key join is enough. ② 42 customers who moved city have two rows in `dim_customer`. ③ Result: 6 rows (including a blank city for customers who gave none); Ho Chi Minh City 157,954,100 VND, Da Nang 137,323,200 VND. Walk-in sales (blank customer key) drop out of this join."
    mistake:
      sql: "SELECT dc.city, sum(f.revenue_vnd) AS revenue FROM fact_sales f JOIN dim_customer k ON k.customer_key = f.customer_key JOIN dim_customer dc ON dc.customer_id = k.customer_id GROUP BY dc.city ORDER BY revenue DESC"
      vi: "Nối `dim_customer` theo mã khách mà không theo khoảng hiệu lực: khách đã chuyển có hai dòng, nên mỗi lần mua bị cộng hai lần, một lần cho mỗi thành phố."
      en: "Joining `dim_customer` on customer id without the validity range: a customer who moved has two rows, so each purchase is added twice, once per city."
    try:
      task: { vi: "Cùng doanh thu đó nhưng theo thành phố hiện tại của khách (phiên bản `is_current`), để thấy khác biệt.", en: "The same revenue but by the customer's current city (the `is_current` version), to see the difference." }
      starter: "SELECT dc.city, sum(f.revenue_vnd) AS revenue FROM fact_sales f JOIN dim_customer dc ON dc.customer_key = f.customer_key GROUP BY dc.city ORDER BY revenue DESC"
      solution: "SELECT cur.city, sum(f.revenue_vnd) AS revenue FROM fact_sales f JOIN dim_customer dc ON dc.customer_key = f.customer_key JOIN dim_customer cur ON cur.customer_id = dc.customer_id AND cur.is_current GROUP BY cur.city"
    docs: https://www.postgresql.org/docs/current/queries-table-expressions.html
  drills:
    - id: g-c3-1
      kind: faded
      task: { vi: "Vào ngày 01/01/2026, mỗi thành phố có bao nhiêu khách (theo phiên bản còn hiệu lực ngày đó)? Thành phố và số khách.", en: "On 2026-01-01, how many customers did each city have (by the version valid that day)? City and number of customers." }
      starter: "SELECT city, count(*) AS customers FROM dim_customer WHERE valid_from <= '2026-01-01' AND (valid_to IS NULL OR valid_to > ___) GROUP BY city"
      solution: "SELECT city, count(*) AS customers FROM dim_customer WHERE valid_from <= '2026-01-01' AND (valid_to IS NULL OR valid_to > '2026-01-01') GROUP BY city"
      hint: { vi: "Phiên bản còn hiệu lực khi ngày hết hiệu lực nằm sau ngày đang xét.", en: "A version is valid when its end date falls after the date in question." }
    - id: g-c3-2
      kind: open
      task: { vi: "Liệt kê khách đã chuyển thành phố: mã khách, thành phố cũ, thành phố mới và ngày chuyển (ngày phiên bản mới bắt đầu).", en: "List the customers who moved city: customer id, old city, new city and the move date (the day the new version starts)." }
      solution: "SELECT o.customer_id, o.city AS old_city, n.city AS new_city, n.valid_from AS moved_on FROM dim_customer o JOIN dim_customer n ON n.customer_id = o.customer_id AND n.valid_from = o.valid_to"
      hint: { vi: "Nối `dim_customer` với chính nó: phiên bản mới bắt đầu đúng ngày phiên bản cũ hết hiệu lực.", en: "Join `dim_customer` to itself: the new version starts exactly when the old one ends." }
    - id: g-c3-3
      kind: trap
      task: { vi: "Năm 2025, mỗi thành phố có bao nhiêu đơn đã thanh toán, theo thành phố của khách tại ngày đặt đơn? Chỉ dùng `orders` và `dim_customer`.", en: "In 2025, how many paid orders did each city have, by the customer's city on the order date? Use only `orders` and `dim_customer`." }
      solution: "SELECT dc.city, count(*) AS orders FROM orders o JOIN dim_customer dc ON dc.customer_id = o.customer_id AND o.order_date >= dc.valid_from AND (dc.valid_to IS NULL OR o.order_date < dc.valid_to) WHERE o.status = 'PAID' AND o.order_date < '2026-01-01' GROUP BY dc.city"
      hint: { vi: "Điều kiện nối gồm mã khách và ngày đặt đơn nằm trong khoảng hiệu lực.", en: "The join condition has the customer id and the order date inside the validity range." }
      wrong:
        - sql: "SELECT dc.city, count(*) AS orders FROM orders o JOIN dim_customer dc ON dc.customer_id = o.customer_id AND dc.is_current WHERE o.status = 'PAID' AND o.order_date < '2026-01-01' GROUP BY dc.city"
          vi: "`is_current` cho thành phố hôm nay: đơn năm 2025 của khách đã chuyển bị tính cho thành phố mới."
          en: "`is_current` gives today's city: the 2025 orders of customers who moved are counted for their new city."
    - id: g-c3-4
      kind: challenge
      task: { vi: "Mỗi thành phố (bỏ thành phố trống): doanh thu theo thành phố lúc bán và doanh thu theo thành phố hiện tại, cạnh nhau trong một dòng. Thành phố chỉ có ở một bên thì bên kia để trống.", en: "For each city (skip blank cities): revenue by city at sale time and revenue by current city, side by side in one row. A city that appears on only one side leaves the other side empty." }
      solution: "WITH at_sale AS (SELECT dc.city, sum(f.revenue_vnd) AS revenue FROM fact_sales f JOIN dim_customer dc ON dc.customer_key = f.customer_key WHERE dc.city IS NOT NULL GROUP BY dc.city), now_city AS (SELECT cur.city, sum(f.revenue_vnd) AS revenue FROM fact_sales f JOIN dim_customer dc ON dc.customer_key = f.customer_key JOIN dim_customer cur ON cur.customer_id = dc.customer_id AND cur.is_current WHERE cur.city IS NOT NULL GROUP BY cur.city) SELECT city, a.revenue AS at_sale, n.revenue AS current_city FROM at_sale a FULL JOIN now_city n USING (city)"
      hint: { vi: "Hai CTE gom theo thành phố, rồi FULL JOIN theo tên thành phố.", en: "Two CTEs grouped by city, then a FULL JOIN on the city name." }

- id: d1
  group: D
  status: external
  title: { vi: "Bảng tính (Excel, Google Sheets: pivot, XLOOKUP)", en: "Spreadsheets (Excel, Google Sheets: pivots, XLOOKUP)" }
  why: { vi: "Sếp và các phòng ban làm việc trên bảng tính; DA phải đọc và giao kết quả ở đó.", en: "Managers and other teams work in spreadsheets; an analyst has to read and deliver results there." }
  needs: [group_by]
  links:
    - { title: { vi: "Microsoft: Trợ giúp Excel", en: "Microsoft: Excel help and learning" }, url: "https://support.microsoft.com/en-us/excel" }

- id: d2
  group: D
  status: external
  title: { vi: "Công cụ BI (Power BI, Tableau, Looker Studio)", en: "BI tools (Power BI, Tableau, Looker Studio)" }
  why: { vi: "Phần lớn tin tuyển DA đòi ít nhất một công cụ BI để dựng dashboard.", en: "Most analyst job posts ask for at least one BI tool to build dashboards." }
  needs: [b1]
  links:
    - { title: { vi: "Microsoft Learn: Power BI", en: "Microsoft Learn: Power BI" }, url: "https://learn.microsoft.com/en-us/training/powerplatform/power-bi" }
    - { title: { vi: "Looker Studio (miễn phí)", en: "Looker Studio (free)" }, url: "https://lookerstudio.google.com/" }

- id: d3
  group: D
  status: external
  title: { vi: "Trực quan hóa và kể chuyện bằng dữ liệu", en: "Visualisation and data storytelling" }
  why: { vi: "Con số đúng mà trình bày sai thì không ai dùng; trong nền tảng, chọn loại biểu đồ khi ghim card ở Bảng điều hành.", en: "A right number shown the wrong way gets ignored; in the platform, pick the chart type when you pin a card on the dashboard." }
  needs: [b1]
  links:
    - { title: { vi: "Storytelling with Data (sách)", en: "Storytelling with Data (books)" }, url: "https://www.storytellingwithdata.com/books" }

- id: d4
  group: D
  status: external
  title: { vi: "Thống kê suy luận (kiểm định, hồi quy)", en: "Inferential statistics (tests, regression)" }
  why: { vi: "Đi tiếp sau A/B test và thống kê mô tả: khi nào một chênh lệch là thật.", en: "The next step after A/B tests and descriptive statistics: when a difference is real." }
  needs: [b5, b7]
  links:
    - { title: { vi: "Khan Academy: Thống kê và xác suất", en: "Khan Academy: Statistics and probability" }, url: "https://www.khanacademy.org/math/statistics-probability" }

- id: d5
  group: D
  status: external
  title: { vi: "Python và pandas", en: "Python and pandas" }
  why: { vi: "Phân tích ngoài SQL và tự động hóa báo cáo lặp lại.", en: "Analysis beyond SQL and automating repeated reports." }
  needs: [group_by, join]
  links:
    - { title: { vi: "Kaggle Learn: Pandas", en: "Kaggle Learn: Pandas" }, url: "https://www.kaggle.com/learn/pandas" }

- id: d6
  group: D
  status: external
  title: { vi: "Mô hình hóa dữ liệu nâng cao (Kimball)", en: "Advanced data modeling (Kimball)" }
  why: { vi: "Đi tiếp sau star schema: thiết kế fact, dimension và grain cho kho dữ liệu.", en: "The next step after star schemas: designing facts, dimensions and grain for a warehouse." }
  needs: [c2, c3]
  links:
    - { title: { vi: "Kimball Group: Kỹ thuật mô hình hóa chiều", en: "Kimball Group: Dimensional modeling techniques" }, url: "https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/" }

- id: d7
  group: D
  status: external
  title: { vi: "Giao tiếp và lấy yêu cầu", en: "Communication and gathering requirements" }
  why: { vi: "Biến một câu hỏi mơ hồ thành một truy vấn đúng; thư của đồng nghiệp trong các domain là nơi luyện kỹ năng này.", en: "Turning a vague question into the right query; the colleagues' messages in the domains are where you practise it." }
  needs: [select]
  links:
    - { title: { vi: "roadmap.sh: Lộ trình Data Analyst", en: "roadmap.sh: Data Analyst roadmap" }, url: "https://roadmap.sh/data-analyst" }

- id: d8
  group: D
  status: external
  title: { vi: "Machine learning và big data (tùy chọn)", en: "Machine learning and big data (optional)" }
  why: { vi: "Không bắt buộc với DA, nhưng hữu ích khi dữ liệu lớn hoặc cần dự báo; roadmap.sh cũng ghi là tùy chọn.", en: "Not required for an analyst, but useful for big data or forecasting; roadmap.sh also marks it optional." }
  needs: [d4, d5]
  links:
    - { title: { vi: "roadmap.sh: Lộ trình Data Analyst (nhóm ML, Big Data)", en: "roadmap.sh: Data Analyst roadmap (ML, Big Data groups)" }, url: "https://roadmap.sh/data-analyst" }
````
