import { getLang, t, type Key } from '../i18n';
import { generalNow, loadGeneral } from '../content';
import { activeDomain, domainSchemaName, domainText } from '../domains';
import { DRILL_ID } from '../save';
import { LANE_XP } from '../lanes';
import { roleLine } from '../people';
import { chaptersOf, nextTicket, SKILLS, visibleTickets, xpFor } from '../progress';
import { hashOf } from '../route';
import { ROUTES } from '../scene';
import { compareShape, shapeOf, type Kind, type Shape } from '../shape';
import { framePrice, hintsShown, isClosed, isStory, payFrame, schemaOf, useHint, workKey } from '../session';
import { actions, app, done, erMeta, expectedShape, persist, showsParents, stepKey, unlockedTables } from '../state';
import { chapterColor, cx, DEPT_CHIP, deptColor, PILL, thanksKey } from '../theme';
import { optionOrder, textOf, type Beat, type Ticket, type TicketText } from '../tickets';
import { relatedTables } from '../viz/erd';
import { mascot } from './mascots';
import { avatar } from './avatar';
import { boonRegion, coach, tourSlot } from './coach';
import { byId, h, nodes, reducedMotion, richText } from './dom';
import { once, react, tick } from './celebrate';
import { partHead, skillIcon } from './icons';
import { lessonSlot } from './lessonCard';

const BEAT: Record<Beat, Key> = { teach: 'beat.teach', develop: 'beat.develop', twist: 'beat.twist', rest: 'beat.rest', boss: 'beat.boss' };
const KIND: Record<Kind, Key> = { text: 'shape.text', number: 'shape.number', date: 'shape.date', bool: 'shape.bool' };

/** Conclusion option picked per ticket: survives re-renders and language switches (not saved). */
const picked = new Map<string, number>();
/** Reflect option picked per ticket (curriculum §5.5): same rules, never graded or saved. */
const reflected = new Map<string, number>();

const mark = (ok: boolean): string => (ok ? '✓' : '✗');

/** "Expected result": column count and kinds, row count, ordering, author labels from `columns:`. Never Solution column names. */

export function shapeCard(tk: Ticket, stepIndex: number): HTMLElement {
  const step = tk.steps[stepIndex];
  const labels = step.columns ?? [];
  const card = h('section', { class: 'mt-5 mb-3', 'aria-label': t('shape.title') });
  const draw = (exp?: Shape) => {
    const n = exp?.kinds.length ?? labels.length;
    const run = app.lastRun?.key === stepKey(tk.id, stepIndex) ? app.lastRun.result : undefined;
    const cmp = exp && run ? compareShape(exp, shapeOf(run)) : undefined;
    card.replaceChildren(partHead('table', t('shape.title')), h('div', { class: 'rounded-(--r-ctl) bg-panel px-4 py-3 ring-1 ring-line' }, ...nodes(
      h('p', { class: 'mt-0 mb-2 font-semibold' }, [t('shape.cols', { n }), exp ? t('shape.rows', { n: exp.rows }) : '…', exp?.rows === 1 ? null : t(tk.ordered ? 'shape.ordered' : 'shape.unordered')].filter(Boolean).join(' · ')), // one row has no order (v10 C4)
      h('ol', { class: 'my-2 flex list-none flex-wrap gap-2 p-0' }, ...Array.from({ length: n }, (_, i) =>
        h('li', { class: 'flex items-center gap-1.5 rounded-(--r-inset) bg-code px-2 py-1 text-body-sm' }, // The label already says what the column holds; the kind (text/number/date) only stands in when there is no label.
        h('span', { class: 'text-caption text-muted tabular-nums', 'aria-hidden': 'true' }, String(i + 1)),
        labels[i] ? h('b', { class: 'font-semibold' }, labels[i][getLang()]) : exp ? t(KIND[exp.kinds[i]]) : null))),
      h('p', { class: 'mt-2 mb-0 text-body-sm text-muted' }, t('shape.byPosition')),
      cmp && run
        ? h('p', { class: cmp.columns && cmp.kinds && cmp.rows ? 'good' : 'warn' },
          t('shape.yours', { cols: run.columns.length, colsOk: mark(cmp.columns && cmp.kinds), rows: run.rows.length, rowsOk: mark(cmp.rows) }))
        : null)));
  };
  draw();
  // v12.0 D10-3: a hidden workspace (Home, SQL only) must not seed the open domain; showRoute() redraws the brief when it opens.
  if (!document.getElementById('shell')?.hidden) expectedShape(step.solution, schemaOf(tk), step.check).then(draw, () => draw());
  return card;
}

