import { box, cut, define, fill, line, num, type Shape, text, type Tone } from './engineVizCore';

// ENG-VIZ Postgres index diagrams (knowledge map P6, P7, P9): B-tree, GIN, BRIN, GiST.

// ── btree ───────────────────────────────────────────────────────────────────────────────────────────────────────
/** Leaf pages of a two-level B-tree (sorted keys), the key to insert and the leaf capacity (keys per page). */
export interface BtreeModel { leaves: number[][]; insert: number; cap?: number }
type Key = { v: string; k: string; tone?: Tone };
define<BtreeModel>('pg-btree', { leaves: [[3, 8, 12, 15], [20, 25, 28, 29], [41, 44, 47]], insert: 27, cap: 4 }, (m, tr) => {
  const cap = m.cap ?? 4;
  const kw = (k: Key) => Math.max(18, k.v.length * 6.6 + 6);
  const leafW = (l: Key[]) => Math.max(40, l.reduce((a, k) => a + kw(k), 0) + 8);
  /** Draws root + leaves; `hl` = search path leaf, `tones` per leaf. */
  const tree = (leaves: Key[][], o: { hl?: number; leafTone?: (Tone | undefined)[]; rootNew?: string; edgeGhost?: number } = {}): Shape[] => {
    const ws = leaves.map(leafW);
    const total = ws.reduce((a, b) => a + b, 0) + 10 * (leaves.length - 1);
    let x = (340 - total) / 2;
    const xs = ws.map((w) => { const at = x; x += w + 10; return at; });
    const seps = leaves.slice(1).map((l) => l[0]);
    const rw = Math.max(48, seps.length * 22 + 14);
    const rx = 170 - rw / 2;
    const out: Shape[] = [{ k: 'root', t: 'r', x: rx, y: 26, w: rw, h: 28, tone: o.hl !== undefined ? 'new' : 'cell' }, text('rootl', rx, 18, tr('gốc', 'root'), { size: 9.5, ink: 'muted' })];
    seps.forEach((s, i) => out.push(text(`s${s.k}`, rx + 14 + i * 22, 40, s.v, { a: 'm', b: true, size: 11, ink: o.rootNew === s.k ? 'new' : 'ink' })));
    leaves.forEach((l, i) => {
      const cx = xs[i] + ws[i] / 2;
      const hot = o.hl === i;
      out.push(line(`e${i}`, 170 - rw / 2 + 7 + i * (rw - 14) / Math.max(1, leaves.length - 1), 54, cx, 110, { ink: hot ? 'new' : 'edge', w: hot ? 2.2 : 1.2, dash: o.edgeGhost === i }));
      out.push({ k: `leaf${i}`, t: 'r', x: xs[i], y: 112, w: ws[i], h: 30, tone: o.leafTone?.[i] ?? (hot ? 'new' : 'cell') });
      let kx = xs[i] + 4;
      l.forEach((key) => { kx += kw(key); out.push(text(key.k, kx - kw(key) / 2, 127, key.v, { a: 'm', size: 11, b: true, ink: key.tone === 'dead' ? 'dead' : key.tone === 'new' ? 'new' : 'ink' })); });
      if (i) out.push(line(`sib${i}`, xs[i - 1] + ws[i - 1], 152, xs[i], 152, { ink: 'ptr', arrow: true, w: 1 }));
    });
    out.push(text('leafl', 10, 166, tr('lá (nối anh em →)', 'leaves (sibling links →)'), { size: 9.5, ink: 'muted' }));
    return out;
  };
  const K = (v: number, tone?: Tone, suffix = ''): Key => ({ v: String(v), k: `k${v}${suffix}`, tone });
  const base = m.leaves.map((l) => l.toSorted((a, b) => a - b).map((v) => K(v)));
  const target = Math.max(0, base.findIndex((l, i) => i === base.length - 1 || m.insert < Number(base[i + 1][0].v)));
  const withNew = base.map((l, i) => (i === target ? [...l, K(m.insert, 'new')].sort((a, b) => Number(a.v) - Number(b.v)) : l));
  const over = withNew[target].length > cap;
  const half = Math.ceil(withNew[target].length / 2);
  const split = over ? [...withNew.slice(0, target), withNew[target].slice(0, half), withNew[target].slice(half), ...withNew.slice(target + 1)] : withNew;
  const sepKey = over ? withNew[target][half] : undefined;
  // deduplication on the last leaf: two more copies of its middle key
  const li = split.length - 1;
  const dupV = Number(split[li][Math.floor((split[li].length - 1) / 2)].v);
  const dupLeaf = [...split[li], K(dupV, 'new', 'b'), K(dupV, 'new', 'c')].sort((a, b) => Number(a.v) - Number(b.v));
  const posting = split[li].map((k) => (Number(k.v) === dupV ? { v: `${dupV}×3`, k: k.k, tone: 'new' as Tone } : k));
  const withDup = (l: Key[]) => split.map((x, i) => (i === li ? l : x));
  // bottom-up deletion on the first leaf: old versions of one key pile up
  const churnV = Number(split[0][Math.min(1, split[0].length - 1)].v);
  const churn = [...split[0], K(churnV, 'dead', 'x'), K(churnV, 'dead', 'y')].sort((a, b) => Number(a.v) - Number(b.v));
  const frames = [
    { say: tr('B-tree hai tầng: gốc giữ khóa phân cách, lá giữ mọi khóa đã sắp, mỗi lá trỏ sang lá bên phải. Mỗi trang lá ở đây chứa tối đa {cap} khóa.', 'A two-level B-tree: the root holds separator keys, the leaves hold every key in order, and each leaf links to its right sibling. Each leaf page here holds at most {cap} keys.'), nodes: tree(base) },
    { say: tr('Tìm chỗ cho {x}: so với khóa ở gốc, đi xuống đúng một lá. Chiều cao cây quyết định số trang phải đọc.', 'Finding a place for {x}: compare with the root\'s keys and go down to exactly one leaf. The tree\'s height is the number of pages read.'), nodes: tree(base, { hl: target }) },
    over
      ? { say: tr('Chèn {x}: lá đã có {cap} khóa nên giờ quá đầy.', 'Inserting {x}: the leaf already had {cap} keys, so it is now over full.'), nodes: tree(withNew, { leafTone: withNew.map((_, i) => (i === target ? 'warm' : undefined)) }) }
      : { say: tr('Chèn {x}: lá còn chỗ, xong.', 'Inserting {x}: the leaf has room, done.'), nodes: tree(withNew, { hl: target }) },
  ];
  if (over && sepKey) {
    const noSep = split.map((l) => l); // the root draws separators from leaves; hide the new one until it is copied up
    frames.push({ say: tr('Tách trang: nửa trái giữ lại, nửa phải sang trang mới. Cha chưa biết trang mới.', 'Page split: the left half stays, the right half moves to a new page. The parent does not know the new page yet.'), nodes: tree(noSep, { leafTone: split.map((_, i) => (i === target + 1 ? 'new' : undefined)), edgeGhost: target + 1 }).filter((s) => s.k !== `s${sepKey.k}`) });
    frames.push({ say: tr('Khóa đầu của trang mới ({s}) được chép lên cha làm khóa phân cách. Cha còn chỗ nên dừng; nếu cha cũng đầy, nó tách tiếp và cây có thể cao thêm một tầng.', 'The new page\'s first key ({s}) is copied up to the parent as a separator. The parent has room, so it stops; a full parent would split too, and the tree could grow one level.').replace('{s}', sepKey.v), nodes: tree(split, { rootNew: sepKey.k, leafTone: split.map((_, i) => (i === target + 1 ? 'new' : undefined)) }) });
  }
  if (dupLeaf.length > cap) {
    frames.push({ say: tr('Thêm hai bản trùng khóa {d}: lá sắp phải tách…', 'Two more duplicates of key {d}: the leaf is about to split…').replace('{d}', String(dupV)), nodes: tree(withDup(dupLeaf), { leafTone: split.map((_, i) => (i === li ? 'warm' : undefined)) }) });
    frames.push({ say: tr('…nhưng trước đó, deduplication gộp các bản trùng thành một posting list: một khóa {d} với 3 TID. Lá vừa chỗ, không tách. (Không áp dụng cho index có INCLUDE, numeric, jsonb.)', '…but first, deduplication merges the duplicates into one posting list: one key {d} with 3 TIDs. The leaf fits and does not split. (Not for indexes with INCLUDE, numeric or jsonb.)').replace(/\{d\}/g, String(dupV)), nodes: tree(withDup(posting)) });
  }
  if (churn.length > cap) {
    const ch = (l: Key[]) => split.map((x, i) => (i === 0 ? l : i === li ? posting : x));
    frames.push({ say: tr('UPDATE không HOT lặp lại trên một dòng để lại nhiều mục index trỏ tới các phiên bản cũ ({c}, gạch đỏ): lá 1 sắp tách.', 'Repeated non-HOT UPDATEs of one row leave index entries pointing at old versions ({c}, in red): leaf 1 is about to split.').replace('{c}', String(churnV)), nodes: tree(ch(churn), { leafTone: split.map((_, i) => (i === 0 ? 'warm' : undefined)) }) });
    frames.push({ say: tr('Bottom-up deletion (từ PG 14): trước khi tách, Postgres kiểm tra heap và xóa các mục trỏ tới phiên bản đã chết. Lá vừa chỗ lại, cây không phình.', 'Bottom-up deletion (since PG 14): before splitting, Postgres checks the heap and deletes the entries that point at dead versions. The leaf fits again and the tree does not bloat.'), nodes: tree(ch(split[0])) });
  }
  frames.forEach((f) => (f.say = fill(f.say, { x: m.insert, cap })));
  return { title: tr('B-tree: tìm, chèn, tách trang', 'B-tree: search, insert, page split'), w: 340, h: 176, frames };
});

