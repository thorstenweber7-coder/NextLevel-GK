export function registerServiceWorker() {
  if ('serviceWorker' in navigator && !window.location.host.includes('localhost:')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('NextLevel Coach PWA Service Worker registered:', reg.scope);
        })
        .catch((err) => {
          console.warn('PWA Service Worker registration warning:', err);
        });
    });
  }
}
