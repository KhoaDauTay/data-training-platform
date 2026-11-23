import { describe, expect, it } from 'vitest';
import { GUIDES_KEY, GUIDES_MAX, guideFor, guideRegion, offeredIds, parseGuides, withSeen } from '../src/guides';

describe('parseGuides (pref cargo-query/guides, v8 §2.1)', () => {
  it('reads a good pref', () => {
    expect(parseGuides({ seen: ['path', 'drill:faded', 'module:3'], off: true })).toEqual({ seen: ['path', 'drill:faded', 'module:3'], off: true });
  });
  it('treats a non-object as no pref', () => {
    for (const v of [undefined, null, 'x', 3, ['path'], true]) expect(parseGuides(v)).toBeUndefined();
  });
  it('drops bad ids and duplicates, keeps at most the last 64', () => {
    expect(parseGuides({ seen: ['path', 'Path', 'a b', 7, null, 'path', 'diff'] })?.seen).toEqual(['path', 'diff']);
    const many = Array.from({ length: 70 }, (_, i) => `module:${i}`);
    const seen = parseGuides({ seen: many })!.seen;
    expect(seen).toHaveLength(GUIDES_MAX);
    expect(seen[0]).toBe('module:6');
  });
  it('turns guides off only for a stored true', () => {
    for (const off of [1, 'true', 'yes', null]) expect(parseGuides({ seen: [], off })?.off).toBe(false);
    expect(parseGuides({ seen: 'path' })).toEqual({ seen: [], off: false });
  });
});

describe('withSeen', () => {
  it('adds once, keeps off, caps the list', () => {
    expect(withSeen(undefined, 'path')).toEqual({ seen: ['path'], off: false });
    expect(withSeen({ seen: ['path', 'diff'], off: true }, 'path')).toEqual({ seen: ['diff', 'path'], off: true });
    const full = { seen: Array.from({ length: GUIDES_MAX }, (_, i) => `module:${i}`), off: false };
    const next = withSeen(full, 'path').seen;
    expect(next).toHaveLength(GUIDES_MAX);
    expect(next.at(-1)).toBe('path');
  });
});

describe('guideFor', () => {
  const ctx = { offered: ['drill', 'drill:faded'], knows: false, tour: false };
  it('shows the first offered guide not seen yet', () => {
    expect(guideFor(ctx, undefined)).toBe('drill');
    expect(guideFor(ctx, { seen: ['drill'], off: false })).toBe('drill:faded');
    expect(guideFor(ctx, { seen: ['drill', 'drill:faded'], off: false })).toBeUndefined();
  });
  it('shows nothing outside the General area (nothing offered)', () => {
    expect(guideFor({ ...ctx, offered: [] }, undefined)).toBeUndefined();
  });
  it('never auto-shows when turned off, for "I know SQL" (D-G1) or while a tour mark is up', () => {
    expect(guideFor(ctx, { seen: [], off: true })).toBeUndefined();
    expect(guideFor({ ...ctx, knows: true }, undefined)).toBeUndefined();
    expect(guideFor({ ...ctx, tour: true }, undefined)).toBeUndefined();
  });
});

describe('guideRegion (one Boon per region, v8 §2.4)', () => {
  it('maps slots to the regions the mascot callers compare against', () => {
    expect(guideRegion('drill-brief')).toBe('brief');
    expect(guideRegion('work')).toBe('work');
    expect(guideRegion('diff')).toBe('work');
    expect(guideRegion('lesson-example')).toBe('dialog');
    expect(guideRegion('learn-sql')).toBe('page');
    expect(guideRegion('practice-hub')).toBe('page');
  });
});

