# Lily lớn lên như nuôi thú cưng (đề xuất thiết kế)

Ngày 2026-11-19. Vai trò: Product Design + UI/UX. **Chỉ là đề xuất**, chưa có code. Các quyết định chờ user ở §6 (P-L1…).

Yêu cầu của user: "Lily được định danh chó nhỏ lớn lên -> Bạn define thêm kích thước và kiểu. Để cho người dùng cảm giác chú chó
của mình đang lớn. giống nuôi pet".

## 0. Hiện trạng (đã đọc code) và vấn đề

- `src/lily.ts`: 4 giai đoạn theo số kỹ năng đã học (`knownSkills`, General = Logistics), `STAGE_AT = [0, 3, 10, 25]`, hoặc đủ
  mọi kỹ năng thì lên 3. Tên: Cún con / Cún nhỏ / Trưởng thành / Chuyên gia (EN Puppy / Young pup / Grown-up / Expert).
- `src/style.css` (dòng ~253–294): giai đoạn chỉ khác nhau ở `--lily-size` 0.8 / 0.9 / 1 / 1 và bật tắt khăn, sao, laptop
  (`--lily-scarf-on`, `--lily-badge-on`, `--lily-prop-on`, có `@property`). Khoảnh khắc lớn: `cq-grow`, `cq-grow1..3` (CSS) và
  `growLily()` (`src/ui/celebrate.ts`, GSAP, `SIZE = [0.8, 0.9, 1, 1]`, khăn DrawSVG, sao MorphSVG, laptop trượt vào).
- Rig: các phần `<g id="lily-…">` trong `#mascot-sprite` (`index.html`), `RIG.lily` có 6 tư thế (`src/ui/mascots.ts`). Phần của
  Lily chiếm ~9,2 KB thô trong sprite (sprite 19,8 KB thô, 4,0 KB gz). Budget `html` 12 KB gz, đang 9,1 KB: còn ~2,9 KB gz.
- Cỡ Lily đang vẽ: 32 px (dòng phản hồi `work.ts` `size-8`), 48 px (`size-12`), 56 px (dock `size-14`), 64 px (wrap-up chương,
  trạng thái trống `size-16`), 80 px (lời chào Trang chủ `size-20`), cảnh dạy học.
- Nhịp kỹ năng Logistics (cộng dồn `grants` theo chương): ch1 4, ch2 7, ch3 11, ch4 14, ch5 18, ch6 22, ch7 26, ch8 29, ch9 32,
  ch10 35, ch11 38, ch12 38.

**Vấn đề**: cùng một con chó phóng to 20%. Người chơi không thấy "chó của mình lớn": đầu, tai, chân, đuôi, đốm, dáng đứng không
đổi. Giữa 10 và 24 kỹ năng (ch3 → ch7, ~4 chương) Lily không đổi gì.

## 1. Bảng giai đoạn (đề xuất: 6 giai đoạn)

### 1.1 Ngưỡng

`STAGE_AT = [0, 1, 3, 10, 18, 25]` (đủ mọi kỹ năng cũng lên 5, như hôm nay).

| # | VI | EN | Kỹ năng | Đạt quanh | Lý do |
|---|----|----|---------|-----------|-------|
| 0 | Sơ sinh | Newborn | 0 | trước việc đầu tiên | "Lily vừa về nhà bạn". Rất ngắn: xong việc đầu tiên là lớn lần đầu (móc câu sớm). |
| 1 | Cún con | Puppy | 1–2 | ch1 | Giữ tên cũ ở cùng số kỹ năng. |
| 2 | Cún nhỏ | Young pup | 3–9 | ch1 cuối → ch3 | Giữ ngưỡng 3 và tên cũ. Dáng "tuổi dậy thì": chân dài, bàn chân to, tai to. |
| 3 | Trưởng thành | Grown-up | 10–17 | ch3 → ch5 | Giữ ngưỡng 10 và tên cũ. Chó trưởng thành thon gọn. |
| 4 | Dày dạn | Seasoned | 18–24 | ch5 → ch7 | **Mới**: chia khoảng 10–24 (15 kỹ năng không đổi gì hôm nay). Ngực nở, đuôi dài, đủ đốm. |
| 5 | Chuyên gia | Expert | 25+ hoặc đủ hết | ch7+ | Giữ ngưỡng 25 và tên cũ. |

Luật chọn ngưỡng: **giữ nguyên 3 mốc cũ (3, 10, 25)** và chỉ chèn mốc mới (1, 18). Nhờ vậy không ai thấy tên giai đoạn của mình
"tụt" khi cập nhật (trừ k = 0, xem §5.3). Khoảng cách: 1, 2, 7, 8, 7 kỹ năng: hai lần lớn đầu rất nhanh (nuôi pet cần cảm giác
"nó lớn rồi!" trong buổi đầu), sau đó đều đặn ~2 chương một lần.

