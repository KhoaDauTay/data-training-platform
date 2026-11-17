# Deploy & vận hành — Cargo Query (bản DA)

Host mặc định: **GitHub Pages** qua GitHub Actions (`.github/workflows/ci.yml`). Không backend. Phương án thay thế: Cloudflare Pages (mục 6).

> Mục 1, 3 (trên URL thật), 4 và 6 là thao tác của **user** (L6). Agent trong loop chỉ chạy được các lệnh local ở mục 2.

## 1. Thiết lập lần đầu (user làm trên GitHub, 1 lần) — CHỜ USER

1. Tạo repo GitHub và push nhánh `main`. GitHub Pages miễn phí có thể yêu cầu repo **public** (gói Free) **[chưa kiểm]**. Mặc định base là `/<tên repo>/`. Ví dụ repo `cargo-query` cho ra `https://<user>.github.io/cargo-query/`.
2. Settings → Pages → Build and deployment → Source: **GitHub Actions**.
3. Settings → Environments → `github-pages`. Environment này được tạo tự động ở lần deploy đầu. Giữ rule "Deployment branches: main".
4. Chỉ với user site `<user>.github.io` hoặc custom domain: Settings → Secrets and variables → Actions → Variables → `PAGES_BASE` = `/`.
5. Push lên `main`, hoặc Actions → ci → Run workflow trên `main`.

## 2. Mỗi lần deploy

- Trước khi push, chạy ở máy: `npm run typecheck && npm test && npm run build && node scripts/check-budget.mjs`. Thử dưới đường dẫn con: `MSYS_NO_PATHCONV=1 npx vite build --base=/cargo-query/ && MSYS_NO_PATHCONV=1 npx vite preview --base=/cargo-query/` rồi `bash scripts/check-deploy.sh http://localhost:4173/cargo-query/` (Git Bash trên Windows cần `MSYS_NO_PATHCONV=1`).
- Push lên `main` chạy job `build` (typecheck, test, build có base, budget), rồi `deploy`, rồi bước "Post-deploy check".
- PR chỉ chạy `build`. GitHub Pages không có preview theo PR.
- Release nào nâng `SAVE_VERSION` thì **đi riêng**, không gộp với thay đổi rủi ro khác (amendments A8).
- Ngân sách gzip (`scripts/check-budget.mjs`) có bảng số và lý do ở Plan Deploy Task 2. Nhóm `main` đang ở 270 KB, cao hơn mốc 250 KB của devops §2 (P-D3, cần user chốt).

## 3. Nghiệm thu sau deploy

Chạy từ máy bất kỳ:

```bash
bash scripts/check-deploy.sh https://<user>.github.io/<repo>/
```

- `FAIL` (exit 1) nghĩa là thiếu file hoặc sai base. Phải rollback (mục 4).
- `WARN` thiếu `content-encoding` trên `.data` hoặc `.wasm` (`pglite-*.data`, `pglite-*.wasm`, `initdb-*.wasm`, `libpg-query-*.wasm`): GitHub Pages **không cho đặt header**, nên không sửa được bằng cấu hình. **User phải xem** (L6). Ghi kết quả vào bảng dưới, rồi chọn một trong ba hướng: (a) chấp nhận lần tải đầu ~9,8 MB thay vì ~5,4 MB khi `.data` không nén (devops §1, §1.3; thêm ~1,7 MB nếu `libpg-query-*.wasm` cũng không nén); (b) chuyển sang Cloudflare Pages (mục 6) và nghiệm thu bằng `STRICT=1`; (c) spike: build `pglite.data.gz`, worker giải nén bằng `DecompressionStream` rồi truyền `fsBundle` (amendments F2, ngoài phạm vi plan deploy).
- Mở trang và chờ trạng thái DB "sẵn sàng"; mở tab Thứ tự thực thi và Sơ đồ ER một lần (chunk lazy).

| Ngày | URL | `.wasm` type / enc | `.data` type / enc | cache-control | Kết luận |
|---|---|---|---|---|---|
| (điền sau deploy đầu) | | | | | |

