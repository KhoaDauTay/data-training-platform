# Cargo Query — Plan 1d: Tailwind CSS v4 + Trang chủ (quyết định L17)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuyển toàn bộ UI sang Tailwind CSS v4 (bản miễn phí, `@tailwindcss/vite`) theo mockup A đã duyệt và thêm Trang chủ (`#/`) cạnh màn làm bài (`#/play`): card Tiếp tục + tiến độ, lưới 7 chương, card chủ đề kỹ năng, card chế độ (bật khi tính năng tồn tại).

**Architecture:** Token màu hiện có (`--bg`, `--panel`, `--accent`… trong `:root` + khối `prefers-color-scheme: dark`) giữ nguyên tên và được nối vào Tailwind bằng `@theme inline`, nên utility trung tính (`bg-panel`, `text-muted`, `ring-line`) tự đổi theo dark mode; chỉ màu trang trí (chương, phòng ban) cần `dark:`. Một lớp `@layer base` (button, heading, table, dialog…) và `@layer components` nhỏ (`.muted .actions .primary pre.sql .error .stale .tag .good .bad .warn`) giữ "từ vựng chung" mà Plan 1b/1c/Import đang dùng. Logic mới là hàm thuần có unit test (`src/theme.ts`, `src/route.ts`, `src/home.ts`); DOM nằm ở `src/ui/router.ts`, `src/ui/homeView.ts`. Hai view (`<main id="home">`, `<main id="shell">`) cùng được mount, chỉ bật/tắt `hidden`, nên editor không bao giờ bị tạo lại khi đổi route.

**Tech Stack:** như Plan 1 + `tailwindcss` **4.3.5** và `@tailwindcss/vite` **4.3.5** (devDependencies, pin exact). Không thêm gì khác (không Tailwind UI/Plus, không router, không jsdom).

**Spec / quyết định:** `docs/team/decision-log.md` **L17** (user duyệt mockup A), mockup `.superpowers/brainstorm/11840-1794844744/content/home-tailwind.html`; L12 (`Chương n/7: <tên>` trên topbar), L13 (màu cú pháp editor bằng `--syn-*` — giữ nguyên, **không** chép editor nền tối của mockup). **Thứ tự:** chạy ngay sau các bản sửa lỗi Plan 1, **trước** Plan 1b (L17).

> **⚠ Đang có người sửa `src/` song song** (history race, splitter, a11y, phím tắt). Plan này viết trên commit `16d38b1`. **File trên đĩa thắng listing trong plan:** mọi bước "Modify" ghi dạng *tìm dòng cũ → thay dòng mới*; trước mỗi task đọc lại file trên đĩa, giữ mọi thay đổi logic người khác đã commit, chỉ áp phần chênh (class, markup) của plan. Nếu một dòng "cũ" không còn y hệt, tìm đoạn tương đương theo ngữ nghĩa và áp cùng thay đổi; không khôi phục code cũ. Code đầy đủ chỉ cho **file mới** và **test**.

## Global Constraints

- Mọi ràng buộc Plan 1 vẫn áp dụng: PGlite **0.5.16**; dependency mới cài `--save-exact`; không `innerHTML` (chỉ `h()`/`append`/`textContent`); mọi `localStorage` qua `readJson`/`writeJson` (`src/storage.ts`, đã bọc try/catch).
- Tailwind: **`tailwindcss@4.3.5`**, **`@tailwindcss/vite@4.3.5`** (đã kiểm `npm view` ngày 2026-11-16; peer `vite ^5.2 || ^6 || ^7 || ^8`, repo đang dùng vite 8.3.8). Không dùng Tailwind UI / Tailwind Plus (trả phí), không CDN `@tailwindcss/browser`.
- **Class là chuỗi nguyên vẹn trong `.ts`/`index.html`** để scanner của Tailwind thấy: không bao giờ ghép mảnh (`` `bg-${c}-500` ``, `'ring-' + n`). Chọn từ map chứa tên đầy đủ (`CHAPTER_COLOR[1].bar = 'bg-sky-500'`) và nối các tên đầy đủ bằng `cx()`. Không gán `class`/`className` bằng template literal (test ở Task 8 bắt lỗi này).
- Nguồn scan bị giới hạn: `@import "tailwindcss" source(none)` + `@source "../index.html"` + `@source "./**/*.ts"`. Mockup, plan markdown, `seed.sql` **không** được scan (nếu không, class thiếu sẽ bị che đi).
- Dark mode = `prefers-color-scheme` (mặc định của biến thể `dark:` trong v4). Không thêm nút đổi theme.
- **WCAG AA:** chữ ≥ 4.5:1 ở cả hai theme. Ước tính trước (≈, theo hex; palette v4 là OKLCH nên kiểm lại bằng DevTools ở checklist Task 10; mockup sai ở 4 chỗ, plan đã sửa): trắng/`emerald-600` = 3.8 ✗ → Nộp dùng `emerald-700` (5.5); trắng/`cyan-600` = 3.7 ✗ → gradient kết thúc ở `cyan-700` (5.4); `text-emerald-600`/trắng = 3.8 ✗ → trạng thái "Xong" dùng token `text-good`; `text-slate-400`/trắng = 2.6 ✗ → dùng `text-muted`. Nút và mục nav trên topbar dùng lớp phủ tối (`bg-black/20`, `/30`) thay vì `bg-white/15`/`/20` của mockup (làm sáng, < 4.5 ở đầu cyan). Chip màu: chữ `-800` trên nền `-100` (sáng), `-200` trên `-950` (tối).
- i18n: mọi chuỗi mới qua `t(key)`, khóa thêm vào **cả** `vi.ts` và `en.ts` trong cùng task. **Không dịch** tên phòng ban (`Ops`, `Sales`, `Finance`, `Customs`, `CS`, `Management`), tên người, SQL, tên bảng/cột. Khóa nào VI = EN phải vào `SAME_OK` của `tests/i18n.test.ts`.
- Không viết test import `src/ui/*`, `src/state.ts`, `src/main.ts` (Vitest chạy Node, không DOM). Logic có test nằm ở `src/theme.ts`, `src/route.ts`, `src/home.ts`.
- Vitest không kiểm kiểu: mọi bước "xác nhận PASS" chạy thêm `npx tsc --noEmit`.
- localStorage key mới: `cargo-query/route` (route cuối cùng, tiện ích thiết bị, không thuộc `Save`).
- Mỗi task một commit (bước cuối). Không `--no-verify`.

