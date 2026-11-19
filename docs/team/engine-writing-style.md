# Cách viết bài Database Engine (VI/EN)

Người viết: agent Docs · 2026-11-20 · Chỉ là tài liệu, không code, không build (L218).

**Dùng cho:** mọi agent viết hoặc review bài `content/engine/**` (PostgreSQL, MongoDB, DynamoDB, L1–L5).

**Thứ tự ưu tiên khi hai tài liệu nói khác nhau:**

1. `decision-log.md` (L215–L219, và L mới hơn).
2. `product-design-db-engine.md` v2: định dạng ENGINE-CONTENT-V1, loại bài, nhãn trung thực §3.6.
3. **`content/engine/glossary.yml`**: chữ nào dùng cho thuật ngữ nào. Đây là nguồn duy nhất về thuật ngữ Engine.
4. Tài liệu này: giọng văn, số, đơn vị, code, checklist.
5. `engine-pedagogy.md`: cấu trúc từng loại bài và danh mục hiểu lầm.
6. `glossary-vi.md`: quy tắc VI/EN chung của game. Áp cho Engine trừ chỗ glossary Engine chốt khác (index, transaction, lock).

**Sự thật và con số** chỉ lấy từ `db-engine-knowledge.md` (nguồn `[Sn]`) hoặc docs chính thức đã mở đọc. Chỗ knowledge doc ghi "(chưa đối chiếu)" thì viết chung, không ghi con số.

---

## 1. Giọng văn

### 1.1 Chung

- **VI trước, rồi `# EN`** với cùng các mục (`## Ý chính` ↔ `## Key idea`, `## Ví dụ` ↔ `## Example`, `## Thực hành` ↔ `## Practice`).
- Gọi người học là **"bạn"**. Câu chủ động, ngắn, mỗi câu một ý. Không "chúng ta hãy cùng…", không "như đã biết".
- Bài Engine là văn dạy kỹ thuật, không phải lời đồng nghiệp: được dùng backtick, tên bảng, tên hàm, từ khóa SQL viết hoa. Luật `SQLISH` của ticket không áp ở đây.
- Mở `concept` bằng **một câu hỏi hoặc tình huống**, không mở bằng định nghĩa: "UPDATE một dòng 1 lần, bảng có thêm mấy phiên bản?"
- Gặp hiểu lầm (danh mục ở `engine-pedagogy.md` §2) thì viết thẳng: "Nhiều người nghĩ X. Thật ra Y, vì Z." Sau đó đưa con số làm bằng chứng.
- **Không bao giờ dùng:**
  - "boss", "sự cố" (L22);
  - "sắp có", "coming soon", "later" (`tests/noDeadEnds.test.ts`);
  - mili giây làm bằng chứng hay tiêu chí chấm (luật ch11). Bằng chứng là thứ đếm được: `cost=`, `Buffers`, `Heap Fetches`, `n_dead_tup`, `pg_relation_size`, `totalKeysExamined`, `ScannedCount`, `ConsumedCapacity`.
- **Linh vật:** Boon chỉ nói trong UI (guide, hint). Thân bài không đóng vai Boon hay Lily.

### 1.2 Bản EN

- Viết lại cho tự nhiên, không dịch từng chữ. Cùng ý, cùng số, cùng code.
- **Không có dấu tiếng Việt**, kể cả tên riêng. Ký hiệu `…`, `→`, `≤` thì được.
- Không bao giờ chú thích ngược sang tiếng Việt: viết "page", không viết "page (trang)".
- Mỗi cụm `` `…` `` và mỗi khối code phải **giống hệt** bản VI, cùng thứ tự. Đã có chữ Việt trong code span thì sửa cả hai bản cho chung một chữ tiếng Anh.

---

## 2. Thuật ngữ

### 2.1 Tra glossary trước khi viết

Mỗi mục trong `content/engine/glossary.yml` có `keep_en`, `vi_term` và `avoid`.

