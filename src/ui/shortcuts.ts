export type Shortcut = 'run' | 'submit';
type KeyLike = Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>;

/**
 * Mod+Enter → run, Mod+Shift+Enter → submit, with Mod = ⌘ on macOS and Ctrl elsewhere (same as CodeMirror's `Mod`).
 * Used by the page-level listener, so the shortcuts the buttons advertise also work when focus is outside the editor.
 */
export function shortcutOf(e: KeyLike, mac: boolean): Shortcut | undefined {
  if (e.key !== 'Enter' || e.altKey || (mac ? !e.metaKey || e.ctrlKey : !e.ctrlKey || e.metaKey)) return undefined;
  return e.shiftKey ? 'submit' : 'run';
}
