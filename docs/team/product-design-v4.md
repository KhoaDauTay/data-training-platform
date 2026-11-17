# Cargo Query: Product Design v4 (onboarding, bài học nhanh, lộ trình học)

Ngày: 2026-11-17 · Vai trò: Product Designer (thiết kế học tập) · Theo **L53** (`decision-log.md`).
Đầu vào: `curriculum.md` §5, `problem-design.md` §1, `product-design-v3.md`, `ui-ux-v4.md`, `glossary-vi.md` (L51), `content/skills.yml`, `content/chapters.yml`, 15 ticket ch1–3, `src/ui/coach.ts`, `src/ui/brief.ts`, `src/ui/chapterView.ts`, `src/ui/modes.ts`, `src/ui/homeView.ts`, `src/practice.ts`, `tests/content.test.ts`, `src/db/seed.sql`.
Mockup: `.superpowers/brainstorm/11840-1794844744/content/onboarding-path-v7.html` (6 màn, có sáng/tối, 375 px).

Tài liệu này **chỉ đề xuất**. Nó không sửa `src/`, `content/` hay test. User duyệt phần **G (Quyết định)** trước khi build.

---

## 0. Tóm tắt một trang

| Phản hồi L53 | Nguyên nhân gốc (đã kiểm trong code) | Đề xuất |
|---|---|---|
| (1) Không hiểu công cụ, luồng dùng | Coach mark hiện chỉ có 4 câu trên 2 ticket đầu (`coach.ts`), không giới thiệu Hộp thư, thẻ "Kết quả mong đợi", tab Cột, Luyện tập, Dữ liệu, Bảng điều hành. Lần mở đầu mất 10–13 s chờ DB (L46, L50) mà không dạy gì. | **Onboarding 3 lớp** (§B): màn chào dùng đúng 10–13 s chờ DB, tour tương tác 8 bước *trên chính ticket ch1-01*, mở dần tab/nav theo tiến độ. Bỏ qua và xem lại được. |
| (2) Đề khó hiểu, không biết dùng công cụ gì | Ứng dụng **dạy sau, không dạy trước**: cú pháp của kỹ năng chỉ hiện trong Recap *sau khi* giải xong. 22/38 kỹ năng được mở ở ticket không có ví dụ mẫu lẫn khung điền (gồm toàn bộ 11 kỹ năng ch1–3). Chip "Dạy: Lọc dòng" đã có nhưng không bấm được, không có chữ WHERE. | **Bài học nhanh** (micro-lesson) cho mỗi kỹ năng, hiện **trước** ticket đầu tiên mở kỹ năng đó (§C): khái niệm, cú pháp, 1 ví dụ chạy được trên dữ liệu thật, lỗi hay gặp, "dấu hiệu trong đề", nút **Thử ngay** có tự kiểm. Chip kỹ năng bấm được, nhãn có từ khóa: "Lọc dòng (WHERE)". Gợi ý 3 bậc đổi thành *khái niệm → cú pháp → gần đáp án*. |
| (3) Lộ trình học theo chương | Trang chủ có lưới 12 card chương và lưới kỹ năng, nhưng không có thứ tự học bên trong chương, không thấy điều kiện tiên quyết, không phân biệt việc bắt buộc với việc tùy chọn. | **Lộ trình kiểu roadmap.sh** (§D): mỗi chương một trục nút (bài học → việc → luyện), trạng thái khóa / mở / đang làm / xong / thành thạo (hộp Leitner), nhánh tùy chọn nét đứt (bài tuyến, luyện thêm). Một màn tổng 12 chương. **Toàn bộ suy ra từ dữ liệu có sẵn**; nội dung mới duy nhất là bài học nhanh. |

**MVP đề xuất (pha 1–2, ~5–7 ngày):** sửa nội dung ch1–3 + bài học nhanh cho 11 kỹ năng ch1–3 + chip bấm được + giá trị mẫu trong tab Cột + onboarding. Lộ trình (pha 3) làm sau khi user chơi thử MVP. **Không tăng `SAVE_VERSION`** (§F.3).

---

## A. Chẩn đoán: đi qua ch1-01 → ch1-05 như một người mới hoàn toàn

Giả định người chơi: đã dùng Excel, chưa từng viết SQL (cũng là đối tượng của tutorial Mode/ThoughtSpot, xem §H).

### A.1 Ticket theo ticket

| Ticket | Người mới cần biết | Ứng dụng đã giới thiệu chưa? | Chỗ kẹt cụ thể |
|---|---|---|---|
| **ch1-01** (teach, mở `select`) | Bảng / dòng / cột là gì; `SELECT … FROM …`; liệt kê cột cách nhau bằng dấu phẩy; tên cột lấy ở đâu; Chạy khác Nộp thế nào. | Coach `brief` nói "bấm Chạy". Starter `SELECT * FROM ports` chạy được. Tab Cột chỉ được nhắc ở **gợi ý 1** (trừ 25% XP). Dấu phẩy chỉ có ở **gợi ý 2**. | Chạy starter ra 6 cột × 24 dòng; thẻ "Kết quả mong đợi" ghi 3 cột. Người chơi không biết sửa `*` thành gì vì chưa ai nói `*` là "mọi cột". "Không cần sắp xếp" nhắc tới một khái niệm chưa học. |
| **ch1-02** (develop, mở `where`) — **chỗ user phàn nàn** | Lọc dòng bằng `WHERE`; `=`; chuỗi trong **nháy đơn**; `AND`; giá trị lưu bằng tiếng Anh, viết hoa (`'Europe'`, `'SEAPORT'`); "châu Âu" là `region`, không phải `country`. | **Không ở đâu.** Chỉ có chip "Dạy: Lọc dòng" (không có chữ WHERE, không bấm được). Đề có "Chỉ lấy cảng biển, bỏ sân bay": câu này là tín hiệu lọc, nhưng người mới chưa từng được dạy rằng "chỉ… / bỏ…" nghĩa là lọc dòng. Coach mark ở ticket này lại nhấn rằng **mỗi gợi ý trừ 25% XP**, đúng lúc gợi ý là chỗ duy nhất có chữ WHERE. | Không biết cú pháp; không đoán được giá trị: tab Dữ liệu hiện mẫu `LIMIT 5`, mà 5 dòng đầu của `ports` đều là Việt Nam/châu Á, toàn `SEAPORT`, nên `'Europe'` và `'AIRPORT'` không thấy được nếu không biết tự chạy `SELECT *`. Ticket không có `format`, `## Example`, `reflect`, `wrong`. |
| **ch1-03** (twist, mở `order_by` + `limit`) | `ORDER BY`, `DESC`, tiêu chí phụ khi trùng, `LIMIT`; so sánh ngày với chuỗi `'2026-10-01'`; khoảng nửa mở `>= … AND < …`; chọn đúng cột ngày (`booking_date`, không phải `etd`); 3 điều kiện lọc; "kể cả lô hủy" = *không* lọc trạng thái. | Không giới thiệu gì. Phép so sánh `>=`/`<` và ngày chưa từng xuất hiện trước đó. | **Hai kỹ năng mới + một khái niệm chưa có trong `skills.yml` (so sánh ngày) + bẫy dữ liệu** dồn vào một ticket. Đây là bước nhảy độ khó lớn nhất ch1. |
| **ch1-04** (rest) | Như ch1-02, với `employees.dept = 'Customs'`. | Bài ôn, đúng vai trò. | Đề nói "phòng Hải quan", DB lưu `'Customs'`. Manh mối duy nhất là chip phòng ban "Customs" cạnh tên người gửi (rất kín). Lại phải đoán giá trị. |
| **ch1-05** (cột mốc, 3 bước) | `pod` = cảng dỡ (thuật ngữ nghề), trạng thái `'IN_TRANSIT'`, so sánh ngày, `ORDER BY … LIMIT 3`. | Kỹ năng đã có. | Lại đoán giá trị (`'IN_TRANSIT'`); `pod` có trong Sổ tay nhưng không ai chỉ tới. |

### A.2 Năm lỗi hệ thống (không riêng ch1)

