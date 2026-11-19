# Product Design v10: thấy SQL chạy, phản hồi rõ hơn, kiểm liên tục (đề xuất)

Người viết: Product + UI/UX · 2026-11-19. User: *"Gọi Product, UI/UX Thêm tính năng vào. Thêm animation nếu cần thiết cải thiện theo. Review và feedback tự chạy test liên tục"*. User đã cho build không chờ chơi thử (L146) và trước đó chê hình tự chế trông nghiệp dư, muốn animation/SVG chuyên nghiệp.

Đã có, không đề xuất lại: v15 ranh giới General/domain, ui-ux-v7 P1 + theme tối, hộp thoại bài học, Lily 6 giai đoạn, v16 `#/me`, v17 phòng phỏng vấn + thi vượt, khôi phục phiên. **Đang làm ở worktree khác (không đụng):** offline/PWA + snapshot DB (`v16-offline`: `src/main.ts`, `src/state.ts`, `src/db/*`, `src/pwa.ts`, `src/ui/topbar.ts`, `index.html`, `vite.config.ts`, `public/*`, `scripts/offline.mjs`); FIX-1 (nút back, chặn xuất, dừng đồng hồ phỏng vấn, token chữ/bóng, axe); ui-ux-v7 P2 (I1 cảnh, D1 dashboard, D2 ER, O1 màn chào, M2 trang dài điện thoại, có thể âm thanh/chân dung: `src/art/*`, `ui/domainArt.ts`, `ui/homeView.ts`, `ui/welcome.ts`, `ui/dashboard.ts`, `ui/erdView.ts`, `ui/learnView.ts`, `theme.ts`, `style.css`, `ui/avatar.ts`).

L147/L148 không có trên `main` hay nhánh nào đã đọc; tài liệu này đánh số từ **L149**.

---

## 1. Chơi thử (2026-11-19)

### 1.1 Cách chơi

- Edge headless qua CDP, hồ sơ mới, 1280×800 và 375×740, theme hệ thống (tối) rồi một lượt sáng, một lượt giảm chuyển động.
- Hai đích: site thật `https://khoadautay.github.io/data-training-platform/` và bản build `main` hiện tại (`vite preview --port 5213`, commit 28588e2). Hai bản cho kết quả như nhau; không có lỗi trang hay `console.error` nào ở cả hai.
- Người mới: màn chào → chọn Logistics → tour → chạy starter → nộp sai (thừa cột) → lỗi cú pháp → nộp đúng → việc 2 (faded) → việc 3 (giảm chuyển động). Người quay lại: tải lại trang, Trang chủ, Tổng quan, Lộ trình, Luyện SQL, `#/me`, phòng phỏng vấn, Bảng điều hành, Dữ liệu, Bản đồ, rồi việc 1 của E-com và Finance. Save cuối: `completed = [ch1-01, ch1-02, ecom-ch1-01, fin-ch1-01, ch1-03]`.
- Ảnh nằm trong scratchpad của phiên (tạm, có thể bị xóa): `S = C:\Users\KHOA~1.HUY\AppData\Local\Temp\claude\be8c95d1f89f2452\e927c5e6-22a4-40fa-bff6-3a9e8af9fcbc\scratchpad\v10shots`, thư mục con `live\` và `preview\`. Script: `…\scratchpad\play10.mjs`, `extra10.mjs` (cơ sở cho §5).
- Không trích số mili giây: script dùng `sleep` cố định nên thời gian đo được không đáng tin.

### 1.2 Cái tốt (giữ)

- Phản hồi sai thừa cột rất rõ: "Kết quả cần 3 cột, truy vấn của bạn trả về 6 cột" + lời đồng nghiệp (`live\n07-wrong-submit`). Lỗi cú pháp: gạch đỏ trong editor, Boon giải thích thứ tự viết mệnh đề, tab Kết quả giữ nguyên thông báo Postgres (`live\n08-syntax-error`).
- Recap "SQL của bạn / Cách tham khảo" cạnh nhau; đồng nghiệp cảm ơn như chat (`preview\x02-reduced-400`).
- Tour thích nghi: người làm nhanh nhảy thẳng từ bước 1/8 tới 8/8.
- Khôi phục phiên: tải lại ở `#/d/logistics/play` mở đúng việc 3 (`live\r04-play-resume`). Trang chủ có một dòng "Tiếp tục" duy nhất.
- Giảm chuyển động: dock thay bằng thanh "Việc … xong · Xem lại · Đóng", không có chuyển động (`preview\x02-reduced-400`).

