import './style.css';
import { initTheme } from './theme';
import { loadContent, loadLanes, loadTickets } from './content';
import { DbClient, DbFailedError, DbRestartError, QueryTimeoutError, WorkerTaskError, type DbStatus } from './db/client';
import { SqlError } from './db/run';
import { buildDiagnostics, diagnosticsText } from './diagnostics';
import { GAME_SCHEMA } from './domains';
import { applyStatic, loadLang, setLang, t, type Lang } from './i18n';
import { MyData } from './import/myData';
import { idbStore } from './import/store';
import { contentProblems, nextTicket, SKILLS, xpFor } from './progress';
import { loadSave, parseSave, serializeSave, type Known } from './save';
import { actions, app, done, editorSchema, persist, selected, type Column } from './state';
import { resumeStep } from './overview';
import { seedReview } from './practice';
import { isStory, session, today } from './session';
import { localStore } from './storage';
import type { Route } from './route';
import type { Ticket } from './tickets';
import { initModes, onPracticeWrong, onSolved, renderLeft, renderReviewButton } from './ui/modes';
import { renderNotebook, toggleNotebook } from './ui/notebook';
import { byId, h } from './ui/dom';
import { errorText } from './ui/feedback';
import { leftHome, renderHome } from './ui/homeView';
import { initStage, playCompletion, relabelStage } from './ui/stage';
import { prefetchArt } from './art/load';
import { renderInbox } from './ui/inbox';
import { createPanel, registerCoreTabs } from './ui/tabs';
import { coachDone, initTour, refreshTour } from './ui/coach';
import { initWelcome, openWelcome, relabelWelcome } from './ui/welcome';
import { readTour } from './onboarding';
import { loadLessonPrefs } from './lessons';
import { pinBar } from './ui/pin';
import { initLayout } from './ui/splitter';
import { currentRoute, go, startRouter } from './ui/router';
import { initSidebar, renderSidebar } from './ui/sidebar';
import { initTopbar, renderTopbar } from './ui/topbar';
import { mountWork } from './ui/work';
import { registerVizTabs } from './ui/vizTabs';
import { initMyData, setMyDataStatus } from './ui/myDataView';
import { clearMemos } from './viz/memo';
import { createMapStrip } from './ui/mapStrip';
import { renderData } from './ui/dataView';
import { renderDashboard, resetCards } from './ui/dashboard';

initTheme(); // index.html already set data-theme before paint; this adds the OS listener for 'system'
// The DB (PGlite download + seed, the slowest part of startup) boots in parallel with the ticket chunk below.
// Its callbacks only record state until the UI exists (`uiReady`); the setup at the end draws what they recorded.
let uiReady = false;
let dbWasReady = false;
function onDbStatus(s: DbStatus): void {
  app.dbStatus = s;
  if (s === 'ready') dbWasReady = true;
  if (s === 'failed') app.problem = { kind: dbWasReady ? 'worker-crash' : 'db-init-failed' }; // P10
  if (s !== 'loading') app.loadProgress = undefined;
  if (!uiReady) return;
  renderTopbar();
  relabelWelcome(); // Lily wakes up, "I am new" becomes clickable
  if (s === 'ready' && Object.keys(app.columns).length === 0) void loadColumns();
}
const db = new DbClient(onDbStatus);
db.onProgress = (p) => {
  if (app.dbStatus !== 'loading') return; // the steps tab fetches the parser .wasm through the same counting fetch later
  app.loadProgress = p;
  if (!uiReady) return;
  renderTopbar();
  relabelWelcome();
};
app.run = (sql) => db.run(sql);
db.onTimeout = (e) => {
  app.problem = { kind: 'db-timeout', error: e };
  renderTopbar();
};

// Ticket text and the EN dictionary are lazy chunks (src/content.ts, src/i18n): say so while they load (in VI until EN is in),
// and offer a reload if one fails.
// Nothing else is drawn yet, so the banner is set by hand; renderNotice() owns it from the first rerender on.
const loadingNotice = byId('notice');
loadingNotice.replaceChildren(h('span', {}, t('content.loading'))); // text first, then unhide, so the live region is read
loadingNotice.hidden = false;
try {
  await Promise.all([loadContent(), loadLang()]);
} catch (e) {
  loadingNotice.replaceChildren(h('span', {}, t('content.failed')), h('button', { type: 'button', onclick: () => location.reload() }, t('app.reload')));
  throw e;
}
loadingNotice.hidden = true;

