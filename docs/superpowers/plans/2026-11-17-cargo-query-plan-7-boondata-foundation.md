# BoonData — Plan 7: Nền móng (schema theo domain, brand, linh vật, nav trái, onboarding)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Làm pha **F1–F5** của `product-design-v6.md` theo thứ tự D-E1 (L57), cộng **v5 N1** (khung IA theo domain) và **v4 P2** (onboarding) mà F3/F4 phụ thuộc:
- **F1 · S1:** 26 bảng game seed vào schema `logistics` (`public` trống), `search_path = logistics, sandbox`, bỏ mọi `'public'` viết cứng. md5 ghim không đổi.
- **F2 · Token + linh vật + brand:** bảng màu ấm, bo góc 20/14/999, Nunito tự host (latin + vietnamese, woff2), **Boon** (vịt, người dẫn đường) và **Lily** (chó, bạn đồng hành) mỗi bạn 6 tư thế, brand **BoonData**, file LICENSE.
- **F3 + N1 · Khung:** nav cấp 1 trên thanh trên (`Trang chủ · Lộ trình · Luyện SQL` + nút domain), sidebar trái theo route (mở 256 px / rail 64 px / ngăn kéo + thanh dưới trên mobile), route `#/d/logistics/…` (hash cũ chuyển tiếp mãi mãi), trang Trang chủ nền tảng, Lộ trình, Luyện SQL, Tổng quan Logistics, Bản đồ, "Sắp có".
- **F4 + P2 · Onboarding và khoảnh khắc linh vật:** màn chào lúc tải DB (Lily ngủ → chờ), tour 8 bước của Boon trên ch1-01 thật (Esc bỏ qua), mở dần tab/nav, trạng thái rỗng, xem lại hướng dẫn; Lily reo khi đúng, Boon giải thích lỗi; không bao giờ trong editor hay bảng kết quả.
- **F5 · Danh sách "thở":** Trang chủ, Lộ trình, danh sách chương, kỹ năng: một dòng = một thứ.

**Ngoài phạm vi (Plan 8):** F6 hợp đồng `DomainArt` + cảnh Chung, F7 seed lười + `search_path` theo request + schema `lab` + drill (v5 N2), F8 cảnh Finance/E-com, Lộ trình nâng cao (v5 N3), Save v4. Plan này chỉ dựng các điểm nối cho chúng (mục "Điểm nối cho Plan 8").

**Architecture:**
- **Schema:** `src/domains.ts` là nguồn duy nhất của tên schema (`GAME_SCHEMA = 'logistics'`) và danh sách domain (`DOMAINS`). `initDb` tạo schema rồi `SET search_path` trước khi chạy `schema.sql` + `seed.sql` không sửa. `runLab` so tên bảng bằng `pg_class.relname`, không bằng `regclass::text` (không phụ thuộc `search_path`).
- **Linh vật:** sprite SVG tĩnh trong `index.html` (`<svg id="mascot-sprite">`, 12 `<symbol>`), màu là biến CSS theo theme. `src/ui/mascots.ts` chỉ dựng `<svg><use href="#lily-idle"/></svg>`: 0 byte JS cho hình. Vòng lặp idle (vẫy đuôi, chớp mắt, z bay) chỉ chạy khi sprite có lớp `live` (màn chào).
- **Route:** `src/route.ts` thuần (Route id + bảng alias + `canonicalHash`), `ui/router.ts` thay hash cũ bằng hash mới (không thêm mục lịch sử). Mọi trang đọc (Trang chủ, Lộ trình, Luyện SQL, Tổng quan, Bản đồ, Sắp có) vẽ vào `<main id="home">` bằng các section đăng ký có trường `pages`.
- **Nav:** một registry (`registerNav`, `area: 'top' | 'domain'`) cấp cho thanh trên, thanh dưới mobile và sidebar. `src/ui/sidebar.ts` vẽ sidebar theo route; độ rộng mở/rail do CSS quyết (`body[data-route]`, `body[data-side]`, container query), ngăn kéo mobile là `<dialog>` modal.
- **Onboarding:** logic thuần ở `src/onboarding.ts` (bước tour suy ra từ trạng thái, khóa nav, mở tab, pref `cargo-query/tour`); UI ở `src/ui/welcome.ts` (màn chào) và `src/ui/coach.ts` (dấu tour đặt trong vùng).
- **Không tăng `SAVE_VERSION`** (vẫn 3). Không đổi khóa localStorage nào: `cargo-query-save`, `cargo-query/*` giữ nguyên để tiến độ còn.

**Tech Stack:** như HEAD (Vite 8, TypeScript, Tailwind v4, PGlite 0.5.16, CodeMirror 6, Vitest). **Không thêm dependency**: font Nunito được chép (woff2 + OFL) vào repo.

**Spec / nguồn quyết định:**
- `docs/team/decision-log.md` **L57** (Boon = vịt hướng dẫn thay "cô Mây", Lily = chó đồng hành thay "Bin", brand BoonData, Nunito tự host latin + vietnamese, MIT + CC BY 4.0, thứ tự D-E1), L47–L56.
- `docs/team/product-design-v6.md` (§1 linh vật, §2 token + khoảnh khắc, §3 layout, §4 schema, §7 pha), `product-design-v5.md` §B (IA domain, route, nav N1), `product-design-v4.md` §B (onboarding P2), §C.6 (người đã biết SQL).
- Mockup `.superpowers/brainstorm/11840-1794844744/content/mascots-layout-v9.html` (thư mục `.superpowers/` bị `.gitignore`: hình linh vật đã chép nguyên văn vào Task 3 của plan này, đổi `bin`→`lily`, `may`→`boon`).
- Plan mẫu: `docs/superpowers/plans/2026-11-17-cargo-query-plan-6-lessons-ch1-3.md`.

**Tiền đề:**
- Plan 1–6 đã xong. Plan viết trên HEAD `f54da74` (Plan 6 Task 7 đã commit; cây làm việc còn sửa của vòng review Plan 6 ở `src/i18n/*.ts`, `src/progress.ts`, `src/ui/brief.ts`, `tests/progress.test.ts`). Task 0 chờ cây sạch.
- Đã kiểm khi viết plan (mục cuối): seed vào `logistics` cho đúng md5 ghim, `SHOW search_path`, thông điệp 42P01 của `public.ports`, `regclass` trong lab, độ tương phản 52 cặp token, kích thước font, ngân sách hiện tại (main **268/270 KB**).

## Đã có trên HEAD (không làm lại)

| Hạng mục | Trạng thái HEAD |
|---|---|
| `coach.ts` (4 spot, `COACH_KEY = 'cargo-query/coach-done'`, `coachDone()`) | Có. Plan này giữ spot `hints`, thay `brief`/`panel`/`recap` bằng tour 8 bước. |
| Bài học nhanh (`lessonSlot`, `openLesson`, `hasLesson`, pref `cargo-query/lessons`) | Có (Plan 6). Tour bước 4 dùng nút "Chạy ví dụ"; "Đã biết SQL" làm thẻ mở sẵn thu gọn (v4 §C.6, Plan 6 dời lại). |
| `registerNav` / `registerHomeSection` / `registerMode` (`upsert`, `src/registry.ts`) | Có. Plan này thêm trường, không thêm registry mới. |
| `#map` (thanh việc, ui-ux-v4 §2), `<dialog id="map-dialog">` | Giữ nguyên (v6 §3.3). |
| `stage.ts` (dock hoạt cảnh, `stageEsc`), `celebrate()` (`animate-pop`), khối CSS reduced-motion toàn cục | Có. Dùng lại. |
| Pref thiết bị qua `readJson`/`writeJson` (`src/storage.ts`) | Có. Thêm `cargo-query/sidebar`, `cargo-query/tour`. |

## Quyết định của plan này (V1–V18, để orchestrator ghi L-số)

**Cần user xem trước khi build:** V1 (trần ngân sách main), V5 (Practice/Sandbox vẫn là chế độ), V13 (tên chủ bản quyền MIT).

| # | Quyết định | Lý do |
|---|---|---|
| V1 | **Trần `main` 270 → 290 KB gzip.** Đo sau Plan 6: 268/270. Plan 7 thêm route, sidebar, 5 trang đọc, onboarding, khoảng 90 khóa i18n VI (từ điển VI nằm trong main): ước +12–20 KB. **Luật dừng:** task nào làm main > 290 thì dừng, báo lại (không tự nâng tiếp). **Cần user xem** (L55 giữ 270). | Plan 6 U3: tách module UI bằng `import()` làm Rolldown kéo code dùng chung ra chunk preload tĩnh, main thật còn lớn hơn. Hình linh vật đặt trong `index.html` (V3) để không tốn main. |
| V2 | **Nhóm ngân sách mới `fonts` (`/\.woff2$/`, 60 KB)** đặt trước `rest`. CSS giữ trần 20 KB (đang 12). | woff2 đã nén: latin 39,1 KB + vietnamese 13,1 KB = 52,2 KB; luật L40 (+5%, làm tròn 10). Không có nhóm riêng thì font rơi vào `rest`, không ai thấy. |
| V3 | **Sprite linh vật tĩnh trong `index.html`**, không dựng bằng `s()` trong `mascots.ts` (lệch v6 §1.4 luật 5). Thêm tư thế = thêm một `<symbol>` trong sprite + tên trong `POSES`; `tests/mascots.test.ts` kiểm. | 0 KB JS (sprite ~12,3 KB thô, ~2,3 KB gzip trong HTML), không `innerHTML`, hiện được trước khi JS chạy. |
| V4 | **Vòng lặp idle chỉ chạy khi `#mascot-sprite` có lớp `live`** (chỉ lúc màn chào mở). Mọi chỗ khác linh vật đứng yên; đúng bài chỉ có một nhịp `animate-pop` sẵn có. | CSS animation áp lên phần tử gốc trong `<defs>` nên mọi bản `<use>` cùng chạy (v6 §1.4). Bật toàn cục sẽ vi phạm "không animation vô hạn trong vùng làm bài" (v6 §2.5). |
| V5 | **Luyện tập và Sandbox vẫn là chế độ (session mode) trong `play`.** `#/practice` là trang hub "Luyện SQL" (ôn đến hạn, khởi động chương, kỹ năng theo module); bấm bắt đầu thì vào workspace như hiện nay. Sandbox là mục sidebar của domain, không có route `#/d/logistics/sandbox`. **Cần user xem** (lệch v5 §B.3). | Route Sandbox cần đồng bộ hai chiều mode ↔ hash (Back/Forward) mà không ai cần lúc này; mode vẫn reset khi tải lại như L37. |
| V6 | **Lộ trình (`#/learn`, `#/learn/sql/<n>`) = 12 module SQL = kỹ năng của 12 chương**, mỗi dòng có "Bài học nhanh" nếu có bài, cuối trang "Áp dụng ở Logistics, chương n". Track nâng cao chỉ là một dòng "đợt sau". Không có `#/learn/adv`, `#/learn/skill`, `#/d/logistics/ch/<n>`, không có pref `cargo-query/domain` (mới có một domain thật). | Đủ cho nav cấp 1 có đích thật (F5 cần danh sách Lộ trình) mà không làm N2/N3. |
| V7 | **Khoảnh khắc linh vật:** lỗi SQL có lời giải thích (`explainError`) → **Boon nghĩ**; timeout/khởi động lại DB → **Boon ối**; nộp đúng → **Lily reo**; kết quả sai → không linh vật. Linh vật nằm trong dòng phản hồi dưới nút Chạy/Nộp, **không bao giờ** trong editor hay tab Kết quả. Gợi ý: Boon nghĩ cạnh nút; rỗng (Luyện SQL chưa có gì, Bảng điều hành chưa có card) → Lily ngủ; trang Sắp có → Boon chờ; Lộ trình → Boon chỉ. | L57: Boon giải thích lỗi (lệch v6 §2.4 "Bin ối" cho lỗi SQL). `errorView` nằm trong tab Kết quả nên không gắn linh vật ở đó. |
| V8 | **Tour 8 bước (v4 §B.2 lớp 2) do Boon dẫn**, bước suy ra từ trạng thái (`tourStep`), bước đã qua ghi vào pref `cargo-query/tour` = `{ step, knows }`. **Xong tour không ghi `coach-done`**: `coach-done` chỉ nghĩa là "đã bỏ qua", nên dấu Gợi ý ở việc 2 vẫn hiện. Người chơi cũ (đã có `completed`, chưa có pref tour) không thấy màn chào hay tour. | v4 §B.4, §F.2. |
| V9 | **Mở dần chỉ cho người bắt đầu từ màn chào và không chọn "Đã biết SQL"** (`gated(tour)`). Tab: Thứ tự thực thi từ ch1-03, Biểu đồ từ ch2-02, Sơ đồ ER + Luồng dữ liệu từ ch3-01, EXPLAIN từ ch11-01 (tab hiện khi việc đó đã tới, có chấm "mới" ở chính việc đó). Nav: Sandbox, Dữ liệu khóa tới khi xong việc 1; Bảng điều hành tới khi xong việc 2; Lộ trình, Luyện SQL luôn mở (v5 §B.2 thắng v4 bảng lớp 3). Khóa = hiện + ổ khóa + tooltip, không ẩn (D-O3). | v4 D-O3, D-O4; v5 mới hơn v4. |
| V10 | **"Xem lại hướng dẫn" = bản tĩnh** (v4 D-O2 mặc định): menu ⋯ mở lại màn chào với danh sách 8 bước, không chạy tour trên ticket. | D-O2. |
| V11 | **Danh sách bảng của trang Dữ liệu vào sidebar từ 1024 px** (v6 §3.3); dưới 1024 px vẫn ở đầu trang (ngăn kéo không phải chỗ chọn bảng mỗi lần). | Mobile chọn bảng một chạm. |
| V12 | **Brand BoonData** ở `<title>`, thanh trên, `app.name`, `save.invalid`, README, `docs/ops/deploy.md`, `CLAUDE.md`, tên file xuất `boondata-progress.json` (Nhập vẫn đọc file cũ). Chữ "Cargo Query" còn lại trong i18n luôn là "Cargo Query Logistics" (công ty, có test). Repo, URL, `package.json` `name`, mọi khóa `cargo-query*` giữ nguyên. | L57, v5 §A.4. |
| V13 | **`LICENSE` (MIT) cho code, chủ bản quyền "KhoaDauTay"** (chủ repo public theo L50). `assets/mascots/LICENSE` (CC BY 4.0) cho hình Boon và Lily (sprite trong `index.html` + `public/favicon.svg`). `src/assets/fonts/OFL.txt` cho Nunito. **Cần user xem** tên chủ bản quyền. | L57 D-A3. Gói font không khai báo Reserved Font Name và file không bị sửa, nên giữ tên "Nunito". |
| V14 | **Nunito biến thiên (wght 200–1000)** từ `@fontsource-variable/nunito` **5.3.0** (OFL-1.1, phát hành 2026-07-19): chép 2 file `nunito-latin-wght-normal.woff2` (39.128 B), `nunito-vietnamese-wght-normal.woff2` (13.096 B) vào `src/assets/fonts/`, `@font-face` viết tay trong `style.css`, `font-display: swap`. Không cài gói npm. | L57 "chỉ subset latin + vietnamese". Gói `wght.css` có thêm cyrillic, latin-ext: Vite sẽ phát hành cả chúng. |
| V15 | **Bo góc:** `--r-card` 20 px (thẻ, hộp thoại), `--r-ctl` 14 px (nút, ô nhập), nút chính dạng viên thuốc có "bậc" 3 px. **Bỏ bóng mềm** của v6 §2.1 (giữ viền 1 px `--border` ấm). | Đơn giản hóa có chủ ý: bóng theo theme cần thêm token + `dark:`; viền ấm đã đủ nhẹ. |
| V16 | `runLab` so `pg_class.relname` của bảng được đánh chỉ mục (không `indrelid::regclass::text`). | v6 §4.3 bẫy: `regclass` đổi theo `search_path`; F7 sẽ đặt path theo request. |
| V17 | Thanh trên thôi dùng gradient xanh (L42): nền `--panel`, viền dưới `--border`, nav dạng viên thuốc `--accent-soft`; XP là viên `--sun`/`--sun-ink`. | v6 §2, §3.1; mọi cặp chữ/nền có trong test tương phản. |
| V18 | **Dời sang sau:** Lily + Boon trong màn thăng tiến (dock `stage.ts`), Lily "nghĩ" khi query > 400 ms, bong bóng "Tab mới: …" một lần (chấm "mới" đã đủ), bóng mềm (V15), Sandbox route (V5). | Ngoài danh sách F4 user nêu; giữ diff nhỏ. |

## Điểm nối cho Plan 8 (F6–F8)

- `src/domains.ts`: `GAME_SCHEMA`, `DOMAINS` (`{ id, live, icon, name, desc }`). F7 thêm `schema` cho từng domain + `lab`; F6 thêm trường lười `art: () => import('./art/<id>')`.
- `initDb(db)` tạo schema rồi seed: F7 đổi thành `initDb(db, schemas)` và `ensure(schema)`; `runSandboxed`/`runExplain`/`runLab` sẽ nhận `{ schema }` để `SET LOCAL search_path` trong `BEGIN … ROLLBACK`. `runLab` đã không phụ thuộc path (V16).
- `erMeta(GAME_SCHEMA)`, `loadColumns` và `GAME_TABLES_SQL` đọc một hằng: F7 đổi hằng thành schema của trang đang mở.
- Route: `inDomain(route)`, `soonDomainOf(hash)`, `domainHash(id)`; trang "Sắp có" là chỗ F8 gắn cảnh domain.
- Sidebar: phần dưới theo route (`extraHost`), chỗ F6 gắn mục "Bản đồ" của domain khác.
- Linh vật: `mascot(who, pose)`; F6 vẽ "bàn học" dùng cùng sprite.

**Cách đọc các bước sửa code** (như Plan 2–6):
- **Tạo `path`:** ghi cả file (file mới).
- **Ghi lại `path`** (ghi cả file): thay toàn bộ nội dung file có sẵn.
- **Sửa `path`** — thay: khối thứ nhất phải xuất hiện **đúng một lần**; thay bằng khối sau "bằng:".
- Khối "thay" không khớp (HEAD đã đổi): áp ý của bước vào code trên đĩa (L7) và ghi chỗ lệch vào mô tả commit.

## Global Constraints

- Mọi ràng buộc của các plan trước vẫn áp dụng:
  - PGlite **0.5.16** pin; không `innerHTML` (ngoại lệ duy nhất: Mermaid ở trang Dữ liệu).
  - Mọi chữ UI qua `t()`; khóa mới thêm vào **cả** `vi.ts` và `en.ts` trong cùng task. Tên riêng giống nhau ở VI và EN (`BoonData`, `Boon`, `Lily`, `Logistics`, `Finance`, `E-commerce`) vào `SAME_OK` của `tests/i18n.test.ts`.
  - Không dùng chữ "boss"/"sự cố" trên UI (L22). Không emoji trong UI (L42): mũi tên "→" và "✓" có sẵn thì được.
  - Không ghép class Tailwind bằng template literal (`tests/theme.test.ts`), dùng `cx()`; mọi class là chuỗi nguyên vẹn.
  - Mọi bước "xác nhận PASS" chạy thêm `npx tsc --noEmit`.
- **Seed:** không sửa `schema.sql`/`seed.sql`. md5 trong `tests/seed.test.ts` không đổi.
- **Save và khóa:** không đổi `SAVE_VERSION` (3), không đổi `Save`, không đổi khóa `cargo-query-save`, `cargo-query/*` đang có. Pref mới: `cargo-query/sidebar` (`'open' | 'rail'`), `cargo-query/tour` (`{ step, knows }`), cả hai đọc qua `readJson` + validate, không vào Save hay Xuất/Nhập.
- **Linh vật (v6 §1.4):** tối đa một linh vật mỗi vùng; không bao giờ trong editor, bảng kết quả hay che nút/đề; trang trí thì `aria-hidden`, đứng một mình thì `role="img"` + `aria-label`; tên "Snoopy", "Donald", "Duck", "Bin", "Mây" không xuất hiện trong UI hay code mới.
- **Chuyển động:** chỉ `transform`/`opacity`; khối `prefers-reduced-motion: reduce` toàn cục trong `style.css` giữ nguyên; không vòng lặp vô hạn trong `#shell` (V4).
- **Tương phản:** mọi cặp chữ/nền ≥ 4,5:1 cả hai theme (test mới ở Task 2); chữ trắng chỉ trên nền -700 hoặc tối hơn.
- **Ngân sách:** sau mỗi task có sửa `src/`, `index.html` hay `style.css`: `npm run build && node scripts/check-budget.mjs`, ghi số `main`/`css`/`fonts` vào mô tả commit. Trần mới: `main` 290 (V1), `fonts` 60 (V2). Không thêm `import()` cho module UI.
- **Kiểm thử:**
  - Logic thuần có test (`src/route.ts`, `src/onboarding.ts`, `parseSidePref`, token, sprite, `mascotOf`).
  - DOM kiểm tay trên **Edge, cổng 5174** (`npm run dev -- --port 5174 --strictPort`; không bao giờ `:5173`), cả sáng và tối, 1440 px, 1100 px, 375 px; Edge DevTools → Rendering → "Emulate CSS prefers-reduced-motion: reduce" cho mục chuyển động.
  - Không chạy hai `vitest` (hay `vitest` và `build`) song song: seed có thể chạm hạn 60 s.
- **Commit:**
  - Mỗi task một commit (bước cuối của task); chỉ `git add` đúng các file của task.
  - Mọi commit message kết thúc bằng dòng `Claude-Session: https://claude.ai/code/session_01PwPSBV1SVDP6quEZfKN56M`.

## File Structure

```
src/domains.ts                      GAME_SCHEMA, DOMAINS                                                    (tạo, T1, T5)
src/db/init.ts, src/db/import.ts    seed vào schema logistics, search_path logistics, sandbox               (sửa, T1)
src/db/run.ts                       runLab so relname                                                       (sửa, T1)
src/main.ts, src/import/myData.ts, src/state.ts, src/ui/{brief,dataView,vizTabs}.ts   'public' → GAME_SCHEMA (sửa, T1)
src/ui/sqlErrors.ts                 tiền tố public. → giải thích                                            (sửa, T1)
src/style.css                       token ấm, bo góc, @font-face, biến linh vật, CSS khung/sidebar           (sửa, T2, T3, T6)
src/assets/fonts/*.woff2, OFL.txt   Nunito latin + vietnamese                                               (tạo, T2)
src/theme.ts                        CARD, BTN_GO, NAV_LINK, TOP_BTN … theo token mới                          (sửa, T2, T6)
index.html                          sprite linh vật, title/meta/favicon, thanh trên mới, khung, sidebar, thanh dưới, hộp thoại (sửa, T3, T4, T6, T7)
src/ui/mascots.ts                   mascot(), POSES                                                         (tạo, T3)
public/favicon.svg, LICENSE, assets/mascots/LICENSE, README.md                                              (tạo, T3)
src/route.ts, src/ui/router.ts      route mới, alias, canonicalHash                                         (ghi lại / sửa, T5)
src/ui/homeView.ts                  trang theo `pages`, listRow, Trang chủ nền tảng, Lộ trình, Bản đồ, Sắp có (sửa, T5, T10)
src/ui/topbar.ts                    NavItem area/icon, nav cấp 1, thanh dưới, menu domain                   (sửa, T5, T6)
src/ui/sidebar.ts                   sidebar, rail, overlay, ngăn kéo, pref                                  (tạo, T6)
src/onboarding.ts                   pref tour, tourStep, gated, navLock, tabOpen                            (tạo, T7)
src/ui/welcome.ts                   màn chào lúc tải DB, xem lại                                            (tạo, T7)
src/ui/coach.ts                     dấu tour trong vùng + Esc                                              (ghi lại, T7)
src/ui/tabs.ts, src/ui/vizTabs.ts   `from` mở dần, ghi tab đã mở                                             (sửa, T7, T8)
src/ui/modes.ts, src/ui/work.ts, src/ui/lessonCard.ts, src/session.ts, src/diagnostics.ts  (sửa, T5–T9)
src/ui/feedback.ts                  mascotOf                                                                (sửa, T9)
src/i18n/vi.ts, en.ts               khóa mới mỗi task                                                       (sửa)
scripts/check-budget.mjs, scripts/check-deploy.sh                                                          (sửa, T2)
tests/{seed,import,erd,glossary,sqlErrors,theme,mascots,i18n,route,prefs,onboarding,coach,diagnostics,home}.test.ts
CLAUDE.md, docs/ops/deploy.md                                                                               (sửa, T4, T11)
```

---

### Task 0: Kiểm tiền đề (không sửa file)

- [ ] **Step 1: Cây làm việc sạch, test và kiểu đang sạch**

Run: `git status --short && npm test && npx tsc --noEmit`
Expected: `git status` không có file `src/`, `tests/`, `content/` đang sửa (vòng review Plan 6 đã commit); mọi test PASS; `tsc` không lỗi.

- [ ] **Step 2: Grep các điểm neo**

Run:
```bash
for p in "export async function initDb(db: { exec(sql: string): Promise<unknown> }): Promise<void> {" "SET search_path = public, sandbox;" "i.indrelid::regclass::text AS tbl" "export const ROUTES = ['home', 'play', 'data', 'dashboard'] as const;" "export type CoachSpot = 'brief' | 'panel' | 'recap' | 'hints';" "export function lessonSlot(grants: string[]): HTMLElement | null {" "registerNav({ id: 'data', order: 50," "['en', /^en-" "'nav.dashboard': 'Bảng điều hành'," "'nav.dashboard': 'Dashboard',"; do printf '%-90s' "$p"; grep -rlF -- "$p" src tests scripts | wc -l; done
grep -rn "'public'" src tests | wc -l; grep -n "SAVE_VERSION = " src/save.ts; ls src/domains.ts src/onboarding.ts src/ui/sidebar.ts 2>&1 | grep -c "No such"
```
Expected:
- Mỗi mẫu có trong đúng một file (cột cuối = 1).
- `'public'` xuất hiện ở 11 chỗ: `main.ts`, `myData.ts`, `state.ts`, `brief.ts`, `dataView.ts`, `vizTabs.ts`, `erd.test.ts` ×4, `glossary.test.ts`. Có thêm chỗ khác thì Task 1 đổi luôn (luật: sau Task 1 không còn chỗ nào).
- `SAVE_VERSION = 3`; 3 file mới chưa có (dòng cuối = 3).

- [ ] **Step 3: Số đo ngân sách gốc**

Run: `npm run build && node scripts/check-budget.mjs`
Expected: mọi nhóm `ok`; `main` ≈ 268 KB. Ghi lại số `main` và `css` để so ở từng task.

---

### Task 1: F1 · Schema `logistics` (v6 §4.5 S1)

**Files:** `src/domains.ts` (tạo), `src/db/init.ts`, `src/db/import.ts`, `src/db/run.ts`, `src/main.ts`, `src/import/myData.ts`, `src/state.ts`, `src/ui/brief.ts`, `src/ui/dataView.ts`, `src/ui/vizTabs.ts`, `src/ui/sqlErrors.ts`, `src/i18n/vi.ts`, `src/i18n/en.ts`, `tests/seed.test.ts`, `tests/import.test.ts`, `tests/erd.test.ts`, `tests/glossary.test.ts`, `tests/sqlErrors.test.ts`

**Interfaces:**
- Consumes: `initDb`, `SANDBOX_SETUP_SQL`, `runLab`, `erMeta`, `loadErMetadata`, `explainError` (HEAD).
- Produces: `GAME_SCHEMA` (`src/domains.ts`, `'logistics'`); session `search_path = logistics, sandbox`; khóa i18n `sqlerr.publicPrefix`.

- [ ] **Step 1: Test hỏng trước**

**Sửa `tests/seed.test.ts`** — thay:
```ts
describe('seed', () => {
  it('tất định: hai lần seed cho cùng dữ liệu', async () => {
```
bằng:
```ts
describe('seed', () => {
  it('S1 (v6 §4.4): 26 bảng game nằm ở schema logistics, public trống', async () => {
    const count = async (schema: string) => (await one<{ n: number }>(
      `SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = '${schema}'`)).n;
    expect(await count('logistics')).toBe([...TABLES, ...PLAN2, ...PLAN3, ...PLAN4, ...PLAN5].length);
    expect(await count('public')).toBe(0);
    expect((await one<{ search_path: string }>('SHOW search_path')).search_path).toBe('logistics, sandbox');
  });

  it('tất định: hai lần seed cho cùng dữ liệu', async () => {
```

**Sửa `tests/import.test.ts`** — thay cả hai chỗ (dòng 70 và 80):
```ts
.toEqual([['public, sandbox']]);
```
bằng:
```ts
.toEqual([['logistics, sandbox']]);
```

**Sửa `tests/sqlErrors.test.ts`** — thay:
```ts
  ['SELECT code FROM portz', 'sqlerr.42P01'],
```
bằng:
```ts
  ['SELECT code FROM portz', 'sqlerr.42P01'],
  // Plan 7 (v6 §4.4-7): an old card or draft that still says public.ports gets told where the tables went.
  ['SELECT code FROM public.ports', 'sqlerr.publicPrefix'],
```

**Sửa `tests/erd.test.ts`, `tests/glossary.test.ts`:** thêm `import { GAME_SCHEMA } from '../src/domains';` cạnh các import khác; trong `erd.test.ts` thay 4 chỗ `loadErMetadata(await runner(), 'public')` bằng `loadErMetadata(await runner(), GAME_SCHEMA)`; trong `glossary.test.ts` thay:
```ts
    const r = await run("SELECT table_name || '.' || column_name FROM information_schema.columns WHERE table_schema = 'public'");
```
bằng:
```ts
    const r = await run(`SELECT table_name || '.' || column_name FROM information_schema.columns WHERE table_schema = '${GAME_SCHEMA}'`);
```

- [ ] **Step 2: Chạy, thấy hỏng**

Run: `npx vitest run tests/seed.test.ts tests/import.test.ts tests/sqlErrors.test.ts`
Expected: FAIL: `count('logistics')` = 0, `search_path` = `public, sandbox`, `sqlerr.publicPrefix` không có (và `tsc`/import lỗi ở `erd.test.ts` vì `src/domains.ts` chưa có).

- [ ] **Step 3: Code**

**Tạo `src/domains.ts`:**
```ts
/**
 * Domains (product-design-v5 §B, v6 §4). Each domain owns one Postgres schema in the single PGlite DB; `public` stays empty.
 * Schema names come only from this file, never from player input. Imported by the worker: keep it free of UI imports.
 */
export const GAME_SCHEMA = 'logistics';
```

**Ghi lại `src/db/init.ts`:**
```ts
import schema from './schema.sql?raw';
import seed from './seed.sql?raw';
import { GAME_SCHEMA } from '../domains';
import { SANDBOX_SETUP_SQL } from './import';

/**
 * v6 §4.4 S1: the game tables are created in their own schema (public stays empty). schema.sql and seed.sql are unchanged:
 * they use bare names, so the session search_path decides where they go. md5 pins in tests/seed.test.ts are unaffected
 * (row::text carries no schema name).
 */
export async function initDb(db: { exec(sql: string): Promise<unknown> }): Promise<void> {
  await db.exec(`CREATE SCHEMA ${GAME_SCHEMA}; SET search_path = ${GAME_SCHEMA};`);
  await db.exec(schema);
  await db.exec(seed);
  await db.exec(SANDBOX_SETUP_SQL);
}
```

**Sửa `src/db/import.ts`** — thay:
```ts
export const SANDBOX_SETUP_SQL = 'CREATE SCHEMA IF NOT EXISTS sandbox; SET search_path = public, sandbox;';
```
bằng:
```ts
export const SANDBOX_SETUP_SQL = `CREATE SCHEMA IF NOT EXISTS sandbox; SET search_path = ${GAME_SCHEMA}, sandbox;`;
```
và thêm dòng `import { GAME_SCHEMA } from '../domains';` vào đầu file (cạnh các import có sẵn).

**Sửa `src/db/run.ts`** — thay:
```ts
  const relations = async () => (await db.query<{ oid: string; kind: string; tbl: string | null }>(
    `SELECT c.oid::text AS oid, c.relkind::text AS kind, i.indrelid::regclass::text AS tbl
     FROM pg_class c LEFT JOIN pg_index i ON i.indexrelid = c.oid`)).rows;
```
bằng:
```ts
  // The indexed table's bare name: indrelid::regclass::text would read "logistics.container_events" whenever the
  // schema is not on the search_path (v6 §4.3), and Plan 8 sets the path per request.
  const relations = async () => (await db.query<{ oid: string; kind: string; tbl: string | null }>(
    `SELECT c.oid::text AS oid, c.relkind::text AS kind, t.relname::text AS tbl
     FROM pg_class c LEFT JOIN pg_index i ON i.indexrelid = c.oid LEFT JOIN pg_class t ON t.oid = i.indrelid`)).rows;
```

**Sửa `src/main.ts`** — thay:
```ts
      "SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position",
```
bằng:
```ts
      `SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = '${GAME_SCHEMA}' ORDER BY table_name, ordinal_position`,
```
và thêm `import { GAME_SCHEMA } from './domains';` vào khối import.

**Sửa `src/import/myData.ts`** — thay:
```ts
const GAME_TABLES_SQL = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'";
```
bằng:
```ts
const GAME_TABLES_SQL = `SELECT table_name FROM information_schema.tables WHERE table_schema = '${GAME_SCHEMA}'`;
```
và thêm `import { GAME_SCHEMA } from '../domains';`.

**Sửa `src/state.ts`, `src/ui/brief.ts`, `src/ui/dataView.ts`, `src/ui/vizTabs.ts`:** thay mọi `erMeta('public')` bằng `erMeta(GAME_SCHEMA)` và thêm `import { GAME_SCHEMA } from '../domains';` (`src/state.ts`: `'./domains'`). Sau bước này:

Run: `grep -rn "'public'" src tests`
Expected: không còn dòng nào.

**Sửa `src/ui/sqlErrors.ts`** — thay:
```ts
const BY_MESSAGE: [RegExp, Key][] = [
```
bằng:
```ts
const BY_MESSAGE: [RegExp, Key][] = [
  // Plan 7 (v6 §4.4-7): the game tables moved from public to the logistics schema; a saved card or draft may still say public.x.
  [/^relation "public\./, 'sqlerr.publicPrefix'],
```

