# Cargo Query — Plan Deploy: GitHub Pages, CI, ngân sách gzip, nghiệm thu, chẩn đoán, rollback

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy bản DA lên **GitHub Pages** (miễn phí, không backend) bằng GitHub Actions, theo quyết định D6. Gồm: build chạy được dưới đường dẫn con `/<repo>/`, CI (typecheck, test, build, ngân sách gzip), script `curl` kiểm tra sau deploy, `public/_headers` để có thể chuyển sang Cloudflare Pages, hàm dựng payload "Sao chép thông tin chẩn đoán" theo allowlist, và quy trình rollback.

**Architecture:** Site tĩnh thuần. Job `build` chạy `npm ci` → `tsc` → `vitest` → `vite build --base=/<repo>/` → `scripts/check-budget.mjs`, sau đó đóng gói `dist/` bằng `actions/upload-pages-artifact`. Job `deploy` (chỉ chạy trên `main`) gọi `actions/deploy-pages`, rồi chạy `scripts/check-deploy.sh` trên URL vừa deploy. `base` lấy từ CLI (`--base`), `vite.config.ts` giữ mặc định `/`, nên `npm run dev` và bản build cho Cloudflare không phải sửa gì. Mã build (`__BUILD__`, 7 ký tự đầu của SHA) được inject bằng `define` để payload chẩn đoán có trường `build`.

**Tech Stack:** như Plan 1. Không thêm dependency npm nào. GitHub Actions dùng `actions/checkout@v7`, `actions/setup-node@v7`, `actions/upload-pages-artifact@v5`, `actions/deploy-pages@v5`. Đây là các major tag mới nhất, đã kiểm bằng `gh api repos/<action>/releases/latest` ngày 2026-11-16: v7.0.1, v7.1.0, v5.0.0, v5.0.1.

**Spec:** `docs/superpowers/specs/2026-11-16-cargo-query-design.md` §3 (Tải trang), §9b (Vận hành & deploy), §10. Nguồn số liệu: `docs/team/devops.md` §1–§5, `docs/team/amendments.md` F2, F3, F9 và D6.

**Tiền đề:** Plan 1 Task 1–3 đã có code (`vite.config.ts`, `src/db/*`). Plan này độc lập với Plan 1 Task 4–11, Plan 1b và Plan 1c, nên chạy được ngay. Plan này chỉ làm hàm dựng payload và test của nó. Nút "Sao chép thông tin chẩn đoán" (UI) **chưa thuộc task nào** (Plan 1c không có); spec nút ở cuối Task 3 dành cho task UI sẽ được giao sau.

## Global Constraints

- Mọi ràng buộc của Plan 1 vẫn áp dụng: PGlite **0.5.16** pin, không đưa dữ liệu vào `innerHTML`, try/catch quanh `localStorage`/IndexedDB, và mọi bước "xác nhận PASS" đều chạy thêm `npx tsc --noEmit`, phải không có lỗi.
- **Không backend.** Nhánh DE sau này dùng backend **Python chạy trên Kubernetes**. Phần đó nằm ngoài phạm vi plan này và chưa mở plan.
- Không dùng Railway, Vercel hay Supabase. Không thêm dependency npm. Version của action trong workflow pin theo major tag ở trên.
- **Git Bash trên Windows tự đổi đường dẫn.** Mọi lệnh local có đối số bắt đầu bằng `/` (ví dụ `--base=/cargo-query/`), kể cả biến môi trường, phải có tiền tố `MSYS_NO_PATHCONV=1`. Đã đo: nếu thiếu tiền tố này, `dist/index.html` chứa `src="/Users/khoa.huynh/AppData/Local/Programs/Git/cargo-query/assets/…"` (xem "Kết quả kiểm chứng"). Runner Ubuntu của CI không bị lỗi này.
- Payload chẩn đoán chỉ chứa **đúng** các trường `build`, `kind`, `sqlstate`, `errorName`, `timings`, `ua`. Không bao giờ chứa SQL, `message`, stack, draft, save hay dữ liệu import.
- Không bật COOP/COEP (devops §1.5).
- `vite.config.ts` là file dùng chung với các plan khác. Task 1 đưa ra **toàn bộ** nội dung file. Nếu lúc chạy plan mà file đã khác bản ở Step 3 (do plan khác sửa), giữ nguyên các khóa đã có và chỉ thêm `loadEnv` + `define`.

## File Structure

```
vite.config.ts                 Modify: define __BUILD__ (SHA ngắn từ GITHUB_SHA, local = 'dev')
src/env.d.ts                   Create: declare const __BUILD__: string
src/diagnostics.ts             Create: buildDiagnostics, diagnosticsText, uaFamily (allowlist)
scripts/check-budget.mjs       Create: ngân sách gzip theo tiền tố tên asset
scripts/check-deploy.sh        Create: curl kiểm tra sau deploy (status, content-type, content-encoding)
public/_headers                Create: header cho Cloudflare Pages (GitHub Pages bỏ qua file này)
.github/workflows/ci.yml       Create: build + test + budget + deploy GitHub Pages
docs/ops/deploy.md             Create: runbook (thiết lập lần đầu, nghiệm thu, rollback, chuyển Cloudflare)
tests/build-info.test.ts       Create
tests/diagnostics.test.ts      Create
```

## Kết quả kiểm chứng (đã chạy thật ngày 2026-11-16, trên repo hiện tại, Windows + Git Bash, Node v24.18.0, Vite 8.3.8)

**1. `npx vite build --base=/cargo-query/` chạy đúng nguyên văn trong Git Bash: SAI.** Git Bash đổi `/cargo-query/` thành đường dẫn Windows:

```
<script type="module" crossorigin src="/Users/khoa.huynh/AppData/Local/Programs/Git/cargo-query/assets/index-jBQV9JGG.js"></script>
new URL(`/Users/khoa.huynh/AppData/Local/Programs/Git/cargo-query/assets/worker-DosLH5rK.js`, …)
```

Biến môi trường cũng bị đổi: `BASE_TEST=/cargo-query/ node -e 'console.log(process.env.BASE_TEST)'` in ra `C:/Users/khoa.huynh/AppData/Local/Programs/Git/cargo-query/`.

**2. `MSYS_NO_PATHCONV=1 npx vite build --base=/cargo-query/`: ĐÚNG.** Mọi URL đều nằm dưới `/cargo-query/assets/`:

```
dist/index.html:   src="/cargo-query/assets/index-Bp7b-_kl.js"
index-*.js:        new URL(`/cargo-query/assets/worker-CtzqjVg8.js`, ``+import.meta.url)
worker-*.js:       new URL(`/cargo-query/assets/pglite-VfT9wtrq.wasm`, …)
                   new URL(`/cargo-query/assets/initdb-BJaOLL_I.wasm`, …)
                   p.getFsBundle(new URL(`/cargo-query/assets/pglite-BE2Di5Vw.data`, …))
```

