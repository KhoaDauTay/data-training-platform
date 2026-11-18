# Product Design v8: Boon chỉ đường trong Lộ trình, gợi ý điền khung ở mọi bài

Ngày: 2026-11-18 · Vai trò: Product Designer + UI/UX · **Chỉ đề xuất**: không sửa `src/`, `content/`, test hay `decision-log.md`. User duyệt **§5 (Quyết định)** trước khi viết plan build.
Đầu vào: `CLAUDE.md`, `decision-log.md` L81–L93 (L82 General tách domain, L84 Thử ngay/preview, L87 vai linh vật, L88, L93), `product-design-v7.md` (khuôn), `problem-design.md` §1.5 (gợi ý ba bậc), mã: `src/onboarding.ts`, `src/ui/coach.ts`, `src/ui/teachScene.ts`, `src/ui/lessonCard.ts`, `src/ui/learnView.ts`, `src/ui/drillBrief.ts`, `src/ui/brief.ts` (`hints()`), `src/ui/work.ts` (chặn `___`, `setTicket`), `src/ui/editor.ts`, `src/general.ts` (`drillTicket`), `src/ui/modes.ts`, `src/session.ts`, `src/progress.ts` (`xpFor`), `content/general/*.yml`, `content/lessons.yml`, ticket `ch1-02`, `ch3-03`, `ch5-03`, `ch7-02`, `ch10-02`, `ch11-03/04`, `ch2-05`, `ecom-ch1-02`, `ecom-ch5-02`, `ecom-ch6-02/05`, làn `ausyd/s-1`, `nlrtm/r-3`.
Số đo trong tài liệu (§3.3, §3.4) lấy từ một bản thử luật sinh khung chạy trên **toàn bộ** nội dung thật (script tạm ngoài repo, không commit): 114 drill kỹ năng, 80 drill/thử thách nâng cao, 58 ô Thử ngay, 117 Solution của ticket story/E-com/làn.

Yêu cầu của user (VI, giữ ý): *"Lộ trình cần hướng dẫn, không chỉ onboarding. Tạo nhiều flow dẫn người dùng khi học cái mới. Gọi Boon lên hướng dẫn từng tính năng và từng module, **chỉ trong lộ trình**; bài trong domain không cần. NHƯNG khi bấm gợi ý thì phải có flow Boon chỉ đường và điền vào editor SQL: gợi ý đã nói dùng lệnh gì thì chỉ cần điền phần còn lại. Làm ở **TẤT CẢ** bài."*

---

## 0. Tóm tắt một trang

| Chủ đề | Đề xuất v8 | Cỡ |
|---|---|---|
| **A. Boon chỉ đường** (chỉ khu General) | 8 hướng dẫn ngắn (1–4 bước), mỗi cái chạy **một lần** khi người học gặp thứ mới: Lộ trình, Phần (mở đầu tiên đầy đủ, các Phần sau một bước tự sinh), trang kỹ năng, bài học nhanh, bàn luyện + từng loại bài luyện, khung so kết quả, Luyện SQL/Ôn tập, bài nâng cao. Dấu của Boon nằm **trong slot** của vùng (cùng cơ chế `tourSlot`), không bao giờ đè editor hay bảng kết quả. Nút **"Boon chỉ mình"** xem lại từng trang; ⋯ "Bật lại hướng dẫn của Boon". Nhớ ở pref `cargo-query/guides`, không vào Save. Lily chỉ phản ứng (reo khi xong hướng dẫn Lộ trình). | M |
| **B. Gợi ý → Boon → điền khung** (mọi bài) | Gợi ý hiện thành **lời Boon chỉ đường** (Boon `point` + bong bóng). Ngay sau gợi ý **nêu lệnh** (story: gợi ý 2; drill: gợi ý duy nhất; Thử ngay: nút "Boon chỉ"), Boon mời **"Điền khung vào editor"**: một câu SQL giữ nguyên lệnh, hàm, bảng; mọi tên cột, bí danh cột và giá trị thành `___`. Khung **tự sinh từ Solution** (không viết tay, 0 bài phải sửa); bài bẫy gộp mệnh đề bẫy thành một `___`. Editor có câu thì hỏi tại chỗ; thay bằng một giao dịch CodeMirror (hoàn tác bằng {mod}+Z hoặc nút). Story: giá bằng mở gợi ý 3; drill/ôn tập: lần đạt đó là "đạt yếu"; Thử ngay: miễn phí. Không điền ở bước lab chỉ mục. Nộp bị chặn khi còn `___` ở **mọi** bài. | M |
| **C. Build** | 6 task; main +~1,5 KB (285 → ~287/290), chunk lazy mới `frame` ≤ 3 KB, `learnui` 6 → ~11/25 KB. | ~5–6 ngày agent |

---

## 1. Nguyên tắc chung

1. **Boon dạy, Lily học (L87).** Mọi lời hướng dẫn và gợi ý là Boon, ngôi thứ nhất ("mình"), câu ngắn, một ý mỗi bước. Lily chỉ phản ứng: reo, ngủ, đứng chờ; không nói trong hướng dẫn.
2. **Ranh giới A (L82 + yêu cầu user).** Hướng dẫn Boon chỉ xuất hiện ở khu General: `#/learn…`, `#/practice`, bàn luyện (session mode `drill`), lượt ôn bằng drill, và hộp thoại bài học **khi mở từ khu General**. Không bao giờ ở ticket story, việc phụ làn, E-com, đánh giá thăng tiến. Tour 8 bước của ticket 1 Logistics giữ nguyên.
3. **Ranh giới B.** Flow gợi ý + điền khung có ở **mọi** bài có gợi ý hoặc có ô chấm: story, làn, E-com, đánh giá thăng tiến, drill, lượt ôn, Thử ngay. Ngoại lệ duy nhất là bước lab chỉ mục (§3.7).
4. **Luật vùng giữ nguyên (v6 §1.4, L69, L87).** Một linh vật mỗi vùng; dấu nằm trong slot giữa các khối, không nổi trên editor hay bảng kết quả; reduced motion = hình đứng yên; dấu `role="note"`, không cướp focus khi tự hiện.
5. **Không thêm vào Save.** Hướng dẫn đã xem là pref thiết bị; chi phí gợi ý dùng đúng các ô đang có (`save.hintsUsed`, `run.hints`, session mode). Save giữ v4.

---

## 2. Phần A: Boon chỉ đường trong Lộ trình

### 2.1 Cơ chế chung

**Một hướng dẫn** = id + danh sách bước; mỗi bước = slot + lời VI/EN + nút. Dữ liệu tĩnh trong `src/ui/guide.ts` (chunk lazy `learnui`); chữ trong `src/i18n/learn.ts` (`lt()`, đã có test i18n).

