# Sư phạm cho khu Database Engine: nguyên tắc, hiểu lầm, cách chấm

Tài liệu research cho khu Database Engine (L215, L219). Đọc kèm `product-design-db-engine.md` v2 (định dạng ENGINE-CONTENT-V1, năm loại bài) và `db-engine-knowledge.md` (§1 cho biết PGlite chạy thật được gì).

- **Ngày làm:** 2026-11-20.
- **Phạm vi:** không code, không build (L218).
- **Dùng cho:** agent nội dung (viết bài `content/engine/**`) và agent review Product (cổng §8 của product design).

**Quy ước trích dẫn:**

- Câu trong ngoặc kép là nguyên văn đã đọc từ trang nguồn, mỗi câu ≤ 15 từ.
- Nguồn ghi *(chưa kiểm nguyên văn)* chỉ có URL/DOI. Tôi biết nguồn này qua kết quả tìm kiếm hoặc tóm tắt, chưa đọc toàn văn, nên không trích câu nào.
- Không tìm được nghiên cứu SIGCSE/ITiCSE nào riêng về hiểu lầm *bên trong* database (index, MVCC, NoSQL). Nghiên cứu gần nhất đã tìm thấy là về hiểu lầm SQL của người mới (ICER 2021, §1.6).
- Vì vậy danh mục hiểu lầm ở §2 dựa trên tài liệu chính thức của từng engine. Nó **không** dựa trên số đo trên người học.

---

## 1. Nguyên tắc và luật viết bài

### 1.1 Sáu nguyên tắc (có nguồn)

| # | Nguyên tắc | Bằng chứng | Hệ quả cho Engine |
|---|---|---|---|
| P1 | **Đoán trước rồi mới xem** (predict–observe–explain) | Crouch, Fagen, Callan, Mazur 2004: người chỉ xem demo không hiểu hơn người không xem, người **đoán trước** thì hiểu hơn rõ rệt. DOI 10.1119/1.1707018, https://works.swarthmore.edu/fac-physics/203 *(chưa kiểm nguyên văn: tóm tắt qua kết quả tìm kiếm)* | Mọi kết quả "bất ngờ" (Seq Scan dù có index, bảng không nhỏ lại sau VACUUM, Scan có filter vẫn tốn RCU) phải là `predict` hoặc một bước lab có câu đoán **trước** khi chạy. Không bao giờ chỉ cho xem. |
| P2 | **Kiểm tra là cách học, không chỉ là đo** (retrieval practice) | Roediger & Karpicke 2006, *Psychological Science* 17(3): nhóm làm bài kiểm nhớ lâu hơn nhóm đọc lại, dù nhóm đọc lại tự tin hơn. https://pubmed.ncbi.nlm.nih.gov/16507066/ *(chưa kiểm nguyên văn)* | Luật ADD-7 (mỗi `concept` ≥ 1 câu quiz) là bắt buộc về sư phạm, không phải trang trí. Capstone gọi lại kiến thức của **các mô-đun trước** trong cấp, không chỉ mô-đun cuối. |
| P3 | **Ví dụ mẫu → ví dụ khuyết dần → tự giải** (worked/faded examples) | Atkinson, Renkl, Merrill 2003, *J. Educational Psychology* 95(4): fading kèm câu hỏi tự giải thích giúp người học. Fading giúp chủ yếu ở near transfer. https://asu.elsevierpure.com/en/publications/transitioning-from-studying-examples-to-solving-problems-effects-/ *(chưa kiểm nguyên văn)* | Trong một mô-đun, các bước lab đi từ "chạy câu mẫu và đọc kết quả" → "điền chỗ trống `___`" → "tự viết". Repo đã có cơ chế `___`/`faded` (CLAUDE.md, `blanksIn`). |
| P4 | **Giảm tải nhận thức, rút dần khi người học giỏi lên** (cognitive load, expertise reversal) | Sweller 1988 "Cognitive load during problem solving", *Cognitive Science* 12(2), DOI 10.1207/s15516709cog1202_4 *(chưa kiểm nguyên văn)*. Kalyuga et al. 2003 "The expertise reversal effect", *Educational Psychologist* 38(1), DOI 10.1207/S15326985EP3801_4 *(chưa kiểm nguyên văn)* | Một sơ đồ `viz` dạy **một** cơ chế và chỉ hiện các trường cần cho cơ chế đó: `pageinspect` chỉ hiện `lp, t_xmin, t_xmax, t_ctid`, không đổ cả 15 cột. L1–L2 nhiều ví dụ mẫu; L4–L5 bỏ ví dụ mẫu, vào thẳng bài toán. |
| P5 | **Dạy thẳng vào hiểu lầm** (refutation: nêu niềm tin sai, nói nó sai, cho bằng chứng) | Miedema, Aivaloglou, Fletcher, ICER 2021 "Identifying SQL Misconceptions of Novices": lỗi SQL đến từ kiến thức cũ, khái quát hóa sai, ngôn ngữ và mô hình trong đầu chưa đủ. DOI 10.1145/3446871.3469759, https://research.ou.nl/en/publications/identifying-sql-misconceptions-of-novices-findings-from-a-think-a/ *(chưa kiểm nguyên văn: chỉ đọc tóm tắt; nói về SQL người mới, không về engine)* | Mỗi hiểu lầm ở §2 phải xuất hiện **nguyên văn là một lựa chọn sai** trong `predict`/`quiz`, và `why` của lựa chọn đó bác nó bằng số đo. Bốn nguồn gốc của Miedema dùng để đoán hiểu lầm mới: Mongo "giống SQL" là khái quát hóa từ kiến thức cũ; tên `VACUUM` gợi "hút sạch" là nguồn gốc ngôn ngữ. |
| P6 | **Cấu trúc theo tầng hệ thống, từ dưới lên** | CMU 15-445 Fall 2024 (lịch học công khai, đã đọc). Thứ tự bài giảng: Storage I/II → Memory Management → Hash Tables → Indexes & Filters → Index Concurrency → Sorting/Joins → Query Execution → Query Planning → Concurrency Control (2PL, Timestamp, MVCC) → Logging → Recovery → Distributed. Năm project: Buffer Pool, Index, Query Execution, Concurrency Control. https://15445.courses.cs.cmu.edu/fall2024/schedule.html | Thang Postgres L3 (trang → MVCC → WAL) → L4 (planner → khóa/isolation) → L5 (nội tạng index, nhân bản) khớp thứ tự này. **Thiếu:** mô-đun `memory` (buffer pool) của L3 chưa có bài, mà CMU coi nó là project số 1 (xem §4). |

