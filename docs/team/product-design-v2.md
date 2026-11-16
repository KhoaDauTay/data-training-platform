# Cargo Query — Product Design v2: làm sản phẩm "có hồn"

Ngày: 2026-11-16 · Vai trò: Product Designer · Trạng thái: **đề xuất, chờ user duyệt**
Mockup: `.superpowers/brainstorm/11840-1794844744/content/home-v2.html`

Đầu vào: user xem UI hiện tại và mockup L17 (`home-tailwind.html`), nhận xét *"web vẫn còn đơn điệu"*.
Tài liệu này **không thay** `product-design.md` (luật sản phẩm) và `ui-ux.md` (bố cục). Nó thêm một lớp trải nghiệm nằm trên các plan đã có. Không sửa code, plan hay spec.

---

## 0. Chẩn đoán: vì sao vẫn đơn điệu

Mockup L17 đã đổi **màu**, nhưng **cấu trúc** vẫn là lưới card đều nhau, và mọi màn hình nói cùng một giọng:

1. **Không có người.** Spec nói "các phòng ban gửi ticket", nhưng UI chỉ hiện chuỗi `Lê Bình · Sales`. Sáu đồng nghiệp trong nội dung (Hoàng Khánh, Lê Bình, Trần An, Hoàng Ngọc, Nguyễn Quang, Võ Thu) chưa có mặt, chưa có tính cách.
2. **Không có nơi chốn.** Đây là công ty forwarder có cảng, tàu, container, nhưng Trang chủ là dashboard SaaS chung chung. Bản đồ tuyến (Plan 1b Task 7) chỉ nằm trong màn làm bài, và Trang chủ ra trước 1b.
3. **Không có nhịp.** Ticket nào cũng trông như nhau. Boss, đầu chương, cuối chương, thăng chức không có khoảnh khắc riêng. Các beat `teach → develop → twist → rest → boss` có trong nội dung nhưng người chơi không cảm nhận được.
4. **Kết quả của người chơi biến mất.** Bạn tính "tổng TEU 2025" xong, nó chỉ thành +100 XP. Con số không ở lại đâu cả.
5. **Thăng tiến chỉ là một con số.** XP tăng nhưng không có ý nghĩa: không có chức danh, không có mốc.

Các nâng cấp dưới đây nhắm đúng 5 điểm trên. Nguyên tắc: **mọi hiệu ứng phải trỏ về việc học** (kỹ năng, kết quả SQL, cốt truyện dữ liệu), không trang trí suông.

## 1. Ràng buộc vẫn giữ

- Ứng dụng tĩnh, chạy trong trình duyệt, không backend. Tailwind v4 (miễn phí) + TypeScript DOM/SVG thuần, không 3D, không UI kit trả phí. Thứ nặng thì lazy-load.
- VI/EN qua `src/i18n` (thiếu khóa EN là lỗi `tsc`). WCAG AA. Mọi chuyển động nằm sau `@media (prefers-reduced-motion: no-preference)`, nếu không thì hiện trạng thái cuối, tĩnh.
- Hình ảnh tự vẽ: SVG/CSS/emoji. Emoji luôn đi kèm nhãn chữ (`aria-label` hoặc chữ bên cạnh).
- **Ưu tiên trạng thái suy ra được**: mọi thứ tính từ `completed`, `hintsUsed`, `review` (Save v2 của Plan 1c Task 1) cộng nội dung. Chỉ #6 (chuỗi ngày) cần lưu thêm, và mục đó có ghi rõ.
- **Bảng xếp hạng (leaderboard) không làm được**: không có backend thì không có dữ liệu của người khác. Spec §10 đã để ngoài phạm vi. Thứ thay thế là #14 (thẻ thành tích chia sẻ được dưới dạng ảnh).
- Không đưa lại những gì L10/L11 đã cắt (phím đơn, stepper đồ họa, menu `⋯`, boss trong Luyện tập).

## 2. Bảng ưu tiên

★ = **top 5 đề xuất cho bản phát hành đầu**: thấy ngay trên Trang chủ và Hộp thư, chạy được với 15 ticket ch1–3, gần như không đụng save.

