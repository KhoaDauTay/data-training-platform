# Cargo Query — UI/UX v3 (phản hồi L42)

Phạm vi: 5 điểm user nêu ở L42. Ràng buộc giữ nguyên: Tailwind v4 + `h()`/`s()`, không thêm thư viện, mọi chữ qua `t()` (VI + EN), L21–L23 (chữ trung tính, màu chỉ ở nhãn/badge nhỏ, không chữ "boss"), ngân sách main ≤ 300 KB gzip (L41): icon là **path data trong một file**, không sprite, không font icon.

**Sửa quyết định cũ:** L42 thay L35 về theme (thêm công tắc theme) và thay một phần L11: menu `⋯` của topbar quay lại, nhưng **chỉ** chứa Xuất/Nhập tiến độ (không thêm phím tắt hay mục khác).

---

## 0. Icon dùng chung: `src/ui/icons.ts` (file mới)

```ts
const P: Record<IconName, string> = { inbox: 'M4 13h4l2 3h4l2-3h4 …', … }; // chỉ thuộc tính d, nhiều nét nối bằng 'M'
export function icon(name: IconName, cls = 'size-5'): SVGSVGElement // dùng s(): viewBox 0 0 24 24, fill none,
//   stroke currentColor, stroke-width 2, round cap/join, aria-hidden true, focusable false
export function skillIcon(id: string, cls?: string): SVGSVGElement // SKILL_ICON[id] ?? 'puzzle'
```

Quy tắc vẽ: lưới 24, nét 2px, `currentColor`, **không chữ trong icon** (kể cả Σ là nét, không phải ký tự), tối đa ~4 nét/icon, chừa 2px lề. Icon luôn đi kèm nhãn chữ thấy được, hoặc nút chỉ có icon thì có `aria-label` qua `t()`. Không dùng emoji cho UI nữa (🔒 🧪 📂 📒 ⚓ → icon).

Test: `tests/content.test.ts` thêm một case: mọi `id` trong `content/skills.yml` có trong `SKILL_ICON` (fallback chỉ cứu lúc chạy, không được dùng cho id đã có).

---

## (a) Topbar và thanh điều hướng

### Nhóm (trái → phải), giữ nguyên mọi `id` mà `main.ts` đang bám

| # | Nhóm | Nội dung | Hình thức |
|---|------|----------|-----------|
| 1 | Thương hiệu + điều hướng | icon `anchor` + "Cargo Query" · `#nav` (Trang chủ, Làm việc, Luyện tập, Sandbox) | nav là **segmented control**: khung `rounded-xl bg-black/25 p-1 ring-1 ring-white/15`, link hiện tại `bg-white text-blue-900 font-semibold` (≥ 7:1), link khác chữ trắng, hover `bg-black/20` |
| 2 | Trạng thái | `#chapter` · `#rank` · `#xp` | một "thẻ trạng thái" `rounded-xl bg-black/25 ring-1 ring-white/15 px-3 py-1`, ba phần ngăn bằng vạch dọc `w-px h-4 bg-white/30`; chapter: icon `map` + "Ch. 4/12" + tên chương (`truncate max-w-[16rem]`, `title` = tên đầy đủ); rank: icon `badge` + chức danh; XP: icon `star` + "2.700 XP" giữ chip vàng `bg-amber-400 text-amber-950` |
| 3 | Hành động | `#inbox-btn`, `#review-btn`, `#notebook-btn` | nút có icon (`inbox`, `repeat`, `book`) + nhãn; số mới là **badge tròn** đỏ góc nút (`bg-rose-600 text-white text-xs`, ≥ 4.5:1) thay cho "(1 mới)" trong nhãn; nhãn đầy đủ vẫn trong `aria-label` (vd. "Hộp thư, 1 tin mới") |
| 4 | Cài đặt | VI/EN + công tắc theme (§b) | một khung `rounded-xl bg-black/25 p-1 ring-1 ring-white/15`, hai segmented nhỏ ngăn bằng vạch dọc |
| 5 | Dữ liệu | `#db-status` + nút `⋯` | xem dưới |