/** Index lab step (chapter 11): the slow query (the step's Solution) the player's CREATE INDEX must speed up. Replaces the shape card. */
function labCard(sql: string): HTMLElement {
  return h('section', { class: 'my-3 rounded-(--r-ctl) bg-panel p-3 ring-1 ring-line', 'aria-label': t('lab.title') },
    h('h3', { class: 'mt-0' }, t('lab.title')),
    h('pre', { class: 'sql' }, sql),
    h('p', { class: 'mt-1 mb-0 text-body-sm text-muted' }, t('lab.howto')));
}

/** v13 §3.1: steps waiting on "Replace with the scaffold?" / whose scaffold chunk failed to load (stepKey). Session only. */
const asking = new Set<string>();
const frameFailed = new Set<string>();

/**
 * Inside Boon's bubble, once the hint that names the commands is open (story: hint 2; a drill's only hint; faded: hint 1):
 * "Fill the scaffold into the editor" (faded: "Reset the starting scaffold", free) with its price (§3.6), the in-place
 * "Replace?" question (§3.5), or why an index lab step gets none (§3.7). Redrawn in place so focus stays on its buttons.
 */
function fillBox(tk: Ticket, i: number, shown: number): HTMLElement | null {
  const faded = tk.format === 'faded';
  if (shown < (faded ? 1 : Math.min(2, tk.hints.length))) return null;
  if (tk.steps[i].lab) return h('p', { class: 'mt-2 mb-0 text-body-sm' }, t('frame.lab'));
  if (faded && !tk.starter) return null;
  if (!faded && tk.steps[i].check) return null; // v26 R2: frameOf is shaped for a read; a write drill's hint names the statement instead
  const k = stepKey(tk.id, i);
  const box = h('div', { class: 'mt-2' });
  const fill = async (force: boolean): Promise<void> => {
    const at = workKey();
    let sql = tk.starter ?? '';
    if (!faded) {
      try {
        const { frameOf } = await import('../frame'); // lazy chunk `frame`
        const drill = DRILL_ID.test(tk.id) ? generalNow()?.byId.get(tk.id) : undefined;
        const wrongs = drill?.kind === 'trap' ? drill.wrong : tk.trap ? tk.wrong : undefined;
        sql = frameOf(tk.steps[i].solution, wrongs?.map((w) => w.sql));
        frameFailed.delete(k);
      } catch {
        frameFailed.add(k);
        return draw('fill');
      }
    }
    if (workKey() !== at) return; // the player moved on while the chunk loaded
    const r = actions.fillFrame(sql, faded, force);
    if (r === 'ask') {
      asking.add(k);
      return draw('replace');
    }
    asking.delete(k);
    if (r !== 'done') return;
    if (!faded) payFrame(tk); // only once the editor really holds the scaffold
    persist();
    actions.rerender(); // the last hint and the XP line change
  };
  const draw = (focus?: string): void => {
    const price = faded ? undefined : framePrice(tk);
    box.replaceChildren(...nodes(
      asking.has(k)
        ? h('div', {},
          h('p', { class: 'mt-0 mb-1' }, t('frame.ask')),
          h('div', { class: 'flex flex-wrap gap-2' },
            h('button', { type: 'button', 'data-f': 'replace', class: 'primary', onclick: () => void fill(true) }, t('frame.replace')),
            h('button', { type: 'button', onclick: () => { asking.delete(k); draw('fill'); } }, t('frame.keep'))))
        : h('div', { class: 'flex flex-wrap items-center gap-2' },
          h('button', { type: 'button', 'data-f': 'fill', onclick: () => void fill(false) }, t(faded ? 'frame.reset' : 'frame.fill')),
          price === undefined ? null : h('span', { class: 'text-body-sm' }, typeof price === 'object' ? t('frame.cost', { i: price.hint, cost: price.xp })
            : price === 'free' ? t('frame.free') : t(DRILL_ID.test(tk.id) ? 'frame.weakPass' : 'frame.weakRun'))),
      frameFailed.has(k) ? h('p', { role: 'status', class: 'mt-1 mb-0 text-body-sm' }, t('frame.failed')) : null));
    if (focus) box.querySelector<HTMLElement>(`[data-f="${focus}"]`)?.focus();
  };
  draw();
  return box;
}

