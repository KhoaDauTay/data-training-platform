# Cargo Query — UI/UX v4 (phản hồi L47, mục 1–6)

Phạm vi: mục 1–6 của L47 (build ngay). Mục 7 (bảng điều hành thành tab riêng / dashboard tự dựng) và mục 8 (nghiệp vụ cho tuyến) **không** nằm ở đây: chờ Product phân tích, user duyệt. Spec này chỉ chừa chỗ cho chúng (slot nav ở §5, dialog bản đồ ở §3).

Ràng buộc giữ nguyên: Tailwind v4 với class literal qua `cx()`, `h()`/`s()`, không thêm thư viện (Mermaid đã có cho ER), mọi chữ qua `t()` (VI + EN, `en.ts` là `Record<Key, Msg>`), L21–L23 (màu chỉ ở badge/chấm nhỏ, không chữ "boss"), quy tắc render (`rerender()` **không bao giờ** tạo lại editor; `work.setTicket()` chỉ tạo lại khi `ticketId#step` đổi; Run/Submit chụp ticket/step/editor lúc bấm), reduced motion (quy tắc chung cuối `style.css` đã tắt transition — không thêm animation mới).

**Sửa quyết định cũ:**
- L35 / L37 về dải `#map` ("một dòng, không vẽ bản đồ, link sang Trang chủ"): dải thành **thanh điều hướng việc** (§2) và bản đồ mở **tại chỗ** trong dialog (§3).
- ui-ux-v3 §a: `#nav` có 5 mục (thêm "Dữ liệu"), dưới `md` là lưới 3 cột thay 4 cột (§5).
- ui-ux-v3 §d (card chương): bố cục cố định, kỹ năng một dòng mỗi mục, chân card ghim đáy (§6).
- Tab "Sơ đồ ER" và "Cột" mặc định chỉ hiện bảng liên quan tới việc đang mở (§4); toàn bộ DB sang trang Dữ liệu (§5).

---

## 1. Tab "Thứ tự thực thi": bỏ thẻ bước không dùng

| | |
|---|---|
| Hành vi | Mệnh đề không có trong câu lệnh (vd. không HAVING, không DISTINCT, không ORDER BY, không LIMIT) **không vẽ thẻ**, không mũi tên. Không có dòng "không dùng" thay thế. |
| Chỗ lọc | `src/ui/stepsView.ts`, đầu `renderSteps` khi `result.ok`: `const steps = result.steps.filter((s) => !s.skipped)`. **Không** đổi `buildSteps`/`runSteps` (`src/viz/steps.ts`): `tests/steps.test.ts` và `tests/importViz.test.ts` đang kiểm `skipped`. |
| Hệ quả | `current`, `prevCount`, số thứ tự trong `steps.title {i}`, mũi tên `→` và nút Phát đều chạy trên danh sách đã lọc (bước 1…n liền nhau). `current` mặc định = bước thứ 2 nếu có (`live[1] ?? live[0]`), như hiện tại. Bỏ nhánh `s.skipped` trong `draw()` (class `border-dashed text-muted`). Bước lỗi (`s.error`) vẫn vẽ, viền `border-bad`. |
| Trường hợp biên | `SELECT 1` → chỉ thẻ SELECT. Câu lỗi cú pháp / WITH / UNION / window: giữ thông báo hiện tại (không tới bước lọc). |
| i18n | **Xóa** `steps.unused` ở `vi.ts` và `en.ts`. |
| Test | `tests/stepsView.test.ts` (mới, jsdom như các test UI khác nếu có; nếu không thì thêm vào test UI sẵn có): `SELECT … GROUP BY …` không HAVING → không có nút nào chứa nhãn HAVING/DISTINCT; số nút = số bước không `skipped`. |

---

## 2. Thanh điều hướng việc (thay dải `#map`)

### Vị trí và lý do
Dùng lại `#map` (`index.html`, ngay dưới topbar, toàn chiều rộng): đã nằm "trên đầu", đã chỉ hiện ở `#/play` chế độ story (`main.ts` `rerender()`: `byId('map').hidden = byId('shell').hidden || !isStory()`), đã có chấm tiến độ. Chấm thành **nút**. Không thêm thanh thứ hai trong khung trái (tránh trùng với chấm).

Đổi `aria-label` của `#map` (`map.strip`) thành "Điều hướng việc" / "Task navigation", bọc nội dung trong `<nav>`.

### Nội dung (trái → phải)

