# Cargo Query: Product Design v3: Bảng điều hành tự dựng và nội dung nghiệp vụ cho tuyến

Ngày: 2026-11-17 · Vai trò: Product Designer · Trạng thái: **đề xuất, chờ user duyệt. Chưa build gì.**
Theo **L47** mục 7 và 8 ("thiết kế trước, user duyệt rồi mới build"). Mục 1–6 của L47 đang được build riêng, tài liệu này không bàn tới.

Đầu vào đã đọc: `product-design-v2.md` (★5 bảng KPI), `curriculum.md` (§0, §3, §7), `completion-animations.md`, `content/kpis.yml`, `src/home.ts`, `src/ui/homeView.ts`, `src/ui/routeMap.ts`, `src/scene.ts` (L26/L32), `src/route.ts`, `src/save.ts`, `src/progress.ts` (`CHAPTER_TABLES`), `content/chapters.yml`, `content/people.yml`, `src/db/schema.sql`, `src/db/seed.sql`.
Mọi SQL ví dụ ở §8 đã chạy thật trên schema + seed hiện tại (PGlite trong Node). Riêng SQL dùng bảng **chưa có** thì chạy trên bảng nguyên mẫu, có ghi rõ.

---

## Phần A. Mục 7: Bảng điều hành tự dựng (custom analyst dashboard)

### 1. Hiện trạng

- Trang chủ có khối "Bảng điều hành Cargo Query" với 16 ô KPI (`content/kpis.yml`).
  - Mỗi ô mở khi người chơi xong ticket của nó.
  - Số được tính lúc chạy bằng Solution của ticket, cache theo phiên (`kpiRuns` trong `homeView.ts`).
  - Có 3 kiểu ô: `number`, `rowcount`, `bar` (5 thanh lớn nhất).
- Người chơi **không tự thêm được gì**. Query viết ở Sandbox hay ở ticket không lưu thành sản phẩm nào cả. Chỉ có `graded` dùng cho màn Recap.
- `src/route.ts` mới có hai route: `home` và `play`. Mục 5 của L47 (tab "Dữ liệu") đang thêm route thứ ba.
- Save hiện ở v2, có Xuất/Nhập tiến độ trong menu `⋯` (L42).

### 2. Mục tiêu

1. **Kết quả SQL thành tài sản của chính người chơi.** Đây là bước tiếp của ★5: ở ★5 người chơi thấy con số mình đã tính, còn ở đây họ **tự chọn** con số nào đáng theo dõi.
2. **Dạy đúng việc của DA:** từ câu hỏi đến query, rồi đến thẻ (card), rồi đến bảng điều hành (dashboard) cho người khác đọc. Gồm cả chọn dạng hiển thị, đặt tiêu đề rõ nghĩa, giữ query đủ nhanh.
3. **Có lý do để quay lại Sandbox sau khi xong cốt truyện.** Hiện người chơi xong 69 ticket thì hết việc làm.
4. **Không thêm dependency nặng.** Không kéo thả kiểu thư viện, không chart lib mới.

### 3. User stories

| # | Là… | Tôi muốn… | Để… | Pha |
|---|---|---|---|---|
| U1 | người chơi | mở tab "Bảng điều hành" từ thanh nav | xem các KPI mình đã mở mà không phải cuộn Trang chủ | P1 |
| U2 | người chơi vừa nộp đúng một ticket | bấm "Ghim vào bảng điều hành" | giữ lại con số mình vừa tính | P2 |
| U3 | người chơi trong Sandbox | ghim query vừa chạy thành một thẻ, đặt tiêu đề và chọn dạng hiển thị | tự dựng báo cáo của riêng mình | P2 |
| U4 | người chơi | đổi thứ tự và kích thước thẻ (kéo thả, hoặc bàn phím) | bố cục theo ý mình | P3 |
| U5 | người chơi | thẻ dạng biểu đồ cột hoặc đường | kể chuyện bằng hình | P3 |
| U6 | người chơi | sửa SQL của thẻ, ẩn thẻ hệ thống | bảng luôn đúng thứ mình cần | P2/P3 |
| U7 | người chơi | tải thẻ thành ảnh PNG/CSV, hoặc xuất cả bảng thành file | gửi cho người khác, đưa vào portfolio | P4 |

### 4. Gắn với việc học

- **Dạng thẻ mở theo kỹ năng đã học.** Kỹ năng nào tạo ra hình dạng kết quả nào thì mở dạng thẻ đó:

  | Dạng thẻ | Mở khi đã học | Lý do |
  |---|---|---|
  | Bảng (table, tối đa 10 dòng) | `select` (ch1) | query nào cũng ra bảng |
  | Số (number) | `aggregate` (ch2) | một con số = một phép gộp |
  | Cột (bar) | `group_by` (ch2) | nhãn + số mỗi nhóm |
  | Đường (line) | `date_bucket` (ch4) | trục thời gian cần gom theo kỳ |

  Dạng chưa mở vẫn hiện trong bộ chọn nhưng mờ đi, kèm dòng "Mở khi học *Gom theo tháng/tuần* (ch4)". Đây vừa là mục tiêu vừa là gợi ý học tiếp.
- **Ô KPI hiện tại thành "thẻ hệ thống" (system cards)**, luật mở giữ nguyên: theo ticket, không lộ đáp án. Người chơi ẩn hoặc dời được nhưng không sửa hay xóa được. Bấm "Xem SQL" chỉ được sau khi đã xong ticket (giữ đúng luật ★5).
- **Ghim từ ticket** (U2) lấy SQL **đã qua grader** (`graded`), không lấy bản nháp. Người chơi ghim chính lời giải của mình chứ không phải Solution, nên không lộ gì.
- **Thẻ ghi kỹ năng đã dùng.** Chân thẻ có chip kỹ năng, phát hiện bằng `SKILL_SQL` sẵn có (vd "GROUP BY · JOIN"). Người chơi thấy bảng của mình là "bộ sưu tập kỹ năng đang được dùng".
- **Dạy giữ query nhanh.** Thẻ chạy lại mỗi lần mở tab, nên lúc ghim sẽ đo thời gian chạy. Query chậm (> 2 s) bị từ chối, kèm lời gợi ý: "Thẻ phải nhanh. Thử gom trước hoặc lọc khung thời gian hẹp hơn (ch11)". Đây là bài học hiệu năng thật, không phải luật bịa.

### 5. MVP và để sau

| | MVP (P1 + P2) | Để sau (P3 + P4) | Không làm |
|---|---|---|---|
| Nguồn thẻ | thẻ hệ thống từ `kpis.yml`; ghim từ ticket đã nộp và từ Sandbox | sửa SQL của thẻ | thẻ lấy dữ liệu ngoài game (API, file mới) |
| Dạng | number, table, bar (dùng lại `kpiValue` và `chartView`) | line, thẻ ghi chú (markdown ngắn) | pie, map, heatmap |
| Bố cục | lưới tự chảy theo thứ tự ghim; nút "Lên/Xuống" | kéo thả bằng pointer events, đổi cỡ 1×/2× | lưới tự do pixel, nhiều trang dashboard |
| Bộ lọc | không | (cân nhắc) một bộ lọc ngày chung | tham số hóa SQL tùy ý |
| Chia sẻ | không | PNG/CSV từng thẻ, xuất/nhập bảng thành JSON | link chia sẻ online (không có backend) |

