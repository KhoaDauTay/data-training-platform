import { CARD_KINDS, KIND_SKILL, MAX_CARD_SQL, MAX_CARD_TITLE, MAX_CARDS, nextCardId, pinBlock, valueCols, type Card, type CardKind } from '../dashboard';
import type { QueryResult } from '../db/run';
import { learnedSkills } from '../home';
import { getLang, t } from '../i18n';
import { session } from '../session';
import { actions, app, done, persist, selected } from '../state';
import { BTN_GO, cx } from '../theme';
import { textOf } from '../tickets';
import { cardBody, KIND_LABEL, skillOf } from './dashboard';
import { h } from './dom';
import { icon } from './icons';

/** Where Pin is offered (L49): the Sandbox, and a story task once it is solved (so the player's own SQL is pinned, never a hint). */
function source(): string | undefined {
  const m = session.mode;
  if (m.kind === 'sandbox') return 'sandbox';
  if (m.kind === 'story' && done().has(app.selectedId)) return app.selectedId;
  return undefined;
}

/**
 * The line above the Result tab's table: run time and "Ghim lên". It describes app.lastRun like every tab, so when the editor
 * no longer holds that SQL the button is off with "Chạy lại trước khi ghim" (L49).
 */
export function pinBar(editorSql: () => string): HTMLElement | null {
  const run = app.lastRun;
  const r = run?.result;
  if (!run || !r) return null;
  const from = source();
  const block = from ? pinBlock({ sql: run.sql, ms: r.ms }, editorSql(), app.save.dashboard.cards.length) : undefined;
  const off = block === 'stale' || block === 'full'; // 'slow' and 'long': the dialog explains the rule
  return h('div', { class: 'mb-2 flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-sm' },
    r.ms !== undefined ? h('span', { class: 'mr-auto tabular-nums text-muted' }, t('dash.ran', { ms: r.ms })) : null,
    off ? h('span', { class: 'text-muted' }, t(block === 'stale' ? 'pin.stale' : 'dash.full', { max: MAX_CARDS })) : null,
    from && r.columns.length
      ? h('button', { type: 'button', class: 'flex items-center gap-1.5 px-3 py-1', disabled: off, title: t('pin.title'), onclick: () => openPinDialog(run.sql, r, from, editorSql) },
        icon('pin', 'size-4'), t('pin.button'))
      : null);
}

