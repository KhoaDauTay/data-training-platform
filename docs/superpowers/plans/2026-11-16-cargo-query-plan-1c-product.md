# Cargo Query — Plan 1c: Product layer (save v2, tiến độ, Sổ tay, Luyện tập, Sandbox)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm lớp sản phẩm lên engine đã có: save v2 (một lần nâng duy nhất), thanh tiến độ + thẻ mục tiêu chương + tổng kết chương + skill map + chip Dạy/Cần, Sổ tay (thẻ kỹ năng + thuật ngữ freight), Luyện tập theo D2 (biến thể `{{x}}`, Leitner 5 hộp, 3 lối vào, "Ôn: N", 0 XP), Sandbox (SQL tự do không chấm), và cổng phát hành "0 ticket thiếu EN".

**Architecture:** Mọi logic nằm trong module thuần có unit test (`src/variants.ts`, `src/practice.ts`, `src/overview.ts`, `src/glossary.ts`). Trạng thái chế độ (Học chính / Luyện tập / Sandbox) nằm trong `src/session.ts`, không DOM. Giao diện là các module DOM mới trong `src/ui/` dùng `h()`. Code của Plan 1 chỉ bị sửa ở các điểm neo có tên rõ ràng (Task 0 kiểm trước), mỗi lần sửa đều chạy `npx tsc --noEmit`. Mọi trạng thái tiến độ được **tính lại từ save** (`completed`, `hintsUsed`, `review`, `bossStep`) cộng nội dung, không lưu thêm.

**Tech Stack:** như Plan 1 + Plan 1b. **Không thêm dependency** (YAML dùng gói `yaml` đã có).

**Spec:** `docs/superpowers/specs/2026-11-16-cargo-query-design.md` §1, §6b, §8, §9. **Nguồn quyết định:** `docs/team/amendments.md` A4–A9, B7, E1, E2 và phần "Quyết định của user (2026-11-16)" D1, D2. **Tiền đề:** Plan 1 (Task 1–11) và Plan 1b (Task 1–8) đã xong. Chạy trước Plan 2.

**Ngoài phạm vi plan này (đã có chủ khác):** hạ tầng i18n (`src/i18n/*`, nút VI|EN — Plan 1 Task 10), tách `main.ts` (Plan 1 Task 10), lịch sử query C15, Format SQL (D5), nạp CSV (Plan Import), dịch bù EN ch1–3 (Plan 1), tự gắn link thuật ngữ trong đề và badge ở tab Cột (B7: để bản sau), chấm beat trên dải bản đồ (Plan 1b Task 7).

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

## Global Constraints

- Mọi ràng buộc của Plan 1 và Plan 1b vẫn áp dụng: PGlite **0.5.16** pin; Solution không dùng `CURRENT_DATE`/`now()`; không đưa dữ liệu vào `innerHTML` (ngoại lệ duy nhất: SVG Mermaid ở tab ER); mọi truy cập `localStorage`/IndexedDB bọc try/catch; mọi bước "xác nhận PASS" chạy thêm `npx tsc --noEmit` và phải không lỗi.
- UI và nội dung VI + EN, VI là bản gốc. Mọi chuỗi UI mới đi qua `t(key)`; khóa mới thêm vào **cả** `src/i18n/vi.ts` và `src/i18n/en.ts` trong **cùng task** dùng khóa đó (nếu không `tsc` của task đó báo lỗi). Bản EN không được trùng y hệt bản VI (test B5 của Plan 1).
- **Save chỉ nâng một lần lên v2** qua `MIGRATIONS[1]`. `tests/fixtures/save-v1.json` **không bao giờ sửa**; thêm `tests/fixtures/save-v2.json` và cũng không bao giờ sửa sau khi commit.
- "Hôm nay" của lịch ôn = **ngày thật theo giờ máy** (`localDay(new Date())`), khác "hôm nay trong game" 2026-10-31. Ngày lịch ôn không bao giờ đi vào SQL. Hàm thuần nhận `today: string` và `rnd: () => number` làm tham số để test được.
- Luyện tập: **0 XP**; draft luyện tập **không lưu**; gợi ý mở khi luyện tập **không ghi** vào `save.hintsUsed`. Boss không có biến thể và không vào Luyện tập.
- Story luôn chơi `variants[0]`. Template `{{x}}` chỉ được thấy qua `loadTicketTemplates()`.
- Không viết test import `src/ui/*` hoặc `src/session.ts`/`src/state.ts` (Vitest chạy Node, không DOM, không thêm jsdom). UI kiểm tay theo checklist ở Task 10.
- Commit: mỗi task một commit (bước cuối mỗi task).

## Tên dùng từ Plan 1 / 1b (interface tiêu thụ — Task 0 và Task 6 Step 0 kiểm bằng grep)

Đã đối chiếu với văn bản Plan 1 Task 4–10 (Task 10 đã viết lại theo cấu trúc tách `state.ts` + `ui/*`). Plan này dựa vào đúng các tên dưới đây. Nếu Task 0 thấy thiếu tên nào: **dừng lại và báo**, không tự chế tên khác.

| File | Tên dùng trong plan này |
|---|---|
| `src/i18n/index.ts` | `type Key`, `type Msg`, `t(key: Key, p?: Record<string, string \| number>): string`, `getLang(): Lang` |
| `src/i18n/vi.ts`, `en.ts` | dòng mở `export const vi = {` và `export const en: Record<Key, Msg> = {` |
| `src/tickets.ts` (P1 T4) | `type Lang = 'vi' \| 'en'`, `type Beat`, `type Variant = Record<string, string>`, `Ticket` (`id, chapter, title, from, difficulty, beat, requires, grants, tables, ordered, body, task, hints, steps: { title; prompt; solution; columns? }[], conclusion?, starter?, variants?: Variant[], en?: TicketText`), `textOf(t: Ticket, lang: Lang): TicketText & { fallback: boolean }`. Parser đã kiểm `variants` (2–4 bộ, giá trị an toàn, đúng các khóa `{{x}}`, boss không có) |
| `src/content.ts` (P1 T7) | `loadTickets(): Ticket[]` với thân `Object.entries(files).map(…).sort(byOrder)` |
| `src/progress.ts` (P1 T5) | `SKILLS: Skill[]`, `CHAPTERS: Chapter[]`, `Skill { id; chapter; label: Bilingual; syntax: string; when: Bilingual; trap: Bilingual }`, `Chapter { chapter; title: Bilingual; outcomes: (Bilingual & { skills: string[] })[] }`, `chapterTitle(chapter: number, lang: Lang): string`, `CHAPTER_TABLES`, `currentChapter(tickets, completed)`, `xpFor(ticket, hintsUsed)` |
| `src/save.ts` (P1 T6) | `SAVE_VERSION = 1`, `SAVE_KEY = 'cargo-query-save'`, `oldSaveKey(v)`, `Save`, `Known { ticketIds: ReadonlySet<string>; skills: ReadonlySet<string> }`, `KV`, `NewerSaveError`, `Migration = (data, known) => …`, `export const MIGRATIONS: Record<number, Migration> = {};`, `emptySave()` (một dòng), `serializeSave`, `parseSave(raw, known, migrations?, version?)` (trong thân: biến `d`, tham số `known`, thuộc tính `drafts: pickRecord(`), `loadSave(storage, known, …)` |
| `src/state.ts` | `app` (`tickets, save, selectedId, stepIndex, …`), `done()`, `selected()`, `draftKey()`, `persist(now?)` |
| `src/ui/work.ts` | `mountWork(host, deps): WorkArea`, `WorkArea.setTicket(t, stepIndex, force?)`, deps có `onSolved(t)`, `onStepSolved()`, `onConclusion(t)`, `onRun()`; trong `submit()` có nhánh `if (!r.ok) {`; đọc/ghi draft bằng `app.save.drafts[draftKey()]` |
| `src/ui/brief.ts` | `renderBrief(host: HTMLElement, ticket: Ticket, stepIndex: number): void` (thay toàn bộ con của `host`); đọc/ghi gợi ý bằng `app.save.hintsUsed[...]` |
| `src/ui/topbar.ts` | `renderTopbar(): void` (ghi XP bằng dòng `byId('xp').textContent = t('top.xp', { n: app.save.xp });`) |
| `src/main.ts` | `function rerender()` gọi `renderBrief(` và `renderInbox(`; `function selectTicket(id)`; `function complete(t)` có `app.save.completed.push(t.id)`; bước boss tăng bằng `app.stepIndex++` trong `nextStep()`; `const work = mountWork(` với `onSolved: (t) => complete(t),`; lúc mở trang `app.selectedId = firstOpen();` |
| `index.html` | `id="inbox-btn"`, `id="inbox-list"`, `<script type="module"`, `<span id="xp"></span>` |
| `tests/helpers.ts` | `runner()` (đã có trong repo) |
| `src/grader.ts` | `cellKey(v)` (đã có trong repo) |

## File Structure

```
content/glossary.yml           ~35 thuật ngữ freight { term, vi, en, columns }
content/tickets/ch1/ch1-03.md  + variants (tháng)            (sửa)
content/tickets/ch2/ch2-04.md  + variants (trạng thái lô)    (sửa)
src/save.ts                    v2: review, practice, sandboxDraft, bossStep; MIGRATIONS[1]; SANDBOX_DRAFT_MAX (sửa)
src/content.ts                 loadTicketTemplates(); loadTickets() = variants[0]   (sửa)
src/variants.ts                renderTemplate, applyVariant, templateVars, variantsOf
src/practice.ts                Leitner [1,2,4,8,16] + chọn bài luyện (hàm thuần)
src/overview.ts                learnedSkills, progressLine, skillLevel, outcomeDone, chapterSummary, grantedBy, resumeStep
src/glossary.ts                parseGlossary, GLOSSARY, normalize, matches
src/session.ts                 chế độ story/practice/sandbox + accessor draft/gợi ý/đóng ticket
src/ui/modes.ts                vào/ra Luyện tập & Sandbox, renderLeft, renderModes
src/ui/progressView.ts         renderProgress (Ch x/7 · n/35 ticket · XP · Ôn: N)
src/ui/chapterView.ts          goalCard, skillChips, openChapterSummary, skillLabel
src/ui/skillMap.ts             openSkillMap
src/ui/notebook.ts             toggleNotebook (dialog không modal)
src/ui/work.ts, brief.ts, topbar.ts, src/main.ts, index.html, src/style.css, src/i18n/{vi,en}.ts   (sửa ở điểm neo)
tests/fixtures/save-v2.json, tests/saveV2.test.ts, tests/variants.test.ts, tests/practice.test.ts,
tests/overview.test.ts, tests/glossary.test.ts, tests/release.test.ts
tests/save.test.ts             (sửa kỳ vọng v1 → v2)
CLAUDE.md                      (thêm mục Plan 1c)
```

---

### Task 0: Kiểm tiền đề (không sửa file)

**Files:** không có.

**Interfaces:**
- Consumes: toàn bộ bảng "Giả định về Plan 1 / 1b" ở trên.
- Produces: không có.

- [ ] **Step 1: Test và kiểu đang sạch**

Run: `npm test && npx tsc --noEmit`
Expected: mọi test PASS, `tsc` không in lỗi.

- [ ] **Step 2: Grep các điểm neo của Task 1–5 (logic thuần)**

Run:
```bash
grep -c "export function textOf\|export type Lang\|variants?: Variant\[\]" src/tickets.ts
grep -c "export function loadTickets(): Ticket\[\] {" src/content.ts
grep -c "export const SKILLS\|export const CHAPTERS\|export function chapterTitle\|export const CHAPTER_TABLES\|export function currentChapter\|export function xpFor" src/progress.ts
grep -c "export const SAVE_VERSION = 1;\|export const MIGRATIONS: Record<number, Migration> = {};\|export const emptySave = \|export function parseSave(raw: string, known: Known\|drafts: pickRecord\|export const oldSaveKey" src/save.ts
ls content/skills.yml content/chapters.yml
```
Expected (số dòng khớp, lần lượt): `3`, `1`, `6`, `6`, và `ls` in ra 2 đường dẫn.

Nếu một dòng ra `0` hoặc `ls` báo không có file: **dừng plan và báo** tên thiếu cho người điều phối. Không tự chế tên thay thế. Điểm neo của giao diện (Task 6–9) được kiểm ở Task 6 Step 0, nên Task 1–5 vẫn chạy được khi phần UI của Plan 1 chưa khớp.

Task này không commit.

---

### Task 1: Save v2 (một lần nâng duy nhất)

**Files:**
- Modify: `src/save.ts`, `tests/save.test.ts`
- Create: `tests/fixtures/save-v2.json`, `tests/saveV2.test.ts`

**Interfaces:**
- Consumes: `Save`, `Known`, `emptySave`, `serializeSave`, `parseSave`, `loadSave`, `oldSaveKey`, `NewerSaveError`, `SAVE_KEY`, `KV`, `Migration`, `MIGRATIONS` (Plan 1 Task 6)
- Produces:
  - `SAVE_VERSION = 2`
  - `Save` thêm: `review: Record<string, { box: number; due: string }>`, `practice: { solved: number; failed: number }`, `sandboxDraft: string`, `bossStep: Record<string, number>`
  - `SANDBOX_DRAFT_MAX = 20_000`
  - `MIGRATIONS[1]`: v1 → v2 thêm 4 trường rỗng (hàm thuần, không cần biết nội dung)
  - `parseSave` validate v2: `review` chỉ giữ skill trong `known.skills`, `box` nguyên 1..5, `due` khớp `^\d{4}-\d{2}-\d{2}$`; `practice.*` nguyên ≥ 0 (sai → 0); `sandboxDraft` string, cắt ở 20.000 ký tự; `bossStep` chỉ giữ ticket trong `known.ticketIds`, giá trị nguyên ≥ 0

- [ ] **Step 1: Tạo fixture `tests/fixtures/save-v2.json`**

Mẫu save v2 thật. **Không bao giờ sửa file này** sau khi commit.

```json
{
  "version": 2,
  "completed": ["ch1-01", "ch1-02", "ch1-03"],
  "xp": 500,
  "hintsUsed": { "ch1-02": 1 },
  "drafts": { "ch1-04#0": "SELECT full_name FROM employees" },
  "review": {
    "select": { "box": 3, "due": "2026-11-20" },
    "where": { "box": 1, "due": "2026-11-17" }
  },
  "practice": { "solved": 4, "failed": 1 },
  "sandboxDraft": "SELECT count(*) FROM shipments",
  "bossStep": { "ch1-05": 1 }
}
```

- [ ] **Step 2: Viết test `tests/saveV2.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import v1 from './fixtures/save-v1.json?raw';
import v2 from './fixtures/save-v2.json?raw';
import {
  emptySave, loadSave, NewerSaveError, oldSaveKey, parseSave, SANDBOX_DRAFT_MAX, SAVE_KEY, type Known, type KV,
} from '../src/save';

const known: Known = {
  ticketIds: new Set(['ch1-01', 'ch1-02', 'ch1-03', 'ch1-04', 'ch1-05']),
  skills: new Set(['select', 'where', 'order_by', 'limit']),
};

function memStore(initial: Record<string, string> = {}): KV & { data: Record<string, string> } {
  const data = { ...initial };
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; } };
}

describe('save v2', () => {
  it('emptySave có đủ trường v2', () => {
    expect(emptySave()).toMatchObject({ version: 2, review: {}, practice: { solved: 0, failed: 0 }, sandboxDraft: '', bossStep: {} });
  });

  it('đọc save mẫu v2 nguyên vẹn', () => {
    expect(parseSave(v2, known)).toEqual(JSON.parse(v2));
  });

  it('migrate v1 → v2: giữ dữ liệu v1, thêm trường v2 rỗng', () => {
    expect(parseSave(v1, known)).toEqual({
      ...emptySave(),
      completed: ['ch1-01', 'ch1-02'],
      xp: 350,
      hintsUsed: { 'ch1-02': 1 },
      drafts: { 'ch1-03#0': 'SELECT ref FROM shipments' },
    });
  });

  it('bỏ giá trị v2 sai kiểu hoặc không còn tồn tại', () => {
    const raw = JSON.stringify({
      version: 2, completed: [], xp: 0, hintsUsed: {}, drafts: {},
      review: {
        select: { box: 2, due: '2026-11-20' },
        gone: { box: 1, due: '2026-11-20' },
        where: { box: 6, due: '2026-11-20' },
        limit: { box: 1, due: '20/11/2026' },
      },
      practice: { solved: -1, failed: 2.5 },
      sandboxDraft: 'x'.repeat(SANDBOX_DRAFT_MAX + 10),
      bossStep: { 'ch1-05': 1, gone: 1, 'ch1-04': -1 },
    });
    const s = parseSave(raw, known);
    expect(s.review).toEqual({ select: { box: 2, due: '2026-11-20' } });
    expect(s.practice).toEqual({ solved: 0, failed: 0 });
    expect(s.sandboxDraft).toHaveLength(SANDBOX_DRAFT_MAX);
    expect(s.bossStep).toEqual({ 'ch1-05': 1 });
  });

  it('từ chối save v3', () => {
    expect(() => parseSave(JSON.stringify({ version: 3 }), known)).toThrow(NewerSaveError);
  });

  it('loadSave từ v1 bằng MIGRATIONS thật: giữ bản gốc ở oldSaveKey(1), migrate lên v2', () => {
    const store = memStore({ [SAVE_KEY]: v1 });
    const r = loadSave(store, known);
    expect(r.warning).toBeUndefined();
    expect(r.save).toMatchObject({ version: 2, completed: ['ch1-01', 'ch1-02'], review: {}, bossStep: {} });
    expect(store.data[oldSaveKey(1)]).toBe(v1);
  });
});
```