| # | Nâng cấp | Màn | Effort | Plan |
|---|---|---|---|---|
| ★1 | Đồng nghiệp có chân dung + hộp thư dạng chat | Hộp thư, màn làm bài | M | 1d (+ 1c Task 8 cho phản hồi) |
| ★2 | Cảnh "Cảng Cát Lái" trên Trang chủ: tàu chạy qua 7 chương | Trang chủ | M | 1d (1b Task 7 dùng lại tọa độ/biểu tượng) |
| ★3 | Thang nghề nghiệp Thực tập sinh → Lead DA | Topbar, Trang chủ, Tổng kết chương | S | 1d hiển thị, 1c Task 4 tính |
| ★4 | Cốt truyện chương + banner "Sự cố" cho boss + nghi thức hết chương | Màn làm bài, Tổng kết chương | M | 1c Task 8 (+ 1b Task 7 `celebrate()`) |
| ★5 | Bảng KPI công ty do chính bạn tính (mở dần theo ticket) | Trang chủ | M | 1d khung, 1c Task 4 dữ liệu |
| 6 | Chuỗi ngày ôn tập (streak) gắn với "Ôn hôm nay" | Topbar, card Ôn | S | 1c (cần chốt chỗ lưu) |
| 7 | Huy hiệu + trang Thành tích | Trang Thành tích | M | sau 1c |
| 8 | Bảng màu biểu đồ theo chương/phòng ban | Tab Biểu đồ | S | 1b Task 5 |
| 9 | Phản hồi sai "có giọng người" | Màn làm bài | S | 1c Task 8 / `feedback.ts` |
| 10 | Minh họa cho trạng thái rỗng | Nhiều màn | S | 1d |
| 11 | Micro-animation khi Chạy/Nộp/+XP | Màn làm bài | S | 1d |
| 12 | Thẻ kỹ năng dạng thẻ sưu tập (độ hiếm = hộp Leitner) | Sổ tay, skill map | M | 1c Task 8–9 |
| 13 | Âm thanh tùy chọn (mặc định tắt) | Toàn app | S | sau 1c |
| 14 | Thẻ nhân viên / chứng nhận xuất PNG (thay leaderboard) | Tổng kết chương, Thành tích | M | sau 1c |
| 15 | "Bản tin sáng" của Trần An trên Trang chủ | Trang chủ | S | 1d, nối 1c |

---

## 3. Chi tiết từng nâng cấp

### ★1. Đồng nghiệp có chân dung + hộp thư dạng chat — **M**

**Người chơi thấy:** hộp thư không còn là danh sách dòng chữ mà là **danh sách hội thoại**. Mỗi đồng nghiệp có chân dung SVG tự vẽ (mặt tròn, tóc, màu áo theo phòng ban, một phụ kiện: mũ bảo hộ cho Ops, kính cho Finance, tai nghe cho CS…), tên, chức danh và một câu tính cách. Mở ticket thì thấy **luồng chat**: đoạn mở đầu của ticket là bong bóng tin nhắn của người gửi. Phần `## Task` là một **thẻ yêu cầu** ghim trong luồng (vẫn là khối "Yêu cầu" theo `ui-ux.md` §1.3). Khi bạn Nộp đúng, luồng có thêm bong bóng của bạn ("Đã gửi kết quả · 7 dòng") và một câu cảm ơn ngắn của người gửi. Ticket cũ của cùng người nằm phía trên, thu gọn, nên thấy được "mối quan hệ" với từng người qua các chương.

| Người | Phòng | Màu (L17) | Tính cách (1 dòng, VI/EN) | Ticket ch1–3 |
|---|---|---|---|---|
| Hoàng Khánh | Ops | sky | Người hướng dẫn, kiên nhẫn, "từng bước một" | ch1-01, ch1-02, ch2-04 |
| Lê Bình | Sales | pink | Nói nhanh, mê top N và số tròn, hay "gấp lắm" | ch1-03, ch2-02, ch2-03, ch3-02, ch3-04 |
| Hoàng Ngọc | Customs | amber | Kỹ tính, trích mã HS, ghét dữ liệu thiếu | ch1-04 |
| Nguyễn Quang | Finance | emerald | Cẩn thận từng đồng, luôn hỏi "làm tròn mấy số?" | ch2-01 |
| Võ Thu | CS | violet | Ấm áp, nghĩ cho khách, hay hỏi "khách nào đang buồn?" | ch3-01, ch3-03 |
| Trần An | Management | indigo | Ít lời, chỉ gửi việc quan trọng: **mọi boss** | ch1-05, ch2-05, ch3-05 |

