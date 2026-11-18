# BoonData — UI/UX v6: hình, icon và chuyển động "xịn" (nâng cấp trên v5)

**Trạng thái: HƯỚNG ĐÃ DUYỆT** (user, 2026-11-18: "Duyệt"). Bốn quyết định lớn ở §0.2 đã chốt. Các quyết định nhỏ ở §9 lấy mặc định in đậm nếu không ai đổi.

Người viết: UI/UX · 2026-11-18.

User: *"Trần main đã nâng lên 500 KB gz, nên animation và SVG nên dùng hiệu ứng / thư viện hiện đại cho đúng, thay vì tự dựng mọi thứ, rất khó"*, rồi *"animation, icon, SVG xịn; tự chế ra như hiện tại quá xấu"*. User cũng hỏi có nên thêm engine 2D/3D cho nhân vật sống động hơn không (§8).

v6 **xây trên v5** (`docs/team/ui-ux-v5.md`, đang build), không bỏ v5. Các luật sau của v5 giữ nguyên: kiểu gốc là trạng thái cuối, chỉ gắn animation lúc có sự kiện, `react()`/`data-pose`, transform chỉ trên SVG lá, giảm chuyển động.

Ràng buộc giữ nguyên:
- **Tài sản (asset):** chỉ dùng loại tự vẽ, CC0/public domain, hoặc có giấy phép cho phép **dùng, sửa và phát hành lại trong repo công khai** mà không trả tiền. Mỗi tài sản lấy từ ngoài ghi nguồn + giấy phép vào `assets/THIRD_PARTY.md` (mới). Không nhân vật có bản quyền, không emoji, không tài sản trả phí, không tài sản cấm phát hành lại.
- **Lily** (chó đốm trắng, tai và đốm đen) và **Boon** (vịt trắng, chỏm lông xám) là nhân vật **của BoonData**. Chỉ vẽ lại cho đẹp, không thay bằng nhân vật kho. Boon dạy, Lily chỉ phản ứng (L87).
- **Chuyển động:** một chuyển động **≤ 3 s**, bỏ qua được (nút + Esc) hoặc là nền. **Không bao giờ chặn nhập liệu, không che editor hay bảng kết quả.** `prefers-reduced-motion` thì hiện khung tĩnh. GSAP không tự tôn trọng giảm chuyển động, nên mọi timeline đi qua `run.fast = reducedMotion()` (§2.3).
- Chữ có tương phản ≥ 4,5:1 ở cả hai theme. Trang chạy được ở 320/375 px. Class Tailwind là chuỗi literal.
- **Lần vẽ đầu phải nhẹ.** Trần main 500 KB là chỗ trống, không phải lý do để kéo thư viện animation vào đường khởi động. GSAP và mọi hình lớn nằm trong chunk lười có nhóm ngân sách riêng.

**Sửa quyết định cũ:**
- v5 §7 "Không làm: thư viện animation, Lottie, canvas" và v4 "không thêm thư viện": v6 thêm **GSAP** (chunk lười) và **một bộ icon**. Lottie, canvas, WebGL vẫn không (§8).
- v5 D-M1 (giữ trần 290): trần main giờ là 500 (user, 2026-11-18, đã sửa trong `scripts/check-budget.mjs`).
- L42 "icons.ts giữ mọi path SVG tự vẽ": path giờ **sinh từ bộ icon** (I1). API `icon()`/`skillIcon()`/`NAV_ICON` và các test giữ nguyên.
- `html` ≤ 9 KB (v5 §2): nâng lên 12 KB cho sprite linh vật vẽ lại (D-V6).

---

## 0. Kiểm tra hình hiện tại và các quyết định

### 0.1 Ảnh chụp "trước"

