import type { Ticket } from '../tickets';

/** Where the task bar's ‹ › and "continue" buttons go (ui-ux-v4 §2). Ticket ids; `undefined` = no such button. */
export interface NavTargets { prev?: string; next?: string; resume?: string }

/**
 * ‹ › walk the tickets the player can open (done + the first not done) in story order, across chapters.
 * `resume` = the first ticket not done, unless it is the open one (then there is nothing to go back to).
 */
export function navTargets(tickets: Pick<Ticket, 'id'>[], completed: Set<string>, selectedId: string): NavTargets {
  const first = tickets.find((t) => !completed.has(t.id));
  const visible = tickets.filter((t) => completed.has(t.id) || t === first);
  const i = visible.findIndex((t) => t.id === selectedId);
  const resume = first && first.id !== selectedId ? first.id : undefined;
  if (i < 0) return { resume };
  return { prev: visible[i - 1]?.id, next: visible[i + 1]?.id, resume };
}
