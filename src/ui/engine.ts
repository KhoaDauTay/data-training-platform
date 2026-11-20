import { grade } from '../grader';
import { getLang, locale, t } from '../i18n';
import { engineHash, enginePathHash, enginePathOf, engineRouteOf, hashOf } from '../route';
import { actions, app, persist } from '../state';
import { BTN_GO, BTN_SECONDARY, CARD, cx, isDark, PILL } from '../theme';
import { optionOrder } from '../tickets';
import { loadedGsap, loadGsap } from '../art/load';
import { announce, h, loader, reducedMotion } from './dom';
import { s } from './svg';
import { errorView } from './feedback';
import { registerHomeSection } from './homeView';
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

function engineChunk(): Promise<EngineView> {
  pending ??= Promise.all([import('./engineView'), import('../engineSources')])
    .then(([m, src]) => {
      m.initEngine({
        h, icon, t, getLang, locale, app, persist, announce, loader, reducedMotion, isDark, renderResult, errorView, optionOrder,
        engineHash, engineRouteOf, enginePathOf, enginePathHash, hashOf, rerender: () => actions.rerender(), cls: { CARD, BTN_GO, BTN_SECONDARY, PILL, cx },
        lab: { sql: (text) => runOn('lab', text), grade: (run, solution, player, ordered) => grade(run, solution, player, ordered), verdict: verdictText, lang: getLang },
        viz: { h, s, reducedMotion, loadedGsap, loadGsap, getLang },
      }, src);
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
  if (view) return view.enginePage();
  if (!failed) load();
  return failed
    ? h('div', { role: 'alert', class: 'space-y-2' }, h('p', { class: 'm-0' }, t('engine.failed')),
      h('button', { type: 'button', onclick: () => { failed = false; actions.rerender(); } }, t('data.retry')))
    : h('p', { class: 'm-0 flex min-h-40 items-start gap-2 text-muted', 'aria-live': 'polite' }, loader(), t('engine.loading'));
}

/** Phones (design D-E1): "Lộ trình" stands for both areas in the 5-slot bottom bar, so both pages open with this switch. */
function learnSwitch(): HTMLElement | null {
  const engine = location.hash.startsWith('#/engine');
  if (!engine && !/^#\/?learn\/?$/.test(location.hash)) return null;
  if (typeof matchMedia === 'function' && matchMedia('(min-width: 1024px)').matches) return null; // the top bar has both
  const link = (href: string, text: string, on: boolean): HTMLElement => h('a', {
    href, 'aria-current': on ? 'page' : false,
    class: 'flex min-h-11 flex-1 items-center justify-center rounded-full px-3 font-bold text-muted no-underline aria-[current=page]:bg-panel aria-[current=page]:text-ink aria-[current=page]:shadow-(--shadow-1)',
  }, text);
  return h('nav', { 'aria-label': t('engine.switch'), class: 'flex gap-1 rounded-full bg-code p-1' },
    link(hashOf('learn'), t('side.sqlTrack'), !engine), link(hashOf('engine'), t('nav.engine'), engine));
}

registerHomeSection({ id: 'learnSwitch', order: 0, span: 'full', pages: ['learn', 'engine'], render: learnSwitch });
registerHomeSection({ id: 'engine', order: 10, span: 'full', pages: ['engine'], render: enginePage });
registerHomeSection({ id: 'engineMe', order: 20, span: 'full', pages: ['me'], render: () => {
  if (!view && !failed) load();
  return view ? view.meBlock() : null; // #/me draws its own loading line; the block joins once the chunk is in
} });
registerNav({ id: 'engine', area: 'top', order: 25, label: 'nav.engine', short: 'nav.engineShort', icon: NAV_ICON.engine, href: hashOf('engine'), current: (r) => r === 'engine', mergeInto: 'learn' });
registerSide('engine', (ui) => (view ? view.sideRows(ui) : []));
