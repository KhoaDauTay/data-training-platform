# Cargo Query — Review UI/UX (bố cục, cấu trúc bài tập, học dễ nhớ)

Ngày: 2026-11-16 · Vai trò: UI/UX (reviewer) · Phạm vi: spec §6b, Plan 1 Task 10 (`index.html`, `src/main.ts`, `src/style.css`, `src/ui/*`), Plan 1b (tab trực quan + `src/ui/mapView.ts`), nội dung `ch1-01…ch3-05`.

Tài liệu này **không sửa** spec/plan/code. Mỗi đề xuất ghi rõ chủ sở hữu (FE / BE / Product / DevOps) khi chạm vào phần của họ. Ký hiệu: **[Cần user quyết]** = đổi định dạng hoặc đi ngược quyết định đã chốt.

---

## 0. Những lỗi UX tìm thấy trong code đã viết (ưu tiên sửa trước)

| # | Vị trí | Vấn đề | Đề xuất |
|---|---|---|---|
| 0.1 | `main.ts` `complete()` | Nộp đúng → lập tức `selectedId = next.id` + `renderAll()`: người chơi **không kịp thấy** kết quả đúng của mình, không có khoảnh khắc "mình vừa học được gì". | Nộp đúng → lưu tiến độ ngay (giữ `persist(true)`), nhưng ở lại ticket và hiện **thẻ Recap** (§1.7). Chuyển ticket chỉ khi bấm "Ticket tiếp theo →". |
| 0.2 | `main.ts` `renderTicket()` | Mỗi lần bấm Gợi ý, đổi bước boss, (sau này) đổi ngôn ngữ đều gọi `editor?.destroy()` + tạo editor mới → mất con trỏ, vùng chọn, lịch sử undo, focus. | Tách thành `renderTicketPane()` (cột trái, gọi thoải mái) và `mountEditor()` (chỉ khi đổi `ticketId#step`). Là điều kiện tiên quyết cho EN/VI (§5). Chủ: FE. |
| 0.3 | `ui/panel.ts` `show()` | `bar.replaceChildren(...)` tạo lại toàn bộ nút tab mỗi lần chuyển → nút đang có focus bị xóa, focus rơi về `<body>`. Không có `aria-controls`, không có phím mũi tên. | Tạo nút một lần; `show()` chỉ đổi `aria-selected`, `tabindex` (roving: tab đang mở `0`, còn lại `-1`) và class. Thêm ←/→/Home/End trên `role=tablist`. `id` cho tab + `aria-labelledby` cho `tabpanel`. |
| 0.4 | `main.ts` `run()` + Plan 1b `currentSql()` | Tab Kết quả/Biểu đồ dùng `lastRun` (SQL đã chạy), còn Thứ tự thực thi/EXPLAIN/Luồng/ERD dùng `currentSql()` (nội dung editor lúc mở tab) → hai tab cạnh nhau mô tả hai query khác nhau. | Mọi tab đọc `lastRun.sql`. Khi editor khác `lastRun.sql`, mọi tab hiện dải nhỏ "SQL đã thay đổi — Ctrl+Enter để cập nhật". Chủ: FE. |
| 0.5 | `stepIndex` | Không được lưu. Ở `ch1-05`/`ch2-05`/`ch3-05`, xong bước 1, tải lại trang → quay về bước 1 (draft bước 2 vẫn nằm trong `drafts["ch1-05#1"]` nhưng không tới được). Câu kết luận đang chọn dở cũng mất. | Lưu bước boss đã qua. Đây là thay đổi **save có version** (v1→v2 + fixture `tests/fixtures/save-v1.json` giữ nguyên, thêm `save-v2.json`), không phải key tiện ích. Chủ: BE/Product. |
| 0.6 | `ch1-01.md` gợi ý 1 | "xem cột Schema bên phải" — schema nằm ở tab **Cột** của panel **dưới**, không phải bên phải. Ticket đầu tiên chỉ sai chỗ. | "Mở tab **Cột** ở panel dưới để xem bảng." Chủ: FE/content. |
| 0.7 | `style.css` dark mode | `button.primary` (nút **Nộp**) chữ trắng trên `--accent #5aa9ff` = **2.46:1** (WCAG cần 4.5). | Dark: `button.primary { color: #0d1b29 }` → 7.09:1. |
| 0.8 | `.mail.done { opacity: .7 }` | Chữ muted mờ thêm 30% = 3.03:1 (sáng) / 3.80:1 (tối) — trượt AA. | Bỏ `opacity`; đánh dấu "Đã xong" bằng ✓ + chữ, giữ màu `--muted` (5.71:1). |
| 0.9 | Plan 1b `.st.skip { opacity: .5 }`, `pre.sql .dim { opacity: .4 }` | 1.99:1 và 2.95:1. | `.st.skip`: giữ màu, thêm chữ "không dùng" (đã có) + viền nét đứt. `.dim`: dùng màu `#9a9aa0` trên `#1e1e1e` (5.96:1) thay vì opacity. |
| 0.10 | Plan 1b map | Cảng hub Việt Nam tô `--bad` (đỏ) → đọc như "lỗi". | Hub dùng `--accent`, cảng mở `--good`, cảng chưa mở `--muted`. |

