# Research đối thủ cho khu Database Engine

Người viết: agent Research · 2026-11-20 · chỉ là tài liệu, không code, không build (L218).

**Căn cứ:**

- `product-design-db-engine.md` v2: loại bài, `check`, `viz`, nhãn trung thực, ADD-n.
- `roadmap-v22-v30.md` §1: v22 → v30.
- `decision-log.md`:
  - L215: Engine ưu tiên số 1; ba engine Postgres, MongoDB, DynamoDB.
  - L219: D-E11 có pgvector, không PostGIS; D-E13 không backend trước v30.

**Luật dùng tài liệu này:**

- **Chỉ link hoặc lấy cảm hứng.** Không chép đề, dữ liệu, hình hay chữ của bất kỳ sản phẩm nào dưới đây, kể cả khi licence cho phép.
- **Cột "Licence"** chỉ ghi điều trang chính thức nói ra. Chỗ nào không thấy thì ghi *chưa xác minh* kèm chỗ cần kiểm.
- **Cột "Làm tốt" và "Thiếu"** là đánh giá của agent từ trang công khai, không phải từ dùng thử có tài khoản.

---

## 1. Bảng so sánh

| # | Sản phẩm | Người học làm gì | Làm tốt | Thiếu (so với mục tiêu Engine) | Giá | Licence tài liệu/mã |
|---|---|---|---|---|---|---|
| 1 | **PostgreSQL Exercises** ([pgexercises.com](https://pgexercises.com/about.html)) | Giải bài SQL trên một bộ dữ liệu câu lạc bộ, chạy trên Postgres thật ở server, xem đáp án và lời giải thích | Một bộ dữ liệu xuyên suốt; đáp án kèm giải thích ngắn; có phần sửa dữ liệu | Chỉ dạy SQL, không có index, kế hoạch hay phần bên trong; không có cốt truyện | Miễn phí | Mã: BSD 2-Clause ([LICENSE](https://raw.githubusercontent.com/AlisdairO/pgexercises/master/LICENSE)). Repo ghi một số thư mục con có licence riêng: *chưa xác minh* phần đề |
| 2 | **SQLBolt** ([sqlbolt.com](https://sqlbolt.com/)) | 18 bài ngắn, mỗi bài một khái niệm và một bài tập tương tác trong trình duyệt | Rất ngắn; bài tập ngay sau khái niệm; có bài "thứ tự thực thi" | Không có phần engine, không có kế hoạch; trang không nói chạy engine nào; không lưu tiến độ | Miễn phí | "© SQLBolt", không nêu licence |
| 3 | **SQL Murder Mystery** ([repo](https://github.com/NUKnightLab/sql-mysteries)) | Truy vấn SQLite tìm hung thủ, nộp tên vào bảng `solution` | Một câu hỏi lớn kéo người học đi xa; tự kiểm đáp án | Một màn; không dạy theo bậc; không có phần bên trong | Miễn phí | Mã MIT; chữ và nội dung CC BY-SA 4.0 |
| 4 | **Select Star SQL** ([repo](https://github.com/zichongkao/selectstarsql)) | Đọc một "sách" tương tác, chạy SQL ngay trong trang, trên dữ liệu thật | Chữ dẫn dắt bằng câu hỏi trên dữ liệu thật; editor nằm giữa bài | Chỉ có SQL; repo gắn tag SQLite (README không nêu engine) | Miễn phí | Chữ CC BY-SA 4.0; mã và dữ liệu CC0 |
| 5 | **Use The Index, Luke** ([use-the-index-luke.com](https://use-the-index-luke.com/)) | Đọc sách online về index và tối ưu (Db2, MySQL, Oracle, PostgreSQL, SQL Server); làm "3-Minute Quiz" | Giải thích B-tree và luật cột đầu rất rõ; quiz ngắn, mỗi câu có lời giải | Không chạy được trong trang; không có phần MVCC/WAL; sách đầy đủ phải mua | Sách online miễn phí; sách *SQL Performance Explained* có phí | © Markus Winand, "All rights reserved". Chỉ được link |
| 6 | **explain.dalibo.com / PEV2** ([repo](https://github.com/dalibo/pev2)) | Dán kế hoạch `EXPLAIN`, xem cây đồ họa và chia sẻ link | Cây kế hoạch dễ đọc, làm nổi nút đắt; dùng được offline bằng một file HTML | Là công cụ, không dạy; người dùng phải tự có Postgres | Miễn phí | PostgreSQL License (theo trang repo). **Không nhúng**: thêm dependency cần duyệt và kéo Vue + Bootstrap |
| 7 | **explain.depesz.com** ([source](https://gitlab.com/depesz/explain.depesz.com/-/forks), [Pg::Explain](https://metacpan.org/source/DEPESZ/Pg-Explain-2.8/README)) | Dán kế hoạch, xem bảng tô màu thời gian riêng của từng nút | Tách "thời gian riêng" và "thời gian gồm con"; bội số sai lệch ước lượng | Không giải thích ý nghĩa nút; không dạy | Miễn phí | Pg::Explain: "same terms as Perl itself". Mã site: *chưa xác minh* (blog nói Perl terms, bình luận nói BSD) |
| 8 | **Crunchy Data Postgres Playground** ([tutorials](https://www.crunchydata.com/developers/tutorials), [blog](https://www.crunchydata.com/blog/crazy-idea-to-postgres-in-the-web-browser)) | Làm hướng dẫn từng bước trên Postgres thật chạy trong trình duyệt (VM Alpine trên v86), dùng `psql`, có quyền superuser | Postgres thật, có cả quản trị (RLS, role, bloat, cache hit, partition); dữ liệu nạp sẵn | Không chấm bài; không lưu; tải VM nặng; không có sơ đồ bên trong; chỉ tiếng Anh | Miễn phí | Trang không nêu licence; theo báo chí thì không mở mã. Chỉ link |
| 9 | **Supabase docs** ([supabase.com/docs](https://supabase.com/docs)) + **postgres-wasm** ([blog](https://supabase.com/blog/postgres-wasm)) + **database.build** | Đọc hướng dẫn Postgres (RLS, index, extension); thử sandbox Postgres trong trình duyệt | Hướng dẫn RLS và index thực dụng; postgres-wasm chứng minh `psql`/`pg_dump` chạy trong trình duyệt | Tài liệu sản phẩm, không có lộ trình học hay chấm bài | Miễn phí | *Chưa xác minh* licence nội dung docs |
| 10 | **Neon / Electric PGlite demo** ([pglite.dev/examples](https://pglite.dev/examples), [REPL](https://pglite.dev/docs/repl)) | Chạy REPL Postgres WASM trong trang; xem ví dụ pg_dump, FTS, copy | Khởi động nhanh, không VM; có sẵn bộ contrib gồm `pageinspect`, `pg_visibility`, `pg_walinspect`, `pg_buffercache`, `pg_freespacemap`, `amcheck`, `pg_stat_statements` ([extensions](https://pglite.dev/extensions/)) | Chỉ là demo kỹ thuật, không có bài học | Miễn phí | BoonData đã dùng PGlite. *Chưa xác minh* licence trang demo |
| 11 | **MongoDB University** ([learn.mongodb.com/skills](https://learn.mongodb.com/skills)) | Khóa tự học có lab và quiz; Skill Badge (Credly); lộ trình chứng chỉ | Badge nhỏ theo chủ đề (mô hình dữ liệu, truy vấn, hiệu năng); lab trên Atlas thật | Cần tài khoản và Atlas; chỉ tiếng Anh; ít phần bên trong (WiredTiger, oplog) có lab; thi chứng chỉ có phí | Khóa và badge miễn phí; thi có phí (giảm 50 % sau lộ trình, [blog](https://mongodb.com/company/blog/news/introducing-a-more-connected-flexible-path-to-certifications)) | Độc quyền. Chỉ link |
| 12 | **Mongo Playground** ([mongoplayground.net](https://mongoplayground.net), repo `feliixx/mongoplayground`) | Dán dữ liệu + truy vấn/aggregate, chạy trên `mongod` ở server, chia sẻ link | Tái hiện lỗi nhanh, chia sẻ được; `explain` thật | Không dạy; không có bài; cần server | Miễn phí | AGPL-3.0 theo chỉ mục bên thứ ba ([ecosyste.ms](https://awesome.ecosyste.ms/projects/github.com%2Ffeliixx%2Fmongoplayground)): *chưa xác minh* tại repo. AGPL: tuyệt đối không lấy mã |
| 13 | **AWS DynamoDB workshops** (repo `aws-samples/amazon-dynamodb-labs`) | Lab theo kịch bản trên tài khoản AWS: thiết kế bảng, GSI, single-table, kịch bản thiết kế | Bài thiết kế xuất phát từ mẫu truy cập; có lời giải | Cần AWS (tốn tiền, mất công); không chấm tự động | Workshop miễn phí, tài nguyên AWS có phí | README ghi Apache-2.0 (theo [ecosyste.ms](https://awesome.ecosyste.ms/projects/github.com%2Faws-samples%2Famazon-dynamodb-labs)); `amazon-dynamodb-design-patterns` ghi MIT-0. Vẫn chỉ lấy cảm hứng |
| 14 | **NoSQL Workbench** ([AWS docs](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/workbench.html)) | Ứng dụng desktop: vẽ bảng và GSI, nhập dữ liệu mẫu, chạy thao tác của mẫu truy cập trên DynamoDB local | Xem dữ liệu theo **GSI** (cùng item, khóa khác); mô hình mẫu; sinh mã | Phải cài; không dạy vì sao; không chấm | Miễn phí | Công cụ của AWS, không phải tài liệu mở. Chỉ link |
| 15 | **Alex DeBrie** ([dynamodbguide.com](https://www.dynamodbguide.com/), *The DynamoDB Book*) | Đọc hướng dẫn từ cơ bản tới single-table; sách có nhiều ví dụ đầy đủ | Bắt đầu từ mẫu truy cập; ví dụ thiết kế khóa thật | Không tương tác; sách đầy đủ có phí | Guide miễn phí; sách có phí | Guide: *chưa xác minh* ([repo](https://github.com/alexdebrie/dynamodbguide.com)). Sách: thương mại |
| 16 | **USFCA Data Structure Visualizations** ([about](https://www.cs.usfca.edu/~galles/visualization/about.html)) | Chèn/xóa khóa và xem B-tree, B+ tree, hash tách từng bước | Từng bước, người học tự chọn khóa; tốc độ chỉnh được | Cây trừu tượng, không phải trang Postgres thật; giao diện cũ; không có câu hỏi | Miễn phí | "Licensed under FreeBSD", tác giả muốn được báo khi dùng. BoonData vẫn tự vẽ (`pg-btree-split`) |
| 17a | **The Internals of PostgreSQL** ([interdb.jp/pg](https://www.interdb.jp/pg/)) | Đọc 12 chương: cluster, xử lý câu, MVCC, VACUUM, HOT, buffer, WAL, PITR, replication | Sâu, đúng thứ tự L3–L5 của BoonData; hình minh họa rõ | Chỉ đọc; không có bài thực hành | Miễn phí | © Hironobu Suzuki, all rights reserved. Dùng thương mại phải trả phí. **Chỉ link** |
| 17b | **CMU 15-445/645** ([FAQ](https://15445.courses.cs.cmu.edu/fall2025/faq.html), [BusTub](https://github.com/cmu-db/bustub)) | Nghe bài giảng; tự viết buffer pool, B+ tree, executor, lock manager trong BusTub (C++) | Học bằng cách tự xây; bộ test cục bộ | Khó với data analyst; autograder chỉ cho sinh viên; video công khai tùy học kỳ | Miễn phí | BusTub MIT theo bên thứ ba: *chưa xác minh* |

**Rút ra từ bảng:**

- **Ba nhóm, không ai phủ cả ba:**
  - *Dạy SQL có chấm bài* (1–4): không đụng phần bên trong.
  - *Công cụ* (6, 7, 10, 12, 14): mạnh, nhưng người dùng phải tự biết dùng vào việc gì.
  - *Đọc và lý thuyết* (5, 15, 16, 17): sâu, nhưng không có tay làm.
- **Crunchy (8)** gần BoonData nhất: Postgres thật trong trình duyệt, có superuser. Nhưng nó không chấm bài, không lưu tiến độ và không có sơ đồ bên trong.

---

## 2. Mười tính năng đáng áp dụng cho Database Engine

Mọi mục dưới đây đều theo các luật đã chốt:

- không backend (D-E13);
- không khóa bài (`requires` chỉ là chip);
- không dependency chưa duyệt;
- không có chữ "sắp có";
- không chép nội dung của ai.

Cỡ việc: S ≤ 1 ngày agent, M 2–4 ngày, L ≥ 1 tuần (ước lượng).

| # | Tính năng | Lấy ý từ | Đặt ở đâu trong BoonData | Giá trị | Cỡ |
|---|---|---|---|---|---|
| F1 | **Cây kế hoạch có "chi phí riêng" và cờ "ước lượng lệch ×N"** cạnh mỗi nút. Thanh ngang theo chi phí riêng (planner cost; `ANALYZE` chỉ ở bài `explain-analyze`), cờ khi `rows` ước lượng và thực tế lệch ≥ 10× | PEV2 (6), depesz (7) | Tab "Bên trong" của bài `predict`/`lab` Postgres; mô-đun `explain-analyze` (v23), `planner-stats` (v25). Tự viết trên `src/viz/plan.ts` sẵn có, **không nhúng PEV2** | Người học thấy ngay nút đắt và chỗ thống kê sai, đúng câu "Học xong" của `explain-analyze` và `planner-stats` | M |
| F2 | **Nút "Mở kế hoạch này ở công cụ ngoài"**: chép JSON kế hoạch vào clipboard, kèm link explain.dalibo.com và explain.depesz.com | 6, 7 | Cạnh F1. Chỉ là link và clipboard, không gửi dữ liệu đi đâu | Cầu nối sang công cụ người đi làm thật dùng; không tốn ngân sách | S |
| F3 | **"Mẫu truy cập trước, khóa sau"**: bảng 6 mẫu truy cập ở đầu bài; mỗi mẫu có ô ✓ khi đã có một Query (không Scan) phục vụ nó | AWS workshop (13), DeBrie (15) | DynamoDB `single-table`, `secondary` và capstone L3 (v29); kiểm bằng `catalog` + `doc` đã có | Biến lời khuyên "thiết kế theo mẫu truy cập" thành bài chấm được | M |
| F4 | **Xem bảng theo GSI**: cùng item, xếp lại theo khóa của từng GSI; item không có thuộc tính khóa thì mờ đi (sparse index) | NoSQL Workbench (14) | Tab "Bên trong" lab DynamoDB (v29); sơ đồ `dy-gsi` | Người học *thấy* vì sao GSI là "một bảng khác" và sparse index tiết kiệm | M |
| F5 | **B-tree từng bước do người học chọn khóa**, rồi đối chiếu với trang index thật (`bt_page_items`) sau cùng thao tác | USFCA (16) | `viz: pg-btree-split` + lab `index-internals` (v26); "Đoán trước khi xem" của §5 | Nối hình trừu tượng với byte thật, điều USFCA không có | M |
| F6 | **Quiz 3 phút đầu cấp**: 5 câu chẩn đoán trước mỗi cấp Postgres; câu sai trỏ tới mô-đun cần học. Không khóa, không lưu điểm | Use The Index, Luke (5) | Trang cấp `#/engine/postgres/l<n>`, `kind: quiz`. Không cần trường mới | Người biết rồi đi thẳng tới chỗ cần; người mới biết mình bắt đầu từ đâu | S |
| F7 | **Một câu hỏi lớn xuyên cấp** (kiểu murder mystery, nhưng không phải án mạng): ví dụ "Vì sao bảng sự kiện chậm và phình?". Mỗi capstone trả lời một phần, capstone L5 khép lại | SQL Murder Mystery (3) | `capstone` L1–L5 Postgres (v22–v26). Chỉ là nội dung, giữ luật Engine không nhắc domain (§7.2) | Giữ động lực qua 66 bài khô; capstone có lý do tồn tại | S (nội dung) |
| F8 | **Bản ghi phiên `psql` ghi sẵn cho phần BE**: hai phiên A/B xen kẽ theo dòng thời gian (khóa chờ, deadlock, `40001`), người học bấm từng bước và đoán dòng kế tiếp | Crunchy (8), Mongo Playground (12) | Bài D `locks` (v25), `replication-ops` (v26), Mongo `consistency` (v28); dùng `recorded` (ADD-3). **Đã có ý ở v2, làm sắc hơn**: thêm khung "hai cột thời gian" cho `viz` | Phần không chạy được trong trình duyệt vẫn có tay làm (đoán) và có nhãn trung thực | M |
| F9 | **"Chạy lại từ đầu" dữ liệu của lab** + **link chia sẻ trạng thái bài** (hash chứa id bài + bước, không chứa SQL người học) | Mongo Playground (12), PEV2 (6) | Workspace mode `engine` (v22): nút đặt lại = dựng lại schema `engine` bằng `setup`. Link chia sẻ dùng route `#/engine/play/<id>` sẵn có | Người học dám thử `VACUUM`/`DROP`; giáo viên gửi đúng bài cho lớp | S |
| F10 | **Badge nhỏ theo mô-đun**: mỗi câu "Học xong bạn làm được…" đạt thì thành một huy hiệu trong `#/me`, suy ra từ `completed`, không lưu thêm | MongoDB University Skill Badges (11) | Khối Engine trong `#/me` (§7.4) + `doneBadge()` có sẵn; v26 cho Postgres, v28/v29 cho hai engine kia | Mục tiêu nhỏ, đo được, không cần Save mới; đúng tinh thần ADD-1 | S |

**Đã có trong v2, chỉ cần giữ và làm sắc hơn** (không tính vào 10 mục):

- `predict` "đoán trước, xem thật": Use The Index, Luke chỉ có quiz, BoonData chạy thật.
- Nhãn trung thực §3.6.
- Tab "So với SQL" của MongoDB.
- Sơ đồ bấm từng bước §5.

---

## 3. Năm cái bẫy cần tránh

| # | Bẫy | Thấy ở đâu | Cách BoonData tránh |
|---|---|---|---|
| P1 | **Sân chơi không có bài**: cho Postgres thật nhưng không chấm, không nói "xong chưa", nên người học bỏ giữa chừng | Crunchy (8), PGlite REPL (10), Mongo Playground (12) | Mọi bài có `check` hoặc `quiz` (ADD-7, cổng §8). Sandbox tự do đã có ở chỗ khác, Engine không làm sân chơi thứ hai |
| P2 | **Bắt cài đặt hoặc mở tài khoản trước bài đầu**: AWS, Atlas, ứng dụng desktop, VM vài chục MB | 11, 13, 14, 8 | Tải lười theo cấp; báo trước dung lượng ("Tải bộ máy DynamoDB 1,2 MB"); không bao giờ cần tài khoản |
| P3 | **Sách đọc dài không có tay làm**: người học không có cách kiểm mình hiểu chưa | 5, 15, 17a | `concept` ≤ 150 từ một khối + câu kiểm; link tới sách hay ở mục "Nguồn", không viết lại sách |
| P4 | **Giả lập mà không nói là giả lập**: người học tin kết quả mingo/dynoxide là của `mongod`/AWS | (rủi ro của chính BoonData) | Nhãn §3.6 trên mọi bài; luật ESR ghi "chấm theo luật, không phải `mongod`"; số liệu có `recorded` và ngày |
| P5 | **Vay nội dung hoặc mã có licence ràng buộc**: chép hình interdb, đề pgexercises, mã AGPL của Mongo Playground, nhúng PEV2 không qua duyệt | 3, 4 (CC BY-SA, phải chia sẻ cùng licence), 12 (AGPL), 17a (all rights reserved) | Chỉ link hoặc lấy ý. Dữ liệu và đề tự viết. Mọi thứ bên thứ ba vào `THIRD_PARTY.md` trong cùng commit. Test nội dung không cần kiểm: đây là luật review |

---

## 4. Chỗ trống chỉ BoonData lấp được

Phạm vi nhận định: Crunchy cũng có Postgres thật trong trình duyệt và có superuser, nên "Postgres chạy trong trình duyệt" **không** phải điểm riêng. Điểm riêng là ba thứ sau, gộp lại.

1. **Lab phần bên trong lưu trữ có chấm bài, chạy thật trên Postgres 18.**
   - PGlite đóng gói sẵn `pageinspect`, `pg_visibility`, `pg_walinspect`, `pg_buffercache`, `pg_freespacemap`, `amcheck`, `pg_stat_statements` ([pglite.dev/extensions](https://pglite.dev/extensions/)).
   - Người học UPDATE một dòng rồi soi `xmin/xmax/ctid` trên trang heap thật (L3 `pages`, `mvcc`), đọc bản ghi WAL của chính câu INSERT mình vừa chạy (`wal`), và bài được chấm.
   - Không sản phẩm nào trong bảng làm việc này: interdb (17a) chỉ có chữ, CMU (17b) dùng BusTub chứ không phải Postgres, Crunchy (8) không chấm.
2. **Song ngữ VI/EN từ đầu tới cuối.**
   - Mọi sản phẩm trong bảng chỉ có tiếng Anh. Bản tiếng Trung của interdb là sách in.
   - BoonData giữ code giống hệt giữa VI và EN, nên người Việt học bằng tiếng mẹ đẻ mà vẫn quen từ khóa gốc.
3. **Bối cảnh câu chuyện + ba engine trên cùng một nền.**
   - Câu hỏi lớn của capstone (F7) và linh vật Boon/Lily cho phần khô nhất (MVCC, WAL) một lý do để học.
   - Postgres, MongoDB và DynamoDB nằm trên cùng dữ liệu cửa hàng (`lab` → `mongo-lab` → `Shop`). Người học so sánh được ba cách cho cùng một câu hỏi. Không nơi nào trong bảng có ba engine với cùng dữ liệu.
4. **Không backend, không tài khoản, lưu tiến độ.** Khác 8, 11, 12, 13: mở link là học, đóng tab vẫn còn tiến độ.

---

## 5. Nguồn (chỉ những trang agent đã mở hoặc thấy trong kết quả tìm)

- https://pgexercises.com/about.html · https://raw.githubusercontent.com/AlisdairO/pgexercises/master/LICENSE
- https://sqlbolt.com/
- https://github.com/NUKnightLab/sql-mysteries
- https://github.com/zichongkao/selectstarsql
- https://use-the-index-luke.com/
- https://github.com/dalibo/pev2
- https://metacpan.org/source/DEPESZ/Pg-Explain-2.8/README · https://gitlab.com/depesz/explain.depesz.com/-/forks
- https://www.crunchydata.com/developers/tutorials · https://www.crunchydata.com/blog/crazy-idea-to-postgres-in-the-web-browser · https://crunchydata.com/blog/learn-postgres-at-the-playground
- https://supabase.com/docs · https://supabase.com/blog/postgres-wasm · https://database.build/
- https://pglite.dev/examples · https://pglite.dev/docs/repl · https://pglite.dev/extensions/
- https://learn.mongodb.com/skills · https://mongodb.com/company/blog/news/introducing-a-more-connected-flexible-path-to-certifications
- https://mongoplayground.net · https://awesome.ecosyste.ms/projects/github.com%2Ffeliixx%2Fmongoplayground
- https://awesome.ecosyste.ms/projects/github.com%2Faws-samples%2Famazon-dynamodb-labs
- https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/workbench.html
- https://www.dynamodbguide.com/ · https://github.com/alexdebrie/dynamodbguide.com
- https://www.cs.usfca.edu/~galles/visualization/about.html
- https://www.interdb.jp/pg/
- https://15445.courses.cs.cmu.edu/fall2025/faq.html · https://github.com/cmu-db/bustub