| Phần | Thiết kế |
|---|---|
| **Kích hoạt** | Khi trang/khối General vẽ xong (`rerender()` → `refreshGuides()`), hàm thuần `guideFor(ctx, pref)` (`src/guides.ts`) trả hướng dẫn cần hiện: chưa có trong `seen`, `off` chưa bật, người chơi không phải `knows: true` (D-G1), không có dấu tour nào đang hiện (`tourRegion()` rỗng). Mỗi lúc **tối đa một** hướng dẫn. |
| **Dấu** | Dùng lại dấu tour: `coach.ts` tách `mark()` thành `boonMark({ label, text, buttons, mascot })` và xuất qua `DrillDeps` (một chỗ cho lớp `bg-sun text-sun-ink`, 8,3:1). Nhãn "Boon chỉ đường · {i}/{n}". Nút: **Tiếp** (bước cuối: **Xong**), **Bỏ qua (Esc)**, link nhỏ **Tắt hướng dẫn**. |
| **Slot** | Như `tourSlot()`: `<div data-guide-slot="…">` đặt sẵn trong mã vẽ trang, rỗng khi không có bước nào chỉ vào. Khối đang được nói tới có viền `ring-2 ring-sun` tĩnh (không nhấp nháy); lời Boon luôn gọi tên khối, không dựa vào màu. Danh sách slot ở §2.3. |
| **Một linh vật mỗi vùng** | Hàm `boonRegion()` = vùng của dấu tour **hoặc** dấu hướng dẫn. Vùng đó bỏ linh vật khác: Boon `think` cạnh gợi ý, Boon ở đầu thẻ bài học (thay bằng icon kỹ năng, như đã làm cho tour), linh vật trong dòng phản hồi. Riêng trang Lộ trình: bước 1 nằm ngay dưới cảnh dạy học và **không có Boon riêng**: bong bóng có đuôi chỉ lên Boon trong cảnh (cảnh tính là một hình minh họa, L87). |
| **Cuộn, focus** | Bước tự hiện: cuộn vào tầm nhìn một lần (`block: 'nearest'`), không đổi focus, `announce()` đọc lời bước (polite). Bấm Tiếp: focus sang dấu bước sau (như tour). Trên điện thoại ở bàn luyện: `showPane()` sang pane chứa dấu (như `reveal()` của tour). |
| **Esc** | Luật riêng, cùng ý `tourEscSkips`: Esc bỏ hướng dẫn khi dấu đang hiện (đã layout, `main` chứa nó không `hidden`; trang Lộ trình là `#home`, không phải `#shell`) và không ai khác nhận Esc (modal, sổ tay, popover, dock hoàn thành, focus trong CodeMirror). Dấu nằm **trong** hộp thoại bài học: Esc thuộc về hộp thoại (đóng nó); đóng hộp thoại khi hướng dẫn đang chạy = đã xem (D-G3). |
| **Đã xem** | Xong bước cuối, Bỏ qua, Esc, hoặc đóng hộp thoại bài học. Rời trang giữa chừng thì lần sau hiện lại từ bước 1 (không lưu bước dở). |
| **Xem lại** | Nút chữ **"Boon chỉ mình"** (không linh vật; dấu sẽ mang Boon tới) ở: dòng "← Lộ trình" của trang Phần/kỹ năng/nâng cao, dưới dòng thống kê ở Lộ trình, dòng loại bài ở bàn luyện, hàng nút của hộp thoại bài học, thẻ Ôn tập ở Luyện SQL. Bấm: chạy lại hướng dẫn của chỗ đó từ bước 1 (không ghi pref cho tới khi xong/bỏ), focus vào dấu. Menu ⋯: **"Bật lại hướng dẫn của Boon"** xóa pref. |
| **Nhớ** | Pref `cargo-query/guides` = `{ seen: string[], off: boolean }`, đọc qua `parseGuides` (mảng chuỗi khớp `^[a-z0-9:-]+$`, ≤ 64 phần tử; `off` chỉ `true` mới bật; dữ liệu hỏng = chưa có pref). Không vào Save, không vào Xuất tiến độ (như `cargo-query/tour`). Ghi lỗi chỉ làm hướng dẫn hiện lại lần sau. |
| **Reduced motion** | Không có chuyển động mới: dấu và viền tĩnh; cảnh dạy học đã đứng yên dưới reduced motion; Lily reo = khung tĩnh. |
| **A11y** | Dấu `role="note"`, `aria-label` "Boon chỉ đường, bước i/n"; nút ≥ 24 px (44 px trên điện thoại theo A4); chữ code bọc `lang="en"`; tương phản 8,3:1 sẵn có. |

### 2.2 Sống chung với tour lần đầu

- Tour 8 bước sống ở ticket 1 Logistics (story); hướng dẫn sống ở khu General. Hai thứ không cùng trang, trừ hộp thoại bài học: mở từ chip kỹ năng của ticket story thì **không** có hướng dẫn (`openLesson(id, { guide: false })` mặc định; chỉ `learnView`/`drillBrief` truyền `guide: true`).
- Tour bước 8 có nút "Xem lộ trình": người chơi tới `#/learn` lần đầu và hướng dẫn Lộ trình (G1) bắt đầu ngay, nối tiếp tự nhiên.
- Người chọn **"Chỉ học SQL"** không bao giờ có tour: chuỗi G1 → G2 → G4 → G5 chính là onboarding của họ.
- `knows: true` ("Tôi đã biết SQL"): hướng dẫn không tự hiện, "Boon chỉ mình" vẫn chạy (D-G1). Đã bỏ tour (`coach-done`): hướng dẫn **vẫn** hiện, vì khác khu và mỗi cái ≤ 4 bước, tắt một chạm (D-G2).
- Không bao giờ có hai dấu Boon cùng lúc: `guideFor` trả rỗng khi có dấu tour.

### 2.3 Các hướng dẫn

Ghi chú: `{mod}` theo `t()` (⌘ hoặc Ctrl). Nhãn nút đúng chữ i18n đang có (`drill.kind.*`, `preview.*`, `lesson.*`). EN không dấu, không chữ "later" (test `noDeadEnds`), không tên domain hay chương (L82).

#### G1 `path`: Lộ trình (`#/learn`), lần đầu mở

