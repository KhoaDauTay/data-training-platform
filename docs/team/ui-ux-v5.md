# BoonData — UI/UX v5: thêm chuyển động và SVG (làm giàu, không thiết kế lại)

**Trạng thái: ĐÃ DUYỆT** (user, 2026-11-18: "Build đi"), mọi quyết định §9 lấy mặc định in đậm (L101).

Người viết: UI/UX · 2026-11-18. User: *"Bổ sung thêm animation và SVG nữa cho tốt"*, và UI/UX hiện tại đã ổn. Vì vậy v5 **không đổi bố cục, màu, chữ hay luồng**. Nó chỉ thêm chuyển động ngắn và hình vẽ vào những chỗ đang đứng yên, theo cùng luật đã có.

Ràng buộc giữ nguyên:
- Hình tự vẽ (SVG trong repo) hoặc CC0, không nhân vật có bản quyền, không emoji.
- Một chuyển động **≤ 3 s**, bỏ qua được hoặc là nền (ambient). Không bao giờ chặn nhập liệu, không che editor hay bảng kết quả.
- `prefers-reduced-motion: reduce` = khung tĩnh. **Kiểu gốc luôn là trạng thái cuối**, animation chỉ chạy *từ* nó, nên khi luật chung cuối `style.css` tắt animation thì người dùng vẫn thấy đúng trạng thái. `Element.animate()` không bị luật CSS tắt, nên phải tự kiểm `reducedMotion()` (`src/ui/dom.ts`, chỉ đọc media query: app không có công tắc riêng, xem D-M9).
- Tương phản chữ ≥ 4,5:1 ở hai theme; chạy được ở 320/375 px. Class Tailwind là chuỗi literal nguyên vẹn.
- Linh vật (L57/L83/L87): **Boon dạy** (gợi ý, hướng dẫn, lỗi, chờ), **Lily là người học** (chỉ phản ứng: reo, ngủ, đứng chờ; không nói, không dạy). Mỗi vùng tối đa một linh vật (`boonRegion()`, `tourRegion()`).
- L88/L93 (stretched link): transform hoặc filter trên phần tử nằm **giữa** link chính và card sẽ thành khối chứa của `::after`. v5 chỉ đặt transform lên **SVG lá** (linh vật, icon, glyph), không lên link, nút hay card. Mọi hiệu ứng vào trang chỉ dùng `opacity`.
- Render rule: `rerender()` không được phát lại animation một lần. Animation một lần chỉ gắn **lúc có sự kiện** (bấm, chấm đúng, đổi trang), không gắn lúc vẽ.

**Sửa quyết định cũ:**
- ui-ux-v4 (đầu tài liệu): "reduced motion … không thêm animation mới" → v5 thêm animation theo luật ở §1. Luật giảm chuyển động vẫn giữ.
- Plan 9 D9-14 ("E-com chưa có hoạt cảnh khi xong việc, chỉ câu báo") → B3 thêm dock cho E-com.
- Plan 7 V4 (vòng lặp linh vật chỉ ở màn chào, `#mascot-sprite.live`) **giữ nguyên**. v5 chỉ thêm hai ngoại lệ hẹp chạy bằng `:has()` (dấu `zz` ở trạng thái rỗng, các hàng của loader), xem §B2 và §A4.

---

## 0. Hiện trạng: chỗ nào đang đứng yên

| Chỗ | Hôm nay | v5 |
|---|---|---|
| Linh vật ngoài màn chào và cảnh dạy học | Đứng yên hoàn toàn (vòng lặp sprite chỉ chạy khi `.live`) | A2: phản ứng một lần theo tư thế |
| Dòng phản hồi Chạy/Nộp | Chỉ `animate-pop` cả khối | A2: Lily nhảy, Boon nghiêng, lắc |
| Bong bóng gợi ý của Boon (v13) | Hiện ngay, không chuyển động | A2: bong bóng mở, Boon chồm về phía editor |
| Điền khung (v13) | Dòng chữ + nút Hoàn tác | A2: Boon gật |
| Pill XP ở top bar | Số đổi im lặng | A3: pill nảy + chip "+N" bay lên |
| Lily lớn (L87) | Đổi giai đoạn im lặng khi `syncLily()` chạy | A1: khoảnh khắc lớn lên |
| Tải database / seed | Chấm cam nhấp nháy ở top bar + dòng chữ | A4: loader SVG chung + thanh `<progress>` |
| Lộ trình General | `moduleGlyph` tĩnh, chỉ ở trang Phần; `trackGlyph`, `studyDesk`, `emptyPath` đã vẽ, có test nhưng **không ai gọi** | B1 |
| Kỹ năng vừa học | Dấu ✓ hiện im lặng | B1: icon đóng dấu |
| Trạng thái rỗng | Lily ngủ, dấu `zz` đứng yên | B2 |
| E-com | `storeScene`, `deliveryMap` tĩnh; xong việc chỉ có câu `#announce` | B3 |
| Dấu tour và hướng dẫn của Boon | Hiện ngay | B4: trượt vào một lần mỗi bước |
| Đổi trang đọc | Bật/tắt `hidden` ngay | C1: mờ dần vào 180 ms |
| "Ngày thứ N cùng Lily" | Số đổi im lặng | C2 |

Giữ nguyên, không đụng: cảnh Tiên Sa (vòng lặp `cq-*`, parallax), bản đồ tuyến (`sailFleet`, `drawNewRoutes`, `arrivalPulse` trong `src/art/mapMotion.ts`), dock hoàn thành Logistics (`src/ui/stage.ts` + `src/art/logistics.ts` `build/play`), cảnh dạy học, `celebrate()`, spinner của nút Chạy.

