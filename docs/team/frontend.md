# Cargo Query — Thiết kế Frontend (review vòng 1)

Người viết: FE lead · Ngày: 2026-11-16 · Phạm vi: hiển thị nội dung, tổ chức component, i18n EN/VI, SQL editor, quy trình nội dung.
Nguồn: spec `docs/superpowers/specs/2026-11-16-cargo-query-design.md`, Plan 1 (`…-plan-1-engine.md`), Plan 1b (`…-plan-1b-visualization.md`).

> **Xung đột với tài liệu hiện có:** spec §10 ghi "đa ngôn ngữ" là ngoài phạm vi, và Plan 1 Global Constraints ghi "Nội dung hiển thị tiếng Việt". User đã yêu cầu EN/VI ở vòng này, nên cần sửa cả hai: bỏ dòng ở spec §10, và đổi constraint thành "UI và nội dung song ngữ VI/EN; VI là bản gốc; tên bảng/cột và thông báo lỗi Postgres giữ tiếng Anh".
>
> **Đã đối chiếu `docs/team/product-design.md` (§2.3, §3.4, §5):** FE theo Product ở các điểm sau: key `cargo-query/prefs` = `{ lang }`; mặc định theo `navigator.language`; **không dịch tên phòng ban**; tiêu đề chương lấy từ `chapters.yml`; Sandbox lưu draft ở `save.sandboxDraft`; Product giữ quyền tăng `SAVE_VERSION` (v2). **Còn khác một điểm:** định dạng ticket EN. Product đề xuất file riêng `content/en/tickets/…`, FE đề xuất khối `# EN` trong cùng file (lý do ở §2.2). Cần user chốt một trong hai; phần còn lại của tài liệu này đúng với cả hai cách.

Nguyên tắc giữ nguyên: TypeScript thuần + `h()`/`svg()`, **không thêm framework**. Lý do: không có màn hình nào cần diff/reactivity. Mọi lần render hiện tại là `replaceChildren` theo vùng, và việc đổi ngôn ngữ chỉ cần render lại 4 vùng (xem §1.3). Nếu sau này có trên ~3 màn hình độc lập thì mới xem lại.

---

## 0. Sự thật đã kiểm bằng spike (vòng này)

Đã chạy `PGlite 0.5.16` trong Node, trong `BEGIN … ROLLBACK`:

| Query | `message` | `position` | `code` | `hint` |
|---|---|---|---|---|
| `SELECT cde FROM ports` | column "cde" does not exist | `"8"` | 42703 | Perhaps you meant … "ports.code". |
| `SELECT code FROM portz` | relation "portz" does not exist | `"18"` | 42P01 | – |
| `SELECT code FROM ports WHERE` | syntax error at end of input | `"29"` (= len+1) | 42601 | – |
| `SELECT 1; SELECT 2` | cannot insert multiple commands… | *không có* | 42601 | – |
| `SELECT 'Hà Nội' \|\| cde FROM ports` | column "cde"… | `"20"` | 42703 | … |

Kết luận:
- `position` là **chuỗi**, đếm từ 1, tính theo **ký tự** (ca có dấu tiếng Việt cho ra 20, khớp chỉ số JS 19). Tiếng Việt dạng NFC đều là ký tự BMP, nên `index = position − 1` đúng. Emoji (cặp surrogate) sẽ lệch 1, chấp nhận.
- Error class bị minify (`O`), nên nhận dạng lỗi bằng `'position' in e` hoặc `'code' in e`, không dùng `instanceof`.
- `hint` của Postgres rất có ích cho người học, vì vậy truyền nó sang UI.

---

## 1. Bản đồ module & refactor

### 1.1 Module có sau Plan 1 + 1b

| File | Trách nhiệm | Nguồn |
|---|---|---|
| `src/ui/dom.ts` | `h()`, `richText()`, `svg()`, `fmt()` | P1 T10, P1b T2 |
| `src/ui/editor.ts` | `createEditor` (CodeMirror, Mod-Enter) | P1 T10 |
| `src/ui/panel.ts` | `createPanel(host, tabs)`: tab dưới | P1 T10 |
| `src/ui/resultTable.ts` | `renderResult`, `formatCell`, `MAX_ROWS=500` | P1 T10 |
| `src/ui/feedback.ts` | `gradeMessage(GradeResult)` | P1 T10 |
| `src/ui/explainView.ts`, `flowView.ts`, `stepsView.ts`, `chartView.ts`, `erdView.ts`, `mapView.ts` | các tab trực quan + dải bản đồ | P1b T2,4,5,6,7 |
| `src/main.ts` | **mọi thứ còn lại**: state toàn cục, persist, topbar, inbox, ticket, editor, run/submit, conclusion, `buildTabs`, `planFor`, `erMetadata`, map, import/export | P1 T10 + 6 lần "Gắn vào main.ts" ở P1b |

`main.ts` sau P1b dài khoảng 550 dòng. Mỗi tính năng vòng này (ngôn ngữ, lịch sử query, practice, import data) đều sẽ chạm vào nó, trong khi BE và Product cũng đang sửa song song.

