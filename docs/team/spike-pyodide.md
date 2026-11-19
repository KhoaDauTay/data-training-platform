# Spike: Python/pandas trong trình duyệt bằng Pyodide (Track G, I7, D-N9, L139)

Ngày 2026-11-19. Chỉ là báo cáo spike, không thêm gì vào app. Không thêm dependency nào vào `package.json`.

Câu hỏi: một track Python/pandas có chạy được trong trình duyệt bên cạnh PGlite không? Track này cho người học nạp kết quả SQL vào DataFrame, làm groupby/merge/pivot, vẽ biểu đồ đơn giản và được chấm điểm như bài SQL.

**Kết luận ngắn:** chạy được và chấm được. Pandas sẵn sàng sau khoảng 14 MB tải về và 5–7 giây khi máy rảnh. Cái đắt là khởi động, không phải bài tập: lúc đầu hầu như chỉ tốn CPU, nên cache HTTP giúp ít. Đề xuất cho v18: **GO hẹp, có điều kiện** (§5).

## 1. Đã làm gì

- Pyodide **314.0.7** (bản npm `pyodide`, MPL-2.0, phát hành 2026-09-14; bản mới nhất là 314.0.8 ngày 2026-11-13, còn dưới 2 tuần nên không dùng). Python 3.14.2, ABI `pyemscripten_2026_0`, pandas 3.0.2, numpy 2.4.6.
- Trang tạm `spike-pyodide/` chạy bằng `npx vite --config spike-pyodide/vite.config.mjs --port 5205 --strictPort`. Trang mở hai worker:
  - worker PGlite dùng chính `initEngine`, `ensureSchema(db, 'lab')`, `runSandboxed` của repo (schema `lab`);
  - worker Pyodide riêng (module worker) tải `pyodide.mjs` bằng `import()`, rồi `loadPackage(['pandas'])`.
- Mã spike nằm ở nhánh `spike/pyodide-l139`, không merge, không có file `.whl`/`.wasm`.
- Kiểm bằng Edge headless (`--headless=new`), điều khiển qua CDP:
  - lần lạnh = profile mới;
  - lần ấm = điều hướng lần hai trong cùng trình duyệt, đọc từ cache HTTP;
  - kích thước lấy từ `PerformanceResourceTiming` trong worker, và từ gzip -9 trên file đã tải.
- Bài mẫu:
  - SQL `orders ⋈ order_items` (4.284 dòng × 8 cột) → DataFrame;
  - groupby doanh thu theo cửa hàng/kênh, merge với `stores`, pivot doanh thu tháng × cửa hàng;
  - chấm đúng và sai;
  - kết quả 50.000 dòng (`MAX_ROWS_WORKER`);
  - cột `numeric` và cột int có NULL;
  - bài làm trả về Series có khóa ở index;
  - biểu đồ cột bằng matplotlib → SVG.

**Lưu ý về độ tin cậy của số đo:** máy đo (16 luồng) đang chạy cùng các agent khác. Tải CPU lúc đo là 46–79%, với 22 tiến trình node. Số thời gian vì thế dao động 3–7 lần giữa các lượt. Bảng dưới ghi **lượt tốt nhất (máy rảnh)**, **trung vị** và **khoảng**. Mạng là đường truyền thật tới jsDelivr; tự host đo trên localhost.

## 2. Số đo

### 2.1 Cỡ tải (byte truyền qua mạng; jsDelivr nén br, tự host thì đo gzip -9)

| Nhóm | File | Truyền (CDN) | Giải nén |
|---|---|---|---|
| Lõi Pyodide | `pyodide.mjs`, `pyodide.asm.mjs`, `pyodide.asm.wasm`, `python_stdlib.zip`, `pyodide-lock.json` | **6,24 MB** | 13,5 MB |
| pandas + phụ thuộc | pandas 4,15 · numpy 2,93 · pytz 0,30 · dateutil 0,23 · six 0,01 | **7,62 MB** | 7,9 MB |
| **Tới lúc pandas dùng được** | | **≈ 13,9 MB** | ≈ 21,4 MB |
| matplotlib (tùy chọn) | matplotlib 6,87 · fonttools 1,12 · pillow 1,03 · pyparsing, packaging, contourpy, kiwisolver, cycler | +9,40 MB | +9,6 MB |