## 1. Nền chung (làm trước, T1)

| Phần | Quy tắc |
|---|---|
| Keyframes | Một khối CSS thường mới cuối `src/style.css`: "v5 motion", đặt trước luật `prefers-reduced-motion: reduce`. Dùng CSS thường vì cần selector thuộc tính (`[data-pose]`, `:has()`) như các vòng lặp linh vật sẵn có. Tên `cq-*`. |
| Nhịp | Nhanh 180–260 ms (vào, bong bóng). Phản ứng 360–600 ms (linh vật). Khoảnh khắc ≤ 1 000 ms (Lily lớn). Easing: ra `ease-out`; nảy `cubic-bezier(.3,1.6,.6,1)` (đã dùng trong `stage.ts`). |
| Một lần, không lặp lại | `src/ui/celebrate.ts` thêm `react(host)`: tìm `svg[data-mascot]` đầu tiên trong `host`, gắn class `react` (và `grow` nếu A1 vừa xảy ra, xem A1), gỡ cả hai ở `animationend` (`{ once: true }`), nên không có class nào nằm lại chờ một animation khác. CSS chọn keyframe theo `data-pose` (§A2). Gọi **sau** `rerender()` của sự kiện, nên một lần vẽ lại sau đó (đổi ngôn ngữ, seed xong) tạo SVG mới không có class, và không phát lại. |
| `data-pose` | `mascot()` (`src/ui/mascots.ts`) thêm `data-pose` cạnh `data-mascot`. Không thêm tư thế mới vào sprite: `tests/mascots.test.ts` đòi đủ 6 tư thế cho **cả hai** linh vật, và chuyển động là transform trên `<svg>` chủ (SVG lá), không phải trong symbol. |
| `@property` | Đăng ký `--lily-size`, `--lily-scarf-on`, `--lily-badge-on`, `--lily-prop-on` là `<number>`, `inherits: true` (giá trị khởi đầu như `:root`), để keyframe làm mờ dần phụ kiện mới của Lily qua `<use>` (A1). Trình duyệt không hỗ trợ `@property` thì phụ kiện hiện ngay, vẫn đúng. |
| Kiểm | Test mới trong `tests/mascots.test.ts`: (1) mọi `animation:` không `infinite` trong `style.css` có thời lượng + delay ≤ 3 000 ms; (2) mọi tên `cq-*` được dùng có `@keyframes`, và không tên nào được định nghĩa hai lần (vd. `cq-nod` đã thuộc cảnh dạy học); (3) khối `@media (prefers-reduced-motion: reduce)` vẫn có `animation: none !important` cho `*` (không đòi nó đứng cuối file: luật popover và viền hướng dẫn v13 nằm sau). |

---

## P1

### A1. Lily lớn lên (khoảnh khắc)

| | |
|---|---|
| Khi nào | `syncLily()` (`src/ui/homeView.ts`, chạy trong mọi `rerender()`) thấy giai đoạn **tăng** so với mốc **trong phiên**, và ghi `grewAt = Date.now()`. Lần gọi đầu chỉ đặt mốc. Nhập save (không tải lại trang) xóa mốc trong trình xử lý import của `main.ts`, nên lần vẽ sau chỉ đặt mốc mới. Không pref, không Save (D-M2). Mọi đường học đều qua đây: story, drill, làn, E-com, ôn. |
| Gắn ở sự kiện, không gắn lúc vẽ | Không có cờ toàn trang. Hai chỗ gắn, đều lúc sự kiện: (1) `react()` (§1) ở dòng phản hồi khi đạt: nếu `grewAt` cách đây ≤ 4 s thì Lily nhận `grow` cạnh `react`; (2) Lily trong dock (`stage.ts`) lúc vào, cùng điều kiện. Lily được tạo lại bởi một `rerender()` sau đó **không** lớn lại (đúng luật render). |
| Chuyển động | `cq-grow` 900 ms trên `<svg>` chủ, thuộc tính `scale` riêng (không đụng `transform: scale(var(--lily-size))` của `<use>`): 1 → 1,18 (0–35 %, nảy) → 0,96 (60 %) → 1. Song song, phụ kiện **mới** của giai đoạn hiện ra: `[data-lily="1"]` khăn (`--lily-scarf-on` 0 → 1), `"2"` sao (`--lily-badge-on`), `"3"` laptop (`--lily-prop-on`), 0 → 1 từ 300 ms tới 800 ms. Kích thước mới (`--lily-size` 0,8 → 0,9 → 1) cũng chuyển dần nhờ `@property`. Khi Lily có cả `react` và `grow`: **một** khai báo `animation: cq-grow 900ms …, cq-jump 560ms …` (`scale` và `translate` là hai thuộc tính khác nhau nên chạy cùng lúc, không cái nào đè cái nào). |
| Chỗ người chơi thấy | (1) **Dòng phản hồi** dưới nút (Lily `cheer` size-8): có ở mọi lần đạt của story, làn, drill, E-com. Đây là điểm neo chính, và vì nó nằm trong khối phản hồi nên ở 375 px vẫn thấy khi pane work đang mở. (2) Dock Logistics: Lily trong dock (`max-sm:hidden`) vào ở cuối hoạt cảnh; nếu vừa lớn thì `stage.ts` dùng keyframe lớn lên (600 ms) thay cho cú nảy 300 ms, bắt đầu sớm hơn 300 ms nên tổng vẫn ≤ 3,0 s (`Element.animate`, nên dùng `run.fast` để tôn trọng giảm chuyển động). (3) **Trang chủ, khối chào**: một pill nhỏ `bg-sun text-sun-ink` "Vừa lớn" cạnh tên giai đoạn, giữ trong bộ nhớ phiên tới lần đầu rời Trang chủ (cùng cách đánh dấu "Mới" của bãi Tiên Sa). Ở 375 px, story chuyển sang pane Recap sau khi nộp (`showPane('ticket')`), nên lần mở Trang chủ kế tiếp vẫn có dấu. |
| Thăng tiến cùng lúc | Một màn ăn mừng tại một thời điểm: dock thăng tiến giữ nguyên 3,0 s; Lily lớn lên nằm **trong** cú vào cuối của Lily, không thêm thời gian. |
| Giảm chuyển động | Không scale, không mờ dần: Lily hiện ngay ở giai đoạn mới (kiểu gốc). Pill "Vừa lớn" và câu báo vẫn có. |
| A11y | **Nối thêm** vào `#announce` (không thay câu hoàn thành): "Lily đã lớn: {stage}." Lily không "nói". Không dùng chữ "level up" (L22). Pill là chữ thường, không chỉ màu. |
| Chunk / ngân sách | main (`homeView.ts`, `stage.ts`, 2 key `vi.ts`) ≈ +0,25 KB; CSS ≈ +0,3 KB. |
| File | `src/ui/homeView.ts` (`syncLily`, `hello`), `src/ui/stage.ts` (cú vào của Lily), `src/style.css`, `src/i18n/vi.ts` + `en.ts`. |
| Kiểm | Test đơn vị nhỏ cho việc so mốc (lần đầu = không chạy; tăng = chạy; giảm sau khi nhập save = không). Trình duyệt: nhập một save đã học 2 kỹ năng, đạt một việc dạy kỹ năng thứ 3 (giai đoạn 0 → 1, khăn hiện ra), rồi xem dòng phản hồi, dock, Trang chủ (pill "Vừa lớn") và chế độ giảm chuyển động. |

