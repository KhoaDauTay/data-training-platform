import { activeDomain } from '../domains';
import { getLang, t, type Key } from '../i18n';
import { rankOf, type Rank } from '../progress';
import { derive, GATE_WAIT, routeOpenedBy, ROUTES, sceneOf, STEPS, type Harbor, type Lane, type Scene } from '../scene';
import { app } from '../state';
import { CHAPTER_COLOR, chapterColor, cx, DONE_PILL, PILL } from '../theme';
import { textOf, type Lang, type Ticket } from '../tickets';
import { avatar } from './avatar';
import { byId, h, nodes, reducedMotion } from './dom';
import { bayBox, CRANE, drawYard, harborScene, MAX_TIERS, type HarborParts } from './harbor';
import { paintRoutes, routeMap, type MapParts } from './routeMap';
import { stageEsc } from './shortcuts';
import { s } from './svg';

/** One completion animation. `fast`: skipped or reduced motion, so every tween draws its end state at once. */
interface Run { fast: boolean; done: boolean }
interface Ctx {
  run: Run;
  tk: Ticket;
  scene: Scene;
  before: Harbor;
  after: Harbor;
  rankBefore: Rank;
  rankAfter: Rank;
  art: HTMLElement;
  /** Language the art was drawn in: relabelStage() redraws it after a switch. */
  lang: Lang;
  harbor?: HarborParts;
  map?: MapParts;
}

let current: Run = { fast: true, done: true };
let queue: Promise<void> = Promise.resolve();
let hideTimer = 0;
/** The completion on screen, so relabelStage() can rebuild its sentence in the new language. */
let shown: Ctx | undefined;
/** Where focus came from when it entered the stage (the Skip button): hide() hands it back there. */
let returnFocus: HTMLElement | null = null;

const easeInOut = (x: number): number => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
const easeIn = (x: number): number => x * x;
const easeOut = (x: number): number => 1 - (1 - x) * (1 - x);
const linear = (x: number): number => x;
const lerp = (a: number, b: number, x: number): number => a + (b - a) * x;

