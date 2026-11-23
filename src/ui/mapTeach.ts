// V22-A (L203–L205, map-research.md option A "Bản đồ kết quả"): the player's own result drawn on the domain's map, as the
// workspace's Map tab and on the Map page (a question per point, a runnable sample, the result redrawn). Lazy chunk `mapTeach`
// (budget `mapteach`): it imports only types from main and art modules and gets every main value through MapDeps (a value
// import would split main, Plan 6 U3). Its VI/EN text is TEXT below. The overlay is SVG attributes and inline fills (no new
// CSS); motion is Element.animate() at a Run only, never on a redraw, none under reduced motion (the end frame).
import type { LogisticsArt } from '../art/load';
import type { MapParts } from '../art/logistics';
import type { QueryResult } from '../db/run';
import type { DomainId } from '../domains';
import type { Lang } from '../i18n';
import { questionFor } from '../mapQueries';
import type { Harbor } from '../scene';
import { framesOf, geoRows, geoSpec, isCount, placeLabels, portOf, PORTS, step5, textBox, type Anchor, type Box, type GeoRow, type GeoSpec } from '../viz/geo';
import type { Art, ArtDomain } from './domainArt';
import type { h as H } from './dom';
import type { s as S } from './svg';

export interface MapDeps {
  h: typeof H;
  s: typeof S;
  getLang(): Lang;
  reducedMotion(): boolean;
  announce(text: string): void;
  errorView(e: unknown): HTMLElement;
  loadArt(): Promise<LogisticsArt>;
  loadDomainArt(d: ArtDomain): Promise<Art>;
  harbor(): Harbor;
  artState(): { passed: Set<number>; done: number };
  unlocked(): string[];
  run(sql: string, d: DomainId): Promise<QueryResult>;
  rerender(): void;
}
let d$: MapDeps;
export const init = (deps: MapDeps): void => void (d$ = deps);

const TEXT = {
  vi: {
    title: 'Hỏi bản đồ bằng SQL', sub: 'Chọn một điểm, chạy câu mẫu rồi tự sửa: kết quả được vẽ lên bản đồ.',
    at: 'Câu hỏi ở {p}', run: 'Chạy', sample: 'Về câu mẫu', sqlLabel: 'SQL của bạn', next: 'Hỏi tiếp:', pick: 'Chọn điểm',
    note: 'Chỉ chạy thử: 0 XP, không lưu, không phải việc của chương.', lockAt: 'mở ở chương {n}', running: 'Đang chạy…',
    need: 'Bản đồ cần một cột cảng, thành phố hoặc chi nhánh và một cột số.',
    lab: 'Bản đồ chỉ vẽ dữ liệu của một domain.', measure: 'Số đo', time: 'Thời điểm',
    summary: '{col} theo {key}: cao nhất {top} ({vt}), thấp nhất {low} ({vl}); {n} điểm.', list: 'Danh sách theo giá trị',
    place: 'Điểm', arc: 'Nét đứt: đường tượng trưng.', edge: '{p} nằm ngoài khung: mũi tên ở mép trái.',
    label: 'Bản đồ kết quả. {s}', none: 'Chưa mở bảng nào.',
  },
  en: {
    title: 'Ask the map with SQL', sub: 'Pick a point, run the sample, then change it: the result is drawn on the map.',
    at: 'Question at {p}', run: 'Run', sample: 'Back to the sample', sqlLabel: 'Your SQL', next: 'Ask next:', pick: 'Pick a point',
    note: 'A try-out only: 0 XP, not saved, not a chapter task.', lockAt: 'opens in chapter {n}', running: 'Running…',
    need: 'The map needs a port, city or branch column and a numeric column.',
    lab: 'The map only draws a domain\'s data.', measure: 'Measure', time: 'Point in time',
    summary: '{col} by {key}: highest {top} ({vt}), lowest {low} ({vl}); {n} points.', list: 'List by value',
    place: 'Point', arc: 'Dashed: a symbolic line.', edge: '{p} is outside the frame: arrow on the left edge.',
    label: 'Result map. {s}', none: 'No table open yet.',
  },
} as const;
type TKey = keyof (typeof TEXT)['vi'];
const tx = (k: TKey, p: Record<string, string | number> = {}): string =>
  TEXT[d$.getLang()][k].replace(/\{(\w+)\}/g, (_, n: string) => String(p[n] ?? ''));
