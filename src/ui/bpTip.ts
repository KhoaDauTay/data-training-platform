import type { DbClient } from '../db/client';
import type { SchemaId } from '../domains';
import type { Lang } from '../i18n';
import type { Ticket } from '../tickets';
import type { WorkDeps } from './work';
import type { Hit, Rule, ColFact } from '../viz/bpLint';
import type { app as App } from '../state';
import type * as Dom from './dom';
import { BP_TIPS_KEY, parseBpTips, type BpPref } from '../bpPref';

/**
 * BP-LINT (v24, L273–L276; product-design-best-practice §5): Boon's one-line best-practice tip under Run/Submit. Lazy chunk
 * `bptip`, mounted by one line in work.ts that hands every main value in (`BpDeps`; a value import from a main module
 * splits main into shared chunks, Plan 6 U3, measured again here: −80 KB main, +coach chunk).
 * After a run it parses the SQL (libpg-query, lazy chunk `bplint`), keeps one rule (§5.4 order) and says it. Silent unless
 * the result is right (§5.3): a correct Submit, a run on a passed task or drill, the Sandbox. Never on a promotion review,
 * an interview question, an index lab, a Practice run, while Boon's tour/guide mark is in this pane, or for a beginner
 * beyond Q01/A05. Device pref `cargo-query/bp-tips`, never the Save.
 */
export { parseBpTips, type BpPref } from '../bpPref';
const KEY = BP_TIPS_KEY;
const SEEN_MAX = 500;

const TEXT: Record<Lang, Record<Rule, string> & { label: string; why: (r: string) => string; mute: string; hide: string; muted: (r: string) => string; undo: string }> = {
  vi: {
    q01: 'Mình thấy so sánh `= NULL`: so với NULL luôn ra "không biết", nên điều kiện này không bao giờ đúng. Thử `IS NULL` nhé.',
    q02: '`NOT IN` với một truy vấn con (subquery) sẽ ra rỗng nếu truy vấn con trả một NULL. Mình hay dùng `NOT EXISTS` cho chắc.',
    q06: 'Điều kiện trên bảng bên phải của LEFT JOIN đặt ở `WHERE` sẽ bỏ các dòng không khớp, thành INNER JOIN. Bạn muốn đặt nó trong `ON` không?',
    q10: 'Câu này chạy đúng. Nhưng có `LIMIT` mà không có `ORDER BY`: mỗi lần chạy có thể ra những dòng khác nhau.',
    q11: 'Câu này chạy đúng. Nhưng cột bị bọc trong hàm ở `WHERE`, nên index trên cột đó không dùng được. Thử viết thành khoảng trên chính cột.',
    q12: '`BETWEEN` trên cột thời điểm bỏ sót mọi thứ sau 00:00 của ngày cuối. Khoảng nửa mở `>= … AND < …` an toàn hơn.',
    q13: 'Chia hai `count` cho nhau là chia số nguyên, phần lẻ bị bỏ. Ép một vế sang `numeric` nhé.',
    q15: 'Điều kiện này không dùng hàm gộp, nên đặt ở `WHERE` sẽ lọc sớm hơn và dễ đọc hơn.',
    q22: '`GROUP BY` hay `ORDER BY` theo số thứ tự cột sẽ đổi nghĩa khi ai đó chèn một cột vào `SELECT`. Viết tên cột thì an toàn hơn.',
    a05: 'Ở đây "hôm nay" là 2026-10-31. Mình ghi thẳng ngày đó để báo cáo chạy lại vẫn ra cùng số.',
    label: 'Boon nhắc', why: (r) => `Vì sao? (thẻ ${r})`, mute: 'Đừng nhắc luật này', hide: 'Ẩn lời nhắc', muted: (r) => `Đã tắt nhắc ${r}`, undo: 'Hoàn tác',
  },
  en: {
    q01: 'I see a comparison with `= NULL`: it is never true, so no row passes. Try `IS NULL`.',
    q02: '`NOT IN` over a subquery returns nothing if the subquery yields a NULL. `NOT EXISTS` is the safe choice.',
    q06: 'A filter on the right table of a LEFT JOIN in `WHERE` drops unmatched rows, so it acts like an INNER JOIN. Move it into `ON`?',
    q10: 'This query is correct. But `LIMIT` without `ORDER BY` can return different rows on each run.',
    q11: 'This query is correct. But the column is wrapped in a function in `WHERE`, so its index cannot be used. Try a range on the bare column.',
    q12: '`BETWEEN` on a timestamp misses everything after midnight of the last day. Use a half-open range `>= … AND < …`.',
    q13: 'Dividing two `count`s is integer division and drops the fraction. Cast one side to `numeric`.',
    q15: 'This condition has no aggregate, so it belongs in `WHERE`, where it filters earlier.',
    q22: '`GROUP BY` or `ORDER BY` by column position changes meaning when someone inserts a column into the `SELECT`. Column names are safer.',
    a05: 'Here "today" is 2026-10-31. Write that date so the report gives the same numbers when run again.',
    label: 'Boon tip', why: (r) => `Why? (card ${r})`, mute: 'Stop this tip', hide: 'Hide tip', muted: (r) => `${r} tips are off`, undo: 'Undo',
  },
};

