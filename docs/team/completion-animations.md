# Cargo Query: Hoạt cảnh khi xong việc (L29)

Người viết: Product Design + UI/UX · 2026-11-17 · Mockup: `.superpowers/brainstorm/11840-1794844744/content/completion-v5.html` (xây trên v4 đã duyệt).

User (L29): "Mỗi lần hoàn thành công việc animation có thể chất thêm container hoặc là map nếu công việc đó liên quan đưa tàu đi xuất…". Tài liệu này chốt: loại việc nào → hoạt cảnh nào, ticket khai báo ra sao, chạy ở đâu, bao lâu, khi giảm chuyển động thì sao, lưu thế nào, đọc màn hình nghe gì.

---

## 1. Nguyên tắc chung

1. **Mỗi việc xong = +1 container trên bãi Tiên Sa**, màu của chương. Đây là thước tiến độ chung, luôn có, với mọi loại việc. Hoạt cảnh riêng theo nghiệp vụ (tàu, hải quan, xe, báo giá…) là phần thêm phía trên.
2. **Hoạt cảnh kể kết quả nghiệp vụ**, không kể "bạn thắng". Câu báo nói việc gì đã xảy ra ngoài cảng: "tàu đã rời Tiên Sa đi Rotterdam", "tờ khai luồng xanh, xe đã qua cổng".
3. **≤ 3 giây, bỏ qua được, không chặn.** Người chơi bấm "Việc tiếp theo", chuyển tab hay gõ SQL ngay trong lúc hoạt cảnh chạy. Lớp hoạt cảnh có `pointer-events: none`, chỉ nút "Bỏ qua" nhận chuột. Esc cũng bỏ qua. Bỏ qua = nhảy ngay tới trạng thái cuối, câu báo vẫn đọc.
4. **Chỉ chạy lần đầu xong việc.** Làm lại, Luyện tập, Ôn (L10) không chạy hoạt cảnh và không thêm container (bãi đếm ticket khác nhau đã xong, không đếm lượt nộp).
5. **Không lưu gì mới.** Bãi, số chuyến trên tuyến, tuyến đã mở đều là hàm thuần của `completed` (danh sách id ticket đã xong) + frontmatter. Không thêm field vào Save, không tăng `SAVE_VERSION` (theo L20). Tải lại trang thì dựng lại y hệt.
6. **Không giọng game** (L22): không chữ "boss", "level up", "victory". Ticket cuối chương là "Đánh giá thăng tiến".
7. **Chữ trên card** ≥ 14px, màu trung tính tương phản cao; màu chỉ ở nhãn/dấu/badge nhỏ (L23).

## 2. Bảng ánh xạ loại việc → hoạt cảnh