const num = (v: number): string =>
  v.toLocaleString(d$.getLang() === 'vi' ? 'vi-VN' : 'en-GB', { maximumFractionDigits: 2, notation: Math.abs(v) >= 1e6 ? 'compact' : 'standard' });

/** The map a result is drawn on: the domain's own picture (no coast redrawn) and where each place sits on it. */
interface Base {
  svg: SVGSVGElement;
  at(key: string): [number, number] | undefined;
  /** Display name of a key ("NLRTM" → "NLRTM · Rotterdam"). */
  name(key: string): string;
  /** Places drawn outside the frame (New York, D-M3). */
  edge(key: string): boolean;
  /** Tien Sa's real lane to a port, when there is one (Logistics). */
  lane(a: string, b: string): string | undefined;
  /** D-M2: a city or branch the story has not opened yet: still drawn, labelled with its chapter. */
  opens(key: string): number | undefined;
}

/** `wire` lets the Map page add its pins and fleet to the Logistics map (ui/mapPage.ts). */
export async function base(d: DomainId, wire?: (p: MapParts) => void): Promise<Base> {
  if (d === 'logistics') {
    const a = await d$.loadArt();
    const p = a.routeMap(d$.harbor());
    wire?.(p);
    return {
      svg: p.svg,
      at: (k) => {
        const c = portOf(k);
        if (!c) return undefined;
        const [lon, lat] = PORTS[c];
        return lon < -12 ? [24, a.xy([0, lat])[1]] : a.xy([lon, lat]);
      },
      name: (k) => (PORTS[k] ? `${k} · ${PORTS[k][2]}` : k),
      edge: (k) => (PORTS[portOf(k) ?? '']?.[0] ?? 0) < -12,
      lane: (x, y) => (portOf(x) === 'VNDAD' && a.LANE_GEO[portOf(y) ?? ''] ? a.lanePath(portOf(y)!) : undefined),
      opens: () => undefined,
    };
  }
  const a = await d$.loadDomainArt(d);
  const st = d$.artState();
  const at = (k: string) => a.places.find((p) => p.name === k);
  return {
    svg: a.map(st, false), name: (k) => k, edge: () => false, lane: () => undefined,
    at: (k) => (at(k) ? [at(k)!.x, at(k)!.y] : undefined),
    opens: (k) => (at(k)?.opens && !st.passed.has(at(k)!.opens) ? at(k)!.opens : undefined),
  };
}
const isPlaceOf = (d: DomainId, places?: Art['places']) => (v: string): boolean =>
  d === 'logistics' ? portOf(v) !== undefined : (places ?? []).some((p) => p.name === v);

/** Rates and averages: five steps, light to dark (both themes: each symbol has the map halo around it). */
const STEPS = ['#fde68a', '#fbbf24', '#f97316', '#dc2626', '#7f1d1d'];
const COUNT = '#0f766e';

interface Pickd { value: number; frame?: string; hl?: number }
const picked = new WeakMap<QueryResult, Pickd>();
/** The last summary sentence drawn (announced after a Run on the Map page). */
let lastLine = '';

const SIZE = 13;
/** The map's own text (port, city and branch names) as boxes, read from its SVG attributes; an earlier overlay is skipped. */
function mapLabels(svg: SVGSVGElement): Box[] {
  return [...svg.querySelectorAll('text')].filter((el) => !el.closest('[data-map-overlay]') && el.textContent?.trim()).map((el) => {
    const size = Number(el.closest('[font-size]')?.getAttribute('font-size')) || SIZE;
    const anchor = (el.closest('[text-anchor]')?.getAttribute('text-anchor') ?? 'start') as Anchor;
    return textBox(Number(el.getAttribute('x')) || 0, Number(el.getAttribute('y')) || 0, anchor, el.textContent!.trim(), size);
  });
}

