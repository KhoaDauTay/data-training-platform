// @vitest-environment jsdom
import html from '../index.html?raw';
import { describe, expect, it } from 'vitest';
import { loadTickets } from '../src/content';
import { emptySave } from '../src/save';
import { app } from '../src/state';
import { INBOX_SEEN_KEY, markInboxSeen, renderInbox, unseenCount } from '../src/ui/inbox';

/** L313 (user feedback: the Inbox badge still said 1 after opening and closing the Inbox). */
describe('Inbox badge', () => {
  it('counts open tasks not seen yet; closing the Inbox clears it; a new task raises it again', () => {
    expect(unseenCount(['a', 'b'], ['a'])).toBe(1);
    document.body.innerHTML = /<body[^>]*>([\s\S]*)<\/body>/.exec(html)![1];
    localStorage.clear();
    app.tickets = loadTickets('logistics');
    app.save = emptySave();
    const badge = () => document.querySelector('#inbox-btn [data-badge]')!;
    renderInbox();
    expect(badge().textContent).toBe('1');
    markInboxSeen(); // the dialog's close event (main.ts)
    renderInbox();
    expect(badge().textContent === '' || (badge() as HTMLElement).hidden).toBe(true);
    expect(JSON.parse(localStorage.getItem(INBOX_SEEN_KEY)!)).toEqual([app.tickets[0].id]);
    app.save.completed.push(app.tickets[0].id); // task 1 done: task 2 is new mail
    renderInbox();
    expect(badge().textContent).toBe('1');
  });
});