/** Pin dialog (mockup v6 screen B): type (locked ones greyed with the skill that opens them), title, value column, preview from the last run. */
function openPinDialog(sql: string, r: QueryResult, from: string, editorSql: () => string): void {
  const lang = getLang();
  const learned = learnedSkills(app.tickets, done());
  const usable = (k: CardKind) => learned.has(KIND_SKILL[k]) && valueCols(k, r).length > 0;
  let kind: CardKind | undefined = (['line', 'bar', 'number', 'table'] as const).find((k) => usable(k) && (k !== 'number' || r.rows.length === 1)) ?? CARD_KINDS.find(usable);
  let col = kind ? valueCols(kind, r)[0] : 0;
  const block = pinBlock({ sql, ms: r.ms }, editorSql(), app.save.dashboard.cards.length);

  const title = h('input', {
    type: 'text', id: 'pin-title', maxlength: String(MAX_CARD_TITLE), class: 'mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink',
    value: from === 'sandbox' ? '' : textOf(selected(), lang).title.slice(0, MAX_CARD_TITLE),
  });
  const colBox = h('div');
  const preview = h('div', { class: 'rounded-xl p-3 ring-1 ring-line' });
  const status = h('p', { role: 'status', class: 'mb-0 text-sm' });
  const confirm = h('button', { type: 'button', class: cx(BTN_GO, 'px-4 py-2') }, t('pin.confirm'));
  const dialog = h('dialog', { class: 'w-[min(640px,calc(100vw-2rem))] rounded-2xl p-0', 'aria-labelledby': 'pin-dialog-title' });

  const card = (): Card => ({ id: '', title: title.value.trim(), sql: sql.trim(), kind: kind!, col, source: from });
  const draw = (): void => {
    const cols = kind ? valueCols(kind, r) : [];
    colBox.replaceChildren(kind && kind !== 'table'
      ? h('label', { class: 'block text-sm font-semibold' }, t('pin.col'),
        h('select', { class: 'mt-1 block rounded-lg border border-line bg-panel px-2 py-1 text-ink', onchange: (e: Event) => { col = Number((e.target as HTMLSelectElement).value); draw(); } },
          ...cols.map((i) => h('option', { value: String(i), selected: i === col }, t('pin.colOption', { name: r.columns[i], i: i + 1 })))))
      : '');
    preview.replaceChildren(h('p', { class: 'mt-0 mb-2 text-sm font-semibold text-muted' }, t('pin.preview')), kind ? cardBody(card(), r) : '');
    status.className = cx('mb-0 text-sm', block ? 'bad' : 'text-muted');
    status.replaceChildren(...(block === 'slow'
      ? [h('b', {}, t('pin.slow', { s: Math.round((r.ms ?? 0) / 100) / 10 })), h('br'), t('pin.slowHelp')]
      : block ? [t(block === 'long' ? 'pin.long' : block === 'stale' ? 'pin.stale' : 'dash.full', { max: block === 'long' ? MAX_CARD_SQL : MAX_CARDS })]
        : [t('pin.fast', { ms: r.ms ?? 0 })]));
    confirm.disabled = !!block || !kind;
  };

  const radios = CARD_KINDS.map((k) => {
    const skill = skillOf(KIND_SKILL[k]);
    const why = !learned.has(skill.id) ? t('pin.kindLocked', { skill: skill.label[lang], n: skill.chapter }) : valueCols(k, r).length ? '' : t('pin.kindNoFit');
    return h('label', { class: cx('flex items-center gap-2 rounded-lg px-2 py-1 ring-1 ring-line', why && 'text-muted') },
      h('input', { type: 'radio', name: 'pin-kind', value: k, checked: k === kind, disabled: !!why, onchange: () => { kind = k; col = valueCols(k, r)[0]; draw(); } }),
      t(KIND_LABEL[k]), why ? h('span', { class: 'text-sm' }, ` · ${why}`) : '');
  });

  confirm.addEventListener('click', () => {
    const now = pinBlock({ sql, ms: r.ms }, editorSql(), app.save.dashboard.cards.length); // the editor may have changed behind the dialog
    if (now || !kind) return void (status.textContent = t(now === 'stale' ? 'pin.stale' : 'dash.full', { max: MAX_CARDS }));
    if (!title.value.trim()) {
      status.textContent = t('pin.needTitle');
      return title.focus();
    }
    const d = app.save.dashboard;
    d.cards = [...d.cards, { ...card(), id: nextCardId(d.cards) }];
    persist(true);
    dialog.close();
    app.notice = { key: 'pin.done', params: { title: title.value.trim() } };
    actions.rerender();
  });

  dialog.append(h('div', { class: 'space-y-4 p-5' },
    h('div', { class: 'flex items-center gap-2' },
      h('h2', { id: 'pin-dialog-title', class: 'm-0 flex-1 text-lg font-bold' }, t('pin.title')),
      h('span', { class: 'text-sm text-muted' }, t('dash.count', { n: app.save.dashboard.cards.length, max: MAX_CARDS }))),
    h('fieldset', { class: 'm-0 border-0 p-0' }, h('legend', { class: 'mb-1 text-sm font-semibold' }, t('pin.kind')), h('div', { class: 'flex flex-wrap gap-2' }, ...radios)),
    h('label', { class: 'block text-sm font-semibold', for: 'pin-title' }, t('pin.cardTitle'), title),
    colBox,
    preview,
    status,
    h('div', { class: 'flex justify-end gap-2' },
      h('button', { type: 'button', onclick: () => dialog.close() }, t('pin.cancel')),
      confirm)));
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  draw();
  dialog.showModal();
}
