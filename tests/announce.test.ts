// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import mainSrc from '../src/main.ts?raw';
import { announce, clearAnnounce, h } from '../src/ui/dom';

/** L314 (user feedback: a stale, Vietnamese #announce sentence stayed after a page change and in EN). */
describe('#announce', () => {
  it('clearAnnounce empties it and cancels a sentence still on its way', () => {
    vi.useFakeTimers();
    document.body.innerHTML = '<p id="announce" aria-live="polite"></p>';
    const el = document.getElementById('announce')!;
    announce('Đã chạy: 3 dòng');
    vi.advanceTimersByTime(60);
    expect(el.textContent).toBe('Đã chạy: 3 dòng');
    announce('pending');
    clearAnnounce();
    vi.advanceTimersByTime(60);
    expect(el.textContent).toBe('');
    vi.useRealTimers();
  });
  it('main.ts clears it on every route change and on both language switches', () => {
    expect(mainSrc).toMatch(/function showRoute[\s\S]{0,300}if \(!initial\) clearAnnounce\(\)/);
    expect(mainSrc.match(/setLang\([^)]*\)\.then\(\(\) => \{[^\n]*\n\s*clearAnnounce\(\)/g)).toHaveLength(2);
  });
});

describe('L320: form fields', () => {
  it('h() gives an input, select or textarea without id or name a name; its own id or name is kept', () => {
    for (const tag of ['input', 'select', 'textarea'] as const) expect(h(tag).getAttribute('name')).toBe(`cq-${tag}`);
    expect(h('input', { id: 'x' }).hasAttribute('name')).toBe(false);
    expect(h('input', { type: 'radio', name: 'g' }).getAttribute('name')).toBe('g');
    expect(h('div').hasAttribute('name')).toBe(false);
  });
});
