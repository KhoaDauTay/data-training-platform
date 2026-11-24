import { box, cut, define, line, type Shape, SM, text, type Tone } from './engineVizCore';

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
  const rates: [string, string[]][] = [
    [tr('Cô lập', 'Isolation'), [tr('cao', 'high'), tr('vừa', 'medium'), tr('thấp', 'low')]],
    [tr('Chi phí mỗi khách', 'Cost per tenant'), [tr('cao', 'high'), tr('vừa', 'medium'), tr('thấp', 'low')]],
    [tr('Công vận hành', 'Operations work'), [tr('cao', 'high'), tr('vừa', 'medium'), tr('thấp', 'low')]],
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
    rates.forEach(([head, words], r) => {
      const y = 222 + r * 40;
      out.push(text(`rh${r}`, 6, y, head, { b: rated, ink: rated ? 'ink' : 'muted' }));
      COLS.forEach((x, c) => out.push(...box(`r${r}c${c}`, x, y + 10, W, 22, words[c], rated ? 'new' : on(c) ? 'cell' : 'ghost')));
    });
    return out;
  };
  const names = ts.join(', ').replace(/, ([^,]*)$/, tr(' và $1', ' and $1'));
  return {
    title: tr('Ba mô hình nhiều khách hàng', 'Three tenancy models'),
    w: 340,
    h: 340,
    frames: [
      { say: tr(`Ba khách ${names} dùng chung một ứng dụng. Câu hỏi: dữ liệu của họ nằm ở đâu?`, `Three tenants ${names} share one application. The question: where does their data live?`), nodes: draw(-1, false, true) },
      { say: tr('Silo: mỗi khách một database. Cô lập mạnh nhất, nhưng mỗi khách mới là một database phải tạo, sao lưu và nâng cấp.', 'Silo: one database per tenant. The strongest isolation, but every new tenant is a database to create, back up and upgrade.'), nodes: draw(0, false, false) },
      { say: tr('Bridge: một database, mỗi khách một schema. Cùng bảng, khác tên schema; quyền theo schema, nhưng hàng nghìn schema làm việc đổi cấu trúc chậm.', 'Bridge: one database, one schema per tenant. The same tables under different schema names; rights per schema, but thousands of schemas make migrations slow.'), nodes: draw(1, false, false) },
      { say: tr('Pool: mọi khách chung một bảng, mỗi dòng có tenant_id. Rẻ nhất, nhưng mọi câu phải lọc tenant_id, nên cần RLS.', 'Pool: all tenants share one table and every row carries tenant_id. The cheapest, but every query must filter on tenant_id, hence RLS.'), nodes: draw(2, false, false) },
      { say: tr('So sánh: đi từ silo tới pool, chi phí mỗi khách giảm và việc cô lập chuyển từ hạ tầng sang dữ liệu. Nhiều hệ thống trộn cả hai.', 'Compared: from silo to pool the cost per tenant falls and isolation moves from the infrastructure into the data. Many systems mix them.'), nodes: draw(-1, true, false) },
    ],
  };
});