app.tickets = loadTickets();
const problems = contentProblems(app.tickets);
if (problems.length) console.warn('Content problems:', problems);
// Lane side tasks are known ids too, so their drafts, graded SQL and hints survive a reload (they never enter `completed`).
const laneIds = new Set(loadLanes().tasks.map((x) => x.id));
const known: Known = { ticketIds: new Set([...app.tickets.map((x) => x.id), ...laneIds]), laneIds, skills: new Set(SKILLS.map((s) => s.id)) };

const loaded = loadSave(localStore(), known);
app.save = loaded.save;
if (loaded.warning?.kind === 'newer') app.notice = { key: 'save.newerLoaded', params: { v: loaded.warning.version ?? 0 } };
if (loaded.warning?.kind === 'corrupt') app.notice = { key: 'save.corrupt' };

const firstOpen = (): string => (nextTicket(app.tickets, done()) ?? app.tickets[app.tickets.length - 1]).id;
app.selectedId = firstOpen();
app.stepIndex = resumeStep(app.save, selected()); // reloading mid-review keeps the step reached
initTopbar(); // icon slots first: applyStatic() then only touches the label spans
applyStatic();

async function loadColumns(): Promise<void> {
  try {
    const r = await db.run(
      `SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = '${GAME_SCHEMA}' ORDER BY table_name, ordinal_position`,
    );
    const next: Record<string, Column[]> = {};
    for (const [table, name, type] of r.rows as string[][]) (next[table] ??= []).push({ name, type });
    app.columns = next;
    work.setSchema(editorSchema());
    panel.refresh();
  } catch (e) {
    console.warn('Could not read the schema:', errorText(e));
  }
}

registerCoreTabs(() => work.currentSql(), () => pinBar(() => work.currentSql()));
registerVizTabs({ db, show: (id) => panel.show(id), active: () => panel.active, editorSql: () => work.currentSql() });
const panel = createPanel(byId('panel'));
const work = mountWork(byId('work'), {
  db,
  panel,
  onSolved, // practice: Leitner only, no complete(), no animation
  onWrong: onPracticeWrong,
  onStepSolved: nextStep,
  onConclusion: (t) => {
    app.conclusionFor = t.id;
    rerender();
  },
  onRun: () => rerender(),
});
initModes({ work, rerender });

// The task bar needs no query: it is drawn before the DB is ready.
const mapStrip = createMapStrip(byId('map'));
const syncMap = (): void => mapStrip.update({
  tickets: app.tickets, completed: done(), selectedId: app.selectedId, lane: session.mode.kind === 'lane' ? session.mode.ticket : undefined,
});

/** Language switch and progress changes: redraws text, never remounts the editor. */
function rerender(): void {
  renderTopbar();
  renderSidebar(currentRoute()); // before the Data page: it fills the sidebar's slot (V11)
  renderInbox();
  renderReviewButton(byId('review-btn') as HTMLButtonElement);
  if (!byId('home').hidden) renderHome(byId('home')); // hidden Home is redrawn by showRoute(); Run/Submit in the workspace never rebuild it
  if (!byId('data').hidden) renderData(byId('data'));
  if (!byId('dashboard').hidden) renderDashboard(byId('dashboard'));
  renderLeft(byId('ticket'));
  work.relabel();
  relabelStage();
  renderNotebook();
  // Story workspace and lane tasks only: selectTicket() forces story mode, so Practice and Sandbox must not show the task bar (ui-ux-v4 §2).
  byId('map').hidden = byId('shell').hidden || !(isStory() || session.mode.kind === 'lane');
  if (!byId('map').hidden) syncMap();
  refreshTour(); // the work area's slot is not rebuilt by a rerender
  relabelWelcome();
}

