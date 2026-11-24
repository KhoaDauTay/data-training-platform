# Review v30: UI/UX + Product trên site live (2026-11-24)

Người viết: reviewer cuối trước khi chốt v30 (hai vai: UI/UX designer và Product designer). Đối chiếu với `ux-route-v24.md`, `product-route-v24.md`, `ux-deploy-checklist.md`, `v24-mockups/`, CLAUDE.md và `review-v30.md`.

## 0. Phạm vi và cách xem

- **Site live** `https://khoadautay.github.io/data-training-platform/` (v30), một Edge headless qua CDP, script dùng một lần ngoài repo: `C:\Users\khoa.huynh\Documents\study\bd-wt\review-v30\shoot.mjs` (lượt 1) và `pass2.mjs` (lượt 2). Mỗi lần khởi động là một hồ sơ mới, khởi động lại trình duyệt sau ≤ 13 trang, không còn tiến trình Edge nào sau khi chạy.
- **Cỡ:** 1280×800 sáng và 375×812 tối. Không chụp 1024, 320, VI ở theme tối 1280, giảm chuyển động.
- **Trạng thái:** người chơi quay lại (`tests/fixtures/save-v5.json` + `cargo-query/tour` `{step:8,knows:false}` + `coach-done`); người mới (`#/`, `#/learn`, `#/engine`, `#/me`, `#/practice`, có và không có hộp thoại chào). **Fixture không có tiến độ Engine**, nên mọi trang Engine, hàng Engine trên bản đồ kỹ năng và huy hiệu Engine thực chất là trạng thái người mới. Không thấy được huy hiệu ở trạng thái "đã có".
- **Thao tác trong bài** (chỉ nút Chạy/Nộp/Kiểm tra của app): chạy bước 1 của `e-mg-l3-12` (Pipeline từng bước, cả Nộp lẫn Chạy thử), `e-dy-l1-09` (panel Partition/Chi phí), mở popover thuật ngữ đầu tiên (`e-pg-l2-01`, `e-pg-l2-02`), trả lời tình huống 1 của `#/engine/compare`. Phòng phỏng vấn Engine: mở bộ `pg-junior-1` và bấm Bắt đầu (lượt 3), không trả lời.
- **Ngôn ngữ:** VI là chính; EN chụp 7 trang (bài LEFT JOIN, `#/engine`, compare, terms, thẻ BP `e-bp-i04`, `#/me`, `e-ds-l1-01`) nhưng chỉ mở xem 3 (LEFT JOIN, `#/engine`, `#/me`); EN chưa được review đầy đủ.
- **Lượt 3** (`pass3.mjs`, `shots3\`): đo tràn ngang theo đúng biểu thức của `smoke.mjs` (`#home.scrollWidth − clientWidth`) trên 27 trang ở 375, kể cả `#/engine/postgres/L2` và hai trang lab **sau khi** Chạy/Nộp; truy DOM nút trong bài Engine (`e-dy-l1-01`, `e-mg-l1-01`, `e-pg-l1-01`); nhãn rail; bấm "Chạy hết" sơ đồ pipeline; bấm Bắt đầu một bộ phỏng vấn.
- **Ảnh đã mở xem:** khoảng 60 trên ~230 ảnh: mọi trang ở 1280 (trang dài: các phần có nội dung chính), các trang 375 của bài General, `#/engine`, `#/me`, compare, terms, Best Practice, lab Dynamo, Lộ trình, Trang chủ; EN: bài LEFT JOIN, `#/engine`, `#/me`; người mới: `#/`, `#/me`, `#/practice`. **Chưa mở:** phần sau của nhiều ảnh 375 (`*-p3`, `*-p4`), EN compare/terms/BP/`e-ds-l1-01`, `new-learn`, `new-engine`, `design-375`. Các trang đó chỉ có kết quả đo tự động.
- **Ảnh chụp:** ảnh dài được chụp bằng cách nới chiều cao viewport (trang cuộn trong vùng con), nên thanh dính/mục lục dính không phản ánh lúc dùng thật; không kết luận gì về độ dính.
- **Đo tự động trên mỗi trang** (ở viewport thật, trước khi nới): lỗi console/exception/log (kể cả worker; đã thử `console.error('probe')` để chắc bộ bắt hoạt động), tràn ngang (cuộn của trang, vùng cuộn con, và hộp vượt `innerWidth` ngoài vùng cuộn, theo cách `ux-audit.mjs`), số nút chính (`bg-accent` đặc) trong `#home`, chữ "chứng nhận/certificate" trong DOM của `#/me`.

## 1. Kết luận

**GO có sửa (GO with fixes)** cho "v30 là bản ổn định".

Lý do: những gì v25–v30 thêm mà chưa ai xem trong trình duyệt đều **chạy được** trên site live: bài đầy đủ 8 mục (General), popover thuật ngữ, Pipeline từng bước, panel chi phí DynamoDB, thẻ engine thứ tư, trang so sánh, glossary, phòng phỏng vấn, Best Practice Mongo/Dynamo. **0 lỗi console** trên 25 trang × 2 cỡ (cộng lượt 2 và 3), không tràn ngang cấp trang ở 375 (một trang tràn bên trong `#home`: F28), chứng nhận đã thật sự biến mất (DOM `#/me` chỉ còn đúng câu "Chứng nhận đã được thay bằng huy hiệu đo mức hiện tại."). Không có P1.

Nhưng có một loạt P2 về **tính nhất quán** (bài Engine chưa theo giải phẫu UI của bài General; hai thang đo kỹ năng trên `#/me`; số 38/43, 11/12 Phần) và **lỗi hiển thị nội dung** (dấu backtick thô), nên đề xuất một v30.1 nhỏ trước khi gọi là ổn định lâu dài. Không cái nào làm hỏng tiến độ hay chặn người học.

Đếm: **P1 0 · P2 12 · P3 17**.

## 2. Phát hiện

Chủ: UI = UI/UX, Prod = Product. Ảnh: `S1\` = `C:\Users\khoa.huynh\Documents\study\bd-wt\review-v30\shots\`, `S2\` = `...\shots2\`.

| ID | Trang | Cỡ | Mức | Thấy gì | Vì sao (luật / tài liệu) | Đề xuất sửa | Chủ |
|---|---|---|---|---|---|---|---|
| F01 | Bài Engine (mọi engine; `e-pg-l2-17`, `e-ds-l1-01`, `e-mg-l3-12`, `e-dy-l1-09`; truy DOM `e-dy-l1-01`, `e-mg-l1-01`, `e-pg-l1-01`) | cả hai | P2 | Bài Engine theo 8 mục về **nội dung** nhưng UI vẫn là kiểu v22: không mục lục "Trong bài này", không huy hiệu icon ở `h2`, khối "Ví dụ"/"Lỗi hay gặp" là code tĩnh **không có nút Chạy** (DOM: nút trong bài chỉ là thuật ngữ, Chạy thử/Nộp của lab, Kiểm tra). Trường `demo_setup` đã viết cho `e-dy-l1-01..04`, `e-mg-l1-01`, `e-dy-l2-01` nhưng **không file nào trong `src/` đọc nó**, trong khi hàng chip ghi "Chạy thật · PostgreSQL 18.6 (PGlite)". Bài General ngay cạnh có đủ cả ba. Cột đọc rộng ~850 px thay vì 720. | ux-route-v24 §5.1–§5.4 (một thiết kế cho cả General và Engine); L404 ghi "Nút Chạy cho khối Ví dụ, mục lục trong bài chưa làm" nhưng `review-v30.md` §5 **không** liệt kê. Người học đi General → Engine thấy hai kiểu bài; "Chạy thật" ở đầu bài làm họ tìm nút Chạy không có | Đưa `lessonPage` (mục lục, `SectionHead`, `RunBlock`) sang `engineView` (cần tách chunk, `engineui` đã 20/20 KB). Trước mắt: ghi mục này vào việc mở của review-v30 §5, và đổi chip đầu bài Engine thành nhãn của phần lab ("Lab chạy thật …") để không hứa chạy ví dụ | UI |
| F02 | Bài General (bảng Cú pháp) | cả hai | P2 | Dấu backtick thô trong ô bảng: "trong \`DO UPDATE\`: giá trị cũ…" (`upsert`), EN "swap the tables to get a \`LEFT JOIN\`" (`left_join`). DynamoDB: dòng thanh chi phí "Đo bằng \`ScannedCount\` và \`ConsumedCapacity\`… (ví dụ \`Scan\` + bộ lọc)". Phòng phỏng vấn Engine: tên take-home "Chia bảng \`orders\` khi lên hàng tỷ dòng" | Ô bảng và câu mô tả thanh không qua bộ dựng inline code; lỗi lặp lại ở nhiều bài, CI không bắt được | Cho ô bảng "Nghĩa là" và câu `bar`/rule đi qua cùng hàm dựng inline code như đoạn văn; thêm test: không chuỗi hiển thị nào còn cặp backtick | UI |
| F03 | `#/me` | cả hai | P2 | Hai thang đo kỹ năng cạnh nhau: "Độ vững kỹ năng" (mức nhớ 1–5, thanh màu) và "Bản đồ kỹ năng" (0–4 chấm); `#/practice` còn ghi "Mức nhớ 3/5" dưới từng kỹ năng. "Nên làm tiếp: Lọc dòng (WHERE) (mức 2/5)" trong khi bản đồ vẽ WHERE 1/4 + "Cần ôn" | product-route §1.7: mức 0–4 là thước đo duy nhất; người học không biết tin số nào | Bỏ thẻ "Độ vững kỹ năng" (hoặc gập vào bản đồ như chi tiết "hộp ôn"), đổi "Nên làm tiếp" sang tên mức 0–4 ("Lọc dòng: Đã gặp · Cần ôn") | Prod |
| F04 | `#/`, `#/learn` | cả hai | P2 | Cùng một người chơi: Trang chủ "Kỹ năng SQL: đã học 6/38", `#/learn` "Đã học 6/43 kỹ năng" (bản đồ kỹ năng vẽ 43 hàng) | Lộ trình 11 Phần có 43 kỹ năng (route.yml); 38 có thể là "38 kỹ năng nền" nhưng không có nhãn nói vậy | Cùng một mẫu số, hoặc ghi rõ "38 kỹ năng nền" | Prod |
| F05 | `#/engine`, `#/engine/mongodb/path` | cả hai | P2 | Hàng Lộ trình NoSQL: "Kỹ năng MongoDB xếp theo **12 Phần** của lộ trình SQL", trong khi lộ trình SQL từ v24 có **11 Phần** | product-route §1.1 (11 Phần); `src/i18n/engine.ts` `nosql.short`, `path.intro` (VI + EN) | Viết lại "theo các Phần của lộ trình SQL" hoặc ánh xạ đúng 11; kiểm lại tên Phần trong path index | Prod |
| F06 | `#/` người mới | 1280, 375 | P2 | Trang chủ người mới chỉ có một nút chính "Mở việc này" (việc Logistics) và một hàng nhỏ "Kỹ năng SQL: đã học 0/38". Không có lối vào Engine, không nói lộ trình General → Engine | product-route: lộ trình chính là General SQL Phần 1–11 → Engine; trang chủ hiện chỉ dẫn vào domain | Hàng "Kỹ năng SQL" thành thẻ "Lộ trình học" hai dòng (SQL 0/43 · Engine 0/252) dẫn `#/learn`; giữ một nút chính | Prod |
| F07 | `#/me` người mới | cả hai | P2 | "Bạn chưa học kỹ năng nào. Bắt đầu từ Lộ trình: **một bài học nhanh và ba bài luyện** cho mỗi kỹ năng." | Từ v24 mỗi kỹ năng có bài đầy đủ 8 mục và **4** bài luyện (`me.ts` `skills.none`) | "…một bài học đầy đủ và 4 bài luyện cho mỗi kỹ năng." (VI + EN) | Prod |
| F08 | `e-mg-l3-12` (sơ đồ "Pipeline tổng hợp") | 1280 | P3 | Sơ đồ ghi `orders` 1000 tài liệu (→ 610 → 12), còn lab ngay dưới có `orders` 7 tài liệu. (Khung cao cố định ở bước 1/6 có chỗ trống, nhưng "Chạy hết" lấp đầy khung và giữ nút đứng yên theo checklist A5: không phải lỗi.) | Hai con số cho cùng "orders" gây nhầm | Một dòng dưới sơ đồ: "dữ liệu minh họa 1000 tài liệu, khác bảng lab" | Prod |
| F09 | `#/engine` | 375 | P2 | Hàng Best Practice và Lộ trình NoSQL: nút "Mở Best Practice"/"Mở lộ trình" chiếm hơn nửa hàng, chữ mô tả còn ~70 px, xuống dòng từng chữ ("Best / Practice / 130 thẻ · / SQL, / PostgreSQL, …") | review-v23 P3 "hàng lộ trình NoSQL ở 375" vẫn mở; nay lan sang hàng Best Practice | Dưới 640 px đặt nút xuống dòng dưới chữ (hoặc cả hàng là link như các hàng "Tra cứu và luyện tập" ngay dưới) | UI |
| F10 | Rail sidebar Engine | 1280 | P2 | Bốn icon ngôi sao giống hệt nhau xếp liền, không chữ ở rail (nhãn DOM: "Best Practice · SQL", "· PostgreSQL", "· MongoDB", "· DynamoDB") | CLAUDE.md "One icon = one destination"; rail chỉ có icon nên bốn đích không phân biệt được | Một mục "Best Practice" ở rail (trang `#/engine/best` đã có tab), hoặc ghép icon engine + sao | UI |
| F11 | `#/learn` (guide G1) | cả hai | P2 | Boon: "Đây là Lộ trình: **bên trái** là SQL nền tảng, **bên phải** là phân tích nâng cao." Trang v24 xếp SQL nền tảng thành lưới 11 Phần và Nâng cao ở dưới, không có trái/phải | Chữ guide không theo bố cục v24 (§6.1) | "Phía trên là 11 Phần SQL nền tảng, phía dưới là phần nâng cao" | Prod |
| F12 | Glossary/thuật ngữ, điều hướng | — | P2 | Không có tìm kiếm (Ctrl K) nào trên Lộ trình/Engine; glossary chỉ vào được từ Engine (General có sổ tay riêng). Với ~300 bài + 296 thuật ngữ, người học chỉ tìm được bằng cách nhớ vị trí | ux-route §4.4; L338 ghi "Chưa làm ở R0: hộp tìm"; `review-v30.md` §5 không liệt kê | Ghi vào việc mở; tối thiểu: ô lọc của `#/engine/terms` cũng có ở `#/learn` (lọc tên bài) | Prod |
| F13 | Capstone `e-pg-l2-17`, lab nhiều bước | 1280 | P3 | Cả 5 bước dựng sẵn editor CodeMirror (mỗi cái ~100 px trống) | ux-route §5.3 mục 6: chỉ bước hiện tại dựng editor | Bước sau: đề + "Làm sau bước n" | UI |
| F14 | `#/engine/terms` | cả hai | P3 | 296 thẻ, mỗi thẻ ~190 px: trang ~55.000 px, không mục chữ cái, không nút về đầu | Mật độ (ux-route §1 nguyên tắc 4) | Dạng danh sách gọn (tên + một dòng), mở chi tiết tại chỗ; mục A–Z dính | UI |
| F15 | `#/engine/terms` | cả hai | P3 | Bộ lọc engine ghi "Design" (tiếng Anh) trong trang VI; chỗ khác ghi "Thiết kế CSDL" | VI/EN | Dùng nhãn engine chung | UI |
| F16 | Nhãn trung thực | — | P3 | Ba cách nói cho cùng một ý: "Chạy thật · PostgreSQL 18.6 (PGlite)" (bài), "Chạy thật · dynoxide 1.5.0" (thẻ BP), "Chạy trong trình duyệt" (compare), "Chạy được" (hàng bài). Chip compare có icon ▷ trông như nút bấm | product-route §2.4 (một bộ nhãn) | Một bảng nhãn chung; chip không dùng icon play | Prod |
| F17 | `e-dy-l1-09`, `e-mg-l3-12` | cả hai | P3 | Chữ bài nói "trong **tab** Kết quả", "Mở **tab** 'Pipeline từng bước'", nhưng trang bài không có tab (kết quả và bảng nằm dưới bước) | Chữ theo UI cũ của workspace | Đổi thành "dưới kết quả" | Prod |
| F18 | `e-dy-l1-09` panel chi phí | 1280 | P3 | Capacity hiện hai lần (khối Bảng/Đã quét/Trả về/Capacity và "Đo thật"); dòng "Chia ra: bảng 0,5 · –" kết thúc bằng gạch | Lặp; "–" không nói gì | Bỏ dòng Capacity ở khối trên khi panel có; ẩn phần GSI khi không có | UI |
| F19 | `#/practice` người mới | cả hai | P3 | Hai nút chính đặc gần như cùng chữ: "Bắt đầu Phần 1" (thẻ Ôn tập) và "Bắt đầu từ Phần 1" (thẻ Bài luyện), cộng nút "Xong" của guide | Một `BTN_GO` mỗi vùng; trùng việc | Thẻ Ôn tập rỗng: chỉ câu giải thích, không nút | UI |
| F20 | `#/me` Portfolio | cả hai | P3 | Ba nút đặc "Tải portfolio …" trong một thẻ (+ "Ôn 1 kỹ năng cần ôn" ở thẻ khác: 4 nút đặc một trang) | Một `BTN_GO` mỗi vùng | Ba nút tải dùng `BTN_SECONDARY` | UI |
| F21 | `#/me` EN | 1280 | P3 | "Review 1 skills that need it" | EN plural (CLAUDE.md: function messages) | `map.review` thành hàm số nhiều | UI |
| F22 | `#/me` Bản đồ kỹ năng, Engine | cả hai | P3 | Mọi ô L1–L5 ghi "Chưa mở" dù Engine không khóa gì | "Mở" gợi ý bị khóa | "Chưa bắt đầu" | Prod |
| F23 | `#/me` Huy hiệu | 1280 | P3 | 37 ô chưa đạt đều có viền liền và icon `seal-check` (dấu đã kiểm) — nhìn như đã đạt; câu điều kiện chỉ hiện khi rê/bấm. Không xem được trạng thái "đã đạt" (fixture 0/37) | ux-route §11 `BadgeTile`: chưa đạt = viền đứt + icon mờ | Kiểm lại màu viền/icon ô chưa đạt; một dòng điều kiện ngắn dưới nhãn ở máy tính | UI |
| F24 | `#/engine/postgres/L2` (trang cấp) | 1280 | P3 | Vẫn là hàng 76 px với chữ "Mở" bên phải, không chip lọc, không gập nhóm xong; trang Phần General đã có những thứ này (L338). Phụ đề "Mọi loại index, tìm kiếm toàn văn…" trong khi ba mô-đun đầu là hàm, quyền, trigger | ux-route §6.2 | Dùng `DenseRow`/chip lọc của trang Phần; sửa phụ đề L2 | UI / Prod |
| F25 | `#/engine/compare` | 375 | P3 | Bảng "Nhãn từng ô" chỉ thấy cột PostgreSQL, hai cột sau phải cuộn ngang (có thanh cuộn), chữ chip bị cắt ở mép | Không tràn trang (đã đo) nhưng ý chính của bảng (so sánh) mất ở điện thoại | Dưới 640 px: mỗi trục một hàng ba chip xếp dọc | UI |
| F26 | Câu hỏi kiểm tra (General) | 1280 | P3 | Tiêu đề câu ("Câu 1/3 · …") là `legend` nằm đè lên viền trên của thẻ | Nhìn như chữ bị gạch | Legend ra ngoài khung hoặc thẻ có padding-top | UI |
| F28 | `#/engine/terms` | 375 | P2 | `#home.scrollWidth − clientWidth` = **123 px** (biểu thức của smoke); ảnh không lộ rõ phần tử nào tràn | Trang không được cuộn ngang ở 375 (CLAUDE.md, smoke V20-C) | Tìm phần tử (có thể là popover/thẻ ẩn đặt ngoài màn) bằng `ux-audit` ở 375 | UI |
| F29 | Trang có vùng cuộn `#home` | 1280 | P3 | Hai lần `scrollIntoView` (mở popover, bấm "Chạy hết") làm cả tài liệu cuộn ~20 px: top bar bị đẩy lên, hiện thanh cuộn của trang | Shell một màn không nên để tài liệu cuộn | `overflow: hidden` ở `html/body`, hoặc cuộn trong `#home` thay vì `scrollIntoView` của tài liệu | UI |
| F27 | Phòng phỏng vấn | — | P3 | Có hai phòng phỏng vấn: "Phòng phỏng vấn" (Luyện SQL) và "Phỏng vấn Engine" (`#/engine/interview`), hai cách chấm khác nhau, không trang nào nhắc trang kia | Điều hướng: người học không biết có hai | Mỗi phòng một dòng "Phòng kia: …" | Prod |

## 3. Những gì làm tốt

- **Bài kỹ năng General** (`select`, `upsert`, `sargable`, `left_join`) rất gần mockup 03/07: đường dẫn, dòng mức "tự đo, không xác minh", mục lục 232 px có đếm "0/4", huy hiệu icon từng mục, ví dụ đọc sẵn có Chạy + Sửa thử, ví dụ 2+ gập, bẫy có chip Sai/Sửa và chạy được, Thực hành là chỗ duy nhất có editor dựng sẵn, Bài trước/Bài tiếp có tên bài. Ở 375: thanh bài "‹ Phần 1 · Đọc bảng | 1/8 · Mở bài", mục lục `<details>` trong thân, bảng cú pháp không tràn.
- **Popover thuật ngữ** mở dưới nút ở 1280, thành bảng dưới ở 375; có tên EN + VI, cấp, link trang thuật ngữ và docs, nút Đóng.
- **Pipeline từng bước** và **So với SQL** (MongoDB): bảng stage → mệnh đề SQL → số tài liệu, câu SQL tương đương chỉ hiện sau khi đạt. **Panel Partition/Chi phí** (DynamoDB) tách rõ ba tầng "Đo thật / Theo luật AWS / Minh họa" + "Không đo được trong trình duyệt": đúng tinh thần trung thực.
- **Thẻ engine thứ tư** cùng khuôn với ba thẻ kia (huy hiệu tròn, ô L1–L5, "Bắt đầu bài · L1"), có dòng "Phần lưu trữ và index: đào sâu ở PostgreSQL L3–L5". Lưới 2×2 ở 1280, xếp dọc ở 375.
- **Trang so sánh**: chú giải nhãn ở đầu, mỗi ô có nhãn riêng, "Bằng chứng" ghi "Đo trong trình duyệt" hoặc link tài liệu; tình huống trả lời sai nói "Chưa đúng, thử lại một lần" (không lộ đáp án).
- **Huy hiệu thay chứng nhận**: thẻ có câu "Tự đo, không xác minh · mất khi mức tụt"; domain ghi "công ty hư cấu"; DOM `#/me` không còn chữ chứng nhận nào khác.
- **Người mới**: `#/me` không có ô trống gây lo (câu dẫn "Nên làm tiếp: Mở Lộ trình"), bản đồ 43 kỹ năng mức 0 đọc được.
- Phòng phỏng vấn Engine: bấm Bắt đầu ra câu 1/5 có chấm tiến độ, ô trả lời, "Viết trước rồi mới xem" (đúng tinh thần tự nhớ).
- Kỹ thuật: 0 lỗi console, không tràn ngang cấp trang ở 375, theme tối đọc tốt (thẻ bẫy, chip trung thực, code).

## 4. Lỗi console và tràn ngang

| Lượt | Trang × cỡ | Lỗi console / exception / log (gồm worker) | Tràn ngang 375 (`scrollWidth`, vùng cuộn con, hộp vượt viewport) |
|---|---|---|---|
| 1 (`shots\report.json`) | 25 × {1280 sáng, 375 tối} | 0 | 0 (chỉ đo cấp tài liệu, không thấy tràn trong `#home`) |
| 2 (`shots2\report.json`) | 22 trang + popover + Pipeline + 3 bài (không guide) + 7 EN + 5 người mới, × 2 cỡ | 0 (thử bộ bắt bằng `console.error` lúc khởi động: bắt được ở cả 10 lần khởi động; lỗi lúc nạp lần đầu: 0) | 0 cấp tài liệu; bộ lọc vùng cuộn con của lượt này bỏ sót `#home`, thay bằng lượt 3 |
| 3 (`shots3\report3.json`) | 27 trang ở 375, `#home` theo biểu thức smoke, gồm 2 lab sau Chạy/Nộp | 0 | **1**: `#/engine/terms` `#home` +123 px (F28); còn lại 0 |

## 5. Danh sách sửa đề xuất cho v30.1 (theo thứ tự)

1. **F28** tràn 123 px trong `#/engine/terms` ở 375.
2. **F02** dấu backtick thô (ô bảng Cú pháp, câu thanh DynamoDB, tên take-home) + test chặn. Nhỏ, thấy ngay.
3. **F04, F05, F07, F11** sửa số và chữ cũ (38/43, 12→11 Phần, "ba bài luyện", "trái/phải"). Chỉ chuỗi i18n.
4. **F03** một thước đo kỹ năng trên `#/me` và `#/practice` (bỏ hoặc gập "mức nhớ 1–5").
5. **F09, F10** hàng Best Practice/NoSQL ở 375; một icon Best Practice ở rail.
6. **F01, F12** ghi vào `review-v30.md` §5 là việc mở (bài Engine chưa có mục lục/Chạy ví dụ, `demo_setup` chưa được đọc; chưa có tìm kiếm); đổi chip đầu bài Engine để không hứa nút Chạy. Phần làm thật (đưa `lessonPage` sang Engine) cần tách chunk, để sau.
7. P3 khi có dịp: F08, F13–F27, F29.

Kiểm sau khi sửa: `npm run ux-audit` + `npm run smoke` trên site live (đúng là phần user đang tạm cấm; khi được phép, ưu tiên ux-audit ở 1024 và 320, hai cỡ lượt này không chụp).

## 6. Ảnh

Không đưa vào repo. Đường dẫn cục bộ:

- Lượt 1: `C:\Users\khoa.huynh\Documents\study\bd-wt\review-v30\shots\` (`<trang>-<1280-light|375-dark>[-pN].png`, `report.json`)
- Lượt 3: `C:\Users\khoa.huynh\Documents\study\bd-wt\review-v30\shots3\` (`mg-viz-runall-*`, `interview-started-*`, `report3.json`)
- Lượt 2: `C:\Users\khoa.huynh\Documents\study\bd-wt\review-v30\shots2\` (popover `pg-l2-02-term-*`, Pipeline `mg-l3-12-run-*`, bài không guide `*-noguide-*`, EN `en-*`, người mới `new-*`, `report.json` có tràn ngang, số nút chính, chữ chứng nhận)
- Script: `C:\Users\khoa.huynh\Documents\study\bd-wt\review-v30\shoot.mjs`, `pass2.mjs`, `pass3.mjs`

## Trạng thái sau v30.1 (2026-11-24)

Sửa trong v30.1 (nhánh `v301-engine` + `v301-fixes`, decision-log L480–L490):

- **Đã sửa:** F01 (bài Engine dùng bố cục bài đầy đủ: mục lục, khối Ví dụ / Lỗi hay gặp chạy được trên runtime của bài, chunk `engineFull`), F02, F03 (một thang đo kỹ năng 0–4; hộp Leitner gọi là "Lịch ôn"), F04, F05, F06, F07, F08, F10, F11, F12 (tìm kiếm Ctrl/⌘K, chunk `palette`), F13, F14, F16, F17, F18, F19, F20, F21, F22, F27.
- **Đã sửa, chưa xem bằng mắt** (CSS/bố cục; jsdom không có layout, luật no-e2e): F09, F23, F25, F26, F28 (`wrap-anywhere`, nguyên nhân 123 px còn là phỏng đoán), F29.
- **Sửa khác đề xuất:** F15 (bỏ bộ lọc "Design" vì glossary không có thuật ngữ nào của thẻ thiết kế).
- **Còn mở:** F24 phần hàng dày và chip lọc ở trang cấp Engine; F01 phần điện thoại (thanh bài dính, sheet mục lục), "Sửa thử" và tô màu cú pháp cho ví dụ Engine (L484).
