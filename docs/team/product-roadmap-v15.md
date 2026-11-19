# Product Roadmap v15–v17: làm gì tiếp sau Finance (BoonData)

**Trạng thái: ĐỀ XUẤT, chờ user duyệt §7.**

Ngày: 2026-11-19 · Vai trò: Product Designer · **Chỉ đề xuất**: không sửa `src/`, `content/`, test hay `decision-log.md`. Song song có `ui-ux-v7.md` (agent UI/UX, chưa có lúc viết). Tài liệu này chọn **việc gì và thứ tự**; cách vẽ từng màn để `ui-ux-v7.md` quyết.

Yêu cầu của user (giữ ý): *"Product Agent, UI/UX suy nghĩ thêm về việc phát triển tiếp theo."*

Đầu vào:
- `CLAUDE.md` (sau v14).
- `product-design-v7.md` … `v9.md` (đọc kỹ); `v2`–`v6` và `product-design.md` chỉ quét theo từ khóa (leaderboard, tài khoản, PWA, pandas, placement, tuyến tính). Phần cần nhất: v7 §5 (chia sẻ), §7 (insights), §2.5 (spike S-a); v8 (khung gợi ý); v9 (Finance).
- `decision-log.md` tới L131. Phần cần nhất: L55 (không DB dựng sẵn), L81 (duyệt v12), L82 (General tách domain), L84 (bài học chạy trên `lab`), L131 (lỗi để lại của v14).
- `review-log.md`: các mục "Để lại", v14 T7.
- `curriculum.md`, `amendments.md` (D6: miễn phí, không backend), `devops.md` §Giai đoạn 1–2 (analytics chưa bật).
- `content/general/adv.yml`: D1–D8 đều `external`, gồm Excel, BI, Python/pandas.
- **Chơi thử bản build hiện tại** (§1). Ảnh trong scratchpad `roadmap\`.

**Mọi cỡ việc và mọi KB trong tài liệu là ước lượng, chưa đo.** Cỡ việc tính bằng ngày làm của agent, gồm test và review: S ≤ 1 ngày, M 2–4 ngày, L 1–2 tuần, XL > 2 tuần.

**Không có telemetry.** Site chạy trên GitHub Pages, không bật analytics (devops §Giai đoạn 1 chưa làm). Vì vậy mọi chỉ số thành công dưới đây thuộc một trong ba loại:
- một test,
- một số đo ghi vào `review-log.md`,
- một buổi chơi thử với người thật.

Tài liệu không đặt chỉ số kiểu tỉ lệ giữ chân hay chuyển đổi.

---

## 0. Tóm tắt một trang

| Chủ đề | Đề xuất | Cỡ |
|---|---|---|
| Ma sát lớn nhất (chơi thử) | **General và domain còn rò sang nhau.** Người chọn "Chỉ học SQL" làm drill ở `#/d/logistics/play`, thấy pill Logistics và sidebar Logistics. Trang chủ mời "Tiếp tục: … · Logistics". Thẻ kỹ năng ghi cú pháp trên bảng `ports` ở mọi nơi. Sổ tay ở E-com hiện mã thô `ecom-ch1-02` (§1). | — |
| Người học còn thiếu | Bốn thứ: (1) **bằng chứng tiến bộ** (insights, chứng nhận, portfolio: v12.2 đã duyệt nhưng chưa build); (2) **chuẩn bị đi làm** (phỏng vấn, bài take-home); (3) **lối nhanh cho người đã biết SQL** (thi vượt); (4) **mở lần hai nhanh, chạy offline**. Python/pandas, BI thật, tài khoản: để ngoài hoặc chỉ spike (§2). | — |
| Nợ cần trả | 10 mục, phần lớn S. Gom thành gói "Ranh giới sạch" (§3). | M |
| Ứng viên | 10 sáng kiến, chấm theo giá trị / cỡ / rủi ro / hợp ràng buộc (§4). | — |
| **v15 · Liền mạch** | Ranh giới sạch + spike S-a (lưu DB đã seed) + chơi thử với 5 người mới. | **M–L** (~6–8 ngày) |
| **v16 · Của tôi** | Tiến bộ của tôi + chứng nhận + xuất Bảng điều hành / link SQL (v12.2) + **xuất portfolio** + PWA offline (nếu S-a đạt). | **L** (~10–14 ngày) |
| **v17 · Sẵn sàng đi làm** | **Phòng phỏng vấn** (bộ đề tính giờ + 3 bài take-home) + **thi vượt** (kiểm đầu vào ở General, đánh giá thăng tiến sớm ở domain) + spike Pyodide 2 ngày (chỉ báo cáo). | **L–XL** (~12–16 ngày) |
| Không làm | Tài khoản, đồng bộ đám mây, bảng xếp hạng, chứng nhận có mã xác minh (đều cần backend Python, trái D6); domain thứ tư trước v18. | — |