1. **Dạy sau, không dạy trước.** Thẻ kỹ năng (`syntax`/`when`/`trap`) chỉ hiện trong Recap *sau khi* nộp đúng (`brief.ts` `recap()`). Sổ tay chỉ mở thẻ của kỹ năng đã học (`notebook.ts` lọc theo `learnedSkills`). Người mới không có chỗ nào để học khái niệm *trước* khi cần dùng.
2. **Cơ chế Plan 2 không áp vào ch1–3.** `format: worked/faded`, `## Example`, `reflect`, `wrong` được thêm từ ch4 (`tests/content.test.ts` chỉ kiểm `chapter >= 4`). Grep xác nhận: **0/15** ticket ch1–3 có `format` hoặc `reflect`; chỉ ch1-03 và ch2-03 có `variants`. Đúng các chương người mới gặp đầu tiên lại ít giàn giáo nhất.
3. **Luật "teach = ví dụ mẫu" gắn vào `beat`, không gắn vào kỹ năng.** Mỗi chương chỉ có 1 ticket `teach`, nhưng dạy 3–4 kỹ năng. Toàn bộ 12 chương: **22/38 kỹ năng** được mở ở ticket `open` (không ví dụ, không khung): 11 kỹ năng ch1–3, cộng 11 kỹ năng mở ở `develop`/`twist` của ch4–11 (`null_logic`, `coalesce`, `self_join`, `distinct`, `cast`, `exists`, `correlated_value`, `distinct_on`, `full_join`, `window_agg`, `index_design`). Luật mới phải gắn vào **`grants`**: *kỹ năng nào cũng có bài học trước lần dùng đầu tiên*.
4. **Không có thói quen "xem dữ liệu trước".** Giá trị mã hóa (`'Europe'`, `'SEAPORT'`, `'Customs'`, `'IN_TRANSIT'`) chỉ lộ ra ở gợi ý 2. Analyst thật sẽ xem giá trị của cột trước. Ứng dụng không dạy việc này và cũng không có chỗ xem nhanh.
5. **Gợi ý là cách duy nhất gọi tên khái niệm, và gợi ý bị phạt.** Bậc 1 hiện tại là "nghiệp vụ → dữ liệu" (`problem-design.md` §1.5), không gọi tên khái niệm cần dùng. Coach mark ticket 2 nhấn mạnh tiền phạt. Người mới bị đẩy vào thế phải đoán hoặc mất XP.

### A.3 Điều đang làm tốt (giữ nguyên)

- Đề là câu hỏi nghiệp vụ (L24) và thẻ "Kết quả mong đợi" (số cột, số dòng, ✓/✗ sau khi chạy): đây là phản hồi tức thì tốt nhất của app.
- Starter `SELECT * FROM ports` chạy được ngay, nên người chơi có kết quả trong giây đầu tiên.
- Chip "Dạy / Cần" (`chapterView.ts` `skillChips`) và thẻ mục tiêu chương (`goalCard`) đã có chỗ; chỉ cần làm cho chúng **dạy được**.
- Giải thích lỗi theo SQLSTATE (`sqlErrors.ts`) và `wrong:` (ch4+) là nền tốt để thêm vào ch1–3.

---

## B. Onboarding flow

### B.1 Mục tiêu

Sau ~90 giây (không tính chờ DB), người chơi mới **tự làm được vòng Đọc → Viết → Chạy → So thẻ → Nộp** trên ch1-01, và biết 5 chỗ: Hộp thư / khung yêu cầu, editor, Kết quả + Cột, Gợi ý + Bài học nhanh, Lộ trình. Các chế độ khác (Luyện tập, Sandbox, Dữ liệu, Bảng điều hành) được giới thiệu **khi chúng có ích lần đầu**, không dồn vào ngày 1.

### B.2 Ba lớp

**Lớp 1: Màn chào trong lúc tải DB (0–13 s).** Hiện tại người chơi nhìn thanh "Đang tải database x MB" 10–13 s (L46/L50). Dùng đúng khoảng này:

| Bước | Nội dung (VI; EN cùng ý) | Thao tác |
|---|---|---|
| 1. Chào | "Bạn là Data Analyst mới ở Cargo Query Logistics, Đà Nẵng. Đồng nghiệp gửi câu hỏi nghiệp vụ; bạn trả lời bằng SQL. 12 chương, từ Junior DA tới Trưởng nhóm Phân tích." | Chọn ngôn ngữ VI/EN (đã có pref `lang`). |
| 2. Một việc gồm 4 bước | Hình 4 ô: **Đọc yêu cầu → Viết SQL → Chạy, so với "Kết quả mong đợi" → Nộp**. Một dòng: "Chạy bao nhiêu lần cũng được, không mất gì. Chỉ Nộp mới được chấm." | — |
| 3. Bạn đã biết SQL chưa? | Hai nút: **"Mới bắt đầu, hướng dẫn mình"** (tour lớp 2) / **"Đã biết SQL, bỏ qua"** (ghi `coach-done`, bài học nhanh mặc định thu gọn, xem §C.6). | Lựa chọn này chống *expertise reversal* (§H). |

Thanh tải DB vẫn hiện ở chân màn chào. DB sẵn sàng trước khi đọc xong thì nút "Vào việc đầu tiên" sáng lên; chưa xong thì nút ghi "Đang chuẩn bị dữ liệu… x MB".

**Lớp 2: Tour tương tác trên ch1-01 (~60–90 s, 8 bước).** Không dùng ticket giả: tour chạy trên ch1-01 thật, mỗi bước chờ người chơi **làm** chứ không chỉ bấm "Tiếp". Mở rộng `coach.ts` (đang có 4 spot) thành chuỗi bước, vẫn đặt *trong* vùng (không popover nổi, giữ quy tắc a11y/focus đang có).

| # | Vùng | Lời (VI) | Bước xong khi |
|---|---|---|---|
| 1 | Khung yêu cầu | "Đây là tin nhắn của anh Khánh. Phần **Việc cần làm** là câu hỏi; thẻ **Kết quả mong đợi** cho biết cần mấy cột, mấy dòng." | Bấm "Tiếp" |
| 2 | Editor | "Editor có sẵn một câu SQL. Bấm **Chạy** ({mod}+Enter)." | Có lần chạy đầu (`app.lastRun`) |
| 3 | Tab Kết quả | "Kết quả có 6 cột, thẻ mong đợi cần 3. Dấu ✗ trên thẻ cho biết còn lệch." | Bấm "Tiếp" |
| 4 | Thẻ Bài học nhanh *Chọn cột (SELECT)* | "Chưa biết sửa sao? Bài học 1 phút này chỉ cách chọn cột. Bấm **Chạy ví dụ**." | Chạy ví dụ trong thẻ |
| 5 | Tab Cột | "Tên cột của mỗi bảng nằm ở đây." | Mở tab Cột |
| 6 | Editor | "Sửa câu SQL rồi Chạy lại tới khi thẻ hiện ✓ ✓." | Lần chạy khớp shape |
| 7 | Nút Nộp | "Khớp rồi thì **Nộp** ({mod}+Shift+Enter)." | Nộp đúng |
| 8 | Recap + Lộ trình | "Bạn vừa học *Chọn cột*. Việc tiếp theo dạy *Lọc dòng*. Xem cả chặng trong **Lộ trình chương 1**." | Bấm "Việc tiếp theo" hoặc "Xem lộ trình" |

Mỗi bước có "Bỏ qua hướng dẫn" (Esc). Tour không chặn thao tác: người chơi làm khác đi (vd Nộp luôn) thì tour nhảy tới bước tương ứng (suy ra từ `lastRun`/`done()`, như `spotNow()` đang làm).

**Lớp 3: Mở dần (progressive disclosure) và lời giới thiệu khi gặp lần đầu.**

| Thứ | Ngày 1 (trước khi xong ch1-01) | Hiện khi | Lời giới thiệu một lần (coach mark nhỏ) |
|---|---|---|---|
| Tab dưới | **Kết quả, Cột** | Thứ tự thực thi: ch1-03 (lần đầu có ORDER BY); Biểu đồ: ch2-02 (lần đầu có nhiều nhóm); Sơ đồ ER: ch3-01 (lần đầu nối bảng); Luồng dữ liệu: ch3-01; EXPLAIN: ch11-01 (đã có `newAt`) | "Tab mới: …" + chấm "mới" (dùng lại `newAt` của `registerTab`, thêm `from: <ticket id>`) |
| Nav **Luyện tập** | hiện, có khóa + tooltip "Mở sau khi học kỹ năng đầu tiên" | xong ch1-01 | Lần đầu có thẻ đến hạn: "Ôn ngắt quãng giúp nhớ lâu, 0 XP, không trừ gì" |
| Nav **Dữ liệu** | hiện | luôn | Bước 5 tour nhắc "toàn bộ bảng có ở trang Dữ liệu" |
| Nav **Bảng điều hành** | hiện, có khóa | xong ch1-02 (đã có card bảng từ ch1, D-A3) | "Ghim kết quả của bạn thành card" |
| Nav **Sandbox** | hiện | luôn | Không cần |
| Hộp thư | hiện | luôn | Bước 8 tour |