### A2. Linh vật phản ứng (dòng phản hồi, bong bóng gợi ý, điền khung)

Keyframes theo `[data-pose]` khi `svg.react` (transform trên `<svg>` chủ, `transform-origin: 50% 100%`, `transform-box: fill-box`):

| Tư thế | Ở đâu | Keyframe | Nhịp |
|---|---|---|---|
| `lily cheer` | Dòng phản hồi khi đạt (`work.ts` `solved()`), cạnh `celebrate(feedback)` | `cq-jump`: lên −6 px, xuống, lên −3 px, xuống | 560 ms, ease-out |
| `boon point` | Bong bóng gợi ý mới mở (`brief.ts` `hints()`) và dòng "Mình điền khung rồi…" (`work.fill()`) | `cq-lean`: xoay −6° về phía editor, về 0, nghiêng lại −3°, về 0 (một keyframe cho cả hai chỗ: CSS chỉ phân biệt theo `data-pose`). **Không** dùng tên `cq-nod` (đã là cái gật của Lily trong cảnh dạy học) | 480 ms |
| `boon think` | Dòng phản hồi khi sai, có ghi chú dạy (`sqlErrors`) | `cq-tilt`: nghiêng 5°, giữ, về | 500 ms |
| `boon oops` | Hết giờ / khởi động lại DB | `cq-shake`: ±2 px ba lần | 360 ms |

| | |
|---|---|
| Bong bóng gợi ý | Khi bấm "Gợi ý i/n": sau `rerender()`, `react()` lên khối gợi ý mới nhất, và bong bóng (`div` `bg-sun`) nhận `cq-bubble` (opacity 0 → 1, `scale` 0,96 → 1, gốc góc trên trái, chỗ đuôi bong bóng), 220 ms. Bong bóng không nằm trong card có stretched link, nên được dùng `scale`. Các gợi ý cũ phía trên không chuyển động. |
| Không phát lại | Chỉ gắn ở sự kiện (bấm gợi ý, kết quả mới, điền xong). `drawMessage()` vẽ lại (đổi ngôn ngữ, `boonRegion` đổi) tạo SVG mới không có class. |
| Một linh vật mỗi vùng | Không đổi: khi `boonRegion()` là vùng đó thì không có linh vật nào để phản ứng, `react()` không tìm thấy gì và bỏ qua. |
| Giảm chuyển động | Không có gì chạy, linh vật đứng ở tư thế của nó. |
| A11y | Linh vật vẫn `aria-hidden`; câu chữ không đổi. |
| Chunk / ngân sách | main (`celebrate.ts`, `mascots.ts`, chỗ gọi trong `work.ts`, `brief.ts`) ≈ +0,2 KB; CSS ≈ +0,35 KB. Bàn luyện (drill) đi qua cùng `work.ts`, nên learnui không đổi. |
| File | `src/ui/celebrate.ts`, `src/ui/mascots.ts`, `src/ui/work.ts`, `src/ui/brief.ts`, `src/style.css`. |
| Kiểm | Trình duyệt: đạt / sai / gợi ý / điền khung ở story ch1 và một drill, 375 + 1280, đổi ngôn ngữ ngay sau đó (không phát lại), bật giảm chuyển động. |

### A3. XP: pill nảy và chip "+N"

