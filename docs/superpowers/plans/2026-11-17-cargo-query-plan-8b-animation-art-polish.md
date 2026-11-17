# BoonData — Plan 8b: Chuyển động bản đồ và cảng, hình minh họa, đánh bóng UI (v11)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** phần "đẹp hơn" của v11 (L58), tách khỏi Plan 8a (General + Lộ trình) vì khối lượng:
- **Bản đồ tuyến sống động:** tàu chạy trên các tuyến đã mở, tuyến mới mở được "vẽ" ra, cảng nhịp sáng, đường nước sau tàu.
- **Cảnh Tiên Sa có chiều sâu:** mây trôi, parallax nhẹ theo con trỏ, mặt nước lấp lánh.
- **Linh vật phản ứng trong hoạt cảnh hoàn thành:** Lily reo ở mọi hoạt cảnh, Lily + Boon ở màn thăng tiến (Plan 7 V18 dời sang đây). Mọi hoạt cảnh vẫn ≤ 3 s (L29).
- **Hình minh họa tự vẽ:** cảnh "bàn học" của phần Chung (v6 §5.1), đầu trang cho 12 module SQL và 4 nhóm nâng cao, trạng thái rỗng của Lộ trình/Luyện SQL, cảnh "Sắp có" của Finance.
- **Đánh bóng UI rẻ** (danh sách §Task 8).
- **Ngân sách:** không thêm byte nào vào `main`; trái lại, chuyển vẽ cảnh Logistics sang chunk lười (v6 F6 `DomainArt`) để trả lại chỗ cho Plan 8a.

**Ngoài phạm vi:**
- Cảnh E-commerce (Plan 9 làm cùng domain đó, dùng cùng hợp đồng `DomainArt` của Task 1).
- Linh vật có xương/state machine (Rive), Lottie, âm thanh.
- Tài nguyên bên thứ ba (xem D8b-4).

**Architecture:**
- **Chunk `art/logistics`** (`src/art/logistics.ts`): `harborScene`, `drawYard`, `routeMap`, `paintRoutes` và phần thân hoạt cảnh của `stage.ts` (các cảnh `ship/yard/customs/truck/quote/ledger/chat/promotion`). `stage.ts` giữ trong `main` phần dock, nút Bỏ qua, Esc, `#announce`, `reducedMotion()`: nó `await loadArt('logistics')` rồi gọi `art.play(ctx)`. Chunk được `import()` sớm (idle sau lần vẽ đầu), nên lúc hoàn thành việc đầu tiên nó đã có.
- **Ambient** (`src/art/ambient.ts`, trong chunk art): một vòng `requestAnimationFrame` chung cho mọi hiệu ứng chạy mãi (tàu trên bản đồ, parallax). Tự dừng khi SVG ra khỏi màn hình (`IntersectionObserver`), khi tab ẩn (`visibilitychange`), và không bao giờ chạy khi `prefers-reduced-motion: reduce` (nghe cả sự kiện `change`).
- **Một lần (one-shot):** WAAPI (`el.animate`) cho vẽ tuyến, nhịp cảng khi đến nơi, pop linh vật. Lặp vô hạn đơn giản (nhịp cảng, mây, nước): CSS keyframes trong khối `@media (prefers-reduced-motion: no-preference)` có sẵn của `style.css`.
- **Hình minh họa** (`src/art/illustrations.ts`, chunk riêng `illustrations`): hàm thuần trả `SVGSVGElement` dựng bằng `s()`, màu bằng biến CSS (`--sky`, `--ground`, `--accent`, `--sun`…, theo theme), không chữ trong SVG (chữ đi bằng HTML bên cạnh), `aria-hidden="true"`.

**Tech Stack:** như HEAD sau Plan 7. **Không thêm dependency.**

**Spec / nguồn quyết định:** L26, L29, L31–L32 (hoạt cảnh), L35 (không công tắc chuyển động riêng), L42 (icon, không emoji), L56–L58; `product-design-v6.md` §2.5, §5.1, §6 (thư viện, tài nguyên), D-A1, D-A2; `docs/team/completion-animations.md`; Plan 7 V3/V4/V7/V18 (sprite linh vật, idle chỉ khi `live`).

**Tiền đề:**
- Plan 7 đã xong (sprite `#mascot-sprite`, `mascot(who, pose, cls?, label?)` trong `src/ui/mascots.ts` với `POSES = ['idle','point','cheer','think','oops','sleep']`; `src/domains.ts`; trang Bản đồ `#/d/logistics/map` (v6 D-L3) nếu Plan 7 có, nếu không thì bản đồ ở Tổng quan Logistics và hộp thoại `#map-dialog`).
- Plan 8a có thể chạy trước, sau hoặc xen kẽ; hai plan chỉ chung nhau `scripts/check-budget.mjs` (mỗi plan thêm nhóm của mình) và `src/style.css` (khối khác nhau).
- Plan viết trên HEAD `d7f42d8`. Plan 7 lúc đó **đang được viết** (file có tới Task 4): Task 0 đối chiếu tên hàm/route thật trước khi sửa.

## Decisions (D8b-1 … D8b-9, để orchestrator ghi L-số)

