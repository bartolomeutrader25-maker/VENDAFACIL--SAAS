// POS Audio Synthesizer Engine using native Web Audio API
// No external audio files required, zero latency, offline-ready

export type SaleSuccessSoundType = 'caixa_registadora' | 'fanfarra_vitoria' | 'chime_moderno' | 'suave';
export type LowStockSoundType = 'triplo_urgente' | 'grave_aviso' | 'sino_atencao' | 'sirene_curta';
export type ItemAddedSoundType = 'bip_laser' | 'gota_d_agua' | 'suave';

export interface PosAudioSettings {
  enabled: boolean;
  volume: number; // 0 to 1
  saleSuccessSound: SaleSuccessSoundType;
  lowStockSound: LowStockSoundType;
  itemAddedSound: ItemAddedSoundType;
}

const STORAGE_KEY = 'vendafacil_pos_sound_settings_v1';

const DEFAULT_SETTINGS: PosAudioSettings = {
  enabled: true,
  volume: 0.8,
  saleSuccessSound: 'caixa_registadora',
  lowStockSound: 'triplo_urgente',
  itemAddedSound: 'bip_laser',
};

class PosAudioManager {
  private settings: PosAudioSettings;
  private audioCtx: AudioContext | null = null;

  constructor() {
    this.settings = this.loadSettings();
  }

  private loadSettings(): PosAudioSettings {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (e) {
      console.warn('Erro ao carregar configurações de som do PDV:', e);
    }
    return { ...DEFAULT_SETTINGS };
  }

  public getSettings(): PosAudioSettings {
    return { ...this.settings };
  }

  public saveSettings(newSettings: Partial<PosAudioSettings>): PosAudioSettings {
    this.settings = { ...this.settings, ...newSettings };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (e) {}
    return this.getSettings();
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.audioCtx) {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          this.audioCtx = new AudioCtxClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return this.audioCtx;
    } catch (e) {
      return null;
    }
  }

  // --- Sound Synthesizers ---

  // 1. Confirmação de Venda (Sucesso)
  public playSaleSuccess(soundType?: SaleSuccessSoundType) {
    if (!this.settings.enabled && !soundType) return;
    const type = soundType || this.settings.saleSuccessSound;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const baseVol = this.settings.volume;

    if (type === 'caixa_registadora') {
      // Classic cash register bell & coin chime
      const t = ctx.currentTime;

      // Bell 1: high metallic ping
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(2093, t); // C7
      gain1.gain.setValueAtTime(baseVol * 0.45, t);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(t);
      osc1.stop(t + 0.65);

      // Bell 2: overtone shimmer
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(3136, t + 0.05); // G7
      gain2.gain.setValueAtTime(baseVol * 0.35, t + 0.05);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(t + 0.05);
      osc2.stop(t + 0.55);

      // Coin metallic rattle
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'square';
      osc3.frequency.setValueAtTime(4186, t + 0.08); // C8
      gain3.gain.setValueAtTime(baseVol * 0.15, t + 0.08);
      gain3.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(t + 0.08);
      osc3.stop(t + 0.3);
    } else if (type === 'fanfarra_vitoria') {
      // Triumphant ascending arpeggio (C5 -> E5 -> G5 -> C6)
      const notes = [523.25, 659.25, 783.99, 1046.5];
      const noteDuration = 0.09;
      notes.forEach((freq, idx) => {
        const t = ctx.currentTime + idx * noteDuration;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        const noteVol = idx === notes.length - 1 ? baseVol * 0.45 : baseVol * 0.3;
        const decay = idx === notes.length - 1 ? 0.45 : 0.12;
        gain.gain.setValueAtTime(noteVol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + decay);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + decay);
      });
    } else if (type === 'chime_moderno') {
      // Elegant 2-tone melodic chime
      const t = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, t); // A5
      gain1.gain.setValueAtTime(baseVol * 0.35, t);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(t);
      osc1.stop(t + 0.35);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1318.51, t + 0.14); // E6
      gain2.gain.setValueAtTime(baseVol * 0.45, t + 0.14);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(t + 0.14);
      osc2.stop(t + 0.6);
    } else {
      // Suave confirmation
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, t); // B5
      gain.gain.setValueAtTime(baseVol * 0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    }
  }

  // 2. Alerta de Stock Baixo / Crítico
  public playLowStock(soundType?: LowStockSoundType) {
    if (!this.settings.enabled && !soundType) return;
    const type = soundType || this.settings.lowStockSound;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const baseVol = this.settings.volume;

    if (type === 'triplo_urgente') {
      // Three distinct urgent warning pulses - loud & noticeable in busy environments
      const pulses = [0, 0.09, 0.18];
      pulses.forEach((offset, idx) => {
        const t = ctx.currentTime + offset;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(idx === 2 ? 880 : 660, t);
        gain.gain.setValueAtTime(baseVol * 0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.07);
      });
    } else if (type === 'grave_aviso') {
      // Heavy warning buzz chord (descending minor interval)
      const t = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(330, t); // E4
      osc2.frequency.setValueAtTime(392, t); // G4

      gain.gain.setValueAtTime(baseVol * 0.4, t);
      gain.gain.setValueAtTime(baseVol * 0.4, t + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.38);
      osc2.stop(t + 0.38);
    } else if (type === 'sino_atencao') {
      // Metallic dual-tone attention warning (descending alert)
      const t = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(740, t);
      gain1.gain.setValueAtTime(baseVol * 0.35, t);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(t);
      osc1.stop(t + 0.2);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(520, t + 0.14);
      gain2.gain.setValueAtTime(baseVol * 0.4, t + 0.14);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(t + 0.14);
      osc2.stop(t + 0.4);
    } else {
      // Sirene curta (frequency sweep)
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(450, t);
      osc.frequency.linearRampToValueAtTime(800, t + 0.15);
      osc.frequency.linearRampToValueAtTime(450, t + 0.3);
      gain.gain.setValueAtTime(baseVol * 0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.32);
    }
  }

  // 3. Adição de Produto / Bip
  public playItemAdded(soundType?: ItemAddedSoundType) {
    if (!this.settings.enabled && !soundType) return;
    const type = soundType || this.settings.itemAddedSound;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const baseVol = this.settings.volume;
    const t = ctx.currentTime;

    if (type === 'bip_laser') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, t);
      osc.frequency.exponentialRampToValueAtTime(1800, t + 0.07);
      gain.gain.setValueAtTime(baseVol * 0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.09);
    } else if (type === 'gota_d_agua') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.exponentialRampToValueAtTime(1200, t + 0.08);
      gain.gain.setValueAtTime(baseVol * 0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.12);
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1100, t);
      gain.gain.setValueAtTime(baseVol * 0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.06);
    }
  }
}

export const posAudio = new PosAudioManager();
