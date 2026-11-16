# Cargo Query: Thiết kế đề bài (Problem Design)

Ngày: 2026-11-17 · Vai trò: Product Designer (nội dung và đề bài) · Theo quyết định **L24** (và L18, L19, L22 trong `decision-log.md`).
Phạm vi: nguyên tắc viết đề, định dạng nhãn `columns:` (L25, đảo L9), đề viết lại cho 15 ticket ch1–3 (VI + EN), ngân hàng câu hỏi cho ch4–7.
Tài liệu này **chưa sửa** `content/`, `src/` hay test. Người triển khai dán phần §3 vào ticket và làm các thay đổi code ở §2.3 trong cùng một commit.

---

## 0. Vấn đề

User nhận xét: đề kiểu *"Liệt kê `customer_id` và số lô của những khách có hơn 150 lô"* là vô nghĩa nếu mục tiêu là luyện tư duy logic và thiết kế bài toán. Đề hiện tại đã đọc sẵn hộ người chơi:

- tên cột (`customer_id`, `gross_weight_kg`, `etd`),
- giá trị mã hóa (`IN_TRANSIT`, `CANCELLED`, `SEAPORT`),
- đôi khi cả từ khóa SQL ("sắp xếp theo `eta` rồi `ref`").

Người chơi chỉ còn việc chép từ đề sang editor. Việc thật của một Data Analyst gồm ba bước:

1. hiểu người hỏi cần gì và để làm gì,
2. dịch câu hỏi nghiệp vụ sang dữ liệu (bảng nào, lọc gì, gom theo gì, trả cột nào),
3. viết SQL.

Đề hiện tại bỏ qua bước 1 và 2. Bản viết lại dưới đây trả hai bước đó về cho người chơi. Gợi ý (hints) là chỗ đỡ khi họ kẹt.

---

## 1. Nguyên tắc

### 1.1 Một đề = một người thật, một câu hỏi nghiệp vụ, một mục đích

| Thành phần | Quy tắc | Ví dụ |
|---|---|---|
| **Người hỏi** | Một đồng nghiệp có **vai trò nghiệp vụ thật** của forwarder (L18), hỏi đúng mảng dữ liệu của mình. | Trưởng phòng Hải quan hỏi về nhân sự khai báo, không hỏi về hãng tàu. |
| **Câu hỏi** | Câu người không biết SQL vẫn hiểu được. Hỏi về **sự vật nghiệp vụ** (lô hàng, khách, container, tờ khai), không hỏi về bảng hay cột. | "Khách nào gửi hơn 150 lô trong năm 2025?" |
| **Mục đích** ("để làm gì") | Một mệnh đề nói kết quả sẽ được dùng vào việc gì. Mục đích giúp người chơi tự kiểm tra kết quả ("con số này có hợp lý cho buổi họp không?") và giải thích ràng buộc. | "…để mời dự hội nghị khách hàng cuối năm." |
| **Ràng buộc** | Nói bằng ngôn ngữ nghiệp vụ, **đủ chặt để chỉ một đáp án đúng**: khoảng thời gian, có tính lô hủy không, mốc ngày có tính hay không, cách phá hòa. | "Tính cả lô bị hủy, vì đó vẫn là nhu cầu thật của khách." |
| **Đầu ra** | Liệt kê **thông tin cần trả về theo đúng thứ tự**, bằng nghĩa nghiệp vụ. | "mã khách hàng và số lô năm 2025" |

### 1.2 Người chơi tự quyết; đề không đọc hộ

Phần **thân đề, `## Task` và đề từng bước** (`## Step N`) **không chứa**:

- tên bảng, tên cột hay định danh kiểu `snake_case` (`customer_id`, `total_teu`),
- từ khóa SQL (`WHERE`, `GROUP BY`, `HAVING`, `JOIN`, `LIMIT`, `ORDER BY`…) hay tên hàm (`COUNT`, `SUM`, `AVG`),
- giá trị mã hóa nội bộ của hệ thống: trạng thái (`IN_TRANSIT`, `CANCELLED`), loại (`SEAPORT`), chiều/phương thức (`EXPORT`, `SEA`), tên phòng ban như được lưu (`'Customs'`),
- code span (dấu backtick). Prose không có backtick nào, nên luật "code span VI = EN" luôn đúng ở phần đề.

Phần đề **được dùng** từ vựng nghề mà người làm forwarder nói hằng ngày, viết như chữ thường (không backtick):

- mã cảng UN/LOCODE (Rotterdam, mã NLRTM),
- loại container (20GP, 40HC),
- viết tắt ngành: ETD, ETA, TEU, CBM, B/L, HBL/MBL, CFS, D&D, FOB.

Người thật sẽ nói "đi Rotterdam" hay "cont 40HC". Họ không bao giờ nói "`status = 'IN_TRANSIT'`".

**Chỗ được nhắc tên cột và SQL:** hints bậc 2–3 và câu hỏi kết luận (`conclusion`) của ticket cột mốc. Câu kết luận là phần ôn lại kỹ năng sau khi đã làm xong, không phải đề.

### 1.3 Ràng buộc phải đủ để chấm đúng

Grader so kết quả với Solution, nên mọi điều kiện trong Solution phải suy ra được từ đề:

- **Khoảng thời gian** ghi rõ mốc đầu và mốc cuối, kèm việc có tính ngày mốc hay không: "trước ngày 15/11/2026 (không tính ngày 15)", "từ 01/03/2026 đến nay". "Hôm nay" trong game là 31/10/2026.
- **Lô hủy:** mỗi đề có tính tổng hay đếm đều nói rõ một trong hai, kèm lý do nghiệp vụ:
  - "không tính lô đã hủy" (vì lô hủy không phát sinh doanh thu hay sản lượng thật), hoặc
  - "tính cả lô hủy" (vì đó vẫn là nhu cầu đặt chỗ của khách).

  Đề không lọc gì thì nói **"tính mọi lô"** hoặc **"toàn bộ container"**. Không để người chơi đoán.
- **Phá hòa** (ticket `ordered: true`) là một **quy tắc nghiệp vụ** đầy đủ: "nặng bằng nhau thì lô có mã nhỏ hơn đứng trước", "bằng TEU thì xếp theo tên khách theo thứ tự chữ cái". Không viết "theo `ref` tăng dần".
- **Tập bao gồm** cũng phải rõ: "kể cả khách chưa từng booking", "nhân viên không phụ trách khách nào thì bỏ qua".
- **Phân biệt khái niệm dễ nhầm** bằng lời nghiệp vụ. Ví dụ: "sales quản lý khách (người đứng tên trong hồ sơ khách hàng), không phải sales làm từng lô". Lô hàng cũng có một cột sales riêng.
- **Làm tròn và đơn vị:** "kg, làm tròn 2 chữ số thập phân".

### 1.4 Thẻ "Kết quả mong đợi"

- Mô tả từng cột đầu ra **theo thứ tự**, bằng **nghĩa nghiệp vụ**, có nhãn VI và EN: "Mã lô / Shipment ref", "Tổng trọng lượng (kg) / Gross weight (kg)".
- Thẻ hiện **số dòng** (do `shape.ts` tính từ Solution lúc chạy) và kiểu cột (số / chữ / ngày).
- Nhãn **không bao giờ** là tên cột của Solution hay một định danh SQL. Nếu là tên cột thì thẻ đã đọc đáp án hộ người chơi.
- Thẻ ghi thêm một dòng: tên cột bạn đặt không quan trọng, máy chấm so theo **vị trí** cột.

### 1.5 Gợi ý: ba bậc, từ nghiệp vụ tới SQL

| Bậc | Nội dung | Được nhắc |
|---|---|---|
| 1 | **Nghiệp vụ → dữ liệu.** Thông tin cần nằm ở "danh mục" nào, câu hỏi thuộc dạng gì (đếm, xếp hạng, tìm thứ *không có*), điều kiện áp lên từng lô hay lên con số sau khi gom. | Không tên cột, tối đa một từ khóa SQL khi cần đặt tên kỹ thuật vừa học. |
| 2 | **Bảng và cột cụ thể**, giá trị mã hóa (`'IN_TRANSIT'`), mệnh đề cần dùng. | Tên bảng, cột, giá trị, mệnh đề. |
| 3 | **Khung SQL** có chỗ trống `...`. | Toàn bộ khung. |

### 1.6 Ticket cuối chương = cột mốc nghề nghiệp (L22)

- Trên UI không dùng giọng game "boss" hay "sự cố". Ticket `beat: boss` được trình bày như **buổi đánh giá cuối thử việc**, **dự án lớn đầu tiên ở vị trí mới** hoặc **đánh giá thăng tiến**, do Giám đốc giao.
- Thân đề nói rõ đây là cột mốc gì. Màn qua chương (i18n) báo rõ **thăng chức** hay **bước nghề nghiệp mới**.
- Đề ticket **không ghi tên bậc** (Junior DA, Data Analyst…). Tên bậc do `rankOf` và i18n hiển thị, nên đổi thang nghề không phải sửa đề. Lý do: có một chỗ lệch chưa chốt (xem §5.1).
- Từ `boss` chỉ còn trong code và frontmatter.

### 1.7 Dàn nhân vật (L18): vai trò của 6 người đang gửi ticket

Không đổi `from:` của ticket nào. Sáu người này đều có trong bảng `employees` của seed, đều là Director hoặc Manager. Đây là vai trò nghiệp vụ dùng khi viết đề, và là đầu vào cho `content/people.yml` (Plan 1d).