### 1.2 Hình dáng từng giai đoạn

Đơn vị hình theo viewBox 120 (đứng trên đường chân y = 112). Cao hình ≈ 97 đơn vị × `--lily-size`. Cột px là chiều cao Lily thật
sự (không phải hộp): Trang chủ với hộp mới 96 px (đề xuất P-L5), dock hộp 56 px.

| | 0 Sơ sinh | 1 Cún con | 2 Cún nhỏ | 3 Trưởng thành | 4 Dày dạn | 5 Chuyên gia |
|---|---|---|---|---|---|---|
| `--lily-size` | 0.80 | 0.84 | 0.92 | 1.00 | 1.05 | 1.08 |
| Cao hình (đơn vị, trước `--lily-size`; §5.3) | 97 | 98 | 101 | 98 | 98 | 98 |
| Cao ở Trang chủ (hộp 96) | 62 px | 66 px | 74 px | 78 px | 82 px | 85 px |
| Cao ở dock (hộp 56) | 36 px | 38 px | 43 px | 46 px | 48 px | 49 px |
| Đầu : thân (cao) | 1 : 0,7 (đầu rất to, "hạt đậu") | 1 : 0,8 | 1 : 0,95 | 1 : 1,05 | 1 : 1,1 | 1 : 1,1 |
| `--lily-head` (scale đầu quanh cổ 60 72) | 1.00 | 1.00 | 0.96 | 0.92 | 0.90 | 0.90 |
| Chân trước (`--lily-lift`, đơn vị nâng thân) | 0 (ngồi bệt, chân ngắn) | 1 | 6 (chân dài lêu nghêu) | 5 | 6 | 6 |
| Bàn chân (`--lily-paw`) | 0.85 | 1.0 | 1.2 (to so với người: dấu hiệu chó sẽ còn lớn) | 1.0 | 1.05 | 1.05 |
| Tai (`--lily-ear`, `--lily-ear-tilt`) | 0.75, cụp sát má, 0° | 1.15, to, xòe ra ngoài 8° | 1.1, to, hơi xòe 4° | 1.0, gọn 0° | 0.95, cao hơn, nghiêng vào −3° | như 4 |
| Đuôi (`--lily-tail`) | 0.55, cụt | 0.75 | 1.0 | 1.05 | 1.15, cong cao | 1.15 |
| Thân ngang (`--lily-chest`) | 0.92, tròn | 0.95 | 0.92, gầy | 1.0 | 1.06, ngực nở | 1.06 |
| Đốm | **không đốm** (chỉ tai đen) | 3 đốm nhạt (opacity .5) | bậc 1 đủ (4 đốm) | bậc 1 + 2 (8 đốm) | bậc 1 + 2 + 3 (11 đốm) | như 4 |
| Mắt | **nhắm** (dùng hình `eyes-happy`) ở tư thế đứng yên | mở, to (scale 1.1) | mở, 1.0 | 1.0 | 1.0 | 1.0 |
| Dáng / idle | ngồi bệt, đầu lắc lư chậm (`cq-bob` chậm hơn) | ngồi, vẫy đuôi nhanh | đứng, vẫy đuôi | đứng thẳng | đứng thẳng, ngực ưỡn | đứng, laptop bên cạnh |
| Phụ kiện | không | **vòng cổ + chuông nhỏ** (mới) | vòng cổ → **khăn** (như hôm nay) | khăn + **sao** (như hôm nay) | khăn + sao + **đai yên ngực** (mới) | + **laptop** (như hôm nay) |
| Dấu hiệu còn đọc được ở 32 px | nhỏ nhất, mắt nhắm, trắng trơn | chấm vòng cổ màu | khăn màu, bàn chân to | ngôi sao | dải đai ngang ngực (dày 6 đơn vị) | laptop |

Cỡ trên 1 vẫn nằm trong viewBox 120 (scale quanh 60 116, đã tính trên tọa độ sprite): ở 1.08 đỉnh tai ~y 14,5, khi cheer nhảy
−10 còn ~y 3,7; lấp lánh trái x ~4 / trên y ~9; dấu hỏi y ~3. Riêng laptop (x 5) ra x −0,4 ở 1.10, nên chốt 1.08 và dời laptop
vào 2 đơn vị (x 7) khi sửa sprite. Không bật `overflow: visible` (dock và dòng phản hồi có thể tràn).

Ghi chú giống chó (kiến thức phổ biến, **chưa tra nguồn trong phiên này**, kiểm lại khi vẽ): chó đốm Dalmatian sinh ra trắng trơn,
đốm hiện dần từ khoảng tuần thứ 2 và đậm thêm theo tháng, nên số đốm là một tiến trình miễn phí và đúng thật. Tai Dalmatian **cụp cả đời**, nên không làm tai dựng (sẽ thành giống chó khác); tai
đổi bằng cỡ và góc: cún con tai to so với đầu và xòe, chó lớn tai gọn và đặt cao hơn. Tai đen giữ ở mọi giai đoạn: đó là dấu hiệu
nhận ra Lily ở 32 px.

