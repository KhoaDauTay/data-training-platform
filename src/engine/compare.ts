/**
 * v28 E-CMP (L430): the "Which engine?" page's content (#/engine/compare): nine axes with one cell per engine, the evidence
 * lines, and twelve "which engine?" scenarios. Pure data, lazy (chunk engineCompare). Honesty rule: a number appears only as a
 * `{fact.i}` placeholder, filled from FACTS; a `run` fact is re-measured on PGlite, mingo and dynoxide by
 * tests/engineCompare.test.ts, a docs fact names its page. Only a scenario's question may hold digits (its premise).
 * Research: docs/team/research-engine-compare-v28.md (its own figures came from a script outside the repo and are not used).
 */
export type Txt = { vi: string; en: string };
/** run = the in-browser runtime behaves like the real engine here; diff = it runs, but differs from the real engine; docs = from the docs only. */
export type Tier = 'run' | 'diff' | 'docs';
export type CmpEngine = 'postgres' | 'mongodb' | 'dynamodb';
export const CMP_ENGINES: readonly CmpEngine[] = ['postgres', 'mongodb', 'dynamodb'];

/** The sample shop every measured fact runs on (tests/engineCompare.measure.ts builds it on all three runtimes). */
export const CMP_ORDERS = 200;
export const CMP_STATUSES = ['DELIVERED', 'SHIPPED', 'DELIVERED', 'PAID', 'DELIVERED', 'NEW', 'DELIVERED', 'SHIPPED', 'PAID', 'DELIVERED'] as const;

export interface Fact { src: 'run' | string; values: (string | number)[]; text?: Txt }
export interface Cell { tier: Tier; text: Txt }
export interface Axis { id: string; title: Txt; ask: Txt; cells: Record<CmpEngine, Cell>; facts: string[]; lessons: string[]; sources: string[] }
export interface Scenario { id: string; q: Txt; options: Txt[]; answer: number; trap: number; why: Txt; facts: string[] }

const AWS = 'https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/';
const MDB = 'https://www.mongodb.com/docs/manual/';
const PG = 'https://www.postgresql.org/docs/18/';