**Sửa `src/i18n/vi.ts`** — thay:
```ts
  'sqlerr.42P01': 'Bảng không tồn tại hoặc chưa mở ở chương này. Xem tab Cột.',
```
bằng:
```ts
  'sqlerr.42P01': 'Bảng không tồn tại hoặc chưa mở ở chương này. Xem tab Cột.',
  'sqlerr.publicPrefix': 'Bảng của công ty giờ nằm trong schema logistics. Bỏ tiền tố public. và viết tên bảng trần, ví dụ ports.',
```

**Sửa `src/i18n/en.ts`** — thay:
```ts
  'sqlerr.42P01': 'That table does not exist or is not unlocked in this chapter. See the Columns tab.',
```
bằng:
```ts
  'sqlerr.42P01': 'That table does not exist or is not unlocked in this chapter. See the Columns tab.',
  'sqlerr.publicPrefix': 'The company tables now live in the logistics schema. Drop the public. prefix and write the bare table name, for example ports.',
```

- [ ] **Step 4: Chạy, thấy qua**

Run: `npx vitest run tests/seed.test.ts tests/import.test.ts tests/sqlErrors.test.ts tests/erd.test.ts tests/glossary.test.ts tests/planCheck.test.ts tests/run.test.ts tests/myData.test.ts && npx tsc --noEmit`
Expected: PASS. `planCheck.test.ts` (phòng thí nghiệm chỉ mục ch11: đúng bảng qua, sai bảng `LAB02`) và md5 trong `seed.test.ts` không đổi.

- [ ] **Step 5: Toàn bộ test + ngân sách**

Run: `npm test && npm run build && node scripts/check-budget.mjs`
Expected: PASS; `worker` và `main` gần như không đổi (+< 0,1 KB).

- [ ] **Step 6: Edge**

`npm run dev -- --port 5174 --strictPort`, Edge, tải lạnh (DevTools → Application → Clear site data trừ khi muốn giữ tiến độ):
1. "Database sẵn sàng" như cũ; ch1-01 Chạy/Nộp được; tab Cột, Sơ đồ ER, trang Dữ liệu đủ bảng đã mở; autocomplete gợi ý tên bảng.
2. Sandbox: `SELECT * FROM public.ports` → lỗi 42P01 kèm dòng giải thích mới; `SHOW search_path` → `logistics, sandbox`.
3. Dữ liệu của tôi: nạp một CSV tên `ports.csv` → bảng thành `ports_my` (kiểm trùng I7 vẫn chạy).
4. Ch11 phòng thí nghiệm chỉ mục (nếu save đã tới): `CREATE INDEX ON container_events (container_id)` qua; chỉ mục trên bảng khác báo `LAB02`.

- [ ] **Step 7: Commit**

```bash
git add src/domains.ts src/db/init.ts src/db/import.ts src/db/run.ts src/main.ts src/import/myData.ts src/state.ts src/ui/brief.ts src/ui/dataView.ts src/ui/vizTabs.ts src/ui/sqlErrors.ts src/i18n/vi.ts src/i18n/en.ts tests/seed.test.ts tests/import.test.ts tests/erd.test.ts tests/glossary.test.ts tests/sqlErrors.test.ts
git commit -m "feat: game tables seed into schema logistics, public stays empty (v6 S1); runLab compares relname" -m "Claude-Session: https://claude.ai/code/session_01PwPSBV1SVDP6quEZfKN56M"
```

---

### Task 2: F2 · Token ấm, bo góc, Nunito tự host, test tương phản, ngân sách

**Files:** `src/style.css`, `src/assets/fonts/nunito-latin-wght-normal.woff2`, `src/assets/fonts/nunito-vietnamese-wght-normal.woff2`, `src/assets/fonts/OFL.txt` (tạo), `src/theme.ts`, `src/ui/tabs.ts`, `src/ui/homeView.ts`, `scripts/check-budget.mjs`, `scripts/check-deploy.sh`, `tests/theme.test.ts`

**Interfaces:**
- Consumes: tên biến CSS đang có (`--bg`, `--panel`, … là hợp đồng, giữ nguyên tên).
- Produces: biến mới `--sun`, `--sun-ink`, `--r-card`, `--r-ctl`; utility `bg-sun`, `text-sun-ink`, `rounded-(--r-card)`, `rounded-(--r-ctl)`; font `'Nunito Variable'`; nhóm ngân sách `fonts`.

- [ ] **Step 1: Test tương phản (hỏng trước)**

**Sửa `tests/theme.test.ts`** — thêm vào đầu file (sau các import có sẵn):
```ts
import css from '../src/style.css?raw';

/** WCAG 2.x relative luminance and contrast ratio. */
const lum = (hex: string): number => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: string, b: string): number => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
/** `--name: #rrggbb` pairs of one rule block of style.css. */
const tokens = (selector: string): Record<string, string> => {
  const body = css.split(`${selector} {`)[1]?.split('}')[0] ?? '';
  return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)].map((m) => [m[1], m[2]]));
};
/** Text colour on background, every pair the UI uses for words (v6 §2.3). --disabled is exempt (WCAG 1.4.3: inactive controls). */
const TEXT_PAIRS: [string, string][] = [
  ['text', 'panel'], ['text', 'bg'], ['text', 'code'], ['text', 'accent-soft'], ['text', 'sea'],
  ['muted', 'panel'], ['muted', 'bg'], ['muted', 'code'], ['muted', 'accent-soft'], ['muted', 'sea'],
  ['accent', 'panel'], ['accent', 'bg'], ['on-accent', 'accent'],
  ['good', 'panel'], ['bad', 'panel'], ['warn', 'panel'], ['good', 'bg'], ['bad', 'bg'], ['warn', 'bg'],
  ['sun-ink', 'sun'],
  ...['keyword', 'string', 'number', 'comment', 'operator', 'type', 'property', 'atom']
    .flatMap((s): [string, string][] => [[`syn-${s}`, 'panel'], [`syn-${s}`, 'code']]),
];
```
và thêm vào cuối `describe('theme', …)` (trước `});` cuối):
```ts
  it('chữ trên nền ≥ 4,5:1 ở cả hai theme (WCAG AA, product-design-v6 §2.3)', () => {
    const light = tokens(':root');
    const dark = { ...light, ...tokens(':root[data-theme=dark]') };
    const bad = ([['light', light], ['dark', dark]] as const).flatMap(([name, tk]) => TEXT_PAIRS
      .filter(([fg, bg]) => !tk[fg] || !tk[bg] || ratio(tk[fg], tk[bg]) < 4.5)
      .map(([fg, bg]) => `${name} ${fg}/${bg} ${tk[fg] && tk[bg] ? ratio(tk[fg], tk[bg]).toFixed(2) : 'thiếu token'}`));
    expect(bad).toEqual([]);
  });

  it('token ấm của v6 (L57) và bo góc 20/14', () => {
    expect(tokens(':root')).toMatchObject({ bg: '#fbf7f0', accent: '#0f766e', sun: '#ffe9bd', 'sun-ink': '#5c3d00' });
    expect(tokens(':root[data-theme=dark]')).toMatchObject({ bg: '#1a1714', accent: '#5ed3c3', sun: '#4a3a17' });
    expect(css).toMatch(/--r-card:\s*20px;\s*--r-ctl:\s*14px;/);
  });
```

Run: `npx vitest run tests/theme.test.ts`
Expected: FAIL ở test token ấm (`bg` đang `#f1f1ee`, chưa có `--sun`); test tương phản báo `sun-ink/sun thiếu token`.

- [ ] **Step 2: Chép font Nunito (V14)**

Run (thư mục tạm riêng, không chạy script nào của gói):
```bash
T=$(mktemp -d) && (cd "$T" && npm pack @fontsource-variable/nunito@5.3.0 --silent && tar xzf fontsource-variable-nunito-5.3.0.tgz)
mkdir -p src/assets/fonts
cp "$T/package/files/nunito-latin-wght-normal.woff2" "$T/package/files/nunito-vietnamese-wght-normal.woff2" src/assets/fonts/
cp "$T/package/LICENSE" src/assets/fonts/OFL.txt
wc -c src/assets/fonts/*; grep -c "SIL OPEN FONT LICENSE Version 1.1" src/assets/fonts/OFL.txt; grep -c "Reserved Font Name" src/assets/fonts/OFL.txt
```
Expected: `39128` và `13096` byte; OFL có dòng giấy phép (1); dòng 33/63 của OFL chỉ là định nghĩa chung (dòng bản quyền đầu file không khai báo Reserved Font Name).

- [ ] **Step 3: Token, font, bo góc trong `src/style.css`**

**Sửa `src/style.css`** — thay:
```css
/* App tokens. Names are a contract: Plan 1b/1c/Import CSS reads var(--accent), var(--border)… */
:root {
  --bg: #f1f1ee; --panel: #ffffff; --text: #1d1d1f; --muted: #66666b; --border: #d4d4cf;
  --accent: #0f6cbd; --accent-soft: #dbeafe; --on-accent: #ffffff; --good: #1a7f37; --bad: #c62828; --warn: #9a4f00;
  --code: #efefea; --sea: #e8f1f8; --land: #d9e2ea; --bar: #1f3b57; --disabled: #8a8a90;
  /* L13 syntax colours: >= 5.6:1 on --panel (#fff) */
```
bằng:
```css
/* Nunito (SIL OFL 1.1, src/assets/fonts/OFL.txt), variable 200–1000, files from @fontsource-variable/nunito 5.3.0, unmodified:
   latin + vietnamese only (L57). unicode-range lets the browser fetch the Vietnamese file only for text that needs it. */
@font-face {
  font-family: 'Nunito Variable'; font-style: normal; font-display: swap; font-weight: 200 1000;
  src: url('./assets/fonts/nunito-vietnamese-wght-normal.woff2') format('woff2-variations');
  unicode-range: U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB;
}
@font-face {
  font-family: 'Nunito Variable'; font-style: normal; font-display: swap; font-weight: 200 1000;
  src: url('./assets/fonts/nunito-latin-wght-normal.woff2') format('woff2-variations');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

/* App tokens. Names are a contract: Plan 1b/1c/Import CSS reads var(--accent), var(--border)…
   v6 §2.2 (L57): warm cream, teal accent; every text pair is checked in tests/theme.test.ts. */
:root {
  --bg: #fbf7f0; --panel: #ffffff; --text: #2a2320; --muted: #6b5f57; --border: #e8dfd3;
  --accent: #0f766e; --accent-soft: #dcf2ee; --on-accent: #ffffff; --good: #1a7f37; --bad: #b42318; --warn: #9a4f00;
  --code: #f4eee5; --sea: #e8f1f8; --land: #d9e2ea; --bar: #1f3b57; --disabled: #8a8a90;
  /* Boon's speech bubbles and the XP pill. */
  --sun: #ffe9bd; --sun-ink: #5c3d00;
  --r-card: 20px; --r-ctl: 14px;
  /* L13 syntax colours: >= 4.8:1 on --panel and --code */
```

Thay:
```css
:root[data-theme=dark] {
  --bg: #121214; --panel: #1f1f22; --text: #ececf0; --muted: #a0a0a8; --border: #3f3f46;
  --accent: #5aa9ff; --accent-soft: #1d3550; --on-accent: #0d1b29; --good: #4cc26d; --bad: #ff6b6b; --warn: #ffb35a;
  --code: #2a2a30; --sea: #14202b; --land: #2b3742; --bar: #0d1b29; --disabled: #7a7a82;
  /* L13 syntax colours: >= 6.3:1 on --panel (#1f1f22) */
```
bằng:
```css
:root[data-theme=dark] {
  --bg: #1a1714; --panel: #25201c; --text: #f3ece4; --muted: #b9ab9c; --border: #3e362f;
  --accent: #5ed3c3; --accent-soft: #16332f; --on-accent: #0b2522; --good: #6bd58a; --bad: #ff8a7a; --warn: #ffc067;
  --code: #2e2823; --sea: #14202b; --land: #2b3742; --bar: #0d1b29; --disabled: #7a7a82;
  --sun: #4a3a17; --sun-ink: #ffe2a3;
  /* L13 syntax colours: >= 5.6:1 on --panel and --code */
```

Thay:
```css
  --color-disabled: var(--disabled);
}
```
bằng:
```css
  --color-disabled: var(--disabled);
  --color-sun: var(--sun);
  --color-sun-ink: var(--sun-ink);
}
```

Thay:
```css
  body { margin: 0; font: 15px/1.5 system-ui, sans-serif; background: var(--bg); color: var(--text); }
```
bằng:
```css
  body { margin: 0; font: 15px/1.5 'Nunito Variable', system-ui, sans-serif; background: var(--bg); color: var(--text); }
```

Thay:
```css
  button { cursor: pointer; padding: 6px 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--panel); color: inherit; }
```
bằng:
```css
  button { cursor: pointer; padding: 6px 12px; border: 1px solid var(--border); border-radius: var(--r-ctl); background: var(--panel); color: inherit; font: inherit; }
```

Thay:
```css
  dialog { margin: auto; padding: 20px; border: 1px solid var(--border); border-radius: 16px; background: var(--panel); color: var(--text); width: min(520px, calc(100vw - 32px)); box-shadow: 0 20px 40px rgb(0 0 0 / 0.25); }
```
bằng:
```css
  dialog { margin: auto; padding: 20px; border: 1px solid var(--border); border-radius: var(--r-card); background: var(--panel); color: var(--text); width: min(520px, calc(100vw - 32px)); box-shadow: 0 20px 40px rgb(0 0 0 / 0.25); }
```

Thay:
```css
  button.primary { background: var(--accent); border-color: var(--accent); color: var(--on-accent); font-weight: 600; }
```
bằng:
```css
  /* v6 §2.1: the main action is a pill with a 3 px step that presses down. */
  button.primary { background: var(--accent); border-color: var(--accent); color: var(--on-accent); font-weight: 700; border-radius: 999px; box-shadow: 0 3px 0 rgb(0 0 0 / 0.18); }
  button.primary:active:not(:disabled) { transform: translateY(2px); box-shadow: 0 1px 0 rgb(0 0 0 / 0.18); }
```

- [ ] **Step 4: Hằng class theo token (`src/theme.ts`, `src/ui/tabs.ts`, `src/ui/homeView.ts`)**

**Sửa `src/theme.ts`** — thay:
```ts
export const CARD = 'rounded-2xl bg-panel ring-1 ring-line';
```
bằng:
```ts
export const CARD = 'rounded-(--r-card) bg-panel ring-1 ring-line';
```
Thay:
```ts
/** Blue call to action: white on blue-700 = 6.7:1, on blue-600 (dark theme) = 5.2:1. */
export const BTN_GO = 'border-0 bg-blue-700 font-semibold text-white shadow-sm hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700';
/** Green Submit (L17): white on emerald-700 = 5.5:1 (the mockup's emerald-600 is 3.8:1). */
export const BTN_SUBMIT = 'ml-auto border-0 bg-emerald-700 px-4 font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:bg-code disabled:text-disabled';
```
bằng:
```ts
/** Teal call to action, a pill (v6 §2.1): --on-accent on --accent = 5.5:1 light, 8.9:1 dark. */
export const BTN_GO = 'rounded-full border-0 bg-accent font-bold text-on-accent shadow-sm hover:brightness-110';
/** Green Submit (L17): white on emerald-700 = 5.5:1 (the mockup's emerald-600 is 3.8:1). */
export const BTN_SUBMIT = 'ml-auto rounded-full border-0 bg-emerald-700 px-4 font-bold text-white shadow-sm hover:bg-emerald-800 disabled:bg-code disabled:text-disabled';
```
Thay:
```ts
export const CARD_ACTION = 'rounded-2xl bg-panel ring-1 ring-line transition hover:-translate-y-0.5 hover:bg-panel hover:shadow-md hover:ring-2 hover:ring-accent focus-visible:ring-2 focus-visible:ring-accent';
```
bằng:
```ts
export const CARD_ACTION = 'rounded-(--r-card) bg-panel ring-1 ring-line transition hover:-translate-y-0.5 hover:bg-panel hover:shadow-md hover:ring-2 hover:ring-accent focus-visible:ring-2 focus-visible:ring-accent';
```

**Sửa `src/ui/tabs.ts`** — thay:
```ts
/** Underline colour on the open tab (aria-selected): blue-700 on white 6.7:1, blue-300 on the dark panel 9:1. */
const TAB = 'rounded-t-lg rounded-b-none border-x-0 border-t-0 border-b-2 border-transparent bg-transparent px-3 py-1.5 text-muted hover:bg-code aria-selected:border-blue-600 aria-selected:font-semibold aria-selected:text-blue-700 dark:aria-selected:border-blue-400 dark:aria-selected:text-blue-300';
```
bằng:
```ts
/** Open tab (aria-selected): --text with a --accent underline, so the state is not colour alone (L23). */
const TAB = 'rounded-t-lg rounded-b-none border-x-0 border-t-0 border-b-2 border-transparent bg-transparent px-3 py-1.5 text-muted hover:bg-code aria-selected:border-accent aria-selected:font-bold aria-selected:text-ink';
```

**Sửa `src/ui/homeView.ts`** — thay:
```ts
      progress(percent(m.done, m.total), label, 'h-2.5 flex-1 bg-code', 'bg-linear-to-r from-blue-600 to-cyan-500'),
```
bằng:
```ts
      progress(percent(m.done, m.total), label, 'h-2.5 flex-1 bg-code', 'bg-accent'),
```

- [ ] **Step 5: Ngân sách (V1, V2) và kiểm deploy**

**Sửa `scripts/check-budget.mjs`** — thay:
```js
  ['main', /^index-.*\.js$/, 270], // Plan 3 Task 1: ticket markdown moved to a lazy chunk (L41); was 300 after Plan 2
```
bằng:
```js
  ['main', /^index-.*\.js$/, 290], // Plan 7 V1 (needs the user's OK): 268 after Plan 6; routes, sidebar, onboarding and ~90 VI strings. Was 270 (L55)
```
Thay:
```js
  ['rest', /./, 1560],
```
bằng:
```js
  ['fonts', /\.woff2$/, 60], // Plan 7 V2: Nunito variable, latin 39 KB + vietnamese 13 KB (woff2 is already compressed)
  ['rest', /./, 1560],
```

**Sửa `scripts/check-deploy.sh`** — thay:
```bash
for f in $MAIN "assets/$WORKER" "assets/$TICKETS" "assets/$LANES" "assets/$EN" "assets/$LESSONS" $(printf 'assets/%s ' $FILES $LIBWASM); do
```
bằng:
```bash
# Plan 7: the stylesheet and the two Nunito files it points at.
CSS=$(get "" | grep -oE 'assets/index-[A-Za-z0-9_-]+\.css' | head -1)
FONTS=$([ -n "$CSS" ] && get "$CSS" | grep -oE 'nunito-[a-z]+-wght-normal-[A-Za-z0-9_-]+\.woff2' | sort -u)
[ -n "$FONTS" ] || { echo "FAIL ${CSS:-index-*.css} does not reference the Nunito woff2 files"; exit 1; }
for f in $MAIN $CSS "assets/$WORKER" "assets/$TICKETS" "assets/$LANES" "assets/$EN" "assets/$LESSONS" $(printf 'assets/%s ' $FILES $LIBWASM $FONTS); do
```

- [ ] **Step 6: Chạy, thấy qua**

Run: `npx vitest run tests/theme.test.ts && npx tsc --noEmit && npm test && npm run build && node scripts/check-budget.mjs && ls dist/assets | grep -c woff2`
Expected: PASS; `fonts` ≈ 51 KB / 60, `css` ≤ 20, `main` ≈ 268; đúng **2** file woff2 trong `dist/assets` (không có cyrillic/latin-ext).

- [ ] **Step 7: Edge**

1. Sáng và tối: nền kem / nâu đen ấm, nút chính xanh ngọc dạng viên thuốc, bấm thấy "lún" 2 px; thẻ bo 20 px; tab đang mở có gạch xanh ngọc.
2. DevTools → Network: chỉ tải `nunito-latin-…woff2` ở trang EN thuần; trang VI có dấu tải thêm `nunito-vietnamese-…woff2`; chữ "Ước tính", "Đường", "ư ơ ă đ" hiển thị bằng Nunito (DevTools → Computed → Rendered fonts).
3. Editor vẫn font mono; màu cú pháp đọc rõ trên nền mới (cả hai theme).
4. Thanh trên vẫn gradient (Task 6 mới đổi), chữ trắng đọc rõ.

- [ ] **Step 8: Commit**

```bash
git add src/style.css src/assets/fonts src/theme.ts src/ui/tabs.ts src/ui/homeView.ts scripts/check-budget.mjs scripts/check-deploy.sh tests/theme.test.ts
git commit -m "feat: warm v6 tokens, 20/14 px radii, pill main button, self-hosted Nunito (latin + vietnamese); contrast test; fonts budget group" -m "Claude-Session: https://claude.ai/code/session_01PwPSBV1SVDP6quEZfKN56M"
```

---
### Task 3: F2 · Linh vật Boon và Lily (sprite, `mascots.ts`), favicon, giấy phép, README

**Files:** `index.html`, `src/style.css`, `src/ui/mascots.ts` (tạo), `public/favicon.svg` (tạo), `LICENSE` (tạo), `assets/mascots/LICENSE` (tạo), `README.md` (tạo), `tests/mascots.test.ts` (tạo)

**Interfaces:**
- Consumes: `s()` (`src/ui/svg.ts`), `cx()` (`src/theme.ts`).
- Produces: `type Mascot = 'lily' | 'boon'`, `POSES`, `type Pose`, `mascot(who, pose, cls?, label?): SVGSVGElement` (`src/ui/mascots.ts`); sprite `#mascot-sprite` với 12 `<symbol id="<who>-<pose>">`; lớp `live` trên sprite bật vòng lặp idle (V4).

- [ ] **Step 1: Test hỏng trước**

**Tạo `tests/mascots.test.ts`:**
```ts
import { describe, expect, it } from 'vitest';
import html from '../index.html?raw';
import css from '../src/style.css?raw';
import { POSES } from '../src/ui/mascots';

const start = html.indexOf('<svg id="mascot-sprite"');
const sprite = html.slice(start, html.indexOf('</svg>', start));
const ids = new Set([...sprite.matchAll(/\bid="([\w-]+)"/g)].map((m) => m[1]));
const light = css.split(':root {')[1]?.split('}')[0] ?? '';

describe('linh vật (L57, product-design-v6 §1)', () => {
  it('sprite có 6 tư thế cho mỗi bạn: Lily (chó) và Boon (vịt)', () => {
    expect(start).toBeGreaterThan(0);
    const want = ['lily', 'boon'].flatMap((who) => POSES.map((p) => `${who}-${p}`));
    expect(want.filter((id) => !sprite.includes(`<symbol id="${id}" viewBox="0 0 120 120">`))).toEqual([]);
  });

  it('mọi href="#…" trong sprite trỏ tới một id có thật', () => {
    const refs = [...sprite.matchAll(/href="#([\w-]+)"/g)].map((m) => m[1]);
    expect(refs.length).toBeGreaterThan(20);
    expect(refs.filter((r) => !ids.has(r))).toEqual([]);
  });

  it('mọi màu var(--…) của sprite có trong :root (theme tối chỉ ghi đè một phần)', () => {
    const vars = new Set([...sprite.matchAll(/var\(--([\w-]+)\)/g)].map((m) => m[1]));
    expect([...vars].filter((v) => !light.includes(`--${v}:`))).toEqual([]);
  });

  it('không còn tên cũ của mockup (Bin, Mây) hay tên nhân vật có bản quyền', () => {
    expect(sprite).not.toMatch(/\bbin-|\bmay-|Mây|Snoopy|Donald|Duck/i);
  });

  it('sprite không display:none (animation không chạy trong cây bị ẩn), aria-hidden, đứng đầu <body>', () => {
    expect(sprite).toMatch(/^<svg id="mascot-sprite" class="absolute size-0 overflow-hidden" aria-hidden="true" focusable="false">/);
    expect(html.indexOf('<body>')).toBeLessThan(start);
    expect(html.slice(html.indexOf('<body>') + 6, start).trim().startsWith('<!--')).toBe(true);
  });
});
```

Run: `npx vitest run tests/mascots.test.ts`
Expected: FAIL (`src/ui/mascots` chưa có).

- [ ] **Step 2: Sprite trong `index.html`**

Nội dung dưới đây là khối `<defs>` của mockup v9 (dòng 87–137), chép nguyên văn rồi đổi `bin`→`lily`, `may`→`boon` (id, `href`, biến CSS) và `font-family="Nunito, sans-serif"` → `font-family="Nunito Variable, sans-serif"`; bỏ hai dòng chú thích. Lily là chó caramel (tai lệch, khăn xanh ngọc + sao), Boon là vịt xanh ngọc (kính tròn, chỏm ba lông, dây thẻ).

**Sửa `index.html`** — thay:
```html
  <body>
```
bằng:
```html
  <body>
    <!--
      L57 / product-design-v6 §1: Lily (dog, the player's buddy) and Boon (duck, the guide), six poses each, colours from
      --lily-* / --boon-* in style.css. Art: CC BY 4.0 (assets/mascots/LICENSE). Not display:none: CSS animations do not run
      there. The idle loops run only while this <svg> has class `live` (the welcome screen, Plan 7 V4).
    -->
    <svg id="mascot-sprite" class="absolute size-0 overflow-hidden" aria-hidden="true" focusable="false">
      <defs>
      <g id="lily-tail"><path class="tail" d="M82 94 q16 -4 16 -20 q0 -6 -4 -8" fill="none" stroke="var(--lily-fur)" stroke-width="8" stroke-linecap="round"/></g>
      <g id="lily-body">
        <ellipse cx="60" cy="92" rx="25" ry="21" fill="var(--lily-fur)"/>
        <ellipse cx="60" cy="97" rx="14" ry="12" fill="var(--lily-cream)"/>
        <ellipse cx="47" cy="111" rx="9" ry="5" fill="var(--lily-cream)"/>
        <ellipse cx="73" cy="111" rx="9" ry="5" fill="var(--lily-cream)"/>
      </g>
      <g id="lily-head">
        <path d="M38 34 q-16 2 -15 26 q2 6 9 4 q6 -10 8 -22 z" fill="var(--lily-ear)"/>
        <ellipse cx="60" cy="50" rx="27" ry="24" fill="var(--lily-fur)"/>
        <path d="M78 30 q10 -14 20 -6 q2 8 -8 12 q-6 2 -12 -6 z" fill="var(--lily-ear)"/>
        <path d="M66 28 q6 -6 10 2" fill="none" stroke="var(--lily-cream)" stroke-width="3" stroke-linecap="round"/>
        <ellipse cx="60" cy="61" rx="15" ry="11" fill="var(--lily-cream)"/>
        <ellipse cx="60" cy="55" rx="5.5" ry="4" fill="var(--lily-ink)"/>
        <circle cx="42" cy="58" r="3.5" fill="var(--cheek)" opacity=".55"/><circle cx="78" cy="58" r="3.5" fill="var(--cheek)" opacity=".55"/>
        <path d="M41 68 L79 68 L60 82 z" fill="var(--lily-scarf)"/>
        <path d="M66 73 l1.6 3.2 3.5 .5 -2.5 2.4 .6 3.5 -3.2 -1.7 -3.2 1.7 .6 -3.5 -2.5 -2.4 3.5 -.5z" fill="var(--lily-badge)"/>
      </g>
      <g id="lily-eyes-open" class="eyes"><circle cx="49" cy="46" r="3.6" fill="var(--lily-ink)"/><circle cx="71" cy="46" r="3.6" fill="var(--lily-ink)"/><circle cx="50.2" cy="44.8" r="1.1" fill="#fff"/><circle cx="72.2" cy="44.8" r="1.1" fill="#fff"/></g>
      <path id="lily-smile" d="M53 63 q7 6 14 0" fill="none" stroke="var(--lily-ink)" stroke-width="2.4" stroke-linecap="round"/>
      <g id="lily-paws"><ellipse cx="50" cy="90" rx="6" ry="7" fill="var(--lily-fur)" stroke="var(--lily-ear)" stroke-opacity=".25"/><ellipse cx="70" cy="90" rx="6" ry="7" fill="var(--lily-fur)" stroke="var(--lily-ear)" stroke-opacity=".25"/></g>
      
      <symbol id="lily-idle" viewBox="0 0 120 120"><use href="#lily-tail"/><g class="body-bob"><use href="#lily-body"/><use href="#lily-paws"/><use href="#lily-head"/><use href="#lily-eyes-open"/><use href="#lily-smile"/></g></symbol>
      <symbol id="lily-point" viewBox="0 0 120 120"><use href="#lily-tail"/><use href="#lily-body"/><ellipse cx="50" cy="90" rx="6" ry="7" fill="var(--lily-fur)"/><path d="M76 86 L102 70" stroke="var(--lily-fur)" stroke-width="10" stroke-linecap="round"/><circle cx="104" cy="68" r="6" fill="var(--lily-cream)"/><use href="#lily-head"/><g class="eyes"><circle cx="51" cy="46" r="3.6" fill="var(--lily-ink)"/><circle cx="73" cy="46" r="3.6" fill="var(--lily-ink)"/></g><use href="#lily-smile"/></symbol>
      <symbol id="lily-cheer" viewBox="0 0 120 120"><use href="#lily-tail"/><use href="#lily-body"/><path d="M42 84 L28 62 M78 84 L92 62" stroke="var(--lily-fur)" stroke-width="10" stroke-linecap="round"/><circle cx="27" cy="59" r="6" fill="var(--lily-cream)"/><circle cx="93" cy="59" r="6" fill="var(--lily-cream)"/><use href="#lily-head"/><path d="M45 47 q4 -5 8 0 M67 47 q4 -5 8 0" fill="none" stroke="var(--lily-ink)" stroke-width="2.6" stroke-linecap="round"/><path d="M52 62 q8 12 16 0 z" fill="var(--lily-ink)"/><path d="M56 66 q4 4 8 0 z" fill="#f08a8a"/><path d="M14 30 l3 6 6 3 -6 3 -3 6 -3 -6 -6 -3 6 -3z M104 22 l2 4 4 2 -4 2 -2 4 -2 -4 -4 -2 4 -2z" fill="var(--lily-badge)"/></symbol>
      <symbol id="lily-think" viewBox="0 0 120 120"><use href="#lily-tail"/><use href="#lily-body"/><ellipse cx="50" cy="90" rx="6" ry="7" fill="var(--lily-fur)"/><path d="M74 90 L68 72" stroke="var(--lily-fur)" stroke-width="10" stroke-linecap="round"/><circle cx="67" cy="70" r="6" fill="var(--lily-cream)"/><use href="#lily-head"/><g><circle cx="50" cy="43" r="3.4" fill="var(--lily-ink)"/><circle cx="72" cy="43" r="3.4" fill="var(--lily-ink)"/></g><path d="M55 64 h9" stroke="var(--lily-ink)" stroke-width="2.4" stroke-linecap="round"/><text x="94" y="22" font-size="22" font-weight="800" fill="var(--boon-wing)" font-family="Nunito Variable, sans-serif">?</text></symbol>
      <symbol id="lily-oops" viewBox="0 0 120 120"><use href="#lily-tail"/><use href="#lily-body"/><use href="#lily-paws"/><use href="#lily-head"/><path d="M45 43 l7 4 -7 4 M75 43 l-7 4 7 4" fill="none" stroke="var(--lily-ink)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M52 66 q2 -3 4 0 q2 3 4 0 q2 -3 4 0 q2 3 4 0" fill="none" stroke="var(--lily-ink)" stroke-width="2.2" stroke-linecap="round"/><path d="M92 34 q5 8 0 11 q-5 -3 0 -11z" fill="#6cc0e8"/></symbol>
      <symbol id="lily-sleep" viewBox="0 0 120 120"><path d="M92 104 q16 -2 12 -14" fill="none" stroke="var(--lily-fur)" stroke-width="8" stroke-linecap="round"/><ellipse cx="66" cy="100" rx="34" ry="14" fill="var(--lily-fur)"/><ellipse cx="46" cy="108" rx="12" ry="5" fill="var(--lily-cream)"/><path d="M20 76 q-12 4 -8 22 q8 2 10 -8 z" fill="var(--lily-ear)"/><ellipse cx="38" cy="86" rx="22" ry="18" fill="var(--lily-fur)"/><path d="M50 70 q8 -10 16 -4 q0 6 -8 8z" fill="var(--lily-ear)"/><ellipse cx="34" cy="94" rx="12" ry="8" fill="var(--lily-cream)"/><ellipse cx="30" cy="90" rx="4" ry="3" fill="var(--lily-ink)"/><path d="M34 82 q4 3 8 0 M46 82 q4 3 8 0" fill="none" stroke="var(--lily-ink)" stroke-width="2.2" stroke-linecap="round"/><g class="zz"><text x="70" y="62" font-size="16" font-weight="800" fill="var(--boon-wing)" font-family="Nunito Variable, sans-serif">z</text><text x="82" y="48" font-size="12" font-weight="800" fill="var(--boon-wing)" font-family="Nunito Variable, sans-serif">z</text></g></symbol>
      
      <g id="boon-feet"><ellipse cx="50" cy="112" rx="9" ry="4" fill="var(--boon-bill)"/><ellipse cx="70" cy="112" rx="9" ry="4" fill="var(--boon-bill)"/></g>
      <g id="boon-body"><ellipse cx="60" cy="88" rx="26" ry="24" fill="var(--boon-body)"/><ellipse cx="60" cy="94" rx="17" ry="16" fill="var(--boon-belly)"/></g>
      <g id="boon-head">
        <path d="M57 26 q-4 -12 4 -15 q0 7 1 14 M62 25 q3 -10 11 -9 q-4 5 -8 11 M55 27 q-8 -6 -12 0 q5 1 10 3" fill="var(--boon-wing)"/>
        <circle cx="60" cy="46" r="22" fill="var(--boon-body)"/>
        <path d="M47 62 L60 78 L73 62" fill="none" stroke="var(--boon-lanyard)" stroke-width="3" stroke-linejoin="round"/>
        <rect x="54" y="76" width="12" height="14" rx="2.5" fill="#fff" stroke="var(--boon-lanyard)" stroke-width="1.5"/><path d="M57 81 h6 M57 85 h4" stroke="var(--boon-wing)" stroke-width="1.6" stroke-linecap="round"/>
        <circle cx="44" cy="54" r="3" fill="var(--cheek)" opacity=".5"/><circle cx="76" cy="54" r="3" fill="var(--cheek)" opacity=".5"/>
      </g>
      <g id="boon-bill"><path d="M43 53 q17 -7 34 0 q-2 10 -17 10 q-15 0 -17 -10 z" fill="var(--boon-bill)"/><path d="M52 55 h3 M65 55 h3" stroke="var(--boon-ink)" stroke-width="1.6" stroke-linecap="round" opacity=".55"/></g>
      <g id="boon-glasses"><circle cx="51" cy="43" r="7.5" fill="#fff" fill-opacity=".35" stroke="var(--boon-ink)" stroke-width="2"/><circle cx="69" cy="43" r="7.5" fill="#fff" fill-opacity=".35" stroke="var(--boon-ink)" stroke-width="2"/><path d="M58.5 43 h3" stroke="var(--boon-ink)" stroke-width="2"/></g>
      <g id="boon-eyes" class="eyes"><circle cx="51" cy="44" r="2.6" fill="var(--boon-ink)"/><circle cx="69" cy="44" r="2.6" fill="var(--boon-ink)"/></g>
      <g id="boon-wings-down"><ellipse cx="36" cy="88" rx="8" ry="14" fill="var(--boon-wing)" transform="rotate(12 36 88)"/><ellipse cx="84" cy="88" rx="8" ry="14" fill="var(--boon-wing)" transform="rotate(-12 84 88)"/></g>
      
      <symbol id="boon-idle" viewBox="0 0 120 120"><g class="body-bob"><use href="#boon-feet"/><use href="#boon-body"/><use href="#boon-wings-down"/><rect x="66" y="86" width="20" height="14" rx="3" fill="var(--boon-ink)" transform="rotate(-10 76 93)"/><rect x="68" y="88" width="16" height="10" rx="2" fill="#bff0ea" transform="rotate(-10 76 93)"/><use href="#boon-head"/><use href="#boon-bill"/><use href="#boon-glasses"/><use href="#boon-eyes"/></g></symbol>
      <symbol id="boon-point" viewBox="0 0 120 120"><use href="#boon-feet"/><use href="#boon-body"/><ellipse cx="36" cy="88" rx="8" ry="14" fill="var(--boon-wing)" transform="rotate(12 36 88)"/><path d="M82 82 q10 -6 16 -14" stroke="var(--boon-wing)" stroke-width="11" stroke-linecap="round" fill="none"/><path d="M97 68 L114 44" stroke="var(--boon-lanyard)" stroke-width="3" stroke-linecap="round"/><circle cx="115" cy="42" r="3.5" fill="var(--lily-badge)"/><use href="#boon-head"/><use href="#boon-bill"/><use href="#boon-glasses"/><g class="eyes"><circle cx="53" cy="43" r="2.6" fill="var(--boon-ink)"/><circle cx="71" cy="43" r="2.6" fill="var(--boon-ink)"/></g></symbol>
      <symbol id="boon-cheer" viewBox="0 0 120 120"><use href="#boon-feet"/><use href="#boon-body"/><ellipse cx="30" cy="66" rx="8" ry="15" fill="var(--boon-wing)" transform="rotate(-35 30 66)"/><ellipse cx="90" cy="66" rx="8" ry="15" fill="var(--boon-wing)" transform="rotate(35 90 66)"/><use href="#boon-head"/><path d="M43 53 q17 -7 34 0 q-3 14 -17 14 q-14 0 -17 -14z" fill="var(--boon-bill)"/><path d="M52 58 q8 4 16 0" fill="none" stroke="var(--boon-ink)" stroke-width="1.6" opacity=".5"/><use href="#boon-glasses"/><path d="M48 44 q3 -3 6 0 M66 44 q3 -3 6 0" fill="none" stroke="var(--boon-ink)" stroke-width="2.2" stroke-linecap="round"/><path d="M12 24 h6 M15 21 v6 M100 14 h6 M103 11 v6" stroke="var(--lily-scarf)" stroke-width="2.6" stroke-linecap="round"/><circle cx="22" cy="40" r="2.5" fill="var(--lily-badge)"/><circle cx="104" cy="34" r="2.5" fill="var(--lily-fur)"/></symbol>
      <symbol id="boon-think" viewBox="0 0 120 120"><use href="#boon-feet"/><use href="#boon-body"/><ellipse cx="36" cy="88" rx="8" ry="14" fill="var(--boon-wing)" transform="rotate(12 36 88)"/><path d="M82 90 q-4 -14 -12 -26" stroke="var(--boon-wing)" stroke-width="11" stroke-linecap="round" fill="none"/><use href="#boon-head"/><use href="#boon-bill"/><use href="#boon-glasses"/><g><circle cx="52" cy="41" r="2.6" fill="var(--boon-ink)"/><circle cx="70" cy="41" r="2.6" fill="var(--boon-ink)"/></g><circle cx="92" cy="30" r="3" fill="var(--boon-wing)" opacity=".6"/><circle cx="100" cy="20" r="4.5" fill="var(--boon-wing)" opacity=".6"/><circle cx="110" cy="8" r="6" fill="var(--boon-wing)" opacity=".6"/></symbol>
      <symbol id="boon-oops" viewBox="0 0 120 120"><use href="#boon-feet"/><use href="#boon-body"/><ellipse cx="36" cy="88" rx="8" ry="14" fill="var(--boon-wing)" transform="rotate(12 36 88)"/><path d="M84 88 q-2 -14 -10 -26" stroke="var(--boon-wing)" stroke-width="11" stroke-linecap="round" fill="none"/><use href="#boon-head"/><use href="#boon-bill"/><g transform="rotate(-9 60 46) translate(0 3)"><use href="#boon-glasses"/></g><g><circle cx="51" cy="46" r="3.6" fill="none" stroke="var(--boon-ink)" stroke-width="1.8"/><circle cx="69" cy="47" r="3.6" fill="none" stroke="var(--boon-ink)" stroke-width="1.8"/><circle cx="51" cy="46" r="1.2" fill="var(--boon-ink)"/><circle cx="69" cy="47" r="1.2" fill="var(--boon-ink)"/></g><path d="M86 28 q5 8 0 11 q-5 -3 0 -11z" fill="#6cc0e8"/></symbol>
      <symbol id="boon-sleep" viewBox="0 0 120 120"><ellipse cx="60" cy="104" rx="34" ry="10" fill="var(--ground)"/><ellipse cx="60" cy="90" rx="30" ry="20" fill="var(--boon-body)"/><ellipse cx="74" cy="90" rx="16" ry="11" fill="var(--boon-wing)"/><circle cx="44" cy="76" r="17" fill="var(--boon-body)"/><path d="M42 61 q-3 -9 3 -11 q0 5 1 10" fill="var(--boon-wing)"/><path d="M24 81 q10 -4 19 0 q-2 7 -10 7 q-7 0 -9 -7z" fill="var(--boon-bill)"/><path d="M36 72 q3 3 6 0 M47 72 q3 3 6 0" fill="none" stroke="var(--boon-ink)" stroke-width="2" stroke-linecap="round"/><path d="M50 80 q6 4 10 -2" fill="none" stroke="var(--boon-lanyard)" stroke-width="2.5"/><g class="zz"><text x="66" y="58" font-size="16" font-weight="800" fill="var(--boon-wing)" font-family="Nunito Variable, sans-serif">z</text><text x="78" y="44" font-size="12" font-weight="800" fill="var(--boon-wing)" font-family="Nunito Variable, sans-serif">z</text></g></symbol>
      </defs>
    </svg>
```

