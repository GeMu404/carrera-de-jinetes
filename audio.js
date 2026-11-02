// Sistema de Sonido Procedural usando Web Audio API
// 100% autónomo, sin dependencias externas ni archivos de audio pesados

class SoundEffects {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.initialized = false;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            this.initialized = true;
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }

    // Sonido al voltear o deslizar una carta
    playCardFlip() {
        if (this.muted) return;
        this.init();

        const now = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * 0.08;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1200, now);
        filter.frequency.exponentialRampToValueAtTime(300, now + 0.08);
        filter.Q.value = 3.0;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noise.start(now);
    }

    // Sonido de galope (cascos de caballo tocando el suelo)
    playGallop() {
        if (this.muted) return;
        this.init();

        const now = this.ctx.currentTime;
        
        // Golpe 1 (más agudo)
        this._playHoof(now, 260, 0.25);
        // Golpe 2 (más grave, rápido después)
        this._playHoof(now + 0.07, 180, 0.3);
    }

    _playHoof(time, freq, vol) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);
        osc.frequency.exponentialRampToValueAtTime(60, time + 0.06);

        filter.type = 'lowpass';
        filter.frequency.value = 600;

        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(time);
        osc.stop(time + 0.07);
    }

    // Fanfarria clásica de hipódromo ("Call to the Post" / Corneta de Largada)
    playBugleCall() {
        if (this.muted) return;
        this.init();

        const now = this.ctx.currentTime;
        // Notas tradicionales de corneta de largada (Sol3, Do4, Mi4, Sol4)
        // C4 = 261.63, E4 = 329.63, G4 = 392.00, C5 = 523.25
        const notes = [
            { f: 261.63, d: 0.12, pause: 0.04 }, // C4
            { f: 329.63, d: 0.12, pause: 0.04 }, // E4
            { f: 392.00, d: 0.12, pause: 0.04 }, // G4
            { f: 523.25, d: 0.28, pause: 0.08 }, // C5
            { f: 392.00, d: 0.12, pause: 0.04 }, // G4
            { f: 523.25, d: 0.40, pause: 0.10 }  // C5 largo
        ];

        let cursor = now + 0.05;
        notes.forEach(note => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            osc.type = 'sawtooth';
            osc.frequency.value = note.f;

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1400, cursor);
            filter.frequency.exponentialRampToValueAtTime(900, cursor + note.d);

            gain.gain.setValueAtTime(0, cursor);
            gain.gain.linearRampToValueAtTime(0.3, cursor + 0.02);
            gain.gain.setValueAtTime(0.28, cursor + note.d - 0.03);
            gain.gain.linearRampToValueAtTime(0.001, cursor + note.d);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(cursor);
            osc.stop(cursor + note.d);

            cursor += note.d + note.pause;
        });
    }

    // Relincho y tropiezo en valla (cuando un caballo retrocede)
    playHurdlePenalty() {
        if (this.muted) return;
        this.init();

        const now = this.ctx.currentTime;
        
        // Sonido de frenazo / tropiezo
        const osc = this.ctx.createOscillator();
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        const mainGain = this.ctx.createGain();

        // Vibrato de relincho
        lfo.frequency.value = 16;
        lfoGain.gain.value = 90;
        lfo.connect(osc.frequency);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(750, now);
        osc.frequency.linearRampToValueAtTime(850, now + 0.15);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.5);

        mainGain.gain.setValueAtTime(0.25, now);
        mainGain.gain.exponentialRampToValueAtTime(0.01, now + 0.55);

        osc.connect(mainGain);
        mainGain.connect(this.ctx.destination);

        lfo.start(now);
        osc.start(now);
        lfo.stop(now + 0.55);
        osc.stop(now + 0.55);

        // Sonido de golpe sordo
        const thud = this.ctx.createOscillator();
        const thudGain = this.ctx.createGain();
        thud.type = 'sine';
        thud.frequency.setValueAtTime(130, now);
        thud.frequency.exponentialRampToValueAtTime(40, now + 0.25);
        thudGain.gain.setValueAtTime(0.4, now);
        thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        thud.connect(thudGain);
        thudGain.connect(this.ctx.destination);
        thud.start(now);
        thud.stop(now + 0.25);
    }

    // Sonido de fichas al apostar
    playChip() {
        if (this.muted) return;
        this.init();

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(2200, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.06);
    }

    // Fanfarria triunfal de victoria
    playVictory() {
        if (this.muted) return;
        this.init();

        const now = this.ctx.currentTime;
        const chords = [
            { f: [523.25, 659.25, 783.99], time: 0, dur: 0.2 },      // Do Mayor
            { f: [587.33, 739.99, 880.00], time: 0.22, dur: 0.2 },   // Re Mayor
            { f: [659.25, 830.61, 987.77], time: 0.44, dur: 0.2 },   // Mi Mayor
            { f: [783.99, 987.77, 1046.50, 1318.51], time: 0.68, dur: 0.8 } // Acorde apoteósico
        ];

        chords.forEach(c => {
            c.f.forEach(freq => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'triangle';
                osc.frequency.value = freq;

                gain.gain.setValueAtTime(0, now + c.time);
                gain.gain.linearRampToValueAtTime(0.12, now + c.time + 0.02);
                gain.gain.setValueAtTime(0.1, now + c.time + c.dur - 0.04);
                gain.gain.exponentialRampToValueAtTime(0.001, now + c.time + c.dur);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(now + c.time);
                osc.stop(now + c.time + c.dur + 0.05);
            });
        });
    }
}

window.soundEffects = new SoundEffects();
