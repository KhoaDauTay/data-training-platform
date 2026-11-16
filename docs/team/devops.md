# Cargo Query — DevOps & Performance review

Ngày: 2026-11-16 · Người viết: DevOps (1 người) · Vai trò vòng này: **reviewer**, không sửa `src/`, `content/`, `package.json`, spec hay plan.

Ký hiệu độ tin cậy dùng xuyên suốt:
- **[đo]** — đo trực tiếp trên repo này (`node_modules`, `dist/` hiện có, Node 24.18, Vite 8.3.8).
- **[docs]** — lấy từ tài liệu chính thức của nhà cung cấp (link ở cuối).
- **[ước]** — ước tính, phải đo lại sau khi có bản build thật đủ tính năng.
- **[chưa kiểm]** — chưa kiểm chứng được.

---

## 0. Số liệu gốc đã đo

Đo trên `dist/assets` (bản build smoke của Task 2, Plan 1) bằng `gzip -9` và `brotli -q 11` **[đo]**:

| File | Raw | gzip | brotli | Ghi chú |
|---|---:|---:|---:|---|
| `pglite-*.wasm` | 9.09 MB | 3.25 MB | 2.57 MB | engine Postgres |
| `pglite-*.data` | 6.24 MB | **1.86 MB** | **1.07 MB** | filesystem image; MIME mặc định `application/octet-stream` |
| `initdb-*.wasm` | 299 KB | 129 KB | 108 KB | PGlite 0.5.x có tham chiếu `new URL('./initdb.wasm')` |
| `worker-*.js` | 484 KB | 134 KB | 89 KB | PGlite JS + init/seed |
| `opfs-ahp`, `memfs2opfs`, `nodefs`, runtime, external | ~20 KB | ~7 KB | ~6 KB | có thể không được tải khi dùng in-memory |
| `index-*.js` (smoke) | 2.4 KB | 1.2 KB | 1.0 KB | sẽ tăng khi có CodeMirror + UI |
| **Tổng phần DB** | **16.1 MB** | **5.37 MB** | **3.84 MB** | |

Hệ quả quan trọng: con số "data 6.2 MB" trong spike là **raw**. Nếu host không nén `.data`, lần tải đầu là ~3.25 + 6.24 + 0.27 ≈ **9.8 MB** thay vì 5.4 MB (gzip) hoặc 3.8 MB (brotli). Đây là chỗ chênh lệch lớn nhất của cả tài liệu, xem §1.3.

Các fact khác đọc từ `node_modules/@electric-sql/pglite@0.5.16/dist` **[đo]**:
- Không có chuỗi `SharedArrayBuffer`, `Atomics` hay `crossOriginIsolated` trong dist.
- Bộ nhớ WASM: `INITIAL_MEMORY` mặc định 134217728 (**128 MB**), `maximum: 32768` trang (**2 GB**). Có option `initialMemory`.
- Nạp wasm bằng `WebAssembly.instantiateStreaming`, lỗi thì log `wasm streaming compile failed` rồi **fallback sang ArrayBuffer**.
- Có option `pgliteWasmModule?: WebAssembly.Module`, `initdbWasmModule?`, `fsBundle?: Blob`, `loadDataDir?: Blob` và hàm `dumpDataDir('gzip')`. Đây là các điểm để tối ưu khởi động lại (§3.4).
- Hỗ trợ `COPY ... FROM '/dev/blob'` với option `blob`. Dùng cho tính năng import dữ liệu ngoài (§3.6).

---

## 1. Chọn nơi deploy

### 1.1 Các tiêu chí thật sự phân biệt được các host

Site là static thuần, nên chỉ có 5 tiêu chí đáng so:
1. Có đặt được **header tùy biến** không (`immutable` cho asset hash, `no-cache` cho `index.html`, `Content-Type` cho `.wasm`).
2. Có **nén `.wasm` / `.data`** không (xem 1.3).
3. **Base path**: `dist/index.html` hiện dùng đường dẫn tuyệt đối `src="/assets/index-….js"` **[đo]**. Nếu deploy ở dạng project site `https://<user>.github.io/<repo>/` thì vỡ, trừ khi đặt `base: '/<repo>/'` trong `vite.config.ts`. Host chạy ở domain gốc thì không cần sửa.
4. Có **preview deploy theo PR** không.
5. **Giới hạn bandwidth/file**, quy ra số lượt vào lần đầu mỗi tháng (mỗi lượt 5.4 MB gzip, hoặc 9.8 MB nếu `.data` không được nén).

### 1.2 So sánh