### 1.3 Phác thảo (bóng, cùng đường chân)

```
                                                                         ,-.         ,-.
                                              ,-.         ,-.          ( o o)      ( o o)
                                 ,-.        ( o o)      ( o o)          \ ^ /  ★    \ ^ /  ★
                    ,-.        (( o o))      \ ^ /  ~     \ ^/  ★      [=====]~~   [=====]~~
         ,--.     (( o o ))     \ v /       {|   |}~      |    |~~      |    |       |    |  ___
        ((- -))    \ v /o      (|  |)~      |    |       |    |        |    |       |    | |___|
        (____)~    (____)~      || ||        ||  ||       ||  ||        ||  ||       ||  ||  /__/
      ==========================================================================================
        Sơ sinh    Cún con      Cún nhỏ      Trưởng      Dày dạn               Chuyên gia
        0          1–2          3–9          thành 10–17 18–24                 25+
        mắt nhắm,  vòng cổ o,   chân dài,    thon, sao   ngực nở, đai [===],   + laptop
        không đốm  tai to xòe   bàn chân to,                đuôi cong cao
                                khăn {  }
```

Bản vẽ thật làm trong prototype SVG trước khi chốt (§2.4).

## 2. Rig: vẽ mới hay biến hình phần có sẵn

### 2.1 Cách chọn giai đoạn: biến CSS kế thừa (như hôm nay), không đổi `RIG`

CSS không chọn được phần tử bên trong `<use>`; chỉ biến CSS kế thừa đi qua được (khăn đang bật tắt bằng
`style="opacity:var(--lily-scarf-on)"`). Đề xuất giữ đúng cơ chế đó cho mọi tỉ lệ:

- Bản gốc trong sprite có thêm **một nhóm bọc bên trong** mỗi phần, mang `style="transform: … var(--lily-…)"` với tâm cố định.
  Ví dụ `<g id="lily-head"><g style="transform:translateY(calc(var(--lily-lift)*-1px)) scale(var(--lily-head));transform-origin:60px 72px">…</g></g>`.
- `RIG` giữ nguyên danh sách phần và id; `mascot()` không đổi. Mọi Lily đang vẽ (Trang chủ, dock, phản hồi, cảnh dạy học) đổi
  ngay khi `<html data-lily>` đổi, không cần vẽ lại.
- Không đụng GSAP: `react()` chỉ ghi `transform` lên `<g data-part>` và `<use>` con của bản sao, còn biến hình giai đoạn nằm trên
  nhóm bọc trong bản gốc sprite, nên không chồng transform (luật v6). `snapshot/restore` của `rigReact` không cần đổi.
- Không đụng vòng lặp idle: `cq-wag` chạy trên `#lily-tail.tail`, `cq-eyes` trên `.eyes`. Nhóm bọc của đuôi và mắt phải là **con**
  của phần tử mang class đó, không phải chính nó (nếu không `animation` đè `transform`).
- Tâm biến hình đặt tại các điểm `PIVOT.lily` (feet 60 112, neck 60 72, tail 80 106, arm-point 72 88). Đầu, tai, mắt, miệng,
  khăn, sao, vòng cổ dùng chung `--lily-lift` + `--lily-head` quanh cổ (60 72) để luôn dính nhau.
- **Độ lệch tâm do nâng thân**: `--lily-lift` (tối đa 6) đưa cổ, gốc đuôi và vai lên tới 6 đơn vị khỏi `PIVOT`. Không chấp nhận
  sai số này (đầu nghiêng sẽ quay quanh một điểm dưới cằm): `PIVOT` đổi thành `pivotOf(who, stage)` trừ `LIFT[stage]` khỏi y của
  `neck`, `tail`, `arm-point` (`feet` không đổi). `LIFT` xuất từ `src/lily.ts` cùng `SIZE`, test so với CSS. Cảnh dạy học: gốc
  `.tb-nod` thành `transform-origin: 60px calc(76px - var(--lily-lift) * 1px)` (biến kế thừa tới SVG của cảnh).

Biến mới (đều có `@property <number>`, `inherits: true`, giá trị đầu = giai đoạn 3 "Trưởng thành" để một Lily không có `data-lily`
vẫn vẽ đúng như hôm nay): `--lily-head`, `--lily-lift`, `--lily-paw`, `--lily-ear`, `--lily-ear-tilt` (`<angle>`), `--lily-tail`,
`--lily-chest`, `--lily-spot1`, `--lily-spot2`, `--lily-spot3`, `--lily-shut` (mắt nhắm), `--lily-collar-on`, `--lily-harness-on`.
Có `@property` nên tween được bằng CSS keyframes và GSAP (khoảnh khắc lớn, §3.1).