Bảng tương phản (đo bằng công thức WCAG trên token `:root` hiện có): muted/panel 5.71, muted/code 4.95, accent/panel 5.38, warn/panel 4.72, good/panel 5.08, bad/panel 5.62 (sáng); dark đều ≥ 5.49 trừ mục 0.7. Các token còn lại đạt AA.

---

## 1. Cấu trúc một bài tập (ticket) — từ trên xuống trong cột trái

Thứ tự cố định, mỗi khối một chức năng, để người chơi hình thành "đường mắt" giống nhau ở cả 35 ticket:

```
┌ Cột trái (#ticket) ─────────────────────────────┐
│ 1. Header   [Ops] Hoàng Khánh · Chương 1 · teach ★│
│ 2. Tin nhắn (stakeholder message, kể chuyện)     │
│ 3. Yêu cầu  (khung nhấn, 1–2 câu, có tên cột)    │
│ 4. Kết quả mong đợi (shape card)                 │
│ 5. Gợi ý  [Gợi ý 1/3 · −25% XP]                  │
│ ── (boss) stepper: ● Bước 1 ─ ○ Bước 2 ─ ○ Kết luận│
│ 7. Recap (chỉ hiện sau khi đúng)                 │
└──────────────────────────────────────────────────┘
  6. Nộp/feedback nằm ở cột phải dưới editor + panel dưới
```

### 1.1 Header
`from.dept` thành nhãn màu cố định theo phòng ban (Ops, Sales, CS, Finance, Customs, Management) — 6 màu lấy từ token, luôn kèm chữ (không chỉ màu). Beat hiển thị bằng chữ: `Bài mới` (teach), `Luyện` (develop), `Biến tấu` (twist), `Nghỉ nhẹ` (rest), `Boss`. Người chơi biết trước nhịp, không bất ngờ ở `ch3-03`.

### 1.2 Tin nhắn vs 1.3 Yêu cầu
Hiện `body` trộn lời dẫn với đặc tả (vd `ch1-03`: câu đầu là bối cảnh, câu sau là đặc tả 2 cột + tie-breaker). Đề xuất: mục tùy chọn `## Task` trong file ticket; có thì hiện trong khung nhấn "Yêu cầu", không có thì giữ như cũ. Parser hiện tại (`tickets.ts`) bỏ qua heading lạ nhưng **cắt `body` tại mọi `## `**, nên nếu thêm `## Task` mà không sửa parser thì nội dung bị mất im lặng → bắt buộc sửa `parseTicket` + test. **[Cần user quyết]** (đổi định dạng ticket, spec §3). Chủ: FE.

### 1.4 Kết quả mong đợi (shape card) — không lộ đáp án
Tính tự động: khi DB sẵn sàng, chạy `step.solution` một lần trong sandbox (đằng nào grader cũng chạy), lấy `columns.length`, `types`, `rows.length`. Hiển thị:

```
Kết quả mong đợi · 3 cột · 24 dòng · không cần thứ tự
[ cột 1: chữ ] [ cột 2: chữ ] [ cột 3: chữ ]
```

Quy tắc chống lộ:
- **Không bao giờ hiện tên cột của Solution.** Grader so theo vị trí (spec §6), và Solution không alias nên tên cột lộ hàm: `ch2-01` → `count`, `sum`; `ch2-05` bước 2 → `round`; `ch3-02` → `sum`; `ch2-03`/`ch3-04` → `count`. Chỉ hiện **loại**: `chữ` (text), `số` (mọi OID số — int và numeric gộp làm một, nếu không `ch2-05` lộ "numeric ⇒ có AVG"), `ngày`, `đúng/sai`.
- Nhãn cột người đọc được (vd "mã cảng") chỉ đến từ trường tùy chọn `columns:` trong frontmatter do người soạn viết, không bao giờ suy từ SQL. Parser đã bỏ qua key lạ nên thêm không vỡ gì; vẫn cần test khớp `columns.length` = số cột Solution. **[Cần user quyết]**.
- **Số dòng**: hiện chính xác. Không phải lộ mới — `gradeMessage` đã nói "Thiếu N dòng / Thừa N dòng" sau lần nộp sai đầu tiên. Ngược lại đây là công cụ tự kiểm tra tốt (`ch3-03`: biết trước số dòng giúp người chơi tự thấy JOIN thường cho 0 dòng).
- **Không hiện giá trị**, không hiện dòng mẫu.
- `ordered: true` → "có thứ tự (xem tiêu chí trong yêu cầu)".

Kiểm cả 18 bước Plan 1: không bước nào lộ đáp án theo quy tắc trên (chỉ đếm cột/loại/dòng). `ch2-04` cho "1 dòng · 1 cột số" — người chơi vẫn phải tự đếm.

Sau khi bấm Chạy, shape card so sánh trực tiếp: "Của bạn: 2 cột ✗ · 24 dòng ✓" — phản hồi trước khi Nộp, không tốn lượt.

### 1.5 Gợi ý
Nút hiện **giá trước khi bấm**: `Gợi ý 1/3 (−50 XP)` tính bằng `xpFor(t, n) − xpFor(t, n+1)`. Gợi ý đã mở hiển thị dạng danh sách đánh số, gợi ý 3 (khung query) nằm trong `<pre>` có nút "Chép vào editor" — chép **thêm vào cuối**, không ghi đè draft.

Boss: gợi ý hiện dùng chung cho cả ticket (`hintsUsed[ticketId]`). Giữ nguyên (đổi sẽ đụng save), nhưng ghi rõ "Gợi ý cho cả ticket".