| | Cloudflare Pages | GitHub Pages | Netlify |
|---|---|---|---|
| Header tùy biến | file `_headers` | **không có** | file `_headers` / `netlify.toml` |
| Giới hạn file | 25 MiB/file, 20.000 file (Free) **[docs]**. `pglite.wasm` 9.1 MB vẫn dưới giới hạn | site ≤ 1 GB **[docs]** | [chưa kiểm] |
| Bandwidth | static asset không tính phí bandwidth **[chưa kiểm]**, cần đọc trang pricing hiện hành | soft limit 100 GB/tháng **[docs]** ≈ 18.500 lượt đầu ở 5.4 MB, ≈ 10.000 lượt nếu `.data` không nén | gói Free hiện tính theo credit **[chưa kiểm]** |
| Base path | domain gốc `*.pages.dev` → không cần sửa `base` | project site cần `base: '/<repo>/'` | domain gốc → không cần |
| Preview PR | có, mỗi branch một URL | không (chỉ 1 site) | có (Deploy Previews) |
| Nén `.wasm`/`.data` | xem 1.3: default list **không** có `application/wasm` hay `application/octet-stream` **[docs]** | [chưa kiểm] | [chưa kiểm] |
| Rollback | nút rollback về deployment cũ trong dashboard | chạy lại workflow cũ | nút publish deploy cũ |

**Đề xuất: Cloudflare Pages**, deploy từ GitHub Actions bằng `wrangler pages deploy dist`. Lý do: có `_headers`, preview theo branch, không phải sửa `base`, rollback 1 click. GitHub Pages chỉ là phương án dự phòng: không đặt được `Cache-Control`, nên mọi lượt quay lại vẫn phải revalidate 10+ request.

Đây là **quyết định của người dùng** (tài khoản Cloudflare, domain).

### 1.3 Nén `.wasm` và `.data`: tiêu chí nghiệm thu bắt buộc

Không host nào trong bảng được tài liệu xác nhận là tự nén `application/octet-stream`. Vì vậy với **mọi host, deploy đầu tiên phải qua bài kiểm này**:

```bash
URL=https://cargo-query.pages.dev
MAIN=$(curl -s $URL/ | grep -o 'assets/index-[^"]*\.js' | head -1)
WORKER=$(curl -s "$URL/$MAIN" | grep -o 'worker-[A-Za-z0-9_-]*\.js' | head -1)   # worker tham chiếu .data/.wasm
for f in $(curl -s "$URL/assets/$WORKER" | grep -oE 'pglite-[A-Za-z0-9_-]+\.(wasm|data)|initdb-[A-Za-z0-9_-]+\.wasm' | sort -u); do
  echo "== $f"
  curl -sI -H 'Accept-Encoding: br, gzip' "$URL/assets/$f" | grep -iE 'content-type|content-encoding|content-length|cache-control'
done
```

Kết quả đạt: `.wasm` có `content-type: application/wasm` và `content-encoding: br|gzip`; `.data` có `content-encoding`.

Nếu không đạt, xử lý theo thứ tự (dừng ở bước đầu tiên hiệu quả):
1. **Cloudflare có custom domain**: thêm Compression Rule match `application/wasm` và `application/octet-stream`. Tài liệu Cloudflare có ví dụ thêm `application/wasm` vào rule **[docs]**.
2. **Không dùng được rule** (ví dụ chỉ dùng `*.pages.dev`): BE tự nạp file đã nén. Lúc build sinh `pglite.data.gz` (gzip -9 = 1.86 MB), trong worker `fetch` → `DecompressionStream('gzip')` (API native) → `Blob` → `new PGlite({ fsBundle })`; với wasm thì `WebAssembly.compileStreaming` trên stream đã giải nén → `pgliteWasmModule`. Không thêm thư viện. Đây là việc của BE, cần 1 spike nhỏ để xác nhận `fsBundle` nhận đúng blob `.data`.

### 1.4 Header (`public/_headers`, Cloudflare Pages / Netlify)

```
/assets/*
  Cache-Control: public, max-age=31536000, immutable

/
  Cache-Control: no-cache
/index.html
  Cache-Control: no-cache
```

- File trong `assets/` có hash nội dung, nên cache 1 năm là an toàn. `index.html` là con trỏ tới các hash đó: `no-cache` nghĩa là luôn revalidate (304 rẻ), không phải "không cache".
- **MIME `.wasm`**: thiếu `application/wasm` **không làm hỏng** app. PGlite fallback sang ArrayBuffer **[đo]**, chỉ mất streaming compile (chậm hơn, tốn thêm bộ nhớ đỉnh ~9 MB). Vẫn phải kiểm bằng `curl` ở 1.3.
- File `content/` và ticket được bundle vào JS qua `import.meta.glob`, nên không có file nội dung nào đứng riêng cần header.

### 1.5 COOP/COEP: không cần

