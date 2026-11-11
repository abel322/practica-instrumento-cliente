// lib/audio/clientAudioEngines.ts

class ClientPianoEngine {
  private ctx: AudioContext | null = null;
  private sampleCache: Map<string, AudioBuffer> = new Map();
  private isLoaded = false;
  private masterGain: GainNode | null = null;

  private sampleBaseUrl =
    'https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts@gh-pages/FluidR3_GM/acoustic_grand_piano-mp3';

  private anchors = [
    { name: 'C2', midi: 36 },
    { name: 'C3', midi: 48 },
    { name: 'C4', midi: 60 },
    { name: 'C5', midi: 72 },
    { name: 'C6', midi: 84 },
  ];

  public init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(1.1, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
      this.preload();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  private async preload() {
    if (this.isLoaded || !this.ctx) return;
    try {
      await Promise.all(
        this.anchors.map(async (a) => {
          const res = await fetch(`${this.sampleBaseUrl}/${a.name}.mp3`);
          const arrayBuf = await res.arrayBuffer();
          const audioBuf = await this.ctx!.decodeAudioData(arrayBuf);
          this.sampleCache.set(a.name, audioBuf);
        })
      );
      this.isLoaded = true;
    } catch (e) {
      console.warn('Error precargando piano cliente', e);
    }
  }

  public playChord(midis: number[], duration = 1.4, velocity = 90) {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const masterGain = this.masterGain;
    const now = ctx.currentTime;

    midis.forEach((midi) => {
      let closest = this.anchors[0];
      let minDiff = Math.abs(midi - closest.midi);
      for (const a of this.anchors) {
        const d = Math.abs(midi - a.midi);
        if (d < minDiff) {
          minDiff = d;
          closest = a;
        }
      }

      const buffer = this.sampleCache.get(closest.name) || this.sampleCache.get('C4');
      if (!buffer) return;

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const rate = Math.pow(2, (midi - closest.midi) / 12);
      source.playbackRate.setValueAtTime(rate, now);

      const gain = ctx.createGain();
      const peak = (velocity / 100) * 0.9;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(peak, now + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      source.connect(gain);
      gain.connect(masterGain);
      source.start(now);
      source.stop(now + duration + 0.05);
    });
  }
}

class ClientStringsEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  private init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.9, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  public playNote(midi: number, isBass = false, duration = 0.8) {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const freq = 440 * Math.pow(2, (midi - 69) / 12);

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = isBass ? 'triangle' : 'sawtooth';
    osc.frequency.setValueAtTime(freq, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isBass ? 2400 : 4500, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.8, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration + 0.05);
  }
}

class ClientDrumEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.9, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Crear buffer de ruido blanco para caja y platillos
      const bufferSize = this.ctx.sampleRate * 1;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buffer;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  public playHit(instrument: string, velocity = 0.8) {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const inst = (instrument || 'snare').toLowerCase();

    if (inst.includes('kick') || inst.includes('bombo')) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.12);

      gain.gain.setValueAtTime(velocity, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.36);
    } else if (inst.includes('snare') || inst.includes('caja')) {
      // Cuerpo
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);
      oscGain.gain.setValueAtTime(velocity * 0.7, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(oscGain);
      oscGain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.16);

      // Ruido
      if (this.noiseBuffer) {
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(1200, now);
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(velocity * 0.8, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.masterGain);
        noise.start(now);
        noise.stop(now + 0.23);
      }
    } else {
      // Hi-hat / platillos
      if (this.noiseBuffer) {
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(7000, now);
        const gain = this.ctx.createGain();
        const decay = inst.includes('open') || inst.includes('crash') ? 0.4 : 0.06;
        gain.gain.setValueAtTime(velocity * 0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + decay);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        noise.start(now);
        noise.stop(now + decay + 0.01);
      }
    }
  }
}

export const clientPianoEngine = new ClientPianoEngine();
export const clientStringsEngine = new ClientStringsEngine();
export const clientDrumEngine = new ClientDrumEngine();
