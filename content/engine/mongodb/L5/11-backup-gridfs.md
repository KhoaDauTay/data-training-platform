---
id: e-mg-l5-11
engine: mongodb
level: L5
module: operations
title: "Sao lưu và GridFS"
title_en: "Backups and GridFS"
kind: concept
minutes: 10
runtime: docs
objectives:
  - vi: "Chọn cách sao lưu hợp với cỡ hệ thống: `mongodump`/`mongorestore`, snapshot hệ thống tệp, hay dịch vụ sao lưu"
    en: "Pick a backup method that fits the deployment: `mongodump`/`mongorestore`, file system snapshots, or a backup service"
  - vi: "Biết GridFS cắt một tệp lớn thành các mảnh trong hai collection, và khi nào nên dùng nó"
    en: "Know that GridFS splits a large file into chunks across two collections, and when to use it"
requires: [e-mg-l1-01, e-mg-l5-03]
sources:
  - https://www.mongodb.com/docs/manual/core/backups/
  - https://www.mongodb.com/docs/database-tools/mongodump/
  - https://www.mongodb.com/docs/manual/core/gridfs/
quiz:
  - q:
      vi: "Replica set của bạn giữ 2 TB dữ liệu và cần bản sao lưu nhất quán tại một thời điểm. Cách nào hợp nhất?"
      en: "Your replica set holds 2 TB of data and needs a consistent point-in-time backup. Which method fits best?"
    options:
      - { vi: "`mongodump` mỗi đêm", en: "`mongodump` every night" }
      - { vi: "Snapshot hệ thống tệp, hoặc dịch vụ sao lưu như Atlas", en: "File system snapshots, or a backup service such as Atlas" }
      - { vi: "Xuất mỗi collection ra CSV", en: "Export each collection to CSV" }
    answer: 1
    why:
      vi: "`mongodump` nghe hợp lý vì nó là công cụ sao lưu quen nhất. Nhưng docs chính thức nói `mongodump`/`mongorestore` đơn giản và hiệu quả cho hệ thống **nhỏ**, không lý tưởng cho hệ thống lớn: nó đọc qua toàn bộ dữ liệu và phải dựng lại index khi phục hồi. Hệ thống lớn dùng snapshot hệ thống tệp hoặc dịch vụ sao lưu. CSV mất kiểu BSON."
      en: "`mongodump` sounds right because it is the best-known backup tool. But the docs say `mongodump`/`mongorestore` are simple and efficient for **small** deployments, not ideal for large ones: it reads through all the data and the indexes must be rebuilt on restore. Large deployments use file system snapshots or a backup service. CSV loses the BSON types."
  - q:
      vi: "Một tệp video 300 MB lưu bằng GridFS với cỡ mảnh mặc định. Dữ liệu của nó nằm ở đâu?"
      en: "A 300 MB video is stored with GridFS using the default chunk size. Where does its data live?"
    options:
      - { vi: "Trong một tài liệu duy nhất ở `fs.files`", en: "In one single document in `fs.files`" }
      - { vi: "Thông tin tệp ở `fs.files`, nội dung cắt thành nhiều tài liệu ở `fs.chunks`", en: "File details in `fs.files`, the content split into many documents in `fs.chunks`" }
      - { vi: "Ngoài MongoDB, trên ổ đĩa của máy chủ", en: "Outside MongoDB, on the server's disk" }
    answer: 1
    why:
      vi: "Một tài liệu tối đa 16 MiB, nên 300 MB không thể nằm trong một tài liệu. GridFS ghi thông tin tệp (tên, cỡ, cỡ mảnh) vào `fs.files` và cắt nội dung thành các mảnh 255 KiB, mỗi mảnh là một tài liệu ở `fs.chunks`."
      en: "A document is at most 16 MiB, so 300 MB cannot fit in one document. GridFS writes the file details (name, size, chunk size) to `fs.files` and splits the content into 255 KiB chunks, each one a document in `fs.chunks`."
  - q:
      vi: "Ảnh đại diện của khách, mỗi ảnh khoảng 40 KB, cần được thay cả ảnh một lần. GridFS có cần không?"
      en: "Customer avatars of about 40 KB each must be replaced whole, in one go. Is GridFS needed?"
    options:
      - { vi: "Có, mọi tệp nhị phân phải dùng GridFS", en: "Yes, every binary file must use GridFS" }
      - { vi: "Không, lưu trong một trường kiểu `BinData` của tài liệu là đủ", en: "No, a `BinData` field in the document is enough" }
    answer: 1
    why:
      vi: "Nghe hợp lý khi nghĩ tệp nào cũng cần GridFS. Docs chính thức nói tệp nhỏ hơn 16 MiB có thể lưu trong một tài liệu (kiểu `BinData`), và nếu phải cập nhật cả tệp một cách atomic thì GridFS không hợp: nó ghi nhiều tài liệu mảnh, không phải một."
      en: "It sounds right to think every file needs GridFS. The docs say a file smaller than 16 MiB can live in one document (type `BinData`), and that GridFS does not fit when the whole file must be updated atomically: it writes many chunk documents, not one."