---

## 1. Chơi thử như người mới (2026-11-19)

Cách chơi: `npm run build`, `vite preview --port 5199`, Edge headless với hồ sơ mới, điều khiển qua CDP, 1280×800 và 375×740. Đi theo đường: màn chào → chọn "Chỉ học SQL" → Lộ trình → Phần 1 → bài học nhanh SELECT (Thử ngay, nộp sai) → drill WHERE "Tự làm" (sai, rồi đúng) → Trang chủ → Luyện SQL → E-commerce → việc 1 (đạt, dock) → Sổ tay → 375 px. Console: 0 lỗi, không cuộn ngang ở 375. Đã tắt preview và Edge sau khi chơi.

Ảnh: `C:\Users\KHOA~1.HUY\AppData\Local\Temp\claude\be8c95d1f89f2452\e927c5e6-22a4-40fa-bff6-3a9e8af9fcbc\scratchpad\roadmap\` (tên file ở cột cuối).

### 1.1 Chạy tốt (giữ)

- Màn chào chọn lĩnh vực rõ ràng. Bấm một thẻ là vào ngay.
- Boon chỉ đường ngắn và tắt được.
- Drill có "Kết quả mong đợi (mẫu)" và hai bảng so dòng thừa/thiếu. Lần nộp sai dạy được ngay ("Bạn có 87 dòng, đáp án có 17 dòng" + 3 dòng thừa) (08).
- Việc 1 E-com có ví dụ mẫu chép vào editor được. Đạt thì có dock kho lồng đèn 2,2 s và Recap (15).
- Ở 375 px: tab Đề bài / SQL / Kết quả và thanh dưới đều gọn (17, 18).

### 1.2 Ma sát thấy được

| # | Thấy gì | Ở đâu | Ảnh |
|---|---|---|---|
| F1 | Người chọn "Chỉ học SQL" mở drill ở `#/d/logistics/play`: top bar có pill **Logistics**, sidebar trái là 6 icon của domain Logistics (Tổng quan, Dữ liệu, Bảng điều hành, Bản đồ…). Người học không hiểu sao bài luyện SQL lại "ở Logistics". | drill | 07, 09 |
| F2 | Trang chủ của người đó dẫn đầu bằng "Tiếp tục: Danh mục cảng công ty khai thác · Logistics", trong khi việc vừa làm là drill WHERE. "Hộp thư" có chấm đỏ 1 (tin nhắn Logistics) dù chưa từng vào Logistics. | `#/` | 10 |
| F3 | Thẻ kỹ năng ghi cú pháp trên bảng Logistics. Bài học nhanh SELECT có "Cú pháp: `SELECT code, name FROM ports`", ngay trên ví dụ `SELECT name, category, price_vnd FROM products` (bảng `lab`). Sổ tay ở E-com cũng ghi `ports`. Nguồn: `content/skills.yml` `syntax:`. | bài học, Sổ tay | 06, 16 |
| F4 | Sổ tay ở E-com ghi "Mở sau việc ecom-ch1-02": **mã nội bộ lộ ra người chơi**. | Sổ tay | 16 |
| F5 | Thẻ chế độ "Sổ tay" ở Tổng quan E-com viết "thẻ kỹ năng SQL và **thuật ngữ giao nhận**", tức thuật ngữ của Logistics. | `#/d/ecommerce` | không có ảnh (thẻ nằm dưới mép), đọc từ chữ trang |
| F6 | Ở việc 1 E-com có hai câu `FROM products` cạnh nhau. Câu đầu là ví dụ mẫu của ticket (bảng `products` của `ecom`: `sku, name, price`). Câu sau là ví dụ của bài học nhanh (bảng `products` của `lab`: `name, category, price_vnd`). Cùng tên bảng, khác cột, khác dữ liệu, không có chữ nào nói đây là hai bộ dữ liệu khác nhau. Nếu chép ví dụ bài học vào editor E-com thì **khả năng cao** báo lỗi cột (chưa chạy thử). | brief E-com | không có ảnh (nằm dưới mép), đọc từ chữ trang |
| F7 | Ở 1280×800, nút "Tiếp" của màn chào bị cắt ở mép dưới hộp thoại (phải cuộn trong hộp thoại). | màn chào | 01 |
| F8 | Pane đề bài dài: với ticket có ví dụ, bài học nhanh mở sẵn bên dưới. Ở 800 px, nửa trên pane chỉ thấy lời chào, chưa thấy "Yêu cầu". Lời Boon ở drill đẩy "Kết quả mong đợi" xuống dưới mép. | brief | 07, 13 |
| F9 | Đã đạt 1 drill (+10 XP) nhưng trang Luyện SQL vẫn nói "Bạn chưa học kỹ năng nào". Câu đúng theo luật (cần ≥ 2 drill) nhưng nghe như app quên bài vừa làm. | `#/practice` | 11 |

