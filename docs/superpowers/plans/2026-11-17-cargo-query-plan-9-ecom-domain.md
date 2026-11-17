# BoonData — Plan 9: Domain E-commerce "Chợ Lồng Đèn" (v11)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mở domain thứ hai, đầy đủ như Logistics nhưng gọn để agent build trong vài giờ (L58 v11):
- **Câu chuyện:** bạn là DA mới ở **Chợ Lồng Đèn** (EN *Lantern Market*), sàn bán lẻ trực tuyến hư cấu mở cửa ở Đà Nẵng tháng 1/2025. 7 đồng nghiệp, 6 chương, 30 việc (mỗi chương: teach worked → develop faded → twist → rest → đánh giá thăng tiến), VI + `# EN`, `columns:`, `reflect:`, `wrong:`, biến thể. Toàn bộ 30 file ticket có sẵn ở **Phụ lục C**, đã chạy qua đúng `parseTicket`/`applyVariant`/`compareResults`/`contentProblems` của repo trên PGlite 0.5.16 (225 kiểm tra xanh).
- **Dữ liệu:** schema `ecom` (13 bảng, ~88k dòng, seed tất định có `setseed()` từng khối, móc cốt truyện ở đầu file), seed lười qua `ensure` của Plan 8a, chunk riêng, md5 ghim.
- **Engine:** domain `ecommerce` sống (route `#/d/ecommerce/…`, nút domain trên thanh trên của Plan 7), `search_path` theo request = `ecom, sandbox`, nội dung domain là chunk lười, chương/bậc nghề/KPI/người gửi/bảng theo domain, Save v4 (Bảng điều hành + nháp Sandbox theo domain), cảnh kho + cửa hàng và bản đồ giao hàng (chunk `art/ecommerce`).

**Architecture:**
- Một PGlite, một worker (v6 D-DB1). Logistics vẫn seed lúc khởi động (Plan 7 `initDb`); `ecom` seed lần đầu khi người chơi mở domain (`db.ensure('ecom')` của Plan 8a, hạn 30 s), file SQL nạp bằng `import()` trong worker (chunk `ecomSeed`).
- `src/domains.ts` giữ domain đang mở (`activeDomain()`), schema của từng domain (`DOMAIN_SCHEMA`), mẫu id `ECOM_ID`, danh sách `ECOM_TABLES`. Router đổi domain khi mở trang `#/d/<id>`; trang Chung giữ domain gần nhất (pref `cargo-query/domain`).
- `DbClient.defaultSchema` = schema của domain đang mở: mọi query không ghi `schema` (Bảng điều hành, Dữ liệu, KPI, thẻ kết quả mong đợi, ER…) tự chạy đúng domain mà không sửa từng chỗ gọi. Bài học nhanh vẫn ghi `'game'` (bảng Logistics, Plan 8a), drill ghi `'lab'`.
- Nội dung domain: `content/domains/ecom/` (ticket theo chương, `chapters.yml` có `tables:`, `people.yml`, `kpis.yml`), nạp bằng `loadDomain('ecommerce')` (chunk `ecomSources`). Kỹ năng **dùng lại id** của `skills.yml` (thẻ kỹ năng, ôn Leitner, Luyện tập chung); chương của kỹ năng trong domain suy từ ticket dạy nó (`domainSkills`).
- Save v4: `byDomain.ecommerce = { dashboard, sandboxDraft }`; mọi trường khác dùng chung (id E-com có tiền tố `ecom-`, Save giữ theo mẫu như id drill `g-` của Plan 8a).

**Tech Stack:** như HEAD. **Không thêm dependency.**

**Spec / nguồn quyết định:** `docs/team/product-design-v5.md` §B (IA Chung/Domain, route, Save), `docs/team/product-design-v6.md` §4 (schema theo domain, seed lười, `search_path` theo request), §5.1 (cảnh/bản đồ theo domain: "E-commerce: kho cửa cuốn, thùng hàng, cửa hàng mái hiên sọc; bản đồ giao hàng: Kho → các quận"), `docs/team/curriculum.md` + `docs/team/problem-design.md` (cách viết chương/ticket), decision-log L47–L60 (L60: thứ tự v11 = Plan 8a → 8b → Plan 9).

## Tiền đề và điểm nối

Plan này chạy **sau** Plan 7 (BoonData foundation), Plan 8a (General + `lab`) và Plan 8b (art chunk). Lúc viết plan (2026-11-18) cả ba mới là tài liệu, Plan 7 đang được build (working tree có `src/db/init.ts`, `src/state.ts`… đã sửa). Vì vậy mọi bước sửa code **neo theo tên** (không theo số dòng) và Task 0 kiểm từng điểm nối.

| Điểm nối | Ai tạo | Plan 9 dùng | Nếu chưa có |
|---|---|---|---|
| `src/domains.ts`: `GAME_SCHEMA = 'logistics'`, `type DomainId = 'logistics' \| 'finance' \| 'ecommerce'`, `DOMAINS` (`{ id, live, icon, name, desc }`) | Plan 7 T1, T5 | thêm `ecommerce` live, `activeDomain`, `DOMAIN_SCHEMA`, `ECOM_ID`, `ECOM_TABLES` | Dừng: Plan 7 phải xong trước (route/nav phụ thuộc). |
| `src/route.ts`: `ROUTES` có `overview/play/data/dashboard/map/soon`, `hashOf`, `inDomain`, `domainHash`, `canonicalHash`, `parseRoute`, `dataTableOf`, `soonDomainOf`; hằng `D = '#/d/logistics'` | Plan 7 T5 | Task 2 làm route theo domain đang mở | Dừng. |
| `SCHEMAS = { game: GAME_SCHEMA, lab: 'lab' }`, `SchemaId`; `runSandboxed(db, sql, maxRows, { schema })`, `runExplain`/`runLab`/`runSteps` cùng `{ schema }`; `ensureSchema(db, id)`; request `kind: 'ensure'`; `DbClient.ensure(schema)` + gửi lại sau `restart()`; `run(sql, { schema })` | Plan 8a T1 | Task 1 thêm `ecom` vào cùng cơ chế | Làm Plan 8a Task 1 trước (cùng file, cùng test `tests/lab.test.ts`). |
| `session.activeSchema()` (`'lab'` trong drill, còn lại `'game'`); mọi `app.run` của workspace truyền `{ schema: activeSchema() }` | Plan 8a T7 | Task 6: nhánh "còn lại" thành schema của domain | Thêm `activeSchema()` theo mô tả Plan 8a T7 Step 2 (chỉ phần schema). |
| `DRILL_ID` được `parseSave` nhận theo mẫu | Plan 8a T6 | Task 5 thêm `ECOM_ID` cùng chỗ | Thêm `ECOM_ID` vào chỗ lọc `completed`/`pickRecord`/`bossStep` của `src/save.ts`. |
| `src/art/load.ts` (`loadArt()` lười, `prefetchArt()`), `src/art/logistics.ts`; Tổng quan/Bản đồ/hộp thoại bản đồ vẽ khung giữ chỗ rồi `loadArt().then(…)` | Plan 8b T1 | Task 7 thêm `loadEcomArt()` và nhánh E-com ở 3 chỗ đó | Nếu 8b chưa làm: nhánh E-com đặt trong `ui/homeView.ts`/`ui/mapStrip.ts` cạnh `harborScene`/`routeMap`, vẫn `import()` lười `src/art/ecommerce.ts`. |
| `scripts/check-budget.mjs` có nhóm `general`, `learnui`, `art`, `fonts`; trần `main` 290 (L59) | Plan 7, 8a, 8b | Task 1/3/7 thêm `ecomseed`, `ecom`, `ecomart` | Thêm vào trước `rest` như mẫu. |

**Cách đọc các bước sửa code** (như Plan 2–8): **Tạo** = ghi cả file mới. **Ghi lại** = thay toàn bộ file. **Sửa — thay … bằng …** = khối đầu phải xuất hiện đúng một lần. Khối "thay" không khớp vì HEAD đã đổi: áp **ý** của bước vào code trên đĩa (L7) và ghi chỗ lệch vào mô tả commit. "**Neo:**" = lệnh `grep` tìm đúng chỗ khi tên hàm/biến của Plan 7/8 khác dự kiến.

## Decisions (D9-1 … D9-20, để orchestrator ghi L-số)

**Cần user xem:** D9-8 (thời gian mở domain lần đầu trên trình duyệt chưa đo), D9-10 (vẫn seed Logistics khi người chơi vào thẳng E-com), D9-16 (ngân sách).

| # | Quyết định | Lý do |
|---|---|---|
| D9-1 | **Công ty hư cấu "Chợ Lồng Đèn" / "Lantern Market"**: sàn bán lẻ trực tuyến ở Đà Nẵng, mở cửa 01/2025, shop đối tác đăng hàng, sàn lo thanh toán + giao hàng. **Không thương hiệu thật:** đơn vị giao hàng `BeeRun Express`, `Kite Logistics`, `Lantern Fleet` (đội xe riêng); cách thanh toán là mã chung `cod/ewallet/card/bank_transfer` (không tên ví/thẻ); shop tên kiểu "Hoi An Lantern Craft"; sản phẩm "Smart Earbuds 252". | L56 bản quyền; tên gắn Hội An (lồng đèn) để cùng vùng với Logistics (Tiên Sa). |
| D9-2 | **7 đồng nghiệp** trong `content/domains/ecom/people.yml` (cùng định dạng `people.yml`, `employee: null`): Võ Thanh Hà (Management, CEO, mọi đánh giá thăng tiến), Lâm Gia Huy (IT, trưởng nhóm dữ liệu, người kèm), Trịnh Mai Anh (Marketing), Đoàn Quốc Bảo (Category), Nguyễn Thu Uyên (Ops, kho vận), Hồ Ngọc Diệp (CS), Kha Văn Lộc (Finance). Tên không trùng người Logistics (`personOf` tìm theo tên). **2 phòng mới** trong `DEPT` (`src/theme.ts`): `Marketing`, `Category`. | v5 §B: mỗi domain có cốt truyện và người gửi riêng; tách file để `tests/people.test.ts` (đếm phòng ban Logistics) không đổi. |
| D9-3 | **Domain id giữ `ecommerce`** (Plan 7), **schema `ecom`**, id ticket `ecom-chN-0M`, route `#/d/ecommerce/…`, thư mục `content/domains/ecom/`. Logistics **không** chuyển thư mục. | Plan 7 đã đặt id + route "Sắp có"; v5 §B.7 tiền tố `ecom-`. Chuyển `content/tickets` của Logistics không có lợi gì (v5 E). |
| D9-4 | **6 chương × 5 việc = 30 việc, 21 kỹ năng dùng lại id:** C1 `select`, `where`, `order_by`+`limit` · C2 `aggregate`, `group_by`, `having` · C3 `join`, `multi_join`, `left_join`+`anti_join` · C4 `date_math`, `date_bucket`, `null_logic`+`coalesce` · C5 `case_when`, `conditional_agg`, `cte` · C6 `window_rank`, `window_lag`, `window_agg`. **Không dạy** ở E-com: `distinct`, `string_fn`, `pattern_match`, `cast`, `self_join`, truy vấn con (`scalar_subquery`, `in_subquery`, `exists`, `correlated_value`), `multi_cte` (đánh giá C5 dùng hai khối WITH, chỉ đòi `cte`), `distinct_on`, `union`, `except`, `full_join`, `explain_read`, `sargable`, `index_design` (bỏ chương index: không `runLab`, không bảng lớn, seed nhẹ). | Đủ đường DA bán lẻ (doanh số → giao hàng → phễu → giữ chân) trong 30 việc; mỗi kỹ năng đúng một lần như luật `contentProblems`. |
| D9-5 | **Mọi chương E-com mở bằng ví dụ mẫu (`format: worked`)**, kể cả C1–C3 (Logistics C1–C3 dùng bài học nhanh thay). Đúng một `faded` mỗi chương (develop đầu). `reflect:` + `wrong:` ở mọi việc thường. **Biến thể ≥ 3 ở mọi việc dạy kỹ năng từ ecom-ch1-02** (trừ `select`), chặt hơn luật ch≥4 của Logistics. Luật rest (≥ 2 kỹ năng chương trước, 1 từ N−2) áp từ C4 như `REST_RULE_FROM`. | Người vào E-com đa phần đã qua General/Logistics; ví dụ mẫu nhanh hơn. Ôn Leitner cần biến thể (L37). |
| D9-6 | **Chương của kỹ năng trong domain = chương của ticket dạy nó** (`domainSkills(tickets)`), không chép `skills.yml`. Thẻ kỹ năng (label/syntax/trap), hộp Leitner, `review` dùng chung giữa domain. Lộ trình Chung (Plan 8a) vẫn theo chương Logistics. | Một nguồn thẻ kỹ năng; `contentProblems` kiểm được "dạy đúng một lần". |
| D9-7 | **Nội dung E-com là chunk lười `ecomSources`**, tải khi mở domain (không tải lúc khởi động). Save giữ id E-com **theo mẫu** `ECOM_ID = /^ecom-ch\d{1,2}-\d{2}$/` (như `DRILL_ID` của Plan 8a, D8a-9). | Người chỉ chơi Logistics không tải 39 KB gz; `Known` không cần nội dung E-com nên không mất tiến độ khi đọc Save trước khi tải chunk. |
| D9-8 | **Seed `ecom` = file riêng `src/db/ecom/schema.sql` + `seed.sql`**, 13 bảng (`categories` 14, `sellers` 40, `products` 400, `customers` 5.000, `vouchers` 10, `orders` 10.868, `order_items` 20.924, `payments` 10.432, `deliveries` 9.987, `returns` 639, `reviews` 6.886, `web_sessions` 28.868, `ad_spend` 65). Đo Node (PGlite 0.5.16, máy dev, nhiều agent chạy cùng): **1,55–1,86 s** lúc máy rảnh (Logistics cùng lúc 1,87–2,13 s); lúc tải nặng 2,9–7,2 s. Khối cuối `ANALYZE` chỉ 13 bảng `ecom` (`ANALYZE` trần sẽ đọc lại cả 109k dòng `container_events`). **Trình duyệt: chưa đo**; theo tỷ lệ L46 (Node 2 s ↔ Edge ~10 s) ước **~6–8 s lần đầu mở E-com**, có dòng "Đang chuẩn bị dữ liệu Chợ Lồng Đèn…". Task 8 đo. **Cần user xem.** | Seed tách file giữ md5 Logistics và luật "chỉ nối cuối" nguyên vẹn (như `lab.sql`, D8a-1). Luật dừng seed E-com: 2,0 s Node lúc máy rảnh. |
| D9-9 | **`search_path` theo request cho `ecom` = `ecom, sandbox`** (bảng CSV người chơi nhập dùng được trong Sandbox E-com); `lab` giữ `lab` (D8a-4). **`DbClient.defaultSchema`** = schema domain đang mở: query không ghi `schema` theo domain. Bài học nhanh ghi `'game'` (Logistics). | Một chỗ sửa thay vì ~20 chỗ gọi `app.run`; tên schema chỉ từ hằng `SCHEMAS`. |
| D9-10 | **Logistics vẫn seed lúc khởi động** kể cả khi người chơi vào thẳng `#/d/ecommerce`. Lần đầu vào E-com = seed Logistics (như hôm nay) + seed `ecom`. **Cần user xem.** | Bài học nhanh (bảng Logistics) và General dựa vào Logistics; khởi động theo domain cần nhánh thứ hai trong worker. Backlog v12: worker seed domain đã nhớ trước, Logistics lười. |
| D9-11 | **Save v4:** `byDomain.ecommerce = { dashboard, sandboxDraft }`; Logistics giữ `dashboard`/`sandboxDraft` ở gốc (không di chuyển); `completed`, `xp`, `drafts`, `graded`, `hintsUsed`, `bossStep`, `review`, `practice` dùng chung. Migration 3 → 4 thêm slot rỗng; fixture `save-v4.json`; v1–v3 giữ mãi. `domainSlot(save, id)` là chỗ đọc/ghi duy nhất. | Nâng version để build cũ (v10) gặp save v4 thì đẩy vào `.bak` thay vì ghi đè làm mất tiến độ E-com (Known lọc mất id `ecom-`) và card E-com (L48 D-A2 cùng lý do). |
| D9-12 | **Domain đang mở là trạng thái module** trong `src/domains.ts` (+ pref `cargo-query/domain`, validate khi đọc). Router đặt nó khi mở `#/d/<id>`; trang Chung giữ domain gần nhất. Trang domain đọc `chaptersOf()`, `chapterTablesOf()`, `kpisOf()`, `peopleOf()`; `CHAPTERS`/`CHAPTER_TABLES`/`KPIS`/`PEOPLE` cũ giữ nguyên = Logistics (General và test cũ dùng). | Một domain hiện ra một lúc; truyền domain qua mọi hàm UI là diff lớn không lợi gì. `ponytail:` ghi ở `activeDomain` (đổi sang tham số nếu một trang hiện hai domain). |
| D9-13 | **Không có interface `DomainArt` chung**: `src/art/ecommerce.ts` (chunk lười) xuất `storeScene`, `deliveryMap`, `deliveryItems`, `CITIES`, `openCities`; Tổng quan, trang Bản đồ, hộp thoại bản đồ rẽ nhánh theo `activeDomain()` (3 chỗ). Bản đồ giao hàng: kho Đà Nẵng ở giữa, 7 thành phố mở theo đánh giá thăng tiến (Da Nang + Hue từ đầu; Ha Noi C1, Ho Chi Minh City C2, Hai Phong C3, Nha Trang C4, Can Tho C5). Cảnh: cửa hàng mái hiên sọc + kho cửa cuốn, mỗi việc xong một kiện lên kệ (màu chương), xe máy giao hàng. | Hai cài đặt, chưa cần hợp đồng (YAGNI); tạo interface khi có Finance. v6 §5.1. |
| D9-14 | **E-com không có hoạt cảnh hoàn thành** ở v11: `celebrate()` + câu `#announce` ("Một kiện hàng đã lên kệ" / "Thêm một thành phố giao hàng"). Bài tuyến, cảng, tàu là của Logistics: chặn ở `unlockedTables()`, hộp thoại bản đồ, `playCompletion`. | Hoạt cảnh mới tốn thời gian nhất mà ít giá trị học; v12. |
| D9-15 | **Tên CSV nhập trùng bảng game = trùng Logistics ∪ `ECOM_TABLES`** (danh sách tĩnh, có test khớp schema): `orders.csv` thành `orders_my` ở mọi domain. | Bảng E-com chưa seed thì `information_schema` không có; tĩnh thì không phụ thuộc thứ tự. |
| D9-16 | **Ngân sách:** `ecom` 50 KB (đo trên nguồn: 30 ticket + `chapters.yml` = 38,7 KB gz -9), `ecomseed` 10 KB (7,6), `ecomart` 10 KB (ước ~3); `main` +2–3 KB (route, chuyển domain, ~20 khóa i18n VI, Save v4), dưới trần 290 (L59). Luật L40. **Cần user xem.** | Đo thật trên file nguồn; build đo lại ở Task 3/7/8. |
| D9-17 | **Sổ tay (glossary) và bài học nhanh giữ Logistics** ở cả hai domain (ví dụ bài học chạy trên bảng Logistics). | Bài học là phần Chung (v5 §B.1); thêm ví dụ E-com là v12. |
| D9-18 | **Kết quả trung lập ngôn ngữ:** mã trạng thái/cách thanh toán/lý do là chữ thường ASCII; thành phố, nhóm hàng, chương trình khuyến mãi viết ASCII tiếng Anh (`Ho Chi Minh City`, `Women Fashion`, `10.10 Sale 2026`) để đề EN không phải có dấu; nhóm/phân hạng trả số (1/2/3). | Luật grader so chuỗi (Plan 2 Q*), luật EN không dấu. |
| D9-19 | **Đề E-com cấm thêm** `OVER`, `PARTITION`, `CASE`, `WITH` (ngoài `SQLISH` của Logistics) trong thân đề/Task/đề bước. | Chương 5–6 dễ lộ từ khóa trong lời đề. |
| D9-20 | **Thứ tự và đường cắt cho ngày deploy:** Task 0 → 1 → 2 → 3 → 4 → 5 → 6 = **mốc M1** (E-com chơi được trọn 6 chương, Tổng quan có khung giữ chỗ thay cảnh). Task 7 (cảnh + bản đồ) → **M2**. Hết giờ giữa M1–M2: phát hành M1, cảnh E-com là khung giữ chỗ + chú giải HTML (`deliveryItems` chép vào `src/ui/` nếu cần), không chữ "sắp có". | L58 deploy trước ngày mai; M1 là trạng thái không ngõ cụt. |

## Global Constraints

- Mọi luật của `CLAUDE.md` (i18n qua `t()`, không emoji, class Tailwind nguyên chuỗi, tương phản ≥ 4,5:1, không `innerHTML` ngoài Mermaid, prefs qua `src/storage.ts` + validate).
- **Không sửa** `src/db/schema.sql`, `src/db/seed.sql`, `src/db/lab.sql`, `content/tickets/**`, `content/chapters.yml`, `content/skills.yml`: md5 Logistics và `lab` không đổi (`tests/seed.test.ts`, `tests/lab.test.ts` xanh nguyên).
- Seed `ecom` tất định: mỗi khối ngẫu nhiên mở bằng `setseed()` riêng, chỉ nối khối mới ở **cuối** `src/db/ecom/seed.sql`, "hôm nay" 2026-10-31, Solution dùng ngày cố định.
- Tên schema chỉ lấy từ `SCHEMAS` (`src/domains.ts`), không bao giờ từ input người chơi hay hash.
- Sau mỗi task sửa `src/`: `npx tsc --noEmit && npm test`; task có build: `npm run build && node scripts/check-budget.mjs`, ghi `main`, `ecom`, `ecomseed`, `ecomart`, `worker` vào commit.
- Kiểm tay: Edge, `npm run dev -- --port 5174 --strictPort`, sáng + tối, 1440 / 1100 / 375 px.
- Commit: mỗi task một commit, chỉ `git add` file của task (không `-A`; cây làm việc có thể có file của agent khác); message kết thúc bằng dòng `Claude-Session: https://claude.ai/code/session_01PwPSBV1SVDP6quEZfKN56M`.

## File Structure

```
src/db/ecom/schema.sql            13 bảng schema ecom (Phụ lục A)                                   (tạo, T1)
src/db/ecom/seed.sql              seed tất định + móc cốt truyện (Phụ lục B)                        (tạo, T1)
src/db/ecomSeed.ts                re-export schema/seed ?raw: chunk lười trong worker               (tạo, T1)
src/db/run.ts                     ensureSchema nạp lab | ecom; setRequestPath                       (sửa, T1)
src/db/client.ts                  defaultSchema                                                     (sửa, T1)
src/domains.ts                    SCHEMAS.ecom, DOMAIN_SCHEMA, activeDomain, ECOM_ID, ECOM_TABLES    (sửa, T1, T2)
src/route.ts                      route theo domain đang mở, domainOfHash                           (sửa, T2)
src/ecomSources.ts                import.meta.glob ticket + yml E-com: chunk lười                   (tạo, T3)
src/content.ts                    loadDomain, loadTicketTemplates(d), loadTickets(d)                (sửa, T3)
src/progress.ts                   Chapter.tables, chaptersOf, chapterTablesOf, domainSkills          (sửa, T3)
src/home.ts                       kpisOf, setDomainKpis                                             (sửa, T3)
src/people.ts                     peopleOf, setDomainPeople, personOf trên mọi domain               (sửa, T3)
content/domains/ecom/**           30 ticket, chapters.yml, people.yml, kpis.yml (Phụ lục C)         (tạo, T4)
src/save.ts                       Save v4, MIGRATIONS[3], domainSlot, ECOM_ID                       (sửa, T5)
src/main.ts, src/ui/router.ts     enterDomain(), domain lúc khởi động                               (sửa, T6)
src/state.ts, src/session.ts      unlockedTables, activeSchema theo domain                          (sửa, T6)
src/ui/*.ts                       chaptersOf/kpisOf ở trang domain, domainSlot, chặn lane/stage      (sửa, T6)
src/theme.ts, src/i18n/{vi,en}.ts DEPT Marketing/Category, khóa ecom.*                              (sửa, T6)
src/art/ecommerce.ts              storeScene, deliveryMap, deliveryItems (Phụ lục D)                (tạo, T7)
src/art/load.ts                   loadEcomArt()                                                     (sửa, T7)
scripts/check-budget.mjs          ecomseed 10, ecom 50, ecomart 10                                  (sửa, T1, T3, T7)
tests/ecomSeed.test.ts            md5 ghim + móc (Phụ lục E)                                        (tạo, T1)
tests/ecomContent.test.ts         luật nội dung cho E-com (Phụ lục E)                               (tạo, T3)
tests/saveV4.test.ts, tests/fixtures/save-v4.json                                                  (tạo, T5)
tests/route.test.ts, tests/saveV3.test.ts, tests/helpers.ts, tests/ecomArt.test.ts                  (sửa/tạo)
CLAUDE.md                         mục "Domain E-commerce (Plan 9)"                                  (sửa, T8)
```

## Đã kiểm khi viết plan (scratch, PGlite 0.5.16 bản pin, Node 24, 2026-11-18)

- Seed `ecom` hai lần trên hai instance: md5 13 bảng trùng nhau (tất định); `CREATE SCHEMA ecom; SET search_path TO ecom;` rồi `schema.sql` + `seed.sql` không sửa.
- 30 ticket (Phụ lục C) chạy qua **chính** `parseTicket`, `applyVariant`, `compareResults`, `cellKey`, `contentProblems`, `parseChapters`, `parsePeople`, `parseKpis`, `runSandboxed` của repo (vitest với config scratch trỏ root repo): **225/225 kiểm tra xanh**, gồm mọi Solution × biến thể có dòng và khác nhau từng đôi, mọi `wrong:` × biến thể chạy được và khác Solution, mọi ví dụ mẫu chạy được, mã trong code span VI = EN, EN không dấu, đề không có từ khóa SQL/snake_case, biến thể 0 không sót, luật rest/twist→boss/teach-faded.
- Thời gian mỗi Solution ≤ 12 ms (Node). Bảng số dòng ở mục dưới.
- `src/art/ecommerce.ts` (Phụ lục D) qua `tsc --strict` với `s()`/`chapterColor` thật của repo (i18n thay bằng stub vì khóa `ecom.*` chưa có).
- Chưa kiểm: build Vite, trình duyệt, tích hợp với code Plan 7/8 (chưa có trên HEAD).

### Kết quả của Solution (biến thể 0)

| Việc | Dòng | Ghi chú dữ liệu |
|---|---|---|
| ecom-ch1-01 / 02 / 03 / 04 | 40 / 14 / 5 / 76 | 1-02: shop 16 dưới 500 nghìn; wrong (không lọc còn bán) thêm 2 món |
| ecom-ch1-05 bước 1 / 2 / 3 | 2 / 10 / 5 | shop chính hãng ở Da Nang: Hoi An Lantern Craft, Hoi An Green Pantry |
| ecom-ch2-01 / 02 / 03 / 04 | 1 / 3 / 23 / 5 | 2-01 tháng 10: 1.103 khoản, ~1,99 tỷ đồng; 2-03: 23 khách ≥ 8 đơn (36 nếu tính đơn hủy) |
| ecom-ch2-05 bước 1 / 2 / 3 | 4 / 3 / 47 | |
| ecom-ch3-01 / 02 / 03 / 04 | 26 / 10 / 60 / 10 | 3-03: 60 khách đăng ký 9/2026 chưa mua (wrong tính sai thành 100) |
| ecom-ch3-05 bước 1 / 2 / 3 | 5 / 2 / 7 | top shop quý 3 đều là Gadget Hub (điện thoại đắt) |
| ecom-ch4-01 / 02 / 03 / 04 | 84 / 12 / 3 / 5 | 4-01: 84 kiện Kite trễ > 2 ngày gửi tháng 10 |
| ecom-ch4-05 bước 1 / 2 / 3 | 7 / 7 / 12 | bước 3: trễ trung bình −0,33…0,47 ngày tới tuần 24/8, **2,41 từ tuần 31/8**, 3,17–4,00 sau đó (đáp án kết luận) |
| ecom-ch5-01 / 02 / 03 / 04 | 3 / 3 / 3 / 24 | 5-04: Highland Gadget Hub 14,72% hàng hỏng bị trả, mọi shop khác ≤ 3,19% |
| ecom-ch5-05 bước 1 / 2 / 3 | 3 / 2 / 2 | chi phí mỗi khách mới quý 3: ads 1.066.519, social 975.664, **referral 50.000** (đáp án kết luận) |
| ecom-ch6-01 / 02 / 03 / 04 | 30 / 12 / 10 / 4 | |
| ecom-ch6-05 bước 1 / 2 / 3 | 4 / 12 / 31 | khoảng cách trung bình giữa hai đơn 2026: **referral 50,38**, organic 53,69, social 63,64, **ads 84,97** ngày (đáp án kết luận); 10/10 đẩy cộng dồn tháng từ 19,92% lên 38,54% |

---

### Task 0: Kiểm tiền đề và đo (không sửa file)

- [ ] **Step 1: điểm nối** (mỗi dòng phải in ≥ 1; dòng nào 0 thì làm theo cột "Nếu chưa có" của bảng Tiền đề):
```bash
for p in "export const GAME_SCHEMA" "export type DomainId" "export const DOMAINS" "export const SCHEMAS" "export async function ensureSchema" "kind: 'ensure'" "export function canonicalHash" "export function soonDomainOf" "activeSchema" "DRILL_ID"; do printf '%-40s' "$p"; grep -rlF -- "$p" src | wc -l; done
grep -n "SAVE_VERSION = " src/save.ts            # phải là 3
ls src/art/load.ts src/db/lab.sql                # Plan 8b, 8a
ls src/db/ecom src/ecomSources.ts 2>&1 | grep -c "No such"   # phải là 2 (chưa có gì của Plan 9)
```
- [ ] **Step 2: mốc đo.** `npx tsc --noEmit && npm test` xanh. `npm run build && node scripts/check-budget.mjs`: ghi **M0** (`main`, `worker`, `tickets`, `art`). Seed Logistics trong Node (`npx vitest run tests/seed.test.ts`) để có số so với D9-8.

---

### Task 1: Schema `ecom`, seed lười, `search_path` theo request

**Files:** tạo `src/db/ecom/schema.sql`, `src/db/ecom/seed.sql`, `src/db/ecomSeed.ts`, `tests/ecomSeed.test.ts`; sửa `src/domains.ts`, `src/db/run.ts`, `src/db/client.ts`, `tests/helpers.ts`, `scripts/check-budget.mjs`.

**Interfaces:**
- Consumes: `SCHEMAS`, `SchemaId`, `ensureSchema`, `runSandboxed(…, { schema })`, request `ensure`, `DbClient.ensure` (Plan 8a T1).
- Produces: `SCHEMAS.ecom = 'ecom'`; `ECOM_TABLES`; `ensureSchema(db, 'ecom')`; `setRequestPath(db, schema?)`; `DbClient.defaultSchema`; `ecomRunner()` trong `tests/helpers.ts`.

- [ ] **Step 1: tạo dữ liệu.** `src/db/ecom/schema.sql` = **Phụ lục A** nguyên văn; `src/db/ecom/seed.sql` = **Phụ lục B** nguyên văn.

- [ ] **Step 2: test trước.** Tạo `tests/ecomSeed.test.ts` = **Phụ lục E.1**. Thêm vào `tests/helpers.ts` (cạnh `runner()`; thêm import `ensureSchema` từ `../src/db/run` nếu chưa có):
```ts
/** The e-commerce schema on the shared test DB (Plan 9): seeded once per file, queries run with search_path ecom, sandbox. */
export async function ecomRunner(): Promise<(sql: string) => Promise<QueryResult>> {
  const db = await seededDb();
  await ensureSchema(db, 'ecom');
  return (sql) => runSandboxed(db, sql, undefined, { schema: 'ecom' });
}
```
Run: `npx vitest run tests/ecomSeed.test.ts` → FAIL (`ECOM_TABLES`, schema `ecom` chưa có).

- [ ] **Step 3: `src/domains.ts`** — thay:
```ts
export const SCHEMAS = { game: GAME_SCHEMA, lab: 'lab' } as const;
```
bằng:
```ts
export const SCHEMAS = { game: GAME_SCHEMA, lab: 'lab', ecom: 'ecom' } as const;

/** Tables of the ecom schema (src/db/ecom/schema.sql; tests/ecomSeed.test.ts checks the list). A CSV import with one of these names gets `_my` (Plan 9 D9-15). */
export const ECOM_TABLES = [
  'categories', 'sellers', 'products', 'customers', 'vouchers', 'orders', 'order_items',
  'payments', 'deliveries', 'returns', 'reviews', 'web_sessions', 'ad_spend',
] as const;
```
(Neo: `grep -n "SCHEMAS" src/domains.ts`. Nếu Plan 8a viết `SCHEMAS` khác dạng, chỉ thêm khóa `ecom: 'ecom'`.)

- [ ] **Step 4: `src/db/ecomSeed.ts`** (tạo):
```ts
// The e-commerce schema and seed as raw SQL (Plan 9). Only src/db/run.ts imports this, with import(), so the worker
// fetches it as its own chunk the first time ensureSchema(db, 'ecom') runs (budget group `ecomseed`).
export { default as schema } from './ecom/schema.sql?raw';
export { default as seed } from './ecom/seed.sql?raw';
```

- [ ] **Step 5: `src/db/run.ts`.** Neo: `grep -n "ensureSchema\|SET LOCAL search_path" src/db/run.ts`.
  1. Thay **thân** `ensureSchema` của Plan 8a (giữ tên, tham số, `export`) bằng bản nạp theo bảng (lab giữ đúng hành vi cũ):
```ts
/** Schemas seeded on first use (v6 F7): lab (Plan 8a) and the e-commerce domain (Plan 9). Each list runs with only its schema on the path. */
const LAZY_SEEDS: Partial<Record<SchemaId, () => Promise<string[]>>> = {
  lab: async () => [lab],
  ecom: async () => {
    const m = await import('./ecomSeed');
    return [m.schema, m.seed];
  },
};
const seededSchemas = new WeakMap<PGlite, Set<SchemaId>>();

/**
 * Seeds `id` once per DB. The session search_path is put back (SANDBOX_SETUP_SQL) whatever happens; a failure drops the
 * half-built schema so the next ensure starts clean. Names come only from SCHEMAS.
 */
export async function ensureSchema(db: PGlite, id: SchemaId): Promise<void> {
  const load = LAZY_SEEDS[id];
  const done = seededSchemas.get(db) ?? new Set<SchemaId>();
  seededSchemas.set(db, done);
  if (!load || done.has(id)) return;
  const name = SCHEMAS[id];
  try {
    const files = await load();
    await db.exec(`CREATE SCHEMA ${name}; SET search_path TO ${name};`);
    for (const sql of files) await db.exec(sql);
    done.add(id);
  } catch (e) {
    await db.exec(`DROP SCHEMA IF EXISTS ${name} CASCADE;`);
    throw e;
  } finally {
    await db.exec(SANDBOX_SETUP_SQL);
  }
}
```
  (Nếu Plan 8a dùng `Set` khác tên cho schema đã seed, bỏ cái cũ: chỉ còn `seededSchemas`. Import `lab` từ `./lab.sql?raw` và `SANDBOX_SETUP_SQL` giữ như Plan 8a.)
  2. Thêm cạnh đó, rồi thay **mọi** dòng `if (opts.schema === 'lab') await db.exec('SET LOCAL search_path TO lab');` (trong `runSandboxed`, `runExplain`, `runLab`, và hàm đếm của `viz/steps.ts` nếu Plan 8a đặt ở đó) bằng `await setRequestPath(db, opts.schema);`:
```ts
/** search_path for one request, right after BEGIN (v6 §4.4). Absent = the session path (logistics, sandbox). lab never sees sandbox (D8a-4); ecom does, so imported CSVs work in the e-commerce Sandbox (Plan 9 D9-9). */
const REQUEST_PATH: Partial<Record<SchemaId, string>> = { lab: SCHEMAS.lab, ecom: `${SCHEMAS.ecom}, sandbox` };
export async function setRequestPath(db: { exec(sql: string): Promise<unknown> }, schema?: SchemaId): Promise<void> {
  const path = schema && REQUEST_PATH[schema];
  if (path) await db.exec(`SET LOCAL search_path TO ${path}`);
}
```

- [ ] **Step 6: `src/db/client.ts`.** Neo: `grep -n "schema" src/db/client.ts`. Thêm trường và dùng nó ở mọi request mang SQL (`run`, `explain`, `steps`, `lab`; **không** `ensure`, `import`, `dropImport`, `parser`):
```ts
  /** Schema for requests that name none (Plan 9 D9-9): the open domain's ('game' = Logistics, 'ecom'). Drills and lessons pass theirs explicitly. */
  defaultSchema: SchemaId = 'game';
```
Ở chỗ Plan 8a ghép `schema` vào message (vd. `{ kind, sql, schema: opts.schema }`), đổi thành `schema: opts.schema ?? this.defaultSchema`. `worker.ts` không đổi (đã chuyển `schema` xuống `run.ts`; `'game'` không có trong `REQUEST_PATH` nên chạy đường dẫn phiên như cũ).

- [ ] **Step 7: ngân sách.** `scripts/check-budget.mjs`, thêm trước dòng `['rest', …]`:
```js
  ['ecomseed', /^ecomSeed-/, 10], // Plan 9: src/db/ecom/{schema,seed}.sql, lazy in the worker on ensure('ecom'): 7.6 KB gz -9 measured on the source (D9-16)
```

- [ ] **Step 8: xác nhận.** `npx vitest run tests/ecomSeed.test.ts tests/seed.test.ts tests/lab.test.ts && npx tsc --noEmit && npm test`. `npm run build && node scripts/check-budget.mjs`: có dòng `ecomseed` ≤ 10, `worker` không tăng quá 1 KB (SQL nằm ở chunk riêng). Nếu chunk tên khác (`dist/assets`), sửa regex theo tên thật.

- [ ] **Step 9: commit** `feat(db): ecom schema (Lantern Market), seeded lazily on ensure, search_path ecom, sandbox per request`.

---

### Task 2: Domain `ecommerce` sống, domain đang mở, route theo domain

**Files:** sửa `src/domains.ts`, `src/route.ts`, `tests/route.test.ts`, `src/i18n/vi.ts`, `src/i18n/en.ts`.

