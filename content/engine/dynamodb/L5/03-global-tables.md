---
id: e-dy-l5-03
engine: dynamodb
level: L5
module: global-ops
title: "Global tables: MREC hay MRSC"
title_en: "Global tables: MREC or MRSC"
kind: concept
runtime: docs
minutes: 8
objectives:
  - { vi: "Phân biệt nhất quán cuối cùng đa vùng (MREC, mặc định) và nhất quán mạnh đa vùng (MRSC)", en: "Tell multi-Region eventual consistency (MREC, the default) from multi-Region strong consistency (MRSC)" }
  - { vi: "Biết cách MREC giải xung đột (last writer wins) và các giới hạn của MRSC", en: "Know how MREC resolves conflicts (last writer wins) and the limits of MRSC" }
requires: [e-dy-l4-11]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/V2globaltables_HowItWorks.html
quiz:
  - q: { vi: "Ứng dụng thanh toán chạy ở hai vùng, yêu cầu RPO bằng 0 và đọc mạnh ở vùng nào cũng thấy bản mới nhất. Chọn gì?", en: "A payments app runs in two Regions, needs an RPO of zero and strong reads that see the latest version in any Region. Which choice?" }
    options:
      - { vi: "MREC, vì là mặc định", en: "MREC, because it is the default" }
      - { vi: "MRSC: ba vùng (ba bản sao, hoặc hai bản sao và một witness), ghi chậm hơn", en: "MRSC: three Regions (three replicas, or two replicas and a witness), slower writes" }
      - { vi: "Một bảng một vùng và PITR", en: "A single-Region table with PITR" }
    answer: 1
    why: { vi: "MRSC đồng bộ mỗi lần ghi sang ít nhất một vùng khác trước khi trả về, cho RPO 0. Nó phải triển khai đúng ba vùng; hai bản sao cộng một witness là cách cho ứng dụng hai vùng.", en: "MRSC replicates each write to at least one other Region before returning, giving an RPO of zero. It must span exactly three Regions; two replicas plus a witness is the way for a two-Region app." }
  - q: { vi: "Bảng MREC: cùng một item bị sửa ở Singapore và Tokyo gần như cùng lúc. Kết quả cuối?", en: "An MREC table: the same item is changed in Singapore and Tokyo almost at once. The final result?" }
    options:
      - { vi: "Cả hai lần ghi bị từ chối", en: "Both writes are rejected" }
      - { vi: "Mọi bản sao hội tụ về lần ghi có dấu thời gian nội bộ muộn nhất (last writer wins)", en: "Every replica converges to the write with the latest internal timestamp (last writer wins)" }
      - { vi: "Hai phiên bản được giữ song song", en: "Both versions are kept side by side" }
    answer: 1
    why: { vi: "MREC giải xung đột theo từng item bằng last writer wins. MRSC thì khác: lần ghi va chạm bị từ chối với `ReplicatedWriteConflictException` và có thể thử lại.", en: "MREC resolves conflicts per item with last writer wins. MRSC differs: a colliding write is refused with `ReplicatedWriteConflictException` and can be retried." }
---

## Ý chính

**Global table** sao chép một bảng sang nhiều Region; mỗi Region giữ một bản sao (replica), đọc ghi được ở mọi bản sao. SLA 99,999 %, so với 99,99 % của bảng một vùng.

- **MREC** (mặc định): sao chép **bất đồng bộ**, thường dưới một giây. Xung đột trên cùng item giải bằng **last writer wins**. Đọc mạnh có thể thấy dữ liệu cũ nếu item vừa sửa ở vùng khác. RPO bằng độ trễ sao chép.
- **MRSC**: mỗi lần ghi đồng bộ sang ít nhất một vùng khác trước khi trả về; đọc mạnh ở mọi bản sao thấy bản mới nhất; **RPO bằng 0**. Phải đúng **ba** vùng (ba bản sao, hoặc hai bản sao và một witness). Không hỗ trợ TTL, LSI và giao dịch.
- Chế độ chọn lúc tạo, **không đổi được** sau đó.
- Giao dịch trên MREC chỉ nguyên khối trong Region gọi nó; vùng khác có thể thấy giao dịch xong một nửa.

Global table chỉ có trên AWS thật, nên bài này **chưa chạy được trong trình duyệt**.

## Ví dụ

```text
need                                   choose
low write latency, stale reads OK      MREC
RPO = 0, strong reads in every Region  MRSC (3 Regions, or 2 + witness)
uses TTL or transactions               MREC
```

# EN

## Key idea

A **global table** replicates a table across several Regions; each Region holds a replica, readable and writable everywhere. SLA 99.999%, against 99.99% for a single-Region table.

- **MREC** (default): **asynchronous** replication, usually under a second. Conflicts on the same item are resolved with **last writer wins**. A strong read may return stale data if the item was just changed in another Region. RPO equals the replication delay.
- **MRSC**: each write is replicated to at least one other Region before returning; strong reads on any replica see the latest version; **RPO of zero**. It must span exactly **three** Regions (three replicas, or two replicas and a witness). No TTL, no LSIs and no transactions.
- The mode is chosen at creation and **cannot be changed** afterwards.
- Transactions on MREC are atomic only in the Region that ran them; other Regions may see a half-applied transaction.

Global tables exist only on real AWS, so this lesson does not run in the browser yet.

## Example

```text
need                                   choose
low write latency, stale reads OK      MREC
RPO = 0, strong reads in every Region  MRSC (3 Regions, or 2 + witness)
uses TTL or transactions               MREC
```
