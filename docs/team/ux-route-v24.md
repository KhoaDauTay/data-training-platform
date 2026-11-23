# UX route v24: Lộ trình và Database Engine khi bài dài như tutorial

Người viết: UI/UX. Ngày 2026-11-23. Nhánh `design-v24`. **Chỉ là thiết kế**: không có code, không đổi nội dung.

**Căn cứ:** `product-route-v24.md` ở `ef14ad8`/`9abcdec`: §2 (giải phẫu **8 mục**, độ sâu điều hướng), §1 (**11 Phần** mới, Engine 200 → 241 bài gồm thẻ thứ tư **Thiết kế CSDL**), §1.7 (bản đồ kỹ năng + huy hiệu thay chứng nhận); `decision-log.md` L320–L327 (L322 engine thứ tư, L323 bỏ chứng nhận, L326 bỏ MySQL/SQLite); `boondata-gap-map.md` ("Lesson pages will need a UI/UX redesign"); `engine-redesign-v22.md`, `engine-ux-spec.md`, `ui-ux-v7.md` (token T1, M1/M2), `review-v23.md`; CLAUDE.md (token, pipeline icon, a11y, chuyển động).

**Mockup:** `docs/team/v24-mockups/` (mở `index.html`: mọi hình trong một file, không script ngoài). Màu là hex thật của token trong `src/style.css` (`:root` cho bản sáng, `:root[data-theme=dark]` cho bản tối). Icon là path thật của Phosphor duotone 2.1.1 (`@phosphor-icons/core`) và của `scripts/icon-custom.json`. Nét tím đứt và số khoanh tím là chú thích, không phải UI. Mỗi hình đã được mở bằng Edge headless để kiểm chữ có tràn không. Số liệu trong hình là minh họa, trừ những chỗ ghi "đo".

| File | Nội dung |
|---|---|
| `01-track-1280-light.svg` | `#/learn`: ô tìm, thẻ Học tiếp, track dạng tab, 11 Phần mới (Product §1.1) là thẻ gọn |
| `02-level-1280-light.svg` | `#/engine/postgres/L3` (18 bài thật), sidebar ở trạng thái **đang mở** (mặc định ở 1280 là rail): cây, chip lọc, nhóm xong gập, hàng bài 48 px |
| `03-lesson-1280-light.svg` | Bài kỹ năng LEFT JOIN đủ 8 mục + dòng mức kỹ năng: mục lục dính, ví dụ chạy tại chỗ, bẫy chạy thật, Thực hành, Câu hỏi, Tóm tắt |
| `04-search-1280-light.svg` | Hộp thoại tìm (Ctrl K) |
| `05-track-375-dark.svg` … `08-search-375-dark.svg` | Bốn trang trên ở 375 tối (07 có thêm bảng mục lục mở) |
| `09-engine-1280-light.svg`, `10-engine-375-dark.svg` | `#/engine` với 4 thẻ: PostgreSQL, MongoDB, DynamoDB, **Thiết kế CSDL** |
| `11-me-1280-light.svg`, `12-me-375-dark.svg` | `#/me`: **Bản đồ kỹ năng** (mức 0–4, Cần ôn, Engine theo mô-đun) và **37 huy hiệu** (§6.3) |
| `13-icons-light.svg`, `13-icons-dark.svg` | Bảng icon (§12) |

Ảnh hiện trạng (site live, Edge headless, hồ sơ mới, save `save-v5.json`): `C:\Users\khoa.huynh\Documents\study\bd-wt\design-v24-shots\` (`light-1280-*.png`, `dark-375-*.png`; ảnh tham chiếu `ref-*-1280/375.png`). Script `shots.mjs`, `refs.mjs` ở cùng thư mục, ngoài repo. Bộ vẽ mockup ở `design-v24-shots\gen\` (`python -I mock.py`), cũng ngoài repo.

---

## 0. Hiện trạng: vì sao UI hôm nay không chịu được nội dung dài

| Thấy gì (ảnh) | Hậu quả khi bài dài gấp 3–6 lần |
|---|---|
| Bài lab `e-pg-l1-04` ở 1280 dài **2,728 px** chỉ với 4 bước: mỗi bước dựng sẵn một editor CodeMirror cao 70 px, kể cả bước chưa tới (`light-1280-engine-lesson-lab.png`) | Bài đích có 3–6 ví dụ + 2–4 bẫy + 3–6 bước: 6,000–9,000 px, hàng chục editor sống cùng lúc |
| Không có điều hướng trong bài: không mục lục, không biết mình đang ở mục nào | Người học lạc giữa bài; quay lại "Cú pháp" phải cuộn tay |
| Trang kỹ năng General (`#/learn/skill/group_by`) là một thẻ nút ("Mở bài học", 4 nút drill) + thẻ kỹ năng (`dark-375-learn-skill.png`) | Không có chỗ cho 8 mục; bài nhanh nằm trong hộp thoại |
| Hàng bài ở trang cấp cao 76 px (`light-1280-engine-pg-L1.png`): 12 bài L1 cần hơn một màn; L3 có 18 bài | 20–25 bài một cấp cần 2,5–3 màn; bài đã xong chiếm chỗ ngang bài chưa làm |
| Không có tìm kiếm ở đâu | ~305 bài (43 kỹ năng + 21 nút có bài + 241 bài Engine) chỉ tìm được bằng cách nhớ vị trí |
| Sidebar chỉ có số Phần/cấp (rail) | Không thấy cấu trúc bên trong một cấp |

## 1. Nguyên tắc

1. **Dài = nhiều mục ngắn, không phải một khối dài** (Product §2.2). Mỗi mục có tiêu đề `h2` có icon, đọc được độc lập; mục lục chỉ ra mục đang đọc.
2. **Đọc trước, chạy tại chỗ.** Ví dụ là code đọc sẵn có nút Chạy; kết quả hiện ngay dưới code. Editor chỉ dựng khi người học muốn sửa ("Sửa thử") hoặc ở Thực hành.
3. **Một tầng mở mỗi lần** (NN/g: progressive disclosure tốt nhất ở hai tầng). Cây sidebar chỉ mở nhánh đang ở; danh sách gập nhóm đã xong; thân bài không dùng accordion trên máy tính (NN/g: đọc liền mạch thì đừng gập), chỉ gập ví dụ phụ và Lỗi hay gặp trên điện thoại (Product §2.4).
4. **Gọn bằng mật độ, không bằng chữ nhỏ.** Hàng 48 px (máy tính) / 64 px (điện thoại), chữ vẫn `text-body`/`text-body-sm`; bớt chrome chứ không bớt cỡ chữ.
5. **Không thêm phong cách mới.** Mọi thứ dựng từ token và lớp đã có (`CARD`, `LIST`/`listRow`, `PILL`, `BTN_GO/SECONDARY/GHOST`, `kbd()`, `emptyState`, `renderResult`, `createEditor`, `--r-*`, `--shadow-*`, `text-caption…display`). Một `BTN_GO` mỗi vùng; không transform trên thẻ/nút/link (L93).
6. **Nhãn trung thực ở mọi chỗ chạy được** ("Chạy thật · PostgreSQL 18.6 (PGlite)", "Chạy bằng mingo", "Không chạy trong trình duyệt · theo tài liệu MySQL 8.4"). Không "sắp có", không khóa ở General.
7. **Không có gì mới phải lưu vào Save.** Tiến độ mục là suy ra từ dữ liệu đã có (§5.7); "đã chạy ví dụ" chỉ sống trong phiên.