### 1.3 Ma sát thấy được

| # | Thấy gì | Ảnh | Ai xử lý |
|---|---|---|---|
| F1 | **Thẻ tour 8/8 không tự đóng.** Sau khi việc 1 đúng, thẻ "Hướng dẫn 8/8 · Xong / Xem lộ trình / Bỏ qua" chiếm nửa dưới cột trái, đẩy Recap lên. Người chơi không bấm "Xong" thì thẻ đi theo sang E-com và Finance. Ở Finance thẻ nói "Bạn vừa học Chọn cột (SELECT)", trong khi việc đó dạy cả SELECT lẫn WHERE. | `live\n09-correct-900`, `live\d-finance-done-900` | **v10 Track B** |
| F2 | **Thẻ tour 1/8 che đề.** Ở 1280×800 thẻ tour bước 1 cùng tin nhắn đẩy "Kết quả mong đợi" xuống dưới nếp gấp, trong khi người chơi đã chạy và nộp. | `live\n05-workspace-tour`, `n07` | Track B (thu gọn thẻ khi người chơi đã chạy) |
| F3 | **Khoảnh khắc đúng nằm ở góc.** Dòng "Đúng rồi! +100 XP" nhỏ; niềm vui nằm ở dock góc phải dưới, dock che chip khóa "Ghim lên". Bảng kết quả hiện ngay, không có gì báo "đây là kết quả mới". Chạy lại một truy vấn cùng số dòng thì nhìn không biết là đã chạy. | `live\n09-correct-900`, `live\n06-run-starter` | Track B (A4, A5) |
| F4 | **Tab "Thứ tự thực thi" chỉ đổi ô sáng.** Nút Phát dời ô sáng 1,5 s một lần (`setInterval`); con số "20.000 dòng → 789 dòng → 2 nhóm" chỉ là chữ, thanh trước/sau hiện tức thì. FROM và JOIN gộp một ô: hai khái niệm khó nhất (JOIN ghép hàng, GROUP BY gộp hàng) chưa có hình. | `preview\s01-steps`, `s03-play-1800` | **v10 Track A** |
| F5 | **Sai số dòng ở story chỉ có một câu.** Drill có `diffView` (dòng thừa/thiếu); việc story chỉ có `gradeMessage` (đúng L25: không lộ đáp án). Người mới nộp sai 3–4 lần mà không biết dòng nào lệch. | (lần chạy sai cột, `n07`; lần sai dòng suy từ code `work.ts`) | Track B (chỉ "dòng thừa của bạn") |
| F6 | **Tab Luồng dữ liệu chạy mãi.** `flowView.ts` dùng `animateMotion` `repeatCount: indefinite`: trái luật một lần ≤ 3 s (v5 L101–L109), dù đã tắt khi giảm chuyển động. | (đọc code) | Track A |
| F7 | Điện thoại: thanh dưới có 5 mục trong lưới 4 cột, "Logistics" rớt hàng hai. | `preview\m11-run`, `live\m01-play` | Chuyển **P2 · M2** |
| F8 | Phòng phỏng vấn: tiêu đề trang là "Lộ trình", rồi "‹ Lộ trình", rồi "Phòng phỏng vấn"; thanh bên vẫn hiện số Phần 1–11 không liên quan. | `live\r-_learn_interview` | Chuyển **FIX-1** |
| F9 | Trang dài: Luyện SQL 1280 cao 4321 px, Lộ trình 375 cao 5342 px (đo `main.scrollHeight`). | `preview\L-_practice`, `m-_learn` | Đã có **P2 · M2** |
| F10 | Màn chào 1280×800: "Bước 1/3" và "Tiếp" bị cắt ở mép dưới. | `live\n01-welcome` | Đã có **P2 · O1** |
| F11 | Chấm đỏ "Hộp thư 1" còn trên mọi trang sau khi đã mở và làm xong việc. Chưa rõ là cố ý hay lỗi. | mọi ảnh 1280 | Ghi để Track B kiểm; không đổi nếu đúng spec |

