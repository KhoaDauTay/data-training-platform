// Finance tickets of chapters 5+ (frontmatter JSON, V22-E) (v20, L185): the second half of the Finance content, its own lazy chunk
// (budget group `finlate`) so the `fin` chunk stays under its ceiling. Only src/content.ts imports it, beside src/finSources.ts.
import type { TicketSource } from './tickets';

export const ticketSources = import.meta.glob<TicketSource>('../content/domains/fin/tickets/ch[5-9]/*.md', { query: '?fm', import: 'default', eager: true });
