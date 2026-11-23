// Pure helpers for crawl-tutorials.mjs (no network, no file system; tested in tests/kbCrawl.test.ts).
// Copyright rule: these functions return STRUCTURE only (titles, URLs, order, h2/h3 heading texts, a hash).
// Nothing here may return or keep paragraphs, code samples or other page text.
import { createHash } from 'node:crypto';

export const BASE = 'https://www.tutorialspoint.com';
const SKIP_SLUGS = ['about', 'jobs', 'practice'];

/** Decode the few entities the site uses, drop tags, collapse whitespace. */
export const dec = (s) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;|&#160;/g, ' ').replace(/\s+/g, ' ').trim();

/** Tutorial slugs linked from the database tutorials index, in page order. */
export function parseIndex(html) {
  const re = /href="(?:https:\/\/www\.tutorialspoint\.com)?\/([a-z0-9_]+)\/index\.htm"/g;
  return [...new Set([...html.matchAll(re)].map((m) => m[1]))].filter((s) => !SKIP_SLUGS.includes(s));
}

const UL = /<ul class="toc chapters"\s*>[\s\S]*?<\/ul>/g;
const ITEM = /<(?:li|h\d)[^>]*class="heading"[^>]*>([\s\S]*?)<\/(?:li|h\d)>|<li[^>]*>\s*<a([^>]*)>([\s\S]*?)<\/a>([\s\S]*?)<\/li>/g;

/** A tutorial's table of contents: { title, sections: [{ section, chapters: [{ order, title, url, note? }] }] }. */
export function parseToc(html, slug) {
  const title = dec(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? slug);
  const uls = [...html.matchAll(UL)];
  const region = uls.length ? html.slice(uls[0].index, uls.at(-1).index + uls.at(-1)[0].length) : '';
  let cur = { section: '(no heading)', chapters: [] };
  const sections = [cur];
  let order = 0;
  for (const m of region.matchAll(ITEM)) {
    if (m[1] !== undefined) { cur = { section: dec(m[1]), chapters: [] }; sections.push(cur); continue; }
    const href = m[2].match(/href="([^"]+)"/)?.[1];
    if (!href || /class="[^"]*videolink/.test(m[2])) continue; // image-only link to external video training
    const inner = dec(m[3]);
    const after = dec(m[4]);
    if (!inner && !after) continue;
    const url = href.startsWith('http') ? href : BASE + (href.startsWith('/') ? '' : `/${slug}/`) + href;
    const ch = { order: ++order, title: inner || after, url };
    if (!inner) ch.note = 'title follows the link in the site markup';
    cur.chapters.push(ch);
  }
  return { title, sections: sections.filter((s) => s.chapters.length) };
}

/**
 * A chapter page's heading outline and a content hash, or null when the page has no article region (soft 404).
 * outline = h2/h3 texts inside the article ("## …" / "### …"); hash = sha256 (16 hex) of the article's text with
 * tags, scripts and whitespace normalised. The text itself is hashed and dropped, never returned.
 */
export function parseOutline(html) {
  const start = html.indexOf('id="mainContent"');
  if (start < 0) return null;
  let end = html.indexOf('class="al-bottom-nav"', start);
  if (end < 0) end = html.indexOf('</main>', start);
  const region = html.slice(start, end < 0 ? undefined : end);
  const outline = [...region.matchAll(/<h([23])\b[^>]*>([\s\S]*?)<\/h\1>/gi)]
    .map((m) => [m[1], dec(m[2])]).filter(([, t]) => t).map(([l, t]) => `${l === '2' ? '##' : '###'} ${t}`);
  const text = dec(region.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ').replace(/^[^>]*>/, ''));
  return { outline, hash: createHash('sha256').update(text).digest('hex').slice(0, 16) };
}

/** robots.txt → the Allow/Disallow rules that apply to `agent` (its own group if named, else `*`). */
export function robotsRules(txt, agent) {
  const groups = [];
  let g = null;
  let lastWasAgent = false;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    if (key === 'user-agent') {
      if (!lastWasAgent) groups.push((g = { agents: [], rules: [] }));
      g.agents.push(m[2].toLowerCase());
      lastWasAgent = true;
    } else {
      lastWasAgent = false;
      if (g && (key === 'allow' || key === 'disallow')) g.rules.push({ allow: key === 'allow', path: m[2] });
    }
  }
  const a = agent.toLowerCase();
  const own = groups.filter((x) => x.agents.includes(a));
  return (own.length ? own : groups.filter((x) => x.agents.includes('*'))).flatMap((x) => x.rules);
}

