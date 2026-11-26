---
id: e-ds-l5-08
engine: design
level: L5
module: tenant-platform
title: Danh mục khách và shard - đặt khách theo gói
title_en: Tenant and shard catalog - placing tenants by tier
kind: lab
runtime: browser
minutes: 18
figures: [{ name: ds-shard-catalog, at: idea }]
objectives:
  - vi: Dựng danh mục bằng bảng thường - shard (gói, trạng thái, sức chứa) và nơi ở của từng khách theo thời gian.
    en: Build the catalog from plain tables - shards (tier, state, capacity) and where each tenant lives over time.
  - vi: Dùng ràng buộc loại trừ để mỗi khách chỉ có một nơi ở tại một thời điểm.
    en: Use an exclusion constraint so each tenant has exactly one home at any moment.
  - vi: Chọn shard ít tải nhất đúng gói, bỏ qua shard đang tạo hay đang rút tải.
    en: Pick the least-loaded shard of the right tier, skipping shards being created or drained.
requires: [e-ds-l4-11]
sources:
  - url: https://www.postgresql.org/docs/18/rangetypes.html
    title: "Range Types"
  - url: https://www.postgresql.org/docs/18/ddl-constraints.html#DDL-CONSTRAINTS-EXCLUSION
    title: "Constraints › Exclusion Constraints"
  - url: https://www.postgresql.org/docs/18/btree-gist.html
    title: "btree_gist"