/** Hints as Boon's words (v13 §3.1): the earlier ones as a small list, the latest in his bubble with the scaffold button. */
export function hints(tk: Ticket, x: TicketText, isDone: boolean, stepIndex = 0): HTMLElement {
  const shown = hintsShown(tk.id);
  const cost = xpFor(tk, shown) - xpFor(tk, shown + 1); // 0 in chapter 1 (L54)
  const btn = h('button', {
    type: 'button',
    onclick: () => {
      useHint(tk.id);
      persist();
      actions.rerender();
      // ui-ux-v5 A2: at the click, after the redraw: Boon leans and the new bubble opens (older hints stay still).
      const box = byId('ticket').querySelector('section.hints');
      react(box);
      const bubble = box?.querySelector('[data-bubble]');
      if (bubble && !reducedMotion()) {
        bubble.classList.add('cq-bubble');
        once(bubble, 'cq-bubble');
      }
    },
  }, isStory() && cost > 0
    ? t('brief.hint', { i: shown + 1, n: x.hints.length, cost })
    : t('brief.hintFree', { i: shown + 1, n: x.hints.length })); // Practice: 0 XP, so no cost (P9); chapter 1: free (L54)
  const region = boonRegion();
  const tourHere = region === 'brief' || region === 'lesson'; // one Boon per pane: the tour's or a guide's mark is here
  const last = Math.min(shown, x.hints.length);
  return h('section', { class: 'hints my-3' },
    last > 1 ? h('ol', { class: 'mt-0 mb-2 space-y-1 text-body-sm text-muted' }, ...x.hints.slice(0, last - 1).map((s) => h('li', {}, richText(s)))) : null,
    last ? h('div', { class: 'flex items-start gap-3' }, tourHere ? null : mascot('boon', 'point', 'size-12 shrink-0'),
      h('div', { 'data-bubble': '', class: 'min-w-0 flex-1 rounded-(--r-card) rounded-tl-sm bg-sun px-4 py-2 text-sun-ink [&_p]:my-1' },
        h('p', { class: 'text-body-sm font-semibold' }, t('brief.hintFree', { i: last, n: x.hints.length })),
        richText(x.hints[last - 1]),
        isDone ? null : fillBox(tk, stepIndex, last))) : null,
    isDone || shown >= x.hints.length ? null : btn);
}

function conclusion(tk: Ticket, x: TicketText): HTMLElement {
  const c = x.conclusion!;
  const msg = h('p', { role: 'status', class: 'bad' });
  const form = h('form', { id: 'conclusion-form', class: 'my-3 scroll-mt-4 rounded-(--r-ctl) p-3 ring-2 ring-accent' },
    h('h3', { class: 'mt-0' }, t('brief.conclusion')),
    h('fieldset', { class: 'mb-4' },
      h('legend', { class: 'mb-2' }, c.question),
      ...optionOrder(`${tk.id}#c`, c.options.length).map((i) => h('label', { class: 'my-1 flex items-center gap-2' },
        h('input', { type: 'radio', name: 'conclusion', value: String(i), checked: picked.get(tk.id) === i, onchange: () => picked.set(tk.id, i) }),
        ' ', c.options[i]))),
    h('button', { class: 'primary', type: 'submit' }, t('brief.conclude')),
    msg);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = picked.get(tk.id);
    if (v === undefined) msg.textContent = t('brief.pickOne');
    else if (v === tk.conclusion!.answer) actions.complete(tk);
    else msg.textContent = t('brief.wrongConclusion');
  });
  return form;
}

/** format: worked (curriculum §5.1): the annotated example the task is paired with; the button loads it into the editor. */
function exampleCard(tk: Ticket, x: TicketText): HTMLElement | null {
  if (!tk.example || !x.example) return null;
  const sql = tk.example.sql;
  const status = h('p', { role: 'status', class: 'mb-0 text-body-sm text-muted' });
  return h('section', { class: 'my-3 rounded-(--r-ctl) bg-panel p-3 ring-1 ring-line', 'aria-labelledby': 'example-title' },
    h('h3', { id: 'example-title', class: 'mt-0' }, t('brief.example')),
    h('pre', { class: 'sql' }, sql),
    richText(x.example),
    h('button', {
      type: 'button',
      onclick: (e: Event) => {
        actions.useSql(sql);
        tick(e.currentTarget as HTMLElement); // X4 (L166): a check mark for 1 s
        status.textContent = t('brief.exampleCopied'); // the draft was replaced: say how to get it back
      },
    }, t('brief.useExample')),
    status);
}

