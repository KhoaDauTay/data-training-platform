/**
 * ENG-CORE (L221): diagrams named by a lesson's `viz:` frontmatter. ENG-VIZ fills VIZ with one lazy import per diagram
 * (src/engine/viz/**), e.g. `'btree-split': () => import('./viz/btreeSplit').then((m) => m.mount)`.
 *
 * Contract: `mount` draws into an empty `host` once and returns a cleanup (stop timelines, drop listeners). The page keeps
 * one host per lesson and remounts only when the language or theme changes (cleanup first), so a redraw never replays it.
 * Text goes through `ctx.lang` (the chunk keeps its own VI/EN table); colours are CSS tokens (both themes); under
 * `ctx.reducedMotion` it shows its end frame only. A name missing here draws nothing (the slot stays empty).
 */
export interface VizCtx { lang: 'vi' | 'en'; dark: boolean; reducedMotion: boolean }
export type VizMount = (host: HTMLElement, ctx: VizCtx) => (() => void) | void;

export const VIZ: Record<string, () => Promise<VizMount>> = {};

export const vizLoader = (name: string | undefined): (() => Promise<VizMount>) | undefined => (name && Object.hasOwn(VIZ, name) ? VIZ[name] : undefined);
