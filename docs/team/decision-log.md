# Nhật ký quyết định (để user review sau)

Quyết định trong lúc `/loop` tự chạy được chốt cùng advisor và ghi ở đây. Mỗi dòng: ngày · phạm vi · quyết định · lý do · cách đảo ngược.

Quyết định do user chốt trực tiếp (D1–D6) nằm ở cuối `docs/team/amendments.md`.

| # | Ngày | Phạm vi | Quyết định | Lý do | Đảo ngược |
|---|---|---|---|---|---|
| L1 | 2026-11-16 | Smoke trình duyệt | Cổng chặn Plan 1 Task 2 coi như **đạt**: Edge chạy đủ `count [[20000]] → timeout → ready → [[42]] → DONE` với `client.ts` sau commit 68b5520. | Kiểm bằng Claude in Chrome trên Edge, console không lỗi. | Chạy lại `npm run dev`, mở trang smoke. |
| L3 | 2026-11-16 | Cách làm việc | Mục tiêu loop: **ứng dụng hoàn chỉnh, chạy thử được, đủ UI**. Câu hỏi về sản phẩm/giao diện phát sinh trong lúc làm → hỏi agent Product / UI/UX (đọc `docs/team/product-design.md`, `ui-ux.md`) thay vì dừng hỏi user; câu trả lời ghi vào log này. | User yêu cầu. | User có thể đảo bất kỳ dòng nào khi review. |
| L2 | 2026-11-16 | Thứ tự triển khai | Plan 1 (T4–11) → Plan 1b → Plan 1c → Plan Import; Plan Deploy chạy song song sau Plan 1 T2. | Theo consistency review vòng 2. | — |