Cách chụp: bản build hiện tại, `vite preview --port 5207` (cổng 5199 đang bận), Edge headless hồ sơ mới, điều khiển qua CDP. Có hai trạng thái: người mới, và save `tests/fixtures/save-v4.json` (7 việc Logistics, 2 việc E-com). Theme theo hệ thống, tức tối. Thư mục `C:\Users\KHOA~1.HUY\AppData\Local\Temp\claude\be8c95d1f89f2452\e927c5e6-22a4-40fa-bff6-3a9e8af9fcbc\scratchpad\uiux-v6\shots\before\`:
`01-fresh-welcome-1280.png`, `02-fresh-welcome-375.png`, `10-{home,learn,learn-module,practice,overview,map,play,data,dashboard,ecom-overview,finance-soon}-1280.png`, `20-{home,overview,play,learn}-375.png`, `30-{home,overview,play}-dark-1280.png` (trùng theme tối mặc định), `40-{home,learn,overview,ecom-overview,dashboard,finance-soon}-light-1280.png` (theme sáng). Script: `…\scratchpad\uiux-v6\shoot.mjs`, `shoot-light.mjs`.

**Phạm vi đã xem:** đã mở và nhận xét welcome, home, learn, overview, map, play, ecom-overview, dashboard, finance-soon (sáng + tối) và overview-375. **Chưa xem:** `learn-module`, `practice`, `data`, `home/play/learn-375` (đã chụp nhưng chưa đánh giá). **Dock hoàn thành chưa chụp được**, vì cần đạt một việc thật; nhận xét về dock ở bảng dưới dựa trên đọc mã `src/art/logistics.ts`. T1 phải chụp dock trước khi đổi.

Ảnh "sau" (nguyên mẫu): `…\scratchpad\uiux-v6\shots\proto\mascots-icons-static.png`. Ảnh gồm sprite hiện tại, bản phác Lily/Boon vẽ lại (gradient, mắt có điểm sáng, má hồng, bóng đổ, đốm cắt theo dáng), một hàng 32/48/64 px so cũ và mới, và ba hàng icon: tự vẽ, Phosphor duotone, Lucide. **Nói thẳng:** ở 150 px, bản phác chỉ hơn bản cũ một chút. Ở 32 px, Lily mới đọc rõ hơn chút (đầu to, mắt to), còn Boon gần như ngang bản cũ. Đây mới là bản phác một lượt; M1 cần vài vòng vẽ, mỗi vòng có cổng duyệt bằng mắt. Trang nguyên mẫu `proto.html` có rig GSAP (vẫy đuôi, nhảy nảy, chớp mắt, Boon vẫy cánh) khi mở bằng `?anim`.

| Chỗ | Nhận xét (vì sao trông "tự chế") | Mục v6 |
|---|---|---|
| Cảnh Tiên Sa (`10-overview-1280`) | Hình khối phẳng, không có chiều sâu: núi là hai đa giác cùng sắc độ, biển là vạch sóng lặp, cẩu là các thanh cam đặc. Không ánh sáng, không bóng, không khí quyển. Chữ SVG chồng lên hình. | P2 · S1 |
| Bản đồ tuyến (`10-map-1280`) | Lục địa là các khối bo tròn không giống địa lý thật. Bản đồ nhỏ (~440×115 px) giữa trang trống. Chữ cảng 7–8 px khó đọc. | P2 · S2 |
| Cảnh E-com (`10-ecom-overview-1280`) | Thô nhất: hộp chữ nhật, cửa nâu, xe máy là hai chấm và một ô cam. Khung cảnh nhỏ nằm giữa vùng tối lớn. | P2 · S3 |
| Glyph lộ trình (`10-learn-1280`) | Ô chữ nhật mờ có vài nét, không đọc được là gì. Thẻ nâng cao dùng ký tự `▣` làm icon. | P2 · S4 |
| Icon | Gọn, nét đều, nhưng đơn điệu: không có lớp tô, và nhiều icon kỹ năng tự chế khó phân biệt ở 16 px. | **P1 · I1** |
| Linh vật | Ở 120–150 px thì ổn. Ở 32–40 px (logo top bar, dòng phản hồi, Lily ngủ ở trang chủ) thì nét 1,6–1,8 px nhòe, mắt chỉ là chấm, đốm vụn. Không có gradient hay bóng đổ. Tư thế cứng vì mỗi tư thế là một hình riêng, không có rig. | **P1 · M1** |
| Dock hoàn thành (**chưa chụp**, nhận xét từ mã) | Dùng bộ máy tween tự viết (`tween()` trên rAF, bốn hàm easing). Chuyển động đều, không nảy hay quán tính, và hoa giấy tính tay. | **P1 · A2** |
| Chân dung đồng nghiệp (`ui/avatar.ts`) | Mặt tròn phẳng, mọi người gần giống nhau. | P3 · S5 |
| "Finance Sắp có" (`40-finance-soon-light-1280`) | Tranh khối phẳng (tòa nhà, cột, chồng xu), đường nét đứt cắt ngang tòa nhà; icon `%` trơn. | Plan Finance · S6 |
| Top bar trên trang domain ở 1280 (`10-overview-1280`, `10-map-1280`) | **Lỗi bố cục:** nút VI/EN, theme và ⋯ rơi xuống hàng thứ hai. Đây là lỗi, không phải vấn đề hình vẽ; nó làm cả trang trông chưa xong. | **P1 · F1** |

Nhận xét chung: phần chữ, khung thẻ, màu và nhịp chữ đã ổn (v4/v5). Cái làm app "trông tự chế" là **tranh cảnh, glyph và linh vật ở cỡ nhỏ**. Vì vậy v6 dồn công vào hình, không đổi bố cục.

### 0.2 Đã chốt (user "Duyệt")

| # | Quyết định |
|---|---|
| D1 | **Bộ icon chuyên nghiệp + bộ minh họa miễn phí chất lượng cao.** Giấy phép đã kiểm, ghi nguồn trong `assets/THIRD_PARTY.md`. **Giới hạn:** bộ có sẵn chỉ phủ icon, bờ biển bản đồ, phần lẻ của cảnh và có thể chân dung. Cảnh cảng, chợ, hũ Finance và hai linh vật vẫn phải vẽ riêng (agent vẽ, có cổng duyệt bằng mắt). |
| D2 | **GSAP** cho chuyển động cảnh và UI, trong chunk lười. **PixiJS chỉ khi thật sự cần** cho hạt hoặc cảnh: v6 đánh giá là **chưa cần** (§8.2). |
| D3 | **Lily và Boon:** agent vẽ lại thành SVG có rig đúng dáng, animate bằng GSAP. **Rive** chỉ là lối đi sau này, và chỉ khi user cung cấp file `.riv` (§8.1 mô tả cần làm gì). Không có task nào phụ thuộc Rive. |
| D4 | **Không Three.js, không 3D.** |

Mọi task trong §6 đều **agent làm được mà không cần user cung cấp hình**.

---

## 1. Kiểm giấy phép và kích thước (đo ngày 2026-11-18)

Kích thước: cài vào thư mục nháp, bundle entry tối thiểu bằng `rolldown --minify` của repo, gzip -9 (như `check-budget.mjs`).

| Thứ | Bản ghim | Giấy phép (đã đọc) | gz | Dùng? |
|---|---|---|---|---|
| **GSAP** core | **3.15.1** (2026-11-04) | "Standard 'no charge' license" (gsap.com/standard-license): miễn phí, kể cả thương mại, cho "any website, web application". **Cấm** dùng trong công cụ dựng animation không cần code cạnh tranh với Webflow, và cấm gỡ thông báo bản quyền. Gồm mọi plugin. **Không phải giấy phép OSI**: được dùng làm dependency trong repo MIT, nhưng mã GSAP không thành MIT. BoonData là app học SQL, không thuộc loại bị cấm. | 27,4 KB | **Có** |
| GSAP + MorphSVG + DrawSVG + MotionPath + Physics2D + CustomEase | 3.15.1 | như trên | **45,0 KB** | **Có, chunk `gsap`** |
| + SplitText | | | 48,1 KB | Không (không có chỗ dùng) |
| **Phosphor Icons** (`@phosphor-icons/core`) | **2.1.1** | MIT | 80 icon duotone ≈ 9,2 KB (bản thô, trước khi lọc) | **Có (mặc định D-V1)** |
| Lucide (`lucide-static`) | 1.75.0 | ISC | 80 icon ≈ 3,3 KB | Phương án khác |
| Tabler Icons | 3.52.0 | MIT | không đo | Không (nét giống Lucide) |
| **Open Peeps** (Pablo Stanley) | | **CC0** ("copy, modify, distribute… even for commercial purposes") | chọn từng phần | P3, chân dung (D-V5) |
| **Natural Earth** (đường bờ biển 1:110m) | | **Public domain** (naturalearthdata.com/about/terms-of-use: "in the public domain… Crediting the authors is unnecessary") | đường đã giản lược ≈ 3–5 KB | **Có**, bản đồ tuyến (S2) |
| **Kenney** (kenney.nl) | | **CC0** (trang hỗ trợ: "all game assets on the asset pages are public domain licensed (CC0)… even in commercial projects") | chọn từng phần | Ứng viên cho phần cảnh (tàu, xe, thùng hàng) ở S1/S3; **chưa duyệt từng gói**: T0 kiểm gói có SVG vector, đúng chủ đề và hợp phong cách |
| **Open Doodles** (Pablo Stanley) | | CC0 theo bài ra mắt của tác giả; một trang tổng hợp bên thứ ba ghi thêm hạn chế "không phát lại thành gói", mâu thuẫn, nên **T0 đọc chữ giấy phép trên opendoodles.com** | chọn từng hình | Ứng viên cho trạng thái rỗng (P3), chỉ khi T0 xác nhận CC0 |
| unDraw | | Miễn phí, kể cả thương mại, nhưng **cấm "distribute the assets in packs"** và cấm dùng để huấn luyện AI | | **Không**: repo công khai có cả thư mục hình gần như là một "pack", và agent sửa hình là vùng xám |
| Lottie (`lottie-web` light) | 5.13.0 | MIT (trình phát). File trên LottieFiles theo "Lottie Simple License": miễn phí, thương mại, sửa, phát lại, không bắt ghi công | 46,2 KB | Không (§8.4) |
| Rive (`@rive-app/canvas-lite`) | 2.51.0 | MIT (runtime); file cộng đồng CC BY 4.0 | JS 58 KB + wasm ≈ 363 KB | Không bây giờ (§8.1) |
| PixiJS | 8.22.0 nếu dùng (8.23.0 mới 7 ngày) | MIT | ≈ 115–156 KB (đo trên 8.23.0: renderer + chunk tách) | Không bây giờ (§8.2) |
| Three.js + GLTFLoader | 0.187.0 | MIT | 153,6 KB | Không (D4) |
| anime.js / Motion | 4.5.0 / 14.9.0 | MIT / MIT | 17,6 / 26,3 KB | Không: user chọn GSAP vì có MorphSVG, DrawSVG, Physics2D |

Ghi chú GSAP: bản 3.15.1 ra ngày 2026-11-04, tức vừa đủ 2 tuần. Nếu gặp lỗi thì lùi về 3.15.0 (2026-04-13).

---

## 2. Nền: GSAP lười (làm trước, T1)

### 2.1 Chunk

| | |
|---|---|
| Module bọc | **`src/art/gsap.ts`**: file **duy nhất** `import` từ `gsap`. Nó đăng ký `MorphSVGPlugin, DrawSVGPlugin, MotionPathPlugin, Physics2DPlugin, CustomEase` một lần, rồi xuất `gsap`, `play(tl, run)`, `still(tl)`. |
| Ai gọi | Các chunk art (`src/art/logistics.ts`, `mapMotion.ts`, `ecommerce.ts`, `illustrations.ts`, sau này `finance.ts`) và rig linh vật (M1) gọi **`import('./gsap')` động**. Không file nào import tĩnh, kể cả trong chunk art: import tĩnh sẽ gộp 45 KB vào `logistics-*` (trần `art` 20). |
| Tên + ngân sách | Rolldown đặt tên chunk theo module: `gsap-[hash].js`. Bản dựng thử của v6 cho thấy hai chunk lười cùng `import()` một module thì ra **một** chunk dùng chung. Thêm nhóm `['gsap', /^gsap-/, 50]` vào `scripts/check-budget.mjs`, đặt trước `rest`. |
| Tải trước | `prefetchArt()` (`src/art/load.ts`, idle sau lần vẽ đầu) tải chunk art, rồi `import('./gsap')` ở lần idle tiếp theo. Lần hoàn thành đầu tiên không phải chờ mạng. |
| Chưa tải xong hoặc lỗi | Vẽ **trạng thái cuối** (dock vẫn có câu báo và nút Đóng). Linh vật rơi về phản ứng CSS của v5 (`react()`). Lỗi tải thì bỏ promise để lần sau thử lại (cùng mẫu `loadArt`). |
| main | 0 KB GSAP. Có test nguồn: chỉ `src/art/gsap.ts` import `gsap`. Cổng build: `dist/assets/index-*.js` không chứa chuỗi `GreenSock`. |

### 2.2 Giữ thông báo bản quyền

GSAP cấm gỡ thông báo bản quyền. Vite/Rolldown giữ comment `@license` theo mặc định, và cổng T1 kiểm `gsap-*.js` còn dòng bản quyền. `CLAUDE.md` "Licences" thêm dòng: GSAP (Standard 'no charge' license, không phải MIT), Phosphor (MIT), Natural Earth (PD), cùng các tài sản CC0 có trong `assets/THIRD_PARTY.md`.

### 2.3 Hợp đồng chạy (thay `tween()`/`wait()` tự viết)

```ts
// src/art/gsap.ts — phác thảo
export function play(tl: gsap.core.Timeline, run: Run): Promise<void> {
  if (run.fast) { tl.progress(1).kill(); return Promise.resolve(); } // giảm chuyển động, hoặc đã Bỏ qua: nhảy tới trạng thái cuối
  run.skip = () => tl.progress(1).kill();                           // stage.ts: Bỏ qua / Esc / hashchange
  return tl.play().then(() => {});
}
```

- Mọi timeline tạo bằng `gsap.timeline({ paused: true })`. Chỉ `play()` mới chạy, nên `build()` (chạy lại ở mỗi lần vẽ) không bao giờ phát lại animation.
- **Thời lượng lấy từ `STEPS`/`durationOf` (`src/scene.ts`)**. Đây là nguồn đã có test ≤ 3 s (`tests/scene.test.ts`). Vitest không có DOM, nên kiểm thời lượng là kiểm trên `STEPS`, không chạy GSAP.
- **Không để hai transform chồng nhau:** các hàm `setShip/setCrane/setTruck…` đang ghi **thuộc tính** `transform`. GSAP tween một **đối tượng trạng thái** rồi gọi các setter đó trong `onUpdate`. GSAP chỉ chạm thẳng phần tử khi phần tử đó là `<g>` mới, không có thuộc tính `transform` (tàu theo MotionPath, phần rig linh vật).
- Nền lặp (tàu trên bản đồ, lồng đèn) dừng khi khuất (cơ chế `src/art/ambient.ts`) bằng `tl.pause()`, và `kill()` khi rời trang.

---

## P1

### I1. Bộ icon: Phosphor duotone (thay path tự vẽ)

| | |
|---|---|
| Vì sao Phosphor | Có 6 độ đậm, trong đó **duotone** (nét + lớp tô 20 % cùng màu) cho chiều sâu mà không thêm màu. Icon vẽ trên lưới 256 cho đường cong mượt. Hơn 1 500 icon, MIT. Lucide (ISC) gọn hơn nhưng cùng kiểu "nét trơn" như hôm nay, nên đổi sang Lucide người chơi gần như không thấy khác (xem ảnh nguyên mẫu). |
| Cách đưa vào | `npm i --save-exact -D @phosphor-icons/core@2.1.1`, là devDependency, chỉ dùng lúc sinh mã. Script `scripts/icons.mjs` đọc bảng ánh xạ `scripts/icon-map.json` (`tên-trong-app → tên Phosphor`, kiểu `duotone`) và ghi `src/ui/iconData.ts` (các chuỗi `d`, có `opacity` cho lớp tô). File sinh ra được commit, nên build không cần chạy script. |
| API giữ nguyên | `icon(name)`, `skillIcon(id)`, `SKILL_ICON`, `NAV_ICON`, `data-icon` trong `index.html`. `icon()` đổi `viewBox` sang `0 0 256 256` và `fill="currentColor"`. Vẫn `aria-hidden`, vẫn không có chữ. |
| Icon kỹ năng không có trong Phosphor | Họ JOIN (L43: inner/left/right/full/multi phải phân biệt được ở 16 px), DISTINCT, GROUP BY/HAVING (xô). Agent **vẽ lại theo đúng ngữ pháp Phosphor duotone**: lưới 256, nét 16, đầu tròn, lớp tô opacity .2. Các path này nằm trong `scripts/icon-custom.json` và ghi chú "BoonData, MIT". |
| Test | `tests/icons.test.ts` vẫn chạy: mọi id trong `skills.yml` có icon, `NAV_ICON` không trùng. Thêm hai test: mọi tên trong `icon-map.json` tồn tại trong gói, và `iconData.ts` khớp với kết quả chạy lại script (không ai sửa tay file sinh). |
| Ngân sách | main + ~6–9 KB (≈ 76 icon duotone, path dài hơn). Trần 500 dư nhiều. |
| Kiểm | Trình duyệt 375/1280, hai theme: sidebar, thanh nav dưới, chip kỹ năng 16 px (họ JOIN phân biệt được), top bar. Chụp lại `10-learn`, `10-play`, `20-home-375`. |

### M1. Lily và Boon vẽ lại, có rig

**Mục tiêu:** giữ đúng nhân vật (bảng màu `--lily-*`/`--boon-*`, khăn teal, huy hiệu sao, kính tròn, dây đeo thẻ), nhưng vẽ lại theo chuẩn mascot chuyên nghiệp. Nguyên mẫu `proto.html` là hướng đi, chưa phải hình cuối.

| Phần | Quy cách vẽ (agent làm theo) |
|---|---|
| Tỷ lệ | Chibi: đầu ≈ 55 % chiều cao. viewBox 120×120 giữ nguyên, để mọi chỗ gọi `mascot()` không đổi kích thước. |
| Nét | Viền ngoài 2,4 (đọc tốt ở 32 px), nét trong 1,4, cùng màu `--*-line`. Đầu nét tròn. Nét dày hơn ở phía dưới (viền ngoài đậm hơn ở đáy bằng một path bóng, không dùng `stroke-width` khác nhau). |
| Khối | Mỗi khối lớn có `radialGradient` sáng ở trên-trái (fur → cream). Bóng đổ elip mờ dưới chân (`opacity .12`). Gradient dùng `stop-color: var(--lily-fur)`… để theme tối vẫn đổi được. |
| Mắt | Elip đen 4,6×5,6, hai điểm sáng (lớn trên-phải, nhỏ dưới-trái). Ở cỡ < 40 px vẫn đọc ra mắt. Má hồng opacity .5. |
| Lily | Tai đen hình giọt, gradient đậm. Đốm là blob không tròn đều, **cắt theo dáng** (`clipPath`) nên không lòi ra ngoài viền. Mõm cream. Khăn teal có nút. Huy hiệu sao trên khăn (giai đoạn 2+). Laptop (giai đoạn 3) vẽ lại. |
| Boon | Thân hình trứng, bụng sáng hơn. Chỏm lông xám 3 lọn. Mỏ hai mảnh có gradient cam. Kính tròn có cầu kính. Thẻ đeo có hai vạch. Chân cam viền đậm. |
| Rig | Mỗi linh vật là một bộ **phần** (`<symbol>` trong sprite): `*-tail`, `*-body`, `*-head`, `*-ear-l/r` (Lily), `*-wing-l/r` + `*-plume` (Boon), `*-eyes-{open,happy,closed,dizzy}`, `*-mouth-{smile,open,flat,wavy}`, `*-arm-{down,up,point}`. Một tư thế là một **công thức** gồm các phần (bảng trong `src/ui/mascots.ts`). `mascot(who, pose)` dựng `<svg>` inline với mỗi phần là `<g data-part><use href="#…"/></g>`. GSAP animate được các `<g>` này, vì thứ nó chạm là phần tử thật trong trang, không phải shadow tree của `<use>`. |
| Giữ | 6 tư thế cho mỗi linh vật (`tests/mascots.test.ts`). `data-mascot`/`data-pose`, `react()`, các biến CSS giai đoạn của Lily (`--lily-size`, `--lily-scarf-on`…). Cảnh dạy học (`teachScene.ts`) dùng lại các phần (`#boon-arm-point`, `#lily-head`…, giữ id hoặc ánh xạ lại). Logo top bar vẫn không có `data-mascot`. |
| Chuyển động (GSAP, ở sự kiện) | `cheer`: thân nhún xuống 4 % rồi bật lên 10 px (`power2.out`), rơi xuống `bounce.out`, đuôi vẫy 3 lần ±14°, 700 ms. `think` (Boon): đầu nghiêng 6°, cánh đưa lên cằm, 400 ms. `oops`: lắc ±4 px ×3, 360 ms. `point` (tour): cánh chỉ 2 nhịp `back.out(2)`. Chớp mắt (đổi phần `eyes-closed` 80 ms) **chỉ** trong màn chào và cảnh dạy học (giữ v5 D-M3). Lily lớn lên (v5 A1): scale nảy + khăn **DrawSVG** viền rồi tô (giai đoạn 1), sao **MorphSVG** từ chấm thành sao (giai đoạn 2), laptop trượt vào (giai đoạn 3); 900 ms như `cq-grow`. **Phụ kiện phải là path inline trong chính instance đang animate.** Khi dựng Lily, rig clone path khăn/sao/laptop từ sprite vào `<g data-part>`. Lý do: DrawSVG/MorphSVG không với vào được bên trong `<use>`, còn sửa symbol dùng chung thì mọi Lily trên trang đổi theo. Instance nào không animate thì vẫn dùng `<use>` + biến CSS giai đoạn như v5. |
| Chưa tải GSAP | Dùng keyframe CSS của v5 (`react()`), đã đúng luật. GSAP chỉ thay cái này khi chunk đã vào (`loadedGsap()`). |
| Giảm chuyển động | Khung tĩnh của tư thế. |
| A11y | Như hôm nay: trang trí thì `aria-hidden`. Cảnh dạy học vẫn là nút có nhãn. |
| Ngân sách | Sprite vẽ lại ước +1,5–2,5 KB gz trong `index.html`: nguyên mẫu 2 hình = 1,5 KB gz, sprite cũ 2,9 KB gz, các phần dùng chung giữ tổng nhỏ. Nhóm `html` 9 → **12 KB** (D-V6). main +0,3 KB (bảng công thức tư thế). |
| File | `index.html` (`#mascot-sprite`), `src/ui/mascots.ts`, `src/ui/celebrate.ts` (`react()` gọi GSAP khi có), `src/ui/teachScene.ts`, `src/style.css` (token gradient, theme tối), `tests/mascots.test.ts`, `assets/mascots/` (bản vẽ gốc, CC BY 4.0 như cũ). |
| Kiểm | Bảng ảnh 6 tư thế × 2 linh vật × 4 cỡ (32/48/96/150 px) × 2 theme, chụp trước và sau (trang kiểm trong scratchpad, như `proto.html`). Cổng duyệt bằng mắt: ở 32 px phải đọc ra mắt, tai, mỏ. |

