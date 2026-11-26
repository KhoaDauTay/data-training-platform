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
figures: [{ name: mg-embed-vs-reference, at: idea }]
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
      vi: 'Collection riêng giống bảng chi tiết đơn của SQL, nhưng ở đây mỗi lần xem đơn phải thêm `$lookup`, và sửa đơn cùng dòng hàng thành hai lần ghi trên hai tài liệu. Chuỗi JSON thì MongoDB chỉ thấy một chuỗi: không lọc, không sửa từng dòng hàng bằng `$` được. Quan hệ "chứa", vài dòng hàng, đọc và sửa cùng nhau: nhúng mảng `lines` cho một lần đọc và một lần ghi nguyên tử (atomic).'
      en: 'A separate collection mirrors an SQL order-lines table, but here every order view needs an extra `$lookup`, and changing an order with its lines becomes two writes on two documents. A JSON string is just a string to MongoDB: you cannot filter on it or change one line with `$`. A "contains" relationship, a few lines, read and changed together: embedding a `lines` array gives one read and one atomic write.'
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
      vi: 'Nhúng hàng chục nghìn đánh giá làm tài liệu sản phẩm phình mãi tới giới hạn 16 MiB, và mỗi lần mở trang sản phẩm kéo theo mọi đánh giá. Một tài liệu cho cả cửa hàng còn tệ hơn: chạm giới hạn sớm hơn, và mọi lần thêm đánh giá đều ghi vào cùng một tài liệu. Tham chiếu bằng `productId` giữ sản phẩm gọn, thêm đánh giá chỉ là một lần ghi vào `reviews`; có thể nhúng thêm vài đánh giá mới nhất nếu trang sản phẩm cần.'
      en: 'Embedding tens of thousands of reviews makes the product document grow toward the 16 MiB limit, and every product page load drags along every review. One document for the whole shop is worse: it hits the limit sooner, and every new review writes to the same document. Referencing by `productId` keeps the product small, and adding a review is one write to `reviews`; you can still embed the few latest reviews if the product page needs them.'
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
      vi: Địa chỉ giao của một đơn là dữ liệu "theo thời điểm" (hàng đã giao tới đó), nên đơn cũ giữ bản chép đó là đúng. MongoDB không tự cập nhật bản chép; muốn đổi thì ứng dụng phải tự ghi vào từng đơn. Đơn cũ cũng không lỗi, vì MongoDB không kiểm tra bản chép có khớp với khách hay không. Dữ liệu hay đổi mà luôn cần giá trị mới thì nên tham chiếu.
      en: An order's shipping address is point-in-time data (the goods went there), so old orders keeping that copy is right. MongoDB does not update copies for you; to change them the application must write to each order itself. Old orders do not break either, since MongoDB never checks that a copy matches the customer. Data that changes often and must always be current is better referenced.
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

Một cách tự hỏi nhanh: màn hình nào đọc dữ liệu này, đọc bao nhiêu lần so với ghi, và phía "nhiều" lớn tới đâu sau một năm? Đơn hàng có vài dòng hàng và luôn được đọc cùng nhau: nhúng. Sản phẩm có thể nhận hàng chục nghìn đánh giá, còn trang sản phẩm chỉ hiện vài cái mới nhất: tham chiếu, kèm một mảng nhỏ các đánh giá mới nhất trong sản phẩm.

Nhiều người nghĩ MongoDB không bắt schema nên không cần thiết kế. Thật ra vẫn phải thiết kế, theo câu hỏi mà ứng dụng hỏi nhiều nhất, không theo hình bảng của SQL.

Hình cuối mục này vẽ hai trường hợp đó: đơn hàng nhúng các dòng hàng, sản phẩm tham chiếu tới collection `reviews` và chỉ giữ vài đánh giá mới nhất.

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

