import { COLUMN_TYPES, type ColumnType, type Delimiter } from '../db/import';

/** One imported CSV as kept in IndexedDB: the original file plus everything needed to replay it. Never leaves the browser. */
export interface StoredImport {
  table: string;
  fileName: string;
  delimiter: Delimiter;
  columns: string[];
  types: ColumnType[];
  rows: number;
  file: Blob;
}

/** Every method resolves (never rejects): [] / false when storage is unavailable. */
export interface ImportStore {
  list(): Promise<StoredImport[]>;
  put(r: StoredImport): Promise<boolean>;
  remove(table: string): Promise<boolean>;
  clear(): Promise<boolean>;
}

export const IDB_NAME = 'cargo-query';
export const IDB_STORE = 'imports';

const IDENT = /^[a-z_][a-z0-9_]{0,62}$/;
const isIdent = (s: unknown): boolean => typeof s === 'string' && IDENT.test(s);

/** IndexedDB content is outside our control (old versions, devtools edits): keep only well-formed records. */
export function isStoredImport(x: unknown): x is StoredImport {
  const r = x as StoredImport;
  return !!r && typeof r === 'object'
    && isIdent(r.table)
    && typeof r.fileName === 'string'
    && (r.delimiter === ',' || r.delimiter === ';')
    && Array.isArray(r.columns) && r.columns.length > 0 && r.columns.every(isIdent)
    && Array.isArray(r.types) && r.types.length === r.columns.length && r.types.every((t) => COLUMN_TYPES.includes(t))
    && Number.isInteger(r.rows) && r.rows >= 0
    && r.file instanceof Blob;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE, { keyPath: 'table' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('IndexedDB blocked'));
  });
}

async function withStore<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, mode);
      const req = fn(tx.objectStore(IDB_STORE));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
    });
  } finally {
    db.close();
  }
}

/** Browser store. Private windows, blocked storage or a full quota make every call a no-op. */
export function idbStore(): ImportStore {
  return {
    async list() {
      try {
        return (await withStore<unknown[]>('readonly', (s) => s.getAll())).filter(isStoredImport);
      } catch {
        return [];
      }
    },
    async put(r) {
      try {
        await withStore('readwrite', (s) => s.put(r));
        return true;
      } catch {
        return false;
      }
    },
    async remove(table) {
      try {
        await withStore('readwrite', (s) => s.delete(table));
        return true;
      } catch {
        return false;
      }
    },
    async clear() {
      try {
        await withStore('readwrite', (s) => s.clear());
        return true;
      } catch {
        return false;
      }
    },
  };
}

/** Same contract in memory: tests, and a stand-in when nothing should persist. */
export function memoryStore(initial: StoredImport[] = []): ImportStore & { records: Map<string, StoredImport> } {
  const records = new Map(initial.map((r) => [r.table, r]));
  return {
    records,
    list: async () => [...records.values()],
    put: async (r) => (records.set(r.table, r), true),
    remove: async (table) => (records.delete(table), true),
    clear: async () => (records.clear(), true),
  };
}