Ghi chú: giữ nav 6 mục cố định (L49) để bố cục không nhảy; chỉ **khóa + tooltip**, không ẩn. Đây là quyết định **D-O3**.

### B.3 Trạng thái rỗng (empty states)

| Chỗ | Hiện tại | Đề xuất (VI) |
|---|---|---|
| Tab Kết quả trước lần chạy đầu | trống | "Bấm **Chạy** ({mod}+Enter) để xem kết quả ở đây." + mũi tên tới nút Chạy |
| Luyện tập khi chưa học kỹ năng nào | về Trang chủ kèm giải thích (L37) | "Chưa có gì để ôn. Học xong kỹ năng đầu tiên ở việc 1, kỹ năng đó sẽ vào hàng ôn." + nút "Tới việc 1" |
| Bảng điều hành chưa có card | **Đã có** ("Ghim truy vấn đầu tiên của bạn" + nút "Tạo card trong Sandbox") | Giữ nguyên |
| Lịch sử query của ticket | — | "Các lần chạy của bạn sẽ hiện ở đây (tối đa 15)." |
| Sandbox lần đầu | editor trống | Starter gợi ý: `SELECT * FROM ports LIMIT 20` + dòng "Sandbox không chấm, chạy gì cũng được." |

### B.4 Bỏ qua, xem lại, lưu

- **Bỏ qua:** nút ở mọi bước + Esc; ghi pref `cargo-query/coach-done = true` (khóa đang có).
- **Xem lại:** mục "Xem lại hướng dẫn" trong menu `⋯` và trong Sổ tay. Xem lại thì tour chạy trên **Sandbox** với một bài mẫu không chấm, để không đụng ticket đã xong. (Phương án rẻ hơn: chỉ phát lại lớp 1 + danh sách 8 bước dạng ảnh tĩnh, quyết định **D-O2**.)
- **Lưu:** thêm pref `cargo-query/tour` = `{ step: number }` (đọc qua `readJson` + validate, như `coachDone`). Không vào Save, không theo Xuất/Nhập tiến độ.

### B.5 Quan hệ với coach mark hiện có

| Spot hiện có | Thành |
|---|---|
| `brief` ("bấm Chạy") | bước 1–2 |
| `panel` ("kết quả ở đây, tab Cột") | bước 3 + 5 |
| `recap` | bước 8 |
| `hints` (ticket 2: "mỗi gợi ý trừ 25% XP") | **Đổi lời:** "Ticket này dạy kỹ năng mới. Đọc **Bài học nhanh** phía trên trước (miễn phí). Kẹt nữa thì mở Gợi ý; gợi ý đầu chỉ nhắc khái niệm." |

### B.6 Chỉ số thành công (không telemetry: D6 chỉ cho nút "Sao chép chẩn đoán")

Đo bằng **buổi thử có quan sát với 5 người mới** (bạn bè / đồng nghiệp chưa biết SQL), mỗi người gửi lại chuỗi chẩn đoán. Thêm vào chuỗi chẩn đoán: `hintsUsed` từng ticket ch1, số bài học nhanh đã "Thử ngay" đạt, bước tour cuối cùng, có bỏ qua tour không.

| Chỉ số | Mục tiêu MVP |
|---|---|
| Thời gian từ "DB sẵn sàng" tới lần Chạy đầu | ≤ 30 s, 5/5 người |
| Xong ch1-01 mà không mở gợi ý 3 | ≥ 4/5 |
| Gợi ý trung bình ở ch1-02 (đo `hintsUsed`) | ≤ 1 (hiện tại dự đoán 2–3) |
| Tự nói được "WHERE dùng để làm gì" sau ch1-02 (hỏi miệng, hoặc câu `reflect` đúng lần đầu) | ≥ 4/5 |
| Xong cả chương 1 trong buổi đầu | ≥ 3/5 |
| Tỉ lệ bỏ qua tour ở người tự nhận "mới bắt đầu" | ≤ 1/5 |

---

## C. Bài học nhanh (micro-lesson) trước mỗi kỹ năng mới

### C.1 Nguyên tắc

- **Khái niệm trước nhiệm vụ** (SQLBolt: mỗi bài nêu một khái niệm rồi mới có bài tập; §H). Một thẻ, đọc ≤ 60 giây, ≤ 120 chữ phần giải thích.
- **Ví dụ trên dữ liệu thật, khác bài.** Ví dụ dùng bảng đã mở ở chương đó nhưng **khác cột/giá trị** với Solution của ticket, để là ví dụ ghép cặp (worked example → problem) chứ không phải đáp án.
- **Thử ngay có tự kiểm, không XP.** Người chơi sửa ví dụ theo một yêu cầu nhỏ; app chạy và so với lời giải của bài thử bằng grader có sẵn (`grader.ts`). Đây là bước "completion problem" (Paas; §H) giữa ví dụ và ticket.
- **Dạy cách nhận ra.** Mỗi bài có mục **"Dấu hiệu trong đề"**: các cụm từ nghiệp vụ báo hiệu kỹ năng này. Đây là phần trả lời trực tiếp phản hồi (2): người mới không thiếu cú pháp bằng thiếu *cầu nối* từ "chỉ lấy cảng biển" sang `WHERE`.

### C.2 Bố cục thẻ "Bài học nhanh"

```
┌ Bài học nhanh · Lọc dòng (WHERE) ············ [Đã hiểu ✓] [Thu gọn] ┐
│ Khái niệm   1–3 câu                                                 │
│ Cú pháp     SELECT … FROM … WHERE <điều kiện>                       │
│ Ví dụ       ```sql …```   [▶ Chạy ví dụ]  → bảng kết quả nhỏ (≤ 8 dòng) │
│ Lỗi hay gặp  câu sai + điều xảy ra (lỗi Postgres thật / 0 dòng)      │
│ Dấu hiệu trong đề  "chỉ…", "bỏ…", "thuộc…", "từ ngày… đến…"           │
│ Thử ngay    yêu cầu nhỏ · ô SQL · [Chạy & kiểm]  → ✓ / gợi ý ngắn     │
│ Đọc thêm    Sổ tay · PostgreSQL docs                                │
└─────────────────────────────────────────────────────────────────────┘
```

### C.3 Hiện ở đâu, khi nào

| Chỗ | Hành vi |
|---|---|
| **Brief**, ticket đầu tiên có kỹ năng trong `grants` | Thẻ nằm **giữa tin nhắn và Việc cần làm**, mở sẵn lần đầu. Bấm "Đã hiểu" hoặc Thử ngay đạt → thu gọn thành một dòng "Bài học nhanh: Lọc dòng (WHERE) ✓ · Mở lại". Ticket mở hai kỹ năng (ch1-03, ch3-03): hai thẻ xếp chồng, thẻ hai thu gọn tới khi thẻ một xong. |
| **Chip kỹ năng** (`skillChips`, mọi ticket) | Chip thành **nút**; bấm mở thẻ trong dialog. Đổi nhãn tiền tố: "Dạy:" → **"Kỹ năng mới:"**, "Cần:" → **"Cần dùng:"**. |
| **Lộ trình** (§D) | Nút bài học trước nút ticket; mở được cả khi ticket chưa mở (đọc trước). |
| **Sổ tay** | Kỹ năng chưa học vẫn hiện **bài học nhanh** (không hiện thẻ `syntax/when/trap` cũ tới khi học); bỏ khóa đọc. |
| **Recap** | Giữ thẻ kỹ năng như cũ. |

Thanh chip trên ch1-02 sẽ là: **Kỹ năng mới:** `[⏷ Lọc dòng (WHERE)]` · **Cần dùng:** `[Chọn cột (SELECT)]`.

