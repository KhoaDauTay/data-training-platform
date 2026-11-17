# Cargo Query — Plan 1c: Product layer (save v2, Luyện tập, Sandbox, mục tiêu chương, Sổ tay)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm lớp sản phẩm lên app đã có (Plan 1 + 1d + 1b):
- save v2, nâng một lần duy nhất;
- Luyện tập theo D2: biến thể `{{x}}`, Leitner 5 hộp `[1, 2, 4, 8, 16]`, 3 lối vào (Ôn hôm nay / Luyện kỹ năng / Làm lại việc), nút "Ôn: N", 0 XP;
- Sandbox: SQL tự do, không chấm;
- thẻ mục tiêu chương, chip Dạy/Cần, khối tổng kết chương dưới Recap của đánh giá thăng tiến;
- Sổ tay: thẻ kỹ năng + thuật ngữ freight;
- nút "Sao chép thông tin chẩn đoán" (L8).

**Architecture:**
- Logic nằm trong module thuần có unit test: `src/variants.ts`, `src/practice.ts`, `src/overview.ts`, `src/glossary.ts`.
- Chế độ (Làm việc / Luyện tập / Sandbox) nằm trong `src/session.ts`, không DOM. Practice/Sandbox là **chế độ bên trong route `#/play`**, không phải route mới (CLAUDE.md).
- Giao diện: module DOM mới trong `src/ui/` dùng `h()` và class Tailwind nguyên vẹn (`cx()` từ `src/theme.ts`). Không thêm CSS vào `src/style.css`.
- Mọi lối vào gắn qua hook đã có của Plan 1d:
  - nav: `registerNav` (`src/ui/topbar.ts`);
  - Trang chủ: `registerHomeSection`, `registerMode`, `homeHooks.levelOf` / `homeHooks.onSkill` (`src/ui/homeView.ts`).
- Mọi trạng thái tiến độ được **tính lại từ save** (`completed`, `hintsUsed`, `review`, `bossStep`) cộng nội dung, không lưu thêm.

**Tech Stack:** như HEAD. **Không thêm dependency.**

**Spec:** `docs/superpowers/specs/2026-11-16-cargo-query-design.md` §1, §6b, §8, §9. **Nguồn quyết định:** `docs/team/amendments.md` A4–A9, B7, E1, E2, D1, D2; `docs/team/decision-log.md` L8, L10, L12, L16, L19, L20, L22, L29–L32, L35 (dòng mới thắng).

**Tiền đề:** Plan 1, Plan 1d (Tailwind, Trang chủ, 12 chương, `people.yml`, hoạt cảnh, KPI, bản đồ tuyến) và Plan 1b (tab trực quan, dải tiến độ) đã xong. Plan này viết lại trên HEAD `a167190`. Task 11 cần thêm Plan Deploy Task 1 + 3. Chạy trước Plan 2.

**Ngoài phạm vi:**
- Đã có chủ khác: hạ tầng i18n, tách `main.ts`, lịch sử query, Format SQL, nạp CSV (Plan Import).
- Để bản sau (B7): tự gắn link thuật ngữ trong đề, badge ở tab Cột.
- Thuộc Plan 2 theo curriculum §5.7 (xem quyết định P4):
  - card "Ôn đầu chương" (§5.2);
  - "Thẻ úp" (§5.3);
  - `reflect:`, `wrong:`, `format:`.

## Đã bỏ vì Plan 1d/1b

Các phần của bản plan cũ dưới đây **không làm**, vì HEAD đã có phần tương đương:

| Bản cũ | Thay bằng (đã có trên HEAD) |
|---|---|
| Task 4 `progressLine`, Task 8 `src/ui/progressView.ts`, `#progress` "Ch x/7 · n/35 ticket · XP" | Topbar đã có `#chapter` (`Chương {n}/{total}: {title}`, L12, 12 chương), `#rank`, `#xp`. Trang chủ hiện `{done}/{total} việc`, dải `#map` hiện chấm chương. Plan này chỉ thêm nút `#review-btn` "Ôn: N". |
| Task 4 `skillLevel`, Task 8 `src/ui/skillMap.ts`, `#skills-btn`, `#skills-dialog`, khóa `skill.*` | Mục "Chủ đề kỹ năng" của Trang chủ (`skillsSection` trong `homeView.ts`): lưới kỹ năng theo chương, mức nhớ 1–5 qua `homeHooks.levelOf`, bấm kỹ năng đã học qua `homeHooks.onSkill`. Plan này chỉ gắn hai hook. |
| Task 4 `learnedSkills` riêng trong `overview.ts` | `learnedSkills` export từ `src/home.ts`; `homeModel` dùng lại hàm đó. |
| Task 7 `renderModes`, `<div id="modes">` trong hộp thư | Nav "Luyện tập"/"Sandbox" (`registerNav`), card "Ôn tập" trên Trang chủ (`registerHomeSection`), card chế độ Sandbox/Sổ tay (`registerMode`), nút "Ôn: N", nút "Luyện lại việc này" dưới Recap. |
| Task 8 animation mở màn 1,5 s của Tổng kết chương và dialog `#summary-dialog` | Hoạt cảnh `promotion` 3 s của Plan 1d (L32). Tổng kết là một khối tĩnh dưới Recap (quyết định P2). |
| Task 8 thay `#xp` bằng `#progress` | Giữ chip `#xp` (quyết định P3). |
| Task 10 `tests/release.test.ts` | `tests/content.test.ts` › "song ngữ › có khối # EN" đã chặn ticket thiếu EN cho mọi ticket. |
| Mọi bước "Thêm CSS vào cuối `src/style.css`" | Class Tailwind nguyên vẹn trong `h()` / `index.html`; `tests/theme.test.ts` chặn ghép class. |
| Task 2 biến thể `ch2-04` (đếm lô theo `{{status}}`) | Plan 1d Task 14 đã viết lại đề thành câu hỏi nghiệp vụ, trạng thái giờ là chữ ("đang trên đường"). `VARIANT_VALUE_RE` chỉ nhận ASCII, `tests/content.test.ts` cấm mã trạng thái trong đề. Biến thể chuyển sang `ch2-03` (ngưỡng số lô). |
| Ghi chú "Sau Plan 1d" ở đầu bản cũ | Đã áp vào từng task bên dưới. |

## Quyết định sản phẩm trong plan này (để orchestrator ghi L-số)

| # | Quyết định | Lý do |
|---|---|---|
| P1 | Biến thể ch1–3 nằm ở `ch1-03` (tháng: `month`, `month_en`, `from`, `to`) và `ch2-03` (ngưỡng `min`: 150 / 120 / 200). `ch2-04` không có biến thể. | Đề mới là văn xuôi VI/EN. Giá trị biến thể phải ASCII (`VARIANT_VALUE_RE`) và không được là mã trạng thái (test nội dung). Số và tháng thì dùng được ở cả hai ngôn ngữ. |
| P2 | Tổng kết chương là **khối tĩnh dưới Recap** của đánh giá thăng tiến (`wrapUp`), không phải dialog. | `showModal()` nằm ở top layer, sẽ che dock `#stage` đang chạy hoạt cảnh `promotion`, và `playCompletion` không có hook "đã xong". Khối trong Recap tự hiện sau khi nộp, không thêm hiệu ứng. Tiêu đề dùng `career` của chương. |
| P3 | **Đảo một phần L12 và ghi chú Plan 1d Task 19** (`#xp` thay bằng `#progress` "n/N ticket · XP · Ôn: N"; nút `#skills-btn`). Giữ chip `#xp`; không thêm `#progress` và `#skills-btn`. "Ôn: N" là nút `#review-btn`, **chỉ hiện khi N > 0**. | Số chương, chức danh và XP đã có trên topbar; số việc nằm ở Trang chủ; lưới kỹ năng nằm ở Trang chủ. Một nút "Ôn: 0" bị khóa trên nền gradient khó đạt tương phản AA. Muốn quay về L12: thêm `#progress` lấy `done/total` từ `homeModel`. |
| P4 | Card "Ôn đầu chương" (curriculum §5.2) **không làm ở 1c**. | Curriculum §5.7 xếp nó vào Plan 2. Ghi chú Plan 1d Task 19 có nhắc, nhưng curriculum là tài liệu chốt sau. |
| P5 | Lịch sử query và `save.graded` chỉ ghi và chỉ hiện ở chế độ Làm việc. | Bài luyện dùng chung id với ticket gốc nhưng SQL là của biến thể khác. Nếu ghi, Recap và lịch sử của ticket gốc bị ghi đè. Nếu hiện, người chơi thấy ngay SQL đã đạt của chính mình. |
| P6 | Nav "Luyện tập" chọn theo thứ tự:<br>• có kỹ năng đến hạn → Ôn hôm nay;<br>• không có → luyện một kỹ năng đã học, chọn ngẫu nhiên;<br>• chưa học gì → về Trang chủ.<br>Card "Ôn tập" luôn hiện trên Trang chủ và nói cách mở phần ôn. | Không có nút bấm mà không có phản hồi. |
| P7 | Card "Ôn tập" đặt ở `order: 22`, sau `career` (20). | Section rộng `full` đặt ở 15 sẽ chen giữa `continue` (wide) và `career` (narrow), làm vỡ hàng. |
| P8 | "Làm lại việc" là nút "Luyện lại việc này (0 XP)" dưới Recap của việc thường đã xong. Đánh giá thăng tiến không có nút này (L10). | Lối vào thứ 3 của D2, đặt ngay chỗ người chơi vừa xong việc. |
| P9 | Gợi ý khi luyện tập hiện "Gợi ý i/n", không ghi "−x XP". | Luyện tập 0 XP; ghi "−25 XP" sẽ sai. |
| P10 | Nút chẩn đoán: DB hỏng trước lần `ready` đầu → `db-init-failed`, sau đó → `worker-crash`. Clipboard bị chặn thì nội dung hiện trong banner `#notice` để tự chép. | `DbClient` gộp `initError` và `onerror` vào cùng một trạng thái `failed`. Banner có sẵn và hiện chữ bằng `textContent`. |
| P11 | Phản hồi sai "có giọng người" (product-design-v2 #9): mỗi lý do sai (`voiceKey`: lỗi, số cột, thứ tự, thiếu dòng, thừa dòng, sai giá trị) có **một câu** của người gửi, kèm chân dung `avatar(tk.from)`. Câu dùng chung cho mọi phòng ban, nên có 6 câu × 2 ngôn ngữ thay vì bảng lý do × phòng (30 câu). | Đủ để phản hồi bớt cảm giác "bị chấm trượt", với 1/5 khối lượng chữ. Muốn thêm giọng riêng từng phòng: đổi `voiceKey` thành `(reason, dept)`. |

## Global Constraints

- PGlite **0.5.16** pin. Solution không dùng `CURRENT_DATE`/`now()`. Không đưa dữ liệu vào `innerHTML`. Mọi truy cập `localStorage` bọc try/catch. Mọi bước "xác nhận PASS" chạy thêm `npx tsc --noEmit` và phải không lỗi.
- UI và nội dung VI + EN, VI là bản gốc. Mọi chuỗi UI mới đi qua `t(key)`. Khóa mới thêm vào **cả** `src/i18n/vi.ts` và `src/i18n/en.ts` trong cùng task. EN không trùng y hệt VI, trừ khóa đưa vào `SAME_OK` của `tests/i18n.test.ts`.
- **Không có chữ "boss" / "sự cố"** trong chuỗi hiển thị (L22, `tests/i18n.test.ts`). Ticket cuối chương là "đánh giá thăng tiến".
- Class Tailwind là chuỗi nguyên vẹn. Ghép điều kiện dùng `cx()`, không viết `` class: `…${x}` `` (`tests/theme.test.ts`). Chữ đọc ≥ 14px (`text-sm` trở lên, L23).
- **Save chỉ nâng một lần lên v2** qua `MIGRATIONS[1]` (L20). `Save.graded` giữ nguyên. `tests/fixtures/save-v1.json` **không bao giờ sửa**. Thêm `tests/fixtures/save-v2.json`, và cũng không bao giờ sửa sau khi commit.
- "Hôm nay" của lịch ôn = **ngày thật theo giờ máy** (`localDay(new Date())`), khác "hôm nay trong game" 2026-10-31. Ngày lịch ôn không bao giờ đi vào SQL. Hàm thuần nhận `today: string` và `rnd: () => number` làm tham số.
- Luyện tập:
  - **0 XP**;
  - draft luyện tập **không lưu**;
  - gợi ý **không ghi** vào `save.hintsUsed`;
  - không gọi `complete()`/`playCompletion`, nên không có hoạt cảnh và không thêm container (completion-animations §1.4);
  - đánh giá thăng tiến (`beat: boss`) không có biến thể và không vào Luyện tập (L10).
- Làm việc (story) luôn chơi `variants[0]`. Template `{{x}}` chỉ thấy qua `loadTicketTemplates()`.
- Không viết test mới import `src/ui/*` hoặc `src/session.ts`: Vitest chạy Node, không DOM. Hai test cũ `tests/workRace.test.ts` và `tests/coach.test.ts` đã mock DOM, chỉ sửa chỗ tạo `Save`. UI kiểm tay theo checklist ở mỗi task.
- Mỗi task một commit (bước cuối mỗi task).

**Cách đọc các bước sửa code.** Mỗi bước dùng một trong ba dạng dưới đây, áp đúng thứ tự trong plan.
- **Tạo `path`:** ghi cả file, ghi đè nếu file đã có.
- **Sửa `path`** — thay: khối thứ nhất phải xuất hiện **đúng một lần** trong file. Thay nó bằng khối sau chữ "bằng:".
- **Thêm vào cuối `path`:** nối khối vào cuối file.

## Tên dùng từ HEAD (Task 0 kiểm bằng grep)

| File | Tên dùng trong plan này |
|---|---|
| `src/save.ts` | `SAVE_VERSION = 1`, `Save` (có `graded`), `Known { ticketIds; skills }`, `Migration`, `MIGRATIONS = {}`, `emptySave()` (một dòng), `serializeSave`, `parseSave(raw, known, migrations?, version?)` (biến `d`, `pickRecord`, `isString`), `loadSave`, `oldSaveKey`, `NewerSaveError`, `stepKey`, `ticketOfKey` |
| `src/storage.ts` | `type KV` |
| `src/tickets.ts` | `Lang`, `Beat`, `Variant`, `Ticket` (`variants?`, `en?`, `scene?`, `steps[].columns?: Bilingual[]`), `textOf`, `byOrder`, `parseTicket` (kiểm `variants`: 2–4 bộ, giá trị khớp `/^[\w .:/-]{1,40}$/`, đúng các khóa `{{x}}`, boss không có) |
| `src/content.ts` | `loadTickets()` |
| `src/progress.ts` | `SKILLS`, `CHAPTERS` (`Chapter { chapter, title, career, tier, story, outcomes }`), `chapterTitle`, `CHAPTER_TABLES`, `xpFor`, `nextTicket`, `currentChapter`, `rankOf` |
| `src/home.ts` | `homeModel(tickets, completed, chapters, skills, levelOf?)`, `HomeModel` (`learned`, `skills[].level`), `LEVELS = 5` |
| `src/state.ts` | `app` (`tickets, save, selectedId, stepIndex, conclusionFor, notice, lastRun, …`), `actions`, `done()`, `selected()`, `draftKey()`, `initialDoc()`, `persist()` |
| `src/ui/work.ts` | `mountWork(host, deps: WorkDeps): WorkArea`; `WorkDeps { db, panel, onSolved, onStepSolved, onConclusion, onRun }`; `WorkArea.setTicket(t, stepIndex, force?)` |
| `src/ui/brief.ts` | `renderBrief(host, tk, stepIndex)` (header là con đầu tiên; Recap khi ticket đã xong) |
| `src/ui/topbar.ts` | `registerNav(NavItem)` (cùng id thì thay), nav `home` (10) và `play` (20) |
| `src/ui/homeView.ts` | `registerHomeSection({ id, order, span, render })`, `registerMode(ModeCard)`, `homeHooks.levelOf`, `homeHooks.onSkill`, `resume(id)` |
| `src/ui/router.ts` | `go(route)`, `currentRoute()` |
| `src/route.ts` | `hashOf(route)` |
| `src/theme.ts` | `cx`, `CARD`, `PILL`, `BTN_GO`, `TOP_BTN`, `chapterColor(n).chip` |
| `src/main.ts` | `rerender()` gọi `renderBrief(byId('ticket'), …)`; `selectTicket(id, force)`; `nextStep()`; `complete(t)`; `const work = mountWork(`; `app.selectedId = firstOpen();` |
| `index.html` | `id="inbox-btn"`, `<p id="announce"` |
| `tests/helpers.ts` / `src/grader.ts` | `runner()` / `cellKey(v)` |

## File Structure

```
content/glossary.yml            37 thuật ngữ freight { term, vi, en, columns }
content/tickets/ch1/ch1-03.md   + variants (tháng)                    (sửa)
content/tickets/ch2/ch2-03.md   + variants (ngưỡng số lô)             (sửa)
src/save.ts                     v2: review, practice, sandboxDraft, bossStep; MIGRATIONS[1]   (sửa)
src/content.ts                  loadTicketTemplates(); loadTickets() = variants[0]           (sửa)
src/home.ts                     export learnedSkills (homeModel dùng lại)                    (sửa)
src/variants.ts                 renderTemplate, applyVariant, templateVars, variantsOf
src/practice.ts                 Leitner [1,2,4,8,16] + chọn bài luyện (hàm thuần)
src/overview.ts                 outcomeDone, chapterSummary, grantedBy, resumeStep
src/glossary.ts                 parseGlossary, GLOSSARY, normalize, matches
src/session.ts                  chế độ story/practice/sandbox + draft/gợi ý/đóng ticket, today(), dueToday()
src/ui/modes.ts                 vào/ra Luyện tập & Sandbox, nav, card Ôn tập, renderLeft, nút Ôn: N
src/ui/chapterView.ts           goalCard, skillChips, wrapUp, skillLabel
src/ui/notebook.ts              toggleNotebook (dialog không modal) + card chế độ
src/ui/work.ts, brief.ts, homeView.ts, topbar.ts, src/main.ts, src/state.ts, src/db/client.ts, index.html, src/i18n/{vi,en}.ts   (sửa ở điểm neo)
tests/fixtures/save-v2.json, tests/saveV2.test.ts, tests/variants.test.ts, tests/practice.test.ts,
tests/overview.test.ts, tests/glossary.test.ts
tests/save.test.ts, tests/workRace.test.ts, tests/coach.test.ts, tests/i18n.test.ts   (sửa)
CLAUDE.md                       (ghi chú lớp sản phẩm)
```

---

### Task 0: Kiểm tiền đề (không sửa file)

- [ ] **Step 1: Test và kiểu đang sạch**

Run: `npm test && npx tsc --noEmit`
Expected: mọi test PASS, `tsc` không in lỗi.

- [ ] **Step 2: Grep các điểm neo**

Run:
```bash
grep -c "export const SAVE_VERSION = 1;\|export const MIGRATIONS: Record<number, Migration> = {};\|export const emptySave = \|graded: pickRecord(d.graded" src/save.ts
grep -c "export function loadTickets(): Ticket\[\] {" src/content.ts
grep -c "const VARIANT_VALUE_RE\|variants?: Variant\[\]" src/tickets.ts
grep -c "export function homeModel\|const learned = new Set(solved.flatMap" src/home.ts
grep -c "export const registerHomeSection\|export const registerMode\|export const homeHooks\|function resume(id: string)" src/ui/homeView.ts
grep -c "export const registerNav" src/ui/topbar.ts
grep -c "submitBtn.hidden = !ticket || done().has(ticket.id);\|doc: initialDoc(app.save.drafts\[draftKey()\], tk.starter),\|app.save.graded\[k\] = sql;" src/ui/work.ts
grep -c "const shown = app.save.hintsUsed\[tk.id\] ?? 0;\|const isDone = done().has(tk.id);" src/ui/brief.ts
grep -c "renderBrief(byId('ticket'), selected(), app.stepIndex);\|app.stepIndex = 0;\|app.save.completed.push(t.id);\|onSolved: (t) => complete(t)," src/main.ts
grep -c 'id="inbox-btn"\|<p id="announce"' index.html
ls tests/fixtures/save-v1.json content/skills.yml content/chapters.yml
```
Expected, lần lượt: `4`, `1`, `2`, `2`, `4`, `1`, `3`, `2`, `4`, `2`; `ls` in ra 3 đường dẫn.

Nếu một số không khớp: **dừng plan và báo** tên thiếu cho người điều phối. Không tự chế tên thay thế (L7: code trên đĩa thắng plan, chỉ áp phần chênh).

Task này không commit.

---

### Task 1: Save v2 (một lần nâng duy nhất)

**Files:**
- Modify: `src/save.ts`, `tests/save.test.ts`, `tests/workRace.test.ts`, `tests/coach.test.ts`
- Create: `tests/fixtures/save-v2.json`, `tests/saveV2.test.ts`

**Interfaces:**
- Produces:
  - `SAVE_VERSION = 2`, `SANDBOX_DRAFT_MAX = 20_000`
  - `Save` thêm: `review: Record<string, { box: number; due: string }>`, `practice: { solved: number; failed: number }`, `sandboxDraft: string`, `bossStep: Record<string, number>` (giữ `graded`)
  - `MIGRATIONS[1]`: v1 → v2 thêm 4 trường rỗng (hàm thuần)
  - `parseSave` validate v2:
    - `review` chỉ giữ skill trong `known.skills`, `box` nguyên 1..5, `due` khớp `^\d{4}-\d{2}-\d{2}$`;
    - `practice.*` nguyên ≥ 0 (sai → 0);
    - `sandboxDraft` là string, cắt ở 20.000 ký tự;
    - `bossStep` chỉ giữ ticket trong `known.ticketIds`, giá trị nguyên ≥ 0.

- [ ] **Step 1: Fixture v2** (không bao giờ sửa sau khi commit)

**Tạo `tests/fixtures/save-v2.json`:**
```json
{
  "version": 2,
  "completed": ["ch1-01", "ch1-02", "ch1-03"],
  "xp": 500,
  "hintsUsed": { "ch1-02": 1 },
  "drafts": { "ch1-04#0": "SELECT full_name FROM employees" },
  "graded": { "ch1-02#0": "SELECT code, name, country FROM ports WHERE region = 'Europe' AND kind = 'SEAPORT'" },
  "review": {
    "select": { "box": 3, "due": "2026-11-20" },
    "where": { "box": 1, "due": "2026-11-17" }
  },
  "practice": { "solved": 4, "failed": 1 },
  "sandboxDraft": "SELECT count(*) FROM shipments",
  "bossStep": { "ch1-05": 1 }
}
```

- [ ] **Step 2: Test v2**

**Tạo `tests/saveV2.test.ts`:**
```ts
import { describe, expect, it } from 'vitest';
import v1 from './fixtures/save-v1.json?raw';
import v2 from './fixtures/save-v2.json?raw';
import { emptySave, loadSave, NewerSaveError, oldSaveKey, parseSave, SANDBOX_DRAFT_MAX, SAVE_KEY, type Known } from '../src/save';
import type { KV } from '../src/storage';

const known: Known = {
  ticketIds: new Set(['ch1-01', 'ch1-02', 'ch1-03', 'ch1-04', 'ch1-05']),
  skills: new Set(['select', 'where', 'order_by', 'limit']),
};

function memStore(initial: Record<string, string> = {}): KV & { data: Record<string, string> } {
  const data = { ...initial };
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; } };
}

describe('save v2', () => {
  it('emptySave có đủ trường v2 và giữ graded', () => {
    expect(emptySave()).toMatchObject({ version: 2, graded: {}, review: {}, practice: { solved: 0, failed: 0 }, sandboxDraft: '', bossStep: {} });
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
      version: 2, completed: [], xp: 0, hintsUsed: {}, drafts: {}, graded: {},
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
    expect(r.save).toMatchObject({ version: 2, completed: ['ch1-01', 'ch1-02'], review: {}, bossStep: {}, graded: {} });
    expect(store.data[oldSaveKey(1)]).toBe(v1);
  });
});
```

- [ ] **Step 3: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/saveV2.test.ts`
Expected: FAIL. Lý do: `SANDBOX_DRAFT_MAX` chưa được export, và `emptySave().version` vẫn là 1.

- [ ] **Step 4: Sửa `src/save.ts`**

**Sửa `src/save.ts`** — thay:
```ts
export const SAVE_VERSION = 1;
```
bằng:
```ts
export const SAVE_VERSION = 2;
export const SANDBOX_DRAFT_MAX = 20_000;
```

**Sửa `src/save.ts`** — thay:
```ts
  graded: Record<string, string>;
}
```
bằng:
```ts
  graded: Record<string, string>;
  // --- v2 (Plan 1c) ---
  /** Leitner card per skill id. `due` = real local day 'YYYY-MM-DD' of the player's machine, never the in-game date. */
  review: Record<string, { box: number; due: string }>;
  /** Practice totals for display only; never affect unlocking or XP. */
  practice: { solved: number; failed: number };
  /** Sandbox editor content, at most SANDBOX_DRAFT_MAX chars. */
  sandboxDraft: string;
  /** Promotion-review step reached (0-based) for tickets not completed yet. Clamped to steps.length - 1 on use. */
  bossStep: Record<string, number>;
}
```

**Sửa `src/save.ts`** — thay:
```ts
export const MIGRATIONS: Record<number, Migration> = {};

