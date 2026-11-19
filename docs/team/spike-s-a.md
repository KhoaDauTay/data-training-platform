# Spike S-a: lưu DB đã seed để mở lần hai nhanh hơn

**Trạng thái: CHỈ BÁO CÁO** (L133 luồng L137). Không đổi `src/`, test hay CLAUDE.md. Prototype nằm ở nhánh **`spike/s-a-prototype`** (commit `a3b8369`, không gộp vào `main`): `spike.html`, `src/spike/{page,worker}.ts`, `src/spike/drive.mjs` (bộ chạy CDP), thêm `spike.html` vào `vite.config.ts`.

Ngày: 2026-11-19 · HEAD đo: `cc2b35d` · PGlite 0.5.16 · Edge 157.0.4341.60 headless.

Câu hỏi (roadmap v15 I3, D-N6, v7 §2.5): lưu cụm Postgres đã seed vào IndexedDB thì **lần mở thứ hai có nhanh hơn ≥ 2× ở cả ba domain** (Logistics `game`, E-com `ecom`, Finance `fin`) và `lab` không? Có đúng không (md5 seed, sandbox `BEGIN → ROLLBACK`, `restart()`, bảng CSV `sandbox`, nhiều tab, quota, đổi seed, giá kế hoạch chương 11)?

**Kết luận: ĐẠT (go)** cho đường `dumpDataDir()` → IndexedDB → `new PGlite({ loadDataDir })`. Lần hai nhanh hơn **5–8×** ở ba domain và 3× ở `lab`; dữ liệu, thống kê và giá kế hoạch giống hệt. **Không dùng `idb://`.**

## 1. Cách đo

- Trang riêng `spike.html` mở một worker. Worker chạy đúng mã của app: `initEngine` + `ensureSchema` (`src/db/init.ts`, `src/db/lab.ts`). Không qua `DbClient` hay UI, nên số là thời gian ở **tầng worker**. Trong app, phần không đổi (tải chunk nội dung, vẽ trang) cộng thêm vào cả hai vế, nên tỉ lệ thấy được sẽ thấp hơn.
- Mỗi lần "mở" là **một tiến trình Edge headless mới** trên cùng hồ sơ (`--user-data-dir`), tức là mở lại trình duyệt thật. Server: `npx vite preview --port 5204 --strictPort` (bản build có `spike.html`).
- Mỗi lượt dùng một hồ sơ mới và chạy 4 lần mở theo thứ tự:
  1. `cold`: seed. Đây là lần đầu, cache HTTP còn trống.
  2. `warm`: nạp tarball gzip từ IndexedDB.
  3. `warmraw`: nạp tarball không nén.
  4. `cold`: seed lại. Đây là **lần hai của app hôm nay**, cache HTTP đã ấm.

  Ở Finance, thứ tự `warm`/`warmraw` đảo lại để bỏ thiên lệch do thứ tự.
- Riêng `idb://`: dùng một hồ sơ khác, mở hai lần (lần 1 seed, lần 2 dùng lại).
- `readyMs` tính từ lúc worker nhận lệnh tới lúc schema dùng được:
  - với `cold`: `new PGlite()` + `waitReady` + `initEngine` + `ensureSchema`;
  - với `warm`: đọc IndexedDB + `new PGlite({ loadDataDir })` + `waitReady` + `initEngine`.
- **Tỉ lệ = `readyMs` của lần 4 (seed lại, cache ấm) ÷ `readyMs` của `warm`.** Không so với lần 1 vì lần 1 còn gồm cả việc tải wasm.
- Sau mỗi lần mở, kiểm cùng một bộ:
  - md5 các dòng của một bảng mỗi schema: `container_events` (Logistics), `lab.orders` (lab), `order_items` (E-com), `loan_snapshots` (Finance);
  - `Total Cost` của `EXPLAIN (FORMAT JSON) SELECT * FROM logistics.container_events WHERE container_id = 42`, đúng câu của index lab chương 11;
  - số dòng `pg_statistic`;
  - một vòng `BEGIN → SELECT → ROLLBACK`.
- **Máy rất bận**: CPU 96 % trong lúc đo, do các agent khác, PyCharm và Docker. Vì vậy có vài giá trị ngoại lai (một lần seed E-com 20 s, một lần `warm` E-com 8 s). Bảng ghi **trung vị [min–max]**: 3 lượt mỗi domain, E-com 5 lượt.
- `all` là cả bốn schema trong một cụm, như người chơi đã mở mọi thứ.

