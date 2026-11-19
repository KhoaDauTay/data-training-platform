// Spike S-a (throwaway). ?schema=game|lab|ecom|fin|all&mode=cold|warm|warmraw|idb
const p = new URLSearchParams(location.search);
const w = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
const t0 = performance.now();
(window as unknown as { __done: Promise<unknown> }).__done = new Promise((res) => {
  w.onmessage = (e) => {
    const r = { ...e.data, pageMs: Math.round(performance.now() - t0) };
    document.getElementById('out')!.textContent = JSON.stringify(r, null, 1);
    res(r);
  };
  w.onerror = (e) => res({ error: String(e.message) });
});
w.postMessage({ schema: p.get('schema'), mode: p.get('mode') });