### 6. Mô hình dữ liệu

**Lưu ở đâu: trong Save, không trong device prefs.** Thẻ là sản phẩm của người chơi, nên phải đi theo Xuất/Nhập tiến độ, giống `drafts`/`graded`. Device prefs (`cargo-query/*`) chỉ dành cho tiện ích, mất cũng không sao.

```ts
// Save v3
dashboard: {
  order: string[];               // id theo thứ tự hiển thị: thẻ hệ thống ("kpi:<id>") và thẻ người chơi ("c:<id>")
  hidden: string[];              // thẻ hệ thống bị ẩn
  cards: Record<string, Card>;   // chỉ thẻ người chơi
}
interface Card {
  id: string;                    // ngắn, ngẫu nhiên
  title: string;                 // ≤ 80 ký tự
  sql: string;                   // ≤ 4.000 ký tự, đúng một câu lệnh
  viz: 'number' | 'table' | 'bar' | 'line';
  col?: number;                  // cột số cho number/bar/line
  size: 1 | 2;                   // chiếm 1 hay 2 cột lưới (P3)
  from: 'sandbox' | string;      // 'sandbox' hoặc ticket id: chỉ để hiện nguồn
  ms: number;                    // thời gian chạy đo lúc ghim
  slow?: true;                   // lần chạy gần nhất quá chậm hoặc lỗi hết giờ: không tự chạy nữa
}
```

- **Giới hạn:** tối đa **24 thẻ người chơi**, SQL tối đa 4.000 ký tự. Tổng cỡ dưới ~110 KB, an toàn với localStorage.
- **Nâng `SAVE_VERSION` 2 → 3, kèm migration `2: d => ({ ...d, dashboard: { order: [], hidden: [], cards: {} } })` và fixture v2 giữ mãi** (luật CLAUDE.md).
  - Vì sao không làm như `graded` (trường tùy chọn, không nâng version)? Với `graded`, một build cũ đọc save mới rồi ghi lại thì chỉ mất bản SQL Recap, chấp nhận được.
  - Với `dashboard`, build cũ sẽ **xóa lặng lẽ** toàn bộ thẻ người chơi đã dựng. Nâng version thì build cũ thấy "save mới hơn" và cất bản đó vào `.bak` thay vì ghi đè.
- Khi đọc save, `dashboard` được kiểm như mọi trường khác. Thẻ hỏng (thiếu `sql`, `viz` lạ, quá cỡ) bị bỏ, không làm hỏng cả save. Id trong `order` không còn tồn tại (vd KPI bị xóa khỏi `kpis.yml`) thì bỏ qua.

### 7. Chạy lại thẻ trong giới hạn 5 s

Rủi ro lớn nhất: query nào quá 5 s thì `DbClient` giết worker và seed lại, mất **10–11 s** trên trình duyệt (L46). Một thẻ chậm không được phép làm treo cả tab.

1. **Kết quả không đổi trong một build.** Seed tất định và mọi query đều `ROLLBACK`. Vì vậy mỗi thẻ chỉ chạy **một lần mỗi phiên**, cache trong bộ nhớ như `kpiRuns`. Không cần lưu kết quả.
2. **Chạy lười, tuần tự.** Chỉ chạy khi tab mở (thẻ ngoài màn hình chạy sau, theo thứ tự hiển thị), qua hàng đợi sẵn có của `DbClient`. Mỗi thẻ có skeleton riêng. Đang chạy thì nút Chạy ở Sandbox vẫn vào cùng hàng đợi, không đụng nhau.
3. **Chặn từ lúc ghim.** Lúc ghim, query đã vừa chạy xong, nên đo được `ms`. Nếu `ms > 2.000` thì không cho ghim và hiện lời gợi ý ở §4.
4. **Chặn khi chạy lại.** Thẻ hết giờ hoặc làm worker khởi động lại thì được đánh `slow: true` (lưu vào Save). Từ đó thẻ không tự chạy nữa mà hiện nút "Chạy thử lại". Như vậy người chơi chỉ bị seed lại tối đa một lần cho mỗi thẻ hỏng.
5. **Giới hạn kết quả:** table hiện 10 dòng, bar 12 thanh (cùng logic top N với `kpiValue`), line tối đa `MAX_POINTS` (60). Kết quả bị cắt thì chân thẻ ghi rõ "đang hiện 10/245 dòng".
6. **Lỗi SQL** (vd bảng nhập CSV đã bị xóa) thì thẻ hiện lỗi đã dịch qua `errorText()`, kèm nút "Sửa" (P3) và "Gỡ thẻ". Thẻ không tự biến mất.

**Hai trường hợp đặc biệt cần chốt:**
- **Bảng nhập CSV (My Data).** Thẻ ghim từ Sandbox có thể dùng bảng người chơi tự nhập. Bảng đó còn trong DB thì chạy bình thường. Bị xóa thì rơi vào lỗi ở bước 6. Đề xuất: lúc ghim, chip ghi "dùng bảng nhập: `my_sales`".
- **Bảng chưa mở khóa.** Sandbox chạy được mọi bảng (chỉ tab Cột và autocomplete giấu bảng khóa). Thẻ là SQL do chính người chơi viết, không phải Solution, nên không lộ đáp án. **Đề xuất cho phép**, giống Sandbox hiện tại.

### 8. Bố cục và tương tác (không thêm dependency)

- **Lưới:** CSS grid `grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr))`. Thẻ `size: 2` dùng `col-span-2`, và dưới `sm` thì về 1 cột. Không có tọa độ tự do: thứ tự trong `order` là nguồn sự thật duy nhất. Nhờ vậy lưới tự chảy ở mọi bề rộng và không có thẻ chồng nhau.
- **Kéo thả (P3): Pointer Events, không dùng HTML5 drag and drop**, vì DnD gốc không chạy trên màn hình cảm ứng.
  - Thẻ có tay nắm (icon `grip`). `pointerdown` trên tay nắm thì `setPointerCapture`, thẻ nổi lên (bóng + `translate`). Một placeholder cùng cỡ chạy theo vị trí con trỏ.
  - Vị trí chèn tính bằng `document.elementsFromPoint` hoặc so tâm các thẻ khác. `pointerup` thì ghi `order`.
  - Ước lượng khoảng 120 dòng TS trong `src/ui/dashboard.ts`.