export const emptySave = (): Save => ({ version: SAVE_VERSION, completed: [], xp: 0, hintsUsed: {}, drafts: {}, graded: {} });
```
bằng:
```ts
export const MIGRATIONS: Record<number, Migration> = {
  // v1 → v2: pure, needs no content. Learned skills missing from `review` count as box 1 due today (practice.ts cardOf).
  1: (d) => ({ ...d, review: {}, practice: { solved: 0, failed: 0 }, sandboxDraft: '', bossStep: {} }),
};

export const emptySave = (): Save => ({
  version: SAVE_VERSION,
  completed: [],
  xp: 0,
  hintsUsed: {},
  drafts: {},
  graded: {},
  review: {},
  practice: { solved: 0, failed: 0 },
  sandboxDraft: '',
  bossStep: {},
});
```

**Sửa `src/save.ts`** — thay:
```ts
/**
 * Throws InvalidSaveError (not JSON, bad version, missing migration) or NewerSaveError.
 * `migrations`/`version` let tests exercise the migration path while SAVE_VERSION is 1.
 */
```
bằng:
```ts
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;

type V2Fields = Pick<Save, 'review' | 'practice' | 'sandboxDraft' | 'bossStep'>;

/** Runs for every version, so tests with custom `migrations`/`version` still get a complete Save. */
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

/**
 * Throws InvalidSaveError (not JSON, bad version, missing migration) or NewerSaveError.
 * `migrations`/`version` let tests exercise the migration path with made-up versions.
 */
```

**Sửa `src/save.ts`** — thay:
```ts
    graded: pickRecord(d.graded, isString, known.ticketIds),
  };
```
bằng:
```ts
    graded: pickRecord(d.graded, isString, known.ticketIds),
    ...readV2(d, known),
  };
```

- [ ] **Step 5: Sửa các test tạo `Save` bằng object literal**

Các object kỳ vọng có `version: 1` (kết quả `parseSave`) nay sai. Test "đúng version hiện tại" đang nạp v1, mà v1 giờ cũ hơn nên sẽ tạo `.v1`. Hai test mock DOM tạo `app.save` thiếu trường v2, nên `tsc` báo lỗi.

**Sửa `tests/save.test.ts`** — thay:
```ts
    expect(parseSave(v1, known)).toEqual({
      version: 1, completed: ['ch1-01', 'ch1-02'], xp: 350, hintsUsed: { 'ch1-02': 1 }, drafts: { 'ch1-03#0': 'SELECT ref FROM shipments' }, graded: {},
    });
```
bằng:
```ts
    expect(parseSave(v1, known)).toEqual({
      ...emptySave(), completed: ['ch1-01', 'ch1-02'], xp: 350, hintsUsed: { 'ch1-02': 1 }, drafts: { 'ch1-03#0': 'SELECT ref FROM shipments' },
    });
```

**Sửa `tests/save.test.ts`** — thay:
```ts
    expect(parseSave(raw, known)).toEqual({ version: 1, completed: ['ch1-01'], xp: 0, hintsUsed: {}, drafts: {}, graded: {} });
```
bằng:
```ts
    expect(parseSave(raw, known)).toEqual({ ...emptySave(), completed: ['ch1-01'] });
```

**Sửa `tests/save.test.ts`** — thay:
```ts
  it('save đúng version hiện tại → không tạo bản .v<old>', () => {
    const store = memoryStorage({ [SAVE_KEY]: v1 });
```
bằng:
```ts
  it('save đúng version hiện tại → không tạo bản .v<old>', () => {
    const store = memoryStorage({ [SAVE_KEY]: serializeSave(emptySave()) });
```

**Sửa `tests/workRace.test.ts`** — thay:
```ts
import type { QueryResult } from '../src/db/run';
```
bằng:
```ts
import type { QueryResult } from '../src/db/run';
import { emptySave } from '../src/save';
```

**Sửa `tests/workRace.test.ts`** — thay:
```ts
  app.save = { version: 1, completed: [], xp: 0, hintsUsed: {}, drafts: { 'A#0': 'SELECT 1  AS n', 'B#0': 'SELECT 2' }, graded: {} };
```
bằng:
```ts
  app.save = { ...emptySave(), drafts: { 'A#0': 'SELECT 1  AS n', 'B#0': 'SELECT 2' } };
```

**Sửa `tests/coach.test.ts`** — thay:
```ts
  app.save = { version: 1, completed: [], xp: 0, hintsUsed: {}, drafts: {}, graded: {} };
```
bằng:
```ts
  app.save = (await import('../src/save')).emptySave();
```

Không sửa `tests/fixtures/save-v1.json`.

- [ ] **Step 6: Chạy test, xác nhận PASS**

Run: `npx vitest run tests/save.test.ts tests/saveV2.test.ts tests/workRace.test.ts tests/coach.test.ts && npx tsc --noEmit`
Expected: mọi test PASS; `tsc` không lỗi.

- [ ] **Step 7: Chạy toàn bộ rồi commit**

Run: `npm test && npx tsc --noEmit`
Expected: tất cả PASS.

Theo luật A8 (release nâng save đi riêng), commit này chỉ chứa save v2:
```bash
git add src/save.ts tests/save.test.ts tests/saveV2.test.ts tests/fixtures/save-v2.json tests/workRace.test.ts tests/coach.test.ts
git commit -m "feat: save v2 (review, practice, sandboxDraft, bossStep) via migration 1->2"
```

---

### Task 2: Biến thể ticket (`{{x}}`) và nội dung biến thể ch1–3

**Files:**
- Create: `src/variants.ts`, `tests/variants.test.ts`
- Modify: `src/content.ts`, `content/tickets/ch1/ch1-03.md`, `content/tickets/ch2/ch2-03.md`

**Interfaces:**
- Consumes: `Ticket`, `variants?` (parser đã kiểm định dạng); `runner`; `cellKey`
- Produces:
  - `type VariantVars = Record<string, string>`
  - `variantsOf(t: Ticket): VariantVars[]`
  - `renderTemplate(s, vars)`: biến không có giá trị thì giữ nguyên `{{x}}`
  - `applyVariant(t, index)`: thay `{{x}}` trong **mọi** chuỗi của ticket (VI, EN, Solution, `columns`, `starter`, kết luận…) trừ khóa `variants`. Ticket không có biến thể thì trả về chính nó.
  - `templateVars(t)`: tên biến, sắp xếp, không trùng
  - `loadTicketTemplates(): Ticket[]` (template thô, sắp theo `byOrder`). `loadTickets()` = `loadTicketTemplates().map((t) => applyVariant(t, 0))`

Lý do đặt chỗ render ở loader: Làm việc luôn chơi `variants[0]`, nên UI, KPI và test nội dung đã có không bao giờ thấy `{{x}}`. Chỉ Luyện tập đọc template.

- [ ] **Step 1: Viết test**

**Tạo `tests/variants.test.ts`:**
```ts
import { describe, expect, it } from 'vitest';
import { loadTicketTemplates, loadTickets } from '../src/content';
import { cellKey } from '../src/grader';
import { applyVariant, renderTemplate, templateVars, variantsOf } from '../src/variants';
import { runner } from './helpers';

/** Strings a player reads or the grader runs; excludes ids and metadata. */
const SKIP_KEYS = new Set(['id', 'from', 'variants', 'tables', 'requires', 'grants', 'beat', 'scene']);
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
      steps: [{ ...base.steps[0], solution: "SELECT '{{m}}'", columns: [{ vi: 'Cột {{m}}', en: 'Col {{m}}' }] }],
      variants: [{ m: 'A' }, { m: 'B' }],
    };
    const v1 = applyVariant(tpl, 1);
    expect(v1.title).toBe('T B');
    expect(v1.hints[0]).toBe('h B');
    expect(v1.steps[0].solution).toBe("SELECT 'B'");
    expect(v1.steps[0].columns?.[0]).toEqual({ vi: 'Cột B', en: 'Col B' });
    expect(tpl.title).toBe('T {{m}}');
    expect(templateVars(tpl)).toEqual(['m']);
  });

  it('ticket không có biến thể: applyVariant trả về chính nó', () => {
    const plain = loadTicketTemplates().find((t) => variantsOf(t).length === 0)!;
    expect(applyVariant(plain, 0)).toBe(plain);
  });

  it('Làm việc (loadTickets) không còn {{…}}', () => {
    for (const t of loadTickets()) expect(texts(t).join('\n'), t.id).not.toMatch(/\{\{\w+\}\}/);
  });
});

