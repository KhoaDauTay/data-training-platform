# Nghiên cứu: trang Bản đồ (Product + UI/UX), 2026-11-20

User: "Theo review tôi thấy tab Bản đồ khá vô nghĩa chưa mang lại giá trị gì cho việc học cần cải thiện, research thêm đi".

Tài liệu này gồm bốn phần: hiện trạng đo trên bản live, nghiên cứu (có nguồn), ba hướng làm lại, khuyến nghị. Chưa sửa code. Các quyết định chờ user ở §6.

---

## 1. Hiện trạng: trang Bản đồ đang làm gì

### 1.1 Cách kiểm

- Bản live https://khoadautay.github.io/data-training-platform/, Edge headless qua CDP (script riêng trong scratchpad, cổng 9347, hồ sơ tạm, chỉ tắt tiến trình tự mở). Mỗi domain chụp ở 1280 và 375.
- Hai trạng thái:
  - **hồ sơ mới;**
  - **save đã đi xa:** lấy `tests/fixtures/save-v5.json` rồi nới `completed` thành mọi việc Logistics ch1–7, E-com ch1–3 và Finance ch1–3 (69 id). Fixture gốc không bị sửa.
- Số liệu dưới đây chạy trên seed thật: PGlite trong Node, `schema.sql` + `seed.sql` của từng domain.

### 1.2 Thấy gì

**Logistics** (`routesSection`, `src/ui/homeView.ts`; `routeMap`, `src/art/logistics.ts`):

- Bản đồ thế giới (bờ biển Natural Earth) với 7 tuyến từ Tiên Sa, đội tàu chạy nền. Dưới bản đồ là danh sách tuyến; bấm một tuyến thì mở hồ sơ tuyến và bài tuyến.
- Hồ sơ mới: mọi tuyến ghi "mở sau đánh giá ch. N", đề nghị bấm cảng để đọc hồ sơ.
- Save đi xa: nhãn "Rotterdam · 2 chuyến", "Busan · 1 chuyến"…
  - "Chuyến" là **số việc đã xong có cảnh tàu** (`derive()` trong `src/scene.ts`), không phải số lô hàng.
  - 4/7 tuyến ghi "đợt sau" (Shanghai, Laem Chabang, Busan, Los Angeles), vì chỉ có Rotterdam, Singapore và Sydney là có bài tuyến (3 × 3 = 9 việc, tùy chọn).

**E-commerce:** tiêu đề "Bản đồ giao hàng" và một hình SVG (`deliveryMap`). Đường từ Kho Đà Nẵng tới 7 thành phố, tô màu theo chương đã mở. Không có nút, không có danh sách, không có số.

**Finance:** tiêu đề "Bản đồ chi nhánh" và hình SVG 8 chi nhánh, mở dần theo chương.

- Ở 375 px có danh sách chữ "Quang Ngai: mở sau đánh giá thăng tiến chương 5".
- **Danh sách này mâu thuẫn với dữ liệu.** Bảng `branches` có đủ 8 chi nhánh (mở cửa 06–07/2024) và người chơi truy vấn được chúng từ F1. Quang Ngai còn chính là chi nhánh của hook H1 (dư nợ quá hạn > 30 ngày tăng từ 4,2 % lên 14,2 %).

### 1.3 Vì sao nó không dạy

1. **Bản đồ vẽ tiến độ chơi, không vẽ dữ liệu.**
   - Không con số nào trên trang đến từ một câu SQL hay từ seed.
   - Seed Logistics có 20.000 lô. Riêng Tiên Sa đi **13** cảng đích (USLAX 342 lô, CNSHA 335, NLRTM 310…), còn bản đồ chỉ có 7. Cảng đi lớn nhất là VNSGN (5.004 lô), nhưng không có trên bản đồ.
   - Người học SQL không thấy mối nối nào giữa câu mình viết và hình.
2. **Trang không có việc gì để làm bằng SQL.**
   - Ở Logistics, đường duy nhất tới SQL là 9 bài tuyến tùy chọn, sau hai lần bấm.
   - Ở E-com và Finance thì không có gì cả.
   - Trên trang không có câu hỏi, không có giả thuyết để kiểm, không có kết quả để đọc.
