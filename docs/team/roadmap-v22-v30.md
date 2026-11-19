# Roadmap v22 → v30: Database Engine trước, review sau mỗi version (BoonData)

Người viết: Product Design + UI/UX · 2026-11-20. Chỉ là kế hoạch, không có code.

## Căn cứ

- **L215:**
  - Engine là ưu tiên số 1; Postgres đầy đủ là mức tối thiểu.
  - e2e + Product/UX review trước mỗi lần publish Engine.
  - Mọi thứ phải có giá trị.
  - v30 là phiên bản cuối.
  - Có agent Research cho Best Practice.
  - Luôn ≥ 10 agent làm việc.
- **L216:** commit local trong lúc làm; mỗi version thì push + deploy + tag.
- **L217:** mỗi version vừa publish phải có UI/UX review bản live và Product nhìn lại, ghi vào `review-vNN.md`. Phát hiện thành việc đầu tiên của version sau. Không dồn review tới cuối.

## Tài liệu dùng

| Tài liệu | Vai trò |
|---|---|
| `product-design-db-engine.md` (bản 2) | Thiết kế |
| `db-engine-knowledge.md` | Nội dung |
| `ux-deploy-checklist.md` | Review UI/UX |
| `roadmap-v22.md` | Các mục đã duyệt ở L200 |
| `roadmap-v18-v20.md` §5 | Giao thức worktree, merge, deploy (giữ nguyên) |

**Thay thế:** tài liệu này thay `roadmap-v22.md` §3.7 (thứ tự) và §5 (dải L). Các luồng V22-A…E giữ nội dung và số L đã giữ chỗ (L201–L212), nhưng giờ được xếp vào các version dưới đây.

Mọi cỡ việc là ước lượng. Cỡ: S ≤ 1 ngày, M 2–4 ngày, L 1–2 tuần (ngày làm của agent).

---

## 0. Nguyên tắc

1. **Mỗi version phát hành một lát xem được.** Thường là một cấp của một engine, cộng một mục khác.
2. **Vòng của mỗi version** (L216 + L217):
   1. Gộp ở local qua cổng (§2).
   2. Push, deploy, tag `vNN`.
   3. UI/UX review bản live theo `ux-deploy-checklist.md`, và Product nhìn lại (giữ/sửa/bỏ, giá trị). Cả hai ghi vào `docs/team/review-vNN.md`.
   4. **Luồng R** (track đầu tiên) của version sau sửa các phát hiện P1/P2 trước mọi việc mới. P3 được sửa nếu còn chỗ, hoặc ghi lý do để lại.
3. **Nội dung viết trước, phát hành sau.**
   - Agent nội dung viết cấp N+1 hoặc N+2 trong worktree riêng (thư mục `content/engine/<engine>/L<n>/**` không giao nhau). Chỉ gộp vào `main` trong version phát hành cấp đó, nên không cần cờ ẩn trong code.
   - Nhờ vậy ≥ 10 agent luôn có việc mà không đụng file của nhau.
4. **File một chủ.** Mỗi file chỉ một luồng sửa trong một version:

   | File | Chủ |
   |---|---|
   | `src/ui/work.ts` | E-WS. v22 thêm **một** điểm rẽ "chạy bằng engine nào"; sau đó luồng khác dùng hook |
   | `src/db/worker.ts`, `src/db/client.ts` | PG-RT (Postgres). Mongo và Dynamo có worker riêng, không đụng hai file này |
   | `src/save.ts`, `src/route.ts`, `src/ui/topbar.ts` (đăng ký nav) | E-FND, chỉ ở v22 |
   | `scripts/check-budget.mjs` | Mỗi luồng **nối một dòng** nhóm trong commit gộp của mình; người điều phối gộp xung đột |
   | `scripts/e2e.mjs` | QA. Phần `engine` thêm một khối mỗi version |
   | `src/i18n/vi.ts`, `src/i18n/en.ts` | Khóa nav và chữ main (≤ 5 khóa) chỉ ở E-FND. Chữ Engine nằm ở `src/i18n/engine.ts` |