// ── ginPostings ─────────────────────────────────────────────────────────────────────────────────────────────────
export interface GinModel { docs: string[]; query: [string, string]; added: string }
define<GinModel>('pg-gin-postings', { docs: ['red apple pie', 'green apple', 'apple pie recipe', 'red wine', 'pie crust'], query: ['apple', 'pie'], added: 'apple tart' }, (m, tr) => {
  const docs = m.docs.slice(0, 6);
  const words = (d: string) => [...new Set(d.toLowerCase().split(/\W+/).filter(Boolean))];
  const index = (ds: string[]) => {
    const map = new Map<string, number[]>();
    ds.forEach((d, i) => words(d).forEach((w) => map.set(w, [...(map.get(w) ?? []), i + 1])));
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(0, 9);
  };
  const [qa, qb] = m.query;
  const hit = (index(docs).find(([w]) => w === qa)?.[1] ?? []).filter((i) => index(docs).find(([w]) => w === qb)?.[1].includes(i));
  type St = { entries?: boolean; tree?: boolean; q?: boolean; and?: boolean; pending?: boolean; merged?: boolean };
  const draw = (s: St): Shape[] => {
    const all = s.merged ? [...docs, m.added] : docs;
    const out: Shape[] = [text('dh', 10, 12, tr('Dòng (tài liệu)', 'Rows (documents)'), { size: 9.5, ink: 'muted' })];
    all.forEach((d, i) => {
      const on = s.and && hit.includes(i + 1);
      out.push(...box(`d${i}`, 10, 22 + i * 24, 128, 20, '', on ? 'new' : 'cell'), text(`dt${i}`, 16, 32 + i * 24, `${i + 1}  ${cut(d, 17)}`, { size: 10, mono: true }));
    });
    if (!s.entries) return out;
    out.push(text('eh', 150, 12, tr('Mục từ → danh sách TID', 'Entry → posting list'), { size: 9.5, ink: 'muted' }));
    index(all).forEach(([w, ids], r) => {
      const y = 22 + r * 22;
      const q = s.q && (w === qa || w === qb);
      out.push(...box(`w${w}`, 150, y, 62, 18, cut(w, 8), q ? 'ptr' : 'cell'));
      if (s.tree && ids.length >= 3) {
        out.push(...box(`pt${w}`, 218, y, 110, 18, tr(`posting tree · ${ids.length}`, `posting tree · ${ids.length}`), q ? 'ptr' : 'new'));
        return;
      }
      ids.slice(0, 6).forEach((id, j) => out.push(...box(`p${w}.${id}`, 218 + j * 19, y, 17, 18, String(id), s.and && q && hit.includes(id) ? 'new' : q ? 'ptr' : 'plain')));
    });
    if (s.pending) out.push(...box('pend', 150, 228, 178, 26, tr(`pending: "${cut(m.added, 12)}"`, `pending: "${cut(m.added, 12)}"`), 'warm'));
    return out;
  };
  return {
    title: tr('GIN: index đảo ngược', 'GIN: an inverted index'), w: 340, h: 262,
    frames: [
      { say: tr('Mỗi dòng chứa nhiều thành phần (từ, phần tử mảng, khóa jsonb).', 'Each row holds many parts (words, array elements, jsonb keys).'), nodes: draw({}) },
      { say: tr('GIN tách thành phần và lưu mỗi giá trị đúng một lần, kèm danh sách TID (dòng chứa nó) đã sắp.', 'GIN splits out the parts and stores each value once, with a sorted list of TIDs (the rows that contain it).'), nodes: draw({ entries: true }) },
      { say: tr('Danh sách dài được chuyển ra một posting tree (B-tree của TID) thay vì nằm ngay trong mục.', 'A long list moves out into a posting tree (a B-tree of TIDs) instead of sitting in the entry.'), nodes: draw({ entries: true, tree: true }) },
      { say: fill(tr('Truy vấn "{a} & {b}": tra hai mục, lấy hai danh sách TID.', 'The query "{a} & {b}" looks up two entries and fetches their TID lists.'), { a: qa, b: qb }), nodes: draw({ entries: true, q: true }) },
      { say: fill(tr('Giao hai danh sách: chỉ dòng {r} có cả hai từ. Không phải đọc dòng nào khác.', 'Intersect the two lists: only row(s) {r} contain both words. No other row is read.'), { r: hit.join(', ') || '–' }), nodes: draw({ entries: true, q: true, and: true }) },
      { say: fill(tr('fastupdate: dòng mới "{d}" vào pending list chưa sắp, vì chèn vào nhiều mục cùng lúc rất đắt. Truy vấn phải đọc thêm danh sách này.', 'fastupdate: the new row "{d}" goes to an unsorted pending list, since inserting into many entries at once is costly. Queries must also scan that list.'), { d: m.added }), nodes: draw({ entries: true, pending: true }) },
      { say: tr('VACUUM, autoanalyze, gin_clean_pending_list() hoặc vượt gin_pending_list_limit sẽ dồn pending list vào các mục một lượt.', 'VACUUM, autoanalyze, gin_clean_pending_list() or passing gin_pending_list_limit merges the pending list into the entries in one batch.'), nodes: draw({ entries: true, merged: true }) },
    ],
  };
});

