// @vitest-environment jsdom
// ENG-CORE (L220): the lesson viewer in the real app with the three sample lessons (tests/fixtures/engine) standing in for the
// Postgres content chunk: axe on each lesson page, then a quiz lesson answered until its id is in save.completed.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { boot, byId, EmptyWorker, problems, settle, visit } from './axeHarness';
import { app } from '../src/state';

vi.mock('../src/engineSources', () => ({
  meta: import.meta.glob('./fixtures/engine/*/L*/*.md', { query: '?fm&meta=id,engine,level,module,title,title_en,kind,minutes,requires,runtime,viz', import: 'default', eager: true }),
  full: import.meta.glob('./fixtures/engine/*/L*/*.md', { query: '?fm', import: 'default' }),
  modules: import.meta.glob('./fixtures/engine/*/modules.yml', { import: 'default', eager: true }),
}));

beforeAll(() => boot({ worker: EmptyWorker, storage: { 'cargo-query/coach-done': 'true', 'cargo-query/domain': '"logistics"' } }));

const LESSONS = ['e-pg-l1-01', 'e-pg-l1-02', 'e-pg-l1-03', 'e-pg-l1-04', 'e-pg-l1-05'].map((id) => `#/engine/postgres/L1/${id}`);

describe('Database Engine lesson pages (fixtures)', () => {
  it.each(LESSONS)('axe: %s', async (hash) => {
    await visit(hash);
    expect(byId('engine-page')?.dataset.lesson).toBe(hash.split('/').pop());
    // L280: the lesson title is the page's h1, under the trail Engine › PostgreSQL › L1
    expect(byId('home-title')?.textContent).not.toBe('Cơ sở dữ liệu');
    expect([...document.querySelectorAll('#home nav[aria-label="Đường dẫn"] a')].map((a) => a.getAttribute('href'))).toEqual(['#/engine', '#/engine/postgres', '#/engine/postgres/L1']);
    expect(await problems()).toEqual([]);
  });

  it.each(['#/engine', '#/engine/postgres', '#/engine/postgres/L1'])('L280 axe: %s', async (hash) => {
    await visit(hash);
    expect(byId('engine-page')).not.toBeNull();
    expect(await problems()).toEqual([]);
  });

  it('quiz + predict answered right → lesson completed with its XP, once', async () => {
    await visit('#/engine/postgres/L1/e-pg-l1-03');
    const xp = app.save.xp;
    const answer = async (part: string, value: number): Promise<void> => {
      document.querySelector<HTMLInputElement>(`[data-ek="e-pg-l1-03-${part}-${value}"]`)!.click();
      document.querySelector<HTMLElement>(`[data-ek="e-pg-l1-03-${part}-check"]`)!.click();
      await new Promise((r) => setTimeout(r, 20));
    };
    await answer('q0', 0); // wrong
    expect(app.save.completed).not.toContain('e-pg-l1-03');
    await answer('p', 1);
    await answer('q0', 1);
    expect(app.save.completed).not.toContain('e-pg-l1-03');
    await answer('q1', 0);
    expect(app.save.completed).toContain('e-pg-l1-03');
    expect(app.save.xp).toBe(xp + 5);
    await answer('q1', 0);
    expect(app.save.completed.filter((x) => x === 'e-pg-l1-03')).toHaveLength(1);
  });

  // v23 (L299): further reading reads as titles (the URL stays the href); one main Submit per lab: the first step not passed.
  it('sources are titled links; only the current lab step Submit is the main button', async () => {
    await visit('#/engine/postgres/L1/e-pg-l1-02');
    const links = [...document.querySelectorAll<HTMLAnchorElement>('#e-pg-l1-02-src ~ ul a')];
    expect(links.map((a) => a.textContent)).toEqual(['PostgreSQL · Infoschema columns (mở trong tab mới)', 'PostgreSQL · Datatype numeric (mở trong tab mới)']);
    for (const a of links) expect([a.target, a.rel, a.title === a.href, !!a.querySelector('svg')]).toEqual(['_blank', 'noopener noreferrer', true, true]);
    expect(document.querySelector('[data-ek="e-pg-l1-02-s0-submit"]')!.classList.contains('bg-accent')).toBe(true);
    // F13 (L480): a later step has no editor and no Submit until it is reached or opened
    expect(document.querySelector('[data-ek="e-pg-l1-02-s1-submit"]')).toBeNull();
    document.querySelector<HTMLElement>('[data-ek="e-pg-l1-02-s1-open"]')!.click();
    expect(document.querySelector('[data-ek="e-pg-l1-02-s1-code"]')).not.toBeNull();
    expect(document.querySelector('[data-ek="e-pg-l1-02-s1-submit"]')!.classList.contains('bg-accent')).toBe(false);
  });

  it('sourceTitle: AWS camelCase, MediaWiki anchors, a bad escape never throws', async () => {
    const { sourceTitle } = await import('../src/ui/engineView');
    expect(sourceTitle('https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.Partitions.html')).toBe('DynamoDB · How It Works Partitions');
    expect(sourceTitle('https://wiki.postgresql.org/wiki/Don%27t_Do_This#Don.27t_use_money')).toBe("PostgreSQL Wiki · Don't Do This › Don't use money");
    expect(sourceTitle('https://example.org/a%E0%A4%A')).toBe('example.org · A%E0%A4%A');
    expect(sourceTitle('https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-query-scan.html')).toBe('DynamoDB · Best practices: query scan');
    // v35 R1 (E09): the SaaS Lens is not DynamoDB
    expect(sourceTitle('https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/silo-pool-and-bridge-models.html')).toBe('AWS SaaS Lens · Silo pool and bridge models');
    // v38 (L582): a content title replaces the slug; the site stays in front
    expect(sourceTitle('https://www.postgresql.org/docs/18/sql-createview.html', 'CREATE VIEW')).toBe('PostgreSQL · CREATE VIEW');
  });

  it('a concept lesson is completed by its button', async () => {
    await visit('#/engine/postgres/L1/e-pg-l1-01');
    document.querySelector<HTMLElement>('[data-ek="e-pg-l1-01-done"]')!.click();
    expect(app.save.completed).toContain('e-pg-l1-01');
  });

  // v23 PRED (L256): "Xem thật" grades any pick, opens the result card, records only the first pick (device pref).
  it('predict with a real plan: wrong guess → result card, first pick kept; a new pick re-grades', async () => {
    await visit('#/engine/postgres/L1/e-pg-l1-04');
    const ek = (k: string) => document.querySelector<HTMLElement>(`[data-ek="e-pg-l1-04-${k}"]`)!;
    const status = () => ek('p-check').parentElement!.querySelector('[role=status]')!;
    ek('p-check').click();
    expect(status().textContent).not.toBe(''); // nothing picked yet: asks for a pick
    expect(ek('plan')).toBeNull();
    ek('p-0').click(); // wrong
    ek('p-check').click();
    await vi.waitFor(() => expect(ek('plan')).not.toBeNull());
    expect(status().classList.contains('bad')).toBe(true);
    expect((ek('p-check') as HTMLButtonElement).disabled).toBe(true);
    expect(ek('p-check').className).toContain('disabled:bg-code'); // review v23: a spent "Xem thật" no longer looks like the main button
    expect(JSON.parse(localStorage.getItem('cargo-query/engine-first')!)).toMatchObject({ 'e-pg-l1-04': 0 });
    ek('p-1').click(); // guess again: graded at once
    await vi.waitFor(() => expect(status().classList.contains('good')).toBe(true));
    expect(JSON.parse(localStorage.getItem('cargo-query/engine-first')!)['e-pg-l1-04']).toBe(0);
    await settle();
    expect(await problems()).toEqual([]);
  });

  // v23 CAP (L257): step bar, "Chấm bằng", the gated before/after plans, then the finish card.
  it('capstone: step bar + checklist + plans gate, and the finish card once completed', async () => {
    await visit('#/engine/postgres/L1/e-pg-l1-05', () => expect(document.querySelector('[data-cap-bar]')).not.toBeNull());
    const bar = document.querySelector('[data-cap-bar]')!;
    expect(bar.querySelectorAll('li')).toHaveLength(2);
    expect(bar.querySelector('li[aria-current=step]')?.textContent).toContain('Đếm lượt xem');
    expect(document.querySelector('[data-step$="-s0"]')!.className).toContain('ring-accent');
    expect(document.querySelector('[data-ek="e-pg-l1-05-plans"]')).toBeNull(); // gated until the index step passes
    // review v23: the closing questions come after the lab, as the capstone's text says ("… then N questions")
    const lab = byId('e-pg-l1-05-lab')!.closest('section')!, quiz = byId('e-pg-l1-05-quiz')!.closest('section')!;
    expect(lab.compareDocumentPosition(quiz) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // review v23 P3: a step not passed yet is a bullet in "Chấm bằng", not a radio-like ring
    expect(document.querySelectorAll('[aria-labelledby="e-pg-l1-05-graded"] [data-todo]')).toHaveLength(2);
    expect(document.querySelector('[aria-labelledby="e-pg-l1-05-graded"] .ring-2')).toBeNull();
    expect(await problems()).toEqual([]);
    app.save.completed.push('e-pg-l1-05');
    location.hash = '#/engine/postgres/L1/e-pg-l1-01';
    await visit('#/engine/postgres/L1/e-pg-l1-05', () => expect(document.querySelector('[data-cap-done]')).not.toBeNull());
    expect(document.querySelector('[data-cap-done] svg[data-mascot=lily]')).not.toBeNull();
    // review v23 P3: the finish card comes after the closing questions (the capstone's last part)
    const done = document.querySelector('[data-cap-done]')!, closing = byId('e-pg-l1-05-quiz')!.closest('section')!;
    expect(closing.compareDocumentPosition(done) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(document.querySelector('[data-ek="e-pg-l1-05-plans"]')).not.toBeNull(); // done in an earlier visit: the plans open
    expect(await problems()).toEqual([]);
  });
});

