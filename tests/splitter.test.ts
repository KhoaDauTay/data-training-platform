import { afterEach, describe, expect, it, vi } from 'vitest';

// v21 R21-U2: growPanel never overrides a panel height the player set, in this session or before.
type Fn = (e: unknown) => void;
function fakeEl() {
  const on = new Map<string, Fn>();
  const props = new Map<string, string>();
  return {
    on, props,
    style: { setProperty: (k: string, v: string) => void props.set(k, v) },
    setAttribute: () => {},
    addEventListener: (k: string, f: Fn) => void on.set(k, f),
    getBoundingClientRect: () => ({ left: 0, right: 1000, top: 0, bottom: 1000, width: 1000, height: 1000 }),
  };
}
async function boot(saved?: unknown) {
  vi.resetModules();
  const data = new Map<string, string>();
  if (saved !== undefined) data.set('cargo-query/layout', JSON.stringify(saved));
  vi.stubGlobal('window', { localStorage: { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) } });
  const m = await import('../src/ui/splitter');
  const shell = fakeEl();
  const col = fakeEl();
  const row = fakeEl();
  m.initLayout(shell as unknown as HTMLElement, { col: col as unknown as HTMLElement, row: row as unknown as HTMLElement });
  const key = (el: ReturnType<typeof fakeEl>, k: string) => el.on.get('keydown')!({ key: k, preventDefault: () => {} });
  const stored = () => JSON.parse(data.get('cargo-query/layout') ?? 'null') as unknown;
  return { m, shell, col, row, key, stored };
}
afterEach(() => vi.unstubAllGlobals());

describe('splitter: growPanel', () => {
  it('nâng panel mặc định lên 55 % một lần, không lưu', async () => {
    const { m, shell, stored } = await boot();
    m.growPanel();
    expect(shell.props.get('--row')).toBe('55%');
    expect(stored()).toBeNull();
  });
  it('không ghi đè chiều cao vừa kéo trong phiên (30 %)', async () => {
    const { m, shell, row, key, stored } = await boot();
    for (let i = 0; i < 3; i++) key(row, 'ArrowDown');
    expect(shell.props.get('--row')).toBe('30%');
    m.growPanel();
    expect(shell.props.get('--row')).toBe('30%');
    expect(stored()).toEqual({ row: 30 });
  });
  it('kéo cột không lưu chiều cao, nên phiên sau vẫn nâng được', async () => {
    const first = await boot();
    first.key(first.col, 'ArrowRight');
    expect(first.stored()).toEqual({ col: 45 });
    const next = await boot(first.stored());
    next.m.growPanel();
    expect(next.shell.props.get('--row')).toBe('55%');
    expect(next.shell.props.get('--col')).toBe('45%');
  });
  it('chiều cao đã lưu từ trước thì giữ nguyên', async () => {
    const { m, shell } = await boot({ col: 40, row: 30 });
    m.growPanel();
    expect(shell.props.get('--row')).toBe('30%');
  });
});