**Ghi đè theo bản sao** (cho album và bóng giai đoạn sau, §3): `svg[data-mascot=lily][data-stage="n"]` thắng `:root[data-lily]`.
Bảng CSS viết một lần cho cả hai: `:root[data-lily="2"] [data-mascot=lily]:not([data-stage]), [data-mascot=lily][data-stage="2"] { … }`.
`mascot('lily', pose, cls, label, stage?)` thêm một tham số tùy chọn đặt `data-stage`.

### 2.2 Từng phần

| Phần (`lily-…`) | Làm gì | Vẽ mới? |
|---|---|---|
| `head` | nhóm bọc: `--lily-lift` + `--lily-head` quanh (60, 72). Mõm kem trong đầu: thêm `scaleX` nhẹ theo `--lily-head` ngược (mõm dài ra khi đầu nhỏ đi). Đốm đầu tách 3 nhóm theo bậc (`--lily-spot1..3`) | 2 đốm bậc 3 mới (~2 `<circle>`) |
| `ear-l`, `ear-r` | nhóm bọc: theo đầu + `scale(--lily-ear) rotate(±--lily-ear-tilt)` quanh gốc tai (37 26 / 83 26) | không |
| `eyes-open` | nhóm bọc theo đầu; thêm bên trong một `<use href="#lily-eyes-happy">` với `opacity: var(--lily-shut)` và mắt mở `opacity: calc(1 - var(--lily-shut))` (sơ sinh nhắm mắt ở tư thế đứng yên/chỉ) | không (dùng lại) |
| `eyes-happy`, `eyes-dizzy`, `mouth-*`, `fx-*` | nhóm bọc theo đầu | không |
| `body` | tách: thân + đốm (bọc `--lily-lift` + `scaleX(--lily-chest)` quanh 60 112) và hai bàn chân sau (bọc `scale(--lily-paw)` quanh tâm từng bàn, **không** nâng) | 3 đốm bậc 3 mới |
| `arm-down`, `arm-point`, `arm-up`, `arm-chin` | Chỉ **chân đứng** (đoạn `M50 90v16` / `M70 90v16`, có trong `arm-down`, `arm-point`, `arm-chin`) được bọc `scaleY((16 + lift)/16)` quanh đáy chân y = 106, nên đỉnh chân lên đúng `lift` đơn vị; nét ngón chân (y 107,5–110) tách ra, không kéo, chỉ `scale(--lily-paw)`. **Tay giơ** (`arm-up` cả hai, tay chỉ của `arm-point`, tay chống cằm của `arm-chin`) không kéo, chỉ dịch theo `--lily-lift` như thân | không, nếu prototype qua (xem P-L6) |
| `tail` | nhóm bọc con của `.tail`: nâng + `scale(--lily-tail)` quanh (80, 106) | không |
| `scarf`, `badge` | theo đầu (đeo ở cổ). Khăn: `opacity` theo giai đoạn như hôm nay | không |
| `collar` (**mới**) | vòng cổ mảnh + chuông tròn; `opacity: var(--lily-collar-on)` (chỉ giai đoạn 1; từ 2 khăn che chỗ vòng cổ) | ~1 path + 1 circle, ~0,3 KB thô |
| `harness` (**mới**) | đai yên ngực: 1 dải ngang ngực dày 6 đơn vị + 1 khóa; `opacity: var(--lily-harness-on)` (4, 5) | ~2 path, ~0,35 KB thô |
| `laptop` | như hôm nay | không |
| `sleep` (một phần duy nhất) | chỉ `--lily-size` + 3 nhóm đốm theo bậc (P3) | không |
| `shadow` | `scaleX(--lily-chest)` | không |

`RIG.lily` thêm `collar` và `harness` vào 5 tư thế đứng (sau `body`, trước `scarf`); `tests/mascots.test.ts` đã kiểm mọi phần
trong công thức có trong sprite.

### 2.3 Ngân sách sprite (ước lượng từ byte đo được)

Phần Lily hôm nay ~9,2 KB thô, sprite nén ~20% (19,8 → 4,0 KB). Thêm: ~16 nhóm bọc với chuỗi `style` lặp lại (~1,4 KB thô, nén rất
tốt), vòng cổ + đai (~0,65 KB), 5 đốm mới (~0,25 KB), mắt nhắm dùng lại (~0,1 KB). Tổng ~2,4 KB thô ≈ **+0,5–0,7 KB gz**:
`html` 9,1 → ~9,8 / 12 KB. Không cần chunk lười cho hình: mọi giai đoạn đều ở sprite, nên người mới (giai đoạn 0) vẽ đúng ngay
lần sơn đầu, không nhấp nháy. Nếu P-L6 phải vẽ chân dài riêng: thêm ~1,2 KB thô (≈ +0,3 KB gz), vẫn dưới 12.

