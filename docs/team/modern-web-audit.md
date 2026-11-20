# Modern web audit (2026-11-20)

## Tóm tắt (VI)

- Kết luận: BoonData **đã khá hiện đại**. Không có pattern cũ nào cần sửa gấp. `legacy-scan` báo 12 mục trên `main` (24 mục trên worktree v22 `int-wt`). Sau khi đối chiếu rubric keepWhen/dropWhen thì **không còn mục nào phải sửa ngay**.
- Lý do bỏ các mục của scan:
  - 10/12 mục là `toSorted()`/`toReversed()`. Rubric loại chúng vì `tsconfig` đang ở `lib: ES2022`.
  - Mục `showModal()` của hộp thư và mục stagger `:nth-child` đều dùng tính năng mới chỉ ở mức "Newly available". Guide bắt buộc giữ polyfill hoặc fallback, nên phần đang có chính là fallback đó.
- Thắng nhỏ, đáng làm (S):
  - nâng `lib` lên ES2023 rồi dùng `toSorted`/`toReversed` (~23 chỗ);
  - thêm `{ cause: e }` khi bọc lỗi trong `src/engine/mongo/runner.ts` (v22).
- Để sau, chờ Baseline: `closedby="any"` thay `initLightDismiss`, anchor positioning thay `place()` của menu lĩnh vực và tooltip rail, invoker commands (`commandfor`), `sibling-index()`.
- Đã hiện đại sẵn:
  - Popover API + `popovertarget`, `<dialog>` + `showModal()`, `:modal`, `:has()`;
  - container queries, `color-scheme` cho mỗi theme, `scrollbar-width`/`scrollbar-color`, `scrollbar-gutter`, `text-wrap: balance/pretty`;
  - reduced motion (CSS + `reducedMotion()`), ARIA tablist có roving tabindex;
  - `navigator.clipboard.writeText` + fallback, `requestIdleCallback` + fallback, `ResizeObserver`, IndexedDB thuần;
  - service worker viết tay, precache theo phiên bản.
- Giới hạn: `legacy-scan` chỉ kiểm khoảng 20% catalog (52 rule / 38 guide) và chỉ quét `src/`, không quét `index.html` hay `public/`. Các mục còn lại được kiểm tay bằng `search` + `retrieve` (danh sách ở cuối).

## Method

1. `npx modern-web-guidance@latest legacy-scan src --json` on `main` (b5f5b35). I ran it again in the v22 integration worktree `int-wt` (1f7f21a), which adds `src/engine/` and the Database Engine UI.
2. I checked each finding against its rubric and read the code.
3. I spot-checked these areas by hand with `search` + `retrieve`:
   - dialogs and popovers, light dismiss, anchor positioning;
   - intrinsic-size animation, view transitions, dark mode;
   - tabs, dates, clipboard, INP, scrollbars, accordion;
   - IndexedDB and the service worker.
4. The browser support status below is quoted from each guide's "Fallback strategies" section, not from memory.

Browser support policy: CLAUDE.md does not state one, so I used the guides' default. Anything below "Baseline Widely available" needs the fallback the guide mandates. Where the current code *is* that fallback, modernizing adds a second code path, so the recommendation is **keep**.

## Findings, ranked

### 1. Copying array methods (`js/copying-array-methods`): optional modernization, S

- **Where (main):**
  - `src/learn.ts:105`, `src/routesSeen.ts:32`
  - `src/ui/brief.ts:308`, `src/ui/dashboard.ts:349`, `src/ui/drillBrief.ts:243`, `src/ui/inbox.ts:22`, `src/ui/tabs.ts:62`
  - `src/ui/vizTabs.ts:143`, `src/ui/vizTabs.ts:149`
  - `src/viz/erd.ts:82`
- **Where (int-wt, in addition):**
  - `engine/dynamo/grade.ts:32`, `engine/dynamo/runner.ts:48`
  - `engine/mongo/engineMongo.ts:136,167`, `engine/mongo/grade.ts:47-48`
  - `engine/viz/engineVizNosql.ts:90`, `engine/viz/pgIndex.ts:37,182`
  - `ui/mapTeach.ts:190`
  - in int-wt, `ui/tabs.ts` is at line 63 and `ui/vizTabs.ts` at lines 165/171
- **Current:** `[...arr].sort()` / `[...arr].reverse()` / `arr.slice().sort()`.
- **Modern:** `arr.toSorted()` / `arr.toReversed()`.
- **Status:** ES2023, supported by every evergreen browser.
- **Verdict:** the scan finding is **dropped**. The rubric's dropWhen says "tsconfig lib/target older than ES2023", and both trees use `lib: ["ES2022", …]`, so `toSorted` would fail `tsc`.
- **Recommendation:** modernize only as one sweep. Bump `lib` to `ES2023` in `tsconfig.json`, then replace the copies. Do not do it piecemeal. The Vitest/Node runtime already supports these methods.
- **Risk:** low. The result is the same, and no test depends on the copy idiom. Run `npx tsc --noEmit` plus the full suite.