| # | Quyết định | Lý do |
|---|---|---|
| D8b-1 | **Thư viện: CSS keyframes + WAAPI + `tween()` có sẵn; không thêm Motion.** Giữ L57/D-A1. Motion `animate` (MIT, ~2,6 KB gz theo motion.dev, chưa đo trong repo) chỉ được thêm khi một hiệu ứng **cần spring vật lý hoặc chuỗi > 5 phần tử mà WAAPI cần > 60 dòng**; không hiệu ứng nào trong plan này chạm ngưỡng đó. Nếu thêm: `npm i --save-exact motion@<bản ≥ 2 tuần tuổi>`, chỉ `import { animate } from 'motion/mini'` trong chunk art, đo lại ngân sách. | Tàu chạy theo đường cong cần `getPointAtLength` mỗi khung hình: thư viện nào cũng phải làm vậy với SVG path (CSS `offset-path` trên phần tử SVG không đều giữa các trình duyệt), nên thư viện không bớt code. |
| D8b-2 | **Chuyển cảnh Logistics sang chunk lười `art/logistics` (v6 F6 `DomainArt`).** `stage.ts` còn lại trong `main` chỉ có dock + Bỏ qua + Esc + announce (~1/4 file hiện tại). Luật dừng: sau build, `dist/index.html` không được có `modulepreload` mới ngoài các chunk đã có; nếu Rolldown tách module dùng chung ra chunk preload (Plan 6 U3) thì đổi sang **tiêm phụ thuộc**: chunk art chỉ `import type` từ `main`, nhận `t`, `s`, `chapterColor`, `tween` qua tham số `ctx`. | Main sau Plan 7 sát trần (Plan 7 V1 nâng lên 290, chờ user). Ba file `harbor.ts` + `routeMap.ts` + `stage.ts` (~790 dòng) là khối UI lớn nhất chỉ dùng ở Tổng quan/Bản đồ/hoạt cảnh. Ước trả lại 6–9 KB gz cho `main` (**ước lượng, Task 1 đo**). |
| D8b-3 | **Hiệu ứng chạy mãi chỉ ở trang đọc** (Tổng quan, Bản đồ, hộp thoại bản đồ khi mở). Không bao giờ trong `#shell` khi hộp thoại đóng (v6 §2.5, Plan 7 V4). Tàu: tối đa 4 chiếc (một chiếc mỗi tuyến đã mở, ưu tiên tuyến mở gần nhất), chu kỳ 14–22 s theo độ dài tuyến. | Nhịp nhẹ, không tốn CPU (mục tiêu ≤ 2 ms/khung hình trong Performance panel của Edge, Task 9). |
| D8b-4 | **Tài nguyên: chỉ SVG tự vẽ trong code** (MIT như mọi code; hình linh vật vẫn CC BY 4.0 theo Plan 7). **Không** commit gói bên thứ ba trong v11, nên **không** tạo `ATTRIBUTION.md` (YAGNI). Kenney: trang https://kenney.nl/support (đã mở 2026-11-17) ghi "all game assets on the asset pages are public domain licensed (CC0)", "Attribution is not required", chỉ cấm dùng riêng logo Kenney; các trang gói Pirate Pack (190 file), Map Pack (180 file), Game Icons (105 file) ghi CC0 nhưng **không nói có SVG/vector** (trang Ship Pack trả 404). Muốn dùng sau: tải zip, xác nhận có `.svg` + `License.txt` CC0 trong zip, chép file vào `src/assets/kenney/<pack>/` kèm `License.txt`, tạo `ATTRIBUTION.md` (tên gói, URL, CC0, ngày tải) dù không bắt buộc. unDraw, OpenMoji, ảnh web: không (v6 §6.2). | Advisor/v6 D-A2. Không liệt kê gói từ trí nhớ: chỉ ghi điều đã kiểm. |
| D8b-5 | **Tuyến mới được vẽ ra** (stroke-dashoffset) chỉ cho tuyến **đã mở** mà thiết bị chưa thấy mở: pref `cargo-query/routes-seen` (`string[]` mã cảng, `readJson` + lọc theo `ROUTES`, không vào Save). Lần đầu mở trang (pref rỗng, chưa có gì để so): ghi mọi tuyến đang mở, **không** vẽ (tránh vẽ cả bản đồ cho người chơi cũ). Tuyến khóa giữ `stroke-dasharray="6 6"` và không bao giờ được vẽ: hiệu ứng đặt `stroke-dasharray`/`stroke-dashoffset` qua `style` của WAAPI, khi `finished` **hoặc** `cancel` thì xóa style đó, nên `paintRoutes` (thuộc tính) luôn thắng. | Tránh đụng `6 6` của tuyến khóa (advisor). |
| D8b-6 | **Linh vật trong hoạt cảnh:** Lily `cheer` 56 px ở góc dưới phải dock cho mọi hoạt cảnh (pop 300 ms, đứng yên sau đó); màn thăng tiến thêm Boon `cheer` bên trái thẻ thăng tiến. `aria-hidden` (câu `#announce` đã nói đủ). Reduced motion: hiện luôn trạng thái cuối, không pop. Không thêm thời gian vào `STEPS` (pop chạy song song bước cuối). | Plan 7 V18; L32 thời lượng giữ nguyên. |
| D8b-7 | **Parallax** chỉ khi `matchMedia('(pointer: fine)')` và không reduced motion: 3 lớp (mây xa ±6 px, đồi/cẩu xa ±3 px, cầu cảng 0), nội suy về 0 khi con trỏ rời cảnh. Mobile không parallax (chỉ mây trôi CSS). | Rẻ, không gây chóng mặt (biên độ nhỏ, WCAG 2.3.3 chỉ áp cho chuyển động do tương tác: tắt hẳn dưới reduced motion). |
| D8b-8 | **Hình minh họa mỗi cái ≤ 6 KB SVG thô, chunk `illustrations` ≤ 15 KB gz** (nhóm ngân sách mới). Danh sách đúng ở Task 6. | v6 §5.1. |
| D8b-9 | **Đánh bóng chỉ những mục ≤ ~1 giờ mỗi mục**, không đổi bố cục Plan 7 (danh sách Task 8). Mục nào cần đổi bố cục → backlog v12. | v11 deploy ngày mai (L58). |

