# Roadmap v23 → v30, bản sửa sau khi build Database Engine (BoonData)

Người viết: Product + UI/UX (người điều phối giao, L215) · 2026-11-20. Chỉ là kế hoạch, không có code.

**Vì sao có bản này.** `roadmap-v22-v30.md` chia Database Engine thành "mỗi version một cấp". Nhưng nhánh `v22-engine` đã build gần như toàn bộ phần đó trong một đợt (L220–L253):

- 195 bài của ba engine;
- ba runtime;
- 27 tên sơ đồ đã đăng ký (20 sơ đồ khác nhau, L236; phần còn lại là bí danh);
- lộ trình NoSQL;
- e2e 195/195 (commit gộp ENG-INTEGRATE).

Ngoài nhánh này còn ba nhánh chưa gộp, bản này tính tới:

- `v22-nosql-fix` (2 commit, L254): sửa lỗi `$out`/`$merge` của runner MongoDB; runner DynamoDB từ chối `TransactWriteItems`/TTL/Streams.
- `v22-qa-audit` (1 commit): `scripts/ux-audit.mjs` và lần chạy đầu (`docs/team/ux-audit-v22.md`). Commit này ghi số **L253**, trùng với dòng spike L253.
- `main` (4 commit sau `v22-engine`): review v21 live; Best Practice vòng 5–6. Catalogue §14 (danh sách v25) **chỉ có trên `main`**; đủ thẻ cho cả 60 mục v25, `main` có 72 thẻ.

Trong worktree còn thay đổi chưa commit của agent khác: chip nhãn trung thực cạnh tiêu đề bài (`honestOf`, `src/engine/labs.ts`). Bản này coi nó là việc đang làm của v22.

Vì vậy, nếu giữ roadmap cũ, v23–v29 sẽ "phát hành" thứ đã có, còn các khoảng trống thật thì không có chỗ. Bản này làm hai việc. Thứ nhất, nó đối chiếu kế hoạch với thực tế, có bằng chứng (§1). Thứ hai, nó liệt kê khoảng trống thật (§2) và xếp lại v23–v30 quanh các khoảng trống đó (§4).

**Thay thế:** §1 (các version v23–v30) và §3 (dải L) của `roadmap-v22-v30.md`. **Giữ:**

- §0 nguyên tắc 2 (vòng review), 4 (file một chủ);
- §2 cổng chung;
- §4 rủi ro, phần còn đúng.

Mọi cỡ việc là ước lượng: S ≤ 1 ngày, M 2–4 ngày, L 1–2 tuần (ngày làm của agent).

---

## 0. Tóm tắt

1. **Nội dung đã đủ, nhưng chưa phát hành.** Không có tag `v22`, không có `review-v22.md`. `ux-audit.mjs` chỉ có trên nhánh `v22-qa-audit`. Lần chạy đầu của nó trên `v22-engine` (bản local) báo **25 lỗi serious**: top bar 9, tràn ngang 15, popover 1. Cả Engine chưa lên site live lần nào.
2. **Nội dung đã viết nhưng không màn hình nào dùng:**
   - Best Practice: 40 thẻ trên `v22-engine`, 72 thẻ trên `main` (`content/engine/best/**`);
   - ngân hàng phỏng vấn 180 câu + 6 take-home (`content/engine/interview-bank.yml`);
   - bảng thuật ngữ 231 mục (`content/engine/glossary.yml`).

   Không file nào trong `src/` hay `tests/` đọc ba nguồn này.
3. **Phần "xem thật" còn mỏng:**
   - `predict` Postgres chỉ cho xem kế hoạch dạng chữ, và chỉ sau khi đoán đúng;
   - `expect` chỉ được kiểm trong e2e;
   - `recorded` (ADD-3) không có ở bài nào, và parser cũng không đọc trường này;
   - MongoDB L3 có 15/17 bài chỉ là `runtime: docs`.
4. **Capstone chỉ là một lab dài.** Chưa có thanh bước, chưa có khối "Chấm bằng", chưa có kế hoạch trước/sau, Lily chưa reo. MongoDB L3 và L4 không có capstone.
5. **Kế hoạch mới.** v23–v26 là bốn lát "đủ chất lượng" theo thứ tự: Postgres → Best Practice → MongoDB → DynamoDB. v27 đưa thuật ngữ và phỏng vấn lên màn hình. v28 là so sánh ba engine và cầu nối DA ↔ Engine. v29 hoàn thiện kỹ thuật. v30 là bản cuối, được review trước khi tag.

---

## 1. Kế hoạch so với thực tế (bằng chứng trên `v22-engine` @ `fa36651`)

### 1.1 Thang trạng thái

| Ký hiệu | Nghĩa |
|---|---|
| **—** | Chưa có |
| **N** | Nội dung có trên nhánh |
| **T** | Parse + có test Node |
| **U** | Nối vào UI |
| **E** | e2e đi qua |
| **P** | Đã phát hành (tag + live) |

Hiện không mục Engine nào ở mức **P**.

### 1.2 Số đếm nội dung (đếm bằng `grep` frontmatter)

| Engine | L1 | L2 | L3 | L4 | L5 | Tổng | `runtime: docs` | Capstone | Bài có `viz` | Kế hoạch cũ |
|---|---|---|---|---|---|---|---|---|---|---|
| PostgreSQL | 12 | 17 | 15 | 16 | 15 | **75** | 17 (L1 3, L2 1, L3 5, L4 5, L5 3) | 5/5 | 48 | 66 + 5 capstone |
| MongoDB | 11 | 15 | 17 | 12 | 10 | **65** | 35 (L1 1, L2 4, L3 15, L4 7, L5 8) | **3/5** (không có L3, L4) | 15 | 60 + 5 |
| DynamoDB | 11 | 12 | 11 | 14 | 7 | **55** | 21 (L1 3, L2 5, L3 3, L4 5, L5 5) | 5/5 | 13 | 53 + 5 |