5. **Không chờ V22-E (Nhẹ hơn).**
   - Engine đọc markdown bằng bộ nạp lười riêng, frontmatter parse trong chunk `engineui`.
   - Khi V22-E có bộ chuyển YAML → JSON lúc build, Engine chuyển sang dùng nó trong luồng R của version kế tiếp.
6. **Agent Research (Best Practice) chạy suốt v22–v30**: viết vào `content/engine/best/**` theo §7.5 thiết kế, phát hành từ v25.

---

## 1. Các version

### Một dòng mỗi version

| Ver. | Phát hành | Mục khác (nếu còn sức) |
|---|---|---|
| **v22** | Nền Engine + **Postgres L1** + 3 spike + công cụ review | V22-E Nhẹ hơn |
| **v23** | **Postgres L2** (index, tìm kiếm, EXPLAIN ANALYZE, contrib) | V22-B Vì sao ra dòng này |
| **v24** | **Postgres L3** bên trong lưu trữ (request H-B, pageinspect, sơ đồ heap/HOT/WAL) | V22-C Quay lại có lý do |
| **v25** | **Postgres L4** planner, partition, lock + **Best Practice** (SQL + Postgres) | V22-A Bản đồ A |
| **v26** | **Postgres L5** + capstone Postgres → **Postgres đầy đủ** | V22-D Nội dung |
| **v27** | **MongoDB L1–L2** (mingo, shell, `docGrade`) | Best Practice Mongo |
| **v28** | **MongoDB L3–L5** (luật ESR, explain ghi sẵn, sơ đồ) | — |
| **v29** | **DynamoDB L1–L5** (dynoxide; phần pending ghi rõ) | Best Practice Dynamo |
| **v30** | Hoàn thiện: so sánh ba engine, e2e toàn app, sửa review cuối | Tag cuối |

### v22: Nền Engine + Postgres L1

Mở sau tag v21. Luồng R là các phát hiện còn mở của `v21-ux-review.md` (U1–U39) và `v21-e2e-findings.md` (E1–E5) mà v21 chưa đóng.

| Luồng | Nội dung | File (tách nhau) | Cỡ |
|---|---|---|---|
| **R** | Việc còn mở của v21 | theo từng phát hiện | M |
| **E-FND** | Route `engine` (+ `#/engine/lesson|play`), nav desktop order 25 + icon `database`, mục "Học" + công tắc trên điện thoại, `ENGINE_ID` trong `isWorkId` + fixture `save-v5-engine.json`, hook `#/me`, `tests/noDeadEnds` mở rộng | `src/route.ts`, `src/save.ts`, `src/ui/topbar.ts`, `src/ui/icons.ts` + `scripts/icon-map.json`, `index.html` (bottom nav), `tests/*` mới | M |
| **E-UI** | Chunk `engineui`: trang tổng quan/engine/cấp/bài, trình chấm `quiz`/`predict`, nhãn trung thực, sidebar `sideExtra` cho Engine, bộ nạp + parser ENGINE-CONTENT-V1 + `tests/engineContent.test.ts` (id = đường dẫn, VI/EN, code span, `sources`, `requires`, `viz`) | mới `src/engine/*.ts`, `src/ui/engine*.ts`, `src/i18n/engine.ts`, `src/ui/sidebar.ts` (một nhánh) | L |
| **E-WS** | Session mode `engine`, điểm rẽ chạy trong `work.ts`, `check: rows|plan|catalog` cho Postgres (câu dò catalog §2.3), `bossStep` cho lab nhiều bước, XP theo loại | `src/ui/work.ts`, `src/session.ts`, mới `src/engine/check.ts` | M |
| **E-VIZ** | `diagram.ts` + chunk `enginemotion` + token `--eng-*` (sáng/tối, có test tương phản), sơ đồ `pg-query-path` và `pg-btree-split` | mới `src/engine/diagram.ts`, `src/engine/viz/*`, `src/style.css` (khối token) | M |
| **PG-RT** | Schema `engine` + seed, `SCHEMAS.eng`, request `ensure` cho `engine` | `src/db/engine/*`, `src/domains.ts`, `src/db/worker.ts`, `src/db/client.ts` | S |
| **C-PG1** | Nội dung Postgres L1 (10 bài + capstone L1), `modules.yml` (ADD-1) | `content/engine/postgres/L1/**` | M |
| **C-PG2/3** | Viết trước L2, L3 (phát hành v23/v24) | `content/engine/postgres/L2/**`, `L3/**` | L |
| **SPIKE** | ES1: extension trong **Web Worker** trình duyệt, chọn một PGlite hay hai, đo RAM trên điện thoại giả lập 375, boot thêm bao nhiêu ms, prototype `engineLab` (setup ngoài transaction + `VACUUM` + `pageinspect`). ES2: mingo với `$jsonSchema`, `$merge/$out`, pipeline update, `arrayFilters`. ES3: dynoxide 1.7 với Streams, TTL, `TransactGetItems`. Kết quả ghi vào `docs/team/spike-engine.md`; code để ở nhánh `spike/engine-*`, không gộp | nhánh spike | M |
| **QA** | Đưa công cụ audit v21 (đang ở scratchpad `v21tool/`) vào repo thành `scripts/ux-audit.mjs` (tương phản, chữ bị cắt, vùng chạm, tràn ngang, chồng lấn, neo popover; matrix §3 của checklist); `scripts/e2e.mjs` thêm phần `engine`; 3 kiểm rẻ của v21 §3 vào `scripts/smoke.mjs` | `scripts/ux-audit.mjs`, `scripts/e2e.mjs`, `scripts/smoke.mjs` | M |
| **V22-E** | Như `roadmap-v22.md` (L201–L202) | như tài liệu đó | M |

