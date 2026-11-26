import { grade } from '../grader';
import { slowVerdict } from '../planCheck';
import { getLang, locale, t } from '../i18n';
import { engineCompareHash, engineCompareOf, engineHash, engineInterviewHash, engineInterviewOf, enginePathHash, enginePathOf, enginePlayOf, engineRouteOf, engineTermsHash, engineTermsOf, hashOf } from '../route';
import { SKILLS } from '../progress';
import { actions, app, persist } from '../state';
import { BTN_GHOST, BTN_GO, BTN_SECONDARY, CARD, cx, DONE_PILL, isDark, PILL } from '../theme';
import { optionOrder } from '../tickets';
import { illustration, loadedGsap, loadGsap } from '../art/load';
import { readJson, writeJson } from '../storage';
import { react } from './celebrate';
import { mascot } from './mascots';
import { announce, h, loader, reducedMotion } from './dom';
import { s } from './svg';
import { errorView } from './feedback';
import { createEditor } from './editor';
import { ABOVE, GROUP_TITLE, LIST, listRow, pageSubs, registerHomeSection } from './homeView';
import { icon, NAV_ICON } from './icons';
import { renderResult } from './resultTable';
import { registerSide } from './sidebar';
import { registerNav } from './topbar';
import { runOn, verdictText } from './tryPreview';

/**
 * ENG-CORE (L220): the Database Engine area's main-bundle part: the nav item, the #/engine page section, the sidebar rows,
 * the #/me block and the mobile SQL | Engine switch. Everything else (pages, lesson viewer, graders, VI/EN text, content) is
 * the lazy engineView chunk plus one source chunk per engine, handed every main value here (Plan 6 U3, like ui/meChunk.ts).
 */
type EngineView = typeof import('./engineView');
let pending: Promise<EngineView> | undefined;
let view: EngineView | undefined;
let failed = false;

type BestView = typeof import('./engineBest');
let best: BestView | undefined;
/** v24 BP-UI (L346): the Best Practice pages (#/engine/best…) come with the engine chunk: their own chunk + the card index. */
const isBest = (): boolean => /^#\/?engine\/best(?=$|[/?])/.test(location.hash); // = src/engine/best.ts bestRouteOf(hash) !== undefined

function engineChunk(): Promise<EngineView> {
  pending ??= Promise.all([import('./engineView'), import('../engineSources'), import('./engineBest'), import('../bestSources'), import('../bestMongoIndex'), import('../bestDynamoIndex'), import('./engineHub')])
    .then(([m, src, b, bs, bm, bd, hub]) => {
      const deps: Parameters<EngineView['initEngine']>[0] = {
        h, icon, t, getLang, locale, app, persist, announce, loader, reducedMotion, isDark, renderResult, errorView, optionOrder,
        engineHash, engineRouteOf, enginePathOf, enginePathHash, hashOf, engineTermsOf, engineTermsHash, engineInterviewOf, engineInterviewHash, engineCompareOf, engineCompareHash, rerender: () => actions.rerender(), cls: { CARD, BTN_GO, BTN_SECONDARY, BTN_GHOST, PILL, DONE_PILL, cx },
        ui: { listRow, LIST, GROUP_TITLE, ABOVE }, createEditor,
        lab: { sql: (text) => runOn('lab', text), grade: (run, solution, player, ordered) => grade(run, solution, player, ordered), verdict: verdictText, lang: getLang, slow: slowVerdict },
        viz: { h, s, reducedMotion, loadedGsap, loadGsap, getLang },
        prefs: { read: readJson, write: writeJson },
        cheer: { mascot, react, badge: () => illustration('aspect-square', (il) => il.doneBadge()) },
        best: (e) => b.entry(e),
      };
      const bpMeta = { ...bs.meta, ...bm.meta, ...bd.meta };
      m.initEngine(deps, src, bpMeta, hub); // v44 (L790): card titles for the id links; v47 S1 (L902): the landing and sidebar chunk
      b.initBest(deps, { ...bs, meta: bpMeta }, src.meta, { skill: (id) => SKILLS.find((x) => x.id === id)?.label, sourceTitle: m.sourceTitle, inline: m.inline });
      best = b;
      failed = false;
      return (view = m);
    }, (e: unknown) => {
      pending = undefined; // a failed load is retried by Retry or the next visit, never in a loop
      throw e;
    });
  return pending;
}
const load = (): void => void engineChunk().then(() => actions.rerender(), () => { failed = true; actions.rerender(); });