**Thêm ngoài kế hoạch:**

- Lộ trình NoSQL MongoDB: `content/engine/mongodb/path/`, 12 Phần, 42 kỹ năng, 168 drill; đã nối ở L250.
- Best Practice: 40 thẻ (sql 18, postgres 10, mongodb 6, dynamodb 6) + `tracks.yml`. `main` có thêm 32 thẻ (vòng 6, `48e88c3`), tổng 72.
- `interview-bank.yml`: 15 câu × 4 bậc × 3 engine = 180 câu, cộng 6 take-home.
- `glossary.yml`: 231 mục.

**Predict:**

- Postgres có 16 khối `predict`, trong đó 8 có `expect`.
- `expect` chỉ được kiểm ở `scripts/e2e.mjs` (dòng 998–1003). Không test Vitest nào kiểm.

### 1.3 Theo từng luồng của roadmap cũ

| Ver. cũ | Luồng | Mức | Bằng chứng / ghi chú |
|---|---|---|---|
| v22 | R (v21) | ✅ live | `review-v21.md` phần Post-release (trên `main`, `21a7b79`): U1–U3, E1, U16, U19, R21-U1…U6 đã giữ trên live. Còn mở P2-1, P2-2, P3-1…P3-7 |
| v22 | E-FND | **E** | `#/engine…` routes, nav `mergeInto: 'learn'`, `ENGINE_ID`, khối `#/me` (L220) |
| v22 | E-UI | **E** | `src/ui/engineView.ts` (686 dòng), `src/engine/content.ts`, `src/i18n/engine.ts` |
| v22 | E-WS | **U, khác thiết kế** | Lab chạy ngay trên trang bài (`labView`), không phải session mode `engine` trong workspace. Chưa có `bossStep`. Câu hỏi Q-C1 của `engine-ux-spec.md` §11 chưa chốt |
| v22 | PG-RT | **E, khác thiết kế** | Dùng một PGlite riêng `src/engine/pglab/pglabWorker.ts` (L230), không dùng schema `engine` trong DB game |
| v22 | E-VIZ | **E** | 27 tên đăng ký (`src/engine/viz/*`), nội dung dùng 20. `pg-query-path` chưa có sơ đồ (L252) |
| v22 | C-PG1 | **E** | 12 bài |
| v22 | SPIKE | ✅ | L253: ES1 GO (Node). Chưa đo RAM ở 375. ES2/ES3 xem §2 |
| v22 | QA | **T, chưa gộp** | `scripts/ux-audit.mjs` ở nhánh `v22-qa-audit`: 25 serious trên `v22-engine` local, 0 trên live v21. Smoke vẫn chưa nghe `Log`/worker (P2-1) |
| v22 | V22-E, A, B, C | **E** | L201–L210 |
| v23 | PG-EXT | **E** | Extension nạp theo lab trong pglab (L249). 6 contrib + walinspect/amcheck/pg_stat_statements |
| v23 | E-PRED | **U, mỏng** | `realPlan()` chỉ hiện sau khi đoán đúng, in dạng `<pre>` thụt lề, không vẽ `pg-plan-tree`, không so với `expect` trên màn hình |
| v23 | E-VIZ gin/brin/gist | **E** | `pg-gin-postings`, `pg-brin-ranges`, `pg-gist-boxes` |
| v23 | C-PG2 | **E** | 17 bài |
| v24 | PG-HB, E-INSIDE | **E** | Mỗi lab dựng DB mới + setup ngoài transaction (L249). `src/engine/inside.ts` vẽ trang heap từ dòng thật |
| v24 | E-VIZ heap/mvcc/hot/vacuum/wal | **E** | `pg-heap-page`, `pg-mvcc-timeline`, `pg-hot-chain`, `pg-vacuum-flow`, `pg-wal-flow` |
| v24 | C-PG3, C-PG5, C-MG12 | **E** | 15 / 15 / 11 + 15 bài |
| v25 | C-PG4 | **E, thiếu `recorded`** | 16 bài. Bài D (L4/10–13) chỉ có văn xuôi. Không có `scripts/capture-pg.md` |
| v25 | E-VIZ partition/locks/isolation | **một phần** | Có `pg-lock-matrix`, `pg-isolation-anomalies`. **Không có** `pg-partition-prune` |
| v25 | E-BP | **N** | 40 thẻ (72 trên `main`), chưa parse, chưa có route `#/engine/best`. `ENGINE_ID` chưa nhận `e-bp-` |
| v25 | MG-RT | **E** | L240–L242, L250 |
| v26 | E-VIZ `pg-replication` | **—** | Không có trong registry |
| v26 | E-LINK | **một phần** | Có khối `#/me`. Không có chip "Đào sâu" Domain/General → Engine (`brief.ts`, `learnView.ts` không nhắc `#/engine`). Lily không reo khi xong capstone |
| v26 | QA-PG | **E, chưa giải mù** | e2e 195/195. Không có biên bản giải mù (thiết kế §8.4) cho cấp nào |
| v26 | MG-UI | **một phần** | `src/engine/mongo/editor.ts` tô màu bằng `StreamLanguage` (không cần `lang-javascript`, nên D-E6' không còn cần). Không có tab "Pipeline từng bước", không có "So với SQL" |
| v26 | V22-D | **—** | Không có L211–L212 |
| v27 | C-MG12, MG-WIRE, `mg-pipeline`, DY-RT, C-DY | **E** | L245–L246, L250–L251 |
| v28 | C-MG35 | **E, rỗng phần chạy** | L3 có 15/17 bài là docs. Thiếu capstone L3, L4. Không có explain ghi sẵn |
| v28 | `mg-esr`, replica, sharding | **E** | Có trong registry |
| v28 | QA-MG | **một phần** | Luật ESR/covered ở `src/engine/mongo/path.ts` + `tests/mongoPath.test.ts`. Không có bộ golden mingo ↔ `mongod` |
| v29 | C-DY, `dy-*` | **E** | 55 bài, `dy-partitions-hash`, `dy-gsi-projection`, `dy-single-table-items` |
| v29 | DY-UI | **một phần** | Lab hiện `scannedCount/count/consumedCapacity` (`engineView.ts:358`). Không có tab Partition/Chi phí. Không có dòng "tải 1,3 MB" |
| v29 | BP Dynamo | **N** | 6 thẻ |
| v30 | E-CMP, QA-ALL | **—** | |
| v30 | DOC | **một phần** | `CLAUDE.md` của worktree đã có mục Database Engine |

---

## 2. Khoảng trống thật (việc còn lại)

### G1. Phát hành và cổng review chưa từng chạy cho Engine

- Chưa có tag `v22`, chưa có `review-v22.md`.
- `scripts/ux-audit.mjs` chưa gộp (nhánh `v22-qa-audit`). 25 lỗi serious của nó trên `v22-engine` chưa sửa.
- Smoke chỉ nghe `console`, không nghe `Log` hay worker (P2-1 của review v21 live: `libpg-query.wasm` 404).
- Chưa đo RAM và thời gian boot của hai PGlite ở 375 (điều kiện để ES1 thành GO trên trình duyệt).

### G2. Khu Best Practice chưa có giao diện

- 40 thẻ trên `v22-engine`. `main` có 72 thẻ, đủ cả 60 mục v25 (vòng 6).
- Catalogue §14.2 (bản trên `main`, `4cb89fe`) đã chốt: đợt v25 có 60 mục (30 SQL + 30 PostgreSQL); đợt Mongo có 31 + 38; đợt Dynamo có 31 + 32. Tổng 192.
- Chưa có:
  - parser ADD-8;
  - route `#/engine/best`;
  - "Chạy cả hai";
  - Boon nhắc (10 luật lint, `product-design-best-practice.md` §5);
  - hàng "Lỗi hay gặp" (§13.4);
  - trang "8 thói quen" (§14.3).
- `ENGINE_ID` phải nhận `e-bp-…`, nên phải chạm `src/save.ts`.

### G3. Ngân hàng phỏng vấn Engine chưa có giao diện

- 180 câu: `concept`, `diagnose` có exhibit, `design` có tradeoffs.
- 6 take-home, mỗi cái có rubric.
- Exhibit `pglite-0.5.16` chạy lại được trên pglab.
- Id `e-iv-…` không bao giờ vào Save, như `g-iv-`.

### G4. Bảng thuật ngữ chưa có giao diện

- 231 mục, mỗi mục có `vi_term`, `keep_en`, `avoid`, `doc`.
- Hiện chỉ dùng làm chuẩn cho người viết.
- Content QA còn ghi thiếu khoảng 20 thuật ngữ, ví dụ: positional operator, collation, write conflict, resume token, access pattern ("mẫu truy cập").

### G5. `predict` "Xem thật" chưa đúng thiết kế (`engine-ux-spec.md` §5.4, thiết kế §3.3)

- Chưa xem được kế hoạch khi đoán sai.
- Kế hoạch là chữ, chưa vẽ bằng `pg-plan-tree`, chưa tô viền nút trả lời.
- Không có câu quan sát.
- `why` chưa hiện sau khi xem.
- 8/16 predict chưa có `expect`. Vitest không kiểm `expect`.
- MongoDB và DynamoDB predict không có "Xem thật": cần `recorded`, hoặc `ConsumedCapacity` thật của dynoxide.

### G6. Capstone

- Chưa có giao diện capstone theo spec §5.6:
  - thanh bước dính;
  - khối "Chấm bằng" cập nhật sau mỗi lần Nộp;
  - kế hoạch Trước/Sau;
  - Lily reo + `doneBadge()`.
- MongoDB L3, L4 không có capstone (ADD-7).
- Luật chuyển giao (pedagogy §3.5: bảng khác, có bước "có nên làm không") chưa đạt ở PG L3, DY L3, MG L2, PG L1.

### G7. So sánh ba engine

Chưa có gì:

- trang "Chọn engine nào";
- một bài toán chạy trên ba runtime;
- "So với SQL" cho MongoDB và DynamoDB.

### G8. MongoDB: output ghi sẵn và độ thật

- Không có trường `recorded`. Parser (`src/engine/content.ts`) không đọc nó. 19 file chỉ nói "ghi sẵn" trong văn xuôi.
- Lỗi ES2 §2.3 (`$out`/`$merge` làm bẩn dữ liệu đã cache, `src/engine/mongo/engineMongo.ts:123`) đã sửa ở nhánh `v22-nosql-fix` (L254), **chưa gộp** vào `v22-engine`.
- Chưa có bộ golden mingo ↔ `mongod`.
- Ghi sẵn thật cần một `mongod` chạy ngoài app, do người chạy theo script. Nếu không có `mongod`, chỉ được dùng nhãn "trích tài liệu" (như exhibit `mongodb-docs` của ngân hàng phỏng vấn), không ghi "chạy thật".

### G9. Mục chờ backend (D-E13: không làm backend trước v30, nên chỉ kiểm kê, không mở luồng)

| Engine | Mục | Hình thức trong vòng v30 |
|---|---|---|
| DynamoDB | `TransactWriteItems`, Streams, TTL (ES3 NO-GO, `UnsupportedOperation` ở cả 1.5.0 và 1.7.0); global tables, PITR, DAX, capacity thật | D + dòng BE. Giao dịch ghi dạy bằng `ExecuteTransaction` |
| MongoDB | index thật, `explain`/plan cache, collation, `$jsonSchema` (ES2 NO-GO: cần Ajv, một dependency mới), concern, transaction, change streams, replica set, sharding | Sơ đồ + `recorded`. `$jsonSchema` là **câu hỏi cho user** (§6), không phải luồng |
| PostgreSQL | nhiều phiên: khóa, deadlock, isolation/SSI (L4/10–13); replication, PITR, failover (L5/14) | Sơ đồ + `recorded`. pgvector được phép (D-E11) nhưng chưa làm: mục tùy chọn ở v29 |

### G10. Mục S của modern-web-audit

- Nâng `lib` lên ES2023 rồi dùng `toSorted`/`toReversed` (~23 chỗ, quét một lượt).
- Thêm `{ cause: e }` ở `src/engine/mongo/runner.ts:31–33`.
- Đo INP/long task bằng `SMOKE_PERF` trước khi đụng `rerender()`.
- Chờ Baseline, không làm trong vòng: `closedby`, anchor positioning, `commandfor`.

### G11. Phát hiện review còn mở

**Review v21 live:**

- P2-1: wasm 404, smoke không nghe `Log`.
- P2-2: tên nút nâng cao bị cắt ở 375/320.
- P3-1…P3-7, gồm P3-6: trang General vẫn seed domain.

**Review v21 Product:**

- Nhãn đối tượng cấp Engine: L1–L2 "DA cần", L3–L5 "đào sâu". `src/i18n/engine.ts` chưa có.
- Cầu nối DA ↔ Engine.

**Content QA, 38 + pass 2:**

- "Ý chính" quá 150 từ ở khoảng 25 bài MongoDB và DynamoDB.
- `why` chỉ giải thích lựa chọn đúng.
- Nháy kép trong mongosh.
- PartiQL `"Orders"`.
- `requires: []` ở DynamoDB L4/L5.
- Facts DynamoDB L2/10–11.

**Pedagogy:**

- Thiếu bài đối mặt: PG3, PG5, MG1, MG2, DY2, DY4; cộng PG4 (`count(*)`).
- F1–F3, F5, F7, F8, F10–F12 chưa làm hết.
- Chưa ghi lần chọn đầu của `predict` (§3.4) để Product đo.

### G12. Lệch thiết kế cần chốt

- **Q-C1:** lab ở trang bài hay ở workspace? Thực tế đang ở trang bài.
- **Danh mục sơ đồ:** §5 thiết kế khác registry. Ví dụ `pg-mvcc` so với `pg-mvcc-timeline`, `pg-partition-prune` chưa có.
- **Dải L cũ đã dùng lẫn:** L230, L235–L238, L240–L242, L245–L254 nằm trong dải v23–v26 cũ. Có trùng số: L220/L221 hai dòng, L196/L197 hai dòng. L253 sẽ trùng khi gộp `v22-qa-audit`: đổi dòng QA sang số trống khi gộp.

---

## 3. Giả định về v22 (cần người điều phối xác nhận)

Roadmap cũ không cần cờ ẩn vì "chưa phát hành thì chưa gộp". Giờ cả 195 bài đã gộp trên `v22-engine`, nên lối đó không còn.

**Giả định của bản này:** v22 phát hành **toàn bộ** Engine đang có, kèm nhãn trung thực. Không dựng cờ ẩn theo cấp.

**Lý do:**

- e2e đã đi 195/195;
- cờ ẩn là code mới cần test;
- người học thấy toàn bộ thang thì có ích hơn chờ tới v29.

**Điều kiện tag v22:**

1. Gộp `v22-qa-audit` và `v22-nosql-fix`.
2. `ux-audit.mjs` báo 0 serious trên bản build, tức đã sửa 25 lỗi.
3. Smoke nghe `Log` + worker; đo RAM ở 375.
4. Đóng P2-1, P2-2.
5. Chip nhãn trung thực (đang làm) đã commit.

**Phương án khác:** chỉ phát hành Postgres L1–L2 ở v22. Cách này cần một luồng thêm cờ ẩn theo cấp trong `engineSources.ts` và mục lục, và dời v23–v26 theo. Người điều phối chọn một trong hai, rồi ghi vào dòng L đầu tiên của v22.

v22 không thuộc phạm vi bản này: §4 bắt đầu từ v23 và giả sử v22 đã tag theo giả định trên.

---

## 4. Kế hoạch v23 → v30

### 4.1 Luật chung (giữ L216, L217, L218)

1. **Vòng mỗi version:**
   1. gộp ở local qua cổng (`roadmap-v22-v30.md` §2);
   2. push, deploy, tag `vNN`;
   3. UI/UX review bản live (`node scripts/ux-audit.mjs <url>` + `ux-deploy-checklist.md`) và Product nhìn lại, cùng ghi vào `docs/team/review-vNN.md`;
   4. P1/P2 thành **luồng R của version sau** và làm trước mọi việc mới. Một version chỉ xong khi đã có `review-vNN.md`.
2. **Tối đa ~10 luồng build** trong worktree code mỗi version. Các luồng không build (nội dung chỉ kiểm bằng Node, giải mù, research, review) không tính vào trần.
3. **File một chủ mỗi version.** Luồng mới thêm file mới. Các file nút cổ chai ở §5 chỉ có một chủ, và chủ đó gắn hook (một dòng) cho luồng khác.
4. **Không viết thêm cấp hay engine mới.** Nội dung mới chỉ được viết để lấp khoảng trống đã nêu ở §2.
5. **Postgres đủ trước** (L215). Từ v25, MongoDB chỉ được làm sâu khi `review-v23.md` có câu "Postgres đủ". Nếu chưa có câu đó, v24 mở bằng luồng R cho Postgres.
6. **Mọi điều kiện thoát** phải là một lệnh, hoặc một con số đếm được.

### 4.2 Một dòng mỗi version

| Ver. | Lát phát hành | Giá trị cho người học |
|---|---|---|
| **v23** | **Postgres đủ:** predict xem thật, capstone có thanh bước, giải mù L1–L5, cầu nối DA ↔ Postgres | Đoán trước, đo sau trên kế hoạch thật. Có lối từ việc DA sang bài đào sâu |
| **v24** | **Best Practice SQL + PostgreSQL** (60 mục) + Boon nhắc | Tránh SQL sai âm thầm ngay trên câu của chính mình |
| **v25** | **MongoDB đủ:** sửa runner, `recorded`, capstone L3/L4, editor + "Pipeline từng bước", BP Mongo | NoSQL tài liệu học thật, nhãn trung thực về phần ghi sẵn |
| **v26** | **DynamoDB đủ:** tab Partition/Chi phí, giao dịch bằng `ExecuteTransaction`, bài đối mặt DY2/DY4/DY6, BP Dynamo | Thiết kế khóa theo mẫu truy cập, thấy chi phí RCU/WCU |
| **v27** | **Thuật ngữ + phòng phỏng vấn Engine** | Tra từ ngay trong bài; luyện 180 câu + 6 take-home có rubric |
| **v28** | **So sánh ba engine + cầu nối DA hoàn chỉnh** | Chọn đúng engine cho một bài toán; DA biết lúc nào cần đào sâu |
| **v29** | **Hoàn thiện kỹ thuật:** hiệu năng, offline, ngân sách, mục S, pgvector (tùy chọn) | Nhanh và ổn định trên máy yếu và điện thoại |
| **v30** | **Bản cuối:** e2e toàn app, review trước tag, backlog | Không còn lỗi P1/P2 |

### v23: Postgres đủ

| Luồng | Nội dung | File (tách nhau) | Cỡ |
|---|---|---|---|
| **R** | `review-v22.md` P1/P2; mục moderate của `ux-audit.mjs` (vùng chạm 127); P3-1…P3-7 của review v21 nếu còn | theo phát hiện | M |
| **E-SHELL** | Chủ duy nhất của `engineView.ts`: gắn hook cho PRED và CAP; lối Q-C1 (giữ lab trên trang bài, ghi vào L) | `src/ui/engineView.ts`, `src/i18n/engine.ts` | S |
| **PRED** | Chủ `src/engine/content.ts` ở v23. "Xem thật" cho cả đoán đúng lẫn sai; vẽ `pg-plan-tree` từ `EXPLAIN (FORMAT JSON)`; viền nút trả lời; câu quan sát; `why` sau khi xem; ghi lần chọn đầu vào device pref `cargo-query/engine-first` (không vào Save, chỉ cho Product đo) | mới `src/ui/enginePredict.ts`, `src/engine/predict.ts`, `tests/enginePredict.test.ts`, `src/engine/content.ts` | M |
| **CAP** | Giao diện capstone §5.6: thanh bước dính, "Chấm bằng", kế hoạch Trước/Sau, Lily reo + `doneBadge()` | mới `src/ui/engineCapstone.ts` | M |
| **PG-C** | Nội dung: 8 predict thêm `expect` (hoặc ghi lý do, như L3/08); F1–F3, F5 (mô-đun `memory`); PG8; `why` nói vì sao lựa chọn sai nghe hợp lý; capstone L1/L3 theo luật chuyển giao | `content/engine/postgres/**` | L |
| **PG-VIZ** | `pg-query-path` (đang trống, L252), `pg-partition-prune`, `pg-replication` | `src/engine/viz/pgPlan.ts`, `pgStorage.ts` | M |
| **AUD-LINK** | Nhãn đối tượng mỗi cấp; chip "Đào sâu" từ ch11 lab index (Logistics) và từ General `explain_read`/`index_design` sang bài Postgres | `src/ui/brief.ts` (một dòng), `src/ui/learnView.ts` (một dòng), mới `src/ui/engineLink.ts` | S |
| **QA** | `scripts/e2e.mjs` phần engine: capstone theo bước, predict sai rồi xem thật; `ux-audit.mjs` thêm khối L (spec §10) | `scripts/e2e.mjs`, `scripts/ux-audit.mjs` | M |
| **BLIND** (không build) | Giải mù Postgres L1–L5: một agent chỉ thấy đúng trang người học. Mỗi bài không giải được thì thành một việc cho PG-C | biên bản `docs/team/blind-pg.md` | M |

**Thoát v23:**

- Cổng chung.
- `npx vitest run tests/enginePredict.test.ts`: 16/16 predict Postgres có `expect` khớp PGlite, hoặc có lý do ghi trong test.
- e2e: mọi bài Postgres (75 + bài mới của PG-C) đạt, gồm 5 capstone đi theo thanh bước.
- `blind-pg.md`: 0 lab không giải được.
- `review-v23.md` có câu "Postgres đủ" (hoặc danh sách việc còn thiếu).

### v24: Best Practice SQL + PostgreSQL

| Luồng | Nội dung | File | Cỡ |
|---|---|---|---|
| **R** | `review-v23.md` | theo phát hiện | S–M |
| **BP-T** | Parser ADD-8 (`engine: best`, `track`, `pair`, `avoid`, `lint`); `ENGINE_ID` thêm `bp` (không bump Save; test fixture); bộ nạp lười `bpsql`/`bppg`/`bpindex`; test chạy cặp trên PGlite | `src/engine/content.ts` (nhánh `best`), `src/save.ts` (một regex), mới `src/bestSources.ts`, `tests/bestContent.test.ts` | M |
| **BP-C** (không build) | Gộp 72 thẻ của `main` (đủ 60 mục v25, catalogue §14.2); soát lại cặp chạy trên PGlite; "Phiên bản (vòng 5)" cho các mục PG 19 đổi hành vi | `content/engine/best/{sql,postgres}/**`, `tracks.yml` | L |
| **BP-UI** | Route `#/engine/best/<track>`, lưới thẻ, trang mục, "Chạy cả hai", Kiểm nhanh, hàng "Lỗi hay gặp" (`gallery:` trong `tracks.yml`), trang "8 thói quen" | `src/route.ts` (một nhánh), mới `src/ui/engineBest.ts`, `src/i18n/best.ts` | M |
| **BP-LINT** | Boon nhắc: `bpLint.ts`, `bpTip.ts`, pref `cargo-query/bp-tips`; gắn một dòng trong `work.ts`; `EXEMPT` đo trên mọi Solution | mới `src/viz/bpLint.ts`, `src/ui/bpTip.ts`, `src/ui/work.ts` (một dòng) | M |
| **QA** | e2e phần `best`; ảnh 1280/1024/375/320 sáng/tối của `#/engine/best/sql` | `scripts/e2e.mjs` | S |

**Thoát v24:**

- 60 mục phát hành.
- `tests/bestContent.test.ts` xanh.
- Lint chạy trên mọi Solution, drill, bài học và lab Engine: 0 nhắc nhầm.
- `check-budget` có `bpsql`/`bppg`/`bpindex`, main ≤ +0,3 KB.

### v25: MongoDB đủ

| Luồng | Nội dung | File | Cỡ |
|---|---|---|---|
| **R** | `review-v24.md` (lint ồn: rút khỏi `LINT_ON`) | `src/viz/bpLint.ts`, … | S–M |
| **REC** | ADD-3: trường `recorded` `{ server, version, date, output }` trong parser; chip "Kết quả ghi từ …"; "Xem thật" cho predict Mongo đọc `recorded` | `src/engine/content.ts` (nhánh `recorded`), mới `src/ui/engineRecorded.ts` | M |
| **MG-CAP** (nội dung) | Capstone MongoDB L3 (index + ESR, chấm bằng luật ESR) và L4 (concern/transaction, quiz kết luận); MG1, MG2/F7, F8, F9 | chỉ file capstone mới + `L2/08-lookup.md`, `L2/11-embed-vs-reference.md`, `L2/13-schema-validation.md`, `L4/09-transactions.md` | L |
| **MG-CAPTURE** (không build, cần người có `mongod`) | `scripts/capture-mongo.md`: chụp `explain('executionStats')` thật cho các predict L3/L5. Không có `mongod` thì ghi nhãn "trích tài liệu" | `scripts/capture-mongo.md`, mọi file `kind: predict` của MongoDB L3–L5 (cả việc sửa văn trong đó) | M |
| **MG-UI** | Tab "Pipeline từng bước" (dùng `mg-pipeline`), "So với SQL" | mới `src/ui/engineMongo.ts` | M |
| **MG-ED** (nội dung) | QA còn mở: "Ý chính" ≤ 150 từ, `why` của lựa chọn sai, nháy đơn mongosh (chạy lại mingo), giọng "bạn", thuật ngữ thiếu | `content/engine/mongodb/**` trừ các file của MG-CAP và MG-CAPTURE | M |
| **BP-MG** | Track MongoDB: 38 mục M + 31 mục SQL/PG bổ sung (§14.2) | `content/engine/best/mongodb/**`, một dòng trong `src/bestSources.ts` | L |
| **QA** | e2e Mongo L1–L5 gồm 2 capstone mới; giải mù Mongo | `scripts/e2e.mjs`, `docs/team/blind-mg.md` | M |

**Thoát v25:**

- MongoDB có 5/5 capstone.
- Mọi predict L3/L5 có `recorded` hoặc nhãn "trích tài liệu", kiểm trong `tests/engineContent.test.ts`.
- e2e 67/67 bài Mongo.

### v26: DynamoDB đủ

| Luồng | Nội dung | File | Cỡ |
|---|---|---|---|
| **R** | `review-v25.md` | | S–M |
| **DY-UI** | Tab Partition/Chi phí (vẽ `dy-partitions-hash` từ khóa của lab, RCU/WCU thật từ `ConsumedCapacity`); dòng "tải 1,3 MB" + offline (runtime ngoài precache) | mới `src/ui/engineDynamo.ts` | M |
| **DY-C** (nội dung) | Bài đối mặt DY2 (GSI nhất quán cuối, thử `ConsistentRead`), DY4, DY6 (`Limit` + filter); thêm lab `TransactGetItems`/`ExecuteTransaction` thay docs khi chạy được; PartiQL `"Orders"`; `requires`; facts L2/10–11 | `content/engine/dynamodb/**` | L |
| **DY-PERF** | Đo lab Dynamo mở ở 375, lần ấm ≤ 5 s; trần `dynamo` 1300 KB giữ (D-E12) | `scripts/smoke.mjs` (`SMOKE_PERF` phần engine) | S |
| **BP-DY** | Track DynamoDB: 32 mục D + 31 mục vận hành PG (§14.2) | `content/engine/best/dynamodb/**`, `content/engine/best/postgres/**` (chỉ file mới) | L |
| **QA** | e2e Dynamo; giải mù Dynamo | `scripts/e2e.mjs`, `docs/team/blind-dy.md` | M |

**Thoát v26:**

- e2e 55+/55+ bài Dynamo.
- Số đo 375 ghi trong `review-v26.md`.
- Mọi bài `runtime: docs` của Dynamo có dòng BE theo spike §3.2.
- Best Practice đủ 192 mục.

### v27: Thuật ngữ và phòng phỏng vấn Engine

| Luồng | Nội dung | File | Cỡ |
|---|---|---|---|
| **R** | `review-v26.md` | | S–M |
| **GLO** | Chunk lười đọc `glossary.yml` (YAML → JSON lúc build, L201); trang `#/engine/terms` có lọc theo engine và cấp; lần đầu một từ xuất hiện trong bài thì có nút giải thích (`<button>` + popover, không `title`); thuật ngữ thiếu theo content QA | mới `src/engine/glossary.ts`, `src/ui/engineTerms.ts`, `content/engine/glossary.yml` | M |
| **IV** | Route `#/engine/interview` qua hook của GLO (chủ `src/route.ts` ở v27). Phòng phỏng vấn Engine: theo mẫu `#/learn/interview` (L144), 0 XP, kết quả ở pref `cargo-query/engine-interview` (không vào Save); exhibit `pglite-0.5.16` chạy lại trên pglab; take-home tự chấm bằng rubric; khối `#/me` | mới `src/engine/interviewBank.ts`, `src/ui/engineInterview.ts`, `src/i18n/engineInterview.ts` | L |
| **IV-T** | Test: mọi exhibit `pglite` chạy lại ra đúng `shown`; id `e-iv-` bị `parseSave` bỏ | `tests/engineInterview.test.ts`, `src/save.ts` (một regex) | M |
| **QA** | e2e: một bộ câu mỗi engine + một take-home; axe cho hai trang mới | `scripts/e2e.mjs`, `tests/engineAxe.test.ts` | S |

**Thoát v27:**

- 231+ thuật ngữ có trang.
- 180 câu + 6 take-home mở được.
- `tests/engineInterview.test.ts` xanh.
- `review-v27.md` đo người học có dùng nút thuật ngữ hay không, qua pref đếm (không SQL, không Save).

### v28: So sánh ba engine và cầu nối DA

| Luồng | Nội dung | File | Cỡ |
|---|---|---|---|
| **R** | `review-v27.md` | | S–M |
| **E-CMP** | Trang "Chọn engine nào" `#/engine/compare`: một bài toán (cửa hàng: đơn, khách, báo cáo tuần) giải trên ba runtime, đặt cạnh nhau; một `quiz` + một `capstone` so sánh (id `e-pg-cmp-…`, theo `ENGINE_ID`) | mới `src/ui/engineCompare.ts`, `content/engine/compare/**` | L |
| **CMP-SQL** | "So với SQL" cho DynamoDB (Query ↔ `WHERE` trên khóa); dùng lại khung của MG-UI | mới `src/ui/engineDynamoSql.ts` | M |
| **RECALL** (nội dung) | Capstone cấp N+1 gọi lại một câu của cấp N (pedagogy §3.6) ở cả ba engine | `content/engine/*/L*/**capstone*` | M |
| **LINK** | Cầu nối hoàn chỉnh: chip "Đào sâu" từ E-com/Finance (ch có index/plan) sang bài Engine; Best Practice chip trên trang kỹ năng General | `src/ui/engineLink.ts` (của v23), `src/ui/learnView.ts` (một dòng) | S |
| **QA** | e2e trang so sánh trên ba runtime | `scripts/e2e.mjs` | S |
| **V22-D** (nếu `review-v27.md` còn cần) | Biến thể + bộ đề DA mới (L211–L212 chưa dùng) | như `roadmap-v22.md` | M |

**Thoát v28:**

- Capstone so sánh chạy trên ba runtime trong e2e.
- Mọi capstone (trừ L1) có ít nhất một câu gọi lại cấp trước (đếm trong `tests/engineContent.test.ts`).

### v29: Hoàn thiện kỹ thuật

| Luồng | Nội dung | File | Cỡ |
|---|---|---|---|
| **R** | `review-v28.md` | | M |
| **MW** | ES2023: `lib` + `toSorted`/`toReversed` (một lượt, ~23 chỗ); `{ cause }` ở `mongo/runner.ts` | `tsconfig.json`, các file trong danh sách của audit | S |
| **PERF** | `SMOKE_PERF=3` gồm trang Engine; chỉ sửa khi long task > 50 ms; RAM hai PGlite ở 375 sau 30 phút dùng | `scripts/smoke.mjs` | M |
| **BUDGET** | Xét lại các nhóm lớn: `engineMongoPath` 72/80 KB, `pglab` 150, `engineLesson` mỗi file 8 | `scripts/check-budget.mjs` | S |
| **OFF** | Offline cho Engine: nói rõ runtime nào cần mạng lần đầu; precache tùy chọn khi người học bấm "Tải để học offline" | `public/sw.js`, mới `src/ui/engineOffline.ts` | M |
| **PGV** (tùy chọn, D-E11) | pgvector trong pglab + một bài L2 `search`; bỏ nếu vượt trần | `src/engine/pglab/*`, `content/engine/postgres/L2/**` | M |
| **A11Y** | `ux-audit.mjs` đủ matrix cho mọi trang Engine; spec §9 (bàn phím, focus, văn bản thay thế của sơ đồ) | `scripts/ux-audit.mjs`, `tests/engineAxe.test.ts` | M |

**Thoát v29:**

- `tsc`, toàn bộ test, budget xanh.
- `perf-report.json` có các trang Engine.
- `ux-audit.mjs` 0 P1/P2 trên live.

### v30: Bản cuối

| Luồng | Nội dung | Cỡ |
|---|---|---|
| **R** | `review-v29.md` | M |
| **QA-ALL** | e2e toàn app (3 domain, General, Engine 195+, Best Practice, phỏng vấn), axe, `ux-audit.mjs` đủ matrix | M |
| **DOC** | `CLAUDE.md` mục Engine cập nhật; `review-v30.md` liệt kê backlog: ADD-6 Leitner cho Engine, backend Python (D-E13), `$jsonSchema`, Streams/TTL, golden `mongod`, PG 19 khi PGlite có | S |

**Thoát v30:**

1. Deploy lên live, chạy checklist, viết `review-v30.md`.
2. Sửa ngay trong v30 mọi P1/P2.
3. Tag `v30`. P3 vào backlog. Vòng dừng (L215).

---

## 5. Chủ file cổ chai (mỗi version một chủ)

| File | v23 | v24 | v25 | v26 | v27 | v28 | v29 |
|---|---|---|---|---|---|---|---|
| `src/ui/engineView.ts` | E-SHELL | BP-UI (một hook) | REC (một hook) | DY-UI (một hook) | GLO (một hook) | E-CMP (một hook) | A11Y |
| `src/engine/content.ts` | PRED | BP-T | REC | — | — | E-CMP | — |
| `src/i18n/engine.ts` | E-SHELL | BP-UI | MG-UI | DY-UI | GLO | E-CMP | A11Y |
| `src/save.ts` | — | BP-T | — | — | IV-T | — | — |
| `src/ui/work.ts` | — | BP-LINT | — | — | — | — | — |
| `src/route.ts` | — | BP-UI | — | — | GLO | E-CMP | — |
| `scripts/e2e.mjs` | QA | QA | QA | QA | QA | QA | — |
| `scripts/check-budget.mjs` | mỗi luồng nối một dòng; người điều phối gộp xung đột | | | | | | BUDGET |

Luồng khác cần chạm một file trong bảng thì nhờ chủ của version đó gắn hook. Không sửa song song.

---

## 6. Câu hỏi cho user (không trả lời thì làm theo khuyến nghị)

| # | Câu hỏi | Khuyến nghị | Nếu không trả lời |
|---|---|---|---|
| R1 | v22 phát hành toàn bộ Engine (§3) hay chỉ Postgres L1–L2? | Toàn bộ, có nhãn trung thực (nhãn đối tượng ở v23) | Toàn bộ |
| R2 | Thêm Ajv để `$jsonSchema` chạy thật? | Không: giữ docs + sơ đồ, đúng ES2 | Không |
| R3 | pgvector (D-E11)? | Tùy chọn ở v29, bỏ nếu vượt trần | Bỏ |

---

## 7. Dải số L

L255 là dòng ghi bản sửa này (L254 đã dùng ở nhánh `v22-nosql-fix`). Các dải L228–L271 cũ bỏ, vì các dòng Engine đã dùng lẫn chúng. Dòng nào đã có thì giữ số.

| Dải | Version |
|---|---|
| L255 | Roadmap sửa sau khi build Engine (tài liệu này) |
| L256–L260 | v23 |
| L261–L265 | v24 |
| L266–L270 | v25 |
| L271–L274 | v26 |
| L275–L278 | v27 |
| L279–L282 | v28 |
| L283–L286 | v29 |
| L287–L290 | v30 |
| L291–L295 | Dự phòng; cũng dùng cho số đổi khi gộp `v22-qa-audit` (L253 trùng) |

Số trùng cũ (L196, L197, L220, L221 mỗi số hai dòng) giữ nguyên. Khi nhắc tới một trong các số đó, ghi kèm tiêu đề dòng.

## 8. Rủi ro

| Rủi ro | Giảm |
|---|---|
| Phát hành 195 bài một lần thì review v22 quá lớn | Review theo engine, ưu tiên Postgres L1–L2 (đối tượng DA). P3 của Mongo/Dynamo dời sang v25/v26 |
| Không có `mongod` để ghi `recorded` | Nhãn "trích tài liệu", không ghi "chạy thật". Golden mingo ↔ `mongod` vào backlog |
| Hai PGlite quá nặng ở điện thoại | Đo ở v22 (G1). Nếu vượt: pglab chỉ boot khi mở lab, và tắt sau khi rời `#/engine` |
| `engineView.ts` thành nút cổ chai | Bảng §5; luồng mới luôn thêm file riêng |
| R ăn hơn 1/3 sức version | Cắt luồng nội dung của version đó trước, không cắt R và QA |