### 1.6 Nộp → phản hồi
| Kết quả grader | Thông báo (dưới editor, `role=status`) | Panel dưới |
|---|---|---|
| `error` | Lỗi dạy học (§2.4) | Chuyển tab **Kết quả**, hiện lỗi |
| `columns` | "Cần 3 cột, bạn trả 2" | Không đổi tab; shape card tô viền `--warn` |
| `rows` | "Thiếu/Thừa N dòng…" | Chuyển **Kết quả** với kết quả của bạn; dòng `r.sample` tô nền `--accent-soft` + nhãn "không khớp" (không chỉ màu) |
| `order` | "Dữ liệu đúng, thứ tự chưa đúng" | **Kết quả**, cột đầu tiên trong `ORDER BY` của đề được nhắc lại trong thông báo |
| đúng (thường) | "Đúng!" | Giữ nguyên; Recap mở ở cột trái |
| đúng (bước boss) | "Bước 1 xong" | Stepper sang bước 2, **giữ editor của bước 1 dưới dạng read-only có thể mở** (`<details>` "SQL bước 1") để chép lại |

Twist ticket (`ch1-03`, `ch2-03`, `ch3-03`) sai lần 2 → thêm một dòng nudge: "Thử tab **Thứ tự thực thi** để xem số dòng sau từng mệnh đề." (`ch3-03` là nơi nó đáng giá nhất: thấy FROM/JOIN ra hàng nghìn dòng, `WHERE s.id IS NULL` còn vài chục dòng).

### 1.7 Recap "Bạn vừa học được" (sau khi đúng)
Không cần nội dung mới cho mỗi ticket — suy ra:
1. **Thẻ kỹ năng mở khóa**: lấy từ `grants` (§2.1). `ch2-03` → thẻ `HAVING`. Ticket không grant (`ch1-04`, `ch2-04`, `ch3-04`, các boss) → hiện "Ôn lại:" các thẻ trong `requires`.
2. **Cách của bạn vs cách tham khảo**: SQL người chơi cạnh `step.solution` (chỉ sau khi đúng nên không lộ). Đây là phần giúp nhớ nhất: thấy một cách viết thứ hai.
3. **+XP**, gợi ý đã dùng.
4. Nút chính **Ticket tiếp theo →** (focus tự chuyển vào heading Recap, `tabindex=-1`, để screen reader đọc ngay).

---

## 2. Công cụ ghi nhớ

### 2.1 Thẻ kỹ năng (cheat-sheet) mở theo `grants`
Một file nội dung cho mỗi skill id đang dùng trong Plan 1: `select`, `where`, `order_by`, `limit`, `aggregate`, `group_by`, `having`, `join`, `multi_join`, `left_join`, `anti_join` (11 thẻ). Mỗi thẻ ≤ 6 dòng, cấu trúc cố định:

```
HAVING — lọc sau khi gom nhóm            (mở ở ch2-03)
Cú pháp:  … GROUP BY customer_id HAVING COUNT(*) > 150
Khi nào:  điều kiện trên kết quả hàm gộp
Bẫy:      COUNT(*) trong WHERE → lỗi "aggregate functions are not allowed in WHERE"
Ví dụ game: ch2-03 Khách hàng chủ lực
```

- Mở khóa khi ticket grant nó hoàn thành → hiện trong Recap rồi lưu vào **Sổ tay**. Trạng thái mở khóa suy ra từ `completed` (không thêm gì vào save — đúng nguyên tắc spec §8 "tính lại từ completed").
- Test nội dung: mọi skill xuất hiện trong `grants` phải có thẻ (thêm vào `contentProblems`). Chủ: FE.
- Thẻ đã khóa hiện tiêu đề + "Mở sau `ch2-03`" (người chơi thấy lộ trình, gating có chủ đích theo level-design).

Nhận xét pacing liên quan thẻ: `ch1-03` grant 2 kỹ năng (`order_by`, `limit`) và `ch3-03` grant 2 (`left_join`, `anti_join`). `ch1-03` ổn (hai khái niệm nhỏ, gợi ý tách rõ). `ch3-03` là bước dốc nhất của 3 chương (twist + 2 khái niệm mới + điều kiện trong `ON` thay vì `WHERE`) → gộp thành một thẻ "LEFT JOIN & anti-join" có sơ đồ 2 cột (khách | lô, dòng không khớp = NULL), và để thẻ `join` mở sẵn trong Sổ tay khi vào `ch3-03`.

### 2.2 Sổ tay (glossary drawer)
Một `<dialog>` mở bằng `show()` (**không modal**) neo cạnh phải, rộng 360px, để đọc trong khi vẫn gõ editor. Hai mục: **Thẻ kỹ năng** | **Thuật ngữ**. Ô tìm kiếm lọc tức thì. Thuật ngữ **không khóa** (tra cứu không nên bị chặn); thẻ kỹ năng thì khóa (là phần thưởng).

Nguồn: một file dữ liệu `content/glossary.yml` (term, vi, en, `columns` liên quan). Danh sách tối thiểu:

| Thuật ngữ | VI (ngắn) | Cột liên quan |
|---|---|---|
| TEU / FEU | Đơn vị container 20 ft / 40 ft; 40GP = 2 TEU | `containers.teu`, `container_type` |
| ETD / ETA | Ngày tàu/bay dự kiến chạy / đến | `shipments.etd`, `eta` |
| ATD / ATA | Ngày thực tế chạy / đến (NULL = chưa xảy ra) | `atd`, `ata` |
| POL / POD | Cảng xếp / cảng dỡ | `shipments.pol`, `pod` |
| FCL / LCL | Nguyên container / hàng lẻ ghép | `shipments.load_type` |
| Incoterm (EXW, FOB, CIF, DAP…) | Điều kiện giao hàng, ai trả cước/chịu rủi ro tới đâu | `shipments.incoterm` |
| HBL / MBL | Vận đơn nhà (forwarder phát cho khách) / vận đơn chủ (hãng tàu phát cho forwarder) | bảng mở ở chương 6 |
| CFS | Kho gom hàng lẻ | bảng mở ở chương 4 |
| D&D (Demurrage & Detention) | Phí lưu container tại cảng / ngoài cảng quá free time | chương 6 |
| Luồng xanh / vàng / đỏ | Mức kiểm tra hải quan | chương 4 |
| HS code | Mã phân loại hàng hóa | chương 4 |
| Booking, Carrier, Shipper/Consignee | — | `booking_date`, `carriers` |
| SQL: NULL, alias, aggregate, GROUP BY, JOIN, anti-join… | trỏ sang thẻ kỹ năng tương ứng | — |

Liên kết tự động:
- Trong ticket: lần xuất hiện **đầu tiên** của mỗi term trong `body` được gạch chân chấm, là `<button>` mở Sổ tay đúng mục. `richText()` hiện chỉ xử lý backtick, việc khớp term làm trên text node nên không cần `innerHTML`.
- Trong tab **Cột**: cột có trong `columns` của glossary hiện badge nhỏ (`pod` → `POD`), hover/focus hiện nghĩa. Gặp `pod` ở `ch1-05` sẽ không còn phải đoán.

### 2.3 Tổng kết chương (sau boss)
Sau khi chốt kết luận ở `ch1-05`/`ch2-05`/`ch3-05`, cột trái hiện màn **Tổng kết chương N** trước khi sang chương mới:
- Các thẻ kỹ năng đã mở trong chương (bấm để lật xem).
- Bảng mới mở ở chương sau (từ `CHAPTER_TABLES`): chương 1→2 thêm `containers`.
- Tuyến mới mở trên bản đồ (map tự mở rộng và chạy `celebrate()`).
- XP chương, số gợi ý đã dùng.
- **Ôn nhanh 1 câu** (truy hồi chủ động): chọn ngẫu nhiên một ticket đã xong của chương, hiện lại yêu cầu + editor trống, nộp không tính XP. Đây là lối vào chế độ Luyện tập của Product — UX chỉ định vị trí, cơ chế (lưu/không lưu, XP) thuộc Product.

### 2.4 Lỗi biết dạy
Spec §7 nói "hiển thị nguyên thông báo lỗi của Postgres" — giữ nguyên dòng gốc (tiếng Anh, có ích khi đi làm thật) và **thêm** một khối giải thích bên dưới. Không thay thế. **[Cần user quyết]** vì mở rộng §7.

Ràng buộc kỹ thuật: worker hiện chỉ gửi `{ type: 'error', id, message }` (Plan 1 Task 2). Để map theo SQLSTATE và gạch chân vị trí lỗi trong editor cần worker gửi thêm `code` và `position` nếu PGlite có (cần BE kiểm, không khẳng định từ trí nhớ). Trước khi có, map bằng regex trên `message` — đủ cho bảng dưới.

File: `src/ui/sqlErrors.ts` — `explainError(message, code?, ctx) → { title, body, fix? }` cho cả VI và EN.

| Mẫu lỗi Postgres | Giải thích (VI) | Ticket hay gặp |
|---|---|---|
| `column "Europe" does not exist` (giá trị trong nháy kép) | Nháy kép `"…"` là **tên cột**; chuỗi dùng nháy đơn `'Europe'`. | `ch1-02`, `ch1-04` |
| `column "x" does not exist` (khác) | Không có cột này trong các bảng đang dùng. "Có phải ý bạn là `full_name`?" — gợi ý gần nhất theo khoảng cách chỉnh sửa trong cột đã mở khóa. | mọi ticket |
| `relation "x" does not exist` | Sai tên bảng hoặc bảng chưa mở ở chương này. | — |
| `syntax error at or near "…"` | Chỉ ra từ khóa gần đó; nhắc thứ tự viết SELECT → FROM → WHERE → GROUP BY → HAVING → ORDER BY → LIMIT. | `ch1-03` |
| `aggregate functions are not allowed in WHERE` | WHERE lọc **từng dòng trước** khi gom; điều kiện trên `COUNT/SUM` đặt ở `HAVING`. Link thẻ HAVING. | `ch2-03` |
| `column "…" must appear in the GROUP BY clause or be used in an aggregate function` | Mọi cột trong SELECT không nằm trong hàm gộp phải có trong GROUP BY. | `ch2-02`, `ch3-04`, `ch3-05` |
| `column reference "id" is ambiguous` | Hai bảng cùng có cột `id`; thêm alias `s.id` / `c.id`. | `ch3-01`…`ch3-05` |
| `missing FROM-clause entry for table "x"` | Dùng alias chưa khai báo ở FROM/JOIN. | chương 3 |
| `invalid input syntax for type date` | Ngày viết `'2026-10-01'` (năm-tháng-ngày). | `ch1-03`, `ch2-01` |
| `operator does not exist: …` | So sánh hai kiểu khác nhau (vd số với chữ). | — |
| `cannot insert multiple commands into a prepared statement` | Mỗi lần chỉ chạy **một** câu lệnh; xóa câu thứ hai / dấu `;` thừa. | — |
| Timeout 5s (`DbClient`) | Thường do JOIN thiếu `ON` → nhân chéo (20 000 × 20 000 = 400 triệu dòng). Kiểm tra mọi JOIN có điều kiện. | chương 3 |
| Câu không trả bảng (UPDATE…) | "Câu lệnh đã chạy và **được hoàn tác** (ROLLBACK). Dữ liệu không đổi." | — |