// ── brinRanges ──────────────────────────────────────────────────────────────────────────────────────────────────
/** Rows like `brin_page_items` (blknum + the minmax summary) for the table in physical order, and a shuffled copy. */
export interface BrinModel { ranges: { blk: unknown; min: unknown; max: unknown }[]; shuffled?: { blk: unknown; min: unknown; max: unknown }[]; query: [number, number]; pagesPerRange?: number }
const RANGES = Array.from({ length: 8 }, (_, i) => ({ blk: i * 128, min: i * 1000 + 1, max: i * 1000 + 1000 }));
define<BrinModel>('pg-brin-ranges', {
  ranges: RANGES, query: [2500, 3400],
  shuffled: RANGES.map((r, i) => ({ blk: r.blk, min: 3 + i * 7, max: 7990 - i * 11 })),
}, (m, tr) => {
  const rs = (list: BrinModel['ranges']) => list.slice(0, 8).map((r) => ({ blk: num(r.blk) ?? 0, min: num(r.min) ?? 0, max: num(r.max) ?? 0 }));
  const sorted = rs(m.ranges);
  const shuf = rs(m.shuffled ?? m.ranges);
  const ppr = m.pagesPerRange ?? 128;
  const hi = Math.max(...[...sorted, ...shuf].map((r) => r.max), m.query[1], 1);
  const X0 = 112;
  const X1 = 330;
  const sx = (v: number) => X0 + (v / hi) * (X1 - X0);
  const [lo, up] = m.query;
  const draw = (list: typeof sorted, s: { bars?: boolean; q?: boolean; pick?: boolean }): Shape[] => {
    const out: Shape[] = [line('ax', X0, 210, X1, 210, { ink: 'edge' }), text('a0', X0, 222, '0', { size: 9.5, ink: 'muted', a: 'm' }), text('a1', X1, 222, String(hi), { size: 9.5, ink: 'muted', a: 'e' })];
    if (s.q) out.push({ k: 'band', t: 'r', x: sx(lo), y: 18, w: Math.max(2, sx(up) - sx(lo)), h: 188, tone: 'ptr', o: 0.4 }, text('bandt', 330, 10, `${lo}–${up}`, { a: 'e', size: 9.5, ink: 'ptr', mono: true }));
    list.forEach((r, i) => {
      const y = 22 + i * 23;
      const overlap = r.max >= lo && r.min <= up;
      const tone: Tone = s.pick ? (overlap ? 'new' : 'ghost') : 'cell';
      out.push(...box(`r${i}`, 10, y, 94, 19, '', tone), text(`rt${i}`, 16, y + 10, `blk ${r.blk}–${r.blk + ppr - 1}`, { size: 9.5, mono: true }));
      if (s.bars) out.push({ k: `b${i}`, t: 'r', x: sx(r.min), y: y + 4, w: Math.max(3, sx(r.max) - sx(r.min)), h: 11, tone: s.pick ? (overlap ? 'new' : 'ghost') : 'live' });
    });
    return out;
  };
  const read = (list: typeof sorted) => list.filter((r) => r.max >= lo && r.min <= up).length;
  return {
    title: tr('BRIN: tóm tắt từng dải trang', 'BRIN: a summary per block range'), w: 340, h: 230,
    frames: [
      { say: fill(tr('Bảng được chia thành các dải {p} trang liền nhau theo thứ tự vật lý.', 'The table is cut into ranges of {p} consecutive pages, in physical order.'), { p: ppr }), nodes: draw(sorted, {}) },
      { say: tr('Mỗi dải chỉ lưu min và max của cột: index rất nhỏ. Ở đây dữ liệu chèn theo thứ tự, nên các dải không chồng lên nhau.', 'Each range stores only the column\'s min and max: a tiny index. Here the data was inserted in order, so the ranges do not overlap.'), nodes: draw(sorted, { bars: true }) },
      { say: fill(tr('Truy vấn WHERE cột BETWEEN {a} AND {b}.', 'The query WHERE column BETWEEN {a} AND {b}.'), { a: lo, b: up }), nodes: draw(sorted, { bars: true, q: true }) },
      { say: fill(tr('Chỉ dải có [min, max] giao khoảng hỏi mới phải đọc: {n}/{t} dải. Kết quả là lossy, nên Bitmap Heap Scan kiểm lại từng dòng (Recheck Cond).', 'Only ranges whose [min, max] meets the asked interval are read: {n} of {t}. The result is lossy, so the Bitmap Heap Scan rechecks each row (Recheck Cond).'), { n: read(sorted), t: sorted.length }), nodes: draw(sorted, { bars: true, q: true, pick: true }) },
      { say: tr('Cùng dữ liệu nhưng xáo trộn vị trí: mỗi dải có cả giá trị nhỏ và lớn, min/max trải gần hết trục.', 'The same values in shuffled order: every range has small and large values, so min/max span nearly the whole axis.'), nodes: draw(shuf, { bars: true, q: true }) },
      { say: fill(tr('Giờ {n}/{t} dải đều giao khoảng hỏi: BRIN không loại được gì. BRIN chỉ có ích khi giá trị tương quan với thứ tự vật lý.', 'Now {n} of {t} ranges meet the interval: BRIN rules nothing out. BRIN only helps when values follow the physical order.'), { n: read(shuf), t: shuf.length }), nodes: draw(shuf, { bars: true, q: true, pick: true }) },
    ],
  };
});

