export function registerServiceWorker() {
  if ('serviceWorker' in navigator && !window.location.host.includes('localhost:')) {
    window.addEventListener('load', () => {
      const swUrl = './sw.js';
      navigator.serviceWorker
        .register(swUrl)
        .then((reg) => {
          // Automatically activate newly installed SW versions
          reg.addEventListener('updatefound', () => {
            const installing = reg.installing;
            if (!installing) return;
            installing.addEventListener('statechange', () => {
              if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                installing.postMessage({ type: 'SKIP_WAITING' });
              }
            });
          });
          // Periodically check for updates when trainer re-opens the app
          reg.update().catch(() => {});
        })
        .catch((err) => {
          console.warn('PWA Service Worker registration warning:', err);
        });
    });
  }
}