**Interfaces:**
- Produces: `activeDomain()`, `setActiveDomain(id)`, `DOMAIN_SCHEMA`, `domainSchemaId(d?)`, `domainSchemaName(d?)`, `ECOM_ID`, `isLiveDomain(id)`, `DOMAIN_KEY` (pref); `domainOfHash(hash)`; `hashOf(r)` theo domain đang mở.

- [ ] **Step 1: test trước.** Trong `tests/route.test.ts` (Plan 7 ghi lại): thay mọi kỳ vọng `#/d/ecommerce… → 'soon'` / `soonDomainOf('#/d/ecommerce/x') → 'ecommerce'` bằng khối dưới, giữ các kỳ vọng Finance:
```ts
import { activeDomain, setActiveDomain } from '../src/domains';
// (thêm domainOfHash vào import từ '../src/route')

  it('Plan 9: E-commerce là domain sống, trang của nó nằm dưới #/d/ecommerce', () => {
    expect(parseRoute('#/d/ecommerce')).toBe('overview');
    expect(parseRoute('#/d/ecommerce/play')).toBe('play');
    expect(parseRoute('#/d/ecommerce/data/orders')).toBe('data');
    expect(parseRoute('#/d/ecommerce/map')).toBe('map');
    expect(soonDomainOf('#/d/ecommerce/x')).toBeUndefined();
    expect(domainOfHash('#/d/ecommerce/play?x=1')).toBe('ecommerce');
    expect(domainOfHash('#/play')).toBe('logistics'); // hash cũ → Logistics (canonicalHash)
    expect(domainOfHash('#/learn')).toBeUndefined();
    expect(domainOfHash('#/d/finance')).toBeUndefined();
    expect(dataTableOf('#/d/ecommerce/data/order_items')).toBe('order_items');
  });

  it('Plan 9: hashOf theo domain đang mở; hash cũ vẫn về Logistics', () => {
    const before = activeDomain();
    setActiveDomain('ecommerce');
    expect(hashOf('play')).toBe('#/d/ecommerce/play');
    expect(hashOf('overview')).toBe('#/d/ecommerce');
    expect(hashOf('learn')).toBe('#/learn');
    expect(canonicalHash('#/play')).toBe('#/d/logistics/play');
    setActiveDomain(before);
    expect(hashOf('play')).toBe('#/d/logistics/play');
  });
```
Run: `npx vitest run tests/route.test.ts` → FAIL.

- [ ] **Step 2: `src/domains.ts`.** Trong `DOMAINS`, đổi dòng `ecommerce` thành `live: true`. Thêm cuối file:
```ts
/** Schema of each live domain's own tables (story, practice, sandbox, data, dashboard). Plan 9. */
export const DOMAIN_SCHEMA: Partial<Record<DomainId, SchemaId>> = { logistics: 'game', ecommerce: 'ecom' };
export const isLiveDomain = (id: unknown): id is DomainId => DOMAINS.some((d) => d.id === id && d.live);

// ponytail: one module-level "open domain", since one domain's pages show at a time; pass the domain explicitly if a page ever shows two.
let active: DomainId = 'logistics';
/** The domain whose pages are open, or were last open while the player is on a General page (Plan 9 D9-12). */
export const activeDomain = (): DomainId => active;
/** Only enterDomain() (src/main.ts) and tests call this: the content of `id` must be loaded first (loadDomain). */
export const setActiveDomain = (id: DomainId): void => {
  active = id;
};
export const domainSchemaId = (d: DomainId = active): SchemaId => DOMAIN_SCHEMA[d] ?? 'game';
export const domainSchemaName = (d: DomainId = active): string => SCHEMAS[domainSchemaId(d)];

/** E-commerce ticket ids. Save keeps them by pattern because the domain's content is a lazy chunk (D9-7, like DRILL_ID). */
export const ECOM_ID = /^ecom-ch\d{1,2}-\d{2}$/;
/** Device pref: the last domain opened (a live DomainId; anything else reads as logistics). Never part of Save. */
export const DOMAIN_KEY = 'cargo-query/domain';
```

- [ ] **Step 3: `src/route.ts`.** Neo: `grep -n "const D = \|HASH\|b === 'logistics'\|d\\\\/logistics\\\\/data" src/route.ts`.
  1. Thay hằng `const D = '#/d/logistics';` và bảng `HASH` bằng hàm theo domain đang mở (giữ nguyên mọi route Chung mà Plan 8a đã thêm vào bảng):
```ts
/** The open domain's base hash (Plan 9): domain pages follow activeDomain(); old hashes still mean Logistics (canonicalHash). */
const D = (): string => `#/d/${activeDomain()}`;
const hashTable = (): Record<Route, string> => ({
  home: '#/', learn: '#/learn', practice: '#/practice', overview: D(), play: `${D()}/play`, data: `${D()}/data`,
  dashboard: `${D()}/dashboard`, map: `${D()}/map`, soon: '#/d/finance',
});
export const hashOf = (r: Route): string => hashTable()[r];
```
  2. Trong `canonicalHash`, thay `${D}` bằng chuỗi cố định `#/d/logistics` (hash trước Plan 7 luôn là Logistics).
  3. Trong `parseRoute`, thay `if (b === 'logistics')` bằng `if (isLiveDomain(b))`.
  4. Trong `dataTableOf`, thay regex `/^#\/?d\/logistics\/data\/([^/?]*)/` bằng `/^#\/?d\/[a-z]+\/data\/([^/?]*)/`.
  5. Thêm:
```ts
/** `#/d/<id>…` of a live domain (old hashes count as Logistics) → that domain; any other page → undefined (keeps the last domain). */
export function domainOfHash(hash: string): DomainId | undefined {
  const id = /^#\/?d\/([a-z]+)(?=$|[/?])/.exec(canonicalHash(hash))?.[1];
  return isLiveDomain(id) ? id : undefined;
}
```
  Import: `import { activeDomain, DOMAINS, isLiveDomain, type DomainId } from './domains';` (`DOMAINS` còn dùng trong `soonDomainOf`).

- [ ] **Step 4: i18n.** `domain.ecommerceDesc` (cả VI và EN) đổi thành mô tả thật (khóa đã có từ Plan 7):
  - VI: `'Chợ Lồng Đèn, sàn bán lẻ trực tuyến hư cấu ở Đà Nẵng: 6 chương từ doanh số, giao hàng, phễu mua hàng tới giữ chân khách.'`
  - EN: `'Lantern Market, a fictional online marketplace in Da Nang: 6 chapters from sales and delivery to purchase funnels and retention.'`

- [ ] **Step 5: xác nhận.** `npx vitest run tests/route.test.ts && npx tsc --noEmit`. `tsc` có thể báo chỗ dùng `HASH`/`D` cũ ở file khác: đổi sang `hashOf(...)`/`domainHash(...)`.
- [ ] **Step 6: commit** `feat(route): e-commerce is a live domain; domain pages follow the open domain`.

---

### Task 3: Nội dung theo domain (chunk lười, chương, bảng, KPI, người gửi, kỹ năng)

**Files:** tạo `src/ecomSources.ts`, `tests/ecomContent.test.ts`; sửa `src/content.ts`, `src/progress.ts`, `src/home.ts`, `src/people.ts`, `tests/setup.ts`, `scripts/check-budget.mjs`.

**Interfaces:**
- Produces: `loadDomain(id): Promise<void>`; `loadTicketTemplates(d = activeDomain())`, `loadTickets(d = activeDomain())`; `Chapter.tables?: string[]`; `setDomainChapters`, `chaptersOf(d?)`, `chapterTablesOf(d?)`, `domainSkills(tickets)`; `contentProblems(tickets, skills?, chapters?, tables?)`; `tablesUnlocked(chapter, tables?)`; `kpisOf(d?)`, `setDomainKpis`; `peopleOf(d)`, `setDomainPeople`, `personOf` tìm mọi domain.

- [ ] **Step 1: test trước.** Tạo `tests/ecomContent.test.ts` = **Phụ lục E.2**. Run → FAIL (`loadDomain`… chưa có; nội dung chưa có — Task 4 thêm, nên test này xanh ở cuối Task 4).

- [ ] **Step 2: `src/ecomSources.ts`** (tạo):
```ts
// E-commerce content as raw text (Plan 9). Only src/content.ts imports this, with import(), so it is its own lazy chunk
// (budget group `ecom`), fetched when the player first opens the domain (D9-7), never at boot.
export const ticketSources = import.meta.glob<string>('../content/domains/ecom/tickets/**/*.md', { query: '?raw', import: 'default', eager: true });
export { default as chaptersSource } from '../content/domains/ecom/chapters.yml?raw';
export { default as peopleSource } from '../content/domains/ecom/people.yml?raw';
export { default as kpiSource } from '../content/domains/ecom/kpis.yml?raw';
```

- [ ] **Step 3: `src/progress.ts`.**
  1. `Chapter` thêm trường, `parseChapters` đọc nó:
```ts
/** … tables: the domain tables this chapter reveals (content/domains/<d>/chapters.yml); Logistics keeps CHAPTER_TABLES below. */
export interface Chapter { chapter: number; title: Bilingual; career: Bilingual; tier: boolean; story: Bilingual; outcomes: Outcome[]; tables?: string[] }
```
  trong `parseChapters`, object trả về thêm `...(Array.isArray(c.tables) ? { tables: strings(c.tables) } : {})`.
  2. Thêm (import `activeDomain`, `type DomainId` từ `./domains`):
```ts
/** Chapters of the non-Logistics domains, set by loadDomain() (src/content.ts). Logistics is CHAPTERS. */
const domainChapters = new Map<DomainId, Chapter[]>();
export const setDomainChapters = (d: DomainId, chapters: Chapter[]): void => void domainChapters.set(d, chapters);
/** The open domain's chapters (Plan 9 D9-12). General pages keep CHAPTERS: the learning path follows Logistics. */
export const chaptersOf = (d: DomainId = activeDomain()): Chapter[] => (d === 'logistics' ? CHAPTERS : domainChapters.get(d) ?? []);
export const chapterTablesOf = (d: DomainId = activeDomain()): Record<number, string[]> =>
  d === 'logistics' ? CHAPTER_TABLES : Object.fromEntries(chaptersOf(d).map((c) => [c.chapter, c.tables ?? []]));

/**
 * A domain's skill cards: the shared cards of skills.yml with `chapter` = the chapter of the domain ticket that teaches
 * the skill (Plan 9 D9-6). Skills the domain never teaches are left out, so contentProblems reports any ticket that
 * requires one. Leitner boxes and review stay keyed by the shared skill id.
 */
export function domainSkills(tickets: Ticket[], all: Skill[] = SKILLS): Skill[] {
  const taughtIn = new Map<string, number>();
  for (const t of tickets) for (const s of t.grants) if (!taughtIn.has(s)) taughtIn.set(s, t.chapter);
  return all.filter((s) => taughtIn.has(s.id)).map((s) => ({ ...s, chapter: taughtIn.get(s.id)! }));
}
```
  3. Đổi mặc định cho đúng domain (chữ ký cũ vẫn chạy):
     - `tablesUnlocked(chapter: number, tables: Record<number, string[]> = chapterTablesOf())` và dùng `tables` thay `CHAPTER_TABLES` trong thân.
     - `contentProblems(tickets, skills = SKILLS, chapters = chaptersOf(), tables = chapterTablesOf())`; trong thân `tablesUnlocked(t.chapter)` → `tablesUnlocked(t.chapter, tables)`.
     - `rankOf(tickets, completed, chapters = chaptersOf())`; `chapterTitle` đọc `chaptersOf()`.

- [ ] **Step 4: `src/home.ts`** (KPI): thêm cạnh `KPIS`:
```ts
const domainKpis = new Map<DomainId, Kpi[]>();
export const setDomainKpis = (d: DomainId, kpis: Kpi[]): void => void domainKpis.set(d, kpis);
/** The open domain's company tiles (Logistics: content/kpis.yml; E-com: content/domains/ecom/kpis.yml). */
export const kpisOf = (d: DomainId = activeDomain()): Kpi[] => (d === 'logistics' ? KPIS : domainKpis.get(d) ?? []);
```
  Trong `homeModel` (và mọi hàm của `home.ts` đọc `CHAPTERS`): `CHAPTERS` → `chaptersOf()`.

- [ ] **Step 5: `src/people.ts`:**
```ts
const domainPeople = new Map<DomainId, Person[]>([['logistics', PEOPLE]]);
export const setDomainPeople = (d: DomainId, people: Person[]): void => void domainPeople.set(d, people);
export const peopleOf = (d: DomainId): Person[] => domainPeople.get(d) ?? [];
```
  `personOf(name)` tìm trong mọi danh sách: `for (const list of domainPeople.values()) { const p = list.find(…); if (p) return p; }` (tên không trùng giữa domain: `tests/ecomContent.test.ts` kiểm).

- [ ] **Step 6: `src/content.ts`.** Thêm (import `activeDomain`, `type DomainId` từ `./domains`; `parseChapters`, `setDomainChapters` từ `./progress`; `parseKpis`, `setDomainKpis` từ `./home`; `parsePeople`, `setDomainPeople` từ `./people`):
```ts
const domainTemplates = new Map<DomainId, Ticket[]>();
let ecomLoading: Promise<void> | undefined;

/**
 * A domain's content (Plan 9): Logistics comes with loadContent(); E-commerce is its own lazy chunk (src/ecomSources.ts),
 * loaded the first time the player opens the domain. A failed load can be retried. Await it before setActiveDomain().
 */
export function loadDomain(id: DomainId): Promise<void> {
  if (id !== 'ecommerce') return Promise.resolve();
  return (ecomLoading ??= import('./ecomSources')
    .then((m) => {
      const templates = Object.entries(m.ticketSources).map(([path, source]) => parseTicket(source, path)).sort(byOrder);
      setDomainChapters('ecommerce', parseChapters(m.chaptersSource, 'domains/ecom/chapters.yml'));
      setDomainKpis('ecommerce', parseKpis(m.kpiSource, 'domains/ecom/kpis.yml'));
      setDomainPeople('ecommerce', parsePeople(m.peopleSource, 'domains/ecom/people.yml'));
      domainTemplates.set('ecommerce', templates);
    })
    .catch((e: unknown) => {
      ecomLoading = undefined;
      throw e;
    }));
}
```
  và đổi hai hàm đọc ticket (thêm tham số, mặc định là domain đang mở):
```ts
export function loadTicketTemplates(d: DomainId = activeDomain()): Ticket[] {
  const list = d === 'logistics' ? templates : domainTemplates.get(d);
  if (!list) throw new Error(d === 'logistics' ? 'loadContent() has not finished' : `loadDomain('${d}') has not finished`);
  return list;
}

/** Story mode always plays variants[0]. */
export function loadTickets(d: DomainId = activeDomain()): Ticket[] {
  return loadTicketTemplates(d).map((t) => applyVariant(t, 0));
}
```
  `loadLanes()` không đổi (bài tuyến chỉ có ở Logistics).

- [ ] **Step 7: `tests/setup.ts`:** không đổi (test E-com tự `await loadDomain('ecommerce')`). Kiểm: `grep -rn "loadTickets()\|loadTicketTemplates()" tests` — mọi test cũ chạy với domain mặc định `logistics` nên không đổi.

- [ ] **Step 8: ngân sách.** `scripts/check-budget.mjs`, trước `rest`:
```js
  ['ecom', /^ecomSources-/, 50], // Plan 9: e-commerce tickets + chapters/people/kpis, lazy, fetched when the domain opens: 38.7 KB gz -9 on the source (D9-16)
```

- [ ] **Step 9: xác nhận.** `npx tsc --noEmit && npm test` (trừ `tests/ecomContent.test.ts`, chờ Task 4). Commit `feat(content): per-domain content, chapters, tables, KPIs and colleagues; e-commerce content is a lazy chunk`.

---

### Task 4: Nội dung E-com (30 việc, 6 chương, người, KPI)

**Files:** tạo `content/domains/ecom/chapters.yml`, `content/domains/ecom/people.yml`, `content/domains/ecom/kpis.yml`, `content/domains/ecom/tickets/ch1/ecom-ch1-01.md` … `ch6/ecom-ch6-05.md` (30 file).

- [ ] **Step 1:** Chép **Phụ lục C** nguyên văn: mỗi khối `=== <đường dẫn> ===` là một file dưới `content/domains/ecom/` (đường dẫn ticket tương đối với `content/domains/ecom/tickets/`). Mẹo: lưu phụ lục ra file rồi chạy
```bash
python - <<'EOF'
import re, os
s = open('plan9-appendix-c.txt', encoding='utf-8').read()
for m in re.finditer(r'^=== (\S+) ===\n(.*?)(?=^=== |\Z)', s, re.S | re.M):
    p = os.path.join('content/domains/ecom', m.group(1))
    os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, 'w', encoding='utf-8', newline='\n').write(m.group(2).rstrip('\n') + '\n')
