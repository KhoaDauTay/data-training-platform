import { loadLessons } from '../content';
import type { QueryResult } from '../db/run';
import { grade, type GradeResult } from '../grader';
import { getLang, t } from '../i18n';
import { lessonSchema, loadLessonPrefs, markLesson, type Lesson } from '../lessons';
import { SKILLS } from '../progress';
import { skillOfDrill } from '../home';
import { actions as appActions, app } from '../state';
import { blanksIn, fillAction, firstBlank } from '../tickets';
import { cx } from '../theme';
import { byId, h, nodes, richText } from './dom';
import { errorText, errorView } from './feedback';
import { icon, partHead, skillIcon, type IconName } from './icons';
import { renderResult } from './resultTable';
import { whyCell } from './whyButton';
import { boonRegion, guideHooks, guideSlot, markExampleRan, refreshGuides, tourSlot } from './coach';
import { mascot } from './mascots';
import { readTour } from '../onboarding';
import { inDomain } from '../route';
import { currentRoute } from './router';
import { diffView, hasDiff, runOn, tablesIn, tryPreview, verdictText } from './tryPreview';
import { activeDomain, ECOM_TABLES, FIN_TABLES, LOGISTICS_TABLES, type DomainId } from '../domains';

const DOMAIN_TABLES: Record<DomainId, readonly string[]> = { logistics: LOGISTICS_TABLES, ecommerce: ECOM_TABLES, finance: FIN_TABLES };

// Session state by skill id. The brief is rebuilt on every rerender, so what the player typed or ran lives here.
const drafts = new Map<string, string>();
const verdicts = new Map<string, { ok: boolean; text: () => string; fail?: Exclude<GradeResult, { ok: true }> }>();
const examples = new Map<string, { result?: QueryResult; error?: unknown }>();
/** "Chạy thử" in the try box (L84): the player's own result, not graded, never app.lastRun. */
const tryRuns = new Map<string, { result?: QueryResult; error?: unknown; sql?: string }>();
/** v13 "Boon helps" in the try box: its bubble state, and the text before the scaffold replaced it (one undo level). */
const boon = new Map<string, 'open' | 'ask' | 'failed'>();
const undoTry = new Map<string, string>();
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

/** L140: one labelled part of the lesson (icon + small caps head, like the brief's Task), divided by a rule, never a box in a box. */
const section = (name: IconName, title: string, ...body: (Node | null)[]): HTMLElement =>
  h('section', { class: 'mt-5 border-t border-line pt-4 first:mt-0 first:border-t-0 first:pt-0', 'aria-label': title }, partHead(name, title, 'h4'), ...body);

/** The full card (product-design-v4 §C.2). `titleId` differs between the brief and the dialog; `actions` sit next to the title. */
/** Boon's tour or guide mark is in this card's region: the lesson dialog, or the brief pane for a card drawn there. */
function quiet(titleId: string): boolean {
  const r = boonRegion();
  return titleId === 'lesson-dialog-title' ? r === 'dialog' : r === 'brief' || r === 'lesson';
}