---

## 2. Tính năng ứng viên

Thang: Giá trị 1–5 (cho junior DA), Cỡ S/M/L, Rủi ro T thấp / V vừa / C cao. Ngân sách đo hôm nay (gzip -9): main 315/500, tickets 105/110, general 68/70, css 18/20, en 17/20, me 11/12, art 17/20, learnui 13/25, parser 390/410. **Bốn nhóm sát trần (tickets, general, css, en, me): không tính năng nào dưới đây thêm vào đó, trừ vài khóa i18n nhỏ ghi rõ.**

| Id | Tính năng | Người chơi thấy | Dữ liệu / code | Ngân sách | Test | Giá trị | Cỡ | Rủi ro |
|---|---|---|---|---|---|---|---|---|
| **N1** | Phim "SQL chạy thế nào" | Tab Thứ tự thực thi: bấm Phát thì số dòng đếm xuống, một dải chấm (mẫu hàng) chảy qua từng mệnh đề; WHERE lọc chấm, GROUP BY gộp chấm thành cụm, LIMIT cắt đuôi. Một lần, ≤ 3 s, có Phát lại. Chi tiết ở §3 A1–A3. | `src/viz/steps.ts` đã có `count` + `sample` mỗi bước; thêm `groupKeys` (≤ 8 hàng mẫu kèm khóa nhóm) và tách FROM / từng JOIN thành bước riêng. Chạy trong worker như hôm nay (request `steps`), **không đụng `db/worker.ts`**. View `ui/stepsView.ts`; chuyển động ở chunk lười mới `src/art/sqlMotion.ts`. | chunk mới `sqlmotion` ≤ 8; main +0,3 (loader) | `tests/steps.test.ts` thêm: bước JOIN riêng, `groupKeys` khớp `GROUP BY` thật; `tests/sqlMotion.test.ts`: timeline ≤ 3 s, khung cuối = trạng thái tĩnh | 5 | L | V |
| **N2** | Ghép hàng JOIN | Trong N1, bước JOIN hiện 2 cột hàng mẫu (bảng trái, bảng phải); dây nối các cặp khóa bằng nhau; hàng trái không có cặp ở LEFT JOIN nhận ô ∅. | `steps.ts`: với mỗi JOIN, một truy vấn con lấy ≤ 6 khóa trái + khóa phải khớp (đã có cơ chế dựng truy vấn con bằng deparser). | trong `sqlmotion` | test: LEFT JOIN có ít nhất một ∅ trên `lab`; INNER không có | 5 | M | V (truy vấn con với bí danh, USING, NATURAL: không hỗ trợ thì hiện số đếm như hôm nay) |
| **N3** | "Dòng thừa của bạn" ở story | Sau lần nộp sai số dòng thứ 2: nút "Xem dòng thừa" mở bảng nhỏ ≤ 3 dòng **của chính người chơi** không có trong đáp án. Không bao giờ hiện dòng thiếu (sẽ lộ đáp án, L25). | `compareResults` đã trả `extraRows`; `ui/work.ts` + `ui/feedback.ts`. | main +0,4; en +0,1 | `tests/grader.test.ts`: story chỉ nhận `extraRows`; test DOM: không có `missingRows` ngoài drill | 4 | S | T |
| **N4** | Tour tự gọn | Thẻ tour 8/8 tự đóng khi người chơi mở việc kế hoặc đổi domain (coi như "Xong"); thẻ bước 1 thu thành một dòng khi người chơi đã chạy một lần. Câu 8/8 liệt kê **mọi** kỹ năng việc vừa dạy. | `src/onboarding.ts` (thuần, test sẵn), `ui/coach.ts`. | main +0,2 | `tests/onboarding.test.ts`: đổi việc ở bước 8 → `step = TOUR_STEPS` | 4 | S | T |
| **N5** | Đoán trước rồi chạy | Tùy chọn trong tab Thứ tự thực thi: trước khi phim chạy, "Bạn đoán còn bao nhiêu dòng sau WHERE?" (3 lựa chọn: ít hơn 10 %, 10–50 %, hơn 50 %). Phim chạy, rồi Boon nói đúng/sai một câu. 0 XP, không lưu. | Lựa chọn tính từ `count` của bước trước/sau; trong `sqlmotion`. | trong `sqlmotion` | test thuần: dải đúng cho 3 ca | 3 | S | T |
| **N6** | Làm lại việc khó | Trang Luyện SQL thêm thẻ "Việc bạn từng vấp": ≤ 5 việc story đã xong nhưng nộp sai ≥ 3 lần, mở như Practice (biến thể khác, 0 XP). | Đọc `passedOn` (số lần nộp tới khi đạt) trong pref `cargo-query/attempts` (`src/insights.ts`, v16, đã có; `history.ok` chỉ là "chạy không lỗi" nên không dùng); `src/practice.ts` (thuần) + `ui/modes.ts`. Không thêm field Save. | main +0,6; en +0,1 | `tests/practice.test.ts`: chọn đúng việc, bỏ đánh giá thăng tiến (L10) | 4 | S | T |
| **N7** | Thẻ tra cứu in được | Sổ tay có nút "In thẻ tra cứu": một trang A4 các kỹ năng đã học (nhãn, cú pháp, bẫy) từ `skills.yml`. Dùng `print:` của Tailwind trong `ui/notebook.ts`, không sửa `style.css`. | `ui/notebook.ts` | main +0,3 | test DOM: chỉ kỹ năng đã học, đủ VI/EN | 3 | S | T |
| **N8** | SQL của tôi bằng lời | Dưới editor một dòng "Truy vấn này: lấy 3 cột từ `ports`, giữ dòng có …, sắp theo … giảm dần, lấy 10 dòng" dựng từ cây phân tích. | Cần parser trong worker; cách duy nhất không đụng `worker.ts` là gắn vào `StepsResult` (trùng file Track A). | +1 chunk parser-side | | 4 | M | V |
| **N9** | Smoke headless trong repo | Không ai thấy; xem §5. | `scripts/smoke.mjs`, `.github/workflows/smoke.yml` | 0 | chính nó | 5 (cho đội) | S–M | T |

