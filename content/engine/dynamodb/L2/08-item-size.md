---
id: e-dy-l2-08
engine: dynamodb
level: L2
module: partiql-cost
title: "Tính cỡ item bằng tay"
title_en: "Work out an item's size by hand"
kind: quiz
runtime: docs
minutes: 10
figures: [{ name: dy-item-size, at: idea }]
objectives:
  - vi: Tính cỡ chuỗi, số, boolean, danh sách theo luật của AWS.
    en: Compute the size of strings, numbers, booleans and lists with the AWS rules.
  - vi: Phân biệt cỡ item (dùng cho capacity và giới hạn 400 KB) với 100 byte phụ phí lưu trữ.
    en: Tell item size (used for capacity and the 400 KB limit) from the 100 bytes of storage overhead.
requires: [e-dy-l1-03]
sources:
  - { url: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/CapacityUnitCalculations.html, title_vi: "Cách tính đơn vị capacity" }
  - { url: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Constraints.html, title_vi: "Giới hạn" }
quiz:
  - q:
      vi: 'Item `{"isbn": "978-0-04", "price": 88000}` (isbn là chuỗi, price là số) nặng bao nhiêu byte?'
      en: 'How many bytes is the item `{"isbn": "978-0-04", "price": 88000}` (isbn a string, price a number)?'
    options:
      - vi: 17 byte
        en: 17 bytes
      - vi: 19 byte
        en: 19 bytes
      - vi: 21 byte
        en: 21 bytes
      - vi: 119 byte
        en: 119 bytes
    answer: 1
    why:
      vi: 'Cỡ item = tổng (độ dài tên + cỡ giá trị) của mỗi thuộc tính. isbn: tên 4 byte + chuỗi 8 byte = 12. price: tên 5 byte; số tính 1 byte cho mỗi 2 chữ số có nghĩa cộng 1 byte, và 88000 chỉ có 2 chữ số có nghĩa "88" (số 0 ở cuối bị bỏ), nên 1 + 1 = 2; cộng tên là 7. Tổng 12 + 7 = 19 byte. 119 là cộng thêm 100 byte phụ phí, phần chỉ dùng khi tính tiền lưu trữ.'
      en: 'Item size = the sum of (name length + value size) over the attributes. isbn: a 4-byte name + an 8-byte string = 12. price: a 5-byte name; a number takes 1 byte per 2 significant digits plus 1 byte, and 88000 has only the 2 significant digits "88" (trailing zeros are trimmed), so 1 + 1 = 2; with the name, 7. Total 12 + 7 = 19 bytes. 119 adds the 100 bytes of overhead, which only count for storage billing.'
  - q:
      vi: 'Thuộc tính danh sách `"tags": ["nosql", "perf"]` nặng bao nhiêu byte?'
      en: 'How many bytes is the list attribute `"tags": ["nosql", "perf"]`?'
    options:
      - vi: 13 byte
        en: 13 bytes
      - vi: 15 byte
        en: 15 bytes
      - vi: 18 byte
        en: 18 bytes
    answer: 2
    why:
      vi: 'Tên 4 + 3 byte phụ phí của List + mỗi phần tử 1 byte phụ phí cộng cỡ của nó - (1 + 5) + (1 + 4) = 11. Tổng 4 + 3 + 11 = 18. Chọn 15 là quên 3 byte của List (4 + 11); chọn 13 là quên cả 3 byte đó lẫn 1 byte của mỗi phần tử (4 + 5 + 4), tức tính như hai chuỗi rời.'
      en: 'Name 4 + 3 bytes of List overhead + each element 1 byte of overhead plus its size - (1 + 5) + (1 + 4) = 11. Total 4 + 3 + 11 = 18. Picking 15 forgets the 3 List bytes (4 + 11); picking 13 forgets both those and the 1 byte per element (4 + 5 + 4), as if the values were two loose strings.'
  - q:
      vi: Thuộc tính chuỗi `city` có giá trị `"Đà Nẵng"`. Cỡ là bao nhiêu?
      en: The string attribute `city` holds `"Đà Nẵng"`. What is its size?
    options:
      - vi: 11 byte (4 + 7 ký tự)
        en: 11 bytes (4 + 7 characters)
      - vi: 15 byte
        en: 15 bytes
      - vi: 18 byte
        en: 18 bytes
    answer: 1
    why:
      vi: 'Chuỗi tính theo byte UTF-8, không theo số ký tự. "Đ" và "à" mỗi chữ 2 byte, "ẵ" 3 byte, bốn ký tự còn lại (kể cả dấu cách) 1 byte - tổng 2 + 2 + 3 + 4 = 11. Cộng tên 4 byte là 15. Chọn 11 là đếm 7 ký tự như 7 byte, chỉ đúng với chữ không dấu; chọn 18 là coi mọi ký tự đều 2 byte (4 + 7 × 2).'
      en: 'Strings count UTF-8 bytes, not characters. The two accented capitals and small letters take 2 bytes each, the letter with two marks takes 3, the other four (the space included) take 1 - 2 + 2 + 3 + 4 = 11 in all. Plus the 4-byte name gives 15. Picking 11 counts 7 characters as 7 bytes, which holds only for unaccented letters; picking 18 treats every character as 2 bytes (4 + 7 × 2).'
  - q:
      vi: 'Thuộc tính `"inStock": true` nặng bao nhiêu?'
      en: 'How many bytes is the attribute `"inStock": true`?'
    options:
      - vi: 8 byte
        en: 8 bytes
      - vi: 11 byte
        en: 11 bytes
      - vi: 4 byte
        en: 4 bytes
    answer: 0
    why:
      vi: 'Giá trị boolean (và null) luôn chiếm 1 byte, không phụ thuộc chữ "true" dài 4 ký tự. Tên `inStock` dài 7 byte, nên 7 + 1 = 8. Chọn 11 là đếm chữ "true" như chuỗi (7 + 4); chọn 4 là quên tên thuộc tính, mà mỗi item lưu tên kèm giá trị.'
      en: 'A Boolean (or null) value always takes 1 byte, whatever the 4 letters of "true". The name `inStock` is 7 bytes, so 7 + 1 = 8. Picking 11 counts "true" as a string (7 + 4); picking 4 forgets the attribute name, which every item stores beside the value.'
  - q:
      vi: Một item 23 byte được tính bao nhiêu khi so với giới hạn 400 KB, và bao nhiêu khi tính tiền lưu trữ?
      en: A 23-byte item counts as how much against the 400 KB limit, and how much for storage billing?
    options:
      - vi: 23 byte và 23 byte
        en: 23 bytes and 23 bytes
      - vi: 123 byte và 123 byte
        en: 123 bytes and 123 bytes
      - vi: 23 byte và 123 byte
        en: 23 bytes and 123 bytes
    answer: 2
    trap: 1
    why:
      vi: Nghe hợp lý vì mỗi item có thêm 100 byte phụ phí, nhưng phụ phí đó chỉ dùng để tính tiền lưu trữ. Giới hạn 400 KB và capacity đọc ghi dùng cỡ item thật, 23 byte. Còn "23 và 23" thì quên phụ phí, vì hóa đơn lưu trữ tính 23 + 100 = 123 byte cho item này.
      en: It sounds right because every item carries 100 extra bytes, but that overhead is only for storage billing. The 400 KB limit and read/write capacity use the real item size, 23 bytes. "23 and 23" forgets the overhead instead, since the storage bill counts 23 + 100 = 123 bytes for this item.
