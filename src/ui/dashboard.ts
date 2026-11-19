import { loadLanes } from '../content';
import { BAR_ROWS, CARD_KINDS, cardRunner, CUSTOM_SKILL, customCardsOpen, colGone, markRan, ranHere, cardSpec, KIND_SKILL, MAX_CARDS, moveCard, TABLE_ROWS, type Card, type CardKind } from '../dashboard';
import { QueryTimeoutError } from '../db/client';
import type { QueryResult } from '../db/run';
import { activeDomain, domainSchemaId } from '../domains';
import { chapterOfId, kpisOf, kpiNumber, kpiTiles, kpiValue, knownSkills, type Kpi, type KpiTile, type KpiValue } from '../home';
import { getLang, t, type Key } from '../i18n';
import { laneLabel } from '../lanes';
import { domainSkills, SKILLS } from '../progress';
import { gated, readTour } from '../onboarding';
import { starterCards } from '../starterCards';
import { ROUTES } from '../scene';
import { domainSlot, stepKey } from '../save';
import { app, done, persist, unlockedTables } from '../state';
import { BTN_GO, CARD, chapterColor, cx } from '../theme';
import { textOf, type Ticket } from '../tickets';
import { MAX_POINTS } from '../viz/chart';
import { bars, line } from './chartView';
import { byId, h } from './dom';
import { meChunk } from './meChunk';
import { errorView } from './feedback';
import { icon, isIconName, type IconName } from './icons';
import { backToStory, startSandbox } from './modes';
import { isStory } from '../session';
import { mascot } from './mascots';
import { go } from './router';
import { renderResult } from './resultTable';

/** #/dashboard (product-design-v3 Part A, L48/L49): player cards first, then the company tiles from content/kpis.yml. */

/** Solution results per step, run once per session and only for open tiles (an open tile = task already solved: nothing leaks). */
const kpiRuns = new Map<string, Promise<QueryResult>>();
function kpiResult(tk: Ticket, step: number): Promise<QueryResult> {
  const key = stepKey(tk.id, step);
  let run = kpiRuns.get(key);
  if (!run) {
    run = app.run(tk.steps[step].solution); // DbClient queues it until the database is ready
    kpiRuns.set(key, run);
    run.catch(() => kpiRuns.delete(key)); // a failed run is retried on the next draw
  }
  return run;
}

const BIG = 'm-0 text-3xl font-bold tabular-nums';
const KIND_ICON: Record<Kpi['kind'], IconName> = { number: 'hash', rowcount: 'list', bar: 'chart' };
const kpiIcon = (k: Kpi): IconName => (k.icon && isIconName(k.icon) ? k.icon : KIND_ICON[k.kind]);
const ICON_BTN = 'grid size-10 shrink-0 place-items-center p-0 sm:size-8';
const KIND_ICONS: Record<CardKind, IconName> = { table: 'table', number: 'hash', bar: 'chart', line: 'lineChart' };

/** Screen-reader line for moves, hides and unpins (the button that was pressed may be gone after the redraw). */
const announce = (text: string): void => {
  byId('announce').textContent = text;
};

/**
 * L42: the rounded value shows, the exact one is in `title` (hover) and in the screen-reader text.
 * L23: neutral text and bars, numbers in tabular figures; colour stays in small badges.
 */
export function kpiView(v: KpiValue, unit: string): HTMLElement {
  const unitEl = unit ? h('span', { class: 'text-body font-medium text-muted', 'aria-hidden': 'true' }, unit) : null;
  if ('text' in v) {
    return h('p', { class: cx(BIG, 'flex flex-wrap items-baseline gap-x-1.5'), title: unit ? `${v.full} ${unit}` : v.full },
      h('span', { 'aria-hidden': 'true' }, v.text), unitEl,
      h('span', { class: 'sr-only' }, unit ? `${v.full} ${unit}` : v.full));
  }
  const max = Math.max(1, ...v.bars.map((b) => b.value));
  return h('ul', { class: 'm-0 list-none space-y-1.5 p-0' }, ...v.bars.map((b) =>
    h('li', { class: 'grid grid-cols-[minmax(0,8rem)_1fr_auto] items-center gap-2 text-body-sm', title: `${b.label}: ${b.full}${unit ? ` ${unit}` : ''}` },
      h('span', { class: 'truncate' }, b.label),
      h('span', { class: 'h-2.5 rounded-r-[3px] bg-chart', style: `width:${Math.round((b.value / max) * 100)}%`, 'aria-hidden': 'true' }),
      h('span', { class: 'tabular-nums' }, b.text, unit ? h('span', { class: 'text-muted' }, ` ${unit}`) : null))));
}