Không làm: sắp xếp/lọc bảng kết quả bằng click (dạy sai ORDER BY, lẫn với chấm `ordered`); chuỗi ngày có phạt (lily-growth §3 cấm gây áy náy); âm thanh (P2 đang cân nhắc).

**N8 để sau v10:** giá trị cao nhưng đụng `steps.ts` cùng lúc với N1/N2. Làm ngay sau khi Track A merge (L157).

---

## 3. Kế hoạch animation

Luật giữ nguyên (v5 L101–L109, v6 L112–L122): trạng thái gốc là khung cuối; một lần ≤ 3 s, gắn ở sự kiện (bấm, nộp), không bao giờ ở `rerender()`; transform chỉ trên SVG lá, không trên thẻ/nút/link/`#shell`; GSAP qua `loadGsap()`/`loadedGsap()`, không chờ chunk; giảm chuyển động = khung cuối ngay (`reducedMotion()` vì `Element.animate`/GSAP bỏ qua luật CSS). Mới ở v10: **chuyển động giảng dạy nằm trong một chunk lười `sqlmotion` (`src/art/sqlMotion.ts`), không thêm `@keyframes` vào `style.css`** (css 18/20). Chữ của phim là bảng VI/EN riêng trong chunk (như `FIN_TEXT`), không vào `en.ts`.