3. **Đây đúng là "đồ họa trang trí" theo nghiên cứu.**
   - Sung & Mayer (2012): mọi loại hình đều làm người học **thích** bài hơn. Chỉ hình **liên quan trực tiếp tới mục tiêu học** mới làm họ **nhớ** tốt hơn (§2.1).
   - Bản đồ hiện tại đẹp (L117–L120 đã đầu tư nhiều), nhưng nó là hình tạo hứng thú, không phải hình dạy.
   - L47 đã có nhận xét cùng loại: "mở tuyến chỉ là đổi màu một đường, không dạy gì về nghiệp vụ". Bài tuyến (product-design-v3 Phần B) thêm chữ về nghiệp vụ, nhưng bản đồ vẫn chỉ là cái mục lục.
4. **Lặp lại chỗ khác.**
   - Cảnh cảng ở Tổng quan, hộp thoại bản đồ trong workspace (`mapStrip`) và dock hoàn thành đều đã vẽ lại tuyến/thành phố/chi nhánh.
   - Trang Bản đồ là bản thứ ba, chỉ khác ở danh sách tuyến.
5. **Khóa giả.** Ở E-com và Finance, khóa thành phố/chi nhánh theo chương là luật game, trong khi dữ liệu đã mở hết. Người học thấy "Quang Ngai bị khóa" nhưng `SELECT * FROM branches` vẫn trả về Quang Ngai, nên hai thông điệp trái nhau.

### 1.4 Dữ liệu có câu chuyện không gian thật (đã đo)

Đây là điểm quan trọng: seed **đã có** những pattern chỉ hiện rõ khi đặt lên bản đồ.

| Domain | Câu hỏi | Kết quả trên seed | Kỹ năng |
|---|---|---|---|
| Logistics | Từ Tiên Sa đi mỗi cảng mất bao nhiêu ngày (ETA − ETD, đường biển)? | Thang rõ theo địa lý: SGSIN 4,0, THLCH 4,1, CNSHA 6,0, KRPUS 7,0, JPTYO 8,9, INNSA 15,0, AUSYD 17,0, USLAX 21,0, NLRTM 31,0, BEANR 32,1, DEHAM 33,0, USNYC 36,1 | `group_by`, `aggregate`, ngày (ch2, ch4) |
| Logistics | Giá mua 40HC trước và sau 15/07/2026 theo cảng | Châu Âu tăng mạnh: NLRTM 2.700 → 3.694, DEHAM 2.887 → 3.936, BEANR 2.825 → 3.808 (khoảng +35–38 %). Châu Á/Úc đứng yên (SGSIN 722 → 704, AUSYD 1.738 → 1.730). USNYC +9 % | `group_by`, `FILTER`/`CASE`, truy vấn con (ch5, ch7) |
| Logistics | Tuyến nào đổi tàu ở đâu (`lane_profiles.via_port` JOIN `ports`)? | Từ Tiên Sa, 5 tuyến đổi tàu ở SGSIN (INNSA, NLRTM, BEANR, DEHAM, USNYC), USLAX đổi ở KRPUS | JOIN (ch3). Lưu ý: `lane_profiles` chỉ có trong bài tuyến |
| E-com | Tỉ lệ giao trễ theo thành phố | Gộp chung thì phẳng: 19–26 % ở mọi nơi. Lọc courier Kite Logistics từ 01/09/2026 thì trễ **86 % Hue, 83 % Nha Trang, 77 % Da Nang**, các nơi khác 13–27 % (hook E4) | `where`, `group_by`, ngày (ch2–ch4) |
| Finance | Tỉ trọng dư nợ quá hạn > 30 ngày theo chi nhánh, 30/06 và 31/10 | Quang Ngai 4,2 % → **14,2 %**, mọi chi nhánh khác ≤ 3,4 % vào tháng 10 (H1). Hội An: Marketing Q3 vượt ngân sách 60 % (H3) | JOIN, `FILTER`, theo thời gian (F3, F5–F6) |

Bài học dữ liệu thực thụ nằm ở đây: **con số gộp che mất điểm nóng, lọc đúng thì điểm nóng hiện ra trên bản đồ.** Trang Bản đồ hiện tại không chạm tới điều nào trong số này.