---

## Mở bài

Mỗi lần đọc hay ghi, DynamoDB tính tiền theo cỡ item. Bạn có ước được một item nặng bao nhiêu byte trước khi gửi request không?

## Ý chính

Cỡ item = tổng cỡ các thuộc tính. Luật của AWS:

- **Chuỗi**: byte UTF-8 của tên + byte UTF-8 của giá trị.
- **Số**: tên + 1 byte cho mỗi 2 chữ số có nghĩa + 1 byte (gần đúng). Số 0 ở đầu và cuối bị bỏ.
- **Nhị phân**: tên + số byte thô (không phải độ dài base64).
- **Boolean, null**: tên + 1 byte.
- **List, Map**: tên + 3 byte + tổng cỡ phần tử, mỗi phần tử thêm 1 byte. Rỗng là tên + 3 byte.
- **Set**: tên + tổng cỡ phần tử, không có phụ phí.

Ngoài ra mỗi item có **100 byte phụ phí lưu trữ**, chỉ dùng để tính tiền lưu trữ.

Hình từng bước ở cuối mục này cộng cỡ item `978-0-04` theo từng thuộc tính, rồi tách cỡ tính capacity khỏi cỡ tính tiền lưu trữ.

## Ví dụ

```text
"shirt-color": "R"   -> 11 + 1 = 12
"shirt-size":  "M"   -> 10 + 1 = 11
item                 -> 23 bytes
```

## Thực hành

Bài sau dùng cỡ item để tính RCU và WCU. Bộ mô phỏng trong trình duyệt chỉ ước lượng cỡ item, nên sát ranh giới 1 KB hay 4 KB con số `ConsumedCapacity` của nó có thể lệch với DynamoDB thật. Các câu ở đây làm theo luật của AWS.

## Tóm tắt

- Cỡ item = tổng cỡ thuộc tính, tính cả tên thuộc tính.
- Chuỗi tính theo byte UTF-8, không theo số ký tự.
- Số: khoảng 1 byte cho mỗi 2 chữ số có nghĩa, cộng 1.
- List và Map thêm 3 byte, mỗi phần tử thêm 1 byte.
- 100 byte phụ phí chỉ dùng để tính tiền lưu trữ.

# EN

## Opening

Every read and write is billed by item size. Can you estimate how many bytes an item weighs before you send the request?

## Key idea

Item size = the sum of its attribute sizes. The AWS rules:

- **String**: UTF-8 bytes of the name + UTF-8 bytes of the value.
- **Number**: name + 1 byte per 2 significant digits + 1 byte (approximate). Leading and trailing zeros are trimmed.
- **Binary**: name + raw bytes (not the base64 length).
- **Boolean, null**: name + 1 byte.
- **List, Map**: name + 3 bytes + the size of the elements, each element adding 1 byte. An empty one is name + 3 bytes.
- **Set**: name + the size of the elements, no overhead.

On top of that every item has **100 bytes of storage overhead**, used only for storage billing.

The step-through figure at the end of this section adds up the size of item `978-0-04` attribute by attribute, then separates the size used for capacity from the size billed for storage.

## Example

```text
"shirt-color": "R"   -> 11 + 1 = 12
"shirt-size":  "M"   -> 10 + 1 = 11
item                 -> 23 bytes
```

## Practice

The next lesson uses item size to work out RCU and WCU. The in-browser emulator only estimates item size, so near a 1 KB or 4 KB boundary its `ConsumedCapacity` can differ from real DynamoDB. The questions here follow the AWS rules.

## Recap

- Item size = the sum of the attribute sizes, names included.
- Strings count UTF-8 bytes, not characters.
- Numbers: about 1 byte per 2 significant digits, plus 1.
- Lists and Maps add 3 bytes, and 1 byte per element.
- The 100 bytes of overhead count only for storage billing.
