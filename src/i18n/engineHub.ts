import type { Lang } from './index';

/**
 * v47 S1 (L902): text of the lazy `engineHub` chunk (src/ui/engineHub.ts): the #/engine landing page's three groups and the
 * sidebar's group names. Same rules as src/i18n/engine.ts (placeholders match, EN differs from VI; tests/i18n.test.ts).
 */
const vi = {
  'intro': 'Nhìn vào bên trong cơ sở dữ liệu: dữ liệu nằm ở đâu, tìm bằng cách nào, nhiều người cùng ghi thì sao. Chọn một khóa rồi đi theo cấp, từ Nhập môn trở lên; mỗi bài ghi bài nên học trước, không cần học hết SQL mới vào.',
  'courses': 'Khóa học',
  'courses.line': 'Mỗi khóa là một thang cấp L1, L2, L3…; lab chạy thật trong trình duyệt.',
  'topics': 'Chuyên đề',
  'topics.line': 'Lộ trình, kệ bài và bản đồ chủ đề đi ngang các khóa: học khi cần.',
  'ref': 'Tham khảo',
  'ref.line': 'Tra nhanh khi đang học: thói quen tốt, thuật ngữ, so sánh các CSDL.',
  'topic.side': 'Nhiều khách hàng',
};
export type HubKey = keyof typeof vi;

const en: Record<HubKey, string> = {
  'intro': 'Look inside the database: where data lives, how it is found, what happens when many people write at once. Pick a course and climb its levels from Intro up; each lesson lists what to learn before it, and you do not need to finish SQL first.',
  'courses': 'Courses',
  'courses.line': 'Each course is a ladder of levels L1, L2, L3…; the labs run for real in your browser.',
  'topics': 'Special topics',
  'topics.line': 'Paths, shelves and topic maps that cut across the courses: take them when you need them.',
  'ref': 'Reference',
  'ref.line': 'Quick lookups while you learn: good habits, terms, how the databases compare.',
  'topic.side': 'Multi-tenant',
};

export const HUB_DICT = { vi: vi as Record<HubKey, string>, en };