### A2. Dock hoàn thành Logistics trên GSAP

| | |
|---|---|
| Việc | Mỗi cảnh trong `PLAY` (`src/art/logistics.ts`) thành một timeline. Xóa `tween`, `wait`, `ease*`, `lerp`. Tổng thời lượng **không đổi** (`STEPS`). |
| Nâng chất | Cẩu: `CustomEase` có quán tính (tăng tốc, trôi, hãm), container lắc nhẹ ±3° khi treo rồi đứng yên khi chạm (`elastic.out(1,.5)`). Tàu: **MotionPath** theo tuyến trên bản đồ, `autoRotate`. Tuyến mới: **DrawSVG** `0% → 100%`. Hải quan: con dấu đập xuống (scale 1,5 → 1, `back.out`), mực loang (`DrawSVG` vòng tròn). Thanh chắn: `elastic`. Sổ cái: đồng xu rơi vào ô tính sẵn bằng tween thường `bounce.out`. **Physics2D không có sàn hay va chạm**, chỉ có vận tốc, góc, trọng lực và ma sát, nên chỉ dùng nó cho hoa giấy bay rồi mờ đi. Chat: ba chấm "đang gõ" nảy lệch pha (`stagger`). |
| Thăng tiến (3,0 s) | 0–0,4 s: container cuối rơi. 0,4–1,3 s: tuyến mới vẽ ra (DrawSVG), cảng đích sáng. 1,3–2,6 s: tàu theo tuyến (MotionPath). 0,4–0,8 s: thẻ chức danh vào. 0,6–2,4 s: **hoa giấy Physics2D**, 28 mảnh `<path>` **trong SVG của dock** (không canvas, không phủ trang), hạt giống cố định theo id việc. 2,4–3,0 s: Lily (rig M1) cheer. |
| Không che | Dock là `#stage` cố định như hôm nay, có `overflow: hidden`. Ở 375 px story đã chuyển sang pane Recap. |
| Giảm chuyển động | Trạng thái cuối, không hoa giấy, dock ở lại tới khi bấm Đóng. |
| File | `src/art/gsap.ts` (mới), `src/art/logistics.ts`, `src/ui/stage.ts` (`run.skip`), `scripts/check-budget.mjs`. |
| Ngân sách | `art` giảm khoảng 0,5 KB; `gsap` 45 / 50 (mới). |

