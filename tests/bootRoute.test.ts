// @vitest-environment jsdom
import html from '../index.html?raw';
import { describe, expect, it } from 'vitest';

/** L309 (feedback #13, CLS): index.html marks Home/#/me before main.ts, so the 64 px rail is never drawn and then removed. */
const script = /<!-- L309[\s\S]*?<script>([\s\S]*?)<\/script>/.exec(html)![1];
const run = (hash: string, saved?: string): string | undefined => {
  localStorage.clear();
  if (saved) localStorage.setItem('cargo-query/route', JSON.stringify(saved));
  history.replaceState(null, '', `/${hash}`);
  delete document.body.dataset.route;
  new Function(script)();
  return document.body.dataset.route;
};

describe('boot route mark', () => {
  it('home and me get their mark; every other page keeps the rail (no mark)', () => {
    expect(run('')).toBe('home');
    expect(run('#/')).toBe('home');
    expect(run('#/me')).toBe('me');
    expect(run('', 'me')).toBe('me');
    expect(run('', 'play')).toBeUndefined();
    expect(run('#/d/logistics/play')).toBeUndefined();
    expect(run('#/learn')).toBeUndefined();
    expect(document.body.dataset.side).toBe('rail');
  });
});
