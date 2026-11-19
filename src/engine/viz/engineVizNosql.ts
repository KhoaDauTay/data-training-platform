import { box, cut, define, fill, line, type Shape, text, type Tone } from './engineVizCore';

// ENG-VIZ MongoDB and DynamoDB diagrams (knowledge map §5–§6). Its own lazy chunk `engineVizNosql`, imported by
// engineViz's loadViz(); it reuses the engine from the engineViz chunk.

// ── bsonDoc ─────────────────────────────────────────────────────────────────────────────────────────────────────
type Bson = { name: string; type: string; size: number; preview: string; depth: number; arr?: boolean };
/** Flattens a document into BSON elements with their real encoded size (type byte + cstring name + value). */
export function bsonRows(doc: Record<string, unknown>, depth = 0, out: Bson[] = []): { rows: Bson[]; size: number } {
  let size = 5; // int32 length + trailing 0x00
  for (const [name, v] of Object.entries(doc)) {
    const head = 1 + new TextEncoder().encode(name).length + 1;
    const row: Bson = { name, type: 'null', size: head, preview: 'null', depth };
    out.push(row);
    const o = v as Record<string, unknown>;
    if (typeof v === 'string') Object.assign(row, { type: 'string', size: head + 4 + new TextEncoder().encode(v).length + 1, preview: `"${v}"` });
    else if (typeof v === 'boolean') Object.assign(row, { type: 'bool', size: head + 1, preview: String(v) });
    else if (typeof v === 'number') {
      const int = Number.isInteger(v) && Math.abs(v) < 2 ** 31;
      Object.assign(row, { type: int ? 'int32' : 'double', size: head + (int ? 4 : 8), preview: String(v) });
    } else if (v && typeof o.$oid === 'string') Object.assign(row, { type: 'objectId', size: head + 12, preview: `${String(o.$oid).slice(0, 8)}…` });
    else if (v && typeof o.$date === 'string') Object.assign(row, { type: 'date', size: head + 8, preview: String(o.$date).slice(0, 10) });
    else if (v && typeof v === 'object') {
      const arr = Array.isArray(v);
      const inner = arr ? Object.fromEntries((v as unknown[]).map((x, i) => [String(i), x])) : o;
      const sub = bsonRows(inner, depth + 1, out);
      Object.assign(row, { type: arr ? 'array' : 'object', size: head + sub.size, preview: arr ? `[${(v as unknown[]).length}]` : '{…}', arr });
    }
    size += row.size;
  }
  return { rows: out, size };
}
define<Record<string, unknown>>('bsonDoc', {
  _id: { $oid: '665f1c2ab4e0a1d2c3f4e5a6' }, name: 'Lan', age: 31, score: 4.5, tags: ['vip', 'new'], addr: { city: 'Hue' }, joined: { $date: '2026-10-31T00:00:00Z' },
}, (doc, tr) => {
  const { rows: all, size } = bsonRows(doc);
  const rows = all.slice(0, 11);
  const top = rows.filter((r) => r.depth === 0);
  type St = { types?: boolean; sizes?: boolean; nest?: boolean; strip?: boolean };
  const draw = (s: St): Shape[] => {
    const out: Shape[] = [text('h1', 10, 12, tr('trường', 'field'), { size: 9.5, ink: 'muted' })];
    if (s.types) out.push(text('h2', 124, 12, tr('kiểu BSON', 'BSON type'), { size: 9.5, ink: 'muted' }));
    if (s.sizes) out.push(text('h3', 330, 12, tr('byte', 'bytes'), { size: 9.5, ink: 'muted', a: 'e' }));
    rows.forEach((r, i) => {
      const y = 22 + i * 21;
      const nested = r.depth > 0;
      const hot = s.nest && (nested || r.type === 'array' || r.type === 'object');
      out.push({ k: `row${i}`, t: 'r', x: 10 + r.depth * 12, y, w: 320 - r.depth * 12, h: 18, tone: hot ? 'new' : 'plain' });
      out.push(text(`n${i}`, 16 + r.depth * 12, y + 9, cut(r.name, 10), { size: 10, b: true, mono: true }));
      out.push(text(`v${i}`, s.types ? 196 : 100, y + 9, cut(r.preview, s.types ? 13 : 24), { size: 10, mono: true, ink: 'muted' }));
      if (s.types) out.push(...box(`ty${i}`, 122, y + 2, 64, 14, r.type, r.type === 'array' || r.type === 'object' ? 'ptr' : 'cell'));
      if (s.sizes) out.push(text(`b${i}`, 326, y + 9, String(r.size), { size: 10, mono: true, a: 'e' }));
    });
    if (s.strip) {
      const y = 22 + rows.length * 21 + 10;
      const sx = (b: number) => 10 + (b / size) * 320;
      let at = 4;
      out.push(...box('len', sx(0), y, Math.max(14, sx(4) - sx(0)), 20, '', 'ptr'));
      top.forEach((r, i) => {
        out.push(...box(`seg${i}`, sx(at), y, sx(at + r.size) - sx(at) - 1, 20, '', i % 2 ? 'cell' : 'new'));
        at += r.size;
      });
      out.push(...box('eoo', sx(size - 1), y, Math.max(4, sx(size) - sx(size - 1)), 20, '', 'ptr'));
      out.push(text('tot', 330, y + 32, fill(tr('tổng {n} byte', 'total {n} bytes'), { n: size }), { a: 'e', size: 10, b: true }));
    }
    return out;
  };
  const nested = rows.filter((r) => r.depth > 0).length;
  return {
    title: tr('Tài liệu BSON', 'A BSON document'), w: 340, h: 22 + rows.length * 21 + 76,
    frames: [
      { say: tr('Một tài liệu MongoDB: các cặp tên trường và giá trị, có thể lồng nhau.', 'A MongoDB document: field names and values, which may nest.'), nodes: draw({}) },
      { say: tr('Trên đĩa và trên mạng nó là BSON: mỗi giá trị mang một kiểu (int32, double, string, objectId, date…), nên 31 và 31.0 là hai kiểu khác nhau.', 'On disk and on the wire it is BSON: every value carries a type (int32, double, string, objectId, date…), so 31 and 31.0 are different types.'), nodes: draw({ types: true }) },
      { say: tr('Mỗi phần tử tốn 1 byte kiểu + tên trường (kết thúc bằng 0) + giá trị. Tên trường lặp lại trong mọi tài liệu, nên tên ngắn tiết kiệm chỗ.', 'Each element costs 1 type byte + the field name (zero-terminated) + the value. Field names repeat in every document, so short names save space.'), nodes: draw({ types: true, sizes: true }) },
      { say: fill(tr('Tài liệu con và mảng là BSON lồng bên trong ({n} phần tử). Mảng chỉ là một tài liệu có khóa "0", "1", "2"…', 'Embedded documents and arrays are nested BSON ({n} elements). An array is just a document with keys "0", "1", "2"…'), { n: nested }), nodes: draw({ types: true, sizes: true, nest: true }) },
      { say: fill(tr('Cả tài liệu: 4 byte độ dài, các phần tử nối nhau, 1 byte 0 kết thúc: {n} byte. Giới hạn mỗi tài liệu là 16 MB.', 'The whole document: a 4-byte length, the elements back to back, a closing 0 byte: {n} bytes. Each document is limited to 16 MB.'), { n: size }), nodes: draw({ types: true, sizes: true, strip: true }) },
    ],
  };
});

