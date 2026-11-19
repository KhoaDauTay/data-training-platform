import type { Card } from '../dashboard';
import type { QueryResult } from '../db/run';
import type { DomainId } from '../domains';
import { takeHomeMd, zip, type TakeHomeEntry } from '../portfolio';

/**
 * V19-D (L170): card pictures (moved here from meView, L142) and the portfolio archive. A lazy chunk (`portfolioPng`),
 * loaded by meView on the first picture or portfolio click; it imports only types from main modules (Plan 6 U3).
 * Card SQL that reads imported data never reaches this module: meView filters it out first (touchesSandbox).
 */

const STYLE_PROPS = ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'opacity', 'fill-opacity', 'stroke-opacity', 'font-size', 'font-family', 'font-weight', 'text-anchor', 'dominant-baseline'];
/** A chart <svg> copy whose look does not depend on the page's CSS (classes and variables resolved per element). */
function frozenSvg(svg: SVGSVGElement): { text: string; w: number; h: number } {
  const copy = svg.cloneNode(true) as SVGSVGElement;
  const from = [svg, ...svg.querySelectorAll('*')];
  const to = [copy, ...copy.querySelectorAll('*')];
  from.forEach((el, i) => {
    const cs = getComputedStyle(el);
    to[i].setAttribute('style', STYLE_PROPS.map((p) => `${p}:${cs.getPropertyValue(p)}`).join(';'));
    to[i].removeAttribute('class');
  });
  const r = svg.getBoundingClientRect();
  const w = Math.max(1, Math.round(r.width));
  const hgt = Math.max(1, Math.round(r.height));
  copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  copy.setAttribute('width', String(w));
  copy.setAttribute('height', String(hgt));
  return { text: new XMLSerializer().serializeToString(copy), w, h: hgt };
}

/**
 * One card as a PNG (title, what the card shows, `footer`), drawn from a laid-out card: `article` holds a
 * `[data-card-body][data-ready]` with the card's result. undefined = nothing to capture yet.
 */