| `kind` | Loại việc (nghiệp vụ) | Hoạt cảnh | Chạy ở đâu | Thời lượng (đúng hằng số trong mockup) | Để lại gì (sau khi tải lại) |
|---|---|---|---|---|---|
| `ship` | Xuất hàng, booking, lịch tàu, lô đang chạy | Tàu ở bến Tiên Sa nhổ neo ra khơi; trên bản đồ, tàu nhỏ chạy từ Tiên Sa theo tuyến tới cảng `to`, vệt tuyến sáng lên theo tàu | Dải bản đồ tuyến (Plan 1b Task 7) trong khu làm việc; cảnh cảng nếu đang hiện | 2,6 s (rời bến 1,6 s song song chạy tuyến 2,2 s; container rơi 0,4 s) | +1 container; nhãn số chuyến cạnh cảng đích (`Rotterdam · 3 chuyến`) |
| `yard` | Báo cáo sản lượng, TEU, thống kê, mọi việc đọc số (mặc định) | Cẩu bờ STS: xe con chạy ra tàu, hạ khung cẩu, nhấc container màu chương, chạy vào bãi, hạ xuống đúng ô của chương | Cảnh cảng | 2,8 s (hạ 0,4 · nhấc 0,4 · chạy 0,9 · hạ 0,5 · nhả và kéo lên 0,3 · xe con về chỗ 0,3) | +1 container |
| `customs` | Khai báo hải quan, tờ khai, phân luồng | Tờ khai hiện góc cảnh, dấu đóng xuống theo luồng: **xanh** (thông quan), **vàng** (kiểm hồ sơ), **đỏ** (kiểm hóa); xe container chạy tới cổng hải quan, chờ theo luồng, barie nâng, xe qua cổng | Cảnh cảng (cổng + đường nội bộ) | 2,4 s xanh · 2,8 s vàng · 3,0 s đỏ (đỏ: dừng 0,6 s với nhãn "Kiểm hóa") | +1 container |
| `truck` | Điều độ vận tải, giao nhận nội địa, kho CFS | Xe container chạy trên đường nội bộ qua cổng, cửa cuốn kho CFS mở, xe chạy vào kho, cửa đóng | Cảnh cảng | 2,7 s (tới cổng 0,7 · barie 0,3 · qua cổng + cửa mở 0,7 · vào kho 0,6 · cửa đóng 0,4) | +1 container |
| `quote` | Pricing, báo giá, so sánh cước | Thẻ báo giá (tuyến, loại cont, giá) lật mặt: mặt sau "Khách đã chấp nhận" | Lớp phủ trong khu làm việc (góc trên phải cảnh trong mockup) | 2,3 s (hiện 0,3 · chờ 0,5 · lật 0,6 · chờ 0,5 · mờ dần + container rơi 0,4) | +1 container |
| `ledger` | Kế toán, công nợ AR/AP, hóa đơn | Hóa đơn đóng dấu "Đã thu", 6 đồng xu bay vào sổ công nợ, số đếm tăng | Lớp phủ trong khu làm việc | 2,6 s (hiện 0,3 · dấu 0,4 · xu bay 1,0 · chờ 0,5 · mờ dần 0,4) | +1 container |
| `chat` | CSKH, khách hàng | Khung chat của khách: chấm "đang gõ" rồi bong bóng cảm ơn, kèm nhãn "Khách hài lòng" | Lớp phủ trong khu làm việc (nối tiếp hộp thư dạng chat của L18) | 2,4 s (hiện 0,3 · đang gõ 0,7 · bong bóng 0,4 · chờ 0,6 · mờ dần 0,4) | +1 container |
| `promotion` | Ticket cuối chương (`beat: boss`): Đánh giá thăng tiến | Container cuối của chương chốt đầy cột bãi; tàu rời bến và chạy trên bản đồ (tới `to` nếu có, không thì tuyến vừa mở); tuyến mới mở chuyển từ nét đứt sang nét liền; confetti CSS; thẻ thăng tiến "Junior DA → Data Analyst" | Thay cho animation mở màn Tổng kết chương của product-design-v2 #4 (không phải thêm một màn nữa) | 3,0 s (container 0,4 · rồi tàu + bản đồ 2,2 song song thẻ 0,4 · confetti 2,6 từ 0,4 s) | +1 container; tuyến mới mở; chức danh (từ `rankOf`) |

Tên chức danh trên thẻ thăng tiến chỉ minh họa; chữ thật lấy từ `rankOf` + i18n (L19, problem-design §1.6).

## 3. Ticket khai báo hoạt cảnh thế nào

### 3.1 Key tùy chọn `scene:` trong frontmatter

```yaml
scene: { kind: ship, to: NLRTM }      # tàu đi Rotterdam
scene: { kind: customs, lane: yellow } # tờ khai luồng vàng
scene: { kind: yard }                  # ép về cẩu + bãi
```

| Field | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `kind` | một trong `ship yard customs truck quote ledger chat` | có (nếu có `scene:`) | `promotion` **không** khai: suy ra từ `beat: boss` |
| `to` | mã cảng UN/LOCODE | chỉ với `ship`, và với ticket cột mốc muốn chọn tuyến | Phải là cảng `SEAPORT` có trong `ports` của seed (vd `NLRTM`, `CNSHA`, `SGSIN`, `KRPUS`, `THLCH`, `USLAX`, `AUSYD`, `DEHAM`). Seed **không có Bangkok**; v4 vẽ "Bangkok" thì đổi thành **Laem Chabang** (`THLCH`). |
| `lane` | `green` · `yellow` · `red` | không, mặc định `green` | chỉ với `customs` |

Parser đã bỏ qua key lạ, nên thêm `scene:` không làm hỏng ticket cũ. Luật test thêm vào `tests/content.test.ts`: `kind` hợp lệ; `to` có trong danh sách cảng của seed; `lane` chỉ đi với `customs`; `to` chỉ đi với `ship` hoặc ticket `beat: boss`.

### 3.2 Mặc định khi không khai (`sceneOf(ticket)`, hàm thuần, theo thứ tự)

1. `beat: boss` → `promotion` (lấy `scene.to` nếu có để chọn tuyến tàu chạy).
2. Có `scene:` → dùng nguyên.
3. `from.dept`:
   - `Customs` → `customs` (luồng xanh)
   - `Finance` → `ledger`
   - `CS` → `chat`
   - `Ops` và `tables` có `shipments` → `ship` **không có cảng đích**: tàu rời bến trong cảnh, bản đồ không chạy tuyến, câu báo không nêu cảng.
