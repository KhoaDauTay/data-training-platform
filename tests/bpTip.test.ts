// @vitest-environment jsdom
// BP-LINT (L274–L275): src/ui/bpTip.ts end to end with the real parser and a fake DB: the tip shows after a lintable run,
// stays silent where §5.2/§5.3 say so, is said once per task, and "Stop this tip" writes the device pref.
import { describe, expect, it, vi } from 'vitest';
import { mountBp, parseBpTips } from '../src/ui/bpTip';
import { h, richText } from '../src/ui/dom';

function setup(o: { review?: Record<string, unknown>; completed?: string[] } = {}) {
  const store = new Map<string, string>();
  const app = { lastRun: undefined as unknown, save: { completed: o.completed ?? [], lanes: [], review: o.review ?? { a: {}, b: {}, c: {} } }, tickets: [] };
  const feedback = h('div', { role: 'status' });
  const detail = h('div');
  h('div', {}, h('div', {}), feedback, detail);
  const wd = { db: { run: vi.fn(async () => ({ rows: [] })) }, onRun: () => undefined };
  let here: [unknown, number] = [undefined, 0];
  const announce = vi.fn();
  mountBp(detail, wd as never, () => here as never, {
    h, richText, announce, getLang: () => 'en', app: app as never, keeps: () => true, region: () => undefined,
    store: () => ({ getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) }),
  });
  const tip = detail.nextElementSibling as HTMLElement;
  const run = async (sql: string, tk?: { id: string; beat?: string }) => {
    here = [tk && { grants: [], steps: [{ solution: '' }], ...tk }, 0];
    app.lastRun = { key: tk ? `${tk.id}#0` : '', sql, offset: 0, result: { rows: [] } };
    wd.onRun();
    await new Promise((r) => setTimeout(r, 150)); // the check waits a task, then parses
  };
  return { tip, run, store, announce, app, feedback };
}

describe('bpTip', () => {
  it('Sandbox: LIMIT không ORDER BY → Boon nhắc Q10; "Stop this tip" tắt luật', async () => {
    const s = setup();
    await s.run('SELECT id FROM orders LIMIT 5');
    expect(s.tip.hidden).toBe(false);
    expect(s.tip.textContent).toContain('LIMIT');
    expect(s.tip.textContent).toContain('Q10');
    (([...s.tip.querySelectorAll('button')].find((b) => b.textContent === 'Stop this tip'))!).click();
    expect(parseBpTips(s.store.get('cargo-query/bp-tips')).mute).toEqual(['q10']);
    expect(s.tip.hidden).toBe(true);
    await s.run('SELECT id FROM customers LIMIT 3');
    expect(s.tip.hidden).toBe(true);
  });

  it('việc đã đạt: nhắc một lần, rồi im; promotion review và việc chưa đạt: im', async () => {
    const s = setup({ completed: ['ch2-03', 'ch2-05'] });
    await s.run('SELECT id FROM orders LIMIT 5', { id: 'ch2-03' });
    expect(s.tip.hidden).toBe(false);
    expect(parseBpTips(s.store.get('cargo-query/bp-tips')).seen).toEqual(['q10@ch2-03']);
    await s.run('SELECT id FROM orders LIMIT 5', { id: 'ch2-03' });
    expect(s.tip.hidden).toBe(true);
    await s.run('SELECT id FROM orders LIMIT 5', { id: 'ch2-05', beat: 'boss' });
    expect(s.tip.hidden).toBe(true);
    await s.run('SELECT id FROM orders LIMIT 5', { id: 'ch2-04' });
    expect(s.tip.hidden).toBe(true);
  });

  it('người mới chỉ nghe Q01/A05; sau một nộp sai thì im', async () => {
    const s = setup({ review: {} });
    await s.run('SELECT id FROM orders LIMIT 5');
    expect(s.tip.hidden).toBe(true);
    await s.run('SELECT id FROM orders WHERE email = NULL');
    expect(s.tip.textContent).toContain('IS NULL');
    s.feedback.className = 'mt-2 bg-bad-soft';
    await s.run('SELECT now()');
    expect(s.tip.hidden).toBe(true);
  });
});