CSS (`css` budget, trần 20 KB gz trong `scripts/check-budget.mjs`): bảng 6 giai đoạn × ~16 biến + 13 `@property` + 5 keyframes
lớn + bóng ≈ 2,7 KB thô ≈ +0,6 KB gz.

### 2.4 Cách làm hình

Vẽ tay (không dùng nhân vật có bản quyền, không emoji, không tài nguyên trả phí), cùng nét `--lily-line` 2,4 và màu token
`--lily-*` như hôm nay; giấy phép CC BY 4.0 (`assets/mascots/LICENSE`). Bước đầu là một prototype tĩnh 6 Lily cạnh nhau ở
32/48/96 px, cả hai theme, để user duyệt bóng dáng trước khi sửa sprite.

## 3. Cảm giác "nuôi pet" không có cơ chế gây áy náy

Luật cứng: **không đói, không ốm, không buồn, không teo lại, không đếm ngược**. Nghỉ lâu thì Lily vẫn y nguyên; "Ngày thứ N" đếm
ngày đã học, không phải chuỗi liên tục, không bao giờ giảm. Lily chỉ phản ứng, không dạy, không nói thay Boon (L87). Một linh vật
mỗi vùng.

| Ưu tiên | Tính năng | Chi tiết |
|---|---|---|
| **P1** | 6 giai đoạn + bảng biến CSS | §1–2. |
| **P1** | Trang chủ: Lily to hơn | Hộp lời chào 80 → 96 px (`size-24`). |
| **P1** | Thẻ "Lily của bạn" trong lời chào Trang chủ (section `hello`, không thêm section) | Tên giai đoạn, "Ngày thứ N cùng Lily", **thanh lớn lên**: `k / ngưỡng sau` kỹ năng (thanh `<progress>` có nhãn), và **bóng giai đoạn sau**: một Lily 40 px `data-stage = s+1`, `aria-hidden`, chữ "Còn {n} kỹ năng nữa". Ở giai đoạn 5 không có bóng, chỉ dòng `lily.max`. |
| **P1** | Khoảnh khắc lớn (lễ lên giai đoạn) | §3.1. |
| **P2** | Album lớn lên | Dải 6 Lily 48 px theo `data-stage`: giai đoạn đã qua vẽ màu đủ + ngày đạt; giai đoạn sau là bóng và dấu "?". Mở bằng nút "Xem album" trong thẻ (`<details>` gốc, không dialog). Cần lưu ngày đạt (§3.2). Người chơi cũ: giai đoạn đã qua trước khi có album hiện "trước {ngày ra mắt}" không có ngày cụ thể. |
| **P2** | Vuốt ve | Bấm/Enter vào Lily ở Trang chủ (nó là `<button>` như cảnh dạy học, nhãn "Vuốt ve Lily") → `react()` cheer, đuôi vẫy. **Không thưởng, không đếm, không XP**; bấm liên tục chỉ chạy lại phản ứng sau khi phản ứng trước xong. Sơ sinh: mở mắt 600 ms rồi nhắm lại (đổi `--lily-shut` trên bản sao). |
| **P2** | Lily ngủ khi xong buổi | Không. Bỏ (dễ đọc thành "bỏ rơi Lily"). Giữ ngủ chỉ cho trạng thái trống như hôm nay. |
| **P3** | Chọn màu phụ kiện | Từ giai đoạn 1 (có vòng cổ) chọn 1 trong 6 màu cho vòng cổ / khăn / đai. Token `--lily-acc-1..6` cả hai theme; mặc định = `--lily-scarf` hôm nay. Chỉ thẩm mỹ, đổi lúc nào cũng được. |
| **P3** | Đốm trong tư thế ngủ | Tách đốm của `lily-sleep` thành 3 bậc. |

**Cách vẽ bóng** (thẻ và album): không đổi được màu từng bản sao, vì thân, đầu, tai tô bằng gradient `url(#lily-g-fur)` /
`url(#lily-g-ear)` mà điểm màu (`stop-color: var(--lily-fur)`, một điểm `#fff` cố định) lấy biến từ `:root`, không từ bản sao.
Dùng `filter` trên chính `<svg>` lá: sáng `filter: brightness(0) opacity(.22)`, tối `filter: brightness(0) invert(1) opacity(.28)`
(class `lily-shadow-fig`, chọn theo `[data-theme=dark]`). Bóng đọc được nhờ hình dáng, không cần chi tiết. Không phải transform,
nên không đụng L93.

### 3.1 Khoảnh khắc lớn (≤ 3 s, bỏ qua được, giảm chuyển động = khung tĩnh)