### C.4 Đề gợi khái niệm mà không lộ đáp án

1. **Prose vẫn theo L24 / `problem-design.md` §1.2** (không từ khóa SQL, không tên cột). Cầu nối nằm ở ba chỗ *ngoài* prose: chip, bài học nhanh, gợi ý bậc 1.
2. **Cụm từ tín hiệu nhất quán**: mỗi kỹ năng có 3–6 cụm "dấu hiệu" (`cues` trong `skills.yml`). Tác giả đề dùng *ít nhất một* cụm đó ở ticket mở kỹ năng (test kiểm). Cụm tín hiệu là lời nghiệp vụ, không phải SQL:

| Kỹ năng | Dấu hiệu trong đề (VI) | EN |
|---|---|---|
| select | "gửi mình A, B, C", "với mỗi … cần …", "theo thứ tự: …" | "send me A, B, C", "for each … I need …" |
| where | "chỉ …", "bỏ …", "không tính …", "thuộc …", "từ ngày … đến …", "trước / sau ngày …" | "only …", "leave out …", "not counting …", "in the … region", "from … to …" |
| order_by | "… lên đầu", "xếp theo …", "bằng nhau thì …" | "… first", "sorted by …", "on a tie …" |
| limit | "N … nặng nhất / mới nhất / đầu tiên" | "the N heaviest / latest / first" |
| aggregate | "bao nhiêu", "tổng", "trung bình", "một con số" | "how many", "total", "average", "one number" |
| group_by | "mỗi / từng hãng / tháng / khách", "mỗi … một dòng" | "per carrier / month", "one row per …" |
| having | "những … có hơn N …" (điều kiện trên con số sau khi đếm) | "the … with more than N …" |
| join | thông tin của hai danh mục: "mã lô … và tên khách" | info from two lists |
| left_join / anti_join | "kể cả … chưa từng …", "không có … nào" | "including … that never …", "with no …" |

3. **Gợi ý 3 bậc đổi thứ tự** (sửa `problem-design.md` §1.5):

| Bậc | Cũ | Mới |
|---|---|---|
| 1 | Nghiệp vụ → dữ liệu (không tên khái niệm) | **Khái niệm**: "Đây là bài *lọc dòng*: …" + danh mục nào + điều kiện nằm ở đâu. Được gọi tên **một** từ khóa SQL (§1.5 đã cho phép). Có link "Mở lại Bài học nhanh". |
| 2 | Bảng, cột, giá trị | **Cú pháp**: bảng, cột, giá trị mã hóa, mệnh đề (giữ như cũ) |
| 3 | Khung SQL có `...` | **Gần đáp án**: khung SQL có `...` (giữ như cũ) |

Bài học nhanh và chip **luôn miễn phí**. Giá gợi ý giữ 25%/bậc, trừ ch1 (quyết định **D-C3**).

4. **Xem giá trị trước (sửa lỗi A.2-4).** Tab Cột và trang Dữ liệu: với cột chữ có ≤ 20 giá trị khác nhau, hiện các giá trị đó dưới tên cột (`kind: AIRPORT · SEAPORT`; `region: Asia · Europe · North America · Oceania · South Asia · Vietnam`). Truy vấn `SELECT DISTINCT` do app chạy lúc mở tab, cache theo phiên. Không lộ đáp án (mọi giá trị đều hiện, không tô giá trị nào), và dạy thói quen analyst: xem dữ liệu trước. Effort **S**. Bài học `where` có một dòng: "Không chắc giá trị viết thế nào? Xem tab Cột."

### C.5 Mô hình dữ liệu (thêm vào `skills.yml`, không file mới)

```yaml
- id: where
  # … label/syntax/when/trap giữ nguyên …
  cues: { vi: ["chỉ …", "bỏ …", …], en: ["only …", "leave out …", …] }
  lesson:
    concept: { vi: "…", en: "…" }
    example: "SELECT code, name, kind FROM ports WHERE country = 'Vietnam'"
    explain: { vi: "…", en: "…" }        # chú thích ①②… như ## Example
    mistake: { sql: "…", vi: "…", en: "…" }
    try:
      task: { vi: "…", en: "…" }
      starter: "…"
      solution: "…"
    docs: https://www.postgresql.org/docs/current/queries-table-expressions.html#QUERIES-WHERE
```

Test nội dung mới (cùng file `tests/content.test.ts`):

- mọi kỹ năng có `lesson` (pha 1: kỹ năng ch1–3; pha 4: cả 38);
- `example`, `try.solution`, `mistake.sql` (nếu không phải lỗi cú pháp) chạy được trên PGlite, chỉ dùng bảng đã mở ở chương của kỹ năng;
- `example` và `try.solution` **khác kết quả** Solution của ticket mở kỹ năng (chống lộ đáp án);
- `try.solution` trả ≥ 1 dòng; EN không dấu; code span VI = EN;
- ticket mở kỹ năng có ≥ 1 cụm `cues` trong thân đề / Task.

Kích thước: ~1,2 KB/kỹ năng → 38 kỹ năng ≈ 45 KB thô, ~12 KB gzip. Đặt `lesson` vào chunk lazy cùng ticket (R1, L43) để không đụng ngân sách main.

### C.6 Người đã biết SQL

Chọn "Đã biết SQL" ở màn chào → thẻ bài học hiện **thu gọn** (một dòng) thay vì mở sẵn; chip vẫn bấm được. Không có bài kiểm tra xếp lớp (placement) ở bản này.

### C.7 Hai bài học viết đầy đủ (VI + EN)

Số liệu lấy thẳng từ `src/db/seed.sql` (khối `INSERT INTO ports` / `carriers`, dữ liệu cố định, không ngẫu nhiên). Mọi câu SQL dưới đây (ví dụ, câu sai, lời giải Thử ngay, câu `wrong` của ch1-02) đã chạy thử trên PGlite 0.5.16 với `schema.sql` + hai khối đó: số dòng và thông báo lỗi ghi ở đây là kết quả thật.

#### C.7.1 `select`: Chọn cột (SELECT)

```yaml
label: { vi: "Chọn cột (SELECT)", en: "Select columns (SELECT)" }
cues:
  vi: ["gửi mình A, B, C", "với mỗi … mình cần …", "theo thứ tự: …", "danh sách mọi …"]
  en: ["send me A, B, C", "for each … I need …", "in this order: …", "a list of every …"]
lesson:
  concept:
    vi: "Dữ liệu nằm trong các bảng (table). Mỗi dòng (row) là một thứ, ví dụ một hãng tàu; mỗi cột (column) là một thông tin của nó, ví dụ tên. SELECT chọn những cột bạn cần, FROM nói lấy từ bảng nào. Kết quả có đúng các cột bạn liệt kê, theo đúng thứ tự đó."
    en: "Data lives in tables. Each row is one thing, for example one carrier; each column is one piece of information about it, for example its name. SELECT picks the columns you need, FROM says which table to read. The result has exactly the columns you list, in that order."
  example: "SELECT name, mode FROM carriers"
  explain:
    vi: "① `SELECT name, mode`: hai cột, cách nhau bằng dấu phẩy. ② `FROM carriers`: bảng hãng vận chuyển. Kết quả: 9 dòng, mỗi hãng một dòng, cột tên rồi tới cột phương thức (`SEA` hoặc `AIR`). `*` nghĩa là mọi cột: tiện để xem bảng, nhưng khi nộp thì thừa cột."
    en: "① `SELECT name, mode`: two columns, separated by a comma. ② `FROM carriers`: the carrier table. Result: 9 rows, one per carrier, the name column then the mode column (`SEA` or `AIR`). `*` means every column: handy for a look at a table, but it adds extra columns when you submit."
  mistake:
    sql: "SELECT name mode FROM carriers"
    vi: "Quên dấu phẩy: Postgres không báo lỗi mà hiểu `mode` là tên mới đặt cho cột `name`. Bạn nhận 1 cột thay vì 2. Thẻ \"Kết quả mong đợi\" sẽ báo lệch số cột."
    en: "A missing comma: Postgres does not complain, it reads `mode` as a new name for the `name` column. You get 1 column instead of 2. The \"Expected result\" card shows the column count is off."
  try:
    task:
      vi: "Hãng nào có mã gì? Lấy mã hãng rồi tới tên hãng, cho mọi hãng."
      en: "Which carrier has which code? Get the carrier code, then the carrier name, for every carrier."
    starter: "SELECT name, mode FROM carriers"
    solution: "SELECT code, name FROM carriers"
  docs: https://www.postgresql.org/docs/current/queries-select-lists.html
```