**Thoát v22:**

- Cổng chung (§2).
- `#/engine` → Postgres → L1 → làm hết 10 bài + capstone trên bản build (e2e).
- Top bar một hàng ở 1024–1440 VI/EN.
- `#bottom-nav` < 72 px ở 320.
- `spike-engine.md` có kết luận GO/NO-GO cho ES1–ES3.
- `ux-audit.mjs` chạy được trên site live.

**L218–L226.**

### v23: Postgres L2

| Luồng | Nội dung | File | Cỡ |
|---|---|---|---|
| **R** | Phát hiện của `review-v22.md` | theo phát hiện | S–M |
| **PG-EXT** | Nạp contrib theo kết luận ES1 (`pg_trgm`, `bloom`, `btree_gin/gist`, `cube`, `earthdistance`), nhóm `pgext` | `src/db/worker.ts`, `src/db/client.ts`, `src/db/init.ts` | M |
| **E-PRED** | `predict` Postgres đầy đủ: "Xem thật" chạy EXPLAIN, vẽ cây kế hoạch, kiểm `expect` (ADD-4) trong test | `src/engine/predict.ts`, `src/ui/enginePredict.ts`, `tests/enginePredict.test.ts` | M |
| **E-VIZ** | `pg-gin`, `pg-brin`, `pg-gist` | `src/engine/viz/*` | M |
| **C-PG2** | Gộp L2 đã viết trước + `explain-analyze`, `geo-lite` | `content/engine/postgres/L2/**` | M |
| **C-PG4** | Viết trước L4 | `content/engine/postgres/L4/**` | L |
| **V22-B** | "Vì sao ra dòng này" (L206–L207) | như `roadmap-v22.md` | M–L |

**Thoát v23:**

- Cổng chung.
- e2e L2 đủ 14 bài + capstone.
- Mọi `predict` có `expect` khớp PGlite.
- `pgext` nằm trong trần.
- Boot domain không chậm hơn v22 quá 10 %.

**L227–L232.**

### v24: Postgres L3, bên trong lưu trữ

| Luồng | Nội dung | File | Cỡ |
|---|---|---|---|
| **R** | `review-v23.md` | | S–M |
| **PG-HB** | Request `engineLab` (H-B): dựng lại schema mỗi lab, `setup` của tác giả ngoài transaction, `VACUUM`/flush stats theo hằng số, câu người chơi vẫn qua `runSandboxed` | `src/db/worker.ts`, `src/db/run.ts`, `src/db/client.ts` | M |
| **E-INSIDE** | Tab "Bên trong": vẽ trang heap và WAL record **từ kết quả thật** | `src/ui/engineInside.ts` | M |
| **E-VIZ** | `pg-heap-page`, `pg-mvcc`, `pg-hot`, `pg-vacuum-vm`, `pg-wal` | `src/engine/viz/*` | L |
| **C-PG3** | Gộp L3 | `content/engine/postgres/L3/**` | M |
| **C-PG5** | Viết trước L5 + capstone Postgres | `content/engine/postgres/L5/**` | L |
| **C-MG12** | Viết trước MongoDB L1–L2 + script `mongo-lab` | `content/engine/mongodb/L1/**`, `L2/**`, `scripts/lab-to-docs.mjs` | L |
| **V22-C** | Quay lại có lý do (L208–L210) | như `roadmap-v22.md` | M–L |

