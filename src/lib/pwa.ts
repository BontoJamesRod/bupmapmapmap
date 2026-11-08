/** Registers the offline service worker in production builds only (dev stays uncached). */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((err) => console.warn("Offline mode unavailable:", err));
  });
}