Kết quả ví dụ (9 dòng): Oceanic Star Line · SEA; Pacific Bridge Shipping · SEA; Blue Anchor Lines · SEA; Golden Lotus Container · SEA; Northwind Maritime · SEA; Meridian Express Line · SEA; SkyBridge Cargo · AIR; Lotus Air Freight · AIR; Eastwing Cargo · AIR. Khác ch1-01 (bảng `ports`, 3 cột), nên không lộ đáp án.

#### C.7.2 `where`: Lọc dòng (WHERE)

```yaml
label: { vi: "Lọc dòng (WHERE)", en: "Filter rows (WHERE)" }
cues:
  vi: ["chỉ …", "bỏ …", "không tính …", "thuộc khu vực / phòng …", "từ ngày … đến …", "trước / sau ngày …"]
  en: ["only …", "leave out …", "not counting …", "in the … region / team", "from … to …", "before / after …"]
lesson:
  concept:
    vi: "SELECT chọn cột; WHERE chọn dòng. Mỗi dòng được kiểm điều kiện sau WHERE: đúng thì giữ, sai thì bỏ. Cần nhiều điều kiện cùng đúng thì nối bằng AND; chỉ cần một trong hai thì dùng OR."
    en: "SELECT picks columns; WHERE picks rows. Every row is checked against the condition after WHERE: true keeps it, false drops it. When several conditions must all hold, join them with AND; when either one is enough, use OR."
  example: "SELECT code, name, kind FROM ports WHERE country = 'Vietnam'"
  explain:
    vi: "① `WHERE country = 'Vietnam'`: chỉ giữ cảng có quốc gia là Việt Nam. ② Chữ đặt trong nháy đơn và phải viết đúng như trong dữ liệu (`'Vietnam'`, không phải `'vietnam'`). Kết quả: 5 dòng, 3 cảng biển và 2 sân bay. ③ So sánh khác: `<>` (khác), `>`, `>=`, `<`, `<=`; ngày cũng viết trong nháy đơn: `booking_date >= '2026-10-01'`. Không chắc giá trị viết thế nào? Xem tab Cột."
    en: "① `WHERE country = 'Vietnam'`: keep only the ports whose country is Vietnam. ② Text goes in single quotes and must match the data exactly (`'Vietnam'`, not `'vietnam'`). Result: 5 rows, 3 seaports and 2 airports. ③ Other comparisons: `<>` (not equal), `>`, `>=`, `<`, `<=`; dates also go in single quotes: `booking_date >= '2026-10-01'`. Not sure how a value is spelled? Check the Columns tab."
  mistake:
    sql: "SELECT code, name, kind FROM ports WHERE country = \"Vietnam\""
    vi: "Nháy kép là tên cột, không phải chữ. Postgres báo lỗi column \"Vietnam\" does not exist. Viết `'Vietnam'` với nháy đơn."
    en: "Double quotes mean a column name, not text. Postgres says column \"Vietnam\" does not exist. Write `'Vietnam'` with single quotes."
  try:
    task:
      vi: "Sửa ví dụ để chỉ giữ các sân bay ở Việt Nam: hai điều kiện phải cùng đúng."
      en: "Change the example to keep only the airports in Vietnam: both conditions must hold."
    starter: "SELECT code, name, kind FROM ports WHERE country = 'Vietnam'"
    solution: "SELECT code, name, kind FROM ports WHERE country = 'Vietnam' AND kind = 'AIRPORT'"
  docs: https://www.postgresql.org/docs/current/queries-table-expressions.html#QUERIES-WHERE
```

Kết quả ví dụ (5 dòng): VNSGN Ho Chi Minh (Cat Lai) SEAPORT · VNHPH Hai Phong SEAPORT · VNDAD Da Nang SEAPORT · SGN Tan Son Nhat Airport AIRPORT · HAN Noi Bai Airport AIRPORT. Thử ngay: 2 dòng (SGN, HAN). Ví dụ và bài thử dùng `country`, còn ch1-02 dùng `region` = Europe và cảng biển, nên khác kết quả. Bài thử dạy đúng mẫu `AND` mà ch1-02 cần (ví dụ ghép cặp), nhưng người chơi vẫn phải tự tìm cột và giá trị khu vực.

Ghi chú: phần ③ phủ luôn so sánh và ngày, là khái niệm ch1-03 cần mà `skills.yml` không có kỹ năng riêng (§A.1).

---

## D. Lộ trình học (learning path) kiểu roadmap.sh

### D.1 Lấy gì từ roadmap.sh (đã mở trang thật, §H)

Trên https://roadmap.sh/data-engineer:

- Một **trục dọc** các nút chủ đề chính (màu vàng), nút con (màu be) nối bằng **đường chấm** sang hai bên, có tiêu đề nhóm ("Learn the Basics", "Data Generation"…).
- Hộp **"Pre-requisites"** ở đầu, trỏ sang roadmap khác (Python for Data Analysis, SQL Roadmap), và hộp "Related Roadmaps".
- Chú thích ngắn cạnh nhánh lựa chọn ("Python is recommended").
- Bấm nút → **ngăn bên phải** gồm mô tả ngắn, tab Resources / AI Tutor, nút trạng thái **"Learning"** và **"Done"**, tài nguyên chia **Recommended**, **Premium**, **Free** (mỗi mục gắn nhãn loại: Roadmap, Course, Article, Video).
- Tiến độ lưu theo tài khoản ("Join … others tracking their progress").

Lấy: trục dọc + nút con chấm, hộp tiên quyết, ngăn chi tiết có trạng thái và tài nguyên, phân biệt bắt buộc / tùy chọn. **Không** lấy: tài khoản, AI tutor, tự đánh dấu "Done" bằng tay (ở đây trạng thái do app chấm, đáng tin hơn).

### D.2 Lộ trình một chương

Thứ tự nút suy ra từ thứ tự ticket trong chương:

```
[Cần trước: kỹ năng chương trước]          (hộp tiên quyết, như roadmap.sh)
        │
  (Ôn đầu chương)┄┄┄┄  tùy chọn, chỉ khi N ≥ 2 (warmupQueue có sẵn)
        │
  ● Bài học: Chọn cột ─── ● Việc 1: Danh mục cảng ┄┄ (Luyện thêm: Chọn cột)
        │
  ● Bài học: Lọc dòng ─── ● Việc 2: Cảng châu Âu   ┄┄ (Luyện thêm)
        │
  ● Bài học: Sắp xếp ┐
  ● Bài học: Top N   ┴── ● Việc 3: Hàng nặng        ┄┄ (Luyện thêm)
        │
  ● Việc 4: Ôn xen kẽ  (Xếp ca khai báo)
        │
  ◆ Đánh giá cuối thử việc (3 bước) → Junior DA
        ┄┄ (Bài tuyến Rotterdam R-1, mở sau ◆)   tùy chọn
```

| Loại nút | Nguồn dữ liệu | Bắt buộc? | Hình |
|---|---|---|---|
| Hộp tiên quyết | `requires` của các ticket trong chương mà không thuộc `grants` của chương | — | Hộp viền, mỗi kỹ năng một chip bấm được (mở bài học để ôn) |
| Bài học | `grants` của ticket + `skills.yml` `lesson` | Khuyến nghị (không chặn ticket) | Tròn nhỏ, icon kỹ năng |
| Việc | ticket (`beat` ≠ boss) | Bắt buộc | Chữ nhật màu chương |
| Cột mốc | ticket `beat: boss` | Bắt buộc | Hình thoi + bậc nghề (L19/L22, không chữ "boss") |
| Luyện thêm | `pickForSkill` (Practice có sẵn) | Tùy chọn | Nét đứt |
| Ôn đầu chương | `warmupQueue` có sẵn | Tùy chọn | Nét đứt |
| Bài tuyến | `content/lanes` (L48/L49) | Tùy chọn | Nét đứt, icon tàu |

### D.3 Trạng thái

