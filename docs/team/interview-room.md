# Phòng phỏng vấn (v17 I5): thiết kế lớp nội dung + dữ liệu

> **Đã nối UI (L144, decision-log).** Chỗ nào dưới đây khác L144 thì L144 đúng: trang là `#/learn/interview` (không phải `#/practice/interview`); Save **bỏ** id `g-iv-…` khi đọc (`INTERVIEW_ID`), không giữ; pref `cargo-query/interview` giữ một lượt đang làm cho **mỗi** bộ đề / take-home (`live[id]`).

Track F (L138). Chỉ nội dung và dữ liệu, chưa có UI, chưa có route; UI làm sau v16. Nguồn: `product-roadmap-v15.md` I5, D-N10, tiêu chí thành công v17.

## 1. Định dạng dữ liệu

Một file `content/general/interview.yml`, hai danh sách:

- `sets`: bộ đề tính giờ. Mỗi bộ có `id` (`junior-1`), `level` (`junior | mid`), `modules` (các Phần của lộ trình General = `chapter` của kỹ năng trong `content/skills.yml`), `minutes` (giờ gợi ý cho đồng hồ), `title {vi,en}` và **đúng 5** `questions`.
  - Mỗi câu là một drill không khung: `id` = `g-iv-<bộ>-<n>`, `skills` (mọi kỹ năng mà Solution dùng), `task {vi,en}`, `solution`, `ordered?`, `hint {vi,en}`, `wrong?` (có `wrong` thì là `trap`).
  - Câu **không** có `starter`; parser từ chối nếu có.
- `takeHomes`: 3 bài làm ở nhà. Mỗi bài có `id` (`g-iv-th-<n>`), `modules`, `title`, `brief` (lời nhờ của người giao việc), 3–4 `steps`, `conclusion` (đề cho đoạn tự viết) và `rubric` (≥ 3 tiêu chí `{vi,en}`).
  - Mỗi bước có `title`, `task`, `solution`, `ordered: true`, `hint`. Như đánh giá thăng tiến, mọi bước đều có thứ tự; id bước là `g-iv-th-<n>-<k>`.

Hiện có 3 bộ đề × 5 câu và 3 take-home:

| Bộ | Cấp | Phần | Phút |
|---|---|---|---|
| `junior-1` | junior | 1–4 | 20 |
| `mid-1` | mid | 1–8 | 25 |
| `mid-2` | mid | 1–10 | 30 |

| Take-home | Phần | Chủ đề |
|---|---|---|
| `g-iv-th-1` | 1–5 | Cửa hàng hụt mục tiêu tháng |
| `g-iv-th-2` | 1–8 | Khách quay lại trong 90 ngày theo quý và theo cửa hàng |
| `g-iv-th-3` | 1–9 | Đối soát thanh toán (thu trùng, tiền không có đơn) |

Phần 11 (EXPLAIN, chỉ mục) không vào phòng phỏng vấn: chấm kế hoạch thực thi nằm ngoài phạm vi I5.

Mọi SQL chỉ chạy trên schema `lab`. "Hôm nay" là 2026-10-31; ngày luôn viết thẳng, không dùng `CURRENT_DATE`/`now()`.

## 2. Dùng lại engine drill và bước đánh giá thăng tiến

- **Parser:** `src/interview.ts` (thuần) gọi `parseDrill`/`bilingualOf` của `src/general.ts` (hai hàm vừa được export), nên mỗi câu và mỗi bước là một `Drill` đúng nghĩa.
  - `Question = Drill & { skills }`; `TakeHomeStep = Drill & { title }`.
- **Id khớp `DRILL_ID` (`g-…`):**
  - `schemaOf()` chạy chúng trên `lab` mà không cần sửa gì.
  - `skillOfDrill()` không đọc ra kỹ năng nào: `iv_junior_1` không phải id kỹ năng, nên làm đề không tính là "đã học".
  - Không trùng id nào trong `generalNow().byId`.
  - Cả ba điều trên có test.
- **Chấm từng câu:** `drillTicket(q)` cho ra một `Ticket`, nên `work.ts`, grader, `wrongTipper`, chặn `___` và `diffView` dùng như drill.
- **Take-home:** `takeHomeTicket(th)` cho ra một `Ticket` `beat: 'boss'`, mỗi bước SQL một step và `ordered: true`, nên `work.ts` đi qua các bước như một đánh giá thăng tiến (kể cả `resumeStep` và việc mang SQL đúng của bước trước sang bước sau).
  - Ticket này không có `conclusion` trắc nghiệm, vì đoạn kết luận do người học tự viết (§4).