- [ ] **Step 3: Màu và vòng lặp idle trong `src/style.css`**

**Sửa `src/style.css`** — thay:
```css
  --r-card: 20px; --r-ctl: 14px;
```
bằng:
```css
  --r-card: 20px; --r-ctl: 14px;
  /* Mascot palette (v6 §1.2–1.3): SVG only, never text. */
  --lily-fur: #d98e4a; --lily-cream: #f7e6cb; --lily-ear: #8a4b22; --lily-ink: #3a2618; --lily-scarf: #1f9e8f; --lily-badge: #ffd166;
  --boon-body: #7cc3cf; --boon-wing: #3f8f9e; --boon-belly: #e3f4f6; --boon-bill: #f2b544; --boon-ink: #2a2320; --boon-lanyard: #d98e4a;
  --cheek: #f4a3a3; --sky: #e6f4f6; --ground: #e9dcc6;
```
Thay:
```css
  --sun: #4a3a17; --sun-ink: #ffe2a3;
```
bằng:
```css
  --sun: #4a3a17; --sun-ink: #ffe2a3;
  --lily-fur: #d4914f; --lily-cream: #efdcbc; --lily-ear: #7a4220; --lily-ink: #22160e; --lily-scarf: #2bb3a3;
  --boon-body: #6fb3bf; --boon-wing: #3a8391; --boon-belly: #d6edf0; --boon-bill: #e9ad3e; --boon-ink: #1d1916;
  --sky: #1d2a2e; --ground: #3a3127;
```
Thay:
```css
@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; animation: none !important; scroll-behavior: auto !important; }
}
```
bằng:
```css
/* ---- Mascot idle loops (v6 §2.5): on the sprite's originals, so every <use> moves; only while #mascot-sprite.live (Plan 7 V4). ---- */
@media (prefers-reduced-motion: no-preference) {
  #mascot-sprite.live .tail { transform-box: fill-box; transform-origin: 0% 100%; animation: cq-wag 0.9s ease-in-out infinite; }
  #mascot-sprite.live .body-bob { animation: cq-bob 2.4s ease-in-out infinite; }
  #mascot-sprite.live .eyes { transform-box: fill-box; transform-origin: center; animation: cq-eyes 4s infinite; }
  #mascot-sprite.live .zz { animation: cq-floatz 2.2s ease-out infinite; }
}
@keyframes cq-wag { 0%, 100% { transform: rotate(0); } 50% { transform: rotate(16deg); } }
@keyframes cq-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
@keyframes cq-eyes { 0%, 92%, 100% { transform: scaleY(1); } 95% { transform: scaleY(0.1); } }
@keyframes cq-floatz { 0% { transform: translate(0, 0); opacity: 0; } 30% { opacity: 1; } 100% { transform: translate(8px, -14px); opacity: 0; } }
@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; animation: none !important; scroll-behavior: auto !important; }
}
```

- [ ] **Step 4: `src/ui/mascots.ts`**

**Tạo `src/ui/mascots.ts`:**
```ts
import { cx } from '../theme';
import { s } from './svg';

/** Lily (dog): the player's buddy, mirrors how the work goes. Boon (duck): the guide (tour, hints, error notes). L57, v6 §1. */
export type Mascot = 'lily' | 'boon';
/** One <symbol id="<mascot>-<pose>"> each in index.html's #mascot-sprite (tests/mascots.test.ts). New pose: a symbol there + a name here. */
export const POSES = ['idle', 'point', 'cheer', 'think', 'oops', 'sleep'] as const;
export type Pose = (typeof POSES)[number];

/**
 * A mascot from the sprite: a <use>, so no artwork is shipped in JS (Plan 7 V3). Decorative by default (aria-hidden: the words
 * sit next to it, v6 §1.4 rule 2); pass `label` only for a picture that stands alone (the welcome screen).
 * Sizes (rule 4): size-12 in a line, size-16 on a card, size-24 to size-28 beside a bubble.
 */
export function mascot(who: Mascot, pose: Pose, cls = 'size-12', label?: string): SVGSVGElement {
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': 'true', focusable: 'false' };
  return s('svg', { viewBox: '0 0 120 120', class: cx('shrink-0 overflow-visible', cls), ...a11y }, s('use', { href: `#${who}-${pose}` }));
}
```

- [ ] **Step 5: Favicon, giấy phép, README**

**Tạo `public/favicon.svg`** (Lily chờ, màu theme sáng viết thẳng: favicon không đọc được biến CSS của trang):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <!-- Lily (BoonData mascot), idle pose. Art: CC BY 4.0, see assets/mascots/LICENSE. -->
  <defs>
    <g id="lily-tail"><path d="M82 94 q16 -4 16 -20 q0 -6 -4 -8" fill="none" stroke="#d98e4a" stroke-width="8" stroke-linecap="round"/></g>
    <g id="lily-body">
      <ellipse cx="60" cy="92" rx="25" ry="21" fill="#d98e4a"/>
      <ellipse cx="60" cy="97" rx="14" ry="12" fill="#f7e6cb"/>
      <ellipse cx="47" cy="111" rx="9" ry="5" fill="#f7e6cb"/>
      <ellipse cx="73" cy="111" rx="9" ry="5" fill="#f7e6cb"/>
    </g>
    <g id="lily-head">
      <path d="M38 34 q-16 2 -15 26 q2 6 9 4 q6 -10 8 -22 z" fill="#8a4b22"/>
      <ellipse cx="60" cy="50" rx="27" ry="24" fill="#d98e4a"/>
      <path d="M78 30 q10 -14 20 -6 q2 8 -8 12 q-6 2 -12 -6 z" fill="#8a4b22"/>
      <path d="M66 28 q6 -6 10 2" fill="none" stroke="#f7e6cb" stroke-width="3" stroke-linecap="round"/>
      <ellipse cx="60" cy="61" rx="15" ry="11" fill="#f7e6cb"/>
      <ellipse cx="60" cy="55" rx="5.5" ry="4" fill="#3a2618"/>
      <circle cx="42" cy="58" r="3.5" fill="#f4a3a3" opacity=".55"/><circle cx="78" cy="58" r="3.5" fill="#f4a3a3" opacity=".55"/>
      <path d="M41 68 L79 68 L60 82 z" fill="#1f9e8f"/>
      <path d="M66 73 l1.6 3.2 3.5 .5 -2.5 2.4 .6 3.5 -3.2 -1.7 -3.2 1.7 .6 -3.5 -2.5 -2.4 3.5 -.5z" fill="#ffd166"/>
    </g>
    <g id="lily-eyes-open"><circle cx="49" cy="46" r="3.6" fill="#3a2618"/><circle cx="71" cy="46" r="3.6" fill="#3a2618"/><circle cx="50.2" cy="44.8" r="1.1" fill="#fff"/><circle cx="72.2" cy="44.8" r="1.1" fill="#fff"/></g>
    <path id="lily-smile" d="M53 63 q7 6 14 0" fill="none" stroke="#3a2618" stroke-width="2.4" stroke-linecap="round"/>
    <g id="lily-paws"><ellipse cx="50" cy="90" rx="6" ry="7" fill="#d98e4a" stroke="#8a4b22" stroke-opacity=".25"/><ellipse cx="70" cy="90" rx="6" ry="7" fill="#d98e4a" stroke="#8a4b22" stroke-opacity=".25"/></g>
    <symbol id="lily-idle" viewBox="0 0 120 120"><use href="#lily-tail"/><g><use href="#lily-body"/><use href="#lily-paws"/><use href="#lily-head"/><use href="#lily-eyes-open"/><use href="#lily-smile"/></g></symbol>
  </defs>
  <use href="#lily-idle"/>
</svg>
```

**Tạo `LICENSE`:**
```text
MIT License

Copyright (c) 2026 KhoaDauTay

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---
Not covered by this license:
- The Boon and Lily mascot artwork: CC BY 4.0, see assets/mascots/LICENSE.
- The Nunito font files in src/assets/fonts/: SIL Open Font License 1.1, see src/assets/fonts/OFL.txt.
```

**Tạo `assets/mascots/LICENSE`:**
```text
Boon and Lily, the BoonData mascots
Copyright (c) 2026 KhoaDauTay

The mascot artwork is licensed under the Creative Commons Attribution 4.0 International License (CC BY 4.0).
To view a copy of this license, visit https://creativecommons.org/licenses/by/4.0/

It covers:
- the <svg id="mascot-sprite"> block in index.html (Boon the duck and Lily the dog, six poses each);
- public/favicon.svg.

Attribution: "Boon and Lily by KhoaDauTay (BoonData), CC BY 4.0", and say if you changed them.
Boon and Lily are original characters. Do not present them as, or combine them with, characters owned by others.
```