| Phần | Hành vi |
|------|---------|
| Chọn chương | `<select>` native (label `sr-only` "Chương"). Mỗi chương một `<option>`: "Chương 3 · {tên}" + " ✓" nếu xong hết. Chương chưa mở (không có ticket nào trong `visibleTickets`) và chương "Sắp có": `disabled`, chữ "(chưa mở)". Giá trị = chương của ticket đang mở. Chọn chương → `actions.selectTicket(id)` với id = `nextTicket()` nếu nó thuộc chương đó, ngược lại ticket đầu tiên của chương. |
| ‹ / › | Việc trước / sau theo **thứ tự story** trong danh sách `visibleTickets` (đã xong + việc kế tiếp), vượt qua ranh giới chương. Hết thì `disabled`. `aria-label` "Việc trước: {title}" / "Việc sau: {title}". |
| Nút việc | Một nút cho mỗi ticket của chương đang xem, theo thứ tự nội dung (`chapterDots`, `src/viz/progressDots.ts`). Nhãn: số thứ tự trong chương (1, 2, …); việc đánh giá thăng tiến (`beat: boss`) dùng icon `badge` thay số. `title` + `aria-label` = "{n}. {title} · {trạng thái}". Trạng thái: **xong** = icon `check` nhỏ góc + `text-good`; **đang làm** (= `nextTicket`) = vòng `ring-2 ring-accent`; **chưa mở** (sau `nextTicket`) = `disabled`, icon `lock`, `text-muted`, `title`/`aria-label` chỉ "{n}. Chưa mở" (không lộ tên việc). Việc đang mở: `aria-current="page"`, nền `bg-accent-soft` + gạch dưới như dải cũ. |
| Tiếp tục → | Hiện khi việc đang mở ≠ `nextTicket()` và còn việc chưa xong. Nhãn "Việc tiếp theo →" khi việc đang mở **đã xong** (sau khi nộp đúng): class `BTN_GO` (nút chính). Khi đang xem lại một việc cũ mà việc hiện tại chưa xong: nhãn "Về việc đang làm →", nút phụ. Bấm → `actions.selectTicket(nextTicket().id)`. Hết việc → ẩn. |
| Tuyến + bản đồ | Chữ "Tuyến đã mở {n}/{total}" (giữ `map.lanes`) + **nút** "Xem bản đồ" (icon `map`) mở dialog §3 — thay link `#/` hiện tại. |

Cỡ nút việc: `size-8` từ `sm`, `size-10` dưới `sm` (vùng chạm ≥ 40px). Khoảng cách `gap-1`.

### Bố cục

| Bề rộng | Bố cục |
|---------|--------|
| 1280 | Một hàng, cao ~44px: `[select] [‹] [1][2][3][4][5][◆] [›] [Tiếp tục →] ····· [Tuyến 3/8] [Xem bản đồ]` |
| 820 | Hai hàng: `[select] [‹] [nút việc] [›] [Tiếp tục →]` / `····· [Tuyến 3/8] [Xem bản đồ]` (`flex-wrap`, nhóm tuyến `ml-auto`) |
| 375 | Hàng 1: `[select flex-1] [nút icon map]` (chữ "Xem bản đồ" `sr-only`, `aria-label` giữ). Hàng 2: `[‹] [nút việc] [›]` căn giữa. Hàng 3: `[Tiếp tục →]` full width, chỉ khi hiện. Chữ "Tuyến n/total" ẩn (`max-sm:hidden`), có trong dialog. |

Mỗi nhóm `shrink-0`; chỉ `select` được co (`min-w-0 max-w-[16rem] truncate`). Không cuộn ngang trang; chương nhiều việc nhất hiện có 7 việc (7 × 44px dưới `sm` vừa 343px).

### Xem lại việc đã xong (đã có sẵn — chỉ ghi lại, không làm mới)
- `isClosed(id)` (`src/session.ts`): ẩn Nộp, hiện Recap (SQL đã chấm `graded` cạnh lời giải mẫu). Brief bỏ thẻ "Kết quả mong đợi" và nút gợi ý.
- **Chạy** vẫn được (Result/ER/Thứ tự thực thi/EXPLAIN dùng bình thường). **Không** XP, không hoàn thành lại: `complete()` (`main.ts`) đã `return` sớm khi id đã có trong `completed`; không có nút Nộp nên không tới đó.
- Bản nháp: sửa trong editor vẫn ghi `save.drafts[stepKey]` như hiện tại (Recap đọc `graded` trước, nên không mất bài đã chấm). Không đổi Save, không bump `SAVE_VERSION`.
- Việc đánh giá (nhiều bước) đã xong mở ở bước 1 (`resumeStep` trả 0); Recap hiện SQL của mọi bước. Không thêm bộ chọn bước.
- Tiến trình story không đổi: `nextTicket`, Hộp thư, Trang chủ "Tiếp tục" vẫn trỏ việc đầu tiên chưa xong. Nút "Luyện lại" (`startRetry`, `modes.ts`) giữ nguyên dưới Recap.
- Nút "Ticket tiếp theo →" ở cuối Recap (`brief.ts`) **giữ** (người đọc hết Recap bấm luôn); thanh trên là chỗ chính.

