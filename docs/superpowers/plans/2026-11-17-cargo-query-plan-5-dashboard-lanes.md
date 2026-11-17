# Cargo Query — Plan 5: Bảng điều hành tự dựng (P1 + P2) và bài tuyến đợt 1 (Rotterdam, Singapore, Sydney)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Làm phần đã duyệt ở L48 (`docs/team/product-design-v3.md` phần C) và L49 (mockup v6 `.superpowers/brainstorm/11840-1794844744/content/dashboard-lanes-v6.html`):
- **Bảng điều hành P1:** route `#/dashboard`, mục nav "Bảng điều hành" (nav 6 mục, mobile lưới 3×2); lưới ô KPI rời Trang chủ, Trang chủ còn một dòng giới thiệu dẫn tới đó.
- **Bảng điều hành P2:** Save v3 với card của người chơi; nút "Ghim lên" trên tab Kết quả và hộp thoại ghim; card chạy lười, lần lượt, mỗi phiên một lần; Lên/Xuống, Xem SQL, Chạy lại, Bỏ ghim; ô KPI công ty chỉ ẩn được.
- **Bài tuyến đợt 1:** seed phương án B (`lane_profiles`, `bunker_prices`); hồ sơ tuyến và 9 bài tuyến (R-1..R-3, SG-1..SG-3, S-1..S-3) chấm bằng grader sẵn có, 50 XP cố định, không tính vào tiến độ chương; hộp thoại bản đồ có danh sách tuyến và hồ sơ tuyến; thanh việc có chế độ bài tuyến.

**Architecture:**
- Seed: 2 bảng viết tay cuối `schema.sql`/`seed.sql`, không `random()`. 24 bảng cũ giữ nguyên từng byte: `tests/seed.test.ts` ghim md5, nay gồm cả 3 bảng Plan 4.
- Bảng điều hành:
  - `src/dashboard.ts` thuần (kiểu `Card`, đọc/kiểm Save, luật ghim, `cardRunner`).
  - `src/ui/dashboard.ts` là trang `#/dashboard`; khối ô KPI dời từ `homeView.ts` sang đây.
  - `src/ui/pin.ts` là thanh ghim trên tab Kết quả và hộp thoại ghim.
  - `QueryResult.ms` đo trong `runSandboxed`.
- Ngân sách main: từ điển EN thành chunk lazy (T3).
- Bài tuyến:
  - `content/lanes/lanes.yml` (hồ sơ) và `content/lanes/<cảng>/*.md` (bài tuyến, định dạng ticket + `lane:`), là chunk lazy riêng `src/laneSources.ts`.
  - `src/lanes.ts`: luật mở, `LANE_TABLES`, `laneProblems`.
  - Chế độ phiên `lane` (`src/session.ts`, `ui/modes.ts`).
  - `ui/lanePanel.ts` và `ui/mapStrip.ts`: hộp thoại bản đồ và thanh việc.
- Save v3 (`SAVE_VERSION` 2 → 3).

**Tech Stack:** như HEAD. **Không thêm dependency.**

**Spec / nguồn quyết định:**
- `docs/team/product-design-v3.md` (Phần A §1–§11, Phần B §12–§21, Phần C).
- Mockup v6 (5 màn A–E và bảng path icon "NEW" trong `<script>`).
- `docs/team/decision-log.md` L40, L41, L43, L45, L46, L47 (mục 7–8), L48, L49 (dòng mới thắng).
- `docs/team/amendments.md` D1–D6.
- Plan mẫu: `docs/superpowers/plans/2026-11-17-cargo-query-plan-4-ch10-12.md`.
- Quyết định mới: T1–T13 (dưới).

**Tiền đề:** Plan 1–4, Import, Deploy (phần local) và các bản sửa L47 đã xong. Plan viết và replay trên HEAD `61de3a9` (tsc sạch, 1421 test xanh).

## Đã có trên HEAD (không làm lại)

| Hạng mục | Trạng thái HEAD |
|---|---|
| Nav 5 mục (Trang chủ, Làm việc, Luyện tập, Sandbox, Dữ liệu); `#nav` đã là `grid-cols-3` dưới `md` | Có. Plan này thêm mục thứ 6 (order 60, chỗ `dataView.ts` để dành) nên lưới thành 3×2. |
| Ô KPI (`content/kpis.yml`, `kpiTiles`/`kpiValue`/`kpiNumber` trong `src/home.ts`) | Có. Chỉ dời phần vẽ (`kpiTile`, `kpiView`, `kpiResult`) sang `ui/dashboard.ts`; logic giữ nguyên. |
| Biểu đồ (`chartSpec`, `bars`, `line` trong `ui/chartView.ts`) | Có. Card cột và đường dùng lại, chỉ thêm `export`. |
| Hộp thoại bản đồ tại chỗ (`#map-dialog`, `ui/mapStrip.ts`, L47 mục 3) | Có. Plan này thay nội dung: danh sách tuyến + hồ sơ tuyến. |
| `ROUTES` 7 tuyến từ Tiên Sa, `derive().open/passed` | Có. Thêm `days` (= `ports.base_transit_days`, có test). |
| Xuất/Nhập tiến độ (menu `⋯`) | Có. Card và bài tuyến nằm trong Save nên đi theo, không cần sửa. |

## Quyết định sản phẩm của plan này (T1–T13, để orchestrator ghi L-số)

**Chỗ lệch so với yêu cầu, cần orchestrator/user xem trước:**
- T4: card không có trường `order` và `label`.
- T3: từ điển EN thành chunk lazy và `setLang` thành async. Không ai yêu cầu việc này; plan làm để main ≤ 270 KB.
- T10: S-3 là đồ gỗ thay lúa mì; SG-1..SG-3 do plan viết mới.

| # | Quyết định | Lý do |
|---|---|---|
| T1 | **Seed phương án B, viết tay, không `random()`.**<br>• `lane_profiles(pol, pod, distance_nm, via_port, sea_days, fuel_t_per_day, vessel_teu)`, PK (`pol`, `pod`): 39 tuyến = 13 cảng biển ngoài × 3 cảng VN.<br>• Sinh từ 13 dòng giá trị của Tiên Sa: cảng phía nam gần Cát Lái (`VNSGN`) hơn 330 hải lý / 1 ngày, cảng phía bắc thì ngược lại; Hải Phòng ngược với Cát Lái.<br>• Châu Âu, Nhava Sheva, New York đổi tàu ở `SGSIN`; Los Angeles ở `KRPUS`; Hải Phòng–Sydney ghé `SGSIN`.<br>• `bunker_prices(month, usd_per_tonne)`: 22 tháng 01/2025..10/2026, đỉnh 08/2026 (622 USD/t).<br>• Khối nạp 4,3 ms. md5 của 24 bảng cũ (nay ghim cả 3 bảng Plan 4) và 2 bảng mới được ghim. | D-B2 = B. Số liệu ra cỡ thật: Tiên Sa–Sydney quý 3 là 107,5–110,9 USD/TEU (design: 80–150). Không cần `setseed()`. |
| T2 | **Cảng gốc là Tiên Sa (`VNDAD`) trong mọi nội dung tuyến.**<br>• R-3 dùng giá `VNDAD → NLRTM` (20GP 1.391 → 1.980, +589).<br>• S-2 dùng hồ sơ `VNDAD/AUSYD`; một hồ sơ dùng cho cả hai chiều.<br>• `tests/lanes.test.ts` cấm chữ "Cát Lái/Cat Lai" trong `content/lanes/`. | L49. Bảng `ports` vẫn giữ tên "Ho Chi Minh (Cat Lai)" của `VNSGN` vì md5. |
| T3 | **Từ điển EN thành chunk lazy.**<br>• `loadLang()` chạy song song `loadContent()`; `setLang()` async; `t()` đọc VI tới khi EN về.<br>• Nhóm ngân sách mới `en` 20 KB và `lanes` 20 KB (luật L40). **Cần user xem.** | Đo trên build:<br>• HEAD main 265/270.<br>• Tách trang Bảng điều hành + Dữ liệu thành chunk lazy chỉ bớt ~1 KB trên 4,4 KB code, vì Rolldown đưa module dùng chung (dom, icons, erdView) vào chunk preload riêng.<br>• EN lazy: main 259 trước code Plan 5, 265/270 sau.<br>Đảo ngược: bỏ EN lazy, nâng main lên 280 KB. |
| T4 | **Save v3.**<br>• Trường mới `dashboard: { cards, hidden }` và `lanes: string[]`.<br>• `Card = { id, title ≤ 80, sql ≤ 4000, kind: table/number/bar/line, col?, slow?, source }`.<br>• **Không `order`**: vị trí trong mảng là thứ tự.<br>• **Không `label`**: cột nhãn của card cột/đường luôn là cột 0, như `chartSpec`.<br>• `Known.ticketIds` gồm cả id bài tuyến.<br>• Fixture v1/v2 giữ mãi; thêm v3. | Không thể có hai card cùng chỗ hay một cột nhãn sai. Nâng version: build cũ đẩy save v3 vào `.bak` thay vì xóa card (có test). Nháp, SQL đã chấm và gợi ý của bài tuyến không bị bỏ khi đọc lại. |
| T5 | **Luật ghim.**<br>• Nút "Ghim lên" trên bảng của tab Kết quả; có ở Sandbox, việc chính đã xong, bài tuyến đã xong; ghim `app.lastRun`.<br>• Tắt kèm lý do: editor khác lastRun ("Chạy lại trước khi ghim"), hoặc đủ 24 card.<br>• Hộp thoại giải thích và tắt Ghim: > 2 s (`QueryResult.ms` đo trong worker, không tính hàng đợi), hoặc SQL > 4.000 ký tự; nút Ghim kiểm lại lúc bấm.<br>• Dạng mặc định: đường > cột > số (khi 1 dòng) > bảng. Dạng khóa vẫn hiện, mờ, kèm "mở khi học … (ch. n)".<br>• Tiêu đề mặc định = tên việc (Sandbox để trống, bắt buộc nhập). | Ngay sau khi nộp đúng, lastRun chính là SQL đã qua grader; không lộ đáp án vì việc đã xong. D-A3, D-A4. |
| T6 | **`cardRunner`.**<br>• Mỗi card chạy một lần mỗi phiên, card sau chờ card trước; khóa cache là id + SQL (nhập save khác có `c1` khác vẫn chạy lại).<br>• Hết giờ: chỉ card đó `slow` (lưu ngay), hiện "Chậm · không tự chạy nữa" + "Chạy thử lại".<br>• `DbRestartError`: quên kết quả, chạy lại ở lần vẽ sau.<br>• Kết quả không lưu. | product-design-v3 §7. Mỗi card hỏng gây tối đa một lần seed lại (10–11 s, L46). |
| T7 | **Bố cục bảng điều hành.**<br>• Card của người chơi trước, số liệu công ty sau; lưới 1/2/3 cột.<br>• Nút card là icon có `aria-label`, vùng chạm 40 px.<br>• Lên/Xuống giữ focus trên card vừa dời và đọc vị trí mới.<br>• Ô công ty có Ẩn, cùng "Ô đã ẩn (n)" để Hiện lại.<br>• Trang chủ còn một dòng dẫn tới trang.<br>• Dạng đường có ngay (mở ở ch4). | L49, mockup màn A/E1. Kéo thả, đổi cỡ, sửa SQL card, PNG/CSV là P3/P4 (D-A6). Dạng đường dùng lại `line()` nguyên, và S-3 có kết quả hình đường. |
| T8 | **Bài tuyến là file ticket riêng, không vào `app.tickets`.**<br>• Ở `content/lanes/<cảng>/*.md`, thêm `lane:`. `chapter` = chương mà đánh giá thăng tiến của nó mở bài, cộng điều kiện tuyến đã mở.<br>• `beat: rest`, `grants: []`, không `variants`/`reflect`/`wrong` ở đợt 1.<br>• Tải qua chunk lazy `laneSources` (`loadLanes()`).<br>• Chế độ phiên `lane`: +50 XP cố định, gợi ý miễn phí, lưu ở `save.lanes`, không hoạt cảnh; nháp, SQL đã chấm và lịch sử giữ như việc chính (`keepsWork()`).<br>• `laneProblems` kiểm luật mở. | D-B1, D-B5. Không thể vô tình vào `nextTicket`, chương, thang nghề, KPI, bến cảng hay bộ Luyện tập (có test). L32: tàu có thể mở tuyến sớm, nên phải gate theo kỹ năng. |
| T9 | **Hồ sơ tuyến dạng YAML có `after:`.**<br>• Mục có `after: N` chỉ hiện khi đã qua đánh giá chương N.<br>• Rotterdam: "+40%" và dòng GRI là `after: 7`; câu "hay được hỏi" bỏ phần giá.<br>• R-3 hiện tiêu đề kèm "Mở sau chương 7".<br>• Tuyến chưa có nội dung: "đợt sau". Tuyến khóa: xem trước 2 dòng.<br>• `ROUTES.days` = `ports.base_transit_days` (có test). | L49 (không lộ ch12), D-B6, design §13. |
| T10 | **Nội dung bài tuyến.**<br>• S-3 = đồ gỗ đi Sydney theo tháng (chủ đề ISPM 15, kết quả hình đường).<br>• SG-1 10 lô nặng nhất (ch1), SG-2 tuyến đổi tàu ở Singapore (ch3), SG-3 số ngày đi biển thực tế theo cảng xếp hàng (ch4).<br>• Bỏ cát.<br>• Người gửi: R-1/R-2 Đặng Hà, R-3 Lê Bình, SG-1 Bùi Long, SG-2 Hoàng Khánh, SG-3 Võ Thu, S-1 Võ Lan, S-2 Hoàng Thảo, S-3 Hoàng Dũng. **Cần user xem.** | Lúa mì cần phương án C (không duyệt). Design chỉ phác Singapore. Cát nhạy cảm và không có dữ liệu (D-B3). R-2 là Đặng Hà theo L49. |
| T11 | **Bản đồ và bảng tuyến.**<br>• Chấm cảng là nút (Enter/Space) có tooltip `<title>` một dòng, không số lô; danh sách tuyến HTML luôn có.<br>• Hồ sơ là khung phải từ `lg`; dưới `lg` thay danh sách, có "‹ Tất cả tuyến".<br>• `LANE_TABLES`: `SGSIN` → `lane_profiles`; `AUSYD` → `lane_profiles`, `bunker_prices`. Hiện ở tab Cột, ER, autocomplete, trang Dữ liệu ("mở theo bài tuyến") khi tuyến mở. | D-B4, D-B6, mockup C/E2/E3. Bản đồ ở Trang chủ chỉ để xem. |
| T12 | **Dời lại:**<br>• Nhóm "Việc tuyến" trong Hộp thư, "Việc tuyến x/y" ở Trang chủ, thẻ "Số của bạn".<br>• Hoạt cảnh tàu ghé cảng.<br>• Bốn tuyến còn lại (D-B8).<br>• P3/P4 của bảng điều hành. | Không chặn gì. |
| T13 | **Thời gian seed.**<br>• Đo xen kẽ, lần đầu mỗi tiến trình: HEAD 2.018/1.935 ms, Plan 5 2.196/1.887 ms (nhiễu); khối Plan 5 chỉ 4,3 ms.<br>• Luật S2 (2,0 s) giữ nguyên. | L46 đã ghi seed Node sát ngưỡng từ trước Plan 5. |

## Tên dùng từ HEAD (Task 0 kiểm bằng grep)

| File | Tên dùng trong plan này |
|---|---|
| `src/save.ts` | `SAVE_VERSION = 2`, `MIGRATIONS` (dòng `1:`), `readV2` |
| `src/route.ts` | `ROUTES`, `HASH` |
| `src/ui/topbar.ts` | `registerNav({ id: 'play'` |
| `src/ui/homeView.ts` | `kpiResult`, `kpiTile`, `kpiSection` |
| `src/ui/tabs.ts` | `registerCoreTabs(editorSql` |
| `src/ui/mapStrip.ts` | `createMapStrip`, `fill(` |
| `src/session.ts` | `type Mode`, `isClosed` |
| `src/ui/work.ts` | `isStory()` (4 chỗ) |
| `src/i18n/index.ts` | `DICT`, `setLang` |
| `scripts/check-budget.mjs` | `GROUPS` (dòng `tickets`) |
| `tests/seed.test.ts` | `PLAN4`, `hashOf`, `one` |

**Cách đọc các bước sửa code** (như Plan 2–4):
- **Tạo `path`:** ghi cả file.
- **Sửa `path`** — thay: khối thứ nhất phải xuất hiện **đúng một lần**; thay bằng khối sau "bằng:".
- **Thêm vào cuối `path`:** nối khối vào cuối file (dòng trống đầu khối là cố ý).
- Khối "thay" không khớp (HEAD đã đổi): áp ý của bước vào code trên đĩa (L7) và ghi chỗ lệch vào mô tả commit.

## Global Constraints

- Mọi ràng buộc của các plan trước vẫn áp dụng:
  - PGlite **0.5.16** pin; không `innerHTML`.
  - Mọi chữ UI qua `t()`; khóa mới thêm vào **cả** `vi.ts` và `en.ts` trong cùng task.
  - Không dùng chữ "boss" trên UI hay trong nội dung (L22).
  - Mọi bước "xác nhận PASS" chạy thêm `npx tsc --noEmit`.
- **Seed:** chỉ thêm vào **cuối** `schema.sql` và `seed.sql`. Không `ALTER` bảng cũ. md5 24 bảng cũ phải giữ nguyên. Sau mỗi task chạy lại **mọi** Solution (`npm test`).
- **Save:** đọc save là ranh giới tin cậy. Card hỏng bị bỏ, không làm hỏng cả save. Không xóa migration hay fixture cũ.
- **Bài tuyến:**
  - Không bao giờ vào `loadTickets()`, `completed`, `nextTicket`, chương, thang nghề, KPI, bến cảng hay bộ Luyện tập.
  - Ticket chính không bao giờ dùng bảng tuyến.
  - Nội dung nói "Tiên Sa", không "Cát Lái" (L49).
- **Đề bài** (problem-design §1; `tests/lanes.test.ts` kiểm như `content.test.ts`):
  - Thân đề và `## Task` không có tên bảng/cột, từ khóa SQL, mã trạng thái, backtick.
  - Code span VI = EN; EN không dấu tiếng Việt và không tên người.
  - Ngày cố định; bài `ordered` nêu đủ quy tắc phá hòa; tiền và số lẻ nói rõ có làm tròn hay không.
- **Ngân sách:** main ≤ 270 KB gzip, chạy `node scripts/check-budget.mjs` sau mỗi task có sửa `src/`.
- `src/ui/*`, `src/main.ts`: logic thuần đã tách ra `src/dashboard.ts`, `src/lanes.ts` có test; phần DOM kiểm tay theo checklist Task 8 trên **Edge, cổng 5174** (không bao giờ `:5173`).
- Mỗi task một commit (bước cuối của task). Chỉ `git add` đúng các file của task. Mọi commit message kết thúc bằng dòng `Claude-Session: https://claude.ai/code/session_01PwPSBV1SVDP6quEZfKN56M`.

## File Structure

```
src/db/schema.sql, seed.sql         + lane_profiles, bunker_prices (khối Plan 5 cuối file, viết tay)              (thêm cuối)
src/ui/icons.ts                     + 18 icon mockup v6, ICON_NAMES                                           (sửa)
src/dashboard.ts                    Card, readDashboard, valueCols, pinBlock, moveCard, nextCardId, cardRunner (tạo)
src/save.ts                         Save v3: dashboard, lanes; MIGRATIONS[2]                                  (sửa)
src/viz/chart.ts, ui/chartView.ts   export NUMERIC, bars, line                                                (sửa)
src/route.ts, ui/topbar.ts, index.html, main.ts   route + nav + <main id="dashboard">                         (sửa)
src/ui/dashboard.ts                 trang #/dashboard: card của bạn, số liệu công ty (dời từ homeView)        (tạo)
src/ui/homeView.ts                  dòng giới thiệu thay lưới KPI                                             (sửa)
src/i18n/index.ts, main.ts, tests/setup.ts   EN lazy (loadLang)                                               (sửa)
src/db/run.ts                       QueryResult.ms                                                             (sửa)
src/ui/pin.ts                       nút Ghim lên + hộp thoại                                                  (tạo)
src/ui/tabs.ts                      thanh trên bảng kết quả                                                   (sửa)
src/lanes.ts, src/laneSources.ts    hồ sơ tuyến, luật mở, LANE_TABLES, laneProblems; chunk lazy               (tạo)
src/content.ts, tickets.ts, scene.ts, session.ts, state.ts   loadLanes, lane:, ROUTES.days, mode 'lane', bảng tuyến (sửa)
src/ui/lanePanel.ts                 hồ sơ tuyến, danh sách bài tuyến, ghi chú trong bài                       (tạo)
src/ui/mapStrip.ts, modes.ts, brief.ts, work.ts, dataView.ts   hộp thoại bản đồ, chế độ bài tuyến             (sửa)
content/lanes/lanes.yml, content/lanes/{nlrtm,sgsin,ausyd}/*.md   3 hồ sơ, 9 bài tuyến VI + EN               (tạo)
tests/seed, icons, save, saveV2, saveV3, dashboard, route, startup, scene, lanes (.test.ts), fixtures/save-v3.json
scripts/check-budget.mjs, CLAUDE.md
```

## Số dòng kết quả mong đợi của bài tuyến (đã chạy trên PGlite)

| Bài | Tuyến · mở sau | Kỹ năng | Dòng | Kết quả chính |
|---|---|---|---|---|
| R-1 | Rotterdam · ch2 | aggregate, group_by, order_by | 6 | FOB 146 · FCA 94 · DAP 93 · CIF 92 · CFR 87 · EXW 85 |
| R-2 | Rotterdam · ch3 | join, …, limit | 3 | Textile 218 · Seafood 81 · Furniture 69 (hạng 4 là 48, không hòa) |
| R-3 | Rotterdam · ch7 | conditional_agg | 4 | 20GP +589 · 40GP +709 · 40HC +924 · 40RF +1.909 (VNDAD) |
| SG-1 | Singapore · ch1 | where, order_by, limit | 10 | dòng 10 = 47.728,82 kg, dòng 11 = 47.475,62 (không hòa) |
| SG-2 | Singapore · ch3 | join (bảng tuyến) | 5 | New York 34,6 · Hamburg 31,4 · Antwerp 30,7 · Rotterdam 30,2 · Nhava Sheva 13,6 |
| SG-3 | Singapore · ch4 | date_math | 3 | VNDAD 54 lô 4,26 ngày · VNHPH 68 / 4,24 · VNSGN 130 / 4,95 |
| S-1 | Sydney · ch5 | conditional_agg, date_math, join | 6 | Pacific Bridge 7 lô trễ đầu; 3 hãng hòa ở 3 lô trễ, phá hòa theo tên |
| S-2 | Sydney · ch5 | join (bảng tuyến) | 3 | 107,51 · 110,89 · 110,18 USD/TEU (07–09/2026) |
| S-3 | Sydney · ch5 | date_bucket, join | 10 | 5 · 4 · 2 · 3 · 7 · 4 · 3 · 3 · 2 · 2 lô (01–10/2026) |

---

### Task 0: Kiểm tiền đề (không sửa file)

- [ ] **Step 1: Test và kiểu đang sạch**

Run: `npm test && npx tsc --noEmit`
Expected: mọi test PASS (1421 trên `61de3a9`), `tsc` không lỗi.

- [ ] **Step 2: Grep các điểm neo**

Run:
```bash
for p in "export const SAVE_VERSION = 2;" "export const ROUTES = ['home', 'play', 'data'] as const;" "registerNav({ id: 'play', order: 20," "function kpiSection(): HTMLElement {" "export function registerCoreTabs(editorSql: () => string): void {" "function fill({ tickets, completed }: StripView): void {" "export type Mode = { kind: 'story' }" "const story = isStory();" "const DICT: Record<Lang, Record<Key, Msg>> = { vi, en };" "['tickets', /^ticketSources-/, 110]" "const PLAN4 = "; do printf '%-75s' "$p"; grep -rlF -- "$p" src tests scripts | wc -l; done
ls content
```
Expected: mỗi mẫu có trong đúng một file (cột cuối = 1); `content` chưa có thư mục `lanes`.

---

### Task 1: Seed phương án B (`lane_profiles`, `bunker_prices`)

**Files:**
- Modify: `src/db/schema.sql`, `src/db/seed.sql`, `tests/seed.test.ts`

**Interfaces:**
- Produces: bảng `lane_profiles`, `bunker_prices` (cột ở T1) và các móc ghi ở đầu khối Plan 5 trong `seed.sql`.

- [ ] **Step 1: Viết test seed (md5 24 bảng cũ, md5 + móc của 2 bảng mới)**

**Sửa `tests/seed.test.ts`** — thay:
```ts
const PLAN4 = ['free_time_terms', 'container_events', 'claims'];
const hashOf = (t: string) => `SELECT md5(string_agg(x::text, '|' ORDER BY x::text)) AS h FROM ${t} x`;
```
bằng:
```ts
const PLAN4 = ['free_time_terms', 'container_events', 'claims'];
/** Plan 5 (lanes, option B, L48): hand-written, appended after PLAN4. */
const PLAN5 = ['lane_profiles', 'bunker_prices'];
const hashOf = (t: string) => `SELECT md5(string_agg(x::text, '|' ORDER BY x::text)) AS h FROM ${t} x`;
```

**Sửa `tests/seed.test.ts`** — thay:
```ts
    const [a, b] = await Promise.all([freshDb(), freshDb()]);
    for (const t of [...TABLES, ...PLAN2, ...PLAN3, ...PLAN4]) {
      const ha = (await a.query<{ h: string }>(hashOf(t))).rows[0].h;
```
bằng:
```ts
    const [a, b] = await Promise.all([freshDb(), freshDb()]);
    for (const t of [...TABLES, ...PLAN2, ...PLAN3, ...PLAN4, ...PLAN5]) {
      const ha = (await a.query<{ h: string }>(hashOf(t))).rows[0].h;
```

**Sửa `tests/seed.test.ts`** — thay:
```ts
  // Appending blocks must never re-roll older tables: ch1–3 hashes taken before Plan 2 (HEAD 646d9e0), Plan 2 hashes before Plan 3 (HEAD fd96e31),
  // Plan 3 hashes before Plan 4 (HEAD 2ddc893). The chapter 11 indexes and ANALYZE change plans, never rows.
  it('bảng cũ giữ nguyên từng byte khi thêm khối seed mới', async () => {
```
bằng:
```ts
  // Appending blocks must never re-roll older tables: ch1–3 hashes taken before Plan 2 (HEAD 646d9e0), Plan 2 hashes before Plan 3 (HEAD fd96e31),
  // Plan 3 hashes before Plan 4 (HEAD 2ddc893), Plan 4 hashes before Plan 5 (HEAD 61de3a9). The chapter 11 indexes and ANALYZE change plans, never rows.
  it('bảng cũ giữ nguyên từng byte khi thêm khối seed mới', async () => {
```

**Sửa `tests/seed.test.ts`** — thay:
```ts
      house_bills: '97308ee315ed7ddab557e0ce7302725e',
    };
    for (const t of [...TABLES, ...PLAN2, ...PLAN3]) expect((await one<{ h: string }>(hashOf(t))).h, t).toBe(before[t]);
  });
```
bằng:
```ts
      house_bills: '97308ee315ed7ddab557e0ce7302725e',
      free_time_terms: '6d85e1979035e08dcd049fdda04ae60c',
      container_events: 'dc49ff2b67e83cecdf2dc72cb88fbb03',
      claims: '23a759d2c1ecb373473106d63af17c39',
    };
    for (const t of [...TABLES, ...PLAN2, ...PLAN3, ...PLAN4]) expect((await one<{ h: string }>(hashOf(t))).h, t).toBe(before[t]);
  });
```

**Thêm vào cuối `tests/seed.test.ts`:**
```ts

describe('seed Plan 5 (tuyến, phương án B)', () => {
  it('bảng tuyến viết tay: md5 ghim, 39 tuyến, 22 tháng giá nhiên liệu', async () => {
    expect((await one<{ h: string }>(hashOf('lane_profiles'))).h).toBe('cc1b47c39ec43e74acd81872c5ead6e9');
    expect((await one<{ h: string }>(hashOf('bunker_prices'))).h).toBe('0e075e03739a80b243cda8e0b573ed97');
    expect((await one<{ n: number }>('SELECT count(*) AS n FROM lane_profiles')).n).toBe(39);
    expect((await one<{ n: number }>("SELECT count(*) AS n FROM bunker_prices WHERE month BETWEEN '2025-01-01' AND '2026-10-01'")).n).toBe(22);
  });

  it('móc của bài tuyến (content/lanes/)', async () => {
    // SG-2: from Da Nang (Tien Sa) five lanes change ship in Singapore; Los Angeles changes in Busan.
    expect((await one<{ p: string }>(`SELECT string_agg(pod, ',' ORDER BY pod) AS p FROM lane_profiles WHERE pol = 'VNDAD' AND via_port = 'SGSIN'`)).p)
      .toBe('BEANR,DEHAM,INNSA,NLRTM,USNYC');
    // S-2: about 100 USD of fuel per TEU on Tien Sa - Sydney in Q3 2026 (BAF-sized, product-design-v3 §18).
    const s2 = await one<{ lo: string; hi: string }>(`SELECT min(l.sea_days * l.fuel_t_per_day * b.usd_per_tonne / l.vessel_teu) AS lo,
      max(l.sea_days * l.fuel_t_per_day * b.usd_per_tonne / l.vessel_teu) AS hi
      FROM lane_profiles l JOIN bunker_prices b ON b.month >= '2026-07-01' AND b.month < '2026-10-01' WHERE l.pol = 'VNDAD' AND l.pod = 'AUSYD'`);
    expect(Number(s2.lo)).toBeGreaterThan(80);
    expect(Number(s2.hi)).toBeLessThan(150);
    expect((await one<{ n: number }>(`SELECT count(*) AS n FROM lane_profiles l JOIN ports p ON p.code = l.pod WHERE p.kind <> 'SEAPORT' OR l.pol NOT LIKE 'VN%'`)).n).toBe(0);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/seed.test.ts`
Expected: FAIL ở `relation "lane_profiles" does not exist` (các test md5 bảng cũ PASS).

- [ ] **Step 3: Thêm bảng và khối seed**

**Thêm vào cuối `src/db/schema.sql`:**
```sql

-- Plan 5 (lanes, seed option B, L48): two small hand-written tables for the lane side tasks. Seed block at the end of seed.sql.
-- One row per lane from a Vietnamese seaport, valid both ways. via_port NULL = direct sailing.
CREATE TABLE lane_profiles (
  pol text NOT NULL REFERENCES ports(code),
  pod text NOT NULL REFERENCES ports(code),
  distance_nm int NOT NULL,
  via_port text REFERENCES ports(code),
  sea_days numeric(4, 1) NOT NULL,
  fuel_t_per_day numeric(5, 1) NOT NULL,
  vessel_teu int NOT NULL,
  PRIMARY KEY (pol, pod)
);

-- Monthly bunker (ship fuel) price, first day of the month.
CREATE TABLE bunker_prices (
  month date PRIMARY KEY,
  usd_per_tonne numeric(7, 2) NOT NULL
);
```

**Thêm vào cuối `src/db/seed.sql`:**
```sql

-- Plan 5 (lanes, L48 option B). Hand-written, no random(): no setseed() needed. Illustrative, simplified figures.
-- Hooks (content/lanes/): from Da Nang (Tien Sa, the game's hub) Europe, India and New York change ship in SGSIN,
-- Los Angeles in KRPUS; Hai Phong to Sydney also calls at SGSIN. Fuel peaks in Aug 2026 (622 USD/t).
-- Per destination: distance and days from Da Nang; Ho Chi Minh (VNSGN) is 330 nm (1 day) closer to southern destinations
-- (side 1) and farther from northern ones (side -1), Hai Phong the other way round.
INSERT INTO lane_profiles (pol, pod, distance_nm, via_port, sea_days, fuel_t_per_day, vessel_teu)
SELECT v.pol, d.pod, d.dist + v.k * d.side * 330,
  CASE WHEN v.pol = 'VNHPH' AND d.pod = 'AUSYD' THEN 'SGSIN' ELSE d.via END,
  d.days + v.k * d.side, d.fuel, d.teu
FROM (VALUES ('VNDAD', 0), ('VNSGN', -1), ('VNHPH', 1)) AS v (pol, k)
CROSS JOIN (VALUES
  ('CNSHA', -1, 1250, NULL, 4.5, 28.0, 1800),
  ('CNNGB', -1, 1180, NULL, 4.3, 28.0, 1800),
  ('SGSIN', 1, 1020, NULL, 3.2, 28.0, 1800),
  ('KRPUS', -1, 1850, NULL, 5.8, 33.0, 2500),
  ('JPTYO', -1, 2280, NULL, 7.4, 33.0, 2500),
  ('THLCH', 1, 1090, NULL, 3.6, 22.0, 1100),
  ('INNSA', 1, 3520, 'SGSIN', 13.6, 48.0, 4200),
  ('NLRTM', 1, 9480, 'SGSIN', 30.2, 120.0, 13000),
  ('DEHAM', 1, 9790, 'SGSIN', 31.4, 120.0, 13000),
  ('BEANR', 1, 9600, 'SGSIN', 30.7, 120.0, 13000),
  ('USLAX', -1, 7120, 'KRPUS', 19.8, 95.0, 8500),
  ('USNYC', 1, 11850, 'SGSIN', 34.6, 120.0, 11000),
  ('AUSYD', 1, 4380, NULL, 15.6, 48.0, 4200)
) AS d (pod, side, dist, via, days, fuel, teu)
ORDER BY v.pol, d.pod;

INSERT INTO bunker_prices (month, usd_per_tonne) VALUES
  ('2025-01-01', 612.00), ('2025-02-01', 598.00), ('2025-03-01', 585.00), ('2025-04-01', 571.00),
  ('2025-05-01', 560.00), ('2025-06-01', 566.00), ('2025-07-01', 574.00), ('2025-08-01', 569.00),
  ('2025-09-01', 558.00), ('2025-10-01', 552.00), ('2025-11-01', 547.00), ('2025-12-01', 541.00),
  ('2026-01-01', 536.00), ('2026-02-01', 529.00), ('2026-03-01', 534.00), ('2026-04-01', 548.00),
  ('2026-05-01', 561.00), ('2026-06-01', 579.00), ('2026-07-01', 603.00), ('2026-08-01', 622.00),
  ('2026-09-01', 618.00), ('2026-10-01', 605.00);
ANALYZE lane_profiles, bunker_prices;
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `npx vitest run tests/seed.test.ts && npx tsc --noEmit`
Expected: PASS (`tests/seed.test.ts` 25 test).

- [ ] **Step 5: Chạy toàn bộ rồi commit**

Run: `npm test`
Expected: mọi test PASS (mọi Solution cũ giữ nguyên kết quả).

```bash
git add src/db/schema.sql src/db/seed.sql tests/seed.test.ts
git commit -m "seed: lane_profiles and bunker_prices for the lane side tasks (Plan 5 T1, option B)

