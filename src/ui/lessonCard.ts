import { loadLessons } from '../content';
import type { QueryResult } from '../db/run';
import { grade } from '../grader';
import { getLang, t } from '../i18n';
import { lessonSchema, loadLessonPrefs, markLesson, type Lesson } from '../lessons';
import { SKILLS } from '../progress';
import { skillOfDrill } from '../home';
import { actions as appActions, app } from '../state';
import { cx } from '../theme';
import { byId, h, nodes, richText } from './dom';
import { errorText, errorView, gradeMessage } from './feedback';
import { skillIcon } from './icons';
import { renderResult } from './resultTable';
import { markExampleRan, tourSlot } from './coach';
import { readTour } from '../onboarding';

// Session state by skill id. The brief is rebuilt on every rerender, so what the player typed or ran lives here.
const drafts = new Map<string, string>();
const verdicts = new Map<string, { ok: boolean; text: () => string }>();
const examples = new Map<string, { result?: QueryResult; error?: unknown }>();
/** Open/collapsed as the player last chose this session; otherwise the first lesson not seen yet is open. */
const expanded = new Map<string, boolean>();
/** Marked this session: the pref write may fail (blocked storage) and the card must still collapse. */
const seenNow = new Set<string>();

export const isSeen = (id: string): boolean => seenNow.has(id) || loadLessonPrefs().seen.includes(id);
const skillOf = (id: string) => SKILLS.find((s) => s.id === id);
/** Advanced-node lessons (Plan 8a) have no skill label: openLesson() gives their title. */
const names = new Map<string, () => string>();
const label = (id: string): string => skillOf(id)?.label[getLang()] ?? names.get(id)?.() ?? id;

function markSeen(id: string, tried: boolean): void {
  seenNow.add(id);
  markLesson(id, tried);
}

/** One paragraph per ①②③ marker (UI/UX review v10 #7). */
const byMarker = (text: string): string => text.replace(/\s+(?=[②-⑨])/g, '\n\n');

const section = (title: string, ...body: (Node | null)[]): HTMLElement =>
  h('div', { class: 'mt-3' }, h('h4', { class: 'mt-0 mb-1' }, title), ...body);

/** The full card (product-design-v4 §C.2). `titleId` differs between the brief and the dialog; `actions` sit next to the title. */
function card(l: Lesson, titleId: string, actions: HTMLElement[], tour = false): HTMLElement {
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
      app.run(l.example, { schema: lessonSchema(l) })
        .then((result) => examples.set(l.id, { result }), (error: unknown) => examples.set(l.id, { error }))
        .finally(() => {
          runExample.disabled = false;
          drawExample();
          markExampleRan(l.id); // tour step 4
          if (!exampleOut.isConnected) appActions.rerender(); // the brief was redrawn while it ran (e.g. DB still booting): show it there
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
        const r = await grade((sql) => app.run(sql, { schema: lessonSchema(l) }), l.try.solution, area.value, l.try.ordered);
        verdicts.set(l.id, r.ok ? { ok: true, text: () => t('lesson.tryOk') } : { ok: false, text: () => gradeMessage(r) });
        if (r.ok) markSeen(l.id, true);
      } catch (e) {
        verdicts.set(l.id, { ok: false, text: () => errorText(e) });
      }
      check.disabled = false;
      drawVerdict();
      if (!verdict.isConnected) appActions.rerender();
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
    section(t('lesson.example'), h('pre', { class: 'sql' }, l.example), runExample, tour ? tourSlot('lesson') : null, exampleOut, richText(byMarker(l.explain[lang]))),
    section(t('lesson.mistake'), h('pre', { class: 'sql' }, l.mistake.sql), richText(l.mistake.why[lang])),
    l.cues[lang].length ? section(t('lesson.cues'), h('p', { class: 'm-0' }, l.cues[lang].join(' · '))) : null,
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
    // v4 §C.6: "I already know SQL" on the welcome screen → every lesson starts as its one-line row (chips still open it).
    // Plan 8a D8a-11 / v5 §B.8: a skill practised in the General area (≥ 2 drills) starts as its one-line row too.
    const skillIds = SKILLS.map((s) => s.id);
    const drilled = (id: string): boolean => app.save.completed.filter((x) => skillOfDrill(x, skillIds) === id).length >= 2;
    const first = readTour()?.knows ? undefined : ids.find((id) => !isSeen(id) && !drilled(id));
    host.replaceChildren(...ids.map((id) => {
      // Tour step 4 ("Run the example") sits right under that button, on the first lesson only; a closed lesson keeps it on its row.
      const tour = id === ids[0];
      if (!(expanded.get(id) ?? id === first)) {
        return h('div', {}, collapsed(id, () => { expanded.set(id, true); draw(id); }),
          drilled(id) ? h('p', { class: 'mt-1 mb-0 text-sm text-muted' }, t('lesson.drilled')) : null, tour ? tourSlot('lesson') : null);
      }
      const close = (seen: boolean) => () => {
        if (seen) markSeen(id, false);
        expanded.set(id, false);
        draw(id);
      };
      return card(lessons.get(id)!, `lesson-${id}-title`, [
        h('button', { type: 'button', onclick: close(true) }, `${t('lesson.gotIt')} ✓`),
        h('button', { type: 'button', onclick: close(false) }, t('lesson.collapse')),
      ], tour);
    }));
    // The pressed button is gone: focus what replaced it (the one-line row's button, or the opened card's title).
    if (focus) host.querySelector<HTMLElement>(`[data-lesson="${focus}"] button, #lesson-${focus}-title`)?.focus();
  };
  draw();
  return host;
}

/** A skill chip or the handbook: the same card in a modal dialog, readable before the task that teaches it; focus returns to the opener. */
export function openLesson(id: string, node?: { lesson: Lesson; name: () => string }): void {
  if (node) names.set(id, node.name);
  const l = node?.lesson ?? loadLessons().get(id);
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