Nguồn thực hành bổ trợ:

- **Use The Index, Luke** (Markus Winand) dạy index cho lập trình viên theo đúng kiểu bác hiểu lầm.
  - Trang "Slow Indexes" mở đầu bằng: "The myth proclaims an index rebuild as the miracle solution."
  - Rồi chỉ ra nguyên nhân thật: "The second ingredient for a slow index lookup is accessing the table."
  - https://use-the-index-luke.com/sql/anatomy/slow-indexes
- **Tài liệu chính thức** là nguồn `sources:` bắt buộc của mỗi bài: `postgresql.org/docs/18`, `mongodb.com/docs`, `docs.aws.amazon.com/amazondynamodb`.

### 1.2 Luật viết theo loại bài

Các luật dưới đây áp cho agent nội dung. Mỗi luật ghi nguyên tắc đứng sau nó.

**`concept`** (chữ + sơ đồ bấm từng bước + câu kiểm)

1. Mở bằng **câu hỏi hoặc tình huống**, không mở bằng định nghĩa. Ví dụ: "UPDATE một dòng 1 lần, bảng có thêm mấy phiên bản?" (P1)
2. `## Ý chính` ≤ 150 từ. Sơ đồ `viz` mỗi bước đổi **một** thứ, không có bước nào chỉ để trang trí. (P4)
3. Nếu chủ đề có hiểu lầm trong §2, câu đầu hoặc câu cuối của `## Ý chính` nói thẳng ra: "Nhiều người nghĩ X. Thật ra Y, vì Z." (P5)
4. ≥ 1 câu `quiz`, và một lựa chọn sai phải là **chính hiểu lầm đó**, viết bằng giọng người tin nó. Câu đó không được là lựa chọn lộ liễu kiểu "luôn luôn / không bao giờ" mà ai cũng loại được. (P2, P5)
5. `why` giải thích **vì sao lựa chọn sai nghe hợp lý**, rồi mới nói đáp án. (P5)

**`lab`** (chạy thật)

1. Bước 1 là ví dụ mẫu: chạy câu cho sẵn và đọc một con số. Các bước giữa khuyết dần bằng `___`. Bước cuối tự viết. (P3)
2. Bằng chứng là thứ đếm được và tất định: `pg_relation_size`, `n_dead_tup`, `Heap Fetches`, `Buffers`, `cost=`, `ScannedCount`, `ConsumedCapacity`, `totalKeysExamined`. **Không bao giờ dùng mili giây**, theo luật ch11 và `planCheck`: thời gian dao động theo máy nên không dạy được gì.
3. Bước nào có kết quả trái trực giác thì trong `task` hỏi đoán trước ("Theo bạn số này tăng, giảm hay giữ nguyên?"), rồi mới cho chạy. (P1)
4. Chỉ ghi "chạy thật" khi runtime thật sự chạy được. Bước cần nhiều phiên, `mongod` hoặc AWS thì chuyển thành `predict` trên output `recorded` (ADD-3), kèm nhãn trung thực (product design §3.6).