// ── gistBoxes ───────────────────────────────────────────────────────────────────────────────────────────────────
/** Points in a 0..100 square, the KNN query point and k. */
export interface GistModel { points: [number, number][]; query: [number, number]; k?: number }
define<GistModel>('pg-gist-boxes', {
  points: [[8, 14], [18, 30], [12, 42], [40, 70], [52, 82], [46, 60], [78, 22], [88, 36], [70, 12]],
  query: [58, 48], k: 2,
}, (m, tr) => {
  const P = 200;
  const sx = (v: number) => 14 + (v / 100) * P;
  const sy = (v: number) => 14 + (1 - v / 100) * P;
  const pts = m.points.slice(0, 12).map(([x, y], i) => ({ x, y, i }));
  const per = Math.ceil(pts.length / 3);
  const groups = pts.toSorted((a, b) => a.x - b.x).reduce<(typeof pts)[]>((g, p, j) => { (g[Math.floor(j / per)] ??= []).push(p); return g; }, []);
  const mbr = (g: typeof pts) => ({ x0: Math.min(...g.map((p) => p.x)), x1: Math.max(...g.map((p) => p.x)), y0: Math.min(...g.map((p) => p.y)), y1: Math.max(...g.map((p) => p.y)) });
  const boxes = groups.map(mbr);
  const [qx, qy] = m.query;
  const k = m.k ?? 2;
  const dBox = (b: ReturnType<typeof mbr>) => Math.hypot(Math.max(b.x0 - qx, 0, qx - b.x1), Math.max(b.y0 - qy, 0, qy - b.y1));
  const order = boxes.map((b, i) => ({ i, d: dBox(b) })).sort((a, b) => a.d - b.d);
  const dist = (p: { x: number; y: number }) => Math.hypot(p.x - qx, p.y - qy);
  // best-first: visit boxes by distance until the k-th best point is closer than the next box
  const visited: number[] = [];
  let best: typeof pts = [];
  for (const o of order) {
    if (best.length >= k && dist(best[k - 1]) <= o.d) break;
    visited.push(o.i);
    best = [...best, ...groups[o.i]].sort((a, b) => dist(a) - dist(b)).slice(0, k);
  }
  type St = { leaf?: boolean; root?: boolean; q?: boolean; first?: boolean; done?: boolean };
  const pad = 4;
  const draw = (s: St): Shape[] => {
    const out: Shape[] = [{ k: 'plane', t: 'r', x: 10, y: 10, w: P + 8, h: P + 8, tone: 'plain' }];
    if (s.root) {
      const r = mbr(pts);
      out.push({ k: 'rootb', t: 'r', x: sx(r.x0) - pad - 4, y: sy(r.y1) - pad - 4, w: sx(r.x1) - sx(r.x0) + 2 * pad + 8, h: sy(r.y0) - sy(r.y1) + 2 * pad + 8, tone: 'ghost' });
    }
    if (s.leaf) boxes.forEach((b, i) => {
      const on = s.first && visited.includes(i);
      out.push({ k: `lb${i}`, t: 'r', x: sx(b.x0) - pad, y: sy(b.y1) - pad, w: sx(b.x1) - sx(b.x0) + 2 * pad, h: sy(b.y0) - sy(b.y1) + 2 * pad, tone: on ? 'new' : s.done ? 'ghost' : 'ptr', o: s.done && !on ? 0.5 : 0.7 });
    });
    pts.forEach((p) => out.push({ k: `p${p.i}`, t: 'c', x: sx(p.x), y: sy(p.y), r: 4, tone: s.done && best.includes(p) ? 'new' : 'live' }));
    if (s.q) out.push({ k: 'q', t: 'c', x: sx(qx), y: sy(qy), r: 5, tone: 'warm' }, text('qt', sx(qx) + 8, sy(qy), 'q', { b: true, ink: 'warm' }));
    if (s.done) best.forEach((p, j) => out.push(line(`nn${j}`, sx(qx), sy(qy), sx(p.x), sy(p.y), { ink: 'new', w: 1.6 })));
    // the tree on the right
    out.push(text('th', 232, 20, tr('cây GiST', 'GiST tree'), { size: 9.5, ink: 'muted' }));
    if (s.root) out.push(...box('tr', 252, 30, 56, 22, 'root', 'cell'));
    if (s.leaf) boxes.forEach((_, i) => {
      out.push(...box(`tl${i}`, 232 + i * 34, 80, 30, 22, `L${i + 1}`, s.first && visited.includes(i) ? 'new' : 'ptr'));
      if (s.root) out.push(line(`te${i}`, 280, 52, 247 + i * 34, 78, { ink: 'edge', w: 1 }));
    });
    if (s.first) order.forEach((o, j) => out.push(text(`od${o.i}`, 232, 124 + j * 16, tr(`L${o.i + 1}: cách ${o.d.toFixed(1)}`, `L${o.i + 1}: dist ${o.d.toFixed(1)}`), { size: 9.5, mono: true, ink: visited.includes(o.i) ? 'new' : 'muted' })));
    return out;
  };
  return {
    title: tr('GiST: hộp bao kiểu R-tree', 'GiST: R-tree style bounding boxes'), w: 340, h: 228,
    frames: [
      { say: fill(tr('{n} điểm trên mặt phẳng (cột kiểu point).', '{n} points on a plane (a point column).'), { n: pts.length }), nodes: draw({}) },
      { say: tr('Trang lá gom các điểm gần nhau; mục index ở tầng trên chỉ lưu hộp bao (bounding box) của từng nhóm.', 'Leaf pages group nearby points; the entries above store only each group\'s bounding box.'), nodes: draw({ leaf: true }) },
      { say: tr('Gốc giữ hộp bao của các hộp con. Hộp được phép chồng nhau, khác với B-tree.', 'The root holds the boxes of its children. Boxes may overlap, unlike B-tree keys.'), nodes: draw({ leaf: true, root: true }) },
      { say: fill(tr('KNN: ORDER BY p <-> q LIMIT {k}. Tính khoảng cách từ q tới mỗi hộp.', 'KNN: ORDER BY p <-> q LIMIT {k}. Measure the distance from q to each box.'), { k }), nodes: draw({ leaf: true, root: true, q: true }) },
      { say: fill(tr('Duyệt hộp gần nhất trước ({v}). Dừng khi điểm thứ {k} tìm được gần hơn hộp kế tiếp.', 'Visit the nearest box first ({v}). Stop once the {k}-th point found is closer than the next box.'), { v: visited.map((i) => `L${i + 1}`).join(', '), k }), nodes: draw({ leaf: true, root: true, q: true, first: true }) },
      { say: fill(tr('Kết quả: {k} điểm gần nhất; {s} hộp không cần mở. Index chỉ lọc thô bằng hộp, khoảng cách thật được tính trên từng điểm.', 'The answer: the {k} nearest points; {s} box(es) never opened. The index filters coarsely by box; the real distance is computed per point.'), { k, s: boxes.length - visited.length }), nodes: draw({ leaf: true, root: true, q: true, first: true, done: true }) },
    ],
  };
});
