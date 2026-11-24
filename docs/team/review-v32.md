# Review v32: nội dung lấp các dòng `partial` của gap map (2026-11-24)

Nhánh `v32-content` (từ `main` ae476ed). Quyết định: L520–L529 trong `decision-log.md`. Chỉ nội dung, test đếm, gap map và tài liệu kiến thức; không đổi Save, route, UI, `style.css` hay token.

## 1. Đã thêm

| Id | Ở đâu | Loại | Nội dung | Chấm |
|---|---|---|---|---|
| `e-pg-l1-18` | Engine PG L1, mô-đun `write` | lab, 3 bước | `COPY … TO/FROM` với `FORMAT csv`, `HEADER`, `DELIMITER`, `NULL`; file trên máy chủ và quyền; `STDIN`/`STDOUT`, `\copy` | nội dung file (`pg_read_file`), bảng sau khi nạp, số dòng sau `INSERT … SELECT` |
| `e-pg-l2-25` | Engine PG L2, mô-đun `functions` | lab, 3 bước | SQL injection trong `EXECUTE` nối chuỗi; `EXECUTE … USING`, `format('%L'/'%I')`, `quote_literal`/`quote_ident`, `PREPARE`; danh sách cho phép | hành vi hàm với chuỗi tấn công và tên có dấu nháy / dấu cách |
| `e-pg-l5-18` | Engine PG L5, mô-đun `observe-tune` | lab, 5 bước | vòng EXPLAIN → index → `ANALYZE`/`n_distinct` → `work_mem` | catalog, `pg_stats`, **2 bước chấm bằng kế hoạch**, `pg_settings` |
| `e-ds-l4-07` | Thiết kế CSDL L4, mô-đun mới `split` | lab, 4 bước | tách bảng theo cột, bảng 1:1, ngưỡng TOAST ~2 KB, `DROP COLUMN` + `VACUUM FULL` | catalog, `after:`, dòng |
| `a11` (`g-a11-1..4`) | General · Nâng cao nhóm A | nút `in`: bài học + 4 drill | `TABLESAMPLE BERNOULLI/SYSTEM … REPEATABLE`, đổi chác với `ORDER BY random() LIMIT`, ước lượng nhân 100/p | theo dòng (cùng hạt giống → cùng mẫu) |

Mọi bài Engine theo giải phẫu 8 mục (Mở bài, Ý chính, Cú pháp, Ví dụ, Lỗi hay gặp, Thực hành, câu hỏi có `trap`, Tóm tắt), VI rồi `# EN`, nguồn chính là tài liệu PostgreSQL 18. Mục 6: ba bài Thiết kế ngắn nhất thêm một đoạn Ý chính (`e-ds-l4-05` 453 → 560 từ, `e-ds-l5-01` 427 → 579, `e-ds-l5-03` 413 → 522).

Điểm trung thực (L524, L525): `COPY` ra/vào file chạy thật trong PGlite (thư mục `/tmp` trong bộ nhớ của tab); `STDOUT`/`STDIN`/`\copy` chỉ nói bằng chữ; `COPY … PROGRAM` không có trong khối chạy được (treo PGlite). `ORDER BY random()` không chấm được nên chỉ giải thích; drill `a11` chấm theo dòng nhờ `REPEATABLE` (lệch với "chấm hình dạng" của route v24, ghi ở L525).

## 2. Gap map trước → sau

| Tutorial | covered | partial | missing | n/a |
|---|---|---|---|---|
| sql | 104 → 106 | 3 → 1 | 0 | 15 |
| postgresql | 74 | 0 | 0 | 16 |
| mysql | 148 → 153 | 4 → 0 | 1 → 0 | 33 |
| sqlite | 37 → 38 | 1 → 0 | 0 | 16 |
| mongodb | 31 | 0 | 0 | 30 |
| dynamodb | 26 | 0 | 0 | 12 |
| dbms | 87 | 0 | 0 | 4 |
| **Tổng** | **507 → 515** | **8 → 1** | **1 → 0** | 126 |

Dòng `partial` còn lại: SQL "Cursor Functions" (`@@CURSOR_*` của SQL Server; Q7 không dạy phương ngữ; cursor Postgres có ở `e-pg-l2-19`). 9 dòng đổi, đọc hết diff của `kb:gen`.

## 3. Kiểm (luật user: không e2e, không chạy cả bộ test)

| Lệnh | Kết quả |
|---|---|
| `npx tsc --noEmit` | sạch |
| `tests/engineAnatomy.test.ts` | 546/546 (98 bài PG) |
| `tests/engineDesign.test.ts` | 193/193 (26 bài) |
| `tests/engineContent.test.ts` | 554/554 |
| `tests/perfGateEngine.test.ts` | 115/115, không thêm `ALLOW` |
| `tests/general.test.ts` | 1200/1200 (29 nút) |
| `tests/noDeadEnds.test.ts`, `sqlWords`, `frame`, `bpLint`, `i18n`, `engineCore` | 10, 6, 15, 17, 20, 30, đều qua |
| thử tạm (đã xóa): mọi bước mới qua bằng Solution, trượt với `SELECT 1`; bản nối chuỗi, `customer_id + 0`, `SET LOCAL`, thiếu `NULL 'NA'` trượt; `%L`, `quote_ident`, `16MB` qua | 19/19 |
| `npm run build` + `node scripts/check-budget.mjs` | mọi nhóm ok; `engineLesson` lớn nhất 7/8 KB (bài mới 6,0–6,7 KB gz), `generalAdv` 46/50, main 311/500 |
| `~/.claude/skills/sql/scripts/run.mjs` trên 4 file kiến thức | 85 khối, 0 lỗi |

`engineIntegration.test.ts` không chạy: không đổi MongoDB/DynamoDB.

## 4. Còn lại

- Chưa xem trong trình duyệt thật, chưa e2e/smoke/ux-audit (luật user); CI đầy đủ chạy khi merge.
- Bài Thiết kế vẫn dưới đích 700 từ; ba bài quiz cấp (198–229 từ) và capstone (286) không đổi.
- Thuật ngữ glossary chưa có mục cho bài mới (glossary chỉ có ba engine).
- Chưa push (theo yêu cầu).