| Người | `dept` | Vai trò nghiệp vụ | Hỏi về |
|---|---|---|---|
| Trần An | Management | Giám đốc | Cột mốc cuối chương; khách lớn, hãng tàu, margin |
| Hoàng Khánh | Ops | Trưởng phòng Ops: điều độ vận tải và kho CFS, người kèm DA mới | Cảng, lô đang chạy, giao ban |
| Lê Bình | Sales | Trưởng phòng Sales, kiêm pricing đến khi có người pricing riêng | Sản lượng, khách chủ lực, đàm phán cước |
| Hoàng Ngọc | Customs | Trưởng phòng Hải quan (khai báo, luồng xanh/vàng/đỏ) | Nhân sự khai báo, tờ khai |
| Nguyễn Quang | Finance | Kế toán trưởng: công nợ phải thu/phải trả (AR/AP), báo cáo năm | Số liệu tài chính, hóa đơn |
| Võ Thu | CS | Trưởng phòng CSKH | Booking mới, khách bỏ đi |

Ch4–7 cần thêm các vai trò **chứng từ / booking & vận đơn**, **khai báo viên hải quan**, **điều độ vận tải / kho CFS**, **pricing**, **kế toán AR** và **kế toán AP** ở cấp nhân viên. Ngân hàng câu hỏi (§4) chỉ ghi vai trò. Người viết `people.yml` chọn tên từ các nhân viên `Staff` thật trong `employees` của seed (chạy query, không đoán tay) và giữ `dept` thuộc 6 phòng đang có (chứng từ thuộc Ops, pricing thuộc Sales).

### 1.8 Danh sách kiểm trước khi gửi một đề

- [ ] Người không biết SQL đọc thân đề + Task có hiểu ai cần gì, để làm gì không?
- [ ] Thân đề, Task, đề bước: không backtick, không tên cột hay `snake_case`, không từ khóa SQL, không mã trạng thái.
- [ ] Mọi điều kiện của Solution (thời gian, lô hủy, tập bao gồm, làm tròn, phá hòa) đều nói ra được bằng lời nghiệp vụ.
- [ ] Danh sách đầu ra theo đúng thứ tự cột của Solution; nhãn `columns:` cùng số cột, có `vi` và `en`, không trùng tên cột Solution.
- [ ] Hints đúng 3 bậc (§1.5); code span VI và EN giống hệt; EN không có dấu tiếng Việt (kể cả tên người: EN không nhắc tên người).

---

## 2. Định dạng nhãn `columns:` (quyết định L25, đảo L9)

### 2.1 Quyết định

Mỗi nhãn là **một đối tượng `{ vi, en }`**. Ticket thường có một danh sách; ticket cột mốc có một danh sách cho mỗi bước (như hiện tại):

```yaml
# ticket thường
columns:
  - { vi: "Mã lô", en: "Shipment ref" }
  - { vi: "Tổng trọng lượng (kg)", en: "Gross weight (kg)" }

# ticket cột mốc (một danh sách cho mỗi bước)
columns:
  - [{ vi: "Mã lô", en: "Shipment ref" }, { vi: "Ngày đi dự kiến (ETD)", en: "Estimated departure (ETD)" }]
  - [ ... ]
```

Nhãn chuỗi trơn (`columns: [ref, eta]`) **bị từ chối** sau khi chuyển đổi.

### 2.2 Lý do

- L9 giữ nhãn trung tính ngôn ngữ vì coi nhãn là "tên cột SQL người chơi phải gõ ra". Điều đó sai: grader so theo **vị trí**, không theo tên. Nhãn kiểu `shipment_count` hay `customer_id` vừa đọc hộ đáp án, vừa trái L24 (cột mô tả bằng nghĩa nghiệp vụ).
- Nghĩa nghiệp vụ thì cần hai ngôn ngữ ("Số lô" / "Shipments").
- Chọn `{vi, en}` thay cho `columns_en:` song song: mỗi cặp nhãn nằm cạnh nhau nên không lệch thứ tự hay số lượng giữa hai danh sách, và giữ được luật "SQL/frontmatter một bản, chữ hai ngôn ngữ cạnh nhau".

### 2.3 Việc triển khai (một commit cùng lúc dán đề §3)

Parser hiện từ chối nhãn không phải chuỗi, nên parser và 15 ticket phải đổi cùng lúc.

1. **`src/tickets.ts`**
   - Thêm `type Label = { vi: string; en: string }`; `columns?: Label[]`.
   - Hàm kiểm `columns` nhận mảng (ticket thường) hoặc mảng các mảng (cột mốc) gồm đối tượng có `vi`, `en` là chuỗi khác rỗng. Lỗi: `columns: mỗi nhãn là { vi, en }`.
   - `templateNames` lấy cả `l.vi` và `l.en`.
2. **Thẻ "Kết quả mong đợi"** (`src/ui/brief.ts`, nơi render shape card): hiện `label[lang]`. Thêm khóa i18n VI/EN cho dòng "Tên cột bạn đặt không quan trọng: máy chấm so theo vị trí cột" (`tsc` bắt thiếu EN).
3. **`tests/content.test.ts`**
   - Giữ test số nhãn = số cột Solution.
   - Thêm: `en` không có dấu tiếng Việt.
   - Thêm: nhãn không khớp `^[a-z0-9_]+$` và không trùng tên cột nào của kết quả Solution (`r.columns`).
   - Thêm: thân đề, Task và đề bước (VI và EN) **không chứa backtick** (§1.2). Câu kết luận và hints không bị kiểm.
4. **`tests/tickets.test.ts`** (hoặc file test parser hiện có): nhãn chuỗi trơn bị từ chối; nhãn thiếu `en` bị từ chối.
5. **`content/TEMPLATE.md`**: ví dụ `columns` dạng `{vi, en}`; câu "Task: nêu tên cột cần trả về, ví dụ `code`" đổi thành "Task: câu hỏi nghiệp vụ + mục đích + ràng buộc + thông tin cần trả về theo thứ tự, không tên cột (xem `docs/team/problem-design.md`)".
6. **Tài liệu**: câu "`columns:` (one language-neutral list…)" trong `CLAUDE.md`, mục `columns:` trong spec §3 "Định dạng ticket" và `ui-ux.md` §5 (dòng "Cần user quyết") đổi theo L25. Theo luật của workflow, `docs/team/*` do orchestrator commit.
7. **Kiểm sau khi dán**: `npx tsc --noEmit`, `npx vitest run`, `npx vite build`. Solution, `ordered`, `tables`, `requires/grants`, số bước và `conclusion.answer` không đổi, nên `grader`/`contentProblems` không bị ảnh hưởng.

---

## 3. Đề viết lại cho 15 ticket ch1–3

**Cách dán:**

- Mỗi ticket chỉ thay `title`, `title_en`, `columns` trong frontmatter, phần chữ VI (thân đề, `## Task` hoặc đề từng `## Step N: …`, `## Hints`) và khối `# EN`.
- **Giữ nguyên:** `id`, `chapter`, `from`, `difficulty`, `beat`, `requires`, `grants`, `tables`, `ordered`, `starter`, `conclusion`/`conclusion_en`, mọi khối ```sql (Solution và SQL từng bước).
- Ở ticket cột mốc, mỗi `## Step N` giữ đúng khối ```sql cũ ngay dưới đề bước mới. Chỗ đó được đánh dấu `(giữ khối sql cũ)`.

### ch1-01 · Hoàng Khánh (Trưởng phòng Ops, người kèm cặp) · teach

```yaml
title: Danh mục cảng công ty khai thác
title_en: Ports we work with
columns:
  - { vi: "Mã cảng", en: "Port code" }
  - { vi: "Tên cảng", en: "Port name" }
  - { vi: "Quốc gia", en: "Country" }
```

```markdown
Chào bạn, chào mừng đến Cargo Query Logistics! Mình là trưởng phòng Ops, tuần này mình kèm bạn.

Phòng đang soạn sổ tay cho nhân viên mới. Sổ tay có một trang tra cứu mọi cảng biển và sân bay công ty khai thác, để ai đọc booking hay vận đơn cũng hiểu mã cảng là cảng nào.

## Task
Gửi mình danh mục mọi cảng biển và sân bay trong hệ thống. Với mỗi cảng mình cần ba thông tin, theo thứ tự: mã cảng, tên cảng, quốc gia. Không cần sắp xếp.

## Hints
1. Mã, tên và quốc gia đều là thông tin của chính cảng, nên chúng nằm cùng một danh mục cảng. Mở tab Cột ở panel bên dưới để tìm bảng chứa cảng.
2. Bảng `ports` có các cột `code`, `name`, `country`. Editor có sẵn `SELECT * FROM ports`, trong đó `*` lấy mọi cột; ở đây bạn chỉ cần 3 cột, cách nhau bằng dấu phẩy.
3. `SELECT ..., ..., ... FROM ports`

# EN
Hi, and welcome to Cargo Query Logistics! I run Ops, and I am your mentor this week.

We are writing a handbook for new staff. It has a lookup page with every seaport and airport the company works with, so anyone reading a booking or a bill of lading knows which port a code stands for.

## Task
Send me the list of every seaport and airport in the system. For each one I need three things, in this order: port code, port name, country. Any order of rows is fine.

## Hints
1. The code, name and country all describe the port itself, so they sit together in one port list. Open the Columns tab in the bottom panel to find the table that holds the ports.
2. The `ports` table has the columns `code`, `name` and `country`. The editor already holds `SELECT * FROM ports`, where `*` takes every column; here you only need 3 columns, separated by commas.
3. `SELECT ..., ..., ... FROM ports`
```

### ch1-02 · Hoàng Khánh · develop

```yaml
title: Cảng biển châu Âu cho buổi họp tuyến
title_en: European seaports for the lane meeting
columns:
  - { vi: "Mã cảng", en: "Port code" }
  - { vi: "Tên cảng", en: "Port name" }
  - { vi: "Quốc gia", en: "Country" }
```