lab:
  setup: |
    CREATE EXTENSION btree_gist;
    CREATE TABLE shards (
      shard_id text PRIMARY KEY,
      tier text NOT NULL CHECK (tier IN ('pool', 'dedicated')),
      state text NOT NULL CHECK (state IN ('creating', 'serving', 'draining')),
      capacity int NOT NULL
    );
    INSERT INTO shards VALUES
      ('s1', 'pool', 'serving', 4), ('s2', 'pool', 'serving', 4), ('s3', 'dedicated', 'serving', 1),
      ('s4', 'pool', 'draining', 4), ('s5', 'pool', 'creating', 4);
    CREATE TABLE tenants (
      tenant_id text PRIMARY KEY,
      name text NOT NULL,
      tier text NOT NULL CHECK (tier IN ('free', 'pro', 'enterprise'))
    );
    INSERT INTO tenants VALUES
      ('t-01', 'Lan Silk', 'pro'), ('t-02', 'Minh Tea', 'free'), ('t-03', 'Hoa Lamp', 'free'),
      ('t-04', 'Bao Ceramics', 'enterprise'), ('t-05', 'Thu Paper', 'pro'), ('t-06', 'Quang Wood', 'free'),
      ('t-07', 'Mai Herbs', 'free'), ('t-08', 'Linh Bags', 'pro');
    CREATE TABLE placements (
      tenant_id text NOT NULL REFERENCES tenants,
      shard_id text NOT NULL REFERENCES shards,
      during daterange NOT NULL,
      PRIMARY KEY (tenant_id, during)
    );
    INSERT INTO placements VALUES
      ('t-01', 's1', '[2026-01-05,)'), ('t-02', 's1', '[2026-02-10,)'), ('t-03', 's1', '[2026-03-01,)'),
      ('t-04', 's2', '[2026-01-20,2026-09-01)'), ('t-04', 's3', '[2026-09-01,)'),
      ('t-05', 's2', '[2026-04-12,)'), ('t-06', 's4', '[2026-05-03,)'), ('t-07', 's2', '[2026-06-18,)');
  steps:
    - task:
        vi: "Mỗi khách chỉ được có một nơi ở tại một thời điểm: thêm vào `placements` một ràng buộc loại trừ trên `tenant_id` (bằng nhau) và `during` (chồng nhau). Đừng đặt tên ràng buộc."
        en: "Each tenant may have only one home at a time: add an exclusion constraint to `placements` on `tenant_id` (equal) and `during` (overlapping). Do not name the constraint."
      solution: ALTER TABLE placements ADD EXCLUDE USING gist (tenant_id WITH =, during WITH &&)
      check: catalog
      hint:
        vi: "`ALTER TABLE placements ADD EXCLUDE USING gist (tenant_id WITH =, during WITH &&)`: `btree_gist` đã được cài trong lab."
        en: "`ALTER TABLE placements ADD EXCLUDE USING gist (tenant_id WITH =, during WITH &&)`: `btree_gist` is already installed in the lab."
    - task:
        vi: "Shard nào còn chỗ cho một khách gói pro hôm nay (`2026-10-31`)? Shard gói `pool`, trạng thái `serving`, số khách đang ở `load` nhỏ hơn `capacity`. Lấy `shard_id`, `load`, xếp theo `load` rồi `shard_id`."
        en: "Which shards have room for a pro tenant today (`2026-10-31`)? Shards of tier `pool`, state `serving`, with the number of tenants living there `load` below `capacity`. Get `shard_id`, `load`, ordered by `load`, then `shard_id`."
      solution: SELECT s.shard_id, count(p.tenant_id) AS load FROM shards s LEFT JOIN placements p ON p.shard_id = s.shard_id AND p.during @> DATE '2026-10-31' WHERE s.tier = 'pool' AND s.state = 'serving' GROUP BY s.shard_id HAVING count(p.tenant_id) < s.capacity ORDER BY load, s.shard_id
      check: rows
      ordered: true
      hint:
        vi: "Điều kiện ngày nằm trong `ON` của `LEFT JOIN`, để shard trống vẫn ra với `load` 0; lọc gói và trạng thái ở `WHERE`, sức chứa ở `HAVING`."
        en: "Put the date condition in the `LEFT JOIN`'s `ON`, so an empty shard still shows with `load` 0; filter tier and state in `WHERE`, capacity in `HAVING`."
    - task:
        vi: "Đặt người bán mới `t-08` vào shard ít tải nhất mà bước 2 tìm ra, từ `2026-10-31` không hạn. Bài chấm bằng nơi ở hôm nay của mọi khách."
        en: "Place the new seller `t-08` on the least-loaded shard that step 2 found, from `2026-10-31` with no end. It is graded by every tenant's home today."
      solution: INSERT INTO placements VALUES ('t-08', 's2', '[2026-10-31,)')
      after: SELECT tenant_id, shard_id FROM placements WHERE during @> DATE '2026-10-31' ORDER BY tenant_id
      check: rows
      ordered: true
      hint:
        vi: "`INSERT INTO placements VALUES ('t-08', 's2', '[2026-10-31,)')`: dấu `)` không có ngày cuối nghĩa là chưa hết hạn."
        en: "`INSERT INTO placements VALUES ('t-08', 's2', '[2026-10-31,)')`: a `)` with no end date means open-ended."
    - task:
        vi: "Khách nào hôm nay còn ở một shard đang rút tải (`draining`) và phải được chuyển đi? Lấy `tenant_id`, `shard_id`, xếp theo `tenant_id`."
        en: "Which tenants still live today on a shard that is draining (`draining`) and must be moved? Get `tenant_id`, `shard_id`, ordered by `tenant_id`."
      solution: SELECT p.tenant_id, p.shard_id FROM placements p JOIN shards s ON s.shard_id = p.shard_id WHERE s.state = 'draining' AND p.during @> DATE '2026-10-31' ORDER BY p.tenant_id
      check: rows
      ordered: true
      hint:
        vi: "Nối `placements` với `shards`, lọc `s.state = 'draining'` và `p.during @> DATE '2026-10-31'`."
        en: "Join `placements` to `shards`, filter `s.state = 'draining'` and `p.during @> DATE '2026-10-31'`."
