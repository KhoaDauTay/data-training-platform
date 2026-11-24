---
id: e-ds-l4-10
engine: design
level: L4
module: multi-tenant
title: Chọn mô hình theo tình huống
title_en: Choosing a tenancy model by scenario
kind: quiz
runtime: browser
minutes: 12
objectives:
  - vi: Chọn silo, bridge, pool hay một kiểu trộn cho số khách, độ chênh kích thước, hợp đồng và hạng dịch vụ đã cho.
    en: Pick silo, bridge, pool or a mix for a given tenant count, size spread, contract and service tier.
  - vi: Đọc một bảng khách hàng để tìm ai nên rời pool.
    en: Read a tenant table to find who should leave the pool.
requires: [e-ds-l4-09]
sources:
  - url: https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/silo-pool-and-bridge-models.html
    title: "Silo, Pool, and Bridge Models"
  - url: https://docs.aws.amazon.com/pdfs/whitepapers/latest/saas-tenant-isolation-strategies/saas-tenant-isolation-strategies.pdf
    title: "SaaS Tenant Isolation Strategies (PDF)"
lab:
  setup: |
    CREATE TABLE seller_plans (
      tenant_id int PRIMARY KEY,
      name text NOT NULL,
      tier text NOT NULL CHECK (tier IN ('basic', 'pro', 'enterprise')),
      monthly_orders int NOT NULL,
      own_db_contract boolean NOT NULL
    );
    INSERT INTO seller_plans VALUES
      (1, 'Lan Silk', 'basic', 120, false),
      (2, 'Minh Tea', 'pro', 900, false),
      (3, 'Hoa Lamp', 'basic', 60, false),
      (4, 'Song Ceramics', 'enterprise', 42000, true),
      (5, 'Mai Paper', 'pro', 1500, false),
      (6, 'Kim Lantern', 'enterprise', 18000, false),
      (7, 'Tam Spice', 'basic', 40, false);
  steps:
    - task:
        vi: "Ai nên rời pool sang silo: người bán hạng `enterprise` hoặc có hợp đồng đòi database riêng (`own_db_contract`). Trả `tenant_id`, `name`, `tier`, xếp theo `tenant_id`."
        en: "Who should leave the pool for a silo: sellers on tier `enterprise` or with a contract that requires their own database (`own_db_contract`). Return `tenant_id`, `name`, `tier`, ordered by `tenant_id`."
      solution: SELECT tenant_id, name, tier FROM seller_plans WHERE tier = 'enterprise' OR own_db_contract ORDER BY tenant_id
      check: rows
      ordered: true
      hint:
        vi: "Hai điều kiện nối bằng `OR`; cột boolean đứng một mình là điều kiện."
        en: "Two conditions joined with `OR`; a boolean column on its own is a condition."
    - task:
        vi: "Hai người bán lớn chiếm bao nhiêu phần đơn của cả chợ? Trả một dòng: `top2_share` = phần trăm đơn hàng tháng của hai người bán nhiều đơn nhất trên tổng, làm tròn 1 chữ số."
        en: "What share of the market's orders do the two largest sellers hold? Return one row: `top2_share` = the percentage of monthly orders of the two sellers with the most orders over the total, rounded to 1 decimal."
      solution: SELECT round(100.0 * (SELECT sum(monthly_orders) FROM (SELECT monthly_orders FROM seller_plans ORDER BY monthly_orders DESC LIMIT 2) t) / sum(monthly_orders), 1) AS top2_share FROM seller_plans
      check: rows
      hint:
        vi: "Tổng của hai dòng lớn nhất là một truy vấn con với `ORDER BY monthly_orders DESC LIMIT 2`; chia cho `sum(monthly_orders)` của cả bảng."
        en: "The sum of the two largest rows is a subquery with `ORDER BY monthly_orders DESC LIMIT 2`; divide by `sum(monthly_orders)` of the whole table."