- **Bàn phím (bắt buộc cho a11y, có ngay từ P2):**
  - Tay nắm là `<button>`. Space/Enter để "nhấc", mũi tên để di chuyển, Space để "đặt", Esc để hủy.
  - Mỗi bước được đọc qua `aria-live="polite"`, vd "Đã dời *TEU theo hãng tàu* lên vị trí 3/9".
  - P2 có sẵn hai nút "Lên/Xuống" trong menu của thẻ, là đường dự phòng không cần kéo.
- **Giảm chuyển động:** dưới `prefers-reduced-motion` thì thẻ nhảy thẳng vào vị trí mới, không có animation.
- **Biểu đồ:** dùng lại `chartSpec` (`src/viz/chart.ts`) và `bars`/`line` của `chartView.ts`, bản thu nhỏ. Màu theo chương của kỹ năng chính của thẻ (`chapterColor`).

### 9. Vị trí trên nav và Trang chủ

- Nav: **Trang chủ · Làm việc · Dữ liệu · Bảng điều hành**. Route mới `#/dashboard`. Thứ tự: hai tab "xem" đứng sau hai tab "làm".
- **Va chạm với mục 5 (tab "Dữ liệu") đang build.** Cả hai cùng sửa `ROUTES`/`HASH` trong `src/route.ts`, nav ở `topbar.ts` và `tests/route.test.ts`. P1 phải làm **sau khi mục 5 đã merge** và rebase lên đó.
- Trang chủ không còn lưới 16 ô. Thay vào đó là **một dải teaser một dòng**: "Bảng điều hành: 7/16 ô đã mở · 2 thẻ của bạn →". Trang chủ ngắn lại, đúng ý L47 mục 6.

### 10. Rủi ro

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Thẻ chậm làm worker khởi động lại (10 s) | cao | chặn lúc ghim > 2 s; `slow` sau lần hết giờ đầu; chạy lười, tuần tự |
| Mất thẻ khi chạy build cũ | trung bình | nâng `SAVE_VERSION`, build cũ đẩy save sang `.bak` |
| Phạm vi phình (bộ lọc, tham số, nhiều dashboard) | trung bình | khóa MVP ở §5; bộ lọc ngày chỉ "cân nhắc" ở P3 |
| Mở tab tốn thời gian khi DB chưa sẵn | thấp | skeleton cho tới `ready`, như ô KPI hiện tại |
| Kéo thả lỗi trên trình duyệt/thiết bị lạ | thấp | luôn có Lên/Xuống + bàn phím; kéo thả chỉ là phần thêm |
| Thẻ hệ thống trùng với thẻ người chơi ghim từ cùng ticket | thấp | cho phép; chân thẻ ghi "SQL của bạn" và "SQL công ty" |

### 11. Ước lượng và các pha

| Pha | Nội dung | Effort | Đụng Save |
|---|---|---|---|
| **P1** | Chuyển bảng KPI sang tab "Bảng điều hành" (route `#/dashboard`, dời `kpiSection()` từ `homeView.ts` sang `ui/dashboard.ts`), teaser trên Trang chủ, i18n nav | **S** (~0,5 ngày) | không |
| **P2** | Save v3 + migration + fixture; nút "Ghim" ở Sandbox, Recap và tab Kết quả; hộp thoại ghim (tiêu đề, dạng, cột); thẻ number/table/bar; Lên/Xuống, Gỡ, Ẩn thẻ hệ thống; luật 2 s / `slow`; khóa dạng theo kỹ năng | **M** (~2–3 ngày) | v3 |
| **P3** | Kéo thả pointer + bàn phím; cỡ 1×/2×; thẻ line; sửa SQL thẻ (mở editor Sandbox với SQL đó, rồi "Cập nhật thẻ"); thẻ ghi chú | **M–L** (~3 ngày) | trường đã có |
| **P4** | Tải PNG từng thẻ (SVG → canvas), CSV kết quả, xuất/nhập riêng bảng điều hành (JSON) | **S–M** (~1–1,5 ngày) | không |

Test cần thêm: migration v2→v3 (fixture), parse/validate `dashboard` với dữ liệu hỏng, đảo thứ tự bằng bàn phím (logic thuần `move(order, from, to)`), luật khóa dạng theo kỹ năng, `slow` sau timeout (giả lập `QueryTimeoutError`).

---

## Phần B. Mục 8: Nội dung nghiệp vụ cho tuyến (lane business content)

### 12. Hiện trạng và vấn đề

- Bản đồ có 7 tuyến tỏa từ Tiên Sa (`ROUTES` trong `scene.ts`). Tuyến mở theo chương (`opens` 0–5) hoặc theo chuyến tàu `scene: ship` (L32). Nhãn chỉ có tên cảng và số chuyến.
- **L35 (`curriculum.md` §7.2) đã chốt:** "không số lô khi rê chuột; ch6–12 thêm hoạt cảnh, không thêm tuyến". Thiết kế dưới đây **sửa một phần L35** (xem câu hỏi D-B1, D-B6).
- User (L47): mở tuyến chỉ là đổi màu một đường, không dạy gì về nghiệp vụ.

**Seed hiện tại gần như giống nhau ở mọi tuyến.** Đã kiểm:

| Khác nhau theo tuyến (dùng được ngay) | Giống nhau ở mọi tuyến (seed ngẫu nhiên đều) | Không có trong seed |
|---|---|---|
| `ports.base_transit_days` và số ngày đi biển thực tế (vd Laem Chabang ~4,5 ngày, Rotterdam ~31,5 ngày) | cơ cấu ngành hàng (`customers.industry` không phụ thuộc tuyến) | lúa mì, cát, clinker… (10 ngành: Textile, Seafood, Furniture, Coffee, Electronics, Footwear, Rice, Cashew, Steel, Plastics) |
| giá mua `rate_contracts` theo tuyến; **tuyến châu Âu +40% từ 15/07/2026 (GRI)** | phân bố Incoterms | quãng đường, chặng trung chuyển, nhiên liệu, BAF |
| margin châu Âu giảm ở Q3 (ch12) | mùa vụ (vd lô gạo đi Singapore theo tháng gần như phẳng) | mùa vụ thật (Tết, peak season) |
| hàng nhập: D&D, hải quan (theo lô, không theo tuyến) | hãng tàu (chọn ngẫu nhiên, không theo tuyến) | sự cố riêng tuyến (tắc cảng, kiểm dịch) |

Hệ quả: nếu chỉ dùng dữ liệu cũ, mỗi tuyến dạy được **một hoặc hai** điều thật sự riêng (thời gian, giá). Muốn tuyến có "hồn" (lúa mì, nhiên liệu, nhiều nước) thì phải có **bảng mới**, chỉ thêm vào cuối seed (§16).

### 13. Ý tưởng: "Hồ sơ tuyến" + việc phụ của tuyến

Mỗi tuyến có:

1. **Hồ sơ tuyến (lane brief).** Một thẻ đọc khoảng 1 phút: tuyến nối ai với ai, hàng gì, mất bao lâu, vướng gì. Có đúng 3 "con số đáng nhớ" và 1 câu chốt "Một DA ở tuyến này hay được hỏi…".
   - Mở bằng cách bấm vào chấm cảng trên bản đồ: popover/drawer **tại chỗ**, khớp với cách mục 3 của L47 đưa bản đồ vào xem ngay trong bài.
   - Tuyến khóa vẫn xem được 2 dòng đầu, kèm "Mở khi qua cột mốc ch*n*".
   - Nhãn rõ: **"Số liệu minh họa, đã đơn giản hóa"**. Tên công ty và số liệu là hư cấu, kiến thức chung (Incoterms, BAF, trung chuyển) thì đúng thực tế.
2. **1–3 việc phụ (side tasks) của tuyến.** Là ticket thật (cùng định dạng, cùng grader, có VI + EN), nhưng **tùy chọn**:
   - một việc mở khi tuyến mở và đủ kỹ năng;
   - các việc sau mở dần khi người chơi học thêm (vd việc về giá chỉ mở sau ch7).
   Hồ sơ tuyến "lớn lên" cùng người chơi.
3. **Thẻ "Số của bạn" trong hồ sơ.** Việc phụ xong thì con số người chơi tính hiện lại trong hồ sơ, giống ô KPI. Tuyến thành nơi lưu kết quả của chính họ.

**Điều kiện mở một việc phụ** (gate theo kỹ năng, **không** chỉ theo việc tuyến đã mở, vì L32 cho tàu mở tuyến sớm):
`tuyến đã mở` **và** mọi `requires` đã học **và** mọi `tables` nằm trong `tablesUnlocked(currentChapter)` (hoặc trong bảng của tuyến, §16).

### 14. Không chặn cốt truyện chính

Ticket phụ dùng định dạng ticket sẵn có, thêm `lane: NLRTM` (và `beat: side`, hoặc đặt trong `content/tickets/lanes/`). Chúng **phải đứng ngoài** mọi chỗ đang duyệt "tất cả ticket":

| Chỗ | Hiện tại duyệt mọi ticket | Với việc phụ |
|---|---|---|
| `nextTicket`, `visibleTickets`, `currentChapter` | có | **loại ra**: không bao giờ là "việc tiếp theo" |
| `contentProblems` (thứ tự beat teach → … → boss, soft-lock) | có | kiểm riêng: `requires` phải được dạy ở chương ≤ chương mở tuyến hoặc chương ghi trong `after:`; không tính vào nhịp chương |
| số done/total trên Trang chủ, thẻ chương, thang nghề | có | **không tính**; hiện riêng "Việc tuyến 3/17" |
| `derive()` (`bays`, `trips`), hoạt cảnh | có | không thêm container vào bãi. Có hoạt cảnh nhẹ riêng (tàu ghé cảng đó, `scene: ship` với `to` = cảng tuyến), không mở tuyến mới |
| XP | có | **50 XP cố định**, không trừ gợi ý (để người chơi thoải mái thử), không ảnh hưởng thăng tiến |
| KPI, Recap, Luyện tập (Leitner) | có | có Recap; **không** vào ngân hàng Luyện tập (bản đầu) |
| Hộp thư | có | nhóm riêng "Việc tuyến (tùy chọn)" với chip màu tuyến; không đếm "tin mới" để không gây áp lực |

Lưu tiến độ: id việc phụ vào `completed` như ticket thường (`Known.ticketIds` đã có cơ chế bỏ id lạ), nên **không cần nâng Save**.

### 15. Từng tuyến dạy gì về nghiệp vụ

"Mở" = theo `ROUTES[].opens` hiện tại. "Kỹ năng sẵn có" = những gì người chơi đã học khi tuyến mở. Hai tuyến mở từ đầu (ch0) chưa có SQL nào, nên việc phụ đầu tiên của chúng mở sau ch1.

| Tuyến | Mở | Kỹ năng sẵn có | Câu chuyện nghiệp vụ (đơn giản hóa) | Việc phụ đề xuất (khi nào mở) | Dữ liệu |
|---|---|---|---|---|---|
| **Shanghai** (CNSHA) | ch0 | sau ch1: SELECT/WHERE/ORDER | Nhập nguyên liệu, linh kiện điện tử, vải từ Trung Quốc; tuyến ngắn ~5 ngày, nhiều chuyến mỗi tuần; Ningbo là cảng thay thế. **Mùa vụ:** trước Tết Nguyên đán hàng dồn, hãng tàu hủy chuyến (blank sailing) sau Tết. | (ch1) 10 lô nhập từ Thượng Hải đến gần nhất; (ch4) số lô theo tuần quanh Tết 2026 | có / mùa vụ cần bảng mới |
| **Laem Chabang** (THLCH) | ch0 | sau ch1 | Tuyến nội Á ngắn nhất (~3–4 ngày). Thái Lan vừa là bạn hàng vừa là đối thủ gạo. **Nhiều nước bằng đường bộ:** hàng có thể đi xe qua Lào/Campuchia thay vì tàu (cross-border trucking). | (ch1) lô gạo xuất đi Laem Chabang năm 2025; (ch5) so sánh đường biển vs đường bộ | có / đường bộ cần bảng mới |
| **Singapore** (SGSIN) | ch1 | SELECT/WHERE/ORDER/LIMIT | **Cảng trung chuyển (transshipment hub):** hàng Hải Phòng đi châu Âu thường đổi tàu ở đây. Singapore cũng nhập vật liệu xây dựng (cát, đá) cho lấn biển; ở Việt Nam cát tự nhiên thuộc diện quản lý xuất khẩu rất chặt, nên đây là **bài tuân thủ (compliance)**, không phải cơ hội bán hàng (xem D-B3). | (ch1) 10 lô xuất nặng nhất đi Singapore 2025; (ch3) lô nào đi Singapore rồi đi tiếp (cần chặng) | có / chặng cần bảng mới |
| **Rotterdam** (NLRTM) | ch2 | + COUNT/SUM/AVG, GROUP BY, HAVING | Cửa ngõ châu Âu: dệt may, đồ gỗ, cà phê, điều. Tuyến dài ~30 ngày qua Suez (hoặc vòng Mũi Hảo Vọng khi Biển Đỏ bất ổn). **Giá:** phụ phí nhiên liệu (BAF), đợt tăng giá chung (GRI) 15/07/2026. Peak season Q3–Q4 (hàng Giáng sinh). FOB phổ biến nhất. | §17: 3 việc (ch2, ch3, ch7) | **có, đủ** |
| **Busan** (KRPUS) | ch3 | + JOIN | Hàn Quốc: linh kiện điện tử (chuỗi cung ứng hai chiều), thép. Busan là hub trung chuyển Bắc Thái Bình Dương. | (ch3) khách nào vừa xuất vừa nhập qua Busan; (ch8) hóa đơn hãng tàu theo tiền tệ tuyến Busan | có |
| **Los Angeles** (USLAX) | ch4 | + ngày tháng, NULL | Xuyên Thái Bình Dương: đồ gỗ, giày dép, dệt may sang Mỹ. ~20 ngày. **Tắc cảng (congestion)**, phí lưu container (D&D) khi khách chậm lấy hàng, peak season tháng 8–10. | (ch4) lô đến LA trễ hơn 3 ngày so với dự kiến, theo tháng; (ch10) container hàng nhập từ LA giữ quá ngày miễn phí | có |
| **Sydney** (AUSYD) | ch5 | + CASE, đếm có điều kiện, COALESCE | Úc → VN: **lúa mì** cho nhà máy bột mì và thức ăn chăn nuôi (đi tàu rời và cả container). VN → Úc: đồ gỗ, hải sản. **Kiểm dịch sinh học (biosecurity)** rất chặt: pallet gỗ phải xử lý theo ISPM 15, đồ gỗ dễ bị kiểm. ~16 ngày. Nhiên liệu là phần lớn chi phí chuyến dài. | §18: 3 việc (ch5, ch5 + bảng mới, lúa mì) | một phần có; nhiên liệu và lúa mì cần bảng mới |

