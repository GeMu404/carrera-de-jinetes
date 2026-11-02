// Motor Principal del Juego: Carrera de Jinetes (Baraja Española)

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
        this.bankroll = parseInt(localStorage.getItem('jinetes_bankroll') || '1000', 10);
        this.bets = { oros: 0, copas: 0, espadas: 0, bastos: 0 };
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
            if (confirm('¿Deseas reiniciar la carrera actual? Se perderán las apuestas en curso.')) {
                this.pauseRace();
                this.resetToBetting();
            }
        });

        // Modales - Apertura y Cierre seguro
        document.getElementById('btn-open-rules').addEventListener('click', () => {
            this.modalRules.classList.remove('hidden');
        });
        document.querySelectorAll('.btn-close-rules').forEach(btn => {
            btn.addEventListener('click', () => this.modalRules.classList.add('hidden'));
        });

        document.getElementById('btn-open-settings').addEventListener('click', () => {
            this.modalSettings.classList.remove('hidden');
        });
        document.querySelectorAll('.btn-close-settings').forEach(btn => {
            btn.addEventListener('click', () => this.modalSettings.classList.add('hidden'));
        });

        document.getElementById('btn-open-party').addEventListener('click', () => {
            this.renderPartyPlayersUI();
            this.modalParty.classList.remove('hidden');
        });
        document.querySelectorAll('.btn-close-party').forEach(btn => {
            btn.addEventListener('click', () => {
                this.gameMode = this.partyPlayers.length > 0 ? 'party' : 'chips';
                this.modalParty.classList.add('hidden');
                this.updatePartyBadge();
            });
        });

        // Alternar Mute
        const btnMute = document.getElementById('btn-toggle-sound');
        btnMute.addEventListener('click', () => {
            const isMuted = window.soundEffects.toggleMute();
            btnMute.innerHTML = isMuted ? '🔇 Silencio' : '🔊 Sonido';
            btnMute.classList.toggle('muted', isMuted);
        });

        // Configuración de vallas y reglas
        document.getElementById('select-hurdles-count').addEventListener('change', (e) => {
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
            this.bankroll += 500;
            this.saveBankroll();
            this.updateBankrollUI();
            this.setCommentary('¡Recibiste $500 fichas de cortesía del Hipódromo!');
        });
    }

    updatePartyBadge() {
        const badge = document.getElementById('party-mode-indicator');
        if (badge) {
            if (this.gameMode === 'party' && this.partyPlayers.length > 0) {
                badge.classList.remove('hidden');
                badge.textContent = `🍻 Modo Fiesta Activo (${this.partyPlayers.length} jugadores)`;
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
        document.getElementById('total-bet-display').textContent = `$${totalBets}`;
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
        stepsHeader.innerHTML = headerHtml;
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
                <span class="hurdle-label">Valla ${i}</span>
            </div>`;
        }
        hurdlesHtml += `<div class="hurdle-cell hurdle-finish-banner"><span>🏆 DISCO</span></div>`;
        hurdlesRow.innerHTML = hurdlesHtml;
        this.trackEl.appendChild(hurdlesRow);

        // 4 Carriles para los 4 Palos
        const suitsList = ['oros', 'copas', 'espadas', 'bastos'];
        suitsList.forEach(suitId => {
            const suit = SUITS[suitId];
            const lane = document.createElement('div');
            lane.className = `track-lane lane-${suitId}`;
            lane.id = `lane-${suitId}`;

            // Etiqueta del carril (Columna 1: 140px)
            let laneHtml = `
            <div class="lane-info" style="border-left-color: ${suit.color}">
                <div class="lane-suit-icon">${getSuitSvg(suitId, 24)}</div>
                <div class="lane-details">
                    <span class="lane-name">${suit.name.toUpperCase()}</span>
                    <span class="lane-horse-name">${suit.horseName}</span>
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
                <span class="cell-marker meta-marker">🏆</span>
            </div>`;

            laneHtml += `</div>`;

            lane.innerHTML = laneHtml;
            this.trackEl.appendChild(lane);
        });

        // Colocar los 4 jinetes en la casilla 0
        suitsList.forEach(suitId => {
            this.renderHorseAt(suitId, 0);
        });
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
        if (this.gameMode === 'chips' && totalBets === 0 && this.bankroll > 0) {
            if (!confirm('No has colocado ninguna apuesta con fichas. ¿Quieres correr la carrera de exhibición de todas formas?')) {
                return;
            }
        }

        this.phase = 'racing';
        window.soundEffects.playBugleCall();

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

        this.setCommentary('🎺 ¡TOQUE DE CORNETA! ¡Se abren las gateras y los cuatro jinetes están listos para la largada!');
        
        // Habilitar botones
        this.btnDraw.disabled = false;
        this.btnAuto.disabled = false;
        this.btnPause.disabled = true;
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

        // Verificar si se activan vallas (obstáculos)
        this.checkHurdles();

        // Verificar si alguien cruzó la meta
        if (horse.pos > this.totalSteps) {
            this.handleVictory(card.suit);
        }
    }

    renderDrawnCard(card) {
        this.cardDrawSlotEl.innerHTML = `
            <div class="drawn-card-animation">
                ${renderCardHtml(card, false)}
            </div>
            <div class="drawn-card-label" style="color: ${SUITS[card.suit].color}">
                ¡Salió ${card.name}!
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
                this.renderHorseAt(suitId, pos);
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
            hurdleWrapper.classList.add('hurdle-trigger-flip');
            hurdleWrapper.innerHTML = renderCardHtml(penaltyCard, false, true);
        }

        // Sonido de tropiezo / penalización
        window.soundEffects.playHurdlePenalty();

        // Retroceder un paso (sin bajar de 0)
        horse.pos = Math.max(0, horse.pos - 1);

        this.animateHorseMove(penalizedSuit, horse.pos, 'penalty');

        // Mostrar cartel de penalización
        const slotEl = document.getElementById(`hurdle-slot-${idx + 1}`);
        if (slotEl) {
            const popup = document.createElement('div');
            popup.className = 'hurdle-penalty-popup';
            popup.innerHTML = `⚠️ ¡${SUITS[penalizedSuit].name.toUpperCase()} TROPIEZA! (-1)`;
            slotEl.appendChild(popup);
            setTimeout(() => popup.remove(), 2500);
        }

        this.setCommentary(
            `💥 ¡VALLA ${hurdle.step} REVELADA! Salió el ${penaltyCard.name}. ` +
            `¡El jinete de ${SUITS[penalizedSuit].name} tropezó con el obstáculo y RETROCEDE a la casilla ${horse.pos}!`
        );
    }

    handleVictory(winningSuit) {
        this.phase = 'finished';
        this.winner = winningSuit;
        this.pauseRace();

        window.soundEffects.playVictory();
        this.startConfetti();

        // Calcular ganancias
        const userBet = this.bets[winningSuit] || 0;
        const totalBet = this.bets.oros + this.bets.copas + this.bets.espadas + this.bets.bastos;
        const multiplier = 4.0;
        const prize = Math.round(userBet * multiplier);

        if (userBet > 0) {
            this.bankroll += prize;
            this.saveBankroll();
            this.updateBankrollUI();
        }

        // Clasificación final de los 4 caballos
        const ranking = Object.values(this.horses)
            .sort((a, b) => b.pos - a.pos);

        // Renderizar modal de victoria
        this.renderVictoryModal(winningSuit, prize, totalBet, ranking);

        this.setCommentary(
            `🏁 ¡¡CRUZÓ EL DISCO!! ¡GANADOR DE LA CARRERA EL JINETE DE ${SUITS[winningSuit].name.toUpperCase()}!`
        );
    }

    renderVictoryModal(winningSuit, prize, totalBet, ranking) {
        const suit = SUITS[winningSuit];
        const modalContent = document.getElementById('victory-details');

        let bettingSummary = '';
        if (totalBet > 0) {
            if (prize > 0) {
                bettingSummary = `
                <div class="victory-prize win">
                    <span class="prize-title">🎉 ¡ACERTASTE TU APUESTA!</span>
                    <span class="prize-amount">Ganaste +$${prize.toLocaleString()} fichas (Cuota 4.0x)</span>
                </div>`;
            } else {
                bettingSummary = `
                <div class="victory-prize loss">
                    <span class="prize-title">😢 Tu caballo no logró ganar esta vez</span>
                    <span class="prize-sub">Perdiste tus $${totalBet} fichas apostadas. ¡Revancha en la próxima!</span>
                </div>`;
            }
        }

        // Resumen Modo Fiesta
        let partySummary = '';
        if (this.gameMode === 'party' && this.partyPlayers.length > 0) {
            const winners = this.partyPlayers.filter(p => p.suit === winningSuit);
            const losers = this.partyPlayers.filter(p => p.suit !== winningSuit);

            partySummary = `
            <div class="party-results-box">
                <h4>🍻 Resultados de la Ronda de Fiesta:</h4>
                <div class="party-winners">
                    <strong>🏆 Ganadores:</strong> ${winners.length > 0 ? winners.map(w => `${w.name}`).join(', ') : '¡Nadie apostó por este caballo!'}
                </div>
                <div class="party-losers">
                    <strong>🎯 Retos para los demás:</strong>
                    <ul>
                        ${losers.map(l => `<li><strong>${l.name}</strong> (${SUITS[l.suit].name}): Cumple reto -> <em>${l.stake}</em></li>`).join('')}
                    </ul>
                </div>
            </div>`;
        }

        // Podio visual
        let podiumHtml = `<div class="podium-grid">`;
        ranking.forEach((h, index) => {
            const hSuit = SUITS[h.suit];
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '4º';
            podiumHtml += `
            <div class="podium-item rank-${index + 1}" style="border-top-color: ${hSuit.color}">
                <div class="podium-medal">${medal}</div>
                <div class="podium-suit-icon">${getSuitSvg(h.suit, 28)}</div>
                <div class="podium-name">${hSuit.name}</div>
                <div class="podium-steps">${h.pos > this.totalSteps ? '🏆 Ganador' : `Casilla ${h.pos}`}</div>
            </div>`;
        });
        podiumHtml += `</div>`;

        modalContent.innerHTML = `
            <div class="winner-hero" style="background: linear-gradient(135deg, ${suit.darkColor}, ${suit.color})">
                <div class="winner-trophy">🏆</div>
                <h2 class="winner-title">¡JINETE DE ${suit.name.toUpperCase()} ES EL CAMPEÓN!</h2>
                <p class="winner-subtitle">${suit.horseName}</p>
                <div class="winner-icon">${getSuitSvg(winningSuit, 70)}</div>
            </div>
            ${bettingSummary}
            ${partySummary}
            <div class="podium-container">
                <h3>Posiciones Finales</h3>
                ${podiumHtml}
            </div>
        `;

        this.modalVictory.classList.remove('hidden');
    }

    closeVictoryModal() {
        this.modalVictory.classList.add('hidden');
        this.stopConfetti();
    }

    resetToBetting() {
        this.phase = 'betting';
        this.clearBets();
        document.getElementById('paddock-panel').classList.remove('hidden');
        document.getElementById('race-controls-bar').classList.add('hidden');
        document.getElementById('side-deck-section').classList.add('hidden');
        this.cardDrawSlotEl.innerHTML = `<div class="card-draw-placeholder">Las cartas extraídas aparecerán aquí</div>`;
        this.setupTrackUI();
        this.setCommentary('🏇 Prepara tus apuestas en el Paddock y presiona "¡A LAS GATERAS!" para comenzar.');
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
        this.btnDraw.disabled = false;
    }

    updateDeckCountUI() {
        this.deckCountEl.textContent = `${this.deck.count} cartas`;
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
        this.commentaryEl.textContent = text;
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
            row.innerHTML = `
                <input type="text" class="party-name-input" value="${player.name}" data-idx="${idx}" placeholder="Nombre" />
                <select class="party-suit-select" data-idx="${idx}">
                    <option value="oros" ${player.suit === 'oros' ? 'selected' : ''}>🟡 Oros</option>
                    <option value="copas" ${player.suit === 'copas' ? 'selected' : ''}>🔴 Copas</option>
                    <option value="espadas" ${player.suit === 'espadas' ? 'selected' : ''}>🔵 Espadas</option>
                    <option value="bastos" ${player.suit === 'bastos' ? 'selected' : ''}>🟢 Bastos</option>
                </select>
                <input type="text" class="party-stake-input" value="${player.stake}" data-idx="${idx}" placeholder="Reto o castigo" />
                <button class="btn-remove-player" data-idx="${idx}">❌</button>
            `;
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
                const idx = parseInt(e.target.dataset.idx, 10);
                this.partyPlayers.splice(idx, 1);
                this.renderPartyPlayersUI();
            });
        });
    }

    // Animación de Confeti en Canvas
    startConfetti() {
        if (!this.confettiCanvas) return;
        const canvas = this.confettiCanvas;
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const particles = [];
        const colors = ['#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6'];

        for (let i = 0; i < 140; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * -canvas.height,
                w: Math.random() * 12 + 6,
                h: Math.random() * 8 + 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                vx: (Math.random() - 0.5) * 4,
                vy: Math.random() * 5 + 3,
                rotation: Math.random() * 360,
                vRot: (Math.random() - 0.5) * 10
            });
        }

        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.rotation += p.vRot;

                if (p.y > canvas.height) {
                    p.y = -20;
                    p.x = Math.random() * canvas.width;
                }

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                ctx.restore();
            });

            this.confettiAnimId = requestAnimationFrame(render);
        };

        render();
    }

    stopConfetti() {
        if (this.confettiAnimId) {
            cancelAnimationFrame(this.confettiAnimId);
            this.confettiAnimId = null;
        }
        if (this.confettiCanvas) {
            const ctx = this.confettiCanvas.getContext('2d');
            ctx.clearRect(0, 0, this.confettiCanvas.width, this.confettiCanvas.height);
        }
    }
}

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.game = new RaceGame();
});