quiz:
  - q:
      vi: "Shard `s4` đang rút tải và hiện ít khách nhất cụm. Có đặt khách mới vào đó được không?"
      en: "Shard `s4` is draining and now has the fewest tenants. Can a new tenant be placed there?"
    options:
      - { vi: "Không, nó chỉ phục vụ khách đang ở", en: "No, it only serves the tenants it has" }
      - { vi: "Có, vì nó đang là shard rảnh nhất", en: "Yes, as it is the least busy shard now" }
      - { vi: "Có, nhưng chỉ với khách gói free", en: "Yes, but only for free-tier tenants" }
    answer: 0
    trap: 1
    why:
      vi: "`s4` ít khách vì nó đang được làm trống để nghỉ hưu, không phải vì nó rảnh. Rút tải (draining) là đường một chiều: khách cũ vẫn được phục vụ, nhưng mỗi khách (tenant) mới đặt vào đó là thêm một lần chuyển sau này. Gói của khách không đổi điều đó, nên khách free cũng không được vào. Luật đặt khách chỉ xét shard đang `serving`."
      en: "`s4` has few tenants because it is being emptied to retire, not because it is idle. Draining is one way: existing tenants are still served, but every new tenant placed there is one more move later. The tenant's tier does not change that, so free tenants may not go there either. The placement rule only considers shards in state `serving`."
  - q:
      vi: "Vì sao nơi ở nằm trong bảng `placements` có khoảng ngày `during`, thay vì một cột `shard_id` trong `tenants`?"
      en: "Why does the home live in a `placements` table with a date range `during`, instead of a `shard_id` column in `tenants`?"
    options:
      - { vi: "Để index gist làm câu tra nhanh hơn", en: "So a gist index makes lookups faster" }
      - { vi: "Để một khách ở được hai shard cùng lúc", en: "So a tenant can live on two shards at once" }
      - { vi: "Để giữ lịch sử và cấm hai nơi chồng nhau", en: "To keep history and forbid overlapping homes" }
    answer: 2
    trap: 0
    why:
      vi: "Bảng riêng không để chạy nhanh: index gist ở đây phục vụ ràng buộc, không phải tốc độ. Nó cũng không cho ở hai shard cùng lúc, mà chính là để cấm điều đó. Một cột `shard_id` chỉ giữ nơi ở hiện tại; `placements` giữ cả lịch sử, nên trả lời được \"tháng 8 khách t-04 ở đâu\" (ở `s2`, trước khi chuyển sang `s3` ngày 2026-09-01). Ràng buộc loại trừ (exclusion constraint) chặn hai khoảng `during` chồng nhau của cùng một khách, kể cả lúc đang chuyển."
      en: "The separate table is not for speed: the gist index here serves the constraint, not performance. Nor does it let a tenant live on two shards at once; it exists to forbid that. A `shard_id` column holds only the current home; `placements` keeps the history, so it answers \"where did t-04 live in August\" (on `s2`, before moving to `s3` on 2026-09-01). The exclusion constraint blocks two overlapping `during` ranges for the same tenant, even during a move."
---
## Mở bài

Chợ Lồng Đèn giờ có năm shard và tám người bán, và mỗi yêu cầu đều hỏi cùng một câu: người bán này ở đâu? Câu trả lời phải nằm ở một chỗ và đúng ở mọi thời điểm, kể cả giữa lúc đang chuyển khách. Bài này dựng chỗ đó bằng vài bảng thường.

## Ý chính

Danh mục (catalog) là hai bảng. `shards` ghi mỗi shard thuộc gói nào (`pool` dùng chung hay `dedicated` riêng), đang ở trạng thái nào và chứa được bao nhiêu khách. `placements` ghi khách nào ở shard nào, từ ngày nào tới ngày nào. Chỉ một dịch vụ được ghi danh mục; công cụ dựng hạ tầng chỉ tạo máy và báo lên, danh mục kiểm rồi mới ghi. Một shard có máy mà chưa có trong danh mục thì không ai thấy, nên cũng không ai đặt nhầm khách vào.

Shard đi qua các trạng thái: đang tạo (`creating`), phục vụ (`serving`), rút tải (`draining`), rồi nghỉ. Rút tải nghĩa là khách cũ vẫn được phục vụ nhưng không nhận khách mới. Một shard từng giữ dữ liệu khách không bao giờ bị xóa tại chỗ; nó được rút tải, kiểm trống, chụp bản cuối, rồi mới nghỉ.

