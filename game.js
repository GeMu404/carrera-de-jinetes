// Motor Principal del Juego: Carrera de Jinetes (Baraja Española)
// Compartido por la version clasica (/) y la version waynyan (/waynyan/).

const IS_WAYNYAN = document.documentElement.dataset.theme === 'waynyan';
const EMOJI_RE = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\uFE0F\u20E3]\s?/gu;
// En waynyan no se usan emoji: se quitan de cualquier texto generado
const ui = (str) => IS_WAYNYAN ? str.replace(EMOJI_RE, '').replace(/\s{2,}/g, ' ') : str;
const esc = (v) => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ICON = {
    trophy: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" stroke-linecap="square"><path d="M7 3h10v6a5 5 0 0 1-10 0z"/><path d="M7 5H3v3a4 4 0 0 0 4 4M17 5h4v3a4 4 0 0 1-4 4M12 14v4M8 21h8M9 18h6"/></svg>',
    flag: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"><path d="M5 21V3h13l-3 4 3 4H5"/></svg>',
    rank: (n) => `<svg class="ico ico-rank" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 2h10l5 5v10l-5 5H7l-5-5V7z"/><text x="12" y="16.5" text-anchor="middle" fill="currentColor" stroke="none" font-size="11" font-family="inherit">${n}</text></svg>`
};

class RaceGame {
    constructor() {
        this.deck = new SpanishDeck();
        this.totalSteps = 7; // Casillas de valla (5, 7 o 9)
        this.hurdleRule = 'all_cross'; // 'all_cross' o 'first_reaches'
        this.hurdles = [];
        this.horses = {
            oros: { suit: 'oros', pos: 0 },
            copas: { suit: 'copas', pos: 0 },
            espadas: { suit: 'espadas', pos: 0 },
            bastos: { suit: 'bastos', pos: 0 }
        };

        this.phase = 'betting'; // 'betting', 'racing', 'paused', 'finished'
        this.autoTimer = null;
        this.speed = 1000; // ms entre cartas en modo auto
        this.drawnCards = [];
        this.discards = [];
        this.suitCounts = { oros: 0, copas: 0, espadas: 0, bastos: 0 };
        this.winner = null;

        // Sistema de Apuestas
        this.bankroll = parseInt(localStorage.getItem('jinetes_bankroll'), 10);
        if (!Number.isFinite(this.bankroll) || this.bankroll < 0) this.bankroll = 1000;
        this.bets = { oros: 0, copas: 0, espadas: 0, bastos: 0 };
        this.lockedBets = { oros: 0, copas: 0, espadas: 0, bastos: 0 }; // apuestas de la carrera en curso
        this.potBySuit = { oros: 0, copas: 0, espadas: 0, bastos: 0 }; // lo que se ve en la pista
        this.selectedChip = 50;

        // Modo Fiesta / Multijugador Local
        this.gameMode = 'chips'; // 'chips' o 'party'
        this.partyPlayers = [
            { name: 'Jugador 1', suit: 'oros', stake: 'Paga una ronda' },
            { name: 'Jugador 2', suit: 'copas', stake: '2 sorbos' }
        ];

        // Confeti
        this.confettiCanvas = null;
        this.confettiAnimId = null;

        this.initDOMElements();
        this.setupEventListeners();
        this.setupTrackUI();
        this.updateBankrollUI();
        this.updateSuitStats();
    }

    initDOMElements() {
        this.trackEl = document.getElementById('race-track');
        this.deckPileEl = document.getElementById('deck-pile');
        this.cardDrawSlotEl = document.getElementById('current-card-slot');
        this.commentaryEl = document.getElementById('commentary-text');
        this.deckCountEl = document.getElementById('deck-count');
        this.bankrollEl = document.getElementById('bankroll-display');
        this.btnDraw = document.getElementById('btn-draw-card');
        this.btnAuto = document.getElementById('btn-auto-race');
        this.btnPause = document.getElementById('btn-pause-race');
        this.btnStartRace = document.getElementById('btn-start-race');
        this.confettiCanvas = document.getElementById('confetti-canvas');
        this.modalVictory = document.getElementById('modal-victory');
        this.modalRules = document.getElementById('modal-rules');
        this.modalSettings = document.getElementById('modal-settings');
        this.modalParty = document.getElementById('modal-party');
    }