| `keep_en` | Lần đầu trong bài (VI) | Các lần sau (VI) | EN |
|---|---|---|---|
| `false` | `vi_term (term)`, ví dụ "trang (page)", "khóa phân vùng (partition key)" | `vi_term` | `term` |
| `true` | `vi_term`, kèm một câu giải thích ngay sau. Có thể thêm "(từ Việt)" khi giúp hiểu, ví dụ "index (chỉ mục)", "partition key (khóa phân vùng)" | `vi_term` (chữ Anh, đôi khi kèm từ Việt: "index nhiều cột", "luật ESR") | `term` |

- **Lần đầu** tính theo từng bài (mỗi file `.md`), không theo mô-đun. Người học có thể mở bài giữa chừng.
- **Không bao giờ dùng chữ ở cột `avoid`.**
- Từ chưa có trong glossary thì thêm mục mới vào glossary **trong cùng commit** với bài, đủ 9 trường. Không tự đặt cách dịch trong bài.

### 2.2 Bốn va chạm đã chốt (nhắc lại từ đầu glossary)

1. **"khóa" chỉ là key.** Lock giữ tiếng Anh: "lock", "row lock", "advisory lock", "deadlock". Viết "giữ lock", "chờ lock", không viết "khóa dòng".
2. **"tài liệu" chỉ là document của MongoDB.** Documentation viết là "docs chính thức". Nhãn bài không chạy là "Sơ đồ" (§4), không phải "tài liệu".
3. **"phân vùng" chỉ dùng cho Postgres:** "bảng phân vùng (partitioned table)". DynamoDB giữ tiếng Anh "partition", "partition key", "sort key", như các bài DynamoDB đã viết; lần đầu viết "partition (phân vùng vật lý)", "partition key (khóa phân vùng)", "sort key (khóa sắp xếp)". `PARTITION BY` của hàm cửa sổ không phải phân vùng.
4. **Engine giữ chữ "index"**, lần đầu viết "index (chỉ mục)". Lý do: tên loại index (GIN, BRIN), tên nút (`Index Scan`), stage (`IXSCAN`) đều là tiếng Anh. Khu SQL/General vẫn dùng "chỉ mục" theo `glossary-vi.md`. Không trộn hai cách trong một bài.

Thêm:

- **"transaction"** giữ tiếng Anh. Finance dùng "giao dịch" cho giao dịch tiền.
- **"dòng"** = row. "Hàng" chỉ dùng cho hàng hóa.
- Một chữ có nghĩa khác nhau theo engine thì **nói rõ engine** ngay câu đó: snapshot, projection, TTL, checkpoint, partition, rollback.

### 2.3 Viết hoa và tên riêng

- **Viết y như output thật:**
  - tên nút kế hoạch Postgres: `Seq Scan`, `Index Only Scan`, `Bitmap Heap Scan`;
  - stage explain MongoDB: `COLLSCAN`, `IXSCAN`, `FETCH`;
  - tên API DynamoDB theo PascalCase: `Query`, `Scan`, `PutItem`, `ConditionalCheckFailedException`.
- Tên nút, stage, API, tham số, hàm, cột hệ thống: để trong backtick khi viết đúng như nhập/đọc trên máy (`xmin`, `work_mem`, `nReturned`). Nói về khái niệm thì không cần backtick ("một Seq Scan đọc mọi trang").
- Từ khóa SQL: HOA khi nói về cú pháp (`VACUUM FULL`, `CREATE INDEX`); khi là tên cơ chế trong văn thì viết như glossary ("VACUUM dọn dead tuple").
- Tên sản phẩm giữ nguyên: PostgreSQL, MongoDB, DynamoDB, PGlite, WiredTiger, mingo, dynoxide. Trong văn có thể gọi tắt "Postgres".
- Mức cô lập viết như docs: Read Committed, Repeatable Read, Serializable.

---

## 3. Số, đơn vị, ngày, phiên bản

| | VI | EN |
|---|---|---|
| Thập phân | dấu phẩy: `1,5 MB`, `0,25` | dấu chấm: `1.5 MB`, `0.25` |
| Hàng nghìn | dấu chấm: `50.000 dòng`, `40.000 RCU` | dấu phẩy: `50,000 rows`, `40,000 RCU` |
| Phần trăm | `77 %` | `77%` |
| Khoảng | `1–2048 byte` (gạch ngang dài) | `1–2048 bytes` |
| Thời gian | `60 giây`, `5 phút`, `24 giờ` | `60 seconds`, `5 minutes`, `24 hours` |

