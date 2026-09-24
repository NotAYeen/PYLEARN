export const AudioFX = {
    muted: false,
    ctx: null,

    init() {
        if (this.ctx) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        } catch (e) {
        }
    },

    playTone(freq, type, duration, vol = 0.1) {
        if (this.muted || !this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    },

    keyPress() { this.playTone(800, 'square', 0.05, 0.02); },
    success() {
        this.playTone(440, 'sine', 0.1, 0.1);
        setTimeout(() => this.playTone(660, 'sine', 0.2, 0.15), 100);
    },
    error() {
        this.playTone(200, 'sawtooth', 0.2, 0.1);
        setTimeout(() => this.playTone(150, 'sawtooth', 0.3, 0.1), 150);
    }
};