// Definición y Renderizador Gráfico Vectorial de la Baraja Española
// 40 cartas: Oros, Copas, Espadas, Bastos (1 al 7, 10, 11, 12)

const SUITS = {
    oros: {
        id: 'oros',
        name: 'Oros',
        singular: 'Oro',
        color: '#f59e0b',
        darkColor: '#b45309',
        lightBg: '#fef3c7',
        accent: '#fbbf24',
        pintas: 0, // 0 cortes en la orla
        horseName: 'El Relámpago Dorado',
        horseColor: '#eab308'
    },
    copas: {
        id: 'copas',
        name: 'Copas',
        singular: 'Copa',
        color: '#ef4444',
        darkColor: '#b91c1c',
        lightBg: '#fee2e2',
        accent: '#f87171',
        pintas: 1, // 1 corte en la orla
        horseName: 'El Furia Carmesí',
        horseColor: '#ef4444'
    },
    espadas: {
        id: 'espadas',
        name: 'Espadas',
        singular: 'Espada',
        color: '#3b82f6',
        darkColor: '#1d4ed8',
        lightBg: '#dbeafe',
        accent: '#60a5fa',
        pintas: 2, // 2 cortes en la orla
        horseName: 'El Filo Plateado',
        horseColor: '#3b82f6'
    },
    bastos: {
        id: 'bastos',
        name: 'Bastos',
        singular: 'Basto',
        color: '#10b981',
        darkColor: '#047857',
        lightBg: '#d1fae5',
        accent: '#34d399',
        pintas: 3, // 3 cortes en la orla
        horseName: 'El Trueno Verde',
        horseColor: '#10b981'
    }
};

const VALUES = [
    { num: 1, name: 'As' },
    { num: 2, name: '2' },
    { num: 3, name: '3' },
    { num: 4, name: '4' },
    { num: 5, name: '5' },
    { num: 6, name: '6' },
    { num: 7, name: '7' },
    { num: 10, name: 'Sota' },
    { num: 11, name: 'Caballo' },
    { num: 12, name: 'Rey' }
];

