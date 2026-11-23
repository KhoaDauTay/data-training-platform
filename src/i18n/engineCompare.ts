import type { Lang, Params } from './index';

/**
 * v28 E-CMP (L430): text of the lazy `engineCompare` chunk (src/ui/engineCompare.ts), the "Which engine?" page
 * #/engine/compare. The page's content (axes, facts, scenarios) is src/engine/compare.ts. Same rules as ENGINE_DICT
 * (tests/i18n.test.ts): code spans VI = EN, EN without diacritics. Nothing on the page is scored or saved.
 */
const vi = {
  'title': 'Chọn engine nào?',
  'intro': 'Cùng một cửa hàng, ba engine: PostgreSQL, MongoDB và DynamoDB. Mỗi ô ghi rõ điều nó nói đã chạy thật trong trình duyệt hay chỉ lấy từ tài liệu.',
  'dataset': 'Mọi số đo trên trang chạy trong trình duyệt, trên một cửa hàng mẫu {n} đơn nạp giống nhau vào ba engine; một test chạy lại từng số trên cả ba runtime.',
  'legend': 'Nhãn',
  'tier.run': 'Chạy trong trình duyệt',
  'tier.diff': 'Chạy được, khác engine thật',
  'tier.docs': 'Theo tài liệu',
  'tier.run.line': 'trình chạy trong trình duyệt cho đúng hành vi của engine thật ở điểm này',
  'tier.diff.line': 'đáp số đúng, nhưng cơ chế khác engine thật; ô nói rõ khác ở đâu',
  'tier.docs.line': 'trình duyệt không có cơ chế này; nội dung lấy từ tài liệu chính thức',
  'summary': 'Nhãn từng ô',
  'axis': 'Trục',
  'axes': 'Chín trục',
  'evidence': 'Bằng chứng',
  'measured': 'Đo trong trình duyệt',
  'fromDocs': 'Tài liệu',
  'lessons': 'Bài liên quan',
  'sources': 'Nguồn',
  'newTab': 'mở trong tab mới',
  'quiz': 'Tình huống: chọn engine nào?',
  'quizIntro': 'Mười hai bài toán thật. Chọn một đáp án rồi bấm Kiểm tra; giải thích hiện khi bạn đúng, hoặc sau lần sai thứ hai. Không chấm điểm, không lưu.',
  'scenario': 'Tình huống {n}',
  'check': 'Kiểm tra',
  'right': 'Đúng.',
  'wrong': 'Chưa đúng, thử lại một lần.',
  'wrongWhy': 'Chưa đúng. Đọc giải thích bên dưới.',
  'pick': 'Chọn một đáp án trước.',
  'score': 'Đã đúng {k}/{n} tình huống',
  'bridge': 'Từ lộ trình SQL',
  'bridgeLine': 'Kỹ năng SQL bạn học ở lộ trình dùng được ở cả ba engine, nhưng mỗi engine làm việc đó theo cách riêng. Trang kỹ năng có chip "Đào sâu" dẫn sang bài Engine tương ứng.',
  'back': 'Quay lại lộ trình SQL',
  'rowLine': 'Chín trục và mười hai tình huống, mỗi số đo ghi rõ nguồn',
  'open': 'Mở',
};
export type CmpKey = keyof typeof vi;

const en: Record<CmpKey, string> = {
  'title': 'Which engine?',
  'intro': 'One shop, three engines: PostgreSQL, MongoDB and DynamoDB. Each cell says whether what it claims really ran in the browser or comes from the docs only.',
  'dataset': 'Every figure on this page ran in the browser, on a sample shop of {n} orders loaded the same way into all three engines; a test reruns each figure on all three runtimes.',
  'legend': 'Labels',
  'tier.run': 'Runs in the browser',
  'tier.diff': 'Runs, differs from the real engine',
  'tier.docs': 'From the docs',
  'tier.run.line': 'the in-browser runtime behaves like the real engine on this point',
  'tier.diff.line': 'the answer is right, but the mechanism differs from the real engine; the cell says where',
  'tier.docs.line': 'the browser has no such mechanism; the content comes from the official docs',
  'summary': 'Label of each cell',
  'axis': 'Axis',
  'axes': 'Nine axes',
  'evidence': 'Evidence',
  'measured': 'Measured in the browser',
  'fromDocs': 'Docs',
  'lessons': 'Related lessons',
  'sources': 'Sources',
  'newTab': 'opens in a new tab',
  'quiz': 'Scenarios: which engine?',
  'quizIntro': 'Twelve real problems. Pick an answer and press Check; the explanation shows once you are right, or after a second wrong try. Nothing is scored or saved.',
  'scenario': 'Scenario {n}',
  'check': 'Check',
  'right': 'Right.',
  'wrong': 'Not yet, try once more.',
  'wrongWhy': 'Not right. Read the explanation below.',
  'pick': 'Pick an answer first.',
  'score': '{k}/{n} scenarios right',
  'bridge': 'From the SQL path',
  'bridgeLine': 'The SQL skills from the learning path work on all three engines, but each engine does the job its own way. Skill pages carry "Go deeper" chips that lead to the matching Engine lessons.',
  'back': 'Back to the SQL path',
  'rowLine': 'Nine axes and twelve scenarios, every figure with its source',
  'open': 'Open',
};
export const CMP_DICT = { vi: vi as Record<CmpKey, string>, en };

export function cmpText(lang: Lang, locale: string, key: CmpKey, params: Params = {}): string {
  return CMP_DICT[lang][key].replace(/\{(\w+)\}/g, (m, name: string) => {
    const v = params[name];
    return v === undefined ? m : typeof v === 'number' ? v.toLocaleString(locale) : v;
  });
}