function card(l: Lesson, titleId: string, actions: HTMLElement[], tour = false, guided = false): HTMLElement {
  const lang = getLang();
  const gslot = (name: string): HTMLElement | null => (guided ? guideSlot(name) : null); // v13 G4/G6: only the dialog opened from the General area
  const exampleOut = h('div', { class: 'mt-2' });
  const drawExample = (): void => {
    const e = examples.get(l.id);
    exampleOut.replaceChildren(...nodes(e && (e.result ? renderResult(e.result, undefined, 8) : errorView(e.error))));
  };
  const runExample = h('button', {
    type: 'button',
    onclick: () => {
      runExample.disabled = true;
      // lab is seeded on first use (L84): say so while it runs
      runOn(lessonSchema(l), l.example, () => exampleOut.replaceChildren(h('p', { class: 'my-1 text-body-sm text-muted' }, t('preview.loading'))))
        .then((result) => examples.set(l.id, { result }), (error: unknown) => examples.set(l.id, { error }))
        .finally(() => {
          runExample.disabled = false;
          drawExample();
          markExampleRan(l.id); // tour step 4
          if (guided) guideHooks.ran?.(); // v13 G4: on to the next step
          if (!exampleOut.isConnected) appActions.rerender(); // the brief was redrawn while it ran (e.g. DB still booting): show it there
        });
    },
  }, t('lesson.runExample'));
  drawExample();

  const area = h('textarea', { class: 'w-full rounded-(--r-inset) bg-code p-2 font-mono text-body-sm ring-1 ring-line', rows: l.node ? '8' : '3', spellcheck: 'false', 'aria-label': t('lesson.tryAria'), placeholder: t('lesson.tryPlaceholder') });
  area.value = drafts.get(l.id) ?? (l.node ? l.try.starter : ''); // skill lesson: empty, the player writes it (v10 critic #5); advanced: its long starter to change (v11 UX #1)
  area.addEventListener('input', () => {
    drafts.set(l.id, area.value);
    if (undoTry.delete(l.id)) drawBoon(); // one undo level, until the next edit (v13 §3.1)
  });
  const verdict = h('p', { role: 'status', class: 'mb-0' });
  const detail = h('div'); // outside the status line: the rows that differ (L84)
  const yours = h('div');
  const drawVerdict = (): void => {
    const v = verdicts.get(l.id);
    verdict.className = cx('mb-0', v && (v.ok ? 'good' : 'bad'));
    verdict.textContent = v ? v.text() : '';
    detail.replaceChildren(...nodes(v?.fail && diffView(v.fail)));
    if (guided) refreshGuides(); // v13 G6: the diff may have come or gone
  };
  const drawYours = (): void => {
    const r = tryRuns.get(l.id);
    yours.replaceChildren(...nodes(r && h('div', { class: 'mt-2' }, h('h5', { class: 'mt-0 mb-1 text-body-sm' }, t('lesson.yours')),
      r.result ? renderResult(r.result, undefined, 8, undefined, { why: whyCell(r.sql ?? '', lessonSchema(l), r.result.types) }) : errorView(r.error, true, r.sql))));
  };
  const busy = (on: boolean): void => {
    check.disabled = on;
    runMine.disabled = on;
  };
  const runMine = h('button', {
    type: 'button',
    onclick: async () => {
      if (!area.value.trim()) {
        verdicts.set(l.id, { ok: false, text: () => t('lesson.tryEmpty') });
        drawVerdict();
        return;
      }
      busy(true);
      const sql = area.value;
      await runOn(lessonSchema(l), sql).then((result) => tryRuns.set(l.id, { result, sql }), (error: unknown) => tryRuns.set(l.id, { error, sql }));
      busy(false);
      drawYours();
      if (!yours.isConnected) appActions.rerender();
    },
  }, t('lesson.run'));
  const check = h('button', {
    type: 'button',
    class: 'primary',
    onclick: async () => {
      if (!area.value.trim()) {
        verdicts.set(l.id, { ok: false, text: () => t('lesson.tryEmpty') }); // like Run/Submit on an empty editor (L68)
        drawVerdict();
        return;
      }
      const blanks = blanksIn(area.value, false); // v13 §3.8: not graded, like Submit
      if (blanks) {
        verdicts.set(l.id, { ok: false, text: () => t('work.blanks', { n: blanks }) });
        drawVerdict();
        return;
      }
      busy(true);
      verdict.className = 'mb-0';
      verdict.textContent = t('lesson.running');
      detail.replaceChildren();
      try {
        // The real grader against the lesson's own answer on lab, 0 XP; app.lastRun, drafts and history are never touched.
        const r = await grade((sql) => runOn(lessonSchema(l), sql, () => (verdict.textContent = t('preview.loading'))), l.try.solution, area.value, l.try.ordered);
        verdicts.set(l.id, r.ok ? { ok: true, text: () => t('lesson.tryOk') } : { ok: false, text: () => verdictText(r), fail: r });
        if (r.ok) markSeen(l.id, true);
      } catch (e) {
        verdicts.set(l.id, { ok: false, text: () => errorText(e) });
      }
      busy(false);
      drawVerdict();
      if (!verdict.isConnected) appActions.rerender();
    },
  }, t('lesson.check'));
  drawVerdict();
  drawYours();

  // v13 §3.1: "Boon helps" beside Run: his bubble (no second Boon: the card's title has him) offers the scaffold, free.
  const boonBox = h('div');
  const setArea = (v: string): void => {
    area.value = v;
    drafts.set(l.id, v);
  };
  const fillTry = async (force: boolean): Promise<void> => {
    let frame: string;
    try {
      frame = (await import('../frame')).frameOf(l.try.solution);
    } catch {
      boon.set(l.id, 'failed');
      return drawBoon('fill');
    }
    const act = force ? 'replace' : fillAction(area.value, frame, l.node ? l.try.starter : undefined); // an untouched advanced starter counts as empty
    if (act === 'ask') {
      boon.set(l.id, 'ask');
      return drawBoon('replace');
    }
    boon.set(l.id, 'open');
    if (act === 'replace') {
      undoTry.set(l.id, area.value);
      setArea(frame);
    }
    drawBoon();
    const at = firstBlank(area.value, false);
    area.focus();
    if (at >= 0) area.setSelectionRange(at, at + 3);
  };
  const drawBoon = (focus?: string): void => {
    const st = boon.get(l.id);
    const prev = undoTry.get(l.id);
    boonBox.replaceChildren(...nodes(st && h('div', { class: 'mt-2 rounded-(--r-card) bg-sun px-4 py-2 text-body-sm text-sun-ink [&_p]:my-1' },
      h('p', {}, t('frame.try')),
      st === 'ask'
        ? h('div', {}, h('p', {}, t('frame.askTry')), h('div', { class: 'flex flex-wrap gap-2' },
          h('button', { type: 'button', 'data-f': 'replace', class: 'primary', onclick: () => void fillTry(true) }, t('frame.replace')),
          h('button', { type: 'button', onclick: () => { boon.set(l.id, 'open'); drawBoon('fill'); } }, t('frame.keep'))))
        : h('div', { class: 'flex flex-wrap items-center gap-2' },
          h('button', { type: 'button', 'data-f': 'fill', onclick: () => void fillTry(false) }, t('frame.fill')),
          prev === undefined ? null : h('button', {
            type: 'button',
            onclick: () => {
              setArea(prev);
              undoTry.delete(l.id);
              drawBoon();
              area.focus();
            },
          }, t('frame.undo'))),
      st === 'failed' ? h('p', { role: 'status' }, t('frame.failed')) : null)));
    if (focus) boonBox.querySelector<HTMLElement>(`[data-f="${focus}"]`)?.focus();
  };
  const boonBtn = h('button', { type: 'button', 'aria-expanded': String(!!boon.get(l.id)), onclick: () => {
    boon.set(l.id, 'open');
    boonBtn.setAttribute('aria-expanded', 'true');
    drawBoon('fill');
  } }, t('frame.boon'));
  drawBoon();

  const skill = skillOf(l.id);
  // L140: in the dialog the header (title, Got it, Close) stays on top while the body scrolls; in the brief one frame holds the card.
  const inDialog = titleId === 'lesson-dialog-title';
  return h('section', { class: cx(!inDialog && 'my-3 rounded-(--r-ctl) bg-panel p-4 ring-1 ring-accent', guided && 'group'), 'aria-labelledby': titleId },
    h('div', { class: cx('flex flex-wrap items-center justify-between gap-2', inDialog ? 'sticky top-0 z-10 border-b border-line bg-panel px-5 py-3 max-sm:px-4' : 'mb-4') },
      h('h3', { id: titleId, tabindex: '-1', class: 'm-0 flex items-center gap-2' },
        // v12 (L87): Boon teaches the lesson; left out while his tour mark is in the same pane (one mascot per region)
        // v13: in the General dialog a guide mark may come and go without a redraw: CSS swaps Boon for the skill icon (v8 §2.4)
        ...(guided ? [mascot('boon', 'point', 'size-10 shrink-0 group-has-[[data-guide-mark]]:hidden'), skillIcon(l.id, 'size-5 hidden group-has-[[data-guide-mark]]:block')]
          : [tour || quiet(titleId) ? skillIcon(l.id, 'size-5') : mascot('boon', 'point', 'size-10 shrink-0')]),
        t('lesson.title', { skill: label(l.id) })),
      h('div', { class: 'flex gap-1.5' }, ...actions)),
    h('div', { class: cx('leading-relaxed', inDialog && 'px-5 pt-4 pb-6 max-sm:px-4') },
      // v15 Q6, L303: inside a domain the lesson's tables (lab) are not the company's; said first, and same-named tables by name
      !guided && inDomain(currentRoute()) ? labNote(l) : null,
      section('book', t('lesson.concept'), richText(l.concept[lang]),
        skill ? h('p', { class: 'mt-2 mb-0' }, h('b', {}, t('lesson.syntax')), ' ', h('code', {}, skill.syntax)) : null),
      section('code', t('lesson.example'), h('pre', { class: 'sql' }, l.example), h('div', { class: 'actions mb-0' }, runExample),
        tour ? tourSlot('lesson') : null, gslot('lesson-example'), exampleOut),
      section('info', t('lesson.explain'), richText(byMarker(l.explain[lang]))),
      section('alert', t('lesson.mistake'), h('pre', { class: 'sql' }, l.mistake.sql), richText(l.mistake.why[lang]), gslot('lesson-mistake')),
      l.cues[lang].length ? section('eye', t('lesson.cues'), h('ul', { class: 'm-0 flex list-none flex-wrap gap-2 p-0' },
        ...l.cues[lang].map((c) => h('li', { class: 'rounded-(--r-inset) bg-code px-2 py-1 text-body-sm' }, c)))) : null,
      section('flask', t('lesson.try'), richText(l.try.task[lang]), gslot('lesson-try'), tryPreview(l.try.solution, lessonSchema(l)), area,
        h('div', { class: 'actions mb-0' }, runMine, boonBtn, check), gslot('lesson-try-actions'), boonBox, verdict, detail, gslot('lesson-diff'), yours),
      h('p', { class: 'mt-5 mb-0 border-t border-line pt-4 text-body-sm' },
        h('a', { href: l.docs, target: '_blank', rel: 'noopener noreferrer', class: 'inline-flex items-center gap-1.5' }, icon('external', 'size-4'), t('lesson.docs')))));
}

