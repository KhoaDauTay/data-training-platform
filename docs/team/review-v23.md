# Review v23 (trước khi đóng băng, bản local, 2026-11-20, nhánh `rel-v23`)

Lượt xem cuối trước khi user đóng băng dự án. Yêu cầu: ổn định, không thêm tính năng; chỉ sửa P0/P1 và P2 nhỏ.

**Bản đang xét.** `dist/` build từ `rel-v23` (gốc `9db4851` = live v22 + v23), `vite preview` ở 5271 (đi bộ + ảnh), ux-audit tự mở 5272, gate smoke 5273, e2e 5275. Không phải site live. Edge headless, hồ sơ mới mỗi lượt, bỏ qua service worker, xóa storage giữa các cấu hình.

**Ảnh:** `C:\Users\khoa.huynh\Documents\study\bd-wt\review-v23\` (ngoài repo). Tên `<theme>-<w>-<trang>[-<trạng thái>].png`; nhật ký đo `walk.log`, ux-audit `ux-audit.log`, gate `gate.out`, e2e `e2e.out`. Script đi bộ `walk.mjs` (CDP, giống `scripts/ux-audit.mjs`, thêm axe sau khi bấm, bắt lỗi console của trang và worker).

---

## 1. Đã chạy

| Lượt | Kết quả |
|---|---|
| `npm run ux-audit` (144 lượt, 4 cỡ + top bar 1024–1920 VI/EN) | **0 serious**; 13 `target` moderate (link chữ cao 20 px trong `#/me` và "Đọc thêm") |
| Đi bộ người quay lại (`save-v5.json`): Trang chủ, Lộ trình, drill `g-select-1`, workspace Logistics, `#/engine`, 3 engine, trang cấp L3, lab Postgres mới (l3-16, l5-16), predict (l1-10, l3-17, l3-08), capstone l1-12, lab MongoDB l1-02, lab DynamoDB l1-05, Lộ trình NoSQL, `#/me` | 1280 sáng, 1024 sáng, 375 tối (giảm chuyển động), 320 sáng: **không cuộn ngang**, không phần tử rộng hơn màn, `#bottom-nav` < 72 px, không chữ `undefined`/`NaN`/"sắp có"/khóa i18n, **0 lỗi console/exception (trang + worker)** |
| Top bar EN 1280 / 1024, tối 1280 | Không tràn, h1 đúng trang con |
| Người mới | Màn chào hiện ở `#/` và `#/engine`; Esc ở `#/engine` giữ `#/engine`; đi hết màn chào chọn "Chỉ học SQL" từ `#/engine` → vẫn `#/engine`, h1 "Database Engine" (fix L299 đúng) |
| Predict "Xem thật" (bàn phím) | Mũi tên chọn đáp án, Tab tới "Xem thật", Enter: kết quả hiện, **focus về tiêu đề thẻ kết quả** (`<id>-plan`) cả khi kế hoạch về muộn; vòng focus 2 px `--accent` (sáng `#0f766e`, tối `#62dccb`, cách 2 px); chọn lại chấm lại ngay; sai → "✗ bạn chọn" + "✓ đáp án". l3-08 vẽ bảng bộ đếm (L297) |
| Capstone l1-12 giải bằng lời giải | Bước sai: lỗi Postgres; mỗi bước đạt → thanh bước dời đúng, **đúng một nút Nộp chính** (bước hiện tại), hết bước thì không còn nút chính; "Trước và sau" mở 2 cây kế hoạch; thẻ "Xong bài tổng hợp" |
| Lab MongoDB / DynamoDB | Lỗi cú pháp có dòng/cột; lời giải đạt |
| Sơ đồ `pg-vacuum-flow` (l3-16), 1280 và 375 + giảm chuyển động | Đi hết 6/6 bước bằng "Tiếp", 0 animation chạy dưới giảm chuyển động; nút đứng yên ở 1280 (A5), lệch 18 px một bước ở 375 (P3) |
| axe-core (serious/critical, có `target-size`) sau khi bấm: predict sai, sơ đồ predict mở, capstone có kế hoạch, capstone xong, lab Mongo/Dynamo đạt; 1280 sáng + 375 tối | **0** |
| Gate sau sửa (`tools/gate.sh … 5273`: tsc, vitest đủ, build, budget, smoke) | GATE_OK: tsc 0 lỗi, **5439 pass** (1 skip), build, budget (main 303/500 KB gz), smoke OK 104 s |
| `E2E_ONLY=engine,screens` sau sửa | **473/473** (671 s), gồm mọi bài Engine giải bằng lời giải (thứ tự Lab → Câu hỏi mới) và 102+ màn hình có axe |

---

## 2. Phát hiện

### Đã sửa trong bản này