export const KIND_LABEL: Record<CardKind, Key> = { table: 'card.kind.table', number: 'card.kind.number', bar: 'card.kind.bar', line: 'card.kind.line' };
export const skillOf = (id: string) => SKILLS.find((s) => s.id === id)!;

/** What a card shows for its result: a big number, the first rows, bars or a line (shared with the pin dialog's preview). */
export function cardBody(c: Card, r: QueryResult): HTMLElement {
  const col = c.col ?? 0;
  if (colGone(c, r)) return h('p', { class: 'm-0 text-muted' }, t('card.colGone', { n: col + 1 }));
  if (c.kind === 'number') {
    const v = kpiNumber(Number(r.rows[0]?.[col] ?? NaN), getLang());
    return kpiView(v, '');
  }
  const cut = (n: number) => (r.rows.length > n ? h('p', { class: 'mt-1 mb-0 text-body-sm text-muted' }, t('card.rowsShown', { n, total: r.rows.length })) : null);
  if (c.kind === 'table') return h('div', { class: 'min-w-0 overflow-x-auto' }, renderResult({ ...r, rows: r.rows.slice(0, TABLE_ROWS) }), cut(TABLE_ROWS));
  const spec = cardSpec(r);
  if (!spec || spec.kind !== c.kind) return h('p', { class: 'm-0 text-muted' }, t('chart.empty', { max: MAX_POINTS }));
  const n = c.kind === 'bar' ? BAR_ROWS : MAX_POINTS;
  const shown = { ...r, rows: r.rows.slice(0, n) };
  return h('div', { class: 'overflow-x-auto' }, c.kind === 'bar' ? bars(shown, spec, col, 'card') : line(shown, spec, col, 'card'), cut(n));
}

/** Once per session, one card after another (src/dashboard.ts cardRunner); a card that timed out is saved as slow. */
const cards = cardRunner((sql, d) => app.run(sql, { schema: domainSchemaId(d) }), (id, d) => {
  const saved = domainSlot(app.save, d).dashboard.cards.find((x) => x.id === id);
  if (saved) saved.slow = true;
  persist(true);
}, activeDomain);
/** main.ts, when "My data" changes: results (and "table missing" errors) from before the change are dropped. */
export const resetCards = (): void => cards.clear();

/** "SQL của bạn · Sandbox" / "· việc …": where the card was pinned from. */
function sourceLine(c: Card): string {
  if (c.source === 'sandbox') return t('card.fromSandbox');
  const tk = app.tickets.find((x) => x.id === c.source);
  if (tk) return t('card.fromTask', { title: textOf(tk, getLang()).title });
  const lane = loadLanes().tasks.find((x) => x.id === c.source);
  return lane ? t('card.fromLane', { id: laneLabel(lane), name: ROUTES.find((r) => r.port === lane.lane)?.name ?? '' }) : t('card.yours');
}

