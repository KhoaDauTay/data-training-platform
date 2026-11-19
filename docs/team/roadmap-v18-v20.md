# Roadmap v18–v20: vòng build tự chạy tới v20 (BoonData)

Người viết: Product + UI/UX · 2026-11-19. User: *"Chạy tất cả luồng hiện tại theo những gì đã đề xuất. Tôi muốn vòng lặp dừng v20. Chặn thì đợi, không chặn thì chạy hết."*

Đọc trước: `CLAUDE.md`, `product-roadmap-v15.md`, `ui-ux-v7.md`, `product-design-v10.md`, `spike-s-a.md`, `spike-pyodide.md`, `interview-room.md`, `lily-growth.md`, `decision-log.md` (L124–L146 trên `main`), `docs/ops/deploy.md`.

**Mọi cỡ việc và KB trong tài liệu là ước lượng**, trừ số ghi "đo" (lấy từ product-design-v10 §2, gzip -9, 2026-11-19: main 315/500, tickets 105/110, general 68/70, css 18/20, en 17/20, me 11/12, art 17/20, learnui 13/25, interview 19/25, fin 43/50, parser 390/410). Cỡ: S ≤ 1 ngày, M 2–4 ngày, L 1–2 tuần, XL > 2 tuần (ngày làm của agent, gồm test và review).

---

## 0. Tóm tắt

| Bản | Nội dung | Luồng | Cỡ cả bản |
|---|---|---|---|
| **v18 · Nhanh, rõ, kiểm liên tục** (đang làm) | Offline/PWA + snapshot DB (L143), FIX-1 (L147), ui-ux-v7 P2 (L148), product-design-v10 V10-A..D (L149–L157) | 7 luồng, đã chạy | L |
| **v19 · Đánh bóng + chiều sâu** | SQL bằng lời (N8), ui-ux-v7 P3, General sâu hơn (tách chunk + drill ôn + phỏng vấn), nợ còn lại (portfolio, top bar), cổng đo lại Pyodide | 4 luồng + 1 việc đo tuần tự | L (~8–10 ngày, ước lượng) |
| **v20 · Mở rộng có kiểm soát** | Python cho DA (chỉ khi cổng đạt, có đường NO-GO), bài hướng dẫn trên dữ liệu công khai, chất lượng (hiệu năng, a11y 375/tối trong smoke), mở rộng nội dung domain | 4 luồng | L (~10–12 ngày, ước lượng) |
| **Không làm trong vòng** | Domain thứ tư (§4), tài khoản/đồng bộ/bảng xếp hạng (D-N8), analytics (D-N14 "không") | — | — |

Ràng buộc giữ suốt vòng: không backend (nếu có thì Python), không tài khoản/đám mây (D-N8), CSV của người chơi không rời trình duyệt và không vào file xuất nào, main ≤ 500 KB (trần cứng), không emoji trong UI, không hình có bản quyền của người khác, linh vật CC BY 4.0 của chính dự án, mọi chữ VI + EN, không đổi khóa `cargo-query*`.

---

## 1. v18: những gì đang làm

### 1.1 Luồng

| Luồng | L | Phạm vi (nguồn) | File chính (đã khai) | Trạng thái lúc viết |
|---|---|---|---|---|
| **V18-OFF** | L143 | Snapshot DB đã seed (`src/db/snapshot.ts`, IndexedDB `cargo-query-snap`) + PWA service worker viết tay (spike-s-a, D-N6) | `src/db/*`, `src/pwa.ts`, `src/main.ts`, `src/state.ts`, `ui/topbar.ts`, `index.html`, `vite.config.ts`, `public/*`, `scripts/offline.mjs` | nhánh `v16-offline` |
| **FIX-1** | L147 | Nút back, chặn xuất, dừng đồng hồ phỏng vấn, token chữ/bóng, axe; F8 của v10 (tiêu đề phòng phỏng vấn, sidebar Phần 1–11) | do luồng chốt | worktree, chưa có commit trên `main` |
| **P2** | L148 | ui-ux-v7 T6 (O1 màn chào), T7 (I1a quy cách cảnh), T8 (I1b vẽ lại cảnh E-com/Finance + 3 huy hiệu), T9 (D1 dashboard, D2 ER theo token), T10 (M2 trang dài điện thoại + K1 tối); F7 của v10 (thanh dưới 5 mục) | `src/art/*`, `ui/domainArt.ts`, `ui/homeView.ts`, `ui/welcome.ts`, `ui/dashboard.ts`, `ui/erdView.ts`, `ui/learnView.ts`, `theme.ts`, `style.css` | worktree |
| **V10-A** | L154–L156 | N1, N2, N5; A1–A3, A9 (chunk `sqlmotion`) | `src/viz/steps.ts`, `stepText.ts`, `ui/stepsView.ts`, `ui/flowView.ts`, `src/art/sqlMotion.ts`, `scripts/check-budget.mjs` | worktree |
| **V10-B** | L151–L153 | N3, N4; A4–A7; kiểm F11 | `ui/work.ts`, `ui/feedback.ts`, `ui/resultTable.ts`, `ui/coach.ts`, `src/onboarding.ts`, `ui/celebrate.ts` | worktree |
| **V10-C** | L157 | N6, N7; A8 | `src/practice.ts`, `ui/modes.ts`, `ui/notebook.ts`, `ui/mapStrip.ts` | worktree |
| **V10-D** | L150 | `scripts/smoke.mjs` + `.github/workflows/smoke.yml` | `scripts/smoke.mjs`, `.github/workflows/smoke.yml`, `package.json`, `docs/ops/deploy.md` | worktree (L150 đã viết) |