**Thoát v24:**

- Cổng chung.
- e2e L3.
- Mọi lab H-B chạy trong Node **và** trong worker trình duyệt (smoke).
- Không có lab nào phụ thuộc thứ tự mở.

**L233–L238.**

### v25: Postgres L4 + Best Practice

| Luồng | Nội dung | File | Cỡ |
|---|---|---|---|
| **R** | `review-v24.md` | | S–M |
| **C-PG4** | Gộp L4. Bài D (isolation, SSI, deadlock, parallel, JIT) có `recorded` từ PostgreSQL 18 thật, chụp bằng script ngoài app | `content/engine/postgres/L4/**`, `scripts/capture-pg.md` | M |
| **E-VIZ** | `pg-partition-prune`, `pg-locks`, `pg-isolation` (công tắc RC/RR, hai làn phiên ghi rõ "mô phỏng") | `src/engine/viz/*` | L |
| **E-BP** | Tab Best Practice `#/engine/best`; chốt định dạng với Research (L của v25); phát hành SQL + Postgres | `src/ui/engineBest.ts`, `content/engine/best/{sql,postgres}/**` | M |
| **MG-RT** | Runtime Mongo (chưa phát hành): `mongoWorker`, `mongoShell.ts` (không `eval`), `docGrade.ts`, `esr.ts`, test trên `mongo-lab` | mới `src/engine/mongo/*`, `src/db/mongoWorker.ts` | L |
| **V22-A** | Bản đồ A (L203–L205) | như `roadmap-v22.md` | L |

**Thoát v25:**

- Cổng chung.
- e2e L4.
- Mỗi mục Best Practice có ví dụ chạy được và nguồn chính thức.
- Mọi bài D có câu chấm.

**L239–L244.**

### v26: Postgres L5 + capstone, **Postgres đầy đủ**