// ── compoundIndexESR ────────────────────────────────────────────────────────────────────────────────────────────
export interface EsrModel { docs: { status: string; created: number; total: number }[]; eq: string; min: number }
define<EsrModel>('compoundIndexESR', {
  eq: 'A', min: 50,
  docs: [[1, 70], [2, 20], [3, 90], [4, 55], [5, 10], [6, 80]].flatMap(([c, t]) => [{ status: 'A', created: c, total: t }, { status: 'B', created: c, total: (t * 7) % 100 }]),
}, (m, tr) => {
  const docs = m.docs.slice(0, 12);
  const match = (d: EsrModel['docs'][number]) => d.status === m.eq && d.total > m.min;
  type Ord = 'esr' | 'ers';
  const sorted = (o: Ord) => [...docs].sort((a, b) => a.status.localeCompare(b.status) || (o === 'esr' ? b.created - a.created || a.total - b.total : a.total - b.total || b.created - a.created));
  const scanned = (o: Ord) => sorted(o).filter((d) => d.status === m.eq && (o === 'esr' || d.total > m.min));
  const draw = (o: Ord | undefined, s: { scan?: boolean; result?: boolean }): Shape[] => {
    const out: Shape[] = [...box('q', 10, 4, 320, 34, `find({ status: "${m.eq}", total: { $gt: ${m.min} } })`, 'cell', '.sort({ created: -1 })')];
    if (!o) return [...out, ...box('e', 10, 46, 100, 30, 'E · status', 'ptr', tr('bằng', 'equality')), ...box('s', 120, 46, 100, 30, 'S · created', 'new', tr('sắp xếp', 'sort')), ...box('r', 230, 46, 100, 30, 'R · total', 'warm', tr('khoảng', 'range'))];
    const cols = o === 'esr' ? ['status', 'created', 'total'] : ['status', 'total', 'created'];
    out.push(text('ih', 10, 50, `index { ${cols.map((c) => `${c}: ${c === 'created' ? -1 : 1}`).join(', ')} }`, { size: 10, mono: true, b: true }));
    const sc = scanned(o);
    sorted(o).forEach((d, i) => {
      const y = 60 + i * 17;
      const inScan = s.scan && sc.includes(d);
      const tone: Tone = inScan ? (match(d) ? 'new' : 'warm') : 'plain';
      out.push({ k: `row${d.status}${d.created}`, t: 'r', x: 10, y, w: 200, h: 15, tone });
      cols.forEach((c, j) => out.push(text(`c${d.status}${d.created}${c}`, 20 + j * 64, y + 8, `${c[0]}=${(d as Record<string, unknown>)[c]}`, { size: 10, mono: true })));
    });
    if (s.scan) out.push(text('ks', 222, 70, `keysExamined ${sc.length}`, { size: 10, mono: true }), text('nr', 222, 86, `nReturned ${sc.filter(match).length}`, { size: 10, mono: true }));
    if (s.result) out.push(...box('stage', 222, 100, 108, 30, o === 'esr' ? tr('không SORT', 'no SORT') : 'SORT', o === 'esr' ? 'live' : 'dead', o === 'esr' ? tr('đã đúng thứ tự', 'already in order') : tr('sắp trong RAM', 'in-memory sort')));
    return out;
  };
  return {
    title: tr('Index ghép và luật ESR', 'Compound indexes and the ESR rule'), w: 340, h: 270,
    frames: [
      { say: tr('Truy vấn có ba phần: so bằng (status), sắp xếp (created), khoảng (total > 50).', 'The query has three parts: an equality (status), a sort (created) and a range (total > 50).'), nodes: draw(undefined, {}) },
      { say: tr('Index { status, total, created } (E, R, S): khóa sắp theo status rồi total, nên quét liền một đoạn và chỉ đọc khóa khớp…', 'Index { status, total, created } (E, R, S): keys are ordered by status, then total, so the scan is one tight range of matching keys…'), nodes: draw('ers', { scan: true }) },
      { say: tr('…nhưng kết quả không theo created: MongoDB phải SORT trong bộ nhớ (chặn, có giới hạn RAM).', '…but the results are not in created order: MongoDB has to SORT in memory (blocking, with a memory limit).'), nodes: draw('ers', { scan: true, result: true }) },
      { say: tr('Index { status, created, total } (E, S, R): trong status = A các khóa đã theo created, nên không cần SORT. Đổi lại phải xem thêm vài khóa không khớp total (màu cam).', 'Index { status, created, total } (E, S, R): within status = A the keys already follow created, so no SORT. The price is a few keys that fail the total test (orange).'), nodes: draw('esr', { scan: true, result: true }) },
      { say: tr('Luật ESR: trường so bằng trước, rồi trường sắp xếp, rồi trường khoảng. Đọc explain("executionStats"): keysExamined gần nReturned và không có SORT là tốt.', 'The ESR rule: equality fields first, then sort fields, then range fields. In explain("executionStats"), keysExamined close to nReturned and no SORT stage is the goal.'), nodes: draw('esr', { result: true }) },
    ],
  };
});

