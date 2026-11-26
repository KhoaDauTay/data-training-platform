import { arc, box, cut, define, fill, type Frame, line, num, type Shape, SM, text, type Tone } from './engineVizCore';

// ENG-VIZ Postgres storage diagrams (knowledge map P2–P5): heap page, HOT chain, MVCC, VACUUM, WAL.

// ── heapPage ────────────────────────────────────────────────────────────────────────────────────────────────────
/** One row of `heap_page_items(get_raw_page(t, n))`; values as PGlite returns them (numbers, strings or NULL). */
export interface HeapRow { lp: unknown; lp_off?: unknown; lp_len?: unknown; lp_flags?: unknown; t_xmin?: unknown; t_xmax?: unknown; t_ctid?: unknown }
export interface HeapModel { rows: HeapRow[]; page?: number }
export const HEAP_SAMPLE: HeapModel = {
  page: 0,
  rows: [
    { lp: 1, lp_off: 8152, lp_len: 39, lp_flags: 1, t_xmin: '740', t_xmax: '742', t_ctid: '(0,4)' },
    { lp: 2, lp_off: 8112, lp_len: 41, lp_flags: 1, t_xmin: '740', t_xmax: '0', t_ctid: '(0,2)' },
    { lp: 3, lp_off: 8072, lp_len: 38, lp_flags: 1, t_xmin: '741', t_xmax: '0', t_ctid: '(0,3)' },
    { lp: 4, lp_off: 8032, lp_len: 39, lp_flags: 1, t_xmin: '742', t_xmax: '0', t_ctid: '(0,4)' },
    { lp: 5, lp_off: 0, lp_len: 0, lp_flags: 0, t_xmin: null, t_xmax: null, t_ctid: null },
  ],
};
const MAX_T = 5;
const FLAG = ['unused', 'normal', 'redirect', 'dead'];
define<HeapModel | HeapRow[]>('pg-heap-page', HEAP_SAMPLE, (m0, tr) => {
  const m = Array.isArray(m0) ? { rows: m0 } : m0;
  const rows = m.rows.map((r) => ({
    lp: num(r.lp) ?? 0, off: num(r.lp_off) ?? 0, len: num(r.lp_len) ?? 0, flags: num(r.lp_flags) ?? 1,
    xmin: num(r.t_xmin), xmax: num(r.t_xmax), ctid: typeof r.t_ctid === 'string' ? r.t_ctid : undefined,
  })).sort((a, b) => a.lp - b.lp);
  const normal = rows.filter((r) => r.flags === 1).slice(0, MAX_T);
  const others = rows.filter((r) => r.flags !== 1).slice(0, 6 - Math.min(normal.length, 5));
  const shown = [...normal, ...others].sort((a, b) => a.lp - b.lp).slice(0, 6);
  const more = rows.length - shown.length;
  const W = 340;
  const Y = 72; // v31 F5 (L510): the pd_lower/pd_upper line has its own row under the title
  const lpX = (i: number) => 40 + i * 18;
  const tX = (j: number) => W - 10 - (j + 1) * 30;
  const CY = Y + 62;
  const head = (lower: number, upper: number): Shape[] => [
    text('title', 10, 14, tr(`Trang ${m.page ?? 0} · 8192 byte`, `Page ${m.page ?? 0} · 8192 bytes`), { b: true, size: SM }),
    text('lu', 10, 32, `pd_lower ${lower} · pd_upper ${upper}`, { mono: true, size: SM, ink: 'muted' }),
    ...box('hdr', 10, Y, 28, 36, 'hdr', 'cell'),
    text('r0', 10, Y + 46, '0', { size: SM, ink: 'muted', mono: true }),
    text('r1', W - 10, Y + 46, '8192', { size: SM, ink: 'muted', a: 'e', mono: true }),
  ];
  /** The page with the first `k` shown pointers and tuples; `deadOn` paints xmax ≠ 0 tuples dead. */
  const page = (k: number, deadOn: boolean, othersOn: boolean): Shape[] => {
    const vis = shown.filter((r, i) => i < k && (r.flags === 1 || othersOn));
    const tup = vis.filter((r) => r.flags === 1);
    const lower = 24 + 4 * vis.length;
    const upper = tup.length ? Math.min(...tup.map((r) => r.off)) : 8192;
    const out = head(lower, upper);
    const tone = (r: (typeof rows)[number]): Tone => (r.flags === 0 ? 'free' : r.flags === 2 ? 'ptr' : r.flags === 3 || (deadOn && r.xmax) ? 'dead' : 'live');
    vis.forEach((r) => {
      const i = shown.indexOf(r);
      out.push(...box(`lp${r.lp}`, lpX(i), Y, 16, 36, String(r.lp), tone(r)));
    });
    const freeX = lpX(vis.length ? Math.max(...vis.map((r) => shown.indexOf(r))) + 1 : 0);
    const freeEnd = tup.length ? tX(tup.length - 1) : W - 10;
    if (freeEnd - freeX > 44) out.push(...box('free', freeX + 2, Y, freeEnd - freeX - 4, 36, tr('trống', 'free'), 'free'));
    tup.forEach((r, j) => {
      out.push(...box(`t${r.lp}`, tX(j), Y, 28, 36, `t${r.lp}`, tone(r)));
      out.push(arc(`a${r.lp}`, lpX(shown.indexOf(r)) + 8, Y - 1, tX(j) + 14, Y - 1, -(26 + 7 * j), { ink: tone(r) === 'dead' ? 'dead' : 'ptr', w: 1.2, to: { x: tX(j), y: Y, w: 28, h: 36 } }));
    });
    // detail cards, one full-width row each (v31 F5: two columns could not hold the monospace line at SM)
    vis.forEach((r) => {
      const i = shown.indexOf(r);
      const y = CY + i * 26;
      const t = tone(r);
      out.push({ k: `c${r.lp}`, t: 'r', x: 10, y, w: 320, h: 24, tone: t });
      out.push(text(`c${r.lp}.a`, 16, y + 12, r.flags === 1 ? `lp ${r.lp} · off ${r.off}` : `lp ${r.lp} · ${FLAG[r.flags] ?? r.flags}`, { b: true, size: SM }));
      const sub = r.flags === 1 ? `xmin ${r.xmin ?? '–'} xmax ${r.xmax ?? 0}${r.xmax && r.ctid ? ` → ${r.ctid}` : ''}` : r.flags === 2 ? `→ lp ${r.off}` : tr('không có tuple', 'no tuple');
      out.push(text(`c${r.lp}.b`, 324, y + 12, cut(sub, 25), { mono: true, size: SM, a: 'e' }));
    });
    if (more > 0 && k >= shown.length) out.push(text('more', W - 10, CY + shown.length * 26 + 10, tr(`+${more} dòng nữa`, `+${more} more rows`), { a: 'e', size: SM, ink: 'muted' }));
    return out;
  };
  const frames: Frame[] = [{
    say: tr(
      'Một trang heap 8 KB. Đầu trang là header 24 byte; pd_lower (cuối mảng line pointer) = 24 và pd_upper (đầu vùng tuple) = 8192, nên cả trang còn trống.',
      'An 8 KB heap page. It starts with a 24-byte header; pd_lower (end of the line pointer array) is 24 and pd_upper (start of the tuples) is 8192, so the whole page is free.'),
    nodes: page(0, false, false),
  }];
  shown.forEach((r, i) => {
    if (r.flags !== 1) return;
    const k = shown.slice(0, i + 1).filter((x) => x.flags === 1).length;
    const vis = shown.slice(0, i + 1).filter((x) => x.flags === 1);
    frames.push({
      say: fill(tr(
        'INSERT bởi giao dịch {xmin}: line pointer lp{lp} (4 byte) mọc từ đầu trang, pd_lower = {lower}; tuple {len} byte đặt từ cuối trang ở offset {off}, pd_upper = {off}.',
        'INSERT by transaction {xmin}: line pointer lp{lp} (4 bytes) grows from the start, pd_lower = {lower}; the {len}-byte tuple is placed from the end at offset {off}, pd_upper = {off}.'),
      { xmin: r.xmin ?? '?', lp: r.lp, lower: 24 + 4 * k, len: r.len, off: Math.min(...vis.map((x) => x.off)) }),
      nodes: page(i + 1, false, false),
    });
  });
  const odd = shown.filter((r) => r.flags !== 1);
  if (odd.length) frames.push({
    say: tr(
      `Không phải line pointer nào cũng trỏ tới tuple: ${odd.map((r) => `lp${r.lp} là ${({ 0: 'unused (trống, dùng lại được)', 2: `redirect (chuyển tới lp${r.off})`, 3: 'dead (chờ VACUUM)' } as Record<number, string>)[r.flags] ?? r.flags}`).join(', ')}.`,
      `Not every line pointer points at a tuple: ${odd.map((r) => `lp${r.lp} is ${({ 0: 'unused (free to reuse)', 2: `a redirect (to lp${r.off})`, 3: 'dead (waiting for VACUUM)' } as Record<number, string>)[r.flags] ?? r.flags}`).join(', ')}.`),
    nodes: page(shown.length, false, true),
  });
  const dead = shown.filter((r) => r.flags === 1 && r.xmax);
  frames.push({
    say: dead.length
      ? tr(
        `Tuple có xmax ≠ 0 đã bị xóa hoặc cập nhật: ${dead.map((r) => `lp${r.lp} (xmax ${r.xmax}${r.ctid ? `, t_ctid ${r.ctid} trỏ tới bản mới` : ''})`).join(', ')}. Nó vẫn chiếm chỗ cho tới khi VACUUM dọn.`,
        `A tuple with xmax ≠ 0 was deleted or updated: ${dead.map((r) => `lp${r.lp} (xmax ${r.xmax}${r.ctid ? `, t_ctid ${r.ctid} points at the new version` : ''})`).join(', ')}. It keeps its space until VACUUM removes it.`)
      : tr('Mọi tuple có xmax = 0: chưa ai xóa hay cập nhật, tất cả còn sống.', 'Every tuple has xmax = 0: nobody deleted or updated them, all are live.'),
    nodes: page(shown.length, true, true),
  });
  const tup = shown.filter((r) => r.flags === 1);
  const lower = 24 + 4 * rows.length;
  const upper = tup.length ? Math.min(...rows.filter((r) => r.flags === 1).map((r) => r.off)) : 8192;
  frames.push({
    say: fill(tr(
      'Chỗ trống của trang là pd_upper − pd_lower = {upper} − {lower} = {free} byte. Khi hết chỗ, dòng mới sang trang khác.',
      'The free space is pd_upper − pd_lower = {upper} − {lower} = {free} bytes. When it runs out, new rows go to another page.'),
    { upper, lower, free: Math.max(0, upper - lower) }),
    nodes: [...page(shown.length, true, true), line('brace', lpX(shown.length) + 2, Y + 42, (tup.length ? tX(tup.length - 1) : W - 10) - 2, Y + 42, { ink: 'new', w: 2 })],
  });
  return { title: tr('Trang heap: line pointer và tuple', 'Heap page: line pointers and tuples'), w: W, h: CY + shown.length * 26 + 22, frames };
});