function playerCard(c: Card, i: number, n: number, redraw: () => void): HTMLElement {
  const body = h('div', { class: 'min-h-9', 'data-card-body': '' });
  const ran = h('span', { class: 'tabular-nums' });
  const save = () => {
    persist(true);
    redraw();
  };
  const rerun = () => {
    cards.forget(c.id);
    delete c.slow;
    void cards.result(c).catch(() => {}); // started before the redraw, so a card never run here runs too
    save();
  };
  if (c.slow) {
    body.append(h('div', { class: 'rounded-(--r-inset) bg-warn-soft p-3 text-body-sm text-ink ring-1 ring-warn/40' },
      h('p', { class: 'm-0 flex items-center gap-1.5 font-semibold' }, icon('alert', 'size-4'), t('dash.slowTitle')),
      h('p', { class: 'mt-1 mb-2' }, t('dash.slow')),
      h('button', { type: 'button', class: 'flex items-center gap-1.5 px-3 py-1', onclick: rerun }, icon('refresh', 'size-4'), t('dash.retrySlow'))));
  } else if (!cards.has(c) && !ranHere(c)) {
    body.append(h('p', { class: 'mt-0 mb-2 text-body-sm text-muted' }, t('dash.notRun')),
      h('button', { type: 'button', class: 'flex items-center gap-1.5 px-3 py-1', onclick: rerun }, icon('refresh', 'size-4'), t('dash.run')));
  } else {
    body.append(h('p', { class: 'm-0 text-muted' }, t('dash.waiting')));
    cards.result(c).then((r) => {
      markRan(c);
      body.replaceChildren(cardBody(c, r));
      body.dataset.ready = ''; // v16: what the card's PNG captures
      if (r.ms !== undefined) ran.textContent = t('dash.ran', { ms: r.ms });
    }, (e: unknown) => {
      if (e instanceof QueryTimeoutError) redraw(); // now marked slow
      else body.replaceChildren(errorView(e));
    });
  }
  const move = (dir: -1 | 1) => {
    const d = domainSlot(app.save, activeDomain()).dashboard;
    d.cards = moveCard(d.cards, i, dir);
    save();
    // The moved card's same button keeps focus; at the top or bottom it is disabled, so the other arrow takes it.
    const edge = i + dir === 0 || i + dir === n - 1;
    const act = (dir < 0) !== edge ? 'up' : 'down';
    document.querySelector<HTMLElement>(`[data-card="${c.id}"][data-act="${act}"]`)?.focus();
    announce(t('dash.moved', { title: c.title, i: i + dir + 1, n }));
  };
  const btn = (act: string, name: IconName, label: string, onclick: () => void, disabled = false) =>
    h('button', { type: 'button', class: ICON_BTN, 'data-card': c.id, 'data-act': act, title: label, 'aria-label': label, disabled, onclick }, icon(name, 'size-4'));
  // A table needs width more than the charts do: two columns from sm (no dense flow: visual order = Lên/Xuống order).
  const article: HTMLElement = h('article',{ class: cx(CARD, 'flex min-w-0 flex-col gap-3 p-4', c.kind === 'table' && 'sm:col-span-2') },
    h('div', { class: 'flex items-start gap-2' },
      h('span', { class: 'grid size-9 shrink-0 place-items-center rounded-(--r-inset) bg-code', 'aria-hidden': 'true' }, icon(KIND_ICONS[c.kind])),
      h('h3', { class: 'm-0 min-w-0 flex-1 self-center text-body-sm leading-snug font-semibold break-words' }, c.title)),
    body,
    h('details', { class: 'text-body-sm' },
      h('summary', { class: 'cursor-pointer text-muted' }, t('dash.sql')),
      h('pre', { class: 'sql mt-2 mb-0 max-h-48 overflow-auto' }, c.sql)),
    h('div', { class: 'mt-auto flex flex-wrap items-center gap-1 text-body-sm text-muted' },
      h('span', { class: 'mr-auto' }, sourceLine(c), ' · ', ran),
      btn('up', 'up', t('dash.up', { title: c.title }), () => move(-1), i === 0),
      btn('down', 'down', t('dash.down', { title: c.title }), () => move(1), i === n - 1),
      btn('rerun', 'refresh', t('dash.rerun', { title: c.title }), rerun),
      btn('png', 'image', t('dash.png', { title: c.title }), () => void meTools().then((m) => m.cardPng(article, c)).then(say, () => say(t('me.failed')))),
      btn('unpin', 'unpin', t('dash.unpin', { title: c.title }), () => {
        const d = domainSlot(app.save, activeDomain()).dashboard;
        d.cards = d.cards.filter((x) => x.id !== c.id);
        cards.forget(c.id);
        save();
        byId('dash-mine-title').focus();
        announce(t('dash.unpinned', { title: c.title }));
      })));
  return article;
}

/** v16 (L142): the file and picture exports live in the lazy `meView` chunk (loaded through src/ui/me.ts on the first click). */
const meTools = meChunk;
/** The last export/import sentence: shown under "My cards" (role=status) and read once. */
let dashMsg = '';
let redrawDash: () => void = () => {};
function say(msg: string): void {
  dashMsg = msg;
  redrawDash();
  announce(msg);
}

/** Starter cards run once per session like player cards, but are never saved, never marked "ran" and never slow-flagged. */
const starters = cardRunner((sql, d) => app.run(sql, { schema: domainSchemaId(d) }), () => {}, activeDomain);

/**
 * D-DB1 (L86): why the player cannot make cards yet, or undefined when they can. One function for the dashboard, Pin and
 * the pin dialog. `n` is the domain's chapter that teaches the skill.
 */
/** Skills that open card kinds: learned anywhere (story ticket, ≥ 2 General drills, or a review card), like knownSkills elsewhere. */
export const cardSkills = (): Set<string> => knownSkills(app.save, app.tickets, SKILLS.map((s) => s.id));

