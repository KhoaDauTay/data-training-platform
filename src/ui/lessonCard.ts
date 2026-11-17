import { loadLessons } from '../content';
import type { QueryResult } from '../db/run';
import { grade } from '../grader';
import { getLang, t } from '../i18n';
import { loadLessonPrefs, markLesson, type Lesson } from '../lessons';
import { SKILLS } from '../progress';
import { app } from '../state';
import { cx } from '../theme';
import { byId, h, nodes, richText } from './dom';
import { errorText, errorView, gradeMessage } from './feedback';
import { skillIcon } from './icons';
import { renderResult } from './resultTable';

// Session state by skill id. The brief is rebuilt on every rerender, so what the player typed or ran lives here.
const drafts = new Map<string, string>();
const verdicts = new Map<string, { ok: boolean; text: () => string }>();
const examples = new Map<string, { result?: QueryResult; error?: unknown }>();
/** Open/collapsed as the player last chose this session; otherwise the first lesson not seen yet is open. */
const expanded = new Map<string, boolean>();
/** Marked this session: the pref write may fail (blocked storage) and the card must still collapse. */
const seenNow = new Set<string>();

const isSeen = (id: string): boolean => seenNow.has(id) || loadLessonPrefs().seen.includes(id);
const skillOf = (id: string) => SKILLS.find((s) => s.id === id);
const label = (id: string): string => skillOf(id)?.label[getLang()] ?? id;

function markSeen(id: string, tried: boolean): void {
  seenNow.add(id);
  markLesson(id, tried);
}

const section = (title: string, ...body: (Node | null)[]): HTMLElement =>
  h('div', { class: 'mt-3' }, h('h4', { class: 'mt-0 mb-1' }, title), ...body);

/** The full card (product-design-v4 §C.2). `titleId` differs between the brief and the dialog; `actions` sit next to the title. */
function card(l: Lesson, titleId: string, actions: HTMLElement[]): HTMLElement {
  const lang = getLang();
  const exampleOut = h('div', { class: 'mt-2' });
  const drawExample = (): void => {
    const e = examples.get(l.id);
    exampleOut.replaceChildren(...nodes(e && (e.result ? renderResult(e.result) : errorView(e.error))));
  };
  const runExample = h('button', {
    type: 'button',
    onclick: () => {
      runExample.disabled = true;
      app.run(l.example)
        .then((result) => examples.set(l.id, { result }), (error: unknown) => examples.set(l.id, { error }))
        .finally(() => {
          runExample.disabled = false;
          drawExample();
        });
    },
  }, t('lesson.runExample'));
  drawExample();

  const area = h('textarea', { class: 'w-full rounded-lg bg-code p-2 font-mono text-sm ring-1 ring-line', rows: '3', spellcheck: 'false', 'aria-label': t('lesson.tryAria') });
  area.value = drafts.get(l.id) ?? l.try.starter;
  area.addEventListener('input', () => drafts.set(l.id, area.value));
  const verdict = h('p', { role: 'status', class: 'mb-0' });
  const drawVerdict = (): void => {
    const v = verdicts.get(l.id);
    verdict.className = cx('mb-0', v && (v.ok ? 'good' : 'bad'));
    verdict.textContent = v ? v.text() : '';
  };
  const check = h('button', {
    type: 'button',
    class: 'primary',
    onclick: async () => {
      check.disabled = true;
      verdict.className = 'mb-0';
      verdict.textContent = t('lesson.running');
      try {
        // The real grader against the lesson's own answer, 0 XP; app.lastRun, drafts and history are never touched.
        const r = await grade((sql) => app.run(sql), l.try.solution, area.value, l.try.ordered);
        verdicts.set(l.id, r.ok ? { ok: true, text: () => t('lesson.tryOk') } : { ok: false, text: () => gradeMessage(r) });
        if (r.ok) markSeen(l.id, true);
      } catch (e) {
        verdicts.set(l.id, { ok: false, text: () => errorText(e) });
      }
      check.disabled = false;
      drawVerdict();
    },
  }, t('lesson.check'));
  drawVerdict();

  const skill = skillOf(l.id);
  return h('section', { class: 'my-3 rounded-xl bg-panel p-3 ring-1 ring-accent', 'aria-labelledby': titleId },
    h('div', { class: 'flex flex-wrap items-center justify-between gap-2' },
      h('h3', { id: titleId, tabindex: '-1', class: 'm-0 flex items-center gap-2' }, skillIcon(l.id, 'size-5'), t('lesson.title', { skill: label(l.id) })),
      h('div', { class: 'flex gap-1.5' }, ...actions)),
    h('p', { class: 'mt-2 mb-0' }, l.concept[lang]),
    skill ? h('p', { class: 'mt-2 mb-0' }, h('b', {}, t('lesson.syntax')), ' ', h('code', {}, skill.syntax)) : null,
    section(t('lesson.example'), h('pre', { class: 'sql' }, l.example), runExample, exampleOut, richText(l.explain[lang])),
    section(t('lesson.mistake'), h('pre', { class: 'sql' }, l.mistake.sql), richText(l.mistake.why[lang])),
    section(t('lesson.cues'), h('p', { class: 'm-0' }, l.cues[lang].join(' · '))),
    section(t('lesson.try'), h('p', { class: 'mt-0' }, l.try.task[lang]), area, h('div', { class: 'actions mb-0' }, check), verdict),
    h('p', { class: 'mt-3 mb-0 text-sm' }, h('a', { href: l.docs, target: '_blank', rel: 'noopener noreferrer' }, t('lesson.docs'))));
}