/** Main values, handed in by work.ts's mount line. */
export interface BpDeps {
  h: typeof Dom.h; richText: typeof Dom.richText; announce: typeof Dom.announce; getLang: () => Lang;
  app: typeof App; store: () => Pick<Storage, 'getItem' | 'setItem'> | undefined; keeps: () => boolean; region: () => string | undefined;
}

/**
 * Skills the player has learned (knownSkills' rule over the open domain's tickets: a solved ticket grants them, 2 passed
 * drills, a review card), for the beginner gate. ponytail: knownSkills itself reads Logistics; importing it would split main.
 */
export function learnedCount(app: Pick<typeof App, 'save' | 'tickets'>): number {
  const done = new Set(app.save.completed);
  const out = new Set([...app.tickets.filter((t) => done.has(t.id)).flatMap((t) => t.grants), ...Object.keys(app.save.review)]);
  const drills = new Map<string, number>();
  for (const id of done) {
    const s = /^g-(.+)-\d+$/.exec(id)?.[1];
    if (s && !s.startsWith('iv-')) drills.set(s, (drills.get(s) ?? 0) + 1);
  }
  for (const [s, n] of drills) if (n >= 2) out.add(s);
  return out.size;
}

/** Why the open run may (not) be linted, §5.2/§5.3. `passed`: the open task or drill is already solved. */
export function lintable(tk: Ticket | undefined, step: number, keeps: boolean, passed: boolean): boolean {
  if (!tk) return true; // the Sandbox (work.setTicket(undefined))
  if (tk.beat === 'boss' || tk.steps[step]?.lab || /^g-iv-/.test(tk.id)) return false;
  return keeps && passed; // story, lane or drill (not Practice, not the interview room), already solved
}

/**
 * Mounts the tip after `after` and wraps deps.onRun (work.ts calls it after every Run/Submit, before a correct Submit's
 * credit; the check waits a task, so a just-solved task counts as passed). `here` = the open ticket and step.
 */