- Kích hoạt: như hôm nay, `syncLily()` thấy giai đoạn tăng (`gainSince`) → `markGrew()`; phản ứng kế tiếp hoặc dock trong 4 s mang
  `grow`. Thêm: nếu Trang chủ đang hiện, Lily ở lời chào chạy luôn một lần (gắn tại sự kiện, không khi vẽ).
- Nhịp 2,4 s (GSAP, `timeline()` dừng sẵn; `GROW_MS` 900 → 2400, keyframes CSS dự phòng cùng độ dài):
  0–0,3 s nhún xuống; 0,3–1,5 s mọi biến từ giai đoạn cũ sang mới (cỡ, nâng thân, đầu, tai, đuôi, ngực); 0,6–1,6 s đốm mới hiện
  từng cái (stagger `--lily-spot*`); 1,2–2,0 s phụ kiện mới tới (vòng cổ vẽ DrawSVG, khăn như hôm nay, sao MorphSVG, đai vẽ
  DrawSVG, laptop trượt); 2,0–2,4 s nhảy + lấp lánh (`fx-sparkle`).
- Lên nhiều bậc một lần (một việc cho nhiều kỹ năng): chỉ diễn từ giai đoạn cũ tới giai đoạn cuối, một lần.
- Không chặn thao tác, không dialog. Bỏ qua: bấm vào Lily hoặc Esc khi dock đang mở → `progress(1)` (`run.fast`).
- Giảm chuyển động: hiện ngay giai đoạn mới, nhãn "Vừa lớn", và `#announce` đọc "Lily đã lớn: {giai đoạn}." như hôm nay.
- `growLily()` hiện chỉ biết 1/2/3: đổi sang bảng theo giai đoạn đích (`ARRIVE: Record<stage, part | undefined>`), `SIZE` thành 6
  giá trị đọc từ một chỗ (xuất từ `src/lily.ts` để CSS-test so khớp). Test hiện có "lớn lên 900 ms như cq-grow" đổi thành 2400.

### 3.2 Lưu gì

- Giai đoạn: **suy ra** từ save như hôm nay, không lưu.
- Ngày đạt từng giai đoạn (album, P2) và màu phụ kiện (P3): đề xuất **device pref** `cargo-query/lily` =
  `{ at: { "1": "2026-11-19", … }, acc?: 1..6 }`, đọc qua `parseLilyPref` (chỉ khóa 1–5, chỉ chuỗi ngày `YYYY-MM-DD`, `acc` số
  nguyên 1–6; sai thì bỏ, không ném), ghi trong `syncLily()` khi thấy giai đoạn tăng (ngày `localDay`). Cùng loại với
  `cargo-query/days` (đã là device pref). Giá: Xuất/Nhập tiến độ **không** mang theo ngày album và màu; sang máy khác album hiện
  "không rõ ngày" cho các giai đoạn đã qua, Lily vẫn đúng giai đoạn. Phương án khác: trường Save mới (cần `SAVE_VERSION` 6,
  `MIGRATIONS[5]`, fixture `save-v6.json`, phát hành riêng) — xem P-L3.

## 4. Truy cập, theme, cỡ nhỏ, chữ

- Lily luôn `aria-hidden` trừ khi là nút (vuốt ve: `aria-label` "Vuốt ve Lily"). Giai đoạn luôn có chữ (tên giai đoạn trong thẻ),
  nên hình không mang thông tin một mình. Thanh lớn lên là `<progress>` có `aria-label` và số bằng chữ.
- Màu: chỉ token `--lily-*` (thêm `--lily-collar`, `--lily-harness`, `--lily-acc-1..6`) cho cả `:root` và `:root[data-theme=dark]`.
  Phụ kiện so với `--lily-fur` và với `--bg`: tương phản ≥ 3:1 (đồ họa, WCAG 1.4.11), thêm vào `tests/theme.test.ts`. Bóng giai
  đoạn sau dùng `--line`/`--muted`, ≥ 3:1 với `--panel` cả hai theme.
- Cỡ nhỏ 32–48 px: mỗi giai đoạn có **một** dấu hiệu chịu được 32 px (bảng §1.2, dòng cuối). Nét phụ kiện tối thiểu 6 đơn vị
  (1,6 px ở 32 px). Đốm < 2 đơn vị biến mất ở 32 px là chấp nhận được (đốm là dấu hiệu cho cỡ lớn).
- Giảm chuyển động: mọi `animation` mới tên `cq-*` nằm trước luật `reduce`; JS kiểm `reducedMotion()`. Khung gốc luôn là khung cuối.
- Biến hình chỉ trên phần tử lá trong SVG (nhóm bọc trong sprite), không trên link, nút, thẻ (L93).

Chữ mới (VI / EN), trong `src/i18n/vi.ts` + `en.ts` (khóa `lily.stage*` đánh lại số, §5.3):