| # | Slot | VI | EN |
|---|---|---|---|
| 1 | `learn-head` (ngay dưới cảnh dạy học; bong bóng không Boon, đuôi chỉ lên Boon trong cảnh) | Chào bạn, mình là Boon. Đây là Lộ trình: bên trái là SQL nền tảng, bên phải là phân tích nâng cao. | Hi, I'm Boon. This is your learning path: SQL basics on the left, advanced analysis on the right. |
| 2 | `learn-sql` (trên danh sách Phần; Boon `point` 40 px) | Mỗi Phần là một nhóm kỹ năng. Thanh dưới tên Phần cho biết bạn đã học được mấy kỹ năng. | Each module is a group of skills. The bar under its name shows how many you have learned. |
| 3 | `learn-adv` (trên nhánh nâng cao) | Ở đây không bài nào bị khóa. Dòng "Nên học trước" chỉ là lời khuyên của mình. Bắt đầu từ Phần 1 nhé. Nút: **Mở Phần 1** · **Xong** | Nothing here is locked. The "Learn first" line is only my advice. Let's start with Module 1. Buttons: **Open Module 1** · **Done** |

Xong: Lily trong cảnh reo một lần (600 ms, đúng phản ứng khi bấm Lily; khung tĩnh dưới reduced motion). Không thưởng.

#### G2 `module`: lần đầu mở một Phần

Phần mở **đầu tiên** (thường là Phần 1) có bản đầy đủ `module-intro`; mỗi Phần sau có bản một bước `module:<n>`. Danh sách kỹ năng **tự sinh** từ `SKILLS` (nhãn, theo thứ tự), không viết 12 đoạn giới thiệu (D-G4).

| # | Slot | VI | EN |
|---|---|---|---|
| 1 | `module-head` (dưới tiêu đề Phần) | Phần {n} dạy {k} kỹ năng: {list}. | Module {n} teaches {k} skills: {list}. |
| 2 | `module-skill` (trên thẻ kỹ năng đầu; thẻ có viền sun) | Mỗi kỹ năng đi một vòng: đọc Bài học nhanh khoảng hai phút, rồi làm 3 bài luyện: Điền vào chỗ trống, Tự làm, Bẫy hay gặp. | Every skill goes round one loop: a quick lesson of about two minutes, then 3 drills: Fill in the frame, On your own, Common trap. |
| 3 | `module-skill` | Đạt một bài luyện ngay lần nộp đầu, hoặc đạt hai bài, là kỹ năng được tính "đã học" và vào Ôn tập. Làm cả 3 bài để chắc tay. Mình mở bài học {skill} cho bạn nhé? Nút: **Mở bài học {skill}** · **Xong** | Pass one drill on the first submit, or pass two, and the skill counts as learned and joins your reviews. Do all 3 to be sure. Shall I open the {skill} lesson? Buttons: **Open the {skill} lesson** · **Done** |
| — | bản ngắn `module:<n>`, slot `module-head` | Phần {n} có {k} kỹ năng: {list}. Vòng học như Phần trước: bài học nhanh rồi 3 bài luyện. | Module {n} has {k} skills: {list}. Same loop as before: a quick lesson, then 3 drills. |

#### G3 `skill`: lần đầu mở một trang kỹ năng (`#/learn/skill/<id>`)

| # | Slot | VI | EN |
|---|---|---|---|
| 1 | `skill-head` (trên khối kỹ năng) | Trang kỹ năng gom mọi thứ của một kỹ năng: trạng thái, bài học và 3 bài luyện. Dấu ✓ là phần bạn đã xong. | A skill page holds everything for one skill: its status, the lesson and the 3 drills. A ✓ marks what you have done. |
| 2 | `skill-card` (trên "Thẻ kỹ năng") | Thẻ kỹ năng là bản tóm tắt: câu mẫu, khi nào dùng, lỗi hay gặp. Quên cú pháp thì quay lại đây. | The skill card is the summary: a sample query, when to use it, the common mistake. Forgot the syntax? Come back here. |

#### G4 `lesson`: bài học nhanh đầu tiên mở từ khu General (hộp thoại)

Boon ở đầu thẻ bài học nhường chỗ (icon kỹ năng) khi dấu đang ở trong hộp thoại.

| # | Slot | VI | EN |
|---|---|---|---|
| 1 | `lesson-example` (dưới nút "Chạy ví dụ", đúng chỗ tour bước 4) | Đọc câu ví dụ rồi bấm "Chạy ví dụ". Các số ① ② bên dưới giải thích từng phần của câu. *(Tự sang bước 2 khi ví dụ chạy xong.)* | Read the example, then press "Run the example". The numbers ① ② below explain each part. |
| 2 | `lesson-mistake` (dưới "Lỗi hay gặp") | Đây là lỗi mình gặp nhiều nhất ở kỹ năng này. Nhớ hình dạng của nó, lúc bị báo lỗi bạn sẽ nhận ra ngay. | This is the mistake I see most with this skill. Remember its shape and you will spot it when an error shows up. |
| 3 | `lesson-try` (trên "Bảng dùng") | Tới lượt bạn. "Bảng dùng" cho xem cột và 5 dòng mẫu; "Kết quả mong đợi" cho biết số dòng và 3 dòng đầu. Cột được chấm theo thứ tự, không theo tên. | Your turn. "Tables used" shows the columns and 5 sample rows; "Expected result" gives the row count and the first 3 rows. Columns are checked by position, not by name. |
| 4 | `lesson-try-actions` (dưới hàng nút Thử ngay) | "Chạy thử" chỉ cho xem kết quả của bạn, chưa chấm. "Kiểm câu trả lời" mới chấm. Bí thì bấm "Boon chỉ", mình điền khung cho. | "Run" only shows your result, without checking it. "Check my answer" checks it. Stuck? Press "Boon, help", and I'll fill in a frame. |

#### G5 `drill` + `drill:<kind>`: bàn luyện

Bài luyện **đầu tiên** (mọi loại): hai bước bàn luyện, rồi bước của loại đó. Lần đầu gặp mỗi loại khác: chỉ bước của loại. Dấu nằm ở pane trái (`drill-brief`, dưới đề) hoặc slot `work` dưới hàng nút (slot tour đang có), không trên editor.