export function mountBp(after: HTMLElement, wd: WorkDeps, here: () => [Ticket | undefined, number], d: BpDeps): void {
  const { h, app } = d;
  const el = h('div', { hidden: true, class: 'mt-2 rounded-(--r-ctl) bg-info-soft px-3 py-2 text-body-sm text-ink ring-1 ring-line' });
  const status = h('div', { role: 'status', class: 'text-caption text-muted' });
  after.after(el, status);
  const read = (): BpPref => {
    try { return parseBpTips(d.store()?.getItem(KEY)); } catch { return parseBpTips(null); }
  };
  const write = (p: BpPref): void => {
    try { d.store()?.setItem(KEY, JSON.stringify(p)); } catch { /* full or blocked storage: the tip just shows again */ }
  };
  const session = new Set<string>(); // Sandbox: once per rule per session (§5.5 #5)
  let shown: { rule: Rule; id: string } | undefined;
  let gen = 0;
  const hide = (): void => void (el.hidden = true);
  // The editor is rebuilt exactly when ticketId#step changes: a tip never outlives its task.
  const editorHost = after.parentElement?.firstElementChild;
  if (editorHost) new MutationObserver(() => { hide(); shown = undefined; }).observe(editorHost, { childList: true });

  const prev = wd.onRun;
  wd.onRun = () => {
    prev();
    const n = ++gen;
    setTimeout(() => void check(n).catch(hide), 0);
  };

  async function check(n: number): Promise<void> {
    hide();
    const r = app.lastRun;
    const [tk, step] = here();
    const id = tk?.id ?? '';
    const pref = read();
    if (!r?.result || r.key !== (tk ? `${id}#${step}` : '') || pref.off || d.region() === 'work') return;
    if (after.previousElementSibling?.className.includes('bg-bad-soft')) return; // a wrong Submit's message (§5.3 #2–3), even on a passed task
    if (!lintable(tk, step, d.keeps(), !!tk && (app.save.completed.includes(id) || app.save.lanes.includes(id)))) return;
    const [lint, { parse }] = await Promise.all([import('../viz/bpLint'), loadParser()]);
    const hits = lint.bpLint(await parse(r.sql)).filter((x: Hit) => lint.LINT_ON.includes(x.rule));
    if (n !== gen) return;
    if (shown && shown.id === id && !hits.some((x) => x.rule === shown!.rule)) write({ ...pref, fixed: pref.fixed + 1 }); // §7.3: fixed after the tip
    shown = undefined;
    const beginner = learnedCount(app) < 3;
    const open = hits.filter((x) => (!beginner || lint.BEGINNER.includes(x.rule)) && !pref.mute.includes(x.rule)
      && !lint.EXEMPT.some(([e, rule]) => e === id && rule === x.rule) && !(id ? pref.seen.includes(`${x.rule}@${id}`) : session.has(x.rule)));
    const facts = open.some((x) => x.rule === 'q11' || x.rule === 'q12') ? await factsOf(wd.db, r.schema) : [];
    if (n !== gen) return;
    const hit = lint.RULES.map((rule) => open.find((x) => x.rule === rule && lint.keep(x, facts))).find(Boolean);
    if (!hit) return;
    if (id) write({ ...read(), seen: [...read().seen, `${hit.rule}@${id}`].slice(-SEEN_MAX) });
    else session.add(hit.rule);
    shown = { rule: hit.rule, id };
    draw(hit.rule);
    setTimeout(() => {
      const a = document.getElementById('announce')?.textContent ?? '';
      d.announce(`${a} ${TEXT[d.getLang()].label}: ${TEXT[d.getLang()][hit.rule].replace(/`/g, '')}`.trim()); // one live region (§5.6)
    }, 60);
  }

  function draw(rule: Rule): void {
    const tx = TEXT[d.getLang()];
    const btn = 'min-h-6 rounded-(--r-chip) border-0 bg-transparent px-1.5 text-caption font-semibold text-ink underline hover:bg-surface-2';
    el.replaceChildren(
      h('div', { class: 'flex items-start gap-2' },
        h('div', { class: 'min-w-0 flex-1' },
          h('span', { class: 'text-caption font-extrabold uppercase tracking-wide text-muted' }, `${tx.label} · ${rule.toUpperCase()}`),
          d.richText(tx[rule])),
        h('button', { type: 'button', class: 'min-h-6 min-w-6 rounded-full border-0 bg-transparent text-muted hover:bg-surface-2', 'aria-label': tx.hide, onclick: hide }, '×')),
      // v24 BP-UI (L300): the card behind the rule (every lint rule is a SQL-track card); Back returns to the task.
      h('a', { href: `#/engine/best/sql/e-bp-${rule}`, class: btn }, tx.why(rule.toUpperCase())),
      h('button', { type: 'button', class: btn, onclick: () => mute(rule, true) }, tx.mute));
    el.hidden = false;
  }

  function mute(rule: Rule, on: boolean): void {
    const p = read();
    write({ ...p, mute: on ? [...new Set([...p.mute, rule])] : p.mute.filter((x) => x !== rule) });
    hide();
    const tx = TEXT[d.getLang()];
    status.replaceChildren(...(on ? [`${tx.muted(rule.toUpperCase())} · `,
      h('button', { type: 'button', class: 'min-h-6 border-0 bg-transparent px-1 text-caption font-semibold text-ink underline', onclick: () => mute(rule, false) }, tx.undo)] : []));
    if (on) setTimeout(() => status.replaceChildren(), 5000);
  }
}

type Parser = { parse: (sql: string) => Promise<unknown> };
let parser: Promise<Parser> | undefined;
/** The parser on this thread, once (the worker's copy serves the tabs); the wasm comes from the HTTP/offline cache. */
const loadParser = (): Promise<Parser> => (parser ??= import('libpg-query')
  .then(async (m) => {
    // Same steps as src/viz/parser.ts (not imported: it pulls src/viz/memo.ts, a main module, out of main). Node loads it itself.
    if ((globalThis as { process?: { versions?: { node?: string } } }).process?.versions?.node) return m;
    const { default: url } = await import('libpg-query/wasm/libpg-query.wasm?url');
    const res = await fetch(url);
    if (!res.ok) throw new Error(`libpg-query.wasm: HTTP ${res.status}`);
    await m.loadModule({ wasm: await res.arrayBuffer() });
    return m;
  }).catch((e: unknown) => {
    parser = undefined;
    throw e;
  }));

const facts = new Map<string, Promise<ColFact[]>>();
/** Q11/Q12 filter facts (leading index columns, timestamp columns), one query per schema. */
function factsOf(db: Pick<DbClient, 'run'>, schema: SchemaId | undefined): Promise<ColFact[]> {
  const k = schema ?? 'game';
  let p = facts.get(k);
  if (!p) {
    facts.set(k, p = import('../viz/bpLint').then((l) => db.run(l.FACTS_SQL, schema ? { schema } : {}))
      .then((r) => r.rows as ColFact[], (e: unknown) => { facts.delete(k); throw e; }));
  }
  return p;
}
