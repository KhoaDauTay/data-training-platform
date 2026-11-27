---
id: e-rd-l1-03
engine: redis
level: L1
module: types
title: Hash, giỏ hàng trong một khóa
title_en: Hashes, a shopping cart in one key
kind: lab
runtime: browser
minutes: 15
requires: [e-rd-l1-02]
figures: [{ name: rd-hash-cart, at: idea }]
objectives:
  - vi: Lưu một đối tượng nhỏ (giỏ hàng, sản phẩm) bằng hash với HSET, HGET, HGETALL.
    en: Store a small object (a cart, a product) as a hash with HSET, HGET, HGETALL.
  - vi: Sửa một trường tại chỗ bằng HINCRBY và HDEL, không đọc lại cả đối tượng.
    en: Change one field in place with HINCRBY and HDEL, without reading the whole object back.
  - vi: Hiểu lỗi WRONGTYPE khi dùng lệnh chuỗi trên một hash.
    en: Understand the WRONGTYPE error when a string command meets a hash.
sources:
  - { url: "https://redis.io/docs/latest/develop/data-types/hashes/", title: "Redis docs: Hashes", title_vi: "Tài liệu Redis: hash" }
  - { url: "https://valkey.io/commands/hset/", title: "Valkey docs: HSET", title_vi: "Tài liệu Valkey: HSET" }
  - { url: "https://valkey.io/commands/hincrby/", title: "Valkey docs: HINCRBY", title_vi: "Tài liệu Valkey: HINCRBY" }
lab:
  setup: |
    HSET cart:lily p01 2 p07 1
    HSET product:p01 name "Paper lantern" price 45000 stock 30
  steps:
    - task:
        vi: "Đọc cả giỏ hàng của Lily (`cart:lily`): mọi sản phẩm và số lượng."
        en: "Read Lily's whole cart (`cart:lily`): every product and its quantity."
      solution: HGETALL cart:lily
      check: doc
      hint:
        vi: "Lệnh đọc mọi trường và giá trị của một hash."
        en: "The command that reads every field and value of a hash."
    - task:
        vi: "Lily bấm thêm một cái `p07`: tăng số lượng của trường `p07` thêm 1."
        en: "Lily adds one more `p07`: raise field `p07`'s quantity by 1."
      solution: HINCRBY cart:lily p07 1
      check: doc
      after: HGET cart:lily p07
      hint:
        vi: "`HINCRBY key field 1` cộng ngay trong hash và trả số mới."
        en: "`HINCRBY key field 1` adds inside the hash and returns the new number."
    - task:
        vi: "Lily thêm sản phẩm mới `p03`, số lượng 1."
        en: "Lily adds a new product `p03`, quantity 1."
      solution: HSET cart:lily p03 1
      check: doc
      after: HGETALL cart:lily
      hint:
        vi: "`HSET` trả số trường mới được thêm."
        en: "`HSET` returns how many new fields it added."
    - task:
        vi: "Lily bỏ hẳn `p01` khỏi giỏ."
        en: "Lily removes `p01` from the cart completely."
      solution: HDEL cart:lily p01
      check: doc
      after: HGETALL cart:lily
      hint:
        vi: "Xóa trường, đừng đặt số lượng về 0."
        en: "Delete the field, do not set the quantity to 0."
    - task:
        vi: "Trang sản phẩm chỉ cần giá: đọc trường `price` của `product:p01`."
        en: "The product page only needs the price: read field `price` of `product:p01`."
      solution: HGET product:p01 price
      check: doc
      hint:
        vi: "Một trường của một hash: `HGET key field`."
        en: "One field of a hash: `HGET key field`."