4. Còn lại (Sales, Management, Ops không có `shipments`) → `yard`.

Bảng chỉ có 6 bảng dữ liệu và 6 phòng ban, pricing nằm trong Sales, chứng từ và CFS nằm trong Ops (problem-design §1.7). Vì vậy **`quote`, `truck` và cảng đích không suy ra được**: ticket pricing, điều độ, kho CFS và mọi ticket muốn tàu chạy tới một cảng **phải khai `scene:`**. Khi có bảng mới (vd tờ khai, hóa đơn, báo giá ở ch5–8), thêm luật theo `tables` vào bước 3 sau.

### 3.3 Chạy luật lên 15 ticket hiện có

| Ticket | `dept` · bảng | Mặc định | Đề xuất khai `scene:` | Lý do |
|---|---|---|---|---|
| ch1-01 Danh sách cảng | Ops · ports | yard | — | |
| ch1-02 Cảng biển châu Âu | Ops · ports | yard | — | |
| ch1-03 Lô nặng nhất tháng 10 | Sales · shipments | yard | — | |
| ch1-04 Nhân sự phòng Hải quan | Customs · employees | customs | `{ kind: yard }` | Đề là danh sách nhân sự, đóng dấu tờ khai thì sai nghĩa |
| ch1-05 Lô hàng đi Rotterdam | Management · shipments, **boss** | promotion | `{ kind: ship, to: NLRTM }` | Tàu của màn thăng tiến chạy đúng tuyến Rotterdam |
| ch2-01 Tổng kết sản lượng 2025 | Finance · shipments | ledger | `{ kind: yard }` | Đề hỏi sản lượng, không có hóa đơn |
| ch2-02 Cơ cấu theo phương thức | Sales · shipments | yard | — | |
| ch2-03 Khách hàng chủ lực | Sales · shipments | yard | — | |
| ch2-04 Bao nhiêu lô đang trên đường | Ops · shipments | ship (không đích) | — | Tàu rời bến là đúng nghĩa "đang trên đường" |
| ch2-05 Báo cáo container và trọng lượng | Management, **boss** | promotion | — | |
| ch3-01 Booking mới nhất kèm tên khách | CS · shipments, customers | chat | — | Khách cảm ơn vì booking được xác nhận |
| ch3-02 TEU theo hãng tàu quý 3 | Sales · containers… | yard | — | |
| ch3-03 Khách lâu không gửi hàng | CS · customers, shipments | chat | — | Khách cũ nhắn lại |
| ch3-04 Danh mục khách của từng sales | Sales · employees, customers | yard | — | |
| ch3-05 Khách hàng lớn nhất 2025 | Management, **boss** | promotion | — | |

Ba dòng `scene:` đề xuất (ch1-04, ch1-05, ch2-01) **chưa sửa vào content**; làm cùng commit cài `sceneOf` khi được duyệt.

## 4. Chạy ở đâu, khi nào

- Ticket được nộp đúng **trong khu làm việc**, nên hoạt cảnh chạy **ở khu làm việc ngay khi nộp đúng**:
  - `ship`: trên dải bản đồ tuyến (Plan 1b Task 7). Cảnh cảng không hiện ở khu làm việc thì chỉ chạy phần bản đồ.
  - `yard`, `customs`, `truck`: một **dải cảnh cảng thu nhỏ** (cao 140px, cùng SVG với Trang chủ, cắt khung quanh bãi/cổng) trượt ra phía trên tab kết quả, chạy xong thì thu lại vào card "Đã gửi".
  - `quote`, `ledger`, `chat`: **card phủ** ở góc trên phải vùng kết quả, rộng ≤ 300px, không che editor.
  - `promotion`: mở màn Tổng kết chương. Thay animation 1,5 s "tàu chất container rồi rời bến + confetti" của product-design-v2 #4 bằng `promotion` 3,0 s. Một ticket cuối chương chỉ có **một** màn ăn mừng.
- **Trang chủ không phát lại hoạt cảnh.** Nó vẽ trạng thái đã tính lại; container mới nhất có viền sáng và nhãn nhỏ "Mới" tới khi người chơi rời Trang chủ (so `completed` hiện tại với lần mở Trang chủ trước, chỉ giữ trong bộ nhớ phiên).
- Hoạt cảnh mới bắt đầu khi hoạt cảnh cũ chưa xong: cái cũ nhảy tới trạng thái cuối, cái mới chạy. Không xếp hàng.

## 4b. Quy cách cảnh của domain (ui-ux-v7 I1, L148)