/** `force`: rebuild the editor even for the same ticket id (an imported save brings its own draft). */
function selectTicket(id: string, force = false): void {
  const fromMode = !isStory(); // leaving Practice/Sandbox: new editor, and the practice run's lastRun is dropped
  session.mode = { kind: 'story' };
  app.selectedId = id;
  app.stepIndex = resumeStep(app.save, selected()); // a promotion review reopens at the step reached
  app.conclusionFor = '';
  (byId('inbox-dialog') as HTMLDialogElement).close();
  rerender();
  work.setTicket(selected(), app.stepIndex, force || fromMode);
  go('play'); // from Home or the inbox on Home: the hashchange then focuses the brief (it is hidden until then)
  byId('brief-title').focus();
}

function nextStep(): void {
  app.stepIndex++;
  app.save.bossStep[app.selectedId] = app.stepIndex;
  persist();
  rerender();
  work.setTicket(selected(), app.stepIndex);
  work.focus(); // the new step's editor replaces the one that had focus
}

let shownRoute: Route | undefined;
/** Reading pages share <main id="home"> (src/ui/homeView.ts draws the one the route names). */
const PAGE_ROUTES: ReadonlySet<Route> = new Set<Route>(['home', 'learn', 'practice', 'overview', 'map', 'soon']);
const TITLE_OF: Partial<Record<Route, string>> = { data: 'data-title', dashboard: 'dashboard-title', play: 'brief-title' };
/** Reading pages, #/d/logistics/play = workspace, …/data = Data page, …/dashboard. All stay mounted and only toggle `hidden`, so the editor is never recreated. */
function showRoute(r: Route, initial: boolean): void {
  const tableSwitch = r === 'data' && shownRoute === 'data'; // #/data/a → #/data/b: only the Data page changes
  shownRoute = r;
  if (tableSwitch) {
    renderData(byId('data'));
    byId('data-table-title').focus();
    return;
  }
  byId('home').hidden = !PAGE_ROUTES.has(r);
  byId('data').hidden = r !== 'data';
  byId('dashboard').hidden = r !== 'dashboard';
  byId('shell').hidden = r !== 'play';
  if (r !== 'overview') leftHome(); // the harbour (Overview) marks containers added after this moment as "New"
  rerender(); // nav aria-current, page numbers, Data page, dashboard
  if (!initial) byId(TITLE_OF[r] ?? 'home-title').focus();
}

/** Correct answer: save at once, stay on the ticket and show the Recap (no auto-jump). */
function complete(tk: Ticket): void {
  if (done().has(tk.id)) return;
  const before = done();
  const gained = xpFor(tk, app.save.hintsUsed[tk.id] ?? 0);
  app.save.completed.push(tk.id);
  app.save.xp += gained;
  app.save.review = seedReview(app.save.review, tk.grants, today()); // first review tomorrow
  delete app.save.bossStep[tk.id];
  persist(true);
  playCompletion(tk, before, done()); // first completion only: the early return above skips re-solves
  // Appended to the sentence playCompletion just announced: focus stays on the Recap, the next step is in the task bar.
  if (nextTicket(app.tickets, done())) byId('announce').append(` ${t('nav.nextReady')}`);
  app.conclusionFor = '';
  rerender();
  byId('ticket').querySelector<HTMLElement>('.recap h3')?.focus(); // the Submit button just disappeared
  work.setSchema(editorSchema()); // a boss may open the next chapter's tables
  panel.refresh();
}

/** Allowlisted payload only (Plan Deploy Task 3): never SQL, messages, drafts or data. Nothing is sent anywhere. */
async function copyDiagnostics(): Promise<void> {
  const p = app.problem ?? { kind: 'feedback' as const }; // the ⋯ menu copies it with no fault (v4 §B.6)
  const readyMs = performance.getEntriesByName('db:time-to-ready').at(-1)?.duration;
  const text = diagnosticsText(buildDiagnostics({
    build: __BUILD__, kind: p.kind, error: 'error' in p ? p.error : undefined, timings: { ...db.timings, readyMs }, userAgent: navigator.userAgent,
    onboarding: {
      tourStep: readTour()?.step ?? 0,
      skipped: coachDone(),
      ch1Hints: app.tickets.filter((x) => x.chapter === 1).map((x) => app.save.hintsUsed[x.id] ?? 0),
      lessonsTried: loadLessonPrefs().tried.length,
    },
  }));
  // Never replace another banner (new version + Reload, save warnings): those matter more than "copied".
  const free = !app.notice || app.notice.key.startsWith('diag.');
  try {
    await navigator.clipboard.writeText(text);
    if (free) app.notice = { key: 'diag.copied' };
  } catch {
    if (free) app.notice = { key: 'diag.manual', params: { text } }; // shown with textContent (renderNotice)
  }
  renderTopbar();
}

