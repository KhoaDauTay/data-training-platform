# Cargo Query — Plan Deploy: build dưới đường dẫn con, CI, ngân sách gzip, nghiệm thu, chẩn đoán, rollback

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuẩn bị deploy bản DA lên **GitHub Pages** (miễn phí, không backend) theo D6: build chạy được dưới đường dẫn con `/<repo>/`, file workflow CI (typecheck, test, build, ngân sách gzip), script `curl` kiểm tra sau deploy, `public/_headers` để có thể chuyển sang Cloudflare Pages, payload chẩn đoán theo allowlist **và nút "Sao chép thông tin chẩn đoán"** (Plan 1c Task 11, L8, P10), runbook và quy trình rollback. Phần chạm ra ngoài (tạo repo, push, bật Pages, Cloudflare) **chờ user** (L6).

**Architecture:** Site tĩnh thuần. Job `build` chạy `npm ci` → `tsc` → `vitest` → `vite build --base=/<repo>/` → `scripts/check-budget.mjs`, rồi đóng gói `dist/` bằng `actions/upload-pages-artifact`. Job `deploy` (chỉ trên `main`) gọi `actions/deploy-pages`, rồi chạy `scripts/check-deploy.sh` trên URL vừa deploy. `base` lấy từ CLI (`--base`), `vite.config.ts` giữ mặc định `/`, nên `npm run dev` và bản build cho Cloudflare không phải sửa gì. Mã build (`__BUILD__`, 7 ký tự đầu của SHA) được inject bằng `define` để payload chẩn đoán có trường `build`.

**Tech Stack:** như Plan 1. Không thêm dependency npm nào. GitHub Actions dùng `actions/checkout@v7`, `actions/setup-node@v7`, `actions/upload-pages-artifact@v5`, `actions/deploy-pages@v5` (major tag mới nhất, đã kiểm bằng `gh api repos/<action>/releases/latest` ngày 2026-11-16: v7.0.1, v7.1.0, v5.0.0, v5.0.1).

**Spec:** `docs/superpowers/specs/2026-11-16-cargo-query-design.md` §3 (Tải trang), §9b (Vận hành & deploy), §10. Nguồn số liệu: `docs/team/devops.md` §1–§5, `docs/team/amendments.md` F2, F3, F5, F9 và D6. Quyết định: `docs/team/decision-log.md` L6 (phần local / chờ user), L7 (code trên đĩa thắng plan), L8 (nút chẩn đoán), L37 (P10).

## Phần chạy được ngay và phần CHỜ USER (L6)

| Task | Nội dung | Ai chạy |
|---|---|---|
| 1 | `__BUILD__` qua `define` (sửa tối thiểu `vite.config.ts`, giữ `tailwindcss()`) | local, loop |
| 2 | `scripts/check-budget.mjs` (ngân sách gzip theo nhóm asset) | local, loop |
| 3 | `src/diagnostics.ts` (payload allowlist) | local, loop |
| 4 | `scripts/check-deploy.sh` + build `--base=/cargo-query/` + `vite preview` + kiểm asset | local, loop |
| 5 | `public/_headers` (cho phương án Cloudflare) | local, loop |
| 6 | **Viết** `.github/workflows/ci.yml` + runbook `docs/ops/deploy.md` + chạy lại các bước của job `build` ở máy; commit local, **không push** | local, loop |
| 7 | Nút "Sao chép thông tin chẩn đoán" (chuyển từ Plan 1c Task 11) | local, loop (+ cổng trình duyệt của orchestrator) |
| 8 | Tạo repo GitHub, push, bật Pages, deploy lần đầu, nghiệm thu trên URL thật | **CHỜ USER — không chạy trong loop** |
| 9 | Chuyển sang Cloudflare Pages (tùy chọn) | **CHỜ USER — không chạy trong loop** |

**Tiền đề:** Plan 1, 1b, 1c, 1d đã có code; Plan Import có thể đang chạy song song (đụng `client.ts`, `worker.ts`, `state.ts`, `modes.ts`, `main.ts`, i18n). Mọi anchor trong plan này đã kiểm trên cả HEAD trước và sau Plan Import (xem "Kết quả kiểm chứng" mục 1). **Task 7 thay thế Plan 1c Task 11**: khi Task 7 đã commit thì đánh dấu Plan 1c Task 11 là xong, **không** chạy lại (chạy hai lần sẽ thêm hai nút và hai khóa i18n trùng).

## Global Constraints

- Mọi ràng buộc của Plan 1 vẫn áp dụng: PGlite **0.5.16** pin, không đưa dữ liệu vào `innerHTML`, try/catch quanh `localStorage`/IndexedDB, và mọi bước "xác nhận PASS" đều chạy thêm `npx tsc --noEmit`, phải không có lỗi.
- **Không backend.** Nhánh DE sau này dùng backend **Python chạy trên Kubernetes**, ngoài phạm vi plan này.
- Không dùng Railway, Vercel hay Supabase. Không thêm dependency npm. Version của action trong workflow pin theo major tag ở trên.
- **Không push, không tạo repo, không bật Pages, không đụng Cloudflare** trong loop (L6). Commit chỉ ở local.
- **Code trên đĩa thắng plan (L7).** Mọi sửa đổi file có sẵn ở đây là thay thế theo anchor (`Sửa … — thay: … bằng: …`), không dán đè cả file. Anchor không khớp thì đọc file, áp phần chênh và báo.
- **Git Bash trên Windows tự đổi đường dẫn.** Mọi lệnh local có đối số bắt đầu bằng `/` (ví dụ `--base=/cargo-query/`), kể cả biến môi trường, phải có tiền tố `MSYS_NO_PATHCONV=1`. Nếu thiếu, `dist/index.html` chứa `src="/Users/khoa.huynh/AppData/Local/Programs/Git/cargo-query/assets/…"`. Runner Ubuntu của CI không bị lỗi này.
- Payload chẩn đoán chỉ chứa **đúng** các trường `build`, `kind`, `sqlstate`, `errorName`, `timings`, `ua`. Không bao giờ chứa SQL, `message`, stack, draft, save hay dữ liệu import. Không có `fetch`.
- Không bật COOP/COEP (devops §1.5).
- Không chạy `npm ci`/`npm install` ở máy trong loop: `node_modules` dùng chung với các agent khác. `npm ci` chỉ chạy trong CI.

## Quyết định sản phẩm/vận hành của plan này (P-D, cần user xem khi review)