```markdown
Tuần sau Ops họp với các đại lý về tuyến châu Âu. Mình muốn in sẵn danh sách cảng biển châu Âu mình đang khai thác, để chốt cảng nào đã có đại lý nhận hàng.

## Task
Gửi mình các cảng biển thuộc khu vực châu Âu: mã cảng, tên cảng, quốc gia. Chỉ lấy cảng biển, bỏ sân bay, vì hàng air đi qua một mạng đại lý khác. Không cần sắp xếp.

## Hints
1. Có hai điều kiện phải đúng cùng lúc: cảng ở khu vực châu Âu, và cảng là cảng biển. Danh mục cảng đã ghi sẵn khu vực và loại của từng cảng.
2. Trong bảng `ports`, khu vực ở cột `region` (giá trị `'Europe'`), loại cảng ở cột `kind` (`'SEAPORT'` hoặc `'AIRPORT'`). Nối hai điều kiện bằng `AND`; giá trị chữ đặt trong nháy đơn.
3. `SELECT code, name, country FROM ports WHERE region = ... AND kind = ...`

# EN
Next week Ops meets our agents about the European lanes. I want a printed list of the European seaports we work with, so we can confirm which ports already have a receiving agent.

## Task
Send me the seaports in the Europe region: port code, port name, country. Seaports only, no airports, because air cargo goes through a different agent network. Any order of rows is fine.

## Hints
1. Two conditions must hold at the same time: the port is in the Europe region, and it is a seaport. The port list already records the region and the kind of each port.
2. In the `ports` table the region is in the `region` column (value `'Europe'`) and the kind of port is in the `kind` column (`'SEAPORT'` or `'AIRPORT'`). Join the two conditions with `AND`; text values go in single quotes.
3. `SELECT code, name, country FROM ports WHERE region = ... AND kind = ...`
```

### ch1-03 · Lê Bình (Trưởng phòng Sales) · twist · `ordered: true`

```yaml
title: Năng lực hàng nặng tháng 10
title_en: Heavy cargo in October
columns:
  - { vi: "Mã lô", en: "Shipment ref" }
  - { vi: "Tổng trọng lượng (kg)", en: "Gross weight (kg)" }
```

```markdown
Một nhà máy thép đang cân nhắc chuyển hàng sang mình. Họ hỏi mình đã từng nhận những lô nặng cỡ nào, và mình muốn trả lời bằng chính các lô gần đây.

## Task
Gửi mình 10 lô hàng xuất khẩu đi đường biển nặng nhất, trong số các lô booking trong tháng 10/2026: mã lô và tổng trọng lượng (kg). Tính mọi booking trong tháng, kể cả lô sau đó bị hủy, vì khách chỉ hỏi mình đã nhận booking cỡ nào. Lô nặng nhất lên đầu; hai lô nặng bằng nhau thì lô có mã nhỏ hơn đứng trước.

## Hints
1. Có ba điều kiện lọc: hàng xuất, đi đường biển, ngày booking trong tháng 10/2026. Sau đó xếp theo trọng lượng giảm dần, phá hòa bằng mã lô, rồi chỉ giữ 10 dòng đầu.
2. Bảng `shipments`: chiều hàng ở `direction` (`'EXPORT'`), phương thức ở `mode` (`'SEA'`), ngày booking ở `booking_date`, trọng lượng ở `gross_weight_kg`, mã lô ở `ref`. Tháng 10: `booking_date >= '2026-10-01' AND booking_date < '2026-11-01'`. Giảm dần dùng `DESC`.
3. `SELECT ref, gross_weight_kg FROM shipments WHERE ... ORDER BY gross_weight_kg DESC, ref LIMIT 10`

# EN
A steel plant is thinking about moving its cargo to us. They asked how heavy the shipments we have handled are, and I want to answer with our own recent shipments.

## Task
Send me the 10 heaviest export shipments by sea among those booked in October 2026: shipment ref and gross weight (kg). Count every booking of the month, including ones cancelled later, because the customer only asks what size of booking we take on. Heaviest first; if two weigh the same, the one with the smaller ref comes first.

## Hints
1. There are three filters: exports, by sea, booking date in October 2026. Then sort by weight from heaviest to lightest, break ties by shipment ref, and keep only the first 10 rows.
2. Table `shipments`: the direction is in `direction` (`'EXPORT'`), the mode in `mode` (`'SEA'`), the booking date in `booking_date`, the weight in `gross_weight_kg`, the shipment ref in `ref`. October: `booking_date >= '2026-10-01' AND booking_date < '2026-11-01'`. Descending order uses `DESC`.
3. `SELECT ref, gross_weight_kg FROM shipments WHERE ... ORDER BY gross_weight_kg DESC, ref LIMIT 10`
```

### ch1-04 · Hoàng Ngọc (Trưởng phòng Hải quan) · rest

```yaml
title: Xếp ca khai báo mùa cao điểm
title_en: Peak-season declaration roster
columns:
  - { vi: "Họ tên", en: "Full name" }
  - { vi: "Chức danh", en: "Job title" }
```

```markdown
Cuối năm số tờ khai tăng gấp đôi, mình phải xếp ca cho đội khai báo. Mình cần biết trong phòng có ai, chức danh gì, để chia người ký duyệt và người khai báo cho hợp lý.

## Task
Gửi mình danh sách mọi nhân viên phòng Hải quan: họ tên và chức danh. Không cần sắp xếp.

## Hints
1. Đây là thông tin nhân sự, không phải lô hàng: cần danh sách nhân viên, chỉ giữ người thuộc phòng Hải quan.
2. Bảng `employees` có `full_name`, `title`, và phòng ban ở cột `dept`; phòng Hải quan được lưu là `'Customs'`.
3. `SELECT full_name, title FROM employees WHERE dept = ...`

# EN
At year end the number of customs declarations doubles, and I have to plan shifts for the declaration team. I need to know who is in the team and their job titles, so I can split the work between the people who approve and the people who file.

## Task
Send me every member of the Customs team: full name and job title. Any order of rows is fine.

## Hints
1. This is staff data, not shipment data: you need the staff list, keeping only the people in the Customs team.
2. The `employees` table has `full_name`, `title`, and the department in the `dept` column; the Customs team is stored as `'Customs'`.
3. `SELECT full_name, title FROM employees WHERE dept = ...`
```

### ch1-05 · Trần An (Giám đốc) · cột mốc: đánh giá cuối thử việc · `ordered: true`

```yaml
title: "Đánh giá cuối thử việc: lô hàng đi Rotterdam"
title_en: "End-of-probation review: shipments to Rotterdam"
columns:
  - [{ vi: "Mã lô", en: "Shipment ref" }, { vi: "Ngày đi dự kiến (ETD)", en: "Estimated departure (ETD)" }, { vi: "Ngày đến dự kiến (ETA)", en: "Estimated arrival (ETA)" }]
  - [{ vi: "Mã lô", en: "Shipment ref" }, { vi: "Ngày đi dự kiến (ETD)", en: "Estimated departure (ETD)" }, { vi: "Ngày đến dự kiến (ETA)", en: "Estimated arrival (ETA)" }]
  - [{ vi: "Mã lô", en: "Shipment ref" }, { vi: "Ngày đi dự kiến (ETD)", en: "Estimated departure (ETD)" }, { vi: "Ngày đến dự kiến (ETA)", en: "Estimated arrival (ETA)" }]
```

`conclusion` giữ nguyên.

```markdown
Hôm nay là buổi đánh giá cuối thử việc của bạn, và mình giao một việc thật. Sáng mai mình họp với một khách lớn ở châu Âu; họ sẽ hỏi tiến độ các lô đang trên biển tới cảng Rotterdam (mã cảng NLRTM). Làm xong ba bước dưới đây là bạn chính thức qua thử việc.

## Step 1: Các lô đang trên đường
Những lô nào đang trên biển tới Rotterdam? Với mỗi lô: mã lô, ngày đi dự kiến (ETD), ngày đến dự kiến (ETA). Lô đến sớm hơn đứng trước; cùng ngày đến thì lô có mã nhỏ hơn đứng trước.
(giữ khối sql cũ)

## Step 2: Lô sắp cập cảng
Khách cần đặt xe kéo container cho các lô cập cảng trước ngày 15/11/2026 (không tính ngày 15). Từ danh sách ở bước 1, chỉ giữ các lô đó; cùng thông tin, cùng thứ tự.
(giữ khối sql cũ)

## Step 3: Ba lô cập cảng sớm nhất
Khách muốn làm thủ tục nhận hàng trước cho ba lô đến sớm nhất trong danh sách ở bước 1. Cùng thông tin, cùng thứ tự.
(giữ khối sql cũ)

## Hints
1. "Đang trên biển" là một trạng thái đã ghi sẵn của lô, còn Rotterdam là cảng đích của lô. Bước 2 thêm một mốc ngày đến; bước 3 chỉ giữ vài dòng đầu sau khi đã xếp.
2. Bảng `shipments`: cảng đích ở `pod` (`'NLRTM'`), trạng thái ở `status` (`'IN_TRANSIT'`), ngày đi và đến dự kiến ở `etd` và `eta`. Bước 2 thêm `eta < '2026-11-15'`; bước 3 thêm `LIMIT 3`.
3. `SELECT ref, etd, eta FROM shipments WHERE pod = ... AND status = ... ORDER BY eta, ref`

# EN
Today is your end-of-probation review, and I am giving you a real job. Tomorrow morning I meet a major European customer, who will ask how their shipments at sea to the port of Rotterdam (port code NLRTM) are doing. Finish the three steps below and you have passed your probation.

## Step 1: Shipments in transit
Which shipments are at sea on their way to Rotterdam? For each one: shipment ref, estimated departure (ETD), estimated arrival (ETA). Earlier arrivals first; on the same arrival date, the smaller ref comes first.

## Step 2: Arriving soon
The customer needs to book container trucks for the shipments that arrive before 15 November 2026 (the 15th itself does not count). From the step 1 list, keep only those shipments, with the same information in the same order.

## Step 3: The three earliest arrivals
The customer wants to start the release paperwork for the three earliest arrivals in the step 1 list. Same information, same order.

## Hints
1. "At sea" is a status already recorded on each shipment, and Rotterdam is the shipment's destination port. Step 2 adds an arrival cut-off date; step 3 keeps only the first few rows after sorting.
2. Table `shipments`: the destination port is in `pod` (`'NLRTM'`), the status in `status` (`'IN_TRANSIT'`), the estimated departure and arrival in `etd` and `eta`. Step 2 adds `eta < '2026-11-15'`; step 3 adds `LIMIT 3`.
3. `SELECT ref, etd, eta FROM shipments WHERE pod = ... AND status = ... ORDER BY eta, ref`
```

