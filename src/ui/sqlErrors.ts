import type { SqlErrorInfo } from '../db/run';
import type { Key } from '../i18n';

// Cases SQLSTATE alone cannot tell apart; checked first, on Postgres' English message.
const BY_MESSAGE: [RegExp, Key][] = [
  // Unquoted names are folded to lower case, so a name with capitals or spaces was written in "double quotes".
  [/^column "[^"]*[A-Z\s][^"]*" does not exist/, 'sqlerr.doubleQuote'],
  [/^aggregate functions are not allowed in WHERE/, 'sqlerr.aggWhere'],
  [/^missing FROM-clause entry/, 'sqlerr.missingFrom'],
  [/^cannot insert multiple commands/, 'sqlerr.multi'],
  // date_trunc(booking_date) or date_trunc(booking_date, 'month'): the unit comes first, as a quoted word.
  [/^function date_trunc\(/, 'sqlerr.dateTrunc'],
  // date_trunc(MONTH, …) / extract(MONTH …) read an unquoted unit as a column name.
  [/^column "(year|quarter|month|week|day|hour|minute|second)" does not exist/, 'sqlerr.unitQuote'],
  // Same 42883 code as "date = 5", but here a function got arguments it cannot take.
  [/^function \S+\(.*\) does not exist/, 'sqlerr.fnArgs'],
  [/^each (UNION|INTERSECT|EXCEPT) query must have the same number of columns/, 'sqlerr.setColumns'],
  [/^(UNION|INTERSECT|EXCEPT) types .* cannot be matched/, 'sqlerr.setTypes'],
  [/^subquery has too many columns/, 'sqlerr.subqueryColumns'],
  // 42P10 covers three different mistakes, so they are told apart by message.
  [/^SELECT DISTINCT ON expressions must match initial ORDER BY/, 'sqlerr.distinctOn'],
  [/^for SELECT DISTINCT, ORDER BY expressions must appear in select list/, 'sqlerr.distinctOrder'],
  [/^(ORDER|GROUP) BY position \d+ is not in select list/, 'sqlerr.position'],
  // 42809 is shared with other wrong-object errors; this one is a ranking/LAG function written without OVER.
  [/^window function \S+ requires an OVER clause/, 'sqlerr.windowOver'],
  // 42P20 also covers frame mistakes, so only these messages get the "filter in an outer query" note.
  [/^window functions are not allowed in (WHERE|GROUP BY)/, 'sqlerr.windowWhere'],
  [/^window functions are not allowed in HAVING/, 'sqlerr.windowHaving'],
  [/^RANGE with offset PRECEDING\/FOLLOWING requires exactly one ORDER BY column|^frame (start|end)/, 'sqlerr.windowFrame'],
];

const BY_CODE: Record<string, Key> = {
  '42703': 'sqlerr.42703',
  '42P01': 'sqlerr.42P01',
  '42803': 'sqlerr.42803',
  '42702': 'sqlerr.42702',
  '42601': 'sqlerr.42601',
  '42883': 'sqlerr.42883',
  '22007': 'sqlerr.date',
  '22008': 'sqlerr.date',
  '22012': 'sqlerr.22012',
  '42804': 'sqlerr.42804',
  '22P02': 'sqlerr.22P02',
  '21000': 'sqlerr.21000',
  LAB01: 'sqlerr.labOnly', // runLab (src/db/run.ts): the worker refused anything but one CREATE INDEX
  LAB02: 'sqlerr.labTable', // runLab: the index was on another table than the lab's
};

/** Teaching note shown under Postgres' own message (which is always shown unchanged). */
export function explainError(e: SqlErrorInfo): Key | undefined {
  for (const [re, key] of BY_MESSAGE) if (re.test(e.message)) return key;
  return e.code ? BY_CODE[e.code] : undefined;
}