// Generador de SVGs para los 4 Palos
function getSuitSvg(suitId, size = 32) {
    switch (suitId) {
        case 'oros':
            return `
            <svg class="suit-svg" width="${size}" height="${size}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="44" fill="url(#oroGrad)" stroke="#b45309" stroke-width="4"/>
                <circle cx="50" cy="50" r="34" fill="none" stroke="#d97706" stroke-width="2" stroke-dasharray="4 2"/>
                <circle cx="50" cy="50" r="26" fill="#fef3c7" stroke="#b45309" stroke-width="2"/>
                <!-- Sol Radiante central tradicional -->
                <circle cx="50" cy="50" r="10" fill="#f59e0b" stroke="#78350f" stroke-width="1.5"/>
                <path d="M50 16 L50 24 M50 76 L50 84 M16 50 L24 50 M76 50 L84 50 M26 26 L32 32 M68 68 L74 74 M26 74 L32 68 M68 32 L74 26" stroke="#b45309" stroke-width="3" stroke-linecap="round"/>
                <defs>
                    <radialGradient id="oroGrad" cx="40%" cy="35%" r="60%">
                        <stop offset="0%" stop-color="#fef08a" />
                        <stop offset="60%" stop-color="#f59e0b" />
                        <stop offset="100%" stop-color="#b45309" />
                    </radialGradient>
                </defs>
            </svg>`;

        case 'copas':
            return `
            <svg class="suit-svg" width="${size}" height="${size}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <!-- Cáliz señorial clásico -->
                <path d="M22 20 Q50 14 78 20 L74 46 Q68 68 50 70 Q32 68 26 46 Z" fill="url(#copaGrad)" stroke="#7f1d1d" stroke-width="3"/>
                <!-- Tapa o borde ornamental -->
                <ellipse cx="50" cy="20" rx="28" ry="8" fill="#fef08a" stroke="#b45309" stroke-width="2"/>
                <!-- Joya en copa -->
                <circle cx="50" cy="42" r="6" fill="#dc2626" stroke="#7f1d1d" stroke-width="1.5"/>
                <!-- Tallo y nudo -->
                <path d="M44 70 L42 84 L58 84 L56 70 Z" fill="#d97706" stroke="#78350f" stroke-width="2"/>
                <circle cx="50" cy="74" r="5" fill="#f59e0b" stroke="#b45309" stroke-width="1.5"/>
                <!-- Base ancha -->
                <path d="M30 92 Q50 86 70 92 L72 84 Q50 82 28 84 Z" fill="url(#copaBase)" stroke="#78350f" stroke-width="2"/>
                <defs>
                    <linearGradient id="copaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#f87171" />
                        <stop offset="50%" stop-color="#dc2626" />
                        <stop offset="100%" stop-color="#7f1d1d" />
                    </linearGradient>
                    <linearGradient id="copaBase" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stop-color="#d97706" />
                        <stop offset="50%" stop-color="#fef08a" />
                        <stop offset="100%" stop-color="#92400e" />
                    </linearGradient>
                </defs>
            </svg>`;

        case 'espadas':
            return `
            <svg class="suit-svg" width="${size}" height="${size}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <!-- Hoja de espada toledana -->
                <path d="M50 8 L55 24 L54 70 L46 70 L45 24 Z" fill="url(#espadaGrad)" stroke="#1e3a8a" stroke-width="2"/>
                <!-- Ranura central de la hoja -->
                <line x1="50" y1="12" x2="50" y2="68" stroke="#93c5fd" stroke-width="1.5"/>
                <!-- Guarda cruzada ornamentada -->
                <path d="M24 68 Q50 64 76 68 Q78 72 74 74 Q50 71 26 74 Q22 72 24 68 Z" fill="#f59e0b" stroke="#78350f" stroke-width="2"/>
                <!-- Puño / Empuñadura trenzada -->
                <rect x="47" y="74" width="6" height="15" rx="2" fill="#78350f" stroke="#451a03" stroke-width="1.5"/>
                <!-- Pomo redondo dorado -->
                <circle cx="50" cy="92" r="5" fill="#f59e0b" stroke="#78350f" stroke-width="2"/>
                <defs>
                    <linearGradient id="espadaGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stop-color="#94a3b8" />
                        <stop offset="45%" stop-color="#f8fafc" />
                        <stop offset="55%" stop-color="#cbd5e1" />
                        <stop offset="100%" stop-color="#64748b" />
                    </linearGradient>
                </defs>
            </svg>`;

        case 'bastos':
            return `
            <svg class="suit-svg" width="${size}" height="${size}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <!-- Garrote nudoso tradicional -->
                <path d="M42 92 C40 85 43 70 44 55 C42 42 41 28 44 14 C47 8 53 8 56 14 C59 28 58 42 56 55 C57 70 60 85 58 92 Z" 
                      fill="url(#bastoGrad)" stroke="#064e3b" stroke-width="2.5"/>
                <!-- Nudos de madera -->
                <ellipse cx="45" cy="35" rx="3" ry="5" fill="#047857" stroke="#064e3b" stroke-width="1"/>
                <ellipse cx="55" cy="58" rx="3.5" ry="6" fill="#047857" stroke="#064e3b" stroke-width="1"/>
                <ellipse cx="46" cy="76" rx="4" ry="5" fill="#047857" stroke="#064e3b" stroke-width="1"/>
                <!-- Brotes / Hojas verdes tradicionales del mazo de bastos -->
                <path d="M41 30 Q30 25 32 38 Q38 36 42 34 Z" fill="#22c55e" stroke="#15803d" stroke-width="1.5"/>
                <path d="M59 48 Q70 44 68 56 Q62 54 58 52 Z" fill="#22c55e" stroke="#15803d" stroke-width="1.5"/>
                <path d="M42 70 Q32 66 33 78 Q39 76 43 74 Z" fill="#22c55e" stroke="#15803d" stroke-width="1.5"/>
                <defs>
                    <linearGradient id="bastoGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stop-color="#10b981" />
                        <stop offset="50%" stop-color="#34d399" />
                        <stop offset="100%" stop-color="#047857" />
                    </linearGradient>
                </defs>
            </svg>`;
    }
    return '';
}