Câu đầu chuỗi lỗi (`message`) luôn giữ nguyên để người chơi học đọc lỗi thật. Test: mỗi dòng bảng trên có một case trong `tests/sqlErrors.test.ts` chạy SQL sai thật trên PGlite (Node) và kiểm `explainError` trả đúng tiêu đề — chống việc PGlite đổi câu chữ.

---

## 3. Công thái học bố cục

### 3.1 Khung ứng dụng
Hiện tại trang cuộn dọc: topbar → map (tối đa 190px) → workspace → panel. Ở màn 1366×768, sau Ctrl+Enter phải cuộn xuống mới thấy kết quả. Đề xuất **app shell cố định** khi viewport ≥ 1024×700:

```
body: grid-template-rows: auto auto 1fr   (height: 100dvh)
  topbar 44px
  map strip: 28px (thu gọn) / 120px (mở)    ← giảm max từ 190px
  main: grid hai hàng, chia bằng splitter ngang
     hàng trên: [#ticket 40%] ‖ [#work 60%]  (splitter dọc)
     hàng dưới: panel tab, mặc định 40% chiều cao
```

Mỗi vùng tự cuộn (`overflow:auto`), nút Chạy/Nộp và kết quả luôn cùng trong màn hình. Dưới ngưỡng đó giữ layout cuộn như Plan 1 (đã đúng ở < 900px).

### 3.2 Splitter có thể kéo (một hàm, dùng hai lần)
`src/ui/splitter.ts` (~40 dòng, không thêm thư viện): phần tử `role="separator"` `aria-orientation` `aria-valuenow/min/max` `tabindex=0`; kéo bằng pointer events; **←/→ hoặc ↑/↓ ±5%**, Home/End về min/max, nhấp đúp = mặc định. Giới hạn: cột ticket 25–60%, panel 20–70%. Lưu `{ col, row }` vào key tiện ích `cargo-query/layout` (localStorage, try/catch, giống `cargo-query/map-collapsed` — **không** đưa vào Save vì không phải tiến độ). CSS `resize:` gốc của trình duyệt bị loại vì tay cầm không dùng được bằng bàn phím.

### 3.3 Phím tắt
Trong editor (CodeMirror keymap, `Prec.highest` như `Mod-Enter` hiện có):

| Phím | Hành động |
|---|---|
| Ctrl/⌘+Enter | Chạy (đã có) |
| Ctrl/⌘+Shift+Enter | Nộp |
| Ctrl/⌘+S | Lưu draft ngay (`persist(true)`) + toast "Đã lưu"; chặn hộp thoại "Save page" của trình duyệt |
| Ctrl+Space | Gợi ý tên bảng/cột (đã có trong `basicSetup`) |

Ngoài editor (phím đơn, **bị bỏ qua khi focus trong editor/ô nhập**):

| Phím | Hành động |
|---|---|
| `?` | Bảng phím tắt |
| `i` | Hộp thư |
| `g` | Sổ tay |
| `1`…`7` | Chuyển tab panel theo thứ tự hiển thị |
| `e` | Focus vào editor |
| Esc | Đóng dialog/Sổ tay (native `<dialog>`) |

Không dùng phím đơn cho Gợi ý (tốn XP, dễ bấm nhầm). Không thêm `indentWithTab` vào CodeMirror để Tab vẫn thoát khỏi editor (bẫy bàn phím). Xung đột phím với trình duyệt (Ctrl+Shift+Enter, Ctrl+S trên Chrome/Firefox/Safari, Windows/macOS) **cần kiểm thủ công**.

### 3.4 Tab mặc định
Sau Plan 1b panel có 7 tab theo thứ tự chèn: Kết quả · Biểu đồ · Thứ tự thực thi · EXPLAIN · Luồng dữ liệu · Sơ đồ ER · Cột. Đề xuất nhóm bằng vạch ngăn (không đổi tab nào): **[Kết quả · Biểu đồ] | [Thứ tự thực thi · EXPLAIN · Luồng dữ liệu] | [Sơ đồ ER · Cột]**.

| Thời điểm | Tab mở |
|---|---|
| Vào ticket, chưa chạy lần nào (`lastRun` rỗng) | **Cột** — người mới thấy bảng trước (hiện mở Kết quả rỗng) |
| Sau Chạy, thành công | Giữ tab nếu đang ở Kết quả/Biểu đồ/Thứ tự/EXPLAIN/Luồng (các tab này vẽ lại theo SQL mới); nếu đang ở ER/Cột → **Kết quả** (giữ logic hiện có, mở rộng thêm ER) |
| Sau Chạy, lỗi | **Kết quả** (hiện lỗi dạy học) |
| Sau Nộp | theo bảng §1.6 |
| Bấm nút EXPLAIN | EXPLAIN (đã có) |

