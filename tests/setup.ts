// Ticket content is lazy in the app (src/content.ts); tests read it synchronously, so load it once per test file.
import { loadContent } from '../src/content';

await loadContent();