| | |
|---|---|
| Khi nào | Lúc top bar vẽ `#xp` (`src/ui/topbar.ts`) và `app.save.xp` lớn hơn giá trị lần vẽ trước trong phiên. Lần vẽ đầu chỉ đặt mốc; nhập save xóa mốc (cùng chỗ với A1, trình xử lý import của `main.ts`, trang không tải lại). Một chỗ bắt mọi nguồn XP (story, làn, drill, thử thách). |
| Chuyển động | `celebrate(#xp)` (pop sẵn có, 450 ms). Thêm `<span aria-hidden>` "+N" `absolute` trên pill (`#xp` thêm `relative`), `cq-rise`: dời lên −14 px + opacity 1 → 0, 800 ms, `pointer-events: none`. Gỡ khi `animationend`. Nếu một `rerender()` thay nội dung pill giữa chừng thì chip mất sớm (chấp nhận). |
| Giảm chuyển động | Không pop, không chip; số mới hiện ngay. |
| A11y | Chip `aria-hidden`: dòng phản hồi đã đọc "+N XP" (`work.correctXp`). Chữ chip dùng `text-sun-ink` trên `bg-sun` (8,3:1). |
| Chunk / ngân sách | main ≈ +0,13 KB; CSS ≈ +0,1 KB. |
| File | `src/ui/topbar.ts`, `src/main.ts` (xóa mốc khi nhập), `index.html` (`#xp` thêm `relative`), `src/style.css`. |
| Kiểm | Trình duyệt: đạt một việc story (chip = XP của `work.correctXp`), một drill (+10), đạt lại việc cũ (không chip), nhập save (không chip), 375 (pill vẫn trong top bar, chip không làm top bar xuống dòng), giảm chuyển động. |

### A4. Đang tải: loader SVG chung và thanh tiến độ

| | |
|---|---|
| Hình | Symbol mới `#cq-load` trong `#mascot-sprite` (viewBox 48×24): khung bảng bo góc `--border`, 3 hàng `--accent` (`class="ld"`) **trung tính**, không phải container cảng hay gói hàng, vì dùng chung cho mọi domain, cho `lab` và cho Finance. Không có chữ. |
| Chuyển động | Ba hàng sáng lần lượt, `cq-ld`: opacity 0,25 → 1 → 0,25, 1,2 s `infinite`, lệch 0 / 0,2 / 0,4 s. Đây là vòng lặp nền, nên chạy trên bản gốc trong sprite, nhưng **chỉ khi có loader trong trang**: `body:has(use[href="#cq-load"]) #mascot-sprite .ld { animation: … }`. Hết tải thì dòng chờ bị thay, `:has` hết khớp và vòng lặp dừng. |
| Ở đâu | `loader()` (helper nhỏ trong `src/ui/dom.ts`: `<svg class="size-6"><use href="#cq-load"></svg>`, `aria-hidden`) đặt trước chữ chờ sẵn có: banner `domain.loading`, `data.loading` (trang Dữ liệu), `preview.loading` (`tryPreview.ts`), helper `load()` của các tab (`vizTabs.ts`, gồm ER), dòng chờ của `learnView` (learnui qua `DrillDeps`). Top bar giữ chấm cam (đã đủ nhỏ gọn). |
| Thanh tiến độ | `app.loadProgress` đếm byte **tải tài nguyên** (`countingFetch`), còn banner `domain.loading` sống tới khi **seed** xong (lâu hơn). Vì vậy: banner thêm `<progress max value>` gốc (`accent-color: var(--accent)`, cao 6 px, `w-40 max-sm:w-full`) **chỉ khi** `total` đã biết và `loaded < total`; tải xong (hoặc không biết tổng) thì bỏ thanh, còn loader + chữ. Không để thanh đứng ở 100 % trong lúc seed. Trình duyệt tự cho `<progress>` role progressbar. |
| Giảm chuyển động | Hàng đứng yên ở 1 / 0,6 / 0,3 (vẫn đọc ra là "đang chạy"); `<progress>` vẫn cập nhật (nó không phải animation). |
| A11y | Loader `aria-hidden`; chữ chờ và `role="status"` sẵn có không đổi. |
| Chunk / ngân sách | Sprite trong `index.html` ≈ +0,25 KB gz. File này **không có nhóm ngân sách nào** (`check-budget.mjs` chỉ đọc `dist/assets`), nên T1 thêm nhóm `html` (`dist/index.html`, trần 9 KB gz; hôm nay 7,9). main ≈ +0,15 KB; CSS ≈ +0,1 KB. |
| File | `index.html`, `src/ui/dom.ts`, `src/main.ts` (banner), `src/ui/dataView.ts`, `src/ui/tryPreview.ts`, `src/ui/vizTabs.ts`, `src/ui/learnView.ts`, `src/style.css`, `scripts/check-budget.mjs`. |
| Kiểm | `tests/mascots.test.ts`: `#cq-load` có, href hợp lệ (test sẵn có), không chữ. Trình duyệt: hồ sơ mới, throttle "Slow 4G", mở `#/d/logistics` và trang Dữ liệu, 375 + 1280, hai theme. |

---

## P2

### B1. Lộ trình General: hình theo Phần, icon kỹ năng đóng dấu

Mọi thứ ở đây nằm trong chunk `illustrations` (2/15 KB) và `learnui` (12/25 KB). **main không đổi** (`learnView` lấy mọi giá trị main qua `DrillDeps`, Plan 6 U3).