**3. `MSYS_NO_PATHCONV=1 npx vite preview --base=/cargo-query/ --port 4173` + `curl -sI` (HEAD):**

```
/cargo-query/                              200  Content-Type: text/html
/cargo-query/assets/index-Bp7b-_kl.js      200  text/javascript          Content-Length: 2433
/cargo-query/assets/worker-CtzqjVg8.js     200  text/javascript          Content-Length: 484373
/cargo-query/assets/pglite-VfT9wtrq.wasm   200  application/wasm         Content-Length: 9086480
/cargo-query/assets/pglite-BE2Di5Vw.data   200  Content-Type: (rỗng)     Content-Length: 6242272
/cargo-query/assets/initdb-BJaOLL_I.wasm   200  application/wasm         Content-Length: 298788
/assets/index-Bp7b-_kl.js (ngoài base)     404
```

Với HEAD, `vite preview` không trả `content-encoding` cho file nào.

**4. Script `scripts/check-deploy.sh` (Task 4, dùng GET) chạy trên cùng server preview:**

```
ok   assets/index-Bp7b-_kl.js           200 type=text/javascript enc=gzip cache=no-cache
ok   assets/worker-CtzqjVg8.js          200 type=text/javascript enc=gzip cache=no-cache
WARN assets/initdb-BJaOLL_I.wasm        200 type=application/wasm enc=- cache=no-cache
ok   assets/pglite-BE2Di5Vw.data        200 type=- enc=gzip cache=no-cache
WARN assets/pglite-VfT9wtrq.wasm        200 type=application/wasm enc=- cache=no-cache
exit=0          (STRICT=1 → exit=1;  URL sai base http://localhost:4174/ → "FAIL index.html has no assets/index-*.js", exit=1)
```

Với GET, preview nén `.js` và `.data` nhưng không nén `.wasm`. **Kết quả này không nói gì về GitHub Pages.** Header của GitHub Pages (Fastly) không cấu hình được, và việc nó có nén `.wasm`/`.data` hay không **[chưa kiểm]**. Phải đo bằng Task 7 Step 3 trên URL thật.

**5. `node scripts/check-budget.mjs` (Task 2) trên bản build smoke hiện tại:**

```
ok   index-             1 KB gz / 250 KB
ok   worker-          131 KB gz / 160 KB
ok   pglite-         5287 KB gz / 5300 KB
ok   initdb-          128 KB gz / 140 KB
skip libpg-query    not found
skip mermaid        not found
skip sql-formatter  not found
info (other)            7 KB gz (no budget)
```

`pglite-` chỉ còn **13 KB** dư. Con số này cố định vì PGlite pin 0.5.16 và gzip -9 của Node cho kết quả tất định. Nếu vượt, đó là dấu hiệu version PGlite đã đổi. Lưu ý một chỗ lệch: devops §2 ghi ngân sách là ".wasm 3250 + .data 1870" (= 5120), nhưng script đo được 5287 KB, có thể do zlib của Node nén khác `gzip -9` CLI. Plan giữ nguyên ngân sách 5300 theo devops.md/F3 và ghi chỗ lệch này thành câu hỏi mở. Nếu bước budget FAIL thì deploy dừng.

**6. `__BUILD__`:** `GITHUB_SHA=0123456789abcdef npx vite build` cho ra `` `0123456` `` trong bundle. Trong Vitest không có `GITHUB_SHA` thì giá trị là `"dev"`.

---

### Task 1: Mã build `__BUILD__` qua `define`

**Files:**
- Modify: `vite.config.ts`
- Create: `src/env.d.ts`
- Test: `tests/build-info.test.ts`

**Interfaces:**
- Consumes: `loadEnv` (vite), `defineConfig` (vitest/config)
- Produces:
  - global `declare const __BUILD__: string`: 7 ký tự đầu của `GITHUB_SHA` khi build trong CI, `'dev'` khi build local hoặc trong Vitest
  - `vite.config.ts` export cấu hình dạng hàm `({ mode }) => UserConfig`. `base` **không** khai báo trong file mà truyền bằng CLI `--base`.

- [ ] **Step 1: Viết test (đỏ)**

`tests/build-info.test.ts`:

```ts
import { expect, it } from 'vitest';

it('__BUILD__ is a short git sha in CI or "dev" locally', () => {
  expect(__BUILD__).toMatch(/^([0-9a-f]{7}|dev)$/);
});
```

- [ ] **Step 2: Chạy, xác nhận FAIL**

Run: `npx vitest run tests/build-info.test.ts; npx tsc --noEmit`
Expected (đã chạy thật):
```
ReferenceError: __BUILD__ is not defined
      Tests  1 failed (1)
tests/build-info.test.ts(4,10): error TS2304: Cannot find name '__BUILD__'.
```

- [ ] **Step 3: Sửa `vite.config.ts` (toàn bộ file) và tạo `src/env.d.ts`**

`vite.config.ts`:

```ts
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => {
  // GITHUB_SHA is set by GitHub Actions; local builds and tests report 'dev'.
  const sha = loadEnv(mode, '.', 'GITHUB_SHA').GITHUB_SHA;
  return {
    // No `base` here: GitHub Pages passes `--base=/<repo>/` on the CLI; '/' keeps dev and Cloudflare Pages unchanged.
    define: { __BUILD__: JSON.stringify(sha ? sha.slice(0, 7) : 'dev') },
    // PGlite tự nạp file .wasm/.data qua import.meta.url; pre-bundle sẽ làm hỏng đường dẫn.
    optimizeDeps: { exclude: ['@electric-sql/pglite'] },
    worker: { format: 'es' },
    test: { testTimeout: 60_000, hookTimeout: 60_000 },
  };
});
```

`src/env.d.ts`:

```ts
/** Short git SHA of the build, injected by `define` in vite.config.ts ('dev' locally). */
declare const __BUILD__: string;
```

Ghi chú: repo không có `@types/node`, nên `vite.config.ts` không dùng `process.env` mà đọc biến qua `loadEnv` (có kiểu sẵn trong `vite`). `loadEnv(mode, '.', 'GITHUB_SHA')` đọc cả `process.env`, chỉ lấy các khóa có tiền tố `GITHUB_SHA`.

- [ ] **Step 4: Chạy, xác nhận PASS**

Run: `npx vitest run tests/build-info.test.ts && npx tsc --noEmit && echo TSC_OK`
Expected:
```
      Tests  1 passed (1)
TSC_OK
```