### 1.2 Refactor đề xuất (task mới, *chỉ di chuyển code, không đổi hành vi*)

Lý do cụ thể: `renderTicket()` hiện **hủy rồi tạo lại editor ở mọi lần render**. Nội dung nháp còn (vì nằm trong `save.drafts`), nhưng con trỏ, vùng chọn và undo bị mất. Muốn "đổi ngôn ngữ không mất editor" thì editor phải sống tách khỏi phần render đề bài.

```
src/state.ts        app state + persist + selectors (không DOM)
src/ui/topbar.ts    renderTopbar()
src/ui/inbox.ts     renderInbox(onPick)
src/ui/brief.ts     renderBrief(host, ticket, stepIndex)   ← khung đề trái + hints + conclusion
src/ui/work.ts      mountWork(host, deps): WorkArea        ← editor + nút + feedback + lịch sử
src/ui/tabs.ts      buildTabs(deps): Tab[]                 ← planFor, erMetadata, withPlan chuyển vào đây
src/main.ts         ~120 dòng: tạo DbClient, nối callback, renderAll/rerender, import/export
```

Hình dạng chính:

```ts
// src/state.ts
export interface LastRun { sql: string; result?: QueryResult; error?: SqlErrorInfo }
export const app = {
  tickets: [] as Ticket[],
  save: emptySave(),
  selectedId: '',
  stepIndex: 0,
  dbStatus: 'loading' as DbStatus,
  columns: {} as Record<string, { name: string; type: string }[]>,
  lastRun: undefined as LastRun | undefined,
};
export const done = (): Set<string> => new Set(app.save.completed);
export const selected = (): Ticket => app.tickets.find((t) => t.id === app.selectedId)!;
export const draftKey = (): string => `${app.selectedId}#${app.stepIndex}`;
export const unlockedTables = (): string[] => tablesUnlocked(currentChapter(app.tickets, done()));
export function persist(now?: boolean): void;   // nguyên văn từ main.ts P1 T10

// src/ui/work.ts
export interface WorkArea {
  /** Tạo lại editor CHỈ khi draftKey đổi (đổi ticket/bước). */
  setTicket(t: Ticket, stepIndex: number): void;
  /** Đổi ngôn ngữ: chỉ đổi nhãn nút/feedback, giữ nguyên EditorView. */
  relabel(): void;
  setSchema(ns: SQLNamespace): void;   // khi DB ready hoặc mở chương mới
  currentSql(): string;                // cho tabs.ts (EXPLAIN, steps, ERD highlight)
}
export function mountWork(host: HTMLElement, deps: {
  db: DbClient; panel: Panel; onSolved(t: Ticket): void; onStepSolved(): void; onConclusion(t: Ticket): void;
}): WorkArea;
```

Quy tắc render, để mọi người cùng tuân theo:
- `rerender()` (đổi ngôn ngữ, đổi DB status): `renderTopbar` + `renderInbox` + `renderBrief` + `panel.refresh()` + `work.relabel()`. **Không đụng editor.**
- `selectTicket(id)` / đúng một bước: `rerender()` + `work.setTicket()`.

**Sửa:** thêm *Plan 1c Task 1* chạy sau P1b T7. Nó đổi bước "Gắn vào `src/main.ts`" của P1b T2/T4/T5/T6/T7 thành "gắn vào `src/ui/tabs.ts`" nếu P1b chưa chạy xong. Kiểm thủ công: lặp lại checklist 11 bước của P1 T10 Step 5 và kết quả phải y hệt.

### 1.3 Panel tab

Hiện `Tab.label: string` được chụp một lần lúc `createPanel(buildTabs())`. Đổi thành khóa i18n để `refresh()` tự dịch lại:

```ts
// src/ui/panel.ts (sửa P1 T10)
export interface Tab { id: string; label: Key; render(host: HTMLElement): void | Promise<void> }
// trong show(): h('button', {...}, t(tab.label))
```

Thứ tự tab cuối cùng: `result` · `chart` · `steps` · `explain` · `flow` · `erd` · `columns`, tổng cộng 7 tab. Lịch sử query **không** thành tab (xem §3.4), vì tab là chỗ xem kết quả của query hiện tại.

---

## 2. i18n EN/VI

### 2.1 Từ điển UI: `src/i18n/`

```
src/i18n/index.ts   Lang, Key, t(), getLang(), setLang(), applyStatic()
src/i18n/vi.ts      nguồn khóa (VI là bản gốc)
src/i18n/en.ts      Record<Key, Msg> — thiếu/thừa khóa = lỗi tsc
```

```ts
// src/i18n/vi.ts
export const vi = {
  'top.inbox': 'Hộp thư',
  'top.inboxNew': 'Hộp thư ({n} mới)',
  'top.xp': '★ {n} XP',
  'top.chapter': 'Chương {n}: {title}',
  'top.export': 'Xuất tiến độ',
  'top.import': 'Nhập tiến độ',
  'db.loading': 'Đang khởi tạo database…',
  'db.ready': 'Database sẵn sàng',
  'db.retry': 'Thử lại database',
  'tab.result': 'Kết quả', 'tab.chart': 'Biểu đồ', 'tab.steps': 'Thứ tự thực thi',
  'tab.explain': 'EXPLAIN', 'tab.flow': 'Luồng dữ liệu', 'tab.erd': 'Sơ đồ ER', 'tab.columns': 'Cột',
  'work.run': '▶ Chạy (Ctrl+Enter)', 'work.runSel': '▶ Chạy vùng chọn', 'work.submit': 'Nộp',
  'work.format': 'Định dạng', 'work.history': 'Lịch sử ({n})',
  'result.rows': '{n} dòng',
  'result.truncated': '{n} dòng (hiển thị {max} dòng đầu)',
  'grade.columns': 'Kết quả cần {expected} cột, query của bạn trả về {actual} cột.',
  'err.timeout': 'Query chạy quá {s} giây nên đã bị dừng. Database đang được nạp lại.',
  'err.multi': 'Mỗi lần chỉ chạy được một câu lệnh. Bôi đen câu muốn chạy rồi bấm Chạy.',
  'sqlstate.42703': 'Cột không tồn tại — kiểm tra tên cột ở tab Cột.',
  'sqlstate.42P01': 'Bảng không tồn tại hoặc chưa mở khóa.',
  'sqlstate.42803': 'Cột trong SELECT phải nằm trong GROUP BY hoặc trong hàm gộp.',
  'sqlstate.42601': 'Lỗi cú pháp gần vị trí được gạch đỏ.',
  'sqlstate.22012': 'Chia cho 0 — dùng NULLIF(x, 0).',
  'save.corrupt': 'Không đọc được tiến độ đã lưu. Bắt đầu lại; bản cũ được giữ ở "{key}".',
  'save.newer': 'Save này từ phiên bản game mới hơn (v{v}). …',
  /* … toàn bộ chuỗi đang nằm rải trong main.ts / *View.ts */
} satisfies Record<string, Msg>;

