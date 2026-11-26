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
    trap: 0
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
      vi: "Một tài liệu tối đa 16 MiB, nên 300 MB không thể nằm trong một tài liệu ở `fs.files`. GridFS cũng không đẩy tệp ra ổ đĩa ngoài: mọi byte vẫn nằm trong MongoDB, nên được chép sang secondary và sao lưu như dữ liệu khác. Nó ghi thông tin tệp (tên, cỡ, cỡ mảnh) vào `fs.files` và cắt nội dung thành các mảnh 255 KiB, mỗi mảnh là một tài liệu ở `fs.chunks`: 314.572.800 / 261.120 ≈ 1.205 mảnh."
      en: "A document is at most 16 MiB, so 300 MB cannot fit in one document in `fs.files`. Nor does GridFS push the file out to the server's disk: every byte stays inside MongoDB, so it is replicated to secondaries and backed up like other data. It writes the file details (name, size, chunk size) to `fs.files` and splits the content into 255 KiB chunks, each one a document in `fs.chunks`: 314,572,800 / 261,120 ≈ 1,205 chunks."
  - q:
      vi: "Ảnh đại diện của khách, mỗi ảnh khoảng 40 KB, cần được thay cả ảnh một lần. GridFS có cần không?"
      en: "Customer avatars of about 40 KB each must be replaced whole, in one go. Is GridFS needed?"
    options:
      - { vi: "Có, mọi tệp nhị phân phải dùng GridFS", en: "Yes, every binary file must use GridFS" }
      - { vi: "Không, lưu trong một trường kiểu `BinData` của tài liệu là đủ", en: "No, a `BinData` field in the document is enough" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý khi nghĩ tệp nào cũng cần GridFS. Docs chính thức nói tệp nhỏ hơn 16 MiB có thể lưu trong một tài liệu (kiểu `BinData`), và nếu phải cập nhật cả tệp một cách atomic thì GridFS không hợp: nó ghi nhiều tài liệu mảnh, không phải một."
      en: "It sounds right to think every file needs GridFS. The docs say a file smaller than 16 MiB can live in one document (type `BinData`), and that GridFS does not fit when the whole file must be updated atomically: it writes many chunk documents, not one."
---
## Mở bài

Một lệnh xóa nhầm chạy trên production lúc 3 giờ chiều, và câu hỏi đầu tiên là "bản sao lưu gần nhất ở đâu, phục hồi mất bao lâu?". Cùng lúc, đội marketing muốn lưu video quảng cáo 300 MB ngay trong MongoDB.

## Ý chính

Docs chính thức nêu ba cách sao lưu. `mongodump` ghi dữ liệu ra tệp BSON, `mongorestore` nạp lại: đơn giản và hợp hệ thống nhỏ, nhưng chậm với hệ thống lớn, vì chúng đọc qua mọi dữ liệu và index phải dựng lại khi phục hồi. Hệ thống lớn dùng snapshot hệ thống tệp (cần journal và một thời điểm nhất quán) hoặc dịch vụ sao lưu như MongoDB Atlas, có phục hồi về một thời điểm.

Nhiều người nghĩ có tệp sao lưu là đủ. Thật ra một bản sao lưu chỉ đáng tin khi đã thử phục hồi nó, và đo được mất bao lâu.

GridFS: một tài liệu tối đa 16 MiB. Với tệp lớn hơn, GridFS cắt tệp thành các mảnh (mặc định 255 KiB). Thông tin tệp nằm ở collection `fs.files`, các mảnh nằm ở `fs.chunks`. Driver ráp lại khi đọc, và đọc được một đoạn giữa tệp mà không tải cả tệp. Tệp nhỏ hơn 16 MiB thì lưu được trong một trường `BinData`; GridFS không hợp khi cả tệp phải được thay một cách atomic.

mingo không có công cụ sao lưu hay GridFS: bài này dùng lệnh từ docs.

## Cú pháp

```text
mongodump [--uri=<uri>] [--db=<db>] [--collection=<coll>] [--oplog] [--gzip] --out=<dir>
mongorestore [--uri=<uri>] [--drop] [--oplogReplay] <dir>
mongofiles --db=<db> put <file>
mongofiles --db=<db> get <file>
```

- `--oplog` / `--oplogReplay`: chụp cả oplog trong lúc dump để bản sao lưu nhất quán tại một thời điểm (replica set).
- `--drop`: xóa collection trước khi nạp lại.
- `mongofiles`: đưa tệp vào và lấy tệp ra khỏi GridFS từ dòng lệnh.

## Ví dụ

Sao lưu một database của hệ thống nhỏ, rồi phục hồi (chạy trên dòng lệnh, không phải mongosh):

```text
mongodump --db=shop --out=/backup/2026-11-24
mongorestore --db=shop /backup/2026-11-24/shop
```

Một tệp trong GridFS là hai loại tài liệu:

```text
// fs.files: one document per file
{ _id: ObjectId("…"), filename: "promo.mp4", length: 314572800, chunkSize: 261120, uploadDate: ISODate("…") }
// fs.chunks: one document per chunk
{ _id: ObjectId("…"), files_id: ObjectId("…"), n: 0, data: BinData(0, "…") }
```

Tệp 300 MB với mảnh 255 KiB là khoảng 1.200 tài liệu ở `fs.chunks`, đánh số `n` từ 0.

## Lỗi hay gặp

Dùng `mongodump` cho hệ thống lớn:

```text
// WRONG: a nightly dump of 2 TB reads everything, restore rebuilds every index
mongodump --uri="mongodb://db1,db2,db3/?replicaSet=shop" --out=/backup/nightly
```

```text
// FIX: file system snapshots or a backup service with point-in-time restore
```

Đưa tệp nhỏ vào GridFS:

```text
// WRONG: a 40 KB avatar split into chunks, cannot be replaced atomically
mongofiles --db=shop put avatar-c01.png
```

```text
// FIX: keep it in the customer document
{ _id: 1, name: "Customer 1", avatar: BinData(0, "…") }
```

Nhét tệp lớn vào một tài liệu:

```text
// ERROR BSONObjectTooLarge: one document is at most 16 MiB
db.media.insertOne({ name: "promo.mp4", data: BinData(0, "<300 MB>") })
```

## Tóm tắt

- `mongodump`/`mongorestore` cho hệ thống nhỏ; snapshot hoặc dịch vụ sao lưu cho hệ thống lớn.
- Bản sao lưu chỉ đáng tin khi đã thử phục hồi.
- GridFS = `fs.files` (thông tin) + `fs.chunks` (mảnh 255 KiB) cho tệp vượt 16 MiB.
- Tệp nhỏ cần thay atomic: lưu `BinData` trong tài liệu, không dùng GridFS.

# EN

## Opening

A mistaken delete runs on production at 3 p.m., and the first question is "where is the latest backup, and how long does a restore take?". At the same time, the marketing team wants to store a 300 MB promo video right inside MongoDB.

## Key idea

The docs name three ways to back up. `mongodump` writes the data out to BSON files and `mongorestore` loads it back: simple and fine for small deployments, but slow for large ones, because they read through all the data and the indexes must be rebuilt on restore. Large deployments use file system snapshots (they need journaling and a consistent point in time) or a backup service such as MongoDB Atlas, which can restore to a point in time.

Many people think having a backup file is enough. In fact a backup is only trustworthy once you have tried restoring it, and measured how long it takes.

GridFS: a document is at most 16 MiB. For larger files, GridFS splits a file into chunks (255 KiB by default). The file details live in the `fs.files` collection, the chunks in `fs.chunks`. The driver puts them back together on read, and can read a range in the middle of a file without loading the whole file. A file under 16 MiB fits in a `BinData` field; GridFS does not fit when the whole file must be replaced atomically.

mingo has no backup tools and no GridFS: this lesson uses commands from the docs.

## Syntax

```text
mongodump [--uri=<uri>] [--db=<db>] [--collection=<coll>] [--oplog] [--gzip] --out=<dir>
mongorestore [--uri=<uri>] [--drop] [--oplogReplay] <dir>
mongofiles --db=<db> put <file>
mongofiles --db=<db> get <file>
```

- `--oplog` / `--oplogReplay`: capture the oplog during the dump so the backup is consistent at one point in time (replica set).
- `--drop`: drops each collection before loading it back.
- `mongofiles`: puts files into and gets files out of GridFS from the command line.

## Example

Back up one database of a small deployment, then restore it (run in a shell, not in mongosh):

```text
mongodump --db=shop --out=/backup/2026-11-24
mongorestore --db=shop /backup/2026-11-24/shop
```

One file in GridFS is two kinds of documents:

```text
// fs.files: one document per file
{ _id: ObjectId("…"), filename: "promo.mp4", length: 314572800, chunkSize: 261120, uploadDate: ISODate("…") }
// fs.chunks: one document per chunk
{ _id: ObjectId("…"), files_id: ObjectId("…"), n: 0, data: BinData(0, "…") }
```

A 300 MB file with 255 KiB chunks is about 1,200 documents in `fs.chunks`, numbered `n` from 0.

## Common mistakes

Using `mongodump` for a large deployment:

```text
// WRONG: a nightly dump of 2 TB reads everything, restore rebuilds every index
mongodump --uri="mongodb://db1,db2,db3/?replicaSet=shop" --out=/backup/nightly
```

```text
// FIX: file system snapshots or a backup service with point-in-time restore
```

Putting a small file into GridFS:

```text
// WRONG: a 40 KB avatar split into chunks, cannot be replaced atomically
mongofiles --db=shop put avatar-c01.png
```

```text
// FIX: keep it in the customer document
{ _id: 1, name: "Customer 1", avatar: BinData(0, "…") }
```

Stuffing a large file into one document:

```text
// ERROR BSONObjectTooLarge: one document is at most 16 MiB
db.media.insertOne({ name: "promo.mp4", data: BinData(0, "<300 MB>") })
```

## Recap

- `mongodump`/`mongorestore` for small deployments; snapshots or a backup service for large ones.
- A backup is only trustworthy once you have tried restoring it.
- GridFS = `fs.files` (details) + `fs.chunks` (255 KiB chunks) for files over 16 MiB.
- A small file that must be replaced atomically: store `BinData` in the document, not GridFS.
