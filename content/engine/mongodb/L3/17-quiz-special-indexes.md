---
id: e-mg-l3-17
engine: mongodb
level: L3
module: special-indexes
title: "Kiểm tra: index đặc biệt"
title_en: "Check: special indexes"
kind: quiz
minutes: 6
runtime: docs
objectives:
  - vi: "Chọn đúng index đặc biệt hoặc thuộc tính index cho một nhu cầu"
    en: "Pick the right special index or index property for a need"
  - vi: "Nhận ra hiểu lầm hay gặp về index text, GeoJSON, collation và index ẩn"
    en: "Spot the common misconceptions about text indexes, GeoJSON, collation and hidden indexes"
requires: [e-mg-l3-13, e-mg-l3-14, e-mg-l3-15, e-mg-l3-16]
sources:
  - { url: https://www.mongodb.com/docs/manual/core/indexes/index-types/index-text/, title_vi: "Index text" }
  - { url: https://www.mongodb.com/docs/manual/reference/geojson/, title_vi: "Đối tượng GeoJSON" }
  - { url: https://www.mongodb.com/docs/manual/core/index-case-insensitive/, title_vi: "Index không phân biệt hoa thường" }
  - { url: https://www.mongodb.com/docs/manual/core/index-hidden/, title_vi: "Index ẩn" }
quiz:
  - q:
      vi: "Collection `articles` đã có index text trên `title`. Bạn muốn tìm từ trong cả `title` lẫn `body`. Làm thế nào?"
      en: "The `articles` collection already has a text index on `title`. You want to search words in both `title` and `body`. What do you do?"
    options:
      - vi: "Thêm index text thứ hai `{ body: \"text\" }`"
        en: "Add a second text index `{ body: \"text\" }`"
      - vi: "Xóa index cũ, tạo một index text gồm cả hai trường `{ title: \"text\", body: \"text\" }`"
        en: "Drop the old index and create one text index on both fields `{ title: \"text\", body: \"text\" }`"
      - vi: "Tạo index wildcard `{ \"$**\": 1 }` rồi dùng `$text`"
        en: "Create a wildcard index `{ \"$**\": 1 }` and use `$text`"
    answer: 1
    trap: 0
    why:
      vi: "Index thường thì thêm bao nhiêu cũng được, nhưng mỗi collection chỉ có một index text, nên `mongod` từ chối `{ body: \"text\" }` khi `articles` đã có index text trên `title`. Một index text gồm được nhiều trường, nên xóa index cũ rồi tạo một index trên cả hai. Index wildcard lưu giá trị nguyên của từng trường, không tách từ, nên `$text` không dùng được nó."
      en: "Regular indexes can be added as many as you like, but a collection has only one text index, so `mongod` refuses `{ body: \"text\" }` while `articles` already has a text index on `title`. One text index can hold several fields, so drop the old one and create one on both. A wildcard index stores each field's whole value without splitting words, so `$text` cannot use it."
  - q:
      vi: "Cửa hàng ở Đà Nẵng có vĩ độ 16,07 và kinh độ 108,22. Viết điểm GeoJSON nào cho index 2dsphere?"
      en: "A store in Da Nang is at latitude 16.07 and longitude 108.22. Which GeoJSON point do you write for a 2dsphere index?"
    options:
      - vi: "`{ type: \"Point\", coordinates: [16.07, 108.22] }`"
        en: "`{ type: \"Point\", coordinates: [16.07, 108.22] }`"
      - vi: "`{ type: \"Point\", coordinates: [108.22, 16.07] }`"
        en: "`{ type: \"Point\", coordinates: [108.22, 16.07] }`"
      - vi: "`{ lat: 16.07, lng: 108.22 }`"
        en: "`{ lat: 16.07, lng: 108.22 }`"
    answer: 1
    trap: 0
    why:
      vi: "Ta quen nói \"vĩ độ, kinh độ\", nhưng GeoJSON ghi kinh độ trước, vĩ độ sau. Viết ngược thì 108,22 nằm ở chỗ vĩ độ, ngoài khoảng -90 đến 90 cho phép, và index 2dsphere từ chối tài liệu. `{ lat, lng }` thì không phải điểm GeoJSON: thiếu `type` và `coordinates`."
      en: "We usually say \"latitude, longitude\", but GeoJSON lists longitude first, then latitude. Reversed, 108.22 sits in the latitude slot, outside the allowed -90 to 90, and the 2dsphere index refuses the document. `{ lat, lng }` is not a GeoJSON point: it lacks `type` and `coordinates`."
  - q:
      vi: "Có index không phân biệt hoa thường `{ name: 1 }` với `collation: { locale: \"en\", strength: 2 }`. Truy vấn nào dùng được index này?"
      en: "There is a case-insensitive index `{ name: 1 }` with `collation: { locale: \"en\", strength: 2 }`. Which query can use it?"
    options:
      - vi: "`find({ name: /^an$/i })`"
        en: "`find({ name: /^an$/i })`"
      - vi: "`find({ name: \"an\" }).collation({ locale: \"en\", strength: 2 })`"
        en: "`find({ name: \"an\" }).collation({ locale: \"en\", strength: 2 })`"
      - vi: "`find({ name: \"an\" }).collation({ locale: \"en\", strength: 1 })`"
        en: "`find({ name: \"an\" }).collation({ locale: \"en\", strength: 1 })`"
    answer: 1
    why:
      vi: "Chỉ truy vấn ghi đúng collation của index mới dùng được nó. `$regex` với cờ `i` không theo collation nên không dùng được index loại này. `strength: 1` cũng bỏ qua hoa thường và trả đúng tài liệu, nhưng khác `strength` là collation khác, nên index không được dùng."
      en: "Only a query that states the index's exact collation can use it. `$regex` with the `i` flag is not collation-aware, so it cannot use this kind of index. `strength: 1` also ignores case and returns the right documents, but a different `strength` is a different collation, so the index is not used."
  - q:
      vi: "Bạn nghi index `{ status: 1 }` không còn truy vấn nào cần, nhưng xóa rồi dựng lại trên collection lớn rất tốn. Bước an toàn trước tiên là gì?"
      en: "You suspect no query needs the index `{ status: 1 }` any more, but dropping and rebuilding it on a large collection is costly. What is the safe first step?"
    options:
      - vi: "`hideIndex({ status: 1 })` rồi theo dõi; nếu chậm đi thì `unhideIndex`"
        en: "`hideIndex({ status: 1 })` and watch; if things slow down, `unhideIndex`"
      - vi: "`dropIndex({ status: 1 })` rồi dựng lại nếu cần"
        en: "`dropIndex({ status: 1 })` and rebuild it if needed"
      - vi: "Đổi index thành sparse để nó nhỏ hơn"
        en: "Make the index sparse so it gets smaller"
    answer: 0
    why:
      vi: "Index ẩn không được planner dùng nhưng vẫn được cập nhật khi ghi, nên nếu truy vấn chậm đi thì bỏ ẩn là dùng được ngay, không phải dựng lại. `dropIndex` thì đúng cái giá bạn muốn tránh: nếu đoán sai phải dựng lại trên collection lớn. Đổi sang sparse không cho biết index còn cần không, mà còn phải dựng lại."
      en: "A hidden index is not used by the planner but is still updated on writes, so if queries slow down, unhiding makes it usable at once, with no rebuild. `dropIndex` is exactly the cost you want to avoid: a wrong guess means a rebuild on a large collection. Making it sparse does not tell whether the index is still needed, and it needs a rebuild too."
---
## Mở bài

Bốn tình huống thật từ một cửa hàng: tìm chữ trong bài viết, lưu vị trí cửa hàng, tìm tên không phân biệt hoa thường, và dọn một index có vẻ thừa. Mỗi câu có một lựa chọn nghe rất hợp lý mà sai.

## Ý chính

Các câu hỏi dựa trên bài 13 đến 16 và docs chính thức của MongoDB hiện hành. Nhiều người nghĩ index nào cũng thêm được nhiều lần và dùng được cho mọi kiểu so sánh. Thật ra mỗi loại có luật riêng: một index text mỗi collection, GeoJSON kinh độ trước, index collation chỉ phục vụ đúng collation của nó, và index ẩn vẫn được ghi.

## Ví dụ

Bảng nhắc trước khi làm:

```text
need                                   index or property
search words in title and body        one text index { title: "text", body: "text" }
store location, nearest query          2dsphere on GeoJSON [lng, lat]
case-insensitive equality              index + query with the same collation
test dropping an index                 hideIndex, then unhideIndex if needed
```

## Tóm tắt

- Mỗi collection chỉ một index text, gồm được nhiều trường.
- GeoJSON ghi `[lng, lat]`: kinh độ trước.
- Index collation chỉ dùng được với đúng collation đó; `$regex` không dùng được.
- Ẩn index trước khi xóa: bỏ ẩn không phải dựng lại.

# EN

## Opening

Four real situations from a shop: searching words in articles, storing store locations, case-insensitive name lookups, and cleaning up an index that looks unused. Each question has one option that sounds very reasonable and is wrong.

## Key idea

The questions build on lessons 13 to 16 and the current MongoDB manual. Many people think any index can be added many times and serves every kind of comparison. In fact each kind has its own rules: one text index per collection, GeoJSON longitude first, a collation index serves only its own collation, and a hidden index is still written.

## Example

A reminder table before you start:

```text
need                                   index or property
search words in title and body        one text index { title: "text", body: "text" }
store location, nearest query          2dsphere on GeoJSON [lng, lat]
case-insensitive equality              index + query with the same collation
test dropping an index                 hideIndex, then unhideIndex if needed
```

## Recap

- A collection has only one text index, which can hold several fields.
- GeoJSON writes `[lng, lat]`: longitude first.
- A collation index works only with that exact collation; `$regex` cannot use it.
- Hide an index before dropping it: unhiding needs no rebuild.