- **Có khoảng trắng** giữa số và đơn vị: `8 KB`, `400 KB`, `16 MiB`.
- **Đơn vị dung lượng:**
  - Dùng `KB`/`MB`/`GB` theo nghĩa nhị phân (1 KB = 1024 byte), như docs Postgres và AWS.
  - Riêng giới hạn mà docs MongoDB ghi bằng MiB thì giữ `MiB` (`16 MiB` mỗi tài liệu).
  - Không viết `kB`, `Kb`, `kb` trong văn.
- **Số có ít chữ số** (< 10.000, không có phần thập phân) viết liền ở cả hai bản: `8192`, `2048`, `1000`. Như vậy VI và EN giống nhau, khỏi lo dấu.
- **Trong code span và khối code, giữ đúng cú pháp nguồn** và giống hệt nhau giữa VI/EN: `work_mem = '4MB'`, `Disk: 1976kB`, `cost=0.00..35.50`, `rows=1000`. Không đổi dấu chấm trong output thành dấu phẩy.
- **Trích con số từ output** thì trích nguyên văn trong backtick (`Heap Fetches: 0`), rồi mới diễn giải bằng chữ.
- **Ngày:** ISO `2026-11-20` ở cả hai bản.
- **Phiên bản:** "PostgreSQL 18.6", "MongoDB 8.0", "PGlite 0.5.16". Bài MongoDB ghi "đúng với 8.x" như product design §1.1.
- **Cost của Postgres không có đơn vị:** viết "cost 35,5" trong văn VI, `cost=35.50` khi trích output.

---

## 4. Nhãn trung thực về runtime

**Trường `runtime` trong frontmatter** (các bài đã viết dùng, parser V1 chưa đọc):

- `runtime: browser` chỉ khi mọi bước chấm chạy thật trên PGlite, mingo hoặc dynoxide.
- Còn lại là `runtime: docs`: sơ đồ, quiz, explain/output ghi sẵn, hoặc trích từ docs chính thức. Không ghi `browser` cho bài chỉ có một bước chạy và phần dạy chính là sơ đồ.

Nhãn hiện trên trang dùng **nguyên văn** bảng của product design §3.6. Không tạo nhãn mới.

| Nhãn | Khi nào |
|---|---|
| "Chạy thật · PostgreSQL 18.6 (PGlite)" | bài có `lab` hoặc `predict` trên postgres |
| "Chạy bằng mingo (ngôn ngữ truy vấn MongoDB)" | lab MongoDB |
| "Chạy bằng dynoxide (giả lập DynamoDB)" | lab DynamoDB |
| "Kết quả ghi từ <server> <version>, ngày …" | có `recorded` (ADD-3) |
| "Sơ đồ" | `concept`/`quiz` không có lab |

**Bài BE** (cần nhiều phiên, replica set, AWS thật) thêm đúng dòng: "Phần chạy thật cần máy chủ thật (nhiều phiên / replica set / AWS). Bài này dùng sơ đồ và kết quả ghi sẵn". Theo D-E13 (L219), có thể nói ngắn là "chưa chạy trong trình duyệt".

**Trong thân bài:**

- Không viết "chạy thử", "bạn sẽ thấy" cho thứ runtime không chạy được. Ví dụ:
  - mingo không có index và `explain()`;
  - dynoxide không có throttle, `TransactWriteItems`, độ trễ GSI;
  - PGlite không có parallel, JIT, logical decoding, nhiều phiên.

  Các phần này viết "trên server thật, kết quả là…" và trích output `recorded`.
- Câu chấm theo luật, không theo server, ghi rõ: "chấm theo luật ESR, không phải `mongod`".
- **Output trích từ docs chính thức** (không chạy, không ghi từ server của nhóm) thì nói đúng như vậy ngay trước khối output: "Ví dụ trong docs chính thức của <engine> (chưa chạy trong trình duyệt):" / "Example from the official <engine> docs (not run in the browser):". Thêm URL trang đó vào `sources:`. Không gắn nhãn "Kết quả ghi từ…" cho output loại này.
- Bài dựa trên số đo của knowledge doc thì ghi phiên bản đã đo (PGlite 0.5.16 = PostgreSQL 18.6).

