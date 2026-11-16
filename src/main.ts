import './style.css';
import { loadTickets } from './content';
import { DbClient, type DbStatus } from './db/client';
import { applyStatic, setLang, type Lang } from './i18n';
import { contentProblems, nextTicket, SKILLS, xpFor } from './progress';
import { loadSave, parseSave, serializeSave, type Known } from './save';
import { actions, app, done, editorSchema, persist, selected, type Column } from './state';
import { localStore } from './storage';
import type { Ticket } from './tickets';
import { renderBrief } from './ui/brief';
import { byId, h } from './ui/dom';
import { errorText } from './ui/feedback';
import { renderInbox } from './ui/inbox';
import { createPanel, registerCoreTabs } from './ui/tabs';
import { initLayout } from './ui/splitter';
import { renderTopbar } from './ui/topbar';
import { mountWork } from './ui/work';

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
function onDbStatus(s: DbStatus): void {
  app.dbStatus = s;
  if (s !== 'loading') app.loadProgress = undefined;
  renderTopbar();
  if (s === 'ready' && Object.keys(app.columns).length === 0) void loadColumns();
}
const db = new DbClient(onDbStatus);
db.onProgress = (p) => {
  app.loadProgress = p;
  renderTopbar();
};
app.run = (sql) => db.run(sql);

registerCoreTabs(() => work.currentSql());
const panel = createPanel(byId('panel'));
const work = mountWork(byId('work'), {
  db,
  panel,
  onSolved: (t) => complete(t),
  onStepSolved: nextStep,
  onConclusion: (t) => {
    app.conclusionFor = t.id;
    rerender();
  },
  onRun: () => rerender(),
});

/** Language switch and progress changes: redraws text, never remounts the editor. */
function rerender(): void {
  renderTopbar();
  renderInbox();
  renderBrief(byId('ticket'), selected(), app.stepIndex);
  work.relabel();
}

function selectTicket(id: string): void {
  app.selectedId = id;
  app.stepIndex = 0;
  app.conclusionFor = '';
  (byId('inbox-dialog') as HTMLDialogElement).close();
  rerender();
  work.setTicket(selected(), app.stepIndex);
  byId('brief-title').focus();
}

function nextStep(): void {
  app.stepIndex++;
  rerender();
  work.setTicket(selected(), app.stepIndex);
  work.focus(); // the new step's editor replaces the one that had focus
}

/** Correct answer: save at once, stay on the ticket and show the Recap (no auto-jump). */
function complete(t: Ticket): void {
  if (done().has(t.id)) return;
  const gained = xpFor(t, app.save.hintsUsed[t.id] ?? 0);
  app.save.completed.push(t.id);
  app.save.xp += gained;
  persist(true);
  app.conclusionFor = '';
  app.justCompleted = t.id;
  rerender();
  work.setSchema(editorSchema()); // a boss may open the next chapter's tables
  panel.refresh();
}

Object.assign(actions, { rerender, selectTicket, complete, retryDb: () => db.restart() });

byId('inbox-btn').addEventListener('click', () => (byId('inbox-dialog') as HTMLDialogElement).showModal());

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
    selectTicket(firstOpen());
    work.setTicket(selected(), app.stepIndex, true); // same ticket id: the imported draft still needs a fresh editor
    work.setSchema(editorSchema());
    panel.refresh();
  } catch (err) {
    app.notice = { key: 'save.importFailed', params: { reason: errorText(err) } };
    renderTopbar();
  }
});

// A lazy chunk (sql-formatter; Plan 1b: Mermaid, libpg-query) 404s after a deploy: offer a reload.
window.addEventListener('vite:preloadError', () => {
  app.notice = { key: 'app.newVersion', reload: true };
  renderTopbar();
});

initLayout(byId('shell'), { col: byId('split-col'), row: byId('split-row') });
rerender();
work.setTicket(selected(), app.stepIndex);