### ch2-01 · Nguyễn Quang (Kế toán trưởng, AR/AP) · teach

```yaml
title: Số liệu hoạt động cho báo cáo năm 2025
title_en: Activity figures for the 2025 annual report
columns:
  - { vi: "Số lô", en: "Shipments" }
  - { vi: "Tổng trọng lượng (kg)", en: "Total weight (kg)" }
  - { vi: "Trọng lượng trung bình mỗi lô (kg)", en: "Average weight per shipment (kg)" }
```

```markdown
Mình đang chốt báo cáo năm 2025 gửi ngân hàng để gia hạn hạn mức tín dụng. Ngân hàng muốn thấy quy mô hoạt động thật của công ty trong năm.

## Task
Cho mình ba con số của năm 2025: số lô, tổng trọng lượng (kg) và trọng lượng trung bình mỗi lô (kg, làm tròn 2 chữ số thập phân). Chỉ tính các lô booking trong năm 2025 và bỏ các lô đã hủy, vì lô hủy không phải hoạt động thật. Kết quả là một dòng duy nhất.

## Hints
1. Cả ba con số đều gom nhiều lô thành một giá trị: một phép đếm, một phép cộng và một phép tính trung bình, làm trên tập lô đã lọc theo năm 2025 và đã bỏ lô hủy.
2. Bảng `shipments`: ngày booking ở `booking_date`, trạng thái ở `status` (lô hủy là `'CANCELLED'`), trọng lượng ở `gross_weight_kg`. Hàm gộp: `COUNT(*)` đếm, `SUM(x)` cộng, `AVG(x)` tính trung bình, `ROUND(x, 2)` làm tròn. Máy chấm so số sau khi làm tròn 2 chữ số, nên thiếu `ROUND` vẫn được tính đúng.
3. `SELECT COUNT(*), SUM(gross_weight_kg), ROUND(AVG(gross_weight_kg), 2) FROM shipments WHERE booking_date >= '2025-01-01' AND booking_date < '2026-01-01' AND ...`

# EN
I am closing the 2025 annual report for our bank, to renew our credit line. The bank wants to see how much real business the company did during the year.

## Task
Give me three figures for 2025: the number of shipments, the total weight (kg) and the average weight per shipment (kg, rounded to 2 decimal places). Count only shipments booked in 2025 and leave out cancelled ones, because a cancelled shipment is not real business. The answer is a single row.

## Hints
1. All three figures turn many shipments into one value: a count, a sum and an average, computed over the shipments of 2025 with the cancelled ones removed.
2. Table `shipments`: the booking date is in `booking_date`, the status in `status` (cancelled is `'CANCELLED'`), the weight in `gross_weight_kg`. Aggregates: `COUNT(*)` counts, `SUM(x)` adds up, `AVG(x)` averages, `ROUND(x, 2)` rounds. The grader compares numbers after rounding them to 2 decimals, so an answer without `ROUND` still counts as correct.
3. `SELECT COUNT(*), SUM(gross_weight_kg), ROUND(AVG(gross_weight_kg), 2) FROM shipments WHERE booking_date >= '2025-01-01' AND booking_date < '2026-01-01' AND ...`
```

### ch2-02 · Lê Bình · develop

```yaml
title: Cơ cấu sản lượng 2025
title_en: 2025 volume mix
columns:
  - { vi: "Phương thức vận chuyển", en: "Transport mode" }
  - { vi: "Chiều hàng (xuất/nhập)", en: "Direction (export/import)" }
  - { vi: "Số lô", en: "Shipments" }
```

```markdown
Mình đang làm kế hoạch bán hàng 2026, và cần biết năm 2025 công ty sống nhờ mảng nào: hàng biển hay hàng air, hàng xuất hay hàng nhập. Mảng nào mỏng thì năm sau đẩy mạnh.

## Task
Với các lô booking trong năm 2025, không tính lô đã hủy: mỗi tổ hợp phương thức vận chuyển (biển hoặc air) và chiều hàng (xuất hoặc nhập) có bao nhiêu lô? Mỗi tổ hợp một dòng, gồm phương thức, chiều hàng, số lô. Không cần sắp xếp.

## Hints
1. Đây vẫn là phép đếm, nhưng đếm riêng cho từng nhóm lô có cùng phương thức và cùng chiều hàng, nên kết quả có nhiều dòng chứ không chỉ một con số.
2. Bảng `shipments`: phương thức ở `mode`, chiều hàng ở `direction`. `GROUP BY mode, direction` gom các lô có cùng cặp giá trị; `COUNT(*)` đếm trong từng nhóm. Điều kiện năm và lô hủy giống ticket trước.
3. `SELECT mode, direction, COUNT(*) FROM shipments WHERE ... GROUP BY mode, direction`

# EN
I am writing the 2026 sales plan, and I need to know what carried us in 2025: sea or air, exports or imports. Whatever is thin gets a push next year.

## Task
For shipments booked in 2025, leaving out cancelled ones: how many shipments does each combination of transport mode (sea or air) and direction (export or import) have? One row per combination, with the mode, the direction and the number of shipments. Any order of rows is fine.

## Hints
1. This is still a count, but a separate count for each group of shipments with the same mode and the same direction, so the answer has several rows instead of one number.
2. Table `shipments`: the mode is in `mode`, the direction in `direction`. `GROUP BY mode, direction` puts shipments with the same pair of values together; `COUNT(*)` counts inside each group. The year and cancellation conditions are the same as in the previous ticket.
3. `SELECT mode, direction, COUNT(*) FROM shipments WHERE ... GROUP BY mode, direction`
```

### ch2-03 · Lê Bình · twist

```yaml
title: Khách hàng chủ lực 2025
title_en: Key accounts of 2025
columns:
  - { vi: "Mã khách hàng", en: "Customer code" }
  - { vi: "Số lô năm 2025", en: "Shipments in 2025" }
```

```markdown
Ban giám đốc sắp mời các khách chủ lực dự hội nghị khách hàng cuối năm. Tiêu chí là khách đã đặt hơn 150 lô trong năm 2025. Tính cả lô bị hủy: đó vẫn là nhu cầu thật của khách, và team booking vẫn mất công xử lý.

## Task
Gửi mình mã khách hàng và số lô năm 2025 của từng khách đạt tiêu chí (hơn 150 lô, không tính khách đúng 150 lô). Tên khách thì CSKH sẽ tra sau, lúc này mã khách là đủ. Không cần sắp xếp.

## Hints
1. Bạn cần đếm số lô của từng khách trong năm 2025, rồi chỉ giữ khách có kết quả đếm lớn hơn 150. Điều kiện "hơn 150" áp lên con số sau khi đếm, không áp lên từng lô.
2. Bảng `shipments`, gom theo `customer_id`. `WHERE` lọc từng lô trước khi gom; điều kiện trên kết quả đếm đặt ở `HAVING COUNT(*) > 150`, sau `GROUP BY`.
3. `SELECT customer_id, COUNT(*) FROM shipments WHERE ... GROUP BY customer_id HAVING ...`

# EN
The board is about to invite our key accounts to the year-end customer conference. The rule is: customers who booked more than 150 shipments in 2025. Cancelled shipments count too: they are still real demand from the customer, and the booking team still had to handle them.

## Task
Send me the customer code and the number of 2025 shipments of every customer who meets the rule (more than 150 shipments; exactly 150 does not qualify). Customer service will look up the names later, so the customer code is enough for now. Any order of rows is fine.

## Hints
1. You need to count each customer's shipments in 2025, then keep only the customers whose count is above 150. The "above 150" condition applies to the number after counting, not to single shipments.
2. Table `shipments`, grouped by `customer_id`. `WHERE` filters single shipments before grouping; a condition on the count goes in `HAVING COUNT(*) > 150`, after `GROUP BY`.
3. `SELECT customer_id, COUNT(*) FROM shipments WHERE ... GROUP BY customer_id HAVING ...`
```

### ch2-04 · Hoàng Khánh · rest

```yaml
title: Số lô đang trên đường
title_en: Shipments on the way
columns:
  - { vi: "Số lô đang trên đường", en: "Shipments in transit" }
```

