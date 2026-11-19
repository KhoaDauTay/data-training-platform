// @vitest-environment jsdom
// v17 I5 interview room UI (L144): the device pref, the routes, the Save guard and a full set + take-home driven through the
// lazy UI chunk with the real session functions: nothing reaches the Save (completed, drafts, graded, hintsUsed, bossStep,
// review, practice, xp), results land in the pref `cargo-query/interview` only.
import { beforeAll, describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';
import interviewYml from '../content/general/interview.yml?raw';
import { loadTickets } from '../src/content';
import { knownSkills } from '../src/home';
import { getLang, locale } from '../src/i18n';
import { IV_DICT, ivText, type IvKey } from '../src/i18n/interview';
import { buildInterview } from '../src/interview';
import { elapsed, INTERVIEW_KEY, parseInterviewPrefs, passedTakeHomes, setPresence, TEXT_MAX } from '../src/interviewPrefs';
import { drillHash, drillOfHash, hashOf, INTERVIEW_PAGE, isInterviewId, isInterviewPage, parseRoute, workspaceHash } from '../src/route';
import { emptySave, INTERVIEW_ID, parseSave, SAVE_VERSION, serializeSave, type Known } from '../src/save';
import {
  activeStep, activeTicket, framePrice, generalHash, hintsShown, interviewClosed, ivHooks, ivItemId, keepsWork, payFrame, readDraft, schemaOf, session, today,
  useHint, workKey, writeDraft, type InterviewRun,
} from '../src/session';
import { SKILLS } from '../src/progress';
import { actions, app } from '../src/state';
import { readJson, writeJson } from '../src/storage';
import { h, nodes, richText } from '../src/ui/dom';
import * as view from '../src/ui/interviewView';

const content = buildInterview(parseYaml(interviewYml));
const it_ = (k: IvKey, p?: Record<string, string | number>): string => ivText('vi', 'vi-VN', k, p);

describe('pref cargo-query/interview', () => {
  it('đọc lại đúng, bỏ dữ liệu hỏng, passedTakeHomes chỉ lấy bài đủ bước và có đoạn viết', () => {
    const p = parseInterviewPrefs({
      sets: { 'junior-1': { at: '2026-11-19', solved: 4, total: 5, ms: 61_000, timer: true }, bad: { at: 'x' }, 'mid-1': { at: '2026-11-19', solved: 6, total: 5, ms: 1, timer: false } },
      takeHomes: {
        'g-iv-th-1': { at: '2026-11-18', steps: 3, total: 3, text: 'Ba cửa hàng hụt.', checks: [0, 2, 2, 9], rubric: 4 },
        'g-iv-th-2': { at: '2026-11-19', steps: 2, total: 3, text: 'chưa xong', checks: [], rubric: 4 },
        'g-iv-th-3': { at: '2026-11-19', steps: 3, total: 3, text: '  ', checks: [], rubric: 4 },
      },
      live: { 'mid-1': { id: 'junior-1' }, 'junior-1': { id: 'junior-1', timer: false, start: 5, index: 2, step: 0, solved: ['g-iv-junior-1-1', 'x'], drafts: { 'g-iv-junior-1-3': 'SELECT 1', bad: 'y' }, passed: {}, hints: [], phase: 'work', text: '', checks: [] } },
    });
    expect(Object.keys(p.sets)).toEqual(['junior-1']);
    expect(p.takeHomes['g-iv-th-1'].checks).toEqual([0, 2]);
    expect(Object.keys(p.live)).toEqual(['junior-1']); // a run under another run's key is dropped
    expect(p.live['junior-1'].solved).toEqual(['g-iv-junior-1-1']);
    expect(p.live['junior-1'].drafts).toEqual({ 'g-iv-junior-1-3': 'SELECT 1' });
    expect(passedTakeHomes(p).map((x) => x.id)).toEqual(['g-iv-th-1']);
    for (const bad of [null, 1, 'x', [], { sets: [], live: { id: 'Bad Id' } }]) expect(parseInterviewPrefs(bad)).toEqual({ sets: {}, takeHomes: {}, live: {} });
  });
});

describe('FIX-1 (L147): đồng hồ dừng khi rời phòng', () => {
  const live = (o: Record<string, unknown> = {}) => parseInterviewPrefs({ live: { 'mid-1': {
    id: 'mid-1', timer: true, start: 1_000, index: 0, step: 0, solved: [], drafts: {}, passed: {}, hints: [], phase: 'work', text: '', checks: [], ...o,
  } } }).live['mid-1'];
  it('elapsed bỏ thời gian vắng mặt; pause lưu được qua pref; pref cũ không có away vẫn đọc', () => {
    const l = live();
    expect(l.away).toBeUndefined();
    expect(elapsed(l, 61_000)).toBe(60_000);
    expect(setPresence(l, false, 61_000)).toBe(true);
    expect(setPresence(l, false, 99_000)).toBe(false); // already away: the first stamp holds
    expect(elapsed(l, 3_600_000)).toBe(60_000); // an hour later, still one minute
    const stored = live({ start: l.start, away: l.away }); // a closed tab: the pause is in the pref
    expect(stored.away).toBe(61_000);
    expect(setPresence(stored, true, 3_600_000)).toBe(true);
    expect(stored.away).toBeUndefined();
    expect(elapsed(stored, 3_610_000)).toBe(70_000);
    expect(live({ away: 'x' }).away).toBeUndefined();
    expect(live({ away: 500 }).away).toBeUndefined(); // before the start: dropped
  });
});

describe('route', () => {
  it('#/learn/interview là trang Lộ trình; câu/bước g-iv-… dùng hash workspace của drill và tải lại vẫn giữ chỗ', () => {
    expect(parseRoute(INTERVIEW_PAGE)).toBe('learn');
    expect(isInterviewPage(INTERVIEW_PAGE)).toBe(true);
    expect(isInterviewPage('#/learn/sql/1')).toBe(false);
    for (const s of content.sets) for (const q of s.questions) {
      expect(drillOfHash(drillHash(q.id))).toBe(q.id);
      expect(isInterviewId(q.id)).toBe(true);
      expect(content.placeOf(q.id)?.run).toBe(s.id);
      expect(workspaceHash(drillHash(q.id), undefined)).toBe(drillHash(q.id));
      expect(parseRoute(drillHash(q.id))).toBe('play');
    }
    for (const th of content.takeHomes) {
      expect(content.ticketsOf(th.id)?.[0].steps).toHaveLength(th.steps.length);
      th.steps.forEach((s, i) => expect(content.placeOf(s.id)).toEqual({ run: th.id, kind: 'th', index: 0, step: i }));
    }
    expect(content.placeOf('g-iv-nope-1')).toBeUndefined();
    expect(content.ticketsOf('nope')).toBeUndefined();
  });
});

describe('Save không bao giờ giữ g-iv-…', () => {
  it('parseSave bỏ id phỏng vấn khỏi completed, nháp, graded, hintsUsed; không tính là đã học', () => {
    const tickets = loadTickets('logistics');
    const known: Known = { ticketIds: new Set(tickets.map((t) => t.id)), laneIds: new Set(), skills: new Set(SKILLS.map((s) => s.id)) };
    const raw = JSON.stringify({
      ...emptySave(), version: SAVE_VERSION,
      completed: ['g-where-1', 'g-iv-junior-1-1', 'g-iv-junior-1-2', 'g-iv-th-1'],
      drafts: { 'g-iv-junior-1-1#0': 'x', 'g-where-1#0': 'y' }, graded: { 'g-iv-th-1#2': 'z' }, hintsUsed: { 'g-iv-th-1': 2 },
    });
    const s = parseSave(raw, known);
    expect(s.completed).toEqual(['g-where-1']);
    expect(s.drafts).toEqual({ 'g-where-1#0': 'y' });
    expect(s.graded).toEqual({});
    expect(s.hintsUsed).toEqual({});
    expect(INTERVIEW_ID.test('g-where-1')).toBe(false);
    expect(knownSkills({ ...emptySave(), completed: ['g-iv-junior-1-1', 'g-iv-junior-1-2'] }, tickets, SKILLS.map((x) => x.id)).size).toBe(0);
  });
});

describe('chữ UI phòng phỏng vấn (src/i18n/interview.ts)', () => {
  it('đủ khóa hai thứ tiếng, placeholder khớp, EN khác VI và không dấu, không giọng game', () => {
    const ph = (s: string): string[] => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    expect(Object.keys(IV_DICT.en).sort()).toEqual(Object.keys(IV_DICT.vi).sort());
    for (const [k, v] of Object.entries(IV_DICT.vi)) {
      const e = IV_DICT.en[k as IvKey];
      expect([k, ph(e)]).toEqual([k, ph(v)]);
      expect([k, e]).not.toEqual([k, v]);
      expect([k, /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(e)]).toEqual([k, false]);
      expect(`${v} ${e}`).not.toMatch(/boss|sự cố|đợt sau|sắp có|coming soon|later batch/i);
    }
  });
});

describe('một bộ đề và một take-home qua UI: Save không đổi, kết quả chỉ ở pref', () => {
  const host = document.createElement('div');
  let left = 0;
  let editors = 0;
  const run = (): InterviewRun => {
    if (session.mode.kind !== 'interview') throw new Error('no run');
    return session.mode.run;
  };
  const button = (key: IvKey, p?: Record<string, string | number>): HTMLButtonElement =>
    [...host.querySelectorAll('button')].find((b) => b.textContent === it_(key, p))!;

  beforeAll(() => {
    document.body.append(host, Object.assign(document.createElement('div'), { id: 'announce' }));
    app.save = emptySave();
    localStorage.clear();
    actions.rerender = () => {
      if (session.mode.kind === 'interview') view.pane(host, session.mode.run);
    };
    view.initInterview({
      h, nodes, richText, announce: () => undefined, getLang, locale, app, actions, session, ivItemId, ivHooks, readDraft, today, readJson, writeJson, hashOf, drillHash,
      SKILLS, knownSkills, loadTickets, showPane: () => undefined, prefs: { key: INTERVIEW_KEY, parse: parseInterviewPrefs, textMax: TEXT_MAX, elapsed, setPresence },
      enter: (r) => { session.mode = { kind: 'interview', run: r }; actions.rerender(); },
      openEditor: () => void editors++,
      leave: () => { left++; session.mode = { kind: 'story' }; },
      startRun: (id, timer, fresh) => view.start(id, timer, fresh),
    }, content);
  });

  it('bộ đề junior-1, đồng hồ tắt: gợi ý miễn phí, câu đúng không vào completed, kết thúc ghi pref', () => {
    const before = serializeSave(app.save);
    view.start('junior-1', false, true);
    expect(activeTicket()?.id).toBe('g-iv-junior-1-1');
    expect(schemaOf(activeTicket())).toBe('lab');
    expect(keepsWork()).toBe(false);
    expect(generalHash()).toBe(drillHash('g-iv-junior-1-1'));
    expect(host.textContent).toContain(it_('iv.practiceMode'));
    // hints: the pane's own, free; the Save's hint and frame paths are no-ops in interview mode
    button('iv.hint').click();
    expect(host.querySelector('#iv-hint')?.textContent).toContain(content.sets[0].questions[0].hint.vi.replace(/`/g, ''));
    useHint('g-iv-junior-1-1');
    expect(hintsShown('g-iv-junior-1-1')).toBe(0);
    expect(framePrice(activeTicket()!)).toBe('free');
    payFrame(activeTicket()!);
    writeDraft('SELECT 1');
    expect(workKey()).toBe('interview#g-iv-junior-1-1');
    expect(readDraft()).toBe('SELECT 1');
    view.solved('SELECT 1');
    expect(run().solved).toEqual(['g-iv-junior-1-1']);
    expect(host.textContent).toContain(it_('iv.solved'));
    button('iv.next').click();
    expect(activeTicket()?.id).toBe('g-iv-junior-1-2');
    expect(location.hash).toBe(drillHash('g-iv-junior-1-2'));
    expect(readJson<{ live: Record<string, { index: number }> }>(INTERVIEW_KEY)?.live['junior-1'].index).toBe(1); // a reload resumes here
    button('iv.finish').click();
    expect(interviewClosed()).toBe(true);
    expect(host.textContent).toContain(it_('iv.result', { solved: 1, total: 5 }));
    const p = parseInterviewPrefs(readJson(INTERVIEW_KEY));
    expect(p.sets['junior-1']).toMatchObject({ solved: 1, total: 5, timer: false });
    expect(serializeSave(app.save)).toBe(before);
  });

  it('đồng hồ bật: không gợi ý, câu bẫy mất lời giải thích wrong:, tải lại mở đúng câu', () => {
    view.start('mid-1', true, true);
    expect(run().timer).toBe(true);
    expect(host.querySelector('#iv-clock')?.getAttribute('role')).toBe('timer');
    expect(host.textContent).toContain(it_('iv.noHint'));
    expect(button('iv.hint')).toBeUndefined();
    expect(run().tickets.every((t) => t.wrong === undefined)).toBe(true);
    view.reopen('g-iv-mid-1-3');
    expect(activeTicket()?.id).toBe('g-iv-mid-1-3');
    expect(run().timer).toBe(true); // the pref's run, not a new one
    // FIX-1: away from the room (another page, hidden tab) the clock stands still, stored in the pref; back = it goes on
    const start = run().start;
    view.presence(false);
    expect(parseInterviewPrefs(readJson(INTERVIEW_KEY)).live['mid-1'].away).toBe(run().away);
    run().away! -= 10 * 60_000; // left ten minutes ago
    view.presence(true);
    expect(run().away).toBeUndefined();
    expect(run().start).toBeGreaterThanOrEqual(start + 10 * 60_000);
    expect(host.querySelector('#iv-clock')?.textContent).not.toBe(it_('iv.timeUp'));
    // time up: a note, the run goes on, a right answer still counts, the result says the timer was on
    run().start = Date.now() - 26 * 60_000;
    view.pane(host, run());
    expect(host.querySelector('#iv-clock')?.textContent).toBe(it_('iv.timeUp'));
    writeDraft('SELECT 2');
    view.solved('SELECT 2');
    expect(run().solved).toEqual(['g-iv-mid-1-3']);
    button('iv.finish').click();
    expect(parseInterviewPrefs(readJson(INTERVIEW_KEY)).sets['mid-1']).toMatchObject({ solved: 1, total: 5, timer: true });
    // junior-1's finished run is still there: one live slot per set or take-home
    expect(parseInterviewPrefs(readJson(INTERVIEW_KEY)).live['junior-1']?.phase).toBe('done');
  });

  it('take-home: bước như đánh giá thăng tiến, đoạn viết, rubric tự chấm; tải lại không vượt bước đã tới', () => {
    const before = serializeSave(app.save);
    const th = content.takeHomes[0];
    view.start(th.id, false, true);
    expect(activeStep()).toBe(0);
    writeDraft('SELECT 1 AS a -- edited while Submit ran');
    view.stepSolved('SELECT 1 AS a'); // FIX-1: the graded SQL, not the editor's text
    expect(activeStep()).toBe(1);
    expect(readDraft()).toBe('SELECT 1 AS a'); // step 2 starts from the SQL that passed step 1
    expect(editors).toBeGreaterThan(0);
    view.reopen(th.steps[th.steps.length - 1].id); // a hash past the step reached
    expect(activeStep()).toBe(1);
    for (let i = activeStep(); i < th.steps.length - 1; i++) view.stepSolved('SELECT 1');
    view.solved('SELECT 1'); // the last step: the written conclusion
    expect(run().phase).toBe('write');
    expect(interviewClosed()).toBe(true);
    button('iv.toRubric').click();
    expect(host.textContent).toContain(it_('iv.empty'));
    const area = host.querySelector<HTMLTextAreaElement>('#iv-text')!;
    area.value = 'Ba cửa hàng hụt mục tiêu tháng 10.';
    area.dispatchEvent(new Event('input'));
    button('iv.toRubric').click();
    expect(run().phase).toBe('done');
    const boxes = host.querySelectorAll<HTMLInputElement>('input[type=checkbox]');
    expect(boxes).toHaveLength(th.rubric.length);
    boxes[0].click();
    boxes[2].click();
    const p = parseInterviewPrefs(readJson(INTERVIEW_KEY));
    expect(p.takeHomes[th.id]).toMatchObject({ steps: th.steps.length, total: th.steps.length, text: 'Ba cửa hàng hụt mục tiêu tháng 10.', checks: [0, 2], rubric: th.rubric.length });
    expect(passedTakeHomes(p).map((x) => x.id)).toEqual([th.id]);
    button('iv.toRoom').click();
    expect(left).toBe(1);
    expect(serializeSave(app.save)).toBe(before);
    expect(app.save.completed.some((id) => id.startsWith('g-iv-'))).toBe(false);
  });

  it('trang #/learn/interview: mọi bộ đề và take-home, nút Bắt đầu, công tắc đồng hồ tắt sẵn', () => {
    const page = view.listPage();
    for (const s of content.sets) expect(page.textContent).toContain(s.title.vi);
    for (const x of content.takeHomes) expect(page.textContent).toContain(x.title.vi);
    expect(page.querySelector<HTMLInputElement>('#iv-timer')?.checked).toBe(false);
  });
});