/** Uncaught app errors only: query outcomes (player SQL errors, timeouts, restarts, worker task and DB failures) are normal play or already recorded. */
const fault = (error: unknown): void => {
  // null: ResizeObserver loop notices and cross-origin "Script error." (extensions) carry no Error object.
  if (error == null || error instanceof SqlError || error instanceof QueryTimeoutError || error instanceof DbRestartError
    || error instanceof WorkerTaskError || error instanceof DbFailedError) return;
  app.problem = { kind: 'js-error', error };
  renderTopbar();
};
window.addEventListener('error', (e) => fault(e.error));
window.addEventListener('unhandledrejection', (e) => fault(e.reason));

Object.assign(actions, {
  rerender, selectTicket, complete, retryDb: () => db.restart(), openLane: (port: string) => mapStrip.openLane(port), copyDiagnostics: () => void copyDiagnostics(), useSql: (sql: string) => work.setDoc(sql), showTab: (id: string) => panel.show(id),
  switchLang: (l: Lang) => void setLang(l).then(() => {
    rerender();
    panel.refresh();
  }),
});

byId('inbox-btn').addEventListener('click', () => (byId('inbox-dialog') as HTMLDialogElement).showModal());
byId('notebook-btn').addEventListener('click', () => toggleNotebook(byId('notebook-dialog') as HTMLDialogElement));
byId('replay-btn').addEventListener('click', () => openWelcome(true)); // v4 D-O2: the static version (V10)
byId('diag-btn').addEventListener('click', () => void copyDiagnostics());

for (const b of document.querySelectorAll<HTMLButtonElement>('[data-lang]')) {
  b.addEventListener('click', () => void setLang(b.dataset.lang as Lang).then(() => { // EN may need its chunk first
    rerender();
    panel.refresh();
  }));
}

byId('export-btn').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([serializeSave(app.save)], { type: 'application/json' }));
  h('a', { href: url, download: 'boondata-progress.json' }).click(); // Import reads any file name (V12)
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

(byId('import-input') as HTMLInputElement).addEventListener('change', async (e) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  try {
    app.save = parseSave(await file.text(), known);
    persist(true);
    app.notice = { key: 'save.imported' };
    selectTicket(firstOpen(), true); // the new editor gets the imported draft and editorSchema()
    panel.refresh();
  } catch (err) {
    app.notice = { key: 'save.importFailed', params: { reason: errorText(err) } };
    renderTopbar();
  }
});

// A lazy chunk (sql-formatter; Plan 1b: Mermaid, libpg-query) 404s after a deploy: offer a reload.
window.addEventListener('vite:preloadError', () => {
  app.problem = { kind: 'chunk-load-failed' };
  app.notice = { key: 'app.newVersion', reload: true };
  renderTopbar();
});

initLayout(byId('shell'), { col: byId('split-col'), row: byId('split-row') });
initStage();
uiReady = true; // nothing awaited since loadContent(), so no DB callback was missed in between
rerender();
prefetchArt(); // the art chunk (scene, map, completion scenes) once the first screen is up (Plan 8b)
if (app.dbStatus === 'ready') void loadColumns();
work.setTicket(selected(), app.stepIndex);
initSidebar(); // its Esc (close the overlay) goes before the tour's
initTour();
startRouter(showRoute);
initWelcome();

// "My data" (Plan Import): imported CSVs stay in this browser (IndexedDB) and are replayed into the sandbox schema.
const myData = new MyData(db, idbStore(), () => {
  clearMemos(); // cached plans, steps and ER metadata describe the old data
  resetCards(); // so do card results, including "table missing" from before restore() replayed it; rerender() runs them again
  work.setSchema(editorSchema());
  panel.refresh();
  rerender();
});
initMyData(myData, rerender);
db.onImportDropped = (table) => {
  void myData.dropped(table);
  setMyDataStatus(t('mydata.lost', { table }));
};
void myData.restore().then((failed) => {
  if (failed.length) setMyDataStatus(t('mydata.restoreFailed', { tables: failed.map((f) => f.table).join(', ') }));
});
