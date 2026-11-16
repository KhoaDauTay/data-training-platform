import { describe, expect, it } from 'vitest';
import { shortcutOf } from '../src/ui/shortcuts';

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
