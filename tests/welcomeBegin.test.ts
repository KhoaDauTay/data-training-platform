// @vitest-environment jsdom
import html from '../index.html?raw';
import { describe, expect, it } from 'vitest';
import { loadTickets } from '../src/content';
import { emptySave } from '../src/save';
import { app } from '../src/state';
import { openWelcome, relabelWelcome } from '../src/ui/welcome';

/** L319 (feedback #12: the step-3 button could not be clicked while the database downloaded). */
describe('welcome dialog during the download', () => {
  it('a download tick keeps the same Begin button (a click spans mousedown → mouseup) and moves the MB bar', () => {
    document.body.innerHTML = /<body[^>]*>([\s\S]*)<\/body>/.exec(html)![1];
    const d = document.getElementById('welcome-dialog') as HTMLDialogElement;
    d.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', ''); };
    app.tickets = loadTickets('logistics');
    app.save = emptySave();
    app.dbStatus = 'loading';
    openWelcome(false);
    (d.querySelector('[data-w="next"]') as HTMLButtonElement).click(); // lang → goal
    (d.querySelector('[data-w="next"]') as HTMLButtonElement).click(); // goal skipped (v47 S3: the analyst default) → start
    const begin = d.querySelector('[data-w="begin"]');
    expect(begin).not.toBeNull();
    for (const loaded of [1e6, 2e6, 3e6]) {
      app.loadProgress = { loaded, total: 8e6 };
      relabelWelcome();
    }
    expect(d.querySelector('[data-w="begin"]')).toBe(begin);
    const bar = d.querySelector('progress')!;
    expect(bar.hidden).toBe(false);
    expect(bar.value).toBe(3e6);
    expect(d.textContent).toMatch(/3[.,]0 MB|3 MB/);
  });
});