**Vì sao giúp học:** cùng một yêu cầu, có người đặt hàng thì người học ghi nhớ theo ngữ cảnh ("câu HAVING là câu của Lê Bình về khách chủ lực"), và nhận ra rằng một DA phục vụ nhiều phòng với nhu cầu khác nhau. Đó chính là kỹ năng nghề. Trần An chỉ xuất hiện ở boss, nên tên anh ấy tự thành tín hiệu "bài kiểm tra".

**Gắn vào plan:**
- Nội dung: thêm `content/people.yml` (6 dòng: `name`, `dept`, `role {vi,en}`, `bio {vi,en}`, `avatar` gồm vài tham số SVG như màu tóc, kiểu tóc, phụ kiện). Ticket **không đổi**, vì `from.name` đã là khóa. Thêm một luật vào `contentProblems`: mọi `from.name` phải có trong `people.yml`.
- `src/ui/avatar.ts` (~60 dòng): vẽ SVG từ tham số. Không có ảnh, không thư viện.
- Plan **1d**: viết lại `inbox.ts` (28 dòng) thành nhóm theo người, và đặt đầu brief thành bong bóng. Câu cảm ơn sau khi Nộp đúng lấy từ bảng ~6 câu mỗi phòng trong i18n, nên không phải viết thêm cho từng ticket.
- Không đụng save.

### ★2. Cảnh "Cảng Cát Lái" trên Trang chủ — **M**

**Người chơi thấy:** đầu Trang chủ là **một cảnh SVG minh họa** (thay cho card "Tiếp tục" phẳng): văn phòng Cargo Query Logistics và cần cẩu bên trái, mặt biển, và một **tuyến hải trình 7 trạm**, mỗi trạm là một chương với màu của chương đó (L17). Con tàu container nằm ở trạm của chương đang học. **Mỗi chương xong thì tàu chất thêm một container cùng màu chương.** Nhìn tàu là biết mình đã đi bao xa. Sóng và tàu lắc nhẹ (CSS, tắt khi reduced-motion). Card chào mừng nổi trên cảnh: "Tiếp tục ticket *Khách hàng chủ lực* của Lê Bình", kèm nút Tiếp tục.

**Vì sao giúp động lực:** tiến độ 7 chương thành một **hành trình** có hình dạng, thay vì 7 thanh % giống nhau. Container chất dần là phần thưởng thị giác dễ thấy và gắn với domain (TEU, container). Cảnh này cũng cho Trang chủ một bản sắc mà người dùng nhớ được.

**Gắn vào plan:**
- Plan **1d**: một SVG inline do `src/ui/harbor.ts` dựng (~120 dòng, `createElementNS`). Dữ liệu chỉ cần `currentChapter()` và các chương đã xong (`progress.ts`/`overview.ts` sẵn có). **Không dùng `d3-geo`**, vì 1d chạy trước 1b. Đây là cảnh minh họa, không phải bản đồ địa lý.
- Plan **1b Task 7** (dải bản đồ tuyến trong màn làm bài): dùng chung biểu tượng tàu và màu chương để hai nơi nói cùng một ngôn ngữ hình ảnh. `celebrate()` của 1b có thể gọi lại animation "tàu rời bến" của #4.
- Không đụng save. Màn hẹp (< 640px): cảnh thu thành dải ngang cao 120px, chỉ còn tàu và 7 chấm.

### ★3. Thang nghề nghiệp — **S**

**Người chơi thấy:** chip chức danh trên topbar ("Junior DA") cạnh XP, và một **thang 5 bậc** trên Trang chủ:

