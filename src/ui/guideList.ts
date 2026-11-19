import { offeredIds, type GuideState } from '../guides';
import type { Params } from '../i18n';
import { learnText, type LearnKey } from '../i18n/learn';
import { CHALLENGE_XP } from '../learn';
import type { DrillDeps } from './drillBrief';
import { offerGuides, replayGuide, type Guide, type GuideStep } from './guide';

/**
 * v13 (product-design-v8 §2.3): Boon's eight guides G1–G8 and where their steps point. Learnui chunk; main values come
 * through DrillDeps. Which guides a place offers is the pure offeredIds() (src/guides.ts): the General area only.
 */
let d$: DrillDeps;
const lt = (key: LearnKey, params?: Params): string => learnText(d$.getLang(), d$.locale(), key, { mod: d$.mod, ...params });
const step = (slot: string, key: LearnKey, params?: Params, more?: Partial<GuideStep>): GuideStep => ({ slot, text: () => lt(key, params), ...more });

function state(): GuideState {
  const hash = location.hash;
  const route = d$.parseRoute(hash);
  const g = d$.generalNow();
  const node = g?.nodes.find((x) => x.id === d$.learnAdvOf(hash));
  const learn = route !== 'learn' ? undefined
    : d$.isInterviewPage(hash) ? 'interview'
    : d$.SKILLS.some((s) => s.id === d$.learnSkillOf(hash)) ? 'skill'
      : node ? (node.status === 'external' ? 'adv-ext' : 'adv') : d$.learnModuleOf(hash) ?? 'path';
  const m = d$.session.mode;
  const tk = m.kind === 'drill' ? m.ticket : m.kind === 'practice' ? m.run.tickets[m.run.index] : undefined;
  const lesson = d$.guideHooks.lesson;
  return { route, learn, mode: m.kind, drillKind: tk && g?.byId.get(tk.id)?.kind, lesson: lesson && { diff: lesson.diff() }, diff: !!d$.guideHooks.diff?.(),
    modal: !!document.querySelector('dialog:modal') };
}

function build(id: string, s: GuideState): Guide | undefined {
  const lang = d$.getLang();
  const kind = s.drillKind;
  if (id === 'path') {
    return { id, steps: [
      step('learn-head', 'g.path.1', undefined, { mascot: false }), // Boon speaks from the teaching scene just above
      step('learn-sql', 'g.path.2'),
      step('learn-adv', 'g.path.3', undefined, { action: { label: () => lt('g.path.open'), run: () => void (location.hash = `${d$.hashOf('learn')}/sql/1`) } }),
    ], done: () => document.querySelector<HTMLButtonElement>('#home .teach-scene button')?.click() }; // Lily cheers (her button: 600 ms, no reward)
  }
  if (typeof s.learn === 'number' && id.startsWith('module')) {
    const n = s.learn;
    const skills = d$.SKILLS.filter((x) => x.chapter === n);
    const p = { n, k: skills.length, list: skills.map((x) => x.label[lang]).join(', ') };
    if (id !== 'module-intro') return { id, steps: [step('module-head', 'g.module.short', p)] };
    const first = skills.find((x) => d$.loadLessons().has(x.id));
    const skill = () => first?.label[d$.getLang()] ?? '';
    return { id, also: [`module:${n}`], steps: [
      step('module-head', 'g.module.1', p),
      step('module-skill', 'g.module.2'),
      ...(first ? [{ slot: 'module-skill', text: () => lt('g.module.3', { skill: skill() }),
        action: { label: () => lt('g.module.open', { skill: skill() }), run: () => d$.openLesson(first.id, undefined, { guide: true }) } }] : []),
    ] };
  }
  if (id === 'skill') return { id, steps: [step('skill-head', 'g.skill.1'), step('skill-card', 'g.skill.2')] };
  if (id === 'lesson') return { id, steps: ['example', 'mistake', 'try', 'try-actions'].map((x, i) => step(`lesson-${x}`, `g.lesson.${i + 1}` as LearnKey)) };
  if (id === 'diff') return { id, steps: [step(s.lesson ? 'lesson-diff' : 'diff', 'g.diff')] };
  if (id === 'drill' && kind) return { id, also: [`drill:${kind}`], steps: [step('drill-brief', 'g.drill.1'), step('work', 'g.drill.2'), step('drill-brief', `g.drill.${kind}` as LearnKey)] };
  if (id === `drill:${kind}`) return { id, steps: [step('drill-brief', `g.drill.${kind}` as LearnKey)] };
  if (id === 'review') return { id, steps: [step('drill-brief', 'g.review')] };
  if (id === 'practice') {
    const { app } = d$;
    const learned = Object.keys(app.save.review).length > 0 || d$.knownSkills(app.save, d$.loadTickets('logistics'), d$.SKILLS.map((x) => x.id)).size > 0;
    return { id, steps: [learned ? step('practice-review', 'g.practice.1') : null, step('practice-hub', 'g.practice.2')].filter((x): x is GuideStep => !!x) };
  }
  if (id === 'adv' || id === 'adv-ext') {
    const node = d$.generalNow()?.nodes.find((x) => x.id === d$.learnAdvOf(location.hash));
    if (id === 'adv-ext') return { id, steps: [step('adv-links', 'g.adv.ext')] };
    return { id, steps: [node?.needs.length ? step('adv-needs', 'g.adv.1') : null, step('adv-drills', 'g.adv.2', { xp: CHALLENGE_XP })].filter((x): x is GuideStep => !!x) };
  }
  return undefined;
}

/** "Boon chỉ mình" (v8 §2.1): a text button, no mascot (the mark brings Boon). */
export const replayBtn = (id: string): HTMLElement =>
  d$.h('button', { type: 'button', class: 'px-2 py-0.5 text-body-sm', onclick: () => replayGuide(id) }, lt('guide.replay'));

/** Called once by drillBrief.ts initDrill, after initGuides. */
export function initGuideList(deps: DrillDeps): void {
  d$ = deps;
  deps.guideHooks.replayBtn = replayBtn;
  offerGuides(() => {
    const s = state();
    return offeredIds(s).map((id) => build(id, s)).filter((g): g is Guide => !!g);
  });
}