Giữa các nhóm: `gap-3`; nhóm 3–5 đẩy sang phải bằng `ml-auto` ở nhóm 3. Nền nhóm luôn **làm tối** (`bg-black/…`), không làm sáng — chữ trắng trên đầu cyan của gradient phải ≥ 4.5:1 (trắng/cyan-700 = 5.36, thêm `black/20` = 7.43). Gradient L17 giữ nguyên.

**Nhóm 5 — DB + menu:**
- `#db-status` (`role=status`, giữ): **sẵn sàng** → chấm xanh `size-2 rounded-full bg-emerald-400` + chữ `sr-only` "Database sẵn sàng"; **đang tải** → chip hiện rõ "Đang tải 12/40 MB"; **lỗi** → nút "Thử lại" + "Sao chép chẩn đoán" hiện thẳng trên topbar. Ba trạng thái này **không bao giờ** nằm trong menu.
- Nút `⋯` (`aria-label` "Thêm", icon `more`) mở `<div id="more-menu" popover>` (Popover API, tự đóng khi bấm ngoài/Esc, không JS mở/đóng). Menu: "Xuất tiến độ" (`#export-btn`, icon `download`), "Nhập tiến độ" (nút mới `#import-btn`, icon `upload`). Vị trí: `position: fixed; top: 56px; right: 16px; inset: auto` (không dùng anchor positioning). Nền `bg-panel text-ink ring-1 ring-line shadow-lg rounded-xl`.
- **"No file chosen"**: bỏ `<label>` bọc input. Input thành `<input id="import-input" type="file" accept="application/json" hidden>`; `#import-btn` gọi `input.click()`. `hidden` = không render, không vào cây trợ năng, không lộ chữ của trình duyệt khi chọn/copy trang. Handler `change` ở `main.ts:231` giữ nguyên.
- Focus: `.topbar :focus-visible { outline-color: #fff }` không áp cho popover. Popover đặt ngoài `<header>` (cuối `body`) để dùng outline `--accent` mặc định.

### Responsive (≥ 1024×700 là shell một màn hình: topbar phải gọn)

| Bề rộng | Bố cục |
|---------|--------|
| **1280** | Một hàng: `[1] [2] ······ [3] [4] [5]`. Tên chương truncate 16rem. |
| **820** | Hai hàng. Hàng 1: `[1] ······ [4] [5]`. Hàng 2: `[2] ······ [3]`. Tên chương truncate 12rem. Hàng 2 ngăn với hàng 1 bằng `border-t border-white/15 pt-2`. |
| **375** | Ba hàng. Hàng 1: icon neo (ẩn chữ "Cargo Query" dưới `sm`, `aria-label` giữ) · `[2]` chỉ "Ch. 4/12" + XP (ẩn rank, ẩn tên chương — dải bản đồ đã ghi chương) ······ `[5]`. Hàng 2: `#nav` full width, `grid grid-cols-4`, chữ `text-sm`. Hàng 3: `[3]` nút chỉ icon + badge (`aria-label` đủ) ······ `[4]`. |

Quy tắc xuống dòng: dùng `flex-wrap` theo nhóm, **không bao giờ** tách một nhóm ra hai dòng (mỗi nhóm `shrink-0 flex-nowrap`, trừ tên chương được truncate). Không cuộn ngang.

---

## (b) Công tắc theme

