import type { Lang, Params } from './index';

/**
 * v26 (DynamoDB đủ, L380): text of the lazy `engineDynamo` chunk (src/ui/engineDynamo.ts), the "Partition / Chi phí" panel under
 * a DynamoDB run. Its own chunk so `engineNosql` stays small. Same rules as ENGINE_DICT (tests/i18n.test.ts): code spans VI = EN,
 * EN without diacritics. Every number the panel calls measured comes from the engine's ConsumedCapacity; the rest is labelled.
 */
const vi = {
  'title': 'Partition / Chi phí',
  'tag.measured': 'Đo thật',
  'tag.rule': 'Theo luật AWS',
  'tag.illus': 'Minh họa',
  'cap.none': 'Request này không trả `ConsumedCapacity` (lệnh quản trị như `CreateTable`), nên không có số đo.',
  'cap.total': 'Capacity tiêu thụ: {n} {unit}',
  'cap.split': 'Chia ra: bảng {table} · {idx}',
  'cap.idx': 'chỉ mục `{name}` {n}',
  'unit.read': 'đơn vị đọc (RCU)',
  'unit.write': 'đơn vị ghi (WCU)',
  'unit.cu': 'đơn vị',
  'mode.eventual': 'Đọc nhất quán cuối (eventually consistent): 0,5 RCU cho mỗi 4 KB.',
  'mode.strong': 'Đọc nhất quán mạnh (`ConsistentRead: true`): 1 RCU cho mỗi 4 KB.',
  'mode.tx': 'Transaction: gấp đôi, 2 RCU cho mỗi 4 KB khi đọc và 2 WCU cho mỗi 1 KB khi ghi.',
  'rule.write': 'Ghi: mỗi item làm tròn lên 1 KB (bản lớn hơn giữa trước và sau khi ghi), 1 WCU mỗi KB; trong transaction gấp đôi.',
  'rule.get': 'Đọc từng item (`GetItem`, `BatchGetItem`, transaction): mỗi item làm tròn lên 4 KB rồi mới cộng.',
  'rule.query': '`Query`/`Scan`: cộng cỡ mọi item đã đọc rồi làm tròn lên 4 KB một lần.',
  'calc.items': 'Theo luật: {n} item, tổng {b} byte → {r} RCU. Số đo: {m}.',
  'calc.filtered': 'Bộ lọc chạy sau khi đọc: phí tính trên {s} item đã đọc, không phải {n} item trả về, nên không tính lại được từ kết quả.',
  'page.more': 'Còn trang sau: kết quả có `LastEvaluatedKey`. Gửi lại request với `ExclusiveStartKey` bằng giá trị này để đọc tiếp.',
  'page.last': 'Không có `LastEvaluatedKey`: đây là trang cuối.',
  'part.title': 'Item theo partition key `{pk}`',
  'part.row': '{n} item · {b} byte',
  'part.note': 'Bộ máy trong trình duyệt không có partition vật lý. Trên DynamoDB thật, partition key được băm để chọn partition, và mỗi partition chịu tối đa 3.000 RCU và 1.000 WCU mỗi giây: một khóa quá nóng thì bị throttle.',
  'gap.title': 'Không đo được trong trình duyệt',
  'gap.list': 'Throttle và partition nóng; tách partition và adaptive capacity; độ trễ cập nhật GSI (ở đây GSI thấy item mới ngay); capacity của ghi có điều kiện bị từ chối và transaction bị hủy (chỉ có ước tính theo luật).',
  'gap.src': 'Các luật trên ghi theo tài liệu AWS, không đo trên DynamoDB thật.',
};
export type DyKey = keyof typeof vi;

const en: Record<DyKey, string> = {
  'title': 'Partition / Cost',
  'tag.measured': 'Measured',
  'tag.rule': 'AWS rule',
  'tag.illus': 'Illustration',
  'cap.none': 'This request returns no `ConsumedCapacity` (an admin call such as `CreateTable`), so there is no measured number.',
  'cap.total': 'Consumed capacity: {n} {unit}',
  'cap.split': 'Split: table {table} · {idx}',
  'cap.idx': 'index `{name}` {n}',
  'unit.read': 'read units (RCU)',
  'unit.write': 'write units (WCU)',
  'unit.cu': 'units',
  'mode.eventual': 'Eventually consistent read: 0.5 RCU per 4 KB.',
  'mode.strong': 'Strongly consistent read (`ConsistentRead: true`): 1 RCU per 4 KB.',
  'mode.tx': 'Transaction: double, 2 RCU per 4 KB for reads and 2 WCU per 1 KB for writes.',
  'rule.write': 'Writes: each item is rounded up to 1 KB (the larger of before and after the write), 1 WCU per KB; doubled in a transaction.',
  'rule.get': 'Item reads (`GetItem`, `BatchGetItem`, transactions): each item is rounded up to 4 KB, then added.',
  'rule.query': '`Query`/`Scan`: the sizes of every item read are added, then rounded up to 4 KB once.',
  'calc.items': 'By the rule: {n} items, {b} bytes in all → {r} RCU. Measured: {m}.',
  'calc.filtered': 'The filter runs after the read: the charge is for the {s} items read, not the {n} items returned, so it cannot be recomputed from the result.',
  'page.more': 'There is another page: the result has a `LastEvaluatedKey`. Send the request again with `ExclusiveStartKey` set to this value to read on.',
  'page.last': 'No `LastEvaluatedKey`: this is the last page.',
  'part.title': 'Items by partition key `{pk}`',
  'part.row': '{n} items · {b} bytes',
  'part.note': 'The in-browser engine has no physical partitions. On real DynamoDB the partition key is hashed to pick a partition, and each partition serves at most 3,000 RCU and 1,000 WCU per second: a key that is too hot gets throttled.',
  'gap.title': 'Not measurable in the browser',
  'gap.list': 'Throttling and hot partitions; partition splits and adaptive capacity; GSI propagation delay (here a GSI sees a new item at once); the capacity of a refused conditional write or a cancelled transaction (only a rule-based estimate).',
  'gap.src': 'The rules above follow the AWS docs and are not measured on real DynamoDB.',
};
export const DY_DICT = { vi: vi as Record<DyKey, string>, en };

export function dyText(lang: Lang, locale: string, key: DyKey, params: Params = {}): string {
  return DY_DICT[lang][key].replace(/\{(\w+)\}/g, (m, name: string) => {
    const v = params[name];
    return v === undefined ? m : typeof v === 'number' ? v.toLocaleString(locale) : v;
  });
}