// ── hotChain ────────────────────────────────────────────────────────────────────────────────────────────────────
export interface HotModel { xids: [number, number, number]; index: string; key: number }
define<HotModel>('pg-hot-chain', { xids: [740, 741, 742], index: 'notes_pkey', key: 7 }, (m, tr) => {
  const W = 340;
  const Y = 96;
  const [x1, x2, x3] = m.xids;
  const lpX = (i: number) => 40 + i * 18;
  const tX = (j: number) => W - 10 - (j + 1) * 34;
  type St = { n: number; hot?: boolean; look?: boolean; pruned?: boolean; cold?: boolean };
  const draw = (s: St): Shape[] => {
    const out: Shape[] = [
      ...box('idx', 10, 18, 132, 40, `index ${cut(m.index, 12)}`, s.look ? 'new' : 'ptr', `key ${m.key} → (0,1)`),
      ...box('hdr', 10, Y, 28, 36, 'hdr'),
    ];
    if (s.cold) out.push(...box('idx2', 150, 18, 120, 40, tr('mục index mới', 'new index entry'), 'warm', `key ${m.key} → (1,1)`));
    const lps = s.pruned ? 3 : s.n;
    for (let i = 0; i < lps; i++) {
      const tone: Tone = s.pruned ? (i === 0 ? 'ptr' : i === 1 ? 'free' : 'live') : i < s.n - 1 ? 'dead' : 'live';
      out.push(...box(`lp${i}`, lpX(i), Y, 16, 36, String(i + 1), s.look && !s.pruned ? 'new' : tone));
    }
    out.push(line('i2lp', 40, 58, lpX(0) + 8, Y - 2, { arrow: true, ink: s.look ? 'new' : 'ptr', w: s.look ? 2 : 1.4, to: { x: lpX(0), y: Y, w: 16, h: 36 } }));
    const free0 = lpX(lps) + 2;
    const tuples = s.pruned ? [2] : [...Array(s.n).keys()];
    const free1 = tX(s.pruned ? 0 : s.n - 1) - 2;
    out.push(...box('free', free0, Y, free1 - free0, 36, tr('trống', 'free'), 'free'));
    tuples.forEach((t, j) => {
      const dead = !s.pruned && t < s.n - 1;
      out.push(...box(`t${t}`, tX(j), Y, 30, 36, `t${t + 1}`, s.look ? 'new' : dead ? 'dead' : 'live'));
      out.push(arc(`a${t}`, lpX(s.pruned ? 2 : t) + 8, Y + 37, tX(j) + 15, Y + 37, 30 + 8 * j, { ink: dead ? 'dead' : 'ptr', w: 1.2, to: { x: tX(j), y: Y, w: 30, h: 36 } }));
      if (t > 0 && !s.pruned) out.push(arc(`c${t}`, tX(j - 1) + 15, Y - 1, tX(j) + 15, Y - 1, -26, { ink: s.look ? 'new' : 'dead', w: 1.4, to: { x: tX(j), y: Y, w: 30, h: 36 } }));
    });
    if (s.pruned) out.push(arc('redir', lpX(0) + 8, Y - 1, lpX(2) + 8, Y - 1, -16, { ink: 'ptr', w: 1.6, to: { x: lpX(2), y: Y, w: 16, h: 36 } }));
    // tuple notes
    const notes: [string, string, Tone][] = s.pruned
      ? [[`lp1 → lp3`, 'redirect', 'ptr'], ['lp2', 'unused', 'free'], ['t3', `xmin ${x3}`, 'live']]
      : [[s.n > 1 ? 't1 · HOT_UPDATED' : 't1', `xmin ${x1} · xmax ${s.n > 1 ? x2 : 0}`, s.n > 1 ? 'dead' : 'live'],
        ['t2 · HEAP_ONLY', `xmin ${x2} · xmax ${s.n > 2 ? x3 : 0}`, s.n > 2 ? 'dead' : 'live'],
        ['t3 · HEAP_ONLY', `xmin ${x3} · xmax 0`, 'live']].slice(0, s.n) as [string, string, Tone][];
    // v31 F5 (L510): one full-width row per tuple note (three side-by-side boxes could not hold them at SM)
    notes.forEach(([a, b, tone], i) => out.push({ k: `n${i}`, t: 'r', x: 10, y: 190 + i * 26, w: 320, h: 24, tone },
      text(`n${i}.t`, 16, 202 + i * 26, a, { b: true, size: SM }), text(`n${i}.s`, 324, 202 + i * 26, b, { mono: true, size: SM, a: 'e' })));
    return out;
  };
  return {
    title: tr('Chuỗi HOT trong một trang', 'A HOT chain inside one page'), w: W, h: 270,
    frames: [
      { say: fill(tr('INSERT bởi {a}: tuple t1 ở lp1. Index {i} có một mục trỏ tới (0,1).', 'INSERT by {a}: tuple t1 sits at lp1. Index {i} has one entry pointing at (0,1).'), { a: x1, i: m.index }), nodes: draw({ n: 1 }) },
      { say: fill(tr('UPDATE bởi {b} không đổi cột nào có index, và trang còn chỗ: bản mới t2 nằm cùng trang (heap-only), t1 có xmax {b} và t_ctid trỏ tới t2. Không thêm mục index nào.', 'UPDATE by {b} changes no indexed column and the page has room: the new version t2 stays on the page (heap-only), t1 gets xmax {b} and its t_ctid points at t2. No new index entry.'), { b: x2 }), nodes: draw({ n: 2 }) },
      { say: fill(tr('UPDATE lần nữa bởi {c}: chuỗi dài thêm t1 → t2 → t3, index vẫn chỉ trỏ lp1.', 'Another UPDATE by {c}: the chain grows t1 → t2 → t3 and the index still points at lp1 only.'), { c: x3 }), nodes: draw({ n: 3 }) },
      { say: tr('Tra index: tới lp1, rồi theo t_ctid dọc chuỗi trong cùng trang tới bản mà snapshot thấy (t3). Không phải đọc trang khác.', 'An index lookup lands on lp1, then follows t_ctid along the chain inside the same page to the version the snapshot sees (t3). No other page is read.'), nodes: draw({ n: 3, look: true }) },
      { say: tr('Prune (khi trang gần đầy, hoặc VACUUM): t1, t2 đã chết với mọi người nên bị dọn. lp1 thành redirect tới lp3, lp2 thành unused, chỗ trống được trả lại.', 'Pruning (when the page fills up, or VACUUM): t1 and t2 are dead to everyone and are removed. lp1 becomes a redirect to lp3, lp2 becomes unused, and the space comes back.'), nodes: draw({ n: 3, pruned: true }) },
      { say: tr('Không có HOT khi UPDATE đổi một cột có index (trừ BRIN) hoặc trang hết chỗ: bản mới sang trang khác và mọi index thêm một mục. fillfactor thấp hơn để dành chỗ cho HOT.', 'No HOT when the UPDATE changes an indexed column (BRIN aside) or the page is full: the new version goes to another page and every index gets a new entry. A lower fillfactor keeps room for HOT.'), nodes: draw({ n: 3, pruned: true, cold: true }) },
    ],
  };
});