| Mục | Hành vi |
|---|---|
| Glyph trong danh sách Phần (`#/learn`) | Mỗi dòng Phần có `moduleGlyph(n)` thu nhỏ (`w-16`, dưới `sm` `w-12`) bên trái tên, nền `bg-accent-soft` như L82 (không màu chương). Dòng là stretched link (L88): glyph tĩnh, không hover transform. |
| Glyph nhóm nâng cao | `trackGlyph('A'…'D')` (đã vẽ, chưa ai gọi) cạnh tiêu đề nhóm `adv.group.*` (`w-20`). |
| Glyph đầu trang Phần | `moduleGlyph(n)` sẵn có ở đầu trang chạy `cq-glyph-in` **một lần khi vào trang** (không khi vẽ lại): các phần màu nhấn (thêm `data-acc` trong `illustrations.ts`) nảy `scale` 0,6 → 1, lệch 80 ms, mỗi phần 360 ms, tổng ≤ 700 ms. `learnView` nhớ khóa trang vừa vẽ; chỉ khi khóa đổi mới gắn class. |
| Icon kỹ năng đóng dấu | Trang Phần và trang kỹ năng: kỹ năng **vừa thành "đã học"** kể từ lần vẽ trước trong phiên (`learnView` giữ tập đã thấy; lần vẽ đầu chỉ đặt mốc) thì ô icon chạy `cq-stamp` (scale 1,35 → 1, xoay −8° → 0, 380 ms) và dấu ✓ tự vẽ (`stroke-dashoffset` tới 0, 300 ms, trễ 200 ms). Đường thường gặp: đạt drill thứ 2 → quay lại trang Phần → dấu đóng. |
| Hình không ai gọi | `studyDesk()` (đã được cảnh dạy học L87 thay) và `emptyPath()`: **xóa** cùng dòng test (D-M4). |
| Giảm chuyển động | Glyph và ✓ hiện ngay ở trạng thái cuối. |
| A11y | Glyph `aria-hidden` (sẵn có); trạng thái "đã học" vẫn bằng chữ (`bar()` + ✓ có nhãn). |
| Ngân sách | illustrations ≈ +0,1 KB (thuộc tính `data-acc`), trừ ≈ −0,4 KB (xóa 2 hình); learnui ≈ +0,3 KB; CSS ≈ +0,15 KB. |
| File | `src/art/illustrations.ts`, `src/ui/learnView.ts`, `src/style.css`, `tests/illustrations.test.ts`. |

### B2. Trạng thái rỗng: Lily ngủ thở

| | |
|---|---|
| Ở đâu | Bảng điều hành chưa có card (`dashboard.ts`), Luyện SQL chưa học gì (`modes.ts`): `lily-sleep` sẵn có. |
| Chuyển động | Dấu `zz` (đã có trong symbol, đã có `cq-floatz`) chạy khi có một Lily đang ngủ trong trang đang hiện: `body:has(main:not([hidden]) use[href="#lily-sleep"]) #mascot-sprite .zz { animation: cq-floatz 2.2s ease-out infinite }`. Không JS. Boon ngủ không dùng ở đâu nên không bị ảnh hưởng. |
| Giảm chuyển động / A11y | `zz` đứng yên; linh vật `aria-hidden`, chữ trạng thái rỗng không đổi. |
| Ngân sách | CSS ≈ +0,05 KB. main 0. |
| File | `src/style.css`. |
| Kiểm | Trình duyệt: bảng điều hành chưa có card và Luyện SQL chưa học gì (`zz` bay); rời trang (DevTools Animations: không còn animation chạy); Firefox cũ / không `:has` thì đứng yên. |

### B3. E-com chuyển động + dock khi xong việc (và móc cho Finance)

| Mục | Hành vi |
|---|---|
| Nền ở Tổng quan (`storeScene`) | Ba lồng đèn đung đưa `cq-sway` (xoay ±5°, gốc đỉnh, 3,2 s `infinite`, lệch pha); xe máy giao hàng rời lề và quay lại `cq-scoot` (14 s `infinite`, như `cq-ship-out`). Class chỉ gắn khi `opts.ambient` (như `harborScene`), nên bản đồ trong hộp thoại và dock không lặp. |
| Bản đồ giao hàng | Thành phố mở gần nhất có vòng `cq-pulse` (keyframe sẵn có). Không thêm xe chạy trên tuyến (D-M5). |
| Dock khi xong việc | `ecomart` thêm `build(c)` / `play(c)` cùng hợp đồng với `art/logistics`: `run.fast` = chỉ trạng thái cuối. Việc thường: cắt khung kệ hàng, một gói màu chương rơi vào ô kế tiếp (rơi 400 ms, nảy 200 ms), cửa cuốn kho hạ 400 ms, xe máy chạy ra 900 ms; tổng 2,2 s. Thăng tiến: gói rơi, rồi thành phố vừa mở sáng + vòng `cq-pulse`, lồng đèn sáng (đổi fill), thẻ chức danh; 3,0 s. Lily `cheer` vào ở cuối như dock Logistics. Câu báo dùng lại `ecom.done` / `ecom.promoted`. |
| Móc cho Finance | `stage.ts` thay nhánh `if (activeDomain() !== 'logistics') { announce; return }` bằng bảng `DOCK: Partial<Record<DomainId, () => Promise<DockArt>>>` (`logistics: loadArt`, `ecommerce: loadEcomArt`). Hàng đợi, Bỏ qua, Esc, focus, tự đóng 4 s / 8 s dùng chung. Domain không có trong bảng thì chỉ có câu báo như hôm nay. **Hình của Finance thiết kế cùng plan Finance**: chunk riêng `financeart` (trần 10 KB như `ecomart`), một dòng trong `DOCK`, dùng lại `cq-*`, loader A4 và luật §1. v5 không vẽ gì cho Finance; trang "Sắp ra mắt" giữ `financeSoon()` tĩnh. |
| Giảm chuyển động | Không đung đưa, không xe chạy; dock vẽ trạng thái cuối và ở lại tới khi Đóng (như Logistics). |
| A11y | Như completion-animations §6: câu ghi vào `#announce` ngay lúc đạt, SVG cảnh `role="img"` + `aria-label` trạng thái đã tính lại, phần chuyển động `aria-hidden`. |
| Ngân sách | ecomart ≈ +1,5 KB (2 → 3,5 / 10). main (`stage.ts` bảng `DOCK` + nhánh) ≈ +0,3 KB. CSS ≈ +0,1 KB. |
| File | `src/art/ecommerce.ts`, `src/ui/ecomArt.ts` (gọi `initArt` thêm `mascot`, `reducedMotion`), `src/ui/stage.ts`, `src/style.css`, `tests/ecomArt.test.ts`. |
| Kiểm | `tests/ecomArt.test.ts`: `build` với `fast` cho ra trạng thái cuối có thêm 1 gói ở đúng ô; thăng tiến có thành phố mở. Trình duyệt: xong `ecom-ch1-01` và đánh giá thăng tiến ch1, Esc, Bỏ qua, 375 (dock không che editor; ở 375 story đã chuyển sang pane Recap). |

