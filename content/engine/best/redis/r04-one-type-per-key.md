---
id: e-bp-r04
engine: best
track: redis
level: L1
module: r
title: "Một khóa giữ một kiểu, đặt tên khóa theo kiểu"
title_en: "One key holds one type, named for it"
kind: quiz
minutes: 3
objectives:
  - vi: "Đặt tên khóa có tiền tố cho biết đối tượng và kiểu (`cart:7` là hash), và dùng đúng họ lệnh của kiểu đó."
    en: "Name keys with a prefix that tells the object and its type (`cart:7` is a hash), and use that type's commands."
avoid:
  vi: "Gửi lệnh danh sách vào một khóa đang là hash: Redis trả `WRONGTYPE` và lệnh không chạy."
  en: "Sending a list command to a key that holds a hash: Redis answers `WRONGTYPE` and the command does nothing."
requires: [e-rd-l1-07]
skills: []
adv: []
sources:
  - https://valkey.io/topics/data-types/
  - https://valkey.io/commands/type/
verified: { version: "BoonData Redis interpreter (Valkey 8.1 wording)", date: "2026-11-27" }
pair:
  runtime: redis
  check: error
  setup: |
    HSET cart:7 sku9 2
  bad: |
    LPUSH cart:7 sku3
  good: |
    HSET cart:7 sku3 1
  expect: { code: WRONGTYPE }
quiz:
  - q:
      vi: "Khóa `cart:7` là một hash. Một dịch vụ khác chạy `LPUSH cart:7 sku3`. Chuyện gì xảy ra?"
      en: "Key `cart:7` is a hash. Another service runs `LPUSH cart:7 sku3`. What happens?"
    options:
      - { vi: "Redis đổi `cart:7` thành danh sách và thêm `sku3`", en: "Redis turns `cart:7` into a list and adds `sku3`" }
      - { vi: "Redis trả lỗi `WRONGTYPE`, hash giữ nguyên", en: "Redis answers `WRONGTYPE`, the hash stays as it was" }
      - { vi: "Redis thêm `sku3` vào hash với số lượng 0", en: "Redis adds `sku3` to the hash with quantity 0" }
    answer: 1
    why:
      vi: "Redis không bao giờ tự đổi kiểu của một khóa đang có: một khóa đã là hash thì chỉ nhận lệnh hash (`HSET`, `HGET`…). Lệnh danh sách như `LPUSH` bị từ chối với `WRONGTYPE` và không ghi gì, nên hash vẫn nguyên. Đặt tên khóa theo kiểu (`cart:` luôn là hash) để mọi dịch vụ biết dùng họ lệnh nào; khi nghi ngờ, `TYPE cart:7` trả `hash`."
      en: "Redis never changes the type of an existing key: once a key is a hash it only accepts hash commands (`HSET`, `HGET`…). A list command such as `LPUSH` is refused with `WRONGTYPE` and writes nothing, so the hash is untouched. Name keys by type (`cart:` is always a hash) so every service knows which commands to use; when in doubt, `TYPE cart:7` answers `hash`."
---

## Ý chính

Mỗi khóa chỉ giữ một kiểu dữ liệu. Đặt tên khóa theo một quy ước cho biết đối tượng và kiểu, ví dụ `cart:<id>` luôn là hash, và chỉ dùng lệnh của kiểu đó.

## Vì sao

- Kiểu của khóa do lệnh đầu tiên tạo ra nó quyết định. Sau đó lệnh của kiểu khác bị từ chối với `WRONGTYPE`.
- Lỗi này thường đến từ hai dịch vụ hiểu cùng một tên khóa theo hai cách: một bên lưu giỏ hàng bằng hash, một bên bằng danh sách.
- Quy ước tên rõ ràng (đối tượng, id, kiểu) giúp mọi dịch vụ dùng đúng họ lệnh; `TYPE` kiểm tra khi cần.
- Bản Không nên gửi `LPUSH` vào hash và bị từ chối. Bản Nên dùng `HSET` và thêm được một món vào giỏ.

# EN

## Key idea

Each key holds one data type. Name keys with a convention that tells the object and the type, for example `cart:<id>` is always a hash, and use only that type's commands.

## Why

- A key's type is set by the first command that creates it. After that, another type's commands are refused with `WRONGTYPE`.
- The error usually comes from two services that read the same key name in two ways: one stores the cart as a hash, the other as a list.
- A clear naming convention (object, id, type) helps every service use the right commands; `TYPE` checks when needed.
- The Avoid version sends `LPUSH` to a hash and is refused. The Prefer version uses `HSET` and adds one item to the cart.