**`predict`**

1. Đúng **3–4 lựa chọn**: đáp án, hiểu lầm chính ở §2, và 1–2 lựa chọn gần đúng nhưng sai một chi tiết, chẳng hạn đúng loại nút nhưng sai bảng. (P1, P5)
2. Postgres phải có `expect: { node, table }` (ADD-4), để test chứng minh đáp án khớp kế hoạch thật trên PGlite. Đáp án sai về mặt kỹ thuật là lỗi nặng nhất có thể có trong một bài dạy.
3. `why` luôn trích **một con số** từ kết quả thật ("cost 1.8k vs 3.2k", "`ScannedCount` 2000, `Count` 3"), không chỉ nói "vì planner thấy rẻ hơn".

**`quiz`**

1. Ưu tiên câu "điều gì xảy ra nếu…" và "chọn cách sửa", hơn là câu nhớ định nghĩa. (§3)
2. Câu xếp thứ tự (ADD-5) dành cho chuỗi cơ chế: các bước COMMIT ghi WAL, election, đường đi của một write tới GSI.

**`capstone`**

1. Một tình huống thật, 3–5 bước, trong đó **ít nhất một bước gài lại một hiểu lầm của cấp đó**, ví dụ "thêm index có giúp không?" mà đáp án là không. Capstone kiểm chuyển giao, không lặp lại bài cũ. (P2)
2. Bước cuối là `quiz` kết luận: chọn **lời giải thích** đúng cho số đo vừa thấy, không chỉ chọn lệnh đúng. (§3)

---

## 2. Danh mục hiểu lầm, bài dẹp và độ phủ hiện tại

### 2.1 Cách đọc cột "Độ phủ"

Bản kiểm này đo lúc 2026-11-20 03:04 (giờ máy). **Main chỉ có** `content/engine/mongodb/path/*-p7-12.yml`. Mọi bài khác nằm trên nhánh worktree **chưa merge**, mã như sau:

| Mã | Nhánh `worktree-agent-…` | Nội dung |
|---|---|---|
| `pgA` | `a91fc07d50546ddc3` | postgres L1 01–12 |
| `pgB` | `afb7ec030452336a3` | postgres L1 01–03. **Trùng số với `pgA`:** cả hai có `L1/01-*` |
| `pgC` | `a560a250cf68f494e` | postgres L3 01–13 (chưa commit) |
| `pgD` | `a8d4936f3f3ddb013` | postgres L4 01–15, L5 01–06 |
| `mgA` | `ac8523fee06a32aa1` | mongodb L1, L2 01–10 |
| `mgB` | `aa9138634cd561a45` | mongodb L3, L4, L5 |
| `mgP` | `a27cc3bda07d13331` | mongodb path p1–6 (drill) |
| `dyA` | `a846ce03be510d543` | dynamodb L1, L2 01–08 |
| `dyB` | `a66fa4ee7c7ceaa3b` | dynamodb L4 01–13 (chưa commit) |

Ba mức độ phủ. Mức được xác định bằng cách mở file đọc, không chỉ grep:

- **Đối mặt**: hiểu lầm là một lựa chọn sai của `quiz`/`predict`, hoặc một kết quả lab bác nó bằng số.
- **Có nhắc**: chữ trong bài có nói sự thật, nhưng người học không phải đối mặt với niềm tin sai.
- **Chưa có**: không có bài nào nói tới.

Kiểu bài dẹp đề xuất theo runtime thật, dựa trên `db-engine-knowledge.md` §1:

- PGlite có một phiên, `pageinspect`, `pg_visibility`, `pg_walinspect` và EXPLAIN (giá trị cost).
- `VACUUM` cần request ngoài transaction (`engineLab`, như `L3/09`).
- mingo **không có index**.
- dynoxide trả `ScannedCount`/`ConsumedCapacity` nhưng không mô phỏng phân vùng vật lý hay độ trễ GSI.

### 2.2 PostgreSQL