- PGlite 0.5.16: không dùng `SharedArrayBuffer`/`Atomics`/`crossOriginIsolated` **[đo, grep dist]**. Worker tự viết dùng `postMessage` thường.
- `libpg-query`, `pgsql-deparser`, `mermaid`: **[chưa kiểm]** vì chưa cài. Khi BE cài, chạy `grep -rl "SharedArrayBuffer\|crossOriginIsolated" node_modules/{libpg-query,pgsql-deparser,mermaid}`. Kết quả rỗng thì giữ kết luận này.
- **Không bật COOP/COEP "cho chắc"**: COEP `require-corp` sẽ chặn mọi tài nguyên cross-origin không có CORP header (font, analytics script).
- Hệ quả phụ: **không dùng** được `performance.measureUserAgentSpecificMemory()`, vì API này đòi cross-origin isolation. Đo bộ nhớ bằng cách khác (§3.3).

---

## 2. CI pipeline (GitHub Actions)

Phác thảo `.github/workflows/ci.yml`, **chưa tạo file** (vòng này chỉ review):

```yaml
name: ci
on:
  pull_request:
  push:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  build-test:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24          # khớp máy dev (v24.18.0)
          cache: npm
      - run: npm ci
      # `npm run build` đã chạy `tsc --noEmit && vite build`, nên không cần bước tsc riêng.
      - run: npm test             # vitest run; mỗi file test seed 1 DB ~2s
      - run: npm run build
      - run: node scripts/check-budget.mjs
      - uses: actions/upload-artifact@v4
        with: { name: dist, path: dist, retention-days: 7 }

  deploy:
    needs: build-test
    runs-on: ubuntu-latest
    permissions: { contents: read, deployments: write, pull-requests: write }
    steps:
      - uses: actions/download-artifact@v4
        with: { name: dist, path: dist }
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          # PR → preview URL theo branch; main → production
          command: pages deploy dist --project-name=cargo-query --branch=${{ github.head_ref || 'main' }}
```