- **Khung:** cảnh Tổng quan tràn khung như Tiên Sa (viewBox 1100×400, không thanh tiêu đề, không chú thích dưới). Tên nơi là pill trên trái; trạng thái (việc xong, chương đã qua, câu luật "mỗi việc xong là…") là pill dưới trái từ `lg`; dưới `lg` các dòng đó là HTML dưới hình. Pill là HTML phủ lên (`ui/homeView.ts` harborSection), không phải chữ SVG.
- **Điện thoại:** dưới 640 px cảnh cắt giữa (`preserveAspectRatio="xMidYMid slice"`, cao 190 px; vùng an toàn ~x 160–940). Chỉ bản Tổng quan (`hero()` trong `ui/domainArt.ts`); dock tự cắt viewBox của nó.
- **Chiều sâu / ánh sáng / ngày đêm:** ba lớp xa–giữa–gần, nắng trên trái, mặt sáng/tối bằng alpha; theme tối là đêm của chính cảnh.
- **Màu nhận diện:** Logistics teal biển, E-com đỏ đèn lồng, Finance vàng đồng (token `--dom-*`, huy hiệu `domainBadge()`).
- **Vật chính phải nổi:** vật đếm tiến độ (kiện hàng, hũ xu) có nền tối hoặc viền đủ tương phản để không chìm vào trời sáng (Hũ Bạc: tủ trưng bày tối).
- Không vẽ người trong cảnh; Lily chỉ ở dock.

## 5. Giảm chuyển động

- Bật khi `prefers-reduced-motion: reduce` **hoặc** người chơi bật "Giảm chuyển động" trong Cài đặt (công tắc mặc định theo hệ điều hành). Công tắc cũng **tắt hoạt cảnh nền** của cảnh cảng (sóng, khói, đèn hải đăng).
- Khi bật: không có chuyển động, chỉ có **thay đổi trạng thái tĩnh + câu chữ**:
  - container mới hiện ngay ở ô của nó, có viền sáng;
  - `ship`: nhãn số chuyến tăng, tuyến tô liền, tàu ở bến giữ nguyên;
  - `customs`/`quote`/`ledger`/`chat`: card hiện ngay ở mặt cuối (dấu luồng đã đóng, mặt "Đã chấp nhận", "Đã thu", bong bóng cảm ơn), không lật, không bay xu; card ở lại tới lần nộp sau hoặc khi đóng;
  - `promotion`: thẻ thăng tiến hiện tĩnh, không confetti; tuyến mới hiện liền nét.
- Câu báo (§6) giống hệt hai chế độ.

## 6. Trợ năng

- Một vùng `<p aria-live="polite">` **có sẵn và rỗng lúc tải trang**; câu báo được ghi vào ngay lúc nộp đúng (không đợi hoạt cảnh xong), nên người bỏ qua hoặc giảm chuyển động vẫn nghe. Không dời focus.
- Câu báo hiện cả bằng chữ (dòng trạng thái dưới cảnh), không chỉ cho trình đọc màn hình.
- SVG cảnh có `role="img"` + `aria-label` mô tả trạng thái **đã tính lại** ("Bãi Tiên Sa: chương 1 đủ 5 container, chương 3 có 2…"); các phần tử chuyển động có `aria-hidden="true"`.
- Nút "Bỏ qua" có nhãn chữ, nhận Tab, Esc tương đương.
- Màu luồng hải quan không là tín hiệu duy nhất: dấu có chữ "LUỒNG XANH / VÀNG / ĐỎ".

Mẫu câu (i18n, `{...}` lấy từ ticket hoặc `scene`):

| `kind` | VI | EN |
|---|---|---|
| ship (có `to`) | Việc "{title}" xong: một tàu đã rời Tiên Sa đi {port}. | "{title}" done: a vessel has left Tien Sa for {port}. |
| ship (không `to`) | Việc "{title}" xong: một tàu đã rời Tiên Sa. | "{title}" done: a vessel has left Tien Sa. |
| yard | Việc "{title}" xong: thêm 1 container chương {n} vào bãi Tiên Sa ({k}/5). | "{title}" done: 1 more chapter {n} container in the Tien Sa yard ({k}/5). |
| customs | Việc "{title}" xong: tờ khai được phân luồng {lane}, xe đã qua cổng hải quan. | "{title}" done: declaration cleared on the {lane} lane, the truck is through the customs gate. |
| truck | Việc "{title}" xong: xe đã giao hàng vào kho CFS. | "{title}" done: the truck has delivered into the CFS warehouse. |
| quote | Việc "{title}" xong: khách đã chấp nhận báo giá. | "{title}" done: the customer accepted the quote. |
| ledger | Việc "{title}" xong: hóa đơn đã thu, sổ công nợ đã cập nhật. | "{title}" done: invoice paid, the ledger is updated. |
| chat | Việc "{title}" xong: khách gửi lời cảm ơn. | "{title}" done: the customer sent a thank-you. |
| promotion | Đạt đánh giá thăng tiến: bạn là {rank}. Mở tuyến {port}. | Promotion review passed: you are now {rank}. New route: {port}. |