function enginePage(): HTMLElement {
  const play = enginePlayOf(location.hash); // L280: the spec's lab route opens the lesson page
  if (play) queueMicrotask(() => location.replace(play));
  else if (view) return isBest() ? best!.bestPage() : view.enginePage();
  if (!failed) load();
  return failed
    ? h('div', { role: 'alert', class: 'space-y-2' }, h('p', { class: 'm-0' }, t('engine.failed')),
      h('button', { type: 'button', onclick: () => { failed = false; actions.rerender(); } }, t('data.retry')))
    : h('p', { class: 'm-0 flex min-h-40 items-start gap-2 text-muted', 'aria-live': 'polite' }, loader(), t('engine.loading'));
}

/** Phones (design D-E1): "Lộ trình" stands for both areas in the 5-slot bottom bar, so both pages open with this switch. */
function learnSwitch(): HTMLElement | null {
  const engine = /^#\/?engine\/?$/.test(location.hash); // engine-ux-spec §3.2: only atop the two areas' first pages
  if (!engine && !/^#\/?learn\/?$/.test(location.hash)) return null;
  if (typeof matchMedia === 'function' && matchMedia('(min-width: 1024px)').matches) return null; // the top bar has both
  const link = (href: string, text: string, on: boolean): HTMLElement => h('a', {
    href, 'aria-current': on ? 'page' : false,
    class: 'flex min-h-11 flex-1 items-center justify-center rounded-full px-3 font-bold text-muted no-underline aria-[current=page]:bg-panel aria-[current=page]:text-ink aria-[current=page]:shadow-(--shadow-1)',
  }, text);
  return h('nav', { 'aria-label': t('engine.switch'), class: 'flex gap-1 rounded-full bg-code p-1' },
    link(hashOf('learn'), t('side.sqlTrack'), !engine), link(hashOf('engine'), t('nav.engineShort'), engine)); // v47 S1: SQL / CSDL
}

registerHomeSection({ id: 'learnSwitch', order: 0, span: 'full', pages: ['learn', 'engine'], render: learnSwitch });
registerHomeSection({ id: 'engine', order: 10, span: 'full', pages: ['engine'], render: enginePage });
/** v24 (L334): the engines' module trees for the #/me skill map; loads the chunk on first ask (undefined until it is in). */
export function engineTrees(): ReturnType<EngineView['engineTrees']> | undefined {
  if (!view && !failed) load();
  return view?.engineTrees();
}
/** v43 (L722): the Extensions shelf's done/total for the #/me line (undefined until the chunk is in). */
export const engineExt = (): ReturnType<EngineView['extProgress']> | undefined => view?.extProgress();
registerNav({ id: 'engine', area: 'top', order: 25, label: 'nav.engineShort', icon: NAV_ICON.engine, href: hashOf('engine'), current: (r) => r === 'engine', mergeInto: 'learn' });
// On a Best Practice page the engine rows are drawn with no current row: the Best Practice row is the one (H2).
registerSide('engine', (ui) => (view ? view.sideRows(isBest() ? { ...ui, row: (r) => ui.row({ ...r, current: false }) } : ui, best!.sideRows(ui)) : []));
pageSubs.engine = () => (isBest() ? best?.subOf() : view?.subOf()); // L280: the h1 = engine / level / lesson title under a trail; "Database Engine" until the chunk is in