/**
 * Recap question (curriculum §5.5): pick an option, then the right one (✓ and a text label, not only colour) and the reason show.
 * Picking updates the card in place, so focus stays on the chosen button and the status element is the same one each time.
 */
function reflectCard(tk: Ticket): HTMLElement | null {
  const r = tk.reflect;
  if (!r) return null;
  const lang = getLang();
  const status = h('p', { role: 'status', class: 'mb-0' });
  const buttons = r.options.map((_, i) => h('button', {
    type: 'button',
    onclick: () => {
      reflected.set(tk.id, i);
      draw();
    },
  }));
  const draw = (): void => {
    const pick = reflected.get(tk.id);
    buttons.forEach((b, i) => {
      const right = pick !== undefined && i === r.answer;
      b.className = cx('text-left', right && 'ring-2 ring-good');
      b.setAttribute('aria-pressed', pick === i ? 'true' : 'false');
      b.replaceChildren(...nodes(
        right ? `${mark(true)} ` : pick === i ? `${mark(false)} ` : null,
        r.options[i][lang],
        right ? h('span', { class: 'good' }, ` (${t('recap.reflectAnswer')})`) : null));
    });
    status.className = cx('mb-0', pick !== undefined && (pick === r.answer ? 'good' : 'bad'));
    status.textContent = pick === undefined ? '' : `${t(pick === r.answer ? 'recap.reflectRight' : 'recap.reflectWrong')} ${r.why[lang]}`;
  };
  draw();
  return h('section', { class: 'my-3 rounded-(--r-ctl) bg-panel p-3 ring-1 ring-line', 'aria-labelledby': 'reflect-title' },
    h('h4', { id: 'reflect-title', class: 'mt-0' }, t('recap.reflect')),
    h('p', {}, r.q[lang]),
    h('div', { class: 'flex flex-col items-start gap-1.5' }, ...optionOrder(`${tk.id}#r`, buttons.length).map((i) => buttons[i])),
    status);
}

/** "This week at Cargo Query" (product-design-v2 ★4): the chapter's story, shown on its first ticket only. */
function story(tk: Ticket): HTMLElement | null {
  const c = chaptersOf().find((x) => x.chapter === tk.chapter);
  if (!c?.story.vi || app.tickets.find((x) => x.chapter === tk.chapter) !== tk) return null;
  return h('section', { class: 'my-3 overflow-hidden rounded-(--r-ctl) bg-panel ring-1 ring-line' },
    h('div', { class: cx('h-1.5', chapterColor(tk.chapter).bar) }),
    h('div', { class: 'p-3' },
      h('h3', { class: 'mt-0' }, t(domainText()?.story ?? 'brief.story')),
      h('p', { class: 'm-0' }, c.story[getLang()])));
}

/** After a correct answer: your reply, then the sender's thank-you (L18 ★1). */
function sentBubbles(tk: Ticket): HTMLElement {
  return h('div', { class: 'my-3 flex flex-col gap-2' },
    h('p', { class: 'm-0 max-w-[85%] self-end rounded-(--r-card) rounded-tr-sm bg-accent-soft px-4 py-2' }, t('chat.sent')),
    h('p', { class: 'm-0 flex max-w-[85%] items-start gap-2 self-start' },
      avatar(tk.from),
      h('span', { class: 'rounded-(--r-card) rounded-tl-sm bg-code px-4 py-2' }, t(thanksKey(tk.from.dept, tk.id)))));
}

/** The SQL that passed the grader; saves from before `graded` existed fall back to the draft. */
const gradedSql = (tk: Ticket, i: number): string => app.save.graded[stepKey(tk.id, i)] ?? app.save.drafts[stepKey(tk.id, i)] ?? '';

/** L145: optional tasks left (chapters whose review was passed early): the Recap must not say everything is done. */
const optionalLeft = (): number => visibleTickets(app.tickets, done()).filter((x) => !done().has(x.id)).length;