## Đã có trên HEAD (không làm lại)

| Hạng mục | Trạng thái |
|---|---|
| `tween()`, `easeIn/easeOut/easeInOut/linear`, `Run` (bỏ qua = vẽ trạng thái cuối) trong `stage.ts` | Có. Dời vào chunk art cùng các cảnh. |
| `sail()`: tàu theo `getPointAtLength`, đường nước `stroke-dashoffset` | Có. Task 5 thêm nhịp cảng khi đến và vẽ tuyến mới khi thăng tiến. |
| Ambient Tiên Sa (`cq-wave`, `cq-smoke`, `cq-beacon`, `cq-ship-out`, `cq-trolley`, `cq-hoist`) + khối reduced-motion | Có. Task 4 thêm `cq-cloud`, `cq-glint`, lớp parallax. |
| `STEPS` (≤ 3 s mỗi hoạt cảnh, `src/scene.ts`, có test) | Có. Không đổi tổng thời lượng. |
| Sprite linh vật + `mascot()` (Plan 7) | Có sau Plan 7. |

## Global Constraints

- Mọi ràng buộc của Plan 1–7 vẫn áp dụng (i18n qua `t()`, không emoji, không class Tailwind ghép bằng template literal, tương phản ≥ 4,5:1 cả hai theme, không `innerHTML` ngoài Mermaid).
- **Chuyển động:** chỉ `transform`, `opacity`, `stroke-dashoffset`; mọi keyframe mới nằm trong `@media (prefers-reduced-motion: no-preference)`; mọi WAAPI/rAF hỏi `reducedMotion()` trước. Không vòng lặp vô hạn trong `#shell` (trừ hộp thoại bản đồ đang mở). Hoạt cảnh hoàn thành ≤ 3 s, bỏ qua được, không chặn input (L29).
- **Ngân sách:** sau mỗi task sửa `src/`: `npm run build && node scripts/check-budget.mjs`, ghi `main`, `art`, `illustrations`, `css` vào commit. `main` không được tăng so với số đo ở Task 0 (Task 1 phải làm nó giảm).
- **Kiểm tay:** Edge, `npm run dev -- --port 5174 --strictPort` (không bao giờ `:5173`), sáng + tối, 1440 / 1100 / 375 px, và DevTools → Rendering → "Emulate CSS prefers-reduced-motion: reduce".
- **Commit:** mỗi task một commit, chỉ `git add` file của task; message kết thúc bằng `Claude-Session: https://claude.ai/code/session_01PwPSBV1SVDP6quEZfKN56M`.

## File Structure

```
src/art/logistics.ts      harborScene, drawYard, routeMap, paintRoutes, các cảnh hoạt cảnh (chuyển từ ui/harbor.ts, ui/routeMap.ts, ui/stage.ts)   (tạo, T1)
src/art/ambient.ts        vòng rAF chung, dừng khi khuất/ẩn/reduced motion                                                  (tạo, T2)
src/art/mapMotion.ts      tàu trên tuyến, vẽ tuyến mới, nhịp cảng                                                            (tạo, T3)
src/art/illustrations.ts  bàn học, đầu module, đầu nhóm, rỗng, Finance                                                       (tạo, T6)
src/art/load.ts           loadArt(id), loadIllustrations(): import() lười + cache (trong main, ~20 dòng)                     (tạo, T1)
src/ui/stage.ts           còn dock/Bỏ qua/Esc/announce, gọi art.play(ctx)                                                    (sửa, T1, T5)
src/ui/harbor.ts, src/ui/routeMap.ts   xóa sau khi chuyển (routeItems → src/ui/routeText.ts, vẫn trong main vì Home cần chữ)  (xóa, T1)
src/ui/homeView.ts, src/ui/mapStrip.ts  await loadArt(...) rồi vẽ; có chỗ giữ (khung cùng tỉ lệ) trong lúc chờ             (sửa, T1)
src/routesSeen.ts         pref cargo-query/routes-seen (thuần, có test)                                                     (tạo, T3)
src/style.css             cq-pulse, cq-cloud, cq-glint, cq-bob                                                              (sửa, T3, T4)
scripts/check-budget.mjs  nhóm art 20, illustrations 15                                                                     (sửa, T1, T6)
tests/routesSeen.test.ts, tests/ambient.test.ts, tests/illustrations.test.ts, tests/scene.test.ts (giữ ≤ 3 s)
```

---

### Task 0: Kiểm tiền đề và đo (không sửa file)

- [ ] **Step 1:** `git status` sạch (hoặc chỉ file của agent khác, không đụng). `git log --oneline -15`: Plan 7 đã vào (tìm `mascots.ts`, `src/domains.ts`).
- [ ] **Step 2:** Đối chiếu tên thật: `grep -n "export function mascot\|POSES" src/ui/mascots.ts`, `grep -n "harborScene\|routeMap(" src -r`, route Bản đồ trong `src/route.ts`. Ghi chỗ lệch với plan vào commit Task 1.
- [ ] **Step 3:** `npm run build && node scripts/check-budget.mjs`; ghi số `main` làm mốc **M0**. Ghi danh sách `<link rel="modulepreload">` trong `dist/index.html` làm mốc **P0**.
- [ ] **Step 4:** `npx tsc --noEmit && npm test` xanh. Đỏ → dừng, báo lại.