**Tạo `README.md`** (khối dưới dùng `~~~` làm rào ngoài vì README có khối ```` ``` ```` bên trong):
~~~markdown
# BoonData

Học SQL và phân tích dữ liệu bằng việc thật, ngay trong trình duyệt.
*Learn SQL and data analysis through real work, right in your browser.*

- **Logistics:** bạn là Data Analyst mới ở công ty hư cấu Cargo Query Logistics (Đà Nẵng). Đồng nghiệp gửi câu hỏi nghiệp vụ, bạn trả lời bằng SQL, qua 12 chương từ thực tập sinh tới trưởng nhóm. Finance và E-commerce: sắp có.
- **Boon** (chú vịt) dẫn đường: tour, gợi ý, giải thích lỗi. **Lily** (chú chó) học cùng bạn.
- PostgreSQL thật chạy trong trình duyệt (PGlite), không có máy chủ; tiến độ lưu trong trình duyệt của bạn.

Bản chạy: https://khoadautay.github.io/data-training-platform/

## Phát triển

```bash
npm ci
npm run dev      # Vite
npm test         # Vitest
npm run build    # typecheck + build, rồi: node scripts/check-budget.mjs
```

Hướng dẫn cho người đóng góp và agent: `CLAUDE.md`. Triển khai: `docs/ops/deploy.md`.

## Giấy phép

- Code: MIT (`LICENSE`).
- Hình Boon và Lily: CC BY 4.0 (`assets/mascots/LICENSE`).
- Font Nunito: SIL Open Font License 1.1 (`src/assets/fonts/OFL.txt`).
~~~

- [ ] **Step 6: Chạy, thấy qua**

Run: `npx vitest run tests/mascots.test.ts tests/theme.test.ts tests/i18n.test.ts tests/prefs.test.ts && npx tsc --noEmit && npm run build && node scripts/check-budget.mjs && ls dist/favicon.svg && gzip -c dist/index.html | wc -c`
Expected: PASS; `dist/favicon.svg` có; `index.html` gzip tăng ~2,3 KB (ngoài các nhóm ngân sách); `main` +< 0,2 KB.

- [ ] **Step 7: Edge (Console; chưa có chỗ nào dùng linh vật)**

Trong Console của trang dev:
```js
const { mascot } = await import('/src/ui/mascots.ts');
for (const w of ['lily', 'boon']) for (const p of ['idle', 'point', 'cheer', 'think', 'oops', 'sleep']) document.body.prepend(mascot(w, p, 'size-24'));
document.getElementById('mascot-sprite').classList.add('live');
```
1. 12 hình hiện đủ. Lily: chó caramel, một tai vểnh gập + một tai cụp, khăn xanh ngọc + sao. Boon: vịt xanh ngọc, kính tròn, chỏm ba lông, dây thẻ. Đổi theme: màu dịu hơn ở tối.
2. Có lớp `live`: đuôi Lily vẫy, thân nhấp nhô, chớp mắt, "z" bay. Bật "Emulate prefers-reduced-motion: reduce": mọi thứ đứng yên.
3. Tab trình duyệt có favicon Lily. Tải lại trang để dọn.

- [ ] **Step 8: Commit**

```bash
git add index.html src/style.css src/ui/mascots.ts public/favicon.svg LICENSE assets/mascots/LICENSE README.md tests/mascots.test.ts
git commit -m "feat: Boon (duck guide) and Lily (dog buddy) mascot sprite, six poses each, mascot() helper, favicon; MIT + CC BY 4.0 licences, README" -m "Claude-Session: https://claude.ai/code/session_01PwPSBV1SVDP6quEZfKN56M"
```

---

### Task 4: F2 · Brand BoonData (V12)

**Files:** `index.html`, `src/main.ts`, `src/i18n/vi.ts`, `src/i18n/en.ts`, `docs/ops/deploy.md`, `tests/i18n.test.ts`

**Interfaces:**
- Consumes: sprite `#lily-idle` (Task 3).
- Produces: `<title>BoonData</title>`, favicon link; tên file xuất `boondata-progress.json`.

- [ ] **Step 1: Test hỏng trước**

**Sửa `tests/i18n.test.ts`** — thay:
```ts
  it('EN không trùng y hệt VI, trừ SAME_OK', () => {
```
bằng:
```ts
  it('BoonData là tên sản phẩm; "Cargo Query" chỉ còn là công ty "Cargo Query Logistics" (L57, V12)', () => {
    const bad = [...Object.entries(vi), ...Object.entries(en)]
      .filter(([, v]) => typeof v === 'string' && /Cargo Query(?! Logistics)/.test(v))
      .map(([k]) => k);
    expect(bad).toEqual([]);
    expect(html).toMatch(/<title>BoonData<\/title>/);
    expect(html).not.toMatch(/>Cargo Query</);
  });

  it('EN không trùng y hệt VI, trừ SAME_OK', () => {
```

Run: `npx vitest run tests/i18n.test.ts`
Expected: FAIL: `brief.story`, `save.invalid`, `data.intro` (VI và EN), `<title>Cargo Query</title>`.

- [ ] **Step 2: Đổi tên**

**Sửa `index.html`** — thay:
```html
    <title>Cargo Query</title>
```
bằng:
```html
    <title>BoonData</title>
    <meta name="description" content="BoonData: học SQL và phân tích dữ liệu bằng việc thật, ngay trong trình duyệt. Learn SQL and data analysis through real work." />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
```
Thay:
```html
      <h1 class="order-1 m-0 flex shrink-0 items-center gap-2 text-lg font-bold"><span class="grid size-8 place-items-center rounded-lg bg-black/25 ring-1 ring-white/15"><span data-icon="anchor"></span></span><span class="max-lg:sr-only xl:max-[120rem]:sr-only">Cargo Query</span></h1>
```
bằng:
```html
      <h1 class="order-1 m-0 flex shrink-0 items-center gap-2 text-lg font-extrabold"><span class="grid size-9 place-items-center rounded-full bg-white/90"><svg class="size-8" viewBox="0 0 120 120" aria-hidden="true" focusable="false"><use href="#lily-idle"></use></svg></span><span class="max-lg:sr-only xl:max-[120rem]:sr-only">BoonData</span></h1>
```

**Sửa `src/main.ts`** — thay:
```ts
  h('a', { href: url, download: 'cargo-query-save.json' }).click();
```
bằng:
```ts
  h('a', { href: url, download: 'boondata-progress.json' }).click(); // Import reads any file name (V12)
```

**Sửa `src/i18n/vi.ts`** — ba dòng:
- `'brief.story': 'Tuần này ở Cargo Query',` → `'brief.story': 'Tuần này ở Cargo Query Logistics',`
- `'save.invalid': 'File không phải tiến độ Cargo Query hợp lệ.',` → `'save.invalid': 'File không phải tiến độ BoonData hợp lệ.',`
- `'data.intro': 'Các bảng của Cargo Query bạn đã được mở, cột và quan hệ giữa chúng.',` → `'data.intro': 'Các bảng của Cargo Query Logistics bạn đã được mở, cột và quan hệ giữa chúng.',`

**Sửa `src/i18n/en.ts`** — ba dòng:
- `'brief.story': 'This week at Cargo Query',` → `'brief.story': 'This week at Cargo Query Logistics',`
- `'save.invalid': 'This file is not a valid Cargo Query progress file.',` → `'save.invalid': 'This file is not a valid BoonData progress file.',`
- `'data.intro': 'The Cargo Query tables you have unlocked, their columns and how they link.',` → `'data.intro': 'The Cargo Query Logistics tables you have unlocked, their columns and how they link.',`

**Sửa `docs/ops/deploy.md`** — thay:
```markdown
# Deploy & vận hành — Cargo Query (bản DA)
```
bằng:
```markdown
# Deploy & vận hành — BoonData

> Tên sản phẩm là BoonData (L57). Repo, URL GitHub Pages, `package.json` `name` và mọi khóa localStorage `cargo-query*` giữ nguyên: đổi khóa làm người chơi mất tiến độ.
```

- [ ] **Step 3: Chạy, thấy qua**

Run: `npx vitest run tests/i18n.test.ts && npx tsc --noEmit && npm test && npm run build && node scripts/check-budget.mjs`
Expected: PASS; ngân sách không đổi.

- [ ] **Step 4: Edge**

1. Tab trình duyệt: "BoonData" + favicon Lily. Thanh trên: Lily trong vòng tròn trắng + chữ "BoonData" (từ 1024 px).
2. ⋯ → Xuất tiến độ: file `boondata-progress.json`. Nhập lại chính file đó và một file cũ `cargo-query-save.json`: cả hai được nhận.
3. Brief việc đầu chương: "Tuần này ở Cargo Query Logistics"; trang Dữ liệu: câu giới thiệu có "Cargo Query Logistics".

- [ ] **Step 5: Commit**

```bash
git add index.html src/main.ts src/i18n/vi.ts src/i18n/en.ts docs/ops/deploy.md tests/i18n.test.ts
git commit -m "feat: BoonData brand in title, top bar, favicon and export file; Cargo Query stays the fictional company (L57)" -m "Claude-Session: https://claude.ai/code/session_01PwPSBV1SVDP6quEZfKN56M"
```

---

### Task 5: v5 N1 · Route theo domain, alias, các trang đọc

**Files:** `src/domains.ts`, `src/route.ts` (ghi lại), `src/ui/router.ts`, `src/main.ts`, `src/ui/homeView.ts`, `src/ui/topbar.ts`, `src/ui/modes.ts`, `src/ui/dataView.ts`, `src/ui/icons.ts`, `index.html`, `src/i18n/vi.ts`, `src/i18n/en.ts`, `tests/route.test.ts` (ghi lại), `tests/i18n.test.ts`

**Interfaces:**
- Consumes: `GAME_SCHEMA` (Task 1), `mascot()` (Task 3), `hasLesson`/`openLesson` (`src/ui/lessonCard.ts`), `homeModel`, `learnedSkills` (`src/home.ts`), `laneInfo` (`src/ui/lanePanel.ts`), `actions.openLane/selectTicket`.
- Produces:
  - `src/domains.ts`: `type DomainId = 'logistics' | 'finance' | 'ecommerce'`, `interface Domain { id; live; icon: 'anchor' | 'percent' | 'box'; name: Key; desc: Key }`, `DOMAINS`.
  - `src/route.ts`: `ROUTES = ['home','learn','practice','overview','play','data','dashboard','map','soon']`, `Route`, `ROUTE_KEY` (không đổi), `hashOf`, `isRoute`, `inDomain(r)`, `domainHash(id)`, `canonicalHash(hash)`, `parseRoute`, `initialRoute`, `dataTableOf`, `learnModuleOf(hash): number | undefined`, `soonDomainOf(hash): DomainId | undefined`.
  - `src/ui/homeView.ts`: `type Page`, `HomeSection.pages: readonly Page[]`, `listRow()`, `bubble()`, `LIST`, `GROUP_TITLE`.
  - `src/ui/topbar.ts`: `NavItem` thêm `area: 'top' | 'domain'`, `icon: IconName`; `navItems(area)`.
  - Icon mới `home`.

- [ ] **Step 1: Test route (hỏng trước)**

**Ghi lại `tests/route.test.ts`:**
```ts
import { describe, expect, it } from 'vitest';
import {
  canonicalHash, dataTableOf, domainHash, hashOf, inDomain, initialRoute, isRoute, learnModuleOf, parseRoute, ROUTES, soonDomainOf,
} from '../src/route';

describe('route (v5 §B.3, Plan 7)', () => {
  it('parseRoute: không có hash → undefined (dùng route đã nhớ)', () => {
    expect(parseRoute('')).toBeUndefined();
  });

  it('trang chung: #/ Trang chủ, #/learn Lộ trình, #/practice Luyện SQL', () => {
    expect(parseRoute('#')).toBe('home');
    expect(parseRoute('#/')).toBe('home');
    expect(parseRoute('#/learn')).toBe('learn');
    expect(parseRoute('#/learn/sql/3')).toBe('learn');
    expect(parseRoute('#/practice')).toBe('practice');
  });

  it('trang của domain nằm dưới #/d/logistics', () => {
    expect(parseRoute('#/d/logistics')).toBe('overview');
    expect(parseRoute('#/d/logistics/')).toBe('overview');
    expect(parseRoute('#/d/logistics/play')).toBe('play');
    expect(parseRoute('#/d/logistics/play?x=1')).toBe('play');
    expect(parseRoute('#/d/logistics/data/ports')).toBe('data');
    expect(parseRoute('#/d/logistics/dashboard')).toBe('dashboard');
    expect(parseRoute('#/d/logistics/map')).toBe('map');
  });

  it('hash cũ chuyển tiếp mãi mãi, giữ phần đuôi', () => {
    expect(canonicalHash('#/play')).toBe('#/d/logistics/play');
    expect(canonicalHash('#play')).toBe('#/d/logistics/play');
    expect(canonicalHash('#/play?x=1')).toBe('#/d/logistics/play?x=1');
    expect(canonicalHash('#/data/ports')).toBe('#/d/logistics/data/ports');
    expect(canonicalHash('#/dashboard')).toBe('#/d/logistics/dashboard');
    expect(canonicalHash('#/dataX')).toBe('#/dataX');
    expect(canonicalHash('#/d/logistics/play')).toBe('#/d/logistics/play');
    expect(parseRoute('#/play')).toBe('play');
    expect(parseRoute('#/play/')).toBe('play');
    expect(parseRoute('#/data/ports')).toBe('data');
    expect(parseRoute('#/dashboard')).toBe('dashboard');
  });

  it('domain chưa làm là "Sắp có"; domain hay trang lạ về Trang chủ', () => {
    expect(parseRoute('#/d/finance')).toBe('soon');
    expect(parseRoute('#/d/finance/play')).toBe('soon');
    expect(parseRoute('#/d/ecommerce')).toBe('soon');
    expect(parseRoute('#/d/mars')).toBe('home');
    expect(parseRoute('#/d/logistics/nope')).toBe('home');
    expect(parseRoute('#/d/logistics/constructor')).toBe('home');
    expect(parseRoute('#/sandbox')).toBe('home');
    expect(parseRoute('#/PLAY')).toBe('home');
    expect(soonDomainOf('#/d/ecommerce/x')).toBe('ecommerce');
    expect(soonDomainOf('#/d/logistics')).toBeUndefined();
    expect(domainHash('finance')).toBe('#/d/finance');
  });

  it('hashOf ngược với parseRoute', () => {
    for (const r of ROUTES) expect(parseRoute(hashOf(r))).toBe(r);
  });

  it('initialRoute: hash thắng route đã nhớ; giá trị cũ vẫn hợp lệ; hỏng → home', () => {
    expect(initialRoute('#/', 'play')).toBe('home');
    expect(initialRoute('', 'play')).toBe('play');
    expect(initialRoute('', 'data')).toBe('data');
    expect(initialRoute('', 'junk')).toBe('home');
    expect(initialRoute('', undefined)).toBe('home');
    expect(isRoute('play')).toBe(true);
    expect(isRoute(42)).toBe(false);
  });

  it('ROUTES và inDomain', () => {
    expect(ROUTES).toEqual(['home', 'learn', 'practice', 'overview', 'play', 'data', 'dashboard', 'map', 'soon']);
    expect(ROUTES.filter(inDomain)).toEqual(['overview', 'play', 'data', 'dashboard', 'map', 'soon']);
  });

  it('dataTableOf: hash mới và cũ, chỉ nhận định danh', () => {
    expect(dataTableOf('#/d/logistics/data/ports')).toBe('ports');
    expect(dataTableOf('#/data/container_events')).toBe('container_events');
    expect(dataTableOf('#/d/logistics/data')).toBeUndefined();
    expect(dataTableOf('#/data/')).toBeUndefined();
    expect(dataTableOf('#/data/x;drop')).toBeUndefined();
    expect(dataTableOf('#/data/Ports')).toBeUndefined();
    expect(dataTableOf('#/play/ports')).toBeUndefined();
  });

  it('learnModuleOf: module 1–12 (một module mỗi chương, L27)', () => {
    expect(learnModuleOf('#/learn/sql/1')).toBe(1);
    expect(learnModuleOf('#/learn/sql/12')).toBe(12);
    expect(learnModuleOf('#/learn/sql/13')).toBeUndefined();
    expect(learnModuleOf('#/learn/sql/0')).toBeUndefined();
    expect(learnModuleOf('#/learn/sql/3x')).toBeUndefined();
    expect(learnModuleOf('#/learn')).toBeUndefined();
  });
});
```

Run: `npx vitest run tests/route.test.ts`
Expected: FAIL (`canonicalHash`, `inDomain`… chưa có).

- [ ] **Step 2: `src/domains.ts` và `src/route.ts`**

**Ghi lại `src/domains.ts`:**
```ts
import type { Key } from './i18n';

/**
 * Domains (product-design-v5 §B, v6 §4). Each domain owns one Postgres schema in the single PGlite DB; `public` stays empty.
 * Schema names come only from this file, never from player input. Imported by the worker: type-only imports, no UI code.
 */
export const GAME_SCHEMA = 'logistics';

export type DomainId = 'logistics' | 'finance' | 'ecommerce';
/** `icon` is a name from src/ui/icons.ts, kept as a literal here so the worker never pulls UI code. */
export interface Domain { id: DomainId; live: boolean; icon: 'anchor' | 'percent' | 'box'; name: Key; desc: Key }
/** v5 §B.2, D-N3: Finance and E-commerce show as "Coming soon" (a page, no date promised). Plan 8 adds schema and art per domain. */
export const DOMAINS: readonly Domain[] = [
  { id: 'logistics', live: true, icon: 'anchor', name: 'domain.logistics', desc: 'domain.logisticsDesc' },
  { id: 'finance', live: false, icon: 'percent', name: 'domain.finance', desc: 'domain.financeDesc' },
  { id: 'ecommerce', live: false, icon: 'box', name: 'domain.ecommerce', desc: 'domain.ecommerceDesc' },
];
```

**Ghi lại `src/route.ts`:**
```ts
import { DOMAINS, type DomainId } from './domains';

/**
 * Hash routes without a framework (product-design-v5 §B.3, v6 §3.3). Practice runs and the Sandbox stay session modes
 * inside 'play' (Plan 7 V5); every reading page (home, learn, practice, overview, map, soon) is drawn in <main id="home">.
 */
export const ROUTES = ['home', 'learn', 'practice', 'overview', 'play', 'data', 'dashboard', 'map', 'soon'] as const;
export type Route = (typeof ROUTES)[number];

/** Last route shown: a device convenience, never part of Save. Values saved before Plan 7 (home/play/data/dashboard) stay valid. */
export const ROUTE_KEY = 'cargo-query/route';

/** The only live domain for now (V6). */
const D = '#/d/logistics';
const HASH: Record<Route, string> = {
  home: '#/', learn: '#/learn', practice: '#/practice', overview: D, play: `${D}/play`, data: `${D}/data`,
  dashboard: `${D}/dashboard`, map: `${D}/map`, soon: '#/d/finance',
};
const DOMAIN_PAGE: Record<string, Route> = { '': 'overview', play: 'play', data: 'data', dashboard: 'dashboard', map: 'map' };

export const hashOf = (r: Route): string => HASH[r];
export const isRoute = (v: unknown): v is Route => ROUTES.includes(v as Route);
/** A domain's pages: the sidebar lists the domain's items and the top bar shows its chapter and rank (v6 §3.1). */
export const inDomain = (r: Route): boolean => r === 'overview' || r === 'play' || r === 'data' || r === 'dashboard' || r === 'map' || r === 'soon';
export const domainHash = (id: DomainId): string => `#/d/${id}`;

/** Hashes from before Plan 7 (#/play, #/data/<t>, #/dashboard) → the same page, tail kept. Kept forever (v5 §B.3). */
export function canonicalHash(hash: string): string {
  const m = /^#\/?(play|data|dashboard)(?=$|[/?])(.*)$/.exec(hash);
  return m ? `${D}/${m[1]}${m[2]}` : hash;
}

/** '' (no hash) → undefined, so the remembered route can be used; any unknown path falls back to home. */
export function parseRoute(hash: string): Route | undefined {
  if (hash === '') return undefined;
  const [a = '', b = '', c = ''] = canonicalHash(hash).replace(/^#\/?/, '').split('?')[0].split('/');
  if (a === '') return 'home';
  if (a === 'learn' || a === 'practice') return a;
  if (a !== 'd') return 'home';
  if (b === 'logistics') return Object.hasOwn(DOMAIN_PAGE, c) ? DOMAIN_PAGE[c] : 'home';
  return soonDomainOf(hash) ? 'soon' : 'home';
}

export function initialRoute(hash: string, saved: unknown): Route {
  return parseRoute(hash) ?? (isRoute(saved) ? saved : 'home');
}

/** `#/d/logistics/data/<table>` (or the old `#/data/<table>`) → the table (ui-ux-v4 §5); anything but a plain identifier is ignored. */
export function dataTableOf(hash: string): string | undefined {
  const m = /^#\/?d\/logistics\/data\/([^/?]*)/.exec(canonicalHash(hash));
  return m && /^[a-z_][a-z0-9_]*$/.test(m[1]) ? m[1] : undefined;
}

/** `#/learn/sql/<n>` → module n (1–12, one per chapter, L27); else undefined (the page opens the current chapter's module). */
export function learnModuleOf(hash: string): number | undefined {
  const n = Number(/^#\/?learn\/sql\/(\d{1,2})(?=$|[/?])/.exec(hash)?.[1]);
  return n >= 1 && n <= 12 ? n : undefined;
}

/** `#/d/<id>…` → the domain when it exists and is not live yet ("Coming soon", v5 §B.6). */
export function soonDomainOf(hash: string): DomainId | undefined {
  const id = /^#\/?d\/([a-z]+)(?=$|[/?])/.exec(hash)?.[1];
  return DOMAINS.find((d) => d.id === id && !d.live)?.id;
}
```

Run: `npx vitest run tests/route.test.ts && npx tsc --noEmit`
Expected: `route.test.ts` PASS; `tsc` báo lỗi ở `homeView.ts`/`topbar.ts`/`main.ts` (route mới chưa được dùng, `domain.*` chưa có trong i18n): sửa ở các bước sau.

- [ ] **Step 3: Router thay hash cũ tại chỗ**

**Sửa `src/ui/router.ts`** — thay:
```ts
import { hashOf, initialRoute, parseRoute, ROUTE_KEY, type Route } from '../route';
```
bằng:
```ts
import { canonicalHash, hashOf, initialRoute, parseRoute, ROUTE_KEY, type Route } from '../route';
```
Thay:
```ts
  const first = initialRoute(location.hash, readJson<unknown>(ROUTE_KEY));
  // No extra history entry for the redirect; a hash that already names the route keeps its tail (#/data/ports).
  if (parseRoute(location.hash) !== first) history.replaceState(history.state, '', hashOf(first));
  apply(first, true);
  window.addEventListener('hashchange', () => apply(parseRoute(location.hash) ?? 'home', false));
```
bằng:
```ts
  /** An old hash (#/play, #/data/<t>, #/dashboard: bookmarks, shared links) becomes the new one in place, no extra history entry. */
  const upgrade = (): void => {
    const c = canonicalHash(location.hash);
    if (c !== location.hash) history.replaceState(history.state, '', c);
  };
  upgrade();
  const first = initialRoute(location.hash, readJson<unknown>(ROUTE_KEY));
  // No extra history entry for the redirect; a hash that already names the route keeps its tail (#/d/logistics/data/ports).
  if (parseRoute(location.hash) !== first) history.replaceState(history.state, '', hashOf(first));
  apply(first, true);
  window.addEventListener('hashchange', () => {
    upgrade();
    apply(parseRoute(location.hash) ?? 'home', false);
  });
```

- [ ] **Step 4: Nav registry có `area` + `icon`; đăng ký mục mới**

**Sửa `src/ui/icons.ts`** — thay:
```ts
  anchor: `${CIRCLE(12, 5, 2)} M12 7v15 M5 12H2a10 10 0 0 0 20 0h-3 M8 10h8`,
```
bằng:
```ts
  anchor: `${CIRCLE(12, 5, 2)} M12 7v15 M5 12H2a10 10 0 0 0 20 0h-3 M8 10h8`,
  home: 'M3 11 12 4l9 7 M5 10v10h5v-6h4v6h5V10',
```

**Sửa `src/ui/topbar.ts`** — thay:
```ts
import { fillIcons, icon } from './icons';
```
bằng:
```ts
import { fillIcons, icon, type IconName } from './icons';
```
Thay:
```ts
/** A top-bar link. Plan 1c adds Practice / Sandbox here (and re-registers 'play' to be current only in story mode). */
export interface NavItem {
  id: string;
  order: number;
  label: Key;
  href: string;
  current(route: Route): boolean;
  /** Optional action instead of plain hash navigation (e.g. enter a mode, then go('play')). */
  onclick?: () => void;
}
const NAV: NavItem[] = [];
/** Same id replaces the old entry; kept sorted by order. */
export const registerNav = (item: NavItem): void => upsert(NAV, item);
registerNav({ id: 'home', order: 10, label: 'nav.home', href: hashOf('home'), current: (r) => r === 'home' });
registerNav({ id: 'play', order: 20, label: 'nav.play', href: hashOf('play'), current: (r) => r === 'play' });
// L49: six items (mobile: a 3×2 grid); Practice, Sandbox (ui/modes.ts) and Data (ui/dataView.ts) register their own.
registerNav({ id: 'dashboard', order: 60, label: 'nav.dashboard', href: hashOf('dashboard'), current: (r) => r === 'dashboard' });

function renderNav(): void {
  const route = currentRoute();
  byId('nav').replaceChildren(...NAV.map((n) => {
```
bằng:
```ts
/**
 * One navigation entry (v5 §B.2, v6 §3): `area` 'top' = level 1 (top bar, mobile bottom bar), 'domain' = the domain's pages
 * (sidebar, drawer). `icon` shows in the rail and the bottom bar.
 */
export interface NavItem {
  id: string;
  order: number;
  area: 'top' | 'domain';
  label: Key;
  icon: IconName;
  href: string;
  current(route: Route): boolean;
  /** Optional action instead of plain hash navigation (e.g. enter a mode, then go('play')). */
  onclick?: () => void;
}
const NAV: NavItem[] = [];
/** Same id replaces the old entry; kept sorted by order. */
export const registerNav = (item: NavItem): void => upsert(NAV, item);
export const navItems = (area: NavItem['area']): NavItem[] => NAV.filter((n) => n.area === area);
registerNav({ id: 'home', area: 'top', order: 10, label: 'nav.home', icon: 'home', href: hashOf('home'), current: (r) => r === 'home' });
registerNav({ id: 'learn', area: 'top', order: 20, label: 'nav.learn', icon: 'route', href: hashOf('learn'), current: (r) => r === 'learn' });
// Practice (top, order 30), Sandbox (domain, 30, ui/modes.ts) and Data (domain, 50, ui/dataView.ts) register their own.
registerNav({ id: 'overview', area: 'domain', order: 10, label: 'nav.overview', icon: 'anchor', href: hashOf('overview'), current: (r) => r === 'overview' || r === 'soon' });
registerNav({ id: 'play', area: 'domain', order: 20, label: 'nav.play', icon: 'code', href: hashOf('play'), current: (r) => r === 'play' });
registerNav({ id: 'dashboard', area: 'domain', order: 60, label: 'nav.dashboard', icon: 'chart', href: hashOf('dashboard'), current: (r) => r === 'dashboard' });
registerNav({ id: 'map', area: 'domain', order: 70, label: 'nav.map', icon: 'map', href: hashOf('map'), current: (r) => r === 'map' });

/** Until the sidebar (Task 6) the top bar lists both areas, so every page stays reachable. */
function renderNav(): void {
  const route = currentRoute();
  byId('nav').replaceChildren(...[...navItems('top'), ...navItems('domain')].map((n) => {
```

**Sửa `src/ui/modes.ts`** — thay toàn bộ khối ba lời gọi `registerNav({ … })` (từ dòng `// Same id replaces topbar.ts's 'play' entry` tới hết lời gọi có `id: 'sandbox'`) bằng:
```ts
// Same id replaces topbar.ts's 'play' entry: "Workspace" is current only in story mode (and on a lane task).
registerNav({
  id: 'play', area: 'domain', order: 20, label: 'nav.play', icon: 'code', href: hashOf('play'),
  current: (r) => r === 'play' && (isStory() || session.mode.kind === 'lane'),
  onclick: () => (isStory() ? go('play') : backToStory()),
});
// Plan 7 V5: "Practise SQL" is a hub page (#/practice); a run in the workspace still counts as being there.
registerNav({
  id: 'practice', area: 'top', order: 30, label: 'nav.practice', icon: 'repeat', href: hashOf('practice'),
  current: (r) => r === 'practice' || (r === 'play' && session.mode.kind === 'practice'),
});
registerNav({
  id: 'sandbox', area: 'domain', order: 30, label: 'nav.sandbox', icon: 'flask', href: hashOf('play'),
  current: (r) => r === 'play' && session.mode.kind === 'sandbox',
  onclick: () => (session.mode.kind === 'sandbox' ? go('play') : startSandbox()),
});
```
Xóa hàm `startAny()` (cả chú thích `/** Nav "Practice" (P6): … */` của nó): không còn ai gọi. Thay trong `startToday()`:
```ts
  go('home'); // already on Home: no hashchange, so redraw ourselves
```
bằng:
```ts
  go('practice'); // the hub explains what is due; already there: no hashchange, so redraw ourselves
```
Thay:
```ts
registerHomeSection({ id: 'review', order: 22, span: 'full', render: reviewCard });
registerHomeSection({ id: 'warmup', order: 21, span: 'full', render: warmupCard });
```
bằng:
```ts
registerHomeSection({ id: 'review', order: 22, span: 'full', pages: ['home', 'practice'], render: reviewCard });
registerHomeSection({ id: 'warmup', order: 21, span: 'full', pages: ['home', 'practice'], render: warmupCard });
```

**Sửa `src/ui/dataView.ts`** — thay:
```ts
registerNav({ id: 'data', order: 50, label: 'nav.data', href: hashOf('data'), current: (r) => r === 'data' });
```
bằng:
```ts
registerNav({ id: 'data', area: 'domain', order: 50, label: 'nav.data', icon: 'table', href: hashOf('data'), current: (r) => r === 'data' });
```

- [ ] **Step 5: Các trang đọc trong `src/ui/homeView.ts`**

**Sửa `src/ui/homeView.ts`** — thay khối import đầu file:
```ts
import { homeModel, KPIS, kpiTiles, LEVELS, type ChapterCard, type HomeModel, type SkillCard } from '../home';
import { getLang, t, type Key } from '../i18n';
import { CHAPTERS, chapterTitle, rankOf, SKILLS } from '../progress';
import { derive } from '../scene';
```
bằng:
```ts
import { DOMAINS, type Domain } from '../domains';
import { homeModel, KPIS, kpiTiles, learnedSkills, LEVELS, type ChapterCard, type HomeModel, type SkillCard } from '../home';
import { getLang, t, type Key } from '../i18n';
import { CHAPTERS, chapterTitle, rankOf, SKILLS, visibleTickets } from '../progress';
import { derive, ROUTES as LANES } from '../scene';
import { domainHash, learnModuleOf, soonDomainOf } from '../route';
import { hasLesson, openLesson } from './lessonCard';
import { laneInfo } from './lanePanel';
import { mascot } from './mascots';
import { currentRoute } from './router';
```
(`hashOf` đã được import từ `'../route'` ở dòng có sẵn: gộp hai dòng import `'../route'` làm một nếu muốn.)

Thay:
```ts
/** Width on >= lg screens (3-column grid); every section is full width below lg. */
export type Span = 'full' | 'wide' | 'narrow';
export interface HomeSection {
  id: string;
  order: number;
  span: Span;
```
bằng:
```ts
/** Width on >= lg screens (3-column grid, Overview only); every section is full width below lg and on the other pages. */
export type Span = 'full' | 'wide' | 'narrow';
/** Reading pages drawn in <main id="home"> (v5 §B.4–B.6, v6 §3.3): one per route except play, data and dashboard. */
export type Page = 'home' | 'learn' | 'practice' | 'overview' | 'map' | 'soon';
export interface HomeSection {
  id: string;
  order: number;
  span: Span;
  /** Pages this section appears on. */
  pages: readonly Page[];
```

Thay:
```ts
const openInbox = (): void => (byId('inbox-dialog') as HTMLDialogElement).showModal();
```
bằng:
```ts
const openInbox = (): void => (byId('inbox-dialog') as HTMLDialogElement).showModal();

/** v6 §3.4 airy list: one bordered card, thin lines between rows. */
export const LIST = cx(CARD, 'm-0 list-none divide-y divide-line overflow-hidden p-0');
/** Small-caps group title in --muted (v6 §3.4). */
export const GROUP_TITLE = 'mt-0 mb-3 text-xs font-bold tracking-wider text-muted uppercase';

/** One row = one thing (v6 §3.4): 40 px lead · bold title · at most one muted line · at most one action. */
export function listRow(r: { lead: Node; title: string; sub?: string; action?: Node | null; current?: boolean; id?: string }): HTMLLIElement {
  return h('li', {
    id: r.id ?? false,
    class: cx('flex items-center gap-4 border-l-4 px-5 py-4', r.current ? 'border-l-accent bg-accent-soft' : 'border-l-transparent'),
    'aria-current': r.current ? 'step' : false,
  },
    h('span', { class: 'grid size-10 shrink-0 place-items-center', 'aria-hidden': 'true' }, r.lead),
    h('span', { class: 'min-w-0 flex-1' }, h('b', { class: 'block' }, r.title), r.sub ? h('span', { class: 'block text-sm text-muted' }, r.sub) : null),
    r.action ?? null);
}

/** A mascot and its words (v6 §2.1): --sun-ink on --sun ≥ 8:1; the picture is decorative, the words carry the meaning. */
export function bubble(who: Node, text: string): HTMLElement {
  return h('div', { class: 'flex items-end gap-3' }, who,
    h('p', { class: 'm-0 rounded-(--r-card) rounded-bl-sm bg-sun px-4 py-3 font-semibold text-sun-ink' }, text));
}

const soonDomain = (): Domain => DOMAINS.find((d) => d.id === (soonDomainOf(location.hash) ?? 'finance'))!;
const OUTLINE_LINK = 'rounded-full px-4 py-2 font-bold whitespace-nowrap text-ink no-underline ring-1 ring-line hover:bg-code';
```

Thay:
```ts
registerHomeSection({ id: 'continue', order: 10, span: 'wide', render: continueCard });
registerHomeSection({ id: 'career', order: 20, span: 'narrow', render: careerCard });
registerHomeSection({ id: 'chapters', order: 30, span: 'full', render: chaptersSection });
registerHomeSection({ id: 'skills', order: 40, span: 'full', render: skillsSection });
registerHomeSection({ id: 'modes', order: 50, span: 'full', render: modesSection });
registerHomeSection({ id: 'harbor', order: 5, span: 'full', render: harborSection });
registerHomeSection({ id: 'routes', order: 25, span: 'full', render: routesSection });
registerHomeSection({ id: 'kpi', order: 35, span: 'full', render: kpiSection });

/** Redrawn by rerender() (language switch, progress). Pure DOM from homeModel(); keeps no state of its own. */
export function renderHome(host: HTMLElement): void {
  const m = homeModel(app.tickets, done(), CHAPTERS, SKILLS, homeHooks.levelOf);
  host.replaceChildren(
    h('h1', { id: 'home-title', tabindex: '-1', class: 'sr-only' }, t('nav.home')),
    h('div', { class: 'mx-auto grid max-w-6xl gap-5 px-4 py-6 lg:grid-cols-3' },
      ...nodes(...sections.map((s) => {
        const el = s.render(m);
        return el && h('div', { class: cx('min-w-0', SPAN[s.span]) }, el);
      }))));
}
```
bằng:
```ts
/** Platform Home (v5 §B.5): Lily and the tagline (v5 §A.3). */
function helloSection(): HTMLElement {
  return h('section', { class: 'flex items-center gap-4' }, mascot('lily', 'idle', 'size-16'),
    h('div', {}, h('p', { class: 'm-0 text-2xl font-extrabold' }, t('app.name')), h('p', { class: 'm-0 text-muted' }, t('home.tagline'))));
}

/** Platform Home (v5 §B.5 #3): Logistics with its chapter and rank, then the domains that are coming (D-N3). */
function domainsSection(m: HomeModel): HTMLElement {
  const lang = getLang();
  const rank = rankOf(app.tickets, done());
  return h('section', { 'aria-labelledby': 'domains-title' },
    h('h2', { id: 'domains-title', class: GROUP_TITLE }, t('home.domains')),
    h('ul', { class: LIST }, ...DOMAINS.map((d) => listRow({
      lead: icon(d.icon, 'size-6'),
      title: t(d.name),
      sub: d.live ? `${t('top.chapterShort', { n: m.chapter, total: CHAPTERS.length })} · ${rank.tier?.[lang] ?? t('career.intern')}` : t('home.status.soon'),
      action: h('a', { href: d.live ? hashOf('overview') : domainHash(d.id), class: d.live ? cx(BTN_GO, 'px-4 py-2 whitespace-nowrap no-underline') : OUTLINE_LINK },
        t(d.live ? 'home.enter' : 'home.peek')),
    }))));
}

/** Platform Home (v5 §B.5 #4): one line, the full list is on the learning path. */
function skillsTeaser(m: HomeModel): HTMLElement {
  return h('a', { href: hashOf('learn'), class: cx(CARD_ACTION, 'group flex items-center gap-3 p-4 text-ink no-underline') },
    h('span', { class: 'grid size-9 shrink-0 place-items-center rounded-full bg-code', 'aria-hidden': 'true' }, icon('route')),
    h('span', { class: 'min-w-0 flex-1 font-semibold' }, t('home.skillsTeaser', { n: m.learned, total: m.skills.length })),
    icon('arrowRight', 'size-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-accent'));
}

/**
 * Learning path (Plan 7 V6): module n = the skills of chapter n, each with its quick lesson when there is one, then the way into
 * Logistics. Boon names the next skill to learn (v6 §3.3).
 */
function moduleSection(m: HomeModel): HTMLElement {
  const lang = getLang();
  const d = done();
  const n = learnModuleOf(location.hash) ?? m.chapter;
  const card = m.chapters.find((c) => c.chapter === n) ?? m.chapters[0];
  const learned = learnedSkills(app.tickets, d);
  const own = app.tickets.filter((x) => x.chapter === card.chapter);
  const first = own.find((x) => !d.has(x.id)) ?? own[0];
  const reachable = !!first && visibleTickets(app.tickets, d).includes(first);
  const next = card.skills.find((s) => !learned.has(s.id));
  return h('section', { class: 'space-y-6', 'aria-labelledby': 'module-title' },
    h('h2', { id: 'module-title', class: 'm-0 text-xl font-bold' }, t('learn.module', { n: card.chapter, title: chapterTitle(card.chapter, lang) })),
    bubble(mascot('boon', 'point', 'size-20'), next ? t('learn.next', { skill: next.label[lang] }) : t('learn.allDone')),
    h('ul', { class: LIST }, ...card.skills.map((s, i) => listRow({
      lead: learned.has(s.id) ? icon('check', 'size-6 text-good') : h('b', { class: 'text-lg' }, String(i + 1)),
      title: s.label[lang],
      sub: s.when[lang],
      action: hasLesson(s.id) ? h('button', { type: 'button', class: 'rounded-full px-4 whitespace-nowrap', 'aria-haspopup': 'dialog', onclick: () => openLesson(s.id) }, t('nb.lesson')) : null,
    }))),
    reachable
      ? h('button', { type: 'button', class: cx(BTN_GO, 'px-4 py-2'), onclick: () => actions.selectTicket(first.id) }, t('learn.apply', { n: card.chapter }))
      : h('p', { class: 'm-0 text-muted' }, card.status === 'soon' ? t('home.soonHint') : t('home.lockedAfter', { n: card.chapter - 1 })),
    h('p', { class: 'm-0 text-sm text-muted' }, t('learn.advSoon')));
}

/** "Coming soon" page of a domain (v5 §B.6): what it is, which skills carry over, two ways out. No form, no date. */
function soonSection(): HTMLElement {
  const lang = getLang();
  const learned = learnedSkills(app.tickets, done());
  const have = SKILLS.filter((s) => learned.has(s.id));
  return h('section', { class: 'space-y-5' },
    bubble(mascot('boon', 'idle', 'size-20'), t(soonDomain().desc)),
    h('h2', { class: GROUP_TITLE }, t('soon.skills')),
    have.length ? h('p', { class: 'm-0' }, have.map((s) => s.label[lang]).join(' · ')) : h('p', { class: 'm-0 text-muted' }, t('soon.none')),
    h('div', { class: 'flex flex-wrap gap-3' },
      h('a', { href: hashOf('practice'), class: cx(BTN_GO, 'px-4 py-2 no-underline') }, t('soon.practice')),
      h('a', { href: hashOf('overview'), class: OUTLINE_LINK }, t('soon.back'))));
}

/** Map page (v6 D-L3): the lanes as a list beside the route map; each opens its brief in the map dialog. */
function lanesSection(): HTMLElement {
  const harbor = derive(app.tickets, done());
  return h('section', { 'aria-labelledby': 'lanes-title' },
    h('h2', { id: 'lanes-title', class: GROUP_TITLE }, t('map.lanesTitle')),
    h('ul', { class: LIST }, ...LANES.map((r) => listRow({
      lead: icon(harbor.open.has(r.port) ? 'route' : 'lock', 'size-6 text-muted'),
      title: r.name,
      sub: laneInfo(r, harbor),
      action: h('button', { type: 'button', class: 'rounded-full px-4 whitespace-nowrap', onclick: () => actions.openLane(r.port) }, t('map.openLane')),
    }))));
}

registerHomeSection({ id: 'hello', order: 1, span: 'full', pages: ['home'], render: helloSection });
registerHomeSection({ id: 'harbor', order: 5, span: 'full', pages: ['overview'], render: harborSection });
registerHomeSection({ id: 'continue', order: 10, span: 'wide', pages: ['home', 'overview'], render: continueCard });
registerHomeSection({ id: 'module', order: 10, span: 'full', pages: ['learn'], render: moduleSection });
registerHomeSection({ id: 'soon', order: 10, span: 'full', pages: ['soon'], render: soonSection });
registerHomeSection({ id: 'career', order: 20, span: 'narrow', pages: ['overview'], render: careerCard });
registerHomeSection({ id: 'routes', order: 25, span: 'full', pages: ['map'], render: routesSection });
registerHomeSection({ id: 'domains', order: 28, span: 'full', pages: ['home'], render: domainsSection });
registerHomeSection({ id: 'chapters', order: 30, span: 'full', pages: ['overview'], render: chaptersSection });
registerHomeSection({ id: 'lanes', order: 30, span: 'full', pages: ['map'], render: lanesSection });
registerHomeSection({ id: 'kpi', order: 35, span: 'full', pages: ['overview'], render: kpiSection });
registerHomeSection({ id: 'skills', order: 40, span: 'full', pages: ['practice'], render: skillsSection });
registerHomeSection({ id: 'skillsTeaser', order: 45, span: 'full', pages: ['home'], render: skillsTeaser });
registerHomeSection({ id: 'modes', order: 50, span: 'full', pages: ['overview'], render: modesSection });

const PAGE_TITLE: Record<Exclude<Page, 'soon'>, Key> = {
  home: 'nav.home', learn: 'nav.learn', practice: 'nav.practice', overview: 'nav.overview', map: 'nav.map',
};
const pageOf = (r: string): Page => (r === 'learn' || r === 'practice' || r === 'overview' || r === 'map' || r === 'soon' ? r : 'home');

/** Redrawn by rerender() (language switch, progress). Pure DOM from homeModel(); keeps no state of its own. */
export function renderHome(host: HTMLElement): void {
  const page = pageOf(currentRoute());
  const m = homeModel(app.tickets, done(), CHAPTERS, SKILLS, homeHooks.levelOf);
  const grid = page === 'overview'; // the harbour page keeps its 3-column grid; the others are one 880 px column (v6 §3.3)
  host.replaceChildren(
    h('h1', {
      id: 'home-title', tabindex: '-1',
      class: page === 'home' || page === 'overview' ? 'sr-only' : 'mx-auto mt-6 mb-0 max-w-[880px] px-4 text-2xl font-extrabold',
    }, page === 'soon' ? t('soon.title', { name: t(soonDomain().name) }) : t(PAGE_TITLE[page])),
    h('div', { class: grid ? 'mx-auto grid max-w-[1120px] gap-5 px-4 py-6 lg:grid-cols-3' : 'mx-auto grid max-w-[880px] gap-8 px-4 py-6' },
      ...nodes(...sections.filter((s) => s.pages.includes(page)).map((s) => {
        const el = s.render(m);
        return el && h('div', { class: cx('min-w-0', grid && SPAN[s.span]) }, el);
      }))));
}
```

Kiểm import của `homeView.ts` sau bước này: `BTN_GO`, `CARD`, `CARD_ACTION` đã có trong dòng import `'../theme'` (thêm cái còn thiếu); `actions` có trong import `'../state'`.

**Sửa `src/ui/notebook.ts`** nếu `registerMode`/`registerHomeSection` của nó gọi `registerHomeSection`: Run `grep -rn "registerHomeSection(" src` → mọi lời gọi phải có `pages:` (tsc báo thiếu nếu quên).

- [ ] **Step 6: `main.ts`: trang đọc dùng chung `<main id="home">`**

**Sửa `src/main.ts`** — thay:
```ts
let shownRoute: Route | undefined;
/** #/ = Home, #/play = workspace, #/data = Data page, #/dashboard. All stay mounted and only toggle `hidden`, so the editor is never recreated. */
function showRoute(r: Route, initial: boolean): void {
```
bằng:
```ts
let shownRoute: Route | undefined;
/** Reading pages share <main id="home"> (src/ui/homeView.ts draws the one the route names). */
const PAGE_ROUTES: ReadonlySet<Route> = new Set<Route>(['home', 'learn', 'practice', 'overview', 'map', 'soon']);
const TITLE_OF: Partial<Record<Route, string>> = { data: 'data-title', dashboard: 'dashboard-title', play: 'brief-title' };
/** Reading pages, #/d/logistics/play = workspace, …/data = Data page, …/dashboard. All stay mounted and only toggle `hidden`, so the editor is never recreated. */
function showRoute(r: Route, initial: boolean): void {
```
Thay:
```ts
  byId('home').hidden = r !== 'home';
  byId('data').hidden = r !== 'data';
  byId('dashboard').hidden = r !== 'dashboard';
  byId('shell').hidden = r !== 'play';
  if (r !== 'home') leftHome(); // Home marks containers added after this moment as "New"
  rerender(); // nav aria-current, Home numbers, Data page, dashboard
  if (!initial) byId({ home: 'home-title', data: 'data-title', dashboard: 'dashboard-title', play: 'brief-title' }[r]).focus();
```
bằng:
```ts
  byId('home').hidden = !PAGE_ROUTES.has(r);
  byId('data').hidden = r !== 'data';
  byId('dashboard').hidden = r !== 'dashboard';
  byId('shell').hidden = r !== 'play';
  if (r !== 'overview') leftHome(); // the harbour (Overview) marks containers added after this moment as "New"
  rerender(); // nav aria-current, page numbers, Data page, dashboard
  if (!initial) byId(TITLE_OF[r] ?? 'home-title').focus();
```

**Sửa `index.html`** — thay:
```html
    <main id="home" class="shell:min-h-0 shell:flex-1 shell:overflow-auto" data-i18n-aria="nav.home" aria-label="Trang chủ" hidden></main>
```
bằng:
```html
    <!-- Plan 7: every reading page (Home, Learning path, Practise SQL, Overview, Map, Coming soon); its <h1 id="home-title"> names it. -->
    <main id="home" class="shell:min-h-0 shell:flex-1 shell:overflow-auto" hidden></main>
```

- [ ] **Step 7: i18n**

**Sửa `src/i18n/vi.ts`** — thay `'nav.practice': 'Luyện tập',` bằng `'nav.practice': 'Luyện SQL',`; thay:
```ts
  'nav.dashboard': 'Bảng điều hành',
```
bằng:
```ts
  'nav.dashboard': 'Bảng điều hành',
  'app.name': 'BoonData',
  'home.tagline': 'Học SQL và phân tích dữ liệu bằng việc thật.',
  'nav.learn': 'Lộ trình',
  'nav.overview': 'Tổng quan',
  'nav.map': 'Bản đồ',
  'domain.logistics': 'Logistics',
  'domain.finance': 'Finance',
  'domain.ecommerce': 'E-commerce',
  'domain.logisticsDesc': 'Cargo Query Logistics, Đà Nẵng: 12 chương từ thực tập sinh tới trưởng nhóm.',
  'domain.financeDesc': 'Phân tích công nợ, dòng tiền và ngân sách cho một công ty hư cấu. Đang thiết kế.',
  'domain.ecommerceDesc': 'Đơn hàng, khách hàng và giao hàng của một cửa hàng trực tuyến hư cấu. Đang thiết kế.',
  'home.domains': 'Lĩnh vực',
  'home.enter': 'Vào làm',
  'home.peek': 'Xem',
  'home.skillsTeaser': 'Kỹ năng: đã học {n}/{total}. Xem lộ trình',
  'learn.module': 'Module {n} · {title}',
  'learn.next': 'Kỹ năng tiếp theo của bạn: {skill}. Đọc Bài học nhanh trước, rồi làm việc ở Logistics.',
  'learn.allDone': 'Bạn đã học hết kỹ năng của module này. Bấm Luyện SQL để ôn.',
  'learn.apply': 'Áp dụng ở Logistics, chương {n}',
  'learn.advSoon': 'DA nâng cao (cohort, funnel, RFM…): đợt sau.',
  'soon.title': '{name}: sắp có',
  'soon.skills': 'Kỹ năng bạn đã có sẽ dùng được ở đây',
  'soon.none': 'Chưa có kỹ năng nào. Bắt đầu ở Lộ trình hoặc Logistics.',
  'soon.practice': 'Luyện SQL trong lúc chờ',
  'soon.back': 'Về Logistics',
  'map.lanesTitle': 'Tuyến và bài tuyến',
  'map.openLane': 'Xem tuyến',
```

**Sửa `src/i18n/en.ts`** — thay `'nav.practice': 'Practice',` bằng `'nav.practice': 'Practise SQL',`; thay:
```ts
  'nav.dashboard': 'Dashboard',
```
bằng:
```ts
  'nav.dashboard': 'Dashboard',
  'app.name': 'BoonData',
  'home.tagline': 'Learn SQL and data analysis through real work.',
  'nav.learn': 'Learning path',
  'nav.overview': 'Overview',
  'nav.map': 'Map',
  'domain.logistics': 'Logistics',
  'domain.finance': 'Finance',
  'domain.ecommerce': 'E-commerce',
  'domain.logisticsDesc': 'Cargo Query Logistics, Da Nang: 12 chapters from intern to team lead.',
  'domain.financeDesc': 'Receivables, cash flow and budgets for a fictional company. In design.',
  'domain.ecommerceDesc': 'Orders, customers and deliveries of a fictional online shop. In design.',
  'home.domains': 'Domains',
  'home.enter': 'Go to work',
  'home.peek': 'Take a look',
  'home.skillsTeaser': 'Skills: {n}/{total} learned. See the learning path',
  'learn.module': 'Module {n} · {title}',
  'learn.next': 'Your next skill: {skill}. Read its quick lesson first, then do the task in Logistics.',
  'learn.allDone': 'You have learned every skill in this module. Open Practise SQL to review.',
  'learn.apply': 'Apply it in Logistics, chapter {n}',
  'learn.advSoon': 'Advanced DA (cohorts, funnels, RFM…): a later batch.',
  'soon.title': '{name}: coming soon',
  'soon.skills': 'Skills you already have will work here',
  'soon.none': 'No skills yet. Start with the learning path or Logistics.',
  'soon.practice': 'Practise SQL meanwhile',
  'soon.back': 'Back to Logistics',
  'map.lanesTitle': 'Lanes and lane tasks',
  'map.openLane': 'Open lane',
```

**Sửa `tests/i18n.test.ts`** — thay:
```ts
const SAME_OK = new Set<string>(['tab.explain', 'top.xp', 'nav.sandbox', 'top.chapterShort', 'nav.task']);
```
bằng:
```ts
// Plan 7: product, domain and module names read the same in both languages.
const SAME_OK = new Set<string>(['tab.explain', 'top.xp', 'nav.sandbox', 'top.chapterShort', 'nav.task',
  'app.name', 'domain.logistics', 'domain.finance', 'domain.ecommerce', 'learn.module']);
```

- [ ] **Step 8: Chạy, thấy qua**

Run: `npx tsc --noEmit && npm test && npm run build && node scripts/check-budget.mjs`
Expected: PASS; `main` tăng ~3–5 KB (ghi số).

- [ ] **Step 9: Edge**

1. Mở `#/play` (bookmark cũ): thanh địa chỉ thành `#/d/logistics/play`, Back không quay về `#/play`. Tương tự `#/data/ports` → `#/d/logistics/data/ports` (bảng ports được chọn), `#/dashboard`.
2. `#/`: Lily + "BoonData" + câu giới thiệu, thẻ "Tin nhắn mới" (việc tiếp theo), Ôn tập, Lĩnh vực (Logistics "Ch. n/12 · bậc nghề" + "Vào làm"; Finance, E-commerce "Sắp có" + "Xem"), một dòng kỹ năng dẫn tới Lộ trình.
3. `#/d/logistics`: cảnh cảng, tiếp tục, bậc nghề, 12 chương, KPI, chế độ khác (không còn bản đồ tuyến). `#/d/logistics/map`: bản đồ tuyến + danh sách tuyến; "Xem tuyến" mở hộp thoại bản đồ ở đúng tuyến.
4. `#/learn`: module của chương hiện tại; Boon chỉ + bong bóng kỹ năng tiếp theo; dòng kỹ năng có "Bài học nhanh" mở hộp thoại bài học (Esc đóng, focus về nút); "Áp dụng ở Logistics, chương n" mở việc đúng. `#/learn/sql/5` khi chương 5 còn khóa: dòng "Mở sau chương 4" thay nút.
5. `#/practice`: thẻ Ôn tập, khởi động chương (nếu có), lưới kỹ năng; bấm kỹ năng đã học → workspace ở chế độ luyện tập, nav "Luyện SQL" vẫn sáng.
6. `#/d/finance`: tiêu đề "Finance: sắp có", Boon chờ + mô tả, kỹ năng đã có, hai nút.
7. Thanh trên (tạm thời) liệt kê cả mục cấp 1 và mục domain; phím tắt Ctrl+Enter / Ctrl+Shift+Enter trong workspace vẫn chạy; trên Trang chủ thì không.

- [ ] **Step 10: Commit**

```bash
git add src/domains.ts src/route.ts src/ui/router.ts src/main.ts src/ui/homeView.ts src/ui/topbar.ts src/ui/modes.ts src/ui/dataView.ts src/ui/icons.ts index.html src/i18n/vi.ts src/i18n/en.ts tests/route.test.ts tests/i18n.test.ts
git commit -m "feat: domain routes under #/d/logistics with old hashes kept forever; platform Home, learning path, practise hub, overview, map and coming-soon pages (v5 N1)" -m "Claude-Session: https://claude.ai/code/session_01PwPSBV1SVDP6quEZfKN56M"
```

---

### Task 6: F3 · Thanh trên cấp 1, sidebar trái theo route, rail, ngăn kéo, thanh dưới mobile

**Files:** `index.html`, `src/style.css`, `src/theme.ts`, `src/ui/topbar.ts` (ghi lại), `src/ui/sidebar.ts` (tạo), `src/ui/dataView.ts`, `src/ui/icons.ts`, `src/main.ts`, `src/i18n/vi.ts`, `src/i18n/en.ts`, `tests/prefs.test.ts`

**Interfaces:**
- Consumes: `navItems`, `NavItem` (Task 5), `inDomain`, `learnModuleOf`, `DOMAINS`, `homeModel`, `reviewCount` (`src/session.ts`), `visibleTickets`.
- Produces:
  - `src/ui/sidebar.ts`: `SIDE_KEY = 'cargo-query/sidebar'`, `type SidePref = 'open' | 'rail'`, `parseSidePref(v): SidePref`, `initSidebar()`, `renderSidebar(route)`, `sideExtra(): HTMLElement | undefined`.
  - `src/ui/topbar.ts`: `navLink(n, route, cls, ...body)`; `#nav` chỉ mục `top`; `#bottom-nav`; `#domain-menu`.
  - DOM: `<div class="frame">` › `<nav id="side">` + `<div class="content">`; `<nav id="bottom-nav">`; `<dialog id="side-drawer">`; `<div id="domain-menu" popover>`; `body[data-route]`, `body[data-side]`.
  - Icon mới `menu`, `panelLeft`.

- [ ] **Step 1: Test pref (hỏng trước)**

**Sửa `tests/prefs.test.ts`** — thêm import `import { parseSidePref, SIDE_KEY } from '../src/ui/sidebar';` và một khối:
```ts
describe('sidebar (v6 §3.2)', () => {
  it('khóa không đổi; chỉ "rail" là thu gọn, còn lại (thiếu, rác) là mở', () => {
    expect(SIDE_KEY).toBe('cargo-query/sidebar');
    expect(parseSidePref('rail')).toBe('rail');
    expect(parseSidePref('open')).toBe('open');
    expect(parseSidePref(undefined)).toBe('open');
    expect(parseSidePref({ x: 1 })).toBe('open');
  });
});
```

Run: `npx vitest run tests/prefs.test.ts`
Expected: FAIL (`src/ui/sidebar` chưa có).

- [ ] **Step 2: Khung HTML**

**Sửa `index.html`:**

(a) Thay **toàn bộ** phần tử `<header class="topbar …">…</header>` cùng khối chú thích ngay trên nó (khối bắt đầu bằng `L42 / ui-ux-v3 §a: five groups`) bằng:
```html
    <!--
      Plan 7 (v6 §3.1): level-1 nav only (Home · Learning path · Practise SQL) + the domain switch; a domain's pages live in the
      left sidebar (#side). Below 1024 px: ☰ opens the drawer, #bottom-nav holds level 1, and button labels hide first.
    -->
    <header class="topbar flex flex-wrap items-center gap-x-2 gap-y-2 border-b border-line bg-panel px-3 py-2 lg:px-4">
      <button id="side-btn" type="button" class="grid size-11 shrink-0 place-items-center border-0 bg-transparent p-0 lg:hidden" aria-controls="side-drawer" aria-expanded="false" data-i18n-aria="side.open" aria-label="Mở điều hướng"><span data-icon="menu"></span></button>
      <a href="#/" class="flex shrink-0 items-center gap-2 text-ink no-underline" data-i18n-aria="app.homeLink" aria-label="BoonData, về Trang chủ"><svg class="size-9" viewBox="0 0 120 120" aria-hidden="true" focusable="false"><use href="#lily-idle"></use></svg><span class="text-lg font-extrabold tracking-tight max-sm:hidden">BoonData</span></a>
      <nav id="nav" class="flex shrink-0 gap-1 max-lg:hidden" data-i18n-aria="nav.label" aria-label="Điều hướng chính"></nav>
      <button id="domain-btn" type="button" popovertarget="domain-menu" class="flex shrink-0 items-center gap-1.5 rounded-full border-0 bg-code px-3 py-1.5 font-bold text-ink hover:bg-accent-soft" data-i18n-title="nav.domains" title="Chọn lĩnh vực"><span data-icon="anchor" data-icon-class="size-4"></span><span id="domain-label">Logistics</span><span data-icon="chevronRight" data-icon-class="size-3.5 rotate-90"></span></button>
      <div id="status" class="ml-auto flex shrink-0 items-center gap-2 text-sm">
        <span id="domain-status" class="flex items-center gap-2 max-md:hidden"><span id="chapter" class="flex min-w-0 items-center gap-1.5 whitespace-nowrap"></span><span class="flex items-center gap-1.5 whitespace-nowrap max-xl:hidden"><span data-icon="badge" data-icon-class="size-4"></span><span id="rank" class="font-semibold"></span></span></span>
        <span id="xp" class="flex items-center gap-1 whitespace-nowrap rounded-full bg-sun px-2.5 py-0.5 font-bold text-sun-ink"></span>
      </div>
      <div class="flex shrink-0 items-center gap-1.5">
        <button id="inbox-btn" type="button" data-i18n-title="top.inbox" class="relative flex shrink-0 items-center gap-1.5 rounded-full border-0 bg-code px-3 py-1.5 text-sm text-ink hover:bg-accent-soft"><span data-icon="inbox" data-icon-class="size-4"></span><span data-label class="max-xl:sr-only" data-i18n="top.inbox">Hộp thư</span><span data-badge class="absolute -top-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-rose-700 px-1 text-xs font-bold text-white ring-2 ring-panel" aria-hidden="true" hidden></span></button>
        <button id="review-btn" type="button" class="relative flex shrink-0 items-center gap-1.5 rounded-full border-0 bg-code px-3 py-1.5 text-sm text-ink hover:bg-accent-soft" hidden><span data-icon="repeat" data-icon-class="size-4"></span><span data-label class="max-xl:sr-only" data-i18n="top.review">Ôn tập</span><span data-badge class="absolute -top-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-rose-700 px-1 text-xs font-bold text-white ring-2 ring-panel" aria-hidden="true" hidden></span></button>
        <button id="notebook-btn" type="button" data-i18n-title="nb.open" class="relative flex shrink-0 items-center gap-1.5 rounded-full border-0 bg-code px-3 py-1.5 text-sm text-ink hover:bg-accent-soft" aria-controls="notebook-dialog" aria-expanded="false"><span data-icon="book" data-icon-class="size-4"></span><span data-label class="max-xl:sr-only" data-i18n="nb.open">Sổ tay</span></button>
      </div>
      <div class="flex shrink-0 items-center gap-1 rounded-full bg-code p-1">
        <div class="flex gap-0.5" role="group" data-i18n-aria="top.lang" aria-label="Ngôn ngữ">
          <button type="button" data-lang="vi" aria-pressed="true" class="rounded-full border-0 bg-transparent px-2 py-0.5 text-sm text-ink hover:bg-panel aria-pressed:bg-panel aria-pressed:font-bold aria-pressed:shadow-sm">VI</button>
          <button type="button" data-lang="en" aria-pressed="false" class="rounded-full border-0 bg-transparent px-2 py-0.5 text-sm text-ink hover:bg-panel aria-pressed:bg-panel aria-pressed:font-bold aria-pressed:shadow-sm">EN</button>
        </div>
        <span class="mx-1 h-5 w-px bg-line" aria-hidden="true"></span>
        <div class="flex gap-0.5" role="group" data-i18n-aria="top.theme" aria-label="Giao diện">
          <button type="button" data-theme-pref="light" aria-pressed="false" class="grid size-7 place-items-center rounded-full border-0 bg-transparent p-0 text-ink hover:bg-panel aria-pressed:bg-panel aria-pressed:shadow-sm" data-i18n-aria="theme.light" aria-label="Sáng"><span data-icon="sun" data-icon-class="size-4"></span></button>
          <button type="button" data-theme-pref="system" aria-pressed="true" class="grid size-7 place-items-center rounded-full border-0 bg-transparent p-0 text-ink hover:bg-panel aria-pressed:bg-panel aria-pressed:shadow-sm" data-i18n-aria="theme.system" aria-label="Theo hệ thống"><span data-icon="monitor" data-icon-class="size-4"></span></button>
          <button type="button" data-theme-pref="dark" aria-pressed="false" class="grid size-7 place-items-center rounded-full border-0 bg-transparent p-0 text-ink hover:bg-panel aria-pressed:bg-panel aria-pressed:shadow-sm" data-i18n-aria="theme.dark" aria-label="Tối"><span data-icon="moon" data-icon-class="size-4"></span></button>
        </div>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <span id="db-status" role="status" class="flex items-center gap-2 text-sm"></span>
        <button id="more-btn" type="button" popovertarget="more-menu" class="grid size-9 place-items-center rounded-full border-0 bg-code p-0 text-ink hover:bg-accent-soft" data-i18n-aria="top.more" aria-label="Thêm"><span data-icon="more"></span></button>
      </div>
    </header>
```
(Badge đổi `bg-rose-600` → `bg-rose-700`: chữ trắng chỉ trên -700 trở lên.)

(b) Thay:
```html
    <!-- ui-ux-v4 §2: task navigation (story mode only); the inner <nav> carries the label. -->
```
bằng:
```html
    <!-- Plan 7 (v6 §3.2): sidebar (filled by src/ui/sidebar.ts; width from CSS) beside everything below the top bar. -->
    <div class="frame">
      <nav id="side" class="border-r border-line bg-panel" data-i18n-aria="side.label" aria-label="Điều hướng trong khu vực"></nav>
      <div class="content">
    <!-- ui-ux-v4 §2: task navigation (story mode only); the inner <nav> carries the label. -->
```

(c) Thay:
```html
    </main>
    <dialog id="inbox-dialog" aria-labelledby="inbox-title">
```
bằng:
```html
    </main>
      </div>
    </div>
    <!-- v6 §3.2 below 1024 px: level 1 + the current domain (44 px+ targets); the drawer holds the domain's pages. -->
    <nav id="bottom-nav" class="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-panel lg:hidden" data-i18n-aria="nav.bottom" aria-label="Điều hướng nhanh"></nav>
    <dialog id="side-drawer" class="m-0 h-dvh max-h-none w-[290px] max-w-[85vw] rounded-none rounded-r-(--r-card) p-0" aria-labelledby="side-drawer-title"></dialog>
    <dialog id="inbox-dialog" aria-labelledby="inbox-title">
```

(d) Thay:
```html
    <div id="stage" class="pointer-events-none fixed inset-x-4 bottom-4 z-40 sm:left-auto sm:w-[560px] lg:w-[640px]" hidden>
```
bằng:
```html
    <div id="stage" class="pointer-events-none fixed inset-x-4 bottom-4 z-40 max-lg:bottom-18 sm:left-auto sm:w-[560px] lg:w-[640px]" hidden>
```

(e) Thay:
```html
    <input id="import-input" type="file" accept="application/json" hidden />
```
bằng:
```html
    <!-- v5 §B.2: domain switch; Finance and E-commerce open their "Coming soon" page (filled by src/ui/topbar.ts). -->
    <div id="domain-menu" popover class="m-0 min-w-64 rounded-(--r-card) border-0 bg-panel p-1 text-ink shadow-lg ring-1 ring-line [inset:3.5rem_auto_auto_1rem]"></div>
    <input id="import-input" type="file" accept="application/json" hidden />
```

- [ ] **Step 3: CSS khung + hằng class**

**Sửa `src/style.css`** — xóa dòng:
```css
  .topbar :focus-visible { outline-color: #fff; }
```
Thay:
```css
/* ---- Layout driven by splitter.ts (--col/--row): plain CSS on purpose (two media features + CSS variables). ---- */
```
bằng:
```css
/* ---- Frame and sidebar (v6 §3.2), driven by ui/sidebar.ts through body[data-route], body[data-side] and #side[data-overlay].
   Plain CSS on purpose: widths depend on route + pref + media, and the rail hides labels with a container query. ---- */
.frame { display: flex; }
.content { flex: 1; min-width: 0; display: flex; flex-direction: column; }
#side { display: none; }
.side-panel { display: flex; flex-direction: column; gap: 2px; padding: 12px 8px; }
@media (min-width: 1024px) {
  body:not([data-route=home]) #side { display: block; position: relative; flex: none; width: 64px; }
  .side-panel { position: sticky; top: 0; height: 100%; max-height: 100dvh; overflow-y: auto; container-type: inline-size; }
  #side[data-overlay] .side-panel { position: absolute; inset-block: 0; left: 0; z-index: 30; width: 256px; max-height: none; background: var(--panel); box-shadow: 0 12px 32px rgb(0 0 0 / 0.25); }
}
@media (min-width: 1280px) {
  body[data-side=open]:not([data-route=play]) #side { width: 256px; }
}
/* Rail (64 px): icons only; labels stay for screen readers (plus a title tooltip), the lists below go. */
@container (max-width: 120px) {
  .side-panel a, .side-panel button { position: relative; justify-content: center; padding-inline: 0; }
  .side-label { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  .side-extra, .side-group { display: none; }
}
@media (min-width: 1024px) and (min-height: 700px) {
  .frame { flex: 1; min-height: 0; }
}
@media (max-width: 1023.98px) {
  body { padding-bottom: 3.5rem; } /* the fixed bottom bar */
}

/* ---- Layout driven by splitter.ts (--col/--row): plain CSS on purpose (two media features + CSS variables). ---- */
```

**Sửa `src/theme.ts`** — thay:
```ts
/** Controls on the gradient top bar: darkening keeps white text >= 4.5:1 at the cyan end. */
export const TOP_BTN = 'border-0 bg-black/20 text-white ring-1 ring-white/40 hover:bg-black/30';
/**
 * Segmented nav (ui-ux-v3 §a): darkening overlays keep white text >= 4.5:1 over the cyan end of the gradient;
 * the current page is a white segment with blue-900 text (>= 7:1).
 */
export const NAV_LINK = 'rounded-lg px-2 py-1 xl:max-[120rem]:px-1.5 text-center whitespace-nowrap text-white no-underline hover:bg-black/30 aria-[current=page]:bg-white aria-[current=page]:font-semibold aria-[current=page]:text-blue-900 aria-[current=page]:hover:bg-white';
```
bằng:
```ts
/** Controls on the top bar (V17: --panel, no gradient): --text on --code. */
export const TOP_BTN = 'rounded-full border-0 bg-code text-ink hover:bg-accent-soft';
/** Level-1 nav (v6 §3.1): --muted on --panel 6.2:1; the current page is a --accent-soft pill with --text, so not colour alone (bold too). */
export const NAV_LINK = 'rounded-full px-3 py-1.5 font-bold whitespace-nowrap text-muted no-underline hover:bg-code hover:text-ink aria-[current=page]:bg-accent-soft aria-[current=page]:text-ink';
```

**Sửa `src/ui/icons.ts`** — thay:
```ts
  home: 'M3 11 12 4l9 7 M5 10v10h5v-6h4v6h5V10',
```
bằng:
```ts
  home: 'M3 11 12 4l9 7 M5 10v10h5v-6h4v6h5V10',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  panelLeft: 'M3 4h18v16H3z M9 4v16',
```

- [ ] **Step 4: `src/ui/topbar.ts`**

**Ghi lại `src/ui/topbar.ts`** (giữ nguyên `setActionButton`, `renderSettings`, `initTopbar`, `renderNotice` như HEAD; dưới đây là cả file):
```ts
import { DOMAINS } from '../domains';
import { getLang, t, type Key } from '../i18n';
import { chapterTitle, CHAPTERS, currentChapter, rankOf } from '../progress';
import { upsert } from '../registry';
import { domainHash, hashOf, inDomain, type Route } from '../route';
import { actions, app, done } from '../state';
import { getTheme, NAV_LINK, setTheme, THEME_PREFS, TOP_BTN, type ThemePref } from '../theme';
import { byId, h, nodes } from './dom';
import { fillIcons, icon, type IconName } from './icons';
import { currentRoute } from './router';

const mb = (bytes: number): number => Math.round(bytes / 1e5) / 10;

/**
 * One navigation entry (v5 §B.2, v6 §3): `area` 'top' = level 1 (top bar, mobile bottom bar), 'domain' = the domain's pages
 * (sidebar, drawer). `icon` shows in the rail and the bottom bar.
 */
export interface NavItem {
  id: string;
  order: number;
  area: 'top' | 'domain';
  label: Key;
  icon: IconName;
  href: string;
  current(route: Route): boolean;
  /** Optional action instead of plain hash navigation (e.g. enter a mode, then go('play')). */
  onclick?: () => void;
}
const NAV: NavItem[] = [];
/** Same id replaces the old entry; kept sorted by order. */
export const registerNav = (item: NavItem): void => upsert(NAV, item);
export const navItems = (area: NavItem['area']): NavItem[] => NAV.filter((n) => n.area === area);
registerNav({ id: 'home', area: 'top', order: 10, label: 'nav.home', icon: 'home', href: hashOf('home'), current: (r) => r === 'home' });
registerNav({ id: 'learn', area: 'top', order: 20, label: 'nav.learn', icon: 'route', href: hashOf('learn'), current: (r) => r === 'learn' });
// Practice (top, order 30), Sandbox (domain, 30, ui/modes.ts) and Data (domain, 50, ui/dataView.ts) register their own.
registerNav({ id: 'overview', area: 'domain', order: 10, label: 'nav.overview', icon: 'anchor', href: hashOf('overview'), current: (r) => r === 'overview' || r === 'soon' });
registerNav({ id: 'play', area: 'domain', order: 20, label: 'nav.play', icon: 'code', href: hashOf('play'), current: (r) => r === 'play' });
registerNav({ id: 'dashboard', area: 'domain', order: 60, label: 'nav.dashboard', icon: 'chart', href: hashOf('dashboard'), current: (r) => r === 'dashboard' });
registerNav({ id: 'map', area: 'domain', order: 70, label: 'nav.map', icon: 'map', href: hashOf('map'), current: (r) => r === 'map' });

/** Mobile bottom bar (v6 §3.2): 56 px targets; the current one is --accent on --panel (5.5:1) and keeps its label. */
const BOTTOM_LINK = 'flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-bold text-muted no-underline aria-[current=page]:text-accent';
const MENU_ITEM = 'flex w-full items-center gap-2 rounded-(--r-ctl) px-3 py-2 text-ink no-underline hover:bg-code';

/** A nav link (top bar, bottom bar, sidebar); an item with `onclick` does its own navigation. */
export function navLink(n: NavItem, route: Route, cls: string, ...body: (Node | string)[]): HTMLAnchorElement {
  const click = n.onclick;
  return h('a', {
    href: n.href, class: cls, 'data-nav': n.id,
    'aria-current': n.current(route) ? 'page' : false,
    onclick: click ? (e: Event) => { e.preventDefault(); click(); } : false,
  }, ...body);
}

function renderNav(): void {
  const route = currentRoute();
  const top = navItems('top');
  const live = DOMAINS.find((d) => d.live)!;
  byId('nav').replaceChildren(...top.map((n) => navLink(n, route, NAV_LINK, t(n.label))));
  byId('bottom-nav').replaceChildren(
    ...top.map((n) => navLink(n, route, BOTTOM_LINK, icon(n.icon, 'size-5'), h('span', {}, t(n.label)))),
    h('a', { href: hashOf('overview'), class: BOTTOM_LINK, 'aria-current': inDomain(route) ? 'page' : false },
      icon(live.icon, 'size-5'), h('span', {}, t(live.name))));
}

/** Domain switch (v5 §B.2, D-N3): Logistics with its chapter, then the "Coming soon" pages (no date promised). */
function renderDomainMenu(): void {
  const menu = byId('domain-menu');
  const ch = currentChapter(app.tickets, done());
  byId('domain-label').textContent = t(DOMAINS.find((d) => d.live)!.name);
  menu.replaceChildren(h('div', { class: 'flex flex-col' }, ...DOMAINS.map((d) => h('a', {
    href: d.live ? hashOf('overview') : domainHash(d.id), class: MENU_ITEM, onclick: () => menu.hidePopover?.(),
  },
    icon(d.icon, 'size-4'),
    h('span', { class: 'flex-1 font-bold' }, t(d.name)),
    h('span', { class: 'text-sm text-muted' }, d.live ? t('top.chapterShort', { n: ch, total: CHAPTERS.length }) : t('home.status.soon'))))));
}

/** Ready = a green dot (text for screen readers and on hover); loading and failure stay visible on the bar, never in the ⋯ menu. */
function dbStatusView(): Node {
  if (app.dbStatus === 'ready') {
    return h('span', { class: 'flex items-center', title: t('db.ready') },
      h('span', { class: 'size-2.5 rounded-full bg-emerald-600 ring-2 ring-emerald-600/25', 'aria-hidden': 'true' }),
      h('span', { class: 'sr-only' }, t('db.ready')));
  }
  if (app.dbStatus === 'failed') return h('button', { type: 'button', class: TOP_BTN, onclick: () => actions.retryDb() }, t('db.retry'));
  const p = app.loadProgress;
  const text = !p ? t('db.loading')
    : p.total && p.total >= p.loaded ? t('db.loadingBytes', { loaded: mb(p.loaded), total: mb(p.total) })
      : t('db.loadingMb', { loaded: mb(p.loaded) });
  return h('span', { class: 'rounded-full bg-code px-2.5 py-1 whitespace-nowrap' }, text);
}
```
rồi chép nguyên văn từ HEAD các hàm `setActionButton`, `THEME_LABEL` + `renderSettings`, `initTopbar` (thêm `fillIcons(byId('domain-menu'));` sau `fillIcons(byId('more-menu'));`), `renderNotice`, và kết thúc bằng:
```ts
export function renderTopbar(): void {
  const lang = getLang();
  const route = currentRoute();
  const ch = currentChapter(app.tickets, done());
  const total = CHAPTERS.length;
  const title = chapterTitle(ch, lang);
  const chapter = byId('chapter');
  chapter.title = t('top.chapter', { n: ch, total, title });
  chapter.replaceChildren(
    icon('map', 'size-4'),
    h('span', { class: 'font-semibold' }, t('top.chapterShort', { n: ch, total })));
  byId('domain-status').hidden = !inDomain(route); // chapter and rank belong to the domain (v5 §B.2)
  byId('rank').textContent = rankOf(app.tickets, done()).tier?.[lang] ?? t('career.intern');
  byId('xp').replaceChildren(icon('star', 'size-4'), t('top.xp', { n: app.save.xp }));
  renderSettings();
  byId('db-status').replaceChildren(...nodes(
    dbStatusView(),
    app.problem ? h('button', { type: 'button', class: TOP_BTN, onclick: () => actions.copyDiagnostics() }, t('diag.copy')) : null));
  renderNav();
  renderDomainMenu();
  renderNotice();
}
```
(`cx` không còn dùng trong file này: bỏ khỏi import nếu `renderNotice` ở HEAD không dùng.)

- [ ] **Step 5: `src/ui/sidebar.ts`**

**Tạo `src/ui/sidebar.ts`:**
```ts
import { DOMAINS } from '../domains';
import { homeModel, type ChapterStatus } from '../home';
import { getLang, t, type Key } from '../i18n';
import { CHAPTERS, chapterTitle, currentChapter, rankOf, SKILLS, visibleTickets } from '../progress';
import { domainHash, hashOf, inDomain, learnModuleOf, type Route } from '../route';
import { isStory, reviewCount } from '../session';
import { actions, app, done } from '../state';
import { readJson, writeJson } from '../storage';
import { cx } from '../theme';
import { textOf } from '../tickets';
import { byId, h, nodes } from './dom';
import { icon } from './icons';
import { navItems } from './topbar';

/** Device pref (v6 §3.2): the sidebar on wide reading pages. Never in the Save. */
export const SIDE_KEY = 'cargo-query/sidebar';
export type SidePref = 'open' | 'rail';
/** Anything but 'rail' (missing, junk, unreadable storage) is the default: open. */
export const parseSidePref = (v: unknown): SidePref => (v === 'rail' ? 'rail' : 'open');

/** The current page: a 4 px --accent bar + --accent-soft background, not colour alone (v6 §3.1). */
const SIDE_LINK = 'flex w-full items-center gap-3 rounded-(--r-ctl) border-0 border-l-4 border-transparent bg-transparent px-3 py-2 text-left font-bold text-ink no-underline hover:bg-code aria-[current=page]:border-accent aria-[current=page]:bg-accent-soft aria-disabled:text-muted';
const GROUP = 'side-group mt-4 mb-1 px-3 text-xs font-bold tracking-wider text-muted uppercase';
const STATUS: Record<ChapterStatus, Key> = { done: 'home.status.done', current: 'home.status.current', locked: 'home.status.locked', soon: 'home.status.soon' };
const WIDE = '(min-width: 1024px)';
const XL = '(min-width: 1280px)';
const mq = (q: string): boolean => typeof matchMedia === 'function' && matchMedia(q).matches;

/** The rail's overlay (v6 §3.2: opens over the page, never resizes the splitter frame). In memory only; a new page closes it. */
let overlay = false;
let lastRoute: Route = 'home';
let extra: HTMLElement | undefined;

/**
 * Where the Data page puts its table list (V11): the sidebar from 1024 px, else undefined (the page keeps it). One node for the
 * page's lifetime, so a redraw moves it instead of rebuilding it (the search box keeps focus and IME state).
 */
export function sideExtra(): HTMLElement | undefined {
  return mq(WIDE) ? (extra ??= h('div', { class: 'side-extra mt-2 px-1' })) : undefined;
}

interface Row { key: string; href: string; lead: Node; label: string; sub?: string; current: boolean; lock?: string; onclick?: () => void }

/** One sidebar line. `lock` (v4 D-O3): shown, with a lock and the reason, never followed. */
function row(r: Row): HTMLElement {
  const click = r.onclick;
  return h('a', {
    href: r.href, 'data-side': r.key, class: SIDE_LINK, title: r.lock ?? r.label,
    'aria-current': r.current ? 'page' : false,
    'aria-disabled': r.lock ? 'true' : false,
    onclick: r.lock ? (e: Event) => e.preventDefault() : click ? (e: Event) => { e.preventDefault(); click(); } : false,
  },
    h('span', { class: 'grid size-6 shrink-0 place-items-center', 'aria-hidden': 'true' }, r.lead),
    h('span', { class: 'side-label min-w-0 flex-1' },
      h('span', { class: 'block truncate' }, r.label),
      r.sub || r.lock ? h('span', { class: 'block truncate text-xs font-semibold text-muted' }, r.lock ?? r.sub) : null),
    r.lock ? icon('lock', 'side-label size-3.5 text-muted') : null);
}

/** Learning path (v6 §3.3): the 12 SQL modules, one per chapter, with their state. */
function modules(): HTMLElement[] {
  const lang = getLang();
  const m = homeModel(app.tickets, done(), CHAPTERS, SKILLS);
  const open = learnModuleOf(location.hash) ?? m.chapter;
  return m.chapters.map((c) => row({
    key: `m${c.chapter}`,
    href: `${hashOf('learn')}/sql/${c.chapter}`,
    lead: c.status === 'done' ? icon('check', 'size-5 text-good') : c.status === 'current' ? h('b', {}, String(c.chapter)) : icon('lock', 'size-4 text-muted'),
    label: `${c.chapter} · ${chapterTitle(c.chapter, lang)}`,
    sub: t(STATUS[c.status], { done: c.done, total: c.total }),
    current: c.chapter === open,
  }));
}

/** Domain header: name, chapter and rank (v6 §3.1: they moved off the top bar's left). */
function domainHead(): HTMLElement {
  const lang = getLang();
  const live = DOMAINS.find((d) => d.live)!;
  const ch = currentChapter(app.tickets, done());
  return h('div', { class: 'flex items-center gap-3 px-3 py-2' },
    h('span', { class: 'grid size-6 shrink-0 place-items-center', 'aria-hidden': 'true' }, icon(live.icon)),
    h('span', { class: 'side-label min-w-0' },
      h('b', { class: 'block' }, t(live.name)),
      h('span', { class: 'block truncate text-xs font-semibold text-muted' },
        `${t('top.chapterShort', { n: ch, total: CHAPTERS.length })} · ${rankOf(app.tickets, done()).tier?.[lang] ?? t('career.intern')}`)));
}

/** Workspace (v6 §3.3): the open chapter's tasks, a second way beside the task bar; hidden in the rail. */
function tasks(): HTMLElement | null {
  const tk = app.tickets.find((x) => x.id === app.selectedId);
  if (!tk) return null;
  const lang = getLang();
  const d = done();
  const reached = new Set(visibleTickets(app.tickets, d).map((x) => x.id));
  const own = app.tickets.filter((x) => x.chapter === tk.chapter);
  return h('div', { class: 'side-extra' },
    h('p', { class: GROUP }, t('nav.chapterOption', { n: tk.chapter, title: chapterTitle(tk.chapter, lang) })),
    ...own.map((x, i) => row({
      key: `t:${x.id}`,
      href: hashOf('play'),
      lead: d.has(x.id) ? icon('check', 'size-4 text-good') : h('b', { class: 'text-sm' }, String(i + 1)),
      label: reached.has(x.id) ? textOf(x, lang).title : t('nav.taskLocked'),
      current: isStory() && x.id === app.selectedId,
      lock: reached.has(x.id) ? undefined : t('side.lockedTask'),
      onclick: () => actions.selectTicket(x.id),
    })));
}

/** Drawer only (v6 §3.2: the domain switch heads the drawer). */
function domainSwitch(): HTMLElement {
  return h('div', {},
    h('p', { class: GROUP }, t('home.domains')),
    ...DOMAINS.map((d) => row({
      key: `d:${d.id}`, href: d.live ? hashOf('overview') : domainHash(d.id), lead: icon(d.icon), label: t(d.name),
      sub: d.live ? undefined : t('home.status.soon'), current: false,
    })));
}

function content(route: Route, drawer: boolean): Node[] {
  const out: (Node | null | undefined)[] = [drawer ? domainSwitch() : null];
  if (route === 'learn') {
    out.push(h('p', { class: GROUP }, t('side.sqlTrack')), ...modules(), h('p', { class: 'side-label mt-3 px-3 text-sm text-muted' }, t('learn.advSoon')));
  } else if (route === 'practice') {
    out.push(row({ key: 'today', href: hashOf('practice'), lead: icon('repeat'), label: t('side.today', { n: reviewCount() }), current: true }));
  } else if (inDomain(route)) {
    out.push(domainHead(), ...navItems('domain').map((n) => row({
      key: n.id, href: n.href, lead: icon(n.icon), label: t(n.label), current: n.current(route), onclick: n.onclick,
    })));
    if (route === 'play') out.push(tasks());
    if (route === 'data') out.push(sideExtra());
  }
  return nodes(...out);
}

/** Bottom button: collapse/expand on wide reading pages (saved), else the rail's overlay (not saved, v6 §3.2). */
function toggle(route: Route): HTMLElement {
  const forcedRail = route === 'play' || !mq(XL);
  const expanded = forcedRail ? overlay : parseSidePref(readJson<unknown>(SIDE_KEY)) === 'open';
  const label = t(expanded ? 'side.collapse' : 'side.expand');
  return h('button', {
    type: 'button', 'data-side': 'toggle', class: cx(SIDE_LINK, 'mt-auto'), 'aria-expanded': String(expanded), title: label,
    onclick: () => {
      if (forcedRail) overlay = !overlay;
      else writeJson(SIDE_KEY, expanded ? 'rail' : 'open');
      renderSidebar(route);
    },
  }, h('span', { class: 'grid size-6 shrink-0 place-items-center', 'aria-hidden': 'true' }, icon('panelLeft')), h('span', { class: 'side-label' }, label));
}

/** Redrawn by rerender() and on every route change (cheap; focus inside is put back by data-side). */
export function renderSidebar(route: Route): void {
  if (route !== lastRoute) overlay = false;
  lastRoute = route;
  document.body.dataset.route = route; // CSS: no sidebar on Home, rail on the workspace
  document.body.dataset.side = parseSidePref(readJson<unknown>(SIDE_KEY));
  const drawer = byId('side-drawer') as HTMLDialogElement;
  const side = byId('side');
  const host = drawer.open ? drawer : side;
  const focused = host.contains(document.activeElement) ? document.activeElement?.getAttribute('data-side') : null;
  if (drawer.open) {
    drawer.replaceChildren(h('div', { class: 'flex min-h-full flex-col gap-1 p-3' },
      h('div', { class: 'mb-2 flex items-center justify-between' },
        h('h2', { id: 'side-drawer-title', class: 'm-0 text-lg' }, t('side.title')),
        h('form', { method: 'dialog' }, h('button', { class: 'grid size-11 place-items-center p-0', 'aria-label': t('app.close') }, icon('x')))),
      ...content(route, true)));
  } else {
    side.toggleAttribute('data-overlay', overlay);
    side.replaceChildren(h('div', { class: 'side-panel' }, ...content(route, false), toggle(route)));
  }
  if (focused) host.querySelector<HTMLElement>(`[data-side="${CSS.escape(focused)}"]`)?.focus();
}

/** Once at startup: ☰ and the drawer (a modal <dialog>: focus trap, Esc, focus back to ☰), media changes, Esc for the overlay. */
export function initSidebar(): void {
  const btn = byId('side-btn');
  const drawer = byId('side-drawer') as HTMLDialogElement;
  btn.addEventListener('click', () => {
    drawer.showModal(); // open first: renderSidebar() fills whichever host is open
    renderSidebar(lastRoute);
    btn.setAttribute('aria-expanded', 'true');
    drawer.querySelector<HTMLElement>('a:not([aria-disabled]), button')?.focus();
  });
  drawer.addEventListener('close', () => {
    btn.setAttribute('aria-expanded', 'false');
    renderSidebar(lastRoute);
  });
  // The backdrop (the dialog box itself has no padding) and any followed link close it.
  drawer.addEventListener('click', (e) => {
    const el = e.target as Element;
    if (el === drawer || el.closest('a[href]:not([aria-disabled])')) drawer.close();
  });
  matchMedia(WIDE).addEventListener('change', () => {
    if (drawer.open) drawer.close();
    actions.rerender(); // the Data page's list moves between page and sidebar (V11)
  });
  matchMedia(XL).addEventListener('change', () => renderSidebar(lastRoute));
  // Registered before the tour's Esc (Task 7): an open overlay takes Esc first.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !overlay || e.defaultPrevented) return;
    e.preventDefault();
    overlay = false;
    renderSidebar(lastRoute);
    byId('side').querySelector<HTMLElement>('[data-side="toggle"]')?.focus();
  });
}
```

- [ ] **Step 6: Danh sách bảng của trang Dữ liệu vào sidebar (V11)**

**Sửa `src/ui/dataView.ts`** — thêm `import { sideExtra } from './sidebar';`; thay:
```ts
  host.replaceChildren(h('div', { class: 'mx-auto max-w-6xl px-4 py-6' },
    h('h1', { id: 'data-title', tabindex: '-1', class: 'm-0 text-2xl font-bold' }, t('data.title')),
    h('p', { class: 'mt-1 text-muted' }, t('data.intro')),
    h('div', { class: 'mt-4 grid gap-5 lg:grid-cols-[18rem_1fr]' },
      h('div', { class: 'min-w-0 lg:sticky lg:top-4 lg:self-start' },
        h('label', { for: 'data-search', class: 'mb-1 block font-semibold' }, t('data.search')),
        search,
        count,
        h('h2', { id: 'data-list-title', class: 'sr-only' }, t('data.title')),
        list),
      h('div', { class: 'min-w-0' }, detail, diagram))));
```
bằng:
```ts
  // v6 §3.3 (V11): from 1024 px the table list lives in the sidebar; below that it stays at the top of the page.
  const side = sideExtra();
  const picker = h('div', { class: side ? 'min-w-0' : 'min-w-0 lg:sticky lg:top-4 lg:self-start' },
    h('label', { for: 'data-search', class: 'mb-1 block font-semibold' }, t('data.search')),
    search,
    count,
    h('h2', { id: 'data-list-title', class: 'sr-only' }, t('data.title')),
    list);
  side?.replaceChildren(picker);
  host.replaceChildren(h('div', { class: 'mx-auto max-w-[1120px] px-4 py-6' },
    h('h1', { id: 'data-title', tabindex: '-1', class: 'm-0 text-2xl font-bold' }, t('data.title')),
    h('p', { class: 'mt-1 text-muted' }, t('data.intro')),
    h('div', { class: side ? 'mt-4 grid gap-5' : 'mt-4 grid gap-5 lg:grid-cols-[18rem_1fr]' },
      side ? null : picker,
      h('div', { class: 'min-w-0' }, detail, diagram))));
```

- [ ] **Step 7: Nối vào `main.ts`; i18n**

**Sửa `src/main.ts`** — thêm `import { initSidebar, renderSidebar } from './ui/sidebar';` và đổi import router thành `import { currentRoute, go, startRouter } from './ui/router';`. Thay:
```ts
function rerender(): void {
  renderTopbar();
```
bằng:
```ts
function rerender(): void {
  renderTopbar();
  renderSidebar(currentRoute()); // before the Data page: it fills the sidebar's slot (V11)
```
Thay:
```ts
startRouter(showRoute);
```
bằng:
```ts
initSidebar();
startRouter(showRoute);
```

**Sửa `src/i18n/vi.ts`** — thay `'nav.dashboard': 'Bảng điều hành',` bằng:
```ts
  'nav.dashboard': 'Bảng điều hành',
  'nav.bottom': 'Điều hướng nhanh',
  'nav.domains': 'Chọn lĩnh vực',
  'app.homeLink': 'BoonData, về Trang chủ',
  'side.label': 'Điều hướng trong khu vực',
  'side.open': 'Mở điều hướng',
  'side.title': 'Điều hướng',
  'side.collapse': 'Thu gọn',
  'side.expand': 'Mở rộng',
  'side.sqlTrack': 'SQL nền tảng',
  'side.today': 'Hôm nay ({n})',
  'side.lockedTask': 'Xong việc trước để mở',
```
**Sửa `src/i18n/en.ts`** — thay `'nav.dashboard': 'Dashboard',` bằng:
```ts
  'nav.dashboard': 'Dashboard',
  'nav.bottom': 'Quick navigation',
  'nav.domains': 'Choose a domain',
  'app.homeLink': 'BoonData, go to Home',
  'side.label': 'Section navigation',
  'side.open': 'Open navigation',
  'side.title': 'Navigation',
  'side.collapse': 'Collapse',
  'side.expand': 'Expand',
  'side.sqlTrack': 'SQL foundations',
  'side.today': 'Today ({n})',
  'side.lockedTask': 'Finish the task before it to open it',
```

- [ ] **Step 8: Chạy, thấy qua**

Run: `npx vitest run tests/prefs.test.ts tests/i18n.test.ts tests/theme.test.ts tests/shortcuts.test.ts && npx tsc --noEmit && npm test && npm run build && node scripts/check-budget.mjs`
Expected: PASS; `main` +3–5 KB so với Task 5 (ghi số), `css` ≤ 20.

- [ ] **Step 9: Edge (cả sáng và tối)**

1. **1440 px:** thanh trên một dòng: Lily + BoonData · Trang chủ · Lộ trình · Luyện SQL · [Logistics ▾] ··· (trong domain: Ch. n/12 · bậc nghề) XP · Hộp thư · Ôn tập · Sổ tay · VI|EN · ☀◐☾ · ● · ⋯. Không có gradient.
2. Trang chủ: **không** sidebar. Lộ trình: sidebar 256 px "SQL nền tảng" + 12 module (chấm/✓/khóa, dòng phụ), bấm module đổi nội dung. Luyện SQL: "Hôm nay (n)". Trong domain: đầu sidebar "Logistics · Ch. n/12 · bậc nghề", rồi Tổng quan · Làm việc · Sandbox · Dữ liệu · Bảng điều hành · Bản đồ; mục đang ở có vạch trái 4 px + nền xanh nhạt.
3. Nút cuối sidebar "Thu gọn" → rail 64 px (chỉ icon, rê chuột có tooltip), tải lại vẫn thu gọn (pref `cargo-query/sidebar` = `"rail"`), "Mở rộng" mở lại.
4. Làm việc: sidebar luôn rail; » mở **đè** lên khung (khung đề/editor/kết quả không đổi kích thước, thanh kéo splitter giữ chỗ), Esc đóng và focus về nút; đổi trang thì tự đóng. Danh sách việc của chương chỉ hiện khi mở đè; việc chưa tới có khóa + "Xong việc trước để mở".
5. Dữ liệu ≥ 1024 px: ô tìm + danh sách bảng nằm trong sidebar (gõ tiếng Việt có dấu trong ô tìm không mất focus khi danh sách lọc), nội dung chỉ còn chi tiết bảng + sơ đồ. 1024–1279 px: rail, » mở đè để chọn bảng.
6. **1100 px:** mọi trang đọc là rail; nhãn nút Hộp thư/Ôn tập/Sổ tay ẩn (còn icon + tên đọc màn hình).
7. **375 px:** thanh dưới 4 mục (Trang chủ · Lộ trình · Luyện SQL · Logistics), mục đang ở màu xanh ngọc; ☰ mở ngăn kéo từ trái (đầu là Lĩnh vực, rồi mục của trang), Tab không thoát ra ngoài, Esc / chạm nền mờ / bấm một link đều đóng và focus về ☰. Không cuộn ngang. Dữ liệu: danh sách bảng ở đầu trang. Dock hoạt cảnh nằm trên thanh dưới.
8. [Logistics ▾]: menu có Logistics (Ch. n/12), Finance, E-commerce (Sắp có); chọn Finance → trang Sắp có, menu đóng.
9. Phím tắt: Ctrl+Enter, Ctrl+Shift+Enter, Shift+Alt+F trong workspace; Esc trên dock hoàn thành vẫn bỏ qua hoạt cảnh.
10. Tương phản: DevTools → Lighthouse Accessibility (Trang chủ, Làm việc, Dữ liệu) không còn lỗi "contrast" mới.

- [ ] **Step 10: Commit**

```bash
git add index.html src/style.css src/theme.ts src/ui/topbar.ts src/ui/sidebar.ts src/ui/dataView.ts src/ui/icons.ts src/main.ts src/i18n/vi.ts src/i18n/en.ts tests/prefs.test.ts
git commit -m "feat: level-1 top bar, route-driven left sidebar (open, rail, overlay), mobile bottom bar and drawer, domain switch; Data list in the sidebar (v6 F3)" -m "Claude-Session: https://claude.ai/code/session_01PwPSBV1SVDP6quEZfKN56M"
```

---

### Task 7: F4 + v4 P2 · Màn chào lúc tải DB (Lily) và tour 8 bước (Boon)

**Files:** `src/onboarding.ts` (tạo), `src/ui/welcome.ts` (tạo), `src/ui/coach.ts` (ghi lại), `src/ui/brief.ts`, `src/ui/tabs.ts`, `src/ui/work.ts`, `src/ui/lessonCard.ts`, `src/state.ts`, `src/main.ts`, `index.html`, `src/i18n/vi.ts`, `src/i18n/en.ts`, `tests/onboarding.test.ts` (tạo), `tests/coach.test.ts` (ghi lại)

**Interfaces:**
- Consumes: `mascot()` (Task 3), `go()`, `app.lastRun`, `done()`, `loadLessonPrefs()` (`src/lessons.ts`), `lessonSlot` (Plan 6), `readJson`/`writeJson`.
- Produces:
  - `src/onboarding.ts` (thuần): `TOUR_KEY = 'cargo-query/tour'`, `interface TourPref { step: number; knows: boolean }`, `TOUR_STEPS = 8`, `parseTour`, `readTour`, `startTour(knows)`, `ackTour(step)`, `welcomeNeeded(completed, tour, coachSkipped)`, `gated(tour)`, `interface TourFacts`, `type TourSlot`, `TOUR_SLOT`, `tourStep(facts)`, `navLock(id, completed, order, isGated): Key | undefined`, `tabOpen(from, reached, isGated)` (hai hàm cuối dùng ở Task 8).
  - `src/ui/coach.ts`: `COACH_KEY`, `coachDone()` (không đổi), `coach('hints')`, `tourSlot(slot)`, `refreshTour()`, `tourText(step)`, `markTabOpened(id)`, `markExampleRan(skill)`, `initTour()`.
  - `src/ui/welcome.ts`: `initWelcome()`, `openWelcome(replay)`, `relabelWelcome()`.
  - `actions.switchLang(l)` (`src/state.ts`).
  - DOM: `<dialog id="welcome-dialog">`.

- [ ] **Step 1: Test logic thuần (hỏng trước)**

**Tạo `tests/onboarding.test.ts`:**
```ts
import { describe, expect, it } from 'vitest';
import {
  ackTour, gated, navLock, parseTour, readTour, startTour, tabOpen, TOUR_KEY, tourStep, welcomeNeeded, type TourFacts,
} from '../src/onboarding';
import type { KV } from '../src/storage';

const mem = (): KV & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
};
const base: TourFacts = { onFirst: true, skipped: false, tour: { step: 0, knows: false }, ran: false, exampleRan: false, columnsSeen: false, shapeOk: false, solved: false };
const at = (f: Partial<TourFacts>, step = 0): number | undefined => tourStep({ ...base, tour: { step, knows: false }, ...f });

describe('onboarding (v4 §B, Plan 7 V8–V9)', () => {
  it('pref tour: chỉ object mới là pref; bước kẹp 0..8; knows chỉ nhận true', () => {
    expect(parseTour(undefined)).toBeUndefined();
    expect(parseTour(null)).toBeUndefined();
    expect(parseTour([1])).toBeUndefined();
    expect(parseTour('x')).toBeUndefined();
    expect(parseTour({})).toEqual({ step: 0, knows: false });
    expect(parseTour({ step: 3.5, knows: 'yes' })).toEqual({ step: 0, knows: false });
    expect(parseTour({ step: 99, knows: true })).toEqual({ step: 8, knows: true });
    expect(parseTour({ step: -2 })).toEqual({ step: 0, knows: false });
  });

  it('startTour / ackTour: bước chỉ tiến, không có pref thì ack không ghi gì', () => {
    const s = mem();
    ackTour(3, s);
    expect(s.data.has(TOUR_KEY)).toBe(false);
    startTour(false, s);
    ackTour(3, s);
    ackTour(2, s);
    expect(readTour(s)).toEqual({ step: 3, knows: false });
    startTour(true, s);
    expect(readTour(s)).toEqual({ step: 8, knows: true });
  });

  it('màn chào chỉ cho người mới: chưa xong việc nào, chưa có pref tour, chưa bỏ qua hướng dẫn cũ', () => {
    expect(welcomeNeeded(0, undefined, false)).toBe(true);
    expect(welcomeNeeded(1, undefined, false)).toBe(false);
    expect(welcomeNeeded(0, { step: 0, knows: false }, false)).toBe(false);
    expect(welcomeNeeded(0, undefined, true)).toBe(false);
  });

  it('tour đi đúng 8 bước, suy ra từ việc người chơi đã làm', () => {
    expect(at({})).toBe(1);
    expect(at({}, 1)).toBe(2);
    expect(at({ ran: true }, 1)).toBe(3);
    expect(at({ ran: true }, 3)).toBe(4);
    expect(at({ ran: true, exampleRan: true }, 3)).toBe(5);
    expect(at({ ran: true, exampleRan: true, columnsSeen: true }, 3)).toBe(6);
    expect(at({ ran: true, exampleRan: true, columnsSeen: true, shapeOk: true }, 3)).toBe(7);
  });

  it('làm khác thứ tự thì nhảy tới bước tương ứng; tải lại không lùi', () => {
    expect(at({ solved: true }, 1)).toBe(8); // Submit at once
    expect(at({ solved: true }, 8)).toBeUndefined(); // tour over
    expect(at({ ran: true, columnsSeen: true }, 3)).toBe(4); // the lesson step still waits
    expect(at({}, 5)).toBe(6); // reload: lastRun is gone, steps 1–5 were passed
  });

  it('không có tour: ngoài việc 1, đã bỏ qua, đã biết SQL, chưa qua màn chào', () => {
    expect(at({ onFirst: false })).toBeUndefined();
    expect(at({ skipped: true })).toBeUndefined();
    expect(tourStep({ ...base, tour: { step: 0, knows: true } })).toBeUndefined();
    expect(tourStep({ ...base, tour: undefined })).toBeUndefined();
  });

  it('mở dần chỉ cho người bắt đầu từ màn chào và chưa biết SQL (V9)', () => {
    expect(gated(undefined)).toBe(false);
    expect(gated({ step: 0, knows: true })).toBe(false);
    expect(gated({ step: 4, knows: false })).toBe(true);
  });

  it('khóa nav: Sandbox, Dữ liệu tới khi xong việc 1; Bảng điều hành tới khi xong việc 2; Lộ trình, Luyện SQL không khóa', () => {
    const order = ['ch1-01', 'ch1-02', 'ch1-03'];
    expect(navLock('sandbox', new Set(), order, true)).toBe('lock.afterTask1');
    expect(navLock('data', new Set(), order, true)).toBe('lock.afterTask1');
    expect(navLock('dashboard', new Set(['ch1-01']), order, true)).toBe('lock.afterTask2');
    expect(navLock('dashboard', new Set(['ch1-01', 'ch1-02']), order, true)).toBeUndefined();
    expect(navLock('data', new Set(['ch1-01']), order, true)).toBeUndefined();
    expect(navLock('learn', new Set(), order, true)).toBeUndefined();
    expect(navLock('sandbox', new Set(), order, false)).toBeUndefined();
  });

  it('tab có `from` hiện khi việc đó đã tới; người không bị mở dần thấy đủ', () => {
    const reached = new Set(['ch1-01', 'ch1-02', 'ch1-03']);
    expect(tabOpen('ch1-03', reached, true)).toBe(true);
    expect(tabOpen('ch3-01', reached, true)).toBe(false);
    expect(tabOpen(undefined, reached, true)).toBe(true);
    expect(tabOpen('ch3-01', reached, false)).toBe(true);
  });
});
```

Run: `npx vitest run tests/onboarding.test.ts`
Expected: FAIL (`src/onboarding` chưa có).

- [ ] **Step 2: `src/onboarding.ts`**

**Tạo `src/onboarding.ts`:**
```ts
import type { Key } from './i18n';
import { localStore, readJson, writeJson, type KV } from './storage';

/** Device pref (v4 §B.4, D-F1): the highest tour step passed and the welcome screen's "I already know SQL". Never in Save or Export. */
export const TOUR_KEY = 'cargo-query/tour';
export interface TourPref { step: number; knows: boolean }
export const TOUR_STEPS = 8;

/** Stored data is user-editable: a non-object is "no pref"; a bad step reads as 0, anything but `true` as "does not know SQL". */
export function parseTour(v: unknown): TourPref | undefined {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined;
  const o = v as Record<string, unknown>;
  const step = typeof o.step === 'number' && Number.isInteger(o.step) ? Math.min(TOUR_STEPS, Math.max(0, o.step)) : 0;
  return { step, knows: o.knows === true };
}
export const readTour = (storage: KV | undefined = localStore()): TourPref | undefined => parseTour(readJson<unknown>(TOUR_KEY, storage));

/** The welcome screen's choice: a beginner starts at step 0; "I know SQL" skips the tour and the progressive disclosure (V9). */
export const startTour = (knows: boolean, storage?: KV): boolean => writeJson(TOUR_KEY, { step: knows ? TOUR_STEPS : 0, knows }, storage);

/** Steps only move forward. No pref (an old player) = nothing to record. A failed write only shows a step again later. */
export function ackTour(step: number, storage?: KV): void {
  const now = readTour(storage);
  if (now && step > now.step) writeJson(TOUR_KEY, { ...now, step: Math.min(TOUR_STEPS, step) }, storage);
}

/** Welcome screen (v4 §B.2 layer 1): new players only; never an old save (v4 §F.2) or someone who skipped the old coach marks. */
export const welcomeNeeded = (completed: number, tour: TourPref | undefined, coachSkipped: boolean): boolean =>
  completed === 0 && tour === undefined && !coachSkipped;

/** Progressive disclosure (v4 §B.2 layer 3) only for players who started on the welcome screen as beginners (V9). */
export const gated = (tour: TourPref | undefined): boolean => tour !== undefined && !tour.knows;

/** What the player has done on ticket 1; the tour step is derived from it (v4: "the tour jumps to the matching step"). */
export interface TourFacts {
  onFirst: boolean;
  /** "Skip the tour" or Esc: cargo-query/coach-done. */
  skipped: boolean;
  tour?: TourPref;
  ran: boolean;
  exampleRan: boolean;
  columnsSeen: boolean;
  /** The last run has as many columns as the Expected result card. */
  shapeOk: boolean;
  solved: boolean;
}
export type TourSlot = 'brief' | 'work' | 'panel' | 'lesson' | 'recap';
/** Where each step's mark sits: inside its region, never floating over the editor or the results (v4 §B.2, v6 §1.4). */
export const TOUR_SLOT: Record<number, TourSlot> = { 1: 'brief', 2: 'work', 3: 'panel', 4: 'lesson', 5: 'panel', 6: 'work', 7: 'work', 8: 'recap' };

/** v4 §B.2 layer 2. Steps 1, 3 and 8 wait for a button; the others for what the player does. */
export function tourStep(f: TourFacts): number | undefined {
  const tour = f.tour;
  if (!f.onFirst || f.skipped || !tour || tour.knows) return undefined;
  if (f.solved) return tour.step >= TOUR_STEPS ? undefined : 8;
  const passed = [true, false, f.ran, false, f.exampleRan, f.columnsSeen, f.shapeOk, f.solved];
  for (let n = 1; n <= 7; n++) if (tour.step < n && !passed[n]) return n;
  return 7;
}

/** v4 D-O3 with V9: day-one items show a lock and why, never hidden. `order` = story ticket ids. */
export function navLock(id: string, completed: ReadonlySet<string>, order: readonly string[], isGated: boolean): Key | undefined {
  if (!isGated) return undefined;
  if ((id === 'sandbox' || id === 'data') && !completed.has(order[0])) return 'lock.afterTask1';
  if (id === 'dashboard' && !completed.has(order[1])) return 'lock.afterTask2';
  return undefined;
}

/** v4 D-O4: a tab with `from` appears once that ticket is reached (done, or the next one to do). */
export const tabOpen = (from: string | undefined, reached: ReadonlySet<string>, isGated: boolean): boolean =>
  !isGated || !from || reached.has(from);
```

Run: `npx vitest run tests/onboarding.test.ts`
Expected: PASS; `tsc` báo `lock.afterTask1`/`lock.afterTask2` chưa có trong `Key` (thêm ở Step 6).

- [ ] **Step 3: `src/ui/coach.ts` + test dấu Gợi ý**

**Ghi lại `tests/coach.test.ts`:**
```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Ticket } from '../src/tickets';

// No DOM here: h() returns plain records so the coach mark's buttons can be clicked by hand.
interface El { tag: string; attrs: Record<string, unknown>; children: unknown[] }
vi.mock('../src/ui/dom', () => ({
  h: (tag: string, attrs: Record<string, unknown> = {}, ...children: unknown[]): El => ({ tag, attrs, children }),
}));

const tk = (id: string) => ({ id }) as Ticket;
let found: Record<string, { focus: ReturnType<typeof vi.fn> }>;
let skipped = false;
const focused = () => Object.entries(found).filter(([, el]) => el.focus.mock.calls.length).map(([sel]) => sel);

async function load(selected: string, completed: string[] = []) {
  vi.resetModules(); // `dismissed` is module state
  const { app } = await import('../src/state');
  const { coach } = await import('../src/ui/coach');
  app.tickets = [tk('A'), tk('B')];
  app.save = (await import('../src/save')).emptySave();
  app.save.completed = completed;
  app.selectedId = selected;
  return coach;
}

beforeEach(() => {
  found = {};
  skipped = false;
  const el = (sel: string) => (found[sel] ??= { focus: vi.fn() });
  vi.stubGlobal('window', { localStorage: { getItem: (k: string) => (skipped && k === 'cargo-query/coach-done' ? 'true' : null), setItem() {} } });
  vi.stubGlobal('document', {
    querySelector: (sel: string) => el(sel),
    getElementById: (id: string) => el(`#${id}`),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('dấu Gợi ý ở việc 2 (v4 §B.5)', () => {
  it('hiện ở việc 2 chưa xong; "Hiểu rồi" gỡ dấu và đưa focus về nút Gợi ý', async () => {
    const coach = await load('B');
    const mark = coach('hints') as unknown as El;
    const ok = mark.children[1] as El;
    const state = { removed: false };
    (ok.attrs.onclick as (e: unknown) => void)({ currentTarget: { closest: (s: string) => (s === '.coach' ? { remove: () => { state.removed = true; } } : null) } });
    expect(state.removed).toBe(true);
    expect(focused()).toEqual(['.hints button']);
  });

  it('không hiện ở việc khác, khi việc 2 đã xong, hay khi đã bỏ qua hướng dẫn', async () => {
    expect((await load('A'))('hints')).toBeNull();
    expect((await load('B', ['B']))('hints')).toBeNull();
    skipped = true;
    expect((await load('B'))('hints')).toBeNull();
  });
});
```

**Ghi lại `src/ui/coach.ts`:**
```ts
import { getLang, t, type Key } from '../i18n';
import { loadLessonPrefs } from '../lessons';
import { ackTour, readTour, TOUR_SLOT, TOUR_STEPS, tourStep, type TourFacts, type TourSlot } from '../onboarding';
import { SKILLS } from '../progress';
import { isStory } from '../session';
import { app, done } from '../state';
import { localStore, readJson, writeJson, type KV } from '../storage';
import { h } from './dom';
import { mascot } from './mascots';
import { go } from './router';

export const COACH_KEY = 'cargo-query/coach-done';
/** Only a stored `true` means "skipped"; anything else (missing, corrupt, other JSON) shows the coach. */
export const coachDone = (storage: KV | undefined = localStore()): boolean => readJson<unknown>(COACH_KEY, storage) === true;

// ---- Ticket 2's hint mark (v4 §B.5). The marks of ticket 1 became the tour below. ----

export type CoachSpot = 'hints';
const dismissed = new Set<CoachSpot>();

function spotNow(): CoachSpot | undefined {
  if (coachDone()) return undefined;
  const second = app.tickets[1];
  return second && app.selectedId === second.id && !done().has(second.id) ? 'hints' : undefined;
}

/** A coach mark placed inside its region (no floating popover), or null. */
export function coach(spot: CoachSpot): HTMLElement | null {
  if (spotNow() !== spot || dismissed.has(spot)) return null;
  const close = (e: Event) => {
    (e.currentTarget as HTMLElement).closest('.coach')?.remove();
    (document.querySelector<HTMLElement>('.hints button') ?? document.getElementById('brief-title'))?.focus();
  };
  return h('aside', { class: 'coach my-3 rounded-xl bg-accent-soft p-3 ring-1 ring-accent', role: 'note' },
    h('p', { class: 'mt-0 mb-2' }, t('coach.hints')),
    h('button', { type: 'button', class: 'mr-1.5', onclick: (e) => { dismissed.add(spot); close(e); } }, t('coach.ok')),
    h('button', { type: 'button', onclick: (e) => { writeJson(COACH_KEY, true); close(e); } }, t('coach.skip')));
}

// ---- The 8-step tour on the real ticket 1 (v4 §B.2 layer 2), led by Boon (L57, V8) ----

/** Tabs the player opened by hand this session (tabs.ts): the Columns tab shown on its own at start does not count. */
const openedTabs = new Set<string>();
/** Quick lessons whose "Run the example" finished this session (lessonCard.ts). */
const examplesRun = new Set<string>();
export function markTabOpened(id: string): void {
  openedTabs.add(id);
  refreshTour();
}
export function markExampleRan(skill: string): void {
  examplesRun.add(skill);
  refreshTour();
}

function facts(): TourFacts {
  const first = app.tickets[0];
  const run = app.lastRun?.result;
  const want = first?.steps[0]?.columns?.length;
  const lesson = first?.grants[0];
  return {
    onFirst: !!first && isStory() && app.selectedId === first.id,
    skipped: coachDone(),
    tour: readTour(),
    ran: app.lastRun !== undefined,
    exampleRan: !lesson || examplesRun.has(lesson) || loadLessonPrefs().seen.includes(lesson),
    columnsSeen: openedTabs.has('columns'),
    shapeOk: !!run && want !== undefined && run.columns.length === want,
    solved: !!first && done().has(first.id),
  };
}

const TEXT: Record<number, Key> = { 1: 'tour.1', 2: 'tour.2', 3: 'tour.3', 4: 'tour.4', 5: 'tour.5', 6: 'tour.6', 7: 'tour.7', 8: 'tour.8' };
const skillLabel = (id: string | undefined): string => SKILLS.find((s) => s.id === id)?.label[getLang()] ?? '';
/** A step's words, with ticket 1's sender and skills filled in (also listed by the welcome screen's replay, V10). */
export function tourText(step: number): string {
  const [first, second] = app.tickets;
  return t(TEXT[step], { name: first?.from.name ?? '', skill: skillLabel(first?.grants[0]), next: skillLabel(second?.grants[0]) });
}

function skip(): void {
  writeJson(COACH_KEY, true);
  refreshTour();
  document.getElementById('brief-title')?.focus();
}

/** Boon's mark: --sun-ink on --sun (8.3:1), a step counter, the words, its button(s) and "Skip the tour (Esc)". */
function mark(step: number): HTMLElement {
  const after = (n: number, toPath = false) => () => {
    ackTour(n);
    refreshTour();
    if (toPath) go('learn');
    else document.querySelector<HTMLElement>('[data-tour-mark]')?.focus(); // the next step's mark, wherever it now sits
  };
  return h('aside', {
    class: 'tour my-3 flex items-start gap-3 rounded-(--r-card) bg-sun p-3 text-sun-ink', role: 'note', tabindex: '-1',
    'data-tour-mark': String(step), 'aria-label': t('tour.label', { i: step, n: TOUR_STEPS }),
  },
    mascot('boon', 'point', 'size-12'),
    h('div', { class: 'min-w-0 flex-1' },
      h('p', { class: 'm-0 text-xs font-bold tracking-wider uppercase' }, t('tour.label', { i: step, n: TOUR_STEPS })),
      h('p', { class: 'mt-1 mb-2' }, tourText(step)),
      h('div', { class: 'flex flex-wrap gap-2' },
        step === 1 || step === 3 ? h('button', { type: 'button', class: 'primary', onclick: after(step) }, t('tour.next')) : null,
        step === 8 ? h('button', { type: 'button', class: 'primary', onclick: after(8) }, t('tour.done')) : null,
        step === 8 ? h('button', { type: 'button', onclick: after(8, true) }, t('tour.seePath')) : null,
        h('button', { type: 'button', onclick: () => skip() }, t('tour.skip')))));
}

/** A region's placeholder (brief, lesson, work, panel, recap): holds the mark when the current step points there. */
export function tourSlot(slot: TourSlot): HTMLElement {
  const el = h('div', { 'data-tour-slot': slot });
  const step = tourStep(facts());
  if (step !== undefined && TOUR_SLOT[step] === slot) el.append(mark(step));
  return el;
}

/** After anything that may move the tour (rerender, a tab opened, an example run): refill every slot on the page. */
export function refreshTour(): void {
  const step = tourStep(facts());
  if (step !== undefined && step > 1) ackTour(step - 1); // passed steps survive a reload (app.lastRun does not)
  for (const slot of document.querySelectorAll<HTMLElement>('[data-tour-slot]')) {
    const here = step !== undefined && TOUR_SLOT[step] === slot.dataset.tourSlot;
    if (here && slot.firstElementChild?.getAttribute('data-tour-mark') === String(step)) continue; // unchanged: keep focus inside
    slot.replaceChildren(...(here ? [mark(step)] : []));
  }
}

/** Esc skips the tour (v4 §B.4) unless something else owns Esc: an open modal, the completion dock, CodeMirror's popups. */
export function initTour(): void {
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || e.defaultPrevented || !document.querySelector('[data-tour-mark]')) return;
    if (document.querySelector('dialog:modal') || document.getElementById('stage')?.hidden === false) return;
    skip();
  });
}
```

- [ ] **Step 4: Đặt các ô tour vào vùng; ghi tab đã mở, ví dụ đã chạy; "Đã biết SQL" (v4 §C.6)**

**Sửa `src/ui/brief.ts`** — đổi `import { coach } from './coach';` thành `import { coach, tourSlot } from './coach';`. Thay:
```ts
    coach('brief'),
```
bằng:
```ts
    isStory() ? tourSlot('brief') : null,
```
Thay:
```ts
    isStory() && !isDone ? lessonSlot(tk.grants) : null, // quick lessons before the task (product-design-v4 §C.3)
```
bằng:
```ts
    isStory() && !isDone ? lessonSlot(tk.grants) : null, // quick lessons before the task (product-design-v4 §C.3)
    isStory() && !isDone ? tourSlot('lesson') : null,
```
Thay:
```ts
    coach('recap'),
```
bằng:
```ts
    tourSlot('recap'),
```

**Sửa `src/ui/tabs.ts`** — đổi `import { coach } from './coach';` thành `import { markTabOpened, tourSlot } from './coach';`. Thay:
```ts
      onclick: () => show(tab.id),
```
bằng:
```ts
      onclick: () => {
        markTabOpened(tab.id); // tour step 5: a tab opened by hand (setTicket's own show('columns') does not count)
        show(tab.id);
      },
```
Thay:
```ts
      host.append(coach('panel') ?? '');
```
bằng:
```ts
      host.append(tourSlot('panel'));
```

**Sửa `src/ui/work.ts`** — thêm `import { tourSlot } from './coach';`; thay:
```ts
  host.replaceChildren(editorHost, h('div', { class: 'max-sm:sticky max-sm:bottom-0 max-sm:z-10 max-sm:bg-panel' }, h('div', { class: 'actions' }, runBtn, explainBtn, formatBtn, submitBtn)), feedback, historyBox);
```
bằng:
```ts
  // The tour's mark sits under the buttons, never over the editor (v4 §B.2); main.ts refreshTour() refills it.
  host.replaceChildren(editorHost, h('div', { class: 'max-sm:sticky max-sm:bottom-0 max-sm:z-10 max-sm:bg-panel' }, h('div', { class: 'actions' }, runBtn, explainBtn, formatBtn, submitBtn)), tourSlot('work'), feedback, historyBox);
```

**Sửa `src/ui/lessonCard.ts`** — thêm `import { markExampleRan } from './coach';` và `import { readTour } from '../onboarding';`. Thay:
```ts
          drawExample();
        });
```
bằng:
```ts
          drawExample();
          markExampleRan(l.id); // tour step 4
        });
```
Thay:
```ts
    const first = ids.find((id) => !isSeen(id));
```
bằng:
```ts
    // v4 §C.6: "I already know SQL" on the welcome screen → every lesson starts as its one-line row (chips still open it).
    const first = readTour()?.knows ? undefined : ids.find((id) => !isSeen(id));
```

- [ ] **Step 5: Màn chào (`src/ui/welcome.ts`), hộp thoại, nối vào `main.ts`**

**Tạo `src/ui/welcome.ts`:**
```ts
import { getLang, t, type Lang } from '../i18n';
import { readTour, startTour, TOUR_STEPS, welcomeNeeded } from '../onboarding';
import { actions, app, done } from '../state';
import { writeJson } from '../storage';
import { BTN_GO, cx } from '../theme';
import { COACH_KEY, coachDone, tourText } from './coach';
import { byId, h } from './dom';
import { mascot } from './mascots';

const mb = (bytes: number): number => Math.round(bytes / 1e5) / 10;
const LOOP = ['welcome.loop1', 'welcome.loop2', 'welcome.loop3', 'welcome.loop4'] as const;
/** Panel shown (0–2) and whether this is the static replay from the ⋯ menu (V10). In memory only. */
let panel = 0;
let replay = false;

const dialog = (): HTMLDialogElement => byId('welcome-dialog') as HTMLDialogElement;
const title = (text: string) => h('h2', { id: 'welcome-title', tabindex: '-1', class: 'm-0 text-xl font-extrabold' }, text);

/** v4 §B.2 step 3: a beginner gets the tour on ticket 1; "I know SQL" gets no tour, collapsed lessons and every tab (v4 §C.6, V9). */
function choose(knows: boolean): void {
  startTour(knows);
  if (knows) writeJson(COACH_KEY, true);
  dialog().close();
  actions.selectTicket(app.tickets[0].id);
}

function go(to: number): void {
  panel = to;
  draw();
  byId('welcome-title').focus();
}

function draw(): void {
  const d = dialog();
  const keep = (document.activeElement as HTMLElement | null)?.dataset?.w; // progress redraws often: keep the focused button
  const ready = app.dbStatus === 'ready';
  const p = app.loadProgress;
  const lily = ready ? mascot('lily', 'idle', 'size-28', t('welcome.lilyReady')) : mascot('lily', 'sleep', 'size-28', t('welcome.lilySleep'));
  const db = ready ? t('welcome.dbReady') : p ? t('welcome.dbLoading', { mb: mb(p.loaded) }) : t('db.loading');
  const body = panel === 0
    ? [title(t('welcome.title')), h('p', {}, t('welcome.p1')),
      h('div', { class: 'flex gap-2', role: 'group', 'aria-label': t('top.lang') }, ...(['vi', 'en'] as Lang[]).map((l) => h('button', {
        type: 'button', 'data-w': l, 'aria-pressed': String(getLang() === l), class: 'rounded-full px-4 aria-pressed:bg-accent-soft aria-pressed:font-bold',
        onclick: () => actions.switchLang(l),
      }, l.toUpperCase())))]
    : panel === 1
      ? [title(t('welcome.loopTitle')), h('ol', { class: 'space-y-1' }, ...LOOP.map((k) => h('li', {}, t(k)))), h('p', { class: 'mb-0 text-muted' }, t('welcome.loopNote'))]
      : replay
        ? [title(t('welcome.tourTitle')), h('ol', { class: 'space-y-1 text-sm' }, ...Array.from({ length: TOUR_STEPS }, (_, i) => h('li', {}, tourText(i + 1))))]
        : [title(t('welcome.ask')), h('div', { class: 'flex flex-col gap-2' },
          h('button', { type: 'button', 'data-w': 'begin', class: cx(BTN_GO, 'px-4 py-2'), disabled: !ready, onclick: () => choose(false) }, t(ready ? 'welcome.begin' : 'welcome.preparing')),
          h('button', { type: 'button', 'data-w': 'knows', class: 'rounded-full px-4 py-2', onclick: () => choose(true) }, t('welcome.knows')))];
  d.replaceChildren(h('div', { class: 'grid gap-4 sm:grid-cols-[auto_1fr]' },
    h('div', { class: 'flex flex-col items-center gap-1' }, lily, h('p', { class: 'm-0 max-w-32 text-center text-xs text-muted' }, db)),
    h('div', { class: 'min-w-0' }, ...body,
      h('div', { class: 'mt-4 flex items-center gap-2' },
        panel > 0 ? h('button', { type: 'button', 'data-w': 'back', onclick: () => go(panel - 1) }, t('welcome.back')) : null,
        h('span', { class: 'flex-1 text-center text-sm text-muted' }, t('welcome.page', { i: panel + 1, n: 3 })),
        panel < 2 ? h('button', { type: 'button', 'data-w': 'next', class: 'primary', onclick: () => go(panel + 1) }, t('welcome.next'))
          : replay ? h('button', { type: 'button', 'data-w': 'close', class: 'primary', onclick: () => d.close() }, t('app.close')) : null))));
  if (keep) d.querySelector<HTMLElement>(`[data-w="${keep}"]`)?.focus();
}

/** First visit, or the ⋯ menu's "Replay the tour" (a static list, V10). Lily's idle loops run only while this is open (V4). */
export function openWelcome(asReplay: boolean): void {
  replay = asReplay;
  panel = 0;
  draw();
  const d = dialog();
  if (!d.open) d.showModal();
  byId('mascot-sprite').classList.add('live');
}

/** Once, after the first route is shown: the welcome screen covers the DB download for a new player (v4 §B.2 layer 1). */
export function initWelcome(): void {
  const d = dialog();
  d.addEventListener('close', () => byId('mascot-sprite').classList.remove('live'));
  // Esc on the first visit = skip the tour (v4 §B.4); the progressive disclosure still applies (V9).
  d.addEventListener('cancel', () => {
    if (replay) return;
    startTour(false);
    writeJson(COACH_KEY, true);
  });
  if (welcomeNeeded(done().size, readTour(), coachDone())) openWelcome(false);
}

/** rerender(), DB status and download progress: language, Lily's pose and the "preparing" button follow. */
export function relabelWelcome(): void {
  if (dialog().open) draw();
}
```

**Sửa `index.html`** — thay:
```html
    <dialog id="inbox-dialog" aria-labelledby="inbox-title">
```
bằng:
```html
    <!-- v4 §B.2 layer 1 (Plan 7): welcome screen during the DB download, and the static tour replay; filled by src/ui/welcome.ts. -->
    <dialog id="welcome-dialog" class="w-[min(640px,calc(100vw-2rem))]" aria-labelledby="welcome-title"></dialog>
    <dialog id="inbox-dialog" aria-labelledby="inbox-title">
```

**Sửa `src/state.ts`** — thêm `import type { Lang } from './i18n';` (gộp với import i18n có sẵn nếu có) và thay:
```ts
  /** Opens the map dialog on a lane's brief (Plan 5). */
  openLane(_port: string): void {},
};
```
bằng:
```ts
  /** Opens the map dialog on a lane's brief (Plan 5). */
  openLane(_port: string): void {},
  /** Language switch from UI built after startup (the welcome screen); the top bar's VI|EN buttons do the same. */
  switchLang(_lang: Lang): void {},
};
```

**Sửa `src/main.ts`:**
- Import: `import { initTour, refreshTour } from './ui/coach';`, `import { initWelcome, relabelWelcome } from './ui/welcome';`.
- Trong `onDbStatus`, thay:
```ts
  if (!uiReady) return;
  renderTopbar();