| # | Quyết định | Lý do |
|---|---|---|
| P-D1 | Ngân sách gzip tính **theo nhóm** (regex tên file), mọi file rơi vào đúng một nhóm, nhóm cuối `rest` gom các chunk lazy còn lại (Mermaid và các phụ thuộc của nó như `elk`, `cytoscape`, `katex`; `sql-formatter` mà Rolldown đặt tên `esm-*`; `opfs`/`nodefs` của PGlite). Nhóm nào không có file thì FAIL. | Rolldown tách Mermaid thành ~70 chunk tên `*Diagram-*`, `chunk-*`; `sql-formatter` thành `esm-*`. Tiền tố `mermaid`/`sql-formatter` cũ chỉ khớp 2 file, phần còn lại (~1,5 MB gz) lọt khỏi ngân sách. |
| P-D2 | Số ngân sách = **số đo + 5%, làm tròn lên bội 10** (mở rộng quy tắc L6 từ `pglite-` sang mọi nhóm), nhưng không thấp hơn số của devops §2 khi số đo còn nằm dưới. Đo trên HEAD + toàn bộ Plan Import + Task 7. | L6 cho phép chỉnh `pglite-` theo số đo + 5%. Các nhóm khác chưa có số chuẩn (devops ghi Mermaid "chưa đo"). |
| P-D3 | **`main` (index-*.js) = 270 KB, vượt mốc 250 KB của devops §2/F3** (FCP: "main entry ≤ 250 KB gz"). Đo được 247 KB ở HEAD, 253 KB sau Plan Import. **Cần user xem**: chấp nhận 270 hay giao task tách chunk (CodeMirror/d3 lazy). | Không tự hạ chức năng; CI phải xanh để còn bắt hồi quy tiếp theo. |
| P-D4 | CSS (`index-*.css`) có nhóm riêng `css`, 20 KB. | Tiền tố `index-` cũ cộng cả CSS Tailwind vào JS (258 KB ở HEAD → FAIL). |
| P-D5 | `check-deploy.sh` đi thêm chuỗi worker → `parser-*.js` → `libpg-query-*.js` → `libpg-query-*.wasm` và báo `type/enc` của wasm này. Không kiểm từng chunk Mermaid (chỉ kiểm một chunk bằng tay ở Task 4). | libpg-query wasm (~1,7 MB, 334 KB gz) là asset lớn thứ ba; chunk Mermaid là JS nhỏ, GitHub Pages nén JS bình thường. |
| P-D6 | Nút chẩn đoán bỏ qua thêm `DbFailedError` khi lọc `js-error` (Plan 1c chỉ liệt kê `SqlError`, `QueryTimeoutError`, `DbRestartError`, `WorkerTaskError`). | Khi DB hỏng, mọi query đang chờ bị reject `DbFailedError`; nếu một promise không được bắt, `kind` sẽ bị ghi đè từ `db-init-failed` thành `js-error`. |

## File Structure

```
vite.config.ts                 Modify (2 anchor): import loadEnv + define __BUILD__ (giữ tailwindcss())
src/env.d.ts                   Create: declare const __BUILD__: string
src/diagnostics.ts             Create: buildDiagnostics, diagnosticsText, uaFamily (allowlist)
scripts/check-budget.mjs       Create: ngân sách gzip theo nhóm asset
scripts/check-deploy.sh        Create: curl kiểm tra sau deploy (status, content-type, content-encoding)
public/_headers                Create: header cho Cloudflare Pages (GitHub Pages bỏ qua file này)
.github/workflows/ci.yml       Create: build + test + budget + deploy GitHub Pages (chỉ chạy khi user push)
docs/ops/deploy.md             Create: runbook (thiết lập lần đầu, nghiệm thu, rollback, chuyển Cloudflare)
CLAUDE.md                      Modify: một dòng lệnh check-budget
tests/build-info.test.ts       Create
tests/diagnostics.test.ts      Create
src/db/client.ts               Modify (Task 7): onTimeout
src/state.ts                   Modify (Task 7): app.problem, actions.copyDiagnostics
src/ui/topbar.ts               Modify (Task 7): nút trong #db-status
src/main.ts                    Modify (Task 7): ghi sự cố, copyDiagnostics
src/i18n/vi.ts, src/i18n/en.ts Modify (Task 7): diag.copy, diag.copied, diag.manual
```

## Kết quả kiểm chứng

Đã chạy thật ngày 2026-11-17 bằng cách replay plan này (script đọc các khối `Tạo`/`Sửa … — thay/bằng`) lên bản `git archive` của repo, Windows + Git Bash, Node v24.18.0, Vite 8.3.8.

**1. Replay ở ba trạng thái, mọi anchor khớp đúng 1 lần (26 thao tác):**
- HEAD trước Plan Import (`7ae0731`) + plan này: `tsc` sạch, 35 file / 456 test PASS, build OK, budget toàn `ok` (`main` 248 KB).
- HEAD `30a4ff8` (Plan Import Task 1–6) và `c5af0a1` (Plan Import xong cả Task 7) + plan này: `tsc` sạch, 40 file / 496 test PASS, build OK, budget toàn `ok` (`main` 253 KB).
- Plan Import Task 7 (chỉ nối vào cuối `CLAUDE.md`) chạy trước hoặc sau plan này đều khớp.
- Sau Task 1, `dist/assets/index-*.css` vẫn có (Tailwind không bị mất).

**2. `npx vite build --base=/cargo-query/` trong Git Bash mà thiếu `MSYS_NO_PATHCONV=1` là SAI**: Git Bash đổi `/cargo-query/` thành `C:/Users/…/Git/cargo-query/`, kể cả trong biến môi trường. Luôn dùng `MSYS_NO_PATHCONV=1` ở máy.

**3. `MSYS_NO_PATHCONV=1 npx vite build --base=/cargo-query/`: ĐÚNG.** `index.html` → `/cargo-query/assets/index-*.js`; `index-*.js` → `/cargo-query/assets/worker-*.js`; `worker-*.js` → `/cargo-query/assets/{pglite-*.wasm, pglite-*.data, initdb-*.wasm}`; `libpg-query-*.js` → `/cargo-query/assets/libpg-query-*.wasm`. Không còn chuỗi `"/assets/` nào trong `index-*.js`/`worker-*.js`.

**4. `vite preview --base=/cargo-query/` + `scripts/check-deploy.sh` (Task 4 Step 3):** 6 dòng (3 WARN cho `.wasm` không nén), `exit=0`; `STRICT=1` → `exit=1`; sai base → FAIL, `exit=1`; một chunk Mermaid (`erDiagram-*`) dưới base trả 200. `vite preview` nén `.js` và `.data` khi GET nhưng không nén `.wasm`. **Kết quả này không nói gì về GitHub Pages**: header của GitHub Pages (Fastly) không cấu hình được, việc nó có nén `.wasm`/`.data` hay không **[chưa kiểm]**, đo ở Task 8 Step 3 trên URL thật (L6: WARN cần user xem).

**5. Asset lớn (gzip -9 của Node):** `pglite-*.wasm` 3209 KB + `pglite-*.data` 2078 KB, `libpg-query-*.wasm` 334 KB, `initdb-*.wasm` 128 KB; Mermaid lazy ~70 chunk (lớn nhất `elk-*` 448 KB, `cytoscape.esm-*` 135 KB, `katex-*` 75 KB); `sql-formatter` nằm trong `esm-*` (20 KB). Tổng `dist/` ~24 MB chưa nén.