### B4. Dấu của Boon (tour, hướng dẫn v13) trượt vào

| | |
|---|---|
| Khi nào | Một dấu **bước mới** xuất hiện: `coach.ts` (tour) và engine hướng dẫn (learnui) nhớ khóa bước vừa hiện (`tour:3`, `path:2`…), và chỉ gắn class khi khóa đổi. Vẽ lại cùng bước thì không chạy. |
| Chuyển động | `aside.tour` có `cq-fade` (opacity 0 → 1, 200 ms; **không** transform, vì dấu có thể nằm trong vùng có stretched link) và Boon trong dấu có `cq-hop` (−6 px rồi về, 320 ms, trễ 80 ms). |
| Giảm chuyển động / A11y | Hiện ngay; `role="note"`, focus như hôm nay (dấu tự hiện không lấy focus, L97/L98). |
| Ngân sách | main (`coach.ts`) ≈ +0,06 KB; learnui ≈ +0,05 KB; CSS ≈ +0,05 KB. |
| File | `src/ui/coach.ts` (`boonMark`, `mark`), engine hướng dẫn (`src/ui/guide.ts` / `guideList.ts`), `src/style.css`. |
| Kiểm | Tour ticket 1 bước 1 → 3 và hướng dẫn G1 ở `#/learn`: mỗi bước trượt vào một lần; đổi ngôn ngữ trong lúc dấu đang hiện: không chạy lại; Esc vẫn bỏ được; focus không đổi (dấu tự hiện không lấy focus). |

---

## P3

### C1. Vào trang đọc: mờ dần

| | |
|---|---|
| Khi nào | `showRoute()` (`main.ts`) đổi sang một trang vẽ trong `<main id="home">` (Trang chủ, Tổng quan, Lộ trình, Luyện SQL, Bản đồ, Sắp ra mắt), không phải lần đầu: đặt `#home[data-enter]`, gỡ sau 400 ms. |
| Chuyển động | `#home[data-enter] > section`: `cq-fade` 180 ms, fill `backwards` (không giữ kiểu sau khi xong), lệch 0 / 40 / 80 / 120 ms cho 4 khối đầu. **Chỉ opacity**, vì các khối chứa card có stretched link (L93). Không áp cho `#shell` (CodeMirror đo kích thước), `#data`, `#dashboard`. |
| Không chặn | Opacity không chặn bấm; trang dùng được ngay. View Transitions API: **không làm** (trong lúc chuyển, cây pseudo phủ trang và chụp cả editor; cần kiểm xem có nuốt cú bấm không, và không đáng với 180 ms). |
| Giảm chuyển động | Không gì. |
| Ngân sách | main ≈ +0,06 KB; CSS ≈ +0,05 KB. |
| File | `src/main.ts` (`showRoute`), `src/style.css`. |
| Kiểm | Trang chủ → Lộ trình → Tổng quan: mờ dần, lần tải đầu không chạy; bấm một card ngay khi vào trang: cú bấm ăn; stretched link vẫn phủ cả card trong và sau hiệu ứng; workspace không chạy. |

### C2. "Ngày thứ N cùng Lily": lật số

| | |
|---|---|
| Khi nào | `markDay()` (`src/lily.ts`) trả `true` khi vừa ghi một ngày mới. Lần vẽ khối chào kế tiếp trên Trang chủ cho số N chạy `cq-flip` một lần (opacity + `translate` −4 px → 0 trên `<span>` số, 300 ms). Cờ chỉ trong bộ nhớ. |
| Giảm chuyển động / A11y | Số hiện ngay; chữ không đổi. |
| Ngân sách | main ≈ +0,08 KB. |
| File | `src/lily.ts` (`markDay` trả `boolean`), `src/state.ts` (giữ cờ), `src/ui/homeView.ts` (`hello`), `src/style.css`. |
| Kiểm | `tests/lily.test.ts` (nếu có, hoặc thêm vào test sẵn có của `markDay`): ngày mới → `true`, cùng ngày → `false`. Trình duyệt: xóa `cargo-query/days`, đạt một việc, mở Trang chủ: số lật một lần. |

---

## 2. Bảng ngân sách (gzip -9, ước lượng; đo thật ở cổng mỗi task)