| Trạng thái | Việc / cột mốc | Bài học | Kỹ năng (vòng quanh nút bài học) |
|---|---|---|---|
| Khóa | sau `nextTicket()` | không khóa (đọc trước được) | — |
| Mở | = `nextTicket()`, chưa có nháp | chưa xem | — |
| Đang làm | có `drafts[stepKey]` hoặc `bossStep` | đã xem, chưa Thử ngay | — |
| Xong | trong `completed` | Thử ngay đạt | hộp Leitner 1–3: vạch mức nhớ (dùng lại `home.level`) |
| **Thành thạo** | — | — | `review[skill].box ≥ 4` (≥ 8 ngày không quên), viền vàng + ngôi sao |

Không màu đơn độc: mỗi trạng thái có icon + chữ (khóa, ▶, …, ✓, ★), theo L23.

### D.4 Ngăn chi tiết khi bấm nút

| Phần | Nội dung |
|---|---|
| Tiêu đề + trạng thái | Tên kỹ năng/việc, chip trạng thái |
| Mô tả | `when` của kỹ năng; với việc: người gửi + một dòng tóm tắt (tiêu đề ticket). Việc khóa: chỉ "Mở sau việc n" (L21) |
| Hành động chính | "Học bài nhanh" / "Làm việc này" / "Luyện thêm" (0 XP) |
| Mức nhớ | 5 vạch Leitner + ngày ôn tới (`review[skill].due`) |
| Tài nguyên | **Trong game:** Sổ tay (thẻ kỹ năng), thuật ngữ liên quan (`glossary.yml` theo cột). **Đọc thêm (miễn phí):** PostgreSQL docs của mệnh đề; bài SQLBolt tương ứng (vd Lesson 2 cho WHERE). Nhãn loại như roadmap.sh: Docs / Bài tương tác |

### D.5 Toàn cảnh 12 chương

Trục dọc 12 nút chương (màu chương L17/L32), mỗi nút: số + tên, vòng tiến độ `done/total`, số kỹ năng `learned/total`, số kỹ năng thành thạo, bậc nghề sau cột mốc (★ cho chương đổi chức danh). Nhánh chấm bên cạnh: các tuyến mở sau chương đó. Hộp tiên quyết ở đầu: "Không cần biết trước gì. Dùng Excel là đủ."

### D.6 Lối vào

| Chỗ | Hành vi |
|---|---|
| **Trang chủ** | Lưới 12 card chương hiện có **thành** Toàn cảnh (§D.5). Bấm một chương → `#/path/<n>`. Card "Tiếp tục" có link "Xem lộ trình chương". |
| **Thanh điều hướng việc** (ui-ux-v4 §2) | Nút "Lộ trình" cạnh ô chọn chương → dialog lộ trình chương đang xem (không rời bài, như dialog bản đồ). |
| **Recap** | Bước 8 tour và nút phụ "Xem lộ trình" cạnh "Việc tiếp theo". |
| Nav | **Không thêm mục thứ 7** (giữ L49). Lộ trình nằm trong Trang chủ (quyết định **D-P1**). |

### D.7 Map với dữ liệu có sẵn (gần như không cần nội dung mới)

| Cần | Đã có |
|---|---|
| Thứ tự nút | thứ tự ticket trong chương (`app.tickets`, `chapterDots`) |
| Bài học / tiên quyết | `grants` / `requires`, `skills.yml` |
| Tên chương, mục tiêu, bậc nghề | `chapters.yml` (`title`, `outcomes`, `career`, `tier`) |
| Khóa / xong | `nextTicket()`, `done()` |
| Đang làm | `save.drafts`, `save.bossStep` |
| Mức nhớ / thành thạo | `save.review[skill].box` (`MAX_BOX` = 5) |
| Luyện thêm / ôn đầu chương | `pickForSkill`, `warmupQueue` (`practice.ts`) |
| Bài tuyến | `content/lanes/` |
| Mới | `lesson` trong `skills.yml` (§C.5), pref `cargo-query/lessons` cho "đã xem / đã thử" |

Hàm thuần mới `pathOf(chapter, tickets, save, lessonsPref) → Node[]` trong `src/path.ts` (không DOM), test bằng Vitest như `progress.ts`.

---

## E. Thay đổi nội dung

### E.1 Luật cho mọi chương (thay luật "teach = worked")

1. **Mỗi kỹ năng có `lesson`** (bài học nhanh) và **≥ 3 `cues`**. Ticket đầu tiên grant kỹ năng dùng ≥ 1 cue trong thân đề / Task.
2. Ticket thường (không phải cột mốc) có `reflect` ở **mọi chương**, không chỉ từ ch4.
3. Mỗi chương có đúng 1 ticket `faded`, là ticket `develop` đầu tiên (giữ luật ch4+, mở rộng về ch1–3).
4. Ticket `teach` của ch1–3 **không cần `## Example`**: bài học nhanh của kỹ năng đã là ví dụ ghép cặp. Ch4–12 giữ `## Example` như hiện tại. (Quyết định **D-C4**.)
5. Gợi ý bậc 1 gọi tên khái niệm (§C.4).
6. Nhãn kỹ năng có từ khóa trong ngoặc khi kỹ năng là một mệnh đề: `select` "Chọn cột (SELECT)", `where` "Lọc dòng (WHERE)", `order_by` "Sắp xếp (ORDER BY)", `limit` "Lấy top N (LIMIT)" (theo mẫu `glossary-vi.md` mục A đã áp cho GROUP BY/HAVING/JOIN).

### E.2 Việc cụ thể cho ch1–3

| Ticket | `format` | Prose (cue) | `reflect` | `wrong` | Ghi chú |
|---|---|---|---|---|---|
| ch1-01 | (worked qua bài học) | đã có "Với mỗi cảng mình cần ba thông tin, theo thứ tự" ✓ | + | + (`SELECT *`: thừa cột) | bỏ "Không cần sắp xếp" ở VI → "Thứ tự dòng không quan trọng" (đỡ nhắc khái niệm chưa học) |
| **ch1-02** | **faded** | viết lại (§E.4) | + | + | |
| ch1-03 | open | thêm "lên đầu", "bằng nhau thì" (đã có) ✓ | + | + (thiếu tiêu chí phụ / lọc bỏ lô hủy) | 2 bài học xếp chồng; cân nhắc tách (D-C5) |
| ch1-04 | open | "chỉ người thuộc phòng Hải quan" | + | — | giá trị `'Customs'` thấy được nhờ tab Cột (§C.4-4) |
| ch1-05 | — | — | (cột mốc dùng `conclusion`) | — | — |
| ch2-01 | (worked qua bài học) | "ba con số", "trung bình" ✓ | + | + (quên bỏ lô hủy) | |
| **ch2-02** | **faded** | "mỗi tổ hợp … một dòng" ✓ | + | + | starter `… GROUP BY ___` |
| ch2-03 | open | "những khách có hơn {{min}} lô" ✓ | + | + (`WHERE count…` → lỗi 42803, đã có trong `sqlErrors`) | |
| ch2-04 | open | — | + | — | |
| ch3-01 | (worked qua bài học) | thêm "tên khách nằm ở hồ sơ khách hàng" | + | + (thiếu `ON` → nhân dòng) | bài học `join` phải dạy **alias** (`s`, `c`), hiện chưa được giới thiệu ở đâu |
| **ch3-02** | **faded** | ✓ | + | + | |
| ch3-03 | open | "kể cả khách chưa từng booking" ✓ | + | + (điều kiện ngày đặt ở WHERE) | 2 bài học xếp chồng |
| ch3-04 | open | — | + | — | |
| ch2-05, ch3-05 | — | — | — | — | — |

### E.3 Số lượng nội dung mới

| Hạng mục | ch1–3 (MVP) | ch4–12 (sau) |
|---|---|---|
| Bài học nhanh (`lesson` + `cues`) | **11** | **27** (tổng 38) |
| `reflect` | 12 | 0 (đã có) |
| Starter `faded` | 3 | 0 |
| `wrong` | ~9 | — |
| Sửa prose (cue) | ~4 ticket, mỗi chỗ 1 câu | ~11 ticket mở kỹ năng ở `develop`/`twist` (kiểm cue) |
| Viết lại gợi ý bậc 1 | 12 | 54 (dần, không chặn) |
| Nhãn kỹ năng | 4 | — |

