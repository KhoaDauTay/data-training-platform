# Cargo Query — Plan 6: Bài học nhanh ch1–3, nội dung ch1–3 và gợi ý miễn phí chương 1 (v7 P0 + P1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Làm phần đã duyệt ở L54 ("Duyệt V7" = mọi khuyến nghị của `docs/team/product-design-v4.md`, trừ D-C3). Chỉ P0 + P1:
- **Gợi ý miễn phí trong cả chương 1** (mọi việc ch1, mọi bậc, L54). Chương khác giữ 25%/bậc.
- **P0 · Nội dung ch1–3** (§E.1, §E.2, §E.4):
  - `reflect` cho 12 việc thường; `faded` cho ch1-02, ch2-02, ch3-02; 12 mục `wrong:`.
  - Cụm tín hiệu (cue) trong đề; gợi ý bậc 1 gọi tên khái niệm.
  - Nhãn kỹ năng có từ khóa: "Lọc dòng (WHERE)"…
- **P1 · Bài học nhanh** (§C) cho 11 kỹ năng ch1–3, VI + EN đầy đủ:
  - Khái niệm, cú pháp, ví dụ chạy được, lỗi hay gặp, dấu hiệu trong đề.
  - "Thử ngay" chấm bằng grader sẵn có, 0 XP; đọc thêm PostgreSQL docs.
  - Thẻ nằm trong brief, trước Yêu cầu.
  - Chip "Kỹ năng mới / Cần dùng" bấm được, mở bài học trong hộp thoại; Sổ tay cho đọc trước.
- **Xem giá trị trước (§C.4-4):** tab Cột và trang Dữ liệu hiện giá trị của cột chữ có ≤ 20 giá trị khác nhau.

**Ngoài phạm vi (không làm):**
- P2 onboarding: chờ IA domain mới (L54, L55).
- P3 lộ trình, P4 bài học ch4–12.
- Mọi đổi nav/route; đổi tên nền tảng (`product-design-v5.md`, do agent khác viết; plan này không chạm file đó).

**Architecture:**
- **Bài học:**
  - Nội dung ở `content/lessons.yml`, là chunk lazy riêng `src/lessonSources.ts` (nhóm ngân sách `lessons`).
  - `loadContent()` tải cùng ticket. `parseLessons` / `cueIn` / pref thiết bị nằm ở `src/lessons.ts` (thuần, có test).
  - UI ở `src/ui/lessonCard.ts`: `lessonSlot()` cho brief, `openLesson()` cho chip và Sổ tay, `<dialog id="lesson-dialog">`.
- **Giá trị cột:**
  - `distinctValuesSql` / `toDistinctValues` (`src/viz/erd.ts`): một câu mỗi bảng.
  - `textValues(table)` (`src/state.ts`, `memoByKey`): mỗi phiên một lần.
  - `valuesLine` (`src/ui/erdView.ts`) dùng chung cho tab Cột và trang Dữ liệu.
- **Gợi ý miễn phí:** chỉ sửa `xpFor` (`FREE_HINT_CHAPTER = 1`); `main.ts`, `overview.ts`, Recap và nút Gợi ý đều đi qua nó.
- **Không tăng `SAVE_VERSION`** (vẫn 3).

**Tech Stack:** như HEAD. **Không thêm dependency.**

**Spec / nguồn quyết định:**
- `docs/team/product-design-v4.md` §C (bài học nhanh), §E (nội dung), §F.3 (save), §G (D-C1..D-C7, D-F1).
- `docs/team/decision-log.md` L54 (dòng mới thắng; L55 giữ main 270 KB).
- `docs/team/glossary-vi.md` (nhãn, thuật ngữ).
- Plan mẫu: `docs/superpowers/plans/2026-11-17-cargo-query-plan-5-dashboard-lanes.md`.
- Quyết định mới: U1–U12 (dưới).

**Tiền đề:**
- Plan 1–5 và các bản sửa sau đó đã xong.
- Plan viết và replay trên HEAD `4c84973` (tsc sạch, 1472 test xanh).
- Các commit sau đó (`9cd87fd` L55, `789e266` product-design-v5, `6d6768e` L56) chỉ thêm tài liệu (`decision-log.md`, `product-design-v5.md`): không khối nào của plan chạm tới.

## Đã có trên HEAD (không làm lại)

| Hạng mục | Trạng thái HEAD |
|---|---|
| `reflect`, `wrong:`, `format: faded/worked`, `## Example` (parser `src/tickets.ts`, Recap `reflectCard`, `wrongTipper`, chặn Nộp khi còn `___`) | Có, chỉ dùng từ ch4. Plan này chỉ thêm nội dung ch1–3 và mở rộng test. |
| Chip "Dạy / Cần" (`skillChips`, `src/ui/chapterView.ts`) | Có, không bấm được. Plan này đổi nhãn và biến chip có bài học thành nút. |
| Tab Cột (`registerSchemaTabs`, `src/ui/vizTabs.ts`), trang Dữ liệu (`drawColumns`, `src/ui/dataView.ts`), `erMeta` | Có. Plan này thêm một dòng giá trị dưới tên cột. |
| `grade()` (`src/grader.ts`), `gradeMessage`/`errorView` (`src/ui/feedback.ts`), `renderResult` | Có. "Thử ngay" và "Chạy ví dụ" dùng lại nguyên. |
| Pref thiết bị (`readJson`/`writeJson`, `src/storage.ts`) | Có. Thêm khóa `cargo-query/lessons`. |

## Quyết định của plan này (U1–U12, để orchestrator ghi L-số)

**Chỗ lệch so với thiết kế, cần orchestrator/user xem trước:**
- **U2:** bài học ở file mới `content/lessons.yml`, không phải trường mới trong `skills.yml` (§C.5 ghi "không file mới").
- **U3:** ngân sách main còn ~1,5 KB.
- **U5:** "gợi ý miễn phí" = mọi bậc ở mọi việc ch1.
- **U8:** Thử ngay đạt không tự thu gọn thẻ ngay.

| # | Quyết định | Lý do |
|---|---|---|
| U1 | **Gợi ý miễn phí trong cả chương 1.**<br>• `xpFor` không trừ gợi ý khi `ticket.chapter === FREE_HINT_CHAPTER` (1).<br>• Nút Gợi ý không ghi "−x XP" khi giá bằng 0.<br>• Coach mark `coach.hints` nói rõ luật mới.<br>• Save cũ đã dùng gợi ý ở ch1: XP chương 1 tính lại (Tổng kết chương) sẽ cao hơn tổng `xp` đã lưu. Không migrate. | L54. `main.ts`, `overview.ts`, Recap và nút đều gọi `xpFor`, nên sửa một chỗ là đủ. |
| U2 | **Bài học ở `content/lessons.yml`, chunk lazy riêng `lessonSources` (nhóm ngân sách `lessons` 20 KB).**<br>• Nhãn kỹ năng vẫn ở `skills.yml`.<br>• Đo: 11 bài = 27,5 KB thô, **8,3 KB gzip** (~0,75 KB/bài).<br>• Để trong `skills.yml` (import `?raw` vào main) thì main ~275/270.<br>• Để trong chunk ticket thì `tickets` 112/110.<br>• Tách riêng: main 267, tickets 104, lessons 8.<br>• P4 (38 bài) ước ~28 KB: lúc đó nâng nhóm `lessons` lên 30. **Cần user xem.** | §C.5 muốn "không file mới" nhưng F.2/R1 muốn bài học ở chunk lazy. Hai yêu cầu chỉ cùng đúng khi tách file. |
| U3 | **UI bài học nằm trong main, không lazy.**<br>• Thử `import()` riêng cho `lessonCard.ts`: Rolldown kéo `feedback`/`grader`/`state` ra một chunk dùng chung 79 KB preload tĩnh, nên main thật vượt 270.<br>• Main sau plan: **268,5 / 270 KB**.<br>• Việc kế tiếp có code UI cần dời chỗ (vd. nạp trang Dữ liệu lười bằng tiêm phụ thuộc) hoặc nâng trần. **Cần user xem.** | L55 giữ trần 270. Đo trên build, không ước lượng. |
| U4 | **Thứ tự gợi ý: khái niệm → cú pháp → gần đáp án** (D-C6).<br>• Viết lại gợi ý 1 của 12 việc thường ch1–3: mở bằng "Đây là bài …", nhắc tên Bài học nhanh.<br>• Gợi ý 2–3 giữ nguyên.<br>• `problem-design.md` §1.5 thêm một đoạn sửa đổi.<br>• Gợi ý 1 không có liên kết bấm được (gợi ý là văn bản thuần, `richText`): chip kỹ năng ngay trên đầu là lối mở lại. | D-C6, §C.4-3. Không đổi parser. |
| U5 | **"Gợi ý miễn phí ở chương 1" áp cho mọi bậc**, không chỉ bậc 1. | User viết "gợi ý là miễn phí ở chương 1 không phải bài 1": sửa *phạm vi* của D-C3 (cả chương thay vì việc 1), không giới hạn bậc. **Cần user xem** nếu ý là chỉ bậc 1. |
| U6 | **Nội dung ch1–3 (P0).**<br>• `reflect` ở 12 việc thường.<br>• `format: faded` ở ch1-02 (§E.4 nguyên văn), ch2-02 (`AND ___`, `GROUP BY ___`), ch3-02 (hai `ON ___`).<br>• 12 `wrong:`: ch1-01, ch1-02 ×2, ch1-03 ×2, ch2-01, ch2-02, ch2-03, ch3-01, ch3-02 ×2, ch3-03.<br>• Cue: ch1-01 "Thứ tự dòng không quan trọng"; ch1-02 viết lại; ch1-04 "chỉ những người thuộc phòng Hải quan"; ch3-01 "Tên khách nằm ở hồ sơ khách hàng".<br>• Teach ch1–3 không thêm `## Example` (D-C4). D-C5: ch1-03 giữ một việc, hai bài học xếp chồng. | Đã chạy trên PGlite, câu sai khác Solution ở mọi biến thể. Ba ứng viên **bị loại** vì trùng Solution:<br>• ch1-03 "bỏ lô hủy" (tháng 05/2026);<br>• ch2-03 `>=` thay `>` (cả 3 biến thể);<br>• ch3-03 "quên điều kiện ngày" (ra 0 dòng: không khách nào chưa từng booking).<br>Thay bằng: xếp tăng dần / lọc theo ETD; bỏ lô hủy; khách có booking trước 01/03. |
| U7 | **Luật test mới** (`tests/content.test.ts`, `tests/lessons.test.ts`).<br>• Mọi chương: `reflect` cho việc thường; đúng một `faded` = việc develop đầu tiên; `wrong:` chạy được và khác Solution ở mọi biến thể.<br>• Từ ch4: teach là `worked`; luật ≥ 3 biến thể.<br>• Bài học: mọi kỹ năng ch1–3 có bài; ví dụ và lời giải Thử ngay khác Solution việc mở kỹ năng (mọi biến thể); chỉ dùng bảng đã mở; câu mở đầu Thử ngay chưa đạt; câu sai báo lỗi hoặc khác ví dụ; ≥ 3 cue mỗi ngôn ngữ và việc mở kỹ năng dùng ≥ 1 cue; code span VI = EN; EN không dấu; khái niệm ≤ 60 từ, giải thích ≤ 90 từ. | §C.5, §E.1. `cueIn`: các đoạn giữa "…" xuất hiện theo thứ tự trong **một câu**, không phân biệt hoa thường. Cách này đủ chặt để "từ … đến …" không khớp xuyên câu. |
| U8 | **Hành vi thẻ bài học.**<br>• Thẻ đầu chưa xem mở sẵn, các thẻ khác một dòng "Bài học nhanh: X ✓ · Mở lại".<br>• "Đã hiểu ✓" đánh dấu đã xem và thu gọn (thẻ hai mở ra). "Thu gọn" chỉ thu gọn.<br>• Thử ngay đạt: đánh dấu đã xem + đã thử, hiện "Đúng rồi!", **giữ thẻ mở** tới lần vẽ lại sau.<br>• Chỉ hiện ở việc chính chưa xong (story); Luyện tập, bài tuyến, việc đã xong chỉ có chip.<br>• Nháp Thử ngay, kết quả ví dụ, đóng/mở giữ theo phiên (Map trong module), không đụng `app.lastRun`, nháp, lịch sử hay XP. | Thu gọn ngay khi đạt làm mất phản hồi ✓. |
| U9 | **Pref thiết bị `cargo-query/lessons` = `{ seen, tried }`** (D-F1).<br>• Đọc qua `readJson`, mục hỏng bị bỏ.<br>• Ghi lỗi (storage bị chặn): thẻ vẫn thu gọn trong phiên (`seenNow`).<br>• Không vào Save, không theo Xuất/Nhập. | §F.3. Mất pref chỉ làm thẻ mở lại. |
| U10 | **Chip và Sổ tay.**<br>• Nhãn "Kỹ năng mới:" / "Cần dùng:" (EN "New skill:" / "Uses:").<br>• Chip của kỹ năng có bài học là `<button aria-haspopup="dialog">` mở `<dialog id="lesson-dialog">` (modal, Esc đóng, focus về chip); chip khác giữ `<span>`.<br>• Sổ tay: thẻ kỹ năng (đã học hay chưa) có nút "Bài học nhanh". | §C.3, D-C2. |
| U11 | **Nhãn có từ khóa:** `select` "Chọn cột (SELECT)", `where` "Lọc dòng (WHERE)", `order_by` "Sắp xếp (ORDER BY)", `limit` "Lấy top N (LIMIT)". | `glossary-vi.md` ghi "giữ" cho các nhãn này, nhưng v4 §E.1-6 (duyệt sau, L54) thêm từ khóa. Theo dòng mới hơn. |
| U12 | **Giá trị cột chữ.**<br>• Kiểu `text`/`character varying`/`character`; ≤ 20 giá trị (lấy `LIMIT 21` sau `DISTINCT`); bỏ NULL; sắp xếp.<br>• Một câu `UNION ALL` mỗi bảng, chỉ bảng game đã mở (bảng nhập ở Sandbox không có).<br>• Node: 22 bảng tổng ~50 ms; nặng nhất `shipments` 18 ms, `container_events` 13 ms.<br>• Không tô giá trị nào. | D-C7, §F.2. Test có ngưỡng 1 s cho mọi bảng ch12. |

**Dời lại:**
- "Đã biết SQL" ở màn chào (§C.6): cần màn chào P2.
- Nút bài học trên Lộ trình (§C.3, P3).
- Bài học ch4–12 (P4).
- Liên kết "Mở lại Bài học nhanh" bấm được bên trong gợi ý.

## Tên dùng từ HEAD (Task 0 kiểm bằng grep)

| File | Tên dùng trong plan này |
|---|---|
| `src/progress.ts` | `xpFor`, `SKILLS`, `bilingualOf`, `tablesUnlocked` |
| `src/content.ts` | `loadContent` (`import('./ticketSources'), import('./laneSources')`), `loadLanes` |
| `src/ui/brief.ts` | `hints(`, `renderBrief` (dòng `richText(x.body)`) |
| `src/ui/chapterView.ts` | `skillChips`, `skillLabel` |
| `src/ui/notebook.ts` | `toggleNotebook` (`learned.has(s.id)`) |
| `src/ui/vizTabs.ts` | `registerSchemaTabs` (tab `columns`) |
| `src/ui/dataView.ts` | `drawColumns` |
| `src/viz/erd.ts` | `IDENT`, `Related` |
| `src/state.ts` | `erMeta`, `memoByKey` |
| `tests/content.test.ts` | `describe('phương pháp học (Plan 2, từ chương 4)'` |
| `scripts/check-budget.mjs` | `GROUPS` (dòng `en`) |

**Cách đọc các bước sửa code** (như Plan 2–5):
- **Tạo `path`:** ghi cả file (file mới).
- **Ghi lại `path`** (ghi cả file): thay toàn bộ nội dung file có sẵn. Dùng cho ticket: đọc cả file dễ duyệt hơn nhiều khối nhỏ.
- **Sửa `path`** — thay: khối thứ nhất phải xuất hiện **đúng một lần**; thay bằng khối sau "bằng:".
- **Xóa `path`.**
- Khối "thay" không khớp (HEAD đã đổi): áp ý của bước vào code trên đĩa (L7) và ghi chỗ lệch vào mô tả commit.

## Global Constraints

- Mọi ràng buộc của các plan trước vẫn áp dụng:
  - PGlite **0.5.16** pin; không `innerHTML`.
  - Mọi chữ UI qua `t()`; khóa mới thêm vào **cả** `vi.ts` và `en.ts` trong cùng task.
  - Không dùng chữ "boss" trên UI hay trong nội dung (L22).
  - Không ghép class Tailwind bằng template literal (`tests/theme.test.ts`), dùng `cx()`.
  - Mọi bước "xác nhận PASS" chạy thêm `npx tsc --noEmit`.
- **Seed:** không đổi `schema.sql`/`seed.sql`. Ngày "hôm nay" 2026-10-31; SQL bài học dùng ngày cố định.
- **Save:** không đổi `SAVE_VERSION` (3), không đổi `Save`. Trạng thái bài học là pref thiết bị.
- **Đề bài** (problem-design §1, `tests/content.test.ts`):
  - Thân đề, Task và đề bước không có tên bảng/cột, từ khóa SQL viết hoa, mã trạng thái, backtick (luật SQLISH).
  - Cue là lời nghiệp vụ. Code span VI = EN; EN không dấu.
  - Gợi ý 1 gọi tên khái niệm bằng lời; nếu cần thì một từ khóa SQL, viết thường trong câu, không trong code span.
- **Bài học không lộ đáp án:** ví dụ và Thử ngay khác kết quả Solution của việc mở kỹ năng (có test, mọi biến thể).
- **Ngân sách:**
  - `main` ≤ 270 KB gzip (L55); chạy `npm run build && node scripts/check-budget.mjs` sau mỗi task có sửa `src/`.
  - Không thêm `import()` cho module UI dùng chung code main: Rolldown sẽ tách chunk dùng chung preload tĩnh (U3).
- **Kiểm thử:**
  - Logic thuần có test (`src/lessons.ts`, `src/viz/erd.ts`, `xpFor`).
  - DOM kiểm tay theo checklist Task 7 trên **Edge, cổng 5174** (không bao giờ `:5173`).
  - Không chạy hai `vitest` (hay `vitest` và `build`) song song: seed có thể chạm hạn 60 s.
- **Commit:**
  - Mỗi task một commit (bước cuối của task); chỉ `git add` đúng các file của task.
  - Mọi commit message kết thúc bằng dòng `Claude-Session: https://claude.ai/code/session_01PwPSBV1SVDP6quEZfKN56M`.

## File Structure

```
src/progress.ts                     FREE_HINT_CHAPTER, xpFor                                                (sửa)
src/ui/brief.ts                     nút Gợi ý không ghi giá khi 0; lessonSlot giữa tin nhắn và Yêu cầu       (sửa)
src/i18n/vi.ts, en.ts               coach.hints, chip.*, lesson.*, nb.lesson                                (sửa)
content/skills.yml                  nhãn select/where/order_by/limit có từ khóa                             (sửa)
content/tickets/ch1..ch3/*.md       12 việc thường: reflect, wrong, faded, cue, gợi ý 1                     (ghi lại)
content/TEMPLATE.md                 luật dạng bài / reflect / gợi ý cho mọi chương                          (sửa)
content/lessons.yml                 11 bài học nhanh VI + EN                                               (tạo)
src/lessons.ts                      Lesson, parseLessons, cueIn, loadLessonPrefs, markLesson               (tạo)
src/lessonSources.ts                chunk lazy của lessons.yml                                             (tạo)
src/content.ts                      loadLessons()                                                          (sửa)
src/ui/lessonCard.ts                thẻ bài học, lessonSlot, openLesson, hasLesson                         (tạo)
src/ui/chapterView.ts, notebook.ts  chip bấm được, nút "Bài học nhanh" trong Sổ tay                       (sửa)
index.html                          <dialog id="lesson-dialog">                                            (sửa)
src/viz/erd.ts                      TEXT_TYPES, VALUES_MAX, distinctValuesSql, toDistinctValues            (sửa)
src/state.ts                        textValues(table)                                                      (sửa)
src/ui/erdView.ts, vizTabs.ts, dataView.ts   valuesLine dưới tên cột                                       (sửa)
scripts/check-budget.mjs, check-deploy.sh    nhóm `lessons`, kiểm chunk lessonSources                      (sửa)
tests/progress, content, lessons, erd (.test.ts)
CLAUDE.md, docs/team/problem-design.md
```

## 11 bài học (đã chạy trên PGlite)

| Kỹ năng · việc mở | Ví dụ (dòng) | Thử ngay: yêu cầu → lời giải (dòng) | Lỗi hay gặp |
|---|---|---|---|
| `select` · ch1-01 | `SELECT name, mode FROM carriers` (9) | mã rồi tên hãng → `SELECT code, name FROM carriers` (9) | quên dấu phẩy (alias, 1 cột) |
| `where` · ch1-02 | cảng ở Vietnam (5) | sân bay ở Vietnam, `AND` (2) | nháy kép → lỗi 42703 |
| `order_by` · ch1-03 | cảng theo ngày đi giảm dần, phụ theo tên (24) | tăng dần (24, có chấm thứ tự) | quên `DESC` |
| `limit` · ch1-03 | 3 cảng xa nhất (3) | 6 cảng gần nhất, phụ theo mã: 5 cảng cùng 0 ngày nên tiêu chí phụ quyết định dòng 6 (6) | `LIMIT` không `ORDER BY` |
| `aggregate` · ch2-01 | số lô, TB, max trọng lượng hàng air (1) | số lô, tổng trọng lượng hàng biển (1) | cột thường + hàm gộp → 42803 |
| `group_by` · ch2-02 | số lô theo `incoterm` (8) | theo `incoterm`, `mode` (12) | thiếu cột trong `GROUP BY` → 42803 |
| `having` · ch2-03 | `incoterm` > 3.000 lô (3) | hãng > 2.900 lô (3) | hàm gộp trong `WHERE` → 42803 |
| `join` · ch3-01 | lô hôm nay + tên hãng, alias (25) | lô hôm nay + tên cảng đích (25) | `id` mơ hồ → 42702 |
| `multi_join` · ch3-02 | container → lô → khách, lô hôm nay (36) | thêm cảng đích, 4 bảng (36) | thiếu `ON` → lỗi cú pháp |
| `left_join` · ch3-03 | mọi cảng + lô hôm nay, điều kiện ở `ON` (34, 9 NULL) | mọi hãng + lô hôm nay (26) | điều kiện ở `WHERE` (25) |
| `anti_join` · ch3-03 | cảng không có lô hôm nay, `IS NULL` (9) | hãng không có lô hôm nay (1) | `= NULL` (0 dòng) |

---

### Task 0: Kiểm tiền đề (không sửa file)

- [ ] **Step 1: Test và kiểu đang sạch**

Run: `npm test && npx tsc --noEmit`
Expected: mọi test PASS (1472 trên `4c84973`), `tsc` không lỗi.

- [ ] **Step 2: Grep các điểm neo**

Run:
```bash
for p in "export function xpFor(ticket: Ticket, hintsUsed: number): number {" "'chip.teachesLabel': 'Dạy:'," "describe('phương pháp học (Plan 2, từ chương 4)'" "export function skillChips(tk: Ticket): HTMLElement | null {" "import('./ticketSources'), import('./laneSources')" "export interface Related { tables: string[]; dropped: string[] }" "['en', /^en-" "function drawColumns(): void {"; do printf '%-75s' "$p"; grep -rlF -- "$p" src tests scripts | wc -l; done
grep -c 'id="notebook-dialog"' index.html; grep -n "SAVE_VERSION = " src/save.ts; ls content/lessons.yml 2>&1 | head -1
```
Expected:
- Mỗi mẫu có trong đúng một file (cột cuối = 1), `index.html` có 1 `notebook-dialog`.
- `SAVE_VERSION = 3`.
- `content/lessons.yml` chưa có.

---

### Task 1: Gợi ý miễn phí trong cả chương 1 (L54)

**Files:** `src/i18n/en.ts`, `src/i18n/vi.ts`, `src/progress.ts`, `src/ui/brief.ts`, `tests/progress.test.ts`

**Interfaces:**
- Produces: `FREE_HINT_CHAPTER` (`src/progress.ts`). `xpFor(ticket, hints)` = XP đầy đủ khi `ticket.chapter === 1`.

- [ ] **Step 1: Viết test**

**Sửa `tests/progress.test.ts`** — thay:
```ts

  it('XP trừ 25% mỗi gợi ý, tối đa 3', () => {
    expect(xpFor(mk('ch1-01', 'teach'), 0)).toBe(200);
    expect(xpFor(mk('ch1-01', 'teach'), 1)).toBe(150);
    expect(xpFor(mk('ch1-01', 'teach'), 9)).toBe(50);
  });
});
```
bằng:
```ts

  it('XP trừ 25% mỗi gợi ý, tối đa 3', () => {
    expect(xpFor(mk('ch2-01', 'teach'), 0)).toBe(200);
    expect(xpFor(mk('ch2-01', 'teach'), 1)).toBe(150);
    expect(xpFor(mk('ch2-01', 'teach'), 9)).toBe(50);
  });

  it('L54: cả chương 1 gợi ý miễn phí (mọi việc, mọi bậc)', () => {
    for (const beat of ['teach', 'develop', 'twist', 'rest', 'boss'] as const) expect(xpFor(mk('ch1-03', beat), 3)).toBe(200);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/progress.test.ts`
Expected: FAIL ở "L54: cả chương 1 gợi ý miễn phí" (50 ≠ 200: HEAD trừ 3 × 25%).

- [ ] **Step 3: Sửa `xpFor`, nút Gợi ý và coach mark**

**Sửa `src/i18n/en.ts`** — thay:
```ts
  'coach.panel': 'Results show up here. The Columns tab lists the tables you may use. When your result matches the "Expected result" card, press Submit.',
  'coach.recap': 'Each solved task unlocks a skill and shows a reference answer. Press "Next task" to move on.',
  'coach.hints': 'Stuck? Press Hint. Each hint costs 25% of the task XP.',
  'coach.ok': 'Got it',
  'coach.skip': 'Skip the tour',
```
bằng:
```ts
  'coach.panel': 'Results show up here. The Columns tab lists the tables you may use. When your result matches the "Expected result" card, press Submit.',
  'coach.recap': 'Each solved task unlocks a skill and shows a reference answer. Press "Next task" to move on.',
  'coach.hints': 'Stuck? Press Hint. Hints are free for all of chapter 1; from chapter 2 on, each hint costs 25% of the task XP.',
  'coach.ok': 'Got it',
  'coach.skip': 'Skip the tour',
```

**Sửa `src/i18n/vi.ts`** — thay:
```ts
  'coach.panel': 'Kết quả hiện ở đây. Tab Cột liệt kê các bảng bạn được dùng. Khi kết quả khớp thẻ "Kết quả mong đợi", bấm Nộp.',
  'coach.recap': 'Mỗi việc xong mở một kỹ năng và cho bạn xem cách viết tham khảo. Bấm "Việc tiếp theo" để đi tiếp.',
  'coach.hints': 'Bí thì bấm Gợi ý. Mỗi gợi ý trừ 25% XP của việc.',
  'coach.ok': 'Hiểu rồi',
  'coach.skip': 'Bỏ qua hướng dẫn',
```
bằng:
```ts
  'coach.panel': 'Kết quả hiện ở đây. Tab Cột liệt kê các bảng bạn được dùng. Khi kết quả khớp thẻ "Kết quả mong đợi", bấm Nộp.',
  'coach.recap': 'Mỗi việc xong mở một kỹ năng và cho bạn xem cách viết tham khảo. Bấm "Việc tiếp theo" để đi tiếp.',
  'coach.hints': 'Bí thì bấm Gợi ý. Cả chương 1 gợi ý miễn phí; từ chương 2, mỗi gợi ý trừ 25% XP của việc.',
  'coach.ok': 'Hiểu rồi',
  'coach.skip': 'Bỏ qua hướng dẫn',
```

**Sửa `src/progress.ts`** — thay:
```ts
}

export function xpFor(ticket: Ticket, hintsUsed: number): number {
  return Math.round(ticket.difficulty * 100 * (1 - 0.25 * Math.min(hintsUsed, 3)));
}
```
bằng:
```ts
}

/** L54: hints cost nothing anywhere in this chapter (the probation week); elsewhere each costs 25% of the task XP, at most 3. */
export const FREE_HINT_CHAPTER = 1;

export function xpFor(ticket: Ticket, hintsUsed: number): number {
  const paid = ticket.chapter === FREE_HINT_CHAPTER ? 0 : Math.min(hintsUsed, 3);
  return Math.round(ticket.difficulty * 100 * (1 - 0.25 * paid));
}
```