// ── aggregationPipeline ─────────────────────────────────────────────────────────────────────────────────────────
export interface PipeModel { input: number; stages: { op: string; arg?: string; out: number }[] }
define<PipeModel>('aggregationPipeline', {
  input: 1000,
  stages: [
    { op: '$match', arg: 'status: "PAID"', out: 240 }, { op: '$unwind', arg: '"$lines"', out: 610 },
    { op: '$group', arg: '_id: "$store"', out: 12 }, { op: '$sort', arg: 'revenue: -1', out: 12 }, { op: '$limit', arg: '5', out: 5 },
  ],
}, (m, tr) => {
  const st = m.stages.slice(0, 7);
  const max = Math.max(m.input, ...st.map((s) => s.out), 1);
  const row = (k: string, i: number, label: string, sub: string, n: number, tone: Tone, prev?: number): Shape[] => {
    const y = 14 + i * 36;
    const w = Math.max(3, (n / max) * 100);
    return [
      ...box(k, 10, y, 132, 30, label, tone, cut(sub, 22)),
      { k: `${k}.bar`, t: 'r', x: 152, y: y + 8, w, h: 14, tone: prev !== undefined && n > prev ? 'warm' : 'live' },
      text(`${k}.n`, 158 + w, y + 15, tr(`${n} tài liệu`, `${n} docs`), { size: 10, b: true }),
    ];
  };
  const frame = (upto: number): Shape[] => [
    ...row('src', 0, 'collection', 'orders', m.input, 'cell'),
    ...st.slice(0, upto).flatMap((s, i) => [line(`ln${i}`, 76, 44 + i * 36, 76, 50 + i * 36, { ink: 'ptr', arrow: true }), ...row(`s${i}`, i + 1, s.op, s.arg ?? '', s.out, i === upto - 1 ? 'new' : 'cell', i ? st[i - 1].out : m.input)]),
  ];
  const sayOf = (s: PipeModel['stages'][number], prev: number): string => {
    const base = fill(tr('{op}: nhận {a}, chuyển {b} tài liệu cho bước sau.', '{op}: takes {a}, passes {b} documents on.'), { op: s.op, a: prev, b: s.out });
    if (s.op === '$match') return `${base} ${tr('Đặt $match sớm để các bước sau làm ít việc hơn (và dùng được index).', 'Put $match early so later stages do less work (and it can use an index).')}`;
    if (s.op === '$unwind') return `${base} ${tr('$unwind tách mảng: mỗi phần tử thành một tài liệu, nên số tài liệu tăng.', '$unwind splits an array: one document per element, so the count grows.')}`;
    if (s.op === '$group') return `${base} ${tr('$group gộp theo _id, giống GROUP BY.', '$group folds by _id, like GROUP BY.')}`;
    return base;
  };
  return {
    title: tr('Pipeline tổng hợp', 'The aggregation pipeline'), w: 340, h: 14 + (st.length + 1) * 36 + 4,
    frames: [
      { say: fill(tr('Collection có {n} tài liệu đi vào pipeline.', 'The collection\'s {n} documents enter the pipeline.'), { n: m.input }), nodes: frame(0) },
      ...st.map((s, i) => ({ say: sayOf(s, i ? st[i - 1].out : m.input), nodes: frame(i + 1) })),
    ],
  };
});