## 4. Rollback — CHỜ USER (cần quyền push)

GitHub Pages **không có nút rollback**, và artifact của `upload-pages-artifact` chỉ giữ **1 ngày** (mặc định `retention-days: 1`).

1. **Cách chuẩn: `git revert`.**
   ```bash
   git revert --no-edit <sha-lỗi>      # hoặc một dải: git revert --no-edit <cũ>..<mới>
   git push origin main
   ```
   Workflow tự build và deploy lại, mất khoảng 3–5 phút. Lịch sử `main` khớp với bản đang chạy.
2. **Cách nhanh khi cần ngay:** Actions → ci → chọn run **thành công gần nhất trước bản lỗi** trên `main` → **Re-run all jobs**. Không dùng "Re-run failed jobs" hay chỉ chạy lại `deploy`, vì artifact có thể đã hết hạn. Re-run sẽ build lại đúng SHA cũ. Sau đó vẫn phải `git revert`, vì lần push kế tiếp sẽ deploy lại HEAD của `main`. Run quá cũ (khoảng hơn 30 ngày) có thể không còn re-run được **[chưa kiểm]**. Khi đó chỉ còn cách 1.
3. **Sau rollback:**
   - GitHub Pages trả `index.html` với cache ngắn (thường `max-age=600`, **[chưa kiểm]**, đọc ở cột cache-control của mục 3). Người chơi nhận bản cũ ở lần tải sau, chậm nhất khoảng 10 phút.
   - Chunk lazy của bản mới mà tab cũ đang tham chiếu có thể bị 404. App bắt `vite:preloadError` và hiện thông báo "Có phiên bản mới, tải lại trang" (amendments F8).
   - **Bẫy save version:** nếu bản bị rollback đã nâng save (ví dụ v2 → v3), bản cũ sẽ từ chối save mới. Save cũ vẫn còn ở key `cargo-query-save.v<cũ>` (amendments A8). Vì vậy release nâng save phải đi riêng.
4. **Khi nào rollback:** `check-deploy.sh` FAIL; trang không lên "DB sẵn sàng"; hoặc người chơi gửi payload chẩn đoán cùng `kind` (`db-init-failed`, `chunk-load-failed`) sau bản mới.

## 5. Chẩn đoán từ người chơi

Nút "Sao chép thông tin chẩn đoán" (cạnh trạng thái DB, chỉ hiện khi có sự cố) copy JSON gồm `build`, `kind`, `sqlstate`, `errorName`, `timings`, `ua`. Đối chiếu `build` với 7 ký tự đầu của SHA trong Actions (`dev` = bản build ở máy). Payload không bao giờ chứa SQL, message lỗi hay dữ liệu, nên **đừng hỏi người chơi gửi thêm SQL hay dữ liệu import**.

## 6. Chuyển sang Cloudflare Pages (tùy chọn, miễn phí) — CHỜ USER

1. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git → chọn repo.
2. Build command: `npm run build`. Output: `dist`. Biến môi trường `NODE_VERSION=24`. Base giữ mặc định `/` (không truyền `--base`), nên `public/_headers` (`/assets/*` immutable, `index.html` no-cache) có hiệu lực.
3. Nghiệm thu: `STRICT=1 bash scripts/check-deploy.sh https://<project>.pages.dev/`. Nếu `.wasm`/`.data` thiếu nén thì xử lý theo devops §1.3 (Compression Rule nếu có custom domain, nếu không thì hướng (c) ở mục 3).
4. Tắt deploy GitHub Pages: xóa job `deploy` trong `ci.yml`, giữ job `build` làm CI.
5. Rollback trên Cloudflare: Deployments → bản trước → Rollback.

## 7. Ngoài phạm vi

- Không có backend. Nhánh DE sau này dùng backend **Python chạy trên Kubernetes** và chưa mở plan. Bản phác backend + k6 ở `docs/team/devops.md` §4.2 chỉ để tham khảo.
- Không dùng Railway, Vercel, Supabase. Không có telemetry tự động.
