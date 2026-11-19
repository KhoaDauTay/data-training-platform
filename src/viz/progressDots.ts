import { nextTicket, visibleTickets } from '../progress';
import type { Ticket } from '../tickets';

/** Where the task bar's ‹ › and "continue" buttons go (ui-ux-v4 §2). Ticket ids; `undefined` = no such button. */
export interface NavTargets { prev?: string; next?: string; resume?: string }

/**
 * ‹ › walk the tickets the player can open (visibleTickets: done, the next one, optional tasks of a chapter passed early)
 * in story order, across chapters. `resume` = the next task (nextTicket), unless it is the open one.
 */
export function navTargets(tickets: Ticket[], completed: Set<string>, selectedId: string): NavTargets {
  const first = nextTicket(tickets, completed);
  const visible = visibleTickets(tickets, completed);
  const i = visible.findIndex((t) => t.id === selectedId);
  const resume = first && first.id !== selectedId ? first.id : undefined;
  if (i < 0) return { resume };
  return { prev: visible[i - 1]?.id, next: visible[i + 1]?.id, resume };
}
