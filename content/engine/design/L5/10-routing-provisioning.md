---
id: e-ds-l5-10
engine: design
level: L5
module: tenant-platform
title: Định tuyến và cấp phát shard
title_en: Routing and provisioning shards
kind: concept
runtime: browser
minutes: 15
viz: pg-tenant-placement
figures: [{ name: ds-tenant-routing, at: idea }]
objectives:
  - vi: Tra danh mục để định tuyến một yêu cầu tới proxy của shard đúng, và chuyển một khách bằng một lần đổi dòng có kiểm phiên bản.
    en: Look up the catalog to route a request to the right shard's proxy, and move a tenant with one version-checked row change.
  - vi: Biết phần nào của nền tảng chạy được ở đây (danh mục) và phần nào chỉ là minh họa (proxy, cấp phát, sao chép).
    en: Know which part of the platform runs here (the catalog) and which is only an illustration (proxy, provisioning, replication).
  - vi: Nhận ra ba lỗi vận hành thường gặp - kiểm sức khỏe sai đường, thứ tự cấp quyền chỉ lộ trên môi trường mới, slot sao chép bỏ quên.
    en: Spot three common operations mistakes - health checks on the wrong path, a grant order that fails only on a fresh environment, a forgotten replication slot.
requires: [e-ds-l5-09]
sources:
  - url: https://www.postgresql.org/docs/18/sql-grant.html
    title: "GRANT"
    title_vi: "GRANT"
  - url: https://www.postgresql.org/docs/18/logicaldecoding-explanation.html#LOGICALDECODING-REPLICATION-SLOTS
    title: "Logical Decoding › Replication Slots"
    title_vi: "Logical decoding › replication slot"
  - url: https://www.postgresql.org/docs/18/view-pg-replication-slots.html
    title: "pg_replication_slots"
    title_vi: "pg_replication_slots"
lab:
  setup: |
    CREATE TABLE shards (
      shard_id text PRIMARY KEY,
      tier text NOT NULL,
      state text NOT NULL CHECK (state IN ('creating', 'serving', 'draining')),
      proxy_host text NOT NULL,
      proxy_ok boolean NOT NULL,
      writer_ok boolean NOT NULL
    );
    INSERT INTO shards VALUES
      ('s1', 'pool', 'serving', 'proxy-s1.lab', true, true),
      ('s2', 'pool', 'draining', 'proxy-s2.lab', true, true),
      ('s3', 'dedicated', 'serving', 'proxy-s3.lab', true, true),
      ('s4', 'dedicated', 'serving', 'proxy-s4.lab', true, true),
      ('s5', 'dedicated', 'creating', 'proxy-s5.lab', false, true);
    CREATE TABLE directory (
      tenant_id text PRIMARY KEY,
      tier text NOT NULL,
      shard_id text NOT NULL REFERENCES shards,
      version int NOT NULL
    );
    INSERT INTO directory VALUES
      ('t-01', 'free', 's1', 1), ('t-02', 'free', 's1', 1), ('t-03', 'pro', 's1', 1),
      ('t-04', 'pro', 's2', 1), ('t-05', 'free', 's2', 1), ('t-06', 'enterprise', 's3', 1);
  steps:
    - task:
        vi: "Yêu cầu của khách `t-04` vừa tới. Bộ định tuyến gửi nó tới proxy nào? Lấy `tenant_id`, `proxy_host`."
        en: "A request from tenant `t-04` has just arrived. Which proxy does the router send it to? Get `tenant_id`, `proxy_host`."
      solution: SELECT d.tenant_id, s.proxy_host FROM directory d JOIN shards s ON s.shard_id = d.shard_id WHERE d.tenant_id = 't-04'
      check: rows
      hint:
        vi: "Nối `directory` với `shards` bằng `shard_id`, lọc `d.tenant_id = 't-04'`."
        en: "Join `directory` to `shards` on `shard_id`, filter `d.tenant_id = 't-04'`."
    - task:
        vi: "Dữ liệu của `t-04` đã chép xong sang shard riêng `s4`. Đổi dòng danh mục của nó sang `s4` và tăng `version` thêm 1, chỉ khi `version` vẫn là 1 (không ai đổi trước bạn). Bài chấm bằng toàn bộ danh mục."
        en: "`t-04`'s data has been copied to the dedicated shard `s4`. Change its catalog row to `s4` and raise `version` by 1, only if `version` is still 1 (nobody changed it before you). It is graded by the whole catalog."
      solution: UPDATE directory SET shard_id = 's4', version = version + 1 WHERE tenant_id = 't-04' AND version = 1
      after: SELECT tenant_id, shard_id, version FROM directory ORDER BY tenant_id
      check: rows
      ordered: true
      hint:
        vi: "`UPDATE directory SET shard_id = 's4', version = version + 1 WHERE tenant_id = 't-04' AND version = 1`."
        en: "`UPDATE directory SET shard_id = 's4', version = version + 1 WHERE tenant_id = 't-04' AND version = 1`."
    - task:
        vi: "`s2` đang rút tải. Sau khi chuyển `t-04`, khách nào còn ở một shard đang rút tải? Lấy `tenant_id`, `shard_id`, xếp theo `tenant_id`."
        en: "`s2` is draining. After moving `t-04`, which tenants still live on a draining shard? Get `tenant_id`, `shard_id`, ordered by `tenant_id`."
      solution: SELECT d.tenant_id, d.shard_id FROM directory d JOIN shards s ON s.shard_id = d.shard_id WHERE s.state = 'draining' ORDER BY d.tenant_id
      check: rows
      ordered: true
      hint:
        vi: "Nối như bước 1, lọc `s.state = 'draining'`."
        en: "Join as in step 1, filter `s.state = 'draining'`."