| Bậc | VI / EN | Đạt khi | Tổng XP tối đa đến mốc (để tham khảo) |
|---|---|---|---|
| 1 | Thực tập sinh / Intern | bắt đầu | 0 |
| 2 | Junior DA | xong boss ch1 (hết "Tuần thử việc") | 700 |
| 3 | Data Analyst | xong boss ch3 | 2.900 |
| 4 | Senior DA | xong boss ch5 | (theo nội dung Plan 2) |
| 5 | Lead DA | xong boss ch7 (vụ margin Q3) | (theo nội dung Plan 3) |

Thanh dưới chip hiện "XP tới bậc kế" = XP đã có / tổng XP tối đa của các ticket đến boss mốc. Thăng chức có màn riêng ở Tổng kết chương: "Trần An: Chúc mừng, từ hôm nay bạn là Junior DA".

**Vì sao:** chức danh biến XP trừu tượng thành câu chuyện nghề nghiệp, đúng với mục tiêu "học để làm DA". **Thăng chức gắn với boss, không gắn với ngưỡng XP thô**: XP bị trừ 25% mỗi gợi ý (`xpFor` trong `progress.ts`), nên ngưỡng XP sẽ phạt người dùng gợi ý và khiến họ ngại xin gợi ý. Mốc boss thì bảo đảm đã qua bài kiểm tra kỹ năng. Mốc đầu tiên rơi vào ch1 (≤ 15 phút chơi), nên người mới được thăng chức sớm, và bản đầu (ch1–3) có 2 lần thăng chức.

**Gắn vào plan:** hàm thuần `rankOf(completed, tickets)` trong `src/overview.ts` (Plan **1c Task 4**), test 5 mốc. Hiển thị ở topbar và Trang chủ (**1d**), màn thăng chức trong Tổng kết chương (**1c Task 8**). Không đụng save, vì suy ra từ `completed`.

### ★4. Cốt truyện chương + banner "Sự cố" cho boss + nghi thức hết chương — **M**

**Người chơi thấy:**
- **Mở đầu chương** (ticket `teach` đầu tiên): một thẻ "Tuần này ở Cargo Query" 2–3 câu, đặt trên thẻ Mục tiêu chương mà 1c đã có. Ví dụ ch2: "Mùa cao điểm cuối năm. Sales và Kế toán cần con số sản lượng để chốt kế hoạch 2026." Thẻ có thanh màu chương và hình minh họa nhỏ (emoji + nhãn).
- **Boss = Sự cố:** ticket `beat: boss` có banner sọc vàng-đen kiểu băng cảnh báo công trường, "⚠ SỰ CỐ · Trần An · Hạn: sáng mai", và chỉ báo bước dạng `Bước 1/3` (giữ đúng L11: chỉ chuỗi `brief.step`, không làm stepper đồ họa).
- **Hết chương:** màn Tổng kết chương (ui-ux §2.3, 1c Task 8) mở bằng một animation 1,5 giây: tàu chất thêm container màu chương rồi rời bến, kèm confetti CSS. Sau đó mới tới nội dung tổng kết (thẻ kỹ năng, bảng mới, XP, ôn nhanh 1 câu). Reduced-motion: chỉ hiện ảnh cuối.

**Vì sao:** cho nhịp `teach → … → boss` một hình dạng cảm nhận được (level-design: căng → nhả). Banner sự cố báo trước "đây là bài tổng hợp" nên người chơi dồn sự chú ý, và đúng lúc đó D4 kiểm lại kỹ năng của ticket twist. Nghi thức cuối chương tạo một điểm dừng tự nhiên trong phiên chơi, giúp ghi nhớ (hiệu ứng đỉnh-cuối).

**Gắn vào plan:**
- Nội dung: thêm `story: {vi, en}` vào mỗi chương trong `content/chapters.yml`. Parser đã bỏ qua key lạ. Thêm luật test: chương có ticket thì phải có `story`. Ch1–3 cần 3 đoạn × 2 ngôn ngữ, khoảng 120 từ.
- 1c Task 8 (thẻ mục tiêu chương, Tổng kết chương), `brief.ts` (banner, dựa vào `beat === 'boss'`), 1b Task 7 `celebrate()`.
- Không đụng save.

