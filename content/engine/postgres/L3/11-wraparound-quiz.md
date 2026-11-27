---
id: e-pg-l3-11
engine: postgres
level: L3
module: vacuum-hot
title: Rủi ro XID wraparound
title_en: XID wraparound risk
kind: quiz
runtime: docs
docs_why: scale
minutes: 8
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Nói đúng các ngưỡng cảnh báo và từ chối ghi khi XID sắp quay vòng
    en: State the warning and refuse-to-write thresholds near XID wraparound
  - vi: Chọn đúng việc cần làm khi `age(datfrozenxid)` tăng mãi
    en: Choose the right action when `age(datfrozenxid)` keeps growing
requires: [e-pg-l3-10]
figures: [{ name: pg-xid-wraparound, at: idea }]
sources:
  - { url: https://www.postgresql.org/docs/18/routine-vacuuming.html, title_vi: "VACUUM định kỳ" }
  - { url: https://www.postgresql.org/docs/18/runtime-config-vacuum.html, title_vi: "Cấu hình VACUUM" }
quiz:
  - q:
      vi: "XID là số 32 bit so theo modulo 2³². Mỗi bảng phải được VACUUM (freeze) ít nhất một lần trong khoảng bao nhiêu transaction?"
      en: "XIDs are 32-bit numbers compared modulo 2^32. At least how often must every table be vacuumed (frozen)?"
    options:
      - { vi: "Mỗi 200 triệu transaction", en: "Every 200 million transactions" }
      - { vi: "Mỗi 2 tỉ transaction", en: "Every 2 billion transactions" }
      - { vi: "Mỗi 4 tỉ transaction", en: "Every 4 billion transactions" }
    answer: 1
    trap: 2
    why:
      vi: "4 tỉ nghe hợp lý vì đó là giới hạn của số 32 bit, nhưng phép so sánh modulo chia vòng đó làm đôi. Với một XID (transaction ID, số hiệu transaction) bất kỳ, khoảng 2 tỉ XID là \"quá khứ\" và 2 tỉ là \"tương lai\". Tuple chưa freeze mà già hơn 2 tỉ transaction sẽ bỗng thành \"tương lai\" và biến mất. 200 triệu là mốc mặc định autovacuum bắt đầu ép freeze, sớm hơn nhiều."
      en: "4 billion sounds right because it is the 32-bit limit, but the modulo comparison splits that circle in half. For any XID (transaction ID), about 2 billion XIDs are \"past\" and 2 billion are \"future\". An unfrozen tuple older than 2 billion transactions suddenly becomes \"future\" and disappears. 200 million is the default point where autovacuum starts forcing a freeze, much earlier."
  - q:
      vi: "Log có dòng `WARNING: database \"mydb\" must be vacuumed within 39985967 transactions`. Postgres đang ở đâu?"
      en: "The log shows `WARNING: database \"mydb\" must be vacuumed within 39985967 transactions`. Where is Postgres?"
    options:
      - { vi: "Đã từ chối mọi lệnh ghi", en: "It already refuses all writes" }
      - { vi: "Còn khoảng 40 triệu transaction; dưới 3 triệu nó sẽ từ chối cấp XID mới", en: "About 40 million transactions left; under 3 million it will refuse to assign new XIDs" }
      - { vi: "Chỉ là gợi ý chạy ANALYZE", en: "It is only a hint to run ANALYZE" }
    answer: 1
    trap: 0
    why:
      vi: "\"Đã từ chối mọi lệnh ghi\" nghe hợp lý vì một WARNING về wraparound nghe đã rất muộn, nhưng đây mới là mốc cảnh báo. Cảnh báo bắt đầu khi XID cũ nhất còn cách điểm quay vòng 40 triệu. Con số 39985967 trong log là số transaction còn lại, tức khoảng 40 triệu. Nếu bỏ qua, khi còn dưới 3 triệu, Postgres từ chối mọi lệnh cần XID mới. Đây không phải gợi ý ANALYZE: ANALYZE chỉ cập nhật thống kê và không freeze gì. Cách chữa là VACUUM cả database (bởi superuser), không phải khởi động lại."
      en: "\"Already refuses all writes\" sounds right because a wraparound WARNING sounds very late, but this is only the warning stage. Warnings start when the oldest XID is 40 million transactions from the wraparound point. The 39985967 in the log is the number of transactions left, about 40 million. If ignored, under 3 million left Postgres refuses every command that needs a new XID. It is not an ANALYZE hint: ANALYZE only refreshes statistics and freezes nothing. The fix is a database-wide VACUUM (as superuser), not a restart."
  - q:
      vi: "`age(datfrozenxid)` tăng đều mỗi ngày dù autovacuum vẫn chạy. Nguyên nhân thường gặp nhất là gì?"
      en: "`age(datfrozenxid)` grows every day even though autovacuum keeps running. What is the most common cause?"
    options:
      - { vi: "`fillfactor` quá thấp", en: "`fillfactor` is too low" }
      - { vi: "Một transaction mở rất lâu (hoặc prepared transaction bị bỏ quên) giữ mốc xmin, nên VACUUM không freeze được", en: "A very long open transaction (or a forgotten prepared transaction) holds back the xmin horizon, so VACUUM cannot freeze" }
      - { vi: "Autovacuum chạy quá thưa; chỉ cần giảm `autovacuum_naptime`", en: "Autovacuum runs too rarely; just lower `autovacuum_naptime`" }
    answer: 1
    why:
      vi: "Cho autovacuum chạy dày hơn nghe hợp lý, nhưng VACUUM chỉ freeze và dọn được tuple mà không transaction nào còn cần. Ranh giới đó là mốc xmin (xmin horizon): `xmin` của transaction cũ nhất còn mở. Một phiên \"idle in transaction\" mở cả ngày giữ mốc đó đứng yên, nên mỗi lần chạy, dù dày tới đâu, đều dừng ở cùng chỗ và tuổi cứ tăng. `fillfactor` chỉ quyết định chỗ trống trên trang, không liên quan tới freeze. Tìm phiên đó trong `pg_stat_activity` (cột `backend_xmin`) và `pg_prepared_xacts`."
      en: "Running autovacuum more often sounds right, but VACUUM can only freeze and remove tuples no transaction still needs. That boundary is the xmin horizon: the `xmin` of the oldest open transaction. An \"idle in transaction\" session left open all day pins that horizon, so every run, however frequent, stops at the same place and the age keeps growing. `fillfactor` only decides the free space on a page and has nothing to do with freezing. Find that session in `pg_stat_activity` (column `backend_xmin`) and `pg_prepared_xacts`."
---
## Mở bài

Một sáng, log của máy chủ báo "database must be vacuumed within N transactions", và con số N giảm dần theo từng giờ. Bạn còn bao nhiêu thời gian, và nên làm gì trước?

## Ý chính

XID (số hiệu transaction) chỉ có 32 bit và được so theo modulo 2³². Với một XID bất kỳ, khoảng 2 tỉ XID đứng "trước" nó và 2 tỉ đứng "sau". Một tuple chưa freeze mà già hơn 2 tỉ transaction sẽ bỗng nằm "ở tương lai" và biến mất khỏi mọi truy vấn. Vì vậy mỗi bảng phải được VACUUM (freeze) ít nhất một lần trong mỗi 2 tỉ transaction.

Mỗi bảng có `relfrozenxid`, mỗi database có `datfrozenxid`: mốc mà mọi XID cũ hơn đã được freeze. Tuổi của mốc này, `age()`, là thước đo rủi ro. Khi tuổi vượt `autovacuum_freeze_max_age` (mặc định 200 triệu), autovacuum ép một lần VACUUM chống wraparound, kể cả khi autovacuum đang tắt. Khi tuổi vượt `vacuum_failsafe_age` (1,6 tỉ), VACUUM bỏ qua phần việc không cần thiết và chạy hết tốc lực để freeze.

Nếu không ai freeze được: khi XID cũ nhất còn cách điểm quay vòng 40 triệu, log ghi cảnh báo kèm số transaction còn lại. Khi còn dưới 3 triệu, Postgres từ chối cấp XID mới, nghĩa là mọi lệnh ghi bị từ chối, cho tới khi cả database được VACUUM.

Nhiều người nghĩ autovacuum chạy dày hơn là đủ để tuổi giảm. Thật ra VACUUM chỉ freeze được tuple mà không transaction nào còn cần. Một phiên "idle in transaction" mở cả ngày, hay một prepared transaction bị quên, giữ mốc xmin đứng yên, và mọi lần VACUUM đều bị nó chặn. Phải tìm và kết thúc thủ phạm trước.

Hình từng bước ở cuối mục này đặt các mốc trên cùng một thước tuổi XID, theo giá trị mặc định trong tài liệu.

## Ví dụ

Tuổi của từng database, con số cần theo dõi trên máy chủ thật:

```sql
SELECT datname, age(datfrozenxid) AS xid_age, mxid_age(datminmxid) AS mxid_age
FROM pg_database
ORDER BY datname;
```

Freeze một bảng làm tuổi của nó về 0:

```sql
CREATE TABLE events(id int PRIMARY KEY, kind text);
INSERT INTO events VALUES (1, 'a'), (2, 'b');
VACUUM (FREEZE) events;
SELECT relname, age(relfrozenxid) AS xid_age FROM pg_class WHERE relname = 'events';
```

Tìm phiên đang giữ mốc xmin, phiên già nhất trước:

```sql
SELECT pid, state, age(backend_xmin) AS xmin_age
FROM pg_stat_activity
WHERE backend_xmin IS NOT NULL
ORDER BY age(backend_xmin) DESC;
```

Ở đây chỉ có phiên của bạn với tuổi 0. Trên máy chủ thật, một dòng `idle in transaction` có tuổi hàng triệu là thủ phạm; xem thêm `pg_prepared_xacts`.

Các ngưỡng đang dùng:

```sql
SELECT name, setting
FROM pg_settings
WHERE name IN ('autovacuum_freeze_max_age', 'vacuum_freeze_min_age', 'vacuum_freeze_table_age', 'vacuum_failsafe_age')
ORDER BY name;
```

## Thực hành

Wraparound thật cần hàng tỉ transaction, không làm lại được trong trình duyệt, nên bài này là ba câu hỏi về những gì bạn sẽ gặp trên máy chủ thật.

## Tóm tắt

- XID 32 bit so theo modulo: mỗi bảng phải được freeze ít nhất một lần trong mỗi 2 tỉ transaction.
- `age(relfrozenxid)` và `age(datfrozenxid)` đo rủi ro; từ 200 triệu autovacuum ép VACUUM chống wraparound.
- Cảnh báo bắt đầu khi còn 40 triệu; dưới 3 triệu Postgres từ chối mọi lệnh cần XID mới.
- Tuổi tăng mãi thường do một transaction mở lâu hay prepared transaction bị quên; tìm trong `pg_stat_activity` và `pg_prepared_xacts`.

# EN

## Opening

One morning the server log says "database must be vacuumed within N transactions", and N keeps falling hour by hour. How much time do you have left, and what should you do first?

## Key idea

An XID (transaction ID) is only 32 bits and is compared modulo 2^32. For any XID, about 2 billion XIDs lie "before" it and 2 billion "after". An unfrozen tuple older than 2 billion transactions suddenly sits "in the future" and vanishes from every query. So every table must be vacuumed (frozen) at least once every 2 billion transactions.

Every table has a `relfrozenxid` and every database a `datfrozenxid`: the horizon below which all XIDs are frozen. Its age, `age()`, measures the risk. Once the age passes `autovacuum_freeze_max_age` (200 million by default), autovacuum forces an anti-wraparound VACUUM, even when autovacuum is turned off. Once it passes `vacuum_failsafe_age` (1.6 billion), VACUUM skips non-essential work and runs flat out to freeze.

If nobody manages to freeze: once the oldest XID is 40 million transactions from the wraparound point, the log warns with the number of transactions left. Under 3 million left, Postgres refuses to assign new XIDs, meaning every write is refused, until the whole database is vacuumed.

Many people think running autovacuum more often is enough to bring the age down. In fact VACUUM can only freeze tuples no transaction still needs. An "idle in transaction" session left open all day, or a forgotten prepared transaction, pins the xmin horizon, and every VACUUM is held back by it. Find and end the culprit first.

The step-through figure at the end of this section puts these marks on one XID age ruler, with the defaults from the documentation.

## Example

The age of each database, the number to watch on a real server:

```sql
SELECT datname, age(datfrozenxid) AS xid_age, mxid_age(datminmxid) AS mxid_age
FROM pg_database
ORDER BY datname;
```

Freezing a table brings its age back to 0:

```sql
CREATE TABLE events(id int PRIMARY KEY, kind text);
INSERT INTO events VALUES (1, 'a'), (2, 'b');
VACUUM (FREEZE) events;
SELECT relname, age(relfrozenxid) AS xid_age FROM pg_class WHERE relname = 'events';
```

Find the sessions holding the xmin horizon, oldest first:

```sql
SELECT pid, state, age(backend_xmin) AS xmin_age
FROM pg_stat_activity
WHERE backend_xmin IS NOT NULL
ORDER BY age(backend_xmin) DESC;
```

Here there is only your own session, with age 0. On a real server an `idle in transaction` row millions of transactions old is the culprit; check `pg_prepared_xacts` too.

The thresholds in use:

```sql
SELECT name, setting
FROM pg_settings
WHERE name IN ('autovacuum_freeze_max_age', 'vacuum_freeze_min_age', 'vacuum_freeze_table_age', 'vacuum_failsafe_age')
ORDER BY name;
```

## Practice

Real wraparound takes billions of transactions and cannot be replayed in the browser, so this lesson is three questions about what you will meet on a real server.

## Recap

- 32-bit XIDs compared modulo: every table must be frozen at least once every 2 billion transactions.
- `age(relfrozenxid)` and `age(datfrozenxid)` measure the risk; from 200 million autovacuum forces an anti-wraparound VACUUM.
- Warnings start at 40 million left; under 3 million Postgres refuses every command that needs a new XID.
- An age that keeps growing usually means a long open transaction or a forgotten prepared transaction; look in `pg_stat_activity` and `pg_prepared_xacts`.