Thứ tự merge: V10-D trước (để smoke canh các luồng sau), rồi V18-OFF, FIX-1, V10-B, V10-C, P2, V10-A. Chỗ giao file phải kiểm lại khi các luồng có commit (v10 §4 chỉ suy luận): V10-B với P2 (`style.css`, `celebrate.ts`), V10-C với FIX-1 (`mapStrip.ts`, nếu FIX-1 sửa back), V18-OFF với P2 (`index.html`).

**Cổng mắt T8** (ui-ux-v7 ghi "cổng mắt user"): theo L146 không chờ user. Agent dựng bảng ảnh ba domain (1280/375, sáng/tối) vào `review-log.md` mục "v18" và tự chấm theo tiêu chí §0.3 #9 của ui-ux-v7. Đạt thì merge T8; không đạt sau 3 vòng thì dừng ở T7 (phương án lùi đã ghi). User xem sau; nếu user chê thì revert merge commit của T8, giữ T7.

### 1.2 Tiêu chí thoát v18 (tất cả phải đúng trên `main` sau merge cuối)

1. **Đủ luồng:** 7 luồng trên đã merge, hoặc luồng nào bị loại theo luật §5.4 thì có dòng trong `review-log.md` "v18 · bỏ" nói lý do.
2. **Test:** `npx tsc --noEmit` 0 lỗi; `npx vitest run --no-file-parallelism --testTimeout=60000` xanh toàn bộ (gồm `tests/sqlMotion.test.ts`, `tests/onboarding.test.ts` ca đổi việc ở bước 8, `tests/grader.test.ts` "story không bao giờ nhận `missingRows`", `tests/mascots.test.ts` "không `repeatCount: 'indefinite'` trong `src/ui/**`", test snapshot "sai khóa → seed lại").
3. **Build + ngân sách:** `npm run build` và `node scripts/check-budget.mjs` xanh. Trần mềm v18 (đo ở cổng): main ≤ 325, css ≤ 19,5 (trần cứng 20), en ≤ 18, `sqlmotion` ≤ 8, `ecomart`/`finart` ≤ 10, html ≤ 12; tickets, general, me không tăng.
4. **Smoke:** `npm run smoke` (V10-D) xanh trên `vite preview --port 5219 --strictPort` của bản build cuối, ở 1280 và 375; thêm một lượt **offline**: hồ sơ đã mở Logistics một lần, CDP `Network.emulateNetworkConditions` offline, tải lại → nộp đúng việc 1 → `completed` có `ch1-01`. Lượt offline cũng mở `#/learn/interview` và một drill: precache phải có `interviewSources-*`, `interviewView-*`, `general-*`, `learnui` (L144 ghi PWA chưa precache các chunk này).
5. **Trình duyệt (Edge headless, hồ sơ mới):** 375 và 1280, sáng + tối, một lượt `--force-prefers-reduced-motion`: 0 `console.error`/exception, không cuộn ngang, dock giảm chuyển động hiện khung cuối ngay; axe (L141) 0 lỗi serious/critical trên DOM mới: tab Thứ tự thực thi, thẻ "Việc bạn từng vấp", màn chào, dashboard, trang ER.
6. **Số đo ghi vào `review-log.md` "v18":** bảng ngân sách thật; mở lần hai có/không snapshot (3 lần mỗi domain, như spike-s-a); chiều cao Lộ trình 375 (đích ≤ 2500 px, T10) và dashboard 375 (giảm ≥ 50 %, T9).
7. **Giấy tờ:** mỗi luồng một dòng L trong `decision-log.md`, `CLAUDE.md` cập nhật (snapshot/PWA, smoke, `sqlmotion`, token mới).
8. **Deploy:** push `main` → CI xanh → `bash scripts/check-deploy.sh https://khoadautay.github.io/data-training-platform/` không FAIL → `SMOKE_URL=… npm run smoke` xanh trên site thật → tag `v18` (annotated) trên đúng commit đã deploy, push tag. (Tag gần nhất là `v14.1`; v15–v17 đã deploy nhưng không tag, không tag bù.)