### ★5. Bảng KPI công ty do chính bạn tính — **M**

**Người chơi thấy:** Trang chủ có khối "Bảng điều hành Cargo Query" gồm 6–8 ô KPI. Ô nào chưa mở thì mờ, có ổ khóa và dòng "Mở khi xong *Khách hàng chủ lực* (Lê Bình)". Ô đã mở hiện **con số lấy từ chính query đáp án của ticket đó**, kèm chân "Bạn tính ở ch2-01". Bấm ô thì mở lại ticket ở chế độ xem. Ô cuối là "Margin Q3: ???", mở ở ch7, chính là câu hỏi lớn của cả game.

| Ô | Mở sau | Nguồn số |
|---|---|---|
| Tổng lô / tổng trọng lượng 2025 | ch2-01 | Solution ch2-01 |
| Cơ cấu SEA / AIR × xuất / nhập | ch2-02 | Solution ch2-02 (thanh ngang 2 màu) |
| Số khách chủ lực (>150 lô) | ch2-03 | số dòng Solution ch2-03 |
| Lô đang trên đường | ch2-04 | Solution ch2-04 |
| TEU theo hãng tàu Q3 | ch3-02 | Solution ch3-02 (bar nhỏ) |
| Khách lâu không gửi hàng | ch3-03 | số dòng Solution ch3-03 |
| Top khách theo TEU | ch3-05 | bước 1 boss ch3 |
| Margin Q3 | ch7 | "???" tới khi xong ch7 |

**Vì sao giúp học:** đây là nâng cấp **gắn với học tập nhất**. Kết quả SQL thôi biến mất sau khi nộp, và trở thành tài sản của công ty mà người chơi tự xây. Nó dạy đúng tư duy DA: query là để ra con số người khác dùng. Khóa theo ticket để **không lộ đáp án** (ô chỉ mở sau khi ticket đã xong). Ô "???" ở ch7 tạo tò mò dài hạn cho cả 7 chương.

**Gắn vào plan:**
- Nội dung: `content/kpis.yml` (`id`, `ticket`, `label {vi,en}`, `kind: number|rowcount|bar`). Số **tính lúc chạy** bằng `runSandboxed(solution)` sau khi DB sẵn sàng, cache trong bộ nhớ. Không hard-code số, vì seed có thể đổi. Test: mọi `ticket` tồn tại, mỗi `kind` khớp hình dạng kết quả.
- Plan **1d**: khung ô và trạng thái khóa (cần DB, nên hiện skeleton cho tới `ready`). Plan **1c Task 4** (`overview.ts`) quyết định ô nào mở. Bar nhỏ dùng SVG thuần, không cần chart lib của 1b.
- Không đụng save (mở theo `completed`).

---

### 6. Chuỗi ngày ôn tập (streak) — **S**, ⚠ cần chốt chỗ lưu

**Thấy:** "🔥 4 ngày" trên topbar và card Ôn hôm nay. Một ngày được tính khi làm ≥ 1 bài Luyện tập **hoặc** đóng ≥ 1 ticket. Có "1 ngày nghỉ miễn phí mỗi tuần" để không phạt người bận.
**Vì sao:** Leitner chỉ có tác dụng nếu người học quay lại đúng hạn. Streak là lực kéo đã được chứng minh cho thói quen hằng ngày.
**Plan:** 1c. **Không suy ra được** từ save hiện tại, phải lưu `{ last: 'YYYY-MM-DD', count, freezeUsedWeek }`. Hai lựa chọn: (a) thêm vào Save v2 *ngay bây giờ*, khi 1c Task 1 còn là lần nâng save duy nhất; (b) để key tiện ích riêng `cargo-query/streak` (mất cũng không hỏng tiến độ, nhưng không đi theo Xuất/Nhập). **Đề xuất (a)**, vì rẻ nếu làm cùng Task 1. **Cần user chốt.** Vì lý do này, mục này không nằm trong top 5.

### 7. Huy hiệu + trang Thành tích — **M**

