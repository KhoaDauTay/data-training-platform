---
id: e-mg-l2-11
engine: mongodb
level: L2
module: modeling
title: Nhúng hay tham chiếu
title_en: Embed or reference
kind: concept
minutes: 10
objectives:
  - vi: Chọn nhúng hay tham chiếu cho một quan hệ dựa trên cách dữ liệu được đọc, ghi và lớn lên.
    en: Choose embedding or referencing for a relationship from how the data is read, written and grows.
  - vi: Biết khi nào chép một ít dữ liệu (extended reference) là đáng, và cái giá của nó.
    en: Know when copying a little data (extended reference) pays off, and what it costs.
requires: [e-mg-l2-08]
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
    why:
      vi: 'Quan hệ "chứa", số lượng nhỏ, đọc và sửa cùng nhau: nhúng cho một lần đọc và một lần ghi atomic.'
      en: 'A "contains" relationship, few items, read and changed together: embedding gives one read and one atomic write.'
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
## Ý chính

Không có JOIN mặc định trong mỗi lần đọc, nên câu hỏi chính khi thiết kế là: dữ liệu liên quan nằm cùng tài liệu (nhúng) hay ở tài liệu khác (tham chiếu bằng `_id`)?

Nên nhúng khi:

- dữ liệu được đọc cùng nhau;
- quan hệ là "có" hoặc "chứa" (đơn chứa dòng hàng);
- dữ liệu được sửa hoặc lưu trữ cùng nhau. Một lần ghi trên một tài liệu là atomic.

Nên tham chiếu khi:

- phía "nhiều" rất nhiều, hoặc lớn lên không giới hạn;
- tài liệu gộp quá lớn, tốn bộ nhớ và băng thông (tài liệu tối đa 16 MiB);
- hai phần được ghi vào lúc khác nhau, hoặc phần con tồn tại độc lập;
- chép dữ liệu ra nhiều nơi thì quá khó giữ cho khớp.

Ở giữa là chép một ít trường (extended reference), ví dụ tên khách trong đơn: đọc nhanh, không cần `$lookup`, nhưng phải tự cập nhật bản chép nếu cần. Hợp với dữ liệu không đổi hoặc dữ liệu "theo thời điểm".

Thiết kế theo câu hỏi mà ứng dụng hỏi nhiều nhất, không theo hình bảng của SQL.

Làm được: chọn nhúng hay tham chiếu cho một quan hệ và giải thích bằng cách dữ liệu được dùng.

## Ví dụ

```js
// embedded: one read returns the whole order
{ _id: 3, customer: "c1", lines: [{ sku: "p5", qty: 1 }, { sku: "p1", qty: 4 }] }
// referenced: reviews live in their own collection
{ _id: "r981", productId: "p1", stars: 5 }
```

## Thực hành

Ba câu hỏi, mỗi câu một tình huống thiết kế.

# EN

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

Design for the questions your application asks most, not for the table shapes of SQL.

You can now: choose embedding or referencing for a relationship and explain it by how the data is used.

## Example

```js
// embedded: one read returns the whole order
{ _id: 3, customer: "c1", lines: [{ sku: "p5", qty: 1 }, { sku: "p1", qty: 4 }] }
// referenced: reviews live in their own collection
{ _id: "r981", productId: "p1", stars: 5 }
```

## Practice

Three questions, each one a design situation.