- **Chỗ đặt**: nhóm 4, sau VI/EN. Ba nút icon-only, `role=group aria-label=t('top.theme')`, `aria-pressed`: `sun` = Sáng (`theme.light`), `monitor` = Theo hệ thống (`theme.system`), `moon` = Tối (`theme.dark`). Mỗi nút có `aria-label` + `title` qua `t()`. Mặc định `system`.
- **Lưu**: thêm trường `theme: 'light' | 'dark' | 'system'` vào key sẵn có `cargo-query/prefs` (`PREFS_KEY`, `src/i18n/index.ts`) — `setLang` đã merge `{ ...readJson(PREFS_KEY), lang }`, nên ghi theme cũng merge giống vậy. Đọc qua `readJson`, giá trị khác 3 chữ trên → `system`. Không thuộc `Save`. Cập nhật danh sách key trong `CLAUDE.md` (`{ lang, theme }`).
- **Cơ chế**: JS luôn ghi theme **đã quy đổi** lên `<html data-theme="light|dark">`; `system` dùng `matchMedia('(prefers-color-scheme: dark)')` + listener `change`. Hàm ở `src/theme.ts`: `getTheme()`, `setTheme(pref)`, `isDark()`; mỗi lần đổi bắn `document.dispatchEvent(new Event('cq-theme'))`.
- **Không nháy khi tải**: script nhỏ inline trong `<head>` của `index.html` (devops không có CSP chặn inline), trong `try/catch`, đọc `cargo-query/prefs` và đặt `data-theme` trước khi vẽ. Lỗi/thiếu → theo `matchMedia`.
- **CSS** (`src/style.css`):
  ```css
  @custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));
  :root { …token sáng…; color-scheme: light; }
  :root[data-theme=dark] { …token tối (chuyển nguyên khối @media hiện tại vào đây)…; color-scheme: dark; }
  ```
  Bỏ `@media (prefers-color-scheme: dark)` của token và `color-scheme: light dark`. ~45 class `dark:` hiện có tự theo variant mới, không sửa từng chỗ.
- **Chỗ JS đang đọc theme OS** (phải đổi sang `isDark()` + sự kiện `cq-theme`): `DARK` trong `src/ui/erdView.ts` (Mermaid `theme`), listener ở `src/ui/vizTabs.ts:120`. Sửa luôn chú thích `src/ui/editor.ts:43`.
- **Token** (đã đo bằng script, WCAG AA chữ ≥ 4.5:1):

| Cặp | Hiện tại | Đổi |
|-----|---------|-----|
| sáng `--warn` trên `--code` | 4.09 ✗ | `--warn: #9a4f00` → 5.21 trên `--code`, ≥ 5.5 trên panel |
| sáng `--bg` / `--panel` (tách card khỏi nền) | 1.07 | `--bg: #f1f1ee` (muted trên bg vẫn 5.05) |
| tối `--bg` / `--panel` | 1.10 | `--bg: #121214` (text trên bg 15.9) |
| `--border` sáng / tối | 1.38 / 1.33 | `#d4d4cf` / `#3f3f46` (chỉ trang trí; card tương tác có thêm viền accent khi hover/focus) |

Các cặp còn lại đã đạt: muted 5.71/6.33, accent 5.38/6.70, good 5.08/7.24, bad 5.62/5.92, on-accent/accent tối 7.09.

---

## (c) KPI

**Định dạng** (`kpiValue`, `src/home.ts`), theo `getLang()`:
- `|x| ≥ 1.000.000` → compact, 1 số lẻ. Tùy chọn đã chạy thử:
  - VI: `new Intl.NumberFormat('vi-VN', { notation: 'compact', compactDisplay: 'long', maximumFractionDigits: 1 })` → `156,5 triệu`, `2,5 tỷ` (dạng `short` ra "Tr"/"T" khó hiểu — **không** dùng).
  - EN: `new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short', maximumFractionDigits: 1 })` → `156.5M`, `2.5B`.
- `|x| < 1.000.000`: số nguyên giữ đúng (`9.694` / `9,694`); số có phần lẻ → tối đa 1 số lẻ (`4,6` ngày).
- Thanh (`bar`) dùng cùng quy tắc cho số bên phải.
- Giá trị đầy đủ (2 số lẻ như hiện nay) đặt trong `title` và trong `aria-label` của ô, để người cần số chính xác vẫn có.

**Đơn vị**: `kpis.yml` thêm trường tùy chọn `unit: { vi, en }` (vd. `{ vi: "kg", en: "kg" }`, `{ vi: "ngày", en: "days" }`, `{ vi: "%", en: "%" }`) và bỏ "(kg)" khỏi `label`. Số lớn hiện `156,5 triệu` + đơn vị nhỏ hơn bên cạnh: `<span class="text-3xl font-bold tabular-nums">156,5 triệu</span> <span class="text-base text-muted">kg</span>`.

**Bố cục ô KPI** (trên xuống):
1. Hàng đầu: icon trong ô vuông `size-9 rounded-lg bg-code text-ink` + nhãn (`text-sm font-medium`, ≤ 2 dòng).
2. Số lớn + đơn vị (hoặc 5 thanh).
3. Dòng nguồn `text-sm text-muted` có icon `link` nhỏ: "Từ việc …". Ô khóa: icon `lock` + gợi ý mở.