// ── mvccTimeline ────────────────────────────────────────────────────────────────────────────────────────────────
export interface MvccModel { xids: [number, number]; before: string; after: string }
define<MvccModel>('pg-mvcc-timeline', { xids: [100, 101], before: 'price 10', after: 'price 12' }, (m, tr) => {
  const [a, b] = m.xids;
  const LA = 44;
  const LB = 96;
  const T = [104, 166, 228, 292]; // v31 F5: clear of the lane names at SM
  const lanes: Shape[] = [
    text('la', 10, LA, tr('Phiên A', 'Session A'), { b: true }), text('lb', 10, LB, tr('Phiên B', 'Session B'), { b: true }),
    line('ra', 78, LA, 330, LA, { ink: 'edge' }), line('rb', 78, LB, 330, LB, { ink: 'edge' }),
    line('ax', 70, 122, 330, 122, { ink: 'muted', arrow: true, w: 1 }), text('axt', 330, 132, tr('thời gian', 'time'), { a: 'e', size: SM, ink: 'muted' }),
  ];
  const ev = (k: string, x: number, y: number, label: string, tone: Tone = 'cell'): Shape[] => box(k, x - 28, y - 12, 56, 24, label, tone);
  const v = (st: 0 | 1 | 2, sees?: 1 | 2): Shape[] => {
    const out: Shape[] = [
      ...box('v1', 10, 150, 150, 44, `v1 · ${cut(m.before, 12)}`, sees === 1 ? 'new' : st ? 'dead' : 'live', `xmin ${a} · xmax ${st ? b : 0}`),
      text('cap', 10, 210, tr('Hai phiên bản của cùng một dòng trong heap', 'Two versions of the same row in the heap'), { size: SM, ink: 'muted' }),
    ];
    if (st) out.push(...box('v2', 180, 150, 150, 44, `v2 · ${cut(m.after, 12)}`, sees === 2 ? 'new' : st === 2 ? 'live' : 'warm', `xmin ${b} · xmax 0`));
    if (st) out.push(line('ct', 160, 172, 180, 172, { ink: 'ptr', arrow: true, to: { x: 180, y: 150, w: 150, h: 44 } })); // v39 F3: straight, a 20-unit arc left no room for its head
    return out;
  };
  const snap = (x: number): Shape[] => [{ k: 'snap', t: 'r', x, y: LA - 16, w: 330 - x, h: 32, tone: 'ptr', o: 0.35 }, text('snapt', 328, LA - 22, 'snapshot', { a: 'e', size: SM, ink: 'ptr' })];
  const A1 = ev('a1', T[0], LA, 'SELECT', 'new');
  const B1 = ev('b1', T[1], LB, 'UPDATE', 'warm');
  const B2 = ev('b2', T[2], LB, 'COMMIT', 'live');
  return {
    title: tr('MVCC: ai thấy phiên bản nào', 'MVCC: who sees which version'), w: 340, h: 222,
    frames: [
      { say: fill(tr('Dòng có một phiên bản v1, do giao dịch {a} chèn và đã commit: xmin {a}, xmax 0.', 'The row has one version, v1, inserted and committed by transaction {a}: xmin {a}, xmax 0.'), { a }), nodes: [...lanes, ...v(0)] },
      { say: tr('Phiên A bắt đầu và đọc: nó chụp một snapshot (giao dịch nào đã commit lúc này) và thấy v1.', 'Session A starts and reads: it takes a snapshot (which transactions have committed by now) and sees v1.'), nodes: [...lanes, ...snap(T[0] - 34), ...A1, ...v(0, 1)] },
      { say: fill(tr('Phiên B (giao dịch {b}) UPDATE: tạo v2 với xmin {b} và ghi xmax {b} lên v1. Cả hai bản cùng nằm trong heap; A không bị chặn và vẫn thấy v1, vì {b} chưa commit.', 'Session B (transaction {b}) UPDATEs: it writes v2 with xmin {b} and sets xmax {b} on v1. Both versions sit in the heap; A is not blocked and still sees v1, because {b} has not committed.'), { b }), nodes: [...lanes, ...snap(T[0] - 34), ...A1, ...B1, ...v(1, 1)] },
      { say: fill(tr('B COMMIT. Từ giờ {b} là đã commit, nhưng snapshot cũ của A vẫn ghi {b} là "đang chạy".', 'B COMMITs. From now on {b} is committed, but A\'s old snapshot still lists {b} as "in progress".'), { b }), nodes: [...lanes, ...snap(T[0] - 34), ...A1, ...B1, ...B2, ...v(2)] },
      { say: fill(tr('READ COMMITTED: mỗi câu lệnh chụp snapshot mới, nên lần đọc thứ hai của A thấy v2 ({x}).', 'READ COMMITTED: every statement takes a new snapshot, so A\'s second read sees v2 ({x}).'), { x: m.after }), nodes: [...lanes, ...snap(T[3] - 34), ...A1, ...B1, ...B2, ...ev('a2', T[3], LA, 'SELECT', 'new'), ...v(2, 2)] },
      { say: fill(tr('REPEATABLE READ: A giữ snapshot đầu tiên cho cả giao dịch, nên vẫn thấy v1 ({x}). Người đọc không chặn người ghi, và ngược lại.', 'REPEATABLE READ: A keeps its first snapshot for the whole transaction, so it still sees v1 ({x}). Readers never block writers, nor the other way round.'), { x: m.before }), nodes: [...lanes, ...snap(T[0] - 34), ...A1, ...B1, ...B2, ...ev('a2', T[3], LA, 'SELECT', 'new'), ...v(2, 1)] },
    ],
  };
});