// ── replicaSetOplog ─────────────────────────────────────────────────────────────────────────────────────────────
define<{ writes: string[] }>('replicaSetOplog', { writes: ['insert x:1', 'update x:2'] }, (m, tr) => {
  const N = { P: [170, 44], S1: [70, 150], S2: [270, 150] } as const;
  type St = { names: [string, string, string]; down?: boolean; logs: [number, number, number]; pull?: boolean; ack?: boolean };
  const draw = (s: St): Shape[] => {
    const out: Shape[] = [];
    (['P', 'S1', 'S2'] as const).forEach((k, i) => {
      const [x, y] = N[k];
      const dead = s.down && k === 'P';
      out.push({ k: `n${k}`, t: 'c', x, y, r: 24, tone: dead ? 'dead' : s.names[i] === 'PRIMARY' ? 'new' : 'cell' }, text(`t${k}`, x, y, dead ? tr('sập', 'down') : s.names[i] === 'PRIMARY' ? 'P' : 'S', { a: 'm', b: true, size: 13 }));
      out.push(text(`r${k}`, x, y + 34, s.names[i], { a: 'm', size: 9.5, ink: 'muted', b: true }));
      for (let j = 0; j < s.logs[i]; j++) out.push(...box(`o${k}${j}`, k === 'P' ? x + 34 : x - 50, k === 'P' ? y - 18 + j * 20 : y + 44 + j * 20, 100, 17, cut(`ts ${j + 1} · ${m.writes[j] ?? 'op'}`, 20), dead ? 'ghost' : 'plain'));
    });
    if (s.pull) {
      const from = s.names.indexOf('PRIMARY');
      const src = (['P', 'S1', 'S2'] as const)[from];
      (['P', 'S1', 'S2'] as const).forEach((k) => {
        if (k === src || (s.down && k === 'P')) return;
        const [x1, y1] = N[src];
        const [x2, y2] = N[k];
        out.push(line(`p${k}`, x1 + (x2 - x1) * 0.2, y1 + (y2 - y1) * 0.2, x1 + (x2 - x1) * 0.78, y1 + (y2 - y1) * 0.78, { ink: 'ptr', arrow: true, dash: true }));
      });
    }
    if (s.ack) out.push(...box('ack', 236, 14, 94, 30, 'ack w:majority', 'live'));
    return out;
  };
  const w = m.writes.length >= 2 ? 2 : 1;
  return {
    title: tr('Replica set và oplog', 'Replica set and the oplog'), w: 340, h: 250,
    frames: [
      { say: tr('Replica set ba nút: một PRIMARY nhận mọi lệnh ghi, hai SECONDARY giữ bản sao.', 'A three-node replica set: one PRIMARY takes every write, two SECONDARY nodes keep copies.'), nodes: draw({ names: ['PRIMARY', 'SECONDARY', 'SECONDARY'], logs: [0, 0, 0] }) },
      { say: tr('Lệnh ghi được áp trên PRIMARY và ghi thành một mục oplog (collection có giới hạn, theo thứ tự thời gian ts).', 'A write is applied on the PRIMARY and recorded as an oplog entry (a capped collection ordered by timestamp ts).'), nodes: draw({ names: ['PRIMARY', 'SECONDARY', 'SECONDARY'], logs: [w, 0, 0] }) },
      { say: tr('SECONDARY kéo oplog về và áp lại theo đúng thứ tự. Một nút có thể chậm hơn (replication lag).', 'SECONDARY nodes pull the oplog and replay it in order. One node may fall behind (replication lag).'), nodes: draw({ names: ['PRIMARY', 'SECONDARY', 'SECONDARY'], logs: [w, w, 1], pull: true }) },
      { say: tr('writeConcern "majority": client chỉ nhận ack khi đa số (2/3) nút đã có lệnh ghi. Lệnh ghi đó không bị mất khi đổi PRIMARY.', 'writeConcern "majority": the client gets its ack once a majority (2 of 3) has the write. That write survives a change of PRIMARY.'), nodes: draw({ names: ['PRIMARY', 'SECONDARY', 'SECONDARY'], logs: [w, w, 1], ack: true }) },
      { say: tr('PRIMARY sập. Hai nút còn lại bầu chọn; nút có oplog mới nhất và được đa số phiếu (2/3) thành PRIMARY mới.', 'The PRIMARY goes down. The other two hold an election; the node with the newest oplog that wins a majority (2 of 3) becomes the new PRIMARY.'), nodes: draw({ names: [tr('PRIMARY cũ', 'old PRIMARY'), 'PRIMARY', 'SECONDARY'], down: true, logs: [w, w, 1] }) },
      { say: tr('Nút chậm đuổi kịp từ PRIMARY mới. Lệnh ghi chỉ có trên PRIMARY cũ mà chưa tới đa số sẽ bị rollback khi nó quay lại.', 'The lagging node catches up from the new PRIMARY. A write that reached only the old PRIMARY, not a majority, is rolled back when it returns.'), nodes: draw({ names: [tr('PRIMARY cũ', 'old PRIMARY'), 'PRIMARY', 'SECONDARY'], down: true, logs: [w, w, w], pull: true }) },
    ],
  };
});