| # | Hiểu lầm | Cấp | Sự thật (nguồn) | Bài dẹp đề xuất | Độ phủ |
|---|---|---|---|---|---|
| PG1 | "Có index thì câu luôn nhanh hơn / luôn dùng index" | L1–L2 | Planner chỉ dùng index khi ước lượng rẻ hơn Seq Scan. Khi lọc trúng phần lớn bảng, Seq Scan rẻ hơn. Index chậm vì bước **truy cập bảng**: "The second ingredient for a slow index lookup is accessing the table." (Use The Index, Luke) | `predict` có `expect: {node: Seq Scan}` trên điều kiện trúng khoảng 50% dòng, kèm cặp so sánh với điều kiện trúng 1 dòng (Index Scan). Đọc `cost=` của cả hai. | **Đối mặt** ở L1: `pgA L1/10-explain-basics.md` ("Có index, sao vẫn Seq Scan?", predict). **Có nhắc** ở L4: `pgD L4/02-column-statistics.md`. Thiếu ở L2: chưa có bài L2 nào. |
| PG2 | "UPDATE sửa dòng tại chỗ" | L3 | "an `UPDATE` or `DELETE` of a row does not immediately remove the old version" (docs 18, Routine Vacuuming) | Lab `pageinspect`: UPDATE một lần → hai line pointer, `t_xmax` của bản cũ = xid, `t_ctid` trỏ bản mới. Đoán số phiên bản trước khi chạy. | **Đối mặt:** `pgC L3/04-mvcc.md`, `L3/05-xmin-xmax-lab.md`, `L3/07-hot-vs-non-hot-lab.md` |
| PG3 | "VACUUM trả dung lượng cho hệ điều hành" | L3 | "it will not return the space to the operating system" (docs 18, 24.1.2). **Ngoại lệ trong cùng câu:** các trang **cuối bảng** trống hẳn có thể bị cắt nếu lấy được khóa độc quyền. Muốn nhỏ lại thật thì dùng `VACUUM FULL` (khóa ACCESS EXCLUSIVE). | Lab H-B: `pg_relation_size` trước → `DELETE` dòng **ở đầu/giữa** bảng (không xóa đuôi, nếu không bảng co lại và "chứng minh" hiểu lầm) → `VACUUM` → size **giữ nguyên**, `n_dead_tup` về 0 → `INSERT` lại → size vẫn giữ (chỗ trống được dùng lại) → `VACUUM FULL` → size giảm. Bước đầu là `predict` "size sau VACUUM?". Thêm một câu quiz về ngoại lệ trang cuối. | **Chưa có.** `pgC L3/09-vacuum-vm-lab.md` chỉ dùng `pg_relation_size` để đếm trang, không đo trước/sau VACUUM. `pgD L4/09` chỉ nhắc `VACUUM FULL` cần khóa. |
| PG4 | "`count(*)` đọc khóa chính nên tức thì" | L3 | Do MVCC, "PostgreSQL must walk through all rows to determine visibility" (wiki *Slow Counting*). Index Only Scan chỉ bỏ qua heap ở trang all-visible trong visibility map. | `predict` trên `SELECT count(*)` của bảng vừa nạp (chưa VACUUM): lựa chọn "Index Only Scan, 0 heap fetch" là bẫy. Sau `VACUUM`, `Heap Fetches` về 0. Nối thẳng với `L3/09`. | **Có nhắc** (gián tiếp): `pgC L3/09` có `Heap Fetches: 20` cho câu `SELECT id`, nhưng không có bài nào nói về `count(*)` hay niềm tin "count dùng PK". |
| PG5 | "Thêm index là nhanh hơn / nhiều index càng tốt" | L2–L3 | "This adds overhead to data manipulation operations." và "indexes that are seldom or never used in queries should be removed." (docs 18, Indexes Intro). Mỗi index còn chặn HOT update trên cột của nó. | Lab: cùng 1000 UPDATE, bảng 1 index với bảng 4 index, so `pg_stat_user_tables.n_tup_hot_upd` và tổng `pg_relation_size` của các index. Thêm WAL bytes (`pg_walinspect`) nếu có. Thêm câu `quiz` "index nào nên xóa?" đọc `idx_scan = 0`. | **Có nhắc:** `pgC L3/06-hot-vacuum.md`, `L3/07` (mỗi index thêm một mục khi UPDATE không HOT). **Chưa đối mặt:** không có lựa chọn "thêm index cho nhanh" bị bác, và không có bài `idx_scan = 0` (L5 `observe-tune` chưa viết). |
| PG6 | "Index nhiều cột dùng được cho mọi cột trong nó" | L2 | Luật cột đầu; skip scan (PG 18) chỉ giúp khi cột đầu ít giá trị. | `predict` 3 câu trên index `(a, b)`: lọc `a`, lọc `b`, lọc `a, b`. Đáp án kiểm bằng `expect`. | **Chưa có:** L2 `btree-multi` chưa có bài. |
| PG7 | "READ UNCOMMITTED đọc được dữ liệu chưa commit" / "REPEATABLE READ vẫn có phantom" / "SERIALIZABLE là khóa hết, không bao giờ lỗi" | L4 | "PostgreSQL's Read Uncommitted mode behaves like Read Committed." "PostgreSQL's Repeatable Read implementation does not allow phantom reads." "Applications using this level must be prepared to retry transactions due to serialization failures." (docs 18, 13.2) | PGlite có **một phiên**, nên dùng `predict` trên output hai phiên `recorded` (ADD-3) từ Postgres 18 thật: write skew, rồi `40001`. Bài kết thúc bằng quiz "làm gì khi gặp 40001" (đáp án: retry cả transaction). | **Đối mặt:** `pgD L4/12-isolation-levels.md` (quiz phantom, bảng dirty read "chuẩn cho phép, PG không"), `L4/13-serializable-ssi.md` (write skew, 40001). Kiểm lại nhãn "kết quả ghi sẵn" của hai bài này. |
| PG8 | "Index chậm thì REINDEX / index bị 'thoái hóa'" | L5 | "The myth proclaims an index rebuild as the miracle solution." (Use The Index, Luke) | `quiz` trong `index-internals`. Đo kích thước index trước/sau page split, dedup (`pgD L5/01–02`), rồi hỏi "câu chậm vì cây hay vì truy cập bảng?" | **Có nhắc:** `pgD L5/01-btree-page-splits.md` đo trang, nhưng không bác chuyện rebuild. |