Đơn 3 trở về trong một lần đọc, đủ hai dòng hàng và `customerName: "An"`, không cần chạm collection khác. `customerName` là bản chép: nếu khách đổi tên, đơn cũ vẫn giữ tên lúc đặt, và với một hóa đơn đó thường là điều bạn muốn.

Đánh giá tham chiếu sản phẩm: đọc theo `productId` trong collection riêng:

```js
db.reviews.find({ productId: "p1" })
```

Hai đánh giá `r980` và `r981` của `p1` trở về; `r982` thuộc `p3` không có mặt. Thêm một đánh giá chỉ là một lần ghi vào `reviews`, tài liệu sản phẩm không phình ra.

## Lỗi hay gặp

Nhúng một mảng lớn lên mãi:

```text
// WRONG: every review ever written, inside the product
{ _id: "p1", name: "Green tea", reviews: [ /* 40000 reviews and growing */ ] }
// FIX: reviews in their own collection, the product keeps a few latest ones
{ _id: "p1", name: "Green tea", latestReviews: [ /* 3 reviews */ ] }
```

Mảng lớn lên mãi làm mỗi lần đọc sản phẩm kéo theo mọi đánh giá, và cuối cùng chạm giới hạn 16 MiB của một tài liệu. Giữ vài phần tử mới nhất trong tài liệu, phần còn lại ở collection riêng.

Tách mọi quan hệ thành collection như bảng SQL:

```text
// WRONG: lines that are always read with the order, in another collection
db.order_lines.find({ orderId: 3 })   // plus a $lookup on every order view
// FIX: embed them, one read and one atomic write
db.orders.find({ _id: 3 })
```

Tách như bảng SQL thì mỗi lần mở đơn cần thêm `$lookup`, và sửa đơn cùng dòng hàng không còn là một lần ghi nguyên tử trên một tài liệu.

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

A quick way to ask: which screen reads this data, how often is it read compared with written, and how large will the "many" side be after a year? An order has a few lines and they are always read together: embed. A product can collect tens of thousands of reviews while its page shows only the latest few: reference, plus a small array of the latest reviews inside the product.

Many people think that since MongoDB enforces no schema, there is nothing to design. In fact you still design, for the questions your application asks most, not for the table shapes of SQL.

The figure at the end of this section draws those two cases: an order that embeds its lines, and a product that references the collection `reviews` and keeps only a few of the newest reviews.

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

Order 3 comes back in one read, with both lines and `customerName: "An"`, without touching another collection. `customerName` is a copy: if the customer changes their name, the old order keeps the name at order time, and for an invoice that is usually what you want.

Reviews that reference a product: read by `productId` in their own collection:

```js
db.reviews.find({ productId: "p1" })
```

The two reviews `r980` and `r981` of `p1` come back; `r982` belongs to `p3` and is not there. Adding a review is one write to `reviews`; the product document does not grow.

## Common mistakes

Embedding an array that keeps growing:

```text
// WRONG: every review ever written, inside the product
{ _id: "p1", name: "Green tea", reviews: [ /* 40000 reviews and growing */ ] }
// FIX: reviews in their own collection, the product keeps a few latest ones
{ _id: "p1", name: "Green tea", latestReviews: [ /* 3 reviews */ ] }
```

An array that keeps growing makes every product read drag along every review, and in the end it hits the 16 MiB limit of a document. Keep a few latest items in the document and the rest in their own collection.

Splitting every relationship into a collection like SQL tables:

```text
// WRONG: lines that are always read with the order, in another collection
db.order_lines.find({ orderId: 3 })   // plus a $lookup on every order view
// FIX: embed them, one read and one atomic write
db.orders.find({ _id: 3 })
```

Split like SQL tables, every order view needs an extra `$lookup`, and changing an order with its lines is no longer one atomic write on one document.

## Recap

- Embed when the data is read and changed together and the "many" side is small.
- Reference when the "many" side grows without bound or lives on its own.
- A document is at most 16 MiB; one write on one document is atomic.
- Copying a few fields (extended reference) reads fast, but you keep the copies in sync yourself.