### F1. Top bar xuống hàng ở 1280 trên trang domain (lỗi đi kèm)

Trên `#/d/logistics*` ở 1280 px, cụm VI/EN, theme và ⋯ rơi xuống hàng hai (`10-overview-1280`, `10-map-1280`, `10-play-1280`), vì chip "Ch. 2/12 · Junior DA" cộng XP và Ôn tập làm tràn hàng. Sửa: từ `lg` tới `xl` gộp VI/EN và theme vào ⋯ (hoặc ẩn chữ "Hộp thư"/"Ôn tập", chỉ giữ icon + số). Đây là CSS/markup trong `src/ui/topbar.ts` + `index.html`, main ≈ 0. Kiểm ở 1024, 1280 và 1440.

---

## P2

### S1. Cảnh Tiên Sa vẽ lại (chiều sâu, ánh sáng)

| | |
|---|---|
| Quy cách | Ba lớp xa–giữa–gần. Trời: gradient 3 điểm theo giờ (sáng/tối theo theme). Núi Sơn Trà: 2–3 lớp mờ dần (phối cảnh khí quyển). Biển: gradient sâu, vệt sáng mặt trời/trăng, sóng là path cong lệch pha. Cẩu: khung giàn có bóng một phía. Tàu: thân 2 tông, bóng nước. Container: 3 tông mỗi màu (mặt, cạnh, rãnh). Đèn bãi sáng ban đêm. |
| Chữ | Nhãn SVG ẩn dưới `lg` như hôm nay. Từ `lg` trở lên, nhãn có nền viên thuốc mờ (không đè trực tiếp lên hình). |
| Chuyển động nền (GSAP, chỉ khi thấy) | Sóng trôi, mây trôi, đèn tháp nhấp nháy chậm (≤ 1 lần/2 s), xe tải chạy ra vào cổng 18 s/vòng. Dừng khi khuất (`ambient.ts`). |
| Giữ | Hình học của `bayBox`, `CRANE` và các setter (A2 dùng), `derive()` của `scene.ts`, `aria-label`. |
| File | `src/art/logistics.ts` (`harborScene`), `tests/` (đọc lại `bayBox`). Ngân sách `art` ≤ 20 (tăng ~3–5 KB). |

