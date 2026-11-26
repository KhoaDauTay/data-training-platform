// @vitest-environment jsdom
// v47 S3 (L910–L913): the welcome's goal step over the real app (first visit, nothing remembered), the entry check step,
// an Engine goal's landing, Home's suggestion from the goal and the ⋯ replay (records the goal only).
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { boot, byId, EmptyWorker, openModal, problems, settle } from './axeHarness';

const w = (x: string): HTMLElement | null => document.querySelector<HTMLElement>(`#welcome-dialog [data-w="${x}"]`);
const title = (): string => byId('welcome-title').textContent ?? '';

beforeAll(async () => {
  location.hash = '#/';
  await boot({ worker: EmptyWorker });
});

describe('welcome goal step (S3)', () => {
  it('language → goal: four cards, Next stays (the analyst default), no axe problems', async () => {
    await settle();
    expect(openModal()?.id).toBe('welcome-dialog');
    w('next')!.click();
    expect(title()).toBe('Bạn muốn học gì?');
    expect(['goal-analyst', 'goal-sql', 'goal-internals', 'goal-engineer'].every((x) => w(x))).toBe(true);
    expect(w('next')).not.toBeNull();
    expect(byId('welcome-step').textContent).toBe('Bước 2/4');
    expect(await problems()).toEqual([]);
  });

  it('"knows SQL" adds the entry check step; Skip goes on to the domain step; analyst drops the check again', async () => {
    w('goal-sql')!.click();
    expect(title()).toBe('Kiểm tra đầu vào');
    expect(w('check')).not.toBeNull();
    expect(byId('welcome-step').textContent).toBe('Bước 3/5');
    expect(await problems()).toEqual([]);
    w('skip')!.click();
    expect(w('pick-logistics')).not.toBeNull(); // the domain step (D10/O1: nothing picked yet)
    w('back')!.click();
    w('back')!.click();
    expect(w('goal-sql')!.getAttribute('aria-pressed')).toBe('true');
    w('goal-analyst')!.click();
    expect(w('pick-logistics')).not.toBeNull();
    expect(byId('welcome-step').textContent).toBe('Bước 3/4');
    expect(localStorage.getItem('cargo-query/goal-intent')).toBe('"analyst"');
    w('back')!.click();
  });

  it('an Engine goal closes the dialog on its track, as "SQL only" (no domain, no tour), and Home suggests it', async () => {
    w('goal-internals')!.click();
    await settle();
    expect(openModal()).toBeUndefined();
    expect(location.hash).toBe('#/engine/postgres');
    expect(localStorage.getItem('cargo-query/domain')).toBe('"general"');
    expect(localStorage.getItem('cargo-query/coach-done')).toBe('true');
    expect(localStorage.getItem('cargo-query/goal-intent')).toBe('"internals"');
    location.hash = '#/';
    await settle();
    const resume = document.querySelector('#home [aria-labelledby="resume-title"]')!;
    expect(resume.textContent).toContain('PostgreSQL');
    expect(resume.querySelector('a')!.getAttribute('href')).toBe('#/engine/postgres');
    expect(resume.textContent).not.toMatch(/Logistics|Tiên Sa/); // L82: no domain on the General side
  });

  it('the ⋯ replay shows the goal step with the current goal and only records a new one', async () => {
    byId('replay-btn').click();
    w('next')!.click();
    expect(title()).toBe('Bạn muốn học gì?');
    expect(w('goal-internals')!.getAttribute('aria-pressed')).toBe('true');
    w('goal-engineer')!.click();
    expect(openModal()?.id).toBe('welcome-dialog'); // still open: the loop step
    expect(byId('welcome-step').textContent).toBe('Bước 3/4');
    expect(location.hash).toBe('#/');
    expect(localStorage.getItem('cargo-query/goal-intent')).toBe('"engineer"');
    openModal()!.close();
    await settle();
    const resume = document.querySelector('#home [aria-labelledby="resume-title"]')!;
    expect(resume.querySelector('a[href="#/engine/stack"]')).not.toBeNull();
    expect(resume.querySelector('a[data-resume="design"]')!.getAttribute('href')).toBe('#/engine/design');
  });

  it('"Take the entry check" lands on the learning path as "knows SQL" and starts the check run there', async () => {
    (await import('../src/ui/welcome')).openWelcome(false); // the same first-run steps (the domain is known now)
    w('next')!.click();
    w('goal-sql')!.click();
    w('check')!.click();
    expect(openModal()).toBeUndefined();
    expect(location.hash).toBe('#/learn');
    expect(JSON.parse(localStorage.getItem('cargo-query/tour')!)).toMatchObject({ knows: true }); // not gated: the #/learn card stays
    await vi.waitFor(() => expect(location.hash).toBe('#/learn/play'), { timeout: 20_000 }); // the placement run (lab seeded empty)
  });
});