Run: `GITHUB_SHA=abcdef0123456 npx vitest run tests/build-info.test.ts`
Expected: `Tests  1 passed (1)` (giá trị lúc này là `abcdef0`)

Run: `npm test && npx tsc --noEmit && echo TSC_OK`
Expected: toàn bộ test cũ vẫn PASS, cộng thêm 1 test mới. Dòng cuối là `TSC_OK`.

- [ ] **Step 5: Commit**

```bash
git add vite.config.ts src/env.d.ts tests/build-info.test.ts
git commit -m "build: inject short git sha as __BUILD__"
```

---

### Task 2: Ngân sách gzip `scripts/check-budget.mjs`

**Files:**
- Create: `scripts/check-budget.mjs`

**Interfaces:**
- Consumes: thư mục asset sau build (mặc định `dist/assets`)
- Produces: CLI `node scripts/check-budget.mjs [dir]`. Mỗi tiền tố in một dòng `ok  |FAIL|skip`, thêm dòng `info (other)`. Thoát với **exit 1** khi một tiền tố vượt ngân sách hoặc thiếu một tiền tố bắt buộc (`index-`, `worker-`, `pglite-`, `initdb-`). Tiền tố lazy (`libpg-query`, `mermaid`, `sql-formatter`) chỉ được kiểm khi chunk tương ứng đã tồn tại.

Ngân sách (KB, gzip -9):

| Tiền tố | KB | Nguồn |
|---|---:|---|
| `index-` | 250 | devops §2, amendments F3 |
| `worker-` | 160 | devops §2, F3 |
| `pglite-` | 5300 | devops §2, F3 (`.wasm` 3250 + `.data` 1870) |
| `initdb-` | 140 | devops §2, F3 |
| `libpg-query` | 380 | devops §2, F3 (spike ~345) |
| `mermaid` | 900 | devops §2, F3 (chưa đo) |
| `sql-formatter` | 60 | amendments D5 phương án A ("≤ 60 KB gzip"), user đã chọn thêm `sql-formatter`. Con số này không có trong devops.md. |

Script không có unit test vì `tests/` được `tsc` kiểm kiểu, mà repo không có `@types/node` nên test không import được `node:*`. Thay vào đó, TDD bằng một fixture vượt ngân sách (Step 1–2).

- [ ] **Step 1: Tạo fixture vượt ngân sách (đỏ: script chưa tồn tại)**

Run:
```bash
FX=$(mktemp -d) && node -e "require('fs').writeFileSync(process.argv[1]+'/index-big.js', require('crypto').randomBytes(300*1024))" "$FX" && node scripts/check-budget.mjs "$FX"; echo "exit=$?"
```
Expected: `Error: Cannot find module '…/scripts/check-budget.mjs'` rồi `exit=1`

- [ ] **Step 2: Viết `scripts/check-budget.mjs`**

```js
// Gzip budget per asset-name prefix (KB, gzip -9). Numbers: docs/team/devops.md §2, amendments F3/D5.
// Usage: node scripts/check-budget.mjs [dir]   (default dist/assets)
import { readdirSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const REQUIRED = { 'index-': 250, 'worker-': 160, 'pglite-': 5300, 'initdb-': 140 };
const LAZY = { 'libpg-query': 380, 'mermaid': 900, 'sql-formatter': 60 }; // checked only once the chunk exists
const BUDGET = { ...REQUIRED, ...LAZY };

const dir = process.argv[2] ?? 'dist/assets';
const sums = {};
let other = 0;
for (const f of readdirSync(dir)) {
  const kb = gzipSync(readFileSync(`${dir}/${f}`), { level: 9 }).length / 1024;
  const key = Object.keys(BUDGET).find((k) => f.startsWith(k));
  if (key) sums[key] = (sums[key] ?? 0) + kb;
  else other += kb;
}
let fail = false;
for (const [k, budget] of Object.entries(BUDGET)) {
  const kb = sums[k];
  if (kb === undefined) {
    const missing = k in REQUIRED;
    fail ||= missing;
    console.log(`${missing ? 'FAIL' : 'skip'} ${k.padEnd(14)} not found`);
    continue;
  }
  const over = kb > budget;
  fail ||= over;
  console.log(`${over ? 'FAIL' : 'ok  '} ${k.padEnd(14)} ${kb.toFixed(0).padStart(5)} KB gz / ${budget} KB`);
}
console.log(`info ${'(other)'.padEnd(14)} ${other.toFixed(0).padStart(5)} KB gz (no budget)`);
process.exit(fail ? 1 : 0);
```

- [ ] **Step 3: Chạy lại fixture, xác nhận FAIL đúng lý do**

Run:
```bash
FX=$(mktemp -d) && node -e "require('fs').writeFileSync(process.argv[1]+'/index-big.js', require('crypto').randomBytes(300*1024))" "$FX" && node scripts/check-budget.mjs "$FX"; echo "exit=$?"
```
Expected (đã chạy thật):
```
FAIL index-           300 KB gz / 250 KB
FAIL worker-        not found
FAIL pglite-        not found
FAIL initdb-        not found
skip libpg-query    not found
skip mermaid        not found
skip sql-formatter  not found
info (other)            0 KB gz (no budget)
exit=1
```

- [ ] **Step 4: Chạy trên build thật, xác nhận PASS**

Run: `npx vite build >/dev/null 2>&1 && node scripts/check-budget.mjs; echo "exit=$?"; npx tsc --noEmit && echo TSC_OK`
Expected: bảng giống mục 5 của "Kết quả kiểm chứng" (`index-` có thể lớn hơn nếu Plan 1 Task 10 đã chạy, nhưng vẫn phải ≤ 250), rồi `exit=0` và `TSC_OK`.

Ghi chú bảo trì:
- Rolldown tự đặt tên chunk lazy theo module (ví dụ `erDiagram-*`, `mermaid.core-*`). Sau lần build đầu có Mermaid, libpg-query hoặc sql-formatter, chạy `ls dist/assets` và sửa tiền tố trong `LAZY` cho khớp. Nếu một chunk lazy không khớp tiền tố nào, nó chỉ bị cộng vào dòng `info (other)` mà **không** làm script fail. Nếu dòng `(other)` tăng đột biến sau khi thêm thư viện, đó là dấu hiệu tiền tố chưa khớp.
- `pglite-` chỉ còn 13 KB dư. Đừng nới ngân sách khi chưa xác nhận version PGlite vẫn là 0.5.16.

- [ ] **Step 5: Commit**

```bash
git add scripts/check-budget.mjs
git commit -m "ci: gzip budget check per asset prefix"
```

---