- File `.whl` vốn đã là zip: gzip chỉ bớt được khoảng 1%. Chỉ `.wasm` (9,6 MB → 3,5 MB gz) và `.mjs` là nén được nhiều.
- File lớn nhất là `pyodide.asm.wasm`, 9,6 MB khi chưa nén.
- Để so sánh, lần tải đầu của cả app hiện nay khoảng 5,4–9,8 MB (deploy.md).
- Ước lượng thời gian tải 13,9 MB: 10 Mbps ≈ 11 s; 3 Mbps ≈ 37 s.

### 2.2 Thời gian (Edge headless, CDN)

| Đo | Rảnh (tốt nhất) | Trung vị | Khoảng (n) |
|---|---|---|---|
| Lạnh: mở trang → pandas dùng được | **6,5–7,1 s** | 15,7 s | 6,5–44,8 s (7) |
| Ấm (cache HTTP): mở trang → pandas dùng được | **4,6 s** | 10,8 s | 4,6–27,8 s (6) |
| Lạnh, tách ra: lõi / `loadPackage` / `import pandas` | 2,8–3,2 / 0,9–1,2 / 2,6–2,8 s | | import tới 27,8 s khi máy bận |
| Ấm, tách ra: lõi / `loadPackage` / `import pandas` | 1,5–1,8 / 0,5–0,6 / 2,3–2,5 s | | |
| Tự host (localhost, lạnh) → pandas | 7,2 s | | 7,2–28,4 s (3) |
| PGlite sẵn sàng + seed `lab` (chạy song song, cùng trang) | 1,5–2,7 s | | |

Nhận xét:

- Khởi động **chủ yếu tốn CPU**: compile wasm và `import pandas`. Trên máy rảnh, cache HTTP chỉ bớt khoảng 2 s.
- Dưới tải CPU, lần ấm gần như chậm bằng lần lạnh (15,6 → 13,8 s; 13,4 → 12,1 s).
- Vì vậy điện thoại yếu sẽ chậm hơn rõ rệt. Spike chưa đo trên thiết bị thật.
- Một lượt tự host (kèm matplotlib, lúc máy bận) mất kết quả vì socket CDP bị đóng. Chưa rõ nguyên nhân: có thể là driver, cũng có thể Edge đã chết. Ba lượt chạy lại sau đó đều xong, nên lỗi không lặp lại.

### 2.3 Bài tập (sau khi pandas đã sẵn sàng; số khi rảnh, ngoặc là khi máy bận)

| Việc | Thời gian |
|---|---|
| SQL 4.284 dòng trong PGlite | 42 ms (110–315) |
| QueryResult → DataFrame: đường `toPy` / đường JSON | 23–33 ms (60–221) / ≈ 95 ms (chỉ đo lúc máy bận) |
| groupby / merge / pivot_table | 28–35 / 6–8 / 43–55 ms (tới 333 / 123 / 689) |
| Đổi hai DataFrame về QueryResult để chấm | 21 ms |
| 50.000 dòng × 8 cột: SQL / → DataFrame | 2,3 s / 372 ms (máy bận) |
| matplotlib: tải gói / hình đầu tiên / hình sau | 0,4–0,6 s / 1,9–2,0 s / 0,06–0,1 s (SVG 15,5 KB) |

### 2.4 Bộ nhớ

- Heap wasm của Pyodide: **75 MB** khi có pandas, **108 MB** khi thêm matplotlib (đọc `HEAPU8.length`). Đây là **cận dưới**, chưa tính heap JS của worker.
- Bộ nhớ riêng của tiến trình Edge dao động quá mạnh (0,5–1,3 GB cho tiến trình lớn nhất; có lượt chạy kèm Pyodide còn thấp hơn lượt chỉ PGlite). Vì vậy không dùng số này.
- Cần đo lại trên máy rảnh và trên một điện thoại Android tầm trung trước khi build.

### 2.5 Đo lại (V19-0, 2026-11-20)

**Kết luận: NO-GO** cho V20-A theo cổng của roadmap-v18-v20 §2.5. Máy rảnh thì đạt (ấm 5,8 s ≤ 10 s). Cổng CPU 4× (≤ 20 s) không chứng minh được: ước lượng là khoảng 21–23 s.

**Cách đo:**