```
bằng:
```ts
  if (!uiReady) return;
  renderTopbar();
  relabelWelcome(); // Lily wakes up, "I am new" becomes clickable
```
- Thay:
```ts
  app.loadProgress = p;
  if (uiReady) renderTopbar();
```
bằng:
```ts
  app.loadProgress = p;
  if (!uiReady) return;
  renderTopbar();
  relabelWelcome();
```
- Trong `rerender()`, thay:
```ts
  if (!byId('map').hidden) syncMap();
}
```
bằng:
```ts
  if (!byId('map').hidden) syncMap();
  refreshTour(); // the work area's slot is not rebuilt by a rerender
  relabelWelcome();
}
```
- Trong `Object.assign(actions, { … })`, thêm mục:
```ts
  switchLang: (l: Lang) => void setLang(l).then(() => {
    rerender();
    panel.refresh();
  }),
```
- Thay:
```ts
initSidebar();
startRouter(showRoute);
```
bằng:
```ts
initSidebar(); // its Esc (close the overlay) goes before the tour's
initTour();
startRouter(showRoute);
initWelcome();
```

- [ ] **Step 6: i18n**

**Sửa `src/i18n/vi.ts`:** xóa ba khóa `'coach.brief'`, `'coach.panel'`, `'coach.recap'`; thay dòng `'coach.hints'` bằng:
```ts
  'coach.hints': 'Việc này dạy kỹ năng mới. Đọc Bài học nhanh phía trên trước. Kẹt nữa thì mở Gợi ý: cả chương 1 gợi ý miễn phí, gợi ý đầu chỉ nhắc khái niệm.',
