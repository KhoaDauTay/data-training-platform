// Regenerates docs/knowledge/database/tutorial-routes.md from tutorial-routes.json (written by crawl-tutorials.mjs).
// Structure only: titles, URLs, order and heading counts; never page text. Run: npm run kb:gen.
import { readFileSync, writeFileSync } from 'node:fs';
import { CORE, OTHER, sortTutorials } from './rules.mjs';

const OUT = new URL('../../docs/knowledge/database/', import.meta.url);
const R = JSON.parse(readFileSync(new URL('tutorial-routes.json', OUT), 'utf8'));
const tuts = sortTutorials(R.tutorials);
const total = tuts.reduce((n, t) => n + t.chapters, 0);
const all = tuts.flatMap((t) => t.sections.flatMap((s) => s.chapters));
const outlined = all.filter((c) => c.outline).length;
const k = R.crawl ?? {};
let md = '# Tutorial route inventory (tutorialspoint database tutorials)\n\n';
md += `Structure only: tutorial → section → chapter title, URL and order from each tutorial's table of contents, plus each chapter page's own h2/h3 heading texts (\`outline\` in the JSON), a hash of the page text and the date it was last read (\`hash\`, \`seen\`), so a later run can tell what changed. No page text, code or paragraph is stored. Machine-readable copy: [tutorial-routes.json](tutorial-routes.json). Last run's changes: [tutorial-changes.md](tutorial-changes.md). Gap analysis: [boondata-gap-map.md](boondata-gap-map.md).\n\n`;
md += `Method: \`npm run kb:crawl\` (\`scripts/kb/crawl-tutorials.mjs\`, see [README.md](README.md#keeping-the-tutorial-inventory-current)), last completed ${R.fetched}. It reads robots.txt first and checks every URL against the rules for its user agent \`${k.ua ?? 'Claude-User'}\` (the site names no rule for it, so the \`User-agent: *\` rules apply; three named AI crawlers are disallowed everything). The index ${R.source} lists the tutorials; \`dbms\` is added by hand. Requests are sequential, ${(k.delayMs ?? 3000) / 1000} s apart. Image-only links to external video training are dropped; links whose title sits after the closing \`</a>\` take it from there (\`note\` in the JSON). Entries the site lists twice are kept as listed.\n\n`;
md += `**${tuts.length} tutorials, ${total} chapters, ${outlined} with a heading outline.**`;
if (k.failures?.length) md += ` ${k.failures.length} chapter pages could not be read on the last run: ${k.failures.map((f) => `${f.url} (${f.status})`).join(', ')}.`;
md += '\n\n| # | Tutorial | Sections | Chapters | In BoonData scope |\n|---|---|---|---|---|\n';
tuts.forEach((t, i) => {
  const scope = CORE.includes(t.slug) ? 'yes (per-chapter gap map)' : `no: ${OTHER[t.slug]?.[1] ?? 'not reviewed yet'}`;
  md += `| ${i + 1} | [${t.title}](#${t.slug}) | ${t.sections.length} | ${t.chapters} | ${scope} |\n`;
});
for (const t of tuts) {
  md += `\n## ${t.slug}\n\n${t.title} · ${t.index} · ${t.chapters} chapters\n\n| # | Section | Chapter | URL | Headings |\n|---|---|---|---|---|\n`;
  for (const s of t.sections) for (const c of s.chapters)
    md += `| ${c.order} | ${s.section} | ${c.title} | ${c.url} | ${c.outline ? c.outline.length : c.error ?? ''} |\n`;
}
writeFileSync(new URL('tutorial-routes.md', OUT), md);
console.log(`routes: ${tuts.length} tutorials, ${total} chapters, ${outlined} outlines`);