- Prototype nhánh `spike/pyodide-l139` (1fc7396), checkout vào một worktree tạm, nay đã gỡ.
- Tự host trên `vite preview`, cổng 5231 (`Cache-Control: no-cache`, nên lần ấm là revalidate 304 + cache code wasm). File Pyodide 314.0.7 + pandas đã kiểm sha256 với `pyodide-lock.json`.
- Edge headless qua CDP. Mỗi phiên là một profile mới: lần lạnh, rồi lần ấm trong cùng trình duyệt. Chạy tuần tự, không chạy song song.
- Thay đổi so với L139 (chỉ trong worktree, không commit): worker PGlite seed cả **Logistics** (`game`) lẫn `lab`, đúng điều kiện "tab không bị kill" của cổng.
- "pandas sẵn sàng" = từ lúc mở trang tới khi cả PGlite đã seed lẫn `import pandas` đều xong (`pandasReadyWallMs`).

**Điều kiện máy (lệch cổng):**

- CPU nền là **24 % bận** (76 % rảnh) trong 60 s trước khi đo, không đạt mức < 15 %. Trong lúc đo là 45 % bận.
- Nguyên nhân: hai dev server Vite của user ở cổng 5173/5174 tự chiếm khoảng 1,6 luồng mỗi cái. Chúng phải chạy tiếp nên không tắt; các preview khác đang rảnh.
- Máy 16 luồng. Không có agent nào khác chạy.

**Số đo (trung vị của 5 lần; khoảng ghi trong ngoặc):**

| Đo | 1× lạnh | 1× ấm | CDP 4× lạnh* | CDP 4× ấm* |
|---|---|---|---|---|
| pandas sẵn sàng (PGlite Logistics+lab cùng chạy) | **6,84 s** (6,76–6,97) | **5,77 s** (5,71–5,93) | 7,23 s | 6,14 s |
| PGlite sẵn sàng (lab + Logistics) | 6,68 s | 5,41 s | 7,13 s | 5,75 s |
| Pyodide: lõi / `loadPackage` / `import pandas` | 2,41 / 0,97 / 3,46 s | 1,90 / 0,78 / 3,11 s | | |
| Chỉ Pyodide, không PGlite (n = 3) | 6,0–7,3 s | 5,1–5,3 s | | |
| Chỉ PGlite (n = 2) | 5,6–6,7 s | 4,8–5,2 s | | |

\* **CDP `Emulation.setCPUThrottlingRate` không áp cho worker.** Lệnh gửi tới phiên worker bị Edge từ chối ("Operation is only supported for pages, not workers"). Vòng lặp hiệu chuẩn chạy chậm 6,7× trên trang nhưng 1,0× trong worker. Pyodide và PGlite đều chạy trong worker, nên hai cột 4× ở trên **không phải** số 4× thật, chỉ là phần trang bị chậm.

Thử thay bằng Job object của Windows (giới hạn affinity và trần CPU):

- Một lượt với 4 lõi, trần tổng 1 lõi: lạnh 20,4 s, ấm 12,0 s.
- Đây không phải mô hình "mỗi lõi chậm 4×": một luồng chạy một mình vẫn được trọn một lõi. Vì vậy số này không dùng làm cổng.
- Mẻ 1 lõi ở 25 % bị dừng trước khi có số.

**Ước lượng 4×:** khởi động gần như chỉ tốn CPU (tự host trên localhost, mạng không đáng kể), nên nhân tuyến tính:

- Pyodide một mình ở lần ấm: 5,1–5,3 s × 4 ≈ **21 s**.
- Lần ấm cả trang: 5,77 s × 4 ≈ **23 s**.
- Phần PGlite (Logistics + lab): 4,8–5,4 s × 4 ≈ 19–22 s.

Cả hai worker đều vượt hoặc chạm 20 s.

**Bài tập (1×, trung vị):**

| Việc | Thời gian |
|---|---|
| SQL 4.284 dòng | 53–58 ms |
| → DataFrame | 28–30 ms |
| groupby / merge / pivot | 28 / 6 / 52 ms |
| Đổi kết quả để chấm | 23–27 ms |
| 50.000 dòng: SQL / → DataFrame | 0,50–0,61 s / 0,10–0,13 s |
| Chấm đúng/sai | đúng ở cả 20 lần |

**Bộ nhớ:**

- Heap wasm Pyodide (`HEAPU8`): **90 MB** khi có pandas và đã chạy các bài; 75 MB khi chỉ boot.
- JS heap (`Runtime.getHeapUsage`): worker Python 20 MB, worker PGlite 5 MB, trang 12 MB.
- Backing store: worker Python 43 MB, worker PGlite 178–197 MB.
- Bộ nhớ riêng của các tiến trình Edge: tổng ≈ 1,05–1,12 GB; tiến trình lớn nhất 0,72–0,77 GB.

