import type { Lang } from '../i18n';

/**
 * V20-B (L176): public sample datasets for "My data" (content/general/datasets.yml, files in public/datasets/).
 * Only the lazy `datasetPanel` chunk (and tests) import this file: no value import from main, the YAML parser is passed in.
 */
export type Bi = Record<Lang, string>;
export interface DatasetQuestion { task: Bi; solution: string; ordered: boolean }
export interface Dataset {
  id: string;
  file: string;
  table: string;
  rows: number;
  title: Bi;
  about: Bi;
  licence: string;
  licence_url: string;
  source_url: string;
  credit: string;
  questions: DatasetQuestion[];
}
export interface Datasets { ui: Record<string, Bi>; datasets: Dataset[] }

/** A plain file name: the fetch can only ever reach `<base>datasets/<file>` on this origin. */
export const DATASET_FILE = /^[a-z0-9_-]+\.csv$/;

const bi = (x: unknown): x is Bi => !!x && typeof (x as Bi).vi === 'string' && typeof (x as Bi).en === 'string';
const str = (x: unknown): x is string => typeof x === 'string' && x.length > 0;

export function parseDatasets(data: unknown): Datasets {
  const y = data as { ui: Record<string, unknown>; datasets: Record<string, unknown>[] };
  if (!y?.ui || !Object.values(y.ui).every(bi)) throw new Error('datasets.yml: bad ui');
  const datasets = (y.datasets ?? []).map((d): Dataset => {
    const qs = d.questions as Record<string, unknown>[];
    const ok = str(d.id) && str(d.file) && DATASET_FILE.test(d.file) && str(d.table) && /^[a-z_][a-z0-9_]*$/.test(d.table) && Number.isInteger(d.rows)
      && bi(d.title) && bi(d.about) && str(d.licence) && str(d.licence_url) && str(d.source_url) && str(d.credit)
      && Array.isArray(qs) && qs.every((q) => bi(q.task) && str(q.solution));
    if (!ok) throw new Error(`datasets.yml: bad dataset ${String(d.id)}`);
    return { ...(d as unknown as Dataset), questions: qs.map((q) => ({ task: q.task as Bi, solution: q.solution as string, ordered: q.ordered === true })) };
  });
  return { ui: y.ui as Record<string, Bi>, datasets };
}

/** Same-origin URL of a dataset file (the app's base path), never anything a CSV or the player typed. */
export function datasetUrl(file: string, base: string = import.meta.env.BASE_URL, origin: string = location.href): URL {
  if (!DATASET_FILE.test(file)) throw new Error(`bad dataset file: ${file}`);
  const url = new URL(`${base}datasets/${file}`, origin);
  if (url.origin !== new URL(origin).origin) throw new Error('dataset must come from this site');
  return url;
}

/** Downloads one sample file from this site; the import path (D3 limits, `_my`, IndexedDB) does the rest. */
export async function fetchDataset(file: string, get: typeof fetch = fetch): Promise<Blob> {
  const res = await get(datasetUrl(file), { credentials: 'omit' });
  if (!res.ok) throw new Error(`dataset ${file}: HTTP ${res.status}`);
  return res.blob();
}
