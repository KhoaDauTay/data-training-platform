import { loadDomain, loadTickets } from '../content';
import { MAX_CARDS, readDashboard } from '../dashboard';
import { activeDomain, DOMAIN_ID, DOMAINS } from '../domains';
import { knownSkills } from '../home';
import { getLang, locale, t } from '../i18n';
import { readAttempts, readErrors } from '../insights';
import { DAYS_KEY, parseDays } from '../lily';
import { chaptersOf, rankOf, SKILLS } from '../progress';
import { hashOf } from '../route';
import { domainSlot } from '../save';
import { actions, app, persist } from '../state';
import { readJson, writeJson } from '../storage';
import { BTN_GO, BTN_SECONDARY, CARD, cx } from '../theme';
import { textOf } from '../tickets';
import { announce, h } from './dom';
import { icon, skillIcon } from './icons';
import { importedNames } from './myDataView';

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
      days: () => parseDays(readJson<unknown>(DAYS_KEY)), loadTickets, loadDomain, chaptersOf, rankOf, SKILLS, knownSkills, textOf, DOMAINS, DOMAIN_ID,
      activeDomain, domainSlot, readDashboard, MAX_CARDS, hashOf, importedNames, cls: { CARD, BTN_GO, BTN_SECONDARY, cx },
    });
    return (meView = m);
  }, (e: unknown) => {
    pending = undefined; // a failed load is retried by the next click or Retry, never in a loop
    throw e;
  });
  return pending;
}