### S2. Bản đồ tuyến: bờ biển thật từ Natural Earth

| | |
|---|---|
| Việc | Script một lần `scripts/coast.mjs` lấy Natural Earth 1:110m (public domain), cắt khung Đông Á – châu Âu – Úc – bờ Tây Mỹ, chiếu equirectangular, giản lược (Douglas–Peucker) còn ≈ 3–5 KB, rồi ghi path vào `src/art/coast.ts`. Script và nguồn (URL + ngày) ghi trong `assets/THIRD_PARTY.md`. |
| Vẽ | Lục địa tô `--ground` có viền sáng, biển gradient, lưới kinh vĩ mờ. Tuyến là cung đại vòng (đã có điểm). Cảng có chấm + vòng; nhãn ≥ 11 px CSS (bản đồ to hơn: chiếm hết chiều rộng thẻ trên trang Bản đồ). |
| Chuyển động | Tàu nền theo MotionPath (`autoRotate`), thay `placeOnPath` tính tay. Nhiều tuyến mới thì vẽ nối tiếp (`stagger`). |
| Test | `ROUTES` vẫn khớp; mọi cảng nằm trên biển (điểm không rơi vào đa giác lục địa, có test thuần). |

### S3. Cảnh E-com vẽ lại + dock trên GSAP

Quy cách như S1: mặt tiền chợ đêm có mái ngói, ba lồng đèn có quầng sáng (gradient tỏa), kệ hàng nhìn xuyên cửa kính, xe máy giao hàng vẽ đủ bánh/yên/thùng, nền phố có vỉa hè. Lồng đèn đung đưa (`cq-sway` của v5 giữ là CSS). Dock của v5 B3 chạy trên GSAP: gói rơi vào ô kệ (tween `bounce.out`), xe chạy theo **MotionPath** đường phố, thăng tiến thì tuyến vẽ ra (DrawSVG). File: `src/art/ecommerce.ts`, `tests/ecomArt.test.ts`. `ecomart` ≤ 10.

