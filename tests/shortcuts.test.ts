import { describe, expect, it } from 'vitest';
import { pageShortcutOf, shortcutOf } from '../src/ui/shortcuts';

const key = (mods: Partial<Record<'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey', boolean>>, k = 'Enter') =>
  ({ key: k, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...mods });

describe('phím tắt Chạy / Nộp ngoài editor', () => {
  it('Windows/Linux: Ctrl+Enter chạy, Ctrl+Shift+Enter nộp', () => {
    expect(shortcutOf(key({ ctrlKey: true }), false)).toBe('run');
    expect(shortcutOf(key({ ctrlKey: true, shiftKey: true }), false)).toBe('submit');
  });

  it('macOS: ⌘ thay cho Ctrl', () => {
    expect(shortcutOf(key({ metaKey: true }), true)).toBe('run');
    expect(shortcutOf(key({ metaKey: true, shiftKey: true }), true)).toBe('submit');
    expect(shortcutOf(key({ ctrlKey: true }), true)).toBeUndefined();
  });

  it('bỏ qua phím khác, Alt, hoặc thiếu Mod', () => {
    expect(shortcutOf(key({}), false)).toBeUndefined();
    expect(shortcutOf(key({ shiftKey: true }), false)).toBeUndefined();
    expect(shortcutOf(key({ ctrlKey: true, altKey: true }), false)).toBeUndefined();
    expect(shortcutOf(key({ ctrlKey: true, metaKey: true }), false)).toBeUndefined();
    expect(shortcutOf(key({ ctrlKey: true }, 'a'), false)).toBeUndefined();
  });
});

describe('bộ nghe phím tắt cấp trang', () => {
  /** A fake target: `closest(sel)` matches when one of `inside` is in the selector list. */
  const at = (...inside: string[]) => ({ closest: (sel: string) => (sel.split(/,\s*/).some((s) => inside.includes(s)) ? {} : null) });
  const ev = (mods: Parameters<typeof key>[0], extra: Partial<{ defaultPrevented: boolean; isComposing: boolean; target: unknown }> = {}) =>
    ({ ...key(mods), defaultPrevented: false, isComposing: false, target: at('body'), ...extra });
  const ok = { workspaceHidden: false, conclusionOpen: false };
  const RUN = { ctrlKey: true };
  const SUBMIT = { ctrlKey: true, shiftKey: true };

  it('ngoài editor: Ctrl+Enter chạy, Ctrl+Shift+Enter nộp', () => {
    expect(pageShortcutOf(ev(RUN), false, ok)).toBe('run');
    expect(pageShortcutOf(ev(SUBMIT), false, ok)).toBe('submit');
  });

  it('bỏ qua phím editor đã xử lý (defaultPrevented) và lúc đang gõ bộ gõ (isComposing)', () => {
    expect(pageShortcutOf(ev(RUN, { defaultPrevented: true }), false, ok)).toBeUndefined();
    expect(pageShortcutOf(ev(SUBMIT, { isComposing: true }), false, ok)).toBeUndefined();
  });

  it('bỏ qua khi focus trong dialog, input, textarea, select', () => {
    for (const where of ['dialog', 'input', 'textarea', 'select']) {
      expect(pageShortcutOf(ev(RUN, { target: at(where) }), false, ok), where).toBeUndefined();
      expect(pageShortcutOf(ev(SUBMIT, { target: at(where) }), false, ok), where).toBeUndefined();
    }
    expect(pageShortcutOf(ev(RUN, { target: null }), false, ok)).toBe('run'); // e.g. the window itself
  });

  it('màn làm bài đang ẩn (Trang chủ): không chạy, không nộp', () => {
    const home = { workspaceHidden: true, conclusionOpen: false };
    expect(pageShortcutOf(ev(RUN), false, home)).toBeUndefined();
    expect(pageShortcutOf(ev(SUBMIT), false, home)).toBeUndefined();
  });

  it('đang hiện form kết luận đánh giá thăng tiến: Nộp bị bỏ qua, Chạy vẫn được', () => {
    const concl = { workspaceHidden: false, conclusionOpen: true };
    expect(pageShortcutOf(ev(SUBMIT), false, concl)).toBeUndefined();
    expect(pageShortcutOf(ev(RUN), false, concl)).toBe('run');
  });
});