// src/i18n/en.ts
import type { Key, Msg } from './index';
export const en: Record<Key, Msg> = {
  'result.rows': (p) => `${p.n} row${p.n === 1 ? '' : 's'}`,   // số nhiều: dùng hàm, chỉ ở EN
  /* … */
};

// src/i18n/index.ts
import { vi } from './vi';
import { en } from './en';
export type Lang = 'vi' | 'en';
export type Key = keyof typeof vi;
export type Params = Record<string, string | number>;
export type Msg = string | ((p: Params) => string);
export const PREFS_KEY = 'cargo-query/prefs';   // { lang }

let lang: Lang = initialLang();   // localStorage (try/catch) → navigator.language bắt đầu 'vi' → 'vi', còn lại 'en'
export const getLang = (): Lang => lang;
export const locale = (): string => (lang === 'vi' ? 'vi-VN' : 'en-US');
export function setLang(l: Lang): void;            // lưu PREFS_KEY (try/catch), document.documentElement.lang = l, applyStatic()
export function t(key: Key, p: Params = {}): string; // số trong p được format bằng toLocaleString(locale())
export function applyStatic(root: ParentNode = document): void; // [data-i18n] → textContent, [data-i18n-aria] → aria-label
```

**Lưu ngôn ngữ ở đâu:** dùng key `cargo-query/prefs` = `{ "lang": "vi" | "en" }` (trùng với Product §2.3), **không đưa vào `Save`**. Lý do: (1) đây là tùy chọn của thiết bị, không phải tiến độ, giống `cargo-query/map-collapsed` mà P1b T7 đã làm; (2) cho vào `Save` sẽ phải tăng `SAVE_VERSION` + viết migration + thêm fixture, đúng lúc BE/Product cũng có thể đang tăng version cho target/practice. FE không giành số version.

**Danh mục chuỗi phải chuyển vào từ điển** (ngoài `src/ui`):

| Chỗ | Sửa | Task bị sửa |
|---|---|---|
| `index.html` (`lang="vi"`, nút, `aria-label`, tiêu đề dialog) | thêm `data-i18n="top.export"` …; `main.ts` gọi `applyStatic()` lúc khởi động | P1 T10 |
| `progress.ts` `CHAPTER_TITLES` | xóa; tiêu đề chương lấy từ `chapters.yml` `{ vi, en }` của Product (Plan 1c); FE chỉ gọi `chapterTitle(n, getLang())` | P1 T5, T10 |
| `db/client.ts` "Query chạy quá…", "Database đang khởi động lại." | `QueryTimeoutError(timeoutMs)` không chứa text; thêm `class DbRestartError`; UI dịch bằng `instanceof` | P1 T2, P1b T1 |
| `save.ts` `loadSave().warning: string` và các `throw` tiếng Việt trong `parseSave` (đường Nhập tiến độ) | `warning?: { kind: 'corrupt' \| 'newer'; version?: number }`; `parseSave` ném `NewerSaveError(version)` / `InvalidSaveError` không kèm text, UI dịch bằng `instanceof`; test hiện có (`toBeTruthy`, `toThrow(NewerSaveError)`) vẫn qua | P1 T6 |
| `grader.ts` `errorMessage` | giữ message gốc Postgres (tiếng Anh, là kỹ năng thật cần đọc). Bên dưới hiện thêm `t('sqlstate.<code>')` nếu có khóa | P1 T3 |
| `ui/feedback.ts` `gradeMessage` | toàn bộ qua `t()` | P1 T10 |
| `viz/plan.ts` `nodeExplanation(type)` | `nodeExplanation(type, lang)`; bảng `NODE_HELP: Record<Lang, Record<string, string>>` để cạnh logic (dữ liệu có test) | P1b T1 |
| `viz/steps.ts` `STEP_LABELS`, `STEP_HELP` | `Record<Lang, Record<StepKey, string>>` | P1b T3 |
| `ui/dom.ts` `fmt()` | `toLocaleString(locale())` | P1b T2 |
| `mapView.ts` tooltip "— N lô", "chưa mở", "Thu gọn" | qua `t()` | P1b T7 |

Không dịch: tên bảng/cột, giá trị dữ liệu (bảng kết quả hiện thô), message lỗi gốc của Postgres, tên người và tên phòng ban (`Ops`, `Sales`…) trong ticket — theo Product §5.2.

**Nút chuyển ngôn ngữ:** đặt ở topbar `<button id="lang-btn" data-i18n-aria="top.lang">EN</button>` (nút ghi tên ngôn ngữ *sẽ chuyển sang*). Click thì `setLang(...)` rồi `rerender()` (§1.2). Editor, vùng chọn và undo giữ nguyên; tab đang mở render lại bằng ngôn ngữ mới. Tab EXPLAIN/Luồng dữ liệu không chạy lại query vì `planFor` đã cache theo SQL. Tab **Thứ tự thực thi** thì hiện *không* cache: P1b T4 gọi `db.steps(sql)` ở mỗi lần render, với ngân sách 15s. Vì vậy `tabs.ts` thêm cache cùng kiểu `planFor` (sửa P1b T4):
```ts
const stepsCache = new Map<string, Promise<StepsResult>>();   // key: SQL; xóa entry khi reject
function stepsFor(sql: string): Promise<StepsResult>;
```
Tab ERD sẽ vẽ lại Mermaid (metadata đã cache bằng `erMetadata`), tốn ~100–300ms, chấp nhận được.

**Test** `tests/i18n.test.ts` (mới):
```ts
// mọi khóa dạng string: tập placeholder {x} ở vi và en phải giống nhau
// en không chứa chuỗi y hệt vi, trừ danh sách cho phép ['tab.explain', …]
// NODE_HELP.vi và NODE_HELP.en cùng tập khóa; STEP_LABELS/STEP_HELP cũng vậy
```
Thiếu khóa thì `tsc` đã bắt được (`Record<Key, Msg>`), test chỉ bắt lỗi ngữ nghĩa.

### 2.2 Ticket song ngữ: chọn "một file, khối `# EN` ở cuối"

