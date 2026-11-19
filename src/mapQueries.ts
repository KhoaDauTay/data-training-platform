// V22-A (L204): the data questions behind each point of the Map page (map-research.md option A). Pure; imported only by the
// lazy `mapTeach` chunk and by tests/mapQueries.test.ts (every sample runs on its domain, reads only the tables it lists, which
// its chapter has opened, is understood by the map, and equals no story, lane or KPI Solution: L25).
import type { DomainId } from './domains';

type Words = { vi: string; en: string };
export interface MapQuestion {
  id: string;
  /** Places (port code, city, branch name) a story hook sits on: asked there only once review `after` is passed (D-M5, L200). */
  at?: string[];
  after?: number;
  /** Every table `sql` reads; all must be unlocked. */
  tables: string[];
  /** A runnable sample, deliberately "not quite enough": the follow-up says what to change. Never a Solution. */
  sql: string;
  /** `{p}` = the picked place's name. */
  q: Words;
  next: Words;
}

const LATE = "SELECT city, round(100.0 * count(*) FILTER (WHERE delivered_on > promised_on) / count(*), 1) AS late_pct\nFROM deliveries\nGROUP BY city";

export const MAP_QUESTIONS: Record<DomainId, MapQuestion[]> = {
  logistics: [
    {
      id: 'l-count', tables: ['shipments'],
      sql: "SELECT pod, count(*) AS shipments\nFROM shipments\nWHERE pol = 'VNDAD'\nGROUP BY pod",
      q: { vi: 'Bao nhiêu lô hàng đi từ Tiên Sa tới {p}? Cảng nào nhận nhiều nhất?', en: 'How many shipments go from Tien Sa to {p}? Which port gets the most?' },
      next: { vi: 'Bỏ điều kiện cảng đi để xem cả công ty, hoặc chỉ giữ hàng đi đường biển: bản đồ đổi thế nào?', en: 'Drop the port-of-loading condition to see the whole company, or keep sea freight only: how does the map change?' },
    },
    {
      id: 'l-days', tables: ['shipments'],
      sql: "SELECT pod, round(avg(eta - etd), 1) AS avg_days\nFROM shipments\nWHERE pol = 'VNDAD' AND mode = 'SEA'\nGROUP BY pod",
      q: { vi: 'Đi biển từ Tiên Sa tới {p} mất bao nhiêu ngày, từ ngày tàu chạy tới ngày dự kiến đến?', en: 'By sea from Tien Sa, how many days does it take to reach {p}, from departure to the expected arrival?' },
      next: { vi: 'Cảng xa nhất có phải cảng nhiều lô nhất không? Thêm cột đếm số lô rồi đổi số đo ở ô chọn.', en: 'Is the farthest port also the busiest? Add a shipment count and switch the measure in the picker.' },
    },
    {
      id: 'l-pairs', tables: ['shipments'],
      sql: "SELECT pol, pod, count(*) AS shipments\nFROM shipments\nWHERE mode = 'SEA'\nGROUP BY pol, pod",
      q: { vi: 'Cặp cảng đi và cảng đến nào bận nhất? {p} nằm trên những tuyến nào?', en: 'Which pairs of loading and discharge ports are the busiest? Which lanes touch {p}?' },
      next: { vi: 'Nhiều đường quá? Chỉ giữ những cặp có trên 300 lô (điều kiện đặt sau khi gom nhóm).', en: 'Too many lines? Keep only the pairs with more than 300 shipments (a condition applied after grouping).' },
    },
    {
      id: 'l-gri', at: ['NLRTM', 'DEHAM', 'BEANR'], after: 7, tables: ['rate_contracts'],
      sql: "SELECT pod,\n  round(avg(buy_usd) FILTER (WHERE valid_from < '2026-07-15')) AS before_usd,\n  round(avg(buy_usd) FILTER (WHERE valid_from >= '2026-07-15')) AS after_usd\nFROM rate_contracts\nWHERE pol = 'VNDAD' AND container_type = '40HC'\nGROUP BY pod",
      q: { vi: 'Giá mua một container 40HC từ Tiên Sa tới {p} trước và sau 15/07/2026 khác nhau thế nào?', en: 'How does the buy rate of a 40HC container from Tien Sa to {p} differ before and after 15 Jul 2026?' },
      next: { vi: 'Thêm một cột phần trăm thay đổi để bản đồ tô màu theo mức tăng: châu Âu có khác châu Á không?', en: 'Add a percentage-change column so the map colours by the rise: does Europe differ from Asia?' },
    },
  ],
  ecommerce: [
    {
      id: 'e-cust', tables: ['customers'],
      sql: 'SELECT city, count(*) AS customers\nFROM customers\nGROUP BY city',
      q: { vi: 'Chợ Lồng Đèn có bao nhiêu khách ở {p}? Thành phố nào đông khách nhất?', en: 'How many Lantern Market customers live in {p}? Which city has the most?' },
      next: { vi: 'Chỉ đếm khách đăng ký năm 2026: thứ tự các thành phố có đổi không?', en: 'Count only customers who signed up in 2026: does the order of the cities change?' },
    },
    {
      id: 'e-late', tables: ['deliveries'], sql: LATE,
      q: { vi: 'Bao nhiêu phần trăm đơn giao tới {p} đến trễ hơn ngày hẹn?', en: 'What share of the orders delivered to {p} arrived after the promised date?' },
      next: { vi: 'Đơn còn đang giao (chưa có ngày giao) có bị tính là trễ không? Thử đếm riêng chúng.', en: 'Are orders still on the way (no delivery date yet) counted as late? Try counting them separately.' },
    },
    {
      id: 'e-kite', at: ['Hue', 'Nha Trang', 'Da Nang'], after: 4, tables: ['deliveries'], sql: LATE,
      q: { vi: 'Khách ở {p} than giao chậm từ tháng 9. Tỉ lệ trễ theo thành phố có cho thấy điều đó không?', en: 'Customers in {p} complain about slow deliveries since September. Does the late rate by city show it?' },
      next: { vi: 'Gộp chung thì gần như đều. Chỉ xét một hãng giao hàng, với đơn gửi từ 01/09/2026: thành phố nào lên bậc cao nhất?', en: 'All together it looks flat. Look at one courier only, for orders shipped from 1 Sep 2026: which cities jump to the top step?' },
    },
  ],
  finance: [
    {
      id: 'f-loans', tables: ['loans', 'branches'],
      sql: 'SELECT b.name, count(*) AS loans\nFROM loans l\nJOIN branches b ON b.id = l.branch_id\nGROUP BY b.name',
      q: { vi: 'Chi nhánh {p} đã giải ngân bao nhiêu khoản vay? Chi nhánh nào nhiều nhất?', en: 'How many loans has the {p} branch disbursed? Which branch has the most?' },
      next: { vi: 'Đổi số đếm thành tổng tiền gốc: chi nhánh đứng đầu có đổi không?', en: 'Swap the count for the total principal: does the top branch change?' },
    },
    {
      id: 'f-approve', tables: ['applications', 'branches'],
      sql: "SELECT b.name, round(100.0 * count(*) FILTER (WHERE a.decision = 'approved') / count(*), 1) AS approved_pct\nFROM applications a\nJOIN branches b ON b.id = a.branch_id\nGROUP BY b.name",
      q: { vi: 'Hồ sơ vay nộp ở {p} được duyệt bao nhiêu phần trăm?', en: 'What share of the loan applications filed at {p} were approved?' },
      next: { vi: 'Tách theo kênh nộp hồ sơ (thêm một điều kiện về kênh): chi nhánh nào khác hẳn?', en: 'Split by application channel (add a condition on the channel): which branch stands out?' },
    },
    {
      id: 'f-overdue', at: ['Quang Ngai'], after: 3, tables: ['loan_snapshots', 'loans', 'branches'],
      sql: "SELECT b.name,\n  round(100.0 * coalesce(sum(s.outstanding) FILTER (WHERE s.dpd > 30), 0) / sum(s.outstanding), 1) AS overdue_pct\nFROM loan_snapshots s\nJOIN loans l ON l.id = s.loan_id\nJOIN branches b ON b.id = l.branch_id\nWHERE s.month_end = '2026-06-30'\nGROUP BY b.name",
      q: { vi: 'Ở {p}, dư nợ quá hạn trên 30 ngày chiếm bao nhiêu phần trăm dư nợ cuối tháng 6?', en: 'At {p}, what share of the outstanding balance was more than 30 days past due at the end of June?' },
      next: { vi: 'Đổi sang cuối tháng 10, hoặc bỏ điều kiện tháng và thêm cột tháng để kéo thanh thời gian: chi nhánh nào tăng nhanh nhất?', en: 'Switch to the end of October, or drop the month condition and add the month column to drag the time slider: which branch rises fastest?' },
    },
  ],
};

/**
 * The question a point opens: the hook question of that place once its review is passed, else one of the open neutral
 * questions, rotated by the point's index so neighbouring points ask different things. undefined: no table open yet.
 */
export function questionFor(d: DomainId, place: string, index: number, unlocked: readonly string[], passed: ReadonlySet<number>): MapQuestion | undefined {
  const open = MAP_QUESTIONS[d].filter((q) => q.tables.every((x) => unlocked.includes(x)) && (q.after === undefined || passed.has(q.after)));
  const neutral = open.filter((q) => !q.at);
  return open.find((q) => q.at?.includes(place)) ?? neutral[index % neutral.length];
}
