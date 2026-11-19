// @vitest-environment jsdom
// FIX-1 (L147): a reload on a drill (#/learn/play/<id>) builds the workspace editor once, for the drill. Before, the story's
// editor was built first and the drill's replaced it a moment later, dropping what the player had typed meanwhile.
import { beforeAll, describe, expect, it } from 'vitest';
import { session } from '../src/session';
import { boot, EmptyWorker, wait } from './axeHarness';

let first: Element | null = null;
beforeAll(async () => {
  history.replaceState(null, '', '#/learn/play/g-where-1');
  await boot({ worker: EmptyWorker, storage: { 'cargo-query/domain': JSON.stringify('general'), 'cargo-query/coach-done': 'true' } });
  first = document.querySelector('#work .cm-editor');
});

describe('reload on a drill hash (FIX-1)', () => {
  it('the drill is open when boot ends, and its editor is never rebuilt', async () => {
    expect(session.mode.kind).toBe('drill');
    expect(first).not.toBeNull();
    await wait(1500); // lab "seeds", the router shows the page, columns load
    expect(location.hash).toBe('#/learn/play/g-where-1');
    expect(session.mode.kind).toBe('drill');
    expect(document.querySelector('#work .cm-editor')).toBe(first);
    expect(document.getElementById('brief-title')?.textContent).toMatch(/WHERE/);
  });
});
