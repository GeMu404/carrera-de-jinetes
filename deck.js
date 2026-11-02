// Definición y Renderizador Gráfico Vectorial de la Baraja Española
// 40 cartas: Oros, Copas, Espadas, Bastos (1 al 7, 10, 11, 12)

const SUITS = {
    oros: {
        id: 'oros',
        frame: '#c98a00',
        ink: '#8a5300',
        cloth: '#e8a317',
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
        frame: '#c62828',
        ink: '#8e1414',
        cloth: '#d42b2b',
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
        frame: '#2c5fc7',
        ink: '#1d3a7a',
        cloth: '#2c5fc7',
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
        frame: '#2f8a3e',
        ink: '#14532d',
        cloth: '#2fa34a',
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

// Formas de los 4 palos en coordenadas 0..100 (colores planos, sin gradientes ni ids:
// asi no hay colisiones de id entre cientos de SVG ni fallos cuando el primero esta oculto)
function suitShape(suitId) {
    switch (suitId) {
        case 'oros':
            return `<circle cx="50" cy="50" r="44" fill="#f4b223" stroke="#8a5300" stroke-width="4"/>
                <circle cx="50" cy="50" r="33" fill="none" stroke="#b86e00" stroke-width="2.5"/>
                <circle cx="50" cy="50" r="22" fill="#ffd86a" stroke="#8a5300" stroke-width="2.5"/>
                <path d="M50 30v40M30 50h40M36 36l28 28M64 36L36 64" stroke="#b86e00" stroke-width="3" stroke-linecap="round"/>
                <circle cx="50" cy="50" r="7" fill="#e0402f" stroke="#8a5300" stroke-width="2"/>`;
        case 'copas':
            return `<path d="M20 14h60l-4 30q-6 26-26 28q-20-2-26-28z" fill="#d42b2b" stroke="#6e0f0f" stroke-width="3.5" stroke-linejoin="round"/>
                <path d="M19 12h62v8H19z" fill="#f4b223" stroke="#8a5300" stroke-width="3" stroke-linejoin="round"/>
                <circle cx="50" cy="40" r="7" fill="#f4b223" stroke="#8a5300" stroke-width="2.5"/>
                <path d="M44 72h12l3 12H41z" fill="#f4b223" stroke="#8a5300" stroke-width="3" stroke-linejoin="round"/>
                <path d="M26 92q24-12 48 0z" fill="#f4b223" stroke="#8a5300" stroke-width="3" stroke-linejoin="round"/>`;
        case 'espadas':
            return `<path d="M50 4l7 14v52H43V18z" fill="#cfd8e3" stroke="#1d3a7a" stroke-width="3" stroke-linejoin="round"/>
                <path d="M50 12v56" stroke="#1d3a7a" stroke-width="2"/>
                <path d="M22 68h56v8H22z" fill="#f4b223" stroke="#8a5300" stroke-width="3" stroke-linejoin="round"/>
                <path d="M45 76h10v14H45z" fill="#2c5fc7" stroke="#1d3a7a" stroke-width="3"/>
                <circle cx="50" cy="93" r="5" fill="#f4b223" stroke="#8a5300" stroke-width="2.5"/>`;
        case 'bastos':
            return `<path d="M40 94q-2-30 2-56q-4-18 2-30q6-6 12 0q6 12 2 30q4 26 2 56z" fill="#b5762f" stroke="#4a2a0c" stroke-width="3.5" stroke-linejoin="round"/>
                <path d="M44 30q8 4 12 0M42 56q8 4 16 0M42 78q8 4 16 0" stroke="#4a2a0c" stroke-width="2.5" fill="none" stroke-linecap="round"/>
                <path d="M42 22q-14-8-16 6q8 2 16-2z M58 46q14-8 16 6q-8 2-16-2z M42 66q-14-8-16 6q8 2 16-2z" fill="#2fa34a" stroke="#14532d" stroke-width="2.5" stroke-linejoin="round"/>`;
    }
    return '';
}

function getSuitSvg(suitId, size = 32) {
    return `<svg class="suit-svg" width="${size}" height="${size}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${suitShape(suitId)}</svg>`;
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

// ===== Render de cartas: un solo SVG por carta (viewBox 200x300), escala nítida a cualquier tamaño =====
const CARD_W = 200, CARD_H = 300;

function pip(suitId, cx, cy, s, rot = 0) {
    const k = s / 100;
    return `<g transform="translate(${cx - s / 2} ${cy - s / 2}) scale(${k})${rot ? ` rotate(${rot} 50 50)` : ''}">${suitShape(suitId)}</g>`;
}

// Posiciones de pintas para 2..7 (centros) y tamaño
const PIP_LAYOUTS = {
    2: { s: 70, p: [[100, 88], [100, 212]] },
    3: { s: 62, p: [[100, 78], [100, 150], [100, 222]] },
    4: { s: 60, p: [[68, 90], [132, 90], [68, 210], [132, 210]] },
    5: { s: 56, p: [[68, 84], [132, 84], [100, 150], [68, 216], [132, 216]] },
    6: { s: 54, p: [[68, 76], [132, 76], [68, 150], [132, 150], [68, 224], [132, 224]] },
    7: { s: 48, p: [[68, 72], [132, 72], [100, 111], [68, 150], [132, 150], [68, 228], [132, 228]] }
};

// Orla con "pintas" (cortes): oros 0, copas 1, espadas 2, bastos 3
function cardFrame(suit) {
    const c = suit.frame;
    let gaps = '';
    const n = suit.pintas;
    for (let i = 0; i < n; i++) {
        const x = 100 + (i - (n - 1) / 2) * 18 - 5;
        gaps += `<rect x="${x}" y="5" width="10" height="6" class="card-paper"/><rect x="${x}" y="289" width="10" height="6" class="card-paper"/>`;
    }
    return `<rect x="8" y="8" width="184" height="284" rx="8" fill="none" stroke="${c}" stroke-width="3"/>${gaps}`;
}

function cornerIndex(card, suit) {
    const t = `<text x="28" y="43" text-anchor="middle" class="card-idx" fill="${suit.ink}">${card.num}</text>`;
    return t + `<g transform="rotate(180 100 150)">${t}</g>`;
}

// Figuras: personaje en 132x204 (se traslada al centro de la carta)
function figureArt(card, suit) {
    const s = card.suit, col = suit.cloth, dk = suit.ink;
    const skin = '#f3cfa6', line = '#2a1a10';
    if (card.num === 11) {
        // Caballo con jinete
        return `
        <path d="M14 170q-6-40 10-62q30-10 62-2q16-24 26-40q12-2 14 10l-10 26q6 14-2 28q-6 10-14 12l2 30h-10l-4-24q-26 8-50 2l-6 26H18z" fill="#f2efe8" stroke="${line}" stroke-width="3" stroke-linejoin="round"/>
        <path d="M110 66l6-12 6 10" fill="#f2efe8" stroke="${line}" stroke-width="3" stroke-linejoin="round"/>
        <circle cx="114" cy="80" r="2.5" fill="${line}"/>
        <path d="M100 74q-14 10-18 30" stroke="${line}" stroke-width="3" fill="none"/>
        <path d="M40 104h44v18H40z" fill="${col}" stroke="${line}" stroke-width="3"/>
        <path d="M48 102q0-34 14-42q14 8 14 42z" fill="${col}" stroke="${line}" stroke-width="3" stroke-linejoin="round"/>
        <path d="M60 104l-4 40h10l4-40z" fill="#3b2a1a" stroke="${line}" stroke-width="2.5"/>
        <circle cx="62" cy="46" r="11" fill="${skin}" stroke="${line}" stroke-width="2.5"/>
        <path d="M49 42q13-16 26 0z" fill="${dk}" stroke="${line}" stroke-width="2.5"/>
        <path d="M72 70l20-22" stroke="${line}" stroke-width="5" stroke-linecap="round"/>
        ${pip(s, 98, 30, 44)}`;
    }
    const king = card.num === 12;
    return `
        ${king ? `<path d="M30 70h72l14 128H16z" fill="${dk}" stroke="${line}" stroke-width="3" stroke-linejoin="round"/>` : ''}
        ${king ? '' : `<path d="M50 150h12v44H50zM70 150h12v44H70z" fill="#e8dcc0" stroke="${line}" stroke-width="2.5"/>
        <path d="M44 194h20v6H44zM68 194h20v6H68z" fill="${line}"/>`}
        <path d="M42 72h48l${king ? '12 118H30' : '10 80H32'}z" fill="${col}" stroke="${line}" stroke-width="3" stroke-linejoin="round"/>
        <path d="M66 74v${king ? 114 : 76}" stroke="#f4b223" stroke-width="4"/>
        <path d="M36 ${king ? 118 : 116}h60" stroke="#f4b223" stroke-width="5"/>
        <path d="M42 76q-14 18-10 46" stroke="${col}" stroke-width="10" stroke-linecap="round" fill="none"/>
        <path d="M90 76q14 8 14 26" stroke="${col}" stroke-width="10" stroke-linecap="round" fill="none"/>
        <circle cx="32" cy="124" r="5" fill="${skin}" stroke="${line}" stroke-width="2"/>
        <circle cx="66" cy="50" r="17" fill="${skin}" stroke="${line}" stroke-width="2.5"/>
        ${king
            ? `<path d="M52 64q14 18 28 0q-2 12-14 14q-12-2-14-14z" fill="#e9e2d0" stroke="${line}" stroke-width="2"/>
               <path d="M48 36l4-20 8 12 6-16 6 16 8-12 4 20z" fill="#f4b223" stroke="#8a5300" stroke-width="2.5" stroke-linejoin="round"/>`
            : `<path d="M46 44q4-20 22-18q18 0 20 16q-20-8-42 2z" fill="${dk}" stroke="${line}" stroke-width="2.5" stroke-linejoin="round"/>
               <path d="M84 36q12-14 22-12q-10 6-18 16z" fill="#f4b223" stroke="#8a5300" stroke-width="2"/>`}
        <circle cx="60" cy="50" r="1.8" fill="${line}"/><circle cx="72" cy="50" r="1.8" fill="${line}"/>
        ${pip(s, 104, king ? 120 : 112, king ? 46 : 50)}`;
}

function cardBackSvg() {
    let lat = '';
    for (let i = -300; i <= 300; i += 20) {
        lat += `M${i + 16} 16L${i + 300} 300M${i + 184} 16L${i - 100} 300`;
    }
    return `<svg class="card-svg" viewBox="0 0 ${CARD_W} ${CARD_H}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="0" y="0" width="200" height="300" rx="14" class="back-bg"/>
        <svg x="16" y="16" width="168" height="268" viewBox="16 16 168 268"><path d="${lat}" class="back-line" stroke-width="2.5" fill="none"/></svg>
        <rect x="9" y="9" width="182" height="282" rx="9" fill="none" class="back-frame" stroke-width="3"/>
        <rect x="16" y="16" width="168" height="268" rx="5" fill="none" class="back-frame" stroke-width="2"/>
        <g transform="translate(100 150)">
            <path d="M0 -46L40 0L0 46L-40 0Z" class="back-bg back-frame" stroke-width="3"/>
            <circle r="22" fill="none" class="back-frame" stroke-width="3"/>
            <path d="M0 -22v44M-22 0h44M-15 -15l30 30M15 -15l-30 30" class="back-frame" stroke-width="2.5"/>
            <circle r="6" class="back-dot"/>
        </g>
    </svg>`;
}

// Generador de carta visual HTML completa
function renderCardHtml(card, isFaceDown = false, isHurdle = false) {
    const hc = isHurdle ? ' hurdle-card' : '';
    if (isFaceDown || !card) {
        return `<div class="spanish-card card-back${hc}">${cardBackSvg()}</div>`;
    }
    const suit = SUITS[card.suit];
    let body;
    if (card.num === 1) {
        body = `<ellipse cx="100" cy="150" rx="70" ry="74" fill="none" stroke="${suit.frame}" stroke-width="2" stroke-dasharray="3 5"/>${pip(card.suit, 100, 150, 116)}`;
    } else if (card.num >= 10) {
        body = `<rect x="34" y="50" width="132" height="200" rx="4" fill="${suit.lightBg}" stroke="${suit.frame}" stroke-width="2"/>
            <g transform="translate(34 48)">${figureArt(card, suit)}</g>`;
    } else {
        const L = PIP_LAYOUTS[card.num];
        body = L.p.map(([x, y]) => pip(card.suit, x, y, L.s)).join('');
    }
    return `<div class="spanish-card card-front suit-${card.suit}${hc}" data-suit="${card.suit}" data-num="${card.num}" role="img" aria-label="${card.name}">
        <svg class="card-svg" viewBox="0 0 ${CARD_W} ${CARD_H}" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="0" width="200" height="300" rx="14" class="card-paper"/>
            ${cardFrame(suit)}${cornerIndex(card, suit)}${body}
        </svg></div>`;
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