### Luyện tập / Sandbox
Thanh ẩn (giữ quy tắc `!isStory()`): `selectTicket()` ép về story và bỏ lượt luyện tập, nên không được có nút nào gọi nó trong hai chế độ này. Nav "Làm việc" vẫn là đường quay về story.

### Focus, bàn phím, a11y
- Sau khi nộp đúng: focus vẫn vào `.recap h3` (giữ — người dùng trình đọc màn hình nghe Recap trước). Thêm câu vào `#announce`: "Đã xong. Nút Việc tiếp theo ở thanh điều hướng phía trên." (`nav.nextReady`).
- Chọn việc khác (nút/‹›/select/Tiếp tục): `selectTicket()` đã đưa focus tới `#brief-title`. Không đổi.
- Thứ tự Tab: select → ‹ → nút việc → › → Tiếp tục → Xem bản đồ. Không phím tắt mới (L11).
- Màu không là tín hiệu duy nhất: xong có icon `check`, chưa mở có icon `lock`, đang mở có gạch dưới + `aria-current`.

### Module đổi
- `src/ui/mapStrip.ts`: viết lại thành thanh trên (giữ tên file và `createMapStrip(host)`; `update(view)` nhận thêm `selectedId`, `next?: Ticket`). Nút gọi `actions.selectTicket`. Vẽ lại toàn bộ trong `update()` (rẻ, không đụng editor). Nếu focus đang nằm trong thanh trước khi vẽ lại, trả focus về phần tử cùng `data-nav` id sau khi vẽ.
- `src/viz/progressDots.ts`: giữ; thêm `navTargets(tickets, completed, selectedId)` → `{ prev?, next?, resume? }` (thuần, có test).
- `main.ts` `syncMap()`: truyền thêm `selectedId`, `next`.
- `src/i18n/vi.ts`, `en.ts`: key ở cuối spec.

---

## 3. Bản đồ tuyến xem tại chỗ

| | |
|---|---|
| Hành vi | Nút "Xem bản đồ" (§2) mở `<dialog id="map-dialog">` modal (`showModal()`); không đổi route, không rời việc, editor và kết quả giữ nguyên. Đóng: nút "Đóng", Esc (native), bấm nền (`click` trên chính `<dialog>`). Focus trả về nút mở (native). |
| Nội dung | Tiêu đề "Tuyến tàu từ Tiên Sa" (`routes.title`) + phụ đề (`routes.subtitle`); `routeMap(derive(app.tickets, done())).svg` (`src/ui/routeMap.ts`); **luôn** có danh sách `routeItems()` dạng HTML bên dưới (trong dialog bề rộng < 937px nên nhãn SVG nhỏ/ẩn theo `max-lg:`; danh sách là bản đọc được). Dòng "Tuyến đã mở n/total". Không vẽ tàu chạy (không animation trong dialog). |
| Bố cục | `index.html`, cuối `body` cạnh các dialog khác. 1280 / 820: giữa màn hình, `w-[min(960px,calc(100vw-2rem))] max-h-[calc(100dvh-4rem)] overflow-auto rounded-2xl bg-panel p-5 ring-1 ring-line`. 375: bottom sheet như Sổ tay (`max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:max-h-[85dvh] max-sm:rounded-b-none`). Nền `::backdrop` `bg-black/40`. |
| Trạng thái | Không cần DB (derive từ save) → không có loading/lỗi. 0 tuyến mở: bản đồ toàn nét đứt + danh sách "chưa mở" (đã có trong `routeItems`). |
| i18n / theme | Dựng nội dung **mỗi lần mở** và mỗi lần `rerender()` khi `dialog.open` (đổi ngôn ngữ/tiến độ khi đang mở → vẽ lại). SVG dùng class `dark:` nên theme tự theo. |
| a11y | `aria-labelledby` = tiêu đề; SVG `role=img` + `aria-label` (đã có trong `paintRoutes`). |
| Chỗ cho mục 8 | Dialog này là nơi sau này hiện thông tin nghiệp vụ của tuyến (hàng hóa, quãng đường…) khi Product chốt. Hiện **không** thêm gì. |
| Module | `src/ui/mapStrip.ts` (nút + mở dialog + vẽ nội dung), `index.html` (thêm `<dialog>`), `main.ts` không đổi ngoài `syncMap`. Trang chủ giữ section bản đồ như cũ. |

