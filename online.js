/* Online: el tablero ES el lobby. Entras → fichas → apuestas → Listo / 1 min. */
(function () {
  'use strict';

  const SUIT_IDS = ['oros', 'copas', 'espadas', 'bastos'];
  const IS_WAYNYAN =
    document.documentElement.dataset.theme === 'waynyan' ||
    /\/waynyan(\/|$)/.test(location.pathname);

  function gameBasePath() {
    const path = location.pathname.replace(/\/index\.html$/, '').replace(/\/+$/, '');
    if (path.endsWith('/waynyan')) return path.slice(0, -'/waynyan'.length) || '/carreras';
    return path || '/carreras';
  }

  function skinPath(skin) {
    const base = gameBasePath();
    return skin === 'waynyan' ? `${base}/waynyan/` : `${base}/`;
  }

  function wsUrl() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${location.host}/carreras/ws`;
  }

  function el(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function suitLabel(s) {
    return (window.SUITS && window.SUITS[s] && window.SUITS[s].name) || s;
  }

  function suitColors(s) {
    const u = window.SUITS && window.SUITS[s];
    return { color: (u && u.color) || '#64748b', dark: (u && u.darkColor) || '#334155' };
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function roomFromUrl() {
    return (new URLSearchParams(location.search).get('room') || '').trim().toUpperCase();
  }

  function money(n) {
    return `$${Number(n || 0).toLocaleString()}`;
  }

  function potBySuitFromPlayers(players) {
    const pot = { oros: 0, copas: 0, espadas: 0, bastos: 0 };
    (players || []).forEach((p) => {
      const bets = p.bets || {};
      SUIT_IDS.forEach((s) => { pot[s] += bets[s] || 0; });
    });
    return pot;
  }

  function betLine(bets) {
    const parts = SUIT_IDS.filter((s) => (bets?.[s] || 0) > 0)
      .map((s) => `${suitLabel(s)} ${money(bets[s])}`);
    return parts.length ? parts.join(' · ') : 'sin apuesta';
  }

  function fmtTimer(sec) {
    if (sec == null || sec < 0) return '--:--';
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, '0')}`;
  }

  function renderCardHtml(card, faceDown, small) {
    if (typeof window.renderCardHtml === 'function') return window.renderCardHtml(card, faceDown, small);
    if (!card) return '';
    return `<div class="card">${escapeHtml(card.name || '')}</div>`;
  }

  class OnlineLobby {
    constructor(game) {
      this.game = game;
      this.ws = null;
      this.room = null;
      this.you = null;
      this.isHost = false;
      this.connected = false;
      this.inRoom = false;
      this.remoteRacing = false;
      this.inviteRoom = roomFromUrl();
      this.players = [];
      this.maxChips = 1000;
      this.yourReady = false;
      this.countdownSec = null;
      this.myName = '';
      this.lastRound = null;
      this.pot = 0;
      this.roundNo = 0;
      this._hooks = false;
      this._leaving = false;
      this._reconnecting = false;
      this._ka = null;
      this.buildUI();
      this.bindGameHooks();
    }

    buildUI() {
      const launchClass = IS_WAYNYAN ? 'ib online-launch' : 'btn-header online-launch';
      const launchInner = IS_WAYNYAN ? '<svg class="ico" aria-hidden="true"><use href="#i-online"/></svg>' : 'ONLINE';
      const invite = this.inviteRoom;

      const panel = el(`
        <div id="online-root">
          <button type="button" id="btn-online" class="${launchClass}" title="Sala online" aria-label="Sala online">${launchInner}</button>

          <div id="online-hud" class="online-hud hidden" aria-live="polite">
            <div class="oh-row oh-top">
              <div class="oh-room">Sala <strong id="oh-code">-----</strong> <span class="oh-round" id="oh-round"></span></div>
              <div class="oh-timer" id="oh-timer" title="Largada automática">${IS_WAYNYAN ? '<svg class="ico" aria-hidden="true"><use href="#i-live"/></svg>' : '⏱'} <span id="oh-timer-num">--:--</span></div>
              <div class="oh-meta">
                <span class="oh-chips" id="oh-chips">Tú $0</span>
                <span class="oh-pot" id="oh-pot">Bote $0</span>
              </div>
            </div>
            <div class="oh-feed" id="oh-feed" aria-live="polite"></div>
            <div class="oh-row oh-players" id="oh-players"></div>
            <div class="oh-last hidden" id="oh-last"></div>
            <p class="oh-hint" id="oh-hint"></p>
            <div id="online-race-slot"></div>
          </div>

          <!-- Acciones de mesa: se montan en el paddock (junto a apostar), no arriba -->
          <div id="online-mesa-actions" class="online-mesa-actions hidden">
            <button type="button" id="oh-copy" class="btn-secondary">Invitar</button>
            <button type="button" id="oh-leave" class="btn-ghost">Salir</button>
            <button type="button" id="oh-ready" class="btn-primary oh-ready btn-largar">Listo</button>
          </div>

          <div id="online-modal" class="modal-overlay online-modal hidden" role="dialog" aria-modal="true">
            <div class="modal-card online-card">
              <div class="modal-header">
                <h3 id="online-title">Online</h3>
                <button type="button" class="btn-close-modal" id="online-close" aria-label="Cerrar">${IS_WAYNYAN ? '<svg class="ico" aria-hidden="true"><use href="#i-x"/></svg>' : '✖'}</button>
              </div>
              <div class="modal-body online-body">
                <div id="online-gate" class="online-gate">
                  <div class="online-gate-actions">
                    <button type="button" id="ol-go-create" class="btn-primary online-gate-btn">Crear sala</button>
                    <button type="button" id="ol-go-join" class="btn-secondary online-gate-btn">Tengo un código</button>
                  </div>
                </div>

                <div id="online-form-host" class="online-panel hidden">
                  <div class="online-grid">
                    <label class="online-field online-span2">Tu nombre
                      <input id="ol-h-name" maxlength="24" placeholder="Anfitrión" autocomplete="nickname" />
                    </label>
                    <label class="online-field online-span2">Fichas por jugador
                      <select id="ol-h-chips">
                        <option value="500">$500</option>
                        <option value="1000" selected>$1.000</option>
                        <option value="2000">$2.000</option>
                        <option value="5000">$5.000</option>
                      </select>
                    </label>
                  </div>
                  <div class="online-actions">
                    <button type="button" id="ol-back-gate-h" class="btn-secondary">Atrás</button>
                    <button type="button" id="ol-create" class="btn-primary">Crear y entrar</button>
                  </div>
                  <p id="ol-status-host" class="online-status" role="status"></p>
                </div>

                <div id="online-form-guest" class="online-panel hidden">
                  <div id="ol-room-badge" class="online-room-badge hidden">Sala <strong id="ol-room-badge-code"></strong></div>
                  <div class="online-grid">
                    <label class="online-field online-span2 hidden" id="ol-code-wrap">Código
                      <input id="ol-g-code" maxlength="5" placeholder="ABC12" style="text-transform:uppercase" autocomplete="off" />
                    </label>
                    <label class="online-field online-span2">Tu nombre
                      <input id="ol-g-name" maxlength="24" placeholder="Tu nombre" autocomplete="nickname" />
                    </label>
                  </div>
                  <div class="online-actions">
                    <button type="button" id="ol-back-gate-g" class="btn-secondary">Atrás</button>
                    <button type="button" id="ol-join" class="btn-primary">Entrar</button>
                  </div>
                  <p id="ol-status-guest" class="online-status" role="status"></p>
                </div>
              </div>
            </div>
          </div>
        </div>`);

      const launchBtn = panel.querySelector('#btn-online');
      const actions = document.querySelector('.header-actions');
      const moreMenu = document.querySelector('.more-menu');
      const soundBtn = document.getElementById('btn-toggle-sound');
      if (actions && moreMenu) {
        actions.insertBefore(launchBtn, moreMenu);
      } else if (actions && soundBtn) {
        actions.insertBefore(launchBtn, soundBtn.nextSibling);
      } else if (actions) {
        actions.appendChild(launchBtn);
      } else {
        const partyBtn = document.getElementById('btn-open-party');
        if (partyBtn && partyBtn.parentElement) partyBtn.parentElement.insertBefore(launchBtn, partyBtn.nextSibling);
        else document.body.appendChild(launchBtn);
      }
      const after = document.querySelector('.commentary-bar') || document.querySelector('.game-header');
      const hud = panel.querySelector('#online-hud');
      if (after && after.parentNode) after.insertAdjacentElement('afterend', hud);
      else document.body.prepend(hud);
      document.body.appendChild(panel.querySelector('#online-modal'));

      // Listo / Invitar / Salir van al paddock (misma zona que apostar)
      const mesa = panel.querySelector('#online-mesa-actions');
      const slot = document.getElementById('paddock-online-slot');
      if (slot && mesa) slot.appendChild(mesa);
      else document.body.appendChild(mesa);

      const style = document.createElement('style');
      style.textContent = `
        .online-launch { letter-spacing:.04em; }
        html[data-theme="waynyan"] body.online-panel-open .main-layout,
        html[data-theme="waynyan"] body.online-panel-open .commentary-bar { display:none; }
        html[data-theme="waynyan"] .online-modal { padding:16px 0; }
        body.online-racing #oh-ready { display:none; }
        #online-race-slot .online-mesa-actions { justify-content:flex-end; }
        @media (max-width:640px) { .oh-players { max-height:128px; overflow-y:auto; } }
        html[data-theme="waynyan"] .online-launch.ib { font-size:.65rem; font-weight:700; min-width:2.2rem; }

        .online-hud {
          margin:6px 10px 0; padding:8px 10px; border-radius:12px;
          border:1px solid #334155; background:rgba(15,23,42,.96); color:#e2e8f0;
          display:flex; flex-direction:column; gap:6px; box-shadow: 0 8px 24px rgba(0,0,0,.25);
        }
        .online-hud.hidden { display:none !important; }
        .oh-row { display:flex; flex-wrap:wrap; gap:6px 10px; align-items:center; }
        .oh-top { justify-content:space-between; font-size:.85rem; }
        .oh-room strong { letter-spacing:.08em; color:#fef08a; }
        .oh-timer {
          font-variant-numeric: tabular-nums; font-weight:700;
          padding:.15rem .5rem; border-radius:999px;
          background:#0f172a; border:1px solid #334155; color:#cbd5e1;
        }
        .oh-timer.armed { color:#fef08a; border-color:#fbbf24; }
        .oh-timer.urgent { background:#7f1d1d; color:#fecaca; border-color:#f87171; animation: oh-pulse 1s ease-in-out infinite; }
        @keyframes oh-pulse { 50% { transform: scale(1.04); } }
        .oh-meta { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
        .oh-chips { font-weight:700; color:#86efac; }
        .oh-pot { font-weight:700; color:#fde68a; padding:.15rem .5rem; border-radius:999px; border:1px solid #854d0e; background:#422006; }
        .oh-round { font-size:.75rem; color:#94a3b8; margin-left:.35rem; }
        .oh-feed {
          font-size:.82rem; line-height:1.35; padding:.35rem .55rem; border-radius:8px;
          background:#0b1220; border:1px solid #1e293b; color:#e2e8f0;
          min-height:1.5em; animation: oh-feed-in .25s ease;
        }
        .oh-feed.flash { outline: 1px solid #fbbf24; }
        @keyframes oh-feed-in { from { opacity:.4; transform:translateY(-2px);} to { opacity:1; transform:none;} }
        .oh-players { gap:8px; display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); }
        .oh-seat {
          display:flex; flex-direction:column; gap:4px;
          padding:.45rem .55rem; border-radius:10px; font-size:.75rem;
          border:1px solid #334155; background:#0f172a; color:#e2e8f0;
        }
        .oh-seat.me { border-color:#38bdf8; box-shadow: inset 0 0 0 1px rgba(56,189,248,.35); }
        .oh-seat.ready { border-color:#16a34a; background:rgba(22,163,74,.14); }
        .oh-seat.broke { opacity:.7; border-style:dashed; }
        .oh-seat-top { display:flex; justify-content:space-between; gap:6px; align-items:baseline; }
        .oh-seat-top strong { font-size:.8rem; }
        .oh-seat .bank { font-weight:700; color:#86efac; font-variant-numeric:tabular-nums; }
        .oh-seat .bets { display:flex; flex-wrap:wrap; gap:3px; min-height:1.1em; }
        .oh-seat .chiplet {
          font-size:.65rem; padding:.1rem .35rem; border-radius:999px;
          background:#1e293b; border:1px solid #475569; color:#cbd5e1;
        }
        .oh-seat .chiplet.oros { border-color:#f59e0b; color:#fde68a; }
        .oh-seat .chiplet.copas { border-color:#ef4444; color:#fecaca; }
        .oh-seat .chiplet.espadas { border-color:#3b82f6; color:#bfdbfe; }
        .oh-seat .chiplet.bastos { border-color:#10b981; color:#a7f3d0; }
        .oh-seat .status { font-size:.68rem; color:#94a3b8; }
        .oh-seat .status.ok { color:#4ade80; font-weight:700; }
        .oh-seat .delta-up { color:#4ade80; }
        .oh-seat .delta-down { color:#f87171; }
        .oh-last {
          font-size:.78rem; padding:.4rem .55rem; border-radius:8px;
          border:1px solid #334155; background:rgba(15,23,42,.9); color:#e2e8f0;
        }
        .oh-last.hidden { display:none !important; }
        .oh-last ul { margin:.25rem 0 0; padding-left:1.1rem; }
        .oh-last li { margin:.1rem 0; }
        .oh-hint:empty, .oh-feed:empty { display:none; }
        .oh-hint { margin:2px 0 0; font-size:.78rem; color:#94a3b8; }
        .online-mesa-actions {
          display:flex; align-items:center; gap:8px; flex-wrap:wrap;
        }
        .online-mesa-actions.hidden,
        .paddock-online-slot.hidden { display:none !important; }
        .online-mesa-actions .oh-ready {
          min-width: 8.5rem; justify-content:center; font-size:1rem; padding:12px 20px;
          order: 3;
        }
        .online-mesa-actions .oh-ready.is-ready { background:#166534; border-color:#166534; }
        .online-mesa-actions #oh-copy { order: 1; }
        .online-mesa-actions #oh-leave { order: 2; }

        body.online-in-room #btn-start-race { display:none !important; }
        body.online-in-room #btn-open-party { display:none !important; }
        body.online-in-room #btn-reload-chips { display:none !important; }
        body.online-in-room #side-deck-section,
        body.online-in-room #race-controls-bar { display:none !important; }
        body.online-in-room .side-panel.online-hide-side { display:none !important; }
        body.online-in-room .main-layout { display:block; max-width:1100px; padding-bottom:8px; }
        body.online-in-room #paddock-panel {
          position: sticky; bottom: 0; z-index: 45;
          max-height: min(58vh, 520px); overflow-y: auto;
          margin: 8px 10px 10px; border: 2px solid #fbbf24 !important;
          box-shadow: 0 -10px 32px rgba(0,0,0,.5);
        }
        body.online-in-room .paddock-footer {
          position: sticky; bottom: 0;
          background: linear-gradient(180deg, rgba(15,23,42,0), #0f172a 35%);
          padding-top: 12px; z-index: 2;
        }
        body.online-in-room .paddock-cta-row {
          display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-left:auto;
        }
        body.online-in-room .track-cell { min-height: 44px !important; }
        body.online-in-room .game-header { gap: 8px; }
        body.online-in-room .header-actions { flex-wrap: nowrap; }
        @media (max-height: 820px) {
          body.online-in-room .game-header { padding-top: 6px; padding-bottom: 6px; }
          body.online-in-room .commentary-bar { font-size: .85rem; }
          body.online-in-room #paddock-panel { max-height: 48vh; }
          body.online-in-room .track-cell { min-height: 40px !important; }
        }
        @media (max-width: 720px) {
          .oh-hint { width: 100%; margin-left: 0; }
          .oh-top { flex-direction: column; align-items: flex-start; gap: 6px; }
          .oh-players { grid-template-columns: 1fr 1fr; }
          body.online-in-room #paddock-panel { max-height: 52vh; margin: 6px; padding: 10px !important; }
          body.online-in-room .chips-list { flex-wrap: wrap; }
          body.online-in-room .paddock-grid { grid-template-columns: 1fr 1fr !important; }
          body.online-in-room .subtitle { display:none; }
        }
        @media (max-width: 640px) {
          body.online-in-room #paddock-cta-row { width:100%; }
          .online-mesa-actions { width:100%; flex-wrap:nowrap; gap:6px; }
          .online-mesa-actions #oh-copy, .online-mesa-actions #oh-leave { font-size:.65rem; padding:10px 8px; min-height:44px; }
          .online-mesa-actions .oh-ready { flex:1; min-width:72px; font-size:.75rem; padding:12px 10px; min-height:44px; }
        }
        @media (max-width: 420px) {
          .oh-players { grid-template-columns: 1fr; }
        }

        .online-card { max-width:380px; width:min(94vw,380px); }
        .online-body { display:flex; flex-direction:column; gap:14px; }
        .online-gate-actions { display:flex; flex-direction:column; gap:10px; }
        .online-gate-btn { width:100%; justify-content:center; }
        .online-grid { display:grid; grid-template-columns:1fr; gap:12px; }
        .online-field { display:flex; flex-direction:column; gap:6px; font-size:.8rem; margin:0; opacity:.9; }
        .online-span2 { grid-column:1 / -1; }
        .online-field input, .online-field select {
          padding:.7rem .75rem; border-radius:10px; border:1px solid #475569; background:#0f172a; color:#f8fafc; font:inherit;
        }
        .online-actions { display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
        .online-actions .btn-primary { margin-left:auto; }
        .online-status { min-height:1.2em; margin:0; color:#f87171; font-size:.85rem; }
        .online-room-badge {
          display:inline-flex; gap:.4rem; padding:.35rem .7rem; border-radius:999px;
          border:1px solid #334155; background:#0f172a; color:#fef08a;
        }
        .online-panel.hidden, .online-gate.hidden, .online-room-badge.hidden, .online-modal.hidden, .hidden { display:none !important; }
        @media (max-width:640px) {
          .oh-hint { width:100%; margin-left:0; }
          .oh-top { font-size:.82rem; }
        }
      `;
      document.head.appendChild(style);

      const menuToggle = document.getElementById('btn-more');
      const menuPanel = document.getElementById('more-menu-panel');
      menuToggle?.addEventListener('click', () => {
        const expanded = menuToggle.getAttribute('aria-expanded') !== 'true';
        menuToggle.setAttribute('aria-expanded', String(expanded));
        menuPanel?.classList.toggle('hidden', !expanded);
      });
      menuPanel?.addEventListener('click', (ev) => {
        if (ev.target.closest('button, a')) {
          menuToggle.setAttribute('aria-expanded', 'false');
          menuPanel.classList.add('hidden');
        }
      });
      document.getElementById('btn-online').addEventListener('click', () => this.open());
      document.getElementById('online-close').addEventListener('click', () => this.closeModal());
      document.getElementById('ol-go-create').addEventListener('click', () => this.showHostForm());
      document.getElementById('ol-go-join').addEventListener('click', () => this.showGuestForm(false));
      document.getElementById('ol-back-gate-h').addEventListener('click', () => this.showGate());
      document.getElementById('ol-back-gate-g').addEventListener('click', () => {
        if (this.inviteRoom) this.closeModal();
        else this.showGate();
      });
      document.getElementById('ol-create').addEventListener('click', () => this.create());
      document.getElementById('ol-join').addEventListener('click', () => this.join());
      document.getElementById('oh-copy').addEventListener('click', () => this.copyLink());
      document.getElementById('oh-leave').addEventListener('click', () => this.leave());
      document.getElementById('oh-ready').addEventListener('click', () => this.toggleReady());

      if (invite) {
        this.showGuestForm(true);
      } else {
        this.showGate();
      }
    }

    setHint(text) {
      const n = document.getElementById('oh-hint');
      if (n) n.textContent = text || '';
    }

    pushFeed(text, kind) {
      const n = document.getElementById('oh-feed');
      if (!n || !text) return;
      n.textContent = text;
      n.dataset.kind = kind || '';
      n.classList.remove('flash');
      void n.offsetWidth;
      n.classList.add('flash');
      const g = this.game || window.game;
      if (kind === 'bet' || kind === 'join' || kind === 'finish' || kind === 'start') {
        g?.setCommentary?.(text);
      }
    }

    setStatus(text, which = 'guest') {
      const id = which === 'host' ? 'ol-status-host' : 'ol-status-guest';
      const n = document.getElementById(id);
      if (n) n.textContent = text || '';
    }

    hidePanels() {
      ['online-gate', 'online-form-host', 'online-form-guest'].forEach((id) => {
        document.getElementById(id)?.classList.add('hidden');
      });
    }

    showGate() {
      this.hidePanels();
      document.getElementById('online-title').textContent = 'Online';
      document.getElementById('online-gate').classList.remove('hidden');
    }

    showHostForm() {
      this.hidePanels();
      document.getElementById('online-title').textContent = 'Crear sala';
      document.getElementById('online-form-host').classList.remove('hidden');
      setTimeout(() => document.getElementById('ol-h-name')?.focus(), 40);
    }

    showGuestForm(fromInvite) {
      this.hidePanels();
      document.getElementById('online-title').textContent = 'Tu nombre';
      document.getElementById('online-form-guest').classList.remove('hidden');
      const badge = document.getElementById('ol-room-badge');
      const codeWrap = document.getElementById('ol-code-wrap');
      const invited = !!(fromInvite || this.inviteRoom);
      if (invited) {
        document.getElementById('ol-g-code').value = this.inviteRoom;
        document.getElementById('ol-room-badge-code').textContent = this.inviteRoom;
        badge.classList.remove('hidden');
        codeWrap.classList.add('hidden');
        document.getElementById('ol-back-gate-g')?.classList.add('hidden');
      } else {
        badge.classList.add('hidden');
        codeWrap.classList.remove('hidden');
        document.getElementById('ol-back-gate-g')?.classList.remove('hidden');
      }
      setTimeout(() => document.getElementById('ol-g-name')?.focus(), 40);
    }

    open() {
      const g = this.game || window.game;
      if (g?.modalRules) g.closePanel(g.modalRules);
      if (this.inRoom) {
        document.getElementById('online-hud')?.classList.remove('hidden');
        return;
      }
      document.getElementById('online-modal').classList.remove('hidden');
      if (IS_WAYNYAN) document.body.classList.add('online-panel-open');
      if (this.inviteRoom) this.showGuestForm(true);
      else this.showGate();
    }

    closeModal() {
      document.getElementById('online-modal').classList.add('hidden');
      document.body.classList.remove('online-panel-open');
    }

    startKeepalive() {
      this.stopKeepalive();
      this._ka = setInterval(() => {
        if (this.ws && this.ws.readyState === 1) {
          try { this.ws.send(JSON.stringify({ type: 'ping', t: Date.now() })); } catch (_) {}
        }
      }, 20000);
    }

    stopKeepalive() {
      if (this._ka) clearInterval(this._ka);
      this._ka = null;
    }

    async ensureWs() {
      if (this.ws && this.ws.readyState === 1) return;
      if (this.ws && this.ws.readyState === 0) {
        await new Promise((resolve, reject) => {
          const prev = this.ws;
          const t = setTimeout(() => reject(new Error('Sin respuesta del server')), 8000);
          prev.addEventListener('open', () => { clearTimeout(t); resolve(); }, { once: true });
          prev.addEventListener('error', () => { clearTimeout(t); reject(new Error('No se pudo conectar')); }, { once: true });
        });
        return;
      }
      await new Promise((resolve, reject) => {
        const ws = new WebSocket(wsUrl());
        const t = setTimeout(() => reject(new Error('Sin respuesta del server')), 8000);
        ws.onopen = () => {
          clearTimeout(t);
          this.ws = ws;
          this.connected = true;
          this.startKeepalive();
          resolve();
        };
        ws.onerror = () => { clearTimeout(t); reject(new Error('No se pudo conectar')); };
        ws.onclose = () => {
          this.connected = false;
          this.stopKeepalive();
          if (this.inRoom && !this._leaving) {
            this.setHint('Se cayó la conexión — reconectando…');
            this.scheduleReconnect();
          } else if (!this._leaving) {
            this.setHint('Desconectado');
          }
        };
        ws.onmessage = (ev) => this.onMessage(ev.data);
      });
    }

    async scheduleReconnect() {
      if (this._reconnecting || this._leaving || !this.inRoom) return;
      this._reconnecting = true;
      const room = this.room;
      const name = this.myName;
      for (let i = 0; i < 8 && this.inRoom && !this._leaving; i++) {
        try {
          await new Promise((r) => setTimeout(r, 600 + i * 400));
          await this.ensureWs();
          if (room && name) {
            this.send({ type: 'join', room, name });
            this.setHint('Reconectado');
            this._reconnecting = false;
            return;
          }
        } catch (_) { /* retry */ }
      }
      this._reconnecting = false;
      this.setHint('No pude reconectar — recarga o Salir');
    }

    send(obj) {
      if (!this.ws || this.ws.readyState !== 1) return false;
      this.ws.send(JSON.stringify(obj));
      return true;
    }

    async sendOrReconnect(obj) {
      if (this.send(obj)) return true;
      this.setHint('Sin conexión — reconectando…');
      await this.scheduleReconnect();
      return this.send(obj);
    }

    async create() {
      try {
        this.setStatus('Creando…', 'host');
        this._leaving = false;
        const name = document.getElementById('ol-h-name').value.trim() || 'Anfitrión';
        this.myName = name;
        await this.ensureWs();
        this.send({
          type: 'create',
          name,
          maxChips: parseInt(document.getElementById('ol-h-chips').value, 10) || 1000,
          steps: 7,
          hurdleRule: 'all_cross',
        });
      } catch (e) {
        this.setStatus(e.message || String(e), 'host');
      }
    }

    async join() {
      try {
        const name = document.getElementById('ol-g-name').value.trim();
        const room = (document.getElementById('ol-g-code').value || this.inviteRoom || '').trim().toUpperCase();
        if (!name) {
          this.setStatus('Escribe tu nombre', 'guest');
          return;
        }
        if (!room) {
          this.setStatus('Falta el código', 'guest');
          return;
        }
        this.setStatus('Entrando…', 'guest');
        this._leaving = false;
        this.myName = name;
        await this.ensureWs();
        this.send({ type: 'join', room, name });
      } catch (e) {
        this.setStatus(e.message || String(e), 'guest');
      }
    }

    toggleReady() {
      if (!this.inRoom || this.remoteRacing) return;
      this.sendOrReconnect({ type: 'ready', ready: !this.yourReady });
    }

    leave() {
      this.bailToSolo();
    }

    bailToSolo() {
      this.inviteRoom = null;
      const u = new URL(location.href);
      u.searchParams.delete('room');
      history.replaceState(null, '', u.pathname + u.search + u.hash);
      this._leaving = true;
      this.stopKeepalive();
      if (this.ws) this.ws.onmessage = null;
      try { this.ws && this.ws.close(); } catch (_) {}
      this.connected = false;
      this.ws = null;
      this.room = null;
      this.you = null;
      this.inRoom = false;
      this.isHost = false;
      this.players = [];
      this.remoteRacing = false;
      this.yourReady = false;
      this.countdownSec = null;
      this._reconnecting = false;
      document.body.classList.remove('online-in-room');
      this.mountMesaActions(false);
      document.getElementById('online-hud')?.classList.add('hidden');
      document.getElementById('online-mesa-actions')?.classList.add('hidden');
      document.getElementById('paddock-online-slot')?.classList.add('hidden');
      document.querySelector('.side-panel')?.classList.remove('online-hide-side');
      this.unhookGame();
      document.getElementById('paddock-panel')?.classList.remove('hidden');
      this.showGate();
      this.closeModal();
      document.getElementById('ol-g-code').value = '';
      const g = this.game || window.game;
      if (g) {
        if (g.autoTimer) clearInterval(g.autoTimer);
        g.autoTimer = null;
        g.closeVictoryModal?.();
        if (this._soloState) {
          g.bankroll = this._soloState.bankroll;
          g.bets = { ...this._soloState.bets };
          if (this._soloState.totalSteps != null) g.totalSteps = this._soloState.totalSteps;
          if (this._soloState.hurdleRule != null) g.hurdleRule = this._soloState.hurdleRule;
          g.lockedBets = { oros: 0, copas: 0, espadas: 0, bastos: 0 };
          this._soloState = null;
        }
        g.resetToBetting?.();
        g.updateBankrollUI?.();
        g.setCommentary?.('Modo local');
      }
    }

    async copyLink() {
      if (!this.room) return;
      const url = `${location.origin}${skinPath(IS_WAYNYAN ? 'waynyan' : 'classic')}?room=${encodeURIComponent(this.room)}`;
      if (navigator.share) {
        try {
          await navigator.share({ title: 'Carrera de Jinetes', url });
          this.setHint('Link listo');
          return;
        } catch (e) {
          if (e.name === 'AbortError') return;
        }
      }
      try {
        await navigator.clipboard.writeText(url);
        this.setHint('Copiado');
      } catch (_) {
        this.setHint(url);
      }
    }

    enterRoomUI(msg) {
      const solo = this.game || window.game;
      if (!this.inRoom && solo) this._soloState = { bankroll: solo.bankroll, bets: { ...solo.bets }, totalSteps: solo.totalSteps, hurdleRule: solo.hurdleRule };
      this.inRoom = true;
      this.room = msg.code;
      this.you = msg.you;
      this.isHost = msg.you === msg.hostId;
      this.maxChips = msg.maxChips || 1000;
      this.closeModal();
      document.body.classList.add('online-in-room');
      document.getElementById('online-hud')?.classList.remove('hidden');
      document.getElementById('online-mesa-actions')?.classList.remove('hidden');
      document.getElementById('paddock-online-slot')?.classList.remove('hidden');
      document.getElementById('oh-code').textContent = msg.code;

      document.getElementById('paddock-panel')?.classList.remove('hidden');
      document.getElementById('race-controls-bar')?.classList.add('hidden');
      document.getElementById('side-deck-section')?.classList.add('hidden');
      document.querySelector('.side-panel')?.classList.add('online-hide-side');
      this.hookGame();
      this.applyRoomState(msg);
      try {
        const u = new URL(location.href);
        u.searchParams.set('room', msg.code);
        history.replaceState(null, '', u.pathname + '?' + u.searchParams.toString());
        this.inviteRoom = msg.code;
      } catch (_) {}
      const g = this.game || window.game;
      g?.setCommentary?.(
        `Sala ${msg.code} · ${money(msg.yourBankroll)}`
      );
      setTimeout(() => {
        document.getElementById('paddock-footer')?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 120);
    }

    applyRoomState(msg) {
      this.players = msg.players || [];
      this.yourReady = !!msg.yourReady;
      this.pot = msg.pot || 0;
      this.roundNo = msg.round || 0;
      if (msg.lastRound) this.lastRound = msg.lastRound;

      const chipsEl = document.getElementById('oh-chips');
      if (chipsEl) chipsEl.textContent = `Tú ${money(msg.yourBankroll)}`;
      const potEl = document.getElementById('oh-pot');
      if (potEl) potEl.textContent = `Bote ${money(this.pot)}`;
      const roundEl = document.getElementById('oh-round');
      if (roundEl) roundEl.textContent = this.roundNo ? `· ronda ${this.roundNo}` : '';

      this.renderPlayers(this.players);
      this.renderLastRound(this.lastRound);
      this.renderReadyBtn();
      this.showCountdown(msg.countdown);

      const g = this.game || window.game;
      if (g && !this.remoteRacing && msg.phase !== 'racing') {
        g.phase = 'betting';
        g.bankroll = msg.yourBankroll || 0;
        g.bets = Object.assign({ oros: 0, copas: 0, espadas: 0, bastos: 0 }, msg.yourBets || {});
        g.potBySuit = potBySuitFromPlayers(this.players);
        g.updateBankrollUI?.();
        g.updateLanePots?.();
        document.getElementById('paddock-panel')?.classList.remove('hidden');
      }

      const n = this.players.filter((p) => p.connected !== false).length || this.players.length;
      const readyN = this.players.filter((p) => p.ready).length;
      if (this.remoteRacing) this.setHint('Carrera en vivo');
      else if (n < 2) this.setHint('Esperando jugadores');
      else if (readyN >= n && n >= 2) this.setHint('Largando…');
      else if (this.countdownSec != null) this.setHint(`${readyN}/${n} listos · bote ${money(this.pot)} · largada en ${fmtTimer(this.countdownSec)}`);
      else this.setHint('');
    }

    renderPlayers(players) {
      const root = document.getElementById('oh-players');
      if (!root) return;
      if (!players.length) {
        root.innerHTML = '';
        return;
      }
      const lastMap = {};
      (this.lastRound && this.lastRound.results || []).forEach((r) => { lastMap[r.id] = r; });

      root.innerHTML = players.map((p) => {
        const bets = p.bets || {};
        const chiplets = SUIT_IDS.filter((s) => (bets[s] || 0) > 0)
          .map((s) => `<span class="chiplet ${s}">${suitLabel(s)} ${money(bets[s])}</span>`)
          .join('') || '<span class="status">sin apuesta</span>';
        const me = p.id === this.you;
        const broke = (p.bankroll || 0) <= 0 && !(p.totalBet > 0);
        const last = lastMap[p.id];
        let delta = '';
        if (last && !this.remoteRacing && last.delta != null && last.spent > 0) {
          const d = last.delta;
          delta = d > 0
            ? `<span class="delta-up">+${money(d)}</span>`
            : d < 0
              ? `<span class="delta-down">${money(d)}</span>`
              : `<span class="status">±0</span>`;
        }
        const st = p.ready
          ? '<span class="status ok">Listo ✓</span>'
          : (p.connected === false ? '<span class="status">offline</span>' : '<span class="status">apostando…</span>');
        return `<div class="oh-seat${me ? ' me' : ''}${p.ready ? ' ready' : ''}${broke ? ' broke' : ''}">
          <div class="oh-seat-top">
            <strong>${escapeHtml(p.name)}${me ? ' (tú)' : ''}${p.host ? ' ★' : ''}</strong>
            <span class="bank">${money(p.bankroll)}${delta ? ` ${delta}` : ''}</span>
          </div>
          <div class="bets">${chiplets}</div>
          ${st}
        </div>`;
      }).join('');
    }

    renderLastRound(lr) {
      const box = document.getElementById('oh-last');
      if (!box) return;
      if (!lr || !lr.results || !lr.results.length) {
        box.classList.add('hidden');
        box.innerHTML = '';
        return;
      }
      const winName = suitLabel(lr.winner);
      const lines = lr.results.map((r) => {
        let tip;
        if (r.refunded) tip = `devuelto ${money(r.prize)}`;
        else if (r.won) tip = `ganó ${money(r.prize)} (Δ ${money(r.delta)})`;
        else if (r.spent > 0) tip = `perdió ${money(r.spent)}`;
        else tip = 'sin apuesta';
        return `<li><strong>${escapeHtml(r.name)}</strong>: ${tip} · queda ${money(r.bankroll)}</li>`;
      }).join('');
      box.classList.remove('hidden');
      box.innerHTML = `<strong>Última carrera</strong> · ganó ${escapeHtml(winName)} · bote ${money(lr.pot)}<ul>${lines}</ul>`;
    }

    renderReadyBtn() {
      const btn = document.getElementById('oh-ready');
      if (!btn) return;
      btn.disabled = this.remoteRacing || this.players.length < 2;
      btn.classList.toggle('is-ready', this.yourReady);
      btn.textContent = 'Listo';
      btn.setAttribute('aria-pressed', String(this.yourReady));
    }

    showCountdown(seconds) {
      this.countdownSec = seconds == null ? null : seconds;
      const wrap = document.getElementById('oh-timer');
      const num = document.getElementById('oh-timer-num');
      if (!wrap || !num) return;
      wrap.classList.remove('armed', 'urgent');
      if (seconds == null) {
        num.textContent = this.players.length < 2 ? 'espera' : '--:--';
        return;
      }
      num.textContent = fmtTimer(seconds);
      wrap.classList.add('armed');
      if (seconds <= 10) wrap.classList.add('urgent');
    }

    hookGame() {
      const g = this.game || window.game;
      if (!g || this._hooks) return;
      this._hooks = true;
      this._orig = {
        placeBet: g.placeBet.bind(g),
        clearBets: g.clearBets.bind(g),
        startRace: g.startRace.bind(g),
        saveBankroll: g.saveBankroll.bind(g),
      };
      g.saveBankroll = () => {};
      g.placeBet = (suit, amount) => {
        if (!this.inRoom || this.remoteRacing) return;
        if (g.phase !== 'betting' && g.phase !== 'finished') {
          /* allow after victory modal while server already lobby */
        }
        g.phase = 'betting';
        if (!amount || amount <= 0) return;
        if ((g.bankroll || 0) < amount) {
          g.setCommentary?.('No te alcanzan las fichas.');
          this.pushFeed('Sin fichas suficientes para esa apuesta', 'error');
          return;
        }
        this.sendOrReconnect({ type: 'bet', suit, amount }).then((ok) => {
          if (!ok) g.setCommentary?.('No hay conexión con la sala. Espera un segundo e intenta de nuevo.');
          else {
            g.setCommentary?.(`Apostando ${money(amount)} a ${suitLabel(suit)}…`);
            this.pushFeed(`Tú → ${money(amount)} a ${suitLabel(suit)}`, 'bet');
          }
        });
      };
      g.clearBets = () => {
        if (!this.inRoom || this.remoteRacing) return;
        this.sendOrReconnect({ type: 'clear_bets' });
      };
      g.startRace = () => {
        if (!this.inRoom) return this._orig.startRace();
        // en online el paddock usa Listo; el botón local queda oculto
        this.sendOrReconnect({ type: 'ready', ready: true });
      };
    }

    unhookGame() {
      const g = this.game || window.game;
      if (!g || !this._hooks || !this._orig) return;
      g.placeBet = this._orig.placeBet;
      g.clearBets = this._orig.clearBets;
      g.startRace = this._orig.startRace;
      g.saveBankroll = this._orig.saveBankroll;
      this._hooks = false;
    }

    bindGameHooks() {
      const wait = () => {
        if (window.game) {
          this.game = window.game;
          return;
        }
        setTimeout(wait, 50);
      };
      wait();
    }

    onMessage(raw) {
      let msg;
      try { msg = JSON.parse(raw); } catch (_) { return; }
      if (this._leaving) return;
      if (msg.type === 'error') {
        if (/sala.*(no encontrada|no existe|cerrada|expirad|llena)|c[oó]digo.*(inv[aá]lid|no existe)|room.*(not found|closed|expired|full)/i.test(msg.message || '')) {
          this.bailToSolo();
          (this.game || window.game)?.setCommentary?.('Sala no disponible. Puedes jugar solo.');
          return;
        }
        this.setStatus(msg.message, document.getElementById('online-form-host')?.classList.contains('hidden') ? 'guest' : 'host');
        this.setHint(msg.message);
        return;
      }
      if (msg.type === 'hello' || msg.type === 'pong') return;
      if (msg.type === 'feed') {
        this.pushFeed(msg.text, msg.kind);
        return;
      }
      if (msg.type === 'countdown') {
        this.showCountdown(msg.seconds);
        if (msg.seconds != null) {
          const ready = msg.ready || 0;
          const players = msg.players || this.players.length;
          this.setHint(`${ready}/${players} listos · bote ${money(this.pot)} · largada en ${fmtTimer(msg.seconds)}`);
          if (msg.seconds === 10 || msg.seconds === 5 || msg.seconds === 3) {
            this.pushFeed(`Largada en ${msg.seconds}…`, 'countdown');
          }
        }
        return;
      }
      if (msg.type === 'room') {
        if (!this.inRoom) this.enterRoomUI(msg);
        else this.applyRoomState(msg);
        return;
      }
      if (msg.type === 'race_start') {
        this.showCountdown(null);
        this.beginRemoteRace(msg);
        return;
      }
      if (msg.type === 'card') { this.applyCard(msg); return; }
      if (msg.type === 'hurdle') { this.applyHurdle(msg); return; }
      if (msg.type === 'reshuffle') {
        if (this.game?.setCommentary) {
          this.game.setCommentary('🔄 Se baraja el descarte');
          this.game.deck.cards = new Array(msg.deckCount || 0).fill(null);
          this.game.updateDeckCountUI?.();
        }
        return;
      }
      if (msg.type === 'finish') this.applyFinish(msg);
    }

    mountMesaActions(racing) {
      document.body.classList.toggle('online-racing', racing);
      const actions = document.getElementById('online-mesa-actions');
      const slot = document.getElementById(racing ? 'online-race-slot' : 'paddock-online-slot');
      if (actions && slot) slot.appendChild(actions);
    }

    beginRemoteRace(msg) {
      const g = this.game || window.game;
      if (!g) return;
      this.remoteRacing = true;
      this.mountMesaActions(true);
      this.yourReady = false;
      this.pot = msg.pot || this.pot;
      this.renderReadyBtn();
      this.players = msg.players || this.players;
      this.renderPlayers(this.players);
      document.getElementById('oh-last')?.classList.add('hidden');
      const potEl = document.getElementById('oh-pot');
      if (potEl) potEl.textContent = `Bote ${money(this.pot)}`;
      const tablePot = potBySuitFromPlayers(this.players);
      g.lockedBets = { ...tablePot };
      g.potBySuit = { ...tablePot };
      g.totalSteps = msg.steps || 7;
      g.hurdleRule = msg.hurdleRule || 'all_cross';
      g.phase = 'racing';
      g.winner = null;
      g.horses = { oros: { suit: 'oros', pos: 0 }, copas: { suit: 'copas', pos: 0 }, espadas: { suit: 'espadas', pos: 0 }, bastos: { suit: 'bastos', pos: 0 } };
      g.drawnCards = [];
      g.discards = [];
      g.suitCounts = { oros: 0, copas: 0, espadas: 0, bastos: 0 };
      g.hurdles = (msg.hurdles || []).map((h) => ({ card: h.card, revealed: false, step: h.step }));
      g.deck.cards = new Array(msg.deckCount || 0).fill(null);
      window.soundEffects?.playBugleCall?.();
      g.setupTrackUI();
      g.potBySuit = { ...tablePot };
      g.updateLanePots?.();
      g.hurdles.forEach((hurdle, idx) => {
        const wrap = document.getElementById(`hurdle-card-${idx + 1}`);
        if (wrap) {
          wrap.innerHTML = renderCardHtml(hurdle.card, true, true);
          wrap.classList.remove('hurdle-trigger-flip');
        }
      });
      document.getElementById('paddock-panel')?.classList.add('hidden');
      document.getElementById('race-controls-bar')?.classList.add('hidden');
      document.getElementById('side-deck-section')?.classList.add('hidden');
      if (g.btnDraw) g.btnDraw.disabled = true;
      if (g.btnAuto) g.btnAuto.disabled = true;
      if (g.btnPause) g.btnPause.disabled = true;
      g.updateDeckCountUI?.();
      g.updateSuitStats?.();
      const potBits = SUIT_IDS.filter((s) => tablePot[s] > 0).map((s) => `${suitLabel(s)} ${money(tablePot[s])}`).join(' · ');
      g.setCommentary?.(`🎺 ¡Largaron! Bote ${money(this.pot)}${potBits ? ` · ${potBits}` : ''}`);
      this.setHint('Carrera en vivo');
      this.pushFeed(`Carrera en curso · bote ${money(this.pot)}`, 'start');
    }

    applyCard(msg) {
      const g = this.game || window.game;
      if (!g || !this.remoteRacing) return;
      const card = msg.card;
      g.discards.push(card);
      g.drawnCards.push(card);
      g.suitCounts[card.suit] = (g.suitCounts[card.suit] || 0) + 1;
      g.deck.cards = new Array(msg.deckCount || 0).fill(null);
      window.soundEffects?.playCardFlip?.();
      window.soundEffects?.playGallop?.();
      g.renderDrawnCard(card);
      g.updateDeckCountUI?.();
      g.updateSuitStats?.();
      SUIT_IDS.forEach((s) => {
        const pos = (msg.horses && msg.horses[s]) || 0;
        const prev = g.horses[s].pos;
        g.horses[s].pos = pos;
        if (pos !== prev) g.animateHorseMove(s, pos, pos > prev ? 'forward' : 'penalty');
      });
      g.generateStepCommentary?.(card, g.horses[card.suit]);
    }

    applyHurdle(msg) {
      const g = this.game || window.game;
      if (!g || !this.remoteRacing) return;
      if (g.hurdles[msg.index]) {
        g.hurdles[msg.index].revealed = true;
        g.hurdles[msg.index].card = msg.card;
      }
      SUIT_IDS.forEach((s) => { g.horses[s].pos = (msg.horses && msg.horses[s]) || 0; });
      const penaltyCard = msg.card;
      const penalizedSuit = penaltyCard.suit;
      const wrap = document.getElementById(`hurdle-card-${msg.index + 1}`);
      if (wrap) {
        wrap.classList.remove('hurdle-trigger-flip');
        void wrap.offsetWidth;
        wrap.classList.add('hurdle-trigger-flip');
        setTimeout(() => { wrap.innerHTML = renderCardHtml(penaltyCard, false, true); }, 300);
      }
      window.soundEffects?.playHurdlePenalty?.();
      g.animateHorseMove(penalizedSuit, g.horses[penalizedSuit].pos, 'penalty');
      g.setCommentary?.(`💥 Valla: ${penaltyCard.name}. ${suitLabel(penalizedSuit)} retrocede.`);
    }

    applyFinish(msg) {
      this.mountMesaActions(false);
      const g = this.game || window.game;
      if (!g) return;
      this.remoteRacing = false;
      SUIT_IDS.forEach((s) => {
        g.horses[s].pos = (msg.horses && msg.horses[s]) || g.horses[s].pos;
      });
      const results = msg.results || [];
      const me = results.find((r) => r.id === this.you);
      const refund = (msg.settleMode || (me && me.mode)) === 'refund';
      const pot = msg.pot != null ? msg.pot : (me && me.pot) || 0;
      this.pot = 0;
      this.roundNo = msg.round || this.roundNo;
      this.lastRound = {
        round: msg.round,
        winner: msg.winner,
        settleMode: msg.settleMode,
        pot,
        results,
      };

      if (me) {
        g.bets = { oros: 0, copas: 0, espadas: 0, bastos: 0 };
        g.bankroll = me.bankroll;
        g.updateBankrollUI?.();
      }

      const winSuit = suitColors(msg.winner);
      const horsePot = potBySuitFromPlayers(results.map((r) => ({ bets: r.bets || {} })));
      g.potBySuit = { ...horsePot };
      g.updateLanePots?.();

      const winners = results.filter((r) => r.won || r.refunded);
      const losers = results.filter((r) => !r.won && !r.refunded && (r.spent || 0) > 0);
      const sitOut = results.filter((r) => !r.won && !r.refunded && !(r.spent > 0));

      const listPeople = (arr, cls) => arr.length
        ? `<ul class="result-people">${arr.map((r) => {
            const mine = r.id === this.you ? ' <em>(tú)</em>' : '';
            let tip;
            if (r.refunded) tip = `devuelto ${money(r.prize)}`;
            else if (r.won) tip = `+${money(r.prize)} (Δ ${money(r.delta)})`;
            else tip = `−${money(r.spent)}`;
            return `<li class="${cls}"><strong>${escapeHtml(r.name)}</strong>${mine}<span>${betLine(r.bets)}</span><span>${tip} · queda ${money(r.bankroll)}</span></li>`;
          }).join('')}</ul>`
        : '<p class="result-empty">Nadie</p>';

      const horseLines = SUIT_IDS.map((s) => {
        const amt = horsePot[s] || 0;
        const mark = s === msg.winner ? ' · GANÓ' : '';
        return `<li class="${s === msg.winner ? 'won' : (amt > 0 ? 'lost' : '')}"><strong>${suitLabel(s)}</strong>: ${money(amt)}${mark}</li>`;
      }).join('');

      let myLine = '';
      if (me) {
        if (me.refunded) myLine = `<div class="victory-prize"><span class="prize-title">Bote devuelto</span><span class="prize-sub">Nadie al ganador · recuperaste ${money(me.prize)} · quedan ${money(me.bankroll)}</span></div>`;
        else if (me.won) myLine = `<div class="victory-prize win"><span class="prize-title">Tú ganaste</span><span class="prize-amount">+${money(me.prize)} · quedan ${money(me.bankroll)} · ibas ${betLine(me.bets)}</span></div>`;
        else if (me.spent > 0) myLine = `<div class="victory-prize loss"><span class="prize-title">Tú perdiste</span><span class="prize-sub">−${money(me.spent)} · quedan ${money(me.bankroll)} · ibas ${betLine(me.bets)}</span></div>`;
        else myLine = `<div class="victory-prize"><span class="prize-title">Sin apuesta</span><span class="prize-sub">Quedan ${money(me.bankroll)}</span></div>`;
      }

      const winTitle = refund ? 'Reembolso' : 'Ganaron';
      const detailsHtml = `
        <div class="winner-hero" style="background:linear-gradient(135deg, ${winSuit.dark || '#334155'}, ${winSuit.color || '#64748b'})">
          <div class="winner-trophy">🏁</div>
          <h2 class="winner-title">Gana ${escapeHtml(suitLabel(msg.winner))}</h2>
          <p class="winner-subtitle">Carrera ${msg.round || ''} · bote ${money(pot)}${refund ? ' · nadie acertó' : ''}</p>
        </div>
        ${myLine}
        <div class="people-results">
          <div class="people-col win"><h4>${winTitle}</h4>${listPeople(winners, 'won')}</div>
          <div class="people-col loss"><h4>Perdieron</h4>${listPeople(losers, 'lost')}</div>
        </div>
        ${sitOut.length ? `<div class="bet-breakdown"><h4>Sin apuesta</h4>${listPeople(sitOut, '')}</div>` : ''}
        <div class="bet-breakdown"><h4>Bote por caballo</h4><ul>${horseLines}</ul></div>
        <p class="winner-subtitle" style="margin-top:12px;opacity:.8">Sigue la mesa: apuesta de nuevo o espera el minuto.</p>
      `;

      const winNames = winners.map((w) => w.name).join(', ');
      const loseNames = losers.map((w) => w.name).join(', ');
      g.handleVictory(msg.winner, {
        skipPayout: true,
        prize: me && me.won ? me.prize : 0,
        lockedBets: horsePot,
        detailsHtml,
        commentary: refund
          ? `Gana ${suitLabel(msg.winner)}. Nadie acertó · bote ${money(pot)} devuelto.`
          : `Gana ${suitLabel(msg.winner)}. Ganaron: ${winNames || '—'}. Perdieron: ${loseNames || '—'}.`,
      });

      // Botón victoria = volver al paddock (server ya está en lobby)
      const btn = document.getElementById('btn-new-race');
      if (btn) btn.textContent = 'Seguir en la mesa';

      this.players = msg.players || this.players;
      this.renderPlayers(this.players);
      this.renderLastRound(this.lastRound);
      this.renderReadyBtn();
      document.getElementById('paddock-panel')?.classList.remove('hidden');
      this.setHint('Nueva ronda');
    }
  }

  function boot() {
    const lobby = window.jinetesOnline = new OnlineLobby(window.game || null);
    const rules = document.getElementById('modal-rules');
    const rulesKey = 'jinetes_rules_seen_v1';
    let seen = false;
    try { seen = localStorage.getItem(rulesKey) === '1'; } catch (_) {}
    const dismiss = () => {
      try { localStorage.setItem(rulesKey, '1'); } catch (_) {}
      if (lobby.inviteRoom && !lobby.inRoom) lobby.open();
    };
    document.querySelectorAll('.btn-close-rules').forEach(btn => btn.addEventListener('click', dismiss));
    if (!seen && rules && window.game) {
      window.game.openPanel(rules);
      const close = rules.querySelector('.btn-close-rules');
      close?.focus();
    } else if (lobby.inviteRoom) {
      lobby.open();
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