**6. Budget cũ của plan (tiền tố) FAIL trên code hiện tại:** `index-` cộng cả CSS = 258 KB ở HEAD trước Import (> 250), và tiền tố `mermaid`/`sql-formatter` chỉ khớp 2 file. Vì vậy Task 2 dùng nhóm (P-D1–P-D4).

**7. `__BUILD__`:** Vitest không có `GITHUB_SHA` → `'dev'`; `GITHUB_SHA=abcdef0123456` → test vẫn PASS. Sau Task 7, `GITHUB_SHA=0123456789abcdef npx vite build` cho ra `` build:`0123456` `` trong `index-*.js`.

---

### Task 1: Mã build `__BUILD__` qua `define`

**Files:**
- Modify: `vite.config.ts`
- Create: `src/env.d.ts`
- Test: `tests/build-info.test.ts`

**Interfaces:**
- Consumes: `loadEnv` (vite)
- Produces: global `declare const __BUILD__: string`: 7 ký tự đầu của `GITHUB_SHA` khi build trong CI, `'dev'` khi build local hoặc trong Vitest. `base` **không** khai báo trong file mà truyền bằng CLI `--base`.

- [ ] **Step 0: Kiểm anchor**

Run: `grep -c "plugins: \[tailwindcss()\]," vite.config.ts; grep -c "^import { defineConfig } from 'vitest/config';" vite.config.ts; test -e src/env.d.ts && echo EXISTS || echo NEW`
Expected: `1`, `1`, `NEW`. Nếu `vite.config.ts` đã khác (plan khác sửa), giữ mọi khóa đang có và chỉ thêm `loadEnv`, `const sha` và dòng `define`.

- [ ] **Step 1: Viết test (đỏ)**

**Tạo `tests/build-info.test.ts`:**
```ts
import { expect, it } from 'vitest';

it('__BUILD__ is a short git sha in CI or "dev" locally', () => {
  expect(__BUILD__).toMatch(/^([0-9a-f]{7}|dev)$/);
});
```

- [ ] **Step 2: Chạy, xác nhận FAIL**

Run: `npx vitest run tests/build-info.test.ts; npx tsc --noEmit`
Expected:
```
ReferenceError: __BUILD__ is not defined
      Tests  1 failed (1)
tests/build-info.test.ts(4,10): error TS2304: Cannot find name '__BUILD__'.
```

- [ ] **Step 3: Sửa `vite.config.ts` (2 chỗ, giữ `tailwindcss()`) và tạo `src/env.d.ts`**

**Sửa `vite.config.ts`** — thay:
```ts
import { defineConfig } from 'vitest/config';
```
bằng:
```ts
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

// GITHUB_SHA is set by GitHub Actions; local builds and tests report 'dev'.
// Read through loadEnv (it also reads process.env) because the repo has no @types/node.
const sha = loadEnv('', '.', 'GITHUB_SHA').GITHUB_SHA;
```

**Sửa `vite.config.ts`** — thay:
```ts
  plugins: [tailwindcss()],
```
bằng:
```ts
  plugins: [tailwindcss()],
  // No `base` here: GitHub Pages passes `--base=/<repo>/` on the CLI; '/' keeps dev and Cloudflare Pages unchanged.
  define: { __BUILD__: JSON.stringify(sha ? sha.slice(0, 7) : 'dev') },
```

**Tạo `src/env.d.ts`:**
```ts
/** Short git SHA of the build, injected by `define` in vite.config.ts ('dev' locally). */
declare const __BUILD__: string;
```

- [ ] **Step 4: Chạy, xác nhận PASS**

Run: `npx vitest run tests/build-info.test.ts && npx tsc --noEmit && echo TSC_OK`
Expected: `Tests  1 passed (1)` rồi `TSC_OK`.

Run: `GITHUB_SHA=abcdef0123456 npx vitest run tests/build-info.test.ts`
Expected: `Tests  1 passed (1)` (giá trị lúc này là `abcdef0`).

Run: `npx vite build >/dev/null 2>&1 && ls dist/assets/index-*.css`
Expected: in tên file `index-*.css` (Tailwind vẫn chạy). SHA trong bundle chỉ kiểm được từ Task 7, khi app code dùng `__BUILD__`.

Run: `npm test && npx tsc --noEmit && echo TSC_OK`
Expected: toàn bộ test cũ vẫn PASS, cộng thêm 1 test mới; dòng cuối `TSC_OK`.

- [ ] **Step 5: Commit**

```bash
git add vite.config.ts src/env.d.ts tests/build-info.test.ts
git commit -m "build: inject short git sha as __BUILD__"
```

---

### Task 2: Ngân sách gzip `scripts/check-budget.mjs`

**Files:**
- Create: `scripts/check-budget.mjs`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: thư mục asset sau build (mặc định `dist/assets`)
- Produces: CLI `node scripts/check-budget.mjs [dir]`. Mỗi nhóm in một dòng `ok  |FAIL`. **exit 1** khi một nhóm vượt ngân sách hoặc không có file nào (P-D1).

Ngân sách (KB, gzip -9 của Node; P-D1, P-D2):

| Nhóm | Tên file | Đo HEAD | Đo sau Import + Task 7 | Ngân sách | Nguồn |
|---|---|---:|---:|---:|---|
| `main` | `index-*.js` | 247 | 253 | **270** | P-D3 (devops §2/F3 ghi 250, **cần user xem**) |
| `css` | `index-*.css` | 11 | 11 | 20 | P-D4 |
| `worker` | `worker-*` | 132 | 133 | 160 | devops §2, F3 |
| `pglite` | `pglite-*` (`.wasm` + `.data`) | 5287 | 5287 | **5560** | L6: số đo + 5% (devops ghi 5300) |
| `initdb` | `initdb-*` | 128 | 128 | 140 | devops §2, F3 |
| `parser` | `libpg-query-*`, `parser-*`, `steps-*` (tab Thứ tự thực thi, lazy) | 390 | 390 | 410 | P-D2 (devops ghi `libpg-query` 380, chỉ tính wasm) |
| `rest` | mọi file còn lại: Mermaid + phụ thuộc, `sql-formatter` (`esm-*`), `opfs`/`nodefs` (lazy) | 1476 | 1476 | 1560 | P-D2 (devops ghi Mermaid 900 "chưa đo") |

Script không có unit test vì `tests/` được `tsc` kiểm kiểu, mà repo không có `@types/node`. TDD bằng một fixture vượt ngân sách (Step 1–3).

- [ ] **Step 1: Tạo fixture vượt ngân sách (đỏ: script chưa tồn tại)**

Run:
```bash
FX=$(mktemp -d) && node -e "require('fs').writeFileSync(process.argv[1]+'/index-big.js', require('crypto').randomBytes(300*1024))" "$FX" && node scripts/check-budget.mjs "$FX"; echo "exit=$?"
```
Expected: `Error: Cannot find module '…/scripts/check-budget.mjs'` rồi `exit=1`

- [ ] **Step 2: Viết `scripts/check-budget.mjs`**