/** Longest matching rule wins, Allow wins a tie; an empty Disallow allows everything. */
export function robotsAllows(rules, url) {
  const u = new URL(url);
  const path = u.pathname + u.search;
  let best = null;
  for (const r of rules) {
    if (!r.path) continue;
    const anchored = r.path.endsWith('$');
    const body = anchored ? r.path.slice(0, -1) : r.path;
    const rx = new RegExp('^' + body.split('*').map((p) => p.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + (anchored ? '$' : ''));
    if (!rx.test(path)) continue;
    if (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow)) best = r;
  }
  return !best || best.allow;
}

const chaptersOf = (t) => t.sections.flatMap((s) => s.chapters.map((c) => ({ ...c, section: s.section })));

/**
 * What changed between two route lists. Only tutorials in `scope` (slugs) are compared, so a partial run
 * (--only) never reports the others as removed. A chapter without a previous hash has no baseline: never "changed".
 */
export function diffRoutes(prev, next, scope = next.map((t) => t.slug)) {
  const pick = (list) => new Map(list.filter((t) => scope.includes(t.slug)).map((t) => [t.slug, t]));
  const a = pick(prev);
  const b = pick(next);
  const d = { newTutorials: [], removedTutorials: [], added: [], removed: [], renamed: [], moved: [], changed: [] };
  for (const [slug, t] of b) if (!a.has(slug)) d.newTutorials.push({ slug, title: t.title });
  for (const [slug, t] of a) if (!b.has(slug)) d.removedTutorials.push({ slug, title: t.title });
  for (const [slug, nt] of b) {
    const old = a.get(slug);
    if (!old) continue;
    const before = new Map(chaptersOf(old).map((c) => [c.url, c]));
    const after = new Map(chaptersOf(nt).map((c) => [c.url, c]));
    for (const [url, c] of after) {
      const o = before.get(url);
      if (!o) { d.added.push({ slug, url, title: c.title, section: c.section }); continue; }
      if (o.title !== c.title) d.renamed.push({ slug, url, from: o.title, to: c.title });
      if (o.section !== c.section) d.moved.push({ slug, url, title: c.title, from: o.section, to: c.section });
      if (o.hash && c.hash && o.hash !== c.hash) {
        const was = new Set(o.outline ?? []);
        const now = new Set(c.outline ?? []);
        d.changed.push({ slug, url, title: c.title, headingsAdded: [...now].filter((h) => !was.has(h)), headingsRemoved: [...was].filter((h) => !now.has(h)) });
      }
    }
    for (const [url, c] of before) if (!after.has(url)) d.removed.push({ slug, url, title: c.title, section: c.section });
  }
  return d;
}

/** The changes report (markdown). */
export function changesMd(d, { date, prevDate, scope, failures = [] }) {
  const n = d.newTutorials.length + d.removedTutorials.length + d.added.length + d.removed.length + d.renamed.length + d.moved.length + d.changed.length;
  let md = `# Tutorial changes (tutorialspoint database tutorials)\n\nRun ${date}, compared with the previous completed run (${prevDate ?? 'none'}). `;
  md += `Scope: ${scope.length} tutorials. Generated by \`npm run kb:crawl\`; structure only (titles, URLs, heading texts), no page text. Inventory: [tutorial-routes.md](tutorial-routes.md).\n\n`;
  md += n ? `**${n} changes.**\n` : '**No changes.**\n';
  const list = (title, rows, fmt) => { if (rows.length) md += `\n## ${title} (${rows.length})\n\n${rows.map((r) => `- ${fmt(r)}`).join('\n')}\n`; };
  list('New tutorials', d.newTutorials, (r) => `\`${r.slug}\`: ${r.title}`);
  list('Removed tutorials', d.removedTutorials, (r) => `\`${r.slug}\`: ${r.title}`);
  list('New chapters', d.added, (r) => `\`${r.slug}\` · ${r.section} · [${r.title}](${r.url})`);
  list('Removed chapters', d.removed, (r) => `\`${r.slug}\` · ${r.section} · ${r.title} (${r.url})`);
  list('Renamed chapters', d.renamed, (r) => `\`${r.slug}\` · "${r.from}" → "${r.to}" (${r.url})`);
  list('Moved to another section', d.moved, (r) => `\`${r.slug}\` · ${r.title}: ${r.from} → ${r.to}`);
  list('Page content changed', d.changed, (r) => {
    const h = [...r.headingsAdded.map((x) => `+ ${x}`), ...r.headingsRemoved.map((x) => `− ${x}`)];
    return `\`${r.slug}\` · [${r.title}](${r.url})${h.length ? `: headings ${h.join('; ')}` : ' (text only, same headings)'}`;
  });
  list('Pages that could not be read', failures, (f) => `${f.url} (${f.status})`);
  return md;
}

/** Days between two YYYY-MM-DD dates. */
export const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
