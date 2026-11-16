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

type PageKey = KeyLike & Pick<KeyboardEvent, 'defaultPrevented' | 'isComposing'> & { target: unknown };

/**
 * The page-level listener's whole decision. Skips keys the editor already handled (`defaultPrevented`), IME composition,
 * focus in a dialog or form field, a hidden workspace (Home route), and Submit while the promotion-review conclusion
 * form is open (the last step is already graded; only the form finishes the ticket).
 */
export function pageShortcutOf(e: PageKey, mac: boolean, at: { workspaceHidden: boolean; conclusionOpen: boolean }): Shortcut | undefined {
  if (e.defaultPrevented || e.isComposing || at.workspaceHidden) return undefined;
  const action = shortcutOf(e, mac);
  const target = e.target as { closest?: (sel: string) => unknown } | null;
  if (!action || target?.closest?.('dialog, input, textarea, select')) return undefined;
  return action === 'submit' && at.conclusionOpen ? undefined : action;
}

/**
 * Esc skips (or closes) the completion dock, unless something else already took it: CodeMirror closing its autocomplete
 * (`defaultPrevented`) or an open dialog (Esc closes the inbox there).
 */
export const stageEsc = (e: Pick<KeyboardEvent, 'key' | 'defaultPrevented'>, stageOpen: boolean, dialogOpen: boolean): boolean =>
  e.key === 'Escape' && !e.defaultPrevented && stageOpen && !dialogOpen;