quiz:
  - q:
      vi: "Token đăng nhập của người dùng nên mang gì để bộ định tuyến tìm đúng shard?"
      en: "What should a user's sign-in token carry so the router finds the right shard?"
    options:
      - { vi: "Chỉ tenant_id; shard thì tra danh mục", en: "Only tenant_id; look the shard up" }
      - { vi: "Cả tenant_id lẫn shard cho nhanh", en: "Both tenant_id and shard, for speed" }
      - { vi: "Chỉ shard, vì đó là thứ cần tìm", en: "Only the shard, as that is the goal" }
    answer: 0
    trap: 1
    why:
      vi: "Mang thêm shard nghe nhanh hơn vì bỏ được một lần tra, nhưng nơi ở của khách đổi khi chuyển shard (như `t-04` từ `s2` sang `s4` trong lab), còn token đã cấp vẫn sống thêm nhiều giờ, nên nó gửi yêu cầu tới shard cũ. Chỉ mang shard thì còn tệ hơn: mất luôn danh tính khách. Token mang `tenant_id` (từ một claim đã ký); nơi ở luôn tra danh mục."
      en: "Carrying the shard too sounds faster because it saves a lookup, but a tenant's home changes during a move (like `t-04` from `s2` to `s4` in the lab), while issued tokens live on for hours, so it sends requests to the old shard. Carrying only the shard is worse: the tenant's identity is gone. The token carries `tenant_id` (from a signed claim); the home always comes from the catalog."
  - q:
      vi: "Kịch bản dựng shard chạy xanh trên môi trường thử, rồi báo lỗi 42704 trên một môi trường mới tinh. Nguyên nhân dễ gặp nhất?"
      en: "The shard bootstrap script passes on the test environment, then fails with error 42704 on a brand-new one. What is the most likely cause?"
    options:
      - { vi: "Máy mới chậm nên lệnh hết giờ", en: "The new machine is slow and timed out" }
      - { vi: "Máy mới chưa có bản sao lưu", en: "The new machine has no backup yet" }
      - { vi: "Cấp quyền trước khi tạo vai trò", en: "It grants before creating the role" }
    answer: 2
    trap: 0
    why:
      vi: "Lỗi chỉ ở máy mới nghe như lỗi của máy, nhưng mã lỗi nói khác: hết giờ hay thiếu bản sao lưu không ra 42704. Mã 42704 nghĩa là đối tượng được nhắc tới không tồn tại, ở đây là vai trò (role) trong câu `GRANT`. Trên môi trường thử, vai trò còn sót từ lần chạy trước nên thứ tự sai bị che; môi trường mới tinh chưa có nó. Sửa thứ tự (tạo vai trò trước, cấp quyền sau) và luôn thử kịch bản dựng trên môi trường mới."
      en: "A failure only on the new machine sounds like the machine's fault, but the error code says otherwise: a timeout or a missing backup does not give 42704. Code 42704 means the object named does not exist, here the role in the `GRANT`. On the test environment the role was left over from an earlier run, which hid the wrong order; a brand-new environment does not have it. Fix the order (create the role, then grant) and always test bootstrap scripts on a fresh environment."