/** Draws f(0 → 1) over `ms` with requestAnimationFrame. A fast run draws f(1) at once: skip = jump to the end state. */
function tween(run: Run, ms: number, f: (x: number) => void, ease = easeInOut): Promise<void> {
  return new Promise((resolve) => {
    if (run.fast) {
      f(1);
      resolve();
      return;
    }
    const t0 = performance.now();
    const step = (now: number): void => {
      const x = run.fast ? 1 : Math.min(1, (now - t0) / ms);
      f(ease(x));
      if (x < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}
const wait = (run: Run, ms: number): Promise<void> => tween(run, ms, () => {});

const portName = (code: string): string => ROUTES.find((r) => r.port === code)?.name ?? code;
const titleOf = (c: Ctx): string => textOf(c.tk, getLang()).title;
/** Lanes this completion opened (L32: the chapter's lane and/or the lane its ship sailed), as port names. */
const openedNames = (c: Ctx): string[] => ROUTES.filter((r) => c.after.open.has(r.port) && !c.before.open.has(r.port)).map((r) => r.name);

// ---- scene parts (geometry of mockup v5) ----
function setCrane(p: HarborParts, x: number, y: number, carry?: string | false): void {
  p.trolley.setAttribute('transform', `translate(${x},0)`);
  p.cable.setAttribute('y2', String(y));
  p.spreader.setAttribute('y', String(y));
  p.carry.setAttribute('y', String(y + 4));
  if (carry === false) p.carry.setAttribute('opacity', '0');
  else if (carry) {
    p.carry.setAttribute('class', carry);
    p.carry.setAttribute('opacity', '1');
  }
}
/** x: 0 = at the berth, 1 = out at sea, shrinking toward Son Tra. */
function setShip(p: HarborParts, x: number, alpha: number): void {
  p.ship.setAttribute('transform', `translate(${-430 * x},${-12 * x}) translate(580,266) scale(${1 - 0.45 * x}) translate(-580,-266)`);
  p.ship.setAttribute('opacity', String(alpha));
}
function setTruck(p: HarborParts, x: number, alpha = 1): void {
  p.truck.setAttribute('transform', `translate(${x},0)`);
  p.truck.setAttribute('opacity', String(alpha));
}
const setBarrier = (p: HarborParts, deg: number): void => p.barrier.setAttribute('transform', `rotate(${deg} 905 339)`);
const setShutter = (p: HarborParts, open: number): void => p.shutter.setAttribute('height', String(44 * (1 - open)));
function gateTag(p: HarborParts, label: string): void {
  p.gateText.textContent = label;
  p.gateTag.setAttribute('opacity', label ? '1' : '0');
}

/** The berthed ship sails out (1.6 s), then sits hidden until berthBack(). */
async function departBerth(c: Ctx): Promise<void> {
  const p = c.harbor;
  if (!p) return;
  await tween(c.run, 1600, (x) => setShip(p, x, x < 0.7 ? 1 : 1 - (x - 0.7) / 0.3), easeIn);
  setShip(p, 0, 0);
}
async function berthBack(c: Ctx, ms: number): Promise<void> {
  const p = c.harbor;
  if (p) await tween(c.run, ms, (x) => setShip(p, 0, x));
}

/** +1 container in this chapter's bay (§1.1), then the yard is redrawn from `after` with a bright edge on it. */
async function dropContainer(c: Ctx, ms: number): Promise<void> {
  const p = c.harbor;
  if (!p) return;
  const ch = c.tk.chapter;
  const tier = (c.after.bays[ch] ?? 1) - 1;
  if (tier < MAX_TIERS) {
    const b = bayBox(ch, tier);
    const box = s('rect', { x: b.x, y: b.y - 30, width: b.w, height: b.h - 0.6, class: chapterColor(ch).fill, opacity: 0 });
    p.drop.append(box);
    await tween(c.run, ms, (x) => {
      box.setAttribute('y', String(b.y - 30 * (1 - x)));
      box.setAttribute('opacity', String(Math.min(1, x * 2)));
    }, easeIn);
    box.remove();
  }
  drawYard(p, c.after, new Set([ch]));
}

async function toGate(c: Ctx, ms: number): Promise<void> {
  const p = c.harbor!;
  p.truckBox.setAttribute('class', chapterColor(c.tk.chapter).fill);
  setBarrier(p, 0);
  await tween(c.run, ms, (x) => setTruck(p, lerp(640, 778, x), Math.min(1, x * 3)), easeOut);
}

/** A ship runs the lane to `port`, its wake lights up, then the lanes repaint from `after` (a new lane turns solid). */
async function sail(c: Ctx, port: string, ms: number): Promise<void> {
  const m = c.map;
  if (!m) return wait(c.run, ms);
  const path = m.routes[port];
  const len = path.getTotalLength();
  m.wake.setAttribute('d', path.getAttribute('d') ?? '');
  m.wake.setAttribute('class', chapterColor(c.tk.chapter).stroke);
  m.wake.setAttribute('stroke-dasharray', String(len));
  m.wake.setAttribute('opacity', '0.55');
  m.ship.setAttribute('opacity', '1');
  await tween(c.run, ms, (x) => {
    const at = path.getPointAtLength(x * len);
    const ahead = path.getPointAtLength(Math.min(len, x * len + 1));
    const deg = (Math.atan2(ahead.y - at.y, ahead.x - at.x) * 180) / Math.PI;
    const flip = Math.abs(deg) > 90;
    m.ship.setAttribute('transform', `translate(${at.x},${at.y}) rotate(${flip ? deg + 180 : deg}) scale(${flip ? -1 : 1},1)`);
    m.wake.setAttribute('stroke-dashoffset', String(len * (1 - x)));
  });
  m.ship.setAttribute('opacity', '0');
  m.wake.setAttribute('opacity', '0');
  paintRoutes(m, c.after);
}

// ---- cards over the art ----
const CARD_OV = 'w-64 max-w-[calc(100vw-4rem)] rounded-xl bg-panel p-3 text-sm shadow-lg ring-1 ring-line';
const STAMP = 'absolute rounded-md border-[3px] px-2 py-0.5 text-[15px] font-extrabold tracking-wide uppercase';
/** Lane colour is never the only signal: the stamp spells the lane out (§6). */
const LANE: Record<Lane, { key: Key; stamp: string }> = {
  green: { key: 'anim.laneGreen', stamp: 'border-emerald-700 bg-emerald-50 text-emerald-800 dark:border-emerald-400 dark:bg-emerald-950 dark:text-emerald-200' },
  yellow: { key: 'anim.laneYellow', stamp: 'border-yellow-700 bg-yellow-50 text-yellow-800 dark:border-yellow-400 dark:bg-yellow-950 dark:text-yellow-200' },
  red: { key: 'anim.laneRed', stamp: 'border-red-700 bg-red-50 text-red-800 dark:border-red-400 dark:bg-red-950 dark:text-red-200' },
};
const GATE: Record<Lane, Key | undefined> = { green: undefined, yellow: 'anim.gateYellow', red: 'anim.gateRed' };

/** Top right over a picture (centred for the promotion card); on its own when the kind has no picture (quote, ledger, chat). */
function overlay(c: Ctx, card: HTMLElement, centre = false): HTMLElement {
  const pictured = Boolean(c.harbor || c.map);
  card.style.opacity = '0';
  c.art.append(h('div', { class: pictured ? (centre ? 'absolute top-3 left-1/2 -translate-x-1/2' : 'absolute top-2 right-2') : 'p-3' }, card));
  return card;
}
const fadeIn = (run: Run, el: HTMLElement, ms: number): Promise<void> =>
  tween(run, ms, (x) => {
    el.style.opacity = String(x);
    el.style.transform = `translateY(${-8 * (1 - x)}px)`;
  });
/** Under reduced motion the final card stays until Close or the next completion (§5). */
const fadeOut = (run: Run, el: HTMLElement, ms: number): Promise<void> =>
  reducedMotion() ? Promise.resolve() : tween(run, ms, (x) => { el.style.opacity = String(1 - x); });

function confetti(c: Ctx, ms: number): Promise<void> {
  const box = h('div', { class: 'pointer-events-none absolute inset-0 overflow-hidden' });
  const bits = Array.from({ length: 42 }, (_, i) => {
    const el = h('span', { class: cx('absolute top-1/3 left-1/2 block h-3 w-2 rounded-sm', CHAPTER_COLOR[(i % 12) + 1].bar) });
    box.append(el);
    return { el, vx: (Math.random() - 0.5) * 520, vy: -120 - Math.random() * 160, spin: Math.random() * 720 };
  });
  c.art.append(box);
  return tween(c.run, ms, (x) => bits.forEach((b) => {
    b.el.style.transform = `translate(${b.vx * x}px, ${b.vy * x + 360 * x * x}px) rotate(${b.spin * x}deg)`;
    b.el.style.opacity = String(1 - x * x);
  }), linear).then(() => box.remove());
}

function promoCard(c: Ctx): HTMLElement {
  const lang = getLang();
  const from = c.rankBefore.tier?.[lang] ?? t('career.intern');
  const to = c.rankAfter.tier?.[lang] ?? t('career.intern');
  const opened = openedNames(c);
  return h('div', { class: 'w-80 max-w-[calc(100vw-4rem)] rounded-2xl bg-panel p-4 text-center shadow-xl ring-2 ring-amber-500' },
    h('p', { class: 'm-0 text-sm font-semibold tracking-wide text-amber-800 uppercase dark:text-amber-200' }, t('anim.promoKicker', { n: c.tk.chapter })),
    h('p', { class: 'm-0 text-lg font-bold' }, from !== to ? `${from} → ${to}` : t('anim.promoStep', { career: c.rankAfter.career?.[lang] ?? to })),
    opened.length ? h('p', { class: 'm-0 text-sm text-muted' }, t('anim.promoRoute', { port: opened.join(', ') })) : null);
}

// ---- the eight kinds (§2), step durations from STEPS ----
const PLAY: Record<Scene['kind'], (c: Ctx) => Promise<void>> = {
  async ship(c) {
    const [sailMs, backMs] = STEPS.ship;
    await Promise.all([departBerth(c), c.scene.to ? sail(c, c.scene.to, sailMs) : wait(c.run, sailMs)]);
    await Promise.all([berthBack(c, backMs), dropContainer(c, backMs)]);
  },

  async yard(c) {
    const p = c.harbor!;
    const [lowerMs, liftMs, travelMs, downMs, releaseMs, homeMs] = STEPS.yard;
    const ch = c.tk.chapter;
    const b = bayBox(ch, Math.min((c.after.bays[ch] ?? 1) - 1, MAX_TIERS - 1));
    const bayX = b.x + b.w / 2;
    await tween(c.run, lowerMs, (x) => setCrane(p, CRANE.x, lerp(CRANE.y, 220, x), false));
    setCrane(p, CRANE.x, 220, chapterColor(ch).fill);
    await tween(c.run, liftMs, (x) => setCrane(p, CRANE.x, lerp(220, 160, x)));
    await tween(c.run, travelMs, (x) => setCrane(p, lerp(CRANE.x, bayX, x), 160));
    await tween(c.run, downMs, (x) => setCrane(p, bayX, lerp(160, b.y - 4, x)));
    setCrane(p, bayX, b.y - 4, false);
    drawYard(p, c.after, new Set([ch]));
    await tween(c.run, releaseMs, (x) => setCrane(p, bayX, lerp(b.y - 4, CRANE.y, x)));
    await tween(c.run, homeMs, (x) => setCrane(p, lerp(bayX, CRANE.x, x), CRANE.y));
  },

  async customs(c) {
    const p = c.harbor!;
    const lane = c.scene.lane ?? 'green';
    const [showMs, stampMs, gateMs, barrierMs, driveMs] = STEPS.customs;
    const stamp = h('span', { class: cx(STAMP, 'right-3 bottom-2', LANE[lane].stamp) }, t('anim.stamp', { lane: t(LANE[lane].key) }));
    stamp.style.opacity = '0';
    const card = overlay(c, h('div', { class: cx(CARD_OV, 'relative pb-12') },
      h('p', { class: 'm-0 font-semibold text-muted' }, t('anim.declaration')),
      h('p', { class: 'm-0 font-bold' }, titleOf(c)),
      stamp));
    await fadeIn(c.run, card, showMs);
    await tween(c.run, stampMs, (x) => {
      stamp.style.opacity = String(Math.min(1, x * 2));
      stamp.style.transform = `rotate(-10deg) scale(${lerp(2.2, 1, x)})`;
    }, easeIn);
    await toGate(c, gateMs);
    const gate = GATE[lane];
    if (gate) {
      gateTag(p, t(gate));
      await wait(c.run, GATE_WAIT[lane]);
      gateTag(p, '');
    }
    await tween(c.run, barrierMs, (x) => setBarrier(p, 80 * x));
    await Promise.all([
      tween(c.run, driveMs, (x) => setTruck(p, lerp(778, 960, x), x > 0.7 ? 1 - (x - 0.7) / 0.3 : 1), linear),
      dropContainer(c, 400),
      fadeOut(c.run, card, 300),
    ]);
    setBarrier(p, 0);
  },

  async truck(c) {
    const p = c.harbor!;
    const [gateMs, barrierMs, throughMs, inMs, closeMs] = STEPS.truck;
    await toGate(c, gateMs);
    await tween(c.run, barrierMs, (x) => setBarrier(p, 80 * x));
    await Promise.all([
      tween(c.run, throughMs, (x) => setTruck(p, lerp(778, 960, x)), linear),
      tween(c.run, throughMs, (x) => setShutter(p, x)),
    ]);
    await tween(c.run, inMs, (x) => setTruck(p, lerp(960, 1020, x)), linear);
    setBarrier(p, 0);
    await Promise.all([tween(c.run, closeMs, (x) => setShutter(p, 1 - x)), dropContainer(c, closeMs)]);
    setTruck(p, 640, 0);
  },

  async quote(c) {
    const [showMs, wait1, flipMs, wait2] = STEPS.quote; // card-only scenes keep their card: fading it left an empty dock (v10 B3)
    const front = h('div', {},
      h('p', { class: 'm-0 font-semibold text-muted' }, t('anim.quoteCard')),
      h('p', { class: 'm-0 font-bold' }, titleOf(c)),
      h('span', { class: cx(PILL, 'mt-1 bg-code text-muted') }, t('anim.quoteWaiting')));
    const back = h('div', { hidden: true },
      h('p', { class: 'm-0 font-semibold text-emerald-800 dark:text-emerald-200' }, t('anim.quoteCard')),
      h('p', { class: 'm-0 font-bold' }, t('anim.quoteAccepted')));
    const card = overlay(c, h('div', { class: CARD_OV }, front, back));
    await fadeIn(c.run, card, showMs);
    await wait(c.run, wait1);
    await tween(c.run, flipMs, (x) => {
      card.style.transform = `scaleX(${Math.abs(1 - 2 * x)})`; // a flat flip: shrink to the edge, swap faces, grow back
      if (x >= 0.5) {
        front.hidden = true;
        back.hidden = false;
      }
    });
    await wait(c.run, wait2);
  },

  async ledger(c) {
    const [showMs, stampMs, coinsMs, waitMs] = STEPS.ledger;
    const paid = h('span', { class: cx(STAMP, 'top-3 right-3', LANE.green.stamp) }, t('anim.paid'));
    paid.style.opacity = '0';
    const coins = Array.from({ length: 6 }, (_, i) =>
      h('span', { class: 'absolute size-4 rounded-full bg-amber-400 ring-2 ring-amber-600', style: `left:${16 + i * 22}px;top:56px` }));
    const card = overlay(c, h('div', { class: cx(CARD_OV, 'relative') },
      h('p', { class: 'm-0 font-semibold text-muted' }, t('anim.invoice')),
      h('p', { class: 'm-0 pr-20 font-bold' }, titleOf(c)),
      paid,
      ...coins,
      h('p', { class: 'mt-8 mb-0 rounded-lg bg-ink px-3 py-1.5 text-panel' }, t('anim.ledgerBook'))));
    await fadeIn(c.run, card, showMs);
    await tween(c.run, stampMs, (x) => {
      paid.style.opacity = String(Math.min(1, x * 2));
      paid.style.transform = `rotate(-10deg) scale(${lerp(2, 1, x)})`;
    }, easeIn);
    await tween(c.run, coinsMs, (x) => coins.forEach((coin, i) => {
      const k = Math.max(0, Math.min(1, x * 1.6 - i * 0.12));
      coin.style.transform = `translate(${lerp(0, 40, k)}px, ${lerp(0, 44, k) - 30 * Math.sin(k * Math.PI)}px)`;
      coin.style.opacity = k >= 1 ? '0' : '1';
    }), linear);
    await wait(c.run, waitMs);
  },

  async chat(c) {
    const [showMs, typingMs, bubbleMs, waitMs] = STEPS.chat;
    const dots = [0, 1, 2].map(() => h('span', { class: 'size-1.5 rounded-full bg-muted' }));
    const typing = h('span', { class: 'inline-flex gap-1 rounded-2xl rounded-tl-sm bg-code px-3 py-2' }, ...dots);
    const bubble = h('p', { class: 'm-0 rounded-2xl rounded-tl-sm bg-code px-3 py-2', hidden: true }, t('anim.thanks'));
    const happy = h('span', { class: cx(PILL, DONE_PILL) }, t('anim.happy'));
    happy.style.opacity = '0';
    const card = overlay(c, h('div', { class: cx(CARD_OV, 'space-y-2') },
      h('p', { class: 'm-0 flex items-center gap-2' }, avatar({ name: '', dept: 'CS' }, 'md'), h('b', {}, t('anim.customer'))),
      typing, bubble, happy));
    await fadeIn(c.run, card, showMs);
    await tween(c.run, typingMs, (x) => dots.forEach((d, i) => {
      d.style.transform = `translateY(${-3 * Math.max(0, Math.sin(x * 9 - i))}px)`;
    }), linear);
    typing.hidden = true;
    bubble.hidden = false;
    await tween(c.run, bubbleMs, (x) => {
      bubble.style.opacity = String(x);
      happy.style.opacity = String(x);
    });
    await wait(c.run, waitMs);
  },

  async promotion(c) {
    const [dropMs, restMs] = STEPS.promotion;
    const route = c.scene.to ?? routeOpenedBy(c.tk.chapter);
    const card = overlay(c, promoCard(c), true);
    await dropContainer(c, dropMs);
    if (!c.run.fast) void confetti(c, restMs);
    await Promise.all([
      departBerth(c).then(() => berthBack(c, 400)),
      route ? sail(c, route, 2200) : wait(c.run, 2200),
      fadeIn(c.run, card, 400),
      wait(c.run, restMs),
    ]);
  },
};

/** §6: the same sentence for screen readers and on screen, built from the ticket title (no made-up numbers). */
const DONE_KEY: Record<'truck' | 'quote' | 'ledger' | 'chat', Key> = {
  truck: 'anim.doneTruck', quote: 'anim.doneQuote', ledger: 'anim.doneLedger', chat: 'anim.doneChat',
};
function sentence(c: Ctx): string {
  const lang = getLang();
  const title = titleOf(c);
  const { kind, to, lane } = c.scene;
  if (kind === 'ship') return to ? t('anim.doneShip', { title, port: portName(to) }) : t('anim.doneShipNoPort', { title });
  if (kind === 'yard') {
    const total = app.tickets.filter((x) => x.chapter === c.tk.chapter).length;
    return t('anim.doneYard', { title, n: c.tk.chapter, k: c.after.bays[c.tk.chapter] ?? 0, total });
  }
  if (kind === 'customs') return t('anim.doneCustoms', { title, lane: t(LANE[lane ?? 'green'].key) });
  if (kind === 'promotion') {
    const rank = c.rankAfter.career?.[lang] ?? '';
    const opened = openedNames(c);
    const base = opened.length ? t('anim.donePromotion', { rank, port: opened.join(', ') }) : t('anim.donePromotionNoRoute', { rank });
    return to && !opened.includes(portName(to)) ? `${base} ${t('anim.alsoSailed', { port: portName(to) })}` : base; // L32: ch1-05's ship opens Rotterdam
  }
  return t(DONE_KEY[kind], { title });
}

/** Picture per kind (§4): the harbour close-up for port work, the route map when a ship has somewhere to go. */
function build(c: Ctx): void {
  const k = c.scene.kind;
  if (k === 'ship' || k === 'yard' || k === 'customs' || k === 'truck' || k === 'promotion') {
    c.harbor = harborScene(c.before, { ambient: false, current: c.tk.chapter, crop: true });
  }
  if ((k === 'ship' && c.scene.to) || k === 'promotion') c.map = routeMap(c.before);
  c.art.replaceChildren(...nodes(c.harbor?.svg, c.map?.svg));
}

function hide(): void {
  const stage = byId('stage');
  const had = stage.contains(document.activeElement);
  stage.hidden = true;
  shown = undefined;
  if (!had) return;
  // The first candidate that really takes focus (a removed or hidden one does not): where focus came from, the editor, the page heading.
  for (const el of [returnFocus, byId('work').querySelector<HTMLElement>('.cm-content'), document.getElementById('brief-title'), document.getElementById('home-title')]) {
    el?.focus();
    if (el && document.activeElement === el) return;
  }
}
function setSkipLabel(key: Key): void {
  const b = byId('stage-skip');
  b.dataset.i18n = key; // applyStatic() relabels it on a language switch
  b.textContent = t(key);
}
/**
 * rerender() calls this: the open dock follows a language switch (the Skip/Close label follows data-i18n). The sentence
 * changes at once; the art (labels, aria-labels, cards) is redrawn as its end state once a running animation has finished.
 */
export function relabelStage(): void {
  const c = shown;
  if (!c || byId('stage').hidden) return;
  byId('stage-text').textContent = sentence(c);
  if (c.lang === getLang()) return;
  c.lang = getLang();
  queue = queue
    .then(async () => {
      if (shown !== c) return; // hidden, or a newer completion took the dock
      build(c);
      await PLAY[c.scene.kind]({ ...c, run: { fast: true, done: true } }); // end state only, no replay
    })
    .catch((e: unknown) => console.warn('Completion redraw failed:', e));
}
function skip(): void {
  if (!current.done) current.fast = true; // jump to the end state; the sentence was already announced
  else hide();
}

/** Skip button and Esc (see stageEsc). */
export function initStage(): void {
  const stage = byId('stage');
  byId('stage-skip').addEventListener('click', skip);
  stage.addEventListener('focusin', (e) => {
    const from = e.relatedTarget;
    if (!(from instanceof Node && stage.contains(from))) returnFocus = from instanceof HTMLElement ? from : null; // never a stale target
  });
  document.addEventListener('keydown', (e) => {
    if (stageEsc(e, !stage.hidden, Boolean(document.querySelector('dialog:modal')))) skip(); // the non-modal notebook never blocks it
  });
  // Leaving the page closes the dock: it belongs to the task just solved and would cover the next page (UI/UX review v10 #10).
  window.addEventListener('hashchange', () => {
    if (stage.hidden) return;
    current.fast = true;
    hide();
  });
}

/**
 * First completion of `tk` (main.ts complete(); never for practice, retry or review, §1.4). Announces at once, then plays
 * sceneOf(tk) for ≤ 3 s without blocking input. An animation still running jumps to its end state first (no queue of
 * animations). Reduced motion: end state only, and the dock stays until Close or the next completion.
 */
export function playCompletion(tk: Ticket, before: Set<string>, after: Set<string>): void {
  if (activeDomain() !== 'logistics') { // Plan 9 D9-14: no completion scene in E-commerce yet, only the sentence
    const lang = getLang();
    const rank = rankOf(app.tickets, after);
    byId('announce').textContent = tk.beat === 'boss'
      ? t('ecom.promoted', { rank: (rank.career ?? rank.tier)?.[lang] ?? t('career.intern') })
      : t('ecom.done', { title: textOf(tk, lang).title });
    return;
  }
  current.fast = true;
  const run: Run = { fast: reducedMotion(), done: false };
  current = run;
  const c: Ctx = {
    run, tk, scene: sceneOf(tk), art: byId('stage-art'), lang: getLang(),
    before: derive(app.tickets, before), after: derive(app.tickets, after),
    rankBefore: rankOf(app.tickets, before), rankAfter: rankOf(app.tickets, after),
  };
  const text = sentence(c);
  byId('announce').textContent = text; // read now, not after the animation (§6)
  queue = queue
    .then(async () => {
      if (current !== run) return; // a newer completion already replaced this one
      window.clearTimeout(hideTimer);
      build(c);
      shown = c;
      byId('stage-text').textContent = text;
      setSkipLabel(run.fast ? 'app.close' : 'anim.skip');
      byId('stage').hidden = false;
      try {
        await PLAY[c.scene.kind](c);
      } finally {
        run.done = true;
      }
      if (current !== run) return;
      setSkipLabel('app.close');
      if (!reducedMotion()) hideTimer = window.setTimeout(hide, 4000);
    })
    .catch((e: unknown) => console.warn('Completion animation failed:', e));
}