---

## 4. ER + cột của các bảng liên quan tới việc đang mở

### Thuật toán `relatedTables` (`src/viz/erd.ts`, hàm thuần)

```ts
export interface Related { tables: string[]; dropped: string[] }
export function relatedTables(core: string[], unlocked: string[], cons: ErConstraint[], max = 10): Related
```

1. `U` = `unlocked` (bảng đã mở theo `CHAPTER_TABLES`). `core` = `ticket.tables ∩ U`, giữ thứ tự frontmatter.
2. Cạnh cha: mỗi `ErConstraint` `kind === 'FOREIGN KEY'` với `refTable` ∈ U, **bỏ** cạnh tự tham chiếu (`employees.manager_id`, `customs_declarations.amended_from_id`).
3. **Cầu nối**: nếu `core` không liên thông trong đồ thị con của nó (coi cạnh vô hướng), thêm các bảng trên đường ngắn nhất (BFS vô hướng trong U) nối các thành phần, theo thứ tự `core`. Hiện mọi ticket đã liên thông; bước này cho nội dung sau.
4. **Bảng cha**: từ `core` + cầu nối, đi **con → cha** theo FK, không giới hạn độ sâu, có tập `visited` (không lặp, chịu được chu trình). **Không** đi cha → con (`shipments` có ~12 bảng con, làm nổ sơ đồ).
5. **Giới hạn** `max = 10` bảng. `core` + cầu nối không bao giờ bị cắt. Nếu vượt, bỏ bảng cha theo thứ tự: ít bảng trong tập tham chiếu tới nó nhất trước, rồi theo tên; tên bị bỏ trả trong `dropped`.
6. Thứ tự trả về: `core`, cầu nối, bảng cha theo tên.

Số đo trên 100% ticket hiện có (`tables:` của từng ticket, U theo chương của ticket): độ sâu 1 trung bình 5,4 bảng, không giới hạn độ sâu trung bình 6,0 — gần như không thêm, nên không cần giới hạn độ sâu. Vượt 10: ch12-06 (10 bảng trong `tables`, 2 bảng cha bị bỏ). Ví dụ việc container ch10-04 (`container_events, containers, shipments, customers, free_time_terms`) → thêm `ports, carriers, employees` = 8 bảng. FK `container_events → containers` được seed thêm bằng `ALTER TABLE` (`seed.sql:572`) nên có trong `information_schema`.

Test `tests/erd.test.ts`: chuỗi con→cha, tự tham chiếu không lặp, cầu nối, cắt ở `max` + `dropped`, bảng chưa mở không bao giờ xuất hiện.

### Không lộ đáp án
Danh sách hiện **ngang hàng**, không đánh dấu bảng nào thuộc `ticket.tables` (lời giải) và bảng nào là bảng cha thêm vào. Chỉ đánh dấu (viền đậm màu chương, như L36) các bảng **query vừa chạy** dùng (`tablesInQuery`). Trong brief, tên bảng xếp theo ABC.

### Chỗ hiện

**a) Tab "Sơ đồ ER" (panel dưới, `src/ui/vizTabs.ts`)** — không cần chạy query trước (như hiện tại).
- Có ticket (`activeTicket()`, `src/session.ts` — story và Luyện tập): mặc định phạm vi **"Liên quan"** = `relatedTables(...)`. Công tắc 2 nút `aria-pressed` ở đầu tab: "Liên quan đến việc này" | "Tất cả bảng đã mở". Trạng thái giữ trong bộ nhớ (`app.schemaScope: 'task' | 'all'`, không lưu Save, mặc định `'task'`).
- Sandbox (không ticket): như hiện tại, mọi bảng (`visibleTables()`, kèm bảng import), không công tắc.
- `dropped` khác rỗng: dòng `text-sm text-muted` "Ẩn bớt {n} bảng: {list}." (`erd.dropped`).
- Cuối tab: link "Xem toàn bộ cấu trúc ở trang Dữ liệu →" tới `#/data/{bảng đầu tiên}`.
- Theme: giữ listener `THEME_EVENT` vẽ lại.