Luật đặt khách: khách mới vào shard ít tải nhất đúng gói, chỉ khi shard đang phục vụ và còn dưới sức chứa; khách enterprise vào shard riêng. Nhiều người nghĩ một cột `shard_id` trong bảng khách là đủ. Thật ra lúc chuyển khách và lúc đối soát, bạn cần biết khách ở đâu theo thời gian, và một ràng buộc loại trừ trên `(tenant_id, during)` bảo đảm không bao giờ có hai nơi ở chồng nhau.

**Vì sao không băm**: đặt khách bằng công thức `hash(tenant_id) % 5` thì không cần danh mục, nhưng công thức quyết thay bạn. Không thể đưa riêng một người bán lớn sang shard riêng, và thêm shard thứ sáu là đổi chỗ phần lớn khách cùng lúc. Danh mục tốn một lần tra cứu cho mỗi yêu cầu, đổi lại mỗi khách chuyển được một mình, vào lúc bạn chọn.

**Tra cứu phải rẻ**: mọi yêu cầu đều hỏi danh mục, nên câu "khách này ở đâu hôm nay" phải đọc qua index. Ràng buộc loại trừ đã dựng sẵn một index GiST trên `(tenant_id, during)`, và câu `WHERE tenant_id = 't-04' AND during @> DATE '2026-10-31'` dùng được nó. Bộ định tuyến thường giữ kết quả trong bộ nhớ vài giây; bài `e-ds-l5-10` nói cách giữ để bản nhớ tạm không đưa khách tới nơi ở cũ.

**Sức chứa đo bằng gì**: bài này đếm số khách cho dễ thấy. Hệ thống thật đo bằng tải (số yêu cầu, dung lượng, thời gian CPU), vì một người bán bận có thể nặng bằng mười người bán nhỏ.

Hình từng bước cuối mục này vẽ ba bảng của danh mục, rồi tải hôm nay của từng shard.

## Cú pháp

```sql
CREATE EXTENSION btree_gist;
ALTER TABLE placements
  ADD EXCLUDE USING gist (
    tenant_id WITH =,
    during WITH &&);
SELECT shard_id
FROM placements
WHERE tenant_id = 't-04'
  AND during @> DATE '2026-10-31';
```

- `daterange` có ngày đầu và ngày cuối để trống: `[2026-10-31,)` là chưa hết hạn.
- `@>` hỏi "khoảng này có chứa ngày đó không", `&&` hỏi "hai khoảng có chồng nhau không".
- `btree_gist` cho phép `=` trên cột `text` đứng chung một index gist với khoảng ngày.

## Ví dụ

Nơi ở hôm nay của từng khách, kèm gói:

```sql
SELECT p.tenant_id, t.tier,
  p.shard_id
FROM placements p
JOIN tenants t
  ON t.tenant_id = p.tenant_id
WHERE p.during
  @> DATE '2026-10-31'
ORDER BY p.tenant_id;
```

Tải của từng shard so với sức chứa; shard trống vẫn ra nhờ `LEFT JOIN`:

```sql
SELECT s.shard_id, s.state,
  count(p.tenant_id) AS load,
  s.capacity
FROM shards s
LEFT JOIN placements p
  ON p.shard_id = s.shard_id
 AND p.during
  @> DATE '2026-10-31'
GROUP BY s.shard_id
ORDER BY s.shard_id;
```

Lịch sử của `t-04`: chuyển từ `s2` sang shard riêng `s3` ngày 1/9, hai khoảng nối liền, không chồng:

```sql
SELECT shard_id, during
FROM placements
WHERE tenant_id = 't-04'
ORDER BY during;
```

## Lỗi hay gặp

Ràng buộc loại trừ từ chối nơi ở thứ hai chồng lên nơi ở cũ:

