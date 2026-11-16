# Cargo Query — Design Spec

Ngày: 2026-11-16 · Trạng thái: chờ review

## 1. Mục tiêu

Web game học PostgreSQL, chia sẻ cho team/công khai. Hai nhánh:

- **DA (Data Analyst)** — làm trong bản này: giải ticket nghiệp vụ bằng SQL trên dữ liệu domain.
- **DE (Data Engineer)** — bản sau: kỹ thuật Postgres (index, EXPLAIN, MVCC, isolation…). Có thể cần backend nhỏ cho bài concurrency — nếu có backend thì viết bằng **Python**; không thuộc phạm vi spec này.

Bản đầu tiên: nhánh DA đầy đủ **7 chương, ~35 ticket**.

## 2. Bối cảnh game

Người chơi là DA mới của **Cargo Query Logistics**, công ty forwarder xuất nhập khẩu (đường biển + hàng không). Các phòng ban gửi ticket vào inbox; người chơi viết SQL để trả lời.

Vòng chơi: đọc ticket → xem schema → thử query, xem kết quả → **Nộp** → grader so với đáp án mẫu → đúng: đóng ticket, +XP, mở ticket mới; sai: báo loại lệch + gợi ý theo bậc.

## 3. Kiến trúc

Chạy hoàn toàn trong trình duyệt, deploy tĩnh, không backend.

```
┌──────────── Browser ─────────────────────────────────────┐
│  UI (DOM): Inbox │ Ticket │ Schema │ SQL Editor │ Result │
│        │                         │                       │
│   Content (tickets/*.md)      Grader ── Worker riêng      │
│        │                         │      (PGlite bên trong)│
│   Progress (localStorage)        │      schema + seed    │
└──────────────────────────────────────────────────────────┘
```

- **Stack:** Vite + TypeScript, CodeMirror 6 (`@codemirror/lang-sql`), PGlite **0.5.16 pin cứng** (Postgres 18.6 — `random()` gắn với bản build), Vitest. Không dùng game engine (UI DOM-first theo skill web-games).
- **Worker:** một dedicated Web Worker tự viết (giao thức message `{id, sql}` → `{id, result|error}`), xử lý tuần tự từng query. Không dùng `PGliteWorker` vì nó bầu leader giữa các tab — `terminate()` ở tab không phải leader không dừng được query. Spike xác nhận `statement_timeout` không có tác dụng trong PGlite, nên `terminate()` là cách dừng duy nhất.
- **Tải trang:** render inbox và nội dung ticket trước, PGlite khởi động (~1s) + seed (~2s) trong worker. Mạng lỗi → nút thử lại, đề bài vẫn đọc được.
- **Ticket là file:** `content/tickets/<chương>/<id>.md` gồm frontmatter + đề + gợi ý + SQL đáp án. Thêm ticket = thêm file, nạp qua `import.meta.glob`.

### Định dạng ticket

````markdown
---
id: ch2-03
chapter: 2
title: Khách hàng chủ lực
from: { name: Lê Bình, dept: Sales }
difficulty: 2
beat: develop            # teach | develop | twist | rest | boss
requires: [group_by]     # kỹ năng phải có trước
grants: [having]         # kỹ năng ticket này dạy
tables: [shipments, containers, carriers]
ordered: false
---
Đề bài...

## Hints
1. Hướng đi
2. Bảng/cột cần dùng
3. Khung query

## Solution
```sql
SELECT ...
```
````