### Task 1: Chunk `art/logistics` (D8b-2)

**Files:** tạo `src/art/logistics.ts`, `src/art/load.ts`, `src/ui/routeText.ts`; sửa `src/ui/stage.ts`, `src/ui/homeView.ts`, `src/ui/mapStrip.ts`, `scripts/check-budget.mjs`; xóa `src/ui/harbor.ts`, `src/ui/routeMap.ts` (nội dung chuyển nguyên văn).

- [ ] **Step 1: test trước.** `tests/artChunk.test.ts`: đọc mã nguồn bằng `import.meta.glob('../src/**/*.ts', { query: '?raw', eager: true })`, kiểm (a) không file nào ngoài `src/art/**` và `src/art/load.ts` import từ `./art/logistics`/`../art/logistics` bằng import tĩnh; (b) `src/art/**` không import tĩnh `src/ui/stage.ts` hay `src/main.ts`. Chạy: FAIL (chưa có `src/art`).
- [ ] **Step 2:** Tạo `src/art/load.ts`:
```ts
import type * as Logistics from './logistics';
export type LogisticsArt = typeof Logistics;
let art: Promise<LogisticsArt> | undefined;
/** The Logistics scene, map and completion scenes: one lazy chunk (Plan 8b D8b-2). A failed load is dropped so the next call retries. */
export function loadArt(): Promise<LogisticsArt> {
  art ??= import('./logistics').catch((e) => { art = undefined; throw e; });
  return art;
}
/** Start the download once the first screen is drawn, so the first completion never waits for it. */
export const prefetchArt = (): void => { (window.requestIdleCallback ?? setTimeout)(() => void loadArt().catch(() => {})); };
```
- [ ] **Step 3:** Chuyển nguyên văn `harbor.ts` + `routeMap.ts` vào `src/art/logistics.ts` (sửa đường import `./svg` → `../ui/svg`…). Chuyển từ `stage.ts` mọi hàm vẽ/cảnh (`tween`, easing, `setCrane`…`sentence`, `build`) vào cùng file, export `play(ctx): Promise<void>` nhận đúng `Ctx` hiện có (định nghĩa kiểu `Ctx` trong `logistics.ts`, `stage.ts` chỉ `import type`). `routeItems` (chỉ là chữ) sang `src/ui/routeText.ts` để Home vẫn có chú giải HTML mà không tải chunk.
- [ ] **Step 4:** `stage.ts`: `playCompletion` hiện dock ngay (chữ `#announce` không đổi), rồi `const art = await loadArt()`; tải lỗi → bỏ hình, chỉ giữ câu announce + nút đóng (hoạt cảnh không bao giờ chặn input). `main.ts` gọi `prefetchArt()` sau lần render đầu.
- [ ] **Step 5:** `homeView.ts`/`mapStrip.ts`/trang Bản đồ: vẽ một khung giữ chỗ cùng `viewBox` (div `aspect-[1100/400]`/`aspect-[980/260]`, nền `bg-accent-soft`), `loadArt().then(...)` thay khung bằng SVG nếu section còn gắn trong DOM (`isConnected`), như mẫu Plan 6 sửa 8fdd7a4.
- [ ] **Step 6:** `check-budget.mjs`: thêm `['art', /^logistics-/, 20]` trước `rest` (tên chunk theo tên file; nếu Rolldown đặt khác thì sửa regex theo `dist/assets`).
- [ ] **Step 7: xác nhận.** `npx tsc --noEmit && npm test` xanh (gồm `tests/scene.test.ts`, test hoạt cảnh có sẵn đổi đường import). `npm run build && node scripts/check-budget.mjs`: **`main` < M0**, `art` ≤ 20; `dist/index.html` không có modulepreload ngoài P0. Có chunk preload mới → làm theo luật dừng D8b-2 (tiêm phụ thuộc), đo lại.
- [ ] **Step 8: kiểm tay** (Edge :5174): Tổng quan Logistics vẽ cảnh + bản đồ; hoàn thành một việc (Sandbox không tính) → hoạt cảnh như trước; DevTools Network "Slow 3G" + xóa cache: Tổng quan hiện khung giữ chỗ rồi cảnh, không lỗi console.
- [ ] **Step 9:** Commit `refactor(art): Logistics scene, map and completion scenes in a lazy chunk (main −x KB)`.

### Task 2: Vòng ambient chung

**Files:** tạo `src/art/ambient.ts`, `tests/ambient.test.ts`.