export async function cardBlob(article: HTMLElement, c: Card, footer: string): Promise<Blob | undefined> {
  const body = article.querySelector<HTMLElement>('[data-card-body][data-ready]'); // a card with a result (not its Run button)
  const chart = c.kind === 'bar' || c.kind === 'line' ? body?.querySelector<SVGSVGElement>(':scope > div > svg') : undefined;
  const table = c.kind === 'table' ? body?.querySelector('table') : undefined;
  const big = c.kind === 'number' ? body?.querySelector('p > span[aria-hidden=true]') : undefined;
  if (!body || (!chart && !table && !big)) return undefined;
  const cs = getComputedStyle(article);
  const bg = cs.backgroundColor;
  const ink = cs.color;
  const muted = getComputedStyle(document.documentElement).getPropertyValue('--muted').trim() || ink;
  const font = "Nunito, 'Segoe UI', system-ui, sans-serif";
  const W = 800;
  const canvas = document.createElement('canvas');
  const g = canvas.getContext('2d');
  if (!g) return undefined;
  let rows: string[][] = [];
  let pic: { img: HTMLImageElement; w: number; h: number } | undefined;
  if (chart) {
    const f = frozenSvg(chart);
    const img = new Image();
    await new Promise<void>((ok, fail) => {
      img.onload = () => ok();
      img.onerror = () => fail(new Error('image'));
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(f.text)}`;
    });
    const k = Math.min(1, (W - 48) / f.w);
    pic = { img, w: f.w * k, h: f.h * k };
  } else if (table) {
    // Header cells: the column name only (not the type line or the screen-reader label); the row-number column is left out.
    const cell = (x: Element): string => (x.tagName === 'TH' ? [...x.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('') : x.textContent ?? '').trim();
    rows = [...table.querySelectorAll('tr')].slice(0, 11).map((tr) => [...tr.querySelectorAll('th,td')].map(cell).slice(1));
  }
  const bodyH = pic ? pic.h : table ? rows.length * 30 + 8 : 80;
  const H = 72 + bodyH + 56;
  const scale = 2;
  canvas.width = W * scale;
  canvas.height = H * scale;
  g.scale(scale, scale);
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  g.fillStyle = ink;
  g.font = `700 22px ${font}`;
  g.fillText(c.title.slice(0, 70), 24, 44);
  if (pic) g.drawImage(pic.img, 24, 64, pic.w, pic.h);
  else if (table) {
    const n = Math.max(1, ...rows.map((r) => r.length));
    const colW = (W - 48) / n;
    rows.forEach((r, i) => {
      g.font = `${i === 0 ? 700 : 400} 15px ${font}`;
      g.fillStyle = i === 0 ? muted : ink;
      r.forEach((cell, j) => {
        let s = cell;
        while (s.length > 1 && g.measureText(s).width > colW - 10) s = `${s.slice(0, -2)}…`;
        g.fillText(s, 24 + j * colW, 92 + i * 30);
      });
    });
  } else if (big) {
    g.font = `800 48px ${font}`;
    g.fillText((big.textContent ?? '').trim().slice(0, 30), 24, 132);
  }
  g.font = `600 13px ${font}`;
  g.fillStyle = muted;
  g.textAlign = 'right';
  g.fillText(footer, W - 24, H - 22);
  return (await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/png'))) ?? undefined;
}

export interface PicDeps {
  /** The card's SQL on the portfolio's domain (queued like any query: 5 s timeout, rolled back). */
  run: (sql: string, dom: DomainId) => Promise<QueryResult>;
  /** ui/dashboard.ts cardBody: what the dashboard draws for a result. */
  cardBody: (c: Card, r: QueryResult) => HTMLElement;
  /** Classes of a dashboard card (its colours are the picture's colours). */
  cardClass: string;
  footer: string;
  /** Called before each card (index from 0), for the progress line. */
  onCard?: (i: number) => void;
}

/**
 * Pictures of `cards` (already filtered: ran on this device, not slow, no imported data), one after another. Each card is
 * run, drawn by the dashboard's own cardBody off screen (laid out, never display:none, so chart sizes are real), captured
 * and removed. A card whose query fails or times out has no picture: the portfolio keeps its SQL only.
 */
export async function cardPictures(dom: DomainId, cards: readonly Card[], deps: PicDeps): Promise<Map<string, Uint8Array>> {
  const out = new Map<string, Uint8Array>();
  for (const [i, c] of cards.entries()) {
    deps.onCard?.(i);
    let r: QueryResult;
    try {
      r = await deps.run(c.sql, dom);
    } catch {
      continue;
    }
    const article = document.createElement('article');
    article.className = deps.cardClass;
    article.setAttribute('aria-hidden', 'true');
    article.style.cssText = 'position:fixed;left:-10000px;top:0;width:752px;pointer-events:none';
    const body = document.createElement('div');
    body.dataset.cardBody = '';
    body.dataset.ready = '';
    body.append(deps.cardBody(c, r));
    article.append(body);
    document.body.append(article);
    try {
      const blob = await cardBlob(article, c, deps.footer);
      if (blob) out.set(c.id, new Uint8Array(await blob.arrayBuffer()));
    } catch {
      // no picture for this card
    } finally {
      article.remove();
    }
  }
  return out;
}

/** The portfolio archive: README.md (GitHub shows it for the folder) and cards/<id>.png. */
export const portfolioZip = (md: string, pics: ReadonlyMap<string, Uint8Array>, at: Date): Blob =>
  new Blob([zip([{ name: 'README.md', data: new TextEncoder().encode(md) }, ...[...pics].map(([id, data]) => ({ name: `cards/${id}.png`, data }))], at) as BlobPart],
    { type: 'application/zip' });

export { takeHomeMd, type TakeHomeEntry };