**Sửa `src/ui/brief.ts`** — thay:
```ts
function hints(tk: Ticket, x: TicketText, isDone: boolean): HTMLElement {
  const shown = hintsShown(tk.id);
  const btn = h('button', {
    type: 'button',
```
bằng:
```ts
function hints(tk: Ticket, x: TicketText, isDone: boolean): HTMLElement {
  const shown = hintsShown(tk.id);
  const cost = xpFor(tk, shown) - xpFor(tk, shown + 1); // 0 in chapter 1 (L54)
  const btn = h('button', {
    type: 'button',
```

**Sửa `src/ui/brief.ts`** — thay:
```ts
      actions.rerender();
    },
  }, isStory()
    ? t('brief.hint', { i: shown + 1, n: x.hints.length, cost: xpFor(tk, shown) - xpFor(tk, shown + 1) })
    : t('brief.hintFree', { i: shown + 1, n: x.hints.length })); // Practice: 0 XP, so no cost (P9)
  return h('section', { class: 'hints my-3' },
    shown ? h('ol', { class: 'space-y-1' }, ...x.hints.slice(0, shown).map((s) => h('li', {}, richText(s)))) : null,
```
bằng:
```ts
      actions.rerender();
    },
  }, isStory() && cost > 0
    ? t('brief.hint', { i: shown + 1, n: x.hints.length, cost })
    : t('brief.hintFree', { i: shown + 1, n: x.hints.length })); // Practice: 0 XP, so no cost (P9); chapter 1: free (L54)
  return h('section', { class: 'hints my-3' },
    shown ? h('ol', { class: 'space-y-1' }, ...x.hints.slice(0, shown).map((s) => h('li', {}, richText(s)))) : null,
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `npx vitest run tests/progress.test.ts tests/overview.test.ts tests/i18n.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Chạy toàn bộ rồi commit**

Run: `npm test`
Expected: mọi test PASS (1473 test).

```bash
git add src/i18n/en.ts src/i18n/vi.ts src/progress.ts src/ui/brief.ts tests/progress.test.ts
git commit -m "feat: hints are free in all of chapter 1 (L54); hint button shows no cost when it is free

Claude-Session: https://claude.ai/code/session_01PwPSBV1SVDP6quEZfKN56M"
```

---

### Task 2: Nhãn kỹ năng có từ khóa, chip "Kỹ năng mới / Cần dùng"

**Files:** `content/skills.yml`, `src/i18n/en.ts`, `src/i18n/vi.ts`, `tests/progress.test.ts`

**Interfaces:**
- Produces:
  - Nhãn `select` "Chọn cột (SELECT)", `where` "Lọc dòng (WHERE)", `order_by` "Sắp xếp (ORDER BY)", `limit` "Lấy top N (LIMIT)". Gợi ý Task 3 và tiêu đề bài học Task 5 nhắc đúng các nhãn này.
  - Khóa `chip.teachesLabel` = "Kỹ năng mới:", `chip.needsLabel` = "Cần dùng:".

- [ ] **Step 1: Viết test**

**Sửa `tests/progress.test.ts`** — thay:
```ts
  });

  it('chapterTitle theo ngôn ngữ', () => {
    expect(chapterTitle(1, 'vi')).toBe('Tuần thử việc');
```
bằng:
```ts
  });

  it('nhãn kỹ năng là một mệnh đề thì có từ khóa trong ngoặc (product-design-v4 §E.1-6)', () => {
    const label = (id: string) => SKILLS.find((s) => s.id === id)!.label;
    for (const [id, kw] of [['select', 'SELECT'], ['where', 'WHERE'], ['order_by', 'ORDER BY'], ['limit', 'LIMIT']]) {
      expect(label(id).vi).toContain(`(${kw})`);
      expect(label(id).en).toContain(`(${kw})`);
    }
  });

  it('chapterTitle theo ngôn ngữ', () => {
    expect(chapterTitle(1, 'vi')).toBe('Tuần thử việc');
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/progress.test.ts`
Expected: FAIL ở "nhãn kỹ năng là một mệnh đề…" (`Chọn cột` không chứa `(SELECT)`).

- [ ] **Step 3: Đổi nhãn và tiền tố chip**

**Sửa `content/skills.yml`** — thay:
```yaml
- id: select
  chapter: 1
  label: { vi: "Chọn cột", en: "Select columns" }
  syntax: "SELECT code, name FROM ports"
  when: { vi: "Chỉ lấy những cột cần cho câu hỏi.", en: "Pull only the columns the question needs." }
```
bằng:
```yaml
- id: select
  chapter: 1
  label: { vi: "Chọn cột (SELECT)", en: "Select columns (SELECT)" }
  syntax: "SELECT code, name FROM ports"
  when: { vi: "Chỉ lấy những cột cần cho câu hỏi.", en: "Pull only the columns the question needs." }
```

**Sửa `content/skills.yml`** — thay:
```yaml
- id: where
  chapter: 1
  label: { vi: "Lọc dòng", en: "Filter rows" }
  syntax: "WHERE region = 'Europe' AND kind IN ('SEAPORT', 'AIRPORT')"
  when: { vi: "Giữ lại các dòng thỏa điều kiện.", en: "Keep only the rows that match a condition." }
```
bằng:
```yaml
- id: where
  chapter: 1
  label: { vi: "Lọc dòng (WHERE)", en: "Filter rows (WHERE)" }
  syntax: "WHERE region = 'Europe' AND kind IN ('SEAPORT', 'AIRPORT')"
  when: { vi: "Giữ lại các dòng thỏa điều kiện.", en: "Keep only the rows that match a condition." }
```

**Sửa `content/skills.yml`** — thay:
```yaml
- id: order_by
  chapter: 1
  label: { vi: "Sắp xếp theo nhiều tiêu chí", en: "Sort with a tie-breaker" }
  syntax: "ORDER BY gross_weight_kg DESC, ref"
  when: { vi: "Đề yêu cầu thứ tự hoặc xếp hạng.", en: "The question asks for an order or a ranking." }
```
bằng:
```yaml
- id: order_by
  chapter: 1
  label: { vi: "Sắp xếp (ORDER BY)", en: "Sort (ORDER BY)" }
  syntax: "ORDER BY gross_weight_kg DESC, ref"
  when: { vi: "Đề yêu cầu thứ tự hoặc xếp hạng.", en: "The question asks for an order or a ranking." }
```

**Sửa `content/skills.yml`** — thay:
```yaml
- id: limit
  chapter: 1
  label: { vi: "Lấy top N", en: "Top N" }
  syntax: "ORDER BY gross_weight_kg DESC, ref LIMIT 5"
  when: { vi: "Chỉ cần N dòng đầu sau khi sắp xếp.", en: "You only need the first N rows after sorting." }
```
bằng:
```yaml
- id: limit
  chapter: 1
  label: { vi: "Lấy top N (LIMIT)", en: "Top N (LIMIT)" }
  syntax: "ORDER BY gross_weight_kg DESC, ref LIMIT 5"
  when: { vi: "Chỉ cần N dòng đầu sau khi sắp xếp.", en: "You only need the first N rows after sorting." }
```

**Sửa `src/i18n/en.ts`** — thay:
```ts
  'goal.title': 'Chapter {n} goals: {title}',
  'goal.intro': 'After this chapter you can:',
  'chip.teachesLabel': 'Teaches:',
  'chip.needsLabel': 'Needs:',
  'sum.title': 'Chapter {n} wrap-up: {title}',
  'sum.career': 'New career step: {career}',
```
bằng:
```ts
  'goal.title': 'Chapter {n} goals: {title}',
  'goal.intro': 'After this chapter you can:',
  'chip.teachesLabel': 'New skill:',
  'chip.needsLabel': 'Uses:',
  'sum.title': 'Chapter {n} wrap-up: {title}',
  'sum.career': 'New career step: {career}',
```

**Sửa `src/i18n/vi.ts`** — thay:
```ts
  'goal.title': 'Mục tiêu chương {n}: {title}',
  'goal.intro': 'Sau chương này bạn có thể:',
  'chip.teachesLabel': 'Dạy:',
  'chip.needsLabel': 'Cần:',
  'sum.title': 'Tổng kết chương {n}: {title}',
  'sum.career': 'Bước nghề mới: {career}',
```
bằng:
```ts
  'goal.title': 'Mục tiêu chương {n}: {title}',
  'goal.intro': 'Sau chương này bạn có thể:',
  'chip.teachesLabel': 'Kỹ năng mới:',
  'chip.needsLabel': 'Cần dùng:',
  'sum.title': 'Tổng kết chương {n}: {title}',
  'sum.career': 'Bước nghề mới: {career}',
```

- [ ] **Step 4: Chạy test, xác nhận PASS rồi commit**

Run: `npx vitest run tests/progress.test.ts tests/i18n.test.ts tests/content.test.ts && npx tsc --noEmit`
Expected: PASS (1474 test khi chạy `npm test`).

```bash
git add content/skills.yml src/i18n/en.ts src/i18n/vi.ts tests/progress.test.ts
git commit -m "content: clause skills carry their keyword (Lọc dòng (WHERE)…); chips read Kỹ năng mới / Cần dùng (v4 §E.1-6, D-C2)

Claude-Session: https://claude.ai/code/session_01PwPSBV1SVDP6quEZfKN56M"
```

---

### Task 3: Nội dung ch1–3 (P0): reflect, faded, wrong, cue, gợi ý 1 gọi tên khái niệm

**Files:** `content/TEMPLATE.md`, `content/tickets/ch1/ch1-01.md`, `content/tickets/ch1/ch1-02.md`, `content/tickets/ch1/ch1-03.md`, `content/tickets/ch1/ch1-04.md`, `content/tickets/ch2/ch2-01.md`, `content/tickets/ch2/ch2-02.md`, `content/tickets/ch2/ch2-03.md`, `content/tickets/ch2/ch2-04.md`, `content/tickets/ch3/ch3-01.md`, `content/tickets/ch3/ch3-02.md`, `content/tickets/ch3/ch3-03.md`, `content/tickets/ch3/ch3-04.md`, `tests/content.test.ts`

**Interfaces:**
- Consumes: nhãn kỹ năng (Task 2), nhắc trong gợi ý 1.
- Produces:
  - 12 việc thường ch1–3 có `reflect`.
  - `format: faded` ở ch1-02, ch2-02, ch3-02.
  - `wrong:` như U6.
  - Cue trong đề cho Task 4: ch1-01 "Gửi mình… / Với mỗi… / theo thứ tự", ch1-02 "chỉ cần… / bỏ sân bay", ch1-03 "nặng nhất / lên đầu", ch3-01 "Tên khách nằm ở hồ sơ khách hàng"…

- [ ] **Step 1: Mở rộng test phương pháp học ra mọi chương**

**Sửa `tests/content.test.ts`** — thay:
```ts
import { describe, expect, it } from 'vitest';
import template from '../content/TEMPLATE.md?raw';
import { loadTicketTemplates, loadTickets } from '../src/content';
import { compareResults } from '../src/grader';
import { KPIS } from '../src/home';
import { CHAPTER_TABLES, contentProblems, SKILLS, tablesUnlocked } from '../src/progress';
import { parseTicket, textOf, type TicketText } from '../src/tickets';
import { applyVariant, variantsOf } from '../src/variants';
import { runner } from './helpers';

const tickets = loadTickets();
const steps = tickets.flatMap((t) => t.steps.map((s, i) => ({
  name: `${t.id}#${i}`, ordered: t.ordered, tables: t.tables, sql: s.solution, columns: s.columns,
})));

const ALL_TABLES = Object.values(CHAPTER_TABLES).flat();
const VI_DIACRITIC = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
const codeSpans = (s: string): string[] => [...s.matchAll(/`([^`]+)`/g)].map((m) => m[1]).sort();
const allText = (x: TicketText): string => [
  x.title, x.body, x.task, ...x.hints, ...x.steps.flatMap((s) => [s.title, s.prompt]),
  ...(x.conclusion ? [x.conclusion.question, ...x.conclusion.options] : []), x.example ?? '',
].join('\n');
// ponytail: regex over FROM/JOIN is enough for content Solutions (no CTE, no quoted names).
// Swap for tablesInQuery (Plan 1b Task 6, libpg-query) if a Solution ever needs a CTE or subquery in FROM.
const tablesIn = (sql: string): string[] =>
  [...new Set([...sql.matchAll(/\b(?:from|join)\s+([a-z_][a-z0-9_]*)/gi)].map((m) => m[1].toLowerCase()))]
    .filter((x) => ALL_TABLES.includes(x));

describe('nội dung ticket', () => {
  it('có ticket', () => {
    expect(tickets.length).toBeGreaterThan(0);
  });

  it('soft-lock, nhịp chương, kỹ năng và chương hợp lệ', () => {
    expect(contentProblems(tickets)).toEqual([]);
  });

  it('content/TEMPLATE.md là ticket hợp lệ', () => {
    expect(parseTicket(template, 'content/TEMPLATE.md').en).toBeDefined();
  });
});

describe('song ngữ', () => {
  it.each(tickets)('$id: có khối # EN', (t) => {
    expect(t.en).toBeDefined();
  });

  it.each(tickets)('$id: EN giữ nguyên mọi `code span` của VI', (t) => {
    expect(codeSpans(allText(textOf(t, 'en')))).toEqual(codeSpans(allText(textOf(t, 'vi'))));
  });

  it.each(tickets)('$id: EN không còn chữ tiếng Việt có dấu (ngoài code span)', (t) => {
    expect(allText(textOf(t, 'en')).replace(/`[^`]+`/g, '')).not.toMatch(VI_DIACRITIC);
  });

  it.each(tickets)('$id: thân đề, Task và đề bước không có backtick (problem-design §1.2)', (t) => {
    for (const lang of ['vi', 'en'] as const) {
      const x = textOf(t, lang);
      expect([x.body, x.task, ...x.steps.map((s) => s.prompt)].join('\n')).not.toContain('`');
    }
  });

  // FCL/LCL are everyday freight terms, so prompts may use them. Table names are plain English words ("customers"), so only SQL keywords, coded values and snake_case columns are caught.
  const SQLISH = /\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|JOIN|HAVING|LIMIT|COUNT|SUM|AVG|DISTINCT|BOOKED|IN_TRANSIT|ARRIVED|DELIVERED|CANCELLED|EXPORT|IMPORT|SEA|AIR)\b|\b[a-z]+_[a-z_]+\b/g;
  it.each(tickets)('$id: đề không có từ khóa SQL, mã trạng thái hay tên cột snake_case (problem-design §1)', (t) => {
    for (const lang of ['vi', 'en'] as const) {
      const x = textOf(t, lang);
      expect([x.body, x.task ?? '', ...x.steps.map((s) => s.prompt)].join('\n').match(SQLISH)).toBeNull();
    }
  });
});

describe('Solution', () => {
  it.each(steps)('$name: không dùng ngày hệ thống', ({ sql }) => {
    expect(sql).not.toMatch(/current_date|current_timestamp|localtimestamp|now\s*\(/i);
  });

  it.each(steps.filter((s) => s.ordered))('$name: ticket ordered phải có ORDER BY', ({ sql }) => {
    expect(sql).toMatch(/order\s+by/i);
  });

  it.each(steps)('$name: bảng dùng trong Solution phải khai trong tables', ({ sql, tables }) => {
    expect(tablesIn(sql).filter((x) => !tables.includes(x))).toEqual([]);
  });

  it.each(steps)('$name: Solution chạy được; columns là nhãn nghiệp vụ VI/EN, đủ số cột, không đọc hộ tên cột (L25)', async ({ sql, columns }) => {
    const run = await runner();
    const r = await run(sql);
    expect(r.rows.length).toBeGreaterThan(0);
    expect(columns?.length).toBe(r.columns.length);
    for (const label of columns ?? []) {
      expect(label.en).not.toMatch(VI_DIACRITIC);
      for (const text of [label.vi, label.en]) {
        expect(text).not.toMatch(/^[a-z0-9_]+$/);
        expect(r.columns).not.toContain(text);
      }
    }
  });

  it('ch1-05: bước 1 trả ≥ 4 dòng để LIMIT 3 ở bước 3 có nghĩa (L14)', async () => {
    const run = await runner();
    const boss = tickets.find((t) => t.id === 'ch1-05');
    expect((await run(boss!.steps[0].solution)).rows.length).toBeGreaterThanOrEqual(4);
  });
});

/** curriculum §5: learning-method fields, required from chapter 4 (ch1–3 stay as they are). */
describe('phương pháp học (Plan 2, từ chương 4)', () => {
  const templates = loadTicketTemplates().filter((t) => t.chapter >= 4);
  const normal = templates.filter((t) => t.beat !== 'boss');
  const chapters = [...new Set(templates.map((t) => t.chapter))];
  /** Every variant of every `wrong:` SQL, so a variant cannot make a wrong answer accidentally right. */
  const wrongs = normal.flatMap((t) => Array.from({ length: Math.max(1, variantsOf(t).length) }, (_, v) => applyVariant(t, v))
    .flatMap((tv, v) => (tv.wrong ?? []).map((w, i) => ({ name: `${t.id}#${v} wrong[${i}]`, sql: w.sql, solution: tv.steps[0].solution, ordered: t.ordered }))));

  it.each(chapters)('chương %i: teach là ví dụ mẫu (worked), có đúng một bài làm cùng (faded)', (c) => {
    const inChapter = templates.filter((t) => t.chapter === c);
    expect(inChapter.find((t) => t.beat === 'teach')?.format).toBe('worked');
    expect(inChapter.filter((t) => t.format === 'faded')).toHaveLength(1);
  });

  it.each(normal)('$id: có câu ngẫm lại (reflect), EN không dấu', (t) => {
    expect(t.reflect).toBeDefined();
    const r = t.reflect!;
    expect([r.q, r.why, ...r.options].map((b) => b.en).join('\n')).not.toMatch(VI_DIACRITIC);
    for (const w of t.wrong ?? []) expect(w.why.en).not.toMatch(VI_DIACRITIC);
  });

  it.each(templates.filter((t) => t.example))('$id: SQL ví dụ mẫu chạy được, có dữ liệu, khác Solution', async (t) => {
    const run = await runner();
    const r = await run(t.example!.sql);
    expect(r.rows.length).toBeGreaterThan(0);
    expect(t.example!.sql).not.toBe(t.steps[0].solution);
  });

  // An empty result is never matched against `wrong:` (src/ui/work.ts wrongTipper), so an empty `wrong:` could never fire.
  it.each(wrongs)('$name: câu sai chạy được, có dòng, và cho kết quả khác Solution', async ({ sql, solution, ordered }) => {
    const run = await runner();
    const r = await run(sql);
    expect(r.rows.length).toBeGreaterThan(0);
    expect(compareResults(await run(solution), r, ordered).ok).toBe(false);
  });

  it.each(templates)('$id: bảng trong SQL `wrong:` và ví dụ mẫu đã mở ở chương này', (t) => {
    const unlocked = tablesUnlocked(t.chapter);
    for (const sql of [...(t.wrong ?? []).map((w) => w.sql), t.example?.sql ?? '']) {
      expect(tablesIn(sql).filter((x) => !unlocked.includes(x))).toEqual([]);
    }
  });

  // L37: the review queue needs other figures to practise with, not the same task again.
  it('mỗi kỹ năng mới có một ticket thường với ≥ 3 biến thể (biến thể 0 + 2)', () => {
    const missing = SKILLS.filter((s) => chapters.includes(s.chapter))
      .filter((s) => !normal.some((t) => [...t.requires, ...t.grants].includes(s.id) && variantsOf(t).length >= 3))
      .map((s) => s.id);
    expect(missing).toEqual([]);
  });
});

describe('KPI (content/kpis.yml)', () => {
  const live = KPIS.filter((k) => tickets.some((t) => t.id === k.ticket));
  it.each(live)('$id: Solution của việc nguồn ra đúng dạng ô', async (k) => {
    const t = tickets.find((x) => x.id === k.ticket)!;
    expect(k.step).toBeLessThan(t.steps.length);
    const r = await (await runner())(t.steps[k.step].solution);
    if (k.kind === 'number') {
      expect(r.rows).toHaveLength(1);
      expect(Number.isFinite(Number(r.rows[0][k.col]))).toBe(true);
    }
    if (k.kind === 'rowcount') expect(r.rows.length).toBeGreaterThan(0);
    if (k.kind === 'bar') {
      expect(r.columns.length).toBeGreaterThanOrEqual(2);
      expect(r.rows.every((row) => Number.isFinite(Number(row[row.length - 1])))).toBe(true);
    }
  });
});
```
bằng:
```ts
import { describe, expect, it } from 'vitest';
import template from '../content/TEMPLATE.md?raw';
import { loadTicketTemplates, loadTickets } from '../src/content';
import { compareResults } from '../src/grader';
import { KPIS } from '../src/home';
import { CHAPTER_TABLES, contentProblems, SKILLS, tablesUnlocked } from '../src/progress';
import { parseTicket, textOf, type TicketText } from '../src/tickets';
import { applyVariant, variantsOf } from '../src/variants';
import { runner } from './helpers';

const tickets = loadTickets();
const steps = tickets.flatMap((t) => t.steps.map((s, i) => ({
  name: `${t.id}#${i}`, ordered: t.ordered, tables: t.tables, sql: s.solution, columns: s.columns,
})));

const ALL_TABLES = Object.values(CHAPTER_TABLES).flat();
const VI_DIACRITIC = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
const codeSpans = (s: string): string[] => [...s.matchAll(/`([^`]+)`/g)].map((m) => m[1]).sort();
const allText = (x: TicketText): string => [
  x.title, x.body, x.task, ...x.hints, ...x.steps.flatMap((s) => [s.title, s.prompt]),
  ...(x.conclusion ? [x.conclusion.question, ...x.conclusion.options] : []), x.example ?? '',
].join('\n');
// ponytail: regex over FROM/JOIN is enough for content Solutions (no CTE, no quoted names).
// Swap for tablesInQuery (Plan 1b Task 6, libpg-query) if a Solution ever needs a CTE or subquery in FROM.
const tablesIn = (sql: string): string[] =>
  [...new Set([...sql.matchAll(/\b(?:from|join)\s+([a-z_][a-z0-9_]*)/gi)].map((m) => m[1].toLowerCase()))]
    .filter((x) => ALL_TABLES.includes(x));

describe('nội dung ticket', () => {
  it('có ticket', () => {
    expect(tickets.length).toBeGreaterThan(0);
  });

  it('soft-lock, nhịp chương, kỹ năng và chương hợp lệ', () => {
    expect(contentProblems(tickets)).toEqual([]);
  });

  it('content/TEMPLATE.md là ticket hợp lệ', () => {
    expect(parseTicket(template, 'content/TEMPLATE.md').en).toBeDefined();
  });
});

describe('song ngữ', () => {
  it.each(tickets)('$id: có khối # EN', (t) => {
    expect(t.en).toBeDefined();
  });

  it.each(tickets)('$id: EN giữ nguyên mọi `code span` của VI', (t) => {
    expect(codeSpans(allText(textOf(t, 'en')))).toEqual(codeSpans(allText(textOf(t, 'vi'))));
  });

  it.each(tickets)('$id: EN không còn chữ tiếng Việt có dấu (ngoài code span)', (t) => {
    expect(allText(textOf(t, 'en')).replace(/`[^`]+`/g, '')).not.toMatch(VI_DIACRITIC);
  });

  it.each(tickets)('$id: thân đề, Task và đề bước không có backtick (problem-design §1.2)', (t) => {
    for (const lang of ['vi', 'en'] as const) {
      const x = textOf(t, lang);
      expect([x.body, x.task, ...x.steps.map((s) => s.prompt)].join('\n')).not.toContain('`');
    }
  });

  // FCL/LCL are everyday freight terms, so prompts may use them. Table names are plain English words ("customers"), so only SQL keywords, coded values and snake_case columns are caught.
  const SQLISH = /\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|JOIN|HAVING|LIMIT|COUNT|SUM|AVG|DISTINCT|BOOKED|IN_TRANSIT|ARRIVED|DELIVERED|CANCELLED|EXPORT|IMPORT|SEA|AIR)\b|\b[a-z]+_[a-z_]+\b/g;
  it.each(tickets)('$id: đề không có từ khóa SQL, mã trạng thái hay tên cột snake_case (problem-design §1)', (t) => {
    for (const lang of ['vi', 'en'] as const) {
      const x = textOf(t, lang);
      expect([x.body, x.task ?? '', ...x.steps.map((s) => s.prompt)].join('\n').match(SQLISH)).toBeNull();
    }
  });
});