- [ ] **Step 1: test trước** (Node, không DOM thật): tiêm `raf`, `observe`, `reduced` giả; kiểm (a) `reduced() === true` → `ambient()` không đăng ký frame nào; (b) khi `visible=false` không gọi `frame`; (c) hàm hủy trả về dừng frame và ngắt observer; (d) một vòng rAF cho nhiều đăng ký.
- [ ] **Step 2:** Cài đặt:
```ts
type Frame = (ms: number) => void;
export interface AmbientEnv { raf: (f: FrameRequestCallback) => number; caf: (id: number) => void; reduced: () => boolean; observe: (el: Element, cb: (on: boolean) => void) => () => void; hidden: () => boolean }
const subs = new Map<Frame, { on: boolean }>();
let id = 0;
/** Runs `frame` every animation frame while `el` is on screen, the tab is visible and motion is allowed. Returns a stop function. */
export function ambient(el: Element, frame: Frame, env: AmbientEnv = browserEnv()): () => void {
  if (env.reduced()) return () => {};
  const s = { on: false };
  subs.set(frame, s);
  const unobserve = env.observe(el, (on) => { s.on = on; kick(env); });
  return () => { subs.delete(frame); unobserve(); };
}
function kick(env: AmbientEnv): void {
  if (id || ![...subs.values()].some((s) => s.on)) return;
  const tick = (ms: number): void => {
    id = 0;
    if (env.hidden() || env.reduced()) return; // visibilitychange calls kick() again
    let any = false;
    for (const [f, s] of subs) if (s.on) { any = true; f(ms); }
    if (any) id = env.raf(tick);
  };
  id = env.raf(tick);
}
```
`browserEnv()` dùng `IntersectionObserver` (threshold 0), `document.visibilityState`, `reducedMotion()` (`src/ui/dom.ts`); `document.addEventListener('visibilitychange', () => kick(env))` và `matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', …)` đăng ký một lần.
- [ ] **Step 3:** `npx vitest run tests/ambient.test.ts && npx tsc --noEmit`. Commit `feat(art): one shared ambient loop that stops off screen, in hidden tabs and under reduced motion`.

### Task 3: Bản đồ tuyến sống động (tàu, vẽ tuyến, nhịp cảng)

**Files:** tạo `src/art/mapMotion.ts`, `src/routesSeen.ts`, `tests/routesSeen.test.ts`; sửa `src/art/logistics.ts` (`routeMap` trả thêm `fleet`, `rings`), `src/style.css`.

- [ ] **Step 1: test trước** `tests/routesSeen.test.ts`: `readSeen(kv)` bỏ mã không có trong `ROUTES` và giá trị không phải mảng chuỗi; `diffSeen(seen, open)` → `{ draw, next }`: pref rỗng → `draw = []`, `next = open` (D8b-5); pref có `['NLRTM']`, open `['NLRTM','SGSIN']` → `draw = ['SGSIN']`.
- [ ] **Step 2:** `src/routesSeen.ts` (thuần, khóa `cargo-query/routes-seen`, qua `readJson`/`writeJson` có sẵn).
- [ ] **Step 3:** `routeMap()` thêm cho mỗi tuyến: một vòng `circle` nhịp (`class="cq-pulse"`, cùng tâm pin, `r` 6, `fill="none"`, `stroke` màu chương, `aria-hidden`), chỉ hiện ở **cảng gốc** và **tuyến mở kế tiếp** (`ROUTES` có `opens` nhỏ nhất chưa mở). CSS:
```css
@media (prefers-reduced-motion: no-preference) {
  .cq-pulse { animation: cq-pulse 2.4s ease-out infinite; transform-box: fill-box; transform-origin: center; }
  .cq-bob { animation: cq-bob 2.8s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
}
@keyframes cq-pulse { 0% { transform: scale(1); opacity: 0.7; } 100% { transform: scale(2.6); opacity: 0; } }
@keyframes cq-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-1.5px); } }
```
Dưới reduced motion vòng tròn đứng yên (nhìn như viền pin), vẫn đúng nghĩa "nơi tiếp theo"; chú giải `routeItems` không đổi.
- [ ] **Step 4:** `mapMotion.ts`:
  - `sailFleet(parts, harbor)`: với ≤ 4 tuyến mở (mở gần nhất trước), tạo một tàu nhỏ (cùng hình `ship` hiện có, scale 0.7, `g.cq-bob` bọc bên trong để nhấp nhô) chạy đi–về trên `path`, chu kỳ `clamp(len / 40, 14, 22)` s, lệch pha theo chỉ số; dùng `ambient(svg, frame)`. Hướng tàu như `sail()` (lật khi > 90°).
  - `drawNewRoutes(parts, draw: string[])`: mỗi tuyến trong `draw` (đã mở) chạy `path.animate([{ strokeDasharray: \`${len} ${len}\`, strokeDashoffset: len }, { strokeDasharray: \`${len} ${len}\`, strokeDashoffset: 0 }], { duration: 1200, easing: 'ease-out' })`, rồi pin của nó `animate([{ transform: 'scale(0)' }, { transform: 'scale(1)' }], { duration: 300, delay: 1100 })` (`transform-box: fill-box` qua class `origin-center [transform-box:fill-box]`). `finished.finally(() => { path.style.removeProperty('stroke-dasharray'); path.style.removeProperty('stroke-dashoffset'); })`. Reduced motion → không gọi gì (tuyến hiện sẵn).
  - Gọi ở Tổng quan và trang/hộp thoại bản đồ: `const { draw, next } = diffSeen(readSeen(), [...harbor.open]); drawNewRoutes(p, draw); writeSeen(next); sailFleet(p, harbor)`. Hủy (`stop()`) khi section bị vẽ lại (`rerender`) để không chồng vòng lặp.
- [ ] **Step 5: xác nhận.** `npx vitest run tests/routesSeen.test.ts && npx tsc --noEmit && npm test`. Kiểm tay: save có 2 tuyến mở → 2 tàu chạy, pin cảng gốc + tuyến kế tiếp nhịp; xóa `cargo-query/routes-seen`, mở lại → không vẽ (lần đầu); sửa pref bỏ một tuyến → tuyến đó được vẽ 1,2 s rồi thành nét liền; tuyến khóa vẫn nét đứt `6 6`. Chuyển sang tab khác 10 s rồi quay lại: tàu tiếp tục (không nhảy cóc vì vị trí tính theo `ms`). Reduced motion: không tàu, không nhịp, không vẽ. Mở việc (`#/d/logistics/play`): Performance panel không có frame rAF khi hộp thoại bản đồ đóng.
- [ ] **Step 6:** Commit `feat(map): ships sail the open lanes, new lanes draw in once per device, the hub and the next lane pulse`.