## 2. Số đo

### 2.1 Mở lần hai (ms, trung vị [min–max])

| Schema | Seed lại, cache ấm (hôm nay) | Nạp snapshot gzip | Nạp snapshot thô | **Tỉ lệ** (trung vị) | Tỉ lệ từng lượt | `idb://` lần 2 |
|---|---|---|---|---|---|---|
| Logistics `game` | 4 254 [3 243–4 433] | **528** [502–693] | 489 [403–490] | **8,1×** | 8,8 · 6,1 · 6,1 | 761 [735–807] |
| E-com `ecom` (5 lượt) | 5 243 [3 545–20 218] | **677** [444–8 088] | 577 [407–2 084] | **7,7×** | 0,8\* · 24 · 8,0 · 5,2 · 8,2 | 1 680 (1 lần; 1 lần treo, §4.2) |
| Finance `fin` | 2 192 [1 852–2 912] | **424** [386–650] | 484 [372–571] | **5,2×** | 4,5 · 5,2 · 4,8 | không đo |
| `lab` (General) | 1 430 [1 383–1 535] | **450** [402–713] | 496 [331–564] | **3,2×** | 2,0 · 3,4 · 3,4 | 805 [519–1 376] |
| Cả bốn (`all`) | 9 188 [6 209–37 320] | **1 660** [979–4 733] | 1 305 [955–13 922] | **5,5×** | 6,3 · 7,9 · 5,5 | không đo |

\* Lượt E-com đầu tiên rơi đúng lúc máy quá tải: `warm` mất 8,1 s, trong đó `loadDataDir` một mình 8,05 s, còn `warmraw` ngay sau đó chỉ 2,1 s. Bốn lượt còn lại đều từ 5,2× trở lên.

Cổng D-N6 (≥ 2× ở cả ba domain): **đạt** theo trung vị, kể cả `lab`. Ngưỡng của v7 §2.5 (lần hai ≤ 3 s): **đạt**. Mọi trung vị dưới 1,7 s; một domain đơn lẻ dưới 0,7 s.

Phần lời đến từ hai chỗ:
- bỏ được việc seed: 0,3 s (lab) tới 3,2–4,3 s (Logistics, E-com);
- `loadDataDir` bỏ qua cả `initdb`: khởi động máy rỗng mất 0,75–1,1 s, còn nạp snapshot cả boot lẫn dữ liệu chỉ mất 0,4–0,5 s.

Vì thế ngay cả người chỉ học SQL (`lab`) cũng nhanh hơn.

### 2.2 Cái giá ở lần đầu và dung lượng

| Schema | `dumpDataDir('gzip')` | `dumpDataDir('none')` | Ghi IndexedDB (gz) | Snapshot gz | Snapshot thô |
|---|---|---|---|---|---|
| `game` | 1 643 ms [1 098–1 723] | 126 ms | 69 ms | **15,1 MB** | 98,1 MB |
| `ecom` | 1 158 ms [748–3 388] | 100 ms | 101 ms | **11,2 MB** | 69,9 MB |
| `fin` | 760 ms [720–788] | 72 ms | 43 ms | **9,3 MB** | 66,4 MB |
| `lab` | 828 ms [485–882] | 73 ms | 75 ms | **5,5 MB** | 43,1 MB |
| cả bốn | 1 791 ms (1 lượt) | 113 ms | 62 ms | **27,4 MB** | 173,1 MB |

Đọc bảng:
- Cụm Postgres rỗng đã chiếm khoảng 40 MB thô / 5 MB gzip. Vì vậy snapshot `lab` gần như chỉ là phần nền.
- Snapshot gzip nạp nhanh ngang bản thô. Ở Finance, khi đảo thứ tự, gz 424 ms so với thô 484 ms. Vậy nên lưu gzip: nhỏ hơn 6×.
- Gzip bên trong `dumpDataDir` tốn 0,7–1,7 s và **giữ hàng đợi worker**: một lần Chạy gửi lúc đó phải chờ. Nên dump `'none'` (0,07–0,13 s trong hàng đợi), rồi nén bằng `CompressionStream` bên ngoài hàng đợi (§3).
- Quota hồ sơ headless khoảng 10,8 GB. Cả bốn schema chiếm 27 MB gz, tức 0,25 %.
- Hash SHA-256 của file seed + bản PGlite (kể cả tải chunk seed): 0–160 ms.

### 2.3 Đúng hay không (đã kiểm, không phải suy luận)