---

## 2. v19 · Đánh bóng + chiều sâu

Bắt đầu khi `v18` đã tag. Bốn luồng song song, file không giao nhau, cộng một việc đo chạy **trước** khi mở luồng (§2.5).

### V19-A · SQL bằng lời (N8, đã hẹn ở L157)

- **Người chơi thấy:** dưới editor một dòng "Truy vấn này: lấy 3 cột từ `ports`, giữ dòng có …, nhóm theo …, sắp theo … giảm dần, lấy 10 dòng", vẽ lại sau mỗi lần Chạy (mô tả `app.lastRun`, không phải editor đang gõ; SQL đổi thì dòng có dấu "đã đổi" như các tab). Không có ở index lab và Sandbox thì vẫn có. WITH/UNION/window: dòng "Chưa mô tả được câu này", không lỗi.
- **Code:** dựng từ cây `libpg-query` mà request `steps` đã parse: thêm trường `words` vào `StepsResult` (`src/viz/steps.ts`), không request mới, không sửa `db/worker.ts`. Bộ dựng câu thuần `src/viz/sqlWords.ts` (không chữ dịch, trả mã + tham số như `StepsFailure`); view `src/ui/sqlWordsView.ts`; một chỗ gắn trong `ui/work.ts`. Chữ VI/EN là bảng riêng trong view (không vào `en.ts`, en đang 17/20).
- **Ngân sách (ước lượng):** main +0,6; `parser` +1 (≤ 410).
- **Test:** `tests/sqlWords.test.ts` chạy trên **mọi Solution** của ba domain + drill: không ném, mỗi mệnh đề có mặt trong SQL có đúng một đoạn trong câu; ca không hỗ trợ trả mã.
- **Cỡ:** M. **Chặn bởi:** V10-A (đã merge ở v18). **Chặn:** không.

### V19-B · ui-ux-v7 P3 (X1–X4)

- **X1 chân dung đồng nghiệp** theo ngữ pháp linh vật (đầu to, viền 2 px, gradient, mắt có điểm sáng, màu da/tóc thành token theo theme, 6 kiểu tóc). Nguyên mẫu 6 người × 28/40/48/96 px × sáng/tối; cổng mắt do agent chấm như T8 (§1.1), không đạt sau 3 vòng thì phương án lùi D-U7: chỉ thêm gradient + viền.
- **X2 âm thanh** tùy chọn, **mặc định tắt** (D-U6): 3 âm WebAudio tổng hợp, không file; công tắc trong `⋯`; pref `cargo-query/prefs.sound` (thêm trường vào pref có sẵn, không khóa mới; đọc sai thì tắt). Gọi từ `ui/celebrate.ts` (đúng), `ui/stage.ts` (thăng tiến), `ui/feedback.ts` (sai); **không sửa `work.ts`** (của V19-A).
- **X3 Boon nhỏ** (biến thể đầu ≤ 32 px trong sprite `index.html`).
- **X4 vi chuyển động:** gạch chân tab trượt, dấu tích "Chép", một luật `:focus-visible` chung. **Bỏ** phần "dòng mới của bảng hiện bằng opacity": trùng A4 của V10-B.
- **File:** `ui/avatar.ts`, mới `ui/sound.ts`, `index.html` (sprite), `style.css`, `ui/tabs.ts`, `ui/celebrate.ts`, `ui/stage.ts`, `ui/feedback.ts`, `ui/topbar.ts` (công tắc), `tests/avatar*.test.ts`, mới `tests/sound.test.ts`.
- **Ngân sách (ước lượng):** main +2 (X1 1,5, X2 0,6), html +0,3, css +0,5 (nếu css vượt 20 thì chuyển phần X4 sang lớp Tailwind trong TS, không nâng trần css).
- **Test:** tắt thì không tạo `AudioContext`; tương phản cặp màu chân dung mới ≥ 4,5:1 chỗ có chữ (`tests/theme.test.ts`); `<use>` Boon nhỏ trỏ tới phần có thật trong sprite.
- **Cỡ:** M–L. **Chặn bởi:** P2 (token tối K1). **Chặn:** không.

