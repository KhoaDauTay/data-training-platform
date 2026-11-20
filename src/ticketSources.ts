// Ticket files of chapters 1–8, frontmatter already JSON (V22-E, L201: `?fm`, scripts/contentJson.mjs). Only src/content.ts
// imports this, and only with import(), so it is its own lazy chunk (budget `tickets`); chapters 9–12 are ticketLateSources.ts.
import type { TicketSource } from './tickets';

export const sources = import.meta.glob<TicketSource>('../content/tickets/ch[1-8]/*.md', { query: '?fm', import: 'default', eager: true });
