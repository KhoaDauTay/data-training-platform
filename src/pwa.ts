/**
 * V16-OFFLINE (D-N6, L143): registers the hand-written service worker (public/sw.js; the build adds its file list,
 * scripts/offline.mjs). A new version waits (no automatic skipWaiting, no clients.claim) until the player accepts
 * `onUpdate`'s reload: then it takes over and every open tab reloads, so no tab ever runs an old page on new chunks.
 */
export function registerServiceWorker(onUpdate: (apply: () => void) => void): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  const sw = navigator.serviceWorker;
  const controlled = sw.controller !== null; // the first visit is never taken over, so it never reloads
  let reloading = false;
  sw.addEventListener('controllerchange', () => {
    if (!controlled || reloading) return;
    reloading = true;
    location.reload();
  });
  sw.register(`${import.meta.env.BASE_URL}sw.js`).then(
    (reg) => {
      const offer = (): void => {
        if (reg.waiting && sw.controller) onUpdate(() => reg.waiting?.postMessage('skipWaiting'));
      };
      offer();
      reg.addEventListener('updatefound', () => reg.installing?.addEventListener('statechange', offer));
    },
    () => undefined, // offline support is optional: the app works the same without it
  );
}