**b) Tab "Cột"**: chuyển đăng ký từ `src/ui/tabs.ts` (`schemaList`) sang `vizTabs.ts`, cùng phạm vi và công tắc với ER (một `app.schemaScope`). Mỗi bảng: tên, rồi từng cột `code` + kiểu + badge `PK` / `UK` / `FK → shipments.id`. Cần FK nên render qua `load()` (dòng "Đang đọc cấu trúc…" → nội dung / `errorView`).

**c) Brief (`src/ui/brief.ts`)**: một dòng dưới thẻ "Việc cần làm" (hoặc dưới thân tin nhắn nếu không có `## Task`): "Bảng liên quan:" + chip tên bảng (`code`, xếp ABC). Bấm chip → mở tab ER (`actions.showTab('erd')`, action mới trong `state.ts`, `main.ts` gán `panel.show`). Không vẽ Mermaid trong khung trái (hẹp, chunk Mermaid lazy). Việc "lab" chương 11 cũng hiện dòng này. Trước khi có FK (`erMeta` chưa xong) chỉ hiện `core` (ABC); khi xong thì thay nội dung riêng dòng chip (không gọi `rerender()`).

### Dữ liệu dùng chung
- Đưa memo `erMetadata` ra khỏi `registerErdTab`: `export const erMeta = memoByKey((schema) => loadErMetadata(app.run, schema))` trong `src/state.ts` (vẫn vào `dataCaches`, `clearMemos()` xóa được). ER tab, Cột, brief và trang Dữ liệu cùng dùng.
- `erConstraintsSql` thêm `ccu.column_name AS ref_column`; `ErConstraint` thêm `refColumn: string | null` (cần cho `FK → shipments.id`).
- `erDefinition` thêm tham số tùy chọn `detail?: Set<string>`: chỉ ghi khối cột cho bảng trong `detail` (mặc định: mọi bảng). Bảng ngoài `detail` vẫn xuất hiện qua quan hệ, là hộp chỉ có tên. Dùng ở §5.

### Trạng thái
| Trạng thái | Hiện |
|-----------|------|
| DB đang tải | "Đang đọc cấu trúc…" (truy vấn xếp hàng trong `DbClient` tới khi DB sẵn sàng) |
| Lỗi metadata | `errorView(e)`; mở lại tab là thử lại (memo bỏ promise lỗi) |
| Chunk Mermaid lỗi | `errorView` trong vùng sơ đồ; tab Cột vẫn dùng được |
| Ticket không có `tables` | Phạm vi "Liên quan" rỗng → tự hiện "Tất cả bảng đã mở", ẩn công tắc |

---

## 5. Trang "Dữ liệu" (`#/data`)

### Route và nav
- `src/route.ts`: `ROUTES = ['home', 'play', 'data']`, `HASH.data = '#/data'`. Bảng chọn nằm trong hash: `#/data/containers`. Thêm `dataTableOf(hash): string | undefined` (phần sau `#/data/`, chỉ nhận `/^[a-z_][a-z0-9_]*$/`; tên không phải bảng đã mở → bỏ qua, chọn bảng đầu tiên).
- `src/ui/router.ts`: `startRouter` chỉ `replaceState` khi hash rỗng hoặc route đọc được khác `first` (để tải lại `#/data/ports` không mất `/ports`). `ROUTE_KEY` chỉ nhớ `'data'`.
- `index.html`: `<main id="data" … hidden data-i18n-aria="nav.data">` giữa `#home` và `#shell`, cùng class cuộn như `#home`.
- `main.ts` `showRoute`: `byId('data').hidden = r !== 'data'`; `leftHome()` như route khác; focus `#data-title` khi không phải lần đầu. `rerender()`: nếu `#data` đang hiện → `renderData()`.
- Nav: `registerNav({ id: 'data', order: 50, label: 'nav.data', href: hashOf('data'), current: (r) => r === 'data' })` (đặt trong `src/ui/dataView.ts`). Thứ tự: Trang chủ 10, Làm việc 20, Luyện tập 30, Sandbox 40, **Dữ liệu 50**; **60 để dành** cho tab Bảng điều hành (mục 7, chưa làm).
- `#nav` dưới `md`: đổi `grid-cols-4` → `grid-cols-3` (5 mục = 3 + 2; 6 mục sau này = 3 + 3; nhãn `text-sm` vừa ô ~110px ở 375). Từ `md` giữ `flex`. Ở 1280 topbar vẫn một hàng (nhãn thương hiệu/hành động đã `sr-only` ở `xl:max-2xl`), ước ~1.080px ≤ 1.248px.