### Task 4: Cảnh Tiên Sa có chiều sâu

**Files:** sửa `src/art/logistics.ts` (`harborScene`), `src/style.css`.

- [ ] **Step 1:** `harborScene` gom phần tử có sẵn thành 3 nhóm `<g data-layer="far|mid|near">` (bầu trời + mây + đồi xa; cẩu + tàu neo + hải đăng; cầu cảng + bãi + cổng). Không đổi tọa độ phần tử nào (các test `bayBox`, `CRANE` giữ nguyên).
- [ ] **Step 2:** Thêm 3 đám mây (mỗi đám 3 `ellipse` trắng 80% opacity) vào `far`, class `cq-cloud` với `animation-duration` 60/80/100 s; một dải `cq-glint` (3 đoạn `line` trắng mảnh trên mặt nước, nhấp nháy opacity 0.2→0.6). CSS trong khối `no-preference`:
```css
.cq-cloud { animation: cq-cloud linear infinite; }
.cq-glint { animation: cq-glint 3.2s ease-in-out infinite; }
@keyframes cq-cloud { from { transform: translateX(-140px); } to { transform: translateX(1240px); } }
@keyframes cq-glint { 0%, 100% { opacity: 0.2; } 50% { opacity: 0.6; } }
```
  Chỉ khi `opts.ambient` (Tổng quan), không trong dock hoạt cảnh.
- [ ] **Step 3:** Parallax (D8b-7): `parallax(svg)` trong `mapMotion.ts`: lắng nghe `pointermove`/`pointerleave` trên SVG (chỉ `pointer: fine`, không reduced motion), lưu mục tiêu `(dx, dy)` ∈ [-1, 1]; `ambient()` nội suy (hệ số 0.08 mỗi khung) và đặt `transform="translate(…)"` cho `far` (±6, ±3 px) và `mid` (±3, ±1.5 px). Rời chuột → về 0.
- [ ] **Step 4: xác nhận.** `npm test` (test cảnh không đổi), kiểm tay sáng/tối: mây trôi chậm, rê chuột thấy chiều sâu nhẹ, chữ SVG không bị lệch khỏi pin (chữ nằm ở `near`/nhóm bản đồ). 375 px: không parallax, mây vẫn trôi. Reduced motion: cảnh tĩnh như HEAD.
- [ ] **Step 5:** Commit `feat(harbor): drifting clouds, water glints and a gentle pointer parallax on the overview scene`.

### Task 5: Hoạt cảnh hoàn thành: nhịp đến cảng, vẽ tuyến khi thăng tiến, linh vật

**Files:** sửa `src/art/logistics.ts` (cảnh `ship`, `promotion`), `src/ui/stage.ts` (chỗ đặt linh vật), `tests/scene.test.ts` nếu `STEPS` đổi chia bước.

- [ ] **Step 1: test trước.** `tests/scene.test.ts` đã kiểm mọi hoạt cảnh ≤ 3 s; thêm: tổng của từng `STEPS[k]` không đổi so với HEAD (ghi bảng số hiện tại vào test), để nhịp mới phải nằm **trong** bước cũ.
- [ ] **Step 2:** `sail()`: 250 ms cuối của bước đi biển chạy nhịp cảng đến (vòng tròn `scale 1→2.4`, `opacity .8→0`, WAAPI, song song). Màn thăng tiến mở tuyến mới (`c.after.open` có cảng mà `c.before.open` không có): trước khi tàu chạy, gọi `drawNewRoutes(map, [port])` với `duration` = 40% bước `sail` hiện tại, tàu chạy phần còn lại (tổng không đổi). Ghi luôn cảng đó vào `routes-seen` để Tổng quan không vẽ lại lần nữa.
- [ ] **Step 3:** Linh vật (D8b-6): `stage.ts` thêm `mascot('lily', 'cheer', 'size-14 absolute right-2 bottom-2')` vào dock khi `build()`; `promotion` thêm `mascot('boon', 'cheer', 'size-14')` bên trái thẻ thăng tiến. Pop: `el.animate([{ transform: 'scale(.6)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 300, easing: 'cubic-bezier(.3,1.6,.6,1)' })` chạy song song bước cuối; `fast` (bỏ qua/reduced) → không animate. Linh vật `aria-hidden`; không che nút Bỏ qua (đặt `pointer-events-none`).
- [ ] **Step 4: xác nhận.** `npx tsc --noEmit && npm test`. Kiểm tay mỗi loại hoạt cảnh (dùng save có việc sắp xong của từng loại, hoặc gọi `playCompletion` từ console như `completion-animations.md`): ≤ 3 s (đồng hồ Performance), Esc bỏ qua được, Lily hiện, màn thăng tiến có Boon + Lily và tuyến mới được vẽ trước khi tàu chạy; reduced motion: trạng thái cuối có cả hai linh vật, không chuyển động.
- [ ] **Step 5:** Commit `feat(stage): arrival pulse, promotion draws the new lane, Lily and Boon cheer (all within the 3 s steps)`.

### Task 6: Hình minh họa tự vẽ

