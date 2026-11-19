// Throwaway spike worker: Pyodide + pandas. `base` = CDN or a self-hosted copy.
let py;
const mark = () => performance.now();
async function boot(base, pkgs) {
  const t0 = mark();
  const { loadPyodide } = await import(/* @vite-ignore */ base + 'pyodide.mjs');
  py = await loadPyodide({ indexURL: base });
  const t1 = mark();
  await py.loadPackage(pkgs);
  const t2 = mark();
  await py.runPythonAsync('import pandas as pd, numpy as np');
  const t3 = mark();
  return { coreMs: t1 - t0, pkgMs: t2 - t1, importMs: t3 - t2 };
}
const res = () =>
  performance.getEntriesByType('resource').map((r) => ({
    name: r.name.split('/').pop(), transfer: r.transferSize, encoded: r.encodedBodySize, decoded: r.decodedBodySize, ms: Math.round(r.duration),
  }));
onmessage = async (e) => {
  const { id, op } = e.data;
  try {
    let ok;
    if (op === 'boot') ok = await boot(e.data.base, e.data.pkgs);
    else if (op === 'more') { const t = mark(); await py.loadPackage(e.data.pkgs); ok = { ms: mark() - t }; }
    else if (op === 'res') ok = res();
    else if (op === 'heap') ok = { wasmHeapMB: py._module.HEAPU8.length / 2 ** 20 };
    else if (op === 'df') {
      // QueryResult { columns, types, rows } -> DataFrame `name`
      const t = mark();
      // JSON text, not toPy: toPy turns JS null into pyodide.ffi.jsnull (not None), which breaks nullable dtypes.
      py.globals.set('_s', JSON.stringify(e.data.q));
      py.runPython(`import json\n_q = json.loads(_s)\n${e.data.name} = pd.DataFrame(_q['rows'], columns=_q['columns']); del _q, _s`);
      ok = { ms: mark() - t, shape: py.runPython(`str(${e.data.name}.shape)`) };
    } else if (op === 'run') {
      const t = mark();
      const out = await py.runPythonAsync(e.data.code);
      const ms = mark() - t;
      ok = { ms, out: out?.toJs ? out.toJs({ dict_converter: Object.fromEntries }) : out };
      out?.destroy?.();
    }
    postMessage({ id, ok });
  } catch (err) {
    postMessage({ id, err: String(err).slice(0, 2000) });
  }
};