// Gráfico SVG detallado del Jinete Corredor (Caballo de la Baraja Española)
function getHorseRunnerSvg(suitId) {
    const suit = SUITS[suitId];
    return `
    <div class="horse-runner-container" data-suit="${suitId}">
        <svg class="horse-sprite" viewBox="0 0 160 110" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <filter id="shadow-${suitId}" x="-10%" y="-10%" width="130%" height="130%">
                    <feDropShadow dx="2" dy="4" stdDeviation="3" flood-opacity="0.3"/>
                </filter>
            </defs>
            <g filter="url(#shadow-${suitId})">
                <!-- Sombra del caballo en el suelo -->
                <ellipse cx="80" cy="100" rx="55" ry="8" fill="rgba(0,0,0,0.2)"/>

                <!-- Cuerpo del caballo al galope -->
                <!-- Pata trasera izquierda -->
                <path class="leg leg-back-left" d="M35 60 Q20 78 12 92 L18 94 Q28 80 44 68 Z" fill="#451a03"/>
                <!-- Pata delantera izquierda -->
                <path class="leg leg-front-left" d="M105 60 Q120 72 135 88 L141 85 Q125 68 114 55 Z" fill="#581c87"/>

                <!-- Cola al viento -->
                <path class="horse-tail" d="M30 45 Q8 40 2 62 Q14 58 32 54 Z" fill="#1c1917" stroke="#44403c" stroke-width="1.5"/>

                <!-- Torso del caballo -->
                <path d="M32 46 C42 40 68 44 85 45 C102 46 112 50 118 60 C110 75 92 78 75 75 C55 76 38 72 32 60 Z" fill="#78350f" stroke="#451a03" stroke-width="2"/>
                
                <!-- Manta de silla / Gualdrapa con el color del palo -->
                <path d="M52 45 Q70 44 86 46 L88 66 Q70 68 50 64 Z" fill="${suit.color}" stroke="${suit.darkColor}" stroke-width="2"/>
                <!-- Ribete dorado de la manta -->
                <path d="M53 62 Q70 65 86 63" stroke="#fef08a" stroke-width="2" stroke-linecap="round"/>
                
                <!-- Número/Emblema en la manta -->
                <circle cx="69" cy="55" r="7" fill="#ffffff" stroke="${suit.darkColor}" stroke-width="1.5"/>
                
                <!-- Pata trasera derecha (más visible) -->
                <path class="leg leg-back-right" d="M42 58 Q24 74 18 95 L26 97 Q36 82 50 68 Z" fill="#78350f" stroke="#451a03" stroke-width="1.5"/>
                <!-- Casco herrado -->
                <path d="M18 94 L26 96 L24 99 L16 97 Z" fill="#1c1917"/>

                <!-- Cuello y cabeza del caballo -->
                <path d="M96 50 C106 38 114 24 120 12 C125 10 134 16 132 24 C138 23 148 26 146 34 C142 40 134 43 124 45 C116 54 112 62 108 65 Z" fill="#78350f" stroke="#451a03" stroke-width="2"/>
                
                <!-- Orejas -->
                <polygon points="120,12 122,2 126,10" fill="#451a03"/>
                <polygon points="126,10 130,3 132,12" fill="#78350f"/>

                <!-- Crines ondeando -->
                <path class="horse-mane" d="M102 44 Q108 30 114 20 Q106 28 100 36 Z" fill="#1c1917"/>
                <path class="horse-mane" d="M108 32 Q115 22 122 14 Q114 22 107 28 Z" fill="#292524"/>

                <!-- Ojo del caballo y brida -->
                <circle cx="132" cy="22" r="2" fill="#000000"/>
                <path d="M122 14 L138 32 M124 24 L144 32" stroke="${suit.darkColor}" stroke-width="1.5"/>

                <!-- Pata delantera derecha -->
                <path class="leg leg-front-right" d="M110 62 Q125 76 142 94 L149 90 Q132 72 118 56 Z" fill="#78350f" stroke="#451a03" stroke-width="1.5"/>
                <!-- Casco herrado -->
                <path d="M142 93 L149 89 L152 92 L145 96 Z" fill="#1c1917"/>

                <!-- EL JINETE (Caballero español al galope) -->
                <!-- Pierna y bota de montar -->
                <path d="M68 50 Q75 64 82 72 L88 70 Q79 60 74 48 Z" fill="#1c1917" stroke="#44403c" stroke-width="1.5"/>
                <polygon points="82,72 90,69 91,73 83,75" fill="#f59e0b"/> <!-- Espuela -->

                <!-- Torso del Jinete (Chaqueta de jockey con los colores del palo) -->
                <path d="M62 30 Q70 26 78 32 L74 49 Q65 48 60 44 Z" fill="${suit.color}" stroke="#1f2937" stroke-width="2"/>
                <!-- Franja ornamental de la chaquetilla -->
                <path d="M65 29 L72 49" stroke="#ffffff" stroke-width="3"/>

                <!-- Brazo con las riendas -->
                <path d="M72 34 Q86 38 102 42 L98 46 Q84 42 70 39 Z" fill="${suit.color}" stroke="#1f2937" stroke-width="1.5"/>
                <circle cx="102" cy="43" r="3" fill="#fef08a"/>

                <!-- Cabeza y Casco/Gorra de Jinete -->
                <circle cx="68" cy="22" r="7" fill="#fbcfe8" stroke="#be185d" stroke-width="1"/>
                <!-- Gorra / Casco de jockey con visera -->
                <path d="M61 22 Q68 12 77 18 L83 20 Q76 21 68 23 Z" fill="${suit.darkColor}" stroke="#111827" stroke-width="1.5"/>

                <!-- Mini estandarte / Fusta con el palo -->
                <line x1="68" y1="28" x2="52" y2="12" stroke="#d97706" stroke-width="2"/>
                <circle cx="50" cy="10" r="5" fill="${suit.color}" stroke="${suit.darkColor}" stroke-width="1.5"/>
            </g>
        </svg>
        <div class="horse-hud-badge" style="border-color: ${suit.color}">
            <span class="horse-badge-icon">${getSuitSvg(suitId, 16)}</span>
            <span class="horse-badge-name">${suit.name.toUpperCase()}</span>
        </div>
    </div>`;
}

