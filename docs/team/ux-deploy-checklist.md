# Checklist review UI/UX sau mỗi lần deploy (BoonData)

Người viết: UI/UX + Product · 2026-11-20.

**Căn cứ:**

- L215 mục 3: UI/UX review mỗi lần deploy, tránh các lỗi kiểu menu domain lệch, sidebar đè.
- L217: review bản live sau mỗi version, ghi vào `review-vNN.md`.
- `roadmap-v22-v30.md` §2.

Mỗi mục dưới đây có **nguồn**: lỗi user báo, hoặc lỗi review và e2e đã tìm ra (`decision-log` L…, `v21-ux-review.md` U…, `v21-e2e-findings.md` E…, commit). Mỗi mục cũng có **cách kiểm đo được**. Nếu `scripts/ux-audit.mjs` đo được thì ghi "tự động"; còn lại là nhìn ảnh.

---

## 1. Chạy ở đâu, cỡ nào

**Bản kiểm:** site live, ngay sau deploy. Không review bản dev. Hồ sơ trình duyệt mới; bật `Network.setBypassServiceWorker`; xóa `localStorage` + `sessionStorage` giữa các lượt (bài học từ v21).

**Matrix bắt buộc:**

| Cỡ | Theme | Thêm |
|---|---|---|
| 1280×800 | sáng + tối | VI + EN |
| 1024×700 | sáng + tối | VI |
| 375×740 | sáng + tối | VI + EN, giảm chuyển động (tối) |
| 320×640 | sáng | VI |

**Trạng thái:**

- người mới (màn chào);
- save đã chơi (`tests/fixtures/save-v5.json` hoặc save e2e);
- mỗi trang mới hoặc đổi trong version.

Mỗi trang mới có ít nhất: trạng thái rỗng, trạng thái có dữ liệu, một hộp thoại/popover mở, một lỗi.

**Ảnh:** đặt tên `<theme>-<w>-<route>[-<state>].png`, giữ tên giữa các version để so trước/sau.

---

## 2. Checklist

Mức: **P1** = che hoặc chặn việc chính, hoặc user đã từng báo đúng lỗi này; **P2** = lệch hệ thống rõ; **P3** = đánh bóng.

### A. Căn lề và neo

| # | Kiểm | Đo | Nguồn | Mức |
|---|---|---|---|---|
| A1 | Popover/menu mở **ngay dưới nút của nó**: menu lĩnh vực dưới chip lĩnh vực, ⋯ dưới ⋯ | Tự động: mép trái/phải popover lệch nút ≤ 8 px; `top` = đáy nút + 4–12 px; nằm trọn trong viewport ở mọi cỡ | User: menu domain lệch (L215); commit `04462c3` "domain menu opens under its chip" | P1 |
| A2 | Các khối trong một cột có cùng mép trái/phải | Tự động: các thẻ con trực tiếp của một section lệch mép trái ≤ 1 px | U23, U14, L47(6) | P2 |
| A3 | Chip/nhãn đi cùng một dòng thì nằm cùng dòng ở mọi cỡ, không rơi lệch lề | Ảnh 1024 và 1280 | U7 (chip FK) | P2 |
| A4 | Bảng và khung ôm nội dung: không có khung rỗng nửa phải | Ảnh: bảng kết quả, Cột, Dữ liệu | U9, U7 | P2 |
| A5 | Sơ đồ Engine: thanh bước, nút ‹ › và câu bước nằm cùng một trục, không nhảy khi đổi bước | Tự động: vị trí nút không đổi giữa bước 1 và bước cuối | thiết kế §5 | P2 |

### B. Chồng lấn và z-index