### Task 3: Payload chẩn đoán theo allowlist (`src/diagnostics.ts`)

**Files:**
- Create: `src/diagnostics.ts`
- Test: `tests/diagnostics.test.ts`

**Interfaces:**
- Consumes: không có (hàm thuần). Plan 1c truyền `__BUILD__` (Task 1), `navigator.userAgent`, lỗi bắt được và `timings` (từ message `ready` của worker, amendments F5) vào hàm này.
- Produces:
  - `type DiagnosticKind = 'db-init-failed' | 'db-timeout' | 'worker-crash' | 'chunk-load-failed' | 'js-error'`
  - `type UaFamily = 'chrome' | 'firefox' | 'safari' | 'other'`
  - `interface DiagnosticTimings { bootMs: number; seedMs: number; readyMs: number }`
  - `interface Diagnostics { build: string; kind: DiagnosticKind; sqlstate?: string; errorName?: string; timings?: DiagnosticTimings; ua: UaFamily }`
  - `interface DiagnosticsInput { build: string; kind: DiagnosticKind; error?: unknown; timings?: Partial<Record<keyof DiagnosticTimings, unknown>>; userAgent: string }`
  - `uaFamily(ua: string): UaFamily`
  - `buildDiagnostics(input: DiagnosticsInput): Diagnostics`
  - `diagnosticsText(d: Diagnostics): string`: `JSON.stringify(d, null, 2)`, là chuỗi nút sẽ copy vào clipboard

Quy tắc allowlist:
- `sqlstate` lấy từ `error.code`, chỉ giữ khi khớp `/^[0-9A-Z]{5}$/`.
- `errorName` lấy từ `error.name`, chỉ giữ khi khớp `/^[A-Za-z]{1,40}$/`.
- `build` phải khớp `/^[0-9a-z]{1,40}$/`, nếu không thì ghi `'unknown'`.
- `timings` chỉ có khi đủ cả 3 số hữu hạn ≥ 0, mỗi số làm tròn.
- **Không bao giờ** đọc `error.message`, `error.stack` hay bất kỳ trường nào khác.
- Edge/Opera/Chromium được tính là `chrome`. iOS Chrome (`CriOS`) cũng tính là `chrome`.

- [ ] **Step 1: Viết test (đỏ)**

`tests/diagnostics.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildDiagnostics, diagnosticsText, uaFamily } from '../src/diagnostics';

const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const EDGE = `${CHROME} Edg/131.0.0.0`;
const FIREFOX = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0';
const SAFARI = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15';

describe('uaFamily', () => {
  it('maps user agents to 4 coarse families', () => {
    expect(uaFamily(CHROME)).toBe('chrome');
    expect(uaFamily(EDGE)).toBe('chrome');
    expect(uaFamily(FIREFOX)).toBe('firefox');
    expect(uaFamily(SAFARI)).toBe('safari');
    expect(uaFamily('curl/8.5.0')).toBe('other');
  });
});

describe('buildDiagnostics', () => {
  it('keeps only allowlisted fields and never leaks SQL, message or stack', () => {
    const err = Object.assign(new Error('invalid input syntax for type integer: "SECRET-VALUE"'), {
      code: '22P02',
      query: "SELECT * FROM customers WHERE name = 'SECRET-VALUE'",
    });
    const d = buildDiagnostics({
      build: 'abc1234',
      kind: 'db-init-failed',
      error: err,
      timings: { bootMs: 812.4, seedMs: 2034.6, readyMs: 3001 },
      userAgent: CHROME,
    });
    expect(d).toEqual({
      build: 'abc1234',
      kind: 'db-init-failed',
      sqlstate: '22P02',
      errorName: 'Error',
      timings: { bootMs: 812, seedMs: 2035, readyMs: 3001 },
      ua: 'chrome',
    });
    const text = diagnosticsText(d);
    expect(text).not.toContain('SECRET-VALUE');
    expect(text).not.toContain('SELECT');
    expect(text).not.toContain('diagnostics.test');
  });

  it('drops values that do not match the allowlist shape', () => {
    const d = buildDiagnostics({
      build: "x'); DROP TABLE t;--",
      kind: 'js-error',
      error: { code: 'not a sqlstate', name: 'Name with spaces and "quotes"' },
      timings: { bootMs: 'fast', seedMs: Number.NaN, readyMs: -1 },
      userAgent: FIREFOX,
    });
    expect(d).toEqual({ build: 'unknown', kind: 'js-error', ua: 'firefox' });
  });

  it('accepts non-object errors and missing timings', () => {
    expect(buildDiagnostics({ build: 'dev', kind: 'db-timeout', error: 'boom', userAgent: SAFARI }))
      .toEqual({ build: 'dev', kind: 'db-timeout', ua: 'safari' });
  });
});
```

- [ ] **Step 2: Chạy, xác nhận FAIL**

Run: `npx vitest run tests/diagnostics.test.ts`
Expected (đã chạy thật):
```
 FAIL  tests/diagnostics.test.ts [ tests/diagnostics.test.ts ]
Error: Cannot find module '../src/diagnostics' imported from …/tests/diagnostics.test.ts
 Test Files  1 failed (1)
```

- [ ] **Step 3: Viết `src/diagnostics.ts`**

```ts
/**
 * "Copy diagnostics" payload (telemetry phase 1, decision D6). Strict allowlist:
 * never SQL, error messages, stacks, drafts, save data or imported data.
 */
export type DiagnosticKind = 'db-init-failed' | 'db-timeout' | 'worker-crash' | 'chunk-load-failed' | 'js-error';
export type UaFamily = 'chrome' | 'firefox' | 'safari' | 'other';
export interface DiagnosticTimings { bootMs: number; seedMs: number; readyMs: number }

export interface Diagnostics {
  build: string;
  kind: DiagnosticKind;
  sqlstate?: string;
  errorName?: string;
  timings?: DiagnosticTimings;
  ua: UaFamily;
}

export interface DiagnosticsInput {
  build: string;
  kind: DiagnosticKind;
  error?: unknown;
  timings?: Partial<Record<keyof DiagnosticTimings, unknown>>;
  userAgent: string;
}

const SQLSTATE = /^[0-9A-Z]{5}$/;
const ERROR_NAME = /^[A-Za-z]{1,40}$/;
const BUILD = /^[0-9a-z]{1,40}$/;

export function uaFamily(ua: string): UaFamily {
  if (/Firefox\//.test(ua)) return 'firefox';
  if (/Chrome\/|Chromium\/|CriOS\//.test(ua)) return 'chrome';
  if (/Safari\//.test(ua)) return 'safari';
  return 'other';
}

function field(error: unknown, key: 'code' | 'name'): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const v = (error as Record<string, unknown>)[key];
  return typeof v === 'string' ? v : undefined;
}

function ms(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.round(v) : undefined;
}

export function buildDiagnostics(input: DiagnosticsInput): Diagnostics {
  const d: Diagnostics = {
    build: BUILD.test(input.build) ? input.build : 'unknown',
    kind: input.kind,
    ua: uaFamily(input.userAgent),
  };
  const code = field(input.error, 'code');
  if (code !== undefined && SQLSTATE.test(code)) d.sqlstate = code;
  const name = field(input.error, 'name');
  if (name !== undefined && ERROR_NAME.test(name)) d.errorName = name;
  if (input.timings) {
    const bootMs = ms(input.timings.bootMs);
    const seedMs = ms(input.timings.seedMs);
    const readyMs = ms(input.timings.readyMs);
    if (bootMs !== undefined && seedMs !== undefined && readyMs !== undefined) d.timings = { bootMs, seedMs, readyMs };
  }
  return d;
}

/** Text the button copies to the clipboard. */
export function diagnosticsText(d: Diagnostics): string {
  return JSON.stringify(d, null, 2);
}
```