// ── vacuumFlow ──────────────────────────────────────────────────────────────────────────────────────────────────
/** One string per heap page, one letter per tuple: l live, d dead, n new (inserted by a transaction still running). */
export interface VacuumModel { pages: string[] }
define<VacuumModel>('pg-vacuum-flow', { pages: ['ldld', 'llln', 'ddll'] }, (m, tr) => {
  const pages = m.pages.slice(0, 3);
  const PW = 100;
  const px = (i: number) => 10 + i * (PW + 10);
  type St = { vac?: boolean; fsm?: boolean; vm?: boolean; ios?: boolean; frozen?: boolean };
  const draw = (s: St): Shape[] => {
    const out: Shape[] = [text('vmh', 10, 186, tr('Visibility map', 'Visibility map'), { size: SM, ink: 'muted' }), text('fsmh', 10, 236, tr('Free space map', 'Free space map'), { size: SM, ink: 'muted' })];
    pages.forEach((p, i) => {
      const x = px(i);
      out.push({ k: `pg${i}`, t: 'r', x, y: 28, w: PW, h: 136, tone: 'plain' }, text(`pgt${i}`, x + 6, 40, tr(`trang ${i}`, `page ${i}`), { size: SM, b: true }));
      [...p.slice(0, 5)].forEach((c, j) => {
        const gone = s.vac && c === 'd';
        const tone: Tone = gone ? 'free' : c === 'd' ? 'dead' : c === 'n' ? 'warm' : s.frozen ? 'ptr' : 'live';
        out.push(...box(`t${i}.${j}`, x + 6, 50 + j * 22, PW - 12, 18, '', tone), text(`tl${i}.${j}`, x + 12, 59 + j * 22, gone ? tr('trống', 'free') : c === 'd' ? tr('chết', 'dead') : c === 'n' ? tr('đang chạy', 'in progress') : s.frozen ? 'frozen' : tr('sống', 'live'), { size: SM }));
      });
      const allVis = s.vm && !p.includes('n') && (s.vac || !p.includes('d'));
      out.push(...box(`av${i}`, x, 194, PW / 2 - 2, 22, 'AV', allVis ? (s.ios ? 'new' : 'live') : 'ghost'));
      out.push(...box(`af${i}`, x + PW / 2 + 2, 194, PW / 2 - 2, 22, 'AF', s.frozen && allVis ? 'ptr' : 'ghost'));
      const free = (s.fsm ? [...p].filter((c) => c === 'd').length + 1 : 1) / 6;
      out.push({ k: `fb${i}`, t: 'r', x, y: 244, w: PW, h: 10, tone: 'ghost' }, { k: `ff${i}`, t: 'r', x, y: 244, w: Math.max(4, PW * free), h: 10, tone: s.fsm ? 'new' : 'cell' });
      if (s.ios && !allVis) out.push({ k: `hf${i}`, t: 'r', x: x - 2, y: 26, w: PW + 4, h: 140, tone: 'warm', o: 0.5 }, text(`hft${i}`, x + PW / 2, 14, 'Heap Fetch', { a: 'm', size: SM, ink: 'warm', b: true }));
    });
    if (s.ios) out.push(text('iot', 330, 186, tr('Index Only Scan đọc AV trước', 'Index Only Scan reads AV first'), { a: 'e', size: SM, ink: 'new', b: true }));
    return out;
  };
  const deadN = pages.join('').split('d').length - 1;
  return {
    title: tr('VACUUM, visibility map và free space map', 'VACUUM, the visibility map and the free space map'), w: 340, h: 262,
    frames: [
      { say: fill(tr('Ba trang heap có {d} tuple chết (bản cũ sau UPDATE/DELETE). Bit all-visible (AV) và all-frozen (AF) đều tắt; free space map ghi trang gần đầy.', 'Three heap pages hold {d} dead tuples (old versions after UPDATE/DELETE). The all-visible (AV) and all-frozen (AF) bits are off; the free space map says the pages are nearly full.'), { d: deadN }), nodes: draw({}) },
      { say: tr('VACUUM gom TID của tuple chết, xóa các mục index trỏ tới chúng, rồi đánh dấu line pointer là unused: chỗ đó dùng lại được (nhưng file không co lại).', 'VACUUM collects the dead tuples\' TIDs, deletes the index entries that point at them, then marks the line pointers unused: the space can be reused (the file does not shrink).'), nodes: draw({ vac: true }) },
      { say: tr('VACUUM ghi chỗ trống mới vào free space map, nên INSERT sau tìm được trang còn chỗ.', 'VACUUM records the new free space in the free space map, so later INSERTs can find pages with room.'), nodes: draw({ vac: true, fsm: true }) },
      { say: tr('Trang mà mọi tuple đều thấy được với mọi giao dịch được bật bit AV. Trang có tuple của giao dịch đang chạy thì chưa.', 'A page whose tuples are all visible to every transaction gets its AV bit. A page with a tuple from a running transaction does not.'), nodes: draw({ vac: true, fsm: true, vm: true }) },
      { say: tr('Index Only Scan hỏi visibility map trước: trang có AV thì bỏ qua heap; trang chưa có AV vẫn phải đọc heap (Heap Fetches).', 'An Index Only Scan asks the visibility map first: pages with AV skip the heap; a page without AV still needs a heap visit (Heap Fetches).'), nodes: draw({ vac: true, fsm: true, vm: true, ios: true }) },
      { say: tr('Freeze: VACUUM đánh dấu tuple cũ là frozen (một bit cờ, xmin giữ nguyên) và bật AF. Nhờ vậy XID 32 bit quay vòng không làm dòng cũ "biến mất".', 'Freezing: VACUUM marks old tuples frozen (a flag bit; xmin stays) and sets AF. That is why the 32-bit XID can wrap around without old rows "vanishing".'), nodes: draw({ vac: true, fsm: true, vm: true, frozen: true }) },
    ],
  };
});