**Kiến thức xuyên tuyến** (gắn vào hồ sơ tuyến hợp nhất, không lặp lại ở mọi tuyến):

- **Incoterms:** gắn vào Rotterdam, nối với bảng `incoterms` của ch6.
- **BAF và nhiên liệu:** gắn vào Sydney.
- **Trung chuyển:** gắn vào Singapore.
- **D&D:** gắn vào Los Angeles, nối với ch10.
- **Mùa vụ:** gắn vào Shanghai.

### 16. Dữ liệu và seed

**Phương án A: không đụng seed.** Chỉ làm việc phụ trên bảng có sẵn. Làm được Rotterdam, Busan, Los Angeles và một phần Sydney/Singapore. Không có lúa mì, nhiên liệu, chặng hay mùa vụ.

**Phương án B (đề xuất): A + 2 bảng tĩnh nhỏ, chỉ thêm ở cuối seed:**

| Bảng | Cột | Số dòng | Ngẫu nhiên? | Dùng cho |
|---|---|---|---|---|
| `lane_profiles` | `pol`, `pod` (FK `ports`), `distance_nm`, `via_port` (FK `ports`, NULL = đi thẳng), `sea_days`, `fuel_t_per_day`, `vessel_teu`, PK (`pol`, `pod`) | ~39 (3 cảng biển VN × 13 cảng biển ngoài) | không, giá trị viết tay | quãng đường, chặng trung chuyển, nhiên liệu |
| `bunker_prices` | `month` (PK, ngày đầu tháng), `usd_per_tonne` | 22 (01/2025 → 10/2026) | không, viết tay | giá nhiên liệu theo tháng, BAF |

**Phương án C: B + một bảng hàng rời/mùa vụ:**

| Bảng | Cột | Số dòng | Dùng cho |
|---|---|---|---|
| `bulk_voyages` | `id`, `commodity` (WHEAT, CLINKER…), `load_port`, `discharge_port` (FK `ports`), `load_date`, `arrive_date`, `tonnes`, `freight_usd_per_t` | ~150, khối `setseed()` riêng | lúa mì Úc, mùa vụ, hàng rời |

Tách bảng riêng vì **không được thêm dòng vào `shipments`**: mọi Solution và mã md5 đang ghim sẽ đổi.

**Luật giữ nguyên:**

- chỉ thêm khối mới ở cuối `seed.sql`;
- không `ALTER` bảng cũ;
- khối nào có ngẫu nhiên thì có `setseed()` riêng;
- thêm dòng ghim md5 cho bảng mới vào `tests/seed.test.ts`, md5 bảng cũ không đổi;
- chạy lại mọi Solution, kết quả phải giữ nguyên.

Seed tăng ước tính dưới 20 ms (dưới 250 dòng, không index mới). Ngưỡng 2,0 s (S2) không bị ảnh hưởng.

**Bảng của tuyến mở theo tuyến, không theo chương** (D-B4):

- Thêm `LANE_TABLES: Record<port, string[]>` cạnh `CHAPTER_TABLES`.
- Tab Cột, ER (mục 4–5 của L47) và autocomplete hiện các bảng này khi tuyến đã mở.
- `contentProblems` kiểm: việc phụ chỉ dùng bảng của chương đã mở hoặc của chính tuyến đó.
- Ticket chính **không bao giờ** được dùng bảng tuyến. Như vậy người chơi mở tuyến muộn (vì chưa đi tàu tới) không bao giờ bị kẹt ở cốt truyện chính.

### 17. Ví dụ 1 (đầy đủ): Rotterdam: chỉ dùng dữ liệu có sẵn

**Hồ sơ tuyến**

> **VI:** Rotterdam là cảng lớn nhất châu Âu và là cửa ngõ chính cho hàng Việt Nam vào EU. Từ Cát Lái, tàu đi khoảng 30 ngày qua kênh Suez. Khi Biển Đỏ bất ổn, hãng tàu vòng qua Mũi Hảo Vọng, thêm 10–14 ngày và tốn thêm nhiên liệu. Hàng chủ lực của Cargo Query trên tuyến này là dệt may, hải sản đông lạnh, đồ gỗ, cà phê và hạt điều. Phần lớn khách bán theo FOB: người mua châu Âu tự thuê tàu, còn ta lo chặng nội địa và thủ tục xuất. Giá cước tuyến dài nhạy với hai thứ: phụ phí nhiên liệu (BAF) và các đợt tăng giá chung (GRI). Đợt GRI ngày 15/07/2026 đẩy giá mua lên khoảng 40%, và đó là manh mối lớn của cuộc điều tra cuối năm.
> **Ba con số:** ~30 ngày đi biển · FOB là điều kiện phổ biến nhất · giá mua +40% từ 15/07/2026.
> **DA ở tuyến này hay được hỏi:** "Hàng gì đang đi châu Âu, theo điều kiện nào, và giá mua vừa tăng bao nhiêu?"
> *Số liệu minh họa, đã đơn giản hóa.*

> **EN:** Rotterdam is Europe's largest port and the main gateway for Vietnamese goods into the EU. From Cat Lai a ship takes about 30 days through the Suez Canal. When the Red Sea is unsafe, carriers sail around the Cape of Good Hope, adding 10 to 14 days and more fuel. Cargo Query's main cargo on this lane is textiles, frozen seafood, furniture, coffee and cashews. Most customers sell FOB: the European buyer books the ship, and we handle the inland leg and export formalities. Long-haul rates react to two things: the bunker surcharge (BAF) and general rate increases (GRI). The GRI of 15 July 2026 pushed buy rates up by about 40%, and that is a big clue in the year-end investigation.
> **Three numbers:** about 30 days at sea · FOB is the most common term · buy rates +40% from 15 July 2026.
> **What a DA on this lane gets asked:** "What is going to Europe, under which terms, and how much did the buy rate just go up?"
> *Illustrative, simplified figures.*