```markdown
Sáng nào Ops cũng giao ban bằng một con số: hiện có bao nhiêu lô đang trên đường. Con số đó cho biết đội theo dõi lô hôm nay có quá tải không. Mình cần ngay cho buổi giao ban.

## Task
Hiện có tổng cộng bao nhiêu lô đang trên đường? Tính mọi lô đang ở trạng thái này, không giới hạn thời gian, phương thức hay tuyến. Kết quả là một con số.

## Hints
1. Đây là một phép đếm trên tập lô có trạng thái "đang trên đường". Trạng thái của từng lô đã được ghi sẵn, không cần tự suy từ ngày đi hay ngày đến.
2. Bảng `shipments`, cột `status`, giá trị `'IN_TRANSIT'`; đếm bằng `COUNT(*)`.
3. `SELECT COUNT(*) FROM shipments WHERE status = ...`

# EN
Every morning Ops opens its stand-up with one number: how many shipments are on the way right now. It tells us whether the tracking team is overloaded today. I need it now for the stand-up.

## Task
How many shipments are on the way right now, in total? Count every shipment in that status, with no limit on dates, mode or lane. The answer is a single number.

## Hints
1. This is a count over the shipments whose status is "on the way". Each shipment's status is already recorded, so there is no need to work it out from departure or arrival dates.
2. Table `shipments`, column `status`, value `'IN_TRANSIT'`; count with `COUNT(*)`.
3. `SELECT COUNT(*) FROM shipments WHERE status = ...`
```

### ch2-05 · Trần An · cột mốc: dự án lớn đầu tiên ở vị trí mới

```yaml
title: "Dự án đầu tiên ở vị trí mới: hồ sơ họp hãng tàu"
title_en: "First project in your new role: the carrier meeting pack"
columns:
  - [{ vi: "Loại container", en: "Container type" }, { vi: "Số container", en: "Containers" }, { vi: "Tổng TEU", en: "Total TEU" }]
  - [{ vi: "Phương thức vận chuyển", en: "Transport mode" }, { vi: "Trọng lượng trung bình mỗi lô (kg)", en: "Average weight per shipment (kg)" }]
  - [{ vi: "Loại container", en: "Container type" }, { vi: "Tổng TEU", en: "Total TEU" }]
```

`conclusion` giữ nguyên.

```markdown
Bạn đã qua thử việc. Đây là dự án lớn đầu tiên của bạn ở vị trí mới. Tuần sau mình đàm phán hợp đồng năm với các hãng tàu, và cần một bộ số liệu cho thấy mình mạnh ở đâu. Ba câu dưới đây đúng hết thì bộ hồ sơ đủ để mình mang vào phòng họp.

## Step 1: Container theo loại
Hãng tàu tính giá theo loại container. Với mỗi loại container: có bao nhiêu container và tổng cộng bao nhiêu TEU. Tính toàn bộ container trong hệ thống, không lọc theo thời gian hay trạng thái lô.
(giữ khối sql cũ)

## Step 2: Trọng lượng trung bình theo phương thức
Với mỗi phương thức vận chuyển: trọng lượng trung bình mỗi lô (kg, làm tròn 2 chữ số thập phân), chỉ tính các lô booking năm 2025 và không bị hủy.
(giữ khối sql cũ)

## Step 3: Loại container chủ lực
Mình chỉ đưa lên bàn đàm phán những loại container mình chạy nhiều. Từ kết quả bước 1, giữ các loại có tổng TEU trên 10.000 (đúng 10.000 thì không tính): loại container và tổng TEU.
(giữ khối sql cũ)

## Hints
1. Bước 1 và 3 nói về container, bước 2 nói về lô hàng: đó là hai tập dữ liệu khác nhau. Bước 3 lọc theo một tổng đã tính cho cả nhóm, không lọc từng container.
2. Container nằm ở bảng `containers` (`container_type`, `teu`); trọng lượng lô ở `shipments.gross_weight_kg`, phương thức ở `mode`. Trung bình dùng `AVG` và `ROUND(..., 2)`. Điều kiện trên tổng sau khi gom đặt ở `HAVING`, không phải `WHERE`.
3. `SELECT container_type, COUNT(*), SUM(teu) FROM containers GROUP BY container_type`

# EN
You passed your probation. This is your first big project in your new role. Next week I negotiate the annual contracts with the carriers, and I need a set of figures that shows where we are strong. Get the three questions below right and the pack is ready for the meeting room.

## Step 1: Containers by type
Carriers price by container type. For each container type: how many containers and how many TEU in total. Count every container in the system, with no filter on dates or shipment status.

## Step 2: Average weight by mode
For each transport mode: the average weight per shipment (kg, rounded to 2 decimal places), counting only shipments booked in 2025 that were not cancelled.

## Step 3: Main container types
I only bring the container types we move a lot to the table. From the step 1 result, keep the types with more than 10,000 TEU in total (exactly 10,000 does not count): container type and total TEU.

## Hints
1. Steps 1 and 3 are about containers, step 2 is about shipments: two different sets of data. Step 3 filters on a total computed for each group, not on single containers.
2. Containers are in the `containers` table (`container_type`, `teu`); the shipment weight is in `shipments.gross_weight_kg` and the mode in `mode`. Averages use `AVG` and `ROUND(..., 2)`. A condition on a total after grouping goes in `HAVING`, not `WHERE`.
3. `SELECT container_type, COUNT(*), SUM(teu) FROM containers GROUP BY container_type`
```

### ch3-01 · Võ Thu (Trưởng phòng CSKH) · teach · `ordered: true`

```yaml
title: Booking mới nhất cần gọi xác nhận
title_en: Latest bookings to confirm by phone
columns:
  - { vi: "Mã lô", en: "Shipment ref" }
  - { vi: "Ngày booking", en: "Booking date" }
  - { vi: "Tên khách hàng", en: "Customer name" }
```

```markdown
CSKH có quy định: mọi booking mới phải được gọi xác nhận với khách trong ngày. Bạn trực ca cần biết booking nào vừa vào và của khách nào, để gọi đúng người.

## Task
Gửi mình 10 booking mới nhất: mã lô, ngày booking, tên khách hàng. Tính mọi lô, kể cả lô đã hủy, vì lô hủy cũng phải gọi xác nhận. Ngày booking mới nhất lên đầu; cùng ngày thì lô có mã lớn hơn đứng trước.

## Hints
1. Mã lô và ngày booking là thông tin của lô hàng, còn tên khách là thông tin của khách hàng. Đây là hai danh mục khác nhau, nên cần ghép mỗi lô với đúng khách của nó.
2. Lô ở `shipments`, khách ở `customers`; `shipments.customer_id` trỏ tới `customers.id`. Ghép bằng `JOIN customers c ON c.id = s.customer_id`.
3. `SELECT s.ref, s.booking_date, c.name FROM shipments s JOIN customers c ON ... ORDER BY s.booking_date DESC, s.ref DESC LIMIT 10`

# EN
Customer service has a rule: every new booking gets a confirmation call to the customer on the same day. Whoever is on shift needs to know which bookings just came in and for which customer, so they call the right person.

## Task
Send me the 10 latest bookings: shipment ref, booking date, customer name. Count every shipment, including cancelled ones, because those need a confirmation call too. Newest booking date first; on the same date, the larger ref comes first.

## Hints
1. The shipment ref and the booking date describe the shipment, while the name describes the customer. They live in two different lists, so each shipment has to be matched with its own customer.
2. Shipments are in `shipments`, customers in `customers`; `shipments.customer_id` points to `customers.id`. Match them with `JOIN customers c ON c.id = s.customer_id`.
3. `SELECT s.ref, s.booking_date, c.name FROM shipments s JOIN customers c ON ... ORDER BY s.booking_date DESC, s.ref DESC LIMIT 10`
```

### ch3-02 · Lê Bình · develop

```yaml
title: Sản lượng TEU theo hãng tàu quý 3
title_en: Q3 TEU by carrier
columns:
  - { vi: "Hãng tàu", en: "Carrier" }
  - { vi: "Tổng TEU", en: "Total TEU" }
```

```markdown
Sắp đàm phán giá cước năm sau. Hãng nào nhận nhiều TEU của mình thì mình có thế mặc cả, nên mình cần sản lượng thật đã đi với từng hãng.

## Task
Tính tổng TEU mình đã đặt với từng hãng tàu, gọi hãng bằng tên, cho các lô có ngày đi dự kiến (ETD) trong quý 3/2026 (từ 01/07 đến hết 30/09/2026), không tính lô đã hủy. Mỗi hãng một dòng: tên hãng, tổng TEU. Không cần sắp xếp.

## Hints
1. Ba thông tin nằm ở ba chỗ: TEU thuộc từng container, ngày đi và trạng thái thuộc lô hàng, tên hãng thuộc danh mục hãng tàu. Cần đi từ container lên lô, rồi từ lô lên hãng.
2. `containers.shipment_id` trỏ tới `shipments.id`; `shipments.carrier_id` trỏ tới `carriers.id`. Quý 3: `etd >= '2026-07-01' AND etd < '2026-10-01'`; lô hủy có `status = 'CANCELLED'`.
3. `SELECT ca.name, SUM(ct.teu) FROM containers ct JOIN shipments s ON ... JOIN carriers ca ON ... WHERE ... GROUP BY ca.name`

# EN
We are about to negotiate next year's freight rates. A carrier that gets a lot of our TEU gives us leverage, so I need the real volume we moved with each carrier.

## Task
Work out the total TEU we booked with each carrier, named by carrier name, for shipments with an estimated departure (ETD) in Q3 2026 (1 July to 30 September 2026 inclusive), leaving out cancelled ones. One row per carrier: carrier name, total TEU. Any order of rows is fine.

## Hints
1. The three pieces live in three places: TEU belongs to each container, the departure date and status belong to the shipment, the name belongs to the carrier list. Go from container up to shipment, then from shipment up to carrier.
2. `containers.shipment_id` points to `shipments.id`; `shipments.carrier_id` points to `carriers.id`. Q3: `etd >= '2026-07-01' AND etd < '2026-10-01'`; cancelled shipments have `status = 'CANCELLED'`.
3. `SELECT ca.name, SUM(ct.teu) FROM containers ct JOIN shipments s ON ... JOIN carriers ca ON ... WHERE ... GROUP BY ca.name`
```