Icon theo ô — thêm trường tùy chọn `icon:` vào `kpis.yml` (thiếu → theo `kind`: number `hash`, rowcount `list`, bar `chart`):

| id | icon |
|----|------|
| shipments2025 | `box` |
| weight2025 | `scale` |
| inTransit | `ship` |
| keyAccounts | `star` |
| modeMix | `chart` |
| teuByCarrier | `container` |
| quietCustomers | `clockOff` |
| topCustomers | `trophy` |
| overdueArrivals | `clockAlert` |
| clearanceDays | `stamp` |
| duplicateCustomers | `copy` |
| q3margin | `percent` |

---

## (d) Hệ thống card

**Hai loại, không hơn:**
- `CARD` (tĩnh): KPI, card chương, career, harbor, routes — `rounded-2xl bg-panel ring-1 ring-line`, **không** hover nhấc lên (không bấm được thì không giả vờ bấm được). L21: card chương khóa vẫn hiện "bước tiếp theo" như hiện tại.
- `CARD_ACTION` (bấm được): card chế độ, card kỹ năng đã học, card tiếp tục (nút trong card) — thêm vào `src/theme.ts`:
  ```
  CARD + ' transition hover:-translate-y-0.5 hover:shadow-md hover:ring-2 hover:ring-accent focus-visible:ring-2 focus-visible:ring-accent'
  ```
  Reduced motion: quy tắc chung cuối `style.css` (`* { transition: none !important … }`) đã tắt — không thêm quy tắc mới. Bóng ở theme tối gần như không thấy, nên viền accent là tín hiệu chính.

**Khoảng cách**: card lớn `p-6`, card lưới `p-4`/`p-5`; trong card `gap-3`; giữa section `gap-5` (giữ).

**Thứ tự trong card** (mọi card): icon/khối nhận diện → nhãn nhỏ (kicker, `text-sm text-muted` hoặc màu chương nếu là badge) → tiêu đề/số lớn → mô tả `text-[15px]` → dòng phụ/nguồn `text-sm text-muted` → hành động (nút) ở đáy.

**Icon theo card:**

| Card | Icon / thay đổi |
|------|-----------------|
| Tiếp tục (continue) | kicker có icon `inbox`; nút "Tiếp tục" có icon `arrowRight`; nút Hộp thư icon `inbox` |
| Career | icon `badge` cạnh tiêu đề; chấm bậc giữ |
| Chương | mở: vòng số chương giữ (màu chương); khóa: `lock` SVG thay 🔒; xong: thêm `check` trong vòng số. Dòng kỹ năng thành hàng icon nhỏ `size-4` + nhãn (tối đa 4, còn lại "+n") |
| Kỹ năng | `skillIcon(id)` trong ô `size-9 rounded-lg` (màu `chip` của chương, khóa: `bg-panel text-muted` + icon `lock` nhỏ ở góc) thay chữ cái đầu |
| Chế độ | `ModeCard.icon` đổi kiểu `string` → `IconName`; sửa chỗ đăng ký: `modes.ts` (sandbox `flask`, mydata `folder`), `notebook.ts` (`book`) |
| KPI | bảng ở (c) |
| Topbar thương hiệu | `anchor` thay ⚓ |

---

## (e) Bộ icon kỹ năng

Phủ đủ 22 id trong `content/skills.yml`; mỗi id một icon khác nhau, kể cả các cặp gần nhau.

