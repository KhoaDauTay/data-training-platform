/**
 * v47 S2 (L940–L949): text of the lazy `engineTrack` chunk (src/ui/engineTrack.ts): track facts, the level chooser, the "next"
 * buttons and the cross-links. Same rules as src/i18n/engine.ts (placeholders match, EN differs from VI; tests/i18n.test.ts).
 */
const vi = {
  'for': 'Dành cho',
  'for.postgres': 'Người đã viết được SELECT và muốn biết PostgreSQL lưu, tìm dữ liệu và cho nhiều người cùng ghi thế nào.',
  'for.mongodb': 'Người muốn làm việc với dữ liệu dạng tài liệu (JSON), từ truy vấn đến pipeline và index.',
  'for.dynamodb': 'Người thiết kế dữ liệu cho ứng dụng lớn theo khóa: mẫu truy cập trước, bảng sau.',
  'for.design': 'Người cần dựng lược đồ từ yêu cầu: mô hình ER, khóa, chuẩn hóa, giao dịch.',
  'for.stack': 'Người làm data: dữ liệu vào kho thế nào, dbt, Snowflake và BigQuery.',
  'for.redis': 'Người làm backend hoặc data muốn dùng Redis đúng chỗ: cache, phiên, bộ đếm, bảng xếp hạng, giới hạn tần suất.',
  'pre': 'Nên biết trước',
  'pre.none': 'không cần, bắt đầu từ đầu được',
  'pre.sql': 'SQL Phần {a}–{b}',
  'time': 'khoảng {h} giờ · {n} bài',
  'chooser': 'Bắt đầu ở cấp khác',
  'chooser.line': 'Đã biết phần đầu? Nhảy thẳng tới một cấp. Không bài nào bị đánh dấu là xong.',
  'chooser.btn': 'Đã biết {prev} → bắt đầu {lv}',
  'level.pre': 'Nên học trước',
  'next.go': 'Học tiếp: {title}',
  'next.level': 'Sang {lv}: {title}',
  'next.done': 'Xong cả khóa học · về trang {name}',
  'practice': 'Luyện thêm với SQL',
  'dive': 'Đào sâu trong PostgreSQL',
  'related': 'Học bài liên quan: {title}',
  'term.lesson': 'Học trong bài: {title}',
  'term.level': 'Học ở {lv}',
};
export type TrackKey = keyof typeof vi;

const en: Record<TrackKey, string> = {
  'for': 'For',
  'for.postgres': 'People who can write a SELECT and want to know how PostgreSQL stores and finds data and lets many people write at once.',
  'for.mongodb': 'People who want to work with document (JSON) data, from queries to pipelines and indexes.',
  'for.dynamodb': 'People who design data for large key-based apps: access patterns first, tables second.',
  'for.design': 'People who build a schema from requirements: ER models, keys, normalisation, transactions.',
  'for.stack': 'Data people: how data reaches the warehouse, dbt, Snowflake and BigQuery.',
  'for.redis': 'Backend or data people who want to use Redis in the right place: caches, sessions, counters, leaderboards, rate limits.',
  'pre': 'Know first',
  'pre.none': 'nothing, you can start from scratch',
  'pre.sql': 'SQL Parts {a}–{b}',
  'time': 'about {h} h · {n} lessons',
  'chooser': 'Start at another level',
  'chooser.line': 'Know the early part? Jump straight to a level. No lesson is marked done.',
  'chooser.btn': 'I know {prev} → start {lv}',
  'level.pre': 'Learn first',
  'next.go': 'Continue: {title}',
  'next.level': 'On to {lv}: {title}',
  'next.done': 'Course done · back to {name}',
  'practice': 'Practise with SQL',
  'dive': 'Go deeper in PostgreSQL',
  'related': 'Related lesson: {title}',
  'term.lesson': 'Learn it in: {title}',
  'term.level': 'Learn it in {lv}',
};

export const TRACK_DICT = { vi: vi as Record<TrackKey, string>, en };
