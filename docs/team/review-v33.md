# Review v33 (2026-11-24)

## NoSQL L1–L2

Nhánh `v33-nosql` (từ `v32-content`). Quyết định: L530–L534 trong `decision-log.md`. Chỉ nội dung và một test; không đổi Save, route, UI, `style.css`, `src/engine/viz`, `engineView.ts`, `enginePredict.ts`.

**Phạm vi thật.** Việc chuyển MongoDB/DynamoDB L1–L2 sang giải phẫu 8 mục đã xong ở v30 R6 (L470): 53 bài có đủ mục theo loại bài, khối Ví dụ / Lỗi hay gặp chạy trên mingo/dynoxide, ≥ 2 câu hỏi và ≥ 1 `trap:`, và describe NoSQL của `tests/engineAnatomy.test.ts` đã phủ L1–L5 (132 bài). v33 **không chuyển thêm bài nào**. Việc còn lại là L473: (2) độ dài chữ dưới đích §2.2, (3) ghi rõ mã lỗi của runtime trong trình duyệt, (4) PartiQL `INSERT` trùng khóa chưa có khối chạy.

**Kéo dài: 38 bài concept/lab dưới đích** (lab < 350 từ VI, concept < 500): MongoDB L1 8, L2 12; DynamoDB L1 10, L2 8. Quiz/predict/capstone không có đích nên giữ nguyên. Thêm câu đọc kết quả sau mỗi ví dụ, "vì sao + cách sửa" sau mỗi bẫy (sau khối `// FIX`), đoạn Thực hành mô tả từng bước (nói về thanh hiệu năng chỉ khi bước có `perf:`), và vài đoạn Ý chính ≤ 150 từ dạng "Nhiều người nghĩ X. Thật ra Y". Mọi con số và kết quả nêu trong chữ đều lấy từ lần chạy khối thật trên mingo/dynoxide. EN đi song song VI.

| Bài | Loại | Từ VI trước → sau |
|---|---|---|
| e-mg-l1-01 | concept | 485 → 634 |
| e-mg-l1-02 | lab | 299 → 470 |
| e-mg-l1-03 | lab | 285 → 530 |
| e-mg-l1-04 | lab | 277 → 511 |
| e-mg-l1-07 | lab | 314 → 568 |
| e-mg-l1-08 | lab | 334 → 549 |
| e-mg-l1-09 | lab | 296 → 505 |
| e-mg-l1-10 | lab | 321 → 517 |
| e-mg-l2-01 | lab | 333 → 551 |
| e-mg-l2-02 | lab | 317 → 478 |
| e-mg-l2-04 | concept | 360 → 656 |
| e-mg-l2-05 | lab | 287 → 472 |
| e-mg-l2-06 | lab | 272 → 455 |
| e-mg-l2-07 | lab | 282 → 463 |
| e-mg-l2-08 | lab | 280 → 540 |
| e-mg-l2-09 | lab | 311 → 573 |
| e-mg-l2-10 | lab | 308 → 525 |
| e-mg-l2-11 | concept | 378 → 604 |
| e-mg-l2-12 | lab | 319 → 526 |
| e-mg-l2-13 | concept | 350 → 541 |
| e-dy-l1-01 | concept | 385 → 588 |
| e-dy-l1-02 | concept | 442 → 577 |
| e-dy-l1-03 | concept | 421 → 588 |
| e-dy-l1-04 | lab | 306 → 481 |
| e-dy-l1-05 | lab | 348 → 498 |
| e-dy-l1-06 | lab | 257 → 441 |
| e-dy-l1-07 | lab | 270 → 437 |
| e-dy-l1-08 | lab | 307 → 491 |
| e-dy-l1-09 | lab | 302 → 435 |
| e-dy-l1-10 | lab | 287 → 388 |
| e-dy-l2-01 | concept | 356 → 543 |
| e-dy-l2-02 | lab | 266 → 409 |
| e-dy-l2-03 | lab | 323 → 451 |
| e-dy-l2-04 | lab | 334 → 463 |
| e-dy-l2-05 | lab | 321 → 426 |
| e-dy-l2-06 | lab | 278 → 427 |
| e-dy-l2-07 | lab | 248 → 416 |
| e-dy-l2-11 | concept | 347 → 551 |

