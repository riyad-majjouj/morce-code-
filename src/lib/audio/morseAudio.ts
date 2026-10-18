import { wpmToUnitMs } from '../morse/morseUtils';

class MorseAudioEngine {
  private ctx: AudioContext | null = null;
  private currentPlaybackTimeouts: number[] = [];
  private activeKeyOscillator: OscillatorNode | null = null;
  private activeKeyGain: GainNode | null = null;
  private isAudioUnlocked = false;

  private getAudioContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlockAudio(): void {
    if (this.isAudioUnlocked) return;
    try {
      const ctx = this.getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      this.isAudioUnlocked = true;
    } catch {
      // ignore
    }
  }

  /**
   * Plays a single shaped Morse tone burst with envelope to avoid audio clipping clicks
   */
  public playTone(frequency: number, durationMs: number, volume: number = 0.7): Promise<void> {
    return new Promise((resolve) => {
      try {
        const ctx = this.getAudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(frequency, ctx.currentTime);

        const now = ctx.currentTime;
        const rampDuration = 0.006; // 6ms gentle fade
        const durSec = durationMs / 1000;

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(Math.max(0.01, volume), now + rampDuration);
        gain.gain.setValueAtTime(Math.max(0.01, volume), now + Math.max(rampDuration, durSec - rampDuration));
        gain.gain.linearRampToValueAtTime(0.0001, now + durSec);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + durSec);

        setTimeout(() => {
          try {
            osc.disconnect();
            gain.disconnect();
          } catch {
            // ignore
          }
          resolve();
        }, durationMs);
      } catch {
        resolve();
      }
    });
  }

  /**
   * Plays a complete Morse pattern sequence (e.g. "... --- ..." or ".-")
   * Respects dots, dashes, intra-char spaces, and inter-char spaces.
   */
  public playSequence(
    morseText: string,
    options: {
      frequency?: number;
      wpm?: number;
      volume?: number;
      onSymbolActive?: (index: number) => void;
      onComplete?: () => void;
    } = {}
  ): { stop: () => void } {
    this.stopSequence();
    this.unlockAudio();

    const freq = options.frequency ?? 650;
    const wpm = options.wpm ?? 15;
    const vol = options.volume ?? 0.7;
    const unitMs = wpmToUnitMs(wpm);

    const dotDuration = unitMs;
    const dashDuration = unitMs * 3;
    const intraCharGap = unitMs;
    const interCharGap = unitMs * 3;
    const wordGap = unitMs * 7;

    let totalOffsetMs = 0;
    const cleanPattern = morseText.trim();

    for (let i = 0; i < cleanPattern.length; i++) {
      const char = cleanPattern[i];
      const currentIndex = i;

      if (char === '.') {
        const timeoutId = window.setTimeout(() => {
          options.onSymbolActive?.(currentIndex);
          this.playTone(freq, dotDuration, vol);
        }, totalOffsetMs);
        this.currentPlaybackTimeouts.push(timeoutId);
        totalOffsetMs += dotDuration + intraCharGap;
      } else if (char === '-') {
        const timeoutId = window.setTimeout(() => {
          options.onSymbolActive?.(currentIndex);
          this.playTone(freq, dashDuration, vol);
        }, totalOffsetMs);
        this.currentPlaybackTimeouts.push(timeoutId);
        totalOffsetMs += dashDuration + intraCharGap;
      } else if (char === ' ') {
        // Space between characters
        totalOffsetMs += interCharGap - intraCharGap;
      } else if (char === '/') {
        // Space between words
        totalOffsetMs += wordGap - intraCharGap;
      }
    }

    // Schedule completion
    const endTimeout = window.setTimeout(() => {
      this.currentPlaybackTimeouts = [];
      options.onComplete?.();
    }, totalOffsetMs + 50);
    this.currentPlaybackTimeouts.push(endTimeout);

    return {
      stop: () => this.stopSequence(),
    };
  }

  public stopSequence(): void {
    for (const t of this.currentPlaybackTimeouts) {
      clearTimeout(t);
    }
    this.currentPlaybackTimeouts = [];
  }

  /**
   * Starts a continuous tone for the manual telegraph key
   */
  public startTelegraphTone(frequency: number = 650, volume: number = 0.7): void {
    if (this.activeKeyOscillator) return;
    try {
      const ctx = this.getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);

      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.005);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);

      this.activeKeyOscillator = osc;
      this.activeKeyGain = gain;
    } catch {
      // ignore
    }
  }

  /**
   * Stops the continuous telegraph key tone
   */
  public stopTelegraphTone(): void {
    if (!this.activeKeyOscillator || !this.activeKeyGain) return;
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;
      this.activeKeyGain.gain.setValueAtTime(this.activeKeyGain.gain.value, now);
      this.activeKeyGain.gain.linearRampToValueAtTime(0.0001, now + 0.005);

      const osc = this.activeKeyOscillator;
      const gain = this.activeKeyGain;
      setTimeout(() => {
        try {
          osc.stop();
          osc.disconnect();
          gain.disconnect();
        } catch {
          // ignore
        }
      }, 10);
    } catch {
      // ignore
    } finally {
      this.activeKeyOscillator = null;
      this.activeKeyGain = null;
    }
  }

  // --- Sound Effects ---

  public playSuccessSound(volume: number = 0.6): void {
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;
      // 2-tone ascending chime: C5 (523.25) -> G5 (783.99)
      const playChimeNote = (freq: number, startDelay: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + startDelay);
        gain.gain.setValueAtTime(0.001, now + startDelay);
        gain.gain.linearRampToValueAtTime(volume * 0.7, now + startDelay + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + startDelay + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + startDelay);
        osc.stop(now + startDelay + duration);
      };

      playChimeNote(523.25, 0, 0.15);
      playChimeNote(783.99, 0.1, 0.25);
    } catch {
      // ignore
    }
  }

  public playErrorSound(volume: number = 0.6): void {
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(160, now + 0.25);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(volume * 0.4, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } catch {
      // ignore
    }
  }

  public playFanfareSound(volume: number = 0.7): void {
    try {
      const ctx = this.getAudioContext();
      const notes = [440, 554.37, 659.25, 880]; // A major arpeggio
      notes.forEach((freq, idx) => {
        const now = ctx.currentTime;
        const start = now + idx * 0.1;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(volume * 0.6, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + (idx === 3 ? 0.4 : 0.2));
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + (idx === 3 ? 0.4 : 0.2));
      });
    } catch {
      // ignore
    }
  }
}

export const morseAudio = new MorseAudioEngine();