export function customLock(): { skill: string; n: number } | undefined {
  const cards = domainSlot(app.save, activeDomain()).dashboard.cards.length;
  if (customCardsOpen(cardSkills(), cards, gated(readTour()))) return undefined;
  const s = domainSkills(app.tickets).find((x) => x.id === CUSTOM_SKILL) ?? skillOf(CUSTOM_SKILL);
  return { skill: s.label[getLang()], n: s.chapter };
}

function starterCard(c: Card): HTMLElement {
  const body = h('div', { class: 'min-h-9' }, h('p', { class: 'm-0 text-muted' }, t('dash.waiting')));
  starters.result(c).then((r) => body.replaceChildren(cardBody(c, r)), (e: unknown) => body.replaceChildren(errorView(e)));
  return h('article', { class: cx(CARD, 'flex min-w-0 flex-col gap-3 p-4') },
    h('div', { class: 'flex items-start gap-2' },
      h('span', { class: 'grid size-9 shrink-0 place-items-center rounded-(--r-inset) bg-code', 'aria-hidden': 'true' }, icon(KIND_ICONS[c.kind])),
      h('h3', { class: 'm-0 min-w-0 flex-1 self-center text-body-sm leading-snug font-semibold break-words' }, c.title),
      h('span', { class: 'shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-caption font-semibold text-ink' }, t('dash.starterBadge'))),
    body,
    h('details', { class: 'mt-auto text-body-sm' },
      h('summary', { class: 'cursor-pointer text-muted' }, t('dash.sql')),
      h('pre', { class: 'sql mt-2 mb-0 max-h-48 overflow-auto' }, c.sql)));
}

/** Shown while the player has no card of their own (locked or not), so the page is never empty (D-DB1). */
function startersBlock(locked: boolean): HTMLElement | null {
  const list = starterCards(activeDomain(), unlockedTables(), (k) => t(k));
  if (!list.length) return null;
  return h('div', { class: 'mt-5' },
    h('h3', { class: 'm-0 text-body font-bold' }, t('dash.starters')),
    h('p', { class: 'mt-1 mb-3 text-body-sm text-muted' }, t('dash.startersIntro'), locked ? '' : ` ${t('dash.startersHide')}`),
    h('div', { class: 'grid gap-4 sm:grid-cols-2' }, ...list.map(starterCard))); // 4 columns left a chart < 260 px: scrollbars (L93)
}

/** Locked: what opens custom cards, the locked "Make a card" control (not a button) and one real way forward. */
function lockedMine(lock: { skill: string; n: number }): HTMLElement {
  const hint = t('dash.createLockedHint', lock);
  return h('section', { 'aria-labelledby': 'dash-mine-title' },
    h('h2', { id: 'dash-mine-title', tabindex: '-1', class: 'm-0 text-lg font-bold' }, t('dash.mine')),
    h('div', { class: cx(CARD, 'mt-3 flex flex-wrap items-start gap-4 p-5') },
      h('span', { class: 'grid size-10 shrink-0 place-items-center rounded-(--r-inset) bg-code text-muted', 'aria-hidden': 'true' }, icon('lock')),
      h('div', { class: 'min-w-0 flex-1' },
        h('h3', { class: 'm-0 text-body font-bold' }, t('dash.lockedTitle')),
        h('p', { class: 'mt-1 mb-3 text-[15px] text-muted' }, t('dash.lockedWhy', lock)),
        h('div', { class: 'flex flex-wrap items-center gap-3' },
          h('span', {
            role: 'button', 'aria-disabled': 'true', tabindex: '0', title: hint, 'aria-label': `${t('dash.createLocked')}: ${hint}`,
            class: 'inline-flex shrink-0 cursor-not-allowed items-center gap-1.5 rounded-full border border-dashed border-line px-4 py-2 text-body-sm font-semibold whitespace-nowrap text-muted',
          }, icon('lock', 'size-4'), t('dash.createLocked')),
          // The hint is its own line: inside the pill it squeezed "Tạo card" into a column at 375 px (L93).
          h('span', { class: 'min-w-48 flex-1 text-body-sm text-muted', 'aria-hidden': 'true' }, hint),
          h('button', { type: 'button', class: cx(BTN_GO, 'px-4 py-2'), onclick: () => (isStory() ? go('play') : backToStory()) }, t('dash.toTask'))))),
    startersBlock(true));
}