| # | Kiểm | Đo | Nguồn | Mức |
|---|---|---|---|---|
| B1 | Không phần tử nào đè chữ hoặc nút của phần tử khác | Tự động: với mọi cặp phần tử tương tác hoặc phần tử chữ, `elementFromPoint` ở tâm phải trả về chính nó hoặc con của nó | U2 (chip XP đè chương), U12, U13 | P1 |
| B2 | Dock hoàn thành không che nút đi tiếp ("Bắt đầu chương N", Chạy, phản hồi) | Tự động: rect `#stage` không giao `[data-start-chapter]` và nút Chạy ở 375 và 1024 | U11 | P1 |
| B3 | Thanh dính (pill pane, tab, header) có nền đặc và không cắt dòng chữ đầu | Ảnh 375: workspace, phút đầu | U36 | P2 |
| B4 | Dấu tour hoặc hướng dẫn của Boon không che kết quả hay editor; một linh vật mỗi vùng | Ảnh tour bước 3 và 5 | CLAUDE.md (mascots), U36 | P2 |

### C. Đẩy hay đè

| # | Kiểm | Đo | Nguồn | Mức |
|---|---|---|---|---|
| C1 | Sidebar mở rộng **đẩy** nội dung sang phải, không lớp mờ, không đè | Tự động: mở rộng rail ở 1280 (workspace) và 1100 thì `<main>` dời phải ≥ 190 px, không có phần tử scrim, không cuộn ngang | User (L188) | P1 |
| C2 | Hộp thoại modal đóng khi bấm ra ngoài và khi Esc, focus trả về nút mở | Tự động: bấm backdrop thì `open = false`, `activeElement` là nút mở | User (L140) | P1 |
| C3 | Ngoại lệ có chủ ý vẫn đúng: Sổ tay không modal; màn chào lần đầu không đóng khi bấm nền | Thử tay | L140, L148 | P2 |

### D. Dropdown, popover, hộp thoại

| # | Kiểm | Đo | Nguồn | Mức |
|---|---|---|---|---|
| D1 | Neo đúng nút (A1); khi cuộn hoặc đổi cỡ, popover đi theo hoặc đóng, không trôi | Thử: mở menu rồi đổi cỡ 1280 → 1024 | `04462c3` | P1 |
| D2 | Hộp thoại đủ lớn cho nội dung: ở 1280 hộp bài học rộng ≥ 640 px; không có thanh cuộn trong cho nội dung ngắn hơn một màn | Tự động: `dialog.clientWidth`; `scrollHeight > clientHeight` chỉ khi nội dung > 90dvh | User: popup nhỏ, nội dung "stack nhiều div" (L140: hộp bài học `min(900px,100vw-2rem)`) | P1 |
| D3 | Trong hộp thoại hoặc bài học, các phần tách bằng khoảng cách đều, không lồng khung trong khung | Ảnh: hộp bài học, bài Engine | User (L140) "stack nhiều div lại với nhau khó nhìn"; U27–U29 | P2 |
| D4 | `<select>` và ô chọn dùng control gốc ở điện thoại | Ảnh 375 trang Dữ liệu | v12.0 U6 | P3 |

### E. Chữ bị cắt và xuống dòng

| # | Kiểm | Đo | Nguồn | Mức |
|---|---|---|---|---|
| E1 | Không chữ nào bị cắt ngầm. Cắt có chủ ý thì phải có `title` và nội dung đầy đủ ở chỗ khác | Tự động: phần tử có `scrollWidth > clientWidth` (overflow hidden hoặc ellipsis) mà không có `title` thì là lỗi. Chạy ở 1024/1280, VI + EN | U1 (chức danh "Junio…", EN "D."), U31, U32, U33 | P1 |
| E2 | Top bar **một hàng**: 53 px ở 1024/1280/1366/1440, VI + EN, sáng + tối | Tự động: cao `header`, `#status` không có con bị cắt | L114, L171, U1, U2 | P1 |
| E3 | Tên riêng và tiêu đề không gãy giữa chữ ("Laem / Chabang") trong khi còn chỗ | Ảnh 1280 và 375 | U21, U25 | P2 |
| E4 | Danh sách giá trị và code dài xuống dòng hoặc cuộn trong khung của nó; không đẩy bảng khỏi màn | Tự động: không có phần tử con nào rộng hơn `<main>` | U4, U29 | P1 |
| E5 | Không chữ số cứng sai ("12 chương") | Grep `src/i18n` tìm số + "chương/chapters" | U39 | P3 |