---
## Mở bài

Một yêu cầu của người bán Chợ Lồng Đèn chỉ mang `tenant_id`; phải có ai đó biết gửi nó tới đâu. Bài này chạy phần tra cứu thật trên danh mục, còn proxy, kịch bản dựng shard và sao chép dữ liệu là các khối minh họa, vì trình duyệt không có chúng. Sơ đồ ở cuối bài, sau phần Lỗi hay gặp, cũng là một minh họa: khách nào ở shard nào và một lần chuyển khách.

## Ý chính

Định tuyến: bộ định tuyến đọc `tenant_id` từ danh tính đã kiểm (một claim đã ký, không phải thân yêu cầu), tra danh mục ra shard, rồi gửi tới proxy của shard đó. Danh mục chỉ ghi địa chỉ proxy, không ghi địa chỉ máy ghi trực tiếp, để không ứng dụng nào "đi tắt khi proxy hỏng". Mỗi shard có một proxy gộp kết nối riêng; proxy không định tuyến giữa các shard.

Chuyển một khách: tạm chặn ghi của khách, chép dữ liệu theo lô, so số dòng và mã băm, rồi đổi đúng một dòng danh mục kèm số phiên bản, kiểm định tuyến, cuối cùng mới xóa ở shard cũ. Đổi dòng kèm `AND version = 1` để hai tiến trình không cùng chuyển một khách.

**Bản nhớ tạm của bộ định tuyến**: tra danh mục ở mọi yêu cầu thì chậm, nên bộ định tuyến giữ kết quả vài giây. Ngay sau một lần chuyển, bản nhớ tạm có thể còn trỏ về shard cũ. Vì vậy shard cũ tiếp tục chặn ghi của khách đã đi: yêu cầu đến nhầm bị từ chối với một mã báo "đã chuyển", bộ định tuyến bỏ bản nhớ tạm, tra lại và thử lại. Không có yêu cầu nào lặng lẽ ghi vào nơi ở cũ.

**Khi danh mục không trả lời**: bộ định tuyến từ chối yêu cầu và báo lỗi tạm thời, không bao giờ gửi tới một shard "mặc định". Đoán sai một lần là ghi dữ liệu của người bán này vào chỗ của người bán khác, và lỗi đó khó gỡ hơn nhiều so với vài giây báo bận.

Cấp phát: mỗi shard là một khối cố định (cụm máy, proxy, cấu hình có phiên bản, khóa mã hóa, bí mật cho từng vai trò, cảnh báo), dựng bằng cùng một mô-đun hạ tầng cho cả gói chung lẫn gói riêng, chỉ khác tham số. Kịch bản dựng chỉ tạo vai trò, chưa tạo bảng. Nhiều người nghĩ kịch bản chạy xanh một lần là xong. Thật ra nó phải được thử trên môi trường mới tinh, và phải kiểm theo đúng đường ứng dụng đi: qua proxy.

Hình dưới minh họa đường đi của một yêu cầu, khi khách vừa chuyển shard và khi danh mục không trả lời (không chạy trong trình duyệt).

## Ví dụ