Ước lượng viết: 1 bài học ~30–40 phút (gồm chạy thử trên PGlite) → ch1–3 ≈ 1 ngày; ch4–12 ≈ 2–3 ngày.

### E.4 ch1-02 viết lại (VI + EN)

Frontmatter thêm (Solution, `columns`, `tables`, `requires`/`grants` giữ nguyên):

```yaml
format: faded
starter: |
  SELECT code, name, country
  FROM ports
  WHERE ___ AND ___
reflect:
  q: { vi: "Vì sao hai điều kiện nối bằng AND mà không phải OR?", en: "Why are the two conditions joined with AND and not OR?" }
  options:
    - { vi: "Cảng phải vừa ở châu Âu vừa là cảng biển; OR sẽ lấy cả sân bay châu Âu lẫn cảng biển ở mọi nơi", en: "A port must be in Europe and be a seaport; OR would also take European airports and seaports everywhere" }
    - { vi: "AND chạy nhanh hơn OR", en: "AND runs faster than OR" }
    - { vi: "Hai cách cho cùng kết quả", en: "Both give the same result" }
  answer: 0
  why: { vi: "AND giữ dòng khi mọi điều kiện đều đúng; OR giữ dòng khi chỉ cần một điều kiện đúng.", en: "AND keeps a row when every condition holds; OR keeps it when any one holds." }
wrong:
  - sql: "SELECT code, name, country FROM ports WHERE region = 'Europe'"
    vi: "Danh sách đang có cả sân bay Frankfurt. Đề chỉ cần cảng biển."
    en: "Your list also has Frankfurt Airport. The request is for seaports only."
```

Thân đề VI (cue in đậm ở đây chỉ để review; file thật không in đậm):

> Tuần sau Ops họp với các đại lý về tuyến châu Âu. Mình muốn in sẵn danh sách cảng biển châu Âu mình đang khai thác, để chốt cảng nào đã có đại lý nhận hàng.
>
> **## Task**
> Trong danh mục cảng, mình **chỉ cần** những cảng thỏa **cả hai điều kiện**: thuộc khu vực châu Âu, và là cảng biển (**bỏ** sân bay, vì hàng air đi qua một mạng đại lý khác). Với mỗi cảng: mã cảng, tên cảng, quốc gia. Thứ tự dòng không quan trọng.
>
> **## Hints**
> 1. Đây là bài **lọc dòng**: từ danh mục cảng, chỉ giữ những dòng thỏa điều kiện. Có hai điều kiện phải đúng cùng lúc, và danh mục cảng đã ghi sẵn khu vực và loại của từng cảng. Xem lại Bài học nhanh "Lọc dòng (WHERE)" nếu cần.
> 2. Trong bảng `ports`, khu vực ở cột `region` (giá trị `'Europe'`), loại cảng ở cột `kind` (`'SEAPORT'` hoặc `'AIRPORT'`). Nối hai điều kiện bằng `AND`; giá trị chữ đặt trong nháy đơn.
> 3. `SELECT code, name, country FROM ports WHERE region = ... AND kind = ...`

EN:

> Next week Ops meets our agents about the European lanes. I want a printed list of the European seaports we work with, so we can confirm which ports already have a receiving agent.
>
> **## Task**
> From the port list I **only** need the ports that meet **both conditions**: in the Europe region, and a seaport (**leave out** airports, because air cargo goes through a different agent network). For each port: port code, port name, country. Any order of rows is fine.
>
> **## Hints**
> 1. This is a **row filter**: from the port list, keep only the rows that meet the conditions. Two conditions must hold at the same time, and the port list already records the region and the kind of each port. Open the "Filter rows (WHERE)" quick lesson again if you need it.
> 2. In the `ports` table the region is in the `region` column (value `'Europe'`) and the kind of port is in the `kind` column (`'SEAPORT'` or `'AIRPORT'`). Join the two conditions with `AND`; text values go in single quotes.
> 3. `SELECT code, name, country FROM ports WHERE region = ... AND kind = ...`

Kiểm theo `problem-design.md` §1.8: prose không backtick, không từ khóa SQL (hint 1 dùng "lọc dòng", không dùng `WHERE` trong code span, nên code span VI = EN vẫn giữ). Bản EN hint 1 nhắc tên bài học bằng EN, không có dấu.

---

## F. Kế hoạch theo pha, rủi ro, save

### F.1 Các pha

| Pha | Nội dung | Effort | Phụ thuộc |
|---|---|---|---|
| **P0 · Nội dung ch1–3** | `reflect` ×12, `faded` ×3, `wrong` ~9, cue prose, nhãn kỹ năng ×4, gợi ý bậc 1 ×12; mở rộng test ch4+ (`reflect`, `faded`) về mọi chương | **S–M** (1 ngày) | — |
| **P1 · Bài học nhanh (MVP)** | parser `lesson`/`cues`; thẻ trong brief (chạy ví dụ qua `app.run`, Thử ngay qua `grader`); chip bấm được + dialog; Sổ tay đọc trước; pref `cargo-query/lessons`; giá trị mẫu (DISTINCT ≤ 20) ở tab Cột + Dữ liệu; 11 bài ch1–3; test nội dung §C.5 | **M** (2–3 ngày) | P0 |
| **P2 · Onboarding** | màn chào trong lúc tải DB; tour 8 bước (mở rộng `coach.ts`); mở dần tab (`from:` cạnh `newAt`) và khóa nav; empty states; xem lại; thêm số liệu vào chuỗi chẩn đoán | **M** (2 ngày) | P1 (bước 4 tour) |
| — | **Buổi thử 5 người mới (§B.6)**, chỉnh theo kết quả | S | P0–P2 |
| **P3 · Lộ trình** | `src/path.ts` (thuần) + view chương `#/path/n` + ngăn chi tiết + Toàn cảnh thay lưới chương ở Trang chủ + nút ở thanh điều hướng việc + dialog | **M–L** (3 ngày) | P1 |
| **P4 · Bài học ch4–12** | 27 bài + kiểm cue ở 11 ticket `develop`/`twist`; gợi ý bậc 1 dần | **M** (2–3 ngày nội dung) | P1 |

MVP = **P0 + P1 + P2**. P3 sau buổi thử (có thể đổi theo phản hồi). P4 song song P3.

### F.2 Rủi ro

| Rủi ro | Giảm thiểu |
|---|---|
| Bài học lộ đáp án | Test "kết quả ví dụ ≠ kết quả Solution"; quy ước dùng bảng/cột khác (§C.1) |
| Quá nhiều chữ trước khi được làm (người mới bỏ đi) | ≤ 120 chữ; Thử ngay ngay trong thẻ; thu gọn sau khi xem; người biết SQL thấy thẻ thu gọn |
| Expertise reversal (ví dụ làm chậm người giỏi) | Lựa chọn "Đã biết SQL" ở màn chào; bài học không bao giờ chặn ticket |
| Xung đột L24 (không SQL trong prose) với L53 | Cầu nối nằm ngoài prose (chip, bài học, gợi ý 1); prose chỉ thêm cue nghiệp vụ |
| Tour vỡ khi DB chưa sẵn sàng (lạnh 13 s) | Lớp 1 phủ thời gian tải; bước 2 chỉ mở khi DB sẵn sàng |
| Ngân sách bundle (main ~254/270 KB, L43) | `lesson` vào chunk ticket lazy; view lộ trình lazy như Dashboard |
| Truy vấn DISTINCT cho tab Cột trên bảng lớn (`container_events` ~109k) | Chỉ cột text; `LIMIT 21` sau DISTINCT; chạy khi mở tab, nối đuôi hàng đợi `DbClient`; >20 giá trị thì không hiện |
| Tour/mở dần làm người chơi cũ khó chịu | Người có `completed` khác rỗng: không tour, mọi tab mở như hiện tại |
| Sửa `skills.yml` label làm lệch i18n test / Recap | Đổi trong cùng commit với test; `SAME_OK` không bị ảnh hưởng (VI ≠ EN) |

### F.3 Save

**Không tăng `SAVE_VERSION`.**