### V19-C · General sâu hơn

- **Tách chunk** `general` (68/70 đo): `content/general/adv.yml` thành chunk lười riêng `generalAdv` (chỉ tải ở `#/learn/adv/*` và trang Lộ trình phần nâng cao); `general` còn `sql.yml`. Đây là việc mở đường, làm trước.
- **Drill ôn:** mỗi kỹ năng thêm một drill `kind: review` (38 drill, id `g-…`), khác cả 3 drill cũ và "Thử ngay"; hàng ôn Leitner chọn open → trap → review → faded. Không đổi Save.
- **Phòng phỏng vấn:** +2 bộ đề (`mid-3`, `senior-1`: Phần 1–11, có window/CTE) và +2 take-home trên `lab` có rubric VI/EN (interview 19/25 đo).
- **File:** `content/general/*.yml`, `src/general.ts`, `src/content.ts` (chỉ loader `generalAdv`), `src/generalSources.ts` + mới `src/generalAdvSources.ts`, `src/interview.ts` (nếu cần kiểu mới), `scripts/check-budget.mjs` (**chủ của file này ở v19**), `tests/general.test.ts`, `tests/interview.test.ts`, `tests/noDeadEnds.test.ts`, `tests/lessons.test.ts`.
- **Ngân sách (ước lượng):** `general` 68 → ~60 sau tách rồi ~+12 drill ôn (≤ 75, nâng trần thành 80 bằng một dòng L), `generalAdv` ≤ 15 mới, interview ≤ 25.
- **Test:** mỗi kỹ năng đúng 4 drill (`faded | open | trap | review`); drill ôn chạy được, khác Solution của 3 drill kia và của "Thử ngay"; `wrong:` chạy và khác; bộ đề mới chỉ dùng kỹ năng của Phần đã khai; take-home có rubric hai thứ tiếng, EN không dấu.
- **Cỡ:** L (nội dung là phần lớn). **Chặn bởi:** không. **Chặn:** V20-C (smoke mở `#/learn/adv` phải biết chunk mới).

### V19-D · Nợ còn lại

- **Portfolio:** ảnh thẻ dashboard trong file portfolio (L142 "chưa làm"), take-home đã làm vào portfolio (chờ v17, nay có). Ảnh dựng bằng hàm PNG thẻ đã có của L142, đặt trong chunk lười riêng `portfolioPng` vì `me` đang 11/12. Không bao giờ có bảng `sandbox`/CSV trong file xuất (test sẵn có giữ).
- **Top bar 1280 xuống hai dòng** khi tên domain dài (để lại từ trước v5); **640–767 px thiếu hàng ngôn ngữ trong `⋯`** (để lại từ v6). `ui/topbar.ts` đã rời tay V18-OFF.
- **F11** nếu V10-B kết luận chấm "Hộp thư" là lỗi mà chưa sửa.
- **File:** `src/ui/meView*.ts`, mới `src/ui/portfolioPng.ts`, `src/portfolio*.ts`, `ui/topbar.ts`, `ui/inbox.ts`, tests tương ứng.
- **Ngân sách (ước lượng):** me ≤ 12 (không tăng), `portfolioPng` ≤ 6 mới, main +0,3.
- **Cỡ:** M. **Chặn bởi:** V18-OFF (topbar). **Chặn:** không.

### 2.5 Việc đo tuần tự: cổng Pyodide (V19-0)

Spike L139 đo khi máy bận (CPU 46–79 %), nên kết quả chưa dùng được. Đo lại **ở ranh giới bản**: sau khi tag `v18`, trước khi mở bốn luồng v19, không agent nào khác chạy.

- Điều kiện máy: không tiến trình `node`/`vite`/Edge nào khác; CPU nền < 15 % trong 60 s trước khi đo.
- Lặp prototype của nhánh `spike/pyodide-l139`: 5 lần mở ấm, Edge headless, tự host trên `vite preview`.
- **Cổng GO:** trung vị "pandas sẵn sàng" ở lần ấm ≤ 10 s trên máy rảnh **và** ≤ 20 s với CDP `Emulation.setCPUThrottlingRate` 4× (thay cho điện thoại Android tầm trung, vì vòng tự chạy không có máy thật); tab không bị kill khi PGlite (Logistics đã seed) và Pyodide cùng chạy; heap JS + wasm đo được ghi lại.
- Ghi số vào `spike-pyodide.md` §2 (mục "đo lại") và một dòng L.
- **NO-GO:** D5 giữ `external`; V20-A đổi sang phương án lùi (§3, V20-A).
- Cỡ: S. Không chặn luồng v19 nào (chạy trước chúng).