### 2.3 MongoDB

| # | Hiểu lầm | Cấp | Sự thật (nguồn) | Bài dẹp đề xuất | Độ phủ |
|---|---|---|---|---|---|
| MG1 | "Schemaless nghĩa là không cần thiết kế" | L1–L2 | "plan your schema prior to using your database at a production scale." và "Model data the way your application code uses it." (MongoDB docs, Data Modeling) | `concept` + `quiz` mở mô-đun `modeling`: hai cách lưu cùng dữ liệu, 3 câu hỏi của ứng dụng, chọn cách khớp access pattern. Lab `$jsonSchema` từ chối một tài liệu sai (mingo kiểm validator được hay không: xem knowledge §1.5; nếu không thì `recorded`). | **Có nhắc:** main `mongodb/path/lessons-p7-12.yml` (validator `$jsonSchema`). **Chưa đối mặt:** mô-đun L2 `modeling` chưa có bài trong `mgA`. |
| MG2 | "`$lookup` giống hệt JOIN của SQL, dùng thoải mái" | L2 | "Performs a left outer join to a collection in the _same_ database". "Unindexed or correlated-subquery `$lookup` operations on large collections can slow down query performance." Docs cũng khuyên "consider an embedded data model to store related data in a single collection" (MongoDB docs, `$lookup`). | (a) lab trên mingo: `$lookup` luôn trả **mảng**, kể cả rỗng (LEFT OUTER): đoán số tài liệu không có cặp trước khi chạy; (b) `predict` trên `recorded` explain: không có index ở `foreignField` thì mỗi tài liệu ngoài quét cả collection trong; (c) quiz "nhúng hay `$lookup`" cho truy vấn chạy 1000 lần/giây. | **Có nhắc:** `mgA L2/08-lookup.md` dạy "luôn trả mảng", tìm tài liệu không cặp. **Chưa có:** chi phí, index `foreignField`, và câu "LEFT OUTER" (0 lần nhắc "index" trong file). |
| MG3 | "Thứ tự trường trong index kép không quan trọng" | L3 | Thứ tự quyết định vùng khóa được quét và có phải sort trong bộ nhớ không. | `predict` trên `recorded` `explain("executionStats")`: cùng câu, index `{a,b}` vs `{b,a}`, đọc `totalKeysExamined`. Lab `catalog` theo luật ESR thuần (mingo không có index, nên phải nói rõ "chấm theo luật"). | **Đối mặt:** `mgB L3/05-esr.md` (mục tiêu "thứ tự trường quyết định vùng quét"), `L3/07-predict-key-count.md` |
| MG4 | "ESR là luật cứng" (hoặc ngược lại: không biết ESR) | L3 | "Ensure that equality fields always come first." và "To avoid an in-memory sort, place the range filter after the sort predicate." Trang ESR cũng nói khi range rất chọn lọc thì đặt range trước sort (ERS), mở đầu bằng "In most cases, applying the ESR…" (MongoDB docs, ESR guideline) | `predict` cặp: ESR tránh được `SORT` stage; ERS thắng khi range chỉ trúng vài khóa. Đọc `totalKeysExamined` của cả hai. | **Đối mặt:** `mgB L3/05-esr.md` (có ERS), `L3/08-predict-esr-sort.md`, capstone `L5/10` |
| MG5 | "Có transaction rồi thì cứ bọc mọi thứ vào transaction" | L4 | "a distributed transaction incurs a greater performance cost over single document writes". Transaction "should not be a replacement for effective schema design" (MongoDB docs, Transactions) | Quiz: thao tác một tài liệu đã atomic. Nhúng thì không cần transaction. `recorded` một `TransientTransactionError` để dạy retry. | **Đối mặt:** `mgB L4/09-transactions.md` (quiz "Có cần transaction không?", đáp án "thao tác một tài liệu là atomic"). Còn thiếu ý chi phí hiệu năng. |
| MG6 | "Secondary đọc được ngay cái vừa ghi" / "w:1 là an toàn" | L4–L5 | Read preference, write concern, rollback khi failover | `predict` trên kịch bản failover `recorded`. | **Đối mặt:** `mgB L4/07-concerns.md`, `L4/12-quiz-consistency.md`, `L5/04-predict-failover.md` |