**Files:** tạo `src/art/illustrations.ts`, `tests/illustrations.test.ts`; sửa `src/art/load.ts` (`loadIllustrations()`), các view của Plan 8a/Plan 7 dùng hình (chỗ gắn ghi dưới), `scripts/check-budget.mjs` (`['illustrations', /^illustrations-/, 15]`).

Danh sách đúng (mỗi hình một hàm, `viewBox` cố định, chỉ hình cơ bản `rect/circle/ellipse/path/line`, màu qua `var(--…)` hoặc lớp `fill-*` có sẵn trong `theme.ts`, không chữ, `aria-hidden="true"`):

| Hàm | Dùng ở | Nội dung | viewBox |
|---|---|---|---|
| `studyDesk()` | đầu trang Lộ trình (`#/learn`) và Trang chủ nền tảng (thẻ "Luyện SQL trước") | đồi cỏ, bàn gỗ, laptop có biểu đồ cột 4 cột, cốc, chồng sách; chỗ trống bên trái cho Boon `point` (sprite, đặt bằng HTML, không vẽ lại linh vật) | 480×200 |
| `moduleGlyph(n)` 1–12 | đầu trang `#/learn/sql/<n>` và đầu Bài học nhanh của kỹ năng thuộc module n (Plan 8a) | 1 lưới bảng có cột tô, 2 phễu + Σ, 3 hai bảng nối dây, 4 lịch + đồng hồ, 5 nhánh rẽ 3 ngả, 6 kính lúp trên chữ, 7 hộp lồng hộp, 8 chồng khối có mũi tên (CTE), 9 hai vòng tròn giao/hợp, 10 cửa sổ trượt trên dãy cột, 11 sách có dấu trang (chỉ mục), 12 bảng báo cáo có kim chỉ | 160×64 |
| `trackGlyph(g)` A/B/C/D | đầu nhóm nâng cao trên `#/learn` | A khung cửa sổ + đệ quy (cây), B phễu + đường cohort bậc thang, C ngôi sao (star schema: 1 fact, 4 dim), D mũi tên ra ngoài khung | 160×64 |
| `emptyDrills()` | Luyện SQL chưa có gì đến hạn | bảng trống có dấu tick, ngồi cạnh là chỗ cho Lily `sleep` (sprite) | 240×120 |
| `emptyPath()` | Lộ trình khi chưa bắt đầu module nào | con đường uốn qua 3 cột mốc, mốc đầu có cờ | 240×120 |
| `financeSoon()` | trang "Sắp có" Finance (v6 §5.1) | phố tài chính: tòa có cột, 2 nhà cao tầng, đường tăng trưởng nét đứt trên trời, chồng xu | 480×200 |

- [ ] **Step 1: test trước** `tests/illustrations.test.ts`: mỗi hàm trả `svg` có `aria-hidden="true"`, không có `<text>`, `outerHTML.length ≤ 6000`, mọi `fill`/`stroke` là `none`, `currentColor`, `var(--…)` hoặc không đặt (dùng class); `moduleGlyph(1..12)` khác nhau từng đôi (so `outerHTML`). (Vitest môi trường mặc định là node: dùng `happy-dom` có sẵn? Nếu repo chưa có môi trường DOM thì test qua `s()` giả lập như `tests/` đang làm cho SVG — đọc `tests/` có sẵn để theo mẫu; **không thêm dependency**.)
- [ ] **Step 2:** Vẽ từng hàm. Màu theo token Plan 7 (`--sky`, `--ground`, `--accent`, `--accent-soft`, `--sun`, `--panel`, `--border`); module glyph dùng `chapterColor(n).fill` cho chi tiết nhấn (cùng màu chương như mọi nơi).
- [ ] **Step 3:** Gắn: view nào dùng hình thì `loadIllustrations().then((il) => slot.replaceChildren(il.studyDesk()))` (cùng mẫu `isConnected` của Task 1). Hình không bao giờ chặn nội dung: chỗ hình có chiều cao cố định (tránh nhảy bố cục, CLS).
- [ ] **Step 4: xác nhận.** `npx vitest run tests/illustrations.test.ts && npx tsc --noEmit && npm test`; build + budget: `illustrations` ≤ 15, `main` không tăng. Kiểm tay sáng/tối từng chỗ gắn, 375 px (hình co theo bề rộng, `w-full h-auto`).
- [ ] **Step 5:** Commit `feat(art): drawn illustrations for the learning path, modules, groups, empty states and Finance (lazy chunk)`.

### Task 7: Giấy phép và ghi công (không thêm file nếu không có tài nguyên ngoài)

- [ ] **Step 1:** `grep -rn "kenney\|openmoji\|undraw\|lottie" src public assets index.html` → phải rỗng. README mục "Giấy phép" (Plan 7 tạo) thêm một câu: "Cảnh và hình minh họa được vẽ bằng code trong `src/art/` (MIT như phần code); hình Boon và Lily theo CC BY 4.0 (`assets/mascots/LICENSE`)."
- [ ] **Step 2:** Commit `docs: illustrations are drawn in code (MIT); no third-party art in v11`.

### Task 8: Đánh bóng UI rẻ (D8b-9)

Mỗi mục một bước, kiểm tay sáng/tối; mục nào đụng chữ thì thêm khóa vào cả `vi.ts` và `en.ts`.