| Khóa | VI | EN |
|---|---|---|
| `lily.stage0` | Sơ sinh | Newborn |
| `lily.stage1` | Cún con | Puppy |
| `lily.stage2` | Cún nhỏ | Young pup |
| `lily.stage3` | Trưởng thành | Grown-up |
| `lily.stage4` | Dày dạn | Seasoned |
| `lily.stage5` | Chuyên gia | Expert |
| `lily.card` | Lily của bạn | Your Lily |
| `lily.growBar` | {k}/{next} kỹ năng tới giai đoạn sau | {k}/{next} skills to the next stage |
| `lily.nextShadow` | Lily sắp thành {stage} | Lily will soon be {stage} |
| `lily.album` | Xem album lớn lên | See the growth album |
| `lily.albumAt` | Đạt ngày {date} | Reached on {date} |
| `lily.albumOld` | Trước khi có album | Before the album |
| `lily.albumSoon` | Chưa tới | Not yet |
| `lily.pet` | Vuốt ve Lily | Pet Lily |
| `lily.accColor` | Màu vòng cổ và khăn | Collar and scarf colour |
| `lily.newborn` | Lily vừa về nhà bạn. Xong việc đầu tiên, Lily sẽ mở mắt. | Lily just came home. Finish your first task and she opens her eyes. |

Giữ: `lily.line`, `lily.next`, `lily.max`, `lily.grew`, `lily.grewPill`. Không chữ nào nói "đói", "nhớ bạn", "buồn".

## 5. Ngân sách, test, chuyển đổi người chơi cũ

### 5.1 Ngân sách

| Nhóm | Hôm nay | Sau P1 | Sau P2+P3 |
|---|---|---|---|
| `html` (sprite) | 9,1 KB | ~9,8 KB | ~9,8 KB (P-L6 vẽ chân: ~10,1) / 12 |
| `css` | 16 | ~16,6 | ~16,8 / 20 |
| `main` | 302 | ~303,5 (thẻ, bóng, đánh số lại) | ~305 (album, pref, màu) / 500 |
| `gsap` | 44 | 44 (dùng DrawSVG/MorphSVG có sẵn) | 44 |

Không thêm phụ thuộc. Hiệu năng: biến CSS kế thừa qua `<use>` đổi mọi Lily cùng lúc, không vẽ lại DOM; vòng lặp idle vẫn chỉ chạy
khi `#mascot-sprite.live`.

### 5.2 Test thêm

- `tests/lily.test.ts`: `STAGE_AT = [0, 1, 3, 10, 18, 25]`; ranh giới 0/1/2/3/9/10/17/18/24/25; đủ kỹ năng → 5 dù < 25;
  `toNextStage` mọi giai đoạn; **luật không tụt**: với mọi k từ 1 tới 38, chiều cao hình mới (đơn vị theo `SIZE`, `LIFT`, `HEAD` của §5.3) ≥ chiều cao hôm nay, phụ kiện cũ ở k là
  tập con phụ kiện mới ở k, và tên cũ ở k (khóa cũ) vẫn là tên mới ở k (bảng ánh xạ cũ → mới giữ trong test, không trong code);
  `parseLilyPref` bỏ dữ liệu xấu.
- `tests/mascots.test.ts`: mỗi biến giai đoạn có `@property` với giá trị đầu = giai đoạn 3; mỗi giai đoạn 0–5 đặt **đủ** mọi biến
  (bảng không thiếu ô); `SIZE` trong celebrate bằng `--lily-size` trong CSS; nhóm bọc của đuôi/mắt là con của `.tail`/`.eyes`;
  `collar`, `harness` có trong sprite và trong 5 tư thế đứng; khoảnh khắc lớn ≤ 3 s (test hiện có về độ dài tự bắt `cq-grow*`);
  `data-stage` trên bản sao thắng `<html data-lily>`.
- `tests/theme.test.ts`: phụ kiện và bóng ≥ 3:1 cả hai theme.
- `tests/i18n.test.ts` tự kiểm khóa mới.

### 5.3 Người chơi cũ

| Kỹ năng | Hôm nay | Sau đổi | Cỡ | Tên | Phụ kiện |
|---|---|---|---|---|---|
So bằng **chiều cao hình thật** (đơn vị × `--lily-size`), không chỉ `--lily-size`. Hôm nay cao hình 97 đơn vị (đỉnh tai ~y 19 tới
chân). Đầu nhỏ đi `1 − head` × 50 đơn vị (đỉnh tai tới cổ), nâng thân cộng `lift`.