Boss ticket thay `## Solution` bằng 2–3 mục `## Step N: <tiêu đề>` (mỗi mục có đề bước + khối ```sql riêng) và thêm `conclusion: { question, options, answer }` vào frontmatter. Câu kết luận phải **không phụ thuộc số liệu** hoặc được một test seed khẳng định.

**Quy tắc nội dung:** ticket có thứ tự / top-N phải nêu tiêu chí phá hòa đầy đủ (ví dụ "bằng nhau thì xếp theo `ref`"), nếu không grader sẽ chấm sai câu đúng. Solution chỉ dùng ngày cố định, không dùng `CURRENT_DATE`/`now()` (test kiểm tra).

## 4. Dữ liệu domain

### Schema (~26 bảng, theo phòng ban)

| Nhóm | Bảng | Mở ở chương |
|---|---|---|
| Lõi | `customers`, `employees`, `ports`, `carriers`, `shipments`, `containers` | 1–3 |
| Ops | `shipment_events`, `trucking_orders`, `cfs_receipts` | 4 |
| Hải quan | `customs_declarations` (luồng xanh/vàng/đỏ, `amended_from_id`), `hs_codes`, `duties_taxes` | 4 |
| Tài chính | `charges`, `invoices`, `payments`, `vendor_bills`, `exchange_rates` | 5 |
| Sales/Pricing | `rate_contracts`, `quotations` | 5 |
| Chứng từ | `master_bills`, `house_bills` (`master_id`), `incoterms` | 6 |
| D&D + Claims | `free_time_terms`, `container_events`, `claims` | 6–7 |

Seed tạo **mọi bảng ngay khi khởi động** (đủ 26 bảng khi xong cả 3 plan triển khai). "Mở khóa" chỉ ảnh hưởng sidebar schema và gợi ý; DB luôn đầy đủ.

### Seed

- Sinh trong Postgres bằng `generate_series` + `setseed()` → tất định, file SQL vài KB. **Mỗi khối bảng có `setseed()` riêng** và khối mới chỉ thêm vào cuối, để thêm bảng sau không làm đổi dữ liệu cũ.
- **"Hôm nay" trong game = 2026-10-31.** Dữ liệu booking từ 2024-11-01 đến 2026-10-31.
- Móc câu chuyện đặt sẵn từ seed lõi: khách 171–190 ngừng book từ 2026-03-01; khách 191–200 là bản trùng của khách 1–10; ~2% lô AIR ghi FOB; khách 1 là khách lớn nhất (dành cho câu chuyện D&D); hãng tàu 3 *Blue Anchor Lines* (câu chuyện claim); tuyến châu Âu NLRTM/DEHAM/BEANR (câu chuyện margin Q3/2026).
- Quy mô: ~200 khách, ~20.000 shipment trong 2 năm, tương ứng container/charges/events.
- Benchmark ngành (margin, on-time…) chỉ dùng làm tham số sinh dữ liệu cho hợp lý.

### Bẫy data quality (chỉ xuất hiện sau khi đã dạy cách xử lý)

Khách trùng tên khác cách viết · `ata` NULL ở lô chưa đến · phí nhiều loại tiền · lô hủy vẫn còn dòng phí · trọng lượng house ≠ master · FOB khai cho lô đường hàng không · tờ khai bị hủy rồi khai lại · lô đã giao nhưng chưa xuất hóa đơn.

### Câu chuyện cài sẵn (đáp án cho boss chương 7: "Biên lợi nhuận Q3 giảm, vì sao?")

1. Cước mua tuyến châu Âu tăng, hợp đồng bán chưa điều chỉnh → báo giá bán lỗ (nguyên nhân chính).
2. Phí D&D tăng mạnh ở một khách lớn.
3. Một hãng tàu có tỉ lệ claim cao.

## 5. Lộ trình ticket

Mỗi chương theo nhịp **teach → develop → twist → rest → boss** (răng cưa, skill level-design), ~5 ticket.

| Ch. | Kỹ năng | Phòng ban chính | Ví dụ |
|---|---|---|---|
| 1 Tuần thử việc | SELECT, WHERE, ORDER BY, LIMIT | Ops | Lô đi Rotterdam tuần này |
| 2 Báo cáo sản lượng | COUNT/SUM, GROUP BY, HAVING | Sales | TEU theo hãng tàu quý 3 |
| 3 Nối dữ liệu | JOIN, LEFT JOIN, anti-join | CSKH | Khách 6 tháng không book |
| 4 Thời gian & phân loại | date/interval, CASE, NULL | Ops, Hải quan | On-time theo tuyến; thông quan theo luồng |
| 5 Nhiều bước | subquery, CTE | Kế toán, Pricing | Lô lỗ sau quy đổi tỷ giá; báo giá dưới giá mua |
| 6 Xu hướng | window functions (RANK, LAG, SUM OVER) | GĐ, Chứng từ | Top 3 khách mỗi tháng; lô kẹt ở bước nào; house ≠ master |
| 7 Điều tra | tổng hợp | Ban GĐ | Margin Q3 giảm, vì sao? D&D, claims scorecard |

## 6. Grader

- Mỗi lần chạy/nộp: `BEGIN` → query → `ROLLBACK`, nên người chơi không thể phá dữ liệu.
- Chạy query người chơi và Solution trên cùng DB, so kết quả:
  - không xét thứ tự dòng, trừ khi `ordered: true`;
  - so theo **vị trí cột**, bỏ qua tên cột;
  - **mọi giá trị số** (int, float, numeric — PGlite trả numeric dạng chuỗi) so sánh sau khi **làm tròn 2 chữ số thập phân**, nên `AVG(x)` khớp với `ROUND(AVG(x), 2)`; giá trị nằm đúng ranh giới làm tròn (0.335 vs 0.33499) có thể lệch — chấp nhận;
  - NULL bằng NULL; ngày so theo thời điểm.
- Query người chơi chỉ được **một câu lệnh** (PGlite từ chối nhiều câu trong một lần chạy), nên không thể thoát khỏi `BEGIN … ROLLBACK`.
- Phản hồi khi sai: sai số cột / thiếu N dòng / thừa N dòng / giá trị lệch (ví dụ 1 dòng). Không lộ đáp án.
- XP: base theo `difficulty`; mỗi bậc gợi ý đã mở trừ một phần.

## 7. Xử lý lỗi

| Tình huống | Xử lý |
|---|---|
| Lỗi SQL | hiển thị nguyên thông báo lỗi của Postgres |
| Query > 5 giây | `terminate()` worker, khởi động lại PGlite, nạp lại seed, báo "Query quá lâu" |
| Kết quả lớn | hiển thị 500 dòng đầu; grader so toàn bộ |
| PGlite tải lỗi | nút thử lại; inbox/đề vẫn dùng được |

## 8. Lưu tiến độ (skill save-systems)

- JSON trong `localStorage`: `{ version, completed: [ticketId], xp, hintsUsed: {ticketId: n}, drafts: {ticketId: sql} }`. Chỉ lưu ID/dữ liệu gốc; chương mở khóa, level được tính lại từ `completed`.
- Đọc save: parse → kiểm `version` → từ chối nếu mới hơn bản game (báo người chơi) → migration tuần tự vN→vN+1 → validate (bỏ ticket ID không còn tồn tại).
- Mọi truy cập `localStorage` bọc try/catch; lỗi thì chơi tiếp không lưu và báo người chơi.
- Nút **Xuất/Nhập tiến độ** (file JSON).

## 9. Kiểm thử (Vitest, PGlite chạy trong Node)

1. Solution mọi ticket (và mọi step boss) chạy được trên seed, trả kết quả khác rỗng.
2. Seed tất định: sinh 2 lần cho kết quả giống nhau; 3 câu chuyện ở §4 có mặt (ví dụ margin Q3 < Q2, tuyến châu Âu đóng góp phần giảm lớn nhất).
3. Soft-lock: theo thứ tự chương, mỗi `requires` đã được `grants` bởi ticket trước; mỗi `tables` đã mở ở chương đó hoặc trước.
4. Grader: đảo thứ tự, alias khác, thiếu/thừa dòng, lệch số thực, NULL.
5. Save: round-trip, migration từ save mẫu v1, từ chối save mới hơn.

## 10. Ngoài phạm vi

Nhánh DE · tài khoản/leaderboard/backend (khi làm: Python) · PWA/offline install · âm thanh · hiệu ứng canvas · đa ngôn ngữ (nội dung tiếng Việt, tên bảng/cột tiếng Anh).