/** The overlay: one symbol per row (a line for two port columns), its value next to it; `fresh` = just ran (grow once). */
function overlay(b: Base, rows: GeoRow[], count: boolean, lo: number, hi: number, fresh: boolean, hl: number | undefined, pick: (row: number) => void): SVGGElement {
  const { s } = d$;
  const max = Math.max(Math.abs(lo), Math.abs(hi)) || 1;
  const fill = (v: number) => (count ? COUNT : STEPS[step5(v, lo, hi)]);
  const g = s('g', { 'data-map-overlay': '', 'font-size': SIZE, 'font-weight': 700 });
  const motion = fresh && !d$.reducedMotion();
  const radius = (v: number) => (count ? 5 + 18 * Math.sqrt(Math.abs(v) / max) : 10);
  // L311: values go where they cover neither the map's own names nor each other; the biggest values choose first.
  const dots = rows.filter((x) => x.key2 === undefined && b.at(x.key)).sort((a, c) => Math.abs(c.v) - Math.abs(a.v));
  const spots = placeLabels(dots.map((x) => ({ x: b.at(x.key)![0], y: b.at(x.key)![1], r: radius(x.v), text: num(x.v) })), mapLabels(b.svg), SIZE);
  const spotOf = new Map(dots.map((x, i) => [x, spots[i]]));
  rows.forEach((x, i) => {
    const p = b.at(x.key);
    if (!p) return;
    const delay = Math.min(i * 30, 600); // ≤ 1 s in all
    if (x.key2 !== undefined) {
      const q = b.at(x.key2);
      if (!q) return;
      const real = b.lane(x.key, x.key2);
      const line = s('path', {
        d: real ?? `M${p[0]} ${p[1]} Q${(p[0] + q[0]) / 2} ${Math.min(p[1], q[1]) - 40} ${q[0]} ${q[1]}`, fill: 'none', 'stroke-linecap': 'round',
        stroke: fill(x.v), 'stroke-width': (1.5 + (8 * Math.abs(x.v)) / max).toFixed(1), 'stroke-opacity': x.row === hl ? 1 : 0.75,
        'stroke-dasharray': real ? false : '5 4', 'data-row': x.row,
      });
      line.addEventListener('click', () => pick(x.row));
      if (motion && real) {
        line.setAttribute('pathLength', '1');
        line.animate([{ strokeDasharray: '0 1' }, { strokeDasharray: '1 0' }], { duration: 600, delay, easing: 'ease-out', fill: 'backwards' });
      }
      g.append(line);
      return;
    }
    const r = radius(x.v);
    if (b.edge(x.key)) g.append(s('path', { d: `M4 ${p[1]}l12 -8v16z`, fill: fill(x.v), 'aria-hidden': 'true' }));
    const dot = s('circle', {
      cx: p[0], cy: p[1], r: r.toFixed(1), fill: fill(x.v), 'fill-opacity': count ? 0.7 : 0.9, 'data-row': x.row, class: 'cursor-pointer',
      style: 'stroke:var(--map-halo)', 'stroke-width': x.row === hl ? 4 : 1.5,
    });
    dot.addEventListener('click', () => pick(x.row));
    if (motion) {
      dot.style.transformBox = 'fill-box';
      dot.style.transformOrigin = 'center';
      dot.animate([{ transform: 'scale(0)' }, { transform: 'scale(1)' }], { duration: 400, delay, easing: 'ease-out', fill: 'backwards' });
    }
    const at = spotOf.get(x);
    g.append(dot, at ? s('text', {
      x: at.x.toFixed(1), y: at.y.toFixed(1), 'text-anchor': at.anchor, 'paint-order': 'stroke',
      style: 'fill:var(--text);stroke:var(--map-halo)', 'stroke-width': 4, 'stroke-linejoin': 'round', 'aria-hidden': 'true',
    }, num(x.v)) : '');
  });
  return g;
}