### S4. Lộ trình General: hình cho từng Phần

| | |
|---|---|
| Việc | Thay `moduleGlyph` (ô mờ) bằng **hình minh họa nhỏ** cho mỗi Phần (bộ lọc phễu với hàng dữ liệu, hai bảng nối, lịch, cửa sổ trượt…). Agent vẽ theo cùng ngữ pháp Phosphor duotone ở lưới lớn (96×64): nét 4, lớp tô màu chương. |
| Mở khóa | Lần đầu thấy Phần mở (bộ nhớ phiên; xem v5 D-M2): ổ khóa **MorphSVG** thành dấu tích, vòng **DrawSVG**, 900 ms, chỉ trên SVG lá (L93). |
| Thẻ nâng cao | Ký tự `▣` thay bằng `icon()`. |
| File | `src/art/illustrations.ts`, `src/ui/learnView.ts` (GSAP qua `DrillDeps`, không import giá trị từ main: Plan 6 U3). `illustrations` ≤ 15, `learnui` ≤ 25. |

### S6. Finance (móc cho plan Finance, product-design-v9 §5.3)

Plan Finance vẽ cảnh, theo cùng quy cách S1 và hợp đồng §2.3, dùng chung chunk `gsap`. Cảnh thường: đồng xu bay theo cung (**MotionPath**) vào hũ thủy tinh, rơi vào ô chồng tính sẵn (tween `bounce.out`; không dùng Physics2D vì nó không có sàn), vệt sáng lướt qua kính hũ. Thăng tiến: nhãn sao dán lên hũ (`back.out`), đường tới chi nhánh mới vẽ ra (**DrawSVG**). Chunk art Finance tên `finance` (`src/art/finance.ts`, theo v9), nhóm ngân sách `finart` ≤ 10. Thêm một dòng trong `DOCK` (`stage.ts`, v5 B3).

---

## P3

| # | Mục | Cách | Ở đâu / ngân sách |
|---|---|---|---|
| S5 | Chân dung đồng nghiệp | **Open Peeps (CC0)**: ghép đầu/tóc/mặt từ bộ CC0, tô theo `look` của `people.yml`, crop tròn. Làm nguyên mẫu 4 người trước, cổng duyệt bằng mắt (nét tay của Open Peeps phải hợp với linh vật vẽ phẳng). Không hợp thì giữ `avatar.ts` và chỉ thêm bóng/gradient. | `src/ui/avatar.ts` + chunk lười `peeps` ≤ 15 KB; D-V5 |
| E1 | Số XP đếm lên | ~12 dòng `requestAnimationFrame` trong `topbar.ts`, không GSAP (main) | main +0,15 KB |
| E2 | Vào trang đọc: stagger section | CSS `animation-delay: calc(var(--i) * 40ms)`, chỉ opacity, tối đa 6 bậc (mở rộng v5 C1) | main +0,05 KB |
| E3 | "Điền khung" (v13) | **Không** gõ từng ký tự vào CodeMirror (làm bẩn Hoàn tác, chặn gõ, trình đọc màn hình đọc từng chữ). Thay bằng vùng vừa chèn sáng lên rồi nhạt 600 ms (`Decoration.mark` + keyframe CSS) | `src/ui/editor.ts`, main +0,1 KB |
| E4 | Cảnh dạy học: Boon viết bảng | Bấm Boon thì nét phấn **DrawSVG** 600 ms (GSAP động lúc bấm; chưa có thì đổi ô sáng ngay như hôm nay) | `teachScene.ts` |
| E5 | Trạng thái rỗng | Lily ngủ (rig M1) thở chậm bằng GSAP (scaleY 1 → 1,03, 3 s, chỉ khi thấy); `zz` của v5 giữ | `celebrate.ts`/rig |

---

## 4. Bảng ngân sách (gzip -9; GSAP và icon đo thật, phần còn lại ước lượng; đo lại ở cổng mỗi task)

| Mục | main | `html` | Chunk lười |
|---|---|---|---|
| §2 GSAP | 0 | | **gsap 45 / 50 (mới)** |
| I1 Icon | +6–9 | +0,3 (`data-icon` tĩnh) | |
| M1 Linh vật | +0,3 | +1,5–2,5 → ≤ 12 | |
| A2 Dock | 0 | | art −0,5 |
| F1 Top bar | ≈ 0 | | |
| S1 Tiên Sa | 0 | | art +3–5 (≤ 20) |
| S2 Bản đồ | 0 | | art +3–5 (≤ 20; nếu vượt thì tách `coast` thành chunk riêng ≤ 6) |
| S3 E-com | 0 | | ecomart +3 (≤ 10) |
| S4 Lộ trình | 0 | | illustrations +4 (≤ 15), learnui +0,3 |
| P3 | +0,3 | | peeps ≤ 15 (nếu làm) |
| **Tổng** | **≈ +7–10** (289 → ~299 / 500) | ≤ 12 | |

## 5. i18n

Không có khóa mới cho hình. Nhãn cảnh và `aria-label` dùng khóa sẵn có. Nếu F1 gộp nút vào ⋯ thì cần 1–2 khóa cho tiêu đề mục (VI/EN). Chữ trong hình mới đi qua `t()` như hôm nay.

## 6. Build tasks

**Thứ tự:** bắt đầu **sau v5 T9** (cùng sửa `stage.ts`, `logistics.ts`, `ecommerce.ts`, `mascots.ts`, `celebrate.ts`). Riêng I1 và F1 không đụng file của v5 đang làm, nên chạy song song được.