Mockup dùng mã lô/tờ khai/hóa đơn bịa (CQ2610-0412, 105938471, INV-2611-087) để dễ hình dung. Bản thật dùng `{title}` như trên, không lấy số từ kết quả query (grader so theo vị trí, dữ liệu dòng đầu không chắc có nghĩa).

## 7. Lưu trữ: tính lại từ `completed`

```
derive(completed, tickets) -> {
  bays[ch]   = số ticket của chương ch nằm trong completed          // bãi
  trips[port] = số ticket ship có to + số ticket cột mốc (tới to, không có to thì tới tuyến vừa mở)
  routesOpen = tuyến mở theo số chương đã qua (rankOf / boss đã xong)
}
```

- **Bãi chứa 60+ container**: mỗi chương một **cột xếp (bay)** cao tối đa 5 tầng (5 ticket/chương), màu chương. 12 bay chia hai dãy: chương 1–6 dãy trước, 7–12 dãy sau (lệch lên, nhỏ hơn). Chương có > 5 ticket thì tầng thứ 6 trở đi gộp thành nhãn "+n" trên đỉnh bay.
- Card phủ (`quote`, `ledger`, `chat`) không để lại gì ngoài container. `ship` không có `to` không cộng chuyến cho cảng nào.
- **`to` trỏ vào tuyến chưa mở**: tàu vẫn chạy theo nét đứt và cộng chuyến, nhưng tuyến vẫn nét đứt và khóa; chỉ thăng tiến mới mở tuyến. Ở màn thăng tiến, `{port}` trong câu báo luôn là **tuyến vừa mở**; nếu ticket có `to` khác thì tàu chạy tới `to`, câu báo thêm "Tàu đã rời Tiên Sa đi {to}.". Ví dụ ch1-05: tàu đi Rotterdam, câu báo nêu tuyến mà chương 1 mở.
- Màn hẹp (< 640px): dải bản đồ và cảnh thu như product-design-v2 ★2; hoạt cảnh giữ nguyên thời lượng.

## 8. Cài đặt (phác)

- `src/scene.ts`: `sceneOf(ticket)` + `derive(completed, tickets)`, hàm thuần, test bảng §3.3 và §7.
- `src/ui/harbor.ts` (Plan 1d) vẽ cảnh từ `derive`; thêm `playCompletion(kind, opts)` dùng một bộ tween `requestAnimationFrame` (mỗi bước có hàm vẽ trạng thái `f(t)`, Bỏ qua = gọi `f(1)` cho mọi bước). Không thư viện animation.
- Gọi từ chỗ nộp đúng lần đầu (cùng chỗ cộng XP), không gọi ở Luyện tập/Làm lại.

## 9. Câu hỏi mở cho user

1. **Màu chương 8–12**: L17 mới chốt 7 màu (sky, violet, amber, rose, emerald, indigo, fuchsia) cho 12 chương. Mockup tạm dùng teal, orange, lime, cyan, slate. Chốt trong `curriculum.md`, không thêm key vào `chapters.yml` trước khi duyệt.
2. **Tuyến mở theo chương**: mockup mở Thượng Hải + Laem Chabang từ đầu, rồi Singapore, Rotterdam, Busan, Los Angeles, Sydney sau mỗi lần thăng tiến. Cần khớp với chương trình 12 chương.
3. Đồng ý thay animation mở màn Tổng kết chương (v2 #4, 1,5 s) bằng `promotion` 3,0 s?
4. Ba dòng `scene:` đề xuất ở §3.3.
5. **Câu báo**: mockup dùng số lô/tờ khai/hóa đơn bịa cho dễ hình dung; bản thật theo mẫu `{title}` ở §6. Duyệt v5 là duyệt hoạt cảnh và mẫu §6, không phải câu chữ trong mockup. Nếu muốn có số thật thì cần thêm field `scene.ref` (chuỗi cố định trong ticket).
6. Mockup mở Rotterdam sau 2 lần thăng tiến nên ch1-05 chạy trên tuyến còn khóa. Nếu muốn tuyến Rotterdam mở ngay khi xong chương 1 thì đổi thứ tự mở tuyến (câu 2).