### ch3-03 · Võ Thu · twist

Giữ tiêu đề cũ: câu kết luận của ch3-05 trích tên ticket này.

```yaml
title: Khách lâu không gửi hàng
title_en: Customers who went quiet
columns:
  - { vi: "Mã khách hàng", en: "Customer code" }
  - { vi: "Tên khách hàng", en: "Customer name" }
```

```markdown
Có những khách cả mùa hè không gửi lô nào. CSKH muốn gọi hỏi thăm trước khi họ chuyển hẳn sang forwarder khác.

## Task
Gửi mình danh sách khách hàng không có booking nào từ ngày 01/03/2026 đến nay: mã khách và tên khách. Tính cả khách chưa từng booking lô nào. Không cần sắp xếp.

## Hints
1. Đây là câu hỏi về thứ *không có*: bắt đầu từ danh sách khách hàng, rồi tìm khách không ghép được với lô nào từ 01/03/2026. Một phép ghép thông thường sẽ làm mất đúng những khách bạn cần tìm.
2. `customers` ghép với `shipments` qua `shipments.customer_id`. `LEFT JOIN` giữ mọi khách; đặt điều kiện ngày `s.booking_date >= '2026-03-01'` vào `ON`, rồi giữ các dòng không ghép được: `WHERE s.id IS NULL`.
3. `SELECT c.id, c.name FROM customers c LEFT JOIN shipments s ON s.customer_id = c.id AND ... WHERE s.id IS NULL`

# EN
Some customers have not sent a single shipment all summer. Customer service wants to call them before they move to another forwarder for good.

## Task
Send me the customers with no booking at all from 1 March 2026 until today: customer code and customer name. Include customers who have never booked anything. Any order of rows is fine.

## Hints
1. This is a question about something that is *missing*: start from the customer list, then find the customers that match no shipment from 1 March 2026 on. A plain match would drop exactly the customers you are looking for.
2. `customers` matches `shipments` through `shipments.customer_id`. `LEFT JOIN` keeps every customer; put the date condition `s.booking_date >= '2026-03-01'` in the `ON`, then keep the rows that found no match: `WHERE s.id IS NULL`.
3. `SELECT c.id, c.name FROM customers c LEFT JOIN shipments s ON s.customer_id = c.id AND ... WHERE s.id IS NULL`
```

### ch3-04 · Lê Bình · rest

```yaml
title: Danh mục khách của từng sales
title_en: Customer portfolio per sales rep
columns:
  - { vi: "Nhân viên quản lý khách", en: "Account owner" }
  - { vi: "Số khách hàng", en: "Customers" }
```

```markdown
Đầu năm mình chia lại khách cho team Sales: ai đang ôm quá nhiều khách thì chuyển bớt cho người ít hơn.

## Task
Mỗi nhân viên đang quản lý ít nhất một khách hàng thì quản lý bao nhiêu khách? Người quản lý là người đứng tên trong hồ sơ khách hàng. Gửi mình họ tên nhân viên và số khách; nhân viên không quản lý khách nào thì bỏ qua. Không cần sắp xếp.

## Hints
1. Mỗi khách có đúng một người quản lý ghi trong hồ sơ khách. Ghép từng khách với nhân viên đó, rồi đếm số khách của mỗi nhân viên.
2. `customers.sales_rep_id` trỏ tới `employees.id`; họ tên ở `employees.full_name`. Gom theo `GROUP BY e.id, e.full_name` để hai người trùng tên không bị gộp làm một.
3. `SELECT e.full_name, COUNT(c.id) FROM employees e JOIN customers c ON ... GROUP BY e.id, e.full_name`

# EN
At the start of the year I rebalance the customers across the Sales team: whoever holds too many hands some over to someone with fewer.

## Task
For each employee who owns at least one customer account, how many customers do they own? The owner is the person named on the customer record. Send me the employee's full name and the number of customers; leave out employees who own no customer. Any order of rows is fine.

## Hints
1. Each customer has exactly one owner, recorded on the customer record. Match each customer with that employee, then count the customers of each employee.
2. `customers.sales_rep_id` points to `employees.id`; the full name is in `employees.full_name`. Group with `GROUP BY e.id, e.full_name` so two people with the same name are not merged.
3. `SELECT e.full_name, COUNT(c.id) FROM employees e JOIN customers c ON ... GROUP BY e.id, e.full_name`
```

### ch3-05 · Trần An · cột mốc: đánh giá thăng tiến · `ordered: true`

```yaml
title: "Đánh giá thăng tiến: chuẩn bị gặp khách lớn cuối năm"
title_en: "Promotion review: year-end key account meetings"
columns:
  - [{ vi: "Tên khách hàng", en: "Customer name" }, { vi: "Tổng TEU 2025", en: "Total TEU 2025" }]
  - [{ vi: "Tên khách hàng", en: "Customer name" }, { vi: "Sales quản lý khách", en: "Account owner" }, { vi: "Tổng TEU 2025", en: "Total TEU 2025" }]
  - [{ vi: "Mã khách hàng", en: "Customer code" }, { vi: "Tên khách hàng", en: "Customer name" }, { vi: "Sales quản lý khách", en: "Account owner" }]
```

`conclusion` giữ nguyên (vẫn trích tên "Khách lâu không gửi hàng" / "Customers who went quiet", đúng vì ch3-03 giữ tên).

```markdown
Đây là buổi đánh giá thăng tiến của bạn. Cuối năm mình gặp riêng năm khách lớn nhất, đi cùng sales quản lý từng khách. Mình cũng giao cho sales gọi lại những khách đã ngừng gửi hàng. Chuẩn bị giúp mình ba danh sách; làm đúng cả ba là bạn lên một nấc trong sự nghiệp.

## Step 1: Năm khách lớn nhất năm 2025
Năm khách có tổng TEU lớn nhất, tính các lô booking năm 2025 và không bị hủy: tên khách và tổng TEU. Lớn nhất lên đầu; bằng TEU thì xếp theo tên khách theo thứ tự chữ cái.
(giữ khối sql cũ)

## Step 2: Kèm sales quản lý khách
Như bước 1, thêm vào giữa họ tên sales quản lý khách, tức người đứng tên trong hồ sơ khách hàng (không phải sales làm từng lô): tên khách, sales quản lý, tổng TEU. Cùng thứ tự.
(giữ khối sql cũ)

## Step 3: Khách đã ngừng gửi hàng
Các khách không có booking nào từ 01/03/2026 đến nay, kể cả khách chưa từng booking, kèm sales quản lý khách để giao việc gọi lại: mã khách, tên khách, sales quản lý. Xếp theo mã khách từ nhỏ đến lớn.
(giữ khối sql cũ)

## Hints
1. Bước 1 và 2 đi từ khách xuống lô rồi xuống container để cộng TEU; người quản lý lấy từ hồ sơ khách. Bước 3 lại là câu hỏi về thứ không có, như ticket về khách lâu không gửi hàng.
2. Nối `customers` → `shipments` → `containers`, gom theo khách, `ORDER BY teu DESC, c.name` rồi `LIMIT 5`. Người quản lý: `customers.sales_rep_id` → `employees.id`. Bước 3: `LEFT JOIN shipments` với điều kiện ngày trong `ON`, giữ `WHERE s.id IS NULL`, rồi `ORDER BY c.id`.
3. `SELECT c.name, SUM(ct.teu) AS teu FROM customers c JOIN shipments s ON ... JOIN containers ct ON ... WHERE ... GROUP BY c.id, c.name ORDER BY teu DESC, c.name LIMIT 5`

# EN
This is your promotion review. At year end I meet our five biggest customers in person, together with the sales rep who owns each account. I am also asking the reps to call back the customers who stopped shipping. Prepare three lists for me; get all three right and you move up a step in your career.

## Step 1: Our five biggest customers of 2025
The five customers with the highest total TEU, counting shipments booked in 2025 that were not cancelled: customer name and total TEU. Largest first; on equal TEU, order by customer name alphabetically.

## Step 2: With the account owner
Same as step 1, with the full name of the account owner added in the middle. The owner is the person named on the customer record, not the rep on each shipment: customer name, account owner, total TEU. Same order.

## Step 3: Customers who stopped shipping
The customers with no booking from 1 March 2026 until today, including customers who have never booked, with their account owner so the call-backs can be assigned: customer code, customer name, account owner. Order by customer code, smallest first.

## Hints
1. Steps 1 and 2 go from customer down to shipment and then to container to add up TEU; the owner comes from the customer record. Step 3 is again a question about something missing, like the ticket about customers who went quiet.
2. Join `customers` → `shipments` → `containers`, group by customer, `ORDER BY teu DESC, c.name`, then `LIMIT 5`. Owner: `customers.sales_rep_id` → `employees.id`. Step 3: `LEFT JOIN shipments` with the date condition in `ON`, keep `WHERE s.id IS NULL`, then `ORDER BY c.id`.
3. `SELECT c.name, SUM(ct.teu) AS teu FROM customers c JOIN shipments s ON ... JOIN containers ct ON ... WHERE ... GROUP BY c.id, c.name ORDER BY teu DESC, c.name LIMIT 5`
```

---

## 4. Ngân hàng câu hỏi cho chương 4–7 (Plan 2/3)

**Quy ước:**