Tra một khách: danh mục trả về proxy, không phải máy ghi:

```sql
SELECT d.tenant_id, d.shard_id,
  s.proxy_host
FROM directory d
JOIN shards s
  ON s.shard_id = d.shard_id
WHERE d.tenant_id = 't-06';
```

Khách trên từng shard; `s2` đang rút tải mà còn hai khách:

```sql
SELECT shard_id,
  string_agg(tenant_id, ', '
    ORDER BY tenant_id) AS tenants
FROM directory
GROUP BY shard_id
ORDER BY shard_id;
```

Hai tiến trình cùng muốn chuyển `t-05`, mỗi bên một lần đổi dòng có kiểm phiên bản. Mỗi lần Chạy bắt đầu từ dữ liệu mới, nên khối dưới chạy cả hai lần đổi trong một lần Chạy: lần đầu đưa khách sang `s1` và nâng phiên bản lên 2, lần thứ hai (muốn đưa sang `s3`) không khớp dòng nào vì phiên bản không còn là 1. Kết quả còn `s1` và 2:

```sql
UPDATE directory
SET shard_id = 's1',
    version = version + 1
WHERE tenant_id = 't-05'
  AND version = 1;
UPDATE directory
SET shard_id = 's3',
    version = version + 1
WHERE tenant_id = 't-05'
  AND version = 1;
SELECT tenant_id, shard_id, version
FROM directory
WHERE tenant_id = 't-05';
```

## Lỗi hay gặp

Kịch bản dựng cấp quyền cho vai trò của bộ định tuyến trước khi tạo vai trò đó. Trên môi trường cũ vai trò đã có nên kịch bản chạy qua; trên môi trường mới tinh nó dừng:

```sql
-- ERROR 42704
GRANT SELECT ON directory
  TO router_ro;
```

Kiểm sức khỏe bằng máy ghi trực tiếp thì thấy cả `s5`, nhưng proxy của `s5` chưa chạy và ứng dụng chỉ đi qua proxy. Kiểm theo đường thật thì `s5` không có mặt:

```sql
-- WRONG
SELECT shard_id
FROM shards
WHERE writer_ok
ORDER BY shard_id;
```

```sql
-- FIX
SELECT shard_id
FROM shards
WHERE proxy_ok
ORDER BY shard_id;
```

Slot sao chép logic (dùng để chuyển khách không ngừng máy, hay đẩy thay đổi sang kho khác) mà bị bỏ quên thì giữ WAL lại và chặn vacuum dọn dòng cũ trên shard nguồn. PGlite không có slot nào, nên đây là câu để chạy trên máy chủ thật, kèm cảnh báo khi có kết quả:

```text
SELECT slot_name, active
FROM pg_replication_slots
WHERE NOT active;
```

## Tóm tắt

- Bộ định tuyến tra `tenant_id` trong danh mục ra proxy của shard; token chỉ mang danh tính, không mang nơi ở.
- Chuyển khách = chép, kiểm, rồi đổi một dòng danh mục kèm kiểm phiên bản; xóa ở shard cũ sau cùng.
- Kịch bản dựng shard: tạo vai trò trước khi cấp quyền, thử trên môi trường mới tinh, kiểm sức khỏe qua proxy.
- Slot sao chép không hoạt động chặn vacuum: cảnh báo khi có slot như vậy.
- Đọc tiếp: bài tổng hợp `e-ds-l5-11` và bản đồ chủ đề `e-ds-l4-09`.

# EN

## Opening

A Lantern Market seller's request carries only `tenant_id`; someone has to know where to send it. This lesson runs the lookup for real on the catalog, while the proxy, the shard bootstrap script and data replication are illustration blocks, because the browser has none of them. The diagram at the end, after Common mistakes, is an illustration too: which tenant lives on which shard, and one tenant move.

## Key idea

Routing: the router reads `tenant_id` from a verified identity (a signed claim, not the request body), looks the shard up in the catalog, then sends the request to that shard's proxy. The catalog holds only proxy addresses, never the direct writer address, so no application "takes a shortcut when the proxy is down". Each shard has its own connection-pooling proxy; a proxy does not route between shards.