Claude-Session: https://claude.ai/code/session_01PwPSBV1SVDP6quEZfKN56M"
```

---

### Task 2: 18 icon mới (mockup v6)

**Files:**
- Modify: `src/ui/icons.ts`, `tests/icons.test.ts`

**Interfaces:**
- Produces: icon `table, lineChart, pin, unpin, refresh, code, up, down, x, alert, eye, eyeOff, route, fuel, calendar, info, chevronLeft, chevronRight`; `ICON_NAMES` (mọi tên icon, cho test).

- [ ] **Step 1: Viết test (icon có thật, không icon nào trùng path data với icon khác)**

**Sửa `tests/icons.test.ts`** — thay:
```ts
import { KPIS } from '../src/home';
import { iconPaths, isIconName, SKILL_ICON, skillIconName } from '../src/ui/icons';
```
bằng:
```ts
import { KPIS } from '../src/home';
import { ICON_NAMES, iconPaths, isIconName, SKILL_ICON, skillIconName } from '../src/ui/icons';
```

**Sửa `tests/icons.test.ts`** — thay:
```ts
  });
});
```
bằng:
```ts
  });

  it('Plan 5 (mockup v6): 18 icon mới có thật, và không icon nào trùng path data với icon khác', () => {
    const added = ['table', 'lineChart', 'pin', 'unpin', 'refresh', 'code', 'up', 'down', 'x', 'alert', 'eye', 'eyeOff', 'route', 'fuel', 'calendar', 'info', 'chevronLeft', 'chevronRight'];
    expect(added.filter((n) => !isIconName(n))).toEqual([]);
    const seen = new Map<string, string>();
    const dupes = ICON_NAMES.flatMap((n) => {
      const key = JSON.stringify(iconPaths(n));
      const other = seen.get(key);
      seen.set(key, n);
      return other ? [`${other} = ${n}`] : [];
    });
    expect(dupes).toEqual([]);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/icons.test.ts`
Expected: FAIL (`ICON_NAMES` chưa có, `tsc`/import lỗi).

- [ ] **Step 3: Thêm path (đúng path của mockup v6)**

**Sửa `src/ui/icons.ts`** — thay:
```ts
  puzzle: 'M4 8h4a2 2 0 1 1 4 0h4v4a2 2 0 1 1 0 4v4H4z',
  // ---- KPI tiles ----
```
bằng:
```ts
  puzzle: 'M4 8h4a2 2 0 1 1 4 0h4v4a2 2 0 1 1 0 4v4H4z',
  // ---- dashboard and lanes (Plan 5, mockup v6) ----
  table: 'M3 4h18v16H3z M3 9h18 M3 14h18 M9 9v11',
  lineChart: 'M3 3v18h18 M6 15l4-5 4 3 6-7',
  pin: 'M9 4h6 M10 4v6l-3 4h10l-3-4V4 M12 14v7',
  unpin: 'M9 4h6 M10 4v6l-3 4h10l-3-4V4 M12 14v7 M3 3l18 18',
  refresh: 'M21 12a9 9 0 1 1-3-6.7L21 8 M21 3v5h-5',
  code: 'M8 7l-5 5 5 5 M16 7l5 5-5 5',
  up: 'M12 19V5 M6 11l6-6 6 6',
  down: 'M12 5v14 M6 13l6 6 6-6',
  x: 'M6 6l12 12 M18 6 6 18',
  alert: 'M12 3 2 20h20z M12 10v4 M12 17h.01',
  eye: `M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z ${CIRCLE(12, 12, 3)}`,
  eyeOff: 'M3 3l18 18 M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3 3.9 M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6 M9.9 9.9a3 3 0 0 0 4.2 4.2',
  route: `${CIRCLE(6, 19, 2)} ${CIRCLE(18, 5, 2)} M8 19h7a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h7`,
  fuel: 'M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16 M3 21h12 M4 10h10 M14 8h2a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0V8l-3-3',
  calendar: CALENDAR,
  info: `${CIRCLE(12, 12, 9)} M12 11v6 M12 7.5h.01`,
  chevronLeft: 'M15 6l-6 6 6 6',
  chevronRight: 'M9 6l6 6-6 6',
  // ---- KPI tiles ----
```

**Sửa `src/ui/icons.ts`** — thay:
```ts
export const isIconName = (name: string): name is IconName => Object.hasOwn(P, name);
```
bằng:
```ts
export const isIconName = (name: string): name is IconName => Object.hasOwn(P, name);
export const ICON_NAMES = Object.keys(P) as IconName[];
```

- [ ] **Step 4: Chạy test, xác nhận PASS rồi commit**

Run: `npx vitest run tests/icons.test.ts && npx tsc --noEmit`
Expected: PASS (5 test).

```bash
git add src/ui/icons.ts tests/icons.test.ts
git commit -m "icons: 18 dashboard and lane icons from mockup v6 (Plan 5); no two icons share path data

Claude-Session: https://claude.ai/code/session_01PwPSBV1SVDP6quEZfKN56M"
```

---

### Task 3: Save v3 và card thuần (`src/dashboard.ts`)

**Files:**
- Create: `src/dashboard.ts`, `tests/saveV3.test.ts`, `tests/dashboard.test.ts`, `tests/fixtures/save-v3.json`
- Modify: `src/save.ts`, `src/viz/chart.ts`, `tests/save.test.ts`, `tests/saveV2.test.ts`

**Interfaces:**
- Produces:
  - `Card`, `CardKind`, `CARD_KINDS`, `Dashboard`, `MAX_CARDS` (24), `MAX_CARD_SQL` (4000), `MAX_CARD_TITLE` (80), `PIN_MAX_MS` (2000), `TABLE_ROWS` (10), `BAR_ROWS` (12), `KIND_SKILL`.
  - `readDashboard`, `cardSpec`, `numericCols`, `valueCols(kind, r)`, `pinBlock(run, editorSql, cards)` → `'stale' | 'full' | 'long' | 'slow' | undefined`, `nextCardId`, `moveCard`.
  - `Save.dashboard`, `Save.lanes`, `SAVE_VERSION = 3`, `MIGRATIONS[2]`.

- [ ] **Step 1: Viết test (fixture v3, migrate v1/v2, build cũ → .bak, card hỏng, giới hạn, luật ghim, Lên/Xuống)**

**Tạo `tests/dashboard.test.ts`:**
```ts
import { describe, expect, it } from 'vitest';
import { KIND_SKILL, moveCard, nextCardId, PIN_MAX_MS, pinBlock, valueCols, type Card } from '../src/dashboard';
import type { QueryResult } from '../src/db/run';

const card = (id: string): Card => ({ id, title: id, sql: 'SELECT 1', kind: 'table', source: 'sandbox' });
const res = (types: number[], rows: unknown[][]): QueryResult => ({ columns: types.map((_, i) => `c${i}`), types, rows });
const TEXT = 25;
const INT8 = 20;
const NUM = 1700;
const DATE = 1082;

describe('card của người chơi (src/dashboard.ts)', () => {
  it('Lên/Xuống đổi chỗ với card bên cạnh; ở đầu/cuối thì giữ nguyên', () => {
    const cards = ['a', 'b', 'c'].map(card);
    expect(moveCard(cards, 1, -1).map((c) => c.id)).toEqual(['b', 'a', 'c']);
    expect(moveCard(cards, 1, 1).map((c) => c.id)).toEqual(['a', 'c', 'b']);
    expect(moveCard(cards, 0, -1)).toBe(cards);
    expect(moveCard(cards, 2, 1)).toBe(cards);
    expect(cards.map((c) => c.id)).toEqual(['a', 'b', 'c']); // pure
  });

  it('id mới lớn hơn mọi id cũ', () => {
    expect(nextCardId([])).toBe('c1');
    expect(nextCardId([card('c2'), card('c9'), card('x')])).toBe('c10');
  });

  it('dạng card mở theo kỹ năng (D-A3)', () => {
    expect(KIND_SKILL).toEqual({ table: 'select', number: 'aggregate', bar: 'group_by', line: 'date_bucket' });
  });

  it('cột giá trị hợp với từng dạng', () => {
    const bar = res([TEXT, INT8, NUM], [['FOB', 146, '16204.5'], ['FCA', 94, '15877.1']]);
    expect(valueCols('table', bar)).toEqual([0]);
    expect(valueCols('number', bar)).toEqual([1, 2]);
    expect(valueCols('bar', bar)).toEqual([1, 2]);
    expect(valueCols('line', bar)).toEqual([]);
    const line = res([DATE, NUM], [[new Date('2026-07-01'), '603']]);
    expect(valueCols('line', line)).toEqual([1]);
    expect(valueCols('bar', line)).toEqual([]);
    expect(valueCols('number', res([INT8], []))).toEqual([]); // no row: nothing to show
    expect(valueCols('table', res([], []))).toEqual([]);
    // More rows than a chart takes: the card shows the first ones, so it still fits.
    expect(valueCols('bar', res([TEXT, INT8], Array.from({ length: 245 }, (_, i) => [`k${i}`, i])))).toEqual([1]);
  });

  it('nút Ghim: SQL đã đổi → chạy lại trước; đủ 24 card; SQL quá dài; query quá 2 s', () => {
    const run = { sql: 'SELECT 1', ms: 3 };
    expect(pinBlock(run, ' SELECT 1 \n', 5)).toBeUndefined();
    expect(pinBlock(run, 'SELECT 2', 5)).toBe('stale');
    expect(pinBlock(run, 'SELECT 1', 24)).toBe('full');
    expect(pinBlock({ sql: `SELECT ${'1'.repeat(4000)}`, ms: 1 }, `SELECT ${'1'.repeat(4000)}`, 0)).toBe('long');
    expect(pinBlock({ sql: 'SELECT 1', ms: PIN_MAX_MS + 1 }, 'SELECT 1', 0)).toBe('slow');
    expect(pinBlock({ sql: 'SELECT 1', ms: PIN_MAX_MS }, 'SELECT 1', 0)).toBeUndefined();
  });
});
```

**Tạo `tests/fixtures/save-v3.json`:**
```json
{
  "version": 3,
  "completed": ["ch1-01", "ch1-02", "ch1-03", "ch1-04", "ch1-05", "ch2-01", "ch2-02"],
  "xp": 1240,
  "hintsUsed": { "ch1-02": 1, "r-1": 2 },
  "drafts": { "ch2-03#0": "SELECT count(*) FROM shipments", "r-2#0": "SELECT 1" },
  "graded": { "ch2-02#0": "SELECT mode, direction, COUNT(*) FROM shipments GROUP BY mode, direction", "r-1#0": "SELECT incoterm, count(*) FROM shipments GROUP BY incoterm" },
  "review": { "select": { "box": 3, "due": "2026-11-20" } },
  "practice": { "solved": 4, "weak": 1 },
  "sandboxDraft": "SELECT count(*) FROM shipments",
  "bossStep": {},
  "dashboard": {
    "cards": [
      { "id": "c1", "title": "Lô đi Rotterdam năm 2025", "sql": "SELECT count(*) FROM shipments WHERE pod = 'NLRTM'", "kind": "number", "col": 0, "source": "sandbox" },
      { "id": "c2", "title": "Theo điều kiện giao hàng", "sql": "SELECT incoterm, count(*) FROM shipments GROUP BY incoterm ORDER BY 2 DESC", "kind": "bar", "col": 1, "source": "r-1" },
      { "id": "c4", "title": "Số lô mỗi khách", "sql": "SELECT customer_id, count(*) FROM shipments GROUP BY 1", "kind": "table", "slow": true, "source": "sandbox" }
    ],
    "hidden": ["rows2025"]
  },
  "lanes": ["r-1"]
}
```

**Sửa `tests/save.test.ts`** — thay:
```ts
  it('save mới hơn → cảnh báo newer kèm version, giữ bản .bak', () => {
    const raw = JSON.stringify({ version: 3, completed: [] });
    const store = memoryStorage({ [SAVE_KEY]: raw });
    expect(loadSave(store, known)).toEqual({ save: emptySave(), warning: { kind: 'newer', version: 3 } });
    expect(store.data[`${SAVE_KEY}.bak`]).toBe(raw);
```
bằng:
```ts
  it('save mới hơn → cảnh báo newer kèm version, giữ bản .bak', () => {
    const raw = JSON.stringify({ version: 4, completed: [] });
    const store = memoryStorage({ [SAVE_KEY]: raw });
    expect(loadSave(store, known)).toEqual({ save: emptySave(), warning: { kind: 'newer', version: 4 } });
    expect(store.data[`${SAVE_KEY}.bak`]).toBe(raw);
```

**Sửa `tests/saveV2.test.ts`** — thay:
```ts
  it('emptySave có đủ trường v2 và giữ graded', () => {
    expect(emptySave()).toMatchObject({ version: 2, graded: {}, review: {}, practice: { solved: 0, weak: 0 }, sandboxDraft: '', bossStep: {} });
  });

  it('đọc save mẫu v2 nguyên vẹn', () => {
    expect(parseSave(v2, known)).toEqual(JSON.parse(v2));
  });
```
bằng:
```ts
  it('emptySave có đủ trường v2 và giữ graded', () => {
    expect(emptySave()).toMatchObject({ version: 3, graded: {}, review: {}, practice: { solved: 0, weak: 0 }, sandboxDraft: '', bossStep: {} });
  });

  it('đọc save mẫu v2 nguyên vẹn (Plan 5: migrate lên v3, thêm trường v3 rỗng)', () => {
    expect(parseSave(v2, known)).toEqual({ ...JSON.parse(v2), version: 3, dashboard: { cards: [], hidden: [] }, lanes: [] });
  });
```

**Sửa `tests/saveV2.test.ts`** — thay:
```ts

  it('từ chối save v3', () => {
    expect(() => parseSave(JSON.stringify({ version: 3 }), known)).toThrow(NewerSaveError);
  });

  it('loadSave từ v1 bằng MIGRATIONS thật: giữ bản gốc ở oldSaveKey(1), migrate lên v2', () => {
    const store = memStore({ [SAVE_KEY]: v1 });
    const r = loadSave(store, known);
    expect(r.warning).toBeUndefined();
    expect(r.save).toMatchObject({ version: 2, completed: ['ch1-01', 'ch1-02'], review: {}, bossStep: {}, graded: {} });
    expect(store.data[oldSaveKey(1)]).toBe(v1);
```
bằng:
```ts

  it('từ chối save v4', () => {
    expect(() => parseSave(JSON.stringify({ version: 4 }), known)).toThrow(NewerSaveError);
  });

  it('loadSave từ v1 bằng MIGRATIONS thật: giữ bản gốc ở oldSaveKey(1), migrate lên v3', () => {
    const store = memStore({ [SAVE_KEY]: v1 });
    const r = loadSave(store, known);
    expect(r.warning).toBeUndefined();
    expect(r.save).toMatchObject({ version: 3, completed: ['ch1-01', 'ch1-02'], review: {}, bossStep: {}, graded: {} });
    expect(store.data[oldSaveKey(1)]).toBe(v1);
```

**Tạo `tests/saveV3.test.ts`:**
```ts
import { describe, expect, it } from 'vitest';
import v1 from './fixtures/save-v1.json?raw';
import v2 from './fixtures/save-v2.json?raw';
import v3 from './fixtures/save-v3.json?raw';
import { MAX_CARD_SQL, MAX_CARDS } from '../src/dashboard';
import { emptySave, loadSave, oldSaveKey, parseSave, SAVE_KEY, SAVE_VERSION, serializeSave, type Known } from '../src/save';
import type { KV } from '../src/storage';

// Lane side tasks (r-1, r-2) are known ids like tickets: their drafts, graded SQL and hints survive a reload.
const known: Known = {
  ticketIds: new Set(['ch1-01', 'ch1-02', 'ch1-03', 'ch1-04', 'ch1-05', 'ch2-01', 'ch2-02', 'ch2-03', 'r-1', 'r-2']),
  skills: new Set(['select', 'where', 'order_by', 'limit']),
};

function memStore(initial: Record<string, string> = {}): KV & { data: Record<string, string> } {
  const data = { ...initial };
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; } };
}

describe('save v3 (Plan 5: bảng điều hành + bài tuyến)', () => {
  it('SAVE_VERSION 3, emptySave có dashboard và lanes rỗng', () => {
    expect(SAVE_VERSION).toBe(3);
    expect(emptySave()).toMatchObject({ version: 3, dashboard: { cards: [], hidden: [] }, lanes: [] });
  });

  it('đọc save mẫu v3 nguyên vẹn', () => {
    expect(parseSave(v3, known)).toEqual(JSON.parse(v3));
  });

  it('migrate v1 và v2 lên v3 (fixture giữ mãi)', () => {
    for (const raw of [v1, v2]) expect(parseSave(raw, known)).toMatchObject({ version: 3, dashboard: { cards: [], hidden: [] }, lanes: [] });
  });

  it('loadSave từ v2: giữ bản gốc ở oldSaveKey(2) rồi migrate', () => {
    const store = memStore({ [SAVE_KEY]: v2 });
    const r = loadSave(store, known);
    expect(r.warning).toBeUndefined();
    expect(r.save.version).toBe(3);
    expect(store.data[oldSaveKey(2)]).toBe(v2);
  });

  it('build cũ (v2) gặp save v3 → cất vào .bak, không ghi đè (lý do nâng version)', () => {
    const store = memStore({ [SAVE_KEY]: v3 });
    const r = loadSave(store, known, undefined, 2);
    expect(r.warning).toEqual({ kind: 'newer', version: 3 });
    expect(store.data[`${SAVE_KEY}.bak`]).toBe(v3);
  });

  it('bỏ card hỏng và id bài tuyến lạ, giữ phần còn lại', () => {
    const ok = { id: 'c1', title: 'A', sql: 'SELECT 1', kind: 'number', col: 0, source: 'sandbox' };
    const raw = JSON.stringify({
      ...JSON.parse(v3),
      dashboard: {
        cards: [
          ok,
          { ...ok, title: 'trùng id' },
          { ...ok, id: 'c2', kind: 'pie' },
          { ...ok, id: 'c3', sql: 'x'.repeat(MAX_CARD_SQL + 1) },
          { ...ok, id: 'c4', title: '' },
          { ...ok, id: 'c5', col: -1 },
          { ...ok, id: 'c6', source: undefined },
          { ...ok, id: 'c7', slow: 'yes', kind: 'line' },
          'not a card',
        ],
        hidden: ['a', 'a', 7, ''],
      },
      lanes: ['r-1', 'gone', 'r-1', 3],
    });
    const s = parseSave(raw, known);
    expect(s.dashboard.cards.map((c) => c.id)).toEqual(['c1', 'c7']);
    expect(s.dashboard.cards[1]).not.toHaveProperty('slow');
    expect(s.dashboard.hidden).toEqual(['a']);
    expect(s.lanes).toEqual(['r-1']);
  });

  it(`tối đa ${MAX_CARDS} card; dashboard không phải object → rỗng`, () => {
    const cards = Array.from({ length: MAX_CARDS + 5 }, (_, i) => ({ id: `c${i}`, title: 'T', sql: 'SELECT 1', kind: 'table', source: 'sandbox' }));
    expect(parseSave(JSON.stringify({ ...emptySave(), dashboard: { cards } }), known).dashboard.cards).toHaveLength(MAX_CARDS);
    expect(parseSave(JSON.stringify({ ...emptySave(), dashboard: [] }), known).dashboard).toEqual({ cards: [], hidden: [] });
  });

  it('Xuất → Nhập giữ card, ô ẩn và bài tuyến đã xong', () => {
    const save = parseSave(v3, known);
    expect(parseSave(serializeSave(save), known)).toEqual(save);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/save.test.ts tests/saveV2.test.ts tests/saveV3.test.ts tests/dashboard.test.ts`
Expected: FAIL (`src/dashboard.ts` chưa có; `SAVE_VERSION` còn 2).

- [ ] **Step 3: Viết `src/dashboard.ts`, nâng Save**

**Tạo `src/dashboard.ts`:**
```ts
import type { QueryResult } from './db/run';
import { chartSpec, MAX_POINTS, NUMERIC, type ChartSpec } from './viz/chart';

/**
 * Player cards on the dashboard (product-design-v3 §4–§7, L48/L49). Pure: no DOM, no DB. Stored in Save v3 (`save.dashboard`),
 * so they travel with Export/Import; company KPI tiles (content/kpis.yml) are never stored here, only their `hidden` ids.
 */
export const CARD_KINDS = ['table', 'number', 'bar', 'line'] as const;
export type CardKind = (typeof CARD_KINDS)[number];
/** `col`: value column (number, bar, line); bars and lines take their labels from column 0 (chartSpec). Array position = order. */
export interface Card { id: string; title: string; sql: string; kind: CardKind; col?: number; slow?: true; source: string }
export interface Dashboard { cards: Card[]; hidden: string[] }

export const MAX_CARDS = 24;
export const MAX_CARD_SQL = 4000;
export const MAX_CARD_TITLE = 80;
/** A card re-runs every time the dashboard opens: a query slower than this cannot be pinned (D-A4). */
export const PIN_MAX_MS = 2000;
/** Rows a table card shows, bars a bar card shows. Lines show up to MAX_POINTS points. */
export const TABLE_ROWS = 10;
export const BAR_ROWS = 12;

/** D-A3: a kind opens with the skill that makes that shape of result (table ch1, number and bar ch2, line ch4). */
export const KIND_SKILL: Record<CardKind, string> = { table: 'select', number: 'aggregate', bar: 'group_by', line: 'date_bucket' };

export const emptyDashboard = (): Dashboard => ({ cards: [], hidden: [] });

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isShort = (v: unknown, max: number): v is string => typeof v === 'string' && v.trim() !== '' && v.length <= max;

/** Save v3 field, checked like every other field: a broken card is dropped, never the whole save. */
export function readDashboard(v: unknown): Dashboard {
  const out = emptyDashboard();
  if (!isRecord(v)) return out;
  const ids = new Set<string>();
  for (const c of Array.isArray(v.cards) ? v.cards : []) {
    if (out.cards.length >= MAX_CARDS) break;
    if (!isRecord(c) || !isShort(c.id, 40) || ids.has(c.id) || !isShort(c.title, MAX_CARD_TITLE) || !isShort(c.sql, MAX_CARD_SQL)
      || !CARD_KINDS.includes(c.kind as CardKind) || !isShort(c.source, 40)) continue;
    if (c.col !== undefined && !(Number.isInteger(c.col) && (c.col as number) >= 0)) continue;
    ids.add(c.id);
    out.cards.push({
      id: c.id, title: c.title, sql: c.sql, kind: c.kind as CardKind, source: c.source,
      ...(c.col !== undefined ? { col: c.col as number } : {}), ...(c.slow === true ? { slow: true as const } : {}),
    });
  }
  if (Array.isArray(v.hidden)) out.hidden = [...new Set(v.hidden.filter((x): x is string => isShort(x, 40)))].slice(0, 64);
  return out;
}

/** Bars and lines use the chart rules of the Chart tab on the rows the card shows. */
export const cardSpec = (r: QueryResult): ChartSpec | null => chartSpec({ ...r, rows: r.rows.slice(0, MAX_POINTS) });
/** Numeric columns: candidates for a number card. */
export const numericCols = (r: QueryResult): number[] => r.types.flatMap((t, i) => (NUMERIC.has(t) ? [i] : []));

/** Value columns `kind` can use with this result; [] = the kind does not fit (a table fits any result with columns). */
export function valueCols(kind: CardKind, r: QueryResult): number[] {
  if (r.columns.length === 0) return [];
  if (kind === 'table') return [0];
  if (kind === 'number') return r.rows.length ? numericCols(r) : [];
  const spec = cardSpec(r);
  return spec?.kind === kind ? spec.values : [];
}

/** Why the Pin button cannot be used now; undefined = it can. `stale`: the editor no longer holds the SQL that ran. */
export type PinBlock = 'stale' | 'full' | 'long' | 'slow';
export function pinBlock(run: { sql: string; ms?: number }, editorSql: string, cards: number): PinBlock | undefined {
  if (editorSql.trim() !== run.sql.trim()) return 'stale';
  if (cards >= MAX_CARDS) return 'full';
  if (run.sql.trim().length > MAX_CARD_SQL) return 'long';
  if ((run.ms ?? 0) > PIN_MAX_MS) return 'slow';
  return undefined;
}

/** c1, c2, …: the smallest number above every existing card id. */
export function nextCardId(cards: Card[]): string {
  const n = Math.max(0, ...cards.map((c) => Number(/^c(\d+)$/.exec(c.id)?.[1] ?? 0)));
  return `c${n + 1}`;
}

/** Lên/Xuống: a new array with card `i` swapped with its neighbour; the same array when it cannot move. */
export function moveCard(cards: Card[], i: number, dir: -1 | 1): Card[] {
  const j = i + dir;
  if (i < 0 || i >= cards.length || j < 0 || j >= cards.length) return cards;
  const out = [...cards];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}
```

**Sửa `src/save.ts`** — thay:
```ts
import { addDays, MAX_BOX, type PracticeStats, type Review } from './practice';
import type { KV } from './storage';

export const SAVE_VERSION = 2;
export const SANDBOX_DRAFT_MAX = 20_000;
```
bằng:
```ts
import { emptyDashboard, readDashboard, type Dashboard } from './dashboard';
import { addDays, MAX_BOX, type PracticeStats, type Review } from './practice';
import type { KV } from './storage';

export const SAVE_VERSION = 3;
export const SANDBOX_DRAFT_MAX = 20_000;
```

**Sửa `src/save.ts`** — thay:
```ts
  bossStep: Record<string, number>;
}

/** Ids that exist in the current content; saved ids not in here are dropped. `skills` is used from v2 (review). */
export interface Known { ticketIds: ReadonlySet<string>; skills: ReadonlySet<string> }
```
bằng:
```ts
  bossStep: Record<string, number>;
  // --- v3 (Plan 5, L48 D-A2) ---
  /** Player cards and hidden company tiles of the dashboard (src/dashboard.ts). */
  dashboard: Dashboard;
  /** Lane side tasks solved (content/lanes/). Never in `completed`: chapters, rank, the next ticket and KPIs ignore them. */
  lanes: string[];
}

/**
 * Ids that exist in the current content; saved ids not in here are dropped. `skills` is used from v2 (review).
 * `ticketIds` holds story tickets and lane side tasks (their drafts, graded SQL and hints are kept like a ticket's).
 */
export interface Known { ticketIds: ReadonlySet<string>; skills: ReadonlySet<string> }
```

**Sửa `src/save.ts`** — thay:
```ts
  1: (d) => ({ ...d, review: {}, practice: { solved: 0, weak: 0 }, sandboxDraft: '', bossStep: {} }),
};
```
bằng:
```ts
  1: (d) => ({ ...d, review: {}, practice: { solved: 0, weak: 0 }, sandboxDraft: '', bossStep: {} }),
  // v2 → v3: no cards, no lane task done. Bumped (not optional like `graded`) so an older build moves a v3 save to .bak
  // instead of rewriting it without the player's cards (product-design-v3 §6).
  2: (d) => ({ ...d, dashboard: emptyDashboard(), lanes: [] }),
};
```

**Sửa `src/save.ts`** — thay:
```ts
  bossStep: {},
});
```
bằng:
```ts
  bossStep: {},
  dashboard: emptyDashboard(),
  lanes: [],
});
```

**Sửa `src/save.ts`** — thay:
```ts
    ...readV2(d, known),
  };
```
bằng:
```ts
    ...readV2(d, known),
    dashboard: readDashboard(d.dashboard),
    lanes: Array.isArray(d.lanes) ? [...new Set(d.lanes.filter((x): x is string => typeof x === 'string' && known.ticketIds.has(x)))] : [],
  };
```

**Sửa `src/viz/chart.ts`** — thay:
```ts
/** int2, int4, int8, float4, float8, numeric */
const NUMERIC = new Set([21, 23, 20, 700, 701, 1700]);
/** date, timestamp, timestamptz */
```
bằng:
```ts
/** int2, int4, int8, float4, float8, numeric */
export const NUMERIC = new Set([21, 23, 20, 700, 701, 1700]);
/** date, timestamp, timestamptz */
```

- [ ] **Step 4: Chạy test, xác nhận PASS rồi commit**

Run: `npm test && npx tsc --noEmit`
Expected: mọi test PASS.

```bash
git add src/dashboard.ts src/save.ts src/viz/chart.ts tests/dashboard.test.ts tests/fixtures/save-v3.json tests/save.test.ts tests/saveV2.test.ts tests/saveV3.test.ts
git commit -m "save: v3 with player dashboard cards and solved lane tasks; pure card rules (Plan 5 T4, L48 D-A2)

Claude-Session: https://claude.ai/code/session_01PwPSBV1SVDP6quEZfKN56M"
```

---

### Task 4: Bảng điều hành P1 (route, nav 6 mục, ô KPI dời khỏi Trang chủ) và EN lazy

**Files:**
- Create: `src/ui/dashboard.ts`
- Modify: `src/route.ts`, `src/ui/topbar.ts`, `index.html`, `src/main.ts`, `src/ui/homeView.ts`, `src/i18n/index.ts`, `src/i18n/vi.ts`, `src/i18n/en.ts`, `scripts/check-budget.mjs`, `tests/route.test.ts`, `tests/setup.ts`, `tests/startup.test.ts`

**Interfaces:**
- Produces:
  - Route `dashboard` (`#/dashboard`), nav id `dashboard` (order 60), `<main id="dashboard">`.
  - `renderDashboard(host)` và `kpiView(v, unit)` (`src/ui/dashboard.ts`).
  - `loadLang(l?)`; `setLang` async.
  - Khóa `nav.dashboard`, `dash.*`. Bỏ khóa `home.kpi`, `home.kpiIntro`.

- [ ] **Step 1: Viết test**

**Sửa `tests/route.test.ts`** — thay:
```ts

  it('#/data và #/data/<bảng> là trang Dữ liệu; dataTableOf chỉ nhận định danh', () => {
```
bằng:
```ts

  it('#/dashboard là Bảng điều hành (Plan 5, L48 D-A1)', () => {
    expect(parseRoute('#/dashboard')).toBe('dashboard');
    expect(hashOf('dashboard')).toBe('#/dashboard');
    expect(ROUTES).toEqual(['home', 'play', 'data', 'dashboard']);
  });

  it('#/data và #/data/<bảng> là trang Dữ liệu; dataTableOf chỉ nhận định danh', () => {
```

**Tạo `tests/setup.ts`:**
```ts
// Ticket content and the EN dictionary are lazy in the app (src/content.ts, src/i18n); tests read them synchronously,
// so load them once per test file (Node's navigator.language makes getLang() 'en').
import { loadContent } from '../src/content';
import { loadLang } from '../src/i18n';

await Promise.all([loadContent(), loadLang()]);
```

**Sửa `tests/startup.test.ts`** — thay:
```ts
describe('khởi động', () => {
  it('DbClient được tạo trước await loadContent()', () => {
    const db = src.indexOf('new DbClient(');
    const content = src.indexOf('await loadContent()');
    expect(db).toBeGreaterThan(-1);
```
bằng:
```ts
describe('khởi động', () => {
  it('DbClient được tạo trước await loadContent() (Plan 5: cùng lúc với từ điển EN)', () => {
    const db = src.indexOf('new DbClient(');
    const content = src.indexOf('await Promise.all([loadContent(), loadLang()])');
    expect(db).toBeGreaterThan(-1);
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/route.test.ts tests/startup.test.ts`
Expected: FAIL (`dashboard` chưa là route; main.ts chưa có `loadLang()`).

- [ ] **Step 3: Route, nav, trang, dòng giới thiệu, EN lazy, chữ VI + EN, ngân sách**

**Sửa `index.html`** — thay:
```html
    <main id="data" class="shell:min-h-0 shell:flex-1 shell:overflow-auto" data-i18n-aria="nav.data" aria-label="Dữ liệu" hidden></main>
    <main id="shell" class="shell" hidden>
```
bằng:
```html
    <main id="data" class="shell:min-h-0 shell:flex-1 shell:overflow-auto" data-i18n-aria="nav.data" aria-label="Dữ liệu" hidden></main>
    <!-- Plan 5 (L48/L49): #/dashboard, filled by src/ui/dashboard.ts. -->
    <main id="dashboard" class="shell:min-h-0 shell:flex-1 shell:overflow-auto" data-i18n-aria="nav.dashboard" aria-label="Bảng điều hành" hidden></main>
    <main id="shell" class="shell" hidden>
```

**Sửa `scripts/check-budget.mjs`** — thay:
```js
  ['tickets', /^ticketSources-/, 110], // all ticket markdown, one lazy chunk fetched at boot (src/content.ts): 37 KB after ch1–6, 64 KB after ch7–9, 99 KB after ch10–12 (Plan 4 S7, L40 rule)
  ['css', /^index-.*\.css$/, 20],
```
bằng:
```js
  ['tickets', /^ticketSources-/, 110], // all ticket markdown, one lazy chunk fetched at boot (src/content.ts): 37 KB after ch1–6, 64 KB after ch7–9, 99 KB after ch10–12 (Plan 4 S7, L40 rule)
  ['en', /^en-.*\.js$/, 20], // EN dictionary, lazy (Plan 5 T3): 11 KB, fetched at boot only when the player's language is EN
  ['css', /^index-.*\.css$/, 20],
```

**Sửa `src/i18n/en.ts`** — thay:
```ts
  'routes.label': 'Route map from Tien Sa. {lanes}.',
  'home.kpi': 'Company dashboard',
  'home.kpiIntro': 'Each figure unlocks when you complete the task that computes it.',
  'home.kpiFrom': 'From the task "{title}"',
```
bằng:
```ts
  'routes.label': 'Route map from Tien Sa. {lanes}.',
  'home.kpiFrom': 'From the task "{title}"',
```

**Sửa `src/i18n/en.ts`** — thay:
```ts
  'map.beat.current': 'in progress',
};
```
bằng:
```ts
  'map.beat.current': 'in progress',
  // ---- Plan 5: dashboard ----
  'nav.dashboard': 'Dashboard',
  'dash.title': 'Dashboard',
  'dash.intro': 'Pin your queries as cards to keep an eye on them. Cards run again every time this page opens, so a query must run in under 2 seconds. Card types open as you learn the skills behind them.',
  'dash.teaser': (p) => `${num(p.open)}/${num(p.total)} tiles open · ${count('card', 'cards')({ n: p.cards })} of yours`,
  'dash.company': 'Company figures',
  'dash.companyOpen': '{n}/{total} tiles open',
  'dash.companyIntro': 'Each tile opens when you finish its task. Company tiles can only be hidden, never removed or edited.',
  'dash.hide': 'Hide tile: {title}',
  'dash.show': 'Show again: {title}',
  'dash.hidden': 'Hidden tiles ({n})',
  'dash.hiddenDone': 'Tile {title} hidden.',
  'dash.shownDone': 'Tile {title} shown again.',
};
```

**Sửa `src/i18n/index.ts`** — thay:
```ts
import type { Lang } from '../tickets';
import { en } from './en';
import { vi } from './vi';
```
bằng:
```ts
import type { Lang } from '../tickets';
import { vi } from './vi';
```

**Sửa `src/i18n/index.ts`** — thay:
```ts

const DICT: Record<Lang, Record<Key, Msg>> = { vi, en };
```
bằng:
```ts

const DICT: Partial<Record<Lang, Record<Key, Msg>>> = { vi };

/**
 * The EN dictionary is a lazy chunk (Plan 5 T3: room in the main bundle, L40): main.ts and tests/setup.ts await
 * loadLang() before the first render, setLang() before a switch. Until it is in, t() reads VI.
 */
export async function loadLang(l: Lang = getLang()): Promise<void> {
  if (l === 'en' && !DICT.en) DICT.en = (await import('./en')).en;
}
```

**Sửa `src/i18n/index.ts`** — thay:
```ts
export function t(key: Key, params: Params = {}): string {
  const msg = DICT[getLang()][key];
  const p: Params = { ...KEYS, ...params };
```
bằng:
```ts
export function t(key: Key, params: Params = {}): string {
  const msg = (DICT[getLang()] ?? vi)[key];
  const p: Params = { ...KEYS, ...params };
```

**Sửa `src/i18n/index.ts`** — thay:
```ts

export function setLang(l: Lang): void {
  lang = l;
```
bằng:
```ts

export async function setLang(l: Lang): Promise<void> {
  await loadLang(l);
  lang = l;
```

**Sửa `src/i18n/vi.ts`** — thay:
```ts
  'routes.label': 'Bản đồ tuyến từ Tiên Sa. {lanes}.',
  'home.kpi': 'Bảng điều hành công ty',
  'home.kpiIntro': 'Mỗi chỉ số mở khi bạn hoàn thành đúng việc tính ra nó.',
  'home.kpiFrom': 'Từ việc "{title}"',
```
bằng:
```ts
  'routes.label': 'Bản đồ tuyến từ Tiên Sa. {lanes}.',
  'home.kpiFrom': 'Từ việc "{title}"',
```

**Sửa `src/i18n/vi.ts`** — thay:
```ts
  'map.beat.current': 'đang làm',
} satisfies Record<string, Msg>;
```
bằng:
```ts
  'map.beat.current': 'đang làm',
  // ---- Plan 5: dashboard (#/dashboard, product-design-v3 Part A, mockup v6) ----
  'nav.dashboard': 'Bảng điều hành',
  'dash.title': 'Bảng điều hành',
  'dash.intro': 'Ghim query của bạn thành card để theo dõi. Card chạy lại mỗi lần mở trang này, nên query phải chạy dưới 2 giây. Dạng card mở dần theo kỹ năng bạn học.',
  'dash.teaser': '{open}/{total} ô đã mở · {cards} card của bạn',
  'dash.company': 'Số liệu công ty',
  'dash.companyOpen': '{n}/{total} ô đã mở',
  'dash.companyIntro': 'Mỗi ô mở khi bạn xong việc của nó. Ô công ty chỉ ẩn được, không xóa hay sửa.',
  'dash.hide': 'Ẩn ô: {title}',
  'dash.show': 'Hiện lại: {title}',
  'dash.hidden': 'Ô đã ẩn ({n})',
  'dash.hiddenDone': 'Đã ẩn ô {title}.',
  'dash.shownDone': 'Đã hiện lại ô {title}.',
} satisfies Record<string, Msg>;
```

**Sửa `src/main.ts`** — thay:
```ts
import { buildDiagnostics, diagnosticsText } from './diagnostics';
import { applyStatic, setLang, t, type Lang } from './i18n';
import { MyData } from './import/myData';
```
bằng:
```ts
import { buildDiagnostics, diagnosticsText } from './diagnostics';
import { applyStatic, loadLang, setLang, t, type Lang } from './i18n';
import { MyData } from './import/myData';
```

**Sửa `src/main.ts`** — thay:
```ts
import { renderData } from './ui/dataView';
```
bằng:
```ts
import { renderData } from './ui/dataView';
import { renderDashboard } from './ui/dashboard';
```

**Sửa `src/main.ts`** — thay:
```ts

// Ticket text is a lazy chunk (src/content.ts): say so while it loads, and offer a reload if it fails.
// Nothing else is drawn yet, so the banner is set by hand; renderNotice() owns it from the first rerender on.
```
bằng:
```ts

// Ticket text and the EN dictionary are lazy chunks (src/content.ts, src/i18n): say so while they load (in VI until EN is in),
// and offer a reload if one fails.
// Nothing else is drawn yet, so the banner is set by hand; renderNotice() owns it from the first rerender on.
```

**Sửa `src/main.ts`** — thay:
```ts
try {
  await loadContent();
} catch (e) {
```
bằng:
```ts
try {
  await Promise.all([loadContent(), loadLang()]);
} catch (e) {
```

**Sửa `src/main.ts`** — thay:
```ts
  if (!byId('data').hidden) renderData(byId('data'));
  renderLeft(byId('ticket'));
```
bằng:
```ts
  if (!byId('data').hidden) renderData(byId('data'));
  if (!byId('dashboard').hidden) renderDashboard(byId('dashboard'));
  renderLeft(byId('ticket'));
```

**Sửa `src/main.ts`** — thay:
```ts
let shownRoute: Route | undefined;
/** #/ = Home, #/play = workspace, #/data = Data page. All stay mounted and only toggle `hidden`, so the editor is never recreated. */
function showRoute(r: Route, initial: boolean): void {
```
bằng:
```ts
let shownRoute: Route | undefined;
/** #/ = Home, #/play = workspace, #/data = Data page, #/dashboard. All stay mounted and only toggle `hidden`, so the editor is never recreated. */
function showRoute(r: Route, initial: boolean): void {
```

**Sửa `src/main.ts`** — thay:
```ts
  byId('data').hidden = r !== 'data';
  byId('shell').hidden = r !== 'play';
  if (r !== 'home') leftHome(); // Home marks containers added after this moment as "New"
  rerender(); // nav aria-current, Home numbers, Data page
  if (!initial) byId(r === 'home' ? 'home-title' : r === 'data' ? 'data-title' : 'brief-title').focus();
}
```
bằng:
```ts
  byId('data').hidden = r !== 'data';
  byId('dashboard').hidden = r !== 'dashboard';
  byId('shell').hidden = r !== 'play';
  if (r !== 'home') leftHome(); // Home marks containers added after this moment as "New"
  rerender(); // nav aria-current, Home numbers, Data page, dashboard
  if (!initial) byId({ home: 'home-title', data: 'data-title', dashboard: 'dashboard-title', play: 'brief-title' }[r]).focus();
}
```

**Sửa `src/main.ts`** — thay:
```ts
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-lang]')) {
  b.addEventListener('click', () => {
    setLang(b.dataset.lang as Lang);
    rerender();
    panel.refresh();
  });
}
```
bằng:
```ts
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-lang]')) {
  b.addEventListener('click', () => void setLang(b.dataset.lang as Lang).then(() => { // EN may need its chunk first
    rerender();
    panel.refresh();
  }));
}
```

**Sửa `src/route.ts`** — thay:
```ts
/** Hash routes without a framework. Practice and Sandbox (Plan 1c) are modes inside 'play', not routes. */
export const ROUTES = ['home', 'play', 'data'] as const;
export type Route = (typeof ROUTES)[number];
```
bằng:
```ts
/** Hash routes without a framework. Practice and Sandbox (Plan 1c) are modes inside 'play', not routes. */
export const ROUTES = ['home', 'play', 'data', 'dashboard'] as const;
export type Route = (typeof ROUTES)[number];
```

**Sửa `src/route.ts`** — thay:
```ts

const HASH: Record<Route, string> = { home: '#/', play: '#/play', data: '#/data' };
export const hashOf = (r: Route): string => HASH[r];
```
bằng:
```ts

const HASH: Record<Route, string> = { home: '#/', play: '#/play', data: '#/data', dashboard: '#/dashboard' };
export const hashOf = (r: Route): string => HASH[r];
```

**Tạo `src/ui/dashboard.ts`:**
```ts
import type { QueryResult } from '../db/run';
import { chapterOfId, KPIS, kpiTiles, kpiValue, type Kpi, type KpiTile, type KpiValue } from '../home';
import { getLang, t } from '../i18n';
import { stepKey } from '../save';
import { app, done, persist } from '../state';
import { CARD, cx } from '../theme';
import { textOf, type Ticket } from '../tickets';
import { byId, h } from './dom';
import { icon, isIconName, type IconName } from './icons';

/** #/dashboard (product-design-v3 Part A, L48/L49): player cards first, then the company tiles from content/kpis.yml. */

/** Solution results per step, run once per session and only for open tiles (an open tile = task already solved: nothing leaks). */
const kpiRuns = new Map<string, Promise<QueryResult>>();
function kpiResult(tk: Ticket, step: number): Promise<QueryResult> {
  const key = stepKey(tk.id, step);
  let run = kpiRuns.get(key);
  if (!run) {
    run = app.run(tk.steps[step].solution); // DbClient queues it until the database is ready
    kpiRuns.set(key, run);
    run.catch(() => kpiRuns.delete(key)); // a failed run is retried on the next draw
  }
  return run;
}

const BIG = 'm-0 text-3xl font-bold tabular-nums';
const KIND_ICON: Record<Kpi['kind'], IconName> = { number: 'hash', rowcount: 'list', bar: 'chart' };
const kpiIcon = (k: Kpi): IconName => (k.icon && isIconName(k.icon) ? k.icon : KIND_ICON[k.kind]);
const ICON_BTN = 'grid size-10 shrink-0 place-items-center p-0 sm:size-8';

/** Screen-reader line for moves, hides and unpins (the button that was pressed may be gone after the redraw). */
const announce = (text: string): void => {
  byId('announce').textContent = text;
};

/**
 * L42: the rounded value shows, the exact one is in `title` (hover) and in the screen-reader text.
 * L23: neutral text and bars, numbers in tabular figures; colour stays in small badges.
 */
export function kpiView(v: KpiValue, unit: string): HTMLElement {
  const unitEl = unit ? h('span', { class: 'text-base font-medium text-muted', 'aria-hidden': 'true' }, unit) : null;
  if ('text' in v) {
    return h('p', { class: cx(BIG, 'flex flex-wrap items-baseline gap-x-1.5'), title: unit ? `${v.full} ${unit}` : v.full },
      h('span', { 'aria-hidden': 'true' }, v.text), unitEl,
      h('span', { class: 'sr-only' }, unit ? `${v.full} ${unit}` : v.full));
  }
  const max = Math.max(1, ...v.bars.map((b) => b.value));
  return h('ul', { class: 'm-0 list-none space-y-1.5 p-0' }, ...v.bars.map((b) =>
    h('li', { class: 'grid grid-cols-[minmax(0,8rem)_1fr_auto] items-center gap-2 text-sm', title: `${b.label}: ${b.full}${unit ? ` ${unit}` : ''}` },
      h('span', { class: 'truncate' }, b.label),
      h('span', { class: 'h-2.5 rounded bg-slate-500 dark:bg-slate-400', style: `width:${Math.round((b.value / max) * 100)}%`, 'aria-hidden': 'true' }),
      h('span', { class: 'tabular-nums' }, b.text, unit ? h('span', { class: 'text-muted' }, ` ${unit}`) : null))));
}

function setHidden(id: string, hide: boolean, label: string, redraw: () => void): void {
  const d = app.save.dashboard;
  d.hidden = hide ? [...d.hidden, id] : d.hidden.filter((x) => x !== id);
  persist(true);
  redraw();
  byId('dash-company-title').focus(); // the pressed button is gone after the redraw
  announce(t(hide ? 'dash.hiddenDone' : 'dash.shownDone', { title: label }));
}

/** ui-ux-v3 §c: icon + label, then the big value with its unit, then the source line. Company tiles can only be hidden (L49). */
function kpiTile(tile: KpiTile, redraw: () => void): HTMLElement {
  const lang = getLang();
  const { kpi, ticket } = tile;
  const open = tile.open && !!ticket;
  const unit = kpi.unit?.[lang] ?? '';
  const value = h('div', { class: 'min-h-9' });
  if (open) {
    value.append(h('p', { class: cx(BIG, 'text-muted') }, '…'));
    kpiResult(ticket, kpi.step).then(
      (r) => value.replaceChildren(kpiView(kpiValue(kpi, r, lang), unit)),
      () => value.replaceChildren(h('p', { class: cx(BIG, 'text-muted') }, '—')));
  } else {
    value.append(h('p', { class: cx(BIG, 'text-muted') }, ticket ? '—' : '???'));
  }
  const foot = open ? t('home.kpiFrom', { title: textOf(ticket, lang).title })
    : ticket ? t('home.kpiLocked', { n: ticket.chapter, title: textOf(ticket, lang).title, name: ticket.from.name })
      : t('home.kpiLater', { n: chapterOfId(kpi.ticket) });
  const label = kpi.label[lang];
  return h('article', { class: cx(CARD, 'flex flex-col gap-3 p-4') },
    h('div', { class: 'flex items-start gap-3' },
      h('span', { class: cx('grid size-9 shrink-0 place-items-center rounded-lg', open ? 'bg-code text-ink' : 'bg-code text-muted') }, icon(kpiIcon(kpi))),
      h('h3', { class: 'm-0 flex-1 self-center text-sm leading-snug font-medium' }, label),
      h('button', { type: 'button', class: ICON_BTN, title: t('dash.hide', { title: label }), 'aria-label': t('dash.hide', { title: label }), onclick: () => setHidden(kpi.id, true, label, redraw) },
        icon('eyeOff', 'size-4'))),
    value,
    h('p', { class: 'mt-auto mb-0 flex items-start gap-1.5 text-sm text-muted' }, icon(open ? 'link' : 'lock', 'mt-0.5 size-4'), h('span', {}, foot)));
}

function companySection(redraw: () => void): HTMLElement {
  const lang = getLang();
  const tiles = kpiTiles(KPIS, app.tickets, done());
  const hidden = new Set(app.save.dashboard.hidden);
  const shown = tiles.filter((x) => !hidden.has(x.kpi.id));
  const gone = tiles.filter((x) => hidden.has(x.kpi.id));
  return h('section', { 'aria-labelledby': 'dash-company-title' },
    h('div', { class: 'flex flex-wrap items-baseline gap-x-3' },
      h('h2', { id: 'dash-company-title', tabindex: '-1', class: 'm-0 text-lg font-bold' }, t('dash.company')),
      h('span', { class: 'text-sm text-muted' }, t('dash.companyOpen', { n: tiles.filter((x) => x.open).length, total: tiles.length }))),
    h('p', { class: 'mt-1 mb-3 text-[15px] text-muted' }, t('dash.companyIntro')),
    h('div', { class: 'grid gap-4 sm:grid-cols-2 lg:grid-cols-4' }, ...shown.map((x) => kpiTile(x, redraw))),
    gone.length
      ? h('details', { class: 'mt-3' },
        h('summary', { class: 'cursor-pointer text-sm text-muted' }, t('dash.hidden', { n: gone.length })),
        h('ul', { class: 'mt-2 list-none space-y-1 p-0' }, ...gone.map((x) => h('li', {},
          h('button', { type: 'button', class: 'flex items-center gap-2 px-2 py-1 text-sm', onclick: () => setHidden(x.kpi.id, false, x.kpi.label[lang], redraw) },
            icon('eye', 'size-4'), t('dash.show', { title: x.kpi.label[lang] }))))))
      : null);
}

/** Redrawn by main.ts (route shown, language switch, progress); main.ts focuses the title after a route change. */
export function renderDashboard(host: HTMLElement): void {
  const redraw = (): void => renderDashboard(host);
  host.replaceChildren(h('div', { class: 'mx-auto max-w-6xl space-y-6 px-4 py-6' },
    h('header', {},
      h('h1', { id: 'dashboard-title', tabindex: '-1', class: 'm-0 text-2xl font-bold' }, t('dash.title')),
      h('p', { class: 'mt-1 mb-0 max-w-3xl text-[15px] text-muted' }, t('dash.intro'))),
    companySection(redraw)));
}
```

**Sửa `src/ui/homeView.ts`** — thay:
```ts
import type { QueryResult } from '../db/run';
import { chapterOfId, homeModel, KPIS, kpiTiles, kpiValue, LEVELS, type ChapterCard, type HomeModel, type Kpi, type KpiTile, type KpiValue, type SkillCard } from '../home';
import { getLang, t, type Key } from '../i18n';
```
bằng:
```ts
import { homeModel, KPIS, kpiTiles, LEVELS, type ChapterCard, type HomeModel, type SkillCard } from '../home';
import { getLang, t, type Key } from '../i18n';
```

**Sửa `src/ui/homeView.ts`** — thay:
```ts
import { upsert } from '../registry';
import { stepKey } from '../save';
import { textOf, type Ticket } from '../tickets';
import { avatar } from './avatar';
import { icon, isIconName, skillIcon, type IconName } from './icons';
import { byId, h, nodes } from './dom';
```
bằng:
```ts
import { upsert } from '../registry';
import { hashOf } from '../route';
import { textOf } from '../tickets';
import { avatar } from './avatar';
import { icon, skillIcon, type IconName } from './icons';
import { byId, h, nodes } from './dom';
```

**Sửa `src/ui/homeView.ts`** — thay:
```ts

/** Solution results per step, run once per session and only for open tiles (an open tile = task already solved: nothing leaks). */
const kpiRuns = new Map<string, Promise<QueryResult>>();
function kpiResult(tk: Ticket, step: number): Promise<QueryResult> {
  const key = stepKey(tk.id, step);
  let run = kpiRuns.get(key);
  if (!run) {
    run = app.run(tk.steps[step].solution); // DbClient queues it until the database is ready
    kpiRuns.set(key, run);
    run.catch(() => kpiRuns.delete(key)); // a failed run is retried on the next draw
  }
  return run;
}

const BIG = 'm-0 text-3xl font-bold tabular-nums';
const KIND_ICON: Record<Kpi['kind'], IconName> = { number: 'hash', rowcount: 'list', bar: 'chart' };
const kpiIcon = (k: Kpi): IconName => (k.icon && isIconName(k.icon) ? k.icon : KIND_ICON[k.kind]);

/**
 * L42: the rounded value shows, the exact one is in `title` (hover) and in the screen-reader text.
 * L23: neutral text and bars, numbers in tabular figures; colour stays in small badges.
 */
function kpiView(v: KpiValue, unit: string): HTMLElement {
  const unitEl = unit ? h('span', { class: 'text-base font-medium text-muted', 'aria-hidden': 'true' }, unit) : null;
  if ('text' in v) {
    return h('p', { class: cx(BIG, 'flex flex-wrap items-baseline gap-x-1.5'), title: unit ? `${v.full} ${unit}` : v.full },
      h('span', { 'aria-hidden': 'true' }, v.text), unitEl,
      h('span', { class: 'sr-only' }, unit ? `${v.full} ${unit}` : v.full));
  }
  const max = Math.max(1, ...v.bars.map((b) => b.value));
  return h('ul', { class: 'm-0 list-none space-y-1.5 p-0' }, ...v.bars.map((b) =>
    h('li', { class: 'grid grid-cols-[minmax(0,8rem)_1fr_auto] items-center gap-2 text-sm', title: `${b.label}: ${b.full}${unit ? ` ${unit}` : ''}` },
      h('span', { class: 'truncate' }, b.label),
      h('span', { class: 'h-2.5 rounded bg-slate-500 dark:bg-slate-400', style: `width:${Math.round((b.value / max) * 100)}%`, 'aria-hidden': 'true' }),
      h('span', { class: 'tabular-nums' }, b.text, unit ? h('span', { class: 'text-muted' }, ` ${unit}`) : null))));
}

/** ui-ux-v3 §c: icon + label, then the big value with its unit, then the source line. Static card: no hover lift. */
function kpiTile(tile: KpiTile): HTMLElement {
  const lang = getLang();
  const { kpi, ticket } = tile;
  const open = tile.open && !!ticket;
  const unit = kpi.unit?.[lang] ?? '';
  const value = h('div', { class: 'min-h-9' });
  if (open) {
    value.append(h('p', { class: cx(BIG, 'text-muted') }, '…'));
    kpiResult(ticket, kpi.step).then(
      (r) => value.replaceChildren(kpiView(kpiValue(kpi, r, lang), unit)),
      () => value.replaceChildren(h('p', { class: cx(BIG, 'text-muted') }, '—')));
  } else {
    value.append(h('p', { class: cx(BIG, 'text-muted') }, ticket ? '—' : '???'));
  }
  const foot = open ? t('home.kpiFrom', { title: textOf(ticket, lang).title })
    : ticket ? t('home.kpiLocked', { n: ticket.chapter, title: textOf(ticket, lang).title, name: ticket.from.name })
      : t('home.kpiLater', { n: chapterOfId(kpi.ticket) });
  return h('article', { class: cx(CARD, 'flex flex-col gap-3 p-4') },
    h('div', { class: 'flex items-start gap-3' },
      h('span', { class: cx('grid size-9 shrink-0 place-items-center rounded-lg', open ? 'bg-code text-ink' : 'bg-code text-muted') }, icon(kpiIcon(kpi))),
      h('h3', { class: 'm-0 self-center text-sm leading-snug font-medium' }, kpi.label[lang])),
    value,
    h('p', { class: 'mt-auto mb-0 flex items-start gap-1.5 text-sm text-muted' }, icon(open ? 'link' : 'lock', 'mt-0.5 size-4'), h('span', {}, foot)));
}

function kpiSection(): HTMLElement {
  return h('section', { 'aria-labelledby': 'kpi-title' },
    h('h2', { id: 'kpi-title', class: 'm-0 text-lg font-bold' }, t('home.kpi')),
    h('p', { class: 'mt-1 mb-3 text-[15px] text-muted' }, t('home.kpiIntro')),
    h('div', { class: 'grid gap-4 sm:grid-cols-2 lg:grid-cols-4' }, ...kpiTiles(KPIS, app.tickets, done()).map(kpiTile)));
}
```
bằng:
```ts

/** L48 D-A1: the company tiles moved to #/dashboard (src/ui/dashboard.ts); Home keeps a one-line teaser that links there. */
function kpiSection(): HTMLElement {
  const tiles = kpiTiles(KPIS, app.tickets, done());
  return h('a', { href: hashOf('dashboard'), class: cx(CARD_ACTION, 'group flex items-center gap-3 p-4 text-ink no-underline') },
    h('span', { class: 'grid size-9 shrink-0 place-items-center rounded-lg bg-code', 'aria-hidden': 'true' }, icon('chart')),
    h('span', { class: 'min-w-0 flex-1' }, h('b', {}, t('dash.title')), ' · ',
      t('dash.teaser', { open: tiles.filter((x) => x.open).length, total: tiles.length, cards: app.save.dashboard.cards.length })),
    icon('arrowRight', 'size-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-accent'));
}
```

**Sửa `src/ui/topbar.ts`** — thay:
```ts
registerNav({ id: 'play', order: 20, label: 'nav.play', href: hashOf('play'), current: (r) => r === 'play' });
```
bằng:
```ts
registerNav({ id: 'play', order: 20, label: 'nav.play', href: hashOf('play'), current: (r) => r === 'play' });
// L49: six items (mobile: a 3×2 grid); Practice, Sandbox (ui/modes.ts) and Data (ui/dataView.ts) register their own.
registerNav({ id: 'dashboard', order: 60, label: 'nav.dashboard', href: hashOf('dashboard'), current: (r) => r === 'dashboard' });
```

- [ ] **Step 4: Chạy test, ngân sách, commit**

Run: `npm test && npx tsc --noEmit && npm run build && node scripts/check-budget.mjs`
Expected:
- Mọi test PASS.
- `main ≈ 260 / 270`, `en ≈ 12 / 20`.

```bash
git add index.html scripts/check-budget.mjs src/i18n/en.ts src/i18n/index.ts src/i18n/vi.ts src/main.ts src/route.ts src/ui/dashboard.ts src/ui/homeView.ts src/ui/topbar.ts tests/route.test.ts tests/setup.ts tests/startup.test.ts
git commit -m "dashboard P1: #/dashboard with the company tiles, six-item nav, Home teaser; EN dictionary as a lazy chunk (Plan 5 T3, T7)

Claude-Session: https://claude.ai/code/session_01PwPSBV1SVDP6quEZfKN56M"
```

---

### Task 5: Bảng điều hành P2 (Ghim lên, card của người chơi)

**Files:**
- Create: `src/ui/pin.ts`
- Modify: `src/dashboard.ts`, `src/db/run.ts`, `src/ui/chartView.ts`, `src/ui/tabs.ts`, `src/ui/dashboard.ts`, `src/main.ts`, `src/i18n/vi.ts`, `src/i18n/en.ts`, `tests/dashboard.test.ts`

**Interfaces:**
- Consumes: `Card`, `pinBlock`, `valueCols`, `moveCard`, `nextCardId` (Task 3).
- Produces:
  - `QueryResult.ms`.
  - `cardRunner(run, onSlow)` → `{ result(card), forget(id) }`.
  - `cardBody(card, result)`, `KIND_LABEL`, `skillOf` (`ui/dashboard.ts`).
  - `pinBar(editorSql)` (`ui/pin.ts`).
  - `registerCoreTabs(editorSql, bar?)`.
  - Khóa `dash.*`, `card.*`, `pin.*`.

- [ ] **Step 1: Viết test (chạy lần lượt, mỗi phiên một lần; quá giờ → chỉ card đó chậm; khởi động lại → chạy lại; `ms`)**

**Sửa `tests/dashboard.test.ts`** — thay:
```ts
import { describe, expect, it } from 'vitest';
import { KIND_SKILL, moveCard, nextCardId, PIN_MAX_MS, pinBlock, valueCols, type Card } from '../src/dashboard';
import type { QueryResult } from '../src/db/run';
```
bằng:
```ts
import { describe, expect, it } from 'vitest';
import { cardRunner, KIND_SKILL, moveCard, nextCardId, PIN_MAX_MS, pinBlock, valueCols, type Card } from '../src/dashboard';
import { DbRestartError, QueryTimeoutError } from '../src/db/client';
import { runSandboxed, type QueryResult } from '../src/db/run';
import { seededDb } from './helpers';
```

**Thêm vào cuối `tests/dashboard.test.ts`:**
```ts

describe('chạy card (cardRunner, product-design-v3 §7)', () => {
  const ok: QueryResult = { columns: ['n'], types: [20], rows: [[1]] };
  const sqlCard = (id: string, sql: string): Card => ({ ...card(id), sql });

  it('mỗi card chạy một lần mỗi phiên, lần lượt từng card', async () => {
    const order: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const run = async (sql: string) => {
      order.push(`start ${sql}`);
      if (sql === 'A') await gate;
      order.push(`end ${sql}`);
      return ok;
    };
    const cards = cardRunner(run, () => {});
    const a = cards.result(sqlCard('a', 'A'));
    const b = cards.result(sqlCard('b', 'B'));
    await Promise.resolve();
    expect(order).toEqual(['start A']); // B waits for A
    release();
    await Promise.all([a, b]);
    expect(order).toEqual(['start A', 'end A', 'start B', 'end B']);
    await cards.result(sqlCard('a', 'A'));
    expect(order.filter((x) => x === 'start A')).toHaveLength(1); // cached for the session
    cards.forget('a');
    await cards.result(sqlCard('a', 'A'));
    expect(order.filter((x) => x === 'start A')).toHaveLength(2);
    await cards.result(sqlCard('a', 'B')); // same id from an imported save, other SQL: runs its own SQL
    expect(order.filter((x) => x === 'start B')).toHaveLength(2);
  });

  it('quá giờ → chỉ card đó bị đánh dấu chậm; card bị cắt ngang do khởi động lại thì chạy lại lần sau', async () => {
    const slow: string[] = [];
    let calls = 0;
    const run = async (sql: string) => {
      calls++;
      if (sql === 'SLOW') throw new QueryTimeoutError(5000);
      if (sql === 'CUT' && calls < 4) throw new DbRestartError();
      return ok;
    };
    const cards = cardRunner(run, (id) => slow.push(id));
    await expect(cards.result(sqlCard('s', 'SLOW'))).rejects.toBeInstanceOf(QueryTimeoutError);
    await expect(cards.result(sqlCard('c', 'CUT'))).rejects.toBeInstanceOf(DbRestartError);
    await expect(cards.result(sqlCard('d', 'OK'))).resolves.toBe(ok); // the chain goes on after a failure
    expect(slow).toEqual(['s']);
    await expect(cards.result(sqlCard('c', 'CUT'))).resolves.toBe(ok); // forgotten after the restart, so it ran again
  });
});

describe('thời gian chạy trong kết quả (luật 2 s khi ghim)', () => {
  it('runSandboxed ghi ms của câu lệnh', async () => {
    const r = await runSandboxed(await seededDb(), 'SELECT count(*) FROM shipments');
    expect(Number.isInteger(r.ms)).toBe(true);
    expect(r.ms).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/dashboard.test.ts`
Expected: FAIL (`cardRunner` chưa có).

- [ ] **Step 3: `ms`, `cardRunner`, thanh ghim + hộp thoại, card trên trang**

**Sửa `src/dashboard.ts`** — thay:
```ts
import type { QueryResult } from './db/run';
```
bằng:
```ts
import { DbRestartError, QueryTimeoutError } from './db/client';
import type { QueryResult } from './db/run';
```

**Thêm vào cuối `src/dashboard.ts`:**
```ts

/**
 * Player cards run once per session, one after another (a card waits for the previous one), through the DbClient queue
 * (product-design-v3 §7). A timeout restarts the worker: only that card is reported to `onSlow` (the UI saves it as slow and
 * never runs it by itself again); cards cut short by the restart are forgotten and run on the next draw. Results are not
 * saved: the seed is deterministic and every query is rolled back, so they cannot change within a build.
 */
export function cardRunner(run: (sql: string) => Promise<QueryResult>, onSlow: (id: string) => void) {
  // Keyed by id and SQL: ids repeat across saves (c1, c2…), so an imported save's c1 must not reuse the old c1's result.
  const runs = new Map<string, Promise<QueryResult>>();
  const keyOf = (c: Card): string => `${c.id}
${c.sql}`;
  let chain: Promise<unknown> = Promise.resolve();
  return {
    result(c: Card): Promise<QueryResult> {
      const k = keyOf(c);
      let p = runs.get(k);
      if (!p) {
        p = chain.then(() => run(c.sql));
        chain = p.catch(() => {});
        runs.set(k, p);
        p.catch((e: unknown) => {
          if (e instanceof DbRestartError) runs.delete(k);
          if (e instanceof QueryTimeoutError) onSlow(c.id);
        });
      }
      return p;
    },
    /** "Chạy lại", unpin: the next result() runs the card again. */
    forget(id: string): void {
      for (const k of runs.keys()) if (k.startsWith(`${id}
`)) runs.delete(k);
    },
  };
}
```

**Sửa `src/db/run.ts`** — thay:
```ts
  truncated?: true;
}
```
bằng:
```ts
  truncated?: true;
  /** Time the statement took inside the worker (ms, rounded), without the queue wait. Plan 5: the 2 s pin rule. */
  ms?: number;
}
```

**Sửa `src/db/run.ts`** — thay:
```ts
  try {
    const r = await db.query<unknown[]>(sql, [], { rowMode: 'array' });
```
bằng:
```ts
  try {
    const t0 = performance.now();
    const r = await db.query<unknown[]>(sql, [], { rowMode: 'array' });
```

**Sửa `src/db/run.ts`** — thay:
```ts
      rows: r.rows.length > maxRows ? r.rows.slice(0, maxRows) : r.rows,
    };
```
bằng:
```ts
      rows: r.rows.length > maxRows ? r.rows.slice(0, maxRows) : r.rows,
      ms: Math.round(performance.now() - t0),
    };
```

**Sửa `src/i18n/en.ts`** — thay:
```ts
  'dash.shownDone': 'Tile {title} shown again.',
};
```
bằng:
```ts
  'dash.shownDone': 'Tile {title} shown again.',
  'dash.mine': 'Your cards',
  'dash.count': '{n}/{max} cards',
  'dash.toSandbox': 'Make a card in the Sandbox',
  'dash.kinds': 'Card types:',
  'dash.emptyTitle': 'Pin your first query',
  'dash.empty': 'Run a query in the Sandbox or solve a task, then press "Pin" on the Result tab.',
  'dash.full': 'The dashboard has {max} cards. Unpin one before pinning a new one.',
  'dash.slowTitle': 'Slow · no longer runs by itself',
  'dash.slow': 'Last time this query ran for more than 5 seconds, so the database had to restart. Try a narrower time window, or group before joining.',
  'dash.retrySlow': 'Try again',
  'dash.waiting': 'Waiting to run…',
  'dash.ran': 'ran in {ms} ms',
  'dash.sql': 'Show SQL',
  'dash.rerun': 'Run again: {title}',
  'dash.up': 'Move up: {title}',
  'dash.down': 'Move down: {title}',
  'dash.unpin': 'Unpin: {title}',
  'dash.moved': 'Moved {title} to position {i} of {n}.',
  'dash.unpinned': 'Unpinned {title}.',
  'card.fromSandbox': 'Your SQL · Sandbox',
  'card.fromTask': 'Your SQL · task "{title}"',
  'card.yours': 'Your SQL',
  'card.kind.table': 'Table',
  'card.kind.number': 'Number',
  'card.kind.bar': 'Bar',
  'card.kind.line': 'Line',
  'card.rowsShown': 'Showing {n} of {total} rows',
  'pin.button': 'Pin',
  'pin.title': 'Pin to the dashboard',
  'pin.stale': 'Run it again before pinning',
  'pin.kind': 'Card type',
  'pin.kindLocked': 'opens with {skill} (ch. {n})',
  'pin.kindNoFit': 'does not fit this result',
  'pin.cardTitle': 'Title',
  'pin.col': 'Value column',
  'pin.colOption': '{name} (column {i})',
  'pin.preview': 'Preview',
  'pin.fast': 'The query ran in {ms} ms · fast enough to pin',
  'pin.slow': 'The query ran in {s} s, over 2 s, so it cannot be pinned.',
  'pin.slowHelp': 'Cards run again every time the dashboard opens, so they must be fast. Try grouping before joining, or a narrower time window (chapter 11 teaches how to read EXPLAIN). Change the query, press Run, then pin again.',
  'pin.long': 'The SQL is longer than {max} characters, so it cannot be pinned.',
  'pin.cancel': 'Cancel',
  'pin.confirm': 'Pin it',
  'pin.needTitle': 'Give the card a title.',
  'pin.done': 'Pinned "{title}" to the dashboard.',
};
```

**Sửa `src/i18n/vi.ts`** — thay:
```ts
  'dash.shownDone': 'Đã hiện lại ô {title}.',
} satisfies Record<string, Msg>;
```
bằng:
```ts
  'dash.shownDone': 'Đã hiện lại ô {title}.',
  'dash.mine': 'Card của bạn',
  'dash.count': '{n}/{max} card',
  'dash.toSandbox': 'Tạo card trong Sandbox',
  'dash.kinds': 'Dạng card:',
  'dash.emptyTitle': 'Ghim query đầu tiên của bạn',
  'dash.empty': 'Chạy một query trong Sandbox hoặc nộp đúng một việc, rồi bấm "Ghim lên" ở tab Kết quả.',
  'dash.full': 'Bảng đã đủ {max} card. Bỏ ghim một card trước khi ghim card mới.',
  'dash.slowTitle': 'Chậm · không tự chạy nữa',
  'dash.slow': 'Lần trước query chạy quá 5 giây nên database phải khởi động lại. Thử lọc khung thời gian hẹp hơn hoặc gom trước khi nối bảng.',
  'dash.retrySlow': 'Chạy thử lại',
  'dash.waiting': 'Đang chờ chạy…',
  'dash.ran': 'chạy {ms} ms',
  'dash.sql': 'Xem SQL',
  'dash.rerun': 'Chạy lại: {title}',
  'dash.up': 'Dời lên: {title}',
  'dash.down': 'Dời xuống: {title}',
  'dash.unpin': 'Bỏ ghim: {title}',
  'dash.moved': 'Đã dời {title} tới vị trí {i}/{n}.',
  'dash.unpinned': 'Đã bỏ ghim {title}.',
  'card.fromSandbox': 'SQL của bạn · Sandbox',
  'card.fromTask': 'SQL của bạn · việc "{title}"',
  'card.yours': 'SQL của bạn',
  'card.kind.table': 'Bảng',
  'card.kind.number': 'Số',
  'card.kind.bar': 'Cột',
  'card.kind.line': 'Đường',
  'card.rowsShown': 'Đang hiện {n}/{total} dòng',
  'pin.button': 'Ghim lên',
  'pin.title': 'Ghim lên bảng điều hành',
  'pin.stale': 'Chạy lại trước khi ghim',
  'pin.kind': 'Dạng card',
  'pin.kindLocked': 'mở khi học {skill} (ch. {n})',
  'pin.kindNoFit': 'không hợp với kết quả này',
  'pin.cardTitle': 'Tiêu đề',
  'pin.col': 'Cột số',
  'pin.colOption': '{name} (cột {i})',
  'pin.preview': 'Xem trước',
  'pin.fast': 'Query chạy {ms} ms · đủ nhanh để ghim',
  'pin.slow': 'Query chạy {s} s, quá 2 s nên không ghim được.',
  'pin.slowHelp': 'Card chạy lại mỗi lần mở bảng điều hành, nên phải nhanh. Thử gom trước rồi mới nối bảng, hoặc lọc khung thời gian hẹp hơn (chương 11 dạy cách đọc EXPLAIN). Sửa query, bấm Chạy, rồi ghim lại.',
  'pin.long': 'SQL dài quá {max} ký tự nên không ghim được.',
  'pin.cancel': 'Hủy',
  'pin.confirm': 'Ghim',
  'pin.needTitle': 'Đặt tiêu đề cho card.',
  'pin.done': 'Đã ghim "{title}" lên bảng điều hành.',
} satisfies Record<string, Msg>;
```

**Sửa `src/main.ts`** — thay:
```ts
import { createPanel, registerCoreTabs } from './ui/tabs';
import { initLayout } from './ui/splitter';
```
bằng:
```ts
import { createPanel, registerCoreTabs } from './ui/tabs';
import { pinBar } from './ui/pin';
import { initLayout } from './ui/splitter';
```

**Sửa `src/main.ts`** — thay:
```ts

registerCoreTabs(() => work.currentSql());
registerVizTabs({ db, show: (id) => panel.show(id), active: () => panel.active, editorSql: () => work.currentSql() });
```
bằng:
```ts

registerCoreTabs(() => work.currentSql(), () => pinBar(() => work.currentSql()));
registerVizTabs({ db, show: (id) => panel.show(id), active: () => panel.active, editorSql: () => work.currentSql() });
```

**Sửa `src/ui/chartView.ts`** — thay:
```ts

function bars(r: QueryResult, spec: ChartSpec, col: number, color: ChapterColor): SVGSVGElement {
  const rowH = 24;
```
bằng:
```ts

/** Also drawn small on dashboard cards (src/ui/dashboard.ts). */
export function bars(r: QueryResult, spec: ChartSpec, col: number, color: ChapterColor): SVGSVGElement {
  const rowH = 24;
```

**Sửa `src/ui/chartView.ts`** — thay:
```ts

function line(r: QueryResult, spec: ChartSpec, col: number, color: ChapterColor): SVGSVGElement {
  const H = 260;
```
bằng:
```ts

export function line(r: QueryResult, spec: ChartSpec, col: number, color: ChapterColor): SVGSVGElement {
  const H = 260;
```

**Sửa `src/ui/dashboard.ts`** — thay:
```ts
import type { QueryResult } from '../db/run';
import { chapterOfId, KPIS, kpiTiles, kpiValue, type Kpi, type KpiTile, type KpiValue } from '../home';
import { getLang, t } from '../i18n';
import { stepKey } from '../save';
import { app, done, persist } from '../state';
import { CARD, cx } from '../theme';
import { textOf, type Ticket } from '../tickets';
import { byId, h } from './dom';
import { icon, isIconName, type IconName } from './icons';
```
bằng:
```ts
import { BAR_ROWS, CARD_KINDS, cardRunner, cardSpec, KIND_SKILL, MAX_CARDS, moveCard, TABLE_ROWS, type Card, type CardKind } from '../dashboard';
import { QueryTimeoutError } from '../db/client';
import type { QueryResult } from '../db/run';
import { chapterOfId, KPIS, kpiNumber, kpiTiles, kpiValue, learnedSkills, type Kpi, type KpiTile, type KpiValue } from '../home';
import { getLang, t, type Key } from '../i18n';
import { SKILLS } from '../progress';
import { stepKey } from '../save';
import { app, done, persist } from '../state';
import { BTN_GO, CARD, chapterColor, cx } from '../theme';
import { textOf, type Ticket } from '../tickets';
import { MAX_POINTS } from '../viz/chart';
import { bars, line } from './chartView';
import { byId, h } from './dom';
import { errorView } from './feedback';
import { icon, isIconName, type IconName } from './icons';
import { startSandbox } from './modes';
import { renderResult } from './resultTable';
```

**Sửa `src/ui/dashboard.ts`** — thay:
```ts
      h('span', { class: 'tabular-nums' }, b.text, unit ? h('span', { class: 'text-muted' }, ` ${unit}`) : null))));
}
```
bằng:
```ts
      h('span', { class: 'tabular-nums' }, b.text, unit ? h('span', { class: 'text-muted' }, ` ${unit}`) : null))));
}

export const KIND_LABEL: Record<CardKind, Key> = { table: 'card.kind.table', number: 'card.kind.number', bar: 'card.kind.bar', line: 'card.kind.line' };
export const skillOf = (id: string) => SKILLS.find((s) => s.id === id)!;
/** "Cột: mở khi học …" chapter colour of the skill that opens the kind (product-design-v3 §8). */
const kindColor = (c: Card) => chapterColor(skillOf(KIND_SKILL[c.kind]).chapter);

/** What a card shows for its result: a big number, the first rows, bars or a line (shared with the pin dialog's preview). */
export function cardBody(c: Card, r: QueryResult): HTMLElement {
  const col = c.col ?? 0;
  if (c.kind === 'number') {
    const v = kpiNumber(Number(r.rows[0]?.[col] ?? NaN), getLang());
    return kpiView(v, '');
  }
  const cut = (n: number) => (r.rows.length > n ? h('p', { class: 'mt-1 mb-0 text-sm text-muted' }, t('card.rowsShown', { n, total: r.rows.length })) : null);
  if (c.kind === 'table') return h('div', {}, renderResult({ ...r, rows: r.rows.slice(0, TABLE_ROWS) }), cut(TABLE_ROWS));
  const spec = cardSpec(r);
  if (!spec || spec.kind !== c.kind) return h('p', { class: 'm-0 text-muted' }, t('chart.empty', { max: MAX_POINTS }));
  const n = c.kind === 'bar' ? BAR_ROWS : MAX_POINTS;
  const shown = { ...r, rows: r.rows.slice(0, n) };
  return h('div', { class: 'overflow-auto' }, c.kind === 'bar' ? bars(shown, spec, col, kindColor(c)) : line(shown, spec, col, kindColor(c)), cut(n));
}

/** Once per session, one card after another (src/dashboard.ts cardRunner); a card that timed out is saved as slow. */
const cards = cardRunner((sql) => app.run(sql), (id) => {
  const saved = app.save.dashboard.cards.find((x) => x.id === id);
  if (saved) saved.slow = true;
  persist(true);
});

/** "SQL của bạn · Sandbox" / "· việc …": where the card was pinned from. */
function sourceLine(c: Card): string {
  if (c.source === 'sandbox') return t('card.fromSandbox');
  const tk = app.tickets.find((x) => x.id === c.source);
  return tk ? t('card.fromTask', { title: textOf(tk, getLang()).title }) : t('card.yours');
}

function playerCard(c: Card, i: number, n: number, redraw: () => void): HTMLElement {
  const body = h('div', { class: 'min-h-9' });
  const ran = h('span', { class: 'tabular-nums' });
  const save = () => {
    persist(true);
    redraw();
  };
  const rerun = () => {
    cards.forget(c.id);
    delete c.slow;
    save();
  };
  if (c.slow) {
    body.append(h('div', { class: 'rounded-lg bg-amber-50 p-3 text-sm text-amber-950 ring-1 ring-amber-300 dark:bg-amber-950/40 dark:text-amber-100 dark:ring-amber-800' },
      h('p', { class: 'm-0 flex items-center gap-1.5 font-semibold' }, icon('alert', 'size-4'), t('dash.slowTitle')),
      h('p', { class: 'mt-1 mb-2' }, t('dash.slow')),
      h('button', { type: 'button', class: 'flex items-center gap-1.5 px-3 py-1', onclick: rerun }, icon('refresh', 'size-4'), t('dash.retrySlow'))));
  } else {
    body.append(h('p', { class: 'm-0 text-muted' }, t('dash.waiting')));
    cards.result(c).then((r) => {
      body.replaceChildren(cardBody(c, r));
      if (r.ms !== undefined) ran.textContent = t('dash.ran', { ms: r.ms });
    }, (e: unknown) => {
      if (e instanceof QueryTimeoutError) redraw(); // now marked slow
      else body.replaceChildren(errorView(e));
    });
  }
  const move = (dir: -1 | 1) => {
    const d = app.save.dashboard;
    d.cards = moveCard(d.cards, i, dir);
    save();
    // The moved card's same button keeps focus; at the top or bottom it is disabled, so the other arrow takes it.
    const edge = i + dir === 0 || i + dir === n - 1;
    const act = (dir < 0) !== edge ? 'up' : 'down';
    document.querySelector<HTMLElement>(`[data-card="${c.id}"][data-act="${act}"]`)?.focus();
    announce(t('dash.moved', { title: c.title, i: i + dir + 1, n }));
  };
  const btn = (act: string, name: IconName, label: string, onclick: () => void, disabled = false) =>
    h('button', { type: 'button', class: ICON_BTN, 'data-card': c.id, 'data-act': act, title: label, 'aria-label': label, disabled, onclick }, icon(name, 'size-4'));
  return h('article', { class: cx(CARD, 'flex min-w-0 flex-col gap-3 p-4') },
    h('div', { class: 'flex items-start gap-2' },
      h('span', { class: 'grid size-9 shrink-0 place-items-center rounded-lg bg-code', 'aria-hidden': 'true' }, icon(({ table: 'table', number: 'hash', bar: 'chart', line: 'lineChart' } as const)[c.kind])),
      h('h3', { class: 'm-0 min-w-0 flex-1 self-center text-sm leading-snug font-semibold break-words' }, c.title)),
    body,
    h('details', { class: 'text-sm' },
      h('summary', { class: 'cursor-pointer text-muted' }, t('dash.sql')),
      h('pre', { class: 'sql mt-2 mb-0 max-h-48 overflow-auto' }, c.sql)),
    h('div', { class: 'mt-auto flex flex-wrap items-center gap-1 text-sm text-muted' },
      h('span', { class: 'mr-auto' }, sourceLine(c), ' · ', ran),
      btn('up', 'up', t('dash.up', { title: c.title }), () => move(-1), i === 0),
      btn('down', 'down', t('dash.down', { title: c.title }), () => move(1), i === n - 1),
      btn('rerun', 'refresh', t('dash.rerun', { title: c.title }), rerun),
      btn('unpin', 'unpin', t('dash.unpin', { title: c.title }), () => {
        const d = app.save.dashboard;
        d.cards = d.cards.filter((x) => x.id !== c.id);
        cards.forget(c.id);
        save();
        byId('dash-mine-title').focus();
        announce(t('dash.unpinned', { title: c.title }));
      })));
}

function mineSection(redraw: () => void): HTMLElement {
  const lang = getLang();
  const cards = app.save.dashboard.cards;
  const learned = learnedSkills(app.tickets, done());
  const kinds = CARD_KINDS.map((k) => {
    const skill = skillOf(KIND_SKILL[k]);
    return h('span', { class: cx('rounded-md px-2 py-0.5 ring-1 ring-line', !learned.has(skill.id) && 'text-muted') },
      t(KIND_LABEL[k]), learned.has(skill.id) ? '' : ` · ${t('pin.kindLocked', { skill: skill.label[lang], n: skill.chapter })}`);
  });
  return h('section', { 'aria-labelledby': 'dash-mine-title' },
    h('div', { class: 'flex flex-wrap items-center gap-x-3 gap-y-2' },
      h('h2', { id: 'dash-mine-title', tabindex: '-1', class: 'm-0 text-lg font-bold' }, t('dash.mine')),
      h('span', { class: 'text-sm text-muted' }, t('dash.count', { n: cards.length, max: MAX_CARDS })),
      h('button', { type: 'button', class: 'ml-auto flex items-center gap-1.5 px-3 py-1 text-sm', onclick: () => startSandbox() }, icon('flask', 'size-4'), t('dash.toSandbox'))),
    h('p', { class: 'mt-2 mb-3 flex flex-wrap items-center gap-1.5 text-sm' }, h('span', { class: 'text-muted' }, t('dash.kinds')), ...kinds),
    cards.length >= MAX_CARDS ? h('p', { class: 'mb-3 text-sm', role: 'note' }, t('dash.full', { max: MAX_CARDS })) : null,
    cards.length
      ? h('div', { class: 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3' }, ...cards.map((c, i) => playerCard(c, i, cards.length, redraw)))
      : h('div', { class: cx(CARD, 'p-5') },
        h('h3', { class: 'm-0 text-base font-bold' }, t('dash.emptyTitle')),
        h('p', { class: 'mt-1 mb-3 text-[15px] text-muted' }, t('dash.empty')),
        h('button', { type: 'button', class: cx(BTN_GO, 'px-4 py-2'), onclick: () => startSandbox() }, t('dash.toSandbox'))));
}
```

**Sửa `src/ui/dashboard.ts`** — thay:
```ts
      h('p', { class: 'mt-1 mb-0 max-w-3xl text-[15px] text-muted' }, t('dash.intro'))),
    companySection(redraw)));
```
bằng:
```ts
      h('p', { class: 'mt-1 mb-0 max-w-3xl text-[15px] text-muted' }, t('dash.intro'))),
    mineSection(redraw), // L49: the player's own cards come before the company figures
    companySection(redraw)));
```

**Tạo `src/ui/pin.ts`:**
```ts
import { CARD_KINDS, KIND_SKILL, MAX_CARD_SQL, MAX_CARD_TITLE, MAX_CARDS, nextCardId, pinBlock, valueCols, type Card, type CardKind } from '../dashboard';
import type { QueryResult } from '../db/run';
import { learnedSkills } from '../home';
import { getLang, t } from '../i18n';
import { session } from '../session';
import { actions, app, done, persist, selected } from '../state';
import { BTN_GO, cx } from '../theme';
import { textOf } from '../tickets';
import { cardBody, KIND_LABEL, skillOf } from './dashboard';
import { h } from './dom';
import { icon } from './icons';

/** Where Pin is offered (L49): the Sandbox, and a story task once it is solved (so the player's own SQL is pinned, never a hint). */
function source(): string | undefined {
  const m = session.mode;
  if (m.kind === 'sandbox') return 'sandbox';
  if (m.kind === 'story' && done().has(app.selectedId)) return app.selectedId;
  return undefined;
}

/**
 * The line above the Result tab's table: run time and "Ghim lên". It describes app.lastRun like every tab, so when the editor
 * no longer holds that SQL the button is off with "Chạy lại trước khi ghim" (L49).
 */
export function pinBar(editorSql: () => string): HTMLElement | null {
  const run = app.lastRun;
  const r = run?.result;
  if (!run || !r) return null;
  const from = source();
  const block = from ? pinBlock({ sql: run.sql, ms: r.ms }, editorSql(), app.save.dashboard.cards.length) : undefined;
  const off = block === 'stale' || block === 'full'; // 'slow' and 'long': the dialog explains the rule
  return h('div', { class: 'mb-2 flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-sm' },
    r.ms !== undefined ? h('span', { class: 'mr-auto tabular-nums text-muted' }, t('dash.ran', { ms: r.ms })) : null,
    off ? h('span', { class: 'text-muted' }, t(block === 'stale' ? 'pin.stale' : 'dash.full', { max: MAX_CARDS })) : null,
    from && r.columns.length
      ? h('button', { type: 'button', class: 'flex items-center gap-1.5 px-3 py-1', disabled: off, title: t('pin.title'), onclick: () => openPinDialog(run.sql, r, from, editorSql) },
        icon('pin', 'size-4'), t('pin.button'))
      : null);
}

/** Pin dialog (mockup v6 screen B): type (locked ones greyed with the skill that opens them), title, value column, preview from the last run. */
function openPinDialog(sql: string, r: QueryResult, from: string, editorSql: () => string): void {
  const lang = getLang();
  const learned = learnedSkills(app.tickets, done());
  const usable = (k: CardKind) => learned.has(KIND_SKILL[k]) && valueCols(k, r).length > 0;
  let kind: CardKind | undefined = (['line', 'bar', 'number', 'table'] as const).find((k) => usable(k) && (k !== 'number' || r.rows.length === 1)) ?? CARD_KINDS.find(usable);
  let col = kind ? valueCols(kind, r)[0] : 0;
  const block = pinBlock({ sql, ms: r.ms }, editorSql(), app.save.dashboard.cards.length);

  const title = h('input', {
    type: 'text', id: 'pin-title', maxlength: String(MAX_CARD_TITLE), class: 'mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink',
    value: from === 'sandbox' ? '' : textOf(selected(), lang).title.slice(0, MAX_CARD_TITLE),
  });
  const colBox = h('div');
  const preview = h('div', { class: 'rounded-xl p-3 ring-1 ring-line' });
  const status = h('p', { role: 'status', class: 'mb-0 text-sm' });
  const confirm = h('button', { type: 'button', class: cx(BTN_GO, 'px-4 py-2') }, t('pin.confirm'));
  const dialog = h('dialog', { class: 'w-[min(640px,calc(100vw-2rem))] rounded-2xl p-0', 'aria-labelledby': 'pin-dialog-title' });

  const card = (): Card => ({ id: '', title: title.value.trim(), sql: sql.trim(), kind: kind!, col, source: from });
  const draw = (): void => {
    const cols = kind ? valueCols(kind, r) : [];
    colBox.replaceChildren(kind && kind !== 'table'
      ? h('label', { class: 'block text-sm font-semibold' }, t('pin.col'),
        h('select', { class: 'mt-1 block rounded-lg border border-line bg-panel px-2 py-1 text-ink', onchange: (e: Event) => { col = Number((e.target as HTMLSelectElement).value); draw(); } },
          ...cols.map((i) => h('option', { value: String(i), selected: i === col }, t('pin.colOption', { name: r.columns[i], i: i + 1 })))))
      : '');
    preview.replaceChildren(h('p', { class: 'mt-0 mb-2 text-sm font-semibold text-muted' }, t('pin.preview')), kind ? cardBody(card(), r) : '');
    status.className = cx('mb-0 text-sm', block ? 'bad' : 'text-muted');
    status.replaceChildren(...(block === 'slow'
      ? [h('b', {}, t('pin.slow', { s: Math.round((r.ms ?? 0) / 100) / 10 })), h('br'), t('pin.slowHelp')]
      : block ? [t(block === 'long' ? 'pin.long' : block === 'stale' ? 'pin.stale' : 'dash.full', { max: block === 'long' ? MAX_CARD_SQL : MAX_CARDS })]
        : [t('pin.fast', { ms: r.ms ?? 0 })]));
    confirm.disabled = !!block || !kind;
  };

  const radios = CARD_KINDS.map((k) => {
    const skill = skillOf(KIND_SKILL[k]);
    const why = !learned.has(skill.id) ? t('pin.kindLocked', { skill: skill.label[lang], n: skill.chapter }) : valueCols(k, r).length ? '' : t('pin.kindNoFit');
    return h('label', { class: cx('flex items-center gap-2 rounded-lg px-2 py-1 ring-1 ring-line', why && 'text-muted') },
      h('input', { type: 'radio', name: 'pin-kind', value: k, checked: k === kind, disabled: !!why, onchange: () => { kind = k; col = valueCols(k, r)[0]; draw(); } }),
      t(KIND_LABEL[k]), why ? h('span', { class: 'text-sm' }, ` · ${why}`) : '');
  });

  confirm.addEventListener('click', () => {
    const now = pinBlock({ sql, ms: r.ms }, editorSql(), app.save.dashboard.cards.length); // the editor may have changed behind the dialog
    if (now || !kind) return void (status.textContent = t(now === 'stale' ? 'pin.stale' : 'dash.full', { max: MAX_CARDS }));
    if (!title.value.trim()) {
      status.textContent = t('pin.needTitle');
      return title.focus();
    }
    const d = app.save.dashboard;
    d.cards = [...d.cards, { ...card(), id: nextCardId(d.cards) }];
    persist(true);
    dialog.close();
    app.notice = { key: 'pin.done', params: { title: title.value.trim() } };
    actions.rerender();
  });

  dialog.append(h('div', { class: 'space-y-4 p-5' },
    h('div', { class: 'flex items-center gap-2' },
      h('h2', { id: 'pin-dialog-title', class: 'm-0 flex-1 text-lg font-bold' }, t('pin.title')),
      h('span', { class: 'text-sm text-muted' }, t('dash.count', { n: app.save.dashboard.cards.length, max: MAX_CARDS }))),
    h('fieldset', { class: 'm-0 border-0 p-0' }, h('legend', { class: 'mb-1 text-sm font-semibold' }, t('pin.kind')), h('div', { class: 'flex flex-wrap gap-2' }, ...radios)),
    h('label', { class: 'block text-sm font-semibold', for: 'pin-title' }, t('pin.cardTitle'), title),
    colBox,
    preview,
    status,
    h('div', { class: 'flex justify-end gap-2' },
      h('button', { type: 'button', onclick: () => dialog.close() }, t('pin.cancel')),
      confirm)));
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  draw();
  dialog.showModal();
}
```

**Sửa `src/ui/tabs.ts`** — thay:
```ts

/** Plan 1 tabs. `editorSql` = what Ctrl+Enter would run now, to flag a stale result. */
export function registerCoreTabs(editorSql: () => string): void {
  registerTab({
```
bằng:
```ts

/** Plan 1 tabs. `editorSql` = what Ctrl+Enter would run now, to flag a stale result. `bar`: the line above the result (Plan 5: run time, Pin). */
export function registerCoreTabs(editorSql: () => string, bar: () => Node | null = () => null): void {
  registerTab({
```

**Sửa `src/ui/tabs.ts`** — thay:
```ts
      if (editorSql().trim() !== run.sql.trim()) host.append(h('p', { class: 'stale', role: 'note' }, t('res.stale')));
      host.append(run.error !== undefined ? errorView(run.error) : renderResult(run.result!, run.mark));
    },
```
bằng:
```ts
      if (editorSql().trim() !== run.sql.trim()) host.append(h('p', { class: 'stale', role: 'note' }, t('res.stale')));
      host.append(bar() ?? '', run.error !== undefined ? errorView(run.error) : renderResult(run.result!, run.mark));
    },
```

- [ ] **Step 4: Chạy test, ngân sách, commit**

Run: `npm test && npx tsc --noEmit && npm run build && node scripts/check-budget.mjs`
Expected: mọi test PASS; `main ≈ 262 / 270`.

```bash
git add src/dashboard.ts src/db/run.ts src/i18n/en.ts src/i18n/vi.ts src/main.ts src/ui/chartView.ts src/ui/dashboard.ts src/ui/pin.ts src/ui/tabs.ts tests/dashboard.test.ts
git commit -m "dashboard P2: pin a run as a card (2 s rule, re-run before pinning), cards run once per session one by one, slow flag, move up/down (Plan 5 T5-T7)

Claude-Session: https://claude.ai/code/session_01PwPSBV1SVDP6quEZfKN56M"
```

---

### Task 6: Bài tuyến: engine, chế độ `lane`, hộp thoại bản đồ, thanh việc

**Files:**
- Create: `src/lanes.ts`, `src/laneSources.ts`, `src/ui/lanePanel.ts`, `content/lanes/lanes.yml` (rỗng, Task 7 điền), `tests/lanes.test.ts`
- Modify: `src/content.ts`, `src/tickets.ts`, `src/scene.ts`, `src/session.ts`, `src/state.ts`, `src/main.ts`, `src/ui/mapStrip.ts`, `src/ui/modes.ts`, `src/ui/brief.ts`, `src/ui/work.ts`, `src/ui/pin.ts`, `src/ui/dashboard.ts`, `src/ui/dataView.ts`, `src/i18n/vi.ts`, `src/i18n/en.ts`, `scripts/check-budget.mjs`, `tests/scene.test.ts`

**Interfaces:**
- Produces:
  - `LANE_XP` (50), `LANE_TABLES`, `laneTables(open)`, `LaneBrief`, `parseLaneBriefs`, `shown(item, passed)`, `laneTaskState(task, open, passed, solved)`, `laneLabel`, `laneProblems(tasks, briefs, story)`.
  - `loadLanes()`; `Ticket.lane`; `RouteInfo.days`.
  - Mode `{ kind: 'lane'; ticket }`, `keepsWork()`; `startLane`, `toCurrentTask`; `actions.openLane(port)`.
  - `StripView.lane`, `mapStrip.openLane(port)`.
  - Khóa `lane.*`, `card.fromLane`; nhóm ngân sách `lanes`.

- [ ] **Step 1: Viết test (luật mở, `after:`, bảng tuyến, laneProblems, `lane:` trong frontmatter, `ROUTES.days` = seed)**

**Tạo `tests/lanes.test.ts`:**
````ts
import { describe, expect, it } from 'vitest';
import { loadTickets } from '../src/content';
import { LANE_TABLES, laneLabel, laneProblems, laneTables, laneTaskState, parseLaneBriefs, shown } from '../src/lanes';
import { nextTicket } from '../src/progress';
import { parseTicket, type Ticket } from '../src/tickets';

const story = loadTickets();
const BRIEF = `
- port: NLRTM
  country: { vi: Hà Lan, en: Netherlands }
  intro: { vi: a, en: a }
  numbers:
    - { value: "~30", text: { vi: ngày, en: days } }
    - { value: "+40%", text: { vi: giá mua, en: buy rate }, after: 7 }
  facts:
    - { label: { vi: Hàng, en: Cargo }, text: { vi: dệt may, en: textiles } }
  asked: { vi: hỏi, en: asked }
`;
const task = (id: string, extra: Partial<Ticket> = {}): Ticket => ({
  id, chapter: 2, title: id, from: { name: 'Đặng Hà', dept: 'Sales' }, difficulty: 2, beat: 'rest', requires: ['aggregate'], grants: [],
  tables: ['shipments'], ordered: true, body: '', task: '', hints: [], steps: [{ title: '', prompt: '', solution: 'SELECT 1' }], lane: 'NLRTM', ...extra,
});

describe('bài tuyến: luật mở và luật nội dung (src/lanes.ts)', () => {
  it('đọc hồ sơ tuyến; mục có after chỉ hiện khi đã qua chương đó (L49: +40% chờ ch7)', () => {
    const [b] = parseLaneBriefs(BRIEF);
    expect(b.port).toBe('NLRTM');
    expect(b.numbers.filter((x) => shown(x, new Set([1, 2, 3]))).map((x) => x.value)).toEqual(['~30']);
    expect(b.numbers.filter((x) => shown(x, new Set([7]))).map((x) => x.value)).toEqual(['~30', '+40%']);
    expect(() => parseLaneBriefs(BRIEF.replace('NLRTM', 'XXXXX'))).toThrow(/port/);
    expect(() => parseLaneBriefs(BRIEF.replace('{ label: { vi: Hàng, en: Cargo },', '{ label: { vi: Hàng },'))).toThrow(/label/);
  });

  it('mở khi tuyến đã mở VÀ đã qua đánh giá chương của bài; đã xong thì luôn "done"', () => {
    const r1 = task('r-1');
    expect(laneTaskState(r1, new Set(['NLRTM']), new Set([1, 2]), [])).toBe('open');
    expect(laneTaskState(r1, new Set(['NLRTM']), new Set([1]), [])).toBe('locked'); // a ship opened the lane early (L32)
    expect(laneTaskState(r1, new Set(), new Set([1, 2]), [])).toBe('locked');
    expect(laneTaskState(r1, new Set(), new Set(), ['r-1'])).toBe('done');
    expect(laneLabel(r1)).toBe('R-1');
  });

  it('bảng của tuyến chỉ hiện khi tuyến mở (D-B4)', () => {
    expect(laneTables(['NLRTM'])).toEqual([]);
    expect(laneTables(['SGSIN', 'AUSYD']).sort()).toEqual(['bunker_prices', 'lane_profiles']);
    expect(Object.values(LANE_TABLES).flat().every((x) => !story.some((t) => t.tables.includes(x)))).toBe(true); // story never uses them
  });

  it('laneProblems: kỹ năng chưa dạy, bảng chưa mở, mở trước tuyến, dạy kỹ năng, trùng id, thiếu hồ sơ', () => {
    const briefs = parseLaneBriefs(BRIEF);
    expect(laneProblems([task('r-1')], briefs, story)).toEqual([]);
    const bad = [
      task('r-2', { requires: ['join'] }),
      task('r-3', { tables: ['rate_contracts'] }),
      task('r-4', { chapter: 1 }),
      task('r-5', { grants: ['join'] }),
      task('ch1-01'),
      task('sg-1', { lane: 'SGSIN', chapter: 3, requires: [] }),
    ];
    const p = laneProblems(bad, briefs, story).join('\n');
    expect(p).toMatch(/r-2: cần kỹ năng "join"/);
    expect(p).toMatch(/r-3: dùng bảng "rate_contracts"/);
    expect(p).toMatch(/r-4: mở trước khi tuyến Rotterdam mở/);
    expect(p).toMatch(/r-5: bài tuyến không dạy kỹ năng/);
    expect(p).toMatch(/ch1-01: trùng id/);
    expect(p).toMatch(/sg-1: tuyến SGSIN chưa có hồ sơ/);
  });

  it('lane: trong frontmatter phải là mã cảng; ticket chính không có lane và nextTicket không bao giờ là bài tuyến', () => {
    const src = '---\nid: x\nchapter: 2\ntitle: x\nfrom: { name: A, dept: Ops }\ndifficulty: 1\nbeat: rest\nlane: {{L}}\n---\nx\n\n## Hints\n1. a\n2. b\n3. c\n\n## Solution\n```sql\nSELECT 1\n```\n';
    expect(parseTicket(src.replace('{{L}}', 'NLRTM'), 'x.md').lane).toBe('NLRTM');
    expect(() => parseTicket(src.replace('{{L}}', 'rotterdam'), 'x.md')).toThrow(/x\.md: lane/);
    expect(story.filter((t) => t.lane)).toEqual([]);
    expect(nextTicket(story, new Set(story.map((t) => t.id)))).toBeUndefined();
  });
});
````

**Sửa `tests/scene.test.ts`** — thay:
```ts
    const run = await runner();
    const r = await run("SELECT code, name FROM ports WHERE kind = 'SEAPORT'");
    const seed = new Map(r.rows.map(([code, name]) => [String(code), String(name)]));
    expect(ROUTES.filter((x) => seed.get(x.port) !== x.name).map((x) => x.port)).toEqual([]);
    expect(ROUTES.map((x) => x.name)).toContain('Laem Chabang');
```
bằng:
```ts
    const run = await runner();
    const r = await run("SELECT code, name, base_transit_days FROM ports WHERE kind = 'SEAPORT'");
    const seed = new Map(r.rows.map(([code, name]) => [String(code), String(name)]));
    expect(ROUTES.filter((x) => seed.get(x.port) !== x.name).map((x) => x.port)).toEqual([]);
    const days = new Map(r.rows.map(([code, , d]) => [String(code), Number(d)]));
    expect(ROUTES.filter((x) => days.get(x.port) !== x.days).map((x) => x.port)).toEqual([]); // Plan 5: lane list "~30 ngày"
    expect(ROUTES.map((x) => x.name)).toContain('Laem Chabang');
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/lanes.test.ts tests/scene.test.ts`
Expected: FAIL (`src/lanes.ts` chưa có; `ROUTES` chưa có `days`).

- [ ] **Step 3: Engine, tải nội dung, chế độ bài tuyến, UI**

**Tạo `content/lanes/lanes.yml`:**
```yaml
[]
```

**Sửa `scripts/check-budget.mjs`** — thay:
```js
  ['tickets', /^ticketSources-/, 110], // all ticket markdown, one lazy chunk fetched at boot (src/content.ts): 37 KB after ch1–6, 64 KB after ch7–9, 99 KB after ch10–12 (Plan 4 S7, L40 rule)
  ['en', /^en-.*\.js$/, 20], // EN dictionary, lazy (Plan 5 T3): 11 KB, fetched at boot only when the player's language is EN
```
bằng:
```js
  ['tickets', /^ticketSources-/, 110], // all ticket markdown, one lazy chunk fetched at boot (src/content.ts): 37 KB after ch1–6, 64 KB after ch7–9, 99 KB after ch10–12 (Plan 4 S7, L40 rule)
  ['lanes', /^laneSources-/, 20], // lane briefs and side tasks (content/lanes/), lazy, fetched at boot beside the tickets (Plan 5)
  ['en', /^en-.*\.js$/, 20], // EN dictionary, lazy (Plan 5 T3): 11 KB, fetched at boot only when the player's language is EN
```

**Sửa `src/content.ts`** — thay:
```ts
import { byOrder, parseTicket, type Ticket } from './tickets';
import { applyVariant } from './variants';

let templates: Ticket[] | undefined;
let loading: Promise<void> | undefined;
```
bằng:
```ts
import { parseLaneBriefs, type LaneBrief } from './lanes';
import { byOrder, parseTicket, type Ticket } from './tickets';
import { applyVariant } from './variants';

let templates: Ticket[] | undefined;
let lanes: { tasks: Ticket[]; briefs: LaneBrief[] } | undefined;
let loading: Promise<void> | undefined;
```

**Sửa `src/content.ts`** — thay:
```ts
export function loadContent(): Promise<void> {
  return (loading ??= import('./ticketSources')
    .then(({ sources }) => {
      templates = Object.entries(sources).map(([path, source]) => parseTicket(source, path)).sort(byOrder);
    })
```
bằng:
```ts
export function loadContent(): Promise<void> {
  // Plan 5: lane briefs and side tasks are their own lazy chunk, fetched beside the tickets.
  return (loading ??= Promise.all([import('./ticketSources'), import('./laneSources')])
    .then(([{ sources }, { laneSources, briefSource }]) => {
      templates = Object.entries(sources).map(([path, source]) => parseTicket(source, path)).sort(byOrder);
      lanes = {
        tasks: Object.entries(laneSources).map(([path, source]) => applyVariant(parseTicket(source, path), 0)).sort(byOrder),
        briefs: parseLaneBriefs(briefSource),
      };
    })
```

**Sửa `src/content.ts`** — thay:
```ts

/** Story mode always plays variants[0]. */
```
bằng:
```ts

/** Lane briefs and side tasks (src/lanes.ts). Side tasks are never part of loadTickets(). */
export function loadLanes(): { tasks: Ticket[]; briefs: LaneBrief[] } {
  if (!lanes) throw new Error('loadContent() has not finished');
  return lanes;
}

/** Story mode always plays variants[0]. */
```

**Sửa `src/i18n/en.ts`** — thay:
```ts
  'pin.done': 'Pinned "{title}" to the dashboard.',
};
```
bằng:
```ts
  'pin.done': 'Pinned "{title}" to the dashboard.',
  // ---- Plan 5: lanes ----
  'card.fromLane': 'Your SQL · lane task {id} {name}',
  'lane.brief': 'Lane brief',
  'lane.days': '~{n} days',
  'lane.count': '{done}/{total} lane tasks',
  'lane.later': 'coming later',
  'lane.laterLong': 'The brief and tasks for this lane come in a later batch.',
  'lane.lockedAt': 'opens after the ch. {n} review',
  'lane.lockedLong': 'Opens after the chapter {n} promotion review.',
  'lane.asked': 'What a DA on this lane gets asked:',
  'lane.illustrative': 'Illustrative, simplified figures. The company and its numbers are fictional.',
  'lane.tasks': 'Lane tasks · {done}/{total} done · optional',
  'lane.taskAt': 'Opens after chapter {n} · +{xp} XP',
  'lane.start': 'Do this lane task',
  'lane.review': 'Look again',
  'lane.stateOpen': 'to do',
  'lane.rules': 'Not counted in chapter progress. Lane tasks are optional: a flat +{xp} XP, hints cost nothing, and they are not in the practice deck.',
  'lane.seeBrief': 'See the {name} lane brief',
  'lane.all': 'All lanes',
  'lane.pick': 'Press a port on the map or a lane in the list to read its brief and do its lane tasks.',
  'lane.pickShort': 'press a port to read its brief',
  'lane.back': 'Back to the current task',
  'lane.badge': 'Lane task · {name}',
  'lane.optional': 'Optional · +{xp} XP',
  'lane.xp': '+{n} XP (lane task: flat, hints cost nothing)',
  'lane.solved': 'Lane task done, +{xp} XP.',
  'lane.tableAt': 'opens with a lane task',
};
```

**Sửa `src/i18n/vi.ts`** — thay:
```ts
  'pin.done': 'Đã ghim "{title}" lên bảng điều hành.',
} satisfies Record<string, Msg>;
```
bằng:
```ts
  'pin.done': 'Đã ghim "{title}" lên bảng điều hành.',
  // ---- Plan 5: lanes (product-design-v3 Part B, mockup v6) ----
  'card.fromLane': 'SQL của bạn · bài tuyến {id} {name}',
  'lane.brief': 'Hồ sơ tuyến',
  'lane.days': '~{n} ngày',
  'lane.count': '{done}/{total} bài tuyến',
  'lane.later': 'đợt sau',
  'lane.laterLong': 'Hồ sơ và bài tuyến của tuyến này có ở đợt sau.',
  'lane.lockedAt': 'mở sau đánh giá ch. {n}',
  'lane.lockedLong': 'Mở sau đánh giá thăng tiến chương {n}.',
  'lane.asked': 'DA ở tuyến này hay được hỏi:',
  'lane.illustrative': 'Số liệu minh họa, đã giản lược. Công ty và số liệu là hư cấu.',
  'lane.tasks': 'Bài tuyến · {done}/{total} xong · tùy chọn',
  'lane.taskAt': 'Mở sau chương {n} · +{xp} XP',
  'lane.start': 'Làm bài tuyến',
  'lane.review': 'Xem lại',
  'lane.stateOpen': 'chưa làm',
  'lane.rules': 'Không tính vào tiến độ chương. Bài tuyến là tùy chọn: +{xp} XP cố định, gợi ý không trừ điểm, không vào bộ Luyện tập.',
  'lane.seeBrief': 'Xem hồ sơ tuyến {name}',
  'lane.all': 'Tất cả tuyến',
  'lane.pick': 'Bấm một cảng trên bản đồ hoặc một tuyến trong danh sách để đọc hồ sơ tuyến và làm bài tuyến.',
  'lane.pickShort': 'bấm một cảng để đọc hồ sơ tuyến',
  'lane.back': 'Về việc đang làm',
  'lane.badge': 'Bài tuyến · {name}',
  'lane.optional': 'Tùy chọn · +{xp} XP',
  'lane.xp': '+{n} XP (bài tuyến: cố định, không trừ khi xem gợi ý)',
  'lane.solved': 'Đã xong bài tuyến, +{xp} XP.',
  'lane.tableAt': 'mở theo bài tuyến',
} satisfies Record<string, Msg>;
```

**Tạo `src/laneSources.ts`:**
```ts
// Lane briefs and side tasks (content/lanes/) as raw text. Only src/content.ts imports this, and only with import(),
// so it is its own lazy chunk (budget group `lanes`, Plan 5), fetched at boot beside the ticket chunk.
export const laneSources = import.meta.glob<string>('../content/lanes/*/*.md', { query: '?raw', import: 'default', eager: true });
export { default as briefSource } from '../content/lanes/lanes.yml?raw';
```

**Tạo `src/lanes.ts`:**
```ts
import { parse as parseYaml } from 'yaml';
import { bilingualOf, tablesUnlocked, type Bilingual } from './progress';
import { ROUTES } from './scene';
import type { Ticket } from './tickets';

/**
 * Lane briefs and side tasks (product-design-v3 Part B, L48 D-B1..D-B9, L49). Content lives in content/lanes/ and is a lazy
 * chunk (src/laneSources.ts, budget group `lanes`). Side tasks are ticket files with `lane:`; they are never in app.tickets,
 * so chapters, rank, the next ticket, the harbour, KPIs and the practice deck never see them (D-B1, D-B5).
 */

/** Flat XP for a side task, whatever hints were opened (D-B1). Never changes rank. */
export const LANE_XP = 50;

/** Tables a lane brings (D-B4): visible in the schema tabs, the Data page and autocomplete once the lane is open. Story tickets never use them. */
export const LANE_TABLES: Record<string, string[]> = {
  SGSIN: ['lane_profiles'],
  AUSYD: ['lane_profiles', 'bunker_prices'],
};
export const laneTables = (open: Iterable<string>): string[] => [...new Set([...open].flatMap((p) => LANE_TABLES[p] ?? []))];

/** `after`: shown only once that chapter's promotion review is passed (L49: Rotterdam's +40% waits for chapter 7). */
export interface LaneItem { text: Bilingual; label?: Bilingual; value?: string; after?: number }
export interface LaneBrief {
  port: string;
  country: Bilingual;
  intro: Bilingual;
  /** The "numbers to remember" (value + label). */
  numbers: LaneItem[];
  /** Detail rows (label + text). */
  facts: LaneItem[];
  /** "What a DA on this lane gets asked". */
  asked: Bilingual;
}

const item = (v: unknown, origin: string): LaneItem => {
  const o = (v ?? {}) as Record<string, unknown>;
  const text = bilingualOf(o.text);
  if (!text) throw new Error(`${origin}: mỗi mục cần text { vi, en }`);
  const label = o.label === undefined ? undefined : bilingualOf(o.label);
  if (o.label !== undefined && !label) throw new Error(`${origin}: label cần { vi, en }`);
  if (o.after !== undefined && typeof o.after !== 'number') throw new Error(`${origin}: after là số chương`);
  return {
    text,
    ...(label ? { label } : {}),
    ...(typeof o.value === 'string' ? { value: o.value } : {}),
    ...(typeof o.after === 'number' ? { after: o.after } : {}),
  };
};

export function parseLaneBriefs(src: string, origin = 'content/lanes/lanes.yml'): LaneBrief[] {
  const data = parseYaml(src) as unknown;
  if (!Array.isArray(data)) throw new Error(`${origin}: cần một danh sách`);
  return data.map((raw: unknown, i) => {
    const b = (raw ?? {}) as Record<string, unknown>;
    const at = `${origin}: mục ${i}`;
    const country = bilingualOf(b.country);
    const intro = bilingualOf(b.intro);
    const asked = bilingualOf(b.asked);
    if (!ROUTES.some((r) => r.port === b.port) || !country || !intro || !asked || !Array.isArray(b.numbers) || !Array.isArray(b.facts)) {
      throw new Error(`${at} cần port (một cảng của bản đồ), country, intro, numbers, facts, asked`);
    }
    return {
      port: b.port as string, country, intro, asked,
      numbers: b.numbers.map((x) => item(x, at)), facts: b.facts.map((x) => item(x, at)),
    };
  });
}

/** An item is visible once its chapter's promotion review is passed. */
export const shown = (x: LaneItem, passed: ReadonlySet<number>): boolean => x.after === undefined || passed.has(x.after);

export type LaneTaskState = 'done' | 'open' | 'locked';
/**
 * A side task's `chapter` is the chapter whose promotion review opens it (product-design-v3 §13: gated by skills, not only by
 * the lane, since a ship may open a lane early, L32). It also needs its lane open.
 */
export function laneTaskState(task: Ticket, open: ReadonlySet<string>, passed: ReadonlySet<number>, solved: readonly string[]): LaneTaskState {
  if (solved.includes(task.id)) return 'done';
  return task.lane && open.has(task.lane) && passed.has(task.chapter) ? 'open' : 'locked';
}

/** "R-1": the label of a side task on buttons and cards. */
export const laneLabel = (task: Ticket): string => task.id.toUpperCase();

/**
 * Content checks for side tasks (like contentProblems for the story). `story` = the story tickets, sorted by byOrder.
 * A task may only use skills taught up to its chapter and tables open at its chapter or brought by its own lane.
 */
export function laneProblems(tasks: Ticket[], briefs: LaneBrief[], story: Ticket[]): string[] {
  const problems: string[] = [];
  const ids = new Set(story.map((x) => x.id));
  for (const b of briefs) if (briefs.filter((x) => x.port === b.port).length > 1) problems.push(`${b.port}: trùng hồ sơ tuyến`);
  for (const task of tasks) {
    const route = ROUTES.find((r) => r.port === task.lane);
    if (!route) {
      problems.push(`${task.id}: lane phải là một cảng của bản đồ`);
      continue;
    }
    if (ids.has(task.id)) problems.push(`${task.id}: trùng id`);
    ids.add(task.id);
    if (!briefs.some((b) => b.port === task.lane)) problems.push(`${task.id}: tuyến ${task.lane} chưa có hồ sơ`);
    if (task.beat === 'boss' || task.grants.length) problems.push(`${task.id}: bài tuyến không dạy kỹ năng và không phải cột mốc`);
    if (task.chapter < Math.max(1, route.opens)) problems.push(`${task.id}: mở trước khi tuyến ${route.name} mở (chương ${route.opens})`);
    const taught = new Set(story.filter((x) => x.chapter <= task.chapter).flatMap((x) => x.grants));
    for (const s of task.requires) if (!taught.has(s)) problems.push(`${task.id}: cần kỹ năng "${s}" chưa dạy tới chương ${task.chapter}`);
    const tables = [...tablesUnlocked(task.chapter), ...(LANE_TABLES[route.port] ?? [])];
    for (const x of task.tables) if (!tables.includes(x)) problems.push(`${task.id}: dùng bảng "${x}" chưa mở ở chương ${task.chapter} hay ở tuyến ${route.name}`);
  }
  return problems;
}
```

**Sửa `src/main.ts`** — thay:
```ts
import { initTheme } from './theme';
import { loadContent, loadTickets } from './content';
import { DbClient, DbFailedError, DbRestartError, QueryTimeoutError, WorkerTaskError, type DbStatus } from './db/client';
```
bằng:
```ts
import { initTheme } from './theme';
import { loadContent, loadLanes, loadTickets } from './content';
import { DbClient, DbFailedError, DbRestartError, QueryTimeoutError, WorkerTaskError, type DbStatus } from './db/client';
```

**Sửa `src/main.ts`** — thay:
```ts
if (problems.length) console.warn('Content problems:', problems);
const known: Known = { ticketIds: new Set(app.tickets.map((x) => x.id)), skills: new Set(SKILLS.map((s) => s.id)) };
```
bằng:
```ts
if (problems.length) console.warn('Content problems:', problems);
// Lane side tasks are known ids too, so their drafts, graded SQL and hints survive a reload (they never enter `completed`).
const known: Known = { ticketIds: new Set([...app.tickets, ...loadLanes().tasks].map((x) => x.id)), skills: new Set(SKILLS.map((s) => s.id)) };
```

**Sửa `src/main.ts`** — thay:
```ts
const mapStrip = createMapStrip(byId('map'));
const syncMap = (): void => mapStrip.update({ tickets: app.tickets, completed: done(), selectedId: app.selectedId });
```
bằng:
```ts
const mapStrip = createMapStrip(byId('map'));
const syncMap = (): void => mapStrip.update({
  tickets: app.tickets, completed: done(), selectedId: app.selectedId, lane: session.mode.kind === 'lane' ? session.mode.ticket : undefined,
});
```

**Sửa `src/main.ts`** — thay:
```ts
  renderNotebook();
  // Story workspace only: selectTicket() forces story mode, so Practice and Sandbox must not show the task bar (ui-ux-v4 §2).
  byId('map').hidden = byId('shell').hidden || !isStory();
  if (!byId('map').hidden) syncMap();
```
bằng:
```ts
  renderNotebook();
  // Story workspace and lane tasks only: selectTicket() forces story mode, so Practice and Sandbox must not show the task bar (ui-ux-v4 §2).
  byId('map').hidden = byId('shell').hidden || !(isStory() || session.mode.kind === 'lane');
  if (!byId('map').hidden) syncMap();
```

**Sửa `src/main.ts`** — thay:
```ts
Object.assign(actions, {
  rerender, selectTicket, complete, retryDb: () => db.restart(), copyDiagnostics: () => void copyDiagnostics(), useSql: (sql: string) => work.setDoc(sql), showTab: (id: string) => panel.show(id),
});
```
bằng:
```ts
Object.assign(actions, {
  rerender, selectTicket, complete, retryDb: () => db.restart(), openLane: (port: string) => mapStrip.openLane(port), copyDiagnostics: () => void copyDiagnostics(), useSql: (sql: string) => work.setDoc(sql), showTab: (id: string) => panel.show(id),
});
```

**Sửa `src/scene.ts`** — thay:
```ts
 */
export interface RouteInfo { port: string; name: string; opens: number; x: number; y: number; d: string; lx: number; ly: number }
export const ROUTES: RouteInfo[] = [
  { port: 'CNSHA', name: 'Shanghai', opens: 0, x: 620, y: 80, d: 'M560 132 Q600 100 620 80', lx: 540, ly: 72 },
  { port: 'THLCH', name: 'Laem Chabang', opens: 0, x: 515, y: 110, d: 'M560 132 Q540 114 515 110', lx: 410, ly: 132 },
  { port: 'SGSIN', name: 'Singapore', opens: 1, x: 540, y: 196, d: 'M560 132 Q580 170 540 196', lx: 452, ly: 214 },
  { port: 'NLRTM', name: 'Rotterdam', opens: 2, x: 160, y: 80, d: 'M560 132 Q380 60 160 80', lx: 110, ly: 66 },
  { port: 'KRPUS', name: 'Busan', opens: 3, x: 682, y: 62, d: 'M560 132 Q640 74 682 62', lx: 692, ly: 58 },
  { port: 'USLAX', name: 'Los Angeles', opens: 4, x: 860, y: 96, d: 'M560 132 Q700 40 860 96', lx: 820, ly: 120 },
  { port: 'AUSYD', name: 'Sydney', opens: 5, x: 662, y: 212, d: 'M560 132 Q630 175 662 212', lx: 674, ly: 232 },
];
```
bằng:
```ts
 */
export interface RouteInfo { port: string; name: string; opens: number; days: number; x: number; y: number; d: string; lx: number; ly: number }
/** `days`: about this many days at sea from Tien Sa = ports.base_transit_days (lane list and tooltips, Plan 5). */
export const ROUTES: RouteInfo[] = [
  { port: 'CNSHA', name: 'Shanghai', opens: 0, days: 5, x: 620, y: 80, d: 'M560 132 Q600 100 620 80', lx: 540, ly: 72 },
  { port: 'THLCH', name: 'Laem Chabang', opens: 0, days: 3, x: 515, y: 110, d: 'M560 132 Q540 114 515 110', lx: 410, ly: 132 },
  { port: 'SGSIN', name: 'Singapore', opens: 1, days: 3, x: 540, y: 196, d: 'M560 132 Q580 170 540 196', lx: 452, ly: 214 },
  { port: 'NLRTM', name: 'Rotterdam', opens: 2, days: 30, x: 160, y: 80, d: 'M560 132 Q380 60 160 80', lx: 110, ly: 66 },
  { port: 'KRPUS', name: 'Busan', opens: 3, days: 6, x: 682, y: 62, d: 'M560 132 Q640 74 682 62', lx: 692, ly: 58 },
  { port: 'USLAX', name: 'Los Angeles', opens: 4, days: 20, x: 860, y: 96, d: 'M560 132 Q700 40 860 96', lx: 820, ly: 120 },
  { port: 'AUSYD', name: 'Sydney', opens: 5, days: 16, x: 662, y: 212, d: 'M560 132 Q630 175 662 212', lx: 674, ly: 232 },
];
```

**Sửa `src/session.ts`** — thay:
```ts
import { SANDBOX_DRAFT_MAX } from './save';
import { app, done, draftKey, selected } from './state';
import type { Ticket } from './tickets';
```
bằng:
```ts
import { SANDBOX_DRAFT_MAX } from './save';
import { app, done, draftKey, selected, stepKey } from './state';
import type { Ticket } from './tickets';
```

**Sửa `src/session.ts`** — thay:
```ts

/** Modes inside the #/play route (not routes of their own). */
export type Mode = { kind: 'story' } | { kind: 'practice'; run: PracticeRun } | { kind: 'sandbox' };

export const session: { mode: Mode } = { mode: { kind: 'story' } };
export const isStory = (): boolean => session.mode.kind === 'story';
```
bằng:
```ts

/** Modes inside the #/play route (not routes of their own). `lane`: a lane side task (Plan 5), outside chapter progress. */
export type Mode = { kind: 'story' } | { kind: 'practice'; run: PracticeRun } | { kind: 'sandbox' } | { kind: 'lane'; ticket: Ticket };

export const session: { mode: Mode } = { mode: { kind: 'story' } };
export const isStory = (): boolean => session.mode.kind === 'story';
/** Story tickets and lane side tasks keep their drafts, graded SQL, hints and history; Practice and the Sandbox do not. */
export const keepsWork = (): boolean => session.mode.kind === 'story' || session.mode.kind === 'lane';
```

**Sửa `src/session.ts`** — thay:
```ts
  if (m.kind === 'practice') return m.run.index < m.run.tickets.length ? m.run.tickets[m.run.index] : undefined;
  return selected();
```
bằng:
```ts
  if (m.kind === 'practice') return m.run.index < m.run.tickets.length ? m.run.tickets[m.run.index] : undefined;
  if (m.kind === 'lane') return m.ticket;
  return selected();
```

**Sửa `src/session.ts`** — thay:
```ts
  if (m.kind === 'practice') return `practice#${m.run.id}#${m.run.index}`;
  return draftKey();
```
bằng:
```ts
  if (m.kind === 'practice') return `practice#${m.run.id}#${m.run.index}`;
  if (m.kind === 'lane') return stepKey(m.ticket.id, 0);
  return draftKey();
```

**Sửa `src/session.ts`** — thay:
```ts
  if (m.kind === 'practice') return m.run.draft === '' ? undefined : m.run.draft;
  return app.save.drafts[draftKey()];
}
```
bằng:
```ts
  if (m.kind === 'practice') return m.run.draft === '' ? undefined : m.run.draft;
  return app.save.drafts[workKey()];
}
```

**Sửa `src/session.ts`** — thay:
```ts
  }
  else app.save.drafts[draftKey()] = v;
}