- Bảng lấy từ spec §4. Tên cột của bảng mới chưa có, Plan 2/3 sẽ định nghĩa; ở đây chỉ ghi tên bảng.
- Ngày là ngày tuyệt đối; "hôm nay" là 31/10/2026.
- Mỗi câu ghi: **vai trò** người hỏi, **mục đích**, **bảng**, **kỹ năng luyện**, **nhịp gợi ý** (teach/develop/twist/rest/cột mốc), và bẫy dữ liệu khi có.
- Khi viết thành ticket, áp đủ §1. Đặc biệt, mọi ràng buộc ở đây (khoảng ngày, lô hủy, phá hòa) phải còn nguyên trong `## Task`.
- Người viết chọn khoảng 5 câu mỗi chương, theo nhịp teach → develop → twist → rest → cột mốc. Câu cột mốc gom kỹ năng của câu twist (luật D4).

### Chương 4: Thời gian & phân loại (ngày/khoảng thời gian, CASE, NULL) · Ops, Hải quan

**4.1 · Điều độ vận tải / kho CFS · teach (ngày và khoảng thời gian)**
- VI: "Những lô nhập đường biển đã cập cảng trong tháng 10/2026 nhưng xe chưa kéo về kho sau hơn 3 ngày là lô nào? Gửi mã lô, ngày cập cảng thực tế, số ngày đã chờ tính đến 31/10/2026."
- EN: "Which sea import shipments arrived in port in October 2026 but have waited more than 3 days without being trucked to the warehouse? Send the shipment ref, the actual arrival date and the days waited as of 31 October 2026."
- Mục đích: kéo hàng trước khi phát sinh phí lưu bãi. Bảng: `shipments`, `trucking_orders`. Kỹ năng: trừ ngày, so với khoảng 3 ngày.

**4.2 · Trưởng phòng Ops · develop (CASE + gộp)**
- VI: "Quý 3/2026, tỷ lệ lô đến đúng hẹn của từng tuyến (cảng đi → cảng đến) là bao nhiêu? Đúng hẹn là đến thực tế không trễ quá 1 ngày so với ngày đến dự kiến. Lô chưa đến thì không tính."
- EN: "In Q3 2026, what share of shipments arrived on time on each lane (origin port to destination port)? On time means the actual arrival is at most 1 day after the estimated arrival. Shipments that have not arrived yet are left out."
- Mục đích: báo cáo chất lượng dịch vụ cho khách. Bảng: `shipments`, `ports`. Kỹ năng: `CASE` trong `SUM`/`AVG`. Bẫy: ngày đến thực tế để trống ở lô chưa đến.

**4.3 · Khai báo viên hải quan · develop (phân loại theo luồng)**
- VI: "Tháng 9 và tháng 10/2026, mỗi tháng có bao nhiêu tờ khai luồng xanh, vàng, đỏ? Tờ khai đã bị thay bằng tờ khai sửa thì chỉ tính bản sửa cuối cùng."
- EN: "In September and October 2026, how many customs declarations went green, yellow and red each month? When a declaration was replaced by an amended one, count only the final amendment."
- Mục đích: dự trù người đi kiểm hóa cho tháng cao điểm. Bảng: `customs_declarations`. Kỹ năng: cắt ngày theo tháng, `CASE` đếm theo luồng. Bẫy: tờ khai hủy rồi khai lại (tự tham chiếu tới tờ khai gốc).

**4.4 · CSKH · twist (NULL)**
- VI: "Tính đến 31/10/2026, lô nào đã quá ngày đến dự kiến mà vẫn chưa ghi nhận ngày đến thực tế? Gửi mã lô, tên khách và số ngày trễ, trễ nhiều nhất lên đầu, bằng nhau thì theo mã lô."
- EN: "As of 31 October 2026, which shipments are past their estimated arrival with no actual arrival recorded? Send the shipment ref, customer name and days late, most late first, ties by shipment ref."
- Mục đích: chủ động gọi báo khách trước khi khách hỏi. Bảng: `shipments`, `customers`. Kỹ năng: `IS NULL` (so sánh `= NULL` sai), trừ ngày. Bẫy: ngày đến thực tế để trống.

**4.5 · Kho CFS · rest**
- VI: "Từ 26/10 đến 31/10/2026, mỗi ngày kho CFS nhận bao nhiêu lô hàng lẻ và tổng bao nhiêu CBM?"
- EN: "From 26 to 31 October 2026, how many LCL receipts and how many CBM in total did the CFS warehouse take in each day?"
- Mục đích: xếp người bốc xếp theo ngày. Bảng: `cfs_receipts`. Kỹ năng: gom theo ngày.

**4.6 · Khai báo viên hải quan · twist (COALESCE + CASE)**
- VI: "Thuế nhập khẩu phát sinh trong tháng 10/2026 theo từng chương mã HS (2 số đầu). Mã HS chưa có thuế suất thì tạm tính 0 và đánh dấu 'cần kiểm tra'."
- EN: "Import duty raised in October 2026 by HS chapter (first 2 digits). Where an HS code has no duty rate yet, count it as 0 and flag it as 'to check'."
- Mục đích: dự trù tiền thuế khách phải ứng và bắt mã HS thiếu thuế suất. Bảng: `customs_declarations`, `hs_codes`, `duties_taxes`. Kỹ năng: `COALESCE`, `CASE`, cắt chuỗi.

**4.7 · Giám đốc · cột mốc (kiểm 4.4 + 4.3)**
- VI: "Báo cáo chất lượng dịch vụ tháng 10/2026 cho buổi giao ban quý: (1) lô đang trễ chưa đến, (2) thời gian thông quan trung bình theo luồng, (3) tỷ lệ đúng hẹn theo phương thức."
- EN: "October 2026 service-quality report for the quarterly review: (1) late shipments not yet arrived, (2) average clearance time by channel, (3) on-time rate by mode."
- Bảng: `shipments`, `customs_declarations`. Kỹ năng: tổng hợp chương 4.
- Ghi chú: bẫy khách trùng tên (khách 191–200 là bản trùng của 1–10) bắt đầu có từ ch4. Nếu chương này dạy `CASE` để chuẩn hóa nhóm, có thể thêm một bước "gộp khách nhập hai lần" có quy tắc nghiệp vụ rõ ràng.

### Chương 5: Câu hỏi nhiều bước (subquery, CTE) · Kế toán, Pricing

**5.1 · Kế toán công nợ phải thu (AR) · teach (subquery vô hướng)**
- VI: "Tính đến 31/10/2026, khách nào có tổng nợ quá hạn cao hơn mức nợ quá hạn trung bình của các khách đang nợ? Gửi tên khách và số nợ quá hạn, nhiều nhất lên đầu, bằng nhau thì theo tên khách."
- EN: "As of 31 October 2026, which customers owe more overdue money than the average overdue balance of all customers who owe us? Send the customer name and overdue amount, largest first, ties by customer name."
- Mục đích: ưu tiên danh sách nhắc nợ tuần này. Bảng: `invoices`, `payments`, `customers`. Kỹ năng: subquery trả một giá trị.

**5.2 · Kế toán trưởng · develop (CTE nhiều bước + quy đổi tỷ giá)**
- VI: "Lãi gộp của từng lô booking tháng 9/2026, sau khi quy đổi mọi khoản thu và khoản chi về VND theo tỷ giá ngày hóa đơn. Lô nào bị lỗ?"
- EN: "Gross profit of each shipment booked in September 2026, after converting every revenue and cost line into VND at the exchange rate of the invoice date. Which shipments made a loss?"
- Mục đích: rà lô lỗ trước khi chốt sổ quý. Bảng: `charges`, `vendor_bills`, `exchange_rates`, `shipments`. Kỹ năng: `WITH` tách bước thu, chi, quy đổi. Bẫy: phí nhiều loại tiền.

**5.3 · Pricing · twist (subquery tương quan / EXISTS)**
- VI: "Báo giá nào gửi khách trong quý 3/2026 có giá bán thấp hơn giá mua của hợp đồng cước còn hiệu lực vào ngày báo giá, cùng tuyến và cùng loại container?"
- EN: "Which quotations sent in Q3 2026 have a selling price below the buying rate of the freight contract valid on the quotation date, for the same lane and container type?"
- Mục đích: chặn báo giá bán lỗ. Bảng: `quotations`, `rate_contracts`. Kỹ năng: subquery tương quan, điều kiện "còn hiệu lực" theo khoảng ngày. Đây là mầm nguyên nhân 1 của câu chuyện ch7.

**5.4 · Kế toán công nợ phải trả (AP) · develop (IN / NOT IN)**
- VI: "Hóa đơn nhà cung cấp nhận trong tháng 10/2026 nào thuộc lô đã hủy? Cần đòi hoàn hoặc dừng thanh toán."
- EN: "Which vendor bills received in October 2026 belong to cancelled shipments? We need to claim a refund or stop payment."
- Bảng: `vendor_bills`, `shipments`. Kỹ năng: subquery với `IN`. Bẫy: lô hủy vẫn còn dòng phí.

**5.5 · Kế toán AR · rest (anti-join ôn lại)**
- VI: "Tính đến 31/10/2026, lô nào đã giao cho khách nhưng chưa xuất hóa đơn? Gửi mã lô, tên khách, ngày giao."
- EN: "As of 31 October 2026, which shipments were delivered but never invoiced? Send the shipment ref, customer name and delivery date."
- Mục đích: xuất hóa đơn trong kỳ, không để sót doanh thu. Bảng: `shipments`, `invoices`, `customers`. Kỹ năng: `NOT EXISTS`. Bẫy: lô đã giao nhưng chưa có hóa đơn.