**Tạo `scripts/check-budget.mjs`:**
```js
// Gzip budget per asset group (KB, gzip -9). Numbers and reasons: Plan Deploy Task 2 (devops §2, F3, L6, P-D1..P-D4).
// Usage: node scripts/check-budget.mjs [dir]   (default dist/assets)
import { readdirSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

// First match wins; 'rest' catches every lazy chunk Rolldown names after modules (Mermaid diagrams, sql-formatter as esm-*).
const GROUPS = [
  ['main', /^index-.*\.js$/, 270],
  ['css', /^index-.*\.css$/, 20],
  ['worker', /^worker-/, 160],
  ['pglite', /^pglite-/, 5560],
  ['initdb', /^initdb-/, 140],
  ['parser', /^(libpg-query|parser|steps)-/, 410],
  ['rest', /./, 1560],
];

const dir = process.argv[2] ?? 'dist/assets';
const sums = {};
for (const f of readdirSync(dir)) {
  const [name] = GROUPS.find(([, re]) => re.test(f));
  sums[name] = (sums[name] ?? 0) + gzipSync(readFileSync(`${dir}/${f}`), { level: 9 }).length / 1024;
}
let fail = false;
for (const [name, , budget] of GROUPS) {
  const kb = sums[name];
  const bad = kb === undefined || kb > budget; // a missing group means the build changed shape: look before deploying
  fail ||= bad;
  console.log(`${bad ? 'FAIL' : 'ok  '} ${name.padEnd(7)} ${kb === undefined ? 'not found' : `${kb.toFixed(0).padStart(5)} KB gz / ${budget} KB`}`);
}
process.exit(fail ? 1 : 0);
```

- [ ] **Step 3: Chạy lại fixture, xác nhận FAIL đúng lý do**

Run: lệnh ở Step 1.
Expected:
```
FAIL main      300 KB gz / 270 KB
FAIL css     not found
FAIL worker  not found
FAIL pglite  not found
FAIL initdb  not found
FAIL parser  not found
FAIL rest    not found
exit=1
```

- [ ] **Step 4: Chạy trên build thật, xác nhận PASS**

Run: `npx vite build >/dev/null 2>&1 && node scripts/check-budget.mjs; echo "exit=$?"; npx tsc --noEmit && echo TSC_OK`
Expected: 7 dòng `ok` với số gần cột "Đo" của bảng trên, rồi `exit=0` và `TSC_OK`.

Nếu một nhóm FAIL vì code đã lớn thêm từ lúc viết plan (không phải do PGlite đổi version): đo lại, đặt ngân sách nhóm đó = số đo + 5% làm tròn lên bội 10 (P-D2), ghi số cũ → mới vào báo cáo cho orchestrator. **Không** nới `pglite` khi PGlite không còn là 0.5.16.

Ghi chú bảo trì: `rest` tăng đột biến sau khi thêm thư viện là dấu hiệu chunk mới cần nhóm riêng.

- [ ] **Step 5: Thêm lệnh vào `CLAUDE.md`**

**Sửa `CLAUDE.md`** — thay:
```
npm run build                                 # typecheck + production build
```
bằng:
```
npm run build                                 # typecheck + production build
node scripts/check-budget.mjs                 # gzip budget per asset group (after a build); deploy runbook: docs/ops/deploy.md
```

- [ ] **Step 6: Commit**

```bash
git add scripts/check-budget.mjs CLAUDE.md
git commit -m "ci: gzip budget check per asset group"
```

---

### Task 3: Payload chẩn đoán theo allowlist (`src/diagnostics.ts`)

**Files:**
- Create: `src/diagnostics.ts`
- Test: `tests/diagnostics.test.ts`

**Interfaces:**
- Consumes: không có (hàm thuần). Task 7 truyền `__BUILD__` (Task 1), `navigator.userAgent`, lỗi bắt được và `timings` (`DbClient.timings` từ message `ready` của worker, F5, cộng `readyMs`) vào hàm này.
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
- **Không bao giờ** đọc `error.message`, `error.stack`, `detail` hay bất kỳ trường nào khác.
- Edge/Opera/Chromium được tính là `chrome`. iOS Chrome (`CriOS`) cũng tính là `chrome`.

- [ ] **Step 1: Viết test (đỏ)**

**Tạo `tests/diagnostics.test.ts`:**
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
Expected: `Error: Cannot find module '../src/diagnostics'` … `Test Files  1 failed (1)`

- [ ] **Step 3: Viết `src/diagnostics.ts`**

**Tạo `src/diagnostics.ts`:**
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
Expected: `Tests  4 passed (4)` rồi `TSC_OK`.

- [ ] **Step 5: Commit**

```bash
git add src/diagnostics.ts tests/diagnostics.test.ts
git commit -m "feat: allowlisted diagnostics payload builder"
```

---

### Task 4: Script kiểm tra sau deploy `scripts/check-deploy.sh` + chạy thử dưới `/cargo-query/` ở máy

**Files:**
- Create: `scripts/check-deploy.sh`

**Interfaces:**
- Consumes: URL gốc của site đã deploy, có hoặc không có `/` ở cuối
- Produces: CLI `bash scripts/check-deploy.sh <URL>`. Script đi theo chuỗi `index.html` → `assets/index-*.js` → `worker-*.js` → `pglite-*.wasm|data`, `initdb-*.wasm`, và `worker` → `parser-*.js` → `libpg-query-*.js` → `libpg-query-*.wasm` (P-D5), rồi in mỗi file một dòng `ok|WARN|FAIL <path> <status> type= enc= cache=`.
  - **FAIL (exit 1):** status khác 200, hoặc không tìm thấy chuỗi tham chiếu (sai `base`, đổi tên chunk).
  - **WARN:** `.wasm` không có `application/wasm` (PGlite tự fallback sang ArrayBuffer, devops §1.4), hoặc `.wasm`/`.data` không có `content-encoding`.
  - `STRICT=1`: thiếu `content-encoding` trên `.wasm`/`.data` thành FAIL. Dùng khi nghiệm thu Cloudflare Pages.

**Nói thẳng về GitHub Pages:** header (`Content-Type`, `Content-Encoding`, `Cache-Control`) **không cấu hình được**. Script mặc định chỉ WARN khi thiếu nén. Đây là chỗ khác với F2/spec §9b ("nghiệm thu nén bắt buộc"): trên GitHub Pages, nghiệm thu nén chỉ đo và ghi lại. **`.data`/`.wasm` không được nén trên GitHub Pages là WARN user phải xem khi deploy thật (L6)**; plan này không giải quyết (các hướng ở runbook §3).

- [ ] **Step 1: Chạy trước khi có script (đỏ)**

Run: `bash scripts/check-deploy.sh http://localhost:4173/cargo-query/; echo "exit=$?"`
Expected: `bash: scripts/check-deploy.sh: No such file or directory` rồi `exit=127`

- [ ] **Step 2: Viết `scripts/check-deploy.sh`**