EOF
```
- [ ] **Step 2: `src/theme.ts` `DEPT`:** thêm 2 phòng (khóa i18n thêm ở Task 6 Step 7; nếu `tsc` báo `Key` chưa có, làm luôn bước i18n đó ở đây):
```ts
  Marketing: { chip: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200', shirt: '#c2410c', backdrop: '#ffedd5', thanks: 'chat.thanksMarketing' },
  Category: { chip: 'bg-lime-100 text-lime-800 dark:bg-lime-950 dark:text-lime-200', shirt: '#4d7c0f', backdrop: '#ecfccb', thanks: 'chat.thanksCategory' },
```
- [ ] **Step 3: xác nhận.** `npx vitest run tests/ecomContent.test.ts tests/theme.test.ts tests/i18n.test.ts && npx tsc --noEmit && npm test`. `tests/ecomContent.test.ts` phải xanh trọn (~230 ca). Nếu `tests/i18n.test.ts` quét `content/**` (L22 "boss"): nội dung E-com không có chữ đó.
- [ ] **Step 4: commit** `content(ecom): Lantern Market, 6 chapters, 30 tasks (VI + EN), colleagues and company tiles`.

---

### Task 5: Save v4 (`byDomain`, id E-com theo mẫu)

**Files:** sửa `src/save.ts`, `tests/saveV3.test.ts`; tạo `tests/saveV4.test.ts`, `tests/fixtures/save-v4.json`.

- [ ] **Step 1: test trước.** Tạo `tests/fixtures/save-v4.json` = **Phụ lục E.3**, `tests/saveV4.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import v3 from './fixtures/save-v3.json?raw';
import v4 from './fixtures/save-v4.json?raw';
import { domainSlot, emptySave, MIGRATIONS, NewerSaveError, parseSave, SAVE_VERSION, type Known } from '../src/save';

// Logistics ids are listed (Known); e-commerce ids are kept by pattern (ECOM_ID) because that content is a lazy chunk.
const known: Known = {
  ticketIds: new Set(['ch1-01', 'ch1-02', 'ch1-03', 'ch1-04', 'ch1-05', 'ch2-01', 'ch2-02', 'ch2-03', 'r-1', 'r-2']),
  laneIds: new Set(['r-1', 'r-2']),
  skills: new Set(['select', 'where', 'order_by', 'limit']),
};
const emptySlot = { dashboard: { cards: [], hidden: [] }, sandboxDraft: '' };

describe('save v4 (Plan 9: domain E-commerce)', () => {
  it('SAVE_VERSION 4; save mới có slot E-com rỗng', () => {
    expect(SAVE_VERSION).toBe(4);
    expect(emptySave()).toMatchObject({ version: 4, byDomain: { ecommerce: emptySlot } });
  });

  it('v3 → v4: mọi trường v3 giữ nguyên, thêm slot E-com rỗng', () => {
    expect(parseSave(v3, known)).toEqual({ ...JSON.parse(v3), version: 4, byDomain: { ecommerce: emptySlot } });
  });

  it('đọc save mẫu v4 nguyên vẹn: id ecom- giữ theo mẫu dù chưa tải nội dung E-com', () => {
    expect(parseSave(v4, known)).toEqual(JSON.parse(v4));
  });

  it('id không thuộc nội dung nào và không khớp mẫu vẫn bị bỏ', () => {
    const raw = JSON.stringify({ ...JSON.parse(v4), completed: ['ch1-01', 'ecom-x', 'ecom-ch1-01', 'zzz'] });
    expect(parseSave(raw, known).completed).toEqual(['ch1-01', 'ecom-ch1-01']);
  });

  it('slot hỏng đọc thành slot rỗng; nháp Sandbox bị cắt ở 20.000 ký tự', () => {
    const raw = JSON.stringify({ ...JSON.parse(v4), byDomain: { ecommerce: { dashboard: 5, sandboxDraft: 'x'.repeat(30_000) } } });
    expect(parseSave(raw, known).byDomain.ecommerce).toEqual({ dashboard: { cards: [], hidden: [] }, sandboxDraft: 'x'.repeat(20_000) });
  });

  it('build v3 gặp save v4: NewerSaveError (loadSave chép vào .bak, không ghi đè)', () => {
    expect(() => parseSave(v4, known, MIGRATIONS, 3)).toThrow(NewerSaveError);
  });

  it('domainSlot: Logistics là chính Save, E-com là byDomain.ecommerce; ghi qua slot là ghi vào Save', () => {
    const s = parseSave(v4, known);
    expect(domainSlot(s, 'logistics').sandboxDraft).toBe('SELECT count(*) FROM shipments');
    expect(domainSlot(s, 'ecommerce').dashboard.cards.map((c) => c.id)).toEqual(['e1']);
    domainSlot(s, 'ecommerce').sandboxDraft = 'SELECT 1';
    expect(s.byDomain.ecommerce.sandboxDraft).toBe('SELECT 1');
  });
});
```
Run → FAIL.

- [ ] **Step 2: `src/save.ts`.**
  1. `export const SAVE_VERSION = 4;`
  2. Trong `interface Save`, sau `lanes`:
```ts
  // --- v4 (Plan 9, D9-11) ---
  /** What a player owns per domain besides the shared fields. Logistics keeps the top-level dashboard and sandboxDraft. */
  byDomain: { ecommerce: DomainSlot };
```
  và khai báo (đặt trên `interface Save`; `import type { DomainId } from './domains'`, `import { ECOM_ID } from './domains'`):
```ts
/** A domain's own dashboard cards/hidden tiles and Sandbox draft (Plan 9). */
export interface DomainSlot { dashboard: Dashboard; sandboxDraft: string }
const emptySlot = (): DomainSlot => ({ dashboard: emptyDashboard(), sandboxDraft: '' });
```
  3. `MIGRATIONS` thêm:
```ts
  // v3 → v4 (Plan 9): an empty e-commerce slot. Bumped so a build from before Plan 9 moves a v4 save to .bak instead of
  // rewriting it without the e-commerce progress and cards (D9-11).
  3: (d) => ({ ...d, byDomain: { ecommerce: emptySlot() } }),
```
  4. `emptySave()` thêm `byDomain: { ecommerce: emptySlot() },`.
  5. Đọc slot (đặt cạnh `readV2`) và dùng trong object trả về của `parseSave` (sau `lanes`):
```ts
function readSlot(v: unknown): DomainSlot {
  const o = isRecord(v) ? v : {};
  return { dashboard: readDashboard(o.dashboard), sandboxDraft: typeof o.sandboxDraft === 'string' ? o.sandboxDraft.slice(0, SANDBOX_DRAFT_MAX) : '' };
}
```
```ts
    byDomain: { ecommerce: readSlot(isRecord(d.byDomain) ? d.byDomain.ecommerce : undefined) },
```
  6. Id E-com theo mẫu: ở **mọi** chỗ Plan 8a nhận `DRILL_ID` (`completed`, `pickRecord`, `bossStep`), thêm `|| ECOM_ID.test(id)`. Neo: `grep -n "DRILL_ID" src/save.ts`. Nếu 8a chưa có: thêm hàm `const known_ = (known: Known, id: string): boolean => known.ticketIds.has(id) || ECOM_ID.test(id);` và dùng ở 3 chỗ đó (`pickRecord` kiểm `ticketOfKey(k)`).
  7. Thêm:
```ts
/** The one place a domain's dashboard and Sandbox draft are read or written (Plan 9): Logistics = the Save itself (v3 fields), E-com = byDomain.ecommerce. */
export const domainSlot = (save: Save, id: DomainId): DomainSlot => (id === 'ecommerce' ? save.byDomain.ecommerce : save);
```

- [ ] **Step 3: `tests/saveV3.test.ts`.** Chạy `npx vitest run tests/saveV3.test.ts`: test "SAVE_VERSION 3" dời sang `saveV4.test.ts` (xóa ở đây); test so nguyên một object v3 thì thêm `, MIGRATIONS, 3` vào `parseSave(...)`/`loadSave(...)` để giữ ngữ nghĩa v3 (import `MIGRATIONS`). Không sửa `tests/fixtures/save-v1/v2/v3.json`.

- [ ] **Step 4: xác nhận.** `npx vitest run tests/saveV4.test.ts tests/saveV3.test.ts tests/saveV2.test.ts tests/save.test.ts && npx tsc --noEmit && npm test`. Commit `feat(save): v4 with the e-commerce dashboard and Sandbox draft; e-commerce ids kept by pattern`.

---

### Task 6: Nối domain vào app (chuyển domain, schema, trang domain, chặn phần riêng Logistics)

**Files:** sửa `src/main.ts`, `src/ui/router.ts`, `src/state.ts`, `src/session.ts`, `src/ui/topbar.ts`, `src/ui/homeView.ts`, `src/ui/dashboard.ts`, `src/ui/dataView.ts`, `src/ui/mapStrip.ts`, `src/ui/stage.ts`, `src/ui/chapterView.ts`, `src/ui/brief.ts`, `src/ui/work.ts`, `src/ui/modes.ts`, `src/import/myData.ts`, `src/i18n/vi.ts`, `src/i18n/en.ts` (chỉ những file có chỗ khớp neo).

- [ ] **Step 1: `enterDomain` trong `src/main.ts`** (cạnh các handler `actions` khác; import `activeDomain`, `setActiveDomain`, `domainSchemaId`, `DOMAIN_KEY`, `isLiveDomain`, `type DomainId` từ `./domains`, `loadDomain` từ `./content`, `writeJson`/`readJson` từ `./storage`, `clearMemos` từ `./viz/memo`, `resetCards` từ `./dashboard` hoặc nơi Plan 5 đặt nó):
```ts
/**
 * Plan 9: open a live domain's pages. Loads its content (lazy chunk), sends every query that names no schema to the
 * domain's schema (seeding it once through ensure, queued ahead of later queries), and redraws. Caches keyed by SQL text
 * (EXPLAIN, steps, ER, dashboard cards) are cleared because the same text means other tables now.
 */
async function enterDomain(id: DomainId): Promise<void> {
  if (id === activeDomain()) return;
  showBanner('ecom.loading'); // the content.loading banner pattern of main.ts; hidden in finally
  try {
    await loadDomain(id);
  } catch {
    showBanner('ecom.failed');
    return;
  } finally {
    hideBanner('ecom.loading');
  }
  setActiveDomain(id);
  writeJson(DOMAIN_KEY, id);
  const schema = domainSchemaId(id);
  db.defaultSchema = schema;
  if (schema !== 'game') db.ensure(schema).catch(() => showBanner('ecom.failed'));
  clearMemos();
  resetCards();
  setMode({ kind: 'story' });   // Practice/Sandbox/drill of the other domain never carries over (session.ts)
  app.tickets = loadTickets();
  app.selectedId = firstOpen();
  rerender();
}
```
  Tên `showBanner`/`hideBanner`/`setMode` theo code hiện có (neo: `grep -n "content.loading\|content.failed" src/main.ts`, `grep -n "export function set.*Mode\|mode =" src/session.ts`). Gắn vào `actions` (`actions.enterDomain = enterDomain`) để router gọi.

- [ ] **Step 2: router.** Neo: `grep -n "hashchange\|function go\|currentRoute" src/ui/router.ts src/main.ts`. Ở chỗ xử lý mỗi lần hash đổi (và một lần lúc khởi động, **trước** lần render đầu): `const d = domainOfHash(location.hash); if (d) await actions.enterDomain(d);` rồi mới render trang. Lúc khởi động khi hash không phải trang domain: `const saved = readJson(DOMAIN_KEY); if (isLiveDomain(saved) && saved !== 'logistics') await enterDomain(saved);` (trang Chung giữ domain gần nhất, D9-12). Không có domain nào khác Logistics thì không làm gì (người chơi cũ không đổi gì).

- [ ] **Step 3: `Known` dựng từ Logistics.** Neo: `grep -n "const known: Known" src/main.ts`. Đổi `app.tickets.map((x) => x.id)` thành `loadTicketTemplates('logistics').map((x) => x.id)` (E-com theo mẫu `ECOM_ID`, Task 5; nếu dựng `Known` sau `enterDomain` mà dùng `app.tickets` thì sẽ bỏ mất id Logistics). `contentProblems(app.tickets)` lúc khởi động giữ nguyên (Logistics).

- [ ] **Step 4: schema theo domain ở mọi nơi.**
  - `src/session.ts` `activeSchema()` (Plan 8a): nhánh không phải drill trả `domainSchemaId()` thay `'game'`.
  - Mọi `erMeta(GAME_SCHEMA)` / `'${GAME_SCHEMA}'` trong `src/state.ts`, `src/main.ts` (autocomplete), `src/ui/brief.ts`, `src/ui/dataView.ts`, `src/ui/vizTabs.ts` → `domainSchemaName()`. Neo: `grep -rn "GAME_SCHEMA" src --include=*.ts | grep -v "src/db/\|src/domains.ts"`. **Giữ** `GAME_SCHEMA` ở `src/db/init.ts`, `src/db/import.ts` (seed Logistics, đường dẫn phiên) và ở bài học nhanh (`lessonSchema` = `'game'`).
  - `textValues` (`src/state.ts`): khóa memo thành `` `${domainSchemaName()}.${table}` `` và đọc `erMeta(domainSchemaName())`.
  - `src/import/myData.ts`: tập tên bảng game = kết quả `GAME_TABLES_SQL` (Logistics) **∪ `ECOM_TABLES`** (D9-15): `return new Set([...rows.map((r) => String(r[0])), ...ECOM_TABLES]);`.

- [ ] **Step 5: trang domain đọc dữ liệu của domain.** Neo: `grep -rn "CHAPTERS\b\|CHAPTER_TABLES\|KPIS\b\|tablesUnlocked(" src/ui src/state.ts src/overview.ts src/home.ts`. Ở **trang domain** (Tổng quan, Làm việc/brief/thanh việc, Dữ liệu, Bảng điều hành, thanh trên phần chương + bậc nghề): `CHAPTERS` → `chaptersOf()`, `CHAPTER_TABLES` → `chapterTablesOf()`, `KPIS` → `kpisOf()`. **Không đổi** ở trang Chung của Plan 8a (`#/learn…`, `#/practice`, drill): Lộ trình theo chương Logistics. Ô thẻ kỹ năng theo chương trên Tổng quan dùng `domainSkills(app.tickets)` khi `activeDomain() !== 'logistics'`.

- [ ] **Step 6: phần riêng Logistics.**
  - `src/state.ts` `unlockedTables()`: phần `laneTables(derive(app.tickets, done()).open)` chỉ khi `activeDomain() === 'logistics'`.
  - `src/ui/mapStrip.ts`: hộp thoại bản đồ ở E-com không có danh sách tuyến/bài tuyến (chỉ bản đồ, Task 7); chế độ `lane` không vào được từ E-com.
  - `src/ui/stage.ts` `playCompletion`: đầu hàm `if (activeDomain() !== 'logistics') { announce(t(ticket.beat === 'boss' ? 'ecom.promoted' : 'ecom.done', { title, rank })); return; }` (D9-14; `celebrate()` vẫn chạy ở `work.ts` như mọi lần đúng). Tên hàm announce theo `stage.ts`.
  - Trang chủ nền tảng (Plan 7 `renderHome`): thẻ domain dùng `domainHash(d.id)` cho mọi domain (thay `d.live ? hashOf('overview') : …`, vì `hashOf` giờ theo domain đang mở); dòng phụ của thẻ E-com: `t('ecom.homeLine', { n })` với `n` = số id `completed` khớp `ECOM_ID` (không cần tải nội dung).
  - Nút chọn domain trên thanh trên (Plan 7): mục đang chọn = `activeDomain()`.

- [ ] **Step 7: Save theo domain.** Neo: `grep -rn "save.dashboard\|\.sandboxDraft" src --include=*.ts | grep -v src/save.ts`. Mọi chỗ đọc/ghi → `domainSlot(save, activeDomain()).dashboard` / `.sandboxDraft` (import `domainSlot` từ `../save`). Card KPI ẩn (`hidden`) cũng theo slot.

- [ ] **Step 8: i18n** (thêm vào `vi.ts` và `en.ts` cùng lúc; `{…}` giống nhau):

| Khóa | VI | EN |
|---|---|---|
| `ecom.company` | Chợ Lồng Đèn | Lantern Market |
| `ecom.loading` | Đang chuẩn bị dữ liệu Chợ Lồng Đèn… | Preparing Lantern Market data… |
| `ecom.failed` | Chưa tải được dữ liệu Chợ Lồng Đèn. Mở lại trang domain để thử lại. | Could not load the Lantern Market data. Open the domain page again to retry. |
| `ecom.homeLine` | {n} việc đã xong | {n} tasks done |
| `ecom.done` | Xong việc: {title}. Thêm một kiện hàng lên kệ. | Task done: {title}. One more parcel on the shelf. |
| `ecom.promoted` | Lên bậc mới: {rank}. Thêm một thành phố giao hàng. | New step: {rank}. One more delivery city. |
| `ecom.scene.title` | Kho Chợ Lồng Đèn, Đà Nẵng | Lantern Market warehouse, Da Nang |
| `ecom.scene.label` | Cửa hàng và kho Chợ Lồng Đèn: {boxes} kiện hàng trên kệ | Lantern Market shop and warehouse: {boxes} parcels on the shelf |
| `ecom.scene.callout` | Mỗi việc xong là một kiện hàng lên kệ; mỗi lần thăng tiến mở thêm một thành phố giao hàng. | Every finished task puts a parcel on the shelf; every promotion opens one more delivery city. |
| `ecom.map.title` | Bản đồ giao hàng | Delivery map |
| `ecom.map.hub` | Kho Đà Nẵng | Da Nang warehouse |
| `ecom.map.open` | {name}: đang giao | {name}: delivering |
| `ecom.map.locked` | {name}: mở sau đánh giá thăng tiến chương {n} | {name}: opens after the chapter {n} promotion review |
| `ecom.map.label` | Bản đồ giao hàng từ kho Đà Nẵng: {cities} | Delivery map from the Da Nang warehouse: {cities} |
| `chat.thanksMarketing` | Hay quá, mình đưa vào kế hoạch chiến dịch luôn. | Great, this goes straight into the campaign plan. |
| `chat.thanksCategory` | Cảm ơn bạn, ngành hàng dùng số này cho đợt xếp hàng tuần này. | Thanks, the category team uses this for this week's line-up. |

  Chữ tên công ty trên Tổng quan/màn chào ở E-com: chỗ nào in "Cargo Query Logistics" cho trang domain (neo: `grep -rn "Cargo Query Logistics" src/i18n/vi.ts`), chọn khóa theo domain (`activeDomain() === 'ecommerce' ? 'ecom.company' : <khóa cũ>`).

- [ ] **Step 9: xác nhận.** `npx tsc --noEmit && npm test`. Kiểm tay (Edge :5174, save mới, rồi save có tiến độ Logistics):
  1. Trang chủ → thẻ E-commerce → `#/d/ecommerce`: dòng "Đang chuẩn bị dữ liệu Chợ Lồng Đèn…", rồi Tổng quan có 6 chương, bậc "Thực tập sinh DA", người gửi đúng phòng/màu.
  2. Làm việc: ecom-ch1-01 có ví dụ mẫu chạy được, tab Cột chỉ có 5 bảng chương 1 (`categories, customers, products, reviews, sellers`), ER đúng schema `ecom`; Chạy `SELECT * FROM shipments` → lỗi 42P01 có giải thích (bảng Logistics không lộ sang E-com).
  3. Nộp đúng → `celebrate`, câu announce E-com, không dock cảng; thanh việc chuyển việc 2; hộp thoại bản đồ không có danh sách tuyến.
  4. Sandbox E-com: nháp riêng; nhập một CSV `orders.csv` → bảng `orders_my`; `SELECT * FROM orders_my` chạy.
  5. Bảng điều hành E-com: ô KPI E-com (khóa tới khi xong việc nguồn), ghim một card → quay về Logistics: card E-com không hiện, card Logistics còn.
  6. `#/d/logistics/play` ↔ `#/d/ecommerce/play` qua lại: editor, việc, tab Cột, EXPLAIN đổi theo domain; tải lại trang ở `#/learn` vẫn nhớ domain gần nhất (nút domain).
  7. Timeout: ở E-com chạy `SELECT pg_sleep(6)` → DB khởi động lại, query E-com kế tiếp vẫn chạy (re-ensure của Plan 8a).
- [ ] **Step 10: commit** `feat(ecom): open the e-commerce domain (switch, schema per domain, per-domain pages, saves and guards)`.

---

### Task 7: Cảnh kho + cửa hàng và bản đồ giao hàng (chunk `art/ecommerce`)

**Files:** tạo `src/art/ecommerce.ts`, `tests/ecomArt.test.ts`; sửa `src/art/load.ts`, `src/ui/homeView.ts`, `src/ui/mapStrip.ts`, `scripts/check-budget.mjs`.

- [ ] **Step 1: test trước** — tạo `tests/ecomArt.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { CITIES, openCities } from '../src/art/ecommerce';
import { ecomRunner } from './helpers';

describe('bản đồ giao hàng E-com (Plan 9 D9-13)', () => {
  it('mỗi thành phố trên bản đồ là thành phố giao hàng có thật trong seed', async () => {
    const r = await (await ecomRunner())('SELECT DISTINCT city FROM deliveries ORDER BY 1');
    expect(CITIES.map((c) => c.name).sort()).toEqual(r.rows.map((x) => String(x[0])));
  });

  it('Da Nang và Hue mở từ đầu; mỗi chương 1–5 mở đúng một thành phố', () => {
    expect([...openCities(new Set())].sort()).toEqual(['Da Nang', 'Hue']);
    for (let ch = 1; ch <= 5; ch++) expect(CITIES.filter((c) => c.opens === ch)).toHaveLength(1);
    expect(openCities(new Set([1, 2, 3, 4, 5, 6])).size).toBe(CITIES.length);
  });
});
```
- [ ] **Step 2:** tạo `src/art/ecommerce.ts` = **Phụ lục D** nguyên văn.
- [ ] **Step 3: `src/art/load.ts`** (Plan 8b) thêm:
```ts
import type * as Ecommerce from './ecommerce';
export type EcommerceArt = typeof Ecommerce;
let ecomArt: Promise<EcommerceArt> | undefined;
/** The Lantern Market scene and delivery map (Plan 9): one lazy chunk. A failed load is dropped so the next call retries. */
export function loadEcomArt(): Promise<EcommerceArt> {
  ecomArt ??= import('./ecommerce').catch((e) => {
    ecomArt = undefined;
    throw e;
  });
  return ecomArt;
}
```
- [ ] **Step 4: 3 chỗ vẽ** (cùng mẫu khung giữ chỗ + `isConnected` của Plan 8b T1 Step 5). Trạng thái chung: `const st = { passed: derive(app.tickets, done()).passed, done: app.tickets.filter((x) => done().has(x.id)).length };`
  - Tổng quan (section cảnh, `homeView.ts`): `activeDomain() === 'ecommerce'` → khung `aspect-[1100/400]`, `loadEcomArt().then((a) => frame.replaceWith(a.storeScene(st)))`; tiêu đề `t('ecom.scene.title')`, dòng HTML `t('ecom.scene.callout')` (dưới `lg` thay chữ SVG, L35).
  - Trang Bản đồ (`#/d/ecommerce/map`) và section tuyến trên Tổng quan: khung `aspect-[980/300]` → `a.deliveryMap(st)`, kèm danh sách HTML `a.deliveryItems(st)` (dưới `lg`) và tiêu đề `t('ecom.map.title')`. Không danh sách bài tuyến.
  - Hộp thoại bản đồ (`mapStrip.ts`): E-com → `a.deliveryMap(st)` thay `routeMap`, bỏ khối tuyến/hồ sơ tuyến.
  - Tải lỗi: giữ khung + dòng HTML (không trang trắng, không lỗi console).
- [ ] **Step 5: ngân sách:** `['ecomart', /^ecommerce-/, 10], // Plan 9: art/ecommerce (store scene, delivery map), lazy` trước `rest`.
- [ ] **Step 6: xác nhận.** `npx vitest run tests/ecomArt.test.ts tests/theme.test.ts && npx tsc --noEmit && npm test`; build + budget (`ecomart` ≤ 10, `main` không tăng vì chunk lười). Kiểm tay sáng/tối, 1440/1100/375: cảnh có số kiện = số việc đã xong, màu theo chương; bản đồ mở thêm Ha Noi sau đánh giá chương 1 (dùng Xuất/Nhập tiến độ với save có `ecom-ch1-05`); chữ SVG ẩn dưới `lg`, danh sách HTML hiện; trình đọc màn hình đọc `aria-label` của bản đồ.
- [ ] **Step 7: commit** `feat(art): Lantern Market shop and warehouse scene, delivery map (lazy chunk)`.

---

### Task 8: Tài liệu, kiểm toàn bộ, đo trên trình duyệt

**Files:** sửa `CLAUDE.md`, `docs/team/review-log.md`.

- [ ] **Step 1: `CLAUDE.md`** thêm mục **"Domain E-commerce (Plan 9)"** (ngắn, như các mục khác):
  - Chợ Lồng Đèn / Lantern Market, `content/domains/ecom/` (ticket `ecom-chN-0M`, `chapters.yml` có `tables:`, `people.yml`, `kpis.yml`), chunk `ecomSources` tải khi mở domain (`loadDomain`), id giữ trong Save theo `ECOM_ID`.
  - Schema `ecom`: `src/db/ecom/{schema,seed}.sql` (móc cốt truyện ở đầu `seed.sql`, khối mới nối cuối, `setseed()` riêng, md5 ghim ở `tests/ecomSeed.test.ts`), seed lười qua `ensure('ecom')` (chunk `ecomSeed`), `search_path` theo request `ecom, sandbox`, `DbClient.defaultSchema` theo domain đang mở.
  - `activeDomain()` (`src/domains.ts`), `enterDomain()` (`main.ts`), `chaptersOf/chapterTablesOf/kpisOf/peopleOf/domainSkills`; trang Chung vẫn theo Logistics.
  - Save v4 `byDomain.ecommerce`, `domainSlot()`; fixture v1–v4 giữ mãi.
  - Luật nội dung E-com (`tests/ecomContent.test.ts`): teach worked mọi chương, biến thể ≥ 3 cho mọi kỹ năng trừ `select`, đề cấm thêm `OVER/PARTITION/CASE/WITH`.
  - Art: `src/art/ecommerce.ts` (chunk `ecomart`), không hoạt cảnh hoàn thành ở E-com.
  - Ngân sách `ecom` 50, `ecomseed` 10, `ecomart` 10.
- [ ] **Step 2:** `npx tsc --noEmit && npm test && npm run build && node scripts/check-budget.mjs`. Ghi bảng ngân sách (main, ecom, ecomseed, ecomart, worker) vào `docs/team/review-log.md` mục Plan 9.
- [ ] **Step 3: đo (D9-8).** Bản build (`npm run preview -- --port 5174 --strictPort`), Edge, máy rảnh, 3 lần: thời gian từ bấm thẻ E-commerce tới Tổng quan có số (DevTools Performance hoặc `performance.mark` quanh `ensure`). Ghi vào `review-log.md`. Vượt 15 s → báo orchestrator (đề xuất v12: worker seed domain đã nhớ trước).
- [ ] **Step 4: đi trọn E-com** (save mới, Edge): 30 việc theo thứ tự bằng đáp án trong ticket (gõ Solution), mỗi đánh giá thăng tiến đủ bước + câu kết luận; chức danh đổi ở C1/C3/C6 (Junior DA → Data Analyst → Senior DA); bản đồ mở 5 thành phố; Ôn tập (Leitner) có thẻ kỹ năng từ việc E-com; Luyện tập một việc E-com chạy biến thể khác. Ghi lỗi vào `review-log.md`, sửa, chạy lại test.
- [ ] **Step 5: commit** `docs: Plan 9 e-commerce domain in CLAUDE.md; budgets and browser timings`.

## Rủi ro

| Rủi ro | Giảm thiểu |
|---|---|
| Code của Plan 7/8a/8b khác tên dự kiến (plan viết khi chúng chưa build) | Mọi bước có neo `grep`; luật L7 (áp ý, ghi lệch vào commit); Task 0 kiểm trước. |
| Mở E-com lần đầu chậm trên trình duyệt (seed Logistics + `ecom`, D9-8/D9-10) | Dòng "Đang chuẩn bị…"; seed lười chỉ một lần mỗi phiên; Task 8 đo; v12 seed theo domain đã nhớ. |
| Quên đổi một chỗ `CHAPTERS`/`KPIS`/`save.dashboard` → trang E-com hiện số Logistics | Neo grep ở Task 6 Step 5/7; kiểm tay Step 9 mục 1–6; `contentProblems`/`kpisOf` có test. |
| Bộ nhớ đệm theo chuỗi SQL (EXPLAIN, steps, ER, card) trả kết quả domain kia | `clearMemos()` + `resetCards()` trong `enterDomain`; `erMeta` khóa theo tên schema. |
| Trùng tên bảng giữa schema (`customers`, `payments`, `orders`) làm query chạy nhầm schema | Đường dẫn theo request; Logistics không có `ecom` trong path và ngược lại; test 42P01 ở kiểm tay Step 9.2. |
| Timeout khởi động lại worker quên seed `ecom` | Re-ensure sau `restart()` của Plan 8a (cùng hàng đợi); kiểm tay Step 9.7. |
| `main` vượt 290 KB | Mã domain chỉ ~2–3 KB; nếu vượt: dời `enterDomain` + phần Tổng quan E-com vào chunk của art/ecom (luật dừng L59). |
| Seed máy yếu vượt luật dừng 2,0 s Node | Đo lúc máy rảnh; muốn giảm: bớt `web_sessions` duyệt (18.000) trước, chạy lại `tests/ecomContent.test.ts` (mọi kết quả ticket được kiểm tự động, kết luận đánh giá thăng tiến phải đọc lại). |

---

## Phụ lục A · `src/db/ecom/schema.sql`

```sql
-- Chợ Lồng Đèn (Lantern Market): e-commerce domain, schema `ecom` (Plan 9).
-- Created by initDb after `SET search_path TO ecom`; table names are bare, like the Logistics schema.
-- Money is VND (numeric(12,0)). Status/method/reason codes are lowercase ASCII words.

CREATE TABLE categories (
  id        int PRIMARY KEY,
  name      text NOT NULL UNIQUE,
  parent_id int REFERENCES categories(id)
);

CREATE TABLE sellers (
  id          int PRIMARY KEY,
  name        text NOT NULL,
  city        text NOT NULL,
  joined_on   date NOT NULL,
  is_official boolean NOT NULL
);

CREATE TABLE products (
  id          int PRIMARY KEY,
  sku         text NOT NULL UNIQUE,
  name        text NOT NULL,
  category_id int NOT NULL REFERENCES categories(id),
  seller_id   int NOT NULL REFERENCES sellers(id),
  price       numeric(12,0) NOT NULL,
  cost        numeric(12,0) NOT NULL,
  launched_on date NOT NULL,
  is_active   boolean NOT NULL
);

CREATE TABLE customers (
  id          int PRIMARY KEY,
  full_name   text NOT NULL,
  email       text NOT NULL UNIQUE,
  city        text NOT NULL,
  signup_date date NOT NULL,
  birth_year  int,                       -- NULL: not given at signup
  channel     text NOT NULL              -- ads | organic | social | referral (how they first came)
);

CREATE TABLE vouchers (
  id           int PRIMARY KEY,
  code         text NOT NULL UNIQUE,
  campaign     text NOT NULL,
  discount_pct int NOT NULL,
  min_order    numeric(12,0) NOT NULL,
  starts_on    date NOT NULL,
  ends_on      date NOT NULL
);

CREATE TABLE orders (
  id           int PRIMARY KEY,
  code         text NOT NULL UNIQUE,
  customer_id  int NOT NULL REFERENCES customers(id),
  ordered_at   timestamp NOT NULL,
  status       text NOT NULL,            -- pending | shipping | delivered | cancelled
  voucher_id   int REFERENCES vouchers(id),
  shipping_fee numeric(12,0) NOT NULL,
  platform     text NOT NULL             -- app | web
);

CREATE TABLE order_items (
  order_id   int NOT NULL REFERENCES orders(id),
  line_no    int NOT NULL,
  product_id int NOT NULL REFERENCES products(id),
  quantity   int NOT NULL,
  unit_price numeric(12,0) NOT NULL,
  PRIMARY KEY (order_id, line_no)
);

CREATE TABLE payments (
  id       int PRIMARY KEY,
  order_id int NOT NULL REFERENCES orders(id),
  method   text NOT NULL,                -- cod | ewallet | card | bank_transfer
  amount   numeric(12,0) NOT NULL,
  status   text NOT NULL,                -- paid | failed | refunded
  paid_at  timestamp                     -- NULL unless paid or refunded
);

CREATE TABLE deliveries (
  order_id     int PRIMARY KEY REFERENCES orders(id),
  courier      text NOT NULL,
  city         text NOT NULL,
  shipped_on   date NOT NULL,
  promised_on  date NOT NULL,
  delivered_on date                      -- NULL: still on the way
);

CREATE TABLE returns (
  id           int PRIMARY KEY,
  order_id     int NOT NULL REFERENCES orders(id),
  product_id   int NOT NULL REFERENCES products(id),
  requested_on date NOT NULL,
  reason       text NOT NULL,            -- damaged | wrong_item | changed_mind | late
  refund       numeric(12,0) NOT NULL,
  status       text NOT NULL             -- approved | rejected
);

CREATE TABLE reviews (
  id         int PRIMARY KEY,
  order_id   int NOT NULL REFERENCES orders(id),
  product_id int NOT NULL REFERENCES products(id),
  rating     int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_on date NOT NULL,
  comment    text                        -- NULL: stars only
);

CREATE TABLE web_sessions (
  id             int PRIMARY KEY,
  customer_id    int REFERENCES customers(id),   -- NULL: guest
  started_at     timestamp NOT NULL,
  device         text NOT NULL,                  -- mobile | desktop
  source         text NOT NULL,                  -- ads | organic | social | email
  viewed_product boolean NOT NULL,
  added_to_cart  boolean NOT NULL,
  order_id       int REFERENCES orders(id)       -- set when the session ended in an order
);

CREATE TABLE ad_spend (
  month   date NOT NULL,                 -- first day of the month
  channel text NOT NULL,                 -- ads | social | referral
  amount  numeric(14,0) NOT NULL,
  PRIMARY KEY (month, channel)
);
```

## Phụ lục B · `src/db/ecom/seed.sql`

```sql
-- Chợ Lồng Đèn (Lantern Market) seed, schema `ecom` (Plan 9). Deterministic: every random block starts with its own
-- setseed(), so a block appended later never re-rolls an earlier one. Append new blocks at the END.
-- Game "today" = 2026-10-31 (same as Logistics). Solutions use literal dates, never CURRENT_DATE/now().
-- Story hooks (tickets and tests/ecomSeed.test.ts depend on them):
--   * 12% of customers never order (anti join, E3)
--   * Retention by first channel: referral > organic > social > ads (cohort/window, E6; CAC in E5 boss)
--   * Sale days 2025-09-09, 2025-10-10, 2025-11-11, 2025-12-12, 2026-09-09, 2026-10-10: ~300 extra orders each,
--     most with that day's voucher (date_bucket, window_lag)
--   * Courier "Kite Logistics" is late in the central cities (Da Nang, Hue, Nha Trang) for parcels shipped from
--     2026-09-01: 60% arrive 3-7 days after the promised date (date_math, E4)
--   * Cash on delivery (cod) orders that were cancelled, or are not delivered yet, have NO payment row (left join, E3)
--   * Some card payments fail first: one 'failed' row, then a 'paid' row for the same order (join fan-out trap, E3)
--   * Seller 7 (Highland Gadget Hub): phones/audio items delivered in Q3 2026 come back 'damaged' ~25% of the time and
--     get low ratings (returns, E5 / E6)
--   * birth_year is NULL for ~25% of customers, reviews.comment is NULL for ~45% (null_logic / coalesce, E4)
--   * orders placed on 2026-10-30/31 are 'pending' (no delivery row); orders shipped and not delivered by 2026-10-31
--     are 'shipping' with delivered_on NULL

INSERT INTO categories VALUES
  (1, 'Electronics', NULL),
  (2, 'Phones & Tablets', 1),
  (3, 'Audio', 1),
  (4, 'Home & Kitchen', NULL),
  (5, 'Cookware', 4),
  (6, 'Bedding', 4),
  (7, 'Fashion', NULL),
  (8, 'Women Fashion', 7),
  (9, 'Men Fashion', 7),
  (10, 'Beauty', NULL),
  (11, 'Skincare', 10),
  (12, 'Books & Stationery', NULL),
  (13, 'Toys & Baby', NULL),
  (14, 'Groceries', NULL);

-- 40 sellers, 5 per kind of shop (ids 1-5 Lantern Craft, 6-10 Gadget Hub, ...); seller 7 is the returns hook.
INSERT INTO sellers (id, name, city, joined_on, is_official)
SELECT i,
  (ARRAY['Hoi An','Saigon','Ha Noi','Da Nang','Mekong','Hue','Highland','Coastal','Lotus','Bamboo'])[1 + (i - 1) % 10] || ' ' ||
  (ARRAY['Lantern Craft','Gadget Hub','Home Corner','Style Studio','Green Pantry','Book Nook','Kids Planet','Beauty Lab'])[1 + (i - 1) / 5],
  (ARRAY['Da Nang','Ho Chi Minh City','Ha Noi','Da Nang','Can Tho','Hue','Ha Noi','Nha Trang','Ho Chi Minh City','Hai Phong'])[1 + (i - 1) % 10],
  DATE '2023-03-01' + (i * 37) % 700,
  i % 4 = 1
FROM generate_series(1, 40) i;

INSERT INTO vouchers VALUES
  (1, 'NEWUSER10', 'New customer', 10, 0, '2025-01-01', '2026-12-31'),
  (2, 'BDAY5', 'Birthday', 5, 100000, '2025-01-01', '2026-12-31'),
  (3, 'SALE99-25', '9.9 Sale 2025', 15, 200000, '2025-09-09', '2025-09-09'),
  (4, 'SALE1010-25', '10.10 Sale 2025', 15, 200000, '2025-10-10', '2025-10-10'),
  (5, 'SALE1111-25', '11.11 Sale 2025', 20, 300000, '2025-11-11', '2025-11-11'),
  (6, 'SALE1212-25', '12.12 Sale 2025', 15, 200000, '2025-12-12', '2025-12-12'),
  (7, 'TET-26', 'Tet Sale 2026', 10, 150000, '2026-02-01', '2026-02-10'),
  (8, 'SALE99-26', '9.9 Sale 2026', 15, 200000, '2026-09-09', '2026-09-09'),
  (9, 'SALE1010-26', '10.10 Sale 2026', 20, 300000, '2026-10-10', '2026-10-10'),
  (10, 'BACK2SCHOOL', 'Back to school 2026', 10, 100000, '2026-08-15', '2026-09-05');

SELECT setseed(0.111);
-- 400 products in the 10 leaf categories; products 1-100 launched in 2024, the rest spread to 2026-09.
INSERT INTO products (id, sku, name, category_id, seller_id, price, cost, launched_on, is_active)
SELECT i,
  'SKU' || lpad(i::text, 5, '0'),
  (ARRAY['Classic','Smart','Mini','Premium','Eco','Daily','Pro','Soft','Bright','Lucky'])[1 + floor(random() * 10)::int] || ' ' ||
  (ARRAY['Phone','Earbuds','Pan','Pillow','Dress','Shirt','Serum','Notebook','Puzzle','Coffee'])[1 + (i - 1) % 10] || ' ' || lpad(i::text, 3, '0'),
  (ARRAY[2, 3, 5, 6, 8, 9, 11, 12, 13, 14])[1 + (i - 1) % 10],
  -- the shop kind that sells this category (Gadget Hub sells phones and audio, ...), one of its 5 shops
  (ARRAY[6, 6, 11, 1, 16, 16, 36, 26, 31, 21])[1 + (i - 1) % 10] + (i / 10) % 5,
  round(((ARRAY[4500000, 650000, 420000, 280000, 350000, 260000, 310000, 60000, 190000, 120000])[1 + (i - 1) % 10]
        * (0.5 + random()))::numeric, -3),
  0,
  CASE WHEN i <= 100 THEN DATE '2024-06-01' + floor(random() * 200)::int ELSE DATE '2025-01-01' + floor(random() * 620)::int END,
  random() > 0.08
FROM generate_series(1, 400) i;
UPDATE products SET cost = round(price * (0.55 + (id % 7) * 0.04), -3);

SELECT setseed(0.222);
-- 5000 customers signed up 2025-01-01 .. 2026-10-24, growing over time.
INSERT INTO customers (id, full_name, email, city, signup_date, birth_year, channel)
SELECT i,
  (ARRAY['Nguyễn','Trần','Lê','Phạm','Hoàng','Huỳnh','Phan','Vũ','Võ','Đặng','Bùi','Đỗ','Hồ','Ngô','Dương','Lý'])[1 + floor(random() * 16)::int] || ' ' ||
  (ARRAY['Văn','Thị','Minh','Ngọc','Thanh','Quốc','Gia','Hoài'])[1 + floor(random() * 8)::int] || ' ' ||
  (ARRAY['An','Bảo','Chi','Duy','Giang','Hà','Hải','Hân','Hiếu','Hoa','Huy','Khang','Khoa','Lam','Linh','Long','Mai','Minh',
         'My','Nam','Nhi','Phúc','Quân','Quyên','Sơn','Tâm','Thảo','Trang','Tú','Vy'])[1 + floor(random() * 30)::int],
  'user' || i || '@mail.example',
  (ARRAY['Ho Chi Minh City','Ho Chi Minh City','Ho Chi Minh City','Ha Noi','Ha Noi','Ha Noi','Da Nang','Da Nang',
         'Hai Phong','Can Tho','Hue','Nha Trang'])[1 + floor(random() * 12)::int],
  DATE '2025-01-01' + floor(661 * sqrt(random()))::int,
  CASE WHEN random() < 0.25 THEN NULL ELSE 1968 + floor(random() * 39)::int END,
  (ARRAY['ads','ads','ads','ads','ads','ads','ads','organic','organic','organic','organic','organic','organic',
         'social','social','social','social','referral','referral','referral'])[1 + floor(random() * 20)::int]
FROM generate_series(1, 5000) i;

-- Monthly marketing spend (no random): referral = a 50,000 VND bonus per referral signup of that month.
INSERT INTO ad_spend (month, channel, amount)
SELECT m, 'ads', 90000000 + 3000000 * (extract(year FROM m) * 12 + extract(month FROM m) - 24301)
                 + CASE WHEN extract(month FROM m) IN (9, 10, 11, 12) THEN 40000000 ELSE 0 END
FROM generate_series(DATE '2025-01-01', DATE '2026-10-01', interval '1 month') m
UNION ALL
SELECT m, 'social', 45000000 + 1500000 * (extract(year FROM m) * 12 + extract(month FROM m) - 24301)
FROM generate_series(DATE '2025-01-01', DATE '2026-10-01', interval '1 month') m
UNION ALL
SELECT date_trunc('month', signup_date)::date, 'referral', 50000 * count(*)
FROM customers WHERE channel = 'referral' GROUP BY 1;

SELECT setseed(0.333);
-- Orders: each customer orders n times (0 for 12%), mean by first channel; plus the sale-day rush.
-- Built in a temp table so payments and deliveries can reuse the same random draws.
CREATE TEMP TABLE _o AS
WITH cust AS (
  SELECT id, signup_date, city, channel, random() AS r_n, random() AS r_gap, random() AS r_first
  FROM customers ORDER BY id
), slots AS (
  SELECT c.id AS customer_id, c.city, k,
    c.signup_date + floor(c.r_first * 7)::int
      + floor(k * (20 + c.r_gap * 60))::int + floor(random() * 9)::int - 4 AS d,
    random() AS r_hour, random() AS r_pay, random() AS r_cancel, random() AS r_ship, random() AS r_late,
    random() AS r_courier, random() AS r_v, random() AS r_plat
  FROM cust c, generate_series(0, 23) k
  WHERE c.r_n >= 0.12
    AND k < 1 + floor(-ln(1 - (c.r_n - 0.12) / 0.88)
                * CASE c.channel WHEN 'ads' THEN 0.9 WHEN 'social' THEN 1.8 WHEN 'organic' THEN 3.2 ELSE 4.5 END)::int
), sale AS (
  SELECT s.day, g, random() AS r_c, random() AS r_hour, random() AS r_pay, random() AS r_cancel, random() AS r_ship,
    random() AS r_late, random() AS r_courier, random() AS r_v, random() AS r_plat
  FROM unnest(ARRAY[DATE '2025-09-09', DATE '2025-10-10', DATE '2025-11-11', DATE '2025-12-12', DATE '2026-09-09', DATE '2026-10-10']) s(day),
       generate_series(1, 300) g
), cr AS (
  SELECT id, city, row_number() OVER (ORDER BY signup_date, id)::int AS rn FROM customers
), before_day AS MATERIALIZED (
  SELECT day, (SELECT count(*) FROM customers WHERE signup_date < day)::int AS n
  FROM unnest(ARRAY[DATE '2025-09-09', DATE '2025-10-10', DATE '2025-11-11', DATE '2025-12-12', DATE '2026-09-09', DATE '2026-10-10']) day
), sale_p AS (
  SELECT s.*, 1 + floor(s.r_c * b.n)::int AS pick FROM sale s JOIN before_day b ON b.day = s.day
), sale_c AS (
  -- a random customer among those who had signed up before the sale day
  SELECT s.*, c.id AS customer_id, c.city
  FROM sale_p s JOIN cr c ON c.rn = s.pick
), allo AS (
  SELECT customer_id, city, d, 0 AS src, k, r_hour, r_pay, r_cancel, r_ship, r_late, r_courier, r_v, r_plat FROM slots WHERE d <= DATE '2026-10-31'
  UNION ALL
  SELECT customer_id, city, day, 1, g, r_hour, r_pay, r_cancel, r_ship, r_late, r_courier, r_v, r_plat FROM sale_c
), t AS (
  SELECT a.*,
    a.d + make_interval(hours => 7 + floor(16 * power(a.r_hour, 0.6))::int, mins => floor(a.r_hour * 6000)::int % 60) AS ordered_at,
    CASE WHEN a.r_pay < 0.40 THEN 'cod' WHEN a.r_pay < 0.70 THEN 'ewallet' WHEN a.r_pay < 0.90 THEN 'card' ELSE 'bank_transfer' END AS method,
    a.r_cancel < CASE WHEN a.r_pay < 0.40 THEN 0.12 ELSE 0.05 END AS cancelled,
    CASE WHEN a.city IN ('Da Nang', 'Hue', 'Nha Trang') AND a.r_courier < 0.35 THEN 'Lantern Fleet'
         WHEN a.r_courier < 0.70 THEN 'BeeRun Express' ELSE 'Kite Logistics' END AS courier,
    CASE a.city WHEN 'Da Nang' THEN 1 WHEN 'Hue' THEN 2 WHEN 'Nha Trang' THEN 2 WHEN 'Can Tho' THEN 4 ELSE 3 END AS lead_days
  FROM allo a
)
SELECT row_number() OVER (ORDER BY ordered_at, customer_id, src, k)::int AS id, t.*,
  d + floor(r_ship * 2.5)::int AS shipped_on
FROM t;

INSERT INTO orders (id, code, customer_id, ordered_at, status, voucher_id, shipping_fee, platform)
SELECT id,
  'LD' || to_char(ordered_at, 'YYMMDD') || lpad(id::text, 6, '0'),
  customer_id, ordered_at,
  'pending',   -- set below, once delivery dates are known
  CASE WHEN src = 1 AND r_v < 0.7 THEN (SELECT v.id FROM vouchers v WHERE v.starts_on = d AND v.code LIKE 'SALE%')
       WHEN d BETWEEN DATE '2026-02-01' AND DATE '2026-02-10' AND r_v < 0.4 THEN 7
       WHEN d BETWEEN DATE '2026-08-15' AND DATE '2026-09-05' AND r_v < 0.25 THEN 10
       WHEN k = 0 AND src = 0 AND r_v < 0.35 THEN 1
       WHEN r_v > 0.97 THEN 2 END,
  0,
  CASE WHEN r_plat < 0.68 THEN 'app' ELSE 'web' END
FROM _o ORDER BY id;

SELECT setseed(0.444);
-- 1-4 lines per order; popular products are picked more often; a product is never sold before its launch.
WITH lines AS (
  SELECT o.id AS order_id, o.ordered_at::date AS d, l AS line_no, random() AS r_p, random() AS r_q
  FROM orders o, generate_series(1, 4) l
  WHERE l <= 1 + floor(power(((o.id * 7919) % 1000) / 1000.0, 2) * 4)::int
)
INSERT INTO order_items (order_id, line_no, product_id, quantity, unit_price)
SELECT l.order_id, l.line_no, p.id,
  CASE WHEN l.r_q < 0.75 THEN 1 WHEN l.r_q < 0.93 THEN 2 ELSE 3 END,
  p.price
FROM lines l
JOIN products p0 ON p0.id = 1 + floor(400 * power(l.r_p, 1.4))::int
JOIN products p ON p.id = CASE WHEN p0.launched_on <= l.d THEN p0.id ELSE 1 + (p0.id - 1) % 100 END
ORDER BY l.order_id, l.line_no;

-- A voucher only applies when the items reach its minimum; shipping is free from 300,000 VND.
WITH tot AS (SELECT order_id, sum(quantity * unit_price) AS items FROM order_items GROUP BY order_id)
UPDATE orders o SET
  voucher_id = CASE WHEN v.min_order <= tot.items THEN o.voucher_id END,
  shipping_fee = CASE WHEN tot.items >= 300000 THEN 0
                      WHEN c.city IN ('Da Nang', 'Hue') THEN 15000 ELSE 30000 END
FROM tot, customers c, orders o2 LEFT JOIN vouchers v ON v.id = o2.voucher_id
WHERE tot.order_id = o.id AND c.id = o.customer_id AND o2.id = o.id;

-- Deliveries: Kite Logistics runs late in the central cities from 2026-09-01 (hook).
INSERT INTO deliveries (order_id, courier, city, shipped_on, promised_on, delivered_on)
SELECT x.id, x.courier, x.city, x.shipped_on, x.shipped_on + x.lead_days,
  CASE WHEN x.arrive > DATE '2026-10-31' THEN NULL ELSE x.arrive END
FROM (
  SELECT _o.*, shipped_on + lead_days +
    CASE WHEN courier = 'Kite Logistics' AND city IN ('Da Nang', 'Hue', 'Nha Trang') AND shipped_on >= DATE '2026-09-01' AND r_late < 0.6
           THEN 3 + floor(r_late * 8.3)::int
         WHEN r_late < 0.35 THEN -1 WHEN r_late < 0.78 THEN 0 WHEN r_late < 0.92 THEN 1 ELSE 2 + floor((r_late - 0.92) * 30)::int END AS arrive
  FROM _o
) x
WHERE NOT x.cancelled AND x.d < DATE '2026-10-30' AND x.shipped_on <= DATE '2026-10-31'
ORDER BY x.id;

UPDATE orders o SET status = CASE
    WHEN x.cancelled THEN 'cancelled'
    WHEN dl.order_id IS NULL THEN 'pending'
    WHEN dl.delivered_on IS NULL THEN 'shipping'
    ELSE 'delivered' END
FROM _o x LEFT JOIN deliveries dl ON dl.order_id = x.id
WHERE x.id = o.id;

-- Payments: cod is paid on delivery (no row before that, none when cancelled); prepaid orders pay at checkout,
-- 6% of card payments fail once first; a cancelled prepaid order is refunded.
WITH due AS (
  SELECT o.id AS order_id, x.method, o.status, o.ordered_at, dl.delivered_on, x.r_hour,
    round(sum(i.quantity * i.unit_price) * (100 - coalesce(v.discount_pct, 0)) / 100.0, -3) + o.shipping_fee AS amount
  FROM orders o
  JOIN _o x ON x.id = o.id
  JOIN order_items i ON i.order_id = o.id
  LEFT JOIN vouchers v ON v.id = o.voucher_id
  LEFT JOIN deliveries dl ON dl.order_id = o.id
  GROUP BY o.id, x.method, o.status, o.ordered_at, dl.delivered_on, x.r_hour, v.discount_pct
), rows AS (
  SELECT order_id, 0 AS attempt, 'card' AS method, amount, 'failed' AS status, NULL::timestamp AS paid_at
  FROM due WHERE method = 'card' AND (order_id * 31) % 100 < 6
  UNION ALL
  SELECT order_id, 1, method, amount,
    CASE WHEN status = 'cancelled' THEN 'refunded' ELSE 'paid' END,
    CASE WHEN method = 'cod' THEN delivered_on + time '18:00' ELSE ordered_at + make_interval(mins => 1 + floor(r_hour * 50)::int) END
  FROM due
  WHERE method <> 'cod' OR status = 'delivered'
)
INSERT INTO payments (id, order_id, method, amount, status, paid_at)
SELECT row_number() OVER (ORDER BY order_id, attempt)::int, order_id, method, amount, status, paid_at
FROM rows ORDER BY order_id, attempt;

SELECT setseed(0.555);
-- Returns and reviews on delivered items. Seller 7's phones/audio delivered in Q3 2026 come back damaged (hook).
CREATE TEMP TABLE _i AS
SELECT i.order_id, i.line_no, i.product_id, i.quantity, i.unit_price, dl.delivered_on, dl.delivered_on - dl.promised_on AS late,
  p.seller_id = 7 AND dl.delivered_on >= DATE '2026-07-01' AND dl.delivered_on < DATE '2026-10-01' AS bad_batch,
  random() AS r_ret, random() AS r_why, random() AS r_ok, random() AS r_rev, random() AS r_star, random() AS r_txt, random() AS r_day
FROM order_items i
JOIN orders o ON o.id = i.order_id AND o.status = 'delivered'
JOIN deliveries dl ON dl.order_id = i.order_id
JOIN products p ON p.id = i.product_id
ORDER BY i.order_id, i.line_no;

INSERT INTO returns (id, order_id, product_id, requested_on, reason, refund, status)
SELECT row_number() OVER (ORDER BY order_id, line_no)::int, order_id, product_id,
  LEAST(delivered_on + 1 + floor(r_day * 10)::int, DATE '2026-10-31'),
  CASE WHEN bad_batch AND r_why < 0.85 THEN 'damaged'
       WHEN late >= 3 AND r_why < 0.6 THEN 'late'
       WHEN r_why < 0.3 THEN 'damaged' WHEN r_why < 0.5 THEN 'wrong_item' WHEN r_why < 0.85 THEN 'changed_mind' ELSE 'late' END,
  CASE WHEN r_ok < 0.85 THEN quantity * unit_price ELSE 0 END,
  CASE WHEN r_ok < 0.85 THEN 'approved' ELSE 'rejected' END
FROM _i
WHERE r_ret < CASE WHEN bad_batch THEN 0.25 WHEN late >= 3 THEN 0.08 ELSE 0.03 END
ORDER BY order_id, line_no;

INSERT INTO reviews (id, order_id, product_id, rating, created_on, comment)
SELECT row_number() OVER (ORDER BY order_id, line_no)::int, order_id, product_id,
  GREATEST(1, (CASE WHEN r_star < 0.07 THEN 1 WHEN r_star < 0.13 THEN 2 WHEN r_star < 0.25 THEN 3 WHEN r_star < 0.5 THEN 4 ELSE 5 END)
              - CASE WHEN bad_batch THEN 2 WHEN late >= 3 THEN 1 ELSE 0 END),
  LEAST(delivered_on + 1 + floor(r_day * 14)::int, DATE '2026-10-31'),
  CASE WHEN r_txt < 0.45 THEN NULL
       ELSE (ARRAY['Great quality','Fast delivery','As described','Packaging could be better','Arrived late',
                   'Not as pictured','Will buy again','Good value'])[1 + floor((r_txt - 0.45) / 0.55 * 8)::int] END
FROM _i
WHERE r_rev < 0.35
ORDER BY order_id, line_no;

SELECT setseed(0.666);
-- Web sessions: one per order (it ended in that order) plus 18,000 browsing sessions that did not buy.
-- Mobile browsers add to cart less often than desktop ones (funnel, E5).
WITH buy AS (
  SELECT o.id AS order_id, o.customer_id, o.ordered_at - make_interval(mins => 3 + floor(random() * 40)::int) AS started_at,
    CASE WHEN o.platform = 'app' OR random() < 0.4 THEN 'mobile' ELSE 'desktop' END AS device,
    CASE c.channel WHEN 'referral' THEN 'organic' WHEN 'organic' THEN CASE WHEN random() < 0.2 THEN 'email' ELSE 'organic' END ELSE c.channel END AS source
  FROM orders o JOIN customers c ON c.id = o.customer_id
  ORDER BY o.id
), browse AS (
  SELECT g, random() AS r_c, random() AS r_t, random() AS r_d, random() AS r_s, random() AS r_v, random() AS r_a
  FROM generate_series(1, 18000) g
), cr AS (
  SELECT id, row_number() OVER (ORDER BY signup_date, id)::int AS rn FROM customers
), cnt AS MATERIALIZED (
  -- customers signed up on or before each day (running total)
  SELECT g.day::date AS day, (sum(count(c.id)) OVER (ORDER BY g.day))::int AS n
  FROM generate_series(DATE '2025-01-01', DATE '2026-10-31', interval '1 day') g(day)
  LEFT JOIN customers c ON c.signup_date = g.day::date
  GROUP BY g.day
), browse_d AS (
  SELECT b.*, DATE '2025-01-01' + floor(669 * sqrt(b.r_t))::int AS d FROM browse b
), browse_c AS (
  SELECT b.*, x.n, 1 + floor((b.r_c - 0.35) / 0.65 * x.n)::int AS pick
  FROM browse_d b JOIN cnt x ON x.day = b.d
), allsess AS (
  SELECT 0 AS src, order_id AS k, customer_id, started_at, device, source, true AS viewed, true AS cart, order_id FROM buy
  UNION ALL
  -- 35% guests (no customer); the others are a random customer who had already signed up that day
  SELECT 1, b.g, CASE WHEN b.r_c >= 0.35 AND b.n > 0 THEN c.id END,
    b.d + make_interval(hours => 6 + floor(b.r_t * 1700)::int % 17, mins => floor(b.r_t * 100000)::int % 60),
    CASE WHEN b.r_d < 0.7 THEN 'mobile' ELSE 'desktop' END,
    CASE WHEN b.r_s < 0.35 THEN 'ads' WHEN b.r_s < 0.65 THEN 'organic' WHEN b.r_s < 0.9 THEN 'social' ELSE 'email' END,
    b.r_v < 0.75,
    b.r_v < 0.75 AND b.r_a < CASE WHEN b.r_d < 0.7 THEN 0.18 ELSE 0.32 END,
    NULL
  FROM browse_c b LEFT JOIN cr c ON c.rn = b.pick
)
INSERT INTO web_sessions (id, customer_id, started_at, device, source, viewed_product, added_to_cart, order_id)
SELECT row_number() OVER (ORDER BY started_at, src, k)::int, customer_id, started_at, device, source, viewed, cart, order_id
FROM allsess ORDER BY started_at, src, k;

DROP TABLE _o;
DROP TABLE _i;
-- Planner statistics for the ecom tables only (a bare ANALYZE would also re-read every Logistics table).
ANALYZE categories, sellers, products, customers, vouchers, orders, order_items, payments, deliveries, returns, reviews, web_sessions, ad_spend;
```

## Phụ lục C · `content/domains/ecom/` (chapters.yml, people.yml, kpis.yml, 30 ticket)

Mỗi khối `=== đường dẫn ===` là một file dưới `content/domains/ecom/`; ticket nằm dưới `tickets/`. Chép nguyên văn (Task 4 Step 1 có script). Nội dung trong khối mở rộng tới ngay trước dòng `=== ` kế tiếp.

````text
=== chapters.yml ===
# E-commerce domain (Plan 9): 6 chapters at Chợ Lồng Đèn (Lantern Market). Same fields as content/chapters.yml,
# plus `tables:` = the ecom tables this chapter reveals (Logistics keeps CHAPTER_TABLES in src/progress.ts).
# career: step reached by passing the chapter's promotion review; tier: true = the job title changes (★).
# Mọi chuỗi đặt trong nháy kép; EN không dấu.

- chapter: 1
  title: { vi: "Tuần đầu ở Chợ Lồng Đèn", en: "First week at Lantern Market" }
  career: { vi: "Junior DA", en: "Junior DA" }
  tier: true
  tables: [categories, sellers, products, customers, reviews]
  story:
    vi: "Chợ Lồng Đèn là sàn bán lẻ trực tuyến mở cửa ở Đà Nẵng đầu năm 2025. Tuần đầu, trưởng nhóm dữ liệu kèm bạn làm quen danh mục shop, sản phẩm và khách hàng; cuối tuần, nhà sáng lập đánh giá thử việc."
    en: "Lantern Market is an online marketplace that opened in Da Nang in early 2025. In your first week the data team lead walks you through the shop, product and customer lists; at the end of the week the founder runs your probation review."
  outcomes:
    - { vi: "Lấy đúng cột cần từ một bảng", en: "Pull exactly the columns you need", skills: [select] }
    - { vi: "Lọc sản phẩm và khách theo nhiều điều kiện", en: "Filter products and customers by several conditions", skills: [where] }
    - { vi: "Xếp hạng có thứ tự phụ và lấy top N", en: "Rank with a tie-breaker and take the top N", skills: [order_by, limit] }

- chapter: 2
  title: { vi: "Đếm đơn, đếm tiền", en: "Counting orders and money" }
  career: { vi: "Junior DA · báo cáo bán hàng", en: "Junior DA · sales reporting" }
  tier: false
  tables: [orders, order_items, payments, deliveries]
  story:
    vi: "Sàn lớn nhanh, và mọi phòng đều cần con số: kế toán đối chiếu tiền thu, vận hành thương lượng với đơn vị giao hàng, marketing tìm khách mua nhiều."
    en: "The marketplace is growing fast and every team needs figures: accounting matches the money collected, operations negotiates with the couriers, marketing looks for frequent buyers."
  outcomes:
    - { vi: "Đếm, cộng, tìm nhỏ nhất, lớn nhất, trung bình", en: "Count, sum, find the smallest, largest and average", skills: [aggregate] }
    - { vi: "Lập báo cáo theo từng nhóm", en: "Report group by group", skills: [group_by] }
    - { vi: "Lọc nhóm sau khi gộp và phân biệt với lọc dòng", en: "Filter groups after aggregating and tell it apart from filtering rows", skills: [having] }

- chapter: 3
  title: { vi: "Ghép các mảnh dữ liệu", en: "Joining the pieces" }
  career: { vi: "Data Analyst", en: "Data Analyst" }
  tier: true
  tables: [vouchers]
  story:
    vi: "Một đơn hàng nằm ở nhiều bảng: khách, dòng hàng, sản phẩm, shop, thanh toán. Từ nay bạn ghép chúng lại để trả lời ai mua gì, của shop nào, đã trả tiền chưa."
    en: "One order lives in several tables: customer, order lines, products, shops, payments. From now on you put them together to answer who bought what, from which shop, and whether it was paid."
  outcomes:
    - { vi: "Ghép đơn với khách và sản phẩm", en: "Match orders with customers and products", skills: [join] }
    - { vi: "Đi qua ba, bốn bảng trong một truy vấn", en: "Walk through three or four tables in one query", skills: [multi_join] }
    - { vi: "Tìm thứ không có: khách chưa mua, đơn chưa trả tiền", en: "Find what is missing: customers who never bought, orders never paid", skills: [left_join, anti_join] }

- chapter: 4
  title: { vi: "Mùa sale và giao hàng", en: "Sale season and delivery" }
  career: { vi: "Data Analyst · vận hành", en: "Data Analyst · operations" }
  tier: false
  tables: []
  story:
    vi: "Sau đợt sale 9.9 và 10.10, khách miền Trung than giao hàng chậm. Vận hành cần bạn đo từng ngày trễ, theo tuần và theo tháng."
    en: "After the 9.9 and 10.10 sales, customers in central Vietnam complain about slow deliveries. Operations needs you to measure every day of delay, by week and by month."
  outcomes:
    - { vi: "Tính số ngày giữa hai mốc", en: "Count the days between two dates", skills: [date_math] }
    - { vi: "Gom số liệu theo tuần, theo tháng", en: "Roll figures up by week and by month", skills: [date_bucket] }
    - { vi: "Xử lý ô trống: kiện chưa giao, khách chưa khai", en: "Handle empty cells: parcels not delivered yet, data customers never gave", skills: [null_logic, coalesce] }

- chapter: 5
  title: { vi: "Phễu và nhóm khách", en: "Funnels and segments" }
  career: { vi: "Data Analyst · marketing", en: "Data Analyst · marketing" }
  tier: false
  tables: [web_sessions, returns, ad_spend]
  story:
    vi: "Ngân sách quảng cáo năm sau đang được chia. Marketing cần biết khách đi qua phễu mua hàng thế nào, nhóm khách nào đáng giá, và mỗi khách mới tốn bao nhiêu tiền."
    en: "Next year's ad budget is being split. Marketing needs to know how shoppers move through the purchase funnel, which segments are worth it, and what each new customer costs."
  outcomes:
    - { vi: "Chia dòng vào nhóm theo luật", en: "Sort rows into groups by rules", skills: [case_when] }
    - { vi: "Đếm nhiều điều kiện trong một lần gom", en: "Count several conditions in one pass", skills: [conditional_agg] }
    - { vi: "Chia truy vấn dài thành từng bước có tên", en: "Split a long query into named steps", skills: [cte] }

- chapter: 6
  title: { vi: "Giữ chân khách", en: "Keeping customers" }
  career: { vi: "Senior DA", en: "Senior DA" }
  tier: true
  tables: []
  story:
    vi: "Khách mới đến nhiều, nhưng bao nhiêu người quay lại? Nhà sáng lập cần bức tranh giữ chân khách theo kênh trước khi gọi vốn vòng tiếp theo."
    en: "Plenty of new customers arrive, but how many come back? The founder needs the retention picture by channel before the next funding round."
  outcomes:
    - { vi: "Xếp hạng trong từng nhóm", en: "Rank within each group", skills: [window_rank] }
    - { vi: "So với kỳ trước, đơn trước", en: "Compare with the previous period or order", skills: [window_lag] }
    - { vi: "Cộng dồn và tỷ trọng mà không mất dòng", en: "Running totals and shares without losing rows", skills: [window_agg] }

=== people.yml ===
# Đồng nghiệp ở Chợ Lồng Đèn (Plan 9). Cùng định dạng content/people.yml (src/people.ts parsePeople).
# employee: null (domain E-com không có bảng nhân viên). tables: bảng trong schema ecom (src/db/ecom/schema.sql).
# Tên không trùng người nào của Logistics (personOf tìm theo tên). Mọi chuỗi đặt trong nháy kép; EN không dấu.

- name: "Võ Thanh Hà"
  dept: Management
  employee: null
  role: { vi: "Nhà sáng lập kiêm CEO", en: "Founder and CEO" }
  bio: { vi: "Nói ít, hỏi đúng chỗ đau; chỉ gửi các buổi đánh giá thăng tiến.", en: "Says little and asks where it hurts; only sends the promotion reviews." }
  tables: [orders, customers]
  look: { skin: light, hair: black, style: long, accessory: none }

- name: "Lâm Gia Huy"
  dept: IT
  employee: null
  role: { vi: "Trưởng nhóm dữ liệu, người kèm DA mới", en: "Data team lead, your mentor" }
  bio: { vi: "Thích vẽ phễu lên bảng trắng, luôn hỏi \"số này đếm cái gì?\".", en: "Loves drawing funnels on the whiteboard, always asks \"what does this number count?\"." }
  tables: [web_sessions, sellers]
  look: { skin: tan, hair: black, style: short, accessory: headset }

- name: "Trịnh Mai Anh"
  dept: Marketing
  employee: null
  role: { vi: "Trưởng phòng Marketing", en: "Head of Marketing" }
  bio: { vi: "Sống theo lịch sale 9.9, 10.10, 11.11; việc gì cũng có hạn chót.", en: "Lives by the 9.9, 10.10, 11.11 sale calendar; every request has a deadline." }
  tables: [vouchers, ad_spend, customers]
  look: { skin: medium, hair: brown, style: side, accessory: scarf }

- name: "Đoàn Quốc Bảo"
  dept: Category
  employee: null
  role: { vi: "Quản lý ngành hàng", en: "Category manager" }
  bio: { vi: "Thuộc từng mã SKU, mê bảng xếp hạng bán chạy.", en: "Knows every SKU, loves best-seller rankings." }
  tables: [categories, products, sellers]
  look: { skin: light, hair: black, style: short, accessory: glasses }

- name: "Nguyễn Thu Uyên"
  dept: Ops
  employee: null
  role: { vi: "Trưởng nhóm kho vận và giao hàng", en: "Fulfilment and delivery lead" }
  bio: { vi: "Nhớ ngày hẹn giao của từng kiện, ghét chữ \"đang trên đường\".", en: "Remembers every parcel's promised date, hates the words \"on the way\"." }
  tables: [deliveries, returns]
  look: { skin: tan, hair: black, style: bun, accessory: lanyard }

- name: "Hồ Ngọc Diệp"
  dept: CS
  employee: null
  role: { vi: "Trưởng nhóm chăm sóc khách hàng", en: "Customer care lead" }
  bio: { vi: "Đọc mọi đánh giá một sao, gọi lại cho từng khách.", en: "Reads every one-star review and calls each customer back." }
  tables: [reviews, returns]
  look: { skin: medium, hair: black, style: long, accessory: headset }

- name: "Kha Văn Lộc"
  dept: Finance
  employee: null
  role: { vi: "Kế toán trưởng", en: "Chief accountant" }
  bio: { vi: "Đối chiếu từng đồng với sao kê, không tin con số chưa khớp.", en: "Matches every dong against the statements and trusts no figure that does not reconcile." }
  tables: [payments, orders]
  look: { skin: deep, hair: grey, style: short, accessory: tie }

=== kpis.yml ===
# Bảng điều hành của Chợ Lồng Đèn (Plan 9). Cùng định dạng content/kpis.yml; `ticket` là id ticket E-com.
# Số tính lúc chạy từ Solution của ticket (biến thể 0) trên schema ecom; ô mở khi người chơi xong ticket đó.
- { id: ecomCollectedOct, ticket: ecom-ch2-01, kind: number, col: 1, label: { vi: "Tiền thu tháng 10/2026", en: "Money collected in October 2026" }, icon: chart, unit: { vi: "đồng", en: "VND" } }
- { id: ecomFrequentBuyers, ticket: ecom-ch2-03, kind: rowcount, label: { vi: "Khách đặt từ 8 đơn trong năm 2026", en: "Customers with 8 or more orders in 2026" }, icon: star }
- { id: ecomCategoryRevenue, ticket: ecom-ch3-02, kind: bar, label: { vi: "Doanh thu hàng tháng 10/2026 theo nhóm hàng", en: "October 2026 goods revenue by category" }, icon: trophy, unit: { vi: "đồng", en: "VND" } }
- { id: ecomNeverBought, ticket: ecom-ch3-03, kind: rowcount, label: { vi: "Khách đăng ký tháng 9/2026 chưa mua lần nào", en: "September 2026 signups who never bought" }, icon: clockOff }
- { id: ecomKiteLate, ticket: ecom-ch4-01, kind: rowcount, label: { vi: "Kiện Kite Logistics gửi tháng 10/2026 trễ hơn 2 ngày", en: "Kite Logistics parcels shipped in October 2026 over 2 days late" }, icon: clockAlert }

=== tickets/ch1/ecom-ch1-01.md ===
---
id: ecom-ch1-01
chapter: 1
title: Danh bạ các shop trên sàn
title_en: The shop directory
from: { name: Lâm Gia Huy, dept: IT }
difficulty: 1
beat: teach
format: worked
requires: []
grants: [select]
tables: [sellers]
columns:
  - { vi: "Tên shop", en: "Shop name" }
  - { vi: "Thành phố", en: "City" }
  - { vi: "Ngày vào sàn", en: "Date joined" }
starter: SELECT * FROM sellers
reflect:
  q: { vi: "Vì sao không nộp luôn câu có sẵn trong editor (lấy mọi cột)?", en: "Why not submit the starter query in the editor (every column) as it is?" }
  options:
    - { vi: "Dấu * lấy mọi cột; đề cần đúng 3 cột theo thứ tự, thừa cột là sai", en: "The * takes every column; the request wants exactly 3 columns in order, so extra columns are wrong" }
    - { vi: "Lấy mọi cột chạy chậm hơn nhiều", en: "Taking every column runs much slower" }
    - { vi: "Dấu * không lấy được cột thành phố", en: "The * cannot fetch the city column" }
  answer: 0
  why: { vi: "Kết quả được so theo vị trí cột, nên chỉ liệt kê đúng các cột đề cần, đúng thứ tự đề nói.", en: "Results are compared by column position, so list exactly the columns the request asks for, in the order it gives." }
wrong:
  - sql: "SELECT city, name, joined_on FROM sellers"
    vi: "Đủ 3 cột nhưng sai thứ tự: đề cần tên shop trước, rồi thành phố, rồi ngày vào sàn. Kết quả được so theo vị trí cột."
    en: "Three columns, but in the wrong order: the request wants the shop name first, then the city, then the date joined. Results are compared by column position."
---
Chào bạn, chào mừng đến Chợ Lồng Đèn! Mình là Huy, trưởng nhóm dữ liệu, tuần này mình kèm bạn.

Chợ Lồng Đèn là sàn bán lẻ trực tuyến, mở cửa từ đầu năm 2025 ở Đà Nẵng. Hàng do các shop đối tác đăng bán, sàn lo thanh toán và giao hàng. Việc đầu tiên của bạn là làm quen với các shop. Đây cũng là lần đầu bạn viết truy vấn ở đây, nên mình gửi kèm một ví dụ mẫu: đọc, chạy thử, rồi làm phần của bạn.

## Task
Gửi mình danh bạ mọi shop đang có trên sàn. Với mỗi shop mình cần ba thông tin, theo thứ tự: tên shop, thành phố, ngày vào sàn. Thứ tự dòng không quan trọng.

## Example
```sql
SELECT sku, name, price   -- ①
FROM products             -- ②
```
Ví dụ: bảng giá nhanh cho mọi sản phẩm, gồm mã SKU, tên và giá bán.

① Sau chữ đầu tiên là các cột cần lấy, cách nhau bằng dấu phẩy, theo đúng thứ tự muốn thấy trong kết quả.

② Sau chữ thứ hai là bảng chứa các cột đó: ở đây là danh mục sản phẩm `products`.

## Hints
1. Đây là bài chọn cột: từ một danh mục, chỉ lấy đúng những thông tin cần. Tên, thành phố và ngày vào sàn đều là thông tin của chính shop, nên nằm trong danh mục shop; tab Cột ở panel bên dưới cho biết tên bảng và tên cột.
2. Bảng `sellers` có các cột `name`, `city`, `joined_on`. Editor có sẵn `SELECT * FROM sellers`, trong đó `*` lấy mọi cột; ở đây bạn chỉ cần 3 cột, cách nhau bằng dấu phẩy.
3. `SELECT ..., ..., ... FROM sellers`

## Solution
```sql
SELECT name, city, joined_on
FROM sellers
```

# EN
Hi, and welcome to Lantern Market! I am Huy, the data team lead, and I will be your mentor this week.

Lantern Market is an online marketplace that opened in Da Nang at the start of 2025. Partner shops list the goods; the marketplace handles payment and delivery. Your first job is to get to know the shops. It is also your first query here, so I am sending a worked example along: read it, run it, then do your part.

## Task
Send me the directory of every shop on the marketplace. For each shop I need three things, in this order: shop name, city, date joined. Row order does not matter.

## Example
Example: a quick price list of every product, with its SKU code, name and selling price.

① After the first word come the columns you want, separated by commas, in the order you want to see them in the result.

② After the second word comes the table that holds those columns: here the product list `products`.

## Hints
1. This is a column-picking task: from one list, take only the information you need. Name, city and date joined all describe the shop itself, so they live in the shop list; the Columns tab in the bottom panel shows the table and column names.
2. Table `sellers` has the columns `name`, `city`, `joined_on`. The editor starts with `SELECT * FROM sellers`, where `*` takes every column; here you only need 3 columns, separated by commas.
3. `SELECT ..., ..., ... FROM sellers`

=== tickets/ch1/ecom-ch1-02.md ===
---
id: ecom-ch1-02
chapter: 1
title: Hàng giá mềm cho đợt khuyến mãi của shop
title_en: Low-priced items for a shop promotion
from: { name: Đoàn Quốc Bảo, dept: Category }
difficulty: 1
beat: develop
format: faded
requires: [select]
grants: [where]
tables: [products]
columns:
  - { vi: "Mã SKU", en: "SKU code" }
  - { vi: "Tên sản phẩm", en: "Product name" }
  - { vi: "Giá bán (đồng)", en: "Price (VND)" }
starter: |
  SELECT sku, name, price
  FROM products
  WHERE seller_id = ___ AND is_active = ___ AND price < ___
variants:
  - { seller: "16", max_k: "500" }
  - { seller: "19", max_k: "300" }
  - { seller: "27", max_k: "1000" }
reflect:
  q: { vi: "Ba điều kiện nối với nhau bằng chữ AND nghĩa là gì?", en: "What does joining three conditions with AND mean?" }
  options:
    - { vi: "Một sản phẩm chỉ được giữ khi đúng cả ba điều kiện", en: "A product is kept only when all three conditions are true" }
    - { vi: "Một sản phẩm được giữ khi đúng ít nhất một điều kiện", en: "A product is kept when at least one condition is true" }
    - { vi: "Kết quả được sắp xếp theo ba điều kiện", en: "The result is sorted by the three conditions" }
  answer: 0
  why: { vi: "AND đòi mọi điều kiện cùng đúng. Muốn chỉ cần một điều kiện đúng thì dùng OR.", en: "AND needs every condition to be true. When one true condition is enough, use OR." }
wrong:
  - sql: "SELECT sku, name, price FROM products WHERE seller_id = {{seller}} AND price < {{max_k}}000"
    vi: "Danh sách còn cả sản phẩm shop đã ngừng bán. Đề chỉ cần hàng đang còn bán."
    en: "Your list still has products the shop no longer sells. The request is only for items still on sale."
---
Shop số {{seller}} sắp chạy một đợt khuyến mãi trên trang chủ. Bên ngành hàng cần biết shop có những món giá mềm nào để chọn hàng lên banner.

Câu truy vấn trong editor đã viết gần xong, chỉ còn mấy chỗ trống ___: mã shop, giá trị đúng hay sai cho cờ còn bán, và mức giá. Bạn điền cho đủ rồi nộp.

## Task
Gửi mình các sản phẩm của shop số {{seller}} đang còn bán và có giá dưới {{max_k}} nghìn đồng: mã SKU, tên sản phẩm, giá bán. Thứ tự dòng không quan trọng.

## Hints
1. Đây là bài lọc dòng: giữ lại những sản phẩm đúng mọi điều kiện của đề (đúng shop, còn bán, dưới mức giá).
2. Cột `seller_id` là mã shop, cột `is_active` là cờ còn bán (`true` hoặc `false`), giá lưu theo đồng nên {{max_k}} nghìn là `{{max_k}}000`.
3. `SELECT sku, name, price FROM products WHERE seller_id = {{seller}} AND is_active = true AND price < ...`

## Solution
```sql
SELECT sku, name, price
FROM products
WHERE seller_id = {{seller}} AND is_active = true AND price < {{max_k}}000
```

# EN
Shop number {{seller}} is about to run a promotion on the home page. The category team needs to know which low-priced items the shop has, to pick items for the banner.

The query in the editor is almost done; only a few ___ blanks are left: the shop number, the true-or-false value of the on-sale flag, and the price limit. Fill them in, then submit.

## Task
Send me the products of shop number {{seller}} that are still on sale and cost under {{max_k}} thousand VND: SKU code, product name, price. Row order does not matter.

## Hints
1. This is a row-filtering task: keep only the products that meet every condition of the request (the right shop, still on sale, under the price limit).
2. Column `seller_id` is the shop number, column `is_active` is the on-sale flag (`true` or `false`), and prices are stored in VND, so {{max_k}} thousand is `{{max_k}}000`.
3. `SELECT sku, name, price FROM products WHERE seller_id = {{seller}} AND is_active = true AND price < ...`

=== tickets/ch1/ecom-ch1-03.md ===
---
id: ecom-ch1-03
chapter: 1
title: Năm món đắt nhất cho banner
title_en: Five priciest items for the banner
from: { name: Trịnh Mai Anh, dept: Marketing }
difficulty: 2
beat: twist
requires: [select, where]
grants: [order_by, limit]
tables: [products]
ordered: true
columns:
  - { vi: "Mã SKU", en: "SKU code" }
  - { vi: "Tên sản phẩm", en: "Product name" }
  - { vi: "Giá bán (đồng)", en: "Price (VND)" }
variants:
  - { cat: "3", cat_name: "Audio" }
  - { cat: "11", cat_name: "Skincare" }
  - { cat: "8", cat_name: "Women Fashion" }
reflect:
  q: { vi: "Nếu bỏ thứ tự phụ theo mã SKU thì sao?", en: "What happens without the second sort key on the SKU code?" }
  options:
    - { vi: "Hai món cùng giá có thể đổi chỗ giữa các lần chạy, và món thứ năm có thể khác đi", en: "Two items with the same price can swap places between runs, and the fifth item can change" }
    - { vi: "Kết quả luôn y hệt, thứ tự phụ chỉ để đẹp", en: "The result is always identical; the second key is only cosmetic" }
    - { vi: "Truy vấn báo lỗi", en: "The query fails" }
  answer: 0
  why: { vi: "Khi giá bằng nhau, cơ sở dữ liệu không hứa thứ tự nào. Thứ tự phụ làm kết quả chắc chắn, nhất là khi chỉ lấy vài dòng đầu.", en: "When prices tie, the database promises no order. A second key makes the result certain, especially when you keep only the first few rows." }
wrong:
  - sql: "SELECT sku, name, price FROM products WHERE category_id = {{cat}} AND is_active = true ORDER BY price, sku LIMIT 5"
    vi: "Bạn đang lấy 5 món rẻ nhất: sắp xếp mặc định là tăng dần. Đề cần đắt nhất lên đầu."
    en: "You are taking the 5 cheapest items: sorting is ascending by default. The request wants the most expensive first."
---
Tuần này banner trang chủ dành cho nhóm hàng {{cat_name}}. Banner chỉ có chỗ cho năm món, và sếp muốn trưng những món cao cấp nhất để kéo khách vào xem.

## Task
Gửi mình 5 sản phẩm đắt nhất đang còn bán của nhóm hàng số {{cat}} ({{cat_name}}): mã SKU, tên sản phẩm, giá bán. Đắt nhất lên đầu; cùng giá thì mã SKU nhỏ hơn đứng trước.

## Hints
1. Lọc đúng nhóm hàng và hàng còn bán như bài trước, rồi xếp theo giá từ cao xuống thấp và chỉ giữ vài dòng đầu.
2. Nhóm hàng là cột `category_id`. Sắp xếp giảm dần viết `ORDER BY price DESC, sku`; giữ 5 dòng đầu viết `LIMIT 5` ở cuối câu.
3. `SELECT sku, name, price FROM products WHERE category_id = {{cat}} AND is_active = true ORDER BY ... LIMIT 5`

## Solution
```sql
SELECT sku, name, price
FROM products
WHERE category_id = {{cat}} AND is_active = true
ORDER BY price DESC, sku
LIMIT 5
```

# EN
This week the home page banner belongs to the {{cat_name}} category. The banner only has room for five items, and the boss wants the most premium ones to draw shoppers in.

## Task
Send me the 5 most expensive products still on sale in category number {{cat}} ({{cat_name}}): SKU code, product name, price. Most expensive first; on equal prices, the smaller SKU code first.

## Hints
1. Filter the right category and the items still on sale like the last task, then sort by price from high to low and keep only the first few rows.
2. The category is column `category_id`. A descending sort is written `ORDER BY price DESC, sku`; keeping the first 5 rows is `LIMIT 5` at the end of the query.
3. `SELECT sku, name, price FROM products WHERE category_id = {{cat}} AND is_active = true ORDER BY ... LIMIT 5`

=== tickets/ch1/ecom-ch1-04.md ===
---
id: ecom-ch1-04
chapter: 1
title: Đánh giá một sao tháng 10
title_en: One-star reviews in October
from: { name: Hồ Ngọc Diệp, dept: CS }
difficulty: 1
beat: rest
requires: [select, where]
grants: []
tables: [reviews]
columns:
  - { vi: "Mã đơn", en: "Order number" }
  - { vi: "Mã sản phẩm", en: "Product number" }
  - { vi: "Ngày đánh giá", en: "Review date" }
  - { vi: "Lời nhận xét (có thể trống)", en: "Comment (may be empty)" }
reflect:
  q: { vi: "Vì sao lọc tháng bằng điều kiện trước ngày 01/11 thay vì đến hết ngày 31/10?", en: "Why filter the month with before 1 November instead of up to 31 October?" }
  options:
    - { vi: "Viết nửa mở như vậy thì không phải nhớ tháng có 30 hay 31 ngày, và vẫn đúng nếu cột có cả giờ", en: "Written half-open, you never need to remember whether a month has 30 or 31 days, and it stays right if the column holds a time too" }
    - { vi: "Ngày 31/10 không có đánh giá nào", en: "There are no reviews on 31 October" }
    - { vi: "Cơ sở dữ liệu không so được với ngày 31", en: "The database cannot compare with day 31" }
  answer: 0
  why: { vi: "Từ ngày đầu tháng, và trước ngày đầu tháng sau: cách viết này dùng được cho mọi tháng và mọi kiểu cột ngày giờ.", en: "From the first day of the month, and before the first day of the next: this works for every month and every kind of date or time column." }
wrong:
  - sql: "SELECT order_id, product_id, created_on, comment FROM reviews WHERE rating <= 2 AND created_on >= '2026-10-01' AND created_on < '2026-11-01'"
    vi: "Danh sách có cả đánh giá 2 sao. Đề chỉ cần đánh giá 1 sao."
    en: "Your list also has 2-star reviews. The request is only for 1-star reviews."
---
Mỗi đầu tháng nhóm chăm sóc khách hàng gọi lại cho những khách chấm 1 sao để hỏi chuyện gì đã xảy ra. Tháng 10 vừa xong, mình cần danh sách để chia việc cho cả nhóm.

## Task
Các đánh giá 1 sao khách viết trong tháng 10/2026: mã đơn, mã sản phẩm, ngày đánh giá và lời nhận xét (nhiều khách chỉ chấm sao, không viết gì, thì để trống). Thứ tự dòng không quan trọng.

## Hints
1. Mọi thông tin nằm trong danh mục đánh giá. Lọc theo số sao và theo khoảng ngày của tháng 10.
2. Số sao là cột `rating`, ngày đánh giá là `created_on`, lời nhận xét là `comment`. Khoảng ngày viết `created_on >= '2026-10-01' AND created_on < '2026-11-01'`.
3. `SELECT order_id, product_id, created_on, comment FROM reviews WHERE rating = 1 AND ...`

## Solution
```sql
SELECT order_id, product_id, created_on, comment
FROM reviews
WHERE rating = 1 AND created_on >= '2026-10-01' AND created_on < '2026-11-01'
```

# EN
At the start of every month the customer care team calls back the customers who gave 1 star, to ask what went wrong. October has just ended, and I need the list to split the calls across the team.

## Task
The 1-star reviews customers wrote in October 2026: order number, product number, review date and the comment (many customers only give stars and write nothing; leave those empty). Row order does not matter.

## Hints
1. Everything is in the review list. Filter by the number of stars and by the date range of October.
2. Stars are column `rating`, the review date is `created_on`, the comment is `comment`. The date range is `created_on >= '2026-10-01' AND created_on < '2026-11-01'`.
3. `SELECT order_id, product_id, created_on, comment FROM reviews WHERE rating = 1 AND ...`

=== tickets/ch1/ecom-ch1-05.md ===
---
id: ecom-ch1-05
chapter: 1
title: "Đánh giá thăng tiến: buổi gặp nhà sáng lập"
title_en: "Promotion review: meeting the founder"
from: { name: Võ Thanh Hà, dept: Management }
difficulty: 2
beat: boss
requires: [select, where, order_by, limit]
grants: []
tables: [sellers, products, customers]
ordered: true
columns:
  - [{ vi: "Tên shop", en: "Shop name" }, { vi: "Ngày vào sàn", en: "Date joined" }]
  - [{ vi: "Mã SKU", en: "SKU code" }, { vi: "Tên sản phẩm", en: "Product name" }, { vi: "Giá bán (đồng)", en: "Price (VND)" }]
  - [{ vi: "Mã khách", en: "Customer number" }, { vi: "Họ tên", en: "Full name" }, { vi: "Ngày đăng ký", en: "Signup date" }]
conclusion:
  question: "Ở bước 2, vì sao phải xếp thêm theo mã SKU sau khi đã xếp theo giá?"
  options:
    - "Để hai món cùng giá luôn đứng theo một thứ tự cố định, nên mười món được chọn không đổi giữa các lần chạy"
    - "Để kết quả chạy nhanh hơn"
    - "Vì giá không sắp xếp được"
  answer: 0
conclusion_en:
  question: "In step 2, why sort by the SKU code after sorting by price?"
  options:
    - "So two items with the same price always stand in one fixed order, and the ten items picked never change between runs"
    - "To make the query run faster"
    - "Because prices cannot be sorted"
---
Đây là buổi đánh giá thăng tiến của bạn. Mình là Hà, người sáng lập Chợ Lồng Đèn. Chiều nay mình gặp nhà đầu tư và cần ba bảng số nhỏ. Làm đúng cả ba là bạn qua thử việc.

## Step 1: Shop chính hãng ở Đà Nẵng
Các shop chính hãng (có nhãn chính hãng) ở thành phố Da Nang: tên shop và ngày vào sàn. Shop vào sàn sớm nhất lên đầu; cùng ngày thì xếp theo tên shop.
```sql
SELECT name, joined_on
FROM sellers
WHERE city = 'Da Nang' AND is_official = true
ORDER BY joined_on, name
```

## Step 2: Mười món đắt nhất
Mười sản phẩm đắt nhất đang còn bán trên toàn sàn: mã SKU, tên sản phẩm, giá bán. Đắt nhất lên đầu; cùng giá thì mã SKU nhỏ hơn đứng trước.
```sql
SELECT sku, name, price
FROM products
WHERE is_active = true
ORDER BY price DESC, sku
LIMIT 10
```

## Step 3: Năm khách đầu tiên ở Huế đến nhờ bạn bè giới thiệu
Năm khách ở thành phố Hue đăng ký sớm nhất trong số khách đến sàn nhờ bạn bè giới thiệu: mã khách, họ tên, ngày đăng ký. Đăng ký sớm nhất lên đầu; cùng ngày thì mã khách nhỏ hơn đứng trước.
```sql
SELECT id, full_name, signup_date
FROM customers
WHERE city = 'Hue' AND channel = 'referral'
ORDER BY signup_date, id
LIMIT 5
```

## Hints
1. Bước 1 lọc danh mục shop theo thành phố và nhãn chính hãng. Bước 2 là bài năm món đắt nhất, nhưng trên toàn sàn và lấy mười. Bước 3 lọc khách theo thành phố và kênh khách đến, rồi lấy năm người đăng ký sớm nhất.
2. Bước 1: cột `is_official`. Bước 3: kênh khách đến là cột `channel`, giá trị `'referral'` là bạn bè giới thiệu; ngày đăng ký là `signup_date`.
3. `SELECT id, full_name, signup_date FROM customers WHERE city = 'Hue' AND channel = 'referral' ORDER BY ... LIMIT 5`

# EN
This is your promotion review. I am Ha, the founder of Lantern Market. This afternoon I meet an investor and I need three small tables of figures. Get all three right and you pass your probation.

## Step 1: Official shops in Da Nang
The official shops (with the official label) in the city of Da Nang: shop name and date joined. The shop that joined earliest first; on the same date, by shop name.

## Step 2: The ten priciest items
The ten most expensive products still on sale on the whole marketplace: SKU code, product name, price. Most expensive first; on equal prices, the smaller SKU code first.

## Step 3: The first five customers in Hue who came through a friend
Among customers in the city of Hue who came to the marketplace because a friend referred them, the five who signed up earliest: customer number, full name, signup date. Earliest signup first; on the same date, the smaller customer number first.

## Hints
1. Step 1 filters the shop list by city and the official label. Step 2 is the five-priciest task, but across the whole marketplace and taking ten. Step 3 filters customers by city and by how they came, then takes the five earliest signups.
2. Step 1: column `is_official`. Step 3: how a customer came is column `channel`, the value `'referral'` means a friend referred them; the signup date is `signup_date`.
3. `SELECT id, full_name, signup_date FROM customers WHERE city = 'Hue' AND channel = 'referral' ORDER BY ... LIMIT 5`

=== tickets/ch2/ecom-ch2-01.md ===
---
id: ecom-ch2-01
chapter: 2
title: Tiền đã thu trong tháng
title_en: Money collected in the month
from: { name: Kha Văn Lộc, dept: Finance }
difficulty: 2
beat: teach
format: worked
requires: [select, where]
grants: [aggregate]
tables: [payments]
columns:
  - { vi: "Số khoản đã thu", en: "Payments collected" }
  - { vi: "Tổng tiền thu (đồng)", en: "Total collected (VND)" }
variants:
  - { month: "10/2026", month_en: "October 2026", from: "2026-10-01", to: "2026-11-01" }
  - { month: "9/2026", month_en: "September 2026", from: "2026-09-01", to: "2026-10-01" }
  - { month: "6/2026", month_en: "June 2026", from: "2026-06-01", to: "2026-07-01" }
reflect:
  q: { vi: "Một câu có hàm gộp mà không gom nhóm thì trả bao nhiêu dòng?", en: "How many rows does a query with aggregate functions and no grouping return?" }
  options:
    - { vi: "Đúng một dòng, gộp mọi dòng thỏa điều kiện lọc", en: "Exactly one row, summarising every row that passed the filter" }
    - { vi: "Mỗi khoản thanh toán một dòng", en: "One row per payment" }
    - { vi: "Hai dòng, mỗi hàm một dòng", en: "Two rows, one per function" }
  answer: 0
  why: { vi: "Hàm gộp biến nhiều dòng thành một con số. Không gom nhóm thì cả tập dòng sau khi lọc là một nhóm.", en: "An aggregate turns many rows into one figure. Without grouping, the whole filtered set is one group." }
wrong:
  - sql: "SELECT count(*), sum(amount) FROM payments WHERE paid_at >= '{{from}}' AND paid_at < '{{to}}'"
    vi: "Bạn đang tính cả khoản đã hoàn tiền cho khách. Đề chỉ cần khoản đã thu thành công."
    en: "You are also counting payments that were refunded to the customer. The request is only for payments collected successfully."
---
Cuối tháng nào phòng kế toán cũng đối chiếu số tiền sàn đã thu với sao kê ngân hàng và ví điện tử. Mình cần hai con số: thu được bao nhiêu khoản, và tổng tiền là bao nhiêu.

Đây là lần đầu bạn tính tổng trên nhiều dòng, nên mình gửi kèm một ví dụ mẫu.

## Task
Trong tháng {{month}}, có bao nhiêu khoản thanh toán đã thu thành công, và tổng số tiền thu được là bao nhiêu? Chỉ tính khoản đã thu: khoản bị lỗi hay đã hoàn tiền thì bỏ. Tháng tính theo thời điểm thu tiền.

## Example
```sql
SELECT count(*),             -- ①
       min(price), max(price),
       round(avg(price), 0)  -- ②
FROM products
WHERE is_active = true       -- ③
```
Ví dụ: sàn đang bán bao nhiêu sản phẩm, món rẻ nhất và đắt nhất giá bao nhiêu, giá trung bình là bao nhiêu?

① Hàm đếm đếm số dòng; kết quả chỉ có một dòng cho cả bảng.

② Hàm trung bình thường ra số lẻ; làm tròn tới hàng đơn vị cho dễ đọc.

③ Điều kiện lọc chạy trước, hàm gộp chỉ tính trên những dòng còn lại.

## Hints
1. Đây là bài gộp: biến nhiều khoản thanh toán thành hai con số. Lọc đúng trạng thái và đúng tháng trước, rồi đếm và cộng.
2. Bảng `payments`: trạng thái là cột `status` (đã thu là `'paid'`), thời điểm thu là `paid_at`, số tiền là `amount`. Đếm dùng `count(*)`, cộng dùng `sum(amount)`.
3. `SELECT count(*), sum(amount) FROM payments WHERE status = 'paid' AND paid_at >= '{{from}}' AND ...`

## Solution
```sql
SELECT count(*), sum(amount)
FROM payments
WHERE status = 'paid' AND paid_at >= '{{from}}' AND paid_at < '{{to}}'
```

# EN
At the end of every month accounting matches the money the marketplace collected against the bank and e-wallet statements. I need two figures: how many payments came in, and the total amount.

This is your first time totalling over many rows, so I am sending a worked example along.

## Task
In {{month_en}}, how many payments were collected successfully, and what is the total amount collected? Only count collected payments: drop failed or refunded ones. The month is the moment the money was collected.

## Example
Example: how many products are on sale, what do the cheapest and the most expensive cost, and what is the average price?

① The count function counts rows; the result has just one row for the whole table.

② The average is usually a fraction; round it to a whole number so it reads easily.

③ The filter runs first; the aggregate functions only see the rows that are left.

## Hints
1. This is an aggregate task: turn many payments into two figures. Filter the right status and the right month first, then count and add up.
2. Table `payments`: the status is column `status` (collected is `'paid'`), the collection time is `paid_at`, the amount is `amount`. Counting uses `count(*)`, adding uses `sum(amount)`.
3. `SELECT count(*), sum(amount) FROM payments WHERE status = 'paid' AND paid_at >= '{{from}}' AND ...`

=== tickets/ch2/ecom-ch2-02.md ===
---
id: ecom-ch2-02
chapter: 2
title: Kiện hàng theo đơn vị vận chuyển
title_en: Parcels per courier
from: { name: Nguyễn Thu Uyên, dept: Ops }
difficulty: 2
beat: develop
format: faded
requires: [aggregate]
grants: [group_by]
tables: [deliveries]
columns:
  - { vi: "Đơn vị vận chuyển", en: "Courier" }
  - { vi: "Số kiện gửi đi", en: "Parcels shipped" }
starter: |
  SELECT courier, count(*)
  FROM deliveries
  WHERE shipped_on >= '{{from}}' AND shipped_on < '{{to}}'
  GROUP BY ___
variants:
  - { month: "10/2026", month_en: "October 2026", from: "2026-10-01", to: "2026-11-01" }
  - { month: "8/2026", month_en: "August 2026", from: "2026-08-01", to: "2026-09-01" }
  - { month: "3/2026", month_en: "March 2026", from: "2026-03-01", to: "2026-04-01" }
reflect:
  q: { vi: "Cột nào được phép đứng cạnh hàm đếm trong danh sách cột?", en: "Which columns may stand next to the count in the column list?" }
  options:
    - { vi: "Chỉ những cột dùng để gom nhóm", en: "Only the columns you group by" }
    - { vi: "Mọi cột của bảng", en: "Every column of the table" }
    - { vi: "Không cột nào", en: "No column at all" }
  answer: 0
  why: { vi: "Mỗi nhóm ra một dòng, nên một cột chỉ có một giá trị cho cả nhóm khi nó là cột gom nhóm (hoặc nằm trong hàm gộp).", en: "Each group gives one row, so a column has one value for the whole group only when it is a grouping column (or sits inside an aggregate)." }
wrong:
  - sql: "SELECT courier, count(*) FROM deliveries GROUP BY courier"
    vi: "Bạn đang đếm mọi kiện từ ngày mở sàn. Đề chỉ cần kiện gửi đi trong tháng đó."
    en: "You are counting every parcel since the marketplace opened. The request is only for parcels shipped in that month."
---
Mỗi tháng mình họp với ba đơn vị vận chuyển để thương lượng giá. Đơn vị nào nhận nhiều kiện thì mình có thể đòi giá tốt hơn, nên mình cần biết mỗi bên đã chở bao nhiêu kiện.

Câu truy vấn trong editor gần xong, chỉ thiếu thứ cần gom nhóm ở chỗ trống ___.

## Task
Mỗi đơn vị vận chuyển đã nhận bao nhiêu kiện gửi đi trong tháng {{month}} (tính theo ngày gửi)? Mỗi đơn vị một dòng: tên đơn vị và số kiện. Thứ tự dòng không quan trọng.

## Hints
1. Đếm như bài trước, nhưng đếm riêng cho từng đơn vị vận chuyển: mỗi đơn vị là một nhóm.
2. Gom nhóm theo cột tên đơn vị: `GROUP BY courier`.
3. `SELECT courier, count(*) FROM deliveries WHERE ... GROUP BY courier`

## Solution
```sql
SELECT courier, count(*)
FROM deliveries
WHERE shipped_on >= '{{from}}' AND shipped_on < '{{to}}'
GROUP BY courier
```

# EN
Every month I meet our three couriers to negotiate rates. The more parcels a courier gets from us, the better the rate I can ask for, so I need to know how many parcels each one carried.

The query in the editor is almost done; only the thing to group by is missing at the ___ blank.

## Task
How many parcels did each courier take in {{month_en}} (by shipping date)? One row per courier: its name and the number of parcels. Row order does not matter.

## Hints
1. Count like the last task, but count separately for each courier: each courier is one group.
2. Group by the courier name column: `GROUP BY courier`.
3. `SELECT courier, count(*) FROM deliveries WHERE ... GROUP BY courier`

=== tickets/ch2/ecom-ch2-03.md ===
---
id: ecom-ch2-03
chapter: 2
title: Khách mua nhiều năm 2026
title_en: Frequent buyers of 2026
from: { name: Trịnh Mai Anh, dept: Marketing }
difficulty: 2
beat: twist
requires: [aggregate, group_by]
grants: [having]
tables: [orders]
columns:
  - { vi: "Mã khách", en: "Customer number" }
  - { vi: "Số đơn không hủy", en: "Orders not cancelled" }
variants:
  - { n: "8" }
  - { n: "9" }
  - { n: "10" }
reflect:
  q: { vi: "Vì sao điều kiện về số đơn không đặt chung chỗ với điều kiện về trạng thái và năm?", en: "Why does the condition on the number of orders not go with the conditions on status and year?" }
  options:
    - { vi: "Số đơn chỉ có sau khi đã gom nhóm; điều kiện lọc dòng chạy trước khi gom", en: "The order count only exists after grouping; the row filter runs before grouping" }
    - { vi: "Đặt chung chỗ cũng được, chỉ chậm hơn", en: "Putting it there works too, just slower" }
    - { vi: "Vì điều kiện số không được đặt sau ngày tháng", en: "Because number conditions cannot follow date conditions" }
  answer: 0
  why: { vi: "Lọc dòng (trạng thái, năm) xảy ra trước, gom nhóm sau, rồi mới lọc nhóm theo số đếm.", en: "Row filters (status, year) come first, grouping next, and only then are groups filtered by their count." }
wrong:
  - sql: "SELECT customer_id, count(*) FROM orders WHERE ordered_at >= '2026-01-01' AND ordered_at < '2027-01-01' GROUP BY customer_id HAVING count(*) >= {{n}}"
    vi: "Bạn đang đếm cả đơn đã hủy. Đề chỉ tính đơn không bị hủy."
    en: "You are also counting cancelled orders. The request only counts orders that were not cancelled."
---
Marketing sắp mở chương trình khách thân thiết. Đợt đầu mời những khách mua nhiều nhất năm nay; mình cần danh sách để gửi thư mời.

## Task
Năm 2026, những khách nào đặt từ {{n}} đơn trở lên, không tính đơn đã hủy? Gửi mã khách và số đơn của họ. Thứ tự dòng không quan trọng.

## Hints
1. Đếm số đơn của từng khách (mỗi khách một nhóm), rồi chỉ giữ những nhóm có số đơn đủ lớn.
2. Lọc dòng: `status <> 'cancelled'` và khoảng ngày của năm. Lọc nhóm theo số đếm đặt sau gom nhóm: `HAVING count(*) >= {{n}}`.
3. `SELECT customer_id, count(*) FROM orders WHERE ... GROUP BY customer_id HAVING ...`

## Solution
```sql
SELECT customer_id, count(*)
FROM orders
WHERE status <> 'cancelled' AND ordered_at >= '2026-01-01' AND ordered_at < '2027-01-01'
GROUP BY customer_id
HAVING count(*) >= {{n}}
```

# EN
Marketing is about to launch a loyalty programme. The first round invites the customers who bought the most this year; I need the list to send the invitations.

## Task
In 2026, which customers placed {{n}} or more orders, cancelled orders not counted? Send the customer number and their number of orders. Row order does not matter.

## Hints
1. Count the orders of each customer (one group per customer), then keep only the groups with a large enough count.
2. Row filter: `status <> 'cancelled'` and the date range of the year. The group filter on the count comes after grouping: `HAVING count(*) >= {{n}}`.
3. `SELECT customer_id, count(*) FROM orders WHERE ... GROUP BY customer_id HAVING ...`

=== tickets/ch2/ecom-ch2-04.md ===
---
id: ecom-ch2-04
chapter: 2
title: Khách có chịu viết nhận xét không
title_en: Do customers write comments
from: { name: Hồ Ngọc Diệp, dept: CS }
difficulty: 1
beat: rest
requires: [aggregate, group_by]
grants: []
tables: [reviews]
columns:
  - { vi: "Số sao", en: "Stars" }
  - { vi: "Số đánh giá", en: "Reviews" }
  - { vi: "Số đánh giá có lời nhận xét", en: "Reviews with a comment" }
reflect:
  q: { vi: "Đếm theo một cột (thay vì đếm mọi dòng) thì bỏ qua những dòng nào?", en: "Counting a column (instead of every row) skips which rows?" }
  options:
    - { vi: "Những dòng mà cột đó trống (không có giá trị)", en: "The rows where that column is empty (has no value)" }
    - { vi: "Những dòng trùng nhau", en: "Duplicate rows" }
    - { vi: "Không bỏ dòng nào", en: "No rows at all" }
  answer: 0
  why: { vi: "Đếm mọi dòng thì tính cả dòng trống; đếm theo cột thì chỉ tính dòng có giá trị ở cột đó.", en: "Counting rows includes empty ones; counting a column only includes rows with a value in that column." }
wrong:
  - sql: "SELECT rating, count(*), count(*) FROM reviews GROUP BY rating"
    vi: "Cột thứ ba đang đếm mọi đánh giá, kể cả đánh giá chỉ chấm sao. Đề cần số đánh giá có viết lời nhận xét."
    en: "The third column counts every review, including stars-only ones. The request wants the reviews that have a written comment."
---
Nhóm chăm sóc khách hàng muốn biết khách có hay viết nhận xét không, và khách không hài lòng có viết nhiều hơn khách hài lòng không. Nếu khách chấm thấp mà ít viết, mình sẽ thêm một câu hỏi ngắn sau khi chấm sao.

## Task
Với mỗi mức sao từ 1 đến 5: có bao nhiêu đánh giá, và bao nhiêu đánh giá trong số đó có viết lời nhận xét? Mỗi mức sao một dòng. Thứ tự dòng không quan trọng.

## Hints
1. Gom nhóm theo số sao. Trong mỗi nhóm cần hai số đếm: mọi đánh giá, và chỉ đánh giá có lời nhận xét.
2. Đếm mọi dòng dùng `count(*)`; đếm theo cột `count(comment)` bỏ qua những dòng không có lời nhận xét.
3. `SELECT rating, count(*), count(comment) FROM reviews GROUP BY ...`

## Solution
```sql
SELECT rating, count(*), count(comment)
FROM reviews
GROUP BY rating
```

# EN
The customer care team wants to know whether customers write comments, and whether unhappy customers write more than happy ones. If low scores come with few comments, we will add a short question after the stars.

## Task
For each star level from 1 to 5: how many reviews are there, and how many of them have a written comment? One row per star level. Row order does not matter.

## Hints
1. Group by the number of stars. Each group needs two counts: every review, and only the reviews with a comment.
2. Counting every row uses `count(*)`; counting a column, `count(comment)`, skips the rows without a comment.
3. `SELECT rating, count(*), count(comment) FROM reviews GROUP BY ...`

=== tickets/ch2/ecom-ch2-05.md ===
---
id: ecom-ch2-05
chapter: 2
title: "Đánh giá thăng tiến: báo cáo bán hàng tháng 10"
title_en: "Promotion review: the October sales report"
from: { name: Võ Thanh Hà, dept: Management }
difficulty: 2
beat: boss
requires: [aggregate, group_by, having]
grants: []
tables: [payments, customers, order_items]
columns:
  - [{ vi: "Cách thanh toán", en: "Payment method" }, { vi: "Số khoản đã thu", en: "Payments collected" }, { vi: "Tổng tiền thu (đồng)", en: "Total collected (VND)" }]
  - [{ vi: "Thành phố", en: "City" }, { vi: "Số khách", en: "Customers" }]
  - [{ vi: "Mã sản phẩm", en: "Product number" }, { vi: "Số món đã bán", en: "Units sold" }]
conclusion:
  question: "Ở bước 3, điều kiện từ 150 món trở lên được kiểm vào lúc nào?"
  options:
    - "Sau khi đã cộng số món của từng sản phẩm, vì nó là điều kiện trên tổng của nhóm"
    - "Trước khi cộng, trên từng dòng hàng của đơn"
    - "Không cần điều kiện, chỉ cần sắp xếp"
  answer: 0
conclusion_en:
  question: "In step 3, when is the condition of 150 units or more checked?"
  options:
    - "After the units of each product are added up, because it is a condition on the group's total"
    - "Before adding, on each order line"
    - "No condition is needed, only sorting"
---
Đây là buổi đánh giá thăng tiến của bạn. Sáng thứ Hai mình họp tổng kết tháng 10 với kế toán, marketing và ngành hàng, và cần ba bảng số. Làm đúng cả ba là bạn bước thêm một bước trong sự nghiệp.

## Step 1: Tiền thu tháng 10 theo cách thanh toán
Tháng 10/2026 (theo thời điểm thu tiền), với mỗi cách thanh toán: số khoản đã thu thành công và tổng tiền thu được. Khoản lỗi hay đã hoàn tiền thì bỏ. Thứ tự dòng không quan trọng.
```sql
SELECT method, count(*), sum(amount)
FROM payments
WHERE status = 'paid' AND paid_at >= '2026-10-01' AND paid_at < '2026-11-01'
GROUP BY method
```

## Step 2: Thành phố có nhiều khách
Những thành phố có từ 500 khách đăng ký trở lên (tính mọi khách từ ngày mở sàn): tên thành phố và số khách. Thứ tự dòng không quan trọng.
```sql
SELECT city, count(*)
FROM customers
GROUP BY city
HAVING count(*) >= 500
```

## Step 3: Sản phẩm bán chạy
Những sản phẩm đã bán được từ 150 món trở lên, cộng mọi dòng hàng của mọi đơn từ ngày mở sàn: mã sản phẩm và tổng số món. Thứ tự dòng không quan trọng.
```sql
SELECT product_id, sum(quantity)
FROM order_items
GROUP BY product_id
HAVING sum(quantity) >= 150
```

## Hints
1. Cả ba bước đều gom nhóm rồi tính. Bước 1 lọc dòng trước khi gom; bước 2 và 3 lọc nhóm sau khi gom.
2. Bước 1: `status = 'paid'`, nhóm theo `method`. Bước 2: nhóm theo `city`, `HAVING count(*) >= 500`. Bước 3: số món là cột `quantity`, nhóm theo `product_id`, `HAVING sum(quantity) >= 150`.
3. `SELECT product_id, sum(quantity) FROM order_items GROUP BY product_id HAVING ...`

# EN
This is your promotion review. On Monday morning I run the October wrap-up with accounting, marketing and the category team, and I need three tables of figures. Get all three right and you take another step in your career.

## Step 1: October money by payment method
For October 2026 (by the moment the money was collected), for each payment method: the number of payments collected successfully and the total collected. Drop failed or refunded payments. Row order does not matter.

## Step 2: Cities with many customers
The cities with 500 or more registered customers (every customer since the marketplace opened): city name and number of customers. Row order does not matter.

## Step 3: Best sellers
The products that sold 150 units or more, adding up every order line of every order since the marketplace opened: product number and total units. Row order does not matter.

## Hints
1. All three steps group and then compute. Step 1 filters rows before grouping; steps 2 and 3 filter groups after grouping.
2. Step 1: `status = 'paid'`, grouped by `method`. Step 2: grouped by `city`, `HAVING count(*) >= 500`. Step 3: units are column `quantity`, grouped by `product_id`, `HAVING sum(quantity) >= 150`.
3. `SELECT product_id, sum(quantity) FROM order_items GROUP BY product_id HAVING ...`

=== tickets/ch3/ecom-ch3-01.md ===
---
id: ecom-ch3-01
chapter: 3
title: Đơn bị hủy trong ngày sale
title_en: Orders cancelled on a sale day
from: { name: Hồ Ngọc Diệp, dept: CS }
difficulty: 2
beat: teach
format: worked
requires: [select, where, order_by]
grants: [join]
tables: [orders, customers]
ordered: true
columns:
  - { vi: "Mã đơn", en: "Order code" }
  - { vi: "Tên khách", en: "Customer name" }
  - { vi: "Thành phố của khách", en: "Customer city" }
variants:
  - { day: "10/10/2026", day_en: "10 October 2026", from: "2026-10-10", to: "2026-10-11" }
  - { day: "9/9/2026", day_en: "9 September 2026", from: "2026-09-09", to: "2026-09-10" }
  - { day: "11/11/2025", day_en: "11 November 2025", from: "2025-11-11", to: "2025-11-12" }
reflect:
  q: { vi: "Điều kiện ghép sau chữ ON nói gì?", en: "What does the matching condition after ON say?" }
  options:
    - { vi: "Dòng nào của bảng này đi với dòng nào của bảng kia: mã khách trong đơn bằng mã của khách", en: "Which row of one table goes with which row of the other: the customer number on the order equals the customer's own number" }
    - { vi: "Chỉ giữ những đơn bị hủy", en: "Keep only the cancelled orders" }
    - { vi: "Sắp xếp hai bảng theo cùng một cột", en: "Sort both tables by the same column" }
  answer: 0
  why: { vi: "ON ghép dòng theo khóa; lọc đơn bị hủy vẫn là việc của điều kiện lọc dòng.", en: "ON matches rows by key; keeping only cancelled orders is still the row filter's job." }
wrong:
  - sql: "SELECT o.code, c.full_name, c.city FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.ordered_at >= '{{from}}' AND o.ordered_at < '{{to}}' ORDER BY o.code"
    vi: "Danh sách đang có mọi đơn của ngày đó. Đề chỉ cần đơn bị hủy."
    en: "Your list has every order of that day. The request is only for cancelled orders."
---
Sau mỗi ngày sale lớn, nhóm chăm sóc khách hàng gọi cho những khách đã hủy đơn để hỏi lý do: hết hàng, đổi ý, hay chờ lâu quá. Trong danh mục đơn chỉ có mã khách, còn tên và thành phố nằm ở hồ sơ khách hàng, nên lần này bạn cần ghép hai bảng.

Đây là lần đầu bạn ghép bảng, nên mình gửi kèm một ví dụ mẫu.

## Task
Ngày {{day}} có những đơn nào bị hủy? Mỗi đơn gửi mình mã đơn, tên khách và thành phố của khách; xếp theo mã đơn.

## Example
```sql
SELECT r.created_on, r.rating, p.name   -- ①
FROM reviews r                          -- ②
JOIN products p ON p.id = r.product_id  -- ③
WHERE r.rating = 5 AND r.created_on = '2026-10-30'
```
Ví dụ: những đánh giá 5 sao viết ngày 30/10/2026, kèm tên sản phẩm được khen.

① Có hai bảng nên mỗi cột ghi kèm tên tắt của bảng: chữ r là danh mục đánh giá, chữ p là danh mục sản phẩm.

② Tên tắt đặt ngay sau tên bảng.

③ Ghép dòng: mỗi đánh giá đi với đúng sản phẩm có mã bằng mã sản phẩm ghi trong đánh giá.

## Hints
1. Đơn hàng có mã khách; tên và thành phố nằm ở hồ sơ khách hàng. Ghép hai bảng theo mã khách, rồi lọc đơn bị hủy trong ngày đó.
2. Bảng `orders` (cột `customer_id`, `status`, `ordered_at`) ghép với `customers` qua `c.id = o.customer_id`. Đơn bị hủy là `o.status = 'cancelled'`; ngày đó viết `o.ordered_at >= '{{from}}' AND o.ordered_at < '{{to}}'` vì cột có cả giờ.
3. `SELECT o.code, c.full_name, c.city FROM orders o JOIN customers c ON ... WHERE ... ORDER BY o.code`

## Solution
```sql
SELECT o.code, c.full_name, c.city
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.status = 'cancelled' AND o.ordered_at >= '{{from}}' AND o.ordered_at < '{{to}}'
ORDER BY o.code
```

# EN
After every big sale day, the customer care team calls the customers who cancelled to ask why: out of stock, a change of mind, or a wait that was too long. The order list only holds the customer number; names and cities are in the customer records, so this time you need to put two tables together.

This is your first join, so I am sending a worked example along.

## Task
Which orders were cancelled on {{day_en}}? For each one send me the order code, the customer name and the customer's city; sort by order code.

## Example
Example: the 5-star reviews written on 30 October 2026, with the name of the product they praise.

① There are two tables, so each column carries the table's short name: r is the review list, p is the product list.

② The short name goes right after the table name.

③ Matching rows: each review goes with the one product whose number equals the product number on the review.

## Hints
1. An order holds the customer number; the name and city are in the customer records. Join the two tables on the customer number, then keep the cancelled orders of that day.
2. Table `orders` (columns `customer_id`, `status`, `ordered_at`) joins `customers` through `c.id = o.customer_id`. Cancelled is `o.status = 'cancelled'`; that day is `o.ordered_at >= '{{from}}' AND o.ordered_at < '{{to}}'` because the column also holds the time.
3. `SELECT o.code, c.full_name, c.city FROM orders o JOIN customers c ON ... WHERE ... ORDER BY o.code`

=== tickets/ch3/ecom-ch3-02.md ===
---
id: ecom-ch3-02
chapter: 3
title: Doanh thu theo nhóm hàng
title_en: Revenue by category
from: { name: Đoàn Quốc Bảo, dept: Category }
difficulty: 3
beat: develop
format: faded
requires: [join, aggregate, group_by]
grants: [multi_join]
tables: [order_items, orders, products, categories]
columns:
  - { vi: "Nhóm hàng", en: "Category" }
  - { vi: "Doanh thu hàng (đồng)", en: "Goods revenue (VND)" }
starter: |
  SELECT c.name, sum(i.quantity * i.unit_price)
  FROM order_items i
  JOIN orders o ON o.id = ___
  JOIN products p ON p.id = ___
  JOIN categories c ON c.id = ___
  WHERE o.status = 'delivered' AND o.ordered_at >= '{{from}}' AND o.ordered_at < '{{to}}'
  GROUP BY c.name
variants:
  - { month: "10/2026", month_en: "October 2026", from: "2026-10-01", to: "2026-11-01" }
  - { month: "7/2026", month_en: "July 2026", from: "2026-07-01", to: "2026-08-01" }
  - { month: "12/2025", month_en: "December 2025", from: "2025-12-01", to: "2026-01-01" }
reflect:
  q: { vi: "Vì sao phải đi qua danh mục sản phẩm mới tới được nhóm hàng?", en: "Why go through the product list to reach the category?" }
  options:
    - { vi: "Dòng hàng chỉ ghi mã sản phẩm; mã nhóm hàng nằm ở sản phẩm", en: "An order line only holds the product number; the category number lives on the product" }
    - { vi: "Để kết quả chạy nhanh hơn", en: "To make the query faster" }
    - { vi: "Vì nhóm hàng không có tên", en: "Because categories have no name" }
  answer: 0
  why: { vi: "Mỗi lần ghép đi thêm một bước theo khóa: dòng hàng → sản phẩm → nhóm hàng.", en: "Each join walks one more step along a key: order line → product → category." }
wrong:
  - sql: "SELECT c.name, sum(i.quantity * i.unit_price) FROM order_items i JOIN orders o ON o.id = i.order_id JOIN products p ON p.id = i.product_id JOIN categories c ON c.id = p.category_id WHERE o.ordered_at >= '{{from}}' AND o.ordered_at < '{{to}}' GROUP BY c.name"
    vi: "Bạn đang cộng cả đơn bị hủy và đơn chưa giao. Đề chỉ tính đơn đã giao."
    en: "You are adding cancelled and not-yet-delivered orders too. The request only counts delivered orders."
---
Mỗi quý ngành hàng xếp lại vị trí các nhóm hàng trên ứng dụng. Nhóm nào mang về nhiều tiền thì được chỗ đẹp hơn, nên mình cần doanh thu theo nhóm hàng.

Dữ liệu nằm ở bốn bảng. Câu truy vấn trong editor đã viết sẵn đường đi, chỉ còn ba điều kiện ghép ___ chưa điền.

## Task
Các đơn đặt trong tháng {{month}} và đã giao xong: doanh thu hàng (số lượng nhân đơn giá, cộng mọi dòng hàng) theo từng nhóm hàng. Gửi tên nhóm hàng và doanh thu. Thứ tự dòng không quan trọng.

## Hints
1. Dòng hàng có mã đơn và mã sản phẩm; sản phẩm có mã nhóm hàng; tên nhóm hàng nằm ở danh mục nhóm hàng. Mỗi lần ghép đi thêm một bước.
2. `o.id = i.order_id`, `p.id = i.product_id`, `c.id = p.category_id`.
3. `... JOIN orders o ON o.id = i.order_id JOIN products p ON p.id = i.product_id JOIN categories c ON c.id = p.category_id ...`

## Solution
```sql
SELECT c.name, sum(i.quantity * i.unit_price)
FROM order_items i
JOIN orders o ON o.id = i.order_id
JOIN products p ON p.id = i.product_id
JOIN categories c ON c.id = p.category_id
WHERE o.status = 'delivered' AND o.ordered_at >= '{{from}}' AND o.ordered_at < '{{to}}'
GROUP BY c.name
```

# EN
Every quarter the category team reshuffles where categories sit in the app. The categories that bring in the most money get the best spots, so I need revenue by category.

The data sits in four tables. The query in the editor already walks the path; only the three ___ join conditions are missing.

## Task
For orders placed in {{month_en}} and fully delivered: goods revenue (quantity times unit price, added over every order line) per category. Send the category name and the revenue. Row order does not matter.

## Hints
1. An order line has an order number and a product number; a product has a category number; the category name is in the category list. Each join walks one more step.
2. `o.id = i.order_id`, `p.id = i.product_id`, `c.id = p.category_id`.
3. `... JOIN orders o ON o.id = i.order_id JOIN products p ON p.id = i.product_id JOIN categories c ON c.id = p.category_id ...`

=== tickets/ch3/ecom-ch3-03.md ===
---
id: ecom-ch3-03
chapter: 3
title: Khách đăng ký mà chưa mua lần nào
title_en: Customers who signed up but never bought
from: { name: Trịnh Mai Anh, dept: Marketing }
difficulty: 3
beat: twist
requires: [join]
grants: [left_join, anti_join]
tables: [customers, orders]
columns:
  - { vi: "Mã khách", en: "Customer number" }
  - { vi: "Họ tên", en: "Full name" }
  - { vi: "Ngày đăng ký", en: "Signup date" }
variants:
  - { month: "9/2026", month_en: "September 2026", from: "2026-09-01", to: "2026-10-01" }
  - { month: "7/2026", month_en: "July 2026", from: "2026-07-01", to: "2026-08-01" }
  - { month: "5/2026", month_en: "May 2026", from: "2026-05-01", to: "2026-06-01" }
reflect:
  q: { vi: "Vì sao ghép thường (không LEFT) không bao giờ tìm ra khách chưa mua?", en: "Why can a plain join (not LEFT) never find customers who never bought?" }
  options:
    - { vi: "Ghép thường bỏ mọi khách không có đơn nào khớp, nên những khách cần tìm đã biến mất", en: "A plain join drops every customer with no matching order, so the very customers you want are gone" }
    - { vi: "Ghép thường chạy chậm hơn", en: "A plain join is slower" }
    - { vi: "Ghép thường không đọc được ngày đăng ký", en: "A plain join cannot read the signup date" }
  answer: 0
  why: { vi: "LEFT JOIN giữ mọi khách; khách không có đơn thì các cột của đơn để trống, và điều kiện cột đơn trống chọn đúng họ.", en: "LEFT JOIN keeps every customer; a customer with no order gets empty order columns, and the empty-order condition picks exactly them." }
wrong:
  - sql: "SELECT c.id, c.full_name, c.signup_date FROM customers c LEFT JOIN orders o ON o.customer_id = c.id AND o.status <> 'cancelled' WHERE o.id IS NULL AND c.signup_date >= '{{from}}' AND c.signup_date < '{{to}}'"
    vi: "Danh sách có cả khách đã đặt đơn rồi hủy. Đề cần khách chưa đặt một đơn nào, kể cả đơn đã hủy."
    en: "Your list includes customers who placed an order and then cancelled it. The request wants customers who never placed any order, cancelled ones included."
---
Marketing sắp gửi một mã giảm giá cho khách đã tạo tài khoản mà chưa mua lần nào, để kéo họ đặt đơn đầu tiên. Gửi nhầm cho khách đã mua thì tốn tiền vô ích.

## Task
Những khách đăng ký trong tháng {{month}} mà đến nay chưa đặt một đơn nào (kể cả đơn đã hủy cũng chưa có): mã khách, họ tên, ngày đăng ký. Thứ tự dòng không quan trọng.

## Hints
1. Bài này tìm thứ không có: giữ mọi khách, gắn đơn của họ nếu có, rồi chỉ giữ khách không gắn được đơn nào.
2. `customers c LEFT JOIN orders o ON o.customer_id = c.id` giữ cả khách không có đơn; với họ `o.id` trống, nên lọc `o.id IS NULL`.
3. `SELECT c.id, c.full_name, c.signup_date FROM customers c LEFT JOIN orders o ON ... WHERE o.id IS NULL AND ...`

## Solution
```sql
SELECT c.id, c.full_name, c.signup_date
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.id IS NULL AND c.signup_date >= '{{from}}' AND c.signup_date < '{{to}}'
```

# EN
Marketing is about to send a discount code to customers who opened an account but never bought, to win their first order. Sending it to customers who already buy is money thrown away.

## Task
The customers who signed up in {{month_en}} and have not placed a single order so far (not even a cancelled one): customer number, full name, signup date. Row order does not matter.

## Hints
1. This task looks for what is missing: keep every customer, attach their orders if any, then keep only the customers with no order attached.
2. `customers c LEFT JOIN orders o ON o.customer_id = c.id` keeps customers with no order too; for them `o.id` is empty, so filter `o.id IS NULL`.
3. `SELECT c.id, c.full_name, c.signup_date FROM customers c LEFT JOIN orders o ON ... WHERE o.id IS NULL AND ...`

=== tickets/ch3/ecom-ch3-04.md ===
---
id: ecom-ch3-04
chapter: 3
title: Mã giảm giá nào được dùng nhiều
title_en: Which discount codes get used
from: { name: Kha Văn Lộc, dept: Finance }
difficulty: 2
beat: rest
requires: [join, aggregate, group_by, order_by]
grants: []
tables: [vouchers, orders]
ordered: true
columns:
  - { vi: "Mã giảm giá", en: "Discount code" }
  - { vi: "Chương trình", en: "Campaign" }
  - { vi: "Số đơn không hủy", en: "Orders not cancelled" }
reflect:
  q: { vi: "Vì sao cột chương trình cũng phải nằm trong phần gom nhóm?", en: "Why must the campaign column also be in the grouping?" }
  options:
    - { vi: "Mọi cột không nằm trong hàm gộp phải là cột gom nhóm, kể cả khi mỗi mã chỉ có một chương trình", en: "Every column outside an aggregate must be a grouping column, even when each code has only one campaign" }
    - { vi: "Để sắp xếp theo chương trình", en: "To sort by campaign" }
    - { vi: "Không cần, bỏ ra vẫn chạy", en: "It is not needed; the query runs without it" }
  answer: 0
  why: { vi: "Cơ sở dữ liệu không đoán rằng một mã chỉ có một chương trình; ghi cả hai cột vào phần gom nhóm là xong.", en: "The database does not assume a code has only one campaign; listing both columns in the grouping settles it." }
wrong:
  - sql: "SELECT v.code, v.campaign, count(*) FROM vouchers v JOIN orders o ON o.voucher_id = v.id GROUP BY v.code, v.campaign ORDER BY 3 DESC, v.code"
    vi: "Bạn đang đếm cả đơn đã hủy. Đề chỉ đếm đơn không bị hủy."
    en: "You are also counting cancelled orders. The request only counts orders that were not cancelled."
---
Phòng kế toán phải báo cáo tiền giảm giá theo từng chương trình. Trước hết mình cần biết mỗi mã giảm giá đã thật sự được dùng ở bao nhiêu đơn.

## Task
Mỗi mã giảm giá đã được dùng ở bao nhiêu đơn không bị hủy? Gửi mã, tên chương trình và số đơn. Nhiều đơn nhất lên đầu; bằng nhau thì mã xếp theo thứ tự chữ cái.

## Hints
1. Đơn hàng ghi mã giảm giá đã dùng (nếu có). Ghép danh mục mã giảm giá với đơn, bỏ đơn đã hủy, rồi đếm theo từng mã.
2. Ghép `o.voucher_id = v.id`, lọc `o.status <> 'cancelled'`, gom nhóm theo `v.code, v.campaign`, xếp `ORDER BY 3 DESC, v.code`.
3. `SELECT v.code, v.campaign, count(*) FROM vouchers v JOIN orders o ON ... WHERE ... GROUP BY v.code, v.campaign ORDER BY 3 DESC, v.code`

## Solution
```sql
SELECT v.code, v.campaign, count(*)
FROM vouchers v
JOIN orders o ON o.voucher_id = v.id
WHERE o.status <> 'cancelled'
GROUP BY v.code, v.campaign
ORDER BY 3 DESC, v.code
```

# EN
Accounting has to report discount money campaign by campaign. First I need to know how many orders really used each discount code.

## Task
How many orders that were not cancelled used each discount code? Send the code, the campaign name and the number of orders. Most orders first; on equal numbers, codes in alphabetical order.

## Hints
1. An order records the discount code it used (if any). Join the discount code list with the orders, drop cancelled orders, then count per code.
2. Join on `o.voucher_id = v.id`, filter `o.status <> 'cancelled'`, group by `v.code, v.campaign`, sort with `ORDER BY 3 DESC, v.code`.
3. `SELECT v.code, v.campaign, count(*) FROM vouchers v JOIN orders o ON ... WHERE ... GROUP BY v.code, v.campaign ORDER BY 3 DESC, v.code`

=== tickets/ch3/ecom-ch3-05.md ===
---
id: ecom-ch3-05
chapter: 3
title: "Đánh giá thăng tiến: shop, sản phẩm và tiền chưa thu"
title_en: "Promotion review: shops, products and money never collected"
from: { name: Võ Thanh Hà, dept: Management }
difficulty: 3
beat: boss
requires: [multi_join, left_join, anti_join, join, aggregate, group_by, order_by, limit]
grants: []
tables: [order_items, orders, products, sellers, reviews, customers, payments]
ordered: true
columns:
  - [{ vi: "Tên shop", en: "Shop name" }, { vi: "Doanh thu hàng (đồng)", en: "Goods revenue (VND)" }]
  - [{ vi: "Mã SKU", en: "SKU code" }, { vi: "Tên sản phẩm", en: "Product name" }]
  - [{ vi: "Thành phố của khách", en: "Customer city" }, { vi: "Số đơn hủy chưa có thanh toán", en: "Cancelled orders with no payment" }]
conclusion:
  question: "Ở bước 2, vì sao điều kiện về ngày đánh giá phải nằm trong điều kiện ghép, không nằm trong điều kiện lọc dòng?"
  options:
    - "Lọc dòng chạy sau khi ghép: điều kiện ngày trên đánh giá sẽ loại luôn các sản phẩm không có đánh giá, nên không còn gì để tìm"
    - "Vì điều kiện ngày chạy nhanh hơn khi ghép"
    - "Đặt ở đâu cũng cho cùng kết quả"
  answer: 0
conclusion_en:
  question: "In step 2, why must the condition on the review date sit in the join condition, not in the row filter?"
  options:
    - "The row filter runs after the join: a date condition on reviews would also drop the products with no review, leaving nothing to find"
    - "Because the date condition runs faster inside the join"
    - "Either place gives the same result"
---
Đây là buổi đánh giá thăng tiến của bạn. Hội đồng quản trị hỏi mình ba câu về shop, sản phẩm và tiền, và mình cần số liệu trước chiều nay. Làm đúng cả ba là bạn trở thành Data Analyst chính thức.

## Step 1: Năm shop bán được nhiều tiền nhất quý 3
Các đơn đặt trong quý 3/2026 (từ 01/07 đến hết 30/09) và đã giao xong: năm shop có doanh thu hàng (số lượng nhân đơn giá) lớn nhất. Gửi tên shop và doanh thu; lớn nhất lên đầu, bằng nhau thì xếp theo tên shop.
```sql
SELECT s.name, sum(i.quantity * i.unit_price)
FROM order_items i
JOIN orders o ON o.id = i.order_id
JOIN products p ON p.id = i.product_id
JOIN sellers s ON s.id = p.seller_id
WHERE o.status = 'delivered' AND o.ordered_at >= '2026-07-01' AND o.ordered_at < '2026-10-01'
GROUP BY s.id, s.name
ORDER BY 2 DESC, s.name
LIMIT 5
```

## Step 2: Sản phẩm không ai đánh giá từ tháng 7
Những sản phẩm đang còn bán mà chưa nhận đánh giá nào từ ngày 01/07/2026 (đánh giá trước đó không tính): mã SKU và tên sản phẩm, xếp theo mã SKU.
```sql
SELECT p.sku, p.name
FROM products p
LEFT JOIN reviews r ON r.product_id = p.id AND r.created_on >= '2026-07-01'
WHERE r.id IS NULL AND p.is_active = true
ORDER BY p.sku
```

## Step 3: Đơn hủy chưa có thanh toán
Những đơn đã hủy mà không có một khoản thanh toán nào (khách trả khi nhận hàng rồi hủy trước khi giao), đếm theo thành phố của khách. Gửi thành phố và số đơn, xếp theo tên thành phố.
```sql
SELECT c.city, count(*)
FROM orders o
JOIN customers c ON c.id = o.customer_id
LEFT JOIN payments p ON p.order_id = o.id
WHERE o.status = 'cancelled' AND p.id IS NULL
GROUP BY c.city
ORDER BY c.city
```

## Hints
1. Bước 1 đi qua bốn bảng như bài doanh thu theo nhóm hàng, nhưng dừng ở shop. Bước 2 và 3 tìm thứ không có: giữ mọi sản phẩm (hay mọi đơn), gắn đánh giá (hay thanh toán) nếu có, rồi giữ dòng không gắn được gì.
2. Bước 1: `JOIN sellers s ON s.id = p.seller_id`, gom theo `s.id, s.name`. Bước 2: điều kiện ngày đặt trong phần ghép `ON r.product_id = p.id AND r.created_on >= '2026-07-01'`, rồi lọc `r.id IS NULL`. Bước 3: `LEFT JOIN payments p ON p.order_id = o.id` và `p.id IS NULL`.
3. `SELECT p.sku, p.name FROM products p LEFT JOIN reviews r ON ... WHERE r.id IS NULL AND p.is_active = true ORDER BY p.sku`

# EN
This is your promotion review. The board asked me three questions about shops, products and money, and I need the figures before this afternoon. Get all three right and you become a full Data Analyst.

## Step 1: The five top-earning shops of Q3
For orders placed in Q3 2026 (1 July to 30 September) and fully delivered: the five shops with the highest goods revenue (quantity times unit price). Send the shop name and revenue; highest first, on equal revenue by shop name.

## Step 2: Products nobody reviewed since July
The products still on sale that have received no review since 1 July 2026 (older reviews do not count): SKU code and product name, sorted by SKU code.

## Step 3: Cancelled orders with no payment
The cancelled orders that have no payment at all (customers paying on delivery who cancelled before delivery), counted by the customer's city. Send the city and the number of orders, sorted by city name.

## Hints
1. Step 1 walks four tables like the revenue-by-category task, but stops at the shop. Steps 2 and 3 look for what is missing: keep every product (or every order), attach reviews (or payments) if any, then keep the rows with nothing attached.
2. Step 1: `JOIN sellers s ON s.id = p.seller_id`, grouped by `s.id, s.name`. Step 2: the date condition goes into the join `ON r.product_id = p.id AND r.created_on >= '2026-07-01'`, then filter `r.id IS NULL`. Step 3: `LEFT JOIN payments p ON p.order_id = o.id` and `p.id IS NULL`.
3. `SELECT p.sku, p.name FROM products p LEFT JOIN reviews r ON ... WHERE r.id IS NULL AND p.is_active = true ORDER BY p.sku`

=== tickets/ch4/ecom-ch4-01.md ===
---
id: ecom-ch4-01
chapter: 4
title: Kiện Kite Logistics giao trễ
title_en: Late Kite Logistics parcels
from: { name: Nguyễn Thu Uyên, dept: Ops }
difficulty: 2
beat: teach
format: worked
requires: [join, order_by]
grants: [date_math]
tables: [deliveries, orders]
ordered: true
columns:
  - { vi: "Mã đơn", en: "Order code" }
  - { vi: "Thành phố nhận", en: "Delivery city" }
  - { vi: "Ngày hẹn giao", en: "Promised date" }
  - { vi: "Ngày giao thực tế", en: "Actual delivery date" }
  - { vi: "Số ngày trễ", en: "Days late" }
variants:
  - { month: "10/2026", month_en: "October 2026", from: "2026-10-01", to: "2026-11-01" }
  - { month: "9/2026", month_en: "September 2026", from: "2026-09-01", to: "2026-10-01" }
  - { month: "8/2026", month_en: "August 2026", from: "2026-08-01", to: "2026-09-01" }
reflect:
  q: { vi: "Lấy ngày giao thực tế trừ ngày hẹn giao thì được gì?", en: "What do you get when you subtract the promised date from the actual delivery date?" }
  options:
    - { vi: "Số ngày giữa hai mốc, là một số nguyên (âm nếu giao sớm)", en: "The number of days between them, an integer (negative when early)" }
    - { vi: "Một ngày mới", en: "A new date" }
    - { vi: "Một khoảng thời gian tính bằng giờ", en: "A time span in hours" }
  answer: 0
  why: { vi: "Ngày trừ ngày ra số ngày; ngày cộng một số nguyên ra một ngày mới, như ngày kiểm lại trong ví dụ mẫu.", en: "A date minus a date is a number of days; a date plus an integer is a new date, like the check date in the worked example." }
wrong:
  - sql: "SELECT o.code, d.city, d.promised_on, d.delivered_on, d.delivered_on - d.promised_on FROM deliveries d JOIN orders o ON o.id = d.order_id WHERE d.courier = 'Kite Logistics' AND d.shipped_on >= '{{from}}' AND d.shipped_on < '{{to}}' AND d.delivered_on - d.promised_on >= 2 ORDER BY 5 DESC, o.code"
    vi: "Danh sách có cả kiện trễ đúng 2 ngày. Đề chỉ cần kiện trễ hơn 2 ngày."
    en: "Your list also has parcels exactly 2 days late. The request is only for parcels more than 2 days late."
---
Khách ở miền Trung than phiền đơn giao chậm. Trước khi gặp Kite Logistics, mình cần danh sách kiện họ giao trễ nhiều, kèm số ngày trễ cụ thể để đối chiếu.

Đây là việc đầu tiên của bạn với ngày tháng, nên mình gửi kèm một ví dụ mẫu.

## Task
Những kiện do Kite Logistics chở, gửi đi trong tháng {{month}}, mà giao trễ hơn 2 ngày so với ngày hẹn: mã đơn, thành phố nhận, ngày hẹn giao, ngày giao thực tế và số ngày trễ. Trễ nhiều nhất lên đầu; bằng nhau thì mã đơn nhỏ hơn đứng trước.

## Example
```sql
SELECT order_id, shipped_on, promised_on,
       promised_on - shipped_on AS days_promised,   -- ①
       promised_on + 7 AS check_on                  -- ②
FROM deliveries
WHERE shipped_on >= '2026-06-01' AND shipped_on < '2026-06-08'   -- ③
  AND promised_on - shipped_on >= 3                              -- ④
ORDER BY order_id
```
Ví dụ: tuần 1–7/6/2026, kiện nào được hẹn giao từ 3 ngày trở lên sau ngày gửi, và nếu khách khiếu nại thì hạn kiểm lại (7 ngày sau ngày hẹn) là ngày nào?

① Ngày trừ ngày ra số ngày: số ngày hẹn giao tính từ ngày gửi.

② Ngày cộng một số nguyên ra một ngày mới: hạn kiểm lại.

③ Khoảng ngày viết dạng nửa mở: từ ngày đầu, và trước ngày ngay sau ngày cuối.

④ Điều kiện đặt thẳng lên phép trừ.

## Hints
1. Thông tin giao hàng nằm ở danh mục giao hàng, mã đơn nằm ở đơn hàng. Số ngày trễ là ngày giao thực tế trừ ngày hẹn, như ví dụ mẫu.
2. Bảng `deliveries` (cột `courier`, `shipped_on`, `promised_on`, `delivered_on`) ghép `orders` qua `o.id = d.order_id`. Trễ hơn 2 ngày là `d.delivered_on - d.promised_on > 2`; sắp xếp `ORDER BY 5 DESC, o.code`.
3. `SELECT o.code, d.city, d.promised_on, d.delivered_on, d.delivered_on - d.promised_on FROM deliveries d JOIN orders o ON ... WHERE ... ORDER BY 5 DESC, o.code`

## Solution
```sql
SELECT o.code, d.city, d.promised_on, d.delivered_on, d.delivered_on - d.promised_on
FROM deliveries d
JOIN orders o ON o.id = d.order_id
WHERE d.courier = 'Kite Logistics' AND d.shipped_on >= '{{from}}' AND d.shipped_on < '{{to}}'
  AND d.delivered_on - d.promised_on > 2
ORDER BY 5 DESC, o.code
```

# EN
Customers in central Vietnam complain that deliveries are slow. Before I meet Kite Logistics, I need the list of parcels they delivered very late, with the exact number of days late to check against.

This is your first task with dates, so I am sending a worked example along.

## Task
The parcels carried by Kite Logistics, shipped in {{month_en}}, that arrived more than 2 days after the promised date: order code, delivery city, promised date, actual delivery date and days late. Most days late first; on equal days, the smaller order code first.

## Example
Example: in the week of 1 to 7 June 2026, which parcels were promised 3 or more days after shipping, and if the customer complains, when is the check date (7 days after the promised date)?

① A date minus a date gives a number of days: how many days after shipping the delivery was promised.

② A date plus an integer gives a new date: the check date.

③ Date ranges are written half-open: from the first day, and before the day after the last one.

④ The condition works on the subtraction itself.

## Hints
1. Delivery details are in the delivery list; the order code is in the orders. Days late is the actual delivery date minus the promised date, like the worked example.
2. Table `deliveries` (columns `courier`, `shipped_on`, `promised_on`, `delivered_on`) joins `orders` through `o.id = d.order_id`. More than 2 days late is `d.delivered_on - d.promised_on > 2`; sort with `ORDER BY 5 DESC, o.code`.
3. `SELECT o.code, d.city, d.promised_on, d.delivered_on, d.delivered_on - d.promised_on FROM deliveries d JOIN orders o ON ... WHERE ... ORDER BY 5 DESC, o.code`

=== tickets/ch4/ecom-ch4-02.md ===
---
id: ecom-ch4-02
chapter: 4
title: Số đơn từng tháng
title_en: Orders per month
from: { name: Trịnh Mai Anh, dept: Marketing }
difficulty: 2
beat: develop
format: faded
requires: [aggregate, group_by, order_by]
grants: [date_bucket]
tables: [orders]
ordered: true
columns:
  - { vi: "Tháng (ngày đầu tháng)", en: "Month (first day)" }
  - { vi: "Số đơn không hủy", en: "Orders not cancelled" }
starter: |
  SELECT date_trunc(___, ordered_at) AS month, count(*) AS orders
  FROM orders
  WHERE status <> 'cancelled' AND ordered_at >= '{{from}}' AND ordered_at < '{{to}}'
  GROUP BY ___
  ORDER BY month
variants:
  - { from: "2025-11-01", to: "2026-11-01", first: "11/2025", last: "10/2026", first_en: "November 2025", last_en: "October 2026" }
  - { from: "2025-01-01", to: "2026-01-01", first: "01/2025", last: "12/2025", first_en: "January 2025", last_en: "December 2025" }
  - { from: "2025-07-01", to: "2026-07-01", first: "07/2025", last: "06/2026", first_en: "July 2025", last_en: "June 2026" }
reflect:
  q: { vi: "Vì sao không gom theo số tháng (1 đến 12) mà ghi tháng bằng ngày đầu tháng?", en: "Why not group by the month number (1 to 12) instead of the first day of the month?" }
  options:
    - { vi: "Mười hai tháng có thể vắt qua hai năm; số tháng gộp chung cùng một tháng của hai năm", en: "Twelve months can span two years; the month number merges the same month of both years" }
    - { vi: "Gom theo số tháng chạy chậm hơn", en: "Grouping by the month number is slower" }
    - { vi: "Số tháng không sắp xếp được", en: "Month numbers cannot be sorted" }
  answer: 0
  why: { vi: "Ngày đầu tháng giữ cả năm lẫn tháng, nên mỗi tháng của mỗi năm là một nhóm riêng và vẫn sắp đúng thứ tự thời gian.", en: "The first day of the month keeps both the year and the month, so every month of every year is its own group and still sorts in time order." }
wrong:
  - sql: "SELECT extract(month FROM ordered_at), count(*) FROM orders WHERE status <> 'cancelled' AND ordered_at >= '{{from}}' AND ordered_at < '{{to}}' GROUP BY 1 ORDER BY 1"
    vi: "Bạn đang gom theo số tháng (1 đến 12). Đề cần ghi tháng bằng ngày đầu tháng, để không nhầm tháng của hai năm khác nhau."
    en: "You are grouping by the month number (1 to 12). The request wants each month as its first day, so months of different years never mix."
---
Mình đang lên lịch các đợt sale năm sau và cần thấy sàn bận nhất vào những tháng nào. Số đơn từng tháng trong mười hai tháng là đủ.

Câu truy vấn trong editor đã viết gần xong. Chỗ trống đầu là đơn vị thời gian, viết như một chữ trong nháy đơn; chỗ thứ hai là thứ cần gom nhóm.

## Task
Mỗi tháng từ {{first}} đến {{last}} có bao nhiêu đơn, không tính đơn đã hủy? Mỗi tháng một dòng: tháng (ghi bằng ngày đầu tháng) và số đơn; tháng sớm nhất lên đầu.

## Hints
1. Đưa mọi thời điểm đặt đơn của cùng một tháng về một giá trị chung (ngày đầu tháng), rồi đếm theo giá trị đó.
2. `date_trunc('month', ordered_at)` đưa mỗi thời điểm về đầu tháng. Chỗ trống thứ hai: `GROUP BY month` hoặc `GROUP BY 1`.
3. `SELECT date_trunc('month', ordered_at) AS month, count(*) AS orders FROM orders WHERE ... GROUP BY month ORDER BY month`

## Solution
```sql
SELECT date_trunc('month', ordered_at) AS month, count(*) AS orders
FROM orders
WHERE status <> 'cancelled' AND ordered_at >= '{{from}}' AND ordered_at < '{{to}}'
GROUP BY month
ORDER BY month
```

# EN
I am planning next year's sales and need to see which months keep the marketplace busiest. The number of orders per month over twelve months is enough.

The query in the editor is almost done. The first blank is the time unit, written as a word in single quotes; the second is what you group by.

## Task
For each month from {{first_en}} to {{last_en}}, how many orders were placed, cancelled ones not counted? One row per month: the month (as its first day) and the number of orders; earliest month first.

## Hints
1. Bring every order time of the same month to one shared value (the first day of the month), then count by that value.
2. `date_trunc('month', ordered_at)` turns each time into the start of its month. The second blank: `GROUP BY month` or `GROUP BY 1`.
3. `SELECT date_trunc('month', ordered_at) AS month, count(*) AS orders FROM orders WHERE ... GROUP BY month ORDER BY month`

=== tickets/ch4/ecom-ch4-03.md ===
---
id: ecom-ch4-03
chapter: 4
title: Kiện đi mất bao lâu, kể cả kiện chưa tới
title_en: How long parcels take, unfinished ones included
from: { name: Nguyễn Thu Uyên, dept: Ops }
difficulty: 3
beat: twist
requires: [aggregate, group_by, order_by, date_math]
grants: [null_logic, coalesce]
tables: [deliveries]
ordered: true
columns:
  - { vi: "Đơn vị vận chuyển", en: "Courier" }
  - { vi: "Số ngày đi trung bình", en: "Average days on the road" }
variants:
  - { from: "2026-10-20", d1: "20/10/2026", d1_en: "20 October 2026" }
  - { from: "2026-10-15", d1: "15/10/2026", d1_en: "15 October 2026" }
  - { from: "2026-10-25", d1: "25/10/2026", d1_en: "25 October 2026" }
reflect:
  q: { vi: "Nếu tính trung bình thẳng trên ngày giao, kiện chưa giao bị xử lý thế nào?", en: "If you average straight over the delivery date, what happens to parcels not delivered yet?" }
  options:
    - { vi: "Bị bỏ qua, vì phép trừ với ô trống ra ô trống và hàm trung bình bỏ ô trống", en: "They are skipped, because subtracting from an empty cell gives an empty cell and the average ignores empty cells" }
    - { vi: "Được tính là 0 ngày", en: "They count as 0 days" }
    - { vi: "Truy vấn báo lỗi", en: "The query fails" }
  answer: 0
  why: { vi: "Kiện chưa tới thường là kiện chậm nhất. Bỏ qua chúng làm con số đẹp hơn sự thật; thay ô trống bằng hôm nay thì tính được kiện đó đã đi bao lâu.", en: "Parcels still on the way are usually the slowest. Skipping them makes the figure look better than the truth; replacing the empty cell with today measures how long they have travelled so far." }
wrong:
  - sql: "SELECT courier, ROUND(AVG(delivered_on - shipped_on), 2) FROM deliveries WHERE shipped_on >= '{{from}}' GROUP BY courier ORDER BY courier"
    vi: "Kiện chưa giao đang bị bỏ qua: ngày giao trống nên phép trừ ra ô trống, và hàm trung bình bỏ ô trống. Đề cần tính kiện chưa giao đến hôm nay."
    en: "Parcels not delivered yet are being skipped: their delivery date is empty, so the subtraction is empty and the average ignores it. The request counts them up to today."
---
Bài trước chỉ nhìn kiện đã giao. Nhưng kiện đang trên đường thường lại là kiện chậm nhất, và trong danh mục giao hàng chúng có ngày giao để trống. Mình muốn con số thật, tính cả những kiện đó.

## Task
Các kiện gửi đi từ ngày {{d1}} đến hôm nay 31/10/2026: theo từng đơn vị vận chuyển, trung bình một kiện đã đi bao nhiêu ngày? Kiện đã giao tính từ ngày gửi đến ngày giao; kiện chưa giao tính từ ngày gửi đến hôm nay 31/10/2026. Làm tròn 2 chữ số thập phân; xếp theo tên đơn vị vận chuyển.

## Hints
1. Kiện chưa giao có ngày giao trống. Thay ô trống đó bằng ngày hôm nay rồi mới trừ, thì mọi kiện đều có số ngày.
2. `COALESCE(delivered_on, DATE '2026-10-31')` lấy ngày giao nếu có, không có thì lấy 31/10/2026. Kiểm một ô có trống không thì viết `delivered_on IS NULL`.
3. `SELECT courier, ROUND(AVG(COALESCE(delivered_on, DATE '2026-10-31') - shipped_on), 2) FROM deliveries WHERE ... GROUP BY courier ORDER BY courier`

## Solution
```sql
SELECT courier, ROUND(AVG(COALESCE(delivered_on, DATE '2026-10-31') - shipped_on), 2)
FROM deliveries
WHERE shipped_on >= '{{from}}'
GROUP BY courier
ORDER BY courier
```

# EN
The last task only looked at delivered parcels. But parcels still on the road are often the slowest ones, and in the delivery list their delivery date is empty. I want the real figure, with those parcels included.

## Task
For the parcels shipped from {{d1_en}} up to today, 31 October 2026: per courier, how many days on average has a parcel been on the road? Delivered parcels count from shipping to delivery; parcels not delivered yet count from shipping to today, 31 October 2026. Round to 2 decimals; sort by courier name.

## Hints
1. A parcel not delivered yet has an empty delivery date. Replace that empty cell with today before subtracting, and every parcel gets a number of days.
2. `COALESCE(delivered_on, DATE '2026-10-31')` takes the delivery date when there is one, otherwise 31 October 2026. To test whether a cell is empty, write `delivered_on IS NULL`.
3. `SELECT courier, ROUND(AVG(COALESCE(delivered_on, DATE '2026-10-31') - shipped_on), 2) FROM deliveries WHERE ... GROUP BY courier ORDER BY courier`

=== tickets/ch4/ecom-ch4-04.md ===
---
id: ecom-ch4-04
chapter: 4
title: Nhận hàng bao lâu thì khách viết đánh giá
title_en: How soon customers review after delivery
from: { name: Hồ Ngọc Diệp, dept: CS }
difficulty: 2
beat: rest
requires: [join, date_math, aggregate, group_by, order_by]
grants: []
tables: [reviews, deliveries]
ordered: true
columns:
  - { vi: "Số sao", en: "Stars" }
  - { vi: "Số ngày trung bình từ lúc nhận hàng", en: "Average days after delivery" }
reflect:
  q: { vi: "Vì sao ghép đánh giá với giao hàng theo mã đơn mà không theo mã sản phẩm?", en: "Why join reviews to deliveries on the order number and not the product number?" }
  options:
    - { vi: "Mỗi đơn có một lần giao; ngày giao thuộc về đơn, không thuộc về sản phẩm", en: "Each order has one delivery; the delivery date belongs to the order, not to the product" }
    - { vi: "Vì danh mục giao hàng không có cột nào khác", en: "Because the delivery list has no other column" }
    - { vi: "Ghép theo mã nào cũng được", en: "Any number works for the join" }
  answer: 0
  why: { vi: "Khóa ghép phải nói đúng quan hệ: một đánh giá thuộc một đơn, một đơn có một lần giao.", en: "The join key must state the real relationship: a review belongs to one order, and an order has one delivery." }
wrong:
  - sql: "SELECT r.rating, ROUND(AVG(r.created_on - d.shipped_on), 2) FROM reviews r JOIN deliveries d ON d.order_id = r.order_id GROUP BY r.rating ORDER BY r.rating"
    vi: "Bạn đang tính từ ngày gửi hàng. Đề tính từ ngày khách nhận hàng."
    en: "You are counting from the shipping date. The request counts from the day the customer received the parcel."
---
Mình muốn gửi tin nhắc khách viết đánh giá vào đúng lúc. Trước hết cần biết thường thì nhận hàng bao lâu khách mới viết, và khách chấm thấp có viết nhanh hơn không.

## Task
Với mỗi mức sao, trung bình khách viết đánh giá sau ngày nhận hàng bao nhiêu ngày? Làm tròn 2 chữ số thập phân; xếp theo số sao tăng dần.

## Hints
1. Ngày viết nằm ở đánh giá, ngày nhận hàng nằm ở danh mục giao hàng; hai bảng chung mã đơn. Trừ hai ngày, rồi lấy trung bình theo số sao.
2. Ghép `d.order_id = r.order_id`; số ngày là `r.created_on - d.delivered_on`; làm tròn `ROUND(AVG(...), 2)`.
3. `SELECT r.rating, ROUND(AVG(r.created_on - d.delivered_on), 2) FROM reviews r JOIN deliveries d ON ... GROUP BY r.rating ORDER BY r.rating`

## Solution
```sql
SELECT r.rating, ROUND(AVG(r.created_on - d.delivered_on), 2)
FROM reviews r
JOIN deliveries d ON d.order_id = r.order_id
GROUP BY r.rating
ORDER BY r.rating
```

# EN
I want to send review reminders at the right moment. First I need to know how long after delivery customers usually write, and whether low scores come faster.

## Task
For each star level, on average how many days after delivery do customers write their review? Round to 2 decimals; sort by stars, ascending.

## Hints
1. The writing date is on the review, the delivery date is in the delivery list; the two tables share the order number. Subtract the two dates, then average by stars.
2. Join on `d.order_id = r.order_id`; the days are `r.created_on - d.delivered_on`; round with `ROUND(AVG(...), 2)`.
3. `SELECT r.rating, ROUND(AVG(r.created_on - d.delivered_on), 2) FROM reviews r JOIN deliveries d ON ... GROUP BY r.rating ORDER BY r.rating`

=== tickets/ch4/ecom-ch4-05.md ===
---
id: ecom-ch4-05
chapter: 4
title: "Đánh giá thăng tiến: sau đợt sale 10.10"
title_en: "Promotion review: after the 10.10 sale"
from: { name: Võ Thanh Hà, dept: Management }
difficulty: 3
beat: boss
requires: [null_logic, coalesce, date_math, date_bucket, join, aggregate, group_by, order_by]
grants: []
tables: [orders, deliveries]
ordered: true
columns:
  - [{ vi: "Ngày", en: "Day" }, { vi: "Số đơn", en: "Orders" }]
  - [{ vi: "Mã đơn", en: "Order code" }, { vi: "Đơn vị vận chuyển", en: "Courier" }, { vi: "Thành phố nhận", en: "Delivery city" }, { vi: "Số ngày quá hẹn", en: "Days past the promise" }]
  - [{ vi: "Tuần gửi (thứ Hai đầu tuần)", en: "Shipping week (its Monday)" }, { vi: "Số ngày trễ trung bình", en: "Average days late" }]
conclusion:
  question: "Theo bước 3, Kite Logistics bắt đầu giao trễ ở miền Trung từ tuần nào?"
  options:
    - "Từ tuần bắt đầu thứ Hai 31/8/2026, ngay trước đợt sale 9.9"
    - "Từ tuần của đợt sale 10.10"
    - "Kite Logistics trễ đều từ đầu tháng 8"
  answer: 0
conclusion_en:
  question: "According to step 3, from which week did Kite Logistics start running late in central Vietnam?"
  options:
    - "From the week starting Monday 31 August 2026, right before the 9.9 sale"
    - "From the week of the 10.10 sale"
    - "Kite Logistics was equally late from early August"
---
Đây là buổi đánh giá thăng tiến của bạn. Đợt sale 10.10 vừa qua bán rất tốt, nhưng khách miền Trung than giao chậm. Mình cần ba bảng số cho buổi họp với Kite Logistics. Làm đúng cả ba là bạn bước thêm một bước trong sự nghiệp.

## Step 1: Đơn từng ngày quanh 10.10
Từ ngày 07/10 đến hết 13/10/2026, mỗi ngày có bao nhiêu đơn (tính mọi đơn, kể cả đơn đã hủy)? Ngày ghi bằng mốc đầu ngày; ngày sớm nhất lên đầu.
```sql
SELECT date_trunc('day', ordered_at), count(*)
FROM orders
WHERE ordered_at >= '2026-10-07' AND ordered_at < '2026-10-14'
GROUP BY 1
ORDER BY 1
```

## Step 2: Kiện quá hẹn mà chưa giao
Tính đến hôm nay 31/10/2026: các kiện chưa giao mà ngày hẹn giao đã qua (trước hôm nay). Gửi mã đơn, đơn vị vận chuyển, thành phố nhận và số ngày đã quá hẹn (31/10/2026 trừ ngày hẹn). Quá hẹn lâu nhất lên đầu; bằng nhau thì mã đơn nhỏ hơn đứng trước.
```sql
SELECT o.code, d.courier, d.city, DATE '2026-10-31' - d.promised_on
FROM deliveries d
JOIN orders o ON o.id = d.order_id
WHERE d.delivered_on IS NULL AND d.promised_on < '2026-10-31'
ORDER BY 4 DESC, o.code
```

## Step 3: Kite Logistics ở miền Trung, theo tuần
Các kiện Kite Logistics chở tới Da Nang, Hue và Nha Trang, gửi đi từ thứ Hai 03/08 đến hết Chủ nhật 25/10/2026: theo tuần gửi (tuần bắt đầu từ thứ Hai, ghi bằng ngày thứ Hai đó), trung bình giao trễ bao nhiêu ngày so với ngày hẹn? Kiện chưa giao tính đến hôm nay 31/10/2026. Làm tròn 2 chữ số thập phân; tuần sớm nhất lên đầu.
```sql
SELECT date_trunc('week', shipped_on), ROUND(AVG(COALESCE(delivered_on, DATE '2026-10-31') - promised_on), 2)
FROM deliveries
WHERE courier = 'Kite Logistics' AND city IN ('Da Nang', 'Hue', 'Nha Trang')
  AND shipped_on >= '2026-08-03' AND shipped_on < '2026-10-26'
GROUP BY 1
ORDER BY 1
```

## Hints
1. Bước 1 gom theo ngày như gom theo tháng. Bước 2 tìm kiện có ngày giao trống. Bước 3 gom theo tuần, và thay ngày giao trống bằng hôm nay như bài kiện đi mất bao lâu.
2. Bước 1: `date_trunc('day', ordered_at)`. Bước 2: `d.delivered_on IS NULL`, `DATE '2026-10-31' - d.promised_on`. Bước 3: `date_trunc('week', shipped_on)`, `COALESCE(delivered_on, DATE '2026-10-31') - promised_on`, `city IN ('Da Nang', 'Hue', 'Nha Trang')`.
3. `SELECT date_trunc('week', shipped_on), ROUND(AVG(COALESCE(delivered_on, DATE '2026-10-31') - promised_on), 2) FROM deliveries WHERE ... GROUP BY 1 ORDER BY 1`

# EN
This is your promotion review. The 10.10 sale sold very well, but customers in central Vietnam complain about slow deliveries. I need three tables for the meeting with Kite Logistics. Get all three right and you take another step in your career.

## Step 1: Orders per day around 10.10
From 7 to 13 October 2026, how many orders were placed each day (every order, cancelled ones included)? Each day shown as its start; earliest day first.

## Step 2: Parcels past their promise and not delivered
As of today, 31 October 2026: the parcels not delivered yet whose promised date has already passed (before today). Send the order code, courier, delivery city and how many days past the promise (31 October 2026 minus the promised date). Longest overdue first; on equal days, the smaller order code first.

## Step 3: Kite Logistics in central Vietnam, by week
The parcels Kite Logistics carried to Da Nang, Hue and Nha Trang, shipped from Monday 3 August to Sunday 25 October 2026: per shipping week (weeks start on Monday and are shown as that Monday), how many days late on average compared with the promised date? Parcels not delivered yet count up to today, 31 October 2026. Round to 2 decimals; earliest week first.

## Hints
1. Step 1 groups by day the way you grouped by month. Step 2 looks for parcels with an empty delivery date. Step 3 groups by week and replaces an empty delivery date with today, like the how-long-parcels-take task.
2. Step 1: `date_trunc('day', ordered_at)`. Step 2: `d.delivered_on IS NULL`, `DATE '2026-10-31' - d.promised_on`. Step 3: `date_trunc('week', shipped_on)`, `COALESCE(delivered_on, DATE '2026-10-31') - promised_on`, `city IN ('Da Nang', 'Hue', 'Nha Trang')`.
3. `SELECT date_trunc('week', shipped_on), ROUND(AVG(COALESCE(delivered_on, DATE '2026-10-31') - promised_on), 2) FROM deliveries WHERE ... GROUP BY 1 ORDER BY 1`

=== tickets/ch5/ecom-ch5-01.md ===
---
id: ecom-ch5-01
chapter: 5
title: Đơn nhỏ, đơn vừa, đơn lớn
title_en: Small, medium and large orders
from: { name: Trịnh Mai Anh, dept: Marketing }
difficulty: 2
beat: teach
format: worked
requires: [aggregate, group_by, order_by]
grants: [case_when]
tables: [payments]
ordered: true
columns:
  - { vi: "Nhóm giá trị (1 nhỏ, 2 vừa, 3 lớn)", en: "Value band (1 small, 2 medium, 3 large)" }
  - { vi: "Số khoản đã thu", en: "Payments collected" }
  - { vi: "Tổng tiền (đồng)", en: "Total (VND)" }
variants:
  - { month: "10/2026", month_en: "October 2026", from: "2026-10-01", to: "2026-11-01" }
  - { month: "7/2026", month_en: "July 2026", from: "2026-07-01", to: "2026-08-01" }
  - { month: "3/2026", month_en: "March 2026", from: "2026-03-01", to: "2026-04-01" }
reflect:
  q: { vi: "Các nhánh WHEN được xét theo thứ tự nào?", en: "In what order are the WHEN branches checked?" }
  options:
    - { vi: "Từ trên xuống; nhánh đúng đầu tiên thắng, các nhánh sau bị bỏ qua", en: "Top to bottom; the first true branch wins and later branches are skipped" }
    - { vi: "Nhánh có số lớn nhất thắng", en: "The branch with the largest number wins" }
    - { vi: "Mọi nhánh đúng đều được tính", en: "Every true branch counts" }
  answer: 0
  why: { vi: "Vì nhánh đầu tiên đúng thắng, mốc nhỏ phải đứng trước mốc lớn; viết ngược thì nhóm nhỏ không bao giờ có ai.", en: "Because the first true branch wins, the small threshold must come before the large one; written the other way round, the small band never gets anyone." }
wrong:
  - sql: "SELECT CASE WHEN amount < 500000 THEN 2 WHEN amount < 200000 THEN 1 ELSE 3 END AS band, count(*), sum(amount) FROM payments WHERE status = 'paid' AND paid_at >= '{{from}}' AND paid_at < '{{to}}' GROUP BY band ORDER BY band"
    vi: "Nhóm 1 đang trống: khoản dưới 200 nghìn cũng dưới 500 nghìn nên rơi vào nhánh đầu tiên. Đặt mốc nhỏ lên trước."
    en: "Band 1 is empty: a payment under 200 thousand is also under 500 thousand, so it falls into the first branch. Put the small threshold first."
---
Marketing đang nghĩ mức miễn phí giao hàng mới. Muốn đặt mức cho đúng, mình cần biết khách hay trả những đơn cỡ nào: đơn nhỏ, vừa hay lớn.

Lần này bạn tự đặt nhãn cho từng dòng theo luật, nên mình gửi kèm một ví dụ mẫu.

## Task
Tháng {{month}}, chia các khoản thanh toán đã thu thành công theo số tiền: nhóm 1 dưới 200 nghìn đồng, nhóm 2 từ 200 nghìn đến dưới 500 nghìn, nhóm 3 từ 500 nghìn trở lên. Mỗi nhóm một dòng: số nhóm, số khoản và tổng tiền; xếp theo số nhóm.

## Example
```sql
SELECT sku, price,
       CASE WHEN price < 100000 THEN 1      -- ①
            WHEN price < 1000000 THEN 2     -- ②
            ELSE 3                          -- ③
       END AS price_band
FROM products
WHERE category_id = 3
ORDER BY sku
```
Ví dụ: gắn mỗi sản phẩm nhóm hàng số 3 vào một hạng giá: 1 rẻ, 2 vừa, 3 cao cấp.

① Nhánh đầu tiên đúng thắng: món dưới 100 nghìn dừng ở đây.

② Tới nhánh này thì món chắc chắn không dưới 100 nghìn, nên chỉ cần ghi mốc trên.

③ Mọi món còn lại vào nhánh cuối.

## Hints
1. Gắn cho mỗi khoản một số nhóm theo luật của đề, rồi gom nhóm theo số đó và đếm, cộng.
2. `CASE WHEN amount < 200000 THEN 1 WHEN amount < 500000 THEN 2 ELSE 3 END AS band`, rồi `GROUP BY band ORDER BY band`.
3. `SELECT CASE ... END AS band, count(*), sum(amount) FROM payments WHERE status = 'paid' AND ... GROUP BY band ORDER BY band`

## Solution
```sql
SELECT CASE WHEN amount < 200000 THEN 1 WHEN amount < 500000 THEN 2 ELSE 3 END AS band,
       count(*), sum(amount)
FROM payments
WHERE status = 'paid' AND paid_at >= '{{from}}' AND paid_at < '{{to}}'
GROUP BY band
ORDER BY band
```

# EN
Marketing is thinking about a new free-shipping threshold. To set it right, I need to know what sizes of orders customers pay for: small, medium or large.

This time you label each row by a rule yourself, so I am sending a worked example along.

## Task
For {{month_en}}, split the payments collected successfully by amount: band 1 under 200 thousand VND, band 2 from 200 thousand to under 500 thousand, band 3 from 500 thousand up. One row per band: the band number, the number of payments and the total; sorted by band number.

## Example
Example: put each product of category number 3 into a price tier: 1 cheap, 2 medium, 3 premium.

① The first true branch wins: an item under 100 thousand stops here.

② By this branch the item is certainly not under 100 thousand, so only the upper limit is needed.

③ Everything else lands in the last branch.

## Hints
1. Give each payment a band number by the request's rule, then group by that number and count and add up.
2. `CASE WHEN amount < 200000 THEN 1 WHEN amount < 500000 THEN 2 ELSE 3 END AS band`, then `GROUP BY band ORDER BY band`.
3. `SELECT CASE ... END AS band, count(*), sum(amount) FROM payments WHERE status = 'paid' AND ... GROUP BY band ORDER BY band`

=== tickets/ch5/ecom-ch5-02.md ===
---
id: ecom-ch5-02
chapter: 5
title: Phễu mua hàng từng tháng
title_en: The monthly purchase funnel
from: { name: Lâm Gia Huy, dept: IT }
difficulty: 3
beat: develop
format: faded
requires: [date_bucket, group_by, order_by, null_logic]
grants: [conditional_agg]
tables: [web_sessions]
ordered: true
columns:
  - { vi: "Tháng (ngày đầu tháng)", en: "Month (first day)" }
  - { vi: "Số phiên truy cập", en: "Sessions" }
  - { vi: "Phiên có xem sản phẩm", en: "Sessions that viewed a product" }
  - { vi: "Phiên có thêm vào giỏ", en: "Sessions that added to cart" }
  - { vi: "Phiên ra đơn hàng", en: "Sessions that ended in an order" }
starter: |
  SELECT date_trunc('month', started_at) AS month,
         count(*) AS sessions,
         count(*) FILTER (WHERE ___) AS viewed,
         count(*) FILTER (WHERE ___) AS carted,
         count(*) FILTER (WHERE ___) AS ordered
  FROM web_sessions
  WHERE started_at >= '{{from}}' AND started_at < '{{to}}'
  GROUP BY month
  ORDER BY month
variants:
  - { qv: "3/2026", q_en: "Q3 2026", from: "2026-07-01", to: "2026-10-01" }
  - { qv: "2/2026", q_en: "Q2 2026", from: "2026-04-01", to: "2026-07-01" }
  - { qv: "4/2025", q_en: "Q4 2025", from: "2025-10-01", to: "2026-01-01" }
reflect:
  q: { vi: "Vì sao đếm theo cột có xem sản phẩm (thay vì đếm có điều kiện) lại ra đúng bằng tổng số phiên?", en: "Why does counting the viewed-a-product column (instead of a conditional count) give exactly the total number of sessions?" }
  options:
    - { vi: "Cột đúng/sai không bao giờ trống, nên đếm theo cột tính cả các phiên có giá trị sai", en: "A true/false column is never empty, so counting the column includes the sessions where it is false" }
    - { vi: "Vì phiên nào cũng có xem sản phẩm", en: "Because every session viewed a product" }
    - { vi: "Vì hàm đếm không đọc được cột đúng/sai", en: "Because the count cannot read true/false columns" }
  answer: 0
  why: { vi: "Đếm theo cột chỉ bỏ ô trống. Muốn đếm phiên thỏa một điều kiện thì đặt điều kiện vào FILTER.", en: "Counting a column only skips empty cells. To count sessions that meet a condition, put the condition in FILTER." }
wrong:
  - sql: "SELECT date_trunc('month', started_at) AS month, count(*), count(viewed_product), count(*) FILTER (WHERE added_to_cart), count(*) FILTER (WHERE order_id IS NOT NULL) FROM web_sessions WHERE started_at >= '{{from}}' AND started_at < '{{to}}' GROUP BY month ORDER BY month"
    vi: "Cột thứ ba đang bằng tổng số phiên: đếm theo cột đúng/sai tính cả phiên có giá trị sai. Đặt điều kiện vào FILTER."
    en: "The third column equals the total sessions: counting a true/false column includes the false ones. Put the condition in FILTER."
---
Mình đang dựng bảng theo dõi phễu mua hàng cho marketing: bao nhiêu người vào sàn, bao nhiêu người xem sản phẩm, thêm vào giỏ, rồi đặt đơn. Mỗi bước rơi rụng bao nhiêu là điều họ muốn thấy.

Câu truy vấn trong editor đã có khung; bạn chỉ cần điền ba điều kiện đếm ở các chỗ trống ___.

## Task
Phễu mua hàng từng tháng của quý {{qv}}: số phiên truy cập, số phiên có xem sản phẩm, số phiên có thêm vào giỏ, và số phiên kết thúc bằng một đơn hàng. Tháng ghi bằng ngày đầu tháng; tháng sớm nhất lên đầu.

## Hints
1. Mỗi tháng là một nhóm; trong nhóm cần bốn số đếm, mỗi số đếm một điều kiện riêng.
2. `count(*) FILTER (WHERE viewed_product)` chỉ đếm phiên có xem sản phẩm. Phiên ra đơn là phiên có mã đơn: `order_id IS NOT NULL`.
3. `count(*) FILTER (WHERE viewed_product)`, `count(*) FILTER (WHERE added_to_cart)`, `count(*) FILTER (WHERE order_id IS NOT NULL)`

## Solution
```sql
SELECT date_trunc('month', started_at) AS month,
       count(*) AS sessions,
       count(*) FILTER (WHERE viewed_product) AS viewed,
       count(*) FILTER (WHERE added_to_cart) AS carted,
       count(*) FILTER (WHERE order_id IS NOT NULL) AS ordered
FROM web_sessions
WHERE started_at >= '{{from}}' AND started_at < '{{to}}'
GROUP BY month
ORDER BY month
```

# EN
I am building a purchase funnel tracker for marketing: how many people visit, how many view a product, add to cart, then order. How many drop off at each step is what they want to see.

The query in the editor already has the frame; you only need to fill in the three count conditions at the ___ blanks.

## Task
The monthly purchase funnel for {{q_en}}: the number of sessions, sessions that viewed a product, sessions that added something to the cart, and sessions that ended in an order. Each month shown as its first day; earliest month first.

## Hints
1. Each month is one group; the group needs four counts, each with its own condition.
2. `count(*) FILTER (WHERE viewed_product)` counts only the sessions that viewed a product. A session that ordered is one with an order number: `order_id IS NOT NULL`.
3. `count(*) FILTER (WHERE viewed_product)`, `count(*) FILTER (WHERE added_to_cart)`, `count(*) FILTER (WHERE order_id IS NOT NULL)`

=== tickets/ch5/ecom-ch5-03.md ===
---
id: ecom-ch5-03
chapter: 5
title: Khách mua một lần hay mua nhiều lần
title_en: One-time buyers or repeat buyers
from: { name: Kha Văn Lộc, dept: Finance }
difficulty: 3
beat: twist
requires: [case_when, aggregate, group_by, order_by]
grants: [cte]
tables: [orders]
ordered: true
columns:
  - { vi: "Nhóm khách (1 một đơn, 2 hai đến ba đơn, 3 từ bốn đơn)", en: "Customer group (1 one order, 2 two to three, 3 four or more)" }
  - { vi: "Số khách", en: "Customers" }
variants:
  - { to: "2026-11-01", d: "31/10/2026", d_en: "31 October 2026" }
  - { to: "2026-07-01", d: "30/06/2026", d_en: "30 June 2026" }
  - { to: "2026-01-01", d: "31/12/2025", d_en: "31 December 2025" }
reflect:
  q: { vi: "Vì sao bài này cần hai bước (một khối WITH rồi một câu chính)?", en: "Why does this task need two steps (a WITH block, then the main query)?" }
  options:
    - { vi: "Phải gom theo khách trước để có số đơn, rồi mới gom lần nữa theo nhóm khách", en: "You must group by customer first to get the order count, then group again by customer group" }
    - { vi: "Vì một câu không được dùng hai hàm gộp", en: "Because one query may not use two aggregate functions" }
    - { vi: "Để chạy nhanh hơn", en: "To run faster" }
  answer: 0
  why: { vi: "Hai tầng gộp: tầng một ra số đơn mỗi khách, tầng hai đếm khách theo nhóm. Khối WITH đặt tên cho tầng một để tầng hai đọc như một bảng.", en: "Two levels of aggregation: level one gives orders per customer, level two counts customers per group. The WITH block names level one so level two reads it like a table." }
wrong:
  - sql: "WITH per_customer AS (SELECT customer_id, count(*) AS n FROM orders WHERE status <> 'cancelled' AND ordered_at < '{{to}}' GROUP BY customer_id) SELECT CASE WHEN n = 1 THEN 1 WHEN n <= 3 THEN 2 ELSE 3 END AS grp, sum(n) FROM per_customer GROUP BY grp ORDER BY grp"
    vi: "Cột thứ hai đang cộng số đơn của cả nhóm. Đề cần số khách trong mỗi nhóm."
    en: "The second column adds up the orders of the whole group. The request wants the number of customers in each group."
---
Phòng tài chính đang tính giá trị vòng đời khách hàng cho hồ sơ gọi vốn. Câu hỏi đầu tiên của nhà đầu tư luôn là: khách mua một lần rồi đi, hay quay lại mua tiếp?

## Task
Tính đến hết ngày {{d}}: mỗi khách đã có bao nhiêu đơn không bị hủy? Chia những khách đã có ít nhất một đơn thành 3 nhóm: 1 = đúng một đơn, 2 = hai hoặc ba đơn, 3 = từ bốn đơn trở lên. Mỗi nhóm có bao nhiêu khách? Xếp theo số nhóm.

## Hints
1. Hai bước: trước hết đếm số đơn của từng khách; sau đó gắn mỗi khách vào một nhóm theo số đơn và đếm khách trong từng nhóm.
2. Bước một đặt tên bằng khối `WITH per_customer AS (...)` (gom theo `customer_id`); bước hai đọc `per_customer` như một bảng, dùng `CASE` trên số đơn.
3. `WITH per_customer AS (SELECT customer_id, count(*) AS n FROM orders WHERE ... GROUP BY customer_id) SELECT CASE ... END AS grp, count(*) FROM per_customer GROUP BY grp ORDER BY grp`

## Solution
```sql
WITH per_customer AS (
  SELECT customer_id, count(*) AS n
  FROM orders
  WHERE status <> 'cancelled' AND ordered_at < '{{to}}'
  GROUP BY customer_id
)
SELECT CASE WHEN n = 1 THEN 1 WHEN n <= 3 THEN 2 ELSE 3 END AS grp, count(*)
FROM per_customer
GROUP BY grp
ORDER BY grp
```

# EN
Finance is working out customer lifetime value for the funding pitch. The first question every investor asks: do customers buy once and leave, or come back for more?

## Task
Up to the end of {{d_en}}: how many orders that were not cancelled does each customer have? Split the customers with at least one order into 3 groups: 1 = exactly one order, 2 = two or three orders, 3 = four or more. How many customers are in each group? Sort by group number.

## Hints
1. Two steps: first count the orders of each customer; then put each customer into a group by their count and count the customers in each group.
2. Name step one with a `WITH per_customer AS (...)` block (grouped by `customer_id`); step two reads `per_customer` like a table, using `CASE` on the order count.
3. `WITH per_customer AS (SELECT customer_id, count(*) AS n FROM orders WHERE ... GROUP BY customer_id) SELECT CASE ... END AS grp, count(*) FROM per_customer GROUP BY grp ORDER BY grp`

=== tickets/ch5/ecom-ch5-04.md ===
---
id: ecom-ch5-04
chapter: 5
title: Shop nào có nhiều hàng hỏng bị trả về
title_en: Which shops get damaged items sent back
from: { name: Đoàn Quốc Bảo, dept: Category }
difficulty: 3
beat: rest
requires: [multi_join, left_join, having, aggregate, group_by, order_by]
grants: []
tables: [order_items, deliveries, products, sellers, returns]
ordered: true
columns:
  - { vi: "Tên shop", en: "Shop name" }
  - { vi: "Số món đã giao", en: "Items delivered" }
  - { vi: "Số món trả vì hỏng", en: "Items returned damaged" }
  - { vi: "Tỷ lệ trả vì hỏng (%)", en: "Damaged return rate (%)" }
reflect:
  q: { vi: "Vì sao điều kiện lý do hỏng phải nằm trong điều kiện ghép với danh mục trả hàng?", en: "Why must the damaged-reason condition sit in the join with the returns list?" }
  options:
    - { vi: "Đặt ở điều kiện lọc dòng thì mọi món không bị trả sẽ bị loại, và tỷ lệ thành 100%", en: "In the row filter it would drop every item that was not returned, and the rate would become 100%" }
    - { vi: "Để truy vấn chạy nhanh hơn", en: "To make the query faster" }
    - { vi: "Đặt ở đâu cũng như nhau", en: "Either place is the same" }
  answer: 0
  why: { vi: "LEFT JOIN giữ mọi món đã giao; điều kiện trong phần ghép chỉ quyết định món nào gắn được một lần trả vì hỏng.", en: "LEFT JOIN keeps every delivered item; a condition inside the join only decides which items get a damaged return attached." }
wrong:
  - sql: "SELECT s.name, count(*), count(r.id), ROUND(100.0 * count(r.id) / count(*), 2) FROM order_items i JOIN deliveries d ON d.order_id = i.order_id JOIN products p ON p.id = i.product_id JOIN sellers s ON s.id = p.seller_id LEFT JOIN returns r ON r.order_id = i.order_id AND r.product_id = i.product_id WHERE d.delivered_on >= '2026-07-01' AND d.delivered_on < '2026-10-01' GROUP BY s.id, s.name HAVING count(*) >= 100 ORDER BY 4 DESC, s.name"
    vi: "Bạn đang đếm mọi lần trả hàng, kể cả trả vì đổi ý hay giao nhầm. Đề chỉ đếm món trả vì hỏng: thêm điều kiện lý do vào phần ghép."
    en: "You are counting every return, including changes of mind and wrong items. The request only counts items returned as damaged: add the reason condition to the join."
---
Khách than nhận hàng điện tử bị hỏng. Trước khi làm việc với các shop, ngành hàng cần biết shop nào có tỷ lệ hàng hỏng bị trả về cao bất thường.

## Task
Các món hàng giao tới khách trong quý 3/2026 (ngày giao từ 01/07 đến hết 30/09): với mỗi shop, có bao nhiêu món đã giao, bao nhiêu món bị khách trả vì hỏng, và tỷ lệ đó bằng bao nhiêu phần trăm (làm tròn 2 chữ số thập phân)? Chỉ xét shop có từ 100 món đã giao trở lên. Tỷ lệ cao nhất lên đầu; bằng nhau thì xếp theo tên shop.

## Hints
1. Đi từ dòng hàng tới giao hàng (ngày giao), sản phẩm và shop; gắn thêm lần trả hàng vì hỏng nếu có, mà không làm mất món nào không bị trả.
2. `LEFT JOIN returns r ON r.order_id = i.order_id AND r.product_id = i.product_id AND r.reason = 'damaged'`; số món trả là `count(r.id)`; tỷ lệ `ROUND(100.0 * count(r.id) / count(*), 2)`; lọc shop bằng `HAVING count(*) >= 100`.
3. `SELECT s.name, count(*), count(r.id), ROUND(...) FROM order_items i JOIN deliveries d ON ... JOIN products p ON ... JOIN sellers s ON ... LEFT JOIN returns r ON ... WHERE ... GROUP BY s.id, s.name HAVING ... ORDER BY 4 DESC, s.name`

## Solution
```sql
SELECT s.name, count(*), count(r.id), ROUND(100.0 * count(r.id) / count(*), 2)
FROM order_items i
JOIN deliveries d ON d.order_id = i.order_id
JOIN products p ON p.id = i.product_id
JOIN sellers s ON s.id = p.seller_id
LEFT JOIN returns r ON r.order_id = i.order_id AND r.product_id = i.product_id AND r.reason = 'damaged'
WHERE d.delivered_on >= '2026-07-01' AND d.delivered_on < '2026-10-01'
GROUP BY s.id, s.name
HAVING count(*) >= 100
ORDER BY 4 DESC, s.name
```

# EN
Customers complain about receiving broken electronics. Before talking to the shops, the category team needs to know which shops have an unusually high rate of damaged items sent back.

## Task
For the items delivered to customers in Q3 2026 (delivery date from 1 July to 30 September): for each shop, how many items were delivered, how many were returned by customers as damaged, and what percentage is that (rounded to 2 decimals)? Only shops with 100 or more items delivered. Highest rate first; on equal rates, by shop name.

## Hints
1. Walk from the order line to the delivery (its date), the product and the shop; attach a damaged return if there is one, without losing the items that were not returned.
2. `LEFT JOIN returns r ON r.order_id = i.order_id AND r.product_id = i.product_id AND r.reason = 'damaged'`; returned items are `count(r.id)`; the rate is `ROUND(100.0 * count(r.id) / count(*), 2)`; filter shops with `HAVING count(*) >= 100`.
3. `SELECT s.name, count(*), count(r.id), ROUND(...) FROM order_items i JOIN deliveries d ON ... JOIN products p ON ... JOIN sellers s ON ... LEFT JOIN returns r ON ... WHERE ... GROUP BY s.id, s.name HAVING ... ORDER BY 4 DESC, s.name`

=== tickets/ch5/ecom-ch5-05.md ===
---
id: ecom-ch5-05
chapter: 5
title: "Đánh giá thăng tiến: chia ngân sách marketing"
title_en: "Promotion review: splitting the marketing budget"
from: { name: Võ Thanh Hà, dept: Management }
difficulty: 4
beat: boss
requires: [cte, case_when, conditional_agg, join, aggregate, group_by, order_by]
grants: []
tables: [ad_spend, customers, web_sessions, payments, orders]
ordered: true
columns:
  - [{ vi: "Kênh khách đến", en: "Acquisition channel" }, { vi: "Số khách mới", en: "New customers" }, { vi: "Chi phí kênh (đồng)", en: "Channel spend (VND)" }, { vi: "Chi phí cho mỗi khách mới (đồng)", en: "Cost per new customer (VND)" }]
  - [{ vi: "Thiết bị", en: "Device" }, { vi: "Số phiên", en: "Sessions" }, { vi: "Phiên có thêm vào giỏ", en: "Sessions that added to cart" }, { vi: "Phiên ra đơn", en: "Sessions that ordered" }, { vi: "Tỷ lệ ra đơn (%)", en: "Conversion rate (%)" }]
  - [{ vi: "Nền tảng đặt đơn", en: "Ordering platform" }, { vi: "Khoản nhỏ", en: "Small payments" }, { vi: "Khoản vừa", en: "Medium payments" }, { vi: "Khoản lớn", en: "Large payments" }]
conclusion:
  question: "Theo bước 1, kênh nào tốn ít tiền nhất cho mỗi khách mới?"
  options:
    - "Bạn bè giới thiệu: chỉ tốn tiền thưởng giới thiệu cho mỗi khách"
    - "Quảng cáo trả tiền"
    - "Mạng xã hội"
  answer: 0
conclusion_en:
  question: "According to step 1, which channel costs the least per new customer?"
  options:
    - "Friend referrals: they only cost the referral bonus per customer"
    - "Paid ads"
    - "Social media"
---
Đây là buổi đánh giá thăng tiến của bạn. Tuần sau ban giám đốc chia ngân sách marketing năm 2027. Mình cần ba bảng số để biết tiền nên đổ vào đâu. Làm đúng cả ba là bạn bước thêm một bước trong sự nghiệp.

## Step 1: Mỗi khách mới tốn bao nhiêu tiền
Quý 3/2026 (từ 01/07 đến hết 30/09): với mỗi kênh có chi phí marketing, gửi tên kênh, số khách mới đăng ký qua kênh đó, tổng chi phí của kênh trong quý, và chi phí cho mỗi khách mới (chi phí chia số khách, làm tròn tới đồng). Kênh không tốn tiền thì bỏ. Xếp theo tên kênh.
```sql
WITH spend AS (
  SELECT channel, sum(amount) AS amount
  FROM ad_spend
  WHERE month >= '2026-07-01' AND month < '2026-10-01'
  GROUP BY channel
), signups AS (
  SELECT channel, count(*) AS n
  FROM customers
  WHERE signup_date >= '2026-07-01' AND signup_date < '2026-10-01'
  GROUP BY channel
)
SELECT s.channel, g.n, s.amount, ROUND(s.amount / g.n, 0)
FROM spend s
JOIN signups g ON g.channel = s.channel
ORDER BY s.channel
```

## Step 2: Phễu theo thiết bị tháng 10
Tháng 10/2026, theo từng loại thiết bị: số phiên truy cập, số phiên có thêm vào giỏ, số phiên ra đơn, và tỷ lệ ra đơn (phiên ra đơn chia tổng số phiên, tính phần trăm, làm tròn 2 chữ số thập phân). Xếp theo tên thiết bị.
```sql
SELECT device, count(*), count(*) FILTER (WHERE added_to_cart), count(*) FILTER (WHERE order_id IS NOT NULL),
       ROUND(100.0 * count(*) FILTER (WHERE order_id IS NOT NULL) / count(*), 2)
FROM web_sessions
WHERE started_at >= '2026-10-01' AND started_at < '2026-11-01'
GROUP BY device
ORDER BY device
```

## Step 3: Cỡ khoản thanh toán theo nền tảng
Các khoản thanh toán đã thu thành công trong tháng 10/2026, theo nền tảng khách đặt đơn: bao nhiêu khoản nhỏ (dưới 200 nghìn đồng), bao nhiêu khoản vừa (từ 200 nghìn đến dưới 500 nghìn), bao nhiêu khoản lớn (từ 500 nghìn trở lên). Xếp theo tên nền tảng.
```sql
WITH paid AS (
  SELECT o.platform,
         CASE WHEN p.amount < 200000 THEN 1 WHEN p.amount < 500000 THEN 2 ELSE 3 END AS band
  FROM payments p
  JOIN orders o ON o.id = p.order_id
  WHERE p.status = 'paid' AND p.paid_at >= '2026-10-01' AND p.paid_at < '2026-11-01'
)
SELECT platform, count(*) FILTER (WHERE band = 1), count(*) FILTER (WHERE band = 2), count(*) FILTER (WHERE band = 3)
FROM paid
GROUP BY platform
ORDER BY platform
```

## Hints
1. Bước 1 gộp hai bảng riêng (chi phí theo kênh, khách mới theo kênh) rồi ghép chúng theo kênh. Bước 2 là phễu như bài phễu tháng, nhưng nhóm theo thiết bị. Bước 3 gắn nhóm giá trị cho từng khoản rồi đếm có điều kiện.
2. Bước 1: hai khối `WITH` (`spend`, `signups`), ghép `g.channel = s.channel`, chia `ROUND(s.amount / g.n, 0)`. Bước 2: `ROUND(100.0 * count(*) FILTER (WHERE order_id IS NOT NULL) / count(*), 2)`. Bước 3: nền tảng là `o.platform`, `count(*) FILTER (WHERE band = 1)`.
3. `WITH spend AS (...), signups AS (...) SELECT s.channel, g.n, s.amount, ROUND(s.amount / g.n, 0) FROM spend s JOIN signups g ON ... ORDER BY s.channel`

# EN
This is your promotion review. Next week the board splits the 2027 marketing budget. I need three tables to know where the money should go. Get all three right and you take another step in your career.

## Step 1: What each new customer costs
For Q3 2026 (1 July to 30 September): for each channel with marketing spend, send the channel name, the number of new customers who signed up through it, the channel's total spend in the quarter, and the cost per new customer (spend divided by customers, rounded to the whole VND). Channels that cost nothing are left out. Sort by channel name.

## Step 2: The funnel by device in October
For October 2026, per device type: the number of sessions, sessions that added something to the cart, sessions that ended in an order, and the conversion rate (sessions that ordered divided by all sessions, as a percentage, rounded to 2 decimals). Sort by device name.

## Step 3: Payment sizes by platform
For the payments collected successfully in October 2026, by the platform the customer ordered on: how many small payments (under 200 thousand VND), how many medium ones (from 200 thousand to under 500 thousand), how many large ones (500 thousand or more). Sort by platform name.

## Hints
1. Step 1 aggregates two separate tables (spend per channel, new customers per channel), then joins them on the channel. Step 2 is the funnel of the monthly funnel task, grouped by device instead. Step 3 gives each payment a value band, then counts with conditions.
2. Step 1: two `WITH` blocks (`spend`, `signups`), joined on `g.channel = s.channel`, divided with `ROUND(s.amount / g.n, 0)`. Step 2: `ROUND(100.0 * count(*) FILTER (WHERE order_id IS NOT NULL) / count(*), 2)`. Step 3: the platform is `o.platform`, `count(*) FILTER (WHERE band = 1)`.
3. `WITH spend AS (...), signups AS (...) SELECT s.channel, g.n, s.amount, ROUND(s.amount / g.n, 0) FROM spend s JOIN signups g ON ... ORDER BY s.channel`

=== tickets/ch6/ecom-ch6-01.md ===
---
id: ecom-ch6-01
chapter: 6
title: Ba món bán chạy nhất mỗi nhóm hàng
title_en: The top three items of each category
from: { name: Đoàn Quốc Bảo, dept: Category }
difficulty: 3
beat: teach
format: worked
requires: [cte, multi_join, aggregate, group_by, order_by]
grants: [window_rank]
tables: [order_items, orders, products, categories]
ordered: true
columns:
  - { vi: "Nhóm hàng", en: "Category" }
  - { vi: "Mã SKU", en: "SKU code" }
  - { vi: "Doanh thu hàng (đồng)", en: "Goods revenue (VND)" }
  - { vi: "Hạng trong nhóm", en: "Rank in category" }
variants:
  - { month: "10/2026", month_en: "October 2026", from: "2026-10-01", to: "2026-11-01" }
  - { month: "8/2026", month_en: "August 2026", from: "2026-08-01", to: "2026-09-01" }
  - { month: "5/2026", month_en: "May 2026", from: "2026-05-01", to: "2026-06-01" }
reflect:
  q: { vi: "Vì sao không lọc hạng ngay trong câu tính hạng mà phải lọc ở câu ngoài?", en: "Why filter the rank in the outer query instead of in the query that computes it?" }
  options:
    - { vi: "Hàm cửa sổ chạy sau bước lọc dòng, nên câu tính hạng chưa thể lọc theo hạng", en: "Window functions run after the row filter, so the query that computes the rank cannot filter on it yet" }
    - { vi: "Lọc ở câu ngoài chạy nhanh hơn", en: "Filtering outside is faster" }
    - { vi: "Hạng chỉ đọc được trong khối WITH", en: "The rank can only be read inside a WITH block" }
  answer: 0
  why: { vi: "Thứ tự chạy: lọc dòng, gom nhóm, rồi mới tới hàm cửa sổ. Muốn lọc theo hạng thì bọc thêm một tầng.", en: "Order of work: filter rows, group, and only then window functions. To filter on the rank, wrap one more level." }
wrong:
  - sql: "WITH sales AS (SELECT c.name AS category, p.sku, sum(i.quantity * i.unit_price) AS revenue FROM order_items i JOIN orders o ON o.id = i.order_id JOIN products p ON p.id = i.product_id JOIN categories c ON c.id = p.category_id WHERE o.status = 'delivered' AND o.ordered_at >= '{{from}}' AND o.ordered_at < '{{to}}' GROUP BY c.name, p.sku), ranked AS (SELECT category, sku, revenue, RANK() OVER (ORDER BY revenue DESC) AS rnk FROM sales) SELECT category, sku, revenue, rnk FROM ranked WHERE rnk <= 3 ORDER BY category, rnk, sku"
    vi: "Bạn đang xếp hạng trên toàn sàn, nên chỉ còn ba món. Đề cần xếp hạng riêng trong từng nhóm hàng: thêm PARTITION BY nhóm hàng."
    en: "You are ranking across the whole marketplace, so only three items remain. The request ranks within each category: add PARTITION BY category."
---
Ngành hàng làm trang "Bán chạy nhất" cho từng nhóm hàng. Mỗi nhóm cần ba món dẫn đầu theo doanh thu, nên lần này bạn xếp hạng riêng trong từng nhóm.

Đây là lần đầu bạn dùng hàm cửa sổ, nên mình gửi kèm một ví dụ mẫu.

## Task
Các đơn đặt trong tháng {{month}} và đã giao xong: trong mỗi nhóm hàng, ba sản phẩm có doanh thu hàng (số lượng nhân đơn giá) cao nhất. Gửi tên nhóm hàng, mã SKU, doanh thu và hạng trong nhóm. Doanh thu bằng nhau thì cùng hạng, và hạng sau bị bỏ qua (như xếp hạng thi đấu); lấy mọi sản phẩm có hạng từ 1 đến 3. Xếp theo tên nhóm hàng, rồi hạng, rồi mã SKU.

## Example
```sql
SELECT city, name, joined_on,
       RANK() OVER (PARTITION BY city      -- ①
                    ORDER BY joined_on)    -- ②
         AS seniority
FROM sellers
ORDER BY city, seniority, name             -- ③
```
Ví dụ: trong mỗi thành phố, shop nào vào sàn sớm thứ mấy?

① PARTITION BY chia các dòng thành từng nhóm; hạng đếm lại từ 1 trong mỗi nhóm.

② ORDER BY bên trong quyết định ai đứng hạng 1: ở đây là shop vào sàn sớm nhất.

③ Hàm cửa sổ không bỏ dòng nào: mỗi shop vẫn là một dòng, chỉ có thêm cột hạng.

## Hints
1. Hai bước: tính doanh thu từng sản phẩm (kèm nhóm hàng), rồi xếp hạng sản phẩm trong từng nhóm. Lọc hạng ở câu ngoài cùng.
2. `RANK() OVER (PARTITION BY category ORDER BY revenue DESC) AS rnk` trong một khối `WITH`, rồi câu ngoài lọc `rnk <= 3` và xếp `ORDER BY category, rnk, sku`.
3. `WITH sales AS (...), ranked AS (SELECT category, sku, revenue, RANK() OVER (...) AS rnk FROM sales) SELECT category, sku, revenue, rnk FROM ranked WHERE rnk <= 3 ORDER BY category, rnk, sku`

## Solution
```sql
WITH sales AS (
  SELECT c.name AS category, p.sku, sum(i.quantity * i.unit_price) AS revenue
  FROM order_items i
  JOIN orders o ON o.id = i.order_id
  JOIN products p ON p.id = i.product_id
  JOIN categories c ON c.id = p.category_id
  WHERE o.status = 'delivered' AND o.ordered_at >= '{{from}}' AND o.ordered_at < '{{to}}'
  GROUP BY c.name, p.sku
), ranked AS (
  SELECT category, sku, revenue, RANK() OVER (PARTITION BY category ORDER BY revenue DESC) AS rnk
  FROM sales
)
SELECT category, sku, revenue, rnk
FROM ranked
WHERE rnk <= 3
ORDER BY category, rnk, sku
```

# EN
The category team is building a "Best sellers" page for each category. Each category needs its three leading items by revenue, so this time you rank separately inside each category.

This is your first window function, so I am sending a worked example along.

## Task
For orders placed in {{month_en}} and fully delivered: in each category, the three products with the highest goods revenue (quantity times unit price). Send the category name, SKU code, revenue and rank in the category. Equal revenue shares a rank and the next rank is skipped (like a sports ranking); take every product ranked 1 to 3. Sort by category name, then rank, then SKU code.

## Example
Example: in each city, in what order did the shops join the marketplace?

① PARTITION BY splits the rows into groups; the rank starts again from 1 in each group.

② The ORDER BY inside decides who is ranked 1: here the shop that joined earliest.

③ A window function drops no rows: each shop is still one row, with a rank column added.

## Hints
1. Two steps: compute the revenue of each product (with its category), then rank the products inside each category. Filter on the rank in the outermost query.
2. `RANK() OVER (PARTITION BY category ORDER BY revenue DESC) AS rnk` in a `WITH` block, then the outer query filters `rnk <= 3` and sorts `ORDER BY category, rnk, sku`.
3. `WITH sales AS (...), ranked AS (SELECT category, sku, revenue, RANK() OVER (...) AS rnk FROM sales) SELECT category, sku, revenue, rnk FROM ranked WHERE rnk <= 3 ORDER BY category, rnk, sku`

=== tickets/ch6/ecom-ch6-02.md ===
---
id: ecom-ch6-02
chapter: 6
title: Doanh thu tháng này so với tháng trước
title_en: This month's revenue against last month's
from: { name: Kha Văn Lộc, dept: Finance }
difficulty: 3
beat: develop
format: faded
requires: [cte, date_bucket, aggregate, group_by, order_by]
grants: [window_lag]
tables: [payments]
ordered: true
columns:
  - { vi: "Tháng (ngày đầu tháng)", en: "Month (first day)" }
  - { vi: "Tiền thu (đồng)", en: "Collected (VND)" }
  - { vi: "Chênh so với tháng trước (đồng)", en: "Change from the month before (VND)" }
starter: |
  WITH m AS (
    SELECT date_trunc('month', paid_at) AS month, sum(amount) AS revenue
    FROM payments
    WHERE status = 'paid' AND paid_at >= '{{from}}' AND paid_at < '{{to}}'
    GROUP BY 1
  )
  SELECT month, revenue, revenue - ___(revenue) OVER (ORDER BY ___)
  FROM m
  ORDER BY month
variants:
  - { from: "2025-11-01", to: "2026-11-01", first: "11/2025", last: "10/2026", first_en: "November 2025", last_en: "October 2026" }
  - { from: "2025-01-01", to: "2026-01-01", first: "01/2025", last: "12/2025", first_en: "January 2025", last_en: "December 2025" }
  - { from: "2025-07-01", to: "2026-07-01", first: "07/2025", last: "06/2026", first_en: "July 2025", last_en: "June 2026" }
reflect:
  q: { vi: "Vì sao tháng đầu tiên của bảng có cột chênh lệch để trống?", en: "Why is the change column empty for the first month of the table?" }
  options:
    - { vi: "Trong dữ liệu đưa vào hàm cửa sổ không có tháng nào đứng trước nó", en: "In the data fed to the window function, no month comes before it" }
    - { vi: "Vì tháng đó không thu được tiền", en: "Because nothing was collected that month" }
    - { vi: "Vì truy vấn bị lỗi ở dòng đầu", en: "Because the query fails on the first row" }
  answer: 0
  why: { vi: "LAG nhìn dòng đứng trước trong cửa sổ. Dòng đầu không có ai đứng trước, nên kết quả là ô trống, và trừ với ô trống cũng ra ô trống.", en: "LAG looks at the previous row of the window. The first row has none, so the result is empty, and subtracting an empty cell gives an empty cell." }
wrong:
  - sql: "WITH m AS (SELECT date_trunc('month', paid_at) AS month, sum(amount) AS revenue FROM payments WHERE status = 'paid' AND paid_at >= '{{from}}' AND paid_at < '{{to}}' GROUP BY 1) SELECT month, revenue, revenue - LEAD(revenue) OVER (ORDER BY month) FROM m ORDER BY month"
    vi: "Bạn đang so với tháng sau (LEAD nhìn dòng kế tiếp). Đề cần so với tháng trước."
    en: "You are comparing with the next month (LEAD looks at the following row). The request compares with the month before."
---
Báo cáo tháng gửi nhà đầu tư luôn có một dòng: tiền thu tháng này tăng hay giảm bao nhiêu so với tháng trước. Mình cần cột đó cho mười hai tháng.

Câu truy vấn trong editor đã gần xong. Chỗ trống đầu là tên hàm nhìn dòng đứng trước; chỗ thứ hai là cột quyết định thứ tự các tháng.

## Task
Mỗi tháng từ {{first}} đến {{last}}: tiền đã thu thành công trong tháng (theo thời điểm thu), và chênh lệch so với tháng ngay trước (tháng này trừ tháng trước; tháng đầu bảng để trống). Tháng ghi bằng ngày đầu tháng; tháng sớm nhất lên đầu.

## Hints
1. Gộp tiền theo tháng trước, rồi với mỗi tháng nhìn sang tháng đứng ngay trước nó theo thứ tự thời gian.
2. `LAG(revenue) OVER (ORDER BY month)` lấy tiền của tháng đứng trước.
3. `SELECT month, revenue, revenue - LAG(revenue) OVER (ORDER BY month) FROM m ORDER BY month`

## Solution
```sql
WITH m AS (
  SELECT date_trunc('month', paid_at) AS month, sum(amount) AS revenue
  FROM payments
  WHERE status = 'paid' AND paid_at >= '{{from}}' AND paid_at < '{{to}}'
  GROUP BY 1
)
SELECT month, revenue, revenue - LAG(revenue) OVER (ORDER BY month)
FROM m
ORDER BY month
```

# EN
The monthly investor report always has one line: how much more or less money came in this month than last month. I need that column for twelve months.

The query in the editor is almost done. The first blank is the name of the function that looks at the previous row; the second is the column that puts the months in order.

## Task
For each month from {{first_en}} to {{last_en}}: the money collected successfully in the month (by collection time), and the change from the month right before (this month minus the previous one; empty for the first month of the table). Each month shown as its first day; earliest month first.

## Hints
1. Total the money per month first, then for each month look at the month right before it in time order.
2. `LAG(revenue) OVER (ORDER BY month)` takes the previous month's money.
3. `SELECT month, revenue, revenue - LAG(revenue) OVER (ORDER BY month) FROM m ORDER BY month`

=== tickets/ch6/ecom-ch6-03.md ===
---
id: ecom-ch6-03
chapter: 6
title: Khách cộng dồn từ ngày mở sàn
title_en: Customers to date since launch
from: { name: Trịnh Mai Anh, dept: Marketing }
difficulty: 3
beat: twist
requires: [cte, date_bucket, aggregate, group_by, order_by]
grants: [window_agg]
tables: [customers]
ordered: true
columns:
  - { vi: "Tháng (ngày đầu tháng)", en: "Month (first day)" }
  - { vi: "Khách mới trong tháng", en: "New customers in the month" }
  - { vi: "Tổng khách tới hết tháng", en: "Customers to date" }
variants:
  - { from: "2026-01-01", first: "01/2026", first_en: "January 2026" }
  - { from: "2026-04-01", first: "04/2026", first_en: "April 2026" }
  - { from: "2026-07-01", first: "07/2026", first_en: "July 2026" }
reflect:
  q: { vi: "Vì sao điều kiện từ tháng đầu bảng phải đặt sau khi cộng dồn?", en: "Why must the from-this-month condition come after the running total?" }
  options:
    - { vi: "Lọc trước thì các tháng cũ biến mất khỏi phép cộng, và tổng bắt đầu lại từ 0", en: "Filtering first removes the older months from the sum, and the total starts again from 0" }
    - { vi: "Lọc sau chạy nhanh hơn", en: "Filtering afterwards is faster" }
    - { vi: "Đặt đâu cũng được", en: "Either place works" }
  answer: 0
  why: { vi: "Hàm cửa sổ chỉ thấy những dòng còn lại sau bước lọc. Muốn cộng từ ngày mở sàn mà chỉ hiện vài tháng cuối, hãy cộng trước rồi lọc ở tầng ngoài.", en: "A window function only sees the rows left after filtering. To add up from launch but show only the last months, sum first and filter in an outer level." }
wrong:
  - sql: "WITH m AS (SELECT date_trunc('month', signup_date) AS month, count(*) AS n FROM customers WHERE signup_date >= '{{from}}' GROUP BY 1) SELECT month, n, SUM(n) OVER (ORDER BY month) FROM m ORDER BY month"
    vi: "Tổng đang bắt đầu lại từ tháng đầu bảng vì các tháng cũ đã bị lọc trước khi cộng. Cộng dồn trước, rồi mới lọc tháng."
    en: "The total restarts at the first month shown because the older months were filtered out before adding. Add up first, then filter the months."
---
Trang giới thiệu cho nhà đầu tư cần một biểu đồ: mỗi tháng có thêm bao nhiêu khách, và tổng số khách của sàn đã lên tới đâu. Biểu đồ chỉ vẽ mấy tháng gần đây, nhưng tổng phải tính từ ngày mở sàn.

## Task
Mỗi tháng từ {{first}} đến nay: số khách mới đăng ký trong tháng, và tổng số khách của sàn tính từ ngày mở sàn đến hết tháng đó. Tháng ghi bằng ngày đầu tháng; tháng sớm nhất lên đầu.

## Hints
1. Đếm khách mới theo tháng cho mọi tháng, cộng dồn theo thứ tự thời gian, rồi mới chỉ giữ các tháng cần hiện.
2. `SUM(n) OVER (ORDER BY month)` cộng dồn từ tháng đầu tiên tới tháng hiện tại. Điều kiện tháng đặt ở câu ngoài cùng.
3. `WITH m AS (...), c AS (SELECT month, n, SUM(n) OVER (ORDER BY month) AS total FROM m) SELECT month, n, total FROM c WHERE ... ORDER BY month`

## Solution
```sql
WITH m AS (
  SELECT date_trunc('month', signup_date) AS month, count(*) AS n
  FROM customers
  GROUP BY 1
), c AS (
  SELECT month, n, SUM(n) OVER (ORDER BY month) AS total
  FROM m
)
SELECT month, n, total
FROM c
WHERE month >= '{{from}}'
ORDER BY month
```

# EN
The investor page needs a chart: how many customers joined each month, and how far the marketplace's total customer count has climbed. The chart only draws the recent months, but the total must count from launch.

## Task
For each month from {{first_en}} until now: the number of new customers who signed up in the month, and the marketplace's total customers from launch to the end of that month. Each month shown as its first day; earliest month first.

## Hints
1. Count new customers per month for every month, add them up in time order, and only then keep the months to show.
2. `SUM(n) OVER (ORDER BY month)` adds up from the first month to the current one. The month condition goes in the outermost query.
3. `WITH m AS (...), c AS (SELECT month, n, SUM(n) OVER (ORDER BY month) AS total FROM m) SELECT month, n, total FROM c WHERE ... ORDER BY month`

=== tickets/ch6/ecom-ch6-04.md ===
---
id: ecom-ch6-04
chapter: 6
title: Hàng trả về theo lý do
title_en: Returns by reason
from: { name: Hồ Ngọc Diệp, dept: CS }
difficulty: 2
beat: rest
requires: [conditional_agg, aggregate, group_by, order_by, where]
grants: []
tables: [returns]
ordered: true
columns:
  - { vi: "Lý do trả hàng", en: "Return reason" }
  - { vi: "Số món trả", en: "Items returned" }
  - { vi: "Số món được duyệt hoàn tiền", en: "Items approved for refund" }
  - { vi: "Tổng tiền đã hoàn (đồng)", en: "Total refunded (VND)" }
reflect:
  q: { vi: "Vì sao tổng tiền hoàn không cần điều kiện được duyệt?", en: "Why does the refund total need no approved condition?" }
  options:
    - { vi: "Món bị từ chối có tiền hoàn bằng 0, nên cộng tất cả vẫn ra đúng số đã hoàn", en: "Rejected items have a refund of 0, so adding them all still gives the amount refunded" }
    - { vi: "Vì món bị từ chối không có trong danh mục", en: "Because rejected items are not in the list" }
    - { vi: "Thật ra có cần, kết quả đang sai", en: "It actually does; the result is wrong" }
  answer: 0
  why: { vi: "Đọc kỹ dữ liệu trước khi thêm điều kiện: ở đây món bị từ chối ghi tiền hoàn bằng 0.", en: "Read the data before adding conditions: here a rejected item records a refund of 0." }
wrong:
  - sql: "SELECT reason, count(*), count(status), sum(refund) FROM returns WHERE requested_on >= '2026-07-01' AND requested_on < '2026-10-01' GROUP BY reason ORDER BY 2 DESC, reason"
    vi: "Cột thứ ba đang đếm mọi món có trạng thái, kể cả món bị từ chối. Đề chỉ đếm món được duyệt hoàn tiền."
    en: "The third column counts every item with a status, rejected ones included. The request only counts items approved for refund."
---
Mỗi quý nhóm chăm sóc khách hàng báo cáo hàng trả về: vì sao khách trả, bao nhiêu món được duyệt, và sàn đã hoàn bao nhiêu tiền.

## Task
Các yêu cầu trả hàng gửi trong quý 3/2026 (từ 01/07 đến hết 30/09), theo từng lý do: số món trả, số món được duyệt hoàn tiền, và tổng tiền đã hoàn. Nhiều món nhất lên đầu; bằng nhau thì xếp theo lý do.

## Hints
1. Gom theo lý do; trong mỗi nhóm cần một số đếm mọi món, một số đếm có điều kiện, và một tổng.
2. Ngày yêu cầu là `requested_on`; món được duyệt là `status = 'approved'`, đếm bằng `count(*) FILTER (WHERE status = 'approved')`; tiền hoàn là `refund`.
3. `SELECT reason, count(*), count(*) FILTER (WHERE status = 'approved'), sum(refund) FROM returns WHERE ... GROUP BY reason ORDER BY 2 DESC, reason`

## Solution
```sql
SELECT reason, count(*), count(*) FILTER (WHERE status = 'approved'), sum(refund)
FROM returns
WHERE requested_on >= '2026-07-01' AND requested_on < '2026-10-01'
GROUP BY reason
ORDER BY 2 DESC, reason
```

# EN
Every quarter the customer care team reports on returns: why customers send items back, how many are approved, and how much the marketplace refunded.

## Task
For the return requests sent in Q3 2026 (1 July to 30 September), per reason: the number of items returned, the number approved for refund, and the total refunded. Most items first; on equal numbers, by reason.

## Hints
1. Group by reason; each group needs a count of every item, a conditional count, and a total.
2. The request date is `requested_on`; an approved item is `status = 'approved'`, counted with `count(*) FILTER (WHERE status = 'approved')`; the refund is `refund`.
3. `SELECT reason, count(*), count(*) FILTER (WHERE status = 'approved'), sum(refund) FROM returns WHERE ... GROUP BY reason ORDER BY 2 DESC, reason`

=== tickets/ch6/ecom-ch6-05.md ===
---
id: ecom-ch6-05
chapter: 6
title: "Đánh giá thăng tiến: hồ sơ gọi vốn"
title_en: "Promotion review: the funding pitch"
from: { name: Võ Thanh Hà, dept: Management }
difficulty: 4
beat: boss
requires: [window_rank, window_lag, window_agg, cte, date_math, join, aggregate, group_by, order_by]
grants: []
tables: [orders, customers, payments]
ordered: true
columns:
  - [{ vi: "Kênh khách đến", en: "Acquisition channel" }, { vi: "Số ngày trung bình giữa hai đơn", en: "Average days between two orders" }]
  - [{ vi: "Kênh khách đến", en: "Acquisition channel" }, { vi: "Thành phố", en: "City" }, { vi: "Số khách mới", en: "New customers" }, { vi: "Hạng trong kênh", en: "Rank in channel" }]
  - [{ vi: "Ngày", en: "Day" }, { vi: "Tiền thu trong ngày (đồng)", en: "Collected that day (VND)" }, { vi: "Cộng dồn trong tháng (đồng)", en: "Month to date (VND)" }, { vi: "Phần trăm của cả tháng", en: "Share of the month (%)" }]
conclusion:
  question: "Theo bước 1, khách đến từ kênh nào quay lại mua nhanh nhất, và kênh nào chậm nhất?"
  options:
    - "Nhanh nhất là khách được bạn bè giới thiệu, chậm nhất là khách đến từ quảng cáo trả tiền"
    - "Nhanh nhất là khách đến từ quảng cáo trả tiền"
    - "Mọi kênh như nhau"
  answer: 0
conclusion_en:
  question: "According to step 1, customers from which channel come back to buy fastest, and which slowest?"
  options:
    - "Fastest are customers referred by friends, slowest are customers from paid ads"
    - "Fastest are customers from paid ads"
    - "Every channel is the same"
---
Đây là buổi đánh giá thăng tiến của bạn, và cũng là lần cuối mình nhờ bạn trước vòng gọi vốn. Nhà đầu tư hỏi ba điều: khách có quay lại không, khách mới đến từ đâu, và đợt sale 10.10 đóng góp bao nhiêu. Làm đúng cả ba là bạn thành Senior DA.

## Step 1: Khách quay lại sau bao lâu
Với mỗi đơn không bị hủy, tính số ngày kể từ đơn không hủy liền trước của cùng khách (theo ngày đặt). Xét các đơn đặt từ 01/01/2026, nhưng đơn liền trước có thể nằm trong năm 2025; đơn đầu tiên của mỗi khách không có khoảng cách nên không tính. Theo kênh khách đến, gửi số ngày trung bình giữa hai đơn, làm tròn 2 chữ số thập phân; xếp theo tên kênh.
```sql
WITH o AS (
  SELECT c.channel, o.ordered_at,
         o.ordered_at::date - LAG(o.ordered_at::date) OVER (PARTITION BY o.customer_id ORDER BY o.ordered_at) AS gap
  FROM orders o
  JOIN customers c ON c.id = o.customer_id
  WHERE o.status <> 'cancelled'
)
SELECT channel, ROUND(AVG(gap), 2)
FROM o
WHERE ordered_at >= '2026-01-01'
GROUP BY channel
ORDER BY channel
```

## Step 2: Ba thành phố có nhiều khách mới nhất của mỗi kênh
Khách đăng ký từ 01/01/2026: trong mỗi kênh khách đến, ba thành phố có nhiều khách mới nhất. Gửi kênh, thành phố, số khách và hạng trong kênh; số khách bằng nhau thì cùng hạng và hạng sau bị bỏ qua; lấy mọi thành phố có hạng từ 1 đến 3. Xếp theo tên kênh, rồi hạng, rồi tên thành phố.
```sql
WITH s AS (
  SELECT channel, city, count(*) AS n
  FROM customers
  WHERE signup_date >= '2026-01-01'
  GROUP BY channel, city
), r AS (
  SELECT channel, city, n, RANK() OVER (PARTITION BY channel ORDER BY n DESC) AS rnk
  FROM s
)
SELECT channel, city, n, rnk
FROM r
WHERE rnk <= 3
ORDER BY channel, rnk, city
```

## Step 3: Tháng 10 và ngày 10.10
Mỗi ngày của tháng 10/2026: tiền đã thu thành công trong ngày (theo thời điểm thu), tiền cộng dồn từ đầu tháng tới hết ngày đó, và phần trăm của tiền cộng dồn so với cả tháng (làm tròn 2 chữ số thập phân). Ngày sớm nhất lên đầu.
```sql
WITH d AS (
  SELECT paid_at::date AS day, sum(amount) AS revenue
  FROM payments
  WHERE status = 'paid' AND paid_at >= '2026-10-01' AND paid_at < '2026-11-01'
  GROUP BY 1
)
SELECT day, revenue, SUM(revenue) OVER (ORDER BY day),
       ROUND(100.0 * SUM(revenue) OVER (ORDER BY day) / SUM(revenue) OVER (), 2)
FROM d
ORDER BY day
```

## Hints
1. Bước 1 nhìn đơn liền trước của cùng khách, rồi mới lọc năm 2026. Bước 2 xếp hạng thành phố trong từng kênh. Bước 3 cộng dồn theo ngày và chia cho tổng cả tháng, mà không mất dòng nào.
2. Bước 1: `LAG(o.ordered_at::date) OVER (PARTITION BY o.customer_id ORDER BY o.ordered_at)`. Bước 2: `RANK() OVER (PARTITION BY channel ORDER BY n DESC)`. Bước 3: `SUM(revenue) OVER (ORDER BY day)` và `SUM(revenue) OVER ()` (cửa sổ rỗng là cả bảng).
3. `SELECT day, revenue, SUM(revenue) OVER (ORDER BY day), ROUND(100.0 * SUM(revenue) OVER (ORDER BY day) / SUM(revenue) OVER (), 2) FROM d ORDER BY day`

# EN
This is your promotion review, and the last thing I ask of you before the funding round. The investors ask three things: do customers come back, where do new customers come from, and how much did the 10.10 sale contribute. Get all three right and you become a Senior DA.

## Step 1: How soon customers come back
For each order that was not cancelled, count the days since the same customer's previous non-cancelled order (by order date). Look at orders placed from 1 January 2026, but the previous order may fall in 2025; a customer's first order has no gap and does not count. Per acquisition channel, send the average days between two orders, rounded to 2 decimals; sort by channel name.

## Step 2: The three cities with the most new customers in each channel
Customers who signed up from 1 January 2026: in each acquisition channel, the three cities with the most new customers. Send the channel, city, number of customers and rank in the channel; equal numbers share a rank and the next rank is skipped; take every city ranked 1 to 3. Sort by channel name, then rank, then city name.

## Step 3: October and the 10.10 day
For each day of October 2026: the money collected successfully that day (by collection time), the running total from the start of the month to the end of that day, and the running total as a percentage of the whole month (rounded to 2 decimals). Earliest day first.

## Hints
1. Step 1 looks at the same customer's previous order, and only then filters 2026. Step 2 ranks cities inside each channel. Step 3 adds up day by day and divides by the whole month's total, without losing any row.
2. Step 1: `LAG(o.ordered_at::date) OVER (PARTITION BY o.customer_id ORDER BY o.ordered_at)`. Step 2: `RANK() OVER (PARTITION BY channel ORDER BY n DESC)`. Step 3: `SUM(revenue) OVER (ORDER BY day)` and `SUM(revenue) OVER ()` (an empty window is the whole table).
3. `SELECT day, revenue, SUM(revenue) OVER (ORDER BY day), ROUND(100.0 * SUM(revenue) OVER (ORDER BY day) / SUM(revenue) OVER (), 2) FROM d ORDER BY day`
````

## Phụ lục D · `src/art/ecommerce.ts`

```ts
import { t } from '../i18n';
import { chapterColor } from '../theme';
import { s } from '../ui/svg';

/**
 * E-commerce art (Plan 9): the Lantern Market warehouse and shop (Overview hero) and the delivery map (Map page and the
 * task bar's map dialog). Lazy chunk, like art/logistics (Plan 8b). Plain shapes, no text below lg (L23/L35: the page
 * repeats the lines as HTML through deliveryItems()), decorative parts aria-hidden, colours as hex or whole literal
 * Tailwind classes (tests/theme.test.ts).
 */

const FONT = 'Nunito, system-ui, sans-serif';

/** What the art shows: chapters whose promotion review is passed (derive().passed) and tasks completed in this domain. */
export interface EcomArtState { passed: ReadonlySet<number>; done: number }

/**
 * Delivery cities around the Da Nang warehouse. `name` = customers.city / deliveries.city in the ecom seed
 * (tests/ecomArt.test.ts). `opens`: the chapter whose promotion review opens it (0 = open from the start).
 * x/y: viewBox 980×300, north on the left, south on the right (a stylised coast, not a geographic map).
 */
export const CITIES = [
  { name: 'Da Nang', opens: 0, x: 500, y: 196, lx: 470, ly: 232 },
  { name: 'Hue', opens: 0, x: 420, y: 120, lx: 388, ly: 100 },
  { name: 'Ha Noi', opens: 1, x: 110, y: 80, lx: 70, ly: 60 },
  { name: 'Ho Chi Minh City', opens: 2, x: 810, y: 214, lx: 730, ly: 254 },
  { name: 'Hai Phong', opens: 3, x: 200, y: 54, lx: 196, ly: 34 },
  { name: 'Nha Trang', opens: 4, x: 690, y: 150, lx: 660, ly: 128 },
  { name: 'Can Tho', opens: 5, x: 900, y: 262, lx: 880, ly: 290 },
] as const;
const HUB = { x: 520, y: 160 };
const COAST = 'M20 40 Q160 20 260 60 Q380 90 460 150 Q540 210 660 170 Q780 140 860 210 Q920 250 970 250 L970 300 L20 300 Z';

export const openCities = (passed: ReadonlySet<number>): Set<string> =>
  new Set(CITIES.filter((c) => c.opens === 0 || passed.has(c.opens)).map((c) => c.name));

/** One line per city ("Ha Noi: delivering"): the map's accessible description and the HTML legend below lg. */
export const deliveryItems = (st: EcomArtState): string[] => {
  const open = openCities(st.passed);
  return CITIES.map((c) => (open.has(c.name) ? t('ecom.map.open', { name: c.name }) : t('ecom.map.locked', { name: c.name, n: c.opens })));
};

export function deliveryMap(st: EcomArtState): SVGSVGElement {
  const open = openCities(st.passed);
  const route = (c: (typeof CITIES)[number]): SVGPathElement => {
    const mx = (HUB.x + c.x) / 2;
    const my = Math.min(HUB.y, c.y) - 40;
    const isOpen = open.has(c.name);
    return s('path', {
      d: `M${HUB.x} ${HUB.y} Q${mx} ${my} ${c.x} ${c.y}`, fill: 'none', 'stroke-width': 3, 'stroke-linecap': 'round',
      class: isOpen ? chapterColor(Math.max(1, c.opens)).stroke : 'stroke-slate-400 dark:stroke-slate-500',
      'stroke-dasharray': isOpen ? false : '6 6',
    });
  };
  return s('svg', {
    viewBox: '0 0 980 300', class: 'block w-full max-lg:[&_text]:hidden', role: 'img',
    'aria-label': t('ecom.map.label', { cities: deliveryItems(st).join('; ') }),
  },
    s('rect', { width: 980, height: 300, rx: 12, class: 'fill-sky-100 dark:fill-slate-800' }),
    s('path', { d: COAST, class: 'fill-slate-300 dark:fill-slate-700' }),
    s('g', {}, ...CITIES.map(route)),
    s('g', { 'font-family': FONT, 'font-size': 14, 'font-weight': 600 },
      ...CITIES.flatMap((c) => {
        const isOpen = open.has(c.name);
        return [
          s('circle', { cx: c.x, cy: c.y, r: 6, class: isOpen ? chapterColor(Math.max(1, c.opens)).fill : 'fill-slate-400 dark:fill-slate-500' }),
          s('text', { x: c.lx, y: c.ly, class: isOpen ? 'fill-slate-900 dark:fill-slate-100' : 'fill-slate-600 dark:fill-slate-300' }, c.name),
        ];
      })),
    // the warehouse: a small roofed box on the hub
    s('g', { 'aria-hidden': 'true' },
      s('path', { d: `M${HUB.x - 14} ${HUB.y - 2} L${HUB.x} ${HUB.y - 14} L${HUB.x + 14} ${HUB.y - 2} Z`, fill: '#b45309' }),
      s('rect', { x: HUB.x - 11, y: HUB.y - 2, width: 22, height: 14, fill: '#fef3c7', stroke: '#b45309', 'stroke-width': 2 })),
    s('text', { x: HUB.x + 20, y: HUB.y + 4, 'font-family': FONT, 'font-size': 14, 'font-weight': 700, class: 'fill-slate-900 dark:fill-slate-100' }, t('ecom.map.hub')));
}

/** Parcels on the shelf: one per completed task, at most 30 (6 chapters × 5 tasks), coloured by chapter. Shelf r sits at y = 278 − 48r. */
const SHELF = { x: 640, cols: 10, w: 30, h: 22 };

export function storeScene(st: EcomArtState): SVGSVGElement {
  const parcels = Math.min(st.done, 30);
  const box = (i: number): SVGRectElement => {
    const col = i % SHELF.cols;
    const row = Math.floor(i / SHELF.cols);
    return s('rect', {
      x: SHELF.x + col * (SHELF.w + 4), y: 278 - row * 48 - SHELF.h, width: SHELF.w, height: SHELF.h, rx: 3,
      class: chapterColor(1 + Math.floor(i / 5)).fill,
    });
  };
  const stripes = Array.from({ length: 8 }, (_, i) =>
    s('path', { d: `M${90 + i * 40} 120 h40 v34 q-20 14 -40 0 z`, fill: i % 2 ? '#f8fafc' : '#dc2626' }));
  return s('svg', {
    viewBox: '0 0 1100 400', class: 'block w-full max-lg:[&_text]:hidden', role: 'img',
    'aria-label': t('ecom.scene.label', { boxes: parcels }),
  },
    s('rect', { width: 1100, height: 400, class: 'fill-sky-100 dark:fill-slate-800' }),
    s('rect', { y: 330, width: 1100, height: 70, class: 'fill-slate-300 dark:fill-slate-700' }),
    // the shop: wall, striped awning, window with lanterns, door
    s('g', { 'aria-hidden': 'true' },
      s('rect', { x: 100, y: 150, width: 300, height: 180, fill: '#fde68a' }),
      ...stripes,
      s('rect', { x: 130, y: 190, width: 140, height: 90, fill: '#bae6fd', stroke: '#92400e', 'stroke-width': 4 }),
      ...[160, 200, 240].map((cx) => s('ellipse', { cx, cy: 214, rx: 10, ry: 14, fill: '#f97316' })),
      s('rect', { x: 300, y: 220, width: 60, height: 110, fill: '#92400e' }),
      s('circle', { cx: 350, cy: 276, r: 4, fill: '#fde68a' })),
    s('text', { x: 250, y: 108, 'text-anchor': 'middle', 'font-family': FONT, 'font-size': 22, 'font-weight': 800, class: 'fill-slate-900 dark:fill-slate-100' }, t('ecom.company')),
    // the warehouse: roof, roller door, shelf of parcels
    s('g', { 'aria-hidden': 'true' },
      s('path', { d: 'M600 120 L820 70 L1040 120 Z', fill: '#475569' }),
      s('rect', { x: 610, y: 120, width: 420, height: 210, fill: '#e2e8f0', stroke: '#475569', 'stroke-width': 3 }),
      ...[0, 1, 2].map((r) => s('rect', { x: 630, y: 278 - r * 48, width: 352, height: 4, fill: '#64748b' })),
      s('rect', { x: 990, y: 200, width: 32, height: 130, fill: '#94a3b8' })),
    s('g', {}, ...Array.from({ length: parcels }, (_, i) => box(i))),
    // the delivery scooter at the kerb
    s('g', { 'aria-hidden': 'true', transform: 'translate(470,282)' },
      s('rect', { x: 18, y: 0, width: 34, height: 26, rx: 3, fill: '#f97316' }),
      s('path', { d: 'M0 34 H70 L78 22 H60', fill: 'none', stroke: '#1e293b', 'stroke-width': 4 }),
      ...[10, 66].map((cx) => s('circle', { cx, cy: 42, r: 8, fill: '#0f172a' }))));
}
```

## Phụ lục E · Test

### E.1 `tests/ecomSeed.test.ts`

```ts
// Plan 9: the ecom schema (src/db/ecom/), seeded lazily by ensureSchema(db, 'ecom'). md5 pins: any change to an
// existing block re-rolls these tables and breaks the tickets; append new blocks at the end with their own setseed().
import type { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';
import { ensureSchema, runSandboxed } from '../src/db/run';
import { ECOM_TABLES } from '../src/domains';
import { freshDb } from './helpers';

const PINS: Record<string, string> = {
  categories: '4811c234f1b7d8b81ab2b4fe342ea15e',
  sellers: '295e51ad10dc4819d9a980542907e159',
  products: '2dc2de4b23b4a4b7eae692e6a976c0a9',
  customers: '2acfea88f3eb0cd541578946b19c022f',
  vouchers: 'cf11fdd4a9fa3f46588098b5cb5fe871',
  orders: '57f8ae3a029e09834ed15a9064896f3b',
  order_items: 'e760cf7b209a6be6de135341ef34f2c7',
  payments: 'a89f78d5af482c01d3642a0259b0283b',
  deliveries: 'bd8cc1a404fc2df062be28b1764f848b',
  returns: '3297cae09a89676da44981145ef53c44',
  reviews: '10bfe729db17d568b0339062d991b486',
  web_sessions: '1124157f56fe1baf2531ae3116ba5bf1',
  ad_spend: '130d56668bb3e09f2793c0ef856aa542',
};
const hashOf = (t: string) => `SELECT md5(string_agg(x::text, '|' ORDER BY x::text)) FROM ${t} x`;

let shared: Promise<PGlite> | undefined;
const db = (): Promise<PGlite> => (shared ??= freshDb().then(async (d) => { await ensureSchema(d, 'ecom'); return d; }));
const one = async (sql: string): Promise<unknown[]> => (await runSandboxed(await db(), sql, undefined, { schema: 'ecom' })).rows[0];
const num = async (sql: string): Promise<number> => Number((await one(sql))[0]);

describe('seed ecom (Plan 9)', () => {
  it('13 bảng = ECOM_TABLES, đúng md5 ghim; ensure lần hai không làm gì', async () => {
    const d = await db();
    const names = (await d.query<{ t: string }>("SELECT table_name AS t FROM information_schema.tables WHERE table_schema = 'ecom' ORDER BY 1")).rows.map((r) => r.t);
    expect(names).toEqual([...ECOM_TABLES].sort());
    for (const t of ECOM_TABLES) expect((await one(hashOf(t)))[0], t).toBe(PINS[t]);
    await ensureSchema(d, 'ecom');
    expect(await num('SELECT count(*) FROM orders')).toBe(10868);
  });

  it('không chạm Logistics: đường dẫn phiên vẫn là logistics, sandbox; public trống', async () => {
    const d = await db();
    expect((await d.query<{ search_path: string }>('SHOW search_path')).rows[0].search_path).toBe('logistics, sandbox');
    expect(Number((await d.query<{ n: number }>("SELECT count(*) AS n FROM information_schema.tables WHERE table_schema = 'public'")).rows[0].n)).toBe(0);
  });

  it('móc cốt truyện ở đầu seed.sql', async () => {
    // 12% never order (E3 anti join)
    expect(await num('SELECT count(*) FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id)')).toBe(493);
    // sale days dwarf every other day (E4, E6)
    const [saleMin, otherMax] = (await one(`SELECT min(n) FILTER (WHERE s), max(n) FILTER (WHERE NOT s) FROM (
      SELECT ordered_at::date IN ('2025-09-09','2025-10-10','2025-11-11','2025-12-12','2026-09-09','2026-10-10') AS s, count(*) AS n
      FROM orders GROUP BY ordered_at::date, 1) x`)).map(Number);
    expect(saleMin).toBeGreaterThan(5 * otherMax);
    // Kite Logistics late in the central cities from 2026-09-01 only (E4)
    expect(await num(`SELECT avg(delivered_on - promised_on) FROM deliveries
      WHERE courier = 'Kite Logistics' AND city IN ('Da Nang', 'Hue', 'Nha Trang') AND shipped_on >= '2026-09-01'`)).toBeGreaterThan(3);
    expect(await num(`SELECT max(abs(a)) FROM (SELECT avg(delivered_on - promised_on) AS a FROM deliveries
      WHERE NOT (courier = 'Kite Logistics' AND city IN ('Da Nang', 'Hue', 'Nha Trang') AND shipped_on >= '2026-09-01') GROUP BY courier, city) x`)).toBeLessThan(0.5);
    // seller 7's phones/audio come back damaged in Q3 2026 (E5)
    const [s7, others] = (await one(`SELECT 100.0 * count(r.id) FILTER (WHERE p.seller_id = 7) / count(*) FILTER (WHERE p.seller_id = 7),
      100.0 * count(r.id) FILTER (WHERE p.seller_id <> 7) / count(*) FILTER (WHERE p.seller_id <> 7)
      FROM order_items i JOIN deliveries d ON d.order_id = i.order_id JOIN products p ON p.id = i.product_id
      LEFT JOIN returns r ON r.order_id = i.order_id AND r.product_id = i.product_id AND r.reason = 'damaged'
      WHERE d.delivered_on >= '2026-07-01' AND d.delivered_on < '2026-10-01' AND p.category_id IN (2, 3)`)).map(Number);
    expect(s7).toBeGreaterThan(10);
    expect(others).toBeLessThan(3);
    // cod orders never paid have no payment row; failed card payments are retried (E3)
    expect(await num("SELECT count(*) FROM orders o WHERE o.status = 'cancelled' AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.order_id = o.id)")).toBe(518);
    expect(await num('SELECT count(*) FROM (SELECT order_id FROM payments GROUP BY 1 HAVING count(*) > 1) x')).toBe(122);
    // retention by first channel: referral > organic > social > ads (E5, E6)
    const order = (await runSandboxed(await db(), `SELECT channel FROM (SELECT c.channel, count(o.id) AS n FROM customers c
      LEFT JOIN orders o ON o.customer_id = c.id AND o.status <> 'cancelled' GROUP BY c.id, c.channel) x GROUP BY 1 ORDER BY avg(n) DESC`, undefined, { schema: 'ecom' })).rows.map((r) => r[0]);
    expect(order).toEqual(['referral', 'organic', 'social', 'ads']);
    // empty cells (E4)
    expect(await num('SELECT count(*) FROM customers WHERE birth_year IS NULL')).toBe(1251);
    expect(await num("SELECT count(*) FROM orders o JOIN deliveries d ON d.order_id = o.id WHERE o.status = 'pending' OR (o.status = 'shipping') <> (d.delivered_on IS NULL)")).toBe(0);
  });
});
```

### E.2 `tests/ecomContent.test.ts`

```ts
// Plan 9: every rule of tests/content.test.ts and tests/variants.test.ts, applied to the e-commerce domain
// (content/domains/ecom/, schema ecom). Rules that differ from Logistics: every chapter's teach ticket is worked,
// every skill but select has a normal ticket with ≥ 3 variants, prompts may not name window/CTE keywords either.
import { describe, expect, it } from 'vitest';
import ecomSchemaSql from '../src/db/ecom/schema.sql?raw';
import { loadDomain, loadTicketTemplates } from '../src/content';
import { cellKey, compareResults } from '../src/grader';
import { kpisOf } from '../src/home';
import { peopleOf, personOf } from '../src/people';
import { chaptersOf, chapterTablesOf, contentProblems, domainSkills } from '../src/progress';
import { textOf, type TicketText } from '../src/tickets';
import { applyVariant, variantsOf } from '../src/variants';
import { ecomRunner } from './helpers';

await loadDomain('ecommerce');
const templates = loadTicketTemplates('ecommerce');
const tickets = templates.map((t) => applyVariant(t, 0));
const chapters = chaptersOf('ecommerce');
const tables = chapterTablesOf('ecommerce');
const skills = domainSkills(tickets);
const unlocked = (ch: number): string[] => Object.entries(tables).filter(([c]) => Number(c) <= ch).flatMap(([, t]) => t);
const ALL_TABLES = Object.values(tables).flat();
const normal = templates.filter((t) => t.beat !== 'boss');
const steps = tickets.flatMap((t) => t.steps.map((s, i) => ({
  name: `${t.id}#${i}`, ordered: t.ordered, tables: t.tables, sql: s.solution, columns: s.columns, chapter: t.chapter,
})));