### 2. Error cause (`js/error-cause`), int-wt only: modernize, S

- **Where:** `src/engine/mongo/runner.ts:31` (and the sibling lines 32-33).
- **Current:** `throw new Error(\`${e.message}${…}\`)` wraps a `MongoSyntaxError` / `LabTimeoutError` / `LabFailedError` and drops the original.
- **Modern:** `new Error(msg, { cause: e })`.
- **Status:** ES2022, already within `lib`.
- **Verdict:** kept. This is not a trust boundary: the worker boundary is in `client.ts`, and the runner only translates the text for the UI. The `.message` stays the same.
- **Risk:** none that I found. `tests/mongoClient.test.ts` asserts the client's errors, not the runner's.

### 3. Dialog open listener (`declarative-dialog-popover-control`): keep

- **Where:** `src/main.ts:509` (int-wt `:513`), `byId('inbox-btn').addEventListener('click', () => …showModal())`.
- **Modern:** `<button commandfor="inbox-dialog" command="show-modal">`.
- **Status:** Invoker commands are "Newly available. It's been Baseline since 2025-12-12". The guide says you **MUST** load `invokers-polyfill` behind a `commandForElement` check.
- **Why keep:**
  - The polyfill plus feature detection costs more than the one line it would replace.
  - The `⋯` menu's `data-proxy` copy presses `#inbox-btn` with `.click()`. That works with either approach, but `aria-expanded` would then need handling by hand under the polyfill.
  - `tests/axe.test.ts` opens the inbox in jsdom, which has no `commandfor`.
- **Revisit** when invoker commands reach Widely available (around mid-2028).

### 4. Stagger delays (`dynamic-sibling-animations`): keep

- **Where:** `src/style.css:455-459` (int-wt `:446`), the `#home .cq-enter > :nth-child(2..5)` delays plus a cap at `:nth-child(n+6)`.
- **Modern:** `animation-delay: calc(sibling-index() * 40ms)`.
- **Status:** "Newly available. It's been Baseline since 2026-08-18". The guide mandates `@supports` gating, with the `:nth-child` rules kept inside `@supports not (…)`.
- **Why keep:**
  - The rewrite would be more CSS, not less.
  - The current rules cap the delay at 200 ms (v6 E2), so a plain `sibling-index()` would need a `min()` as well.
  - The rules are already opacity-only and reduced-motion-safe (L110).
- **Risk if changed:** `tests/mascots.test.ts` scans `cq-*` keyframes and durations.

### 5. Backdrop light dismiss (`light-dismiss-a-dialog`): keep, revisit

- **Where:** `src/ui/dom.ts:83-97` (`initLightDismiss`, `lightDismissable`, `outsideBox`).
- **Modern:** `<dialog closedby="any">`.
- **Status:** "Browser support for <dialog closedby>: Limited availability" (Chrome/Edge 134, Firefox 141, no Safari). The guide **mandates** an outside-click JS fallback, which is what `initLightDismiss` is.
- **Why keep:**
  - The current code already does more than the guide's fallback: press and release must both land on the backdrop (L140), and it goes through a cancelable `cancel` so each dialog's handlers run.
  - The welcome dialog opts out with `data-no-light-dismiss`, which would become `closedby="closerequest"`.
- **Later (M):** once Safari ships `closedby`, set the attribute per dialog and keep `initLightDismiss` only behind `!('closedBy' in HTMLDialogElement.prototype)`.
- **Risk:** `tests/lightDismiss.test.ts` and `tests/axe.test.ts`.

### 6. Domain menu and rail tooltip positioning (`viewport-aware-dropdowns`, `anchor-positioning-tab-underline`): keep

- **Where:**
  - `src/ui/topbar.ts:158-168`: `place()` uses `getBoundingClientRect` plus a `resize` listener to put the `#domain-menu` popover under its chip, clamped to the viewport.
  - `src/ui/sidebar.ts:229-268`: a fixed `#side-tip` tooltip placed with `getBoundingClientRect`.
- **Modern:** CSS anchor positioning (`anchor-name` / `position-anchor` / `position-area` + `position-try-fallbacks`). For the tooltip, `popover="hint"` plus anchoring.
- **Status:** "Browser support for Anchor positioning: Limited availability". The guide mandates a `CSS.supports('anchor-name: --a')`-gated polyfill or `@supports` gating.
- **Why keep:**
  - The JS is roughly 10 lines per site, and it would remain as the fallback anyway.
  - The tooltip also carries L93 logic (it stays quiet until the pointer moves), which CSS cannot express.
- **Later (M):** once Widely available, `#domain-menu { position-anchor: --domain; position-area: block-end span-inline-end; position-try-fallbacks: flip-inline; }` would delete `place()` and the resize listener.
- **Risk:** `tests/topbar.test.ts`, `tests/topbarName.test.ts`.

### 7. Page entry fade vs view transitions (`same-document-transitions`): keep