// ── shardChunks ─────────────────────────────────────────────────────────────────────────────────────────────────
define<{ shards: number }>('shardChunks', { shards: 3 }, (m, tr) => {
  const S = Math.min(3, Math.max(2, m.shards));
  const cw = 100;
  const sx = (i: number) => 10 + i * (cw + 10);
  type Chunk = { k: string; label: string; shard: number; slot: number; tone?: Tone };
  const ranged: Chunk[] = [
    { k: 'c0', label: '[min, 100)', shard: 0, slot: 0 }, { k: 'c1', label: '[100, 200)', shard: 1, slot: 0 },
    { k: 'c2', label: '[200, 300)', shard: 2 % S, slot: S > 2 ? 0 : 1 }, { k: 'c3', label: '[300, max)', shard: 0, slot: 1 },
  ];
  const draw = (chunks: Chunk[], o: { route?: number[]; scatter?: boolean; hot?: string; note?: string } = {}): Shape[] => {
    const out: Shape[] = [...box('mongos', 120, 8, 100, 28, 'mongos', 'ptr', tr('bộ định tuyến', 'router'))];
    for (let i = 0; i < S; i++) {
      out.push({ k: `sh${i}`, t: 'r', x: sx(i), y: 70, w: cw, h: 140, tone: 'plain' }, text(`sht${i}`, sx(i) + cw / 2, 84, `shard ${i + 1}`, { a: 'm', b: true, size: 10.5 }));
      const on = o.scatter || o.route?.includes(i);
      out.push(line(`rt${i}`, 170, 36, sx(i) + cw / 2, 68, { ink: on ? 'new' : 'edge', arrow: !!on, w: on ? 1.8 : 1, dash: !on }));
    }
    chunks.forEach((c) => out.push(...box(c.k, sx(c.shard) + 8, 96 + c.slot * 34, cw - 16, 28, c.label, c.k === o.hot ? 'dead' : c.tone ?? 'cell')));
    if (o.note) out.push(text('note', 10, 226, o.note, { size: 10, ink: 'muted' }));
    return out;
  };
  const split: Chunk[] = [...ranged.slice(0, 3), { k: 'c3', label: '[300, 400)', shard: 0, slot: 1, tone: 'new' }, { k: 'c4', label: '[400, max)', shard: 0, slot: 2, tone: 'new' }];
  const balanced = split.map((c) => (c.k === 'c4' ? { ...c, shard: 1, slot: 1 } : c));
  const hashed: Chunk[] = [0, 1, 2, 3, 4, 5].map((i) => ({ k: `h${i}`, label: `hash ${i * 6}…`, shard: i % S, slot: Math.floor(i / S), tone: 'ptr' as Tone }));
  return {
    title: tr('Sharding: chunk theo khóa shard', 'Sharding: chunks by shard key'), w: 340, h: 236,
    frames: [
      { say: tr('Collection được chia thành chunk theo khoảng giá trị của shard key; mỗi chunk nằm trên một shard.', 'The collection is split into chunks by ranges of the shard key; each chunk lives on one shard.'), nodes: draw(ranged) },
      { say: tr('Truy vấn có shard key (ví dụ key = 150): mongos gửi tới đúng một shard. Không có shard key thì phải hỏi mọi shard (scatter-gather).', 'A query with the shard key (say key = 150): mongos sends it to exactly one shard. Without the shard key it must ask every shard (scatter-gather).'), nodes: draw(ranged, { route: [1] }) },
      { say: tr('Shard key tăng dần (thời gian, id tự tăng): mọi lệnh chèn rơi vào chunk cuối [300, max), một shard nóng.', 'A shard key that only grows (time, auto ids): every insert lands in the last chunk [300, max), one hot shard.'), nodes: draw(ranged, { route: [0], hot: 'c3' }) },
      { say: tr('Chunk quá lớn được tách đôi; balancer chuyển chunk sang shard ít hơn cho đều.', 'A chunk that grows too big is split; the balancer migrates chunks to the emptier shards.'), nodes: draw(balanced, { route: [0, 1] }) },
      { say: tr('Hashed shard key: giá trị được băm trước, nên lệnh chèn rải đều mọi shard. Đổi lại truy vấn theo khoảng phải hỏi mọi shard.', 'A hashed shard key: values are hashed first, so inserts spread over every shard. The price: range queries must ask every shard.'), nodes: draw(hashed, { scatter: true }) },
    ],
  };
});