describe('Solution', () => {
  it.each(steps)('$name: không dùng ngày hệ thống', ({ sql }) => {
    expect(sql).not.toMatch(/current_date|current_timestamp|localtimestamp|now\s*\(/i);
  });

  it.each(steps.filter((s) => s.ordered))('$name: ticket ordered phải có ORDER BY', ({ sql }) => {
    expect(sql).toMatch(/order\s+by/i);
  });

  it.each(steps)('$name: bảng dùng trong Solution phải khai trong tables', ({ sql, tables }) => {
    expect(tablesIn(sql).filter((x) => !tables.includes(x))).toEqual([]);
  });

  it.each(steps)('$name: Solution chạy được; columns là nhãn nghiệp vụ VI/EN, đủ số cột, không đọc hộ tên cột (L25)', async ({ sql, columns }) => {
    const run = await runner();
    const r = await run(sql);
    expect(r.rows.length).toBeGreaterThan(0);
    expect(columns?.length).toBe(r.columns.length);
    for (const label of columns ?? []) {
      expect(label.en).not.toMatch(VI_DIACRITIC);
      for (const text of [label.vi, label.en]) {
        expect(text).not.toMatch(/^[a-z0-9_]+$/);
        expect(r.columns).not.toContain(text);
      }
    }
  });

  it('ch1-05: bước 1 trả ≥ 4 dòng để LIMIT 3 ở bước 3 có nghĩa (L14)', async () => {
    const run = await runner();
    const boss = tickets.find((t) => t.id === 'ch1-05');
    expect((await run(boss!.steps[0].solution)).rows.length).toBeGreaterThanOrEqual(4);
  });
});

/**
 * curriculum §5, extended to every chapter by product-design-v4 §E.1 (L54): reflect on every normal ticket and one faded
 * ticket (the first develop) per chapter. Only from chapter 4 is the teach ticket a worked example: in chapters 1–3 the
 * skill's quick lesson (content/lessons.yml) is the paired example instead (D-C4).
 */
describe('phương pháp học (mọi chương)', () => {
  const templates = loadTicketTemplates();
  const normal = templates.filter((t) => t.beat !== 'boss');
  const chapters = [...new Set(templates.map((t) => t.chapter))];
  /** Every variant of every `wrong:` SQL, so a variant cannot make a wrong answer accidentally right. */
  const wrongs = normal.flatMap((t) => Array.from({ length: Math.max(1, variantsOf(t).length) }, (_, v) => applyVariant(t, v))
    .flatMap((tv, v) => (tv.wrong ?? []).map((w, i) => ({ name: `${t.id}#${v} wrong[${i}]`, sql: w.sql, solution: tv.steps[0].solution, ordered: t.ordered }))));

  it.each(chapters.filter((c) => c >= 4))('chương %i: teach là ví dụ mẫu (worked)', (c) => {
    expect(templates.find((t) => t.chapter === c && t.beat === 'teach')?.format).toBe('worked');
  });

  it.each(chapters)('chương %i: đúng một bài làm cùng (faded), là việc develop đầu tiên', (c) => {
    const inChapter = templates.filter((t) => t.chapter === c);
    expect(inChapter.filter((t) => t.format === 'faded').map((t) => t.id)).toEqual([inChapter.find((t) => t.beat === 'develop')?.id]);
  });

  it.each(normal)('$id: có câu ngẫm lại (reflect), EN không dấu', (t) => {
    expect(t.reflect).toBeDefined();
    const r = t.reflect!;
    expect([r.q, r.why, ...r.options].map((b) => b.en).join('\n')).not.toMatch(VI_DIACRITIC);
    for (const w of t.wrong ?? []) expect(w.why.en).not.toMatch(VI_DIACRITIC);
  });

  it.each(templates.filter((t) => t.example))('$id: SQL ví dụ mẫu chạy được, có dữ liệu, khác Solution', async (t) => {
    const run = await runner();
    const r = await run(t.example!.sql);
    expect(r.rows.length).toBeGreaterThan(0);
    expect(t.example!.sql).not.toBe(t.steps[0].solution);
  });

  // An empty result is never matched against `wrong:` (src/ui/work.ts wrongTipper), so an empty `wrong:` could never fire.
  it.each(wrongs)('$name: câu sai chạy được, có dòng, và cho kết quả khác Solution', async ({ sql, solution, ordered }) => {
    const run = await runner();
    const r = await run(sql);
    expect(r.rows.length).toBeGreaterThan(0);
    expect(compareResults(await run(solution), r, ordered).ok).toBe(false);
  });

  it.each(templates)('$id: bảng trong SQL `wrong:` và ví dụ mẫu đã mở ở chương này', (t) => {
    const unlocked = tablesUnlocked(t.chapter);
    for (const sql of [...(t.wrong ?? []).map((w) => w.sql), t.example?.sql ?? '']) {
      expect(tablesIn(sql).filter((x) => !unlocked.includes(x))).toEqual([]);
    }
  });

  // L37: the review queue needs other figures to practise with, not the same task again (from chapter 4, Plan 2).
  it('mỗi kỹ năng mới từ chương 4 có một ticket thường với ≥ 3 biến thể (biến thể 0 + 2)', () => {
    const missing = SKILLS.filter((s) => s.chapter >= 4 && chapters.includes(s.chapter))
      .filter((s) => !normal.some((t) => [...t.requires, ...t.grants].includes(s.id) && variantsOf(t).length >= 3))
      .map((s) => s.id);
    expect(missing).toEqual([]);
  });
});

describe('KPI (content/kpis.yml)', () => {
  const live = KPIS.filter((k) => tickets.some((t) => t.id === k.ticket));
  it.each(live)('$id: Solution của việc nguồn ra đúng dạng ô', async (k) => {
    const t = tickets.find((x) => x.id === k.ticket)!;
    expect(k.step).toBeLessThan(t.steps.length);
    const r = await (await runner())(t.steps[k.step].solution);
    if (k.kind === 'number') {
      expect(r.rows).toHaveLength(1);
      expect(Number.isFinite(Number(r.rows[0][k.col]))).toBe(true);
    }
    if (k.kind === 'rowcount') expect(r.rows.length).toBeGreaterThan(0);
    if (k.kind === 'bar') {
      expect(r.columns.length).toBeGreaterThanOrEqual(2);
      expect(r.rows.every((row) => Number.isFinite(Number(row[row.length - 1])))).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/content.test.ts`
Expected: FAIL:
- "chương 1/2/3: đúng một bài làm cùng (faded)…": `[]` ≠ `['ch1-02']`…
- "chXX-0Y: có câu ngẫm lại (reflect)" cho 12 việc ch1–3.

- [ ] **Step 3: Ghi lại 12 ticket, sửa TEMPLATE**

Mỗi ticket ghi lại cả file. Solution, `columns`, `tables`, `requires`/`grants`, `variants` giữ nguyên; chỉ thêm `format`/`starter`/`reflect`/`wrong`, câu cue, đoạn về chỗ trống, gợi ý 1.

**Sửa `content/TEMPLATE.md`** — thay:
````markdown
# thêm conclusion { question, options, answer } và conclusion_en { question, options }.
# Hoạt cảnh khi xong (tùy chọn, completion-animations.md §3): scene: { kind: ship|yard|customs|truck|quote|ledger|chat, to?: CNSHA|THLCH|SGSIN|NLRTM|KRPUS|USLAX|AUSYD, lane?: green|yellow|red }. Không khai thì dùng sceneOf().
# Dạng bài (curriculum §5.1, từ ch4): format: worked | faded | open (mặc định open).
#   worked (ticket teach): thêm "## Example" ngay sau "## Task": một khối ```sql đánh dấu -- ①, -- ②… rồi mỗi dấu một đoạn giải thích
#   (các đoạn cách nhau một dòng trống). Khối # EN có "## Example" chỉ gồm lời giải thích, code span giống hệt bản VI.
#   faded: starter có ít nhất một chỗ trống ___ (Nộp khi còn ___ thì báo, không tính là nộp sai).
# reflect (mọi ticket thường từ ch4): { q: {vi, en}, options: [{vi, en}, …] (2–4), answer: số thứ tự đáp án đúng từ 0, why: {vi, en} } — câu ngẫm lại trong Recap.
# wrong (tùy chọn): [{ sql, vi, en }] — câu SQL sai hay gặp; kết quả người chơi trùng kết quả câu này thì phản hồi hiện lời giải thích.
#   Mỗi câu phải chạy được và khác kết quả Solution ở mọi biến thể (tests/content.test.ts).
````
bằng:
````markdown
# thêm conclusion { question, options, answer } và conclusion_en { question, options }.
# Hoạt cảnh khi xong (tùy chọn, completion-animations.md §3): scene: { kind: ship|yard|customs|truck|quote|ledger|chat, to?: CNSHA|THLCH|SGSIN|NLRTM|KRPUS|USLAX|AUSYD, lane?: green|yellow|red }. Không khai thì dùng sceneOf().
# Dạng bài (curriculum §5.1): format: worked | faded | open (mặc định open). Mỗi chương đúng một faded = việc develop đầu tiên.
#   worked (ticket teach từ ch4; ch1–3 dùng Bài học nhanh trong content/lessons.yml thay ví dụ mẫu): thêm "## Example" ngay sau "## Task": một khối ```sql đánh dấu -- ①, -- ②… rồi mỗi dấu một đoạn giải thích
#   (các đoạn cách nhau một dòng trống). Khối # EN có "## Example" chỉ gồm lời giải thích, code span giống hệt bản VI.
#   faded: starter có ít nhất một chỗ trống ___ (Nộp khi còn ___ thì báo, không tính là nộp sai).
# reflect (mọi ticket thường, mọi chương): { q: {vi, en}, options: [{vi, en}, …] (2–4), answer: số thứ tự đáp án đúng từ 0, why: {vi, en} } — câu ngẫm lại trong Recap.
# Gợi ý (product-design-v4 §C.4): 1 = khái niệm ("Đây là bài lọc dòng: …", được gọi tên một từ khóa SQL, nhắc Bài học nhanh), 2 = cú pháp (bảng, cột, giá trị), 3 = gần đáp án (khung có ...).
# wrong (tùy chọn): [{ sql, vi, en }] — câu SQL sai hay gặp; kết quả người chơi trùng kết quả câu này thì phản hồi hiện lời giải thích.
#   Mỗi câu phải chạy được và khác kết quả Solution ở mọi biến thể (tests/content.test.ts).
````

**Ghi lại `content/tickets/ch1/ch1-01.md`** (ghi cả file):
````markdown
---
id: ch1-01
chapter: 1
title: Danh mục cảng công ty khai thác
title_en: Ports we work with
from: { name: Hoàng Khánh, dept: Ops }
difficulty: 1
beat: teach
requires: []
grants: [select]
tables: [ports]
columns:
  - { vi: "Mã cảng", en: "Port code" }
  - { vi: "Tên cảng", en: "Port name" }
  - { vi: "Quốc gia", en: "Country" }
starter: SELECT * FROM ports
reflect:
  q: { vi: "Vì sao không nộp luôn câu có sẵn SELECT * FROM ports?", en: "Why not submit the starter SELECT * FROM ports as it is?" }
  options:
    - { vi: "Dấu * lấy mọi cột của bảng; đề cần đúng 3 cột theo thứ tự, nên thừa cột là sai", en: "The * takes every column of the table; the request wants exactly 3 columns in order, so extra columns are wrong" }
    - { vi: "SELECT * chạy chậm hơn nhiều", en: "SELECT * runs much slower" }
    - { vi: "SELECT * không lấy được cột quốc gia", en: "SELECT * cannot fetch the country column" }
  answer: 0
  why: { vi: "Kết quả được so theo vị trí cột, nên chỉ liệt kê đúng các cột đề cần, đúng thứ tự đề nói.", en: "Results are compared by column position, so list exactly the columns the request asks for, in the order it gives." }
wrong:
  - sql: "SELECT name, code, country FROM ports"
    vi: "Đủ 3 cột nhưng sai thứ tự: đề cần mã cảng trước, rồi tên cảng, rồi quốc gia. Kết quả được so theo vị trí cột."
    en: "Three columns, but in the wrong order: the request wants the port code first, then the port name, then the country. Results are compared by column position."
---
Chào bạn, chào mừng đến Cargo Query Logistics! Mình là trưởng phòng Ops, tuần này mình kèm bạn.

Phòng đang soạn sổ tay cho nhân viên mới. Sổ tay có một trang tra cứu mọi cảng biển và sân bay công ty khai thác, để ai đọc booking hay vận đơn cũng hiểu mã cảng là cảng nào.

## Task
Gửi mình danh mục mọi cảng biển và sân bay trong hệ thống. Với mỗi cảng mình cần ba thông tin, theo thứ tự: mã cảng, tên cảng, quốc gia. Thứ tự dòng không quan trọng.

## Hints
1. Đây là bài chọn cột: từ một danh mục, chỉ lấy đúng những thông tin cần. Mã, tên và quốc gia đều là thông tin của chính cảng, nên nằm cùng danh mục cảng; tab Cột ở panel bên dưới cho biết tên bảng và tên cột. Xem lại Bài học nhanh "Chọn cột (SELECT)" nếu cần.
2. Bảng `ports` có các cột `code`, `name`, `country`. Editor có sẵn `SELECT * FROM ports`, trong đó `*` lấy mọi cột; ở đây bạn chỉ cần 3 cột, cách nhau bằng dấu phẩy.
3. `SELECT ..., ..., ... FROM ports`

## Solution
```sql
SELECT code, name, country FROM ports
```

# EN
Hi, and welcome to Cargo Query Logistics! I run Ops, and I am your mentor this week.

We are writing a handbook for new staff. It has a lookup page with every seaport and airport the company works with, so anyone reading a booking or a bill of lading knows which port a code stands for.

## Task
Send me the list of every seaport and airport in the system. For each one I need three things, in this order: port code, port name, country. Any order of rows is fine.

## Hints
1. This is a column pick: from one list, take exactly the pieces of information you need. The code, name and country all describe the port itself, so they sit in the port list; the Columns tab in the bottom panel shows the table and column names. Open the "Select columns (SELECT)" quick lesson again if you need it.
2. The `ports` table has the columns `code`, `name` and `country`. The editor already holds `SELECT * FROM ports`, where `*` takes every column; here you only need 3 columns, separated by commas.
3. `SELECT ..., ..., ... FROM ports`
````

**Ghi lại `content/tickets/ch1/ch1-02.md`** (ghi cả file):
````markdown
---
id: ch1-02
chapter: 1
title: Cảng biển châu Âu cho buổi họp tuyến
title_en: European seaports for the lane meeting
from: { name: Hoàng Khánh, dept: Ops }
difficulty: 1
beat: develop
format: faded
requires: [select]
grants: [where]
tables: [ports]
columns:
  - { vi: "Mã cảng", en: "Port code" }
  - { vi: "Tên cảng", en: "Port name" }
  - { vi: "Quốc gia", en: "Country" }
starter: |
  SELECT code, name, country
  FROM ports
  WHERE ___ AND ___
reflect:
  q: { vi: "Vì sao hai điều kiện nối bằng AND mà không phải OR?", en: "Why are the two conditions joined with AND and not OR?" }
  options:
    - { vi: "Cảng phải vừa ở châu Âu vừa là cảng biển; OR sẽ lấy cả sân bay châu Âu lẫn cảng biển ở mọi nơi", en: "A port must be in Europe and be a seaport; OR would also take European airports and seaports everywhere" }
    - { vi: "AND chạy nhanh hơn OR", en: "AND runs faster than OR" }
    - { vi: "Hai cách cho cùng kết quả", en: "Both give the same result" }
  answer: 0
  why: { vi: "AND giữ dòng khi mọi điều kiện đều đúng; OR giữ dòng khi chỉ cần một điều kiện đúng.", en: "AND keeps a row when every condition holds; OR keeps it when any one holds." }
wrong:
  - sql: "SELECT code, name, country FROM ports WHERE region = 'Europe'"
    vi: "Danh sách đang có cả sân bay Frankfurt. Đề chỉ cần cảng biển."
    en: "Your list also has Frankfurt Airport. The request is for seaports only."
  - sql: "SELECT code, name, country FROM ports WHERE region = 'Europe' OR kind = 'SEAPORT'"
    vi: "Danh sách có cả cảng biển ngoài châu Âu và sân bay châu Âu: OR giữ dòng khi chỉ cần một điều kiện đúng. Đề cần cả hai điều kiện cùng đúng."
    en: "Your list has seaports outside Europe and a European airport too: OR keeps a row when either condition holds. The request needs both at once."
---
Tuần sau Ops họp với các đại lý về tuyến châu Âu. Mình muốn in sẵn danh sách cảng biển châu Âu mình đang khai thác, để chốt cảng nào đã có đại lý nhận hàng.

Câu SQL trong editor đã chọn sẵn các cột, chỉ còn hai chỗ trống ___ cho hai điều kiện. Bạn điền cho đủ rồi nộp.

## Task
Trong danh mục cảng, mình chỉ cần những cảng thỏa cả hai điều kiện: thuộc khu vực châu Âu, và là cảng biển (bỏ sân bay, vì hàng air đi qua một mạng đại lý khác). Với mỗi cảng: mã cảng, tên cảng, quốc gia. Thứ tự dòng không quan trọng.

## Hints
1. Đây là bài lọc dòng: từ danh mục cảng, chỉ giữ những dòng thỏa điều kiện. Có hai điều kiện phải đúng cùng lúc, và danh mục cảng đã ghi sẵn khu vực và loại của từng cảng. Xem lại Bài học nhanh "Lọc dòng (WHERE)" nếu cần.
2. Trong bảng `ports`, khu vực ở cột `region` (giá trị `'Europe'`), loại cảng ở cột `kind` (`'SEAPORT'` hoặc `'AIRPORT'`). Nối hai điều kiện bằng `AND`; giá trị chữ đặt trong nháy đơn.
3. `SELECT code, name, country FROM ports WHERE region = ... AND kind = ...`

## Solution
```sql
SELECT code, name, country FROM ports WHERE region = 'Europe' AND kind = 'SEAPORT'
```

# EN
Next week Ops meets our agents about the European lanes. I want a printed list of the European seaports we work with, so we can confirm which ports already have a receiving agent.

The SQL in the editor already picks the columns; only the two blanks ___ for the two conditions are left. Fill them in and submit.

## Task
From the port list I only need the ports that meet both conditions: in the Europe region, and a seaport (leave out airports, because air cargo goes through a different agent network). For each port: port code, port name, country. Any order of rows is fine.

## Hints
1. This is a row filter: from the port list, keep only the rows that meet the conditions. Two conditions must hold at the same time, and the port list already records the region and the kind of each port. Open the "Filter rows (WHERE)" quick lesson again if you need it.
2. In the `ports` table the region is in the `region` column (value `'Europe'`) and the kind of port is in the `kind` column (`'SEAPORT'` or `'AIRPORT'`). Join the two conditions with `AND`; text values go in single quotes.
3. `SELECT code, name, country FROM ports WHERE region = ... AND kind = ...`
````

**Ghi lại `content/tickets/ch1/ch1-03.md`** (ghi cả file):
````markdown
---
id: ch1-03
chapter: 1
title: Năng lực hàng nặng tháng {{month}}
title_en: Heavy cargo in {{month_en}}
from: { name: Lê Bình, dept: Sales }
difficulty: 2
beat: twist
requires: [select, where]
grants: [order_by, limit]
tables: [shipments]
ordered: true
columns:
  - { vi: "Mã lô", en: "Shipment ref" }
  - { vi: "Tổng trọng lượng (kg)", en: "Gross weight (kg)" }
variants:
  - { month: "10/2026", month_en: "October 2026", from: "2026-10-01", to: "2026-11-01" }
  - { month: "08/2026", month_en: "August 2026", from: "2026-08-01", to: "2026-09-01" }
  - { month: "05/2026", month_en: "May 2026", from: "2026-05-01", to: "2026-06-01" }
reflect:
  q: { vi: "Vì sao phải xếp thêm theo mã lô sau trọng lượng?", en: "Why sort by shipment ref as well, after the weight?" }
  options:
    - { vi: "Hai lô nặng bằng nhau có thể đổi chỗ giữa các lần chạy; mã lô làm thứ tự cố định, nên 10 dòng đầu lần nào cũng như nhau", en: "Two shipments of the same weight can swap places between runs; the ref fixes the order, so the first 10 rows are the same every time" }
    - { vi: "Để câu chạy nhanh hơn", en: "To make the query run faster" }
    - { vi: "Vì LIMIT bắt buộc phải có hai tiêu chí sắp xếp", en: "Because LIMIT requires two sort keys" }
  answer: 0
  why: { vi: "ORDER BY chỉ cố định thứ tự theo các cột bạn ghi. Các dòng trùng giá trị được trả theo thứ tự bất kỳ, nên ranh giới của LIMIT có thể đổi.", en: "ORDER BY only fixes the order by the columns you list. Rows with equal values come back in any order, so the LIMIT cut-off can move." }
wrong:
  - sql: "SELECT ref, gross_weight_kg FROM shipments WHERE direction = 'EXPORT' AND mode = 'SEA' AND booking_date >= '{{from}}' AND booking_date < '{{to}}' ORDER BY gross_weight_kg, ref LIMIT 10"
    vi: "Đây là 10 lô nhẹ nhất. Muốn lô nặng nhất lên đầu thì xếp giảm dần."
    en: "These are the 10 lightest shipments. To put the heaviest first, sort in descending order."
  - sql: "SELECT ref, gross_weight_kg FROM shipments WHERE direction = 'EXPORT' AND mode = 'SEA' AND etd >= '{{from}}' AND etd < '{{to}}' ORDER BY gross_weight_kg DESC, ref LIMIT 10"
    vi: "Bạn đang lọc theo ngày đi dự kiến. Đề hỏi các lô được booking trong tháng, tức theo ngày đặt chỗ."
    en: "You are filtering on the estimated departure date. The request is about shipments booked in the month, so it is the booking date."
---
Một nhà máy thép đang cân nhắc chuyển hàng sang mình. Họ hỏi mình đã từng nhận những lô nặng cỡ nào, và mình muốn trả lời bằng chính các lô gần đây.

## Task
Gửi mình 10 lô hàng xuất khẩu đi đường biển nặng nhất, trong số các lô booking trong tháng {{month}}: mã lô và tổng trọng lượng (kg). Tính mọi booking trong tháng, kể cả lô sau đó bị hủy, vì khách chỉ hỏi mình đã nhận booking cỡ nào. Lô nặng nhất lên đầu; hai lô nặng bằng nhau thì lô có mã nhỏ hơn đứng trước.

## Hints
1. Đây là bài lọc, sắp xếp rồi lấy top N: lọc ba điều kiện (hàng xuất, đi đường biển, ngày đặt chỗ trong tháng {{month}}), xếp theo trọng lượng giảm dần, lô nào trùng trọng lượng thì xếp tiếp theo mã lô (tiêu chí sắp xếp phụ), rồi chỉ giữ 10 dòng đầu. Ngày so sánh được như số: ngày sau lớn hơn ngày trước. Xem lại Bài học nhanh "Sắp xếp (ORDER BY)" và "Lấy top N (LIMIT)" nếu cần.
2. Bảng `shipments`: chiều hàng ở `direction` (`'EXPORT'`), phương thức ở `mode` (`'SEA'`), ngày đặt chỗ ở `booking_date`, trọng lượng ở `gross_weight_kg`, mã lô ở `ref`. Tháng {{month}}: `booking_date >= '{{from}}' AND booking_date < '{{to}}'`. Giảm dần dùng `DESC`.
3. `SELECT ref, gross_weight_kg FROM shipments WHERE ... ORDER BY gross_weight_kg DESC, ref LIMIT 10`

## Solution
```sql
SELECT ref, gross_weight_kg
FROM shipments
WHERE direction = 'EXPORT' AND mode = 'SEA'
  AND booking_date >= '{{from}}' AND booking_date < '{{to}}'
ORDER BY gross_weight_kg DESC, ref
LIMIT 10
```

# EN
A steel plant is thinking about moving its cargo to us. They asked how heavy the shipments we have handled are, and I want to answer with our own recent shipments.

## Task
Send me the 10 heaviest export shipments by sea among those booked in {{month_en}}: shipment ref and gross weight (kg). Count every booking of the month, including ones cancelled later, because the customer only asks what size of booking we take on. Heaviest first; if two weigh the same, the one with the smaller ref comes first.

## Hints
1. This is filter, sort, then take the top N: filter on three conditions (exports, by sea, booking date in {{month_en}}), sort by weight from heaviest to lightest, break ties by shipment ref (a tie-breaker), then keep only the first 10 rows. Dates compare like numbers: a later date is greater than an earlier one. Open the "Sort (ORDER BY)" and "Top N (LIMIT)" quick lessons again if you need them.
2. Table `shipments`: the direction is in `direction` (`'EXPORT'`), the mode in `mode` (`'SEA'`), the booking date in `booking_date`, the weight in `gross_weight_kg`, the shipment ref in `ref`. {{month_en}}: `booking_date >= '{{from}}' AND booking_date < '{{to}}'`. Descending order uses `DESC`.
3. `SELECT ref, gross_weight_kg FROM shipments WHERE ... ORDER BY gross_weight_kg DESC, ref LIMIT 10`
````

**Ghi lại `content/tickets/ch1/ch1-04.md`** (ghi cả file):
````markdown
---
id: ch1-04
chapter: 1
title: Xếp ca khai báo mùa cao điểm
title_en: Peak-season declaration roster
from: { name: Hoàng Ngọc, dept: Customs }
difficulty: 1
beat: rest
requires: [select, where]
grants: []
tables: [employees]
scene: { kind: yard }
columns:
  - { vi: "Họ tên", en: "Full name" }
  - { vi: "Chức danh", en: "Job title" }
reflect:
  q: { vi: "Phòng Hải quan được lưu là 'Customs'. Làm sao biết trước giá trị đó viết thế nào?", en: "The Customs team is stored as 'Customs'. How do you find out how a value is written?" }
  options:
    - { vi: "Xem các giá trị của cột phòng ban trong tab Cột, hoặc chạy thử một câu xem dữ liệu", en: "Look at the values of the department column in the Columns tab, or run a quick query to look at the data" }
    - { vi: "Đoán theo tên phòng bằng tiếng Việt", en: "Guess from the team name in Vietnamese" }
    - { vi: "Postgres tự hiểu 'Hải quan' là 'Customs'", en: "Postgres knows that 'Hai quan' means 'Customs'" }
  answer: 0
  why: { vi: "Phép so sánh chữ phải khớp đúng từng ký tự với dữ liệu, nên analyst luôn xem giá trị thật của cột trước khi lọc.", en: "A text comparison must match the data character for character, so an analyst always looks at a column's real values before filtering on it." }
---
Cuối năm số tờ khai tăng gấp đôi, mình phải xếp ca cho đội khai báo. Mình cần biết trong phòng có ai, chức danh gì, để chia người ký duyệt và người khai báo cho hợp lý.

## Task
Gửi mình họ tên và chức danh của nhân viên, chỉ những người thuộc phòng Hải quan. Không cần sắp xếp.

## Hints
1. Đây lại là bài lọc dòng, nhưng trên danh sách nhân viên chứ không phải lô hàng: chỉ giữ người thuộc phòng Hải quan. Tên phòng được lưu bằng tiếng Anh; tab Cột cho xem các giá trị của cột phòng ban.
2. Bảng `employees` có `full_name`, `title`, và phòng ban ở cột `dept`; phòng Hải quan được lưu là `'Customs'`.
3. `SELECT full_name, title FROM employees WHERE dept = ...`

## Solution
```sql
SELECT full_name, title FROM employees WHERE dept = 'Customs'
```

# EN
At year end the number of customs declarations doubles, and I have to plan shifts for the declaration team. I need to know who is in the team and their job titles, so I can split the work between the people who approve and the people who file.

## Task
Send me the full name and job title of the staff, only the people in the Customs team. Any order of rows is fine.

## Hints
1. This is a row filter again, but on the staff list instead of the shipments: keep only the people in the Customs team. Team names are stored in English; the Columns tab shows the values of the department column.
2. The `employees` table has `full_name`, `title`, and the department in the `dept` column; the Customs team is stored as `'Customs'`.
3. `SELECT full_name, title FROM employees WHERE dept = ...`
````

**Ghi lại `content/tickets/ch2/ch2-01.md`** (ghi cả file):
````markdown
---
id: ch2-01
chapter: 2
title: Số liệu hoạt động cho báo cáo năm 2025
title_en: Activity figures for the 2025 annual report
from: { name: Nguyễn Quang, dept: Finance }
difficulty: 1
beat: teach
requires: [select, where]
grants: [aggregate]
tables: [shipments]
scene: { kind: yard }
columns:
  - { vi: "Số lô", en: "Shipments" }
  - { vi: "Tổng trọng lượng (kg)", en: "Total weight (kg)" }
  - { vi: "Trọng lượng trung bình mỗi lô (kg)", en: "Average weight per shipment (kg)" }
reflect:
  q: { vi: "Điều kiện bỏ lô hủy được xét lúc nào so với các hàm gộp?", en: "When is the condition that drops cancelled shipments applied, compared with the aggregates?" }
  options:
    - { vi: "Trước: WHERE lọc dòng xong thì hàm gộp mới tính trên các dòng còn lại", en: "Before: WHERE filters the rows first, then the aggregates work on the rows that are left" }
    - { vi: "Sau: hàm gộp tính trên mọi dòng rồi mới trừ lô hủy", en: "After: the aggregates use every row, then the cancelled ones are taken off" }
    - { vi: "Chỉ COUNT(*) bỏ lô hủy, SUM và AVG vẫn tính cả", en: "Only COUNT(*) drops cancelled shipments; SUM and AVG still include them" }
  answer: 0
  why: { vi: "Postgres lọc dòng ở WHERE trước, rồi mới gộp, nên cả ba con số đều chỉ tính các lô thỏa điều kiện.", en: "Postgres filters rows in WHERE first and aggregates afterwards, so all three figures count only the matching shipments." }
wrong:
  - sql: "SELECT COUNT(*), SUM(gross_weight_kg), ROUND(AVG(gross_weight_kg), 2) FROM shipments WHERE booking_date >= '2025-01-01' AND booking_date < '2026-01-01'"
    vi: "Các con số đang tính cả lô đã hủy. Đề chỉ cần hoạt động thật, nên bỏ các lô hủy."
    en: "Your figures include cancelled shipments. The request is about real business only, so leave the cancelled ones out."
---
Mình đang chốt báo cáo năm 2025 gửi ngân hàng để gia hạn hạn mức tín dụng. Ngân hàng muốn thấy quy mô hoạt động thật của công ty trong năm.

## Task
Cho mình ba con số của năm 2025: số lô, tổng trọng lượng (kg) và trọng lượng trung bình mỗi lô (kg, làm tròn 2 chữ số thập phân). Chỉ tính các lô booking trong năm 2025 và bỏ các lô đã hủy, vì lô hủy không phải hoạt động thật. Kết quả là một dòng duy nhất.

## Hints
1. Đây là bài hàm gộp: gom nhiều lô thành một con số (một phép đếm, một phép cộng, một phép tính trung bình), làm trên tập lô đã lọc theo năm 2025 và đã bỏ lô hủy. Kết quả chỉ có một dòng. Xem lại Bài học nhanh "COUNT/SUM/AVG/MIN/MAX, ROUND" nếu cần.
2. Bảng `shipments`: ngày đặt chỗ ở `booking_date`, trạng thái ở `status` (lô hủy là `'CANCELLED'`), trọng lượng ở `gross_weight_kg`. Hàm gộp: `COUNT(*)` đếm, `SUM(x)` cộng, `AVG(x)` tính trung bình, `ROUND(x, 2)` làm tròn. Máy chấm so số sau khi làm tròn 2 chữ số, nên thiếu `ROUND` vẫn được tính đúng.
3. `SELECT COUNT(*), SUM(gross_weight_kg), ROUND(AVG(gross_weight_kg), 2) FROM shipments WHERE booking_date >= '2025-01-01' AND booking_date < '2026-01-01' AND ...`

## Solution
```sql
SELECT COUNT(*), SUM(gross_weight_kg), ROUND(AVG(gross_weight_kg), 2)
FROM shipments
WHERE booking_date >= '2025-01-01' AND booking_date < '2026-01-01'
  AND status <> 'CANCELLED'
```

# EN
I am closing the 2025 annual report for our bank, to renew our credit line. The bank wants to see how much real business the company did during the year.

## Task
Give me three figures for 2025: the number of shipments, the total weight (kg) and the average weight per shipment (kg, rounded to 2 decimal places). Count only shipments booked in 2025 and leave out cancelled ones, because a cancelled shipment is not real business. The answer is a single row.

## Hints
1. This is an aggregate task: turn many shipments into one number each (a count, a sum and an average), computed over the shipments of 2025 with the cancelled ones removed. The answer has a single row. Open the "COUNT/SUM/AVG/MIN/MAX, ROUND" quick lesson again if you need it.
2. Table `shipments`: the booking date is in `booking_date`, the status in `status` (cancelled is `'CANCELLED'`), the weight in `gross_weight_kg`. Aggregates: `COUNT(*)` counts, `SUM(x)` adds up, `AVG(x)` averages, `ROUND(x, 2)` rounds. The grader compares numbers after rounding them to 2 decimals, so an answer without `ROUND` still counts as correct.
3. `SELECT COUNT(*), SUM(gross_weight_kg), ROUND(AVG(gross_weight_kg), 2) FROM shipments WHERE booking_date >= '2025-01-01' AND booking_date < '2026-01-01' AND ...`
````

**Ghi lại `content/tickets/ch2/ch2-02.md`** (ghi cả file):
````markdown
---
id: ch2-02
chapter: 2
title: Cơ cấu sản lượng 2025
title_en: 2025 volume mix
from: { name: Lê Bình, dept: Sales }
difficulty: 2
beat: develop
format: faded
requires: [aggregate]
grants: [group_by]
tables: [shipments]
columns:
  - { vi: "Phương thức vận chuyển", en: "Transport mode" }
  - { vi: "Chiều hàng (xuất/nhập)", en: "Direction (export/import)" }
  - { vi: "Số lô", en: "Shipments" }
starter: |
  SELECT mode, direction, COUNT(*)
  FROM shipments
  WHERE booking_date >= '2025-01-01' AND booking_date < '2026-01-01'
    AND ___
  GROUP BY ___
reflect:
  q: { vi: "Nếu chỉ gom theo phương thức mà vẫn để chiều hàng trong danh sách cột thì sao?", en: "What if you group by mode only but keep the direction in the column list?" }
  options:
    - { vi: "Postgres báo lỗi: cột không nằm trong hàm gộp thì phải có trong GROUP BY", en: "Postgres raises an error: a column outside an aggregate must be in GROUP BY" }
    - { vi: "Ra đúng kết quả như cũ", en: "You get the same result as before" }
    - { vi: "Mỗi lô thành một dòng riêng", en: "Every shipment becomes its own row" }
  answer: 0
  why: { vi: "Mỗi nhóm chỉ ra một dòng, nên mỗi cột trong danh sách phải là cột gom nhóm hoặc một hàm gộp.", en: "Each group gives one row, so every listed column must be a grouping column or an aggregate." }
wrong:
  - sql: "SELECT mode, direction, COUNT(*) FROM shipments WHERE booking_date >= '2025-01-01' AND booking_date < '2026-01-01' GROUP BY mode, direction"
    vi: "Số lô đang tính cả lô đã hủy. Đề nói không tính lô hủy."
    en: "Your counts include cancelled shipments. The request leaves them out."
---
Mình đang làm kế hoạch bán hàng 2026, và cần biết năm 2025 công ty sống nhờ mảng nào: hàng biển hay hàng air, hàng xuất hay hàng nhập. Mảng nào mỏng thì năm sau đẩy mạnh.

Câu SQL trong editor đã viết gần xong, chỉ còn hai chỗ trống ___: một điều kiện lọc và thứ cần gom nhóm. Bạn điền cho đủ rồi nộp.

## Task
Với các lô booking trong năm 2025, không tính lô đã hủy: mỗi tổ hợp phương thức vận chuyển (biển hoặc air) và chiều hàng (xuất hoặc nhập) có bao nhiêu lô? Mỗi tổ hợp một dòng, gồm phương thức, chiều hàng, số lô. Không cần sắp xếp.

## Hints
1. Đây là bài gom nhóm: vẫn là phép đếm, nhưng đếm riêng cho từng nhóm lô có cùng phương thức và cùng chiều hàng, nên kết quả có nhiều dòng chứ không chỉ một con số. Xem lại Bài học nhanh "Gom nhóm (GROUP BY)" nếu cần.
2. Bảng `shipments`: phương thức ở `mode`, chiều hàng ở `direction`. `GROUP BY mode, direction` gom các lô có cùng cặp giá trị; `COUNT(*)` đếm trong từng nhóm. Điều kiện năm và lô hủy giống việc trước.
3. `SELECT mode, direction, COUNT(*) FROM shipments WHERE ... GROUP BY mode, direction`

## Solution
```sql
SELECT mode, direction, COUNT(*)
FROM shipments
WHERE booking_date >= '2025-01-01' AND booking_date < '2026-01-01'
  AND status <> 'CANCELLED'
GROUP BY mode, direction
```

# EN
I am writing the 2026 sales plan, and I need to know what carried us in 2025: sea or air, exports or imports. Whatever is thin gets a push next year.

The SQL in the editor is nearly done; only two blanks ___ are left: one filter condition and what to group by. Fill them in and submit.

## Task
For shipments booked in 2025, leaving out cancelled ones: how many shipments does each combination of transport mode (sea or air) and direction (export or import) have? One row per combination, with the mode, the direction and the number of shipments. Any order of rows is fine.

## Hints
1. This is a grouping task: still a count, but a separate count for each group of shipments with the same mode and the same direction, so the answer has several rows instead of one number. Open the "Group by" quick lesson again if you need it.
2. Table `shipments`: the mode is in `mode`, the direction in `direction`. `GROUP BY mode, direction` puts shipments with the same pair of values together; `COUNT(*)` counts inside each group. The year and cancellation conditions are the same as in the previous task.
3. `SELECT mode, direction, COUNT(*) FROM shipments WHERE ... GROUP BY mode, direction`
````

**Ghi lại `content/tickets/ch2/ch2-03.md`** (ghi cả file):
````markdown
---
id: ch2-03
chapter: 2
title: Khách hàng chủ lực 2025
title_en: Key accounts of 2025
from: { name: Lê Bình, dept: Sales }
difficulty: 2
beat: twist
requires: [group_by]
grants: [having]
tables: [shipments]
columns:
  - { vi: "Mã khách hàng", en: "Customer code" }
  - { vi: "Số lô năm 2025", en: "Shipments in 2025" }
variants:
  - { min: 150 }
  - { min: 120 }
  - { min: 200 }
reflect:
  q: { vi: "Vì sao điều kiện \"hơn {{min}} lô\" không đặt ở WHERE được?", en: "Why can the \"more than {{min}} shipments\" condition not go in WHERE?" }
  options:
    - { vi: "WHERE xét từng lô trước khi gom; lúc đó chưa có số lô của mỗi khách", en: "WHERE looks at single shipments before grouping; at that point there is no count per customer yet" }
    - { vi: "WHERE không so sánh được với số", en: "WHERE cannot compare with a number" }
    - { vi: "Đặt ở WHERE cũng được, chỉ chạy chậm hơn", en: "WHERE works too, it is just slower" }
  answer: 0
  why: { vi: "Thứ tự xử lý là WHERE lọc dòng, GROUP BY gom nhóm, rồi HAVING lọc nhóm theo kết quả gộp.", en: "The order is: WHERE filters rows, GROUP BY builds the groups, then HAVING filters the groups on the aggregate." }
wrong:
  - sql: "SELECT customer_id, COUNT(*) FROM shipments WHERE booking_date >= '2025-01-01' AND booking_date < '2026-01-01' AND status <> 'CANCELLED' GROUP BY customer_id HAVING COUNT(*) > {{min}}"
    vi: "Bạn đang bỏ lô hủy. Ở việc này lô hủy vẫn được tính, vì đó vẫn là nhu cầu thật của khách."
    en: "You are leaving out cancelled shipments. Here they still count, because they are still real demand from the customer."
---
Ban giám đốc sắp mời các khách chủ lực dự hội nghị khách hàng cuối năm. Tiêu chí là khách đã đặt hơn {{min}} lô trong năm 2025. Tính cả lô bị hủy: đó vẫn là nhu cầu thật của khách, và team booking vẫn mất công xử lý.

## Task
Gửi mình mã khách hàng và số lô năm 2025 của từng khách đạt tiêu chí (hơn {{min}} lô, không tính khách đúng {{min}} lô). Tên khách thì CSKH sẽ tra sau, lúc này mã khách là đủ. Không cần sắp xếp.

## Hints
1. Đây là bài lọc nhóm: đếm số lô của từng khách trong năm 2025, rồi chỉ giữ những nhóm có kết quả đếm lớn hơn {{min}}. Điều kiện "hơn {{min}}" áp lên con số sau khi đếm, không áp lên từng lô. Xem lại Bài học nhanh "Lọc nhóm (HAVING)" nếu cần.
2. Bảng `shipments`, gom theo `customer_id`. `WHERE` lọc từng lô trước khi gom; điều kiện trên kết quả đếm đặt ở `HAVING COUNT(*) > {{min}}`, sau `GROUP BY`.
3. `SELECT customer_id, COUNT(*) FROM shipments WHERE ... GROUP BY customer_id HAVING ...`

## Solution
```sql
SELECT customer_id, COUNT(*)
FROM shipments
WHERE booking_date >= '2025-01-01' AND booking_date < '2026-01-01'
GROUP BY customer_id
HAVING COUNT(*) > {{min}}
```

# EN
The board is about to invite our key accounts to the year-end customer conference. The rule is: customers who booked more than {{min}} shipments in 2025. Cancelled shipments count too: they are still real demand from the customer, and the booking team still had to handle them.

## Task
Send me the customer code and the number of 2025 shipments of every customer who meets the rule (more than {{min}} shipments; exactly {{min}} does not qualify). Customer service will look up the names later, so the customer code is enough for now. Any order of rows is fine.

## Hints
1. This is a group filter: count each customer's shipments in 2025, then keep only the groups whose count is above {{min}}. The "above {{min}}" condition applies to the number after counting, not to single shipments. Open the "Filter groups" quick lesson again if you need it.
2. Table `shipments`, grouped by `customer_id`. `WHERE` filters single shipments before grouping; a condition on the count goes in `HAVING COUNT(*) > {{min}}`, after `GROUP BY`.
3. `SELECT customer_id, COUNT(*) FROM shipments WHERE ... GROUP BY customer_id HAVING ...`
````

**Ghi lại `content/tickets/ch2/ch2-04.md`** (ghi cả file):
````markdown
---
id: ch2-04
chapter: 2
title: Số lô đang trên đường
title_en: Shipments on the way
from: { name: Hoàng Khánh, dept: Ops }
difficulty: 1
beat: rest
requires: [aggregate]
grants: []
tables: [shipments]
columns:
  - { vi: "Số lô đang trên đường", en: "Shipments in transit" }
reflect:
  q: { vi: "Vì sao không tự suy \"đang trên đường\" từ ngày đi và ngày đến dự kiến?", en: "Why not work out \"on the way\" from the estimated departure and arrival dates?" }
  options:
    - { vi: "Trạng thái đã ghi sẵn trên từng lô; suy từ ngày dự kiến sẽ sai với lô trễ, lô hủy hay lô chưa cập nhật", en: "The status is already recorded on each shipment; working it out from estimated dates goes wrong for late, cancelled or not-yet-updated shipments" }
    - { vi: "Vì cột ngày không so sánh được", en: "Because date columns cannot be compared" }
    - { vi: "Vì đếm theo ngày luôn ra 0", en: "Because counting by dates always gives 0" }
  answer: 0
  why: { vi: "Khi dữ liệu đã có cột trạng thái, hãy dùng nó: ngày dự kiến chỉ là kế hoạch, không phải điều đã xảy ra.", en: "When the data already has a status column, use it: estimated dates are only the plan, not what actually happened." }
---
Sáng nào Ops cũng giao ban bằng một con số: hiện có bao nhiêu lô đang trên đường. Con số đó cho biết đội theo dõi lô hôm nay có quá tải không. Mình cần ngay cho buổi giao ban.

## Task
Hiện có tổng cộng bao nhiêu lô đang trên đường? Tính mọi lô đang ở trạng thái này, không giới hạn thời gian, phương thức hay tuyến. Kết quả là một con số.

## Hints
1. Đây là bài hàm gộp có lọc: lọc các lô có trạng thái "đang trên đường", rồi đếm chúng. Trạng thái của từng lô đã được ghi sẵn, không cần tự suy từ ngày đi hay ngày đến.
2. Bảng `shipments`, cột `status`, giá trị `'IN_TRANSIT'`; đếm bằng `COUNT(*)`.
3. `SELECT COUNT(*) FROM shipments WHERE status = ...`

## Solution
```sql
SELECT COUNT(*) FROM shipments WHERE status = 'IN_TRANSIT'
```

# EN
Every morning Ops opens its stand-up with one number: how many shipments are on the way right now. It tells us whether the tracking team is overloaded today. I need it now for the stand-up.

## Task
How many shipments are on the way right now, in total? Count every shipment in that status, with no limit on dates, mode or lane. The answer is a single number.

## Hints
1. This is an aggregate with a filter: keep the shipments whose status is "on the way", then count them. Each shipment's status is already recorded, so there is no need to work it out from departure or arrival dates.
2. Table `shipments`, column `status`, value `'IN_TRANSIT'`; count with `COUNT(*)`.
3. `SELECT COUNT(*) FROM shipments WHERE status = ...`
````

**Ghi lại `content/tickets/ch3/ch3-01.md`** (ghi cả file):
````markdown
---
id: ch3-01
chapter: 3
title: Booking mới nhất cần gọi xác nhận
title_en: Latest bookings to confirm by phone
from: { name: Võ Thu, dept: CS }
difficulty: 2
beat: teach
requires: [select, order_by, limit]
grants: [join]
tables: [shipments, customers]
ordered: true
columns:
  - { vi: "Mã lô", en: "Shipment ref" }
  - { vi: "Ngày đặt chỗ", en: "Booking date" }
  - { vi: "Tên khách hàng", en: "Customer name" }
reflect:
  q: { vi: "Trong câu tham khảo, s và c là gì?", en: "In the reference query, what are s and c?" }
  options:
    - { vi: "Tên ngắn (alias) đặt cho bảng shipments và customers, để biết mỗi cột thuộc bảng nào", en: "Short names (aliases) for the shipments and customers tables, to tell which table each column belongs to" }
    - { vi: "Hai cột mới trong kết quả", en: "Two new columns in the result" }
    - { vi: "Hai bảng tạm Postgres tự tạo ra", en: "Two temporary tables Postgres creates" }
  answer: 0
  why: { vi: "Alias viết ngay sau tên bảng (FROM shipments s). Khi hai bảng có cột trùng tên như id hay name, s.id và c.id cho biết đang nói cột nào.", en: "An alias goes right after the table name (FROM shipments s). When two tables share a column name such as id or name, s.id and c.id say which one you mean." }
wrong:
  - sql: "SELECT s.ref, s.booking_date, c.name FROM shipments s JOIN customers c ON c.id = s.id ORDER BY s.booking_date DESC, s.ref DESC LIMIT 10"
    vi: "Tên khách không khớp với lô: bạn đang nối mã khách với mã lô. Lô trỏ tới khách qua cột mã khách của lô."
    en: "The customer names do not match the shipments: you are matching the customer id with the shipment id. A shipment points to its customer through its customer id column."
---
CSKH có quy định: mọi booking mới phải được gọi xác nhận với khách trong ngày. Bạn trực ca cần biết booking nào vừa vào và của khách nào, để gọi đúng người.

## Task
Gửi mình 10 booking mới nhất: mã lô, ngày đặt chỗ, tên khách hàng. Tính mọi lô, kể cả lô đã hủy, vì lô hủy cũng phải gọi xác nhận. Ngày đặt chỗ mới nhất lên đầu; cùng ngày thì lô có mã lớn hơn đứng trước. Tên khách nằm ở hồ sơ khách hàng, không nằm trên lô.

## Hints
1. Đây là bài nối 2 bảng: mã lô và ngày đặt chỗ là thông tin của lô hàng, còn tên khách nằm ở hồ sơ khách hàng. Nối mỗi lô với đúng khách của nó, rồi sắp xếp và lấy 10 dòng như đã học. Xem lại Bài học nhanh "Nối 2 bảng (JOIN)" nếu cần.
2. Lô ở `shipments`, khách ở `customers`; `shipments.customer_id` trỏ tới `customers.id`. Nối bằng `JOIN customers c ON c.id = s.customer_id`.
3. `SELECT s.ref, s.booking_date, c.name FROM shipments s JOIN customers c ON ... ORDER BY s.booking_date DESC, s.ref DESC LIMIT 10`

## Solution
```sql
SELECT s.ref, s.booking_date, c.name
FROM shipments s
JOIN customers c ON c.id = s.customer_id
ORDER BY s.booking_date DESC, s.ref DESC
LIMIT 10
```

# EN
Customer service has a rule: every new booking gets a confirmation call to the customer on the same day. Whoever is on shift needs to know which bookings just came in and for which customer, so they call the right person.

## Task
Send me the 10 latest bookings: shipment ref, booking date, customer name. Count every shipment, including cancelled ones, because those need a confirmation call too. Newest booking date first; on the same date, the larger ref comes first. The customer name is on the customer record, not on the shipment.

## Hints
1. This is a two-table join: the shipment ref and the booking date describe the shipment, while the customer name is on the customer record. Match each shipment with its own customer, then sort and keep 10 rows as before. Open the "Inner join" quick lesson again if you need it.
2. Shipments are in `shipments`, customers in `customers`; `shipments.customer_id` points to `customers.id`. Match them with `JOIN customers c ON c.id = s.customer_id`.
3. `SELECT s.ref, s.booking_date, c.name FROM shipments s JOIN customers c ON ... ORDER BY s.booking_date DESC, s.ref DESC LIMIT 10`
````

**Ghi lại `content/tickets/ch3/ch3-02.md`** (ghi cả file):
````markdown
---
id: ch3-02
chapter: 3
title: Sản lượng TEU theo hãng tàu quý 3
title_en: Q3 TEU by carrier
from: { name: Lê Bình, dept: Sales }
difficulty: 3
beat: develop
format: faded
requires: [join, group_by]
grants: [multi_join]
tables: [containers, shipments, carriers]
columns:
  - { vi: "Hãng tàu", en: "Carrier" }
  - { vi: "Tổng TEU", en: "Total TEU" }
starter: |
  SELECT ca.name, SUM(ct.teu)
  FROM containers ct
  JOIN shipments s ON ___
  JOIN carriers ca ON ___
  WHERE s.etd >= '2026-07-01' AND s.etd < '2026-10-01'
    AND s.status <> 'CANCELLED'
  GROUP BY ca.name
reflect:
  q: { vi: "Vì sao mỗi JOIN cần một điều kiện ON riêng?", en: "Why does every JOIN need its own ON condition?" }
  options:
    - { vi: "Mỗi lần nối phải nói cặp dòng nào khớp nhau; nối sai hay thiếu thì container ghép nhầm hãng và TEU bị nhân lên", en: "Each join must say which pairs of rows match; a wrong or missing match pairs containers with the wrong carriers and multiplies the TEU" }
    - { vi: "ON chỉ giúp câu chạy nhanh hơn", en: "ON only makes the query faster" }
    - { vi: "Chỉ JOIN cuối cùng mới cần ON", en: "Only the last JOIN needs an ON" }
  answer: 0
  why: { vi: "Mỗi JOIN nối thêm một bảng theo một khóa: container → lô qua mã lô, lô → hãng qua mã hãng. Thiếu một bước là số liệu sai.", en: "Every JOIN adds one table through one key: container → shipment by the shipment id, shipment → carrier by the carrier id. Miss one and the figures are wrong." }
wrong:
  - sql: "SELECT ca.name, SUM(ct.teu) FROM containers ct JOIN shipments s ON s.id = ct.shipment_id JOIN carriers ca ON ca.id = s.carrier_id WHERE s.etd >= '2026-07-01' AND s.etd < '2026-10-01' GROUP BY ca.name"
    vi: "Tổng TEU đang tính cả lô đã hủy. Đề nói không tính lô hủy."
    en: "Your totals include cancelled shipments. The request leaves them out."
  - sql: "SELECT ca.name, SUM(ct.teu) FROM containers ct JOIN shipments s ON s.id = ct.shipment_id JOIN carriers ca ON ca.id = s.carrier_id WHERE s.booking_date >= '2026-07-01' AND s.booking_date < '2026-10-01' AND s.status <> 'CANCELLED' GROUP BY ca.name"
    vi: "Bạn đang lọc theo ngày đặt chỗ. Đề hỏi theo ngày đi dự kiến (ETD)."
    en: "You are filtering on the booking date. The request is about the estimated departure (ETD)."
---
Sắp đàm phán giá cước năm sau. Hãng nào nhận nhiều TEU của mình thì mình có thế mặc cả, nên mình cần sản lượng thật đã đi với từng hãng.

Câu SQL trong editor đã viết gần xong, chỉ còn hai chỗ trống ___: điều kiện của hai phép nối. Bạn điền cho đủ rồi nộp.

## Task
Tính tổng TEU mình đã đặt với từng hãng tàu, gọi hãng bằng tên, cho các lô có ngày đi dự kiến (ETD) trong quý 3/2026 (từ 01/07 đến hết 30/09/2026), không tính lô đã hủy. Mỗi hãng một dòng: tên hãng, tổng TEU. Không cần sắp xếp.

## Hints
1. Đây là bài nối nhiều bảng: TEU thuộc từng container, ngày đi và trạng thái thuộc lô hàng, tên hãng thuộc danh mục hãng tàu. Đi từ container lên lô, rồi từ lô lên hãng; mỗi bước nối cần điều kiện riêng. Xem lại Bài học nhanh "Nối nhiều bảng" nếu cần.
2. `containers.shipment_id` trỏ tới `shipments.id`; `shipments.carrier_id` trỏ tới `carriers.id`. Quý 3: `etd >= '2026-07-01' AND etd < '2026-10-01'`; lô hủy có `status = 'CANCELLED'`.
3. `SELECT ca.name, SUM(ct.teu) FROM containers ct JOIN shipments s ON ... JOIN carriers ca ON ... WHERE ... GROUP BY ca.name`

## Solution
```sql
SELECT ca.name, SUM(ct.teu)
FROM containers ct
JOIN shipments s ON s.id = ct.shipment_id
JOIN carriers ca ON ca.id = s.carrier_id
WHERE s.etd >= '2026-07-01' AND s.etd < '2026-10-01'
  AND s.status <> 'CANCELLED'
GROUP BY ca.name
```

# EN
We are about to negotiate next year's freight rates. A carrier that gets a lot of our TEU gives us leverage, so I need the real volume we moved with each carrier.

The SQL in the editor is nearly done; only two blanks ___ are left: the conditions of the two joins. Fill them in and submit.

## Task
Work out the total TEU we booked with each carrier, named by carrier name, for shipments with an estimated departure (ETD) in Q3 2026 (1 July to 30 September 2026 inclusive), leaving out cancelled ones. One row per carrier: carrier name, total TEU. Any order of rows is fine.

## Hints
1. This is a multi-table join: TEU belongs to each container, the departure date and status belong to the shipment, the name belongs to the carrier list. Go from container up to shipment, then from shipment up to carrier; each join step needs its own condition. Open the "Multi-table join" quick lesson again if you need it.
2. `containers.shipment_id` points to `shipments.id`; `shipments.carrier_id` points to `carriers.id`. Q3: `etd >= '2026-07-01' AND etd < '2026-10-01'`; cancelled shipments have `status = 'CANCELLED'`.
3. `SELECT ca.name, SUM(ct.teu) FROM containers ct JOIN shipments s ON ... JOIN carriers ca ON ... WHERE ... GROUP BY ca.name`
````

**Ghi lại `content/tickets/ch3/ch3-03.md`** (ghi cả file):
````markdown
---
id: ch3-03
chapter: 3
title: Khách lâu không gửi hàng
title_en: Customers who went quiet
from: { name: Võ Thu, dept: CS }
difficulty: 3
beat: twist
requires: [join]
grants: [left_join, anti_join]
tables: [customers, shipments]
columns:
  - { vi: "Mã khách hàng", en: "Customer code" }
  - { vi: "Tên khách hàng", en: "Customer name" }
reflect:
  q: { vi: "Vì sao điều kiện ngày đặt ở ON mà không đặt ở WHERE?", en: "Why does the date condition go in ON and not in WHERE?" }
  options:
    - { vi: "Ở WHERE nó loại các dòng không nối được (ngày trống), nên LEFT JOIN thành nối thường và không còn khách nào để tìm", en: "In WHERE it drops the rows that found no match (empty date), so the LEFT JOIN turns into a plain join and no customer is left to find" }
    - { vi: "Đặt ở WHERE chạy chậm hơn", en: "WHERE is slower" }
    - { vi: "Hai chỗ cho cùng kết quả", en: "Both places give the same result" }
  answer: 0
  why: { vi: "ON quyết định dòng nào được ghép; WHERE lọc sau khi ghép. Điều kiện trên bảng bên phải đặt ở ON để giữ được khách không có lô nào.", en: "ON decides which rows get paired; WHERE filters after pairing. A condition on the right-hand table goes in ON so customers with no shipment survive." }
wrong:
  - sql: "SELECT DISTINCT c.id, c.name FROM customers c JOIN shipments s ON s.customer_id = c.id WHERE s.booking_date < '2026-03-01'"
    vi: "Đây là khách có booking trước 01/03/2026, kể cả khách vẫn gửi hàng sau đó. Đề cần khách không có booking nào từ ngày đó."
    en: "These are the customers with a booking before 1 March 2026, including those who kept shipping afterwards. The request wants customers with no booking at all from that date."
---
Có những khách cả mùa hè không gửi lô nào. CSKH muốn gọi hỏi thăm trước khi họ chuyển hẳn sang forwarder khác.

## Task
Gửi mình danh sách khách hàng không có booking nào từ ngày 01/03/2026 đến nay: mã khách và tên khách. Tính cả khách chưa từng booking lô nào. Không cần sắp xếp.

## Hints
1. Đây là bài tìm dòng không có cặp: bắt đầu từ danh sách khách hàng, giữ mọi khách kể cả khách không nối được lô nào, rồi chỉ lấy những khách không có lô nào từ 01/03/2026. Một phép nối thông thường sẽ làm mất đúng những khách bạn cần tìm. Xem lại Bài học nhanh "Giữ dòng không khớp (LEFT JOIN)" và "Tìm dòng không có cặp (anti-join)" nếu cần.
2. `customers` nối với `shipments` qua `shipments.customer_id`. `LEFT JOIN` giữ mọi khách; đặt điều kiện ngày `s.booking_date >= '2026-03-01'` vào `ON`, rồi giữ các dòng không nối được: `WHERE s.id IS NULL`.
3. `SELECT c.id, c.name FROM customers c LEFT JOIN shipments s ON s.customer_id = c.id AND ... WHERE s.id IS NULL`

## Solution
```sql
SELECT c.id, c.name
FROM customers c
LEFT JOIN shipments s ON s.customer_id = c.id AND s.booking_date >= '2026-03-01'
WHERE s.id IS NULL
```

# EN
Some customers have not sent a single shipment all summer. Customer service wants to call them before they move to another forwarder for good.

## Task
Send me the customers with no booking at all from 1 March 2026 until today: customer code and customer name. Include customers who have never booked anything. Any order of rows is fine.

## Hints
1. This is an anti-join, a search for rows with no match: start from the customer list, keep every customer even those that match no shipment, then take only the customers with no shipment from 1 March 2026 on. A plain join would drop exactly the customers you are looking for. Open the "Left join" and "Anti-join" quick lessons again if you need them.
2. `customers` matches `shipments` through `shipments.customer_id`. `LEFT JOIN` keeps every customer; put the date condition `s.booking_date >= '2026-03-01'` in the `ON`, then keep the rows that found no match: `WHERE s.id IS NULL`.
3. `SELECT c.id, c.name FROM customers c LEFT JOIN shipments s ON s.customer_id = c.id AND ... WHERE s.id IS NULL`
````

**Ghi lại `content/tickets/ch3/ch3-04.md`** (ghi cả file):
````markdown
---
id: ch3-04
chapter: 3
title: Danh mục khách của từng sales
title_en: Customer portfolio per sales rep
from: { name: Lê Bình, dept: Sales }
difficulty: 2
beat: rest
requires: [join, group_by]
grants: []
tables: [employees, customers]
columns:
  - { vi: "Nhân viên quản lý khách", en: "Account owner" }
  - { vi: "Số khách hàng", en: "Customers" }
reflect:
  q: { vi: "Vì sao gom theo cả mã nhân viên chứ không chỉ họ tên?", en: "Why group by the employee id as well, not only the full name?" }
  options:
    - { vi: "Hai nhân viên có thể trùng họ tên; gom theo mã để không gộp hai người làm một", en: "Two employees can share a full name; grouping by id keeps them from merging into one" }
    - { vi: "Gom theo họ tên thì Postgres báo lỗi", en: "Grouping by the name makes Postgres raise an error" }
    - { vi: "Để kết quả có thêm một cột", en: "To add a column to the result" }
  answer: 0
  why: { vi: "Mã (khóa chính) luôn khác nhau giữa hai người; họ tên thì không chắc. Gom theo khóa rồi hiện tên là cách an toàn.", en: "The id (primary key) is always different for two people; a name is not. Group by the key and show the name: that is the safe way." }
---
Đầu năm mình chia lại khách cho team Sales: ai đang ôm quá nhiều khách thì chuyển bớt cho người ít hơn.

## Task
Mỗi nhân viên đang quản lý ít nhất một khách hàng thì quản lý bao nhiêu khách? Người quản lý là người đứng tên trong hồ sơ khách hàng. Gửi mình họ tên nhân viên và số khách; nhân viên không quản lý khách nào thì bỏ qua. Không cần sắp xếp.

## Hints
1. Đây là bài nối 2 bảng rồi gom nhóm: mỗi khách có đúng một người quản lý ghi trong hồ sơ khách. Nối từng khách với nhân viên đó, rồi đếm số khách của mỗi nhân viên.
2. `customers.sales_rep_id` trỏ tới `employees.id`; họ tên ở `employees.full_name`. Gom theo `GROUP BY e.id, e.full_name` để hai người trùng tên không bị gộp làm một.
3. `SELECT e.full_name, COUNT(c.id) FROM employees e JOIN customers c ON ... GROUP BY e.id, e.full_name`

## Solution
```sql
SELECT e.full_name, COUNT(c.id)
FROM employees e
JOIN customers c ON c.sales_rep_id = e.id
GROUP BY e.id, e.full_name
```

# EN
At the start of the year I rebalance the customers across the Sales team: whoever holds too many hands some over to someone with fewer.

## Task
For each employee who owns at least one customer account, how many customers do they own? The owner is the person named on the customer record. Send me the employee's full name and the number of customers; leave out employees who own no customer. Any order of rows is fine.

## Hints
1. This is a two-table join followed by grouping: each customer has exactly one owner, recorded on the customer record. Match each customer with that employee, then count the customers of each employee.
2. `customers.sales_rep_id` points to `employees.id`; the full name is in `employees.full_name`. Group with `GROUP BY e.id, e.full_name` so two people with the same name are not merged.
3. `SELECT e.full_name, COUNT(c.id) FROM employees e JOIN customers c ON ... GROUP BY e.id, e.full_name`
````

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `npx vitest run tests/content.test.ts tests/tickets.test.ts && npx tsc --noEmit`
Expected: PASS. Mọi `wrong:` mới chạy ra dòng và khác Solution ở mọi biến thể; đề vẫn qua SQLISH.

- [ ] **Step 5: Chạy toàn bộ rồi commit**

Run: `npm test`
Expected: mọi test PASS (1531 test).

```bash
git add content/TEMPLATE.md content/tickets/ch1/ch1-01.md content/tickets/ch1/ch1-02.md content/tickets/ch1/ch1-03.md content/tickets/ch1/ch1-04.md content/tickets/ch2/ch2-01.md content/tickets/ch2/ch2-02.md content/tickets/ch2/ch2-03.md content/tickets/ch2/ch2-04.md content/tickets/ch3/ch3-01.md content/tickets/ch3/ch3-02.md content/tickets/ch3/ch3-03.md content/tickets/ch3/ch3-04.md tests/content.test.ts
git commit -m "content: chapters 1-3 get reflect, one faded task each, wrong-answer tips, cue phrases and concept-first hint 1 (v4 §E.2, §E.4)

Claude-Session: https://claude.ai/code/session_01PwPSBV1SVDP6quEZfKN56M"
```

---

### Task 4: Mô hình bài học + 11 bài học nhanh ch1–3 (VI + EN)

**Files:** `content/lessons.yml`, `scripts/check-budget.mjs`, `src/content.ts`, `src/lessonSources.ts`, `src/lessons.ts`, `tests/lessons.test.ts`

**Interfaces:**
- Produces (Task 5 dùng):
  - `Lesson`, `parseLessons(source)`, `cueIn(cue, text)`.
  - `LESSONS_KEY = 'cargo-query/lessons'`, `loadLessonPrefs(storage?)`, `markLesson(id, tried?, storage?)` (`src/lessons.ts`).
  - `loadLessons(): Map<string, Lesson>` (`src/content.ts`).
  - Chunk `lessonSources-*.js`, nhóm ngân sách `lessons`.

- [ ] **Step 1: Viết test**

**Tạo `tests/lessons.test.ts`:**
```ts
import { describe, expect, it } from 'vitest';
import { loadLessons, loadTicketTemplates } from '../src/content';
import { compareResults } from '../src/grader';
import { cueIn, LESSONS_KEY, loadLessonPrefs, markLesson, parseLessons, type Lesson } from '../src/lessons';
import { CHAPTER_TABLES, SKILLS, tablesUnlocked } from '../src/progress';
import { textOf } from '../src/tickets';
import { applyVariant, variantsOf } from '../src/variants';
import { runner } from './helpers';

const VI_DIACRITIC = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
const codeSpans = (s: string): string[] => [...s.matchAll(/`([^`]+)`/g)].map((m) => m[1]).sort();
const ALL_TABLES = Object.values(CHAPTER_TABLES).flat();
const tablesIn = (sql: string): string[] =>
  [...new Set([...sql.matchAll(/\b(?:from|join)\s+([a-z_][a-z0-9_]*)/gi)].map((m) => m[1].toLowerCase()))].filter((x) => ALL_TABLES.includes(x));

const fakeKV = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
};

const ENTRY = `
- id: where
  cues: { vi: ["chỉ …"], en: ["only …"] }
  concept: { vi: "khái niệm", en: "concept" }
  example: "SELECT 1"
  explain: { vi: "giải thích", en: "notes" }
  mistake: { sql: "SELECT", vi: "sai", en: "wrong" }
  try: { task: { vi: "thử", en: "try" }, starter: "SELECT 1", solution: "SELECT 2" }
  docs: https://www.postgresql.org/docs/current/queries-table-expressions.html`;

describe('parseLessons, cueIn, pref bài học', () => {
  it('đọc một mục hợp lệ; ordered mặc định false', () => {
    const [l] = parseLessons(ENTRY);
    expect(l).toMatchObject({ id: 'where', cues: { vi: ['chỉ …'], en: ['only …'] }, mistake: { sql: 'SELECT', why: { vi: 'sai', en: 'wrong' } } });
    expect(l.try).toEqual({ task: { vi: 'thử', en: 'try' }, starter: 'SELECT 1', solution: 'SELECT 2', ordered: false });
  });

  it('báo lỗi khi thiếu trường, trùng id hay docs không phải trang PostgreSQL', () => {
    expect(() => parseLessons(ENTRY.replace('  example: "SELECT 1"\n', ''))).toThrow(/example/);
    expect(() => parseLessons(ENTRY + ENTRY)).toThrow(/trùng id/);
    expect(() => parseLessons(ENTRY.replace('https://www.postgresql.org/docs/', 'https://example.com/'))).toThrow(/docs/);
    expect(() => parseLessons(ENTRY.replace('en: "notes"', 'en: ""'))).toThrow(/explain/);
  });

  it('cueIn: các đoạn giữa "…" theo thứ tự, trong cùng một câu, không phân biệt hoa thường', () => {
    expect(cueIn('từ ngày … đến …', 'Lấy lô từ ngày 01/07 đến hết 30/09.')).toBe(true);
    expect(cueIn('từ ngày … đến …', 'Đến cuối tháng. Từ ngày 01/07.')).toBe(false);
    expect(cueIn('the … heaviest', 'Send me the 10 heaviest shipments.')).toBe(true);
    expect(cueIn('… lên đầu', 'Lô nặng nhất lên đầu.')).toBe(true);
    expect(cueIn('…', 'anything')).toBe(false);
  });

  it('pref đã xem / đã thử: dữ liệu hỏng thành rỗng, đánh dấu không trùng', () => {
    const kv = fakeKV();
    expect(loadLessonPrefs(kv)).toEqual({ seen: [], tried: [] });
    kv.setItem(LESSONS_KEY, '{"seen": "where", "tried": [1, "join"]}');
    expect(loadLessonPrefs(kv)).toEqual({ seen: [], tried: ['join'] });
    kv.setItem(LESSONS_KEY, 'not json');
    expect(loadLessonPrefs(kv)).toEqual({ seen: [], tried: [] });
    markLesson('where', false, kv);
    markLesson('where', true, kv);
    expect(loadLessonPrefs(kv)).toEqual({ seen: ['where'], tried: ['where'] });
  });
});

/** product-design-v4 §C.5: content rules for every quick lesson, on the real data. */
describe('bài học nhanh (content/lessons.yml)', () => {
  const lessons = [...loadLessons().values()];
  const templates = loadTicketTemplates();
  const skillOf = (l: Lesson) => SKILLS.find((s) => s.id === l.id)!;
  /** The ticket that grants the skill, with every variant's Solution. */
  const solutionsOf = (l: Lesson) => {
    const t = templates.find((x) => x.grants.includes(l.id))!;
    return Array.from({ length: Math.max(1, variantsOf(t).length) }, (_, v) => applyVariant(t, v).steps[0].solution);
  };

  it('mọi kỹ năng chương 1–3 có bài học; id là kỹ năng có thật', () => {
    expect(SKILLS.filter((s) => s.chapter <= 3 && !loadLessons().has(s.id)).map((s) => s.id)).toEqual([]);
    expect(lessons.filter((l) => !SKILLS.some((s) => s.id === l.id)).map((l) => l.id)).toEqual([]);
  });

  it.each(lessons)('$id: ≥ 3 dấu hiệu mỗi ngôn ngữ; việc mở kỹ năng dùng ≥ 1 dấu hiệu trong thân đề / Task', (l) => {
    const t = templates.find((x) => x.grants.includes(l.id))!;
    for (const lang of ['vi', 'en'] as const) {
      expect(l.cues[lang].length).toBeGreaterThanOrEqual(3);
      const x = textOf(t, lang);
      expect(l.cues[lang].some((c) => cueIn(c, `${x.body}\n${x.task}`))).toBe(true);
    }
  });

  it.each(lessons)('$id: EN không dấu, code span VI = EN, khái niệm ≤ 60 từ, giải thích ≤ 90 từ', (l) => {
    const en = [l.concept.en, l.explain.en, l.mistake.why.en, l.try.task.en, ...l.cues.en].join('\n');
    expect(en.replace(/`[^`]+`/g, '')).not.toMatch(VI_DIACRITIC);
    for (const k of ['concept', 'explain'] as const) expect(codeSpans(l[k].en)).toEqual(codeSpans(l[k].vi));
    expect(codeSpans(l.mistake.why.en)).toEqual(codeSpans(l.mistake.why.vi));
    expect(codeSpans(l.try.task.en)).toEqual(codeSpans(l.try.task.vi));
    expect(l.concept.vi.split(/\s+/).length).toBeLessThanOrEqual(60);
    expect(l.explain.vi.split(/\s+/).length).toBeLessThanOrEqual(90);
  });

  it.each(lessons)('$id: ví dụ, câu mở đầu và lời giải Thử ngay chạy được, có dòng, chỉ dùng bảng đã mở ở chương của kỹ năng', async (l) => {
    const run = await runner();
    const open = tablesUnlocked(skillOf(l).chapter);
    for (const sql of [l.example, l.try.starter, l.try.solution, l.mistake.sql]) expect(tablesIn(sql).filter((x) => !open.includes(x))).toEqual([]);
    for (const sql of [l.example, l.try.starter, l.try.solution]) expect((await run(sql)).rows.length).toBeGreaterThan(0);
  });

  it.each(lessons)('$id: ví dụ và lời giải Thử ngay khác kết quả Solution của việc mở kỹ năng (không lộ đáp án)', async (l) => {
    const run = await runner();
    const t = templates.find((x) => x.grants.includes(l.id))!;
    for (const solution of solutionsOf(l)) {
      const expected = await run(solution);
      expect(compareResults(expected, await run(l.example), t.ordered).ok).toBe(false);
      expect(compareResults(expected, await run(l.try.solution), t.ordered).ok).toBe(false);
    }
  });

  it.each(lessons)('$id: câu mở đầu Thử ngay chưa đạt; câu sai báo lỗi hoặc ra kết quả khác ví dụ', async (l) => {
    const run = await runner();
    expect(compareResults(await run(l.try.solution), await run(l.try.starter), l.try.ordered).ok).toBe(false);
    const wrong = await run(l.mistake.sql).catch(() => undefined);
    if (wrong) expect(compareResults(await run(l.example), wrong, true).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/lessons.test.ts`
Expected: FAIL khi nạp (`../src/lessons` và `loadLessons` chưa có).

- [ ] **Step 3: Viết bài học, parser, chunk lazy, nhóm ngân sách**

**Tạo `content/lessons.yml`:**
```yaml
# Bài học nhanh (product-design-v4 §C, L54): một thẻ cho mỗi kỹ năng, hiện trước việc đầu tiên mở kỹ năng đó.
# id = id trong skills.yml. File này nằm trong chunk lazy của ticket (src/ticketSources.ts), không vào bundle chính.
# cues: cụm từ nghiệp vụ báo hiệu kỹ năng ("…" = chỗ trống). Việc mở kỹ năng phải có ≥ 1 cụm trong thân đề hoặc Task:
#   các đoạn giữa "…" xuất hiện theo thứ tự trong cùng một câu, không phân biệt hoa thường (tests/lessons.test.ts).
# example, try.solution: chạy được, có dòng, chỉ dùng bảng đã mở ở chương của kỹ năng, khác kết quả Solution của việc mở kỹ năng.
# mistake.sql: câu sai hay gặp; báo lỗi, hoặc ra kết quả khác ví dụ. Code span VI = EN; EN không dấu.
# try: Thử ngay, chấm bằng grader như việc thật nhưng 0 XP; ordered: true khi thứ tự dòng được chấm.

- id: select
  cues:
    vi: ["gửi mình …", "với mỗi … mình cần …", "theo thứ tự: …", "danh sách mọi …"]
    en: ["send me …", "for each … I need …", "in this order: …", "a list of every …"]
  concept:
    vi: "Dữ liệu nằm trong các bảng (table). Mỗi dòng (row) là một thứ, ví dụ một hãng tàu; mỗi cột (column) là một thông tin của nó, ví dụ tên. SELECT chọn những cột bạn cần, FROM nói lấy từ bảng nào. Kết quả có đúng các cột bạn liệt kê, theo đúng thứ tự đó."
    en: "Data lives in tables. Each row is one thing, for example one carrier; each column is one piece of information about it, for example its name. SELECT picks the columns you need, FROM says which table to read. The result has exactly the columns you list, in that order."
  example: "SELECT name, mode FROM carriers"
  explain:
    vi: "① `SELECT name, mode`: hai cột, cách nhau bằng dấu phẩy. ② `FROM carriers`: bảng hãng vận chuyển. Kết quả: 9 dòng, mỗi hãng một dòng, cột tên rồi tới cột phương thức (`SEA` hoặc `AIR`). `*` nghĩa là mọi cột: tiện để xem bảng, nhưng khi nộp thì thừa cột."
    en: "① `SELECT name, mode`: two columns, separated by a comma. ② `FROM carriers`: the carrier table. Result: 9 rows, one per carrier, the name column then the mode column (`SEA` or `AIR`). `*` means every column: handy for a look at a table, but it adds extra columns when you submit."
  mistake:
    sql: "SELECT name mode FROM carriers"
    vi: "Quên dấu phẩy: Postgres không báo lỗi mà hiểu `mode` là tên mới đặt cho cột `name`. Bạn nhận 1 cột thay vì 2, và thẻ \"Kết quả mong đợi\" báo lệch số cột."
    en: "A missing comma: Postgres does not complain, it reads `mode` as a new name for the `name` column. You get 1 column instead of 2, and the \"Expected result\" card shows the column count is off."
  try:
    task:
      vi: "Hãng nào có mã gì? Lấy mã hãng rồi tới tên hãng, cho mọi hãng."
      en: "Which carrier has which code? Get the carrier code, then the carrier name, for every carrier."
    starter: "SELECT name, mode FROM carriers"
    solution: "SELECT code, name FROM carriers"
  docs: https://www.postgresql.org/docs/current/queries-select-lists.html

- id: where
  cues:
    vi: ["chỉ …", "bỏ …", "không tính …", "thuộc …", "từ ngày … đến …", "trước ngày …"]
    en: ["only …", "leave out …", "not counting …", "in the … region", "from … to …", "before …"]
  concept:
    vi: "SELECT chọn cột; WHERE chọn dòng. Mỗi dòng được kiểm điều kiện sau WHERE: đúng thì giữ, sai thì bỏ. Cần nhiều điều kiện cùng đúng thì nối bằng AND; chỉ cần một trong hai thì dùng OR."
    en: "SELECT picks columns; WHERE picks rows. Every row is checked against the condition after WHERE: true keeps it, false drops it. When several conditions must all hold, join them with AND; when either one is enough, use OR."
  example: "SELECT code, name, kind FROM ports WHERE country = 'Vietnam'"
  explain:
    vi: "① `WHERE country = 'Vietnam'`: chỉ giữ cảng có quốc gia là Việt Nam. ② Chữ đặt trong nháy đơn và phải viết đúng như trong dữ liệu (`'Vietnam'`, không phải `'vietnam'`). Kết quả: 5 dòng, 3 cảng biển và 2 sân bay. ③ So sánh khác: `<>` (khác), `>`, `>=`, `<`, `<=`; ngày cũng viết trong nháy đơn: `booking_date >= '2026-10-01'`. Không chắc giá trị viết thế nào? Xem tab Cột."
    en: "① `WHERE country = 'Vietnam'`: keep only the ports whose country is Vietnam. ② Text goes in single quotes and must match the data exactly (`'Vietnam'`, not `'vietnam'`). Result: 5 rows, 3 seaports and 2 airports. ③ Other comparisons: `<>` (not equal), `>`, `>=`, `<`, `<=`; dates also go in single quotes: `booking_date >= '2026-10-01'`. Not sure how a value is spelled? Check the Columns tab."
  mistake:
    sql: "SELECT code, name, kind FROM ports WHERE country = \"Vietnam\""
    vi: "Nháy kép là tên cột, không phải chữ. Postgres báo lỗi column \"Vietnam\" does not exist. Viết `'Vietnam'` với nháy đơn."
    en: "Double quotes mean a column name, not text. Postgres says column \"Vietnam\" does not exist. Write `'Vietnam'` with single quotes."
  try:
    task:
      vi: "Sửa ví dụ để chỉ giữ các sân bay ở Việt Nam: hai điều kiện phải cùng đúng."
      en: "Change the example to keep only the airports in Vietnam: both conditions must hold."
    starter: "SELECT code, name, kind FROM ports WHERE country = 'Vietnam'"
    solution: "SELECT code, name, kind FROM ports WHERE country = 'Vietnam' AND kind = 'AIRPORT'"
  docs: https://www.postgresql.org/docs/current/queries-table-expressions.html#QUERIES-WHERE

- id: order_by
  cues:
    vi: ["… lên đầu", "xếp theo …", "bằng nhau thì …", "trùng … thì …"]
    en: ["… first", "sorted by …", "on a tie …", "if two … the same"]
  concept:
    vi: "Không có ORDER BY thì Postgres trả dòng theo thứ tự bất kỳ. ORDER BY xếp dòng theo một hay nhiều cột: tăng dần là mặc định, thêm DESC để giảm dần. Cột thứ hai (tiêu chí sắp xếp phụ) chỉ dùng khi cột đầu bằng nhau."
    en: "Without ORDER BY, Postgres returns rows in any order. ORDER BY sorts rows by one or more columns: ascending is the default, add DESC for descending. The second column (the tie-breaker) only counts when the first one is equal."
  example: "SELECT name, country, base_transit_days FROM ports ORDER BY base_transit_days DESC, name"
  explain:
    vi: "① `base_transit_days DESC`: cảng có số ngày đi lớn nhất lên đầu (New York, 35 ngày). ② `, name`: Ningbo và Shanghai cùng 5 ngày, nên xếp tiếp theo tên. Thiếu tiêu chí phụ thì hai cảng này có thể đổi chỗ giữa các lần chạy. ③ Ngày và chữ cũng sắp xếp được: ngày sau lớn hơn ngày trước, chữ theo thứ tự chữ cái."
    en: "① `base_transit_days DESC`: the port with the most transit days comes first (New York, 35 days). ② `, name`: Ningbo and Shanghai both take 5 days, so the name breaks the tie. Without a tie-breaker those two can swap places between runs. ③ Dates and text sort too: a later date is greater, text goes alphabetically."
  mistake:
    sql: "SELECT name, country, base_transit_days FROM ports ORDER BY base_transit_days, name"
    vi: "Quên DESC: thứ tự tăng dần là mặc định, nên cảng gần nhất (0 ngày) lên đầu thay vì xa nhất."
    en: "DESC is missing: ascending is the default, so the nearest ports (0 days) come first instead of the farthest."
  try:
    task:
      vi: "Sửa ví dụ để cảng có thời gian đi ngắn nhất lên đầu; bằng nhau thì vẫn xếp theo tên."
      en: "Change the example so the port with the shortest transit time comes first; on a tie, still sort by name."
    starter: "SELECT name, country, base_transit_days FROM ports ORDER BY base_transit_days DESC, name"
    solution: "SELECT name, country, base_transit_days FROM ports ORDER BY base_transit_days, name"
    ordered: true
  docs: https://www.postgresql.org/docs/current/queries-order.html

- id: limit
  cues:
    vi: ["… nặng nhất", "… mới nhất", "… đầu tiên", "… lớn nhất"]
    en: ["the … heaviest", "the … latest", "the first …", "the … largest"]
  concept:
    vi: "LIMIT N chỉ giữ N dòng đầu của kết quả. Nó luôn đi sau ORDER BY: sắp xếp trước, rồi mới cắt. Muốn ranh giới cắt không đổi giữa các lần chạy thì cần tiêu chí sắp xếp phụ."
    en: "LIMIT N keeps only the first N rows of the result. It always comes after ORDER BY: sort first, then cut. For the cut-off to stay the same between runs, you need a tie-breaker."
  example: "SELECT code, name, base_transit_days FROM ports ORDER BY base_transit_days DESC, code LIMIT 3"
  explain:
    vi: "① `ORDER BY base_transit_days DESC, code`: xa nhất lên đầu, bằng nhau thì theo mã. ② `LIMIT 3`: chỉ giữ 3 dòng đầu: New York, Hamburg, Antwerp. ③ LIMIT luôn viết cuối câu."
    en: "① `ORDER BY base_transit_days DESC, code`: farthest first, ties by code. ② `LIMIT 3`: keep only the first 3 rows: New York, Hamburg, Antwerp. ③ LIMIT always goes at the end of the query."
  mistake:
    sql: "SELECT code, name, base_transit_days FROM ports LIMIT 3"
    vi: "LIMIT mà không có ORDER BY thì lấy 3 dòng bất kỳ (ở đây là 3 cảng Việt Nam, 0 ngày), không phải 3 cảng xa nhất."
    en: "LIMIT without ORDER BY takes any 3 rows (here three Vietnamese ports, 0 days), not the 3 farthest ports."
  try:
    task:
      vi: "Lấy 6 cảng gần nhất (ít ngày đi nhất); bằng nhau thì theo mã cảng. Để ý: có 5 cảng cùng 0 ngày, nên dòng thứ 6 do tiêu chí phụ quyết định."
      en: "Get the 6 nearest ports (fewest transit days); on a tie, by port code. Note: 5 ports share 0 days, so the tie-breaker decides the 6th row."
    starter: "SELECT code, name, base_transit_days FROM ports ORDER BY base_transit_days DESC, code LIMIT 3"
    solution: "SELECT code, name, base_transit_days FROM ports ORDER BY base_transit_days, code LIMIT 6"
    ordered: true
  docs: https://www.postgresql.org/docs/current/queries-limit.html

- id: aggregate
  cues:
    vi: ["bao nhiêu …", "tổng …", "trung bình …", "một con số", "một dòng duy nhất"]
    en: ["how many …", "total …", "average …", "a single number", "a single row"]
  concept:
    vi: "Hàm gộp biến nhiều dòng thành một giá trị: COUNT(*) đếm dòng, SUM cộng, AVG tính trung bình, MIN và MAX lấy nhỏ nhất, lớn nhất. WHERE lọc dòng trước, rồi hàm gộp tính trên các dòng còn lại. Không gom nhóm thì kết quả chỉ có một dòng."
    en: "An aggregate turns many rows into one value: COUNT(*) counts rows, SUM adds up, AVG averages, MIN and MAX take the smallest and largest. WHERE filters the rows first, then the aggregate works on what is left. Without grouping, the result is a single row."
  example: "SELECT COUNT(*), ROUND(AVG(gross_weight_kg), 2), MAX(gross_weight_kg) FROM shipments WHERE mode = 'AIR'"
  explain:
    vi: "① `WHERE mode = 'AIR'`: chỉ lô đi đường hàng không. ② `COUNT(*)`: 2.966 lô. ③ `ROUND(AVG(gross_weight_kg), 2)`: trọng lượng trung bình, làm tròn 2 chữ số. ④ `MAX(gross_weight_kg)`: lô nặng nhất. Kết quả: 1 dòng, 3 con số."
    en: "① `WHERE mode = 'AIR'`: air shipments only. ② `COUNT(*)`: 2,966 shipments. ③ `ROUND(AVG(gross_weight_kg), 2)`: the average weight, rounded to 2 decimals. ④ `MAX(gross_weight_kg)`: the heaviest shipment. Result: 1 row, 3 numbers."
  mistake:
    sql: "SELECT mode, COUNT(*) FROM shipments"
    vi: "Trộn một cột thường với hàm gộp: Postgres báo lỗi column \"shipments.mode\" must appear in the GROUP BY clause. Muốn một con số cho mỗi phương thức thì phải gom nhóm (kỹ năng tiếp theo)."
    en: "A plain column mixed with an aggregate: Postgres says column \"shipments.mode\" must appear in the GROUP BY clause. One number per mode needs grouping (the next skill)."
  try:
    task:
      vi: "Đổi sang hàng đi đường biển: số lô và tổng trọng lượng (kg)."
      en: "Switch to sea shipments: the number of shipments and the total weight (kg)."
    starter: "SELECT COUNT(*), ROUND(AVG(gross_weight_kg), 2), MAX(gross_weight_kg) FROM shipments WHERE mode = 'AIR'"
    solution: "SELECT COUNT(*), SUM(gross_weight_kg) FROM shipments WHERE mode = 'SEA'"
  docs: https://www.postgresql.org/docs/current/functions-aggregate.html

- id: group_by
  cues:
    vi: ["mỗi … một dòng", "với mỗi …", "từng …", "theo từng …"]
    en: ["one row per …", "for each …", "each …", "per …"]
  concept:
    vi: "GROUP BY gom các dòng có cùng giá trị thành một nhóm; hàm gộp tính riêng trong từng nhóm, và mỗi nhóm ra một dòng. Mọi cột trong SELECT không nằm trong hàm gộp phải có trong GROUP BY."
    en: "GROUP BY puts rows with the same value into one group; the aggregate is computed inside each group, and each group gives one row. Every SELECT column outside an aggregate must be in GROUP BY."
  example: "SELECT incoterm, COUNT(*) FROM shipments GROUP BY incoterm"
  explain:
    vi: "① `GROUP BY incoterm`: mỗi điều kiện giao hàng (FOB, EXW…) là một nhóm. ② `COUNT(*)`: đếm số lô trong từng nhóm. Kết quả: 8 dòng, mỗi điều kiện một dòng. ③ Gom theo nhiều cột (`GROUP BY a, b`) thì mỗi tổ hợp giá trị là một nhóm."
    en: "① `GROUP BY incoterm`: each Incoterm (FOB, EXW…) is one group. ② `COUNT(*)`: counts the shipments in each group. Result: 8 rows, one per Incoterm. ③ Grouping by several columns (`GROUP BY a, b`) makes each combination of values one group."
  mistake:
    sql: "SELECT incoterm, mode, COUNT(*) FROM shipments GROUP BY incoterm"
    vi: "Thêm cột vào SELECT mà quên thêm vào GROUP BY: Postgres báo lỗi column \"shipments.mode\" must appear in the GROUP BY clause."
    en: "A column added to SELECT but not to GROUP BY: Postgres says column \"shipments.mode\" must appear in the GROUP BY clause."
  try:
    task:
      vi: "Tách tiếp theo phương thức: mỗi tổ hợp điều kiện giao hàng và phương thức một dòng, gồm điều kiện, phương thức, số lô."
      en: "Split further by mode: one row per combination of Incoterm and mode, with the Incoterm, the mode and the number of shipments."
    starter: "SELECT incoterm, COUNT(*) FROM shipments GROUP BY incoterm"
    solution: "SELECT incoterm, mode, COUNT(*) FROM shipments GROUP BY incoterm, mode"
  docs: https://www.postgresql.org/docs/current/queries-table-expressions.html#QUERIES-GROUP

- id: having
  cues:
    vi: ["những … có hơn …", "đạt tiêu chí", "chỉ giữ nhóm …", "… có từ … trở lên"]
    en: ["the … with more than …", "meets the rule", "keep only the groups …", "with at least …"]
  concept:
    vi: "HAVING lọc nhóm, sau khi đã gom và tính hàm gộp. WHERE lọc từng dòng trước khi gom, nên không dùng được kết quả đếm; điều kiện trên kết quả đếm hay tổng phải đặt ở HAVING."
    en: "HAVING filters groups, after grouping and aggregating. WHERE filters single rows before grouping, so it cannot use a count; a condition on a count or a total goes in HAVING."
  example: "SELECT incoterm, COUNT(*) FROM shipments GROUP BY incoterm HAVING COUNT(*) > 3000"
  explain:
    vi: "① `GROUP BY incoterm`: mỗi điều kiện giao hàng một nhóm. ② `HAVING COUNT(*) > 3000`: chỉ giữ nhóm có hơn 3.000 lô. Kết quả: 3 dòng (EXW, DAP, FOB). ③ Thứ tự viết: WHERE, GROUP BY, HAVING."
    en: "① `GROUP BY incoterm`: one group per Incoterm. ② `HAVING COUNT(*) > 3000`: keep only the groups with more than 3,000 shipments. Result: 3 rows (EXW, DAP, FOB). ③ The order to write them: WHERE, GROUP BY, HAVING."
  mistake:
    sql: "SELECT incoterm, COUNT(*) FROM shipments WHERE COUNT(*) > 3000 GROUP BY incoterm"
    vi: "Đặt điều kiện trên kết quả đếm vào WHERE: Postgres báo lỗi aggregate functions are not allowed in WHERE. Chuyển nó sang HAVING."
    en: "A condition on the count placed in WHERE: Postgres says aggregate functions are not allowed in WHERE. Move it to HAVING."
  try:
    task:
      vi: "Hãng nào có hơn 2.900 lô? Mã hãng và số lô."
      en: "Which carriers have more than 2,900 shipments? Carrier id and number of shipments."
    starter: "SELECT incoterm, COUNT(*) FROM shipments GROUP BY incoterm HAVING COUNT(*) > 3000"
    solution: "SELECT carrier_id, COUNT(*) FROM shipments GROUP BY carrier_id HAVING COUNT(*) > 2900"
  docs: https://www.postgresql.org/docs/current/queries-table-expressions.html#QUERIES-GROUP

- id: join
  cues:
    vi: ["tên … nằm ở hồ sơ …", "kèm tên …", "… và tên khách", "gọi … bằng tên"]
    en: ["the … name is on the … record", "with the … name", "… and the customer name", "named by …"]
  concept:
    vi: "Mỗi bảng chỉ giữ thông tin của chính nó; lô hàng chỉ ghi mã hãng, tên hãng nằm ở bảng hãng. JOIN ghép mỗi dòng của bảng này với dòng khớp ở bảng kia, theo điều kiện ON (thường là khóa ngoại = khóa chính). Đặt tên ngắn (alias) cho bảng để biết cột thuộc bảng nào."
    en: "Each table only holds its own information; a shipment records the carrier id, the carrier name is in the carrier table. JOIN pairs each row of one table with the matching row of the other, by the ON condition (usually foreign key = primary key). Give each table a short name (alias) to tell its columns apart."
  example: "SELECT s.ref, ca.name FROM shipments s JOIN carriers ca ON ca.id = s.carrier_id WHERE s.booking_date = '2026-10-31'"
  explain:
    vi: "① `shipments s`, `carriers ca`: alias của hai bảng. ② `ON ca.id = s.carrier_id`: mã hãng ghi trên lô trỏ tới mã của hãng. ③ `s.ref`, `ca.name`: mỗi cột ghi rõ bảng. Kết quả: 25 lô đặt hôm nay, mỗi lô kèm tên hãng. Tab ER cho thấy khóa ngoại nào trỏ tới đâu."
    en: "① `shipments s`, `carriers ca`: the two tables' aliases. ② `ON ca.id = s.carrier_id`: the carrier id on the shipment points to the carrier's id. ③ `s.ref`, `ca.name`: every column names its table. Result: 25 shipments booked today, each with its carrier name. The ER tab shows which foreign key points where."
  mistake:
    sql: "SELECT id, ca.name FROM shipments s JOIN carriers ca ON ca.id = s.carrier_id WHERE s.booking_date = '2026-10-31'"
    vi: "Cả hai bảng đều có cột `id`: Postgres báo lỗi column reference \"id\" is ambiguous. Ghi rõ `s.id` hay `ca.id`."
    en: "Both tables have an `id` column: Postgres says column reference \"id\" is ambiguous. Write `s.id` or `ca.id`."
  try:
    task:
      vi: "Đổi tên hãng thành tên cảng đích của lô. Cảng đích trên lô là mã cảng, trỏ tới mã của bảng cảng."
      en: "Swap the carrier name for the name of the shipment's destination port. The destination on the shipment is a port code, pointing to the port table's code."
    starter: "SELECT s.ref, ca.name FROM shipments s JOIN carriers ca ON ca.id = s.carrier_id WHERE s.booking_date = '2026-10-31'"
    solution: "SELECT s.ref, p.name FROM shipments s JOIN ports p ON p.code = s.pod WHERE s.booking_date = '2026-10-31'"
  docs: https://www.postgresql.org/docs/current/queries-table-expressions.html#QUERIES-JOIN

- id: multi_join
  cues:
    vi: ["gọi … bằng tên", "từ … lên …", "… nằm ở ba chỗ"]
    en: ["named by …", "from … up to …", "… live in three places"]
  concept:
    vi: "Khi thông tin cần nằm cách nhau hai khóa ngoại trở lên, nối tiếp từng bảng một: mỗi JOIN thêm một bảng và có ON riêng. Đi theo chuỗi khóa ngoại, ví dụ container → lô → khách hàng."
    en: "When the data you need is two or more foreign keys apart, join one table at a time: each JOIN adds one table and has its own ON. Follow the chain of foreign keys, for example container → shipment → customer."
  example: "SELECT ct.container_no, s.ref, cu.name FROM containers ct JOIN shipments s ON s.id = ct.shipment_id JOIN customers cu ON cu.id = s.customer_id WHERE s.booking_date = '2026-10-31'"
  explain:
    vi: "① `JOIN shipments s ON s.id = ct.shipment_id`: từ container lên lô. ② `JOIN customers cu ON cu.id = s.customer_id`: từ lô lên khách. ③ Lô có 3 container thì ra 3 dòng: mỗi container một dòng. Kết quả: 36 container của các lô đặt hôm nay."
    en: "① `JOIN shipments s ON s.id = ct.shipment_id`: from container up to shipment. ② `JOIN customers cu ON cu.id = s.customer_id`: from shipment up to customer. ③ A shipment with 3 containers gives 3 rows: one per container. Result: 36 containers of today's bookings."
  mistake:
    sql: "SELECT ct.container_no, s.ref, cu.name FROM containers ct JOIN shipments s ON s.id = ct.shipment_id JOIN customers cu WHERE s.booking_date = '2026-10-31'"
    vi: "JOIN thứ hai thiếu ON: Postgres báo lỗi cú pháp syntax error at or near \"WHERE\". Mỗi JOIN cần ON riêng."
    en: "The second JOIN has no ON: Postgres reports syntax error at or near \"WHERE\". Every JOIN needs its own ON."
  try:
    task:
      vi: "Thêm tên cảng đích của lô làm cột cuối: nối thêm một bảng nữa từ lô."
      en: "Add the name of the shipment's destination port as the last column: join one more table from the shipment."
    starter: "SELECT ct.container_no, s.ref, cu.name FROM containers ct JOIN shipments s ON s.id = ct.shipment_id JOIN customers cu ON cu.id = s.customer_id WHERE s.booking_date = '2026-10-31'"
    solution: "SELECT ct.container_no, s.ref, cu.name, p.name FROM containers ct JOIN shipments s ON s.id = ct.shipment_id JOIN customers cu ON cu.id = s.customer_id JOIN ports p ON p.code = s.pod WHERE s.booking_date = '2026-10-31'"
  docs: https://www.postgresql.org/docs/current/queries-table-expressions.html#QUERIES-JOIN

- id: left_join
  cues:
    vi: ["kể cả … chưa từng …", "tính cả … chưa …", "giữ mọi …", "mọi … dù …"]
    en: ["including … that never …", "include … who have never …", "keep every …", "every … even …"]
  concept:
    vi: "JOIN thường chỉ giữ dòng có cặp ở cả hai bảng. LEFT JOIN giữ mọi dòng của bảng bên trái; dòng không có cặp vẫn có mặt, các cột của bảng bên phải để trống (NULL)."
    en: "A plain JOIN keeps only rows with a match in both tables. LEFT JOIN keeps every row of the left-hand table; a row with no match still appears, with the right-hand table's columns empty (NULL)."
  example: "SELECT p.code, p.name, s.ref FROM ports p LEFT JOIN shipments s ON s.pod = p.code AND s.booking_date = '2026-10-31'"
  explain:
    vi: "① `ports p LEFT JOIN shipments s`: giữ mọi cảng. ② `AND s.booking_date = '2026-10-31'`: chỉ ghép lô đặt hôm nay; điều kiện trên bảng bên phải đặt trong ON. ③ Cảng không có lô nào hôm nay vẫn có một dòng, `ref` là NULL. Kết quả: 34 dòng, 9 dòng NULL."
    en: "① `ports p LEFT JOIN shipments s`: keep every port. ② `AND s.booking_date = '2026-10-31'`: pair only today's bookings; a condition on the right-hand table goes in ON. ③ A port with no booking today still has one row, its `ref` is NULL. Result: 34 rows, 9 of them NULL."
  mistake:
    sql: "SELECT p.code, p.name, s.ref FROM ports p LEFT JOIN shipments s ON s.pod = p.code WHERE s.booking_date = '2026-10-31'"
    vi: "Điều kiện ngày đặt ở WHERE: dòng NULL không thỏa nên bị loại, LEFT JOIN thành JOIN thường. Cảng không có lô hôm nay biến mất (còn 25 dòng)."
    en: "The date condition in WHERE: the NULL rows fail it and are dropped, so the LEFT JOIN acts like a plain join. Ports with no booking today disappear (25 rows left)."
  try:
    task:
      vi: "Làm tương tự cho hãng tàu: mọi hãng (tên hãng) kèm mã lô đặt hôm nay của hãng, giữ cả hãng không có lô nào."
      en: "Do the same for carriers: every carrier (its name) with its shipment refs booked today, keeping carriers with none."
    starter: "SELECT p.code, p.name, s.ref FROM ports p LEFT JOIN shipments s ON s.pod = p.code AND s.booking_date = '2026-10-31'"
    solution: "SELECT ca.name, s.ref FROM carriers ca LEFT JOIN shipments s ON s.carrier_id = ca.id AND s.booking_date = '2026-10-31'"
  docs: https://www.postgresql.org/docs/current/queries-table-expressions.html#QUERIES-JOIN

- id: anti_join
  cues:
    vi: ["không có … nào", "chưa từng …", "… lâu không …"]
    en: ["with no … at all", "never …", "went quiet"]
  concept:
    vi: "Anti-join tìm dòng không có cặp: khách không có booking, cảng không có lô. Cách hay dùng: LEFT JOIN rồi chỉ giữ dòng mà khóa bên phải là NULL, tức là không ghép được."
    en: "An anti-join finds rows with no match: customers without bookings, ports without shipments. The usual way: LEFT JOIN, then keep only the rows whose right-hand key is NULL, which means nothing matched."
  example: "SELECT p.code, p.name FROM ports p LEFT JOIN shipments s ON s.pod = p.code AND s.booking_date = '2026-10-31' WHERE s.id IS NULL"
  explain:
    vi: "① LEFT JOIN như bài trước: mọi cảng, ghép với lô đặt hôm nay. ② `WHERE s.id IS NULL`: chỉ giữ cảng không ghép được lô nào. Kết quả: 9 cảng. ③ So với NULL phải viết `IS NULL`; `= NULL` không bao giờ đúng. Cách khác: `NOT EXISTS (SELECT 1 FROM …)`."
    en: "① A LEFT JOIN as in the previous lesson: every port, paired with today's bookings. ② `WHERE s.id IS NULL`: keep only the ports that matched no shipment. Result: 9 ports. ③ Comparing with NULL needs `IS NULL`; `= NULL` is never true. Another way: `NOT EXISTS (SELECT 1 FROM …)`."
  mistake:
    sql: "SELECT p.code, p.name FROM ports p LEFT JOIN shipments s ON s.pod = p.code AND s.booking_date = '2026-10-31' WHERE s.id = NULL"
    vi: "`= NULL` không bao giờ đúng, nên kết quả rỗng mà không báo lỗi. Viết `IS NULL`."
    en: "`= NULL` is never true, so the result is empty and nothing warns you. Write `IS NULL`."
  try:
    task:
      vi: "Hãng tàu nào không có lô nào đặt hôm nay? Lấy tên hãng."
      en: "Which carriers have no shipment booked today? Get the carrier name."
    starter: "SELECT p.code, p.name FROM ports p LEFT JOIN shipments s ON s.pod = p.code AND s.booking_date = '2026-10-31' WHERE s.id IS NULL"
    solution: "SELECT ca.name FROM carriers ca LEFT JOIN shipments s ON s.carrier_id = ca.id AND s.booking_date = '2026-10-31' WHERE s.id IS NULL"
  docs: https://www.postgresql.org/docs/current/queries-table-expressions.html#QUERIES-JOIN
```

**Sửa `scripts/check-budget.mjs`** — thay:
```js
  ['lanes', /^laneSources-/, 20], // lane briefs and side tasks (content/lanes/), lazy, fetched at boot beside the tickets (Plan 5)
  ['en', /^en-.*\.js$/, 20], // EN dictionary, lazy (Plan 5 T3): 11 KB, fetched at boot only when the player's language is EN
  ['css', /^index-.*\.css$/, 20],
  ['worker', /^worker-/, 160],
```
bằng:
```js
  ['lanes', /^laneSources-/, 20], // lane briefs and side tasks (content/lanes/), lazy, fetched at boot beside the tickets (Plan 5)
  ['en', /^en-.*\.js$/, 20], // EN dictionary, lazy (Plan 5 T3): 11 KB, fetched at boot only when the player's language is EN
  ['lessons', /^lessonSources-/, 20], // quick lessons (content/lessons.yml), lazy, fetched at boot beside the tickets (Plan 6): 8 KB for 11 lessons, ~0.75 KB each
  ['css', /^index-.*\.css$/, 20],
  ['worker', /^worker-/, 160],
```

**Sửa `src/content.ts`** — thay:
```ts
import { parseLaneBriefs, type LaneBrief } from './lanes';
import { byOrder, parseTicket, type Ticket } from './tickets';
import { applyVariant } from './variants';
```
bằng:
```ts
import { parseLaneBriefs, type LaneBrief } from './lanes';
import { parseLessons, type Lesson } from './lessons';
import { byOrder, parseTicket, type Ticket } from './tickets';
import { applyVariant } from './variants';
```

**Sửa `src/content.ts`** — thay:
```ts
let templates: Ticket[] | undefined;
let lanes: { tasks: Ticket[]; briefs: LaneBrief[] } | undefined;
let loading: Promise<void> | undefined;
```
bằng:
```ts
let templates: Ticket[] | undefined;
let lanes: { tasks: Ticket[]; briefs: LaneBrief[] } | undefined;
let lessons: Map<string, Lesson> | undefined;
let loading: Promise<void> | undefined;
```

**Sửa `src/content.ts`** — thay:
```ts
export function loadContent(): Promise<void> {
  // Plan 5: lane briefs and side tasks are their own lazy chunk, fetched beside the tickets.
  return (loading ??= Promise.all([import('./ticketSources'), import('./laneSources')])
    .then(([{ sources }, { laneSources, briefSource }]) => {
      templates = Object.entries(sources).map(([path, source]) => parseTicket(source, path)).sort(byOrder);
      lanes = {
        tasks: Object.entries(laneSources).map(([path, source]) => applyVariant(parseTicket(source, path), 0)).sort(byOrder),
```
bằng:
```ts
export function loadContent(): Promise<void> {
  // Plan 5: lane briefs and side tasks are their own lazy chunk, fetched beside the tickets.
  return (loading ??= Promise.all([import('./ticketSources'), import('./laneSources'), import('./lessonSources')])
    .then(([{ sources }, { laneSources, briefSource }, { lessonSource }]) => {
      templates = Object.entries(sources).map(([path, source]) => parseTicket(source, path)).sort(byOrder);
      lessons = new Map(parseLessons(lessonSource).map((l) => [l.id, l]));
      lanes = {
        tasks: Object.entries(laneSources).map(([path, source]) => applyVariant(parseTicket(source, path), 0)).sort(byOrder),
```

**Sửa `src/content.ts`** — thay:
```ts
}

/** Story mode always plays variants[0]. */
export function loadTickets(): Ticket[] {
```
bằng:
```ts
}

/** Quick lessons by skill id (content/lessons.yml). A skill without one has no entry. */
export function loadLessons(): Map<string, Lesson> {
  if (!lessons) throw new Error('loadContent() has not finished');
  return lessons;
}

/** Story mode always plays variants[0]. */
export function loadTickets(): Ticket[] {
```

**Tạo `src/lessonSources.ts`:**
```ts
// Quick lessons (content/lessons.yml, product-design-v4 §C) as raw text. Only src/content.ts imports this, and only with
// import(), so it is its own lazy chunk (budget group `lessons`), fetched at boot beside the tickets: main is at its budget.
export { default as lessonSource } from '../content/lessons.yml?raw';
```

**Tạo `src/lessons.ts`:**
```ts
import { parse as parseYaml } from 'yaml';
import { bilingualOf, type Bilingual } from './progress';
import { localStore, readJson, writeJson, type KV } from './storage';

/**
 * "Bài học nhanh" (product-design-v4 §C, L54): one card per skill, shown before the first task that grants it.
 * Lives in content/lessons.yml, parsed from the lazy ticket chunk (src/content.ts loadLessons()), never in the main bundle.
 */
export interface Lesson {
  /** Skill id (content/skills.yml). */
  id: string;
  /** Business phrases that signal the skill in a request; "…" marks a gap. */
  cues: { vi: string[]; en: string[] };
  concept: Bilingual;
  /** Runs on the real data; its result never equals the granting ticket's Solution (tests/lessons.test.ts). */
  example: string;
  /** ①②… notes on the example, with `code spans`. */
  explain: Bilingual;
  /** A common mistake: it errors, or gives a result other than the example's. */
  mistake: { sql: string; why: Bilingual };
  /** "Thử ngay": graded by the grader against `solution`, 0 XP. */
  try: { task: Bilingual; starter: string; solution: string; ordered: boolean };
  /** PostgreSQL docs page. */
  docs: string;
}

const DOCS = 'https://www.postgresql.org/docs/';

/** Throws on a broken entry, like parseSkills: the content tests load the real file. */
export function parseLessons(source: string, origin = 'lessons.yml'): Lesson[] {
  const data = parseYaml(source) as unknown;
  if (!Array.isArray(data)) throw new Error(`${origin}: cần một danh sách`);
  const seen = new Set<string>();
  return data.map((raw, i) => {
    const o = (raw ?? {}) as Record<string, unknown>;
    const fail = (what: string): never => {
      throw new Error(`${origin}: mục ${i} (${String(o.id)}) ${what}`);
    };
    const sql = (v: unknown, what: string): string => (typeof v === 'string' && v.trim() ? v.trim() : fail(`thiếu ${what}`));
    const both = (v: unknown, what: string): Bilingual => bilingualOf(v) ?? fail(`${what} cần { vi, en }`);
    const id = typeof o.id === 'string' && o.id ? o.id : fail('thiếu id');
    if (seen.has(id)) fail('trùng id');
    seen.add(id);
    const cues = (o.cues ?? {}) as Record<string, unknown>;
    const list = (v: unknown) => (Array.isArray(v) && v.every((x) => typeof x === 'string' && x.trim()) ? (v as string[]) : fail('cues cần { vi: [...], en: [...] }'));
    const mistake = (o.mistake ?? {}) as Record<string, unknown>;
    const tr = (o.try ?? {}) as Record<string, unknown>;
    const docs = typeof o.docs === 'string' && o.docs.startsWith(DOCS) ? o.docs : fail(`docs phải là một trang ${DOCS}`);
    return {
      id,
      cues: { vi: list(cues.vi), en: list(cues.en) },
      concept: both(o.concept, 'concept'),
      example: sql(o.example, 'example'),
      explain: both(o.explain, 'explain'),
      mistake: { sql: sql(mistake.sql, 'mistake.sql'), why: both(mistake, 'mistake') },
      try: { task: both(tr.task, 'try.task'), starter: sql(tr.starter, 'try.starter'), solution: sql(tr.solution, 'try.solution'), ordered: tr.ordered === true },
      docs,
    };
  });
}

const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The cue's parts between "…" appear in order inside one sentence of `text` (case-insensitive). */
export function cueIn(cue: string, text: string): boolean {
  const parts = cue.split('…').map((p) => p.trim()).filter(Boolean);
  return parts.length > 0 && new RegExp(parts.map(escape).join('[^.!?\\n]*?'), 'iu').test(text);
}

/** Device preference (product-design-v4 §F.3, D-F1): lessons the player closed ("Đã hiểu") or passed "Thử ngay". Not progress. */
export const LESSONS_KEY = 'cargo-query/lessons';
export interface LessonPrefs { seen: string[]; tried: string[] }

const ids = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

/** Anything unreadable becomes empty lists: the cards just open again, nothing else is lost. */
export function loadLessonPrefs(storage: KV | undefined = localStore()): LessonPrefs {
  const o = readJson<unknown>(LESSONS_KEY, storage);
  const p = o && typeof o === 'object' && !Array.isArray(o) ? (o as Record<string, unknown>) : {};
  return { seen: ids(p.seen), tried: ids(p.tried) };
}

/** Adds `id` to `seen` (and to `tried` when `tried`); a failed write is ignored (the lesson card also remembers it for the session). */
export function markLesson(id: string, tried = false, storage: KV | undefined = localStore()): LessonPrefs {
  const p = loadLessonPrefs(storage);
  const add = (xs: string[]) => (xs.includes(id) ? xs : [...xs, id]);
  const next = { seen: add(p.seen), tried: tried ? add(p.tried) : p.tried };
  writeJson(LESSONS_KEY, next, storage);
  return next;
}
```

- [ ] **Step 4: Chạy test, xác nhận PASS; đo ngân sách**

Run: `npx vitest run tests/lessons.test.ts && npx tsc --noEmit && npm run build && node scripts/check-budget.mjs`
Expected:
- `tests/lessons.test.ts` 60 test PASS.
- Ngân sách `main ≈ 267 / 270`, `tickets ≈ 104 / 110`, `lessons ≈ 8 / 20`.

- [ ] **Step 5: Chạy toàn bộ rồi commit**

Run: `npm test`
Expected: mọi test PASS (1591 test).

```bash
git add content/lessons.yml scripts/check-budget.mjs src/content.ts src/lessonSources.ts src/lessons.ts tests/lessons.test.ts
git commit -m "feat: quick lessons for the 11 chapter 1-3 skills (content/lessons.yml, own lazy chunk) with content tests (v4 §C.5, §C.7)

Claude-Session: https://claude.ai/code/session_01PwPSBV1SVDP6quEZfKN56M"
```

---

### Task 5: Thẻ "Bài học nhanh", Thử ngay, chip bấm được, Sổ tay đọc trước

**Files:** `index.html`, `src/i18n/en.ts`, `src/i18n/vi.ts`, `src/ui/brief.ts`, `src/ui/chapterView.ts`, `src/ui/lessonCard.ts`, `src/ui/notebook.ts`

**Interfaces:**
- Consumes: `loadLessons`, `loadLessonPrefs`, `markLesson` (Task 4); `grade`, `gradeMessage`, `errorView`, `renderResult`, `app.run`.
- Produces: `hasLesson(id)`, `lessonSlot(grants)`, `openLesson(id)` (`src/ui/lessonCard.ts`); `<dialog id="lesson-dialog">`.

DOM không có test tự động (như Plan 5): kiểm tay ở Task 7 Step 4, mục 2–6.

- [ ] **Step 1: Khóa i18n, hộp thoại, module thẻ**

**Sửa `index.html`** — thay:
```html
    <!-- ui-ux-v4 §3: the route map without leaving the task; filled by src/ui/mapStrip.ts. Padding sits on the inner box so a click on the dialog itself is the backdrop. Below sm: bottom sheet. -->
    <dialog id="map-dialog" class="max-h-[calc(100dvh-4rem)] w-[min(960px,calc(100vw-2rem))] overflow-auto rounded-2xl p-0 max-sm:mb-0 max-sm:max-h-[85dvh] max-sm:w-full max-sm:max-w-none max-sm:rounded-b-none" aria-labelledby="map-dialog-title"></dialog>
    <dialog id="notebook-dialog" class="fixed inset-auto top-16 right-4 z-30 m-0 max-h-[calc(100dvh-6rem)] w-[min(380px,calc(100vw-2rem))] overflow-auto max-sm:inset-x-4 max-sm:top-auto max-sm:bottom-4 max-sm:max-h-[60dvh] max-sm:w-auto" aria-labelledby="notebook-title"></dialog>
    <!-- L42: replaces part of L11; holds only Export / Import progress. Outside <header> so focus uses --accent. -->
```
bằng:
```html
    <!-- ui-ux-v4 §3: the route map without leaving the task; filled by src/ui/mapStrip.ts. Padding sits on the inner box so a click on the dialog itself is the backdrop. Below sm: bottom sheet. -->
    <dialog id="map-dialog" class="max-h-[calc(100dvh-4rem)] w-[min(960px,calc(100vw-2rem))] overflow-auto rounded-2xl p-0 max-sm:mb-0 max-sm:max-h-[85dvh] max-sm:w-full max-sm:max-w-none max-sm:rounded-b-none" aria-labelledby="map-dialog-title"></dialog>
    <!-- product-design-v4 §C.3: a quick lesson opened from a skill chip or the handbook; filled by src/ui/lessonCard.ts. -->
    <dialog id="lesson-dialog" class="max-h-[calc(100dvh-4rem)] w-[min(720px,calc(100vw-2rem))] overflow-auto max-sm:mb-0 max-sm:max-h-[85dvh] max-sm:w-full max-sm:max-w-none max-sm:rounded-b-none" aria-labelledby="lesson-dialog-title"></dialog>
    <dialog id="notebook-dialog" class="fixed inset-auto top-16 right-4 z-30 m-0 max-h-[calc(100dvh-6rem)] w-[min(380px,calc(100vw-2rem))] overflow-auto max-sm:inset-x-4 max-sm:top-auto max-sm:bottom-4 max-sm:max-h-[60dvh] max-sm:w-auto" aria-labelledby="notebook-title"></dialog>
    <!-- L42: replaces part of L11; holds only Export / Import progress. Outside <header> so focus uses --accent. -->
```

**Sửa `src/i18n/en.ts`** — thay:
```ts
  'chip.teachesLabel': 'New skill:',
  'chip.needsLabel': 'Uses:',
  'sum.title': 'Chapter {n} wrap-up: {title}',
  'sum.career': 'New career step: {career}',
```
bằng:
```ts
  'chip.teachesLabel': 'New skill:',
  'chip.needsLabel': 'Uses:',
  'chip.lessonAria': 'Quick lesson: {skill}',
  'lesson.title': 'Quick lesson · {skill}',
  'lesson.collapsed': 'Quick lesson: {skill}',
  'lesson.show': 'Show',
  'lesson.reopen': 'Open again',
  'lesson.gotIt': 'Got it',
  'lesson.collapse': 'Collapse',
  'lesson.syntax': 'Syntax:',
  'lesson.example': 'Example',
  'lesson.runExample': 'Run the example',
  'lesson.mistake': 'Common mistake',
  'lesson.cues': 'Signs in a request',
  'lesson.try': 'Try it now (no XP)',
  'lesson.tryAria': 'Try-it-now SQL',
  'lesson.check': 'Run & check',
  'lesson.running': 'Running…',
  'lesson.tryOk': 'Correct! You have got this skill.',
  'lesson.docs': 'Read more: PostgreSQL docs',
  'nb.lesson': 'Quick lesson',
  'sum.title': 'Chapter {n} wrap-up: {title}',
  'sum.career': 'New career step: {career}',
```

**Sửa `src/i18n/vi.ts`** — thay:
```ts
  'chip.teachesLabel': 'Kỹ năng mới:',
  'chip.needsLabel': 'Cần dùng:',
  'sum.title': 'Tổng kết chương {n}: {title}',
  'sum.career': 'Bước nghề mới: {career}',
```
bằng:
```ts
  'chip.teachesLabel': 'Kỹ năng mới:',
  'chip.needsLabel': 'Cần dùng:',
  'chip.lessonAria': 'Bài học nhanh: {skill}',
  'lesson.title': 'Bài học nhanh · {skill}',
  'lesson.collapsed': 'Bài học nhanh: {skill}',
  'lesson.show': 'Xem',
  'lesson.reopen': 'Mở lại',
  'lesson.gotIt': 'Đã hiểu',
  'lesson.collapse': 'Thu gọn',
  'lesson.syntax': 'Cú pháp:',
  'lesson.example': 'Ví dụ',
  'lesson.runExample': 'Chạy ví dụ',
  'lesson.mistake': 'Lỗi hay gặp',
  'lesson.cues': 'Dấu hiệu trong đề',
  'lesson.try': 'Thử ngay (không tính XP)',
  'lesson.tryAria': 'SQL thử ngay',
  'lesson.check': 'Chạy & kiểm',
  'lesson.running': 'Đang chạy…',
  'lesson.tryOk': 'Đúng rồi! Bạn đã nắm kỹ năng này.',
  'lesson.docs': 'Đọc thêm: tài liệu PostgreSQL',
  'nb.lesson': 'Bài học nhanh',
  'sum.title': 'Tổng kết chương {n}: {title}',
  'sum.career': 'Bước nghề mới: {career}',
```

**Sửa `src/ui/brief.ts`** — thay:
```ts
import { h, nodes, richText } from './dom';
import { skillIcon } from './icons';

const BEAT: Record<Beat, Key> = { teach: 'beat.teach', develop: 'beat.develop', twist: 'beat.twist', rest: 'beat.rest', boss: 'beat.boss' };
```
bằng:
```ts
import { h, nodes, richText } from './dom';
import { skillIcon } from './icons';
import { lessonSlot } from './lessonCard';

const BEAT: Record<Beat, Key> = { teach: 'beat.teach', develop: 'beat.develop', twist: 'beat.twist', rest: 'beat.rest', boss: 'beat.boss' };
```

**Sửa `src/ui/brief.ts`** — thay:
```ts
    coach('brief'),
    h('div', { class: 'rounded-2xl rounded-tl-sm bg-code px-4 leading-relaxed' }, richText(x.body)),
    exampleCard(tk, x),
    x.task ? h('section', { class: 'my-3 rounded-lg border-l-4 border-accent bg-accent-soft p-3' }, h('h3', { class: 'mt-0' }, t('brief.task')), richText(x.task)) : null,
```
bằng:
```ts
    coach('brief'),
    h('div', { class: 'rounded-2xl rounded-tl-sm bg-code px-4 leading-relaxed' }, richText(x.body)),
    isStory() && !isDone ? lessonSlot(tk.grants) : null, // quick lessons before the task (product-design-v4 §C.3)
    exampleCard(tk, x),
    x.task ? h('section', { class: 'my-3 rounded-lg border-l-4 border-accent bg-accent-soft p-3' }, h('h3', { class: 'mt-0' }, t('brief.task')), richText(x.task)) : null,
```

**Sửa `src/ui/chapterView.ts`** — thay:
```ts
import { h } from './dom';
import { skillIcon } from './icons';

export const skillLabel = (id: string): string => SKILLS.find((s) => s.id === id)?.label[getLang()] ?? id;
```
bằng:
```ts
import { h } from './dom';
import { skillIcon } from './icons';
import { hasLesson, openLesson } from './lessonCard';

export const skillLabel = (id: string): string => SKILLS.find((s) => s.id === id)?.label[getLang()] ?? id;
```

**Sửa `src/ui/chapterView.ts`** — thay:
```ts
}

/** "Teaches: … · Needs: …" from grants/requires; colour only on the small chips (L23). */
export function skillChips(tk: Ticket): HTMLElement | null {
  if (tk.grants.length === 0 && tk.requires.length === 0) return null;
  // One chip per skill with its icon (ui-ux-v3 §e), after a plain "Teaches:" / "Needs:" label.
  const row = (label: string, ids: string[], chip: string) => h('span', { class: 'flex flex-wrap items-center gap-1.5' },
    h('span', { class: 'text-sm font-semibold text-muted' }, label),
    ...ids.map((id) => h('span', { class: cx(PILL, chip) }, skillIcon(id, 'size-4'), skillLabel(id))));
  return h('p', { class: 'my-2 flex flex-wrap items-center gap-x-4 gap-y-1.5' },
    tk.grants.length ? row(t('chip.teachesLabel'), tk.grants, chapterColor(tk.chapter).chip) : null,
```
bằng:
```ts
}

/** "New skill: … · Uses: …" from grants/requires; colour only on the small chips (L23). */
export function skillChips(tk: Ticket): HTMLElement | null {
  if (tk.grants.length === 0 && tk.requires.length === 0) return null;
  // One chip per skill with its icon (ui-ux-v3 §e), after a plain label. A skill with a quick lesson is a button that opens it (§C.3).
  const chipOf = (id: string, chip: string) => hasLesson(id)
    ? h('button', { type: 'button', class: cx(PILL, chip, 'border-0'), 'aria-haspopup': 'dialog', title: t('chip.lessonAria', { skill: skillLabel(id) }), onclick: () => openLesson(id) },
      skillIcon(id, 'size-4'), skillLabel(id))
    : h('span', { class: cx(PILL, chip) }, skillIcon(id, 'size-4'), skillLabel(id));
  const row = (label: string, ids: string[], chip: string) => h('span', { class: 'flex flex-wrap items-center gap-1.5' },
    h('span', { class: 'text-sm font-semibold text-muted' }, label),
    ...ids.map((id) => chipOf(id, chip)));
  return h('p', { class: 'my-2 flex flex-wrap items-center gap-x-4 gap-y-1.5' },
    tk.grants.length ? row(t('chip.teachesLabel'), tk.grants, chapterColor(tk.chapter).chip) : null,
```

**Tạo `src/ui/lessonCard.ts`:**
```ts
import { loadLessons } from '../content';
import type { QueryResult } from '../db/run';
import { grade } from '../grader';
import { getLang, t } from '../i18n';
import { loadLessonPrefs, markLesson, type Lesson } from '../lessons';
import { SKILLS } from '../progress';
import { app } from '../state';
import { cx } from '../theme';
import { byId, h, nodes, richText } from './dom';
import { errorText, errorView, gradeMessage } from './feedback';
import { skillIcon } from './icons';
import { renderResult } from './resultTable';

// Session state by skill id. The brief is rebuilt on every rerender, so what the player typed or ran lives here.
const drafts = new Map<string, string>();
const verdicts = new Map<string, { ok: boolean; text: () => string }>();
const examples = new Map<string, { result?: QueryResult; error?: unknown }>();
/** Open/collapsed as the player last chose this session; otherwise the first lesson not seen yet is open. */
const expanded = new Map<string, boolean>();
/** Marked this session: the pref write may fail (blocked storage) and the card must still collapse. */
const seenNow = new Set<string>();

const isSeen = (id: string): boolean => seenNow.has(id) || loadLessonPrefs().seen.includes(id);
const skillOf = (id: string) => SKILLS.find((s) => s.id === id);
const label = (id: string): string => skillOf(id)?.label[getLang()] ?? id;

function markSeen(id: string, tried: boolean): void {
  seenNow.add(id);
  markLesson(id, tried);
}

const section = (title: string, ...body: (Node | null)[]): HTMLElement =>
  h('div', { class: 'mt-3' }, h('h4', { class: 'mt-0 mb-1' }, title), ...body);

/** The full card (product-design-v4 §C.2). `titleId` differs between the brief and the dialog; `actions` sit next to the title. */
function card(l: Lesson, titleId: string, actions: HTMLElement[]): HTMLElement {
  const lang = getLang();
  const exampleOut = h('div', { class: 'mt-2' });
  const drawExample = (): void => {
    const e = examples.get(l.id);
    exampleOut.replaceChildren(...nodes(e && (e.result ? renderResult(e.result) : errorView(e.error))));
  };
  const runExample = h('button', {
    type: 'button',
    onclick: () => {
      runExample.disabled = true;
      app.run(l.example)
        .then((result) => examples.set(l.id, { result }), (error: unknown) => examples.set(l.id, { error }))
        .finally(() => {
          runExample.disabled = false;
          drawExample();
        });
    },
  }, t('lesson.runExample'));
  drawExample();

  const area = h('textarea', { class: 'w-full rounded-lg bg-code p-2 font-mono text-sm ring-1 ring-line', rows: '3', spellcheck: 'false', 'aria-label': t('lesson.tryAria') });
  area.value = drafts.get(l.id) ?? l.try.starter;
  area.addEventListener('input', () => drafts.set(l.id, area.value));
  const verdict = h('p', { role: 'status', class: 'mb-0' });
  const drawVerdict = (): void => {
    const v = verdicts.get(l.id);
    verdict.className = cx('mb-0', v && (v.ok ? 'good' : 'bad'));
    verdict.textContent = v ? v.text() : '';
  };
  const check = h('button', {
    type: 'button',
    class: 'primary',
    onclick: async () => {
      check.disabled = true;
      verdict.className = 'mb-0';
      verdict.textContent = t('lesson.running');
      try {
        // The real grader against the lesson's own answer, 0 XP; app.lastRun, drafts and history are never touched.
        const r = await grade((sql) => app.run(sql), l.try.solution, area.value, l.try.ordered);
        verdicts.set(l.id, r.ok ? { ok: true, text: () => t('lesson.tryOk') } : { ok: false, text: () => gradeMessage(r) });
        if (r.ok) markSeen(l.id, true);
      } catch (e) {
        verdicts.set(l.id, { ok: false, text: () => errorText(e) });
      }
      check.disabled = false;
      drawVerdict();
    },
  }, t('lesson.check'));
  drawVerdict();

  const skill = skillOf(l.id);
  return h('section', { class: 'my-3 rounded-xl bg-panel p-3 ring-1 ring-accent', 'aria-labelledby': titleId },
    h('div', { class: 'flex flex-wrap items-center justify-between gap-2' },
      h('h3', { id: titleId, tabindex: '-1', class: 'm-0 flex items-center gap-2' }, skillIcon(l.id, 'size-5'), t('lesson.title', { skill: label(l.id) })),
      h('div', { class: 'flex gap-1.5' }, ...actions)),
    h('p', { class: 'mt-2 mb-0' }, l.concept[lang]),
    skill ? h('p', { class: 'mt-2 mb-0' }, h('b', {}, t('lesson.syntax')), ' ', h('code', {}, skill.syntax)) : null,
    section(t('lesson.example'), h('pre', { class: 'sql' }, l.example), runExample, exampleOut, richText(l.explain[lang])),
    section(t('lesson.mistake'), h('pre', { class: 'sql' }, l.mistake.sql), richText(l.mistake.why[lang])),
    section(t('lesson.cues'), h('p', { class: 'm-0' }, l.cues[lang].join(' · '))),
    section(t('lesson.try'), h('p', { class: 'mt-0' }, l.try.task[lang]), area, h('div', { class: 'actions mb-0' }, check), verdict),
    h('p', { class: 'mt-3 mb-0 text-sm' }, h('a', { href: l.docs, target: '_blank', rel: 'noopener noreferrer' }, t('lesson.docs'))));
}

/** One line for a lesson that is not open: "Quick lesson: X ✓ · Open again". */
function collapsed(id: string, open: () => void): HTMLElement {
  const seen = isSeen(id);
  return h('p', { class: 'my-2 flex flex-wrap items-center gap-2 text-sm', 'data-lesson': id },
    h('span', {}, `${t('lesson.collapsed', { skill: label(id) })}${seen ? ' ✓' : ''}`),
    h('button', { type: 'button', class: 'px-2 py-0.5 text-sm', onclick: open }, t(seen ? 'lesson.reopen' : 'lesson.show')));
}

export const hasLesson = (id: string): boolean => loadLessons().has(id);

/**
 * Story ticket granting skills that have a quick lesson: their cards, between the message and the task (product-design-v4 §C.3).
 * The first lesson not seen yet is open, the others are one line (two lessons on one ticket: the second waits).
 */
export function lessonSlot(grants: string[]): HTMLElement | null {
  const ids = grants.filter(hasLesson);
  if (ids.length === 0) return null;
  const host = h('div');
  const lessons = loadLessons();
  const draw = (focus?: string): void => {
    const first = ids.find((id) => !isSeen(id));
    host.replaceChildren(...ids.map((id) => {
      if (!(expanded.get(id) ?? id === first)) return collapsed(id, () => { expanded.set(id, true); draw(id); });
      const close = (seen: boolean) => () => {
        if (seen) markSeen(id, false);
        expanded.set(id, false);
        draw(id);
      };
      return card(lessons.get(id)!, `lesson-${id}-title`, [
        h('button', { type: 'button', onclick: close(true) }, `${t('lesson.gotIt')} ✓`),
        h('button', { type: 'button', onclick: close(false) }, t('lesson.collapse')),
      ]);
    }));
    // The pressed button is gone: focus what replaced it (the one-line row's button, or the opened card's title).
    if (focus) host.querySelector<HTMLElement>(`[data-lesson="${focus}"] button, #lesson-${focus}-title`)?.focus();
  };
  draw();
  return host;
}

/** A skill chip or the handbook: the same card in a modal dialog, readable before the task that teaches it; focus returns to the opener. */
export function openLesson(id: string): void {
  const l = loadLessons().get(id);
  if (!l) return;
  const dialog = byId('lesson-dialog') as HTMLDialogElement;
  const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  dialog.replaceChildren(card(l, 'lesson-dialog-title', [
    h('button', { type: 'button', onclick: () => { markSeen(id, false); dialog.close(); } }, `${t('lesson.gotIt')} ✓`),
    h('button', { type: 'button', onclick: () => dialog.close() }, t('app.close')),
  ]));
  dialog.onclose = () => {
    if (opener?.isConnected) opener.focus();
  };
  if (!dialog.open) dialog.showModal();
}
```

**Sửa `src/ui/notebook.ts`** — thay:
```ts
import { registerMode } from './homeView';
import { skillIcon } from './icons';

const ITEM = 'border-b border-line py-2';
```
bằng:
```ts
import { registerMode } from './homeView';
import { skillIcon } from './icons';
import { hasLesson, openLesson } from './lessonCard';

const ITEM = 'border-b border-line py-2';
```

**Sửa `src/ui/notebook.ts`** — thay:
```ts
    const q = input.value;
    const cards = SKILLS.filter((s) => matches(q, s.id, s.label.vi, s.label.en));
    const terms = GLOSSARY.filter((g) => matches(q, g.term, g.vi, g.en, ...g.columns));
    list.replaceChildren(...nodes(
```
bằng:
```ts
    const q = input.value;
    const cards = SKILLS.filter((s) => matches(q, s.id, s.label.vi, s.label.en));
    // A skill's quick lesson can be read before the skill is learned (product-design-v4 §C.3).
    const lesson = (id: string) => hasLesson(id) ? h('button', { type: 'button', class: 'mt-1 px-2 py-0.5 text-sm', onclick: () => openLesson(id) }, t('nb.lesson')) : null;
    const terms = GLOSSARY.filter((g) => matches(q, g.term, g.vi, g.en, ...g.columns));
    list.replaceChildren(...nodes(
```

**Sửa `src/ui/notebook.ts`** — thay:
```ts
              h('pre', { class: 'sql my-1' }, s.syntax),
              h('p', { class: 'my-0.5 text-sm' }, h('b', {}, t('nb.when')), ' ', s.when[lang]),
              h('p', { class: 'my-0.5 text-sm' }, h('b', {}, t('nb.trap')), ' ', s.trap[lang]))
          : h('article', { class: ITEM },
              h('h4', { class: 'm-0 flex items-center gap-2 text-muted' }, skillIcon(s.id), s.label[lang]),
              h('p', { class: 'my-0.5 text-sm text-muted' }, t('nb.unlockAt', { id: grantedBy(app.tickets, s.id)?.id ?? '—' })))),
      h('h3', {}, t('nb.terms')),
      ...terms.map((g) =>
```
bằng:
```ts
              h('pre', { class: 'sql my-1' }, s.syntax),
              h('p', { class: 'my-0.5 text-sm' }, h('b', {}, t('nb.when')), ' ', s.when[lang]),
              h('p', { class: 'my-0.5 text-sm' }, h('b', {}, t('nb.trap')), ' ', s.trap[lang]),
              lesson(s.id))
          : h('article', { class: ITEM },
              h('h4', { class: 'm-0 flex items-center gap-2 text-muted' }, skillIcon(s.id), s.label[lang]),
              h('p', { class: 'my-0.5 text-sm text-muted' }, t('nb.unlockAt', { id: grantedBy(app.tickets, s.id)?.id ?? '—' })),
              lesson(s.id))),
      h('h3', {}, t('nb.terms')),
      ...terms.map((g) =>
```

- [ ] **Step 2: Kiểm kiểu, i18n, ngân sách**

Run: `npx tsc --noEmit && npx vitest run tests/i18n.test.ts tests/theme.test.ts && npm run build && node scripts/check-budget.mjs`
Expected:
- PASS.
- `main ≈ 268 / 270`. Không có chunk `feedback-*.js` hay chunk dùng chung mới nào trong `dist/index.html` (U3): `grep -o 'assets/[^"]*\.js' dist/index.html` chỉ ra `index-*.js` và `preload-helper-*.js`.

- [ ] **Step 3: Chạy toàn bộ rồi commit**

Run: `npm test`
Expected: mọi test PASS (1591 test).

```bash
git add index.html src/i18n/en.ts src/i18n/vi.ts src/ui/brief.ts src/ui/chapterView.ts src/ui/lessonCard.ts src/ui/notebook.ts
git commit -m "feat: quick lesson card in the brief, Thử ngay graded for 0 XP, clickable skill chips and handbook pre-read (v4 §C.2, §C.3)

Claude-Session: https://claude.ai/code/session_01PwPSBV1SVDP6quEZfKN56M"
```

---

### Task 6: Giá trị của cột chữ ở tab Cột và trang Dữ liệu

**Files:** `src/state.ts`, `src/ui/dataView.ts`, `src/ui/erdView.ts`, `src/ui/vizTabs.ts`, `src/viz/erd.ts`, `tests/erd.test.ts`

**Interfaces:**
- Produces:
  - `TEXT_TYPES`, `VALUES_MAX = 20`, `distinctValuesSql(table, columns)`, `toDistinctValues(result)` (`src/viz/erd.ts`).
  - `textValues(table)` (`src/state.ts`).
  - `valuesLine(values, column, cls?)` (`src/ui/erdView.ts`).

- [ ] **Step 1: Viết test**

**Sửa `tests/erd.test.ts`** — thay:
```ts
import { describe, expect, it } from 'vitest';
import { runSandboxed } from '../src/db/run';
import { loadTickets } from '../src/content';
import { tablesUnlocked } from '../src/progress';
import { erColumnsSql, erDefinition, erRowCountsSql, loadErMetadata, mermaidName, relatedTables, tablesInQuery, type ErColumn, type ErConstraint } from '../src/viz/erd';
import { freshDb, runner } from './helpers';

const CH2 = ['ports', 'carriers', 'employees', 'customers', 'shipments', 'containers'];
```
bằng:
```ts
import { describe, expect, it } from 'vitest';
import { runSandboxed } from '../src/db/run';
import { loadTickets } from '../src/content';
import { tablesUnlocked } from '../src/progress';
import {
  distinctValuesSql, erColumnsSql, erDefinition, erRowCountsSql, loadErMetadata, mermaidName, relatedTables, tablesInQuery, TEXT_TYPES, toDistinctValues,
  type ErColumn, type ErConstraint,
} from '../src/viz/erd';
import { freshDb, runner } from './helpers';

const CH2 = ['ports', 'carriers', 'employees', 'customers', 'shipments', 'containers'];
```

**Sửa `tests/erd.test.ts`** — thay:
```ts
  it('từ chối tên bảng không phải định danh', () => {
    expect(() => erRowCountsSql(['ports; DROP TABLE x'])).toThrow();
  });
});
```
bằng:
```ts
  it('từ chối tên bảng không phải định danh', () => {
    expect(() => erRowCountsSql(['ports; DROP TABLE x'])).toThrow();
  });
});

describe('distinctValuesSql (giá trị của cột chữ, product-design-v4 §C.4-4)', () => {
  it('giá trị đã sắp xếp; cột có hơn 20 giá trị không hiện; tên lạ bị từ chối', async () => {
    const run = await runner();
    expect(toDistinctValues(await run(distinctValuesSql('ports', ['kind', 'region', 'code'])))).toEqual({
      kind: ['AIRPORT', 'SEAPORT'],
      region: ['Asia', 'Europe', 'North America', 'Oceania', 'South Asia', 'Vietnam'],
    });
    expect(toDistinctValues(await run(distinctValuesSql('employees', ['dept'])))).toEqual({ dept: ['CS', 'Customs', 'Finance', 'Management', 'Ops', 'Sales'] });
    expect(() => distinctValuesSql('ports', ['kind; DROP TABLE ports'])).toThrow();
    expect(() => distinctValuesSql('ports x', ['kind'])).toThrow();
  });

  it('mọi bảng chữ của chương 12: một câu mỗi bảng, tổng cộng nhanh (Node; trình duyệt chậm hơn vài lần)', async () => {
    const run = await runner();
    const meta = await loadErMetadata(run, 'public');
    const start = performance.now();
    for (const table of tablesUnlocked(12)) {
      const cols = meta.cols.filter((c) => c.table === table && TEXT_TYPES.has(c.type)).map((c) => c.name);
      if (cols.length) await run(distinctValuesSql(table, cols));
    }
    const ms = performance.now() - start;
    console.log(`distinctValuesSql: ${tablesUnlocked(12).length} tables in ${ms.toFixed(0)} ms`);
    expect(ms).toBeLessThan(1000);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/erd.test.ts`
Expected: FAIL (`distinctValuesSql` is not a function / không có export).

- [ ] **Step 3: Câu SQL, cache theo phiên, dòng giá trị**

**Sửa `src/state.ts`** — thay:
```ts
import { localStore } from './storage';
import type { Ticket } from './tickets';
import { loadErMetadata } from './viz/erd';
import { memoByKey } from './viz/memo';
```
bằng:
```ts
import { localStore } from './storage';
import type { Ticket } from './tickets';
import { distinctValuesSql, loadErMetadata, TEXT_TYPES, toDistinctValues } from './viz/erd';
import { memoByKey } from './viz/memo';
```

**Sửa `src/state.ts`** — thay:
```ts
export const erMeta = memoByKey((schema) => loadErMetadata((sql) => app.run(sql), schema));

export const done = (): Set<string> => new Set(app.save.completed);
export const selected = (): Ticket => app.tickets.find((x) => x.id === app.selectedId)!;
```
bằng:
```ts
export const erMeta = memoByKey((schema) => loadErMetadata((sql) => app.run(sql), schema));

/**
 * Values of the short text columns of a game table (product-design-v4 §C.4-4: look at the data before filtering), for the
 * Columns tab and the Data page. One query per table, once per session (memoByKey drops a failure so it is retried).
 */
export const textValues = memoByKey((table) => erMeta('public').then((m) => {
  const cols = m.cols.filter((c) => c.table === table && TEXT_TYPES.has(c.type)).map((c) => c.name);
  return cols.length ? app.run(distinctValuesSql(table, cols)).then(toDistinctValues) : {};
}));

export const done = (): Set<string> => new Set(app.save.completed);
export const selected = (): Ticket => app.tickets.find((x) => x.id === app.selectedId)!;
```

**Sửa `src/ui/dataView.ts`** — thay:
```ts
import { CHAPTER_TABLES, chapterTitle } from '../progress';
import { dataTableOf, hashOf } from '../route';
import { app, erMeta, unlockedTables } from '../state';
import { chapterColor, cx, THEME_EVENT } from '../theme';
import { erDefinition, erRowCountsSql, type ErMetadata } from '../viz/erd';
import { memoByKey } from '../viz/memo';
import { h, nodes } from './dom';
import { drawErd, erdSvg, keyBadges } from './erdView';
import { errorView } from './feedback';
import { renderResult } from './resultTable';
```
bằng:
```ts
import { CHAPTER_TABLES, chapterTitle } from '../progress';
import { dataTableOf, hashOf } from '../route';
import { app, erMeta, textValues, unlockedTables } from '../state';
import { chapterColor, cx, THEME_EVENT } from '../theme';
import { erDefinition, erRowCountsSql, type ErMetadata } from '../viz/erd';
import { memoByKey } from '../viz/memo';
import { h, nodes } from './dom';
import { drawErd, erdSvg, keyBadges, valuesLine } from './erdView';
import { errorView } from './feedback';
import { renderResult } from './resultTable';
```

**Sửa `src/ui/dataView.ts`** — thay:
```ts
    const needle = q();
    const cell = 'border-b border-line px-2 py-1.5 text-left align-top';
    columnsHost.replaceChildren(h('table', { class: 'w-full border-collapse text-sm max-sm:block' },
      h('thead', { class: 'max-sm:hidden' }, h('tr', {}, ...['#', t('data.col.name'), t('data.col.type'), t('data.col.null'), t('data.col.key')].map((x) => h('th', { class: cell }, x)))),
      h('tbody', { class: 'max-sm:block' }, ...colsOf(sel).map((c, i) => h('tr', { class: 'max-sm:flex max-sm:flex-wrap max-sm:items-center max-sm:gap-x-2 max-sm:border-b max-sm:border-line max-sm:py-1.5' },
        h('td', { class: cx(cell, 'text-muted max-sm:hidden') }, String(i + 1)),
        h('td', { class: cx(cell, 'max-sm:basis-full max-sm:border-0 max-sm:p-0 max-sm:font-semibold') }, h('code', {}, needle && c.name.includes(needle) ? h('mark', {}, c.name) : c.name)),
        h('td', { class: cx(cell, 'max-sm:border-0 max-sm:p-0') }, c.type),
        h('td', { class: cx(cell, 'max-sm:border-0 max-sm:p-0') }, h('code', {}, c.nullable ? 'NULL' : 'NOT NULL')),
```
bằng:
```ts
    const needle = q();
    const cell = 'border-b border-line px-2 py-1.5 text-left align-top';
    const values = textValues(sel);
    columnsHost.replaceChildren(h('table', { class: 'w-full border-collapse text-sm max-sm:block' },
      h('thead', { class: 'max-sm:hidden' }, h('tr', {}, ...['#', t('data.col.name'), t('data.col.type'), t('data.col.null'), t('data.col.key')].map((x) => h('th', { class: cell }, x)))),
      h('tbody', { class: 'max-sm:block' }, ...colsOf(sel).map((c, i) => h('tr', { class: 'max-sm:flex max-sm:flex-wrap max-sm:items-center max-sm:gap-x-2 max-sm:border-b max-sm:border-line max-sm:py-1.5' },
        h('td', { class: cx(cell, 'text-muted max-sm:hidden') }, String(i + 1)),
        h('td', { class: cx(cell, 'max-sm:basis-full max-sm:border-0 max-sm:p-0 max-sm:font-semibold') }, h('code', {}, needle && c.name.includes(needle) ? h('mark', {}, c.name) : c.name),
          valuesLine(values, c.name, 'mt-0.5 font-normal')),
        h('td', { class: cx(cell, 'max-sm:border-0 max-sm:p-0') }, c.type),
        h('td', { class: cx(cell, 'max-sm:border-0 max-sm:p-0') }, h('code', {}, c.nullable ? 'NULL' : 'NOT NULL')),
```

**Sửa `src/ui/erdView.ts`** — thay:
```ts
import { t } from '../i18n';
import type { ErConstraint } from '../viz/erd';
import { isDark } from '../theme';
import { once } from '../viz/memo';
import { h, nodes } from './dom';
```
bằng:
```ts
import { t } from '../i18n';
import type { ErConstraint } from '../viz/erd';
import { cx, isDark } from '../theme';
import { once } from '../viz/memo';
import { h, nodes } from './dom';
```

**Sửa `src/ui/erdView.ts`** — thay:
```ts
const BADGE = 'rounded bg-code px-1 text-xs font-semibold ring-1 ring-line';

/**
 * PK / UK / FK badges of one column. An FK to an unlocked table shows `→ table.column` (a button when `onRef` is given);
```
bằng:
```ts
const BADGE = 'rounded bg-code px-1 text-xs font-semibold ring-1 ring-line';

/** "AIRPORT · SEAPORT" under a column name: hidden until the values are in, and for columns with too many of them. */
export function valuesLine(values: Promise<Record<string, string[]>> | undefined, column: string, cls = ''): HTMLElement {
  const el = h('span', { class: cx('block text-xs text-muted', cls), hidden: true });
  values?.then((v) => {
    if (!v[column]) return;
    el.textContent = v[column].join(' · ');
    el.hidden = false;
  }, () => {});
  return el;
}

/**
 * PK / UK / FK badges of one column. An FK to an unlocked table shows `→ table.column` (a button when `onRef` is given);
```

**Sửa `src/ui/vizTabs.ts`** — thay:
```ts
import { hashOf } from '../route';
import { activeTicket } from '../session';
import { app, erMeta, selected, unlockedTables } from '../state';
import { chapterColor, THEME_EVENT } from '../theme';
import { erDefinition, relatedTables, tablesInQuery, type ErMetadata } from '../viz/erd';
```
bằng:
```ts
import { hashOf } from '../route';
import { activeTicket } from '../session';
import { app, erMeta, selected, textValues, unlockedTables } from '../state';
import { chapterColor, THEME_EVENT } from '../theme';
import { erDefinition, relatedTables, tablesInQuery, type ErMetadata } from '../viz/erd';
```

**Sửa `src/ui/vizTabs.ts`** — thay:
```ts
import { renderChart } from './chartView';
import { h, nodes } from './dom';
import { drawErd, erdSvg, keyBadges } from './erdView';
import { renderExplain } from './explainView';
import { errorView } from './feedback';
```
bằng:
```ts
import { renderChart } from './chartView';
import { h, nodes } from './dom';
import { drawErd, erdSvg, keyBadges, valuesLine } from './erdView';
import { renderExplain } from './explainView';
import { errorView } from './feedback';
```

**Sửa `src/ui/vizTabs.ts`** — thay:
```ts
      const s = scoped(meta);
      const open = new Set(visibleTables());
      body.append(...scopeBar(s, deps), h('div', { class: 'grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2' }, ...s.tables.map((table) =>
        h('div', {},
          h('h3', { class: 'm-0' }, table),
          h('ul', { class: 'mt-1 mb-2 list-none space-y-0.5 pl-2 text-sm' }, ...meta.cols.filter((c) => c.table === table).map((c) =>
            h('li', { class: 'flex flex-wrap items-center gap-1' }, h('code', {}, c.name), h('span', { class: 'muted' }, c.type), ...keyBadges(meta.cons, table, c.name, open))))))));
    }),
  });
```
bằng:
```ts
      const s = scoped(meta);
      const open = new Set(visibleTables());
      const game = new Set(unlockedTables()); // imported Sandbox tables get no value lists
      body.append(...scopeBar(s, deps), h('div', { class: 'grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2' }, ...s.tables.map((table) => {
        const values = game.has(table) ? textValues(table) : undefined;
        return h('div', {},
          h('h3', { class: 'm-0' }, table),
          h('ul', { class: 'mt-1 mb-2 list-none space-y-0.5 pl-2 text-sm' }, ...meta.cols.filter((c) => c.table === table).map((c) =>
            h('li', { class: 'flex flex-wrap items-center gap-1' }, h('code', {}, c.name), h('span', { class: 'muted' }, c.type), ...keyBadges(meta.cons, table, c.name, open),
              valuesLine(values, c.name, 'basis-full pl-2')))));
      })));
    }),
  });
```

**Sửa `src/viz/erd.ts`** — thay:
```ts
}

export interface Related { tables: string[]; dropped: string[] }
```
bằng:
```ts
}

/** Text column types whose values the Columns tab and the Data page list (product-design-v4 §C.4-4, D-C7). */
export const TEXT_TYPES = new Set(['text', 'character varying', 'character']);
/** A column with more distinct values than this shows none. */
export const VALUES_MAX = 20;

/** Distinct values of `columns` of one table in one statement, sorted, at most VALUES_MAX + 1 each (so "too many" is known). */
export function distinctValuesSql(table: string, columns: string[]): string {
  for (const x of [table, ...columns]) if (!IDENT.test(x)) throw new Error(`invalid name: ${x}`);
  return columns.map((c) => `SELECT '${c}' AS c, ARRAY(SELECT DISTINCT ${c} FROM ${table} WHERE ${c} IS NOT NULL ORDER BY 1 LIMIT ${VALUES_MAX + 1}) AS v`)
    .join(' UNION ALL ');
}

/** column → its values, only for columns with at most VALUES_MAX of them. */
export function toDistinctValues(r: QueryResult): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [c, v] of r.rows) if (Array.isArray(v) && v.length <= VALUES_MAX) out[String(c)] = v.map(String);
  return out;
}

export interface Related { tables: string[]; dropped: string[] }
```

- [ ] **Step 4: Chạy test, xác nhận PASS; ngân sách**

Run: `npx vitest run tests/erd.test.ts tests/theme.test.ts && npx tsc --noEmit && npm run build && node scripts/check-budget.mjs`
Expected: PASS; `main ≈ 268,5 / 270`.

- [ ] **Step 5: Chạy toàn bộ rồi commit**

Run: `npm test`
Expected: mọi test PASS (1593 test).

```bash
git add src/state.ts src/ui/dataView.ts src/ui/erdView.ts src/ui/vizTabs.ts src/viz/erd.ts tests/erd.test.ts
git commit -m "feat: Columns tab and Data page list the values of short text columns (v4 §C.4-4, D-C7)

Claude-Session: https://claude.ai/code/session_01PwPSBV1SVDP6quEZfKN56M"
```

---

### Task 7: CLAUDE.md, problem-design §1.5, kiểm deploy, kiểm toàn bộ, checklist Edge

**Files:** `CLAUDE.md`, `docs/team/problem-design.md`, `scripts/check-deploy.sh`

- [ ] **Step 1: Ghi luật mới**

**Sửa `CLAUDE.md`** — thay:
```markdown
- The task bar (`#map`, `src/ui/mapStrip.ts`, ui-ux-v4 §2–3, replaces L35/L37) shows in story mode and lane mode on `#/play` (story buttons call `selectTicket()`, which forces story mode; in lane mode it shows "Về việc đang làm", the lane badge and that lane's side tasks instead): chapter `<select>`, ‹ › and one button per task of the open ticket's chapter (the open one has a thick bottom border; `navTargets()`, `src/viz/progressDots.ts`: done tickets + the first not done, in story order; later tasks are disabled and never show their title), and a continue button (main button right after a correct answer, "back to current task" while reviewing an old one). "See the map" opens `<dialog id="map-dialog">` with `routeMap()` (pins are buttons), the lane list and the picked lane's brief (`src/ui/lanePanel.ts`), so the player never leaves the task. Redrawn whole by `syncMap()` from `rerender()` (focus kept by `data-nav`); the dialog is refilled when open.
- i18n: `src/i18n/vi.ts` is the key source; `src/i18n/en.ts` is `Record<Key, Msg>`, so a missing key fails `tsc`. All UI text goes through `t(key)`; static markup uses `data-i18n`/`data-i18n-aria`. EN plurals use function messages. Never translate table/column names, SQL, data values, Postgres error messages, or people's names and departments. `tests/i18n.test.ts` checks placeholders match and EN differs from VI (allow-list `SAME_OK`). `en.ts` is a lazy chunk (Plan 5, main budget): `main.ts` awaits `loadLang()` with `loadContent()`, `setLang()` is async, `t()` falls back to VI until EN is in, and `tests/setup.ts` loads it.
- Teaching errors: `src/ui/sqlErrors.ts` maps SQLSTATE (plus a few message regexes) to an explanation shown under Postgres' unchanged message; `tests/sqlErrors.test.ts` runs the wrong SQL on real PGlite.
- The shape card ("Expected result", `src/shape.ts`) shows column count/kinds, row count and the `columns:` labels, never the Solution's column names (they would give the answer away).
- localStorage keys besides the save, all device preferences wrapped in try/catch (`src/storage.ts`) and never part of `Save`: `cargo-query/prefs` (`{ lang, theme }`; `theme` is `light | dark | system`, anything else reads as `system`), `cargo-query/layout` (splitter sizes), `cargo-query/coach-done` (onboarding skipped), `cargo-query/history` (last 15 queries per ticket id, shared by a boss's steps; Sandbox keeps none), `cargo-query/route` (last route, `home` | `play` | `data`), `cargo-query/cards-ran` (dashboard cards, id + SQL, that ran without error on this device; only those auto-run, so an imported save's cards wait for Chạy). Every stored value is validated on read (`loadHistory`, `parseLayout`, `coachDone`): bad data is dropped, never thrown.
- Dependencies are pinned exactly: `@electric-sql/pglite` 0.5.16 (seed depends on it), `@codemirror/lint` 6.9.8, `@codemirror/language` 6.13.1, `@lezer/highlight` 1.2.5, `sql-formatter` 15.9.0 (lazy chunk, loaded by Format / Shift+Alt+F), `tailwindcss` 4.3.5 and `@tailwindcss/vite` 4.3.5 (dev). `libpg-query` 18.2.4 and `pgsql-deparser` 18.4.5 (lazy, loaded in the worker by the Execution order tab), `mermaid` 12.3.0 (lazy chunk, ER tab). Add new ones with `npm i --save-exact`.
```
bằng:
```markdown
- The task bar (`#map`, `src/ui/mapStrip.ts`, ui-ux-v4 §2–3, replaces L35/L37) shows in story mode and lane mode on `#/play` (story buttons call `selectTicket()`, which forces story mode; in lane mode it shows "Về việc đang làm", the lane badge and that lane's side tasks instead): chapter `<select>`, ‹ › and one button per task of the open ticket's chapter (the open one has a thick bottom border; `navTargets()`, `src/viz/progressDots.ts`: done tickets + the first not done, in story order; later tasks are disabled and never show their title), and a continue button (main button right after a correct answer, "back to current task" while reviewing an old one). "See the map" opens `<dialog id="map-dialog">` with `routeMap()` (pins are buttons), the lane list and the picked lane's brief (`src/ui/lanePanel.ts`), so the player never leaves the task. Redrawn whole by `syncMap()` from `rerender()` (focus kept by `data-nav`); the dialog is refilled when open.
- i18n: `src/i18n/vi.ts` is the key source; `src/i18n/en.ts` is `Record<Key, Msg>`, so a missing key fails `tsc`. All UI text goes through `t(key)`; static markup uses `data-i18n`/`data-i18n-aria`. EN plurals use function messages. Never translate table/column names, SQL, data values, Postgres error messages, or people's names and departments. `tests/i18n.test.ts` checks placeholders match and EN differs from VI (allow-list `SAME_OK`). `en.ts` is a lazy chunk (Plan 5, main budget): `main.ts` awaits `loadLang()` with `loadContent()`, `setLang()` is async, `t()` falls back to VI until EN is in, and `tests/setup.ts` loads it.
- Quick lessons (Plan 6, product-design-v4 §C, L54): `content/lessons.yml` (one entry per skill id: `cues`, `concept`, `example`, `explain`, `mistake`, `try` {task, starter, solution, ordered}, `docs`) is its own lazy chunk (`src/lessonSources.ts`, budget `lessons`), parsed by `parseLessons` (`src/lessons.ts`) into `loadLessons()` (`src/content.ts`). `src/ui/lessonCard.ts`: `lessonSlot()` puts the cards of a story ticket's `grants` between the message and the task (first lesson not seen is open, the rest one line); `openLesson()` shows one in `<dialog id="lesson-dialog">` from a skill chip ("Kỹ năng mới / Cần dùng", a button when the skill has a lesson) or the handbook. "Thử ngay" is graded by `grade()` against the lesson's own answer, 0 XP, never touching `app.lastRun`, drafts or history. Seen/tried is the device pref `cargo-query/lessons` (`{ seen, tried }`, `loadLessonPrefs`), not the save. `tests/lessons.test.ts`: every ch1–3 skill has a lesson, example and try answer differ from the granting ticket's Solution (every variant), the granting ticket uses a cue (`cueIn`: the parts between "…" in order inside one sentence), code spans VI = EN, EN without diacritics.
- Hints are free in all of chapter 1 (L54, `FREE_HINT_CHAPTER` in `xpFor`); elsewhere 25% each, at most 3. Hint 1 names the concept (problem-design §1.5 as amended). Every normal ticket in every chapter has `reflect`, and each chapter has exactly one `faded` ticket, its first develop (`tests/content.test.ts`); `format: worked` on the teach ticket only from chapter 4.
- The Columns tab and the Data page list the values of text columns with at most 20 distinct values (`textValues(table)` in `src/state.ts`, `distinctValuesSql` in `src/viz/erd.ts`: one statement per table, once per session; game tables only).
- Teaching errors: `src/ui/sqlErrors.ts` maps SQLSTATE (plus a few message regexes) to an explanation shown under Postgres' unchanged message; `tests/sqlErrors.test.ts` runs the wrong SQL on real PGlite.
- The shape card ("Expected result", `src/shape.ts`) shows column count/kinds, row count and the `columns:` labels, never the Solution's column names (they would give the answer away).
- localStorage keys besides the save, all device preferences wrapped in try/catch (`src/storage.ts`) and never part of `Save`: `cargo-query/prefs` (`{ lang, theme }`; `theme` is `light | dark | system`, anything else reads as `system`), `cargo-query/layout` (splitter sizes), `cargo-query/coach-done` (onboarding skipped), `cargo-query/lessons` (quick lessons seen/tried), `cargo-query/history` (last 15 queries per ticket id, shared by a boss's steps; Sandbox keeps none), `cargo-query/route` (last route, `home` | `play` | `data`), `cargo-query/cards-ran` (dashboard cards, id + SQL, that ran without error on this device; only those auto-run, so an imported save's cards wait for Chạy). Every stored value is validated on read (`loadHistory`, `parseLayout`, `coachDone`): bad data is dropped, never thrown.
- Dependencies are pinned exactly: `@electric-sql/pglite` 0.5.16 (seed depends on it), `@codemirror/lint` 6.9.8, `@codemirror/language` 6.13.1, `@lezer/highlight` 1.2.5, `sql-formatter` 15.9.0 (lazy chunk, loaded by Format / Shift+Alt+F), `tailwindcss` 4.3.5 and `@tailwindcss/vite` 4.3.5 (dev). `libpg-query` 18.2.4 and `pgsql-deparser` 18.4.5 (lazy, loaded in the worker by the Execution order tab), `mermaid` 12.3.0 (lazy chunk, ER tab). Add new ones with `npm i --save-exact`.
```

**Sửa `docs/team/problem-design.md`** — thay:
```markdown
### 1.5 Gợi ý: ba bậc, từ nghiệp vụ tới SQL

| Bậc | Nội dung | Được nhắc |
|---|---|---|
```
bằng:
```markdown
### 1.5 Gợi ý: ba bậc, từ nghiệp vụ tới SQL

> **Sửa theo L54 (product-design-v4 §C.4, D-C6):** bậc 1 bắt đầu bằng tên **khái niệm** ("Đây là bài lọc dòng: …"), rồi mới nghiệp vụ → dữ liệu, và nhắc mở lại Bài học nhanh của kỹ năng. Bậc 2 (cú pháp) và bậc 3 (gần đáp án) giữ như bảng dưới. Chương 1: mọi gợi ý miễn phí.

| Bậc | Nội dung | Được nhắc |
|---|---|---|
```

**Sửa `scripts/check-deploy.sh`** — thay:
```bash
EN=$(get "$MAIN" | grep -oE '\./en-[A-Za-z0-9_-]+\.js' | head -1 | cut -c3-)
[ -n "$LANES" ] && [ -n "$EN" ] || { echo "FAIL $MAIN does not reference laneSources-*.js and en-*.js"; exit 1; }
for f in $MAIN "assets/$WORKER" "assets/$TICKETS" "assets/$LANES" "assets/$EN" $(printf 'assets/%s ' $FILES $LIBWASM); do
  H=$(curl -sS -o /dev/null -D - -H 'Accept-Encoding: br, gzip' "$URL/$f" | tr -d '\r')
  status=$(printf '%s\n' "$H" | head -1 | cut -d' ' -f2)
```
bằng:
```bash
EN=$(get "$MAIN" | grep -oE '\./en-[A-Za-z0-9_-]+\.js' | head -1 | cut -c3-)
[ -n "$LANES" ] && [ -n "$EN" ] || { echo "FAIL $MAIN does not reference laneSources-*.js and en-*.js"; exit 1; }
# Plan 6: the quick lessons are a lazy chunk awaited before the first render too.
LESSONS=$(get "$MAIN" | grep -oE 'lessonSources-[A-Za-z0-9_-]+\.js' | head -1)
[ -n "$LESSONS" ] || { echo "FAIL $MAIN does not reference lessonSources-*.js"; exit 1; }
for f in $MAIN "assets/$WORKER" "assets/$TICKETS" "assets/$LANES" "assets/$EN" "assets/$LESSONS" $(printf 'assets/%s ' $FILES $LIBWASM); do
  H=$(curl -sS -o /dev/null -D - -H 'Accept-Encoding: br, gzip' "$URL/$f" | tr -d '\r')
  status=$(printf '%s\n' "$H" | head -1 | cut -d' ' -f2)
```

- [ ] **Step 2: Kiểm toàn bộ**

Run: `npm test && npx tsc --noEmit && npm run build && node scripts/check-budget.mjs && bash -n scripts/check-deploy.sh`
Expected:
- Tất cả PASS: 1593 test.
- Mọi nhóm ngân sách `ok`: `main ≈ 269 / 270` (268,5), `tickets 104 / 110`, `lessons 8 / 20`, `lanes 10 / 20`, `en 12 / 20`, `worker 144 / 160`.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md docs/team/problem-design.md scripts/check-deploy.sh
git commit -m "docs: CLAUDE.md notes for Plan 6 (quick lessons, free chapter 1 hints, column values); hint order in problem-design §1.5; deploy check covers lessonSources

Claude-Session: https://claude.ai/code/session_01PwPSBV1SVDP6quEZfKN56M"
```

- [ ] **Step 4: Checklist Edge (orchestrator; origin riêng, không đụng save ở :5173)**

**Chuẩn bị:**
- Chạy `npx vite --port 5174 --strictPort`. Mục 1 dùng thêm `npm run build && npx vite preview --port 5175 --strictPort`.
- Mở trên **Edge**. **Không** mở `:5173`.
- Mục 2 dùng một cửa sổ InPrivate (không save, không pref) hoặc xóa `cargo-query-save` và `cargo-query/lessons` của origin `:5174` trong DevTools.
- Tạo các file ngoài repo rồi nạp bằng **Nhập tiến độ** (menu `⋯`). Mẫu chung (save v3):
  `{"version":3,"completed":[…],"xp":0,"hintsUsed":{},"drafts":{},"graded":{},"review":{},"practice":{"solved":0,"weak":0},"sandboxDraft":"","bossStep":{},"dashboard":{"cards":[],"hidden":[]},"lanes":[]}`
  - `save-v3-ch1-done.json`: `completed` = `ch1-01` … `ch1-05` (việc tiếp theo ch2-01). Dùng cho: bài học `aggregate`, gợi ý có giá ở ch2.
  - `save-v3-ch3-02.json`: `completed` = `ch1-01` … `ch3-02` (việc tiếp theo ch3-03). Dùng cho: hai bài học xếp chồng.
  - `save-v3-hints-ch1.json`: như file ch1 nhưng `"hintsUsed":{"ch1-02":3}` và `"xp":800`. Dùng cho: Tổng kết chương 1 tính lại XP (U1).

**Kiểm** (mỗi dòng ✓/✗, ghi số đo):

1. **Boot (bản build, :5175).**
   - `dist/index.html` chỉ preload `index-*.js` và `preload-helper-*.js`; tab Network có `lessonSources-*.js` tải cùng `ticketSources-*.js`.
   - Đo tới nút Chạy sẵn sàng (VI) so với HEAD trước Plan 6.
   - Không lỗi console.
2. **Người mới (InPrivate), ch1-01.**
   - Thẻ "Bài học nhanh · Chọn cột (SELECT)" mở sẵn giữa tin nhắn và "Yêu cầu".
   - "Chạy ví dụ" ra bảng 9 dòng; tab Kết quả **không** đổi, editor vẫn là `SELECT * FROM ports`.
   - Thử ngay: gõ `SELECT name, code FROM carriers` → "9 dòng sai giá trị…"; gõ `SELECT code, name FROM carriers` → "Đúng rồi!…".
   - XP không đổi.
   - "Đã hiểu ✓" thu gọn thành "Bài học nhanh: Chọn cột (SELECT) ✓ · Mở lại", focus ở nút "Mở lại".
   - Tải lại trang: thẻ vẫn thu gọn (`localStorage['cargo-query/lessons']` = `{"seen":["select"],"tried":["select"]}`).
3. **Chip và hộp thoại.**
   - Thanh chip ghi "Kỹ năng mới:"; chip "Chọn cột (SELECT)" là nút.
   - Bấm chip: hộp thoại modal cùng nội dung, Tab không thoát ra ngoài, Esc đóng và focus về chip.
   - 375 px: hộp thoại thành tấm đáy, không tràn ngang.
4. **ch1-02 (faded).**
   - Editor có `WHERE ___ AND ___`. Nộp ngay thì báo còn chỗ trống, không tính nộp sai.
   - Thẻ "Lọc dòng (WHERE)" mở sẵn.
   - Gợi ý ghi "Gợi ý 1/3" (không "−x XP"); coach mark gợi ý nói chương 1 miễn phí.
   - Nộp `… WHERE region = 'Europe' AND kind = 'AIRPORT'` (sai): phản hồi chung.
   - Nộp `… WHERE region = 'Europe' OR kind = 'SEAPORT'`: hiện lời `wrong:` về OR.
   - Nộp đúng sau 3 gợi ý: Recap "+100 XP · đã dùng 3 gợi ý"; câu ngẫm lại AND/OR có ✓ và lý do.
5. **Tab Cột / trang Dữ liệu.**
   - Ở ch1-02, tab Cột dưới `kind` ghi "AIRPORT · SEAPORT", dưới `region` 6 khu vực; `code`, `name` không có dòng giá trị.
   - Trang Dữ liệu → `employees`: `dept` ghi "CS · Customs · Finance · Management · Ops · Sales".
   - Sandbox với một bảng CSV nhập: tab Cột của bảng nhập không có dòng giá trị.
6. **Hai bài học xếp chồng (`save-v3-ch3-02.json`, ch3-03).**
   - "Giữ dòng không khớp (LEFT JOIN)" mở, "Tìm dòng không có cặp (anti-join)" một dòng "Xem".
   - "Đã hiểu ✓" ở thẻ một thì thẻ hai mở.
   - Chip "Cần dùng:" có "Nối 2 bảng (JOIN)" bấm được.
7. **Chương 2 (`save-v3-ch1-done.json`, ch2-01).**
   - Thẻ bài học `COUNT/SUM/AVG/MIN/MAX, ROUND` mở sẵn.
   - Nút gợi ý ghi "Gợi ý 1/3 (−25 XP)".
8. **Sổ tay.** Thẻ `having` (chưa học ở save ch1) có "Mở sau việc ch2-03" và nút "Bài học nhanh" mở hộp thoại; thẻ `date_math` (ch4) không có nút.
9. **`save-v3-hints-ch1.json`:** Tổng kết chương 1 (Recap ch1-05) ghi XP như không dùng gợi ý; không cảnh báo save.
10. **EN:** đổi ngôn ngữ khi thẻ đang mở: nhãn thẻ, ví dụ giải thích, Thử ngay sang EN; nháp Thử ngay giữ nguyên; chip "New skill:" / "Uses:".
11. **Dark mode + 375 px:** thẻ bài học, bảng kết quả ví dụ, ô Thử ngay, dòng giá trị trong tab Cột, không tràn ngang trang.

Ghi kết quả vào `docs/team/decision-log.md` (dòng L-số mới) cùng U1–U12. **Cần user xem:** U2 (file `lessons.yml` riêng), U3 (main còn ~1,5 KB), U5 (miễn phí mọi bậc), U8.

---

## Đã kiểm khi viết plan (2026-11-17)

**Cách viết và replay:**
- Viết trên bản `git archive` của HEAD **`4c84973`** (`node_modules` nối bằng junction), mỗi task một commit.
- Sinh plan từ chính các commit đó, rồi **replay** toàn bộ plan lên một bản `git archive` sạch khác, dừng sau từng task: đọc các khối `Tạo` / `Ghi lại` / `Sửa … — thay/bằng`, mỗi khối "thay" phải khớp đúng một lần, rồi so mọi file task đó chạm với commit tương ứng.
- Kết quả:
  - 62 khối áp được, không khối nào lệch; cây file sau Task 7 giống hệt bản viết (`diff -r`, bỏ qua CRLF).
  - Sau mỗi task `tsc` sạch và mọi test PASS: 1473, 1474, 1531, 1591, 1591, 1593, 1593 (HEAD có 1472).
  - `npm run build` sạch; `check-budget` mọi nhóm `ok`: `main` 268,44/270, `tickets` 103/110, `lessons` 8/20, `lanes` 10/20, `en` 12/20, `worker` 144/160.
  - `dist/index.html` chỉ preload `index-*.js` và `preload-helper-*.js`; `bash -n scripts/check-deploy.sh` sạch.

**Nội dung (PGlite 0.5.16, `schema.sql` + `seed.sql` của HEAD):**
- Mọi Solution ch1–3 không đổi. Mọi `wrong:` mới chạy ra dòng và khác Solution ở mọi biến thể.
- Ứng viên bị loại vì trùng Solution: ch1-03 "bỏ lô hủy" (05/2026), "thiếu tiêu chí phụ" (không hòa ở ranh LIMIT ở cả 3 tháng); ch2-03 `>=` (cả 3 biến thể); ch3-03 "quên điều kiện ngày" (0 dòng).
- Ví dụ, câu mở đầu và lời giải Thử ngay của 11 bài học chạy ra số dòng như bảng trên; câu sai của `where`, `aggregate`, `group_by`, `having`, `join`, `multi_join` báo đúng lỗi Postgres ghi trong bài.
- Giá trị cột chữ: 22 bảng, tổng ~50 ms trong Node.

**Smoke test trên Chrome** (bản build của bản viết, cổng 5181, không save):
- ch1-01: thẻ "Quick lesson · Select columns (SELECT)" mở sẵn.
- "Run the example" ra 9 dòng, tab Kết quả không đổi.
- Thử ngay sai: "9 rows have wrong values…"; Thử ngay đúng: "Correct!…", pref `{"seen":["select"],"tried":["select"]}`.
- Chip mở `#lesson-dialog`.
- Tab Cột: `country`, `region`, `kind` có dòng giá trị; `code`, `name` không.
- Không lỗi console.

**Chưa kiểm trên Edge:** checklist Task 7 Step 4 (orchestrator, cổng 5174/5175), gồm đo thời gian khởi động, 375 px, dark mode, bàn phím trong hộp thoại.