**Chưa kiểm trong lần chơi này** (ghi để không khẳng định bừa):
- Bước 2–3 của màn chào: bấm thẻ là đóng ngay.
- Lượt ôn tập thật (chưa có thẻ đến hạn).
- Thời gian mở lần hai.
- Lane, CSV import.
- Finance (đã có kiểm ở v14 T7).

**Đã biết từ trước, vẫn mở:**
- L131 #1: `lab` được seed trước khi chọn domain.
- L131 #3: chưa từng chơi thử với người thật (R6).
- L99: chọn sẵn `___` làm Chạy chỉ chạy vùng chọn.

---

## 2. Người học còn thiếu gì

Mục tiêu sản phẩm: một **junior Data Analyst** đi phỏng vấn và làm được việc tuần đầu. Bảng đối chiếu năng lực với hiện trạng:

| Năng lực | Hiện có | Còn thiếu | Hướng |
|---|---|---|---|
| SQL đọc/lọc/nhóm/nối/cửa sổ/CTE/hiệu năng | 38 kỹ năng, 114 drill, 3 domain (69 + 30 + 30 việc), nút nâng cao A–C | Đủ. Thiếu **luyện dưới áp lực thời gian** và **câu không có khung** (mọi việc đều có shape card + gợi ý). | I5 phỏng vấn |
| Diễn giải kết quả, viết kết luận | Câu kết luận của đánh giá thăng tiến (chọn 1 đáp án), `reflect` | Chưa có chỗ **tự viết** một đoạn tóm tắt cho người không biết SQL. | I5 (take-home có đoạn viết, tự chấm theo rubric), I6 |
| Dashboard / BI | 4 kiểu thẻ, ô KPI | Thẻ chưa lọc theo tham số, chưa xuất ảnh. BI thật (Power BI…) là `external` D2. | I2 (xuất PNG), giữ D2 external |
| Bằng chứng để xin việc | Không có | Portfolio, chứng nhận, "tôi đã làm gì" (v12.2: đã duyệt L81, **chưa build**) | I2, I6 |
| Tiến bộ nhìn thấy được | XP, bậc nghề, Lily lớn, hộp Leitner (ẩn trong ôn tập) | Trang tổng hợp: kỹ năng vững/yếu, lỗi hay gặp, ngày học (v7 §7, chưa build). | I2 |
| Ôn ngắt quãng | Leitner 5 hộp, drill General, "Luyện lại việc này", khởi động chương | Hàng ôn **hằng ngày** chỉ lấy drill trên `lab`, không lấy việc của domain. Không biết lỗi nào hay lặp lại. | I2 (pref lỗi), để sau |
| Độ khó thích ứng | Gợi ý 3 bậc, điền khung, "đạt yếu" | Người **đã biết SQL** vẫn phải làm lại ch1 của mỗi domain. `knows` chỉ tắt tour. | I4 thi vượt |
| Python/pandas | Link Kaggle (D5 external) | Không chạy được trong app. | I7 spike Pyodide, không cam kết |
| Dữ liệu thật | CSV import (≤ 20 MB) | Không có **bài hướng dẫn** trên một bộ dữ liệu công khai. Người học nạp CSV rồi không biết hỏi gì. | I8 (sau v17) |
| Dùng mọi lúc | Chạy trong trình duyệt | Mỗi lần mở domain phải seed lại: Logistics 8,3–8,6 s (L44, Edge) và ~10 s (L92); Finance 1,2–1,9 s (L131). Không có offline/PWA. | I3 |
| Tài khoản / đồng bộ | Xuất/Nhập tiến độ (file) | Đồng bộ nhiều máy | **Không** (cần backend Python, trái D6). File xuất/nhập là đường thay thế. |