Có **khoảng 21 Solution** đã có dạng "khóa địa điểm + số": nhóm theo `pod`/`city`/`branch`/`region`/`via_port`. Gồm:

- E-com: 4 (ch2-05, ch3-05, ch4-05, ch6-05);
- Finance: 9 (F1-05, F3-03, F3-05, F5-03…05, F6-01, F6-05, F7-05);
- Logistics: 7 (ch6-03, ch6-06, ch7-06, ch8-06, ch12-01, -05, -06);
- bài tuyến: sg-3.

Số này đếm bằng grep trên khối Solution, chưa chạy từng câu. Logistics không có Solution nào dạng bản đồ trước ch6.

---

## 2. Nghiên cứu

Ký hiệu: **[đọc]** = đã đọc nguồn gốc; **[tóm tắt]** = chỉ có tóm tắt từ công cụ tìm kiếm, vì trang chặn tải (403) hoặc không mở được.

### 2.1 Hình trang trí và hình dạy

- **Sung & Mayer 2012**, "When graphics improve liking but not learning from online lessons", *Computers in Human Behavior* **[đọc: tóm tắt bài báo]** — https://www.gwern.net/doc/design/visualization/2012-sung.pdf
  - Bốn nhóm học: hình dạy (liên quan trực tiếp), hình gây hứng thú (thú vị nhưng không liên quan), hình trang trí, không hình.
  - Mọi nhóm có hình đều chấm hài lòng cao hơn. Chỉ nhóm hình dạy nhớ bài tốt hơn.
  - Nguyên văn: "Adding relevant graphics to words helps learning but adding irrelevant graphics does not."
  - Áp vào BoonData: bản đồ hiện tại tăng cảm giác "game đẹp", không tăng hiểu SQL. Muốn có giá trị học thì hình phải **mang nội dung cần học**.
- **Nguyên tắc mạch lạc (coherence principle) và chi tiết gây hứng thú (seductive details)** **[tóm tắt]** — https://en.wikipedia.org/wiki/Seductive_details, https://link.springer.com/content/pdf/10.1007/s11251-023-09632-w.pdf
  - Phần thừa chiếm bộ nhớ làm việc, nhất là với người mới.
  - Có nghiên cứu cho thấy nó tăng động lực khi tải nhận thức thấp.
  - Áp vào BoonData: giữ cảnh đẹp ở nơi nghỉ (Tổng quan, dock hoàn thành), đừng biến nó thành một mục điều hướng ngang hàng với nơi học.

### 2.2 Nhiều cách biểu diễn liên kết với nhau