function mineSection(redraw: () => void): HTMLElement {
  const lang = getLang();
  const cards = domainSlot(app.save, activeDomain()).dashboard.cards;
  const lock = customLock();
  if (lock) return lockedMine(lock);
  const learned = cardSkills();
  // One plain line, not a chip row (v6 §3.4, v10 UX #20).
  const kinds = CARD_KINDS.map((k) => {
    const skill = skillOf(KIND_SKILL[k]);
    return `${t(KIND_LABEL[k])}${learned.has(skill.id) ? '' : ` (${t('pin.kindLocked', { skill: skill.label[lang], n: skill.chapter })})`}`;
  }).join(' · ');
  return h('section', { 'aria-labelledby': 'dash-mine-title' },
    h('div', { class: 'flex flex-wrap items-center gap-x-3 gap-y-2' },
      h('h2', { id: 'dash-mine-title', tabindex: '-1', class: 'm-0 text-lg font-bold' }, t('dash.mine')),
      h('span', { class: 'text-body-sm text-muted' }, t('dash.count', { n: cards.length, max: MAX_CARDS })),
      h('span', { class: 'ml-auto flex flex-wrap gap-2' },
        cards.length ? h('button', { type: 'button', class: 'flex items-center gap-1.5 px-3 py-1 text-body-sm', onclick: () => void meTools().then((m) => m.exportDash()).then(say, () => say(t('me.failed'))) }, icon('download', 'size-4'), t('dash.export')) : null,
        h('button', { type: 'button', class: 'flex items-center gap-1.5 px-3 py-1 text-body-sm', onclick: () => void meTools().then((m) => m.importDashFile((msg) => say(msg)), () => say(t('me.failed'))) }, icon('upload', 'size-4'), t('dash.import')),
        cards.length ? h('button', { type: 'button', class: 'flex items-center gap-1.5 px-3 py-1 text-body-sm', onclick: () => startSandbox() }, icon('flask', 'size-4'), t('dash.toSandbox')) : null)), // empty: the empty state holds it
    dashMsg ? h('p', { class: 'mt-2 mb-0 text-body-sm', role: 'status' }, dashMsg) : null,
    h('p', { class: 'mt-2 mb-3 text-body-sm' }, h('span', { class: 'text-muted' }, t('dash.kinds')), ' ', kinds),
    cards.length >= MAX_CARDS ? h('p', { class: 'mb-3 text-body-sm', role: 'note' }, t('dash.full', { max: MAX_CARDS })) : null,
    cards.length
      ? h('div', { class: 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3' }, ...cards.map((c, i) => playerCard(c, i, cards.length, redraw)))
      : h('div', { class: cx(CARD, 'p-5') },
        mascot('lily', 'sleep', 'size-16 mb-2'), // v6 §2.4: an empty state
        h('h3', { class: 'm-0 text-body font-bold' }, t('dash.emptyTitle')),
        h('p', { class: 'mt-1 mb-3 text-[15px] text-muted' }, t('dash.empty')),
        h('button', { type: 'button', class: cx(BTN_GO, 'px-4 py-2'), onclick: () => startSandbox() }, t('dash.toSandbox'))),
    cards.length ? null : startersBlock(false));
}

function setHidden(id: string, hide: boolean, label: string, redraw: () => void): void {
  const d = domainSlot(app.save, activeDomain()).dashboard;
  d.hidden = hide ? [...d.hidden, id] : d.hidden.filter((x) => x !== id);
  persist(true);
  redraw();
  byId('dash-company-title').focus(); // the pressed button is gone after the redraw
  announce(t(hide ? 'dash.hiddenDone' : 'dash.shownDone', { title: label }));
}

/** ui-ux-v3 §c: icon + label, then the big value with its unit, then the source line. Company tiles can only be hidden (L49). */
function kpiTile(tile: KpiTile, redraw: () => void): HTMLElement {
  const lang = getLang();
  const { kpi, ticket } = tile;
  const open = tile.open && !!ticket;
  const unit = kpi.unit?.[lang] ?? '';
  const value = h('div', { class: 'min-h-9' });
  if (open) {
    value.append(h('p', { class: cx(BIG, 'text-muted') }, '…'));
    kpiResult(ticket, kpi.step).then(
      (r) => value.replaceChildren(kpiView(kpiValue(kpi, r, lang), unit)),
      () => value.replaceChildren(h('p', { class: cx(BIG, 'text-muted') }, '—')));
  } else {
    // A locked tile shows an empty bar, never "—" or "???" (they read as broken data; v12 audit).
    // The "locked" chip sits in that bar, not beside the title, so a 4-column tile keeps its title width (L93).
    value.append(h('div', { class: 'flex h-9 items-center justify-center gap-1 rounded-(--r-inset) border border-dashed border-line bg-code text-caption font-semibold text-muted' },
      icon('lock', 'size-3.5'), t('dash.kpiLocked')));
  }
  const foot = open ? t('home.kpiFrom', { title: textOf(ticket, lang).title })
    : ticket ? t('home.kpiLocked', { n: ticket.chapter, title: textOf(ticket, lang).title, name: ticket.from.name })
      : t('home.kpiLater', { n: chapterOfId(kpi.ticket) });
  const label = kpi.label[lang];
  return h('article', { class: cx(CARD, 'flex flex-col gap-3 p-4') },
    h('div', { class: 'flex items-start gap-3' },
      h('span', { class: cx('grid size-9 shrink-0 place-items-center rounded-(--r-inset)', open ? 'bg-code text-ink' : 'bg-code text-muted') }, icon(kpiIcon(kpi))),
      h('h3', { class: 'm-0 flex-1 self-center text-body-sm leading-snug font-medium' }, label),
      open ? h('button', { type: 'button', class: ICON_BTN, title: t('dash.hide', { title: label }), 'aria-label': t('dash.hide', { title: label }), onclick: () => setHidden(kpi.id, true, label, redraw) },
        icon('eyeOff', 'size-4'))
        : null), // a locked tile has nothing to hide yet
    value,
    h('p', { class: 'mt-auto mb-0 flex items-start gap-1.5 text-body-sm text-muted' }, icon(open ? 'link' : 'lock', 'mt-0.5 size-4'), h('span', {}, foot)));
}

function companySection(redraw: () => void): HTMLElement {
  const lang = getLang();
  const tiles = kpiTiles(kpisOf(), app.tickets, done());
  const hidden = new Set(domainSlot(app.save, activeDomain()).dashboard.hidden);
  const shown = tiles.filter((x) => !hidden.has(x.kpi.id));
  const gone = tiles.filter((x) => hidden.has(x.kpi.id));
  return h('section', { 'aria-labelledby': 'dash-company-title' },
    h('div', { class: 'flex flex-wrap items-baseline gap-x-3' },
      h('h2', { id: 'dash-company-title', tabindex: '-1', class: 'm-0 text-lg font-bold' }, t('dash.company')),
      h('span', { class: 'text-body-sm text-muted' }, t('dash.companyOpen', { n: tiles.filter((x) => x.open).length, total: tiles.length }))),
    h('p', { class: 'mt-1 mb-3 text-[15px] text-muted' }, t('dash.companyIntro')),
    h('div', { class: 'grid gap-4 sm:grid-cols-2 lg:grid-cols-4' }, ...shown.map((x) => kpiTile(x, redraw))),
    gone.length
      ? h('details', { class: 'mt-3' },
        h('summary', { class: 'cursor-pointer text-body-sm text-muted' }, t('dash.hidden', { n: gone.length })),
        h('ul', { class: 'mt-2 list-none space-y-1 p-0' }, ...gone.map((x) => h('li', {},
          h('button', { type: 'button', class: 'flex items-center gap-2 px-2 py-1 text-body-sm', onclick: () => setHidden(x.kpi.id, false, x.kpi.label[lang], redraw) },
            icon('eye', 'size-4'), t('dash.show', { title: x.kpi.label[lang] }))))))
      : null);
}

/** Redrawn by main.ts (route shown, language switch, progress); main.ts focuses the title after a route change. */
export function renderDashboard(host: HTMLElement): void {
  const redraw = (): void => renderDashboard(host);
  redrawDash = redraw;
  host.replaceChildren(h('div', { class: 'mx-auto max-w-(--w-wide) space-y-6 px-4 py-6' },
    h('header', {},
      h('h1', { id: 'dashboard-title', tabindex: '-1', class: 'm-0 text-2xl font-bold' }, t('dash.title')),
      h('p', { class: 'mt-1 mb-0 max-w-3xl text-[15px] text-muted' }, t(customLock() ? 'dash.introLocked' : 'dash.intro'))),
    mineSection(redraw), // L49: the player's own cards come before the company figures
    companySection(redraw)));
  dashMsg = ''; // shown by this draw only: a later redraw (language, domain) never repeats an old sentence
}