/** Every number the page shows. `run` values are what tests/engineCompare.measure.ts returns, in order. */
export const FACTS: Record<string, Fact> = {
  shop: { src: 'run', values: [200] },
  stock: { src: 'run', values: [5, 1, 2] },
  pgTx: { src: 'run', values: ['23514', 5, 1], text: {
    vi: 'PostgreSQL: lệnh trừ kho thứ hai vi phạm `CHECK` (`{pgTx.0}`), transaction bị hủy, P1 vẫn còn {pgTx.1}, P2 vẫn còn {pgTx.2}.',
    en: 'PostgreSQL: the second stock update breaks the `CHECK` (`{pgTx.0}`), the transaction is undone, P1 stays at {pgTx.1}, P2 stays at {pgTx.2}.' } },
  mgTx: { src: 'run', values: [3, 1], text: {
    vi: 'MongoDB, hai lệnh `updateOne` riêng: lệnh đầu chạy, lệnh sau không khớp tài liệu nào. P1 còn {mgTx.0}, P2 vẫn còn {mgTx.1}: đơn bị trừ nửa chừng.',
    en: 'MongoDB, two separate `updateOne` commands: the first runs, the second matches no document. P1 is left at {mgTx.0}, P2 stays at {mgTx.1}: the order is half applied.' } },
  dyTx: { src: 'run', values: ['TransactionCanceledException', 'None, ConditionalCheckFailed', 5], text: {
    vi: 'DynamoDB `ExecuteTransaction`: trả `{dyTx.0}` với lý do `[{dyTx.1}]`, P1 vẫn còn {dyTx.2}.',
    en: 'DynamoDB `ExecuteTransaction`: answers `{dyTx.0}` with the reasons `[{dyTx.1}]`, P1 stays at {dyTx.2}.' } },
  pgIndex: { src: 'run', values: ['Seq Scan', 'Index Only Scan'], text: {
    vi: 'PostgreSQL, "các đơn PAID mới nhất": trước khi có index là `{pgIndex.0}` rồi sắp xếp; sau index `(status, created DESC, id DESC)` là `{pgIndex.1}`, không còn bước sắp.',
    en: 'PostgreSQL, "the newest PAID orders": before the index a `{pgIndex.0}` then a sort; after the index `(status, created DESC, id DESC)` an `{pgIndex.1}`, with no sort left.' } },
  dyScanQuery: { src: 'run', values: [206, 2, 2, 40, 0.5], text: {
    vi: 'DynamoDB: Scan có filter `status = PAID` đọc {dyScanQuery.0} item, tốn {dyScanQuery.1} RCU; bỏ filter vẫn tốn {dyScanQuery.2} RCU. Query trên GSI `byStatus` đọc {dyScanQuery.3} item, tốn {dyScanQuery.4} RCU.',
    en: 'DynamoDB: a Scan with the filter `status = PAID` reads {dyScanQuery.0} items for {dyScanQuery.1} RCU; without the filter it still costs {dyScanQuery.2} RCU. A Query on the GSI `byStatus` reads {dyScanQuery.3} items for {dyScanQuery.4} RCU.' } },
  dyRead: { src: 'run', values: [0.5, 1], text: {
    vi: 'DynamoDB `GetItem` một đơn: đọc eventual tốn {dyRead.0} RCU, đọc `ConsistentRead` tốn {dyRead.1} RCU.',
    en: 'DynamoDB `GetItem` of one order: an eventual read costs {dyRead.0} RCU, a `ConsistentRead` costs {dyRead.1} RCU.' } },
  dyGsiStrong: { src: 'run', values: ['ValidationException'], text: {
    vi: 'DynamoDB: Query trên GSI kèm `ConsistentRead` bị từ chối với `{dyGsiStrong.0}`.',
    en: 'DynamoDB: a Query on a GSI with `ConsistentRead` is refused with `{dyGsiStrong.0}`.' } },
  pgAddColumn: { src: 'run', values: ['same', 200], text: {
    vi: 'PostgreSQL `ADD COLUMN channel … DEFAULT \'store\'`: file của bảng giữ nguyên (không viết lại bảng), và cả {pgAddColumn.1} đơn cũ đều đọc ra `store`.',
    en: 'PostgreSQL `ADD COLUMN channel … DEFAULT \'store\'`: the table\'s file stays the same (no rewrite), and all {pgAddColumn.1} old orders read `store`.' } },
  mgCountEmpty: { src: 'run', values: [0], text: {
    vi: 'MongoDB: đơn cũ không có trường `channel`, nên `$match` theo `store` rồi `$count` trả về {mgCountEmpty.0} tài liệu (chứ không phải một tài liệu đếm bằng không).',
    en: 'MongoDB: old orders have no `channel` field, so a `$match` on `store` followed by `$count` returns {mgCountEmpty.0} documents (not one document holding a zero count).' } },
  dySparse: { src: 'run', values: [200, 0], text: {
    vi: 'DynamoDB: {dySparse.0} đơn cũ không có thuộc tính `channel`; Query GSI `byChannel` với `store` trả {dySparse.1} item (GSI thưa).',
    en: 'DynamoDB: {dySparse.0} old orders have no `channel` attribute; a Query on the GSI `byChannel` for `store` returns {dySparse.1} items (a sparse GSI).' } },
  pgText: { src: 'run', values: ['22P02', '6,500,000', '6500000', 4, 5000000, 3], text: {
    vi: 'PostgreSQL, cột `numeric`: `\'{pgText.1}\'` bị từ chối ngay lúc ghi (`{pgText.0}`), còn `\'{pgText.2}\'` được đổi thành số. Trong {pgText.3} đơn, số đơn trên {pgText.4} là {pgText.5}.',
    en: 'PostgreSQL, a `numeric` column: `\'{pgText.1}\'` is refused at write time (`{pgText.0}`), while `\'{pgText.2}\'` is turned into a number. Of {pgText.3} orders, {pgText.5} are over {pgText.4}.' } },
  mgText: { src: 'run', values: [2], text: {
    vi: 'MongoDB lưu nguyên chuỗi, rồi `$gt` bỏ qua nó mà không báo gì: cùng phép đếm chỉ ra {mgText.0}.',
    en: 'MongoDB stores the string as it is, then `$gt` skips it without a word: the same count gives only {mgText.0}.' } },
  dyText: { src: 'run', values: [2], text: {
    vi: 'DynamoDB lưu một thuộc tính kiểu `S`; so `S` với `N` luôn sai, nên cùng phép đếm chỉ ra {dyText.0}.',
    en: 'DynamoDB stores an `S` attribute; comparing `S` with `N` is always false, so the same count gives only {dyText.0}.' } },
  dyReserved: { src: 'run', values: ['ValidationException'], text: {
    vi: 'DynamoDB: viết thẳng `total` trong `FilterExpression` bị từ chối với `{dyReserved.0}` (từ khóa dành riêng); phải đặt tên thay bằng `#t`.',
    en: 'DynamoDB: writing `total` straight into a `FilterExpression` is refused with `{dyReserved.0}` (a reserved word); name it through `#t` instead.' } },
  dyPage: { src: 'run', values: [20, 3, 'more'], text: {
    vi: 'DynamoDB: Scan `Limit: {dyPage.0}` có filter trả trang đầu `Count: {dyPage.1}` kèm `LastEvaluatedKey`: chưa phải đáp số, còn trang sau.',
    en: 'DynamoDB: a Scan with `Limit: {dyPage.0}` and a filter returns a first page with `Count: {dyPage.1}` and a `LastEvaluatedKey`: not the answer yet, more pages follow.' } },
  dyTxLimit: { src: `${AWS}transaction-apis.html`, values: [100, 2], text: {
    vi: 'Theo tài liệu AWS: một transaction chứa tối đa {dyTxLimit.0} thao tác, và mỗi item trong đó được tính như {dyTxLimit.1} lần đọc hoặc ghi.',
    en: 'From the AWS docs: one transaction holds at most {dyTxLimit.0} actions, and each item in it is charged as {dyTxLimit.1} reads or writes.' } },
  dyGsiQuota: { src: `${AWS}ServiceQuotas.html`, values: [20], text: {
    vi: 'Theo tài liệu AWS: mặc định mỗi bảng có tối đa {dyGsiQuota.0} GSI.',
    en: 'From the AWS docs: by default a table holds at most {dyGsiQuota.0} GSIs.' } },
};