---

## 3. Nợ chất lượng cần trả (gói "Ranh giới sạch")

| # | Việc | Sửa ở đâu (gợi ý, agent build chốt) | Cỡ |
|---|---|---|---|
| Q1 | Drill và lượt ôn bằng drill có tuyến riêng ngoài domain (ví dụ `#/learn/play`). `#/d/<d>/play` khi đang mở drill thành alias (giữ mãi, như `canonicalHash`). Ở tuyến này: không pill domain, không sidebar domain, không chấm Hộp thư. | `src/route.ts`, `ui/router.ts`, `main.ts` `openPage`, `ui/topbar.ts`, `ui/sidebar.ts` | M |
| Q2 | Dòng "Tiếp tục" ở Trang chủ biết General: việc gần nhất theo thời gian, drill hay ticket. Người chọn "Chỉ học SQL" chưa vào domain nào thì không thấy dòng Logistics. | `resumeLine`, `src/home.ts` | S |
| Q3 | Cú pháp thẻ kỹ năng viết trên `lab`, khớp ví dụ bài học (D-N3). Test: `syntax` chỉ dùng bảng của `lab.sql`. | `content/skills.yml`, test mới trong `tests/lessons.test.ts` | S |
| Q4 | Sổ tay không hiện id thô; khóa ghi tên việc ("Mở sau việc: Danh bạ các shop"). Test: chữ đã vẽ không khớp `/\b(ch\|ecom-ch\|fin-ch)\d+-\d+\b/`. | `src/ui/notebook.ts` | S |
| Q5 | Thuật ngữ Sổ tay theo domain (`glossary.yml` có `domain:`); thẻ chế độ không nói "giao nhận" ngoài Logistics. | `content/glossary.yml`, `ui/modes.ts`, i18n | S–M |
| Q6 | Khi bài học (bảng `lab`) nằm trong việc của domain: có một dòng nhãn "Ví dụ này chạy trên dữ liệu luyện (chuỗi cửa hàng), không phải bảng của công ty". Cách vẽ để ui-ux-v7 quyết. | `ui/lessonCard.ts` | S |
| Q7 | L131 #1: không seed `lab` khi workspace đang ẩn (preview chỉ chạy khi người học mở "Thử ngay" hoặc khi workspace hiện). | `ui/tryPreview.ts`, `ui/lessonCard.ts` | S |
| Q8 | Màn chào: nút "Tiếp" luôn thấy ở 1280×800 (chân hộp thoại dính); F8 thứ tự khối trong pane đề bài: chuyển cho ui-ux-v7. | ui-ux-v7 | S |
| Q9 | Câu ở Luyện SQL khi đã đạt 1 drill: "Còn 1 bài nữa là học xong Lọc dòng" thay "chưa học kỹ năng nào". | `practiceHub`, `i18n/learn.ts` | S |
| Q10 | `axe-core` kiểm a11y tự động (v7 A8, D-A1 đã duyệt ở L81) chưa có trong `package.json`: thêm hoặc user bỏ hẳn. | `package.json` (dev), test mới | S |

Tổng: **M** (~3–5 ngày). Rủi ro thấp: phần lớn là chữ, nội dung và tuyến. Q1 đụng router nên cần test alias.

---

## 4. Sáng kiến ứng viên

Thang điểm:
- **Giá trị** (cho junior DA): 1–5.
- **Cỡ**: S/M/L/XL.
- **Rủi ro**: T thấp / V vừa / C cao.
- **Hợp ràng buộc**: chạy trong trình duyệt, repo public, giấy phép, trần main 500 KB (đang ~302).