So sánh ba phương án:

| Phương án | Vấn đề |
|---|---|
| File cạnh nhau `ch1-01.en.md` | glob `**/*.md` nạp nó như ticket thứ hai trùng `id` → phải đổi glob/parser |
| File riêng `content/en/tickets/chN/<id>.md` (đề xuất của Product §5.3) | không đụng glob, không chép SQL — **dùng được**. Bất lợi: người dịch phải mở 2 file song song; đổi số hint/step ở VI thì file EN lệch mà không nằm trong cùng diff; cần thêm glob thứ hai + bước ghép theo `id` |
| `## vi` / `## en` | đụng `split(/^## /m)` (Hints/Solution/Step đều là `##`) → phải viết lại parser |
| **`# EN` (H1) ở cuối file** ✅ | frontmatter và SQL chỉ có **một bản**; `## ` không bị ảnh hưởng; parser cũ chạy nguyên cho phần VI; ticket chưa dịch vẫn parse được |

Ràng buộc chọn: frontmatter và SQL đáp án chỉ tồn tại đúng một lần. Cả cách của FE lẫn của Product đều thỏa ràng buộc này, nên **user chốt**. FE nghiêng về `# EN` vì mọi thay đổi VI/EN của một ticket nằm trong một diff. Nếu chọn cách của Product thì `parseSections`, `TicketText`, `textOf` và các luật L1–L5 bên dưới vẫn giữ nguyên; chỉ đổi chỗ đọc phần EN (glob `../content/en/tickets/**/*.md`, ghép theo `id`).

**Định dạng chính xác (ticket thường):**

````markdown
---
id: ch1-02
chapter: 1
title: Cảng châu Âu
title_en: European ports
from: { name: Hoàng Khánh, dept: Ops }
difficulty: 1
beat: develop
requires: [select]
grants: [where]
tables: [ports]
---
Lọc giúp mình các cảng ở `Europe`.