**Tạo `scripts/check-deploy.sh`:**
```bash
#!/usr/bin/env bash
# Post-deploy check: every DB/parser asset is reachable under the deployed base, plus content-type/encoding report.
# Usage: bash scripts/check-deploy.sh https://<user>.github.io/cargo-query/   (STRICT=1: missing compression fails)
set -u
URL="${1%/}"
fail=0
get() { curl -fsS "$URL/$1"; }
MAIN=$(get "" | grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' | head -1)
[ -n "$MAIN" ] || { echo "FAIL index.html has no assets/index-*.js under $URL/"; exit 1; }
WORKER=$(get "$MAIN" | grep -oE 'worker-[A-Za-z0-9_-]+\.js' | head -1)
[ -n "$WORKER" ] || { echo "FAIL $MAIN does not reference worker-*.js"; exit 1; }
WJS=$(get "assets/$WORKER")
FILES=$(printf '%s' "$WJS" | grep -oE '(pglite|initdb)-[A-Za-z0-9_-]+\.(wasm|data)' | sort -u)
[ -n "$FILES" ] || { echo "FAIL $WORKER does not reference pglite/initdb assets"; exit 1; }
# The SQL parser (steps tab): worker -> parser-*.js -> libpg-query-*.js -> libpg-query-*.wasm
PARSER=$(printf '%s' "$WJS" | grep -oE 'parser-[A-Za-z0-9_-]+\.js' | head -1)
LIBJS=$([ -n "$PARSER" ] && get "assets/$PARSER" | grep -oE 'libpg-query-[A-Za-z0-9_-]+\.js' | head -1)
LIBWASM=$([ -n "$LIBJS" ] && get "assets/$LIBJS" | grep -oE 'libpg-query-[A-Za-z0-9_-]+\.wasm' | head -1)
[ -n "$LIBWASM" ] || { echo "FAIL no libpg-query-*.wasm via $WORKER -> parser-*.js -> libpg-query-*.js"; exit 1; }
for f in $MAIN "assets/$WORKER" $(printf 'assets/%s ' $FILES $LIBWASM); do
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
  printf '%-4s %-36s %s type=%s enc=%s cache=%s\n' "$verdict" "$f" "$status" "${type:--}" "${enc:--}" "${cache:--}"
done
exit $fail
```

Script dùng GET (`-o /dev/null -D -`) chứ không dùng HEAD, vì server có thể chỉ nén khi trả body (`vite preview` trả `content-encoding: gzip` cho GET nhưng không cho HEAD).

- [ ] **Step 3: Build dưới `/cargo-query/`, chạy preview, xác nhận PASS**

Run (Git Bash; preview chạy nền rồi được dừng theo port):
```bash
MSYS_NO_PATHCONV=1 npx vite build --base=/cargo-query/ >/dev/null 2>&1 && grep -o 'src="/cargo-query/assets/index-[^"]*"' dist/index.html
(MSYS_NO_PATHCONV=1 npx vite preview --base=/cargo-query/ --port 4173 --strictPort > "$TEMP/preview.log" 2>&1 &)
for i in $(seq 1 30); do curl -s -o /dev/null http://localhost:4173/cargo-query/ && break; node -e 'setTimeout(()=>{},500)'; done
bash scripts/check-deploy.sh http://localhost:4173/cargo-query/; echo "exit=$?"
STRICT=1 bash scripts/check-deploy.sh http://localhost:4173/cargo-query/ >/dev/null; echo "strict exit=$?"
bash scripts/check-deploy.sh http://localhost:4173/; echo "wrongbase exit=$?"
M=$(ls dist/assets | grep -m1 '^erDiagram-'); curl -s -o /dev/null -w "mermaid chunk %{http_code}\n" "http://localhost:4173/cargo-query/assets/$M"
```
Expected:
```
src="/cargo-query/assets/index-<hash>.js"
ok   assets/index-<hash>.js               200 type=text/javascript enc=gzip cache=no-cache
ok   assets/worker-<hash>.js              200 type=text/javascript enc=gzip cache=no-cache
WARN assets/initdb-BJaOLL_I.wasm          200 type=application/wasm enc=- cache=no-cache
ok   assets/pglite-BE2Di5Vw.data          200 type=- enc=gzip cache=no-cache
WARN assets/pglite-VfT9wtrq.wasm          200 type=application/wasm enc=- cache=no-cache
WARN assets/libpg-query-DwCfCEfv.wasm     200 type=application/wasm enc=- cache=no-cache
exit=0
strict exit=1
FAIL index.html has no assets/index-*.js under http://localhost:4173/
wrongbase exit=1
mermaid chunk 200
```

- [ ] **Step 4: Smoke trình duyệt dưới đường dẫn con (orchestrator giữ trình duyệt, L7)**

Giữ preview ở Step 3 chạy (hoặc chạy lại 2 dòng đầu), rồi orchestrator mở `http://localhost:4173/cargo-query/` trên Edge:
- DevTools → Network: mọi request nằm dưới `/cargo-query/assets/`, không có 404.
- Trạng thái DB chuyển sang "sẵn sàng". Chạy `SELECT 1` trong một ticket.
- Mở tab "Thứ tự thực thi" (tải `libpg-query-*.wasm`) và tab Sơ đồ ER (tải chunk Mermaid): cả hai hiện nội dung, không có 404.
- Console không có lỗi ngoài cảnh báo `wasm streaming compile failed` (nếu có; không chặn).

Agent không giữ trình duyệt thì ghi bước này là "chờ cổng trình duyệt" trong báo cáo và đi tiếp.

- [ ] **Step 5: Dọn**

Run:
```bash
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 4173 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id \$_.OwningProcess -Force }"
npx vite build >/dev/null 2>&1   # restore dist/ to base '/'
npx tsc --noEmit && echo TSC_OK
```
Expected: `TSC_OK`. Nếu máy không phải Windows, thay dòng `powershell …` bằng `kill $(lsof -ti tcp:4173)`.

- [ ] **Step 6: Commit**

```bash
git add scripts/check-deploy.sh
git commit -m "ci: post-deploy curl check for DB and parser assets"
```

---

### Task 5: `public/_headers` cho phương án Cloudflare Pages

**Files:**
- Create: `public/_headers`

**Interfaces:**
- Produces: file `dist/_headers`, được Vite copy từ `public/`. Cloudflare Pages và Netlify đọc file này. GitHub Pages bỏ qua nó (file chỉ được phục vụ như một file tĩnh, vô hại).

- [ ] **Step 1: Xác nhận chưa có (đỏ)**

Run: `test -d public && echo HAS_PUBLIC; npx vite build >/dev/null 2>&1; test -f dist/_headers && echo PRESENT || echo MISSING`
Expected: `MISSING` (repo chưa có thư mục `public/`).

- [ ] **Step 2: Viết `public/_headers`** (theo devops §1.4; đường dẫn ứng với build base `/`, là base dùng cho Cloudflare)

**Tạo `public/_headers`:**
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
Expected: `PRESENT`, `budget exit=0`, `TSC_OK` (`_headers` nằm ở `dist/`, không ở `dist/assets/`, nên không vào ngân sách).