- [ ] **Step 4: Chạy, xác nhận PASS**

Run: `npx vitest run tests/diagnostics.test.ts && npx tsc --noEmit && echo TSC_OK`
Expected:
```
      Tests  4 passed (4)
TSC_OK
```

- [ ] **Step 5: Commit**

```bash
git add src/diagnostics.ts tests/diagnostics.test.ts
git commit -m "feat: allowlisted diagnostics payload builder"
```

**Spec nút cho task UI sẽ giao sau (chỉ là spec, không làm ở plan này; hiện chưa plan nào nhận):**
- Vị trí: thanh trạng thái DB. Nút chỉ hiện khi trạng thái là `failed`, sau một `QueryTimeoutError` (kind `db-timeout`), khi worker `onerror` (`worker-crash`), khi có `vite:preloadError` (`chunk-load-failed`) hoặc `window` `error`/`unhandledrejection` (`js-error`). Lỗi cú pháp SQL của người chơi là hành vi bình thường nên **không** hiện nút.
- Nhãn qua i18n: VI "Sao chép thông tin chẩn đoán", EN "Copy diagnostics". Khi bấm, gọi `navigator.clipboard.writeText(diagnosticsText(buildDiagnostics({ build: __BUILD__, kind, error, timings, userAgent: navigator.userAgent })))` trong try/catch. Nếu clipboard bị chặn thì hiện chuỗi đó trong `<pre>` bằng `textContent` để người chơi tự copy.
- `timings`: `bootMs` và `seedMs` lấy từ message `ready` của worker (F5). `readyMs` do main thread tự đo, bằng `performance.measure('db:time-to-ready', 'db:spawn', 'db:ready').duration`. Nếu thiếu một trong ba số, `buildDiagnostics` bỏ cả trường `timings`, và đây là hành vi có chủ ý.
- Không gửi đi đâu cả (không có `fetch`). Người chơi tự dán vào issue.

---

### Task 4: Script kiểm tra sau deploy `scripts/check-deploy.sh`

**Files:**
- Create: `scripts/check-deploy.sh`

**Interfaces:**
- Consumes: URL gốc của site đã deploy, có hoặc không có `/` ở cuối
- Produces: CLI `bash scripts/check-deploy.sh <URL>`. Script đi theo chuỗi `index.html` → `assets/index-*.js` → `worker-*.js` → các file `pglite-*.wasm|data` và `initdb-*.wasm`, rồi in mỗi file một dòng `ok|WARN|FAIL <path> <status> type= enc= cache=`.
  - **FAIL (exit 1):** status khác 200, hoặc không tìm thấy chuỗi tham chiếu (sai `base`).
  - **WARN:** `.wasm` không có `application/wasm` (PGlite tự fallback sang ArrayBuffer, devops §1.4), hoặc `.wasm`/`.data` không có `content-encoding`.
  - `STRICT=1`: thiếu `content-encoding` trên `.wasm`/`.data` thành FAIL. Dùng chế độ này khi nghiệm thu Cloudflare Pages.

**Nói thẳng về GitHub Pages:** header (`Content-Type`, `Content-Encoding`, `Cache-Control`) **không cấu hình được**. Vì vậy trên GitHub Pages, script mặc định chỉ WARN khi thiếu nén. Đây là chỗ khác với F2/spec §9b ("nghiệm thu nén bắt buộc"): trên GitHub Pages, nghiệm thu nén chỉ đo và ghi lại, không chặn được. Cách xử lý khi `.data` không được nén nằm ở `docs/ops/deploy.md` (Task 6) và là câu hỏi mở cho user.

- [ ] **Step 1: Chạy trước khi có script (đỏ)**

Run: `bash scripts/check-deploy.sh http://localhost:4173/cargo-query/; echo "exit=$?"`
Expected: `bash: scripts/check-deploy.sh: No such file or directory` rồi `exit=127`

- [ ] **Step 2: Viết `scripts/check-deploy.sh`**

```bash
#!/usr/bin/env bash
# Post-deploy check: every DB asset is reachable under the deployed base, plus content-type/encoding report.
# Usage: bash scripts/check-deploy.sh https://<user>.github.io/cargo-query/   (STRICT=1: missing compression fails)
set -u
URL="${1%/}"
fail=0
MAIN=$(curl -fsS "$URL/" | grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' | head -1)
[ -n "$MAIN" ] || { echo "FAIL index.html has no assets/index-*.js under $URL/"; exit 1; }
WORKER=$(curl -fsS "$URL/$MAIN" | grep -oE 'worker-[A-Za-z0-9_-]+\.js' | head -1)
[ -n "$WORKER" ] || { echo "FAIL $MAIN does not reference worker-*.js"; exit 1; }
FILES=$(curl -fsS "$URL/assets/$WORKER" | grep -oE '(pglite|initdb)-[A-Za-z0-9_-]+\.(wasm|data)' | sort -u)
[ -n "$FILES" ] || { echo "FAIL $WORKER does not reference pglite/initdb assets"; exit 1; }
for f in $MAIN "assets/$WORKER" $(printf 'assets/%s ' $FILES); do
  H=$(curl -sS -o /dev/null -D - -H 'Accept-Encoding: br, gzip' "$URL/$f" | tr -d '\r')
  status=$(printf '%s\n' "$H" | head -1 | cut -d' ' -f2)
  type=$(printf '%s\n' "$H" | grep -i '^content-type:' | cut -d' ' -f2-)
  enc=$(printf '%s\n' "$H" | grep -i '^content-encoding:' | cut -d' ' -f2-)
  cache=$(printf '%s\n' "$H" | grep -i '^cache-control:' | cut -d' ' -f2-)
  verdict=ok
  if [ "$status" != 200 ]; then verdict=FAIL; fail=1
  elif [[ $f == *.wasm && $type != application/wasm* ]]; then verdict=WARN   # PGlite falls back to ArrayBuffer
  elif [[ $f == *.wasm || $f == *.data ]] && [ -z "$enc" ]; then
    verdict=WARN; [ "${STRICT:-0}" = 1 ] && { verdict=FAIL; fail=1; }
  fi
  printf '%-4s %-34s %s type=%s enc=%s cache=%s\n' "$verdict" "$f" "$status" "${type:--}" "${enc:--}" "${cache:--}"
done
exit $fail
```