## File Structure

```
package.json, package-lock.json   + tailwindcss 4.3.5, @tailwindcss/vite 4.3.5 (devDependencies, exact)   (sửa)
vite.config.ts                    + plugins: [tailwindcss()]                                           (sửa)
index.html                        topbar gradient + nav, <main id="home">, <main id="shell">, class Tailwind (sửa)
src/style.css                     @import tailwindcss, @theme inline (token), @layer base/components (từ vựng chung),
                                  layout splitter (CSS thuần), CodeMirror (CSS thuần); xóa CSS từng vùng      (viết lại)
src/theme.ts                      cx, CHAPTER_COLOR/chapterColor, DEPT_COLOR/deptColor, class dùng chung, initials (mới, thuần)
src/route.ts                      Route, ROUTES, ROUTE_KEY, hashOf, isRoute, parseRoute, initialRoute           (mới, thuần)
src/home.ts                       homeModel: trạng thái chương, tiến độ, kỹ năng từ save + ticket             (mới, thuần)
src/ui/router.ts                  currentRoute, go, startRouter (hashchange, nhớ route)                      (mới)
src/ui/homeView.ts                registerHomeSection, registerMode, homeHooks, renderHome + 5 section lõi    (mới)
src/ui/avatar.ts                  avatar(from): ô chữ cái đầu theo màu phòng ban (chỗ cắm ảnh cho design v2) (mới)
src/ui/celebrate.ts               celebrate(el): hiệu ứng "pop" ngắn, tắt khi reduced-motion                 (mới)
src/ui/topbar.ts                  + NavItem, registerNav, renderNav; class Tailwind                          (sửa)
src/ui/brief.ts, coach.ts, inbox.ts, work.ts, tabs.ts, resultTable.ts, feedback.ts   class Tailwind         (sửa)
src/main.ts                       showRoute, startRouter, renderHome trong rerender, go('play') trong selectTicket (sửa)
src/i18n/vi.ts, en.ts             + nav.*, home.*                                                            (sửa)
tests/theme.test.ts, tests/route.test.ts, tests/home.test.ts                                                 (mới)
tests/i18n.test.ts                + khóa data-i18n trong index.html phải có trong vi                         (sửa)
CLAUDE.md, docs/superpowers/plans/…-1b-…, …-1c-…, …-import.md   ghi chú sau Plan 1d                          (sửa)
```

**Điểm neo Plan 1b/1c/Import được giữ nguyên chữ** (để các plan đó áp được): `h('div', { class: 'actions' }, runBtn, formatBtn, submitBtn)` trong `work.ts`; dòng `byId('xp').textContent = t('top.xp', { n: app.save.xp });` trong `topbar.ts`; dòng chứa `id="inbox-btn"`, dòng chứa `id="inbox-list"`, dòng `<script type="module"`, phần tử `id="map"` (class `map-strip`, thuộc tính `hidden`) trong `index.html`; class `topbar` trên `<header>`; tên hàm `rerender`, `selectTicket`, `complete`, `nextStep`, `loadColumns` và thứ tự `registerCoreTabs(…)` ngay trước `createPanel(…)` trong `main.ts`; `registerTab`/`TabSpec` không đổi. **Điểm neo bị đổi:** dòng `<span id="xp"></span>` (nay có class) — xem mục "Điều chỉnh cho Plan 1b/1c/Import" cuối plan.

---

### Task 0: Kiểm tiền đề (không sửa file)

**Files:** không sửa.

- [ ] **Step 1: Xem ai đã đổi gì từ lúc viết plan**

Run:
```bash
git log --oneline 16d38b1..HEAD -- src index.html vite.config.ts package.json
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
```
Expected: `1`, `1`, `1`, `≥ 4`, `4`, `1`. Nếu dòng nào là `0`: tìm đoạn tương đương trên đĩa (người khác có thể đã đổi tên/định dạng) và ghi chú lại; không tự đặt tên khác cho API của plan này.

- [ ] **Step 3: Kiểm version Tailwind**

Run:
```bash
npm view tailwindcss version
npm view @tailwindcss/vite version
```
Expected: `4.3.5` và `4.3.5`. Nếu đã có bản mới hơn, vẫn cài **4.3.5** (đã chạy thử với vite 8.3.8: `@theme inline`, `source(none)`, `@custom-variant`, biến thể `aria-*`, `dark:` đều hoạt động).