| Kiểm | Kết quả |
|---|---|
| md5 bảng dò sau nạp = sau seed | **Giống hệt** ở mọi lần mở và mọi cách (cold/warm/warmraw/idb). Ví dụ `container_events` `053691e4…`, 108 982 dòng; `loan_snapshots` `fe3336c3…`, 14 625 dòng. |
| Giá kế hoạch chương 11 | `Total Cost` = **2146.28** ở mọi lần mở, cả `all`. `pg_statistic` giữ nguyên: 496 dòng với `game`, 733 với `all`. Snapshot mang theo thống kê ANALYZE, không sinh mẫu mới, nên giá kế hoạch không thể lệch so với lúc seed. |
| `BEGIN → ROLLBACK` sau nạp | Chạy được. Snapshot nằm trong bộ nhớ (MEMFS), nên không gì ghi ngược về IndexedDB. |
| Bảng `sandbox` đi theo snapshot? | **Có, và sai**: bảng `UNLOGGED` (`sandbox.t`, 1 000 dòng) sau nạp **vẫn còn nhưng rỗng** (`relpersistence = u`, 0 dòng); bảng thường (`sandbox.l`) còn đủ dòng. Phải dọn `sandbox` khi nạp (§3). |
| `idb://`, chi phí mỗi lần Chạy | 82–194 ms cho một `BEGIN → SELECT count(*) → ROLLBACK`; trong bộ nhớ chỉ 2–11 ms. Nguyên nhân: idbfs đồng bộ hệ tệp sau mỗi câu, kể cả câu rollback. |
| `idb://`, dung lượng | Tăng sau mỗi lần mở: `game` 33,7 → 37,1 MB, `lab` 11,5 → 15,7 MB (WAL và tệp tạm ghi lại). |

## 3. Thiết kế nếu làm (v16, cùng gói PWA)

Một snapshot cho mỗi trình duyệt (không phải mỗi schema: `dumpDataDir` chụp **cả cụm**, nên "theo schema" như v7 §2.5 ghi là không làm được).

1. **Khóa và manifest.**
   - IndexedDB `cargo-query-snap`, store `snap`. Bản ghi `latest` = `{ format: 1, pglite: '0.5.16', schemas: { game: <hash>, lab: <hash>, … }, blob }`.
   - `<hash>` của mỗi schema tính **lúc build**: `define` trong `vite.config.ts` (node `crypto` đọc `src/db/**/*.sql`), không tính lúc chạy, để lúc nạp không phải tải chunk seed.
   - Hằng số là `SEED_HASH: Record<SchemaId, string>`.
2. **Khởi động worker.**
   - Đọc `latest`. Bản ghi hợp lệ khi `pglite` và `format` khớp và mọi `schemas[id] === SEED_HASH[id]`. Khi đó `new PGlite({ loadDataDir: blob })`, rồi `DROP SCHEMA sandbox CASCADE; CREATE SCHEMA sandbox; SET search_path …`, rồi đánh dấu các schema trong manifest là đã seed (`seeded` trong `lab.ts`).
   - Sai khóa, đọc lỗi hoặc nạp lỗi thì `new PGlite()` như hôm nay, **và xóa `latest`**. Đường dự phòng luôn là seed lại.
   - Một schema đổi hash: bỏ cả snapshot. Không vá từng schema trong cụm.
3. **Ghi snapshot.**
   - Sau mỗi `ensure` seed mới thành công, với điều kiện `sandbox` không có bảng:
     - đưa vào hàng đợi worker một bước `dumpDataDir('none')` (khoảng 0,1 s);
     - sau đó, ngoài hàng đợi, `blob.stream().pipeThrough(new CompressionStream('gzip'))` rồi `put('latest')`.
   - Chỉ thay `latest` khi tập schema mới chứa tập cũ, hoặc khi `latest` cũ không hợp lệ.
   - Bảng import CSV có sẵn thì bỏ qua lần ghi này: lần sau, khi `sandbox` còn trống, ghi lại.
   - Hai tab cùng ghi thì bản ghi sau đè bản ghi trước. Bản ghi chỉ là bộ nhớ đệm, nên đè không mất dữ liệu.