describe('biến thể trong nội dung', () => {
  const templates = loadTicketTemplates();

  it('ch1–3 có ít nhất 2 ticket có biến thể (D2)', () => {
    expect(templates.filter((t) => variantsOf(t).length >= 2).length).toBeGreaterThanOrEqual(2);
  });

  // Format rules (2–4 sets, safe values, exact keys, no promotion review) are enforced by parseTicket.
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

- [ ] **Step 3: Viết `src/variants.ts` và tách loader**

**Tạo `src/variants.ts`:**
```ts
import type { Ticket } from './tickets';

/** Same shape as tickets.ts `Variant`; values were validated by parseTicket. */
export type VariantVars = Record<string, string>;

const VAR_RE = /\{\{(\w+)\}\}/g;

export const variantsOf = (t: Ticket): VariantVars[] => t.variants ?? [];

export function renderTemplate(s: string, vars: VariantVars): string {
  return s.replace(VAR_RE, (m, k: string) => (Object.hasOwn(vars, k) ? vars[k] : m));
}

/** Applies `f` to every string in a ticket, including fields added later (EN block, columns, starter...). */
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

**Tạo `src/content.ts`:**
```ts
import { byOrder, parseTicket, type Ticket } from './tickets';
import { applyVariant } from './variants';

const files = import.meta.glob<string>('../content/tickets/**/*.md', { query: '?raw', import: 'default', eager: true });

/** Raw tickets with their {{x}} templates; only Practice reads these. */
export function loadTicketTemplates(): Ticket[] {
  return Object.entries(files)
    .map(([path, source]) => parseTicket(source, path))
    .sort(byOrder);
}

/** Story mode always plays variants[0]. */
export function loadTickets(): Ticket[] {
  return loadTicketTemplates().map((t) => applyVariant(t, 0));
}
```

- [ ] **Step 4: Chạy test (chưa ticket nào có biến thể)**

Run: `npx vitest run tests/variants.test.ts && npx tsc --noEmit`
Expected: chỉ test "ch1–3 có ít nhất 2 ticket có biến thể" FAIL; các test khác PASS; `tsc` không lỗi.

- [ ] **Step 5: Biến thể cho `ch1-03` (lô nặng nhất theo tháng)**

Biến thể đổi tháng ở bốn chỗ:
- `month`: chữ VI;
- `month_en`: chữ EN;
- `from`, `to`: ngày trong SQL.

Câu phá hòa nằm ở phần không template, nên biến thể nào cũng có (luật PD §3.1.5). Đề vẫn không có backtick và tên cột (`tests/content.test.ts`).

**Tạo `content/tickets/ch1/ch1-03.md`:**
````markdown
---
id: ch1-03
chapter: 1
title: Năng lực hàng nặng tháng {{month}}
title_en: Heavy cargo in {{month_en}}
from: { name: Lê Bình, dept: Sales }
difficulty: 2
beat: twist
requires: [select, where]
grants: [order_by, limit]
tables: [shipments]
ordered: true
columns:
  - { vi: "Mã lô", en: "Shipment ref" }
  - { vi: "Tổng trọng lượng (kg)", en: "Gross weight (kg)" }
variants:
  - { month: "10/2026", month_en: "October 2026", from: "2026-10-01", to: "2026-11-01" }
  - { month: "08/2026", month_en: "August 2026", from: "2026-08-01", to: "2026-09-01" }
  - { month: "05/2026", month_en: "May 2026", from: "2026-05-01", to: "2026-06-01" }
---
Một nhà máy thép đang cân nhắc chuyển hàng sang mình. Họ hỏi mình đã từng nhận những lô nặng cỡ nào, và mình muốn trả lời bằng chính các lô gần đây.

## Task
Gửi mình 10 lô hàng xuất khẩu đi đường biển nặng nhất, trong số các lô booking trong tháng {{month}}: mã lô và tổng trọng lượng (kg). Tính mọi booking trong tháng, kể cả lô sau đó bị hủy, vì khách chỉ hỏi mình đã nhận booking cỡ nào. Lô nặng nhất lên đầu; hai lô nặng bằng nhau thì lô có mã nhỏ hơn đứng trước.

## Hints
1. Có ba điều kiện lọc: hàng xuất, đi đường biển, ngày booking trong tháng {{month}}. Sau đó xếp theo trọng lượng giảm dần, phá hòa bằng mã lô, rồi chỉ giữ 10 dòng đầu.
2. Bảng `shipments`: chiều hàng ở `direction` (`'EXPORT'`), phương thức ở `mode` (`'SEA'`), ngày booking ở `booking_date`, trọng lượng ở `gross_weight_kg`, mã lô ở `ref`. Tháng {{month}}: `booking_date >= '{{from}}' AND booking_date < '{{to}}'`. Giảm dần dùng `DESC`.
3. `SELECT ref, gross_weight_kg FROM shipments WHERE ... ORDER BY gross_weight_kg DESC, ref LIMIT 10`

## Solution
```sql
SELECT ref, gross_weight_kg
FROM shipments
WHERE direction = 'EXPORT' AND mode = 'SEA'
  AND booking_date >= '{{from}}' AND booking_date < '{{to}}'
ORDER BY gross_weight_kg DESC, ref
LIMIT 10
```

# EN
A steel plant is thinking about moving its cargo to us. They asked how heavy the shipments we have handled are, and I want to answer with our own recent shipments.

## Task
Send me the 10 heaviest export shipments by sea among those booked in {{month_en}}: shipment ref and gross weight (kg). Count every booking of the month, including ones cancelled later, because the customer only asks what size of booking we take on. Heaviest first; if two weigh the same, the one with the smaller ref comes first.

## Hints
1. There are three filters: exports, by sea, booking date in {{month_en}}. Then sort by weight from heaviest to lightest, break ties by shipment ref, and keep only the first 10 rows.
2. Table `shipments`: the direction is in `direction` (`'EXPORT'`), the mode in `mode` (`'SEA'`), the booking date in `booking_date`, the weight in `gross_weight_kg`, the shipment ref in `ref`. {{month_en}}: `booking_date >= '{{from}}' AND booking_date < '{{to}}'`. Descending order uses `DESC`.
3. `SELECT ref, gross_weight_kg FROM shipments WHERE ... ORDER BY gross_weight_kg DESC, ref LIMIT 10`
````

- [ ] **Step 6: Biến thể cho `ch2-03` (khách chủ lực theo ngưỡng số lô)**

Ngưỡng 150 / 120 / 200 lần lượt cho 7 / 10 / 4 khách. Không khách nào có đúng 120, 150 hay 200 lô, nên câu "không tính khách đúng {{min}} lô" vẫn đúng với mọi biến thể. KPI `keyAccounts` đọc bản Làm việc (`variants[0]` = 150), nên khớp nhãn "hơn 150 lô".

**Tạo `content/tickets/ch2/ch2-03.md`:**
````markdown
---
id: ch2-03
chapter: 2
title: Khách hàng chủ lực 2025
title_en: Key accounts of 2025
from: { name: Lê Bình, dept: Sales }
difficulty: 2
beat: twist
requires: [group_by]
grants: [having]
tables: [shipments]
columns:
  - { vi: "Mã khách hàng", en: "Customer code" }
  - { vi: "Số lô năm 2025", en: "Shipments in 2025" }
variants:
  - { min: 150 }
  - { min: 120 }
  - { min: 200 }
---
Ban giám đốc sắp mời các khách chủ lực dự hội nghị khách hàng cuối năm. Tiêu chí là khách đã đặt hơn {{min}} lô trong năm 2025. Tính cả lô bị hủy: đó vẫn là nhu cầu thật của khách, và team booking vẫn mất công xử lý.

## Task
Gửi mình mã khách hàng và số lô năm 2025 của từng khách đạt tiêu chí (hơn {{min}} lô, không tính khách đúng {{min}} lô). Tên khách thì CSKH sẽ tra sau, lúc này mã khách là đủ. Không cần sắp xếp.

## Hints
1. Bạn cần đếm số lô của từng khách trong năm 2025, rồi chỉ giữ khách có kết quả đếm lớn hơn {{min}}. Điều kiện "hơn {{min}}" áp lên con số sau khi đếm, không áp lên từng lô.
2. Bảng `shipments`, gom theo `customer_id`. `WHERE` lọc từng lô trước khi gom; điều kiện trên kết quả đếm đặt ở `HAVING COUNT(*) > {{min}}`, sau `GROUP BY`.
3. `SELECT customer_id, COUNT(*) FROM shipments WHERE ... GROUP BY customer_id HAVING ...`

## Solution
```sql
SELECT customer_id, COUNT(*)
FROM shipments
WHERE booking_date >= '2025-01-01' AND booking_date < '2026-01-01'
GROUP BY customer_id
HAVING COUNT(*) > {{min}}
```

# EN
The board is about to invite our key accounts to the year-end customer conference. The rule is: customers who booked more than {{min}} shipments in 2025. Cancelled shipments count too: they are still real demand from the customer, and the booking team still had to handle them.

## Task
Send me the customer code and the number of 2025 shipments of every customer who meets the rule (more than {{min}} shipments; exactly {{min}} does not qualify). Customer service will look up the names later, so the customer code is enough for now. Any order of rows is fine.

## Hints
1. You need to count each customer's shipments in 2025, then keep only the customers whose count is above {{min}}. The "above {{min}}" condition applies to the number after counting, not to single shipments.
2. Table `shipments`, grouped by `customer_id`. `WHERE` filters single shipments before grouping; a condition on the count goes in `HAVING COUNT(*) > {{min}}`, after `GROUP BY`.
3. `SELECT customer_id, COUNT(*) FROM shipments WHERE ... GROUP BY customer_id HAVING ...`
````

- [ ] **Step 7: Chạy test, xác nhận PASS**

Run: `npx vitest run tests/variants.test.ts tests/content.test.ts tests/tickets.test.ts tests/home.test.ts tests/i18n.test.ts && npx tsc --noEmit`
Expected: tất cả PASS. Nếu test "còn sót" báo một giá trị của biến thể 0, sửa đúng chỗ đó thành `{{biến}}` rồi chạy lại. Không sửa test.

- [ ] **Step 8: Chạy toàn bộ rồi commit**

Run: `npm test && npx tsc --noEmit`
Expected: tất cả PASS.

```bash
git add src/variants.ts src/content.ts tests/variants.test.ts content/tickets/ch1/ch1-03.md content/tickets/ch2/ch2-03.md
git commit -m "feat: ticket variants with {{x}} templates (ch1-03 month, ch2-03 threshold); story plays variants[0]"
```

---

### Task 3: Lịch ôn Leitner và chọn bài luyện (`src/practice.ts`)

**Files:**
- Create: `src/practice.ts`, `tests/practice.test.ts`

**Interfaces:**
- Consumes: `Ticket`, `Beat`; `variantsOf`, `loadTickets` (Task 2)
- Produces:
  - `Card { box; due }`, `Review = Record<string, Card>`, `PracticeStats { solved; failed }`, `PracticeItem { ticketId; variant; skills }`
  - `INTERVALS = [1, 2, 4, 8, 16]` (ngày; chỉ số = `box - 1`), `MAX_BOX = 5`, `QUEUE_MAX = 5`
  - `localDay(d)`: ngày theo giờ máy, dạng `YYYY-MM-DD`; `addDays(day, n)`
  - `cardOf(review, skill, today)`: kỹ năng đã học mà chưa có thẻ (save migrate từ v1) = `{ box: 1, due: today }`
  - `nextCard(card, success, today)`:
    - đạt: `box = min(box + 1, 5)`, `due = today + INTERVALS[box - 1]` (theo hộp mới);
    - chưa đạt: `{ box: 1, due: today + 1 }`.
  - `isSuccess(wrongSubmits, hints)`: gọi khi đã nộp đúng; đạt khi 0 lần sai và ≤ 1 gợi ý
  - `seedReview(review, skills, today)`: kỹ năng mới học = `{ box: 1, due: ngày mai }`, không đè thẻ đã có
  - `dueSkills(review, learned, today)`: sắp theo `due` rồi id
  - `variantFor(t, rnd)`: có ≥ 2 biến thể thì chọn ngẫu nhiên một biến thể ≠ 0, ngược lại 0
  - `pickForSkill(skill, templates, completed, rnd)`:
    - lọc ticket đã xong, không phải đánh giá thăng tiến, có kỹ năng trong `grants ∪ requires`;
    - ưu tiên ticket có biến thể.
  - `todayQueue(review, learned, templates, completed, today, rnd)`: tối đa `QUEUE_MAX` bài
  - `retryItem(t, rnd)`: `skills = t.grants` (ticket rest không dạy gì thì dùng `t.requires`)
  - `applyResult(state, skills, success, today)`: không đổi input

- [ ] **Step 1: Viết test**

**Tạo `tests/practice.test.ts`:**
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

  it('pickForSkill ưu tiên ticket đã xong có biến thể; bỏ đánh giá thăng tiến và ticket chưa xong', () => {
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

  it('retryItem luyện các kỹ năng ticket đó dạy; ticket rest không dạy gì thì luyện kỹ năng nó cần', () => {
    expect(retryItem(varied, () => 0)).toEqual({ ticketId: 'ch1-02', variant: 1, skills: ['where'] });
    expect(retryItem(wide, () => 0).skills).toEqual(wide.requires);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/practice.test.ts`
Expected: FAIL — không resolve được `../src/practice`.

- [ ] **Step 3: Viết `src/practice.ts`**

**Tạo `src/practice.ts`:**
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

/** "Practise this task again": the skills it teaches, or (a rest ticket teaches none) the skills it needs. */
export const retryItem = (t: Ticket, rnd: () => number): PracticeItem =>
  ({ ticketId: t.id, variant: variantFor(t, rnd), skills: [...(t.grants.length ? t.grants : t.requires)] });

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

- [ ] **Step 4: Chạy test, xác nhận PASS rồi commit**

Run: `npx vitest run tests/practice.test.ts && npx tsc --noEmit`
Expected: tất cả PASS; `tsc` không lỗi.

```bash
git add src/practice.ts tests/practice.test.ts
git commit -m "feat: Leitner review schedule and practice item selection"
```

---

### Task 4: Mục tiêu chương, tổng kết, bước đánh giá (`src/overview.ts`) và `learnedSkills` dùng chung

**Files:**
- Create: `src/overview.ts`, `tests/overview.test.ts`
- Modify: `src/home.ts`

**Interfaces:**
- Consumes: `CHAPTER_TABLES`, `xpFor` (`progress.ts`); `Save` (Task 1)
- Produces:
  - `learnedSkills(tickets, completed): Set<string>` trong **`src/home.ts`**: hợp các `grants` của ticket đã xong. `homeModel` dùng lại, để logic này không bị nhân đôi.
  - `outcomeDone(skills, chapter, tickets, completed, learned)`:
    - outcome có kỹ năng: tick khi đã học đủ kỹ năng;
    - outcome `skills: []` (ví dụ ch12 không dạy kỹ năng mới): tick khi mọi ticket của chương đã xong.
  - `ChapterSummary { xp; hints; skills; newTables }`, `chapterSummary(tickets, save, chapter)`: XP tính lại bằng `xpFor`; `newTables` = `CHAPTER_TABLES[chapter + 1]`
  - `grantedBy(tickets, skill)`
  - `resumeStep(save, t)`: bước đánh giá đã lưu, kẹp trong `[0, steps.length - 1]`; ticket đã xong → 0

Mức nhớ kỹ năng **không** có hàm riêng: Trang chủ đọc thẳng hộp Leitner qua `homeHooks.levelOf` (Task 7).

- [ ] **Step 1: Viết test**

**Tạo `tests/overview.test.ts`:**
```ts
import { describe, expect, it } from 'vitest';
import { loadTickets } from '../src/content';
import { learnedSkills } from '../src/home';
import { chapterSummary, grantedBy, outcomeDone, resumeStep } from '../src/overview';
import { CHAPTER_TABLES, xpFor } from '../src/progress';
import { emptySave } from '../src/save';
import type { Beat, Ticket } from '../src/tickets';

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
  it('learnedSkills (home.ts) = grants của ticket đã xong', () => {
    expect([...learnedSkills(tickets, new Set(['ch1-01']))]).toEqual(['select']);
  });

  it('outcomeDone: theo kỹ năng; outcome rỗng tick khi xong cả chương có ticket', () => {
    const all = new Set(['ch1-01', 'ch1-02', 'ch1-05']);
    const learned = learnedSkills(tickets, all);
    expect(outcomeDone(['select', 'where'], 1, tickets, all, learned)).toBe(true);
    expect(outcomeDone(['aggregate'], 1, tickets, all, learned)).toBe(false);
    expect(outcomeDone([], 1, tickets, all, learned)).toBe(true);
    expect(outcomeDone([], 1, tickets, new Set(['ch1-01']), learned)).toBe(false);
    expect(outcomeDone([], 12, tickets, all, learned)).toBe(false);
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

  it('resumeStep: kẹp bước đánh giá, ticket đã xong về 0', () => {
    expect(resumeStep({ ...emptySave(), bossStep: { 'ch1-05': 1 } }, boss)).toBe(1);
    expect(resumeStep({ ...emptySave(), bossStep: { 'ch1-05': 9 } }, boss)).toBe(2);
    expect(resumeStep({ ...emptySave(), completed: ['ch1-05'], bossStep: { 'ch1-05': 1 } }, boss)).toBe(0);
    expect(resumeStep(emptySave(), undefined)).toBe(0);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/overview.test.ts`
Expected: FAIL — không resolve được `../src/overview` (và `learnedSkills` chưa được export).

- [ ] **Step 3: Viết code**

**Sửa `src/home.ts`** — thay:
```ts
export const LEVELS = 5;
```
bằng:
```ts
export const LEVELS = 5;

/** Skills taught by the completed tickets. Shared by Home, Practice and the chapter goals (Plan 1c). */
export const learnedSkills = (tickets: Ticket[], completed: Set<string>): Set<string> =>
  new Set(tickets.filter((t) => completed.has(t.id)).flatMap((t) => t.grants));
```

**Sửa `src/home.ts`** — thay:
```ts
  const learned = new Set(solved.flatMap((t) => t.grants));
```
bằng:
```ts
  const learned = learnedSkills(tickets, completed);
```

**Tạo `src/overview.ts`:**
```ts
import { CHAPTER_TABLES, xpFor } from './progress';
import type { Save } from './save';
import type { Ticket } from './tickets';

/** An outcome without skills (a chapter that teaches nothing new, e.g. ch12) is ticked once the whole chapter is done. */
export function outcomeDone(skills: string[], chapter: number, tickets: Ticket[], completed: Set<string>, learned: Set<string>): boolean {
  if (skills.length) return skills.every((s) => learned.has(s));
  const inChapter = tickets.filter((t) => t.chapter === chapter);
  return inChapter.length > 0 && inChapter.every((t) => completed.has(t.id));
}

export interface ChapterSummary { xp: number; hints: number; skills: string[]; newTables: string[] }

/** Recomputed from the save: XP via xpFor (never stored per chapter). */
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

/** Promotion-review step to reopen at (save.bossStep), clamped; 0 for normal or completed tickets. */
export function resumeStep(save: Save, t: Ticket | undefined): number {
  if (!t || save.completed.includes(t.id)) return 0;
  return Math.min(Math.max(save.bossStep[t.id] ?? 0, 0), t.steps.length - 1);
}
```

- [ ] **Step 4: Chạy test, xác nhận PASS rồi commit**

Run: `npx vitest run tests/overview.test.ts tests/home.test.ts && npx tsc --noEmit`
Expected: tất cả PASS; `tsc` không lỗi.

```bash
git add src/overview.ts src/home.ts tests/overview.test.ts
git commit -m "feat: chapter goals, summary and review step recomputed from save; shared learnedSkills"
```

---

### Task 5: Thuật ngữ freight (`content/glossary.yml`, `src/glossary.ts`)

**Files:**
- Create: `content/glossary.yml`, `src/glossary.ts`, `tests/glossary.test.ts`

**Interfaces:**
- Produces:
  - `Term { term; vi; en; columns }`:
    - `vi`/`en` là định nghĩa ngắn;
    - `columns` dạng `table.column`, chỉ gồm cột **đang có** trong DB. Thuật ngữ của chương sau để `columns: []`; Plan 2–4 bổ sung khi tạo bảng.
  - `parseGlossary(source)`: throw `Error` có số thứ tự mục khi thiếu trường
  - `GLOSSARY: Term[]` (nạp từ `content/glossary.yml?raw`)
  - `normalize(s)`: chữ thường, bỏ dấu tiếng Việt (`đ` → `d`)
  - `matches(query, ...texts)`: query rỗng khớp mọi thứ

Thiết kế nội dung (vai Product):
- thuật ngữ **không khóa**;
- mỗi mục 1–2 câu;
- `term` là mã/viết tắt dùng chung VI–EN;
- Sổ tay hiện nghĩa ở ngôn ngữ đang chọn trước, nghĩa ở ngôn ngữ còn lại sau.

Tên bảng, tên cột và mã giá trị giữ nguyên (luật i18n).

- [ ] **Step 1: Viết test**

**Tạo `tests/glossary.test.ts`:**
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

- [ ] **Step 3: Nội dung và parser**

**Tạo `content/glossary.yml`:**
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

**Tạo `src/glossary.ts`:**
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

- [ ] **Step 4: Chạy test, xác nhận PASS rồi commit**

Run: `npx vitest run tests/glossary.test.ts && npx tsc --noEmit`
Expected: tất cả PASS (37 mục); `tsc` không lỗi.

```bash
git add content/glossary.yml src/glossary.ts tests/glossary.test.ts
git commit -m "feat: freight glossary content with column and language checks"
```

---

### Task 6: Nối chế độ và save v2 vào khu làm bài (`src/session.ts`)

**Files:**
- Create: `src/session.ts`
- Modify: `src/ui/work.ts`, `src/ui/brief.ts`, `src/main.ts`, `src/i18n/vi.ts`, `src/i18n/en.ts`

**Interfaces:**
- Consumes:
  - từ `state.ts`: `app`, `done`, `draftKey`, `selected`;
  - `SANDBOX_DRAFT_MAX` (Task 1);
  - `PracticeItem`, `dueSkills`, `localDay`, `seedReview` (Task 3);
  - `learnedSkills`, `resumeStep` (Task 4).
- Produces:
  - Kiểu và trạng thái:
    - `PracticeRun { id; items; tickets; index; wrong; hints; passed; result?; draft }`;
    - `type Mode = { kind: 'story' } | { kind: 'practice'; run: PracticeRun } | { kind: 'sandbox' }`;
    - `session: { mode: Mode }`, `isStory()`.
  - `activeTicket()`:
    - story: `selected()`;
    - practice: ticket đã áp biến thể;
    - sandbox: `undefined`.
  - `activeStep()`.
  - `workKey()`: `draftKey()` / `practice#<runId>#<index>` / `'sandbox'`. Editor chỉ tạo lại khi giá trị này đổi.
  - `readDraft()`, `writeDraft(v)`:
    - story: `save.drafts`;
    - practice: chỉ trong bộ nhớ;
    - sandbox: `save.sandboxDraft`, cắt 20.000 ký tự.
  - `isClosed(id)`: chỉ đúng ở story khi ticket đã xong, nên Luyện tập luôn mở nút Nộp.
  - `hintsShown(id)`, `useHint(id)`: practice đếm trong `run.hints`, không ghi `save.hintsUsed`.
  - `today()`, `dueToday()`: kỹ năng đã học đến hạn ôn hôm nay (ngày thật).
  - Hợp đồng mới của `WorkArea`:
    - `setTicket(t: Ticket | undefined, …)`: `undefined` = Sandbox. Ẩn Nộp, không lịch sử; Chạy/EXPLAIN vẫn qua `runSandboxed`.
    - `WorkDeps.onWrong?()`: gọi mỗi lần Nộp sai.
  - Ngoài Làm việc, `work.ts` không ghi lịch sử và `save.graded`, và không hiện lịch sử. Nếu hiện, bài luyện sẽ lộ SQL đã đạt của ticket gốc (P5).
  - Trong `main.ts`:
    - đóng ticket: ghi `review` (kỹ năng mới học hẹn ngày mai) và xóa `bossStep[id]`;
    - qua một bước đánh giá: ghi `bossStep[id]`;
    - chọn ticket hoặc tải trang: khôi phục bước bằng `resumeStep`.
  - Khóa i18n: `brief.hintFree`.

Làm việc phải chạy y hệt trước, chỉ thêm việc nhớ bước đánh giá.

- [ ] **Step 1: Viết `src/session.ts`**

**Tạo `src/session.ts`:**
```ts
import { learnedSkills } from './home';
import { dueSkills, localDay, type PracticeItem } from './practice';
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
  /** Hints opened on the current item. Never written to save.hintsUsed (XP and the chapter summary read that). */
  hints: number;
  passed: number;
  result?: 'ok' | 'weak';
  /** Editor text of the current item. Practice drafts are never saved. */
  draft: string;
}

/** Modes inside the #/play route (not routes of their own). */
export type Mode = { kind: 'story' } | { kind: 'practice'; run: PracticeRun } | { kind: 'sandbox' };

export const session: { mode: Mode } = { mode: { kind: 'story' } };
export const isStory = (): boolean => session.mode.kind === 'story';

/** Real local day for the Leitner schedule (never the in-game date). */
export const today = (): string => localDay(new Date());
/** Learned skills whose review is due today. */
export const dueToday = (): string[] => dueSkills(app.save.review, learnedSkills(app.tickets, done()), today());

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

/** `undefined` lets the caller fall back (initialDoc: the ticket's `starter`). */
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

/** Closed = no Submit, Recap shown. Only story tickets close; Practice always grades. */
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

**Sửa `src/ui/work.ts`** — thay:
```ts
import { app, done, draftKey, editorSchema, initialDoc, persist, stepKey, type LastRun } from '../state';
```
bằng:
```ts
import { isClosed, isStory, readDraft, workKey, writeDraft } from '../session';
import { app, editorSchema, initialDoc, persist, stepKey, type LastRun } from '../state';
```

**Sửa `src/ui/work.ts`** — thay:
```ts
  /** After every Run/Submit (the brief redraws its shape card). */
  onRun(): void;
}
```
bằng:
```ts
  /** After every Run/Submit (the brief redraws its shape card). */
  onRun(): void;
  /** Every wrong submit (Practice counts them for the Leitner result). */
  onWrong?(): void;
}
```

**Sửa `src/ui/work.ts`** — thay:
```ts
  setTicket(t: Ticket, stepIndex: number, force?: boolean): void;