```
và thay `'nav.dashboard': 'Bảng điều hành',` bằng:
```ts
  'nav.dashboard': 'Bảng điều hành',
  'lock.afterTask1': 'Mở sau khi xong việc đầu tiên',
  'lock.afterTask2': 'Mở sau khi xong việc thứ hai',
  'tour.label': 'Hướng dẫn {i}/{n}',
  'tour.1': 'Mình là Boon, mình dẫn bạn qua việc đầu tiên. Đây là tin nhắn của {name}. Phần Yêu cầu là câu hỏi; thẻ Kết quả mong đợi cho biết cần mấy cột, mấy dòng.',
  'tour.2': 'Editor có sẵn một câu SQL. Bấm Chạy ({mod}+Enter).',
  'tour.3': 'Kết quả hiện ở đây. So với thẻ Kết quả mong đợi: số cột, số dòng. Dấu ✗ trên thẻ cho biết còn lệch.',
  'tour.4': 'Chưa biết sửa sao? Bài học một phút này chỉ cách làm. Bấm Chạy ví dụ.',
  'tour.5': 'Tên cột của mỗi bảng nằm ở tab Cột. Mở tab Cột.',
  'tour.6': 'Sửa câu SQL rồi Chạy lại tới khi thẻ hiện ✓ ✓.',
  'tour.7': 'Khớp rồi thì Nộp ({mod}+Shift+Enter).',
  'tour.8': 'Bạn vừa học {skill}. Việc tiếp theo dạy {next}. Xem cả chặng trong Lộ trình.',
  'tour.next': 'Tiếp',
  'tour.done': 'Xong',
  'tour.seePath': 'Xem lộ trình',
  'tour.skip': 'Bỏ qua hướng dẫn (Esc)',
  'welcome.title': 'Chào bạn! Mình là Lily.',
  'welcome.p1': 'Bạn là Data Analyst mới ở Cargo Query Logistics, Đà Nẵng. Đồng nghiệp gửi câu hỏi nghiệp vụ; bạn trả lời bằng SQL. 12 chương, từ thực tập sinh tới trưởng nhóm phân tích. Chọn ngôn ngữ:',
  'welcome.loopTitle': 'Một việc gồm 4 bước',
  'welcome.loop1': 'Đọc yêu cầu',
  'welcome.loop2': 'Viết SQL',
  'welcome.loop3': 'Chạy, so với thẻ Kết quả mong đợi',
  'welcome.loop4': 'Nộp',
  'welcome.loopNote': 'Chạy bao nhiêu lần cũng được, không mất gì. Chỉ Nộp mới được chấm.',
  'welcome.ask': 'Bạn đã biết SQL chưa?',
  'welcome.begin': 'Mới bắt đầu, hướng dẫn mình',
  'welcome.preparing': 'Đang chuẩn bị dữ liệu…',
  'welcome.knows': 'Đã biết SQL, bỏ qua',
  'welcome.tourTitle': '8 bước của hướng dẫn',
  'welcome.back': 'Quay lại',
  'welcome.next': 'Tiếp',
  'welcome.page': 'Bước {i}/{n}',
  'welcome.dbReady': 'Dữ liệu sẵn sàng!',
  'welcome.dbLoading': 'Lily ngủ trong lúc tải dữ liệu… {mb} MB',
  'welcome.lilySleep': 'Lily đang ngủ chờ dữ liệu',
  'welcome.lilyReady': 'Lily đã thức, sẵn sàng làm việc',
