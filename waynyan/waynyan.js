// Ajustes propios de la version waynyan (sin tocar la logica compartida)
document.addEventListener('DOMContentLoaded', () => {
    // Iconos de palo (SVG) en paddock y estadisticas
    document.querySelectorAll('[data-suit-icon]').forEach(el => {
        el.innerHTML = getSuitSvg(el.dataset.suitIcon, 22);
    });

    // Segmentos que controlan los <select> ocultos que usa game.js
    document.querySelectorAll('.seg[data-bind]').forEach(seg => {
        const sel = document.getElementById(seg.dataset.bind);
        seg.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
            if (sel.value === b.dataset.v) return;
            sel.value = b.dataset.v;
            sel.dispatchEvent(new Event('change'));
            seg.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b));
        }));
    });

    // Reverso en el slot de carta al inicio
    const slot = document.getElementById('current-card-slot');
    if (slot && !slot.children.length) slot.innerHTML = renderCardHtml(null, true);

    // Recarga solo visible cuando no quedan fichas
    const reload = document.getElementById('btn-reload-chips');
    const bank = document.getElementById('bankroll-display');
    const syncReload = () => reload.classList.toggle('hidden', window.game && window.game.bankroll >= 10);
    new MutationObserver(syncReload).observe(bank, { childList: true, characterData: true, subtree: true });
    syncReload();
});
