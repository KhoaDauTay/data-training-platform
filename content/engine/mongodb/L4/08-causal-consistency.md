---
id: e-mg-l4-08
engine: mongodb
level: L4
module: consistency
title: "Nhất quán nhân quả và session"
title_en: "Causal consistency and sessions"
figures: [{ name: mg-causal-session, at: idea }]
kind: concept
minutes: 12
runtime: docs
objectives:
  - vi: "Kể bốn bảo đảm của session nhất quán nhân quả"
    en: "Name the four guarantees of a causally consistent session"
  - vi: "Biết bảo đảm chỉ có khi đọc `majority` và ghi `majority`"
    en: "Know the guarantees hold only with `majority` reads and `majority` writes"
  - vi: "Nhận ra lần đọc secondary cũ ngoài session và cách sửa"
    en: "Spot a stale secondary read outside a session and how to fix it"
requires: [e-mg-l4-07]
sources:
  - https://www.mongodb.com/docs/manual/core/read-isolation-consistency-recency/
  - https://www.mongodb.com/docs/manual/core/causal-consistency-read-write-concerns/
  - https://www.mongodb.com/docs/manual/reference/write-concern/
quiz:
  - q:
      vi: "Trong session nhất quán nhân quả, bạn ghi `w: \"majority\"` rồi đọc từ secondary với read concern `majority`. Lần đọc thấy gì?"
      en: "In a causally consistent session you write with `w: \"majority\"` and then read from a secondary with read concern `majority`. What does the read see?"
    options:
      - { vi: "Có thể chưa thấy lần ghi, vì secondary chép không đồng bộ", en: "It may not see the write yet, because secondaries replicate asynchronously" }
      - { vi: "Thấy trạng thái sau lần ghi: secondary chờ tới khi dữ liệu của nó đạt thời điểm đó", en: "It sees the state after the write: the secondary waits until its data reaches that time" }
    answer: 1
    trap: 0
    why:
      vi: "Secondary đúng là chép không đồng bộ, nên ngoài session câu đầu đúng. Nhưng trong session, driver gắn cho lần đọc `afterClusterTime` = thời điểm của lần ghi vừa xong; secondary chỉ trả lời khi dữ liệu của nó đã chép tới thời điểm đó. Lần đọc có thể chờ một chút, nhưng không trả trạng thái trước lần ghi."
      en: "Secondaries do replicate asynchronously, so outside a session the first option would be right. But inside the session the driver gives the read `afterClusterTime` = the time of the write that just finished; the secondary answers only once its data has replicated up to that time. The read may wait a little, but it never returns the state from before the write."
  - q:
      vi: "Session nhất quán nhân quả nhưng ghi bằng `w: 1` và đọc `local`. Bốn bảo đảm có còn chắc chắn không?"
      en: "A causally consistent session, but writes use `w: 1` and reads use `local`. Are the four guarantees still certain?"
    options:
      - { vi: "Có, session là đủ", en: "Yes, the session is enough" }
      - { vi: "Không, chỉ đọc `majority` và ghi `majority` mới được bảo đảm", en: "No, only `majority` reads and `majority` writes are guaranteed" }
    answer: 1
    trap: 0
    why:
      vi: "Session mang thời điểm nên nghe như đủ, nhưng thời điểm đó có thể trỏ vào dữ liệu không bền. Lần ghi `w: 1` chỉ nằm trên primary; nếu primary sập, lần ghi bị rollback, và lần đọc `local` trước đó đã thấy một trạng thái không còn tồn tại, nên \"đọc được điều mình ghi\" và \"đọc đơn điệu\" đều gãy. Docs chính thức: session chỉ bảo đảm nhân quả khi đọc read concern `majority` và ghi write concern `majority`, vì chỉ dữ liệu đa số đã xác nhận mới không bị rollback."
      en: "The session carries the timestamps, so it sounds like enough, but those timestamps can point at data that is not durable. A `w: 1` write lives only on the primary; if the primary fails the write is rolled back, and a `local` read made earlier saw a state that no longer exists, so \"read your writes\" and \"monotonic reads\" both break. The docs: sessions guarantee causality only with read concern `majority` and write concern `majority`, because only data a majority acknowledged cannot be rolled back."
---
## Mở bài