4. **`restart()`.** Worker mới nạp lại `latest`, nhanh hơn seed lại từng schema trong `ensured`. `DbClient` không đổi: `ensure` gửi lại thì thành no-op, vì `seeded` đã có schema đó. Import vẫn phát lại từ IndexedDB `cargo-query/imports` như cũ.
5. **Không đổi:** `seed.sql` và các bài test md5 (seed vẫn tất định, snapshot chỉ là bản chụp của nó), quy tắc L55 (vẫn seed tại máy, không tải DB dựng sẵn), `BEGIN → ROLLBACK`, `MAX_ROWS_WORKER`, timeout 5 s.
6. **Test** (Vitest, PGlite Node):
   - seed rồi dump rồi nạp: md5 các bảng ghim và `Total Cost` của ca chương 11 bằng nhau;
   - sai hash thì seed lại;
   - snapshot có bảng `sandbox` thì sau nạp `sandbox` rỗng.

   Phần IndexedDB kiểm tay, như Plan Import.
7. **Kích thước code**: khoảng 60–80 dòng trong worker (`src/db/snapshot.ts`), không thêm dependency. Main không đổi.

Ước lượng: **S–M (1–2 ngày)**, làm trước service worker PWA. Service worker cache asset; snapshot lo phần dữ liệu.

## 4. Rủi ro

### 4.1 Đường snapshot (`loadDataDir`)

| Rủi ro | Mức | Cách giữ |
|---|---|---|
| Lần đầu chậm thêm vì dump và gzip (0,7–1,8 s nếu nén trong hàng đợi) | V | Dump `'none'` trong hàng đợi (≤ 0,13 s), nén ngoài hàng đợi, ghi lúc rảnh. |
| Snapshot cũ sau khi đổi seed hoặc nâng PGlite | V | Khóa = hash seed lúc build + bản PGlite + `format`; sai thì bỏ và seed lại. Test md5 vẫn chặn seed lệch. |
| Bảng `sandbox` lọt vào snapshot (đã thấy: bảng UNLOGGED còn nhưng rỗng) | V | Chỉ ghi khi `sandbox` trống; khi nạp luôn `DROP SCHEMA sandbox CASCADE`. |
| Quota hoặc bị trình duyệt xóa (Safari xóa dữ liệu sau 7 ngày không dùng; chế độ riêng tư) | T | Chỉ là bộ nhớ đệm: mất thì seed lại. Không gọi `persist()`. Tối đa khoảng 27 MB. |
| Bộ nhớ đỉnh lúc nạp (blob gz + giải nén + MEMFS) | V, **chưa đo** | Đo bằng `performance.memory` hoặc DevTools trên điện thoại trước khi phát hành v16. |
| Nhiều tab | T | Mỗi tab một bản trong bộ nhớ; chỉ chia sẻ một bản ghi IndexedDB đọc/ghi nguyên khối. |
| Máy rất bận làm `loadDataDir` chậm (một lần 8 s) | T | Vẫn không chậm hơn seed trong cùng điều kiện; trung vị 0,4–0,7 s. |

### 4.2 Vì sao không dùng `idb://`

- Mỗi lần Chạy chậm thêm 80–190 ms, vì idbfs đồng bộ sau mỗi câu, kể cả câu `ROLLBACK`.
- Dung lượng phình sau mỗi lần mở.
- **Một lần mở thứ hai của E-com treo hơn 7 phút** và phải giết tiến trình. Máy đang quá tải nên chưa rõ nguyên nhân, nhưng đường này không có lối thoát.
- Hai tab ghi chung một thư mục dữ liệu sẽ hỏng DB. Cách PGlite giải quyết là `PGliteWorker` với bầu leader, mà CLAUDE.md đã cấm vì nó làm hỏng `terminate()`.
- `terminate()` sau timeout 5 s có thể cắt ngang lúc đang đồng bộ, để lại dữ liệu dở dang.
- Lần đầu chậm hơn: E-com 9,6 s so với khoảng 3–6 s khi seed trong bộ nhớ.

### 4.3 Giới hạn của chính spike

- Đo ở tầng worker, không qua UI. Không đo Chrome hay điện thoại.
- Máy bận nên dải số rộng.
- `idb://` chỉ đo ở Logistics và `lab` (3 lượt), E-com (1 lượt + 1 treo).
- Chưa đo bộ nhớ đỉnh.

## 5. Đề xuất

**Go cho v16**: làm snapshot (§3) trước, rồi PWA service worker viết tay (D-N6). Cổng phát hành v16 cho phần này:
- đo lại trong app (mốc `db:ensure:<schema>` và "Data ready"), Edge + Chrome, máy rảnh, 3 lần mỗi domain, ghi vào review-log;
- đo bộ nhớ đỉnh trên một máy yếu.

Nếu số trong app dưới 2× thì vẫn giữ snapshot (không hại) và hoãn PWA.
