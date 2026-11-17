import { activeDomain, type DomainId } from './domains';
import type { General } from './general';
import { parseKpis, setDomainKpis } from './home';
import { parseLaneBriefs, type LaneBrief } from './lanes';
import { parse as parseYaml } from 'yaml';
import { parseLessonBody, parseLessons, type Lesson } from './lessons';
import { parsePeople, setDomainPeople } from './people';
import { parseChapters, setDomainChapters } from './progress';
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

const domainTemplates = new Map<DomainId, Ticket[]>();
let ecomLoading: Promise<void> | undefined;

/**
 * A domain's content (Plan 9): Logistics comes with loadContent(); E-commerce is its own lazy chunk (src/ecomSources.ts),
 * loaded the first time the player opens the domain. A failed load can be retried. Await it before setActiveDomain().
 */
export function loadDomain(id: DomainId): Promise<void> {
  if (id !== 'ecommerce') return Promise.resolve();
  return (ecomLoading ??= import('./ecomSources')
    .then((m) => {
      const list = Object.entries(m.ticketSources).map(([path, source]) => parseTicket(source, path)).sort(byOrder);
      setDomainChapters('ecommerce', parseChapters(m.chaptersSource, 'domains/ecom/chapters.yml'));
      setDomainKpis('ecommerce', parseKpis(m.kpiSource, 'domains/ecom/kpis.yml'));
      setDomainPeople('ecommerce', parsePeople(m.peopleSource, 'domains/ecom/people.yml'));
      domainTemplates.set('ecommerce', list);
    })
    .catch((e: unknown) => {
      ecomLoading = undefined;
      throw e;
    }));
}

/** Raw tickets with their {{x}} templates, parsed once and shared (Practice and the review queue read these). Do not mutate. */
export function loadTicketTemplates(d: DomainId = activeDomain()): Ticket[] {
  const list = d === 'logistics' ? templates : domainTemplates.get(d);
  if (!list) throw new Error(d === 'logistics' ? 'loadContent() has not finished' : `loadDomain('${d}') has not finished`);
  return list;
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

let general: General | undefined;
let generalLoading: Promise<General> | undefined;

/**
 * Plan 8a: drills and advanced nodes, their own lazy chunk (src/generalSources.ts). Never part of loadContent(): only the
 * General pages, reviews and the drill workspace call it. A failed load is dropped so the next call retries.
 */
export function loadGeneral(): Promise<General> {
  return (generalLoading ??= import('./generalSources')
    .then(({ sqlDrills, advNodes, buildGeneral }) => (general = buildGeneral(parseYaml(sqlDrills), parseYaml(advNodes), parseLessonBody)))
    .catch((e: unknown) => {
      generalLoading = undefined;
      throw e;
    }));
}

/** The General content once loadGeneral() resolved, else undefined (callers that cannot wait show a placeholder). */
export const generalNow = (): General | undefined => general;

/** Story mode always plays variants[0]. */
export function loadTickets(d: DomainId = activeDomain()): Ticket[] {
  return loadTicketTemplates(d).map((t) => applyVariant(t, 0));
}