**Việc phụ R-1: Điều kiện giao hàng tuyến Rotterdam.** Mở khi tuyến Rotterdam mở (sau ch2).
`requires: [aggregate, group_by, order_by]` · `tables: [shipments]` · `ordered: true` · người gửi: Đặng Hà (Sales).

- **VI:** "Khách châu Âu hay hỏi mình nhận hàng theo điều kiện nào. Bạn thống kê giúp: các lô xuất khẩu đặt chỗ trong năm 2025 đi cảng Rotterdam, không tính lô đã hủy. Với mỗi điều kiện giao hàng, cho mình số lô và trọng lượng trung bình mỗi lô. Xếp điều kiện nhiều lô nhất lên đầu; bằng số lô thì xếp theo mã điều kiện A → Z."
- **EN:** "European customers keep asking which terms we ship on. Please count the export shipments booked in 2025 for the port of Rotterdam, leaving out cancelled ones. For each delivery term, give me the number of shipments and the average weight per shipment. Put the term with the most shipments first; on a tie, sort by the term's code A to Z."
- `columns:` Điều kiện giao hàng / Delivery term · Số lô / Shipments · Trọng lượng trung bình (kg) / Average weight (kg)

```sql
SELECT incoterm, count(*), avg(gross_weight_kg)
FROM shipments
WHERE pod = 'NLRTM' AND direction = 'EXPORT' AND status <> 'CANCELLED'
  AND booking_date >= '2025-01-01' AND booking_date < '2026-01-01'
GROUP BY incoterm
ORDER BY count(*) DESC, incoterm;
-- Đã chạy: 6 dòng, FOB 146 · FCA 94 · DAP 93 · CIF 92 · CFR 87 · EXW 85 (không hòa), ~3 ms.
```

**Việc phụ R-2: Ngành hàng đi châu Âu.** Mở sau ch3 (cần JOIN).
`requires: [join, group_by, limit]` · `tables: [shipments, customers]` · `ordered: true`.

- **VI:** "Cũng các lô đó (xuất khẩu, đặt chỗ năm 2025, đi Rotterdam, không tính lô hủy), cho mình ba ngành hàng của khách có nhiều lô nhất, kèm tổng trọng lượng. Nhiều lô xếp trước; bằng số lô thì theo tên ngành A → Z."
- **EN:** "Same shipments (exports booked in 2025 for Rotterdam, cancelled ones left out): give me the three customer industries with the most shipments, with their total weight. Most shipments first; on a tie, industry name A to Z."
- `columns:` Ngành / Industry · Số lô / Shipments · Tổng trọng lượng (kg) / Total weight (kg)

```sql
SELECT c.industry, count(*), sum(s.gross_weight_kg)
FROM shipments s
JOIN customers c ON c.id = s.customer_id
WHERE s.pod = 'NLRTM' AND s.direction = 'EXPORT' AND s.status <> 'CANCELLED'
  AND s.booking_date >= '2025-01-01' AND s.booking_date < '2026-01-01'
GROUP BY c.industry
ORDER BY count(*) DESC, c.industry
LIMIT 3;
-- Đã chạy: Textile 218 · Seafood 81 · Furniture 69 (không hòa ở ranh top 3).
```

**Việc phụ R-3: GRI tháng 7.** Mở sau ch7 (bảng `rate_contracts` mở ở ch7; đếm có điều kiện học ở ch5).
`requires: [conditional_agg, group_by]` · `tables: [rate_contracts]` · `ordered: true` · người gửi: pricing (Hoàng Dũng, Sales).

- **VI:** "Hãng tàu báo tăng giá chung giữa tháng 7. Với tuyến Cát Lái → Rotterdam, mỗi loại container cho mình giá mua có hiệu lực ngày 01/07/2026, giá có hiệu lực ngày 01/08/2026 và chênh lệch giữa hai giá (USD). Xếp theo mã loại container A → Z."
- **EN:** "The carriers announced a general rate increase in mid-July. For the Cat Lai to Rotterdam lane, give me, for each container type, the buy rate valid on 1 July 2026, the rate valid on 1 August 2026, and the difference (USD). Sort by container type code A to Z."
- `columns:` Loại container / Container type · Giá 01/07 (USD) / Rate on 1 Jul (USD) · Giá 01/08 (USD) / Rate on 1 Aug (USD) · Chênh lệch (USD) / Difference (USD)

```sql
SELECT container_type,
  max(buy_usd) FILTER (WHERE DATE '2026-07-01' BETWEEN valid_from AND valid_to),
  max(buy_usd) FILTER (WHERE DATE '2026-08-01' BETWEEN valid_from AND valid_to),
  max(buy_usd) FILTER (WHERE DATE '2026-08-01' BETWEEN valid_from AND valid_to)
    - max(buy_usd) FILTER (WHERE DATE '2026-07-01' BETWEEN valid_from AND valid_to)
FROM rate_contracts
WHERE pol = 'VNSGN' AND pod = 'NLRTM'
GROUP BY container_type
ORDER BY container_type;
-- Đã chạy: 20GP 1422 → 1968 (+546) · 40GP 2368 → 3339 (+971) · 40HC 2677 → 3610 (+933) · 40RF 3680 → 5191 (+1511).
```

⚠ **R-3 chạm vào câu chuyện ch12** (lỗ chính do giá tuyến châu Âu). R-3 chỉ cho thấy **giá mua tăng**, không cho thấy margin hay báo giá dưới giá vốn. Phần đó ch7-04 đã hé lộ, và ch12 vẫn còn việc để điều tra. Nếu user muốn giữ bất ngờ trọn vẹn, đổi mốc mở R-3 sang **sau ch12** (D-B7).

### 18. Ví dụ 2 (đầy đủ): Sydney: dữ liệu có sẵn + bảng mới (phương án B/C)

**Hồ sơ tuyến**

> **VI:** Tuyến Sydney chạy hai chiều với hai câu chuyện khác nhau. Chiều về: Úc là một trong những nước xuất khẩu lúa mì lớn của thế giới, và nhà máy bột mì, thức ăn chăn nuôi ở Việt Nam nhập lúa mì Úc, phần lớn bằng tàu rời, một phần đóng container. Chiều đi: đồ gỗ, hải sản, hàng tiêu dùng. Úc kiểm dịch sinh học rất chặt: pallet và bao bì gỗ phải được xử lý theo chuẩn ISPM 15, đồ gỗ dễ bị giữ lại kiểm tra. Đi biển mất khoảng 16 ngày, hàng ghé Singapore để đi Hải Phòng thì lâu hơn. Chặng càng dài thì nhiên liệu càng chiếm phần lớn chi phí, nên hãng tàu tính phụ phí nhiên liệu (BAF) theo giá dầu từng tháng.
> **Ba con số:** ~16 ngày đi biển · ~48 tấn nhiên liệu mỗi ngày cho tàu 4.200 TEU (minh họa) · BAF đổi theo tháng.
> **DA ở tuyến này hay được hỏi:** "Hãng nào hay trễ trên tuyến Úc, và mỗi TEU gánh bao nhiêu tiền dầu?"
> *Số liệu minh họa, đã đơn giản hóa.*

