import { activeDomain, type DomainId } from './domains';
import type { General } from './general';
import type { InterviewContent } from './interview';
import type { CaseStudy } from './cases';
import { parseKpis, setDomainKpis } from './home';
import { parseLaneBriefs, type LaneBrief } from './lanes';
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
 * V22-E (L201): two chunks (chapters 1–8, 9–12) fetched in parallel, frontmatter and YAML already JSON (no `yaml` at runtime).
 * Everything is fetched at once: progression, the inbox, Home and the review queue need every ticket.
 * main.ts and tests/setup.ts await this before anything reads tickets. A failed load can be retried.
 */
export function loadContent(): Promise<void> {
  // Plan 5: lane briefs and side tasks are their own lazy chunk, fetched beside the tickets.
  return (loading ??= Promise.all([import('./ticketSources'), import('./ticketLateSources'), import('./laneSources'), import('./lessonSources')])
    .then(([{ sources }, late, { laneSources, briefSource }, { lessonSource }]) => {
      templates = Object.entries({ ...sources, ...late.sources }).map(([path, source]) => parseTicket(source, path)).sort(byOrder);
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
const domainLoading = new Map<DomainId, Promise<void>>();
/** Lazy content chunk and folder of each non-Logistics domain (Plan 9, Plan 11). */
const DOMAIN_SOURCES: Partial<Record<DomainId, [() => Promise<typeof import('./ecomSources')>, string]>> = {
  // V22-E: E-com is two chunks too (ch1–4 + YAML, ch5+), fetched in parallel like Finance.
  ecommerce: [() => Promise.all([import('./ecomSources'), import('./ecomLateSources')])
    .then(([a, b]) => ({ ...a, ticketSources: { ...a.ticketSources, ...b.ticketSources } })), 'domains/ecom'],
  // v20 (L185): two chunks fetched in parallel, so loadDomain('finance') still resolves with every ticket.
  finance: [() => Promise.all([import('./finSources'), import('./finLateSources')])
    .then(([a, b]) => ({ ...a, ticketSources: { ...a.ticketSources, ...b.ticketSources } })), 'domains/fin'],
};

/**
 * A domain's content (Plan 9): Logistics comes with loadContent(); every other domain is its own lazy chunk
 * (src/ecomSources.ts, src/finSources.ts), loaded the first time the player opens it. A failed load can be retried.
 * Await it before setActiveDomain().
 */
export function loadDomain(id: DomainId): Promise<void> {
  const src = DOMAIN_SOURCES[id];
  if (!src) return Promise.resolve();
  const [load, dir] = src;
  let p = domainLoading.get(id);
  if (!p) {
    p = load()
      .then((m) => {
        const list = Object.entries(m.ticketSources).map(([path, source]) => parseTicket(source, path)).sort(byOrder);
        setDomainChapters(id, parseChapters(m.chaptersSource, `${dir}/chapters.yml`));
        setDomainKpis(id, parseKpis(m.kpiSource, `${dir}/kpis.yml`));
        setDomainPeople(id, parsePeople(m.peopleSource, `${dir}/people.yml`));
        domainTemplates.set(id, list);
      })
      .catch((e: unknown) => {
        domainLoading.delete(id);
        throw e;
      });
    domainLoading.set(id, p);
  }
  return p;
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
 * Plan 8a: drills and advanced nodes, lazy chunks src/generalSources.ts + src/generalAdvSources.ts (v19, L167). Never part of loadContent(): only the
 * General pages, reviews and the drill workspace call it. A failed load is dropped so the next call retries.
 */
export function loadGeneral(): Promise<General> {
  // ponytail: both chunks are fetched together (in parallel), so a review or the practice hub also downloads adv.yml.
  // Fetching it only on adv pages needs callers that ask for drills alone (ui/modes.ts, ui/drillBrief.ts): add then (L167).
  // v47 (L926): + the Practise sets (fix.yml, explain.yml), a third small chunk fetched alongside
  return (generalLoading ??= Promise.all([import('./generalSources'), import('./generalAdvSources'), import('./practiceSources')])
    .then(([{ sqlDrills, buildGeneral }, { advNodes }, { fixItems, explainItems }]) =>
      (general = buildGeneral(sqlDrills, advNodes, parseLessonBody, { fix: fixItems, explain: explainItems })))
    .catch((e: unknown) => {
      generalLoading = undefined;
      throw e;
    }));
}

let interviewLoading: Promise<InterviewContent> | undefined;
/**
 * v17 I5 (L144): the interview room's sets and take-homes, their own lazy chunk (src/interviewSources.ts, budget `interview`).
 * Never part of loadContent(); a failed load is dropped so the next call retries.
 */
export function loadInterview(): Promise<InterviewContent> {
  return (interviewLoading ??= Promise.all([import('./interviewSources'), loadCases()])
    .then(([{ interviewYml, buildInterview }, cases]) => buildInterview(interviewYml, cases)) // v47: case runs use the take-home flow
    .catch((e: unknown) => {
      interviewLoading = undefined;
      throw e;
    }));
}

let casesLoading: Promise<CaseStudy[]> | undefined;
let cases: CaseStudy[] | undefined;
/** v47 D1/D2 (L930): domain case studies and asks, their own lazy chunk (src/caseSources.ts, budget `cases`); a failure retries. */
export function loadCases(): Promise<CaseStudy[]> {
  return (casesLoading ??= import('./caseSources')
    .then(({ casesYml, parseCases }) => (cases = parseCases(casesYml)))
    .catch((e: unknown) => {
      casesLoading = undefined;
      throw e;
    }));
}
/** The cases once loadCases() resolved, else undefined (the Overview section shows its loading line meanwhile). */
export const casesNow = (): CaseStudy[] | undefined => cases;

/** The General content once loadGeneral() resolved, else undefined (callers that cannot wait show a placeholder). */
export const generalNow = (): General | undefined => general;

/** Story mode always plays variants[0]. */
const storyCache = new WeakMap<Ticket[], Ticket[]>();
export function loadTickets(d: DomainId = activeDomain()): Ticket[] {
  // V20-C (L178): the top bar, sidebar and Home call this on every draw; applying variant 0 to every ticket cost 40–50 ms
  // at boot. Keyed by the parsed template list, so a reload of a domain's content gets a fresh list. A copy, never shared.
  const list = loadTicketTemplates(d);
  let story = storyCache.get(list);
  if (!story) storyCache.set(list, (story = list.map((t) => applyVariant(t, 0))));
  return story.slice();
}