| Mục | main | CSS | Chunk lười | `index.html` |
|---|---|---|---|---|
| §1 nền (`react`, `data-pose`, `@property`) | +0,08 | +0,25 | | |
| A1 Lily lớn | +0,25 | +0,3 | | |
| A2 Phản ứng | +0,12 | +0,1 | | |
| A3 XP | +0,13 | +0,1 | | |
| A4 Loader | +0,15 | +0,1 | learnui +0,02 | +0,25 |
| **Tổng P1** | **≈ +0,73** | ≈ +0,85 | | +0,25 |
| B1 Lộ trình | 0 | +0,15 | illustrations −0,3, learnui +0,3 | |
| B2 Ngủ | 0 | +0,05 | | |
| B3 E-com | +0,3 | +0,1 | ecomart +1,5 | |
| B4 Dấu Boon | +0,06 | +0,05 | learnui +0,05 | |
| **Tổng P2** | **≈ +0,36** | ≈ +0,35 | | |
| C1 + C2 | +0,14 | +0,05 | | |
| **Tổng v5** | **≈ +1,2** | ≈ +1,25 (15 → ~16,3 / 20) | | 7,9 → ~8,2 / 9 |

main hôm nay 287,7 / 290 KB (L99), tức còn ~2,3 KB. Plan Finance đang viết cũng sẽ cần chỗ trong main. Vì vậy (D-M1): **không nâng trần 290**, P1 + P2 tối đa **+1,1 KB**. Nếu cổng của một task cho thấy main > 289,0 KB thì bỏ C1/C2 trước, rồi phần main của B3 (giữ nền E-com, bỏ dock) và báo lại. Chữ mới chỉ có 2 key trong `vi.ts` (A1); mọi chữ khác của General vào `src/i18n/learn.ts` (learnui).

## 3. i18n mới (VI / EN)

| Key | VI | EN |
|---|---|---|
| `lily.grew` | Lily đã lớn: {stage}. | Lily has grown: {stage}. |
| `lily.grewPill` | Vừa lớn | Just grew |

`{stage}` = `lily.stage0..3` sẵn có. Chip XP chỉ là `+N` (số, không key). Loader không có chữ. `tests/i18n.test.ts` phải xanh.

## 4. Build tasks

Cổng chung của **mọi** task: `npx tsc --noEmit` · `npm test` · `npm run build` · `node scripts/check-budget.mjs` (main ≤ 289,0 theo D-M1; `html` ≤ 9) · kiểm trình duyệt bằng `vite preview --port 5175` (hoặc cổng ≥ 5175, **không bao giờ 5173/5174**), hồ sơ mới, ở **375** và **1280**, theme sáng + tối, và một lần với giảm chuyển động (Edge/Chrome headless `--force-prefers-reduced-motion`, hoặc DevTools Rendering). Ghi kết quả vào `docs/team/review-log.md` "v5".

| Task | Việc | File | Phụ thuộc | Cổng riêng |
|---|---|---|---|---|
| T1 | Nền §1: khối CSS "v5 motion", `@property`, `react()`, `data-pose`; test "một lần ≤ 3 s", "`cq-*` có keyframes", luật reduce cuối file; nhóm `html` trong `check-budget.mjs` | `src/style.css`, `src/ui/celebrate.ts`, `src/ui/mascots.ts`, `tests/mascots.test.ts`, `scripts/check-budget.mjs` | | Test mới đỏ trước khi thêm keyframe sai thời lượng (thử 3,2 s rồi gỡ) |
| T2 | A2 phản ứng + A3 XP | `src/ui/work.ts`, `src/ui/brief.ts`, `src/ui/topbar.ts`, `index.html` | T1 | Đổi ngôn ngữ ngay sau phản ứng: không phát lại; nhập save: không chip |
| T3 | A1 Lily lớn (mốc phiên, cờ 4 s, pill, câu báo, dock) | `src/ui/homeView.ts`, `src/ui/stage.ts`, `src/ui/celebrate.ts`, `src/main.ts` (xóa mốc khi nhập), `src/style.css`, `src/i18n/vi.ts`, `en.ts`, test mốc | T1 | Lên giai đoạn qua story (dock + dòng phản hồi) và qua drill; thăng tiến vẫn ≤ 3,0 s |
| T4 | A4 loader + `<progress>` | `index.html`, `src/ui/dom.ts`, `src/main.ts`, `src/ui/dataView.ts`, `src/ui/tryPreview.ts`, `src/ui/vizTabs.ts`, `src/ui/learnView.ts` | T1 | Slow 4G: loader chạy, hết tải thì dừng (DevTools Animations trống) |
| T5 | B1 Lộ trình: glyph trong danh sách, `trackGlyph`, glyph-in, đóng dấu; xóa `studyDesk`/`emptyPath` | `src/art/illustrations.ts`, `src/ui/learnView.ts`, `tests/illustrations.test.ts` | T1 | learnui ≤ 25, illustrations ≤ 15; 320 px không cuộn ngang |
| T6 | B2 `zz` + B4 dấu Boon | `src/style.css`, `src/ui/coach.ts`, engine hướng dẫn (learnui) | T1 | Tour ticket 1 bước 1→3 và G1: mỗi bước trượt một lần; Esc vẫn bỏ được |
| T7 | B3 E-com nền + dock + bảng `DOCK` | `src/art/ecommerce.ts`, `src/ui/ecomArt.ts`, `src/ui/stage.ts`, `tests/ecomArt.test.ts` | T1, T3 (Lily trong dock) | ecomart ≤ 10; Logistics dock không đổi (so ảnh chụp trước/sau) |
| T8 | P3: C1 + C2 (chỉ khi main ≤ 289,0 sau T7) | `src/main.ts`, `src/lily.ts`, `src/ui/homeView.ts`, `src/style.css` | T1 | Bấm ngay trong 180 ms đầu khi vào trang: cú bấm ăn |
| T9 | Kiểm cuối + giấy tờ | `CLAUDE.md`, `docs/team/decision-log.md`, `docs/team/review-log.md` | T1–T8 | Đo lại toàn bộ bảng §2 |