```sql
CREATE TABLE ex_homes (
  tenant_id text NOT NULL,
  shard_id text NOT NULL,
  during daterange NOT NULL,
  EXCLUDE USING gist (
    tenant_id WITH =,
    during WITH &&)
);
INSERT INTO ex_homes VALUES
  ('t-09', 's1', '[2026-01-01,)');
-- ERROR 23P01
INSERT INTO ex_homes VALUES
  ('t-09', 's2', '[2026-10-01,)');
```

Câu chọn shard quên trạng thái chọn `s5`, shard còn đang tạo, chưa có bảng nào. Thêm điều kiện trạng thái và sức chứa thì ra `s2`:

```sql
-- WRONG
SELECT s.shard_id,
  count(p.tenant_id) AS load
FROM shards s
LEFT JOIN placements p
  ON p.shard_id = s.shard_id
 AND p.during
  @> DATE '2026-10-31'
WHERE s.tier = 'pool'
GROUP BY s.shard_id
ORDER BY load, s.shard_id
LIMIT 1;
```

```sql
-- FIX
SELECT s.shard_id,
  count(p.tenant_id) AS load
FROM shards s
LEFT JOIN placements p
  ON p.shard_id = s.shard_id
 AND p.during
  @> DATE '2026-10-31'
WHERE s.tier = 'pool'
  AND s.state = 'serving'
GROUP BY s.shard_id
HAVING count(p.tenant_id)
  < s.capacity
ORDER BY load, s.shard_id
LIMIT 1;
```

## Thực hành

Bốn bước: thêm ràng buộc loại trừ (chấm bằng catalog), tìm shard còn chỗ cho khách gói pro, đặt người bán mới `t-08`, rồi liệt kê khách còn ở shard đang rút tải. Sau đó là hai câu hỏi.

## Tóm tắt

- Danh mục là bảng thường: `shards` (gói, trạng thái, sức chứa) và `placements` (khách, shard, khoảng ngày).
- Ràng buộc loại trừ `(tenant_id WITH =, during WITH &&)` giữ mỗi khách một nơi ở tại mỗi thời điểm.
- Khách mới chỉ vào shard đang phục vụ, đúng gói, dưới sức chứa; shard đang tạo hay rút tải không nhận khách.
- Đọc tiếp: `e-ds-l5-09` (đổi cấu trúc từng shard) và bản đồ chủ đề `e-ds-l4-09`.

# EN

## Opening

Lantern Market now has five shards and eight sellers, and every request asks the same question: where does this seller live? The answer must sit in one place and be right at every moment, even in the middle of a move. This lesson builds that place from a few plain tables.

## Key idea

The catalog is two tables. `shards` records each shard's tier (`pool` shared or `dedicated`), its state and how many tenants it holds. `placements` records which tenant lives on which shard, from which date to which date. Only one service writes the catalog; the infrastructure tooling only creates machines and reports them, and the catalog checks before it writes. A shard whose machines exist but that is not in the catalog is invisible, so nobody places a tenant there by mistake.

A shard moves through states: being created (`creating`), serving (`serving`), draining (`draining`), then retired. Draining means existing tenants are still served but no new ones are placed. A shard that ever held tenant data is never destroyed in place; it drains, is checked empty, gets a final snapshot, and only then retires.

The placement rule: a new tenant goes to the least-loaded shard of its tier, only if that shard is serving and below capacity; enterprise tenants go to a dedicated shard. Many people think one `shard_id` column in the tenant table is enough. In fact during a move and during billing checks you need to know where a tenant lived over time, and an exclusion constraint on `(tenant_id, during)` guarantees two homes never overlap.

**Why not hash**: placing tenants with the formula `hash(tenant_id) % 5` needs no catalog, but the formula decides for you. A large seller cannot be moved alone to a dedicated shard, and adding a sixth shard moves most tenants at once. The catalog costs one lookup per request; in return each tenant can move alone, when you choose.

**The lookup must be cheap**: every request asks the catalog, so "where does this tenant live today" must read through an index. The exclusion constraint already built a GiST index on `(tenant_id, during)`, and `WHERE tenant_id = 't-04' AND during @> DATE '2026-10-31'` can use it. Routers usually keep the answer in memory for a few seconds; lesson `e-ds-l5-10` shows how to keep that cached copy from sending a tenant to its old home.

