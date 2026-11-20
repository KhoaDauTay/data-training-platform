# Content QA: Database Engine (content/engine/**)

Người làm: agent Content QA · 2026-11-20 · nhánh `content-qa` (từ `v22-engine` + merge `main` lấy docs). Chỉ sửa nội dung, không code, không build (L218).

**Phạm vi:** mọi file dưới `content/engine/{mongodb,dynamodb,postgres}/**`: Postgres L3 (15 bài + `modules.yml`; L1–L2, L4–L5 chưa có trên nhánh), MongoDB L1–L5 (65 bài + `modules.yml` + `path/*.yml`), DynamoDB L1–L5 (55 bài + `modules.yml`), cộng `glossary.yml`.

**Chuẩn đối chiếu:** `content/engine/glossary.yml`, `docs/team/engine-writing-style.md`, `engine-pedagogy.md`, `product-design-db-engine.md` v2, `engine-ux-spec.md`, decision-log L215–L219.

**Cách làm:**
- Một script quét (thuật ngữ `avoid` theo engine, "khóa" cho lock, "giao dịch", số VI/EN, %, đơn vị, mili giây, từ cấm, dấu tiếng Việt trong EN, code span VI = EN, `answer` trong khoảng, concept có quiz, tên `viz`, `title`, `runtime`, `modules.yml`).
- Đọc từng bài: chú thích lần đầu, nhãn runtime trung thực, đoán trước khi chạy, lựa chọn sai = hiểu lầm thật (pedagogy §2), `why` khớp đáp án (chỉ số từ 0).

**Bất biến đã kiểm:**
- `setup`, `solution`, `check`, `predict.sql`, `expect`, `recorded` và `answer` của mọi câu có sẵn **không đổi**. Đã so frontmatter đã parse với `HEAD`: 5 file khác, đều chỉ vì **thêm** câu quiz mới (dynamodb L1/11, L2/12, L3/07, L3/11; mongodb L2/08), nên không cần chạy lại PGlite / mingo / dynoxide.
- Mọi file YAML vẫn parse được.

**Quy ước đã chốt khi review:**
- Chữ "later" tiếng Anh thường thì được dùng (test chỉ cấm "later batch", "coming soon", "sắp có", "đợt sau").
- `ms` nêu như một sự thật (epoch của Date, MongoDB chờ lock 5 ms, DAX) thì được; chỉ cấm dùng làm bằng chứng hay tiêu chí chấm.
- "khóa bảng" / "khóa index" nghĩa là key thì đúng.

## Đã sửa (138)

