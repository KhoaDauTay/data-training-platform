---
id: e-dy-l2-11
engine: dynamodb
level: L2
module: partiql-cost
title: "Eventually hay strongly consistent"
title_en: "Eventually or strongly consistent"
kind: concept
runtime: docs
minutes: 7
objectives:
  - vi: Giải thích đọc eventually consistent có thể thấy dữ liệu cũ, và khi nào cần strongly consistent.
    en: Explain that an eventually consistent read can see stale data, and when you need a strongly consistent one.
  - vi: Nhớ chỗ không có strong read - GSI và Streams.
    en: Remember where strong reads do not exist - GSIs and Streams.
requires: [e-dy-l2-09]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/read-write-operations.html
quiz:
  - q:
      vi: Người dùng vừa đổi địa chỉ, rồi mở ngay trang hồ sơ. Ứng dụng đọc bằng GetItem mặc định. Có thể thấy gì?
      en: A user just changed their address and opens the profile page right away. The app reads with a default GetItem. What might they see?
    options:
      - vi: Luôn thấy địa chỉ mới.
        en: Always the new address.
      - vi: Có thể thấy địa chỉ cũ trong chốc lát, vì mặc định là eventually consistent.
        en: Possibly the old address for a moment, because the default is eventually consistent.
      - vi: Lỗi, vì item đang được ghi.
        en: An error, because the item is being written.
    answer: 1
    why:
      vi: Mặc định là eventually consistent, có thể chưa phản ánh lần ghi vừa xong. Đặt `ConsistentRead` là `true` để đọc bản mới nhất, giá gấp đôi.
      en: The default is eventually consistent and may not reflect a write that just finished. Set `ConsistentRead` to `true` to read the latest version, at twice the price.
  - q:
      vi: Query trên một GSI với `ConsistentRead` là `true`. Kết quả?
      en: A Query on a GSI with `ConsistentRead` set to `true`. What happens?
    options:
      - vi: Đọc strong như trên bảng.
        en: A strong read, as on the table.
      - vi: '`ValidationException` - GSI chỉ hỗ trợ eventually consistent.'
        en: '`ValidationException` - a GSI supports only eventually consistent reads.'
      - vi: DynamoDB tự chuyển sang bảng gốc.
        en: DynamoDB switches to the base table by itself.
    answer: 1
    why:
      vi: GSI được cập nhật bất đồng bộ, nên chỉ có đọc eventually consistent. LSI thì đọc strong được.
      en: A GSI is updated asynchronously, so it offers only eventually consistent reads. An LSI does support strong reads.
---

## Ý chính

Mỗi bảng được nhân bản sang nhiều Availability Zone. Một lần ghi được xác nhận khi đã bền vững, nhưng các bản sao có thể chưa cùng nhận xong.

- **Eventually consistent** (mặc định): có thể đọc từ một bản sao chưa nhận lần ghi mới nhất. Giá một nửa.
- **Strongly consistent** (`"ConsistentRead": true`): trả bản mới nhất của mọi lần ghi đã thành công. Giá gấp đôi, và có thể lỗi 500 hoặc chậm hơn khi mạng gặp trục trặc.

Không có strong read trên **GSI** và **Streams**. Có trên bảng và **LSI**.

## Ví dụ

```text
t0  PutItem address = "Hue"            -> success
t1  GetItem                            -> may return the old address
t1  GetItem ConsistentRead = true      -> returns "Hue"
```

## Thực hành

Bộ mô phỏng trong trình duyệt chạy một nút, nên không bao giờ cho thấy đọc cũ; nhưng nó vẫn từ chối `ConsistentRead` trên GSI như DynamoDB thật. Chọn strong read cho chỗ cần "đọc ngay sau khi ghi" (giỏ hàng, số dư), eventual cho phần còn lại.

# EN

## Key idea

Every table is replicated across several Availability Zones. A write is acknowledged once it is durable, but the replicas may not all have it yet.

- **Eventually consistent** (the default): may read from a replica that has not received the latest write. Half the price.
- **Strongly consistent** (`"ConsistentRead": true`): returns the latest version of every successful write. Twice the price, and it can fail with a 500 error or be slower during a network problem.

There are no strong reads on **GSIs** and **Streams**. Tables and **LSIs** have them.

## Example

```text
t0  PutItem address = "Hue"            -> success
t1  GetItem                            -> may return the old address
t1  GetItem ConsistentRead = true      -> returns "Hue"
```

## Practice

The in-browser emulator runs as one node, so it never shows a stale read; it still rejects `ConsistentRead` on a GSI like real DynamoDB. Use strong reads where you must "read right after a write" (cart, balance) and eventual reads elsewhere.
