import { paletteItems, search, type PaletteItem, type PaletteKind, type PaletteSources, type PaletteHashes } from '../palette';
import type * as Dom from './dom';
import type * as Icons from './icons';

/**
 * F12 (L490): the search palette ({mod}+K, or "Tìm kiếm" in the ⋯ menu): a modal <dialog> with one search field and a list
 * of links (General skills, Engine lessons, glossary terms). Lazy chunk `palette` (budget `palette`); the Engine index and
 * the glossary are their own chunks, fetched on the first open. Types only from main modules (Plan 6 U3): every main value
 * comes through PaletteDeps. VI/EN text lives here.
 */
export interface PaletteDeps {
  h: typeof Dom.h; icon: typeof Icons.icon; lang: () => 'vi' | 'en';
  skills: PaletteSources['skills']; hashes: PaletteHashes; cls: { BTN_GHOST: string };
}

const TEXT = {
  vi: { title: 'Tìm bài và thuật ngữ', label: 'Tìm', hint: 'Gõ tên kỹ năng, bài Engine hoặc thuật ngữ. Enter mở kết quả đầu, mũi tên để chọn.', loading: 'Đang tải danh mục…', failed: 'Không tải được danh mục Engine; vẫn tìm được kỹ năng SQL.', none: 'Không có kết quả.', count: '{n} kết quả', close: 'Đóng', skill: 'Kỹ năng SQL', lesson: 'Bài Engine', term: 'Thuật ngữ', page: 'Trang', room: 'Phòng phỏng vấn', design: 'Thiết kế CSDL', stack: 'Công cụ dữ liệu', timeseries: 'Chuỗi thời gian' },
  en: { title: 'Search lessons and terms', label: 'Search', hint: 'Type a skill, an Engine lesson or a term. Enter opens the first result, arrow keys move.', loading: 'Loading the index…', failed: 'Could not load the Engine index; SQL skills are still searchable.', none: 'No results.', count: '{n} results', close: 'Close', skill: 'SQL skill', lesson: 'Engine lesson', term: 'Term', page: 'Page', room: 'Interview room', design: 'Database design', stack: 'Data stack', timeseries: 'Time-series' },
} as const;

let d: PaletteDeps;
let sources: { lessons: PaletteSources['lessons']; terms: unknown } | 'loading' | 'failed' | undefined;
let dialog: HTMLDialogElement | undefined;
let field: HTMLInputElement;
let results: HTMLElement;
let status: HTMLElement;
const tx = (k: keyof typeof TEXT.vi): string => TEXT[d.lang()][k];
const KIND_ICON: Record<PaletteKind, Icons.IconName> = { skill: 'route', lesson: 'engRelational', term: 'book', page: 'secPractice' };

function items(): PaletteItem[] {
  const s = typeof sources === 'object' ? sources : { lessons: {}, terms: [] };
  return paletteItems({ skills: d.skills, ...s }, d.lang(), d.hashes, tx('design'), tx('stack'), tx('room'), tx('timeseries'));
}

function draw(): void {
  const { h } = d;
  const found = search(items(), field.value);
  const note = sources === 'loading' ? tx('loading') : sources === 'failed' ? tx('failed') : '';
  status.textContent = [field.value.trim() ? (found.length ? tx('count').replace('{n}', String(found.length)) : tx('none')) : '', note].filter(Boolean).join(' · ');
  results.replaceChildren(...found.map((it) => h('li', {}, h('a', {
    href: it.href, 'data-palette': it.kind,
    class: 'flex min-h-11 items-center gap-3 rounded-(--r-inset) px-3 py-2 text-ink no-underline hover:bg-code focus-visible:bg-accent-soft',
    onclick: () => dialog?.close(),
  }, d.icon(KIND_ICON[it.kind], 'size-5 shrink-0 text-accent'),
  h('span', { class: 'min-w-0 flex-1' }, h('span', { class: 'block font-semibold' }, it.title),
    h('span', { class: 'block text-caption text-muted' }, [tx(it.kind), it.sub, it.alt && it.kind === 'term' ? it.alt : ''].filter(Boolean).join(' · ')))))));
}

function load(): void {
  if (sources && sources !== 'failed') return;
  sources = 'loading';
  Promise.all([import('../engineSources'), import('../engineTermsSources')])
    .then(([e, g]) => { sources = { lessons: e.meta, terms: g.glossary }; }, () => { sources = 'failed'; })
    .finally(() => { if (dialog?.open) draw(); });
}

function build(): HTMLDialogElement {
  const { h } = d;
  field = h('input', {
    type: 'search', id: 'palette-q', autocomplete: 'off', 'aria-describedby': 'palette-hint', 'aria-controls': 'palette-list',
    class: 'min-h-11 w-full rounded-(--r-ctl) bg-panel px-3 ring-1 ring-line-strong', oninput: () => draw(),
    onkeydown: (ev: Event) => {
      const e = ev as KeyboardEvent;
      const first = results.querySelector('a');
      if (e.key === 'Enter' && first) { e.preventDefault(); first.click(); } // follows the link and closes
      else if (e.key === 'ArrowDown' && first) { e.preventDefault(); first.focus(); }
    },
  });
  results = h('ul', { id: 'palette-list', class: 'm-0 flex max-h-[60dvh] list-none flex-col gap-0.5 overflow-y-auto p-0', 'aria-labelledby': 'palette-h',
    onkeydown: (ev: Event) => {
      const e = ev as KeyboardEvent;
      const links = [...results.querySelectorAll('a')];
      const i = links.indexOf(document.activeElement as HTMLAnchorElement);
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      const next = e.key === 'ArrowDown' ? links[i + 1] : i > 0 ? links[i - 1] : field;
      next?.focus();
    } });
  status = h('p', { role: 'status', class: 'm-0 min-h-5 text-body-sm text-muted' });
  const dlg = h('dialog', { id: 'palette', 'aria-labelledby': 'palette-h', class: 'w-[min(40rem,calc(100vw-2rem))] rounded-(--r-card) border-0 bg-panel p-0 text-ink shadow-(--shadow-2)' },
    h('div', { class: 'flex flex-col gap-3 p-4' },
      h('div', { class: 'flex items-center gap-2' },
        h('h2', { id: 'palette-h', class: 'm-0 flex-1 text-title' }, ''),
        h('button', { type: 'button', class: d.cls.BTN_GHOST, 'data-palette-close': '', onclick: () => dlg.close() }, '')),
      h('label', { for: 'palette-q', class: 'sr-only' }, ''), field,
      h('p', { id: 'palette-hint', class: 'm-0 text-caption text-muted' }, ''),
      status, results));
  document.body.append(dlg);
  return dlg;
}

/** Opens the palette (built once, relabelled on every open for the language). */
export function openPalette(deps: PaletteDeps): void {
  d = deps;
  dialog ??= build();
  if (dialog.open) return;
  dialog.querySelector('#palette-h')!.textContent = tx('title');
  dialog.querySelector('[data-palette-close]')!.textContent = tx('close');
  dialog.querySelector('label[for=palette-q]')!.textContent = tx('label');
  dialog.querySelector('#palette-hint')!.textContent = tx('hint');
  field.value = '';
  load();
  draw();
  dialog.showModal();
  field.focus();
}