describe('guide engine stays in the learnui chunk (Plan 6 U3)', () => {
  const SRC = import.meta.glob(['../src/guides.ts', '../src/ui/guide.ts'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
  it('imports only types from main modules', () => {
    expect(Object.keys(SRC)).toHaveLength(2);
    for (const [file, code] of Object.entries(SRC)) {
      const values = [...code.matchAll(/^\s*import\s+(?!type\b)[^'"]*?from\s+['"]([^'"]+)['"]/gm)].map((m) => m[1]);
      for (const spec of values) expect(spec, file).toMatch(/^(\.\.\/guides|\.\.\/i18n\/learn)$/);
    }
  });
});

describe('guide engine (ui/guide.ts)', () => {
  interface El { tag: string; attrs: Record<string, unknown>; children: unknown[] }
  interface Mark { o: { label: string; text: string; data: Record<string, string>; buttons: (El | null)[] }; closest: () => null; focus: () => void; isConnected: boolean; getAttribute: (k: string) => string }

  async function setup(opts: { knows?: boolean; stored?: unknown; chained?: boolean } = {}) {
    const { vi } = await import('vitest');
    vi.resetModules();
    let stored = opts.stored;
    const slot = { dataset: { guideSlot: 'drill-brief' }, offsetParent: {}, firstElementChild: null as Mark | null, replaceChildren(m?: Mark) { this.firstElementChild = m ?? null; } };
    const title = { offsetParent: {}, focus: vi.fn(), hasAttribute: () => true };
    const doc = { activeElement: undefined as unknown, querySelectorAll: (sel: string) => (sel.includes('tour-mark') ? [] : sel.includes('brief-title') ? [title] : [slot]), querySelector: () => slot.firstElementChild, addEventListener() {} };
    vi.stubGlobal('document', doc);
    vi.stubGlobal('requestAnimationFrame', () => 0);
    const g = await import('../src/ui/guide');
    const hooks: { refresh?: () => void; region?: () => string | undefined } = {};
    const deps = {
      h: (tag: string, attrs: Record<string, unknown> = {}, ...children: unknown[]): El => ({ tag, attrs, children }),
      announce: vi.fn(), getLang: () => 'en', locale: () => 'en-US',
      actions: { rerender: () => hooks.refresh?.() },
      readJson: () => stored, writeJson: (_k: string, v: unknown) => { stored = v; return true; },
      readTour: () => (opts.knows ? { step: 8, knows: true } : undefined),
      boonMark: (o: Mark['o']): Mark => ({ o, closest: () => null, focus: vi.fn(), isConnected: true, getAttribute: (k: string) => o.data[k] }),
      enterMark: () => undefined,
      escOwned: () => false, tourRegion: () => undefined, guideHooks: hooks, showPane: vi.fn(),
    };
    g.initGuides(deps as never);
    let page = true;
    g.offerGuides(() => (page ? [{ id: 'drill', steps: [{ slot: 'drill-brief', text: () => 'one' }, { slot: 'drill-brief', text: () => 'two' }] }] : []));
    if (opts.chained) g.offerGuides(() => [{ id: 'drill:open', steps: [{ slot: 'drill-brief', text: () => 'kind' }] }]);
    const mark = () => slot.firstElementChild;
    const click = (label: string) => (mark()!.o.buttons.find((b) => b?.children[0] === label)!.attrs.onclick as () => void)();
    const inMark = () => { doc.activeElement = { closest: () => mark() }; };
    return { g, hooks, mark, click, inMark, title, stored: () => stored, leave: () => { page = false; }, back: () => { page = true; } };
  }

  it('shows the offered guide by itself, steps through it and records it as seen', async () => {
    const s = await setup();
    expect(s.hooks.region!()).toBe('brief');
    s.hooks.refresh!();
    expect(s.mark()!.o.text).toBe('one');
    expect(s.mark()!.o.label).toBe('Boon shows the way · 1/2');
    s.click('Next');
    expect(s.mark()!.o.text).toBe('two');
    expect(s.stored()).toBeUndefined(); // nothing saved mid-way
    s.click('Done');
    expect(s.mark()).toBeNull();
    expect(s.stored()).toEqual({ seen: ['drill'], off: false });
    expect(s.hooks.region!()).toBeUndefined();
  });

  it('starts over at step 1 after the player left the page mid-way', async () => {
    const s = await setup();
    s.hooks.refresh!();
    s.click('Next');
    s.leave();
    s.hooks.refresh!();
    expect(s.mark()).toBeNull();
    s.back();
    s.hooks.refresh!();
    expect(s.mark()!.o.text).toBe('one');
  });

  it('"Skip all guides" (L318, was "Turn off guides") stops them; "Boon chỉ mình" replays even then, and for "I know SQL"', async () => {
    const s = await setup();
    s.hooks.refresh!();
    s.click('Skip all guides');
    expect(s.stored()).toEqual({ seen: ['drill'], off: true });
    expect(s.mark()).toBeNull();
    s.g.replayGuide('drill');
    expect(s.mark()!.o.text).toBe('one');
    const k = await setup({ knows: true });
    k.hooks.refresh!();
    expect(k.mark()).toBeNull();
    k.g.replayGuide('drill');
    expect(k.mark()!.o.text).toBe('one');
    k.click('Skip (Esc)');
    expect(k.stored()).toEqual({ seen: ['drill'], off: false });
  });

  it("keeps focus when the mark that held it goes: the next guide's mark, else the page title", async () => {
    const s = await setup({ chained: true });
    s.hooks.refresh!();
    s.click('Next');
    s.inMark();
    s.click('Done');
    expect(s.mark()!.o.text).toBe('kind'); // the drill kind's guide follows the desk's
    expect(s.mark()!.focus).toHaveBeenCalled();
    s.inMark();
    s.click('Skip (Esc)');
    expect(s.mark()).toBeNull();
    expect(s.title.focus).toHaveBeenCalled();
  });

  it('Done marks the `also` ids seen and runs `done` (G1: Lily cheers); Skip does not run it', async () => {
    const s = await setup();
    let cheers = 0;
    s.g.offerGuides(() => [{ id: 'module-intro', also: ['module:1'], done: () => cheers++, steps: [{ slot: 'drill-brief', text: () => 'm' }] }]);
    s.g.replayGuide('module-intro');
    s.click('Skip (Esc)');
    expect(cheers).toBe(0);
    s.g.replayGuide('module-intro');
    s.click('Done');
    expect(s.stored()).toEqual({ seen: ['module-intro', 'module:1'], off: false });
    expect(cheers).toBe(1);
  });

  it('an auto-shown mark never takes focus', async () => {
    const s = await setup();
    s.hooks.refresh!();
    expect(s.mark()!.focus).not.toHaveBeenCalled();
  });
});

describe('offeredIds (v8 §2.3, General area only)', () => {
  const base = { mode: 'story', diff: false };
  it('learning path pages', () => {
    expect(offeredIds({ ...base, route: 'learn' })).toEqual(['path']);
    expect(offeredIds({ ...base, route: 'learn', learn: 3 })).toEqual(['module-intro', 'module:3']);
    expect(offeredIds({ ...base, route: 'learn', learn: 'skill' })).toEqual(['skill']);
    expect(offeredIds({ ...base, route: 'learn', learn: 'adv' })).toEqual(['adv']);
    expect(offeredIds({ ...base, route: 'learn', learn: 'adv-ext' })).toEqual(['adv-ext']);
    expect(offeredIds({ ...base, route: 'practice' })).toEqual(['practice']);
  });
  it('the drill desk: the diff first, then the desk, then the kind', () => {
    expect(offeredIds({ route: 'play', mode: 'drill', drillKind: 'trap', diff: false })).toEqual(['drill', 'drill:trap']);
    expect(offeredIds({ route: 'play', mode: 'drill', drillKind: 'open', diff: true })).toEqual(['diff', 'drill', 'drill:open']);
    expect(offeredIds({ route: 'play', mode: 'practice', drillKind: 'open', diff: true })).toEqual(['diff', 'review']);
  });
  it('the lesson dialog from the General area hides the page guides', () => {
    expect(offeredIds({ ...base, route: 'learn', lesson: { diff: false } })).toEqual(['lesson']);
    expect(offeredIds({ ...base, route: 'play', mode: 'drill', drillKind: 'open', lesson: { diff: true } })).toEqual(['diff', 'lesson']);
  });
  it('nothing behind another modal (the welcome screen picks "SQL only" and opens the path behind it)', () => {
    expect(offeredIds({ ...base, route: 'learn', modal: true })).toEqual([]);
  });
  it('never in story, lane, sandbox, a promotion review, a warm-up, a domain page (Logistics, E-com, Finance: routes carry no domain) or on Home', () => {
    for (const mode of ['story', 'lane', 'sandbox', 'practice']) expect(offeredIds({ route: 'play', mode, diff: true })).toEqual([]);
    expect(offeredIds({ route: 'play', mode: 'story', drillKind: 'open', diff: false })).toEqual([]); // a stale kind outside drill/practice
    for (const route of ['home', 'overview', 'data', 'dashboard', 'map', undefined]) expect(offeredIds({ route, mode: 'drill', drillKind: 'open', diff: true })).toEqual([]);
  });
});

describe('guide slots (v8 §3.9: every slot a guide names is drawn by a page)', () => {
  const UI = import.meta.glob('../src/ui/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
  const SLOTS = ['learn-head', 'learn-sql', 'learn-adv', 'module-head', 'module-skill', 'skill-head', 'skill-card',
    'lesson-example', 'lesson-mistake', 'lesson-try', 'lesson-try-actions', 'lesson-diff', 'drill-brief', 'work', 'diff',
    'practice-review', 'practice-hub', 'adv-needs', 'adv-drills', 'adv-links'];
  const drawn = new Set(Object.values(UI).flatMap((code) => [...code.matchAll(/\b(?:guideSlot|slot|gslot)\('([a-z-]+)'\)/g)].map((m) => m[1])));
  it('each slot of the guide table has a placeholder in the page code', () => {
    for (const s of SLOTS) expect(drawn, s).toContain(s);
  });
  it('the guide list names no other slot', () => {
    const list = UI['../src/ui/guideList.ts'];
    const named = [...list.matchAll(/(?:step\(|slot: )'([a-z-]+)'/g)].map((m) => m[1]);
    expect(named.length).toBeGreaterThan(10);
    for (const s of named) expect(SLOTS, s).toContain(s);
    for (const x of ['example', 'mistake', 'try', 'try-actions']) expect(SLOTS).toContain(`lesson-${x}`); // built as `lesson-${x}`
  });
  it("main's ⋯ reset writes the same pref key (main never imports src/guides.ts; L318: the key lives in ui/coach.ts)", async () => {
    const main = (await import('../src/main.ts?raw')).default as string;
    expect((await import('../src/ui/coach')).GUIDES_PREF).toBe(GUIDES_KEY);
    expect(main).toContain('restoreGuides()');
    expect(main).not.toMatch(/from '\.\/guides'/);
  });
});