---

## 5. Code

**Luật chung:**

- Code giống hệt nhau giữa VI và EN. Comment trong code viết **tiếng Anh, không dấu**, hoặc không có comment.
- Dữ liệu tất định: không `now()`, `CURRENT_DATE`, `Date.now()`, `new Date()` không tham số, `uuidv7()` trong `solution` hay `setup` cần kết quả cố định. Ngày viết thẳng giá trị.
- Tên bảng, collection, thuộc tính bằng tiếng Anh, theo đúng `setup` của bài.

### 5.1 SQL (PostgreSQL)

- Từ khóa VIẾT HOA. Tên bảng/cột `snake_case` chữ thường. Thụt 2 dấu cách, mỗi mệnh đề lớn một dòng khi câu dài hơn một dòng.
- **Câu người học và `solution`:** đúng **một** câu, không có `;` ở cuối (PGlite từ chối nhiều câu; ticket cũng viết vậy). Bước có `ordered: true` phải có `ORDER BY` với tiebreaker đủ.
- **`setup`:** nhiều câu, mỗi câu kết thúc bằng `;`. Tên đối tượng cố định, không lấy từ chữ người chơi.
- `EXPLAIN` không ANALYZE khi bước chấm bằng `plan`. Khi trích output `EXPLAIN (ANALYZE)` trong bài thì chỉ giữ các dòng cần cho cơ chế đang dạy (P4 của pedagogy), cắt bằng `…`.

```sql
SELECT lp, t_xmin, t_xmax, t_ctid
FROM heap_page_items(get_raw_page('accounts', 0))
ORDER BY lp
```

### 5.2 mongosh (MongoDB)

Editor chỉ nhận một tập con, đọc **như dữ liệu**: không `eval`, không `new Function` (product design §6.2).

- Chỉ dạng `db.<collection>.<method>(…)`, được nối `.sort(…)`, `.limit(…)`, `.skip(…)`.
- **Chỉ giá trị chữ:**
  - không biến, không `let`/`const`, không hàm, không vòng lặp, không `$where`/`$function`/`$accumulator`;
  - được dùng `ISODate('…')`, `ObjectId('…')`, `NumberDecimal('…')`, regex `/…/`.
- **Định dạng:**
  - khóa không đặt trong ngoặc kép (`{ status: 'PAID' }`); toán tử để trần (`$match`); chuỗi dùng nháy đơn;
  - đường dẫn trường có dấu chấm thì đặt trong nháy đơn (`'items.sku'`);
  - một dấu cách trong `{ }`; không dấu phẩy thừa ở cuối.
- **Pipeline dài:** mỗi stage một dòng, thụt 2 dấu cách, như `content/engine/mongodb/path/lessons-p7-12.yml`.
- **Output explain ghi sẵn:** trích JSON thật, chỉ giữ các trường đang dạy (`stage`, `nReturned`, `totalKeysExamined`, `totalDocsExamined`), cắt phần còn lại bằng `…`.

```js
db.orders.aggregate([
  { $match: { status: 'PAID' } },
  { $group: { _id: '$customer_id', total: { $sum: '$amount' } } },
  { $sort: { total: -1, _id: 1 } },
  { $limit: 5 }
])
```

### 5.3 DynamoDB (request JSON và PartiQL)

- **Request:** JSON chặt (đọc bằng `JSON.parse`): nháy kép, không comment, không dấu phẩy thừa. Dạng `{"op": "<Operation>", "input": { … }}`, đúng như các bài đã viết. Một dòng nếu ngắn. Request dài thì xuống dòng theo khóa cấp hai, thụt 2 dấu cách.
- **Giá trị thuộc tính** luôn có kiểu: `{"S": "…"}`, `{"N": "12"}` (số viết dạng chuỗi), `{"BOOL": true}`, `{"L": […]}`, `{"M": {…}}`.
- **Biểu thức:**
  - luôn dùng `:v` cho giá trị;
  - dùng `#n` cho tên trùng từ dành riêng, và nên dùng cho mọi tên trong bài L2 trở lên;
  - khóa cấp một tên `pk`/`sk` (chữ thường), giá trị ghép bằng `#`: `"ORD#2026-11-20#3"`.