Tổng chữ VI của 53 bài L1–L2: 16.160 → 23.232. Mọi concept/lab L1–L2 nay đạt đích (`e-mg-l1-05` 350 và `-06` 365 đã đạt từ trước).

**Khối sửa vì dạy sai lý do** (chạy thấy lỗi đúng mã nhưng sai nguyên nhân):
- `e-dy-l1-08`: bẫy "điều kiện trên thuộc tính thường trong điều kiện khóa" dùng `total > :t` bị từ chối vì `total` là từ dành riêng, không vì nó không phải khóa. Đổi sang `city = :t` → `ValidationException` "Query condition missed key schema element: orderId".
- `e-dy-l1-03`: bẫy JOIN bị từ chối vì "Aliasing is not supported"; đổi sang `SELECT * FROM Shop JOIN Shop ON …`, hỏng đúng ở `JOIN`. Thêm một ví dụ chạy được trên một bảng.
- `e-dy-l1-09`: thêm ví dụ Query + `FilterExpression` (`Count` 3, `ScannedCount` 4); "Scan đắt gấp 30 lần" → "đọc nhiều gấp 30 lần" (máy đo 1 RCU so với 0,5: capacity tính theo khối 4 KB).
- `e-dy-l2-07`: câu "`ScannedCount` 120 so với 4" sai: `ExecuteStatement` không trả `ScannedCount` (đã đối chiếu API Reference); thay bằng capacity máy trả (1 RCU so với 0,5).

**PartiQL `INSERT` trùng khóa (L473 mục 4):** dynoxide từ chối bằng `DuplicateItemException`, đúng tên trong mục Errors của `API_ExecuteStatement` (AWS API Reference). Thêm làm bẫy `// ERROR DuplicateItemException` trong `e-dy-l2-07` (3 bẫy).

**Khác biệt runtime ghi trong bài:** mã `mingo`/`duplicate_key` là của bộ chạy trong trình duyệt (MongoDB thật: 11000 cho trùng khóa, mã riêng cho các lỗi khác, không nêu mã không có nguồn); `_id` sinh ra là chuỗi đếm, không phải `ObjectId`; thứ tự khi không `sort` chỉ là thứ tự lưu ở đây; mingo không có `$jsonSchema` validator khi ghi; dynoxide nhận `total` không có dấu nháy trong PartiQL (AWS: từ dành riêng phải đặt trong nháy kép), bỏ qua `KeyConditionExpression` trên `Scan`, chỉ có một bản sao (không thấy đọc cũ), không trả capacity cho ghi bị từ chối; lời báo lỗi là của dynoxide, tên exception khớp AWS.

**Test.** `tests/engineAnatomy.test.ts`: kiểm độ dài nay **chặn** cho concept/lab L1–L2 (L3–L5 vẫn chỉ in ra: còn 21 concept dưới 500 từ). Số đếm giữ nguyên (Mongo 71, Dynamo 61): không thêm/bớt bài.

**Kiểm:** `tsc` sạch; `engineAnatomy` 546/546, `engineContent` 554, `engineIntegration` 235, `engineNosql` 9, `mongoPath` 217, `i18n` 20, `bpLint` 17; `npm run build` + `check-budget` ok, `engineLesson` lớn nhất 7 KB / 8 KB (bài NoSQL lớn nhất `e-dy-l1-08` 6,44 KB gz). Không chạy e2e/smoke/ux-audit (luật user).

**Chưa làm:** bẫy `// ERROR` của `e-dy-l1-09` (`KeyConditionExpression` trên `Scan`) vẫn hỏng vì `ExpressionAttributeValues` thừa, không vì `Scan` không nhận điều kiện khóa (dynoxide bỏ qua tham số đó; bài đã ghi rõ AWS không có tham số này trên `Scan`): ngoại lệ duy nhất của L532, chưa có khối thay thế hỏng đúng lý do; 21 concept L3–L5 dưới 500 từ (danh sách in ra trong test); e2e/smoke chưa chạy; hiển thị trang của các khối mới chưa xem bằng mắt.