## 2. Nghiên cứu: trang học dài vẫn dùng được nhờ gì

Chỉ ghi những gì đã đọc hoặc chụp được hôm nay (2026-11-23).

| Nguồn | Mẫu | Lấy gì cho BoonData |
|---|---|---|
| NN/g, [Table of Contents](https://www.nngroup.com/articles/table-of-contents/) | Mục lục ở rail thì **dính** và **tô mục hiện tại**; mục lục trong thân bài thì **không dính**; trên điện thoại đặt trong thân bài, "sticky collapsible TOC… many users failed to notice" | Mục lục rail phải dính ≥ 1280; điện thoại: mục lục trong thân (đóng sẵn) + nút mở ở thanh bài, không dựa vào một thanh dính duy nhất |
| NN/g, [Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/) | "Initially, show users only a few of the most important options"; quá hai tầng thì lạc | Cây sidebar chỉ mở một nhánh; nhóm đã xong gập; ví dụ phụ và bẫy thứ hai gập |
| NN/g, [Accordions on Desktop](https://www.nngroup.com/articles/accordions-on-desktop/) | Đừng gập khi người dùng cần hầu hết nội dung hoặc đọc liền mạch | Thân bài máy tính không là accordion; chỉ gập phần phụ (ví dụ chưa chạy, bẫy phụ) |
| PostgreSQL docs, [2.6 Joins Between Tables](https://www.postgresql.org/docs/current/tutorial-join.html) | Số mục phân cấp (2.5 → 2.6 → 2.7), thanh Prev / Up / Home / Next ở **cả đầu và cuối** trang | Số thứ tự bài trong cấp ("06"), Bài trước / Bài tiếp có tên bài ở cuối; "Up" = link Phần/cấp trong thanh bài |
| MDN, [position](https://developer.mozilla.org/en-US/docs/Web/CSS/position) (ảnh `ref-mdn-1280.png`, `ref-mdn-375.png`) | Ba cột: cây trái có ô Filter, nội dung, "In this article" dính phải với mục hiện tại tô nền; khối "Try it" chạy được ngay đầu bài; ở 375 đường dẫn rút còn hai cấp cuối, cây vào nút sidebar | Bố cục ba cột ở ≥ 1280; ô lọc đầu sidebar; đường dẫn rút gọn trên điện thoại |
| Stripe docs, [Payments quickstart](https://docs.stripe.com/payments/quickstart) (ảnh `ref-stripe-1280.png`) | Cột chữ theo bước + khung code bên phải có tab file (ảnh không cuộn, nên chưa xác nhận nó dính), số dòng; ô tìm có gợi ý phím "/" | Bố cục chia đôi đọc/code là **phương án sau** (§5.4); gợi ý phím tắt ngay trong ô tìm |
| SQLBolt, [Lesson 1](https://sqlbolt.com/lesson/select_queries_introduction) (ảnh `ref-sqlbolt-*.png`) | Bài = giải thích + cú pháp + **bài tập ngay dưới** (bảng dữ liệu, editor, danh sách nhiệm vụ có "Solution"); "Solve all tasks to continue" | Thực hành đặt cuối thân bài, một editor; bảng dữ liệu cạnh bài tập ("Bảng dùng" đã có) |
| Material for MkDocs, [Setting up navigation](https://squidfunk.github.io/mkdocs-material/setup/setting-up-navigation/) | `navigation.prune` cho site 100+ trang ("only visible navigation items"), `toc.follow` (mục lục tự cuộn để mục hiện tại luôn thấy), `navigation.path` (đường dẫn trên tiêu đề) | Cây chỉ dựng nhánh đang mở; mục lục dài tự cuộn theo mục hiện tại; đường dẫn ≤ 3 cấp |
| Khan Academy, [mastery levels](https://support.khanacademy.org/hc/en-us/articles/115002552631) (qua kết quả tìm kiếm; trang trả 403) | Tiến độ khóa học = số kỹ năng đạt / tổng; mở rộng ra từng unit | Tiến độ Phần/cấp = bài xong / tổng, không phải % đọc |
| Docusaurus, [Search](https://docusaurus.io/docs/search) | Tìm kiếm cục bộ hoặc DocSearch; trang tìm riêng; tìm theo ngữ cảnh (phiên bản, ngôn ngữ) | Tìm cục bộ (không có backend), lọc theo ngôn ngữ đang bật |
| WAI-ARIA APG, [Combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) và [Disclosure navigation](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/) (mẫu chuẩn, không đọc lại hôm nay) | Ô nhập combobox + listbox; menu điều hướng bằng nút `aria-expanded` | Hộp thoại tìm; cây sidebar dùng nút mở/đóng, **không** `role=tree` |

Không xác minh được hôm nay (trang chặn hoặc cần đăng nhập): Codecademy (403), Exercism (trang track cần đăng nhập; chỉ đọc được qua diễn đàn rằng bài bị khóa theo concept), Khan (403). Không dùng các trang mirror của DocSearch làm nguồn.

## 3. Kiến trúc thông tin

Product §2.4: tối đa 4 tầng trang + 1 tầng mục. Bản đồ lên route có sẵn:

| Tầng | General (SQL) | Database Engine | Hiện ở đâu |
|---|---|---|---|
| 1 Khu | `#/learn` | `#/engine` | nav top bar; điện thoại: mục "Học" + công tắc SQL \| Engine |
| 2 Track | SQL · Phần 1–11, Nâng cao (dạng tab trên `#/learn`) | engine `#/engine/<engine>`: PostgreSQL, MongoDB, DynamoDB, Thiết kế CSDL (`e-ds-…`, L322) | tab / thẻ engine; sidebar: gốc cây |
| 3 Phần / cấp | `#/learn/sql/<n>` | `#/engine/<engine>/<L>` | trang danh sách (§6) |
| (3b) Mô-đun | — (Phần là mô-đun) | nhóm trên trang cấp (không có trang riêng) | tiêu đề nhóm; trong cây là lá, bấm = cuộn tới nhóm |
| 4 Bài | `#/learn/skill/<id>`, `#/learn/adv/<node>` | `#/engine/<engine>/<L>/<id>` | trang bài (§5) |
| 5 Mục | 8 mục | 8 mục | mục lục trong bài; không phải route |

**Gấp tầng:** Engine có 5 tầng danh nghĩa (khu › engine › cấp › mô-đun › bài). Mô-đun không thành trang: nó là nhóm trên trang cấp và là lá trong cây. Vì vậy người học không bao giờ qua quá 3 trang danh sách để tới một bài.

**Đường dẫn (breadcrumb):** tối đa 3 mắt xích trên `h1`, theo mẫu `learnSub`/`pageSubs` hiện có: `Lộ trình › Phần 5 · Nối bảng`; `Database Engine › PostgreSQL › L3 · Hiệu năng`. Trên điện thoại chỉ còn một link "‹ <cha>" trong thanh bài (§7), như MDN rút đường dẫn.

**Link sâu tới mục:** router giữ hash nên không dùng `#anchor`. Mục lục là nút gọi `scrollIntoView`. Link tới một mục cần cú pháp mới trong `src/route.ts` (vd. `…/left_join/examples`); Product §2.4 nói lát đầu chưa cần. Thiết kế giữ chỗ: kết quả tìm "mục trong bài" mở bài rồi cuộn tới mục (một tham số trong bộ nhớ, không phải URL) cho tới khi route có cú pháp đó. Thẻ Học tiếp (`01`) trỏ tới bài; câu phụ ghi mục đang dở.

## 4. Điều hướng

### 4.1 Sidebar: cây gọn

- **Rộng 256 px** (khi người học mở, hoặc mặc định trên trang danh sách rộng theo luật hiện có của `#side`): ô tìm ở đầu, rồi cây (`02`):
  - Engine: `Database Engine` › 4 engine (icon `engRelational/engDocument/engKeyValue/engDesign`) › L1–L5 (huy hiệu `L3` + tên ngắn + k/n) › mô-đun của **cấp đang mở** (icon trạng thái + tên + k/n).
  - General: Phần 1–11 (số + tên + k/n) › các bài của **Phần đang mở**; Nâng cao là nhóm thứ hai, gập.
- **Chỉ một nhánh mở** (kiểu `navigation.prune`): bài không vào cây ở Engine (cấp có tới 25 bài, cây sẽ dài hơn trang); ở General, Phần có 3–6 bài nên bài vào cây.
- Dòng hiện tại: nền `bg-accent-soft` + vạch trái 3 px `--accent` + `aria-current="page"` (một dòng duy nhất, như L189).
- **Rail 64 px** (mặc định ở play và 1024–1279, và ở trang bài ≥ 1280 vì chỗ dành cho mục lục, §5.1): nút mở sidebar, **nút tìm** (icon `search`, mới), rồi số Phần / huy hiệu cấp như hôm nay.
- Cấu trúc: `<nav aria-label>` + danh sách lồng nhau; nút mở/đóng nhánh có `aria-expanded` (mẫu disclosure navigation). Không `role=tree`: bàn phím đi bằng Tab như link thường, không phải học phím mũi tên.

### 4.2 Mục lục trong bài ("Trong bài này")

- ≥ 1280: cột phải 232 px, dính (`position: sticky; top` dưới top bar), chú thích chữ hoa `text-caption` + icon `toc`. Mỗi mục: icon mục 16 px `text-muted`, tên, cột phải ghi tiến độ của mục **chấm được** (Ví dụ "1/4" đã chạy trong phiên, Thực hành "1/4", Câu hỏi "0/3"). Mục đang đọc: nền `accent-soft`, vạch 3 px `--accent`, chữ đậm `--accent`, `aria-current="location"`. Mục lục dài hơn màn thì tự cuộn để mục hiện tại luôn thấy (`toc.follow`).
- Mục đang đọc = tiêu đề `h2` cuối cùng đã qua mép trên vùng đọc (IntersectionObserver, không lắng nghe scroll).
- Dưới mục lục: ô tìm thu nhỏ ("Tìm bài, mục…" + `kbd('Ctrl')` `kbd('K')`).
- 1024–1279: không có cột phải. Mục lục nằm trong thân bài dưới hàng chip (thẻ `<details>` đóng sẵn, như điện thoại) và thanh bài dính 48 px có nút "n/8 · tên mục" mở mục lục dạng popover (§7).

### 4.3 Bài trước / bài tiếp

Cuối bài: thẻ hai link có **tên bài** ("Bài trước · Nối nhiều bảng", "Bài tiếp · Lưới mọi cặp (CROSS JOIN)"), như PostgreSQL docs. Link "Bài tiếp" là `BTN_GO` chỉ khi bài đã xong (giữ luật v22). Trên điện thoại hàng này cuối bài, không dính (không thêm thanh thứ hai trên `#bottom-nav`).

### 4.4 Tìm kiếm

- **Lối vào:** ô tìm ở đầu `#/learn` và `#/engine`, đầu sidebar rộng, nút trên rail, dưới mục lục, nút trong thanh bài trên điện thoại. Phím `Ctrl/⌘ K` và `/` mở hộp thoại, **trừ khi** focus đang ở CodeMirror, ô nhập, hộp thoại khác (luật `pageShortcutOf`: bỏ qua sự kiện editor đã xử lý, IME, form). Top bar không thêm nút (L272 đã chật).
- **Hộp thoại** (`04`, `08`): `<dialog>` modal 640 px (toàn màn dưới 640 px), sở hữu Esc, focus về nút mở khi đóng. Ô nhập là combobox (APG): `aria-controls` tới listbox, `aria-activedescendant`, ↑↓ chọn, Enter mở. Chip phạm vi (Tất cả · Lộ trình · Engine · Có chạy được), có số kết quả.
- **Kết quả** nhóm: *Bài* (icon kỹ năng / icon loại bài + tên + đường dẫn), *Mục trong bài* (icon mục + "Lỗi hay gặp · <tiêu đề bẫy>" + tên bài), *Database Engine*. Phần khớp tô `--accent` đậm (không chỉ màu: đậm + màu). Chưa gõ: "Tìm gần đây" (pref thiết bị `cargo-query/search`, ≤ 8, xóa được) + các mục của bài đang mở.
- **Chỉ mục:** lúc build, từ frontmatter + tiêu đề `##` của mọi bài (tên bài VI/EN, tiêu đề mục, tiêu đề ví dụ và bẫy, id kỹ năng, từ khóa SQL trong "Cú pháp"); lazy chunk `searchIndex`, tải lần đầu mở hộp thoại. Ước lượng: ~300 bài × ~15 mục × ~60 byte ≈ 270 KB thô, ~40–50 KB gz → nhóm ngân sách mới `search` 60 KB, đo thật khi build. Khớp không dấu (bỏ dấu tiếng Việt khi so) và theo tiền tố từ. Không gửi gì ra ngoài.

## 5. Trang bài dài

### 5.1 Bố cục theo bề rộng

| Bề rộng | Bố cục (`03`, `07`) |
|---|---|
| ≥ 1440 | sidebar 256 (nếu người học mở) + cột đọc 720 + mục lục 232 |
| 1280–1439 | rail 64 + cột đọc 720 + mục lục 232 (64 + 48 + 720 + 48 + 232 = 1,112, còn 168 px lề phải). Mở sidebar 256 thì mục lục rời vào thân bài như 1024 |
| 1024–1279 | rail 64 + cột đọc 720, mục lục trong thân + thanh bài dính 48 px |
| < 1024 | một cột 16 px lề, thanh bài dính 48 px, mục lục trong thân + bảng dưới (§7) |

Cột đọc 720 px (chữ `text-body` 16, ~75 ký tự một dòng); bảng và khối code được rộng hết cột. 

### 5.2 Đầu bài

Đường dẫn (§3) → `h1` → hàng chip → (trang kỹ năng General) **dòng mức** (§6.3): 4 chấm + "Mức của bạn: Đã gặp" + **một** việc để lên mức kế ("qua thêm 1 bài luyện") + chữ mờ "tự đo, không xác minh", ô `bg-surface-2` cao 40 px. Hàng chip: nhãn trung thực (`bg-good-soft`, icon `inApp`), loại bài (icon kỹ năng ở General, icon `kind*` ở Engine), thời lượng (icon `time`), "Nên học trước:" + chip link (không khóa). Bài `docs` thay hàng chip đầu bằng chip `docsOnly` + một dòng mờ (giữ v22).

### 5.3 Tám mục (Product §2.2) và cách vẽ từng mục

Mỗi mục: `<section aria-labelledby>` + `h2` = huy hiệu tròn 30 px `bg-accent-soft` + icon `--accent` + tên `text-title`. Khoảng cách giữa mục bằng `flex flex-col gap-*` (không `space-y-*`, xem v22).

| # | Mục (icon) | Vẽ thế nào |
|---|---|---|
| 1 | Mở bài (`secOpen`) | 1–3 câu tình huống; ô `bg-surface-2` "HỌC XONG BẠN LÀM ĐƯỢC" (nhãn chữ hoa `text-caption`, 2–4 gạch đầu dòng) |
| 2 | Ý chính (`kindConcept`) | đoạn ≤ 150 từ; câu "Nhiều người nghĩ X. Thật ra Y" in đậm phần X |
| 3 | Cú pháp (`secSyntax`) | khối code `--code`, không số dòng, phần tùy chọn trong `[ ]`; bảng 2 cột "tùy chọn → ý nghĩa" ≤ 8 dòng (`CARD`, đầu bảng `bg-surface-2`) |
| 4 | Ví dụ chạy được (`secRun`) | khối ví dụ (§5.4); cột phải tiêu đề ghi "k/n đã chạy trong phiên này" |
| 5 | Lỗi hay gặp (`secPitfall`) | thẻ `bg-warn-soft`: icon `warn` + tên bẫy; chip "Sai" (`bad-soft`) + câu sai (một dòng mono), câu vì sao, chip "Sửa" (`good-soft`) + câu sửa; hai nút ghost "Chạy câu sai" / "Chạy câu sửa" (kết quả hoặc `errorView` có SQLSTATE hiện ngay dưới). Bẫy thứ hai trở đi là một hàng 52 px gập (`<details>`). Khác biệt phương ngữ (L326: không dạy MySQL/SQLite) chỉ xuất hiện ở đây khi là bẫy thật của người viết Postgres: một dòng, chip `bg-info-soft` "theo tài liệu <hệ>, không chạy" |
| 6 | Thực hành (`secPractice`) | General: thẻ "Thử ngay" có **editor dựng sẵn** (chỗ duy nhất trong bài), Chạy thử (`BTN_SECONDARY`), Gợi ý (ghost), **Nộp (`BTN_GO`, một mỗi vùng)**; dưới đó hàng 4 bài luyện (icon trạng thái + tên, mỗi cái là link sang drill workspace). Engine lab: các bước như v22/v23 nhưng **chỉ bước hiện tại** dựng editor; bước đã đạt hiện SQL đã nộp (đọc), bước sau hiện đề + "Làm sau bước n" (không editor). Bước có thanh hiệu năng: §5.6 |
| 7 | Câu hỏi kiểm tra (`kindQuiz`) | như thẻ quiz v22: câu `text-title`, lựa chọn là hàng 44 px có viền, chọn = `accent-soft` + viền 2 px; `why` sau khi trả lời |
| 8 | Tóm tắt và đọc thêm (`secRecap`) | 3–5 gạch đầu dòng; link (icon `external`) tới nguồn chính thức và thẻ Best Practice; rồi Bài trước / Bài tiếp (§4.3) |

Bài `predict`, `quiz`, `capstone` dùng tập con của Product §2.2; mục lục chỉ liệt kê các mục bài đó có.

### 5.4 Khối ví dụ chạy được

```
┌ [secRun] Ví dụ 1 · <tên>                    [Sửa thử] [copy] (Chạy) ┐
│ 1  SELECT …   (code đọc sẵn, tô màu --syn-*, số dòng)               │
│ ✓ 5 dòng · 4 ms · Chạy thật                                  Kết quả │
│ ┌ bảng kết quả (renderResult, ≤ 5 dòng, "Xem 12 dòng") ┐            │
│ Đọc kết quả: <1–2 câu>                                               │
└──────────────────────────────────────────────────────────────────────┘
```

- **Code đọc sẵn** là `<pre class="sql">` tô màu tĩnh (cùng `HighlightStyle` `--syn-*`), không phải CodeMirror. "Sửa thử" thay khối đó bằng `createEditor` tại chỗ (focus vào editor), thêm nút "Đặt lại" (icon `resetCode`). Lý do: bài 6 ví dụ + 4 bẫy sẽ cần 10 editor sống cùng lúc; chưa đo chi phí, nhưng không có lý do dựng editor người học không dùng.
- **Chạy** = `BTN_SECONDARY` (Nộp ở Thực hành mới là `BTN_GO`). Chạy trên `lab` / setup của bài như "Thử ngay" (`runOn`, `app.ensure('lab')`, `preview.loading` lần đầu), không đụng `app.lastRun`, draft, history, XP.
- **Kết quả** dưới code: dòng trạng thái (icon `check` + "n dòng · ms · nhãn", `role=status`), bảng `renderResult` tối đa 5 dòng rồi "Xem n dòng" (mở thêm tại chỗ), câu "Đọc kết quả" do nội dung viết, hiện **sau** khi chạy (người học nhìn kết quả trước, đọc giải thích sau). Lỗi: `errorView(e, note, sql)`.
- Ví dụ thứ hai trở đi hiện **đóng** dạng hàng 52 px (tên + "Chưa chạy" + Chạy) trên máy tính khi bài có > 3 ví dụ; bấm tên = mở code; bấm Chạy = mở và chạy. Đây là ngoại lệ duy nhất của nguyên tắc "không gập thân bài": ví dụ đơn giản → thật, người học thường cần ví dụ đầu và một ví dụ thật.
- Đã chạy trong phiên: ô ✓ ở mục lục đếm lên; không lưu.
- **Phương án sau (không làm ở lát đầu): chia đôi kiểu Stripe** ở ≥ 1440 cho bài lab nhiều bước: cột chữ trái, khung editor + kết quả dính phải thay mục lục. Chỉ làm nếu đo thấy người học cuộn qua lại giữa đề và editor.

### 5.5 Thực hành ở đâu

Thực hành luôn ở mục 7, sau Ví dụ và Bẫy, trước Câu hỏi (thứ tự đã sửa ở `review-v23.md`). Không có editor nổi/dính: một editor trong luồng đọc, như SQLBolt. Drill vẫn mở workspace General (`#/learn/play/<id>`) như hôm nay; hàng bài luyện trong mục 7 là link.

### 5.6 Thanh hiệu năng (Product §1.6, §2.4)

Bước/drill có thanh: dưới dòng trạng thái thêm một hàng hai con số "Chi phí: của bạn 1,240 · lời giải 86" (icon `perfBar`, số `tabular-nums`), thanh ngang 6 px tỷ lệ log (lời giải = vạch `--good`, của bạn = vạch `--warn` khi vượt ngưỡng), chữ "Đúng mà chậm" (không chỉ màu), và nút ghost "Xem kế hoạch" mở cây kế hoạch của `enginePredict`. Không vẽ trong mockup (chưa có nội dung); dùng lại thẻ "Trước và sau" của capstone.

### 5.7 Tiến độ theo mục

| Mục | Nguồn | Lưu? |
|---|---|---|
| Ví dụ | đã bấm Chạy trong phiên | không (bộ nhớ) |
| Thực hành | drill đã đạt (`save.completed`) / bước lab đạt | đã có |
| Câu hỏi | câu đúng trong phiên (quiz Engine) / câu đã trả lời | như hiện nay |
| Các mục đọc | không đánh dấu | không: không giả tiến độ đọc (Product §2.4) |

"Xong bài" giữ luật hiện tại. Ô tiến độ trên mục lục chỉ là chữ "k/n", không vòng tròn phần trăm.

## 6. Trang danh sách với hàng trăm mục

### 6.1 Tổng quan khu (`01`, `05`)

- `h1` + ô tìm cùng hàng (máy tính) / dưới `h1` (điện thoại).
- **Một** thẻ Học tiếp (`CARD`, một `BTN_GO`): icon kỹ năng, "Phần 5 › <bài>", dòng phụ "Đang ở mục … (4/8) · còn ~20 phút".
- Track là link trông như tab (`SQL · Phần 1–11` 43 bài, `Nâng cao` 29, ô thứ ba sang `#/engine` 4 engine · 241 bài); không dùng `role=tablist` vì mỗi ô đổi route.
- Phần là **thẻ 76 px** hai cột (điện thoại: hàng 64 px): huy hiệu 48 px icon kỹ năng đầu Phần, "Phần n · tên", "k/n bài · ~thời gian", thanh 6 px (`--accent`, xong = `--good` + icon `check`), Phần đang học viền accent 2 px + chip "Đang học". **Không liệt kê bài** trên trang tổng quan. Không khóa, không "dùng ở đâu" (L82).
- Engine `#/engine` (`09`, `10`) giữ khuôn thẻ v22, nay **bốn thẻ** 2 × 2 (điện thoại: xếp dọc): huy hiệu tròn icon engine, tên, "k/n bài", một dòng mô tả, chip nhãn trung thực (PostgreSQL 18.6 · mingo · dynoxide · "Lab chạy trên PostgreSQL (PGlite)" cho Thiết kế CSDL), năm ô L1–L5 (k/n, thanh 4 px, ô có bài kế tiếp viền accent 2 px, ✓ khi xong), link "Tiếp tục bài · Ln" / "Bắt đầu từ L1". Thẻ Thiết kế CSDL thêm một dòng mờ "Phần lưu trữ và index: đào sâu ở PostgreSQL L3–L5" (Product §1.5). Dòng Lộ trình NoSQL dưới bốn thẻ. Ô tìm và thẻ Học tiếp như `#/learn`.

### 6.2 Trang Phần / cấp (`02`, `06`)

- Đầu trang: đường dẫn, `h1`, câu "làm được" một dòng, thanh tiến độ + "k/n bài xong · n bài · khoảng x giờ".
- **Chip lọc** (nút `aria-pressed`, một hàng; điện thoại cuộn ngang có vệt mờ mép phải): Tất cả · Chưa xong · theo loại (Lab, Khái niệm, Đoán · câu hỏi), mỗi chip có số. Máy tính thêm ô "Lọc theo tên bài" (icon `search`, lọc tại chỗ, `announce()` số kết quả).
- **Nhóm** (mô-đun Engine; ở General mỗi Phần một nhóm): tiêu đề `GROUP_TITLE` + "k/n". Nhóm **đã xong** gập thành một hàng 52 px: `check` + tên + "3/3 xong" + "Hiện 3 bài" (nút `aria-expanded`).
- **Hàng bài** = `listRow` dạng dày: 48 px (điện thoại 64 px hai dòng): icon loại 20 px, số thứ tự trong cấp (`06`, mono `text-muted`), tên (cắt "…" một dòng, tên đầy đủ trong `title` và tên truy cập), "Loại · phút" bên phải, icon trạng thái (`check` / `partial` / `notStarted`) ở cột cuối. Bài kế tiếp: nền `accent-soft` + vạch trái 4 px + `BTN_GO` "Học tiếp" (một mỗi trang); hàng khác cả hàng là link (`STRETCH`), không có nút "Mở".
- Kết quả đo trên mockup: 18 bài L3 + 2 nhóm gập vừa ~1,5 màn ở 1280 (hôm nay: ~2,5 màn, ước theo hàng 76 px + thẻ).
- Danh sách không cần ảo hóa: cấp lớn nhất ~25 bài; nếu có trang "mọi bài" (không đề xuất) mới cần.

### 6.3 Bản đồ kỹ năng và huy hiệu (`11`, `12`; Product §1.7, L323)

Chứng nhận bị bỏ. Thay bằng hai thứ **suy ra** từ Save + pref (không trường mới), hiện ở ba chỗ:

- **`#/me` thẻ "Bản đồ kỹ năng"** (thay thẻ Chứng nhận): tiêu đề có icon `skillMap`; câu đầu "Đo trên máy này từ bài bạn đã làm và lần ôn gần nhất. Không xác minh, không phải chứng chỉ."; **một** `BTN_GO` "Ôn n kỹ năng cần ôn" (= `startToday`, ẩn khi n = 0); chú giải mức ngay dưới (4 chấm × 5 mức + chip "Cần ôn = quá hạn ôn, mức tạm trừ 1"). Thân: 11 Phần theo `route.yml`, 3 cột từ 1280, 2 cột ở 1024–1279 (U7; cột cân số dòng), mỗi kỹ năng một hàng 32 px: icon kỹ năng 18 px (kỹ năng mới chưa có icon dùng `puzzle`, fallback có sẵn), tên (đậm khi mức ≥ 1, mờ khi 0), chip "Cần ôn" nếu có, 4 chấm bên phải. Dưới đường kẻ: **Engine theo mô-đun**, mỗi engine một hàng, 5 ô cấp "Chưa mở / Đang học k/n / Xong" (nền `surface-2` / `accent-soft` / `good-soft`), chú thích "không tụt: Engine không có lịch ôn".
- **`#/me` thẻ "Huy hiệu · k/37"**: chữ mờ "tự đo, không xác minh · mất khi mức tụt, lấy lại được"; ba nhóm SQL (13) · Database Engine (21) · Domain (3, "công ty hư cấu"); lưới ô 80 px (13 cột ở 1120 px; điện thoại 4 cột, 8 ô đầu là huy hiệu đang có rồi nút phụ "Xem cả 37 huy hiệu" mở tại chỗ). Mỗi ô là nút: rê/bấm hiện câu điều kiện (popover, `aria-describedby`). Không ngày đạt, không điểm, không xếp hạng. Dòng cuối `text-caption`: "Chứng nhận đã được thay bằng huy hiệu đo mức hiện tại."
- **Trang kỹ năng** (`03`): dòng mức trong đầu bài (§5.2). **Trang Phần** `#/learn/sql/<n>`: mỗi hàng kỹ năng có 4 chấm thay cho ✓ (✓ cũ = mức ≥ 2) và chip "Cần ôn" khi có.
- **Mức không chỉ bằng màu:** chấm đầy/rỗng khác hình (đầy vs vòng), tên mức luôn có chữ (bên cạnh hoặc trong `aria-label`: "LEFT JOIN: Đã gặp, mức 1 trên 4"). Chip "Cần ôn" có icon + chữ.
- **Điện thoại:** mỗi Phần là hàng 46 px gập (`<details>`) với "k/n ≥ Làm được" hoặc chip Cần ôn; mở ra là hàng kỹ năng 44 px. Engine thành 5 ô vuông 22 px đánh số 1–5 (viền xanh = xong, accent = đang học), có `aria-label` đầy đủ.
- Không thêm gì lên Trang chủ hay top bar (nút Ôn đã có). Không animation khi mức đổi; huy hiệu mới đạt không có lễ (một dòng `announce()` khi vẽ lại `#/me` nếu có huy hiệu mới so với lần vẽ trước trong phiên là đủ, tùy chọn).

## 7. Điện thoại 375 / 320

- **Thanh bài** 48 px dính ngay dưới top bar, chỉ trên trang bài: "‹ <Phần/cấp>" (thay đường dẫn), nút "n/8 · <tên mục>" (icon `toc`) mở **bảng mục lục** (`<dialog>` modal từ dưới, danh sách hàng 44 px, mục hiện tại tô, Esc / nút đóng, focus về nút mở; bấm mục = cuộn tới + đóng), nút tìm 44 px. Không có thanh nào dính trên `#bottom-nav`.
- **Mục lục trong thân** dưới hàng chip: `<details>` đóng, tóm tắt "Trong bài này · 8 mục" + dòng tiến độ (NN/g: trên điện thoại đặt trong thân).
- Ví dụ phụ và Lỗi hay gặp gập (`<details>`, hàng 48–56 px có icon + số lượng "2 bẫy"); ví dụ đầu mở sẵn; Thực hành, Câu hỏi, Tóm tắt luôn mở (Product §2.4).
- Code ví dụ **cuộn ngang trong khung** (`overflow-x: auto`, vệt mờ mép phải, thanh cuộn hiện), không xuống dòng (SQL xuống dòng khó đọc); trang không bao giờ cuộn ngang. Nút dưới code (Chạy, Sửa thử, sao chép) cao 44 px.
- Bảng kết quả: cột đầu dính khi cuộn ngang trong bảng; ≤ 5 dòng.
- 320: chip trên đầu bài xuống dòng; tên mục trong nút mục lục cắt "…" (nút co, không đẩy nút tìm ra ngoài); thanh bài giữ ba vùng. Kiểm bằng `npm run ux-audit` (đã có 320).
- Trang danh sách: hàng 64 px, chip "Học tiếp" nhỏ (pill) thay nút; nhóm đã xong gập.
- Tìm kiếm toàn màn hình, bàn phím ảo mở ngay, trang sau `inert`.

## 8. Theme tối

Chỉ token, không hex mới. Code ví dụ `--code` + `--syn-*` (đã ≥ 7:1 trên `--code` ở theme tối). Thẻ bẫy `bg-warn-soft` với chữ `--text` (≥ 11:1). Chip trung thực `good-soft`/`info-soft` với chữ `--good`/`--info`. Dòng hiện tại (mục lục, cây, hàng bài) `accent-soft` + chữ `--accent` (`#62dccb` trên `#163a35`: cặp đã dùng ở sidebar hôm nay). Vạch trạng thái và icon ≥ 3:1. Bóng ở tối là viền 1 px (`--shadow-*` đã làm). Mockup `05`–`08` vẽ bằng token tối.

## 9. Truy cập

- Mỗi mục là `<section aria-labelledby>` với `h2`; ví dụ/bẫy là `h3`. Thứ tự tiêu đề không nhảy cấp.
- Mục lục: `<nav aria-label="Trong bài này">`, link-nút; mục hiện tại `aria-current="location"`. Cây sidebar: `aria-current="page"`; nút nhánh `aria-expanded`.
- Nút "Bỏ qua tới nội dung bài" / "Tới mục lục" (`data-skip`, như A2) ở đầu trang bài.
- Chạy ví dụ: dòng trạng thái `role=status`; `announce("Ví dụ 1: 5 dòng")`. Focus giữ trên nút Chạy (không nhảy vào bảng).
- "Sửa thử": focus vào editor; Esc trong editor không đóng gì; "Đặt lại" có xác nhận khi đã sửa.
- Hộp thoại tìm: combobox APG, `aria-live` số kết quả, Esc đóng, focus trả về.
- Mục tiêu chạm ≥ 24 px (máy tính), 44 px (điện thoại: hàng, nút dưới code, nút thanh bài). Màu không đứng một mình: trạng thái có icon và chữ; chữ khớp tìm kiếm vừa đậm vừa màu.
- Bảng kết quả/so sánh: `<table>` thật có `<th scope>`; code có `lang="en"`.
- `tests/axe.test.ts`/`axeProgress.test.ts` thêm: trang bài dài (mục lục + ví dụ đã chạy + bẫy mở), hộp thoại tìm mở, bảng mục lục mở ở 375.

## 10. Chuyển động

- Vạch mục hiện tại trong mục lục trượt 160 ms khi đổi mục (một phần tử, như `place()` của thanh tab, X4/L166); đổi tức thì dưới giảm chuyển động và khi vẽ lại.
- Bấm mục lục: `scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth' })`.
- Kết quả ví dụ: 10 dòng đầu hiện dần bằng opacity (`markArrived`, ≤ 375 ms), không dời chỗ.
- Mở/gập `<details>`: không animation chiều cao (giữ native).
- Không transform trên thẻ, hàng, nút (L93); không animation lặp; không cuộn tự động khi đọc.

## 11. Thành phần ↔ cái đã có

| Thành phần mới | Dựng từ | Ghi chú |
|---|---|---|
| `LessonPage` (bố cục 2–3 cột) | `<main id="home">` section (như `engineView`), `--w-read` | lazy chunk mỗi bài như `engineLesson` (Product §3: chunk mỗi bài cho General) |
| `SectionHead` | huy hiệu `bg-accent-soft` (mẫu `domainBadge`), `text-title` | icon từ §12 |
| `LessonToc` (rail + `<details>` + bảng dưới) | `CARD`, `<dialog>` (mẫu `side-drawer`), `lightDismissable()` | IntersectionObserver; không lưu |
| `LessonBar` (thanh bài điện thoại / 1024) | lớp top bar, `BTN_GHOST`, `iconbtn` | sticky, 48 px |
| `RunBlock` (ví dụ) | `pre.sql` + `HighlightStyle`, `createEditor` khi Sửa thử, `runOn()`, `renderResult`, `errorView` | không đụng `app.lastRun` |
| `PitfallCard` | `bg-warn-soft`, `PILL` bad/good, `BTN_GHOST`, `RunBlock` cho hai câu | |
| `PracticeCard` | thẻ "Thử ngay" (`tryPreview`, `grade()`), `BTN_SUBMIT` | editor duy nhất dựng sẵn |
| `QuizCard` | thẻ quiz v22 | giữ |
| `LessonPager` | `CARD`, `BTN_GO`/`BTN_GHOST` | |
| `PerfBar` | `tabular-nums`, `--good`/`--warn`, cây kế hoạch `enginePredict` | §5.6 |
| `DenseRow`, `DoneGroupRow` | `LIST`/`listRow` (thêm biến thể dày), `STRETCH`/`ABOVE`, `GROUP_TITLE` | |
| `FilterChips` | `PILL` + `aria-pressed` | |
| `SideTree` | `registerSide()` + hàng sidebar hiện có | chỉ nhánh mở |
| `SearchDialog` | `<dialog>` modal, `kbd()`, `PILL`, icon | chunk `searchIndex` |
| `LevelDots` (mức 0–4) | 4 `<span>` tròn 8–9 px: đầy `--accent`, rỗng viền `--border-strong` 1.5 px; tên mức trong `aria-label`/chữ bên cạnh | không phải icon; dùng ở `#/me`, trang kỹ năng, hàng Phần |
| `ReviewChip` ("Cần ôn") | `PILL` `bg-warn-soft` `text-warn` + icon `repeat` | link vào hàng ôn hôm nay |
| `SkillMapCard` | `CARD`, `GROUP_TITLE`, hàng 32 px (máy tính) / `<details>` mỗi Phần (điện thoại), `BTN_GO` "Ôn n kỹ năng cần ôn" (= `startToday`) | thay thẻ Chứng nhận trong chunk `meView` |
| `BadgeTile` | vòng 48 px: có = `bg-accent-soft` + viền `--accent` 2 px + icon `--accent` + `check`; chưa = viền đứt `--border-strong` + icon `--muted`; nhãn 12 px | nút có `aria-describedby` câu điều kiện (popover khi rê/bấm) |
| `EngineCard` (4) | thẻ engine v22 + ô cấp | thẻ thứ tư cùng khuôn |
| `ModuleCard` | `CARD_ACTION` (hover chỉ viền, không transform: L93 thay `hover:-translate-y-0.5` của `CARD_ACTION` bằng biến thể không dời) | lưu ý: `CARD_ACTION` hiện có `hover:-translate-y-0.5`, trái L93 cho thẻ có link phủ; dùng biến thể của thẻ engine v22 |

i18n: chữ của trang bài vào chunk lazy cùng view (như `src/i18n/engine.ts`, `learn.ts`), không vào `vi.ts`/`en.ts` của main.

## 12. Icon

Phosphor duotone 2.1.1 (MIT), thêm qua `scripts/icon-map.json` → `node scripts/icons.mjs` → `src/ui/iconData.ts`. Không logo, không màu thương hiệu, không emoji. "có" = tên đã có trong `icon-map.json`/`icon-custom.json`, dùng lại đúng nghĩa; "mới" = thêm một dòng, glyph chưa dùng (đã kiểm: không glyph nào dưới đây đang có trong `icon-map.json`).

| Tên app | Phosphor | Ẩn dụ | Dùng ở | |
|---|---|---|---|---|
| `secOpen` | `target` | đích của bài | mục 1 | mới |
| `kindConcept` | `lightbulb` | một ý tưởng | mục 2; loại bài khái niệm | có |
| `secSyntax` | `code-block` | khung lệnh | mục 3 | mới |
| `secRun` | `play-circle` | bấm là chạy | mục 4, khối ví dụ, kết quả tìm | mới |
| `secPitfall` | `warning-diamond` | biển báo nguy hiểm (khác `alert` = `warning` của banner) | mục 5 | mới |
| `secPractice` | `pencil-simple-line` | tự viết | mục 7 | mới |
| `kindQuiz` | `seal-question` | câu hỏi | mục 8 | có |
| `secRecap` | `bookmark-simple` | đánh dấu để nhớ | mục 9 | mới |
| `route` | `path` | đường giữa hai điểm | track SQL | có |
| `trackAdv` | `graduation-cap` | học nâng cao | track Nâng cao | mới |
| `module` | `book-bookmark` | chương sách | Phần/mô-đun khi không có icon kỹ năng | mới |
| `level` | `stairs` | bậc thang | cấp L1–L5 | có |
| `kindLab`, `kindPredict`, `kindCapstone`, `docsOnly` | `test-tube`, `crosshair`, `flag-checkered`, `file-text` | như v22 | hàng bài Engine | có |
| `kindDrill` | `barbell` | tập tạ | bài luyện General, drill trong tìm | mới |
| `kindChallenge` | `mountains` | leo núi | challenge của nút Nâng cao | mới |
| `kindReading` | `books` | chồng sách | bài lý thuyết thuần (thiết kế CSDL) | mới |
| `toc` | `list-dashes` | mục lục | mục lục, nút thanh bài | mới |
| `search` | `list-magnifying-glass` | tìm trong danh sách (`magnifying-glass` đã là kỹ năng LIKE `pattern`) | mọi lối vào tìm | mới |
| `time` | `clock` | thời lượng | chip phút | mới |
| `editTry` | `note-pencil` | sửa thử | nút Sửa thử | mới |
| `resetCode` | `arrow-counter-clockwise` | đặt lại | nút Đặt lại code ví dụ | mới |
| `chevronDown` | `caret-down` | mở xuống | nhóm, `<details>` | mới |
| `check`, `partial` | custom `check`, `circle-half` | xong / làm dở | trạng thái | có |
| `notStarted` | `circle-dashed` | vòng chưa khép | trạng thái chưa làm | mới |
| `perfBar` | `gauge` | đồng hồ đo | thanh hiệu năng | mới |
| `engDesign` | `compass-tool` | thước compa: vẽ thiết kế (không logo) | thẻ, cây, huy hiệu Thiết kế CSDL | mới |
| `skillMap` | `grid-four` | lưới ô kỹ năng | thẻ Bản đồ kỹ năng | mới |
| `badgePart` | `seal-check` | con dấu đã kiểm | huy hiệu "Phần n vững", thẻ Huy hiệu | mới |
| `badgeFast` | `timer` | đồng hồ bấm giờ | huy hiệu "Đúng và nhanh" | mới |
| `badgeFoundation` | `star-four` | ngôi sao bốn cánh | huy hiệu "SQL nền tảng" | mới |
| `repeat` | `repeat` | ôn lại | chip "Cần ôn", nút ôn | có |
| huy hiệu cấp engine / Lộ trình NoSQL / domain | `engRelational/Document/KeyValue`, `engDesign`, `nosqlPath`, `anchor`/`box`/`percent` | dùng lại icon của chính nơi đó | 20 + 1 + 3 huy hiệu | có |
| `run` | `play` | bấm chạy | nút Chạy của ví dụ, Chạy câu sai/sửa | mới |
| `enterKey` | `arrow-elbow-down-left` | phím Enter | dòng đang chọn trong kết quả tìm | mới |
| `moduleWrite` | `file-plus` | thêm vào tệp | Phần 9 Ghi dữ liệu (cho tới khi có icon kỹ năng) | mới |
| `external`, `copy`, `inApp`, `chevronLeft/Right`, `engRelational/Document/KeyValue`, `engine` | như hiện có | | link nguồn, sao chép, chip chạy thật, bài trước/tiếp, engine | có |

Icon loại bài General = `skillIcon(id)` của kỹ năng (có sẵn, 38 + 5 kỹ năng mới cần icon: `cross_join`, `any_all`, `insert_select`, `update_join`, `upsert` → đề xuất custom trong họ JOIN cho `cross_join`, Phosphor `equals`/`plus-square`/`arrows-clockwise`/`arrows-merge` cho bốn cái còn lại, chọn lúc làm R1/R2, kiểm trùng bằng `tests/icons.test.ts`).

Quy tắc "một icon = một đích" (`NAV_ICON`) chỉ áp cho mục nav; `search` không vào nav top bar nên không đụng.

## 13. Ngân sách và hiệu năng

- Trang bài: lazy chunk mỗi bài (Product §3.4: `engineLesson` có thể lên 12 KB/file). Phần UI mới (mục lục, khối ví dụ, bẫy, thanh bài) đi chung chunk `engineView`/`learnui`: ước +4–6 KB gz mỗi chunk; đo khi build.
- `searchIndex` chunk riêng (~40–50 KB gz ước), nhóm ngân sách mới 60 KB; được precache như mọi chunk khác (nằm trong `FILES` của service worker), nên tìm được cả khi offline.
- Không dựng editor trước khi cần (§5.4): giữ trang bài dài mở nhanh; IntersectionObserver cho mục lục, không listener scroll.
- `SMOKE_PERF` thêm một bài dài (FCP, h1, long tasks).

## 14. Không làm (YAGNI)

- Workspace riêng cho bài (`#/engine/play` trong `<main id="shell">`): bài vẫn là trang đọc.
- Bố cục chia đôi kiểu Stripe (§5.4): chỉ khi đo thấy cần.
- Tiến độ đọc, bookmark mục, ghi chú của người học.
- Trang "mọi bài" phẳng, ảo hóa danh sách.
- Tìm kiếm toàn văn trong thân bài (chỉ tên, tiêu đề, từ khóa); tìm bằng AI.
- Phím tắt mới ngoài Ctrl K và `/`.

## 15. Câu hỏi mở

| # | Câu hỏi | Mặc định đề xuất |
|---|---|---|
| U1 | Trang bài ≥ 1280: rail + mục lục phải (như mockup) hay sidebar 256 + mục lục trong thân? | Rail + mục lục phải; sidebar mở thì mục lục vào thân |
| U2 | Ví dụ thứ hai trở đi đóng sẵn trên máy tính (khi > 3 ví dụ)? | Có |
| U3 | Link sâu tới mục (`…/<id>/<mục>`) làm ngay lát đầu hay sau (Product nói chưa cần)? | Sau; tìm kiếm cuộn tới mục bằng tham số trong bộ nhớ |
| U4 | `CARD_ACTION` có `hover:-translate-y-0.5` (trái L93 cho thẻ có link phủ): sửa luôn khi làm thẻ Phần? | Có, dùng biến thể chỉ đổi viền của thẻ engine v22 |
| U5 | Tìm kiếm cũng nằm trên trang domain (ticket)? | Không: chỉ Lộ trình + Engine (phạm vi v24) |
| U6 | Huy hiệu mới đạt có thông báo (dòng `announce`/toast) hay chỉ hiện khi mở `#/me`? | Chỉ khi mở `#/me`; không toast |
| U7 | Bản đồ kỹ năng ở 1024–1279: 3 cột hay 2? | 2 cột dưới 1280, 3 cột từ 1280 |
