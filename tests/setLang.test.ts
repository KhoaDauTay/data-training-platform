import { expect, it, vi } from 'vitest';

it('setLang: EN tải chậm không ghi đè VI được chọn sau đó', async () => {
  vi.stubGlobal('document', { querySelectorAll: () => [], documentElement: {} }); // applyStatic() only
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  vi.resetModules();
  vi.doMock('../src/i18n/en', async () => {
    const actual = await vi.importActual<typeof import('../src/i18n/en')>('../src/i18n/en');
    await gate;
    return actual;
  });
  const i18n = await import('../src/i18n');
  const toEn = i18n.setLang('en'); // EN chunk still loading
  await i18n.setLang('vi');
  release();
  await toEn;
  expect(i18n.getLang()).toBe('vi');
  vi.doUnmock('../src/i18n/en');
  vi.unstubAllGlobals();
});