### 2.4 DynamoDB

| # | Hiểu lầm | Cấp | Sự thật (nguồn) | Bài dẹp đề xuất | Độ phủ |
|---|---|---|---|---|---|
| DY1 | "Scan có FilterExpression thì rẻ vì chỉ trả ít item" | L1–L2 | "A filter expression is applied after a `Scan` finishes but before the results are returned." "This limit applies before the filter expression is evaluated." (1 MB; AWS docs, Scan) | Lab dynoxide: cùng Scan có và không có filter, so `ScannedCount` / `Count` / `ConsumedCapacity` (bằng nhau). Đoán RCU trước khi chạy. | **Đối mặt:** `dyA L1/09-query-vs-scan.md`, `L2/02-key-vs-filter.md` |
| DY2 | "GSI đọc nhất quán mạnh như bảng chính" | L3 | GSI "updated asynchronously, using an eventually consistent model". "Global secondary indexes support eventually consistent reads" (AWS docs, GSI) | dynoxide không mô phỏng độ trễ, nên dùng `concept` có sơ đồ đường đi write → bảng → GSI. `quiz`: `ConsistentRead: true` trên GSI → lỗi validation (kiểm trên dynoxide xem có trả lỗi thật không; có thì đây là bước lab). Thêm câu "đọc ngay sau ghi qua GSI thì thấy gì". | **Chưa có.** Mô-đun L3 `secondary` chưa có bài; `dyB L4/08-sparse-gsi.md`, `09-overloaded-gsi.md` không nhắc tính nhất quán. |
| DY3 | "Khóa phân vùng nào cũng được, DynamoDB tự chia tải" (hot key) | L3–L4 | Một khóa nóng dồn tải vào một phân vùng. Ghi rải tải bằng hậu tố ngẫu nhiên hoặc hậu tố tính được ("avoid having a single 'hot' partition key value"; AWS docs, write sharding) | `quiz` tính tải trên một phân vùng (không có lab thật vì dynoxide không có phân vùng vật lý). Lab: ghi theo `date.N`, rồi Query đủ N hậu tố và gộp. | **Đối mặt:** `dyB L4/01-partitions.md`, `L4/03-hot-partition-math.md` (quiz), `L4/04-write-sharding.md`, `L4/05-calculated-suffix.md` (lab) |
| DY4 | "Single-table luôn tốt hơn nhiều bảng" | L3–L4 | AWS liệt kê nhược điểm của single-table ("Learning curve can be steep due to paradoxical design…"; backup, mã hóa, streams dùng chung). Nếu ứng dụng không truy vấn nhiều thực thể cùng lúc thì "multiple table design is a good and sufficient approach" (AWS docs, Data Modeling foundations) | `quiz` hai tình huống: (a) đơn + dòng đơn đọc cùng nhau → single-table; (b) bảng log lịch sử cần lớp Infrequent Access và backup riêng → bảng riêng. Capstone L3 có một bước hỏi "bảng này có nên tách không". | **Chưa có.** `dyB L4/07-adjacency-list.md` chỉ dạy cách làm single-table, không bàn khi nào **không** dùng. Mô-đun L3 `single-table` mới có tên trong `dyA modules.yml`. |
| DY5 | "Query trả hết item khớp trong một lần" | L1 | Tối đa 1 MB mỗi lần. Hết trang khi không còn `LastEvaluatedKey` (AWS docs, Scan/Query). | Lab phân trang. | **Đối mặt:** `dyA L1/10-paginate.md` |
| DY6 | "`Limit` là số item trả về sau filter" | L2 | `Limit` tính **trước** filter (AWS docs, Scan: `Limit` 6 + filter → "six items or fewer") | `predict`: `Limit: 6` + filter → trả mấy item? | **Chưa kiểm:** không thấy bài nào nhắc `Limit` cùng filter (grep `dyA L2`). |

