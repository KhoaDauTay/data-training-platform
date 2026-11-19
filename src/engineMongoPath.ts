// L247: the MongoDB path ("Lộ trình NoSQL", content/engine/mongodb/path/*.yml, already JSON at build: V22-E) and its rule
// graders, one lazy chunk (budget `enginePath`) loaded by the engine UI on the first path page. The dataset itself
// (dataset.json) loads in the Mongo lab worker as dataset id `path` (src/engine/mongo/engineMongo.ts).
import { pathContent } from './engine/mongo/path';

const raw = import.meta.glob<unknown>('../content/engine/mongodb/path/*.yml', { import: 'default', eager: true });
export const path = pathContent(Object.fromEntries(Object.entries(raw).map(([p, v]) => [p.slice(p.lastIndexOf('/') + 1), v])));
export { followsEsr, isCovered } from './engine/mongo/path';