- Trạng thái lộ trình suy ra từ `completed`, `drafts`, `bossStep`, `review` có sẵn.
- "Đã xem / đã thử bài học" và bước tour là **pref thiết bị** (`cargo-query/lessons` = `{ seen: string[], tried: string[] }`, `cargo-query/tour` = `{ step }`), đọc qua `readJson` + validate như `coachDone`/`parseLayout`. Không đi theo Xuất/Nhập tiến độ; mất thì chỉ thấy lại thẻ mở sẵn, không mất tiến độ thật.
- Phương án thay thế: thêm `lessons` tùy chọn vào Save như `graded` (L20: thiếu thì `{}`, không bump). Quyết định **D-F1**.

---

## G. Quyết định cho user

**Onboarding**

- **D-O1.** Duyệt onboarding 3 lớp: màn chào trong lúc tải DB, tour 8 bước trên ch1-01 thật, mở dần tab/nav? (đề xuất: có)
- **D-O2.** "Xem lại hướng dẫn": chạy lại tour trên Sandbox với bài mẫu không chấm (M), hay chỉ phát lại màn chào + danh sách 8 bước tĩnh (S)? (đề xuất: bản tĩnh ở MVP)
- **D-O3.** Nav ngày 1: giữ đủ 6 mục, mục chưa dùng được thì **khóa + tooltip** (đề xuất), hay **ẩn** tới khi mở?
- **D-O4.** Tab dưới ngày 1 chỉ có Kết quả + Cột, các tab khác hiện theo mốc ở §B.2? Người chơi cũ (đã có `completed`) thấy đủ tab như hiện tại. (đề xuất: có)

**Bài học nhanh và đề**

- **D-C1.** Duyệt "Bài học nhanh" cho **mọi kỹ năng** (38), hiện trước ticket đầu tiên mở kỹ năng, gồm Thử ngay có tự kiểm (0 XP)? MVP chỉ 11 bài ch1–3. (đề xuất: có)
- **D-C2.** Chip kỹ năng: đổi "Dạy:/Cần:" thành **"Kỹ năng mới:/Cần dùng:"**, chip bấm được mở bài học, và nhãn có từ khóa "Lọc dòng (WHERE)"? Áp cho cả ticket ôn xen kẽ và cột mốc (chip "Cần dùng" đã hiện ở đó). (đề xuất: có, kể cả cột mốc, vì chip chỉ gọi tên kỹ năng, không nói dùng thế nào)
- **D-C3.** Giá gợi ý: giữ 25%/bậc mọi nơi, hay **gợi ý bậc 1 miễn phí ở chương 1** (tuần thử việc)? Bài học nhanh luôn miễn phí. (đề xuất: bậc 1 miễn phí ở ch1)
- **D-C4.** Ticket `teach` ch1–3 không cần `## Example` vì bài học nhanh đã là ví dụ ghép cặp; ch4–12 giữ `## Example`. (đề xuất: có)
- **D-C5.** ch1-03 dồn 2 kỹ năng + so sánh ngày. Giữ một ticket và dựa vào 2 bài học xếp chồng (đề xuất), hay **tách** thành 2 ticket (thêm 1 ticket, ch1 thành 6, tổng 70)?
- **D-C6.** Gợi ý bậc 1 đổi thành "khái niệm" (gọi tên một từ khóa SQL), sửa `problem-design.md` §1.5? (đề xuất: có)
- **D-C7.** Hiện giá trị của cột chữ (≤ 20 giá trị khác nhau) ở tab Cột và trang Dữ liệu? (đề xuất: có; đây là sửa lỗi rẻ nhất cho ch1-02/ch1-04/ch1-05)

**Lộ trình**

- **D-P1.** Lộ trình nằm trong Trang chủ (Toàn cảnh thay lưới card chương; chương tại `#/path/n`), **không thêm mục nav thứ 7**? (đề xuất: có)
- **D-P2.** "Thành thạo" = hộp Leitner ≥ 4 (đã nhớ qua lần ôn cách 8 ngày)? Hay ≥ 5?
- **D-P3.** Ngăn chi tiết có link **đọc thêm bên ngoài** (PostgreSQL docs, SQLBolt)? Ứng dụng hiện không có link ra ngoài. (đề xuất: chỉ PostgreSQL docs)
- **D-P4.** Làm lộ trình (P3) **sau** buổi thử 5 người với MVP P0–P2? (đề xuất: có)

**Save và phạm vi**

- **D-F1.** Bài học đã xem/đã thử và bước tour lưu ở **pref thiết bị** (đề xuất, không bump), hay trong Save như `graded` (đi theo Xuất/Nhập, vẫn không bump)?
- **D-F2.** MVP = P0 + P1 + P2 (~5–7 ngày), rồi buổi thử, rồi P3 + P4?

---

## H. Nghiên cứu và nguồn

| Nguồn | Đã kiểm gì | Dùng ở |
|---|---|---|
| roadmap.sh Data Engineer: https://roadmap.sh/data-engineer | Mở bằng trình duyệt (trang render bằng JS; fetch thường chỉ ra khung trang): trục dọc nút vàng, nút con màu be nối chấm, tiêu đề nhóm, hộp "Pre-requisites" (Python for Data Analysis, SQL Roadmap), "Related Roadmaps", chú thích "Python is recommended"; bấm nút mở ngăn phải với mô tả, tab Resources/AI Tutor, nút **Learning** / **Done**, tài nguyên Recommended / Premium / Free gắn nhãn Roadmap/Course/Article/Video; tiến độ theo tài khoản. **Không** thấy bảng chú giải màu hay phím tắt trên trang này nên không mô tả. | §D |
| roadmap.sh SQL: https://roadmap.sh/sql | Chỉ lấy được tiêu đề (render bằng JS). | — |
| SQLBolt: https://sqlbolt.com/ | Thứ tự: SELECT queries 101 → **Queries with constraints (Pt. 1, 2)** → Filtering and sorting → Review → JOINs → OUTER JOINs → NULLs → expressions → aggregates (Pt. 1, 2) → order of execution → … Trang nói mỗi bài nêu một khái niệm rồi kết thúc bằng bài tập tương tác. WHERE là **bài riêng ngay sau SELECT**, đúng chỗ ch1-02 đang thiếu. | §C.1, §D.4 |
| Mode SQL Tutorial (nay ThoughtSpot): https://mode.com/sql-tutorial/ → https://www.thoughtspot.com/sql-tutorial/introduction-to-sql | 4 nhóm: Basic (15 bài), Intermediate (20), Analytics Training (8), Advanced (9); editor SQL ngay trong trang bài; nhắm người đã dùng Excel, chưa biết code. Không lấy được tên 15 bài Basic. | §A (người chơi mục tiêu) |
| SQLZoo: https://sqlzoo.net/wiki/SQL_Tutorial | Thứ tự: SELECT basics → SELECT name → SELECT from World/Nobel → SELECT within SELECT → SUM and COUNT → JOIN → … mỗi bài có trang quiz đi kèm. | §D (luyện thêm cạnh mỗi nút) |
| Select Star SQL: https://selectstarsql.com/ | "Sách tương tác", một bộ dữ liệu thật xuyên suốt, chương ~30 phút theo mạch truyện. Giống cách Cargo Query dùng một công ty xuyên suốt. | §C.7 (ví dụ trên dữ liệu thật của game) |
| Khan Academy Intro to SQL: https://www.khanacademy.org/computing/computer-programming/sql | **Không mở được** (trang chặn trình đọc tự động). Không trích. | — |
| Worked-example effect: https://en.wikipedia.org/wiki/Worked-example_effect | Sweller & Cooper (1985): người mới học từ ví dụ giải sẵn tốt hơn tự giải; Renkl, Atkinson & Große (2004): **làm mờ dần** các bước kích thích tự giải thích; Paas: bài "hoàn thiện nửa chừng" (completion) hiệu quả như ví dụ đầy đủ; Kalyuga và cộng sự: **expertise reversal**, ví dụ có thể làm chậm người đã giỏi. Trang tự ghi một số trích dẫn chưa kiểm, nên chỉ dùng ở mức nguyên tắc. | §C.1 (ví dụ → Thử ngay → ticket), §B.2 (lựa chọn "Đã biết SQL"), §E.1 (faded) |
| PostgreSQL docs: https://www.postgresql.org/docs/current/queries-select-lists.html, https://www.postgresql.org/docs/current/queries-table-expressions.html#QUERIES-WHERE | Link "Đọc thêm" của bài học. | §C.7 |