// ── partitionsHash (DynamoDB) ───────────────────────────────────────────────────────────────────────────────────
/** FNV-1a, 32 bit: a stand-in for DynamoDB's internal hash (only the "same key, same partition" property matters). */
export const fnv = (s: string): number => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
export interface PartModel { keys: string[]; partitions: number; hot: string }
define<PartModel>('partitionsHash', { keys: ['CUST#1', 'CUST#2', 'CUST#3', 'CUST#4', 'CUST#5', 'CUST#6', 'CUST#7'], partitions: 4, hot: 'CUST#3' }, (m, tr) => {
  const keys = m.keys.slice(0, 7);
  const P = Math.min(4, Math.max(2, m.partitions));
  const part = (k: string) => fnv(k) % P;
  const ky = (i: number) => 20 + i * 24;
  const py = (p: number) => 20 + p * 48;
  type St = { hash?: boolean; load?: boolean; hot?: boolean; shard?: boolean };
  const draw = (s: St): Shape[] => {
    const shards = s.shard ? [1, 2, 3, 4].map((n) => `${m.hot}#${n}`) : [];
    const list = s.shard ? [...keys.filter((k) => k !== m.hot), ...shards].slice(0, 10) : keys;
    const load = Array.from({ length: P }, (_, p) => list.filter((k) => part(k) === p).reduce((a, k) => a + (s.hot && !s.shard && k === m.hot ? 6 : s.shard && shards.includes(k) ? 1.5 : 1), 0));
    const out: Shape[] = [];
    list.forEach((k, i) => {
      const hot = (s.hot || s.shard) && (k === m.hot || shards.includes(k));
      out.push(...box(`k${k}`, 10, ky(i), 96, 20, cut(k, 12), hot ? 'warm' : 'cell'));
      if (s.hash) out.push(line(`l${k}`, 108, ky(i) + 10, 196, py(part(k)) + 20, { ink: hot ? 'warm' : 'edge', arrow: true, w: hot ? 1.6 : 1 }));
    });
    for (let p = 0; p < P; p++) {
      const over = s.hot && !s.shard && load[p] > 4;
      out.push(...box(`p${p}`, 200, py(p), 130, 40, `partition ${p + 1}`, over ? 'dead' : 'plain', s.load ? (over ? tr('bị throttle', 'throttled') : tr(`tải ${load[p]}`, `load ${load[p]}`)) : ''));
      if (s.load) out.push({ k: `b${p}`, t: 'r', x: 204, y: py(p) + 34, w: Math.min(122, 15 * load[p]), h: 4, rx: 2, tone: over ? 'dead' : 'live' });
    }
    return out;
  };
  return {
    title: tr('DynamoDB: băm partition key', 'DynamoDB: hashing the partition key'), w: 340, h: Math.max(20 + P * 48, 20 + 10 * 24) + 4,
    frames: [
      { say: tr('Mỗi item có partition key (PK).', 'Every item has a partition key (PK).'), nodes: draw({}) },
      { say: tr('DynamoDB băm PK để chọn partition: cùng PK luôn về cùng partition, item được rải gần ngẫu nhiên. (Hình dùng hàm băm FNV làm minh họa.)', 'DynamoDB hashes the PK to pick a partition: the same PK always lands on the same partition, and items spread almost at random. (The picture uses an FNV hash as a stand-in.)'), nodes: draw({ hash: true }) },
      { say: tr('Mỗi partition có trần riêng: khoảng 3000 RCU, 1000 WCU và 10 GB. Tải đều thì cả bảng dùng hết công suất.', 'Each partition has its own ceiling: about 3,000 RCU, 1,000 WCU and 10 GB. With even load the whole table\'s capacity is usable.'), nodes: draw({ hash: true, load: true }) },
      { say: fill(tr('Khóa nóng: {k} nhận phần lớn lưu lượng, một partition bị throttle dù cả bảng còn dư công suất (adaptive capacity chỉ đỡ được một phần).', 'A hot key: {k} gets most of the traffic, so one partition is throttled while the table still has spare capacity (adaptive capacity only helps so much).'), { k: m.hot }), nodes: draw({ hash: true, load: true, hot: true }) },
      { say: fill(tr('Write sharding: thêm hậu tố {k}#1…#4 để rải khóa nóng ra nhiều partition. Đổi lại, đọc phải Query cả bốn khóa rồi gộp.', 'Write sharding: add a suffix {k}#1…#4 to spread the hot key over several partitions. The price: a read must Query all four keys and merge.'), { k: m.hot }), nodes: draw({ hash: true, load: true, shard: true }) },
    ],
  };
});

