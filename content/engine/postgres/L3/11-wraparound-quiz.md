---
id: e-pg-l3-11
engine: postgres
level: L3
module: vacuum-hot
title: Rủi ro XID wraparound
title_en: XID wraparound risk
kind: quiz
runtime: docs
minutes: 8
objectives:
  - vi: Nói đúng các ngưỡng cảnh báo và từ chối ghi khi XID sắp quay vòng
    en: State the warning and refuse-to-write thresholds near XID wraparound
  - vi: Chọn đúng việc cần làm khi `age(datfrozenxid)` tăng mãi
    en: Choose the right action when `age(datfrozenxid)` keeps growing
requires: [e-pg-l3-10]
sources:
  - https://www.postgresql.org/docs/18/routine-vacuuming.html
  - https://www.postgresql.org/docs/18/runtime-config-vacuum.html
quiz:
  - q:
      vi: "XID là số 32 bit so theo modulo 2³². Mỗi bảng phải được VACUUM (freeze) ít nhất một lần trong khoảng bao nhiêu transaction?"
      en: "XIDs are 32-bit numbers compared modulo 2^32. At least how often must every table be vacuumed (frozen)?"
    options:
      - { vi: "Mỗi 200 triệu transaction", en: "Every 200 million transactions" }
      - { vi: "Mỗi 2 tỉ transaction", en: "Every 2 billion transactions" }
      - { vi: "Mỗi 4 tỉ transaction", en: "Every 4 billion transactions" }
    answer: 1
    why:
      vi: "4 tỉ nghe hợp lý vì đó là giới hạn của số 32 bit, nhưng phép so sánh modulo chia vòng đó làm đôi. Với một XID bất kỳ, khoảng 2 tỉ XID là \"quá khứ\" và 2 tỉ là \"tương lai\". Tuple chưa freeze mà già hơn 2 tỉ transaction sẽ bỗng thành \"tương lai\" và biến mất. 200 triệu là mốc mặc định autovacuum bắt đầu ép freeze, sớm hơn nhiều."
      en: "4 billion sounds right because it is the 32-bit limit, but the modulo comparison splits that circle in half. For any XID, about 2 billion XIDs are \"past\" and 2 billion are \"future\". An unfrozen tuple older than 2 billion transactions suddenly becomes \"future\" and disappears. 200 million is the default point where autovacuum starts forcing a freeze, much earlier."
  - q:
      vi: "Log có dòng `WARNING: database \"mydb\" must be vacuumed within 39985967 transactions`. Postgres đang ở đâu?"
      en: "The log shows `WARNING: database \"mydb\" must be vacuumed within 39985967 transactions`. Where is Postgres?"
    options:
      - { vi: "Đã từ chối mọi lệnh ghi", en: "It already refuses all writes" }
      - { vi: "Còn khoảng 40 triệu transaction; dưới 3 triệu nó sẽ từ chối cấp XID mới", en: "About 40 million transactions left; under 3 million it will refuse to assign new XIDs" }
      - { vi: "Chỉ là gợi ý chạy ANALYZE", en: "It is only a hint to run ANALYZE" }
    answer: 1
    why:
      vi: "\"Đã từ chối mọi lệnh ghi\" nghe hợp lý vì một WARNING về wraparound nghe đã rất muộn, nhưng đây mới là mốc cảnh báo. Cảnh báo bắt đầu khi XID cũ nhất còn cách điểm quay vòng 40 triệu. Nếu bỏ qua, khi còn dưới 3 triệu, Postgres từ chối mọi lệnh cần XID mới. Cách chữa là VACUUM cả database (bởi superuser), không phải khởi động lại."
      en: "\"Already refuses all writes\" sounds right because a wraparound WARNING sounds very late, but this is only the warning stage. Warnings start when the oldest XID is 40 million transactions from the wraparound point. If ignored, under 3 million left Postgres refuses every command that needs a new XID. The fix is a database-wide VACUUM (as superuser), not a restart."
  - q:
      vi: "`age(datfrozenxid)` tăng đều mỗi ngày dù autovacuum vẫn chạy. Nguyên nhân thường gặp nhất là gì?"
      en: "`age(datfrozenxid)` grows every day even though autovacuum keeps running. What is the most common cause?"
    options:
      - { vi: "`fillfactor` quá thấp", en: "`fillfactor` is too low" }
      - { vi: "Một transaction mở rất lâu (hoặc prepared transaction bị bỏ quên) giữ mốc xmin, nên VACUUM không freeze được", en: "A very long open transaction (or a forgotten prepared transaction) holds back the xmin horizon, so VACUUM cannot freeze" }
      - { vi: "Autovacuum chạy quá thưa; chỉ cần giảm `autovacuum_naptime`", en: "Autovacuum runs too rarely; just lower `autovacuum_naptime`" }
    answer: 1
    why:
      vi: "VACUUM chỉ freeze và dọn tuple mà không transaction nào còn cần. Một phiên \"idle in transaction\" mở cả ngày giữ mốc đó đứng yên, nên tuổi cứ tăng. Cho autovacuum chạy dày hơn nghe hợp lý nhưng không giúp: mỗi lần chạy vẫn bị cùng mốc đó chặn. Tìm phiên đó trong `pg_stat_activity` (cột `backend_xmin`) và `pg_prepared_xacts`."
      en: "VACUUM only freezes and removes tuples no transaction still needs. An \"idle in transaction\" session left open all day pins that horizon, so the age keeps growing. Running autovacuum more often sounds right but does not help: every run is held back by the same horizon. Find that session in `pg_stat_activity` (column `backend_xmin`) and `pg_prepared_xacts`."
---

## Ý chính

Mỗi bảng có `relfrozenxid`, mỗi database có `datfrozenxid`: mốc mà mọi XID cũ hơn đã được freeze. Tuổi của mốc này (`age()`) là thước đo rủi ro wraparound. Autovacuum ép VACUUM chống wraparound khi tuổi vượt `autovacuum_freeze_max_age` (mặc định 200 triệu), kể cả khi autovacuum bị tắt.

## Ví dụ

```sql
SELECT datname, age(datfrozenxid) FROM pg_database ORDER BY 2 DESC;
```

## Thực hành

Bài này là sơ đồ và câu hỏi: wraparound thật cần hàng tỉ transaction, không làm được trong trình duyệt. Sau bài này bạn đọc được cảnh báo wraparound trong log, biết còn bao nhiêu thời gian, và tìm đúng thủ phạm giữ mốc xmin.

# EN

## Key idea

Every table has a `relfrozenxid` and every database a `datfrozenxid`: the horizon below which all XIDs are frozen. Its age (`age()`) measures wraparound risk. Autovacuum forces an anti-wraparound VACUUM once the age passes `autovacuum_freeze_max_age` (200 million by default), even when autovacuum is turned off.

## Example

```sql
SELECT datname, age(datfrozenxid) FROM pg_database ORDER BY 2 DESC;
```

## Practice

This lesson is diagrams and questions: real wraparound takes billions of transactions and cannot be reproduced in the browser. After this lesson you can read a wraparound warning in the log, tell how much time is left, and find the culprit that holds the xmin horizon back.