## Hints
1. Gợi ý một
2. Gợi ý hai
3. Gợi ý ba

## Solution
```sql
SELECT code FROM ports WHERE region = 'Europe'
```

# EN
Please list the ports in `Europe`.

## Hints
1. Hint one
2. Hint two
3. Hint three
````

**Boss:** phần EN lặp lại các heading `## Step N: <title EN>` + prompt, **không có khối ```sql**. `answer` dùng chung, chỉ dịch câu hỏi và các lựa chọn:

```yaml
conclusion:
  question: Lọc theo cột nào?
  options: [status, eta]
  answer: 0
conclusion_en:
  question: Which column do you filter on?
  options: [status, eta]
```

**Sửa parser `src/tickets.ts` (P1 T4):**

```ts
import type { Lang } from './i18n';

export interface TicketText {
  title: string;
  body: string;
  hints: string[];
  steps: { title: string; prompt: string }[];        // song song với Ticket.steps
  conclusion?: { question: string; options: string[] };
}
export interface Ticket { /* các trường hiện có = bản VI, giữ nguyên */ en?: TicketText }

/** VI lấy từ trường gốc; EN thiếu thì trả VI + fallback=true (UI hiện nhãn "chưa dịch"). */
export function textOf(t: Ticket, lang: Lang): TicketText & { fallback: boolean };

const EN_RE = /^# EN[ \t]*$/m;

// Tách vòng lặp section hiện có thành một hàm dùng cho cả hai phần:
function parseSections(part: string, fail: (m: string) => never, withSql: boolean):
  { body: string; hints: string[]; steps: { title: string; prompt: string; solution?: string }[] };

// trong parseTicket:
//   const [viPart, enPart, extra] = m[2].split(EN_RE);
//   if (extra !== undefined) fail('chỉ được một khối "# EN"');
//   phần VI: như cũ (withSql = true)
//   phần EN (nếu có): withSql = false; gặp ```sql → fail('khối # EN không được chứa ```sql — SQL dùng chung')
//   kiểm tra: fm.title_en là string; đúng 3 hints; số step bằng nhau; boss thì step EN có title;
//             boss thì conclusion_en.options.length === conclusion.options.length
```

Test `tests/tickets.test.ts`: 4 test hiện có **không đổi** (fixture không có `# EN` → `en` là `undefined`, `toMatchObject` vẫn qua). Thêm 2 test:
- `NORMAL + EN_BLOCK` → `t.en` khớp; `textOf(t,'en').fallback === false`; `textOf(t_khôngEN,'en').fallback === true`.
- Báo lỗi: hai khối `# EN`; ```sql trong EN; EN có 2 hints; boss EN thiếu một step; `conclusion_en.options` lệch độ dài.

**Hiển thị:** `renderBrief` và inbox chỉ đọc qua `textOf(t, getLang())`. Grader và `steps[i].solution` không quan tâm ngôn ngữ.

### 2.3 Kiểm tra nội dung `tests/content.test.ts` (sửa P1 T7)

```ts
const ALL_TABLES = Object.values(CHAPTER_TABLES).flat();
const VI_DIACRITIC = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
const codeSpans = (s: string) => [...s.matchAll(/`([^`]+)`/g)].map((m) => m[1]).sort();
const allText = (x: TicketText) => [x.body, ...x.hints, ...x.steps.flatMap((s) => [s.title, s.prompt])].join('\n');

it.each(tickets)('$id: có bản EN đầy đủ', (t) => expect(t.en).toBeDefined());
it.each(tickets)('$id: EN giữ nguyên mọi `code span` của VI', (t) =>
  expect(codeSpans(allText(t.en!))).toEqual(codeSpans(allText(textOf(t, 'vi')))));
it.each(tickets)('$id: EN không còn chữ tiếng Việt (ngoài code span)', (t) =>
  expect(allText(t.en!).replace(/`[^`]+`/g, '')).not.toMatch(VI_DIACRITIC));
it.each(steps)('$name: bảng dùng trong Solution phải khai trong tables', ({ t, sql }) =>
  expect([...tablesInQuery(sql, ALL_TABLES)].filter((x) => !t.tables.includes(x))).toEqual([]));