---

## Ý chính

Sao lưu: docs chính thức nêu ba cách. `mongodump` ghi dữ liệu ra tệp BSON, `mongorestore` nạp lại. Hai công cụ này đơn giản và hợp hệ thống nhỏ, nhưng chậm với hệ thống lớn: chúng đọc qua mọi dữ liệu, và index phải dựng lại khi phục hồi. Hệ thống lớn dùng snapshot hệ thống tệp (cần journal và một thời điểm nhất quán) hoặc dịch vụ sao lưu như MongoDB Atlas, có phục hồi về một thời điểm.

Một bản sao lưu chỉ đáng tin khi đã thử phục hồi nó.

GridFS: một tài liệu tối đa 16 MiB. Với tệp lớn hơn, GridFS cắt tệp thành các mảnh (mặc định 255 KiB). Thông tin tệp nằm ở collection `fs.files`, các mảnh nằm ở `fs.chunks`. Driver ráp lại khi đọc, và đọc được một đoạn giữa tệp mà không tải cả tệp.

## Ví dụ

Sao lưu một database của hệ thống nhỏ, rồi phục hồi (chạy trên dòng lệnh, không phải mongosh):

```bash
mongodump --db=shop --out=/backup/2026-11-24
mongorestore --db=shop /backup/2026-11-24/shop
```

Một tệp trong GridFS là hai loại tài liệu:

```javascript
// fs.files: one document per file
{ _id: ObjectId("…"), filename: "promo.mp4", length: 314572800, chunkSize: 261120, uploadDate: ISODate("…") }
// fs.chunks: one document per chunk
{ _id: ObjectId("…"), files_id: ObjectId("…"), n: 0, data: BinData(0, "…") }
```

## Thực hành

Trả lời ba câu hỏi: chọn cách sao lưu cho một hệ thống lớn, chỉ ra nơi GridFS đặt dữ liệu, và quyết định một tệp nhỏ có cần GridFS không. Bài này không chạy trong trình duyệt: mingo không có công cụ sao lưu hay GridFS.

# EN

## Key idea

Backups: the docs name three ways. `mongodump` writes the data out to BSON files, `mongorestore` loads it back. These two tools are simple and suit small deployments, but they are slow for large ones: they read through all the data, and the indexes must be rebuilt on restore. Large deployments use file system snapshots (they need journaling and a consistent point in time) or a backup service such as MongoDB Atlas, which can restore to a point in time.

A backup is only trustworthy once you have tried restoring it.

GridFS: a document is at most 16 MiB. For larger files, GridFS splits a file into chunks (255 KiB by default). The file details live in the `fs.files` collection, the chunks in `fs.chunks`. The driver puts them back together on read, and can read a range in the middle of a file without loading the whole file.

## Example

Back up one database of a small deployment, then restore it (run in a shell, not in mongosh):

```bash
mongodump --db=shop --out=/backup/2026-11-24
mongorestore --db=shop /backup/2026-11-24/shop
```

One file in GridFS is two kinds of documents:

```javascript
// fs.files: one document per file
{ _id: ObjectId("…"), filename: "promo.mp4", length: 314572800, chunkSize: 261120, uploadDate: ISODate("…") }
// fs.chunks: one document per chunk
{ _id: ObjectId("…"), files_id: ObjectId("…"), n: 0, data: BinData(0, "…") }
```

## Practice

Answer three questions: pick a backup method for a large deployment, say where GridFS puts the data, and decide whether a small file needs GridFS. This lesson does not run in the browser: mingo has no backup tools and no GridFS.
