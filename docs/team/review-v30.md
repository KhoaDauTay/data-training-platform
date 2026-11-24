# Review v30: tổng kết v23.1 → v30 (2026-11-24)

Người điều phối viết, sau một đêm chạy liên tục theo yêu cầu user ("Chạy thẳng version hiện tại, hoàn thành những gì vạch ra. Tôi muốn có v30 vào sáng mai"). Kế hoạch: `bd-wt/tools/run-v30.md`; mỗi version v25–v29 = một lát lộ trình R1–R6 của `product-route-v24.md` §4 (chính) + mục roadmap cũ (phụ).

## 1. Cách kiểm (luật user 2026-11-24)

- **Không** chạy e2e, smoke đầy đủ, ux-audit, gate.sh ở máy ("Tạm thời không chạy e2e. Và test tốn thời gian").
- Mỗi nhánh: `tsc`, các file Vitest liên quan (mỗi file chạy riêng, `--no-file-parallelism`), `npm run build`, `check-budget`.
- Mỗi version: CI trên `main` (`ci.yml`: typecheck + toàn bộ `npm test` + build + budget; `smoke` workflow) phải xanh trước khi gắn tag.
- Hệ quả: **không có version nào trong đợt này được xem trong trình duyệt thật** ngoài smoke của CI. Các tiêu chí thoát cần e2e (R3 "E2E_ONLY=engine giải mọi bài L1–L2") ghi là *chưa chạy*.

## 2. Các bản đã phát hành

| Tag | Commit | Nội dung chính |
|---|---|---|
| v23.1 | 6b855c2 | 13 mục review (fb-ui L309–L319, fb-content L302–L305); thẻ "Kỹ năng SQL" một dòng ở 375 (smoke V22-C) |
| v24 | 089e263 | R0 (route.yml, bài đầy đủ, đo kỹ năng + huy hiệu thay chứng nhận, cổng đúng-mà-chậm) + R0b (dữ liệu `lab` có kiểu) + Best Practice |
| v25 | 88d817a | R1: 34 bài đầy đủ Phần 1–8, `cross_join`, `any_all`; Phần 2–7 chỉ `slow:` (L324). MongoDB đủ: thanh luật, explain ghi sẵn "theo tài liệu", capstone L3/L4, Pipeline từng bước, So với SQL, Xem thật, mong lỗi, 38 thẻ BP |
| v26 | 5bf2677 | R2: Phần 9 ghi dữ liệu (chấm ghi-rồi-đọc, `WRT01`), 9 bài đầy đủ, Phần 11 chặn 12/12. DynamoDB đủ: thanh chi phí (51 bước), panel Partition/Chi phí, ExecuteTransaction, 32 thẻ BP. Sửa `area.m/d` (trang thẻ BP Mongo lỗi từ v25) |
| v27 | cb50c93 | R3: PostgreSQL L1–L2 theo tutorial (12 bài mới, 41 bài 8 mục, 20 thanh). Glossary `#/engine/terms`, popover thuật ngữ, phòng phỏng vấn Engine. CI timeout 15→30 phút (L414) |
| v28 | 19ee235 | R4: thẻ engine thứ tư "Thiết kế CSDL" (25 bài `e-ds-`). Trang `#/engine/compare`, chip "Đào sâu", 3 bài PG L4 (window, anti join, CTE) |
| v29 | 077de77 | R6: giải phẫu PG L1–L5 + Mongo/Dynamo L3–L5, thanh ở mọi capstone. Sửa `nonSargable` (`\b` trong template literal). ES2023, `{ cause }`, test khóa i18n ghép chuỗi. `e2e.mjs` biết các loại bước mới (chưa chạy) |
| v30 | (commit gắn tag, xem `git tag v30`) | Mongo/Dynamo L1–L2 theo giải phẫu (100% bài Engine), đồng bộ tài liệu kiến thức + skill `sql`, review này |

## 3. Tiêu chí thoát của lộ trình (product-route-v24 §4)

| Lát | Kết quả |
|---|---|
| R0 | đạt (v24) |
| R0b | đạt (v24; md5 `lab` ghim lại) |
| R1 | 34/34 bài; 157 ví dụ chạy ra dòng (≥ 102); gap sql Phần 1–8 = 0 |
| R2 | 12 drill ghi qua/trượt đúng; 50 drill ghi liên tiếp không làm hỏng drill `perf`; gap sql#27, 29–32, 69, 70, pg#17–19, 31 = covered |
| R3 | gap pg missing 0, partial 0. **e2e chưa chạy** (luật user) |
| R4 | dbms missing 31→0, partial 32→0 (≤ 8); 25/25 `e-ds-`; fixture Save `e-ds-` đọc lại nguyên |
| R5 | mongodb missing 0 partial 0; dynamodb partial 0; mọi bước Dynamo có đường Scan đều có thanh |
| R6 | 252/252 bài Engine qua test giải phẫu (PG 95, MongoDB 71, DynamoDB 61, Thiết kế 25). Mọi capstone có bước thanh, trừ `e-mg-l1-11` (L1 chưa dạy aggregate hay index, cả ba luật đều cần; test ghi rõ) |

