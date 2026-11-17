// Plan 8b: one shared requestAnimationFrame loop for every effect that runs on and on (ships on the map, parallax).
// It never runs under prefers-reduced-motion, pauses while the tab is hidden and while no subscribed picture is on screen.
// Art chunk: no runtime import from main (D8b-2), so reduced motion is read from matchMedia here.

type Frame = (ms: number) => void;
export interface AmbientEnv {
  raf: (f: FrameRequestCallback) => number;
  caf: (id: number) => void;
  reduced: () => boolean;
  /** Calls `cb(true|false)` as `el` enters or leaves the screen; returns the disconnect. */
  observe: (el: Element, cb: (on: boolean) => void) => () => void;
  hidden: () => boolean;
}

const subs = new Map<Frame, { on: boolean }>();
let id = 0;
let envUsed: AmbientEnv | undefined;

/** Runs `frame` every animation frame while `el` is on screen, the tab is visible and motion is allowed. Returns a stop function. */
export function ambient(el: Element, frame: Frame, env: AmbientEnv = browserEnv()): () => void {
  if (env.reduced()) return () => {};
  const s = { on: false };
  subs.set(frame, s);
  const unobserve = env.observe(el, (on) => {
    s.on = on;
    kick(env);
  });
  return () => {
    subs.delete(frame);
    unobserve();
    if (!subs.size && id) {
      env.caf(id);
      id = 0;
    }
  };
}

/** Starts the loop if something is on screen and it is not running yet. */
export function kick(env: AmbientEnv): void {
  envUsed = env;
  if (id || env.hidden() || env.reduced() || ![...subs.values()].some((s) => s.on)) return;
  const tick = (ms: number): void => {
    id = 0;
    if (env.hidden() || env.reduced()) return; // visibilitychange / the media query call kick() again
    let any = false;
    for (const [f, s] of subs) {
      if (!s.on) continue;
      any = true;
      f(ms);
    }
    if (any) id = env.raf(tick);
  };
  id = env.raf(tick);
}

/** Test hook: forget every subscription. */
export function resetAmbient(): void {
  subs.clear();
  id = 0;
}

let browser: AmbientEnv | undefined;
function browserEnv(): AmbientEnv {
  if (browser) return browser;
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const env: AmbientEnv = {
    raf: (f) => requestAnimationFrame(f),
    caf: (n) => cancelAnimationFrame(n),
    reduced: () => mq.matches,
    hidden: () => document.visibilityState === 'hidden',
    observe: (el, cb) => {
      const io = new IntersectionObserver((es) => cb(es.some((e) => e.isIntersecting)), { threshold: 0 });
      io.observe(el);
      return () => io.disconnect();
    },
  };
  document.addEventListener('visibilitychange', () => kick(envUsed ?? env));
  mq.addEventListener('change', () => kick(envUsed ?? env));
  browser = env;
  return env;
}