Bỏ ngỏ: ẩn EXPLAIN + Luồng dữ liệu ở chương 1–2 (chỉ hiện từ chương 3 khi JOIN làm plan có ý nghĩa) và Biểu đồ ở chương 1 (chưa có kết quả gộp để vẽ). Giảm tải nhận thức theo level-design (giới thiệu từng thứ một), nhưng đi ngược bố cục đã chốt ở §6b. **[Cần user quyết]** — mặc định của tôi: hiện tất cả, chỉ thêm chấm "mới" lên tab Biểu đồ khi vào `ch2-01`, EXPLAIN khi vào `ch3-01`.

### 3.5 Dải bản đồ
- **Trạng thái thu gọn (28px) luôn có ích**: `Chương 2 · ● ● ◐ ○ ◆` (5 chấm = 5 ticket theo beat, ◆ = boss, ◐ = đang làm) + `Tuyến đã mở 5/N` + nút mở. Đây là thanh tiến độ hiển thị mà Product yêu cầu, không tốn thêm hàng.
- **Mở (120px)**: như Plan 1b. Tự mở khi bắt đầu chương mới và khi `celebrate()`, rồi trở về lựa chọn đã lưu của người chơi (`cargo-query/map-collapsed`). Viewport cao < 800px → mặc định thu gọn.
- **Cảng của ticket hiện tại** được tô viền: lấy mã cảng 5 ký tự trong `step.solution` **và** cũng có trong `body` (vd `ch1-05` → `NLRTM`). Không cần sửa nội dung. Điều kiện "có trong body" để không lộ cảng mà người chơi phải tự tìm.
- Tooltip `<title>` không dùng được bằng bàn phím → thêm `<details>` "Danh sách tuyến" ở map bar (bảng: tuyến, số lô) làm text thay thế.

### 3.6 Màn hẹp / điện thoại
- 600–900px: xếp một cột (đã có). Dải tab panel `flex-wrap: nowrap; overflow-x: auto` thay vì xuống 3 hàng.
- < 600px: ẩn bản đồ; thanh hành động (Chạy / Nộp) `position: sticky; bottom: 0`; editor `font-size: 16px` trên `pointer: coarse` (iOS tự zoom khi focus ô có chữ < 16px). Banner một lần: "Chơi tốt nhất trên màn hình ≥ 1024px" (key tiện ích `cargo-query/narrow-ack`). Không làm bố cục riêng cho điện thoại — đối tượng chính là team dùng laptop.

### 3.7 Trợ năng
- **Thứ tự focus**: topbar (Hộp thư → Sổ tay → VI|EN → menu) → nút bản đồ → `#ticket` (Gợi ý, kết luận, Recap) → editor → Chạy / EXPLAIN / Nộp → panel tablist → nội dung tab. Đúng thứ tự DOM hiện có; giữ nguyên, không dùng `tabindex>0`.
- **Quản lý focus**: chọn ticket trong Hộp thư → focus `h2` tiêu đề ticket; Nộp đúng → focus heading Recap; Nộp sai → focus ở lại editor (thông báo đã có `role=status`).
- Tab panel: sửa theo 0.3. Bảng kết quả: thêm `<caption>` "Kết quả: 24 dòng".
- `<html lang>` đổi theo ngôn ngữ (§5).
- **Giảm chuyển động**: các chỗ đã kiểm `reducedMotion()`: tàu trên map, `celebrate()`, chấm chạy ở Luồng dữ liệu, transition `.bar-row`. Bổ sung: hiệu ứng nhấn shape card (§1.6) và lật thẻ kỹ năng cũng tắt; thêm quy tắc CSS chung `@media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; scroll-behavior: auto !important } }` làm lưới an toàn. Nút "▶ Phát" ở Thứ tự thực thi vẫn để thủ công (đã đúng).
- Tương phản: sửa 0.7–0.9.

---

## 4. Onboarding — 2 phút đầu

Mục tiêu theo level-design: **teach ở nơi thất bại không tốn gì**, chiến thắng đầu tiên trong < 30 giây.

| Thời điểm | Người chơi thấy | Ghi chú |
|---|---|---|
| 0–1s | Ticket `ch1-01` đã render (không chờ DB). Topbar: "Đang khởi tạo database… ≈3s". | Đã đúng theo spec §3. |
| 0–3s | Editor đã điền sẵn `SELECT * FROM ports` (starter, chỉ khi draft rỗng). Nút Chạy hiện "Đang chuẩn bị DB…" và **bị khóa** cho tới `ready`; bấm Ctrl+Enter trong lúc chờ → xếp hàng, chạy ngay khi sẵn sàng. | Starter: trường tùy chọn `starter:` cho ticket `beat: teach`. **[Cần user quyết]** (định dạng). |
| ~5s | Coach mark 1 (trong khung ticket): "Đây là yêu cầu từ đồng nghiệp. Đọc xong, nhấn **Chạy**." | Coach mark là khung `.coach` chèn ngay trong vùng đó (không popover nổi, không cần định vị), nút "Hiểu rồi" + "Bỏ qua hướng dẫn". |
| ~10s | Chạy → 24 dòng. Coach mark 2 (panel): "Kết quả ở đây. Tab **Cột** liệt kê các bảng bạn được dùng." Shape card: "Của bạn: 6 cột ✗ · cần 3". | Chiến thắng đầu tiên (query chạy được) trước khi phải viết gì. |
| ~30–60s | Người chơi sửa thành 3 cột → shape card ✓ → Coach mark 3: "Khớp hình dạng rồi — nhấn **Nộp**." | |
| ~60–90s | Nộp đúng → Recap: thẻ `SELECT` mở, "Cách tham khảo", +100 XP. Coach mark 4: "Thẻ kỹ năng được lưu trong **Sổ tay** (phím `g`)." | |
| ~90–120s | "Ticket tiếp theo →" → `ch1-02`. Không còn coach mark; gợi ý đầu `ch1-02` đã chỉ `region`/`kind`. | |