/** Closed = no Submit, Recap shown. Only story tickets close; Practice always grades. */
export const isClosed = (ticketId: string): boolean => session.mode.kind === 'story' && done().has(ticketId);
```
bằng:
```ts
  }
  else app.save.drafts[workKey()] = v;
}

/** Closed = no Submit, Recap shown. Story tickets and lane side tasks close; Practice always grades. */
export const isClosed = (ticketId: string): boolean =>
  (session.mode.kind === 'story' && done().has(ticketId)) || (session.mode.kind === 'lane' && app.save.lanes.includes(ticketId));
```

**Sửa `src/state.ts`** — thay:
```ts
import type { Key, Params } from './i18n';
import { currentChapter, tablesUnlocked } from './progress';
import { emptySave, stepKey, writeSave } from './save';
```
bằng:
```ts
import type { Key, Params } from './i18n';
import { laneTables } from './lanes';
import { currentChapter, tablesUnlocked } from './progress';
import { derive } from './scene';
import { emptySave, stepKey, writeSave } from './save';
```

**Sửa `src/state.ts`** — thay:
```ts
  showTab(_id: string): void {},
};
```
bằng:
```ts
  showTab(_id: string): void {},
  /** Opens the map dialog on a lane's brief (Plan 5). */
  openLane(_port: string): void {},
};
```

**Sửa `src/state.ts`** — thay:
```ts
  (draft?.trim() ? draft : starter ?? draft ?? '');