```

Check "code span giống nhau" bắt lỗi phổ biến nhất khi dịch: người dịch đổi literal (`'Europe'` → `'Châu Âu'`, `IN_TRANSIT` → `in transit`) làm đề lệch với đáp án. Check "bảng trong Solution phải khai trong `tables`" dùng lại `tablesInQuery` của P1b T6, nên chỉ thêm được **sau P1b T6**. Nó chặn trường hợp soft-lock bị lách: ticket dùng bảng chưa mở mà `contentProblems` không thấy, vì `tables:` khai thiếu.

---

## 3. SQL editor (CodeMirror 6)

### 3.1 Gói

| Gói | Tình trạng | Dùng cho |
|---|---|---|
| `codemirror` (`basicSetup`, `EditorView`) | đã có | nền |
| `@codemirror/lang-sql` 6.10 | đã có | `sql()`, `PostgreSQL`, `SQLNamespace` |
| `@codemirror/state` | đã có | `Compartment`, `Prec`, `EditorSelection` |
| `@codemirror/view` | đã có | `keymap`, `EditorView.updateListener` |
| `@codemirror/lint` 6.9 | **chỉ là phụ thuộc gián tiếp** → thêm vào `dependencies` | `setDiagnostics` |
| `@codemirror/autocomplete` 6.20 | gián tiếp; chỉ thêm nếu import trực tiếp (hiện không cần) | – |
| `sql-formatter` | **mới**, `--save-exact`, tải lười. *Kiểm khi cài:* tên API `formatDialect` + export `postgresql` | Format SQL |

Về format SQL: `pgsql-deparser` (P1b) đã có, nhưng nhiều khả năng **không dùng được** (*kiểm khi cài, chưa spike trong repo này*). AST của libpg-query không giữ comment, nên parse → deparse sẽ xóa comment `-- …` của người học và viết lại query theo dạng chuẩn hóa. `sql-formatter` giữ nguyên chữ người học viết. Import `formatDialect` + `postgresql` để tree-shake. Ngân sách: chunk lười ≤ 60KB gzip; nếu `vite build` cho thấy vượt thì bỏ tính năng format (DevOps kiểm).

### 3.2 Interface mới `src/ui/editor.ts` (sửa P1 T10)

```ts
import type { SQLNamespace } from '@codemirror/lang-sql';

export interface SqlErrorInfo { message: string; position?: number; code?: string; hint?: string }

export interface Editor {
  getValue(): string;
  /** Vùng chọn khác rỗng → chạy vùng đó; ngược lại cả tài liệu. offset dùng để ánh xạ position lỗi. */
  runTarget(): { sql: string; offset: number };
  /** Thay toàn bộ nội dung trong 1 transaction (undo được). Dùng cho lịch sử và format. */
  setValue(sql: string): void;
  setSchema(ns: SQLNamespace): void;
  showError(e: SqlErrorInfo, offset: number): void;
  clearError(): void;
  format(): Promise<boolean>;    // false nếu sql-formatter không parse được → UI báo t('work.formatFailed')
  focus(): void;
  destroy(): void;
}

export function createEditor(parent: HTMLElement, opts: {
  doc: string;
  schema: SQLNamespace;
  onChange(v: string): void;
  onRun(): void;        // Mod-Enter
  onSubmit(): void;     // Mod-Shift-Enter
  onSelection(nonEmpty: boolean): void;  // đổi nhãn nút Chạy ↔ Chạy vùng chọn
}): Editor;
```

Extensions:

```ts
const schemaConf = new Compartment();
[
  Prec.highest(keymap.of([
    { key: 'Mod-Enter', run: () => (opts.onRun(), true) },
    { key: 'Mod-Shift-Enter', run: () => (opts.onSubmit(), true) },
    { key: 'Shift-Alt-f', run: () => (void api.format(), true) },
  ])),
  basicSetup,                                   // đã gồm autocompletion, closeBrackets, search, lintKeymap
  schemaConf.of(sql({ dialect: PostgreSQL, schema: opts.schema, upperCaseKeywords: true })),
  EditorView.updateListener.of((u) => {
    if (u.docChanged) opts.onChange(u.state.doc.toString());
    if (u.selectionSet) opts.onSelection(!u.state.selection.main.empty);
  }),
  EditorView.contentAttributes.of({ 'aria-label': 'SQL editor' }),
]
// setSchema(ns): view.dispatch({ effects: schemaConf.reconfigure(sql({ dialect: PostgreSQL, schema: ns, upperCaseKeywords: true })) })
```

### 3.3 Autocomplete theo schema đã mở

Plan 1 truyền `Record<string, string[]>`. Đổi sang `SQLNamespace` để hiện **kiểu dữ liệu** cạnh tên cột, giúp người học chọn hàm đúng (ví dụ `eta date`):

```ts
// src/state.ts (thay editorSchema() của P1 T10)
export function editorSchema(extra: Record<string, { name: string; type: string }[]> = {}): SQLNamespace {
  const out: Record<string, SQLNamespace> = {};
  const add = (table: string, cols: { name: string; type: string }[]) =>
    (out[table] = { self: { label: table, type: 'type', detail: 'table' },
                    children: cols.map((c) => ({ label: c.name, type: 'property', detail: c.type })) });
  for (const t of unlockedTables()) if (app.columns[t]) add(t, app.columns[t]);
  for (const [t, cols] of Object.entries(extra)) add(t, cols);    // bảng CSV người dùng nạp (schema sandbox, Product §4)
  return out;
}
```
Gọi `work.setSchema(editorSchema())` khi DB `ready` (xong lấy columns), khi `complete()` mở chương mới, và khi import data. Bảng chưa mở **không** được gợi ý, dù DB vẫn có đủ (đúng spec §4).

### 3.4 Chạy vùng chọn, lỗi có vị trí, lịch sử

**Thay đổi giao thức worker (BE làm, FE chỉ đặc tả, sửa P1 T2 + P1b T1):**

```ts
// worker → main
| { type: 'error'; id: number; message: string; position?: number; code?: string; hint?: string }
// worker.ts catch:
const pe = err as { message?: string; position?: string; code?: string; hint?: string };
postMessage({ type: 'error', id, message: pe.message ?? String(err),
  position: pe.position ? Number(pe.position) : undefined, code: pe.code, hint: pe.hint });