| Id | Ở đâu | Chuyển động | Vì sao giúp hiểu | Dữ liệu | Cỡ | Không có GSAP / giảm chuyển động |
|---|---|---|---|---|---|---|
| **A1** | Tab Thứ tự thực thi, nút Phát (thay `setInterval`) | Một timeline: ô từng mệnh đề sáng lần lượt 350 ms; số dòng đếm từ số bước trước xuống số bước này (`tabular-nums`, như XP); thanh trước/sau co lại; dải 24 chấm SVG chảy sang phải, chấm bị WHERE loại mờ dần rơi xuống. Tổng ≤ 7 × 350 ms + 400 = 2,85 s. | Thấy thứ tự logic FROM → WHERE → GROUP → … và "WHERE chạy trước SELECT" bằng mắt, không phải đọc. | `count` sẵn có | M | Hiện khung cuối (ô cuối sáng, số cuối, thanh cuối); nút Phát vẫn dời ô như hôm nay |
| **A2** | Bước GROUP BY của A1 | ≤ 8 hàng mẫu (chip có giá trị khóa) trượt vào cụm cùng khóa, cụm gộp thành một chip "khóa · n hàng". Dùng MotionPath cho đường trượt. | GROUP BY "gộp nhiều hàng thành một" là chỗ người mới hay sai (cột không trong GROUP BY). | `groupKeys` mới (N1) | M | Khung cuối: các cụm đã gộp |
| **A3** | Bước JOIN của A1 (N2) | Hai cột chip khóa; dây nối (DrawSVG) vẽ từng cặp khớp 120 ms; hàng LEFT không cặp nhận ô ∅ nảy nhẹ (scale trên `<g>` lá). | Thấy JOIN nhân/giữ hàng thế nào, LEFT JOIN sinh NULL ở đâu. | truy vấn con mỗi JOIN (N2) | M–L | Khung cuối: dây đã vẽ, ∅ đã hiện |
| **A4** | Bảng kết quả sau Run/Submit | Các `<tr>` đầu (≤ 10) hiện bằng opacity, lệch nhau 25 ms, tổng ≤ 400 ms; chỉ khi một lần chạy mới vừa về (cờ do `work.ts` đặt), không khi đổi tab hay `rerender()`. | Trả lời "đã chạy chưa?" (F3) mà không cần đọc dòng đếm. | không | S | Không chuyển động; `renderResult` không đổi |
| **A5** | Dòng "24 dòng · 3 cột" | Số dòng đếm lên 300 ms, dùng lại hàm đếm XP (`ui/topbar.ts` có sẵn; tách thành helper trong `ui/dom.ts` nếu Track B cần, **không sửa topbar**: offline đang giữ nó, nên copy 10 dòng). | Cùng mục đích A4, rẻ. | không | S | Số cuối ngay |
| **A6** | Phản hồi thừa/thiếu cột | Khi lệch số cột: gạch chân đầu cột thừa trong bảng kết quả vẽ ra 400 ms (một `<svg>` lá trong `<th>`). | Chỉ đúng chỗ sai, không lộ đáp án (chỉ cột của người chơi). | `actual.columns.length - expected` | S | Gạch chân tĩnh |
| **A7** | Lily/Boon ở phản hồi | Kết quả 0 dòng: Boon `think` (tư thế sẵn có) + câu "WHERE đang loại hết dòng"; lần đầu sai số dòng sau khi đúng số cột: Lily `think` (đầu nghiêng, dấu hỏi; tư thế sẵn có trong `RIG`). Chỉ dùng tư thế trong `RIG`. | Một phản ứng cho mỗi loại sai, đúng vai (Boon giảng, Lily phản ứng, L87). | không | S | Tư thế tĩnh |
| **A8** | Thanh việc trong chương (`#map`) | Khi một việc xong lần đầu: một đường SVG mảnh dưới hàng nút vẽ tới nút kế (DrawSVG 600 ms). Đường là SVG riêng, **không transform nút**. | Thấy tiến độ chương lớn lên ngay chỗ đang nhìn. | `navTargets()` | S | Đường vẽ sẵn |
| **A9** | Tab Luồng dữ liệu | Thay `repeatCount: indefinite` bằng một lần chạy chấm 1,6 s rồi dừng; nút "Phát lại". | Đưa về luật (F6). | không | S | Như hôm nay (không chấm) |

Đánh đổi: A1–A3 tốn nhất nhưng là chỗ duy nhất chuyển động **dạy** được khái niệm; A4–A8 rẻ và trả lời ma sát F1–F3. Khoảnh khắc chương/thăng tiến đã có dock + confetti (L117) và Lily lớn (L134): v10 không đụng tới, chỉ thêm A8.

---

## 4. Bộ đề xuất build: 4 luồng song song