- [ ] **8.1 Số trong bảng:** `tabular-nums text-right` cho ô số ở `resultTable.ts`, trang Dữ liệu, Bảng điều hành (cột số canh phải, chữ số cùng bề rộng).
- [ ] **8.2 Đầu bảng dính:** `sticky top-0 bg-panel` cho `<thead>` của bảng kết quả và bảng mẫu ở trang Dữ liệu.
- [ ] **8.3 Ví dụ bài học dài:** bảng kết quả "Chạy ví dụ" trong thẻ bài học chỉ vẽ 8 dòng đầu + dòng "+N dòng nữa" (mục mở trong review-log Plan 6 vòng 1, §C.2 "≤ 8 dòng"). Thử ngay và tab Kết quả không đổi.
- [ ] **8.4 Tiêu đề cân dòng:** `text-wrap: balance` (`[text-wrap:balance]`) cho `h1`/`h2` của trang đọc và tiêu đề việc; `text-pretty` cho đoạn đề.
- [ ] **8.5 Nhảy bố cục khi tải:** mọi khung giữ chỗ (cảnh, bản đồ, hình, giá trị cột) có chiều cao cố định; trang không nhảy khi chunk về (Edge Performance → Layout Shift ≈ 0 ở Tổng quan, Lộ trình).
- [ ] **8.6 Vòng focus đồng nhất:** một lớp `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]` trong `@layer base` cho `button, a, [tabindex], summary, select`; bỏ các `focus:ring` lẻ tẻ đang lệch nhau (`grep -rn "focus:ring" src`).
- [ ] **8.7 Nút đang chạy:** Chạy/Nộp có trạng thái đang chạy (`aria-busy="true"`, chữ "Đang chạy…", spinner CSS 12 px quay — tắt dưới reduced motion) thay vì không đổi gì; khóa i18n `work.running`.
- [ ] **8.8 Hover thẻ bấm được:** `CARD_ACTION` thêm `transition-transform duration-150 hover:-translate-y-0.5` (dưới reduced motion khối toàn cục đã tắt transition).
- [ ] **8.9 Thanh cuộn:** `scrollbar-gutter: stable` cho vùng cuộn chính (tránh giật khi nội dung đổi dài/ngắn); `overscroll-behavior: contain` cho sidebar và hộp thoại.
- [ ] **8.10 Rút gọn có title:** tên bảng/cột/việc bị cắt (`truncate`) luôn có `title` đầy đủ (`grep -rn "truncate" src/ui`).
- [ ] **8.11 Khoảng cách:** trang đọc (Trang chủ, Lộ trình, Tổng quan, Luyện SQL) dùng cùng nhịp `space-y-6` giữa section và `gap-3` trong danh sách; tiêu đề section cùng một lớp (`SECTION_TITLE` mới trong `theme.ts`, dùng lại ở mọi nơi).
- [ ] **8.12 Icon cùng cỡ:** icon trong nút và danh sách `size-4`, trong tiêu đề `size-5` (`grep -rn "icon(" src/ui` và sửa lớp lệch).
- [ ] **Xác nhận:** `npx tsc --noEmit && npm test` (gồm `theme.test.ts`: không class ghép bằng template literal), build + budget (`css` ≤ 20, `main` không tăng quá 1 KB cho cả Task 8). Kiểm tay 3 bề rộng × 2 theme. Commit `style: v11 polish (numbers, sticky headers, focus, busy buttons, spacing, no layout shift)`.

### Task 9: Kiểm toàn bộ và đo

- [ ] **Step 1:** `npx tsc --noEmit && npm test && npm run build && node scripts/check-budget.mjs`. Ghi bảng: `main` (so M0), `art`, `illustrations`, `css`.
- [ ] **Step 2: hiệu năng** (Edge, bản build `npm run preview -- --port 5174 --strictPort`): Tổng quan Logistics với 4 tuyến mở, Performance 10 s: thời gian script mỗi khung ≤ 2 ms trung bình, không long task > 50 ms do ambient; tab ẩn 10 s → không frame nào.
- [ ] **Step 3: reduced motion:** bật giả lập, đi Tổng quan, Bản đồ, một hoạt cảnh mỗi loại, Lộ trình: không gì chuyển động, mọi thông tin vẫn có (pin kế tiếp có viền, tuyến mới hiện sẵn, linh vật ở trạng thái cuối).
- [ ] **Step 4:** Ghi kết quả vào `docs/team/review-log.md` (mục Plan 8b), commit `docs: Plan 8b measurements (budgets, frame cost, reduced motion)`.

## Rủi ro

| Rủi ro | Giảm thiểu |
|---|---|
| Chunk art tạo chunk preload dùng chung (Plan 6 U3), `main` không giảm | Luật dừng D8b-2 + tiêm phụ thuộc; test `artChunk.test.ts` chặn import tĩnh ngược |
| Hoạt cảnh đầu tiên chờ tải chunk | `prefetchArt()` lúc rảnh sau lần vẽ đầu; tải lỗi → dock chỉ có chữ, không chặn |
| rAF chạy khi không ai xem (pin laptop) | `ambient()` dừng khi khuất/ẩn/reduced; kiểm Performance ở Task 9 |
| Vẽ tuyến đè nét đứt tuyến khóa | Chỉ vẽ tuyến đã mở; WAAPI dùng `style`, xóa khi xong/hủy (D8b-5) |
| Hình tự vẽ trông "rẻ" | Cùng bảng màu token Plan 7, cùng nét 2 px bo tròn như icon L42; review UX độc lập L55 |
| Plan 7 đổi tên hàm/route khi viết xong | Task 0 Step 2 đối chiếu và ghi lệch |
