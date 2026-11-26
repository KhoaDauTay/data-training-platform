import { t } from '../i18n';
import { hashOf } from '../route';
import { actions } from '../state';
import { failBox, h, loader } from './dom';
import { registerHomeSection } from './homeView';
import { NAV_ICON } from './icons';
import { meChunk, meView } from './meChunk';
import { registerNav } from './topbar';

/** v16 "Của tôi" (L142): the #/me nav item and page section; the page is drawn by the lazy meView chunk (ui/meChunk.ts). */
let failed = false;
function meSection(): HTMLElement {
  if (meView) return meView.mePage();
  if (!failed) void meChunk().then(() => actions.rerender(), () => { failed = true; actions.rerender(); }); // one promise while loading (meChunk)
  return failed
    ? failBox(t('me.failed'), () => { failed = false; actions.rerender(); })
    : h('p', { class: 'm-0 flex min-h-40 items-start gap-2 text-muted', 'aria-live': 'polite' }, loader(), t('me.loading'));
}

registerHomeSection({ id: 'me', order: 10, span: 'full', pages: ['me'], render: meSection });
registerNav({ id: 'me', area: 'top', order: 40, label: 'nav.me', icon: NAV_ICON.me, href: hashOf('me'), current: (r) => r === 'me' });