// client.ts: reject(new SqlError(m))   — export class SqlError extends Error implements SqlErrorInfo
```

Chỉ dùng `position` từ `kind: 'run'`. `explain` thêm tiền tố `EXPLAIN (ANALYZE, FORMAT JSON) ` và `steps` chạy các query con, nên position của hai kind này lệch, chỉ hiện text.

**Gạch chân lỗi:**

```ts
showError(e, offset) {
  if (!e.position) return;                                  // vd. 'cannot insert multiple commands' không có position
  const doc = view.state.doc;
  const from = Math.min(offset + e.position - 1, doc.length);
  const word = /^[\w."]+/.exec(doc.sliceString(from, from + 64))?.[0].length ?? 0;
  view.dispatch(setDiagnostics(view.state, [{ from, to: Math.min(from + Math.max(word, 1), doc.length),
    severity: 'error', message: e.hint ? `${e.message}\n${e.hint}` : e.message }]));
}
```
`clearError()` (`setDiagnostics(state, [])`) được gọi đầu mỗi lần Chạy/Nộp. Tab Kết quả hiện thêm, theo thứ tự: message gốc Postgres → `hint` → `t('sqlstate.' + code)` nếu có khóa. Lỗi 42601 không có position + message "multiple commands" thì hiện `t('err.multi')`.

**Nộp cũng phải gạch được lỗi.** `grade()` (P1 T3) hiện bắt lỗi rồi chỉ trả `{ ok: false, reason: 'error', message }`, nên position bị mất. Sửa P1 T3:
```ts
| { ok: false; reason: 'error'; message: string; error?: SqlErrorInfo }   // error = lỗi gốc nếu là SqlError
```
`work.ts` gọi `editor.showError(r.error, 0)` khi có.

**Chạy vùng chọn:** `run()` dùng `editor.runTarget()`, rồi dùng `offset` khi `showError`. **Nộp luôn chấm cả tài liệu** (`getValue()`, offset 0). Nút Chạy đổi nhãn `work.run` ↔ `work.runSel` qua `onSelection`. Nhờ vậy editor có thể giữ nhiều câu nháp, mỗi lần bôi đen chạy một câu, mà không đụng luật một câu lệnh của sandbox.

**Lịch sử query theo ticket:** module mới `src/history.ts`, dùng localStorage key riêng `cargo-query/history`, không nằm trong `Save` và không xuất cùng tiến độ (mất thì không sao).

```ts
export interface HistoryEntry { sql: string; at: number; ok: boolean; rows?: number }
export type History = Record<string, HistoryEntry[]>;   // key: ticketId, hoặc 'sandbox'
export const HISTORY_KEY = 'cargo-query/history';
export const HISTORY_MAX = 15;          // mỗi ticket
export const HISTORY_SQL_MAX = 2000;    // ký tự; dài hơn thì không lưu
export function pushHistory(h: History, key: string, e: HistoryEntry): History; // bỏ qua nếu trùng sql với mục mới nhất; cắt về HISTORY_MAX
export function loadHistory(s: KV | undefined): History;      // try/catch, JSON hỏng → {}
export function writeHistory(s: KV | undefined, h: History): void;
```
Trần dung lượng: 35 ticket × 15 × 2KB ≈ 1MB, thực tế ~200B/mục ≈ 100KB. Test `tests/history.test.ts` gồm 3 assert: dedupe, cắt 15, JSON hỏng → `{}`.
UI: `<details class="history"><summary>{t('work.history',{n})}</summary>` nằm dưới thanh nút. Mỗi mục là một `<button>` gồm 60 ký tự đầu của SQL, dấu ✓/✗ và số dòng. Click thì gọi `editor.setValue(sql)` (undo được). Dùng `<details>` native nên không cần thêm popover.

### 3.5 Nút trong khu editor (sau thay đổi)

`[▶ Chạy (Ctrl+Enter)] [EXPLAIN] [Định dạng] [Nộp]` · bên dưới là `▸ Lịch sử (n)` · feedback `role="status"`.

---

## 4. Quy trình nội dung (người viết ticket)

1. Copy `content/TEMPLATE.md` (đặt **ngoài** `content/tickets/` để glob không nạp). Template có đủ frontmatter, `## Hints`, `## Solution`, `# EN` và comment hướng dẫn.
2. Viết bản VI + SQL → `npx vitest run tests/content.test.ts`. Lúc này chỉ test "có bản EN" đỏ, các test còn lại phải xanh (solution chạy được, soft-lock, nhịp chương, bảng khai đủ).
3. Viết khối `# EN` → chạy lại test, phải xanh toàn bộ.
4. `npm run dev`, chơi thử ticket ở cả hai ngôn ngữ (nút EN/VI trên topbar), Nộp bằng đúng Solution.
5. PR. CI chạy `npm test && npm run build`. Không merge khi content test đỏ: **CI là cổng chặn, parser chỉ khoan dung** (ticket thiếu EN vẫn chạy được ở dev và hiện nhãn "chưa dịch").

Luật lint (đều nằm trong `tests/content.test.ts` / `parseTicket`, không thêm công cụ):

| # | Luật | Ở đâu |
|---|---|---|
| L1 | đúng 3 hints mỗi ngôn ngữ; số step VI = EN | `parseTicket` |
| L2 | khối `# EN` không chứa ```sql; tối đa một `# EN` | `parseTicket` |
| L3 | có `title_en`; boss có `conclusion_en` cùng số lựa chọn | `parseTicket` |
| L4 | code span `` `…` `` ở VI và EN giống hệt nhau | content test |
| L5 | EN không còn ký tự tiếng Việt có dấu (ngoài code span) | content test |
| L6 | bảng trong Solution ⊆ `tables` | content test (dùng `tablesInQuery`, sau P1b T6) |
| L7 | không `CURRENT_DATE`/`now()`; `ordered` có `ORDER BY`; soft-lock; nhịp chương | đã có (P1 T5, T7) |

Dịch 15 ticket chương 1–3 thành task riêng (Plan 1c T4). Chương 4–7 của Plan 2/3 viết song ngữ ngay từ đầu.

---

## 5. Tổng hợp thay đổi theo plan

| # | Thay đổi | Plan/Task bị sửa | Cỡ |
|---|---|---|---|
| 1 | Tách `main.ts` → `state.ts`, `ui/{topbar,inbox,brief,work,tabs}.ts`; editor sống qua re-render | **Plan 1c T1** (mới), sửa chỗ "gắn vào main.ts" của P1b T2/4/5/6/7 | M |
| 2 | `src/i18n/{index,vi,en}.ts`, `t()`, nút EN/VI, `data-i18n` trong `index.html`, `Tab.label: Key` | Plan 1c T2; sửa P1 T10 (`panel.ts`, `index.html`) | M |
| 3 | Đưa chuỗi ngoài UI vào từ điển: `CHAPTER_TITLES`, lỗi `DbClient`, `loadSave().warning`/`parseSave`, `NODE_HELP`, `STEP_LABELS/HELP`, `fmt`; cache `stepsFor` | P1 T2, T5, T6; P1b T1, T2, T3, T4, T7 | M |
| 4 | Ticket song ngữ `# EN` + `title_en` + `conclusion_en`; `TicketText`, `textOf`, `parseSections` | P1 T4 (+2 test) | S |
| 5 | Content lint L4–L6 + `tests/i18n.test.ts` + `content/TEMPLATE.md` | P1 T7 | S |
| 6 | Dịch EN 15 ticket ch1–3 | Plan 1c T4; P1 T7–T9 | M |
| 7 | Worker trả `position/code/hint`; `SqlError`; `GradeResult` error mang `SqlErrorInfo` | P1 T2, T3, P1b T1 (**BE**) | S |
| 8 | Editor: `Compartment` schema + `SQLNamespace` có kiểu cột; chạy vùng chọn; gạch lỗi (`@codemirror/lint`); Mod-Shift-Enter nộp | P1 T10 (`editor.ts`) | M |
| 9 | Format SQL bằng `sql-formatter` tải lười | Plan 1c T5; `package.json` | S |
| 10 | Lịch sử query `src/history.ts` + `<details>` | Plan 1c T6 | S |

Phần cần phối hợp:
- **BE:** #7 (giao thức worker). Đổi `QueryTimeoutError` thành không-text.
- **Product:** Plan 1c là **một plan chung**: các task FE ở trên (T1 tách main, T2 i18n, T4 dịch, T5 format, T6 lịch sử) xếp chung với các task "Product layer" (skills/chapters.yml, save v2, variants, Leitner, Sandbox). Riêng T1 (tách `main.ts`) phải chạy **trước** mọi task UI của Product. Sandbox (Product §3.4) = `mountWork` với `ticket: undefined`: ẩn Nộp, draft lấy từ `save.sandboxDraft`, lịch sử key `'sandbox'`. Bảng CSV đi vào `editorSchema(extra)`. Luyện tập dùng `mountWork` bình thường với ticket đã thay biến thể. FE không đụng `Save`; Product giữ quyền tăng `SAVE_VERSION`.
- **DevOps:** đo chunk `sql-formatter` và kích thước thêm của từ điển + EN ticket (ước tính < 120KB raw, eager).