quiz:
  - q:
      vi: "`cart:lily` đã có trường `p07`. `HSET cart:lily p07 5` trả gì?"
      en: "`cart:lily` already has field `p07`. What does `HSET cart:lily p07 5` return?"
    options:
      - { vi: "`(integer) 1`, một trường đã ghi", en: "`(integer) 1`, one field written" }
      - { vi: "`(integer) 5`, giá trị mới", en: "`(integer) 5`, the new value" }
      - { vi: "`(integer) 0`", en: "`(integer) 0`" }
    answer: 2
    trap: 0
    why:
      vi: "Dễ nghĩ `HSET` trả số trường đã ghi, nhưng nó chỉ đếm trường mới được thêm. `p07` đã có nên lần này chỉ là cập nhật: giá trị thành 5 và câu trả lời là 0. `HSET` cũng không trả giá trị mới; muốn số mới sau khi cộng, dùng `HINCRBY`."
      en: "It is easy to think `HSET` returns the fields it wrote, but it only counts fields it added. `p07` already exists, so this is an update: the value becomes 5 and the reply is 0. `HSET` never returns the new value either; to get the number after adding, use `HINCRBY`."
  - q:
      vi: "Giỏ hàng nên lưu là một hash `cart:lily`, hay mỗi sản phẩm một khóa chuỗi như `cart:lily:p01`?"
      en: "Should a cart be one hash `cart:lily`, or one string key per product such as `cart:lily:p01`?"
    options:
      - { vi: "Nhiều khóa chuỗi, vì mỗi khóa nhỏ hơn nên nhanh hơn", en: "Many string keys, because each key is smaller and so faster" }
      - { vi: "Một hash: một lệnh đọc cả giỏ, một EXPIRE cho cả giỏ", en: "One hash: one command reads the cart, one EXPIRE covers it" }
      - { vi: "Như nhau, Redis tự gộp các khóa cùng tiền tố", en: "The same, Redis groups keys with one prefix by itself" }
    answer: 1
    trap: 0
    why:
      vi: "Khóa nhỏ không làm lệnh nhanh hơn đáng kể, nhưng nhiều khóa nghĩa là nhiều lệnh và mỗi khóa cần hạn riêng. Hash gom cả giỏ vào một khóa: `HGETALL` đọc trong một lệnh và một `EXPIRE` cho giỏ hết hạn cùng lúc. Redis không biết gì về tiền tố `cart:lily:`; đó chỉ là cách đặt tên."
      en: "A small key does not make commands noticeably faster, but many keys mean many commands and each key needs its own expiry. A hash keeps the whole cart in one key: `HGETALL` reads it in one command and one `EXPIRE` makes the cart expire at once. Redis knows nothing about the `cart:lily:` prefix; it is only a naming habit."
---
## Mở bài

Giỏ hàng của Lily có vài sản phẩm, mỗi sản phẩm một số lượng. Lưu mỗi thứ một khóa thì rời rạc; Redis có kiểu hash (bảng băm) để gom các cặp trường và giá trị vào một khóa. Bài này lưu giỏ hàng và thông tin sản phẩm của Chợ Lồng Đèn bằng hash.

## Ý chính

**Một khóa, nhiều trường.** Hash là một từ điển nhỏ nằm trong một khóa: `cart:lily` có trường `p01` mang giá trị `2`, trường `p07` mang `1`. Không cần khai báo trường trước; trường mới được tạo khi ghi lần đầu. Giá trị của trường luôn là chuỗi, giống kiểu chuỗi của bài trước.

**Ghi và đọc.** `HSET key field value [field value …]` ghi một hay nhiều trường và trả số trường mới thêm (cập nhật trường đã có không được đếm). `HGET` đọc một trường, `HGETALL` đọc mọi cặp trường và giá trị. Trong redis-cli, `HGETALL` in một danh sách xen kẽ: trường, giá trị, trường, giá trị. Thứ tự các trường không được Redis hứa trước, nên đừng dựa vào nó.

**Sửa tại chỗ.** `HINCRBY key field n` cộng `n` vào một trường số và trả số mới, trong một lệnh, nên hai lần bấm "thêm" cùng lúc không làm mất lần nào. `HDEL` xóa trường; khi trường cuối cùng bị xóa, Redis xóa luôn cả khóa, không để lại hash rỗng.

**Sai kiểu.** Mỗi khóa chỉ giữ một kiểu. Gọi `GET` (lệnh chuỗi) trên một hash bị từ chối với lỗi WRONGTYPE; dùng `TYPE key` để biết khóa đang giữ kiểu gì.

Hình cuối mục cho thấy giỏ của Lily là một khóa với ba trường.

## Cú pháp

```redis
HSET key f1 v1 f2 v2
HGET key field
HGETALL key
HINCRBY key field 1
HDEL key field
HLEN key
HEXISTS key field
```

- `HSET` trả số trường mới, không phải số trường đã ghi.
- `HINCRBY` với số âm để trừ: `HINCRBY key stock -2`.

## Ví dụ

Đọc cả sản phẩm, rồi một trường:

```redis
HGETALL product:p01
HGET product:p01 name
```

Bán 2 chiếc đèn: trừ kho tại chỗ.

