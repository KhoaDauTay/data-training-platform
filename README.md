# BoonData

Học SQL và phân tích dữ liệu bằng việc thật, ngay trong trình duyệt.
*Learn SQL and data analysis through real work, right in your browser.*

- **Logistics:** bạn là Data Analyst mới ở công ty hư cấu Cargo Query Logistics (Đà Nẵng). Đồng nghiệp gửi câu hỏi nghiệp vụ, bạn trả lời bằng SQL, qua 12 chương từ thực tập sinh tới trưởng nhóm. Finance và E-commerce: sắp có.
- **Boon** (chú vịt) dẫn đường: tour, gợi ý, giải thích lỗi. **Lily** (chú chó) học cùng bạn.
- PostgreSQL thật chạy trong trình duyệt (PGlite), không có máy chủ; tiến độ lưu trong trình duyệt của bạn.

Bản chạy: https://khoadautay.github.io/data-training-platform/

## Phát triển

```bash
npm ci
npm run dev      # Vite
npm test         # Vitest
npm run build    # typecheck + build, rồi: node scripts/check-budget.mjs
```

Hướng dẫn cho người đóng góp và agent: `CLAUDE.md`. Triển khai: `docs/ops/deploy.md`.

## Giấy phép

- Code: MIT (`LICENSE`).
- Hình Boon và Lily: CC BY 4.0 (`assets/mascots/LICENSE`).
- Cảnh và hình minh họa được vẽ bằng code trong `src/art/` (MIT như phần code); hình Boon và Lily theo CC BY 4.0 (`assets/mascots/LICENSE`). Không có tài nguyên đồ họa bên thứ ba.
- Font Nunito: SIL Open Font License 1.1 (`src/assets/fonts/OFL.txt`).
