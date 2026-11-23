// scripts/kb (tutorial structure sync): pure parsers and the changes diff, on small synthetic HTML written for
// this test (not copied pages). No network.
import { describe, expect, it } from 'vitest';
import { type Chapter, changesMd, diffRoutes, parseIndex, parseOutline, parseToc, robotsAllows, robotsRules } from '../scripts/kb/lib.mjs';

const TOC = `<html><head><title>Widget DB Tutorial</title></head><body>
<ul class="toc chapters">
<li><a class="videolink" href="https://example.com/videos" target="_blank"><img src="v.jpg" alt="Videos"></a></li>
</ul>
<ul class="toc chapters">
<li><a href="/widgetdb/index.htm">Widget DB - Home</a></li>
<li class="heading">Basics &amp; Setup</li>
<li><a href="/widgetdb/widgetdb_install.htm">Widget DB - Install</a></li>
<li><a href="widgetdb_relative.htm">Relative link</a></li>
<li><a href="/widgetdb/widgetdb_after.htm"></a>Widget DB - Title After</li>
</ul>
<ul class="toc chapters">
<li class="heading">Extras</li>
<li><a href="https://www.tutorialspoint.com/widgetdb/widgetdb_guide.htm">Quick Guide</a></li>
</ul></body></html>`;

const PAGE = `<html><body><h2>Explore Categories</h2><main>
<div class="tutorial-content" id="mainContent"><h1>Page title</h1>
<h2 id="a">First <span>part</span></h2><p>body text</p><h3>Sub &amp; more</h3>
<script>var t = Date.now();</script><h4>ignored</h4><h2></h2><h3 class="x">Last</h3>
</div><div class="al-bottom-nav"><h2>Footer heading</h2></div></main></body></html>`;

describe('kb crawl parsers', () => {
  it('reads tutorial slugs from the index, without site pages', () => {
    const html = '<a href="/alpha/index.htm"></a><a href="/about/index.htm"></a><a href="https://www.tutorialspoint.com/beta_db/index.htm"></a><a href="/alpha/index.htm"></a>';
    expect(parseIndex(html)).toEqual(['alpha', 'beta_db']);
  });

  it('parses a table of contents: sections, order, URLs, title after the link, video link dropped', () => {
    const t = parseToc(TOC, 'widgetdb');
    expect(t.title).toBe('Widget DB Tutorial');
    expect(t.sections.map((s) => s.section)).toEqual(['(no heading)', 'Basics & Setup', 'Extras']);
    const all = t.sections.flatMap((s) => s.chapters);
    expect(all.map((c) => c.order)).toEqual([1, 2, 3, 4, 5]);
    expect(all[2].url).toBe('https://www.tutorialspoint.com/widgetdb/widgetdb_relative.htm');
    expect(all[3]).toMatchObject({ title: 'Widget DB - Title After', note: expect.any(String) });
    expect(all[4].url).toBe('https://www.tutorialspoint.com/widgetdb/widgetdb_guide.htm');
    expect(all.some((c) => c.url.includes('example.com'))).toBe(false);
  });

  it('keeps only h2/h3 texts of the article and a hash, never body text', () => {
    const o = parseOutline(PAGE)!;
    expect(o.outline).toEqual(['## First part', '### Sub & more', '### Last']);
    expect(o.hash).toMatch(/^[0-9a-f]{16}$/);
    expect(JSON.stringify(o)).not.toContain('body text');
    expect(parseOutline(PAGE.replace('<p>body text</p>', '<p>other text</p>'))!.hash).not.toBe(o.hash);
    expect(parseOutline(PAGE.replace('Date.now()', 'Math.random()'))!.hash).toBe(o.hash); // scripts do not count
    expect(parseOutline('<html><body>Not found</body></html>')).toBeNull();
  });

  it('applies robots.txt: own group or *, wildcards, longest match', () => {
    const txt = 'User-agent: *\nDisallow: /search/\nDisallow: /*/src/\nAllow: /search/ok$\nUser-agent: GPTBot\nUser-agent: CCBot\nDisallow: /\n';
    const star = robotsRules(txt, 'Claude-User');
    expect(robotsAllows(star, 'https://x.test/sql/index.htm')).toBe(true);
    expect(robotsAllows(star, 'https://x.test/search/q')).toBe(false);
    expect(robotsAllows(star, 'https://x.test/search/ok')).toBe(true);
    expect(robotsAllows(star, 'https://x.test/sql/src/a.htm')).toBe(false);
    expect(robotsAllows(robotsRules(txt, 'CCBot'), 'https://x.test/sql/index.htm')).toBe(false);
    expect(robotsAllows(robotsRules(txt, 'GPTBot'), 'https://x.test/sql/index.htm')).toBe(false);
  });
});

describe('kb crawl changes', () => {
  const ch = (url: string, title: string, extra: Partial<Chapter> = {}): Chapter => ({ order: 1, title, url, ...extra });
  const tut = (slug: string, sections: { section: string; chapters: Chapter[] }[]) => ({ slug, title: slug, index: '', chapters: 0, sections });
  const prev = [
    tut('a', [{ section: 'S1', chapters: [ch('u1', 'One', { hash: 'h1', outline: ['## X'] }), ch('u2', 'Two'), ch('u3', 'Three', { hash: 'h3' })] }]),
    tut('gone', [{ section: 'S', chapters: [ch('g1', 'G')] }]),
  ];
  const next = [
    tut('a', [
      { section: 'S1', chapters: [ch('u1', 'One', { hash: 'h1b', outline: ['## X', '## Y'] }), ch('u2', 'Two renamed', { hash: 'new' })] },
      { section: 'S2', chapters: [ch('u3', 'Three', { hash: 'h3' }), ch('u4', 'Four')] },
    ]),
    tut('fresh', [{ section: 'S', chapters: [ch('f1', 'F')] }]),
  ];

  it('finds new, removed, renamed, moved and changed chapters', () => {
    const d = diffRoutes(prev, next, ['a', 'gone', 'fresh']);
    expect(d.newTutorials.map((t) => t.slug)).toEqual(['fresh']);
    expect(d.removedTutorials.map((t) => t.slug)).toEqual(['gone']);
    expect(d.added.map((c) => c.url)).toEqual(['u4']);
    expect(d.removed).toEqual([]);
    expect(d.renamed).toEqual([{ slug: 'a', url: 'u2', from: 'Two', to: 'Two renamed' }]);
    expect(d.moved.map((c) => c.url)).toEqual(['u3']);
    // u2 had no previous hash: no baseline, so not "changed"
    expect(d.changed).toEqual([{ slug: 'a', url: 'u1', title: 'One', headingsAdded: ['## Y'], headingsRemoved: [] }]);
    expect(changesMd(d, { date: '2026-12-01', prevDate: '2026-11-23', scope: ['a'] })).toContain('## Renamed chapters (1)');
  });

  it('a partial run compares only its own tutorials', () => {
    const d = diffRoutes(prev, next.filter((t) => t.slug === 'a'), ['a']);
    expect(d.removedTutorials).toEqual([]);
    expect(changesMd(diffRoutes(prev, prev, ['a']), { date: 'd', prevDate: 'p', scope: ['a'] })).toContain('**No changes.**');
  });
});
