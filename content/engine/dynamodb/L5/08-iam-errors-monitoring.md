---
id: e-dy-l5-08
engine: dynamodb
level: L5
module: global-ops
title: "IAM, lỗi, giám sát và xóa bảng"
title_en: "IAM, errors, monitoring and deleting a table"
kind: concept
runtime: docs
docs_why: server
minutes: 10
objectives:
  - { vi: "Giới hạn một người dùng vào đúng item của họ bằng điều kiện IAM `dynamodb:LeadingKeys`", en: "Limit a user to their own items with the IAM condition `dynamodb:LeadingKeys`" }
  - { vi: "Chia lỗi DynamoDB thành lỗi nên thử lại (throttle, 5xx) và lỗi phải sửa request, và thử lại có backoff", en: "Split DynamoDB errors into ones to retry (throttling, 5xx) and ones that need a fixed request, and retry with backoff" }
  - { vi: "Biết số liệu CloudWatch và Contributor Insights nào cho thấy throttle và khóa nóng", en: "Know which CloudWatch metrics and Contributor Insights reports show throttling and hot keys" }
  - { vi: "Xóa bảng an toàn: deletion protection, backup và những gì mất theo bảng", en: "Delete a table safely: deletion protection, backups and what goes with the table" }
requires: [e-dy-l5-04]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/specifying-conditions.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Programming.Errors.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/metrics-dimensions.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/contributorinsights_HowItWorks.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithTables.Basics.html
quiz:
  - q: { vi: "Ứng dụng di động cho mỗi người dùng đọc thẳng bảng `Orders` (partition key = mã người dùng). Làm sao để người A không đọc được đơn của người B?", en: "A mobile app lets each user read the `Orders` table directly (partition key = user id). How do you stop user A from reading user B's orders?" }
    options:
      - { vi: "Kiểm trong ứng dụng trước khi gửi request", en: "Check in the app before sending the request" }
      - { vi: "Chính sách IAM có điều kiện `dynamodb:LeadingKeys` bằng mã người dùng của người gọi", en: "An IAM policy with the condition `dynamodb:LeadingKeys` equal to the caller's user id" }
      - { vi: "Thêm một GSI theo mã người dùng", en: "Add a GSI on the user id" }
    answer: 1
    why: { vi: "Kiểm trong ứng dụng nghe đủ, nhưng ai có thông tin đăng nhập cũng gửi được request khác. `dynamodb:LeadingKeys` để chính DynamoDB từ chối mọi item có partition key khác giá trị gắn với người gọi. GSI không giới hạn quyền.", en: "Checking in the app sounds enough, but anyone holding the credentials can send a different request. `dynamodb:LeadingKeys` makes DynamoDB itself refuse every item whose partition key differs from the value tied to the caller. A GSI does not limit access." }
  - q: { vi: "Lỗi nào nên tự động thử lại với backoff tăng dần?", en: "Which error should be retried automatically with growing backoff?" }
    options:
      - { vi: "`ValidationException`", en: "`ValidationException`" }
      - { vi: "`ProvisionedThroughputExceededException` và lỗi 5xx", en: "`ProvisionedThroughputExceededException` and 5xx errors" }
      - { vi: "`ConditionalCheckFailedException`", en: "`ConditionalCheckFailedException`" }
    answer: 1
    why: { vi: "Throttle và lỗi phía máy chủ là tạm thời: chờ rồi gửi lại thường thành công, và SDK của AWS đã tự làm việc này. Request sai cú pháp hay điều kiện sai thì gửi lại bao nhiêu lần cũng vậy: phải sửa request hoặc đọc lại dữ liệu.", en: "Throttling and server-side errors are temporary: waiting and sending again usually works, and the AWS SDKs already do it. A malformed request or a false condition stays the same however often you resend it: fix the request or read the data again." }
  - q: { vi: "Bảng `Orders` bật deletion protection. Ai đó gọi `DeleteTable`. Chuyện gì xảy ra?", en: "Table `Orders` has deletion protection on. Someone calls `DeleteTable`. What happens?" }
    options:
      - { vi: "Bảng bị xóa, nhưng có backup tự động", en: "The table is deleted, but an automatic backup exists" }
      - { vi: "Request bị từ chối cho tới khi có người tắt deletion protection", en: "The request is refused until someone turns deletion protection off" }
      - { vi: "Chỉ GSI bị xóa", en: "Only the GSIs are deleted" }
    answer: 1
    why: { vi: "Deletion protection chặn chính lệnh xóa: phải tắt nó bằng `UpdateTable` trước, nên một lệnh xóa nhầm không đi qua được. Backup là lớp bảo vệ thứ hai, cho dữ liệu chứ không cho bảng đang chạy.", en: "Deletion protection blocks the delete call itself: it must be turned off with `UpdateTable` first, so a mistaken delete cannot get through. Backups are a second layer, for the data rather than the live table." }
---

## Ý chính

Bốn việc vận hành mà bộ máy trong trình duyệt không chạy được, vì chúng cần tài khoản AWS thật:

- **Quyền (IAM)**: chính sách IAM cho phép hay cấm từng thao tác (`dynamodb:GetItem`, `dynamodb:Query`…) trên từng bảng và index. Điều kiện `dynamodb:LeadingKeys` giới hạn người gọi vào các item có partition key bằng một giá trị gắn với danh tính của họ; `dynamodb:Attributes` giới hạn thuộc tính được đọc hay ghi. Cho quyền ít nhất đủ dùng (thẻ Best Practice d26).
- **Lỗi**: lỗi 4xx thường do request (`ValidationException`, `ConditionalCheckFailedException`, `ResourceNotFoundException`) thì sửa request, đừng gửi lại y nguyên. Throttle (`ProvisionedThroughputExceededException`, `ThrottlingException`) và lỗi 5xx là tạm thời: thử lại với backoff tăng dần và một chút ngẫu nhiên. SDK của AWS đã tự thử lại; `UnprocessedItems` của lệnh theo lô cũng phải gửi lại theo cách đó.
- **Giám sát**: CloudWatch có số liệu theo bảng và index như capacity đã tiêu (`ConsumedReadCapacityUnits`, `ConsumedWriteCapacityUnits`), số lần throttle (`ReadThrottleEvents`, `WriteThrottleEvents`, `ThrottledRequests`) và `SystemErrors`. Đặt alarm trên throttle. **Contributor Insights** liệt kê các khóa được truy cập và bị throttle nhiều nhất: cách tìm khóa nóng. CloudTrail ghi lại ai đã gọi API nào.
- **Xóa bảng**: `DeleteTable` xóa bảng cùng mọi item và index, không hoàn tác. Bật **deletion protection** (`DeletionProtectionEnabled`) để lệnh xóa bị từ chối cho tới khi có người tắt nó. Backup theo yêu cầu vẫn còn sau khi xóa bảng; bảng có PITR thì DynamoDB giữ thêm một bản backup hệ thống.

## Ví dụ

Một chính sách chỉ cho người gọi đọc item mang mã người dùng của chính họ (rút gọn):

```text
"Action": ["dynamodb:GetItem", "dynamodb:Query"],
"Condition": {"ForAllValues:StringEquals": {"dynamodb:LeadingKeys": ["${www.amazon.com:user_id}"]}}
```

Thử lại có backoff: chờ 50 ms, rồi 100, 200, 400… (cộng một khoảng ngẫu nhiên), dừng sau vài lần và báo lỗi lên trên.

## Thực hành

Không có lab: IAM, CloudWatch, Contributor Insights và deletion protection chỉ có trên AWS. Hai bài liên quan chạy được ở đây: bài ghi có điều kiện (L2/04) cho thấy `ConditionalCheckFailedException`, và bảng "Partition / Chi phí" dưới mỗi lab ghi rõ throttle là thứ không đo được trong trình duyệt.

# EN

## Key idea

Four operations jobs that the in-browser engine cannot run, because they need a real AWS account:

- **Permissions (IAM)**: an IAM policy allows or denies each action (`dynamodb:GetItem`, `dynamodb:Query`…) on each table and index. The condition `dynamodb:LeadingKeys` limits callers to items whose partition key equals a value tied to their identity; `dynamodb:Attributes` limits which attributes may be read or written. Grant the least that works (Best Practice card d26).
- **Errors**: 4xx errors usually come from the request (`ValidationException`, `ConditionalCheckFailedException`, `ResourceNotFoundException`): fix the request, do not resend it unchanged. Throttling (`ProvisionedThroughputExceededException`, `ThrottlingException`) and 5xx errors are temporary: retry with growing backoff plus a little randomness. The AWS SDKs already retry; the `UnprocessedItems` of a batch call must be resent the same way.
- **Monitoring**: CloudWatch has per-table and per-index metrics such as capacity consumed (`ConsumedReadCapacityUnits`, `ConsumedWriteCapacityUnits`), throttles (`ReadThrottleEvents`, `WriteThrottleEvents`, `ThrottledRequests`) and `SystemErrors`. Set alarms on throttling. **Contributor Insights** lists the most accessed and most throttled keys: the way to find a hot key. CloudTrail records who called which API.
- **Deleting a table**: `DeleteTable` removes the table with every item and index, with no undo. Turn on **deletion protection** (`DeletionProtectionEnabled`) so the delete call is refused until someone turns it off. On-demand backups survive the table's deletion; for a table with PITR, DynamoDB also keeps a system backup.

## Example

A policy that lets callers read only the items carrying their own user id (shortened):

```text
"Action": ["dynamodb:GetItem", "dynamodb:Query"],
"Condition": {"ForAllValues:StringEquals": {"dynamodb:LeadingKeys": ["${www.amazon.com:user_id}"]}}
```

Retry with backoff: wait 50 ms, then 100, 200, 400… (plus a random amount), stop after a few tries and report the error upward.

## Practice

There is no lab: IAM, CloudWatch, Contributor Insights and deletion protection exist only on AWS. Two related lessons run here: the conditional write lesson (L2/04) shows `ConditionalCheckFailedException`, and the "Partition / Cost" panel under every lab says plainly that throttling cannot be measured in the browser.