/** On a closed ticket: skills learned (or reviewed), your SQL next to the reference, XP, "Next ticket". */
function recap(tk: Ticket, x: TicketText): HTMLElement {
  const lang = getLang();
  const ids = tk.grants.length ? tk.grants : tk.requires;
  const skills = SKILLS.filter((s) => ids.includes(s.id));
  const next = nextTicket(app.tickets, done());
  const hintsUsed = app.save.hintsUsed[tk.id] ?? 0;
  return h('section', { class: 'recap my-3 rounded-(--r-ctl) bg-good-soft p-4 ring-1 ring-good/40' },
    h('h3', { tabindex: '-1', class: 'mt-0 text-good' }, t('recap.title')),
    h('p', {}, tk.lane ? t('lane.xp', { n: LANE_XP }) : t('recap.xp', { n: xpFor(tk, hintsUsed), hints: hintsUsed })),
    h('h4', {}, t(tk.grants.length ? 'recap.learned' : 'recap.review')),
    h('ul', { class: 'space-y-1' }, ...skills.map((s) =>
      h('li', {},
        h('span', { class: 'inline-flex items-center gap-1.5 align-middle' }, skillIcon(s.id, 'size-5 text-good'), h('b', {}, s.label[lang])),
        ...(activeDomain() === 'logistics' ? [' ', h('code', {}, s.syntax)] : []), h('p', { class: 'muted' }, s.when[lang])))),
    reflectCard(tk),
    ...tk.steps.map((s, i) => h('div', { class: 'my-2 grid gap-2 sm:grid-cols-2' },
      tk.steps.length > 1 ? h('h4', {}, x.steps[i].title) : null,
      h('figure', {}, h('figcaption', { class: 'mb-1 text-body-sm text-muted' }, t('recap.yours')), h('pre', { class: 'sql' }, gradedSql(tk, i))),
      h('figure', {}, h('figcaption', { class: 'mb-1 text-body-sm text-muted' }, t('recap.reference')), h('pre', { class: 'sql' }, s.lab?.ddl ?? s.solution)))), // lab step: the reference index, not the slow query
    // One way on (v10 critic #3): the task bar's continue button for a story task, the wrap-up for a promotion review.
    tk.lane && next ? h('button', { type: 'button', class: 'primary', onclick: () => actions.selectTicket(next.id) }, t('nav.continueBack'))
      : next ? null : h('p', {}, optionalLeft() ? t('recap.allDoneOptional', { n: optionalLeft() }) : t('recap.allDone')));
}

/**
 * "Related tables:" chips (ui-ux-v4 §4), alphabetical so nothing marks the tables the answer uses. The task's own tables
 * first; once the FK metadata is in, only this line is refilled with their parents too (no rerender). A chip opens the ER tab.
 */
function relatedLine(tk: Ticket): HTMLElement | null {
  const open = unlockedTables();
  const core = tk.tables.filter((x) => open.includes(x));
  if (core.length === 0) return null;
  const line = h('p', { class: 'my-3 flex flex-wrap items-center gap-1.5 text-body-sm' });
  const fill = (tables: string[]) => line.replaceChildren(h('span', { class: 'text-muted' }, t('brief.related')), ...[...tables].sort().map((x) =>
    h('button', { type: 'button', class: 'min-h-6 px-1.5 py-0 font-mono text-body-sm', onclick: () => actions.showTab('erd') }, x)));
  fill(core);
  erMeta(domainSchemaName()).then((m) => fill(relatedTables(tk.tables, open, m.cons, 10, showsParents(tk)).tables), () => {}); // DB not ready or failed: the task's own tables stay
  return line;
}

/**
 * Plan 11 §1.4: "Relies on:" links to the advanced General nodes a task applies (domain -> General only, L82). Titles come
 * from the General chunk, fetched only when there are ids; until then (or if it fails) each link reads "Related advanced
 * lesson" and still works. The line is refilled in place, never through rerender() (a failed load would retry in a loop).
 */
export function advLine(ids: string[], linkClass = ''): HTMLElement | null {
  if (!ids.length) return null;
  const line = h('span', { class: 'inline-flex flex-wrap items-center gap-x-1.5' });
  const fill = () => {
    const nodes = generalNow()?.nodes;
    line.replaceChildren(h('span', { class: 'text-muted' }, t('brief.adv')), ...ids.map((id) => h('a', { href: `${hashOf('learn')}/adv/${id}`, class: cx('inline-flex min-h-6 items-center', linkClass) } /* v21 E3: a 24 px target */,
      nodes?.find((n) => n.id === id)?.title[getLang()] ?? t('brief.advLoading'))));
  };
  fill();
  if (!generalNow()) loadGeneral().then(fill, () => {});
  return line;
}

