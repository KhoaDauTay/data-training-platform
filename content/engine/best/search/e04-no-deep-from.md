---
id: e-bp-e04
engine: best
track: search
level: L3
module: e
title: "Không phân trang sâu bằng from"
title_en: "No deep paging with from"
kind: quiz
minutes: 3
objectives:
  - vi: "Lấy trang sau bằng điều kiện trên khóa sắp xếp (ý tưởng của `search_after`), không tăng `from` mãi."
    en: "Fetch the next page with a condition on the sort key (the idea behind `search_after`), not an ever-growing `from`."
avoid:
  vi: "`from` + `size` vượt 10 000: Elasticsearch từ chối request."
  en: "`from` + `size` above 10,000: Elasticsearch refuses the request."
requires: [e-sr-l2-03]
skills: []
adv: []
sources:
  - https://www.elastic.co/docs/reference/elasticsearch/rest-apis/paginate-search-results
verified: { version: "BoonData Elasticsearch simulation (Elasticsearch 9 docs)", date: "2026-11-27" }
pair:
  runtime: es
  check: error
  setup: |
    {"index": "shop",
     "settings": {"analysis": {"analyzer": {
       "vi_fold": {"tokenizer": "standard",
         "filter": ["lowercase", "asciifolding"]}}}},
     "mappings": {"properties": {
       "name": {"type": "text",
         "fields": {"fold": {"type": "text", "analyzer": "vi_fold"}}},
       "brand": {"type": "keyword"},
       "category": {"type": "keyword"},
       "price": {"type": "integer"}}},
     "docs": [
      {"_id": "1", "name": "Đèn lồng lụa đỏ", "brand": "HoiAnLight", "category": "den", "price": 180},
      {"_id": "2", "name": "Đèn lồng tre nhỏ", "brand": "HoiAnLight", "category": "den", "price": 95},
      {"_id": "3", "name": "Lồng đèn giấy kéo quân", "brand": "SaiGonCraft", "category": "den", "price": 60},
      {"_id": "4", "name": "Nón lá bài thơ Huế", "brand": "HueHat", "category": "non", "price": 120},
      {"_id": "5", "name": "Nón lá trẻ em", "brand": "HueHat", "category": "non", "price": 70},
      {"_id": "6", "name": "Áo dài lụa tơ tằm", "brand": "SilkHouse", "category": "ao", "price": 950},
      {"_id": "7", "name": "Khăn lụa tơ tằm đỏ", "brand": "SilkHouse", "category": "khan", "price": 320},
      {"_id": "8", "name": "Trà sen Tây Hồ", "brand": "TeaLotus", "category": "tra", "price": 250},
      {"_id": "9", "name": "Trà ô long Đà Lạt", "brand": "TeaLotus", "category": "tra", "price": 210},
      {"_id": "10", "name": "Cà phê Buôn Ma Thuột", "brand": "BMTCoffee", "category": "caphe", "price": 150},
      {"_id": "11", "name": "Đèn lồng Hội An đỏ lớn", "brand": "HoiAnLight", "category": "den", "price": 260},
      {"_id": "12", "name": "Tranh lụa phố cổ Hội An", "brand": "SilkHouse", "category": "tranh", "price": 480}]}
  bad: |
    GET shop/_search
    {"from": 10000, "size": 10,
     "sort": [{"price": "asc"}]}
  good: |
    GET shop/_search
    {"size": 10,
     "query": {"range": {
       "price": {"gt": 180}}},
     "sort": [{"price": "asc"}]}
  expect: { code: illegal_argument_exception }
quiz:
  - q:
      vi: "Trang trước kết thúc ở hàng giá 180 (sắp theo `price` tăng dần, không có hai hàng cùng giá). Request nào lấy đúng trang tiếp theo mà không cần `from`?"
      en: "The previous page ended at a product priced 180 (sorted by `price` ascending, no two products share a price). Which request fetches the next page without `from`?"
    options:
      - { vi: "`range` với `price` `gt` 180, cùng `sort` theo `price`", en: "A `range` with `price` `gt` 180, with the same `sort` on `price`" }
      - { vi: "`range` với `price` `gte` 180, cùng `sort` theo `price`", en: "A `range` with `price` `gte` 180, with the same `sort` on `price`" }
      - { vi: "`from` bằng 10 với `size` 10, không cần `sort`", en: "`from` 10 with `size` 10, no `sort` needed" }
    answer: 0
    why:
      vi: "`gte` lấy lại cả hàng giá 180, tức hàng cuối của trang trước, nên trang mới bị lặp một dòng. Bỏ `sort` thì thứ tự giữa hai request không cố định, và `from` vẫn là cách tốn kém khi trang càng sâu. `gt` 180 bắt đầu ngay sau hàng cuối đã thấy; đó là ý của `search_after`: nhớ giá trị sắp xếp cuối cùng thay vì đếm bỏ qua bao nhiêu dòng. Khi có thể trùng giá, thêm một khóa phụ duy nhất vào `sort`."
      en: "`gte` fetches the product priced 180 again, the last row of the previous page, so the new page repeats a row. Without `sort` the order between two requests is not fixed, and `from` is still the costly way as pages get deeper. `gt` 180 starts right after the last row seen; that is the idea of `search_after`: remember the last sort value instead of counting how many rows to skip. When prices can tie, add a unique tiebreaker to `sort`."
---

## Ý chính

Phân trang sâu bằng giá trị sắp xếp của dòng cuối cùng đã thấy (`search_after` trong Elasticsearch), không bằng `from` ngày càng lớn.

## Vì sao

- Với `from: 10000, size: 10`, mỗi shard phải tìm và sắp 10 010 kết quả đầu rồi mới bỏ đi 10 000. Trang càng sâu càng tốn.
- Vì thế Elasticsearch đặt giới hạn `index.max_result_window`, mặc định 10 000: `from` + `size` vượt mức đó bị từ chối.
- `search_after` gửi giá trị sắp xếp của dòng cuối trang trước; Elasticsearch chỉ tìm các dòng sau giá trị đó. Bộ mô phỏng chưa có `search_after`, nên bản Nên viết cùng ý bằng `range` trên khóa sắp xếp.
- Bản Không nên bị từ chối với `illegal_argument_exception`. Bản Nên trả các hàng giá trên 180, theo giá tăng dần.

# EN

## Key idea

Page deep through the sort value of the last row seen (`search_after` in Elasticsearch), not an ever-larger `from`.

## Why

- With `from: 10000, size: 10`, each shard has to find and sort the first 10,010 hits before throwing away 10,000. The deeper the page, the higher the cost.
- That is why Elasticsearch has the `index.max_result_window` limit, 10,000 by default: `from` + `size` above it is refused.
- `search_after` sends the sort value of the previous page's last row; Elasticsearch only looks for rows after it. The simulation has no `search_after` yet, so the Prefer version writes the same idea as a `range` on the sort key.
- The Avoid version is refused with `illegal_argument_exception`. The Prefer version returns the products above 180, by ascending price.