// ── gsiProjection (DynamoDB) ────────────────────────────────────────────────────────────────────────────────────
type Item = { pk: string; sk: string; status?: string; total: number; note: string };
define<{ items: Item[] }>('gsiProjection', {
  items: [
    { pk: 'CUST#1', sk: 'ORDER#2026-10-03', status: 'PAID', total: 120, note: 'gift wrap' },
    { pk: 'CUST#1', sk: 'ORDER#2026-10-21', status: 'SHIPPED', total: 45, note: '' },
    { pk: 'CUST#2', sk: 'ORDER#2026-10-09', status: 'PAID', total: 80, note: 'call first' },
    { pk: 'CUST#2', sk: 'PROFILE', total: 0, note: 'VIP' },
  ],
}, (m, tr) => {
  const items = m.items.slice(0, 5);
  const fresh: Item = { pk: 'CUST#3', sk: 'ORDER#2026-10-31', status: 'PAID', total: 60, note: '' };
  const COLS = [10, 76, 188, 252, 288];
  const table = (k: string, y: number, head: string[], rows: string[][], tones: Tone[] = []): Shape[] => [
    text(`${k}h`, 10, y, head[0], { b: true, size: 10.5 }),
    ...head.slice(1).map((h, j) => text(`${k}c${j}`, COLS[j] + 4, y + 16, h, { size: 9, ink: 'muted', b: true })),
    ...rows.flatMap((r, i) => [
      { k: `${k}r${r[0]}${r[1]}`, t: 'r' as const, x: 10, y: y + 24 + i * 18, w: 320, h: 16, tone: tones[i] ?? 'plain' },
      ...r.map((v, j) => text(`${k}v${r[0]}${r[1]}${j}`, COLS[j] + 4, y + 32 + i * 18, cut(v, j === 1 ? 19 : j === 0 ? 10 : j === 2 ? 8 : 6), { size: 9.5, mono: true })),
    ]),
  ];
  const base = (extra: Item[] = []) => [...items, ...extra].map((it) => [it.pk, it.sk, it.status ?? '', String(it.total), it.note]);
  const gsi = (list: Item[], all: boolean) => list.filter((it) => it.status).sort((a, b) => (a.status! + a.sk).localeCompare(b.status! + b.sk)).map((it) => [it.status!, it.sk.replace('ORDER#', ''), it.pk, String(it.total), all ? it.note : '']);
  const BH = ['', 'PK', 'SK', 'status', 'total', 'note'];
  const GY = 34 + (items.length + 1) * 18 + 18;
  const G = (list: Item[], all = false, tones?: Tone[]) => table('g', GY, [`GSI byStatus · ${tr('chiếu', 'projects')} total`, 'status (PK)', 'date (SK)', 'PK', 'total', ''], gsi(list, all), tones);
  return {
    title: tr('DynamoDB: GSI và projection', 'DynamoDB: a GSI and its projection'), w: 340, h: GY + 24 + (gsi(items, false).length + 1) * 18 + 6,
    frames: [
      { say: tr('Bảng gốc: khóa là khách (PK) và đơn (SK). Query theo khách thì rẻ.', 'The base table: the key is the customer (PK) and the order (SK). Querying by customer is cheap.'), nodes: table('b', 12, [tr('Bảng gốc', 'Base table'), ...BH.slice(1)], base()) },
      { say: tr('"Mọi đơn PAID" không có trong khóa: trên bảng gốc chỉ còn Scan, đọc (và trả tiền) mọi item.', '"Every PAID order" is not in the key: on the base table that is a Scan, reading (and paying for) every item.'), nodes: table('b', 12, [tr('Bảng gốc · Scan', 'Base table · Scan'), ...BH.slice(1)], base(), items.map(() => 'warm')) },
      { say: tr('GSI byStatus: một bảng phụ khóa (status, ngày) do DynamoDB tự chép từ bảng gốc. Item không có status (PROFILE) không vào GSI: index thưa.', 'GSI byStatus: a second table keyed by (status, date) that DynamoDB copies from the base table. An item without status (PROFILE) is left out: a sparse index.'), nodes: [...table('b', 12, [tr('Bảng gốc', 'Base table'), ...BH.slice(1)], base()), ...G(items)] },
      { say: tr('Projection INCLUDE total: GSI chỉ giữ khóa và total, không có note. Cần note thì phải đọc thêm bảng gốc; chiếu nhiều thì tốn chỗ và WCU hơn.', 'Projection INCLUDE total: the GSI keeps only the keys and total, not note. Needing note means another read on the base table; projecting more costs storage and WCU.'), nodes: [...table('b', 12, [tr('Bảng gốc', 'Base table'), ...BH.slice(1)], base()), ...G(items, false, gsi(items, false).map((r) => (r[0] === 'PAID' ? 'new' : 'plain')))] },
      { say: tr('GSI cập nhật bất đồng bộ: đơn mới vừa ghi chưa thấy ngay trong GSI. Đọc GSI chỉ là eventually consistent.', 'A GSI is updated asynchronously: a brand-new order is not in the GSI yet. GSI reads are eventually consistent only.'), nodes: [...table('b', 12, [tr('Bảng gốc', 'Base table'), ...BH.slice(1)], base([fresh]), [...items.map(() => 'plain' as Tone), 'new']), ...G(items), ...box('lag', 10, GY + 24 + gsi(items, false).length * 18, 320, 16, tr('CUST#3 · đang chép sang GSI…', 'CUST#3 · on its way to the GSI…'), 'ghost')] },
    ],
  };
});

