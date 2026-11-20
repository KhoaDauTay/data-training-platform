# ux-audit v22: lần chạy đầu (local + live)

Người viết: QA · 2026-11-20 · L253. Công cụ: `scripts/ux-audit.mjs` (`npm run ux-audit`, `UX_URL=<url>` cho site live). Checklist: `ux-deploy-checklist.md`.

## Công cụ đo gì

- **Matrix (§1):** 23 trang ở 1280×800 sáng, 1024×700 sáng, 375×740 tối và 320×640 sáng (VI): Home, Lộ trình, Phần 1, kỹ năng `select`, phỏng vấn, Luyện SQL, Tiến bộ; 5 trang × 3 domain; `#/engine`, `#/engine/postgres`, lộ trình Mongo, một bài DynamoDB.
- **Top bar:** ở 1024/1280/1366/1440, VI + EN, trên `#/d/finance`, `#/d/logistics/play` và `#/learn`.
- **Trạng thái:** `tests/fixtures/save-v5.json` (người chơi quay lại, có badge Hộp thư/Ôn tập), tour xong, hướng dẫn tắt. Storage xóa giữa các cấu hình, service worker bị bỏ qua.
- **Kiểm tự động:**
  - F1 tương phản (canvas, ghép alpha);
  - E1 chữ bị cắt không có `title`/`aria-label`;
  - I3 vùng chạm < 24 px;
  - I2/E4 tràn ngang;
  - B1 chồng lấn (tâm control bị phần tử khác che; thanh fixed/sticky không tính, vì người chơi cuộn được);
  - A1 menu lĩnh vực và ⋯ neo dưới nút;
  - E2 top bar một hàng, không gì bị cắt hay ra ngoài mép phải, `<html lang>` đúng;
  - I1 `#bottom-nav` < 72 px;
  - H1 `h1` > `h2`.
- **Mức:** serious = mục P1 của checklist. Có finding serious thì exit 1.
- **Đã tự thử bộ dò:** trên một trang mẫu, cả 5 lớp lỗi trong trang đều bị bắt (tương phản 2,3:1, ellipsis, nút 16 px, nút bị che, hộp 1000 px).

## Kết quả

| Bản | Lượt | Bỏ qua | Serious (riêng biệt) | Moderate (riêng biệt) |
|---|---|---|---|---|
| Local `v22-engine` @ `eccb924` (build + preview 5235) | 128 | 0 | **25**: top bar 9, tràn ngang 15, popover 1 | vùng chạm 127, rộng hơn màn 6, tiêu đề 3 |
| Live `khoadautay.github.io/data-training-platform/` (v21) | 112 | 16 (`#/engine…`: bản live chưa có route) | **0** | vùng chạm 8 |

Không bản nào có lỗi tương phản, chữ bị cắt, `#bottom-nav` ≥ 72 px, hay lỗi trang (`Runtime.exceptionThrown`).

## Phát hiện thật (local, sẽ lên v22)

| Mục | Mức | Trang/cỡ | Thấy gì | Sửa đề xuất | File nghi |
|---|---|---|---|---|---|
| E2, I2, A1 | P1 | Mọi trang domain, 1024–1440, VI + EN, người chơi có badge | Top bar tràn 39–71 px bên phải. Khi nav có thêm "Database Engine", `#db-status` và ⋯ bị đẩy ra ngoài mép (ảnh `light-1280-d_logistics.png`: ⋯ ở x = 1299–1335), nên trang cuộn ngang. Menu ⋯ mở cách nút 71 px. Ở 1440 thì công tắc VI/EN ra ngoài. Ở EN, `#/learn` cũng tràn ở 1024/1280/1440. Smoke không bắt được vì người chơi mới chưa có badge Hộp thư/Ôn tập. | Gập thêm một mục dưới 1600 px (nhãn nav thành icon, hoặc nhãn Hộp thư/Ôn tập/Sổ tay chỉ còn icon + badge, như L189). Thêm "nằm trong viewport" vào `CHROME` của smoke sau khi sửa. | `index.html` (header), `src/ui/topbar.ts`, `src/style.css` |
| H1 | P2 | `#/engine/postgres`, `#/engine/mongodb/path`, bài DynamoDB, mọi cỡ | `h1` 22 px = `h2` 22 px | `h1` của trang Engine dùng `text-display`, hoặc `h2` xuống `text-title` | `src/ui/engineView.ts` |
| I3 | P2 | `#/engine/postgres` (117 link), mọi cỡ | Link bài trong danh sách cao 23 px; ở điện thoại dòng danh sách cần 44 px | `py-2` / `min-h-11` trên link dòng | `src/ui/engineView.ts` |
| I3 | P3 | `#/me` (6), breadcrumb `#/learn/sql/1` (2) | Link kỹ năng 20 px, link breadcrumb 19 px (live cũng có) | `py-0.5` | `src/ui/meView.ts`, `src/ui/homeView.ts` (`learnSub`) |

## Ghi chú

- Ảnh mỗi lượt nằm ở `smoke-out/ux-audit/<theme>-<w>-<route>.png` (không commit).
- `smoke.mjs` đã có 2/3 kiểm rẻ của v21 §3 (`#status` bị cắt ở 1024/1280 VI + EN; `#bottom-nav` < 72 px dưới 1024, gồm 320). Kiểm thứ ba được thêm ở bước "375: the promotion dock leaves 'Bắt đầu chương 2' free": làm xong đánh giá chương 1 ở 375, rồi kiểm `#stage` không giao nút, và tâm nút không bị che, ngay lúc đó và sau 3,5 s.
- Chưa tự động (vẫn nhìn ảnh): A2, A5, B2 ở 1024, C1, C2, D2, H7. Sẽ làm ở QA-ALL.