File của mỗi luồng không giao nhau và không giao với offline/FIX-1/P2 (§0). Chỗ chung bắt buộc: `src/i18n/vi.ts`/`en.ts` (mỗi luồng thêm khóa trong một khối riêng có chú thích ở **cuối** file, merge chỉ nối thêm) và `CLAUDE.md`/`decision-log.md` (mỗi luồng một dòng L). **Chỉ Track A sửa `scripts/check-budget.mjs`** (thêm nhóm `sqlmotion`); luồng khác dùng nhóm có sẵn.

| Luồng | Phạm vi | File | Cỡ |
|---|---|---|---|
| **V10-A · SQL chạy** | N1, N2, N5; A1, A2, A3, A9 | `src/viz/steps.ts`, `src/viz/stepText.ts`, `src/ui/stepsView.ts`, `src/ui/flowView.ts`, mới `src/art/sqlMotion.ts`, `scripts/check-budget.mjs`, `tests/steps*.test.ts`, mới `tests/sqlMotion.test.ts` | L (~5–7 ngày) |
| **V10-B · Phản hồi khi chạy** | N3, N4; A4, A5, A6, A7; kiểm F11 | `src/ui/work.ts`, `src/ui/feedback.ts`, `src/ui/resultTable.ts`, `src/ui/coach.ts`, `src/onboarding.ts`, `src/ui/celebrate.ts` (chỉ gọi tư thế có sẵn), tests tương ứng | M (~3–4 ngày) |
| **V10-C · Luyện lại** | N6, N7; A8 | `src/practice.ts`, `src/ui/modes.ts`, `src/ui/notebook.ts`, `src/ui/mapStrip.ts`, `tests/practice.test.ts`, `tests/notebook*.test.ts` | S–M (~2–3 ngày) |
| **V10-D · Kiểm liên tục** | N9 (§5) | mới `scripts/smoke.mjs`, mới `.github/workflows/smoke.yml`, `package.json` (một script `smoke`), `docs/ops/deploy.md` (một đoạn) | S–M (~1–2 ngày) |

Ngân sách cả v10: main ≤ +2 KB (315 → ~317/500); `sqlmotion` mới ≤ 8; en ≤ +0,4 (17 → ≤ 17,4/20); không chạm tickets, general, css, me. Không đổi Save (không bump `SAVE_VERSION`); không thêm khóa localStorage.

Thứ tự merge: D trước (để smoke canh ba luồng còn lại), rồi B, C, A. A cần `loadGsap` từ main qua `import type` + tham số như `DrillDeps` (Plan 6 U3: không import giá trị từ main trong chunk lười).

### 4.1 Kế hoạch L

| L | Nội dung |
|---|---|
| **L149** | Duyệt product-design-v10; bốn luồng V10-A..D chạy song song; không chờ chơi thử (L146). Ma sát F7 → P2·M2, F8 → FIX-1. |
| **L150** | V10-D: smoke headless trong repo + workflow; tuần đầu không chặn merge, sau đó là cổng. |
| **L151** | V10-B: N3 chỉ hiện dòng thừa của người chơi ở story (không bao giờ dòng thiếu, giữ L25), sau lần nộp sai thứ 2. |
| **L152** | V10-B: tour 8/8 tự đóng khi đổi việc/domain; thẻ bước 1 thu gọn sau lần chạy đầu. |
| **L153** | V10-B: A4/A5 chuyển động kết quả về: opacity trên `<tr>` được phép (bổ sung luật v5: opacity, không transform, chỉ sau lần chạy mới). |
| **L154** | V10-A: chunk `sqlmotion` (≤ 8 KB) giữ mọi chuyển động giảng dạy; không `@keyframes` mới cho nó; chữ VI/EN trong chunk. |
| **L155** | V10-A: hàng mẫu cho GROUP BY/JOIN ≤ 8, lấy trong request `steps` có sẵn, không request mới, không sửa `db/worker.ts`; WITH/UNION/window vẫn trả `StepsFailure` như hôm nay. |
| **L156** | V10-A: Luồng dữ liệu bỏ vòng lặp vô hạn (A9). |
| **L157** | V10-C: "Việc bạn từng vấp" đọc `passedOn` của `cargo-query/attempts` (v16), không thêm Save; thẻ tra cứu in bằng `print:`. N8 (SQL bằng lời) lên lịch sau khi V10-A merge. |