### Bố cục

| Bề rộng | Bố cục |
|---------|--------|
| 1280 | `max-w-6xl mx-auto px-4 py-6`, lưới `lg:grid-cols-[18rem_1fr] gap-5`. Trái (sticky `top-4`): ô tìm + danh sách bảng. Phải: chi tiết bảng, rồi sơ đồ. |
| 820 | Một cột: ô tìm; danh sách bảng `max-h-64 overflow-auto` dạng lưới 2 cột; chi tiết; sơ đồ. |
| 375 | Một cột như 820, danh sách 1 cột. Bảng cột của chi tiết thành danh sách xếp chồng (tên đậm, dòng dưới: kiểu · NULL · badge). Sơ đồ trong khung `overflow-auto` (như ER tab). |

### Thành phần

1. **Tiêu đề** `h1#data-title` "Cấu trúc dữ liệu" + mô tả ngắn "Các bảng của Cargo Query bạn đã được mở, cột và quan hệ giữa chúng."
2. **Tìm** `<input type="search">` (label thấy được "Tìm bảng hoặc cột"). Lọc theo chuỗi con, không phân biệt hoa thường, trên tên bảng **và** tên cột. Bảng khớp theo cột hiện thêm dòng "khớp: `col1`, `col2`". Kết quả đếm vào vùng `aria-live="polite"` ("{n} bảng khớp"). Esc xóa (native). Không phím tắt toàn cục.
3. **Danh sách bảng**, nhóm theo chương mở (`CHAPTER_TABLES`): tiêu đề nhóm "Chương 2 · {tên}"; mỗi bảng là `<a href="#/data/{t}">` (Back/Forward chạy giữa các bảng) với tên `code`, "{rows} dòng · {cols} cột", `aria-current="page"` cho bảng đang chọn.
   **Bảng chưa mở**: hiện mờ ở cuối, trong `<details>` "Chưa mở ({n} bảng)": chỉ tên + "Mở ở chương N", không cột, không chọn được. Lý do: người chơi thấy còn gì phía trước (giống chương khóa ở Trang chủ) mà không lộ cấu trúc; autocomplete vẫn chỉ có bảng đã mở (spec §4).
4. **Chi tiết bảng chọn**:
   - Tiêu đề `h2` tên bảng; dòng phụ "{rows} dòng · {cols} cột · mở ở chương N".
   - Bảng cột: `#` | Cột | Kiểu | Cho phép NULL | Khóa. Khóa: badge `PK`, `UK`, và `FK →` + **nút** `shipments.id` nhảy sang bảng đó (đổi hash). FK tới bảng chưa mở: chữ mờ "bảng chưa mở", không nút. Cột khớp từ khóa tìm: `<mark>`.
   - "Được tham chiếu bởi": danh sách nút `containers.shipment_id` (bảng con đã mở).
   - Nút "Xem 5 dòng mẫu": chạy `SELECT * FROM {t} LIMIT 5` qua `app.run` (tên đã kiểm bằng IDENT + có trong danh sách đã mở), hiện bằng `renderResult`. Chỉ chạy khi bấm.
5. **Sơ đồ ER** (Mermaid qua `erdSvg`/`drawErd`, `src/ui/erdView.ts`): công tắc "Quanh bảng này" | "Tất cả bảng đã mở".
   - "Quanh bảng này" (mặc định): bảng chọn + bảng cha + bảng con trực tiếp đã mở; `detail` = chỉ bảng chọn (các bảng khác là hộp tên) để sơ đồ gọn (vd. `shipments` có ~16 hàng xóm). Bảng chọn viền đậm màu `--accent` (hex của chương mở bảng đó).
   - "Tất cả": mọi bảng đã mở, đầy đủ cột (như ER tab cũ).
   - Mermaid chạy `securityLevel: 'strict'` nên **không** bấm được trên sơ đồ; mọi tương tác ở danh sách/nút HTML, sơ đồ vẽ lại theo bảng chọn.
   - Vẽ lại khi `THEME_EVENT` nếu trang đang hiện.

### Số dòng
Một truy vấn, memo theo danh sách bảng đã mở: `SELECT 'ports' AS t, count(*) FROM ports UNION ALL …` (tên lấy từ `CHAPTER_TABLES`, kiểm IDENT). Không dùng `reltuples` (seed chỉ `ANALYZE` vài bảng). Đếm chính xác ~25 bảng (lớn nhất `container_events` ~145k) dưới 5 s. Thêm `erRowCountsSql(tables)` vào `src/viz/erd.ts`.