/**
 * The result on the map: measure and time pickers, the map with its overlay, one summary sentence and the list by value
 * (the text equivalent: a screen reader and a phone, where SVG labels hide, read it). undefined: the result has no place.
 */
export function view(d: DomainId, r: QueryResult, at: Promise<Base>, places: Art['places'] | undefined, fresh: boolean): HTMLElement | undefined {
  const spec = geoSpec(r, isPlaceOf(d, places));
  if (!spec) return undefined;
  const { h } = d$;
  const sel = picked.get(r) ?? { value: spec.values[0] };
  picked.set(r, sel);
  const frames = framesOf(r, spec);
  if (frames.length && !frames.includes(sel.frame ?? '')) sel.frame = frames[0];
  const all = geoRows(r, spec, sel.value);
  const fig = h('div', { class: d === 'logistics' ? 'aspect-[5/2] rounded-(--r-ctl) bg-accent-soft' : 'aspect-[980/300] rounded-(--r-ctl) bg-accent-soft' });
  const summary = h('p', { class: 'm-0 text-body-sm font-semibold' });
  const list = h('tbody', {});
  let b: Base | undefined;
  let g: SVGGElement | undefined;
  const paint = (grow: boolean) => {
    const rows = frames.length ? geoRows(r, spec, sel.value, sel.frame) : geoRows(r, spec, sel.value);
    const vs = (frames.length ? frames.flatMap((f) => geoRows(r, spec, sel.value, f)) : all).map((x) => x.v);
    const lo = Math.min(...vs);
    const hi = Math.max(...vs);
    const sorted = [...rows].sort((x, y) => y.v - x.v);
    const nm = (x: GeoRow) => [x.key, x.key2].filter((k) => k !== undefined).map((k) => b?.name(k!) ?? k).join(' → ');
    const keyCol = [spec.key, spec.key2].filter((c) => c !== undefined).map((c) => r.columns[c!]).join(', ');
    const line = sorted.length ? tx('summary', { col: r.columns[sel.value], key: keyCol, top: nm(sorted[0]), vt: num(sorted[0].v), low: nm(sorted[sorted.length - 1]), vl: num(sorted[sorted.length - 1].v), n: sorted.length }) : tx('need');
    summary.textContent = lastLine = line;
    list.replaceChildren(...sorted.map((x) => {
      const lock = b?.opens(x.key);
      return h('tr', { class: x.row === sel.hl ? 'bg-accent-soft' : '' },
        h('td', { class: 'py-1 pr-3' }, h('button', { type: 'button', class: 'px-2 py-1 text-left text-body-sm', 'aria-pressed': String(x.row === sel.hl), onclick: () => pick(x.row) }, nm(x)),
          lock ? h('span', { class: 'text-caption text-muted' }, ` · ${tx('lockAt', { n: lock })}`) : null),
        h('td', { class: 'py-1 text-right tabular-nums' }, num(x.v)));
    }));
    if (!b) return;
    const next = overlay(b, rows, isCount(r, sel.value), lo, hi, grow, sel.hl, pick);
    if (g) g.replaceWith(next);
    else b.svg.append(next);
    g = next;
    b.svg.setAttribute('aria-label', tx('label', { s: line }));
  };
  const pick = (row: number) => {
    sel.hl = sel.hl === row ? undefined : row;
    paint(false);
  };
  void at.then((x) => {
    b = x;
    if (!b.svg.querySelector('[role=button]')) b.svg.setAttribute('role', 'img'); // the Map page's lane pins are controls
    fig.replaceWith(b.svg);
    paint(fresh);
  }, () => {});
  paint(false);
  const field = (label: string, ctl: HTMLElement) => h('label', { class: 'flex items-center gap-2 text-body-sm' }, h('span', { class: 'text-muted' }, label), ctl);
  const notes = [
    spec.key2 !== undefined && d === 'logistics' ? tx('arc') : '',
    all.some((x) => x.key === 'USNYC' || x.key2 === 'USNYC' || x.key === 'New York' || x.key2 === 'New York') ? tx('edge', { p: 'New York' }) : '',
  ].filter(Boolean);
  return h('div', { class: 'grid gap-2' },
    spec.values.length > 1 || frames.length > 1 ? h('div', { class: 'flex flex-wrap items-center gap-4' },
      spec.values.length > 1 ? field(tx('measure'), h('select', { class: 'px-2 py-1', onchange: (e: Event) => { sel.value = Number((e.target as HTMLSelectElement).value); sel.hl = undefined; paint(false); } },
        ...spec.values.map((c) => h('option', { value: String(c), selected: c === sel.value }, r.columns[c])))) : null,
      frames.length > 1 ? field(`${tx('time')}: ${sel.frame}`, h('input', {
        type: 'range', min: '0', max: String(frames.length - 1), value: String(frames.indexOf(sel.frame!)), class: 'w-40',
        oninput: (e: Event) => {
          sel.frame = frames[Number((e.target as HTMLInputElement).value)];
          ((e.target as HTMLElement).previousSibling as HTMLElement).textContent = `${tx('time')}: ${sel.frame}`;
          paint(false);
        },
      })) : null) : null,
    fig,
    summary,
    ...notes.map((n) => h('p', { class: 'm-0 text-caption text-muted' }, n)),
    h('details', {}, h('summary', { class: 'cursor-pointer text-body-sm font-semibold text-accent' }, tx('list')),
      h('table', { class: 'mt-1 text-body-sm' },
        h('thead', {}, h('tr', {}, h('th', { class: 'pr-3 text-left' }, tx('place')), h('th', { class: 'text-right' }, r.columns[sel.value]))), list)));
}