### F. Tương phản và theme

| # | Kiểm | Đo | Nguồn | Mức |
|---|---|---|---|---|
| F1 | Chữ ≥ 4,5:1 (chữ lớn ≥ 3:1), ở **cả hai theme** | Tự động: màu tính qua canvas, nền ghép alpha (hàm `AUDIT` của v21); cặp mới được thêm vào `tests/theme.test.ts` | U15 (4,35:1); L147 (tương phản chip, chương, bản đồ); user: chữ tối khó đọc ở dark | P1 |
| F2 | Mọi màu đến từ token, có bản tối (`:root[data-theme=dark]`); SVG và sơ đồ đọc token, không màu cứng | Grep màu hex mới trong `src/**`; ảnh tối của mọi sơ đồ mới | L42, CLAUDE.md Styling | P2 |
| F3 | Focus ring 2 px `--accent` thấy rõ ở hai theme, không dính mép | Tab qua trang | U20 | P2 |
| F4 | Đổi theme khi đang mở trang thì sơ đồ, Mermaid, biểu đồ vẽ lại đúng màu | Đổi Light → Dark trên trang có sơ đồ | L42 (`cq-theme`) | P2 |

### G. Trùng lặp và số liệu

| # | Kiểm | Đo | Nguồn | Mức |
|---|---|---|---|---|
| G1 | Một con số chỉ hiện **một lần** trong nav/top bar (số chương, số ôn, XP) | Ảnh top bar + sidebar + bottom nav cùng lúc | L12 (không lặp số chương); E1 (badge "Ôn tập 5"); user: số trùng trên nav | P1 |
| G2 | Một đích một icon; một mục nav một nhãn (không có hai "Logistics" trong ngăn kéo) | `tests/icons.test.ts` + ảnh drawer | fcc34c8, `NAV_ICON` | P2 |
| G3 | Một trạng thái nói một lần ("đang tải" chỉ ở một chỗ, một dấu ✓) | Ảnh trạng thái tải | U28, U35 | P3 |
| G4 | Tên truy cập chứa chữ hiển thị (nút có badge) | axe `label-content-name-mismatch` = 0 | E1 | P2 |

### H. Cấp bậc và định hướng

| # | Kiểm | Đo | Nguồn | Mức |
|---|---|---|---|---|
| H1 | `h1` = tên trang con, lớn hơn mọi `h2`; có breadcrumb khi trang sâu hơn 1 tầng | Tự động: cỡ chữ `h1` > `h2` | U16, U18 | P2 |
| H2 | Nav/rail chỉ tô "đang ở" đúng trang hoặc bài đang mở | Mở bài con, nút nâng cao, drill, bài Engine; kiểm `aria-current` | U19 | P2 |
| H3 | Một nút chính mỗi vùng | Đếm `button.primary` (pill teal) mỗi section ≤ 1 | U24, ui-ux-v7 T1 | P2 |

### I. Responsive và vùng chạm

| # | Kiểm | Đo | Nguồn | Mức |
|---|---|---|---|---|
| I1 | `#bottom-nav` một hàng, cao < 72 px ở 320 và 375 | Tự động | U3 | P1 |
| I2 | Không cuộn ngang ở 320 | Tự động: `document.documentElement.scrollWidth <= 320` | v12.0 A6 | P1 |
| I3 | Vùng chạm ≥ 24 px; dòng danh sách ≥ 44 px ở điện thoại | Tự động + axe `target-size` | E3, v12.0 A4 | P2 |
| I4 | Panel tab dưới đủ cao cho biểu đồ, ER, thứ tự thực thi, tab "Bên trong" ở 1280×800; editor không để trống phí chỗ | Ảnh 1280×800 workspace | U5, U10 | P1 |

### J. Chuyển động