Ghi chú:
- **Thời gian test**: Vitest cô lập module theo file, `seededDb()` seed 1 lần/file ~2s **[spike]**. Với ~8 file test (seed, grader, tickets, progress, save, content, viz/*) là ~16–20s seed, chia cho số worker của Vitest. Runner GitHub có 4 vCPU nên ước ~10–30s **[ước]**. Không cần cache DB.
- **Không chạy test trên trình duyệt trong CI** ở release này. Smoke `terminate()` của Task 2 vẫn chạy tay. Thêm Playwright khi có bug thật liên quan worker trên trình duyệt.
- PR từ fork không có secrets nên job `deploy` fail. Chấp nhận được (repo cá nhân/team).

### Script budget (`scripts/check-budget.mjs`, đề xuất, ~20 dòng, không thêm dependency)

```js
import { readdirSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

// gzip KB budgets per asset-name prefix; tune after the first full build.
const BUDGET = {
  'index-': 250,          // main entry: UI + CodeMirror (first paint path)
  'worker-': 160,         // PGlite JS + seed SQL
  'pglite-': 5300,        // .wasm 3250 + .data 1870 (measured 2026-11-16)
  'initdb-': 140,
  'mermaid': 900,         // lazy, ERD tab only (unmeasured: not installed yet)
  'libpg-query': 380,     // lazy, steps tab only (spike: ~345)
};
const sums = {};
for (const f of readdirSync('dist/assets')) {
  const key = Object.keys(BUDGET).find((k) => f.startsWith(k));
  if (key) sums[key] = (sums[key] ?? 0) + gzipSync(readFileSync(`dist/assets/${f}`), { level: 9 }).length / 1024;
}
let fail = false;
for (const [k, kb] of Object.entries(sums)) {
  const over = kb > BUDGET[k];
  fail ||= over;
  console.log(`${over ? 'FAIL' : 'ok  '} ${k.padEnd(12)} ${kb.toFixed(0)} KB gz / ${BUDGET[k]} KB`);
}
process.exit(fail ? 1 : 0);
```

Chunk của Mermaid sẽ có tên do Rolldown đặt (ví dụ `erDiagram-*`, `mermaid.core-*`). Sau lần build đầu có Mermaid thì chỉnh các prefix cho khớp.

---

## 3. Performance budget

### 3.1 Bảng ngân sách

"Laptop tầm trung" là CPU 4 nhân ~2020, mạng 50 Mbps. "Slow 4G" là profile Lighthouse: ~1.6 Mbps (~200 KB/s), RTT 150 ms, CPU throttle 4×.

| Chỉ số | Mục tiêu laptop | Mục tiêu Slow 4G | Cơ sở |
|---|---:|---:|---|
| FCP (inbox + ticket hiện, **chưa cần DB**) | ≤ 1.0 s | ≤ 3.0 s | main entry ≤ 250 KB gz; worker khởi động **sau** render đầu |
| Tải asset DB (cold, gzip 5.4 MB) | ~1 s | **~27 s** | 5.4 MB ÷ 200 KB/s **[ước]** |
| Tải asset DB (cold, brotli 3.8 MB) | ~0.7 s | ~19 s | **[ước]** |
| Tải asset DB nếu `.data` không nén (9.8 MB) | ~1.6 s | **~49 s** | lý do 1.3 là bắt buộc |
| Boot PGlite + seed | ~3 s | ~10–12 s | spike 1s + 2s, ×~4 do CPU throttle **[ước]** |
| **Time-to-DB-ready, lần đầu** | **≤ 5 s** | **≤ 40 s** (gzip) | tổng hai dòng trên |
| Time-to-DB-ready, lượt quay lại (HTTP cache) | ≤ 3.5 s | ≤ 12 s | không tải lại, chỉ còn compile + boot + seed |
| Khởi động lại worker sau timeout | ≤ 3.5 s (hiện ~3 s) | — | đọc từ HTTP cache + boot + seed; giảm được ở 3.4 |
| Query chương 1–7 trên seed (20k shipment) | p95 ≤ 300 ms | — | đo bằng test lặp lại Solution |
| Tab "Thứ tự thực thi" lần đầu (tải libpg-query ~345 KB gz) | ≤ 1 s | ≤ 3 s | lazy |
| Tab ERD lần đầu (Mermaid) | ≤ 1.5 s | ≤ 6 s | lazy, kích thước **[chưa kiểm]** |
| Bộ nhớ tab (Chrome Task Manager, "Memory footprint") | ≤ 400 MB | — | xem 3.3 |

Trên Slow 4G ~40 giây là **chấp nhận được vì đề bài đọc được ngay**. Spec §3 đã chốt render inbox/ticket trước. UI phải hiện tiến độ tải (byte đã tải / tổng) chứ không chỉ "Đang tải…". Đề xuất cho FE: trạng thái DB hiển thị `Đang tải database 2.1/5.4 MB`.

### 3.2 Cách đo

**a) `performance.mark` trong `DbClient` và worker** (đề xuất cho BE, ~10 dòng):
- Main: `performance.mark('db:spawn')` trong `start()`, `performance.mark('db:ready')` khi nhận `{type:'ready'}`, rồi `performance.measure('db:time-to-ready', 'db:spawn', 'db:ready')`.
- Worker: đo `bootMs` (sau `new PGlite()` + `await db.waitReady`) và `seedMs` (sau `initDb`), gửi kèm trong message: `{ type: 'ready', timings: { bootMs, seedMs } }`. Main ghi lại bằng `performance.measure('db:boot', { start, duration: bootMs })`. Thêm 1 field optional thì giao thức vẫn tương thích ngược.
- Timeout/restart: `performance.mark('db:restart')`, đo tới `db:ready` tiếp theo → `db:restart-cost`.

**b) Lighthouse CI** (job riêng, chạy tay hoặc nightly, không chặn PR): `npx @lhci/cli autorun` trên `vite preview`, 3 lần chạy, preset desktop và mobile (Slow 4G mặc định). Assert `first-contentful-paint` và `total-byte-weight`. Lighthouse không biết "DB ready", nên đọc `db:time-to-ready` từ mục **User Timing** của report.

**c) Bộ nhớ**: Chrome Task Manager (Shift+Esc), cột "Memory footprint" của tab và của dedicated worker. Đo 4 thời điểm: sau ready; sau 20 query; sau 3 lần timeout-restart (phát hiện rò rỉ worker cũ); sau khi mở tab ERD + Thứ tự thực thi. `performance.memory` chỉ có trên Chrome và không phản ánh đúng bộ nhớ WASM của worker, nên không dùng làm số chính thức.

### 3.3 Trần bộ nhớ PGlite

- Fact: wasm memory khởi tạo **128 MB**, tối đa **2 GB** **[đo]**. Mỗi worker có heap riêng. `terminate()` giải phóng toàn bộ heap của worker đó, nên không có rò rỉ tích lũy, miễn là `DbClient` không giữ tham chiếu worker cũ (code hiện tại gán đè `this.worker`, ổn).
- Rủi ro thật: **kết quả cực lớn**. `runSandboxed` lấy **toàn bộ** dòng về JS (grader so toàn bộ), rồi `postMessage` structured-clone sang main thread một lần nữa. Ví dụ `SELECT * FROM shipments a, shipments b LIMIT 5000000` có thể chạy xong dưới 5s nhưng tạo hàng GB trong JS → tab crash, không phải timeout.
- **Đề xuất cho BE**: trần dòng ở worker, ví dụ `MAX_ROWS = 50_000`. Bọc query người chơi thành `SELECT * FROM (<sql>) q LIMIT 50001` không được vì có thể làm sai nghĩa với `ORDER BY`/DML. Cách đúng là dùng option `rowMode`/đếm khi nhận kết quả, hoặc kiểm `rows.length > MAX_ROWS` trước khi `postMessage`, rồi trả lỗi "Kết quả quá lớn (>50.000 dòng)". Solution của mọi ticket đều nhỏ, test §9.1 kiểm được điều này.
- Ngân sách: tab ≤ 400 MB ở trạng thái thường **[ước, phải đo]**.

### 3.4 Chi phí khởi động lại worker (~3 s) và cách giảm

Thành phần **[ước]**: compile wasm 9 MB từ HTTP cache (~0.3–0.5 s) + boot PGlite (~0.5 s) + seed (~2 s). Seed là phần lớn nhất.

Đề xuất theo thứ tự lợi/chi phí (BE quyết định, **cần spike**):
1. **Snapshot sau seed**: sau `initDb` lần đầu, worker gọi `db.dumpDataDir('none')` và gửi `Blob` về main (structured clone). Main giữ blob trong bộ nhớ. Khi restart, worker mới nhận `{ type: 'init', snapshot }` → `new PGlite({ loadDataDir: snapshot })` thì bỏ được seed ~2s. Kích thước snapshot **[chưa kiểm]**, cần đo: 20k shipment + bảng con có thể vài chục MB raw. Restart dự kiến ~1 s.
2. **Chia sẻ module wasm đã compile**: `WebAssembly.Module` structured-clone được sang worker cùng origin, nên main truyền `pgliteWasmModule` cho worker mới để bỏ compile. Lợi ~0.3 s, chỉ làm nếu (1) xong mà vẫn chưa đạt mục tiêu.
3. **Không** dùng snapshot dựng sẵn lúc build để thay seed ở lần tải đầu. Nó tăng bytes tải xuống (đánh đổi 2s CPU lấy vài MB trên Slow 4G = tệ hơn) và phá đặc tính "seed tất định, vài KB".

### 3.5 Lazy chunks

| Chunk | Kích thước gz | Tải khi | Cách kiểm |
|---|---:|---|---|
| `libpg-query` wasm + JS | ~345 KB **[spike]** | mở tab "Thứ tự thực thi" lần đầu | DevTools Network trống trước khi click tab (Plan 1b Task bước kiểm 5) |
| Mermaid | **[chưa kiểm]**, budget 900 KB | mở tab ERD lần đầu | như trên |
| `world-atlas` land-110m + d3-geo | **[ước]** ~60–80 KB | ngay lúc tải trang (dải bản đồ luôn hiện) | nằm trong budget main entry; nếu vượt thì tách bằng `import()` sau FCP |
| PGlite (`worker-*`, wasm, data) | 5.37 MB | ngay, nhưng trong worker, sau FCP | — |

Rủi ro khi deploy chunk lazy: người chơi đang mở tab cũ, deploy mới xóa chunk hash cũ, click tab ERD thì `import()` 404. Cloudflare Pages giữ asset theo deployment, nhưng URL production trỏ sang deployment mới, nên **[chưa kiểm]** asset cũ còn truy cập được hay không. Đề xuất FE nghe `window.addEventListener('vite:preloadError', …)` và hiện "Có phiên bản mới, tải lại trang". Tiến độ đã lưu trong `localStorage` nên reload không mất gì, chỉ mất draft chưa debounce (500 ms).

### 3.6 Tính năng import dữ liệu ngoài (yêu cầu mới) dưới góc độ performance

- Import phải chạy **ngoài** `BEGIN … ROLLBACK` sandbox, vào schema riêng (ví dụ `lab`), bằng `COPY lab.x FROM '/dev/blob' WITH (FORMAT csv, HEADER)` + option `blob` của PGlite **[đo: API tồn tại]**. Parse CSV trong Postgres, không cần thư viện CSV ở JS.
- Giới hạn đề xuất: file ≤ 20 MB, ≤ 200.000 dòng, ≤ 5 bảng. Kiểm ở main trước khi gửi worker. Timeout 5s vẫn áp dụng cho câu `COPY`; file lớn cần timeout riêng 30s.
- **Restart worker xóa dữ liệu import** (DB in-memory). Phải lưu file gốc (IndexedDB, vì `localStorage` ~5 MB không đủ) và replay sau restart, nên chi phí restart tăng theo dữ liệu import. Snapshot ở 3.4(1) xử lý luôn chuyện này: dump sau khi import.
- Đây là chỗ dữ liệu người dùng thật đi vào app, nên ràng buộc observability ở §5 càng quan trọng.

---

## 4. Review RPS

### 4.1 RPS với site static trên CDN, nói thẳng

Bản này **không có origin server**. Toàn bộ SQL chạy trong trình duyệt, nên "RPS của hệ thống" ≈ **0 request lên server của mình**. Tải chỉ nằm ở CDN, chỉ xảy ra khi tải trang, và **không có request nào khi chơi** (chạy query, nộp bài, lưu tiến độ đều cục bộ). Câu hỏi RPS đúng cho bản này là:
1. Mỗi lượt vào sinh bao nhiêu request và bao nhiêu byte?
2. Bao nhiêu phần được cache ở trình duyệt / edge?
3. Host có giới hạn nào (bandwidth, request) chạm tới trước?

**Request mỗi lượt** (khi app đủ tính năng; con số chính xác pin bằng tab Network hoặc Lighthouse "network-requests"):

| | Lần đầu (cache rỗng) | Lượt quay lại (asset `immutable`) | Quay lại trên GitHub Pages (`max-age=600`) |
|---|---|---|---|
| `index.html` | 1 (200) | 1 (304 hoặc 200 nhỏ) | 1 |
| JS/CSS main + vendor chunk | 3–6 | 0 | 3–6 lượt revalidate (304) nếu > 10 phút |
| Worker + `pglite.wasm` + `pglite.data` + `initdb.wasm` + chunk fs | 4–7 | 0 | 4–7 revalidate |
| Lazy (Mermaid, libpg-query) | 0–4 khi mở tab | 0 | — |
| **Tổng request** | **~9–17** | **1** | **~9–14** |
| **Bytes** | **~5.7 MB gz** (5.37 DB + ~0.3 app) / ~4.1 MB br / ~10 MB nếu `.data` không nén | **~1–2 KB** | ~vài KB (304) |

**Quy đổi ra RPS ở edge**: giả sử bị chia sẻ lên một nhóm lớn, 1.000 người mở trong cùng 1 giờ. Tính ra 1.000 × 17 / 3.600 ≈ **5 RPS** trung bình ở edge, đỉnh có thể ×10 = 50 RPS. Con số này không đáng kể với bất kỳ CDN nào. Giới hạn chạm tới trước là **bandwidth**: 1.000 × 5.7 MB = 5.7 GB. Với GitHub Pages (100 GB/tháng soft) thì đó là ~17.500 lượt đầu mỗi tháng. Với Cloudflare Pages, static asset không bị giới hạn theo bandwidth (**[chưa kiểm]** với điều khoản hiện hành).

Kết luận: **không cần load test cho release DA**. Việc cần làm là (1) nén `.data` (§1.3: giảm gần một nửa bandwidth), (2) header `immutable` (lượt quay lại về 1 request).

### 4.2 Backend Python tương lai (track DE): phác thảo có điều kiện

Spec §10 để backend **ngoài phạm vi**. Phần dưới chỉ là bản nháp để khi người dùng mở plan DE có sẵn con số; **cần người dùng quyết định** trước khi làm bất cứ thứ gì.

**Khi nào thật sự cần backend:** chỉ khi có (a) tài khoản / leaderboard đồng bộ giữa máy, hoặc (b) bài DE về concurrency (lock, MVCC, isolation), vì PGlite là single-connection nên không mô phỏng được 2 session thật. Mọi bài DA và phần lớn bài DE (index, EXPLAIN) vẫn chạy trong PGlite.

**Kiến trúc:**

```
Browser ──HTTPS──► Cloudflare (static, như hiện tại)
   │
   └─► api.<domain>  FastAPI (uvicorn, 2 worker process)  ──► PgBouncer ──► Postgres 18 (managed, 2 vCPU/4 GB)
            │                                                (transaction mode: API thường)
            └─ /lab/* WebSocket ── session-mode pool riêng ──► Postgres DB `labs` (sandbox)
```

- **API thường** (accounts, progress sync, leaderboard): `asyncpg` pool `min=2, max=10` mỗi process, đi qua PgBouncer transaction mode. Leaderboard đọc từ materialized view `leaderboard_mv`, `REFRESH … CONCURRENTLY` mỗi 60s, và đặt header `Cache-Control: public, max-age=30` để CDN gánh phần đọc.
- **Lab concurrency**: mỗi người chơi giữ **2 kết nối thật** (session A/B) trong suốt bài, nên phải **session mode**, không qua transaction pooling (lock và transaction trải qua nhiều request). Sandbox: mỗi lab tạo `schema lab_<user_id>_<lab_id>` từ template bằng `CREATE TABLE … (LIKE …)` + seed nhỏ (≤ 10k dòng). Role `lab_player` chỉ có quyền trong schema đó: `REVOKE ALL ON SCHEMA public`, không `CREATE` ngoài schema riêng.
- **Giới hạn phía server** (Postgres thật thì có tác dụng, khác PGlite): `ALTER ROLE lab_player SET statement_timeout = '5s'`, `lock_timeout = '3s'`, `idle_in_transaction_session_timeout = '60s'`, `work_mem = '8MB'`, `temp_file_limit = '100MB'`. Job dọn schema lab không hoạt động > 30 phút.
- **Trần kết nối**: Postgres `max_connections = 200`. Lab dành 120, tức **tối đa 60 người làm lab đồng thời**; người thứ 61 vào hàng đợi, UI báo vị trí.

**Mục tiêu RPS** (quy mô team/công khai nhỏ: ~2.000 người dùng/tháng, đỉnh 200 online):

| Endpoint | RPS đỉnh mục tiêu | p95 | Cơ sở |
|---|---:|---:|---|
| `GET /leaderboard` | 100 (phần lớn hit CDN) | 50 ms origin | 200 online × refresh 30s ≈ 7 RPS; ×10 dự phòng |
| `PUT /progress` (sync save) | 20 | 150 ms | debounce 5s phía client, 200 online × 1/10s |
| `POST /auth/*` | 5 | 300 ms | |
| `POST /lab/{id}/exec` | 60 người × 1 query/3s ≈ **20** | 500 ms (không tính thời gian chờ lock cố ý) | bị chặn bởi trần 60 lab |
| Tạo lab (`POST /lab`) | 2 | 2 s | tạo schema + seed |

**Kế hoạch load test (k6)**, chạy trên môi trường staging cùng cỡ máy với production:

```js
// k6/de-backend.js — run: k6 run k6/de-backend.js
import http from 'k6/http';
import { check, sleep } from 'k6';

const API = __ENV.API;
export const options = {
  scenarios: {
    browse:   { executor: 'constant-arrival-rate', rate: 100, timeUnit: '1s', duration: '10m', preAllocatedVUs: 50, exec: 'leaderboard' },
    players:  { executor: 'ramping-vus', startVUs: 0, stages: [{ duration: '2m', target: 200 }, { duration: '6m', target: 200 }, { duration: '2m', target: 0 }], exec: 'syncProgress' },
    labs:     { executor: 'per-vu-iterations', vus: 70, iterations: 1, maxDuration: '15m', exec: 'lockLab' }, // 70 > 60 cap: expect 10 queued, not errors
  },
  thresholds: {
    'http_req_duration{scenario:browse}': ['p(95)<50'],
    'http_req_duration{scenario:players}': ['p(95)<150'],
    'http_req_failed': ['rate<0.01'],
  },
};
export function leaderboard() { check(http.get(`${API}/leaderboard`), { ok: (r) => r.status === 200 }); }
export function syncProgress() { http.put(`${API}/progress`, JSON.stringify({ version: 2, completed: ['ch1-01'], xp: 10 }), { headers: { 'Content-Type': 'application/json' } }); sleep(10); }
export function lockLab() { /* create lab → session A: BEGIN; UPDATE … → session B: same row (must block, hit lock_timeout 3s) → A: COMMIT → teardown */ }
```

Kịch bản và tiêu chí đạt:
1. **Đọc leaderboard 100 RPS / 10 phút**: p95 < 50 ms, CPU Postgres < 50%.
2. **200 người sync tiến độ**: p95 < 150 ms, số kết nối PgBouncer → Postgres ≤ 20.
3. **70 người cùng mở lab lock**: 60 vào được, 10 nhận trạng thái "queued" (HTTP 202) chứ không phải 5xx; không phiên nào giữ lock quá 60s (`idle_in_transaction_session_timeout` phải kích hoạt).
4. **Query độc trong lab** (`SELECT … FROM generate_series(1,1e9)`): bị cắt ở 5s bởi `statement_timeout`, các lab khác p95 không tăng quá 2×.
5. **Soak 1 giờ** ở 50% tải: không rò kết nối (`pg_stat_activity` ổn định), không rò schema lab.

---

## 5. Observability và rollback

### 5.1 Báo lỗi cho app static, không lộ dữ liệu người dùng

Dữ liệu nhạy cảm trong app: **SQL người chơi gõ, draft, nội dung message lỗi Postgres** (message có thể chứa giá trị, ví dụ `invalid input syntax for type integer: "<giá trị người dùng>"`), và từ nay có thêm **dữ liệu import ngoài** (có thể là dữ liệu công ty thật của người chơi).

**Allowlist payload**, chỉ gửi đúng các trường sau, không có gì khác:
```ts
{ build: string;               // git sha ngắn, inject qua `define: { __BUILD__ }`
  kind: 'db-init-failed' | 'db-timeout' | 'worker-crash' | 'chunk-load-failed' | 'js-error';
  sqlstate?: string;           // ví dụ '53200' (out of memory); KHÔNG gửi message
  errorName?: string;          // e.name, ví dụ 'RangeError'
  timings?: { bootMs: number; seedMs: number; readyMs: number };
  ua: 'chrome' | 'firefox' | 'safari' | 'other' }
