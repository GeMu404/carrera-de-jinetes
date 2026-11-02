// Service worker de Carrera de Jinetes: precache de ambas versiones, cache-first.
// Subir VERSION en cada despliegue para invalidar la cache anterior.
const VERSION = 'jinetes-v2.0.0';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './audio.js',
    './deck.js',
    './game.js',
    './icon.svg',
    './manifest.webmanifest',
    './waynyan/',
    './waynyan/index.html',
    './waynyan/waynyan.css',
    './waynyan/waynyan.js',
    './waynyan/icon.svg',
    './waynyan/manifest.webmanifest',
    './waynyan/fonts/PressStart2P-Regular.woff2',
    './waynyan/fonts/VT323-Regular.woff2'
];

self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k.startsWith('jinetes-') && k !== VERSION).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (e) => {
    const req = e.request;
    if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
    e.respondWith(
        caches.match(req, { ignoreSearch: true }).then(hit => {
            const net = fetch(req).then(res => {
                if (res && res.ok) {
                    const copy = res.clone();
                    caches.open(VERSION).then(c => c.put(req, copy));
                }
                return res;
            }).catch(() => hit);
            return hit || net;
        })
    );
});