| # | Kiểm | Đo | Nguồn | Mức |
|---|---|---|---|---|
| J1 | Giảm chuyển động: hiện khung cuối ngay, không có vòng lặp, "Tiếp" của sơ đồ vẫn chạy | Emulate `prefers-reduced-motion: reduce` | L101–L109 | P1 |
| J2 | Một lần chuyển động ≤ 3 s; vẽ lại (đổi ngôn ngữ, rerender) không phát lại | `tests/mascots.test.ts` + đổi VI/EN giữa lúc chạy | L105, L110 | P2 |
| J3 | Không biến đổi `transform`/`filter` trên link, nút, thẻ (chỉ SVG lá) | Grep lớp `hover:scale/brightness` mới | L93 | P2 |

### K. a11y tự động

| # | Kiểm | Đo | Nguồn | Mức |
|---|---|---|---|---|
| K1 | axe 0 serious/critical trên mọi trang của matrix | `scripts/e2e.mjs`, `axe-report.json` | E1, E3 | P1 |
| K2 | Nội dung nằm trong landmark; trang đọc có link "Bỏ qua tới nội dung" | axe `region`; Tab đầu trang | E4, U37 | P3 |
| K3 | Một thay đổi trạng thái = một câu `aria-live` (không đọc lặp) | Nghe bằng trình đọc màn hình hoặc kiểm `#announce` | v12.0 A1 | P3 |

### L. Riêng khu Database Engine

| # | Kiểm | Đo | Nguồn | Mức |
|---|---|---|---|---|
| L1 | Mỗi bài có đúng một nhãn trung thực ("Chạy thật…", "Sơ đồ", "Kết quả ghi từ…") cạnh tiêu đề | Ảnh mọi loại bài | thiết kế §3.6 | P1 |
| L2 | Chữ SVG của sơ đồ ẩn dưới `lg`, có danh sách bước HTML thay thế | Ảnh 375 sơ đồ | thiết kế §5 | P2 |
| L3 | Công tắc SQL / Database Engine ở 375: nút đang chọn rõ, hai nút cùng cỡ, mục "Học" sáng ở cả hai route | Ảnh 375 hai route | thiết kế §7.2 | P1 |
| L4 | Editor ghi engine + runtime; lỗi cú pháp shell/JSON gạch chân đúng vị trí | Gõ lỗi | thiết kế §3.2 | P2 |
| L5 | Không có trang hay thẻ "sắp có"; cấp chưa phát hành không có thẻ | `tests/noDeadEnds.test.ts` + ảnh `#/engine` | thiết kế §7.1 | P1 |

---

## 3. Gợi ý tự động hóa

`scripts/ux-audit.mjs` (luồng QA của v22, đưa công cụ v21 trong scratchpad vào repo) nhận URL + danh sách route và chạy matrix §1. Nó ghi `audit.jsonl` + ảnh, rồi in một bảng theo mã mục ở trên. Các mục ghi "tự động" phải được nó đo: A1, A2, A5, B1, B2, C1, C2, D2, E1, E2, E4, F1, H1, I1, I2, I3, K1. Mục còn lại kiểm bằng ảnh.

---

## 4. Mẫu `docs/team/review-vNN.md`

```markdown
# Review vNN (live, <ngày>, commit <sha>)

## UI/UX (ux-deploy-checklist.md)
Matrix đã chạy: … · ux-audit: N lỗi tự động · ảnh: <thư mục>
| Mục | Mức | Trang/cỡ/theme | Thấy gì | Sửa đề xuất | File nghi |
|---|---|---|---|---|---|

## Product nhìn lại
| Thứ phát hành | Giữ / Sửa / Bỏ | Vì sao (giá trị cho người học) | Việc cho vN+1 |
|---|---|---|---|
- Câu "Học xong bạn làm được…" của cấp mới: kiểm bằng giải mù → đạt / không (bài nào).
- Điều cần user (nếu có) → dòng L.

## Đưa vào vN+1 (luồng R)
P1: … · P2: … · P3 để lại (lý do): …
```