| File | Rule | Note |
|---|---|---|
| postgres/L3/*, mongodb/L1–L2/* | viz kebab-case + engine prefix | heap-page→pg-heap-page, mvcc-timeline→pg-mvcc, hot-chain→pg-hot, vacuum-flow→pg-vacuum-vm, wal-flow→pg-wal, aggregation-pipeline→mg-pipeline, bson-doc→mg-bson-doc (14 files; no code referenced the old names) |
| postgres/L3/* (15), mongodb/L1–L2/* (26) | runtime field (style §4) | added `runtime:`: `browser` for lab/predict/capstone (every graded step runs on PGlite / mingo), `docs` for concept/quiz without a lab (41 files) |
| mongodb/modules.yml | modules.yml after-lines / ADD-1 shape | L1–L2 entries got `module` + `title`; every `after` now continues "Học xong bạn làm được…" (lowercase start, no final period, like postgres and product design §4); `explain("executionStats")` in backticks |
| dynamodb/modules.yml | modules.yml after-lines + glossary | after-lines without final period; "Chỉ mục phụ"→"Index phụ"; "Giao dịch"→"Transaction"; "GSI thưa"→"sparse GSI", "GSI dùng chung"→"GSI overloading"; "đọc giao dịch"→"đọc trong transaction"; `ConsumedCapacity`/`TransactGetItems` in backticks (VI = EN) |
| content/engine/glossary.yml | glossary vs product design | `access pattern`: keep_en false, vi_term "mẫu truy cập" (product design §4 and every lesson use it; product design outranks the glossary per style doc) |
| content/engine/glossary.yml | glossary-missing | new entry `optimistic locking` (keep_en true, avoid "khóa lạc quan"), used in dynamodb L2/04 and L2/12 |
| mongodb/L3/13-special-indexes.md | glossary | "tài liệu lồng"→"tài liệu nhúng (embedded document)" |
| postgres/L3/*.md (5 files: 04,05,09,10,11) | glossary-avoid (transaction) | "giao dịch" -> "transaction" in all VI prose (32 occurrences) |
| postgres/L3/01-heap-page.md | concept opens with question | Added opening question; "trang (page)" first-use gloss; heap explained ("Bảng là một heap: …"); tuple glossed as "một phiên bản của một dòng" (VI+EN) |
| postgres/L3/02-page-anatomy-lab.md | number VI percent | "2%" -> "2 %" (VI fact) |
| postgres/L3/03-toast-lab.md | numbers / units | VI "100000" -> "100.000", EN "100,000"; "2 kB" -> "2 KB" (VI+EN) |
| postgres/L3/03-toast-lab.md | predict-before-run | Step 1 task asks "which row takes the fewest bytes?" before running |
| postgres/L3/04-mvcc.md | concept opens with question | Added "UPDATE một dòng 1 lần, bảng có thêm mấy phiên bản?" + tuple gloss (VI+EN) |
| postgres/L3/04-mvcc.md | lock-as-khóa | "người đọc không phải khóa" -> "không cần lock"; "chỉ khóa dòng" -> "chỉ giữ row lock trên dòng" |
| postgres/L3/04-mvcc.md | isolation level casing | REPEATABLE READ / READ COMMITTED -> Repeatable Read / Read Committed in quiz prose (VI+EN) |
| postgres/L3/05-xmin-xmax-lab.md | lock-as-khóa | objective "chỉ là khóa dòng" -> "chỉ giữ row lock"; step 0 "khóa tài khoản 3" -> "giữ row lock trên tài khoản 3"; step 3 fact "khóa của FOR UPDATE" -> "row lock của FOR UPDATE" |
| postgres/L3/05-xmin-xmax-lab.md | first-use gloss | Ý chính now defines `xmin`/`xmax` (file did not explain them) |
| postgres/L3/05-xmin-xmax-lab.md | predict-before-run | Step 2 asks how many tuples the page keeps for 2 visible rows (task quoted for YAML) |
| postgres/L3/06-hot-vacuum.md | concept opens with question | Added opening question (two tables, one bloats) |
| postgres/L3/06-hot-vacuum.md | glossary (dead tuple, wraparound, tài liệu) | "tuple chết"/"dòng đã chết" -> "dead tuple"; "XID quay vòng" -> "XID wraparound"; "theo tài liệu" -> "theo docs chính thức" |
| postgres/L3/07-hot-vs-non-hot-lab.md | predict-before-run | Step 2 asks how many PK index entries for 5 rows before running |
| postgres/L3/08-fillfactor-predict.md | number VI percent | "30%"/"40%" -> "30 %"/"40 %" (VI) |
| postgres/L3/09-vacuum-vm-lab.md | lock-as-khóa | "khóa bảng suốt lúc chạy" -> "giữ lock `ACCESS EXCLUSIVE` trên bảng" (VI+EN code span added) |
| postgres/L3/09-vacuum-vm-lab.md | glossary dead tuple | "tuple chết" -> "dead tuple" with first-use gloss |
| postgres/L3/09-vacuum-vm-lab.md | predict-before-run | Steps 5 (Heap Fetches) and 6 (size after VACUUM, PG3) ask a guess before running |
| postgres/L3/10-freeze-lab.md | glossary wraparound / XID gloss | "XID chỉ 32 bit nên nó quay vòng" -> glosses XID and names wraparound |
| postgres/L3/10-freeze-lab.md | predict-before-run | Step 2 asks whether freeze overwrites `t_xmin` |
| postgres/L3/11-wraparound-quiz.md | title / glossary | title "XID quay vòng và rủi ro wraparound" -> "Rủi ro XID wraparound" |
| postgres/L3/11-wraparound-quiz.md | pedagogy wrong option | quiz[2] option "Thiếu index trên khóa chính" (nobody believes it) -> "Autovacuum chạy quá thưa; chỉ cần giảm `autovacuum_naptime`"; why now says why it sounds right (answer index unchanged) |
| postgres/L3/12-wal.md | banned "sự cố" | "sau sự cố" x2 -> "sau khi máy sập" |
| postgres/L3/12-wal.md | concept opens with question / first use | Added crash-after-COMMIT question, WAL (write-ahead log) gloss, "trang bẩn (dirty page)"; Ý chính kept ≤ 150 words |
| postgres/L3/13-wal-records-lab.md | predict-before-run | Step 3 asks which UPDATE record carries the full-page image |
| postgres/L3/13-wal-records-lab.md | glossary replication | "replication lag" -> "độ trễ nhân bản (replication lag)" |
| postgres/L3/14-buffers-workmem-lab.md | code-VI≠EN | EN step 0 reordered so `relforknumber = 0` precedes `big` as in VI |
| postgres/L3/14-buffers-workmem-lab.md | units / numbers | prose "128MB"/"4MB" -> "128 MB"/"4 MB"; "64 kB"/"424 kB" -> KB; fact "128MB = 16384" -> "`128MB` = 16.384" (EN 16,384) |
| postgres/L3/14-buffers-workmem-lab.md | glossary execution plan / dirty page | "kế hoạch" -> "kế hoạch thực thi (execution plan)"; "**bẩn**" -> "**trang bẩn (dirty page)**" with gloss |
| postgres/L3/14-buffers-workmem-lab.md | predict-before-run | Step 3 asks whether the sort fits in '64kB' |
| postgres/L3/15-capstone-bloat.md | lock-as-khóa / dead tuple | "VACUUM FULL khóa bảng" -> "giữ lock `ACCESS EXCLUSIVE`" (VI+EN); "tuple chết" -> "dead tuple" |
| mongodb/L1/01-documents.md | VI-number | quiz[2] q/why: 19.99 -> 19,99 in VI prose |
| mongodb/L1/01-documents.md | glossary (embedded document) | "tài liệu lồng" -> glossary vi_term "tài liệu nhúng" (first use already glossed "(embedded document)") |
| mongodb/L1/02-find-filter.md | glossary (embedded document) | "tài liệu lồng" -> "tài liệu nhúng (embedded document)" on first use, "tài liệu nhúng" after |
| mongodb/L1/03-projection.md | glossary (embedded document) | same as 02 |
| mongodb/L1/05-update-operators.md | glossary (atomicity) first use | "luôn atomic" -> "luôn nguyên tử (atomic)" |
| mongodb/L1/06-array-updates.md | glossary (atomicity) first use | "là atomic" -> "là nguyên tử (atomic)" |
| mongodb/L1/07-comparison-logic.md | numbers | task thresholds 50000/20000/60000/100000 put in code spans (values the learner types, same as L1/04 style); Practice range -> VI 15.000–350.000 / EN 15,000–350,000 |
| mongodb/L1/08-array-queries.md | code-VI≠EN order | step 0 EN reordered so `"gift"` comes before `tags` as in VI |
| mongodb/L1/08-array-queries.md | glossary (embedded document) | "tài liệu lồng" -> "tài liệu nhúng (embedded document)" |
| mongodb/L1/09-exists-type-regex.md | code-VI≠EN order | step 3 EN reordered (`tea` before `name`) as in VI |
| mongodb/L1/09-exists-type-regex.md | glossary (index) first use | "index" -> "index (chỉ mục)" |
| mongodb/L1/11-capstone-shop-day.md | glossary (atomicity) | objective "nguyên tử (atomic)" on first use, "nguyên tử" in quiz why and Ý chính; "tài liệu lồng" -> "tài liệu nhúng (embedded document)" |
| mongodb/L2/01-positional-updates.md | numbers/percent | "10%" -> "10 %"; `0.9` and `23000` in task text put in code spans; "atomic" -> "nguyên tử (atomic)" |
| mongodb/L2/02-pipeline-updates.md | glossary (atomicity) first use | "atomic trên mỗi tài liệu" -> "nguyên tử (atomic) trên mỗi tài liệu" |
| mongodb/L2/04-pipeline-concept.md | pedagogy (quiz wrong option) | quiz[1] option 2 "always wrong" (obvious) replaced by the real misconception "optimizer always moves every $match to the front"; why now says why it sounds plausible; "index (chỉ mục)" on first use |
| mongodb/L2/05-match-project.md | percent / field term | "8%" -> "8 %"; "cột tính sẵn" -> "trường tính sẵn"; EN "computed columns" -> "computed fields" |
| mongodb/L2/06-group-sort.md | numbers | threshold 100000 in task put in code span |
| mongodb/L2/07-unwind.md | pedagogy (predict before run) | Practice asks to predict whether empty-array order 9 survives a default `$unwind` before step 3 (VI+EN) |
| mongodb/L2/08-lookup.md | pedagogy MG2 / F7 | added quiz (answer 1): "$lookup drops a customer with no order like an INNER JOIN" as the wrong option; LEFT OUTER, always an array |
| mongodb/L2/09-facet-bucket.md | numbers | bucket bounds in task put in code spans; Practice range -> 25.000–450.000 / 25,000–450,000 |
| mongodb/L2/11-embed-vs-reference.md | pedagogy MG1 | Ý chính now states "Nhiều người nghĩ không bắt schema thì không cần thiết kế. Thật ra…" (VI+EN); quiz[0] why explains why the separate-collection option sounds plausible; "nguyên tử (atomic)" first use |
| mongodb/L2/12-reshape-model.md | glossary (embedded document) | "tài liệu lồng" -> "tài liệu nhúng (embedded document)" |
| mongodb/L2/13-schema-validation.md | versions | "(8.1)"/"(9.0)" -> "(MongoDB 8.1)"/"(MongoDB 9.0)" |
| mongodb/L2/14-merge-out.md | honest runtime | "bản chạy trong trình duyệt chỉ cho đọc" was wrong (labs do run writes, then discard them) -> "bỏ mọi thay đổi sau mỗi lần chạy", matching EN |
| mongodb/L2/15-capstone-weekly-report.md | numbers/dates | quiz why: 310000… -> 310.000 (VI) / 310,000 (EN); 19/10, Oct 19 -> 2026-10-19 (ISO, both) |
| mongodb/L2/15-capstone-weekly-report.md | field term | "cột"/"dòng tuần" -> "trường"/"tài liệu tuần" (VI), "columns"/"rows" -> "fields"/"documents" (EN) |
| mongodb/L3/13-special-indexes.md | glossary (embedded document) | still says "tài liệu lồng"; glossary vi_term is "tài liệu nhúng" → resolved by the coordinator in this commit |
| mongodb/L3-L5 (35 files) | glossary: "tài liệu" = MongoDB document only | ~90 VI uses of "tài liệu" meaning documentation -> "docs chính thức (của MongoDB)" (footers "Đúng với docs chính thức của MongoDB hiện hành", "Theo docs chính thức", "Docs chính thức:", "bài đoán theo docs chính thức…"); "tài liệu" = document kept. Script fixC-docs.mjs |
| mongodb/L3/06,07,14,15 | style §4 docs-quoted output | output intro rewritten to "Ví dụ trong docs chính thức của MongoDB (chưa chạy trong trình duyệt):" / "Example from the official MongoDB docs (not run in the browser):" |
| mongodb/L3/13-special-indexes.md | style §4 docs-quoted output | "Explain từ tài liệu MongoDB:" -> "Trong docs chính thức của MongoDB," (no output shown, so no label) |
| mongodb/L3-L5 (19 files) | glossary index first use | first VI-body "index" -> "index (chỉ mục)" (fixC-index.mjs) |
| mongodb/L4/07,09; L5/02 | glossary vi_term multi-document transaction | "transaction đa tài liệu" -> "transaction nhiều tài liệu" (incl. L4/09 title) |
| mongodb/L4/09-transactions.md | lock-as-khóa | "5 ms để lấy khóa" -> "để lấy lock" (5 ms is a stated limit, not evidence: kept) |
| mongodb/L5/02-predict-write-conflict.md | lock-as-khóa | wrong option "Collection bị khóa độc quyền" -> "bị giữ lock độc quyền"; EN "holds an exclusive lock" |
| mongodb/L4/07-concerns.md | banned word "sự cố" | "bền kể cả khi có sự cố" -> "bền kể cả khi primary sập"; EN "durable even if the primary fails" |
| mongodb/L4/07,08,09,10,11; L5/03,04,05,06 | style §4 BE line | "Bài này dùng sơ đồ…" replaced/extended with "Phần chạy thật cần máy chủ thật (nhiều phiên / replica set / AWS). Bài này dùng sơ đồ và kết quả ghi sẵn." EN "The real run needs a real server (several sessions / replica set / AWS). This lesson uses diagrams and recorded results." |
| mongodb/L5/10-capstone-store-ops.md | honest label (ESR) | added "câu đoán index chấm theo luật ESR, không phải `mongod`" / "graded by the ESR rule, not by `mongod`" |
| mongodb/L4/09-transactions.md | pedagogy MG5 + why explains the wrong option (F9) | quiz[0].why now says why "two fields change, so transaction" sounds right, then the atomic single-document rule and the extra cost of a multi-document transaction |
| mongodb/L5/05-sharding.md | fact | quiz[0].why "index kép để tăng cardinality" -> "shard key kép (nhiều trường)"; EN "compound key" -> "compound shard key" |
| mongodb/L3/06-predict-collscan.md, L3/11-lab-slow-log.md | numbers (thousands) | prose 21349 -> VI 21.349 / EN 21,349; explain JSON blocks unchanged |
| mongodb/L3/13-special-indexes.md | numbers VI decimal | "2.2, 2.3 và 2.9" -> "2,2; 2,3 và 2,9" |
| mongodb/L3/17-quiz-special-indexes.md | numbers VI decimal | "16.07"/"108.22" in VI prose -> "16,07"/"108,22" (code spans unchanged) |
| mongodb/L5/01-wiredtiger.md, L5/03-replica-set.md | numbers VI percent | "50%" -> "50 %", "5%" -> "5 %" |
| mongodb/L3/05-esr.md | code spans same order | EN sentence reordered so `a` `a` `b` order matches VI |
| mongodb/L3/16-predict-sparse-hint.md | code spans VI=EN | EN option 2 "cannot be hinted" -> "you cannot `hint()` a sparse index" |
| mongodb/path/drills-p7-12.yml | units (style §3: MongoDB limit in MiB) | "16 MB" -> "16 MiB" (document size limit, VI+EN, trap wrong text of modelling drill) |
| mongodb/path/lessons-p7-12.yml | units (style §3) | "16 MB" -> "16 MiB" in modelling concept and mistake (VI+EN) |
| mongodb/path/skills-p7-12.yml | units (style §3) | "16 MB" -> "16 MiB" in the embed trap (VI+EN) |
| mongodb/path/drills-p7-12.yml | glossary (field / dot notation: avoid "cột") | e-mg-d-full-like-4 hint: "cột cửa hàng/khách" -> "trường cửa hàng/khách", EN "column" -> "field" |
| dynamodb/L1/01-tables-items.md | first-use gloss | "thuộc tính (attribute)", "khóa chính (primary key)", "partition key (khóa phân vùng)" at first use |
| dynamodb/L1/02-primary-key.md | first-use gloss | khóa chính (primary key), khóa đơn (simple key), khóa kép (composite key), partition key (khóa phân vùng), sort key (khóa sắp xếp), partition (phân vùng vật lý) |
| dynamodb/L1/03-no-join-limits.md | first-use gloss | item collection explained at first use |
| dynamodb/L1/03-no-join-limits.md | numbers/ranges | EN ranges 1-2048, 1-1024, 3-255 now use the en dash like VI |
| dynamodb/L1/04-create-table.md | first-use gloss | partition key / sort key glossed; RCU/WCU explained at first use (VI + EN) |
| dynamodb/L1/05-get-item.md | glossary (eventual/strong) | VI uses "nhất quán cuối (eventually consistent)" / "nhất quán mạnh (strongly consistent)"; khóa chính (primary key); EN adds the same one-line explanation |
| dynamodb/L1/06-put-item.md | numbers in prose | 110000 / 90000 in tasks put in backticks (values the learner types; identical VI/EN) |
| dynamodb/L1/06-put-item.md | code-VI≠EN order | step 2 hint EN reordered to match VI span order |
| dynamodb/L1/06-put-item.md | predict-before-run | step 2 asks to guess whether `author`/`stock` survive the overwrite before running |
| dynamodb/L1/08-query.md | first-use gloss | partition key / sort key glossed in Ý chính |
| dynamodb/L1/09-query-vs-scan.md | predict-before-run (DY1) | step 2 asks to guess `ScannedCount` (4 or more) before running |
| dynamodb/L1/09-query-vs-scan.md | first-use gloss | partition key (khóa phân vùng); index (chỉ mục) |
| dynamodb/L1/11-capstone-order-desk.md | capstone closing quiz | added a conclusion quiz (Scan+COUNT "cheap" misconception DY1) built only from facts measured in the lab (`ScannedCount` 4 vs 120); answer 1 |
| dynamodb/L2/01-expression-kinds.md | pedagogy (wrong option = misconception) | option "No error at all" now voices the belief "literals work like SQL WHERE"; why explains why it sounds right |
| dynamodb/L2/02-key-vs-filter.md | predict-before-run (DY1) | step 1 asks to guess `ScannedCount` before running; quiz why explains why the wrong option sounds right; 500000 in backticks |
| dynamodb/L2/03-update-expressions.md | numbers / gloss | 12000 in backticks; "nguyên tử (atomic)" first use |
| dynamodb/L2/04-conditional-writes.md | lock-as-khóa | "khóa lạc quan" (lock rendered as khóa) -> "optimistic locking", with a first-use explanation of lost update |
| dynamodb/L2/04-conditional-writes.md | glossary-missing | "optimistic locking" has no glossary entry (used in L2/04, L2/12); suggest keep_en true, avoid "khóa lạc quan" → resolved by the coordinator in this commit |
| dynamodb/L2/04-conditional-writes.md | numbers / gloss | 99000/88000/92000 in backticks; WCU and nguyên tử (atomic) glossed; quiz why explains the "rejected write is free" belief |
| dynamodb/L2/05-counters-sets.md | glossary (atomic counter keep_en) | title and text use "atomic counter" (first use "atomic counter (bộ đếm nguyên tử)"); idempotent explained at first use; quiz why explains the misconception |
| dynamodb/L2/06-batch.md | glossary (throttle) | "giới hạn tốc độ" -> "throttle, tức bị giới hạn tốc độ"; 75000/82000 in backticks; quiz why explains the misconception |
| dynamodb/L2/07-partiql.md | first-use gloss / numbers | partition key glossed, index (chỉ mục), 260000 in backticks, quiz why explains the "WHERE means index" belief |
| dynamodb/L2/09-read-cost.md | glossary-avoid "giao dịch" | -> "transaction"; RCU expanded at first use; VI uses nhất quán mạnh/cuối instead of strongly/eventually consistent |
| dynamodb/L2/10-write-cost.md | glossary-avoid "giao dịch" | all -> "transaction" (objective, quiz q, why, body); WCU and GSI expanded at first use |
| dynamodb/L2/11-consistency.md | glossary (eventual/strong) | title and VI text use "nhất quán cuối / nhất quán mạnh"; nhân bản (replication); GSI/LSI expanded; both quiz whys explain the misconception (DY2 confronted at L2) |
| dynamodb/L2/12-capstone-bookshop.md | lock-as-khóa | "khóa lạc quan" -> "optimistic locking"; 64000/160000/150000 in backticks |
| dynamodb/L2/12-capstone-bookshop.md | capstone closing quiz | added a conclusion quiz on reading `ConditionalCheckFailedException` in step 3 (facts from L2/04); answer 1 |
| dynamodb/L3/01-access-patterns.md | glossary first-use (§2.1) | Body glosses "sort key (khóa sắp xếp)", "partition key (khóa phân vùng)", item collection; "chỉ mục phụ" -> "index (chỉ mục) phụ: GSI và LSI" (EN mirrored) |
| dynamodb/L3/02-lsi-gsi.md | glossary index / lock | Title "hai loại chỉ mục phụ" -> "index phụ"; body first use "index (chỉ mục) phụ"; quiz option "bảng gốc bị khóa" -> "đang bị giữ lock" |
| dynamodb/L3/02-lsi-gsi.md | Ý chính ≤ 150 words | Trimmed 154 -> 150 (two phrases), facts unchanged |
| dynamodb/L3/04-query-gsi.md | pedagogy why (DY2) | Quiz why now says why "strong read at twice the price" sounds plausible before giving the answer |
| dynamodb/L3/05-query-lsi.md | numbers VI/EN | 500000 in task and Practice prose -> VI 500.000 / EN 500,000 (request JSON untouched) |
| dynamodb/L3/07-single-table.md | pedagogy DY4 (F11/F13) | Added quiz 3: separate log table vs single-table (wrong option = "single-table luôn tốt hơn"), answer 1 (0-based) |
| dynamodb/L3/11-capstone-shop-design.md | capstone closing quiz (§1.2 capstone, ADD-7) | Added 2 closing quizzes: GSI Query vs filtered Scan (DY1) and "should you add a GSI for pattern 5?" (answer: no); answers 1 |
| dynamodb/L4/01-partitions.md | first-use gloss / honest runtime | "partition key (khóa phân vùng)", throttle explained on first use; "Bài 4 ... trên dữ liệu thật" -> "trong lab chạy bằng dynoxide" |
| dynamodb/L4/02-adaptive-capacity.md | glossary "tài liệu" | "Tài liệu AWS" -> "Docs chính thức của AWS" |
| dynamodb/L4/04-write-sharding.md | pedagogy predict why | why explains why "6, like the Query" sounds right (DY1) |
| dynamodb/L4/06-capacity-modes.md | glossary transaction | "giao dịch" -> "transaction" |
| dynamodb/L4/08-sparse-gsi.md | glossary index / sparse index / row-hàng | Title "chỉ mục" -> "index", "GSI thưa" -> "sparse GSI" (first use "(GSI thưa)"), "một mục" -> "item", "hàng `SHIPPING`" -> "hàng đợi" (queue, not row); predict why explains the plausible wrong option |
| dynamodb/L4/09-overloaded-gsi.md | glossary index / attribute / GSI overloading | Title and body "chỉ mục" -> "index"; "nhiều trường" -> "nhiều thuộc tính"; first use "**GSI overloading** (GSI dùng chung)" |
| dynamodb/L4/10-composite-sort-keys.md | glossary transaction | "dùng giao dịch, xem mô-đun Giao dịch" -> "dùng transaction, xem mô-đun về transaction" |
| dynamodb/L4/11-transactions.md | glossary transaction / "tài liệu" | All "giao dịch" -> "transaction"; "tài liệu AWS" -> "docs chính thức của AWS"; quiz 2 why explains the plausible wrong option |
| dynamodb/L4/12-transact-get.md | glossary transaction | "giao dịch" -> "transaction", "đọc giao dịch" -> "đọc trong transaction" |
| dynamodb/L4/13-transaction-cancel.md | glossary transaction / code VI=EN / why | Title + prose "giao dịch" -> "transaction"; EN code-span order fixed (`WHERE` before `UPDATE` as in VI); predict why explains the half-write misconception |
| dynamodb/L4/14-capstone-design.md | glossary sparse index | "GSI thưa" -> "sparse GSI" (first use glossed) |
| dynamodb/L5/01-streams.md | glossary transaction | "giao dịch" -> "transaction" |
| dynamodb/L5/02-ttl-filter.md | numbers ≥ 10.000 | Epoch `1795132800` put in backticks (literal value, identical VI/EN) |
| dynamodb/L5/03-global-tables.md | glossary transaction | "giao dịch" -> "transaction" |
| dynamodb/L5/06-dax.md | lock wording / why | "query cache bị khóa" -> "bị giữ lock"; quiz 1 why explains why "write-through" sounds right. "vài mili giây -> micro giây" kept: stated DAX fact, not evidence |
| dynamodb/L5/07-capstone-ops.md | glossary transaction / index / code VI=EN | "GSI thưa"/"chỉ mục" -> "sparse GSI"/"index"; "đọc/RCU giao dịch" -> transaction; epoch in backticks; EN hint now repeats `Get` span as in VI |
| dynamodb/modules.yml#transactions,#ops-case,#secondary | glossary transaction / index | Out of fork scope: title "Giao dịch", after-lines "giao dịch", "chỉ mục phụ" should become transaction / index → resolved by the coordinator in this commit |

## Còn lại (38)

| File | Rule | Note |
|---|---|---|
| mongodb/L1/01-documents.md | viz catalog | `mg-bson-doc` is not in the product design §5 first-wave list: add it to the catalog or switch the lesson to an existing diagram |
| mongodb L3, L4 | ADD-7: one capstone per level | MongoDB L3 and L4 have no capstone (L1, L2, L5 do). Needs new lessons, out of QA scope |
| postgres/L3/06-hot-vacuum.md | pedagogy F3 (PG5) | No quiz option "thêm index cho nhanh" (PG5); quiz[0] option C is a fair misconception. Consider a 3rd quiz reading idx_scan = 0 |
| postgres/L3/08-fillfactor-predict.md | predict-expect (ADD-4) | predict reads pg_stat counters, not a plan: no {node, table} possible; result pinned by fact.expect instead. OK by intent, flag for test design |
| postgres/L3/09-vacuum-vm-lab.md | pedagogy F1/F2 | No quiz on the last-page truncation exception (F1); no count(*) predict PG4 (F2) |
| postgres/L3/15-capstone-bloat.md | pedagogy capstone transfer (§3.5) | Capstone reuses tables jobs_full/jobs_room from 08 (pedagogy wants different tables); recalls only vacuum-hot, nothing from pages/mvcc/wal in its steps |
| postgres/L3/*.md | opening question for labs | Lab Ý chính sections still open with a statement (rule is for concept only) |
| mongodb/L1/01-documents.md | ý-chính-150 | Ý chính 190 words (>150); needs an editorial trim |
| mongodb/L1/*.md, mongodb/L2/*.md | code style §5.2 | mongosh code uses double-quoted strings and "a.b" paths; style §5.2 wants single quotes ('a.b'). Changing means editing solutions/setup and re-verifying with mingo 7.2.6: not done |
| mongodb/L2/04-pipeline-concept.md | ý-chính-150 | 159 words |
| mongodb/L2/08-lookup.md | pedagogy F7 | no predict on recorded explain without a foreignField index (needs recorded mongod output) |
| mongodb/L2/11-embed-vs-reference.md | ý-chính-150 | 232 words (>150); needs an editorial trim |
| mongodb/L2/13-schema-validation.md | facts | verify `validationLevel: "constraint"` (9.0) and `"errorAndLog"` (8.1) against official docs and add the URL to sources; not in db-engine-knowledge.md |
| mongodb/L2/13-schema-validation.md | ý-chính-150 | 195 words |
| mongodb/L2/13-schema-validation.md | pedagogy MG1 lab | pedagogy MG1 suggests a $jsonSchema lab; concept only because mingo has no collection validator (honest label present) |
| mongodb/L2/15-capstone-weekly-report.md | pedagogy capstone | no step traps an L2 misconception and the closing quiz reads a number instead of choosing an explanation (pedagogy §1.2 capstone 1–2) |
| mongodb/L1/01-documents.md, L1/02, L1/08 | glossary-missing | "dot notation" used in VI as English; glossary entry "field / dot notation" gives no VI rendering for dot notation |
| mongodb/L2/01, L2/11, L2/12 | glossary-missing | no glossary entries for: positional operator ($, $[], arrayFilters), extended reference, computed pattern, accumulator ("phép tổng hợp"), window function / $setWindowFields |
| mongodb/L3/01,05,10,13,14; L4/01,07,08; L5/01,03,05,08 | Ý chính ≤ 150 words | 151–313 words (L3/13 313, L3/14 282); trimming is a content rewrite |
| mongodb/L3-L5 concept quizzes | pedagogy why explains the wrong option | most `why` state only the right answer; misconception options exist (MG3 L3/05, MG6 L4/07, MG5 L4/09, TTL/multikey L3/01) but the why does not say why the wrong one sounds plausible (fixed only L4/09) |
| mongodb/L3-L5 (predict.sql, examples, solutions) | style §5.2 mongosh format | strings use double quotes, `let`/`session =` variables in L4/08–11, L4/10 examples; predict.sql/solution not edited by rule |
| mongodb/L3/* | glossary compound index | content says "index kép"; glossary vi_term is "compound index" (keep_en). Acceptable under style §2.1 ("index nhiều cột" kind of VI helper), but no first-use "compound index" gloss |
| mongodb/L3-L5 | voice "bạn" | several labs say "ta" ("ta đo", "ta phân tích", "ta chỉ viết") instead of "bạn" |
| mongodb/L3-L5 | glossary-missing | terms used without a glossary entry: collation, write conflict, intent lock, resume token, cardinality (shard key), query shape, heartbeat, optime, capped collection, multi-planner |
| mongodb/path/drills-p1-6.yml, lessons-p1-6.yml | numbers (style §3 thousands separator) | prices in tasks written plain (20000, 30000, 40000, 50000, 60000, 100000) and ms facts (86400000, 172800000): values the player types into code, so a VI "20.000" would read as a JS decimal; writing them in backticks would be the clean fix (prose change only, decide with the writing-style owner) |
| mongodb/path/drills-p7-12.yml | honest runtime (style §4) | explain-read drills (e-mg-d-explain-read-1..4) show hand-written explain output flagged `illustrative: true`; the task text itself does not say "minh hoa / not from mongod". Fine only if the UI prints a label from that flag (not checkable in content) |
| dynamodb/L1/11-capstone-order-desk.md | capstone misconception step | no lab step itself traps a level misconception; the new quiz covers DY1 only in prose |
| dynamodb/L2/02-key-vs-filter.md | pedagogy F12 (DY6) | no `predict` "Limit + filter returns how many items" yet (needs a new predict block with a verified dynoxide run) |
| dynamodb/L2/07-partiql.md | style §5.3 PartiQL | solutions write `FROM Orders` without double quotes (style says `"Orders"`); solutions not edited |
| dynamodb/L2/09-read-cost.md | runtime label | kind predict with runtime docs and no `recorded`: answers follow AWS rules, the emulator is approximate (stated in Practice); check the page label is "Sơ đồ", not "Chạy bằng dynoxide" |
| dynamodb/L2/10-write-cost.md | facts | "2 WCU even when the transaction is cancelled" has no source URL in `sources:` (transaction docs page); verify or add source |
| dynamodb/L2/11-consistency.md | runtime claim | "the emulator still rejects ConsistentRead on a GSI" is a claim about dynoxide 1.5.0; not re-run here |
| dynamodb/L2/12-capstone-bookshop.md | style §5.3 PartiQL | step 5 solution `FROM Books` without double quotes; not edited |
| dynamodb/L4/01,02,06,11 + L5/01,02,03,04,06 | Ý chính ≤ 150 words | 151–234 words; trimming needs a rewrite or moving the BE/runtime paragraph out of ## Ý chính (both languages) |
| dynamodb/L3–L5 (all) | glossary access pattern | Glossary has keep_en true, vi_term "access pattern"; every lesson and product design §4 write "mẫu truy cập". Suggest glossary vi_term "mẫu truy cập (access pattern)" rather than editing ~40 places |
| dynamodb/L3–L5 | glossary eventual consistency | Lessons write "nhất quán cuối cùng" / "eventually consistent" in VI; glossary vi_term "nhất quán cuối". Minor, not changed |
| dynamodb/L4/07, L4/08, L4/10, L4/11, L5/01, L5/04 | requires | requires: [] on lessons that build on earlier levels (e.g. L4/11 on L2 conditional writes). Structure, not prose; not changed |
| dynamodb/L3/11-capstone-shop-design.md | pedagogy transfer | Capstone reuses table `Shop` from L3/08–10 (pedagogy §3.5 wants a different table); changing setup is out of scope |

## Đã kiểm, không cần sửa (17)

| File | Rule | Note |
|---|---|---|
| postgres/L3/*.md | facts/answers | All answer indices checked against why (0-based correct); no setup/solution/probe/expect/answer changed |
| mongodb/L1/01-documents.md | viz-catalog | viz mg-bson-doc is not in product-design §5 catalog: add it to the catalog or drop viz |
| mongodb/L1/*.md, mongodb/L2/*.md | row-as-hàng (scanner) | "dòng hàng" = order line (goods), not row; kept |
| mongodb/L3, L4 | capstone per level (ADD-7) | MongoDB L3 and L4 have no capstone |
| mongodb/L3/04,17; L4/12; L5/09 | every concept ≥1 quiz | quiz lessons only; all 14 concepts have ≥2 quiz items; all answers 0-based and match their why |
| mongodb/L5/08-time-series.md | glossary "cột" (field) | "dạng cột" = columnar storage format, not a field |
| mongodb/path/*.yml | EN diacritics, code spans VI=EN | scripted check over every {vi,en} pair: 0 mismatches, 0 diacritics in EN |
| mongodb/path/drills-*.yml | D8a-7 (task names the answer operator) | no drill/try task holds `$op` or find/sort/limit/aggregate in a code span that the solution uses; "bucket" in 3 tasks is the bucket pattern, not $bucket |
| mongodb/path/*.yml | banned words / transaction / lock | no "sự cố", "boss", "sắp có", "coming soon", "giao dịch", lock-as-"khóa" ("giữ khóa trong `_id`" = group key, correct) |
| mongodb/path/drills-p7-12.yml | units | "100 MB" per-stage sort limit kept (MongoDB docs state 100 megabytes) |
| mongodb/path/lessons-p7-12.yml | honest runtime | ESR drills say "graded by the rule, since mingo has no real index" |
| dynamodb/L1/01-tables-items.md | glossary-avoid "cột" | "cột" only in the SQL contrast and in the misconception option; correct use |
| dynamodb/L1/* | answer-0based | L1 has no answer 0: every answer index re-checked against its why; all correct |
| dynamodb/L2/06-batch.md | runtime honesty | throttling/UnprocessedItems only in docs quiz, not claimed in the lab |
| dynamodb/L2/08-item-size.md | facts | all five size answers recomputed by hand and correct (incl. "Đà Nẵng" = 11 bytes UTF-8) |
| dynamodb/L1-L2 | scanner "phân vùng"/"mục"/"later" | false positives: mandated glosses "khóa phân vùng"/"phân vùng vật lý", "chỉ mục", plain English "later" |
| dynamodb/L4/07-adjacency-list.md | pedagogy F11 (DY4) | No quiz added here; DY4 now covered by the new quiz in L3/07 |


---

# Pass 2

Người làm: agent Content QA · 2026-11-20 · nhánh `content-qa2` (từ `v22-engine`). Chỉ sửa nội dung, không code, không build (L218).

**Phạm vi:**
- Postgres L1 (12 bài), L2 (17), L4 (16), L5 (15) và `postgres/modules.yml`. Pass 1 chưa xem các file này.
- Các mục máy móc trong danh sách "Còn lại" của pass 1: Ý chính quá 150 từ (MongoDB, DynamoDB) và thuật ngữ còn thiếu trong glossary.

**Cách làm:**
- **Script quét** (chạy trên VI và EN, ngoài code span):
  - `avoid` của glossary Postgres;
  - "khóa" dùng cho lock, "giao dịch", "tài liệu", "sự cố";
  - số VI/EN, %, đơn vị;
  - code span VI = EN;
  - `answer` trong khoảng, concept có quiz;
  - `viz`, `runtime`, `title`;
  - số từ Ý chính, concept có mở bằng câu hỏi không.
- **Đọc từng bài:** đọc mọi quiz/predict theo dạng câu hỏi, đáp án và `why`, cùng phần thân VI. Việc này để kiểm:
  - đáp án đánh số từ 0;
  - lựa chọn sai là hiểu lầm thật;
  - có đoán trước khi chạy;
  - nhãn runtime trung thực.
- **Bất biến:** một script so frontmatter đã parse với `v22-engine`: `lab.setup`, mọi `solution`/`check`/`ordered`/`expect`/`plan` của bước, `predict` (trừ chữ), `answer` và số lựa chọn của mọi câu quiz, `recorded`. Kết quả: 0 khác biệt ở mọi file `content/engine/**`. Vì không đổi SQL/setup/solution/sự thật nào, không cần chạy lại PGlite. Mọi YAML vẫn parse được.
- **Số từ:** đếm theo khoảng trắng, như pass 1 (VI đếm theo âm tiết, code span tính cả).

**Quy ước chốt thêm trong pass 2:**
- **`viz` theo tên đã đăng ký trong `src/engine/viz` (L238).** Danh sách: `pg-heap-page`, `pg-mvcc-timeline`, `pg-hot-chain`, `pg-vacuum-flow`, `pg-btree`, `pg-wal-flow`, `pg-gin-postings`, `pg-brin-ranges`, `pg-gist-boxes`, `pg-plan-tree`, `pg-lock-matrix`, `pg-isolation-anomalies`.
  - Không theo danh mục ở product design §5, vì `pg-mvcc`, `pg-hot`… không có hình nào vẽ.
  - Vì vậy L3 (pass 1) cũng được đổi tên.
- **`runtime`:**
  - `concept`/`quiz` là `docs`;
  - `lab`/`predict`/`capstone` là `browser`, vì mọi bước chấm chạy trên PGlite, kể cả L4/15 (song song/JIT) và L5/13 (slot), vốn đọc thiết lập và slot thật;
  - phần không chạy được đã có câu nói rõ ngay trong bài.
- **Bài `docs` cần nhiều phiên hoặc server thật:** thêm dòng BE nguyên văn style §4 vào đầu `## Thực hành`. Các bài: L4/10–13, L5/14.
- **Lock và key:**
  - "khóa" chỉ giữ cho key: khóa chính, khóa ngoại, khóa phân vùng, cột khóa, khóa của index GIN/B-tree/jsonb.
  - Mọi lock viết bằng chữ lock: lock mode, row lock, advisory lock, predicate lock, "giữ/chờ/lấy lock".
- **Mức cô lập trong văn:** viết Read Uncommitted / Read Committed / Repeatable Read / Serializable. Trong code span và khối code vẫn để HOA.

## Đã sửa (pass 2)

| File | Rule | Note |
|---|---|---|
| postgres/L1–L5 (60 bài) | runtime label | Thêm `runtime:` sau `kind:` (12 `docs`, 48 `browser`) |
| postgres/L1–L5 (mọi bài có `viz`, kể cả L3) | viz name `pg-*` | `plan-tree`→`pg-plan-tree`, `lock-matrix`→`pg-lock-matrix`, `isolation-anomalies`→`pg-isolation-anomalies`, `btree`/`pg-btree-split`→`pg-btree`, `gin-postings`/`pg-gin`→`pg-gin-postings`, `brin-ranges`/`pg-brin`→`pg-brin-ranges`, `gist-boxes`/`pg-gist`→`pg-gist-boxes`, `pg-query-path`→`pg-plan-tree`, `pg-mvcc`→`pg-mvcc-timeline`, `pg-hot`→`pg-hot-chain`, `pg-vacuum-vm`→`pg-vacuum-flow`, `pg-wal`→`pg-wal-flow`; L5/09 thêm `viz: pg-wal-flow`; L2/14 đổi thành `pg-lock-matrix` vì bài bấm sơ đồ lock khi tạo index |
| postgres/L1–L5 | numbers VI/EN | VI: `20 000`→`20.000`, `20000`→`20.000`, `0.7`→`0,7`, `90%`→`90 %` (~40 chỗ); EN: `20000`→`20,000`, `100000`→`100,000`; cả hai: `4MB`/`64kB`/`8kB`/`4GB`→`4 MB`/`64 KB`/`8 KB`/`4 GB`. Code span và output giữ nguyên. L2/08 "Kết quả 1.000" (correlation) → "Kết quả là 1" / "The result is 1" |
| postgres/L1/01-types.md | concept opens with question; Ý chính 202→146; "tài liệu" | Mở bằng "0,1 + 0,2 có bằng 0,3?"; "Tài liệu Postgres" → "docs chính thức"; dòng "Ngoài ra…" sang `## Ví dụ` |
| postgres/L1/02, 03, 04, 09 | first-use gloss | "index (chỉ mục)" lần đầu; L1/04 "ràng buộc (constraint)", "khóa ngoại (foreign key)" |
| postgres/L1/03-identity-uuid-generated.md | glossary `generated column` | "cột tính sẵn" → "cột sinh" (lần đầu "cột sinh (generated column)", cả `title`); span VI/EN cùng thứ tự ở bước 3; Ý chính 187→148 |
| postgres/L1/04-constraints.md | Ý chính 197→~145 | Đoạn `contype` sang `## Ví dụ` (VI+EN) |
| postgres/L1/05-null-semantics.md | honest runtime | Bài quiz/docs: "Chạy thử ví dụ trên" → "Đoán kết quả của từng dòng trong ví dụ trên" |
| postgres/L1/07-transactions.md | concept opens with question; isolation casing | Câu hỏi "trừ tiền A xong thì máy sập"; READ COMMITTED → Read Committed trong quiz |
| postgres/L1/09-first-index.md | facts | "mỗi `INSERT`, `UPDATE` hay `DELETE` đều phải sửa index" là sai cho `DELETE`. Sửa: `DELETE` để mục cũ cho VACUUM dọn (VI+EN). Đoạn Bitmap sang `## Ví dụ` |
| postgres/L2/01, 05 | "tài liệu" = docs | → "docs chính thức"; L2/01 "Quy tắc thiết kế…" sang `## Thực hành` (168→~150) |
| postgres/L2/02, 06, 08, 11, 16 | Ý chính ≤ 150 | Chuyển đoạn cuối (visibility map; ghi GIN chậm; opclass BRIN; toán tử jsonb khác; earthdistance/PostGIS) sang `## Ví dụ`/`## Thực hành` (VI+EN) |
| postgres/L2/06-arrays-gin.md | predict-before-run | Bước 3 hỏi trước "viết bằng `= ANY` thì có dùng index không?" (kết quả trái trực giác, trước đây chỉ cho xem) |
| postgres/L2/02, L4/03, L5/01, L5/02, L5/09, L5/10 | predict-before-run | Thêm câu "Đoán trước: …" vào `task` (VI+EN, chỉ chữ) ở bước có kết quả trái trực giác: `relallvisible` = 0 trên bảng mới nạp; ước lượng không có thống kê mở rộng; index nào nhiều lá hơn; index có INCLUDE mất dedup; UPDATE nào mang full-page image; owner_sees khi RLS đã bật |
| postgres/L2/08-brin.md | quote output | "Kết quả 1.000" (correlation làm tròn 3 chữ số) → "Kết quả `1.000`" / "Result `1.000`" (output trích nguyên văn trong backtick) |
| postgres/L2/11-jsonb.md | "tài liệu" chỉ là MongoDB document | "tài liệu chứa cặp đó" → "giá trị `jsonb` chứa cặp đó"; hint bước 3 → "`doc` chứa…" |
| postgres/L2/12-full-text.md | glossary generated column | "cột `tsvector` tính sẵn" → "cột sinh (generated column) kiểu `tsvector`" |
| postgres/L2/14-explain-analyze.md | concept opens with question; lock-as-khóa; Ý chính 187→150 | Mở bằng "Planner đoán 5 dòng nhưng câu trả về 4800"; "khóa SHARE" → "giữ lock SHARE"; "sơ đồ khóa" → "sơ đồ lock"; đoạn `CREATE INDEX CONCURRENTLY` sang `## Thực hành`; 19800 → 19.800 / 19,800 |
| postgres/L2/15-pg-stats.md | code span order; numbers | EN predict.q đổi thứ tự cho `EXPLAIN` trước `rows=`; lựa chọn `10000` → `10.000`/`10,000`; why `0.1 ×` → `0,1 ×` (VI) |
| postgres/L4/01, 02, 04, 06, 07 | Ý chính ≤ 150 | Chuyển phần "tinh chỉnh", `SET STATISTICS`, "nguyên nhân số một", "Công cụ", "lợi ích vận hành" sang `## Thực hành`. L4/04 bỏ định dạng bảng "— cách làm: …; thắng khi: …" thành câu |
| postgres/L4/01-cost-model.md | glossary cost | Lần đầu "Chi phí (cost)"; số VI `1,0`, `0,0025`… |
| postgres/L4/02-column-statistics.md | code span order | EN Practice: `pg_stats` trước `rows=` như VI |
| postgres/L4/06-plan-cache.md | "giao dịch"; "tài liệu"; version | → transaction; "nguyên văn tài liệu PREPARE" → "đúng như docs chính thức của PREPARE"; "(từ 16)" → "(từ PostgreSQL 16)"; "generic plan / custom plan" giữ nguyên (glossary `keep_en: true`) |
| postgres/L4/07-partition-pruning.md | misconception stated (pedagogy §1.2-3) | Đoạn chuyển sang Thực hành nói thẳng "Nhiều người nghĩ bảng phân vùng luôn nhanh hơn. Thật ra…" (VI+EN) |
| postgres/L4/08-partition-design.md | "tài liệu" | → "docs chính thức" |
| postgres/L4/09–16 | glossary-avoid transaction | "giao dịch" → "transaction" ở mọi văn VI (~45 chỗ) |
| postgres/L4/09-table-lock-modes.md | lock-as-khóa; banned "sự cố"; title; Ý chính 219→~140 | `title` "Chế độ khóa bảng…" → "Lock mode trên bảng và pg_locks"; "khóa dòng/khóa bảng/chờ khóa/lấy khóa" → row lock / lock trên bảng / chờ lock / lấy lock; why "Đây là sự cố" → "Đây là chuyện"; danh sách 8 mode gọn "MODE: lệnh"; đoạn `pg_locks` + giới hạn PGlite sang `## Ví dụ` |
| postgres/L4/10-row-locks.md | lock-as-khóa; title; concept question; facts; BE line | `title` "Khóa dòng…" → "Row lock…"; mở bằng "giữ row lock trên 2 triệu dòng: Postgres nhớ ở đâu?"; VI ghi "từ mạnh tới yếu" nhưng danh sách là yếu → mạnh: sửa "từ yếu tới mạnh"; quiz options/why: "A khóa dòng" → "A giữ row lock", "khóa ngoại không khóa gì" → "không lấy lock nào"; why nêu hiểu lầm lock escalation (P5); dòng BE + `NOWAIT`/`SKIP LOCKED` sang Thực hành |
| postgres/L4/11-deadlocks.md | concept question; lock-as-khóa; units; BE line | Mở bằng hai job chuyển tiền ngược chiều; "khóa tư vấn (advisory)" → "advisory lock"; "1s" → "1 giây"/"1 second" trong văn; "Tài liệu" → docs |
| postgres/L4/12-isolation-levels.md | concept question; isolation casing; Ý chính 201→~145; BE line | Viết lại: mở bằng câu hỏi "hai tổng khác nhau"; mỗi mức một dòng (mức nào cho hiện tượng nào, giữ ý "chuẩn SQL cho phép dirty read ở Read Uncommitted, Postgres thì không" và "phantom read: chuẩn cho phép, Postgres không"); định nghĩa bốn hiện tượng sang `## Ví dụ`; "tài liệu Postgres" → docs |
| postgres/L4/13-serializable-ssi.md | concept question; title casing; lock wording; BE line | `title` "SERIALIZABLE:" → "Serializable:" (VI+EN); mở bằng ca trực bác sĩ; "khóa vị từ" → "predicate lock", "khóa tường minh" → "lock tường minh"; "Lựa chọn khác" + "Quy tắc cho ứng dụng" sang Thực hành |
| postgres/L4/14-advisory-locks.md | glossary-avoid "khóa tư vấn"; title | `title` "Khóa tư vấn: khóa do ứng dụng…" → "Advisory lock: lock do ứng dụng…"; mọi "khóa tư vấn/cấp giao dịch/hàm khóa/số khóa" → advisory lock / cấp transaction / hàm lock / số của lock; "Tài liệu" → docs |
| postgres/L4/15-parallel-query-jit.md | honest docs output (style §4); avoid "kế hoạch chạy"; numbers | Khối Parallel Aggregation: "Ví dụ trong docs chính thức của PostgreSQL… (chưa chạy trong trình duyệt)" / "Example from the official PostgreSQL docs… (not run in the browser)"; đoạn giới hạn PGlite sang `## Ví dụ`; 100000/500000 → 100.000/100,000 |
| postgres/L4/16-capstone-slow-report.md | banned "sự cố"; lock-as-khóa | "hai sự cố" → "hai vấn đề"; "Bước 4, khóa." → "Bước 4, lock."; "ALTER không khóa gì" → "không lấy lock nào" |
| postgres/L4/*, L1/07, L1/L2 | isolation casing | READ COMMITTED/REPEATABLE READ/SERIALIZABLE → Read Committed/Repeatable Read/Serializable trong văn và `title` (VI+EN; code giữ HOA) |
| postgres/L5/01, 05, 06, 10, 13, 14 | Ý chính ≤ 150 | Chuyển các phần sau sang `## Ví dụ` hoặc `## Thực hành` (VI+EN): dòng pageinspect, các opclass BRIN, đoạn pageinspect GiST, giới hạn chạy RLS, view `security_invoker`, giới hạn PGlite của replication. Rút gọn vài câu |
| postgres/L5/03-btree-index-deletion.md | concept question; Ý chính 217→~145 | Mở bằng "chỉ UPDATE `last_seen` mà index `user_id` vẫn phình"; "(từ 14)" → "(từ PostgreSQL 14)"; dedup/HOT sang Thực hành; "Tài liệu" → docs |
| postgres/L5/02, 04, 09, 10, 12 | "tài liệu" = docs | → "docs chính thức"; L5/04 bước 3 "Đếm tài liệu của `docs`" → "Đếm các dòng của `docs`" |
| postgres/L5/07-choose-index-am.md | Ý chính 237→~145 | Bảng AM gọn "toán tử · mạnh ở · lưu ý" (VI+EN, cùng code span); "Quy trình chuyên gia" sang Thực hành |
| postgres/L5/08-amcheck.md | lock-as-khóa | "kỹ hơn nhưng khóa mạnh hơn" → "giữ lock mạnh hơn" |
| postgres/L5/13-replication-slots.md | banned "sự cố"; "tài liệu" | "sau sự cố" ×3 → "sau khi máy sập"; "Tài liệu logical decoding" → "Docs chính thức (logical decoding)" |
| postgres/L5/14-backup-pitr-ha.md | BE line; honest docs output; glossary freeze; lock | "Không có phần chạy thật…" → dòng BE + giới hạn đo được, đặt đầu Thực hành; khối PITR "Ví dụ theo docs chính thức… (chưa chạy trong trình duyệt)"; "đóng băng tuple" → "freeze tuple"; "VACUUM FULL khóa ACCESS EXCLUSIVE" → "giữ lock ACCESS EXCLUSIVE" |
| postgres/L5/15-capstone-slow-events.md | wording | "ước lượng hàng chờ sai" (vô nghĩa) → "ước lượng số dòng sai" (khớp EN) |
| postgres/modules.yml | after-lines; lock; plan cache | `after` của L1/L2/L4/L5 viết thường đầu câu, bỏ dấu chấm cuối (như L3, MongoDB, DynamoDB); `uuidv7()`, `float8`, `search_path`, `lower(email)`, `LIKE '%x%'`, `pg_stats` vào backtick (VI = EN); "Khóa, mức cô lập và SSI" → "Lock, mức cô lập và SSI" (cả `vi` và `title.vi`); "lấy khóa nào" → "lấy lock nào"; "chờ khóa" → "chờ lock"; "bộ nhớ đệm kế hoạch" → "plan cache". Mọi `module:` của 75 bài có trong file; `vi`/`en` = `title.vi`/`title.en` |
| content/engine/glossary.yml | glossary-missing | 21 mục mới, đủ 9 trường, `doc` lấy từ `sources:` của bài dùng từ đó. Postgres: prepared statement, predicate lock (SIReadLock), exclusion constraint, metapage, version churn. MongoDB: dot notation, positional operator, extended reference pattern, computed pattern, accumulator ("phép tổng hợp"), window function (`$setWindowFields`), collation, query shape, multi-planner, write conflict, intent lock, resume token, heartbeat, optime, capped collection, shard key cardinality |
| mongodb (14 bài), dynamodb (4 bài) | Ý chính > 150 (pass 1 "Còn lại") | Chuyển đoạn cuối của Ý chính và Key idea sang đầu `## Ví dụ`/`## Example`. Chỉ làm khi VI và EN có cùng số đoạn và Ý chính còn ≥ 100 từ. Bài MongoDB: L1/01, L1/05, L1/06, L1/10, L2/02, L2/04, L2/11, L2/13, L3/05, L3/10, L4/01, L4/07, L4/08, L5/05. Bài DynamoDB: L4/06, L5/01, L5/02, L5/04. Chữ không đổi |

## Đã kiểm, không cần sửa (pass 2)

| File | Rule | Note |
|---|---|---|
| postgres/L1, L2, L4, L5 | answer 0-based, why khớp | Đọc mọi quiz/predict (≈ 90 câu): đáp án trong khoảng, `why` nói đúng lựa chọn được đánh dấu |
| postgres/L1, L2, L4, L5 | wrong options = real misconceptions | Có đủ hiểu lầm của §2: PG1 (L1/10, L2/17), PG4 (L2/17 quiz `count(*)`), PG5 (L2/14, L2/17), PG6 (L2/01), PG7 (L4/12 quiz 0 và 2, L4/13). Lựa chọn cố ý vô lý (kiểu "Không sai gì", "Không rủi ro") giữ lại vì luôn đi cùng ít nhất một lựa chọn sai là hiểu lầm thật |
| postgres/L1–L5 | `title` VI | Có ở mọi bài |
| postgres/L4/09, L4/14, L4/15, L5/11, L5/13 | honest runtime | Bước chấm chạy thật (đọc `pg_locks` của câu mình, slot vật lý, thiết lập); phần "ai chờ ai", parallel, standby đều đã nói là sơ đồ hoặc giới hạn PGlite |
| postgres/L5/11 | glossary "quét tuần tự" | Nói về bộ đếm `seq_scan`, không phải tên nút: giữ |
| postgres/L4/08, L1/04 `title` | "khóa" | Là key (khóa phân vùng, khóa chính/ngoại): đúng |
| mongodb, dynamodb (18 bài chuyển đoạn) | pedagogy §1.2-3 | Không đoạn nào bị chuyển chứa câu "Nhiều người nghĩ… Thật ra…" (kiểm trên diff `8e1aa2e`): câu nêu hiểu lầm vẫn ở Ý chính |

## Còn lại (pass 2)

| File | Rule | Note |
|---|---|---|
| docs/team/product-design-db-engine.md §5 | viz catalog vs registry | Danh mục §5 (`pg-query-path`, `pg-mvcc`, `pg-partition-prune`, `pg-replication`…) khác tên đã đăng ký trong `src/engine/viz` (L238). Nội dung nay theo registry. Cần sửa §5 theo L238, hoặc vẽ thêm `pg-partition-prune` (L4/07–08) và `pg-replication` (L5/13): các bài này chưa có sơ đồ đúng chủ đề (L4/07 tạm dùng `pg-plan-tree`) |
| mongodb/L1/01-documents.md | viz | `mg-bson-doc` đã có trong registry (`src/engine/viz`), nên mục pass 1 về viz này có thể đóng khi §5 được cập nhật |
| mongodb L3/01, L3/13, L3/14, L4/10, L5/01, L5/03, L5/08; dynamodb L4/01, L4/02, L4/11, L5/03, L5/06 | Ý chính ≤ 150 | Còn quá 150 từ. Ý chính là một danh sách dài, nên chuyển đoạn sẽ để lại < 100 từ. Cần viết lại (dynamodb L4/01, L4/02, L5/03: chuyển đoạn BE/runtime ra là đủ, nhưng hai bản VI/EN khác số đoạn nên không làm máy móc) |
| mongodb L1–L5 (solutions, setup, predict) | style §5.2 mongosh quotes | Chưa đổi nháy kép sang nháy đơn. Đó là `solution`/`setup`/`predict.sql`, không sai, mà đổi thì phải chạy lại mingo |
| postgres/L4/10–13, L5/14 | BE line wording | Dòng BE nguyên văn style §4 có "replica set / AWS", lạc chỗ trong bài Postgres. Đề nghị style §4 cho một biến thể Postgres ("cần nhiều phiên / server thật") |
| content/engine/glossary.yml `generated column` | vi_term | `vi_term` "cột sinh" đọc gượng, nên L1/03 đã đổi "cột tính sẵn" theo glossary. Nếu nhóm thích "cột tính sẵn" thì sửa glossary và đổi lại các chỗ ở L1/03 và L2/12 |
| content/engine/glossary.yml `cost` | keep_en true | Bài Postgres viết "chi phí" (planner). Pass 2 chỉ chú thích "Chi phí (cost)" lần đầu ở L4/01. Cần chốt: dùng "cost" trong văn VI, hay đổi glossary sang `keep_en: false` "chi phí" |
| postgres/L1/12-capstone-registrations.md | pedagogy capstone | Câu kết luận quiz 1 chỉ có 2 lựa chọn; chưa kiểm capstone L1/L2 theo luật chuyển giao §3.5 |
| postgres/L2/*, L4/* (`task` có giá trị `1.50`, `9.50`, `(500,500)`) | numbers | Giá trị người học gõ vào SQL, giữ dấu chấm như pass 1 quyết với số trong drill MongoDB. Cách sạch là đặt trong backtick |
| postgres/L5/01-02 (index-internals) | pedagogy PG8 | Không lựa chọn sai nào là "index chậm thì REINDEX" (PG8); L5/01 chỉ nhắc `REINDEX` trong `why`. Cần thêm một câu quiz |
| postgres/L1–L5 quizzes | pedagogy §1.2-5 | Đa số `why` chỉ nói đáp án đúng, chưa nói vì sao lựa chọn sai nghe hợp lý. Pass 2 chỉ sửa L4/10 (lock escalation) |
| postgres/L1, L2, L4, L5 | glossary first use | "index (chỉ mục)" mới thêm ở 5 bài (L1/02–04, L1/09, L2/01); các bài khác chưa chú thích lần đầu |
| content/engine/glossary.yml (21 mục mới) | facts | Định nghĩa viết theo docs trong `doc`, chưa đối chiếu `db-engine-knowledge.md` |
| postgres/L4/*, L5/* | glossary keep_en | Cùng loại với `cost`: bài viết "vai trò" (glossary `role` keep_en true), "truy vấn song song" (`parallel query` keep_en true). Chưa đổi |
| postgres/L5/09-wal-full-page-writes.md | viz | Pass 2 thêm `viz: pg-wal-flow` (trước đó bài không có `viz`) |
| Pass 1 "Còn lại" (các mục khác) | — | Vẫn mở: capstone MongoDB L3/L4, các mục pedagogy F1/F2/F3/F7/F12, PartiQL `"Orders"`, facts DynamoDB L2/10–11, `requires: []`, các mục glossary của DynamoDB (access pattern, eventual consistency) |