### Trạng thái

| Trạng thái | Hiện |
|-----------|------|
| DB đang tải (10–11 s lúc mở trang) | Danh sách bảng hiện ngay từ `CHAPTER_TABLES` (tên, không số); số dòng/cột và chi tiết: "Đang mở database…" |
| Lỗi metadata / số dòng | `errorView(e)` + nút "Thử lại" (gọi lại render; memo đã bỏ promise lỗi). Lỗi số dòng không chặn phần còn lại: số hiện "—". |
| Tìm không khớp | "Không có bảng hay cột nào khớp “{q}”." |
| Chưa chọn bảng / hash sai | Chọn bảng đầu tiên của chương 1 (`ports`), `replaceState` hash. |
| Save mới (chương 1) | Chỉ 5 bảng chương 1; còn lại trong "Chưa mở". |

### Trạng thái trong module
`src/ui/dataView.ts` (file mới) giữ `{ query, scope }` ở biến module (không lưu, không vào Save). `renderData()` vẽ lại từ đó; khi vẽ lại lúc ô tìm đang focus (đổi ngôn ngữ), trả focus + vị trí con trỏ về ô tìm. Gõ vào ô tìm chỉ vẽ lại danh sách + mark, không vẽ lại sơ đồ.

### Quan hệ với tab ER trong Làm việc
Tab ER/Cột ở panel = **theo việc đang mở** (§4), không rời bài. Trang Dữ liệu = **tra cứu toàn DB**. Chung metadata (`erMeta`), chung `erDefinition`. Link một chiều: tab ER → trang Dữ liệu. Từ trang Dữ liệu về bài: nav "Làm việc" (shell chỉ bị ẩn, editor còn nguyên).

---

## 6. Card chương ở Trang chủ: bố cục cố định

Hiện tại `article` dùng `space-y-2` và các dòng tùy chọn (kỹ năng, review, gợi ý mở) nên nút/khối dưới lệch theo độ dài nội dung.

| Vùng (trên → dưới) | Quy tắc |
|-------------------|---------|
| Khung | `flex h-full flex-col items-center gap-2 text-center` (ô lưới đã `stretch`, card cao bằng nhau mỗi hàng). |
| Vòng số / khóa | giữ `size-12`. |
| Tiêu đề | `line-clamp-2`, từ `sm`: `sm:min-h-14` (2 dòng `text-xl`). `title` = tên đầy đủ. |
| Kỹ năng | Danh sách **một kỹ năng mỗi dòng**, căn trái trong khối giữa (`w-full max-w-[14rem] text-left`), mỗi dòng `flex items-center gap-1.5` + `truncate` (tên đầy đủ trong `title`). Từ `sm`: chiều cao cố định `sm:h-24` (4 dòng × 1.5rem; hiện tối đa 4 kỹ năng/chương, `SKILL_ROW = 4` giữ, quá 4 thì dòng thứ 4 là "+n"). Chương không kỹ năng: khối trống cùng chiều cao (giữ chỗ). |
| Chân (ghim đáy) | Một khối `mt-auto flex w-full flex-col items-center gap-1.5`: badge trạng thái, dòng "Sau đánh giá: {career}" (`line-clamp-2`), dòng đánh giá thăng tiến khi xong (`line-clamp-2`), nhãn "Để mở…" khi khóa. |

Bố cục lưới giữ: 1 cột (375), 2 cột (820), 4 cột (1280). Chiều cao cố định chỉ từ `sm` (dưới `sm` một cột, không cần thẳng hàng). Không đổi màu, icon, chữ. Module: `src/ui/homeView.ts` (`chapterCard`, `skillRow`).

---

## i18n mới (VI / EN)