- **PartiQL:** tên bảng trong nháy kép (`"Votes"`), chuỗi trong nháy đơn, từ khóa HOA, không `;`.

```json
{"op": "Query", "input": {"TableName": "Orders", "KeyConditionExpression": "pk = :p AND begins_with(sk, :s)", "ExpressionAttributeValues": {":p": {"S": "CUST#42"}, ":s": {"S": "ORDER#2026-11"}}}}
```

---

## 6. Ví dụ đúng / sai

| Sai | Đúng | Vì sao |
|---|---|---|
| "VACUUM hút sạch dung lượng thừa." | "VACUUM dọn dead tuple để chỗ trống được dùng lại; file không nhỏ lại." | `avoid` của VACUUM; hiểu lầm PG3 |
| "Câu này khóa dòng lại." | "Câu này giữ row lock trên dòng đó." | "khóa" chỉ là key |
| "Scan có FilterExpression nên rẻ hơn." | "FilterExpression lọc sau khi đọc: `ScannedCount` 1000, `Count` 20, RCU như nhau." | Hiểu lầm DY1; bằng chứng là số đếm |
| "Câu chạy nhanh hơn 3 ms." | "cost giảm từ 35,5 xuống 8,3." | Không dùng mili giây |
| EN: "the page (trang) holds…" | EN: "the page holds…" | EN không chú thích ngược |
| VI "`(trang, khe)`" / EN "`(page, slot)`" | Cả hai: `(0,84)` | Code span phải giống hệt |
| "Lab này chạy thật trên MongoDB." | Nhãn "Chạy bằng mingo (ngôn ngữ truy vấn MongoDB)" | Nhãn trung thực |
| "Tính năng này sắp có." | Dòng BE của §4 | Luật không ngõ cụt |

---

## 7. Checklist cho reviewer

Đánh dấu từng ô. Một ô "không" thì trả bài kèm dòng cần sửa.

**Thuật ngữ**

- [ ] Mọi thuật ngữ kỹ thuật đều có trong `content/engine/glossary.yml`. Thuật ngữ mới đã được thêm vào glossary trong cùng commit.
- [ ] Lần đầu mỗi thuật ngữ trong bài đã chú thích đúng mẫu §2.1. Không chữ nào thuộc cột `avoid`.
- [ ] "khóa" chỉ dùng cho key. "tài liệu" chỉ dùng cho MongoDB document. "phân vùng" có ngữ cảnh engine.

**Hai ngôn ngữ**

- [ ] Có `# EN` đủ mục tương ứng. EN không có dấu tiếng Việt và không chú thích ngược.
- [ ] Code span và khối code giống hệt giữa VI và EN, cùng thứ tự.
- [ ] Số theo §3: VI phẩy thập phân, chấm hàng nghìn; EN ngược lại; trong code giữ nguyên cú pháp nguồn.

**Sự thật**

- [ ] Mỗi con số có nguồn: knowledge doc `[Sn]`, URL trong `sources:`, hoặc output đo trong lab. Không có con số từ mục "(chưa đối chiếu)".
- [ ] `sources:` có ít nhất một URL docs chính thức đúng engine (Postgres ghim `/docs/18/`).
- [ ] Không câu nào tuyệt đối hóa sai ("luôn dùng index", "VACUUM trả dung lượng", "GSI đọc mạnh được").

**Runtime và chấm**

- [ ] Đúng một nhãn §4, khớp với thứ runtime làm được. Bài BE có dòng BE.
- [ ] Không chấm, không lập luận bằng mili giây.
- [ ] `solution` tất định: không `now()`/`CURRENT_DATE`, không biến hay hàm trong mongosh, JSON DynamoDB parse được.
- [ ] Mỗi kết quả trái trực giác có câu đoán trước. Mỗi `concept` có ≥ 1 quiz, trong đó có một lựa chọn sai lấy từ hiểu lầm (pedagogy §1.2).

**Giọng**

- [ ] Mở bằng câu hỏi hoặc tình huống. `## Ý chính` ≤ 150 từ.
- [ ] Không có "boss", "sự cố", "sắp có", "later".