| Id | Sáng kiến | Phạm vi | Giá trị | Cỡ | Rủi ro | Hợp ràng buộc | Ghi chú |
|---|---|---|---|---|---|---|---|
| **I1** | Ranh giới sạch | §3 Q1–Q10 | 4 | M | T | ✓ main ≈ 0 | Có bằng chứng từ §1. Rẻ nhất trên mỗi điểm giá trị. |
| **I2** | Của tôi (v12.2 đã duyệt) | Trang `#/me` "Tiến bộ của tôi" (v7 §7: độ vững kỹ năng, lỗi hay gặp, ngày học; pref `attempts`/`errors`, không vào Save); chứng nhận theo domain (SVG/PNG, ghi "không xác minh"); xuất/nhập Bảng điều hành + PNG thẻ; link chia sẻ SQL không tự chạy | 4 | M–L (~5–7 ngày) | T–V | ✓ chunk lười | L81 đã duyệt. v7 ước M (~4–5 ngày) khi có một domain; nay chứng nhận và insights phải đủ General + 3 domain nên cộng thêm. Cần user xác nhận lại (D-N7). |
| **I3** | Mở lần hai nhanh + offline | Spike S-a (v7 §2.5: `dumpDataDir` theo schema vào IndexedDB, khóa = md5 seed + bản PGlite). Nếu đạt: service worker viết tay (không thêm plugin) để cache asset → offline. | 3 | S spike + M | V (quota IndexedDB, cache sai phiên bản) | ✓ không đảo L55 | D-P2 (S-a) đã duyệt ở L81. Plan 10 ghi "Spike S: its own plan" nhưng plan đó chưa viết, spike chưa chạy. Số đo ở spike quyết; đường dự phòng là luôn seed lại. |
| **I4** | Thi vượt | General: bài kiểm đầu vào ~8 drill (mỗi Phần 1 drill `open`); đạt thì kỹ năng thành "đã học" bằng thẻ ôn. Domain: người đã vào chương được **làm đánh giá thăng tiến ngay**; đạt thì chương sau mở, việc thường của chương thành tùy chọn (vẫn có XP khi làm). | 4 (người biết SQL) | M–L | V (`rankOf`, `contentProblems`, KPI theo ticket, tour) | ✓ | **Đổi một nguyên tắc cũ:** story đi tuyến tính (`product-design.md`), v4 ghi "không có bài kiểm tra xếp lớp ở bản này". Không đổi Save nếu "vượt" = `completed` có ticket đánh giá. Phải kiểm mọi chỗ đọc `completed`. |
| **I5** | Phòng phỏng vấn | (a) Bộ đề 5 câu tính giờ từ drill sẵn có của kỹ năng đã học: không shape card, không gợi ý, đồng hồ tùy chọn, không phạt, 0 XP, chỉ ghi kết quả vào pref. (b) 3 bài take-home trên `lab`, khuôn bước của đánh giá thăng tiến: 3–4 bước SQL + 1 đoạn **tự viết** kết luận + rubric tự chấm (không chấm máy). (c) Thẻ "câu hỏi phỏng vấn hay gặp" nối tới bài học sẵn có. | 5 | L (nội dung là phần lớn) | V (độ khó, chữ hai thứ tiếng) | ✓ lab, chunk lười | Engine dùng lại drill + bước boss. Nội dung mới: 3 take-home, ~10 câu phỏng vấn. |
| **I6** | Xuất portfolio | Sau đánh giá cuối của một domain (hoặc khi xong một take-home): xuất một file Markdown/HTML gồm câu hỏi nghiệp vụ, SQL đã đạt (`save.graded`), kết luận, ảnh thẻ dashboard. File sẵn để đưa lên GitHub. Ghi "dữ liệu hư cấu". | 4 | M | T | ✓ không gửi đi đâu | Đi cùng I2 (chứng nhận). Không xuất dữ liệu CSV của người chơi. |
| **I7** | Python/pandas (Pyodide) | Spike 2 ngày: tải lười trong worker riêng, đọc kết quả SQL thành DataFrame. Đo cỡ tải, thời gian khởi động, giấy phép từng gói. | 3 | spike S; làm thật XL | C (tải nặng, bộ nhớ, hai engine) | ? chưa đo | D5 giữ `external` tới khi có số đo. |
| **I8** | Bài hướng dẫn trên dữ liệu công khai | 1–2 bộ CSV giấy phép mở (CC0/CC BY) kèm 5 câu hỏi dẫn dắt, chạy trên `sandbox` qua luồng import có sẵn. | 3 | M | V (giấy phép, ≤ 20 MB) | ✓ nếu giấy phép sạch | Sau v17. Chọn bộ dữ liệu cần kiểm giấy phép riêng. |
| **I9** | Domain thứ tư (vd. Nhân sự / Y tế) | Khuôn Plan 9/11 | 2 (đã có 3 domain) | XL | V | ✓ | Không trước v18 (D-N12). |
| **I10** | Tài khoản, đồng bộ đám mây, bảng xếp hạng | Backend Python | 2 | XL | C (vận hành, dữ liệu cá nhân, chi phí) | ✗ trái D6 | Không làm (D-N8). |