**Ổn định:** không lượt nào `Inspector.targetCrashed` hay báo lỗi khi PGlite (Logistics đã seed) và Pyodide cùng chạy. Điều kiện "tab không bị kill" đạt trên desktop.

**Cỡ tải:** bộ file tới lúc pandas dùng được là **14,08 MB gzip -9** (21,4 MB thô). Khớp ước lượng 14 MB của L139.

**Đối chiếu cổng V20-A:**

| Tiêu chí | Kết quả |
|---|---|
| Ấm, máy rảnh ≤ 10 s | 5,77 s: **đạt** (máy bận nền 24 %) |
| Ấm, CPU 4× ≤ 20 s | ≈ 21–23 s (ước lượng; CDP không chậm được worker): **không đạt** |
| Tab không bị kill | **đạt** |
| Heap JS + wasm ghi lại | **đạt** |

**Theo roadmap:**

- **NO-GO.** D5 giữ `external`. V20-A chuyển sang phương án lùi "Python ngoài app": nút D5 thêm 3 bài đọc và notebook Kaggle công khai, chỉ link, cỡ S.
- Mở lại khi user đo được trên một điện thoại Android thật ở lần ấm ≤ 20 s (roadmap §6, "chờ user").
- Phần đắt nhất là `import pandas` (~3,1 s ở 1×) và việc seed Logistics chạy song song. Nếu mở lại, có hai hướng giảm:
  - module Python chỉ seed `lab`, không seed Logistics;
  - dùng snapshot trạng thái Pyodide.

## 3. Những điều đã kiểm được

- **Chấm điểm dùng lại `compareResults` (`src/grader.ts`):**
  - Đáp án và bài làm đều đổi về `{ columns, types, rows }` bằng `df.to_json(orient='values')`, rồi đưa vào `compareResults`. Bài đúng viết khác cách vẫn đạt, bài sai (quên lọc `PAID`) bị trượt.
  - So theo vị trí cột, multiset dòng, làm tròn 2 chữ số: giống hệt SQL.
  - **Phải chuẩn hóa trước khi so:** Series → `to_frame()`; index khác `RangeIndex` → `reset_index()` (giữ khóa). Nếu chỉ `reset_index(drop=True)` như bản đầu, khóa bị mất và bài đúng bị chấm sai. Đã kiểm cả hai trường hợp.
- **Kiểu dữ liệu:**
  - PGlite trả `numeric` (OID 1700) dạng chuỗi, nên pandas 3 đọc ra `str`.
  - Int có NULL đọc ra `float64`.
  - `date` là `Date`; spike đổi sang chuỗi ISO trước khi gửi.
  - Cần ánh xạ theo `types`: 1700 → `float64`; int2/4/8 có NULL → `Int64`; 1082/1114 → `datetime64`; bool. Đã kiểm 1700 và `Int64`.
- **Bẫy `null`:**
  - Quan sát: qua `toPy`, cột int có NULL ra dtype `object` và ép `Int64` bị lỗi; qua JSON thì chạy đúng.
  - Nguyên nhân: Pyodide mặc định đổi `null` của JS thành `jsnull`, không phải `None`. Điều này khớp với `pyodide.d.ts`, nơi tùy chọn `convertNullToNone` đã deprecated.
  - Cách sửa: gửi chuỗi JSON rồi `json.loads` trong Python. Spike chưa so tốc độ hai đường trong cùng điều kiện.
- **Ngắt code chạy quá lâu:** `setInterruptBuffer` của Pyodide cần `SharedArrayBuffer`, tức phải cách ly cross-origin (COOP/COEP). GitHub Pages không đặt được header này, nên **trên Pages** chỉ còn cách **`terminate()` worker rồi khởi động lại**, giống cách PGlite đang làm. Khởi động lại tốn lại khoảng 4,6 s (ấm), trên máy yếu thì lâu hơn. Cloudflare Pages (deploy.md §6) đặt được COOP/COEP, nên đây là một quyết định về chỗ host. Chưa kiểm COEP có làm hỏng việc nạp tài nguyên khác của app không.
- **Hai engine trong hai worker riêng chạy ổn:** PGlite seed `lab` song song với lúc Pyodide khởi động. Không đụng nhau, và khi một worker bị terminate thì worker kia không ảnh hưởng.