### 2.6 Tiêu chí thoát v19

1. Bốn luồng merge (hoặc bỏ theo §5.4); V19-0 có kết luận GO/NO-GO ghi trong `spike-pyodide.md`.
2. tsc, toàn bộ vitest (`--no-file-parallelism --testTimeout=60000`), build, check-budget xanh. Trần mềm v19: main ≤ 330, css ≤ 20, html ≤ 12, `general` ≤ 80 (sau L nâng trần), `generalAdv` ≤ 15, interview ≤ 25, `portfolioPng` ≤ 6, me ≤ 12.
3. Smoke xanh (từ v19 smoke luôn là cổng chặn) ở preview và site thật; smoke thêm: một drill ôn, `#/learn/adv/<nút>`, xuất portfolio (file có ảnh thẻ, không có tên bảng `sandbox`), công tắc âm thanh tắt → không `AudioContext` (đếm qua `Runtime.evaluate`).
4. Trình duyệt như §1.2 mục 5, cộng bảng ảnh chân dung X1 (6 × 4 cỡ × 2 theme) trong `review-log.md` "v19".
5. Deploy, `check-deploy.sh`, smoke live, tag `v19`.

---

## 3. v20 · Mở rộng có kiểm soát

Bắt đầu khi `v19` đã tag.

### V20-A · Python cho DA (chỉ khi V19-0 = GO)

- **Người chơi thấy:** module tùy chọn "Python cho DA" ở Lộ trình (General), **không** ở domain, cốt truyện hay đánh giá thăng tiến. Vào lần đầu có màn xác nhận "Tải khoảng 14 MB" và thanh tiến độ (`countingFetch`); không bao giờ tải ngầm, không prefetch trước lần xác nhận đầu. 3 kỹ năng × 3 drill (`g-py-…`, cùng khuôn `faded | open | trap`): DataFrame từ kết quả SQL trên `lab`, lọc/nhóm, vẽ bằng renderer bar/line có sẵn (không matplotlib).
- **Code** (spike-pyodide §6): worker riêng `src/py/worker.ts`, `PyClient` (timeout 5 s → terminate + boot lại, `PyError`/`PyTimeoutError` dịch trong `errorText()`), `content/general/py.yml`, `scripts/pyodide.mjs` (tải bản pin vào `public/pyodide/` lúc build, kiểm sha256, không commit nhị phân), `@codemirror/lang-python` lười (dependency mới: cài trên `main`, `--save-exact`, ≥ 2 tuần tuổi), dòng `assets/THIRD_PARTY.md` cho từng gói sau khi đọc file LICENSE.
- **Tự host** trên GitHub Pages (hợp offline, không lộ IP cho CDN); thư mục `public/pyodide/` **không** vào precache PWA mặc định, chỉ cache sau khi người học xác nhận.
- **Ngân sách:** main +1–2 (route + `import()`); nhóm mới `py` ≈ 14 MB gz (ước lượng spike) với kiểm sha256 trong `check-budget.mjs`.
- **Test:** đáp án và `wrong:` mỗi drill chạy bằng `pyodide` npm (cùng bản pin) trong Node, `wrong:` khác đáp án; `skillOfDrill('g-py-…')` = `undefined` (không làm "học" kỹ năng SQL); mọi chỗ đọc `completed` (XP, practice hub, `#/me`) chịu được id `g-py-`.
- **Cỡ:** XL (~8–10 ngày theo spike, ước lượng). **Chặn bởi:** V19-0 = GO. **Chặn:** không.
- **Phương án NO-GO:** luồng thành "Python ngoài app": nút D5 thêm 3 bài đọc + notebook Kaggle công khai (chỉ link, như hôm nay), cỡ S; luồng xong sớm.

### V20-B · Bài hướng dẫn trên dữ liệu công khai (I8)

