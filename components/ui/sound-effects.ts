/**
 * Web Audio API Synthesizer for Space Ambient & Sci-Fi SFX
 * Zero external audio assets required - pure web audio oscillators!
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = true;
  private ambientGain: GainNode | null = null;
  private ambientOsc1: OscillatorNode | null = null;
  private ambientOsc2: OscillatorNode | null = null;

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    } catch {
      console.warn("Web Audio API not supported");
    }
  }

  public toggleMute(): boolean {
    this.init();
    if (!this.ctx) return true;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.isMuted = !this.isMuted;

    if (this.isMuted) {
      this.stopAmbient();
    } else {
      this.startAmbient();
      this.playClick();
    }

    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public startAmbient() {
    if (!this.ctx || this.isMuted) return;

    this.stopAmbient();

    const now = this.ctx.currentTime;
    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.setValueAtTime(0.01, now);
    this.ambientGain.gain.exponentialRampToValueAtTime(0.08, now + 3);

    // Deep cosmic hum
    this.ambientOsc1 = this.ctx.createOscillator();
    this.ambientOsc1.type = 'sine';
    this.ambientOsc1.frequency.setValueAtTime(55, now); // A1 note

    this.ambientOsc2 = this.ctx.createOscillator();
    this.ambientOsc2.type = 'triangle';
    this.ambientOsc2.frequency.setValueAtTime(110.5, now); // Slightly detuned A2

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, now);

    this.ambientOsc1.connect(filter);
    this.ambientOsc2.connect(filter);
    filter.connect(this.ambientGain);
    this.ambientGain.connect(this.ctx.destination);

    this.ambientOsc1.start(now);
    this.ambientOsc2.start(now);
  }

  public stopAmbient() {
    if (this.ambientOsc1) {
      try { this.ambientOsc1.stop(); } catch {}
      this.ambientOsc1 = null;
    }
    if (this.ambientOsc2) {
      try { this.ambientOsc2.stop(); } catch {}
      this.ambientOsc2 = null;
    }
  }

  public playClick() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch {}
  }

  public playSwoosh() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * 0.3;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(200, now);
      filter.frequency.exponentialRampToValueAtTime(1800, now + 0.15);
      filter.frequency.exponentialRampToValueAtTime(100, now + 0.3);
      filter.Q.value = 3;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      whiteNoise.start(now);
      whiteNoise.stop(now + 0.3);
    } catch {}
  }
}

export const soundEngine = new SoundEngine();
