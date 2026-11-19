// Lane briefs and side tasks (content/lanes/) parsed at build time (V22-E). Only src/content.ts imports this, and only with import(),
// so it is its own lazy chunk (budget group `lanes`, Plan 5), fetched at boot beside the ticket chunk.
import type { TicketSource } from './tickets';

export const laneSources = import.meta.glob<TicketSource>('../content/lanes/*/*.md', { query: '?fm', import: 'default', eager: true });
export { default as briefSource } from '../content/lanes/lanes.yml';