**What capacity measures**: this lesson counts tenants to keep it visible. Real systems measure load (requests, storage, CPU time), because one busy seller can weigh as much as ten small ones.

The step-through figure at the end of this section draws the catalog's three tables, then today's load on each shard.

## Syntax

```sql
CREATE EXTENSION btree_gist;
ALTER TABLE placements
  ADD EXCLUDE USING gist (
    tenant_id WITH =,
    during WITH &&);
SELECT shard_id
FROM placements
WHERE tenant_id = 't-04'
  AND during @> DATE '2026-10-31';
```

- A `daterange` with a start date and an empty end: `[2026-10-31,)` is open-ended.
- `@>` asks "does this range contain that date", `&&` asks "do the two ranges overlap".
- `btree_gist` lets `=` on a `text` column share one gist index with a date range.

## Example

Each tenant's home today, with its tier:

```sql
SELECT p.tenant_id, t.tier,
  p.shard_id
FROM placements p
JOIN tenants t
  ON t.tenant_id = p.tenant_id
WHERE p.during
  @> DATE '2026-10-31'
ORDER BY p.tenant_id;
```

Each shard's load against its capacity; an empty shard still shows thanks to `LEFT JOIN`:

```sql
SELECT s.shard_id, s.state,
  count(p.tenant_id) AS load,
  s.capacity
FROM shards s
LEFT JOIN placements p
  ON p.shard_id = s.shard_id
 AND p.during
  @> DATE '2026-10-31'
GROUP BY s.shard_id
ORDER BY s.shard_id;
```

The history of `t-04`: moved from `s2` to the dedicated shard `s3` on 1 September, two ranges that meet without overlapping:

```sql
SELECT shard_id, during
FROM placements
WHERE tenant_id = 't-04'
ORDER BY during;
```

## Common mistakes

The exclusion constraint refuses a second home that overlaps the old one:

```sql
CREATE TABLE ex_homes (
  tenant_id text NOT NULL,
  shard_id text NOT NULL,
  during daterange NOT NULL,
  EXCLUDE USING gist (
    tenant_id WITH =,
    during WITH &&)
);
INSERT INTO ex_homes VALUES
  ('t-09', 's1', '[2026-01-01,)');
-- ERROR 23P01
INSERT INTO ex_homes VALUES
  ('t-09', 's2', '[2026-10-01,)');
```

A shard picker that forgets the state picks `s5`, a shard still being created, with no tables yet. Adding the state and capacity conditions gives `s2`:

```sql
-- WRONG
SELECT s.shard_id,
  count(p.tenant_id) AS load
FROM shards s
LEFT JOIN placements p
  ON p.shard_id = s.shard_id
 AND p.during
  @> DATE '2026-10-31'
WHERE s.tier = 'pool'
GROUP BY s.shard_id
ORDER BY load, s.shard_id
LIMIT 1;
```

```sql
-- FIX
SELECT s.shard_id,
  count(p.tenant_id) AS load
FROM shards s
LEFT JOIN placements p
  ON p.shard_id = s.shard_id
 AND p.during
  @> DATE '2026-10-31'
WHERE s.tier = 'pool'
  AND s.state = 'serving'
GROUP BY s.shard_id
HAVING count(p.tenant_id)
  < s.capacity
ORDER BY load, s.shard_id
LIMIT 1;
```

## Practice

Four steps: add the exclusion constraint (graded on the catalog), find the shards with room for a pro tenant, place the new seller `t-08`, then list the tenants still on a draining shard. Then two questions.

## Recap

- The catalog is plain tables: `shards` (tier, state, capacity) and `placements` (tenant, shard, date range).
- The exclusion constraint `(tenant_id WITH =, during WITH &&)` keeps each tenant to one home at any moment.
- New tenants only go to serving shards of the right tier below capacity; shards being created or drained take none.
- Read next: `e-ds-l5-09` (per-shard migrations) and the topic map `e-ds-l4-09`.