- **Where:** `src/style.css:454` `.cq-enter`, `#home[data-enter]` (L110).
- **Modern:** `document.startViewTransition()`.
- **Status:** "Newly available. It's been Baseline since 2025-10-14".
- **Why keep:**
  - The fade is opacity-only by design (L93: no transform on cards or links), runs once per route change, and never on a redraw.
  - A view transition would snapshot the whole `#home`, interact with the always-mounted views, and add little.

### 8. Sidebar expand animation (`animate-to-intrinsic-sizes`): not applicable

- **Where:** `src/style.css:230`, `#side { transition: width 200ms … }`.
- **Why not applicable:** it animates between two fixed lengths (64 ↔ 256 px), so `interpolate-size` / `calc-size()` is not needed. Those properties also have "Limited availability" (Chrome/Edge 129 only).
- **Note:** `int-wt` does not have the L190 sidebar transition (its `style.css` diff against main removes it). It branched before L190, so watch the merge.

### 9. INP and `rerender()` (`break-up-long-tasks`): not measured

- I found no `smoke-out/perf-report.json`, so there is no long-task evidence for `rerender()`.
- `scheduler.yield()` is "Unsupported in: Safari" and needs a `setTimeout` fallback.
- Run `SMOKE_PERF=3 npm run smoke` first, and only act if `rerender()` shows long tasks over 50 ms.
- Heavy work already runs off the main thread in the PGlite worker.

## Checked and already modern (no action)

| Area | Where | Notes |
|---|---|---|
| Popover API | `index.html` `#more-menu`, `#domain-menu` (`popover`, `popovertarget`, `popovertargetaction="hide"`) | Native light dismiss and Esc. `:popover-open` is guarded with try/catch (`ui/coach.ts:185`, `ui/topbar.ts:167`). |
| `<dialog>` + `showModal()` | inbox, map, lesson, welcome, side drawer | `:modal` is used for detection. The notebook stays non-modal on purpose. |
| Dark mode (`dark-mode-toggle`) | `src/style.css:73,106` `color-scheme` per theme. Pre-paint script in `index.html` `<head>`, `isDark()` + `cq-theme` | `light-dark()` is not recommended: `tests/theme.test.ts` parses the two token blocks `:root` / `:root[data-theme=dark]` for contrast, and a manual theme switch already works. |
| Container queries | `src/style.css:219,237` (64 px rail), the work row | |
| Scrollbars (`customize-scrollbar-color-and-thickness`) | `src/style.css:183,207,276,284` | `scrollbar-width` / `scrollbar-color` / `scrollbar-gutter`, no `::-webkit-scrollbar`. |
| Typography | `src/style.css:181-182` | `text-wrap: balance` / `pretty`. |
| Reduced motion | `src/style.css:480` global rule, `reducedMotion()` for `Element.animate()` and GSAP | |
| Tabs (`tabs`) | `src/ui/tabs.ts:60-140` | ARIA tablist, roving tabindex, arrow keys, Home/End, manual activation. `focusgroup` has "Limited availability", so it is not a replacement yet. The v22 engine UI adds no hand-rolled tabs. |
| Dates (`calculate-event-differentials`) | `src/practice.ts:20-25` | `localDay` builds a local calendar string, and `addDays` does UTC date-only arithmetic, so DST cannot shift a day. Temporal is not needed. |
| Clipboard (`copy-button`) | `src/main.ts:476`, `src/ui/modes.ts:357` | `navigator.clipboard.writeText` (Widely available) with a manual copy-box fallback. |
| Idle work | `src/art/load.ts:33` | `requestIdleCallback` with a `setTimeout` fallback. |
| Resize | `src/ui/chartView.ts:168` | `ResizeObserver`, no window resize polling. |
| `<details>` | brief goals, hints, the engine UI | Used standalone, so exclusive accordions (`name=`) do not apply. |
| IndexedDB | `src/db/snapshot.ts:152`, `src/import/store.ts:43` | Raw `indexedDB.open` with validation on read. The catalog has no matching guide. `navigator.storage.persist()` (not covered by the catalog) could protect snapshots and imports from eviction. That is optional and untested here. |
| Service worker | `public/sw.js` | Hand-written precache per version, hash-checked `index.html`, no runtime caching. The catalog has no matching guide, and the scan does not look at `public/`. |
| Workers | `src/db/worker.ts`, v22 `src/engine/*/worker.ts` | DB and engine work are off the main thread. |

## Coverage limit

- `legacy-scan` checked 38 guides (52 deterministic rules), about 20% of the catalog.
- It scanned only `src/`. `index.html` and `public/` were reviewed by hand.
- Guides retrieved for the manual pass:
  - `light-dismiss-a-dialog`, `declarative-dialog-popover-control`, `viewport-aware-dropdowns`, `anchor-positioning-tab-underline`
  - `animate-to-intrinsic-sizes`, `same-document-transitions`, `dynamic-sibling-animations`
  - `dark-mode-toggle`, `tabs`, `copy-button`, `break-up-long-tasks`
  - `customize-scrollbar-color-and-thickness`, `navigation-drawer`
- Searched with no matching guide: IndexedDB, persistent storage, service worker.
