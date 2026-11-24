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
objectives:
  - vi: Tra danh mục để định tuyến một yêu cầu tới proxy của shard đúng, và chuyển một khách bằng một lần đổi dòng có kiểm phiên bản.
    en: Look up the catalog to route a request to the right shard's proxy, and move a tenant with one version-checked row change.
  - vi: Biết phần nào của nền tảng chạy được ở đây (danh mục) và phần nào chỉ là minh họa (proxy, cấp phát, sao chép).
    en: Know which part of the platform runs here (the catalog) and which is only an illustration (proxy, provisioning, replication).
  - vi: Nhận ra ba lỗi vận hành thường gặp - kiểm sức khỏe sai đường, thứ tự cấp quyền chỉ lộ trên môi trường mới, slot sao chép bỏ quên.
    en: Spot three common operations mistakes - health checks on the wrong path, a grant order that fails only on a fresh environment, a forgotten replication slot.
requires: [e-ds-l5-09]
sources:
  - https://www.postgresql.org/docs/18/sql-grant.html
  - https://www.postgresql.org/docs/18/logicaldecoding-explanation.html#LOGICALDECODING-REPLICATION-SLOTS
  - https://www.postgresql.org/docs/18/view-pg-replication-slots.html
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
      - { vi: "tenant_id; shard thì tra danh mục", en: "tenant_id; look the shard up" }
      - { vi: "Cả tenant_id lẫn shard cho nhanh", en: "Both tenant_id and shard, for speed" }
      - { vi: "Chỉ shard, vì đó là thứ cần tìm", en: "Only the shard, as that is the goal" }
    answer: 0
    trap: 1
    why:
      vi: "Nghe hợp lý vì bỏ được một lần tra. Nhưng nơi ở của khách đổi khi chuyển shard, còn token đã cấp vẫn sống thêm nhiều giờ: token mang shard sẽ gửi yêu cầu tới shard cũ. Token mang danh tính (tenant_id, từ một claim đã ký); nơi ở luôn tra danh mục."
      en: "It sounds right because it saves a lookup. But a tenant's home changes during a move while issued tokens live on for hours: a token that carries the shard sends requests to the old one. The token carries identity (tenant_id, from a signed claim); the home always comes from the catalog."
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
      vi: "Nhiều người nghĩ lỗi chỉ ở máy mới thì do máy. Thật ra 42704 là 'vai trò không tồn tại': trên môi trường cũ vai trò đã có từ lần chạy trước, nên thứ tự sai bị che. Chỉ môi trường mới tinh lộ lỗi, nên hãy thử kịch bản dựng trên môi trường mới."
      en: "Many people think a failure only on the new machine is the machine's fault. In fact 42704 means 'role does not exist': on the old environment the role was left from an earlier run, which hid the wrong order. Only a brand-new environment shows it, so test bootstrap scripts on a fresh one."
---
## Mở bài

Một yêu cầu của người bán Chợ Lồng Đèn chỉ mang `tenant_id`; phải có ai đó biết gửi nó tới đâu. Bài này chạy phần tra cứu thật trên danh mục, còn proxy, kịch bản dựng shard và sao chép dữ liệu là các khối minh họa, vì trình duyệt không có chúng. Sơ đồ ở cuối bài, sau phần Lỗi hay gặp, cũng là một minh họa: khách nào ở shard nào và một lần chuyển khách.

## Ý chính

Định tuyến: bộ định tuyến đọc `tenant_id` từ danh tính đã kiểm (một claim đã ký, không phải thân yêu cầu), tra danh mục ra shard, rồi gửi tới proxy của shard đó. Danh mục chỉ ghi địa chỉ proxy, không ghi địa chỉ máy ghi trực tiếp, để không ứng dụng nào "đi tắt khi proxy hỏng". Mỗi shard có một proxy gộp kết nối riêng; proxy không định tuyến giữa các shard.

Chuyển một khách: khóa ghi của khách, chép dữ liệu theo lô, so số dòng và mã băm, rồi đổi đúng một dòng danh mục kèm số phiên bản, kiểm định tuyến, cuối cùng mới xóa ở shard cũ. Đổi dòng kèm `AND version = 1` để hai tiến trình không cùng chuyển một khách.

Cấp phát: mỗi shard là một khối cố định (cụm máy, proxy, cấu hình có phiên bản, khóa mã hóa, bí mật cho từng vai trò, cảnh báo), dựng bằng cùng một mô-đun hạ tầng cho cả gói chung lẫn gói riêng, chỉ khác tham số. Kịch bản dựng chỉ tạo vai trò, chưa tạo bảng. Nhiều người nghĩ kịch bản chạy xanh một lần là xong. Thật ra nó phải được thử trên môi trường mới tinh, và phải kiểm theo đúng đường ứng dụng đi: qua proxy.

Minh họa đường đi của một yêu cầu (không chạy trong trình duyệt):

```text
tenant_id = t-04
  → router → directory
  → proxy-s2.lab
  → s2 writer
```

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

Chuyển `t-05` bằng một lần đổi dòng có kiểm phiên bản. Chạy lại lần nữa sẽ không đổi gì, vì phiên bản đã là 2:

```sql
UPDATE directory
SET shard_id = 's1',
    version = version + 1
WHERE tenant_id = 't-05'
  AND version = 1
RETURNING tenant_id, shard_id,
  version;
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

Provisioning: each shard is a fixed unit (cluster, proxy, versioned settings, encryption key, a secret per role, alarms), built from the same infrastructure module for shared and dedicated tiers, with different inputs only. The bootstrap script creates roles but no tables yet. Many people think a script that passed once is done. In fact it must be tested on a brand-new environment, and checked along the path applications really take: through the proxy.

An illustration of one request's path (not run in the browser):

```text
tenant_id = t-04
  → router → directory
  → proxy-s2.lab
  → s2 writer
```

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

Move `t-05` with one version-checked row change. Running it a second time changes nothing, because the version is already 2:

```sql
UPDATE directory
SET shard_id = 's1',
    version = version + 1
WHERE tenant_id = 't-05'
  AND version = 1
RETURNING tenant_id, shard_id,
  version;
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