const VI_DIACRITIC = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
const codeSpans = (s: string): string[] => [...s.matchAll(/`([^`]+)`/g)].map((m) => m[1]).sort();
const allText = (x: TicketText): string => [
  x.title, x.body, x.task, ...x.hints, ...x.steps.flatMap((s) => [s.title, s.prompt]),
  ...(x.conclusion ? [x.conclusion.question, ...x.conclusion.options] : []), x.example ?? '',
].join('\n');
// ponytail: regex over FROM/JOIN, as in tests/content.test.ts (CTE names are not table names, so they are filtered out).
const tablesIn = (sql: string): string[] =>
  [...new Set([...sql.matchAll(/\b(?:from|join)\s+([a-z_][a-z0-9_]*)/gi)].map((m) => m[1].toLowerCase()))].filter((x) => ALL_TABLES.includes(x));
const SQLISH = /\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|JOIN|HAVING|LIMIT|COUNT|SUM|AVG|DISTINCT|OVER|PARTITION|CASE|WITH)\b|\b[a-z]+_[a-z_]+\b/g;

describe('E-com: cấu trúc', () => {
  it('30 ticket, 6 chương, id ecom-chN-0M', () => {
    expect(templates).toHaveLength(30);
    expect(chapters.map((c) => c.chapter)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(templates.filter((t) => !/^ecom-ch\d+-\d\d$/.test(t.id)).map((t) => t.id)).toEqual([]);
  });

  it('soft-lock, nhịp chương, kỹ năng, bảng theo chương (contentProblems)', () => {
    expect(contentProblems(tickets, skills, chapters, tables)).toEqual([]);
  });

  it('bảng của mọi chương có thật trong src/db/ecom/schema.sql', () => {
    const real = new Set([...ecomSchemaSql.matchAll(/CREATE TABLE (\w+)/g)].map((m) => m[1]));
    expect(ALL_TABLES.filter((x) => !real.has(x))).toEqual([]);
    expect([...real].sort()).toEqual([...ALL_TABLES].sort());
  });

  it('người gửi có trong content/domains/ecom/people.yml, đúng phòng, không trùng tên Logistics', () => {
    expect(tickets.filter((t) => personOf(t.from.name)?.dept !== t.from.dept).map((t) => t.id)).toEqual([]);
    const names = peopleOf('ecommerce').map((p) => p.name);
    expect(peopleOf('logistics').filter((p) => names.includes(p.name))).toEqual([]);
    const real = new Set([...ecomSchemaSql.matchAll(/CREATE TABLE (\w+)/g)].map((m) => m[1]));
    for (const p of peopleOf('ecommerce')) for (const tb of p.tables) expect(real.has(tb), `${p.name}: ${tb}`).toBe(true);
  });
});

describe('E-com: song ngữ và đề bài', () => {
  it.each(tickets)('$id', (t) => {
    expect(t.en).toBeDefined();
    expect(codeSpans(allText(textOf(t, 'en')))).toEqual(codeSpans(allText(textOf(t, 'vi'))));
    expect(allText(textOf(t, 'en')).replace(/`[^`]+`/g, '')).not.toMatch(VI_DIACRITIC);
    for (const lang of ['vi', 'en'] as const) {
      const x = textOf(t, lang);
      const prompts = [x.body, x.task, ...x.steps.map((s) => s.prompt)].join('\n');
      expect(prompts).not.toContain('`');
      expect(prompts.match(SQLISH)).toBeNull();
    }
  });
});

