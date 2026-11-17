import { byId } from './dom';

/** Below 768 px the workspace shows one pane at a time (v10 critic #2): Đề bài | SQL | Kết quả. Wider screens ignore it (CSS). */
export type Pane = 'ticket' | 'work' | 'panel';
const NARROW = '(max-width: 767.98px)';

/** Shows `pane` (a no-op on wide screens, where every pane is visible). Not saved: a reload starts on the brief. */
export function showPane(pane: Pane): void {
  const shell = byId('shell');
  if (shell.dataset.pane === pane) return;
  shell.dataset.pane = pane;
  for (const b of document.querySelectorAll<HTMLButtonElement>('#pane-tabs [data-pane]')) b.setAttribute('aria-selected', String(b.dataset.pane === pane));
  if (matchMedia(NARROW).matches) window.scrollTo({ top: 0 }); // the new pane from its top, not the old pane's scroll spot
}

/** Once at startup: the tab buttons, with arrow keys between them (WAI-ARIA tabs). */
export function initPaneTabs(): void {
  const tabs = [...document.querySelectorAll<HTMLButtonElement>('#pane-tabs [data-pane]')];
  for (const [i, b] of tabs.entries()) {
    b.addEventListener('click', () => showPane(b.dataset.pane as Pane));
    b.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      const next = tabs[(i + d + tabs.length) % tabs.length];
      next.focus();
      next.click();
    });
  }
  showPane('ticket');
}