export const unlockedTables = (): string[] => tablesUnlocked(currentChapter(app.tickets, done()));
```
bằng:
```ts
  (draft?.trim() ? draft : starter ?? draft ?? '');
/** Chapter tables plus the tables of the open lanes (Plan 5 D-B4: `lane_profiles`, `bunker_prices`). */
export const unlockedTables = (): string[] =>
  [...tablesUnlocked(currentChapter(app.tickets, done())), ...laneTables(derive(app.tickets, done()).open)];
```

**Sửa `src/tickets.ts`** — thay:
```ts
  wrong?: Wrong[];
}
```
bằng:
```ts
  wrong?: Wrong[];
  /** Plan 5: a lane side task (content/lanes/) for this map port; `chapter` is then the chapter whose review opens it. */
  lane?: string;
}
```

**Sửa `src/tickets.ts`** — thay:
```ts
  if (fm.scene !== undefined) t.scene = parseScene(fm.scene, t.beat === 'boss', fail);
```
bằng:
```ts
  if (fm.scene !== undefined) t.scene = parseScene(fm.scene, t.beat === 'boss', fail);
  if (fm.lane !== undefined) t.lane = typeof fm.lane === 'string' && /^[A-Z]{5}$/.test(fm.lane) ? fm.lane : fail('lane là mã cảng của bản đồ, vd NLRTM');
