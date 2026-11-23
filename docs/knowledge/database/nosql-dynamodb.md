# Amazon DynamoDB

Status: to-verify by execution in this folder. Facts were checked against the AWS Developer Guide pages cited (fetched 2026-11-23). The request shapes match the ones the Engine lessons run on `@dynoxide/wasm-engine` 1.5.0 (`tests/engineIntegration.test.ts`), but the snippets below were not executed here.

Route points: tutorialspoint DynamoDB tutorial, in its order ([tutorial-routes.md](tutorial-routes.md#dynamodb)). Deeper material: `docs/team/db-engine-knowledge.md` §5, `docs/team/best-practice-catalogue.md` (D01–D32), `content/engine/dynamodb/**`.

## 1. Data model

Status: to-verify (docs checked).

- A table holds items; an item is a set of attributes; only the primary key is declared up front (https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.CoreComponents.html).
- Primary key: a **partition key** alone, or partition key + **sort key**. Items with the same partition key form an item collection, stored together and sorted by sort key.
- Types: scalar `S`, `N` (up to 38 digits, sent as a string), `B`, `BOOL`, `NULL`; document `M` (map), `L` (list); sets `SS`, `NS`, `BS` (no empty sets) (https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.NamingRulesDataTypes.html).
- Limits: item ≤ 400 KB including attribute names; partition key value 1–2048 bytes, sort key 1–1024 bytes; nesting ≤ 32 levels (https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Constraints.html).
- No joins, no ad-hoc aggregation: data is shaped for the reads you will make.

## 2. Item operations

Status: to-verify (docs checked).

- `PutItem` (insert or replace the whole item), `GetItem` (by full key), `UpdateItem` (`SET`, `REMOVE`, `ADD`, `DELETE` actions; `if_not_exists`, `list_append`), `DeleteItem` (https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithItems.html).
- **Condition expressions** make writes safe: `attribute_not_exists(pk)` for "create only", a version check for optimistic locking (https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ConditionExpressions.html).
- Names that clash with reserved words need `ExpressionAttributeNames` (`#n`); values go in `ExpressionAttributeValues` (`:v`).
- `ADD` on a number is an atomic counter.
- Batch: `BatchWriteItem` up to 25 put/delete requests (16 MB), `BatchGetItem` up to 100 items (16 MB); unprocessed items come back and must be retried with backoff (Constraints page above).
- Transactions: `TransactWriteItems`/`TransactGetItems`, up to 100 distinct items and 4 MB, two actions may not touch the same item; each transactional item costs twice the capacity (https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html).

```json
{ "op": "UpdateItem", "input": {
  "TableName": "Orders",
  "Key": { "pk": { "S": "CUST#7" }, "sk": { "S": "ORDER#2026-10-31#001" } },
  "UpdateExpression": "SET #s = :new ADD version :one",
  "ConditionExpression": "version = :v",
  "ExpressionAttributeNames": { "#s": "status" },
  "ExpressionAttributeValues": { ":new": { "S": "shipped" }, ":one": { "N": "1" }, ":v": { "N": "3" } } } }
```

(Not run; the `{ op, input }` envelope is BoonData's DynamoDB lab input format, `src/engine/dynamo/request.ts`.)

## 3. Query and Scan

Status: to-verify (docs checked).

- `Query` reads one item collection: `KeyConditionExpression` must name the partition key with `=` and may restrict the sort key (`=`, `<`, `BETWEEN`, `begins_with`) (https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.html).
- `FilterExpression` runs after the read: it shrinks the response, not the capacity consumed (https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.FilterExpression.html).
- `Scan` reads the whole table (or segment); avoid it on hot paths (catalogue D06).
- Each call returns at most 1 MB; continue with `LastEvaluatedKey` → `ExclusiveStartKey`; `Limit` caps items evaluated, not returned (https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.Pagination.html).
- "Aggregation" (counts, sums) is precomputed: atomic counters on write, or a Streams consumer maintaining summary items. `Select: COUNT` still reads and pays for every item.
- PartiQL (`ExecuteStatement`) is SQL-like syntax over the same API; a `SELECT` without a partition-key condition becomes a Scan (https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ql-reference.select.html).

## 4. Secondary indexes

Status: to-verify (docs checked).

- **GSI**: any partition/sort key, own capacity, eventually consistent only, up to 20 per table by default; created any time (https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html).
- **LSI**: same partition key, different sort key; created only with the table; up to 5; strongly consistent reads possible; with an LSI an item collection is limited to 10 GB (https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/LSI.html; quotas: ServiceQuotas.html).
- Projection `KEYS_ONLY`, `INCLUDE`, `ALL` decides what the index stores.
- A **sparse index** holds only items that have the index key attribute; an **overloaded GSI** serves several access patterns with generic key names (https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-indexes-general.html).

## 5. Modelling

Status: to-verify (docs checked).

- List access patterns first, then design keys so each is one `GetItem`/`Query` (https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-general-nosql-design.html).
- Single-table design stores several entity types in one table with prefixed keys (`CUST#7`, `ORDER#…`) so related items share an item collection.
- Partition keys need high cardinality and even traffic; hot keys can be write-sharded with a suffix (https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-sharding.html).
- Hierarchical sort keys (`country#city#store`) allow `begins_with` queries at each level; ISO-8601 timestamps sort correctly as strings.
- Many-to-many: adjacency list with an inverted GSI (https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-adjacency-graphs.html).

## 6. Capacity and consistency

Status: to-verify (docs checked).

- 1 RCU = one strongly consistent read per second of an item up to 4 KB (or two eventually consistent reads); 1 WCU = one write per second up to 1 KB; transactional operations cost double (Constraints page).
- On-demand vs provisioned capacity; default per-table quota 40,000 read and 40,000 write units (https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ServiceQuotas.html).
- Reads are eventually consistent by default; `ConsistentRead: true` on table and LSI reads (https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html).

## 7. Operations

Status: to-verify (docs checked).

- Access control is IAM: policies on tables and indexes, fine-grained conditions such as `dynamodb:LeadingKeys` to restrict a user to their own partition (https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/specifying-conditions.html; catalogue D26). Web identity federation is now usually done through Cognito.
- Backups: on-demand backups and point-in-time recovery (35 days) (https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Point-in-time-recovery.html); deletion protection on the table.
- Change capture: DynamoDB Streams (24 h of item-level changes) or Kinesis Data Streams; TTL deletes expired items in the background, so filter on expiry when reading (https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html).
- Monitoring: CloudWatch metrics (throttles, consumed capacity), Contributor Insights for hot keys; CloudTrail logs control-plane calls.
- Errors: retry throttling and `ProvisionedThroughputExceededException` with exponential backoff and jitter (SDKs do it) (https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Programming.Errors.html).
- AWS Data Pipeline, which older tutorials use for import/export, is closed to new customers; use export to S3 / import from S3 instead (https://docs.aws.amazon.com/datapipeline/latest/DeveloperGuide/what-is-datapipeline.html).

BoonData: Engine `content/engine/dynamodb/L1` … `L5`; `TransactWriteItems`, TTL and Streams ops are refused by the in-browser engine (`unsupported`, CLAUDE.md "DynamoDB runtime"), so lessons on them are concept or PartiQL `ExecuteTransaction` based.

## Sources

Amazon DynamoDB Developer Guide pages cited inline. Coverage suggested by https://www.tutorialspoint.com/dynamodb/index.htm (no text taken).
