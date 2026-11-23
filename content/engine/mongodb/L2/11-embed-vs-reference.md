---
id: e-mg-l2-11
engine: mongodb
level: L2
module: modeling
title: Nhúng hay tham chiếu
title_en: Embed or reference
kind: concept
runtime: docs
minutes: 10
objectives:
  - vi: Chọn nhúng hay tham chiếu cho một quan hệ dựa trên cách dữ liệu được đọc, ghi và lớn lên.
    en: Choose embedding or referencing for a relationship from how the data is read, written and grows.
  - vi: Biết khi nào chép một ít dữ liệu (extended reference) là đáng, và cái giá của nó.
    en: Know when copying a little data (extended reference) pays off, and what it costs.
requires: [e-mg-l2-08]
demo_setup: '{"collections": {"orders": [{"_id": 3, "customer": "c1", "customerName": "An", "lines": [{"sku": "p5", "qty": 1}, {"sku": "p1", "qty": 4}]}, {"_id": 4, "customer": "c3", "customerName": "Chi", "lines": [{"sku": "p3", "qty": 10}]}], "reviews": [{"_id": "r980", "productId": "p1", "stars": 4}, {"_id": "r981", "productId": "p1", "stars": 5}, {"_id": "r982", "productId": "p3", "stars": 3}]}}'
sources:
  - https://www.mongodb.com/docs/manual/data-modeling/best-practices/
  - https://www.mongodb.com/docs/manual/core/write-operations-atomicity/
  - https://www.mongodb.com/docs/manual/reference/limits/
quiz:
  - q:
      vi: Các dòng hàng của một đơn luôn được đọc và sửa cùng đơn, mỗi đơn có vài dòng. Nên lưu thế nào?
      en: An order's lines are always read and changed together with the order, and each order has a few lines. How should you store them?
    options:
      - vi: Nhúng thành mảng `lines` trong đơn
        en: Embed them as a `lines` array in the order
      - vi: Collection riêng `order_lines`, mỗi dòng trỏ về đơn
        en: A separate `order_lines` collection, each line pointing to its order
      - vi: Lưu thành chuỗi JSON trong một trường
        en: Store them as a JSON string in one field
    answer: 0
    trap: 1
    why:
      vi: 'Nghe hợp lý vì collection riêng giống bảng chi tiết đơn của SQL, nhưng khi đó mỗi lần xem đơn phải `$lookup`. Quan hệ "chứa", số lượng nhỏ, đọc và sửa cùng nhau: nhúng cho một lần đọc và một lần ghi nguyên tử (atomic).'
      en: 'It sounds right because a separate collection mirrors an SQL order-lines table, but then every order view needs a `$lookup`. A "contains" relationship, few items, read and changed together: embedding gives one read and one atomic write.'
  - q:
      vi: Mỗi sản phẩm nhận đánh giá của khách, có sản phẩm hàng chục nghìn đánh giá và con số còn tăng mãi. Nên lưu đánh giá thế nào?
      en: Each product collects customer reviews; some products have tens of thousands and the number keeps growing. How should you store reviews?
    options:
      - vi: Collection `reviews` riêng, mỗi đánh giá có `productId`
        en: A separate `reviews` collection, each review holding a `productId`
      - vi: Nhúng mọi đánh giá vào mảng của sản phẩm
        en: Embed every review in an array on the product
      - vi: Một tài liệu duy nhất chứa mọi đánh giá của cả cửa hàng
        en: One single document holding every review of the whole shop
    answer: 0
    why:
      vi: 'Mảng lớn lên không giới hạn làm tài liệu phình ra (tối đa 16 MiB) và mỗi lần đọc sản phẩm phải kéo theo cả đống dữ liệu. Tham chiếu thì sản phẩm gọn; có thể nhúng thêm vài đánh giá mới nhất nếu trang sản phẩm cần.'
      en: 'An array that grows without bound bloats the document (16 MiB at most) and every product read drags all of it along. Referencing keeps the product small; you can still embed the few latest reviews if the product page needs them.'
  - q:
      vi: Đơn hàng chép sẵn `name` và địa chỉ giao hàng của khách lúc đặt. Khi khách đổi địa chỉ sau đó, điều gì đúng?
      en: Orders copy the customer's `name` and shipping address at order time. When the customer later moves, what is true?
    options:
      - vi: Đơn cũ vẫn giữ địa chỉ lúc đặt, và đó chính là điều mình muốn
        en: Old orders keep the address at order time, which is exactly what you want
      - vi: MongoDB tự cập nhật mọi bản chép
        en: MongoDB updates every copy automatically
      - vi: Đơn cũ bị lỗi vì dữ liệu không khớp
        en: Old orders break because the data no longer matches
    answer: 0
    why:
      vi: Dữ liệu "theo thời điểm" như địa chỉ giao của một đơn nên được chép để giữ lịch sử. MongoDB không tự đồng bộ bản chép; dữ liệu hay đổi mà cần luôn mới thì nên tham chiếu.
      en: Point-in-time data such as an order's shipping address should be copied to keep history. MongoDB does not sync copies for you; data that changes often and must stay current is better referenced.
---
## Mở bài

Bạn chuyển một bảng đơn hàng và một bảng chi tiết đơn từ SQL sang MongoDB. Có nên giữ hai collection như hai bảng, hay để các dòng hàng nằm ngay trong đơn?

## Ý chính

Không có JOIN mặc định trong mỗi lần đọc, nên câu hỏi chính khi thiết kế là: dữ liệu liên quan nằm cùng tài liệu (nhúng) hay ở tài liệu khác (tham chiếu bằng `_id`)?

Nên nhúng khi:

- dữ liệu được đọc cùng nhau;
- quan hệ là "có" hoặc "chứa" (đơn chứa dòng hàng);
- dữ liệu được sửa hoặc lưu trữ cùng nhau. Một lần ghi trên một tài liệu là nguyên tử.

Nên tham chiếu khi:

- phía "nhiều" rất nhiều, hoặc lớn lên không giới hạn;
- tài liệu gộp quá lớn, tốn bộ nhớ và băng thông (tài liệu tối đa 16 MiB);
- hai phần được ghi vào lúc khác nhau, hoặc phần con tồn tại độc lập;
- chép dữ liệu ra nhiều nơi thì quá khó giữ cho khớp.

Ở giữa là chép một ít trường (extended reference), ví dụ tên khách trong đơn: đọc nhanh, không cần `$lookup`, nhưng phải tự cập nhật bản chép nếu cần. Hợp với dữ liệu không đổi hoặc dữ liệu "theo thời điểm".

Nhiều người nghĩ MongoDB không bắt schema nên không cần thiết kế. Thật ra vẫn phải thiết kế, theo câu hỏi mà ứng dụng hỏi nhiều nhất, không theo hình bảng của SQL.

## Cú pháp

```text
// embedded: one read returns the whole order
{ _id: 3, customer: "c1", lines: [{ sku: "p5", qty: 1 }, { sku: "p1", qty: 4 }] }
// referenced: reviews live in their own collection
{ _id: "r981", productId: "p1", stars: 5 }
```

- Nhúng: mảng hoặc tài liệu con nằm trong tài liệu cha.
- Tham chiếu: tài liệu con giữ `_id` của tài liệu cha (ở đây `productId`).

## Ví dụ

Đơn nhúng dòng hàng: một lần đọc ra cả đơn, kèm `customerName` chép sẵn:

```js
db.orders.find({ _id: 3 })
```

Đánh giá tham chiếu sản phẩm: đọc theo `productId` trong collection riêng:

```js
db.reviews.find({ productId: "p1" })
```

## Lỗi hay gặp

Nhúng một mảng lớn lên mãi:

```text
// WRONG: every review ever written, inside the product
{ _id: "p1", name: "Green tea", reviews: [ /* 40000 reviews and growing */ ] }
// FIX: reviews in their own collection, the product keeps a few latest ones
{ _id: "p1", name: "Green tea", latestReviews: [ /* 3 reviews */ ] }
```

Tách mọi quan hệ thành collection như bảng SQL:

```text
// WRONG: lines that are always read with the order, in another collection
db.order_lines.find({ orderId: 3 })   // plus a $lookup on every order view
// FIX: embed them, one read and one atomic write
db.orders.find({ _id: 3 })
```

## Tóm tắt

- Nhúng khi dữ liệu được đọc và sửa cùng nhau, và phía "nhiều" nhỏ.
- Tham chiếu khi phía "nhiều" lớn lên không giới hạn hoặc tồn tại độc lập.
- Một tài liệu tối đa 16 MiB; một lần ghi trên một tài liệu là nguyên tử.
- Chép vài trường (extended reference) đọc nhanh, nhưng bạn tự giữ bản chép cho khớp.

# EN

## Opening

You are moving an orders table and an order-lines table from SQL to MongoDB. Should you keep two collections like the two tables, or put the lines right inside the order?

## Key idea

There is no JOIN by default on every read, so the main design question is: does related data live in the same document (embed) or in another document (reference by `_id`)?

Embed when:

- the data is read together;
- the relationship is "has" or "contains" (an order contains lines);
- the data is changed or archived together. One write on one document is atomic.

Reference when:

- the "many" side is very large or grows without bound;
- the combined document gets too big, costing memory and bandwidth (a document is at most 16 MiB);
- the parts are written at different times, or the child exists on its own;
- copying the data to many places would be too hard to keep consistent.

In between is copying a few fields (extended reference), such as the customer's name in an order: fast reads with no `$lookup`, but you must update the copies yourself if needed. It suits data that never changes or point-in-time data.

Many people think that since MongoDB enforces no schema, there is nothing to design. In fact you still design, for the questions your application asks most, not for the table shapes of SQL.

## Syntax

```text
// embedded: one read returns the whole order
{ _id: 3, customer: "c1", lines: [{ sku: "p5", qty: 1 }, { sku: "p1", qty: 4 }] }
// referenced: reviews live in their own collection
{ _id: "r981", productId: "p1", stars: 5 }
```

- Embed: an array or sub-document inside the parent document.
- Reference: the child document holds the parent's `_id` (here `productId`).

## Example

An order that embeds its lines: one read returns the whole order, with a copied `customerName`:

```js
db.orders.find({ _id: 3 })
```

Reviews that reference a product: read by `productId` in their own collection:

```js
db.reviews.find({ productId: "p1" })
```

## Common mistakes

Embedding an array that keeps growing:

```text
// WRONG: every review ever written, inside the product
{ _id: "p1", name: "Green tea", reviews: [ /* 40000 reviews and growing */ ] }
// FIX: reviews in their own collection, the product keeps a few latest ones
{ _id: "p1", name: "Green tea", latestReviews: [ /* 3 reviews */ ] }
```

Splitting every relationship into a collection like SQL tables:

```text
// WRONG: lines that are always read with the order, in another collection
db.order_lines.find({ orderId: 3 })   // plus a $lookup on every order view
// FIX: embed them, one read and one atomic write
db.orders.find({ _id: 3 })
```

## Recap

- Embed when the data is read and changed together and the "many" side is small.
- Reference when the "many" side grows without bound or lives on its own.
- A document is at most 16 MiB; one write on one document is atomic.
- Copying a few fields (extended reference) reads fast, but you keep the copies in sync yourself.