- [ ] **Step 4: Commit**

```bash
git add public/_headers
git commit -m "build: keep Cloudflare Pages cache headers for an optional host switch"
```

---

### Task 6: File workflow CI + deploy GitHub Pages, và runbook (viết và commit local, **không push**)

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `docs/ops/deploy.md`

**Interfaces:**
- Consumes: `npm run typecheck`, `npm test` (package.json hiện có), `package-lock.json` (đã được git theo dõi, cần cho `npm ci` và `cache: npm`), `scripts/check-budget.mjs` (Task 2), `scripts/check-deploy.sh` (Task 4), `GITHUB_SHA` → `__BUILD__` (Task 1)
- Produces:
  - Workflow `ci`. Kích hoạt khi có `pull_request`, `push` lên `main` và `workflow_dispatch`. **Chỉ chạy khi user đã tạo repo và push (Task 8).**
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

**Tạo `.github/workflows/ci.yml`:**
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
- `npm run build` vẫn chạy `tsc --noEmit && vite build` cho local. CI tách `typecheck` thành bước riêng rồi gọi `npx vite build --base=…`, để không chạy `tsc` hai lần.
- Bước `grep -q` chặn trường hợp base sai trước khi deploy.
- `GITHUB_SHA` có sẵn trên runner, nên `__BUILD__` là SHA ngắn. Vì thế không test nào được kiểm `__BUILD__ === 'dev'`, và test của Task 1 chấp nhận cả hai dạng.
- PR từ fork vẫn chạy được job `build` vì job này không dùng secret.

- [ ] **Step 3: Kiểm cú pháp và cấu trúc workflow (PASS)**

Run:
```bash
node -e "import('yaml').then(({parse})=>{const w=parse(require('fs').readFileSync('.github/workflows/ci.yml','utf8'));console.log(Object.keys(w.jobs).join(','), w.jobs.deploy.needs, w.jobs.deploy.environment.name, w.jobs.build.steps.map(s=>s.uses||s.run||s.name).join(' | '))})"
git ls-files package-lock.json
npx tsc --noEmit && echo TSC_OK
```
Expected:
```
build,deploy build github-pages actions/checkout@v7 | actions/setup-node@v7 | npm ci | npm run typecheck | npm test | npx vite build --base="$BASE" | grep -q "src=\"${BASE}assets/index-" dist/index.html | node scripts/check-budget.mjs | actions/upload-pages-artifact@v5
package-lock.json
TSC_OK
```

- [ ] **Step 4: Chạy lại chuỗi bước của job `build` ở máy (Git Bash, không `npm ci`)**

Run:
```bash
BASE=/cargo-query/
npm run typecheck && npm test \
  && MSYS_NO_PATHCONV=1 npx vite build --base="$BASE" \
  && grep -q "src=\"${BASE}assets/index-" dist/index.html && echo BASE_OK \
  && node scripts/check-budget.mjs; echo "exit=$?"
npx vite build >/dev/null 2>&1   # restore dist/ to base '/'
```
`npm ci` bỏ ở bước này: `node_modules` dùng chung với agent khác (Global Constraints). Dòng `BASE=/cargo-query/` chỉ là phép gán trong shell nên Git Bash không đổi giá trị; việc đổi chỉ xảy ra khi truyền sang chương trình Windows, vì vậy bắt buộc `MSYS_NO_PATHCONV=1` ở lệnh `vite build`.
Expected: mọi test PASS, `BASE_OK`, bảng budget toàn `ok`, `exit=0`.

- [ ] **Step 5: Viết runbook `docs/ops/deploy.md`**

**Tạo `docs/ops/deploy.md`:**
````markdown
# Deploy & vận hành — Cargo Query (bản DA)

Host mặc định: **GitHub Pages** qua GitHub Actions (`.github/workflows/ci.yml`). Không backend. Phương án thay thế: Cloudflare Pages (mục 6).

> Mục 1, 3 (trên URL thật), 4 và 6 là thao tác của **user** (L6). Agent trong loop chỉ chạy được các lệnh local ở mục 2.

## 1. Thiết lập lần đầu (user làm trên GitHub, 1 lần) — CHỜ USER

1. Tạo repo GitHub và push nhánh `main`. GitHub Pages miễn phí có thể yêu cầu repo **public** (gói Free) **[chưa kiểm]**. Mặc định base là `/<tên repo>/`. Ví dụ repo `cargo-query` cho ra `https://<user>.github.io/cargo-query/`.
2. Settings → Pages → Build and deployment → Source: **GitHub Actions**.
3. Settings → Environments → `github-pages`. Environment này được tạo tự động ở lần deploy đầu. Giữ rule "Deployment branches: main".
4. Chỉ với user site `<user>.github.io` hoặc custom domain: Settings → Secrets and variables → Actions → Variables → `PAGES_BASE` = `/`.
5. Push lên `main`, hoặc Actions → ci → Run workflow trên `main`.

## 2. Mỗi lần deploy

- Trước khi push, chạy ở máy: `npm run typecheck && npm test && npm run build && node scripts/check-budget.mjs`. Thử dưới đường dẫn con: `MSYS_NO_PATHCONV=1 npx vite build --base=/cargo-query/ && MSYS_NO_PATHCONV=1 npx vite preview --base=/cargo-query/` rồi `bash scripts/check-deploy.sh http://localhost:4173/cargo-query/` (Git Bash trên Windows cần `MSYS_NO_PATHCONV=1`).
- Push lên `main` chạy job `build` (typecheck, test, build có base, budget), rồi `deploy`, rồi bước "Post-deploy check".
- PR chỉ chạy `build`. GitHub Pages không có preview theo PR.
- Release nào nâng `SAVE_VERSION` thì **đi riêng**, không gộp với thay đổi rủi ro khác (amendments A8).
- Ngân sách gzip (`scripts/check-budget.mjs`) có bảng số và lý do ở Plan Deploy Task 2. Nhóm `main` đang ở 270 KB, cao hơn mốc 250 KB của devops §2 (P-D3, cần user chốt).

## 3. Nghiệm thu sau deploy

Chạy từ máy bất kỳ:

```bash
bash scripts/check-deploy.sh https://<user>.github.io/<repo>/
```

- `FAIL` (exit 1) nghĩa là thiếu file hoặc sai base. Phải rollback (mục 4).
- `WARN` thiếu `content-encoding` trên `.data` hoặc `.wasm` (`pglite-*.data`, `pglite-*.wasm`, `initdb-*.wasm`, `libpg-query-*.wasm`): GitHub Pages **không cho đặt header**, nên không sửa được bằng cấu hình. **User phải xem** (L6). Ghi kết quả vào bảng dưới, rồi chọn một trong ba hướng: (a) chấp nhận lần tải đầu ~9,8 MB thay vì ~5,4 MB khi `.data` không nén (devops §1, §1.3; thêm ~1,7 MB nếu `libpg-query-*.wasm` cũng không nén); (b) chuyển sang Cloudflare Pages (mục 6) và nghiệm thu bằng `STRICT=1`; (c) spike: build `pglite.data.gz`, worker giải nén bằng `DecompressionStream` rồi truyền `fsBundle` (amendments F2, ngoài phạm vi plan deploy).
- Mở trang và chờ trạng thái DB "sẵn sàng"; mở tab Thứ tự thực thi và Sơ đồ ER một lần (chunk lazy).