// Generador de carta visual HTML completa
function renderCardHtml(card, isFaceDown = false, isHurdle = false) {
    if (isFaceDown) {
        return `
        <div class="spanish-card card-back ${isHurdle ? 'hurdle-card' : ''}" data-hurdle="${isHurdle}">
            <div class="card-back-pattern">
                <div class="card-back-inner">
                    <div class="card-back-crest">
                        <span class="back-crown">👑</span>
                        <div class="back-ornament"></div>
                    </div>
                </div>
            </div>
        </div>`;
    }

    const suit = SUITS[card.suit];
    const isFigure = card.num >= 10 || card.num === 1;

    // Pintas en la orla tradicional española:
    // Oros = sin corte (0)
    // Copas = 1 corte arriba y abajo
    // Espadas = 2 cortes
    // Bastos = 3 cortes
    const pintaStyle = `border-style: solid;`;

    return `
    <div class="spanish-card card-front suit-${card.suit}" data-suit="${card.suit}" data-num="${card.num}">
        <!-- Orla exterior con pintas tradicionales -->
        <div class="card-border pintas-${suit.pintas}">
            <!-- Índice Superior Izquierdo -->
            <div class="card-corner corner-tl">
                <span class="card-val">${card.num === 1 ? '1' : card.num}</span>
                <span class="corner-suit">${getSuitSvg(card.suit, 18)}</span>
            </div>

            <!-- Cuerpo Central de la Carta -->
            <div class="card-center">
                ${renderCardCenter(card)}
            </div>

            <!-- Índice Inferior Derecho (invertido) -->
            <div class="card-corner corner-br">
                <span class="card-val">${card.num === 1 ? '1' : card.num}</span>
                <span class="corner-suit">${getSuitSvg(card.suit, 18)}</span>
            </div>
        </div>
    </div>`;
}

