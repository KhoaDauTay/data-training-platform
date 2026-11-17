// Ticket content and the EN dictionary are lazy in the app (src/content.ts, src/i18n); tests read them synchronously,
// so load them once per test file. EN is loaded by name: Node's navigator.language follows the machine locale.
import { loadContent, loadGeneral } from '../src/content';
import { loadLang } from '../src/i18n';

await Promise.all([loadContent(), loadLang('en'), loadGeneral()]);