| Kỹ năng | Hôm nay | Sau đổi | Cao hôm nay → sau | Tên | Phụ kiện |
|---|---|---|---|---|---|
| 0 | 0 Cún con, 0,8 | 0 Sơ sinh, 0,8 (đầu 1, lift 0) | 77,6 → 77,6 | đổi (k = 0: chưa học gì) | bằng (không) |
| 1–2 | 0 Cún con, 0,8 | 1 Cún con, 0,84 (đầu 1, lift 1) | 77,6 → 82,3 | giữ | + vòng cổ |
| 3–9 | 1 Cún nhỏ, 0,9 | 2 Cún nhỏ, 0,92 (đầu .96, lift 6) | 87,3 → 92,9 | giữ | khăn (bằng) |
| 10–17 | 2 Trưởng thành, 1 | 3 Trưởng thành, 1 (đầu .92, lift 5) | 97 → 98 | giữ | khăn + sao (bằng) |
| 18–24 | 2 Trưởng thành, 1 | 4 Dày dạn, 1,05 (đầu .90, lift 6) | 97 → 102,9 | lên | + đai |
| 25+ | 3 Chuyên gia, 1 | 5 Chuyên gia, 1,08 | 97 → 105,8 | giữ | + đai |

- Không ai bị thấp đi. Nhóm 10–17 cao gần như bằng (+1 đơn vị) nhưng **đầu nhỏ đi 8%** và chân dài ra: đó là chủ đích (chó lớn đầu
  nhỏ so với người), không phải co lại; ở Trang chủ Lily vẫn to hơn hôm nay vì hộp 80 → 96 px. Nếu user thấy đầu nhỏ đi là "mất",
  để `--lily-head` 0.96 cho giai đoạn 3 (P-L11).
- `<html data-lily>` đổi số (0–3 → 0–5): **không** bật lễ lớn khi mở lần đầu sau cập nhật, vì `gainSince` trả 0 ở lần đánh dấu đầu
  (mark chưa có). Người chơi 18+ sẽ thấy Lily "Dày dạn" ngay, không lễ (chấp nhận; hoặc P-L7).
- `cq-grow1..3` và `growLily()` đang gắn với số cũ: đổi cùng commit (test §5.2 bắt lệch).
- Album: ngày đạt các giai đoạn cũ không có (chưa từng lưu) → "Trước khi có album".

## 6. Quyết định chờ user

1. **P-L1** Số giai đoạn và ngưỡng. Đề xuất: 6 giai đoạn, `STAGE_AT = [0, 1, 3, 10, 18, 25]` (giữ 3 mốc cũ, thêm 1 và 18).
2. **P-L2** Tên giai đoạn mới. Đề xuất: "Sơ sinh / Newborn" (0) và "Dày dạn / Seasoned" (18–24); giữ 4 tên cũ ở đúng số kỹ năng cũ.
3. **P-L3** Lưu ngày album và màu phụ kiện. Đề xuất: device pref `cargo-query/lily` (như `cargo-query/days`), chấp nhận mất khi
   Xuất/Nhập; không bump Save.
4. **P-L4** Thứ tự làm. Đề xuất: P1 (6 giai đoạn + thẻ Lily + bóng giai đoạn sau + lễ lớn 2,4 s + hộp 96 px) một đợt; P2 (album,
   vuốt ve) đợt sau; P3 (màu phụ kiện, đốm khi ngủ) khi có nhu cầu.
5. **P-L5** Hộp Lily ở Trang chủ 80 → 96 px. Đề xuất: đồng ý (để chênh lệch 62 → 85 px đọc được).
6. **P-L6** Chân dài bằng `scaleY` phần chân có sẵn hay vẽ biến thể. Đề xuất: thử `scaleY` trong prototype; nếu đầu nét tròn méo
   thấy rõ ở 96 px thì vẽ chân dài riêng (bật tắt bằng `opacity` như khăn, +0,3 KB gz).
7. **P-L7** Người chơi đã ≥ 18 kỹ năng lúc cập nhật có được xem lễ lớn một lần không. Đề xuất: không (giữ luật "không diễn khi
   vẽ", không nhãn "Vừa lớn"; họ thấy Lily "Dày dạn" ngay ở lần mở sau cập nhật).
8. **P-L8** Đặt tên lại cho Lily. Đề xuất: không. Lily là chính người chơi và là nhân vật của thương hiệu (L87).
9. **P-L9** Tai. Đề xuất: tai cụp ở mọi giai đoạn (đúng giống Dalmatian), chỉ đổi cỡ và góc; không làm tai dựng.
10. **P-L10** Sơ sinh nhắm mắt. Đề xuất: đồng ý, chỉ ở tư thế đứng yên/chỉ; cheer/think/oops vẫn dùng mắt của tư thế (đã có).
11. **P-L11** Đầu nhỏ dần theo tuổi (giai đoạn 3 đầu .92 so với 1 hôm nay). Đề xuất: đồng ý (đúng tỉ lệ chó lớn, chiều cao không
    giảm); nếu không thì 0.96.