Trạng thái "đã xem hướng dẫn" là key tiện ích `cargo-query/coach-done` (không thuộc Save). Menu topbar có "Xem lại hướng dẫn".

### Trạng thái rỗng
| Chỗ | Nội dung |
|---|---|
| Kết quả, chưa chạy | "Chạy query (Ctrl+Enter) để xem kết quả." (đã có) |
| Kết quả, 0 dòng | "Query chạy được nhưng 0 dòng — kiểm tra điều kiện WHERE / JOIN." (hiện chỉ "0 dòng") |
| Biểu đồ, không vẽ được | "Cần 1 cột nhãn + ≥ 1 cột số. Ví dụ: kết quả của ch2-02." |
| Thứ tự thực thi / EXPLAIN / Luồng, chưa có SQL | "Viết query trong editor trước." (đã có) → đổi thành "Chạy query trước." theo 0.4 |
| Thứ tự thực thi, query có `WITH`/window | Giữ thông báo hiện có + nút "Xem EXPLAIN". |
| Sổ tay, thẻ khóa | Tiêu đề + "Mở sau ch2-03". |
| Sổ tay, tìm không thấy | "Không có thuật ngữ khớp '…'." |
| Hộp thư, hết ticket | "Bạn đã xong mọi ticket hiện có. Vào **Luyện tập** để làm lại." |
| DB lỗi tải | Đề vẫn đọc được, editor gõ được, nút "Thử lại database" (đã có). |
| Dữ liệu ngoài (import) chưa có | Ở tab Cột, mục "Dữ liệu của bạn": "Kéo thả CSV vào đây để thử query trên dữ liệu của bạn." — cơ chế thuộc Product/BE. |

---

## 5. Công tắc EN/VI

Mâu thuẫn: spec §10 ghi "đa ngôn ngữ: ngoài phạm vi". Yêu cầu mới của user thay quyết định này — cần cập nhật spec. **[Cần user quyết]** chỉ ở mức xác nhận cập nhật §10.

**Vị trí**: topbar, sát trái nút menu: nhóm hai nút `VI | EN` (`<button aria-pressed>`), không phải dropdown — một lần bấm, thấy ngay ngôn ngữ đang dùng. Lưu ở key tiện ích `cargo-query/lang`; lần đầu lấy theo `navigator.language` (`vi*` → VI, còn lại EN). Không đưa vào Save.

**Đổi ngôn ngữ không mất trạng thái editor.** "Trạng thái" gồm: nội dung, con trỏ, vùng chọn, lịch sử undo, focus, tab panel đang mở, `lastRun`, bước boss, gợi ý đã mở, câu kết luận đang chọn dở. Đối chiếu vòng đời Task 10:

| Phần | Hiện tại khi gọi `renderTicket()` | Yêu cầu khi đổi ngôn ngữ |
|---|---|---|
| Nội dung editor | Còn (đọc lại từ `drafts`) | Còn — không remount |
| Con trỏ / vùng chọn / undo / focus | **Mất** (`editor.destroy()`) | Còn: chỉ đổi `aria-label` + placeholder qua `Compartment.reconfigure` |
| Tab panel đang mở | Còn (`panel.active`) | Còn; `panel.refresh()` chỉ đổi nhãn. Thứ tự thực thi gọi lại `db.steps()` khi render → cần cache theo SQL như `planCache` |
| `lastRun` | Còn | Còn; bảng không đổi, chỉ số định dạng lại (`fmt` đang cố định `vi-VN` → theo ngôn ngữ: `1.234` vs `1,234`) |
| Bước boss (`stepIndex`) | Còn trong phiên | Còn |
| Gợi ý đã mở | Còn (`hintsUsed`) | Còn, hiện bản dịch |
| Kết luận đang chọn | **Mất** (form dựng lại) | Giữ chỉ số radio đã chọn |
| Thông báo feedback dưới editor | Mất | Dịch lại thông báo cuối (giữ `GradeResult` cuối, không giữ chuỗi) |

Hệ quả: đổi ngôn ngữ = `renderTopbar()` + `renderInbox()` + `renderTicketPane()` + nhãn panel; **không bao giờ** `mountEditor()`. Đây là cùng một refactor với 0.2.

Quy tắc hiển thị:
- Tên bảng/cột, SQL, mã cảng: không dịch.
- Lỗi Postgres gốc: luôn tiếng Anh; khối giải thích theo ngôn ngữ đang chọn.
- Ticket thiếu bản EN → hiện bản VI kèm nhãn "Chưa có bản tiếng Anh" (không chặn chơi).
- Thuật ngữ trong Sổ tay luôn hiện cả hai: `TEU — Twenty-foot Equivalent Unit · đơn vị container 20 ft`.

