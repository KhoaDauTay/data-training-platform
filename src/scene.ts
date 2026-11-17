import type { Ticket } from './tickets';

/** completion-animations.md §2. `promotion` is never declared: it follows from beat: boss. */
export const SCENE_KINDS = ['ship', 'yard', 'customs', 'truck', 'quote', 'ledger', 'chat'] as const;
export type SceneKind = (typeof SCENE_KINDS)[number] | 'promotion';
export type Lane = 'green' | 'yellow' | 'red';
const LANES: readonly Lane[] = ['green', 'yellow', 'red'];
/** What plays when a ticket is first completed. `to`: destination port (ship, or the route of a promotion). */
export interface Scene { kind: SceneKind; to?: string; lane?: Lane }

/**
 * Lanes radiating from Tien Sa (L26), as approved in mockup v5. `opens`: the chapter whose promotion review opens the lane
 * (0 = open from the start); a ship sailing there also opens it (L32). `name` = ports.name in the seed (tests/scene.test.ts). x/y/d/lx/ly: map geometry (viewBox 980×260).
 */
export interface RouteInfo { port: string; name: string; opens: number; days: number; x: number; y: number; d: string; lx: number; ly: number }
/** `days`: about this many days at sea from Tien Sa = ports.base_transit_days (lane list and tooltips, Plan 5). */
export const ROUTES: RouteInfo[] = [
  { port: 'CNSHA', name: 'Shanghai', opens: 0, days: 5, x: 620, y: 80, d: 'M560 132 Q600 100 620 80', lx: 540, ly: 72 },
  { port: 'THLCH', name: 'Laem Chabang', opens: 0, days: 3, x: 515, y: 110, d: 'M560 132 Q540 114 515 110', lx: 410, ly: 132 },
  { port: 'SGSIN', name: 'Singapore', opens: 1, days: 3, x: 540, y: 196, d: 'M560 132 Q580 170 540 196', lx: 452, ly: 214 },
  { port: 'NLRTM', name: 'Rotterdam', opens: 2, days: 30, x: 160, y: 80, d: 'M560 132 Q380 60 160 80', lx: 110, ly: 66 },
  { port: 'KRPUS', name: 'Busan', opens: 3, days: 6, x: 682, y: 62, d: 'M560 132 Q640 74 682 62', lx: 692, ly: 58 },
  { port: 'USLAX', name: 'Los Angeles', opens: 4, days: 20, x: 860, y: 96, d: 'M560 132 Q700 40 860 96', lx: 820, ly: 120 },
  { port: 'AUSYD', name: 'Sydney', opens: 5, days: 16, x: 662, y: 212, d: 'M560 132 Q630 175 662 212', lx: 674, ly: 232 },
];
export const routeOpenedBy = (chapter: number): string | undefined => ROUTES.find((r) => r.opens === chapter && chapter > 0)?.port;

/** Frontmatter `scene:` (§3.1). `fail` comes from parseTicket, so errors carry the file name. */
export function parseScene(v: unknown, boss: boolean, fail: (msg: string) => never): Scene {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return fail('scene phải là { kind, to?, lane? }');
  const o = v as Record<string, unknown>;
  const extra = Object.keys(o).filter((k) => k !== 'kind' && k !== 'to' && k !== 'lane');
  if (extra.length) fail(`scene: khóa lạ ${extra.join(', ')}`);
  if (!(SCENE_KINDS as readonly unknown[]).includes(o.kind)) {
    fail(`scene.kind phải là một trong ${SCENE_KINDS.join(', ')} (promotion tự suy từ beat: boss)`);
  }
  const kind = o.kind as (typeof SCENE_KINDS)[number];
  if (o.lane !== undefined && (kind !== 'customs' || !(LANES as readonly unknown[]).includes(o.lane))) {
    fail('scene.lane chỉ đi với kind: customs, giá trị green | yellow | red');
  }
  if (o.to !== undefined && ((kind !== 'ship' && !boss) || !ROUTES.some((r) => r.port === o.to))) {
    fail(`scene.to chỉ đi với kind: ship hoặc ticket boss, và là một trong ${ROUTES.map((r) => r.port).join(', ')}`);
  }
  return { kind, ...(o.to !== undefined ? { to: o.to as string } : {}), ...(o.lane !== undefined ? { lane: o.lane as Lane } : {}) };
}

