// Offline solo para estáticos (fuentes/iconos). App + online.js siempre red primero.
const VERSION = 'jinetes-v2.6.4-ui';
const PRECACHE = [
    './icon.svg',
    './manifest.webmanifest',
    './waynyan/icon.svg',
    './waynyan/manifest.webmanifest',
    './waynyan/fonts/PressStart2P-Regular.woff2',
    './waynyan/fonts/VT323-Regular.woff2'
];

self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(VERSION).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k.startsWith('jinetes-') && k !== VERSION).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

function networkFirst(req) {
    return fetch(req)
        .then((res) => {
            // No cachear online.js ni HTML de la mesa: multiplayer debe ser fresco
            return res;
        })
        .catch(() => caches.match(req));
}

function cacheFirst(req) {
    return caches.match(req).then((hit) => {
        if (hit) return hit;
        return fetch(req).then((res) => {
            if (res && res.ok) {
                const copy = res.clone();
                caches.open(VERSION).then((c) => c.put(req, copy));
            }
            return res;
        });
    });
}

self.addEventListener('fetch', (e) => {
    const req = e.request;
    if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

    const url = new URL(req.url);
    const path = url.pathname;
    const isStatic =
        path.endsWith('.woff2') ||
        path.endsWith('.woff') ||
        path.endsWith('.svg') ||
        path.endsWith('.png') ||
        path.endsWith('.webp') ||
        path.endsWith('manifest.webmanifest');

    // HTML, CSS, JS (online.js incluido): siempre red. Cache-first solo estáticos.
    if (isStatic) {
        e.respondWith(cacheFirst(req));
        return;
    }

    e.respondWith(networkFirst(req));
});