| id · # | Slot | VI | EN |
|---|---|---|---|
| `drill` 1 | `drill-brief` | Đây là bàn luyện. Bên trái: đề, bảng dùng và kết quả mong đợi. Dữ liệu là một chuỗi cửa hàng, chỉ dùng để luyện. | This is the practice desk. On the left: the task, the tables used and the expected result. The data is a chain of shops, only for practice. |
| `drill` 2 | `work` | Chạy ({mod}+Enter) bao nhiêu lần cũng được, không bao giờ bị tính sai. Nộp ({mod}+Shift+Enter) mới chấm. | Run ({mod}+Enter) as often as you like; it never counts as wrong. Submit ({mod}+Shift+Enter) is what gets checked. |
| `drill:faded` | `drill-brief` | Bài "Điền vào chỗ trống": câu đã nằm sẵn trong editor, chỉ thiếu các chỗ ___. Nộp khi còn chỗ trống thì mình nhắc, không tính là sai. | "Fill in the frame": the query is already in the editor, only the ___ blanks are missing. Submit with a blank left and I'll remind you; it doesn't count as wrong. |
| `drill:open` | `drill-brief` | Bài "Tự làm": editor trống, bạn viết cả câu. Nhìn "Kết quả mong đợi" trước: mấy cột, mấy dòng. | "On your own": the editor is empty and you write the whole query. Look at "Expected result" first: how many columns, how many rows. |
| `drill:trap` | `drill-brief` | Bài "Bẫy hay gặp": câu trả lời hiển nhiên nhất thường sai đúng một chi tiết. Đọc kỹ điều kiện và thứ tự trong đề. | "Common trap": the most obvious answer is usually wrong in one detail. Read the conditions and the order in the task carefully. |
| `drill:challenge` | `drill-brief` | Thử thách dài hơn: viết từng phần, bôi đen một câu SELECT bên trong rồi {mod}+Enter để chạy riêng nó. | A challenge is longer: write it part by part, select an inner SELECT and press {mod}+Enter to run just that part. |

#### G6 `diff`: lần đầu nộp sai mà có khung so kết quả (L84)

Ở drill, lượt ôn bằng drill và Thử ngay. Slot `diff` ngay dưới `diffView()` (pane work, hoặc dưới `detail` trong Thử ngay), không trên bảng kết quả. Linh vật của dòng phản hồi nhường chỗ.

| Slot | VI | EN |
|---|---|---|
| `diff` | Hai bảng nhỏ này so kết quả của bạn với đáp án: cột nào lệch, dòng nào thừa, dòng nào còn thiếu. Sửa từng chỗ rồi nộp lại. | These two small tables compare your result with the answer: which column is off, which rows are extra, which are missing. Fix one thing at a time, then submit again. |

#### G7 `practice` + `review`: Luyện SQL

| id · # | Slot | VI | EN |
|---|---|---|---|
| `practice` 1 | `practice-review` (dưới thẻ Ôn tập hôm nay) | Ôn tập hôm nay đưa lại những kỹ năng tới hạn. Đúng ngay lần nộp đầu, dùng tối đa một gợi ý, thì kỹ năng lên một mức nhớ và lần ôn kế tiếp cách xa hơn. | Today's review brings back the skills that are due. Right on the first submit with at most one hint, and the skill goes up one box; its next review comes further out. |
| `practice` 2 | `practice-hub` (dưới thẻ bài luyện) | Không có gì tới hạn thì luyện kỹ năng yếu nhất ở đây, hoặc làm tiếp bài đang dở. | Nothing due? Practise your weakest skill here, or finish a drill you started. |
| `review` | `drill-brief` (lượt ôn đầu tiên, dưới banner luyện tập) | Mỗi lượt ôn là một bài luyện của một kỹ năng tới hạn. Không tính XP; chỉ đổi mức nhớ. | Each review item is a drill for one skill that is due. No XP; only the box changes. |

`practice` 1 chỉ hiện khi thẻ có ít nhất một kỹ năng đã học; chưa có gì thì chỉ bước 2 (thẻ bài luyện đã nói "bắt đầu từ Phần 1").

#### G8 `adv`: lần đầu mở một bài nâng cao

| # | Slot | VI | EN |
|---|---|---|---|
| 1 | `adv-needs` (dưới "Cần trước") | Bài nâng cao dựa trên vài kỹ năng nền. Có ✓ là bạn đã học; chưa có thì bấm để xem trước, không bắt buộc. | An advanced topic builds on a few basic skills. A ✓ means you know it; if not, click to look first. It's optional. |
| 2 | `adv-drills` (dưới hàng bài luyện) | Mỗi bài có bài học riêng, vài bài luyện và một Thử thách cuối, +{xp} XP lần đầu đạt. | Each topic has its own lesson, a few drills and a final challenge: +{xp} XP the first time you pass it. |
| — | bài `external`, slot `adv-links` | Bài này học qua các link đọc thêm; link mở ở tab mới. | This one is learned through the reading links; they open in a new tab. |

### 2.4 Bảng linh vật theo vùng khi có dấu

| Trang/vùng | Linh vật sẵn có | Khi dấu Boon ở đây |
|---|---|---|
| Lộ trình, `teach` | Cảnh dạy học (Boon + Lily) | Bước 1 không Boon riêng (nói từ cảnh); bước 2–3 ở vùng khác có Boon `point` |
| Trang Phần | Hình glyph (không linh vật) | Dấu có Boon |
| Hộp thoại bài học | Boon ở tiêu đề thẻ | Tiêu đề dùng icon kỹ năng |
| Bàn luyện, pane trái | Boon `think` cạnh gợi ý | Gợi ý không Boon (dấu đã có) |
| Bàn luyện, pane work | Linh vật dòng phản hồi (Lily cheer / Boon think, oops) | Dòng phản hồi không linh vật |
| Luyện SQL | Không | Dấu có Boon |

---

## 3. Phần B: Gợi ý → Boon chỉ đường → điền khung vào editor

### 3.1 Flow (mọi bài)

1. Bấm **"Gợi ý i/n"**: khối gợi ý đổi từ Boon `think` + danh sách sang **Boon `point`** (40–48 px, hướng về phía editor) + **bong bóng `bg-sun`** chứa gợi ý mới nhất; các gợi ý trước nằm phía trên dạng danh sách nhỏ. Không đổi nội dung gợi ý.
2. Ngay khi gợi ý **nêu lệnh** đã hiện (bảng dưới), bong bóng có thêm nút **"Điền khung vào editor"** và một dòng giá (§3.6).

| Loại bài | Gợi ý nêu lệnh | Lời Boon trong bong bóng |
|---|---|---|
| Story, làn, E-com, đánh giá thăng tiến | Gợi ý 2 (problem-design §1.5: "bảng, cột, mệnh đề cần dùng") | Gợi ý 2 viết tay, như hiện nay |
| Drill (`sql.yml`, `adv.yml`), lượt ôn bằng drill | Gợi ý duy nhất (`hint`) | `hint` viết tay |
| Ticket story chơi lại trong Luyện tập | Gợi ý 2 | như story |
| Thử ngay (bài học nhanh) | Không có gợi ý: nút **"Boon chỉ"** cạnh "Chạy thử" | Câu chung `hint.tryFrame`: "Câu ví dụ phía trên dùng đúng lệnh bài này cần. Mình điền khung, bạn điền tên cột và giá trị theo đề." (không cần nội dung mới) |

