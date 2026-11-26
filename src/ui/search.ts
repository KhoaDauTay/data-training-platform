import { getLang, isMac } from '../i18n';
import { ROUTE_SKILLS } from '../progress';
import { engineHash, engineTermsHash, hashOf, interviewTabHash } from '../route';
import { BTN_GHOST } from '../theme';
import { h } from './dom';
import { icon } from './icons';

/**
 * F12 (L490): the search palette's main-bundle part: {mod}+K anywhere and the ⋯ menu's "Tìm kiếm" open the lazy `palette`
 * chunk (src/ui/palette.ts), which gets every main value here.
 */
export function openSearch(): void {
  void import('./palette').then((m) => m.openPalette({
    h, icon, lang: getLang, skills: ROUTE_SKILLS, cls: { BTN_GHOST },
    hashes: { skill: (id) => `${hashOf('learn')}/skill/${id}`, lesson: (e, lv, id) => engineHash(e, lv, id), term: (id) => engineTermsHash(id), interview: interviewTabHash },
  }));
}

/** Pure: the key event that opens the palette ({mod}+K, no Shift/Alt, not already taken). */
export const opensSearch = (e: Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey' | 'defaultPrevented' | 'isComposing'>, mac = isMac): boolean =>
  !e.defaultPrevented && !e.isComposing && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'k' && (mac ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey);

export function initSearch(): void {
  document.addEventListener('keydown', (e) => {
    if (!opensSearch(e) || document.querySelector('dialog:modal')) return;
    e.preventDefault();
    openSearch();
  });
  const btn = document.getElementById('search-btn'); // v42 (L710): the top bar's search box; ⋯ holds a phone copy (data-proxy)
  btn?.addEventListener('click', openSearch);
  btn?.setAttribute('aria-keyshortcuts', isMac ? 'Meta+K' : 'Control+K');
}
