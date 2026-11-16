import type { SqlErrorInfo } from '../db/run';
import type { Key } from '../i18n';

// Cases SQLSTATE alone cannot tell apart; checked first, on Postgres' English message.
const BY_MESSAGE: [RegExp, Key][] = [
  // Unquoted names are folded to lower case, so a name with capitals or spaces was written in "double quotes".
  [/^column "[^"]*[A-Z\s][^"]*" does not exist/, 'sqlerr.doubleQuote'],
  [/^aggregate functions are not allowed in WHERE/, 'sqlerr.aggWhere'],
  [/^missing FROM-clause entry/, 'sqlerr.missingFrom'],
  [/^cannot insert multiple commands/, 'sqlerr.multi'],
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
};

/** Teaching note shown under Postgres' own message (which is always shown unchanged). */
export function explainError(e: SqlErrorInfo): Key | undefined {
  for (const [re, key] of BY_MESSAGE) if (re.test(e.message)) return key;
  return e.code ? BY_CODE[e.code] : undefined;
}