| Key | VI | EN |
|-----|----|----|
| `nav.data` | Dữ liệu | Data |
| `nav.tasks` | Điều hướng việc | Task navigation |
| `nav.chapter` | Chương | Chapter |
| `nav.chapterOption` | Chương {n} · {title} | Chapter {n} · {title} |
| `nav.chapterLocked` | (chưa mở) | (locked) |
| `nav.prev` | Việc trước: {title} | Previous task: {title} |
| `nav.next` | Việc sau: {title} | Next task: {title} |
| `nav.task` | {n}. {title} · {state} | {n}. {title} · {state} |
| `nav.taskLocked` | Chưa mở | Locked |
| `nav.continueNext` | Việc tiếp theo → | Next task → |
| `nav.continueBack` | Về việc đang làm → | Back to current task → |
| `nav.nextReady` | Đã xong. Nút Việc tiếp theo ở thanh điều hướng phía trên. | Done. The Next task button is in the navigation bar at the top. |
| `map.see` | Xem bản đồ | See the map |
| `map.dialog` | Bản đồ tuyến | Route map |
| `erd.scopeTask` | Liên quan đến việc này | Related to this task |
| `erd.scopeAll` | Tất cả bảng đã mở | All unlocked tables |
| `erd.scope` | Phạm vi sơ đồ | Diagram scope |
| `erd.dropped` | Ẩn bớt {n} bảng: {list}. | {n} more tables hidden: {list}. (hàm số nhiều) |
| `erd.toData` | Xem toàn bộ cấu trúc ở trang Dữ liệu → | See the full structure on the Data page → |
| `erd.reading` | Đang đọc cấu trúc… | Reading the structure… |
| `brief.related` | Bảng liên quan: | Related tables: |
| `data.title` | Cấu trúc dữ liệu | Data structure |
| `data.intro` | Các bảng của Cargo Query bạn đã được mở, cột và quan hệ giữa chúng. | The Cargo Query tables you have unlocked, their columns and how they link. |
| `data.search` | Tìm bảng hoặc cột | Search tables or columns |
| `data.matches` | {n} bảng khớp | {n} matching tables (hàm số nhiều) |
| `data.none` | Không có bảng hay cột nào khớp “{q}”. | No table or column matches “{q}”. |
| `data.matchCols` | khớp: | matches: |
| `data.tableMeta` | {rows} dòng · {cols} cột | {rows} rows · {cols} columns (hàm số nhiều) |
| `data.openedAt` | mở ở chương {n} | unlocked in chapter {n} |
| `data.lockedGroup` | Chưa mở ({n} bảng) | Locked ({n} tables) (hàm số nhiều) |
| `data.lockedAt` | Mở ở chương {n} | Unlocks in chapter {n} |
| `data.col.name` / `.type` / `.null` / `.key` | Cột / Kiểu / Cho phép NULL / Khóa | Column / Type / Nullable / Key |
| `data.refBy` | Được tham chiếu bởi | Referenced by |
| `data.refLocked` | bảng chưa mở | locked table |
| `data.sample` | Xem 5 dòng mẫu | Show 5 sample rows |
| `data.scopeNear` | Quanh bảng này | Around this table |
| `data.loading` | Đang mở database… | Opening the database… |
| `data.retry` | Thử lại | Try again |

Sửa: `map.strip` → "Điều hướng việc" / "Task navigation" (hoặc bỏ, dùng `nav.tasks`). **Xóa**: `steps.unused`, `map.toHome` (thay bằng `map.see`). Tên bảng/cột/kiểu không dịch. `tests/i18n.test.ts` phải xanh (EN khác VI; `nav.task` giống nhau về chữ → thêm vào `SAME_OK`).

## Test cần thêm

- `tests/erd.test.ts`: `relatedTables` (§4), `refColumn` có trong `toErConstraints`, `erDefinition` với `detail`, `erRowCountsSql` từ chối tên không hợp lệ.
- `tests/progressDots.test.ts` (hoặc file sẵn có): `navTargets` — prev/next vượt chương, việc chưa mở không phải đích, `resume` khi đang xem việc cũ, hết việc → không `resume`.
- `tests/route.test.ts`: `#/data`, `#/data/ports` → route `data`, `dataTableOf` từ chối `#/data/x;drop`.
- Tab Thứ tự thực thi: không thẻ cho bước `skipped` (§1).
- Chạy `npx tsc --noEmit` và `npm test`; đo lại gzip main (thêm `dataView.ts` ~ vài KB; vẫn trong ngân sách L41/L43).

## Việc kèm theo (không thuộc commit spec này)

- `CLAUDE.md`: thêm `ui/dataView.ts` vào danh sách module, route `#/data`, `erMeta` trong `state.ts`, `#map` là thanh điều hướng việc.
- `decision-log.md`: dòng mới chốt v4 khi team duyệt (sửa L35/L37 về dải bản đồ).

## Không làm (YAGNI)

Không hash cho ticket (`#/play/ch3-02`); không bộ chọn bước cho việc đánh giá đã xong; không phím tắt mới; không bấm trên sơ đồ Mermaid (strict); không kéo/zoom sơ đồ (khung cuộn là đủ); không hiện bảng import của Sandbox ở trang Dữ liệu; không đánh dấu bảng "cần dùng" cho việc; không làm mục 7–8 (chờ Product + user duyệt).