/** Left pane for `tk` (not necessarily the selected ticket: Plan 1c renders practice tickets here). Replaces host's children. */
export function renderBrief(host: HTMLElement, tk: Ticket, stepIndex: number): void {
  const x = textOf(tk, getLang());
  const isDone = isClosed(tk.id); // Practice replays a done ticket open: shape card, hints and Submit, no Recap
  const boss = tk.steps.length > 1;
  host.replaceChildren(...nodes(
    h('header', { class: 'mb-2 space-y-1' },
      h('div', { class: 'flex items-center gap-3' },
        avatar(tk.from, 'md'),
        h('p', { class: 'm-0 min-w-0' },
          h('span', { class: 'flex flex-wrap items-center gap-2 font-semibold' },
            tk.from.name, h('span', { class: cx(DEPT_CHIP, deptColor(tk.from.dept)) }, tk.from.dept)),
          h('span', { class: 'block text-body-sm text-muted' }, roleLine(tk.from.name, getLang(), unlockedTables())))),
      h('p', { class: 'm-0 flex flex-wrap items-center gap-2 text-body-sm text-muted' },
        tk.lane ? t('lane.optional', { xp: LANE_XP }) : `${t('brief.chapter', { n: tk.chapter })} · ${'★'.repeat(tk.difficulty)}`,
        tk.lane || isStory() ? h('span', { class: cx(PILL, chapterColor(tk.chapter).chip) }, // Practice has its own banner: no "New skill" badge (v10 UX #6)
          tk.lane ? t('lane.badge', { name: ROUTES.find((r) => r.port === tk.lane)?.name ?? tk.lane }) : t(BEAT[tk.beat])) : null,
        isDone ? `✓ ${t('inbox.done')}` : ''),
      h('h2', { id: 'brief-title', tabindex: '-1', class: 'm-0 text-title font-bold' }, x.title),
      x.fallback ? h('p', { class: 'tag' }, t('brief.untranslated')) : null),
    // v10 critic #1: the message, then the Task and the Expected result card, visible without scrolling; the rest below.
    h('div', { class: 'mt-3 rounded-(--r-card) rounded-tl-sm bg-code px-4 py-1 leading-relaxed [&_p]:my-2' }, richText(x.body)),
    x.task ? h('section', { class: 'mt-5 mb-3', 'aria-label': t('brief.task') }, partHead('list', t('brief.task')),
      h('div', { class: 'rounded-(--r-ctl) border-l-4 border-accent bg-accent-soft px-4 py-3 leading-relaxed [&_p]:my-1' }, richText(x.task))) : null,
    isStory() ? tourSlot('brief') : null, // tour step 1 right under the Task: both fit the 1267x740 pane (~350 px) together
    boss
      ? h('section', { id: 'brief-step', class: 'my-3 scroll-mt-4 rounded-(--r-inset) p-3 ring-1 ring-line' },
        h('h3', { class: 'mt-0' }, t('brief.step', { i: stepIndex + 1, n: tk.steps.length, title: x.steps[stepIndex].title })),
        richText(x.steps[stepIndex].prompt))
      : null,
    isDone ? null : tk.steps[stepIndex].lab ? labCard(tk.steps[stepIndex].solution) : shapeCard(tk, stepIndex),
    relatedLine(tk),
    tk.adv ? h('p', { class: 'my-3 text-body-sm' }, advLine(tk.adv)) : null,
    h('div', { 'data-brief-extra': '' }), // modes.ts puts skill chips, chapter goals and the lane note here
    exampleCard(tk, x),
    isStory() && !isDone ? lessonSlot(tk.grants) : null, // seen lessons (or "I know SQL") are one line each
    isStory() ? story(tk) : null,
    coach('hints'),
    hints(tk, x, isDone, stepIndex),
    app.conclusionFor === tk.id && !isDone && x.conclusion ? conclusion(tk, x) : null,
    isDone ? sentBubbles(tk) : null,
    isDone ? recap(tk, x) : null,
    isDone && isStory() ? tourSlot('recap') : null, // tour step 8 after the Recap card, not inside it (v6 §2.1)
  ));
}