- **Người chơi thấy:** ở "Dữ liệu của tôi" (Sandbox) một thẻ "Bộ dữ liệu mẫu": bấm là nạp một CSV công khai qua luồng import có sẵn (vào `sandbox`, IndexedDB như file người chơi), kèm 5 câu hỏi dẫn dắt có đáp án chấm bằng grader (0 XP, như "Thử ngay").
- **Cổng giấy phép trước khi viết code:** chọn 1 bộ CC0 hoặc CC BY 4.0, ≤ 5 MB, không dữ liệu cá nhân; ghi nguồn, phiên bản, giấy phép, sha256 vào `assets/THIRD_PARTY.md`. Không tìm được bộ đạt thì bỏ luồng (§5.4), không thay bằng dữ liệu tự bịa gắn nhãn "công khai".
- **File:** `public/datasets/<tên>.csv`, `content/general/datasets.yml`, `src/ui/myDataView.ts`, `src/import/*` (chỉ đường nạp từ URL cùng origin), tests mới `tests/datasets.test.ts`.
- **Ngân sách:** main +0,5; nhóm mới `dataset` ≤ 5 MB (file `public/`, thêm vào `check-budget.mjs` bởi chủ file v20).
- **Test:** CSV qua đủ giới hạn D3; 5 đáp án chạy trên bảng đã nạp; tên bảng không trùng bảng game (`_my`); không có đường nào gửi dữ liệu ra ngoài (không `fetch` khác origin).
- **Cỡ:** M. **Chặn bởi:** không. **Chặn:** không.

### V20-C · Chất lượng: hiệu năng + a11y trong smoke

- **Hiệu năng:** đo và ghi (Edge headless, 3 lần, máy rảnh như V19-0): thời gian tới "DB sẵn sàng" lần đầu và lần hai (snapshot) mỗi domain; main gz; chunk tải ở boot. Đích: không bản nào chậm hơn số v18 quá 10 %; cắt main bằng cách chuyển module chỉ dùng ở một trang sang chunk lười nếu main > 330.
- **a11y:** smoke nạp `node_modules/axe-core/axe.min.js` qua CDP (dev dependency đã có, L141; không vào `dist/`) và chạy axe trên **mọi tuyến** ở 375 tối và 1280 sáng: 0 serious/critical. Sửa những gì nó tìm thấy (ước lượng S–M); kiểm 320 px không cuộn ngang; mục tiêu chạm ≥ 24 px (44 px hàng danh sách trên điện thoại).
- **File:** `scripts/smoke.mjs`, `scripts/check-budget.mjs` (**chủ của file này ở v20**: thêm nhóm `py`, `dataset`), các file UI bị axe chỉ ra (chỉ sửa class/thuộc tính ARIA; nếu trùng file luồng khác thì chờ luồng đó merge rồi sửa trên `main`).
- **Cỡ:** M. **Chặn bởi:** V19-C (chunk `generalAdv`). **Chặn:** nhóm ngân sách của V20-A/V20-B (hai luồng đó gửi tên nhóm + trần cho V20-C, không tự sửa `check-budget.mjs`).

### V20-D · Nội dung domain sâu hơn

- **Người chơi thấy:** Finance chương F7 và E-com chương 7 (mỗi chương 5 việc: teach worked → develop faded → twist → rest → đánh giá thăng tiến 3 bước), ôn tổng hợp kỹ năng đã học (window + CTE + điều kiện), không kỹ năng mới (giống Logistics ch12). Thêm ≥ 3 biến thể cho mọi việc thường còn < 3 biến thể ở hai domain này (Practice đa dạng hơn).
- **Seed:** khối mới **chỉ ở cuối** `src/db/{ecom,fin}/seed.sql`, mỗi khối một `setseed()`; md5 các bảng cũ không đổi (`tests/ecomSeed.test.ts`, `tests/finSeed.test.ts` thêm md5 bảng mới nếu có).
- **Cổng ngân sách trước khi viết:** đo `ecom` và `fin` trên `main`. Mỗi chương ước lượng +7 KB. Chunk nào không còn ≥ 8 KB trống thì luồng chỉ làm biến thể cho domain đó, không thêm chương (không nâng trần 50).
- **File:** `content/domains/{ecom,fin}/**`, `src/db/{ecom,fin}/seed.sql`, `src/art/ecommerce.ts`/`finance.ts` (chỉ thêm một mốc tiến độ cho chương mới), tests nội dung của hai domain.
- **Test:** toàn bộ luật `ecomContent`/`finContent` (worked/faded/reflect/`wrong:`/≥ 3 biến thể/EN không dấu); `contentProblems` sạch; seed Finance ≤ 1,5 s trong Node.
- **Cỡ:** L. **Chặn bởi:** không. **Chặn:** không.

### 3.5 Tiêu chí thoát v20 (= điểm dừng vòng)