/** One line for a lesson that is not open: "Quick lesson: X ✓ · Open again". */
function collapsed(id: string, open: () => void): HTMLElement {
  const seen = isSeen(id);
  return h('p', { class: 'my-2 flex flex-wrap items-center gap-2 text-sm', 'data-lesson': id },
    h('span', {}, `${t('lesson.collapsed', { skill: label(id) })}${seen ? ' ✓' : ''}`),
    h('button', { type: 'button', class: 'px-2 py-0.5 text-sm', onclick: open }, t(seen ? 'lesson.reopen' : 'lesson.show')));
}

export const hasLesson = (id: string): boolean => loadLessons().has(id);

/**
 * Story ticket granting skills that have a quick lesson: their cards, between the message and the task (product-design-v4 §C.3).
 * The first lesson not seen yet is open, the others are one line (two lessons on one ticket: the second waits).
 */
export function lessonSlot(grants: string[]): HTMLElement | null {
  const ids = grants.filter(hasLesson);
  if (ids.length === 0) return null;
  const host = h('div');
  const lessons = loadLessons();
  const draw = (focus?: string): void => {
    const first = ids.find((id) => !isSeen(id));
    host.replaceChildren(...ids.map((id) => {
      if (!(expanded.get(id) ?? id === first)) return collapsed(id, () => { expanded.set(id, true); draw(id); });
      const close = (seen: boolean) => () => {
        if (seen) markSeen(id, false);
        expanded.set(id, false);
        draw(id);
      };
      return card(lessons.get(id)!, `lesson-${id}-title`, [
        h('button', { type: 'button', onclick: close(true) }, `${t('lesson.gotIt')} ✓`),
        h('button', { type: 'button', onclick: close(false) }, t('lesson.collapse')),
      ]);
    }));
    // The pressed button is gone: focus what replaced it (the one-line row's button, or the opened card's title).
    if (focus) host.querySelector<HTMLElement>(`[data-lesson="${focus}"] button, #lesson-${focus}-title`)?.focus();
  };
  draw();
  return host;
}

/** A skill chip or the handbook: the same card in a modal dialog, readable before the task that teaches it; focus returns to the opener. */
export function openLesson(id: string): void {
  const l = loadLessons().get(id);
  if (!l) return;
  const dialog = byId('lesson-dialog') as HTMLDialogElement;
  const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  dialog.replaceChildren(card(l, 'lesson-dialog-title', [
    h('button', { type: 'button', onclick: () => { markSeen(id, false); dialog.close(); } }, `${t('lesson.gotIt')} ✓`),
    h('button', { type: 'button', onclick: () => dialog.close() }, t('app.close')),
  ]));
  dialog.onclose = () => {
    if (opener?.isConnected) opener.focus();
  };
  if (!dialog.open) dialog.showModal();
}