**Thấy:** trang lưới ~15 huy hiệu SVG (khiên/tem hải quan, màu theo nhóm). Ví dụ: "Không cần gợi ý" (boss 0 gợi ý), "Phá hòa chuẩn" (xong mọi ticket `ordered`), "Thợ săn NULL", "Thuộc lòng" (một kỹ năng đạt hộp 5), "Chuyến tàu đầu" (xong ch1), "Bạn của Võ Thu" (xong mọi ticket của CS). Huy hiệu chưa đạt hiện bóng xám và điều kiện.
**Vì sao:** thưởng cho **hành vi học tốt** (ít gợi ý, ôn đều, phá hòa) chứ không chỉ cho việc đi hết. Điều kiện hiện sẵn nên vừa là mục tiêu phụ, vừa là lời khuyên.
**Plan:** sau 1c. Mọi điều kiện suy ra từ `completed`/`hintsUsed`/`review` (hàm thuần + test). Thông báo "huy hiệu mới" thì so tập trước/sau ngay trong phiên, không lưu.

### 8. Bảng màu biểu đồ theo chương/phòng ban — **S**

**Thấy:** tab Biểu đồ dùng màu chương đang học làm màu chính và bảng 7 màu L17 cho chuỗi phân loại. Kết quả `mode` SEA/AIR luôn là xanh biển/cam ở mọi chỗ, kể cả ô KPI #5.
**Vì sao:** màu nhất quán giúp nhận ra cùng một chiều dữ liệu ở nhiều nơi. Biểu đồ có màu cũng thưởng cho việc chạy query.
**Plan:** 1b Task 5. Thêm token `--chart-1..7` vào `style.css` (cả dark), kiểm tương phản ≥ 3:1 với nền cho mark.

### 9. Phản hồi sai "có giọng người" — **S**

**Thấy:** khi Nộp sai, ngoài khối kỹ thuật ("thiếu 2 dòng", lấy từ grader), người gửi trả lời một câu trong luồng chat, ví dụ Lê Bình: "Hình như còn thiếu vài khách, bạn xem lại điều kiện năm nhé?"
**Vì sao:** cùng thông tin nhưng bớt cảm giác "bị chấm trượt", nên người học thử lại nhiều hơn.
**Plan:** `feedback.ts` + i18n: bảng `reason × dept` (≈ 5 lý do của `GradeResult` × 6 phòng, 30 câu × 2 ngôn ngữ). Đi cùng #1, có thể gộp vào 1d nếu còn sức.

### 10. Minh họa trạng thái rỗng — **S**

**Thấy:** các ô trong bảng trạng thái rỗng của `ui-ux.md` §4 có thêm minh họa SVG nhỏ (≤ 2 KB mỗi hình): container mở trống ("0 dòng"), tàu neo ("hết ticket, vào Luyện tập"), cần cẩu chờ ("chạy query để xem kết quả").
**Vì sao:** trạng thái rỗng là lúc dễ bỏ cuộc. Hình thân thiện cộng chữ hướng dẫn sẵn có giúp người học biết bước tiếp theo.
**Plan:** 1d. Một file `src/ui/illus.ts` export vài hàm SVG.

### 11. Micro-animation khi Chạy/Nộp/+XP — **S**

**Thấy:** khi đang chạy, nút Chạy có thanh tiến độ hình móc cẩu. Nộp đúng thì XP đếm lên (count-up 600ms) và chip kỹ năng mới "bật" vào Sổ tay. Shape card ✓ có hiệu ứng nảy nhẹ.
**Vì sao:** phản hồi tức thì, rõ ràng cho từng hành động là nền của cảm giác "game".
**Plan:** 1d, CSS keyframes + một hàm `countUp()`. Tất cả nằm sau `prefers-reduced-motion`.

### 12. Thẻ kỹ năng dạng thẻ sưu tập — **M**

**Thấy:** thẻ kỹ năng (1c Task 9) có mặt trước là tên + biểu tượng, mặt sau là `syntax/when/trap`, và viền theo hộp Leitner: đồng (1–2), bạc (3–4), vàng (5). Bộ sưu tập theo chương có dạng "album".
**Vì sao:** biến ôn tập ngắt quãng thành việc "nâng cấp thẻ". Viền vàng là bằng chứng nhìn thấy được của trí nhớ dài hạn.
**Plan:** 1c Task 8–9 (đổi CSS và cấu trúc thẻ, dữ liệu đã có trong `skills.yml` + `review`).