const c = (tier: Tier, vi: string, en: string): Cell => ({ tier, text: { vi, en } });

export const AXES: Axis[] = [
  {
    id: 'A1', title: { vi: 'Mô hình dữ liệu', en: 'Data model' },
    ask: { vi: 'Dữ liệu cần đọc cùng nhau nằm ở đâu?', en: 'Where does the data you read together live?' },
    cells: {
      postgres: c('run', 'Bảng chuẩn hóa, ghép bằng JOIN lúc đọc.', 'Normalised tables, joined at read time.'),
      mongodb: c('run', 'Tài liệu: nhúng thứ hay đọc cùng nhau, tham chiếu thứ dùng riêng.', 'Documents: embed what is read together, reference what is used apart.'),
      dynamodb: c('run', 'Item collection: cùng partition key, sort key xếp theo cách đọc. Việc ghép xảy ra lúc thiết kế khóa.', 'Item collections: one partition key, a sort key ordered the way you read. The join happens when you design the keys.'),
    },
    facts: [], lessons: ['e-pg-l1-04', 'e-mg-l2-11', 'e-dy-l3-07'], sources: [`${AWS}bp-general-nosql-design.html`, `${MDB}data-modeling/`],
  },
  {
    id: 'A2', title: { vi: 'Mô hình truy vấn', en: 'Query model' },
    ask: { vi: 'Câu hỏi của ngày mai đã biết trước chưa?', en: 'Do you know tomorrow\'s questions today?' },
    cells: {
      postgres: c('run', 'Hỏi tùy ý, planner tự tìm cách chạy. GROUP BY và JOIN trên mọi cột.', 'Ask anything; the planner works out how. GROUP BY and JOIN on any column.'),
      mongodb: c('run', 'Pipeline tùy ý trên một collection; `$lookup` sang collection khác có giới hạn.', 'Any pipeline over one collection; `$lookup` into another collection has limits.'),
      dynamodb: c('run', 'Chỉ đọc nhanh theo khóa và index đã thiết kế. Không có GROUP BY: Scan rồi cộng ở ứng dụng, hoặc tính sẵn tổng.', 'Fast reads only by the keys and indexes you designed. No GROUP BY: Scan and add up in the app, or keep totals ready.'),
    },
    facts: [], lessons: ['e-pg-l4-04', 'e-mg-l2-06', 'e-dy-l2-14'], sources: [`${AWS}bp-gsi-aggregation.html`, `${MDB}aggregation/`],
  },
  {
    id: 'A3', title: { vi: 'Index', en: 'Indexes' },
    ask: { vi: 'Index đọc theo cột nào, theo thứ tự nào?', en: 'Which columns does the index read, in which order?' },
    cells: {
      postgres: c('run', 'B-tree nhiều cột, luật cột đầu, Index Only Scan.', 'Multicolumn B-tree, the leading-column rule, Index Only Scan.'),
      mongodb: c('diff', 'Index kép và luật ESR. Trình giả lập trả đúng kết quả nhưng không có index thật: thứ tự khóa được chấm theo luật.', 'Compound indexes and the ESR rule. The emulator gives the right result but has no real index: the key order is graded by the rule.'),
      dynamodb: c('run', 'Khóa chính và GSI/LSI. Không có khóa thì phải Scan cả bảng, và filter không làm giảm RCU.', 'Primary key plus GSI/LSI. Without a key you Scan the whole table, and a filter does not lower the RCU.'),
    },
    facts: ['pgIndex', 'dyScanQuery'], lessons: ['e-pg-l2-02', 'e-mg-l3-05', 'e-dy-l3-04'], sources: [`${PG}indexes-multicolumn.html`, `${AWS}GSI.html`],
  },
  {
    id: 'A4', title: { vi: 'Transaction', en: 'Transactions' },
    ask: { vi: 'Nhiều thay đổi phải cùng thành công hay cùng không xảy ra?', en: 'Must several changes all succeed or none happen?' },
    cells: {
      postgres: c('run', 'ACID nhiều dòng, nhiều bảng; ràng buộc chặn dữ liệu sai ngay trong database.', 'ACID across rows and tables; constraints stop bad data in the database itself.'),
      mongodb: c('diff', 'Ghi một tài liệu là nguyên tử. Hai lệnh riêng có thể dừng nửa chừng (chạy được ở đây); transaction nhiều tài liệu cần session, trình giả lập không có.', 'A write to one document is atomic. Two separate commands can stop half way (this runs here); a multi-document transaction needs a session, which the emulator lacks.'),
      dynamodb: c('diff', '`ExecuteTransaction` chạy được ở đây: tất cả hoặc không. `TransactWriteItems` chưa chạy trong trình duyệt.', '`ExecuteTransaction` runs here: all or nothing. `TransactWriteItems` does not run in the browser yet.'),
    },
    facts: ['pgTx', 'mgTx', 'dyTx', 'dyTxLimit'], lessons: ['e-pg-l1-07', 'e-mg-l4-09', 'e-dy-l4-13'], sources: [`${MDB}core/write-operations-atomicity/`, `${AWS}transaction-apis.html`],
  },
  {
    id: 'A5', title: { vi: 'Nhất quán', en: 'Consistency' },
    ask: { vi: 'Đọc ngay sau khi ghi có thấy dữ liệu mới không?', en: 'Does a read right after a write see the new data?' },
    cells: {
      postgres: c('docs', 'Một máy: thấy ngay; mặc định Read Committed. PGlite chỉ có một phiên, nên chuyện hai phiên chỉ học qua tài liệu.', 'One server: you see it at once; Read Committed by default. PGlite has one session, so two sessions are learned from the docs.'),
      mongodb: c('docs', 'Đọc primary thì thấy ngay; đọc secondary có thể ra bản cũ. Trình giả lập không có replica set.', 'Reading the primary sees it at once; reading a secondary may give an old version. The emulator has no replica set.'),
      dynamodb: c('diff', 'Bảng chính: chọn strong và trả gấp đôi RCU. GSI chỉ có eventual. Trình giả lập cập nhật GSI ngay, AWS thì trễ một chút.', 'Base table: choose strong and pay double RCU. A GSI is eventual only. The emulator updates a GSI at once; AWS lags a little.'),
    },
    facts: ['dyRead', 'dyGsiStrong'], lessons: ['e-pg-l4-12', 'e-mg-l4-11', 'e-dy-l3-12'], sources: [`${PG}transaction-iso.html`, `${MDB}core/read-preference/`, `${AWS}HowItWorks.ReadConsistency.html`],
  },
  {
    id: 'A6', title: { vi: 'Scale và phân vùng', en: 'Scale and partitioning' },
    ask: { vi: 'Khi lớn lên, dữ liệu và tải dồn vào đâu?', en: 'As you grow, where do the data and the load pile up?' },
    cells: {
      postgres: c('run', 'Partition theo khoảng (thường theo thời gian) để pruning đọc ít hơn, vẫn trên một máy.', 'Range partitions (often by time) so pruning reads less, still on one server.'),
      mongodb: c('docs', 'Shard key: bao nhiêu giá trị, lệch đến đâu, có chỉ tăng không. Đo ứng viên được bằng aggregation; định tuyến thật chỉ theo tài liệu.', 'Shard key: how many values, how skewed, whether it only grows. You can measure candidates with aggregation; real routing is docs only.'),
      dynamodb: c('docs', 'Partition key quyết định tất cả; khóa nóng thì chia nhỏ bằng hậu tố. Partition vật lý và throttle không có trong trình giả lập.', 'The partition key decides everything; a hot key is split with a suffix. Physical partitions and throttling are not in the emulator.'),
    },
    facts: [], lessons: ['e-pg-l4-07', 'e-mg-l5-07', 'e-dy-l4-03'], sources: [`${PG}ddl-partitioning.html`, `${MDB}core/sharding-choose-a-shard-key/`, `${AWS}bp-partition-key-sharding.html`],
  },
  {
    id: 'A7', title: { vi: 'Mô hình chi phí', en: 'Cost model' },
    ask: { vi: 'Một câu tốn bao nhiêu, đo bằng đơn vị gì?', en: 'What does one query cost, and in which unit?' },
    cells: {
      postgres: c('run', '`cost` của planner: đơn vị trừu tượng, không phải tiền hay mili giây.', 'The planner\'s `cost`: an abstract unit, never money or milliseconds.'),
      mongodb: c('docs', 'Số khóa và tài liệu đã đọc trong `explain`. Trình giả lập không có `explain` thật.', 'Keys and documents examined in `explain`. The emulator has no real `explain`.'),
      dynamodb: c('run', 'RCU/WCU là tiền: tính theo byte đã đọc, không theo byte trả về. Chỉ DynamoDB đặt giá lên từng request.', 'RCU/WCU are money: charged by the bytes read, not the bytes returned. Only DynamoDB puts a price on each request.'),
    },
    facts: ['dyScanQuery', 'dyReserved'], lessons: ['e-pg-l4-01', 'e-mg-l3-06', 'e-dy-l1-09'], sources: [`${PG}using-explain.html`, `${AWS}ReservedWords.html`],
  },
  {
    id: 'A8', title: { vi: 'Đổi schema', en: 'Schema changes' },
    ask: { vi: 'Thêm một trường thì dữ liệu cũ ra sao?', en: 'Add a field: what happens to the old data?' },
    cells: {
      postgres: c('run', '`ALTER TABLE`: default cố định thì không viết lại bảng, mọi dòng cũ có giá trị ngay.', '`ALTER TABLE`: a constant default rewrites nothing, and every old row has the value at once.'),
      mongodb: c('run', 'Tài liệu cũ thiếu trường; câu đọc phải tự lo (`$ifNull`) hoặc phải cập nhật lại dữ liệu cũ.', 'Old documents lack the field; reads must handle it (`$ifNull`) or you backfill the old data.'),
      dynamodb: c('diff', 'Item cũ thiếu thuộc tính, nên GSI mới bỏ qua chúng (thưa). Trên AWS, GSI mới còn phải qua bước tạo và backfill; trình giả lập bỏ qua bước đó.', 'Old items lack the attribute, so a new GSI skips them (sparse). On AWS a new GSI also goes through creating and backfill; the emulator skips that.'),
    },
    facts: ['pgAddColumn', 'mgCountEmpty', 'dySparse'], lessons: ['e-pg-l1-02', 'e-mg-l4-04', 'e-dy-l4-08'], sources: [`${PG}sql-altertable.html`, `${AWS}bp-indexes-general-sparse-indexes.html`, `${AWS}GSI.OnlineOps.html`],
  },
  {
    id: 'A9', title: { vi: 'Chỗ hay hỏng', en: 'Where it breaks' },
    ask: { vi: 'Sai thì sai lúc nào, có ai báo không?', en: 'When does it go wrong, and does anyone tell you?' },
    cells: {
      postgres: c('run', 'Sai lúc ghi, có báo lỗi: kiểu và ràng buộc chặn ngay.', 'It fails at write time, with an error: types and constraints stop it at once.'),
      mongodb: c('run', 'Sai lúc đọc, không báo: kiểu lệch, thiếu trường. Kiểm bằng `$type`.', 'It fails at read time, silently: a wrong type, a missing field. Check with `$type`.'),
      dynamodb: c('run', 'Sai lúc đọc, không báo; thêm bẫy trang (`Limit`) và từ khóa dành riêng. Kiểm bằng `attribute_type`.', 'It fails at read time, silently; plus the page trap (`Limit`) and reserved words. Check with `attribute_type`.'),
    },
    facts: ['pgText', 'mgText', 'dyText', 'dyPage'], lessons: ['e-pg-l1-04', 'e-mg-l2-16', 'e-dy-l2-13'], sources: [`${PG}datatype-numeric.html`, `${MDB}reference/operator/query/type/`, `${AWS}Query.Pagination.html`],
  },
];