Moving a tenant: block the tenant's writes, copy its data in batches, compare row counts and hashes, then change exactly one catalog row with a version number, check routing, and only then delete on the old shard. The row change carries `AND version = 1` so two processes never move the same tenant.

**The router's cache**: looking the catalog up on every request is slow, so the router keeps the answer for a few seconds. Right after a move, that cached copy may still point at the old shard. So the old shard keeps blocking the moved tenant's writes: a request that lands there is refused with a "moved" code, and the router drops its cache, looks up again and retries. No request quietly writes to the old home.

**When the catalog does not answer**: the router refuses the request with a temporary error, and never sends it to a "default" shard. One wrong guess writes this seller's data into another seller's place, which is far harder to undo than a few seconds of "busy".

Provisioning: each shard is a fixed unit (cluster, proxy, versioned settings, encryption key, a secret per role, alarms), built from the same infrastructure module for shared and dedicated tiers, with different inputs only. The bootstrap script creates roles but no tables yet. Many people think a script that passed once is done. In fact it must be tested on a brand-new environment, and checked along the path applications really take: through the proxy.

The figure below illustrates one request's path, right after the tenant moved and when the directory does not answer (not run in the browser).

## Example

Look one tenant up: the catalog returns the proxy, not the writer:

```sql
SELECT d.tenant_id, d.shard_id,
  s.proxy_host
FROM directory d
JOIN shards s
  ON s.shard_id = d.shard_id
WHERE d.tenant_id = 't-06';
```

The tenants on each shard; `s2` is draining yet still holds two tenants:

```sql
SELECT shard_id,
  string_agg(tenant_id, ', '
    ORDER BY tenant_id) AS tenants
FROM directory
GROUP BY shard_id
ORDER BY shard_id;
```

Two processes both want to move `t-05`, each with one version-checked row change. Every Run starts from fresh data, so the block below runs both changes in one Run: the first moves the tenant to `s1` and raises the version to 2, the second (aiming at `s3`) matches no row because the version is no longer 1. The result still says `s1` and 2:

```sql
UPDATE directory
SET shard_id = 's1',
    version = version + 1
WHERE tenant_id = 't-05'
  AND version = 1;
UPDATE directory
SET shard_id = 's3',
    version = version + 1
WHERE tenant_id = 't-05'
  AND version = 1;
SELECT tenant_id, shard_id, version
FROM directory
WHERE tenant_id = 't-05';
```

## Common mistakes

The bootstrap script grants to the router's role before creating that role. On the old environment the role already existed, so the script passed; on a brand-new one it stops:

```sql
-- ERROR 42704
GRANT SELECT ON directory
  TO router_ro;
```

A health check on the direct writer also sees `s5`, but `s5`'s proxy is not running and applications only go through the proxy. Checking the real path leaves `s5` out:

```sql
-- WRONG
SELECT shard_id
FROM shards
WHERE writer_ok
ORDER BY shard_id;
```

```sql
-- FIX
SELECT shard_id
FROM shards
WHERE proxy_ok
ORDER BY shard_id;
```

A forgotten logical replication slot (used to move a tenant without downtime, or to stream changes to another store) holds WAL back and stops vacuum from cleaning old rows on the source shard. PGlite has no slots, so this is a query to run on a real server, with an alert when it returns anything:

```text
SELECT slot_name, active
FROM pg_replication_slots
WHERE NOT active;
```

## Recap

- The router looks `tenant_id` up in the catalog to find the shard's proxy; the token carries identity, never the home.
- Moving a tenant = copy, check, then change one catalog row with a version check; delete on the old shard last.
- Shard bootstrap scripts: create roles before granting, test on a brand-new environment, check health through the proxy.
- An inactive replication slot blocks vacuum: alert when one exists.
- Read next: the capstone `e-ds-l5-11` and the topic map `e-ds-l4-09`.