/** The workspace's Map tab: the last run on a fresh copy of the domain's map; `undefined` domain = a drill on `lab`. */
export async function tab(host: HTMLElement, d: DomainId | undefined, r: QueryResult, fresh: boolean): Promise<void> {
  const why = (k: TKey) => host.append(d$.h('p', { class: 'm-0 px-4 py-8 text-center text-body-sm text-muted' }, tx(k)));
  if (!d) return void why('lab');
  const places = d === 'logistics' ? undefined : (await d$.loadDomainArt(d)).places;
  const v = view(d, r, base(d), places, fresh);
  if (v) host.append(v);
  else why('need');
}

/** Map page state, kept by ui/mapPage.ts across rerender() (the section is redrawn whole). */
export interface PageState { place?: string; sql?: string; qid?: string; result?: QueryResult; error?: unknown; fresh?: boolean; busy?: boolean }

/**
 * The Map page (all three domains): the map (with the page's own last result on it), the question of the picked point with
 * a runnable sample in a textarea (Run only: 0 XP, app.lastRun, drafts and the save untouched), then, outside Logistics, the
 * points as buttons (Logistics picks through its lane pins and lane list, kept as they were).
 */
export async function page(d: DomainId, st: PageState, points: { id: string; name: string }[] | undefined, wire?: (p: MapParts) => void): Promise<HTMLElement> {
  const { h } = d$;
  const places = d === 'logistics' ? undefined : (await d$.loadDomainArt(d)).places;
  const pts = points ?? places!.map((p) => ({ id: p.name, name: p.name }));
  const idx = Math.max(0, pts.findIndex((p) => p.id === st.place));
  const pt = pts[idx];
  const st$ = d$.artState();
  const q = questionFor(d, pt.id, idx, d$.unlocked(), st$.passed);
  if (q && q.id !== st.qid) Object.assign(st, { qid: q.id, sql: undefined });
  const fresh = st.fresh === true;
  st.fresh = false;
  const bm = base(d, wire);
  const shown = st.result ? view(d, st.result, bm, places, fresh) : undefined;
  const fig = shown ?? h('div', { class: d === 'logistics' ? 'aspect-[5/2] rounded-(--r-ctl) bg-accent-soft' : 'aspect-[980/300] rounded-(--r-ctl) bg-accent-soft' });
  if (!shown) {
    void bm.then((x) => fig.replaceWith(x.svg), () => {});
    if (st.result) fig.after(h('p', { class: 'm-0 text-body-sm text-muted' }, tx('need')));
  }
  const area = h('textarea', {
    class: 'w-full rounded-(--r-inset) bg-code p-2 font-mono text-body-sm ring-1 ring-line', rows: '6', spellcheck: 'false', lang: 'en',
    'aria-label': tx('sqlLabel'), oninput: (e: Event) => void (st.sql = (e.target as HTMLTextAreaElement).value),
  });
  area.value = st.sql ?? q?.sql ?? '';
  const run = async () => {
    const sql = area.value.trim();
    if (!sql || st.busy) return;
    st.busy = true;
    btn.disabled = true;
    btn.textContent = tx('running');
    try {
      st.result = await d$.run(sql, d);
      st.error = undefined;
      st.fresh = true;
    } catch (e) {
      st.error = e;
    }
    st.busy = false;
    lastLine = tx('need');
    d$.rerender();
    // the section is redrawn after the chunk's promise: its summary sentence (or why nothing is drawn) is set by then
    if (!st.error) setTimeout(() => d$.announce(lastLine), 0);
  };
  const btn = h('button', { type: 'button', class: 'primary px-4 py-1.5', 'data-map-run': '', onclick: () => void run() }, tx('run'));
  const lang = d$.getLang();
  const ask = q
    ? h('div', { class: 'grid gap-2 rounded-(--r-ctl) p-4 ring-1 ring-line' },
      h('h3', { class: 'm-0 text-body font-bold' }, tx('at', { p: pt.name })),
      h('p', { class: 'm-0' }, q.q[lang].replace('{p}', pt.name)),
      area,
      h('div', { class: 'flex flex-wrap items-center gap-2' }, btn,
        h('button', { type: 'button', class: 'px-3 py-1.5 text-body-sm', onclick: () => { st.sql = undefined; d$.rerender(); } }, tx('sample')),
        h('span', { class: 'text-caption text-muted' }, tx('note'))),
      st.error ? h('div', { 'data-map-error': '' }, d$.errorView(st.error)) : null,
      h('p', { class: 'm-0 text-body-sm' }, h('b', {}, tx('next')), ' ', q.next[lang]))
    : h('p', { class: 'm-0 text-body-sm text-muted' }, tx('none'));
  const chooser = points ? null : h('div', {},
    h('h3', { class: 'm-0 mb-2 text-body font-bold' }, tx('pick')),
    h('ul', { class: 'm-0 grid list-none gap-1.5 p-0 text-body-sm sm:grid-cols-2' }, ...places!.map((p) => {
      const lock = p.opens && !st$.passed.has(p.opens) ? p.opens : 0;
      return h('li', {}, h('button', {
        type: 'button', class: 'flex w-full items-center gap-2 px-3 py-1.5 text-left max-lg:min-h-11', 'aria-pressed': String(p.name === pt.id),
        onclick: () => { st.place = p.name; d$.rerender(); },
      }, h('b', {}, p.name), lock ? h('span', { class: 'ml-auto text-muted' }, tx('lockAt', { n: lock })) : null));
    })));
  return h('div', { class: 'grid gap-4' },
    h('div', {}, h('h2', { id: 'routes-title', class: 'm-0 text-title font-bold' }, tx('title')), h('p', { class: 'm-0 text-body-sm text-muted' }, tx('sub'))),
    fig, ask, chooser);
}