/** Where the lesson's data comes from (L303): the shop chain on `lab`, and which of its tables share a name with the open domain's. */
function labNote(l: Lesson): HTMLElement {
  const same = tablesIn([l.example, l.mistake.sql, l.try.solution].join('\n'), DOMAIN_TABLES[activeDomain()]);
  return h('p', { class: 'mt-0 mb-4 flex gap-2 rounded-(--r-ctl) bg-info-soft p-3 text-body-sm', 'data-lab-note': '' }, icon('info', 'size-5 shrink-0'),
    h('span', {}, t('lesson.labNote'), same.length ? ` ${t('lesson.labSame', { tables: same.join(', ') })}` : ''));
}

/** One line for a lesson that is not open: "Quick lesson: X ✓ · Open again". */
function collapsed(id: string, open: () => void): HTMLElement {
  const seen = isSeen(id);
  return h('p', { class: 'my-2 flex flex-wrap items-center gap-2 text-body-sm', 'data-lesson': id },
    h('span', {}, `${t('lesson.collapsed', { skill: label(id) })}${seen ? ' ✓' : ''}`),
    h('button', { type: 'button', class: 'px-2 py-0.5 text-body-sm', onclick: open }, t(seen ? 'lesson.reopen' : 'lesson.show')));
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
          drilled(id) ? h('p', { class: 'mt-1 mb-0 text-body-sm text-muted' }, t('lesson.drilled')) : null, tour ? tourSlot('lesson') : null);
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