- [ ] **Step 4: Baseline xanh**

Run: `npx tsc --noEmit && npm test`
Expected: `tsc` không lỗi; tất cả test PASS. Nếu đỏ do việc đang làm dở của người khác: dừng và báo, không sửa hộ.

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
Expected: `package.json` có `"tailwindcss": "4.3.5"` và `"@tailwindcss/vite": "4.3.5"` trong `devDependencies` (không có `^`).

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

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: `tsc` không lỗi (`vite.config.ts` nằm trong `include`); tất cả test PASS (plugin chỉ biến đổi CSS, test không import CSS); build in ra một dòng `dist/assets/index-….css`.

- [ ] **Step 5: Kiểm Tailwind thật sự chạy**

Run:
```bash
head -c 70 dist/assets/index-*.css; echo
grep -c "var(--bg)" dist/assets/index-*.css
```
Expected: dòng đầu là `/*! tailwindcss v4.3.5 | MIT License | https://tailwindcss.com */`; số đếm `≥ 1`.

- [ ] **Step 6: Kiểm tay nhanh**

Run: `npm run dev`, mở trang, sáng + tối (DevTools → Rendering → `prefers-color-scheme`). Expected: giao diện như trước Plan 1d (khoảng cách đoạn, danh sách gợi ý có số, nút có viền, dialog Hộp thư ở giữa màn hình); editor gõ và chạy được.

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
  - `interface ChapterColor { bar: string; chip: string; ring: string; text: string }`, `CHAPTER_COLOR: Record<number, ChapterColor>`, `chapterColor(n: number): ChapterColor`
  - `DEPT_COLOR: Record<string, string>`, `deptColor(dept: string): string`
  - hằng class: `CARD`, `PILL`, `DEPT_CHIP`, `BTN_GO`, `BTN_SUBMIT`, `TOP_BTN`, `NAV_LINK`
  - `initials(name: string): string`

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
  /** Coloured text on the panel background. */
  text: string;
}