| id | Khái niệm vẽ |
|----|--------------|
| select | bảng 3 cột, cột giữa tô đậm + mũi tên kéo lên (bóc cột ra) |
| where | phễu lọc |
| order_by | hai mũi tên lên/xuống + 3 vạch ngắn dần |
| limit | 3 vạch ngang + vạch cắt nét đứt bên dưới (lấy top N) |
| aggregate | sigma vẽ bằng nét (không phải chữ) |
| group_by | 3 ô xô (bucket) có chấm bên trong |
| having | 3 ô xô, một ô bị gạch chéo (lọc nhóm) |
| join | hai vòng tròn chồng nhau, phần giao tô |
| multi_join | ba vòng tròn nối thành chuỗi |
| left_join | hai vòng tròn, vòng trái tô cả |
| anti_join | hai vòng tròn, chỉ phần trái không giao được tô |
| self_join | một vòng tròn với mũi tên vòng ngược về chính nó |
| date_math | lịch + dấu cộng/trừ |
| date_bucket | lịch có các ô chia nhóm theo hàng (tuần/tháng) |
| null_logic | tập rỗng (vòng tròn gạch chéo) |
| case_when | nhánh rẽ: một đường tách ba |
| conditional_agg | sigma + dấu tick nhỏ |
| coalesce | mũi tên rẽ phụ chạy song song (đường dự phòng) |
| string_fn | chữ "T" kiểu con trỏ văn bản + gạch dòng (vẽ nét) |
| pattern_match | kính lúp + dấu `*` (vẽ nét) |
| distinct | 3 chấm, 2 chấm trùng bị nhập làm 1 (hai chấm chồng → một) |
| cast | hai mũi tên tráo đổi giữa hình vuông và hình tròn |

Dự kiến (curriculum, id chốt khi thêm vào `skills.yml`; tới lúc đó dùng fallback):

| id dự kiến | Khái niệm |
|-----------|-----------|
| in_subquery, scalar_subquery, correlated_value, exists | hộp lồng trong hộp (biến thể: tick cho `exists`) |
| cte, multi_cte | các bước có tên: 2–3 khối nối mũi tên xuống |
| window_agg, window_lag, window_rank | khung trượt trên hàng dòng (lag: mũi tên lùi; rank: bậc thang) |
| union | hai khối xếp chồng |
| except | khối trừ khối (dấu trừ bằng nét) |
| full_join | hai vòng tròn tô cả hai |
| distinct_on | như `distinct` + mũi tên chọn một |
| explain_read | kính lúp trên cây kế hoạch |
| index_design | sách có mép chia mục (chỉ mục) |
| *(fallback)* | `puzzle` (mảnh ghép) |

**Nơi hiện icon kỹ năng:**
- Home: card kỹ năng (thay chữ cái), card chương (hàng icon kỹ năng).
- Chip Dạy/Cần (`skillChips`, `src/ui/chapterView.ts`): hiện là **một** pill chuỗi nối bằng dấu phẩy qua `chip.teaches {list}`. Đổi thành: nhãn "Dạy:" / "Cần:" (key mới `chip.teachesLabel` / `chip.needsLabel`) rồi **mỗi kỹ năng một chip** `icon size-4 + nhãn`. Bỏ `chip.teaches`/`chip.needs` cũ khi không còn dùng.
- Sổ tay (`src/ui/notebook.ts`): icon `size-5` trước tên mỗi thẻ kỹ năng.
- Recap (`src/ui/brief.ts`): icon trước `<b>` tên kỹ năng trong danh sách "Bạn vừa học được".

---

## i18n mới (VI + EN, `tests/i18n.test.ts` phải xanh)

`top.theme` (Giao diện / Theme), `theme.light` (Sáng / Light), `theme.dark` (Tối / Dark), `theme.system` (Theo hệ thống / Match system), `top.more` (Thêm / More), `top.inboxNew` (Hộp thư, {n} tin mới / plural EN), `chip.teachesLabel` (Dạy: / Teaches:), `chip.needsLabel` (Cần: / Needs:), `db.readyShort` nếu cần. Nhãn cũ `top.export` / `top.import` / `db.*` giữ.

## Việc kèm theo (không thuộc commit spec này)

- `CLAUDE.md`: key prefs thành `{ lang, theme }`; nhắc `src/ui/icons.ts`; nhắc L42 thay L11 cho menu `⋯` (chỉ Xuất/Nhập).
- `decision-log.md`: dòng mới chốt v3 khi team duyệt.
- Đo lại gzip main sau khi thêm icons (≈ 40 path ~ 3–4 KB thô, < 2 KB gzip); vẫn ≤ 300 KB.

## Không làm (YAGNI)

Không thư viện icon, không sprite SVG, không anchor positioning, không theme thứ ba / tùy màu nhấn, không animation icon, không bóng phức tạp cho theme tối, không chuyển KPI sang biểu đồ khác.