```redis
HINCRBY product:p01 stock -2
HGET product:p01 stock
```

Đếm trường và hỏi một trường có không:

```redis
HLEN cart:lily
HEXISTS cart:lily p03
```

## Lỗi hay gặp

Dùng lệnh chuỗi trên một hash:

```redis
# ERROR WRONGTYPE
GET cart:lily
```

Cộng vào một trường không phải số:

```redis
# ERROR ERR
HINCRBY product:p01 name 1
```

Đặt số lượng về 0 thay vì xóa: giỏ vẫn còn dòng `p01` với 0 cái.

```redis
# WRONG
HSET cart:lily p01 0
HGETALL cart:lily
```

```redis
# FIX
HDEL cart:lily p01
HGETALL cart:lily
```

## Thực hành

Năm bước: đọc cả giỏ, thêm một cái `p07`, thêm sản phẩm `p03`, bỏ `p01`, và đọc giá của một sản phẩm.

## Tóm tắt

- Hash gom các cặp trường và giá trị vào một khóa; trường tạo khi ghi lần đầu.
- `HSET` trả số trường mới; `HGET` đọc một trường, `HGETALL` đọc tất cả.
- `HINCRBY` sửa số tại chỗ trong một lệnh; `HDEL` xóa trường, trường cuối đi thì khóa đi.
- Lệnh sai kiểu bị từ chối bằng WRONGTYPE; `TYPE` cho biết kiểu của khóa.

# EN

## Opening

Lily's cart holds a few products, each with a quantity. One key per item would be scattered; Redis has the hash type to gather field and value pairs into one key. This lesson stores Lantern Market's cart and product details as hashes.

## Key idea

**One key, many fields.** A hash is a small dictionary inside one key: `cart:lily` has field `p01` holding `2` and field `p07` holding `1`. Fields need no declaration; a new field is created the first time it is written. A field's value is always a string, like the string type in the previous lesson.

**Writing and reading.** `HSET key field value [field value …]` writes one or more fields and returns how many new fields it added (updating an existing field is not counted). `HGET` reads one field, `HGETALL` reads every field and value pair. In redis-cli, `HGETALL` prints one interleaved list: field, value, field, value. Redis does not promise the order of the fields, so do not rely on it.

**Changing in place.** `HINCRBY key field n` adds `n` to a numeric field and returns the new number, in one command, so two "add" clicks at once never lose one. `HDEL` deletes a field; when the last field goes, Redis deletes the whole key too and leaves no empty hash behind.

**Wrong type.** Each key holds one type. Calling `GET` (a string command) on a hash is refused with a WRONGTYPE error; use `TYPE key` to see which type a key holds.

The figure at the end of this section shows Lily's cart as one key with three fields.

## Syntax

```redis
HSET key f1 v1 f2 v2
HGET key field
HGETALL key
HINCRBY key field 1
HDEL key field
HLEN key
HEXISTS key field
```

- `HSET` returns the number of new fields, not the number of fields written.
- `HINCRBY` with a negative number subtracts: `HINCRBY key stock -2`.

## Example

Read the whole product, then one field:

```redis
HGETALL product:p01
HGET product:p01 name
```

Two lanterns sold: take them off the stock in place.

```redis
HINCRBY product:p01 stock -2
HGET product:p01 stock
```

Count the fields and ask whether a field exists:

```redis
HLEN cart:lily
HEXISTS cart:lily p03
```

## Common mistakes

Using a string command on a hash:

```redis
# ERROR WRONGTYPE
GET cart:lily
```

Adding to a field that is not a number:

```redis
# ERROR ERR
HINCRBY product:p01 name 1
```

Setting the quantity to 0 instead of deleting: the cart still has a `p01` line with 0 items.

```redis
# WRONG
HSET cart:lily p01 0
HGETALL cart:lily
```

```redis
# FIX
HDEL cart:lily p01
HGETALL cart:lily
```

## Practice

Five steps: read the whole cart, add one more `p07`, add product `p03`, remove `p01`, and read one product's price.

## Recap

- A hash gathers field and value pairs into one key; a field is created when first written.
- `HSET` returns the number of new fields; `HGET` reads one field, `HGETALL` reads them all.
- `HINCRBY` changes a number in place in one command; `HDEL` deletes a field, and the key goes with its last field.
- A command of the wrong type is refused with WRONGTYPE; `TYPE` tells you a key's type.