Khách đổi địa chỉ giao hàng, bấm lưu, rồi trang tải lại vẫn hiện địa chỉ cũ. Lần ghi đã vào primary, nhưng lần đọc đi tới một secondary chưa chép kịp. Session nhất quán nhân quả là cách MongoDB giữ thứ tự "ghi rồi mới đọc".

## Ý chính

Secondary áp oplog không đồng bộ, nên đọc từ secondary có thể cũ (nhưng không bao giờ sai thứ tự). Session nhất quán nhân quả giữ thứ tự giữa các thao tác có quan hệ nhân quả, kể cả khi chúng chạy trên các thành viên khác nhau. Bốn bảo đảm: đọc được điều mình ghi; đọc đơn điệu (lần đọc sau không cũ hơn lần đọc trước); ghi đơn điệu (lần ghi phải đi trước thì chạy trước); ghi theo đọc (lần ghi sau một lần đọc chạy trên trạng thái đã gồm lần đọc đó).

Cơ chế: mỗi thao tác trả về operation time và cluster time; session giữ chúng, và driver đặt `afterClusterTime` cho lần đọc kế. Node chỉ trả lời khi dữ liệu của nó đã tới thời điểm đó, nên lần đọc có thể phải chờ.

Nhiều người nghĩ mở session là đủ. Thật ra bảo đảm chỉ có cho đọc read concern `majority` và ghi write concern `majority`; với `w: 1` hay đọc `local`, một rollback có thể xóa mất mắt xích. Session cũng không cô lập khỏi thao tác ngoài session, và mỗi lúc chỉ một luồng nên dùng nó. Từ 8.0, `w: "majority"` xác nhận khi đa số đã ghi bền mục oplog, trước khi áp vào dữ liệu, nên đọc secondary ngay sau đó ngoài session càng dễ chưa thấy lần ghi.

Bài này cần replica set thật; các lệnh dưới đây lấy theo docs, không chạy trong trình duyệt.

Hình dưới đặt lần ghi và lần đọc lại cạnh nhau, ngoài session rồi trong session.

## Cú pháp

```text
session = db.getMongo().startSession({ causalConsistency: true })
coll = session.getDatabase("<db>").<coll>
coll.updateOne(<filter>, <update>, { writeConcern: { w: "majority" } })
coll.find(<filter>).readConcern("majority").readPref("secondary")
```

- `causalConsistency: true`: session mang thời điểm từ thao tác này sang thao tác kế.
- Ghi `w: "majority"` và đọc `readConcern("majority")`: điều kiện để có bốn bảo đảm.
- `readPref("secondary")` vẫn đọc được điều mình vừa ghi, vì node chờ tới thời điểm của session.

## Ví dụ

Đổi địa chỉ, rồi đọc lại từ secondary trong cùng session:

```text
s = db.getMongo().startSession({ causalConsistency: true })
users = s.getDatabase("shop").users
users.updateOne({ _id: 1 }, { $set: { city: "Hue" } }, { writeConcern: { w: "majority" } })
users.find({ _id: 1 }).readConcern("majority").readPref("secondary")
```

Lần đọc mang `afterClusterTime`; nó trả `city: "Hue"`, có thể sau một chút chờ.

Hai lần đọc nối tiếp trong session không đi lùi:

```text
users.find({ _id: 1 }).readConcern("majority").readPref("secondary")   // node A
users.find({ _id: 1 }).readConcern("majority").readPref("secondary")   // node B, never older than A
```

Đó là đọc đơn điệu: node B chờ nếu nó chậm hơn node A.

## Lỗi hay gặp

Ghi rồi đọc secondary ngoài session:

```text
// WRONG: no session, the secondary may not have the write yet
db.users.updateOne({ _id: 1 }, { $set: { city: "Hue" } })
db.users.find({ _id: 1 }).readPref("secondary")
```

```text
// FIX: one causally consistent session, majority on both sides
users.updateOne({ _id: 1 }, { $set: { city: "Hue" } }, { writeConcern: { w: "majority" } })
users.find({ _id: 1 }).readConcern("majority").readPref("secondary")
```

Có session nhưng đòi quá ít:

```text
// WRONG: session with w: 1 and local reads, the guarantees are not certain
users.updateOne({ _id: 1 }, { $set: { city: "Hue" } }, { writeConcern: { w: 1 } })
```

```text
// FIX: majority write, majority read
users.updateOne({ _id: 1 }, { $set: { city: "Hue" } }, { writeConcern: { w: "majority" } })
```