```
bằng:
```ts
  /** `undefined` = Sandbox: no Submit, no history; Run, EXPLAIN, error underline and the tabs work as usual. */
  setTicket(t: Ticket | undefined, stepIndex: number, force?: boolean): void;
```

**Sửa `src/ui/work.ts`** — thay:
```ts
    submitBtn.hidden = !ticket || done().has(ticket.id);
```
bằng:
```ts
    submitBtn.hidden = !ticket || isClosed(ticket.id);
```

**Sửa `src/ui/work.ts`** — thay:
```ts
    const list = ticket ? history[ticket.id] ?? [] : [];
```
bằng:
```ts
    const list = ticket && isStory() ? history[ticket.id] ?? [] : []; // in Practice it would show the story's passing SQL
```

**Sửa `src/ui/work.ts`** — thay:
```ts
    const k = tk ? stepKey(tk.id, stepIndex) : '';
```
bằng:
```ts
    const k = tk ? stepKey(tk.id, stepIndex) : '';
    const historyId = isStory() ? tk?.id : undefined; // a practice variant shares the ticket id: keep it out of that history (P5)
```

**Sửa `src/ui/work.ts`** — thay:
```ts
    record(tk?.id, r);
```
bằng:
```ts
    record(historyId, r);
```

**Sửa `src/ui/work.ts`** — thay:
```ts
    const k = stepKey(tk.id, i);
    const sql = ed.getValue(); // Submit always grades the whole editor
```
bằng:
```ts
    const k = stepKey(tk.id, i);
    const story = isStory(); // captured at click time, like the ticket
    const sql = ed.getValue(); // Submit always grades the whole editor
```

**Sửa `src/ui/work.ts`** — thay:
```ts
    if (played) record(tk.id, played);
```
bằng:
```ts
    if (played) record(story ? tk.id : undefined, played);