> **EN:** The Sydney lane runs both ways with two different stories. Inbound: Australia is one of the world's big wheat exporters, and Vietnamese flour and feed mills import Australian wheat, mostly by bulk carrier and partly in containers. Outbound: furniture, seafood and consumer goods. Australia's biosecurity is strict: wooden pallets and packaging must be treated to the ISPM 15 standard, and wooden furniture is often held for inspection. The sea leg takes about 16 days, longer for cargo that calls at Singapore on its way to Hai Phong. The longer the leg, the more fuel dominates the cost, so carriers charge a bunker surcharge (BAF) that follows the monthly fuel price.
> **Three numbers:** about 16 days at sea · about 48 tonnes of fuel a day for a 4,200 TEU ship (illustrative) · BAF changes every month.
> **What a DA on this lane gets asked:** "Which carrier runs late on the Australia lane, and how much fuel cost does each TEU carry?"
> *Illustrative, simplified figures.*

**Việc phụ S-1: Hãng nào trễ trên tuyến Úc.** Mở khi tuyến Sydney mở (sau ch5). Chỉ dùng dữ liệu có sẵn.
`requires: [join, date_math, conditional_agg, group_by]` · `tables: [shipments, carriers]` · `ordered: true` · người gửi: Võ Lan (Ops).

- **VI:** "Khách nhập hàng từ Sydney phàn nàn hàng về trễ. Với các lô nhập từ cảng Sydney đã cập cảng từ 01/01/2026 đến hết 31/10/2026, mỗi hãng tàu cho mình: số lô, số lô đến trễ hơn 2 ngày so với ngày đến dự kiến, và số ngày đi biển trung bình (từ ngày tàu chạy thực tế đến ngày đến thực tế). Hãng có nhiều lô trễ nhất xếp đầu; bằng nhau thì theo tên hãng A → Z."
- **EN:** "Customers importing from Sydney say their cargo arrives late. For shipments imported from the port of Sydney that arrived between 1 January 2026 and 31 October 2026, give me for each carrier: the number of shipments, how many arrived more than 2 days after their estimated arrival, and the average days at sea (actual departure to actual arrival). Carrier with the most late shipments first; on a tie, carrier name A to Z."
- `columns:` Hãng tàu / Carrier · Số lô / Shipments · Lô trễ > 2 ngày / Late by over 2 days · Ngày đi biển trung bình / Average days at sea

```sql
SELECT ca.name, count(*),
  count(*) FILTER (WHERE s.ata - s.eta > 2),
  avg(s.ata - s.atd)
FROM shipments s
JOIN carriers ca ON ca.id = s.carrier_id
WHERE s.pol = 'AUSYD' AND s.direction = 'IMPORT'
  AND s.ata >= '2026-01-01' AND s.ata < '2026-11-01'
GROUP BY ca.name
ORDER BY count(*) FILTER (WHERE s.ata - s.eta > 2) DESC, ca.name;
-- Đã chạy: 6 hãng; Pacific Bridge Shipping 29 lô / 7 trễ / 18,3 ngày đứng đầu; ba hãng hòa ở 3 lô trễ, xếp tiếp theo tên.
```

**Việc phụ S-2: Tiền dầu mỗi TEU.** Mở khi tuyến Sydney mở và đã học JOIN. **Cần phương án B** (`lane_profiles`, `bunker_prices`).
`requires: [join, order_by]` · `tables: [lane_profiles, bunker_prices]` · `ordered: true` · người gửi: Phạm Tâm (Finance).

- **VI:** "Mình cần ước tính tiền nhiên liệu cho chặng Sydney → Cát Lái trong quý 3/2026. Mỗi tháng 7, 8, 9 cho mình: tiền nhiên liệu cả chuyến (số ngày đi biển × tấn nhiên liệu mỗi ngày × giá nhiên liệu tháng đó) và phần chia cho mỗi TEU theo sức chở của tàu. Xếp theo tháng tăng dần."
- **EN:** "I need a fuel cost estimate for the Sydney to Cat Lai leg in Q3 2026. For each of July, August and September give me the fuel cost of the whole voyage (days at sea × tonnes of fuel per day × that month's fuel price) and the share per TEU of the ship's capacity. Sort by month, earliest first."
- `columns:` Tháng / Month · Tiền nhiên liệu cả chuyến (USD) / Voyage fuel cost (USD) · Tiền nhiên liệu mỗi TEU (USD) / Fuel cost per TEU (USD)

```sql
SELECT b.month,
  l.sea_days * l.fuel_t_per_day * b.usd_per_tonne,
  l.sea_days * l.fuel_t_per_day * b.usd_per_tonne / l.vessel_teu
FROM lane_profiles l
JOIN bunker_prices b ON b.month >= '2026-07-01' AND b.month < '2026-10-01'
WHERE l.pol = 'AUSYD' AND l.pod = 'VNSGN'
ORDER BY b.month;
-- Đã chạy trên bảng NGUYÊN MẪU (16 ngày × 48 t/ngày, giá ~560 USD/t, tàu 4.200 TEU): 3 dòng, ~440.000 USD/chuyến, ~105 USD/TEU.
-- Số thật phụ thuộc giá trị viết tay khi làm seed; mục tiêu ~80–150 USD/TEU để khớp cỡ BAF ngoài đời.
```

**Việc phụ S-3: Lúa mì về Việt Nam** (phác, **cần phương án C**, chưa chạy). Mở sau ch4 (gom theo tháng), khi tuyến Sydney mở.

- **VI (một dòng):** "Mỗi tháng năm 2026, bao nhiêu tấn lúa mì từ Úc về từng cảng Việt Nam, và cước trung bình mỗi tấn?"
- **EN:** "For each month of 2026, how many tonnes of Australian wheat arrived at each Vietnamese port, and what was the average freight per tonne?"
- SQL dự kiến: `SELECT date_trunc('month', arrive_date)::date, discharge_port, sum(tonnes), avg(freight_usd_per_t) FROM bulk_voyages WHERE commodity = 'WHEAT' AND load_port = 'AUSYD' AND arrive_date >= '2026-01-01' AND arrive_date < '2026-11-01' GROUP BY 1, 2 ORDER BY 1, 2;`
- Seed cần có **mùa vụ thật**: lúa mì Úc thu hoạch cuối năm, nên hàng về VN dồn từ tháng 1 đến tháng 5. Như vậy biểu đồ đường (Phần A, thẻ line) có hình dạng đáng xem.

### 19. Bản đồ: tooltip và khung thông tin

- **Rê chuột/focus vào chấm cảng** (≥ lg): tooltip một dòng "Rotterdam · Hà Lan · ~30 ngày · 2/3 việc tuyến".
  - Tooltip này **sửa L35** ("không số lô khi rê chuột"): hiện số việc tuyến, không hiện số lô (D-B6).