| Ngày | URL | `.wasm` type / enc | `.data` type / enc | cache-control | Kết luận |
|---|---|---|---|---|---|
| (điền sau deploy đầu) | | | | | |

## 4. Rollback — CHỜ USER (cần quyền push)

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
   - Chunk lazy của bản mới mà tab cũ đang tham chiếu có thể bị 404. App bắt `vite:preloadError` và hiện thông báo "Có phiên bản mới, tải lại trang" (amendments F8).
   - **Bẫy save version:** nếu bản bị rollback đã nâng save (ví dụ v2 → v3), bản cũ sẽ từ chối save mới. Save cũ vẫn còn ở key `cargo-query-save.v<cũ>` (amendments A8). Vì vậy release nâng save phải đi riêng.
4. **Khi nào rollback:** `check-deploy.sh` FAIL; trang không lên "DB sẵn sàng"; hoặc người chơi gửi payload chẩn đoán cùng `kind` (`db-init-failed`, `chunk-load-failed`) sau bản mới.

## 5. Chẩn đoán từ người chơi

Nút "Sao chép thông tin chẩn đoán" (cạnh trạng thái DB, chỉ hiện khi có sự cố) copy JSON gồm `build`, `kind`, `sqlstate`, `errorName`, `timings`, `ua`. Đối chiếu `build` với 7 ký tự đầu của SHA trong Actions (`dev` = bản build ở máy). Payload không bao giờ chứa SQL, message lỗi hay dữ liệu, nên **đừng hỏi người chơi gửi thêm SQL hay dữ liệu import**.

## 6. Chuyển sang Cloudflare Pages (tùy chọn, miễn phí) — CHỜ USER

1. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git → chọn repo.
2. Build command: `npm run build`. Output: `dist`. Biến môi trường `NODE_VERSION=24`. Base giữ mặc định `/` (không truyền `--base`), nên `public/_headers` (`/assets/*` immutable, `index.html` no-cache) có hiệu lực.
3. Nghiệm thu: `STRICT=1 bash scripts/check-deploy.sh https://<project>.pages.dev/`. Nếu `.wasm`/`.data` thiếu nén thì xử lý theo devops §1.3 (Compression Rule nếu có custom domain, nếu không thì hướng (c) ở mục 3).
4. Tắt deploy GitHub Pages: xóa job `deploy` trong `ci.yml`, giữ job `build` làm CI.
5. Rollback trên Cloudflare: Deployments → bản trước → Rollback.

## 7. Ngoài phạm vi

- Không có backend. Nhánh DE sau này dùng backend **Python chạy trên Kubernetes** và chưa mở plan. Bản phác backend + k6 ở `docs/team/devops.md` §4.2 chỉ để tham khảo.
- Không dùng Railway, Vercel, Supabase. Không có telemetry tự động.
````

- [ ] **Step 6: Commit (local, không push)**

```bash
git add .github/workflows/ci.yml docs/ops/deploy.md
git commit -m "ci: GitHub Pages deploy workflow and ops runbook"
```

---

### Task 7: Nút "Sao chép thông tin chẩn đoán" (chuyển từ Plan 1c Task 11; L8, P10)

**Thay thế Plan 1c Task 11.** Bản ở đây đã đổi anchor của `client.ts` để chạy được cả trước và sau Plan Import (Import sửa đúng các dòng anchor cũ), và thêm `DbFailedError` vào bộ lọc (P-D6).

**Files:**
- Modify: `src/db/client.ts`, `src/state.ts`, `src/ui/topbar.ts`, `src/main.ts`, `src/i18n/vi.ts`, `src/i18n/en.ts`

**Interfaces:**
- Consumes: `__BUILD__` (Task 1), `buildDiagnostics`, `diagnosticsText`, `DiagnosticKind` (Task 3), `DbClient.timings` và measure `db:time-to-ready` (đã có trong `client.ts`).
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
    | `window` `error` / `unhandledrejection`, trừ lỗi của query (`SqlError`, `QueryTimeoutError`, `DbRestartError`, `WorkerTaskError`, `DbFailedError`) | `js-error` |

  - Payload: `timings` = `db.timings` + `readyMs` (measure `db:time-to-ready`); không có `fetch`; clipboard bị chặn thì nội dung hiện trong banner `#notice` bằng `textContent` (P10).
  - Khóa i18n: `diag.copy`, `diag.copied`, `diag.manual`.

- [ ] **Step 0: Kiểm tiền đề và anchor**

