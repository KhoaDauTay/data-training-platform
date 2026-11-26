// v43 (L720): the Extensions shelf's labs on the lab runtime (see tests/enginePgLabs.ts); one shard, PostGIS labs share one template.
import { pgLabSuite } from './enginePgLabs';

pgLabSuite('EXT', 0, 1);