### 2.5 Mười hiểu lầm quan trọng nhất (ưu tiên viết hoặc sửa)

Xếp theo mức nguy hiểm khi đi làm thật × mức phổ biến (phán đoán của người viết, chưa đo trên người học):

1. PG1 index luôn nhanh
2. PG5 nhiều index càng tốt
3. PG3 VACUUM trả dung lượng
4. PG2 UPDATE tại chỗ
5. PG7 isolation
6. DY1 Scan có filter rẻ
7. MG1 schemaless không cần thiết kế
8. MG2 `$lookup` = JOIN
9. DY2 GSI nhất quán mạnh
10. DY4 single-table luôn tốt hơn

Sáu mục còn **thiếu bài đối mặt**: PG3, PG5, MG1, MG2, DY2, DY4. Thêm PG4 (`count(*)`) và PG6 (luật cột đầu, chờ L2).

---

## 3. Thiết kế đánh giá: chấm hiểu, không chấm cú pháp

1. **Chấm kết quả và cơ chế, không chấm chữ.** Repo đã làm đúng việc này: `rows` so kết quả, `plan` so loại nút quét, `catalog` so cấu trúc đã chuẩn hóa. Giữ nguyên, và **không thêm** kiểu chấm so khớp chuỗi câu lệnh.
2. **Một câu hiểu cho mỗi lab.** Sau bước chạy đúng, thêm một `quiz` một câu: "Vì sao con số này như vậy?". Ví dụ: "Size không đổi sau VACUUM vì…". Chạy đúng có thể là chép gợi ý; giải thích đúng thì không. (P2, P5)
3. **Lựa chọn sai lấy từ hiểu lầm, không bịa.** Mỗi `predict`/`quiz` có ít nhất một lựa chọn đến từ §2. Như vậy câu sai cho biết người học **đang tin gì**, dùng được cho phản hồi. Cùng tinh thần với `wrong:` ở ticket.
4. **Đoán có tính điểm, nhưng không phạt.** `predict` đã cho chọn lại không giới hạn. Muốn đo hiểu thật thì ghi **lần chọn đầu** (số liệu thiết bị, không vào Save) để review Product biết bài nào có tỉ lệ sai lần đầu cao. Bài đó dạy được nhiều, hoặc đề mơ hồ.
5. **Chuyển giao ở capstone.** Bước capstone dùng bảng hoặc collection **khác** với bài dạy, và ít nhất một bước là câu "có nên làm không" (đáp án có thể là không), không chỉ "làm thế nào".
6. **Gọi lại có giãn cách.** Bản này không có thẻ Leitner cho Engine. Capstone cấp N+1 gọi lại 1 câu của cấp N (ví dụ L4 hỏi lại HOT của L3) là cách rẻ nhất để có retrieval giãn cách mà không đổi Save.
7. **Trung thực về runtime.** Câu chấm trên `recorded` hoặc luật ESR ghi rõ "chấm theo dữ liệu ghi sẵn / theo luật", không viết "chạy thật" (product design §3.6).

---

## 4. Việc sửa cụ thể cho các agent nội dung