Script dùng GET (`-o /dev/null -D -`) chứ không dùng HEAD, vì server có thể chỉ nén khi trả body. Ví dụ đã đo: `vite preview` trả `content-encoding: gzip` cho GET nhưng không trả cho HEAD.

- [ ] **Step 3: Build dưới `/cargo-query/`, chạy preview, xác nhận PASS**

Run (Git Bash, một lệnh duy nhất; preview chạy nền rồi được dừng theo port):
```bash
MSYS_NO_PATHCONV=1 npx vite build --base=/cargo-query/ >/dev/null 2>&1 && grep -o 'src="/cargo-query/assets/index-[^"]*"' dist/index.html
(MSYS_NO_PATHCONV=1 npx vite preview --base=/cargo-query/ --port 4173 --strictPort > "$TEMP/preview.log" 2>&1 &)
for i in $(seq 1 30); do curl -s -o /dev/null http://localhost:4173/cargo-query/ && break; node -e 'setTimeout(()=>{},500)'; done
bash scripts/check-deploy.sh http://localhost:4173/cargo-query/; echo "exit=$?"
STRICT=1 bash scripts/check-deploy.sh http://localhost:4173/cargo-query/ >/dev/null; echo "strict exit=$?"
bash scripts/check-deploy.sh http://localhost:4173/; echo "wrongbase exit=$?"
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 4173 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id \$_.OwningProcess -Force }"
npx vite build >/dev/null 2>&1   # restore dist/ to base '/'
npx tsc --noEmit && echo TSC_OK
```
Expected: dòng đầu là `src="/cargo-query/assets/index-<hash>.js"`. Tiếp theo là 5 dòng giống mục 4 của "Kết quả kiểm chứng" (2 dòng WARN cho `.wasm` không nén), rồi `exit=0`, `strict exit=1`, `FAIL index.html has no assets/index-*.js under http://localhost:4173/`, `wrongbase exit=1`, `TSC_OK`. Nếu máy không phải Windows, thay dòng `powershell …` bằng `kill $(lsof -ti tcp:4173)`.

- [ ] **Step 4: Commit**

```bash
git add scripts/check-deploy.sh
git commit -m "ci: post-deploy curl check for DB assets"
```

---

### Task 5: `public/_headers` cho phương án Cloudflare Pages

**Files:**
- Create: `public/_headers`

**Interfaces:**
- Produces: file `dist/_headers`, được Vite copy từ `public/`. Cloudflare Pages và Netlify đọc file này. GitHub Pages bỏ qua nó (file chỉ được phục vụ như một file tĩnh, vô hại).

- [ ] **Step 1: Xác nhận chưa có (đỏ)**

Run: `npx vite build >/dev/null 2>&1; test -f dist/_headers && echo PRESENT || echo MISSING`
Expected: `MISSING`

- [ ] **Step 2: Viết `public/_headers`** (theo devops §1.4; đường dẫn ứng với build base `/`, là base dùng cho Cloudflare)

```
# Cloudflare Pages only (GitHub Pages ignores this file). Valid for a build with base '/'.
/assets/*
  Cache-Control: public, max-age=31536000, immutable

/
  Cache-Control: no-cache
/index.html
  Cache-Control: no-cache
```

- [ ] **Step 3: Xác nhận PASS**

Run: `npx vite build >/dev/null 2>&1; test -f dist/_headers && echo PRESENT; node scripts/check-budget.mjs >/dev/null; echo "budget exit=$?"; npx tsc --noEmit && echo TSC_OK`
Expected: `PRESENT`, `budget exit=0`, `TSC_OK`

- [ ] **Step 4: Commit**

```bash
git add public/_headers
git commit -m "build: keep Cloudflare Pages cache headers for an optional host switch"
```

---

### Task 6: Workflow CI + deploy GitHub Pages, và runbook

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `docs/ops/deploy.md`

**Interfaces:**
- Consumes: `npm run typecheck`, `npm test` (package.json hiện có), `scripts/check-budget.mjs` (Task 2), `scripts/check-deploy.sh` (Task 4), `GITHUB_SHA` → `__BUILD__` (Task 1)
- Produces:
  - Workflow `ci`. Kích hoạt khi có `pull_request`, `push` lên `main` và `workflow_dispatch`.
  - Job `build`: chạy trên mọi trigger. Chỉ upload artifact Pages khi không phải PR.
  - Job `deploy`: chỉ chạy khi `github.ref == 'refs/heads/main'` và không phải PR. Environment `github-pages`.
  - Biến repo tùy chọn `vars.PAGES_BASE` ghi đè base. Mặc định là `/<tên repo>/`. Với user site (`<user>.github.io`) hoặc custom domain thì đặt `PAGES_BASE=/`.

- [ ] **Step 1: Kiểm workflow chưa có (đỏ)**

Run:
```bash
node -e "import('yaml').then(({parse})=>{const w=parse(require('fs').readFileSync('.github/workflows/ci.yml','utf8'));console.log(Object.keys(w.jobs).join(','))})"; echo "exit=$?"
```
Expected: `ENOENT: no such file or directory, open '.github/workflows/ci.yml'`, exit khác 0

- [ ] **Step 2: Viết `.github/workflows/ci.yml`**