## 4. Giấy phép, CDN hay tự host, ngân sách

**Giấy phép** (dòng cho `assets/THIRD_PARTY.md` khi build thật):

- Lấy từ trường `License`/`License-Expression` trong `METADATA` của wheel: pandas, numpy, pytz, six, fonttools, pyparsing, pillow, packaging, contourpy, matplotlib.
- Chỉ lấy từ classifier (trường `License` không rõ): kiwisolver, cycler, python-dateutil.
- Chưa đọc file giấy phép: CPython trong wasm, cùng các thư viện C được nhúng vào wasm.
- Khi build thật, phải đọc file LICENSE của từng gói.

| Gói | Giấy phép |
|---|---|
| Pyodide 314.0.7 (gồm CPython 3.14 trong wasm) | MPL-2.0; CPython: PSF-2.0 |
| pandas 3.0.2 | BSD-3-Clause |
| numpy 2.4.6 | BSD-3-Clause AND 0BSD AND MIT AND Zlib AND CC0-1.0 |
| python-dateutil 2.9.0.post0 | Apache-2.0 hoặc BSD-3-Clause (dual) |
| pytz 2026.1.post1, six 1.17.0 | MIT |
| matplotlib 3.10.8 (nếu dùng) | Matplotlib License (PSF-based) |
| fonttools, pyparsing / pillow / packaging | MIT / MIT-CMU / Apache-2.0 hoặc BSD-2-Clause |
| contourpy, kiwisolver, cycler | BSD-3-Clause |

- Tất cả đều cho dùng, sửa và phân phối lại miễn phí.
- MPL-2.0 là copyleft cấp file: chỉ khi sửa file của Pyodide mới phải công bố phần sửa. Dùng nguyên bản thì chỉ cần giữ thông báo bản quyền và giấy phép.

**CDN (jsDelivr) hay tự host:**

- **CDN:**
  - Không tốn gì trong repo, có br, `max-age=31536000`.
  - Nhưng là bên thứ ba: lộ IP người học cho jsDelivr, phụ thuộc vào việc CDN còn chạy, và không chạy offline (trái hướng PWA của I3).
- **Tự host trên GitHub Pages:** vừa giới hạn.
  - Site tối đa 1 GB; băng thông mềm 100 GB/tháng.
  - GitHub chặn file trên 100 MiB và cảnh báo từ 50 MiB.
  - Bộ file pandas khoảng 22 MB, bộ đủ (kèm matplotlib) khoảng 31 MB.
  - Nhược điểm: theo deploy.md, Pages có thể không nén `.wasm` (đây là WARN, chưa kiểm cho file này). Khi đó lõi tốn thêm khoảng 6 MB, tổng lên khoảng 20 MB.
  - Không commit file nhị phân vào git: lúc build, tải bản đã pin và so sha256 với `pyodide-lock.json`.
- Dù chọn cách nào, phải bỏ qua Vite transform: Vite dev cố resolve `import "ws"` trong `pyodide.mjs` và trả lỗi 500. Cách đặt: file nằm trong `public/` (hoặc một thư mục ngoài `src`) rồi nạp bằng `import(/* @vite-ignore */ url)`.

**Ngân sách:**

- Main không đổi. Chỉ thêm route và một `import()`, khoảng 1–2 KB.
- `check-budget.mjs` hiện chỉ quét `dist/assets`, nên thư mục `public/pyodide/` sẽ **nằm ngoài ngân sách**. Cần thêm một nhóm `py`: khoảng 14 MB gz cho bộ pandas, kèm kiểm sha256.

## 5. Khuyến nghị cho v18

**GO hẹp, có điều kiện**, cho một module tùy chọn "Python cho DA" ở khu General. **Không** đưa vào domain, cốt truyện hay đánh giá thăng tiến.

Lý do nên làm:

- Kỹ thuật chạy được.
- Bài tập nhanh (dưới 100 ms).
- Chấm điểm dùng lại grader.
- Không đụng main.
- Người học DA có nhu cầu thật.

Lý do giữ hẹp:

- Tải 14 MB và khởi động 5–15 s mỗi lần mở; cache không cứu được phần CPU.
- Không ngắt được code mềm, chỉ terminate được.
- Bộ nhớ trên điện thoại chưa rõ.