    setupEventListeners() {
        // Fichas de apuesta
        document.querySelectorAll('.chip-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedChip = parseInt(btn.dataset.amount, 10);
                window.soundEffects.playChip();
            });
        });

        // Botones de apostar a cada caballo
        document.querySelectorAll('.btn-bet-suit').forEach(btn => {
            btn.addEventListener('click', () => {
                const suit = btn.dataset.suit;
                this.placeBet(suit, this.selectedChip);
            });
        });

        // Limpiar apuestas
        document.getElementById('btn-clear-bets').addEventListener('click', () => {
            this.clearBets();
        });

        // All In
        document.getElementById('btn-all-in').addEventListener('click', () => {
            if (this.bankroll <= 0) return;
            const activeSuit = Object.keys(this.bets).find(s => this.bets[s] > 0) || 'oros';
            this.clearBets();
            this.placeBet(activeSuit, this.bankroll);
        });

        // Iniciar Carrera desde Paddock
        this.btnStartRace.addEventListener('click', () => {
            this.startRace();
        });

        // Sacar Carta Manual
        this.btnDraw.addEventListener('click', () => {
            if (this.phase === 'racing' || this.phase === 'paused') {
                this.drawNextCard();
            }
        });

        // Carrera Automática
        this.btnAuto.addEventListener('click', () => {
            this.startAutoRace();
        });

        // Pausa
        this.btnPause.addEventListener('click', () => {
            this.pauseRace();
        });

        // Selector de velocidad
        document.querySelectorAll('.btn-speed').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.btn-speed').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.speed = parseInt(btn.dataset.speed, 10);
                if (this.phase === 'racing' && this.autoTimer) {
                    clearInterval(this.autoTimer);
                    this.autoTimer = setInterval(() => this.drawNextCard(), this.speed);
                }
            });
        });

        // Botón Reiniciar / Nueva Carrera
        document.getElementById('btn-new-race').addEventListener('click', () => {
            this.closeVictoryModal();
            this.resetToBetting();
        });

        document.getElementById('btn-restart-now').addEventListener('click', () => {
            // Confirmacion en el mismo boton (sin dialogos nativos): 2 toques en 3 s
            const b = document.getElementById('btn-restart-now');
            if (!b.classList.contains('armed')) {
                b.classList.add('armed');
                clearTimeout(this._armT);
                this._armT = setTimeout(() => b.classList.remove('armed'), 3000);
                return;
            }
            b.classList.remove('armed');
            this.pauseRace();
            this.resetToBetting(true);
        });

        // Modales - Apertura y Cierre seguro
        const rulesBtn = document.getElementById('btn-open-rules');
        if (rulesBtn) rulesBtn.addEventListener('click', () => this.openPanel(this.modalRules));
        document.querySelectorAll('.btn-close-rules').forEach(btn => {
            btn.addEventListener('click', () => this.closePanel(this.modalRules));
        });

        document.getElementById('btn-open-settings').addEventListener('click', () => {
            if (this.phase !== 'betting') return; // no cambiar la pista a mitad de carrera
            this.openPanel(this.modalSettings);
        });
        document.querySelectorAll('.btn-close-settings').forEach(btn => {
            btn.addEventListener('click', () => this.closePanel(this.modalSettings));
        });

        document.getElementById('btn-open-party').addEventListener('click', () => {
            this.renderPartyPlayersUI();
            this.openPanel(this.modalParty);
        });
        const closeParty = () => {
            this.gameMode = this.partyPlayers.length > 0 ? 'party' : 'chips';
            this.closePanel(this.modalParty);
            this.updatePartyBadge();
        };
        document.querySelectorAll('.btn-close-party').forEach(btn => btn.addEventListener('click', closeParty));
        const partyOff = document.getElementById('btn-party-off');
        if (partyOff) partyOff.addEventListener('click', () => {
            this.gameMode = 'chips';
            this.closePanel(this.modalParty);
            this.updatePartyBadge();
        });

        // Teclado: Espacio/Enter = sacar carta; Escape = cerrar panel
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                [this.modalRules, this.modalSettings].forEach(m => m && this.closePanel(m));
                if (this.modalParty && !this.modalParty.classList.contains('hidden')) closeParty();
                return;
            }
            const tag = (e.target.tagName || '').toLowerCase();
            if ((e.key === ' ' || e.key === 'Enter') && !['input', 'select', 'button', 'textarea', 'a'].includes(tag)) {
                if ((this.phase === 'racing' && !this.autoTimer) || this.phase === 'paused') {
                    e.preventDefault();
                    this.drawNextCard();
                }
            }
        });
        // Clasico: clic fuera de la tarjeta cierra el modal informativo
        [this.modalRules, this.modalSettings].forEach(m => m && m.addEventListener('click', (e) => {
            if (e.target === m) this.closePanel(m);
        }));

        // Alternar Mute
        const btnMute = document.getElementById('btn-toggle-sound');
        btnMute.addEventListener('click', () => {
            const isMuted = window.soundEffects.toggleMute();
            this.syncMuteUI(btnMute, isMuted);
        });
        this.syncMuteUI(btnMute, window.soundEffects.muted);

        // Configuración de vallas y reglas
        document.getElementById('select-hurdles-count').addEventListener('change', (e) => {
            if (this.phase !== 'betting') return;
            this.totalSteps = parseInt(e.target.value, 10);
            this.setupTrackUI();
        });

        document.getElementById('select-hurdle-rule').addEventListener('change', (e) => {
            this.hurdleRule = e.target.value;
        });

        // Añadir jugador en Modo Fiesta
        document.getElementById('btn-add-party-player').addEventListener('click', () => {
            this.partyPlayers.push({
                name: `Amigo ${this.partyPlayers.length + 1}`,
                suit: 'oros',
                stake: '1 trago'
            });
            this.renderPartyPlayersUI();
        });

        // Recargar fichas si está en bancarrota
        document.getElementById('btn-reload-chips').addEventListener('click', () => {
            const total = Object.values(this.bets).reduce((a, b) => a + b, 0);
            if (this.phase !== 'betting' || this.bankroll >= 10 || total > 0) {
                this.setCommentary('La recarga de cortesía es solo para quien quedó sin fichas.');
                return;
            }
            this.bankroll += 500;
            this.saveBankroll();
            this.updateBankrollUI();
            this.setCommentary('¡Recibiste $500 fichas de cortesía del Hipódromo!');
        });
    }

    syncMuteUI(btn, isMuted) {
        if (!IS_WAYNYAN) btn.textContent = isMuted ? '🔇' : '🔊';
        btn.classList.toggle('muted', isMuted);
        btn.setAttribute('aria-pressed', String(isMuted));
        btn.setAttribute('aria-label', isMuted ? 'Activar sonido' : 'Silenciar');
        btn.title = isMuted ? 'Activar sonido' : 'Silenciar';
    }

    // Paneles: en clasico son modales; en waynyan reemplazan el contenido en el lugar (CSS)
    openPanel(el) {
        if (!el) return;
        el.classList.remove('hidden');
        document.body.classList.add('has-panel');
    }

    closePanel(el) {
        if (!el) return;
        el.classList.add('hidden');
        if (!document.querySelector('.modal-overlay:not(.hidden)')) document.body.classList.remove('has-panel');
    }

    updatePartyBadge() {
        const badge = document.getElementById('party-mode-indicator');
        if (badge) {
            if (this.gameMode === 'party' && this.partyPlayers.length > 0) {
                badge.classList.remove('hidden');
                badge.textContent = IS_WAYNYAN ? `${this.partyPlayers.length}` : `🍻 Modo Fiesta Activo (${this.partyPlayers.length} jugadores)`;
            } else {
                badge.classList.add('hidden');
            }
        }
    }

    placeBet(suit, amount) {
        if (this.phase !== 'betting') return;
        if (amount <= 0) return;

        if (this.bankroll < amount) {
            this.setCommentary('¡No tienes suficientes fichas para esta apuesta!');
            return;
        }

        this.bankroll -= amount;
        this.bets[suit] += amount;
        this.saveBankroll();
        this.updateBankrollUI();
        window.soundEffects.playChip();
        this.setCommentary(`Apostaste $${amount} al caballo de ${SUITS[suit].name}. ¡Total en este caballo: $${this.bets[suit]}!`);
    }

    clearBets() {
        if (this.phase !== 'betting') return;
        const totalRefund = this.bets.oros + this.bets.copas + this.bets.espadas + this.bets.bastos;
        this.bankroll += totalRefund;
        this.bets = { oros: 0, copas: 0, espadas: 0, bastos: 0 };
        this.saveBankroll();
        this.updateBankrollUI();
        window.soundEffects.playChip();
        this.setCommentary('Apuestas canceladas y fichas devueltas.');
    }

    saveBankroll() {
        localStorage.setItem('jinetes_bankroll', this.bankroll.toString());
    }

    updateBankrollUI() {
        this.bankrollEl.textContent = `$${this.bankroll.toLocaleString()}`;
        document.querySelectorAll('.suit-bet-amount').forEach(el => {
            const suit = el.dataset.suit;
            el.textContent = `$${this.bets[suit]}`;
        });

        const totalBets = this.bets.oros + this.bets.copas + this.bets.espadas + this.bets.bastos;
        const totalEl = document.getElementById('total-bet-display');
        if (totalEl) totalEl.textContent = `$${totalBets}`;

        // En paddock el pot de pista = tus apuestas (online lo pisa con el bote de la mesa)
        if (this.phase === 'betting') {
            this.potBySuit = { ...this.bets };
            this.updateLanePots();
        }
    }

    updateLanePots() {
        ['oros', 'copas', 'espadas', 'bastos'].forEach((suitId) => {
            const el = document.getElementById(`lane-pot-${suitId}`);
            if (!el) return;
            const amt = this.potBySuit[suitId] || 0;
            el.textContent = amt > 0 ? `$${amt.toLocaleString()}` : '—';
            el.classList.toggle('has-pot', amt > 0);
        });
    }

    // Configura la cuadrícula visual de la pista (Alineación perfecta por CSS Grid variables)
    setupTrackUI() {
        this.trackEl.innerHTML = '';
        this.trackEl.style.setProperty('--steps-count', this.totalSteps);

        // Cabecera de etapas / metros (Columna 1: JINETES, Columna 2: SALIDA, Columnas 3..N+2: Vallas, Columna N+3: META)
        const stepsHeader = document.createElement('div');
        stepsHeader.className = 'track-steps-header';
        
        let headerHtml = `<div class="step-cell step-lane-label">JINETES / PALO</div>`;
        headerHtml += `<div class="step-cell step-start-label">SALIDA (0)</div>`;
        for (let i = 1; i <= this.totalSteps; i++) {
            headerHtml += `<div class="step-cell step-num-label">Valla ${i}</div>`;
        }
        headerHtml += `<div class="step-cell step-finish-label">🏁 META</div>`;
        stepsHeader.innerHTML = ui(headerHtml);
        this.trackEl.appendChild(stepsHeader);

        // Fila de Cartas de Valla / Obstáculos (Columna 1: Título, Columna 2: Vacía, Columnas 3..N+2: Cartas, Columna N+3: Disco)
        const hurdlesRow = document.createElement('div');
        hurdlesRow.className = 'track-hurdles-row';
        
        let hurdlesHtml = `<div class="hurdle-cell hurdle-placeholder"><span>🚧 VALLAS:</span></div>`;
        hurdlesHtml += `<div class="hurdle-cell hurdle-empty-start"><span>—</span></div>`;
        
        for (let i = 1; i <= this.totalSteps; i++) {
            hurdlesHtml += `
            <div class="hurdle-cell" id="hurdle-slot-${i}">
                <div class="hurdle-card-wrapper" id="hurdle-card-${i}">
                    ${renderCardHtml(null, true, true)}
                </div>
                <span class="hurdle-label">${IS_WAYNYAN ? i : `Valla ${i}`}</span>
            </div>`;
        }
        hurdlesHtml += `<div class="hurdle-cell hurdle-finish-banner"><span>🏆 DISCO</span></div>`;
        hurdlesRow.innerHTML = ui(hurdlesHtml);
        this.trackEl.appendChild(hurdlesRow);

        // 4 Carriles para los 4 Palos
        const suitsList = ['oros', 'copas', 'espadas', 'bastos'];
        suitsList.forEach(suitId => {
            const suit = SUITS[suitId];
            const lane = document.createElement('div');
            lane.className = `track-lane lane-${suitId}`;
            lane.id = `lane-${suitId}`;

            // Etiqueta del carril + bote apostado a ese jinete
            let laneHtml = `
            <div class="lane-info" style="border-left-color: ${suit.color}">
                <div class="lane-suit-icon">${getSuitSvg(suitId, 24)}</div>
                <div class="lane-details">
                    <span class="lane-name">${suit.name.toUpperCase()}</span>
                    <span class="lane-horse-name">${suit.horseName}</span>
                    <span class="lane-pot" id="lane-pot-${suitId}" title="Apuestas a este caballo">—</span>
                </div>
            </div>`;

            // Casillas del carril (Columna 2..N+3)
            laneHtml += `<div class="lane-track-cells" id="lane-cells-${suitId}">`;
            
            // Celda 0 (Salida)
            laneHtml += `<div class="track-cell cell-0 start-box" data-step="0">
                <span class="cell-marker">Salida</span>
            </div>`;
            
            // Celdas intermedias (1 .. totalSteps)
            for (let s = 1; s <= this.totalSteps; s++) {
                laneHtml += `<div class="track-cell cell-${s}" data-step="${s}">
                    <span class="cell-marker">${s}</span>
                </div>`;
            }

            // Celda de Meta
            laneHtml += `<div class="track-cell cell-finish" data-step="${this.totalSteps + 1}">
                <div class="finish-line-pattern"></div>
                <span class="cell-marker meta-marker">${IS_WAYNYAN ? ICON.flag : '🏆'}</span>
            </div>`;

            laneHtml += `</div>`;

            lane.innerHTML = laneHtml;
            this.trackEl.appendChild(lane);
        });

        // Colocar los 4 jinetes en la casilla 0
        suitsList.forEach(suitId => {
            this.renderHorseAt(suitId, 0);
        });
        this.updateLanePots();
    }

    renderHorseAt(suitId, pos) {
        const laneCells = document.getElementById(`lane-cells-${suitId}`);
        if (!laneCells) return;

        // Eliminar jinete existente si hubiera
        const existing = laneCells.querySelector('.horse-runner-container');
        if (existing) existing.remove();

        const targetCell = laneCells.querySelector(`[data-step="${pos}"]`);
        if (targetCell) {
            targetCell.innerHTML += getHorseRunnerSvg(suitId);
        }
    }

    // Comienza la carrera (reparto de cartas, vallas y fanfarria)
    startRace() {
        const totalBets = this.bets.oros + this.bets.copas + this.bets.espadas + this.bets.bastos;
        // Sin apuestas = carrera de exhibicion (sin dialogo bloqueante)
        if (this.phase !== 'betting') return;

        this.phase = 'racing';
        window.soundEffects.playBugleCall();

        // Congelar apuestas visibles en la pista durante la carrera
        this.lockedBets = {
            oros: this.bets.oros,
            copas: this.bets.copas,
            espadas: this.bets.espadas,
            bastos: this.bets.bastos
        };
        this.potBySuit = { ...this.lockedBets };

        // Preparar mazo
        this.deck.reset();
        this.deck.shuffle();
        this.deck.extractHorses(); // Los 4 caballos están en las gateras

        // Colocar vallas
        this.hurdles = this.deck.dealHurdles(this.totalSteps);

        // Resetear posiciones
        this.horses = {
            oros: { suit: 'oros', pos: 0 },
            copas: { suit: 'copas', pos: 0 },
            espadas: { suit: 'espadas', pos: 0 },
            bastos: { suit: 'bastos', pos: 0 }
        };

        this.drawnCards = [];
        this.discards = [];
        this.suitCounts = { oros: 0, copas: 0, espadas: 0, bastos: 0 };
        this.winner = null;

        // Renderizar pista y cartas de valla boca abajo
        this.setupTrackUI();
        this.hurdles.forEach((hurdle, idx) => {
            const hurdleWrapper = document.getElementById(`hurdle-card-${idx + 1}`);
            if (hurdleWrapper) {
                hurdleWrapper.innerHTML = renderCardHtml(hurdle.card, true, true);
                hurdleWrapper.classList.remove('hurdle-trigger-flip');
            }
        });

        // Mostrar u ocultar paneles
        document.getElementById('paddock-panel').classList.add('hidden');
        document.getElementById('race-controls-bar').classList.remove('hidden');
        document.getElementById('side-deck-section').classList.remove('hidden');

        this.updateDeckCountUI();
        this.updateSuitStats();
        this.updateLanePots();

        this.setCommentary('🎺 ¡TOQUE DE CORNETA! ¡Se abren las gateras y los cuatro jinetes están listos para la largada!');
        
        // Habilitar botones
        this.btnDraw.disabled = false;
        this.btnAuto.disabled = false;
        this.btnPause.disabled = false;
        document.getElementById('btn-open-settings').disabled = true;
        if (totalBets === 0 && this.gameMode === 'chips') {
            this.setCommentary('Carrera de exhibición: sin apuestas en juego. ¡Se abren las gateras!');
        }
    }

    // Roba y procesa la siguiente carta de la carrera
    drawNextCard() {
        if (this.phase !== 'racing' && this.phase !== 'paused') return;

        // Si el mazo se agotó, barajar el descarte
        if (this.deck.count === 0) {
            if (this.discards.length === 0) {
                this.setCommentary('¡Sin cartas restantes en el mazo!');
                this.pauseRace();
                return;
            }
            this.setCommentary('🔄 ¡Se baraja el pozo de descarte para continuar la carrera!');
            this.deck.reshuffleFromDiscards(this.discards);
            this.discards = [];
        }

        const card = this.deck.draw();
        if (!card) return;

        this.discards.push(card);
        this.drawnCards.push(card);
        this.suitCounts[card.suit] = (this.suitCounts[card.suit] || 0) + 1;

        // Sonidos y animación de carta
        window.soundEffects.playCardFlip();
        window.soundEffects.playGallop();

        this.renderDrawnCard(card);
        this.updateDeckCountUI();
        this.updateSuitStats();

        // Mover el caballo correspondiente hacia adelante
        const horse = this.horses[card.suit];
        horse.pos += 1;
        this.animateHorseMove(card.suit, horse.pos, 'forward');

        // Relato de la jugada
        this.generateStepCommentary(card, horse);

        // Si cruzó la meta gana de inmediato (las vallas ya no le afectan)
        if (horse.pos > this.totalSteps) {
            this.handleVictory(card.suit);
            return;
        }

        // Verificar si se activan vallas (obstáculos)
        this.checkHurdles();
    }

    renderDrawnCard(card) {
        this.cardDrawSlotEl.innerHTML = `
            <div class="drawn-card-animation">
                ${renderCardHtml(card, false)}
            </div>
            <div class="drawn-card-label" style="color: ${SUITS[card.suit].color}">
                ${card.name}
            </div>
        `;
    }

    animateHorseMove(suitId, pos, direction = 'forward') {
        const laneCells = document.getElementById(`lane-cells-${suitId}`);
        if (!laneCells) return;

        const container = laneCells.querySelector('.horse-runner-container');
        if (container) {
            container.classList.add(direction === 'forward' ? 'horse-advancing' : 'horse-retreating');
            setTimeout(() => {
                // usar la posición actual del estado (evita saltos con cartas rápidas/turbo)
                this.renderHorseAt(suitId, this.horses[suitId].pos);
                const newContainer = laneCells.querySelector('.horse-runner-container');
                if (newContainer && direction === 'penalty') {
                    newContainer.classList.add('horse-penalized-flash');
                }
            }, 250);
        } else {
            this.renderHorseAt(suitId, pos);
        }
    }

    // Regla de Vallas: verifica si se debe voltear una carta de obstáculo
    checkHurdles() {
        this.hurdles.forEach((hurdle, idx) => {
            if (hurdle.revealed) return; // ya revelada

            const hurdleStep = hurdle.step;
            let shouldTrigger = false;

            if (this.hurdleRule === 'all_cross') {
                // Todos los caballos deben haber alcanzado o superado este escalón
                const allPassed = Object.values(this.horses).every(h => h.pos >= hurdleStep);
                if (allPassed) shouldTrigger = true;
            } else {
                // 'first_reaches': el primero en pisar la valla la activa
                const anyReached = Object.values(this.horses).some(h => h.pos >= hurdleStep);
                if (anyReached) shouldTrigger = true;
            }

            if (shouldTrigger) {
                hurdle.revealed = true;
                this.triggerHurdlePenalty(hurdle, idx);
            }
        });
    }

    // Al activarse una valla, se voltea la carta y penaliza al caballo de ese palo
    triggerHurdlePenalty(hurdle, idx) {
        const penaltyCard = hurdle.card;
        const penalizedSuit = penaltyCard.suit;
        const horse = this.horses[penalizedSuit];

        // Animación de flip en la carta de la valla
        const hurdleWrapper = document.getElementById(`hurdle-card-${idx + 1}`);
        if (hurdleWrapper) {
            // Volteo: gira hasta 90°, cambia a la cara y vuelve (antes quedaba espejada a 180°)
            hurdleWrapper.classList.remove('hurdle-trigger-flip');
            void hurdleWrapper.offsetWidth;
            hurdleWrapper.classList.add('hurdle-trigger-flip');
            setTimeout(() => { hurdleWrapper.innerHTML = renderCardHtml(penaltyCard, false, true); }, 300);
        }

        // Sonido de tropiezo / penalización
        window.soundEffects.playHurdlePenalty();

        // Retroceder un paso (sin bajar de 0)
        horse.pos = Math.max(0, horse.pos - 1);

        this.animateHorseMove(penalizedSuit, horse.pos, 'penalty');

        // Mostrar cartel de penalización
        // Aviso en el lugar (la etiqueta de la valla), sin popup flotante encima de la pista
        const slotEl = document.getElementById(`hurdle-slot-${idx + 1}`);
        if (slotEl) {
            slotEl.classList.add('hurdle-hit', `hit-${penalizedSuit}`);
            const lbl = slotEl.querySelector('.hurdle-label');
            if (lbl) lbl.textContent = `-1 ${SUITS[penalizedSuit].name}`;
        }
        const lane = document.getElementById(`lane-${penalizedSuit}`);
        if (lane) {
            lane.classList.remove('lane-hit');
            void lane.offsetWidth;
            lane.classList.add('lane-hit');
        }

        this.setCommentary(
            `💥 ¡VALLA ${hurdle.step} REVELADA! Salió el ${penaltyCard.name}. ` +
            `¡El jinete de ${SUITS[penalizedSuit].name} tropezó con el obstáculo y RETROCEDE a la casilla ${horse.pos}!`
        );
    }

    handleVictory(winningSuit, opts = {}) {
        this.phase = 'finished';
        this.winner = winningSuit;
        this.pauseRace();

        window.soundEffects.playVictory();
        this.startConfetti();

        const snap = opts.lockedBets || this.lockedBets || { ...this.bets };
        const userBet = snap[winningSuit] || 0;
        const totalBet = (snap.oros || 0) + (snap.copas || 0) + (snap.espadas || 0) + (snap.bastos || 0);
        const multiplier = 4.0;
        let prize = Math.round(userBet * multiplier);

        // Online ya liquidó el bote en el server: no volver a pagar 4x local
        if (opts.skipPayout) {
            prize = opts.prize != null ? opts.prize : 0;
            this.bets = { oros: 0, copas: 0, espadas: 0, bastos: 0 };
        } else {
            if (userBet > 0) this.bankroll += prize;
            this.bets = { oros: 0, copas: 0, espadas: 0, bastos: 0 };
            this.saveBankroll();
        }
        this.updateBankrollUI();
        this.btnDraw.disabled = true;
        this.btnAuto.disabled = true;

        const ranking = Object.values(this.horses)
            .sort((a, b) => (b.suit === winningSuit) - (a.suit === winningSuit) || b.pos - a.pos);

        if (opts.detailsHtml) {
            const modalContent = document.getElementById('victory-details');
            if (modalContent) modalContent.innerHTML = ui(opts.detailsHtml);
            this.openPanel(this.modalVictory);
        } else {
            this.renderVictoryModal(winningSuit, prize, totalBet, ranking, snap);
        }

        const youLine = opts.skipPayout
            ? ''
            : (userBet > 0
                ? ` Tú ganaste $${prize.toLocaleString()}.`
                : (totalBet > 0 ? ` Tú perdiste $${totalBet.toLocaleString()}.` : ''));
        this.setCommentary(
            opts.commentary ||
            `🏁 Gana ${SUITS[winningSuit].name}.${youLine}`
        );
    }

    renderVictoryModal(winningSuit, prize, totalBet, ranking, snapBets) {
        const suit = SUITS[winningSuit];
        const modalContent = document.getElementById('victory-details');
        const snap = snapBets || this.lockedBets || {};

        let bettingSummary = '';
        if (totalBet > 0) {
            if (prize > 0) {
                bettingSummary = `
                <div class="victory-prize win">
                    <span class="prize-title">Tú ganaste</span>
                    <span class="prize-amount">+$${prize.toLocaleString()} (apostaste $${(snap[winningSuit] || 0).toLocaleString()} a ${suit.name} · 4x)</span>
                </div>`;
            } else {
                bettingSummary = `
                <div class="victory-prize loss">
                    <span class="prize-title">Tú perdiste</span>
                    <span class="prize-sub">−$${totalBet.toLocaleString()} en apuestas. El ganador fue ${suit.name}.</span>
                </div>`;
            }
        } else {
            bettingSummary = `
            <div class="victory-prize">
                <span class="prize-title">Sin apuesta tuya</span>
                <span class="prize-sub">Ganó el jinete de ${suit.name}.</span>
            </div>`;
        }

        // Desglose por caballo: cuánto había y si ganó/perdió
        const horseRows = ['oros', 'copas', 'espadas', 'bastos'].map((s) => {
            const amt = snap[s] || 0;
            const won = s === winningSuit;
            let tip = amt <= 0 ? 'sin apuesta' : (won ? `ganó → +$${(amt * 4).toLocaleString()}` : `perdió −$${amt.toLocaleString()}`);
            return `<li class="${won ? 'won' : (amt > 0 ? 'lost' : '')}"><strong>${SUITS[s].name}</strong>: $${amt.toLocaleString()} <em>${tip}</em></li>`;
        }).join('');

        const horseSummary = `
        <div class="bet-breakdown">
            <h4>Apuestas por caballo</h4>
            <ul>${horseRows}</ul>
        </div>`;

        // Quién ganó / quién perdió (modo fiesta o tú)
        let peopleSummary = '';
        if (this.gameMode === 'party' && this.partyPlayers.length > 0) {
            const winners = this.partyPlayers.filter(p => p.suit === winningSuit);
            const losers = this.partyPlayers.filter(p => p.suit !== winningSuit);
            peopleSummary = `
            <div class="people-results">
                <div class="people-col win">
                    <h4>Ganaron</h4>
                    ${winners.length
                        ? `<ul>${winners.map(w => `<li><strong>${esc(w.name)}</strong> · ${SUITS[w.suit].name}${w.stake ? ` · ${esc(w.stake)}` : ''}</li>`).join('')}</ul>`
                        : '<p>Nadie iba con este caballo</p>'}
                </div>
                <div class="people-col loss">
                    <h4>Perdieron</h4>
                    ${losers.length
                        ? `<ul>${losers.map(l => `<li><strong>${esc(l.name)}</strong> · iba con ${SUITS[l.suit].name}${l.stake ? ` · reto: ${esc(l.stake)}` : ''}</li>`).join('')}</ul>`
                        : '<p>—</p>'}
                </div>
            </div>`;
        } else if (totalBet > 0) {
            peopleSummary = `
            <div class="people-results">
                <div class="people-col ${prize > 0 ? 'win' : 'loss'}">
                    <h4>${prize > 0 ? 'Ganaste tú' : 'Perdiste tú'}</h4>
                    <ul><li><strong>Tú</strong> · ${prize > 0 ? `+$${prize.toLocaleString()}` : `−$${totalBet.toLocaleString()}`} · fichas ahora $${this.bankroll.toLocaleString()}</li></ul>
                </div>
            </div>`;
        }

        let podiumHtml = `<div class="podium-grid">`;
        ranking.forEach((h, index) => {
            const hSuit = SUITS[h.suit];
            const medal = IS_WAYNYAN ? ICON.rank(index + 1) : (index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '4º');
            const pot = (this.potBySuit && this.potBySuit[h.suit]) || snap[h.suit] || 0;
            podiumHtml += `
            <div class="podium-item rank-${index + 1}" style="border-top-color: ${hSuit.color}">
                <div class="podium-medal">${medal}</div>
                <div class="podium-suit-icon">${getSuitSvg(h.suit, 28)}</div>
                <div class="podium-name">${hSuit.name}</div>
                <div class="podium-steps">${h.pos > this.totalSteps ? (IS_WAYNYAN ? ICON.flag : 'Ganador') : (IS_WAYNYAN ? `${h.pos}/${this.totalSteps + 1}` : `Casilla ${h.pos}`)}</div>
                <div class="podium-pot">Bote $${Number(pot).toLocaleString()}</div>
            </div>`;
        });
        podiumHtml += `</div>`;

        modalContent.innerHTML = ui(`
            <div class="winner-hero" style="background: linear-gradient(135deg, ${suit.darkColor}, ${suit.color})">
                <div class="winner-trophy">${IS_WAYNYAN ? ICON.trophy : '🏆'}</div>
                <h2 class="winner-title">Gana ${suit.name.toUpperCase()}</h2>
                <p class="winner-subtitle">${suit.horseName}</p>
                <div class="winner-icon">${getSuitSvg(winningSuit, 70)}</div>
            </div>
            ${bettingSummary}
            ${peopleSummary}
            ${horseSummary}
            <div class="podium-container">
                <h3>Posiciones</h3>
                ${podiumHtml}
            </div>
        `);

        this.openPanel(this.modalVictory);
    }

    closeVictoryModal() {
        this.closePanel(this.modalVictory);
        this.stopConfetti();
    }

    resetToBetting(refund = false) {
        this.phase = 'betting';
        if (refund) this.clearBets();
        this.btnDraw.disabled = false;
        this.btnAuto.disabled = false;
        document.getElementById('btn-open-settings').disabled = false;
        document.getElementById('paddock-panel').classList.remove('hidden');
        document.getElementById('race-controls-bar').classList.add('hidden');
        document.getElementById('side-deck-section').classList.add('hidden');
        this.cardDrawSlotEl.innerHTML = IS_WAYNYAN ? renderCardHtml(null, true) : `<div class="card-draw-placeholder">Las cartas extraídas aparecerán aquí</div>`;
        this.deck.reset();
        this.suitCounts = { oros: 0, copas: 0, espadas: 0, bastos: 0 };
        this.updateDeckCountUI();
        this.updateSuitStats();
        this.setupTrackUI();
        this.setCommentary('Paddock');
    }

    startAutoRace() {
        if (this.phase !== 'racing' && this.phase !== 'paused') return;
        this.phase = 'racing';
        this.btnAuto.classList.add('hidden');
        this.btnPause.classList.remove('hidden');
        this.btnDraw.disabled = true;

        if (this.autoTimer) clearInterval(this.autoTimer);
        this.autoTimer = setInterval(() => {
            if (this.phase === 'racing') {
                this.drawNextCard();
            } else {
                clearInterval(this.autoTimer);
            }
        }, this.speed);
    }

    pauseRace() {
        if (this.autoTimer) {
            clearInterval(this.autoTimer);
            this.autoTimer = null;
        }
        if (this.phase === 'racing') {
            this.phase = 'paused';
        }
        this.btnAuto.classList.remove('hidden');
        this.btnPause.classList.add('hidden');
        this.btnDraw.disabled = this.phase === 'finished';
    }

    updateDeckCountUI() {
        this.deckCountEl.textContent = IS_WAYNYAN ? `${this.deck.count}` : `${this.deck.count} cartas`;
    }

    updateSuitStats() {
        const suitsList = ['oros', 'copas', 'espadas', 'bastos'];
        suitsList.forEach(s => {
            const countEl = document.getElementById(`count-stat-${s}`);
            if (countEl) {
                countEl.textContent = this.suitCounts[s] || 0;
            }
        });
    }

    setCommentary(text) {
        this.commentaryEl.textContent = ui(text);
        this.commentaryEl.classList.remove('commentary-pulse');
        void this.commentaryEl.offsetWidth; // trigger reflow
        this.commentaryEl.classList.add('commentary-pulse');
    }

    generateStepCommentary(card, horse) {
        const suitName = SUITS[card.suit].name;
        const pos = horse.pos;

        // Comentarios dinámicos de turf
        const leads = Object.values(this.horses).sort((a, b) => b.pos - a.pos);
        const isLeader = leads[0].suit === card.suit && (leads[1] && leads[0].pos > leads[1].pos);
        const isClose = leads[0].pos === leads[1].pos;

        if (pos === this.totalSteps) {
            this.setCommentary(`🔥 ¡¡A LAS PUERTAS DE LA GLORIA!! ¡${suitName} llega a la última valla y queda a tiro de meta!`);
        } else if (isLeader) {
            this.setCommentary(`⚡ ¡Salió ${card.name}! ¡El jinete de ${suitName} se afianza en la punta con paso firme!`);
        } else if (isClose && leads[0].suit === card.suit) {
            this.setCommentary(`⚔️ ¡Salió ${card.name}! ¡Empate al rojo vivo en la delantera!`);
        } else {
            const comments = [
                `🏇 ¡Avanza ${suitName}! Sale el ${card.name} y descuenta distancia.`,
                `💨 ¡Buena carta para ${suitName}! Mantiene vivo el sueño de ganar.`,
                `🎯 ¡El ${card.name} mete presión! El pelotón sigue muy apretado.`
            ];
            const rand = comments[Math.floor(Math.random() * comments.length)];
            this.setCommentary(rand);
        }
    }

    // Modo Fiesta UI
    renderPartyPlayersUI() {
        const listEl = document.getElementById('party-players-list');
        listEl.innerHTML = '';

        this.partyPlayers.forEach((player, idx) => {
            const row = document.createElement('div');
            row.className = 'party-player-row';
            row.innerHTML = ui(`
                <input type="text" class="party-name-input" value="${esc(player.name)}" data-idx="${idx}" ${IS_WAYNYAN ? '' : 'placeholder="Nombre"'} aria-label="Nombre" />
                <select class="party-suit-select" data-idx="${idx}">
                    <option value="oros" ${player.suit === 'oros' ? 'selected' : ''}>🟡 Oros</option>
                    <option value="copas" ${player.suit === 'copas' ? 'selected' : ''}>🔴 Copas</option>
                    <option value="espadas" ${player.suit === 'espadas' ? 'selected' : ''}>🔵 Espadas</option>
                    <option value="bastos" ${player.suit === 'bastos' ? 'selected' : ''}>🟢 Bastos</option>
                </select>
                <input type="text" class="party-stake-input" value="${esc(player.stake)}" data-idx="${idx}" ${IS_WAYNYAN ? '' : 'placeholder="Reto o castigo"'} aria-label="Reto" />
                <button class="btn-remove-player" data-idx="${idx}" aria-label="Quitar">${IS_WAYNYAN ? '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square"><path d="M6 6l12 12M18 6L6 18"/></svg>' : '❌'}</button>
            `);
            listEl.appendChild(row);
        });

        // Eventos en inputs
        listEl.querySelectorAll('.party-name-input').forEach(inp => {
            inp.addEventListener('input', (e) => {
                this.partyPlayers[e.target.dataset.idx].name = e.target.value;
            });
        });
        listEl.querySelectorAll('.party-suit-select').forEach(sel => {
            sel.addEventListener('change', (e) => {
                this.partyPlayers[e.target.dataset.idx].suit = e.target.value;
            });
        });
        listEl.querySelectorAll('.party-stake-input').forEach(inp => {
            inp.addEventListener('input', (e) => {
                this.partyPlayers[e.target.dataset.idx].stake = e.target.value;
            });
        });
        listEl.querySelectorAll('.btn-remove-player').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.dataset.idx, 10);
                this.partyPlayers.splice(idx, 1);
                this.renderPartyPlayersUI();
            });
        });
    }

    // Animación de Confeti en Canvas
    startConfetti() {
        if (!this.confettiCanvas) return;
        const canvas = this.confettiCanvas;
        this.stopConfetti();
        const ctx = canvas.getContext('2d');
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const W = window.innerWidth, H = window.innerHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const t0 = performance.now();
        const styleAccent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();

        const particles = [];
        const colors = IS_WAYNYAN
            ? [styleAccent || '#00e5ff', '#ffffff', SUITS.oros.color, SUITS.copas.color, SUITS.espadas.color, SUITS.bastos.color]
            : ['#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6'];
        const canvasW = W, canvasH = H;

        for (let i = 0; i < 140; i++) {
            particles.push({
                x: Math.random() * canvasW,
                y: Math.random() * -canvasH,
                w: Math.random() * 12 + 6,
                h: Math.random() * 8 + 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                vx: (Math.random() - 0.5) * 4,
                vy: Math.random() * 5 + 3,
                rotation: Math.random() * 360,
                vRot: (Math.random() - 0.5) * 10
            });
        }

        const render = (now = t0) => {
            const elapsed = now - t0;
            ctx.clearRect(0, 0, canvasW, canvasH);
            ctx.globalAlpha = elapsed > 5000 ? Math.max(0, 1 - (elapsed - 5000) / 1500) : 1;
            if (elapsed > 6500) { this.stopConfetti(); return; }
            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.rotation += p.vRot;

                if (p.y > canvasH) {
                    p.y = -20;
                    p.x = Math.random() * canvasW;
                }

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);
                ctx.fillStyle = p.color;
                if (IS_WAYNYAN) ctx.fillRect(-4, -4, 8, 8); // pixel cuadrado
                else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                ctx.restore();
            });

            this.confettiAnimId = requestAnimationFrame(render);
        };

        this.confettiAnimId = requestAnimationFrame(render);
    }

    stopConfetti() {
        if (this.confettiAnimId) {
            cancelAnimationFrame(this.confettiAnimId);
            this.confettiAnimId = null;
        }
        if (this.confettiCanvas) {
            const ctx = this.confettiCanvas.getContext('2d');
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, this.confettiCanvas.width, this.confettiCanvas.height);
        }
    }
}

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.game = new RaceGame();
});