## 5. Rủi ro

| Rủi ro | Giảm |
|---|---|
| main vượt trần (Finance cũng cần chỗ) | D-M1: thứ tự bỏ C → B3-dock; đo ở mỗi cổng, không đợi T9. |
| Animation phát lại mỗi lần `rerender()` | Luật §1: chỉ gắn ở sự kiện; mỗi task có bước "đổi ngôn ngữ ngay sau đó". |
| Transform làm hỏng stretched link (L93) hoặc đo CodeMirror | Transform chỉ trên SVG lá; vào trang chỉ opacity, fill `backwards`, không áp cho `#shell`. |
| `:has()` chậm hoặc không hỗ trợ (Firefox < 121) | Selector gắn neo `#mascot-sprite`; không hỗ trợ thì `zz`/loader đứng yên, vẫn đúng. |
| `@property` không hỗ trợ | Phụ kiện và kích thước Lily đổi ngay, vẫn đúng. |
| `Element.animate()` bỏ qua giảm chuyển động | Mọi chỗ dùng (dock E-com, Lily trong dock) đi qua `run.fast = reducedMotion()`. |
| Sprite to dần (đầu trang, ngoài ngân sách) | Nhóm `html` ≤ 9 KB trong `check-budget.mjs`. |
| Nhịp nảy gây khó chịu (tiền đình) | Biên độ nhỏ (≤ 6 px, ≤ 18 % scale, ≤ 8°), không lặp, trừ nền đã có cơ chế dừng khi khuất. |

## 6. Test cần thêm

- `tests/mascots.test.ts`: §1 (thời lượng một lần ≤ 3 s, `cq-*` có keyframes, reduce cuối file), `#cq-load` có và không chứa `<text>`.
- Test mốc Lily lớn (A1): lần đầu, tăng, nhập save.
- `tests/ecomArt.test.ts`: dock `fast` = trạng thái cuối (+1 gói đúng ô), thăng tiến mở thành phố.
- `tests/illustrations.test.ts`: bỏ `studyDesk`/`emptyPath`; `moduleGlyph` có ít nhất một `data-acc`.
- `tests/theme.test.ts` (sẵn có) bắt class không literal; `tests/i18n.test.ts` cho 2 key mới.

## 7. Không làm (YAGNI)

- Linh vật chớp mắt hoặc nhấp nhô ở mọi nơi (D-M3).
- Tư thế mới trong sprite.
- Thư viện animation, Lottie, canvas.
- View Transitions.
- Âm thanh.
- Công tắc "Giảm chuyển động" trong app (D-M9).
- Xe chạy trên bản đồ E-com.
- Hình cho Finance (để plan Finance làm, móc ở B3).
- Pref nhớ lần lớn của Lily.
- Hoạt cảnh cho Luyện tập / Ôn (completion-animations §1.4 giữ: chỉ lần đạt đầu).

## 8. Việc kèm theo (không thuộc commit spec này)

- `CLAUDE.md`: khối "v5 motion" (luật §1: kiểu gốc = trạng thái cuối, chỉ gắn ở sự kiện, transform chỉ SVG lá, `react()`/`data-pose`), `#cq-load` + `loader()`, nhóm ngân sách `html`, bảng `DOCK` trong `stage.ts` (Finance thêm một dòng), `cq-grow` + class `grow` (gắn ở sự kiện, theo `grewAt`).
- `decision-log.md`: một dòng L mới khi user duyệt v5 (lấy số kế tiếp trên main lúc merge; Finance có thể đang dùng số gần đó), ghi các mặc định D-M1…D-M9 đã chọn.

## 9. Quyết định cần duyệt (mặc định in đậm)

| # | Câu hỏi | Mặc định | Phương án khác |
|---|---|---|---|
| D-M1 | Trần main 290 KB | **Giữ 290; v5 ≤ +1,1 KB main (P1 + P2); C1/C2 chỉ khi main ≤ 289,0 sau T7** | Nâng trần lên 292 (cần user, như Plan 7 V1) |
| D-M2 | Lily lớn: nhớ ở đâu | **Chỉ trong phiên (không pref, không Save)** | Pref `cargo-query/lily-seen` để báo cả sau khi tải lại |
| D-M3 | Linh vật chớp mắt / nhấp nhô ngoài màn chào | **Không** (Plan 7 V4 giữ) | Chớp mắt mọi nơi bằng `:has()` |
| D-M4 | `studyDesk()`, `emptyPath()` không ai gọi | **Xóa** | Đặt `emptyPath` ở Luyện SQL khi chưa học gì (thay Lily ngủ) |
| D-M5 | E-com khi xong việc | **Dock đầy đủ (B3), +0,3 KB main** | Chỉ nền + gói "Mới" trên kệ ở Tổng quan, main 0 |
| D-M6 | Hiệu ứng vào trang | **Có, chỉ opacity, chỉ trang đọc (P3)** | Không làm |
| D-M7 | Chip "+N" ở pill XP | **Có, `aria-hidden`** | Chỉ pop pill |
| D-M8 | `zz` ở trạng thái rỗng | **Có (CSS `:has`)** | Đứng yên như hôm nay |
| D-M9 | Công tắc "Giảm chuyển động" trong app (completion-animations §5 có nhắc) | **Không, theo hệ điều hành** | Thêm vào ⋯ (pref, main ≈ +0,3 KB) |