3. Bấm điền:
   - Editor **trống**, **bằng starter**, hoặc **bằng khung vừa điền** → thay ngay.
   - Editor có câu của người học → bong bóng hỏi tại chỗ (không modal): *"Editor đang có câu của bạn. Thay bằng khung? Câu cũ lấy lại được bằng Hoàn tác ({mod}+Z)."* · **Thay bằng khung** · **Giữ câu của mình**.
4. Thay = **một giao dịch** `setValue` (đã là một bước hoàn tác trong history của `basicSetup`), chọn sẵn `___` đầu tiên (gõ là đè), focus editor; điện thoại: `showPane('work')`. Dòng phản hồi dưới nút: Boon `point` nhỏ + *"Mình điền khung rồi: còn {n} chỗ ___ cho tên cột và giá trị. Gõ đè lên chỗ đang chọn."* + nút **Hoàn tác** (gọi `undo` của CodeMirror). `announce()` đọc câu đó.
5. Bản nháp lưu như mọi lần gõ (`onChange` → `writeDraft`); không ghi lịch sử (không phải lần chạy).
6. Nộp khi còn `___` → bị chặn, không tính sai (§3.8). Chạy khi còn `___` → Postgres báo `column "___" does not exist`; Boon giải thích (§3.8).
7. Đã trả giá rồi thì nút vẫn ở đó: điền lại miễn phí.

**Ô Thử ngay** là `<textarea>`, không phải CodeMirror: thay `value` mất undo gốc, nên giữ câu cũ trong bộ nhớ và hiện nút **Hoàn tác** (một mức) tới lần sửa tiếp theo. Bài nâng cao mở ô bằng starter dài: starter chưa sửa tính như ô trống (thay ngay).

### 3.2 Khung lấy từ đâu: tự sinh từ Solution

| Phương án | Ưu | Nhược |
|---|---|---|
| Dùng nguyên gợi ý 3 viết tay (`...` → `___`) | Không mã mới | 103/108 ticket có gợi ý 3 là một đoạn code, nhưng **5 là câu chữ** (`ch12-02`, `ecom-ch5-02`, `ausyd/s-1`, `s-2`, `nlrtm/r-3`), **7 không có `...`** (đáp án đầy đủ của một bước hoặc một đoạn: `ch2-05`, `ch5-02`, `ch10-02`, `ch11-03`, `ch11-04`, `ecom-ch6-02`, `ecom-ch6-05`), phần lớn ghi sẵn tên cột; drill và Thử ngay **không có** gợi ý 3. |
| Viết tay trường `frame:` cho mọi bài | Kiểm soát từng câu | ~370 câu (117 Solution story + 194 drill + 58 Thử ngay), lệch dần khi sửa Solution |
| **Tự sinh từ Solution của bước đang mở** (đã áp biến thể) | 0 nội dung mới; một hàm, một bộ test; luôn khớp Solution | Câu hiếm có thể khó đọc → test bắt, khi đó mới thêm ngoại lệ |

**Chọn tự sinh** (D-H2). Gợi ý 3 viết tay vẫn hiện như cũ trong danh sách khi người học đã mở nó; editor nhận khung tự sinh. Không thêm trường `frame:` cho tới khi test chỉ ra một bài cần (YAGNI).

### 3.3 Luật sinh khung (`frameOf(sql, trapWrongs?)`, `src/frame.ts`, thuần)

Tách token đơn giản (chuỗi `'…'`, số, định danh, `"…"`, toán tử, dấu câu; bỏ comment):

| Giữ nguyên | Thành `___` |
|---|---|
| Từ khóa SQL (SELECT, DISTINCT, FROM, các loại JOIN, ON, WHERE, GROUP BY, HAVING, ORDER BY, LIMIT, WITH, AS, CASE…END, AND/OR/NOT, IS NULL, IN, BETWEEN, LIKE, EXISTS, OVER, PARTITION BY, FILTER, INTERVAL, DATE…) | Tên cột (đứng riêng, hoặc sau `x.` → `x.___`) |
| Tên hàm (định danh đứng ngay trước `(`: `count`, `round`, `LAG`, `generate_series`…), ép kiểu `::date` | Bí danh cột (`AS revenue` → `AS ___`) |
| Tên bảng sau FROM/JOIN và bí danh bảng (`orders o`), tên CTE | Mọi giá trị: chuỗi, số, `true`/`false` |
| Toán tử, ngoặc, dấu phẩy, `*` | Mỗi mục của `GROUP BY`/`ORDER BY`/`PARTITION BY` = **một** `___` (che luôn ASC/DESC) |

Rồi gộp `___` liền nhau và xuống dòng **theo độ sâu ngoặc** ngay trong `frameOf` (câu > 60 ký tự, L88): mỗi mệnh đề cấp ngoài một dòng, truy vấn con và thân CTE thụt 2 khoảng mỗi mức. **Không dùng sql-formatter**: đã chạy bản pin 15.9.0 trên 5 khung ở §3.4, không lỗi, nhưng nó in `c .___` (cách trước dấu chấm, vì `___` không được coi là tên cột) và đặt mỗi từ khóa một dòng riêng, khác kiểu L88.

**Bài bẫy (`kind: trap`):** mệnh đề nào của Solution khác mệnh đề đó trong câu `wrong:` thì gộp cả thân mệnh đề thành một `___` (`WHERE ___`), để khung không lộ đúng chi tiết bẫy (D-H3). Mệnh đề có trong Solution mà câu sai thiếu (ví dụ `ORDER BY` trước `LIMIT`) vẫn giữ từ khóa: đó là "lệnh", đúng ý user.

**Khung cố ý lộ lệnh.** User muốn "gợi ý nói dùng lệnh gì thì chỉ điền phần còn lại", nên hàm, mệnh đề và cấu trúc lồng **được** giữ (ví dụ `round(avg(___)), max(___)` ở `g-aggregate-2`). Khung chỉ giấu **tên và giá trị**: cột, bí danh, hằng, chiều sắp xếp.

**Số đo bản thử** (luật trên, chạy trên nội dung thật):

| Tập | Số câu | Khung có ≥ 2 `___` | Ghi chú |
|---|---|---|---|
| Solution story + E-com + làn (mọi bước) | 117 | 117 | |
| Drill kỹ năng + nâng cao (faded/open/challenge) | 136 | 135 | `g-distinct-1` 1 chỗ, nhưng drill faded dùng starter (§3.7) |
| Drill bẫy (sau luật gộp mệnh đề) | 58 | ~52 (ước: bản thử tách mệnh đề bằng regex phẳng, chưa theo độ sâu) | 6 còn 1 chỗ (`g-select-3`, `g-aggregate-3`, `g-date-math-3`, `g-case-when-3`, `g-explain-read-3`, `g-a7-3`), vẫn là khung (giữ bảng, mệnh đề) và vẫn được điền: "mọi bài" |
| Thử ngay (kỹ năng + nâng cao) | 58 | 57 | `try:distinct` 1 chỗ |