1. Bốn luồng merge hoặc bỏ theo §5.4.
2. tsc, toàn bộ vitest, build, check-budget xanh. Trần mềm v20: main ≤ 335, css ≤ 20, `ecom`/`fin` ≤ 50, `py` theo số đo V19-0 (nếu GO), `dataset` ≤ 5 MB.
3. Smoke xanh ở preview và site thật, gồm axe mọi tuyến (V20-C), module Python (nếu GO: chặn tải tới khi xác nhận, một drill đạt), bộ dữ liệu mẫu (nạp → 1 câu đạt), việc 1 của chương mới mỗi domain (nhảy bằng save dựng sẵn).
4. `review-log.md` "v20": bảng ngân sách thật, số hiệu năng V20-C so với v18, danh sách "chờ user" (§6).
5. Deploy, `check-deploy.sh`, smoke live, tag `v20`, push tag. **Vòng dừng ở đây**: không lập kế hoạch v21, không mở luồng mới.

---

## 4. Domain thứ tư: không làm trong vòng

D-N12 chỉ cấm trước v18, nên v19/v20 được phép. Quyết định: **không**, vì:

- **Giá trị thấp nhất trong các ứng viên còn lại** (I9 = 2/5 ở roadmap-v15): ba domain đã phủ 38 kỹ năng; người học junior DA cần chiều sâu và chuẩn bị đi làm hơn bối cảnh thứ tư.
- **Cỡ XL** (khuôn Plan 9/11: schema + seed có hook, md5, ~30 việc VI/EN, người, KPI, cảnh + dock, starter cards): một mình nó lớn hơn cả một bản trong vòng này.
- **Save v6:** `byDomain` cần trường mới và `MIGRATIONS[5]`, phát hành riêng; luật vòng là mỗi bản tối đa một luồng đổi Save, và v19/v20 không có luồng nào cần đổi Save. Thêm migration vào một vòng tự chạy không người chơi thử là rủi ro mất tiến độ không đáng.
- **Không có người đọc nội dung:** L146 bỏ cổng chơi thử; nội dung domain mới (cốt truyện, đề nghiệp vụ, kết luận) là phần test kiểm được ít nhất.

V20-D (thêm chương cho E-com/Finance) lấy phần giá trị đó với rủi ro thấp hơn. Domain thứ tư để user quyết sau v20.

---

## 5. Giao thức vòng lặp

### 5.1 Mỗi luồng

1. **Worktree:** `git worktree add .claude/worktrees/<luồng> -b <luồng> main` từ `main` mới nhất khi luồng **bắt đầu** (không tạo sớm). Luồng chỉ sửa file trong danh sách của nó; cần file ngoài danh sách thì dừng và đợi chủ file merge.
2. **Dependency mới:** chỉ cài trên checkout chính, tuần tự, `npm i --save-exact`, phiên bản ≥ 2 tuần tuổi, dòng `assets/THIRD_PARTY.md` cùng commit. Không bao giờ `npm i` trong worktree (`node_modules` là junction sang checkout chính, L141).
3. **Cổng trong worktree** (theo thứ tự, dừng ở lỗi đầu):
   - `npx tsc --noEmit`
   - `npx vitest run --no-file-parallelism --testTimeout=60000`
   - `npm run build`
   - `node scripts/check-budget.mjs`
   - `npm run smoke` (preview cổng ≥ 5219, `--strictPort`, không bao giờ 5173/5174; tắt preview và Edge sau khi xong)
   - Trước khi V10-D merge (đầu v18): thay smoke bằng kiểm trình duyệt của ui-ux-v7 §6. L150 cho smoke tuần đầu không chặn; trong vòng này smoke **chặn từ khi v18 thoát**.
4. **Merge:** `git merge --no-ff <luồng>` vào `main` (luồng khác có thể vừa merge: rebase không cần, chạy lại cổng 3 trên `main` sau merge). Cổng trên `main` hỏng thì revert merge commit đó ngay, luồng sửa trong worktree rồi thử lại.
5. **Deploy:** push `main` (CI build → deploy → post-deploy check, `docs/ops/deploy.md` §2), rồi `bash scripts/check-deploy.sh <site>` và `SMOKE_URL=<site> npm run smoke`. Hỏng ở site thật: rollback theo deploy.md §4 (`git revert` merge commit, push).
6. **Giấy tờ trong commit của luồng:** một dòng L (số trong dải của luồng, §5.3), dòng `CLAUDE.md` nếu đổi kiến trúc/luật, mục `review-log.md` của bản.

### 5.2 Chỗ chung