```

**Sửa `src/i18n/en.ts`:** xóa `'coach.brief'`, `'coach.panel'`, `'coach.recap'`; thay dòng `'coach.hints'` bằng:
```ts
  'coach.hints': 'This task teaches a new skill. Read the quick lesson above first. Still stuck? Open a hint: hints are free in all of chapter 1, and the first one only names the idea.',
```
và thay `'nav.dashboard': 'Dashboard',` bằng:
```ts
  'nav.dashboard': 'Dashboard',
  'lock.afterTask1': 'Opens after your first task',
  'lock.afterTask2': 'Opens after your second task',
  'tour.label': 'Tour {i}/{n}',
  'tour.1': 'I am Boon, and I will walk you through your first task. This is a message from {name}. The Task part is the question; the Expected result card says how many columns and rows you need.',
  'tour.2': 'The editor already holds a query. Press Run ({mod}+Enter).',
  'tour.3': 'Your result shows here. Compare it with the Expected result card: columns and rows. A ✗ on the card means it does not match yet.',
  'tour.4': 'Not sure how to fix it? This one-minute lesson shows how. Press Run the example.',
  'tour.5': 'The column names of each table are in the Columns tab. Open the Columns tab.',
  'tour.6': 'Edit the query and run it again until the card shows ✓ ✓.',
  'tour.7': 'When it matches, Submit ({mod}+Shift+Enter).',
  'tour.8': 'You just learned {skill}. The next task teaches {next}. See the whole path on the Learning path.',
  'tour.next': 'Next',
  'tour.done': 'Done',
  'tour.seePath': 'See the learning path',
  'tour.skip': 'Skip the tour (Esc)',
  'welcome.title': 'Hi! I am Lily.',
  'welcome.p1': 'You are the new Data Analyst at Cargo Query Logistics in Da Nang. Colleagues send business questions; you answer them with SQL. 12 chapters, from intern to analytics team lead. Pick a language:',
  'welcome.loopTitle': 'A task has 4 steps',
  'welcome.loop1': 'Read the request',
  'welcome.loop2': 'Write SQL',
  'welcome.loop3': 'Run it and compare with the Expected result card',
  'welcome.loop4': 'Submit',
  'welcome.loopNote': 'Run as often as you like, it costs nothing. Only Submit is graded.',
  'welcome.ask': 'Do you already know SQL?',
  'welcome.begin': 'I am new, show me around',
  'welcome.preparing': 'Preparing the data…',
  'welcome.knows': 'I know SQL, skip',
  'welcome.tourTitle': 'The 8 tour steps',
  'welcome.back': 'Back',
  'welcome.next': 'Next',
  'welcome.page': 'Step {i} of {n}',
  'welcome.dbReady': 'The data is ready!',
  'welcome.dbLoading': 'Lily naps while the data loads… {mb} MB',
  'welcome.lilySleep': 'Lily is napping while the data loads',
  'welcome.lilyReady': 'Lily is awake and ready to work',
```

- [ ] **Step 7: Chạy, thấy qua**

Run: `npx vitest run tests/onboarding.test.ts tests/coach.test.ts tests/i18n.test.ts tests/prefs.test.ts && npx tsc --noEmit && npm test && npm run build && node scripts/check-budget.mjs`
Expected: PASS; `main` +3–4 KB (ghi số).

- [ ] **Step 8: Edge (save mới: DevTools → Application → Clear site data; rồi Network "Slow 4G" để thấy lúc tải)**

1. Mở `#/`: màn chào (hộp thoại) che trang; Lily **ngủ**, "z" bay, đuôi không vẫy; dưới Lily "Lily ngủ trong lúc tải dữ liệu… x MB" tăng dần. Bước 1 đổi VI/EN được (chữ cả trang đổi theo). Bước 3: "Mới bắt đầu…" ghi "Đang chuẩn bị dữ liệu…" và bị tắt tới khi DB sẵn sàng, rồi Lily **thức** (đứng, vẫy đuôi).
2. "Mới bắt đầu": hộp thoại đóng, mở ch1-01, Boon (vịt xanh ngọc, kính) chỉ + "Hướng dẫn 1/8" trong khung đề, **không** che editor. "Tiếp" → bước 2 dưới hàng nút Chạy/Nộp. Chạy → bước 3 trong tab Kết quả. "Tiếp" → bước 4 ngay dưới thẻ Bài học nhanh. "Chạy ví dụ" → bước 5 (tab Kết quả). Mở tab Cột → bước 6. Chạy câu đúng số cột → bước 7. Nộp đúng → bước 8 trong Recap; "Xem lộ trình" → `#/learn`.
3. Tải lại giữa bước 5: tour tiếp ở bước 5–6 (không lùi về bước 2).
4. Nộp ngay ở bước 1 (gõ câu đúng): nhảy bước 8.
5. Esc lúc đang có dấu tour (focus ngoài editor, không có popup gợi ý): tour biến mất, không quay lại sau khi tải lại; Esc khi popup autocomplete đang mở chỉ đóng popup.
6. Save mới, bước 3 chọn "Đã biết SQL": không tour, thẻ Bài học nhanh là một dòng "Bài học nhanh: Chọn cột (SELECT) · Xem". Chip kỹ năng vẫn mở hộp thoại bài học.
7. Save cũ (đã có `completed`): không màn chào, không tour. Save mới bấm Esc trên màn chào: không tour.
8. Việc 2 (save mới, chưa bỏ qua): dấu Gợi ý mới (nhắc Bài học nhanh, gợi ý miễn phí ở chương 1).
9. Reduced motion: màn chào Lily đứng yên.

- [ ] **Step 9: Commit**

```bash
git add src/onboarding.ts src/ui/welcome.ts src/ui/coach.ts src/ui/brief.ts src/ui/tabs.ts src/ui/work.ts src/ui/lessonCard.ts src/state.ts src/main.ts index.html src/i18n/vi.ts src/i18n/en.ts tests/onboarding.test.ts tests/coach.test.ts
git commit -m "feat: welcome screen during the DB download (Lily) and Boon's 8-step tour on ticket 1, derived from progress, Esc skips (v4 P2 layers 1-2)" -m "Claude-Session: https://claude.ai/code/session_01PwPSBV1SVDP6quEZfKN56M"
```

---

### Task 8: F4 + v4 P2 lớp 3 · Mở dần tab và nav, trạng thái rỗng, xem lại hướng dẫn, chẩn đoán

**Files:** `src/ui/tabs.ts`, `src/ui/vizTabs.ts`, `src/ui/sidebar.ts`, `src/ui/modes.ts`, `src/ui/work.ts`, `src/session.ts`, `src/diagnostics.ts`, `src/main.ts`, `index.html`, `src/i18n/vi.ts`, `src/i18n/en.ts`, `tests/diagnostics.test.ts`, `tests/prefs.test.ts`

**Interfaces:**
- Consumes: `navLock`, `tabOpen`, `gated`, `readTour` (Task 7), `visibleTickets`, `openWelcome(true)`.
- Produces: `TabSpec.from?: string`; `SANDBOX_STARTER` (`src/session.ts`); `Diagnostics.onboarding?: { tourStep; skipped; ch1Hints; lessonsTried }`; `DiagnosticKind` thêm `'feedback'`; nút ⋯ "Xem lại hướng dẫn", "Sao chép chẩn đoán".

- [ ] **Step 1: Test hỏng trước**

**Sửa `tests/diagnostics.test.ts`** — thêm vào cuối `describe` của `buildDiagnostics` (khối có test "accepts non-object errors"):
```ts
  it('onboarding (v4 §B.6): chỉ số đếm và cờ, không chữ; sai dạng thì bỏ', () => {
    const base = { build: 'dev', kind: 'feedback' as const, userAgent: EDGE };
    expect(buildDiagnostics({ ...base, onboarding: { tourStep: 5, skipped: false, ch1Hints: [0, 2, 1, 0, 3], lessonsTried: 4 } }).onboarding)
      .toEqual({ tourStep: 5, skipped: false, ch1Hints: [0, 2, 1, 0, 3], lessonsTried: 4 });
    expect(buildDiagnostics({ ...base, onboarding: { tourStep: 'x', skipped: true, ch1Hints: [], lessonsTried: 0 } }).onboarding).toBeUndefined();
    expect(buildDiagnostics({ ...base, onboarding: { tourStep: 1, skipped: 1, ch1Hints: ['SELECT'], lessonsTried: 0 } }).onboarding).toBeUndefined();
    expect(buildDiagnostics(base)).toEqual({ build: 'dev', kind: 'feedback', ua: 'chrome' });
  });
```
**Sửa `tests/prefs.test.ts`** — thêm `import { readDraft, SANDBOX_STARTER, session } from '../src/session';` và `import { app } from '../src/state';` (nếu chưa có) và:
```ts
describe('Sandbox lần đầu (v4 §B.3)', () => {
  it('nháp trống hoặc chỉ khoảng trắng → câu mẫu; có chữ → giữ', () => {
    session.mode = { kind: 'sandbox' };
    app.save.sandboxDraft = '';
    expect(readDraft()).toBe(SANDBOX_STARTER);
    app.save.sandboxDraft = '  \n';
    expect(readDraft()).toBe(SANDBOX_STARTER);
    app.save.sandboxDraft = 'SELECT 1';
    expect(readDraft()).toBe('SELECT 1');
    session.mode = { kind: 'story' };
  });
});
```

Run: `npx vitest run tests/diagnostics.test.ts tests/prefs.test.ts`
Expected: FAIL (`onboarding` bị bỏ, `'feedback'` không phải `DiagnosticKind`, `SANDBOX_STARTER` chưa có).

- [ ] **Step 2: Chẩn đoán**

**Sửa `src/diagnostics.ts`** — thay:
```ts
export type DiagnosticKind = 'db-init-failed' | 'db-timeout' | 'worker-crash' | 'chunk-load-failed' | 'js-error';
```
bằng:
```ts
/** 'feedback': copied by hand from the ⋯ menu with no fault (v4 §B.6: the five-person test sends this string back). */
export type DiagnosticKind = 'db-init-failed' | 'db-timeout' | 'worker-crash' | 'chunk-load-failed' | 'js-error' | 'feedback';
/** v4 §B.6: counts and flags only (never SQL or text). */
export interface Onboarding { tourStep: number; skipped: boolean; ch1Hints: number[]; lessonsTried: number }
```
Thay:
```ts
  timings?: DiagnosticTimings;
  ua: UaFamily;
}
```
bằng:
```ts
  timings?: DiagnosticTimings;
  onboarding?: Onboarding;
  ua: UaFamily;
}
```
Thay:
```ts
  timings?: Partial<Record<keyof DiagnosticTimings, unknown>>;
  userAgent: string;
}
```
bằng:
```ts
  timings?: Partial<Record<keyof DiagnosticTimings, unknown>>;
  onboarding?: Partial<Record<keyof Onboarding, unknown>>;
  userAgent: string;
}
```
Thay:
```ts
function ms(v: unknown): number | undefined {
```
bằng:
```ts
const count = (v: unknown): number | undefined => (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 1000 ? v : undefined);

function ms(v: unknown): number | undefined {
```
Thay:
```ts
    if (bootMs !== undefined && seedMs !== undefined && readyMs !== undefined) d.timings = { bootMs, seedMs, readyMs };
  }
  return d;
```
bằng:
```ts
    if (bootMs !== undefined && seedMs !== undefined && readyMs !== undefined) d.timings = { bootMs, seedMs, readyMs };
  }
  const o = input.onboarding;
  if (o) {
    const tourStep = count(o.tourStep);
    const lessonsTried = count(o.lessonsTried);
    const hints = Array.isArray(o.ch1Hints) && o.ch1Hints.length <= 20 ? o.ch1Hints.map(count) : [undefined];
    if (tourStep !== undefined && lessonsTried !== undefined && typeof o.skipped === 'boolean' && hints.every((x) => x !== undefined)) {
      d.onboarding = { tourStep, skipped: o.skipped, ch1Hints: hints as number[], lessonsTried };
    }
  }
  return d;
```
(Thứ tự khóa trong `Diagnostics` đổi: `diagnosticsText` in theo object, test cũ so `toEqual` nên không ảnh hưởng.)

**Sửa `src/main.ts`** — thêm import `import { readTour } from './onboarding';`, `import { loadLessonPrefs } from './lessons';`, `import { coachDone } from './ui/coach';` (gộp với import `./ui/coach` của Task 7) và `import { openWelcome } from './ui/welcome';` (gộp). Trong `copyDiagnostics()` thay:
```ts
  const p = app.problem;
  if (!p) return;
```
bằng:
```ts
  const p = app.problem ?? { kind: 'feedback' as const }; // the ⋯ menu copies it with no fault (v4 §B.6)
```
và thay:
```ts
    build: __BUILD__, kind: p.kind, error: p.error, timings: { ...db.timings, readyMs }, userAgent: navigator.userAgent,
```
bằng:
```ts
    build: __BUILD__, kind: p.kind, error: 'error' in p ? p.error : undefined, timings: { ...db.timings, readyMs }, userAgent: navigator.userAgent,
    onboarding: {
      tourStep: readTour()?.step ?? 0,
      skipped: coachDone(),
      ch1Hints: app.tickets.filter((x) => x.chapter === 1).map((x) => app.save.hintsUsed[x.id] ?? 0),
      lessonsTried: loadLessonPrefs().tried.length,
    },
```
Thêm sau dòng `byId('notebook-btn').addEventListener(…)`:
```ts
byId('replay-btn').addEventListener('click', () => openWelcome(true)); // v4 D-O2: the static version (V10)
byId('diag-btn').addEventListener('click', () => void copyDiagnostics());
```

**Sửa `index.html`** — thay:
```html
        <button id="export-btn" type="button" popovertarget="more-menu" popovertargetaction="hide" class="flex w-full items-center gap-2 rounded-lg border-0 bg-transparent px-3 py-2 text-left hover:bg-code"><span data-icon="download" data-icon-class="size-4"></span><span data-i18n="top.export">Xuất tiến độ</span></button>
```
bằng:
```html
        <button id="replay-btn" type="button" popovertarget="more-menu" popovertargetaction="hide" class="flex w-full items-center gap-2 rounded-lg border-0 bg-transparent px-3 py-2 text-left hover:bg-code"><span data-icon="info" data-icon-class="size-4"></span><span data-i18n="tour.replay">Xem lại hướng dẫn</span></button>
        <button id="diag-btn" type="button" popovertarget="more-menu" popovertargetaction="hide" class="flex w-full items-center gap-2 rounded-lg border-0 bg-transparent px-3 py-2 text-left hover:bg-code"><span data-icon="copy" data-icon-class="size-4"></span><span data-i18n="diag.copy">Sao chép thông tin chẩn đoán</span></button>
        <button id="export-btn" type="button" popovertarget="more-menu" popovertargetaction="hide" class="flex w-full items-center gap-2 rounded-lg border-0 bg-transparent px-3 py-2 text-left hover:bg-code"><span data-icon="download" data-icon-class="size-4"></span><span data-i18n="top.export">Xuất tiến độ</span></button>
```

- [ ] **Step 3: Mở dần tab (D-O4)**

**Sửa `src/ui/tabs.ts`** — thêm import:
```ts
import { gated, readTour, tabOpen } from '../onboarding';
import { visibleTickets } from '../progress';
import { done } from '../state';
```
(gộp `done` vào dòng import `'../state'` có sẵn). Thay:
```ts
  /** Ticket id where this tab gets a "new" badge (e.g. 'ch3-01' for EXPLAIN). */
  newAt?: string;
```
bằng:
```ts
  /** Ticket id where this tab gets a "new" badge (e.g. 'ch3-01' for EXPLAIN). */
  newAt?: string;
  /** v4 D-O4 (V9): for a beginner from the welcome screen the tab appears once this ticket is reached. */
  from?: string;
```
Thay:
```ts
  bar.addEventListener('keydown', (e) => {
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    const n = buttons.length;
    const j = ({ ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 } as Record<string, number>)[e.key];
    if (j === undefined) return;
    e.preventDefault();
    buttons[j].focus();
  });
```
bằng:
```ts
  bar.addEventListener('keydown', (e) => {
    const shown = buttons.filter((b) => !b.hidden); // tabs not open yet (D-O4) are skipped
    const i = shown.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    const n = shown.length;
    const j = ({ ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 } as Record<string, number>)[e.key];
    if (j === undefined) return;
    e.preventDefault();
    shown[j].focus();
  });
```
Thay:
```ts
  function label(): void {
    tabs.forEach((tab, i) => {
```
bằng:
```ts
  function label(): void {
    const reached = new Set(visibleTickets(app.tickets, done()).map((x) => x.id));
    const isGated = gated(readTour());
    tabs.forEach((tab, i) => {
      buttons[i].hidden = !tabOpen(tab.from, reached, isGated) && tab.id !== active; // a chip may still open it on purpose
```

**Sửa `src/ui/vizTabs.ts`** — năm chỗ:
- thay `registerTab({ id: 'explain', label: 'tab.explain', group: 'query', order: 20, newAt: 'ch11-01', render: withPlan(renderExplain) });` bằng `registerTab({ id: 'explain', label: 'tab.explain', group: 'query', order: 20, newAt: 'ch11-01', from: 'ch11-01', render: withPlan(renderExplain) });`
- thay `registerTab({ id: 'flow', label: 'tab.flow', group: 'query', order: 30, render: withPlan(renderFlow) });` bằng `registerTab({ id: 'flow', label: 'tab.flow', group: 'query', order: 30, newAt: 'ch3-01', from: 'ch3-01', render: withPlan(renderFlow) });`
- thay `    id: 'steps',` bằng `    id: 'steps', from: 'ch1-03', newAt: 'ch1-03', // v4 §B.2: first ORDER BY`
- thay `    id: 'chart',` bằng `    id: 'chart', from: 'ch2-02', newAt: 'ch2-02', // first task with several groups`
- thay `    id: 'erd',` bằng `    id: 'erd', from: 'ch3-01', newAt: 'ch3-01', // first join`

- [ ] **Step 4: Khóa nav trong sidebar (D-O3, V9)**

**Sửa `src/ui/sidebar.ts`** — thêm `import { gated, navLock, readTour } from '../onboarding';`; thay:
```ts
    out.push(domainHead(), ...navItems('domain').map((n) => row({
      key: n.id, href: n.href, lead: icon(n.icon), label: t(n.label), current: n.current(route), onclick: n.onclick,
    })));
```
bằng:
```ts
    const order = app.tickets.map((x) => x.id);
    const isGated = gated(readTour());
    out.push(domainHead(), ...navItems('domain').map((n) => {
      const lock = navLock(n.id, done(), order, isGated);
      return row({ key: n.id, href: n.href, lead: icon(n.icon), label: t(n.label), current: n.current(route), onclick: n.onclick, lock: lock && t(lock) });
    }));
```

- [ ] **Step 5: Trạng thái rỗng (v4 §B.3)**

**Sửa `src/session.ts`** — thay:
```ts
  if (m.kind === 'sandbox') return app.save.sandboxDraft;
```
bằng:
```ts
  if (m.kind === 'sandbox') return app.save.sandboxDraft.trim() ? app.save.sandboxDraft : SANDBOX_STARTER;
```
và thêm trên hàm `readDraft`:
```ts
/** v4 §B.3: the first Sandbox visit starts from a small query instead of an empty editor (ports is open from chapter 1). */
export const SANDBOX_STARTER = 'SELECT * FROM ports LIMIT 20';
```

**Sửa `src/ui/work.ts`** — thay:
```ts
    historyBox.hidden = list.length === 0;
    historyBox.replaceChildren(
      h('summary', { class: 'cursor-pointer text-muted' }, t('hist.title', { n: list.length })),
```
bằng:
```ts
    historyBox.hidden = !ticket || !keepsWork(); // v4 §B.3: an empty history says what will appear there
    historyBox.replaceChildren(
      h('summary', { class: 'cursor-pointer text-muted' }, list.length ? t('hist.title', { n: list.length }) : t('hist.empty')),
```

**Sửa `src/ui/modes.ts`** — trong `reviewCard`, thay:
```ts
    due ? h('button', { type: 'button', class: cx(BTN_GO, 'px-4 py-2'), onclick: () => startToday() }, t('prac.today', { n: due })) : null);
```
bằng:
```ts
    due ? h('button', { type: 'button', class: cx(BTN_GO, 'px-4 py-2'), onclick: () => startToday() }, t('prac.today', { n: due })) : null,
    // v4 §B.3: nothing learned yet → one way forward.
    m.learned === 0 ? h('button', { type: 'button', class: cx(BTN_GO, 'px-4 py-2'), onclick: () => actions.selectTicket(app.tickets[0].id) }, t('prac.toFirst')) : null);
```

- [ ] **Step 6: i18n**

**`src/i18n/vi.ts`:** thay `'prac.locked': 'Xong việc đầu tiên thì kỹ năng bạn học được sẽ vào lịch ôn ở đây.',` bằng `'prac.locked': 'Chưa có gì để ôn. Học xong kỹ năng đầu tiên ở việc 1, kỹ năng đó sẽ vào hàng ôn.',`; thay `'nav.dashboard': 'Bảng điều hành',` bằng:
```ts
  'nav.dashboard': 'Bảng điều hành',
  'prac.toFirst': 'Tới việc 1',
  'hist.empty': 'Lịch sử: các lần chạy của bạn sẽ hiện ở đây (tối đa 15)',
  'tour.replay': 'Xem lại hướng dẫn',
```
**`src/i18n/en.ts`:** thay `'prac.locked': 'Once you finish your first task, the skills you learn are scheduled for review here.',` bằng `'prac.locked': 'Nothing to review yet. Learn your first skill in task 1 and it joins the review queue.',`; thay `'nav.dashboard': 'Dashboard',` bằng:
```ts
  'nav.dashboard': 'Dashboard',
  'prac.toFirst': 'Go to task 1',
  'hist.empty': 'History: your runs will show here (up to 15)',
  'tour.replay': 'Replay the tour',
```

- [ ] **Step 7: Chạy, thấy qua**

Run: `npx vitest run tests/diagnostics.test.ts tests/prefs.test.ts tests/onboarding.test.ts tests/i18n.test.ts && npx tsc --noEmit && npm test && npm run build && node scripts/check-budget.mjs`
Expected: PASS; `main` +1–2 KB.

- [ ] **Step 8: Edge**