**5.6 · Giám đốc · cột mốc (kiểm 5.3)**
- VI: "Lãi gộp quý 3/2026 theo từng sales quản lý khách. Sales nào có báo giá bán dưới giá mua, và các báo giá đó làm mất bao nhiêu lãi?"
- EN: "Q3 2026 gross profit per account owner. Which owners sent quotations below the buying rate, and how much profit did those quotations cost?"
- Bảng: `charges`, `vendor_bills`, `exchange_rates`, `quotations`, `rate_contracts`, `customers`, `employees`. Kỹ năng: CTE + subquery tương quan.

### Chương 6: Xu hướng (window functions) · Giám đốc, Chứng từ

**6.1 · Giám đốc · teach (RANK theo nhóm)**
- VI: "Mỗi tháng từ 01/2026 đến 10/2026, ba khách có TEU lớn nhất là ai? Bằng TEU thì khách có mã nhỏ hơn xếp trên."
- EN: "For each month from January to October 2026, who were the three customers with the most TEU? On equal TEU, the smaller customer code ranks higher."
- Mục đích: theo dõi khách lớn có giữ phong độ không. Bảng: `shipments`, `containers`, `customers`. Kỹ năng: `RANK()`/`ROW_NUMBER() OVER (PARTITION BY …)`.

**6.2 · Sales · develop (LAG)**
- VI: "TEU từng tháng từ 11/2024 đến 10/2026 tăng hay giảm bao nhiêu so với tháng trước, kể cả tính theo phần trăm?"
- EN: "How much did TEU go up or down each month from November 2024 to October 2026 compared with the month before, also as a percentage?"
- Mục đích: thấy mùa cao điểm và tháng sụt. Bảng: `shipments`, `containers`. Kỹ năng: `LAG`.

**6.3 · Chứng từ / booking & vận đơn · develop (lũy kế)**
- VI: "Trong tháng 10/2026, tính đến từng ngày, đã phát hành tổng cộng bao nhiêu vận đơn nhà (HBL)?"
- EN: "In October 2026, how many house bills of lading had been issued in total up to each day?"
- Mục đích: so tiến độ với chỉ tiêu tháng của team chứng từ. Bảng: `house_bills`. Kỹ năng: `SUM() OVER (ORDER BY …)`.

**6.4 · Chứng từ · twist (window so sánh trong nhóm)**
- VI: "Vận đơn chủ (MBL) nào có tổng trọng lượng các vận đơn nhà (HBL) lệch quá 1% so với trọng lượng ghi trên MBL?"
- EN: "Which master bills (MBL) have house bills (HBL) whose total weight differs by more than 1% from the weight on the MBL?"
- Mục đích: sửa chứng từ trước khi hãng tàu phạt khai sai. Bảng: `master_bills`, `house_bills`. Kỹ năng: `SUM() OVER (PARTITION BY …)`. Bẫy: trọng lượng house khác master.

**6.5 · Chứng từ · rest (bẫy dữ liệu)**
- VI: "Lô hàng air nào đang khai điều kiện FOB, vốn chỉ dùng cho đường biển? Gửi mã lô và sales làm lô để sửa trước khi phát hành vận đơn hàng không."
- EN: "Which air shipments are declared under FOB, a term meant for sea freight only? Send the shipment ref and the sales rep on the shipment so it is fixed before the air waybill goes out."
- Bảng: `shipments`, `incoterms`, `employees`. Kỹ năng: ghép bảng và lọc (ôn). Bẫy: FOB khai cho lô air.

**6.6 · Điều độ vận tải · develop (sự kiện mới nhất)**
- VI: "Tính đến 31/10/2026, mỗi container đang chạy đang dừng ở bước nào, và đã ở bước đó bao nhiêu ngày? Container ở một bước quá 5 ngày là container bị kẹt."
- EN: "As of 31 October 2026, at which step is each active container, and for how many days has it been there? A container that has stayed at one step for more than 5 days is stuck."
- Bảng: `container_events`. Kỹ năng: `ROW_NUMBER()` lấy sự kiện mới nhất, hoặc `LEAD`.

**6.7 · Giám đốc + Kế toán · cột mốc (kiểm 6.4)**
- VI: "Container nào đã vượt thời gian miễn phí lưu container/lưu bãi (D&D) theo điều khoản của khách, và mỗi khách đang chịu bao nhiêu ngày vượt trong năm 2026?"
- EN: "Which containers have gone past their free time for demurrage and detention (D&D) under the customer's terms, and how many excess days does each customer have in 2026?"
- Bảng: `free_time_terms`, `container_events`, `shipments`, `customers`. Kỹ năng: window + khoảng thời gian. Đây là mầm nguyên nhân 2 của ch7 (khách 1).

### Chương 7: Điều tra · Ban giám đốc ("Biên lợi nhuận Q3 giảm, vì sao?")

Ba nguyên nhân cài sẵn trong seed (spec §4) là đáp án; mỗi câu dưới đây dẫn tới một nguyên nhân.

**7.1 · Giám đốc · teach (đặt khung điều tra)**
- VI: "Biên lợi nhuận gộp quý 3/2026 giảm bao nhiêu điểm phần trăm so với quý 2/2026, và giảm ở tuyến nào nhiều nhất?"
- EN: "By how many percentage points did gross margin fall from Q2 2026 to Q3 2026, and on which lane did it fall the most?"
- Bảng: `charges`, `vendor_bills`, `exchange_rates`, `shipments`, `ports`. Kỹ năng: CTE theo quý, so kỳ. Kết quả trỏ tới tuyến châu Âu (NLRTM, DEHAM, BEANR).

**7.2 · Pricing · develop (nguyên nhân 1)**
- VI: "Trên tuyến châu Âu, giá mua theo hợp đồng cước tăng bao nhiêu từ quý 2 sang quý 3/2026? Giá bán trên các báo giá cùng tuyến có tăng theo không?"
- EN: "On the Europe lane, how much did contract buying rates rise from Q2 to Q3 2026? Did the selling prices on quotations for the same lane follow?"
- Bảng: `rate_contracts`, `quotations`. Kỹ năng: `LAG` hoặc so kỳ bằng CTE.

**7.3 · Kế toán AR + CSKH · twist (nguyên nhân 2)**
- VI: "Phí lưu container/lưu bãi (D&D) thu hoặc chịu theo từng khách, từng quý 2025–2026. Khách nào tăng đột biến trong quý 3/2026, và vì sao (ngày vượt hay đơn giá)?"
- EN: "Demurrage and detention (D&D) charges per customer per quarter in 2025-2026. Which customer jumped in Q3 2026, and why: more excess days or a higher rate?"
- Bảng: `free_time_terms`, `container_events`, `charges`, `customers`. Kỹ năng: window theo khách, tách yếu tố. Đáp án hướng tới khách 1.

**7.4 · Trưởng phòng Ops · develop (nguyên nhân 3)**
- VI: "Bảng điểm claim theo hãng tàu năm 2026: số claim trên 100 lô và tổng giá trị claim. Hãng nào cao bất thường so với trung bình các hãng?"
- EN: "Claims scorecard by carrier for 2026: claims per 100 shipments and total claim value. Which carrier is unusually high compared with the carrier average?"
- Bảng: `claims`, `shipments`, `carriers`. Kỹ năng: tỷ lệ, so với trung bình bằng subquery hoặc window. Đáp án: Blue Anchor Lines.

**7.5 · Kế toán trưởng · rest (kiểm dữ liệu trước khi kết luận)**
- VI: "Trước khi trình ban giám đốc: doanh thu quý 3/2026 có bị tính trùng vì khách nhập hai lần với cách viết khác nhau không? Nếu có thì chênh bao nhiêu?"
- EN: "Before we present to the board: is Q3 2026 revenue double-counted because some customers were entered twice under different spellings? If so, by how much?"
- Bảng: `customers`, `invoices`. Kỹ năng: chuẩn hóa chuỗi, ghép cặp bản trùng. Bẫy: khách trùng tên khác cách viết.

**7.6 · Giám đốc · cột mốc cuối (đánh giá thăng tiến cuối cùng)**
- VI: "Trình Hội đồng quản trị: ba nguyên nhân làm biên lợi nhuận quý 3/2026 giảm, mỗi nguyên nhân kèm một con số chứng minh."
- EN: "For the board: the three reasons gross margin fell in Q3 2026, each backed by one figure."
- Cấu trúc: ba bước, mỗi bước một con số; câu kết luận hỏi nguyên nhân chính (giá bán chưa theo kịp giá mua tuyến châu Âu). Bảng: như 7.1–7.4. Kỹ năng: tổng hợp cả game.

---

## 5. Còn để ngỏ (cần user hoặc orchestrator xem)

1. **Thang nghề: L19 lệch `product-design-v2.md` ★3.**
   - L19 ghi "qua boss chương n → bậc n" (7 chương, nhưng thang chỉ có 5 bậc).
   - v2 chỉ thăng chức ở ch1, ch3, ch5, ch7.

   Đề ở §3 cố ý không ghi tên bậc. Ch1 là "qua thử việc", ch2 là "dự án lớn đầu tiên ở vị trí mới", ch3 là "đánh giá thăng tiến", nên đúng với cả hai cách hiểu. Màn qua chương (i18n) báo bậc theo `rankOf` khi đã chốt.
2. **Ví dụ của L24 với ch2-03.** L24 ví dụ "gửi mình tên khách và số lô", nhưng Solution của ch2-03 chỉ dùng `shipments` (chưa học JOIN), nên chỉ trả được mã khách. Bản viết lại hỏi mã khách và nói rõ lý do ("CSKH tra tên sau"). Muốn trả tên khách thì phải đổi Solution và `tables`, tức là đổi cấu trúc, ngoài phạm vi lần viết lại này.
3. **Thêm người gửi cho ch4–7.** Xem §1.7: chọn tên từ nhân viên `Staff` thật trong seed khi viết `content/people.yml`.