/**
 * §3.2, in order: a boss is a promotion (its scene.to picks the ship's route); a declared scene wins; then the sender's
 * department; Ops working on shipments sails without a destination; everything else stacks a container (yard).
 * quote, truck and a destination port cannot be inferred: those tickets declare scene:.
 */
export function sceneOf(t: Ticket): Scene {
  if (t.beat === 'boss') return t.scene?.to ? { kind: 'promotion', to: t.scene.to } : { kind: 'promotion' };
  if (t.scene) return t.scene.kind === 'customs' ? { lane: 'green', ...t.scene } : t.scene;
  if (t.from.dept === 'Customs') return { kind: 'customs', lane: 'green' };
  if (t.from.dept === 'Finance') return { kind: 'ledger' };
  if (t.from.dept === 'CS') return { kind: 'chat' };
  if (t.from.dept === 'Ops' && t.tables.includes('shipments')) return { kind: 'ship' };
  return { kind: 'yard' };
}

/** Everything the harbour and the map show (§7): pure, from the completed ids. Nothing new is saved. */
export interface Harbor {
  /** Completed tickets per chapter: one container each in that chapter's yard bay. */
  bays: Record<number, number>;
  /** Chapters whose promotion review is done. */
  passed: Set<number>;
  /** Open lanes (ROUTES ports): opened by a chapter's promotion, or by the first ship that sails there (L32). */
  open: Set<string>;
  /** Departures per destination port. */
  trips: Record<string, number>;
  /** Departures with no destination (ship without `to`). */
  departures: number;
}

export function derive(tickets: Ticket[], completed: Set<string>): Harbor {
  const h: Harbor = { bays: {}, passed: new Set(), open: new Set(), trips: {}, departures: 0 };
  for (const t of tickets) {
    if (!completed.has(t.id)) continue;
    h.bays[t.chapter] = (h.bays[t.chapter] ?? 0) + 1;
    const sc = sceneOf(t);
    if (sc.kind === 'promotion') h.passed.add(t.chapter);
    const to = sc.kind === 'promotion' ? sc.to ?? routeOpenedBy(t.chapter) : sc.kind === 'ship' ? sc.to : undefined;
    if (to) h.trips[to] = (h.trips[to] ?? 0) + 1;
    else if (sc.kind === 'ship') h.departures++;
  }
  for (const r of ROUTES) if (r.opens === 0 || h.passed.has(r.opens) || h.trips[r.port]) h.open.add(r.port);
  return h;
}

/** Step durations in ms (§2, the mockup's constants). src/ui/stage.ts plays exactly these. */
export const STEPS: Record<SceneKind, readonly number[]> = {
  ship: [2200, 400], // leave the berth (1.6 s) while sailing the lane (2.2 s); berth back + container drop
  yard: [400, 400, 900, 500, 300, 300], // lower, lift, travel, lower, release, trolley home
  customs: [200, 400, 700, 300, 800], // declaration, stamp, truck to gate, [lane wait], barrier, drive through
  truck: [700, 300, 700, 600, 400], // to gate, barrier, through + shutter opens, into CFS, shutter closes
  quote: [300, 500, 600, 500, 400], // show, wait, flip, wait, fade
  ledger: [300, 400, 1000, 500, 400], // show, PAID stamp, coins, wait, fade
  chat: [300, 700, 400, 600, 400], // show, typing, bubble, wait, fade
  promotion: [400, 2600], // last container; then ship + map (2.2 s) with the card (0.4 s) and confetti (2.6 s)
};
/** Customs stops at the gate: yellow = document check, red = physical inspection. */
export const GATE_WAIT: Record<Lane, number> = { green: 0, yellow: 400, red: 600 };

export const durationOf = (sc: Scene): number =>
  STEPS[sc.kind].reduce((a, b) => a + b, 0) + (sc.kind === 'customs' ? GATE_WAIT[sc.lane ?? 'green'] : 0);