/**
 * A skill chip or the handbook: the same card in a modal dialog, readable before the task that teaches it; focus returns to the opener.
 * `guide`: opened from the General area (learning path, drill desk), where Boon's guides G4/G6 may show (v8 §2.2); never from a story chip.
 */
export function openLesson(id: string, node?: { lesson: Lesson; name: () => string }, opts?: { guide?: boolean }): void {
  if (node) names.set(id, node.name);
  const l = node?.lesson ?? loadLessons().get(id);
  if (!l) return;
  const dialog = byId('lesson-dialog') as HTMLDialogElement;
  const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const guided = !!opts?.guide;
  guideHooks.lesson = guided ? { diff: () => { const f = verdicts.get(l.id)?.fail; return !!f && hasDiff(f); } } : undefined; // before card(): the guide engine reads it
  dialog.replaceChildren(card(l, 'lesson-dialog-title', [
    guided ? guideHooks.replayBtn?.('lesson') ?? null : null,
    h('button', { type: 'button', onclick: () => { markSeen(id, false); dialog.close(); } }, `${t('lesson.gotIt')} ✓`),
    h('button', { type: 'button', onclick: () => dialog.close() }, t('app.close')),
  ].filter((b): b is HTMLElement => !!b), false, guided));
  dialog.onclose = () => {
    guideHooks.lesson = undefined;
    if (opener?.isConnected) opener.focus();
  };
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0; // L140: one dialog for every lesson; the last one's scroll would carry over
  if (guided) refreshGuides();
}
