# Cargo Query — Plan 1d: Tailwind CSS v4, Trang chủ Tiên Sa và toàn bộ thiết kế đã duyệt (L17–L31)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuyển toàn bộ UI sang Tailwind CSS v4 (bản miễn phí, `@tailwindcss/vite`) và thêm Trang chủ (`#/`) cạnh màn làm bài (`#/play`), rồi làm **toàn bộ thiết kế đã duyệt**:
- khung **12 chương**, mỗi chương một màu, thang nghề và topbar hiện chức danh (L27, L30, L19);
- **dàn đồng nghiệp** có vai trò nghiệp vụ thật, chân dung SVG vẽ bằng code, hộp thư dạng chat (L18);
- Trang chủ theo `home-v4.html`: cảnh **cảng Tiên Sa** có hoạt cảnh, bản đồ tuyến từ Tiên Sa, card Tiếp tục dạng tin nhắn, lộ trình sự nghiệp, 12 card chương, bảng điều hành KPI dễ đọc (L21, L23, L26);
- **8 hoạt cảnh khi xong việc** theo `completion-animations.md` (L29, L31);
- **đề bài viết lại** thành câu hỏi nghiệp vụ, nhãn cột `{ vi, en }` (L24, L25), ngôn từ "Đánh giá thăng tiến" thay "boss" (L22).

**Architecture:** Token màu hiện có (`--bg`, `--panel`, `--accent`… trong `:root` + khối `prefers-color-scheme: dark`) giữ nguyên tên và được nối vào Tailwind bằng `@theme inline`, nên utility trung tính (`bg-panel`, `text-muted`, `ring-line`) tự đổi theo dark mode; chỉ màu trang trí (chương, phòng ban) cần `dark:`. Một lớp `@layer base` (button, heading, table, dialog…) và `@layer components` nhỏ (`.muted .actions .primary pre.sql .error .stale .tag .good .bad .warn`) giữ "từ vựng chung" mà Plan 1b/1c/Import đang dùng. Logic mới là hàm thuần có unit test (`src/theme.ts`, `src/route.ts`, `src/home.ts`); DOM nằm ở `src/ui/router.ts`, `src/ui/homeView.ts`. Hai view (`<main id="home">`, `<main id="shell">`) cùng được mount, chỉ bật/tắt `hidden`, nên editor không bao giờ bị tạo lại khi đổi route.

Phần logic mới đều là hàm thuần có test:
- `src/scene.ts`: `sceneOf`, `derive`, tuyến, thời lượng hoạt cảnh;
- `src/people.ts`: dàn nhân vật;
- `src/home.ts`: view-model và KPI;
- `rankOf` trong `src/progress.ts`.

Hình ảnh là SVG dựng bằng `createElementNS` (`src/ui/svg.ts`), không `innerHTML`. Hoạt cảnh là một bộ tween `requestAnimationFrame` nhỏ (`src/ui/stage.ts`), không thư viện.

**Tech Stack:** như Plan 1 + `tailwindcss` **4.3.5** và `@tailwindcss/vite` **4.3.5** (devDependencies, pin exact). Không thêm gì khác: không Tailwind UI/Plus, không router, không jsdom, không thư viện animation hay icon.

**Spec / quyết định:** `docs/team/decision-log.md` **L17–L31** (L-số mới thắng chữ cũ):
- L17: Tailwind, Trang chủ.
- L18: đồng nghiệp, cảnh cảng, thang nghề, KPI.
- L19: thăng tiến theo cột mốc.
- L21: card chương căn giữa, khóa mờ, hover hiện bước tiếp theo.
- L22: không giọng "boss".
- L23: chữ dễ đọc, KPI trung tính.
- L24/L25: đề nghiệp vụ, nhãn `{ vi, en }`.
- L26: Tiên Sa là trung tâm.
- L27/L30: 12 chương.
- L29/L31: hoạt cảnh, Laem Chabang.

Thiết kế chi tiết:
- `docs/team/curriculum.md` (12 chương, bậc nghề, bảng mở theo chương, màu 8–12);
- `docs/team/problem-design.md` §1–3 (đề viết lại cho 15 ticket);
- `docs/team/completion-animations.md` (8 hoạt cảnh, `scene:`, `sceneOf`);
- `docs/team/product-design-v2.md` ★1–★5.

Mockup (`.superpowers/brainstorm/11840-1794844744/content/`):
- `home-v4.html` là **tham chiếu hình ảnh**: cảnh Tiên Sa, bản đồ tuyến, 12 card chương.
- `home-v3.html`: bố cục card Tiếp tục dạng tin nhắn, lộ trình sự nghiệp, bảng KPI dễ đọc.
- `completion-v5.html`: hình học bãi/cẩu/xe/cổng, tọa độ tuyến, thời lượng.
- `home-tailwind.html`: màu L17.

Quyết định cũ vẫn giữ:
- L12: topbar ghi tên chương, nay là `Chương n/{tổng}: <tên>`.
- L13: màu cú pháp editor bằng `--syn-*`; **không** chép editor nền tối của mockup.

**Thứ tự:** chạy ngay sau các bản sửa lỗi Plan 1, **trước** Plan 1b (L17).

> **⚠ File trên đĩa thắng listing trong plan (L7).** Phần Tailwind của plan viết trên commit `16d38b1`; các task 11+ viết trên `d0acca5` (chỉ thêm tài liệu, `src/` không đổi).
> - Mọi bước "Modify" ghi dạng *tìm dòng cũ → thay dòng mới*. Trước mỗi task, đọc lại file trên đĩa, giữ mọi thay đổi logic người khác đã commit, chỉ áp phần chênh của plan.
> - Nếu một dòng "cũ" không còn y hệt, tìm đoạn tương đương theo ngữ nghĩa và áp cùng thay đổi; không khôi phục code cũ.
> - Grep ở Step 0 / Task 0 trả sai: **sửa tiếp (fix forward)** và ghi lại trong mô tả commit, không dừng.
> - Code đầy đủ có cho mọi **file mới** và **test**. "Dòng cũ" của task sau trích đúng như dòng đó trông sau các task trước của plan này.

## Global Constraints

- Mọi ràng buộc Plan 1 vẫn áp dụng: PGlite **0.5.16**; dependency mới cài `--save-exact`; không `innerHTML` (chỉ `h()`/`append`/`textContent`); mọi `localStorage` qua `readJson`/`writeJson` (`src/storage.ts`, đã bọc try/catch).
- Tailwind: **`tailwindcss@4.3.5`**, **`@tailwindcss/vite@4.3.5`** (đã kiểm `npm view` ngày 2026-11-16; peer `vite ^5.2 || ^6 || ^7 || ^8`, repo đang dùng vite 8.3.8). Không dùng Tailwind UI / Tailwind Plus (trả phí), không CDN `@tailwindcss/browser`.
- **Class là chuỗi nguyên vẹn trong `.ts`/`index.html`** để scanner của Tailwind thấy: không bao giờ ghép mảnh (`` `bg-${c}-500` ``, `'ring-' + n`). Chọn từ map chứa tên đầy đủ (`CHAPTER_COLOR[1].bar = 'bg-sky-500'`) và nối các tên đầy đủ bằng `cx()`. Không gán `class`/`className` bằng template literal (test ở Task 8 bắt lỗi này).
- Nguồn scan bị giới hạn: `@import "tailwindcss" source(none)` + `@source "../index.html"` + `@source "./**/*.ts"`. Mockup, plan markdown, `seed.sql` **không** được scan (nếu không, class thiếu sẽ bị che đi).
- Dark mode = `prefers-color-scheme` (mặc định của biến thể `dark:` trong v4). Không thêm nút đổi theme.
- **WCAG AA:** chữ ≥ 4.5:1 ở cả hai theme. Ước tính trước (≈, theo hex; palette v4 là OKLCH nên kiểm lại bằng DevTools ở checklist Task 10; mockup sai ở 4 chỗ, plan đã sửa): trắng/`emerald-600` = 3.8 ✗ → Nộp dùng `emerald-700` (5.5); trắng/`cyan-600` = 3.7 ✗ → gradient kết thúc ở `cyan-700` (5.4); `text-emerald-600`/trắng = 3.8 ✗ → trạng thái "Xong" dùng token `text-good`; `text-slate-400`/trắng = 2.6 ✗ → dùng `text-muted`. Nút và mục nav trên topbar dùng lớp phủ tối (`bg-black/20`, `/30`) thay vì `bg-white/15`/`/20` của mockup (làm sáng, < 4.5 ở đầu cyan). Chip màu: chữ `-800` trên nền `-100` (sáng), `-200` trên `-950` (tối).
- i18n: mọi chuỗi hiển thị mới qua `t(key)`, khóa thêm vào **cả** `vi.ts` và `en.ts` trong cùng task. Chữ nằm trong SVG (nhãn cảnh, bản đồ) cũng qua `t()`. **Không dịch:**
  - tên phòng ban (`Ops`, `Sales`, `Finance`, `Customs`, `CS`, `Management`, `IT`), tên người;
  - SQL, tên bảng/cột, giá trị dữ liệu (tên cảng lấy đúng như `ports.name` của seed: `Shanghai`, `Laem Chabang`…).

  Khóa nào VI = EN phải vào `SAME_OK` của `tests/i18n.test.ts`. Chữ trong `content/*.yml` là nội dung song ngữ `{ vi, en }`, kiểm bằng test nội dung.
- **L22:** không chuỗi hiển thị nào chứa "boss" hay "sự cố"; ticket `beat: boss` hiện là "Đánh giá thăng tiến". Từ `boss` chỉ còn trong code/frontmatter. Task 5 thêm test chặn.
- **L23:** mô tả và chữ trong card cỡ ≥ 14px (`text-sm` trở lên, không `text-xs`/`text-[13px]` cho chữ đọc), số dạng `tabular-nums`. Màu chữ trung tính (`text-ink`, `text-muted`); màu chỉ dùng cho nhãn/badge/trạng thái nhỏ, không tô đoạn văn hay số lớn.
- **SVG:** chỉ dựng bằng `s()` (`src/ui/svg.ts`, `createElementNS`), không `innerHTML`, không SMIL `<animate>`. Mỗi lần dựng một cảnh, id của gradient/pattern có tiền tố riêng: Trang chủ (bị `hidden`) và dải hoạt cảnh có thể cùng nằm trong DOM, mà gradient tham chiếu tới một SVG đang `display: none` thì không vẽ.
- **Chuyển động:**
  - Vòng lặp nền (sóng, khói, đèn hải đăng, tàu, cẩu) là CSS nằm trong `@media (prefers-reduced-motion: no-preference)`.
  - Hoạt cảnh khi xong việc chạy bằng JS: kiểm `matchMedia('(prefers-reduced-motion: reduce)')`, khi bật thì vẽ ngay trạng thái cuối.
  - Mỗi hoạt cảnh ≤ 3 s (test), bỏ qua được (nút + Esc), không chặn thao tác (`pointer-events-none`, chỉ nút nhận chuột).
  - Câu báo ghi vào vùng `aria-live` có sẵn trong `index.html` ngay lúc nộp đúng.
- Không viết test import `src/ui/*`, `src/state.ts`, `src/main.ts` (Vitest chạy Node, không DOM). Logic có test nằm ở `src/theme.ts`, `src/route.ts`, `src/home.ts`, `src/scene.ts`, `src/people.ts`, `src/progress.ts`.
- **Kiểm sau mỗi task** (bước cuối trước commit), dán **output thật** vào báo cáo task:
  ```bash
  npx tsc --noEmit
  npx vitest run
  npx vite build
  ```
  Vitest không kiểm kiểu, nên bước "xác nhận PASS" của từng test cũng chạy thêm `npx tsc --noEmit`.
- **Không trình duyệt, không dev server** cho người thực hiện: orchestrator giữ Edge và port 5173 (L7). Mỗi task có mục **"Checklist Edge (orchestrator)"**; người thực hiện bỏ qua mục đó, không chạy `npm run dev`/`vite preview`, không dùng công cụ trình duyệt.
- Dependency: `npm i --save-exact`. Nếu lệnh cài bị từ chối (quyền, mạng): dừng task đó, báo lại, **không** sửa tay `package.json`/`package-lock.json`.
- localStorage key mới: `cargo-query/route` (route cuối cùng, tiện ích thiết bị, không thuộc `Save`). Hoạt cảnh, bãi, tuyến, chức danh, KPI **không lưu gì**: tính lại từ `completed` + nội dung (L20 giữ `SAVE_VERSION`).
- Mỗi task một commit (bước cuối). Không `--no-verify`. **Không bao giờ** `git add docs/team/*` (orchestrator commit tài liệu nhóm).

## File Structure

```
package.json, package-lock.json   + tailwindcss 4.3.5, @tailwindcss/vite 4.3.5 (devDependencies, exact)   (sửa)
vite.config.ts                    + plugins: [tailwindcss()]                                           (sửa)
index.html                        topbar gradient + nav, <main id="home">, <main id="shell">, class Tailwind (sửa)
src/style.css                     @import tailwindcss, @theme inline (token), @layer base/components (từ vựng chung),
                                  layout splitter (CSS thuần), CodeMirror (CSS thuần); xóa CSS từng vùng      (viết lại)
src/theme.ts                      cx, CHAPTER_COLOR (12 màu)/chapterColor, DEPT_COLOR/deptColor, class dùng chung (mới, thuần)
src/route.ts                      Route, ROUTES, ROUTE_KEY, hashOf, isRoute, parseRoute, initialRoute           (mới, thuần)
src/home.ts                       homeModel; Kpi, parseKpis, KPIS, kpiTiles, kpiValue (T17)                    (mới, thuần)
src/scene.ts                      Scene, parseScene, sceneOf, ROUTES (tuyến), routeOpenedBy, derive, STEPS   (mới, thuần, T15)
src/people.ts                     Person, parsePeople, PEOPLE, personOf                                      (mới, thuần, T12)
src/progress.ts                   + Chapter.career/tier/story, CHAPTER_TABLES 1–12, rankOf (T11)             (sửa)
src/tickets.ts                    + Label { vi, en } cho columns (T14), scene (T15)                          (sửa)
src/ui/router.ts                  currentRoute, go, startRouter (hashchange, nhớ route)                      (mới)
src/ui/homeView.ts                registry section/mode, renderHome, card Tiếp tục, sự nghiệp, chương,
                                  cảng, bản đồ, KPI, kỹ năng, chế độ                                         (mới)
src/ui/svg.ts                     s(): builder SVG bằng createElementNS (T12)                                (mới)
src/ui/avatar.ts                  avatar(from, size): chân dung SVG từ people.yml (T7 chữ cái đầu → T12)     (mới)
src/ui/harbor.ts                  harborScene, drawYard, bayBox, MAX_TIERS: cảnh cảng Tiên Sa (T16)          (mới)
src/ui/routeMap.ts                routeMap, paintRoutes: bản đồ tuyến từ Tiên Sa (T16)                       (mới)
src/ui/stage.ts                   initStage, playCompletion: 8 hoạt cảnh khi xong việc (T18)                 (mới)
src/ui/celebrate.ts               celebrate(el): hiệu ứng "pop" ngắn, tắt khi reduced-motion                 (mới)
src/ui/topbar.ts                  + NavItem, registerNav, renderNav, chip chức danh (T11); class Tailwind     (sửa)
src/ui/brief.ts, coach.ts, inbox.ts, work.ts, tabs.ts, resultTable.ts, feedback.ts   class Tailwind;
                                  brief/inbox dạng chat (T13), nhãn cột {vi,en} (T14)                       (sửa)
src/main.ts                       showRoute, startRouter, renderHome khi hiện, go('play'), playCompletion    (sửa)
src/i18n/vi.ts, en.ts             + nav.*, home.*, career.*, chat.*, harbor.*, map.*, anim.*                (sửa)
content/chapters.yml              12 chương: title, career, tier, story, outcomes (T11)                      (sửa)
content/people.yml                15 đồng nghiệp: vai trò nghiệp vụ, bio, look (T12)                         (mới)
content/kpis.yml                  9 ô KPI: ticket, kind, nhãn (T17)                                          (mới)
content/tickets/ch1–3/*.md        đề viết lại theo problem-design §3 (T14), 3 dòng scene: (T15)              (sửa)
content/TEMPLATE.md               nhãn {vi,en}, đề nghiệp vụ (T14)                                           (sửa)
tests/theme.test.ts, route.test.ts, home.test.ts, people.test.ts, scene.test.ts                              (mới)
tests/i18n.test.ts, progress.test.ts, tickets.test.ts, content.test.ts                                       (sửa)
CLAUDE.md, docs/superpowers/plans/…-1b-…, …-1c-…, …-import.md   ghi chú sau Plan 1d (T10, T19)               (sửa)
```

| Task | Nội dung | Phụ thuộc |
|---|---|---|
| 0 | Kiểm tiền đề | — |
| 1–3 | Tailwind, `theme.ts` (12 màu), `route.ts` | — |
| 4–6 | `home.ts`, router + Trang chủ (card chương L21, ngôn từ L22), `index.html` + topbar | 2, 3 |
| 7–9 | Restyle đề bài, khu làm bài, hộp thư, panel | 2, 6 |
| 10 | Ghi chú Tailwind trong `CLAUDE.md` | 9 |
| 11 | (a) Khung 12 chương, `rankOf`, chip chức danh, lộ trình sự nghiệp, đoạn mở chương | 5, 6 |
| 12 | (b) `people.yml`, `people.ts`, chân dung SVG | 7 |
| 13 | (b) Hộp thư và đầu đề bài dạng chat | 12 |
| 14 | (e) Đề viết lại, nhãn cột `{ vi, en }` (một commit, L25) | 7 |
| 15 | (d) `scene:`, `sceneOf`, `derive`, thời lượng (thuần) | 11, 14 |
| 16 | (c) Cảnh Tiên Sa + bản đồ tuyến trên Trang chủ | 15 |
| 17 | (c) Card Tiếp tục dạng tin nhắn, bảng KPI | 13, 14, 16 |
| 18 | (d) 8 hoạt cảnh, thăng tiến + toast chức danh, aria-live | 16 |
| 19 | Ghi chú dự án, điều chỉnh Plan 1b/1c/Import, checklist Edge tổng | tất cả |

**Điểm neo Plan 1b/1c/Import được giữ nguyên chữ** (để các plan đó áp được): `h('div', { class: 'actions' }, runBtn, formatBtn, submitBtn)` trong `work.ts`; dòng `byId('xp').textContent = t('top.xp', { n: app.save.xp });` trong `topbar.ts`; dòng chứa `id="inbox-btn"`, dòng chứa `id="inbox-list"`, dòng `<script type="module"`, phần tử `id="map"` (class `map-strip`, thuộc tính `hidden`) trong `index.html`; class `topbar` trên `<header>`; tên hàm `rerender`, `selectTicket`, `complete`, `nextStep`, `loadColumns` và thứ tự `registerCoreTabs(…)` ngay trước `createPanel(…)` trong `main.ts`; `registerTab`/`TabSpec` không đổi. **Điểm neo bị đổi:** dòng `<span id="xp"></span>` (nay có class) — xem mục "Điều chỉnh cho Plan 1b/1c/Import" cuối plan.

---

### Task 0: Kiểm tiền đề (không sửa file)

**Files:** không sửa.

- [ ] **Step 1: Xem ai đã đổi gì từ lúc viết plan**

Run:
```bash
git log --oneline 16d38b1..HEAD -- src index.html vite.config.ts package.json content tests
git status --short
```
Expected: danh sách commit sửa lỗi của người khác (có thể rỗng). Ghi lại các file trong danh sách: ở những task đụng các file đó, đọc lại file trên đĩa trước khi áp thay đổi.

- [ ] **Step 2: Kiểm điểm neo plan sẽ dùng**

Run:
```bash
grep -c "export function renderTopbar" src/ui/topbar.ts
grep -c "byId('xp').textContent = t('top.xp', { n: app.save.xp });" src/ui/topbar.ts
grep -c "h('div', { class: 'actions' }, runBtn" src/ui/work.ts
grep -c "function rerender\|function selectTicket\|registerCoreTabs(\|createPanel(" src/main.ts
grep -c 'id="inbox-btn"\|id="inbox-list"\|<script type="module"\|id="map"' index.html
grep -c "export function registerTab" src/ui/tabs.ts
grep -c "function complete(t: Ticket)" src/main.ts
grep -c "'top.chapter': 'Chương {n}/7: {title}'" src/i18n/vi.ts
grep -c "toEqual(\[1, 2, 3, 4, 5, 6, 7\])" tests/progress.test.ts
grep -c "if (fm.columns !== undefined)" src/tickets.ts
grep -c "^columns:" content/tickets/*/*.md | grep -c ":1$"
```
Expected: `1`, `1`, `1`, `≥ 4`, `4`, `1`, `1`, `1`, `1`, `1`, `15`. Nếu dòng nào sai:
- tìm đoạn tương đương trên đĩa (người khác có thể đã đổi tên hay định dạng), sửa tiếp và ghi chú lại (fix forward);
- không tự đặt tên khác cho API của plan này.

- [ ] **Step 3: Kiểm version Tailwind**

Run:
```bash
npm view tailwindcss version
npm view @tailwindcss/vite version
```
Expected: `4.3.5` và `4.3.5`. Nếu đã có bản mới hơn, vẫn cài **4.3.5** (đã chạy thử với vite 8.3.8: `@theme inline`, `source(none)`, `@custom-variant`, biến thể `aria-*`, `dark:` đều hoạt động).

- [ ] **Step 4: Baseline xanh**

Run:
```bash
npx tsc --noEmit
npx vitest run
npx vite build
```
Expected: `tsc` không lỗi; tất cả test PASS; build OK. Nếu đỏ do việc đang làm dở của người khác: dừng và báo, không sửa hộ.

- [ ] **Step 5: Đọc tài liệu thiết kế một lượt**

Đọc `docs/team/decision-log.md` (L17–L31), `curriculum.md` §0–§3, `problem-design.md` §1–§3, `completion-animations.md`, `product-design-v2.md` ★1–★5. Plan này là bản đã chốt của các tài liệu đó; chỗ nào plan lệch tài liệu thì có ghi lý do ở mục "Chỗ lệch thiết kế" (cuối plan).

---

### Task 1: Cài Tailwind v4, token `@theme`, lớp base/components, gom CSS cũ vào khối LEGACY

Sau task này app trông **gần như cũ** (CSS cũ không layer nên vẫn thắng Preflight), nhưng đã chạy Tailwind. Các task sau xóa dần khối LEGACY.

**Files:**
- Modify: `package.json`, `package-lock.json` (qua npm), `vite.config.ts`
- Rewrite: `src/style.css`

**Interfaces:**
- Produces: utility token `bg-canvas`, `bg-panel`, `text-ink`, `text-muted`, `ring-line`/`border-line`, `bg-accent`, `bg-accent-soft`, `text-on-accent`, `text-good`, `text-bad`, `text-warn`, `bg-code`, `bg-sea`, `text-disabled`; biến thể `shell:` (= `@media (min-width: 1024px) and (min-height: 700px)`); `motion-safe:animate-pop`; class chung `.muted .good .bad .warn .error pre.sql .stale .actions button.primary .tag`.

- [ ] **Step 1: Cài dependency (pin exact)**

Run:
```bash
npm i -D --save-exact tailwindcss@4.3.5 @tailwindcss/vite@4.3.5
```
Expected: `package.json` có `"tailwindcss": "4.3.5"` và `"@tailwindcss/vite": "4.3.5"` trong `devDependencies` (không có `^`). Nếu lệnh cài bị từ chối: dừng Plan 1d ở đây và báo. Mọi task sau cần Tailwind. Không sửa tay `package.json` hay `package-lock.json`.

- [ ] **Step 2: Thêm plugin vào `vite.config.ts`**

Thay dòng:
```ts
import { defineConfig } from 'vitest/config';
```
bằng:
```ts
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
```
và ngay sau dòng `export default defineConfig({` thêm:
```ts
  plugins: [tailwindcss()],
```
(Giữ nguyên `optimizeDeps`, `worker`, `test`.)

- [ ] **Step 3: Viết lại `src/style.css`**

Đọc file trên đĩa trước. Nếu người khác đã sửa một rule cũ (ví dụ `.split`), mang đúng bản đã sửa vào chỗ tương ứng bên dưới. Nội dung mới, toàn bộ:

```css
@import "tailwindcss" source(none);
@source "../index.html";
@source "./**/*.ts";

/* ≥ 1024×700: one-viewport app shell (body, workspace grid, splitters). */
@custom-variant shell (@media (min-width: 1024px) and (min-height: 700px));

/* App tokens. Names are a contract: Plan 1b/1c/Import CSS reads var(--accent), var(--border)… */
:root {
  --bg: #f7f7f5; --panel: #ffffff; --text: #1d1d1f; --muted: #66666b; --border: #dcdcd8;
  --accent: #0f6cbd; --accent-soft: #dbeafe; --on-accent: #ffffff; --good: #1a7f37; --bad: #c62828; --warn: #b35c00;
  --code: #efefea; --sea: #e8f1f8; --land: #d9e2ea; --bar: #1f3b57; --disabled: #8a8a90;
  /* L13 syntax colours: >= 5.6:1 on --panel (#fff) */
  --syn-keyword: #7a2bb0; --syn-string: #a3341a; --syn-number: #0a6b4c; --syn-comment: #5d6b5d;
  --syn-operator: #4a4a52; --syn-type: #0b5fa5; --syn-property: #1d5a7a; --syn-atom: #8a5300;
  --cm-sel: #e8ecf8; --cm-active: rgba(204, 238, 255, 0.27); /* translucent: the selection stays visible under it; every --syn-* >= 4.5:1 on both */
  color-scheme: light dark;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #161618; --panel: #1f1f22; --text: #ececf0; --muted: #a0a0a8; --border: #34343a;
    --accent: #5aa9ff; --accent-soft: #1d3550; --on-accent: #0d1b29; --good: #4cc26d; --bad: #ff6b6b; --warn: #ffb35a;
    --code: #2a2a30; --sea: #14202b; --land: #2b3742; --bar: #0d1b29; --disabled: #7a7a82;
    /* L13 syntax colours: >= 6.3:1 on --panel (#1f1f22) */
    --syn-keyword: #d19bff; --syn-string: #ff9e7a; --syn-number: #7ee0b5; --syn-comment: #9aa39a;
    --syn-operator: #c8c8d0; --syn-type: #6cc0ff; --syn-property: #9cdcfe; --syn-atom: #ffcf6b;
    --cm-sel: #1e2f46; --cm-active: rgba(255, 255, 255, 0.04);
  }
}

/* `inline`: utilities emit var(--x) itself, so they follow the dark block above with no `dark:` prefix. */
@theme inline {
  --color-canvas: var(--bg);
  --color-panel: var(--panel);
  --color-ink: var(--text);
  --color-muted: var(--muted);
  --color-line: var(--border);
  --color-accent: var(--accent);
  --color-accent-soft: var(--accent-soft);
  --color-on-accent: var(--on-accent);
  --color-good: var(--good);
  --color-bad: var(--bad);
  --color-warn: var(--warn);
  --color-code: var(--code);
  --color-sea: var(--sea);
  --color-disabled: var(--disabled);
}
@theme {
  --animate-pop: pop 450ms ease-out;
  @keyframes pop {
    0% { transform: scale(0.96); opacity: 0.5; }
    60% { transform: scale(1.02); opacity: 1; }
    100% { transform: scale(1); }
  }
}

/* Preflight zeroes margins, list bullets and button looks. Restore what bare markup (here and in Plans 1b/1c/Import) relies on. */
@layer base {
  body { margin: 0; font: 15px/1.5 system-ui, sans-serif; background: var(--bg); color: var(--text); }
  h2 { font-size: 16px; font-weight: 700; margin: 0 0 8px; }
  h3 { font-size: 15px; font-weight: 600; margin: 12px 0 4px; }
  h4 { font-size: 14px; font-weight: 600; margin: 10px 0 4px; }
  p, pre { margin-block: 1em; }
  ul, ol { margin-block: 0.5em; padding-left: 1.25rem; }
  ul { list-style: disc; }
  ol { list-style: decimal; }
  button { cursor: pointer; padding: 6px 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--panel); color: inherit; }
  button:hover { background: var(--code); }
  button:disabled { color: var(--disabled); border-style: dashed; cursor: default; }
  code { background: var(--code); padding: 1px 4px; border-radius: 4px; font-family: ui-monospace, monospace; font-size: 0.92em; }
  table { border-collapse: collapse; font-size: 13px; width: 100%; }
  caption { text-align: left; color: var(--muted); padding: 4px 8px; }
  th, td { padding: 4px 8px; border-bottom: 1px solid var(--border); text-align: left; white-space: nowrap; }
  dialog { margin: auto; padding: 20px; border: 1px solid var(--border); border-radius: 16px; background: var(--panel); color: var(--text); width: min(520px, calc(100vw - 32px)); box-shadow: 0 20px 40px rgb(0 0 0 / 0.25); }
  dialog::backdrop { background: rgb(0 0 0 / 0.45); }
  :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .topbar :focus-visible { outline-color: #fff; }
}

/* Shared vocabulary used as plain class names by Plan 1 code and by Plans 1b/1c/Import. Keep these names. */
@layer components {
  .muted { color: var(--muted); font-size: 13px; }
  .good { color: var(--good); }
  .bad { color: var(--bad); }
  .warn { color: var(--warn); }
  .error { color: var(--bad); white-space: pre-wrap; }
  pre.sql { margin: 0; padding: 8px; border-radius: 8px; background: var(--code); white-space: pre-wrap; font-size: 13px; }
  .stale { margin: 0 0 8px; padding: 4px 8px; border-left: 3px solid var(--warn); background: var(--code); font-size: 13px; }
  .actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 8px 0; }
  button.primary { background: var(--accent); border-color: var(--accent); color: var(--on-accent); font-weight: 600; }
  button.primary:disabled { background: var(--code); border-color: var(--disabled); color: var(--disabled); }
  .tag { display: inline-block; margin-right: 6px; padding: 0 6px; border: 1px solid var(--warn); border-radius: 4px; color: var(--text); font-size: 12px; }
}

/* ---- Layout driven by splitter.ts (--col/--row): plain CSS on purpose (two media features + CSS variables). ---- */
.shell { padding: 16px 16px 0; }
.workspace { display: grid; grid-template-columns: minmax(0, 2fr) 16px minmax(0, 3fr); }
#ticket { grid-column: 1; }
#work { grid-column: 3; }
.split { display: none; }
@media (max-width: 900px) {
  .workspace { grid-template-columns: minmax(0, 1fr); row-gap: 16px; }
  #ticket, #work { grid-column: 1; }
}
.panel { margin: 16px 0; }
@media (min-width: 1024px) and (min-height: 700px) {
  body { height: 100dvh; display: flex; flex-direction: column; overflow: hidden; }
  .shell { flex: 1; min-height: 0; display: grid; grid-template-rows: minmax(0, 1fr) 12px minmax(0, var(--row, 40%)); padding-bottom: 12px; }
  .workspace { min-height: 0; grid-template-columns: minmax(0, var(--col, 40%)) 12px minmax(0, 1fr); }
  #ticket, #work, .panel { overflow: auto; min-height: 0; }
  .panel { margin: 0; }
  .split { display: block; }
}

/* ---- CodeMirror DOM (third-party): plain CSS. ---- */
.editor .cm-editor { min-height: 160px; background: var(--panel); color: var(--text); }
.editor .cm-editor .cm-gutters { background: var(--code); color: var(--muted); border-color: var(--border); }
.editor .cm-editor .cm-content { caret-color: var(--text); }
/* Tooltips (lint message, autocomplete) follow the app theme: the CodeMirror default is light-only. */
.editor .cm-tooltip { background: var(--panel); color: var(--text); border-color: var(--border); }
/* CodeMirror keeps its light base theme in dark mode: caret, selection and active line come from tokens instead. */
.editor .cm-editor .cm-cursor { border-left-color: var(--text); }
.editor .cm-editor .cm-selectionLayer .cm-selectionBackground,
.editor .cm-editor.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground { background: var(--cm-sel); }
.editor .cm-editor .cm-content .cm-activeLine { background: var(--cm-active); }
.editor .cm-editor .cm-gutters .cm-activeLineGutter { background: var(--accent-soft); }
@media (pointer: coarse) { .editor .cm-content { font-size: 16px; } }

@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; animation: none !important; scroll-behavior: auto !important; }
}

/* ==== LEGACY (Plan 1 style.css). Unlayered, so it still beats utilities: Tasks 6–9 delete it rule by rule, Task 9 removes the block. ==== */
.topbar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; padding: 8px 16px; background: var(--bar); color: #fff; }
.topbar h1 { font-size: 18px; margin: 0 auto 0 0; }
.topbar button { background: transparent; color: #fff; border-color: #ffffff88; }
.topbar .file-btn { color: #fff; }
.lang { display: inline-flex; }
.lang button { border-radius: 0; padding: 4px 10px; }
.lang button:first-child { border-radius: 6px 0 0 6px; }
.lang button:last-child { border-radius: 0 6px 6px 0; border-left: 0; }
.lang button[aria-pressed='true'] { background: #fff; color: var(--bar); font-weight: 600; }
.map-strip { background: var(--sea); border-bottom: 1px solid var(--border); }
#notice { display: flex; gap: 8px; align-items: center; padding: 8px 16px; background: var(--code); border-bottom: 1px solid var(--border); }
#notice[hidden] { display: none; }
#notice .close { margin-left: auto; }
#ticket, #work, .panel { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 12px; min-width: 0; }
.split { border-radius: 4px; touch-action: none; }
.split:hover, .split:focus-visible { background: var(--accent-soft); }
.split-col { cursor: col-resize; }
.split-row { cursor: row-resize; }
.file-btn { cursor: pointer; text-decoration: underline; }
@media (max-width: 599px) {
  .actions { position: sticky; bottom: 0; background: var(--panel); padding: 8px 0; z-index: 1; }
  .tabs { flex-wrap: nowrap; overflow-x: auto; }
}
.from, .meta { color: var(--muted); font-size: 13px; }
.editor { border: 1px solid var(--border); border-radius: 6px; }
.sql-error .explain { border-left: 3px solid var(--accent); padding-left: 8px; }
.dept { display: inline-block; padding: 0 6px; border-radius: 4px; background: var(--accent-soft); color: var(--text); font-weight: 600; }
.task, .step, .shape, .recap, .coach { border: 1px solid var(--border); border-radius: 6px; padding: 8px 12px; margin: 12px 0; }
.task { border-left: 4px solid var(--accent); }
.shape ul { list-style: none; display: flex; flex-wrap: wrap; gap: 6px; padding: 0; margin: 4px 0; }
.shape li { border: 1px solid var(--border); border-radius: 4px; padding: 2px 6px; font-size: 13px; }
.recap { border-color: var(--good); }
.recap .compare { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px; }
.recap figure { margin: 0; }
.skill-cards { padding-left: 18px; }
.coach { background: var(--accent-soft); border-color: var(--accent); }
.coach p { margin: 0 0 6px; }
.coach button { margin-right: 6px; }
.hints ol { padding-left: 20px; }
.conclusion label { display: block; margin: 4px 0; }
.history summary { cursor: pointer; color: var(--muted); }
.history ul { list-style: none; padding: 0; margin: 4px 0; }
.history .hist { width: 100%; text-align: left; font-family: ui-monospace, monospace; font-size: 12px; border: 0; padding: 2px 4px; }
.mail { display: block; width: 100%; text-align: left; padding: 8px; margin-bottom: 6px; }
.mail.active { border-color: var(--accent); box-shadow: inset 3px 0 var(--accent); }
.mail.done { background: var(--code); }
.mail span { display: block; }
.mail .subject { font-weight: 600; }
.tabs { display: flex; flex-wrap: wrap; gap: 4px; border-bottom: 1px solid var(--border); margin-bottom: 10px; }
.tabs button { border-radius: 6px 6px 0 0; border-bottom: 0; background: var(--code); }
.tabs button.on { background: var(--panel); font-weight: 600; box-shadow: inset 0 2px var(--accent); }
.tabs .group-start { margin-left: 16px; }
.tabs .new { margin-left: 6px; padding: 0 4px; border-radius: 4px; background: var(--accent); color: var(--on-accent); font-size: 11px; }
.table-wrap { overflow: auto; max-height: 420px; border: 1px solid var(--border); border-radius: 6px; }
th { position: sticky; top: 0; background: var(--panel); }
td.null { color: var(--muted); font-style: italic; }
tr.mismatch td { background: var(--accent-soft); }
.schema-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; }
.schema-list h3 { margin: 0; }
.schema-list ul { list-style: none; padding-left: 8px; margin: 4px 0 8px; font-size: 13px; }
/* ==== END LEGACY ==== */
```

- [ ] **Step 4: Kiểm kiểu, test, build**

Run:
```bash
npx tsc --noEmit
npx vitest run
npx vite build
```
Expected: `tsc` không lỗi (`vite.config.ts` nằm trong `include`); tất cả test PASS (plugin chỉ biến đổi CSS, test không import CSS); build in ra một dòng `dist/assets/index-….css`.

- [ ] **Step 5: Kiểm Tailwind thật sự chạy**

Run:
```bash
head -c 70 dist/assets/index-*.css; echo
grep -c "var(--bg)" dist/assets/index-*.css
```
Expected: dòng đầu là `/*! tailwindcss v4.3.5 | MIT License | https://tailwindcss.com */`; số đếm `≥ 1`.

- [ ] **Step 6: Checklist Edge (orchestrator)**

Sáng + tối (DevTools → Rendering → `prefers-color-scheme`): giao diện như trước Plan 1d (khoảng cách đoạn, danh sách gợi ý có số, nút có viền, dialog Hộp thư ở giữa màn hình); editor gõ và chạy được.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vite.config.ts src/style.css
git commit -m "build: Tailwind CSS v4 with app tokens as theme, shared base/components layers"
```

---
### Task 2: Bảng màu dạng class nguyên vẹn (`src/theme.ts`)

**Files:**
- Create: `src/theme.ts`
- Test: `tests/theme.test.ts`

**Interfaces:**
- Consumes: `CHAPTERS` (`src/progress.ts`), `loadTickets` (`src/content.ts`)
- Produces:
  - `cx(...parts: (string | false | null | undefined)[]): string`
  - `interface ChapterColor { bar: string; chip: string; ring: string; text: string; fill: string; stroke: string }`, `CHAPTER_COLOR: Record<number, ChapterColor>` (**12 chương**, curriculum §7.2: 1 sky, 2 violet, 3 amber, 4 rose, 5 emerald, 6 indigo, 7 fuchsia, **8 teal, 9 orange, 10 cyan, 11 lime, 12 pink**), `chapterColor(n: number): ChapterColor`. `fill`/`stroke` tô container trên bãi và tuyến trên bản đồ (SVG).
  - `DEPT_COLOR: Record<string, string>` (6 phòng + `IT`), `deptColor(dept: string): string`
  - hằng class: `CARD`, `PILL`, `DEPT_CHIP`, `BTN_GO`, `BTN_SUBMIT`, `TOP_BTN`, `NAV_LINK`, `DONE_PILL`
  - `initials(name: string): string` (chỉ dùng tới Task 12; Task 12 xóa khi có chân dung)

Màu chương nằm ở đây, **không** trong `chapters.yml`: Tailwind chỉ quét `.ts`/`index.html`, nên tên class phải là chuỗi nguyên vẹn trong code (completion-animations §9 câu 1, curriculum §7.2).

- [ ] **Step 1: Viết test `tests/theme.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { loadTickets } from '../src/content';
import { CHAPTERS } from '../src/progress';
import { CHAPTER_COLOR, chapterColor, cx, DEPT_COLOR, deptColor, initials } from '../src/theme';

describe('theme', () => {
  it('mỗi chương trong chapters.yml có một màu riêng', () => {
    const bars = CHAPTERS.map((c) => CHAPTER_COLOR[c.chapter]?.bar);
    expect(bars.every(Boolean)).toBe(true);
    expect(new Set(bars).size).toBe(CHAPTERS.length);
  });

  it('đủ 12 màu chương (curriculum §7.2), fill/stroke SVG khác nhau từng chương', () => {
    expect(Object.keys(CHAPTER_COLOR).map(Number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    const all = Object.values(CHAPTER_COLOR);
    expect(new Set(all.map((c) => c.fill)).size).toBe(12);
    expect(new Set(all.map((c) => c.stroke)).size).toBe(12);
    expect(CHAPTER_COLOR[8].bar).toBe('bg-teal-500');
    expect(CHAPTER_COLOR[12].bar).toBe('bg-pink-500');
  });

  it('mọi phòng ban gửi ticket có màu nhãn; phòng/chương lạ dùng màu trung tính', () => {
    const depts = [...new Set(loadTickets().map((t) => t.from.dept))];
    expect(depts.filter((d) => !(d in DEPT_COLOR))).toEqual([]);
    expect(deptColor('Legal')).toContain('bg-slate-100');
    expect(chapterColor(99).bar).toBe('bg-slate-500');
  });

  it('mỗi màu trang trí có biến thể dark:', () => {
    for (const c of Object.values(CHAPTER_COLOR)) expect(c.chip).toContain('dark:');
    for (const d of Object.values(DEPT_COLOR)) expect(d).toContain('dark:');
  });

  it('cx bỏ phần rỗng', () => {
    expect(cx('a', false, null, undefined, '', 'b')).toBe('a b');
  });

  it('initials: chữ cái đầu của từ đầu và từ cuối', () => {
    expect(initials('Lê Bình')).toBe('LB');
    expect(initials('Nguyễn Văn Quang')).toBe('NQ');
    expect(initials('an')).toBe('A');
    expect(initials('   ')).toBe('');
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/theme.test.ts`
Expected: FAIL — `Failed to resolve import "../src/theme"`.

- [ ] **Step 3: Viết `src/theme.ts`**

```ts
/**
 * L17 colours as whole Tailwind class names. Tailwind's scanner only sees complete literals, so never build a
 * class from pieces (`bg-${c}-500`): pick from these maps and join whole names with cx().
 * WCAG AA (>= 4.5:1): chips are -800 on -100 (light) and -200 on -950 (dark); white text only on -700 or darker.
 */
export const cx = (...parts: (string | false | null | undefined)[]): string => parts.filter(Boolean).join(' ');

export interface ChapterColor {
  /** Top stripe, progress fill, skill bars. */
  bar: string;
  /** "CHƯƠNG n" pill and skill icon tile. */
  chip: string;
  /** Outline of the chapter being played. */
  ring: string;
  /** Coloured text on the panel background (small labels only, L23). */
  text: string;
  /** SVG fill: this chapter's containers in the Tien Sa yard. */
  fill: string;
  /** SVG stroke: lanes on the route map opened by this chapter. */
  stroke: string;
}

/** Chapters 1–7: L17. Chapters 8–12: curriculum.md §7.2 (teal, orange, cyan, lime, pink). */
export const CHAPTER_COLOR: Record<number, ChapterColor> = {
  1: { bar: 'bg-sky-500', chip: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200', ring: 'ring-2 ring-sky-500', text: 'text-sky-800 dark:text-sky-300', fill: 'fill-sky-600', stroke: 'stroke-sky-600' },
  2: { bar: 'bg-violet-500', chip: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200', ring: 'ring-2 ring-violet-500', text: 'text-violet-800 dark:text-violet-300', fill: 'fill-violet-600', stroke: 'stroke-violet-600' },
  3: { bar: 'bg-amber-500', chip: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200', ring: 'ring-2 ring-amber-500', text: 'text-amber-800 dark:text-amber-300', fill: 'fill-amber-600', stroke: 'stroke-amber-600' },
  4: { bar: 'bg-rose-500', chip: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200', ring: 'ring-2 ring-rose-500', text: 'text-rose-800 dark:text-rose-300', fill: 'fill-rose-600', stroke: 'stroke-rose-600' },
  5: { bar: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200', ring: 'ring-2 ring-emerald-500', text: 'text-emerald-800 dark:text-emerald-300', fill: 'fill-emerald-600', stroke: 'stroke-emerald-600' },
  6: { bar: 'bg-indigo-500', chip: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200', ring: 'ring-2 ring-indigo-500', text: 'text-indigo-800 dark:text-indigo-300', fill: 'fill-indigo-600', stroke: 'stroke-indigo-600' },
  7: { bar: 'bg-fuchsia-500', chip: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950 dark:text-fuchsia-200', ring: 'ring-2 ring-fuchsia-500', text: 'text-fuchsia-800 dark:text-fuchsia-300', fill: 'fill-fuchsia-600', stroke: 'stroke-fuchsia-600' },
  8: { bar: 'bg-teal-500', chip: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200', ring: 'ring-2 ring-teal-500', text: 'text-teal-800 dark:text-teal-300', fill: 'fill-teal-600', stroke: 'stroke-teal-600' },
  9: { bar: 'bg-orange-500', chip: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200', ring: 'ring-2 ring-orange-500', text: 'text-orange-800 dark:text-orange-300', fill: 'fill-orange-600', stroke: 'stroke-orange-600' },
  10: { bar: 'bg-cyan-500', chip: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200', ring: 'ring-2 ring-cyan-500', text: 'text-cyan-800 dark:text-cyan-300', fill: 'fill-cyan-600', stroke: 'stroke-cyan-600' },
  11: { bar: 'bg-lime-500', chip: 'bg-lime-100 text-lime-800 dark:bg-lime-950 dark:text-lime-200', ring: 'ring-2 ring-lime-500', text: 'text-lime-800 dark:text-lime-300', fill: 'fill-lime-600', stroke: 'stroke-lime-600' },
  12: { bar: 'bg-pink-500', chip: 'bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-200', ring: 'ring-2 ring-pink-500', text: 'text-pink-800 dark:text-pink-300', fill: 'fill-pink-600', stroke: 'stroke-pink-600' },
};
const NEUTRAL_CHAPTER: ChapterColor = {
  bar: 'bg-slate-500', chip: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100', ring: 'ring-2 ring-slate-500', text: 'text-slate-700 dark:text-slate-300', fill: 'fill-slate-500', stroke: 'stroke-slate-500',
};
export const chapterColor = (n: number): ChapterColor => CHAPTER_COLOR[n] ?? NEUTRAL_CHAPTER;

/** Department label colours. Department names are never translated, so the key is the raw `from.dept`. */
export const DEPT_COLOR: Record<string, string> = {
  Ops: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
  Sales: 'bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-200',
  Finance: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  Customs: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  CS: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200',
  Management: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200',
  IT: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200',
};
const NEUTRAL_DEPT = 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100';
export const deptColor = (dept: string): string => DEPT_COLOR[dept] ?? NEUTRAL_DEPT;

export const CARD = 'rounded-2xl bg-panel ring-1 ring-line';
export const PILL = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-semibold';
export const DEPT_CHIP = 'rounded-md px-2 py-0.5 text-xs font-bold uppercase';
/** Blue call to action: white on blue-700 = 6.7:1, on blue-600 (dark theme) = 5.2:1. */
export const BTN_GO = 'border-0 bg-blue-700 font-semibold text-white shadow-sm hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700';
/** Green Submit (L17): white on emerald-700 = 5.5:1 (the mockup's emerald-600 is 3.8:1). */
export const BTN_SUBMIT = 'ml-auto border-0 bg-emerald-700 px-4 font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:bg-code disabled:text-disabled';
/** Controls on the gradient top bar: darkening keeps white text >= 4.5:1 at the cyan end. */
export const TOP_BTN = 'border-0 bg-black/20 text-white ring-1 ring-white/40 hover:bg-black/30';
/** Darkening overlays (like TOP_BTN): the nav wraps and can sit over the cyan end, where lightening drops white text under 4.5:1. */
export const NAV_LINK = 'rounded-lg px-3 py-1.5 text-white no-underline hover:bg-black/20 aria-[current=page]:bg-black/30 aria-[current=page]:font-semibold aria-[current=page]:ring-1 aria-[current=page]:ring-white/60';
/** "Done"/"current" status badge (colour only on small badges, L23): emerald-800 on -100, -200 on -950. */
export const DONE_PILL = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200';

/** "Lê Bình" → "LB": avatar placeholder until Task 12 draws portraits (Task 12 deletes this). */
export function initials(name: string): string {
  const w = name.trim().split(/\s+/).filter(Boolean);
  return (w.length > 1 ? w[0][0] + w[w.length - 1][0] : w[0]?.[0] ?? '').toUpperCase();
}
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `npx vitest run tests/theme.test.ts && npx tsc --noEmit`
Expected: 6 test PASS; `tsc` không lỗi. Rồi chạy bộ kiểm chuẩn (`npx tsc --noEmit`, `npx vitest run`, `npx vite build`): tất cả xanh.

- [ ] **Step 5: Commit**

```bash
git add src/theme.ts tests/theme.test.ts
git commit -m "feat(ui): 12 chapter colours and department colours as literal Tailwind classes"
```

---

### Task 3: Mô hình route (`src/route.ts`)

**Files:**
- Create: `src/route.ts`
- Test: `tests/route.test.ts`

**Interfaces:**
- Produces:
  - `ROUTES = ['home', 'play'] as const`, `type Route = 'home' | 'play'`
  - `ROUTE_KEY = 'cargo-query/route'`
  - `hashOf(r: Route): string` (`'#/'`, `'#/play'`), `isRoute(v: unknown): v is Route`
  - `parseRoute(hash: string): Route | undefined` — `''` → `undefined`; đường lạ → `'home'`
  - `initialRoute(hash: string, saved: unknown): Route`

Luyện tập và Sandbox (Plan 1c) là **chế độ bên trong `play`** (dùng chung editor và panel), không phải route riêng.

- [ ] **Step 1: Viết test `tests/route.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { hashOf, initialRoute, isRoute, parseRoute, ROUTES } from '../src/route';

describe('route', () => {
  it('parseRoute: không có hash → undefined (dùng route đã nhớ)', () => {
    expect(parseRoute('')).toBeUndefined();
  });

  it('parseRoute: #/ và # là Trang chủ, #/play là màn làm bài', () => {
    expect(parseRoute('#')).toBe('home');
    expect(parseRoute('#/')).toBe('home');
    expect(parseRoute('#/play')).toBe('play');
    expect(parseRoute('#/play/')).toBe('play');
    expect(parseRoute('#play')).toBe('play');
    expect(parseRoute('#/play?x=1')).toBe('play');
  });

  it('parseRoute: đường lạ về Trang chủ', () => {
    expect(parseRoute('#/sandbox')).toBe('home');
    expect(parseRoute('#/PLAY')).toBe('home');
  });

  it('hashOf ngược với parseRoute', () => {
    for (const r of ROUTES) expect(parseRoute(hashOf(r))).toBe(r);
  });

  it('initialRoute: hash thắng route đã nhớ; route nhớ hỏng → home', () => {
    expect(initialRoute('#/', 'play')).toBe('home');
    expect(initialRoute('', 'play')).toBe('play');
    expect(initialRoute('', 'junk')).toBe('home');
    expect(initialRoute('', undefined)).toBe('home');
    expect(isRoute('play')).toBe(true);
    expect(isRoute(42)).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/route.test.ts`
Expected: FAIL — `Failed to resolve import "../src/route"`.

- [ ] **Step 3: Viết `src/route.ts`**

```ts
/** Hash routes without a framework. Practice and Sandbox (Plan 1c) are modes inside 'play', not routes. */
export const ROUTES = ['home', 'play'] as const;
export type Route = (typeof ROUTES)[number];

/** Last route shown: a device convenience, never part of Save. */
export const ROUTE_KEY = 'cargo-query/route';

const HASH: Record<Route, string> = { home: '#/', play: '#/play' };
export const hashOf = (r: Route): string => HASH[r];
export const isRoute = (v: unknown): v is Route => ROUTES.includes(v as Route);

/** '' (no hash) → undefined, so the remembered route can be used; any unknown path falls back to home. */
export function parseRoute(hash: string): Route | undefined {
  if (hash === '') return undefined;
  const path = hash.replace(/^#\/?/, '').split(/[/?]/)[0];
  return isRoute(path) ? path : 'home';
}

export function initialRoute(hash: string, saved: unknown): Route {
  return parseRoute(hash) ?? (isRoute(saved) ? saved : 'home');
}
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `npx vitest run tests/route.test.ts && npx tsc --noEmit`
Expected: 5 test PASS; `tsc` không lỗi. Rồi chạy bộ kiểm chuẩn (`npx tsc --noEmit`, `npx vitest run`, `npx vite build`): tất cả xanh.

- [ ] **Step 5: Commit**

```bash
git add src/route.ts tests/route.test.ts
git commit -m "feat: hash route model (home, play) with remembered last route"
```

---

### Task 4: View-model Trang chủ (`src/home.ts`)

Mọi số trên Trang chủ được **tính lại từ save + ticket** (không lưu thêm gì). Tổng ticket lấy từ `tickets.length` (15 bây giờ, 69 khi đủ 12 chương), không gắn cứng. Không bịa dữ liệu: không có tên người chơi; chương 4–12 chưa có kỹ năng thì card không hiện dòng kỹ năng.

**Files:**
- Create: `src/home.ts`
- Test: `tests/home.test.ts`

**Interfaces:**
- Consumes: `currentChapter`, `nextTicket`, `Chapter`, `Skill` (`src/progress.ts`); `Ticket` (`src/tickets.ts`)
- Produces:
  - `type ChapterStatus = 'done' | 'current' | 'locked' | 'soon'` — `soon` = chương chưa có ticket nào ("Sắp có"), khác `locked` (🔒: có ticket nhưng chưa tới)
  - `interface ChapterCard { chapter: number; status: ChapterStatus; done: number; total: number; skills: Skill[]; boss?: Ticket }`
  - `type SkillState = 'locked' | 'open' | 'learned'`
  - `interface SkillCard { skill: Skill; state: SkillState; level: number }` — `level` 0 khi chưa học, `1..LEVELS` khi đã học
  - `interface HomeModel { next?: Ticket; chapter: number; done: number; total: number; learned: number; chapters: ChapterCard[]; skills: SkillCard[] }`
  - `LEVELS = 5`
  - `homeModel(tickets: Ticket[], completed: Set<string>, chapters: Chapter[], skills: Skill[], levelOf?: (skill: string) => number): HomeModel` — `levelOf` mặc định trả 1; Plan 1c truyền hộp Leitner (bị kẹp vào `1..LEVELS`)

- [ ] **Step 1: Viết test `tests/home.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { loadTickets } from '../src/content';
import { homeModel, LEVELS } from '../src/home';
import { CHAPTERS, SKILLS } from '../src/progress';

const tickets = loadTickets();
const ids = (ch: number) => tickets.filter((t) => t.chapter === ch).map((t) => t.id);
const withTickets = new Set(tickets.map((t) => t.chapter));
const model = (completed: string[], levelOf?: (s: string) => number) =>
  homeModel(tickets, new Set(completed), CHAPTERS, SKILLS, levelOf);

describe('homeModel', () => {
  it('save trống: ticket đầu, chương 1 Đang học, chương có ticket bị khóa, chương chưa có ticket là Sắp có', () => {
    const m = model([]);
    expect(m.next?.id).toBe(tickets[0].id);
    expect(m).toMatchObject({ chapter: 1, done: 0, total: tickets.length, learned: 0 });
    expect(m.chapters.map((c) => c.status)).toEqual(
      CHAPTERS.map((c) => (c.chapter === 1 ? 'current' : withTickets.has(c.chapter) ? 'locked' : 'soon')));
  });

  it('xong chương 1: chương 1 Xong (kèm boss), chương 2 Đang học, đếm ticket theo chương', () => {
    const m = model(ids(1));
    const [c1, c2] = m.chapters;
    expect(c1).toMatchObject({ status: 'done', done: ids(1).length, total: ids(1).length });
    expect(c1.boss?.beat).toBe('boss');
    expect(c1.skills.every((s) => s.chapter === 1)).toBe(true);
    expect(c2).toMatchObject({ status: 'current', done: 0, total: ids(2).length });
    expect(m).toMatchObject({ chapter: 2, done: ids(1).length });
  });

  it('kỹ năng: đã học (mức 1) / chưa học ở chương đang mở / khóa ở chương sau', () => {
    const m = model(ids(1));
    const by = (id: string) => m.skills.find((s) => s.skill.id === id)!;
    expect(by('select')).toMatchObject({ state: 'learned', level: 1 });
    expect(by('aggregate')).toMatchObject({ state: 'open', level: 0 });
    expect(by('join')).toMatchObject({ state: 'locked', level: 0 });
    expect(m.learned).toBe(SKILLS.filter((s) => s.chapter === 1).length);
  });

  it('levelOf (Leitner của Plan 1c) được kẹp trong 1..LEVELS', () => {
    const level = (n: number) => model(ids(1), () => n).skills.find((s) => s.skill.id === 'select')!.level;
    expect(level(3)).toBe(3);
    expect(level(99)).toBe(LEVELS);
    expect(level(0)).toBe(1);
  });

  it('xong hết: không còn ticket tiếp theo, chương có ticket đều Xong, chương trống vẫn Sắp có', () => {
    const m = model(tickets.map((t) => t.id));
    expect(m.next).toBeUndefined();
    expect(m.done).toBe(tickets.length);
    expect(m.chapters.filter((c) => c.total > 0).every((c) => c.status === 'done')).toBe(true);
    expect(m.chapters.filter((c) => c.total === 0).every((c) => c.status === 'soon')).toBe(true);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/home.test.ts`
Expected: FAIL — `Failed to resolve import "../src/home"`.

- [ ] **Step 3: Viết `src/home.ts`**

```ts
import { currentChapter, nextTicket, type Chapter, type Skill } from './progress';
import type { Ticket } from './tickets';

/** soon = the chapter has no tickets yet ("Sắp có"); locked = it has tickets the player has not reached (🔒). */
export type ChapterStatus = 'done' | 'current' | 'locked' | 'soon';
export interface ChapterCard { chapter: number; status: ChapterStatus; done: number; total: number; skills: Skill[]; boss?: Ticket }
export type SkillState = 'locked' | 'open' | 'learned';
/** level: 0 = not learned, 1..LEVELS = memory level (Leitner box from Plan 1c; 1 until then). */
export interface SkillCard { skill: Skill; state: SkillState; level: number }
export interface HomeModel {
  /** Next unsolved ticket in story order; undefined when everything is done. */
  next?: Ticket;
  chapter: number;
  done: number;
  total: number;
  learned: number;
  chapters: ChapterCard[];
  skills: SkillCard[];
}

export const LEVELS = 5;

/** Everything on Home, recomputed from the save and the content (nothing extra is stored). */
export function homeModel(
  tickets: Ticket[],
  completed: Set<string>,
  chapters: Chapter[],
  skills: Skill[],
  levelOf: (skill: string) => number = () => 1,
): HomeModel {
  const chapter = currentChapter(tickets, completed);
  const solved = tickets.filter((t) => completed.has(t.id));
  const learned = new Set(solved.flatMap((t) => t.grants));
  return {
    next: nextTicket(tickets, completed),
    chapter,
    done: solved.length,
    total: tickets.length,
    learned: learned.size,
    chapters: chapters.map((c) => {
      const own = tickets.filter((t) => t.chapter === c.chapter);
      const done = own.filter((t) => completed.has(t.id)).length;
      const status: ChapterStatus =
        own.length === 0 ? 'soon' : done === own.length ? 'done' : c.chapter === chapter ? 'current' : 'locked';
      return {
        chapter: c.chapter, status, done, total: own.length,
        skills: skills.filter((s) => s.chapter === c.chapter),
        boss: own.find((t) => t.beat === 'boss'),
      };
    }),
    skills: skills.map((s) => {
      const state: SkillState = learned.has(s.id) ? 'learned' : s.chapter > chapter ? 'locked' : 'open';
      return { skill: s, state, level: state === 'learned' ? Math.min(LEVELS, Math.max(1, levelOf(s.id))) : 0 };
    }),
  };
}
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `npx vitest run tests/home.test.ts && npx tsc --noEmit`
Expected: 5 test PASS; `tsc` không lỗi. Rồi chạy bộ kiểm chuẩn (`npx tsc --noEmit`, `npx vitest run`, `npx vite build`): tất cả xanh.

- [ ] **Step 5: Commit**

```bash
git add src/home.ts tests/home.test.ts
git commit -m "feat: home view-model (chapter status, progress, skill mastery) from save + tickets"
```

---

### Task 5: Router DOM, Trang chủ (registry section + chế độ) và khóa i18n

Task này tạo module, chưa gắn vào trang (Task 6 gắn). Kiểm bằng `tsc` + test.

**Files:**
- Create: `src/ui/router.ts`, `src/ui/homeView.ts`
- Modify: `src/i18n/vi.ts`, `src/i18n/en.ts`

**Interfaces:**
- Consumes: Task 2 (`cx`, `chapterColor`, `CARD`, `PILL`, `BTN_GO`), Task 3 (`Route`, `hashOf`, `initialRoute`, `parseRoute`, `ROUTE_KEY`), Task 4 (`homeModel`, `LEVELS`, `HomeModel`, `ChapterCard`, `ChapterStatus`, `SkillCard`); `readJson`, `writeJson` (`src/storage.ts`); `app`, `actions`, `done` (`src/state.ts`); `CHAPTERS`, `SKILLS`, `chapterTitle` (`src/progress.ts`); `textOf` (`src/tickets.ts`); `h`, `nodes`, `byId` (`src/ui/dom.ts`)
- Produces:
  - `src/ui/router.ts`: `currentRoute(): Route`, `go(r: Route): void`, `startRouter(show: (r: Route, initial: boolean) => void): void`
  - `src/ui/homeView.ts`: `type Span = 'full' | 'wide' | 'narrow'`; `interface HomeSection { id: string; order: number; span: Span; render(m: HomeModel): HTMLElement | null }`; `interface ModeCard { id: string; order: number; icon: string; tint: string; title: Key; desc: Key; open(): void }`; `registerHomeSection(s: HomeSection): void`, `registerMode(m: ModeCard): void` (cùng `id` thì thay thế); `homeHooks: { levelOf?: (skill: string) => number; onSkill?: (skill: string) => void }`; `renderHome(host: HTMLElement): void`
  - Section lõi theo `order`:
    - `continue` (10, wide);
    - `side` (20, narrow): "Thành tích". Task 11 thay bằng `career`, tức lộ trình sự nghiệp;
    - `chapters` (30, full);
    - `skills` (40, full);
    - `modes` (50, full). Trả `null` khi chưa có mode nào, nên card Sandbox / Dữ liệu của tôi / Sổ tay chỉ hiện khi Plan 1c / Import đăng ký.
  - Task 16–17 thêm `harbor` (5), `routes` (25) và `kpi` (35).
  - Khóa i18n `nav.label`, `nav.home`, `nav.play`, `home.*`. Đổi `beat.boss` theo L22.

**Card chương (L21, L23)**, theo `home-v3.html`/`home-v4.html`:
- chữ căn giữa, tiêu đề `text-xl`; huy hiệu số chương tròn màu chương;
- chương chưa mở: 🔒 căn giữa trong ô tròn có padding, chữ `text-muted` (mockup dùng `text-slate-900/55`, chỉ ≈ 3:1 nên không đạt AA);
- card khóa nhận Tab; hover/focus hiện nhãn "Để mở: qua đánh giá thăng tiến chương n". Nhãn luôn có trong DOM và gắn `aria-describedby`, nên trình đọc màn hình đọc được mà không cần hover;
- trạng thái là badge nhỏ: Hoàn thành / Đang làm n/m / Sắp có.

Bỏ thanh tiến độ trong từng card (L23: bớt màu, bớt chi tiết). Mọi chữ mô tả ≥ 14px.

Mở rộng sau này = một lời gọi `registerHomeSection({ id, order, span, render })`, không cần đổi kiến trúc `homeView.ts`.

- [ ] **Step 1: Thêm khóa i18n, đổi ngôn từ "boss" (L22) và test chặn**

Trong `src/i18n/vi.ts`, ngay sau dòng `'area.splitRow': 'Chiều cao panel kết quả',` thêm:
```ts
  'nav.label': 'Điều hướng chính',
  'nav.home': 'Trang chủ',
  'nav.play': 'Làm việc',
  'home.kicker': 'Chương {n} · {title}',
  'home.continue': 'Tiếp tục việc "{title}"?',
  'home.from': '{name} ({dept}) đang chờ kết quả của bạn.',
  'home.progress': '{done}/{total} việc đã xong',
  'home.resume': 'Mở việc này',
  'home.stats': 'Thành tích',
  'home.learned': '{n} kỹ năng đã học',
  'home.chapters': 'Lộ trình {n} chương',
  'home.chaptersIntro': 'Mỗi chương mở thêm phòng ban và bảng dữ liệu. Rê chuột hoặc Tab vào chương đang khóa để xem cần làm gì.',
  'home.status.done': 'Hoàn thành · {done}/{total}',
  'home.status.current': 'Đang làm · {done}/{total}',
  'home.status.locked': 'Chưa mở',
  'home.status.soon': 'Sắp có',
  'home.review': 'Đánh giá thăng tiến: "{title}"',
  'home.lockedAfter': 'Để mở: qua đánh giá thăng tiến chương {n}',
  'home.skills': 'Chủ đề kỹ năng',
  'home.skillsHint': 'Mỗi vạch là một mức nhớ; kỹ năng mới học bắt đầu ở mức 1.',
  'home.skillLearned': 'Đã học',
  'home.skillOpen': 'Chưa học',
  'home.level': 'Mức nhớ {n}/{max}',
  'home.modes': 'Chế độ khác',
```
Trong `src/i18n/en.ts`, ngay sau dòng `'area.splitRow': 'Result panel height',` thêm:
```ts
  'nav.label': 'Main navigation',
  'nav.home': 'Home',
  'nav.play': 'Workspace',
  'home.kicker': 'Chapter {n} · {title}',
  'home.continue': 'Continue the task "{title}"?',
  'home.from': '{name} ({dept}) is waiting for your answer.',
  'home.progress': '{done}/{total} tasks done',
  'home.resume': 'Open this task',
  'home.stats': 'Achievements',
  'home.learned': count('skill learned', 'skills learned'),
  'home.chapters': 'The {n}-chapter path',
  'home.chaptersIntro': 'Each chapter opens new departments and data tables. Hover or Tab onto a locked chapter to see what opens it.',
  'home.status.done': 'Done · {done}/{total}',
  'home.status.current': 'In progress · {done}/{total}',
  'home.status.locked': 'Locked',
  'home.status.soon': 'Coming soon',
  'home.review': 'Promotion review: "{title}"',
  'home.lockedAfter': 'To open: pass the chapter {n} promotion review',
  'home.skills': 'Skill topics',
  'home.skillsHint': 'Each bar is a memory level; a newly learned skill starts at level 1.',
  'home.skillLearned': 'Learned',
  'home.skillOpen': 'Not learned yet',
  'home.level': 'Memory level {n}/{max}',
  'home.modes': 'Other modes',
```
(`count` là helper số ít/số nhiều đã có ở đầu `en.ts`.)

**L22:** trong `src/i18n/vi.ts` thay `'beat.boss': 'Boss',` bằng `'beat.boss': 'Đánh giá thăng tiến',`; trong `src/i18n/en.ts` thay `'beat.boss': 'Boss',` bằng `'beat.boss': 'Promotion review',`.

Trong `tests/i18n.test.ts`:
- thay `const SAME_OK = new Set<string>(['tab.explain', 'top.xp', 'beat.boss']);` bằng `const SAME_OK = new Set<string>(['tab.explain', 'top.xp']);`;
- thêm test cuối trong `describe('từ điển i18n', …)`:
```ts
  it('L22: không chuỗi hiển thị nào dùng giọng game "boss" / "sự cố"', () => {
    const bad = [...Object.entries(vi), ...Object.entries(en)]
      .filter(([, v]) => typeof v === 'string' && /\bboss\b|sự cố/i.test(v))
      .map(([k]) => k);
    expect(bad).toEqual([]);
  });
```
(Thông điệp dạng hàm, tức EN số nhiều, không chứa chữ này nên không cần gọi thử.)

- [ ] **Step 2: Chạy kiểm kiểu và test i18n**

Run: `npx tsc --noEmit && npx vitest run tests/i18n.test.ts`
Expected: `tsc` không lỗi (`en` đủ khóa); test PASS (placeholder khớp, không khóa mới nào VI = EN, không còn "boss").

- [ ] **Step 3: Viết `src/ui/router.ts`**

```ts
import { hashOf, initialRoute, parseRoute, ROUTE_KEY, type Route } from '../route';
import { readJson, writeJson } from '../storage';

let current: Route = 'home';
export const currentRoute = (): Route => current;

/** Navigates through the hash, so Back/Forward work; a no-op when already there. */
export function go(r: Route): void {
  if (location.hash !== hashOf(r)) location.hash = hashOf(r);
}

/**
 * Shows the route in the URL (else the remembered one, else home), then follows hashchange.
 * `initial` is true only for the first show on page load (callers skip moving focus then).
 */
export function startRouter(show: (r: Route, initial: boolean) => void): void {
  const apply = (r: Route, initial: boolean) => {
    current = r;
    writeJson(ROUTE_KEY, r);
    show(r, initial);
  };
  const first = initialRoute(location.hash, readJson<unknown>(ROUTE_KEY));
  history.replaceState(history.state, '', hashOf(first)); // no extra history entry for the redirect
  apply(first, true);
  window.addEventListener('hashchange', () => apply(parseRoute(location.hash) ?? 'home', false));
}
```

- [ ] **Step 4: Viết `src/ui/homeView.ts`**

```ts
import { homeModel, LEVELS, type ChapterCard, type HomeModel, type SkillCard } from '../home';
import { getLang, t, type Key } from '../i18n';
import { CHAPTERS, chapterTitle, SKILLS } from '../progress';
import { actions, app, done } from '../state';
import { BTN_GO, CARD, chapterColor, cx, DONE_PILL, PILL } from '../theme';
import { textOf } from '../tickets';
import { byId, h, nodes } from './dom';
import { go } from './router';

/** Width on >= lg screens (3-column grid); every section is full width below lg. */
export type Span = 'full' | 'wide' | 'narrow';
export interface HomeSection {
  id: string;
  order: number;
  span: Span;
  /** null = nothing to show; the section is skipped. */
  render(m: HomeModel): HTMLElement | null;
}
/** A card under "Other modes", registered only by a feature that exists (Plan 1c: Sandbox, Notebook; Plan Import: My data). */
export interface ModeCard {
  id: string;
  order: number;
  icon: string;
  /** Whole literal Tailwind classes for the icon tile, e.g. 'bg-orange-100 dark:bg-orange-950'. */
  tint: string;
  title: Key;
  desc: Key;
  open(): void;
}

const SPAN: Record<Span, string> = { full: 'lg:col-span-3', wide: 'lg:col-span-2', narrow: 'lg:col-span-1' };
const sections: HomeSection[] = [];
const modes: ModeCard[] = [];

/** Same id replaces the old entry (Plan 1c swaps the 'side' card); the list stays sorted by order. */
function upsert<T extends { id: string; order: number }>(list: T[], item: T): void {
  const i = list.findIndex((x) => x.id === item.id);
  if (i >= 0) list.splice(i, 1);
  list.push(item);
  list.sort((a, b) => a.order - b.order);
}
export const registerHomeSection = (s: HomeSection): void => upsert(sections, s);
export const registerMode = (m: ModeCard): void => upsert(modes, m);

/** Plan 1c: `levelOf` = Leitner box per skill, `onSkill` = practise that skill. */
export const homeHooks: { levelOf?: (skill: string) => number; onSkill?: (skill: string) => void } = {};

const openInbox = (): void => (byId('inbox-dialog') as HTMLDialogElement).showModal();
const percent = (n: number, of: number): number => (of ? Math.round((n / of) * 100) : 0);

/** The ticket is already selected: only switch view (selectTicket would restart a boss at step 1). */
function resume(id: string): void {
  if (app.selectedId === id) go('play');
  else actions.selectTicket(id);
}

/** `track`/`fill`: whole class strings (height + colours). */
function progress(value: number, label: string, track: string, fill: string): HTMLElement {
  return h('div', {
    class: cx('overflow-hidden rounded-full', track),
    role: 'progressbar', 'aria-label': label, 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(value),
  }, h('div', { class: cx('h-full rounded-full', fill), style: `width:${value}%` }));
}

function continueCard(m: HomeModel): HTMLElement {
  const lang = getLang();
  const label = t('home.progress', { done: m.done, total: m.total });
  return h('section', { class: cx(CARD, 'flex h-full flex-col gap-4 p-6'), 'aria-labelledby': 'continue-title' },
    h('div', {},
      h('p', { class: cx('m-0 text-sm font-semibold', chapterColor(m.chapter).text) },
        t('home.kicker', { n: m.chapter, title: chapterTitle(m.chapter, lang) })),
      h('h2', { id: 'continue-title', class: 'mt-1 mb-0 text-2xl font-bold' },
        m.next ? t('home.continue', { title: textOf(m.next, lang).title }) : t('inbox.empty')),
      m.next ? h('p', { class: 'mt-1 mb-0 text-muted' }, t('home.from', { name: m.next.from.name, dept: m.next.from.dept })) : null),
    h('div', { class: 'flex items-center gap-3' },
      progress(percent(m.done, m.total), label, 'h-2.5 flex-1 bg-code', 'bg-linear-to-r from-blue-600 to-cyan-500'),
      h('span', { class: 'text-sm tabular-nums text-muted' }, label)),
    h('div', { class: 'flex flex-wrap gap-2' },
      m.next ? h('button', { type: 'button', class: cx(BTN_GO, 'px-4 py-2'), onclick: () => resume(m.next!.id) }, t('home.resume')) : null,
      h('button', { type: 'button', class: 'px-4 py-2 font-semibold', onclick: openInbox }, t('top.inbox'))));
}

/** Narrow card beside "Continue": neutral text (L23). Task 11 replaces it with the career path ('career'). */
function sideCard(m: HomeModel): HTMLElement {
  return h('section', { class: cx(CARD, 'flex h-full flex-col gap-2 p-6'), 'aria-labelledby': 'side-title' },
    h('h2', { id: 'side-title', class: 'm-0 text-sm font-semibold text-muted' }, t('home.stats')),
    h('p', { class: 'm-0 text-3xl font-bold tabular-nums' }, t('top.xp', { n: app.save.xp })),
    h('p', { class: 'm-0' }, t('home.learned', { n: m.learned })),
    h('p', { class: 'm-0' }, t('home.progress', { done: m.done, total: m.total })));
}

/** Small status badge: the only coloured text on the card (L23). */
function statusPill(c: ChapterCard): HTMLElement | null {
  const n = { done: c.done, total: c.total };
  if (c.status === 'done') return h('span', { class: cx(PILL, DONE_PILL) }, t('home.status.done', n));
  if (c.status === 'current') return h('span', { class: cx(PILL, chapterColor(c.chapter).chip) }, t('home.status.current', n));
  if (c.status === 'soon') return h('span', { class: cx(PILL, 'bg-code text-muted') }, t('home.status.soon'));
  return null;
}

/**
 * L21: centred, larger title; a closed chapter shows a centred padded 🔒, muted text (AA, unlike the mockup's
 * 55% opacity) and, on hover or keyboard focus, what opens it. The hint is always in the DOM (aria-describedby).
 */
function chapterCard(c: ChapterCard): HTMLElement {
  const lang = getLang();
  const color = chapterColor(c.chapter);
  const closed = c.status === 'locked' || c.status === 'soon';
  const hintId = `chapter-hint-${c.chapter}`;
  return h('article', {
    class: cx('group space-y-2 rounded-2xl bg-panel p-5 text-center', c.status === 'current' ? cx(color.ring, 'shadow-md') : 'ring-1 ring-line'),
    tabindex: closed ? '0' : false,
    'aria-current': c.status === 'current' ? 'step' : false,
    'aria-describedby': closed ? hintId : false,
  },
    closed
      ? h('div', { class: 'mx-auto grid size-12 place-items-center rounded-full bg-code p-3 text-2xl', role: 'img', 'aria-label': t(c.status === 'soon' ? 'home.status.soon' : 'home.status.locked') }, '🔒')
      : h('div', { class: cx('mx-auto grid size-12 place-items-center rounded-full text-xl font-bold', color.chip), 'aria-hidden': 'true' }, String(c.chapter)),
    h('h3', { class: cx('m-0 text-xl font-bold', closed && 'text-muted') }, `${c.chapter} · ${chapterTitle(c.chapter, lang)}`),
    c.skills.length ? h('p', { class: cx('m-0 text-[15px]', closed && 'text-muted') }, c.skills.map((s) => s.label[lang]).join(' · ')) : null,
    statusPill(c),
    c.status === 'done' && c.boss ? h('p', { class: 'm-0 text-sm text-muted' }, t('home.review', { title: textOf(c.boss, lang).title })) : null,
    closed
      ? h('p', {
        id: hintId,
        class: 'm-0 inline-block rounded-lg bg-ink px-3 py-1 text-sm text-panel opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100',
      }, t('home.lockedAfter', { n: c.chapter - 1 }))
      : null);
}

function chaptersSection(m: HomeModel): HTMLElement {
  return h('section', { 'aria-labelledby': 'chapters-title' },
    h('div', { class: 'mb-3 flex flex-wrap items-end justify-between gap-2' },
      h('h2', { id: 'chapters-title', class: 'm-0 text-lg font-bold' }, t('home.chapters', { n: m.chapters.length })),
      h('p', { class: 'm-0 text-sm text-muted' }, t('home.chaptersIntro'))),
    h('div', { class: 'grid gap-4 sm:grid-cols-2 lg:grid-cols-4' }, ...m.chapters.map(chapterCard)));
}

function skillCard(s: SkillCard): HTMLElement {
  const lang = getLang();
  const color = chapterColor(s.skill.chapter);
  const locked = s.state === 'locked';
  const body = nodes(
    h('span', { class: 'flex items-center gap-2' },
      h('span', { class: cx('grid size-8 shrink-0 place-items-center rounded-lg font-bold', locked ? 'bg-panel text-muted' : color.chip), 'aria-hidden': 'true' },
        s.skill.id.charAt(0).toUpperCase()),
      h('b', {}, s.skill.label[lang])),
    h('span', { class: 'mt-2 block text-sm text-muted' },
      locked ? `🔒 ${t('brief.chapter', { n: s.skill.chapter })}` : t(s.state === 'learned' ? 'home.skillLearned' : 'home.skillOpen')),
    locked
      ? null
      : h('span', { class: 'mt-2 flex gap-0.5', role: 'img', 'aria-label': t('home.level', { n: s.level, max: LEVELS }) },
        ...Array.from({ length: LEVELS }, (_, i) => h('i', { class: cx('h-1.5 flex-1 rounded', i < s.level ? color.bar : 'bg-code') }))));
  const box = cx('block w-full rounded-xl p-4 text-left ring-1 ring-line', locked ? 'bg-code text-muted' : 'bg-panel');
  const onSkill = homeHooks.onSkill;
  return onSkill && s.state === 'learned'
    ? h('button', { type: 'button', class: cx(box, 'border-0 hover:bg-panel hover:ring-2 hover:ring-accent'), onclick: () => onSkill(s.skill.id) }, ...body)
    : h('div', { class: box }, ...body);
}

function skillsSection(m: HomeModel): HTMLElement {
  return h('section', { 'aria-labelledby': 'skills-title' },
    h('h2', { id: 'skills-title', class: 'mb-3 text-lg font-bold' }, t('home.skills')),
    h('div', { class: 'grid gap-3 sm:grid-cols-3 lg:grid-cols-4' }, ...m.skills.map(skillCard)),
    h('p', { class: 'mt-2 mb-0 text-sm text-muted' }, t('home.skillsHint')));
}

function modesSection(): HTMLElement | null {
  if (modes.length === 0) return null;
  return h('section', { 'aria-labelledby': 'modes-title' },
    h('h2', { id: 'modes-title', class: 'mb-3 text-lg font-bold' }, t('home.modes')),
    h('div', { class: 'grid gap-3 sm:grid-cols-3' }, ...modes.map((md) =>
      h('button', {
        type: 'button',
        class: 'flex items-start gap-3 rounded-xl border-0 bg-panel p-4 text-left ring-1 ring-line hover:bg-panel hover:ring-2 hover:ring-accent',
        onclick: () => md.open(),
      },
        h('span', { class: cx('grid size-10 shrink-0 place-items-center rounded-lg text-xl', md.tint), 'aria-hidden': 'true' }, md.icon),
        h('span', {}, h('b', { class: 'block' }, t(md.title)), h('span', { class: 'text-sm text-muted' }, t(md.desc)))))));
}

registerHomeSection({ id: 'continue', order: 10, span: 'wide', render: continueCard });
registerHomeSection({ id: 'side', order: 20, span: 'narrow', render: sideCard });
registerHomeSection({ id: 'chapters', order: 30, span: 'full', render: chaptersSection });
registerHomeSection({ id: 'skills', order: 40, span: 'full', render: skillsSection });
registerHomeSection({ id: 'modes', order: 50, span: 'full', render: modesSection });

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

- [ ] **Step 5: Kiểm kiểu và test**

Run: `npx tsc --noEmit`, rồi `npx vitest run`, rồi `npx vite build`
Expected: `tsc` không lỗi; tất cả test PASS.

- [ ] **Step 6: Commit**

```bash
git add src/ui/router.ts src/ui/homeView.ts src/i18n/vi.ts src/i18n/en.ts
git commit -m "feat(ui): hash router and Home page with section and mode registries"
```

---

### Task 6: Khung trang, topbar + nav, router và Trang chủ lên màn hình

**Files:**
- Rewrite: `index.html`
- Modify: `src/ui/topbar.ts`, `src/main.ts`, `src/ui/work.ts` (một dòng chặn phím tắt khi màn làm bài đang ẩn), `src/style.css` (xóa LEGACY), `tests/i18n.test.ts`

**Interfaces:**
- Consumes: Task 2 (`cx`, `NAV_LINK`, `TOP_BTN`), Task 3 (`Route`, `hashOf`), Task 5 (`currentRoute`, `go`, `startRouter`, `renderHome`)
- Produces:
  - `src/ui/topbar.ts`: `interface NavItem { id: string; order: number; label: Key; href: string; current(route: Route): boolean; onclick?: () => void }`, `registerNav(item: NavItem): void` (cùng `id` thì thay thế). Mục lõi: `home` (10, `#/`), `play` (20, `#/play`).
  - `src/main.ts`: `showRoute(r: Route, initial: boolean)`; `selectTicket` chuyển sang `#/play`
  - DOM: `<main id="home">` (cuộn riêng ở app shell), `<main id="shell">` (không đổi id), `<nav id="nav">`

- [ ] **Step 1: Viết test (FAIL): mọi khóa `data-i18n` trong `index.html` phải tồn tại**

Hôm nay `applyStatic()` ép kiểu `el.dataset.i18n as Key` nên khóa sai trong HTML không bị `tsc` bắt. Thêm vào `tests/i18n.test.ts`:

1. Dòng import đầu file, thêm (dùng `?raw` của Vite: repo không có `@types/node`, `tsconfig` chỉ có `vite/client`, nên `node:fs` làm `tsc` đỏ):
```ts
import html from '../index.html?raw';
```
2. Trong `describe('từ điển i18n', …)`, thêm test cuối:
```ts
  it('mọi khóa data-i18n / data-i18n-aria trong index.html có trong vi', () => {
    const keys = [...html.matchAll(/data-i18n(?:-aria)?="([^"]+)"/g)].map((m) => m[1]);
    expect(keys).toContain('nav.label');
    expect(keys.filter((k) => !(k in vi))).toEqual([]);
  });
```

Run: `npx vitest run tests/i18n.test.ts`
Expected: FAIL — `expected [ 'top.inbox', … ] to include 'nav.label'` (`index.html` chưa có nav).

- [ ] **Step 2: Viết lại `index.html`**

Đọc file trên đĩa trước; nếu bản sửa a11y đã thêm thuộc tính nào (aria-*, id), giữ thuộc tính đó trên phần tử tương ứng. Nội dung mới:

```html
<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Cargo Query</title>
  </head>
  <body>
    <header class="topbar flex flex-wrap items-center gap-x-4 gap-y-2 bg-linear-to-r from-indigo-700 via-blue-700 to-cyan-700 px-4 py-2 text-white dark:from-indigo-950 dark:via-blue-950 dark:to-cyan-950">
      <h1 class="m-0 flex items-center gap-2 text-lg font-bold"><span class="grid size-8 place-items-center rounded-lg bg-white/15" aria-hidden="true">⚓</span>Cargo Query</h1>
      <nav id="nav" class="flex flex-wrap gap-1 text-sm" data-i18n-aria="nav.label" aria-label="Điều hướng chính"></nav>
      <span id="chapter" class="text-sm"></span>
      <div class="ml-auto flex flex-wrap items-center gap-2 text-sm">
        <span id="xp" class="rounded-full bg-amber-400 px-3 py-1 font-semibold text-amber-950"></span>
        <button id="inbox-btn" type="button" class="border-0 bg-black/20 text-white ring-1 ring-white/40 hover:bg-black/30" data-i18n="top.inbox">Hộp thư</button>
        <div class="flex rounded-lg bg-black/20 p-0.5" role="group" data-i18n-aria="top.lang" aria-label="Ngôn ngữ">
          <button type="button" data-lang="vi" aria-pressed="true" class="border-0 bg-transparent px-2 py-0.5 text-white aria-pressed:bg-white aria-pressed:font-semibold aria-pressed:text-blue-800">VI</button>
          <button type="button" data-lang="en" aria-pressed="false" class="border-0 bg-transparent px-2 py-0.5 text-white aria-pressed:bg-white aria-pressed:font-semibold aria-pressed:text-blue-800">EN</button>
        </div>
        <button id="export-btn" type="button" class="border-0 bg-black/20 text-white ring-1 ring-white/40 hover:bg-black/30" data-i18n="top.export">Xuất tiến độ</button>
        <label class="cursor-pointer rounded-lg bg-black/20 px-3 py-1.5 ring-1 ring-white/40 focus-within:outline-2 focus-within:outline-white hover:bg-black/30"><span data-i18n="top.import">Nhập tiến độ</span><input id="import-input" type="file" accept="application/json" class="sr-only" /></label>
        <span id="db-status" role="status"></span>
      </div>
    </header>
    <div id="map" class="map-strip border-b border-line bg-sea" data-i18n-aria="top.map" aria-label="Bản đồ tuyến" hidden></div>
    <div id="notice" role="status" class="flex items-center gap-2 border-b border-line bg-code px-4 py-2" hidden></div>
    <main id="home" class="shell:min-h-0 shell:flex-1 shell:overflow-auto" data-i18n-aria="nav.home" aria-label="Trang chủ" hidden></main>
    <main id="shell" class="shell" hidden>
      <div class="workspace">
        <section id="ticket" class="min-w-0 rounded-2xl bg-panel p-4 ring-1 ring-line" data-i18n-aria="area.ticket" aria-label="Đề bài"></section>
        <div id="split-col" class="split split-col cursor-col-resize touch-none rounded hover:bg-accent-soft focus-visible:bg-accent-soft" data-i18n-aria="area.splitCol" aria-label="Độ rộng cột đề bài"></div>
        <section id="work" class="min-w-0 rounded-2xl bg-panel p-4 ring-1 ring-line" data-i18n-aria="area.work" aria-label="SQL editor"></section>
      </div>
      <div id="split-row" class="split split-row cursor-row-resize touch-none rounded hover:bg-accent-soft focus-visible:bg-accent-soft" data-i18n-aria="area.splitRow" aria-label="Chiều cao panel kết quả"></div>
      <section id="panel" class="panel min-w-0 rounded-2xl bg-panel p-3 ring-1 ring-line" data-i18n-aria="area.panel" aria-label="Kết quả và trực quan hóa"></section>
    </main>
    <dialog id="inbox-dialog" aria-labelledby="inbox-title">
      <h2 id="inbox-title" class="text-lg" data-i18n="top.inbox">Hộp thư</h2>
      <div id="inbox-list" class="max-h-[60dvh] overflow-auto"></div>
      <form method="dialog" class="mt-3 flex justify-end"><button data-i18n="app.close">Đóng</button></form>
    </dialog>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

Ghi chú: cả hai `<main>` bắt đầu `hidden`; `startRouter` bỏ `hidden` đúng một cái (Preflight có `[hidden] { display: none !important }`, thắng cả `.shell { display: grid }`). Ô chọn file đổi `hidden` → `sr-only` để Tab tới được (nhãn hiện viền focus nhờ `focus-within:`). Gradient kết thúc `cyan-700` (không phải `cyan-600` của mockup) vì chữ trắng cần ≥ 4.5:1. Nav **không** ẩn ở màn hẹp (mockup có `hidden md:flex` — bỏ, vì màn hẹp sẽ không còn đường về Trang chủ).

- [ ] **Step 3: Sửa `src/ui/topbar.ts`**

3a. Thay các dòng import đầu file bằng (giữ thêm import nào người khác đã thêm):
```ts
import { getLang, t, type Key } from '../i18n';
import { chapterTitle, currentChapter } from '../progress';
import { hashOf, type Route } from '../route';
import { actions, app, done } from '../state';
import { NAV_LINK, TOP_BTN } from '../theme';
import { byId, h, nodes } from './dom';
import { currentRoute } from './router';
```
3b. Ngay sau dòng `const mb = (bytes: number): number => Math.round(bytes / 1e5) / 10;` thêm:
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
export function registerNav(item: NavItem): void {
  const i = NAV.findIndex((x) => x.id === item.id);
  if (i >= 0) NAV.splice(i, 1);
  NAV.push(item);
  NAV.sort((a, b) => a.order - b.order);
}
registerNav({ id: 'home', order: 10, label: 'nav.home', href: hashOf('home'), current: (r) => r === 'home' });
registerNav({ id: 'play', order: 20, label: 'nav.play', href: hashOf('play'), current: (r) => r === 'play' });

function renderNav(): void {
  const route = currentRoute();
  byId('nav').replaceChildren(...NAV.map((n) => {
    const click = n.onclick;
    return h('a', {
      href: n.href,
      class: NAV_LINK,
      'aria-current': n.current(route) ? 'page' : false,
      onclick: click ? (e: Event) => { e.preventDefault(); click(); } : false,
    }, t(n.label));
  }));
}
```
3c. Trong `dbStatusView()`, thay:
```ts
  if (app.dbStatus === 'failed') return h('button', { type: 'button', onclick: () => actions.retryDb() }, t('db.retry'));
```
bằng:
```ts
  if (app.dbStatus === 'failed') return h('button', { type: 'button', class: TOP_BTN, onclick: () => actions.retryDb() }, t('db.retry'));
```
3d. Trong `renderNotice()`, thay `class: 'close',` bằng `class: 'ml-auto',`.
3e. Trong `renderTopbar()`, thêm dòng `renderNav();` ngay trước dòng `renderNotice();`. **Giữ nguyên** dòng `byId('xp').textContent = t('top.xp', { n: app.save.xp });` (điểm neo Plan 1c).

- [ ] **Step 4: Sửa `src/main.ts`**

4a. Thêm import (cạnh các import `./ui/*` sẵn có):
```ts
import type { Route } from './route';
import { renderHome } from './ui/homeView';
import { go, startRouter } from './ui/router';
```
4b. Trong `function rerender()`, ngay sau dòng gọi `renderInbox();` thêm:
```ts
  if (!byId('home').hidden) renderHome(byId('home')); // hidden Home is redrawn by showRoute(); Run/Submit in the workspace never rebuild it
```
Vì sao chỉ vẽ khi hiện: `rerender()` chạy sau mỗi lần Chạy. Từ Task 16, Trang chủ có cảnh SVG với vòng lặp CSS; dựng lại nó sẽ làm hoạt cảnh nền giật về đầu, và KPI (Task 17) sẽ chạy lại truy vấn.
4c. Trong `function selectTicket(…)`, ngay **trước** dòng `byId('brief-title').focus();` thêm:
```ts
  go('play'); // from Home or the inbox on Home: the hashchange then focuses the brief (it is hidden until then)
```
4d. Ngay sau thân hàm `nextStep()` (sau dấu `}` đóng hàm), thêm:
```ts
/** #/ = Home, #/play = workspace. Both stay mounted and only toggle `hidden`, so the editor is never recreated. */
function showRoute(r: Route, initial: boolean): void {
  byId('home').hidden = r !== 'home';
  byId('shell').hidden = r !== 'play';
  rerender(); // nav aria-current, Home numbers
  if (!initial) byId(r === 'home' ? 'home-title' : 'brief-title').focus();
}
```
4e. Ở cuối file, ngay sau dòng `work.setTicket(selected(), app.stepIndex);` cuối cùng (sau `initLayout(…)` và `rerender();`), thêm:
```ts
startRouter(showRoute);
```

- [ ] **Step 5: Chặn phím tắt Chạy/Nộp khi màn làm bài đang ẩn (`src/ui/work.ts`)**

Bộ nghe `keydown` trên `document` (bản sửa phím tắt của người khác) sẽ chạy query của editor đang ẩn nếu người chơi bấm Ctrl+Enter ở Trang chủ. Trong listener đó, ngay sau dòng `if (!action) return;` thêm:
```ts
    if (host.closest('[hidden]')) return; // workspace hidden (Home route)
```
(Nếu trên đĩa không có listener này thì bỏ qua bước này.)

- [ ] **Step 6: Xóa CSS LEGACY của topbar/khung trong `src/style.css`**

Trong khối `LEGACY`, xóa đúng các rule sau (đã chuyển thành class trong `index.html`):
```css
.topbar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; padding: 8px 16px; background: var(--bar); color: #fff; }
.topbar h1 { font-size: 18px; margin: 0 auto 0 0; }
.topbar button { background: transparent; color: #fff; border-color: #ffffff88; }
.topbar .file-btn { color: #fff; }
.lang { display: inline-flex; }
.lang button { border-radius: 0; padding: 4px 10px; }
.lang button:first-child { border-radius: 6px 0 0 6px; }
.lang button:last-child { border-radius: 0 6px 6px 0; border-left: 0; }
.lang button[aria-pressed='true'] { background: #fff; color: var(--bar); font-weight: 600; }
.map-strip { background: var(--sea); border-bottom: 1px solid var(--border); }
#notice { display: flex; gap: 8px; align-items: center; padding: 8px 16px; background: var(--code); border-bottom: 1px solid var(--border); }
#notice[hidden] { display: none; }
#notice .close { margin-left: auto; }
#ticket, #work, .panel { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 12px; min-width: 0; }
.split { border-radius: 4px; touch-action: none; }
.split:hover, .split:focus-visible { background: var(--accent-soft); }
.split-col { cursor: col-resize; }
.split-row { cursor: row-resize; }
.file-btn { cursor: pointer; text-decoration: underline; }
```

- [ ] **Step 7: Kiểm kiểu, test, build**

Run: `npx tsc --noEmit`, rồi `npx vitest run`, rồi `npx vite build`
Expected: `tsc` không lỗi; tất cả test PASS (gồm test `data-i18n` mới); build OK.

Run:
```bash
for c in 'from-indigo-700' 'to-cyan-700' 'aria-pressed\:bg-white' 'aria-\[current\=page\]\:bg-black\/30' 'bg-sky-500' 'bg-fuchsia-500' 'bg-pink-500' 'lg\:col-span-2' 'shell\:overflow-auto' 'bg-linear-to-r' 'group-focus-visible\:opacity-100'; do printf '%s ' "$c"; grep -cF "$c" dist/assets/index-*.css; done
```
Expected: mỗi dòng in `1` (class từ `index.html`, `theme.ts` và `homeView.ts` đều được scanner tìm thấy).

Chip chức danh (`#rank`) trên topbar thêm ở **Task 11**: nó cần `career` trong `chapters.yml`, mà task này chưa có.

- [ ] **Step 8: Checklist Edge (orchestrator)**

Orchestrator mở `http://localhost:5173/` trên Edge (xóa key `cargo-query/route` trong Local Storage trước).
1. Không có hash: URL thành `/#/` và hiện Trang chủ, gồm:
   - card "Tiếp tục việc …?" với thanh `0/15 việc đã xong`;
   - card trung tính "Thành tích";
   - lưới chương: mọi chương trong `chapters.yml`, tức 7 trước Task 11 và 12 sau đó. Chữ căn giữa, cỡ lớn. Chương 1 viền sky + badge "Đang làm · 0/5". Chương 2–3 có 🔒 trong ô tròn, chữ xám. Chương 4+ có 🔒 và badge "Sắp có". Rê chuột hoặc Tab vào card khóa thì hiện "Để mở: qua đánh giá thăng tiến chương n";
   - lưới kỹ năng: chương 1 "Chưa học", chương 2–3 🔒.

   **Không** có mục "Chế độ khác".
2. Bấm "Mở việc này" → `#/play`, màn làm bài như cũ, focus ở tiêu đề đề bài, editor vẽ đúng (gutter, chữ, con trỏ). Back → Trang chủ, Forward → lại màn làm bài; editor giữ nguyên nội dung và undo.
3. Nav "Trang chủ" / "Làm việc": mục hiện tại nền tối hơn, chữ đậm, viền trắng mảnh (`aria-current="page"`); Tab tới được; Enter chuyển route.
4. Tải lại khi đang ở `#/play` → vẫn `#/play`. Mở `/` (không hash) → về route cuối cùng (`play`).
5. Ở Trang chủ bấm Ctrl+Enter → không có query nào chạy (tab Kết quả không đổi).
6. Hộp thư (từ topbar hoặc nút trên card) khi đang ở Trang chủ → chọn ticket → sang `#/play` đúng ticket đó.
7. VI ↔ EN: nav, Trang chủ, nhãn trạng thái đổi ngôn ngữ; tên phòng ban/người giữ nguyên.
8. Topbar: chữ trắng đọc rõ ở đầu cyan; nút VI/EN đang chọn nền trắng chữ xanh; mục nav hiện tại nền tối hơn + viền trắng mảnh; Tab tới "Nhập tiến độ" thấy viền trắng, Enter mở hộp chọn file.

- [ ] **Step 9: Commit**

```bash
git add index.html src/ui/topbar.ts src/main.ts src/ui/work.ts src/style.css tests/i18n.test.ts
git commit -m "feat(ui): gradient top bar with nav, hash routing between Home and workspace"
```

---

### Task 7: Đề bài (brief), coach mark, avatar người gửi

**Files:**
- Create: `src/ui/avatar.ts`
- Modify: `src/ui/brief.ts`, `src/ui/coach.ts`, `src/style.css`

**Interfaces:**
- Consumes: Task 2 (`cx`, `chapterColor`, `deptColor`, `DEPT_CHIP`, `PILL`, `initials`)
- Produces: `avatar(from: { name: string; dept: string }): HTMLElement` — **chỗ cắm duy nhất** cho chân dung người giao việc của design v2 (đổi thân hàm, mọi nơi gọi tự đổi theo).

Giữ nguyên các class đánh dấu mà `coach.ts` dùng làm selector focus: `recap` (`.recap button.primary`), `hints` (`.hints button`), `coach` (`closest('.coach')`), `primary` trên nút "Ticket tiếp theo".

- [ ] **Step 1: Viết `src/ui/avatar.ts`**

```ts
import { cx, deptColor, initials } from '../theme';
import { h } from './dom';

/** Ticket sender: initials on the department colour. Design v2 swaps in portraits here (the one place to change). */
export function avatar(from: { name: string; dept: string }): HTMLElement {
  return h('span', {
    class: cx('grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold', deptColor(from.dept)),
    'aria-hidden': 'true',
  }, initials(from.name));
}
```

- [ ] **Step 2: Sửa `src/ui/brief.ts`**

2a. Thêm import:
```ts
import { chapterColor, cx, DEPT_CHIP, deptColor, PILL } from '../theme';
import { avatar } from './avatar';
```
2b. Thẻ "Kết quả mong đợi" — thay từng dòng:

| cũ | mới |
|---|---|
| `const card = h('section', { class: 'shape', 'aria-label': t('shape.title') });` | `const card = h('section', { class: 'my-3 rounded-xl bg-panel p-3 ring-1 ring-line', 'aria-label': t('shape.title') });` |
| `h('h3', {}, t('shape.title')),` | `h('h3', { class: 'mt-0' }, t('shape.title')),` |
| `h('ul', { class: 'shape-cols' }, ...Array.from({ length: n }, (_, i) =>` | `h('ul', { class: 'my-1 flex list-none flex-wrap gap-1.5 p-0' }, ...Array.from({ length: n }, (_, i) =>` |
| `h('li', {}, labels[i] ? …` (trong `shapeCard`) | `h('li', { class: 'rounded-md bg-panel px-1.5 py-0.5 text-sm ring-1 ring-line' }, labels[i] ? …` (giữ nguyên phần sau `{ … },`) |

2c. Gợi ý — thay `return h('section', { class: 'hints' },` bằng `return h('section', { class: 'hints my-3' },` và trong hàm `hints` thay `shown ? h('ol', {}, ` bằng `shown ? h('ol', { class: 'space-y-1' }, `.
2d. Kết luận boss — thay:
- `const msg = h('p', { role: 'status', class: 'feedback bad' });` → `const msg = h('p', { role: 'status', class: 'bad' });`
- `const form = h('form', { class: 'conclusion' },` → `const form = h('form', { class: 'my-3 rounded-xl p-3 ring-2 ring-accent' },`
- `h('h3', {}, t('brief.conclusion')),` → `h('h3', { class: 'mt-0' }, t('brief.conclusion')),`
- `...c.options.map((o, i) => h('label', {},` → `...c.options.map((o, i) => h('label', { class: 'my-1 flex items-center gap-2' },`
2e. Recap — thay:
- `return h('section', { class: 'recap' },` → `return h('section', { class: 'recap my-3 rounded-xl bg-emerald-50 p-4 ring-1 ring-emerald-300 dark:bg-emerald-950/40 dark:ring-emerald-800' },`
- `h('h3', { tabindex: '-1' }, t('recap.title')),` → `h('h3', { tabindex: '-1', class: 'mt-0 text-emerald-900 dark:text-emerald-200' }, t('recap.title')),` (giữ nguyên mọi thuộc tính khác người khác đã thêm, ví dụ `id`)
- `h('ul', { class: 'skill-cards' }, ` → `h('ul', { class: 'space-y-1' }, `
- `h('div', { class: 'compare' },` → `h('div', { class: 'my-2 grid gap-2 sm:grid-cols-2' },`
- hai lần `h('figcaption', {}, ` → `h('figcaption', { class: 'mb-1 text-sm text-muted' }, `

(`text-emerald-900` trên `emerald-50` ≈ 9:1; `emerald-200` trên nền tối ≈ 10:1.)
2f. Đầu đề bài trong `renderBrief` — thay khối:
```ts
    h('header', {},
      h('h2', { id: 'brief-title', tabindex: '-1' }, x.title),
      h('p', { class: 'meta' },
        h('span', { class: 'dept' }, tk.from.dept),
        ` ${tk.from.name} · ${t('brief.chapter', { n: tk.chapter })} · ${t(BEAT[tk.beat])} · ${'★'.repeat(tk.difficulty)}`,
        isDone ? ` · ✓ ${t('inbox.done')}` : ''),
```
bằng (dòng meta lên trên tiêu đề như mockup; beat thành pill màu chương):
```ts
    h('header', { class: 'space-y-2' },
      h('p', { class: 'm-0 flex flex-wrap items-center gap-2 text-sm text-muted' },
        avatar(tk.from),
        h('span', { class: cx(DEPT_CHIP, deptColor(tk.from.dept)) }, tk.from.dept),
        `${tk.from.name} · ${t('brief.chapter', { n: tk.chapter })} · ${'★'.repeat(tk.difficulty)}`,
        h('span', { class: cx(PILL, chapterColor(tk.chapter).chip) }, t(BEAT[tk.beat])),
        isDone ? `✓ ${t('inbox.done')}` : ''),
      h('h2', { id: 'brief-title', tabindex: '-1', class: 'm-0 text-lg font-bold' }, x.title),
```
(dòng `x.fallback ? h('p', { class: 'tag' }, …) : null),` phía sau giữ nguyên.)
2g. Thay:
- `x.task ? h('section', { class: 'task' }, h('h3', {}, t('brief.task')), richText(x.task)) : null,` → `x.task ? h('section', { class: 'my-3 rounded-lg border-l-4 border-accent bg-accent-soft p-3' }, h('h3', { class: 'mt-0' }, t('brief.task')), richText(x.task)) : null,`
- `? h('section', { class: 'step' },` → `? h('section', { class: 'my-3 rounded-lg p-3 ring-1 ring-line' },` và dòng `h('h3', {}, t('brief.step', …` ngay dưới → `h('h3', { class: 'mt-0' }, t('brief.step', …`

- [ ] **Step 3: Sửa `src/ui/coach.ts`**

Thay:
```ts
  return h('aside', { class: 'coach', role: 'note' },
    h('p', {}, t(TEXT[spot])),
    h('button', { type: 'button', onclick: (e) => { dismissed.add(spot); close(e); } }, t('coach.ok')),
    h('button', { type: 'button', onclick: (e) => { writeJson(COACH_KEY, true); close(e); } }, t('coach.skip')));
```
bằng (giữ class đánh dấu `coach` cho `closest('.coach')`):
```ts
  return h('aside', { class: 'coach my-3 rounded-xl bg-accent-soft p-3 ring-1 ring-accent', role: 'note' },
    h('p', { class: 'mt-0 mb-2' }, t(TEXT[spot])),
    h('button', { type: 'button', class: 'mr-1.5', onclick: (e) => { dismissed.add(spot); close(e); } }, t('coach.ok')),
    h('button', { type: 'button', onclick: (e) => { writeJson(COACH_KEY, true); close(e); } }, t('coach.skip')));
```

- [ ] **Step 4: Xóa CSS LEGACY của đề bài**

Trong khối `LEGACY` của `src/style.css`, xóa:
```css
.dept { display: inline-block; padding: 0 6px; border-radius: 4px; background: var(--accent-soft); color: var(--text); font-weight: 600; }
.task, .step, .shape, .recap, .coach { border: 1px solid var(--border); border-radius: 6px; padding: 8px 12px; margin: 12px 0; }
.task { border-left: 4px solid var(--accent); }
.shape ul { list-style: none; display: flex; flex-wrap: wrap; gap: 6px; padding: 0; margin: 4px 0; }
.shape li { border: 1px solid var(--border); border-radius: 4px; padding: 2px 6px; font-size: 13px; }
.recap { border-color: var(--good); }
.recap .compare { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px; }
.recap figure { margin: 0; }
.skill-cards { padding-left: 18px; }
.coach { background: var(--accent-soft); border-color: var(--accent); }
.coach p { margin: 0 0 6px; }
.coach button { margin-right: 6px; }
.hints ol { padding-left: 20px; }
.conclusion label { display: block; margin: 4px 0; }
```

- [ ] **Step 5: Kiểm kiểu, test, build**

Run: `npx tsc --noEmit`, rồi `npx vitest run`, rồi `npx vite build`
Expected: không lỗi; tất cả test PASS; build OK. Thêm: `grep -cF "bg-pink-100" dist/assets/index-*.css` → `1` (màu phòng Sales từ `theme.ts`).

- [ ] **Step 6: Checklist Edge (orchestrator)**

`#/play`, sáng + tối:
1. Đầu đề: ô tròn chữ cái đầu (màu phòng ban), chip phòng ban viết hoa (Ops xanh dương, Sales hồng, Customs hổ phách, CS teal, Management tím, Finance xanh lá), tên · chương · sao, pill beat theo màu chương, rồi tiêu đề.
2. Khung "Yêu cầu" viền trái xanh; thẻ "Kết quả mong đợi" có các ô cột; gợi ý đánh số 1., 2.; ticket cột mốc (beat boss) có pill "Đánh giá thăng tiến", khung bước và (khi xong các bước) khung kết luận viền accent, chọn sai báo chữ đỏ.
3. Xong ticket: Recap nền xanh nhạt, hai khối SQL cạnh nhau (≥ 640px) hoặc chồng nhau (hẹp); nút "Ticket tiếp theo →" màu accent.
4. Coach mark ticket đầu: khung xanh nhạt; "Hiểu rồi" đóng và focus nhảy đúng chỗ như trước.

- [ ] **Step 7: Commit**

```bash
git add src/ui/avatar.ts src/ui/brief.ts src/ui/coach.ts src/style.css
git commit -m "feat(ui): Tailwind brief with sender avatar, department chip and chapter-coloured beat"
```

---

### Task 8: Khu làm bài (nút Nộp xanh, phản hồi, lịch sử), Hộp thư, hiệu ứng mừng, chặn ghép class

**Files:**
- Create: `src/ui/celebrate.ts`
- Modify: `src/ui/work.ts`, `src/ui/inbox.ts`, `src/style.css`
- Test: `tests/theme.test.ts` (thêm test quét class)

**Interfaces:**
- Consumes: Task 2 (`cx`, `BTN_SUBMIT`, `DEPT_CHIP`, `deptColor`), Task 7 (`avatar`)
- Produces: `celebrate(el: HTMLElement): void` — hiệu ứng "pop" ngắn (`motion-safe:animate-pop`), không chạy khi `prefers-reduced-motion`. Design v2 có thể thêm confetti/âm thanh trong hàm này.

- [ ] **Step 1: Viết test quét class (FAIL)**

Trong `tests/theme.test.ts`, thêm test cuối trong `describe('theme', …)`. File nguồn được đọc bằng `import.meta.glob` + `?raw` của Vite, giống `src/content.ts`. Không dùng `node:fs`: repo không có `@types/node`, nên `tsc` sẽ đỏ.
```ts
  it('src không ghép class bằng template literal hay mảnh tên (scanner Tailwind chỉ thấy tên nguyên vẹn)', () => {
    const sources = import.meta.glob<string>('../src/**/*.ts', { query: '?raw', import: 'default', eager: true });
    const bad = Object.entries(sources).flatMap(([file, src]) => src.split('\n')
      .map((line, i) => `${file.replace('../src/', '')}:${i + 1}: ${line.trim()}`)
      .filter((line) => /\bclass(Name)?\s*[:=]\s*`/.test(line) || /\b(bg|text|ring|border|from|via|to|fill|stroke)-\$\{/.test(line)));
    expect(Object.keys(sources).length).toBeGreaterThan(20);
    expect(bad).toEqual([]);
  });
```

Run: `npx vitest run tests/theme.test.ts`
Expected: FAIL, danh sách gồm `ui/work.ts:…: feedback.className = \`feedback ${message?.kind ?? ''}\`;` và `ui/inbox.ts:…: class: \`mail${current ? ' active' : ''}…`.

- [ ] **Step 2: Viết `src/ui/celebrate.ts`**

```ts
/** One short "pop" on `el` when the player gets something right. motion-safe: skips it under prefers-reduced-motion. */
export function celebrate(el: HTMLElement): void {
  el.classList.remove('motion-safe:animate-pop');
  void el.offsetWidth; // restart the animation if it is still running
  el.classList.add('motion-safe:animate-pop');
}
```

- [ ] **Step 3: Sửa `src/ui/work.ts`**

3a. Thêm import:
```ts
import { BTN_SUBMIT } from '../theme';
import { celebrate } from './celebrate';
```
3b. Ngay trên dòng `export function mountWork(` thêm:
```ts
const FEEDBACK: Record<'good' | 'bad', string> = {
  good: 'mt-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-100 dark:ring-emerald-800',
  bad: 'mt-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-900 ring-1 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-100 dark:ring-rose-800',
};
```
3c. Thay từng dòng:

| cũ | mới |
|---|---|
| `const editorHost = h('div', { class: 'editor' });` | `const editorHost = h('div', { class: 'editor overflow-hidden rounded-xl ring-1 ring-line' });` |
| `const submitBtn = h('button', { type: 'button', class: 'primary', onclick: () => void submit() });` | `const submitBtn = h('button', { type: 'button', class: BTN_SUBMIT, onclick: () => void submit() });` |
| `const feedback = h('div', { class: 'feedback', role: 'status' });` | `const feedback = h('div', { role: 'status' });` |
| `const historyBox = h('details', { class: 'history' });` | `const historyBox = h('details', { class: 'mt-2 text-sm' });` |
| `host.replaceChildren(editorHost, h('div', { class: 'actions' }, runBtn, formatBtn, submitBtn), feedback, historyBox);` | `host.replaceChildren(editorHost, h('div', { class: 'max-sm:sticky max-sm:bottom-0 max-sm:z-10 max-sm:bg-panel' }, h('div', { class: 'actions' }, runBtn, formatBtn, submitBtn)), feedback, historyBox);` |
| `feedback.className = \`feedback ${message?.kind ?? ''}\`;` | `feedback.className = message ? FEEDBACK[message.kind] : '';` |

Đoạn `h('div', { class: 'actions' }, runBtn, formatBtn, submitBtn)` giữ y nguyên chữ: Plan 1b chèn nút EXPLAIN sau `runBtn` ở đây. `BTN_SUBMIT` có `ml-auto` nên Nộp nằm sát phải.
3d. Lịch sử (trong `drawHistory`) — thay:
- `h('summary', {}, t('hist.title', …))` → `h('summary', { class: 'cursor-pointer text-muted' }, t('hist.title', …))`
- `h('ul', {}, ...list.map(` → `h('ul', { class: 'my-1 list-none p-0' }, ...list.map(`
- `class: 'hist',` → `class: 'w-full border-0 bg-transparent px-1 py-0.5 text-left font-mono text-xs hover:bg-code',`
3e. Mừng khi đúng — trong `submit()`, ngay sau mỗi dòng `say('good', () => t('work.stepDone', { i: i + 1 }));` và `say('good', () => t('work.correct'));` thêm:
```ts
      celebrate(feedback);
```
(Không gọi sau `work.queued` hay `work.conclusionNext`.)

- [ ] **Step 4: Sửa `src/ui/inbox.ts`**

4a. Thêm import:
```ts
import { cx, DEPT_CHIP, deptColor } from '../theme';
import { avatar } from './avatar';
```
4b. Thay:
```ts
        class: `mail${current ? ' active' : ''}${isDone ? ' done' : ''}`,
```
bằng (`aria-current` đã có trên nút nên trạng thái "đang mở" vẽ bằng biến thể `aria-[current=true]:`):
```ts
        class: cx(
          'mb-1.5 block w-full p-2 text-left aria-[current=true]:border-accent aria-[current=true]:shadow-[inset_3px_0_0_var(--accent)]',
          isDone && 'bg-code'),
```
4c. Thay ba dòng `span` bên trong nút:
```ts
        h('span', { class: 'from' }, `${tk.from.name} · ${tk.from.dept}`),
        h('span', { class: 'subject' }, textOf(tk, lang).title),
        h('span', { class: 'meta' }, isDone ? …
```
bằng:
```ts
        h('span', { class: 'flex items-center gap-2 text-sm text-muted' },
          avatar(tk.from), h('span', { class: cx(DEPT_CHIP, deptColor(tk.from.dept)) }, tk.from.dept), tk.from.name),
        h('span', { class: 'mt-1 block font-semibold' }, textOf(tk, lang).title),
        h('span', { class: 'block text-sm text-muted' }, isDone ? …
```
(phần `isDone ? … : …` sau cùng giữ nguyên.)

- [ ] **Step 5: Xóa CSS LEGACY của khu làm bài và hộp thư**

Trong khối `LEGACY`, xóa:
```css
@media (max-width: 599px) {
  .actions { position: sticky; bottom: 0; background: var(--panel); padding: 8px 0; z-index: 1; }
  .tabs { flex-wrap: nowrap; overflow-x: auto; }
}
.from, .meta { color: var(--muted); font-size: 13px; }
.editor { border: 1px solid var(--border); border-radius: 6px; }
.history summary { cursor: pointer; color: var(--muted); }
.history ul { list-style: none; padding: 0; margin: 4px 0; }
.history .hist { width: 100%; text-align: left; font-family: ui-monospace, monospace; font-size: 12px; border: 0; padding: 2px 4px; }
.mail { display: block; width: 100%; text-align: left; padding: 8px; margin-bottom: 6px; }
.mail.active { border-color: var(--accent); box-shadow: inset 3px 0 var(--accent); }
.mail.done { background: var(--code); }
.mail span { display: block; }
.mail .subject { font-weight: 600; }
```
(Phần `.tabs` của khối media chuyển thành class ở Task 9; ở giữa hai task, tab trên màn < 600px chỉ xuống dòng thay vì cuộn ngang — chấp nhận.)

- [ ] **Step 6: Chạy test, kiểm kiểu, build**

Run: `npx tsc --noEmit`, rồi `npx vitest run`, rồi `npx vite build`
Expected: test quét class PASS (danh sách rỗng); tất cả test PASS; build OK. Thêm: `grep -cF "bg-emerald-700" dist/assets/index-*.css` → `1`; `grep -cF "animate-pop" dist/assets/index-*.css` → `1`.

- [ ] **Step 7: Checklist Edge (orchestrator)**

1. Nút Nộp xanh lá, sát phải; Chạy/Định dạng trắng viền. Đang chạy: Nộp mờ, viền nét đứt không còn (border-0) nhưng chữ xám `--disabled`.
2. Nộp đúng: khung xanh lá "Đúng rồi!" "nảy" nhẹ một lần; bật `prefers-reduced-motion: reduce` (DevTools → Rendering) → không nảy. Nộp sai: khung hồng, lỗi Postgres đỏ đọc rõ ở cả hai theme.
3. Màn < 640px: hàng nút dính đáy khi cuộn.
4. Lịch sử: "Lịch sử (n)" mở/đóng; mỗi dòng ✓/✗ + SQL mono; bấm → nạp lại vào editor.
5. Hộp thư: mỗi thư có avatar + chip phòng ban + tên, tiêu đề đậm; thư đang mở có vạch accent bên trái; thư đã xong nền xám nhạt.

- [ ] **Step 8: Commit**

```bash
git add src/ui/celebrate.ts src/ui/work.ts src/ui/inbox.ts src/style.css tests/theme.test.ts
git commit -m "feat(ui): green Submit, coloured feedback with celebrate(), Tailwind inbox; forbid class fragments"
```

---

### Task 9: Panel tab, bảng kết quả, lỗi SQL; dọn hết LEGACY

**Files:**
- Modify: `src/ui/tabs.ts`, `src/ui/resultTable.ts`, `src/ui/feedback.ts`, `src/style.css`

**Interfaces:**
- Consumes: Task 2 (`cx`)
- Produces: tab đang mở vẽ bằng `aria-selected:` (gạch chân xanh); `registerTab`/`TabSpec`/`createPanel` **không đổi** nên tab của Plan 1b tự có kiểu mới.

- [ ] **Step 1: Sửa `src/ui/tabs.ts`**

1a. Thêm import:
```ts
import { cx } from '../theme';
```
1b. Ngay trên dòng `const GROUPS: TabGroup[] = ['output', 'query', 'schema'];` thêm:
```ts
/** Underline colour on the open tab (aria-selected): blue-700 on white 6.7:1, blue-300 on the dark panel 9:1. */
const TAB = 'rounded-t-lg rounded-b-none border-x-0 border-t-0 border-b-2 border-transparent bg-transparent px-3 py-1.5 text-muted hover:bg-code aria-selected:border-blue-600 aria-selected:font-semibold aria-selected:text-blue-700 dark:aria-selected:border-blue-400 dark:aria-selected:text-blue-300';
```
1c. Thay:

| cũ | mới |
|---|---|
| `class: i > 0 && tab.group !== tabs[i - 1].group ? 'group-start' : '',` | `class: cx(TAB, i > 0 && tab.group !== tabs[i - 1].group && 'ml-4'),` |
| `const bar = h('div', { class: 'tabs', role: 'tablist', …` | `const bar = h('div', { class: 'mb-2.5 flex flex-wrap gap-1 border-b border-line max-sm:flex-nowrap max-sm:overflow-x-auto', role: 'tablist', …` (phần sau giữ nguyên) |
| `b.classList.toggle('on', on);` | *(xóa dòng: `aria-selected` đã được đặt ngay trên)* |
| `h('span', { class: 'new' }, t('tab.new'))` | `h('span', { class: 'ml-1.5 rounded bg-accent px-1 text-[11px] text-on-accent' }, t('tab.new'))` |
| `return h('div', { class: 'schema-list' }, ...tables.map((table) =>` | `return h('div', { class: 'grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2' }, ...tables.map((table) =>` |

và trong `schemaList()`: `h('h3', {}, table),` → `h('h3', { class: 'm-0' }, table),`; `h('ul', {}, ...app.columns[table]` → `h('ul', { class: 'mt-1 mb-2 list-none pl-2 text-sm' }, ...app.columns[table]`.

- [ ] **Step 2: Sửa `src/ui/resultTable.ts`**

| cũ | mới |
|---|---|
| `h('td', { class: v === null ? 'null' : '' },` | `h('td', { class: v === null ? 'italic text-muted' : '' },` |
| `h('tr', { class: row === mark ? 'mismatch' : '' }, …` | `h('tr', { class: row === mark ? 'bg-accent-soft' : '' }, …` |
| `h('div', { class: 'table-wrap' },` | `h('div', { class: 'max-h-[420px] overflow-auto rounded-xl ring-1 ring-line' },` |
| `h('th', { scope: 'col' }, c)` | `h('th', { scope: 'col', class: 'sticky top-0 bg-canvas font-semibold text-muted' }, c)` |

- [ ] **Step 3: Sửa `src/ui/feedback.ts`**

- `return h('div', { class: 'sql-error' },` → `return h('div', { class: 'space-y-1' },`
- `note ? h('p', { class: 'explain' }, t(note)) : null);` → `note ? h('p', { class: 'border-l-4 border-accent pl-2' }, t(note)) : null);`

- [ ] **Step 4: Xóa phần LEGACY còn lại**

Xóa toàn bộ phần còn lại của khối, từ dòng `/* ==== LEGACY (Plan 1 style.css)…` đến hết dòng `/* ==== END LEGACY ==== */`, tức các rule:
```css
.sql-error .explain { … }
.tabs { … }  .tabs button { … }  .tabs button.on { … }  .tabs .group-start { … }  .tabs .new { … }
.table-wrap { … }
th { position: sticky; top: 0; background: var(--panel); }
td.null { … }  tr.mismatch td { … }
.schema-list { … }  .schema-list h3 { … }  .schema-list ul { … }
```
Kiểm:
```bash
grep -c "LEGACY\|\.mail\|\.tabs\|\.recap\|\.topbar {" src/style.css
```
Expected: `0` (`.topbar :focus-visible` trong `@layer base` không khớp mẫu `.topbar {`). Nếu còn rule cũ nào khác (do người khác thêm sau 16d38b1), chuyển nó thành class Tailwind ở file `.ts` tương ứng rồi xóa.

`src/style.css` cuối cùng = phần trên khối LEGACY của Task 1 Step 3 (import + `@custom-variant` + token + `@theme` + `@layer base` + `@layer components` + layout splitter + CodeMirror + reduced-motion), không hơn.

- [ ] **Step 5: Kiểm kiểu, test, build và các class đã được sinh**

Run: `npx tsc --noEmit`, rồi `npx vitest run`, rồi `npx vite build`
Expected: không lỗi; tất cả test PASS; build OK.

Run:
```bash
for c in 'aria-selected\:border-blue-600' 'dark\:aria-selected\:text-blue-300' 'max-sm\:overflow-x-auto' 'grid-cols-\[repeat' 'max-h-\[420px\]' 'aria-\[current\=true\]\:shadow' 'bg-violet-500' 'bg-amber-500' 'bg-rose-500' 'bg-emerald-500' 'bg-indigo-500' 'bg-teal-100'; do printf '%s ' "$c"; grep -cF "$c" dist/assets/index-*.css; done
```
Expected: mỗi dòng in `1`. Dòng nào in `0` = class đó không ở dạng chuỗi nguyên vẹn trong `src/**/*.ts` hoặc `index.html` → sửa nguồn, không thêm safelist.

- [ ] **Step 6: Checklist Edge (orchestrator)**

1. Panel: tab đang mở chữ xanh đậm + gạch chân xanh, tab khác chữ xám; ←/→/Home/End vẫn chuyển focus, Enter mở; nhóm tab cách nhau.
2. Bảng kết quả: header dính khi cuộn, nền khác thân bảng; ô NULL nghiêng xám; dòng lệch (sau Nộp sai) nền xanh nhạt + nhãn "không khớp".
3. Lỗi SQL: thông điệp Postgres đỏ, HINT xám, dòng giải thích có vạch trái.
4. Màn < 640px: thanh tab cuộn ngang, không xuống dòng.

- [ ] **Step 7: Commit**

```bash
git add src/ui/tabs.ts src/ui/resultTable.ts src/ui/feedback.ts src/style.css
git commit -m "feat(ui): Tailwind tabs, result table and SQL errors; remove legacy CSS"
```

---

### Task 10: Ghi chú Tailwind trong `CLAUDE.md`, kiểm tổng phần restyle

**Files:**
- Modify: `CLAUDE.md` (ba plan 1b/1c/Import: Task 19)

- [ ] **Step 1: Sửa `CLAUDE.md`**

1a. Trong mục **Architecture**, thay toàn bộ gạch đầu dòng bắt đầu bằng `- UI: plain TypeScript DOM via \`h()\`` bằng:
```markdown
- UI: plain TypeScript DOM via `h()` (`src/ui/dom.ts`), no framework, styled with Tailwind CSS v4 (`@tailwindcss/vite`, L17). `src/state.ts` holds app state and selectors (no DOM); `actions` lets UI modules call back into `main.ts`. Two views, both always mounted and toggled with `hidden` (the editor is never recreated): Home `<main id="home">` (`ui/homeView.ts`) and the workspace `<main id="shell">`. Hash routes `#/` and `#/play` (`src/route.ts` pure, `ui/router.ts` DOM: `go()`, `currentRoute()`); Practice/Sandbox (Plan 1c) are modes inside `play`, not routes. One module per region: `ui/topbar.ts` (nav via `registerNav()`), `ui/inbox.ts`, `ui/brief.ts` (left pane: message, task, shape card, hints, conclusion, Recap; sender `avatar()` in `ui/avatar.ts`), `ui/work.ts` (editor, Run/Format/Submit, feedback, history), `ui/tabs.ts` (bottom panel). `ui/coach.ts` is the onboarding coach marks, `ui/splitter.ts` the resizable panes (`initLayout`), `ui/celebrate.ts` the one success animation. `main.ts` only wires them together.
- Home is an ordered list of sections (`registerHomeSection({ id, order, span, render })`, same id replaces) built from the pure view-model `homeModel()` (`src/home.ts`: chapter status done/current/locked/soon, progress, skill level; `homeHooks.levelOf` takes Leitner boxes). "Other modes" cards appear only when a feature calls `registerMode()`.
- Styling: `src/style.css` keeps the colour tokens (`--bg`, `--panel`, `--accent`…, light + `prefers-color-scheme: dark`) and maps them to Tailwind with `@theme inline` (`bg-panel`, `text-muted`, `ring-line`, `bg-accent-soft`…), so neutrals need no `dark:`. `@layer base` restores button/heading/list/table/dialog defaults; `@layer components` keeps the shared class names `.muted .good .bad .warn .error pre.sql .stale .actions button.primary .tag` (later plans use them). Plain CSS remains only for the splitter layout (`--col`/`--row`), CodeMirror internals and reduced motion. Tailwind scans only `index.html` and `src/**/*.ts`: every class must be a whole literal string (colour maps in `src/theme.ts`: `CHAPTER_COLOR`, `DEPT_COLOR`; join with `cx()`); `tests/theme.test.ts` fails on template-literal classes. Text contrast ≥ 4.5:1 in both themes (white text only on -700 or darker).
```
1b. Trong gạch đầu dòng về localStorage keys, thêm sau `` `cargo-query/history` (…) ``:
```markdown
, `cargo-query/route` (last route, `home` | `play`)
```
1c. Trong gạch đầu dòng "Dependencies are pinned exactly", thêm vào danh sách: `` `tailwindcss` 4.3.5 and `@tailwindcss/vite` 4.3.5 (dev) ``.

- [ ] **Step 2: Ghi chú cho Plan 1b/1c/Import: để Task 19**

Khối "Sau Plan 1d" chèn vào ba plan kia viết **một lần, ở Task 19**, khi đã biết hình dạng cuối của Plan 1d: `rankOf`, KPI, bản đồ tuyến, hoạt cảnh, `people.yml`, 12 chương. Viết ở đây thì tới Task 19 lại phải sửa.

- [ ] **Step 3: Kiểm tổng**

Run:
```bash
npx tsc --noEmit
npx vitest run
npx vite build
```
Expected: `tsc` không lỗi; tất cả test PASS (gồm `theme`, `route`, `home`, `i18n` mới); build OK, có một file `dist/assets/index-*.css`.

Run:
```bash
grep -rnE "\.innerHTML\s*=|insertAdjacentHTML" src; echo "exit=$?"
```
Expected: không dòng nào, `exit=1`.

- [ ] **Step 4: Checklist Edge (orchestrator; ghi kết quả vào mô tả commit/PR)**

Orchestrator chạy trên Edge, dev server và một lần bản build. Với **mỗi** dòng dưới đây, kiểm ở **sáng** và **tối** (DevTools → Rendering → Emulate `prefers-color-scheme`):

Kích thước:
- [ ] ≥ 1024×700 (ví dụ 1280×800): màn làm bài vừa một màn hình, mỗi vùng tự cuộn; hai thanh chia kéo được, ←/→/↑/↓/Home/End hoạt động, nhấp đúp về mặc định; hover/focus thanh chia hiện nền accent nhạt. Trang chủ cuộn trong vùng của nó (topbar đứng yên).
- [ ] < 900px (ví dụ 820×1000) và 375×740: một cột, topbar và nav xuống dòng không tràn ngang (`document.documentElement.scrollWidth === innerWidth`), lưới chương 2 cột (≥ 640) hoặc 1 cột, hàng nút Chạy/Nộp dính đáy (< 640), thanh tab cuộn ngang.

Bàn phím (không chuột):
- [ ] Tab từ đầu trang: logo không nhận focus → Trang chủ → Làm việc → XP (không) → Hộp thư → VI → EN → Xuất → Nhập (viền trắng trên nhãn) → (nội dung). Mọi phần tử focus có viền rõ (trắng trên topbar, accent ở nơi khác).
- [ ] Trang chủ: Tab tới "Mở việc này", "Hộp thư", từng card chương khóa (hiện nhãn "Để mở…"); Enter chạy đúng. Đổi route bằng nav → focus về tiêu đề vùng mới (`#home-title` ẩn với mắt nhưng screen reader đọc "Trang chủ"; `#brief-title` ở màn làm bài).
- [ ] Back/Forward của trình duyệt chuyển route; tải lại giữ route; Ctrl+Enter ở Trang chủ không chạy gì.
- [ ] Dialog Hộp thư: mở bằng Enter, Esc đóng, focus trở lại nút.

Tương phản (DevTools → Inspect → Accessibility pane hoặc axe DevTools; tất cả ≥ 4.5:1 cho chữ thường):
- [ ] Topbar: chữ trắng trên cả ba điểm gradient (indigo-700, blue-700, cyan-700; dark: -950); nút `bg-black/20`; VI/EN đang chọn (blue-800 trên trắng).
- [ ] Nút Nộp (trắng/emerald-700), nút "Mở việc này" (trắng/blue-700, dark blue-600); card Thành tích chữ `--text`/`--muted` trên `--panel`.
- [ ] Chip chương (-800/-100, dark -200/-950), chip phòng ban, badge "Hoàn thành" (emerald-800/-100, dark -200/-950), "Đang làm" (chip màu chương), "Sắp có" và chữ card khóa (`--muted`), nhãn "Để mở…" (`--panel` trên `--text`).
- [ ] Phản hồi xanh/hồng, Recap, tab đang mở (blue-700 / blue-300), chữ xám tab chưa mở.
- [ ] Trạng thái hover/disabled không làm chữ dưới 4.5:1 (nút Nộp lúc đang chạy dùng `--disabled` trên `--code`: là trạng thái vô hiệu, WCAG không yêu cầu).

Chức năng không đổi:
- [ ] Làm trọn `ch1-01` → `ch1-05` (cả cột mốc 3 bước + kết luận): Nộp, Recap, "Ticket tiếp theo", coach mark, gợi ý, lịch sử, Xuất/Nhập tiến độ, banner thông báo (thử chặn localStorage để thấy `save.writeFailed`) đều chạy như trước. Về Trang chủ: chương 1 badge "Hoàn thành · 5/5" + "Đánh giá thăng tiến: …", chương 2 "Đang làm", kỹ năng chương 1 có 1 vạch màu.
- [ ] VI ↔ EN ở cả hai route: không còn chuỗi VI khi ở EN; editor giữ nội dung.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: Tailwind + Home architecture notes"
```

---

### Task 11: Khung 12 chương, bậc nghề (`rankOf`), chip chức danh, lộ trình sự nghiệp, đoạn mở chương

Phần (a) của thiết kế. Nguồn: `curriculum.md` §0, §1, §3, §7.2 và L27, L30, L19, L22.
- 12 chương. Ch4–12 hiện "Sắp có" tới khi có ticket: `homeModel` đã trả `soon` cho chương không có ticket.
- Mỗi chương có `career` (bước nghề đạt được khi qua "Đánh giá thăng tiến" của chương), `tier` (★ = đổi chức danh: ch1, 3, 6, 9, 12) và `story` (đoạn mở chương, product-design-v2 ★4).
- Màu chương đã có ở Task 2.

**Files:**
- Modify: `content/chapters.yml` (viết lại), `src/progress.ts`, `src/ui/topbar.ts`, `src/ui/homeView.ts`, `src/ui/brief.ts`, `index.html`, `src/i18n/vi.ts`, `src/i18n/en.ts`
- Test: `tests/progress.test.ts`

**Interfaces:**
- Produces:
  - `Chapter` thêm `career: Bilingual; tier: boolean; story: Bilingual`
  - `CHAPTER_TABLES` khóa 1–12 (curriculum §3)
  - `interface Rank { passed: number[]; tier?: Bilingual; career?: Bilingual }`
  - `rankOf(tickets: Ticket[], completed: Set<string>, chapters?: Chapter[]): Rank`. `passed` = các chương đã xong ticket `beat: boss`, tăng dần. `tier` = `career` của chương ★ cao nhất đã qua; `undefined` = Thực tập sinh. `career` = `career` của chương cao nhất đã qua.
  - Home: section `career` (20, narrow) thay `side`.
  - Topbar: `#rank` hiện chức danh.
  - Đề bài: thẻ "Tuần này ở Cargo Query" trên ticket đầu mỗi chương.
- `contentProblems` báo chương thiếu `career`/`story` vi/en.

- [ ] **Step 1: Viết test (FAIL) trong `tests/progress.test.ts`**

1a. Dòng import đầu file: thêm `CHAPTER_TABLES, rankOf` vào danh sách import từ `'../src/progress'`, và thêm dòng:
```ts
import { loadTickets } from '../src/content';
```
1b. Fixture `chapters` (đầu file) thay bằng (thêm `career`, `tier`, `story`):
```ts
const chapters = parseChapters(`
- chapter: 1
  title: { vi: "Tuần thử việc", en: "Probation week" }
  career: { vi: "Junior DA", en: "Junior DA" }
  tier: true
  story: { vi: "Mở đầu", en: "Intro" }
  outcomes:
    - { vi: "Lọc", en: "Filter", skills: [select, where] }
`);
```
1c. Thay `expect(CHAPTERS.map((c) => c.chapter)).toEqual([1, 2, 3, 4, 5, 6, 7]);` bằng:
```ts
    expect(CHAPTERS.map((c) => c.chapter)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
```
1d. Thêm cuối file:
```ts
describe('12 chương (L30, curriculum.md)', () => {
  it('★ đổi chức danh ở ch1, 3, 6, 9, 12; mọi chương có career + story vi/en', () => {
    expect(CHAPTERS.filter((c) => c.tier).map((c) => c.chapter)).toEqual([1, 3, 6, 9, 12]);
    expect(CHAPTERS.find((c) => c.chapter === 12)?.career).toEqual({ vi: 'Trưởng nhóm Phân tích', en: 'Head of Analytics' });
    expect(CHAPTERS.every((c) => c.career.vi && c.career.en && c.story.vi && c.story.en)).toBe(true);
  });

  it('chương thiếu career/story bị báo', () => {
    const bare = parseChapters('- chapter: 1\n  title: { vi: "a", en: "a" }\n');
    expect(problems(chapter1, skills, bare)).toContain('chương 1: thiếu career/story vi/en');
  });

  it('CHAPTER_TABLES: 25 bảng của spec §4, mỗi bảng đúng một lần, mở theo curriculum §3', () => {
    const all = Object.values(CHAPTER_TABLES).flat();
    expect(Object.keys(CHAPTER_TABLES).map(Number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(all).toHaveLength(25);
    expect(new Set(all).size).toBe(25);
    expect(tablesUnlocked(4)).toContain('trucking_orders');
    expect(tablesUnlocked(4)).not.toContain('customs_declarations');
    expect(tablesUnlocked(5)).toContain('hs_codes');
    expect(tablesUnlocked(8)).not.toContain('master_bills');
    expect(tablesUnlocked(12)).toContain('claims');
  });

  it('rankOf: thăng tiến theo cột mốc (L19), chức danh chỉ đổi ở chương ★', () => {
    const real = loadTickets();
    const upTo = (ch: number) => new Set(real.filter((t) => t.chapter <= ch).map((t) => t.id));
    expect(rankOf(real, new Set())).toEqual({ passed: [] });
    expect(rankOf(real, upTo(1))).toMatchObject({ passed: [1], tier: { en: 'Junior DA' }, career: { en: 'Junior DA' } });
    expect(rankOf(real, upTo(2))).toMatchObject({ passed: [1, 2], tier: { en: 'Junior DA' }, career: { en: 'Junior DA · volume reporting' } });
    expect(rankOf(real, upTo(3))).toMatchObject({ passed: [1, 2, 3], tier: { en: 'Data Analyst' } });
    const noBoss = new Set(real.filter((t) => t.chapter === 1 && t.beat !== 'boss').map((t) => t.id));
    expect(rankOf(real, noBoss).passed).toEqual([]);
  });
});
```

Run: `npx vitest run tests/progress.test.ts`
Expected: FAIL. Có `rankOf is not a function`, danh sách chương `[1…7]` khác `[1…12]`, và thiếu "chương 1: thiếu career/story vi/en".

- [ ] **Step 2: Viết lại `content/chapters.yml`**

Tiêu đề, bậc nghề và tier theo `curriculum.md` §0–§1. Outcome ch1–3 giữ nguyên; outcome ch4–12 thêm cùng plan của chương đó. Nội dung đầy đủ:
```yaml
# 12 chương (L27, L30, docs/team/curriculum.md).
# career: bước nghề đạt được khi qua "Đánh giá thăng tiến" (ticket beat: boss) của chương (L19, L22).
# tier: true = chương ★ đổi chức danh (ch1, 3, 6, 9, 12); career của chương ★ là chức danh mới.
# story: đoạn mở chương, hiện trên ticket đầu tiên của chương (product-design-v2 ★4).
# Outcome chỉ dùng kỹ năng của chương này hoặc chương trước; ch4–12 thêm cùng plan viết ticket của chương đó.
# Màu chương nằm ở src/theme.ts (CHAPTER_COLOR): Tailwind không quét file YAML. Mọi chuỗi đặt trong nháy kép.

- chapter: 1
  title: { vi: "Tuần thử việc", en: "Probation week" }
  career: { vi: "Junior DA", en: "Junior DA" }
  tier: true
  story:
    vi: "Tuần đầu ở Cargo Query Logistics, trụ sở Đà Nẵng ngay cạnh cảng Tiên Sa. Trưởng phòng Ops kèm bạn làm quen danh mục cảng và lô hàng; cuối tuần, Giám đốc đánh giá thử việc."
    en: "Your first week at Cargo Query Logistics, headquartered in Da Nang right next to Tien Sa port. The head of Ops walks you through the port and shipment records; at the end of the week the director runs your probation review."
  outcomes:
    - { vi: "Lấy đúng cột cần từ một bảng", en: "Pull exactly the columns you need", skills: [select] }
    - { vi: "Lọc lô hàng theo nhiều điều kiện", en: "Filter shipments by several conditions", skills: [where] }
    - { vi: "Xếp hạng có tiêu chí phá hòa và lấy top N", en: "Rank with a tie-break and take the top N", skills: [order_by, limit] }

- chapter: 2
  title: { vi: "Báo cáo sản lượng", en: "Volume reports" }
  career: { vi: "Junior DA · phụ trách báo cáo sản lượng", en: "Junior DA · volume reporting" }
  tier: false
  story:
    vi: "Mùa chốt sổ cuối năm. Kế toán và Sales cần những con số sản lượng thật cho báo cáo năm và kế hoạch 2026."
    en: "Year-end closing season. Accounting and Sales need real volume figures for the annual report and the 2026 plan."
  outcomes:
    - { vi: "Đếm, tính tổng và trung bình cho một tập lô hàng", en: "Count, sum and average a set of shipments", skills: [aggregate] }
    - { vi: "Lập báo cáo theo hãng tàu hoặc phương thức", en: "Report by carrier or by mode", skills: [group_by] }
    - { vi: "Lọc nhóm bằng HAVING và phân biệt với WHERE", en: "Filter groups with HAVING and tell it apart from WHERE", skills: [having] }

- chapter: 3
  title: { vi: "Nối dữ liệu", en: "Joining data" }
  career: { vi: "Data Analyst", en: "Data Analyst" }
  tier: true
  story:
    vi: "Dữ liệu nằm ở nhiều bảng: lô hàng, khách hàng, hãng tàu, container. CSKH và Sales cần bạn ghép chúng lại để biết ai gửi gì, đi với hãng nào."
    en: "The data lives in several tables: shipments, customers, carriers, containers. Customer service and Sales need you to put them together to see who ships what, with which carrier."
  outcomes:
    - { vi: "Ghép lô hàng với khách hàng và hãng tàu", en: "Match shipments with customers and carriers", skills: [join] }
    - { vi: "Nối từ 3 bảng trở lên", en: "Join three or more tables", skills: [multi_join] }
    - { vi: "Tìm khách không book bằng LEFT JOIN hoặc anti-join", en: "Find customers who never booked with a LEFT JOIN or an anti-join", skills: [left_join, anti_join] }

- chapter: 4
  title: { vi: "Lịch tàu & thời gian", en: "Schedules and time" }
  career: { vi: "Data Analyst · phụ trách số liệu Ops & lịch tàu", en: "Data Analyst · Ops and schedule data" }
  tier: false
  story:
    vi: "Tàu đến trễ, xe kéo phải chờ, kho CFS đầy dần. Điều độ vận tải cần bạn tính theo ngày tháng và xử lý cả những ngày chưa ai ghi."
    en: "Ships run late, trucks wait, the CFS warehouse fills up. The dispatchers need you to work with dates, including the dates nobody has filled in yet."
  outcomes: []

- chapter: 5
  title: { vi: "Hải quan & phân loại", en: "Customs and classification" }
  career: { vi: "Data Analyst · phụ trách số liệu Hải quan", en: "Data Analyst · customs data" }
  tier: false
  story:
    vi: "Mùa cao điểm hải quan: tờ khai luồng xanh, vàng, đỏ và những tờ khai phải sửa. Phòng Hải quan cần bạn phân loại và đếm theo điều kiện."
    en: "Customs peak season: green, yellow and red lanes, and declarations that had to be amended. The customs team needs you to classify and count by condition."
  outcomes: []

- chapter: 6
  title: { vi: "Làm sạch dữ liệu", en: "Cleaning the data" }
  career: { vi: "Senior DA", en: "Senior DA" }
  tier: true
  story:
    vi: "Tên khách mỗi nơi viết một kiểu, có khách bị nhập hai lần. Trước báo cáo năm, việc làm sạch dữ liệu thuộc về bạn."
    en: "Customer names are spelled differently in every place, and some customers were entered twice. Before the annual report, the clean-up is yours."
  outcomes: []

- chapter: 7
  title: { vi: "Báo giá & so sánh", en: "Quotes and comparisons" }
  career: { vi: "Senior DA · phụ trách phân tích giá", en: "Senior DA · pricing analysis" }
  tier: false
  story:
    vi: "Pricing gửi báo giá mỗi ngày. Có báo giá nào đang bán dưới giá mua không? Bạn so sánh bằng truy vấn con."
    en: "Pricing sends quotes every day. Is any of them selling below cost? You compare them with subqueries."
  outcomes: []

- chapter: 8
  title: { vi: "Công nợ & tỷ giá", en: "Receivables and exchange rates" }
  career: { vi: "Senior DA · phụ trách báo cáo tài chính", en: "Senior DA · financial reporting" }
  tier: false
  story:
    vi: "Công nợ phải thu, phải trả, nhiều loại tiền, tỷ giá chỉ có vào ngày làm việc. Kế toán cần những phép tính chia thành từng bước rõ ràng."
    en: "Receivables, payables, several currencies, exchange rates only on working days. Accounting needs calculations broken into clear steps."
  outcomes: []

- chapter: 9
  title: { vi: "Đối soát chứng từ", en: "Document reconciliation" }
  career: { vi: "Lead DA", en: "Lead DA" }
  tier: true
  story:
    vi: "Vận đơn chủ, vận đơn nhà, sổ booking và hóa đơn phải khớp nhau. Bạn đối soát để không lô nào lọt sổ."
    en: "Master bills, house bills, the booking book and the invoices must all agree. You reconcile them so no shipment slips through."
  outcomes: []

- chapter: 10
  title: { vi: "Xu hướng & xếp hạng", en: "Trends and rankings" }
  career: { vi: "Lead DA · phụ trách báo cáo điều hành", en: "Lead DA · executive reporting" }
  tier: false
  story:
    vi: "Ban giám đốc muốn thấy xu hướng: khách nào tăng, khách nào giảm, tháng này so với tháng trước."
    en: "The board wants to see trends: which customers grow, which shrink, this month against last month."
  outcomes: []

- chapter: 11
  title: { vi: "Truy vấn nhanh hơn", en: "Faster queries" }
  career: { vi: "Lead DA · phụ trách hiệu năng dữ liệu", en: "Lead DA · data performance" }
  tier: false
  story:
    vi: "Báo cáo chạy chậm dần khi dữ liệu lớn lên. Cùng IT, bạn đọc kế hoạch thực thi và đề xuất chỉ mục."
    en: "Reports get slower as the data grows. Together with IT, you read execution plans and propose indexes."
  outcomes: []

- chapter: 12
  title: { vi: "Điều tra cuối năm", en: "Year-end investigation" }
  career: { vi: "Trưởng nhóm Phân tích", en: "Head of Analytics" }
  tier: true
  story:
    vi: "Biên lợi nhuận quý 3/2026 giảm. Hội đồng quản trị cần ba nguyên nhân, mỗi nguyên nhân kèm một con số chứng minh."
    en: "The Q3 2026 margin fell. The board needs three causes, each backed by a number."
  outcomes: []
```

- [ ] **Step 3: Sửa `src/progress.ts`**

3a. Thay dòng `export interface Chapter { chapter: number; title: Bilingual; outcomes: Outcome[] }` bằng:
```ts
/** career: the step reached by passing this chapter's promotion review; tier: a ★ chapter that changes the job title (L30). */
export interface Chapter { chapter: number; title: Bilingual; career: Bilingual; tier: boolean; story: Bilingual; outcomes: Outcome[] }
```
3b. Trong `parseChapters`, thay dòng `      title: bilingual(c.title),` bằng:
```ts
      title: bilingual(c.title),
      career: bilingual(c.career),
      tier: c.tier === true,
      story: bilingual(c.story),
```
3c. Thay toàn bộ khối `export const CHAPTER_TABLES: Record<number, string[]> = { … };` bằng (curriculum §3, đủ 25 bảng):
```ts
export const CHAPTER_TABLES: Record<number, string[]> = {
  1: ['ports', 'carriers', 'employees', 'customers', 'shipments'],
  2: ['containers'],
  3: [],
  4: ['shipment_events', 'trucking_orders', 'cfs_receipts'],
  5: ['customs_declarations', 'hs_codes', 'duties_taxes'],
  6: ['incoterms'],
  7: ['rate_contracts', 'quotations'],
  8: ['charges', 'invoices', 'payments', 'vendor_bills', 'exchange_rates'],
  9: ['master_bills', 'house_bills'],
  10: ['free_time_terms', 'container_events'],
  11: [],
  12: ['claims'],
};
```
3d. Ngay sau hàm `xpFor` thêm:
```ts
/** Career after the promotion reviews passed so far (L19: one step per review; the title changes only at ★ chapters). */
export interface Rank {
  /** Chapters whose promotion review (beat: boss) is done, ascending. */
  passed: number[];
  /** Job title: career of the highest ★ chapter passed. undefined = DA intern (i18n `career.intern`). */
  tier?: Bilingual;
  /** Career step of the highest chapter passed. */
  career?: Bilingual;
}

export function rankOf(tickets: Ticket[], completed: Set<string>, chapters: Chapter[] = CHAPTERS): Rank {
  const passed = tickets.filter((t) => t.beat === 'boss' && completed.has(t.id)).map((t) => t.chapter).sort((a, b) => a - b);
  const reached = chapters.filter((c) => passed.includes(c.chapter));
  const tier = reached.filter((c) => c.tier).pop()?.career;
  const career = reached[reached.length - 1]?.career;
  return { passed, ...(tier ? { tier } : {}), ...(career ? { career } : {}) };
}
```
3e. Trong `contentProblems`, trong vòng `for (const c of chapters) {`, ngay sau dòng `if (!c.title.vi || !c.title.en) problems.push(…);` thêm:
```ts
    if (!c.career.vi || !c.career.en || !c.story.vi || !c.story.en) problems.push(`chương ${c.chapter}: thiếu career/story vi/en`);
```

- [ ] **Step 4: i18n**

Trong `src/i18n/vi.ts`:
- thay `'top.chapter': 'Chương {n}/7: {title}',` bằng `'top.chapter': 'Chương {n}/{total}: {title}',`
- xóa hai dòng `'home.stats': …` và `'home.learned': …`
- ngay sau dòng `'home.modes': 'Chế độ khác',` thêm:
```ts
  'career.intern': 'Thực tập sinh DA',
  'home.career': 'Lộ trình sự nghiệp',
  'home.careerNow': 'hiện tại',
  'home.careerAt': 'sau đánh giá chương {n}',
  'home.careerAfter': 'Sau đánh giá: {career}',
  'brief.story': 'Tuần này ở Cargo Query',
```
Trong `src/i18n/en.ts`:
- thay `'top.chapter': 'Chapter {n}/7: {title}',` bằng `'top.chapter': 'Chapter {n}/{total}: {title}',`
- xóa hai dòng `'home.stats': …` và `'home.learned': …`
- ngay sau dòng `'home.modes': 'Other modes',` thêm:
```ts
  'career.intern': 'DA intern',
  'home.career': 'Career path',
  'home.careerNow': 'current',
  'home.careerAt': 'after the chapter {n} review',
  'home.careerAfter': 'After the review: {career}',
  'brief.story': 'This week at Cargo Query',
```

- [ ] **Step 5: Topbar hiện chức danh và `Chương n/12`**

5a. `index.html`: ngay **trước** dòng chứa `id="xp"` thêm:
```html
        <span id="rank" class="rounded-full bg-white px-3 py-1 font-semibold text-slate-900"></span>
```
(slate-900 trên trắng ≈ 17:1.)

5b. `src/ui/topbar.ts`:
- Thay `import { chapterTitle, currentChapter } from '../progress';` bằng `import { chapterTitle, CHAPTERS, currentChapter, rankOf } from '../progress';`.
- Thay dòng `byId('chapter').textContent = t('top.chapter', { n: ch, title: chapterTitle(ch, getLang()) });` bằng:
```ts
  byId('chapter').textContent = t('top.chapter', { n: ch, total: CHAPTERS.length, title: chapterTitle(ch, getLang()) });
  byId('rank').textContent = rankOf(app.tickets, done()).tier?.[getLang()] ?? t('career.intern');
```
(Dòng `byId('xp').textContent = …` giữ nguyên chữ: điểm neo Plan 1c.)

- [ ] **Step 6: Trang chủ: lộ trình sự nghiệp thay "Thành tích", bậc nghề trên card chương**

Trong `src/ui/homeView.ts`:

6a. Thay `import { CHAPTERS, chapterTitle, SKILLS } from '../progress';` bằng `import { CHAPTERS, chapterTitle, rankOf, SKILLS } from '../progress';`.

6b. Thay toàn bộ hàm `sideCard` (từ dòng chú thích `/** Narrow card beside "Continue": …` đến hết hàm) bằng:
```ts
/** Career path (L18 ★3, L19, L30): DA intern + the five ★ titles; the current one is marked, later ones say which review opens them. */
function careerCard(): HTMLElement {
  const lang = getLang();
  const rank = rankOf(app.tickets, done());
  const rows = [{ title: t('career.intern'), at: 0 }, ...CHAPTERS.filter((c) => c.tier).map((c) => ({ title: c.career[lang], at: c.chapter }))];
  const reached = (at: number): boolean => at === 0 || rank.passed.includes(at);
  const now = rows.filter((r) => reached(r.at)).pop();
  return h('section', { class: cx(CARD, 'flex h-full flex-col gap-3 p-6'), 'aria-labelledby': 'career-title' },
    h('h2', { id: 'career-title', class: 'm-0 text-sm font-semibold text-muted' }, t('home.career')),
    rank.career ? h('p', { class: 'm-0 font-semibold' }, rank.career[lang]) : null,
    h('ol', { class: 'm-0 list-none space-y-2 p-0' }, ...rows.map((r) => h('li', {
      class: cx('flex items-center gap-2 text-[15px]', !reached(r.at) && 'text-muted'),
      'aria-current': r === now ? 'step' : false,
    },
      h('span', { class: cx('size-2.5 shrink-0 rounded-full', reached(r.at) ? 'bg-emerald-600' : 'bg-line'), 'aria-hidden': 'true' }),
      r === now ? h('b', {}, r.title) : r.title,
      r === now
        ? h('span', { class: cx(PILL, 'ml-auto', DONE_PILL) }, t('home.careerNow'))
        : reached(r.at) ? null : h('span', { class: 'ml-auto text-sm' }, t('home.careerAt', { n: r.at }))))));
}
```
6c. Trong `chapterCard`, ngay sau dòng `    statusPill(c),` thêm:
```ts
    h('p', { class: 'm-0 text-sm text-muted' }, t('home.careerAfter', { career: CHAPTERS.find((x) => x.chapter === c.chapter)?.career[lang] ?? '' })),
```
6d. Thay dòng `registerHomeSection({ id: 'side', order: 20, span: 'narrow', render: sideCard });` bằng:
```ts
registerHomeSection({ id: 'career', order: 20, span: 'narrow', render: careerCard });
```

- [ ] **Step 7: Đoạn mở chương trên ticket đầu mỗi chương (`src/ui/brief.ts`)**

7a. Thay `import { nextTicket, SKILLS, xpFor } from '../progress';` bằng `import { CHAPTERS, nextTicket, SKILLS, xpFor } from '../progress';`.

7b. Ngay trên dòng `/** The SQL that passed the grader; …` thêm:
```ts
/** "This week at Cargo Query" (product-design-v2 ★4): the chapter's story, shown on its first ticket only. */
function story(tk: Ticket): HTMLElement | null {
  const c = CHAPTERS.find((x) => x.chapter === tk.chapter);
  if (!c?.story.vi || app.tickets.find((x) => x.chapter === tk.chapter) !== tk) return null;
  return h('section', { class: 'my-3 overflow-hidden rounded-xl bg-panel ring-1 ring-line' },
    h('div', { class: cx('h-1.5', chapterColor(tk.chapter).bar) }),
    h('div', { class: 'p-3' },
      h('h3', { class: 'mt-0' }, t('brief.story')),
      h('p', { class: 'm-0' }, c.story[getLang()])));
}
```
7c. Trong `renderBrief`, ngay **trước** dòng `    coach('brief'),` thêm:
```ts
    story(tk),
```

- [ ] **Step 8: Chạy test, kiểm kiểu, build**

Run: `npx vitest run tests/progress.test.ts`. Expected: PASS.

Rồi chạy bộ kiểm chuẩn:
```bash
npx tsc --noEmit
npx vitest run
npx vite build
```
Expected: tất cả xanh.
- `tests/home.test.ts` vẫn PASS: chương không có ticket là `soon`, nay là ch4–12.
- `tests/theme.test.ts` kiểm 12 màu cho 12 chương.
- `tests/content.test.ts` PASS: ticket ch1–3 chỉ dùng bảng của ch1–2.

```bash
grep -rn "home.stats\|home.learned\|sideCard\|{n}/7" src; echo "exit=$?"
```
Expected: `exit=1`.

- [ ] **Step 9: Checklist Edge (orchestrator)**

1. Topbar có chip trắng "Thực tập sinh DA" (EN "DA intern"), rồi `Chương 1/12: Tuần thử việc`. Làm xong `ch1-05` thì chip thành "Junior DA". Xong ch2 vẫn "Junior DA". Xong ch3 thành "Data Analyst".
2. Trang chủ:
   - lưới **12** card, 4 × 3 trên ≥ 1024px, 2 cột ≥ 640px, 1 cột ở 375px;
   - ch4–12 có 🔒 + "Sắp có", tên chương theo curriculum ("Lịch tàu & thời gian" … "Điều tra cuối năm");
   - mỗi card có dòng "Sau đánh giá: …";
   - card "Lộ trình sự nghiệp": 6 bậc, bậc hiện tại đậm + badge "hiện tại", bậc sau ghi "sau đánh giá chương n".
3. Mở `ch1-01`, `ch2-01`, `ch3-01`: có thẻ "Tuần này ở Cargo Query" với vạch màu chương. `ch1-02` không có.
4. Tab Cột vẫn liệt kê đúng bảng của chương hiện tại (ch1: 5 bảng; ch2: thêm `containers`).
5. VI ↔ EN: chip, lộ trình, đoạn mở chương đổi ngôn ngữ.

- [ ] **Step 10: Commit**

```bash
git add content/chapters.yml src/progress.ts src/ui/topbar.ts src/ui/homeView.ts src/ui/brief.ts index.html src/i18n/vi.ts src/i18n/en.ts tests/progress.test.ts
git commit -m "feat: 12-chapter frame with career steps, rank chip, career path and chapter story"
```

---

### Task 12: Dàn đồng nghiệp (`content/people.yml`) và chân dung SVG vẽ bằng code

Phần (b), theo L18 và product-design-v2 ★1, curriculum §2, problem-design §1.7.
- Mỗi người có **vai trò nghiệp vụ thật** của forwarder: chứng từ/booking (B/L, HBL/MBL), khai báo hải quan, điều độ vận tải/kho CFS, pricing, kế toán AR/AP, CSKH, sales, quản lý Ops, giám đốc, IT.
- Tên nhân viên lấy đúng từ bảng `employees` của seed. Tên đã tính từ công thức seed, cột `employee` là id, và test đối chiếu với DB thật.
- IT chưa có trong seed (curriculum §2): đây là nhân vật chỉ có trong `people.yml` (`employee: null`). Plan 4 quyết định có thêm hàng id 41 hay không. **Không sửa seed.**
- Chân dung là SVG gốc dựng từ tham số `look` (da, tóc, kiểu tóc, phụ kiện theo nghề), áo và nền theo phòng ban. Không dùng ảnh hay thư viện.

**Files:**
- Create: `content/people.yml`, `src/people.ts`, `src/ui/svg.ts`, `tests/people.test.ts`
- Modify: `src/ui/avatar.ts` (viết lại), `src/theme.ts` (xóa `initials`), `tests/theme.test.ts`

**Interfaces:**
- Produces:
  - `src/people.ts`: `LOOK` (giá trị cho phép), `type Look`, `interface Person { name; dept; employee: number | null; role: Bilingual; bio: Bilingual; look: Look }`, `parsePeople(src, origin?): Person[]` (ném lỗi khi sai cấu trúc), `PEOPLE`, `personOf(name): Person | undefined`
  - `src/ui/svg.ts`: `s(tag, attrs?, ...children): SVGElementTagNameMap[K]`. Đây là bản SVG của `h()`; Task 16, 18 dùng lại.
  - `src/ui/avatar.ts`: `avatar(from: { name: string; dept: string }, size?: 'sm' | 'md' | 'lg'): SVGSVGElement`. Chữ ký tương thích chỗ gọi `avatar(tk.from)` ở Task 7/8.

- [ ] **Step 1: Viết `tests/people.test.ts` (FAIL)**

```ts
import { describe, expect, it } from 'vitest';
import { loadTickets } from '../src/content';
import { parsePeople, PEOPLE, personOf } from '../src/people';
import { runner } from './helpers';

const VI_DIACRITIC = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
const ONE = `- name: A
  dept: Ops
  employee: null
  role: { vi: "a", en: "a" }
  bio: { vi: "b", en: "b" }
  look: { skin: light, hair: black, style: short, accessory: none }
`;

describe('people.yml (L18)', () => {
  it('mọi người gửi ticket có trong people.yml, đúng phòng ban', () => {
    const missing = loadTickets()
      .filter((t) => personOf(t.from.name)?.dept !== t.from.dept)
      .map((t) => `${t.id}: ${t.from.name} (${t.from.dept})`);
    expect(missing).toEqual([]);
  });

  it('đủ vai trò nghiệp vụ: 6 trưởng phòng/giám đốc + chứng từ, khai báo, điều độ/CFS, pricing, AR, AP, CSKH, sales, IT', () => {
    expect(PEOPLE.map((p) => p.dept).sort()).toEqual([
      'CS', 'CS', 'Customs', 'Customs', 'Finance', 'Finance', 'Finance', 'IT', 'Management', 'Ops', 'Ops', 'Ops', 'Sales', 'Sales', 'Sales',
    ]);
    const roles = PEOPLE.map((p) => p.role.en).join(' | ');
    for (const role of ['Managing director', 'Head of Operations', 'Documentation and booking', 'Customs declarant', 'CFS dispatcher',
      'Pricing officer', 'Accounts receivable', 'Accounts payable', 'Customer service officer', 'Sales executive', 'IT team lead']) {
      expect(roles).toContain(role);
    }
  });

  it('người có employee khớp đúng tên và phòng ban trong bảng employees của seed', async () => {
    const run = await runner();
    const r = await run('SELECT id, full_name, dept FROM employees');
    const seed = new Map(r.rows.map(([id, name, dept]) => [Number(id), `${String(name)}|${String(dept)}`]));
    const wrong = PEOPLE.filter((p) => p.employee !== null && seed.get(p.employee) !== `${p.name}|${p.dept}`).map((p) => p.name);
    expect(wrong).toEqual([]);
    expect(PEOPLE.filter((p) => p.employee === null).map((p) => p.dept)).toEqual(['IT']);
  });

  it('EN của role/bio không có dấu tiếng Việt', () => {
    expect(PEOPLE.filter((p) => VI_DIACRITIC.test(p.role.en + p.bio.en)).map((p) => p.name)).toEqual([]);
  });

  it('parsePeople báo lỗi cấu trúc', () => {
    expect(parsePeople(ONE)[0]).toMatchObject({ name: 'A', employee: null, look: { accessory: 'none' } });
    expect(() => parsePeople(ONE.replace('accessory: none', 'accessory: cape'))).toThrow(/look\.accessory/);
    expect(() => parsePeople(ONE.replace('role: { vi: "a", en: "a" }', 'role: { vi: "a", en: "" }'))).toThrow(/role/);
    expect(() => parsePeople(ONE.replace('  employee: null\n', ''))).toThrow(/employee/);
    expect(() => parsePeople(ONE + ONE)).toThrow(/trùng/);
    expect(() => parsePeople('name: A')).toThrow(/danh sách/);
  });
});
```

Run: `npx vitest run tests/people.test.ts`
Expected: FAIL: `Failed to resolve import "../src/people"`.

- [ ] **Step 2: Viết `content/people.yml`**

Tên và id tính từ khối `employees` của `src/db/seed.sql`: `full_name = họ[1 + id % 10] || ' ' || tên[id]`; phòng: 1 Management, 2–13 Sales, 14–23 Ops, 24–29 Customs, 30–35 Finance, 36–40 CS. Test ở Step 1 đối chiếu lại với DB.
```yaml
# Đồng nghiệp gửi việc (L18, product-design-v2 ★1, curriculum §2). Ticket không đổi: from.name là khóa.
# employee: id trong bảng employees của seed (test đối chiếu tên + phòng); null = nhân vật chưa có trong seed.
# role: vai trò nghiệp vụ thật; bio: một câu tính cách (giọng của người viết ticket giữ đúng câu này).
# look: tham số chân dung SVG (src/ui/avatar.ts):
#   skin light|medium|tan|deep · hair black|brown|grey · style short|long|bun|side
#   accessory none|helmet|glasses|headset|tie|scarf|lanyard
# Mọi chuỗi đặt trong nháy kép; EN không dấu.

- name: "Trần An"
  dept: Management
  employee: 1
  role: { vi: "Giám đốc", en: "Managing director" }
  bio: { vi: "Ít lời, chỉ giao những việc quan trọng: mọi buổi đánh giá thăng tiến.", en: "A person of few words who only sends what matters: every promotion review." }
  look: { skin: medium, hair: grey, style: short, accessory: tie }

- name: "Hoàng Khánh"
  dept: Ops
  employee: 14
  role: { vi: "Trưởng phòng Ops, người kèm DA mới", en: "Head of Operations, your mentor" }
  bio: { vi: "Kiên nhẫn, luôn nói \"từng bước một\".", en: "Patient, always says \"one step at a time\"." }
  look: { skin: tan, hair: black, style: short, accessory: helmet }

- name: "Lê Bình"
  dept: Sales
  employee: 2
  role: { vi: "Trưởng phòng Sales, kiêm pricing", en: "Head of Sales, also runs pricing" }
  bio: { vi: "Nói nhanh, mê top N và số tròn, việc gì cũng \"gấp lắm\".", en: "Talks fast, loves top-N lists and round numbers, everything is \"urgent\"." }
  look: { skin: light, hair: black, style: side, accessory: none }

- name: "Hoàng Ngọc"
  dept: Customs
  employee: 24
  role: { vi: "Trưởng phòng Hải quan", en: "Head of Customs" }
  bio: { vi: "Kỹ tính, thuộc lòng mã HS, ghét dữ liệu thiếu.", en: "Meticulous, knows HS codes by heart, hates missing data." }
  look: { skin: light, hair: black, style: bun, accessory: glasses }

- name: "Nguyễn Quang"
  dept: Finance
  employee: 30
  role: { vi: "Kế toán trưởng (công nợ phải thu, phải trả)", en: "Chief accountant (receivables and payables)" }
  bio: { vi: "Cẩn thận từng đồng, luôn hỏi \"làm tròn mấy số?\".", en: "Careful with every cent, always asks \"rounded to how many decimals?\"." }
  look: { skin: medium, hair: brown, style: short, accessory: glasses }

- name: "Võ Thu"
  dept: CS
  employee: 36
  role: { vi: "Trưởng phòng Chăm sóc khách hàng", en: "Head of Customer Service" }
  bio: { vi: "Ấm áp, nghĩ cho khách, hay hỏi \"khách nào đang buồn?\".", en: "Warm, thinks of the customer first, often asks \"which customer is unhappy?\"." }
  look: { skin: light, hair: brown, style: long, accessory: headset }

- name: "Võ Lan"
  dept: Ops
  employee: 16
  role: { vi: "Nhân viên chứng từ & booking (B/L, HBL/MBL)", en: "Documentation and booking officer (B/L, HBL/MBL)" }
  bio: { vi: "Soi từng số vận đơn, không để lô nào lệch sổ.", en: "Checks every bill of lading number and never lets a shipment drift off the books." }
  look: { skin: light, hair: black, style: long, accessory: lanyard }

- name: "Bùi Long"
  dept: Ops
  employee: 18
  role: { vi: "Điều độ vận tải & kho CFS", en: "Trucking and CFS dispatcher" }
  bio: { vi: "Lúc nào cũng ở bãi, đếm xe kéo và ca bốc xếp.", en: "Always out in the yard, counting trucks and loading shifts." }
  look: { skin: tan, hair: black, style: short, accessory: helmet }

- name: "Võ Phong"
  dept: Customs
  employee: 26
  role: { vi: "Khai báo viên hải quan", en: "Customs declarant" }
  bio: { vi: "Khai tờ khai nhanh nhất phòng, sợ nhất luồng đỏ.", en: "Files declarations faster than anyone, dreads the red lane." }
  look: { skin: medium, hair: black, style: side, accessory: glasses }

- name: "Đặng Hà"
  dept: Sales
  employee: 7
  role: { vi: "Nhân viên pricing (báo giá cước)", en: "Pricing officer (freight quotes)" }
  bio: { vi: "Thuộc giá cước mọi tuyến, không chịu bán dưới giá mua.", en: "Knows the rate on every lane and refuses to sell below cost." }
  look: { skin: light, hair: brown, style: bun, accessory: scarf }

- name: "Hoàng Dũng"
  dept: Sales
  employee: 4
  role: { vi: "Nhân viên kinh doanh", en: "Sales executive" }
  bio: { vi: "Lúc nào cũng vừa gặp khách về, cần số liệu ngay.", en: "Always just back from a customer visit and needs numbers right away." }
  look: { skin: medium, hair: black, style: short, accessory: tie }

- name: "Phạm Tâm"
  dept: Finance
  employee: 33
  role: { vi: "Kế toán công nợ phải thu (AR)", en: "Accounts receivable accountant (AR)" }
  bio: { vi: "Nhắc nợ nhẹ nhàng nhưng không bỏ sót ai.", en: "Chases payments politely but never misses anyone." }
  look: { skin: light, hair: black, style: long, accessory: glasses }

- name: "Hoàng Thảo"
  dept: Finance
  employee: 34
  role: { vi: "Kế toán công nợ phải trả (AP)", en: "Accounts payable accountant (AP)" }
  bio: { vi: "Đối chiếu từng hóa đơn nhà cung cấp với tỷ giá trong ngày.", en: "Matches every supplier invoice against the exchange rate of the day." }
  look: { skin: medium, hair: brown, style: bun, accessory: none }

- name: "Đặng Trang"
  dept: CS
  employee: 37
  role: { vi: "Nhân viên chăm sóc khách hàng", en: "Customer service officer" }
  bio: { vi: "Nghe máy cả ngày, nhớ tên từng khách quen.", en: "On the phone all day, remembers every regular customer by name." }
  look: { skin: tan, hair: black, style: long, accessory: headset }

- name: "Đỗ Tùng"
  dept: IT
  employee: null
  role: { vi: "Trưởng nhóm IT, cầu nối với Data Engineering", en: "IT team lead, the bridge to Data Engineering" }
  bio: { vi: "Chỉ tin vào kế hoạch thực thi, không tin vào cảm giác \"chạy chậm\".", en: "Trusts execution plans, not the feeling that something \"runs slow\"." }
  look: { skin: medium, hair: black, style: short, accessory: glasses }
```

- [ ] **Step 3: Viết `src/people.ts`**

```ts
import { parse as parseYaml } from 'yaml';
import source from '../content/people.yml?raw';
import type { Bilingual } from './progress';

/** Allowed portrait parameters (src/ui/avatar.ts draws each one). */
export const LOOK = {
  skin: ['light', 'medium', 'tan', 'deep'],
  hair: ['black', 'brown', 'grey'],
  style: ['short', 'long', 'bun', 'side'],
  accessory: ['none', 'helmet', 'glasses', 'headset', 'tie', 'scarf', 'lanyard'],
} as const;
export type Look = { [K in keyof typeof LOOK]: (typeof LOOK)[K][number] };

/** A colleague who sends tickets (L18): a real forwarder role. `employee` = id in the seed's employees table, null = not in the seed. */
export interface Person { name: string; dept: string; employee: number | null; role: Bilingual; bio: Bilingual; look: Look }

function bilingual(v: unknown, where: string): Bilingual {
  const o = (v ?? {}) as Record<string, unknown>;
  if (typeof o.vi !== 'string' || !o.vi.trim() || typeof o.en !== 'string' || !o.en.trim()) throw new Error(`${where}: cần { vi, en } khác rỗng`);
  return { vi: o.vi.trim(), en: o.en.trim() };
}

/** Throws on any structural problem: the content test runs this on the real file. */
export function parsePeople(src: string, origin = 'people.yml'): Person[] {
  const data = parseYaml(src) as unknown;
  if (!Array.isArray(data)) throw new Error(`${origin}: cần một danh sách`);
  const seen = new Set<string>();
  return data.map((raw: unknown, i) => {
    const p = (raw ?? {}) as Record<string, unknown>;
    const where = `${origin}: mục ${i}`;
    if (typeof p.name !== 'string' || typeof p.dept !== 'string') throw new Error(`${where}: thiếu name/dept`);
    if (seen.has(p.name)) throw new Error(`${origin}: trùng tên "${p.name}"`);
    seen.add(p.name);
    if (p.employee !== null && typeof p.employee !== 'number') throw new Error(`${where}: employee là id trong employees hoặc null`);
    const look = (p.look ?? {}) as Record<string, unknown>;
    for (const [k, allowed] of Object.entries(LOOK)) {
      if (!(allowed as readonly unknown[]).includes(look[k])) throw new Error(`${where}: look.${k} phải là một trong ${allowed.join(', ')}`);
    }
    return {
      name: p.name, dept: p.dept, employee: p.employee as number | null,
      role: bilingual(p.role, `${where} role`), bio: bilingual(p.bio, `${where} bio`), look: look as Look,
    };
  });
}

export const PEOPLE: Person[] = parsePeople(source);
export const personOf = (name: string): Person | undefined => PEOPLE.find((p) => p.name === name);
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `npx vitest run tests/people.test.ts && npx tsc --noEmit`
Expected: 5 test PASS; `tsc` không lỗi. Nếu test seed báo một tên sai: sửa `people.yml` theo DB, không sửa seed.

- [ ] **Step 5: Viết `src/ui/svg.ts`**

```ts
const NS = 'http://www.w3.org/2000/svg';
type SvgChild = SVGElement | string | null | undefined | false;

/**
 * SVG twin of h(): SVG needs createElementNS (createElement makes unknown HTML elements that never render).
 * Values go through setAttribute/append, never markup. `false` drops an attribute or child, so it can be written inline.
 */
export function s<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number | false> = {},
  ...children: SvgChild[]
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== false) el.setAttribute(k, String(v));
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}
```

- [ ] **Step 6: Viết lại `src/ui/avatar.ts` (chân dung)**

```ts
import { personOf, type Look } from '../people';
import { cx } from '../theme';
import { s } from './svg';

const SKIN: Record<Look['skin'], string> = { light: '#f5d0b0', medium: '#e0a878', tan: '#c08050', deep: '#8a5a3c' };
const HAIR: Record<Look['hair'], string> = { black: '#1f1b18', brown: '#6b4226', grey: '#a3a3a3' };
/** Shirt and backdrop per department. Decorative: the department chip next to the portrait carries the meaning. */
const DEPT: Record<string, [shirt: string, backdrop: string]> = {
  Management: ['#5b21b6', '#ede9fe'], Ops: ['#1d4ed8', '#dbeafe'], Sales: ['#be185d', '#fce7f3'],
  Customs: ['#b45309', '#fef3c7'], Finance: ['#047857', '#d1fae5'], CS: ['#0f766e', '#ccfbf1'], IT: ['#0e7490', '#cffafe'],
};
const SIZE = { sm: 'size-7', md: 'size-10', lg: 'size-12' } as const;
const DEFAULT: Look = { skin: 'medium', hair: 'black', style: 'short', accessory: 'none' };
const INK = '#1f2937';

/** Long hair falls behind the head, so it is drawn before the face. */
const hairBack = (l: Look): SVGElement[] =>
  l.style === 'long' ? [s('path', { d: 'M13 20 Q12 7 24 7 Q36 7 35 20 L36 34 L12 34 Z', fill: HAIR[l.hair] })] : [];

function hairFront(l: Look): SVGElement[] {
  if (l.accessory === 'helmet') return []; // the hard hat covers it
  const c = HAIR[l.hair];
  const cap = s('path', { d: 'M14 19 Q14 8 24 8 Q34 8 34 19 Q30 13 24 13 Q18 13 14 19 Z', fill: c });
  if (l.style === 'bun') return [s('circle', { cx: 24, cy: 6.5, r: 4, fill: c }), cap];
  if (l.style === 'side') return [cap, s('path', { d: 'M14 17 Q19 9 33 12 Q25 12 17 19 Z', fill: c })];
  return [cap];
}

function accessory(l: Look): SVGElement[] {
  switch (l.accessory) {
    case 'helmet':
      return [s('path', { d: 'M12 18 Q12 5 24 5 Q36 5 36 18 Z', fill: '#facc15' }), s('rect', { x: 10, y: 17, width: 28, height: 3, rx: 1.5, fill: '#eab308' })];
    case 'glasses':
      return [
        s('circle', { cx: 20.5, cy: 20, r: 3, fill: 'none', stroke: INK, 'stroke-width': 1.2 }),
        s('circle', { cx: 27.5, cy: 20, r: 3, fill: 'none', stroke: INK, 'stroke-width': 1.2 }),
        s('line', { x1: 23.5, y1: 20, x2: 24.5, y2: 20, stroke: INK, 'stroke-width': 1.2 }),
      ];
    case 'headset':
      return [
        s('path', { d: 'M13.5 21 Q13.5 8.5 24 8.5 Q34.5 8.5 34.5 21', fill: 'none', stroke: '#111827', 'stroke-width': 2 }),
        s('rect', { x: 11.5, y: 18, width: 4, height: 6, rx: 1.5, fill: '#111827' }),
        s('path', { d: 'M14 24 Q16 29 21 28', fill: 'none', stroke: '#111827', 'stroke-width': 1.2 }),
      ];
    case 'tie':
      return [s('path', { d: 'M22.5 32 L25.5 32 L26.5 41 L24 44 L21.5 41 Z', fill: '#dc2626' })];
    case 'scarf':
      return [s('path', { d: 'M17 30 Q24 35 31 30 L31 33 Q24 38 17 33 Z', fill: '#f59e0b' })];
    case 'lanyard':
      return [
        s('path', { d: 'M19 31 L24 39 L29 31', fill: 'none', stroke: '#2563eb', 'stroke-width': 1.2 }),
        s('rect', { x: 21.5, y: 38, width: 5, height: 6, rx: 1, fill: '#f8fafc', stroke: '#2563eb', 'stroke-width': 0.8 }),
      ];
    default:
      return [];
  }
}

/**
 * Code-drawn portrait of a colleague from content/people.yml (L18 ★1): original art, no images, no library.
 * Decorative (aria-hidden): the name and role are always written next to it.
 */
export function avatar(from: { name: string; dept: string }, size: keyof typeof SIZE = 'sm'): SVGSVGElement {
  const look = personOf(from.name)?.look ?? DEFAULT;
  const [shirt, backdrop] = DEPT[from.dept] ?? ['#475569', '#e2e8f0'];
  const skin = SKIN[look.skin];
  return s('svg', { viewBox: '0 0 48 48', class: cx('shrink-0 rounded-full', SIZE[size]), 'aria-hidden': 'true', focusable: 'false' },
    s('rect', { width: 48, height: 48, fill: backdrop }),
    ...hairBack(look),
    s('path', { d: 'M8 48 Q8 31 24 31 Q40 31 40 48 Z', fill: shirt }),
    s('rect', { x: 21, y: 26, width: 6, height: 6, fill: skin }),
    s('circle', { cx: 24, cy: 19, r: 10, fill: skin }),
    ...hairFront(look),
    s('circle', { cx: 20.5, cy: 20, r: 1.1, fill: INK }),
    s('circle', { cx: 27.5, cy: 20, r: 1.1, fill: INK }),
    s('path', { d: 'M21 24.5 Q24 27 27 24.5', fill: 'none', stroke: '#7c2d12', 'stroke-width': 1.1, 'stroke-linecap': 'round' }),
    ...accessory(look));
}
```

- [ ] **Step 7: Xóa `initials` (không còn ai dùng)**

- `src/theme.ts`: xóa hàm `initials` và dòng chú thích ngay trên nó.
- `tests/theme.test.ts`:
  - dòng import thành `import { CHAPTER_COLOR, chapterColor, cx, DEPT_COLOR, deptColor } from '../src/theme';`;
  - xóa cả khối `it('initials: chữ cái đầu của từ đầu và từ cuối', …);`.

```bash
grep -rn "initials" src tests; echo "exit=$?"
```
Expected: `exit=1`.

- [ ] **Step 8: Kiểm kiểu, test, build**

```bash
npx tsc --noEmit
npx vitest run
npx vite build
```
Expected: tất cả xanh.

- [ ] **Step 9: Checklist Edge (orchestrator)**

1. Đầu đề bài và Hộp thư: mỗi người gửi có chân dung tròn riêng.
   - Hoàng Khánh: mũ bảo hộ vàng, áo xanh dương.
   - Lê Bình: tóc rẽ ngôi, áo hồng.
   - Hoàng Ngọc: búi tóc + kính, áo hổ phách.
   - Nguyễn Quang: kính, áo xanh lá.
   - Võ Thu: tóc dài + tai nghe, áo teal.
   - Trần An: tóc bạc + cà vạt đỏ, áo tím.
2. Chân dung nét gọn ở 28px (Hộp thư/đầu đề) trên cả nền sáng và tối; không có ô chữ cái đầu nào còn sót.
3. Accessibility tree: chân dung `aria-hidden`, tên người vẫn đọc được ngay bên cạnh.

- [ ] **Step 10: Commit**

```bash
git add content/people.yml src/people.ts src/ui/svg.ts src/ui/avatar.ts src/theme.ts tests/people.test.ts tests/theme.test.ts
git commit -m "feat: colleague cast with real forwarder roles and code-drawn SVG portraits"
```

---

### Task 13: Hộp thư dạng chat và đầu đề bài kiểu tin nhắn

Phần (b), theo product-design-v2 ★1.
- Hộp thư thành **danh sách hội thoại theo người**: chân dung, tên, chip phòng, vai trò; việc của người đó là bong bóng tin nhắn, mới nhất ở trên.
- Đầu đề bài: chân dung lớn + tên + vai trò, thân đề là bong bóng tin nhắn của người gửi.
- Khi xong việc: bong bóng "Mình gửi kết quả rồi nhé." của bạn, kèm câu cảm ơn của người gửi theo phòng ban.

Bỏ qua phần "các ticket cũ cùng người thu gọn phía trên luồng chat". Hộp thư đã gom việc theo người; làm thêm khi có người chơi cần.

**Files:**
- Modify: `src/ui/inbox.ts` (viết lại), `src/ui/brief.ts`, `src/i18n/vi.ts`, `src/i18n/en.ts`

**Interfaces:**
- Consumes: Task 12 (`avatar`, `personOf`), Task 2 (`cx`, `DEPT_CHIP`, `deptColor`, `PILL`, `chapterColor`)
- Produces: khóa i18n `chat.sent`, `chat.thanks*` (một câu mỗi phòng ban).

- [ ] **Step 1: i18n**

Trong `src/i18n/vi.ts`, ngay sau dòng `'brief.story': 'Tuần này ở Cargo Query',` thêm:
```ts
  'chat.sent': 'Mình gửi kết quả rồi nhé.',
  'chat.thanksManagement': 'Tốt lắm. Mình mang số này vào cuộc họp.',
  'chat.thanksOps': 'Cảm ơn bạn, Ops dùng ngay cho buổi giao ban.',
  'chat.thanksSales': 'Tuyệt, mình gửi khách luôn đây!',
  'chat.thanksCustoms': 'Đủ và chính xác. Cảm ơn bạn.',
  'chat.thanksFinance': 'Số khớp sổ. Cảm ơn bạn đã làm cẩn thận.',
  'chat.thanksCS': 'Cảm ơn bạn, khách sẽ vui lắm.',
  'chat.thanksIT': 'Cảm ơn, mình ghi nhận vào hệ thống.',
```
Trong `src/i18n/en.ts`, ngay sau dòng `'brief.story': 'This week at Cargo Query',` thêm:
```ts
  'chat.sent': 'Results sent.',
  'chat.thanksManagement': 'Good work. I will take these numbers into the meeting.',
  'chat.thanksOps': 'Thanks, Ops will use this in the stand-up right away.',
  'chat.thanksSales': 'Great, sending it to the customer now!',
  'chat.thanksCustoms': 'Complete and accurate. Thank you.',
  'chat.thanksFinance': 'The figures match the books. Thanks for being careful.',
  'chat.thanksCS': 'Thank you, the customers will be happy.',
  'chat.thanksIT': 'Thanks, logging it in the system.',
```

- [ ] **Step 2: Viết lại `src/ui/inbox.ts`**

Đọc file trên đĩa trước. Giữ mọi hành vi đã có (đếm việc mới trên nút, `aria-current`, `actions.selectTicket`, dòng "đã xong mọi ticket"). Nội dung mới:
```ts
import { getLang, t } from '../i18n';
import { personOf } from '../people';
import { visibleTickets } from '../progress';
import { actions, app, done } from '../state';
import { cx, DEPT_CHIP, deptColor } from '../theme';
import { textOf, type Ticket } from '../tickets';
import { avatar } from './avatar';
import { byId, h } from './dom';

/** One conversation per colleague (L18 ★1): the thread with the newest ticket first, newest ticket first inside it. */
export function renderInbox(): void {
  const d = done();
  const visible = visibleTickets(app.tickets, d);
  const fresh = visible.filter((x) => !d.has(x.id)).length;
  byId('inbox-btn').textContent = fresh ? t('top.inboxNew', { n: fresh }) : t('top.inbox');
  const lang = getLang();
  const threads = new Map<string, Ticket[]>();
  for (const tk of [...visible].reverse()) {
    const list = threads.get(tk.from.name);
    if (list) list.push(tk);
    else threads.set(tk.from.name, [tk]);
  }
  byId('inbox-list').replaceChildren(
    fresh ? '' : h('p', { class: 'muted' }, t('inbox.empty')),
    ...[...threads.values()].map((list) => {
      const from = list[0].from;
      return h('section', { class: 'mb-4' },
        h('h3', { class: 'mt-0 mb-2 flex items-center gap-3' },
          avatar(from, 'md'),
          h('span', { class: 'min-w-0' },
            h('span', { class: 'flex flex-wrap items-center gap-2 font-semibold' }, from.name, h('span', { class: cx(DEPT_CHIP, deptColor(from.dept)) }, from.dept)),
            h('span', { class: 'block text-sm font-normal text-muted' }, personOf(from.name)?.role[lang] ?? ''))),
        h('div', { class: 'ml-13 space-y-1.5' }, ...list.map((tk) => {
          const isDone = d.has(tk.id);
          return h('button', {
            type: 'button',
            class: cx(
              'block w-full rounded-2xl rounded-tl-sm border-0 bg-code px-3 py-2 text-left ring-1 ring-transparent hover:bg-code hover:ring-line aria-[current=true]:ring-2 aria-[current=true]:ring-accent',
              isDone && 'text-muted'),
            'aria-current': tk.id === app.selectedId ? 'true' : false,
            onclick: () => actions.selectTicket(tk.id),
          },
            h('span', { class: 'block font-semibold' }, textOf(tk, lang).title),
            h('span', { class: 'block text-sm text-muted' },
              isDone ? `✓ ${t('inbox.done')}` : `${t('brief.chapter', { n: tk.chapter })} · ${'★'.repeat(tk.difficulty)}`));
        })));
    }));
}
```
(`ml-13` = 3.25rem: thẳng hàng với chữ, nằm sau chân dung `size-10` + `gap-3`.)

- [ ] **Step 3: Đầu đề bài và thân đề dạng tin nhắn (`src/ui/brief.ts`)**

3a. Import: thêm
```ts
import { personOf } from '../people';
```
và trong dòng import từ `'../tickets'` thêm `type Ticket` nếu chưa có.

3b. Thay khối đầu đề (dạng sau Task 7):
```ts
    h('header', { class: 'space-y-2' },
      h('p', { class: 'm-0 flex flex-wrap items-center gap-2 text-sm text-muted' },
        avatar(tk.from),
        h('span', { class: cx(DEPT_CHIP, deptColor(tk.from.dept)) }, tk.from.dept),
        `${tk.from.name} · ${t('brief.chapter', { n: tk.chapter })} · ${'★'.repeat(tk.difficulty)}`,
        h('span', { class: cx(PILL, chapterColor(tk.chapter).chip) }, t(BEAT[tk.beat])),
        isDone ? `✓ ${t('inbox.done')}` : ''),
```
bằng:
```ts
    h('header', { class: 'space-y-2' },
      h('div', { class: 'flex items-center gap-3' },
        avatar(tk.from, 'lg'),
        h('p', { class: 'm-0 min-w-0' },
          h('span', { class: 'flex flex-wrap items-center gap-2 font-semibold' },
            tk.from.name, h('span', { class: cx(DEPT_CHIP, deptColor(tk.from.dept)) }, tk.from.dept)),
          h('span', { class: 'block text-sm text-muted' }, personOf(tk.from.name)?.role[getLang()] ?? ''))),
      h('p', { class: 'm-0 flex flex-wrap items-center gap-2 text-sm text-muted' },
        `${t('brief.chapter', { n: tk.chapter })} · ${'★'.repeat(tk.difficulty)}`,
        h('span', { class: cx(PILL, chapterColor(tk.chapter).chip) }, t(BEAT[tk.beat])),
        isDone ? `✓ ${t('inbox.done')}` : ''),
```
(Dòng `h('h2', { id: 'brief-title', … }, x.title),` và dòng `x.fallback ? …` phía sau giữ nguyên.)

3c. Thay dòng `    richText(x.body),` (trong `renderBrief`) bằng:
```ts
    h('div', { class: 'rounded-2xl rounded-tl-sm bg-code px-4 leading-relaxed' }, richText(x.body)),
```
3d. Ngay trên dòng `/** The SQL that passed the grader; …` thêm:
```ts
const THANKS: Record<string, Key> = {
  Management: 'chat.thanksManagement', Ops: 'chat.thanksOps', Sales: 'chat.thanksSales', Customs: 'chat.thanksCustoms',
  Finance: 'chat.thanksFinance', CS: 'chat.thanksCS', IT: 'chat.thanksIT',
};

/** After a correct answer: your reply, then the sender's thank-you (L18 ★1). */
function sentBubbles(tk: Ticket): HTMLElement {
  return h('div', { class: 'my-3 flex flex-col gap-2' },
    h('p', { class: 'm-0 max-w-[85%] self-end rounded-2xl rounded-tr-sm bg-accent-soft px-4 py-2' }, t('chat.sent')),
    h('p', { class: 'm-0 flex max-w-[85%] items-start gap-2 self-start' },
      avatar(tk.from),
      h('span', { class: 'rounded-2xl rounded-tl-sm bg-code px-4 py-2' }, t(THANKS[tk.from.dept] ?? 'chat.thanksOps'))));
}
```
3e. Trong `renderBrief`, ngay **trước** dòng `    isDone ? recap(tk, x) : null,` thêm:
```ts
    isDone ? sentBubbles(tk) : null,
```

- [ ] **Step 4: Kiểm kiểu, test, build**

```bash
npx tsc --noEmit
npx vitest run
npx vite build
grep -cF 'ml-13' dist/assets/index-*.css
```
Expected: tất cả xanh; dòng cuối `1`.

- [ ] **Step 5: Checklist Edge (orchestrator)**

1. Hộp thư:
   - mỗi người một nhóm: chân dung + tên + chip phòng + vai trò (VI/EN đổi theo ngôn ngữ);
   - việc của người đó là bong bóng xám, góc trên trái vuông;
   - nhóm có việc mới nhất nằm trên cùng;
   - việc đang mở viền accent; việc đã xong chữ xám + "✓ Đã xong".
2. Đề bài:
   - chân dung 48px, tên, chip phòng, vai trò, rồi dòng "Chương n · ★★ · [pill]";
   - thân đề là bong bóng tin nhắn; "Yêu cầu" vẫn là khung riêng viền trái accent.
3. Nộp đúng: dưới đề có bong bóng của bạn (nền xanh nhạt, căn phải) "Mình gửi kết quả rồi nhé.", rồi bong bóng cảm ơn của người gửi kèm chân dung nhỏ, rồi Recap.
4. Tương phản: chữ trong bong bóng `--text` trên `--code`/`--accent-soft` ở cả hai theme.
5. Bàn phím: Tab qua từng việc trong Hộp thư; Enter mở việc; Esc đóng dialog.

- [ ] **Step 6: Commit**

```bash
git add src/ui/inbox.ts src/ui/brief.ts src/i18n/vi.ts src/i18n/en.ts
git commit -m "feat(ui): chat-style inbox grouped by colleague and message-style ticket header"
```

---

### Task 14: Đề bài viết lại thành câu hỏi nghiệp vụ, nhãn cột `{ vi, en }` (L24, L25, L22)

Phần (e). Đây là **một commit duy nhất** (L25): parser, `templateNames`, thẻ "Kết quả mong đợi", test parser, test nội dung, `TEMPLATE.md`, `CLAUDE.md` và 15 ticket. Parser mới từ chối nhãn chuỗi trơn, nên đổi riêng phần nào cũng làm đỏ.

Nguồn chữ: `docs/team/problem-design.md` §3, từng khối `ch…`. Plan **không chép lại** 15 đề song ngữ (≈ 560 dòng); người thực hiện dán đúng khối của §3. Test ở Step 2 bắt chỗ dán sót: nhãn chuỗi, backtick trong đề, nhãn trùng tên cột.

**Giữ nguyên** (problem-design §3 "Cách dán"):
- `id`, `chapter`, `from`, `difficulty`, `beat`, `requires`, `grants`, `tables`, `ordered`, `starter`;
- `conclusion`/`conclusion_en`;
- mọi khối ```sql (Solution và SQL từng bước).

**Files:**
- Modify: `src/tickets.ts`, `src/ui/brief.ts`, `src/i18n/vi.ts`, `src/i18n/en.ts`, `tests/tickets.test.ts`, `tests/content.test.ts`, `content/TEMPLATE.md`, `CLAUDE.md`, `content/tickets/ch1/*.md`, `content/tickets/ch2/*.md`, `content/tickets/ch3/*.md`

**Interfaces:**
- Produces: `export interface Label { vi: string; en: string }`; `Step.columns?: Label[]`. Ticket thường có một danh sách; cột mốc có một danh sách mỗi bước. Mỗi nhãn là `{ vi, en }` khác rỗng; chuỗi trơn bị từ chối.
- Thẻ "Kết quả mong đợi" hiện `label[getLang()]` (chữ thường, không `code`) kèm dòng `shape.byPosition`.

- [ ] **Step 1: Test parser (FAIL) trong `tests/tickets.test.ts`**

1a. Trong `NORMAL_BI`, thay `'title: Cảng châu Âu\ntitle_en: European ports\ncolumns: [port]\n'` bằng:
```ts
'title: Cảng châu Âu\ntitle_en: European ports\ncolumns: [{ vi: "Cảng", en: "Port" }]\n'
```
1b. Trong `BOSS_BI`, thay `'title: Lô đi Rotterdam\ntitle_en: Shipments to Rotterdam\ncolumns: [[ref], [ref]]\n'` bằng:
```ts
'title: Lô đi Rotterdam\ntitle_en: Shipments to Rotterdam\ncolumns: [[{ vi: "Mã lô", en: "Ref" }], [{ vi: "Mã lô", en: "Ref" }]]\n'
```
1c. Thay `expect(t.steps[0].columns).toEqual(['port']);` bằng `expect(t.steps[0].columns).toEqual([{ vi: 'Cảng', en: 'Port' }]);`, và `expect(t.steps.map((s) => s.columns)).toEqual([['ref'], ['ref']]);` bằng:
```ts
    expect(t.steps.map((s) => s.columns)).toEqual([[{ vi: 'Mã lô', en: 'Ref' }], [{ vi: 'Mã lô', en: 'Ref' }]]);
```
1d. Trong test `'báo lỗi định dạng song ngữ và columns'`, thay hai dòng cuối:
```ts
    expect(bad(BOSS_BI.replace('columns: [[ref], [ref]]', 'columns: [[ref]]'))).toThrow(/columns/);
    expect(bad(NORMAL_BI.replace('columns: [port]', 'columns: port'))).toThrow(/columns/);
```
bằng:
```ts
    const boss2 = 'columns: [[{ vi: "Mã lô", en: "Ref" }], [{ vi: "Mã lô", en: "Ref" }]]';
    const normal1 = 'columns: [{ vi: "Cảng", en: "Port" }]';
    expect(bad(BOSS_BI.replace(boss2, 'columns: [[{ vi: "Mã lô", en: "Ref" }]]'))).toThrow(/columns/);
    expect(bad(NORMAL_BI.replace(normal1, 'columns: port'))).toThrow(/columns/);
    // L25: plain string labels, a missing or blank `en` are rejected
    expect(bad(NORMAL_BI.replace(normal1, 'columns: [port]'))).toThrow(/\{ vi, en \}/);
    expect(bad(NORMAL_BI.replace(normal1, 'columns: [{ vi: "Cảng" }]'))).toThrow(/\{ vi, en \}/);
    expect(bad(NORMAL_BI.replace(normal1, 'columns: [{ vi: "Cảng", en: " " }]'))).toThrow(/\{ vi, en \}/);
```

Run: `npx vitest run tests/tickets.test.ts`
Expected: FAIL. Parser cũ từ chối nhãn dạng đối tượng ("columns: ticket thường là danh sách nhãn cột…").

- [ ] **Step 2: Test nội dung (sẽ FAIL tới khi dán xong đề) trong `tests/content.test.ts`**

2a. Thay toàn bộ test `it.each(steps)('$name: Solution chạy được, có dữ liệu, số nhãn columns bằng số cột', …)` bằng:
```ts
  it.each(steps)('$name: Solution chạy được; columns là nhãn nghiệp vụ VI/EN, đủ số cột, không đọc hộ tên cột (L25)', async ({ sql, columns }) => {
    const run = await runner();
    const r = await run(sql);
    expect(r.rows.length).toBeGreaterThan(0);
    expect(columns?.length).toBe(r.columns.length);
    for (const label of columns ?? []) {
      expect(label.en).not.toMatch(VI_DIACRITIC);
      for (const text of [label.vi, label.en]) {
        expect(text).not.toMatch(/^[a-z0-9_]+$/);
        expect(r.columns).not.toContain(text);
      }
    }
  });
```
2b. Trong `describe('song ngữ', …)`, thêm test cuối:
```ts
  it.each(tickets)('$id: thân đề, Task và đề bước không có backtick (problem-design §1.2)', (t) => {
    for (const lang of ['vi', 'en'] as const) {
      const x = textOf(t, lang);
      expect([x.body, x.task, ...x.steps.map((s) => s.prompt)].join('\n')).not.toContain('`');
    }
  });
```
(Hints và câu kết luận được nhắc tên cột/SQL, nên không kiểm.)

- [ ] **Step 3: Parser (`src/tickets.ts`)**

3a. Thay khối `export interface Step { … }` bằng:
```ts
/** Expected-result column label (L25): business meaning in both languages, never the Solution's column name. */
export interface Label { vi: string; en: string }
export interface Step {
  title: string;
  prompt: string;
  solution: string;
  /** Expected result column labels from `columns:` (shape card only; the grader compares by position). */
  columns?: Label[];
}
```
3b. Trong `templateNames`, thay dòng `    ...t.steps.flatMap((s) => [s.solution, ...(s.columns ?? [])]),` bằng:
```ts
    ...t.steps.flatMap((s) => [s.solution, ...(s.columns ?? []).flatMap((l) => [l.vi, l.en])]),
```
3c. Thay toàn bộ khối `if (fm.columns !== undefined) { … }` bằng:
```ts
  if (fm.columns !== undefined) {
    // Normal ticket: one list of labels. Boss: one list per step. Each label is { vi, en } (L25).
    const isLabel = (c: unknown): c is Label => {
      const o = c as Partial<Label> | null;
      return !!o && typeof o === 'object' && !Array.isArray(o)
        && typeof o.vi === 'string' && o.vi.trim() !== '' && typeof o.en === 'string' && o.en.trim() !== '';
    };
    const lists = t.beat === 'boss' ? fm.columns : [fm.columns];
    const ok = Array.isArray(lists) && lists.length === t.steps.length
      && lists.every((l) => Array.isArray(l) && l.length > 0 && l.every(isLabel));
    if (!ok) fail('columns: mỗi nhãn là { vi, en }; ticket thường một danh sách, cột mốc một danh sách cho mỗi bước');
    (lists as Label[][]).forEach((l, i) => (t.steps[i].columns = l.map((x) => ({ vi: x.vi.trim(), en: x.en.trim() }))));
  }
```

Run: `npx vitest run tests/tickets.test.ts && npx tsc --noEmit`
Expected: `tickets.test.ts` PASS. `tsc` báo lỗi ở `src/ui/brief.ts` (`labels[i]` nay là `Label`); Step 4 sửa.

- [ ] **Step 4: Thẻ "Kết quả mong đợi" (`src/ui/brief.ts`) và i18n**

4a. Trong `shapeCard`, thay `labels[i] ? h('code', {}, labels[i]) : null` bằng:
```ts
labels[i] ? h('b', { class: 'font-semibold' }, labels[i][getLang()]) : null
```
4b. Trong `shapeCard`, ngay **trước** dòng `      cmp && run` thêm:
```ts
      h('p', { class: 'mt-1 mb-0 text-sm text-muted' }, t('shape.byPosition')),
```
4c. `src/i18n/vi.ts`, ngay sau dòng `'shape.yours': …` thêm:
```ts
  'shape.byPosition': 'Tên cột bạn đặt không quan trọng: máy chấm so theo vị trí cột.',
```
`src/i18n/en.ts`, ngay sau dòng `'shape.yours': …` thêm:
```ts
  'shape.byPosition': 'Your column names do not matter: the grader compares columns by position.',
```

Run: `npx tsc --noEmit`. Expected: không lỗi.

- [ ] **Step 5: Dán đề mới vào 15 ticket**

Với **mỗi** file `content/tickets/chN/chN-0M.md`, mở khối `### chN-0M · …` trong `problem-design.md` §3 và làm:

1. **Frontmatter:** thay ba khóa `title`, `title_en`, `columns` bằng khối ```yaml của §3. Nhãn viết nhiều dòng (`columns:` + `  - { vi: …, en: … }`). Tiêu đề có dấu `:` phải giữ nháy kép như trong §3. Mọi khóa khác giữ nguyên chữ và vị trí.
   - ch3-03: §3 giữ tiêu đề cũ, chỉ đổi `columns`.
   - Cột mốc (ch1-05, ch2-05, ch3-05): `conclusion`/`conclusion_en` giữ nguyên.
2. **Phần VI** (từ sau `---` đến trước `# EN`):
   - ticket thường: thay bằng phần VI của khối ```markdown §3 (thân đề, `## Task`, `## Hints`), rồi **giữ nguyên** mục `## Solution` + khối ```sql cũ ở cuối phần VI;
   - cột mốc: thay bằng phần VI §3 (thân đề, `## Step N: …`, `## Hints`). Mỗi dòng `(giữ khối sql cũ)` thay bằng **đúng** khối ```sql của bước N trong file cũ.

   Tiêu đề bước của ch1-05: "3 lô cập cảng sớm nhất" thành "Ba lô cập cảng sớm nhất", theo §3.
3. **Khối `# EN`:** thay toàn bộ bằng phần sau dòng `# EN` của khối ```markdown §3.
4. **Dấu nhấn mạnh:** ở hint 1 của ch3-03, bỏ hai dấu sao quanh "không có" (VI) và "missing" (EN). `richText` không hiểu markdown, nên sẽ in nguyên dấu sao. Giữ nguyên chữ bên trong. **Không** đụng dấu `*` nằm trong code span (ví dụ `SELECT *` ở ch1-01): đó là SQL.

Kiểm nhanh sau khi dán:
```bash
grep -rn "giữ khối sql cũ" content; echo "exit=$?"
grep -rn "^columns: \[" content/tickets; echo "exit=$?"
grep -c '```sql' content/tickets/*/*.md
```
Expected:
- hai lệnh đầu: không dòng nào, `exit=1`;
- lệnh cuối: mỗi ticket thường `1`, mỗi cột mốc `3`, đúng như trước khi dán.

5b. `content/TEMPLATE.md`: thay toàn bộ bằng:
````markdown
---
# Mẫu ticket. Copy vào content/tickets/chN/chN-0M.md rồi sửa. File này nằm ngoài content/tickets/ nên game không nạp.
# Đề là câu hỏi nghiệp vụ (docs/team/problem-design.md §1): ai hỏi, cần gì, để làm gì, ràng buộc đủ để chấm đúng,
# thông tin trả về theo thứ tự. Thân đề, Task và đề bước: không tên bảng/cột, không từ khóa SQL, không mã trạng thái, không backtick.
# Kỹ năng trong requires/grants lấy id từ content/skills.yml. Bảng trong tables phải mở ở chương này (CHAPTER_TABLES).
# Có thứ tự/top-N: đặt ordered: true và nêu quy tắc phá hòa bằng lời nghiệp vụ.
# Ngày "hôm nay" là 2026-10-31; Solution chỉ dùng ngày cố định.
# columns: mỗi cột kết quả một nhãn { vi, en } theo nghĩa nghiệp vụ (L25), không phải tên cột của Solution.
# Cột mốc (beat: boss): thay "## Solution" bằng "## Step N: <tiêu đề>" (mỗi bước một khối sql), columns là một danh sách cho mỗi bước,
# thêm conclusion { question, options, answer } và conclusion_en { question, options }.
id: ch0-01
chapter: 0
title: Tiêu đề tiếng Việt
title_en: English title
from: { name: Hoàng Khánh, dept: Ops }
difficulty: 1
beat: develop
requires: [select]
grants: [where]
tables: [ports]
columns:
  - { vi: "Mã cảng", en: "Port code" }
  - { vi: "Tên cảng", en: "Port name" }
---
Bối cảnh: ai hỏi, cần gì, để làm gì (1–3 câu), bằng lời nghiệp vụ.

## Task
Câu hỏi nghiệp vụ, ràng buộc (thời gian, lô hủy, tập bao gồm, làm tròn, phá hòa) và thông tin cần trả về theo đúng thứ tự.

## Hints
1. Nghiệp vụ → dữ liệu: thông tin nằm ở danh mục nào, câu hỏi thuộc dạng gì.
2. Bảng, cột, giá trị và mệnh đề cụ thể, ví dụ `region = 'Europe'`.
3. Khung query, ví dụ `SELECT code, name FROM ports WHERE ...`

## Solution
```sql
SELECT code, name FROM ports WHERE region = 'Europe'
```

# EN
Context: who asks, what they need and what for (1-3 sentences), in business words.

## Task
The business question, the constraints (dates, cancelled shipments, what is included, rounding, tie-breaks) and the information to return, in order.

## Hints
1. Business to data: which list holds the information, what kind of question this is.
2. The tables, columns, values and clauses, for example `region = 'Europe'`.
3. The query skeleton, for example `SELECT code, name FROM ports WHERE ...`
````

5c. `CLAUDE.md`, mục Architecture, gạch đầu dòng về ticket: thay đoạn `` `columns:` (one language-neutral list of result labels for the shape card) `` bằng:
```markdown
`columns:` (one `{ vi, en }` business label per result column for the shape card, L25: never the Solution's column name; bosses have one list per step)
```
và cuối gạch đầu dòng đó thêm câu:
```markdown
Prompts (body, Task, step text) are business questions with no table/column names, SQL keywords, status codes or backticks (`docs/team/problem-design.md` §1, enforced by `tests/content.test.ts`).
```

- [ ] **Step 6: Kiểm kiểu, test, build**

```bash
npx tsc --noEmit
npx vitest run
npx vite build
```
Expected: tất cả xanh. Test "Solution chạy được; columns là nhãn nghiệp vụ…" PASS cho cả 21 bước. Test backtick PASS cho 15 ticket. `contentProblems` vẫn `[]`, vì `requires`/`grants`/`tables` không đổi.

- [ ] **Step 7: Checklist Edge (orchestrator)**

1. Mở lần lượt ch1-01 → ch3-05, ở VI rồi EN. Thân đề và "Yêu cầu" là câu hỏi nghiệp vụ, không còn `customer_id` hay backtick. Gợi ý bậc 2–3 vẫn có tên bảng/cột.
2. Thẻ "Kết quả mong đợi":
   - nhãn là chữ thường theo ngôn ngữ ("Mã lô" / "Shipment ref"), không phải `ref`;
   - có dòng "Tên cột bạn đặt không quan trọng…";
   - chạy query thì dòng "Của bạn: …" vẫn so đúng.
3. Ba cột mốc có tiêu đề "Đánh giá cuối thử việc: …", "Dự án đầu tiên ở vị trí mới: …", "Đánh giá thăng tiến: …"; pill "Đánh giá thăng tiến"; câu kết luận như cũ.
4. Làm lại ch1-05 bằng Solution cũ: cả 3 bước + kết luận vẫn đúng.

- [ ] **Step 8: Commit (một commit, L25)**

```bash
git add src/tickets.ts src/ui/brief.ts src/i18n/vi.ts src/i18n/en.ts tests/tickets.test.ts tests/content.test.ts content/TEMPLATE.md CLAUDE.md content/tickets
git commit -m "feat(content): business-question prompts and {vi,en} column labels for ch1-3 (L24, L25)"
```

---

### Task 15: Khai báo hoạt cảnh: `scene:`, `sceneOf`, `derive`, tuyến và thời lượng (hàm thuần)

Phần (d), lớp logic, theo `completion-animations.md` §2, §3, §7. Mọi thứ hoạt cảnh và Trang chủ vẽ ra đều tính lại từ `completed` + frontmatter, **không lưu gì** (§1.5, L20):
- container trên bãi Tiên Sa;
- tuyến đã mở, số chuyến mỗi cảng, chuyến không đích;
- thời lượng từng bước.

Task 16–18 chỉ vẽ những gì module này trả về.

**Tuyến mở theo chương** (mockup v5 đã duyệt; Laem Chabang `THLCH` thay "Bangkok", L31):

| Cảng | Mở khi qua đánh giá chương |
|---|---|
| Shanghai `CNSHA`, Laem Chabang `THLCH` | mở từ đầu |
| Singapore `SGSIN` | 1 |
| Rotterdam `NLRTM` | 2 |
| Busan `KRPUS` | 3 |
| Los Angeles `USLAX` | 4 |
| Sydney `AUSYD` | 5 |

Chương 6–12 không mở tuyến mới: bản đồ đã đủ, curriculum §7.2. Câu báo thăng tiến của các chương này không nêu tuyến.

**Files:**
- Create: `src/scene.ts`, `tests/scene.test.ts`
- Modify: `src/tickets.ts` (đọc `scene:`), `content/tickets/ch1/ch1-04.md`, `content/tickets/ch1/ch1-05.md`, `content/tickets/ch2/ch2-01.md`, `content/TEMPLATE.md` (chú thích)

**Interfaces:**
- Produces (`src/scene.ts`):
  - `SCENE_KINDS = ['ship','yard','customs','truck','quote','ledger','chat']`, `type SceneKind = … | 'promotion'`, `type Lane = 'green' | 'yellow' | 'red'`, `interface Scene { kind: SceneKind; to?: string; lane?: Lane }`
  - `parseScene(v: unknown, boss: boolean, fail: (msg: string) => never): Scene`. Luật §3.1:
    - `kind` hợp lệ, không `promotion`;
    - `lane` chỉ đi với `customs`;
    - `to` chỉ đi với `ship` hoặc ticket boss, và phải là cảng có tuyến;
    - không khóa lạ.
  - `interface RouteInfo { port; name; opens; x; y; d; lx; ly }`, `ROUTES: RouteInfo[]` (tọa độ bản đồ của v5, tên = `ports.name` của seed), `routeOpenedBy(chapter): string | undefined`
  - `sceneOf(t: Ticket): Scene` (§3.2)
  - `interface Harbor { bays: Record<number, number>; passed: Set<number>; open: Set<string>; trips: Record<string, number>; departures: number }`, `derive(tickets, completed): Harbor` (§7)
  - `STEPS: Record<SceneKind, readonly number[]>` (ms từng bước, §2), `GATE_WAIT: Record<Lane, number>`, `durationOf(sc: Scene): number`
- `Ticket.scene?: Scene` (tùy chọn; parser cũ bỏ qua key lạ, nay đọc và kiểm).

- [ ] **Step 1: Viết `tests/scene.test.ts` (FAIL)**

```ts
import { describe, expect, it } from 'vitest';
import { loadTickets } from '../src/content';
import { derive, durationOf, parseScene, routeOpenedBy, ROUTES, sceneOf, STEPS, type Scene } from '../src/scene';
import { parseTicket } from '../src/tickets';
import { runner } from './helpers';

const tickets = loadTickets();
const upTo = (ch: number) => new Set(tickets.filter((t) => t.chapter <= ch).map((t) => t.id));
const fail = (msg: string): never => {
  throw new Error(msg);
};
const parse = (v: unknown, boss = false): Scene => parseScene(v, boss, fail);
const as = (dept: string, tables: string[] = ['ports']) => ({ ...tickets[0], from: { name: 'X', dept }, tables });

describe('sceneOf (completion-animations §3.2–§3.3)', () => {
  it('15 ticket ch1–3 ra đúng bảng §3.3 (sau 3 dòng scene: của Step 4)', () => {
    expect(Object.fromEntries(tickets.map((t) => [t.id, sceneOf(t)]))).toEqual({
      'ch1-01': { kind: 'yard' }, 'ch1-02': { kind: 'yard' }, 'ch1-03': { kind: 'yard' }, 'ch1-04': { kind: 'yard' },
      'ch1-05': { kind: 'promotion', to: 'NLRTM' },
      'ch2-01': { kind: 'yard' }, 'ch2-02': { kind: 'yard' }, 'ch2-03': { kind: 'yard' }, 'ch2-04': { kind: 'ship' },
      'ch2-05': { kind: 'promotion' },
      'ch3-01': { kind: 'chat' }, 'ch3-02': { kind: 'yard' }, 'ch3-03': { kind: 'chat' }, 'ch3-04': { kind: 'yard' },
      'ch3-05': { kind: 'promotion' },
    });
  });

  it('mặc định theo phòng ban và bảng; scene: khai thì thắng; customs không khai lane là luồng xanh', () => {
    expect(sceneOf(as('Customs'))).toEqual({ kind: 'customs', lane: 'green' });
    expect(sceneOf(as('Finance'))).toEqual({ kind: 'ledger' });
    expect(sceneOf(as('CS'))).toEqual({ kind: 'chat' });
    expect(sceneOf(as('Ops', ['shipments']))).toEqual({ kind: 'ship' });
    expect(sceneOf(as('Ops'))).toEqual({ kind: 'yard' });
    expect(sceneOf(as('Sales', ['shipments']))).toEqual({ kind: 'yard' });
    expect(sceneOf({ ...as('Sales'), scene: { kind: 'quote' } })).toEqual({ kind: 'quote' });
    expect(sceneOf({ ...as('Ops'), scene: { kind: 'customs' } })).toEqual({ kind: 'customs', lane: 'green' });
    expect(sceneOf({ ...as('Ops'), scene: { kind: 'customs', lane: 'red' } })).toEqual({ kind: 'customs', lane: 'red' });
  });
});

describe('parseScene (§3.1)', () => {
  it('nhận các dạng hợp lệ', () => {
    expect(parse({ kind: 'ship', to: 'NLRTM' })).toEqual({ kind: 'ship', to: 'NLRTM' });
    expect(parse({ kind: 'customs', lane: 'yellow' })).toEqual({ kind: 'customs', lane: 'yellow' });
    expect(parse({ kind: 'yard' })).toEqual({ kind: 'yard' });
    expect(parse({ kind: 'ship', to: 'SGSIN' }, true)).toEqual({ kind: 'ship', to: 'SGSIN' });
    expect(parse({ kind: 'yard', to: 'AUSYD' }, true)).toEqual({ kind: 'yard', to: 'AUSYD' });
  });

  it('báo lỗi', () => {
    expect(() => parse('ship')).toThrow(/scene phải là/);
    expect(() => parse({ kind: 'promotion' })).toThrow(/scene\.kind/);
    expect(() => parse({ kind: 'boat' })).toThrow(/scene\.kind/);
    expect(() => parse({ kind: 'yard', lane: 'red' })).toThrow(/scene\.lane/);
    expect(() => parse({ kind: 'customs', lane: 'blue' })).toThrow(/scene\.lane/);
    expect(() => parse({ kind: 'yard', to: 'NLRTM' })).toThrow(/scene\.to/);
    expect(() => parse({ kind: 'ship', to: 'BKK' })).toThrow(/scene\.to/);
    expect(() => parse({ kind: 'ship', port: 'NLRTM' })).toThrow(/khóa lạ/);
  });

  it('parseTicket đọc scene: và báo lỗi kèm tên file', () => {
    const src = `---
id: ch1-02
chapter: 1
title: Cảng
from: { name: Hoàng Khánh, dept: Ops }
difficulty: 1
beat: develop
requires: []
grants: [where]
tables: [ports]
scene: { kind: truck }
---
Đề.

## Hints
1. a
2. b
3. c

## Solution
\`\`\`sql
SELECT 1
\`\`\`
`;
    expect(parseTicket(src, 'x.md').scene).toEqual({ kind: 'truck' });
    expect(() => parseTicket(src.replace('{ kind: truck }', '{ kind: truck, lane: red }'), 'x.md')).toThrow(/x\.md: scene\.lane/);
  });
});

describe('tuyến từ Tiên Sa (L26, L31)', () => {
  it('mỗi tuyến là cảng SEAPORT của seed, tên đúng ports.name; có Laem Chabang, không có Bangkok', async () => {
    const run = await runner();
    const r = await run("SELECT code, name FROM ports WHERE kind = 'SEAPORT'");
    const seed = new Map(r.rows.map(([code, name]) => [String(code), String(name)]));
    expect(ROUTES.filter((x) => seed.get(x.port) !== x.name).map((x) => x.port)).toEqual([]);
    expect(ROUTES.map((x) => x.name)).toContain('Laem Chabang');
    expect(ROUTES.map((x) => x.name).join()).not.toMatch(/Bangkok/);
  });

  it('mỗi chương mở nhiều nhất một tuyến; ch6+ không mở tuyến', () => {
    expect([1, 2, 3, 4, 5, 6, 12].map(routeOpenedBy)).toEqual(['SGSIN', 'NLRTM', 'KRPUS', 'USLAX', 'AUSYD', undefined, undefined]);
    const opens = ROUTES.map((x) => x.opens).filter((n) => n > 0);
    expect(new Set(opens).size).toBe(opens.length);
  });
});

describe('derive (§7): mọi thứ tính lại từ completed', () => {
  it('save trống: bãi trống, hai tuyến mở từ đầu', () => {
    expect(derive(tickets, new Set())).toEqual({ bays: {}, passed: new Set(), open: new Set(['CNSHA', 'THLCH']), trips: {}, departures: 0 });
  });

  it('xong chương 1: 5 container chương 1, qua chương 1, mở Singapore, 1 chuyến Rotterdam (ch1-05 to: NLRTM)', () => {
    expect(derive(tickets, upTo(1))).toEqual({
      bays: { 1: 5 }, passed: new Set([1]), open: new Set(['CNSHA', 'THLCH', 'SGSIN']), trips: { NLRTM: 1 }, departures: 0,
    });
  });

  it('xong chương 2: mở Rotterdam; cột mốc ch2 (không to) chạy tuyến vừa mở; ch2-04 là chuyến không đích', () => {
    const h = derive(tickets, upTo(2));
    expect(h.bays).toEqual({ 1: 5, 2: 5 });
    expect(h.open).toEqual(new Set(['CNSHA', 'THLCH', 'SGSIN', 'NLRTM']));
    expect(h.trips).toEqual({ NLRTM: 2 });
    expect(h.departures).toBe(1);
  });

  it('bỏ qua id lạ trong completed', () => {
    expect(derive(tickets, new Set(['nope']))).toEqual(derive(tickets, new Set()));
  });
});

describe('thời lượng (§2): mỗi hoạt cảnh ≤ 3 s', () => {
  it('khớp bảng §2', () => {
    expect(durationOf({ kind: 'ship' })).toBe(2600);
    expect(durationOf({ kind: 'yard' })).toBe(2800);
    expect(durationOf({ kind: 'customs' })).toBe(2400);
    expect(durationOf({ kind: 'customs', lane: 'yellow' })).toBe(2800);
    expect(durationOf({ kind: 'customs', lane: 'red' })).toBe(3000);
    expect(durationOf({ kind: 'truck' })).toBe(2700);
    expect(durationOf({ kind: 'quote' })).toBe(2300);
    expect(durationOf({ kind: 'ledger' })).toBe(2600);
    expect(durationOf({ kind: 'chat' })).toBe(2400);
    expect(durationOf({ kind: 'promotion' })).toBe(3000);
  });

  it('không loại nào vượt 3000 ms', () => {
    const all = (Object.keys(STEPS) as Scene['kind'][]).flatMap((kind) => (['green', 'yellow', 'red'] as const).map((lane) => durationOf({ kind, lane })));
    expect(Math.max(...all)).toBeLessThanOrEqual(3000);
  });
});
```
Run: `npx vitest run tests/scene.test.ts`
Expected: FAIL: `Failed to resolve import "../src/scene"`.

- [ ] **Step 2: Viết `src/scene.ts`**

```ts
import type { Ticket } from './tickets';

/** completion-animations.md §2. `promotion` is never declared: it follows from beat: boss. */
export const SCENE_KINDS = ['ship', 'yard', 'customs', 'truck', 'quote', 'ledger', 'chat'] as const;
export type SceneKind = (typeof SCENE_KINDS)[number] | 'promotion';
export type Lane = 'green' | 'yellow' | 'red';
const LANES: readonly Lane[] = ['green', 'yellow', 'red'];
/** What plays when a ticket is first completed. `to`: destination port (ship, or the route of a promotion). */
export interface Scene { kind: SceneKind; to?: string; lane?: Lane }

/**
 * Lanes radiating from Tien Sa (L26), as approved in mockup v5. `opens`: the chapter whose promotion review opens the lane
 * (0 = open from the start). `name` = ports.name in the seed (tests/scene.test.ts). x/y/d/lx/ly: map geometry (viewBox 980×260).
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
export const routeOpenedBy = (chapter: number): string | undefined => ROUTES.find((r) => r.opens === chapter && chapter > 0)?.port;

/** Frontmatter `scene:` (§3.1). `fail` comes from parseTicket, so errors carry the file name. */
export function parseScene(v: unknown, boss: boolean, fail: (msg: string) => never): Scene {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return fail('scene phải là { kind, to?, lane? }');
  const o = v as Record<string, unknown>;
  const extra = Object.keys(o).filter((k) => k !== 'kind' && k !== 'to' && k !== 'lane');
  if (extra.length) fail(`scene: khóa lạ ${extra.join(', ')}`);
  if (!(SCENE_KINDS as readonly unknown[]).includes(o.kind)) {
    fail(`scene.kind phải là một trong ${SCENE_KINDS.join(', ')} (promotion tự suy từ beat: boss)`);
  }
  const kind = o.kind as (typeof SCENE_KINDS)[number];
  if (o.lane !== undefined && (kind !== 'customs' || !(LANES as readonly unknown[]).includes(o.lane))) {
    fail('scene.lane chỉ đi với kind: customs, giá trị green | yellow | red');
  }
  if (o.to !== undefined && ((kind !== 'ship' && !boss) || !ROUTES.some((r) => r.port === o.to))) {
    fail(`scene.to chỉ đi với kind: ship hoặc ticket boss, và là một trong ${ROUTES.map((r) => r.port).join(', ')}`);
  }
  return { kind, ...(o.to !== undefined ? { to: o.to as string } : {}), ...(o.lane !== undefined ? { lane: o.lane as Lane } : {}) };
}

/**
 * §3.2, in order: a boss is a promotion (its scene.to picks the ship's route); a declared scene wins; then the sender's
 * department; Ops working on shipments sails without a destination; everything else stacks a container (yard).
 * quote, truck and a destination port cannot be inferred: those tickets declare scene:.
 */
export function sceneOf(t: Ticket): Scene {
  if (t.beat === 'boss') return t.scene?.to ? { kind: 'promotion', to: t.scene.to } : { kind: 'promotion' };
  if (t.scene) return t.scene.kind === 'customs' ? { lane: 'green', ...t.scene } : t.scene;
  if (t.from.dept === 'Customs') return { kind: 'customs', lane: 'green' };
  if (t.from.dept === 'Finance') return { kind: 'ledger' };
  if (t.from.dept === 'CS') return { kind: 'chat' };
  if (t.from.dept === 'Ops' && t.tables.includes('shipments')) return { kind: 'ship' };
  return { kind: 'yard' };
}

/** Everything the harbour and the map show (§7): pure, from the completed ids. Nothing new is saved. */
export interface Harbor {
  /** Completed tickets per chapter: one container each in that chapter's yard bay. */
  bays: Record<number, number>;
  /** Chapters whose promotion review is done. */
  passed: Set<number>;
  /** Open lanes (ROUTES ports). A ship may sail a locked lane; only a promotion opens one. */
  open: Set<string>;
  /** Departures per destination port. */
  trips: Record<string, number>;
  /** Departures with no destination (ship without `to`). */
  departures: number;
}

export function derive(tickets: Ticket[], completed: Set<string>): Harbor {
  const h: Harbor = { bays: {}, passed: new Set(), open: new Set(), trips: {}, departures: 0 };
  for (const t of tickets) {
    if (!completed.has(t.id)) continue;
    h.bays[t.chapter] = (h.bays[t.chapter] ?? 0) + 1;
    const sc = sceneOf(t);
    if (sc.kind === 'promotion') h.passed.add(t.chapter);
    const to = sc.kind === 'promotion' ? sc.to ?? routeOpenedBy(t.chapter) : sc.kind === 'ship' ? sc.to : undefined;
    if (to) h.trips[to] = (h.trips[to] ?? 0) + 1;
    else if (sc.kind === 'ship') h.departures++;
  }
  for (const r of ROUTES) if (r.opens === 0 || h.passed.has(r.opens)) h.open.add(r.port);
  return h;
}

/** Step durations in ms (§2, the mockup's constants). src/ui/stage.ts plays exactly these. */
export const STEPS: Record<SceneKind, readonly number[]> = {
  ship: [2200, 400], // leave the berth (1.6 s) while sailing the lane (2.2 s); berth back + container drop
  yard: [400, 400, 900, 500, 300, 300], // lower, lift, travel, lower, release, trolley home
  customs: [200, 400, 700, 300, 800], // declaration, stamp, truck to gate, [lane wait], barrier, drive through
  truck: [700, 300, 700, 600, 400], // to gate, barrier, through + shutter opens, into CFS, shutter closes
  quote: [300, 500, 600, 500, 400], // show, wait, flip, wait, fade
  ledger: [300, 400, 1000, 500, 400], // show, PAID stamp, coins, wait, fade
  chat: [300, 700, 400, 600, 400], // show, typing, bubble, wait, fade
  promotion: [400, 2600], // last container; then ship + map (2.2 s) with the card (0.4 s) and confetti (2.6 s)
};
/** Customs stops at the gate: yellow = document check, red = physical inspection. */
export const GATE_WAIT: Record<Lane, number> = { green: 0, yellow: 400, red: 600 };

export const durationOf = (sc: Scene): number =>
  STEPS[sc.kind].reduce((a, b) => a + b, 0) + (sc.kind === 'customs' ? GATE_WAIT[sc.lane ?? 'green'] : 0);
```

- [ ] **Step 3: Đọc `scene:` trong `src/tickets.ts`**

3a. Thêm import ở đầu file:
```ts
import { parseScene, type Scene } from './scene';
```
(`scene.ts` chỉ `import type` từ `tickets.ts`, nên không có vòng import lúc chạy.)

3b. Trong `interface Ticket`, ngay sau dòng `  starter?: string;` thêm:
```ts
  /** Completion animation (completion-animations.md §3.1); sceneOf() fills the default. */
  scene?: Scene;
```
3c. Trong `parseTicket`, ngay sau khối `if (fm.starter !== undefined) { … }` thêm:
```ts
  if (fm.scene !== undefined) t.scene = parseScene(fm.scene, t.beat === 'boss', fail);
```

- [ ] **Step 4: Ba dòng `scene:` đã duyệt (§3.3, L31)**

Trong mỗi file, ngay sau dòng `tables: …` thêm:
- `content/tickets/ch1/ch1-04.md`: `scene: { kind: yard }`. Đề là danh sách nhân sự; đóng dấu tờ khai sẽ sai nghĩa.
- `content/tickets/ch1/ch1-05.md`: `scene: { kind: ship, to: NLRTM }`. Tàu của màn thăng tiến chạy tuyến Rotterdam.
- `content/tickets/ch2/ch2-01.md`: `scene: { kind: yard }`. Đề hỏi sản lượng, không có hóa đơn.

`content/TEMPLATE.md`: ngay trên dòng `id: ch0-01` thêm dòng chú thích:
```yaml
# Hoạt cảnh khi xong (tùy chọn, completion-animations.md §3): scene: { kind: ship|yard|customs|truck|quote|ledger|chat, to?: CNSHA|THLCH|SGSIN|NLRTM|KRPUS|USLAX|AUSYD, lane?: green|yellow|red }. Không khai thì dùng sceneOf().
```

- [ ] **Step 5: Chạy test, kiểm kiểu, build**

Run: `npx vitest run tests/scene.test.ts`. Expected: PASS.

```bash
npx tsc --noEmit
npx vitest run
npx vite build
```
Expected: tất cả xanh.

- [ ] **Step 6: Checklist Edge (orchestrator)**

Không có thay đổi nhìn thấy được. Mở game, làm một việc bất kỳ: không lỗi console, ch1-04/ch1-05/ch2-01 nạp bình thường.

- [ ] **Step 7: Commit**

```bash
git add src/scene.ts src/tickets.ts tests/scene.test.ts content/tickets/ch1/ch1-04.md content/tickets/ch1/ch1-05.md content/tickets/ch2/ch2-01.md content/TEMPLATE.md
git commit -m "feat: scene: frontmatter, sceneOf and derive for completion animations (pure)"
```

---

### Task 16: Cảnh cảng Tiên Sa và bản đồ tuyến trên Trang chủ

Phần (c), theo `home-v4.html` (hình ảnh) và `completion-v5.html` (hình học), L26, L31.

Cảnh SVG nhiều lớp có gradient:
- trời, mặt trời, bán đảo Sơn Trà hai lớp núi, ngọn hải đăng nhấp nháy;
- biển có ba dải sóng trôi;
- cầu cảng, đường nội bộ, cổng hải quan có barie, kho CFS cửa cuốn;
- cẩu bờ STS có xe con (trolley) chạy và khung cẩu (spreader) nâng hạ;
- tàu đang cập bến có khói, tàu nhỏ rời cảng ra khơi;
- **bãi container: mỗi việc đã xong là một container màu chương**, xếp theo cột chương (1–6 dãy trước, 7–12 dãy sau).

Bản đồ tuyến tỏa ra từ Tiên Sa:
- tuyến đã mở nét liền màu chương mở nó, tuyến khóa nét đứt;
- số chuyến hiện cạnh tên cảng;
- dùng Laem Chabang, không dùng "Bangkok".

Trang chủ **không phát lại** hoạt cảnh (completion-animations §4): nó vẽ trạng thái tính lại. Container của các chương có việc mới xong kể từ lần rời Trang chủ trước có viền sáng + nhãn "Mới"; mốc so sánh chỉ giữ trong bộ nhớ phiên.

**Files:**
- Create: `src/ui/harbor.ts`, `src/ui/routeMap.ts`
- Modify: `src/ui/homeView.ts`, `src/main.ts`, `src/style.css`, `src/i18n/vi.ts`, `src/i18n/en.ts`

**Interfaces:**
- Consumes: Task 15 (`derive`, `Harbor`, `ROUTES`), Task 12 (`s`), Task 2 (`chapterColor`, `cx`, `CARD`)
- Produces:
  - `src/ui/harbor.ts`:
    - `MAX_TIERS = 6`, `CRANE = { x: 555, y: 170 }`, `interface Box`, `bayBox(ch, tier): Box`;
    - `interface HarborParts` (các phần Task 18 điều khiển: `ship`, `trolley`, `cable`, `spreader`, `carry`, `truck`, `truckBox`, `barrier`, `shutter`, `gateTag`, `gateText`, `yard`, `drop`);
    - `harborScene(h: Harbor, opts: { ambient: boolean; current: number; crop?: boolean; fresh?: ReadonlySet<number> }): HarborParts`;
    - `drawYard(p, h, fresh?)`.
  - `src/ui/routeMap.ts`: `interface MapParts { svg; ship; wake; routes; pins; labels }`, `routeMap(h: Harbor): MapParts`, `paintRoutes(p: MapParts, h: Harbor): void`
  - `src/ui/homeView.ts`: section `harbor` (5, full), `routes` (25, full); `leftHome(): void`
  - CSS: `.cq-wave .cq-wave2 .cq-smoke .cq-smoke2 .cq-beacon .cq-ship-out .cq-trolley .cq-hoist` chỉ chạy trong `@media (prefers-reduced-motion: no-preference)`. Đây là CSS thuần như phần CodeMirror: keyframes cho SVG, không phải tiện ích Tailwind.

- [ ] **Step 1: i18n**

Trong `src/i18n/vi.ts`, ngay sau dòng `'chat.thanksIT': …` thêm:
```ts
  'harbor.title': 'Cảng Tiên Sa, Đà Nẵng',
  'harbor.sontra': 'Bán đảo Sơn Trà',
  'harbor.port': 'Cảng Tiên Sa · VNDAD',
  'harbor.yardLabel': 'Bãi: mỗi cột một chương',
  'harbor.cfs': 'KHO CFS',
  'harbor.customs': 'HẢI QUAN',
  'harbor.new': 'Mới',
  'harbor.callA': 'Đã xong {done} việc · {trips} chuyến tàu rời Tiên Sa',
  'harbor.callB': 'Đã qua {passed} chương · đang làm chương {n}',
  'harbor.label': 'Cảng Tiên Sa, Đà Nẵng. Bãi container: {bays}.',
  'harbor.bay': 'chương {n}: {k} container',
  'harbor.empty': 'trống',
  'routes.title': 'Bản đồ tuyến từ Tiên Sa',
  'routes.subtitle': 'Mỗi đánh giá thăng tiến mở một tuyến mới · việc xuất hàng cho tàu chạy tới cảng đích',
  'routes.hub': 'Tiên Sa (Đà Nẵng)',
  'routes.trips': '{n} chuyến',
  'routes.open': '{name}: đã mở',
  'routes.locked': '{name}: chưa mở',
  'routes.label': 'Bản đồ tuyến từ Tiên Sa. {lanes}.',
```
Trong `src/i18n/en.ts`, ngay sau dòng `'chat.thanksIT': …` thêm:
```ts
  'harbor.title': 'Tien Sa port, Da Nang',
  'harbor.sontra': 'Son Tra peninsula',
  'harbor.port': 'Tien Sa port · VNDAD',
  'harbor.yardLabel': 'Yard: one stack per chapter',
  'harbor.cfs': 'CFS',
  'harbor.customs': 'CUSTOMS',
  'harbor.new': 'New',
  'harbor.callA': (p) => `${count('task', 'tasks')({ n: p.done })} done · ${count('departure', 'departures')({ n: p.trips })} from Tien Sa`,
  'harbor.callB': (p) => `${count('chapter', 'chapters')({ n: p.passed })} passed · working on chapter ${p.n}`,
  'harbor.label': 'Tien Sa port, Da Nang. Container yard: {bays}.',
  'harbor.bay': (p) => `chapter ${p.n}: ${count('container', 'containers')({ n: p.k })}`,
  'harbor.empty': 'empty',
  'routes.title': 'Routes from Tien Sa',
  'routes.subtitle': 'Each promotion review opens a new lane · shipping tasks send a vessel to its port',
  'routes.hub': 'Tien Sa (Da Nang)',
  'routes.trips': count('trip', 'trips'),
  'routes.open': '{name}: open',
  'routes.locked': '{name}: locked',
  'routes.label': 'Route map from Tien Sa. {lanes}.',
```

- [ ] **Step 2: Viết `src/ui/harbor.ts`**

```ts
import { t } from '../i18n';
import type { Harbor } from '../scene';
import { chapterColor } from '../theme';
import { s } from './svg';

/** Tallest stack drawn per yard bay; more containers show as "+n" (chapters have 5–6 tickets). */
export const MAX_TIERS = 6;
/** Crane home: trolley above the berthed ship, spreader at rest. The stage (Task 18) tweens from here. */
export const CRANE = { x: 555, y: 170 } as const;

/** The parts Task 18 animates. Everything else in the scene is static or a CSS ambient loop. */
export interface HarborParts {
  svg: SVGSVGElement;
  yard: SVGGElement;
  drop: SVGGElement;
  ship: SVGGElement;
  trolley: SVGGElement;
  cable: SVGLineElement;
  spreader: SVGRectElement;
  carry: SVGRectElement;
  truck: SVGGElement;
  truckBox: SVGRectElement;
  barrier: SVGGElement;
  shutter: SVGRectElement;
  gateTag: SVGGElement;
  gateText: SVGTextElement;
}

export interface Box { x: number; y: number; w: number; h: number; base: number }
/** Bay of chapter `ch` (1–6 front row, 7–12 back row, smaller), tier 0 = ground. Geometry of mockup v5 (viewBox 1100×400). */
export function bayBox(ch: number, tier: number): Box {
  const front = ch <= 6;
  const i = front ? ch - 1 : ch - 7;
  const w = front ? 32 : 30;
  const h = front ? 9 : 8;
  const x = (front ? 790 : 800) + i * 36;
  const base = front ? 312 : 270;
  return { x, y: base - h * (tier + 1), w, h, base };
}

const FONT = 'system-ui, sans-serif';
let uid = 0;

/** Redraws the yard from `h.bays`. `fresh`: chapters whose top container gets a bright edge and a "New" tag. */
export function drawYard(p: HarborParts, h: Harbor, fresh: ReadonlySet<number> = new Set()): void {
  const out: SVGElement[] = [];
  for (const ch of [7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6]) { // back row first: the front row covers it
    const pad = bayBox(ch, -1);
    out.push(s('rect', { x: pad.x - 1, y: pad.base, width: pad.w + 2, height: 2, fill: '#64748b' }));
    const n = h.bays[ch] ?? 0;
    const shown = Math.min(n, MAX_TIERS);
    for (let k = 0; k < shown; k++) {
      const b = bayBox(ch, k);
      const top = fresh.has(ch) && k === shown - 1;
      out.push(s('rect', {
        x: b.x, y: b.y, width: b.w, height: b.h - 0.6, rx: 0.8, class: chapterColor(ch).fill,
        stroke: top ? '#ffffff' : false, 'stroke-width': top ? 1.6 : false,
      }));
      out.push(s('rect', { x: b.x + 2, y: b.y + 1.5, width: b.w - 4, height: 1, fill: '#ffffff', opacity: 0.25 }));
    }
    const label = n > MAX_TIERS ? `+${n - MAX_TIERS}` : fresh.has(ch) && shown ? t('harbor.new') : '';
    if (label) {
      const b = bayBox(ch, shown);
      out.push(s('text', { x: b.x + b.w / 2, y: b.y + 7, 'text-anchor': 'middle', 'font-family': FONT, 'font-size': 10, 'font-weight': 700, fill: '#0f172a' }, label));
    }
  }
  p.yard.replaceChildren(...out);
}

/**
 * The Tien Sa scene (L26). `ambient`: CSS loops (waves, smoke, lighthouse, departing ship, crane) for Home; the stage
 * passes false and drives the ship, crane, truck, barrier and shutter itself. `crop`: the stage's close-up of berth,
 * crane load path (y ≥ 140, so the lifted container stays in frame), yard, gate and CFS. Gradient ids get a per-build prefix: Home (hidden) and the stage can both be in the DOM.
 */
export function harborScene(h: Harbor, opts: { ambient: boolean; current: number; crop?: boolean; fresh?: ReadonlySet<number> }): HarborParts {
  const n = ++uid;
  const id = (k: string): string => `cq${n}-${k}`;
  const url = (k: string): string => `url(#${id(k)})`;
  const amb = (cls: string): string | false => (opts.ambient ? cls : false);
  const grad = (k: string, stops: [number, string, number?][]): SVGLinearGradientElement =>
    s('linearGradient', { id: id(k), x1: 0, y1: 0, x2: 0, y2: 1 },
      ...stops.map(([offset, color, alpha]) => s('stop', { offset, 'stop-color': color, 'stop-opacity': alpha ?? 1 })));
  const text = (x: number, y: number, size: number, fill: string, label: string, anchor = 'start'): SVGTextElement =>
    s('text', { x, y, 'text-anchor': anchor, 'font-family': FONT, 'font-size': size, 'font-weight': 700, fill }, label);

  const yard = s('g', {});
  const drop = s('g', { 'aria-hidden': 'true' });
  const cable = s('line', { x1: 0, y1: 125, x2: 0, y2: CRANE.y, stroke: '#334155', 'stroke-width': 2 });
  const spreader = s('rect', { x: -18, y: CRANE.y, width: 36, height: 4, fill: '#facc15' });
  const carry = s('rect', { x: -16, y: CRANE.y + 4, width: 32, height: 10, class: chapterColor(opts.current).fill, opacity: opts.ambient ? 1 : 0 });
  const trolley = s('g', { transform: `translate(${CRANE.x},0)` },
    s('rect', { x: -13, y: 117, width: 26, height: 8, rx: 1, fill: '#334155' }),
    s('g', { class: amb('cq-hoist') }, cable, spreader, carry));
  const ship = s('g', { 'aria-hidden': 'true' },
    s('path', { d: 'M470 250 L690 250 L676 284 L486 284 Z', fill: url('hull') }),
    s('rect', { x: 470, y: 250, width: 220, height: 4, fill: '#dc2626' }),
    ...[['#0284c7', 494, 234], ['#7c3aed', 524, 234], ['#e11d48', 554, 234], ['#059669', 584, 234], ['#d97706', 614, 234]]
      .map(([fill, x, y]) => s('rect', { x, y, width: 28, height: 16, fill })),
    s('rect', { x: 509, y: 220, width: 28, height: 14, fill: '#d97706' }),
    s('rect', { x: 569, y: 220, width: 28, height: 14, fill: '#0284c7' }),
    s('rect', { x: 650, y: 216, width: 28, height: 34, fill: '#f8fafc' }),
    s('rect', { x: 655, y: 222, width: 18, height: 5, fill: '#0ea5e9' }),
    s('rect', { x: 664, y: 204, width: 8, height: 12, fill: '#334155' }),
    s('circle', { class: amb('cq-smoke'), cx: 668, cy: 198, r: 6, fill: '#cbd5e1', opacity: opts.ambient ? 1 : 0 }),
    s('circle', { class: amb('cq-smoke cq-smoke2'), cx: 668, cy: 198, r: 6, fill: '#cbd5e1', opacity: opts.ambient ? 1 : 0 }),
    text(580, 276, 11, '#e0f2fe', 'CARGO QUERY', 'middle'));
  const truckBox = s('rect', { x: 0, y: 322, width: 56, height: 20, class: chapterColor(opts.current).fill });
  const truck = s('g', { opacity: 0, transform: 'translate(640,0)', 'aria-hidden': 'true' },
    truckBox,
    s('path', { d: 'M4 326 V338 M12 326 V338 M20 326 V338 M28 326 V338 M36 326 V338 M44 326 V338 M52 326 V338', stroke: '#000000', 'stroke-opacity': 0.18 }),
    s('rect', { x: 0, y: 342, width: 76, height: 5, fill: '#1e293b' }),
    s('path', { d: 'M58 330 H70 L76 338 V347 H58 Z', fill: '#f8fafc', stroke: '#1e293b' }),
    s('rect', { x: 66, y: 332, width: 7, height: 6, fill: '#7dd3fc' }),
    ...[10, 20, 48, 68].map((cx) => s('circle', { cx, cy: 350, r: 4, fill: '#0f172a' })));
  const shutter = s('rect', { x: 1026, y: 316, width: 62, height: 44, fill: url('shutter') });
  const barrier = s('g', {},
    s('rect', { x: 858, y: 337, width: 48, height: 5, fill: '#dc2626' }),
    s('rect', { x: 866, y: 337, width: 8, height: 5, fill: '#f8fafc' }),
    s('rect', { x: 882, y: 337, width: 8, height: 5, fill: '#f8fafc' }));
  const gateText = text(844, 379, 12, '#f8fafc', '', 'middle');
  const gateTag = s('g', { opacity: 0, 'aria-hidden': 'true' }, s('rect', { x: 796, y: 364, width: 96, height: 22, rx: 6, fill: '#0f172a' }), gateText);

  const trips = Object.values(h.trips).reduce((a, b) => a + b, 0) + h.departures;
  const done = Object.values(h.bays).reduce((a, b) => a + b, 0);
  const bays = Object.entries(h.bays).map(([ch, k]) => t('harbor.bay', { n: Number(ch), k })).join(', ');
  const svg = s('svg', {
    viewBox: opts.crop ? '440 140 660 260' : '0 0 1100 400', class: 'block w-full', role: 'img',
    'aria-label': t('harbor.label', { bays: bays || t('harbor.empty') }),
  },
    s('defs', {},
      grad('sky', [[0, '#7dd3fc'], [0.6, '#e0f2fe'], [1, '#fef3c7']]),
      grad('sea', [[0, '#0ea5e9'], [1, '#0c4a6e']]),
      grad('mtn', [[0, '#166534'], [1, '#14532d']]),
      grad('mtn2', [[0, '#4d7c0f', 0.75], [1, '#365314', 0.75]]),
      grad('quay', [[0, '#cbd5e1'], [1, '#94a3b8']]),
      grad('hull', [[0, '#1e3a8a'], [1, '#172554']]),
      grad('shed', [[0, '#e2e8f0'], [1, '#cbd5e1']]),
      s('pattern', { id: id('ripple'), width: 120, height: 14, patternUnits: 'userSpaceOnUse' },
        s('path', { d: 'M0 7 Q15 0 30 7 T60 7 T90 7 T120 7', fill: 'none', stroke: '#e0f2fe', 'stroke-opacity': 0.5, 'stroke-width': 2 })),
      s('pattern', { id: id('shutter'), width: 8, height: 5, patternUnits: 'userSpaceOnUse' },
        s('rect', { width: 8, height: 5, fill: '#94a3b8' }), s('rect', { y: 4, width: 8, height: 1, fill: '#64748b' }))),
    // sky, sun, Son Tra peninsula (two ridges), lighthouse
    s('rect', { width: 1100, height: 400, fill: url('sky') }),
    s('circle', { cx: 930, cy: 62, r: 30, fill: '#fde68a', opacity: 0.9 }),
    s('path', { d: 'M0 210 L80 170 L170 150 L250 120 L330 95 L410 110 L470 92 L540 128 L600 150 L680 172 L760 190 L760 230 L0 230 Z', fill: url('mtn2') }),
    s('path', { d: 'M0 220 L60 190 L140 178 L220 150 L300 140 L360 152 L430 136 L500 160 L560 185 L620 205 L620 236 L0 236 Z', fill: url('mtn') }),
    text(300, 132, 15, '#f8fafc', t('harbor.sontra'), 'middle'),
    s('g', { 'aria-hidden': 'true' },
      s('rect', { x: 596, y: 178, width: 8, height: 26, fill: '#f8fafc' }),
      s('rect', { x: 596, y: 186, width: 8, height: 5, fill: '#dc2626' }),
      s('circle', { class: amb('cq-beacon'), cx: 600, cy: 176, r: 5, fill: '#fde047' })),
    // sea and drifting ripples
    s('rect', { y: 230, width: 1100, height: 170, fill: url('sea') }),
    s('g', { class: amb('cq-wave'), 'aria-hidden': 'true' }, s('rect', { x: 0, y: 246, width: 1340, height: 14, fill: url('ripple') })),
    s('g', { class: amb('cq-wave2'), 'aria-hidden': 'true' }, s('rect', { x: -120, y: 300, width: 1340, height: 14, fill: url('ripple') })),
    s('g', { class: amb('cq-wave'), 'aria-hidden': 'true' }, s('rect', { x: 0, y: 362, width: 1340, height: 14, fill: url('ripple') })),
    // a small feeder leaving for the open sea (Home only)
    opts.ambient ? s('g', { class: 'cq-ship-out', 'aria-hidden': 'true' },
      s('path', { d: 'M600 300 L700 300 L692 316 L608 316 Z', fill: '#334155' }),
      s('rect', { x: 612, y: 288, width: 18, height: 12, fill: '#d97706' }),
      s('rect', { x: 632, y: 288, width: 18, height: 12, fill: '#0284c7' }),
      s('rect', { x: 652, y: 288, width: 18, height: 12, fill: '#7c3aed' }),
      s('rect', { x: 676, y: 280, width: 16, height: 20, fill: '#f1f5f9' })) : null,
    // land: quay apron, road, verge, labels
    s('path', { d: 'M700 236 H1100 V400 H660 L700 312 Z', fill: url('quay') }),
    s('rect', { x: 700, y: 236, width: 400, height: 5, fill: '#475569' }),
    s('rect', { x: 700, y: 241, width: 4, height: 71, fill: '#475569' }),
    s('rect', { x: 684, y: 334, width: 416, height: 26, fill: '#475569' }),
    s('line', { x1: 690, y1: 347, x2: 1010, y2: 347, stroke: '#f8fafc', 'stroke-width': 2, 'stroke-dasharray': '12 10' }),
    s('rect', { x: 672, y: 360, width: 428, height: 40, fill: '#a3b18a', opacity: 0.55 }),
    text(700, 382, 12, '#1e293b', t('harbor.yardLabel')),
    text(1094, 395, 13, '#0f172a', t('harbor.port'), 'end'),
    yard,
    drop,
    ship,
    // STS crane: back-stays, tower, legs, bracing, boom, cab; trolley + spreader move
    s('g', { 'aria-hidden': 'true' },
      s('path', { d: 'M740 70 L470 112 M740 70 L1015 112', stroke: '#9a3412', 'stroke-width': 2 }),
      s('rect', { x: 736, y: 62, width: 8, height: 50, fill: '#ea580c' }),
      s('rect', { x: 712, y: 118, width: 9, height: 194, fill: '#f97316' }),
      s('rect', { x: 762, y: 118, width: 9, height: 194, fill: '#f97316' }),
      s('path', { d: 'M716 160 L766 220 M766 160 L716 220 M716 230 L766 290 M766 230 L716 290', stroke: '#ea580c', 'stroke-width': 3 }),
      s('rect', { x: 470, y: 108, width: 545, height: 10, fill: '#ea580c' }),
      s('rect', { x: 704, y: 92, width: 74, height: 16, fill: '#f97316' }),
      s('rect', { x: 712, y: 96, width: 14, height: 7, fill: '#7dd3fc' }),
      s('g', { class: amb('cq-trolley') }, trolley)),
    // CFS warehouse interior, the truck (drawn between interior and facade so it disappears inside), facade + shutter
    s('rect', { x: 1012, y: 282, width: 88, height: 78, fill: '#334155' }),
    s('rect', { x: 1026, y: 316, width: 62, height: 44, fill: '#0f172a' }),
    truck,
    s('path', { d: 'M1012 282 H1100 V360 H1088 V316 H1026 V360 H1012 Z', fill: url('shed') }),
    s('path', { d: 'M1006 284 L1056 262 L1100 270 V284 Z', fill: '#64748b' }),
    shutter,
    text(1057, 306, 12, '#0f172a', t('harbor.cfs'), 'middle'),
    // customs gate
    s('rect', { x: 902, y: 362, width: 38, height: 26, rx: 2, fill: '#f8fafc', stroke: '#334155' }),
    s('rect', { x: 902, y: 356, width: 38, height: 7, fill: '#1d4ed8' }),
    text(921, 380, 9, '#1e3a8a', t('harbor.customs'), 'middle'),
    s('rect', { x: 902, y: 330, width: 6, height: 30, fill: '#334155' }),
    barrier,
    gateTag,
    // status callout (outside the stage's crop)
    s('rect', { x: 24, y: 312, width: 360, height: 64, rx: 10, fill: '#0f172a', 'fill-opacity': 0.72 }),
    s('text', { x: 40, y: 338, 'font-family': FONT, 'font-size': 14, 'font-weight': 600, fill: '#f8fafc' }, t('harbor.callA', { done, trips })),
    s('text', { x: 40, y: 360, 'font-family': FONT, 'font-size': 14, 'font-weight': 600, fill: '#bae6fd' }, t('harbor.callB', { passed: h.passed.size, n: opts.current })));

  const parts: HarborParts = { svg, yard, drop, ship, trolley, cable, spreader, carry, truck, truckBox, barrier, shutter, gateTag, gateText };
  drawYard(parts, h, opts.fresh);
  return parts;
}
```
(Chú thích `//` nằm giữa danh sách đối số là chú thích TS, không phải phần tử. Các phần tử `null` bị `s()` bỏ qua.)

- [ ] **Step 3: Viết `src/ui/routeMap.ts`**

```ts
import { t } from '../i18n';
import { ROUTES, type Harbor } from '../scene';
import { chapterColor } from '../theme';
import { s } from './svg';

const FONT = 'system-ui, sans-serif';
/** Stylised land masses (mockup v4): Europe, Asia, Australia, Americas. Not a geographic map. */
const LAND = [
  'M40 60 Q120 40 210 70 Q260 90 250 140 Q200 170 150 150 Q90 140 60 110 Z',
  'M330 40 Q460 20 600 50 Q660 70 650 110 Q610 150 560 140 Q520 170 470 160 Q420 140 380 120 Q330 90 330 40 Z',
  'M600 170 Q660 160 700 190 Q690 225 640 230 Q600 215 600 170 Z',
  'M760 60 Q860 40 930 70 Q940 120 900 140 Q840 150 790 120 Z',
];
/** AA on the sea (sky-100 / slate-800) and on land (slate-300 / slate-700) in both themes. */
const OPEN_TEXT = 'fill-slate-900 dark:fill-slate-100';
const LOCKED_TEXT = 'fill-slate-600 dark:fill-slate-300';
const LOCKED_LINE = 'stroke-slate-400 dark:stroke-slate-500';
const LOCKED_PIN = 'fill-slate-400 dark:fill-slate-500';

export interface MapParts {
  svg: SVGSVGElement;
  ship: SVGGElement;
  wake: SVGPathElement;
  routes: Record<string, SVGPathElement>;
  pins: Record<string, SVGCircleElement>;
  labels: Record<string, SVGTextElement>;
}

/** Lanes, pins, trip counts and the accessible description from `h`. A promotion repaints after its ship arrives. */
export function paintRoutes(p: MapParts, h: Harbor): void {
  const items: string[] = [];
  for (const r of ROUTES) {
    const open = h.open.has(r.port);
    const color = chapterColor(Math.max(1, r.opens));
    const n = h.trips[r.port] ?? 0;
    const trips = n ? t('routes.trips', { n }) : '';
    p.routes[r.port].setAttribute('class', open ? color.stroke : LOCKED_LINE);
    if (open) p.routes[r.port].removeAttribute('stroke-dasharray');
    else p.routes[r.port].setAttribute('stroke-dasharray', '6 6');
    p.pins[r.port].setAttribute('class', open ? color.fill : LOCKED_PIN);
    p.labels[r.port].setAttribute('class', open ? OPEN_TEXT : LOCKED_TEXT);
    p.labels[r.port].textContent = (open ? '' : '🔒 ') + r.name + (trips ? ` · ${trips}` : '');
    items.push(t(open ? 'routes.open' : 'routes.locked', { name: r.name }) + (trips ? ` (${trips})` : ''));
  }
  p.svg.setAttribute('aria-label', t('routes.label', { lanes: items.join('; ') }));
}

/** Lanes radiating from Tien Sa (L26, mockup v5 coordinates, viewBox 980×260). */
export function routeMap(h: Harbor): MapParts {
  const routes: Record<string, SVGPathElement> = {};
  const pins: Record<string, SVGCircleElement> = {};
  const labels: Record<string, SVGTextElement> = {};
  for (const r of ROUTES) {
    routes[r.port] = s('path', { d: r.d, fill: 'none', 'stroke-width': 3, 'stroke-linecap': 'round' });
    pins[r.port] = s('circle', { cx: r.x, cy: r.y, r: 6 });
    labels[r.port] = s('text', { x: r.lx, y: r.ly });
  }
  const wake = s('path', { fill: 'none', 'stroke-width': 5, 'stroke-linecap': 'round', opacity: 0, 'aria-hidden': 'true' });
  const ship = s('g', { opacity: 0, 'aria-hidden': 'true' },
    s('path', { d: 'M-11 -2 L11 -2 L8 5 L-8 5 Z', fill: '#1e3a8a' }),
    s('rect', { x: -7, y: -7, width: 8, height: 5, fill: '#d97706' }),
    s('rect', { x: 2, y: -9, width: 5, height: 7, fill: '#f8fafc', stroke: '#1e3a8a', 'stroke-width': 0.8 }));
  const svg = s('svg', { viewBox: '0 0 980 260', class: 'block w-full', role: 'img' },
    s('rect', { width: 980, height: 260, rx: 12, class: 'fill-sky-100 dark:fill-slate-800' }),
    ...LAND.map((d) => s('path', { d, class: 'fill-slate-300 dark:fill-slate-700' })),
    s('g', {}, ...Object.values(routes)),
    wake,
    s('g', { 'font-family': FONT, 'font-size': 14, 'font-weight': 600 }, ...Object.values(pins), ...Object.values(labels)),
    ship,
    s('circle', { cx: 560, cy: 132, r: 9, fill: '#dc2626', stroke: '#ffffff', 'stroke-width': 3 }),
    s('text', { x: 575, y: 150, 'font-family': FONT, 'font-size': 14, 'font-weight': 700, class: OPEN_TEXT }, t('routes.hub')));
  const parts: MapParts = { svg, ship, wake, routes, pins, labels };
  paintRoutes(parts, h);
  return parts;
}
```

- [ ] **Step 4: Vòng lặp nền trong `src/style.css`**

Ngay **trước** khối `@media (prefers-reduced-motion: reduce) { * { … } }` thêm:
```css
/* ---- Tien Sa scene ambient loops (L26). harbor.ts adds these classes on Home only; off under reduced motion. ---- */
@media (prefers-reduced-motion: no-preference) {
  .cq-wave { animation: cq-wave 6s linear infinite; }
  .cq-wave2 { animation: cq-wave 9s linear infinite reverse; }
  .cq-smoke { animation: cq-smoke 3s ease-out infinite; transform-box: fill-box; transform-origin: center; }
  .cq-smoke2 { animation-delay: 1.5s; }
  .cq-beacon { animation: cq-blink 2.4s infinite; }
  .cq-ship-out { animation: cq-ship-out 16s linear infinite; transform-box: fill-box; transform-origin: center; }
  .cq-trolley { animation: cq-trolley 7s ease-in-out infinite; }
  .cq-hoist { animation: cq-hoist 7s ease-in-out infinite; }
}
@keyframes cq-wave { to { transform: translateX(-120px); } }
@keyframes cq-smoke { 0% { opacity: 0.6; transform: translate(0, 0) scale(0.6); } 100% { opacity: 0; transform: translate(-30px, -40px) scale(1.6); } }
@keyframes cq-blink { 0%, 60% { opacity: 1; } 61%, 100% { opacity: 0.15; } }
@keyframes cq-ship-out { 0% { transform: translate(0, 0) scale(1); opacity: 1; } 85% { opacity: 1; } 100% { transform: translate(-420px, -14px) scale(0.6); opacity: 0; } }
@keyframes cq-trolley { 0%, 15% { transform: translateX(0); } 45%, 60% { transform: translateX(250px); } 90%, 100% { transform: translateX(0); } }
@keyframes cq-hoist { 0%, 15% { transform: translateY(0); } 25%, 35% { transform: translateY(50px); } 45%, 60% { transform: translateY(0); } 70%, 80% { transform: translateY(60px); } 90%, 100% { transform: translateY(0); } }
```
Khi reduced-motion, khối `@media (prefers-reduced-motion: reduce)` sẵn có cũng tắt mọi `animation`. Khói đứng yên ở `opacity: 1`, sóng đứng yên.

- [ ] **Step 5: Hai section trên Trang chủ (`src/ui/homeView.ts`)**

5a. Import: thêm
```ts
import { derive } from '../scene';
import { harborScene } from './harbor';
import { routeMap } from './routeMap';
```
5b. Ngay trên dòng `registerHomeSection({ id: 'continue', …` thêm:
```ts
/** Completed ids when the player last left Home (session memory only, completion-animations §4). */
let seenAtLeave: Set<string> | undefined;
/** main.ts calls this whenever another route is shown. */
export function leftHome(): void {
  seenAtLeave = done();
}
/** Chapters with a task finished since the last visit: their newest container gets a bright edge and "New". */
function freshChapters(): Set<number> {
  const seen = seenAtLeave;
  const d = done();
  return new Set(seen ? app.tickets.filter((x) => d.has(x.id) && !seen.has(x.id)).map((x) => x.chapter) : []);
}

/** Tien Sa (L26): the yard holds one container per completed ticket, coloured by chapter. Home never replays animations. */
function harborSection(m: HomeModel): HTMLElement {
  const scene = harborScene(derive(app.tickets, done()), { ambient: true, current: m.chapter, fresh: freshChapters() });
  return h('section', { class: cx(CARD, 'overflow-hidden'), 'aria-labelledby': 'harbor-title' },
    h('h2', { id: 'harbor-title', class: 'sr-only' }, t('harbor.title')),
    scene.svg);
}

function routesSection(): HTMLElement {
  return h('section', { class: cx(CARD, 'p-5'), 'aria-labelledby': 'routes-title' },
    h('div', { class: 'mb-2 flex flex-wrap items-end justify-between gap-2' },
      h('h2', { id: 'routes-title', class: 'm-0 text-lg font-bold' }, t('routes.title')),
      h('p', { class: 'm-0 text-sm text-muted' }, t('routes.subtitle'))),
    routeMap(derive(app.tickets, done())).svg);
}
```
5c. Ngay sau dòng `registerHomeSection({ id: 'modes', … });` thêm:
```ts
registerHomeSection({ id: 'harbor', order: 5, span: 'full', render: harborSection });
registerHomeSection({ id: 'routes', order: 25, span: 'full', render: routesSection });
```

- [ ] **Step 6: Đánh dấu lúc rời Trang chủ (`src/main.ts`)**

- Thay `import { renderHome } from './ui/homeView';` bằng `import { leftHome, renderHome } from './ui/homeView';`.
- Trong `showRoute`, ngay **trước** dòng `  rerender(); // nav aria-current, Home numbers` thêm:
```ts
  if (r !== 'home') leftHome(); // Home marks containers added after this moment as "New"
```

- [ ] **Step 7: Kiểm kiểu, test, build và class đã được sinh**

```bash
npx tsc --noEmit
npx vitest run
npx vite build
for c in 'fill-sky-600' 'fill-pink-600' 'stroke-violet-600' 'dark\:fill-slate-800' 'dark\:fill-slate-700' 'stroke-slate-400' 'cq-ship-out' '@keyframes cq-wave'; do printf '%s ' "$c"; grep -cF "$c" dist/assets/index-*.css; done
grep -rnE "\.innerHTML\s*=|insertAdjacentHTML|<animate" src; echo "exit=$?"
```
Expected:
- tất cả xanh;
- vòng `for` in `1` cho mỗi dòng, gồm các class tô màu SVG trong `theme.ts`/`routeMap.ts`;
- lệnh cuối `exit=1`.

- [ ] **Step 8: Checklist Edge (orchestrator)**

1. Trang chủ mở đầu bằng cảnh Tiên Sa, chữ "Bán đảo Sơn Trà" và "Cảng Tiên Sa · VNDAD".
   - Sóng trôi, khói tàu bốc lên, đèn hải đăng nháy.
   - Tàu nhỏ rời cảng ra phía Sơn Trà rồi lặp lại.
   - Xe con của cẩu chạy ra/vào, khung cẩu nâng hạ một container màu chương đang làm.
   - Ô chữ góc trái: "Đã xong n việc · m chuyến tàu rời Tiên Sa" / "Đã qua p chương · đang làm chương c".
2. Save trống: bãi trống. Làm ch1-01, ch1-02 rồi về Trang chủ: cột chương 1 có 2 container xanh sky; container trên cùng viền trắng + "Mới". Sang `#/play` rồi quay lại thì "Mới" mất.
3. Bản đồ tuyến:
   - Tiên Sa chấm đỏ; Shanghai và Laem Chabang nét liền xanh sky; các tuyến khác nét đứt xám + 🔒;
   - xong ch1-05: Singapore mở (nét liền), "Rotterdam · 1 chuyến" (vẫn khóa);
   - xong ch2: Rotterdam nét liền tím, "Rotterdam · 2 chuyến".
4. DevTools → Rendering → `prefers-reduced-motion: reduce`: mọi chuyển động nền dừng, cảnh vẫn đủ chi tiết.
5. Tối: bản đồ nền slate tối, chữ cảng sáng, đạt AA (Accessibility pane). Cảnh cảng giữ màu ban ngày, chữ trên cảnh có nền riêng.
6. Accessibility tree: `img` "Cảng Tiên Sa, Đà Nẵng. Bãi container: chương 1: 2 container…"; bản đồ đọc từng tuyến "đã mở/chưa mở".
7. Ở `#/play` chạy query nhiều lần, rồi về Trang chủ: hoạt cảnh nền không giật. `rerender()` không dựng lại Trang chủ khi nó đang ẩn.

- [ ] **Step 9: Commit**

```bash
git add src/ui/harbor.ts src/ui/routeMap.ts src/ui/homeView.ts src/main.ts src/style.css src/i18n/vi.ts src/i18n/en.ts
git commit -m "feat(ui): animated Tien Sa harbour scene and route map from Tien Sa on Home"
```

---

### Task 17: Card "Tiếp tục" dạng tin nhắn và Bảng điều hành KPI

Phần (c), theo `home-v3.html`, L18 ★5, L23.

**Card Tiếp tục:**
- dòng "Tin nhắn mới · Chương n · …", tiêu đề việc;
- chân dung + tên + vai trò người gửi;
- bong bóng chứa đoạn đầu của thân đề. Thân đề đã là câu hỏi nghiệp vụ từ Task 14;
- thanh tiến độ, nút "Mở việc này" và "Hộp thư".

**Bảng điều hành công ty** (9 ô, `content/kpis.yml`):
- Mỗi ô **mở khi xong đúng việc tính ra nó**, nên không lộ đáp án trước. Số **tính lúc chạy** từ Solution của việc đó: không ghi cứng, seed có thể đổi.
- Ô cuối "Biên lợi nhuận quý 3/2026" hiện `???` và khóa tới chương 12.
- Chữ dễ đọc (L23): nhãn `text-sm font-medium`, số `text-3xl font-bold tabular-nums` màu chữ thường, chú thích `text-sm text-muted`. Thanh ngang màu xám trung tính; màu chỉ ở badge.

**Files:**
- Create: `content/kpis.yml`
- Modify: `src/home.ts`, `src/ui/homeView.ts`, `src/i18n/vi.ts`, `src/i18n/en.ts`
- Test: `tests/home.test.ts`, `tests/content.test.ts`

**Interfaces:**
- Produces (`src/home.ts`):
  - `type KpiKind = 'number' | 'rowcount' | 'bar'`, `interface Kpi { id; ticket; step; col; kind; label: Bilingual }`, `parseKpis(src, origin?): Kpi[]`, `KPIS`
  - `interface KpiTile { kpi: Kpi; ticket?: Ticket; open: boolean }`, `kpiTiles(kpis, tickets, completed): KpiTile[]`, `chapterOfId(id): number`
  - `type KpiValue = { text: string } | { bars: { label: string; value: number; text: string }[] }`, `kpiValue(k: Kpi, r: QueryResult, lang: Lang): KpiValue`
- Home: section `kpi` (35, full); card `continue` viết lại.

- [ ] **Step 1: Viết test (FAIL)**

1a. `tests/home.test.ts`: dòng import từ `'../src/home'` thành:
```ts
import { chapterOfId, homeModel, KPIS, kpiTiles, kpiValue, LEVELS, parseKpis, type Kpi } from '../src/home';
```
và thêm cuối file:
```ts
describe('Bảng điều hành KPI (L18 ★5, L23)', () => {
  const res = (rows: unknown[][]) => ({ columns: (rows[0] ?? []).map((_, i) => `c${i}`), types: [], rows });
  const kpi = (kind: Kpi['kind'], col = 0): Kpi => ({ id: 'x', ticket: 'ch2-01', step: 0, col, kind, label: { vi: 'a', en: 'a' } });

  it('ô chỉ mở khi xong đúng việc tính ra nó; ô của chương chưa có nội dung luôn khóa', () => {
    const tiles = kpiTiles(KPIS, tickets, new Set([...ids(1), ...ids(2)]));
    const by = (id: string) => tiles.find((x) => x.kpi.id === id)!;
    expect(by('shipments2025')).toMatchObject({ open: true, ticket: { id: 'ch2-01' } });
    expect(by('teuByCarrier')).toMatchObject({ open: false, ticket: { id: 'ch3-02' } });
    expect(by('q3margin')).toMatchObject({ open: false, ticket: undefined });
    expect(chapterOfId('ch12-06')).toBe(12);
    expect(KPIS[KPIS.length - 1].id).toBe('q3margin');
    expect(new Set(KPIS.map((k) => k.id)).size).toBe(KPIS.length);
  });

  it('mọi ô trỏ tới ticket có thật, hoặc tới chương chưa có ticket nào', () => {
    const chapters = new Set(tickets.map((t) => t.chapter));
    const bad = KPIS.filter((k) => !tickets.some((t) => t.id === k.ticket) && chapters.has(chapterOfId(k.ticket)));
    expect(bad).toEqual([]);
  });

  it('kpiValue: số theo locale, đếm dòng, 5 thanh lớn nhất', () => {
    expect(kpiValue(kpi('number'), res([[9694, '123.5']]), 'vi')).toEqual({ text: '9.694' });
    expect(kpiValue(kpi('number', 1), res([[9694, '1234567.5']]), 'en')).toEqual({ text: '1,234,567.5' });
    expect(kpiValue(kpi('rowcount'), res([[1], [2], [3]]), 'en')).toEqual({ text: '3' });
    const bars = kpiValue(kpi('bar'), res([['SEA', 'EXPORT', 5], ['AIR', 'IMPORT', 9], ['A', 'B', 1], ['C', 'D', 2], ['E', 'F', 3], ['G', 'H', 4]]), 'en');
    expect(bars).toEqual({ bars: [
      { label: 'AIR · IMPORT', value: 9, text: '9' }, { label: 'SEA · EXPORT', value: 5, text: '5' }, { label: 'G · H', value: 4, text: '4' },
      { label: 'E · F', value: 3, text: '3' }, { label: 'C · D', value: 2, text: '2' },
    ] });
  });

  it('parseKpis báo lỗi cấu trúc', () => {
    expect(parseKpis('- { id: a, ticket: ch1-01, kind: rowcount, label: { vi: "a", en: "b" } }')[0]).toMatchObject({ step: 0, col: 0 });
    expect(() => parseKpis('- { id: a, ticket: ch1-01, kind: pie, label: { vi: "a", en: "b" } }')).toThrow(/kind/);
    expect(() => parseKpis('- { id: a, ticket: ch1-01, kind: bar }')).toThrow(/label/);
    expect(() => parseKpis('id: a')).toThrow(/danh sách/);
  });
});
```
1b. `tests/content.test.ts`: thêm import `import { KPIS } from '../src/home';` và cuối file:
```ts
describe('KPI (content/kpis.yml)', () => {
  const live = KPIS.filter((k) => tickets.some((t) => t.id === k.ticket));
  it.each(live)('$id: Solution của việc nguồn ra đúng dạng ô', async (k) => {
    const t = tickets.find((x) => x.id === k.ticket)!;
    expect(k.step).toBeLessThan(t.steps.length);
    const r = await (await runner())(t.steps[k.step].solution);
    if (k.kind === 'number') {
      expect(r.rows).toHaveLength(1);
      expect(Number.isFinite(Number(r.rows[0][k.col]))).toBe(true);
    }
    if (k.kind === 'rowcount') expect(r.rows.length).toBeGreaterThan(0);
    if (k.kind === 'bar') {
      expect(r.columns.length).toBeGreaterThanOrEqual(2);
      expect(r.rows.every((row) => Number.isFinite(Number(row[row.length - 1])))).toBe(true);
    }
  });
});
```

Run: `npx vitest run tests/home.test.ts`
Expected: FAIL (`KPIS` chưa được export).

- [ ] **Step 2: Viết `content/kpis.yml`**

```yaml
# Bảng điều hành công ty (L18 ★5, L23). Mỗi ô mở khi người chơi xong `ticket`; số tính lúc chạy từ Solution
# của ticket đó (bước `step`, mặc định 0). Không ghi cứng số (seed có thể đổi); không lộ đáp án trước khi xong.
# kind: number = ô số ở cột `col` (mặc định 0) của dòng đầu · rowcount = số dòng · bar = các cột trước là nhãn,
# cột cuối là số (vẽ 5 thanh lớn nhất). Ô trỏ tới ticket chưa viết (ch12-06) khóa tới khi chương đó có nội dung.
- { id: shipments2025, ticket: ch2-01, kind: number, col: 0, label: { vi: "Lô hàng năm 2025 (không tính lô hủy)", en: "Shipments in 2025 (cancelled excluded)" } }
- { id: weight2025, ticket: ch2-01, kind: number, col: 1, label: { vi: "Tổng trọng lượng năm 2025 (kg)", en: "Total weight in 2025 (kg)" } }
- { id: inTransit, ticket: ch2-04, kind: number, label: { vi: "Lô đang trên đường", en: "Shipments in transit" } }
- { id: keyAccounts, ticket: ch2-03, kind: rowcount, label: { vi: "Khách chủ lực năm 2025 (hơn 150 lô)", en: "Key accounts of 2025 (over 150 shipments)" } }
- { id: modeMix, ticket: ch2-02, kind: bar, label: { vi: "Số lô 2025 theo phương thức và chiều hàng", en: "2025 shipments by mode and direction" } }
- { id: teuByCarrier, ticket: ch3-02, kind: bar, label: { vi: "TEU quý 3/2026 theo hãng tàu", en: "Q3 2026 TEU by carrier" } }
- { id: quietCustomers, ticket: ch3-03, kind: rowcount, label: { vi: "Khách không gửi hàng từ 01/03/2026", en: "Customers with no booking since 1 March 2026" } }
- { id: topCustomers, ticket: ch3-05, step: 0, kind: bar, label: { vi: "Năm khách lớn nhất năm 2025 (TEU)", en: "Top five customers of 2025 (TEU)" } }
- { id: q3margin, ticket: ch12-06, kind: number, label: { vi: "Biên lợi nhuận quý 3/2026", en: "Q3 2026 gross margin" } }
```

- [ ] **Step 3: KPI trong `src/home.ts`**

3a. Thay dòng import đầu file `import { currentChapter, nextTicket, type Chapter, type Skill } from './progress';` bằng:
```ts
import { parse as parseYaml } from 'yaml';
import kpiSource from '../content/kpis.yml?raw';
import type { QueryResult } from './db/run';
import { currentChapter, nextTicket, type Bilingual, type Chapter, type Skill } from './progress';
```
và dòng `import type { Ticket } from './tickets';` thành `import type { Lang, Ticket } from './tickets';`.

3b. Thêm cuối file:
```ts
export type KpiKind = 'number' | 'rowcount' | 'bar';
/** A company dashboard tile (L18 ★5): opens when `ticket` is completed; its value comes from that ticket's Solution (step `step`). */
export interface Kpi { id: string; ticket: string; step: number; col: number; kind: KpiKind; label: Bilingual }
const KPI_KINDS: KpiKind[] = ['number', 'rowcount', 'bar'];

export function parseKpis(src: string, origin = 'kpis.yml'): Kpi[] {
  const data = parseYaml(src) as unknown;
  if (!Array.isArray(data)) throw new Error(`${origin}: cần một danh sách`);
  return data.map((raw: unknown, i) => {
    const k = (raw ?? {}) as Record<string, unknown>;
    const label = (k.label ?? {}) as Record<string, unknown>;
    if (typeof k.id !== 'string' || typeof k.ticket !== 'string' || !KPI_KINDS.includes(k.kind as KpiKind)
      || typeof label.vi !== 'string' || typeof label.en !== 'string') {
      throw new Error(`${origin}: mục ${i} cần id, ticket, kind (${KPI_KINDS.join(' | ')}) và label { vi, en }`);
    }
    return {
      id: k.id, ticket: k.ticket, kind: k.kind as KpiKind, label: { vi: label.vi, en: label.en },
      step: typeof k.step === 'number' ? k.step : 0, col: typeof k.col === 'number' ? k.col : 0,
    };
  });
}
export const KPIS: Kpi[] = parseKpis(kpiSource);

/** `ticket` undefined: its chapter has no content yet (the Q3 margin waits for chapter 12). Never opens before completion. */
export interface KpiTile { kpi: Kpi; ticket?: Ticket; open: boolean }
export const kpiTiles = (kpis: Kpi[], tickets: Ticket[], completed: Set<string>): KpiTile[] =>
  kpis.map((kpi) => {
    const ticket = tickets.find((x) => x.id === kpi.ticket);
    return { kpi, ticket, open: !!ticket && completed.has(ticket.id) };
  });

/** "ch12-06" → 12: chapter of a tile whose ticket is not written yet. */
export const chapterOfId = (id: string): number => Number(/^ch(\d+)-/.exec(id)?.[1] ?? 0);

export type KpiValue = { text: string } | { bars: { label: string; value: number; text: string }[] };
const BARS = 5;
/** PGlite returns numeric as strings and bigint counts as bigint: Number() covers both. */
export function kpiValue(k: Kpi, r: QueryResult, lang: Lang): KpiValue {
  const fmt = new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'en-US', { maximumFractionDigits: 2 });
  if (k.kind === 'rowcount') return { text: fmt.format(r.rows.length) };
  if (k.kind === 'number') return { text: fmt.format(Number(r.rows[0]?.[k.col] ?? 0)) };
  const bars = r.rows
    .map((row) => ({ label: row.slice(0, -1).map(String).join(' · '), value: Number(row[row.length - 1]) }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
    .slice(0, BARS);
  return { bars: bars.map((b) => ({ ...b, text: fmt.format(b.value) })) };
}
```

Run: `npx vitest run tests/home.test.ts tests/content.test.ts && npx tsc --noEmit`
Expected: PASS; `tsc` không lỗi.

- [ ] **Step 4: i18n**

Trong `src/i18n/vi.ts`:
- thay `'home.kicker': 'Chương {n} · {title}',` bằng `'home.kicker': 'Tin nhắn mới · Chương {n} · {title}',`
- xóa hai dòng `'home.continue': …` và `'home.from': …`
- ngay sau dòng `'routes.label': …` thêm:
```ts
  'home.kpi': 'Bảng điều hành công ty',
  'home.kpiIntro': 'Mỗi chỉ số mở khi bạn hoàn thành đúng việc tính ra nó.',
  'home.kpiFrom': 'Từ việc "{title}"',
  'home.kpiLocked': '🔒 Chương {n} · mở khi xong việc "{title}" của {name}',
  'home.kpiLater': '🔒 Chương {n} · câu hỏi lớn của Ban giám đốc',
```
Trong `src/i18n/en.ts`:
- thay `'home.kicker': 'Chapter {n} · {title}',` bằng `'home.kicker': 'New message · Chapter {n} · {title}',`
- xóa hai dòng `'home.continue': …` và `'home.from': …`
- ngay sau dòng `'routes.label': …` thêm:
```ts
  'home.kpi': 'Company dashboard',
  'home.kpiIntro': 'Each figure unlocks when you complete the task that computes it.',
  'home.kpiFrom': 'From the task "{title}"',
  'home.kpiLocked': '🔒 Chapter {n} · opens when you finish "{title}" for {name}',
  'home.kpiLater': '🔒 Chapter {n} · the big question from the board',
```

- [ ] **Step 5: Card Tiếp tục và section KPI (`src/ui/homeView.ts`)**

5a. Import:
- dòng import từ `'../home'` thành `import { homeModel, KPIS, kpiTiles, kpiValue, chapterOfId, LEVELS, type ChapterCard, type HomeModel, type KpiTile, type KpiValue, type SkillCard } from '../home';`;
- thêm `import type { QueryResult } from '../db/run';`, `import { personOf } from '../people';`, `import { stepKey } from '../save';`, `import { avatar } from './avatar';`;
- dòng import từ `'../tickets'` thành `import { textOf, type Ticket } from '../tickets';`.

5b. Thay toàn bộ hàm `continueCard` bằng:
```ts
/** "New message" (home-v3, L18 ★1): the next task as the sender's chat bubble, first paragraph of the business question. */
function continueCard(m: HomeModel): HTMLElement {
  const lang = getLang();
  const label = t('home.progress', { done: m.done, total: m.total });
  const next = m.next;
  const x = next ? textOf(next, lang) : undefined;
  return h('section', { class: cx(CARD, 'flex h-full flex-col gap-4 p-6'), 'aria-labelledby': 'continue-title' },
    h('p', { class: 'm-0 text-sm font-semibold text-muted' }, t('home.kicker', { n: m.chapter, title: chapterTitle(m.chapter, lang) })),
    h('h2', { id: 'continue-title', class: 'm-0 text-xl font-bold' }, x ? x.title : t('inbox.empty')),
    next && x
      ? h('div', { class: 'flex gap-3' },
        avatar(next.from, 'lg'),
        h('div', { class: 'min-w-0 flex-1' },
          h('p', { class: 'm-0 text-[15px]' }, h('b', {}, next.from.name), ' · ', h('span', { class: 'text-muted' }, personOf(next.from.name)?.role[lang] ?? next.from.dept)),
          h('p', { class: 'mt-1 mb-0 rounded-2xl rounded-tl-sm bg-code px-4 py-3 text-[15px] leading-relaxed' },
            x.body.split(/\n\s*\n/)[0].replace(/\s*\n\s*/g, ' '))))
      : null,
    h('div', { class: 'flex items-center gap-3' },
      progress(percent(m.done, m.total), label, 'h-2.5 flex-1 bg-code', 'bg-blue-600 dark:bg-blue-400'),
      h('span', { class: 'text-sm tabular-nums text-muted' }, label)),
    h('div', { class: 'flex flex-wrap gap-2' },
      next ? h('button', { type: 'button', class: cx(BTN_GO, 'px-4 py-2'), onclick: () => resume(next.id) }, t('home.resume')) : null,
      h('button', { type: 'button', class: 'px-4 py-2 font-semibold', onclick: openInbox }, t('top.inbox'))));
}
```
5c. Ngay trên dòng `registerHomeSection({ id: 'continue', …` thêm:
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

/** L23: neutral text and bars, numbers in tabular figures; colour stays in small badges. */
function kpiView(v: KpiValue): HTMLElement {
  if ('text' in v) return h('p', { class: BIG }, v.text);
  const max = Math.max(1, ...v.bars.map((b) => b.value));
  return h('ul', { class: 'm-0 list-none space-y-1 p-0' }, ...v.bars.map((b) =>
    h('li', { class: 'grid grid-cols-[minmax(0,8rem)_1fr_auto] items-center gap-2 text-sm' },
      h('span', { class: 'truncate' }, b.label),
      h('span', { class: 'h-2.5 rounded bg-slate-500 dark:bg-slate-400', style: `width:${Math.round((b.value / max) * 100)}%`, 'aria-hidden': 'true' }),
      h('span', { class: 'tabular-nums' }, b.text))));
}

function kpiTile(tile: KpiTile): HTMLElement {
  const lang = getLang();
  const { kpi, ticket } = tile;
  const value = h('div', { class: 'mt-1 min-h-9' });
  if (tile.open && ticket) {
    value.append(h('p', { class: cx(BIG, 'text-muted') }, '…'));
    kpiResult(ticket, kpi.step).then(
      (r) => value.replaceChildren(kpiView(kpiValue(kpi, r, lang))),
      () => value.replaceChildren(h('p', { class: cx(BIG, 'text-muted') }, '—')));
  } else {
    value.append(h('p', { class: cx(BIG, 'text-muted') }, ticket ? '—' : '???'));
  }
  const foot = tile.open && ticket ? t('home.kpiFrom', { title: textOf(ticket, lang).title })
    : ticket ? t('home.kpiLocked', { n: ticket.chapter, title: textOf(ticket, lang).title, name: ticket.from.name })
      : t('home.kpiLater', { n: chapterOfId(kpi.ticket) });
  return h('div', { class: 'rounded-xl bg-panel p-4 ring-1 ring-line' },
    h('p', { class: 'm-0 text-sm font-medium' }, kpi.label[lang]),
    value,
    h('p', { class: 'mt-1 mb-0 text-sm text-muted' }, foot));
}

function kpiSection(): HTMLElement {
  return h('section', { 'aria-labelledby': 'kpi-title' },
    h('h2', { id: 'kpi-title', class: 'm-0 text-lg font-bold' }, t('home.kpi')),
    h('p', { class: 'mt-1 mb-3 text-[15px] text-muted' }, t('home.kpiIntro')),
    h('div', { class: 'grid gap-4 sm:grid-cols-2 lg:grid-cols-4' }, ...kpiTiles(KPIS, app.tickets, done()).map(kpiTile)));
}
```
5d. Ngay sau dòng `registerHomeSection({ id: 'routes', … });` thêm:
```ts
registerHomeSection({ id: 'kpi', order: 35, span: 'full', render: kpiSection });
```

- [ ] **Step 6: Kiểm kiểu, test, build**

```bash
npx tsc --noEmit
npx vitest run
npx vite build
for c in 'grid-cols-\[minmax\(0\,8rem\)_1fr_auto\]' 'min-h-9' 'dark\:bg-slate-400'; do printf '%s ' "$c"; grep -cF "$c" dist/assets/index-*.css; done
```
Expected: tất cả xanh; mỗi dòng của vòng `for` in `1`.

- [ ] **Step 7: Checklist Edge (orchestrator)**

1. Card Tiếp tục:
   - "Tin nhắn mới · Chương n · …";
   - tiêu đề việc;
   - chân dung 48px + tên + vai trò;
   - bong bóng xám với đoạn đầu của đề (câu hỏi nghiệp vụ, không tên cột);
   - thanh tiến độ xanh; "Mở việc này" mở đúng việc.
2. Thứ tự Trang chủ: cảnh Tiên Sa → (Tiếp tục | Lộ trình sự nghiệp) → bản đồ tuyến → 12 chương → bảng điều hành → kỹ năng.
3. Bảng điều hành, save trống: 9 ô.
   - Tám ô có "—" + "🔒 Chương n · mở khi xong việc "…" của …".
   - Ô cuối có "???" + "🔒 Chương 12 · câu hỏi lớn của Ban giám đốc".
   - Network/Console không có query KPI nào chạy.
4. Xong ch2-01: ô "Lô hàng năm 2025" hiện số (VI `9.694`, EN `9,694`; số thật lấy từ DB), chú thích "Từ việc "…"". Xong ch2-02: ô cơ cấu có thanh xám ngang + số.
5. L23: nhãn ≥ 14px; số lớn màu chữ thường (đen/trắng), không xanh/đỏ; tối: chữ sáng trên nền tối (Accessibility pane ≥ 4.5:1).
6. Tải lại trang khi DB còn đang tải: ô mở hiện "…" rồi ra số khi DB sẵn sàng.

- [ ] **Step 8: Commit**

```bash
git add content/kpis.yml src/home.ts src/ui/homeView.ts src/i18n/vi.ts src/i18n/en.ts tests/home.test.ts tests/content.test.ts
git commit -m "feat(ui): chat-style Continue card and readable company KPI dashboard unlocked by tickets"
```

---

### Task 18: 8 hoạt cảnh khi xong việc, màn thăng tiến kèm chức danh, aria-live

Phần (d), lớp hình ảnh, theo `completion-animations.md` (L29, L31 "Duyệt V5"), `completion-v5.html`. Khi một việc **xong lần đầu**, tức trong `complete()` ngay chỗ cộng XP, một dải hoạt cảnh hiện ở góc dưới phải khu làm việc và chạy đúng loại `sceneOf(ticket)`:

| `kind` | Hình | Cảnh / bản đồ / card |
|---|---|---|
| `ship` | tàu ở bến nhổ neo ra khơi; có `to` thì tàu nhỏ chạy trên tuyến, vệt tuyến sáng dần; container rơi vào bãi | cảnh cảng (+ bản đồ khi có `to`) |
| `yard` | xe con của cẩu STS chạy ra tàu, hạ khung cẩu, nhấc container màu chương, chạy vào bãi, hạ đúng cột chương | cảnh cảng |
| `customs` | tờ khai hiện góc phải, dấu "LUỒNG XANH/VÀNG/ĐỎ" đóng xuống; xe tới cổng, vàng/đỏ dừng kèm nhãn "Kiểm hồ sơ"/"Kiểm hóa"; barie nâng, xe qua | cảnh cảng + card |
| `truck` | xe chạy qua cổng, cửa cuốn kho CFS mở, xe vào kho, cửa đóng | cảnh cảng |
| `quote` | thẻ báo giá lật mặt sang "Khách đã chấp nhận ✓" | card |
| `ledger` | hóa đơn đóng dấu "Đã thu", 6 đồng xu bay vào sổ công nợ | card |
| `chat` | khung chat của khách: chấm "đang gõ", bong bóng cảm ơn, badge "Khách hài lòng" | card |
| `promotion` | container cuối của chương rơi vào bãi; tàu rời bến và chạy trên bản đồ, tuyến mới chuyển nét đứt sang nét liền; confetti; **thẻ thăng tiến** "Junior DA → Data Analyst" hoặc "Bước nghề mới · {bậc}" | cảnh cảng + bản đồ + thẻ |

Thời lượng lấy đúng `STEPS` (Task 15, test ≤ 3 s).
- **Bỏ qua:** nút "Bỏ qua (Esc)" hoặc phím Esc nhảy ngay tới trạng thái cuối, rồi nút thành "Đóng".
- **Không chặn:** dải có `pointer-events: none`, chỉ nút nhận chuột; không dời focus.
- **Nộp tiếp khi hoạt cảnh cũ chưa xong:** cái cũ nhảy tới cuối, cái mới chạy, không xếp hàng.
- **`prefers-reduced-motion: reduce`:** không chuyển động, không confetti. Dải hiện ngay ở trạng thái cuối và **ở lại tới khi Đóng hoặc lần nộp sau**. Không giảm chuyển động thì dải tự ẩn 4 s sau khi xong.
- **Câu báo** (bảng §6, VI/EN) ghi vào `<p id="announce" aria-live="polite">`, vùng này có sẵn và rỗng trong `index.html`. Ghi ngay lúc nộp đúng, không đợi hoạt cảnh; câu cũng hiện bằng chữ dưới hình.

**Files:**
- Create: `src/ui/stage.ts`
- Modify: `index.html`, `src/main.ts`, `src/i18n/vi.ts`, `src/i18n/en.ts`

**Interfaces:**
- Consumes: Task 15 (`sceneOf`, `derive`, `STEPS`, `GATE_WAIT`, `routeOpenedBy`, `ROUTES`), Task 16 (`harborScene`, `drawYard`, `bayBox`, `CRANE`, `MAX_TIERS`, `routeMap`, `paintRoutes`), Task 11 (`rankOf`), Task 12 (`avatar`, `s`)
- Produces (`src/ui/stage.ts`):
  - `initStage(): void` gắn nút + Esc;
  - `playCompletion(tk: Ticket, before: Set<string>, after: Set<string>): void`. `before`/`after` là tập id đã xong trước và sau lần này. Bãi, tuyến và chức danh trước/sau đều tính lại bằng `derive`/`rankOf`.

- [ ] **Step 1: Host cố định trong `index.html`**

Ngay **trước** dòng `<script type="module" src="/src/main.ts"></script>` thêm (nằm ngoài mọi vùng mà `rerender()`/`panel.refresh()` thay nội dung):
```html
    <div id="stage" class="pointer-events-none fixed inset-x-4 bottom-4 z-40 sm:left-auto sm:w-[560px]" hidden>
      <div class="overflow-hidden rounded-2xl bg-panel shadow-xl ring-1 ring-line">
        <div id="stage-art" class="relative" aria-hidden="true"></div>
        <div class="flex items-center gap-3 border-t border-line px-4 py-2">
          <p id="stage-text" class="m-0 flex-1 text-sm"></p>
          <button id="stage-skip" type="button" class="pointer-events-auto shrink-0 px-3 py-1 text-sm"></button>
        </div>
      </div>
    </div>
    <p id="announce" class="sr-only" aria-live="polite"></p>
```
Phần hình là `aria-hidden`: câu báo đã đọc qua `#announce`. `#stage-text` là bản chữ nhìn thấy của cùng câu đó, không đặt `aria-live` để khỏi đọc hai lần.

- [ ] **Step 2: i18n (bảng §6 + chữ trên card)**

Trong `src/i18n/vi.ts`, ngay sau dòng `'home.kpiLater': …` thêm:
```ts
  'anim.skip': 'Bỏ qua (Esc)',
  'anim.doneShip': 'Việc "{title}" xong: một tàu đã rời Tiên Sa đi {port}.',
  'anim.doneShipNoPort': 'Việc "{title}" xong: một tàu đã rời Tiên Sa.',
  'anim.doneYard': 'Việc "{title}" xong: thêm 1 container chương {n} vào bãi Tiên Sa ({k}/{total}).',
  'anim.doneCustoms': 'Việc "{title}" xong: tờ khai được phân luồng {lane}, xe đã qua cổng hải quan.',
  'anim.doneTruck': 'Việc "{title}" xong: xe đã giao hàng vào kho CFS.',
  'anim.doneQuote': 'Việc "{title}" xong: khách đã chấp nhận báo giá.',
  'anim.doneLedger': 'Việc "{title}" xong: hóa đơn đã thu, sổ công nợ đã cập nhật.',
  'anim.doneChat': 'Việc "{title}" xong: khách gửi lời cảm ơn.',
  'anim.donePromotion': 'Đạt đánh giá thăng tiến: bạn là {rank}. Mở tuyến {port}.',
  'anim.donePromotionNoRoute': 'Đạt đánh giá thăng tiến: bạn là {rank}.',
  'anim.alsoSailed': 'Tàu đã rời Tiên Sa đi {port}.',
  'anim.laneGreen': 'xanh',
  'anim.laneYellow': 'vàng',
  'anim.laneRed': 'đỏ',
  'anim.stamp': 'Luồng {lane}',
  'anim.gateYellow': 'Kiểm hồ sơ',
  'anim.gateRed': 'Kiểm hóa',
  'anim.declaration': 'Tờ khai hải quan',
  'anim.quoteCard': 'Báo giá',
  'anim.quoteWaiting': 'Chờ khách phản hồi',
  'anim.quoteAccepted': 'Khách đã chấp nhận ✓',
  'anim.invoice': 'Hóa đơn',
  'anim.paid': 'Đã thu',
  'anim.ledgerBook': 'Sổ công nợ đã cập nhật',
  'anim.customer': 'Khách hàng',
  'anim.thanks': 'Cảm ơn bạn, mình nhận được rồi. Rất đúng hẹn!',
  'anim.happy': 'Khách hài lòng',
  'anim.promoKicker': 'Chương {n} · Đánh giá thăng tiến · Đạt',
  'anim.promoStep': 'Bước nghề mới · {career}',
  'anim.promoRoute': 'Mở tuyến {port}.',
```
Trong `src/i18n/en.ts`, ngay sau dòng `'home.kpiLater': …` thêm:
```ts
  'anim.skip': 'Skip (Esc)',
  'anim.doneShip': '"{title}" done: a vessel has left Tien Sa for {port}.',
  'anim.doneShipNoPort': '"{title}" done: a vessel has left Tien Sa.',
  'anim.doneYard': '"{title}" done: 1 more chapter {n} container in the Tien Sa yard ({k}/{total}).',
  'anim.doneCustoms': '"{title}" done: declaration cleared on the {lane} lane, the truck is through the customs gate.',
  'anim.doneTruck': '"{title}" done: the truck has delivered into the CFS warehouse.',
  'anim.doneQuote': '"{title}" done: the customer accepted the quote.',
  'anim.doneLedger': '"{title}" done: invoice paid, the ledger is updated.',
  'anim.doneChat': '"{title}" done: the customer sent a thank-you.',
  'anim.donePromotion': 'Promotion review passed: you are now {rank}. New route: {port}.',
  'anim.donePromotionNoRoute': 'Promotion review passed: you are now {rank}.',
  'anim.alsoSailed': 'A vessel has left Tien Sa for {port}.',
  'anim.laneGreen': 'green',
  'anim.laneYellow': 'yellow',
  'anim.laneRed': 'red',
  'anim.stamp': '{lane} lane',
  'anim.gateYellow': 'Document check',
  'anim.gateRed': 'Physical inspection',
  'anim.declaration': 'Customs declaration',
  'anim.quoteCard': 'Quote',
  'anim.quoteWaiting': 'Waiting for the customer',
  'anim.quoteAccepted': 'Accepted by the customer ✓',
  'anim.invoice': 'Invoice',
  'anim.paid': 'Paid',
  'anim.ledgerBook': 'Ledger updated',
  'anim.customer': 'Customer',
  'anim.thanks': 'Thank you, got it. Right on time!',
  'anim.happy': 'Happy customer',
  'anim.promoKicker': 'Chapter {n} · Promotion review · Passed',
  'anim.promoStep': 'New career step · {career}',
  'anim.promoRoute': 'New route: {port}.',
```

Run: `npx tsc --noEmit && npx vitest run tests/i18n.test.ts`. Expected: PASS (placeholder khớp; không chuỗi nào VI = EN; không "boss").

- [ ] **Step 3: Viết `src/ui/stage.ts`**

```ts
import { getLang, t, type Key } from '../i18n';
import { rankOf, type Rank } from '../progress';
import { derive, GATE_WAIT, routeOpenedBy, ROUTES, sceneOf, STEPS, type Harbor, type Lane, type Scene } from '../scene';
import { app } from '../state';
import { CHAPTER_COLOR, chapterColor, cx, DONE_PILL, PILL } from '../theme';
import { textOf, type Ticket } from '../tickets';
import { avatar } from './avatar';
import { byId, h, nodes } from './dom';
import { bayBox, CRANE, drawYard, harborScene, MAX_TIERS, type HarborParts } from './harbor';
import { paintRoutes, routeMap, type MapParts } from './routeMap';
import { s } from './svg';

/** One completion animation. `fast`: skipped or reduced motion, so every tween draws its end state at once. */
interface Run { fast: boolean; done: boolean }
interface Ctx {
  run: Run;
  tk: Ticket;
  scene: Scene;
  before: Harbor;
  after: Harbor;
  rankBefore: Rank;
  rankAfter: Rank;
  art: HTMLElement;
  harbor?: HarborParts;
  map?: MapParts;
}

let current: Run = { fast: true, done: true };
let queue: Promise<void> = Promise.resolve();
let hideTimer = 0;

const reduced = (): boolean => matchMedia('(prefers-reduced-motion: reduce)').matches;
const easeInOut = (x: number): number => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
const easeIn = (x: number): number => x * x;
const easeOut = (x: number): number => 1 - (1 - x) * (1 - x);
const linear = (x: number): number => x;
const lerp = (a: number, b: number, x: number): number => a + (b - a) * x;

/** Draws f(0 → 1) over `ms` with requestAnimationFrame. A fast run draws f(1) at once: skip = jump to the end state. */
function tween(run: Run, ms: number, f: (x: number) => void, ease = easeInOut): Promise<void> {
  return new Promise((resolve) => {
    if (run.fast) {
      f(1);
      resolve();
      return;
    }
    const t0 = performance.now();
    const step = (now: number): void => {
      const x = run.fast ? 1 : Math.min(1, (now - t0) / ms);
      f(ease(x));
      if (x < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}
const wait = (run: Run, ms: number): Promise<void> => tween(run, ms, () => {});

const portName = (code: string): string => ROUTES.find((r) => r.port === code)?.name ?? code;
const titleOf = (c: Ctx): string => textOf(c.tk, getLang()).title;

// ---- scene parts (geometry of mockup v5) ----
function setCrane(p: HarborParts, x: number, y: number, carry?: string | false): void {
  p.trolley.setAttribute('transform', `translate(${x},0)`);
  p.cable.setAttribute('y2', String(y));
  p.spreader.setAttribute('y', String(y));
  p.carry.setAttribute('y', String(y + 4));
  if (carry === false) p.carry.setAttribute('opacity', '0');
  else if (carry) {
    p.carry.setAttribute('class', carry);
    p.carry.setAttribute('opacity', '1');
  }
}
/** x: 0 = at the berth, 1 = out at sea, shrinking toward Son Tra. */
function setShip(p: HarborParts, x: number, alpha: number): void {
  p.ship.setAttribute('transform', `translate(${-430 * x},${-12 * x}) translate(580,266) scale(${1 - 0.45 * x}) translate(-580,-266)`);
  p.ship.setAttribute('opacity', String(alpha));
}
function setTruck(p: HarborParts, x: number, alpha = 1): void {
  p.truck.setAttribute('transform', `translate(${x},0)`);
  p.truck.setAttribute('opacity', String(alpha));
}
const setBarrier = (p: HarborParts, deg: number): void => p.barrier.setAttribute('transform', `rotate(${deg} 905 339)`);
const setShutter = (p: HarborParts, open: number): void => p.shutter.setAttribute('height', String(44 * (1 - open)));
function gateTag(p: HarborParts, label: string): void {
  p.gateText.textContent = label;
  p.gateTag.setAttribute('opacity', label ? '1' : '0');
}

/** The berthed ship sails out (1.6 s), then sits hidden until berthBack(). */
async function departBerth(c: Ctx): Promise<void> {
  const p = c.harbor;
  if (!p) return;
  await tween(c.run, 1600, (x) => setShip(p, x, x < 0.7 ? 1 : 1 - (x - 0.7) / 0.3), easeIn);
  setShip(p, 0, 0);
}
async function berthBack(c: Ctx, ms: number): Promise<void> {
  const p = c.harbor;
  if (p) await tween(c.run, ms, (x) => setShip(p, 0, x));
}

/** +1 container in this chapter's bay (§1.1), then the yard is redrawn from `after` with a bright edge on it. */
async function dropContainer(c: Ctx, ms: number): Promise<void> {
  const p = c.harbor;
  if (!p) return;
  const ch = c.tk.chapter;
  const tier = (c.after.bays[ch] ?? 1) - 1;
  if (tier < MAX_TIERS) {
    const b = bayBox(ch, tier);
    const box = s('rect', { x: b.x, y: b.y - 30, width: b.w, height: b.h - 0.6, class: chapterColor(ch).fill, opacity: 0 });
    p.drop.append(box);
    await tween(c.run, ms, (x) => {
      box.setAttribute('y', String(b.y - 30 * (1 - x)));
      box.setAttribute('opacity', String(Math.min(1, x * 2)));
    }, easeIn);
    box.remove();
  }
  drawYard(p, c.after, new Set([ch]));
}

async function toGate(c: Ctx, ms: number): Promise<void> {
  const p = c.harbor!;
  p.truckBox.setAttribute('class', chapterColor(c.tk.chapter).fill);
  setBarrier(p, 0);
  await tween(c.run, ms, (x) => setTruck(p, lerp(640, 778, x), Math.min(1, x * 3)), easeOut);
}

/** A ship runs the lane to `port`, its wake lights up, then the lanes repaint from `after` (a new lane turns solid). */
async function sail(c: Ctx, port: string, ms: number): Promise<void> {
  const m = c.map;
  if (!m) return wait(c.run, ms);
  const path = m.routes[port];
  const len = path.getTotalLength();
  m.wake.setAttribute('d', path.getAttribute('d') ?? '');
  m.wake.setAttribute('class', chapterColor(c.tk.chapter).stroke);
  m.wake.setAttribute('stroke-dasharray', String(len));
  m.wake.setAttribute('opacity', '0.55');
  m.ship.setAttribute('opacity', '1');
  await tween(c.run, ms, (x) => {
    const at = path.getPointAtLength(x * len);
    const ahead = path.getPointAtLength(Math.min(len, x * len + 1));
    const deg = (Math.atan2(ahead.y - at.y, ahead.x - at.x) * 180) / Math.PI;
    const flip = Math.abs(deg) > 90;
    m.ship.setAttribute('transform', `translate(${at.x},${at.y}) rotate(${flip ? deg + 180 : deg}) scale(${flip ? -1 : 1},1)`);
    m.wake.setAttribute('stroke-dashoffset', String(len * (1 - x)));
  });
  m.ship.setAttribute('opacity', '0');
  m.wake.setAttribute('opacity', '0');
  paintRoutes(m, c.after);
}

// ---- cards over the art ----
const CARD_OV = 'w-64 max-w-[calc(100vw-4rem)] rounded-xl bg-panel p-3 text-sm shadow-lg ring-1 ring-line';
const STAMP = 'absolute rounded-md border-[3px] px-2 py-0.5 text-[15px] font-extrabold tracking-wide uppercase';
/** Lane colour is never the only signal: the stamp spells the lane out (§6). */
const LANE: Record<Lane, { key: Key; stamp: string }> = {
  green: { key: 'anim.laneGreen', stamp: 'border-emerald-700 bg-emerald-50 text-emerald-800 dark:border-emerald-400 dark:bg-emerald-950 dark:text-emerald-200' },
  yellow: { key: 'anim.laneYellow', stamp: 'border-yellow-700 bg-yellow-50 text-yellow-800 dark:border-yellow-400 dark:bg-yellow-950 dark:text-yellow-200' },
  red: { key: 'anim.laneRed', stamp: 'border-red-700 bg-red-50 text-red-800 dark:border-red-400 dark:bg-red-950 dark:text-red-200' },
};
const GATE: Record<Lane, Key | undefined> = { green: undefined, yellow: 'anim.gateYellow', red: 'anim.gateRed' };

/** Top right over a picture (centred for the promotion card); on its own when the kind has no picture (quote, ledger, chat). */
function overlay(c: Ctx, card: HTMLElement, centre = false): HTMLElement {
  const pictured = Boolean(c.harbor || c.map);
  card.style.opacity = '0';
  c.art.append(h('div', { class: pictured ? (centre ? 'absolute top-3 left-1/2 -translate-x-1/2' : 'absolute top-2 right-2') : 'p-3' }, card));
  return card;
}
const fadeIn = (run: Run, el: HTMLElement, ms: number): Promise<void> =>
  tween(run, ms, (x) => {
    el.style.opacity = String(x);
    el.style.transform = `translateY(${-8 * (1 - x)}px)`;
  });
/** Under reduced motion the final card stays until Close or the next completion (§5). */
const fadeOut = (run: Run, el: HTMLElement, ms: number): Promise<void> =>
  reduced() ? Promise.resolve() : tween(run, ms, (x) => { el.style.opacity = String(1 - x); });

function confetti(c: Ctx, ms: number): Promise<void> {
  const box = h('div', { class: 'pointer-events-none absolute inset-0 overflow-hidden' });
  const bits = Array.from({ length: 42 }, (_, i) => {
    const el = h('span', { class: cx('absolute top-1/3 left-1/2 block h-3 w-2 rounded-sm', CHAPTER_COLOR[(i % 12) + 1].bar) });
    box.append(el);
    return { el, vx: (Math.random() - 0.5) * 520, vy: -120 - Math.random() * 160, spin: Math.random() * 720 };
  });
  c.art.append(box);
  return tween(c.run, ms, (x) => bits.forEach((b) => {
    b.el.style.transform = `translate(${b.vx * x}px, ${b.vy * x + 360 * x * x}px) rotate(${b.spin * x}deg)`;
    b.el.style.opacity = String(1 - x * x);
  }), linear).then(() => box.remove());
}

function promoCard(c: Ctx): HTMLElement {
  const lang = getLang();
  const from = c.rankBefore.tier?.[lang] ?? t('career.intern');
  const to = c.rankAfter.tier?.[lang] ?? t('career.intern');
  const opened = routeOpenedBy(c.tk.chapter);
  return h('div', { class: 'w-80 max-w-[calc(100vw-4rem)] rounded-2xl bg-panel p-4 text-center shadow-xl ring-2 ring-amber-500' },
    h('p', { class: 'm-0 text-sm font-semibold tracking-wide text-amber-800 uppercase dark:text-amber-200' }, t('anim.promoKicker', { n: c.tk.chapter })),
    h('p', { class: 'm-0 text-lg font-bold' }, from !== to ? `${from} → ${to}` : t('anim.promoStep', { career: c.rankAfter.career?.[lang] ?? to })),
    opened ? h('p', { class: 'm-0 text-sm text-muted' }, t('anim.promoRoute', { port: portName(opened) })) : null);
}

// ---- the eight kinds (§2), step durations from STEPS ----
const PLAY: Record<Scene['kind'], (c: Ctx) => Promise<void>> = {
  async ship(c) {
    const [sailMs, backMs] = STEPS.ship;
    await Promise.all([departBerth(c), c.scene.to ? sail(c, c.scene.to, sailMs) : wait(c.run, sailMs)]);
    await Promise.all([berthBack(c, backMs), dropContainer(c, backMs)]);
  },

  async yard(c) {
    const p = c.harbor!;
    const [lowerMs, liftMs, travelMs, downMs, releaseMs, homeMs] = STEPS.yard;
    const ch = c.tk.chapter;
    const b = bayBox(ch, Math.min((c.after.bays[ch] ?? 1) - 1, MAX_TIERS - 1));
    const bayX = b.x + b.w / 2;
    await tween(c.run, lowerMs, (x) => setCrane(p, CRANE.x, lerp(CRANE.y, 220, x), false));
    setCrane(p, CRANE.x, 220, chapterColor(ch).fill);
    await tween(c.run, liftMs, (x) => setCrane(p, CRANE.x, lerp(220, 160, x)));
    await tween(c.run, travelMs, (x) => setCrane(p, lerp(CRANE.x, bayX, x), 160));
    await tween(c.run, downMs, (x) => setCrane(p, bayX, lerp(160, b.y - 4, x)));
    setCrane(p, bayX, b.y - 4, false);
    drawYard(p, c.after, new Set([ch]));
    await tween(c.run, releaseMs, (x) => setCrane(p, bayX, lerp(b.y - 4, CRANE.y, x)));
    await tween(c.run, homeMs, (x) => setCrane(p, lerp(bayX, CRANE.x, x), CRANE.y));
  },

  async customs(c) {
    const p = c.harbor!;
    const lane = c.scene.lane ?? 'green';
    const [showMs, stampMs, gateMs, barrierMs, driveMs] = STEPS.customs;
    const stamp = h('span', { class: cx(STAMP, 'right-3 bottom-2', LANE[lane].stamp) }, t('anim.stamp', { lane: t(LANE[lane].key) }));
    stamp.style.opacity = '0';
    const card = overlay(c, h('div', { class: cx(CARD_OV, 'relative pb-12') },
      h('p', { class: 'm-0 font-semibold text-muted' }, t('anim.declaration')),
      h('p', { class: 'm-0 font-bold' }, titleOf(c)),
      stamp));
    await fadeIn(c.run, card, showMs);
    await tween(c.run, stampMs, (x) => {
      stamp.style.opacity = String(Math.min(1, x * 2));
      stamp.style.transform = `rotate(-10deg) scale(${lerp(2.2, 1, x)})`;
    }, easeIn);
    await toGate(c, gateMs);
    const gate = GATE[lane];
    if (gate) {
      gateTag(p, t(gate));
      await wait(c.run, GATE_WAIT[lane]);
      gateTag(p, '');
    }
    await tween(c.run, barrierMs, (x) => setBarrier(p, 80 * x));
    await Promise.all([
      tween(c.run, driveMs, (x) => setTruck(p, lerp(778, 960, x), x > 0.7 ? 1 - (x - 0.7) / 0.3 : 1), linear),
      dropContainer(c, 400),
      fadeOut(c.run, card, 300),
    ]);
    setBarrier(p, 0);
  },

  async truck(c) {
    const p = c.harbor!;
    const [gateMs, barrierMs, throughMs, inMs, closeMs] = STEPS.truck;
    await toGate(c, gateMs);
    await tween(c.run, barrierMs, (x) => setBarrier(p, 80 * x));
    await Promise.all([
      tween(c.run, throughMs, (x) => setTruck(p, lerp(778, 960, x)), linear),
      tween(c.run, throughMs, (x) => setShutter(p, x)),
    ]);
    await tween(c.run, inMs, (x) => setTruck(p, lerp(960, 1020, x)), linear);
    setBarrier(p, 0);
    await Promise.all([tween(c.run, closeMs, (x) => setShutter(p, 1 - x)), dropContainer(c, closeMs)]);
    setTruck(p, 640, 0);
  },

  async quote(c) {
    const [showMs, wait1, flipMs, wait2, fadeMs] = STEPS.quote;
    const front = h('div', {},
      h('p', { class: 'm-0 font-semibold text-muted' }, t('anim.quoteCard')),
      h('p', { class: 'm-0 font-bold' }, titleOf(c)),
      h('span', { class: cx(PILL, 'mt-1 bg-code text-muted') }, t('anim.quoteWaiting')));
    const back = h('div', { hidden: true },
      h('p', { class: 'm-0 font-semibold text-emerald-800 dark:text-emerald-200' }, t('anim.quoteCard')),
      h('p', { class: 'm-0 font-bold' }, t('anim.quoteAccepted')));
    const card = overlay(c, h('div', { class: CARD_OV }, front, back));
    await fadeIn(c.run, card, showMs);
    await wait(c.run, wait1);
    await tween(c.run, flipMs, (x) => {
      card.style.transform = `scaleX(${Math.abs(1 - 2 * x)})`; // a flat flip: shrink to the edge, swap faces, grow back
      if (x >= 0.5) {
        front.hidden = true;
        back.hidden = false;
      }
    });
    await wait(c.run, wait2);
    await fadeOut(c.run, card, fadeMs);
  },

  async ledger(c) {
    const [showMs, stampMs, coinsMs, waitMs, fadeMs] = STEPS.ledger;
    const paid = h('span', { class: cx(STAMP, 'top-3 right-3', LANE.green.stamp) }, t('anim.paid'));
    paid.style.opacity = '0';
    const coins = Array.from({ length: 6 }, (_, i) =>
      h('span', { class: 'absolute size-4 rounded-full bg-amber-400 ring-2 ring-amber-600', style: `left:${16 + i * 22}px;top:56px` }));
    const card = overlay(c, h('div', { class: cx(CARD_OV, 'relative') },
      h('p', { class: 'm-0 font-semibold text-muted' }, t('anim.invoice')),
      h('p', { class: 'm-0 pr-20 font-bold' }, titleOf(c)),
      paid,
      ...coins,
      h('p', { class: 'mt-8 mb-0 rounded-lg bg-ink px-3 py-1.5 text-panel' }, t('anim.ledgerBook'))));
    await fadeIn(c.run, card, showMs);
    await tween(c.run, stampMs, (x) => {
      paid.style.opacity = String(Math.min(1, x * 2));
      paid.style.transform = `rotate(-10deg) scale(${lerp(2, 1, x)})`;
    }, easeIn);
    await tween(c.run, coinsMs, (x) => coins.forEach((coin, i) => {
      const k = Math.max(0, Math.min(1, x * 1.6 - i * 0.12));
      coin.style.transform = `translate(${lerp(0, 40, k)}px, ${lerp(0, 44, k) - 30 * Math.sin(k * Math.PI)}px)`;
      coin.style.opacity = k >= 1 ? '0' : '1';
    }), linear);
    await wait(c.run, waitMs);
    await fadeOut(c.run, card, fadeMs);
  },

  async chat(c) {
    const [showMs, typingMs, bubbleMs, waitMs, fadeMs] = STEPS.chat;
    const dots = [0, 1, 2].map(() => h('span', { class: 'size-1.5 rounded-full bg-muted' }));
    const typing = h('span', { class: 'inline-flex gap-1 rounded-2xl rounded-tl-sm bg-code px-3 py-2' }, ...dots);
    const bubble = h('p', { class: 'm-0 rounded-2xl rounded-tl-sm bg-code px-3 py-2', hidden: true }, t('anim.thanks'));
    const happy = h('span', { class: cx(PILL, DONE_PILL) }, t('anim.happy'));
    happy.style.opacity = '0';
    const card = overlay(c, h('div', { class: cx(CARD_OV, 'space-y-2') },
      h('p', { class: 'm-0 flex items-center gap-2' }, avatar({ name: '', dept: 'CS' }, 'md'), h('b', {}, t('anim.customer'))),
      typing, bubble, happy));
    await fadeIn(c.run, card, showMs);
    await tween(c.run, typingMs, (x) => dots.forEach((d, i) => {
      d.style.transform = `translateY(${-3 * Math.max(0, Math.sin(x * 9 - i))}px)`;
    }), linear);
    typing.hidden = true;
    bubble.hidden = false;
    await tween(c.run, bubbleMs, (x) => {
      bubble.style.opacity = String(x);
      happy.style.opacity = String(x);
    });
    await wait(c.run, waitMs);
    await fadeOut(c.run, card, fadeMs);
  },

  async promotion(c) {
    const [dropMs, restMs] = STEPS.promotion;
    const route = c.scene.to ?? routeOpenedBy(c.tk.chapter);
    const card = overlay(c, promoCard(c), true);
    await dropContainer(c, dropMs);
    if (!c.run.fast) void confetti(c, restMs);
    await Promise.all([
      departBerth(c).then(() => berthBack(c, 400)),
      route ? sail(c, route, 2200) : wait(c.run, 2200),
      fadeIn(c.run, card, 400),
      wait(c.run, restMs),
    ]);
  },
};

/** §6: the same sentence for screen readers and on screen, built from the ticket title (no made-up numbers). */
const DONE_KEY: Record<'truck' | 'quote' | 'ledger' | 'chat', Key> = {
  truck: 'anim.doneTruck', quote: 'anim.doneQuote', ledger: 'anim.doneLedger', chat: 'anim.doneChat',
};
function sentence(c: Ctx): string {
  const lang = getLang();
  const title = titleOf(c);
  const { kind, to, lane } = c.scene;
  if (kind === 'ship') return to ? t('anim.doneShip', { title, port: portName(to) }) : t('anim.doneShipNoPort', { title });
  if (kind === 'yard') {
    const total = app.tickets.filter((x) => x.chapter === c.tk.chapter).length;
    return t('anim.doneYard', { title, n: c.tk.chapter, k: c.after.bays[c.tk.chapter] ?? 0, total });
  }
  if (kind === 'customs') return t('anim.doneCustoms', { title, lane: t(LANE[lane ?? 'green'].key) });
  if (kind === 'promotion') {
    const rank = c.rankAfter.career?.[lang] ?? '';
    const opened = routeOpenedBy(c.tk.chapter);
    const base = opened ? t('anim.donePromotion', { rank, port: portName(opened) }) : t('anim.donePromotionNoRoute', { rank });
    return to && to !== opened ? `${base} ${t('anim.alsoSailed', { port: portName(to) })}` : base; // §7: ch1-05 sails to Rotterdam, opens Singapore
  }
  return t(DONE_KEY[kind], { title });
}

/** Picture per kind (§4): the harbour close-up for port work, the route map when a ship has somewhere to go. */
function build(c: Ctx): void {
  const k = c.scene.kind;
  if (k === 'ship' || k === 'yard' || k === 'customs' || k === 'truck' || k === 'promotion') {
    c.harbor = harborScene(c.before, { ambient: false, current: c.tk.chapter, crop: true });
  }
  if ((k === 'ship' && c.scene.to) || k === 'promotion') c.map = routeMap(c.before);
  c.art.replaceChildren(...nodes(c.harbor?.svg, c.map?.svg));
}

const hide = (): void => {
  byId('stage').hidden = true;
};
function skip(): void {
  if (!current.done) current.fast = true; // jump to the end state; the sentence was already announced
  else hide();
}

/** Skip button and Esc (when no dialog is open: Esc closes the inbox there). */
export function initStage(): void {
  byId('stage-skip').addEventListener('click', skip);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !byId('stage').hidden && !document.querySelector('dialog[open]')) skip();
  });
}

/**
 * First completion of `tk` (main.ts complete(); never for practice, retry or review, §1.4). Announces at once, then plays
 * sceneOf(tk) for ≤ 3 s without blocking input. An animation still running jumps to its end state first (no queue of
 * animations). Reduced motion: end state only, and the dock stays until Close or the next completion.
 */
export function playCompletion(tk: Ticket, before: Set<string>, after: Set<string>): void {
  current.fast = true;
  const run: Run = { fast: reduced(), done: false };
  current = run;
  const c: Ctx = {
    run, tk, scene: sceneOf(tk), art: byId('stage-art'),
    before: derive(app.tickets, before), after: derive(app.tickets, after),
    rankBefore: rankOf(app.tickets, before), rankAfter: rankOf(app.tickets, after),
  };
  const text = sentence(c);
  byId('announce').textContent = text; // read now, not after the animation (§6)
  queue = queue
    .then(async () => {
      if (current !== run) return; // a newer completion already replaced this one
      window.clearTimeout(hideTimer);
      build(c);
      byId('stage-text').textContent = text;
      byId('stage-skip').textContent = t(run.fast ? 'app.close' : 'anim.skip');
      byId('stage').hidden = false;
      try {
        await PLAY[c.scene.kind](c);
      } finally {
        run.done = true;
      }
      if (current !== run) return;
      byId('stage-skip').textContent = t('app.close');
      if (!reduced()) hideTimer = window.setTimeout(hide, 4000);
    })
    .catch((e: unknown) => console.warn('Completion animation failed:', e));
}
```

- [ ] **Step 4: Gọi từ `complete()` (`src/main.ts`)**

4a. Thêm import: `import { initStage, playCompletion } from './ui/stage';`.

4b. Trong `function complete(t: Ticket)`, ngay sau dòng `  if (done().has(t.id)) return;` thêm:
```ts
  const before = done();
```
và ngay sau dòng `  persist(true);` (trong cùng hàm) thêm:
```ts
  playCompletion(t, before, done()); // first completion only: the early return above skips re-solves
```
4c. Ngay sau dòng `initLayout(byId('shell'), …);` thêm:
```ts
initStage();
```

- [ ] **Step 5: Kiểm kiểu, test, build, class đã sinh**

```bash
npx tsc --noEmit
npx vitest run
npx vite build
for c in 'sm\:w-\[560px\]' 'pointer-events-none' 'border-\[3px\]' 'dark\:border-yellow-400' 'bg-red-50' 'ring-amber-500' 'w-80' 'bg-teal-500'; do printf '%s ' "$c"; grep -cF "$c" dist/assets/index-*.css; done
grep -rnE "\.innerHTML\s*=|insertAdjacentHTML|<animate" src; echo "exit=$?"
```
Expected:
- tất cả xanh;
- vòng `for` in `1` mỗi dòng: tám màu `bar` của confetti nằm trong `theme.ts`, màu tem nằm trong map `LANE`;
- lệnh cuối `exit=1`.

- [ ] **Step 6: Checklist Edge (orchestrator)**

Cách xem đủ 8 loại: 15 ticket hiện có cho `yard` (ch1-01), `promotion` (ch1-05, ch2-05), `ship` (ch2-04) và `chat` (ch3-01). Để xem `customs` (3 luồng), `truck`, `quote`, `ledger` và `ship` có cảng đích:
- tạm thêm `scene: { kind: … }` vào một ticket chưa làm, trong bản sửa **không commit**;
- hoặc xóa id khỏi `completed` trong Local Storage rồi nộp lại;

rồi `git checkout -- content`. Với mỗi loại:
1. Nộp đúng: dải hiện góc dưới phải với đúng hình ở bảng đầu task.
   - Thời gian từ lúc hiện tới lúc đứng yên ≤ 3 s (Performance panel, hoặc đếm); luồng đỏ dài nhất ≈ 3 s.
   - Câu báo dưới hình đúng mẫu §6, VI rồi EN.
2. Trong lúc chạy: gõ vào editor, bấm tab Kết quả, mở Hộp thư đều được; chuột đi xuyên qua dải, trừ nút.
3. Bấm "Bỏ qua (Esc)" hoặc nhấn Esc giữa chừng: nhảy ngay tới cuối (container đã nằm trong bãi, dấu đã đóng, thẻ đã lật), nút thành "Đóng". 4 s sau dải tự ẩn.
4. Nộp đúng việc thứ hai khi việc trước còn chạy: cái trước nhảy tới cuối, cái mới chạy ngay.
5. Thăng tiến:
   - ch1-05: thẻ "Chương 1 · Đánh giá thăng tiến · Đạt" + "Thực tập sinh DA → Junior DA" + "Mở tuyến Singapore."; tàu chạy tới Rotterdam; confetti; chip topbar thành "Junior DA". Câu báo "Đạt đánh giá thăng tiến: bạn là Junior DA. Mở tuyến Singapore. Tàu đã rời Tiên Sa đi Rotterdam.";
   - ch2-05: "Bước nghề mới · Junior DA · phụ trách báo cáo sản lượng"; tuyến Rotterdam chuyển nét đứt → nét liền khi tàu tới.
6. `prefers-reduced-motion: reduce`: dải hiện ngay ở trạng thái cuối, không chuyển động, không confetti; nút là "Đóng"; dải ở lại tới khi Đóng hoặc nộp việc khác; câu báo giống hệt.
7. Accessibility pane: `#announce` (live polite) có câu báo ngay lúc nộp; phần hình `aria-hidden`; nút Tab tới được, có nhãn chữ.
8. Làm lại một việc đã xong: không hoạt cảnh, không thêm container. Tải lại trang: bãi/bản đồ/chip y hệt (tính lại từ `completed`).
9. Tối: card, tem luồng, thẻ thăng tiến đạt AA.
10. 375px: dải rộng gần hết màn hình, không tràn ngang. Với reduced-motion bật, dải ở lại và có thể che hàng nút Chạy/Nộp dính đáy: bấm "Đóng" phải trả lại hàng nút. Ghi lại nếu cần dời dải lên trên hàng nút.

- [ ] **Step 7: Commit**

```bash
git add src/ui/stage.ts index.html src/main.ts src/i18n/vi.ts src/i18n/en.ts
git commit -m "feat(ui): eight completion animations with promotion card, skip, reduced-motion fallback and aria-live"
```

---

### Task 19: Ghi chú dự án, điều chỉnh cho Plan 1b/1c/Import, kiểm tổng và checklist Edge

**Files:**
- Modify: `CLAUDE.md`, `docs/superpowers/plans/2026-11-16-cargo-query-plan-1b-visualization.md`, `docs/superpowers/plans/2026-11-16-cargo-query-plan-1c-product.md`, `docs/superpowers/plans/2026-11-16-cargo-query-plan-import.md`

(Không sửa `docs/team/*`: orchestrator ghi L-số và commit tài liệu nhóm.)

- [ ] **Step 1: `CLAUDE.md`**

1a. Mục **Architecture**: thay gạch đầu dòng bắt đầu bằng `- Home is an ordered list of sections` (Task 10 thêm) bằng:
```markdown
- Home is an ordered list of sections (`registerHomeSection({ id, order, span, render })`, same id replaces): `harbor` 5, `continue` 10, `career` 20, `routes` 25, `chapters` 30, `kpi` 35, `skills` 40, `modes` 50. They are built from the pure view-model `homeModel()` (`src/home.ts`: chapter status done/current/locked/soon, progress, skill level; `homeHooks.levelOf` takes Leitner boxes) and redrawn only while Home is visible. "Other modes" cards appear only when a feature calls `registerMode()`. The KPI dashboard (`content/kpis.yml`, `kpiTiles`/`kpiValue` in `src/home.ts`) opens a tile only once its ticket is solved and computes the value at runtime from that ticket's Solution (never hard-coded).
- 12 chapters (L27, L30, `docs/team/curriculum.md`). `content/chapters.yml` holds per chapter: `title`, `career` (the career step reached by passing its promotion review), `tier` (★ chapters 1/3/6/9/12 change the job title), `story` (shown on the chapter's first ticket) and `outcomes`. `rankOf()` (`src/progress.ts`) derives the title (top bar `#rank`) and the career step from completed boss tickets. Chapter colours live in `CHAPTER_COLOR` (`src/theme.ts`, 1–12), not in YAML; `CHAPTER_TABLES` covers chapters 1–12. A chapter with no tickets shows "Coming soon".
- Colleagues (L18): `content/people.yml` (`src/people.ts`) gives every ticket sender a real forwarder role, a bio and a `look`; `ui/avatar.ts` draws the portrait as SVG from it. `tests/people.test.ts` checks that every `from.name` resolves with the same department and that staff names match the seed's `employees`. The inbox is grouped by colleague; the brief is a chat thread (message bubble, your reply and a thank-you after a correct answer).
- Completion animations (L29, L31, `docs/team/completion-animations.md`):
  - `src/scene.ts` (pure, tested) holds:
    - `sceneOf(ticket)`: boss → promotion; the optional `scene:` frontmatter; otherwise by department and tables;
    - `derive(tickets, completed)`: yard bays, open lanes, trips;
    - `ROUTES` from Tien Sa;
    - `STEPS`: per-step durations, every animation ≤ 3 s.
  - `ui/harbor.ts` draws the Tien Sa scene and `ui/routeMap.ts` the route map, both with `s()` (`ui/svg.ts`, `createElementNS`; gradient ids get a per-build prefix).
  - `ui/stage.ts` `playCompletion()` is called from `complete()` only, i.e. the first completion:
    - it plays in the fixed `#stage` dock;
    - it announces through `#announce` (`aria-live`); both exist empty in `index.html`;
    - it is skippable (button or Esc) and never blocks input;
    - under `prefers-reduced-motion` it shows the end state only.
  - Nothing new is saved: everything is recomputed from `completed`.
```
1b. Mục **Content and seed rules**, thêm gạch đầu dòng cuối:
```markdown
- Optional `scene: { kind, to?, lane? }` picks a ticket's completion animation (`ship yard customs truck quote ledger chat`; `to` is a lane port in `ROUTES`, only for `ship` or a boss; `lane` only for `customs`). Pricing, trucking/CFS and any ship that should reach a port must declare it. The UI never says "boss": a `beat: boss` ticket is a "promotion review" (L22, `tests/i18n.test.ts`).
- New senders go into `content/people.yml` first (real role; `employee` = id in the seed's `employees`, or null).
```

- [ ] **Step 2: Chèn ghi chú "Sau Plan 1d" vào ba plan**

Trong mỗi file dưới đây, chèn khối tương ứng **ngay trước** dòng `## Global Constraints` đầu tiên.

`docs/superpowers/plans/2026-11-16-cargo-query-plan-1b-visualization.md`:
```markdown
> **Sau Plan 1d (Tailwind, Trang chủ Tiên Sa, hoạt cảnh; L17–L31): điều chỉnh khi thực hiện:**
> - `registerTab`/`TabSpec` không đổi; tab tự có kiểu mới (gạch chân theo `aria-selected`). Hàng nút vẫn là `h('div', { class: 'actions' }, runBtn, formatBtn, submitBtn)`, nay nằm trong một div bọc dính đáy: chèn `explainBtn` sau `runBtn` như cũ.
> - Các bước "Thêm CSS vào cuối `src/style.css`" vẫn dùng được: token `var(--…)` và class `.muted .stale .error pre.sql .actions button.primary .tag .warn` còn nguyên. Ưu tiên viết class Tailwind ngay trong `h()`; khi đó class phải là chuỗi nguyên vẹn (map tên đầy đủ, nối bằng `cx()` từ `src/theme.ts`). `tests/theme.test.ts` chặn `` class: `…${x}` ``. SVG dựng bằng `s()` của `src/ui/svg.ts` (Plan 1d) thay vì một builder thứ hai.
> - Preflight làm `svg` thành `display: block`: SVG nằm giữa dòng chữ cần class `inline`.
> - **Task 7 (dải bản đồ tuyến d3-geo):** Plan 1d đã có bản đồ tuyến từ Tiên Sa (`src/ui/routeMap.ts`, `ROUTES` trong `src/scene.ts`) trên Trang chủ và hoạt cảnh tàu chạy khi xong việc (`src/ui/stage.ts`).
>   - **Bỏ** `map.celebrate()` trong `complete()`: một lần xong việc chỉ có một hoạt cảnh (completion-animations §4).
>   - Nếu vẫn làm dải `#map` trong khu làm việc: dùng lại `routeMap(derive(app.tickets, done()))` thay vì vẽ bản đồ thứ hai, giữ `chapterDots` làm thanh tiến độ, và ẩn `#map` khi `currentRoute() !== 'play'` (import từ `./ui/router`).
>   - `laneUnlocked` phải khớp `ROUTES[].opens`. Laem Chabang (`THLCH`), không "Bangkok".
>   - Khóa i18n `map.*` của plan này không trùng `routes.*` của 1d. Đổi `'map.beat.boss'` thành `'đánh giá thăng tiến'` / `'promotion review'`: `tests/i18n.test.ts` (Plan 1d Task 5) chặn chữ "boss" (L22).
> - Màu biểu đồ theo chương lấy `CHAPTER_COLOR[n].bar` (12 chương).
```

`docs/superpowers/plans/2026-11-16-cargo-query-plan-1c-product.md`:
```markdown
> **Sau Plan 1d (Tailwind, Trang chủ Tiên Sa, 12 chương, hoạt cảnh; L17–L31): điều chỉnh khi thực hiện:**
> - **Topbar.** Task 0, bảng điểm neo `index.html`: dòng XP nay là `<span id="xp" class="rounded-full bg-amber-400 px-3 py-1 font-semibold text-amber-950"></span>`, và ngay trước nó có `<span id="rank" …>`, tức chip chức danh. Chip này giữ nguyên.
>   - Task 8 Step 6a: xóa **dòng chứa `id="xp"`**.
>   - Task 8 Step 6b: thêm `class="… text-white"` cho `#progress` và `class="border-0 bg-black/20 text-white ring-1 ring-white/40 hover:bg-black/30"` cho `#skills-btn`. Task 9: `#notebook-btn` cũng vậy.
>   - Dòng `byId('xp').textContent = …` trong `topbar.ts` vẫn còn để xóa.
> - **12 chương.** `CHAPTERS.length` = 12 và `top.chapter` = `Chương {n}/{total}: {title}`. `progressLine` truyền `CHAPTERS.length`; tổng ticket luôn tính từ nội dung, không ghi cứng 7/35. Mọi test/ví dụ ghi `Ch x/7` sửa theo.
> - **Thang nghề.** `rankOf()` đã có trong `src/progress.ts` (Plan 1d Task 11); `overview.ts` không viết lại.
> - **Tổng kết chương** (Task 8):
>   - hoạt cảnh `promotion` của Plan 1d (thẻ thăng tiến + tàu + confetti, 3 s) **thay** animation mở màn 1,5 s; một ticket cuối chương chỉ có một màn ăn mừng (completion-animations §4);
>   - màn Tổng kết mở sau khi `playCompletion` đã chạy, không thêm hiệu ứng;
>   - tiêu đề màn dùng `career` của chương (`chapters.yml`);
>   - không chữ "boss" (L22).
> - **Hoạt cảnh chỉ ở lần đầu.** Luyện tập, Ôn, Làm lại không gọi `complete()`/`playCompletion` và không thêm container (completion-animations §1.4). `Save.completed` giữ nghĩa cũ (bãi, tuyến, chức danh tính lại từ đó).
> - **Điều hướng.** `selectTicket()` nay gọi `go('play')`; `enter(mode)` trong `src/ui/modes.ts` cũng gọi `go('play')` (import từ `./router`) để vào Luyện tập/Sandbox từ Trang chủ.
> - **Nav.** Đăng ký Luyện tập/Sandbox:
>   - `registerNav({ id: 'practice', order: 30, label: 'nav.practice', href: hashOf('play'), current: (r) => r === 'play' && session.mode.kind === 'practice', onclick: startToday })`;
>   - `{ id: 'sandbox', order: 40, … onclick: startSandbox }`;
>   - đăng ký lại `{ id: 'play', order: 20, label: 'nav.play', href: hashOf('play'), current: (r) => r === 'play' && session.mode.kind === 'story', onclick: backToStory }` (cùng id thì thay thế).
>
>   Khóa `nav.practice`, `nav.sandbox` thêm vào vi/en. "Sandbox" giống nhau ở hai ngôn ngữ, nên thêm khóa vào `SAME_OK`.
> - **Trang chủ.**
>   - Card "Ôn hôm nay" là section mới `registerHomeSection({ id: 'review', order: 15, span: 'full', render: reviewCard })` (`startToday`, `go('play')`). Id `side` không còn: Plan 1d đã thay bằng `career`, tức lộ trình sự nghiệp; không ghi đè `career`.
>   - Card "Ôn đầu chương" (curriculum §5.2) cũng là một section.
>   - `homeHooks.levelOf = (id) => app.save.review[id]?.box ?? 1`; `homeHooks.onSkill = (id) => { startSkill(id); go('play'); }`.
>   - Card chế độ:
>     - `registerMode({ id: 'sandbox', order: 10, icon: '🧪', tint: 'bg-orange-100 dark:bg-orange-950', title: 'mode.sandbox', desc: 'mode.sandboxDesc', open: () => { startSandbox(); go('play'); } })`;
>     - `registerMode({ id: 'notebook', order: 30, icon: '📒', tint: 'bg-fuchsia-100 dark:bg-fuchsia-950', title: 'mode.notebook', desc: 'mode.notebookDesc', open: () => toggleNotebook(document.getElementById('notebook-dialog') as HTMLDialogElement) })`;
>     - khóa `mode.*` thêm vào vi/en.
>   - Không tạo trùng logic `learnedSkills` trong `src/home.ts`.
> - **Phản hồi sai "có giọng người"** (Task 8): người gửi lấy từ `personOf(tk.from.name)` (`src/people.ts`), chân dung `avatar(tk.from)`.
> - **CSS.** "Thêm vào cuối `src/style.css`" vẫn chạy: token và class chung còn nguyên, `.topbar` vẫn là class của header. Class Tailwind viết trong `.ts` phải là chuỗi nguyên vẹn (`cx()`), không `` `chip ${x}` ``.
```

`docs/superpowers/plans/2026-11-16-cargo-query-plan-import.md`:
```markdown
> **Sau Plan 1d (Tailwind + Trang chủ, L17): điều chỉnh khi thực hiện:**
> - Task 6 Step 5: ở khối cuối `main.ts` thêm card "Dữ liệu của tôi": `registerMode({ id: 'mydata', order: 20, icon: '📂', tint: 'bg-cyan-100 dark:bg-cyan-950', title: 'mode.mydata', desc: 'mode.mydataDesc', open: () => { startSandbox(); go('play'); } })`. Import `registerMode` từ `./ui/homeView`, `go` từ `./ui/router`, `startSandbox` từ `./ui/modes`; khóa `mode.mydata*` thêm vào vi/en.
> - Task 6 Step 6: bỏ rule `.visually-hidden`, dùng class Tailwind `sr-only` cho ô `input[type=file]`. Các rule `.mydata*` còn lại vẫn dùng được (token còn nguyên); ưu tiên chuyển thành class Tailwind nguyên vẹn trong `myDataView.ts`.
```

- [ ] **Step 3: Kiểm tổng**

```bash
npx tsc --noEmit
npx vitest run
npx vite build
grep -rnE "\.innerHTML\s*=|insertAdjacentHTML|<animate" src; echo "exit=$?"
grep -rnE "text-xs|text-\[1[0-3]px\]" src/ui/homeView.ts src/ui/brief.ts src/ui/inbox.ts src/ui/stage.ts; echo "exit=$?"
git status --short docs/team
```
Expected:
- `tsc` không lỗi;
- tất cả test PASS: `theme`, `route`, `home`, `people`, `scene`, `progress`, `tickets`, `content`, `i18n`;
- build OK;
- hai lệnh grep đầu `exit=1` (L23: không chữ đọc < 14px ở Trang chủ, đề bài, hộp thư, hoạt cảnh);
- `git status --short docs/team` chỉ còn thay đổi của orchestrator, không có gì do plan này `git add`.

- [ ] **Step 4: Checklist Edge tổng (orchestrator; ghi kết quả vào mô tả commit/PR)**

Chạy trên Edge, dev server và một lần bản build. Mỗi dòng kiểm ở **sáng** và **tối**, và với `prefers-reduced-motion` bật/tắt khi dòng đó có chuyển động.

Luồng chơi:
- [ ] Save trống. Trang chủ có:
  - cảnh Tiên Sa (bãi trống), card Tiếp tục dạng tin nhắn của Hoàng Khánh, lộ trình sự nghiệp "Thực tập sinh DA";
  - bản đồ (Shanghai + Laem Chabang mở);
  - 12 card chương (ch4–12 "Sắp có");
  - 9 ô KPI khóa;
  - topbar "Thực tập sinh DA · Chương 1/12: Tuần thử việc".
- [ ] Làm `ch1-01` → `ch3-05`:
  - mỗi việc một hoạt cảnh đúng loại (bảng Task 15 §3.3), ≤ 3 s, có câu báo;
  - bong bóng "Mình gửi kết quả rồi nhé." + lời cảm ơn;
  - Recap như cũ;
  - sau ch1-05 / ch3-05 chip thành Junior DA / Data Analyst;
  - KPI mở dần đúng việc;
  - về Trang chủ: container "Mới", tuyến mở theo chương, số chuyến.
- [ ] Tải lại giữa chừng: bãi, bản đồ, chip, KPI y hệt (tính lại từ `completed`).
- [ ] Xuất tiến độ → xóa Local Storage → Nhập: mọi thứ khôi phục.

Đề bài và hộp thư:
- [ ] 15 đề là câu hỏi nghiệp vụ, VI/EN, không tên cột/backtick trong thân đề; nhãn cột `{ vi, en }`; dòng "Tên cột bạn đặt không quan trọng…".
- [ ] Hộp thư nhóm theo người, có chân dung + vai trò; đề bài mở bằng chân dung lớn + bong bóng tin nhắn.
- [ ] Không chỗ nào trên UI còn chữ "boss" / "Boss" / "sự cố" (tìm bằng Ctrl+F ở cả hai ngôn ngữ, cả trong Hộp thư và Recap).

Kích thước:
- [ ] ≥ 1024×700:
  - màn làm bài vừa một màn hình, thanh chia kéo được;
  - Trang chủ cuộn riêng, lưới chương 4 × 3, KPI 4 cột;
  - dải hoạt cảnh 560px góc dưới phải, không che editor.
- [ ] 820×1000 và 375×740:
  - một cột, không tràn ngang (`document.documentElement.scrollWidth === innerWidth`);
  - lưới chương 2 cột hoặc 1 cột;
  - cảnh và bản đồ co theo chiều rộng;
  - dải hoạt cảnh rộng gần hết màn hình;
  - hàng nút Chạy/Nộp dính đáy.

Bàn phím và trợ năng:
- [ ] Tab đi qua: nav → Hộp thư → VI/EN → Xuất/Nhập → nội dung Trang chủ ("Mở việc này", "Hộp thư", từng card chương khóa hiện nhãn "Để mở…") → nút "Bỏ qua (Esc)" khi dải hiện.
- [ ] Esc bỏ qua hoạt cảnh; khi dialog Hộp thư mở thì Esc chỉ đóng dialog.
- [ ] Accessibility tree: cảnh cảng và bản đồ là `img` có mô tả trạng thái; chân dung `aria-hidden`; `#announce` (polite) đọc câu báo ngay lúc nộp.

Tương phản (≥ 4.5:1 chữ thường; DevTools Accessibility pane / axe):
- [ ] Topbar: chữ trắng trên gradient; chip chức danh slate-900/trắng; VI/EN đang chọn.
- [ ] Nút Nộp, "Mở việc này".
- [ ] Badge Hoàn thành/Đang làm/Sắp có, chữ card khóa (`--muted`), nhãn "Để mở…".
- [ ] Bong bóng chat (`--text` trên `--code`/`--accent-soft`).
- [ ] KPI: số đen/trắng, nhãn ≥ 14px.
- [ ] Bản đồ: nhãn cảng mở/khóa ở cả nền biển và nền đất.
- [ ] Hoạt cảnh: card, tem luồng (emerald/yellow/red -800 trên -50, dark -200 trên -950), thẻ thăng tiến (amber-800 / amber-200).

Chuyển động:
- [ ] Bật `prefers-reduced-motion: reduce`: cảnh Trang chủ đứng yên; hoạt cảnh chỉ hiện trạng thái cuối, ở lại tới khi Đóng; không confetti; câu báo giống hệt.
- [ ] Hiệu năng: Trang chủ mở trong lúc cảnh chạy không giật khi cuộn; chạy query ở `#/play` không làm Trang chủ (đang ẩn) vẽ lại.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md docs/superpowers/plans/2026-11-16-cargo-query-plan-1b-visualization.md docs/superpowers/plans/2026-11-16-cargo-query-plan-1c-product.md docs/superpowers/plans/2026-11-16-cargo-query-plan-import.md
git commit -m "docs: Plan 1d architecture notes (12 chapters, colleagues, Tien Sa, KPI, completion animations) and adjustments for 1b/1c/Import"
```

---

## Chỗ lệch thiết kế (chốt trong plan này, để orchestrator ghi L-số nếu cần)

| # | Thiết kế | Plan làm | Lý do |
|---|---|---|---|
| 1 | completion-animations §5: công tắc "Giảm chuyển động" trong Cài đặt | Chỉ theo `prefers-reduced-motion` của hệ điều hành | Chưa có màn Cài đặt. Thêm công tắc khi có màn đó: một cờ `cargo-query/prefs` + một class trên `<body>` |
| 2 | §4: dải cảnh 140px trượt ra trên tab Kết quả, card phủ góc phải vùng kết quả; `ship` chạy trên dải bản đồ của Plan 1b | Một **dải cố định** góc dưới phải khu làm việc (≤ 560px, `pointer-events: none`) chứa cảnh cảng thu nhỏ, bản đồ và/hoặc card | Plan 1b chưa chạy. Một host cố định trong `index.html` không bị `rerender()`/`panel.refresh()` thay, và không đổi lưới khu làm việc |
| 3 | §2: `quote`/`ledger`/`chat` thả thêm container vào bãi | Ba loại này không có hình cảng trong dải, nên container chỉ hiện ở bãi trên Trang chủ (có viền "Mới") | Không vẽ cả cảnh chỉ để thả một container sau card |
| 4 | §7: mỗi cột bãi cao tối đa 5 tầng, "+n" từ tầng 6; câu báo "({k}/5)" | Tối đa **6 tầng** (`MAX_TIERS`), "+n" từ tầng 7; câu báo "({k}/{tổng việc của chương})" | Ch4–12 có 6 ticket (curriculum §0) |
| 5 | §9 câu 2 và 6: thứ tự mở tuyến | Giữ đúng v5 đã duyệt: Shanghai + Laem Chabang từ đầu; Singapore ch1, Rotterdam ch2, Busan ch3, Los Angeles ch4, Sydney ch5; ch6–12 không mở tuyến | User "Duyệt V5"; curriculum §7.2: bản đồ đủ ở ch6. Câu báo thăng tiến có mẫu không nêu tuyến |
| 6 | Mockup ghi tên cảng tiếng Việt ("Thượng Hải") | Tên cảng đúng `ports.name` của seed ở cả hai ngôn ngữ | Luật i18n: không dịch giá trị dữ liệu; test đối chiếu seed |
| 7 | Mockup v4: chữ card chương khóa mờ 55% | `text-muted` (≈ 5.7:1) | `slate-900/55` ≈ 3:1, không đạt AA |
| 8 | Product-design-v2 ★1: các ticket cũ cùng người thu gọn phía trên luồng chat | Hộp thư nhóm theo người; đề bài không hiện lại ticket cũ | YAGNI; thêm khi có người chơi cần |
| 9 | ★4: banner "Sự cố" sọc vàng-đen | Không làm (L22 thay bằng "Đánh giá thăng tiến"); có thẻ "Tuần này ở Cargo Query" + pill "Đánh giá thăng tiến" | L22 |
| 10 | ★3: thang 5 bậc | 6 bậc theo curriculum §1 (Thực tập sinh + 5 chức danh ★), 12 bước nghề | L30 |
| 11 | ★5: "bấm ô KPI mở lại ticket ở chế độ xem" | Ô KPI không bấm được | Chế độ xem lại thuộc Plan 1c |
| 12 | problem-design §3 dùng `*nhấn mạnh*` | Bỏ dấu `*` khi dán | `richText` không hiểu markdown |
| 13 | v4 có vòng lặp "tàu vào bến" cho tàu đang cập | Tàu cập bến đứng yên trên Trang chủ; có tàu nhỏ rời cảng lặp lại | Tàu cập bến là phần JS điều khiển trong hoạt cảnh `ship`/`promotion` |
| 14 | completion-animations mockup dùng số lô/tờ khai/hóa đơn bịa | Câu báo và card dùng `{title}` của việc | §9 câu 5: duyệt mẫu §6, không duyệt số bịa |
| 15 | IT trong curriculum §2: Plan 4 thêm nhân viên id 41 | `people.yml` có nhân vật IT `employee: null`; seed không đổi | Plan 1d không sửa seed; Plan 4 quyết định |

## Điều chỉnh cho Plan 1b/1c/Import và Plan 2–4 (tóm tắt)

| Plan | Điểm neo / hook | Thay đổi sau Plan 1d |
|---|---|---|
| 1b T2 | `h('div', { class: 'actions' }, runBtn, …` trong `work.ts` | Giữ nguyên chữ (đã bọc trong div dính đáy), chèn `explainBtn` như cũ |
| 1b T2–T6 | `registerTab`, CSS thêm cuối `style.css` | Không đổi; token + class chung còn. Class Tailwind mới phải nguyên vẹn (`cx()`); SVG giữa dòng cần `inline`; SVG dùng `s()` |
| 1b T7 | `#map`, `map.celebrate()`, `map.beat.boss` | Dùng lại `routeMap()`/`ROUTES` của 1d hoặc bỏ phần bản đồ. Không gọi `celebrate()` trong `complete()`. Ẩn `#map` ngoài `#/play`. Đổi chữ "boss" (L22) |
| 1c T0/T8 | `<span id="xp"></span>` | Nay có class: xóa "dòng chứa `id="xp"`". Giữ `#rank`. Nút/nhãn mới trên topbar dùng class `TOP_BTN` |
| 1c T4 | `overview.ts`, `progressLine` | Không viết lại `rankOf`; `CHAPTERS.length` = 12; không ghi cứng 7/35 |
| 1c T7 | `enter(mode)`, `renderModes` | `enter` gọi `go('play')`; nav Luyện tập/Sandbox qua `registerNav`; đăng ký lại `play` theo `session.mode` |
| 1c T3/T7/T9 | Leitner, "Ôn hôm nay", Sandbox, Sổ tay | `homeHooks.levelOf`, `homeHooks.onSkill`, `registerHomeSection({ id: 'review', order: 15, … })`, `registerMode` sandbox/notebook |
| 1c T8 | Tổng kết chương, phản hồi sai | `promotion` của 1d thay animation mở màn; dùng `career`; người gửi từ `personOf` |
| Import T6 | khối cuối `main.ts`, `.visually-hidden` | `registerMode` mydata; dùng `sr-only` |
| Plan 2 (chưa viết) | curriculum §7.2 "Plan 2 Task 0: khung 12 chương" | Đã làm ở 1d Task 11 (chapters.yml, CHAPTER_TABLES, màu, i18n, test). Plan 2 thêm outcome, kỹ năng, ticket ch4–6 và người gửi mới vào `people.yml`. Ticket pricing/điều độ/CFS khai `scene:` |
| Plan 3–4 (chưa viết) | KPI "Biên lợi nhuận quý 3/2026" | Ô `q3margin` trỏ `ch12-06`: tự mở khi ticket đó tồn tại và được giải (chỉnh `kind`/`col` theo Solution thật) |