Thứ tự theo giá trị/cỡ: **I1 > I5 ≈ I2 > I6 > I4 > I3 > I8 > I7 > I9 > I10**. I3 đứng sớm hơn điểm của nó vì spike rẻ và kết quả quyết PWA ở v16.

---

## 5. Lộ trình đề xuất

| Bản | Phạm vi | Cỡ | Phụ thuộc | Chỉ số thành công (test / số đo / chơi thử) |
|---|---|---|---|---|
| **v15 · Liền mạch** | I1 (Q1–Q10). Spike S-a (song song, chỉ báo cáo). **Chơi thử với 5 người mới** (user tuyển; kịch bản §5.1). | M–L (~6–8 ngày) | ui-ux-v7 cho Q6/Q8 | Test: drill không bao giờ ở tuyến `#/d/…` (alias chuyển hướng); `skills.yml` `syntax` chỉ dùng bảng `lab`; không id việc thô trong chữ đã vẽ của Sổ tay; người "Chỉ học SQL" chưa vào domain nào thì dòng "Tiếp tục", chấm Hộp thư và pill domain ở top bar không nhắc Logistics (danh sách Lĩnh vực vẫn liệt kê cả ba). Số đo: mở lần hai có/không S-a, 3 lần mỗi domain (review-log). Chơi thử: ≥ 4/5 người mới tự đạt drill đầu ≤ 10 phút, không cần hỏi. |
| **v16 · Của tôi** | I2 + I6. PWA offline nếu S-a đạt cổng (D-N6). | L (~10–14 ngày: I2 5–7 + I6 2–4 + PWA 2–3) | v15 (tuyến General sạch thì trang `#/me` mới đúng) | Test: xuất → nhập Bảng điều hành giữ nguyên thẻ; không file xuất nào chứa bảng `sandbox`; chứng nhận có câu "không xác minh" ở cả hai ngôn ngữ; portfolio chỉ chứa SQL đã đạt. Số đo: main ≤ +3 KB, chunk mới trong ngân sách. Offline (nếu làm): mở lần hai không mạng vẫn chạy được việc đã seed. |
| **v17 · Sẵn sàng đi làm** | I5 + I4. Spike Pyodide 2 ngày (I7, chỉ báo cáo, quyết ở v18). | L–XL (~12–16 ngày: I5 6–8 + I4 4–6 + spike 2). Nếu cần gọn: tách I4 sang v18. | v16 (portfolio nhận take-home) | Test nội dung: mỗi bộ đề chỉ dùng kỹ năng người học đã học; mọi take-home chạy trên `lab` và có rubric VI + EN; thi vượt không làm hỏng `rankOf`/KPI (test với save chỉ có ticket đánh giá). Chơi thử: 3 người đã biết SQL tới chương 3 của một domain trong ≤ 45 phút (hôm nay phải làm hết 10 việc). |

Ngân sách main cả ba bản: **≤ +8 KB** (302 → ~310 / 500). Mọi trang mới nằm trong chunk lười, như `learnui`.

### 5.1 Kịch bản chơi thử với người thật (v15, trả nợ R6 / L131 #3)

- 5 người chưa biết SQL và 3 người biết SQL. Mỗi người 30 phút, chia sẻ màn hình, nói to suy nghĩ. Không ghi âm nếu họ không đồng ý.
- Nhiệm vụ:
  1. Chọn một lĩnh vực và làm việc đầu tiên.
  2. Học xong một kỹ năng ở Lộ trình.
  3. Tìm lại câu SQL mình đã nộp.
  4. Người biết SQL: tới chương 2 nhanh nhất có thể.
- Ghi vào `review-log.md`: thời gian từng nhiệm vụ, chỗ phải hỏi, câu nói nguyên văn. Mỗi ma sát mới thành một dòng Q cho v16.

---

## 6. Rủi ro