- **Ainsworth, DeFT (2006)**, "A conceptual framework for considering learning with multiple representations", *Learning and Instruction* 16(3) **[tóm tắt]** — https://www.bohrium.com/paper-details/deft-a-conceptual-framework-for-considering-learning-with-multiple-representations/812085751746396161-11581
  - Hai biểu diễn **bổ sung** cho nhau khi mỗi cái cho thấy một điều cái kia không cho thấy.
  - Việc khó và có giá trị là **dịch qua lại** giữa hai biểu diễn. Hệ thống nên hỗ trợ việc dịch, ví dụ liên kết (Van Labeke & Ainsworth 2001, https://core.ac.uk/download/82974717.pdf).
  - Áp vào BoonData: bảng kết quả và bản đồ của **cùng một kết quả**, đặt cạnh nhau. Bấm một chấm thì sáng dòng tương ứng và ngược lại. Đó là hình dạy, và nó tập đúng kỹ năng đọc kết quả.

### 2.3 Tư duy không gian và bản đồ như dữ liệu

- **NRC 2006, *Learning to Think Spatially*, ch. 11** **[đọc]** — https://www.nationalacademies.org/read/11019/chapter/13
  - Ví dụ lớp học: học sinh đặt tỉ lệ tử vong trẻ em cạnh các biến khác (nước sạch, dinh dưỡng…) trên GIS để tìm pattern.
  - Sách nói giá trị đến từ **quá trình truy vấn** ("the engine that powered the inquiry process"), không đến từ phần mềm.
- **SERC Carleton** **[đọc]** — https://serc.carleton.edu/integrate/teaching_materials/spatial.html
  - "Students often don't perceive maps as consisting of data, but instead think of them as pictures" (Swenson & Kastens 2011).
  - Đề xuất: so sánh hai bản đồ cùng vùng, đặt từ vựng mô tả pattern, mục tiêu cụ thể đo được.
- **Newcombe, OECD Working Paper EDU/WKP(2017)10** **[tóm tắt]** — https://one.oecd.org/document/EDU/WKP(2017)10/En/pdf
  - Tư duy không gian liên quan tới học STEM và rèn được. Bản đồ, sơ đồ và đồ thị là công cụ.
- **Giới hạn:** không tìm thấy nghiên cứu nào cho thấy bản đồ trực tiếp cải thiện kết quả học SQL hay kỹ năng đọc dữ liệu. Lập luận của tài liệu này dựa trên các nguyên tắc chung ở 2.1–2.3, không dựa trên bằng chứng riêng cho SQL.

### 2.4 Công cụ phân tích dùng bản đồ thế nào

- **BigQuery Studio** **[đọc]** — https://docs.cloud.google.com/bigquery/docs/geospatial-visualize
  - "When your query results contain one or more GEOGRAPHY type columns, you can view the results in an interactive map… click the Visualization tab."
  - Bản đồ là **một cách xem kết quả truy vấn**, đặt cạnh bảng, đúng một câu mỗi lần.
- **Databricks** **[tóm tắt]** — https://docs.databricks.com/aws/en/dashboards/manage/visualizations/maps
  - Choropleth từ kết quả có cột tên vùng. Tên phải khớp bộ định danh địa điểm có sẵn.
- **Observable Plot** **[tóm tắt]** — https://observablehq.com/@observablehq/build-your-first-choropleth-map-with-observable-plot
  - Tô vùng bằng giá trị tra theo id.
  - Chia nhỏ theo năm (`fx`) thay cho hoạt cảnh: https://observablehq.com/@fil/faceted-choropleth.
- **Quy ước bản đồ học:**
  - Axis Maps **[đọc]** — https://www.axismaps.com/guide/proportional-symbols: "choropleth maps should only be made with standardized data". Ký hiệu tỉ lệ dùng được cho số đếm. Ký hiệu chồng nhau là vấn đề thường gặp, độ trong suốt là giải pháp một phần.
  - Datawrapper **[tóm tắt]** — https://www.datawrapper.de/docs/category/choropleth-symbol-maps; Penn State GEOG 486 **[tóm tắt]** — https://courses.ems.psu.edu/geog486/book/export/html/893: người đọc ước lượng diện tích ký hiệu kém, nên **phải ghi số**.
  - Áp vào BoonData:
    - số đếm/tổng (`COUNT`, `SUM`) dùng **chấm to nhỏ**;
    - tỉ lệ, trung bình (`AVG`, %) dùng **màu theo bậc, kèm nhãn số**;
    - không bao giờ chỉ dùng màu.

### 2.5 Game học SQL

- **SQL Murder Mystery** (Knight Lab) **[đọc: README repo]** — https://github.com/NUKnightLab/sql-mysteries
  - "a self-directed lesson to learn SQL concepts and commands": một vụ án, manh mối nằm trong dữ liệu.
  - Hình duy nhất là sơ đồ lược đồ (`schema.png`). Hình đó là công cụ làm bài, không phải trang trí.
- **SQL Island** (TU Kaiserslautern) **[tóm tắt]** — https://sql-island.informatik.uni-kl.de/: câu chuyện thoát đảo, mỗi bước là một câu SQL, phản hồi ngay.
- **SQL Noir** **[tóm tắt]** — https://www.producthunt.com/products/sql-noir: mỗi vụ một CSDL, viết SQL thật để đi tiếp.
- **Điểm chung:** "bản đồ" của các game này là **câu hỏi kế tiếp mà dữ liệu trả lời**. Không game nào có bản đồ tiến độ tách khỏi dữ liệu.

### 2.6 Hỗ trợ tiếp cận (a11y)

- **GOV.UK Accessibility blog 2023** **[đọc]** — https://accessibility.blog.gov.uk/2023/04/13/text-descriptions-for-data-visualisations/
  - Văn bản thay thế "should convey the main message and be equally as informative as viewing the chart", có khi là bảng dữ liệu.
  - Đặt phần mô tả trong thân trang, không nhét vào `alt`.
- **PCC** **[tóm tắt]** — https://spot.pcc.edu/accessibility/docs/library/articles/complex-images-maps: bản đồ nhiều điểm thì cho bảng dữ liệu, mô tả từng bậc màu.
- **WCAG 1.4.1:** không dùng màu làm kênh duy nhất.
- Áp vào BoonData: bảng kết quả (tab Kết quả) **đã là** bản tương đương. Bản đồ chỉ cần thêm một câu tóm tắt ("Cao nhất: Hue 86 %; thấp nhất: Hai Phong 13 %") và danh sách HTML xếp theo giá trị.

---

## 3. Ràng buộc mọi hướng phải giữ

| Ràng buộc | Nguồn | Hệ quả |
|---|---|---|
| Không lộ đáp án | L25 | Bản đồ chỉ vẽ (a) kết quả của chính người chơi (`app.lastRun`), hoặc (b) Solution của việc **đã giải**, như `kpiTiles` |
| Không backend, không tile hay API bản đồ ngoài | CLAUDE.md, offline/PWA | Dùng `src/art/coast.ts` (Natural Earth, đã có). Bản đồ Việt Nam vẽ cách điệu như `CITIES`/`BRANCHES` hiện tại |
| Có khóa địa lý | — | `ports` **không có** tọa độ. Chỉ 7 cảng + Tiên Sa có lon/lat (`LANE_GEO`, `src/art/seaLanes.ts`). Cần một bảng tĩnh cho ~22 mã `ports` (cả sân bay: dùng tọa độ thành phố). `CITIES` (E-com) và `BRANCHES` (Finance) đã khớp tên seed |
| Khung bản đồ L119 | L119 | lon −12…254,7. **New York (−74°) nằm ngoài khung**, cần mũi tên ở mép hoặc nới khung. VNSGN/VNHPH phải có điểm |
| Ngân sách | `check-budget.mjs` | `art` 17/20 KB: không nhét thêm vào đó. Phần mới vào chunk lười riêng. main 325/500 |
| Save | `src/save.ts` | Không thêm field nếu không có migration v6. Mọi hướng dưới đây không cần field mới |
| VI/EN, không emoji, art tự vẽ, ≥ 4,5:1 | CLAUDE.md | Như mọi trang |
| Chuyển động v5/v6 | L101–L109, L112–L122 | Chỉ chạy lúc có sự kiện (Chạy truy vấn), không chạy lại khi `rerender()`. Transform chỉ trên SVG lá. ≤ 3 s. Giảm chuyển động = khung cuối. Dòng thời gian là `<input type="range">` do người chơi kéo, không tự chạy vòng lặp |

---

## 4. Ba hướng làm lại

### Hướng A: "Bản đồ kết quả": bản đồ là một cách xem kết quả của chính bạn

**Người chơi thấy và làm gì:**

- Ở workspace (story, bài tuyến, Sandbox), bảng dưới có thêm tab **Bản đồ** (nhóm `output`, cạnh Biểu đồ). Tab chỉ bật khi `app.lastRun` có:
  - **một cột khóa địa điểm:** giá trị khớp mã/tên cảng, tên thành phố E-com, tên chi nhánh Finance, hoặc `region`;
  - **ít nhất một cột số.**
- Cách vẽ:
  - Một dòng thành một ký hiệu.
  - Cột số thứ nhất: là số đếm/tổng (số nguyên, hoặc tên cột chứa count/sum/n) thì vẽ chấm to nhỏ; là số thập phân hoặc tỉ lệ thì tô màu theo 5 bậc. Luôn có nhãn số.
  - Kết quả có hai khóa cảng (`pol`, `pod`) thì vẽ đường, độ dày theo giá trị. Nếu cặp cảng có trong `LANE_GEO` thì vẽ theo tuyến biển, không thì vẽ cung tượng trưng có ghi chú.
  - Có cột ngày (`month_end`, `date_trunc`) thì thêm thanh kéo thời gian (native range). Kéo để xem từng tháng; không có nút Play.
- Bấm một ký hiệu thì sáng dòng đó trong tab Kết quả, và ngược lại (liên kết theo Ainsworth).
- Trang `#/d/<domain>/map` thành **"Bản đồ kết quả"**:
  - ở trên: bản đồ to của lần chạy gần nhất ở domain đó, cùng một câu tóm tắt;
  - ở dưới: 3 **câu hỏi gợi mở** bằng lời (không SQL, không tên cột, theo problem-design §1), mỗi câu có nút "Mở Sandbox".
  - Ví dụ E-com: "Thành phố nào giao trễ nhiều nhất? Nếu chỉ xét một hãng giao hàng từ tháng 9 thì sao?"
  - Ví dụ Finance: "Chi nhánh nào có tỉ trọng nợ quá hạn tăng nhanh nhất từ tháng 6 tới tháng 10?"
  - Sandbox không chấm điểm và không cho starter chứa đáp án.

```
┌ Kết quả │ Biểu đồ │ Bản đồ ┐  "SQL đã đổi" khi editor khác lastRun (như mọi tab)
│  ~~~ bờ biển cách điệu ~~~                                  │
│        ● Hue 86 %   (màu bậc 5 + số)                         │
│      ● Da Nang 77 %                                          │
│              ● Nha Trang 83 %                                │
│                         ● Ho Chi Minh City 27 %             │
│  Cao nhất: Hue 86 %. Thấp nhất: Hai Phong 13 %. 7 dòng.      │  ← câu tóm tắt, role=status
│  [Danh sách theo giá trị ▾]  (HTML, đọc được bằng trình đọc)  │
└──────────────────────────────────────────────────────────────┘
Kết quả không có cột địa điểm → tab tắt, có dòng lý do:
"Bản đồ cần một cột tên cảng / thành phố / chi nhánh và một cột số."
```

**Giá trị học:**

- **Độ hạt của GROUP BY nhìn thấy được:** quên GROUP BY thì ra một chấm (hoặc lỗi); nhóm theo `city` thì ra 7 chấm.
- **Con số gộp che điểm nóng:** bản đồ E-com gần như đều màu cho tới khi người chơi thêm `WHERE` đúng.
- Tập dịch qua lại bảng và hình. Mỗi câu SQL người chơi viết đều có thể "lên bản đồ", nên bản đồ không còn là một tấm ảnh.

**Kỹ năng và chương:**

| Domain | Kỹ năng | Chương |
|---|---|---|
| Logistics | `group_by`/`aggregate`, ngày, JOIN `ports` (đổi mã → tên/vùng), `CASE`/`FILTER` (trước/sau GRI) | ch2, ch4, ch3, ch5, ch7 |
| E-com | `group_by`, `where` + ngày | ch2–ch4 |
| Finance | JOIN `branches`, `FILTER`, theo tháng | F1–F6 |

**Dữ liệu:** có sẵn, xem §1.4. Không đổi seed.

**Không lộ đáp án:** đúng ngay từ thiết kế, vì chỉ vẽ `lastRun`. Tab Bản đồ của việc story không bao giờ vẽ Solution.

**Chuyển động:**

- Sau mỗi lần Chạy, chấm mọc từ 0 lên kích thước thật (`scale` trên `<circle>` lá, 400 ms, stagger 30 ms, tổng ≤ 1 s).
- Đường vẽ bằng DrawSVG khi chunk `gsap` đã có. Không có thì hiện ngay khung cuối.
- Kéo thanh thời gian thì nội suy màu/kích thước 200 ms. Giảm chuyển động = đổi ngay.
- Vẽ lại do `rerender()` không chạy hoạt cảnh.

**Khối lượng:** M, khoảng 5–6 ngày.

- `src/viz/geo.ts` thuần: `geoSpec(result, domain)` nhận dạng khóa và loại số. Test trên PGlite thật với các Solution ở §1.4, kèm ca âm (trùng tên Sydney cảng/sân bay, `region`, NULL).
- Bảng tọa độ ~22 cảng + 7 thành phố + 8 chi nhánh.
- Renderer SVG dùng chung bờ biển/khung với `routeMap`. Bản đồ Việt Nam lấy tọa độ đã có của `CITIES`/`BRANCHES`.
- Tab và trang, i18n khoảng 20 khóa, kiểm a11y bằng axe.

**Ngân sách:**

- Chunk lười mới `geomap` ≤ 8 KB, nạp khi mở tab hoặc trang.
- Bờ biển nhập từ chunk `art` (đã được nạp trước lúc rảnh).
- Main thêm khoảng 0,5 KB: đăng ký tab + bảng khóa để quyết định bật tab.

**Rủi ro:**

- Nhận dạng sai cột (một cột số không phải số đo). Giảm bằng cách: lấy cột số đầu tiên, cho đổi cột bằng `<select>`, không đoán ẩn.
- Chấm chồng nhau ở Đà Nẵng/Liên Chiểu/Hội An → dùng tọa độ cách điệu đã giãn và viền trong suốt (Axis Maps).
- New York nằm ngoài khung.
- Người chơi chưa biết GROUP BY sẽ ít khi bật được tab. Chấp nhận được: Sandbox và trang có câu hỏi gợi mở; với người mới, tab sáng lên ở ch2 là một mốc tốt.

### Hướng B: "Atlas điều tra": lớp bản đồ mở bằng việc đã giải và một nhiệm vụ trên bản đồ mỗi domain

**Người chơi thấy và làm gì:**

- Trang Bản đồ là một atlas các **lớp**. Mỗi lớp là một việc đã giải có Solution dạng bản đồ (khoảng 21 việc ở §1.4), khai báo trong `content/.../maplayers.yml` (`ticket`, kiểu vẽ, nhãn VI/EN).
- Giá trị tính lúc chạy từ Solution trên DB, giống hệt `kpiValue`.
- Lớp chưa mở chỉ hiện câu hỏi nghiệp vụ, không có SQL, không có số.
- Bật hai lớp để so sánh, ví dụ "Ngày đi biển" cạnh "Giá mua trước/sau 15/07" (đề xuất của SERC: so sánh hai bản đồ cùng vùng).
- Mỗi domain thêm **một nhiệm vụ bản đồ** dựa trên hook có sẵn:
  - E-com "Điểm nóng giao trễ" (E4);
  - Finance "Quang Ngai đang trượt" (H1, thanh tháng);
  - Logistics "Châu Âu đắt lên" (GRI).
- Nhiệm vụ là một bài tuyến/bài phụ thật (cùng grader). Giải xong thì lớp tương ứng sáng lên.

```
Atlas · Finance                                  [Lớp: ☑ Nợ quá hạn >30 ngày  ☐ Ngân sách Marketing]
  Dong Ha ●1,7   Hue ●1,8   Lien Chieu ●1,4  Da Nang ●3,4  Hoi An ●2,0  Tam Ky ●1,6  Quang Ngai ●14,2  Quy Nhon ●1,7
  Tháng: 06 ──●──────── 10      (range, người chơi kéo)
  Lớp chưa mở: "Chi nhánh nào chi Marketing vượt ngân sách quý 3?" (mở khi xong F5-03)
```

(Ô đánh dấu ở phác thảo là `<input type="checkbox">`, không phải emoji.)

**Giá trị học:**

- Gợi nhớ: xem lại điều câu SQL của mình đã chứng minh, ở dạng khác.
- Cho phép so sánh.
- Nhiệm vụ bản đồ dạy đúng thói quen của analyst: thấy pattern trên hình → viết câu lọc → xác nhận.

**Kỹ năng:** như hướng A, cộng với kỹ năng của từng Solution.

**Dữ liệu:** Finance mạnh (9 Solution), E-com vừa (4). **Logistics yếu**: không có lớp nào trước ch6, nên cần 2–3 bài tuyến mới cho Shanghai, Laem Chabang, Busan, Los Angeles (đang "đợt sau").

**Không lộ đáp án:** đạt, vì chỉ dùng Solution đã giải (mẫu `kpiTiles`).

**Chuyển động:** bật lớp thì mờ dần 300 ms. Mở lớp mới (lần đầu sau khi giải) chạy hoạt cảnh mở khóa một lần (`stamper().fresh/spend` như lộ trình học).

**Khối lượng:** L, khoảng 8–10 ngày.

- Renderer như A.
- `maplayers.yml` + parser + test (mỗi lớp chạy được, khớp khóa).
- 3 nhiệm vụ VI/EN có biến thể (khoảng 3 ngày nội dung).
- 2–3 bài tuyến Logistics mới.

**Ngân sách:**

- `geomap` khoảng 8 KB.
- Nội dung vào chunk `lanes`/`fin`/`ecom`. Lưu ý `ecom` còn 9,7 KB trống, `fin` đã phải tách (L181, L185).

**Rủi ro:**

- Phụ thuộc nội dung, Logistics đầu game trống.
- Atlas vẫn là nơi "xem lại", ít khi người chơi tự viết SQL ở đó.
- Nhiều việc đã giải sẽ chạy lại Solution (giống thẻ dashboard, chạy tuần tự từng câu).

### Hướng C (mốc so sánh): gộp, bỏ mục điều hướng

**Làm gì:**

- Bỏ mục "Bản đồ" khỏi thanh bên.
- Logistics: danh sách tuyến và hồ sơ tuyến chuyển xuống Tổng quan (dưới cảnh cảng), hộp thoại bản đồ trong workspace giữ nguyên.
- E-com/Finance: bỏ trang. Hình bản đồ vẫn có trong dock hoàn thành.
- Bỏ khóa chi nhánh/thành phố "giả", hoặc đổi chữ thành "chưa ghé" để khỏi mâu thuẫn với dữ liệu.

**Giá trị học:** không thêm gì. Bớt một chỗ trang trí gây xao nhãng (coherence principle), bớt một nơi phải bảo trì.

**Khối lượng:** S, khoảng 0,5–1 ngày (route `map` giữ làm bí danh về Tổng quan, test router/nav, smoke).

**Ngân sách:** giảm nhẹ.

**Rủi ro:** mất cảm giác "thế giới mở rộng". Bài tuyến khó tìm hơn nếu đặt không khéo.

---

## 5. Khuyến nghị: chọn hướng A, gộp phần dễ của C vào cùng đợt

Lý do:

1. Đây là hướng duy nhất mà **mọi câu SQL** của người chơi, ở cả ba domain, đều có thể thành bản đồ. Bản đồ trở thành hình dạy (Sung & Mayer), đặt cạnh bảng (Ainsworth). Đây cũng là cách công cụ thật làm (BigQuery: tab Visualization của kết quả).
2. Không lộ đáp án ngay từ thiết kế. Không cần nội dung mới, không đổi seed, không đổi Save.
3. Dữ liệu đã có đủ điểm nóng (§1.4) để câu hỏi gợi mở trên trang có câu trả lời thật.

**Phạm vi đợt 1** (khoảng 6 ngày dev + 1 ngày duyệt bằng mắt):

- tab Bản đồ cho ba domain;
- trang "Bản đồ kết quả" có 3 câu hỏi gợi mở mỗi domain;
- chunk `geomap`;
- danh sách tuyến Logistics và hồ sơ tuyến chuyển xuống Tổng quan (phần C);
- bỏ khóa giả ở E-com/Finance;
- đồ hình đẹp của L117–L120 giữ ở Tổng quan và dock.

**Đợt 2 (tùy chọn):** ba nhiệm vụ bản đồ của hướng B, chạy trên renderer của A, và loại thẻ dashboard `map` (thêm vào `CARD_KINDS`/`KIND_SKILL`; kiểm `readDashboard` để bản cũ bỏ qua loại lạ, không cần field mới).

**Cách đo đợt 1:**

- Trong smoke, một kịch bản E-com chạy câu gộp → bản đồ phẳng; thêm WHERE → Hue/Nha Trang/Da Nang lên bậc cao nhất.
- Axe không có lỗi serious.
- Ở 375 không cuộn ngang.

## 6. Cần user quyết

- **D-M1.** Chọn A (khuyến nghị), B hay chỉ C?
- **D-M2.** Có bỏ khóa thành phố/chi nhánh theo chương ở E-com/Finance không? Khóa là luật game nhưng trái với dữ liệu.
- **D-M3.** New York: nới khung bản đồ L119 (đổi tỉ lệ 5:2) hay vẽ mũi tên ở mép?
- **D-M4.** Mục nav "Bản đồ" có giữ tên không, hay đổi thành "Bản đồ kết quả"? `NAV_ICON` vẫn là `map`.
