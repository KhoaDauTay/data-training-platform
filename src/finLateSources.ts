// Finance tickets of chapters 5+ as raw text (v20, L185): the second half of the Finance content, its own lazy chunk
// (budget group `finlate`) so the `fin` chunk stays under its ceiling. Only src/content.ts imports it, beside src/finSources.ts.
export const ticketSources = import.meta.glob<string>('../content/domains/fin/tickets/ch[5-9]/*.md', { query: '?raw', import: 'default', eager: true });