quiz:
  - q:
      vi: "Một nền tảng có 5.000 người bán nhỏ, giống nhau, không ai có hợp đồng đặc biệt. Mô hình nào hợp nhất?"
      en: "A platform has 5,000 small, similar sellers, none with a special contract. Which model fits best?"
    options:
      - { vi: "Silo cho tất cả: cô lập mạnh nhất nên an toàn nhất", en: "Silo for all of them: the strongest isolation, so the safest" }
      - { vi: "Pool, với tenant_id trong khóa và chính sách theo dòng", en: "Pool, with tenant_id in the keys and row policies" }
      - { vi: "Bridge: mỗi người bán một schema, 5.000 schema", en: "Bridge: one schema per seller, 5,000 schemas" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì cô lập mạnh nghe như không có rủi ro, nhưng 5.000 database là 5.000 lần sao lưu, nâng cấp và nhóm kết nối cho những khách không cần điều đó. Khách nhỏ và giống nhau là chỗ của pool."
      en: "It sounds right because strong isolation sounds risk-free, but 5,000 databases are 5,000 backups, upgrades and connection pools for tenants who do not need them. Small, similar tenants belong in a pool."
  - q:
      vi: "Trong lab, hai người bán lớn nhất chiếm hơn 95% đơn, một người có hợp đồng database riêng. Thiết kế nào hợp?"
      en: "In the lab, the two largest sellers hold over 95% of the orders, and one has a contract for its own database. Which design fits?"
    options:
      - { vi: "Trộn: hợp đồng ra silo, người lớn kia ra máy riêng, còn lại ở pool", en: "A mix: the contract to a silo, the other big one to its own server, the rest in the pool" }
      - { vi: "Đưa cả bảy người bán sang silo để mọi người được như nhau", en: "Move all seven sellers to silos so everyone is treated the same" }
      - { vi: "Giữ tất cả trong pool; hợp đồng chỉ là giấy tờ, không đổi thiết kế", en: "Keep everyone in the pool; the contract is only paperwork, not design" }
    answer: 0
    trap: 1
    why:
      vi: "Nhiều người nghĩ đối xử như nhau là công bằng. Thật ra mô hình đi theo hạng dịch vụ và hợp đồng: khách nhỏ trả giá pool, khách lớn trả cho sự tách biệt. Giữ cùng cấu trúc bảng có tenant_id ở mọi nơi thì chuyển một khách giữa các chỗ chỉ là chép dữ liệu."
      en: "Many people think treating everyone the same is fair. In fact the model follows the service tier and the contract: small tenants pay a pool price, large ones pay for separation. Keeping one table design with tenant_id everywhere makes moving a tenant between homes just a data copy."
  - q:
      vi: "Hôm nay mọi người bán ở pool. Năm sau một người sẽ cần ra máy riêng. Quyết định nào hôm nay làm việc đó dễ nhất?"
      en: "Today every seller is in the pool. Next year one of them will need its own server. Which decision today makes that easiest?"
    options:
      - { vi: "Đánh số khóa chính toàn cục cho cả chợ, để dữ liệu không bao giờ trùng", en: "Number primary keys globally across the market, so data never collides" }
      - { vi: "Đặt tenant_id đầu mọi khóa và mọi khóa ngoại, để dữ liệu một khách tự đi cùng nhau", en: "Put tenant_id first in every key and every foreign key, so one tenant's data travels together" }
      - { vi: "Chuyển ngay sang bridge, để mỗi khách đã có schema riêng", en: "Switch to the bridge now, so each tenant already has its own schema" }
    answer: 1
    trap: 2
    why:
      vi: "Nghe hợp lý vì schema riêng trông như đã tách sẵn, nhưng nó vẫn nằm chung database và nhân việc đổi cấu trúc lên N lần ngay từ hôm nay. Khóa bắt đầu bằng tenant_id cho phép chọn đúng dữ liệu một khách, chép đi theo thứ tự cha trước con sau, rồi đổi một dòng trong bảng định tuyến."
      en: "It sounds right because an own schema looks already separated, but it still lives in the shared database and multiplies schema changes by N from today. Keys that start with tenant_id let you pick exactly one tenant's data, copy it parents first, then change one row in the routing table."
  - q:
      vi: "Luật nào không có chỗ tự nhiên khi dữ liệu chia theo khách hàng?"
      en: "Which rule has no natural home once data is split by tenant?"
    options:
      - { vi: "Email của khách là duy nhất trong một người bán", en: "A shopper's email unique within one seller" }
      - { vi: "Số sê-ri chỉ một người bán được đăng ký trên toàn chợ", en: "A serial number only one seller may register market-wide" }
      - { vi: "Mã hóa đơn là duy nhất trong phạm vi một người bán", en: "An invoice number unique within the scope of one seller" }
    answer: 1
    trap: 0
    why:
      vi: "Nhiều người nghĩ cứ thêm `UNIQUE` là xong. Thật ra khi các khách nằm ở những database khác nhau, không ràng buộc nào thấy được cả chợ; luật toàn cục cần một bảng tra riêng, độc lập với các khách, được ghi có điều kiện."
      en: "Many people think adding `UNIQUE` settles it. In fact once tenants live in different databases, no constraint can see the whole market; a global rule needs its own lookup table, independent of the tenants, written with a condition."
---
## Mở bài

Bốn tình huống, bốn câu trả lời khác nhau, và một bảng khách hàng thật để đọc trước khi chọn. Không có mô hình nào đúng cho mọi nơi; câu hỏi là khách nào cần gì và trả bao nhiêu cho nó.

## Ý chính

Bốn thứ quyết định mô hình. **Số khách**: hàng nghìn khách nhỏ đẩy về pool, vài chục khách cần tùy biến có thể dùng schema riêng. **Độ chênh kích thước**: một khách chiếm phần lớn tải làm chậm hàng xóm trong pool. **Hợp đồng và luật**: dữ liệu phải ở database riêng hay ở một vùng địa lý thì cần silo cho khách đó. **Hạng dịch vụ**: hạng cao mua sự tách biệt.

Câu trả lời thường là trộn: pool cho số đông, silo cho số ít, cùng một cấu trúc bảng có `tenant_id` ở mọi nơi. Khi đó hạng dịch vụ chỉ là chỗ đặt khách, không phải một bản phần mềm khác, và chuyển khách là chép dữ liệu rồi đổi một dòng trong bảng định tuyến.

## Ví dụ

Bảng chọn nhanh:

```text
Scenario                    Model
5,000 small, similar        pool
dozens, custom tables       bridge
contract: own DB/region     silo for it
few whales + many small     pool + silos
rule across all tenants     lookup table
```

## Tóm tắt

- Số khách, độ chênh kích thước, hợp đồng và hạng dịch vụ quyết định mô hình.
- Khách nhỏ và giống nhau: pool; hợp đồng database riêng: silo cho khách đó; thường là trộn.
- Cùng một cấu trúc bảng có `tenant_id` ở mọi nơi làm việc chuyển khách thành chép dữ liệu.
- Đọc tiếp: `e-ds-l4-08` (ba mô hình), `e-ds-l4-09` (bản đồ chủ đề), `e-ds-l4-11` (tổng hợp).

# EN

## Opening

Four scenarios, four different answers, and a real tenant table to read before choosing. No model is right everywhere; the question is which tenant needs what, and what it pays for it.

## Key idea

Four things decide the model. **Tenant count**: thousands of small tenants push towards a pool, a few dozen tenants needing customisation can use their own schemas. **Size spread**: one tenant carrying most of the load slows its neighbours in a pool. **Contracts and law**: data that must sit in its own database or in one region needs a silo for that tenant. **Service tier**: a higher tier buys separation.

The answer is usually a mix: a pool for the many, silos for the few, with one table design carrying `tenant_id` everywhere. A service tier is then just where a tenant is placed, not a different build of the software, and moving a tenant is copying its data and changing one row in the routing table.

## Example

A quick chooser:

```text
Scenario                    Model
5,000 small, similar        pool
dozens, custom tables       bridge
contract: own DB/region     silo for it
few whales + many small     pool + silos
rule across all tenants     lookup table
```

## Recap

- Tenant count, size spread, contracts and service tier decide the model.
- Small, similar tenants: a pool; a contract for an own database: a silo for that tenant; usually a mix.
- One table design with `tenant_id` everywhere turns moving a tenant into a data copy.
- Read next: `e-ds-l4-08` (the three models), `e-ds-l4-09` (the topic map), `e-ds-l4-11` (the capstone).