```

**Sửa `src/ui/work.ts`** — thay:
```ts
    if (!r.ok) {
      const fail = r;
```
bằng:
```ts
    if (!r.ok) {
      deps.onWrong?.();
      const fail = r;
```

**Sửa `src/ui/work.ts`** — thay:
```ts
    app.save.graded[k] = sql; // the Recap shows what was graded, not the draft edited afterwards
    persist();
```
bằng:
```ts
    if (story) {
      app.save.graded[k] = sql; // the Recap shows what was graded, not the draft edited afterwards
      persist();
    }
```

**Sửa `src/ui/work.ts`** — thay:
```ts
      say('good', () => t(done().has(tk.id) ? 'work.correct' : 'work.conclusionNext')); // redrawn after the conclusion is submitted
```
bằng:
```ts
      say('good', () => t(isClosed(tk.id) ? 'work.correct' : 'work.conclusionNext')); // redrawn after the conclusion is submitted
```

**Sửa `src/ui/work.ts`** — thay:
```ts
      const sameTicket = ticket?.id === tk.id && !force;
      ticket = tk;
      stepIndex = i;
      if (!editor || draftKey() !== key || force) {
        key = draftKey();
```
bằng:
```ts
      const sameTicket = ticket?.id === tk?.id && !force;
      ticket = tk;
      stepIndex = i;
      if (!editor || workKey() !== key || force) {
        key = workKey();
```

**Sửa `src/ui/work.ts`** — thay:
```ts
          doc: initialDoc(app.save.drafts[draftKey()], tk.starter),
```
bằng:
```ts
          doc: initialDoc(readDraft(), tk?.starter),
```

**Sửa `src/ui/work.ts`** — thay:
```ts
            app.save.drafts[draftKey()] = v;
            persist();
```
bằng:
```ts
            writeDraft(v);
            persist();
```

Những chỗ khác đã chịu được `ticket === undefined`:
- `setButtons()` ẩn Nộp khi `!ticket`;
- `submit()` `return` ngay khi `!ticket`;
- `run()` dùng key `''`;
- `record(undefined, …)` bỏ qua;
- `drawHistory()` vẽ danh sách rỗng.

Sandbox không vẽ `renderBrief`, nên không có shape card.

- [ ] **Step 3: Sửa `src/ui/brief.ts`**

**Sửa `src/ui/brief.ts`** — thay:
```ts
import { actions, app, done, expectedShape, persist, stepKey, unlockedTables } from '../state';
```
bằng:
```ts
import { hintsShown, isClosed, isStory, useHint } from '../session';
import { actions, app, done, expectedShape, persist, stepKey, unlockedTables } from '../state';
```

**Sửa `src/ui/brief.ts`** — thay:
```ts
  const shown = app.save.hintsUsed[tk.id] ?? 0;
  const btn = h('button', {
    type: 'button',
    onclick: () => {
      app.save.hintsUsed[tk.id] = shown + 1;
      persist();
      actions.rerender();
    },
  }, t('brief.hint', { i: shown + 1, n: x.hints.length, cost: xpFor(tk, shown) - xpFor(tk, shown + 1) }));
```
bằng:
```ts
  const shown = hintsShown(tk.id);
  const btn = h('button', {
    type: 'button',
    onclick: () => {
      useHint(tk.id);
      persist();
      actions.rerender();
    },
  }, isStory()
    ? t('brief.hint', { i: shown + 1, n: x.hints.length, cost: xpFor(tk, shown) - xpFor(tk, shown + 1) })
    : t('brief.hintFree', { i: shown + 1, n: x.hints.length })); // Practice: 0 XP, so no cost (P9)
```

**Sửa `src/ui/brief.ts`** — thay:
```ts
  const isDone = done().has(tk.id);
  const boss = tk.steps.length > 1;
```
bằng:
```ts
  const isDone = isClosed(tk.id); // Practice replays a done ticket open: shape card, hints and Submit, no Recap
  const boss = tk.steps.length > 1;
```

- [ ] **Step 4: Khóa i18n `brief.hintFree`**

**Sửa `src/i18n/vi.ts`** — thay:
```ts
export const vi = {
```
bằng:
```ts
export const vi = {
  'brief.hintFree': 'Gợi ý {i}/{n}',
```

**Sửa `src/i18n/en.ts`** — thay:
```ts
export const en: Record<Key, Msg> = {
```
bằng:
```ts
export const en: Record<Key, Msg> = {
  'brief.hintFree': 'Hint {i} of {n}',
```

- [ ] **Step 5: Sửa `src/main.ts`**

**Sửa `src/main.ts`** — thay:
```ts
import { localStore } from './storage';
```
bằng:
```ts
import { resumeStep } from './overview';
import { localDay, seedReview } from './practice';
import { isStory, session } from './session';
import { localStore } from './storage';
```

**Sửa `src/main.ts`** — thay:
```ts
app.selectedId = firstOpen();
```
bằng:
```ts
app.selectedId = firstOpen();
app.stepIndex = resumeStep(app.save, selected()); // reloading mid-review keeps the step reached
```

**Sửa `src/main.ts`** — thay:
```ts
function selectTicket(id: string, force = false): void {
  app.selectedId = id;
  app.stepIndex = 0;
  app.conclusionFor = '';
  (byId('inbox-dialog') as HTMLDialogElement).close();
  rerender();
  work.setTicket(selected(), app.stepIndex, force);
```
bằng:
```ts
function selectTicket(id: string, force = false): void {
  const fromMode = !isStory(); // leaving Practice/Sandbox: new editor, and the practice run's lastRun is dropped
  session.mode = { kind: 'story' };
  app.selectedId = id;
  app.stepIndex = resumeStep(app.save, selected()); // a promotion review reopens at the step reached
  app.conclusionFor = '';
  (byId('inbox-dialog') as HTMLDialogElement).close();
  rerender();
  work.setTicket(selected(), app.stepIndex, force || fromMode);
```

**Sửa `src/main.ts`** — thay:
```ts
  app.stepIndex++;
  rerender();
```
bằng:
```ts
  app.stepIndex++;
  app.save.bossStep[app.selectedId] = app.stepIndex;
  persist();
  rerender();
```

**Sửa `src/main.ts`** — thay:
```ts
  app.save.completed.push(t.id);
  app.save.xp += gained;
```
bằng:
```ts
  app.save.completed.push(t.id);
  app.save.xp += gained;
  app.save.review = seedReview(app.save.review, t.grants, localDay(new Date())); // first review tomorrow
  delete app.save.bossStep[t.id];
```

- [ ] **Step 6: Kiểm kiểu và test**

Run: `npx tsc --noEmit && npm test`
Expected: `tsc` không lỗi; tất cả test PASS (gồm `tests/workRace.test.ts`: chế độ mặc định là story nên vẫn ghi `graded` và lịch sử như cũ).

- [ ] **Step 7: Kiểm tay (Làm việc không đổi, nhớ bước đánh giá)**

Run: `npm run dev`, mở URL Vite in ra.
1. Làm `ch1-01` → `ch1-04` như trước. Kiểm:
   - gợi ý ghi "(−25 XP)";
   - draft còn sau khi tải lại;
   - ticket đã xong không có nút Nộp;
   - hoạt cảnh chạy ở lần xong đầu tiên.
2. `ch1-05`: đúng bước 1, đang ở bước 2 thì tải lại trang → vẫn ở bước 2 và còn draft bước 2. Về Trang chủ, bấm "Mở việc này" → vẫn bước 2.
3. Xong `ch1-05`. Mở DevTools > Application > Local Storage > `cargo-query-save`:
   - `bossStep` không còn `ch1-05`;
   - `review` có `select`, `where`, `order_by`, `limit` với `box: 1` và `due` = ngày mai theo giờ máy.

- [ ] **Step 8: Commit**

```bash
git add src/session.ts src/ui/work.ts src/ui/brief.ts src/main.ts src/i18n/vi.ts src/i18n/en.ts
git commit -m "feat: mode-aware session seam, review step resume and review seeding"
```

---

### Task 7: Luyện tập và Sandbox trên giao diện (`src/ui/modes.ts`)

**Files:**
- Create: `src/ui/modes.ts`
- Modify: `src/main.ts`, `src/ui/homeView.ts`, `src/i18n/vi.ts`, `src/i18n/en.ts`, `tests/i18n.test.ts`

**Interfaces:**
- Consumes:
  - Task 6: `session`, `isStory`, `activeTicket`, `activeStep`, `today`, `dueToday`, `Mode`, `PracticeRun`;
  - Task 2: `loadTicketTemplates`, `applyVariant`;
  - Task 3: `todayQueue`, `pickForSkill`, `retryItem`, `applyResult`, `isSuccess`;
  - Task 4: `learnedSkills`;
  - HEAD: `renderBrief`, `WorkArea`, `registerNav`, `registerHomeSection`, `registerMode`, `homeHooks`, `go`, `hashOf`, `BTN_GO`, `CARD`, `cx`.
- Produces:
  - `initModes(c: { work; rerender })`: gọi một lần trong `main.ts`, ngay sau `mountWork`.
  - `startPractice(items): boolean`.
  - Ba lối vào, mỗi hàm trả `false` khi không có bài:
    - `startToday()`: Ôn hôm nay;
    - `startSkill(skill)`: Luyện kỹ năng;
    - `startRetry(ticketId)`: Làm lại việc.
  - `startSandbox()`, `backToStory()`. Mọi lối vào đều gọi `go('play')`.
  - `onPracticeSolved()`, `onPracticeWrong()`: gắn vào deps của `mountWork`.
  - `renderLeft(host)`: khung trái theo chế độ.
    - story: `renderBrief`, cộng nút "Luyện lại việc này" dưới Recap của việc thường (P8);
    - practice: dải Luyện tập + đề;
    - sandbox: giới thiệu Sandbox.

    Mọi nhánh đều có `#brief-title` để `showRoute` focus vào.
  - Đăng ký lúc nạp module:
    - nav `play` (thay bản của topbar: chỉ "đang chọn" ở story), `practice` (30), `sandbox` (40);
    - section Trang chủ `review` (order 22, P7);
    - card chế độ `sandbox` (10);
    - `homeHooks.levelOf` (hộp Leitner) và `homeHooks.onSkill` (Luyện kỹ năng).
  - Khóa i18n: `nav.practice`, `nav.sandbox`, `mode.sandbox`, `mode.sandboxDesc`, `prac.section`, `prac.today`, `prac.dueIntro`, `prac.noneDue`, `prac.locked`, `prac.retry`, `prac.banner`, `prac.exit`, `prac.ok`, `prac.weak`, `prac.next`, `prac.done`, `sbx.title`, `sbx.intro`.

Luật sản phẩm (D2, PD §3.2):
- chấm bằng grader có sẵn với Solution đã áp biến thể; 0 XP; draft không lưu; không ghi `hintsUsed`;
- đạt (0 lần sai, ≤ 1 gợi ý) → mọi kỹ năng của bài lên 1 hộp; ngược lại → về hộp 1, ôn ngày mai;
- đánh giá thăng tiến không vào Luyện tập (L10);
- Sandbox (E2): khu làm bài không ticket, không Nộp, không lịch sử (L16); vẫn qua `runSandboxed`; draft ở `save.sandboxDraft`.

- [ ] **Step 1: Khóa i18n**

**Sửa `src/i18n/vi.ts`** — thay:
```ts
export const vi = {
```
bằng:
```ts
export const vi = {
  'nav.practice': 'Luyện tập',
  'nav.sandbox': 'Sandbox',
  'mode.sandbox': 'Sandbox: SQL tự do',
  'mode.sandboxDesc': 'Viết SQL bất kỳ trên dữ liệu công ty, không chấm điểm.',
  'prac.section': 'Ôn tập · 0 XP',
  'prac.today': 'Ôn hôm nay ({n})',
  'prac.dueIntro': '{n} kỹ năng đến hạn ôn hôm nay. Mỗi bài là một việc bạn đã làm, có thể với số liệu khác; làm đúng thì lần ôn sau giãn ra.',
  'prac.noneDue': 'Hôm nay chưa có kỹ năng nào đến hạn ôn. Muốn luyện thêm, bấm một kỹ năng đã học ở mục Chủ đề kỹ năng.',
  'prac.locked': 'Xong việc đầu tiên thì kỹ năng bạn học được sẽ vào lịch ôn ở đây.',
  'prac.retry': 'Luyện lại việc này (0 XP)',
  'prac.banner': 'Luyện tập · bài {i}/{n} · 0 XP',
  'prac.exit': 'Về Làm việc',
  'prac.ok': 'Đúng! Kỹ năng lên một hộp ôn, lần ôn sau giãn ra.',
  'prac.weak': 'Đúng, nhưng có lần nộp sai hoặc đã mở từ 2 gợi ý, nên kỹ năng về hộp 1 (ôn lại ngày mai).',
  'prac.next': 'Bài tiếp →',
  'prac.done': 'Xong lượt luyện: {ok}/{n} bài đạt.',
  'sbx.title': 'Sandbox: SQL tự do',
  'sbx.intro': 'Viết SQL bất kỳ trên dữ liệu của công ty: không chấm, không XP. Mọi câu lệnh chạy trong BEGIN … ROLLBACK nên dữ liệu không đổi. Tab Cột chỉ liệt kê bảng đã mở; nội dung editor được lưu cùng tiến độ.',
```

**Sửa `src/i18n/en.ts`** — thay:
```ts
export const en: Record<Key, Msg> = {
```
bằng:
```ts
export const en: Record<Key, Msg> = {
  'nav.practice': 'Practice',
  'nav.sandbox': 'Sandbox',
  'mode.sandbox': 'Sandbox: free SQL',
  'mode.sandboxDesc': 'Write any SQL against the company data, with no grading.',
  'prac.section': 'Review · 0 XP',
  'prac.today': 'Review today ({n})',
  'prac.dueIntro': (p) => `${p.n} skill${Number(p.n) === 1 ? ' is' : 's are'} due for review today. Each one is a task you have done, possibly with different figures; get it right and the next review comes later.`,
  'prac.noneDue': 'No skill is due for review today. To practise more, click a learned skill under Skill topics.',
  'prac.locked': 'Once you finish your first task, the skills you learn are scheduled for review here.',
  'prac.retry': 'Practise this task again (0 XP)',
  'prac.banner': 'Practice · {i} of {n} · 0 XP',
  'prac.exit': 'Back to work',
  'prac.ok': 'Correct! The skill moves up one review box, so the next review comes later.',
  'prac.weak': 'Correct, but after a wrong submit or 2+ hints, so the skill goes back to box 1 (review tomorrow).',
  'prac.next': 'Next →',
  'prac.done': 'Practice done: {ok}/{n} passed.',
  'sbx.title': 'Sandbox: free SQL',
  'sbx.intro': 'Write any SQL against the company data: no grading, no XP. Every statement runs inside BEGIN … ROLLBACK, so the data never changes. The Columns tab lists unlocked tables only; the editor content is saved with your progress.',
```

"Sandbox" giống nhau ở hai ngôn ngữ:

**Sửa `tests/i18n.test.ts`** — thay:
```ts
const SAME_OK = new Set<string>(['tab.explain', 'top.xp']);
```
bằng:
```ts
const SAME_OK = new Set<string>(['tab.explain', 'top.xp', 'nav.sandbox']);
```

- [ ] **Step 2: Viết `src/ui/modes.ts`**

**Tạo `src/ui/modes.ts`:**
```ts
import { loadTicketTemplates } from '../content';
import { learnedSkills, type HomeModel } from '../home';
import { t } from '../i18n';
import { applyResult, isSuccess, pickForSkill, retryItem, todayQueue, type PracticeItem } from '../practice';
import { hashOf } from '../route';
import { activeStep, activeTicket, dueToday, isStory, session, today, type Mode, type PracticeRun } from '../session';
import { app, done, persist, selected } from '../state';
import { BTN_GO, CARD, cx } from '../theme';
import { applyVariant } from '../variants';
import { renderBrief } from './brief';
import { h } from './dom';
import { homeHooks, registerHomeSection, registerMode } from './homeView';
import { go } from './router';
import { registerNav } from './topbar';
import type { WorkArea } from './work';

const templates = new Map(loadTicketTemplates().map((tk) => [tk.id, tk]));
let ctx: { work: WorkArea; rerender(): void } | undefined;
let runSeq = 0;

/** Called once from main.ts, right after mountWork(). */
export function initModes(c: { work: WorkArea; rerender(): void }): void {
  ctx = c;
}

/** The clicked button is gone after a redraw: focus the new left pane's title (showRoute does the same after a route change). */
const focusTitle = (): void => document.getElementById('brief-title')?.focus();

/** Every mode switch rebuilds the editor (`force`): a practice item may share the story ticket's id. */
function enter(mode: Mode): void {
  session.mode = mode;
  ctx?.rerender();
  ctx?.work.setTicket(activeTicket(), activeStep(), true);
  go('play');
  focusTitle();
}

export function startPractice(items: PracticeItem[]): boolean {
  const usable = items.filter((i) => templates.has(i.ticketId));
  if (usable.length === 0) return false;
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
  return true;
}

export const startSandbox = (): void => enter({ kind: 'sandbox' });
export const backToStory = (): void => enter({ kind: 'story' });

/** Entry 1: today's due skills (D2). */
export function startToday(): boolean {
  const d = done();
  return startPractice(todayQueue(app.save.review, learnedSkills(app.tickets, d), [...templates.values()], d, today(), Math.random));
}

/** Entry 2: one skill (Home skill topics). */
export function startSkill(skill: string): boolean {
  const item = pickForSkill(skill, [...templates.values()], done(), Math.random);
  return item ? startPractice([item]) : false;
}

/** Entry 3: redo a finished task, another variant when it has one. Never a promotion review (L10). */
export function startRetry(ticketId: string): boolean {
  const tpl = templates.get(ticketId);
  return !!tpl && tpl.beat !== 'boss' && done().has(ticketId) && startPractice([retryItem(tpl, Math.random)]);
}

/** Nav "Practice" (P6): today's due skills, else one learned skill at random; false when nothing is learned yet. */
function startAny(): boolean {
  if (startToday()) return true;
  const learned = [...learnedSkills(app.tickets, done())];
  return learned.length > 0 && startSkill(learned[Math.floor(Math.random() * learned.length)]);
}

export function onPracticeWrong(): void {
  if (session.mode.kind === 'practice') session.mode.run.wrong++;
}

/** Correct submit in Practice: 0 XP, no completion animation; moves the Leitner boxes of the item's skills. */
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
  ctx?.work.setTicket(activeTicket(), 0, true);
  focusTitle();
}

const TITLE = { id: 'brief-title', tabindex: '-1', class: 'm-0 text-lg font-bold' };

function sandboxPane(host: HTMLElement): void {
  host.replaceChildren(
    h('h2', TITLE, t('sbx.title')),
    h('p', { class: 'text-[15px] leading-relaxed' }, t('sbx.intro')),
    h('div', { class: 'actions' }, h('button', { type: 'button', onclick: () => backToStory() }, t('prac.exit'))),
  );
}

function practicePane(host: HTMLElement, run: PracticeRun): void {
  const finished = run.index >= run.items.length;
  const status = finished ? t('prac.done', { ok: run.passed, n: run.items.length }) : t('prac.banner', { i: run.index + 1, n: run.items.length });
  const banner = h('div', { class: 'mb-3 rounded-xl bg-accent-soft p-3 ring-1 ring-accent', role: 'status' },
    finished ? h('h2', TITLE, status) : h('p', { class: 'm-0 font-semibold' }, status),
    run.result ? h('p', { class: 'mt-1 mb-0' }, t(run.result === 'ok' ? 'prac.ok' : 'prac.weak')) : null,
    h('div', { class: 'actions mb-0' },
      run.result && !finished ? h('button', { type: 'button', class: 'primary', onclick: () => nextItem() }, t('prac.next')) : null,
      h('button', { type: 'button', onclick: () => backToStory() }, t('prac.exit'))));
  const body = h('div');
  if (!finished) renderBrief(body, run.tickets[run.index], 0);
  host.replaceChildren(banner, body);
}

function storyPane(host: HTMLElement): void {
  const tk = selected();
  renderBrief(host, tk, app.stepIndex);
  if (done().has(tk.id) && tk.beat !== 'boss') {
    host.append(h('div', { class: 'actions' }, h('button', { type: 'button', onclick: () => startRetry(tk.id) }, t('prac.retry'))));
  }
}

/** Left pane for the current mode; main.ts rerender() calls this instead of renderBrief(). */
export function renderLeft(host: HTMLElement): void {
  const m = session.mode;
  if (m.kind === 'sandbox') sandboxPane(host);
  else if (m.kind === 'practice') practicePane(host, m.run);
  else storyPane(host);
}

/** Home "Review" card (D2 entry 1). Always shown, so nav "Practice" on a fresh save lands on its explanation (P6). */
function reviewCard(m: HomeModel): HTMLElement {
  const due = dueToday().length;
  const intro = m.learned === 0 ? t('prac.locked') : t(due ? 'prac.dueIntro' : 'prac.noneDue', { n: due });
  return h('section', { class: cx(CARD, 'flex flex-wrap items-center gap-4 p-5'), 'aria-labelledby': 'review-title' },
    h('div', { class: 'min-w-0 flex-1' },
      h('h2', { id: 'review-title', class: 'm-0 text-lg font-bold' }, t('prac.section')),
      h('p', { class: 'mt-1 mb-0 text-[15px] text-muted' }, intro)),
    due ? h('button', { type: 'button', class: cx(BTN_GO, 'px-4 py-2'), onclick: () => startToday() }, t('prac.today', { n: due })) : null);
}

// Same id replaces topbar.ts's 'play' entry: "Workspace" is current only in story mode.
registerNav({
  id: 'play', order: 20, label: 'nav.play', href: hashOf('play'),
  current: (r) => r === 'play' && isStory(),
  onclick: () => (isStory() ? go('play') : backToStory()),
});
registerNav({
  id: 'practice', order: 30, label: 'nav.practice', href: hashOf('play'),
  current: (r) => r === 'play' && session.mode.kind === 'practice',
  // Nothing learned yet: Home's Review card explains how practice opens (P6).
  onclick: () => (session.mode.kind === 'practice' ? go('play') : startAny() || go('home')),
});
registerNav({
  id: 'sandbox', order: 40, label: 'nav.sandbox', href: hashOf('play'),
  current: (r) => r === 'play' && session.mode.kind === 'sandbox',
  onclick: () => (session.mode.kind === 'sandbox' ? go('play') : startSandbox()),
});
registerHomeSection({ id: 'review', order: 22, span: 'full', render: reviewCard });
registerMode({
  id: 'sandbox', order: 10, icon: '🧪', tint: 'bg-orange-100 dark:bg-orange-950',
  title: 'mode.sandbox', desc: 'mode.sandboxDesc', open: () => startSandbox(),
});
homeHooks.levelOf = (skill) => app.save.review[skill]?.box ?? 1;
homeHooks.onSkill = (skill) => void startSkill(skill);
```

- [ ] **Step 3: Trang chủ "Tiếp tục" luôn về Làm việc**

`resume()` chỉ đổi route khi ticket đã được chọn. Đang ở Luyện tập/Sandbox mà bấm "Mở việc này" thì phải về Làm việc.

**Sửa `src/ui/homeView.ts`** — thay:
```ts
import { go } from './router';
```
bằng:
```ts
import { isStory } from '../session';
import { go } from './router';
```

**Sửa `src/ui/homeView.ts`** — thay:
```ts
  if (app.selectedId === id) go('play');
```
bằng:
```ts
  if (app.selectedId === id && isStory()) go('play'); // from Practice/Sandbox, selectTicket() switches back to work
```

- [ ] **Step 4: Sửa `src/main.ts`**

**Sửa `src/main.ts`** — thay:
```ts
import { renderBrief } from './ui/brief';
```
bằng:
```ts
import { initModes, onPracticeSolved, onPracticeWrong, renderLeft } from './ui/modes';
```

**Sửa `src/main.ts`** — thay:
```ts
  onSolved: (t) => complete(t),
```
bằng:
```ts
  onSolved: (t) => (session.mode.kind === 'practice' ? onPracticeSolved() : complete(t)), // practice: no complete(), no animation
  onWrong: onPracticeWrong,
```

**Sửa `src/main.ts`** — thay:
```ts
  onRun: () => rerender(),
});
```
bằng:
```ts
  onRun: () => rerender(),
});
initModes({ work, rerender });
```

**Sửa `src/main.ts`** — thay:
```ts
  renderBrief(byId('ticket'), selected(), app.stepIndex);
```
bằng:
```ts
  renderLeft(byId('ticket'));
```

- [ ] **Step 5: Kiểm kiểu và test**

Run: `npx tsc --noEmit && npm test`
Expected: `tsc` không lỗi (kể cả `en.ts` đủ khóa); tất cả test PASS (gồm `tests/i18n.test.ts`: không chữ "boss", placeholder khớp).

- [ ] **Step 6: Kiểm tay**

Run: `npm run dev`.
1. Save trống:
   - Trang chủ có card "Ôn tập" ghi "Xong việc đầu tiên thì…", không có nút;
   - nav có Trang chủ · Làm việc · Luyện tập · Sandbox; bấm "Luyện tập" thì về Trang chủ;
   - "Chế độ khác" có card Sandbox.
2. Xong `ch1-01` → `ch1-03`:
   - card "Ôn tập · 0 XP" ghi "Hôm nay chưa có kỹ năng nào đến hạn ôn…", không có nút;
   - ở "Chủ đề kỹ năng", kỹ năng đã học là nút bấm được, mức nhớ 1/5;
   - nav "Luyện tập" vào một bài luyện một kỹ năng đã học, focus ở tiêu đề bài.
3. Mở lại `ch1-03`. Dưới Recap có "Luyện lại việc này (0 XP)"; bấm vào thì:
   - khung trái có dải "Luyện tập · bài 1/1 · 0 XP";
   - đề ghi một tháng **khác** 10/2026;
   - editor trống, nút Nộp hiện, gợi ý ghi "Gợi ý 1/3" (không có XP).

   Nộp câu của tháng 10 → báo sai. Sửa đúng tháng → dải báo "Đúng, nhưng có lần nộp sai…". Kiểm:
   - XP trên topbar không đổi, không có hoạt cảnh;
   - `cargo-query-save` có `review.order_by.box = 1` và `practice.failed = 1`;
   - `hintsUsed`, `graded["ch1-03#0"]` và lịch sử query của `ch1-03` không đổi.
4. "Bài tiếp →" → "Xong lượt luyện: 0/1 bài đạt." → "Về Làm việc" → đúng ticket và draft Làm việc trước đó; nav "Làm việc" sáng.
5. Sửa `due` của một kỹ năng trong Local Storage thành hôm qua, tải lại. Card "Ôn tập" có nút "Ôn hôm nay (n)"; nav "Luyện tập" vào thẳng lượt ôn, tối đa 5 bài. Đúng không gợi ý → `box` tăng, `due` giãn theo `[1, 2, 4, 8, 16]`.
6. Bấm một kỹ năng đã học ở Trang chủ → vào Luyện tập một bài có kỹ năng đó.
7. Sandbox (nav hoặc card):
   - không có nút Nộp; `SELECT count(*) FROM shipments` → tab Kết quả có số;
   - `UPDATE ports SET name = 'x'` rồi `SELECT count(*) FROM ports WHERE name = 'x'` → 0;
   - tab Cột chỉ có bảng đã mở;
   - tải lại, vào lại Sandbox → SQL còn nguyên;
   - không có lịch sử query;
   - "Về Làm việc" → editor trở lại draft của ticket.
8. Đang ở Luyện tập/Sandbox, về Trang chủ bấm "Mở việc này" → về Làm việc đúng ticket.
9. Đổi VI|EN trong Luyện tập/Sandbox: chữ đổi, editor giữ nội dung.

- [ ] **Step 7: Commit**

```bash
git add src/ui/modes.ts src/ui/homeView.ts src/main.ts src/i18n/vi.ts src/i18n/en.ts tests/i18n.test.ts
git commit -m "feat: practice (review today, skill, redo task) and sandbox modes via nav and Home"
```

---

### Task 8: Mục tiêu chương, chip Dạy/Cần, tổng kết chương, nút "Ôn: N", phản hồi sai có giọng người

**Files:**
- Create: `src/ui/chapterView.ts`
- Modify: `src/ui/modes.ts`, `src/ui/feedback.ts`, `src/ui/work.ts`, `src/main.ts`, `index.html`, `src/i18n/vi.ts`, `src/i18n/en.ts`

**Interfaces:**
- Consumes: `CHAPTERS`, `chapterTitle`, `SKILLS`; `learnedSkills`; `outcomeDone`, `chapterSummary` (Task 4); `dueToday`, `startToday`, `startRetry` (Task 6–7)
- Produces:
  - `skillLabel(id)`: nhãn kỹ năng theo ngôn ngữ đang chọn.
  - `goalCard(chapter)`: thẻ "Mục tiêu chương"; outcome có ✓ khi đủ kỹ năng. Hiện ở ticket `teach` (Làm việc).
  - `skillChips(tk)`: chip "Dạy: …" (màu chương) và "Cần: …", lấy từ `grants`/`requires`.
  - `wrapUp(chapter, onQuick?)`: khối "Tổng kết chương" dưới Recap của đánh giá thăng tiến (P2). Gồm:
    - bước nghề mới (`career`);
    - outcome;
    - kỹ năng;
    - XP + số gợi ý (tính lại);
    - bảng mới ở chương sau;
    - nút "Ôn nhanh 1 việc".

    Khối không có hiệu ứng: hoạt cảnh `promotion` là màn ăn mừng duy nhất (L32).
  - `renderReviewButton(btn)` (trong `modes.ts`): `#review-btn` "Ôn: N", chỉ hiện khi N > 0 (P3).
  - `voiceKey(r)` (trong `feedback.ts`): câu của người gửi khi Nộp sai. `work.ts` vẽ câu đó dưới khối kỹ thuật, kèm `avatar(tk.from)` (P11).
  - Khóa i18n: `goal.title`, `goal.intro`, `chip.teaches`, `chip.needs`, `sum.title`, `sum.career`, `sum.skills`, `sum.stats`, `sum.tables`, `sum.last`, `sum.quick`, `prog.due`, `prog.dueTitle`, `voice.error`, `voice.columns`, `voice.order`, `voice.missing`, `voice.extra`, `voice.values`.

Mọi con số và trạng thái tính lại từ save + nội dung mỗi lần render (A4).

- [ ] **Step 1: Khóa i18n**

**Sửa `src/i18n/vi.ts`** — thay:
```ts
export const vi = {
```
bằng:
```ts
export const vi = {
  'goal.title': 'Mục tiêu chương {n}: {title}',
  'goal.intro': 'Sau chương này bạn có thể:',
  'chip.teaches': 'Dạy: {list}',
  'chip.needs': 'Cần: {list}',
  'sum.title': 'Tổng kết chương {n}: {title}',
  'sum.career': 'Bước nghề mới: {career}',
  'sum.skills': 'Kỹ năng đã học trong chương: {list}',
  'sum.stats': '{xp} XP · {hints} gợi ý đã dùng',
  'sum.tables': 'Bảng mới ở chương sau: {list}',
  'sum.last': 'Bạn đã xong mọi chương hiện có. Vào Luyện tập để ôn lại.',
  'sum.quick': 'Ôn nhanh 1 việc của chương',
  'prog.due': 'Ôn: {n}',
  'prog.dueTitle': 'Ôn các kỹ năng đến hạn hôm nay (0 XP)',
  'voice.error': 'Câu lệnh chưa chạy được, bạn xem dòng báo lỗi giúp mình nhé.',
  'voice.columns': 'Mình cần đúng các cột như thẻ Kết quả mong đợi, bạn đối chiếu lại nhé.',
  'voice.order': 'Số liệu đúng rồi, chỉ là thứ tự chưa đúng như mình dặn.',
  'voice.missing': 'Hình như còn thiếu vài dòng, bạn xem lại điều kiện lọc nhé?',
  'voice.extra': 'Hình như có vài dòng mình không cần, bạn xem lại điều kiện lọc nhé?',
  'voice.values': 'Số dòng thì đủ nhưng vài giá trị chưa khớp, bạn kiểm lại cách tính nhé.',
```

**Sửa `src/i18n/en.ts`** — thay:
```ts
export const en: Record<Key, Msg> = {
```
bằng:
```ts
export const en: Record<Key, Msg> = {
  'goal.title': 'Chapter {n} goals: {title}',
  'goal.intro': 'After this chapter you can:',
  'chip.teaches': 'Teaches: {list}',
  'chip.needs': 'Needs: {list}',
  'sum.title': 'Chapter {n} wrap-up: {title}',
  'sum.career': 'New career step: {career}',
  'sum.skills': 'Skills learned in this chapter: {list}',
  'sum.stats': (p) => `${p.xp} XP · ${p.hints} hint${Number(p.hints) === 1 ? '' : 's'} used`,
  'sum.tables': 'New tables next chapter: {list}',
  'sum.last': "You've finished every chapter available. Use Practice to review.",
  'sum.quick': 'Quick review: 1 task from this chapter',
  'prog.due': 'Review: {n}',
  'prog.dueTitle': 'Review the skills due today (0 XP)',
  'voice.error': "The query didn't run. Could you check the error line for me?",
  'voice.columns': 'I need exactly the columns on the Expected result card. Could you compare them?',
  'voice.order': 'The figures are right, just not in the order I asked for.',
  'voice.missing': 'Looks like a few rows are missing. Could you check the filters?',
  'voice.extra': "Looks like there are rows I don't need. Could you check the filters?",
  'voice.values': 'The row count is right but some values are off. Could you check the calculation?',
```

- [ ] **Step 2: Viết `src/ui/chapterView.ts`**

**Tạo `src/ui/chapterView.ts`:**
```ts
import { learnedSkills } from '../home';
import { getLang, t } from '../i18n';
import { chapterSummary, outcomeDone } from '../overview';
import { CHAPTERS, chapterTitle, SKILLS } from '../progress';
import { app, done } from '../state';
import { chapterColor, cx, PILL } from '../theme';
import type { Ticket } from '../tickets';
import { h } from './dom';

export const skillLabel = (id: string): string => SKILLS.find((s) => s.id === id)?.label[getLang()] ?? id;

/** "After this chapter you can…" (chapters.yml outcomes), ticked from the skills learned so far. */
function outcomeList(chapter: number): HTMLElement | null {
  const c = CHAPTERS.find((x) => x.chapter === chapter);
  if (!c?.outcomes.length) return null;
  const d = done();
  const learned = learnedSkills(app.tickets, d);
  const lang = getLang();
  return h('ul', { class: 'my-1 list-none space-y-1 p-0' }, ...c.outcomes.map((o) => {
    const ok = outcomeDone(o.skills, chapter, app.tickets, d, learned);
    return h('li', { class: 'flex gap-2' }, h('span', { class: ok ? 'good' : 'text-muted', 'aria-hidden': 'true' }, ok ? '✓' : '○'), o[lang]);
  }));
}

/** "Chapter goals" card on the chapter's teach ticket. */
export function goalCard(chapter: number): HTMLElement | null {
  const list = outcomeList(chapter);
  if (!list) return null;
  return h('section', { class: 'my-3 rounded-xl bg-panel p-3 ring-1 ring-line', 'aria-labelledby': 'goal-title' },
    h('h3', { id: 'goal-title', class: 'mt-0' }, t('goal.title', { n: chapter, title: chapterTitle(chapter, getLang()) })),
    h('p', { class: 'my-1 text-sm text-muted' }, t('goal.intro')),
    list);
}

/** "Teaches: … · Needs: …" from grants/requires; colour only on the small chips (L23). */
export function skillChips(tk: Ticket): HTMLElement | null {
  if (tk.grants.length === 0 && tk.requires.length === 0) return null;
  const list = (ids: string[]) => ids.map(skillLabel).join(', ');
  return h('p', { class: 'my-2 flex flex-wrap gap-1.5' },
    tk.grants.length ? h('span', { class: cx(PILL, chapterColor(tk.chapter).chip) }, t('chip.teaches', { list: list(tk.grants) })) : null,
    tk.requires.length ? h('span', { class: cx(PILL, 'bg-code text-ink') }, t('chip.needs', { list: list(tk.requires) })) : null);
}

/** Under the promotion review's Recap (P2). The promotion animation already celebrated: no effect here. */
export function wrapUp(chapter: number, onQuick?: () => void): HTMLElement {
  const lang = getLang();
  const s = chapterSummary(app.tickets, app.save, chapter);
  const last = !app.tickets.some((tk) => tk.chapter > chapter);
  const career = CHAPTERS.find((c) => c.chapter === chapter)?.career[lang];
  return h('section', { class: 'my-3 rounded-xl bg-panel p-4 ring-1 ring-line', 'aria-labelledby': 'wrapup-title' },
    h('h3', { id: 'wrapup-title', class: 'mt-0' }, t('sum.title', { n: chapter, title: chapterTitle(chapter, lang) })),
    career ? h('p', { class: 'font-semibold' }, t('sum.career', { career })) : null,
    outcomeList(chapter),
    s.skills.length ? h('p', {}, t('sum.skills', { list: s.skills.map(skillLabel).join(', ') })) : null,
    h('p', {}, t('sum.stats', { xp: s.xp, hints: s.hints })),
    !last && s.newTables.length ? h('p', {}, t('sum.tables', { list: s.newTables.join(', ') })) : null,
    last ? h('p', {}, t('sum.last')) : null,
    onQuick ? h('div', { class: 'actions' }, h('button', { type: 'button', onclick: onQuick }, t('sum.quick'))) : null);
}
```

- [ ] **Step 3: Gắn vào `src/ui/modes.ts`**

**Sửa `src/ui/modes.ts`** — thay:
```ts
import { renderBrief } from './brief';
```
bằng:
```ts
import { renderBrief } from './brief';
import { goalCard, skillChips, wrapUp } from './chapterView';
```

**Sửa `src/ui/modes.ts`** — thay:
```ts
  if (!finished) renderBrief(body, run.tickets[run.index], 0);
```
bằng:
```ts
  if (!finished) {
    const tk = run.tickets[run.index];
    renderBrief(body, tk, 0);
    body.querySelector('header')?.after(skillChips(tk) ?? '');
  }
```

**Sửa `src/ui/modes.ts`** — thay:
```ts
  renderBrief(host, tk, app.stepIndex);
  if (done().has(tk.id) && tk.beat !== 'boss') {
    host.append(h('div', { class: 'actions' }, h('button', { type: 'button', onclick: () => startRetry(tk.id) }, t('prac.retry'))));
  }
}
```
bằng:
```ts
  renderBrief(host, tk, app.stepIndex);
  host.querySelector('header')?.after(skillChips(tk) ?? '', (tk.beat === 'teach' && goalCard(tk.chapter)) || '');
  if (!done().has(tk.id)) return;
  if (tk.beat !== 'boss') {
    host.append(h('div', { class: 'actions' }, h('button', { type: 'button', onclick: () => startRetry(tk.id) }, t('prac.retry'))));
    return;
  }
  const d = done();
  const quick = app.tickets.filter((x) => x.chapter === tk.chapter && x.beat !== 'boss' && d.has(x.id));
  host.append(wrapUp(tk.chapter, quick.length ? () => startRetry(quick[Math.floor(Math.random() * quick.length)].id) : undefined));
}

/** Top-bar "Review: N" (P3): shown only while a learned skill is due today. */
export function renderReviewButton(btn: HTMLButtonElement): void {
  const n = dueToday().length;
  btn.hidden = n === 0;
  btn.textContent = t('prog.due', { n });
  btn.title = t('prog.dueTitle');
  btn.onclick = () => void startToday();
}
```

- [ ] **Step 4: Nút "Ôn: N" trên topbar**

**Sửa `index.html`** — thay:
```html
        <button id="inbox-btn" type="button" class="border-0 bg-black/20 text-white ring-1 ring-white/40 hover:bg-black/30" data-i18n="top.inbox">Hộp thư</button>
```
bằng:
```html
        <button id="inbox-btn" type="button" class="border-0 bg-black/20 text-white ring-1 ring-white/40 hover:bg-black/30" data-i18n="top.inbox">Hộp thư</button>
        <button id="review-btn" type="button" class="border-0 bg-black/20 text-white ring-1 ring-white/40 hover:bg-black/30" hidden></button>
```

**Sửa `src/main.ts`** — thay:
```ts
import { initModes, onPracticeSolved, onPracticeWrong, renderLeft } from './ui/modes';
```
bằng:
```ts
import { initModes, onPracticeSolved, onPracticeWrong, renderLeft, renderReviewButton } from './ui/modes';
```

**Sửa `src/main.ts`** — thay:
```ts
  renderInbox();
  if (!byId('home').hidden)
```
bằng:
```ts
  renderInbox();
  renderReviewButton(byId('review-btn') as HTMLButtonElement);
  if (!byId('home').hidden)
```

- [ ] **Step 5: Phản hồi sai "có giọng người" (product-design-v2 #9, P11)**

Khối kỹ thuật của grader giữ nguyên. Dưới khối đó, người gửi trả lời một câu trong bong bóng chat, kèm chân dung.

**Sửa `src/ui/feedback.ts`** — thay:
```ts
import { t } from '../i18n';
```
bằng:
```ts
import { t, type Key } from '../i18n';
```

**Sửa `src/ui/feedback.ts`** — thay:
```ts
export function gradeMessage(r: Exclude<GradeResult, { ok: true }>): string {
```
bằng:
```ts
/** product-design-v2 #9: the sender's one-line reaction to a wrong answer, by reason (one voice for every department, P11). */
export function voiceKey(r: Exclude<GradeResult, { ok: true }>): Key {
  if (r.reason === 'error') return 'voice.error';
  if (r.reason === 'columns') return 'voice.columns';
  if (r.reason === 'order') return 'voice.order';
  if (r.missing && !r.extra) return 'voice.missing';
  if (r.extra && !r.missing) return 'voice.extra';
  return 'voice.values';
}

export function gradeMessage(r: Exclude<GradeResult, { ok: true }>): string {
```

**Sửa `src/ui/work.ts`** — thay:
```ts
import { errorText, errorView, gradeMessage } from './feedback';
```
bằng:
```ts
import { avatar } from './avatar';
import { errorText, errorView, gradeMessage, voiceKey } from './feedback';
```

**Sửa `src/ui/work.ts`** — thay:
```ts
      const err = played?.error;
      if (fail.reason === 'error') {
        underline(err, 0);
        say('bad', () => (err !== undefined ? errorView(err) : gradeMessage(fail)));
      } else {
        if (fail.reason === 'rows' && played?.result) played.mark = fail.sample;
        say('bad', () => gradeMessage(fail));
      }
```
bằng:
```ts
      const err = played?.error;
      // The sender answers in the chat under the grader's facts (re-translated on a language switch like every message).
      const voice = (): HTMLElement => h('p', { class: 'mt-2 mb-0 flex items-start gap-2' },
        avatar(tk.from), h('span', { class: 'rounded-2xl rounded-tl-sm bg-panel px-3 py-1.5 text-ink' }, t(voiceKey(fail))));
      if (fail.reason === 'error') {
        underline(err, 0);
        say('bad', () => h('div', {}, err !== undefined ? errorView(err) : gradeMessage(fail), voice()));
      } else {
        if (fail.reason === 'rows' && played?.result) played.mark = fail.sample;
        say('bad', () => h('div', {}, gradeMessage(fail), voice()));
      }
```

- [ ] **Step 6: Kiểm kiểu và test**

Run: `npx tsc --noEmit && npm test`
Expected: `tsc` không lỗi; tất cả test PASS.

- [ ] **Step 7: Kiểm tay**

Run: `npm run dev`.
1. Save trống, `ch1-01`:
   - dưới đầu đề có chip "Dạy: …" (màu chương 1);
   - có thẻ "Mục tiêu chương 1: Tuần thử việc", các outcome đều ○;
   - topbar không có nút "Ôn".
2. Xong `ch1-01` → outcome tương ứng có ✓. `ch1-02` có chip "Dạy" và "Cần", không có thẻ mục tiêu.
3. Xong `ch1-05`:
   - hoạt cảnh `promotion` chạy trong dock góc dưới phải, không bị che;
   - dưới Recap có khối "Tổng kết chương 1: Tuần thử việc" với "Bước nghề mới: …", outcome đều ✓, kỹ năng chương 1, XP + gợi ý khớp tay, "Bảng mới ở chương sau: …";
   - "Ôn nhanh 1 việc của chương" vào Luyện tập một việc ch1 (không phải đánh giá).
4. Sửa `due` một kỹ năng thành hôm qua, tải lại. Topbar có "Ôn: 1" (chữ trắng trên nền tối, đủ tương phản); bấm vào → lượt ôn.
5. Nộp sai ở `ch1-02` (bỏ điều kiện sân bay):
   - khối đỏ vẫn có "Thừa n dòng";
   - bên dưới là chân dung người gửi và câu "Hình như có vài dòng mình không cần…";
   - lỗi cú pháp → câu "Câu lệnh chưa chạy được…";
   - đổi EN → câu dịch theo.
6. EN: chip "Teaches/Needs", "Chapter 1 wrap-up", "Review: 1"; không chuỗi nào dính tiếng Việt, không chữ "boss".
7. Màn 375px: topbar xuống dòng gọn, không cuộn ngang. Tab đi qua được nút Ôn và nút trong khối tổng kết.

- [ ] **Step 8: Commit**

```bash
git add src/ui/chapterView.ts src/ui/modes.ts src/ui/feedback.ts src/ui/work.ts src/main.ts index.html src/i18n/vi.ts src/i18n/en.ts
git commit -m "feat: chapter goals, teaches/needs chips, chapter wrap-up, review button, wrong answers in the sender's voice"
```

---

### Task 9: Sổ tay (thẻ kỹ năng + thuật ngữ, dialog không modal)

**Files:**
- Create: `src/ui/notebook.ts`
- Modify: `src/main.ts`, `index.html`, `src/i18n/vi.ts`, `src/i18n/en.ts`

**Interfaces:**
- Consumes: `SKILLS`; `GLOSSARY`, `matches` (Task 5); `learnedSkills`; `grantedBy` (Task 4); `registerMode`
- Produces:
  - `toggleNotebook(dialog)`:
    - mở bằng `show()` (không modal, vừa đọc vừa gõ editor); bấm lần nữa thì đóng;
    - có nút Đóng, và Esc tự xử lý vì dialog không modal không tự đóng bằng Esc ở mọi trình duyệt.
  - Hai mục, một ô lọc chung không phân biệt dấu:
    - **Thẻ kỹ năng**: khóa đến khi ticket dạy nó đã xong; lúc khóa chỉ hiện tên + "Mở sau chX-YY"; lúc mở hiện tên, cú pháp, Khi nào, Bẫy;
    - **Thuật ngữ**: không khóa; hiện `term`, nghĩa theo ngôn ngữ đang chọn, nghĩa ngôn ngữ còn lại, cột liên quan.
  - Card chế độ `notebook` (order 30) trên Trang chủ.
  - Khóa i18n: `nb.open`, `nb.title`, `nb.filter`, `nb.cards`, `nb.terms`, `nb.when`, `nb.trap`, `nb.columns`, `nb.empty`, `nb.unlockAt`, `mode.notebook`, `mode.notebookDesc`.

- [ ] **Step 1: Khóa i18n**

**Sửa `src/i18n/vi.ts`** — thay:
```ts
export const vi = {
```
bằng:
```ts
export const vi = {
  'nb.open': 'Sổ tay',
  'nb.title': 'Sổ tay SQL & nghiệp vụ',
  'nb.filter': 'Lọc thẻ và thuật ngữ',
  'nb.cards': 'Thẻ kỹ năng',
  'nb.terms': 'Thuật ngữ',
  'nb.when': 'Khi nào:',
  'nb.trap': 'Bẫy:',
  'nb.columns': 'Cột: {list}',
  'nb.empty': 'Không có mục khớp "{q}".',
  'nb.unlockAt': 'Mở sau việc {id}',
  'mode.notebook': 'Sổ tay',
  'mode.notebookDesc': 'Thẻ kỹ năng SQL và thuật ngữ freight, mở cạnh editor.',
```

**Sửa `src/i18n/en.ts`** — thay:
```ts
export const en: Record<Key, Msg> = {
```
bằng:
```ts
export const en: Record<Key, Msg> = {
  'nb.open': 'Notebook',
  'nb.title': 'SQL & freight notebook',
  'nb.filter': 'Filter cards and terms',
  'nb.cards': 'Skill cards',
  'nb.terms': 'Terms',
  'nb.when': 'When:',
  'nb.trap': 'Trap:',
  'nb.columns': 'Columns: {list}',
  'nb.empty': 'Nothing matches "{q}".',
  'nb.unlockAt': 'Unlocks after task {id}',
  'mode.notebook': 'Notebook',
  'mode.notebookDesc': 'SQL skill cards and freight terms, open beside the editor.',
```

- [ ] **Step 2: Viết `src/ui/notebook.ts`**

**Tạo `src/ui/notebook.ts`:**
```ts
import { GLOSSARY, matches } from '../glossary';
import { learnedSkills } from '../home';
import { getLang, t } from '../i18n';
import { grantedBy } from '../overview';
import { SKILLS } from '../progress';
import { app, done } from '../state';
import type { Lang } from '../tickets';
import { byId, h, nodes } from './dom';
import { registerMode } from './homeView';

const ITEM = 'border-b border-line py-2';

/** Non-modal (show(), not showModal()): the player keeps typing in the editor while it is open. */
export function toggleNotebook(dialog: HTMLDialogElement): void {
  if (dialog.open) {
    dialog.close();
    return;
  }
  const lang = getLang();
  const other: Lang = lang === 'vi' ? 'en' : 'vi';
  const learned = learnedSkills(app.tickets, done());
  const input = h('input', {
    type: 'search', placeholder: t('nb.filter'), 'aria-label': t('nb.filter'),
    class: 'w-full rounded-lg bg-panel px-2 py-1.5 ring-1 ring-line',
  });
  const list = h('div', {});

  const draw = (): void => {
    const q = input.value;
    const cards = SKILLS.filter((s) => matches(q, s.id, s.label.vi, s.label.en));
    const terms = GLOSSARY.filter((g) => matches(q, g.term, g.vi, g.en, ...g.columns));
    list.replaceChildren(...nodes(
      h('h3', {}, t('nb.cards')),
      ...cards.map((s) =>
        learned.has(s.id)
          ? h('article', { class: ITEM },
              h('h4', { class: 'm-0' }, s.label[lang]),
              h('pre', { class: 'sql my-1' }, s.syntax),
              h('p', { class: 'my-0.5 text-sm' }, h('b', {}, t('nb.when')), ' ', s.when[lang]),
              h('p', { class: 'my-0.5 text-sm' }, h('b', {}, t('nb.trap')), ' ', s.trap[lang]))
          : h('article', { class: ITEM },
              h('h4', { class: 'm-0 text-muted' }, s.label[lang]),
              h('p', { class: 'my-0.5 text-sm text-muted' }, t('nb.unlockAt', { id: grantedBy(app.tickets, s.id)?.id ?? '—' })))),
      h('h3', {}, t('nb.terms')),
      ...terms.map((g) =>
        h('article', { class: ITEM },
          h('h4', { class: 'm-0' }, g.term),
          h('p', { class: 'my-0.5 text-sm' }, g[lang]),
          h('p', { class: 'my-0.5 text-sm text-muted' }, g[other]),
          g.columns.length ? h('p', { class: 'my-0.5 text-sm text-muted' }, t('nb.columns', { list: g.columns.join(', ') })) : null)),
      cards.length + terms.length === 0 ? h('p', { class: 'text-sm text-muted' }, t('nb.empty', { q })) : null,
    ));
  };

  input.addEventListener('input', draw);
  dialog.replaceChildren(
    h('div', { class: 'mb-2 flex items-center justify-between gap-2' },
      h('h2', { id: 'notebook-title', class: 'm-0' }, t('nb.title')),
      h('button', { type: 'button', onclick: () => dialog.close() }, t('app.close'))),
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

registerMode({
  id: 'notebook', order: 30, icon: '📒', tint: 'bg-fuchsia-100 dark:bg-fuchsia-950',
  title: 'mode.notebook', desc: 'mode.notebookDesc', open: () => toggleNotebook(byId('notebook-dialog') as HTMLDialogElement),
});
```

- [ ] **Step 3: Sửa `index.html`**

**Sửa `index.html`** — thay:
```html
        <button id="review-btn" type="button" class="border-0 bg-black/20 text-white ring-1 ring-white/40 hover:bg-black/30" hidden></button>
```
bằng:
```html
        <button id="review-btn" type="button" class="border-0 bg-black/20 text-white ring-1 ring-white/40 hover:bg-black/30" hidden></button>
        <button id="notebook-btn" type="button" class="border-0 bg-black/20 text-white ring-1 ring-white/40 hover:bg-black/30" data-i18n="nb.open" aria-controls="notebook-dialog">Sổ tay</button>
```

**Sửa `index.html`** — thay:
```html
    <p id="announce" class="sr-only" aria-live="polite"></p>
```
bằng:
```html
    <dialog id="notebook-dialog" class="fixed inset-auto top-16 right-4 z-30 m-0 max-h-[calc(100dvh-6rem)] w-[min(380px,calc(100vw-2rem))] overflow-auto max-sm:inset-x-4 max-sm:top-auto max-sm:bottom-4 max-sm:max-h-[60dvh] max-sm:w-auto" aria-labelledby="notebook-title"></dialog>
    <p id="announce" class="sr-only" aria-live="polite"></p>
```

- [ ] **Step 4: Sửa `src/main.ts`**

**Sửa `src/main.ts`** — thay:
```ts
import { initModes, onPracticeSolved, onPracticeWrong, renderLeft, renderReviewButton } from './ui/modes';
```
bằng:
```ts
import { initModes, onPracticeSolved, onPracticeWrong, renderLeft, renderReviewButton } from './ui/modes';
import { toggleNotebook } from './ui/notebook';
```

**Sửa `src/main.ts`** — thay:
```ts
byId('inbox-btn').addEventListener('click', () => (byId('inbox-dialog') as HTMLDialogElement).showModal());
```
bằng:
```ts
byId('inbox-btn').addEventListener('click', () => (byId('inbox-dialog') as HTMLDialogElement).showModal());
byId('notebook-btn').addEventListener('click', () => toggleNotebook(byId('notebook-dialog') as HTMLDialogElement));
```

- [ ] **Step 5: Kiểm kiểu và test**

Run: `npx tsc --noEmit && npm test`
Expected: `tsc` không lỗi; tất cả test PASS (gồm `tests/i18n.test.ts` › "mọi khóa data-i18n trong index.html có trong vi").

- [ ] **Step 6: Kiểm tay**

Run: `npm run dev`.
1. Bấm "Sổ tay" trên topbar. Dialog neo phải, dưới topbar, **không** có backdrop. Khi Sổ tay đang mở, vẫn gõ được trong editor và bấm Chạy được. Card "Sổ tay" ở "Chế độ khác" trên Trang chủ cũng mở được.
2. Save trống: mọi thẻ kỹ năng khóa ("Mở sau việc ch1-01"…), mục Thuật ngữ đủ 37 mục. Xong `ch1-01` → mở lại Sổ tay: thẻ "Chọn cột" có cú pháp, Khi nào, Bẫy.
3. Lọc:
   - gõ `luong` → còn "Green / Yellow / Red lane";
   - gõ `pod` → còn POD (khớp theo cột `shipments.pod`);
   - gõ `zzz` → "Không có mục khớp "zzz"."
4. Esc và nút "Đóng" đều đóng; bấm "Sổ tay" lần nữa khi đang mở cũng đóng. Esc khi Sổ tay mở không làm dock hoạt cảnh mất trạng thái. Màn < 640px: dialog nằm dưới, không cuộn ngang.
5. EN: nhãn và nghĩa EN lên trước, nghĩa VI ở dòng mờ. Kiểm cả nền sáng và tối: chữ đủ tương phản (`text-muted` trên `bg-panel`).

- [ ] **Step 7: Commit**

```bash
git add src/ui/notebook.ts src/main.ts index.html src/i18n/vi.ts src/i18n/en.ts
git commit -m "feat: non-modal notebook with skill cards and freight glossary"
```

---

### Task 10: Ghi chú dự án và kiểm tổng

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: `CLAUDE.md`**

**Sửa `CLAUDE.md`** — thay:
```markdown
- UI: plain TypeScript DOM via `h()`
```
bằng:
```markdown
- Product layer (Plan 1c):
  - Save v2 adds `review` (Leitner card per skill), `practice` totals, `sandboxDraft` (≤ 20,000 chars) and `bossStep` (promotion-review step reached; `resumeStep` in `src/overview.ts`). Never edit `tests/fixtures/save-v1.json` or `save-v2.json`; a v3 adds `MIGRATIONS[2]` + `save-v3.json` and ships in its own release.
  - Modes live in `src/session.ts` (`story | practice | sandbox`, inside `#/play`). `work.setTicket(undefined, 0)` is Sandbox: no Submit, no history, still `runSandboxed`. Outside story mode `work.ts` writes neither history nor `save.graded`.
  - Practice (`src/practice.ts`, `src/ui/modes.ts`): 0 XP, drafts not saved, hints never touch `save.hintsUsed`, promotion reviews excluded (L10), no `complete()` and no completion animation. Leitner boxes `[1, 2, 4, 8, 16]` days on the machine's real local date (`localDay`), never the in-game date.
  - Entries: nav (`registerNav` practice/sandbox; `play` is current only in story mode), the Home `review` section, `homeHooks.levelOf` (box) / `homeHooks.onSkill`, the top-bar `#review-btn` (shown only when a skill is due) and "Practise this task again" under a Recap. Sandbox and Notebook are `registerMode` cards.
  - Variants: frontmatter `variants` + `{{x}}` templates (values ASCII, `VARIANT_VALUE_RE`; use a separate key such as `month_en` for EN prose). Story plays `variants[0]` (`loadTickets()`); Practice reads `loadTicketTemplates()`. `tests/variants.test.ts` checks every variant runs, differs, and leaves no variant-0 value behind.
  - Chapter goals, teaches/needs chips and the chapter wrap-up (`src/ui/chapterView.ts`) are recomputed from the save; the wrap-up sits under the promotion review's Recap (the `promotion` animation is the celebration, L32).
  - Glossary: `content/glossary.yml` `{ term, vi, en, columns }`; `columns` must exist in the DB (`tests/glossary.test.ts`). The notebook (`src/ui/notebook.ts`) is a non-modal `<dialog>`.
- UI: plain TypeScript DOM via `h()`
```

- [ ] **Step 2: Chạy toàn bộ và build**

Run:
```bash
npx tsc --noEmit
npm test
npm run build
grep -rnE "\.innerHTML\s*=|insertAdjacentHTML" src/ui/modes.ts src/ui/chapterView.ts src/ui/notebook.ts; echo "exit=$?"
grep -rnE "text-xs|text-\[1[0-3]px\]" src/ui/modes.ts src/ui/chapterView.ts src/ui/notebook.ts; echo "exit=$?"
```
Expected:
- `tsc` không lỗi;
- tất cả test PASS;
- build xong;
- hai lệnh grep đều in `exit=1`: không dùng `innerHTML`, không có chữ < 14px (L23).

- [ ] **Step 3: Kiểm tay tổng (save cũ → mới), trên Edge, sáng và tối**

1. DevTools: đặt `cargo-query-save` = nội dung `tests/fixtures/save-v1.json`, rồi tải lại. Kiểm:
   - không có cảnh báo;
   - tiến độ `ch1-01`, `ch1-02` còn;
   - Local Storage có thêm key `cargo-query-save.v1` chứa nguyên bản v1;
   - `cargo-query-save` giờ có `"version":2`.
2. Topbar hiện "Ôn: 2": `select` và `where` đã học từ v1 nhưng chưa có thẻ, nên đến hạn hôm nay. Bấm → lượt ôn 2 bài. Card "Ôn tập" trên Trang chủ có nút "Ôn hôm nay (2)".
3. Xuất tiến độ → file JSON có `review`, `practice`, `sandboxDraft`, `bossStep`, `graded`. Nhập lại file đó → mọi thứ như trước.
4. Chạy lại checklist Edge của Plan 1d Task 19 Step 4, mục "Luồng chơi" và "Bàn phím và trợ năng". Kết quả phải y như trước, có thêm:
   - nav Luyện tập/Sandbox;
   - không chữ "boss"/"sự cố" ở mọi màn mới (Luyện tập, Sandbox, Tổng kết, Sổ tay), cả VI và EN.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document the product layer (save v2, modes, practice, notebook)"
```

---

### Task 11: Nút "Sao chép thông tin chẩn đoán" (L8)

> **ĐÃ THAY bằng Plan Deploy Task 7 (L40) — không chạy task này.**

**Tiền đề:** Plan Deploy Task 1 (`__BUILD__`, `src/env.d.ts`) và Task 3 (`src/diagnostics.ts`: `buildDiagnostics`, `diagnosticsText`, `DiagnosticKind`) đã commit. Kiểm:
```bash
grep -c "export function buildDiagnostics\|export function diagnosticsText\|export type DiagnosticKind" src/diagnostics.ts
grep -c "__BUILD__" src/env.d.ts
```
Expected: `3`, `1`. Nếu chưa có: chạy Plan Deploy Task 1 + 3 trước, hoặc để task này lại và báo người điều phối. Không tự viết `diagnostics.ts`.

**Cảnh báo khi chạy Plan Deploy Task 1:** bước đó ghi đè **cả** `vite.config.ts` bằng một bản viết trước Plan 1d, không có `plugins: [tailwindcss()]` và `import tailwindcss from '@tailwindcss/vite'`. Phải giữ hai dòng đó (L7: code trên đĩa thắng plan) và chỉ thêm `define: { __BUILD__: … }`. Nếu không, `npm run build` ra trang không có CSS.

**Files:**
- Modify: `src/db/client.ts`, `src/state.ts`, `src/ui/topbar.ts`, `src/main.ts`, `src/i18n/vi.ts`, `src/i18n/en.ts`

**Interfaces:**
- Produces:
  - `DbClient.onTimeout?: (e: QueryTimeoutError) => void`: gọi khi một query bị dừng vì quá giờ, trước khi khởi động lại worker.
  - `app.problem?: { kind: DiagnosticKind; error?: unknown }`: sự cố gần nhất. Lỗi SQL của người chơi **không** tính.
  - `actions.copyDiagnostics()`.
  - Nút trong `#db-status`, chỉ hiện khi `app.problem` có giá trị. Cách gán `kind` theo P10:

    | Sự kiện | `kind` |
    |---|---|
    | DB `failed` trước lần `ready` đầu | `db-init-failed` |
    | DB `failed` sau lần `ready` đầu | `worker-crash` |
    | `QueryTimeoutError` | `db-timeout` |
    | `vite:preloadError` | `chunk-load-failed` |
    | `window` `error` / `unhandledrejection`, trừ lỗi của query (`SqlError`, `QueryTimeoutError`, `DbRestartError`, `WorkerTaskError`) | `js-error` |

  - Payload theo spec nút của Plan Deploy Task 3:
    - `timings` = `db.timings` + `readyMs` (`performance` measure `db:time-to-ready`);
    - không có `fetch`;
    - clipboard bị chặn thì nội dung hiện trong banner (P10).
  - Khóa i18n: `diag.copy`, `diag.copied`, `diag.manual`.

- [ ] **Step 1: Khóa i18n**

**Sửa `src/i18n/vi.ts`** — thay:
```ts
export const vi = {
```
bằng:
```ts
export const vi = {
  'diag.copy': 'Sao chép thông tin chẩn đoán',
  'diag.copied': 'Đã chép thông tin chẩn đoán. Dán vào báo lỗi giúp mình nhé (không có SQL hay dữ liệu của bạn trong đó).',
  'diag.manual': 'Không chép tự động được. Hãy tự chép đoạn sau vào báo lỗi: {text}',
```

**Sửa `src/i18n/en.ts`** — thay:
```ts
export const en: Record<Key, Msg> = {
```
bằng:
```ts
export const en: Record<Key, Msg> = {
  'diag.copy': 'Copy diagnostics',
  'diag.copied': 'Diagnostics copied. Please paste them into your bug report (they contain no SQL and none of your data).',
  'diag.manual': 'Could not copy automatically. Please copy this into your bug report: {text}',
```

- [ ] **Step 2: Hook quá giờ trong `src/db/client.ts`**

**Sửa `src/db/client.ts`** — thay:
```ts
  onProgress?: (p: LoadProgress) => void;
```
bằng:
```ts
  onProgress?: (p: LoadProgress) => void;
  /** A query ran past its budget; called before the worker restarts (the diagnostics button). */
  onTimeout?: (e: QueryTimeoutError) => void;
```

**Sửa `src/db/client.ts`** — thay:
```ts
      this.inFlight = undefined;
      job.reject(new QueryTimeoutError(job.timeoutMs));
      this.restart();
```
bằng:
```ts
      this.inFlight = undefined;
      const err = new QueryTimeoutError(job.timeoutMs);
      job.reject(err);
      this.onTimeout?.(err);
      this.restart();
```

- [ ] **Step 3: Trạng thái và nút**

**Sửa `src/state.ts`** — thay:
```ts
import type { DbStatus } from './db/client';
```
bằng:
```ts
import type { DbStatus } from './db/client';
import type { DiagnosticKind } from './diagnostics';
```

**Sửa `src/state.ts`** — thay:
```ts
  notice: undefined as Notice | undefined,
```
bằng:
```ts
  notice: undefined as Notice | undefined,
  /** Last app/DB fault (never a player's SQL error): shows the "Copy diagnostics" button. */
  problem: undefined as { kind: DiagnosticKind; error?: unknown } | undefined,
```

**Sửa `src/state.ts`** — thay:
```ts
  retryDb(): void {},
};
```
bằng:
```ts
  retryDb(): void {},
  copyDiagnostics(): void {},
};
```

**Sửa `src/ui/topbar.ts`** — thay:
```ts
  byId('db-status').replaceChildren(dbStatusView());
```
bằng:
```ts
  byId('db-status').replaceChildren(...nodes(
    dbStatusView(),
    app.problem ? h('button', { type: 'button', class: cx(TOP_BTN, 'ml-2'), onclick: () => actions.copyDiagnostics() }, t('diag.copy')) : null));
```

**Sửa `src/ui/topbar.ts`** — thay:
```ts
import { NAV_LINK, TOP_BTN } from '../theme';
```
bằng:
```ts
import { cx, NAV_LINK, TOP_BTN } from '../theme';
```

- [ ] **Step 4: Ghi sự cố và chép payload trong `src/main.ts`**

**Sửa `src/main.ts`** — thay:
```ts
import { DbClient, type DbStatus } from './db/client';
```
bằng:
```ts
import { DbClient, DbRestartError, QueryTimeoutError, WorkerTaskError, type DbStatus } from './db/client';
import { SqlError } from './db/run';
```

**Sửa `src/main.ts`** — thay:
```ts
import { loadSave, parseSave, serializeSave, type Known } from './save';
```
bằng:
```ts
import { buildDiagnostics, diagnosticsText } from './diagnostics';
import { loadSave, parseSave, serializeSave, type Known } from './save';
```

**Sửa `src/main.ts`** — thay:
```ts
function onDbStatus(s: DbStatus): void {
  app.dbStatus = s;
```
bằng:
```ts
let dbWasReady = false;
function onDbStatus(s: DbStatus): void {
  app.dbStatus = s;
  if (s === 'ready') dbWasReady = true;
  if (s === 'failed') app.problem = { kind: dbWasReady ? 'worker-crash' : 'db-init-failed' }; // P10
```

**Sửa `src/main.ts`** — thay:
```ts
app.run = (sql) => db.run(sql);
```
bằng:
```ts
app.run = (sql) => db.run(sql);
db.onTimeout = (e) => {
  app.problem = { kind: 'db-timeout', error: e };
  renderTopbar();
};
```

**Sửa `src/main.ts`** — thay:
```ts
window.addEventListener('vite:preloadError', () => {
  app.notice = { key: 'app.newVersion', reload: true };
```
bằng:
```ts
window.addEventListener('vite:preloadError', () => {
  app.problem = { kind: 'chunk-load-failed' };
  app.notice = { key: 'app.newVersion', reload: true };
```

**Sửa `src/main.ts`** — thay:
```ts
Object.assign(actions, { rerender, selectTicket, complete, retryDb: () => db.restart() });
```
bằng:
```ts
/** Allowlisted payload only (Plan Deploy Task 3): never SQL, messages, drafts or data. Nothing is sent anywhere. */
async function copyDiagnostics(): Promise<void> {
  const p = app.problem;
  if (!p) return;
  const readyMs = performance.getEntriesByName('db:time-to-ready').at(-1)?.duration;
  const text = diagnosticsText(buildDiagnostics({
    build: __BUILD__, kind: p.kind, error: p.error, timings: { ...db.timings, readyMs }, userAgent: navigator.userAgent,
  }));
  try {
    await navigator.clipboard.writeText(text);
    app.notice = { key: 'diag.copied' };
  } catch {
    app.notice = { key: 'diag.manual', params: { text } }; // shown with textContent (renderNotice)
  }
  renderTopbar();
}

/** Uncaught app errors only: query outcomes (player SQL errors, timeouts, restarts, worker task failures) are normal play. */
const fault = (error: unknown): void => {
  if (error instanceof SqlError || error instanceof QueryTimeoutError || error instanceof DbRestartError || error instanceof WorkerTaskError) return;
  app.problem = { kind: 'js-error', error };
  renderTopbar();
};
window.addEventListener('error', (e) => fault(e.error));
window.addEventListener('unhandledrejection', (e) => fault(e.reason));

Object.assign(actions, { rerender, selectTicket, complete, retryDb: () => db.restart(), copyDiagnostics: () => void copyDiagnostics() });
```

- [ ] **Step 5: Kiểm kiểu, test, build**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: `tsc` không lỗi; tất cả test PASS (gồm `tests/diagnostics.test.ts` của Plan Deploy); build xong.

- [ ] **Step 6: Kiểm tay**

1. Bình thường: không có nút chẩn đoán. Lỗi cú pháp SQL cũng không làm nút hiện.
2. `SELECT count(*) FROM generate_series(1, 100000000)` → quá giờ, nút "Sao chép thông tin chẩn đoán" hiện. Bấm → clipboard chứa JSON chỉ gồm `build`, `kind: "db-timeout"`, `errorName: "QueryTimeoutError"`, `timings`, `ua`; không có SQL.
3. DevTools > Network: chặn `pglite*.wasm`, tải lại → DB `failed` → nút hiện, `kind: "db-init-failed"`.
4. Chặn quyền clipboard → banner hiện "Không chép tự động được…" kèm JSON.

- [ ] **Step 7: Commit**

```bash
git add src/db/client.ts src/state.ts src/ui/topbar.ts src/main.ts src/i18n/vi.ts src/i18n/en.ts
git commit -m "feat: copy-diagnostics button for DB and app faults (L8)"
```
