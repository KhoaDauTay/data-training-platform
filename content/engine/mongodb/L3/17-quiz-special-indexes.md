---
id: e-mg-l3-17
engine: mongodb
level: L3
module: special-indexes
title: "Kiểm tra: index đặc biệt"
title_en: "Check: special indexes"
kind: quiz
minutes: 5
runtime: docs
objectives:
  - vi: "Chọn đúng index đặc biệt hoặc thuộc tính index cho một nhu cầu"
    en: "Pick the right special index or index property for a need"
requires: [e-mg-l3-13, e-mg-l3-14, e-mg-l3-15, e-mg-l3-16]
sources:
  - https://www.mongodb.com/docs/manual/core/indexes/index-types/index-text/
  - https://www.mongodb.com/docs/manual/reference/geojson/
  - https://www.mongodb.com/docs/manual/core/index-case-insensitive/
  - https://www.mongodb.com/docs/manual/core/index-hidden/
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
    why:
      vi: "Mỗi collection chỉ có một index text, nhưng index đó gồm được nhiều trường. Index wildcard không phục vụ `$text`."
      en: "A collection has only one text index, but that index can hold several fields. A wildcard index cannot serve `$text`."
  - q:
      vi: "Cửa hàng ở Đà Nẵng có vĩ độ 16.07 và kinh độ 108.22. Viết điểm GeoJSON nào cho index 2dsphere?"
      en: "A store in Da Nang is at latitude 16.07 and longitude 108.22. Which GeoJSON point do you write for a 2dsphere index?"
    options:
      - vi: "`{ type: \"Point\", coordinates: [16.07, 108.22] }`"
        en: "`{ type: \"Point\", coordinates: [16.07, 108.22] }`"
      - vi: "`{ type: \"Point\", coordinates: [108.22, 16.07] }`"
        en: "`{ type: \"Point\", coordinates: [108.22, 16.07] }`"
      - vi: "`{ lat: 16.07, lng: 108.22 }`"
        en: "`{ lat: 16.07, lng: 108.22 }`"
    answer: 1
    why:
      vi: "GeoJSON ghi kinh độ trước, vĩ độ sau. Viết ngược thì 108.22 nằm ở chỗ vĩ độ, ngoài khoảng -90 đến 90 cho phép."
      en: "GeoJSON lists longitude first, then latitude. Reversed, 108.22 sits in the latitude slot, outside the allowed -90 to 90."
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
      vi: "Chỉ truy vấn ghi đúng collation của index mới dùng được nó. `$regex` không theo collation nên không dùng được index loại này, còn `strength: 1` là collation khác."
      en: "Only a query that states the index's exact collation can use it. `$regex` is not collation-aware, so it cannot use this kind of index, and `strength: 1` is a different collation."
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
      vi: "Index ẩn không được planner dùng nhưng vẫn được cập nhật khi ghi, nên bỏ ẩn là dùng được ngay, không phải dựng lại."
      en: "A hidden index is not used by the planner but is still updated on writes, so unhiding makes it usable at once, with no rebuild."
---

## Ý chính

Bốn câu hỏi về index text, 2dsphere, collation và hidden. Đáp án dựa trên tài liệu MongoDB hiện hành, kiểm ngày 2026-11-20.

# EN

## Key idea

Four questions on text, 2dsphere, collation and hidden indexes. Answers follow the current MongoDB manual, checked 2026-11-20.