// ── singleTableItems (DynamoDB) ─────────────────────────────────────────────────────────────────────────────────
define<{ items: [string, string, string][] }>('singleTableItems', {
  items: [
    ['CUST#1', 'PROFILE', 'Lan · VIP'], ['CUST#1', 'ORDER#2026-09-28', '45'], ['CUST#1', 'ORDER#2026-10-03', '120'], ['CUST#1', 'ORDER#2026-10-21', '60'],
    ['CUST#2', 'PROFILE', 'Minh'], ['CUST#2', 'ORDER#2026-10-09', '80'], ['ORDER#2026-10-03', 'ITEM#1', 'tea × 2'], ['ORDER#2026-10-03', 'ITEM#2', 'cup × 1'],
  ],
}, (m, tr) => {
  const items = [...m.items].slice(0, 10).sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
  const pks = [...new Set(items.map((i) => i[0]))];
  const draw = (pick: (it: [string, string, string]) => boolean, o: { groups?: boolean; q?: string } = {}): Shape[] => {
    const out: Shape[] = [text('hpk', 14, 12, 'PK', { size: 9, b: true, ink: 'muted' }), text('hsk', 132, 12, 'SK', { size: 9, b: true, ink: 'muted' }), text('hat', 268, 12, tr('thuộc tính', 'attributes'), { size: 9, b: true, ink: 'muted' })];
    items.forEach((it, i) => {
      const y = 20 + i * 20;
      const on = pick(it);
      out.push({ k: `r${i}`, t: 'r', x: 10, y, w: 320, h: 18, tone: on ? 'new' : it[1] === 'PROFILE' ? 'ptr' : 'plain' });
      out.push(text(`a${i}`, 14, y + 9, cut(it[0], 17), { size: 9.5, mono: true }), text(`b${i}`, 132, y + 9, cut(it[1], 20), { size: 9.5, mono: true }), text(`c${i}`, 268, y + 9, cut(it[2], 10), { size: 9.5 }));
    });
    if (o.groups) pks.forEach((pk, g) => {
      const idx = items.map((it, i) => (it[0] === pk ? i : -1)).filter((i) => i >= 0);
      out.push(line(`g${g}`, 6, 21 + idx[0] * 20, 6, 37 + idx[idx.length - 1] * 20, { ink: 'ptr', w: 3 }));
    });
    if (o.q) out.push(...box('q', 10, 28 + items.length * 20, 320, 24, o.q, 'cell'));
    return out;
  };
  const c1 = pks[0];
  return {
    title: tr('DynamoDB: thiết kế một bảng', 'DynamoDB: single-table design'), w: 340, h: 20 + items.length * 20 + 40,
    frames: [
      { say: tr('Một bảng chứa nhiều loại thực thể (khách, đơn, dòng đơn). Khóa đặt tên chung PK/SK, giá trị có tiền tố loại: CUST#, ORDER#, ITEM#.', 'One table holds several entity types (customers, orders, order lines). The keys are named generically PK/SK and values carry a type prefix: CUST#, ORDER#, ITEM#.'), nodes: draw(() => false) },
      { say: tr('Item cùng PK là một item collection, nằm cạnh nhau và sắp theo SK.', 'Items that share a PK form an item collection, stored together and sorted by SK.'), nodes: draw(() => false, { groups: true }) },
      { say: fill(tr('Mẫu truy cập "khách và các đơn": một Query PK = {c} trả hồ sơ lẫn đơn, đã "nối sẵn" bằng thiết kế khóa, không cần JOIN.', 'Access pattern "a customer and their orders": one Query on PK = {c} returns the profile and the orders, pre-joined by the key design, no JOIN.'), { c: c1 }), nodes: draw((it) => it[0] === c1, { groups: true, q: `PK = "${c1}"` }) },
      { say: tr('"Đơn tháng 10 của khách": thêm điều kiện begins_with(SK, "ORDER#2026-10"). SK có ngày nên thứ tự đã đúng.', '"A customer\'s October orders": add begins_with(SK, "ORDER#2026-10"). The SK holds the date, so the order is already right.'), nodes: draw((it) => it[0] === c1 && it[1].startsWith('ORDER#2026-10'), { groups: true, q: `PK = "${c1}" AND begins_with(SK, "ORDER#2026-10")` }) },
      { say: tr('Quan hệ một-nhiều khác dùng chính đơn làm PK (ORDER# → ITEM#). Cần tra ngược thì thêm GSI đảo khóa (SK thành PK). Thiết kế bắt đầu từ các mẫu truy cập, không từ bảng.', 'Another one-to-many uses the order itself as the PK (ORDER# → ITEM#). For the reverse lookup, add a GSI that swaps the keys (SK becomes PK). The design starts from the access patterns, not from tables.'), nodes: draw((it) => it[0].startsWith('ORDER#'), { groups: true, q: 'PK = "ORDER#2026-10-03"' }) },
    ],
  };
});