### 13. Âm thanh tùy chọn — **S**

**Thấy:** nút 🔈 trong Cài đặt, **mặc định tắt**. Có 3 âm tổng hợp bằng WebAudio (Nộp đúng, sai, còi tàu khi hết chương). Không có file âm thanh, nên không lo bản quyền và không tăng dung lượng tải.
**Vì sao:** một số người thích, nhưng nhiều người học nơi công cộng. Mặc định tắt là đúng.
**Plan:** sau 1c. Key tiện ích `cargo-query/prefs.sound`, không thuộc Save.

### 14. Thẻ nhân viên / chứng nhận xuất PNG — **M**

**Thấy:** ở Tổng kết chương và trang Thành tích có nút "Tải thẻ nhân viên": ảnh PNG gồm chức danh (#3), số chương, kỹ năng đã thuộc và huy hiệu, vẽ bằng `<canvas>` ngay trong trình duyệt.
**Vì sao:** đây là phần "xã hội" làm được khi không có backend. Người học tự khoe kết quả, thay cho leaderboard (không làm được, xem §1).
**Plan:** sau 1c. Không gửi gì ra mạng.

### 15. "Bản tin sáng" trên Trang chủ — **S**

**Thấy:** một dòng tin từ Trần An đầu Trang chủ, đổi theo trạng thái: "Hôm nay có 3 kỹ năng đến hạn ôn và 1 việc mới từ Lê Bình". Khi hết ticket: "Tuần này yên ả, tranh thủ ôn nhé".
**Vì sao:** cho người quay lại một việc cụ thể để làm ngay (giảm thời gian "không biết làm gì").
**Plan:** 1d (khung) + dữ liệu `overview.ts` của 1c. Câu mẫu trong i18n, khoảng 6 mẫu.

---

## 4. Top 5 cho bản đầu: vì sao là 5 mục này

| Tiêu chí | ★1 Người | ★2 Cảng | ★3 Thang nghề | ★4 Sự cố | ★5 KPI |
|---|---|---|---|---|---|
| Thấy ngay trên Trang chủ/Hộp thư | ✓ | ✓ | ✓ | màn làm bài | ✓ |
| Chạy được với 15 ticket ch1–3 | ✓ 6 người | ✓ 3/7 trạm | ✓ 2 lần thăng chức | ✓ 3 boss | ✓ 7 ô |
| Đụng save | không | không | không | không | không |
| Nội dung phải viết thêm | `people.yml` 6 dòng | không | không | `story` 3 chương | `kpis.yml` 8 dòng |
| Chống điểm "đơn điệu" (§0) | 1 | 2 | 5 | 3 | 4 |

Tổng effort khoảng 3M + 1S, làm trong **Plan 1d** (đã được L17 lên lịch ngay sau sửa lỗi Plan 1, trước 1b). Phần tính toán (`rankOf`, KPI mở khóa) và Tổng kết chương nằm trong 1c Task 4 và Task 8 như bảng trên.
Các mục 6–15 xếp hàng sau mốc 1. Riêng **#6 cần user chốt chỗ lưu trước 1c Task 1**, vì nếu vào Save v2 thì phải làm cùng task đó.

## 5. Cần user quyết

1. Duyệt top 5 (A), duyệt nhưng bỏ bớt (B, ghi số mục bỏ), hay hướng khác (C). Chọn ở cuối mockup.
2. Streak (#6): đưa vào Save v2 ngay (đề xuất) hay key riêng, hay bỏ.
3. Thang nghề gắn với boss (đề xuất) hay với ngưỡng XP như yêu cầu ban đầu (xem lý do ở ★3).
4. Tính cách nhân vật (bảng ở ★1) có hợp ý không. Nếu duyệt thì ghi vào `content/people.yml`, người viết ticket ch4–7 giữ đúng giọng.