1. Save mới → "Mới bắt đầu": tab dưới chỉ có Kết quả và Cột; ←/→ trên thanh tab bỏ qua tab ẩn. Xong ch1-02, mở ch1-03: tab Thứ tự thực thi hiện với chấm "mới". Tới ch2-02: Biểu đồ; ch3-01: Sơ đồ ER + Luồng dữ liệu (chấm "mới").
2. Sidebar domain ngày đầu: Sandbox, Dữ liệu có khóa + "Mở sau khi xong việc đầu tiên" (bấm không đi đâu; rail: tooltip); Bảng điều hành "Mở sau khi xong việc thứ hai"; xong ch1-01 → Sandbox, Dữ liệu mở. Lộ trình, Luyện SQL không bao giờ khóa.
3. Save cũ hoặc "Đã biết SQL": mọi tab và mục nav như trước Plan 7.
4. Luyện SQL ngày đầu: "Chưa có gì để ôn…" + nút "Tới việc 1" mở ch1-01. Lịch sử của việc chưa chạy: "Lịch sử: các lần chạy…". Sandbox lần đầu: editor có `SELECT * FROM ports LIMIT 20`; xóa sạch rồi tải lại: câu mẫu quay lại.
5. ⋯ → "Xem lại hướng dẫn": màn chào 3 bước, bước 3 là danh sách 8 bước (tên người gửi, kỹ năng điền đúng), "Đóng"; Esc đóng mà không ghi gì. ⋯ → "Sao chép thông tin chẩn đoán" khi không lỗi: dán ra có `kind: feedback` và khối `onboarding` (chỉ số, không SQL).

- [ ] **Step 9: Commit**

```bash
git add src/ui/tabs.ts src/ui/vizTabs.ts src/ui/sidebar.ts src/ui/modes.ts src/ui/work.ts src/session.ts src/diagnostics.ts src/main.ts index.html src/i18n/vi.ts src/i18n/en.ts tests/diagnostics.test.ts tests/prefs.test.ts
git commit -m "feat: progressive tabs and soft-locked nav for beginners, empty states, static tour replay, feedback diagnostics with onboarding counts (v4 P2 layer 3)" -m "Claude-Session: https://claude.ai/code/session_01PwPSBV1SVDP6quEZfKN56M"
```

---

### Task 9: F4 · Khoảnh khắc linh vật (V7)

**Files:** `src/ui/feedback.ts`, `src/ui/work.ts`, `src/ui/brief.ts`, `src/ui/modes.ts`, `src/ui/dashboard.ts`, `tests/sqlErrors.test.ts`

**Interfaces:**
- Consumes: `mascot`, `Mascot`, `Pose` (Task 3), `explainError`, `sqlErrorInfo`, `QueryTimeoutError`, `DbRestartError`.
- Produces: `mascotOf(error: unknown): [Mascot, Pose] | undefined` (`src/ui/feedback.ts`); `say(kind, view, who?)` trong `work.ts`.

- [ ] **Step 1: Test hỏng trước**

**Sửa `tests/sqlErrors.test.ts`** — thêm import `import { mascotOf } from '../src/ui/feedback';`, `import { DbRestartError, QueryTimeoutError } from '../src/db/client';` và một khối cuối file:
```ts
describe('mascotOf (V7: Boon giải thích lỗi, không linh vật khi không có gì để giải thích)', () => {
  it('lỗi Postgres có lời giải thích → Boon nghĩ; timeout/khởi động lại → Boon ối; còn lại → không', async () => {
    const run = await runner();
    const err = await run('SELECT cde FROM ports').then(() => undefined, (e: unknown) => e);
    expect(mascotOf(err)).toEqual(['boon', 'think']);
    expect(mascotOf(new QueryTimeoutError(5000))).toEqual(['boon', 'oops']);
    expect(mascotOf(new DbRestartError())).toEqual(['boon', 'oops']);
    expect(mascotOf(new Error('boom'))).toBeUndefined();
    expect(mascotOf(undefined)).toBeUndefined();
  });
});
```
Run: `npx vitest run tests/sqlErrors.test.ts`
Expected: FAIL (`mascotOf` chưa có).

- [ ] **Step 2: `mascotOf`**

**Sửa `src/ui/feedback.ts`** — thêm `import type { Mascot, Pose } from './mascots';` và cuối file:
```ts
/**
 * v6 §2.4 with the L57 roles (V7): Boon explains a Postgres error that has a teaching note (thinking), or a timeout / DB restart
 * (oops). Anything else gets no mascot. Lily's cheer on a correct answer is passed by work.ts itself.
 */
export function mascotOf(error: unknown): [Mascot, Pose] | undefined {
  if (error instanceof QueryTimeoutError || error instanceof DbRestartError) return ['boon', 'oops'];
  const info = sqlErrorInfo(error);
  return info && explainError(info) ? ['boon', 'think'] : undefined;
}
```

- [ ] **Step 3: Dòng phản hồi dưới nút Chạy/Nộp (không bao giờ trong editor hay tab Kết quả)**

**Sửa `src/ui/work.ts`** — thêm `import { mascot, type Mascot, type Pose } from './mascots';`, thêm `mascotOf` vào import `'./feedback'`, và:

Thay:
```ts
  let message: { kind: 'good' | 'bad'; view: () => Node | string } | undefined;
```
bằng:
```ts
  let message: { kind: 'good' | 'bad'; view: () => Node | string; who?: [Mascot, Pose] } | undefined;
```
Thay:
```ts
  function say(kind: 'good' | 'bad', view: () => Node | string): void {
    message = { kind, view };
    drawMessage();
  }
  function drawMessage(): void {
    feedback.className = message ? FEEDBACK[message.kind] : '';
    feedback.replaceChildren(message ? message.view() : '');
  }
```
bằng:
```ts
  /** `who`: a mascot beside the words (V7), at most one, in this line under the buttons only. */
  function say(kind: 'good' | 'bad', view: () => Node | string, who?: [Mascot, Pose]): void {
    message = { kind, view, who };
    drawMessage();
  }
  function drawMessage(): void {
    feedback.className = message ? FEEDBACK[message.kind] : '';
    const who = message?.who;
    feedback.replaceChildren(!message ? '' : who
      ? h('div', { class: 'flex items-start gap-3' }, mascot(who[0], who[1], 'size-12'), h('div', { class: 'min-w-0 flex-1' }, message.view()))
      : message.view());
  }
```
Bốn lời gọi có lỗi:
- thay `      say('bad', () => t('work.runFailed'));` bằng `      say('bad', () => t('work.runFailed'), mascotOf(r.error));`
- thay `      say('bad', () => errorView(error));` bằng `      say('bad', () => errorView(error), mascotOf(error));`
- thay `        say('bad', () => h('div', {}, err !== undefined ? errorView(err) : gradeMessage(fail), voice()));` bằng `        say('bad', () => h('div', {}, err !== undefined ? errorView(err) : gradeMessage(fail), voice()), mascotOf(err));`
- thay `      say('bad', () => errorView(e)); // timeout/restart/DB failure: errorText; Postgres error: its message and note` bằng `      say('bad', () => errorView(e), mascotOf(e)); // timeout/restart/DB failure: errorText; Postgres error: its message and note`

Hai lời gọi đúng (Lily reo; nhịp `celebrate` sẵn có là chuyển động duy nhất):
- thay `      say('good', () => t('work.stepDone', { i: i + 1 }));` bằng `      say('good', () => t('work.stepDone', { i: i + 1 }), ['lily', 'cheer']);`
- thay `      say('good', () => t('work.correct'));` bằng `      say('good', () => t('work.correct'), ['lily', 'cheer']);`

- [ ] **Step 4: Gợi ý (Boon nghĩ) và trạng thái rỗng (Lily ngủ)**

**Sửa `src/ui/brief.ts`** — thêm `import { mascot } from './mascots';`; thay:
```ts
    shown ? h('ol', { class: 'space-y-1' }, ...x.hints.slice(0, shown).map((s) => h('li', {}, richText(s)))) : null,
```
bằng:
```ts
    shown ? h('div', { class: 'flex items-start gap-3' }, mascot('boon', 'think', 'size-12'),
      h('ol', { class: 'min-w-0 flex-1 space-y-1' }, ...x.hints.slice(0, shown).map((s) => h('li', {}, richText(s))))) : null,
```

**Sửa `src/ui/modes.ts`** — thêm `import { mascot } from './mascots';`; trong `reviewCard` thay:
```ts
  return h('section', { class: cx(CARD, 'flex flex-wrap items-center gap-4 p-5'), 'aria-labelledby': 'review-title' },
    h('div', { class: 'min-w-0 flex-1' },
      h('h2', { id: 'review-title', class: 'm-0 text-lg font-bold' }, t('prac.section')),
```
bằng:
```ts
  return h('section', { class: cx(CARD, 'flex flex-wrap items-center gap-4 p-5'), 'aria-labelledby': 'review-title' },
    m.learned === 0 ? mascot('lily', 'sleep', 'size-16') : null, // v6 §2.4: an empty state
    h('div', { class: 'min-w-0 flex-1' },
      h('h2', { id: 'review-title', class: 'm-0 text-lg font-bold' }, t('prac.section')),
```

**Sửa `src/ui/dashboard.ts`** — thêm `import { mascot } from './mascots';`; thay:
```ts
      : h('div', { class: cx(CARD, 'p-5') },
        h('h3', { class: 'm-0 text-base font-bold' }, t('dash.emptyTitle')),
```
bằng:
```ts
      : h('div', { class: cx(CARD, 'p-5') },
        mascot('lily', 'sleep', 'size-16 mb-2'), // v6 §2.4: an empty state
        h('h3', { class: 'm-0 text-base font-bold' }, t('dash.emptyTitle')),
```

- [ ] **Step 5: Chạy, thấy qua**

Run: `npx vitest run tests/sqlErrors.test.ts tests/workRace.test.ts && npx tsc --noEmit && npm test && npm run build && node scripts/check-budget.mjs`
Expected: PASS; `main` +< 1 KB.

- [ ] **Step 6: Edge (sáng, tối, reduced motion)**

1. Chạy `SELECT cde FROM ports`: dòng đỏ dưới nút có Boon **nghĩ** (48 px) + "Truy vấn lỗi, xem chi tiết ở tab Kết quả"; tab Kết quả chỉ có thông điệp Postgres + lời giải thích, **không** linh vật. Nộp câu lỗi đó: Boon nghĩ cạnh lời giải thích.
2. Chạy câu sai kết quả rồi Nộp: không linh vật. Nộp đúng: Lily **reo** + "Đúng rồi" + nhịp pop một lần (không lặp). Bước của đánh giá thăng tiến: Lily reo sau mỗi bước.
3. Timeout (Sandbox: `SELECT count(*) FROM container_events a, container_events b`): Boon **ối** + lời timeout.
4. Mở gợi ý: Boon nghĩ cạnh danh sách gợi ý. Luyện SQL ngày đầu và Bảng điều hành chưa có card: Lily ngủ (không "z" bay ngoài màn chào).
5. Editor và bảng kết quả không có hình nào; không có animation lặp trong `#shell` (DevTools → Animations panel: trống khi đứng yên).

- [ ] **Step 7: Commit**

```bash
git add src/ui/feedback.ts src/ui/work.ts src/ui/brief.ts src/ui/modes.ts src/ui/dashboard.ts tests/sqlErrors.test.ts
git commit -m "feat: mascot moments - Lily cheers a correct answer, Boon explains errors and hints, Lily naps on empty states; never in the editor or results (v6 §2.4, L57)" -m "Claude-Session: https://claude.ai/code/session_01PwPSBV1SVDP6quEZfKN56M"
```

---

### Task 10: F5 · Danh sách "thở" (chương, kỹ năng, nhảy module trong sidebar)

**Files:** `src/home.ts`, `src/ui/homeView.ts`, `src/ui/sidebar.ts`, `src/i18n/vi.ts`, `src/i18n/en.ts`, `tests/home.test.ts`

**Interfaces:**
- Consumes: `listRow`, `LIST`, `GROUP_TITLE` (Task 5), `chapterColor`, `skillIcon`.
- Produces: `reliesOn(tickets, chapter): string[]` (`src/home.ts`); id `skills-ch-<n>` trên trang Luyện SQL.

- [ ] **Step 1: Test hỏng trước**

**Sửa `tests/home.test.ts`** — thêm `reliesOn` vào import từ `'../src/home'` và:
```ts
describe('reliesOn (v5 §B.9: "Dựa vào" của chương)', () => {
  it('hợp requires ∪ grants của các việc trong chương, theo thứ tự gặp, không trùng', () => {
    const tk = (chapter: number, requires: string[], grants: string[]) => ({ chapter, requires, grants }) as unknown as Ticket;
    const tickets = [tk(1, [], ['select']), tk(2, ['select'], ['aggregate']), tk(2, ['where', 'select'], ['group_by'])];
    expect(reliesOn(tickets, 2)).toEqual(['select', 'aggregate', 'where', 'group_by']);
    expect(reliesOn(tickets, 3)).toEqual([]);
  });
});
```
(thêm `import type { Ticket } from '../src/tickets';` nếu file chưa có.)

Run: `npx vitest run tests/home.test.ts` → FAIL (`reliesOn` chưa có).

- [ ] **Step 2: `reliesOn`**

**Sửa `src/home.ts`** — thêm sau `learnedSkills`:
```ts
/** v5 §B.9: a chapter relies on what its tickets require or teach (requires ∪ grants), in first-seen order. */
export const reliesOn = (tickets: Ticket[], chapter: number): string[] =>
  [...new Set(tickets.filter((t) => t.chapter === chapter).flatMap((t) => [...t.requires, ...t.grants]))];
```

- [ ] **Step 3: Chương ở Tổng quan thành danh sách**

**Sửa `src/ui/homeView.ts`** — xóa `SKILL_ROW`, `skillRow()`, `chapterCard()` (cùng chú thích của chúng); giữ `statusPill()`. Thêm `reliesOn` vào import `'../home'`. Thay toàn bộ hàm `chaptersSection`:
```ts
function chaptersSection(m: HomeModel): HTMLElement {
  return h('section', { 'aria-labelledby': 'chapters-title' },
    h('div', { class: 'mb-3 flex flex-wrap items-end justify-between gap-2' },
      h('h2', { id: 'chapters-title', class: 'm-0 text-lg font-bold' }, t('home.chapters', { n: m.chapters.length })),
      h('p', { class: 'm-0 text-sm text-muted' }, t('home.chaptersIntro'))),
    h('div', { class: 'grid gap-4 sm:grid-cols-2 lg:grid-cols-4' }, ...m.chapters.map(chapterCard)));
}
```
bằng:
```ts
/**
 * v6 §3.4 (F5, L47 #6): one row per chapter, the same shape whatever its content: number/✓/lock · title · one line
 * ("Relies on: Filter rows, Sort +2", or what opens it) · one status pill that links to the chapter's module.
 */
function chapterRow(c: ChapterCard): HTMLLIElement {
  const lang = getLang();
  const closed = c.status === 'locked' || c.status === 'soon';
  const uses = reliesOn(app.tickets, c.chapter).map((id) => SKILLS.find((s) => s.id === id)?.label[lang] ?? id);
  const short = uses.length > 2 ? `${uses.slice(0, 2).join(', ')} +${uses.length - 2}` : uses.join(', ');
  return listRow({
    lead: closed
      ? icon('lock', 'size-5 text-muted')
      : c.status === 'done'
        ? h('span', { class: 'grid size-10 place-items-center rounded-full bg-emerald-700 text-white' }, icon('check', 'size-5'))
        : h('span', { class: cx('grid size-10 place-items-center rounded-full text-lg font-bold', chapterColor(c.chapter).chip) }, String(c.chapter)),
    title: `${c.chapter} · ${chapterTitle(c.chapter, lang)}`,
    sub: closed ? (c.status === 'soon' ? t('home.soonHint') : t('home.lockedAfter', { n: c.chapter - 1 })) : t('home.reliesOn', { skills: short }),
    action: closed ? null : h('a', { href: `${hashOf('learn')}/sql/${c.chapter}`, class: 'no-underline', title: t('learn.module', { n: c.chapter, title: chapterTitle(c.chapter, lang) }) }, statusPill(c)),
    current: c.status === 'current',
  });
}

function chaptersSection(m: HomeModel): HTMLElement {
  return h('section', { 'aria-labelledby': 'chapters-title' },
    h('div', { class: 'mb-3 flex flex-wrap items-end justify-between gap-2' },
      h('h2', { id: 'chapters-title', class: 'm-0 text-lg font-bold' }, t('home.chapters', { n: m.chapters.length })),
      h('p', { class: 'm-0 text-sm text-muted' }, t('home.chaptersIntro'))),
    h('ul', { class: LIST }, ...m.chapters.map(chapterRow)));
}
```

- [ ] **Step 4: Kỹ năng ở Luyện SQL thành danh sách theo module**

Xóa hàm `skillCard()`; thay toàn bộ hàm `skillsSection`:
```ts
function skillsSection(m: HomeModel): HTMLElement {
  return h('section', { 'aria-labelledby': 'skills-title' },
    h('h2', { id: 'skills-title', class: 'mb-3 text-lg font-bold' }, t('home.skills')),
    h('div', { class: 'grid gap-3 sm:grid-cols-3 lg:grid-cols-4' }, ...m.skills.map(skillCard)),
    h('p', { class: 'mt-2 mb-0 text-sm text-muted' }, t('home.skillsHint')));
}
```
bằng:
```ts
/** Practise SQL (v6 §3.3–3.4): skills grouped by module, one row each, one action ("Practise") once learned. */
function skillsSection(m: HomeModel): HTMLElement {
  const lang = getLang();
  const onSkill = homeHooks.onSkill;
  const groups = CHAPTERS.map((c) => [c.chapter, m.skills.filter((s) => s.skill.chapter === c.chapter)] as const).filter(([, list]) => list.length > 0);
  return h('section', { class: 'space-y-10', 'aria-labelledby': 'skills-title' },
    h('h2', { id: 'skills-title', class: 'sr-only' }, t('home.skills')),
    ...groups.map(([n, list]) => h('div', { id: `skills-ch-${n}`, class: 'scroll-mt-4' },
      h('h3', { class: GROUP_TITLE }, t('learn.module', { n, title: chapterTitle(n, lang) })),
      h('ul', { class: LIST }, ...list.map((s) => listRow({
        lead: h('span', { class: cx('grid size-10 place-items-center rounded-full', s.state === 'locked' ? 'bg-code text-muted' : chapterColor(n).chip) }, skillIcon(s.skill.id)),
        title: s.skill.label[lang],
        sub: s.state === 'locked' ? t('brief.chapter', { n }) : s.state === 'learned' ? t('home.level', { n: s.level, max: LEVELS }) : t('home.skillOpen'),
        action: onSkill && s.state === 'learned' ? h('button', { type: 'button', class: 'rounded-full px-4 whitespace-nowrap', onclick: () => onSkill(s.skill.id) }, t('prac.skillGo')) : null,
      }))))),
    h('p', { class: 'm-0 text-sm text-muted' }, t('home.skillsHint')));
}
```
(`SkillCard` vẫn là kiểu của `m.skills`; nếu import `type SkillCard` không còn dùng thì bỏ.)

- [ ] **Step 5: Sidebar Luyện SQL nhảy tới module**

**Sửa `src/ui/sidebar.ts`** — thay:
```ts
    out.push(row({ key: 'today', href: hashOf('practice'), lead: icon('repeat'), label: t('side.today', { n: reviewCount() }), current: true }));
```
bằng:
```ts
    const lang = getLang();
    out.push(row({ key: 'today', href: hashOf('practice'), lead: icon('repeat'), label: t('side.today', { n: reviewCount() }), current: true }),
      h('p', { class: GROUP }, t('side.byModule')),
      ...CHAPTERS.filter((c) => SKILLS.some((s) => s.chapter === c.chapter)).map((c) => row({
        key: `p${c.chapter}`, href: hashOf('practice'), lead: h('b', {}, String(c.chapter)), label: chapterTitle(c.chapter, lang), current: false,
        onclick: () => document.getElementById(`skills-ch-${c.chapter}`)?.scrollIntoView({ block: 'start' }),
      })));
```

- [ ] **Step 6: i18n**

**`src/i18n/vi.ts`** — thay `'nav.dashboard': 'Bảng điều hành',` bằng:
```ts
  'nav.dashboard': 'Bảng điều hành',
  'home.reliesOn': 'Dựa vào: {skills}',
  'prac.skillGo': 'Luyện',
  'side.byModule': 'Kỹ năng theo module',
```
**`src/i18n/en.ts`** — thay `'nav.dashboard': 'Dashboard',` bằng:
```ts
  'nav.dashboard': 'Dashboard',
  'home.reliesOn': 'Relies on: {skills}',
  'prac.skillGo': 'Practise',
  'side.byModule': 'Skills by module',
```

- [ ] **Step 7: Chạy, thấy qua**

Run: `npx vitest run tests/home.test.ts tests/i18n.test.ts tests/theme.test.ts && npx tsc --noEmit && npm test && npm run build && node scripts/check-budget.mjs`
Expected: PASS; `main` gần như không đổi (bỏ thẻ chương/kỹ năng cũ bù cho dòng mới).

- [ ] **Step 8: Edge (UX review theo L55 sau bước này)**

1. Tổng quan: 12 dòng chương cao bằng nhau; dòng đang học có vạch trái xanh ngọc + nền nhạt; mỗi dòng **một** dòng phụ ("Dựa vào: Chọn cột (SELECT), Lọc dòng (WHERE) +2" hoặc "Mở sau chương n") và **một** viên trạng thái (bấm → `#/learn/sql/n`). Không còn chip kỹ năng chồng nhau.
2. Luyện SQL: nhóm "MODULE 1 · …" chữ hoa nhỏ màu muted, nhóm cách nhau rộng; dòng kỹ năng đã học có "Mức nhớ n/5" + nút "Luyện"; sidebar "Kỹ năng theo module" cuộn tới đúng nhóm.
3. Trang chủ, Lộ trình, Bản đồ, Sắp có: cùng kiểu dòng; 375 px không cuộn ngang, nút không bị đẩy xuống dòng xấu.
4. Tối: vạch, nền, chữ phụ đọc rõ (Lighthouse không báo contrast).
5. Gọi agent UI/UX review luồng (L55) và agent model **fable** đánh giá lại nhận định; ghi kết quả vào `docs/team/review-log.md` (orchestrator).

- [ ] **Step 9: Commit**

```bash
git add src/home.ts src/ui/homeView.ts src/ui/sidebar.ts src/i18n/vi.ts src/i18n/en.ts tests/home.test.ts
git commit -m "feat: airy lists - chapters as one-line rows with 'relies on', practise skills grouped by module, sidebar jumps (v6 F5)" -m "Claude-Session: https://claude.ai/code/session_01PwPSBV1SVDP6quEZfKN56M"
```

---

### Task 11: CLAUDE.md, kiểm toàn bộ, kiểm deploy

**Files:** `CLAUDE.md`

- [ ] **Step 1: Cập nhật `CLAUDE.md`**

Áp các thay đổi sau (mỗi gạch = một chỗ; giữ văn phong ngắn của file):
- Dòng mở đầu: thay `Cargo Query: browser game for learning PostgreSQL as a data analyst at a fictional freight forwarder.` bằng `BoonData (L57; the fictional company in the Logistics domain is Cargo Query Logistics): browser game for learning PostgreSQL as a data analyst. Repo, URL, package name and every localStorage key (cargo-query-save, cargo-query/*) keep the old name: renaming a key loses players' progress.`
- Mục Architecture, gạch `src/db/worker.ts`: thêm câu `initDb creates schema logistics (GAME_SCHEMA, src/domains.ts, the only source of schema names) and sets search_path before schema.sql + seed.sql, so public stays empty; the session path is logistics, sandbox. runLab compares pg_class.relname, never regclass text.`
- Thay gạch "UI: plain TypeScript DOM … Three views …" phần route bằng: `Routes (src/route.ts, pure; Plan 7): #/ (platform Home), #/learn[/sql/<n>], #/practice, #/d/logistics (Overview), …/play, …/data[/<table>], …/dashboard, …/map, #/d/<finance|ecommerce> (Coming soon). Old #/play, #/data[/t], #/dashboard are aliases kept forever (canonicalHash; ui/router.ts replaces them in place). Practice runs and the Sandbox stay session modes inside play (V5). Every reading page renders into <main id="home"> from sections registered with pages: Page[] (ui/homeView.ts); play/data/dashboard keep their own <main>.`
- Thêm gạch: `Navigation (Plan 7, v6 §3): registerNav items have area 'top' (top bar #nav, mobile #bottom-nav) or 'domain' (left sidebar #side and the mobile drawer <dialog id="side-drawer">, src/ui/sidebar.ts). Width is CSS only (body[data-route], body[data-side], #side[data-overlay], container query for the 64 px rail): no sidebar on Home, rail on play and from 1024 to 1279 px, 256 px on wide reading pages unless the cargo-query/sidebar pref is 'rail'. The rail's overlay never resizes the splitter frame. The Data page's table list moves into the sidebar from 1024 px (sideExtra()).`
- Thêm gạch: `Mascots (L57, v6 §1): Lily (dog, the player's buddy) and Boon (duck, the guide), six poses each as <symbol>s in index.html's #mascot-sprite (art CC BY 4.0, assets/mascots/LICENSE); src/ui/mascots.ts mascot(who, pose) only adds a <use>. Colours are --lily-*/--boon-* tokens. Idle loops run only while #mascot-sprite has class live (welcome screen). At most one mascot per region, never in the editor or the Result tab; decorative ones are aria-hidden. Moments: welcome (Lily sleep → idle), tour (Boon point), correct (Lily cheer), error with a teaching note (Boon think), timeout/restart (Boon oops), hints (Boon think), empty states (Lily sleep), Coming soon (Boon idle).`
- Thêm gạch: `Onboarding (Plan 7, v4 P2): src/onboarding.ts is pure (pref cargo-query/tour = { step, knows }, tourStep derived from what the player did on ticket 1, gated, navLock, tabOpen). src/ui/welcome.ts shows the welcome dialog to new players only (no completed, no tour pref, coach not skipped); the ⋯ menu replays it statically. src/ui/coach.ts places Boon's tour marks in slots inside regions (tourSlot: brief, lesson, work, panel, recap; refreshTour after rerender, tab clicks and example runs); Esc skips unless a modal, the completion dock or CodeMirror owns Esc. Finishing the tour does not set coach-done (that means "skipped"). Progressive disclosure (TabSpec.from, sidebar locks) applies only to beginners from the welcome screen.`
- Gạch Styling: thay câu token đầu bằng `src/style.css keeps the colour tokens (warm v6 palette: --bg cream, --accent teal, --sun/--sun-ink for Boon's bubbles and XP; light on :root, dark on :root[data-theme=dark]) …`, thêm `Radii: --r-card 20 px, --r-ctl 14 px (rounded-(--r-card)), main buttons are pills. Text pairs are checked by tests/theme.test.ts (contrast ≥ 4.5:1 in both themes). UI font: Nunito Variable, self-hosted (src/assets/fonts, OFL, latin + vietnamese woff2 only). Plain CSS also covers the frame/sidebar and the mascot loops.`
- Gạch localStorage keys: thêm `cargo-query/sidebar` (`'open' | 'rail'`), `cargo-query/tour` (`{ step, knows }`).
- Gạch dependencies: thêm `No font package: the two Nunito woff2 files and OFL.txt are copied from @fontsource-variable/nunito 5.3.0.`
- Gạch commands: thêm `budget groups now include fonts (woff2, 60 KB); main ceiling 290 KB (Plan 7 V1).`
- Thêm một dòng giấy phép: `Licences: code MIT (LICENSE), mascot art CC BY 4.0 (assets/mascots/LICENSE), Nunito OFL 1.1 (src/assets/fonts/OFL.txt).`

- [ ] **Step 2: Kiểm toàn bộ**

Run: `npm test && npx tsc --noEmit && npm run build && node scripts/check-budget.mjs && grep -rn "'public'" src tests | wc -l && grep -rln "Bin\b\|Mây\|cô Mây" src index.html | wc -l`
Expected: mọi test PASS; tsc sạch; mọi nhóm `ok` (`main` ≤ 290, `fonts` ≈ 51/60, `css` ≤ 20); `0` và `0`.

- [ ] **Step 3: Kiểm deploy (bản build local)**

Run: `npm run build -- --base=/data-training-platform/`, rồi ở cửa sổ khác `npx vite preview --port 5174 --strictPort --base=/data-training-platform/`, rồi `bash scripts/check-deploy.sh http://localhost:5174/data-training-platform/`; xong thì `npm run build` lại (base mặc định).
Expected: mọi dòng `ok` (có `index-*.css` và hai `nunito-*-wght-normal-*.woff2`, content-type `font/woff2`), `favicon.svg` 200 dưới base. (Deploy thật lên GitHub Pages: user làm, L6/L52.)

- [ ] **Step 4: Checklist Edge cuối (1440 / 1100 / 375 px, sáng / tối, reduced motion)**

1. Save mới đi trọn: màn chào → tour 8 bước → xong ch1-01 → ch1-02 (dấu Gợi ý) → mở khóa Sandbox, Dữ liệu → xong ch1-02 → Bảng điều hành mở.
2. Save cũ (Xuất từ HEAD trước Plan 7, Nhập lại): tiến độ, nháp, card dashboard còn đủ; không màn chào; mọi tab; bookmark `#/play`, `#/data/ports` chuyển đúng.
3. Mỗi route có `<h1>` (đọc màn hình: Trang chủ, Lộ trình, Luyện SQL, Tổng quan, Bản đồ, Sắp có), Tab đi qua thanh trên → sidebar → nội dung theo thứ tự hợp lý; focus luôn thấy được (viền xanh ngọc).
4. Không cuộn ngang ở 375 px trên mọi route; vùng chạm thanh dưới ≥ 44 px.
5. Không lỗi console; Lighthouse Accessibility ≥ điểm trước Plan 7 trên Trang chủ và Làm việc.
6. Khởi động lạnh (L46): thời gian tới "Database sẵn sàng" không tăng quá 0,5 s so với trước Plan 7 (font + sprite là tải song song).

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: CLAUDE.md notes for Plan 7 (BoonData, schema logistics, routes, sidebar, mascots, onboarding, fonts, budgets)" -m "Claude-Session: https://claude.ai/code/session_01PwPSBV1SVDP6quEZfKN56M"
```

---

## Rủi ro và cách giảm

| Rủi ro | Giảm thiểu |
|---|---|
| Main vượt 290 KB (V1) | Đo sau mỗi task; luật dừng. Nếu vượt: báo user (nâng trần, hoặc rút gọn chữ VI trong main); **không** tách `welcome.ts`/tour bằng `import()` (Plan 6 U3: Rolldown kéo code dùng chung ra chunk preload tĩnh). |
| Sidebar + thanh việc + thanh trên = 3 tầng điều hướng (v6 §8) | Làm việc mặc định rail; danh sách việc trong sidebar chỉ hiện khi mở đè; tour chỉ một đường. Buổi thử 5 người (v4 §B.6) hỏi riêng về sidebar. |
| Tour lệch khi Plan 6 đổi DOM bài học | Tour chỉ phụ thuộc `markExampleRan()` và `loadLessonPrefs()`; bước 4 tự qua nếu việc 1 không có bài học. |
| Esc vừa bỏ tour vừa đóng thứ khác | Thứ tự: overlay sidebar (đăng ký trước, `preventDefault`) → hộp thoại modal / dock hoàn thành (tour bỏ qua) → CodeMirror (đã `preventDefault`) → tour. Kiểm ở Task 7 Step 8 mục 5. |
| `search_path` sai làm query chạy nhầm schema | Tên schema chỉ từ `GAME_SCHEMA`; test "public trống, 26 bảng ở logistics, path = logistics, sandbox"; người chơi tự `set_config` vẫn bị rollback (test cũ). |
| Font làm chậm lần tải đầu | 2 file, 52 KB, `font-display: swap`, `unicode-range` (trang EN không tải file vietnamese). |
| Đổi token làm lệch màu cú pháp | Test tương phản gồm `--syn-*` trên `--panel` và `--code` cả hai theme (đo: ≥ 4,89). |
| Linh vật vẫn bị thấy giống nhân vật nổi tiếng | Hình giữ đúng mockup đã duyệt (L57); test cấm tên "Snoopy/Donald/Duck"; bảng §1.1 v6 làm checklist review. |
| Tên chủ bản quyền MIT sai (V13) | Cần user xem trước khi commit Task 3; sửa một dòng ở `LICENSE` và `assets/mascots/LICENSE`. |

## Đã kiểm khi viết plan (2026-11-17)

| Kiểm gì | Kết quả |
|---|---|
| Seed vào `logistics` (Node, PGlite 0.5.16 của `node_modules`, `schema.sql`/`seed.sql` của HEAD) | 26 bảng ở `logistics`, `public` 0 bảng; md5 `ports` = `ec1c84dd…f7`, `shipments` = `84be2f8c…46` (trùng pin trong `tests/seed.test.ts`); `SHOW search_path` = `logistics, sandbox`. |
| `regclass` trong phòng thí nghiệm chỉ mục | Với path `logistics, sandbox`: `indrelid::regclass::text` = `relname` = `container_events`. Dùng `relname` để khỏi phụ thuộc path (V16). |
| Lỗi `SELECT * FROM public.ports` | `42P01`, `relation "public.ports" does not exist` → regex `^relation "public\.`. |
| Tương phản 52 cặp (WCAG 2.x) | Mọi cặp chữ ≥ 4,5:1 cả hai theme; thấp nhất `syn-comment/code` sáng 4,89, `accent/sea` sáng 4,79 (không dùng làm chữ), `muted/sea` 5,40. `--disabled` 3,4–3,8 (miễn trừ, không vào test). |
| `@fontsource-variable/nunito` | 5.3.0, OFL-1.1, phát hành 2026-07-19; `nunito-latin-wght-normal.woff2` 39.128 B, `nunito-vietnamese-wght-normal.woff2` 13.096 B; LICENSE không khai báo Reserved Font Name. |
| Ngân sách hiện tại (`vite build` ra thư mục tạm, HEAD `f54da74` + cây làm việc) | main 268/270, tickets 104/110, lanes 10, en 12, lessons 8, css 12/20, worker 144, pglite 5287, initdb 128, parser 390, rest 1483/1560. |
| Sprite linh vật (mockup v9 dòng 87–137, đổi tên) | 12 tư thế, 25 id, 12.306 B thô, 2.320 B gzip; không còn `bin`/`may`. |
| Grep `'public'` | 11 chỗ (Task 0 liệt kê); `content/` và `seed.sql` không có `public.`/`search_path`. |
| Grep "Cargo Query" ngoài `content/`, `docs/team`, plan | `index.html` (title, h1), `src/main.ts` (tên file xuất), `CLAUDE.md`, `docs/ops/deploy.md`, `seed.sql` (chú thích, giữ), i18n `brief.story`/`save.invalid`/`data.intro`. Không có README hay manifest (Task 3 tạo README; favicon thay manifest). |