```yaml
name: ci

on:
  pull_request:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    env:
      # Project site lives at https://<user>.github.io/<repo>/. Set repo variable PAGES_BASE=/ for a user site or custom domain.
      BASE: ${{ vars.PAGES_BASE || format('/{0}/', github.event.repository.name) }}
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24          # same major as dev machine (v24.18.0); gzip budget numbers measured on it
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm test
      - name: Build for GitHub Pages base
        run: npx vite build --base="$BASE"
      - name: Assert base path in index.html
        run: grep -q "src=\"${BASE}assets/index-" dist/index.html
      - run: node scripts/check-budget.mjs
      - if: github.event_name != 'pull_request'
        uses: actions/upload-pages-artifact@v5
        with:
          path: dist

  deploy:
    needs: build
    if: github.ref == 'refs/heads/main' && github.event_name != 'pull_request'
    runs-on: ubuntu-latest
    timeout-minutes: 10
    permissions:
      contents: read
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    concurrency:
      group: pages
      cancel-in-progress: false   # never cut a Pages deployment in half
    steps:
      - id: deployment
        uses: actions/deploy-pages@v5
      - uses: actions/checkout@v7
        with:
          sparse-checkout: scripts
      - name: Post-deploy check (GitHub Pages headers are not configurable; missing compression is WARN)
        env:
          PAGE_URL: ${{ steps.deployment.outputs.page_url }}
        run: |
          for i in 1 2 3; do
            bash scripts/check-deploy.sh "$PAGE_URL" && exit 0
            sleep 20
          done
          exit 1
```

Ghi chú:
- `npm run build` vẫn chạy `tsc --noEmit && vite build` cho local. CI tách `typecheck` ra thành bước riêng rồi gọi `npx vite build --base=…`, để không chạy `tsc` hai lần.
- Bước `grep -q` chặn trường hợp base bị đặt sai trước khi deploy.
- Biến `GITHUB_SHA` có sẵn trên runner, nên `__BUILD__` là SHA ngắn. Vì thế không test nào được kiểm `__BUILD__ === 'dev'`, và test của Task 1 chấp nhận cả hai dạng.
- PR từ fork vẫn chạy được job `build` vì job này không dùng secret.

- [ ] **Step 3: Kiểm cú pháp và cấu trúc workflow (PASS)**

Run:
```bash
node -e "import('yaml').then(({parse})=>{const w=parse(require('fs').readFileSync('.github/workflows/ci.yml','utf8'));console.log(Object.keys(w.jobs).join(','), w.jobs.deploy.needs, w.jobs.deploy.environment.name, w.jobs.build.steps.map(s=>s.uses||s.run||s.name).join(' | '))})"
npx tsc --noEmit && echo TSC_OK
```
Expected:
```
build,deploy build github-pages actions/checkout@v7 | actions/setup-node@v7 | npm ci | npm run typecheck | npm test | npx vite build --base="$BASE" | grep -q "src=\"${BASE}assets/index-" dist/index.html | node scripts/check-budget.mjs | actions/upload-pages-artifact@v5
TSC_OK
```

- [ ] **Step 4: Chạy lại chuỗi bước của job `build` ở local (Git Bash)**

Run:
```bash
BASE=/cargo-query/
npm ci && npm run typecheck && npm test \
  && MSYS_NO_PATHCONV=1 npx vite build --base="$BASE" \
  && grep -q "src=\"${BASE}assets/index-" dist/index.html && echo BASE_OK \
  && node scripts/check-budget.mjs; echo "exit=$?"
npx vite build >/dev/null 2>&1   # restore dist/ to base '/'
```
Lưu ý: dòng `BASE=/cargo-query/` chỉ là phép gán trong shell nên Git Bash không đổi giá trị. Việc đổi chỉ xảy ra khi truyền sang chương trình Windows, vì vậy bắt buộc có `MSYS_NO_PATHCONV=1` ở lệnh `vite build`.
Expected: mọi test PASS, `BASE_OK`, bảng budget toàn `ok`/`skip`, `exit=0`.

- [ ] **Step 5: Viết runbook `docs/ops/deploy.md`**

````markdown
# Deploy & vận hành — Cargo Query (bản DA)

Host mặc định: **GitHub Pages** qua GitHub Actions (`.github/workflows/ci.yml`). Không backend. Phương án thay thế: Cloudflare Pages (xem cuối file).

## 1. Thiết lập lần đầu (user làm trên GitHub, 1 lần)

1. Tạo repo GitHub và push nhánh `main`. GitHub Pages miễn phí có thể yêu cầu repo **public** (gói Free) **[chưa kiểm]**. Mặc định base là `/<tên repo>/`. Ví dụ repo `cargo-query` cho ra `https://<user>.github.io/cargo-query/`.
2. Settings → Pages → Build and deployment → Source: **GitHub Actions**.
3. Settings → Environments → `github-pages`. Environment này được tạo tự động ở lần deploy đầu. Giữ rule "Deployment branches: main".
4. Chỉ với user site `<user>.github.io` hoặc custom domain: Settings → Secrets and variables → Actions → Variables → `PAGES_BASE` = `/`.
5. Push lên `main`, hoặc Actions → ci → Run workflow trên `main`.

## 2. Mỗi lần deploy

- Push lên `main` sẽ chạy job `build` (typecheck, test, build có base, budget), sau đó chạy `deploy`, rồi tới bước "Post-deploy check".
- PR chỉ chạy `build`. GitHub Pages không có preview theo PR.
- Release nào nâng `SAVE_VERSION` thì **đi riêng**, không gộp với thay đổi rủi ro khác (amendments A8).

## 3. Nghiệm thu sau deploy

Chạy từ máy bất kỳ:

```bash
bash scripts/check-deploy.sh https://<user>.github.io/<repo>/
```

- `FAIL` (exit 1) nghĩa là thiếu file hoặc sai base. Phải rollback (mục 4).
- `WARN` thiếu `content-encoding` trên `.data` hoặc `.wasm`: GitHub Pages **không cho đặt header**, nên không sửa được bằng cấu hình. Ghi kết quả vào bảng dưới, rồi chọn một trong ba hướng: (a) chấp nhận lần tải đầu ~9.8 MB thay vì ~5.4 MB (devops §1.3); (b) chuyển sang Cloudflare Pages (mục 6) và nghiệm thu bằng `STRICT=1`; (c) spike BE: build `pglite.data.gz`, worker giải nén bằng `DecompressionStream` rồi truyền `fsBundle` (amendments F2, ngoài phạm vi plan deploy).
- Mở trang và chờ trạng thái DB "sẵn sàng".

| Ngày | URL | `.wasm` type / enc | `.data` type / enc | cache-control | Kết luận |
|---|---|---|---|---|---|
| (điền sau deploy đầu) | | | | | |

## 4. Rollback

GitHub Pages **không có nút rollback**, và artifact của `upload-pages-artifact` chỉ giữ **1 ngày** (mặc định `retention-days: 1`).

1. **Cách chuẩn: `git revert`.**
   ```bash
   git revert --no-edit <sha-lỗi>      # hoặc một dải: git revert --no-edit <cũ>..<mới>
   git push origin main
   ```
   Workflow tự build và deploy lại, mất khoảng 3–5 phút. Lịch sử `main` khớp với bản đang chạy.