```
Không gửi: SQL, `e.message` (lỗi Postgres hay JS đều có thể chứa dữ liệu), stack có tham số, `localStorage`, ticket draft, tên bảng import. Lỗi cú pháp SQL của người chơi là **hành vi bình thường**, không phải sự cố, nên không báo.

**Giai đoạn 1 (đề xuất, không cần quyết định)**: không dùng dịch vụ ngoài. Thêm nút "Sao chép thông tin chẩn đoán" ở thanh trạng thái DB khi `failed`/`timeout`; nút copy đúng payload trên để người chơi tự dán vào issue. Thêm Cloudflare Web Analytics (không cookie) để có page view và Core Web Vitals.

**Giai đoạn 2 (cần người dùng quyết định)**: gửi payload tự động. Có thể dùng Sentry (SDK ~30 KB gz, `beforeSend` cắt về allowlist, `sendDefaultPii: false`, tắt breadcrumbs console/fetch) hoặc một Cloudflare Worker 20 dòng ghi vào Workers Analytics Engine. Ưu tiên cách sau vì không thêm SDK vào bundle.

### 5.2 Rollback

1. **Cách làm**: Cloudflare Pages → Deployments → chọn bản trước → "Rollback". Có hiệu lực ngay, không cần build lại. Do có `index.html: no-cache`, người dùng nhận bản cũ ở lần tải tiếp theo. Asset hash cũ còn cache trong trình duyệt nên tải lại rất nhanh.
2. **Bẫy save version**: spec §8 quy định "từ chối save nếu `version` mới hơn bản game". Nếu bản mới nâng `version` (migration v1→v2) rồi phải rollback, mọi người chơi đã mở bản mới sẽ có save v2, và bản cũ **từ chối** save đó, nên người chơi thấy như mất tiến độ. Quy tắc phát hành:
   - Release nâng save version **không đi kèm** thay đổi rủi ro khác, và chỉ ship sau khi bản trước đó đã chạy ổn.
   - Trước khi ghi đè save, giữ bản cũ ở key `cargo-query-save.v<old>` (1 bản). Rollback xong, bản cũ đọc lại được key của chính nó. Đề xuất cho BE/save, ~5 dòng.
3. **Chunk lazy 404 sau deploy/rollback**: xử lý bằng `vite:preloadError` → gợi ý reload (§3.5).
4. **Điều kiện rollback**: smoke sau deploy fail (curl ở §1.3 + mở trang thấy "DB ready"), hoặc tỉ lệ `db-init-failed` tăng rõ trong analytics.

---

## 6. Việc cần các vai khác làm (tóm tắt)

| Ai | Việc | Mục |
|---|---|---|
| BE | `performance.mark` + `timings` trong message `ready` | 3.2 |
| BE | trần `MAX_ROWS` trước `postMessage` | 3.3 |
| BE (spike) | snapshot `dumpDataDir` → `loadDataDir` khi restart | 3.4 |
| BE | lưu save bản cũ trước migration | 5.2 |
| BE | import CSV qua `COPY … FROM '/dev/blob'`, schema `lab`, giới hạn 20 MB | 3.6 |
| FE | trạng thái tải DB theo byte; `vite:preloadError` → reload | 3.1, 3.5 |
| User | chọn host (đề xuất Cloudflare Pages) + tạo secrets CI; có dùng telemetry giai đoạn 2 không; có mở plan backend DE không | 1.2, 5.1, 4.2 |
| DevOps | tạo `ci.yml`, `scripts/check-budget.mjs`, `public/_headers` khi được phép sửa repo; chạy curl nghiệm thu deploy đầu | 1.3, 2 |

## Nguồn

- [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/): 25 MiB/file, 20.000 file (Free)
- [Cloudflare content compression](https://developers.cloudflare.com/speed/optimization/content/compression/): danh sách content-type được nén mặc định
- [Cloudflare Compression Rules: ví dụ Zstandard](https://developers.cloudflare.com/rules/compression-rules/examples/enable-zstandard/): có thêm `application/wasm`
- [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits): 1 GB site, 100 GB/tháng soft bandwidth