// Dibuja los motivos interiores según el número y figura
function renderCardCenter(card) {
    const suit = SUITS[card.suit];
    const count = card.num;

    // Figuras: Sota (10), Caballo (11), Rey (12)
    if (count === 10) {
        return `
        <div class="figure-frame">
            <div class="figure-label">SOTA</div>
            <div class="figure-art sota-art">${getSuitSvg(card.suit, 40)}</div>
            <div class="figure-title">${suit.name}</div>
        </div>`;
    }
    if (count === 11) {
        return `
        <div class="figure-frame figure-caballo">
            <div class="figure-label">CABALLO</div>
            <div class="figure-art caballo-art">${getSuitSvg(card.suit, 44)}</div>
            <div class="figure-title">JINETE DE ${suit.name.toUpperCase()}</div>
        </div>`;
    }
    if (count === 12) {
        return `
        <div class="figure-frame">
            <div class="figure-label">REY</div>
            <div class="figure-art rey-art">${getSuitSvg(card.suit, 42)}</div>
            <div class="figure-title">REY DE ${suit.name.toUpperCase()}</div>
        </div>`;
    }

    // As (1)
    if (count === 1) {
        return `
        <div class="ace-frame">
            <div class="ace-icon">${getSuitSvg(card.suit, 62)}</div>
            <div class="ace-banner">AS DE ${suit.name.toUpperCase()}</div>
        </div>`;
    }

    // Números 2 al 7: Disposición de símbolos simétricos
    let items = '';
    for (let i = 0; i < count; i++) {
        items += `<div class="pip-item pip-${i + 1}">${getSuitSvg(card.suit, 24)}</div>`;
    }
    return `<div class="pips-grid count-${count}">${items}</div>`;
}

// Clase Mazo de Baraja Española
class SpanishDeck {
    constructor() {
        this.cards = [];
        this.reset();
    }

    reset() {
        this.cards = [];
        const suitKeys = Object.keys(SUITS);
        for (const s of suitKeys) {
            for (const val of VALUES) {
                this.cards.push({
                    suit: s,
                    num: val.num,
                    name: `${val.name} de ${SUITS[s].name}`,
                    id: `${s}_${val.num}`
                });
            }
        }
    }

    shuffle() {
        // Algoritmo Fisher-Yates
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    // Extrae los 4 Caballos (11s) para colocarlos en la salida
    extractHorses() {
        const horses = {};
        const remaining = [];

        for (const card of this.cards) {
            if (card.num === 11) {
                horses[card.suit] = card;
            } else {
                remaining.push(card);
            }
        }
        this.cards = remaining;
        return horses;
    }

    // Extrae N cartas boca abajo para las vallas de la pista
    dealHurdles(count = 7) {
        const hurdles = [];
        for (let i = 0; i < count; i++) {
            if (this.cards.length > 0) {
                hurdles.push({
                    card: this.cards.shift(),
                    revealed: false,
                    step: i + 1
                });
            }
        }
        return hurdles;
    }

    // Roba una carta para avanzar la carrera
    draw() {
        return this.cards.shift() || null;
    }

    // Reinserta cartas del pozo de descarte si el mazo se agotase
    reshuffleFromDiscards(discards) {
        this.cards = [...discards];
        this.shuffle();
    }

    get count() {
        return this.cards.length;
    }
}

window.SUITS = SUITS;
window.SpanishDeck = SpanishDeck;
window.renderCardHtml = renderCardHtml;
window.getHorseRunnerSvg = getHorseRunnerSvg;
window.getSuitSvg = getSuitSvg;