const o = (vi: string, en: string): Txt => ({ vi, en });

export const SCENARIOS: Scenario[] = [
  {
    id: 'S1', q: o('Phòng phân tích cần báo cáo doanh thu, tỷ lệ hủy và cohort. Câu hỏi đổi mỗi tuần; dữ liệu khoảng 20 GB.', 'The analytics team needs revenue, cancellation rate and cohort reports. The questions change every week; the data is about 20 GB.'),
    options: [o('PostgreSQL', 'PostgreSQL'), o('DynamoDB, vì nó scale không giới hạn', 'DynamoDB, because it scales without limit'), o('MongoDB, vì không cần schema nên đổi nhanh', 'MongoDB, because no schema means fast change')],
    answer: 0, trap: 1, facts: ['dyScanQuery'],
    why: o('"Lớn thì chọn NoSQL" nghe hợp lý, nhưng DynamoDB chỉ nhanh với câu hỏi đã biết trước: mỗi câu mới là một lần Scan cả bảng hoặc một GSI mới, rồi cộng ở ứng dụng. Câu hỏi đổi hằng tuần cần JOIN và GROUP BY tùy ý: đó là PostgreSQL. Dữ liệu cỡ này vẫn vừa một máy.',
      '"Big data means NoSQL" sounds right, but DynamoDB is only fast for questions known in advance: each new question is a full Scan or a new GSI, then adding up in the app. Questions that change weekly need free JOIN and GROUP BY: that is PostgreSQL. Data this size still fits one server.'),
  },
  {
    id: 'S2', q: o('Giỏ hàng của app di động: đọc và ghi theo mã người dùng, tải tăng gấp 50 lần ngày khuyến mãi, không ai làm báo cáo trên giỏ.', 'A mobile app\'s cart: read and written by user id, load jumps 50 times on sale days, nobody reports on carts.'),
    options: [o('DynamoDB, on-demand, partition key là mã người dùng', 'DynamoDB, on-demand, partition key = user id'), o('PostgreSQL, vì giỏ hàng cần transaction', 'PostgreSQL, because a cart needs transactions'), o('DynamoDB, partition key là ngày', 'DynamoDB, partition key = the date')],
    answer: 0, trap: 1, facts: ['dyRead'],
    why: o('"Có tiền thì cần transaction" nghe hợp lý, nhưng giỏ của một người là một item, và ghi một item vốn đã nguyên tử. Mẫu đọc đã biết trước (theo người dùng), mỗi lần đọc chỉ là một `GetItem` rẻ. Chọn ngày làm partition key thì mọi người dùng cùng ghi vào một khóa nóng.',
      '"Money means transactions" sounds right, but one person\'s cart is one item, and a single-item write is already atomic. The access pattern is known (by user), and each read is one cheap `GetItem`. With the date as the partition key, every user writes to one hot key.'),
  },
  {
    id: 'S3', q: o('Danh mục sản phẩm: mỗi loại có bộ thuộc tính riêng (áo có size, máy có công suất). Trang chi tiết đọc cả sản phẩm một lần; bộ lọc dùng vài thuộc tính phổ biến.', 'A product catalogue: each kind has its own attributes (shirts have sizes, machines have power ratings). The detail page reads a whole product at once; filters use a few common attributes.'),
    options: [o('MongoDB: một tài liệu cho mỗi sản phẩm, index cho các thuộc tính hay lọc', 'MongoDB: one document per product, indexes on the common filters'), o('DynamoDB: mỗi thuộc tính một GSI', 'DynamoDB: one GSI per attribute'), o('PostgreSQL: mỗi loại sản phẩm một bảng', 'PostgreSQL: one table per kind of product')],
    answer: 0, trap: 1, facts: ['dyGsiQuota'],
    why: o('"Mỗi thuộc tính một GSI" nghe gọn, nhưng số GSI mỗi bảng có hạn, mỗi GSI tốn WCU riêng, và tổ hợp lọc tùy ý vẫn không làm được. Tài liệu MongoDB khớp với cách đọc cả sản phẩm một lần. PostgreSQL với `jsonb` và GIN cũng làm được: câu hỏi là "khớp nhất", không phải "duy nhất". Mỗi loại một bảng thì schema phình mãi.',
      '"One GSI per attribute" sounds tidy, but a table has a GSI quota, each GSI costs its own WCU, and free filter combinations still do not work. A MongoDB document matches reading a whole product at once. PostgreSQL with `jsonb` and GIN can do it too: the question is "best fit", not "only fit". One table per kind makes the schema grow forever.'),
  },
  {
    id: 'S4', q: o('Một đơn lấy 2 cái P1 và 2 cái P2; kho P1 có 5, P2 chỉ còn 1. MongoDB chạy hai lệnh `updateOne` riêng, mỗi lệnh có điều kiện "đủ hàng". Sau đó P1 còn mấy?', 'An order takes 2 of P1 and 2 of P2; P1 has 5 in stock, P2 only 1. MongoDB runs two separate `updateOne` commands, each with an "enough stock" condition. How many P1 are left?'),
    options: [o('Còn {mgTx.0}: lệnh đầu đã chạy xong', '{mgTx.0} left: the first command already ran'), o('Còn {stock.0}: lỗi thì cả đơn bị hủy', '{stock.0} left: a failure cancels the whole order'), o('Lệnh thứ hai báo lỗi và MongoDB tự hoàn tác lệnh đầu', 'The second command errors and MongoDB undoes the first one')],
    answer: 0, trap: 1, facts: ['mgTx', 'pgTx', 'dyTx'],
    why: o('Người quen SQL nghĩ "lỗi thì hủy hết", như BEGIN … ROLLBACK. Nhưng hai lệnh riêng là hai thao tác độc lập: lệnh sau chỉ không khớp tài liệu nào, không báo lỗi, và không hoàn tác lệnh trước. PostgreSQL và `ExecuteTransaction` của DynamoDB thì giữ nguyên P1.',
      'SQL users expect "an error undoes everything", like BEGIN … ROLLBACK. But two separate commands are two independent operations: the second just matches no document, raises no error, and undoes nothing. PostgreSQL and DynamoDB\'s `ExecuteTransaction` leave P1 untouched.'),
  },
  {
    id: 'S5', q: o('Bảng xếp hạng bài hát tải nhiều nhất trong tháng: hàng nghìn lượt tải mỗi giây, đọc trong vài mili giây, chậm vài giây vẫn chấp nhận được.', 'A chart of the most downloaded songs this month: thousands of downloads a second, reads in a few milliseconds, a few seconds of lag is fine.'),
    options: [o('DynamoDB với tổng tính sẵn: cộng vào item đếm theo tháng, đọc qua GSI thưa', 'DynamoDB with precomputed totals: add to a per-month counter item, read it through a sparse GSI'), o('DynamoDB: Scan rồi đếm mỗi lần mở trang', 'DynamoDB: Scan and count each time the page opens'), o('PostgreSQL: `count(*)` mỗi lần mở trang', 'PostgreSQL: `count(*)` each time the page opens')],
    answer: 0, trap: 1, facts: ['dyScanQuery'],
    why: o('"Scan rồi đếm" ra đúng đáp số nên nghe ổn, nhưng Scan tính tiền theo cả bảng, mỗi lần mở trang. `count(*)` của PostgreSQL cũng đúng, nhưng đọc lại cả bảng sự kiện mỗi lần. Khi tải cao và được phép trễ vài giây, cách đúng là tính sẵn tổng lúc ghi rồi đọc một item nhỏ.',
      '"Scan and count" gives the right answer so it sounds fine, but a Scan is billed for the whole table on every page view. PostgreSQL\'s `count(*)` is right too, but rereads the whole event table each time. With heavy load and a few seconds of lag allowed, the fix is to keep totals at write time and read one small item.'),
  },
  {
    id: 'S6', q: o('Màn hình "đơn mới nhất theo trạng thái" trên DynamoDB. Đề xuất: GSI với partition key là `status`. Phần lớn đơn ở trạng thái DELIVERED.', 'A "newest orders by status" screen on DynamoDB. The proposal: a GSI with `status` as its partition key. Most orders are DELIVERED.'),
    options: [o('Một khóa của GSI gánh phần lớn item: dùng GSI thưa chỉ cho đơn đang mở, hoặc thêm hậu tố', 'One GSI key carries most items: use a sparse GSI for open orders only, or add a suffix'), o('Không sao: GSI tự chia tải', 'Fine: a GSI spreads the load by itself'), o('Đổi sang Scan có filter', 'Switch to a Scan with a filter')],
    answer: 0, trap: 1, facts: [],
    why: o('"GSI tự chia tải" nghe hợp lý vì DynamoDB tự lo partition. Nhưng GSI cũng chia theo partition key của chính nó: khi một giá trị như DELIVERED giữ phần lớn item, mọi lượt ghi và đọc dồn vào khóa đó. GSI thưa (chỉ đơn còn mở mới có thuộc tính khóa) hoặc hậu tố tính được sẽ trải tải ra.',
      '"A GSI spreads the load itself" sounds right because DynamoDB manages partitions. But a GSI is partitioned by its own partition key too: when one value such as DELIVERED holds most items, every write and read lands on that key. A sparse GSI (only open orders carry the key) or a calculated suffix spreads the load.'),
  },
  {
    id: 'S7', q: o('Chọn shard key cho collection `orders` của MongoDB. Câu hay chạy nhất là "đơn của một khách"; một khách lớn chiếm khoảng 30 % số đơn.', 'Pick a shard key for MongoDB\'s `orders` collection. The most common query is "one customer\'s orders"; one big customer has about 30 % of the orders.'),
    options: [o('`{ customerId: 1, _id: 1 }`', '`{ customerId: 1, _id: 1 }`'), o('`{ status: 1 }`', '`{ status: 1 }`'), o('`{ created: 1 }`', '`{ created: 1 }`'), o('`{ customerId: 1 }`', '`{ customerId: 1 }`')],
    answer: 0, trap: 3, facts: [],
    why: o('Chỉ `customerId` nghe đúng vì câu hay chạy đi thẳng tới một shard. Nhưng khách lớn dồn vào một giá trị khóa, thành chunk không chia được. Thêm một trường ít trùng phía sau thì vẫn định tuyến theo khách mà chunk của khách lớn chia được. `status` có quá ít giá trị; `created` chỉ tăng nên mọi lượt ghi dồn vào chunk cuối.',
      '`customerId` alone sounds right because the common query goes straight to one shard. But the big customer piles into one key value, a chunk that cannot split. A rarely repeated field after it still routes by customer while that customer\'s chunk can split. `status` has too few values; `created` only grows, so every write lands in the last chunk.'),
  },
  {
    id: 'S8', q: o('Bảng DynamoDB có nhiều đơn cũ chưa có thuộc tính `channel`. Thêm GSI `byChannel` rồi Query `channel = "store"`. Trả về mấy item?', 'A DynamoDB table has many old orders with no `channel` attribute. Add a GSI `byChannel`, then Query `channel = "store"`. How many items come back?'),
    options: [o('{dySparse.1}: item thiếu thuộc tính khóa thì không vào GSI', '{dySparse.1}: items without the key attribute are not in the GSI'), o('Mọi đơn cũ, như `DEFAULT \'store\'` của PostgreSQL', 'Every old order, like PostgreSQL\'s `DEFAULT \'store\'`'), o('Báo lỗi vì GSI chưa có dữ liệu', 'An error, because the GSI has no data yet')],
    answer: 0, trap: 1, facts: ['dySparse', 'pgAddColumn'],
    why: o('Nghe hợp lý vì cùng thao tác đó trên PostgreSQL cho mọi dòng cũ giá trị mặc định. DynamoDB không có giá trị mặc định: item không có thuộc tính khóa của GSI thì không vào GSI. Muốn đơn cũ xuất hiện, phải ghi thuộc tính đó vào từng item. Trên AWS, GSI mới còn phải qua bước tạo và backfill trước khi Query được.',
      'It sounds right because the same change in PostgreSQL gives every old row the default. DynamoDB has no default: an item without the GSI\'s key attribute is not in the GSI. To show old orders you must write that attribute into each item. On AWS a new GSI also goes through creating and backfill before you can Query it.'),
  },
  {
    id: 'S9', q: o('Ngay sau khi ghi một đơn, ứng dụng Query trên GSI với `ConsistentRead: true`. Chuyện gì xảy ra?', 'Right after writing an order, the app Queries a GSI with `ConsistentRead: true`. What happens?'),
    options: [o('Bị từ chối với `{dyGsiStrong.0}`', 'Refused with `{dyGsiStrong.0}`'), o('Trả bản mới và tốn gấp đôi RCU', 'Returns the new version at double the RCU'), o('Có thể trả bản cũ', 'May return the old version')],
    answer: 0, trap: 1, facts: ['dyGsiStrong', 'dyRead'],
    why: o('"Strong tốn gấp đôi RCU" đúng với bảng chính, nên dễ nghĩ GSI cũng vậy. Nhưng GSI chỉ có đọc eventual; yêu cầu strong trên GSI bị từ chối ngay. Bỏ `ConsistentRead` thì câu chạy, và khi đó trên AWS có thể thấy bản cũ trong chốc lát.',
      '"Strong costs double RCU" is true for the base table, so it is easy to assume the same for a GSI. But a GSI offers eventual reads only; asking it for a strong read is refused at once. Drop `ConsistentRead` and the query runs, and then on AWS it may briefly show the old version.'),
  },
  {
    id: 'S10', q: o('Bảng sự kiện PostgreSQL có 800 triệu dòng, lớn hơn RAM nhiều lần. Báo cáo luôn lọc theo tháng; dữ liệu cũ hơn 2 năm phải xóa hằng tháng.', 'A PostgreSQL event table holds 800 million rows, many times the RAM. Reports always filter by month; data older than 2 years must be deleted monthly.'),
    options: [o('Partition theo tháng: pruning, và xóa tháng cũ bằng `DETACH`/`DROP` partition', 'Partition by month: pruning, and drop old months with `DETACH`/`DROP` partition'), o('Partition mọi bảng, vì partition luôn làm câu nhanh hơn', 'Partition every table, because partitions always make queries faster'), o('Chuyển sang MongoDB sharding', 'Move to MongoDB sharding')],
    answer: 0, trap: 1, facts: [],
    why: o('"Partition luôn nhanh hơn" nghe hợp lý, nhưng tài liệu PostgreSQL chỉ khuyên partition khi bảng lớn hơn bộ nhớ của máy; bảng nhỏ chỉ thêm việc cho planner. Ở đây bảng đủ lớn, báo cáo lọc theo tháng (pruning chỉ đọc một partition), và xóa theo tháng thành thao tác trên cả partition. Sharding giải bài toán trải tải ra nhiều máy, không phải bài toán đọc ít đi.',
      '"Partitions are always faster" sounds right, but the PostgreSQL docs suggest partitioning only when the table outgrows the server\'s memory; a small table just gives the planner more work. Here the table is big enough, reports filter by month (pruning reads one partition) and monthly deletes become whole-partition operations. Sharding solves spreading load over servers, not reading less.'),
  },
  {
    id: 'S11', q: o('Ba nguồn đổ đơn vào cùng một kho; một nguồn ghi tổng tiền dạng chữ. Đếm "đơn trên 5 triệu" ở mỗi engine thì sao?', 'Three sources write orders into one store; one sends the total as text. What does "orders over 5 million" count on each engine?'),
    options: [o('PostgreSQL đổi chữ thành số hoặc từ chối ngay lúc ghi; MongoDB và DynamoDB lưu chuỗi rồi đếm thiếu mà không báo', 'PostgreSQL converts or refuses the text at write time; MongoDB and DynamoDB store the string and then miss it without a word'), o('MongoDB tự ép chuỗi số thành số khi so sánh', 'MongoDB turns a numeric string into a number when it compares'), o('Cả ba báo lỗi khi đếm', 'All three raise an error when counting')],
    answer: 0, trap: 1, facts: ['pgText', 'mgText', 'dyText'],
    why: o('Nghe hợp lý vì JavaScript tự đổi chuỗi số thành số khi so sánh. Nhưng MongoDB so theo kiểu: `$gt` với một số không bao giờ khớp một chuỗi. Cột `numeric` của PostgreSQL không bao giờ chứa chữ, nên đáp số đúng ngay. Với MongoDB và DynamoDB, viết một câu "phải trả về rỗng" bằng `$type` hoặc `attribute_type` để tìm dòng lệch.',
      'It sounds right because JavaScript turns a numeric string into a number when it compares. But MongoDB compares by type: `$gt` with a number never matches a string. A PostgreSQL `numeric` column never holds text, so the count is right at once. On MongoDB and DynamoDB, write a "must return nothing" query with `$type` or `attribute_type` to find the odd rows.'),
  },
  {
    id: 'S12', q: o('Scan có `Limit` và filter "đơn PAID"; trang đầu trả về một `Count` nhỏ kèm `LastEvaluatedKey`. Có bao nhiêu đơn PAID?', 'A Scan with a `Limit` and a "PAID orders" filter; the first page returns a small `Count` plus a `LastEvaluatedKey`. How many PAID orders are there?'),
    options: [o('Chưa biết: còn trang sau, phải đọc đến khi hết `LastEvaluatedKey`', 'Unknown yet: more pages follow, read until there is no `LastEvaluatedKey`'), o('Đúng bằng `Count` của trang đầu', 'Exactly the first page\'s `Count`'), o('Đúng bằng `Limit`', 'Exactly the `Limit`')],
    answer: 0, trap: 1, facts: ['dyPage'],
    why: o('`Count` trông như đáp số. Nhưng `Limit` giới hạn số item được đọc, không phải số item trả về; filter chạy sau đó. Còn `LastEvaluatedKey` nghĩa là vẫn còn dữ liệu chưa đọc.',
      '`Count` looks like the answer. But `Limit` caps the items read, not the items returned; the filter runs afterwards. A `LastEvaluatedKey` means some data is still unread.'),
  },
];

/** Every `{fact.i}` placeholder in a text, as [fact, index]. */
export const placeholders = (text: string): [string, number][] => [...text.matchAll(/\{(\w+)\.(\d+)\}/g)].map((m) => [m[1], Number(m[2])]);
/** Fills the placeholders with `fmt(value)`; an unknown one stays visible (the test forbids it). */
export const fill = (text: string, fmt: (v: string | number) => string): string =>
  text.replace(/\{(\w+)\.(\d+)\}/g, (all, id: string, i: string) => {
    const v = FACTS[id]?.values[Number(i)];
    return v === undefined ? all : fmt(v);
  });