**Cổng chung:** `npx tsc --noEmit` · `npm test` · `npm run build` · `node scripts/check-budget.mjs` (main ≤ +10 KB so với trước v6; `gsap` ≤ 50; `html` ≤ 12; các nhóm art giữ trần) · `index-*.js` không chứa `GreenSock` · kiểm trình duyệt bằng `npx vite preview --port 5207` (hoặc cổng **≥ 5199 còn trống**, **không bao giờ 5173/5174**), hồ sơ mới, **375** và **1280**, sáng + tối, một lần giảm chuyển động (`--force-prefers-reduced-motion`), không lỗi console. **Chụp ảnh "sau" cùng tên với ảnh "trước"** (`shoot.mjs`) vào `…\scratchpad\uiux-v6\shots\after\`, ghi vào `docs/team/review-log.md` "v6".

| Task | Việc | File chính | Phụ thuộc | Cổng riêng |
|---|---|---|---|---|
| T0 | `assets/THIRD_PARTY.md` (GSAP, Phosphor, Natural Earth, Open Peeps nếu dùng: nguồn, bản, giấy phép, ngày kiểm); dòng "Licences" trong `CLAUDE.md`. Kiểm từng gói Kenney ứng viên (có SVG vector? đúng chủ đề tàu/xe/thùng hàng? hợp phong cách?) và đọc chữ giấy phép trên opendoodles.com. Không đạt thì bỏ khỏi v6 | | — | Mọi tài sản ngoài trong diff đều có dòng |
| T1 | **Spike GSAP, có cổng cứng.** `npm i --save-exact gsap@3.15.1`; `src/art/gsap.ts`; nhóm `gsap`; test "chỉ gsap.ts import gsap"; chuyển **một** cảnh (`ship`: MotionPath trên bản đồ, đối tượng trạng thái + `setShip` ở cảng) | `package.json`, lock, `src/art/gsap.ts`, `src/art/logistics.ts`, `src/ui/stage.ts`, `scripts/check-budget.mjs` | v5 T9 | (1) Chunk ra `gsap-*`, không gộp vào `logistics-*`. (2) `progress(1)` ra đúng khung cuối (so ảnh). (3) Không có transform chồng nhau. (4) Bỏ qua, Esc, `hashchange` giữa chừng. (5) Dòng bản quyền GSAP còn trong chunk. **Trượt một cổng thì dừng và báo lại.** |
| T2 | I1 icon: script sinh, bảng ánh xạ, icon kỹ năng tự vẽ theo ngữ pháp Phosphor, test | `scripts/icons.mjs`, `scripts/icon-map.json`, `scripts/icon-custom.json`, `src/ui/iconData.ts`, `src/ui/icons.ts`, `tests/icons.test.ts` | — | Họ JOIN phân biệt được ở 16 px (ảnh); `NAV_ICON` không trùng |
| T3 | F1 top bar | `src/ui/topbar.ts`, `index.html` | — | 1024/1280/1440: một hàng |
| T4 | M1a: vẽ lại sprite theo quy cách, chia phần, bảng công thức tư thế; giữ `data-mascot`/`data-pose`, giai đoạn Lily | `index.html`, `src/ui/mascots.ts`, `src/ui/teachScene.ts`, `src/style.css`, `tests/mascots.test.ts` | v5 T9 | Bảng ảnh 6×2×4 cỡ×2 theme; 32 px đọc được; `html` ≤ 12 |
| T5 | M1b: rig GSAP cho `react()` (cheer/think/oops/point), Lily lớn (DrawSVG/MorphSVG), dự phòng CSS | `src/ui/celebrate.ts`, `src/ui/mascots.ts` | T1, T4 | Đổi ngôn ngữ ngay sau phản ứng: không phát lại; chưa tải GSAP: CSS v5 chạy |
| T6 | A2: các cảnh còn lại + thăng tiến + hoa giấy Physics2D; xóa bộ máy tween | `src/art/logistics.ts` | T1, T5 | Mỗi cảnh: tổng = `durationOf` ±50 ms; giảm chuyển động: không hoa giấy; 375: dock không che editor |
| T7 | S1 Tiên Sa vẽ lại + nền GSAP (dùng phần Kenney CC0 nếu T0 thấy gói phù hợp) | `src/art/logistics.ts` | T6 | `art` ≤ 20; khuất thì dừng; **cổng duyệt bằng mắt**: ảnh trước/sau, sáng + tối, 1280/375. Không đạt thì giữ hình cảnh cũ, chỉ thêm gradient trời/biển và bóng |
| T8 | S2 bờ biển Natural Earth + bản đồ to hơn + MotionPath. Nguồn agent tải được: GeoJSON `ne_110m_land` trong repo GitHub `nvkelso/natural-earth-vector`, hoặc bản tải trên naturalearthdata.com | `scripts/coast.mjs`, `src/art/coast.ts`, `src/art/mapMotion.ts`, `src/art/logistics.ts` | T1 | Mọi cảng ở trên biển (test); nhãn ≥ 11 px; cổng duyệt bằng mắt |
| T9 | S3 E-com vẽ lại + dock GSAP | `src/art/ecommerce.ts`, `tests/ecomArt.test.ts` | T1, v5 B3 | `ecomart` ≤ 10; **cổng duyệt bằng mắt** trước/sau. Không đạt thì giữ cảnh v5 |
| T10 | S4 lộ trình: hình từng Phần + mở khóa | `src/art/illustrations.ts`, `src/ui/learnView.ts` | T1 | Vẽ lại ngay sau mở khóa: không phát lại; **cổng duyệt bằng mắt** các hình Phần |
| T11 | P3: E1, E2, E3, E4, E5; S5 chỉ sau khi nguyên mẫu 4 chân dung được duyệt | `topbar.ts`, `homeView.ts`, `editor.ts`, `teachScene.ts`, `avatar.ts` | T5 | Điền khung rồi Hoàn tác: một bước |
| T12 | Giấy tờ + đo lại §4 | `CLAUDE.md` (GSAP, icon sinh mã, rig linh vật, nhóm ngân sách), `decision-log.md`, `review-log.md` | T0–T11 | |

---

## 7. Rủi ro

| Rủi ro | Giảm |
|---|---|
| Hình vẽ lại (linh vật **và cảnh**) "không đẹp hơn" (đây là việc thẩm mỹ). **Phần lớn hình vẫn do agent vẽ:** không bộ minh họa miễn phí nào có cảnh cảng Đà Nẵng, chợ đêm hay Lily/Boon; chỉ lấy sẵn được phần lẻ (Kenney, Open Doodles) và bờ biển (Natural Earth). | T4, T7–T10 đều có cổng duyệt bằng mắt và phương án lùi. với bảng ảnh trước/sau ở 4 cỡ. Nguyên mẫu `proto.html` đã cho thấy hướng (gradient, mắt có điểm sáng, đốm cắt theo dáng). Không đạt thì giữ sprite cũ, chỉ thêm nét 2,4 + gradient. |
| GSAP không phải mã nguồn mở; điều khoản có thể đổi | Ghim 3.15.1, ghi giấy phép trong `THIRD_PARTY.md`. Mọi lời gọi đi qua `src/art/gsap.ts`, nên nếu phải thay thư viện thì chỉ sửa một file (anime.js 4.5.0 MIT có MotionPath/Drawable/morph tương đương, §1). |
| Rolldown gộp GSAP vào chunk art hoặc main | Chỉ dùng `import()` động; cổng tên chunk; test nguồn. |
| Transform chồng nhau (setter thuộc tính và GSAP CSS) | Luật §2.3; cổng T1 (3). |
| Icon mới đổi nghĩa (người chơi quen icon cũ) | Giữ đúng ẩn dụ (`icon-map.json` ghi lý do từng icon); `NAV_ICON` không trùng. |
| `html` lớn làm chậm lần vẽ đầu | Trần 12 KB; sprite dùng chung phần. |
| Bản đồ Natural Earth quá nặng | Giản lược tới ≤ 5 KB gz; vượt thì tách chunk `coast`. |
| Chuyển động nhiều gây khó chịu tiền đình | Biên độ v5 (≤ 10 px nảy, ≤ 18 % scale, ≤ 14° vẫy); hoa giấy chỉ khi thăng tiến; không nhấp nháy > 1 lần/s. |
| Phong cách lẫn lộn (Phosphor, Open Peeps, cảnh vẽ) | Một bảng quy cách chung: nét đầu tròn, lớp tô opacity .2, gradient trên-trái, bóng elip. S5 có cổng nguyên mẫu. |

---

## 8. Engine 2D/3D cho nhân vật sống động hơn (user hỏi)

Tiêu chí: hình cuối, ai vẽ được, kích thước (lười), máy yếu, giảm chuyển động, hợp app SQL dạng DOM (không làm người học rời mắt khỏi editor).

| | (a) Rive | (b) PixiJS 8 | (c) Three.js + mô hình CC0 | **(d) SVG có rig + GSAP** |
|---|---|---|---|---|
| Hình cuối | Đẹp nhất cho nhân vật (bone, mesh deform, state machine) | Tốt cho hạt và sprite; nhân vật vẫn cần hình vẽ sẵn | 3D low-poly, lệch hẳn phong cách phẳng của app | Tốt, có giới hạn (không deform mềm như bone mesh) |
| Ai vẽ | **Người**, trong trình soạn Rive (ứng dụng web/desktop đóng). `.riv` là định dạng nhị phân, không có công cụ dựng không giao diện; theo tôi, agent **không** tạo được file `.riv` dùng được. File cộng đồng là CC BY 4.0 (phải ghi công), nhưng phải là Lily/Boon của BoonData, nên file chó đốm hay vịt của người khác không dùng được | Agent viết mã được; hình vẫn từ SVG/PNG | Agent không dựng được rig 3D tốt. Kenney và Quaternius có thú CC0 nhưng là nhân vật khác, không phải Lily/Boon | **Agent làm được hết** (vẽ path + timeline) |
| Kích thước (lười) | JS 58 KB + wasm ≈ 363 KB gz | ≈ 115–156 KB gz | ≈ 154 KB gz + mô hình | GSAP 45 KB (dùng chung với cảnh) |
| Máy yếu | Canvas/wasm, ổn | WebGL, nặng pin | WebGL, nặng nhất | DOM SVG, nhẹ với ≤ 40 phần tử động |
| Giảm chuyển động | Tự làm (dừng state machine) | Tự làm | Tự làm | `run.fast` sẵn có |
| Hợp app DOM | Canvas: mất `aria`, theme qua token CSS phải truyền tay | Canvas | Canvas | **Cùng DOM, cùng token CSS, cùng theme** |
| Kết luận | Lối đi sau này, **chỉ khi user cung cấp `.riv`** | **Chưa cần**: hoa giấy ≤ 40 mảnh SVG + Physics2D là đủ | **Không** (D4) | **Chọn** (D3) |

### 8.1 Nếu sau này muốn Rive: user cần cung cấp gì

Một file `boondata-mascots.riv` do user (hoặc họa sĩ user thuê) làm trong trình soạn Rive, với giấy phép cho phép phát hành trong repo công khai:
- Hai artboard `Lily`, `Boon`, khung vuông 512×512, dùng **đúng** bảng màu `--lily-*`/`--boon-*` (hai bộ: sáng và tối, hoặc một input `dark` kiểu boolean).
- Một state machine mỗi artboard. Input `pose` (number 0–5: idle, point, cheer, think, oops, sleep), trigger `react`, number `stage` (0–3, chỉ Lily: khăn, sao, laptop). Mọi chuyển động một lần ≤ 1 s; idle lặp nhẹ.
- Một trạng thái "tĩnh" cho mỗi tư thế (dùng khi giảm chuyển động).

Khi đó v6 thêm chunk `rive` (≈ 420 KB, chỉ ở màn chào và cảnh dạy học) và giữ SVG rig ở mọi chỗ nhỏ (32–48 px), nơi Rive không đáng.

### 8.2 PixiJS

Chỉ nên dùng khi một cảnh có hàng trăm hạt hoặc sprite cùng lúc. Không cảnh nào của v6 cần mức đó. Xem lại nếu Finance hoặc một tính năng sau cần.

### 8.3 Three.js

Không (D4).

### 8.4 Lottie

Trình phát `lottie_light` tốn 46 KB. Hình từ LottieFiles miễn phí (Lottie Simple License cho dùng thương mại, sửa, phát lại) nhưng **khác phong cách** linh vật và cảnh, và nhân vật trong đó không phải của BoonData. GSAP đã làm được các hiệu ứng như dấu tích, hoa giấy, loader. Không dùng.

---

## 9. Quyết định cần duyệt (mặc định in đậm)

D1–D4 đã chốt (§0.2). Còn lại:

| # | Câu hỏi | Mặc định | Phương án khác |
|---|---|---|---|
| D-V1 | Bộ icon | **Phosphor duotone 2.1.1 (MIT)**, path sinh vào `iconData.ts` | Lucide 1.75.0 (ISC), gọn hơn (≈ 3 KB) nhưng gần như giống icon hôm nay |
| D-V2 | Ghim GSAP | **`npm i --save-exact gsap@3.15.1`**; plugin: MorphSVG, DrawSVG, MotionPath, Physics2D, CustomEase | 3.15.0 nếu gặp lỗi; thêm SplitText (+3 KB) khi có chỗ dùng |
| D-V3 | Ngân sách `gsap` | **50 KB, chunk lười, tải trước khi idle** | Để trong `art` (vỡ trần 20) |
| D-V4 | Bờ biển bản đồ | **Natural Earth 1:110m (PD), giản lược ≤ 5 KB** | Giữ khối cách điệu, chỉ thêm gradient |
| D-V5 | Chân dung đồng nghiệp | **P3, nguyên mẫu 4 người bằng Open Peeps (CC0), làm tiếp chỉ khi duyệt bằng mắt** | Giữ `avatar.ts`, chỉ thêm bóng/gradient |
| D-V6 | Trần `html` | **12 KB** (sprite vẽ lại) | Giữ 9 KB: tách các phần ít dùng (laptop, sleep) ra chunk lười |
| D-V7 | Chớp mắt linh vật ngoài màn chào | **Không** (giữ v5 D-M3) | Chớp mỗi 6–9 s ở Trang chủ |
| D-V8 | Hoa giấy | **Chỉ khi thăng tiến** | Cả lần đạt việc đầu mỗi chương |
| D-V9 | F1 (top bar) | **Gộp VI/EN + theme vào ⋯ từ `lg` tới `xl`** | Ẩn chữ "Hộp thư"/"Ôn tập", chỉ giữ icon + số |
| D-V10 | Lottie, PixiJS, unDraw | **Không dùng trong v6** | Xem lại theo §8 |