// ── walFlow ─────────────────────────────────────────────────────────────────────────────────────────────────────
/** Rows of `pg_get_wal_records_info` (start_lsn, resource_manager, record_type, fpi_length) and the checkpoint's redo LSN. */
export interface WalModel { redo: string; records: { start_lsn: string; resource_manager: string; record_type: string; fpi_length: unknown }[] }
define<WalModel>('pg-wal-flow', {
  redo: '0/1A2B000',
  records: [
    { start_lsn: '0/1A2B0D8', resource_manager: 'Heap', record_type: 'UPDATE', fpi_length: 7954 },
    { start_lsn: '0/1A2CF10', resource_manager: 'Heap', record_type: 'HOT_UPDATE', fpi_length: 0 },
    { start_lsn: '0/1A2CF68', resource_manager: 'Transaction', record_type: 'COMMIT', fpi_length: 0 },
  ],
}, (m, tr) => {
  const recs = m.records.slice(0, 3);
  const last = recs[recs.length - 1]?.start_lsn ?? m.redo;
  type St = { n: number; dirty?: boolean; flushed?: boolean; crash?: boolean; replay?: number };
  const lanes: Shape[] = [
    text('lm', 10, 16, tr('Bộ nhớ (shared buffers)', 'Memory (shared buffers)'), { size: SM, ink: 'muted', b: true }),
    text('lw', 10, 92, 'WAL', { size: SM, ink: 'muted', b: true }),
    text('ld', 10, 196, tr('Đĩa (file dữ liệu)', 'Disk (data file)'), { size: SM, ink: 'muted', b: true }),
  ];
  const draw = (s: St): Shape[] => {
    const out = [...lanes];
    const memLsn = s.replay !== undefined ? recs[Math.min(s.replay, recs.length - 1)]?.start_lsn ?? m.redo : s.n ? recs[Math.min(s.n, 2) - 1].start_lsn : m.redo;
    if (!s.crash || s.replay !== undefined) out.push(...box('mem', 10, 26, 150, 42, tr('trang 7', 'page 7'), s.replay !== undefined ? 'new' : s.dirty ? 'warm' : 'live', `pd_lsn ${memLsn}`));
    else out.push(...box('mem', 10, 26, 150, 42, tr('mất khi sập', 'lost in the crash'), 'ghost'));
    out.push(...box('disk', 10, 206, 150, 42, tr('trang 7', 'page 7'), s.crash && s.replay === undefined ? 'dead' : 'cell', `pd_lsn ${m.redo}`));
    out.push(line('ck', 12, 100, 12, 158, { ink: 'ptr', w: 2.4 }), text('ckt', 18, 166, `checkpoint · redo ${m.redo}`, { size: SM, mono: true, ink: 'ptr' }));
    recs.slice(0, s.n).forEach((r, i) => {
      const fpi = (num(r.fpi_length) ?? 0) > 0;
      const tone: Tone = s.replay !== undefined && i <= s.replay ? 'new' : fpi ? 'ptr' : 'cell';
      out.push(...box(`r${i}`, 20 + i * 106, 104, 100, 44, cut(r.record_type, 13), tone, fpi ? `+FPI ${num(r.fpi_length)} B` : cut(r.start_lsn, 14)));
    });
    if (s.flushed) out.push(line('fl', 20, 154, 20 + recs.length * 106 - 6, 154, { ink: 'live', w: 3 }), /* v39 F3 (L622): beside the WAL lane name, clear of the redo arrow */ text('flt', 48, 92, `fsync → ${last}`, { size: SM, mono: true, ink: 'live' }));
    if (s.dirty && !s.crash) out.push(text('dt', 170, 47, tr('bẩn: chưa ghi xuống đĩa', 'dirty: not on disk yet'), { size: SM, ink: 'warm' }));
    if (s.replay !== undefined) out.push(arc('rp', 250, 102, 164, 50, -24, { ink: 'new', w: 2, to: { x: 10, y: 26, w: 150, h: 42 } }), text('rpt', 170, 30, tr('REDO từ điểm redo', 'REDO from the redo point'), { size: SM, ink: 'new' }));
    return out;
  };
  return {
    title: tr('WAL: ghi log trước, phục hồi sau', 'WAL: log first, recover later'), w: 340, h: 256,
    frames: [
      { say: fill(tr('Checkpoint: mọi trang bẩn đã được ghi xuống đĩa, và điểm redo là {r}. Trang 7 trong bộ nhớ giống trên đĩa.', 'A checkpoint: every dirty page has been written to disk and the redo point is {r}. Page 7 in memory matches the disk.'), { r: m.redo }), nodes: draw({ n: 0 }) },
      { say: tr('Lần sửa đầu tiên của trang sau checkpoint: bản ghi WAL kèm ảnh toàn trang (full-page image), để phục hồi được cả khi trang trên đĩa bị ghi dở. Trang trong bộ nhớ thành bẩn, pd_lsn = LSN của bản ghi.', 'The page\'s first change after the checkpoint: the WAL record carries a full-page image, so recovery works even if the page on disk is torn. The page in memory is now dirty and its pd_lsn is the record\'s LSN.'), nodes: draw({ n: 1, dirty: true }) },
      { say: tr('Lần sửa tiếp theo trên cùng trang chỉ ghi phần thay đổi: bản ghi nhỏ, không có ảnh trang.', 'The next change to the same page logs only the change: a small record, no page image.'), nodes: draw({ n: Math.min(2, recs.length), dirty: true }) },
      { say: fill(tr('COMMIT: WAL được fsync tới {l} là đủ bền. Trang dữ liệu vẫn chỉ ở bộ nhớ; checkpointer ghi nó sau. Luật WAL: log xuống đĩa trước trang.', 'COMMIT: fsyncing the WAL up to {l} is enough to be durable. The data page is still only in memory; the checkpointer writes it later. The WAL rule: the log reaches disk before the page.'), { l: last }), nodes: draw({ n: recs.length, dirty: true, flushed: true }) },
      { say: tr('Sập: bộ nhớ mất hết. Trang 7 trên đĩa vẫn là bản cũ (có thể ghi dở), nhưng WAL đã commit nằm an toàn trên đĩa.', 'A crash: memory is gone. Page 7 on disk is the old version (possibly torn), but the committed WAL is safe on disk.'), nodes: draw({ n: recs.length, flushed: true, crash: true }) },
      { say: tr('Khởi động lại: đọc WAL từ điểm redo, ảnh toàn trang dựng lại trang, rồi áp từng bản ghi sau đó. pd_lsn đuổi kịp bản ghi cuối, dữ liệu đã commit trở lại.', 'On restart, WAL is read from the redo point: the full-page image rebuilds the page, then each later record is applied. pd_lsn catches up with the last record and the committed data is back.'), nodes: draw({ n: recs.length, flushed: true, crash: true, replay: recs.length - 1 }) },
    ],
  };
});
