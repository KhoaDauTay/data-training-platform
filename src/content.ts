import { parseLaneBriefs, type LaneBrief } from './lanes';
import { parseLessons, type Lesson } from './lessons';
import { byOrder, parseTicket, type Ticket } from './tickets';
import { applyVariant } from './variants';

let templates: Ticket[] | undefined;
let lanes: { tasks: Ticket[]; briefs: LaneBrief[] } | undefined;
let lessons: Map<string, Lesson> | undefined;
let loading: Promise<void> | undefined;

/**
 * Ticket markdown is a lazy chunk (Plan 3, L41: src/ticketSources.ts), so new chapters never grow the main bundle.
 * Everything is fetched at once: progression, the inbox, Home and the review queue need every ticket.
 * main.ts and tests/setup.ts await this before anything reads tickets. A failed load can be retried.
 */
export function loadContent(): Promise<void> {
  // Plan 5: lane briefs and side tasks are their own lazy chunk, fetched beside the tickets.
  return (loading ??= Promise.all([import('./ticketSources'), import('./laneSources'), import('./lessonSources')])
    .then(([{ sources }, { laneSources, briefSource }, { lessonSource }]) => {
      templates = Object.entries(sources).map(([path, source]) => parseTicket(source, path)).sort(byOrder);
      lessons = new Map(parseLessons(lessonSource).map((l) => [l.id, l]));
      lanes = {
        tasks: Object.entries(laneSources).map(([path, source]) => applyVariant(parseTicket(source, path), 0)).sort(byOrder),
        briefs: parseLaneBriefs(briefSource),
      };
    })
    .catch((e: unknown) => {
      loading = undefined;
      throw e;
    }));
}

/** Raw tickets with their {{x}} templates, parsed once and shared (Practice and the review queue read these). Do not mutate. */
export function loadTicketTemplates(): Ticket[] {
  if (!templates) throw new Error('loadContent() has not finished');
  return templates;
}

/** Lane briefs and side tasks (src/lanes.ts). Side tasks are never part of loadTickets(). */
export function loadLanes(): { tasks: Ticket[]; briefs: LaneBrief[] } {
  if (!lanes) throw new Error('loadContent() has not finished');
  return lanes;
}

/** Quick lessons by skill id (content/lessons.yml). A skill without one has no entry. */
export function loadLessons(): Map<string, Lesson> {
  if (!lessons) throw new Error('loadContent() has not finished');
  return lessons;
}

/** Story mode always plays variants[0]. */
export function loadTickets(): Ticket[] {
  return loadTicketTemplates().map((t) => applyVariant(t, 0));
}