- **i18n:** mỗi luồng thêm khóa trong một khối riêng có chú thích tên luồng ở **cuối** `src/i18n/vi.ts`/`en.ts`; merge chỉ nối thêm. Ưu tiên bảng VI/EN trong chunk lười (en 17/20).
- **`scripts/check-budget.mjs`:** một chủ mỗi bản: v18 V10-A (nhóm `sqlmotion`; V18-OFF đã có phần của nó), v19 V19-C, v20 V20-C. Luồng khác gửi tên nhóm + trần cho chủ.
- **Save:** tối đa một luồng đổi Save mỗi bản; v18–v20 không có luồng nào dự kiến đổi (không bump `SAVE_VERSION`). Khóa localStorage mới chỉ khi tài liệu này ghi (V19-B dùng `cargo-query/prefs`, không khóa mới).

### 5.3 Dải số L (đặt trước để các luồng song song không đụng số)

Trên `main` lúc viết: cao nhất L146 (dòng không theo thứ tự). Đã giữ: L143 (V18-OFF), L147 (FIX-1), L148 (P2), L149–L157 (product-design-v10).

| Dải | Dùng cho |
|---|---|
| **L158** | Duyệt tài liệu này: vòng tới v20, giao thức §5, không domain thứ tư, cổng mắt do agent chấm (ghi khi commit tài liệu được merge/đọc lần đầu bởi bên điều phối) |
| **L159** | Thoát v18: số đo, luồng bị bỏ (nếu có), tag `v18` |
| L160–L161 | V19-0 cổng Pyodide (số đo, GO/NO-GO) |
| L162–L163 | V19-A SQL bằng lời |
| L164–L166 | V19-B P3 (X1 chân dung, X2 âm thanh, X3/X4) |
| L167–L169 | V19-C tách chunk, drill ôn, phỏng vấn |
| L170–L171 | V19-D portfolio, top bar |
| **L172** | Thoát v19, tag `v19` |
| L173–L175 | V20-A Python (hoặc phương án NO-GO) |
| L176–L177 | V20-B bộ dữ liệu công khai |
| L178–L179 | V20-C hiệu năng + a11y |
| L180–L181 | V20-D chương mới E-com/Finance |
| **L182** | Thoát v20, tag `v20`, vòng dừng |

Luồng cần thêm số ngoài dải: lấy từ L183 trở đi, theo thứ tự merge.

### 5.4 Chặn, đợi, bỏ: luật dừng

- **Chặn bởi luồng khác:** luồng chưa bắt đầu tới khi luồng chặn nó đã merge vào `main`. Phụ thuộc trong tài liệu: P2 → V19-B; V18-OFF → V19-D; V10-A → V19-A; V19-C → V20-C; V19-0 → V20-A; tag bản trước → mọi luồng bản sau.
- **Cần user:** không bao giờ làm cả vòng đứng. Luồng dùng phương án mặc định/lùi đã ghi (T8 → T7, X1 → D-U7, Python → NO-GO hoặc xác nhận 14 MB trong app, dữ liệu công khai không có giấy phép sạch → bỏ) và ghi việc chờ user vào `review-log.md` "chờ user". Bản vẫn thoát.
- **Cổng hỏng:** một luồng được tối đa 3 lần sửa cho cùng một cổng. Lần thứ 3 vẫn hỏng thì luồng bị **bỏ khỏi bản** (không merge, hoặc revert nếu đã merge), ghi lý do; nó không tự chuyển sang bản sau trừ khi tài liệu này đã ghi.
- **Dừng:** sau khi `v20` được tag và deploy (§3.5), vòng kết thúc. Không bản nào sau v20 được mở trong vòng này.

---

## 6. Cần user (không chặn vòng)

| Việc | Mặc định trong vòng | User có thể |
|---|---|---|
| Cổng mắt T8 (cảnh E-com/Finance mới) và X1 (chân dung) | Agent chấm bằng bảng ảnh, ghi trong review-log | Xem ảnh, yêu cầu revert về T7 / D-U7 |
| Pyodide: tải 14 MB, đo trên điện thoại Android thật | Chỉ khi V19-0 đạt (máy rảnh + CPU 4×); tải chỉ sau xác nhận trong app; tự host | Đo trên máy thật, hoặc tắt module (revert V20-A) |
| Domain thứ tư | Không trong vòng | Quyết sau v20 |
| Analytics (D-N14) | Không | Bật Cloudflare Web Analytics (đổi host hoặc thêm script) |
| Chơi thử với người thật (roadmap-v15 §5.1) | Không là cổng (L146) | Tuyển người; kết quả thành dòng Q cho sau v20 |
| Nén `.wasm`/`.data` trên GitHub Pages (deploy.md §3 WARN) | Giữ GitHub Pages | Chuyển Cloudflare Pages (deploy.md §6) |