```

**Sửa `src/ui/brief.ts`** — thay:
```ts
import { getLang, t, type Key } from '../i18n';
import { roleLine } from '../people';
import { CHAPTERS, nextTicket, SKILLS, xpFor } from '../progress';
import { compareShape, shapeOf, type Kind, type Shape } from '../shape';
```
bằng:
```ts
import { getLang, t, type Key } from '../i18n';
import { LANE_XP } from '../lanes';
import { roleLine } from '../people';
import { CHAPTERS, nextTicket, SKILLS, xpFor } from '../progress';
import { ROUTES } from '../scene';
import { compareShape, shapeOf, type Kind, type Shape } from '../shape';
```

**Sửa `src/ui/brief.ts`** — thay:
```ts
    coach('recap'),
    h('p', {}, t('recap.xp', { n: xpFor(tk, hintsUsed), hints: hintsUsed })),
    h('h4', {}, t(tk.grants.length ? 'recap.learned' : 'recap.review')),
```
bằng:
```ts
    coach('recap'),
    h('p', {}, tk.lane ? t('lane.xp', { n: LANE_XP }) : t('recap.xp', { n: xpFor(tk, hintsUsed), hints: hintsUsed })),
    h('h4', {}, t(tk.grants.length ? 'recap.learned' : 'recap.review')),
```

**Sửa `src/ui/brief.ts`** — thay:
```ts
    next
      ? h('button', { type: 'button', class: 'primary', onclick: () => actions.selectTicket(next.id) }, t('recap.next'))
      : h('p', {}, t('recap.allDone')));
```
bằng:
```ts
    next
      ? h('button', { type: 'button', class: 'primary', onclick: () => actions.selectTicket(next.id) }, t(tk.lane ? 'nav.continueBack' : 'recap.next'))
      : h('p', {}, t('recap.allDone')));
```

**Sửa `src/ui/brief.ts`** — thay:
```ts
      h('p', { class: 'm-0 flex flex-wrap items-center gap-2 text-sm text-muted' },
        `${t('brief.chapter', { n: tk.chapter })} · ${'★'.repeat(tk.difficulty)}`,
        h('span', { class: cx(PILL, chapterColor(tk.chapter).chip) }, t(BEAT[tk.beat])),
        isDone ? `✓ ${t('inbox.done')}` : ''),
```
bằng:
```ts
      h('p', { class: 'm-0 flex flex-wrap items-center gap-2 text-sm text-muted' },
        tk.lane ? t('lane.optional', { xp: LANE_XP }) : `${t('brief.chapter', { n: tk.chapter })} · ${'★'.repeat(tk.difficulty)}`,
        h('span', { class: cx(PILL, chapterColor(tk.chapter).chip) },
          tk.lane ? t('lane.badge', { name: ROUTES.find((r) => r.port === tk.lane)?.name ?? tk.lane }) : t(BEAT[tk.beat])),
        isDone ? `✓ ${t('inbox.done')}` : ''),
```

**Sửa `src/ui/dashboard.ts`** — thay:
```ts
import { BAR_ROWS, CARD_KINDS, cardRunner, cardSpec, KIND_SKILL, MAX_CARDS, moveCard, TABLE_ROWS, type Card, type CardKind } from '../dashboard';
```
bằng:
```ts
import { loadLanes } from '../content';
import { BAR_ROWS, CARD_KINDS, cardRunner, cardSpec, KIND_SKILL, MAX_CARDS, moveCard, TABLE_ROWS, type Card, type CardKind } from '../dashboard';
```

**Sửa `src/ui/dashboard.ts`** — thay:
```ts
import { getLang, t, type Key } from '../i18n';
import { SKILLS } from '../progress';
import { stepKey } from '../save';
```
bằng:
```ts
import { getLang, t, type Key } from '../i18n';
import { laneLabel } from '../lanes';
import { SKILLS } from '../progress';
import { ROUTES } from '../scene';
import { stepKey } from '../save';
```

**Sửa `src/ui/dashboard.ts`** — thay:
```ts
  const tk = app.tickets.find((x) => x.id === c.source);
  return tk ? t('card.fromTask', { title: textOf(tk, getLang()).title }) : t('card.yours');
}
```
bằng:
```ts
  const tk = app.tickets.find((x) => x.id === c.source);
  if (tk) return t('card.fromTask', { title: textOf(tk, getLang()).title });
  const lane = loadLanes().tasks.find((x) => x.id === c.source);
  return lane ? t('card.fromLane', { id: laneLabel(lane), name: ROUTES.find((r) => r.port === lane.lane)?.name ?? '' }) : t('card.yours');
}
```

**Sửa `src/ui/dataView.ts`** — thay:
```ts
const chapterOf = (table: string): number => Number(Object.entries(CHAPTER_TABLES).find(([, ts]) => ts.includes(table))?.[0] ?? 0);
const tableHash = (table: string): string => `${hashOf('data')}/${table}`;
```
bằng:
```ts
const chapterOf = (table: string): number => Number(Object.entries(CHAPTER_TABLES).find(([, ts]) => ts.includes(table))?.[0] ?? 0);
/** "mở ở chương 4", or for a lane table (chapter 0, Plan 5) "mở theo bài tuyến". */
const openedAt = (table: string): string => (chapterOf(table) ? t('data.openedAt', { n: chapterOf(table) }) : t('lane.tableAt'));
const tableHash = (table: string): string => `${hashOf('data')}/${table}`;
```

**Sửa `src/ui/dataView.ts`** — thay:
```ts
      title,
      h('p', { class: 'mt-1 text-muted' }, `${rowText(sel)} · ${t('data.openedAt', { n: chapterOf(sel) })}`),
      columnsHost,