Bản thử cũng cho thấy hai lỗi cần sửa khi build: xuống dòng phải theo độ sâu (truy vấn con, CTE), và `true`/`false` phải thành `___` (đã đưa vào bảng luật).

### 3.4 Ví dụ trên bài thật

Token của mỗi khung là đầu ra của bản thử luật §3.3 trên Solution thật; xuống dòng theo luật độ sâu (chưa có mã, sắp tay đúng luật).

**(1) Story chương 1, `ch1-02`** (gợi ý 2 đã nói `region`, `kind`, `AND`):

```sql
-- Solution
SELECT code, name, country FROM ports WHERE region = 'Europe' AND kind = 'SEAPORT'
-- Khung
SELECT ___, ___, ___
FROM ports
WHERE ___ = ___ AND ___ = ___
```

**(2) Story chương 7, `ch7-02`** (truy vấn con trong `IN`; cho thấy cần định dạng theo độ sâu):

```sql
SELECT c.___, count(*)
FROM quotations q
JOIN customers c ON c.___ = q.___
WHERE q.___ >= ___ AND q.___ < ___
  AND q.___ IN (
    SELECT ___
    FROM shipments
    WHERE ___ >= ___ AND ___ < ___
    GROUP BY ___
    HAVING count(*) > ___
  )
GROUP BY ___, ___
ORDER BY ___, ___
```

**(3) Drill bẫy `g-where-3`** (bẫy là thiếu ngoặc quanh OR):

```sql
-- Solution
SELECT id, store_id FROM orders WHERE channel = 'ONLINE' AND (store_id = 1 OR store_id = 2)
-- Khung theo luật chung (lộ ngoặc = lộ bẫy):  WHERE ___ = ___ AND (___ = ___ OR ___ = ___)
-- Khung bài bẫy (WHERE khác câu wrong: nên gộp):
SELECT ___, ___
FROM orders
WHERE ___
```

**(4) Thử thách nâng cao `g-a3-4`** (trục ngày):

```sql
WITH spine AS (
  SELECT s.___ AS ___, g.___
  FROM stores s
  CROSS JOIN generate_series(DATE ___, DATE ___, INTERVAL ___) AS g (___)
), per_day AS (
  SELECT sp.___, sp.___, count(o.___) AS ___
  FROM spine sp
  LEFT JOIN orders o ON o.___ = sp.___ AND o.___ = sp.___ AND o.___ = ___
  GROUP BY ___, ___
)
SELECT ___, count(*) FILTER (WHERE ___ = ___)
FROM per_day
GROUP BY ___
ORDER BY ___
```

**(5) Thử ngay `where`**: `SELECT ___, ___ FROM staff WHERE ___ = ___ AND ___ = ___` (đề đã nêu `name`, `role`, `store_id` 3, `Cashier`: người học chỉ ghép).

### 3.5 Editor đang có SQL

| Trạng thái editor | Hành động |
|---|---|
| Trống / chỉ khoảng trắng | Thay ngay |
| Bằng `starter` của bài | Thay ngay |
| Bằng khung vừa điền (chưa sửa) | Không làm gì, chọn lại `___` đầu |
| Khác (câu của người học, hoặc câu bước trước ở đánh giá thăng tiến theo L67) | Hỏi tại chỗ (§3.1 bước 3) |
| Sau khi thay | {mod}+Z hoặc nút Hoàn tác trả câu cũ (một bước history) |

Không bao giờ ghép khung vào giữa câu cũ (khó đoán, khó hoàn tác).

### 3.6 Giá (theo luật hiện hành)

Luật đang có: chương 1 gợi ý miễn phí (L54, `FREE_HINT_CHAPTER`, áp cả E-com chương 1 vì `xpFor` theo `ticket.chapter`); chương khác −25 % mỗi gợi ý, tối đa 3; việc phụ làn XP cố định (`LANE_XP`); Luyện tập và drill ôn 0 XP; `isSuccess` = không nộp sai và ≤ 1 gợi ý.

| Nơi | Lưu ở đâu | "Điền khung" tính như | Dòng giá trong bong bóng |
|---|---|---|---|
| Story, E-com (chương ≥ 2), đánh giá thăng tiến | `save.hintsUsed[id]` | Mở tới gợi ý 3 (`useHint` tới n): đang ở gợi ý 2 → thêm một gợi ý (−25 %); đã mở 3 → miễn phí. Gợi ý 3 viết tay hiện luôn trong danh sách. | "Mở luôn gợi ý 3 (−{cost} XP)" |
| Story/E-com chương 1, việc phụ làn | như trên | Như trên nhưng giá 0 | "Miễn phí" |
| Ticket story chơi lại trong Luyện tập | `run.hints` (bộ nhớ) | Lên 3 gợi ý → lượt đó "đúng chưa đạt" (không lên mức nhớ) | "Lượt này sẽ không lên mức nhớ" |
| Drill (bàn luyện) | **session mode** `{ kind: 'drill', framed: true }`, không vào Save | Lần đạt đó là "đạt yếu": XP lần đầu (+10/+20) giữ nguyên, thẻ Leitner không lên (như `isSuccess` sai). Lần chơi lại sau sạch. | "Lần đạt này không lên mức nhớ" |
| Lượt ôn bằng drill | `run.hints` | +1 gợi ý (thành 2) → đạt yếu | như trên |
| Thử ngay | không | Miễn phí, không lưu gì | (không có dòng giá) |

Vì sao drill không ghi vào `save.hintsUsed`: ô đó được lưu, nên "điền khung = gợi ý thứ 2" sẽ làm **mọi** lần chơi lại drill đó về sau đều là đạt yếu và kéo thẻ kỹ năng xuống: phạt chính tính năng user yêu cầu (D-H4). Giới hạn đã biết: tải lại trang giữa chừng làm mất cờ `framed`, lần đạt đó tính là sạch (0 XP thêm, chỉ ảnh hưởng một bước Leitner).

**Đánh giá thăng tiến:** gợi ý và `hintsUsed` tính **theo ticket**, khung tính **theo bước**: trả giá gợi ý 3 một lần, sau đó điền được ở mọi bước không phải lab (D-H5). Bước 2+ mở bằng SQL đạt ở bước trước (L67), nên luôn qua câu hỏi "Thay bằng khung?".