| Rủi ro | Giảm thiểu |
|---|---|
| Q1 đổi tuyến làm hỏng link cũ hoặc save có `bossStep`/drill đang mở | Alias giữ mãi (như `#/play`); test `canonicalHash` cho tuyến drill cũ |
| Thi vượt (I4) làm lệch bậc nghề, KPI, mở bảng, tour | Chỉ thêm đường vào ticket đánh giá; không đổi luật `completed`; test với save "chỉ có ticket đánh giá" |
| Phòng phỏng vấn thành nơi tra đáp án | 0 XP, không hiện Solution, cùng luật preview như drill |
| Chứng nhận/portfolio bị hiểu là có giá trị xác minh | Câu "tự tạo, không xác minh" in trên chính file; không mã giả |
| S-a cache sai phiên bản → dữ liệu cũ | Khóa = md5 file seed + bản PGlite; lỗi đọc thì seed lại, xóa cache |
| Pyodide quá nặng cho mạng di động | Chỉ spike; quyết bằng số đo; không chặn gì khác |
| Không có telemetry nên không biết chỉ số thật | Chơi thử có kịch bản mỗi bản. Bật Cloudflare Web Analytics (devops) là quyết định riêng, không nằm trong roadmap này. |
| Nội dung mới (take-home, câu phỏng vấn) thiếu EN hoặc lộ đáp án | Test nội dung như `ecomContent`: VI = EN code span, không dấu ở EN, chạy được trên `lab` |

---

## 7. Quyết định cần duyệt (mặc định in đậm)

- **D-N1.** Thứ tự v15 Liền mạch → v16 Của tôi → v17 Sẵn sàng đi làm? **(có)**
- **D-N2.** Drill và lượt ôn bằng drill có tuyến riêng ngoài domain; `#/d/<d>/play` khi đang mở drill thành alias? **(có)**
- **D-N3.** Cú pháp thẻ kỹ năng: **một bản trên `lab`** (khớp ví dụ bài học, dùng ở mọi nơi) / một bản cho mỗi domain (thêm ~38 × 3 dòng nội dung)? **(một bản trên `lab`)**
- **D-N4.** Thuật ngữ Sổ tay theo domain; General không hiện thuật ngữ nghiệp vụ? **(có)**
- **D-N5.** Chơi thử với người thật (5 người mới + 3 người biết SQL, user tuyển) là cổng của v15 trước khi build v16? **(có)**
- **D-N6.** Xác nhận lại D-P2 (L81): chạy spike S-a ở v15 (đã duyệt, chưa làm). Nếu mở lần hai nhanh hơn ≥ 2× trên cả ba domain thì v16 thêm PWA offline bằng service worker viết tay, không thêm dependency? **(có)**
- **D-N7.** Xác nhận lại v12.2 như L81: insights bằng localStorage (không bump Save), chứng nhận "không xác minh", xuất Bảng điều hành + PNG, link SQL không tự chạy? **(có)**
- **D-N8.** Không làm tài khoản, đồng bộ đám mây, bảng xếp hạng, chứng nhận có mã xác minh (cần backend Python, trái D6). Xuất/Nhập tiến độ vẫn là cách chuyển máy? **(không làm)**
- **D-N9.** Python/pandas: D5 giữ `external`; chỉ spike Pyodide 2 ngày ở v17, quyết ở v18 bằng số đo? **(có, chỉ spike)**
- **D-N10.** Phòng phỏng vấn dùng lại engine drill + bước đánh giá thăng tiến; đồng hồ tùy chọn, không phạt, 0 XP; đoạn kết luận tự viết, tự chấm bằng rubric (không chấm máy)? **(có)**
- **D-N11.** Thi vượt ở domain (đổi nguyên tắc story tuyến tính và câu "không placement" của v4): đã vào chương thì được làm đánh giá thăng tiến ngay; đạt thì mở chương sau, việc thường thành tùy chọn? **(có)** · Khác: chỉ kiểm đầu vào ở General, domain giữ tuyến tính.
- **D-N12.** Không thêm domain thứ tư trước v18? **(có)**
- **D-N13.** Ngân sách main cả ba bản ≤ +8 KB, mọi trang mới nằm trong chunk lười? **(có)**
- **D-N14.** Bật Cloudflare Web Analytics (không cookie) để có số liệu thật? **(không, chờ user; cần đổi host hoặc thêm script ngoài)**