---

## 5. Vòng review/feedback tự chạy

### 5.1 `scripts/smoke.mjs` (V10-D)

- Không thêm dependency: CDP qua `WebSocket` có sẵn trong Node 24 (như `play10.mjs`).
- Trình duyệt từ biến `BROWSER` (CI ubuntu: `google-chrome` có sẵn trên runner; máy dev: đường dẫn Edge). Hồ sơ mới trong thư mục tạm, xóa khi xong.
- Tự chạy `vite preview --port 5219 --strictPort` trên `dist/` (không bao giờ 5173/5174) và tự tắt đúng tiến trình mình mở; hoặc nhận `SMOKE_URL` để chạy với site thật.
- Kịch bản: (1) màn chào → chọn Logistics → Bắt đầu; (2) nộp Solution (biến thể 0, đọc từ `content/**`) của việc 1 mỗi domain + một drill `g-` + "Thử ngay" của một bài học; (3) mỗi tuyến trong `src/route.ts` một lần ở 1280 và 375 (375: bấm tab SQL trước khi gõ).
- Chờ bằng điều kiện (`waitFor`), không `sleep` cố định.
- Khẳng định:
  - `cargo-query-save.completed` chứa đúng các id đã nộp (không dò chữ trên trang: lượt chơi này cho thấy regex chữ khớp nhầm);
  - không `Runtime.exceptionThrown`, không `console.error`;
  - không cuộn ngang ở 375 (`scrollWidth ≤ innerWidth`);
  - banner `#notice` không mở trừ khi kịch bản mong đợi;
  - giảm chuyển động: sau Submit, `#stage` không còn hoạt cảnh chạy (`getAnimations().length === 0`).
- Ra: `smoke-report.json` + ảnh từng bước vào `smoke-out/` (gitignore) để người xem; exit ≠ 0 khi một khẳng định hỏng.

### 5.2 Chạy khi nào

| Khi | Lệnh | Chặn? |
|---|---|---|
| Mỗi thay đổi (agent/dev) | `npx tsc --noEmit && npx vitest run <file liên quan>` (như hôm nay) | có |
| Trước merge vào `main` | `npm run build && node scripts/check-budget.mjs && npm run smoke` | có (sau tuần đầu, L150) |
| CI `smoke.yml`, mỗi push/PR | sau job build: tải `dist`, chạy smoke, đính `smoke-out/` làm artifact | tuần đầu `continue-on-error`, sau đó chặn |
| Hằng đêm + sau mỗi deploy | `SMOKE_URL=https://khoadautay.github.io/data-training-platform/ npm run smoke` | báo lỗi (issue tự mở bằng `gh`), không chặn |

### 5.3 Test đơn vị thêm (đi cùng từng luồng)

- `tests/mascots.test.ts` mở rộng: không `repeatCount: 'indefinite'` trong `src/ui/**` (sau A9); mọi hằng thời lượng trong `sqlMotion.ts` ≤ 3000.
- `tests/sqlMotion.test.ts`: `build()` tạo timeline paused; `progress(1)` cho ra đúng DOM của bản vẽ tĩnh.
- `tests/grader.test.ts`: story không bao giờ nhận `missingRows`.
- Axe (L141) chạy trên DOM mới của tab Thứ tự thực thi và thẻ "Việc bạn từng vấp".

---

## 6. Rủi ro

| Rủi ro | Giảm |
|---|---|
| Truy vấn con của JOIN (bí danh, USING, subquery trong FROM) không dựng được | Không dựng được thì bước JOIN hiện số đếm như hôm nay; test trên mọi Solution có JOIN của ba domain: không ném lỗi |
| Phim che mất sự thật ("chấm" không phải hàng thật) | Chú thích "mẫu 24 hàng"; số đếm là số thật |
| `steps` chậm hơn vì truy vấn mẫu | Đã có hạn 3× timeout; mẫu dùng `LIMIT 8`; đo trên `container_events` (~109k) |
| Smoke giòn trên CI | Chỉ khẳng định save + lỗi + cuộn ngang; tuần đầu không chặn |
| Xung đột i18n giữa luồng | Khối khóa riêng cuối file |