### 3.7 Trường hợp riêng

| Trường hợp | Quyết định |
|---|---|
| **Bước lab chỉ mục** (`lab:`, chương 11) | **Không** điền khung: câu trả lời là một `CREATE INDEX` ngắn, khung = đáp án. Bong bóng nói: "Bước này chỉ cần một câu CREATE INDEX, nên mình không điền khung." Bước `plan:` (đọc qua chỉ mục) vẫn điền bình thường. |
| **Bài `format: faded`** (story, drill faded) | Starter **là** khung. Nút đổi thành **"Đặt lại khung ban đầu"** (điền lại starter), miễn phí, có từ gợi ý 1. Không sinh khung mới (gợi ý 3 của bài faded là phần điền vào chỗ trống, tức đáp án). |
| **Sandbox** | Không có gợi ý, không có nút. |
| **Gợi ý cuối của drill** | Drill chỉ có một gợi ý: sau nó nút điền hiện luôn. |

### 3.8 Chặn `___` khi Nộp

Hiện nay `work.ts` chỉ đếm `___` khi `tk.format === 'faded'` (vì `___` trong `LIKE '___'` là mẫu hợp lệ). Với khung, mọi bài đều có thể chứa `___`, và bản nháp có `___` sống qua lần tải lại, nên luật phải **không cần trạng thái**:

- `blanksIn(sql, faded)` (`src/tickets.ts`, cạnh `BLANK`): bài `format: faded` giữ cách đếm cũ (**mọi** `___`, kể cả trong chuỗi), vì starter faded có chỗ trống nằm trong nháy (`ch6-02`: `WHERE r.cargo_desc ___ '___'`); mọi bài khác đếm token `___` **đứng riêng, ngoài chuỗi `'…'`, `"…"` và comment** (khung tự sinh không bao giờ đặt `___` trong nháy vì cả chuỗi thành một `___`). Áp cho **mọi** Nộp (story, làn, E-com, drill, ôn) và nút "Kiểm câu trả lời" của Thử ngay. Còn chỗ trống → `work.blanks` như hiện nay, không chấm, không tính nộp sai, không gọi `onWrong` (D-H7).
- `LIKE '___'` không bị đếm (trong chuỗi).
- **Chạy** vẫn chạy (chạy một phần đã điền là có ích). Lỗi Postgres tùy chỗ trống (`column "___" does not exist`, `function ___ does not exist` với `___(*)` ở `g-aggregate-1`, lỗi cú pháp với `DATE ___`), nên Boon **không đoán theo thông điệp**: khi lần chạy lỗi và `blanksIn(câu đã chạy) > 0`, lời Boon dưới nút thay ghi chú SQLSTATE bằng: *"Còn chỗ trống ___ trong câu: Postgres tưởng đó là tên cột. Điền vào rồi chạy lại."* / *"There is still a ___ blank: Postgres reads it as a column name. Fill it in and run again."*

### 3.9 Chi phí nội dung và test

- **Nội dung: 0 ticket, 0 drill, 0 bài học phải sửa.** Chữ mới: ~10 khóa ở `vi.ts`/`en.ts` (nút điền, câu hỏi thay, đã điền, Hoàn tác, dòng giá ×4, lab, Thử ngay, lỗi `___`) và ~30 câu hướng dẫn ở `src/i18n/learn.ts`.
- **`tests/frame.test.ts`** (Node, toàn bộ nội dung, mọi biến thể):
  1. Khung ≠ Solution và có ≥ 1 `___`; với bài không phải bẫy và không phải câu một chỗ đã liệt kê: ≥ 2.
  2. **Không lộ**: không chuỗi/số/`true`/`false` nào của Solution còn trong khung; mọi định danh còn lại là từ khóa, tên hàm, bảng, bí danh bảng hoặc tên CTE của Solution.
  3. **Đi vòng**: điền lại từng `___` bằng token đã bỏ (theo thứ tự) cho ra đúng chuỗi token của Solution, và câu đó qua `grade()` trên PGlite thật (bỏ qua mục danh sách gộp và mệnh đề bẫy đã gộp, kiểm riêng là token bị bỏ đúng là thân mệnh đề).
  4. `blanksIn(khung) > 0`, nên Nộp ngay khung luôn bị chặn.
  5. Bài bẫy: mọi mệnh đề có ở cả Solution lẫn câu `wrong:` mà khác nhau đều đã gộp thành một `___` (mệnh đề câu sai thiếu hẳn thì giữ từ khóa, §3.3).
  6. Xuống dòng theo độ sâu: mỗi dòng có ngoặc cân bằng với mức thụt; ảnh chụp chữ của 5 ví dụ §3.4.
- **`blanksIn`**: unit (`LIKE '___'` = 0, `___` = 1, trong comment = 0); content test: không Solution, `wrong:` hay starter không-faded nào có `___` đứng riêng.
- **`tests/sqlErrors.test.ts`** (hoặc test của `feedback`): chạy `SELECT ___ FROM products` và `SELECT ___(*) FROM orders` trên `lab`, cả hai lỗi, và lời Boon là ghi chú chỗ trống.
- **`tests/guides.test.ts`**: `parseGuides` (dữ liệu hỏng bị bỏ), `guideFor()` (off, `knows`, đã xem, đang có tour, chỉ khu General), mỗi slot trong bảng hướng dẫn có trong mã vẽ trang (danh sách tĩnh), `noDeadEnds` và `i18n` tự phủ chữ mới (EN không dấu, không "later", không "boss").
- **Kiểm tay** (Edge headless, hồ sơ mới, như L89/L92): "Chỉ học SQL" → G1 → Phần 1 → bài học → drill faded/open/trap → Ôn tập; Esc trong hộp thoại; điện thoại 375 px; reduced motion; hai theme. Story chương 2: gợi ý 2 → điền → Hoàn tác → Nộp còn `___`.

---

## 4. Phần C: Kế hoạch build (phác)