export const CHAPTER_COLOR: Record<number, ChapterColor> = {
  1: { bar: 'bg-sky-500', chip: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200', ring: 'ring-2 ring-sky-500', text: 'text-sky-800 dark:text-sky-300' },
  2: { bar: 'bg-violet-500', chip: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200', ring: 'ring-2 ring-violet-500', text: 'text-violet-800 dark:text-violet-300' },
  3: { bar: 'bg-amber-500', chip: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200', ring: 'ring-2 ring-amber-500', text: 'text-amber-800 dark:text-amber-300' },
  4: { bar: 'bg-rose-500', chip: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200', ring: 'ring-2 ring-rose-500', text: 'text-rose-800 dark:text-rose-300' },
  5: { bar: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200', ring: 'ring-2 ring-emerald-500', text: 'text-emerald-800 dark:text-emerald-300' },
  6: { bar: 'bg-indigo-500', chip: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200', ring: 'ring-2 ring-indigo-500', text: 'text-indigo-800 dark:text-indigo-300' },
  7: { bar: 'bg-fuchsia-500', chip: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950 dark:text-fuchsia-200', ring: 'ring-2 ring-fuchsia-500', text: 'text-fuchsia-800 dark:text-fuchsia-300' },
};
const NEUTRAL_CHAPTER: ChapterColor = {
  bar: 'bg-slate-500', chip: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100', ring: 'ring-2 ring-slate-500', text: 'text-slate-700 dark:text-slate-300',
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
};
const NEUTRAL_DEPT = 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100';
export const deptColor = (dept: string): string => DEPT_COLOR[dept] ?? NEUTRAL_DEPT;

export const CARD = 'rounded-2xl bg-panel ring-1 ring-line';
export const PILL = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold';
export const DEPT_CHIP = 'rounded-md px-2 py-0.5 text-xs font-bold uppercase';
/** Blue call to action: white on blue-700 = 6.7:1, on blue-600 (dark theme) = 5.2:1. */
export const BTN_GO = 'border-0 bg-blue-700 font-semibold text-white shadow-sm hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700';
/** Green Submit (L17): white on emerald-700 = 5.5:1 (the mockup's emerald-600 is 3.8:1). */
export const BTN_SUBMIT = 'ml-auto border-0 bg-emerald-700 px-4 font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:bg-code disabled:text-disabled';
/** Controls on the gradient top bar: darkening keeps white text >= 4.5:1 at the cyan end. */
export const TOP_BTN = 'border-0 bg-black/20 text-white ring-1 ring-white/40 hover:bg-black/30';
/** Darkening overlays (like TOP_BTN): the nav wraps and can sit over the cyan end, where lightening drops white text under 4.5:1. */
export const NAV_LINK = 'rounded-lg px-3 py-1.5 text-white no-underline hover:bg-black/20 aria-[current=page]:bg-black/30 aria-[current=page]:font-semibold aria-[current=page]:ring-1 aria-[current=page]:ring-white/60';

/** "Lê Bình" → "LB": avatar placeholder until design v2 brings portraits. */
export function initials(name: string): string {
  const w = name.trim().split(/\s+/).filter(Boolean);
  return (w.length > 1 ? w[0][0] + w[w.length - 1][0] : w[0]?.[0] ?? '').toUpperCase();
}
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `npx vitest run tests/theme.test.ts && npx tsc --noEmit`
Expected: 5 test PASS; `tsc` không lỗi.

- [ ] **Step 5: Commit**

```bash
git add src/theme.ts tests/theme.test.ts
git commit -m "feat(ui): chapter and department colour maps as literal Tailwind classes"
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
Expected: 5 test PASS; `tsc` không lỗi.

- [ ] **Step 5: Commit**

```bash
git add src/route.ts tests/route.test.ts
git commit -m "feat: hash route model (home, play) with remembered last route"
```

---

### Task 4: View-model Trang chủ (`src/home.ts`)

Mọi số trên Trang chủ được **tính lại từ save + ticket** (không lưu thêm gì). Tổng ticket lấy từ `tickets.length` (15 bây giờ, 35 khi có Plan 2/3), không gắn cứng. Không bịa dữ liệu: không có tên người chơi; chương 4–7 chưa có kỹ năng thì card không hiện dòng kỹ năng.

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
Expected: 5 test PASS; `tsc` không lỗi.

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
  - Section lõi theo `order`: `continue` (10, wide), `side` (20, narrow — "Thành tích"; Plan 1c thay bằng "Ôn hôm nay" cùng id), `chapters` (30, full), `skills` (40, full), `modes` (50, full; trả `null` khi chưa có mode nào → card Sandbox / Dữ liệu của tôi / Sổ tay chỉ hiện khi Plan 1c / Import đăng ký)
  - Khóa i18n `nav.label`, `nav.home`, `nav.play`, `home.*`

Mở rộng của design v2 (avatar người giao việc, rank, streak, banner truyện…) = một lời gọi `registerHomeSection({ id, order, span, render })` trong file riêng của nó; không cần sửa `homeView.ts`.

- [ ] **Step 1: Thêm khóa i18n**

Trong `src/i18n/vi.ts`, ngay sau dòng `'area.splitRow': 'Chiều cao panel kết quả',` thêm:
```ts
  'nav.label': 'Điều hướng chính',
  'nav.home': 'Trang chủ',
  'nav.play': 'Làm bài',
  'home.kicker': 'Chương {n} · {title}',
  'home.continue': 'Tiếp tục ticket "{title}"?',
  'home.from': '{name} ({dept}) đang chờ kết quả của bạn.',
  'home.progress': '{done}/{total} ticket',
  'home.resume': '▶ Tiếp tục',
  'home.stats': 'Thành tích',
  'home.learned': '{n} kỹ năng đã học',
  'home.chapters': 'Hành trình {n} chương',
  'home.chaptersIntro': 'Mỗi chương mở thêm phòng ban và bảng dữ liệu.',
  'home.status.done': 'Xong',
  'home.status.current': 'Đang học',
  'home.status.locked': 'Chưa mở',
  'home.status.soon': 'Sắp có',
  'home.boss': '{done}/{total} ticket · 🏆 Boss "{title}"',
  'home.lockedAfter': 'Mở sau boss chương {n}',
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
  'home.continue': 'Continue the ticket "{title}"?',
  'home.from': '{name} ({dept}) is waiting for your answer.',
  'home.progress': '{done}/{total} tickets',
  'home.resume': '▶ Continue',
  'home.stats': 'Achievements',
  'home.learned': count('skill learned', 'skills learned'),
  'home.chapters': 'A {n}-chapter journey',
  'home.chaptersIntro': 'Each chapter opens new departments and data tables.',
  'home.status.done': 'Done',
  'home.status.current': 'In progress',
  'home.status.locked': 'Locked',
  'home.status.soon': 'Coming soon',
  'home.boss': '{done}/{total} tickets · 🏆 Boss "{title}"',
  'home.lockedAfter': 'Opens after the chapter {n} boss',
  'home.skills': 'Skill topics',
  'home.skillsHint': 'Each bar is a memory level; a newly learned skill starts at level 1.',
  'home.skillLearned': 'Learned',
  'home.skillOpen': 'Not learned yet',
  'home.level': 'Memory level {n}/{max}',
  'home.modes': 'Other modes',
```
(`count` là helper số ít/số nhiều đã có ở đầu `en.ts`.)

- [ ] **Step 2: Chạy kiểm kiểu và test i18n**

Run: `npx tsc --noEmit && npx vitest run tests/i18n.test.ts`
Expected: `tsc` không lỗi (`en` đủ khóa); test PASS (placeholder khớp, không khóa mới nào VI = EN).

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
import { homeModel, LEVELS, type ChapterCard, type ChapterStatus, type HomeModel, type SkillCard } from '../home';
import { getLang, t, type Key } from '../i18n';
import { CHAPTERS, chapterTitle, SKILLS } from '../progress';
import { actions, app, done } from '../state';
import { BTN_GO, CARD, chapterColor, cx, PILL } from '../theme';
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
const STATUS: Record<ChapterStatus, Key> = {
  done: 'home.status.done', current: 'home.status.current', locked: 'home.status.locked', soon: 'home.status.soon',
};
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

/** Narrow card beside "Continue". Plan 1c replaces it (same id 'side') with "Review today". */
function sideCard(m: HomeModel): HTMLElement {
  return h('section', {
    class: 'flex h-full flex-col gap-2 rounded-2xl bg-linear-to-br from-emerald-700 to-teal-800 p-6 text-white',
    'aria-labelledby': 'side-title',
  },
    h('h2', { id: 'side-title', class: 'm-0 text-sm font-semibold' }, t('home.stats')),
    h('p', { class: 'm-0 text-4xl font-bold' }, t('top.xp', { n: app.save.xp })),
    h('p', { class: 'm-0' }, t('home.learned', { n: m.learned })),
    h('p', { class: 'm-0' }, t('home.progress', { done: m.done, total: m.total })));
}

function statusView(c: ChapterCard): HTMLElement {
  if (c.status === 'done') return h('span', { class: 'text-sm font-semibold text-good' }, `✓ ${t(STATUS.done)}`);
  if (c.status === 'current') return h('span', { class: cx('text-sm font-semibold', chapterColor(c.chapter).text) }, t(STATUS.current));
  if (c.status === 'locked') return h('span', { class: 'text-sm text-muted', role: 'img', 'aria-label': t(STATUS.locked) }, '🔒');
  return h('span', { class: 'text-sm text-muted' }, t(STATUS.soon));
}

function chapterCard(c: ChapterCard): HTMLElement {
  const lang = getLang();
  const color = chapterColor(c.chapter);
  const foot =
    c.status === 'done' && c.boss ? t('home.boss', { done: c.done, total: c.total, title: textOf(c.boss, lang).title })
      : c.status === 'locked' ? t('home.lockedAfter', { n: c.chapter - 1 })
        : c.status === 'current' ? t('home.progress', { done: c.done, total: c.total })
          : '';
  return h('article', {
    class: cx('overflow-hidden rounded-2xl bg-panel', c.status === 'current' ? cx(color.ring, 'shadow-md') : 'ring-1 ring-line'),
    'aria-current': c.status === 'current' ? 'step' : false,
  },
    h('div', { class: cx('h-2', color.bar) }),
    h('div', { class: 'space-y-2 p-4' },
      h('div', { class: 'flex items-center justify-between' },
        h('span', { class: cx(PILL, 'uppercase', color.chip) }, t('brief.chapter', { n: c.chapter })),
        statusView(c)),
      h('h3', { class: 'm-0 font-bold' }, chapterTitle(c.chapter, lang)),
      c.skills.length ? h('p', { class: 'm-0 text-sm text-muted' }, c.skills.map((s) => s.label[lang]).join(' · ')) : null,
      c.total ? progress(percent(c.done, c.total), t('home.progress', { done: c.done, total: c.total }), 'h-1.5 bg-code', color.bar) : null,
      foot ? h('p', { class: 'm-0 text-xs text-muted' }, foot) : null));
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
    h('span', { class: 'mt-2 block text-xs text-muted' },
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
    h('p', { class: 'mt-2 mb-0 text-xs text-muted' }, t('home.skillsHint')));
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

Run: `npx tsc --noEmit && npm test`
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

1. Dòng import đầu file, thêm:
```ts
import { readFileSync } from 'node:fs';
```
2. Trong `describe('từ điển i18n', …)`, thêm test cuối:
```ts
  it('mọi khóa data-i18n / data-i18n-aria trong index.html có trong vi', () => {
    const html = readFileSync('index.html', 'utf8');
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
  renderHome(byId('home'));
```
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

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: `tsc` không lỗi; tất cả test PASS (gồm test `data-i18n` mới); build OK.

Run:
```bash
for c in 'from-indigo-700' 'to-cyan-700' 'aria-pressed\:bg-white' 'aria-\[current\=page\]\:bg-black\/30' 'bg-sky-500' 'bg-fuchsia-500' 'lg\:col-span-2' 'shell\:overflow-auto' 'bg-linear-to-r'; do printf '%s ' "$c"; grep -cF "$c" dist/assets/index-*.css; done
```
Expected: mỗi dòng in `1` (class từ `index.html`, `theme.ts` và `homeView.ts` đều được scanner tìm thấy).

- [ ] **Step 8: Kiểm tay**

Run: `npm run dev`, mở `http://localhost:5173/` (xóa key `cargo-query/route` trong Local Storage trước).
1. Không có hash → URL thành `/#/`, hiện Trang chủ: card "Tiếp tục ticket …?" với thanh `0/15 ticket`, card xanh lá "Thành tích", lưới 7 chương (chương 1 viền sky + "Đang học", chương 2–3 🔒 "Mở sau boss chương n", chương 4–7 "Sắp có"), lưới kỹ năng (chương 1 "Chưa học", chương 2–3 🔒). **Không** có mục "Chế độ khác".
2. Bấm "▶ Tiếp tục" → `#/play`, màn làm bài như cũ, focus ở tiêu đề đề bài, editor vẽ đúng (gutter, chữ, con trỏ). Back → Trang chủ, Forward → lại màn làm bài; editor giữ nguyên nội dung và undo.
3. Nav "Trang chủ" / "Làm bài": mục hiện tại nền tối hơn, chữ đậm, viền trắng mảnh (`aria-current="page"`); Tab tới được; Enter chuyển route.
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
| `h('li', {}, labels[i] ? …` (trong `shapeCard`) | `h('li', { class: 'rounded-md bg-panel px-1.5 py-0.5 text-[13px] ring-1 ring-line' }, labels[i] ? …` (giữ nguyên phần sau `{ … },`) |

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
      h('p', { class: 'm-0 flex flex-wrap items-center gap-2 text-[13px] text-muted' },
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

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: không lỗi; tất cả test PASS; build OK. Thêm: `grep -cF "bg-pink-100" dist/assets/index-*.css` → `1` (màu phòng Sales từ `theme.ts`).

- [ ] **Step 6: Kiểm tay**

`npm run dev`, `#/play`, sáng + tối:
1. Đầu đề: ô tròn chữ cái đầu (màu phòng ban), chip phòng ban viết hoa (Ops xanh dương, Sales hồng, Customs hổ phách, CS teal, Management tím, Finance xanh lá), tên · chương · sao, pill beat theo màu chương, rồi tiêu đề.
2. Khung "Yêu cầu" viền trái xanh; thẻ "Kết quả mong đợi" có các ô cột; gợi ý đánh số 1., 2.; ticket boss có khung bước và (khi xong các bước) khung kết luận viền accent, chọn sai báo chữ đỏ.
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

Trong `tests/theme.test.ts`, thêm import ở đầu file:
```ts
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
```
và test cuối trong `describe('theme', …)`:
```ts
  it('src không ghép class bằng template literal hay mảnh tên (scanner Tailwind chỉ thấy tên nguyên vẹn)', () => {
    const files = readdirSync('src', { recursive: true }).map(String).filter((f) => f.endsWith('.ts'));
    const bad = files.flatMap((f) => readFileSync(join('src', f), 'utf8').split('\n')
      .map((line, i) => `${f.replaceAll('\\', '/')}:${i + 1}: ${line.trim()}`)
      .filter((line) => /\bclass(Name)?\s*[:=]\s*`/.test(line) || /\b(bg|text|ring|border|from|via|to|fill|stroke)-\$\{/.test(line)));
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
        h('span', { class: 'flex items-center gap-2 text-[13px] text-muted' },
          avatar(tk.from), h('span', { class: cx(DEPT_CHIP, deptColor(tk.from.dept)) }, tk.from.dept), tk.from.name),
        h('span', { class: 'mt-1 block font-semibold' }, textOf(tk, lang).title),
        h('span', { class: 'block text-[13px] text-muted' }, isDone ? …
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

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: test quét class PASS (danh sách rỗng); tất cả test PASS; build OK. Thêm: `grep -cF "bg-emerald-700" dist/assets/index-*.css` → `1`; `grep -cF "animate-pop" dist/assets/index-*.css` → `1`.

- [ ] **Step 7: Kiểm tay**

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

và trong `schemaList()`: `h('h3', {}, table),` → `h('h3', { class: 'm-0' }, table),`; `h('ul', {}, ...app.columns[table]` → `h('ul', { class: 'mt-1 mb-2 list-none pl-2 text-[13px]' }, ...app.columns[table]`.

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

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: không lỗi; tất cả test PASS; build OK.

Run:
```bash
for c in 'aria-selected\:border-blue-600' 'dark\:aria-selected\:text-blue-300' 'max-sm\:overflow-x-auto' 'grid-cols-\[repeat' 'max-h-\[420px\]' 'aria-\[current\=true\]\:shadow' 'bg-violet-500' 'bg-amber-500' 'bg-rose-500' 'bg-emerald-500' 'bg-indigo-500' 'bg-teal-100'; do printf '%s ' "$c"; grep -cF "$c" dist/assets/index-*.css; done
```
Expected: mỗi dòng in `1`. Dòng nào in `0` = class đó không ở dạng chuỗi nguyên vẹn trong `src/**/*.ts` hoặc `index.html` → sửa nguồn, không thêm safelist.

- [ ] **Step 6: Kiểm tay**

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

### Task 10: Ghi chú dự án, điều chỉnh cho Plan 1b/1c/Import, kiểm tổng

**Files:**
- Modify: `CLAUDE.md`, `docs/superpowers/plans/2026-11-16-cargo-query-plan-1b-visualization.md`, `docs/superpowers/plans/2026-11-16-cargo-query-plan-1c-product.md`, `docs/superpowers/plans/2026-11-16-cargo-query-plan-import.md`

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

- [ ] **Step 2: Chèn ghi chú "Sau Plan 1d" vào ba plan sau**

Trong mỗi file plan dưới đây, chèn khối tương ứng **ngay trước** dòng `## Global Constraints` đầu tiên.

`docs/superpowers/plans/2026-11-16-cargo-query-plan-1b-visualization.md`:
```markdown
> **Sau Plan 1d (Tailwind + Trang chủ, L17) — điều chỉnh khi thực hiện:**
> - `registerTab`/`TabSpec` không đổi; tab tự có kiểu mới (gạch chân theo `aria-selected`). Hàng nút vẫn là `h('div', { class: 'actions' }, runBtn, formatBtn, submitBtn)` (nay nằm trong một div bọc dính đáy): chèn `explainBtn` sau `runBtn` như cũ.
> - Các bước "Thêm CSS vào cuối `src/style.css`" vẫn dùng được (token `var(--…)` và class `.muted .stale .error pre.sql .actions button.primary .tag .warn` còn nguyên). Ưu tiên viết class Tailwind ngay trong `h()`; khi đó class phải là chuỗi nguyên vẹn (map tên đầy đủ, nối bằng `cx()` từ `src/theme.ts`) — `tests/theme.test.ts` chặn `` class: `…${x}` ``.
> - Preflight làm `svg` thành `display: block`: SVG nằm giữa dòng chữ cần class `inline`.
> - Task 7 (dải bản đồ `#map`): `#map` nằm ngoài `#shell` nên sẽ hiện cả ở Trang chủ. Dòng đầu của `syncMap()` thêm `document.getElementById('map')!.hidden = currentRoute() !== 'play';` rồi `return` khi ẩn (import `currentRoute` từ `./ui/router`); `showRoute()` gọi `rerender()` nên `syncMap()` chạy mỗi lần đổi route. `RouteMap.celebrate()` có thể gọi `celebrate()` của `src/ui/celebrate.ts`.
```

`docs/superpowers/plans/2026-11-16-cargo-query-plan-1c-product.md`:
```markdown
> **Sau Plan 1d (Tailwind + Trang chủ, L17) — điều chỉnh khi thực hiện:**
> - Task 0, bảng điểm neo `index.html`: dòng XP nay là `<span id="xp" class="rounded-full bg-amber-400 px-3 py-1 font-semibold text-amber-950"></span>`. Task 8 Step 6a: xóa **dòng chứa `id="xp"`**. Task 8 Step 6b: thêm `class="… text-white"` cho `#progress` và `class="border-0 bg-black/20 text-white ring-1 ring-white/40 hover:bg-black/30"` cho `#skills-btn` (Task 9: `#notebook-btn` cũng vậy). Dòng `byId('xp').textContent = …` trong `topbar.ts` vẫn còn để xóa.
> - `selectTicket()` nay gọi `go('play')`; `enter(mode)` trong `src/ui/modes.ts` cũng gọi `go('play')` (import từ `./router`) để vào Luyện tập/Sandbox từ Trang chủ.
> - Nav: đăng ký Luyện tập/Sandbox bằng `registerNav({ id: 'practice', order: 30, label: 'nav.practice', href: hashOf('play'), current: (r) => r === 'play' && session.mode.kind === 'practice', onclick: startToday })` và `{ id: 'sandbox', order: 40, … onclick: startSandbox }`; đăng ký lại `{ id: 'play', order: 20, label: 'nav.play', href: hashOf('play'), current: (r) => r === 'play' && session.mode.kind === 'story', onclick: backToStory }` (cùng id thì thay thế). Khóa `nav.practice`, `nav.sandbox` thêm vào vi/en; "Sandbox" giống nhau hai ngôn ngữ → thêm khóa vào `SAME_OK`.
> - Trang chủ: `registerHomeSection({ id: 'side', order: 20, span: 'narrow', render: reviewCard })` thay card "Thành tích" bằng "Ôn hôm nay" (`startToday`, `go('play')`); `homeHooks.levelOf = (id) => app.save.review[id]?.box ?? 1`; `homeHooks.onSkill = (id) => { startSkill(id); go('play'); }`. Card chế độ: `registerMode({ id: 'sandbox', order: 10, icon: '🧪', tint: 'bg-orange-100 dark:bg-orange-950', title: 'mode.sandbox', desc: 'mode.sandboxDesc', open: () => { startSandbox(); go('play'); } })` và `registerMode({ id: 'notebook', order: 30, icon: '📒', tint: 'bg-fuchsia-100 dark:bg-fuchsia-950', title: 'mode.notebook', desc: 'mode.notebookDesc', open: () => toggleNotebook(document.getElementById('notebook-dialog') as HTMLDialogElement) })` (khóa `mode.*` thêm vào vi/en). Không tạo trùng logic `learnedSkills` trong `src/home.ts`.
> - CSS "thêm vào cuối `src/style.css`" vẫn chạy (token và class chung còn nguyên; `.topbar` vẫn là class của header). Class Tailwind viết trong `.ts` phải là chuỗi nguyên vẹn (`cx()`), không `` `chip ${x}` ``.
```

`docs/superpowers/plans/2026-11-16-cargo-query-plan-import.md`:
```markdown
> **Sau Plan 1d (Tailwind + Trang chủ, L17) — điều chỉnh khi thực hiện:**
> - Task 6 Step 5: ở khối cuối `main.ts` thêm card "Dữ liệu của tôi": `registerMode({ id: 'mydata', order: 20, icon: '📂', tint: 'bg-cyan-100 dark:bg-cyan-950', title: 'mode.mydata', desc: 'mode.mydataDesc', open: () => { startSandbox(); go('play'); } })` (import `registerMode` từ `./ui/homeView`, `go` từ `./ui/router`, `startSandbox` từ `./ui/modes`; khóa `mode.mydata*` thêm vào vi/en).
> - Task 6 Step 6: bỏ rule `.visually-hidden`, dùng class Tailwind `sr-only` cho ô `input[type=file]`. Các rule `.mydata*` còn lại vẫn dùng được (token còn nguyên); ưu tiên chuyển thành class Tailwind nguyên vẹn trong `myDataView.ts`.
```

- [ ] **Step 3: Kiểm tổng**

Run:
```bash
npx tsc --noEmit && npm test && npm run build
```
Expected: `tsc` không lỗi; tất cả test PASS (gồm `theme`, `route`, `home`, `i18n` mới); build OK, có một file `dist/assets/index-*.css`.

Run:
```bash
grep -rnE "\.innerHTML\s*=|insertAdjacentHTML" src; echo "exit=$?"
```
Expected: không dòng nào, `exit=1`.

- [ ] **Step 4: Checklist trình duyệt (bắt buộc, ghi kết quả vào mô tả commit/PR)**

`npm run dev` (và một lần với `npm run preview` sau build). Với **mỗi** dòng dưới đây, kiểm ở **sáng** và **tối** (DevTools → Rendering → Emulate `prefers-color-scheme`):

Kích thước:
- [ ] ≥ 1024×700 (ví dụ 1280×800): màn làm bài vừa một màn hình, mỗi vùng tự cuộn; hai thanh chia kéo được, ←/→/↑/↓/Home/End hoạt động, nhấp đúp về mặc định; hover/focus thanh chia hiện nền accent nhạt. Trang chủ cuộn trong vùng của nó (topbar đứng yên).
- [ ] < 900px (ví dụ 820×1000) và 375×740: một cột, topbar và nav xuống dòng không tràn ngang (`document.documentElement.scrollWidth === innerWidth`), lưới chương 2 cột (≥ 640) hoặc 1 cột, hàng nút Chạy/Nộp dính đáy (< 640), thanh tab cuộn ngang.

Bàn phím (không chuột):
- [ ] Tab từ đầu trang: logo không nhận focus → Trang chủ → Làm bài → XP (không) → Hộp thư → VI → EN → Xuất → Nhập (viền trắng trên nhãn) → (nội dung). Mọi phần tử focus có viền rõ (trắng trên topbar, accent ở nơi khác).
- [ ] Trang chủ: Tab tới "▶ Tiếp tục", "Hộp thư"; Enter chạy đúng. Đổi route bằng nav → focus về tiêu đề vùng mới (`#home-title` ẩn với mắt nhưng screen reader đọc "Trang chủ"; `#brief-title` ở màn làm bài).
- [ ] Back/Forward của trình duyệt chuyển route; tải lại giữ route; Ctrl+Enter ở Trang chủ không chạy gì.
- [ ] Dialog Hộp thư: mở bằng Enter, Esc đóng, focus trở lại nút.

Tương phản (DevTools → Inspect → Accessibility pane hoặc axe DevTools; tất cả ≥ 4.5:1 cho chữ thường):
- [ ] Topbar: chữ trắng trên cả ba điểm gradient (indigo-700, blue-700, cyan-700; dark: -950); nút `bg-black/20`; VI/EN đang chọn (blue-800 trên trắng).
- [ ] Nút Nộp (trắng/emerald-700), nút Tiếp tục (trắng/blue-700, dark blue-600), card Thành tích (trắng/emerald-700→teal-800).
- [ ] Chip chương (-800/-100, dark -200/-950), chip phòng ban, trạng thái "✓ Xong" (`--good`), "Đang học" (màu chương -800/-300), "Sắp có"/🔒/"Mở sau…" (`--muted`).
- [ ] Phản hồi xanh/hồng, Recap, tab đang mở (blue-700 / blue-300), chữ xám tab chưa mở.
- [ ] Trạng thái hover/disabled không làm chữ dưới 4.5:1 (nút Nộp lúc đang chạy dùng `--disabled` trên `--code`: là trạng thái vô hiệu, WCAG không yêu cầu).

Chức năng không đổi:
- [ ] Làm trọn `ch1-01` → `ch1-05` (cả boss 3 bước + kết luận): Nộp, Recap, "Ticket tiếp theo", coach mark, gợi ý, lịch sử, Xuất/Nhập tiến độ, banner thông báo (thử chặn localStorage để thấy `save.writeFailed`) đều chạy như trước. Về Trang chủ: chương 1 "✓ Xong" + "🏆 Boss …", chương 2 "Đang học", kỹ năng chương 1 có 1 vạch màu.
- [ ] VI ↔ EN ở cả hai route: không còn chuỗi VI khi ở EN; editor giữ nội dung.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md docs/superpowers/plans/2026-11-16-cargo-query-plan-1b-visualization.md docs/superpowers/plans/2026-11-16-cargo-query-plan-1c-product.md docs/superpowers/plans/2026-11-16-cargo-query-plan-import.md
git commit -m "docs: Tailwind + Home architecture notes and Plan 1d adjustments for 1b/1c/Import"
```

---

## Điều chỉnh cho Plan 1b/1c/Import (tóm tắt)

| Plan | Điểm neo / hook | Thay đổi sau Plan 1d |
|---|---|---|
| 1b T2 | `h('div', { class: 'actions' }, runBtn, …` trong `work.ts` | Giữ nguyên chữ (đã bọc trong div dính đáy) → chèn `explainBtn` như cũ |
| 1b T2–T7 | `registerTab`, CSS thêm cuối `style.css` | Không đổi; token + class chung còn; class Tailwind mới phải nguyên vẹn (`cx()`); SVG giữa dòng cần `inline` |
| 1b T7 | `#map` | Ẩn khi `currentRoute() !== 'play'` trong `syncMap()` |
| 1c T0/T8 | `<span id="xp"></span>` | Nay có class → xóa "dòng chứa `id="xp"`"; nút/nhãn mới trên topbar dùng class `TOP_BTN` |
| 1c T7 | `enter(mode)`, `renderModes` | `enter` gọi `go('play')`; nav Luyện tập/Sandbox qua `registerNav`; đăng ký lại `play` theo `session.mode` |
| 1c T3/T4/T7/T9 | Leitner, "Ôn hôm nay", Sandbox, Sổ tay | `homeHooks.levelOf`, `homeHooks.onSkill`, `registerHomeSection({ id: 'side', … })`, `registerMode` sandbox/notebook |
| Import T6 | khối cuối `main.ts`, `.visually-hidden` | `registerMode` mydata; dùng `sr-only` |
| Design v2 (đang viết) | Trang chủ, đề bài, mừng | Thêm section qua `registerHomeSection`; chân dung trong `avatar()`; hiệu ứng trong `celebrate()` |