Gap map cuối (`npm run kb:gen`, 36 tutorial, 1.430 chương):

| Tutorial | covered | partial | missing | n/a |
|---|---|---|---|---|
| SQL | 102 | 4 | 1 | 15 |
| PostgreSQL | 74 | 0 | 0 | 16 |
| MySQL (ngoài phạm vi, Q7) | 148 | 4 | 1 | 33 |
| SQLite (ngoài phạm vi, Q7) | 37 | 1 | 0 | 16 |
| MongoDB | 31 | 0 | 0 | 30 |
| DynamoDB | 26 | 0 | 0 | 12 |
| DBMS | 87 | 0 | 0 | 4 |

So với lúc bắt đầu (v24): DBMS missing 31→0, PostgreSQL missing 6→0, DynamoDB partial 7→0, MongoDB missing 2→0.

Tài liệu kiến thức `docs/knowledge/database/`: 120 khối SQL chạy trên PGlite (từ 105); bản sao trong skill `~/.claude/skills/sql/references/` giống hệt repo (`diff -rq`).

## 4. Lỗi tìm thấy trong đợt và đã sửa

- `area.m`/`area.d` không tồn tại → trang thẻ Best Practice MongoDB (từ v25) và DynamoDB lỗi khi vẽ. CI axe bắt được; v29 thêm `tests/i18nTemplateKeys.test.ts` để chặn loại lỗi này.
- `planCheck.ts` `nonSargable`: `\b` trong template literal là backspace → nửa "Seq Scan vì điều kiện không sargable" của cổng CI chưa bao giờ chạy; thêm một lỗi "Unterminated group" với index biểu thức. Đo trước/sau: 0 lời giải bị gắn cờ, 11 câu `slow:` giờ bị gắn cờ đúng (L441).
- Bộ chấm thẻ BP Mongo so giá trị lồng nhau như "[object Object]" (m20 báo hai vế giống nhau).
- `$count` trên đầu vào rỗng: mingo trả `[{n:0}]`, MongoDB trả không tài liệu → runner sửa theo MongoDB.
- Nhiều sửa kiến thức trong bài (PG18 `rows=3000.00`, Hash index với `LIKE` không wildcard, `enable_*` PG18 `Disabled: true`, TTL Dynamo tính bằng giây, DAX không làm mới cache query…), ghi ở L400, L440, L450.

## 5. Việc còn mở (cần user quyết hoặc cần máy/trình duyệt)

1. **Chưa xem trong trình duyệt**: popover thuật ngữ, trang so sánh, thẻ engine thứ tư (lưới 2×2), panel chi phí Dynamo, Pipeline từng bước, phòng phỏng vấn Engine. Đề nghị: một lượt e2e chia phần (`E2E_ONLY=…`, mỗi phần một Edge) + ux-audit khi user cho phép.
2. **Ngân sách sát trần**: `learnui` 25/25, `me` 13/13, `engineui` ~20/20. Thay đổi tiếp theo ở các chunk này phải tách chunk hoặc xin nâng.
3. **Phần 2–7 không chặn chậm** (theo L324). Câu `slow:` Phần 2–5 trên `lab` có cost < 1.000 nên ghi chú "đúng nhưng chậm" không bật được; muốn có thì cần bảng lớn hơn hoặc đổi luật ghi chú.
4. **Bài Thiết kế CSDL ngắn hơn mục tiêu** (200–650 từ so với 700–1.200) vì 8 KB/bài; nút `a11` (lấy mẫu ngẫu nhiên) chưa làm.
5. **review-v23 P3 còn mở**: G3 (lỗi lab nói hai lần), A5 ở 375, hàng lộ trình NoSQL ở 375.
6. **B1** (đo `explain()` trên `mongod` thật) vẫn chờ Docker.
7. Một số chi tiết chưa chạy kiểm: mã lỗi trong `// ERROR` của bài NoSQL là của mingo/dynoxide, không phải MongoDB/AWS thật; `insertMany ordered:false`, mức `strict` của validation, tên bảng Dynamo duy nhất theo account+Region (viết theo tài liệu, chưa chạy).
8. `e2e.mjs` đã có code cho bước `rule`/`error`/`after`/drill ghi/thanh chi phí/BP Mongo+Dynamo/thẻ thứ tư nhưng **chưa chạy lần nào**.
