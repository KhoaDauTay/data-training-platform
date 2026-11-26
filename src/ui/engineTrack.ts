import type { EngineId, EngineLesson, Level } from '../engine/content';
import { afterLesson, DIVE, levelNext, minutesOf, PRACTICE, PREREQS, relatedLesson, termLesson } from '../engine/tracks';
import { TRACK_DICT, type TrackKey } from '../i18n/engineTrack';
import type { EngineDeps } from './engineView';
import type { HubCtx } from './engineHub';

/**
 * v47 S2 (L940–L949, ia-plan I4/I7/I8): track facts (who for, prerequisites as links, total time, lessons), the level chooser,
 * one primary "next" per page type (level page, lesson end, Best Practice card, glossary term) and the lesson cross-links
 * ("Luyện thêm" → SQL skills, "Đào sâu" Design/Data stack → PostgreSQL). Lazy chunk `engineTrack` (budget `enginetrack`),
 * loaded in engineChunk()'s Promise.all and reached as `deps.track` (engineView, engineHub, engineBest, engineTerms).
 */
let lessons: readonly EngineLesson[] = [];
export const initTrack = (ls: readonly EngineLesson[]): void => { lessons = ls; };

export const tx = (lang: 'vi' | 'en', key: TrackKey, p: Record<string, string | number> = {}): string =>
  TRACK_DICT[lang][key].replace(/\{(\w+)\}/g, (_, k: string) => String(p[k] ?? ''));
const tr = (c: HubCtx, key: TrackKey, p?: Record<string, string | number>): string => tx(c.lang(), key, p);
const LV: Level[] = ['L1', 'L2', 'L3', 'L4', 'L5'];

/** A ≥ 24 px chip link; `above` lifts it over a stretched card link (L88). */
function chip(c: HubCtx, href: string, text: string, done = false, above = false): HTMLElement {
  const { h, cls } = c.d;
  return h('a', { href, class: cls.cx(cls.PILL, above && c.d.ui.ABOVE, 'min-h-6 bg-code text-ink no-underline hover:bg-accent-soft') }, text, c.tick(done));
}
const line = (c: HubCtx, label: string, ...body: (Node | string | null)[]): HTMLElement =>
  c.d.h('p', { class: 'm-0 flex flex-wrap items-center gap-2 text-body-sm' }, c.d.h('span', { class: 'font-semibold' }, `${label}:`), ...body);
const levelDone = (c: HubCtx, e: EngineId, lv: Level, ok: Set<string>): boolean => { const ls = c.levelLessons(e, lv); return !!ls.length && ls.every((x) => ok.has(x.id)); };

/** I4: who the track is for, what to know first (links), total time and lessons. `above` on a stretched track card. */
export function facts(c: HubCtx, e: EngineId, above = false): HTMLElement {
  const ok = c.done();
  const all = c.flat(e);
  const pre = PREREQS[e];
  const links = (pre ?? []).map((p) => ('sql' in p ? chip(c, `#/learn/sql/${p.sql[0]}`, tr(c, 'pre.sql', { a: p.sql[0], b: p.sql[1] }), false, above)
    : chip(c, c.d.engineHash(p.engine, p.to), `${c.nameOf(p.engine)} ${p.to}`, levelDone(c, p.engine, p.to, ok), above)));
  return c.d.h('div', { class: 'flex flex-col gap-1', 'data-track-facts': e },
    `for.${e}` in TRACK_DICT.vi ? c.d.h('p', { class: 'm-0 text-body-sm' }, c.d.h('span', { class: 'font-semibold' }, `${tr(c, 'for')}: `),
      c.d.h('span', { class: 'text-muted' }, tr(c, `for.${e}` as TrackKey))) : null,
    pre ? line(c, tr(c, 'pre'), ...(links.length ? links : [c.d.h('span', { class: 'text-muted' }, tr(c, 'pre.none'))])) : null,
    c.d.h('p', { class: 'm-0 text-body-sm text-muted tabular-nums' }, tr(c, 'time', { h: Math.max(1, Math.round(minutesOf(all) / 60)), n: all.length })));
}

/** I4 level chooser: links to each later level not done yet; it marks nothing (the continue button still follows the order). */
export function chooser(c: HubCtx, e: EngineId): HTMLElement | null {
  const { h, cls } = c.d;
  const ok = c.done();
  const lvs = LV.filter((lv, i) => i > 0 && c.levelLessons(e, lv).length && !levelDone(c, e, lv, ok));
  // eye-v47b B-15 (L1119): a two-level track's one jump repeats the L2 row's link just below, so it shows none
  if (!lvs.length || LV.filter((lv) => c.levelLessons(e, lv).length).length <= 2) return null;
  return h('section', { class: 'flex flex-col gap-2', 'aria-labelledby': 'engine-chooser', 'data-chooser': e },
    h('h2', { id: 'engine-chooser', class: c.d.ui.GROUP_TITLE }, tr(c, 'chooser')),
    h('p', { class: 'm-0 text-body-sm text-muted' }, tr(c, 'chooser.line')),
    h('div', { class: 'flex flex-wrap gap-2' }, ...lvs.map((lv) => {
      const i = LV.indexOf(lv);
      return h('a', { href: c.d.engineHash(e, lv), 'data-start': lv, class: cls.cx(cls.BTN_SECONDARY, 'px-4 py-1.5 no-underline') },
        tr(c, 'chooser.btn', { prev: i === 1 ? 'L1' : `L1–${LV[i - 1]}`, lv: c.levelName(lv) }));
    })));
}

