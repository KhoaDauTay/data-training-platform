import { box, define, fill, line, type Shape, SM, text, type Tone } from './engineVizCore';

// v35 (L553, uiux-design §2.2, D8): multi-tenant diagrams, a lazy chunk of their own (budget group engineVizTenant) loaded
// by engineViz's loadViz() the first time a lesson names one. pg-rls-path draws its own pinned setup (below), not a lab
// model: its numbers are checked on PGlite by tests/enginePgViz.test.ts.

// ── rlsPath ─────────────────────────────────────────────────────────────────────────────────────────────────────
/** The sample: 30 tickets, `tenant_id = g % 3 + 1`, archived when `g % 5 = 0`; role `app` reads with tenant 2. */
export const RLS_PATH_SETUP = `CREATE ROLE app NOLOGIN;
CREATE TABLE tickets (id int PRIMARY KEY, tenant_id int NOT NULL, archived boolean NOT NULL, title text NOT NULL);
INSERT INTO tickets SELECT g, g % 3 + 1, g % 5 = 0, 'ticket ' || g FROM generate_series(1, 30) g;
GRANT SELECT ON tickets TO app;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_rows ON tickets FOR SELECT TO app USING (tenant_id = current_setting('app.tenant_id')::int);
CREATE POLICY app_live ON tickets AS RESTRICTIVE FOR SELECT TO app USING (NOT archived)`;
export interface RlsPathModel { tenant: number; total: number; owned: number; seen: number }
const ROWS = Array.from({ length: 30 }, (_, i) => ({ g: i + 1, t: ((i + 1) % 3) + 1, archived: (i + 1) % 5 === 0 }));
export const RLS_PATH_SAMPLE: RlsPathModel = {
  tenant: 2, total: ROWS.length, owned: ROWS.filter((r) => r.t === 2).length, seen: ROWS.filter((r) => r.t === 2 && !r.archived).length,
};

