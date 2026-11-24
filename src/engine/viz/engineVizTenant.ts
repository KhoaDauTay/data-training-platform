import { box, cut, define, fill, line, type Shape, SM, text, type Tone } from './engineVizCore';

// v34 (L544): the multi-tenant diagrams, a lazy chunk of their own (budget group engineVizTenant) loaded by engineViz's
// loadViz() the first time a lesson names one. pg-tenancy-models is a built-in picture (no lab model needed): three
// tenants A, B, C, each with a fixed secondary tone (A info, B warm, C accent; never a meaning tone), letters always shown.

/** Optional labels: up to 3 tenant letters (default A, B, C) and the pool table's name (default invoices). */
export interface TenancyModel { tenants?: string[]; table?: string }
const TENANT_TONE: Tone[] = ['ptr', 'warm', 'new'];
/** Characters a bold label keeps at SM inside a box `w` wide (as engineVizPgFlow's, copied: no cross-chunk import). */
const fitChars = (w: number): number => Math.max(3, Math.floor((w - 6) / (SM * 0.58)));
const COLS = [6, 118, 230];
const W = 104;

define<TenancyModel>('pg-tenancy-models', {}, (m, tr) => {
  const ts = (Array.isArray(m?.tenants) && m.tenants.length ? m.tenants : ['A', 'B', 'C']).slice(0, 3).map((x) => cut(String(x), 2));
  while (ts.length < 3) ts.push(String.fromCharCode(65 + ts.length));
  const table = cut(typeof m?.table === 'string' && m.table ? m.table : 'invoices', fitChars(92));
  const heads: [string, string][] = [['Silo', tr('DB riêng', 'own database')], ['Bridge', tr('schema riêng', 'own schema')], ['Pool', tr('chung bảng', 'shared tables')]];
  // v35 R1 (E05): the word says good or bad on its own (mạnh/yếu, đắt/rẻ, nhiều/ít), the tone only repeats it (never colour alone)
  const rates: [string, string[], Tone[]][] = [
    [tr('Cô lập', 'Isolation'), [tr('mạnh', 'strong'), tr('vừa', 'medium'), tr('yếu', 'weak')], ['live', 'cell', 'dead']],
    [tr('Chi phí mỗi khách', 'Cost per tenant'), [tr('đắt', 'expensive'), tr('vừa', 'medium'), tr('rẻ', 'cheap')], ['dead', 'cell', 'live']],
    [tr('Công vận hành', 'Operations work'), [tr('nhiều', 'a lot'), tr('vừa', 'some'), tr('ít', 'little')], ['dead', 'cell', 'live']],
  ];
  const POOL = [0, 1, 2, 0, 2, 1]; // the strips' tenants, as the spec's A, B, C, A, C, B

  /** `focus`: the column in focus (-1 = none: every column plain); `rated`: the rating rows highlighted. */
  const draw = (focus: number, rated: boolean, app: boolean): Shape[] => {
    const out: Shape[] = [];
    const on = (c: number): boolean => focus < 0 || focus === c;
    const tone = (c: number, t: Tone): Tone => (on(c) ? t : 'ghost');
    out.push(...box('app', 6, 6, 328, 28, tr('Ứng dụng', 'App'), app ? 'new' : 'cell'));
    COLS.forEach((x, c) => {
      out.push(line(`a${c}`, x + W / 2, 34, x + W / 2, 42, { arrow: true, ink: app || focus === c ? 'new' : 'edge' }));
      out.push(text(`hn${c}`, x + W / 2, 52, heads[c][0], { a: 'm', b: true, ink: on(c) ? 'ink' : 'muted' }));
      out.push(text(`hs${c}`, x + W / 2, 70, heads[c][1], { a: 'm', ink: on(c) ? 'ink' : 'muted' }));
    });
    // Silo: one database per tenant
    ts.forEach((t, i) => out.push(...box(`silo${i}`, COLS[0], 90 + i * 40, W, 32, `DB ${t}`, tone(0, TENANT_TONE[i]))));
    // Bridge: one database, one schema per tenant
    out.push({ k: 'br', t: 'r', x: COLS[1], y: 86, w: W, h: 120, tone: tone(1, 'cell') });
    out.push(text('brh', COLS[1] + W / 2, 96, 'DB', { a: 'm', b: true, ink: on(1) ? 'ink' : 'muted' }));
    ts.forEach((t, i) => out.push(...box(`sch${i}`, COLS[1] + 6, 108 + i * 32, W - 12, 26, `schema ${t.toLowerCase()}`, tone(1, TENANT_TONE[i]))));
    // Pool: one table, every row tagged with its tenant
    out.push({ k: 'pl', t: 'r', x: COLS[2], y: 86, w: W, h: 120, tone: tone(2, 'cell') });
    out.push(text('plh', COLS[2] + W / 2, 96, table, { a: 'm', b: true, ink: on(2) ? 'ink' : 'muted' }));
    POOL.forEach((ti, i) => {
      out.push({ k: `ps${i}`, t: 'r', x: COLS[2] + 6, y: 106 + i * 16, w: W - 12, h: 14, tone: tone(2, TENANT_TONE[ti]), rx: 2 });
      out.push(text(`pt${i}`, COLS[2] + 10, 113 + i * 16, `tenant_id ${ts[ti]}`, { ink: on(2) ? 'ink' : 'muted' }));
    });
    // The three rating rows: a full-width heading, then one word per column (the word carries the meaning)
    rates.forEach(([head, words, good], r) => {
      const y = 222 + r * 46; // T1-C9-01: 14 units between a row's cells and the next heading
      out.push(text(`rh${r}`, 6, y, head, { b: rated, ink: rated ? 'ink' : 'muted' }));
      COLS.forEach((x, c) => out.push(...box(`r${r}c${c}`, x, y + 10, W, 22, words[c], rated ? good[c] : on(c) ? 'cell' : 'ghost')));
    });
    return out;
  };
  const names = ts.join(', ').replace(/, ([^,]*)$/, tr(' và $1', ' and $1'));
  return {
    title: tr('Ba mô hình nhiều khách hàng', 'Three tenancy models'),
    w: 340,
    h: 352,
    frames: [
      { say: tr(`Ba khách ${names} dùng chung một ứng dụng. Câu hỏi: dữ liệu của họ nằm ở đâu?`, `Three tenants ${names} share one application. The question: where does their data live?`), nodes: draw(-1, false, true) },
      { say: tr('Silo: mỗi khách một database. Cô lập mạnh nhất, nhưng mỗi khách mới là một database phải tạo, sao lưu và nâng cấp.', 'Silo: one database per tenant. The strongest isolation, but every new tenant is a database to create, back up and upgrade.'), nodes: draw(0, false, false) },
      { say: tr('Bridge: một database, mỗi khách một schema. Cùng bảng, khác tên schema; quyền theo schema, nhưng hàng nghìn schema làm việc đổi cấu trúc chậm.', 'Bridge: one database, one schema per tenant. The same tables under different schema names; rights per schema, but thousands of schemas make migrations slow.'), nodes: draw(1, false, false) },
      { say: tr('Pool: mọi khách chung một bảng, mỗi dòng có tenant_id. Rẻ nhất, nhưng mọi câu phải lọc tenant_id, nên cần RLS.', 'Pool: all tenants share one table and every row carries tenant_id. The cheapest, but every query must filter on tenant_id, hence RLS.'), nodes: draw(2, false, false) },
      { say: tr('So sánh: đi từ silo tới pool, chi phí mỗi khách giảm và việc cô lập chuyển từ hạ tầng sang dữ liệu. Nhiều hệ thống trộn cả hai.', 'Compared: from silo to pool the cost per tenant falls and isolation moves from the infrastructure into the data. Many systems mix them.'), nodes: draw(-1, true, false) },
    ],
  };
});

// v35 (L553, uiux-design §2.2): pg-rls-path draws its own pinned setup (below), not a lab model; its numbers are
// checked on PGlite by tests/enginePgViz.test.ts.
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
  const Y = (i: number) => 8 + i * 46; // E04: 12 units between boxes, so an arrowhead never meets a box edge
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
    title: tr('Đường đi của một câu qua RLS', 'A query\'s path through RLS'), w: 340, h: 282,
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