| Task | Nội dung | File chính | Cỡ | Phụ thuộc |
|---|---|---|---|---|
| T1 | `blanksIn` + chặn Nộp mọi bài + Thử ngay; mẫu lỗi `___` trong `sqlErrors`; content test | `src/tickets.ts`, `src/ui/work.ts`, `src/ui/lessonCard.ts`, `src/ui/sqlErrors.ts`, `vi/en.ts` | S | — |
| T2 | `frameOf()` thuần + luật bẫy + xuống dòng theo độ sâu; `tests/frame.test.ts` | `src/frame.ts` (chunk lazy mới), `scripts/check-budget.mjs` | M | — |
| T3 | Bong bóng gợi ý của Boon, nút điền + hỏi thay + Hoàn tác; `editor.undo()`, chọn `___` đầu; giá theo §3.6 (`useHint` tới n, cờ `framed` trong mode drill, `run.hints`); "Đặt lại khung" cho faded; nút "Boon chỉ" ở Thử ngay; lab không có nút | `src/ui/brief.ts` (`hints()`), `src/ui/work.ts` (`fillFrame`), `src/ui/editor.ts`, `src/session.ts`, `src/ui/drillBrief.ts`, `src/ui/lessonCard.ts` | M | T1, T2 |
| T4 | Bộ máy hướng dẫn: `boonMark()` tách từ `coach.ts`; `guideHooks` (slot) cho main; `src/guides.ts` thuần (pref, `guideFor`); `src/ui/guide.ts` trong `learnui`; luật Esc; `boonRegion()` | `src/ui/coach.ts`, `src/guides.ts`, `src/ui/guide.ts`, `src/storage.ts` | S–M | — |
| T5 | 8 hướng dẫn + slot + chữ; "Boon chỉ mình" mỗi trang; ⋯ "Bật lại hướng dẫn"; Lily reo khi xong G1 | `src/ui/learnView.ts`, `src/ui/drillBrief.ts`, `src/ui/lessonCard.ts` (hook), `src/ui/modes.ts`, `src/ui/homeView.ts`/`teachScene.ts`, `src/i18n/learn.ts` | M | T4 (T3 cho bước 4 của G4) |
| T6 | Đo ngân sách, kiểm tay §3.9, mục `review-log.md` + dòng `decision-log.md`, cập nhật `CLAUDE.md` (pref mới, luật `___`, chunk `frame`) | — | S | T1–T5 |

T1, T2, T4 chạy song song; tổng ~5–6 ngày agent.

**Ngân sách gzip:**

| Nhóm | Hiện | Sau v8 (ước) | Phần thêm |
|---|---|---|---|
| `main` | 285 / 290 | **~286,5–287** | bong bóng gợi ý + nút điền + hỏi thay (~0,4 KB), `fillFrame`/`blanksIn`/`undo` (~0,3), nút Thử ngay + hook hướng dẫn trong `lessonCard`/`homeView`/`modes` (~0,3), `boonMark` + `guideHooks` (~0,1), mẫu lỗi (~0,05), ~10 khóa VI (~0,3) |
| `frame` (mới) | — | ~1 / 3 | `frameOf` (tách token, luật bẫy, xuống dòng), tải khi bấm điền lần đầu (`import('../frame')`) |
| `learnui` | 6 / 25 | ~11 / 25 | bộ máy + 8 hướng dẫn + chữ VI/EN |
| `en` | — | +~0,3 | 10 khóa EN |

Mọi phần chỉ khu General dùng (hướng dẫn, chữ hướng dẫn) nằm trong `learnui`; main chỉ có điểm móc (slot rỗng) và flow gợi ý, vì flow gợi ý chạy cả ở story. Nếu đo main > 289 KB: chuyển dòng giá và câu hỏi thay sang chunk `frame` (tải cùng lúc bấm).

---

## 5. Phần D: Quyết định cho user (mặc định in đậm)

- **D-G1.** Người chọn "Tôi đã biết SQL": hướng dẫn không tự hiện, "Boon chỉ mình" vẫn dùng được? **(có)**
- **D-G2.** Người đã bỏ tour ticket 1 (`coach-done`) vẫn thấy hướng dẫn Lộ trình? **(có: khác khu, mỗi cái ≤ 4 bước, tắt một chạm)**
- **D-G3.** Đóng hộp thoại bài học giữa hướng dẫn = đã xem (không hiện lại)? **(có; xem lại bằng "Boon chỉ mình")**
- **D-G4.** Giới thiệu Phần: bản đầy đủ chỉ ở Phần mở đầu tiên; Phần sau một bước, danh sách kỹ năng tự sinh, không viết 12 đoạn? **(có)**
- **D-H1.** Nút điền xuất hiện ngay sau gợi ý nêu lệnh (story gợi ý 2, drill gợi ý duy nhất) và tính giá như mở gợi ý 3? **(có)** · Khác: miễn phí ngay ở gợi ý 2 (gợi ý 3 mất giá trị).
- **D-H2.** Khung tự sinh từ Solution, không dùng gợi ý 3 viết tay, chưa thêm trường `frame:`? **(có)**
- **D-H3.** Bài bẫy: gộp mệnh đề khác câu `wrong:` thành một `___`? **(có)** · Khác: cùng luật như bài khác (lộ bẫy), hoặc không điền ở bài bẫy (trái "mọi bài").
- **D-H4.** Drill: điền khung làm lần đạt đó thành "đạt yếu", ghi ở session, không vào `save.hintsUsed`? **(có)** · Khác: không ảnh hưởng gì (Ôn tập kém tin cậy hơn).
- **D-H5.** Đánh giá thăng tiến: điền được ở mọi bước không phải lab, trả giá gợi ý 3 một lần cho cả bài? **(có)** · Khác: chỉ bước 1, hoặc không cho trong đánh giá.
- **D-H6.** Bước lab chỉ mục không có nút điền? **(có)**
- **D-H7.** Chặn Nộp khi còn `___` đứng riêng ở mọi bài (không chỉ faded)? **(có)**
- **D-H8.** Phím Tab nhảy tới `___` kế tiếp? **(không; chọn sẵn chỗ đầu và gõ đè là đủ, thêm khi người chơi thử đòi)**
- **D-B1.** Main tăng ~1,5 KB (285 → ~287 / 290), không xin nâng trần? **(có)**

---

## 6. Rủi ro

| Rủi ro | Giảm thiểu |
|---|---|
| Khung làm bài quá dễ, người học điền khung ngay từ đầu | Chỉ mở sau gợi ý nêu lệnh; có giá (XP hoặc mức nhớ); Thử ngay miễn phí vì 0 XP |
| Khung tự sinh khó đọc ở câu lạ | Test đi vòng + không lộ trên mọi bài; xuống dòng theo độ sâu; ngoại lệ chỉ thêm khi test chỉ ra |
| Hướng dẫn thành phiền | Mỗi cái ≤ 4 bước, một lần; Bỏ qua/Esc/Tắt; không tự hiện cho `knows` |
| Hai Boon cùng vùng | `boonRegion()` dùng chung cho tour, hướng dẫn, gợi ý; bảng §2.4 |
| Main vượt 290 | Đo ở T3; phương án dời chữ sang chunk `frame` |
| `___` đứng riêng trong nội dung tương lai | Content test của T1 |