| Luồng | Nội dung | File | Cỡ |
|---|---|---|---|
| **R** | `review-v25.md` | | S–M |
| **C-PG5** | Gộp L5 + capstone "Bảng sự kiện chậm" | `content/engine/postgres/L5/**` | M |
| **E-VIZ** | `pg-replication` | `src/engine/viz/*` | S |
| **E-LINK** | Chip "Đào sâu" Domain → Engine (index lab ch11) và General → Engine (`explain_read`, `index_design`); album Lily + reo khi xong capstone; khối `#/me` đủ 5 cấp | `src/ui/brief.ts` (một dòng), `src/ui/learnView.ts` (một dòng), `src/ui/engineMe.ts` | M |
| **QA-PG** | e2e Postgres L1→L5 liền một lượt; "giải mù" toàn bộ lab Postgres (thiết kế §8.4) | `scripts/e2e.mjs` | M |
| **MG-UI** | Editor Mongo (+ `lang-javascript` nếu D-E6' được duyệt), tab "Pipeline từng bước", "So với SQL" (chưa phát hành) | `src/ui/engineMongo.ts` | M |
| **C-MG35** | Viết trước MongoDB L3–L5; chụp `explain` thật (`scripts/capture-mongo.md`) | `content/engine/mongodb/L3..L5/**` | L |
| **V22-D** | Nội dung (L211–L212) | như `roadmap-v22.md` | L |

**Thoát v26** (mức tối thiểu của L215):

- Cổng chung.
- 66 bài + 5 capstone Postgres phát hành.
- e2e một lượt đạt.
- Giải mù đạt.
- `review-v26.md` của Product kết luận "Postgres đủ". Nếu không đủ, v27 mở bằng luồng R cho Postgres trước Mongo.

**L245–L250.**

### v27: MongoDB L1–L2

| Luồng | Nội dung | File | Cỡ |
|---|---|---|---|
| **R** | `review-v26.md` | | M |
| **C-MG12** | Gộp L1–L2 + capstone L2 "Báo cáo tuần" | `content/engine/mongodb/L1/**`, `L2/**` | M |
| **MG-WIRE** | Nối `mongort`, `mongodata` vào `work.ts` qua hook của E-WS; `check: doc` | `src/engine/check.ts` (nhánh mg), `src/engine/mongo/*` | M |
| **E-VIZ** | `mg-pipeline` | `src/engine/viz/*` | S |
| **E-BP** | Best Practice Mongo (mô hình, index) | `content/engine/best/mongodb/**` | M |
| **DY-RT** | Runtime Dynamo (chưa phát hành): `dynamoWorker`, dynoxide, `dynamo-lab`, `check: doc|catalog` | mới `src/engine/dynamo/*`, `src/db/dynamoWorker.ts` | L |
| **C-DY** | Viết trước DynamoDB L1–L5 | `content/engine/dynamodb/**` | L |

**Thoát v27:**

- Cổng chung.
- e2e Mongo L1–L2.
- Mọi lab chạy trên mingo trong Node.
- Ca biên mingo ≠ MongoDB (ES2) không có trong bài nào.
- `mongort` ≤ 45.

**L251–L256.**

### v28: MongoDB L3–L5

| Luồng | Nội dung | File | Cỡ |
|---|---|---|---|
| **R** | `review-v27.md` | | S–M |
| **C-MG35** | Gộp L3–L5 (`recorded` + `catalog` theo ESR) | `content/engine/mongodb/L3..L5/**` | M |
| **E-VIZ** | `mg-esr` (vẽ từ đặc tả index của người học), `mg-replica-election`, `mg-sharding` | `src/engine/viz/*` | L |
| **QA-MG** | Test: luật ESR cho cùng kết luận với mọi `explain` ghi sẵn; giải mù Mongo | `tests/esr.test.ts`, `scripts/e2e.mjs` | M |

**Thoát v28:**

- Cổng chung.
- MongoDB 60 bài + 5 capstone.
- Mọi bài L3/L5 có câu chấm và nhãn trung thực.

**L257–L261.**

### v29: DynamoDB L1–L5

| Luồng | Nội dung | File | Cỡ |
|---|---|---|---|
| **R** | `review-v28.md` | | S–M |
| **C-DY** | Gộp L1–L5 + capstone L3 "Thiết kế bảng cho cửa hàng". `TransactWriteItems` và Streams/TTL theo ES3: H nếu có, D + dòng BE nếu không | `content/engine/dynamodb/**` | M |
| **DY-UI** | Editor JSON/PartiQL, tab Partition/Chi phí, dòng "tải 1,2 MB" | `src/ui/engineDynamo.ts` | M |
| **E-VIZ** | `dy-partitions`, `dy-gsi`, `dy-single-table` | `src/engine/viz/*` | M |
| **E-BP** | Best Practice DynamoDB | `content/engine/best/dynamodb/**` | M |

**Thoát v29:**

- Cổng chung.
- 53 bài + 5 capstone.
- Trần `dynamort` theo D-E12.
- Lab Dynamo mở được ở 375 trong ≤ 5 s lần ấm (đo).

**L262–L266.**

### v30: Hoàn thiện, phiên bản cuối

| Luồng | Nội dung | Cỡ |
|---|---|---|
| **R** | `review-v29.md` | M |
| **E-CMP** | Trang "Chọn engine nào": một bài `quiz` + `capstone` so sánh, cùng một bài toán trên ba engine | M |
| **QA-ALL** | e2e toàn app (domain, General, Engine), `ux-audit.mjs` đủ matrix, axe | M |
| **DOC** | `CLAUDE.md` mục Engine; `review-v30.md` liệt kê việc còn lại thành backlog (ADD-6 Leitner, backend, …) | S |

**Thoát v30:** cổng chung + tag `v30`. Vòng dừng.

**L267–L270** (L271–L275 dự phòng).

---

## 2. Cổng chung của mọi version

**Trước khi push:**

1. `npx tsc --noEmit`, toàn bộ `npm test`, `npm run build`, `node scripts/check-budget.mjs` xanh.
   - main ≤ số đo đầu version + 1 KB.
   - Cả vòng Engine: main ≤ +1,5 KB so với mốc sau V22-E.
2. `npm run smoke` + `scripts/e2e.mjs` (mọi phần), gồm phần `engine` của mọi cấp đã phát hành. 0 `console.error`, 0 axe serious.
3. Test nội dung Engine:
   - mọi `setup`/`solution` chạy trên runtime thật;
   - id khớp đường dẫn;
   - code VI = EN, EN không dấu;
   - mọi `viz` có trong danh mục;
   - mỗi cấp đúng một `capstone`;
   - mỗi `concept` có `quiz`.
4. Cổng Product của thiết kế §8 cho mỗi cấp phát hành.

**Push, deploy, tag `vNN`.** Kiểm site live trả 200, sau đó:

5. **UI/UX deploy review** trên site live: chạy `node scripts/ux-audit.mjs <url>` và đi hết `ux-deploy-checklist.md`. Phải phủ đủ:
   - căn lề;
   - chồng lấn/z-index;
   - đẩy hay đè;
   - neo dropdown;
   - chữ bị cắt;
   - tương phản;
   - hai theme;
   - 1280/1024/375/320;
   - giảm chuyển động.
6. **Product nhìn lại:** mỗi thứ vừa phát hành là giữ, sửa hay bỏ; câu "Học xong bạn làm được…" có thật không (thử bằng giải mù); số liệu dùng (thời gian, lượt sai) nếu có.
7. Ghi `docs/team/review-vNN.md` (mẫu ở checklist §4). Phát hiện P1/P2 thành luồng R của version sau. Cần user thì ghi vào L.

Một version chỉ được coi là xong khi đã có `review-vNN.md`.

## 3. Dải số L

L215–L217 đã dùng. Dải v22 cũ (L200–L214) vẫn giữ cho V22-A…E, như ghi ở từng version. Nếu dùng vượt dải, version sau dời cả dải lên, giữ thứ tự, và ghi vào dòng đầu.

| Dải | Version | Dùng cho |
|---|---|---|
| L218 | v22 | User duyệt `product-design-db-engine.md` bản 2 (D-E1, D-E6', D-E11–D-E13) và tài liệu này |
| L219–L226 | v22 | Kết quả spike ES1–ES3; route/nav/công tắc "Học"; `ENGINE_ID`; schema V1 → V1.1 (các ADD được nhận); `check` Postgres; `diagram.ts`; công cụ `ux-audit` |
| L227–L232 | v23 | contrib, `predict`, Postgres L2 |
| L233–L238 | v24 | `engineLab` H-B, tab Bên trong, Postgres L3 |
| L239–L244 | v25 | Postgres L4, định dạng + phát hành Best Practice, runtime Mongo |
| L245–L250 | v26 | Postgres L5, capstone, liên kết, kết luận "Postgres đủ" |
| L251–L256 | v27 | MongoDB L1–L2, runtime Dynamo |
| L257–L261 | v28 | MongoDB L3–L5, luật ESR |
| L262–L266 | v29 | DynamoDB, phần pending |
| L267–L270 | v30 | So sánh engine, thoát vòng |
| L271–L275 | — | Dự phòng |

## 4. Rủi ro lịch

| Rủi ro | Giảm |
|---|---|
| ES1 NO-GO (extension trong worker trình duyệt) | L3/L5 dùng fallback: chỉ cột hệ thống `ctid/xmin/xmax`, `EXPLAIN`, `pg_stats`; trang và WAL là D. v24 giảm phần H-B, không dời lịch |
| Một version dồn quá nhiều | Cắt mục "khác" của version (V22-A…D), không cắt cấp Engine. Mục bị cắt sang version sau |
| Review live tìm nhiều P1 | Luồng R chạy trước. Nếu R > 1/3 sức version thì bỏ mục "khác" của version đó |
| Thiếu việc cho 10 agent | Nội dung viết trước (C-*), sơ đồ (E-VIZ), Research (Best Practice), QA luôn có việc |