```
bằng:
```ts
      title,
      h('p', { class: 'mt-1 text-muted' }, `${rowText(sel)} · ${openedAt(sel)}`),
      columnsHost,
```

**Sửa `src/ui/dataView.ts`** — thay:
```ts
    drawList();
    detail.querySelector('#data-table-title + p')?.replaceChildren(`${rowText(sel)} · ${t('data.openedAt', { n: chapterOf(sel) })}`);
  });
```
bằng:
```ts
    drawList();
    detail.querySelector('#data-table-title + p')?.replaceChildren(`${rowText(sel)} · ${openedAt(sel)}`);
  });
```

**Tạo `src/ui/lanePanel.ts`:**
```ts
import { loadLanes } from '../content';
import { getLang, t } from '../i18n';
import { LANE_XP, laneLabel, laneTaskState, shown, type LaneTaskState } from '../lanes';
import { ROUTES, type Harbor, type RouteInfo } from '../scene';
import { app } from '../state';
import { BTN_GO, cx, DONE_PILL, PILL } from '../theme';
import { textOf, type Ticket } from '../tickets';
import { h, nodes } from './dom';
import { icon } from './icons';

/** Lane briefs and side tasks in the map dialog and the lane task bar (mockup v6 screens C–E, L49). */

export const tasksOf = (port: string): Ticket[] => loadLanes().tasks.filter((x) => x.lane === port);
export const stateOf = (task: Ticket, harbor: Harbor): LaneTaskState => laneTaskState(task, harbor.open, harbor.passed, app.save.lanes);

/** "~30 ngày · 1/3 bài tuyến", "~5 ngày · đợt sau" (no content yet, L49), "mở sau đánh giá ch. 5" (lane closed). */
export function laneInfo(r: RouteInfo, harbor: Harbor): string {
  if (!harbor.open.has(r.port)) return t('lane.lockedAt', { n: r.opens });
  const tasks = tasksOf(r.port);
  const days = t('lane.days', { n: r.days });
  return tasks.length ? `${days} · ${t('lane.count', { done: tasks.filter((x) => app.save.lanes.includes(x.id)).length, total: tasks.length })}` : `${days} · ${t('lane.later')}`;
}

/** One side task in the brief's list: done (✓, review it), open (do it) or locked (title and when it opens, L49). */
function taskRow(task: Ticket, harbor: Harbor, start: (task: Ticket) => void): HTMLElement {
  const lang = getLang();
  const state = stateOf(task, harbor);
  return h('li', { class: 'flex flex-wrap items-center gap-2 rounded-lg p-2 ring-1 ring-line' },
    h('span', { class: cx(PILL, state === 'done' ? DONE_PILL : 'bg-code text-ink') }, state === 'done' ? icon('check', 'size-3.5') : state === 'locked' ? icon('lock', 'size-3.5') : null, laneLabel(task)),
    h('b', { class: cx('min-w-0 flex-1', state === 'locked' && 'text-muted') }, textOf(task, lang).title),
    state === 'locked'
      ? h('span', { class: 'text-sm text-muted' }, t('lane.taskAt', { n: task.chapter, xp: LANE_XP }))
      : h('button', { type: 'button', class: cx('px-3 py-1 text-sm', state === 'open' && BTN_GO), onclick: () => start(task) },
        t(state === 'done' ? 'lane.review' : 'lane.start')));
}

/** The brief of one lane. A closed lane shows two lines of preview and when it opens (product-design-v3 §13). */
export function lanePanel(port: string, harbor: Harbor, start: (task: Ticket) => void): HTMLElement {
  const lang = getLang();
  const r = ROUTES.find((x) => x.port === port)!;
  const brief = loadLanes().briefs.find((b) => b.port === port);
  const title = h('h3', { id: 'lane-title', tabindex: '-1', class: 'm-0 text-lg font-bold' }, [r.name, brief?.country[lang], port].filter(Boolean).join(' · '));
  const head = h('p', { class: 'm-0 text-sm font-semibold text-muted' }, t('lane.brief'));
  if (!harbor.open.has(port) || !brief) {
    return h('div', { class: 'space-y-2' }, head, title,
      brief ? h('p', { class: 'm-0 line-clamp-2' }, brief.intro[lang]) : null,
      h('p', { class: 'm-0 text-sm text-muted' }, harbor.open.has(port) ? t('lane.laterLong') : t('lane.lockedLong', { n: r.opens })));
  }
  const passed = harbor.passed;
  const tasks = tasksOf(port);
  const doneN = tasks.filter((x) => app.save.lanes.includes(x.id)).length;
  return h('div', { class: 'space-y-3' },
    head, title,
    h('p', { class: 'm-0' }, brief.intro[lang]),
    h('div', { class: 'grid grid-cols-3 gap-2 text-center' }, ...brief.numbers.filter((x) => shown(x, passed)).map((x) =>
      h('div', { class: 'rounded-xl bg-code p-2' }, h('b', { class: 'block text-xl tabular-nums' }, x.value ?? ''), h('span', { class: 'text-xs text-muted' }, x.text[lang])))),
    h('dl', { class: 'm-0 space-y-1.5 text-sm' }, ...brief.facts.filter((x) => shown(x, passed)).map((x) =>
      h('div', {}, h('dt', { class: 'inline font-semibold' }, `${x.label?.[lang] ?? ''}: `), h('dd', { class: 'inline' }, x.text[lang])))),
    h('p', { class: 'm-0 rounded-lg border-l-4 border-accent bg-accent-soft p-2 text-sm' }, h('b', {}, t('lane.asked')), ' ', brief.asked[lang]),
    h('p', { class: 'm-0 flex items-center gap-1.5 text-xs text-muted' }, icon('info', 'size-3.5'), t('lane.illustrative')),
    h('h4', { class: 'm-0 flex items-center gap-2' }, icon('route', 'size-4'), t('lane.tasks', { done: doneN, total: tasks.length })),
    h('ul', { class: 'm-0 list-none space-y-1.5 p-0' }, ...tasks.map((x) => taskRow(x, harbor, start))),
    h('p', { class: 'm-0 text-xs text-muted' }, t('lane.rules', { xp: LANE_XP })));
}

/** Under the brief in the workspace: the side task is optional and outside the chapter (mockup v6 screen D). */
export function laneNote(task: Ticket, openBrief: (port: string) => void): HTMLElement {
  const r = ROUTES.find((x) => x.port === task.lane)!;
  return h('div', { class: 'my-3 space-y-2 rounded-lg bg-code p-3 text-sm' }, ...nodes(
    h('p', { class: 'm-0 flex items-start gap-1.5' }, icon('info', 'mt-0.5 size-4 shrink-0'), t('lane.rules', { xp: LANE_XP })),
    h('button', { type: 'button', class: 'flex items-center gap-1.5 px-3 py-1', onclick: () => openBrief(r.port) }, icon('map', 'size-4'), t('lane.seeBrief', { name: r.name }))));
}
```

**Sửa `src/ui/mapStrip.ts`** — thay:
```ts
import { getLang, t, type Key } from '../i18n';
import { CHAPTERS, chapterTitle } from '../progress';
import { derive, ROUTES } from '../scene';
import { actions } from '../state';
import { BTN_GO, cx } from '../theme';
```
bằng:
```ts
import { getLang, t, type Key } from '../i18n';
import { LANE_XP, laneLabel } from '../lanes';
import { CHAPTERS, chapterTitle } from '../progress';
import { derive, ROUTES, type Harbor } from '../scene';
import { actions, app } from '../state';
import { BTN_GO, cx } from '../theme';
```

**Sửa `src/ui/mapStrip.ts`** — thay:
```ts
import { icon } from './icons';
import { routeItems, routeMap } from './routeMap';

export interface StripView { tickets: Ticket[]; completed: Set<string>; selectedId: string }
type TaskState = 'done' | 'current' | 'locked';
```
bằng:
```ts
import { icon } from './icons';
import { laneInfo, lanePanel, stateOf, tasksOf } from './lanePanel';
import { startLane, toCurrentTask } from './modes';
import { routeMap } from './routeMap';

/** `lane`: the lane side task open in the workspace (Plan 5); the bar then shows that lane's tasks instead of the chapter's. */
export interface StripView { tickets: Ticket[]; completed: Set<string>; selectedId: string; lane?: Ticket }
type TaskState = 'done' | 'current' | 'locked';
```

**Sửa `src/ui/mapStrip.ts`** — thay:
```ts
 */