## Tóm tắt

- Đọc secondary có thể cũ; session nhân quả giữ thứ tự ghi rồi đọc.
- Bốn bảo đảm: đọc điều mình ghi, đọc đơn điệu, ghi đơn điệu, ghi theo đọc.
- Chỉ chắc chắn khi ghi `w: "majority"` và đọc `majority`.
- Driver gắn `afterClusterTime`; node chậm sẽ chờ thay vì trả dữ liệu cũ.

# EN

## Opening

A customer changes their delivery address, clicks save, and the reloaded page still shows the old one. The write reached the primary, but the read went to a secondary that had not caught up. A causally consistent session is how MongoDB keeps "write, then read" in order.

## Key idea

Secondaries apply the oplog asynchronously, so a read from a secondary can be stale (but never out of order). A causally consistent session keeps the order between causally related operations, even when they run on different members. The four guarantees: read your writes; monotonic reads (a later read is not older than an earlier one); monotonic writes (a write that must come first runs first); writes follow reads (a write after a read runs on a state that includes that read).

The mechanism: each operation returns an operation time and a cluster time; the session keeps them, and the driver sets `afterClusterTime` on the next read. A node answers only once its data has reached that time, so the read may have to wait.

Many people think opening a session is enough. In fact the guarantees hold only for reads with read concern `majority` and writes with write concern `majority`; with `w: 1` or `local` reads, a rollback can remove a link of the chain. A session is also not isolated from operations outside it, and only one thread at a time should use it. From 8.0, `w: "majority"` acknowledges once a majority has durably written the oplog entry, before applying it to the data, so a secondary read right after, outside a session, is even more likely to miss the write.

This lesson needs a real replica set; the commands below follow the docs and do not run in the browser.

The figure below sets the write and the read-back side by side, outside a session and then inside one.

## Syntax

```text
session = db.getMongo().startSession({ causalConsistency: true })
coll = session.getDatabase("<db>").<coll>
coll.updateOne(<filter>, <update>, { writeConcern: { w: "majority" } })
coll.find(<filter>).readConcern("majority").readPref("secondary")
```

- `causalConsistency: true`: the session carries timestamps from one operation to the next.
- A `w: "majority"` write and a `readConcern("majority")` read: the condition for the four guarantees.
- `readPref("secondary")` still reads your own write, because the node waits for the session's time.

## Example

Change the address, then read it back from a secondary in the same session:

```text
s = db.getMongo().startSession({ causalConsistency: true })
users = s.getDatabase("shop").users
users.updateOne({ _id: 1 }, { $set: { city: "Hue" } }, { writeConcern: { w: "majority" } })
users.find({ _id: 1 }).readConcern("majority").readPref("secondary")
```

The read carries `afterClusterTime`; it returns `city: "Hue"`, possibly after a short wait.

Two reads in a row in the session never go backwards:

```text
users.find({ _id: 1 }).readConcern("majority").readPref("secondary")   // node A
users.find({ _id: 1 }).readConcern("majority").readPref("secondary")   // node B, never older than A
```

That is monotonic reads: node B waits if it is behind node A.

## Common mistakes

Writing, then reading a secondary outside a session:

```text
// WRONG: no session, the secondary may not have the write yet
db.users.updateOne({ _id: 1 }, { $set: { city: "Hue" } })
db.users.find({ _id: 1 }).readPref("secondary")
```

```text
// FIX: one causally consistent session, majority on both sides
users.updateOne({ _id: 1 }, { $set: { city: "Hue" } }, { writeConcern: { w: "majority" } })
users.find({ _id: 1 }).readConcern("majority").readPref("secondary")
```

A session that asks for too little:

```text
// WRONG: session with w: 1 and local reads, the guarantees are not certain
users.updateOne({ _id: 1 }, { $set: { city: "Hue" } }, { writeConcern: { w: 1 } })
```

```text
// FIX: majority write, majority read
users.updateOne({ _id: 1 }, { $set: { city: "Hue" } }, { writeConcern: { w: "majority" } })
```

## Recap

- A secondary read can be stale; a causal session keeps write-then-read in order.
- Four guarantees: read your writes, monotonic reads, monotonic writes, writes follow reads.
- They are certain only with `w: "majority"` writes and `majority` reads.
- The driver attaches `afterClusterTime`; a lagging node waits instead of returning old data.