**Điều kiện trước khi build** (nếu không đạt thì **NO-GO**, D5 giữ `external`):

1. Đo lại trên máy rảnh và một điện thoại Android tầm trung: pandas sẵn sàng ≤ 10 s ở lần ấm, tab không bị kill khi có cả PGlite lẫn Pyodide.
2. Chốt chỗ host: tự host (đề xuất, hợp với PWA/offline) hoặc CDN.
3. User chấp nhận chi phí tải 14 MB cho riêng module này.

## 6. Thiết kế tối thiểu nếu GO

- **Worker riêng** `src/py/worker.ts`, không gộp vào worker PGlite:
  - hai heap wasm, khởi động lại độc lập;
  - terminate khi Python quá giờ không làm mất DB.
- **`PyClient`**, giống `DbClient` thu nhỏ:
  - chạy từng yêu cầu một, timeout 5 s → `terminate()` + boot lại;
  - lỗi có kiểu (`PyError` mang traceback, `PyTimeoutError`) và được dịch trong `errorText()`.
- **Luồng một bài:**
  1. `DbClient.run(sql, { schema: 'lab' })` → `QueryResult`.
  2. Gửi JSON sang worker Python, dựng DataFrame với kiểu theo OID (§3).
  3. Chạy code người học. Biểu thức cuối (hoặc biến `ket_qua`) phải là DataFrame hoặc Series.
  4. Chuẩn hóa (§3), đổi về `QueryResult`, rồi so bằng `compareResults` với đáp án Python của bài (cũng chạy trong worker), có `ordered` khi cần.
- **Biểu đồ:** **không dùng matplotlib** (tiết kiệm 9,4 MB và 2 s cho hình đầu). Người học trả DataFrame hai cột; app vẽ bằng renderer bar/line của dashboard có sẵn.
- **Nội dung:** `content/general/py.yml`, cùng khuôn drill (`faded | open | trap`, `hint`, `wrong`), id `g-py-…` lưu vào `save.completed` như drill hiện tại. Không bump save.
  - `DRILL_ID` (`/^g-[a-z0-9-]+$/`, `src/save.ts`) nhận id này.
  - `skillOfDrill` (`src/home.ts`) trả `undefined`, vì `py_…` không phải skill id, nên drill Python không làm "học" thêm skill SQL nào.
  - Chưa kiểm các chỗ khác đọc `completed` (XP, practice hub).
- **Tài nguyên:**
  - `scripts/pyodide.mjs` tải bản pin 314.0.x vào `public/pyodide/` lúc build và kiểm sha256;
  - thêm nhóm `py` vào `check-budget.mjs`;
  - thêm dòng vào `assets/THIRD_PARTY.md`;
  - pin version chính xác như các dependency khác.
- **UI:** CodeMirror ở chế độ Python (`@codemirror/lang-python`, dependency mới, lazy); thanh tiến độ tải dùng `countingFetch`.
- **Cỡ việc:** khoảng 8–10 ngày (XL như roadmap), chưa tính nội dung bài.

## 7. Rủi ro

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Tải 14 MB, khởi động 5–15 s, chậm hơn trên máy yếu | Cao | Chỉ tải khi người học vào module (opt-in), hiện tiến độ, prefetch khi rảnh sau lần đầu |
| Bộ nhớ: 75 MB+ heap wasm cộng PGlite trên điện thoại | Trung bình–cao | Điều kiện 1 ở §5; terminate worker Python khi rời module |
| Không ngắt được code (không có SAB trên Pages) | Trung bình | Terminate + boot lại (~5 s), báo rõ cho người học |
| Pyodide đổi ABI và phiên bản gói theo từng bản (pandas 3 đổi dtype `str`) | Trung bình | Pin chính xác; test nội dung chạy đáp án và `wrong:` trên đúng bản đã pin (Node có `pyodide` npm) |
| Bẫy kiểu dữ liệu (`jsnull`, numeric dạng chuỗi, date) | Thấp | Truyền JSON, ánh xạ theo OID, có test |
| Code người học trong worker có `import js`: gọi được `fetch`/IndexedDB cùng origin | Thấp | Chỉ là code của chính người học; không chạy code người khác gửi; không có bí mật trong origin |
| CDN bên thứ ba (nếu chọn CDN): quyền riêng tư, offline | Trung bình | Tự host |
| Số đo của spike bị nhiễu tải máy | Trung bình | Đo lại trước khi quyết (§5) |
