// Ticket content and the EN dictionary are lazy in the app (src/content.ts, src/i18n); tests read them synchronously,
// so load them once per test file (Node's navigator.language makes getLang() 'en').
import { loadContent } from '../src/content';
import { loadLang } from '../src/i18n';

await Promise.all([loadContent(), loadLang()]);