export function createMapStrip(host: HTMLElement): { update(view: StripView): void } {
  const dialog = byId('map-dialog') as HTMLDialogElement;
  let last: StripView | undefined;
  // The opener lives outside update() so the dialog's native focus return still finds it after a redraw.
```
bằng:
```ts
 */
export function createMapStrip(host: HTMLElement): { update(view: StripView): void; openLane(port: string): void } {
  const dialog = byId('map-dialog') as HTMLDialogElement;
  let last: StripView | undefined;
  /** Lane whose brief is open in the dialog (mockup v6 screen C); undefined = the lane list. */
  let lanePort: string | undefined;
  // The opener lives outside update() so the dialog's native focus return still finds it after a redraw.
```

**Sửa `src/ui/mapStrip.ts`** — thay:
```ts

  function fill({ tickets, completed }: StripView): void {
    const harbor = derive(tickets, completed);
    dialog.replaceChildren(h('div', { class: 'p-5' },
      h('h2', { id: 'map-dialog-title', class: 'm-0 text-lg font-bold' }, t('routes.title')),
      h('p', { class: 'mt-1 mb-3 text-sm text-muted' }, t('routes.subtitle')),
      routeMap(harbor).svg,
      // Always shown: the SVG labels hide below lg, and this is the readable version.
      h('ul', { class: 'mt-3 mb-0 list-none space-y-0.5 p-0 text-sm' }, ...routeItems(harbor).map((x) => h('li', {}, x))),
      h('p', { class: 'my-2 text-sm text-muted' }, t('map.lanes', { n: harbor.open.size, total: ROUTES.length })),
      h('form', { method: 'dialog', class: 'flex justify-end' }, h('button', {}, t('app.close')))));
  }

  return {
    update(view) {
      last = view;
      const { tickets, completed, selectedId } = view;
      const lang = getLang();
```
bằng:
```ts

  const start = (task: Ticket): void => {
    dialog.close();
    startLane(task);
  };
  const pick = (port: string | undefined): void => {
    lanePort = port;
    if (last) fill(last);
    dialog.querySelector<HTMLElement>(port ? '#lane-title' : `[data-lane]`)?.focus();
  };

  /**
   * Lane map + lane list + the brief of the picked lane (side panel from lg, the same sheet below it with "‹ Tất cả tuyến").
   * Pins are buttons with a one-line tooltip (D-B6: days and side tasks, never shipment counts); the HTML list is the
   * readable version and the way in when the SVG labels hide (L34).
   */
  function fill({ tickets, completed }: StripView): void {
    const harbor = derive(tickets, completed);
    const parts = routeMap(harbor);
    for (const r of ROUTES) {
      const pin = parts.pins[r.port];
      const tip = `${r.name} · ${laneInfo(r, harbor)}`;
      pin.setAttribute('r', '9'); // a bigger target than the 6-unit dot
      pin.setAttribute('role', 'button');
      pin.setAttribute('tabindex', '0');
      pin.setAttribute('aria-label', tip);
      pin.setAttribute('class', `${pin.getAttribute('class') ?? ''} cursor-pointer`);
      pin.replaceChildren(document.createElementNS('http://www.w3.org/2000/svg', 'title'));
      pin.firstChild!.textContent = tip;
      pin.addEventListener('click', () => pick(r.port));
      pin.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(r.port); } });
    }
    parts.svg.removeAttribute('role'); // the pins inside are controls now; the list below says the same in text
    const list = h('ul', { class: 'mt-3 mb-0 grid list-none gap-1.5 p-0 text-sm sm:grid-cols-2' }, ...ROUTES.map((r) =>
      h('li', {}, h('button', {
        type: 'button', 'data-lane': r.port, 'aria-current': r.port === lanePort ? 'true' : false,
        class: cx('flex w-full items-center gap-2 px-3 py-1.5 text-left', r.port === lanePort && 'ring-2 ring-accent', !harbor.open.has(r.port) && 'text-muted'),
        onclick: () => pick(r.port),
      }, icon(harbor.open.has(r.port) ? 'route' : 'lock', 'size-4'), h('b', {}, r.name), h('span', { class: 'ml-auto text-muted' }, laneInfo(r, harbor))))));
    const panel = lanePort
      ? h('div', { class: 'rounded-xl p-4 ring-1 ring-line' },
        h('button', { type: 'button', class: 'mb-2 flex items-center gap-1 px-2 py-1 text-sm lg:hidden', onclick: () => pick(undefined) }, icon('chevronLeft', 'size-4'), t('lane.all')),
        lanePanel(lanePort, harbor, start))
      : h('p', { class: 'm-0 self-start rounded-xl bg-code p-4 text-sm text-muted max-lg:hidden' }, t('lane.pick'));
    dialog.replaceChildren(h('div', { class: 'p-5' },
      h('div', { class: 'flex items-start gap-2' },
        h('div', { class: 'flex-1' },
          h('h2', { id: 'map-dialog-title', class: 'm-0 text-lg font-bold' }, t('routes.title')),
          h('p', { class: 'mt-1 mb-3 text-sm text-muted' }, t('map.lanes', { n: harbor.open.size, total: ROUTES.length }), ' · ', t('lane.pickShort'))),
        h('form', { method: 'dialog' }, h('button', { class: 'flex items-center gap-1 px-2 py-1 text-sm' }, icon('x', 'size-4'), t('app.close')))),
      h('div', { class: 'grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]' },
        h('div', { class: cx('min-w-0', lanePort && 'max-lg:hidden') }, parts.svg, list),
        panel)));
  }

  /** Lane mode of the task bar (mockup v6 screen D): back to the story, the lane's badge and its side tasks. */
  function laneBar(lane: Ticket, harbor: Harbor): HTMLElement {
    const lang = getLang();
    const r = ROUTES.find((x) => x.port === lane.lane)!;
    const tasks = tasksOf(r.port).map((x) => {
      const state = stateOf(x, harbor);
      const label = `${laneLabel(x)} · ${textOf(x, lang).title} · ${t(state === 'done' ? 'map.beat.done' : state === 'open' ? 'lane.stateOpen' : 'nav.taskLocked')}`;
      const here = x.id === lane.id;
      return h('button', {
        type: 'button', 'data-nav': `l:${x.id}`, title: label, 'aria-label': label, disabled: state === 'locked', 'aria-current': here ? 'page' : false,
        class: cx('relative grid h-10 shrink-0 place-items-center px-2 text-sm font-semibold sm:h-8', state === 'done' && 'text-good', state === 'locked' && 'text-muted',
          here && 'border-b-4 border-b-accent bg-accent-soft'),
        onclick: () => { if (!here) startLane(x); },
      }, state === 'locked' ? icon('lock', 'size-3.5') : laneLabel(x),
        state === 'done' ? h('span', { class: 'absolute -top-1 -right-1 grid size-3.5 place-items-center rounded-full bg-panel ring-1 ring-line', 'aria-hidden': 'true' }, icon('check', 'size-2.5')) : null);
    });
    return h('nav', { class: 'flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-1.5 text-sm', 'aria-label': t('nav.tasks') },
      h('button', { type: 'button', 'data-nav': 'back', class: 'flex shrink-0 items-center gap-1 px-3 py-1', onclick: () => toCurrentTask() }, icon('chevronLeft', 'size-4'), t('lane.back')),
      h('span', { class: 'flex shrink-0 items-center gap-1.5 rounded-lg bg-accent-soft px-2 py-1 font-semibold' }, icon('route', 'size-4'), t('lane.badge', { name: r.name })),
      h('div', { class: 'flex shrink-0 items-center gap-1' }, ...tasks),
      h('span', { class: 'text-muted max-sm:hidden' }, t('lane.optional', { xp: LANE_XP })),
      h('div', { class: 'ml-auto flex shrink-0 items-center gap-2 text-muted' },
        h('span', { class: 'max-sm:hidden' }, t('map.lanes', { n: harbor.open.size, total: ROUTES.length })),
        mapBtn));
  }

  return {
    openLane(port) {
      lanePort = port;
      if (last) fill(last);
      dialog.showModal();
      dialog.querySelector<HTMLElement>('#lane-title')?.focus();
    },
    update(view) {
      last = view;
      const { tickets, completed, selectedId } = view;
      if (view.lane) {
        const focusedLane = host.contains(document.activeElement) ? document.activeElement?.getAttribute('data-nav') : null;
        mapBtn.replaceChildren(icon('map', 'size-4'), h('span', { class: 'max-sm:sr-only' }, t('map.see')));
        host.replaceChildren(laneBar(view.lane, derive(tickets, completed)));
        if (focusedLane) host.querySelector<HTMLElement>(`[data-nav="${CSS.escape(focusedLane)}"]`)?.focus();
        if (dialog.open) fill(view);
        return;
      }
      const lang = getLang();
```

**Sửa `src/ui/modes.ts`** — thay:
```ts
import { t } from '../i18n';
import { applyResult, isSuccess, movedToday, pickForSkill, retryItem, type PracticeItem } from '../practice';
import { hashOf } from '../route';
```
bằng:
```ts
import { t } from '../i18n';
import { LANE_XP } from '../lanes';
import { applyResult, isSuccess, movedToday, pickForSkill, retryItem, type PracticeItem } from '../practice';
import { nextTicket } from '../progress';
import { hashOf } from '../route';
```

**Sửa `src/ui/modes.ts`** — thay:
```ts
import { homeHooks, registerHomeSection, registerMode } from './homeView';
import { go } from './router';
```
bằng:
```ts
import { homeHooks, registerHomeSection, registerMode } from './homeView';
import { laneNote } from './lanePanel';
import { go } from './router';
```

**Sửa `src/ui/modes.ts`** — thay:
```ts
export const backToStory = (): void => enter({ kind: 'story' });
```
bằng:
```ts
export const backToStory = (): void => enter({ kind: 'story' });
/** Plan 5: a lane side task in the workspace. It never becomes the next ticket and counts for no chapter (D-B1). */
export const startLane = (task: Ticket): void => enter({ kind: 'lane', ticket: task });
/** "Về việc đang làm": the story's next ticket (mockup v6 screen D), or the open one when everything is done. */
export const toCurrentTask = (): void => actions.selectTicket(nextTicket(app.tickets, done())?.id ?? app.selectedId);
```

**Sửa `src/ui/modes.ts`** — thay:
```ts

/** work.ts onSolved: Practice moves Leitner boxes only; the story completes the ticket (XP, animation). */
export const onSolved = (tk: Ticket): void => (session.mode.kind === 'practice' ? onPracticeSolved() : actions.complete(tk));
```
bằng:
```ts

/** work.ts onSolved: Practice moves Leitner boxes only; a lane task gives flat XP; the story completes the ticket (XP, animation). */
export const onSolved = (tk: Ticket): void =>
  (session.mode.kind === 'practice' ? onPracticeSolved() : session.mode.kind === 'lane' ? completeLane(tk) : actions.complete(tk));

/** Correct lane side task: saved apart from `completed`, LANE_XP whatever hints were opened, no animation (D-B1). */
function completeLane(tk: Ticket): void {
  if (app.save.lanes.includes(tk.id)) return;
  app.save.lanes.push(tk.id);
  app.save.xp += LANE_XP;
  persist(true);
  ctx?.rerender();
  byId('announce').textContent = t('lane.solved', { xp: LANE_XP });
  byId('ticket').querySelector<HTMLElement>('.recap h3')?.focus(); // the Submit button just disappeared
}
```

**Sửa `src/ui/modes.ts`** — thay:
```ts

/** Top-bar "Review: N" (P3): N = items in today's queue; hidden when the queue is empty. */
```
bằng:
```ts

function lanePane(host: HTMLElement, tk: Ticket): void {
  renderBrief(host, tk, 0);
  host.querySelector('header')?.after(skillChips(tk) ?? '', laneNote(tk, (port) => actions.openLane(port)));
}

/** Top-bar "Review: N" (P3): N = items in today's queue; hidden when the queue is empty. */
```

**Sửa `src/ui/modes.ts`** — thay:
```ts
  else if (m.kind === 'practice') practicePane(host, m.run);
  else storyPane(host);
```
bằng:
```ts
  else if (m.kind === 'practice') practicePane(host, m.run);
  else if (m.kind === 'lane') lanePane(host, m.ticket);
  else storyPane(host);
```

**Sửa `src/ui/modes.ts`** — thay:
```ts
  id: 'play', order: 20, label: 'nav.play', href: hashOf('play'),
  current: (r) => r === 'play' && isStory(),
  onclick: () => (isStory() ? go('play') : backToStory()),
```
bằng:
```ts
  id: 'play', order: 20, label: 'nav.play', href: hashOf('play'),
  current: (r) => r === 'play' && (isStory() || session.mode.kind === 'lane'),
  onclick: () => (isStory() ? go('play') : backToStory()),
```

**Sửa `src/ui/pin.ts`** — thay:
```ts
import { getLang, t } from '../i18n';
import { session } from '../session';
import { actions, app, done, persist, selected } from '../state';
import { BTN_GO, cx } from '../theme';
```
bằng:
```ts
import { getLang, t } from '../i18n';
import { activeTicket, session } from '../session';
import { actions, app, done, persist } from '../state';
import { BTN_GO, cx } from '../theme';
```

**Sửa `src/ui/pin.ts`** — thay:
```ts

/** Where Pin is offered (L49): the Sandbox, and a story task once it is solved (so the player's own SQL is pinned, never a hint). */
function source(): string | undefined {
  const m = session.mode;
  if (m.kind === 'sandbox') return 'sandbox';
  if (m.kind === 'story' && done().has(app.selectedId)) return app.selectedId;
  return undefined;
```
bằng:
```ts

/** Where Pin is offered (L49): the Sandbox, and a story or lane task once it is solved (the player's own SQL, never a hint). */
function source(): string | undefined {
  const m = session.mode;
  if (m.kind === 'sandbox') return 'sandbox';
  if (m.kind === 'story' && done().has(app.selectedId)) return app.selectedId;
  if (m.kind === 'lane' && app.save.lanes.includes(m.ticket.id)) return m.ticket.id;
  return undefined;
```

**Sửa `src/ui/pin.ts`** — thay:
```ts
    type: 'text', id: 'pin-title', maxlength: String(MAX_CARD_TITLE), class: 'mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink',
    value: from === 'sandbox' ? '' : textOf(selected(), lang).title.slice(0, MAX_CARD_TITLE),
  });
```
bằng:
```ts
    type: 'text', id: 'pin-title', maxlength: String(MAX_CARD_TITLE), class: 'mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink',
    value: from === 'sandbox' ? '' : textOf(activeTicket()!, lang).title.slice(0, MAX_CARD_TITLE),
  });
```

**Sửa `src/ui/work.ts`** — thay:
```ts
import { SKILLS } from '../progress';
import { isClosed, isStory, readDraft, workKey, writeDraft } from '../session';
import { app, editorSchema, initialDoc, persist, stepKey, type LastRun } from '../state';
```
bằng:
```ts
import { SKILLS } from '../progress';
import { isClosed, keepsWork, readDraft, workKey, writeDraft } from '../session';
import { app, editorSchema, initialDoc, persist, stepKey, type LastRun } from '../state';
```

**Sửa `src/ui/work.ts`** — thay:
```ts
  function drawHistory(): void {
    const list = ticket && isStory() ? history[ticket.id] ?? [] : []; // in Practice it would show the story's passing SQL
    historyBox.hidden = list.length === 0;
```
bằng:
```ts
  function drawHistory(): void {
    const list = ticket && keepsWork() ? history[ticket.id] ?? [] : []; // in Practice it would show the story's passing SQL
    historyBox.hidden = list.length === 0;
```

**Sửa `src/ui/work.ts`** — thay:
```ts
    const k = tk ? stepKey(tk.id, stepIndex) : '';
    const historyId = isStory() ? tk?.id : undefined; // a practice variant shares the ticket id: keep it out of that history (P5)
    ed.closeCompletion();
```
bằng:
```ts
    const k = tk ? stepKey(tk.id, stepIndex) : '';
    const historyId = keepsWork() ? tk?.id : undefined; // a practice variant shares the ticket id: keep it out of that history (P5)
    ed.closeCompletion();
```

**Sửa `src/ui/work.ts`** — thay:
```ts
    }
    const historyId = isStory() ? tk.id : undefined;
    busy = true;
```
bằng:
```ts
    }
    const historyId = keepsWork() ? tk.id : undefined;
    busy = true;
```

**Sửa `src/ui/work.ts`** — thay:
```ts
    const k = stepKey(tk.id, i);
    const story = isStory(); // captured at click time, like the ticket
    const sql = ed.getValue(); // Submit always grades the whole editor
```
bằng:
```ts
    const k = stepKey(tk.id, i);
    const story = keepsWork(); // captured at click time, like the ticket (a lane side task keeps its graded SQL too)
    const sql = ed.getValue(); // Submit always grades the whole editor
```

- [ ] **Step 4: Chạy test, ngân sách, commit**

Run: `npm test && npx tsc --noEmit && npm run build && node scripts/check-budget.mjs`
Expected: mọi test PASS; `main ≈ 265 / 270`; nhóm `lanes` có mặt (gần 0 KB).

```bash
git add content/lanes/lanes.yml scripts/check-budget.mjs src/content.ts src/i18n/en.ts src/i18n/vi.ts src/laneSources.ts src/lanes.ts src/main.ts src/scene.ts src/session.ts src/state.ts src/tickets.ts src/ui/brief.ts src/ui/dashboard.ts src/ui/dataView.ts src/ui/lanePanel.ts src/ui/mapStrip.ts src/ui/modes.ts src/ui/pin.ts src/ui/work.ts tests/lanes.test.ts tests/scene.test.ts
git commit -m "lanes: side tasks outside chapter progress, lane mode, lane list and briefs in the map dialog, lane tables (Plan 5 T8, T9, T11)

Claude-Session: https://claude.ai/code/session_01PwPSBV1SVDP6quEZfKN56M"
```

---

### Task 7: Nội dung bài tuyến đợt 1 (3 hồ sơ, 9 bài)

**Files:**
- Create: `content/lanes/lanes.yml` (thay bản rỗng), `content/lanes/nlrtm/r-1.md`, `r-2.md`, `r-3.md`, `content/lanes/sgsin/sg-1.md`, `sg-2.md`, `sg-3.md`, `content/lanes/ausyd/s-1.md`, `s-2.md`, `s-3.md`
- Modify: `tests/lanes.test.ts`

**Interfaces:**
- Consumes: `parseTicket` + `lane:`, `parseLaneBriefs`, `laneProblems`, `LANE_TABLES` (Task 6).

- [ ] **Step 1: Viết test nội dung (luật mở, Tiên Sa, R-3 và "+40%" chờ ch7, song ngữ, luật đề, Solution chạy ra dòng)**

**Thêm vào cuối `tests/lanes.test.ts`:**
```ts

/** Plan 5 lane content (content/lanes/): the same release rules as story tickets (tests/content.test.ts), on their own list. */
describe('nội dung bài tuyến đợt 1 (Rotterdam, Singapore, Sydney)', async () => {
  const { loadLanes } = await import('../src/content');
  const { CHAPTER_TABLES } = await import('../src/progress');
  const { personOf } = await import('../src/people');
  const { textOf } = await import('../src/tickets');
  const { runner } = await import('./helpers');
  const briefsYml = (await import('../content/lanes/lanes.yml?raw')).default;
  const { tasks, briefs } = loadLanes();
  const VI_DIACRITIC = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
  const SQLISH = /\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|JOIN|HAVING|LIMIT|COUNT|SUM|AVG|DISTINCT|BOOKED|IN_TRANSIT|ARRIVED|DELIVERED|CANCELLED|EXPORT|IMPORT|SEA|AIR)\b|\b[a-z]+_[a-z_]+\b/g;
  const codeSpans = (s: string): string[] => [...s.matchAll(/`([^`]+)`/g)].map((m) => m[1]).sort();
  const ALL = [...Object.values(CHAPTER_TABLES).flat(), ...Object.values(LANE_TABLES).flat()];
  const tablesIn = (sql: string): string[] =>
    [...new Set([...sql.matchAll(/\b(?:from|join)\s+([a-z_][a-z0-9_]*)/gi)].map((m) => m[1].toLowerCase()))].filter((x) => ALL.includes(x));
  const prompt = (t: Ticket, lang: 'vi' | 'en'): string => { const x = textOf(t, lang); return [x.body, x.task].join('\n'); };
  const allText = (t: Ticket, lang: 'vi' | 'en'): string => { const x = textOf(t, lang); return [x.title, x.body, x.task, ...x.hints].join('\n'); };

  it('9 bài tuyến cho 3 tuyến, mỗi tuyến có hồ sơ; không lỗi luật mở (kỹ năng, bảng, chương, id)', () => {
    expect(tasks.map((t) => t.id).sort()).toEqual(['r-1', 'r-2', 'r-3', 's-1', 's-2', 's-3', 'sg-1', 'sg-2', 'sg-3']);
    expect(briefs.map((b) => b.port).sort()).toEqual(['AUSYD', 'NLRTM', 'SGSIN']);
    expect(laneProblems(tasks, briefs, story)).toEqual([]);
    expect(tasks.filter((t) => !t.lane || t.variants || t.beat !== 'rest').map((t) => t.id)).toEqual([]); // no Practice deck, so no variants (D-B5)
    expect(tasks.filter((t) => personOf(t.from.name)?.dept !== t.from.dept).map((t) => t.id)).toEqual([]);
  });

  it('L49: cảng gốc là Tiên Sa, không còn chữ Cát Lái; người gửi R-2 là Đặng Hà (Sales)', () => {
    const texts = [briefsYml, ...tasks.flatMap((t) => [allText(t, 'vi'), allText(t, 'en')])].join('\n');
    expect(texts).not.toMatch(/c[áa]t\s*l[áa]i/i);
    for (const b of briefs) expect(JSON.stringify(b)).toMatch(/Tiên Sa.*Tien Sa/s); // VI and EN both name the hub
    expect(tasks.find((t) => t.id === 'r-2')!.from).toEqual({ name: 'Đặng Hà', dept: 'Sales' });
  });

  it('L49: R-3 mở sau chương 7; trước đó hồ sơ Rotterdam không lộ "+40%" hay chi tiết tăng giá', () => {
    expect(tasks.find((t) => t.id === 'r-3')!.chapter).toBe(7);
    const b = briefs.find((x) => x.port === 'NLRTM')!;
    const visible = (passed: Set<number>, lang: 'vi' | 'en') => [b.intro[lang], b.asked[lang],
      ...b.numbers.filter((x) => shown(x, passed)).flatMap((x) => [x.value ?? '', x.text[lang]]),
      ...b.facts.filter((x) => shown(x, passed)).flatMap((x) => [x.label?.[lang] ?? '', x.text[lang]])].join('\n');
    const RISE = /40\s*%|GRI|tăng giá|rate (rise|increase)/i;
    for (const lang of ['vi', 'en'] as const) {
      expect(visible(new Set([1, 2, 3, 4, 5, 6]), lang)).not.toMatch(RISE);
      expect(visible(new Set([1, 2, 3, 4, 5, 6, 7]), lang)).toMatch(RISE);
    }
  });

  it('hồ sơ tuyến: EN không dấu tiếng Việt', () => {
    const en = briefs.flatMap((b) => [b.country.en, b.intro.en, b.asked.en, ...[...b.numbers, ...b.facts].flatMap((x) => [x.text.en, x.label?.en ?? ''])]);
    expect(en.join('\n')).not.toMatch(VI_DIACRITIC);
  });

  it.each(tasks)('$id: song ngữ, code span VI = EN, EN không dấu, đề không có backtick / từ khóa SQL / tên cột', (t) => {
    expect(t.en).toBeDefined();
    expect(codeSpans(allText(t, 'en'))).toEqual(codeSpans(allText(t, 'vi')));
    expect(allText(t, 'en').replace(/`[^`]+`/g, '')).not.toMatch(VI_DIACRITIC);
    for (const lang of ['vi', 'en'] as const) {
      expect(prompt(t, lang)).not.toContain('`');
      expect(prompt(t, lang).match(SQLISH)).toBeNull();
    }
  });

  it.each(tasks)('$id: Solution chạy được, có dòng, đủ nhãn cột, ORDER BY khi ordered, chỉ dùng bảng đã khai', async (t) => {
    const sql = t.steps[0].solution;
    expect(sql).not.toMatch(/current_date|current_timestamp|localtimestamp|now\s*\(/i);
    if (t.ordered) expect(sql).toMatch(/order\s+by/i);
    expect(tablesIn(sql).filter((x) => !t.tables.includes(x))).toEqual([]);
    const r = await (await runner())(sql);
    expect(r.rows.length).toBeGreaterThan(0);
    expect(t.steps[0].columns?.length).toBe(r.columns.length);
    for (const label of t.steps[0].columns ?? []) {
      expect(label.en).not.toMatch(VI_DIACRITIC);
      expect(r.columns).not.toContain(label.vi);
    }
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/lanes.test.ts`
Expected: FAIL ở "9 bài tuyến cho 3 tuyến" (chưa có nội dung).

- [ ] **Step 3: Viết hồ sơ và bài tuyến**

**Tạo `content/lanes/ausyd/s-1.md`:**
````markdown
---
id: s-1
lane: AUSYD
chapter: 5
title: Hãng nào trễ trên tuyến Úc
title_en: Who runs late on the Australia lane
from: { name: Võ Lan, dept: Ops }
difficulty: 3
beat: rest
requires: [join, date_math, conditional_agg, aggregate, group_by, order_by]
grants: []
tables: [shipments, carriers]
ordered: true
columns:
  - { vi: "Hãng tàu", en: "Carrier" }
  - { vi: "Số lô", en: "Shipments" }
  - { vi: "Lô đến trễ hơn 2 ngày", en: "Shipments over 2 days late" }
  - { vi: "Số ngày đi biển trung bình", en: "Average days at sea" }
---
Khách nhập hàng từ Sydney phàn nàn hàng về trễ. Trước khi đặt chỗ đợt tới, mình muốn biết hãng nào hay trễ nhất.

## Task
Với các lô nhập khẩu từ cảng Sydney có ngày cập cảng thực tế từ 01/01/2026 đến hết 31/10/2026, mỗi hãng tàu (gọi bằng tên) cho mình: số lô, số lô cập cảng trễ hơn 2 ngày so với ngày đến dự kiến, và số ngày đi biển trung bình (từ ngày tàu chạy thực tế tới ngày cập cảng thực tế, không làm tròn). Hãng có nhiều lô trễ nhất xếp đầu; bằng nhau thì theo tên hãng từ A đến Z.

## Hints
1. Mỗi hãng một dòng, trong đó có hai phép đếm: đếm mọi lô, và chỉ đếm những lô trễ; số ngày đi biển là trung bình của hiệu hai ngày thực tế.
2. `shipments.carrier_id` trỏ tới `carriers.id`; cảng xếp hàng `pol` (Sydney là `AUSYD`), ngày đến dự kiến `eta`, ngày tàu chạy và cập cảng thực tế `atd`, `ata`. Trễ hơn 2 ngày: `ata - eta > 2`.
3. `COUNT(*) FILTER (WHERE s.ata - s.eta > 2)` đếm lô trễ; dùng lại đúng biểu thức đó trong ORDER BY.

## Solution
```sql
SELECT ca.name, COUNT(*),
  COUNT(*) FILTER (WHERE s.ata - s.eta > 2),
  AVG(s.ata - s.atd)
FROM shipments s
JOIN carriers ca ON ca.id = s.carrier_id
WHERE s.pol = 'AUSYD' AND s.direction = 'IMPORT'
  AND s.ata >= '2026-01-01' AND s.ata < '2026-11-01'
GROUP BY ca.name
ORDER BY COUNT(*) FILTER (WHERE s.ata - s.eta > 2) DESC, ca.name
```

# EN
Customers importing from Sydney say their cargo arrives late. Before booking the next round, I want to know which carrier runs late most often.

## Task
For shipments imported from the port of Sydney whose actual arrival is between 1 January 2026 and 31 October 2026, give me for each carrier (by name): the number of shipments, how many arrived more than 2 days after their estimated arrival, and the average days at sea (from the actual departure to the actual arrival, not rounded). The carrier with the most late shipments first; on a tie, carrier name from A to Z.

## Hints
1. One row per carrier holding two counts: every shipment, and only the late ones; the days at sea are the average of the difference between the two actual dates.
2. `shipments.carrier_id` points to `carriers.id`; port of loading `pol` (Sydney is `AUSYD`), estimated arrival `eta`, actual departure and arrival `atd`, `ata`. More than 2 days late: `ata - eta > 2`.
3. `COUNT(*) FILTER (WHERE s.ata - s.eta > 2)` counts the late ones; use the very same expression in ORDER BY.
````

**Tạo `content/lanes/ausyd/s-2.md`:**
````markdown
---
id: s-2
lane: AUSYD
chapter: 5
title: Tiền dầu mỗi TEU
title_en: Fuel cost per TEU
from: { name: Hoàng Thảo, dept: Finance }
difficulty: 3
beat: rest
requires: [join, order_by]
grants: []
tables: [lane_profiles, bunker_prices]
ordered: true
columns:
  - { vi: "Tháng", en: "Month" }
  - { vi: "Tiền nhiên liệu cả chuyến (USD)", en: "Voyage fuel cost (USD)" }
  - { vi: "Tiền nhiên liệu mỗi TEU (USD)", en: "Fuel cost per TEU (USD)" }
---
Hãng tàu đòi tăng phụ phí nhiên liệu tuyến Úc. Mình muốn tự ước tính tiền dầu mỗi TEU để xem họ đòi có hợp lý không.

## Task
Với chặng Tiên Sa – Sydney, mỗi tháng 7, 8, 9 năm 2026 cho mình: tiền nhiên liệu cả chuyến (số ngày đi biển × tấn nhiên liệu mỗi ngày × giá nhiên liệu tháng đó) và phần chia cho mỗi TEU theo sức chở của tàu, tính bằng USD, không làm tròn. Xếp theo tháng từ sớm tới muộn.

## Hints
1. Chặng chỉ có một hồ sơ, còn giá nhiên liệu có một dòng mỗi tháng: ghép hồ sơ chặng với ba tháng cần xem, mỗi tháng thành một dòng, rồi nhân chia trên dòng đó.
2. Bảng `lane_profiles` (mở cùng tuyến Sydney): `pol` = `VNDAD`, `pod` = `AUSYD`, số ngày `sea_days`, tấn mỗi ngày `fuel_t_per_day`, sức chở `vessel_teu`. Bảng `bunker_prices`: tháng `month` (ngày đầu tháng), giá `usd_per_tonne`.
3. `FROM lane_profiles l JOIN bunker_prices b ON b.month >= '2026-07-01' AND b.month < '2026-10-01' WHERE l.pol = 'VNDAD' AND l.pod = 'AUSYD'`: điều kiện nối chỉ cần chọn tháng.

## Solution
```sql
SELECT b.month,
  l.sea_days * l.fuel_t_per_day * b.usd_per_tonne,
  l.sea_days * l.fuel_t_per_day * b.usd_per_tonne / l.vessel_teu
FROM lane_profiles l
JOIN bunker_prices b ON b.month >= '2026-07-01' AND b.month < '2026-10-01'
WHERE l.pol = 'VNDAD' AND l.pod = 'AUSYD'
ORDER BY b.month
```

# EN
The carriers want a higher bunker surcharge on the Australia lane. I want to estimate the fuel cost per TEU myself to see whether their ask is fair.

## Task
For the Tien Sa to Sydney leg, give me for each of July, August and September 2026: the fuel cost of the whole voyage (days at sea × tonnes of fuel per day × that month's fuel price) and the share per TEU of the ship's capacity, in USD, not rounded. Sort by month, earliest first.

## Hints
1. The leg has one profile, while fuel prices have one row per month: pair the leg's profile with the three months you need, one row per month, then multiply and divide on that row.
2. Table `lane_profiles` (it opens with the Sydney lane): `pol` = `VNDAD`, `pod` = `AUSYD`, days `sea_days`, tonnes per day `fuel_t_per_day`, capacity `vessel_teu`. Table `bunker_prices`: month `month` (first day of the month), price `usd_per_tonne`.
3. `FROM lane_profiles l JOIN bunker_prices b ON b.month >= '2026-07-01' AND b.month < '2026-10-01' WHERE l.pol = 'VNDAD' AND l.pod = 'AUSYD'`: the join condition only has to pick the months.
````

**Tạo `content/lanes/ausyd/s-3.md`:**
````markdown
---
id: s-3
lane: AUSYD
chapter: 5
title: Đồ gỗ đi Úc theo tháng
title_en: Furniture to Australia by month
from: { name: Hoàng Dũng, dept: Sales }
difficulty: 3
beat: rest
requires: [join, date_bucket, aggregate, group_by, order_by]
grants: []
tables: [shipments, customers]
ordered: true
columns:
  - { vi: "Tháng", en: "Month" }
  - { vi: "Số lô", en: "Shipments" }
  - { vi: "Tổng trọng lượng (kg)", en: "Total weight (kg)" }
---
Úc kiểm dịch đồ gỗ rất chặt, mình định mời khách đồ gỗ học một buổi về chuẩn xử lý pallet. Mình cần biết mỗi tháng họ gửi bao nhiêu hàng sang Úc để chọn lúc ít hàng.

## Task
Với các lô xuất khẩu đi cảng Sydney của khách ngành đồ gỗ, đặt chỗ từ 01/01/2026 đến hết 31/10/2026, không tính lô đã hủy: mỗi tháng đặt chỗ cho mình số lô và tổng trọng lượng (kg). Chỉ những tháng có lô; xếp theo tháng từ sớm tới muộn.

## Hints
1. Ngành hàng thuộc về khách nên phải đi từ lô sang khách; sau đó gom các lô theo tháng đặt chỗ.
2. `shipments.customer_id` trỏ tới `customers.id`; ngành ở `customers.industry` (đồ gỗ là `Furniture`); cảng đến `pod` (Sydney là `AUSYD`). Đưa ngày về đầu tháng bằng `date_trunc('month', booking_date)`.
3. `SELECT date_trunc('month', s.booking_date), COUNT(*), SUM(s.gross_weight_kg) FROM shipments s JOIN customers c ON ... WHERE ... GROUP BY 1 ORDER BY 1`

## Solution
```sql
SELECT date_trunc('month', s.booking_date), COUNT(*), SUM(s.gross_weight_kg)
FROM shipments s
JOIN customers c ON c.id = s.customer_id
WHERE s.pod = 'AUSYD' AND s.direction = 'EXPORT' AND s.status <> 'CANCELLED'
  AND c.industry = 'Furniture'
  AND s.booking_date >= '2026-01-01' AND s.booking_date < '2026-11-01'
GROUP BY 1
ORDER BY 1
```

# EN
Australia is strict about wooden furniture, so I plan a session on pallet treatment rules for our furniture customers. I need to know how much they ship to Australia each month to pick a quiet one.

## Task
For export shipments to the port of Sydney from customers in the furniture industry, booked between 1 January 2026 and 31 October 2026, leaving out cancelled ones: for each booking month give me the number of shipments and the total weight (kg). Only months that have shipments; sort by month, earliest first.

## Hints
1. The industry belongs to the customer, so go from the shipment to its customer; then group the shipments by booking month.
2. `shipments.customer_id` points to `customers.id`; the industry is in `customers.industry` (furniture is `Furniture`); the destination is `pod` (Sydney is `AUSYD`). Bring a date back to the start of its month with `date_trunc('month', booking_date)`.
3. `SELECT date_trunc('month', s.booking_date), COUNT(*), SUM(s.gross_weight_kg) FROM shipments s JOIN customers c ON ... WHERE ... GROUP BY 1 ORDER BY 1`
````

**Tạo `content/lanes/lanes.yml`:**
```yaml
# Lane briefs (product-design-v3 §13, §17, §18; L48, L49). One entry per map port (src/scene.ts ROUTES) that has side tasks in
# content/lanes/<port>/. Lanes without an entry show "đợt sau" in the lane list.
# The hub is Tien Sa (Da Nang, VNDAD), as on the map (L49). Figures are illustrative and simplified (the brief says so).
# numbers: { value, text } — the figures to remember; facts: { label, text } — detail rows.
# after: N — shown only once chapter N's promotion review is passed (L49: the Rotterdam rate rise waits for chapter 7).
- port: NLRTM
  country: { vi: "Hà Lan", en: "Netherlands" }
  intro:
    vi: "Rotterdam là cảng lớn nhất châu Âu và là cửa ngõ chính cho hàng Việt Nam vào EU. Từ Tiên Sa, tàu đi khoảng 30 ngày qua kênh Suez, thường đổi sang tàu lớn ở Singapore. Khi Biển Đỏ bất ổn, hãng tàu vòng qua Mũi Hảo Vọng, thêm 10–14 ngày và tốn thêm nhiên liệu."
    en: "Rotterdam is Europe's largest port and the main gateway for Vietnamese goods into the EU. From Tien Sa a ship takes about 30 days through the Suez Canal, usually changing to a bigger ship in Singapore. When the Red Sea is unsafe, carriers sail around the Cape of Good Hope, adding 10 to 14 days and more fuel."
  numbers:
    - { value: "~30", text: { vi: "ngày đi biển", en: "days at sea" } }
    - { value: "FOB", text: { vi: "điều kiện phổ biến nhất", en: "the most common term" } }
    - { value: "+40%", text: { vi: "giá mua từ 15/07/2026", en: "buy rate from 15 Jul 2026" }, after: 7 }
  facts:
    - label: { vi: "Hàng chính", en: "Main cargo" }
      text: { vi: "Dệt may, hải sản đông lạnh, đồ gỗ, cà phê, hạt điều.", en: "Textiles, frozen seafood, furniture, coffee, cashews." }
    - label: { vi: "Incoterms", en: "Incoterms" }
      text: { vi: "Phần lớn FOB: người mua châu Âu tự thuê tàu, mình lo chặng nội địa và thủ tục xuất.", en: "Mostly FOB: the European buyer books the ship, we handle the inland leg and export formalities." }
    - label: { vi: "BAF", en: "BAF" }
      text: { vi: "Phụ phí nhiên liệu đổi theo giá dầu; tuyến càng dài càng nhạy.", en: "The bunker surcharge follows the fuel price; the longer the lane, the more it moves." }
    - label: { vi: "Mùa vụ", en: "Season" }
      text: { vi: "Cao điểm quý 3–4 (hàng Giáng sinh).", en: "Peak in Q3 and Q4 (Christmas goods)." }
    - label: { vi: "Hay vướng", en: "Common trouble" }
      text: { vi: "Thiếu chỗ mùa cao điểm, đổi lịch khi tàu phải vòng Mũi Hảo Vọng.", en: "No space in the peak season, schedule changes when ships go around the Cape." }
    - label: { vi: "Tăng giá", en: "Rate rise" }
      text: { vi: "Đợt tăng giá chung (GRI) ngày 15/07/2026 đẩy giá mua tuyến châu Âu lên khoảng 40%.", en: "The general rate increase (GRI) of 15 July 2026 pushed Europe buy rates up by about 40%." }
      after: 7
  asked:
    vi: "Hàng gì đang đi châu Âu, theo điều kiện giao hàng nào?"
    en: "What is going to Europe, and under which delivery terms?"

- port: SGSIN
  country: { vi: "Singapore", en: "Singapore" }
  intro:
    vi: "Singapore là cảng trung chuyển lớn của Đông Nam Á: hàng từ Tiên Sa đi châu Âu, Ấn Độ hay bờ Đông nước Mỹ thường được dỡ ở đây rồi xếp lên tàu mẹ lớn hơn. Chặng Tiên Sa – Singapore ngắn, khoảng 3 ngày, tàu gom nhỏ chạy nhiều chuyến mỗi tuần."
    en: "Singapore is Southeast Asia's big transshipment hub: cargo from Tien Sa to Europe, India or the US East Coast is often unloaded here and put on a bigger mother vessel. The Tien Sa to Singapore leg is short, about 3 days, and small feeder ships sail several times a week."
  numbers:
    - { value: "~3", text: { vi: "ngày đi biển", en: "days at sea" } }
    - { value: "5", text: { vi: "tuyến từ Tiên Sa đổi tàu ở đây", en: "lanes from Tien Sa change ship here" } }
    - { value: "2", text: { vi: "chặng cho hàng đi xa: tàu gom, tàu mẹ", en: "legs for long hauls: feeder, mother vessel" } }
  facts:
    - label: { vi: "Vai trò", en: "Role" }
      text: { vi: "Cảng trung chuyển: hàng đổi từ tàu gom (feeder) sang tàu mẹ.", en: "Transshipment hub: cargo moves from feeder ships to mother vessels." }
    - label: { vi: "Hàng chính", en: "Main cargo" }
      text: { vi: "Hàng tiêu dùng, điện tử, thép, vật liệu xây dựng.", en: "Consumer goods, electronics, steel, building materials." }
    - label: { vi: "Thời gian", en: "Time" }
      text: { vi: "Khoảng 3 ngày đi biển; hàng đi tiếp thường chờ thêm 1–2 ngày để đổi tàu.", en: "About 3 days at sea; cargo going further often waits 1 to 2 more days to change ship." }
    - label: { vi: "Hay vướng", en: "Common trouble" }
      text: { vi: "Lỡ chuyến tàu mẹ thì hàng nằm cảng chờ chuyến sau (rớt tàu).", en: "Miss the mother vessel and the cargo waits in port for the next one (rolled cargo)." }
  asked:
    vi: "Lô nào đi Singapore rồi đi tiếp, và thực tế mất bao nhiêu ngày?"
    en: "Which cargo goes on from Singapore, and how many days does it really take?"

- port: AUSYD
  country: { vi: "Úc", en: "Australia" }
  intro:
    vi: "Tuyến Sydney chạy hai chiều với hai câu chuyện khác nhau. Chiều về: lúa mì Úc cho nhà máy bột mì và thức ăn chăn nuôi ở Việt Nam, phần lớn bằng tàu rời. Chiều đi: đồ gỗ, hải sản, hàng tiêu dùng. Úc kiểm dịch sinh học rất chặt: pallet và bao bì gỗ phải xử lý theo chuẩn ISPM 15, đồ gỗ dễ bị giữ lại kiểm tra."
    en: "The Sydney lane runs both ways with two different stories. Inbound: Australian wheat for flour and feed mills in Vietnam, mostly by bulk carrier. Outbound: furniture, seafood and consumer goods. Australia's biosecurity is strict: wooden pallets and packaging must be treated to the ISPM 15 standard, and wooden furniture is often held for inspection."
  numbers:
    - { value: "~16", text: { vi: "ngày đi biển", en: "days at sea" } }
    - { value: "~48", text: { vi: "tấn nhiên liệu mỗi ngày (tàu 4.200 TEU)", en: "tonnes of fuel a day (4,200 TEU ship)" } }
    - { value: "BAF", text: { vi: "đổi theo giá dầu từng tháng", en: "follows the monthly fuel price" } }
  facts:
    - label: { vi: "Hàng chính", en: "Main cargo" }
      text: { vi: "Chiều về lúa mì; chiều đi đồ gỗ, hải sản.", en: "Wheat inbound; furniture and seafood outbound." }
    - label: { vi: "Kiểm dịch", en: "Biosecurity" }
      text: { vi: "ISPM 15 cho pallet và bao bì gỗ; đồ gỗ hay bị kiểm, có khi phải hun trùng lại.", en: "ISPM 15 for wooden pallets and packaging; furniture is often inspected and sometimes fumigated again." }
    - label: { vi: "Nhiên liệu", en: "Fuel" }
      text: { vi: "Chặng càng dài, nhiên liệu càng chiếm phần lớn chi phí, nên hãng tàu tính phụ phí BAF theo giá dầu.", en: "The longer the leg, the bigger the share of fuel in the cost, so carriers charge a BAF that follows the fuel price." }
    - label: { vi: "Trung chuyển", en: "Transshipment" }
      text: { vi: "Hàng đi Hải Phòng thường ghé Singapore, nên lâu hơn hàng từ Tiên Sa.", en: "Cargo for Hai Phong usually calls at Singapore, so it takes longer than cargo from Tien Sa." }
  asked:
    vi: "Hãng nào hay trễ trên tuyến Úc, và mỗi TEU gánh bao nhiêu tiền dầu?"
    en: "Which carrier runs late on the Australia lane, and how much fuel cost does each TEU carry?"
```

**Tạo `content/lanes/nlrtm/r-1.md`:**
````markdown
---
id: r-1
lane: NLRTM
chapter: 2
title: Điều kiện giao hàng tuyến Rotterdam
title_en: Delivery terms on the Rotterdam lane
from: { name: Đặng Hà, dept: Sales }
difficulty: 2
beat: rest
requires: [aggregate, group_by, order_by]
grants: []
tables: [shipments]
ordered: true
columns:
  - { vi: "Điều kiện giao hàng", en: "Delivery term" }
  - { vi: "Số lô", en: "Shipments" }
  - { vi: "Trọng lượng trung bình mỗi lô (kg)", en: "Average weight per shipment (kg)" }
---
Khách châu Âu hay hỏi mình nhận hàng theo điều kiện nào, mình muốn có số liệu thật trước khi làm tài liệu chào giá cho năm sau.

## Task
Với các lô xuất khẩu đặt chỗ trong năm 2025 đi cảng Rotterdam, không tính lô đã hủy: mỗi điều kiện giao hàng cho mình số lô và trọng lượng trung bình mỗi lô (kg). Điều kiện nhiều lô nhất xếp đầu; bằng số lô thì xếp theo mã điều kiện từ A đến Z.

## Hints
1. Một dòng cho mỗi điều kiện giao hàng, nên phải gom các lô có cùng điều kiện lại rồi mới đếm và tính trung bình.
2. Bảng `shipments`: cảng đến ở `pod` (Rotterdam là `NLRTM`), chiều hàng ở `direction`, điều kiện giao hàng ở `incoterm`, trọng lượng ở `gross_weight_kg`. Năm 2025: `booking_date >= '2025-01-01' AND booking_date < '2026-01-01'`.
3. `SELECT incoterm, COUNT(*), AVG(gross_weight_kg) FROM shipments WHERE ... GROUP BY incoterm ORDER BY COUNT(*) DESC, incoterm`

## Solution
```sql
SELECT incoterm, COUNT(*), AVG(gross_weight_kg)
FROM shipments
WHERE pod = 'NLRTM' AND direction = 'EXPORT' AND status <> 'CANCELLED'
  AND booking_date >= '2025-01-01' AND booking_date < '2026-01-01'
GROUP BY incoterm
ORDER BY COUNT(*) DESC, incoterm
```

# EN
European customers keep asking which terms we ship on, and I want real figures before I write next year's quote pack.

## Task
For export shipments booked in 2025 for the port of Rotterdam, leaving out cancelled ones: for each delivery term, give me the number of shipments and the average weight per shipment (kg). The term with the most shipments first; on a tie, sort by the term's code from A to Z.

## Hints
1. One row per delivery term, so put the shipments with the same term together before counting and averaging.
2. Table `shipments`: the destination port is in `pod` (Rotterdam is `NLRTM`), the direction in `direction`, the delivery term in `incoterm`, the weight in `gross_weight_kg`. Year 2025: `booking_date >= '2025-01-01' AND booking_date < '2026-01-01'`.
3. `SELECT incoterm, COUNT(*), AVG(gross_weight_kg) FROM shipments WHERE ... GROUP BY incoterm ORDER BY COUNT(*) DESC, incoterm`
````

**Tạo `content/lanes/nlrtm/r-2.md`:**
````markdown
---
id: r-2
lane: NLRTM
chapter: 3
title: Ngành hàng đi châu Âu
title_en: Industries shipping to Europe
from: { name: Đặng Hà, dept: Sales }
difficulty: 3
beat: rest
requires: [join, aggregate, group_by, order_by, limit]
grants: []
tables: [shipments, customers]
ordered: true
columns:
  - { vi: "Ngành", en: "Industry" }
  - { vi: "Số lô", en: "Shipments" }
  - { vi: "Tổng trọng lượng (kg)", en: "Total weight (kg)" }
---
Hôm trước bạn thống kê điều kiện giao hàng giúp mình rồi. Giờ mình muốn biết khách ngành nào đang gửi hàng đi châu Âu nhiều nhất, để chuẩn bị tài liệu chào giá.

## Task
Cũng các lô đó (xuất khẩu, đặt chỗ năm 2025, đi Rotterdam, không tính lô hủy), cho mình ba ngành hàng của khách có nhiều lô nhất, kèm tổng trọng lượng (kg). Nhiều lô xếp trước; bằng số lô thì theo tên ngành từ A đến Z.

## Hints
1. Ngành hàng thuộc về khách, không thuộc về lô, nên phải đi từ lô sang khách rồi mới gom theo ngành.
2. `shipments.customer_id` trỏ tới `customers.id`; ngành ở `customers.industry`. Điều kiện lọc giống bài tuyến trước.
3. `SELECT c.industry, COUNT(*), SUM(s.gross_weight_kg) FROM shipments s JOIN customers c ON c.id = s.customer_id WHERE ... GROUP BY c.industry ORDER BY ... LIMIT 3`

## Solution
```sql
SELECT c.industry, COUNT(*), SUM(s.gross_weight_kg)
FROM shipments s
JOIN customers c ON c.id = s.customer_id
WHERE s.pod = 'NLRTM' AND s.direction = 'EXPORT' AND s.status <> 'CANCELLED'
  AND s.booking_date >= '2025-01-01' AND s.booking_date < '2026-01-01'
GROUP BY c.industry
ORDER BY COUNT(*) DESC, c.industry
LIMIT 3
```

# EN
You counted the delivery terms for me the other day. Now I want to know which customer industries ship the most to Europe, so I can prepare the quote pack.

## Task
Same shipments (exports booked in 2025 for Rotterdam, cancelled ones left out): give me the three customer industries with the most shipments, with their total weight (kg). Most shipments first; on a tie, industry name from A to Z.

## Hints
1. The industry belongs to the customer, not to the shipment, so go from the shipment to its customer before grouping by industry.
2. `shipments.customer_id` points to `customers.id`; the industry is in `customers.industry`. The filters are the same as in the previous lane task.
3. `SELECT c.industry, COUNT(*), SUM(s.gross_weight_kg) FROM shipments s JOIN customers c ON c.id = s.customer_id WHERE ... GROUP BY c.industry ORDER BY ... LIMIT 3`
````

**Tạo `content/lanes/nlrtm/r-3.md`:**
````markdown
---
id: r-3
lane: NLRTM
chapter: 7
title: Đợt tăng giá tháng 7
title_en: The July rate increase
from: { name: Lê Bình, dept: Sales }
difficulty: 3
beat: rest
requires: [conditional_agg, group_by, order_by]
grants: []
tables: [rate_contracts]
ordered: true
columns:
  - { vi: "Loại container", en: "Container type" }
  - { vi: "Giá mua ngày 01/07/2026 (USD)", en: "Buy rate on 1 Jul 2026 (USD)" }
  - { vi: "Giá mua ngày 01/08/2026 (USD)", en: "Buy rate on 1 Aug 2026 (USD)" }
  - { vi: "Chênh lệch (USD)", en: "Difference (USD)" }
---
Hãng tàu báo tăng giá chung giữa tháng 7 cho tuyến châu Âu. Trước khi báo lại giá cho khách, mình cần biết giá mua của mình đã tăng bao nhiêu.

## Task
Với tuyến Tiên Sa → Rotterdam, mỗi loại container cho mình: giá mua có hiệu lực ngày 01/07/2026, giá mua có hiệu lực ngày 01/08/2026 và chênh lệch giữa hai giá (giá tháng 8 trừ giá tháng 7), tính bằng USD, không làm tròn. Xếp theo mã loại container từ A đến Z.

## Hints
1. Mỗi loại container một dòng, nhưng trong dòng đó có hai giá ở hai ngày khác nhau: gom theo loại container rồi lấy giá của từng ngày bằng một điều kiện riêng.
2. Bảng `rate_contracts`: cảng đi `pol` (Tiên Sa là `VNDAD`), cảng đến `pod`, giá mua `buy_usd`. Một giá có hiệu lực vào ngày d khi `valid_from <= d AND valid_to >= d`; mỗi tuyến, mỗi loại container, mỗi ngày có đúng một giá.
3. `MAX(buy_usd) FILTER (WHERE valid_from <= '2026-07-01' AND valid_to >= '2026-07-01')` cho giá ngày 01/07; làm tương tự cho 01/08, rồi lấy hiệu hai biểu thức.

## Solution
```sql
SELECT container_type,
  MAX(buy_usd) FILTER (WHERE valid_from <= '2026-07-01' AND valid_to >= '2026-07-01'),
  MAX(buy_usd) FILTER (WHERE valid_from <= '2026-08-01' AND valid_to >= '2026-08-01'),
  MAX(buy_usd) FILTER (WHERE valid_from <= '2026-08-01' AND valid_to >= '2026-08-01')
    - MAX(buy_usd) FILTER (WHERE valid_from <= '2026-07-01' AND valid_to >= '2026-07-01')
FROM rate_contracts
WHERE pol = 'VNDAD' AND pod = 'NLRTM'
GROUP BY container_type
ORDER BY container_type
```

# EN
The carriers announced a general rate increase on the Europe lanes in mid-July. Before I quote customers again, I need to know how much our buy rates went up.

## Task
For the Tien Sa to Rotterdam lane, give me for each container type: the buy rate valid on 1 July 2026, the buy rate valid on 1 August 2026 and the difference between them (August minus July), in USD, not rounded. Sort by container type code from A to Z.

## Hints
1. One row per container type, but that row holds two rates on two different days: group by container type, then take each day's rate with its own condition.
2. Table `rate_contracts`: the port of loading is `pol` (Tien Sa is `VNDAD`), the destination `pod`, the buy rate `buy_usd`. A rate is valid on day d when `valid_from <= d AND valid_to >= d`; each lane, container type and day has exactly one rate.
3. `MAX(buy_usd) FILTER (WHERE valid_from <= '2026-07-01' AND valid_to >= '2026-07-01')` gives the rate on 1 July; do the same for 1 August, then subtract the two expressions.
````

**Tạo `content/lanes/sgsin/sg-1.md`:**
````markdown
---
id: sg-1
lane: SGSIN
chapter: 1
title: Mười lô nặng nhất đi Singapore
title_en: The ten heaviest shipments to Singapore
from: { name: Bùi Long, dept: Ops }
difficulty: 1
beat: rest
requires: [where, order_by, limit]
grants: []
tables: [shipments]
ordered: true
columns:
  - { vi: "Mã lô", en: "Shipment reference" }
  - { vi: "Ngày đặt chỗ", en: "Booking date" }
  - { vi: "Trọng lượng (kg)", en: "Weight (kg)" }
---
Năm sau mình định thuê xe đầu kéo khỏe hơn cho hàng nặng đi Singapore. Mình cần xem những lô nặng nhất năm vừa rồi để ước tải.

## Task
Trong các lô xuất khẩu đặt chỗ năm 2025 đi cảng Singapore, không tính lô đã hủy, cho mình 10 lô nặng nhất: mã lô, ngày đặt chỗ, trọng lượng (kg). Nặng nhất xếp đầu; bằng trọng lượng thì theo mã lô từ A đến Z.

## Hints
1. Lọc đúng các lô cần xem trước, rồi xếp từ nặng tới nhẹ và chỉ giữ 10 dòng đầu.
2. Bảng `shipments`: cảng đến ở `pod` (Singapore là `SGSIN`), mã lô ở `ref`, ngày đặt chỗ ở `booking_date`, trọng lượng ở `gross_weight_kg`. Lô hủy có `status = 'CANCELLED'`.
3. `SELECT ref, booking_date, gross_weight_kg FROM shipments WHERE ... ORDER BY gross_weight_kg DESC, ref LIMIT 10`

## Solution
```sql
SELECT ref, booking_date, gross_weight_kg
FROM shipments
WHERE pod = 'SGSIN' AND direction = 'EXPORT' AND status <> 'CANCELLED'
  AND booking_date >= '2025-01-01' AND booking_date < '2026-01-01'
ORDER BY gross_weight_kg DESC, ref
LIMIT 10
```

# EN
Next year I want stronger tractor units for heavy cargo to Singapore. I need to see last year's heaviest shipments to size the loads.

## Task
Among export shipments booked in 2025 for the port of Singapore, leaving out cancelled ones, give me the 10 heaviest: shipment reference, booking date, weight (kg). Heaviest first; on equal weight, by reference from A to Z.

## Hints
1. Filter the shipments you need first, then sort from heaviest to lightest and keep only the first 10 rows.
2. Table `shipments`: the destination port is in `pod` (Singapore is `SGSIN`), the reference in `ref`, the booking date in `booking_date`, the weight in `gross_weight_kg`. A cancelled shipment has `status = 'CANCELLED'`.
3. `SELECT ref, booking_date, gross_weight_kg FROM shipments WHERE ... ORDER BY gross_weight_kg DESC, ref LIMIT 10`
````

**Tạo `content/lanes/sgsin/sg-2.md`:**
````markdown
---
id: sg-2
lane: SGSIN
chapter: 3
title: Tuyến nào đổi tàu ở Singapore
title_en: Which lanes change ship in Singapore
from: { name: Hoàng Khánh, dept: Ops }
difficulty: 2
beat: rest
requires: [join, where, order_by]
grants: []
tables: [lane_profiles, ports]
ordered: true
columns:
  - { vi: "Cảng đến", en: "Destination port" }
  - { vi: "Quãng đường (hải lý)", en: "Distance (nautical miles)" }
  - { vi: "Số ngày đi biển", en: "Days at sea" }
---
Khách mới hỏi vì sao hàng đi châu Âu phải đổi tàu ở Singapore. Mình muốn có danh sách tuyến đi qua đó để giải thích cho gọn.

## Task
Từ cảng Tiên Sa, những tuyến nào phải đổi tàu ở Singapore? Mỗi tuyến cho mình tên cảng đến, quãng đường (hải lý) và số ngày đi biển. Tuyến nhiều ngày đi biển nhất xếp đầu; bằng nhau thì theo tên cảng từ A đến Z.

## Hints
1. Hồ sơ tuyến chỉ ghi mã cảng; tên cảng nằm ở danh mục cảng, nên cần nối hai bảng qua mã cảng đến.
2. Bảng `lane_profiles` (mở cùng tuyến Singapore): cảng đi `pol` (Tiên Sa là `VNDAD`), cảng đến `pod`, cảng đổi tàu `via_port` (Singapore là `SGSIN`), quãng đường `distance_nm`, số ngày `sea_days`. Tên cảng ở `ports.name`, khóa là `ports.code`.
3. `SELECT p.name, l.distance_nm, l.sea_days FROM lane_profiles l JOIN ports p ON p.code = l.pod WHERE ... ORDER BY l.sea_days DESC, p.name`

## Solution
```sql
SELECT p.name, l.distance_nm, l.sea_days
FROM lane_profiles l
JOIN ports p ON p.code = l.pod
WHERE l.pol = 'VNDAD' AND l.via_port = 'SGSIN'
ORDER BY l.sea_days DESC, p.name
```

# EN
A new customer asked why cargo to Europe has to change ship in Singapore. I want the list of lanes that go through it, to explain it in one go.

## Task
From the port of Tien Sa, which lanes change ship in Singapore? For each lane give me the destination port's name, the distance (nautical miles) and the days at sea. The lane with the most days at sea first; on a tie, port name from A to Z.

## Hints
1. The lane profile only has port codes; the port names are in the port list, so join the two tables on the destination code.
2. Table `lane_profiles` (it opens with the Singapore lane): port of loading `pol` (Tien Sa is `VNDAD`), destination `pod`, transshipment port `via_port` (Singapore is `SGSIN`), distance `distance_nm`, days `sea_days`. The port name is `ports.name`, its key `ports.code`.
3. `SELECT p.name, l.distance_nm, l.sea_days FROM lane_profiles l JOIN ports p ON p.code = l.pod WHERE ... ORDER BY l.sea_days DESC, p.name`
````

**Tạo `content/lanes/sgsin/sg-3.md`:**
````markdown
---
id: sg-3
lane: SGSIN
chapter: 4
title: Đi Singapore thực tế mất mấy ngày
title_en: How long Singapore really takes
from: { name: Võ Thu, dept: CS }
difficulty: 2
beat: rest
requires: [date_math, aggregate, group_by, order_by]
grants: []
tables: [shipments]
ordered: true
columns:
  - { vi: "Cảng xếp hàng", en: "Port of loading" }
  - { vi: "Số lô", en: "Shipments" }
  - { vi: "Số ngày đi biển trung bình", en: "Average days at sea" }
---
Bảng giá ghi tuyến Singapore khoảng 3 ngày, nhưng khách cứ phàn nàn là lâu hơn. Mình muốn biết thực tế từng cảng xếp hàng mất bao nhiêu ngày.

## Task
Với các lô đến cảng Singapore có ngày cập cảng thực tế từ 01/01/2026 đến hết 31/10/2026, mỗi cảng xếp hàng cho mình: số lô và số ngày đi biển trung bình (từ ngày tàu chạy thực tế tới ngày cập cảng thực tế, không làm tròn). Xếp theo mã cảng xếp hàng từ A đến Z.

## Hints
1. Số ngày đi biển của một lô là hiệu hai ngày thực tế của lô đó; tính cho từng lô rồi lấy trung bình theo cảng xếp hàng.
2. Bảng `shipments`: cảng xếp hàng `pol`, cảng đến `pod` (Singapore là `SGSIN`), ngày tàu chạy thực tế `atd`, ngày cập cảng thực tế `ata`. Trừ hai cột ngày cho ra số ngày: `ata - atd`.
3. `SELECT pol, COUNT(*), AVG(ata - atd) FROM shipments WHERE pod = 'SGSIN' AND ... GROUP BY pol ORDER BY pol`

## Solution
```sql
SELECT pol, COUNT(*), AVG(ata - atd)
FROM shipments
WHERE pod = 'SGSIN' AND ata >= '2026-01-01' AND ata < '2026-11-01'
GROUP BY pol
ORDER BY pol
```

# EN
The rate sheet says Singapore takes about 3 days, but customers keep complaining it is longer. I want to know how many days it really takes from each port of loading.

## Task
For shipments to the port of Singapore whose actual arrival is between 1 January 2026 and 31 October 2026, give me for each port of loading: the number of shipments and the average days at sea (from the actual departure to the actual arrival, not rounded). Sort by the port of loading's code from A to Z.

## Hints
1. A shipment's days at sea are the difference between its two actual dates; work it out per shipment, then average it per port of loading.
2. Table `shipments`: port of loading `pol`, destination `pod` (Singapore is `SGSIN`), actual departure `atd`, actual arrival `ata`. Subtracting two date columns gives days: `ata - atd`.
3. `SELECT pol, COUNT(*), AVG(ata - atd) FROM shipments WHERE pod = 'SGSIN' AND ... GROUP BY pol ORDER BY pol`
````

- [ ] **Step 4: Chạy test, ngân sách, commit**

Run: `npm test && npx tsc --noEmit && npm run build && node scripts/check-budget.mjs`
Expected: mọi test PASS; `lanes ≈ 10 / 20`, `main ≈ 265 / 270`.

```bash
git add content/lanes tests/lanes.test.ts
git commit -m "lanes batch 1: Rotterdam, Singapore, Sydney briefs and nine lane tasks, VI + EN (Plan 5 T2, T10)

Claude-Session: https://claude.ai/code/session_01PwPSBV1SVDP6quEZfKN56M"
```

---

### Task 8: CLAUDE.md, kiểm toàn bộ, checklist Edge cho orchestrator

**Files:**
- Modify: `CLAUDE.md`, `scripts/check-deploy.sh`

- [ ] **Step 1: Ghi luật mới vào CLAUDE.md; kiểm deploy gồm hai chunk lazy mới**

**Sửa `CLAUDE.md`** — thay:
```markdown
- `content/skills.yml` (skill cards: label/syntax/when/trap) and `content/chapters.yml` (per chapter: `title`, `career` = the step reached by passing its promotion review, `tier` = ★ chapters 1/3/6/9/12 that change the job title, `story` shown on its first ticket, `outcomes`) are loaded by `src/progress.ts`, which also derives the title and career step from completed boss tickets (`rankOf()`), and holds linear progression, XP, which tables each chapter reveals (`CHAPTER_TABLES`) and `contentProblems` (soft-lock, pacing, skill-map, twist→boss and, from chapter 4, interleaved-review checks on rest tickets). `warmupQueue` (`src/practice.ts`, Home card "Chapter warm-up" in `ui/modes.ts`) offers up to 3 practice items on earlier chapters' skills while the current chapter (≥ 2) has no completed ticket; nothing extra is saved.
- `src/save.ts` is the versioned progress save under localStorage key `cargo-query-save`. `graded` (same keys as `drafts`) holds the SQL that passed the grader, shown in the Recap; it is optional on disk (missing → `{}`, Recap falls back to the draft), so it needed no version bump. Bump `SAVE_VERSION` with a migration in `MIGRATIONS`; keep old fixtures in `tests/fixtures/` forever. Before migrating, the old save is copied to `cargo-query-save.v<old>`; an unreadable or newer save goes to `cargo-query-save.bak`. A failed write shows the `save.writeFailed` banner.
- Product layer (Plan 1c):
```
bằng:
```markdown
- `content/skills.yml` (skill cards: label/syntax/when/trap) and `content/chapters.yml` (per chapter: `title`, `career` = the step reached by passing its promotion review, `tier` = ★ chapters 1/3/6/9/12 that change the job title, `story` shown on its first ticket, `outcomes`) are loaded by `src/progress.ts`, which also derives the title and career step from completed boss tickets (`rankOf()`), and holds linear progression, XP, which tables each chapter reveals (`CHAPTER_TABLES`) and `contentProblems` (soft-lock, pacing, skill-map, twist→boss and, from chapter 4, interleaved-review checks on rest tickets). `warmupQueue` (`src/practice.ts`, Home card "Chapter warm-up" in `ui/modes.ts`) offers up to 3 practice items on earlier chapters' skills while the current chapter (≥ 2) has no completed ticket; nothing extra is saved.
- `src/save.ts` is the versioned progress save under localStorage key `cargo-query-save`. `graded` (same keys as `drafts`) holds the SQL that passed the grader, shown in the Recap; it is optional on disk (missing → `{}`, Recap falls back to the draft), so it needed no version bump. Bump `SAVE_VERSION` with a migration in `MIGRATIONS`; keep old fixtures in `tests/fixtures/` forever. Before migrating, the old save is copied to `cargo-query-save.v<old>`; an unreadable or newer save goes to `cargo-query-save.bak`. A failed write shows the `save.writeFailed` banner. Save v3 (Plan 5, L48 D-A2) adds `dashboard` (`{ cards, hidden }`, `src/dashboard.ts` `readDashboard`: a broken card is dropped, max 24 cards, SQL ≤ 4,000 chars, array position = order) and `lanes` (lane side tasks solved; never in `completed`). Fixtures `save-v1/v2/v3.json` stay forever.
- Dashboard (`#/dashboard`, Plan 5, L48/L49, `src/ui/dashboard.ts`): the player's cards first, then the company tiles from `content/kpis.yml` (moved off Home, which keeps a one-line teaser; tiles can only be hidden, `dashboard.hidden`). Cards are `table | number | bar | line`, each kind opens with a skill (`KIND_SKILL`: select, aggregate, group_by, date_bucket). Pin ("Ghim lên", `src/ui/pin.ts`) sits above the Result tab and describes `app.lastRun`: offered in the Sandbox and on a solved story or lane task, off with "Chạy lại trước khi ghim" when the editor SQL differs, refused over 2 s (`QueryResult.ms`, measured in `runSandboxed`) and the dialog re-checks before saving. `cardRunner` runs each card once per session, one after another; a timeout marks only that card `slow` (saved, never run by itself again), a restart just retries. Lên/Xuống move cards (focus stays on the moved card, the move is announced).
- Lanes (Plan 5, product-design-v3 Part B): `content/lanes/lanes.yml` (briefs; items with `after: N` appear only once chapter N's review is passed) and `content/lanes/<port>/*.md` (side tasks: ticket files with `lane: <PORT>`; `chapter` = the chapter whose review opens the task, it also needs its lane open). Loaded by `loadContent()` as their own lazy chunk (`src/laneSources.ts`, budget `lanes`) into `loadLanes()`, never `loadTickets()`, so chapters, rank, the next ticket, the harbour, KPIs and the practice deck never see them. `src/lanes.ts`: `laneTaskState`, `LANE_TABLES` (lane tables show in the schema tabs, the Data page and autocomplete once the lane is open; story tickets never use them), `laneProblems`. A side task plays in session mode `lane` (task bar in lane mode, flat `LANE_XP` 50, hints free, drafts/graded/history kept like the story via `keepsWork()`); the map dialog lists lanes and opens a brief beside the map. The hub is Tien Sa (`VNDAD`), never another port name (L49); `tests/lanes.test.ts` holds the content rules.
- Product layer (Plan 1c):
```

**Sửa `CLAUDE.md`** — thay:
```markdown
- The ER tab renders a Mermaid `erDiagram` built from `information_schema` for a given schema (`loadErMetadata(run, schema)` in `src/viz/erd.ts`, cached as `erMeta(schema)` in `src/state.ts` and shared by the ER and Columns tabs, the brief and the Data page; `'public'` for the game, `'sandbox'` for imported data). `erMeta('public')` includes locked tables: every consumer filters by `unlockedTables()`. With a task open, the ER and Columns tabs default to `relatedTables()` (ui-ux-v4 §4: the task's tables, bridges, FK parents child → parent, capped at 10, listed alphabetically so nothing marks the answer's tables), with a switch to all unlocked tables (`app.schemaScope`, not saved); the brief shows the same list as chips that open the ER tab (`actions.showTab`). The Data page (ui-ux-v4 §5) lists unlocked tables by chapter with exact row counts (`erRowCountsSql`), columns with PK/UK/FK (`keyBadges`, `ui/erdView.ts`), referenced-by, 5 sample rows on demand and an ER diagram around the table (`erDefinition(..., detail)`: only that table gets columns) or of all tables; its nav item is order 50, 60 is kept for the dashboard; it is the only place that uses `innerHTML` (Mermaid strict mode; every name goes through `mermaidName()`, which replaces anything outside letters/digits/`_` so a CSV header cannot inject Mermaid syntax). Tables the last run used get a bold border in the open ticket's chapter colour (`ChapterColor.hex`, L36); the diagram is redrawn when `prefers-color-scheme` changes. Mermaid and the SQL parser are lazy-loaded.
- The task bar (`#map`, `src/ui/mapStrip.ts`, ui-ux-v4 §2–3, replaces L35/L37) shows only in story mode on `#/play` (its buttons call `selectTicket()`, which forces story mode): chapter `<select>`, ‹ › and one button per task of the open ticket's chapter (the open one has a thick bottom border; `navTargets()`, `src/viz/progressDots.ts`: done tickets + the first not done, in story order; later tasks are disabled and never show their title), and a continue button (main button right after a correct answer, "back to current task" while reviewing an old one). "See the map" opens `<dialog id="map-dialog">` with `routeMap()` and the `routeItems()` list, so the player never leaves the task. Redrawn whole by `syncMap()` from `rerender()` (focus kept by `data-nav`); the dialog is refilled when open.
- i18n: `src/i18n/vi.ts` is the key source; `src/i18n/en.ts` is `Record<Key, Msg>`, so a missing key fails `tsc`. All UI text goes through `t(key)`; static markup uses `data-i18n`/`data-i18n-aria`. EN plurals use function messages. Never translate table/column names, SQL, data values, Postgres error messages, or people's names and departments. `tests/i18n.test.ts` checks placeholders match and EN differs from VI (allow-list `SAME_OK`).
- Teaching errors: `src/ui/sqlErrors.ts` maps SQLSTATE (plus a few message regexes) to an explanation shown under Postgres' unchanged message; `tests/sqlErrors.test.ts` runs the wrong SQL on real PGlite.
```
bằng:
```markdown
- The ER tab renders a Mermaid `erDiagram` built from `information_schema` for a given schema (`loadErMetadata(run, schema)` in `src/viz/erd.ts`, cached as `erMeta(schema)` in `src/state.ts` and shared by the ER and Columns tabs, the brief and the Data page; `'public'` for the game, `'sandbox'` for imported data). `erMeta('public')` includes locked tables: every consumer filters by `unlockedTables()`. With a task open, the ER and Columns tabs default to `relatedTables()` (ui-ux-v4 §4: the task's tables, bridges, FK parents child → parent, capped at 10, listed alphabetically so nothing marks the answer's tables), with a switch to all unlocked tables (`app.schemaScope`, not saved); the brief shows the same list as chips that open the ER tab (`actions.showTab`). The Data page (ui-ux-v4 §5) lists unlocked tables by chapter with exact row counts (`erRowCountsSql`), columns with PK/UK/FK (`keyBadges`, `ui/erdView.ts`), referenced-by, 5 sample rows on demand and an ER diagram around the table (`erDefinition(..., detail)`: only that table gets columns) or of all tables; its nav item is order 50, 60 is kept for the dashboard; it is the only place that uses `innerHTML` (Mermaid strict mode; every name goes through `mermaidName()`, which replaces anything outside letters/digits/`_` so a CSV header cannot inject Mermaid syntax). Tables the last run used get a bold border in the open ticket's chapter colour (`ChapterColor.hex`, L36); the diagram is redrawn when `prefers-color-scheme` changes. Mermaid and the SQL parser are lazy-loaded.
- The task bar (`#map`, `src/ui/mapStrip.ts`, ui-ux-v4 §2–3, replaces L35/L37) shows in story mode and lane mode on `#/play` (story buttons call `selectTicket()`, which forces story mode; in lane mode it shows "Về việc đang làm", the lane badge and that lane's side tasks instead): chapter `<select>`, ‹ › and one button per task of the open ticket's chapter (the open one has a thick bottom border; `navTargets()`, `src/viz/progressDots.ts`: done tickets + the first not done, in story order; later tasks are disabled and never show their title), and a continue button (main button right after a correct answer, "back to current task" while reviewing an old one). "See the map" opens `<dialog id="map-dialog">` with `routeMap()` (pins are buttons), the lane list and the picked lane's brief (`src/ui/lanePanel.ts`), so the player never leaves the task. Redrawn whole by `syncMap()` from `rerender()` (focus kept by `data-nav`); the dialog is refilled when open.
- i18n: `src/i18n/vi.ts` is the key source; `src/i18n/en.ts` is `Record<Key, Msg>`, so a missing key fails `tsc`. All UI text goes through `t(key)`; static markup uses `data-i18n`/`data-i18n-aria`. EN plurals use function messages. Never translate table/column names, SQL, data values, Postgres error messages, or people's names and departments. `tests/i18n.test.ts` checks placeholders match and EN differs from VI (allow-list `SAME_OK`). `en.ts` is a lazy chunk (Plan 5, main budget): `main.ts` awaits `loadLang()` with `loadContent()`, `setLang()` is async, `t()` falls back to VI until EN is in, and `tests/setup.ts` loads it.
- Teaching errors: `src/ui/sqlErrors.ts` maps SQLSTATE (plus a few message regexes) to an explanation shown under Postgres' unchanged message; `tests/sqlErrors.test.ts` runs the wrong SQL on real PGlite.
```

**Sửa `CLAUDE.md`** — thay:
```markdown
- New senders go into `content/people.yml` first (real role, `tables:`; `employee` = id in the seed's `employees`, or null).
- Story hooks the later chapters rely on are listed at the top of `seed.sql` (chapters 4–6: at the head of the Plan 2 block); do not change them without updating tickets and `tests/seed.test.ts`. That test pins the md5 of the six chapter 1–3 tables, so a new block that re-rolls them fails. Plan 2 tables: `shipment_events` (log starts 2026-07-01), `trucking_orders`, `cfs_receipts`, `hs_codes`, `duties_taxes`, `customs_declarations` (from 2026-06-01, `amended_from_id` chains up to 2 steps, exports only), `incoterms`. Plan 3 tables (hooks at the head of the Plan 3 block, which starts with `ANALYZE` so the seed planner has statistics): `exchange_rates` (working days 2026-03-02..10-30), `rate_contracts` (exactly one buy rate per lane/container type/day from 2026-04-01; Europe +40% from 2026-07-15), `quotations` (from 2026-04-01; `shipment_id` NULL = never booked), `invoices`/`payments` (bookings from 2026-04-01), `vendor_bills`, `master_bills`/`house_bills` (sea exports sailing from 2026-05-01). The test pins the md5 of all 13 chapter 1–6 tables and the Q3 Europe margin drop that chapter 12 relies on. There is no `charges` table (Plan 3 R2). Plan 4 tables (hooks at the head of the Plan 4 block): `free_time_terms` (two periods per customer, rate +20% from 2026-07-01), `container_events` (~109k rows for containers sailing from 2025-05-01; bulk-loaded, then its primary and foreign keys are added; deliberately no index on `container_id`, that is the index lab; kept under 150k rows because its ANALYZE reads every row so plan costs are identical on every boot), `claims`; then the prebuilt indexes `shipments(booking_date)` and `shipments(customer_id)` and `ANALYZE`. Seed stop rule after Plan 4: 2.0 s in Node (Plan 4 S2).
- Project skills live in `.claude/skills/` (`web-games`, `level-design`, `save-systems`).
```
bằng:
```markdown
- New senders go into `content/people.yml` first (real role, `tables:`; `employee` = id in the seed's `employees`, or null).
- Story hooks the later chapters rely on are listed at the top of `seed.sql` (chapters 4–6: at the head of the Plan 2 block); do not change them without updating tickets and `tests/seed.test.ts`. That test pins the md5 of the six chapter 1–3 tables, so a new block that re-rolls them fails. Plan 2 tables: `shipment_events` (log starts 2026-07-01), `trucking_orders`, `cfs_receipts`, `hs_codes`, `duties_taxes`, `customs_declarations` (from 2026-06-01, `amended_from_id` chains up to 2 steps, exports only), `incoterms`. Plan 3 tables (hooks at the head of the Plan 3 block, which starts with `ANALYZE` so the seed planner has statistics): `exchange_rates` (working days 2026-03-02..10-30), `rate_contracts` (exactly one buy rate per lane/container type/day from 2026-04-01; Europe +40% from 2026-07-15), `quotations` (from 2026-04-01; `shipment_id` NULL = never booked), `invoices`/`payments` (bookings from 2026-04-01), `vendor_bills`, `master_bills`/`house_bills` (sea exports sailing from 2026-05-01). The test pins the md5 of all 13 chapter 1–6 tables and the Q3 Europe margin drop that chapter 12 relies on. There is no `charges` table (Plan 3 R2). Plan 4 tables (hooks at the head of the Plan 4 block): `free_time_terms` (two periods per customer, rate +20% from 2026-07-01), `container_events` (~109k rows for containers sailing from 2025-05-01; bulk-loaded, then its primary and foreign keys are added; deliberately no index on `container_id`, that is the index lab; kept under 150k rows because its ANALYZE reads every row so plan costs are identical on every boot), `claims`; then the prebuilt indexes `shipments(booking_date)` and `shipments(customer_id)` and `ANALYZE`. Seed stop rule after Plan 4: 2.0 s in Node (Plan 4 S2). Plan 5 tables (hand-written, no random, block at the end): `lane_profiles` (39 lanes from VNDAD/VNSGN/VNHPH, `via_port` = transshipment port) and `bunker_prices` (monthly 2025-01..2026-10); ~4 ms.
- Project skills live in `.claude/skills/` (`web-games`, `level-design`, `save-systems`).
```

**Sửa `scripts/check-deploy.sh`** — thay:
```
[ -n "$TICKETS" ] || { echo "FAIL $MAIN does not reference ticketSources-*.js"; exit 1; }
for f in $MAIN "assets/$WORKER" "assets/$TICKETS" $(printf 'assets/%s ' $FILES $LIBWASM); do
  H=$(curl -sS -o /dev/null -D - -H 'Accept-Encoding: br, gzip' "$URL/$f" | tr -d '\r')
```
bằng:
```
[ -n "$TICKETS" ] || { echo "FAIL $MAIN does not reference ticketSources-*.js"; exit 1; }
# Plan 5: lane content and the EN dictionary are lazy chunks awaited before the first render too.
LANES=$(get "$MAIN" | grep -oE 'laneSources-[A-Za-z0-9_-]+\.js' | head -1)
EN=$(get "$MAIN" | grep -oE '\./en-[A-Za-z0-9_-]+\.js' | head -1 | cut -c3-)
[ -n "$LANES" ] && [ -n "$EN" ] || { echo "FAIL $MAIN does not reference laneSources-*.js and en-*.js"; exit 1; }
for f in $MAIN "assets/$WORKER" "assets/$TICKETS" "assets/$LANES" "assets/$EN" $(printf 'assets/%s ' $FILES $LIBWASM); do
  H=$(curl -sS -o /dev/null -D - -H 'Accept-Encoding: br, gzip' "$URL/$f" | tr -d '\r')
```

- [ ] **Step 2: Kiểm toàn bộ**

Run: `npm test && npx tsc --noEmit && npm run build && node scripts/check-budget.mjs`
Expected:
- Tất cả PASS: 1468 test trên bản replay `61de3a9`.
- Mọi nhóm ngân sách `ok`: `main ≈ 265 / 270`, `tickets 99 / 110`, `lanes ≈ 10 / 20`, `en ≈ 12 / 20`, `worker ≈ 144 / 160`.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md scripts/check-deploy.sh
git commit -m "docs: CLAUDE.md notes for Plan 5 (save v3, dashboard, pin rules, lanes, lazy EN); deploy check covers the lane and EN chunks

Claude-Session: https://claude.ai/code/session_01PwPSBV1SVDP6quEZfKN56M"
```

- [ ] **Step 4: Checklist Edge (orchestrator; origin riêng, không đụng save ở :5173)**

**Chuẩn bị:**
- Chạy `npx vite --port 5174 --strictPort`. Mục 1 dùng thêm `npm run build && npx vite preview --port 5175 --strictPort`.
- Mở trên **Edge**. **Không** mở `:5173`.
- Tạo hai file ngoài repo rồi nạp bằng **Nhập tiến độ** (menu `⋯`):
  - `save-v2-ch5-done.json`: `{"version":2,"completed":[…],"xp":5000,"hintsUsed":{},"drafts":{},"graded":{},"review":{},"practice":{"solved":0,"weak":0},"sandboxDraft":"","bossStep":{}}`, trong đó `completed` là mọi id `ch1-01` … `ch5-06` (`ls content/tickets/ch{1..5}`). Đây là save cũ, để thử migrate lên v3.
  - `save-v3-ch3-done.json`: `"version":3`, `completed` là mọi id `ch1-01` … `ch3-05`, thêm `"dashboard":{"cards":[],"hidden":[]},"lanes":[]` (các trường khác như trên). Dùng cho: Đường khóa, Sydney khóa, không có `bunker_prices`.
  - `save-v3-ch7-done.json`: như file ch3 nhưng `completed` tới `ch7-06`. Dùng cho: R-3 mở, "+40%" hiện.

**Kiểm** (mỗi dòng ✓/✗, ghi số đo):

1. **Boot (bản build, :5175).**
   - Đo từ lúc tải lại tới nút Chạy sẵn sàng, VI và EN, so với HEAD trước Plan 5.
   - EN: dòng tải nội dung hiện VI một lúc rồi giao diện sang EN (T3).
   - Không lỗi trong console.
2. **Nav 6 mục.**
   - Desktop 1 hàng, 375 px lưới 3×2.
   - "Bảng điều hành" có `aria-current` trên `#/dashboard`.
   - Trang chủ không còn lưới KPI, chỉ còn một dòng "Bảng điều hành · x/16 ô đã mở · 0 card của bạn" dẫn tới trang.
3. **Nạp `save-v2-ch5-done.json`.**
   - Không cảnh báo.
   - `localStorage['cargo-query-save.v2']` có bản gốc; save hiện tại `version: 3`.
4. **Ghim từ Sandbox.**
   - `SELECT incoterm, count(*) FROM shipments GROUP BY 1 ORDER BY 2 DESC`, bấm Chạy.
   - Tab Kết quả có "chạy n ms" và "Ghim lên".
   - Hộp thoại: với `save-v3-ch3-done.json`, Đường khóa ("mở khi học … (ch. 4)"); với save ch5, Đường "không hợp với kết quả này". Cột chọn sẵn, xem trước 6 thanh, nút Ghim tắt khi tiêu đề trống (bấm thì báo "Đặt tiêu đề cho card.").
   - Ghim → dòng báo "Đã ghim …".
5. **Chạy lại trước khi ghim.** Sửa SQL trong editor (không chạy), mở lại tab Kết quả: dải "SQL đã đổi", nút Ghim tắt kèm "Chạy lại trước khi ghim".
6. **Luật 2 s.**
   - Chạy `SELECT count(*) FROM shipments a JOIN shipments b ON a.customer_id = b.customer_id JOIN carriers c ON c.id <> a.carrier_id` (Node 2,9 s). Nếu trên Edge vượt 5 s (DB khởi động lại), thay `JOIN carriers c ON c.id <> a.carrier_id` bằng `CROSS JOIN generate_series(1, 4)`.
   - Hộp thoại: "Query chạy x s, quá 2 s nên không ghim được." và nút Ghim tắt.
7. **Trang Bảng điều hành.**
   - Card của bạn đứng trước Số liệu công ty.
   - Card chạy lần lượt ("Đang chờ chạy…" rồi ra số).
   - Lên/Xuống bằng bàn phím: focus ở lại card, trình đọc màn hình đọc "Đã dời …".
   - Xem SQL, Chạy lại, Bỏ ghim (focus về tiêu đề "Card của bạn").
   - Ẩn một ô công ty: "Ô đã ẩn (1)" → Hiện lại.
   - Đổi ngôn ngữ: card không chạy lại.
8. **Card chậm.**
   - Ghim một câu ~1,9 s rồi sửa thành câu > 5 s ngay trong Save (DevTools: đổi `sql` của card) và tải lại.
   - Mở trang: DB khởi động lại một lần, card thành "Chậm · không tự chạy nữa". Tải lại trang: card không tự chạy.
   - "Chạy thử lại" chạy đúng một lần.
9. **Xuất → Nhập tiến độ** giữ card, ô đã ẩn và bài tuyến đã xong. Nhập một save khác có card `c1` với SQL khác: card hiện đúng kết quả SQL mới (T6).
10. **Bản đồ (thanh việc → Xem bản đồ).**
    - Danh sách: Rotterdam "~30 ngày · 0/3 bài tuyến"; Shanghai "~5 ngày · đợt sau"; với `save-v3-ch3-done.json`, Sydney "mở sau đánh giá ch. 5" và hồ sơ chỉ xem trước 2 dòng.
    - Rê chuột hoặc Tab tới chấm cảng: tooltip một dòng, Enter mở hồ sơ.
    - Rotterdam ở save ch5: **không** thấy "+40%" hay dòng "Tăng giá"; R-3 hiện tiêu đề + "Mở sau chương 7". Với `save-v3-ch7-done.json`: thấy cả hai, R-3 mở.
    - 375 px: hồ sơ thay danh sách, có "‹ Tất cả tuyến".
11. **Bài tuyến R-2.**
    - "Làm bài tuyến" → thanh việc đổi chế độ: "Về việc đang làm", huy hiệu "Bài tuyến · Rotterdam", nút R-1/R-2/R-3.
    - Brief có "Không tính vào tiến độ chương…" và "Xem hồ sơ tuyến Rotterdam".
    - Gợi ý không ghi trừ XP.
    - Nộp đúng: +50 XP, Recap "Về việc đang làm →", không hoạt cảnh; số việc chương trên Trang chủ không đổi; "Ghim lên" có mặt.
    - "Về việc đang làm" về đúng việc tiếp theo của cốt truyện.
12. **Bảng tuyến.**
    - Sau khi Singapore mở: tab Cột, ER và trang Dữ liệu có `lane_profiles` ("mở theo bài tuyến"); autocomplete gợi ý bảng.
    - Với `save-v3-ch3-done.json` (Sydney chưa mở): không có `bunker_prices`.
13. **Dark mode + 375 px:** card cột/đường, hộp thoại ghim, hồ sơ tuyến, không tràn ngang trang.

Ghi kết quả vào `docs/team/decision-log.md` (dòng L-số mới) cùng T1–T13. **Cần user xem:** T3 (EN lazy), T10 (S-3 đồ gỗ thay lúa mì, nội dung Singapore), số đo boot.

---

## Đã kiểm khi viết plan (2026-11-17)

**Cách viết và replay:**
- Viết trên bản `git archive` của HEAD **`61de3a9`** (`node_modules` nối bằng junction), mỗi task một commit.
- Sinh plan từ chính các commit đó, rồi **replay** toàn bộ plan lên một bản `git archive` sạch khác: đọc các khối `Tạo` / `Sửa … — thay/bằng` / `Thêm vào cuối`, mỗi khối "thay" phải khớp đúng một lần.
- Kết quả: 144 khối áp được, không khối nào lệch; nội dung từng file giống bản viết (chỉ khác kiểu xuống dòng CRLF/LF do `git archive` trên Windows). `tsc` sạch, **1468 test PASS** (`tests/seed.test.ts` từng chạm hạn 60 s khi hai bộ test chạy song song trên cùng máy; chạy riêng thì 25/25 PASS), `npm run build` sạch, `check-budget` mọi nhóm `ok` (`main` 265/270, `tickets` 99/110, `lanes` 10/20, `en` 12/20, `worker` 144/160), `bash -n scripts/check-deploy.sh` sạch. Replay từng task trên một bản sạch riêng, dừng sau mỗi task: `tsc` sạch và mọi test PASS (1423, 1424, 1437, 1438, 1441, 1446, 1468, 1468 test; HEAD có 1421).

**Solution và nội dung:**
- Mọi Solution bài tuyến chạy trên PGlite ra số dòng như bảng trên.
- Không bài nào hòa ở ranh LIMIT; S-1 có hòa và phá hòa theo tên như đề nói.

**Seed:**
- md5 của 24 bảng cũ (gồm `free_time_terms`, `container_events`, `claims`) trước và sau Plan 5 giống hệt.
- Khối Plan 5 nạp trong 4,3 ms.

**Smoke test trên Chrome** (bản build, cổng 5176, save thử ch1–5 + `r-1` + 2 card):
- `#/dashboard` vẽ card cột và card số, rồi 16 ô công ty.
- Hộp thoại bản đồ: danh sách tuyến ("~30 ngày · 1/3 bài tuyến", "đợt sau"), hồ sơ Rotterdam không có "+40%".
- "Làm bài tuyến" R-2: thanh việc chế độ bài tuyến. Nộp đúng: `lanes = [r-1, r-2]`, XP +50, `completed` giữ 27.
- "Ghim lên" mở hộp thoại (Đường "không hợp với kết quả này", xem trước 3 thanh, "Query chạy 7 ms"); ghim ra card `c3:bar:r-2`.
- Không lỗi console.

**Chưa kiểm trên Edge:** checklist Task 8 Step 4 (orchestrator, cổng 5174/5175), gồm đo thời gian khởi động.