/** I7 level page: earlier levels as "learn first" chips, then the one primary button (this level's next, else the next level's). */
export function levelHead(c: HubCtx, e: EngineId, lv: Level): HTMLElement {
  const { h, cls } = c.d;
  const ok = c.done();
  const before = LV.slice(0, LV.indexOf(lv)).filter((x) => c.levelLessons(e, x).length);
  const next = levelNext(c.flat(e), lv, ok);
  return h('div', { class: 'flex flex-col gap-3' },
    before.length ? line(c, tr(c, 'level.pre'), ...before.map((x) => chip(c, c.d.engineHash(e, x), c.levelName(x), levelDone(c, e, x, ok)))) : null,
    next ? h('div', {}, h('a', { href: c.lessonHash(next), 'data-next': 'level', class: cls.cx(cls.BTN_GO, 'inline-flex items-center gap-2 px-4 py-2 no-underline') },
      // L1093 (eye E-05): "Học tiếp" only once something of this level is done
      tr(c, next.level !== lv ? 'next.level' : c.levelLessons(e, lv).some((x) => ok.has(x.id)) ? 'next.go' : 'next.start', { lv: next.level, title: next.title[c.lang()] }), c.d.icon('arrowRight', 'size-4'))) : null);
}

/** I7 lesson end, once the lesson is done: the primary button to afterLesson(), else back to the track (or the shelf). */
export function doneNext(c: HubCtx, l: EngineLesson, all: readonly EngineLesson[]): HTMLElement {
  const { h, cls } = c.d;
  const ok = c.done();
  const go = afterLesson(all, l, ok);
  const ext = l.level === 'EXT';
  const name = ext ? c.et('level.EXT') : c.nameOf(l.engine);
  const btn = cls.cx(cls.BTN_GO, 'inline-flex items-center gap-1 px-4 py-2 no-underline');
  return go ? h('a', { href: c.lessonHash(go), class: btn, 'data-next': 'lesson' }, tr(c, go.level === l.level ? 'next.go' : 'next.level', { lv: go.level, title: go.title[c.lang()] }), c.d.icon('chevronRight', 'size-4'))
    : h('a', { href: ext ? c.d.engineHash(l.engine, 'EXT') : c.d.engineHash(l.engine), class: btn, 'data-ek': `${l.id}-to-engine` },
      all.every((x) => ok.has(x.id) || x.id === l.id) ? tr(c, 'next.done', { name }) : c.et('lesson.toEngine', { name }), c.d.icon('chevronRight', 'size-4'));
}

/** I8: "Luyện thêm" (SQL skill pages) and "Đào sâu" (Design/Data stack → PostgreSQL lessons) under a lesson; null when none. */
export function links(c: HubCtx, l: EngineLesson): HTMLElement | null {
  const ok = c.done();
  const skills = (PRACTICE[l.id] ?? []).map((s) => [s, c.d.skill?.(s)?.[c.lang()]] as const).filter((x): x is readonly [string, string] => !!x[1]);
  const dive = (DIVE[l.id] ?? []).map((id) => c.lessons().find((x) => x.id === id)).filter((x): x is EngineLesson => !!x);
  if (!skills.length && !dive.length) return null;
  return c.d.h('section', { class: 'flex flex-col gap-2', 'aria-label': [skills.length && tr(c, 'practice'), dive.length && tr(c, 'dive')].filter(Boolean).join(' · '), 'data-xlinks': '' },
    skills.length ? line(c, tr(c, 'practice'), ...skills.map(([s, label]) => chip(c, `#/learn/skill/${s}`, label))) : null,
    dive.length ? line(c, tr(c, 'dive'), ...dive.map((x) => chip(c, c.lessonHash(x), x.title[c.lang()], ok.has(x.id)))) : null);
}

/** I7 Best Practice card: its related lesson (first not done) as the one primary link; null without one. */
export function related(d: EngineDeps, ids: readonly string[]): HTMLElement | null {
  const id = relatedLesson(ids, new Set(d.app.save.completed));
  const l = lessons.find((x) => x.id === id);
  return l ? d.h('a', { href: d.engineHash(l.engine, l.level, l.id), 'data-next': 'related', class: d.cls.cx(d.cls.BTN_GO, 'inline-flex items-center gap-2 px-4 py-2 no-underline') },
    tx(d.getLang(), 'related', { title: l.title[d.getLang()] }), d.icon('arrowRight', 'size-4')) : null;
}

/** I7 glossary term: the lesson that names it, else its level page (first engine). */
export function termLink(d: EngineDeps, words: readonly string[], engines: readonly EngineId[], level: Level, levelText: string): HTMLElement | null {
  if (!engines.length) return null;
  const l = termLesson(words, engines, level, lessons);
  return d.h('a', { href: l ? d.engineHash(l.engine, l.level, l.id) : d.engineHash(engines[0], level), 'data-next': 'term', class: 'inline-flex min-h-6 items-center gap-1' },
    l ? tx(d.getLang(), 'term.lesson', { title: l.title[d.getLang()] }) : tx(d.getLang(), 'term.level', { lv: levelText }), d.icon('arrowRight', 'size-4'));
}