Run:
```bash
grep -c "export function buildDiagnostics\|export function diagnosticsText\|export type DiagnosticKind" src/diagnostics.ts
grep -c "__BUILD__" src/env.d.ts
grep -c "'diag.copy'" src/i18n/vi.ts
grep -c "      job.reject(new QueryTimeoutError(job.timeoutMs));" src/db/client.ts
grep -c "^export class DbClient {$" src/db/client.ts
grep -c "byId('db-status').replaceChildren(dbStatusView());" src/ui/topbar.ts
grep -c "^Object.assign(actions, { rerender, selectTicket, complete, retryDb: () => db.restart() });$" src/main.ts
```
Expected: `3`, `1`, `0`, `1`, `1`, `1`, `1`. Nếu `'diag.copy'` đã có (`1`): Plan 1c Task 11 đã chạy, bỏ task này và chỉ kiểm P-D6. Nếu dòng `Object.assign(actions, …)` đã khác (plan khác thêm action), thêm `copyDiagnostics` vào dòng hiện có thay vì thay cả dòng.

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
export class DbClient {
  timings?: DbTimings;
```
bằng:
```ts
export class DbClient {
  timings?: DbTimings;
  /** A query ran past its budget; called before the worker restarts (the diagnostics button). */
  onTimeout?: (e: QueryTimeoutError) => void;
```

**Sửa `src/db/client.ts`** — thay:
```ts
      job.reject(new QueryTimeoutError(job.timeoutMs));
      this.restart();
```
bằng:
```ts
      job.reject(new QueryTimeoutError(job.timeoutMs));
      this.onTimeout?.(new QueryTimeoutError(job.timeoutMs));
      this.restart();
```

Ghi chú: dòng `job.reject(…)` giữ nguyên từng ký tự vì Plan Import dùng nó làm anchor; `onTimeout` nhận một đối tượng lỗi riêng cùng `timeoutMs` (payload chỉ đọc `name`).

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
```
bằng:
```ts
  retryDb(): void {},
  copyDiagnostics(): void {},
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
import { DbClient, DbFailedError, DbRestartError, QueryTimeoutError, WorkerTaskError, type DbStatus } from './db/client';
import { SqlError } from './db/run';
import { buildDiagnostics, diagnosticsText } from './diagnostics';
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

/** Uncaught app errors only: query outcomes (player SQL errors, timeouts, restarts, worker task and DB failures) are normal play or already recorded. */
const fault = (error: unknown): void => {
  if (error instanceof SqlError || error instanceof QueryTimeoutError || error instanceof DbRestartError
    || error instanceof WorkerTaskError || error instanceof DbFailedError) return;
  app.problem = { kind: 'js-error', error };
  renderTopbar();
};
window.addEventListener('error', (e) => fault(e.error));
window.addEventListener('unhandledrejection', (e) => fault(e.reason));

Object.assign(actions, { rerender, selectTicket, complete, retryDb: () => db.restart(), copyDiagnostics: () => void copyDiagnostics() });
```

- [ ] **Step 5: Kiểm kiểu, test, build**

Run: `npx tsc --noEmit && npm test && npm run build && node scripts/check-budget.mjs`
Expected: `tsc` không lỗi; tất cả test PASS (gồm `tests/diagnostics.test.ts`, `tests/i18n.test.ts`); build xong; budget toàn `ok`.

Run: `GITHUB_SHA=0123456789abcdef npx vite build >/dev/null 2>&1 && grep -c 'build:`0123456`' dist/assets/index-*.js; npx vite build >/dev/null 2>&1`
Expected: `1` (SHA ngắn của CI đã vào payload; build lại để `dist/` về `dev`).

- [ ] **Step 6: Kiểm tay (cổng trình duyệt của orchestrator, L7)**

1. Bình thường: không có nút chẩn đoán. Lỗi cú pháp SQL cũng không làm nút hiện.
2. `SELECT count(*) FROM generate_series(1, 100000000)` → quá giờ, nút "Sao chép thông tin chẩn đoán" hiện. Bấm → clipboard chứa JSON chỉ gồm `build: "dev"`, `kind: "db-timeout"`, `errorName: "QueryTimeoutError"`, `timings`, `ua`; không có SQL.
3. DevTools > Network: chặn `pglite*.wasm`, tải lại → DB `failed` → nút hiện, `kind: "db-init-failed"`.
4. Chặn quyền clipboard → banner hiện "Không chép tự động được…" kèm JSON.

Agent không giữ trình duyệt thì ghi bước này là "chờ cổng trình duyệt" trong báo cáo.

- [ ] **Step 7: Commit**

```bash
git add src/db/client.ts src/state.ts src/ui/topbar.ts src/main.ts src/i18n/vi.ts src/i18n/en.ts
git commit -m "feat: copy-diagnostics button for DB and app faults (L8, replaces Plan 1c Task 11)"
```

---

### Task 8: Tạo repo, push, bật Pages, deploy lần đầu và nghiệm thu — **CHỜ USER — không chạy trong loop**

Loop dừng ở đây (L6: tạo repo, push, bật Pages là hành động công khai, cần user cho phép). Hiện repo **chưa có remote** (`git remote -v` rỗng).

**Files:**
- Modify: `docs/ops/deploy.md` (điền bảng nghiệm thu ở mục 3)

- [ ] **Step 1 (user): làm mục 1 của `docs/ops/deploy.md`** (tạo repo, chọn Pages source là GitHub Actions, push `main`), rồi báo URL repo.

- [ ] **Step 2: Theo dõi workflow** (sau khi user đã push)

Run: `gh run watch --exit-status $(gh run list --workflow ci --branch main --limit 1 --json databaseId --jq '.[0].databaseId')`
Expected: job `build` và `deploy` đều ✓. Log của bước "Post-deploy check" có 6 dòng `ok`/`WARN`, không có dòng `FAIL`.

- [ ] **Step 3: Nghiệm thu từ máy local**

Run: `bash scripts/check-deploy.sh https://<user>.github.io/<repo>/; echo "exit=$?"`
Expected: `exit=0`. Chép nguyên các cột `type`/`enc`/`cache` của `.wasm` và `.data` vào bảng mục 3 của runbook. **Nếu `.data`/`.wasm` có `enc=-`: đây là WARN user phải xem (L6)**; ghi kết luận "chưa nén, chờ user chọn (a)/(b)/(c)" và báo user. **Không** tự chuyển host.

- [ ] **Step 4: Smoke trên trình duyệt**

Mở `https://<user>.github.io/<repo>/`, DevTools → Network:
- Mọi request đều nằm dưới `/<repo>/assets/`, không có 404.
- Trạng thái DB chuyển sang sẵn sàng; tab Thứ tự thực thi và Sơ đồ ER mở được.
- Console không có lỗi `wasm streaming compile failed`. Nếu có, ghi chú `.wasm` MIME vào runbook (không chặn).

- [ ] **Step 5: Commit**

```bash
git add docs/ops/deploy.md
git commit -m "docs: record first GitHub Pages deploy acceptance"
```

---

### Task 9: Chuyển sang Cloudflare Pages (tùy chọn) — **CHỜ USER — không chạy trong loop**

Chỉ làm khi user chọn hướng (b) ở runbook mục 3. Các bước nằm ở `docs/ops/deploy.md` mục 6 (tạo project Cloudflare, nghiệm thu `STRICT=1`, xóa job `deploy` trong `ci.yml`). Cần tài khoản Cloudflare của user.

---

## Tự kiểm plan

- D6: mặc định GitHub Pages qua Actions (Task 6, deploy thật ở Task 8 chờ user); build dưới `/<repo>/` đã kiểm thật trên code hiện tại (Kết quả kiểm chứng, Task 4 Step 3); giữ `public/_headers` (Task 5); telemetry chỉ có nút copy (Task 3 payload + Task 7 nút); không backend.
- L6: phần local (Task 1–7) chạy được ngay; tạo repo/push/Pages/Cloudflare ở Task 8–9, ghi rõ "CHỜ USER". Thiếu nén `.data` trên GitHub Pages là WARN cần user xem (Task 4, Task 8 Step 3, runbook §3). `pglite` = số đo + 5%.
- L7: `vite.config.ts` sửa theo anchor, giữ `tailwindcss()` (Task 1 Step 4 kiểm `index-*.css`). Mọi file có sẵn sửa theo anchor.
- L8/P10: Task 7 thay Plan 1c Task 11, anchor chạy được trước và sau Plan Import.
- F2: script `curl` sau deploy (Task 4) chạy trong CI và chạy tay (Task 8). Ghi rõ mâu thuẫn "bắt buộc" so với "không cấu hình được header trên GitHub Pages".
- F3: CI chạy `npm ci`, typecheck, test, build, budget. Số ngân sách theo nhóm, có lý do (P-D1–P-D4); `main` vượt mốc 250 cần user xem.
- F9: allowlist đúng 6 trường, có test chống rò SQL/message/stack.
- Rollback: `git revert` hoặc re-run all jobs; có bẫy save version và chunk lazy (runbook mục 4).
