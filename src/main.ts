import './style.css';
import { initTheme } from './theme';
import { loadTickets } from './content';
import { DbClient, DbFailedError, DbRestartError, QueryTimeoutError, WorkerTaskError, type DbStatus } from './db/client';
import { SqlError } from './db/run';
import { buildDiagnostics, diagnosticsText } from './diagnostics';
import { applyStatic, setLang, t, type Lang } from './i18n';
import { MyData } from './import/myData';
import { idbStore } from './import/store';
import { contentProblems, currentChapter, nextTicket, SKILLS, xpFor } from './progress';
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
import { renderInbox } from './ui/inbox';
import { createPanel, registerCoreTabs } from './ui/tabs';
import { initLayout } from './ui/splitter';
import { go, startRouter } from './ui/router';
import { initTopbar, renderTopbar } from './ui/topbar';
import { mountWork } from './ui/work';
import { registerVizTabs } from './ui/vizTabs';
import { initMyData, setMyDataStatus } from './ui/myDataView';
import { clearMemos } from './viz/memo';
import { createMapStrip } from './ui/mapStrip';
import { chapterDots } from './viz/progressDots';

initTheme(); // index.html already set data-theme before paint; this adds the OS listener for 'system'
app.tickets = loadTickets();
const problems = contentProblems(app.tickets);
if (problems.length) console.warn('Content problems:', problems);
const known: Known = { ticketIds: new Set(app.tickets.map((x) => x.id)), skills: new Set(SKILLS.map((s) => s.id)) };

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
      "SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position",
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

// DbClient reports 'loading' from its constructor, before panel/work exist: this callback touches only
// the top bar, except in the 'ready' branch, which always arrives later (after the worker has booted).
let dbWasReady = false;
function onDbStatus(s: DbStatus): void {
  app.dbStatus = s;
  if (s === 'ready') dbWasReady = true;
  if (s === 'failed') app.problem = { kind: dbWasReady ? 'worker-crash' : 'db-init-failed' }; // P10
  if (s !== 'loading') app.loadProgress = undefined;
  renderTopbar();
  if (s === 'ready' && Object.keys(app.columns).length === 0) void loadColumns();
}
const db = new DbClient(onDbStatus);
db.onProgress = (p) => {
  if (app.dbStatus !== 'loading') return; // the steps tab fetches the parser .wasm through the same counting fetch later
  app.loadProgress = p;
  renderTopbar();
};
app.run = (sql) => db.run(sql);
db.onTimeout = (e) => {
  app.problem = { kind: 'db-timeout', error: e };
  renderTopbar();
};

registerCoreTabs(() => work.currentSql());
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

// Progress dots and lane count need no query: the strip is drawn before the DB is ready.
const mapStrip = createMapStrip(byId('map'));
function syncMap(): void {
  const completed = done();
  // The open ticket's chapter (a reopened old ticket shows its own chapter), else the player's current one.
  const chapter = app.tickets.find((x) => x.id === app.selectedId)?.chapter ?? currentChapter(app.tickets, completed);
  mapStrip.update({ chapter, completed, tickets: app.tickets, dots: chapterDots(app.tickets, completed, app.selectedId, chapter) });
}

/** Language switch and progress changes: redraws text, never remounts the editor. */
function rerender(): void {
  renderTopbar();
  renderInbox();
  renderReviewButton(byId('review-btn') as HTMLButtonElement);
  if (!byId('home').hidden) renderHome(byId('home')); // hidden Home is redrawn by showRoute(); Run/Submit in the workspace never rebuild it
  renderLeft(byId('ticket'));
  work.relabel();
  relabelStage();
  renderNotebook();
  // Story workspace only (L37): Home has the route map itself; Sandbox and Practice have no chapter progress.
  byId('map').hidden = byId('shell').hidden || !isStory();
  if (!byId('map').hidden) syncMap();
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

/** #/ = Home, #/play = workspace. Both stay mounted and only toggle `hidden`, so the editor is never recreated. */
function showRoute(r: Route, initial: boolean): void {
  byId('home').hidden = r !== 'home';
  byId('shell').hidden = r !== 'play';
  if (r !== 'home') leftHome(); // Home marks containers added after this moment as "New"
  rerender(); // nav aria-current, Home numbers
  if (!initial) byId(r === 'home' ? 'home-title' : 'brief-title').focus();
}

/** Correct answer: save at once, stay on the ticket and show the Recap (no auto-jump). */
function complete(t: Ticket): void {
  if (done().has(t.id)) return;
  const before = done();
  const gained = xpFor(t, app.save.hintsUsed[t.id] ?? 0);
  app.save.completed.push(t.id);
  app.save.xp += gained;
  app.save.review = seedReview(app.save.review, t.grants, today()); // first review tomorrow
  delete app.save.bossStep[t.id];
  persist(true);
  playCompletion(t, before, done()); // first completion only: the early return above skips re-solves
  app.conclusionFor = '';
  rerender();
  byId('ticket').querySelector<HTMLElement>('.recap h3')?.focus(); // the Submit button just disappeared
  work.setSchema(editorSchema()); // a boss may open the next chapter's tables
  panel.refresh();
}

/** Allowlisted payload only (Plan Deploy Task 3): never SQL, messages, drafts or data. Nothing is sent anywhere. */
async function copyDiagnostics(): Promise<void> {
  const p = app.problem;
  if (!p) return;
  const readyMs = performance.getEntriesByName('db:time-to-ready').at(-1)?.duration;
  const text = diagnosticsText(buildDiagnostics({
    build: __BUILD__, kind: p.kind, error: p.error, timings: { ...db.timings, readyMs }, userAgent: navigator.userAgent,
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
  rerender, selectTicket, complete, retryDb: () => db.restart(), copyDiagnostics: () => void copyDiagnostics(), useSql: (sql: string) => work.setDoc(sql),
});

byId('inbox-btn').addEventListener('click', () => (byId('inbox-dialog') as HTMLDialogElement).showModal());
byId('notebook-btn').addEventListener('click', () => toggleNotebook(byId('notebook-dialog') as HTMLDialogElement));

for (const b of document.querySelectorAll<HTMLButtonElement>('[data-lang]')) {
  b.addEventListener('click', () => {
    setLang(b.dataset.lang as Lang);
    rerender();
    panel.refresh();
  });
}

byId('export-btn').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([serializeSave(app.save)], { type: 'application/json' }));
  h('a', { href: url, download: 'cargo-query-save.json' }).click();
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
rerender();
work.setTicket(selected(), app.stepIndex);
startRouter(showRoute);

// "My data" (Plan Import): imported CSVs stay in this browser (IndexedDB) and are replayed into the sandbox schema.
const myData = new MyData(db, idbStore(), () => {
  clearMemos(); // cached plans, steps and ER metadata describe the old data
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