- [ ] **Step 3: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/saveV2.test.ts`
Expected: FAIL — `SANDBOX_DRAFT_MAX` không được export (hoặc `emptySave().version` là 1).

- [ ] **Step 4: Sửa `src/save.ts`**

4a. Đổi dòng `export const SAVE_VERSION = 1;` thành:
```ts
export const SAVE_VERSION = 2;
export const SANDBOX_DRAFT_MAX = 20_000;
```

4b. Trong `export interface Save { … }`, thêm ngay sau dòng khai báo `drafts: Record<string, string>;`:
```ts
  // --- v2 (Plan 1c) ---
  /** Leitner card per skill id. `due` = real local day 'YYYY-MM-DD' of the player's machine, never the in-game date. */
  review: Record<string, { box: number; due: string }>;
  /** Practice totals for display only; never affect unlocking or XP. */
  practice: { solved: number; failed: number };
  /** Sandbox editor content, at most SANDBOX_DRAFT_MAX chars. */
  sandboxDraft: string;
  /** Boss step reached (0-based) for tickets not completed yet. Clamped to steps.length - 1 on use. */
  bossStep: Record<string, number>;
```

4c. Thay dòng `export const MIGRATIONS: Record<number, Migration> = {};` bằng:
```ts
export const MIGRATIONS: Record<number, Migration> = {
  // v1 → v2: pure, needs no content. Learned skills missing from `review` are treated as box 1 due today at read time.
  1: (d) => ({ ...d, review: {}, practice: { solved: 0, failed: 0 }, sandboxDraft: '', bossStep: {} }),
};
```

4d. Thay toàn bộ định nghĩa `export const emptySave = …` (một biểu thức) bằng:
```ts
export const emptySave = (): Save => ({
  version: SAVE_VERSION,
  completed: [],
  xp: 0,
  hintsUsed: {},
  drafts: {},
  review: {},
  practice: { solved: 0, failed: 0 },
  sandboxDraft: '',
  bossStep: {},
});
```

4e. Thêm ngay **trước** dòng `export function parseSave(`:
```ts
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;

type V2Fields = Pick<Save, 'review' | 'practice' | 'sandboxDraft' | 'bossStep'>;

function readV2(d: Record<string, unknown>, known: Known): V2Fields {
  const review: Save['review'] = {};
  if (isRecord(d.review)) {
    for (const [skill, c] of Object.entries(d.review)) {
      if (known.skills.has(skill) && isRecord(c) && isCount(c.box) && c.box >= 1 && c.box <= 5 && typeof c.due === 'string' && DAY_RE.test(c.due)) {
        review[skill] = { box: c.box, due: c.due };
      }
    }
  }
  const bossStep: Save['bossStep'] = {};
  if (isRecord(d.bossStep)) {
    for (const [id, n] of Object.entries(d.bossStep)) if (known.ticketIds.has(id) && isCount(n)) bossStep[id] = n;
  }
  const p = isRecord(d.practice) ? d.practice : {};
  return {
    review,
    practice: { solved: isCount(p.solved) ? p.solved : 0, failed: isCount(p.failed) ? p.failed : 0 },
    sandboxDraft: typeof d.sandboxDraft === 'string' ? d.sandboxDraft.slice(0, SANDBOX_DRAFT_MAX) : '',
    bossStep,
  };
}
```

4f. Trong object mà `parseSave` trả về, thêm ngay sau thuộc tính `drafts: pickRecord(…),`:
```ts
    ...readV2(d, known),
```
(`d` là dữ liệu sau vòng migration, `known` là tham số thứ hai của `parseSave`.) `readV2` chạy với mọi `version`, nên các test dùng `migrations`/`version` tùy biến của Plan 1 vẫn nhận save có đủ trường v2.

- [ ] **Step 5: Sửa kỳ vọng v1 trong `tests/save.test.ts`**

Sau khi nâng version, các object kỳ vọng viết tay có `version: 1` (kết quả của `parseSave`) không còn đúng. Với **mỗi** object như vậy trong `tests/save.test.ts`: bỏ `version: 1` và đặt `...emptySave(),` lên đầu object, giữ nguyên các trường còn lại. Ví dụ:
```ts
// trước
expect(parseSave(v1, known)).toEqual({ version: 1, completed: ['ch1-01', 'ch1-02'], xp: 350, hintsUsed: { 'ch1-02': 1 }, drafts: { 'ch1-03#0': 'SELECT ref FROM shipments' } });
// sau
expect(parseSave(v1, known)).toEqual({ ...emptySave(), completed: ['ch1-01', 'ch1-02'], xp: 350, hintsUsed: { 'ch1-02': 1 }, drafts: { 'ch1-03#0': 'SELECT ref FROM shipments' } });
```
Áp cho hai test `đọc được save mẫu v1` và `bỏ ticket không còn tồn tại và giá trị sai kiểu`.

Test `save đúng version hiện tại → không tạo bản .v<old>` đang nạp `v1`, mà v1 giờ cũ hơn bản hiện tại nên sẽ tạo `.v1`. Trong test đó đổi `memoryStorage({ [SAVE_KEY]: v1 })` thành `memoryStorage({ [SAVE_KEY]: serializeSave(emptySave()) })` (cả hai hàm đã được import ở đầu file).

Không sửa `tests/fixtures/save-v1.json`.

- [ ] **Step 6: Chạy test, xác nhận PASS**

Run: `npx vitest run tests/save.test.ts tests/saveV2.test.ts && npx tsc --noEmit`
Expected: mọi test PASS; `tsc` không lỗi. Nếu `tsc` báo nơi khác tạo `Save` bằng object literal thiếu trường v2: sửa nơi đó thành `{ ...emptySave(), … }`.

- [ ] **Step 7: Chạy toàn bộ**

Run: `npm test && npx tsc --noEmit`
Expected: tất cả PASS.

- [ ] **Step 8: Commit**

Theo luật A8 (release nâng save đi riêng), commit này chỉ chứa save v2.
```bash
git add src/save.ts tests/save.test.ts tests/saveV2.test.ts tests/fixtures/save-v2.json
git commit -m "feat: save v2 (review, practice, sandboxDraft, bossStep) via migration 1->2"
```

---
### Task 2: Biến thể ticket (`{{x}}`) và nội dung biến thể ch1–3

**Files:**
- Create: `src/variants.ts`, `tests/variants.test.ts`
- Modify: `src/content.ts`, `content/tickets/ch1/ch1-03.md`, `content/tickets/ch2/ch2-04.md`

**Interfaces:**
- Consumes: `Ticket`, `Variant`, `variants?` (Plan 1 Task 4 — parser đã kiểm 2–4 bộ, giá trị an toàn, đúng khóa, boss không có); `loadTickets` (Plan 1 Task 7); `runner` (tests/helpers.ts); `cellKey` (`src/grader.ts`)
- Produces:
  - `type VariantVars = Record<string, string>`
  - `variantsOf(t: Ticket): VariantVars[]`
  - `renderTemplate(s: string, vars: VariantVars): string` — biến không có giá trị giữ nguyên `{{x}}`
  - `applyVariant(t: Ticket, index: number): Ticket` — thay `{{x}}` trong **mọi** chuỗi của ticket (VI, EN, Solution, `starter`, kết luận…) trừ khóa `variants`; ticket không có biến thể trả về chính nó
  - `templateVars(t: Ticket): string[]` — tên biến xuất hiện trong ticket, sắp xếp, không trùng
  - `loadTicketTemplates(): Ticket[]` (template thô, đã sắp theo `byOrder`); `loadTickets()` đổi thành `loadTicketTemplates().map((t) => applyVariant(t, 0))`

Lý do đặt chỗ render ở loader: Học chính luôn chơi `variants[0]`, nên toàn bộ UI và test nội dung của Plan 1 không bao giờ thấy `{{x}}`. Chỉ Luyện tập đọc template.

- [ ] **Step 1: Viết test `tests/variants.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { loadTicketTemplates, loadTickets } from '../src/content';
import { cellKey } from '../src/grader';
import { applyVariant, renderTemplate, templateVars, variantsOf } from '../src/variants';
import { runner } from './helpers';

/** Strings a player reads or the grader runs; excludes ids and metadata. */
const SKIP_KEYS = new Set(['id', 'from', 'variants', 'tables', 'requires', 'grants', 'beat']);
function texts(v: unknown, key = ''): string[] {
  if (SKIP_KEYS.has(key)) return [];
  if (typeof v === 'string') return [v];
  if (Array.isArray(v)) return v.flatMap((x) => texts(x));
  if (v && typeof v === 'object') return Object.entries(v).flatMap(([k, x]) => texts(x, k));
  return [];
}

describe('renderTemplate / applyVariant', () => {
  it('thay biến có giá trị, giữ nguyên biến không có giá trị', () => {
    expect(renderTemplate("a = '{{x}}' AND b = {{y}}", { x: '1' })).toBe("a = '1' AND b = {{y}}");
  });

  it('thay mọi chuỗi lồng nhau và không đổi ticket gốc', () => {
    const base = loadTickets()[0];
    const tpl = {
      ...base,
      title: 'T {{m}}',
      hints: ['h {{m}}', 'b', 'c'],
      steps: [{ ...base.steps[0], solution: "SELECT '{{m}}'" }],
      variants: [{ m: 'A' }, { m: 'B' }],
    };
    const v1 = applyVariant(tpl, 1);
    expect(v1.title).toBe('T B');
    expect(v1.hints[0]).toBe('h B');
    expect(v1.steps[0].solution).toBe("SELECT 'B'");
    expect(tpl.title).toBe('T {{m}}');
    expect(templateVars(tpl)).toEqual(['m']);
  });

  it('ticket không có biến thể: applyVariant trả về chính nó', () => {
    const plain = loadTicketTemplates().find((t) => variantsOf(t).length === 0)!;
    expect(applyVariant(plain, 0)).toBe(plain);
  });

  it('Học chính không còn {{…}}', () => {
    for (const t of loadTickets()) expect(texts(t).join('\n'), t.id).not.toMatch(/\{\{\w+\}\}/);
  });
});

describe('biến thể trong nội dung', () => {
  const templates = loadTicketTemplates();

  // Format rules (2–4 sets, safe values, exact keys, no boss) are enforced by parseTicket (Plan 1 Task 4).
  it('không sót giá trị cứng của biến thể 0 ở chỗ lẽ ra phải là {{x}}', () => {
    const problems: string[] = [];
    for (const t of templates) {
      const vs = variantsOf(t);
      if (vs.length === 0) continue;
      const first = vs[0];
      vs.slice(1).forEach((v, j) => {
        const all = texts(applyVariant(t, j + 1)).join('\n');
        for (const [k, x] of Object.entries(first)) {
          if (v[k] !== x && all.includes(String(x))) problems.push(`${t.id}#${j + 1}: còn sót "${x}" của biến thể 0 — đổi chỗ đó thành {{${k}}}`);
        }
      });
    }
    expect(problems).toEqual([]);
  });

  it('mọi biến thể: Solution chạy được, có dữ liệu, kết quả khác nhau từng đôi', async () => {
    const run = await runner();
    for (const t of templates.filter((x) => variantsOf(x).length > 0)) {
      const seen: string[] = [];
      for (let i = 0; i < variantsOf(t).length; i++) {
        const sql = applyVariant(t, i).steps[0].solution;
        expect(sql, `${t.id}#${i}`).not.toMatch(/current_date|current_timestamp|localtimestamp|now\s*\(/i);
        const r = await run(sql);
        expect(r.rows.length, `${t.id}#${i}`).toBeGreaterThan(0);
        seen.push(r.rows.map((row) => row.map(cellKey).join('|')).join('\n'));
      }
      expect(new Set(seen).size, `${t.id}: các biến thể cho kết quả trùng nhau`).toBe(seen.length);
    }
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/variants.test.ts`
Expected: FAIL — không resolve được `../src/variants`.

- [ ] **Step 3: Viết `src/variants.ts`**

```ts
import type { Ticket } from './tickets';

/** Same shape as tickets.ts `Variant`; values were validated by parseTicket. */
export type VariantVars = Record<string, string>;

const VAR_RE = /\{\{(\w+)\}\}/g;

export const variantsOf = (t: Ticket): VariantVars[] => (t.variants ?? []) as VariantVars[];

export function renderTemplate(s: string, vars: VariantVars): string {
  return s.replace(VAR_RE, (m, k: string) => (Object.hasOwn(vars, k) ? String(vars[k]) : m));
}

/** Applies `f` to every string in a ticket, including fields added later (EN block, starter...). */
function mapStrings<T>(v: T, f: (s: string) => string): T {
  if (typeof v === 'string') return f(v) as T;
  if (Array.isArray(v)) return v.map((x) => mapStrings(x, f)) as T;
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === 'variants' ? x : mapStrings(x, f)])) as T;
  }
  return v;
}

export function applyVariant(t: Ticket, index: number): Ticket {
  const vars = variantsOf(t)[index];
  return vars ? mapStrings(t, (s) => renderTemplate(s, vars)) : t;
}

export function templateVars(t: Ticket): string[] {
  const names = new Set<string>();
  mapStrings(t, (s) => {
    for (const m of s.matchAll(VAR_RE)) names.add(m[1]);
    return s;
  });
  return [...names].sort();
}
```

- [ ] **Step 4: Tách loader trong `src/content.ts`**

4a. Thêm import ở đầu file:
```ts
import { applyVariant } from './variants';
```

4b. Đổi tên hàm hiện có `export function loadTickets(): Ticket[] {` thành `export function loadTicketTemplates(): Ticket[] {` (giữ nguyên thân hàm), rồi thêm ngay bên dưới hàm đó:
```ts
/** Story mode always plays variants[0]; Practice reads the raw templates via loadTicketTemplates(). */
export function loadTickets(): Ticket[] {
  return loadTicketTemplates().map((t) => applyVariant(t, 0));
}
```

- [ ] **Step 5: Chạy test, xác nhận PASS (chưa có ticket nào có biến thể)**

Run: `npx vitest run tests/variants.test.ts && npx tsc --noEmit`
Expected: PASS (hai test nội dung chạy qua danh sách rỗng); `tsc` không lỗi.

- [ ] **Step 6: Thêm biến thể cho `ch2-04` (đếm lô theo trạng thái)**

Trong `content/tickets/ch2/ch2-04.md`:
1. Thay dòng `title:` bằng `title: Bao nhiêu lô ở trạng thái {{status}}?`
2. Thay dòng `title_en:` bằng `title_en: How many shipments are {{status}}?`
3. Thêm vào frontmatter (ngay trước dòng `---` đóng):
```yaml
variants:
  - { status: IN_TRANSIT }
  - { status: BOOKED }
  - { status: DELIVERED }
```
4. Trong toàn file (phần VI, khối `# EN`, gợi ý, Solution): thay mọi `` `IN_TRANSIT` `` bằng `` `{{status}}` `` và mọi `'IN_TRANSIT'` bằng `'{{status}}'`.

- [ ] **Step 7: Thêm biến thể cho `ch1-03` (lô nặng nhất theo tháng)**

Trong `content/tickets/ch1/ch1-03.md`:
1. Thay dòng `title:` bằng `title: Lô hàng nặng nhất tháng {{month}}`
2. Thay dòng `title_en:` bằng `title_en: Heaviest shipments in {{month}}`
3. Thêm vào frontmatter (ngay trước dòng `---` đóng):
```yaml
variants:
  - { month: "10/2026", from: "2026-10-01", to: "2026-11-01" }
  - { month: "08/2026", from: "2026-08-01", to: "2026-09-01" }
  - { month: "05/2026", from: "2026-05-01", to: "2026-06-01" }
```
4. Trong toàn file: thay `'2026-10-01'` bằng `'{{from}}'`, `'2026-11-01'` bằng `'{{to}}'`, và `10/2026` bằng `{{month}}`.
5. Trong khối `# EN`: mọi cụm chỉ tháng 10/2026 bằng chữ (ví dụ `October 2026`, `Oct 2026`) thay bằng `{{month}}`.

Câu phá hòa ("bằng cân thì xếp theo `ref`") nằm ở phần không template nên mọi biến thể đều có (luật PD §3.1.5).

- [ ] **Step 8: Chạy test, xác nhận PASS**

Run: `npx vitest run tests/variants.test.ts tests/content.test.ts && npx tsc --noEmit`
Expected: tất cả PASS. Nếu test "còn sót" báo một giá trị của biến thể 0 (ví dụ `2026-10-01` trong một gợi ý), sửa đúng chỗ đó thành `{{biến}}` tương ứng rồi chạy lại. Không sửa test.

- [ ] **Step 9: Chạy toàn bộ**

Run: `npm test && npx tsc --noEmit`
Expected: tất cả PASS.

- [ ] **Step 10: Commit**

```bash
git add src/variants.ts src/content.ts tests/variants.test.ts content/tickets/ch1/ch1-03.md content/tickets/ch2/ch2-04.md
git commit -m "feat: ticket variants with {{x}} templates; story plays variants[0]"
```

---

### Task 3: Lịch ôn Leitner và chọn bài luyện (`src/practice.ts`)

**Files:**
- Create: `src/practice.ts`, `tests/practice.test.ts`

**Interfaces:**
- Consumes: `Ticket`, `Beat` (Plan 1 Task 4); `variantsOf`, `loadTickets` (Task 2)
- Produces:
  - `interface Card { box: number; due: string }`, `type Review = Record<string, Card>`, `interface PracticeStats { solved: number; failed: number }`
  - `interface PracticeItem { ticketId: string; variant: number; skills: string[] }`
  - `INTERVALS = [1, 2, 4, 8, 16]` (ngày, chỉ số = `box - 1`), `MAX_BOX = 5`, `QUEUE_MAX = 5`
  - `localDay(d: Date): string` — ngày theo giờ máy, `YYYY-MM-DD`
  - `addDays(day: string, n: number): string`
  - `cardOf(review: Review, skill: string, today: string): Card` — kỹ năng đã học mà chưa có thẻ (save migrate từ v1) = `{ box: 1, due: today }`
  - `nextCard(card: Card | undefined, success: boolean, today: string): Card` — đạt: `box = min(box + 1, 5)`, `due = today + INTERVALS[box - 1]` (theo hộp mới); chưa đạt: `{ box: 1, due: today + 1 }`
  - `isSuccess(wrongSubmits: number, hints: number): boolean` — gọi khi đã nộp đúng; đạt khi 0 lần sai và ≤ 1 gợi ý
  - `seedReview(review: Review, skills: string[], today: string): Review` — kỹ năng mới học: `{ box: 1, due: ngày mai }`; không đè thẻ đã có
  - `dueSkills(review: Review, learned: Iterable<string>, today: string): string[]` — sắp theo `due` rồi id
  - `variantFor(t: Ticket, rnd: () => number): number` — có ≥ 2 biến thể thì chọn ngẫu nhiên ≠ 0, ngược lại 0
  - `pickForSkill(skill: string, templates: Ticket[], completed: Set<string>, rnd: () => number): PracticeItem | undefined` — ticket đã xong, không phải boss, kỹ năng nằm trong `grants ∪ requires`, ưu tiên ticket có biến thể
  - `todayQueue(review: Review, learned: Iterable<string>, templates: Ticket[], completed: Set<string>, today: string, rnd: () => number): PracticeItem[]` — tối đa `QUEUE_MAX`
  - `retryItem(t: Ticket, rnd: () => number): PracticeItem` — `skills = t.grants`
  - `applyResult(state: { review: Review; practice: PracticeStats }, skills: string[], success: boolean, today: string): { review: Review; practice: PracticeStats }` — không đổi input

- [ ] **Step 1: Viết test `tests/practice.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { loadTickets } from '../src/content';
import {
  addDays, applyResult, cardOf, dueSkills, INTERVALS, isSuccess, localDay, nextCard,
  pickForSkill, QUEUE_MAX, retryItem, seedReview, todayQueue, variantFor,
} from '../src/practice';
import type { Beat, Ticket } from '../src/tickets';

const T = '2026-11-16';
const base = loadTickets()[0];
const mk = (id: string, beat: Beat, extra: Partial<Ticket> = {}): Ticket => ({
  ...base, id, chapter: Number(id[2]), beat, requires: [], grants: [], variants: [], ...extra,
});

describe('ngày', () => {
  it('localDay theo giờ máy, không theo UTC', () => {
    expect(localDay(new Date(2026, 10, 16, 0, 30))).toBe('2026-11-16');
    expect(localDay(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('addDays qua tháng, năm, năm nhuận', () => {
    expect(addDays('2026-11-16', 1)).toBe('2026-11-17');
    expect(addDays('2026-11-30', 2)).toBe('2026-12-02');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });
});

describe('Leitner', () => {
  it('khoảng cách 5 hộp', () => {
    expect(INTERVALS).toEqual([1, 2, 4, 8, 16]);
  });

  it('đạt: lên 1 hộp, hẹn theo hộp mới; hộp 5 giữ nguyên', () => {
    expect(nextCard(undefined, true, T)).toEqual({ box: 2, due: '2026-11-18' });
    expect(nextCard({ box: 2, due: T }, true, T)).toEqual({ box: 3, due: '2026-11-20' });
    expect(nextCard({ box: 4, due: T }, true, T)).toEqual({ box: 5, due: '2026-12-02' });
    expect(nextCard({ box: 5, due: T }, true, T)).toEqual({ box: 5, due: '2026-12-02' });
  });

  it('chưa đạt: về hộp 1, ôn lại ngày mai', () => {
    expect(nextCard({ box: 4, due: T }, false, T)).toEqual({ box: 1, due: '2026-11-17' });
  });

  it('đạt = 0 lần sai và ≤ 1 gợi ý', () => {
    expect(isSuccess(0, 0)).toBe(true);
    expect(isSuccess(0, 1)).toBe(true);
    expect(isSuccess(0, 2)).toBe(false);
    expect(isSuccess(1, 0)).toBe(false);
  });

  it('seedReview: kỹ năng mới học hẹn ngày mai, không đè thẻ cũ, không đổi input', () => {
    const before = { select: { box: 3, due: '2026-11-20' } };
    expect(seedReview(before, ['select', 'where'], T)).toEqual({
      select: { box: 3, due: '2026-11-20' },
      where: { box: 1, due: '2026-11-17' },
    });
    expect(before).toEqual({ select: { box: 3, due: '2026-11-20' } });
  });

  it('cardOf: kỹ năng đã học chưa có thẻ = hộp 1 đến hạn hôm nay', () => {
    expect(cardOf({}, 'where', T)).toEqual({ box: 1, due: T });
  });

  it('dueSkills: chỉ kỹ năng đến hạn, sắp theo ngày rồi id', () => {
    const review = { select: { box: 2, due: '2026-11-20' }, where: { box: 1, due: '2026-11-10' } };
    expect(dueSkills(review, ['select', 'where', 'limit'], T)).toEqual(['where', 'limit']);
  });

  it('applyResult: đạt thì lên hộp, chưa đạt thì về hộp 1; đếm solved/failed; không đổi input', () => {
    const state = { review: { select: { box: 2, due: T } }, practice: { solved: 1, failed: 0 } };
    expect(applyResult(state, ['select', 'where'], true, T)).toEqual({
      review: { select: { box: 3, due: '2026-11-20' }, where: { box: 2, due: '2026-11-18' } },
      practice: { solved: 2, failed: 0 },
    });
    expect(applyResult(state, ['select'], false, T)).toEqual({
      review: { select: { box: 1, due: '2026-11-17' } },
      practice: { solved: 1, failed: 1 },
    });
    expect(state.review.select).toEqual({ box: 2, due: T });
  });
});

describe('chọn bài luyện', () => {
  const plain = mk('ch1-01', 'teach', { grants: ['select'] });
  const varied = mk('ch1-02', 'develop', {
    requires: ['select'], grants: ['where'], variants: [{ x: '1' }, { x: '2' }, { x: '3' }],
  });
  const boss = mk('ch1-05', 'boss', { requires: ['order_by'] });
  const notDone = mk('ch1-03', 'twist', { requires: ['select'], variants: [{ x: '1' }, { x: '2' }] });
  const wide = mk('ch1-04', 'rest', { requires: ['k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7'] });
  const templates = [plain, varied, notDone, wide, boss];
  const completed = new Set(['ch1-01', 'ch1-02', 'ch1-04', 'ch1-05']);

  it('variantFor: chọn biến thể khác 0 khi có ≥ 2, ngược lại 0', () => {
    expect(variantFor(varied, () => 0)).toBe(1);
    expect(variantFor(varied, () => 0.99)).toBe(2);
    expect(variantFor(plain, () => 0.5)).toBe(0);
  });

  it('pickForSkill ưu tiên ticket đã xong có biến thể; bỏ boss và ticket chưa xong', () => {
    expect(pickForSkill('select', templates, completed, () => 0)).toEqual({ ticketId: 'ch1-02', variant: 1, skills: ['select'] });
    expect(pickForSkill('where', templates, completed, () => 0)).toEqual({ ticketId: 'ch1-02', variant: 1, skills: ['where'] });
    expect(pickForSkill('order_by', templates, completed, () => 0)).toBeUndefined();
    expect(pickForSkill('limit', templates, completed, () => 0)).toBeUndefined();
  });

  it('todayQueue tối đa QUEUE_MAX bài', () => {
    const learned = ['k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7'];
    const q = todayQueue({}, learned, templates, completed, T, () => 0);
    expect(q).toHaveLength(QUEUE_MAX);
    expect(q.every((i) => i.ticketId === 'ch1-04')).toBe(true);
  });

  it('retryItem luyện các kỹ năng ticket đó dạy', () => {
    expect(retryItem(varied, () => 0)).toEqual({ ticketId: 'ch1-02', variant: 1, skills: ['where'] });
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/practice.test.ts`
Expected: FAIL — không resolve được `../src/practice`.

- [ ] **Step 3: Viết `src/practice.ts`**

```ts
import type { Ticket } from './tickets';
import { variantsOf } from './variants';

export interface Card { box: number; due: string }
export type Review = Record<string, Card>;
export interface PracticeStats { solved: number; failed: number }
export interface PracticeItem { ticketId: string; variant: number; skills: string[] }

/** Days until the next review, indexed by box - 1 (boxes 1..5). */
export const INTERVALS = [1, 2, 4, 8, 16] as const;
export const MAX_BOX = INTERVALS.length;
export const QUEUE_MAX = 5;

const pad = (n: number): string => String(n).padStart(2, '0');

/** Real calendar day on the player's machine. Never the in-game 2026-10-31, never used in SQL. */
export const localDay = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** A learned skill without a card (save migrated from v1) counts as box 1, due today. */
export const cardOf = (review: Review, skill: string, today: string): Card => review[skill] ?? { box: 1, due: today };

export function nextCard(card: Card | undefined, success: boolean, today: string): Card {
  const box = success ? Math.min((card?.box ?? 1) + 1, MAX_BOX) : 1;
  return { box, due: addDays(today, INTERVALS[box - 1]) };
}

/** Called after a correct submit: passed only with no wrong submit and at most one hint. */
export const isSuccess = (wrongSubmits: number, hints: number): boolean => wrongSubmits === 0 && hints <= 1;

export function seedReview(review: Review, skills: string[], today: string): Review {
  const out = { ...review };
  for (const s of skills) out[s] ??= { box: 1, due: addDays(today, INTERVALS[0]) };
  return out;
}

export function dueSkills(review: Review, learned: Iterable<string>, today: string): string[] {
  const due = (s: string): string => cardOf(review, s, today).due;
  return [...learned].filter((s) => due(s) <= today).sort((a, b) => due(a).localeCompare(due(b)) || a.localeCompare(b));
}

export function variantFor(t: Ticket, rnd: () => number): number {
  const n = variantsOf(t).length;
  return n >= 2 ? 1 + Math.floor(rnd() * (n - 1)) : 0;
}

export function pickForSkill(skill: string, templates: Ticket[], completed: Set<string>, rnd: () => number): PracticeItem | undefined {
  const pool = templates.filter(
    (t) => completed.has(t.id) && t.beat !== 'boss' && (t.grants.includes(skill) || t.requires.includes(skill)),
  );
  const withVariants = pool.filter((t) => variantsOf(t).length >= 2);
  const from = withVariants.length ? withVariants : pool;
  if (from.length === 0) return undefined;
  const t = from[Math.floor(rnd() * from.length)];
  return { ticketId: t.id, variant: variantFor(t, rnd), skills: [skill] };
}

export function todayQueue(
  review: Review, learned: Iterable<string>, templates: Ticket[], completed: Set<string>, today: string, rnd: () => number,
): PracticeItem[] {
  const out: PracticeItem[] = [];
  for (const skill of dueSkills(review, learned, today)) {
    if (out.length >= QUEUE_MAX) break;
    const item = pickForSkill(skill, templates, completed, rnd);
    if (item) out.push(item);
  }
  return out;
}

export const retryItem = (t: Ticket, rnd: () => number): PracticeItem => ({ ticketId: t.id, variant: variantFor(t, rnd), skills: [...t.grants] });

export function applyResult(
  state: { review: Review; practice: PracticeStats }, skills: string[], success: boolean, today: string,
): { review: Review; practice: PracticeStats } {
  const review = { ...state.review };
  for (const s of skills) review[s] = nextCard(state.review[s], success, today);
  return {
    review,
    practice: {
      solved: state.practice.solved + (success ? 1 : 0),
      failed: state.practice.failed + (success ? 0 : 1),
    },
  };
}
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `npx vitest run tests/practice.test.ts && npx tsc --noEmit`
Expected: tất cả PASS; `tsc` không lỗi.

- [ ] **Step 5: Commit**

```bash
git add src/practice.ts tests/practice.test.ts
git commit -m "feat: Leitner review schedule and practice item selection"
```

---

### Task 4: Tính tiến độ từ save (`src/overview.ts`)

**Files:**
- Create: `src/overview.ts`, `tests/overview.test.ts`

**Interfaces:**
- Consumes: `CHAPTER_TABLES`, `currentChapter`, `xpFor` (Plan 1 Task 5); `Save`, `emptySave` (Task 1); `cardOf`, `dueSkills`, `Review` (Task 3)
- Produces:
  - `type SkillLevel = 'locked' | 'learned' | 'steady' | 'mastered'`
  - `learnedSkills(tickets: Ticket[], completed: Set<string>): Set<string>` — hợp các `grants` của ticket đã xong
  - `interface ProgressLine { chapter: number; chapters: number; done: number; total: number; xp: number; learned: number; due: number }`
  - `progressLine(tickets: Ticket[], chapterCount: number, save: Save, today: string): ProgressLine` — `chapters = max(chapterCount, chương lớn nhất có ticket)`; `total = tickets.length` (không hard-code 7/35)
  - `skillLevel(skill: string, learned: Set<string>, review: Review, today: string): SkillLevel` — box 1–2 đã học, 3–4 đang vững, 5 thuộc
  - `outcomeDone(skills: string[], chapter: number, tickets: Ticket[], completed: Set<string>, learned: Set<string>): boolean` — outcome `skills: []` (chương 7) tick khi mọi ticket của chương đã xong
  - `interface ChapterSummary { xp: number; hints: number; skills: string[]; newTables: string[] }`
  - `chapterSummary(tickets: Ticket[], save: Save, chapter: number): ChapterSummary`
  - `grantedBy(tickets: Ticket[], skill: string): Ticket | undefined`
  - `resumeStep(save: Save, t: Ticket | undefined): number` — bước boss đã lưu, kẹp trong `[0, steps.length - 1]`; ticket đã xong → 0

- [ ] **Step 1: Viết test `tests/overview.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { loadTickets } from '../src/content';
import {
  chapterSummary, grantedBy, learnedSkills, outcomeDone, progressLine, resumeStep, skillLevel,
} from '../src/overview';
import { CHAPTER_TABLES, xpFor } from '../src/progress';
import { emptySave } from '../src/save';
import type { Beat, Ticket } from '../src/tickets';

const T = '2026-11-16';
const base = loadTickets()[0];
const step = base.steps[0];
const mk = (id: string, beat: Beat, extra: Partial<Ticket> = {}): Ticket => ({
  ...base, id, chapter: Number(id[2]), beat, difficulty: 2, requires: [], grants: [], steps: [{ ...step }], variants: [], ...extra,
});

const t1 = mk('ch1-01', 'teach', { grants: ['select'] });
const t2 = mk('ch1-02', 'develop', { requires: ['select'], grants: ['where'] });
const boss = mk('ch1-05', 'boss', { requires: ['where'], steps: [{ ...step }, { ...step }, { ...step }] });
const t4 = mk('ch2-01', 'teach', { grants: ['aggregate'] });
const tickets = [t1, t2, boss, t4];

describe('overview', () => {
  it('learnedSkills = grants của ticket đã xong', () => {
    expect([...learnedSkills(tickets, new Set(['ch1-01']))]).toEqual(['select']);
  });

  it('progressLine tính lại mọi số từ save', () => {
    const save = { ...emptySave(), completed: ['ch1-01', 'ch1-02'], xp: 300, review: { select: { box: 3, due: '2026-11-20' } } };
    expect(progressLine(tickets, 7, save, T)).toEqual({ chapter: 1, chapters: 7, done: 2, total: 4, xp: 300, learned: 2, due: 1 });
    expect(progressLine(tickets, 0, save, T).chapters).toBe(2);
  });

  it('skillLevel theo hộp', () => {
    const learned = new Set(['select', 'where', 'limit']);
    const review = { where: { box: 3, due: T }, limit: { box: 5, due: T } };
    expect(skillLevel('aggregate', learned, review, T)).toBe('locked');
    expect(skillLevel('select', learned, review, T)).toBe('learned');
    expect(skillLevel('where', learned, review, T)).toBe('steady');
    expect(skillLevel('limit', learned, review, T)).toBe('mastered');
  });

  it('outcomeDone: theo kỹ năng; outcome rỗng tick khi xong cả chương có ticket', () => {
    const all = new Set(['ch1-01', 'ch1-02', 'ch1-05']);
    const learned = learnedSkills(tickets, all);
    expect(outcomeDone(['select', 'where'], 1, tickets, all, learned)).toBe(true);
    expect(outcomeDone(['aggregate'], 1, tickets, all, learned)).toBe(false);
    expect(outcomeDone([], 1, tickets, all, learned)).toBe(true);
    expect(outcomeDone([], 1, tickets, new Set(['ch1-01']), learned)).toBe(false);
    expect(outcomeDone([], 7, tickets, all, learned)).toBe(false);
  });

  it('chapterSummary: XP tính lại bằng xpFor, tổng gợi ý, kỹ năng, bảng chương sau', () => {
    const save = { ...emptySave(), completed: ['ch1-01', 'ch1-02', 'ch1-05'], hintsUsed: { 'ch1-02': 1 } };
    expect(chapterSummary(tickets, save, 1)).toEqual({
      xp: xpFor(t1, 0) + xpFor(t2, 1) + xpFor(boss, 0),
      hints: 1,
      skills: ['select', 'where'],
      newTables: CHAPTER_TABLES[2] ?? [],
    });
  });

  it('grantedBy tìm ticket dạy kỹ năng', () => {
    expect(grantedBy(tickets, 'where')?.id).toBe('ch1-02');
    expect(grantedBy(tickets, 'cte')).toBeUndefined();
  });

  it('resumeStep: kẹp bước boss, ticket đã xong về 0', () => {
    expect(resumeStep({ ...emptySave(), bossStep: { 'ch1-05': 1 } }, boss)).toBe(1);
    expect(resumeStep({ ...emptySave(), bossStep: { 'ch1-05': 9 } }, boss)).toBe(2);
    expect(resumeStep({ ...emptySave(), completed: ['ch1-05'], bossStep: { 'ch1-05': 1 } }, boss)).toBe(0);
    expect(resumeStep(emptySave(), undefined)).toBe(0);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/overview.test.ts`
Expected: FAIL — không resolve được `../src/overview`.

- [ ] **Step 3: Viết `src/overview.ts`**

```ts
import { cardOf, dueSkills, type Review } from './practice';
import { CHAPTER_TABLES, currentChapter, xpFor } from './progress';
import type { Save } from './save';
import type { Ticket } from './tickets';

export type SkillLevel = 'locked' | 'learned' | 'steady' | 'mastered';

export function learnedSkills(tickets: Ticket[], completed: Set<string>): Set<string> {
  return new Set(tickets.filter((t) => completed.has(t.id)).flatMap((t) => t.grants));
}

export interface ProgressLine { chapter: number; chapters: number; done: number; total: number; xp: number; learned: number; due: number }

export function progressLine(tickets: Ticket[], chapterCount: number, save: Save, today: string): ProgressLine {
  const completed = new Set(save.completed);
  const learned = learnedSkills(tickets, completed);
  return {
    chapter: currentChapter(tickets, completed),
    chapters: Math.max(chapterCount, ...tickets.map((t) => t.chapter)),
    done: tickets.filter((t) => completed.has(t.id)).length,
    total: tickets.length,
    xp: save.xp,
    learned: learned.size,
    due: dueSkills(save.review, learned, today).length,
  };
}

export function skillLevel(skill: string, learned: Set<string>, review: Review, today: string): SkillLevel {
  if (!learned.has(skill)) return 'locked';
  const box = cardOf(review, skill, today).box;
  return box >= 5 ? 'mastered' : box >= 3 ? 'steady' : 'learned';
}

export function outcomeDone(skills: string[], chapter: number, tickets: Ticket[], completed: Set<string>, learned: Set<string>): boolean {
  if (skills.length) return skills.every((s) => learned.has(s));
  const inChapter = tickets.filter((t) => t.chapter === chapter);
  return inChapter.length > 0 && inChapter.every((t) => completed.has(t.id));
}

export interface ChapterSummary { xp: number; hints: number; skills: string[]; newTables: string[] }

export function chapterSummary(tickets: Ticket[], save: Save, chapter: number): ChapterSummary {
  const done = tickets.filter((t) => t.chapter === chapter && save.completed.includes(t.id));
  return {
    xp: done.reduce((sum, t) => sum + xpFor(t, save.hintsUsed[t.id] ?? 0), 0),
    hints: done.reduce((sum, t) => sum + (save.hintsUsed[t.id] ?? 0), 0),
    skills: done.flatMap((t) => t.grants),
    newTables: CHAPTER_TABLES[chapter + 1] ?? [],
  };
}

export const grantedBy = (tickets: Ticket[], skill: string): Ticket | undefined => tickets.find((t) => t.grants.includes(skill));

export function resumeStep(save: Save, t: Ticket | undefined): number {
  if (!t || save.completed.includes(t.id)) return 0;
  return Math.min(Math.max(save.bossStep[t.id] ?? 0, 0), t.steps.length - 1);
}
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `npx vitest run tests/overview.test.ts && npx tsc --noEmit`
Expected: tất cả PASS; `tsc` không lỗi.

- [ ] **Step 5: Commit**

```bash
git add src/overview.ts tests/overview.test.ts
git commit -m "feat: progress, skill levels and chapter summary recomputed from save"
```

---

### Task 5: Thuật ngữ freight (`content/glossary.yml`, `src/glossary.ts`)

**Files:**
- Create: `content/glossary.yml`, `src/glossary.ts`, `tests/glossary.test.ts`

**Interfaces:**
- Consumes: gói `yaml` (đã có); `runner` (tests/helpers.ts)
- Produces:
  - `interface Term { term: string; vi: string; en: string; columns: string[] }` — `vi`/`en` là định nghĩa ngắn; `columns` dạng `table.column`, chỉ gồm cột **đang có** trong DB (thuật ngữ của chương 4+ để `columns: []`, Plan 2/3 bổ sung khi tạo bảng)
  - `parseGlossary(source: string): Term[]` — throw `Error` có số thứ tự mục khi thiếu trường
  - `GLOSSARY: Term[]` — nạp từ `content/glossary.yml?raw`
  - `normalize(s: string): string` — chữ thường, bỏ dấu tiếng Việt (`đ` → `d`)
  - `matches(query: string, ...texts: string[]): boolean` — query rỗng khớp mọi thứ

Thiết kế nội dung (vai Product): thuật ngữ **không khóa** (tra cứu không bị chặn); mỗi mục ≤ 1–2 câu; `term` là mã/viết tắt dùng chung VI–EN; nghĩa VI và EN đều hiện trong Sổ tay (ngôn ngữ đang chọn lên trước). Danh sách bám dữ liệu đang có (`shipments`, `containers`, `ports`, `carriers`) trước, rồi tới thuật ngữ các chương sau để người học có lộ trình.

- [ ] **Step 1: Viết test `tests/glossary.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { GLOSSARY, matches, normalize, parseGlossary } from '../src/glossary';
import { runner } from './helpers';

const VI_DIACRITIC = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

describe('parseGlossary', () => {
  it('đọc mục hợp lệ, columns mặc định rỗng', () => {
    expect(parseGlossary('- { term: TEU, vi: "Đơn vị 20 ft", en: "20 ft unit" }')).toEqual([
      { term: 'TEU', vi: 'Đơn vị 20 ft', en: '20 ft unit', columns: [] },
    ]);
  });

  it('báo lỗi kèm số thứ tự khi thiếu trường hoặc sai dạng', () => {
    expect(() => parseGlossary('- { term: TEU, vi: x }')).toThrow(/#1.*en/);
    expect(() => parseGlossary('term: TEU')).toThrow(/danh sách/);
    expect(() => parseGlossary('- { term: A, vi: x, en: y, columns: [1] }')).toThrow(/#1.*columns/);
  });
});

describe('lọc', () => {
  it('không phân biệt hoa thường và dấu tiếng Việt', () => {
    expect(normalize('Luồng Đỏ')).toBe('luong do');
    expect(matches('teu', 'TEU')).toBe(true);
    expect(matches('luong', 'x', 'Luồng xanh')).toBe(true);
    expect(matches('', 'bất kỳ')).toBe(true);
    expect(matches('zzz', 'TEU', 'đơn vị')).toBe(false);
  });
});

describe('content/glossary.yml', () => {
  it('đủ ~30 mục, term không trùng, EN không có dấu tiếng Việt', () => {
    expect(GLOSSARY.length).toBeGreaterThanOrEqual(30);
    const terms = GLOSSARY.map((g) => g.term.toLowerCase());
    expect(new Set(terms).size).toBe(terms.length);
    for (const g of GLOSSARY) expect(`${g.term} ${g.en}`, g.term).not.toMatch(VI_DIACRITIC);
  });

  it('mọi cột trong columns tồn tại trong DB', async () => {
    const run = await runner();
    const r = await run("SELECT table_name || '.' || column_name FROM information_schema.columns WHERE table_schema = 'public'");
    const existing = new Set(r.rows.map((row) => String(row[0])));
    const missing = GLOSSARY.flatMap((g) => g.columns.filter((c) => !existing.has(c)).map((c) => `${g.term}: ${c}`));
    expect(missing).toEqual([]);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/glossary.test.ts`
Expected: FAIL — không resolve được `../src/glossary`.

- [ ] **Step 3: Tạo `content/glossary.yml`**

```yaml
# Thuật ngữ freight cho Sổ tay. term = mã/viết tắt dùng chung; vi/en = định nghĩa ngắn.
# columns: chỉ cột đang có trong DB (table.column). Thuật ngữ của chương sau để [] cho tới khi có bảng.
- term: TEU
  vi: "Đơn vị tương đương một container 20 feet. Container 40 feet tính là 2 TEU."
  en: "Twenty-foot Equivalent Unit: one 20 ft container. A 40 ft container counts as 2 TEU."
  columns: [containers.teu]
- term: FEU
  vi: "Đơn vị tương đương một container 40 feet, bằng 2 TEU."
  en: "Forty-foot Equivalent Unit: one 40 ft container, equal to 2 TEU."
  columns: [containers.container_type]
- term: 20GP / 40GP / 40HC / 40RF
  vi: "Loại container: khô thường 20 hoặc 40 feet (GP), 40 feet cao (HC, High Cube), 40 feet lạnh (RF, Reefer)."
  en: "Container types: standard dry 20 or 40 ft (GP), 40 ft High Cube (HC), 40 ft refrigerated (RF, reefer)."
  columns: [containers.container_type]
- term: ETD
  vi: "Ngày tàu hoặc chuyến bay dự kiến khởi hành (Estimated Time of Departure)."
  en: "Estimated Time of Departure of the vessel or flight."
  columns: [shipments.etd]
- term: ETA
  vi: "Ngày tàu hoặc chuyến bay dự kiến đến (Estimated Time of Arrival)."
  en: "Estimated Time of Arrival of the vessel or flight."
  columns: [shipments.eta]
- term: ATD
  vi: "Ngày khởi hành thực tế (Actual Time of Departure). NULL nghĩa là lô chưa đi."
  en: "Actual Time of Departure. NULL means the shipment has not left yet."
  columns: [shipments.atd]
- term: ATA
  vi: "Ngày đến thực tế (Actual Time of Arrival). NULL nghĩa là lô chưa đến."
  en: "Actual Time of Arrival. NULL means the shipment has not arrived yet."
  columns: [shipments.ata]
- term: POL
  vi: "Cảng xếp hàng (Port of Loading): nơi hàng lên tàu hoặc máy bay."
  en: "Port of Loading: where the cargo is loaded."
  columns: [shipments.pol]
- term: POD
  vi: "Cảng dỡ hàng (Port of Discharge): nơi hàng được dỡ xuống."
  en: "Port of Discharge: where the cargo is unloaded."
  columns: [shipments.pod]
- term: FCL
  vi: "Hàng nguyên container (Full Container Load): một khách dùng trọn container."
  en: "Full Container Load: one customer uses whole containers."
  columns: [shipments.load_type]
- term: LCL
  vi: "Hàng lẻ (Less than Container Load): nhiều khách ghép chung một container."
  en: "Less than Container Load: several customers share one container."
  columns: [shipments.load_type]
- term: Incoterms
  vi: "Bộ điều kiện giao hàng quốc tế: ai trả cước, ai chịu rủi ro tới điểm nào."
  en: "International delivery terms: who pays the freight and where the risk passes."
  columns: [shipments.incoterm]
- term: EXW
  vi: "Giao tại xưởng (Ex Works): người mua lo gần như toàn bộ việc vận chuyển."
  en: "Ex Works: the buyer arranges almost all of the transport."
  columns: [shipments.incoterm]
- term: FCA
  vi: "Giao cho người chuyên chở (Free Carrier) tại nơi thỏa thuận; dùng được cho mọi phương thức."
  en: "Free Carrier: goods are handed to the buyer's carrier at an agreed place; any transport mode."
  columns: [shipments.incoterm]
- term: FOB
  vi: "Giao lên tàu (Free On Board): rủi ro chuyển khi hàng đã lên tàu. Chỉ dùng cho đường biển."
  en: "Free On Board: risk passes once the goods are on the vessel. Sea freight only."
  columns: [shipments.incoterm]
- term: CFR
  vi: "Tiền hàng và cước (Cost and Freight): người bán trả cước biển tới cảng đích."
  en: "Cost and Freight: the seller pays sea freight to the destination port."
  columns: [shipments.incoterm]
- term: CIF
  vi: "Tiền hàng, bảo hiểm và cước (Cost, Insurance and Freight); chỉ dùng cho đường biển."
  en: "Cost, Insurance and Freight; sea freight only."
  columns: [shipments.incoterm]
- term: CPT / CIP
  vi: "Cước trả tới / cước và bảo hiểm trả tới: bản dùng cho mọi phương thức của CFR / CIF."
  en: "Carriage Paid To / Carriage and Insurance Paid To: the any-mode versions of CFR / CIF."
  columns: [shipments.incoterm]
- term: DAP
  vi: "Giao tại nơi đến (Delivered At Place): người bán lo vận chuyển tới địa điểm của người mua."
  en: "Delivered At Place: the seller delivers to the buyer's named place."
  columns: [shipments.incoterm]
- term: Booking
  vi: "Đặt chỗ trên tàu hoặc chuyến bay cho một lô hàng; ngày đặt là booking_date."
  en: "Space reservation on a vessel or flight for one shipment; its date is booking_date."
  columns: [shipments.booking_date]
- term: Carrier
  vi: "Hãng vận chuyển thực tế: hãng tàu (SEA) hoặc hãng bay (AIR)."
  en: "The actual transport company: a shipping line (SEA) or an airline (AIR)."
  columns: [shipments.carrier_id, carriers.name, carriers.mode]
- term: Forwarder
  vi: "Công ty giao nhận như Cargo Query: thay khách đặt chỗ với hãng vận chuyển và lo chứng từ."
  en: "Freight forwarder such as Cargo Query: books space with carriers and handles documents for customers."
  columns: []
- term: Shipper / Consignee
  vi: "Người gửi hàng / người nhận hàng ghi trên vận đơn."
  en: "The sender / the receiver of the goods named on the bill of lading."
  columns: []
- term: Gross weight
  vi: "Trọng lượng cả bì (hàng cộng bao bì), đơn vị kg."
  en: "Weight of the goods plus packaging, in kg."
  columns: [shipments.gross_weight_kg, containers.gross_weight_kg]
- term: CBM
  vi: "Mét khối, đơn vị thể tích hàng; quan trọng với hàng lẻ LCL."
  en: "Cubic meter, the unit of cargo volume; key for LCL."
  columns: [shipments.volume_cbm]
- term: Transit time
  vi: "Số ngày vận chuyển từ cảng đi tới cảng đến."
  en: "Number of days from the origin port to the destination port."
  columns: [ports.base_transit_days]
- term: EXPORT / IMPORT
  vi: "Chiều của lô hàng so với Việt Nam: xuất khẩu hoặc nhập khẩu."
  en: "Direction of the shipment relative to Vietnam: outbound or inbound."
  columns: [shipments.direction]
- term: SEA / AIR
  vi: "Phương thức vận chuyển: đường biển hoặc hàng không."
  en: "Transport mode: ocean freight or air freight."
  columns: [shipments.mode, carriers.mode]
- term: B/L
  vi: "Vận đơn (Bill of Lading): chứng từ vận chuyển, vừa là biên nhận vừa là chứng từ sở hữu hàng."
  en: "Bill of Lading: the transport document, both a receipt and a document of title."
  columns: []
- term: HBL
  vi: "Vận đơn nhà (House B/L) do forwarder phát cho khách."
  en: "House Bill of Lading, issued by the forwarder to its customer."
  columns: []
- term: MBL
  vi: "Vận đơn chủ (Master B/L) do hãng tàu phát cho forwarder."
  en: "Master Bill of Lading, issued by the carrier to the forwarder."
  columns: []
- term: CFS
  vi: "Kho gom và chia hàng lẻ (Container Freight Station)."
  en: "Container Freight Station: the warehouse where LCL cargo is consolidated or split."
  columns: []
- term: Demurrage
  vi: "Phí lưu container trong cảng quá số ngày miễn phí."
  en: "Charge for keeping a container inside the port beyond the free time."
  columns: []
- term: Detention
  vi: "Phí giữ container bên ngoài cảng quá số ngày miễn phí."
  en: "Charge for keeping a container outside the port beyond the free time."
  columns: []
- term: Free time
  vi: "Số ngày được dùng container miễn phí trước khi bắt đầu tính D&D."
  en: "Days a container may be used free of charge before D&D charges start."
  columns: []
- term: Green / Yellow / Red lane
  vi: "Luồng hải quan: xanh (miễn kiểm), vàng (kiểm hồ sơ), đỏ (kiểm thực tế hàng)."
  en: "Customs lanes: green (no check), yellow (document check), red (physical inspection)."
  columns: []
- term: HS code
  vi: "Mã phân loại hàng hóa theo Hệ thống hài hòa, quyết định thuế suất."
  en: "Harmonized System code that classifies goods and sets the duty rate."
  columns: []
```

- [ ] **Step 4: Viết `src/glossary.ts`**

```ts
import { parse as parseYaml } from 'yaml';
import raw from '../content/glossary.yml?raw';

export interface Term { term: string; vi: string; en: string; columns: string[] }

export function parseGlossary(source: string): Term[] {
  const data = parseYaml(source) as unknown;
  if (!Array.isArray(data)) throw new Error('glossary.yml: cần một danh sách');
  return data.map((entry, i) => {
    const x = (entry ?? {}) as Record<string, unknown>;
    const str = (key: string): string => {
      const v = x[key];
      if (typeof v !== 'string' || !v.trim()) throw new Error(`glossary.yml #${i + 1}: thiếu "${key}"`);
      return v.trim();
    };
    const columns = x.columns ?? [];
    if (!Array.isArray(columns) || columns.some((c) => typeof c !== 'string')) {
      throw new Error(`glossary.yml #${i + 1}: "columns" phải là danh sách chuỗi`);
    }
    return { term: str('term'), vi: str('vi'), en: str('en'), columns: columns as string[] };
  });
}

export const GLOSSARY: Term[] = parseGlossary(raw);

/** Lowercase, Vietnamese diacritics removed, so "luong do" finds "Luồng đỏ". */
export function normalize(s: string): string {
  return s.replace(/[đĐ]/g, 'd').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

export function matches(query: string, ...texts: string[]): boolean {
  const q = normalize(query.trim());
  return q === '' || texts.some((x) => normalize(x).includes(q));
}
```

- [ ] **Step 5: Chạy test, xác nhận PASS**

Run: `npx vitest run tests/glossary.test.ts && npx tsc --noEmit`
Expected: tất cả PASS (37 mục); `tsc` không lỗi.

- [ ] **Step 6: Commit**

```bash
git add content/glossary.yml src/glossary.ts tests/glossary.test.ts
git commit -m "feat: freight glossary content with column and language checks"
```

---

### Task 6: Nối chế độ và save v2 vào khung UI của Plan 1 (`src/session.ts`)

**Files:**
- Create: `src/session.ts`
- Modify: `src/ui/work.ts`, `src/ui/brief.ts`, `src/main.ts`

**Interfaces:**
- Consumes: `app`, `done`, `draftKey`, `selected`, `persist` (Plan 1 `state.ts`); `SANDBOX_DRAFT_MAX` (Task 1); `PracticeItem`, `seedReview`, `localDay` (Task 3); `resumeStep` (Task 4)
- Produces:
  - `interface PracticeRun { id: number; items: PracticeItem[]; tickets: Ticket[]; index: number; wrong: number; hints: number; passed: number; result?: 'ok' | 'weak'; draft: string }`
  - `type Mode = { kind: 'story' } | { kind: 'practice'; run: PracticeRun } | { kind: 'sandbox' }`
  - `session: { mode: Mode }`
  - `activeTicket(): Ticket | undefined` — story: `selected()`; practice: ticket đã áp biến thể; sandbox: `undefined`
  - `activeStep(): number`
  - `workKey(): string` — story: `draftKey()`; practice: `practice#<runId>#<index>`; sandbox: `'sandbox'`. Editor chỉ tạo lại khi giá trị này đổi.
  - `readDraft(): string | undefined`, `writeDraft(v: string): void` — story → `save.drafts`; practice → bộ nhớ (không lưu); sandbox → `save.sandboxDraft` (cắt 20.000 ký tự)
  - `isClosed(ticketId: string): boolean` — chỉ đúng ở story khi ticket đã xong (practice luôn mở Nộp)
  - `hintsShown(ticketId: string): number`, `useHint(ticketId: string): void` — practice đếm trong `run.hints`, không ghi `save.hintsUsed`
  - Hợp đồng mới của `WorkArea` (sửa Plan 1): `setTicket(t: Ticket | undefined, stepIndex: number)` — `undefined` = Sandbox: ẩn Nộp, không có shape card, Chạy/EXPLAIN vẫn đi qua `runSandboxed`; deps thêm `onWrong?(): void` (gọi mỗi lần Nộp sai)
  - Trong `main.ts`: đóng ticket ghi `review` (kỹ năng mới học hẹn ngày mai) và xóa `bossStep[id]`; qua bước boss ghi `bossStep[id]`; chọn ticket khôi phục bước bằng `resumeStep`

Task này không thêm chuỗi UI. Học chính phải chạy y hệt trước, cộng thêm việc nhớ bước boss.

- [ ] **Step 0: Grep các điểm neo giao diện (Task 6–9)**

Run:
```bash
grep -c "export function t(\|export function getLang\|export const getLang\|export type Key\|export type Msg" src/i18n/index.ts
grep -c "export const vi = {" src/i18n/vi.ts
grep -c "export const en: Record<Key, Msg> = {" src/i18n/en.ts
grep -c "export const app\|export function persist\|export const selected\|export const done\|export const draftKey" src/state.ts
grep -c "export function mountWork\|setTicket(\|if (!r.ok) {\|app.save.drafts\[draftKey()\]" src/ui/work.ts
grep -c "export function renderBrief\|app.save.hintsUsed\[" src/ui/brief.ts
grep -c "export function renderTopbar" src/ui/topbar.ts
grep -c "renderBrief(\|renderInbox(\|function selectTicket\|function complete\|app.save.completed.push(t.id)\|app.stepIndex++\|mountWork(" src/main.ts
grep -c 'id="inbox-btn"\|id="inbox-list"\|<script type="module"' index.html
```
Expected (lần lượt): `≥ 4`, `1`, `1`, `5`, `≥ 4`, `≥ 2`, `1`, `≥ 7`, `3`.

Nếu một dòng ra `0`: **dừng ở đây và báo** tên thiếu cho người điều phối (Task 10 của Plan 1 đã đặt tên khác). Task 1–5 đã commit vẫn giữ nguyên.

- [ ] **Step 1: Viết `src/session.ts`**

```ts
import type { PracticeItem } from './practice';
import { SANDBOX_DRAFT_MAX } from './save';
import { app, done, draftKey, selected } from './state';
import type { Ticket } from './tickets';

export interface PracticeRun {
  /** Unique per run, so a new run never reuses the previous run's editor. */
  id: number;
  items: PracticeItem[];
  /** Ticket with the item's variant applied; same index as `items`. */
  tickets: Ticket[];
  index: number;
  /** Wrong submits on the current item. */
  wrong: number;
  /** Hints opened on the current item. Never written to save.hintsUsed (chapter summary reads that). */
  hints: number;
  passed: number;
  result?: 'ok' | 'weak';
  /** Editor text of the current item. Practice drafts are never saved. */
  draft: string;
}

export type Mode = { kind: 'story' } | { kind: 'practice'; run: PracticeRun } | { kind: 'sandbox' };

export const session: { mode: Mode } = { mode: { kind: 'story' } };

export function activeTicket(): Ticket | undefined {
  const m = session.mode;
  if (m.kind === 'sandbox') return undefined;
  if (m.kind === 'practice') return m.run.index < m.run.tickets.length ? m.run.tickets[m.run.index] : undefined;
  return selected();
}

export const activeStep = (): number => (session.mode.kind === 'story' ? app.stepIndex : 0);

export function workKey(): string {
  const m = session.mode;
  if (m.kind === 'sandbox') return 'sandbox';
  if (m.kind === 'practice') return `practice#${m.run.id}#${m.run.index}`;
  return draftKey();
}

/** `undefined` lets the caller fall back (e.g. to the ticket's `starter`). */
export function readDraft(): string | undefined {
  const m = session.mode;
  if (m.kind === 'sandbox') return app.save.sandboxDraft;
  if (m.kind === 'practice') return m.run.draft === '' ? undefined : m.run.draft;
  return app.save.drafts[draftKey()];
}

export function writeDraft(v: string): void {
  const m = session.mode;
  if (m.kind === 'sandbox') app.save.sandboxDraft = v.slice(0, SANDBOX_DRAFT_MAX);
  else if (m.kind === 'practice') m.run.draft = v;
  else app.save.drafts[draftKey()] = v;
}

export const isClosed = (ticketId: string): boolean => session.mode.kind === 'story' && done().has(ticketId);

export function hintsShown(ticketId: string): number {
  return session.mode.kind === 'practice' ? session.mode.run.hints : app.save.hintsUsed[ticketId] ?? 0;
}

export function useHint(ticketId: string): void {
  if (session.mode.kind === 'practice') session.mode.run.hints++;
  else app.save.hintsUsed[ticketId] = hintsShown(ticketId) + 1;
}
```

- [ ] **Step 2: Sửa `src/ui/work.ts`**

2a. Thêm import:
```ts
import { isClosed, readDraft, workKey, writeDraft } from '../session';
```
2b. Đổi theo thứ tự (thứ tự quan trọng vì biểu thức đọc nằm trong câu gán):
- Câu gán `app.save.drafts[draftKey()] = <biểu thức>;` → `writeDraft(<biểu thức>);`
- Mọi biểu thức đọc còn lại `app.save.drafts[draftKey()]` → `readDraft()` (giữ nguyên fallback phía sau, ví dụ `?? t.starter ?? ''`).
- Mọi `draftKey()` còn lại (so sánh để quyết định có tạo lại editor) → `workKey()`.
- Mọi `done().has(<x>.id)` → `isClosed(<x>.id)`.
2c. Trong kiểu deps của `mountWork`, thêm thuộc tính:
```ts
  /** Called on every wrong submit (Practice counts them for the Leitner result). */
  onWrong?(): void;
```
và ngay sau dòng `if (!r.ok) {` trong `submit()` thêm:
```ts
        deps.onWrong?.();
```
2d. Cho phép `setTicket(undefined, 0)` (Sandbox). Trong `interface WorkArea`, thay dòng
```ts
  setTicket(t: Ticket, stepIndex: number, force?: boolean): void;
```
bằng
```ts
  /** `undefined` = Sandbox: no Submit, no history; Run, EXPLAIN, error underline and the tabs work as usual. */
  setTicket(t: Ticket | undefined, stepIndex: number, force?: boolean): void;
```
Trong phần cài đặt `setTicket(tk, i, force = false) {`, thay dòng
```ts
      const sameTicket = ticket?.id === tk.id && !force;
```
bằng
```ts
      const sameTicket = ticket?.id === tk?.id && !force;
```
và trong `doc:` của `createEditor`, đổi `tk.starter` thành `tk?.starter` (sau bước 2b dòng đó là `doc: readDraft() ?? tk?.starter ?? '',`). Các chỗ khác đã chịu được `ticket === undefined`: `setButtons()` ẩn Nộp khi `!ticket`, `submit()` `return` ngay khi `!ticket`, `run()` dùng key `''`, `record()`/`drawHistory()` bỏ qua. Shape card nằm ở `brief.ts`, mà Sandbox không vẽ `renderBrief`.

- [ ] **Step 3: Sửa `src/ui/brief.ts`**

3a. Thêm import:
```ts
import { hintsShown, isClosed, useHint } from '../session';
```
3b. Đổi theo thứ tự:
- Câu gán tăng gợi ý `app.save.hintsUsed[<x>] = <…> + 1;` → `useHint(<x>);`
- Mọi biểu thức đọc `app.save.hintsUsed[<x>] ?? 0` → `hintsShown(<x>)`.
- Mọi `done().has(<x>.id)` → `isClosed(<x>.id)`.

- [ ] **Step 4: Sửa `src/main.ts`**

4a. Thêm import:
```ts
import { localDay, seedReview } from './practice';
import { resumeStep } from './overview';
import { session } from './session';
```
4b. Dòng đầu thân hàm `selectTicket(id)`:
```ts
  session.mode = { kind: 'story' };
```
4c. Mọi câu `app.stepIndex = 0;` trong `main.ts` → `app.stepIndex = resumeStep(app.save, selected());` (câu này phải đứng **sau** dòng gán `app.selectedId` tương ứng; nếu đang đứng trước thì đổi chỗ hai dòng).
4d. Ngay sau dòng `app.stepIndex++;` trong `nextStep()` (qua bước boss):
```ts
    app.save.bossStep[app.selectedId] = app.stepIndex;
    persist();
```
4e. Trong `complete(t)`, ngay sau dòng `app.save.completed.push(t.id);`:
```ts
  app.save.review = seedReview(app.save.review, t.grants, localDay(new Date()));
  delete app.save.bossStep[t.id];
```
4f. Lúc mở trang, ngay sau dòng `app.selectedId = firstOpen();`, thêm (để tải lại trang giữa boss vẫn ở đúng bước):
```ts
app.stepIndex = resumeStep(app.save, selected());
```

- [ ] **Step 5: Kiểm kiểu và test**

Run: `npx tsc --noEmit && npm test`
Expected: `tsc` không lỗi; tất cả test PASS.

- [ ] **Step 6: Kiểm tay (Học chính không đổi + nhớ bước boss)**

Run: `npm run dev`, mở URL Vite in ra.
1. Chạy lại checklist Plan 1 Task 10 Step 10 mục 1–5, 7, 8: kết quả y hệt trước (ticket thường, gợi ý, draft giữ sau tải lại, nút Nộp ẩn ở ticket đã xong).
2. Chơi tới `ch1-05`, đúng bước 1 → đang ở bước 2 → tải lại trang → vẫn ở bước 2, draft bước 2 còn.
3. Xong `ch1-05` → DevTools > Application > Local Storage > `cargo-query-save`: `bossStep` không còn `ch1-05`; `review` có `select`, `where`, `order_by`, `limit` với `box: 1` và `due` = ngày mai theo giờ máy.

- [ ] **Step 7: Commit**

```bash
git add src/session.ts src/ui/work.ts src/ui/brief.ts src/main.ts
git commit -m "feat: mode-aware session seam, boss step resume and review seeding"
```

---

### Task 7: Luyện tập và Sandbox trên giao diện (`src/ui/modes.ts`)

**Files:**
- Create: `src/ui/modes.ts`
- Modify: `src/i18n/vi.ts`, `src/i18n/en.ts`, `index.html`, `src/main.ts`, `src/style.css`

**Interfaces:**
- Consumes: `session`, `activeTicket`, `activeStep`, `Mode` (Task 6); `loadTicketTemplates` (Task 2); `applyVariant` (Task 2); `todayQueue`, `pickForSkill`, `retryItem`, `applyResult`, `isSuccess`, `dueSkills`, `localDay`, `PracticeItem` (Task 3); `learnedSkills` (Task 4); `renderBrief` (Plan 1 `brief.ts`); `WorkArea` (Plan 1 `work.ts`, đã sửa ở Task 6); `textOf`, `t`, `getLang`, `h`
- Produces:
  - `initModes(c: { work: WorkArea; rerender(): void }): void` — gọi một lần trong `main.ts` ngay sau khi tạo `work`
  - `today(): string`
  - `startPractice(items: PracticeItem[]): void`, `startToday(): void` (lối vào 1: Ôn hôm nay), `startSkill(skill: string): void` (lối vào 2: Luyện kỹ năng, dùng ở Task 8), `startRetry(ticketId: string): void` (lối vào 3: Làm lại ticket), `startSandbox(): void`, `backToStory(): void`
  - `onPracticeSolved(): void`, `onPracticeWrong(): void` — gắn vào deps của `mountWork`
  - `renderLeft(host: HTMLElement): void` — khung trái theo chế độ (story: `renderBrief`; practice: dải Luyện tập + đề; sandbox: giới thiệu Sandbox)
  - `renderModes(host: HTMLElement, close: () => void): void` — mục Luyện tập / Sandbox trong hộp thư
  - Khóa i18n: `prac.section`, `prac.today`, `prac.retry`, `prac.none`, `prac.banner`, `prac.exit`, `prac.ok`, `prac.weak`, `prac.next`, `prac.done`, `sbx.open`, `sbx.title`, `sbx.intro`

Luật sản phẩm (D2, PD §3.2): 3 lối vào, 0 XP, chấm bằng grader sẵn có với Solution đã áp biến thể, draft không lưu, không ghi `hintsUsed`. Đạt (0 lần sai, ≤ 1 gợi ý) → mọi kỹ năng của bài lên 1 hộp; ngược lại → hộp 1, ôn ngày mai. Boss không vào Luyện tập (nhiều bước + kết luận theo câu chuyện). Sandbox (E2): work area không ticket, không Nộp, vẫn qua `runSandboxed`, draft ở `save.sandboxDraft`.

- [ ] **Step 1: Thêm khóa i18n**

Trong `src/i18n/vi.ts`, ngay sau dòng `export const vi = {`:
```ts
  'prac.section': 'Luyện tập · 0 XP',
  'prac.today': 'Ôn hôm nay ({n})',
  'prac.retry': 'Làm lại ticket đã xong',
  'prac.none': 'Chưa có bài để luyện. Xong vài ticket trước đã.',
  'prac.banner': 'Luyện tập · bài {i}/{n} · 0 XP',
  'prac.exit': 'Về Học chính',
  'prac.ok': 'Đúng! Kỹ năng lên một hộp ôn, lần ôn sau giãn ra.',
  'prac.weak': 'Đúng, nhưng có lần nộp sai hoặc đã mở từ 2 gợi ý, nên kỹ năng về hộp 1 (ôn lại ngày mai).',
  'prac.next': 'Bài tiếp →',
  'prac.done': 'Xong lượt luyện: {ok}/{n} bài đạt.',
  'sbx.open': 'Sandbox: SQL tự do',
  'sbx.title': 'Sandbox — SQL tự do',
  'sbx.intro': 'Viết SQL bất kỳ trên database của game: không chấm, không XP. Mọi câu lệnh chạy trong BEGIN … ROLLBACK nên dữ liệu không đổi. Tab Cột chỉ liệt kê bảng đã mở; nội dung editor được lưu cùng tiến độ.',
```
Trong `src/i18n/en.ts`, ngay sau dòng `export const en: Record<Key, Msg> = {`:
```ts
  'prac.section': 'Practice · 0 XP',
  'prac.today': 'Review today ({n})',
  'prac.retry': 'Redo a finished ticket',
  'prac.none': 'Nothing to practice yet. Finish a few tickets first.',
  'prac.banner': 'Practice · {i} of {n} · 0 XP',
  'prac.exit': 'Back to the story',
  'prac.ok': 'Correct! The skill moves up one review box, so the next review comes later.',
  'prac.weak': 'Correct, but after a wrong submit or 2+ hints, so the skill goes back to box 1 (review tomorrow).',
  'prac.next': 'Next →',
  'prac.done': 'Practice done: {ok}/{n} passed.',
  'sbx.open': 'Sandbox: free SQL',
  'sbx.title': 'Sandbox — free SQL',
  'sbx.intro': 'Write any SQL against the game database: no grading, no XP. Every statement runs inside BEGIN … ROLLBACK, so the data never changes. The Columns tab lists unlocked tables only; the editor content is saved with your progress.',
```

- [ ] **Step 2: Viết `src/ui/modes.ts`**

```ts
import { loadTicketTemplates } from '../content';
import { getLang, t } from '../i18n';
import { learnedSkills } from '../overview';
import {
  applyResult, dueSkills, isSuccess, localDay, pickForSkill, retryItem, todayQueue, type PracticeItem,
} from '../practice';
import { activeStep, activeTicket, session, type Mode } from '../session';
import { app, done, persist, selected } from '../state';
import { textOf } from '../tickets';
import { applyVariant } from '../variants';
import { renderBrief } from './brief';
import { h } from './dom';
import type { WorkArea } from './work';

const templates = new Map(loadTicketTemplates().map((tk) => [tk.id, tk]));
let ctx: { work: WorkArea; rerender(): void } | undefined;
let runSeq = 0;

export const today = (): string => localDay(new Date());

/** Called once from main.ts, right after mountWork(). */
export function initModes(c: { work: WorkArea; rerender(): void }): void {
  ctx = c;
}

function enter(mode: Mode): void {
  session.mode = mode;
  ctx?.rerender();
  ctx?.work.setTicket(activeTicket(), activeStep());
}

export function startPractice(items: PracticeItem[]): void {
  const usable = items.filter((i) => templates.has(i.ticketId));
  if (usable.length === 0) return;
  enter({
    kind: 'practice',
    run: {
      id: ++runSeq,
      items: usable,
      tickets: usable.map((i) => applyVariant(templates.get(i.ticketId)!, i.variant)),
      index: 0,
      wrong: 0,
      hints: 0,
      passed: 0,
      draft: '',
    },
  });
}

export const startSandbox = (): void => enter({ kind: 'sandbox' });
export const backToStory = (): void => enter({ kind: 'story' });

export function startToday(): void {
  const d = done();
  startPractice(todayQueue(app.save.review, learnedSkills(app.tickets, d), [...templates.values()], d, today(), Math.random));
}

export function startSkill(skill: string): void {
  const item = pickForSkill(skill, [...templates.values()], done(), Math.random);
  if (item) startPractice([item]);
}

export function startRetry(ticketId: string): void {
  const tpl = templates.get(ticketId);
  if (tpl && tpl.beat !== 'boss') startPractice([retryItem(tpl, Math.random)]);
}

export function onPracticeWrong(): void {
  if (session.mode.kind === 'practice') session.mode.run.wrong++;
}

/** Correct submit in Practice: 0 XP, update the Leitner boxes of the item's skills. */
export function onPracticeSolved(): void {
  if (session.mode.kind !== 'practice') return;
  const run = session.mode.run;
  const item = run.items[run.index];
  if (!item || run.result) return;
  const ok = isSuccess(run.wrong, run.hints);
  const next = applyResult({ review: app.save.review, practice: app.save.practice }, item.skills, ok, today());
  app.save.review = next.review;
  app.save.practice = next.practice;
  persist(true);
  run.result = ok ? 'ok' : 'weak';
  if (ok) run.passed++;
  ctx?.rerender();
}

function nextItem(): void {
  if (session.mode.kind !== 'practice') return;
  const run = session.mode.run;
  run.index++;
  run.wrong = 0;
  run.hints = 0;
  run.draft = '';
  run.result = undefined;
  ctx?.rerender();
  ctx?.work.setTicket(activeTicket(), 0);
}

function sandboxPane(host: HTMLElement): void {
  host.replaceChildren(
    h('h2', {}, t('sbx.title')),
    h('p', {}, t('sbx.intro')),
    h('button', { type: 'button', onclick: () => backToStory() }, t('prac.exit')),
  );
}

function practicePane(host: HTMLElement, run: Extract<Mode, { kind: 'practice' }>['run']): void {
  const finished = run.index >= run.items.length;
  const banner = h('div', { class: 'practice-banner', role: 'status' },
    h('b', {}, finished ? t('prac.done', { ok: run.passed, n: run.items.length }) : t('prac.banner', { i: run.index + 1, n: run.items.length })),
    run.result ? h('p', {}, t(run.result === 'ok' ? 'prac.ok' : 'prac.weak')) : null,
    h('div', { class: 'actions' },
      run.result && !finished ? h('button', { type: 'button', class: 'primary', onclick: () => nextItem() }, t('prac.next')) : null,
      h('button', { type: 'button', onclick: () => backToStory() }, t('prac.exit'))),
  );
  const body = h('div');
  if (!finished) renderBrief(body, run.tickets[run.index], 0);
  host.replaceChildren(banner, body);
}

/** Left pane for the current mode. main.ts calls this instead of renderBrief(). */
export function renderLeft(host: HTMLElement): void {
  const m = session.mode;
  if (m.kind === 'sandbox') sandboxPane(host);
  else if (m.kind === 'practice') practicePane(host, m.run);
  else renderBrief(host, selected(), app.stepIndex);
}

/** Practice and Sandbox entries at the top of the inbox dialog. */
export function renderModes(host: HTMLElement, close: () => void): void {
  const d = done();
  const due = dueSkills(app.save.review, learnedSkills(app.tickets, d), today()).length;
  const retryable = app.tickets.filter((tk) => d.has(tk.id) && tk.beat !== 'boss');
  const go = (fn: () => void) => () => {
    close();
    fn();
  };
  const todayBtn = h('button', { type: 'button', onclick: go(startToday) }, t('prac.today', { n: due }));
  todayBtn.disabled = due === 0;
  host.replaceChildren(
    h('h3', {}, t('prac.section')),
    h('div', { class: 'actions' }, todayBtn, h('button', { type: 'button', onclick: go(startSandbox) }, t('sbx.open'))),
    retryable.length
      ? h('details', {},
          h('summary', {}, t('prac.retry')),
          h('ul', { class: 'retry-list' }, ...retryable.map((tk) =>
            h('li', {}, h('button', { type: 'button', onclick: go(() => startRetry(tk.id)) }, `${tk.id} · ${textOf(tk, getLang()).title}`)))))
      : h('p', { class: 'muted' }, t('prac.none')),
  );
}
```

- [ ] **Step 3: Sửa `index.html`**

Ngay trước dòng chứa `id="inbox-list"`, thêm:
```html
      <div id="modes" class="modes"></div>
```

- [ ] **Step 4: Sửa `src/main.ts`**

4a. Thêm import:
```ts
import { initModes, onPracticeSolved, onPracticeWrong, renderLeft, renderModes } from './ui/modes';
```
4b. Trong object deps truyền cho `mountWork(…)`:
- giá trị của `onSolved` đổi thành `(t) => (session.mode.kind === 'practice' ? onPracticeSolved() : complete(t))`
- thêm thuộc tính `onWrong: onPracticeWrong,`
4c. Ngay sau câu lệnh tạo work area (`const work = mountWork(…);`, hết dấu `;`), thêm:
```ts
initModes({ work, rerender });
```
(`rerender` là `function rerender()` của Plan 1 nên dùng được trước dòng khai báo.)
4d. Trong `rerender()`: thay lời gọi `renderBrief(<host>, <ticket>, <step>)` bằng `renderLeft(<host>)` (giữ nguyên biểu thức `<host>`), và ngay sau dòng gọi `renderInbox(`… thêm:
```ts
  renderModes(document.getElementById('modes')!, () => (document.getElementById('inbox-dialog') as HTMLDialogElement).close());
```

- [ ] **Step 5: Thêm CSS vào cuối `src/style.css`**

```css
.modes { border-bottom: 1px solid var(--border); padding-bottom: 8px; margin-bottom: 8px; }
.modes h3 { margin-top: 0; }
.retry-list { list-style: none; padding: 0; margin: 4px 0 0; }
.retry-list button { width: 100%; text-align: left; margin-top: 4px; }
.practice-banner { border: 1px solid var(--accent); border-radius: 8px; padding: 8px 12px; margin-bottom: 12px; background: var(--accent-soft); }
.practice-banner p { margin: 4px 0; }
```

- [ ] **Step 6: Kiểm kiểu và test**

Run: `npx tsc --noEmit && npm test`
Expected: `tsc` không lỗi (kể cả `en.ts` đủ khóa); tất cả test PASS.

- [ ] **Step 7: Kiểm tay**

Run: `npm run dev`.
1. Xong `ch1-01`…`ch1-03`. Mở Hộp thư: phần đầu có "Luyện tập · 0 XP", nút "Ôn hôm nay (0)" bị khóa (kỹ năng mới học hẹn ngày mai), nút "Sandbox: SQL tự do", mục gập "Làm lại ticket đã xong" liệt kê 3 ticket.
2. Làm lại `ch1-03`: khung trái có dải "Luyện tập · bài 1/1 · 0 XP", đề hiện tháng **khác** `10/2026`; editor trống; nút Nộp hiện. Nộp câu của tháng 10 → báo sai (lệch dòng). Sửa đúng tháng → dải báo "Đúng, nhưng có lần nộp sai…"; XP trên thanh trên không đổi; `cargo-query-save` có `review.order_by.box = 1`, `practice.failed = 1`; `hintsUsed` không đổi.
3. "Bài tiếp →" → "Xong lượt luyện: 0/1 bài đạt." → "Về Học chính" → quay lại đúng ticket và draft Học chính trước đó.
4. Đổi ngày máy (hoặc sửa `due` trong Local Storage thành hôm qua) → tải lại → "Ôn hôm nay (n)" bật; bấm → chạy lần lượt tối đa 5 bài, đúng không gợi ý → `box` tăng, `due` giãn theo `[1, 2, 4, 8, 16]`.
5. Sandbox: không có nút Nộp; `SELECT count(*) FROM shipments` → tab Kết quả có số; `UPDATE ports SET name = 'x'` rồi `SELECT count(*) FROM ports WHERE name = 'x'` → 0; tab Cột chỉ có bảng đã mở; tải lại trang, vào lại Sandbox → SQL còn nguyên. "Về Học chính" → editor trở lại draft của ticket.
6. Trong Luyện tập/Sandbox bấm VI|EN: chữ đổi, editor không mất nội dung.

- [ ] **Step 8: Commit**

```bash
git add src/ui/modes.ts src/i18n/vi.ts src/i18n/en.ts index.html src/main.ts src/style.css
git commit -m "feat: practice (review today, redo ticket) and sandbox modes"
```

---

### Task 8: Tiến độ, mục tiêu chương, tổng kết chương, skill map, chip Dạy/Cần

**Files:**
- Create: `src/ui/progressView.ts`, `src/ui/chapterView.ts`, `src/ui/skillMap.ts`
- Modify: `src/i18n/vi.ts`, `src/i18n/en.ts`, `index.html`, `src/ui/topbar.ts`, `src/ui/modes.ts`, `src/main.ts`, `src/style.css`

**Interfaces:**
- Consumes: `SKILLS`, `CHAPTERS`, `chapterTitle` (Plan 1 `progress.ts`); `progressLine, `learnedSkills`, `skillLevel`, `outcomeDone`, `chapterSummary`, `grantedBy`, `SkillLevel` (Task 4); `cardOf` (Task 3); `startToday`, `startSkill`, `startRetry`, `today`, `renderLeft` (Task 7); `app`, `done`, `selected` (Plan 1 `state.ts`)
- Produces:
  - `renderProgress(host: HTMLElement): void` — `Ch 2/7 · 7/35 ticket · 1.250 XP · [Ôn: 3]`; nút "Ôn: N" là lối vào Ôn hôm nay, khóa khi N = 0, ẩn khi chưa học kỹ năng nào
  - `skillLabel(id: string): string` (tiêu đề chương dùng `chapterTitle(n, getLang())` của Plan 1)
  - `goalCard(chapter: number): HTMLElement | null` — thẻ "Mục tiêu chương" (outcome có ✓ khi đủ kỹ năng), hiện ở ticket `teach` trong Học chính
  - `skillChips(t: Ticket): HTMLElement | null` — chip "Dạy: … · Cần: …" từ `grants`/`requires`, nhãn lấy từ `skills.yml`
  - `openChapterSummary(dialog: HTMLDialogElement, chapter: number): void` — mở sau khi đóng boss; Recap của Plan 1 (C2) vẫn nằm ở khung trái phía sau dialog
  - `openSkillMap(dialog: HTMLDialogElement): void` — lưới kỹ năng theo chương, 4 trạng thái + nhãn "Đến hạn ôn"; bấm kỹ năng đã học → Luyện kỹ năng đó (lối vào 2)
  - Khóa i18n: `prog.line`, `prog.due`, `prog.dueTitle`, `skill.open`, `skill.title`, `skill.hint`, `skill.chapter`, `skill.learned`, `skill.steady`, `skill.mastered`, `skill.due`, `skill.unlockAt`, `chip.teaches`, `chip.needs`, `goal.title`, `goal.intro`, `sum.title`, `sum.skills`, `sum.tables`, `sum.stats`, `sum.last`, `sum.quick`, `dlg.close`

Mọi con số và trạng thái tính lại từ save + nội dung mỗi lần render (A4); không lưu thêm gì.

- [ ] **Step 1: Thêm khóa i18n**

Trong `src/i18n/vi.ts`, ngay sau dòng `export const vi = {`:
```ts
  'prog.line': 'Ch {ch}/{chs} · {done}/{total} ticket · {xp} XP',
  'prog.due': 'Ôn: {n}',
  'prog.dueTitle': 'Ôn các kỹ năng đến hạn (0 XP)',
  'skill.open': 'Kỹ năng',
  'skill.title': 'Bản đồ kỹ năng',
  'skill.hint': 'Bấm một kỹ năng đã học để luyện riêng nó (0 XP).',
  'skill.chapter': 'Chương {n}: {title}',
  'skill.learned': 'Đã học',
  'skill.steady': 'Đang vững',
  'skill.mastered': 'Thuộc',
  'skill.due': 'Đến hạn ôn',
  'skill.unlockAt': 'Mở sau {id}',
  'chip.teaches': 'Dạy: {list}',
  'chip.needs': 'Cần: {list}',
  'goal.title': 'Mục tiêu chương {n}: {title}',
  'goal.intro': 'Sau chương này bạn có thể:',
  'sum.title': 'Tổng kết chương {n}: {title}',
  'sum.skills': 'Kỹ năng đã học trong chương',
  'sum.tables': 'Bảng mới ở chương sau: {list}',
  'sum.stats': '{xp} XP · {hints} gợi ý đã dùng',
  'sum.last': 'Bạn đã xong mọi chương hiện có. Vào Luyện tập để ôn lại.',
  'sum.quick': 'Ôn nhanh 1 câu',
  'dlg.close': 'Đóng',
```
Trong `src/i18n/en.ts`, ngay sau dòng `export const en: Record<Key, Msg> = {`:
```ts
  'prog.line': 'Ch {ch}/{chs} · {done}/{total} tickets · {xp} XP',
  'prog.due': 'Review: {n}',
  'prog.dueTitle': 'Review the skills that are due (0 XP)',
  'skill.open': 'Skills',
  'skill.title': 'Skill map',
  'skill.hint': 'Click a learned skill to practice just that skill (0 XP).',
  'skill.chapter': 'Chapter {n}: {title}',
  'skill.learned': 'Learned',
  'skill.steady': 'Getting solid',
  'skill.mastered': 'Mastered',
  'skill.due': 'Due for review',
  'skill.unlockAt': 'Unlocks after {id}',
  'chip.teaches': 'Teaches: {list}',
  'chip.needs': 'Needs: {list}',
  'goal.title': 'Chapter {n} goals: {title}',
  'goal.intro': 'After this chapter you can:',
  'sum.title': 'Chapter {n} wrap-up: {title}',
  'sum.skills': 'Skills learned in this chapter',
  'sum.tables': 'New tables next chapter: {list}',
  'sum.stats': (p) => `${p.xp} XP · ${p.hints} hint${Number(p.hints) === 1 ? '' : 's'} used`,
  'sum.last': "You've finished every chapter available. Use Practice to review.",
  'sum.quick': 'Quick review: 1 ticket',
  'dlg.close': 'Close',
```

- [ ] **Step 2: Viết `src/ui/chapterView.ts`**

```ts
import { getLang, t } from '../i18n';
import { chapterSummary, learnedSkills, outcomeDone } from '../overview';
import { CHAPTERS, chapterTitle, SKILLS } from '../progress';
import { app, done } from '../state';
import type { Ticket } from '../tickets';
import { h } from './dom';
import { startRetry } from './modes';

export function skillLabel(id: string): string {
  return SKILLS.find((s) => s.id === id)?.label[getLang()] ?? id;
}

function outcomeList(chapter: number): HTMLElement | null {
  const c = CHAPTERS.find((x) => x.chapter === chapter);
  if (!c) return null;
  const d = done();
  const learned = learnedSkills(app.tickets, d);
  const lang = getLang();
  return h('ul', { class: 'outcomes' }, ...c.outcomes.map((o) => {
    const ok = outcomeDone(o.skills, chapter, app.tickets, d, learned);
    return h('li', { class: ok ? 'ok' : '' }, ok ? '✓ ' : '○ ', o[lang]);
  }));
}

/** "Chapter goals" card shown on the chapter's teach ticket. */
export function goalCard(chapter: number): HTMLElement | null {
  const list = outcomeList(chapter);
  if (!list) return null;
  return h('section', { class: 'goal' },
    h('h3', {}, t('goal.title', { n: chapter, title: chapterTitle(chapter, getLang()) })),
    h('p', { class: 'muted' }, t('goal.intro')),
    list);
}

export function skillChips(tk: Ticket): HTMLElement | null {
  if (tk.grants.length === 0 && tk.requires.length === 0) return null;
  const list = (ids: string[]) => ids.map(skillLabel).join(', ');
  return h('p', { class: 'chips' },
    tk.grants.length ? h('span', { class: 'chip teach' }, t('chip.teaches', { list: list(tk.grants) })) : null,
    tk.requires.length ? h('span', { class: 'chip need' }, t('chip.needs', { list: list(tk.requires) })) : null);
}

/** Opened after the boss closes; Plan 1's Recap card stays behind it in the left pane. */
export function openChapterSummary(dialog: HTMLDialogElement, chapter: number): void {
  const s = chapterSummary(app.tickets, app.save, chapter);
  const d = done();
  const last = !app.tickets.some((tk) => tk.chapter > chapter);
  const quick = app.tickets.filter((tk) => tk.chapter === chapter && tk.beat !== 'boss' && d.has(tk.id));
  const close = h('button', { type: 'button', class: 'primary', onclick: () => dialog.close() }, t('dlg.close'));
  dialog.replaceChildren(
    h('h2', { id: 'summary-title' }, t('sum.title', { n: chapter, title: chapterTitle(chapter, getLang()) })),
    outcomeList(chapter) ?? '',
    s.skills.length ? h('h3', {}, t('sum.skills')) : '',
    s.skills.length ? h('ul', {}, ...s.skills.map((id) => h('li', {}, skillLabel(id)))) : '',
    s.newTables.length && !last ? h('p', {}, t('sum.tables', { list: s.newTables.join(', ') })) : '',
    h('p', {}, t('sum.stats', { xp: s.xp, hints: s.hints })),
    last ? h('p', {}, t('sum.last')) : '',
    h('div', { class: 'actions' },
      quick.length
        ? h('button', {
            type: 'button',
            onclick: () => {
              dialog.close();
              startRetry(quick[Math.floor(Math.random() * quick.length)].id);
            },
          }, t('sum.quick'))
        : '',
      close),
  );
  dialog.showModal();
  close.focus();
}
```

- [ ] **Step 3: Viết `src/ui/progressView.ts`**

```ts
import { t } from '../i18n';
import { progressLine } from '../overview';
import { CHAPTERS } from '../progress';
import { app } from '../state';
import { h } from './dom';
import { startToday, today } from './modes';

/** Top bar progress: "Ch 2/7 · 7/35 ticket · 1.250 XP · [Review: 3]", recomputed from the save. */
export function renderProgress(host: HTMLElement): void {
  const p = progressLine(app.tickets, CHAPTERS.length, app.save, today());
  const line = t('prog.line', { ch: p.chapter, chs: p.chapters, done: p.done, total: p.total, xp: p.xp });
  if (p.learned === 0) {
    host.replaceChildren(line);
    return;
  }
  const due = h('button', { type: 'button', class: 'due-btn', title: t('prog.dueTitle'), onclick: () => startToday() }, t('prog.due', { n: p.due }));
  due.disabled = p.due === 0;
  host.replaceChildren(line, ' · ', due);
}
```

- [ ] **Step 4: Viết `src/ui/skillMap.ts`**

```ts
import { getLang, t, type Key } from '../i18n';
import { grantedBy, learnedSkills, skillLevel, type SkillLevel } from '../overview';
import { cardOf } from '../practice';
import { chapterTitle, SKILLS } from '../progress';
import { app, done } from '../state';
import { h } from './dom';
import { startSkill, today } from './modes';

const LEVEL_KEY: Record<Exclude<SkillLevel, 'locked'>, Key> = {
  learned: 'skill.learned',
  steady: 'skill.steady',
  mastered: 'skill.mastered',
};

export function openSkillMap(dialog: HTMLDialogElement): void {
  const lang = getLang();
  const day = today();
  const learned = learnedSkills(app.tickets, done());
  const skills = SKILLS;
  const chapters = [...new Set(skills.map((s) => s.chapter))].sort((a, b) => a - b);
  dialog.replaceChildren(
    h('h2', { id: 'skills-title' }, t('skill.title')),
    h('p', { class: 'muted' }, t('skill.hint')),
    ...chapters.map((ch) =>
      h('section', { class: 'skill-chapter' },
        h('h3', {}, t('skill.chapter', { n: ch, title: chapterTitle(ch, lang) })),
        h('div', { class: 'skill-grid' }, ...skills.filter((s) => s.chapter === ch).map((s) => {
          const level = skillLevel(s.id, learned, app.save.review, day);
          const due = level !== 'locked' && cardOf(app.save.review, s.id, day).due <= day;
          const btn = h('button', {
            type: 'button',
            class: `skill ${level}`,
            onclick: () => {
              dialog.close();
              startSkill(s.id);
            },
          },
            h('span', { class: 'skill-label' }, s.label[lang]),
            h('span', { class: 'skill-level' },
              level === 'locked' ? t('skill.unlockAt', { id: grantedBy(app.tickets, s.id)?.id ?? '—' }) : t(LEVEL_KEY[level])),
            due ? h('span', { class: 'badge' }, t('skill.due')) : null);
          btn.disabled = level === 'locked';
          return btn;
        })))),
    h('form', { method: 'dialog' }, h('button', {}, t('dlg.close'))),
  );
  dialog.showModal();
}
```

- [ ] **Step 5: Thêm chip và thẻ mục tiêu vào `renderLeft` (`src/ui/modes.ts`)**

5a. Thêm import:
```ts
import { goalCard, skillChips } from './chapterView';
```
5b. Trong `practicePane`, thay dòng
```ts
  if (!finished) renderBrief(body, run.tickets[run.index], 0);
```
bằng
```ts
  if (!finished) {
    const tk = run.tickets[run.index];
    renderBrief(body, tk, 0);
    const chips = skillChips(tk);
    if (chips) body.prepend(chips);
  }
```
5c. Trong `renderLeft`, thay dòng
```ts
  else renderBrief(host, selected(), app.stepIndex);
```
bằng
```ts
  else {
    const tk = selected();
    renderBrief(host, tk, app.stepIndex);
    const chips = skillChips(tk);
    if (chips) host.prepend(chips);
    const goal = tk.beat === 'teach' ? goalCard(tk.chapter) : null;
    if (goal) host.prepend(goal);
  }
```

- [ ] **Step 6: Sửa `index.html`**

6a. Xóa dòng `<span id="xp"></span>` (XP chuyển vào dòng tiến độ).
6b. Ngay sau dòng chứa `id="inbox-btn"`, thêm:
```html
      <span id="progress" class="progress"></span>
      <button id="skills-btn" type="button" data-i18n="skill.open">Kỹ năng</button>
```
6c. Ngay trước dòng `<script type="module"`, thêm:
```html
    <dialog id="skills-dialog" aria-labelledby="skills-title"></dialog>
    <dialog id="summary-dialog" aria-labelledby="summary-title"></dialog>
```

- [ ] **Step 7: Sửa `src/ui/topbar.ts`**

7a. Thêm import:
```ts
import { renderProgress } from './progressView';
```
7b. Trong `renderTopbar()`: xóa dòng `byId('xp').textContent = t('top.xp', { n: app.save.xp });`, rồi thêm ở cuối thân hàm:
```ts
  renderProgress(document.getElementById('progress')!);
```

- [ ] **Step 8: Sửa `src/main.ts`**

8a. Thêm import:
```ts
import { openChapterSummary } from './ui/chapterView';
import { openSkillMap } from './ui/skillMap';
```
8b. Ở cuối thân `complete(t)` (sau lời gọi `persist(true)` và render của Recap):
```ts
  if (t.beat === 'boss') openChapterSummary(document.getElementById('summary-dialog') as HTMLDialogElement, t.chapter);
```
8c. Cạnh chỗ gắn sự kiện cho `inbox-btn`, thêm:
```ts
document.getElementById('skills-btn')!.addEventListener('click', () =>
  openSkillMap(document.getElementById('skills-dialog') as HTMLDialogElement));
```

- [ ] **Step 9: Thêm CSS vào cuối `src/style.css`**

```css
.progress { display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
.topbar .due-btn { padding: 2px 8px; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 8px; }
.chip { font-size: 12px; padding: 2px 8px; border: 1px solid var(--border); border-radius: 999px; background: var(--code); }
.chip.teach { border-color: var(--accent); }
.goal { border: 1px solid var(--accent); border-radius: 8px; padding: 8px 12px; margin-bottom: 12px; background: var(--accent-soft); }
.goal h3 { margin-top: 0; }
.outcomes { list-style: none; padding: 0; margin: 4px 0 0; }
.outcomes li.ok { color: var(--good); }
.skill-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 6px; }
.skill { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; text-align: left; }
.skill .skill-level { font-size: 12px; color: var(--muted); }
.skill.learned { border-color: var(--warn); }
.skill.steady { border-color: var(--accent); }
.skill.mastered { border-color: var(--good); box-shadow: inset 3px 0 var(--good); }
.skill:disabled { opacity: 1; color: var(--muted); background: var(--code); }
.badge { font-size: 11px; padding: 0 6px; border-radius: 999px; background: var(--warn); color: var(--bg); }
#skills-dialog { width: min(720px, calc(100vw - 32px)); }
```

- [ ] **Step 10: Kiểm kiểu và test**

Run: `npx tsc --noEmit && npm test`
Expected: `tsc` không lỗi; tất cả test PASS.

- [ ] **Step 11: Kiểm tay**

Run: `npm run dev`.
1. Save trống: thanh trên hiện `Ch 1/7 · 0/15 ticket · 0 XP` (7 = số chương trong `CHAPTERS`), chưa có nút Ôn. `ch1-01` có thẻ "Mục tiêu chương 1: …" (3 outcome, đều ○) và chip "Dạy: Chọn cột".
2. Xong `ch1-01` → outcome "Lấy đúng cột…" có ✓; thanh trên `Ch 1/7 · 1/15 ticket · 100 XP · Ôn: 0` (nút khóa).
3. Xong `ch1-05` → dialog "Tổng kết chương 1" mở trên Recap: outcome đều ✓, danh sách kỹ năng chương 1, "Bảng mới ở chương sau: containers", XP chương + số gợi ý khớp tay. "Ôn nhanh 1 câu" → vào Luyện tập một ticket ch1 (không boss). Esc / "Đóng" → về Recap.
4. Bấm "Kỹ năng": lưới theo chương; kỹ năng ch1 "Đã học", ch2+ khóa với "Mở sau ch2-0x"; bấm `where` → vào Luyện tập. Đổi `review.where.box` thành 4 trong Local Storage, tải lại → `where` hiện "Đang vững".
5. Đổi ngôn ngữ EN: thanh trên `Ch 2/7 · 5/15 tickets · …`, chip "Teaches/Needs", dialog dịch đủ; không chuỗi nào dính tiếng Việt.
6. Màn 375px: thanh trên xuống dòng gọn, không cuộn ngang; Tab đi qua được nút Ôn, Kỹ năng và các nút trong dialog.

- [ ] **Step 12: Commit**

```bash
git add src/ui/progressView.ts src/ui/chapterView.ts src/ui/skillMap.ts src/ui/modes.ts src/ui/topbar.ts src/i18n/vi.ts src/i18n/en.ts index.html src/main.ts src/style.css
git commit -m "feat: progress line, chapter goals and wrap-up, skill map, teaches/needs chips"
```

---

### Task 9: Sổ tay (thẻ kỹ năng + thuật ngữ, dialog không modal)

**Files:**
- Create: `src/ui/notebook.ts`
- Modify: `src/i18n/vi.ts`, `src/i18n/en.ts`, `index.html`, `src/main.ts`, `src/style.css`

**Interfaces:**
- Consumes: `SKILLS` (Plan 1 `progress.ts`); `Lang` (Plan 1 `tickets.ts`); `GLOSSARY`, `matches` (Task 5); `learnedSkills`, `grantedBy` (Task 4); `app`, `done` (Plan 1 `state.ts`)
- Produces:
  - `toggleNotebook(dialog: HTMLDialogElement): void` — mở bằng `show()` (không modal, vừa đọc vừa gõ editor), bấm lần nữa thì đóng; có nút Đóng và Esc tự xử lý (dialog không modal không tự đóng bằng Esc ở mọi trình duyệt)
  - Hai mục: **Thẻ kỹ năng** (khóa đến khi ticket dạy nó đã xong: chỉ hiện tên + "Mở sau chX-YY"; mở: tên, cú pháp, Khi nào, Bẫy) và **Thuật ngữ** (không khóa; `term`, nghĩa theo ngôn ngữ đang chọn, nghĩa ngôn ngữ còn lại, cột liên quan); một ô lọc chung, không phân biệt dấu
  - Khóa i18n: `nb.open`, `nb.title`, `nb.filter`, `nb.cards`, `nb.terms`, `nb.when`, `nb.trap`, `nb.columns`, `nb.empty`

- [ ] **Step 1: Thêm khóa i18n**

Trong `src/i18n/vi.ts`, ngay sau dòng `export const vi = {`:
```ts
  'nb.open': 'Sổ tay',
  'nb.title': 'Sổ tay SQL & nghiệp vụ',
  'nb.filter': 'Lọc thẻ và thuật ngữ',
  'nb.cards': 'Thẻ kỹ năng',
  'nb.terms': 'Thuật ngữ',
  'nb.when': 'Khi nào:',
  'nb.trap': 'Bẫy:',
  'nb.columns': 'Cột: {list}',
  'nb.empty': 'Không có mục khớp "{q}".',
```
Trong `src/i18n/en.ts`, ngay sau dòng `export const en: Record<Key, Msg> = {`:
```ts
  'nb.open': 'Notebook',
  'nb.title': 'SQL & freight notebook',
  'nb.filter': 'Filter cards and terms',
  'nb.cards': 'Skill cards',
  'nb.terms': 'Terms',
  'nb.when': 'When:',
  'nb.trap': 'Trap:',
  'nb.columns': 'Columns: {list}',
  'nb.empty': 'Nothing matches "{q}".',
```

- [ ] **Step 2: Viết `src/ui/notebook.ts`**

```ts
import { GLOSSARY, matches } from '../glossary';
import { getLang, t } from '../i18n';
import { grantedBy, learnedSkills } from '../overview';
import { SKILLS } from '../progress';
import { app, done } from '../state';
import type { Lang } from '../tickets';
import { h } from './dom';

export function toggleNotebook(dialog: HTMLDialogElement): void {
  if (dialog.open) {
    dialog.close();
    return;
  }
  const lang = getLang();
  const other: Lang = lang === 'vi' ? 'en' : 'vi';
  const learned = learnedSkills(app.tickets, done());
  const input = h('input', { type: 'search', placeholder: t('nb.filter'), 'aria-label': t('nb.filter') });
  const list = h('div', { class: 'nb-list' });

  const draw = (): void => {
    const q = input.value;
    const cards = SKILLS.filter((s) => matches(q, s.id, s.label.vi, s.label.en));
    const terms = GLOSSARY.filter((g) => matches(q, g.term, g.vi, g.en, ...g.columns));
    list.replaceChildren(
      h('h3', {}, t('nb.cards')),
      ...cards.map((s) =>
        learned.has(s.id)
          ? h('article', { class: 'card' },
              h('h4', {}, s.label[lang]),
              h('pre', { class: 'sql' }, s.syntax),
              h('p', {}, h('b', {}, t('nb.when')), ' ', s.when[lang]),
              h('p', {}, h('b', {}, t('nb.trap')), ' ', s.trap[lang]))
          : h('article', { class: 'card locked' },
              h('h4', {}, s.label[lang]),
              h('p', { class: 'muted' }, t('skill.unlockAt', { id: grantedBy(app.tickets, s.id)?.id ?? '—' })))),
      h('h3', {}, t('nb.terms')),
      ...terms.map((g) =>
        h('article', { class: 'term' },
          h('h4', {}, g.term),
          h('p', {}, g[lang]),
          h('p', { class: 'muted' }, g[other]),
          g.columns.length ? h('p', { class: 'muted' }, t('nb.columns', { list: g.columns.join(', ') })) : null)),
      cards.length + terms.length === 0 ? h('p', { class: 'muted' }, t('nb.empty', { q })) : null,
    );
  };

  input.addEventListener('input', draw);
  dialog.replaceChildren(
    h('div', { class: 'nb-head' },
      h('h2', { id: 'notebook-title' }, t('nb.title')),
      h('button', { type: 'button', onclick: () => dialog.close() }, t('dlg.close'))),
    input,
    list,
  );
  dialog.onkeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      dialog.close();
    }
  };
  draw();
  dialog.show();
  input.focus();
}
```

- [ ] **Step 3: Sửa `index.html`**

3a. Ngay sau dòng chứa `id="skills-btn"`, thêm:
```html
      <button id="notebook-btn" type="button" data-i18n="nb.open" aria-controls="notebook-dialog">Sổ tay</button>
```
3b. Ngay trước dòng `<script type="module"`, thêm:
```html
    <dialog id="notebook-dialog" class="notebook" aria-labelledby="notebook-title"></dialog>
```

- [ ] **Step 4: Sửa `src/main.ts`**

4a. Thêm import:
```ts
import { toggleNotebook } from './ui/notebook';
```
4b. Cạnh chỗ gắn sự kiện cho `skills-btn`, thêm:
```ts
document.getElementById('notebook-btn')!.addEventListener('click', () =>
  toggleNotebook(document.getElementById('notebook-dialog') as HTMLDialogElement));
```

- [ ] **Step 5: Thêm CSS vào cuối `src/style.css`**

```css
dialog.notebook { position: fixed; inset: 64px 16px auto auto; margin: 0; width: min(360px, calc(100vw - 32px)); max-height: calc(100dvh - 96px); overflow: auto; z-index: 10; }
@media (max-width: 600px) { dialog.notebook { inset: auto 16px 16px 16px; width: auto; max-height: 60dvh; } }
.nb-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.notebook input[type='search'] { width: 100%; font: inherit; padding: 6px 8px; border: 1px solid var(--border); border-radius: 6px; background: var(--panel); color: var(--text); }
.nb-list article { border-bottom: 1px solid var(--border); padding: 6px 0; }
.nb-list h4 { margin: 0; font-size: 14px; }
.nb-list p { margin: 2px 0; font-size: 13px; }
.nb-list pre.sql { margin: 4px 0; padding: 4px 6px; background: var(--code); border-radius: 4px; white-space: pre-wrap; font-size: 12px; }
.card.locked h4 { color: var(--muted); }
```

- [ ] **Step 6: Kiểm kiểu và test**

Run: `npx tsc --noEmit && npm test`
Expected: `tsc` không lỗi; tất cả test PASS.

- [ ] **Step 7: Kiểm tay**

Run: `npm run dev`.
1. Bấm "Sổ tay": dialog neo phải, **không** che backdrop; vẫn gõ được trong editor và bấm Chạy khi Sổ tay đang mở.
2. Save trống: mọi thẻ kỹ năng khóa ("Mở sau ch1-01"…); mục Thuật ngữ đủ 37 mục. Xong `ch1-01` → mở lại Sổ tay: thẻ "Chọn cột" có cú pháp, Khi nào, Bẫy.
3. Gõ `luong` → còn "Green / Yellow / Red lane"; gõ `pod` → còn POD (khớp theo cột `shipments.pod`); gõ `zzz` → "Không có mục khớp "zzz"."
4. Esc và nút "Đóng" đều đóng; bấm "Sổ tay" lần nữa khi đang mở cũng đóng. Màn < 600px: dialog nằm dưới, không cuộn ngang.
5. EN: nhãn và nghĩa EN lên trước, nghĩa VI ở dòng mờ.

- [ ] **Step 8: Commit**

```bash
git add src/ui/notebook.ts src/i18n/vi.ts src/i18n/en.ts index.html src/main.ts src/style.css
git commit -m "feat: non-modal notebook with skill cards and freight glossary"
```

---

### Task 10: Cổng phát hành EN, test từ điển, ghi chú dự án, kiểm tổng

**Files:**
- Create: `tests/release.test.ts`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: `loadTickets` (Task 2); `textOf` (Plan 1 Task 4); `vi` (`src/i18n/vi.ts`), `en` (`src/i18n/en.ts`)
- Produces:
  - test `cổng phát hành › 0 ticket thiếu bản EN` (D1: release yêu cầu 0 ticket thiếu EN; ở dev UI vẫn fallback VI có nhãn — việc đó thuộc Plan 1)
  - Test từ điển i18n (B5) đã có ở Plan 1 Task 10 (`tests/i18n.test.ts`, `SAME_OK` gồm `tab.explain`); task này chỉ chạy lại nó. Kiểm `NODE_HELP`/`STEP_*` cùng tập khóa nằm ở test của Plan 1b.

- [ ] **Step 1: Viết `tests/release.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { loadTickets } from '../src/content';
import { textOf } from '../src/tickets';

describe('cổng phát hành', () => {
  it('0 ticket thiếu bản EN', () => {
    expect(loadTickets().filter((t) => textOf(t, 'en').fallback).map((t) => t.id)).toEqual([]);
  });
});
```

- [ ] **Step 2: Chạy test**

Run: `npx vitest run tests/release.test.ts tests/i18n.test.ts && npx tsc --noEmit`

(`tests/i18n.test.ts` là của Plan 1 Task 10; nó bắt mọi khóa `prac.*`, `sbx.*`, `prog.*`, `skill.*`, `chip.*`, `goal.*`, `sum.*`, `dlg.*`, `nb.*` mà bản EN chép y nguyên VI hoặc lệch placeholder.)
Expected: PASS (Plan 1 đã dịch bù EN cho 15 ticket ch1–3). Nếu FAIL, danh sách id in ra là ticket thiếu khối `# EN`: **không** phát hành; báo cho chủ nội dung, không sửa test.

- [ ] **Step 3: Thêm mục vào cuối `CLAUDE.md`**

```markdown
## Product layer (Plan 1c)

- Save is v2 (`src/save.ts`): `review` (Leitner card per skill), `practice` totals, `sandboxDraft` (≤ 20,000 chars), `bossStep`. Never edit `tests/fixtures/save-v1.json` or `save-v2.json`; a future v3 adds `MIGRATIONS[2]` + `save-v3.json` and ships in its own release.
- Progress, skill levels, chapter goals and chapter summary are recomputed from the save + content (`src/overview.ts`); do not store derived state.
- Practice (`src/practice.ts`, `src/ui/modes.ts`): 0 XP, drafts not saved, practice hints never touch `save.hintsUsed`, bosses excluded. Leitner boxes `[1, 2, 4, 8, 16]` days on the machine's real local date (`localDay`), never the in-game date.
- Variants: frontmatter `variants` + `{{x}}` templates; story plays `variants[0]` (`loadTickets()`), practice reads `loadTicketTemplates()`. Format is validated by `parseTicket`; `tests/variants.test.ts` checks every variant runs, differs, and leaves no variant-0 value behind.
- Modes live in `src/session.ts` (`story | practice | sandbox`). `work.setTicket(undefined, 0)` is Sandbox: no Submit, still `runSandboxed`.
- Glossary: `content/glossary.yml` `{ term, vi, en, columns }`; `columns` must exist in the DB (`tests/glossary.test.ts`).
- Release gate: `tests/release.test.ts` fails while any ticket lacks its `# EN` block.
```

- [ ] **Step 4: Chạy toàn bộ và build**

Run: `npm test && npm run build`
Expected: tất cả test PASS; `tsc --noEmit` không lỗi; Vite build xong.

- [ ] **Step 5: Kiểm tay tổng (save cũ → mới)**

1. DevTools: đặt `cargo-query-save` = nội dung `tests/fixtures/save-v1.json` → tải lại: không có cảnh báo; tiến độ `ch1-01`, `ch1-02` còn; Local Storage có thêm key `cargo-query-save.v1` chứa nguyên bản v1; `cargo-query-save` giờ có `"version":2`.
2. Thanh trên hiện "Ôn: 2" (kỹ năng `select`, `where` đã học từ v1 nhưng chưa có thẻ → đến hạn hôm nay); bấm → lượt ôn 2 bài.
3. Xuất tiến độ → file JSON có `review`, `practice`, `sandboxDraft`, `bossStep`; Nhập lại file đó → mọi thứ như trước.
4. Lặp nhanh checklist Plan 1 Task 10 Step 10 (mục 1–13): Học chính chạy y như trước.

- [ ] **Step 6: Commit**

```bash
git add tests/release.test.ts CLAUDE.md
git commit -m "test: release gate for missing EN tickets; document product layer"
```