Định dạng file dịch (ví dụ `ch1-01.en.md` chỉ chứa body/hints/step prompt, Solution dùng chung) thuộc FE — UX chỉ yêu cầu: Solution và `columns:` nhãn phải có ở cả hai ngôn ngữ, và test nội dung báo ticket thiếu bản dịch.

---

## 6. Pacing (theo skill level-design) cho ch1–ch3

Nhịp hiện tại (beat · độ khó):

```
ch1  teach1  develop1  twist2  rest1  boss2
ch2  teach1  develop2  twist2  rest1  boss3
ch3  teach2  develop3  twist3  rest2  boss3
```

Răng cưa đúng (`contentProblems` đã ép teach đầu, rest trước boss, đúng 1 boss). Các điểm cần chỉnh:

1. **Boss không kiểm tra kỹ năng twist của chương.** `ch2-05` chỉ dùng `aggregate`, `group_by` — không dùng `HAVING` (`ch2-03`) ngoài câu kết luận. `ch3-05` dùng `multi_join` — không dùng `LEFT JOIN`/anti-join (`ch3-03`) ngoài câu kết luận. Level-design: boss là nơi *test* điều đã dạy. Đề xuất bước 3 cho mỗi boss, ví dụ `ch2-05` "chỉ giữ loại container có tổng TEU > N" (HAVING); `ch3-05` "khách top 5 nào không có lô nào từ 2026-03-01" (anti-join, có sẵn móc câu chuyện khách 171–190). Chủ: FE/content. **[Cần user quyết]** (đổi nội dung đã chốt).
2. **Boss dạy hàm mới.** `ch2-05` bước 2 dùng `AVG` và `ROUND(…, 2)` — chưa ticket nào trước dạy (`ch2-01` gợi ý chỉ nói `COUNT`, `SUM`). Mechanic mới gặp lần đầu trong boss là ngược quy tắc. Cách rẻ nhất: thêm `AVG`/`ROUND` vào gợi ý 1 của `ch2-01` và thẻ `aggregate` (grader đã làm tròn 2 số nên `ROUND` là tùy chọn — nói rõ điều đó trong bước 2).
3. **`ch3-03` dốc nhất** (twist, 2 kỹ năng, điều kiện trong `ON`). Giữ, nhưng bù bằng: thẻ gộp (§2.1), nudge tab Thứ tự thực thi (§1.6), shape card cho biết số dòng cần ra (vài chục, không phải 0 hay hàng nghìn).
4. **Rest = điểm ôn.** `ch1-04`, `ch2-04`, `ch3-04` không grant gì → mở sẵn thẻ của `requires` trong Sổ tay và Recap ghi "Ôn lại". Biến ticket nghỉ thành truy hồi có chủ đích.
5. Ticket teach ở chương 1 có `starter:` (§4); teach chương 2–3 không cần (người chơi đã quen vòng lặp).

Đề xuất thêm vào `contentProblems` (đúng tinh thần "check it" của skill): (a) mỗi skill grant ở twist phải xuất hiện trong `requires` của boss cùng chương; (b) mọi skill có thẻ kỹ năng. Kiểm (a) với nội dung hiện tại sẽ báo lỗi ở `ch2-05` và `ch3-05` — đúng ý đồ, cần sửa nội dung trước khi bật.

---

## 7. Topbar sau khi thêm mọi thứ

```
Cargo Query │ Chương 2 · Báo cáo sản lượng │ ★ 450 XP ······ 📥 Hộp thư (1) │ 📒 Sổ tay │ VI|EN │ ⋯ │ ● DB
```

`⋯` là menu dùng thuộc tính `popover` gốc: Xuất tiến độ · Nhập tiến độ · Phím tắt (`?`) · Xem lại hướng dẫn. Gom Xuất/Nhập (dùng ít) vào menu để topbar không xuống dòng ở 1366px. `● DB` là chấm trạng thái + chữ ẩn cho screen reader ("Database sẵn sàng"); khi lỗi hiện nút "Thử lại" đầy đủ. Hộp thư thêm tab thứ hai **Luyện tập** (ticket đã xong) — vị trí do UX đề xuất, cơ chế do Product.

---

## 8. Tổng hợp việc theo chủ sở hữu

| Việc | Chủ | Cỡ |
|---|---|---|
| 0.1 Recap thay cho auto-jump; 0.2 tách `renderTicketPane`/`mountEditor` | FE | M |
| 0.3 tablist đúng ARIA; 0.7–0.10 màu/tương phản | FE | S |
| 0.4 mọi tab dùng `lastRun.sql` + dải "SQL đã đổi" | FE | S |
| 0.5 lưu bước boss (save v2 + migration + fixture) | BE/Product | S |
| Shape card (§1.4) | FE | S |
| Thẻ kỹ năng + Sổ tay + glossary (§2.1–2.2) | FE + content | M |
| Lỗi biết dạy (§2.4); worker gửi `code`/`position` | FE + BE | M |
| App shell + splitter + phím tắt (§3.1–3.3) | FE | M |
| Coach marks + starter (§4) | FE | S |
| EN/VI (§5) | FE | L |
| Pacing: bước 3 cho boss, AVG/ROUND, check mới (§6) | FE/content | M |