describe('E-com: Solution', () => {
  it.each(steps)('$name', async ({ sql, ordered, tables: declared, columns, chapter }) => {
    expect(sql).not.toMatch(/current_date|current_timestamp|localtimestamp|now\s*\(/i);
    if (ordered) expect(sql).toMatch(/order\s+by/i);
    expect(tablesIn(sql).filter((x) => !declared.includes(x))).toEqual([]);
    expect(tablesIn(sql).filter((x) => !unlocked(chapter).includes(x))).toEqual([]);
    const r = await (await ecomRunner())(sql);
    expect(r.rows.length).toBeGreaterThan(0);
    expect(columns?.length).toBe(r.columns.length);
    for (const label of columns ?? []) {
      expect(label.en).not.toMatch(VI_DIACRITIC);
      for (const text of [label.vi, label.en]) {
        expect(text).not.toMatch(/^[a-z0-9_]+$/);
        expect(r.columns).not.toContain(text);
      }
    }
  });
});

describe('E-com: phương pháp học', () => {
  it.each([1, 2, 3, 4, 5, 6])('chương %i: teach là worked, đúng một faded là develop đầu', (c) => {
    const inC = templates.filter((t) => t.chapter === c);
    expect(inC.find((t) => t.beat === 'teach')?.format).toBe('worked');
    expect(inC.filter((t) => t.format === 'faded').map((t) => t.id)).toEqual([inC.find((t) => t.beat === 'develop')?.id]);
  });

  it.each(normal)('$id: reflect + wrong, EN không dấu', (t) => {
    expect(t.reflect).toBeDefined();
    expect([t.reflect!.q, t.reflect!.why, ...t.reflect!.options].map((b) => b.en).join('\n')).not.toMatch(VI_DIACRITIC);
    expect(t.wrong?.length ?? 0).toBeGreaterThan(0);
    for (const w of t.wrong ?? []) expect(w.why.en).not.toMatch(VI_DIACRITIC);
  });

  it.each(templates.filter((t) => t.example))('$id: ví dụ mẫu chạy, có dòng, khác Solution, chỉ dùng bảng đã mở', async (t) => {
    const r = await (await ecomRunner())(t.example!.sql);
    expect(r.rows.length).toBeGreaterThan(0);
    expect(t.example!.sql).not.toBe(t.steps[0].solution);
    expect(tablesIn(t.example!.sql).filter((x) => !unlocked(t.chapter).includes(x))).toEqual([]);
  });

  const wrongs = normal.flatMap((t) => Array.from({ length: Math.max(1, variantsOf(t).length) }, (_, v) => applyVariant(t, v))
    .flatMap((tv, v) => (tv.wrong ?? []).map((w, i) => ({
      name: `${t.id}#${v} wrong[${i}]`, sql: w.sql, solution: tv.steps[0].solution, ordered: t.ordered, chapter: t.chapter,
    }))));
  it.each(wrongs)('$name: chạy, có dòng, khác Solution', async ({ sql, solution, ordered, chapter }) => {
    const run = await ecomRunner();
    const r = await run(sql);
    expect(r.rows.length).toBeGreaterThan(0);
    expect(compareResults(await run(solution), r, ordered).ok).toBe(false);
    expect(tablesIn(sql).filter((x) => !unlocked(chapter).includes(x))).toEqual([]);
  });

  it('mọi kỹ năng E-com dạy (trừ select) có ticket thường ≥ 3 biến thể', () => {
    const missing = skills.filter((s) => s.id !== 'select')
      .filter((s) => !normal.some((t) => [...t.requires, ...t.grants].includes(s.id) && variantsOf(t).length >= 3)).map((s) => s.id);
    expect(missing).toEqual([]);
  });
});

describe('E-com: biến thể', () => {
  const SKIP_KEYS = new Set(['id', 'from', 'variants', 'tables', 'requires', 'grants', 'beat', 'scene']);
  const texts = (v: unknown, key = ''): string[] => {
    if (SKIP_KEYS.has(key)) return [];
    if (typeof v === 'string') return [v];
    if (Array.isArray(v)) return v.flatMap((x) => texts(x));
    if (v && typeof v === 'object') return Object.entries(v).flatMap(([k, x]) => texts(x, k));
    return [];
  };

  it('không sót giá trị cứng của biến thể 0', () => {
    const problems: string[] = [];
    for (const t of templates) {
      const vs = variantsOf(t);
      vs.slice(1).forEach((v, j) => {
        const all = texts(applyVariant(t, j + 1)).join('\n');
        for (const [k, x] of Object.entries(vs[0])) {
          if (v[k] !== x && !Object.values(v).includes(x) && all.includes(String(x))) problems.push(`${t.id}#${j + 1}: "${x}" (${k})`);
        }
      });
    }
    expect(problems).toEqual([]);
  });

  it.each(templates.filter((x) => variantsOf(x).length > 0))('$id: mọi biến thể chạy, có dòng, khác nhau từng đôi', async (t) => {
    const run = await ecomRunner();
    const seen: string[] = [];
    for (let i = 0; i < variantsOf(t).length; i++) {
      const r = await run(applyVariant(t, i).steps[0].solution);
      expect(r.rows.length, `#${i}`).toBeGreaterThan(0);
      seen.push(r.rows.map((row) => row.map(cellKey).join('|')).join('\n'));
    }
    expect(new Set(seen).size).toBe(seen.length);
  });
});

describe('E-com: KPI (content/domains/ecom/kpis.yml)', () => {
  it.each(kpisOf('ecommerce'))('$id: Solution của việc nguồn ra đúng dạng ô', async (k) => {
    const t = tickets.find((x) => x.id === k.ticket)!;
    expect(t, k.ticket).toBeDefined();
    const r = await (await ecomRunner())(t.steps[k.step].solution);
    if (k.kind === 'number') {
      expect(r.rows).toHaveLength(1);
      expect(Number.isFinite(Number(r.rows[0][k.col]))).toBe(true);
    }
    if (k.kind === 'rowcount') expect(r.rows.length).toBeGreaterThan(0);
    if (k.kind === 'bar') expect(r.rows.every((row) => Number.isFinite(Number(row[row.length - 1])))).toBe(true);
  });
});
```

### E.3 `tests/fixtures/save-v4.json`

```json
{
  "version": 4,
  "completed": ["ch1-01", "ch1-02", "ch1-03", "ch1-04", "ch1-05", "ch2-01", "ch2-02", "ecom-ch1-01", "ecom-ch1-02"],
  "xp": 1440,
  "hintsUsed": { "ch1-02": 1, "r-1": 2, "ecom-ch1-02": 1 },
  "drafts": { "ch2-03#0": "SELECT count(*) FROM shipments", "r-2#0": "SELECT 1", "ecom-ch1-03#0": "SELECT sku, name, price FROM products" },
  "graded": {
    "ch2-02#0": "SELECT mode, direction, COUNT(*) FROM shipments GROUP BY mode, direction",
    "r-1#0": "SELECT incoterm, count(*) FROM shipments GROUP BY incoterm",
    "ecom-ch1-02#0": "SELECT sku, name, price FROM products WHERE seller_id = 16 AND is_active = true AND price < 500000"
  },
  "review": { "select": { "box": 3, "due": "2026-11-20" }, "where": { "box": 2, "due": "2026-11-19" } },
  "practice": { "solved": 4, "weak": 1 },
  "sandboxDraft": "SELECT count(*) FROM shipments",
  "bossStep": { "ecom-ch1-05": 1 },
  "dashboard": {
    "cards": [
      { "id": "c1", "title": "Lô đi Rotterdam năm 2025", "sql": "SELECT count(*) FROM shipments WHERE pod = 'NLRTM'", "kind": "number", "col": 0, "source": "sandbox" }
    ],
    "hidden": ["rows2025"]
  },
  "lanes": ["r-1"],
  "byDomain": {
    "ecommerce": {
      "dashboard": {
        "cards": [
          { "id": "e1", "title": "Đơn tháng 10/2026", "sql": "SELECT count(*) FROM orders WHERE ordered_at >= '2026-10-01'", "kind": "number", "col": 0, "source": "sandbox" }
        ],
        "hidden": ["ecomKiteLate"]
      },
      "sandboxDraft": "SELECT * FROM orders LIMIT 5"
    }
  }
}
```
