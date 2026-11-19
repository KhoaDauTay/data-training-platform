import { loadDomain, loadInterview, loadTickets } from '../content';
import { MAX_CARDS, ranHere, readDashboard } from '../dashboard';
import { activeDomain, DOMAIN_ID, domainSchemaId, DOMAINS } from '../domains';
import { knownSkills } from '../home';
import { getLang, locale, t } from '../i18n';
import { readAttempts, readErrors } from '../insights';
import { INTERVIEW_KEY, parseInterviewPrefs, passedTakeHomes } from '../interviewPrefs';
import { DAYS_KEY, parseDays } from '../lily';
import { chaptersOf, rankOf, SKILLS } from '../progress';
import { hashOf } from '../route';
import { domainSlot } from '../save';
import { actions, app, persist } from '../state';
import { readJson, writeJson } from '../storage';
import { BTN_GO, BTN_SECONDARY, CARD, cx } from '../theme';
import { textOf } from '../tickets';
import { announce, h } from './dom';
import { cardBody } from './dashboard';
import { icon, skillIcon } from './icons';
import { importedNames } from './myDataView';
import { thisWeek } from './homeView';

/**
 * v16 (L142): loads the lazy `meView` chunk (#/me page, certificates, portfolio, dashboard file and picture exports) and hands
 * it every main value it uses (Plan 6 U3). Statically imported by ui/me.ts and ui/dashboard.ts: a dynamic import of a main
 * module makes Rolldown move most of main into a shared chunk.
 */
type MeView = typeof import('./meView');
let pending: Promise<MeView> | undefined;
export let meView: MeView | undefined;
export function meChunk(): Promise<MeView> {
  pending ??= import('./meView').then((m) => {
    m.initMe({
      h, announce, icon, skillIcon, t, getLang, locale, app, persist, rerender: () => actions.rerender(), readJson, writeJson, readErrors, readAttempts,
      days: () => parseDays(readJson<unknown>(DAYS_KEY)), week: thisWeek, loadTickets, loadDomain, chaptersOf, rankOf, SKILLS, knownSkills, textOf, DOMAINS, DOMAIN_ID,
      activeDomain, domainSlot, readDashboard, MAX_CARDS, hashOf, importedNames, cls: { CARD, BTN_GO, BTN_SECONDARY, cx },
      // V19-D (L170): portfolio card pictures (a card body as the dashboard draws it) and take-homes
      run: (sql, dom) => app.run(sql, { schema: domainSchemaId(dom) }), cardBody, ranHere: (c) => ranHere(c),
      loadInterview, interviewPrefs: () => parseInterviewPrefs(readJson<unknown>(INTERVIEW_KEY)), passedTakeHomes,
    });
    return (meView = m);
  }, (e: unknown) => {
    pending = undefined; // a failed load is retried by the next click or Retry, never in a loop
    throw e;
  });
  return pending;
}