define<RlsPathModel>('pg-rls-path', RLS_PATH_SAMPLE, (m, tr) => {
  const STAGES: [string, string][] = [
    ['Pool', tr('mượn kết nối', 'borrows one')],
    ['SET LOCAL', tr('chỉ trong tx', 'this tx only')],
    [tr('Câu SQL', 'Query'), tr('chỉ là chữ', 'just text')],
    ['Policy', tr('thêm USING', 'adds USING')],
    ['Executor', tr('lọc dòng', 'filters rows')],
    ['COMMIT', tr('trả kết nối', 'returns it')],
  ];
  const Y = (i: number) => 8 + i * 40;
  const X0 = 124;
  const BYPASS = 6;
  const draw = (at: number): Shape[] => {
    const out: Shape[] = [];
    STAGES.forEach(([label, sub], i) => {
      const tone: Tone = at === BYPASS ? (i === 3 ? 'dead' : i === 3 - 1 || i === 4 ? 'new' : 'cell') : i === at ? 'new' : i < at ? 'live' : 'cell';
      out.push(...box(`s${i}`, 10, Y(i), 104, 34, label, tone, sub));
      if (i < STAGES.length - 1) out.push(line(`a${i}`, 62, Y(i) + 34, 62, Y(i + 1), { ink: at !== BYPASS && i < at ? 'new' : 'edge', arrow: true, w: at !== BYPASS && i < at ? 1.8 : 1.2, dash: at === BYPASS && (i === 2 || i === 3) }));
    });
    if (at === BYPASS) out.push({ k: 'skip', t: 'p', d: `M114 ${Y(2) + 17} H120 V${Y(4) + 17} H116`, ink: 'dead', w: 1.8, arrow: true, dash: true });
    const head = [tr('Kết nối từ pool', 'A pooled connection'), tr('Trong transaction', 'Inside the transaction'), tr('Ứng dụng gửi', 'What the app sends'),
      tr('Sau rewriter', 'After the rewriter'), fill(tr('Executor đọc {n} dòng', 'The executor reads {n} rows'), { n: m.total }),
      tr('Sau COMMIT', 'After COMMIT'), tr('Ai bỏ qua policy', 'Who skips the policy')][at];
    out.push(text('h', X0, 14, head, { size: SM, b: true, ink: 'muted' }));
    const t = `'${m.tenant}'`;
    const mono: string[][] = [
      ['current_user = app', tr('app.tenant_id: chưa đặt', 'app.tenant_id: not set')],
      ['BEGIN;', 'SET LOCAL app.tenant_id', `  = ${t};`],
      ['SELECT count(*)', 'FROM tickets;', tr('-- không có WHERE', '-- no WHERE')],
      ['WHERE tenant_id =', '  current_setting(', "  'app.tenant_id')::int", 'AND NOT archived'],
      [],
      ["app.tenant_id = ''", tr(`SET thường: vẫn ${t}`, `plain SET: still ${t}`)],
      [],
    ];
    mono[at].forEach((s, i) => out.push(text(`q${i}`, X0, 38 + i * 18, s, { size: SM, mono: true })));
    if (at === BYPASS) {
      ['superuser', tr('vai trò BYPASSRLS', 'a BYPASSRLS role'), tr('chủ bảng, chưa FORCE', 'owner without FORCE')]
        .forEach((s, i) => out.push(...box(`r${i}`, X0, 40 + i * 42, 206, 34, s, 'warm')));
      return out;
    }
    out.push(text('gh', X0, 130, 'tenant_id', { size: SM, mono: true, ink: 'muted' }));
    [1, 2, 3].forEach((tn, row) => {
      const y = 142 + row * 26;
      out.push(text(`g${tn}`, X0 + 4, y + 13, String(tn), { size: SM, b: true }));
      ROWS.filter((r) => r.t === tn).forEach((r, j) => {
        const kept = r.t === m.tenant && !r.archived;
        const tone: Tone = at === 4 ? (kept ? 'live' : 'ghost') : 'cell';
        out.push({ k: `c${r.g}`, t: 'r', x: X0 + 22 + j * 18, y, w: 15, h: 18, tone, rx: 3 });
      });
    });
    if (at === 4) out.push(text('n', X0, 236, `${m.total} → ${m.owned} → ${m.seen}`, { size: SM, b: true, mono: true }));
    return out;
  };
  const v = { t: m.tenant, n: m.total, k: m.owned, s: m.seen, d: m.owned - m.seen };
  return {
    title: tr('Đường đi của một câu qua RLS', 'A query\'s path through RLS'), w: 340, h: 250,
    frames: [
      { say: tr('Ứng dụng mượn một kết nối từ pool, chạy bằng vai trò app (không sở hữu bảng). Kết nối chưa biết khách nào.', 'The application borrows a pooled connection that runs as role app (not the table owner). The connection knows no tenant yet.'), nodes: draw(0) },
      { say: fill(tr('BEGIN rồi SET LOCAL app.tenant_id = \'{t}\': khách hiện tại chỉ sống trong transaction này.', 'BEGIN, then SET LOCAL app.tenant_id = \'{t}\': the current tenant lives only inside this transaction.'), v), nodes: draw(1) },
      { say: tr('Ứng dụng gửi SELECT … FROM tickets, không viết WHERE tenant_id.', 'The application sends SELECT … FROM tickets without writing WHERE tenant_id.'), nodes: draw(2) },
      { say: tr('Rewriter thêm điều kiện của policy: permissive gộp OR, restrictive gộp AND (NOT archived).', 'The rewriter adds the policy conditions: permissive ones joined with OR, restrictive ones with AND (NOT archived).'), nodes: draw(3) },
      { say: fill(tr('Executor đọc {n} dòng, policy giữ {k} dòng của khách {t}, restrictive bỏ {d} dòng lưu trữ: trả {s}.', 'The executor reads {n} rows; the policy keeps tenant {t}\'s {k} and the restrictive one drops {d} archived rows: {s} come back.'), v), nodes: draw(4) },
      { say: fill(tr('COMMIT: SET LOCAL hết hiệu lực, kết nối về pool sạch. Dùng SET thường thì người mượn kết nối sau sẽ thấy dữ liệu khách {t}.', 'COMMIT: SET LOCAL ends and the connection returns to the pool clean. With a plain SET, the next borrower would see tenant {t}\'s data.'), v), nodes: draw(5) },
      { say: tr('Ai bỏ qua bước Policy: superuser, vai trò BYPASSRLS, và chủ bảng khi chưa FORCE ROW LEVEL SECURITY.', 'Who skips the Policy step: superusers, BYPASSRLS roles, and the table owner unless FORCE ROW LEVEL SECURITY is on.'), nodes: draw(BYPASS) },
    ],
  };
});