2. **Cách nhanh khi cần ngay:** Actions → ci → chọn run **thành công gần nhất trước bản lỗi** trên `main` → **Re-run all jobs**. Không dùng "Re-run failed jobs" hay chỉ chạy lại `deploy`, vì artifact có thể đã hết hạn. Re-run sẽ build lại đúng SHA cũ. Sau đó vẫn phải `git revert`, vì lần push kế tiếp sẽ deploy lại HEAD của `main`. Run quá cũ (khoảng hơn 30 ngày) có thể không còn re-run được **[chưa kiểm]**. Khi đó chỉ còn cách 1.
3. **Sau rollback:**
   - GitHub Pages trả `index.html` với cache ngắn (thường `max-age=600`, **[chưa kiểm]**, đọc ở cột cache-control của mục 3). Người chơi nhận bản cũ ở lần tải sau, chậm nhất khoảng 10 phút.
   - Chunk lazy của bản mới mà tab cũ đang tham chiếu có thể bị 404. App bắt `vite:preloadError` và hiện thông báo "Có phiên bản mới, tải lại trang" (amendments F8, Plan 1 Task 10).
   - **Bẫy save version:** nếu bản bị rollback đã nâng save (v1 → v2), bản cũ sẽ từ chối save v2. Save cũ vẫn còn ở key `cargo-query-save.v1` (amendments A8). Vì vậy release nâng save phải đi riêng.
4. **Khi nào rollback:** `check-deploy.sh` FAIL; trang không lên "DB sẵn sàng"; hoặc người chơi gửi payload chẩn đoán cùng `kind` (`db-init-failed`, `chunk-load-failed`) sau bản mới.

## 5. Chẩn đoán từ người chơi

Nút "Sao chép thông tin chẩn đoán" (Plan 1c) copy JSON gồm `build`, `kind`, `sqlstate`, `errorName`, `timings`, `ua`. Đối chiếu `build` với 7 ký tự đầu của SHA trong Actions. Payload không bao giờ chứa SQL, message lỗi hay dữ liệu, nên **đừng hỏi người chơi gửi thêm SQL hay dữ liệu import**.

## 6. Chuyển sang Cloudflare Pages (tùy chọn, miễn phí)

1. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git → chọn repo.
2. Build command: `npm run build`. Output: `dist`. Biến môi trường `NODE_VERSION=24`. Base giữ mặc định `/` (không truyền `--base`), nên `public/_headers` (`/assets/*` immutable, `index.html` no-cache) có hiệu lực.
3. Nghiệm thu: `STRICT=1 bash scripts/check-deploy.sh https://<project>.pages.dev/`. Nếu `.wasm`/`.data` thiếu nén thì xử lý theo devops §1.3 (Compression Rule nếu có custom domain, nếu không thì hướng (c) ở mục 3).
4. Tắt deploy GitHub Pages: xóa job `deploy` trong `ci.yml`, giữ job `build` làm CI.
5. Rollback trên Cloudflare: Deployments → bản trước → Rollback.

## 7. Ngoài phạm vi

- Không có backend. Nhánh DE sau này dùng backend **Python chạy trên Kubernetes** và chưa mở plan. Bản phác backend + k6 ở `docs/team/devops.md` §4.2 chỉ để tham khảo.
- Không dùng Railway, Vercel, Supabase. Không có telemetry tự động.
````

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/ci.yml docs/ops/deploy.md
git commit -m "ci: GitHub Pages deploy workflow and ops runbook"
```

---

### Task 7: Deploy lần đầu và nghiệm thu (cần user thao tác trên GitHub)

**Files:**
- Modify: `docs/ops/deploy.md` (điền bảng nghiệm thu ở mục 3)

**Interfaces:**
- Consumes: mọi task ở trên, cùng repo GitHub mà user đã tạo. Hiện repo **chưa có remote** (`git remote -v` rỗng).
- Produces: URL GitHub Pages đang chạy, và một dòng kết quả nghiệm thu trong runbook.

- [ ] **Step 1: User làm mục 1 của `docs/ops/deploy.md`** (tạo repo, chọn Pages source là GitHub Actions, push `main`). Agent dừng ở đây và chờ user báo URL repo.

- [ ] **Step 2: Theo dõi workflow**

Run: `gh run watch --exit-status $(gh run list --workflow ci --branch main --limit 1 --json databaseId --jq '.[0].databaseId')`
Expected: job `build` và `deploy` đều ✓. Log của bước "Post-deploy check" có 5 dòng `ok`/`WARN`, không có dòng `FAIL`.

- [ ] **Step 3: Nghiệm thu từ máy local**

Run: `bash scripts/check-deploy.sh https://<user>.github.io/<repo>/; echo "exit=$?"`
Expected: `exit=0`. Chép nguyên các cột `type`/`enc`/`cache` của `.wasm` và `.data` vào bảng mục 3 của runbook. Nếu `.data` có `enc=-`, ghi kết luận "chưa nén, chờ user chọn (a)/(b)/(c)" và báo user. **Không** tự chuyển host.

- [ ] **Step 4: Smoke trên trình duyệt**

Mở `https://<user>.github.io/<repo>/`, DevTools → Network:
- Mọi request đều nằm dưới `/<repo>/assets/`, không có 404.
- Trạng thái DB chuyển sang sẵn sàng. Nếu UI mới chỉ là trang smoke của Plan 1 Task 2, dòng cuối trên trang phải là `DONE`.
- Console không có lỗi `wasm streaming compile failed`. Nếu có, ghi chú `.wasm` MIME vào runbook. Đây không phải lỗi chặn.

- [ ] **Step 5: Commit**

```bash
git add docs/ops/deploy.md
git commit -m "docs: record first GitHub Pages deploy acceptance"
```

---

## Tự kiểm plan

- D6: mặc định GitHub Pages qua Actions (Task 6); build dưới `/<repo>/` đã kiểm thật (Kết quả kiểm chứng, Task 4 Step 3); giữ `public/_headers` (Task 5); telemetry chỉ có nút copy, ở đây làm payload + test (Task 3), UI nút **chưa có task** (cần giao); không backend, DE dùng Python/K8s và để sau (runbook mục 7).
- F2: script `curl` sau deploy (Task 4) chạy trong CI và chạy tay (Task 7). Có ghi rõ mâu thuẫn "bắt buộc" so với "không cấu hình được header trên GitHub Pages".
- F3: CI chạy `npm ci`, typecheck, test, build, budget. Số ngân sách lấy từ devops §2. `sql-formatter` lấy từ D5.
- F9: allowlist đúng 6 trường, có test chống rò SQL/message/stack.
- Rollback: `git revert` hoặc re-run all jobs; có bẫy save version và chunk lazy (runbook mục 4).