- **Việc cho UI sau v16** (ghi lại, chưa làm):
  - Phòng phỏng vấn không bao giờ gọi `complete()` và không ghi `save.completed`, `drafts`, `graded`, `history` hay thẻ Leitner. Id `g-iv-…` sẽ được Save giữ nếu lỡ ghi vào, nên UI phải tự chặn.
  - Kết quả chỉ ghi vào một pref thiết bị, `cargo-query/interview` (đề xuất `{ [setId]: { at, solved, total, ms } }`), có hàm `parse…` kiểm khi đọc như mọi pref khác.
  - `brief.ts` tra `generalNow().byId` cho drill, nên câu phỏng vấn cần đường riêng ở đó (ví dụ `DrillDeps` nhận thêm câu đang mở).

## 3. Đồng hồ tùy chọn, 0 XP, không phạt

- **Đồng hồ:** `minutes` là giờ gợi ý. Người học bật hoặc tắt đồng hồ trước khi bắt đầu.
  - Hết giờ chỉ hiện "Hết giờ" và cho làm tiếp. Không khóa bài, không trừ gì.
- **Khi đồng hồ chạy:** không shape card, không gợi ý, không khung (`frameOf`), không preview "Kết quả mong đợi". Đó là "câu không có khung" mà roadmap nhắc tới.
- **Khi đồng hồ tắt (chế độ tập):** `hint` hiện được, không tính phí.
- **Không bao giờ hiện Solution:** đây không phải chỗ tra đáp án.
  - Test bảo đảm không câu phỏng vấn nào cho cùng kết quả với một drill General, nên không chép được đáp án drill sang.
- **0 XP, không phạt:** nộp sai không tính là lần sai, không đổi box Leitner, không đổi `practice`.

## 4. Đoạn kết luận tự viết, tự chấm theo rubric

- Sau bước SQL cuối, take-home hiện `conclusion` (đề) và một ô văn bản để người học tự viết.
- Sau khi viết xong, rubric hiện ra dưới dạng danh sách để người học tự tích từng tiêu chí đạt. Không có chấm máy cho văn xuôi: không đếm từ khóa, không gọi LLM.
- Đoạn văn chỉ nằm trong máy người học (pref hoặc nháp trong phiên). Portfolio v16 có thể nhận nó sau, nếu người học muốn.
- Tiêu chí rubric dẫn về số liệu của các bước (ví dụ "khớp với bước 3"). Tiêu chí cuối luôn là "viết cho người không biết SQL, ≤ 120 chữ".

## 5. Kiểm tra (`tests/interview.test.ts`)

Test đọc YAML qua `?raw`, không cần chunk. Nó kiểm:

- **Parser:** đủ 5 câu, id theo bộ, không có starter, level hợp lệ, không trùng id; take-home có 3–4 bước `ordered`, rubric ≥ 3 tiêu chí, id dạng `g-iv-th-`.
- **Kỹ năng:**
  - Mọi kỹ năng trong `skills` thuộc `modules` của bộ.
  - Kỹ năng **thật sự dùng** trong SQL (bảng từ khóa → kỹ năng `FEATURES`) phải có trong `skills`.
  - Với take-home, kỹ năng dùng trong mọi bước phải thuộc `modules` của bài.
- **Chạy trên `lab`:** mọi Solution chạy, ra 1–500 dòng trong < 1 s; `ordered` thì có `ORDER BY`; không `CURRENT_DATE`/`now()`; câu sai cho kết quả khác; trên schema game thì báo lỗi hoặc ra kết quả khác. Phần này dùng lại `drillRules` của `tests/generalRules.ts`.
- **Kết quả khác nhau:** các câu trong một bộ và các bước trong một take-home không cùng kết quả; không câu nào trùng kết quả một drill General.
- **Chữ:** VI + EN có đủ ở đề, gợi ý, brief, kết luận và rubric. Code span VI = EN, EN không dấu, đề không nói từ khóa SQL của đáp án.
  - `tests/i18n.test.ts` quét thêm file này để bắt từ "boss" / "sự cố".

## 6. Khi nối vào app (sau v16)

- Thêm chunk lười `src/interviewSources.ts`: `import interview from '../content/general/interview.yml?raw'`, cùng nhóm ngân sách mới `interview` (ước 10 KB gz) trong `scripts/check-budget.mjs`.
  - Chunk này import `src/general.ts` (giá trị), nên Rolldown có thể tách `general.ts` thành chunk chung với `generalSources`. Như vậy vẫn ổn vì cả hai đều lười.
  - Nếu muốn một chunk duy nhất, thêm `interview.yml` vào `generalSources` và ngân sách `general`.
- Thêm `loadInterview()` trong `src/content.ts`, theo mẫu `loadGeneral()` (`once`, xóa promise khi lỗi để thử lại), không bao giờ gọi trong `loadContent()`.
- Thêm route `#/practice/interview` (trang Luyện) và một thẻ ở hub Luyện. Nhớ các luật `noDeadEnds`.
- Không gì trong `src/interview.ts` được import từ main bundle (Plan 6 U3).