| Mục | Mức | Thấy gì | Sửa | Commit |
|---|---|---|---|---|
| Thứ tự phần bài (Product) | P2 (có từ v22, không chặn việc chính; sửa vì là đổi hai dòng) | Trang bài Engine vẽ **Câu hỏi trước Lab**. 43 bài có cả hai; 11 bài ghi rõ "… các bước, rồi N câu hỏi" và không bài nào ghi ngược lại; product-design-db-engine (capstone) nói `quiz` là "câu kết luận cuối". Hậu quả: capstone hỏi "sau khi có index…" trước khi người học tạo index; **l3-16 câu 1 lộ đáp án bước 1** ("35 xuống 4 trang") trong khi bài bảo "đoán trước khi chạy bước 1" | Lab vẽ trước Câu hỏi (predict vẫn trên lab); fixture capstone thêm một câu + test thứ tự (`tests/engineAxe.test.ts`) | `4191767` |
| Tiêu đề có dấu `` ` `` | P2 | Bài mới e-pg-l3-17: h1, hàng bài, tiêu đề tab hiện nguyên "Đoán trước: \`count(*)\`…" (tiêu đề không qua `inline()`) | Bỏ dấu `` ` `` trong `title`/`title_en`; test: không tiêu đề bài Engine nào có `` ` `` | `81abb23` |
| "Xem thật" đã dùng | P2 | Sau khi xem, nút `disabled` nhưng vẫn nền accent đậm cạnh "Bài tiếp" (hai nút chính, H3; nút không phản hồi trông như bấm được, H6) | Kiểu tắt như `BTN_SUBMIT` (`disabled:bg-code …`); test | `b1f9478` |

### Còn mở (không chặn)

| Mục | Mức | Thấy gì | Đề xuất |
|---|---|---|---|
| I3 | P3 | Link chữ cao 20 px: kỹ năng và tên engine trong `#/me`, "Đọc thêm" và link mô-đun trong bài (axe `target-size` vẫn đạt nhờ khoảng cách) | Giữ; nếu làm, `py-0.5` cho link dạng dòng |
| "Đọc thêm" | P3 | `sourceTitle` ra "DynamoDB · Bp query scan" (`bp-` = best practices) | Thêm từ điển viết tắt nhỏ hoặc để nguyên |
| G3 | P3 | Lỗi lab Mongo/Dynamo nói hai lần (dòng trạng thái + khung lỗi); predict "Chưa đúng" ở dòng trạng thái và pill thẻ kết quả | Gộp một chỗ ở bản sau |
| Capstone xong | P3 | Thẻ "Xong bài tổng hợp" nằm cuối Lab, trên Câu hỏi (sau khi đổi thứ tự) | Dời thẻ xuống sau Câu hỏi nếu muốn |
| "Chấm bằng" | P3 | Danh sách tiêu chí dùng vòng tròn rỗng giống radio | Dùng dấu đầu dòng/icon trạng thái |
| A5 ở 375 | P3 | Nút sơ đồ dời 18 px ở một bước (câu bước dài/ngắn hơn) | `min-h` cho câu bước |
| `#/engine` 375 | P3 | Dòng Lộ trình NoSQL: mô tả bị ép hẹp cạnh nút | Nút xuống dòng dưới 400 px |
| Người mới | P3 | Trước khi chọn lĩnh vực, top bar đã hiện chip "Logistics" và Hộp thư 1 (có từ trước v23) | Giữ |

Không thấy P0 hay P1. Không có lỗi console/worker, không link tới khu chưa phát hành, không thẻ "sắp có".

---

## 3. Product nhìn lại

| Thứ phát hành | Giữ / Sửa / Bỏ | Vì sao |
|---|---|---|
| PRED "Xem thật" + cây kế hoạch thật | **Giữ** | Đoán rồi thấy EXPLAIN thật trên dữ liệu bài, nút trả lời được viền; sai không bị phạt, đoán lại được. Bàn phím và focus đúng |
| Capstone: thanh bước, "Chấm bằng", trước/sau | **Giữ (đã sửa thứ tự)** | Giải trọn bằng runner thật; một nút chính mỗi lúc; kế hoạch trước/sau cho thấy index có tác dụng. Câu kết luận nay đến sau lab như nội dung viết |
| 3 sơ đồ Postgres, 5 bài Postgres mới | **Giữ** | Chạy, đi hết bước, đọc được ở 375 và giảm chuyển động |
| Sửa nội dung giải mù, "Đọc thêm" có tiêu đề | **Giữ** | Tên bảng/cột có trên trang; link đọc được (một tiêu đề vụng, P3) |
| Màn chào trên `#/engine` | **Giữ** | Người mới vào thẳng Engine không bị đẩy về Lộ trình |

Người học đi trọn được: Trang chủ → Lộ trình → drill → nhiệm vụ domain → Engine (tổng quan → engine → cấp → bài → lab/predict/capstone → bài tiếp) → `#/me`. Không ngõ cụt, không trang dở dang lộ ra.

---

## 4. Khuyến nghị

**GO** cho bản đóng băng v23 cùng ba commit sửa dưới đây: không P0/P1, gate và e2e engine/screens đạt sau sửa, không lỗi console/worker. Các P3 ở §2 để lại, không cần làm trước khi đóng băng.

Commit: `81abb23`, `4191767`, `b1f9478`; tài liệu này ở commit kế tiếp.