- **Bấm hoặc Enter vào chấm cảng:** mở khung "Hồ sơ tuyến", gồm:
  - hồ sơ,
  - 3 con số,
  - danh sách việc phụ: xong ✓ / mở / khóa kèm điều kiện,
  - "Số của bạn".

  Khung là `<dialog>` hoặc popover tại chỗ. Ở màn làm bài (mục 3 của L47), khung mở **đè lên** màn làm bài, không đổi route.
- **Dưới lg** (nhãn SVG đã ẩn, L34): danh sách tuyến bằng HTML (`routeItems`) thành các nút, mỗi nút mở cùng khung đó.
- **Chấm cảng là `<button>`/`role="button"` trong SVG, có `aria-label`.** Khung thông tin là HTML thường, đọc được bằng trình đọc màn hình. Cách này tốt hơn tooltip SVG.

### 20. Khối lượng nội dung

| Hạng mục | Số lượng | Ước tính |
|---|---|---|
| Hồ sơ tuyến | 7 tuyến × VI + EN × ~180 từ | ~2.500 từ; ~1 ngày viết + kiểm |
| Việc phụ | 7 tuyến × 2–3 = **15–20 việc** (≈ 3 chương mới tính theo ticket, nhưng không có boss hay nhịp) | ~3–4 ngày (viết, Solution, kiểm hòa, VI + EN) |
| Seed phương án B | 2 bảng, ~60 dòng viết tay | ~0,5 ngày + test md5 |
| Seed phương án C | +1 bảng ~150 dòng, `setseed()` | ~0,5–1 ngày |
| Code | `lane:`/`beat: side` trong parser, loại khỏi tiến trình chính, `LANE_TABLES`, khung hồ sơ trên bản đồ, nhóm Hộp thư | **M** (~2–3 ngày) |

Đề xuất làm theo lô: **L-P1** = Rotterdam + Sydney + Singapore (dùng dữ liệu cũ + phương án B), đo xem người chơi có mở việc phụ không. **L-P2** = bốn tuyến còn lại và phương án C nếu L-P1 có ích.

### 21. Rủi ro

| Rủi ro | Giảm thiểu |
|---|---|
| Sai kiến thức thực tế (Incoterms, kiểm dịch, BAF) | chỉ nêu điều chung, đã phổ biến; mọi số là minh họa, có nhãn; người review nghiệp vụ đọc trước khi merge |
| Việc phụ vô tình lộ đáp án ticket chính (vd R-3 với ch12) | rà mỗi việc phụ với Solution của chương sau; mở muộn khi cần (D-B7) |
| Vỡ tiến trình (việc phụ thành "việc tiếp theo", tính vào chương) | bảng loại trừ ở §14 + test: `nextTicket` không bao giờ trả về việc phụ; số done/total không đổi khi thêm việc phụ |
| Seed lệch md5 hoặc đổi kết quả Solution cũ | chỉ thêm bảng mới ở cuối, chạy lại toàn bộ Solution trong CI |
| Chủ đề nhạy cảm (cát) | dùng như bài tuân thủ, hoặc thay bằng clinker/đá vôi (D-B3) |
| Nội dung phình, làm chậm việc khác | chia lô L-P1/L-P2; L-P2 chỉ làm nếu L-P1 có ích |
| Tuyến mở muộn (ch5) nên ít người thấy Sydney | không đổi `opens`; hồ sơ tuyến khóa vẫn xem trước được 2 dòng để gây tò mò |

---

## Phần C. Quyết định cho user

**Mục 7: Bảng điều hành**

- **D-A1.** Duyệt tab riêng "Bảng điều hành" (`#/dashboard`), nav theo thứ tự **Trang chủ · Làm việc · Dữ liệu · Bảng điều hành**, Trang chủ chỉ còn dải teaser một dòng? (đề xuất: có)
- **D-A2.** Thẻ người chơi lưu trong **Save**, nâng **v2 → v3** kèm migration (đề xuất), hay lưu ở device prefs (không đi theo Xuất/Nhập, không cần nâng version)?
- **D-A3.** Mở dạng thẻ theo kỹ năng (table ch1, number và bar ch2, line ch4)? (đề xuất: có)
- **D-A4.** Giới hạn: 24 thẻ, SQL 4.000 ký tự, **từ chối ghim nếu query chạy quá 2 s**. Có đồng ý các con số này không?
- **D-A5.** Cho phép thẻ dùng bảng chưa mở khóa (Sandbox hiện đã cho chạy) và bảng CSV tự nhập? (đề xuất: cho cả hai, thẻ có nhãn)
- **D-A6.** Phạm vi MVP = P1 + P2. P3 (kéo thả, line) và P4 (PNG/CSV/JSON) làm sau. Có đồng ý thứ tự này không? P1 làm sau khi tab "Dữ liệu" (L47 mục 5) đã merge.
- **D-A7.** Bộ lọc ngày chung cho cả bảng ở P3: làm hay bỏ?

**Mục 8: Nội dung tuyến**

- **D-B1.** Duyệt khái niệm "Hồ sơ tuyến + 1–3 việc phụ tùy chọn mỗi tuyến", **không chặn cốt truyện chính**, 50 XP cố định, không tính vào chương hay thăng tiến? Việc này sửa một phần L35.
- **D-B2.** Dữ liệu: **A** (chỉ bảng có sẵn), **B** (+ `lane_profiles`, `bunker_prices`, đề xuất), hay **C** (+ `bulk_voyages` cho lúa mì và mùa vụ)?
- **D-B3.** Cát: dùng làm **bài tuân thủ** (khách hỏi xuất cát → tra ra là hàng hạn chế → từ chối), **thay bằng clinker/đá vôi**, hay bỏ? Lúa mì: giữ (cần phương án C), hay thay bằng một ngành sẵn có trong seed (gạo, cà phê)?
- **D-B4.** Bảng của tuyến mở theo tuyến (`LANE_TABLES`), không theo chương? Ticket chính không bao giờ dùng bảng tuyến.
- **D-B5.** Việc phụ có vào ngân hàng Luyện tập (Leitner) không? (đề xuất: không, ở bản đầu)
- **D-B6.** Tooltip trên bản đồ hiện "~30 ngày · 2/3 việc tuyến" (không có số lô). Có chấp nhận việc sửa L35 này không?
- **D-B7.** R-3 (GRI Rotterdam) mở sau ch7 (đề xuất), hay sau ch12 để giữ trọn bất ngờ của cuộc điều tra cuối năm?
- **D-B8.** Làm theo lô: L-P1 (Rotterdam, Sydney, Singapore) trước, L-P2 (Shanghai, Laem Chabang, Busan, Los Angeles) sau khi xem phản hồi? Có cần người review nghiệp vụ forwarder thật đọc hồ sơ tuyến không?
- **D-B9.** Có thêm tuyến mới cho ch6–12 không (vd Hamburg, Nhava Sheva, đường bộ qua Lào)? L35 đang chốt là **không**. Đề xuất giữ L35, làm sâu 7 tuyến trước.