| # | Việc | File / nhánh | Nguyên tắc |
|---|---|---|---|
| F1 | Thêm lab PG3: đo size trước/sau `VACUUM`, xóa dòng **đầu/giữa** bảng, rồi `VACUUM FULL`. Bước đầu là `predict`. Thêm câu quiz về ngoại lệ trang cuối. | `pgC` `postgres/L3/09-vacuum-vm-lab.md` (thêm bước) hoặc bài mới trong `vacuum-hot` | P1, P5 |
| F2 | Thêm `predict` PG4 `count(*)`: trước và sau VACUUM, lựa chọn bẫy "dùng PK, 0 heap fetch". | `pgC` cạnh `L3/09` | P5 |
| F3 | PG5: thêm lựa chọn sai "thêm index cho nhanh" vào quiz của `L3/06`. Viết bài `observe-tune` có `idx_scan = 0`. | `pgC L3/06-hot-vacuum.md`, L5 chưa có | P5 |
| F4 | Viết Postgres **L2** (`btree-multi`, `partial-expr`, `index-types`, `explain-analyze`): chưa có ở bất kỳ nhánh nào. Mỗi mô-đun có một `predict` PG1/PG6 với `expect`. | `content/engine/postgres/L2/` | P1, P6 |
| F5 | Viết mô-đun L3 `memory` (shared buffers, `work_mem` tràn đĩa, đọc `Buffers:`). CMU coi buffer pool là project đầu tiên. | `content/engine/postgres/L3/` | P6 |
| F6 | Gộp hai bộ Postgres L1 (`pgA` và `pgB` cùng `L1/01-*`) trước khi merge, nếu không id sẽ trùng. | `pgA`, `pgB` | — |
| F7 | MG2: thêm vào `08-lookup.md` một câu quiz "LEFT OUTER", một `predict` trên `recorded` explain (không có index `foreignField`), và câu "nhúng hay `$lookup`". | `mgA mongodb/L2/08-lookup.md` | P1, P5 |
| F8 | Viết mô-đun MongoDB L2 `modeling`, mở bằng MG1 (quiz access pattern), kèm `$jsonSchema`. | `content/engine/mongodb/L2/` | P5 |
| F9 | MG5: thêm câu về chi phí hiệu năng (trích docs) vào `why` của `L4/09`. | `mgB mongodb/L4/09-transactions.md` | P5 |
| F10 | Viết DynamoDB **L3** (`secondary`, `single-table`), có DY2 (GSI nhất quán cuối, thử `ConsistentRead` trên dynoxide) và DY4 (khi nào không dùng single-table). | `content/engine/dynamodb/L3/` | P5 |
| F11 | DY4: thêm vào `07-adjacency-list.md` một câu quiz "khi nào nên tách bảng". | `dyB dynamodb/L4/07-adjacency-list.md` | P5 |
| F12 | DY6: thêm `predict` `Limit` + filter. | `dyA dynamodb/L2/02-key-vs-filter.md` | P1 |
| F13 | Mọi `concept` chưa có quiz: thêm ≥ 1 câu có lựa chọn sai lấy từ §2 (ADD-7). Review Product kiểm bằng cột "Độ phủ" ở trên. | toàn bộ | P2 |

---

## 5. Nguồn

**Đã đọc trang (có trích):**

- PostgreSQL 18, Routine Vacuuming: https://www.postgresql.org/docs/18/routine-vacuuming.html
- PostgreSQL 18, Indexes Intro: https://www.postgresql.org/docs/18/indexes-intro.html
  - Trích từ bản `/docs/current/`, cùng nội dung.
- PostgreSQL 18, Transaction Isolation: https://www.postgresql.org/docs/18/transaction-iso.html
  - Trích từ bản `/docs/current/`.
- PostgreSQL wiki, Slow Counting: https://wiki.postgresql.org/wiki/Slow_Counting
- MongoDB, ESR guideline: https://www.mongodb.com/docs/manual/tutorial/equality-sort-range-guideline/
- MongoDB, Transactions: https://www.mongodb.com/docs/manual/core/transactions/
- MongoDB, Data Modeling: https://www.mongodb.com/docs/manual/data-modeling/
- MongoDB, `$lookup`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/
- AWS, DynamoDB Scan: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Scan.html
- AWS, DynamoDB GSI: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html
- AWS, write sharding: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-sharding.html
- AWS, data modeling foundations: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/data-modeling-foundations.html
- CMU 15-445 Fall 2024 schedule: https://15445.courses.cs.cmu.edu/fall2024/schedule.html
- Use The Index, Luke, Slow Indexes: https://use-the-index-luke.com/sql/anatomy/slow-indexes

**Chỉ qua tìm kiếm hoặc tóm tắt (chưa kiểm nguyên văn):**

- Crouch et al. 2004: DOI 10.1119/1.1707018
- Roediger & Karpicke 2006: DOI 10.1111/j.1467-9280.2006.01693.x
- Atkinson, Renkl, Merrill 2003: J. Educ. Psych. 95(4) 774–783
- Miedema, Aivaloglou, Fletcher 2021: DOI 10.1145/3446871.3469759
- Sweller 1988: DOI 10.1207/s15516709cog1202_4
- Kalyuga et al. 2003: DOI 10.1207/S15326985EP3801_4

Ghi chú về sai số:

- Bản Postgres 18 các trang trên có thể khác bản `current` ở vài chữ. Trước khi đưa câu trích vào bài, agent nội dung đọc lại trang `/docs/18/`.
- Cột "Độ phủ" là ảnh chụp lúc 03:04 ngày 2026-11-20. Nhánh worktree còn đang viết, nên chạy lại kiểm tra trước khi merge.
