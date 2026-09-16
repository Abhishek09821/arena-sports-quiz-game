/* ═══════════════════════════════════════════════════════════════
   ARENA — Audio Engine
   Centralized Web Audio API manager with punchy synthesized
   sound effects, auto-unlock on user interaction, and mute controls.
   ═══════════════════════════════════════════════════════════════ */

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let sfxEnabled = true;
let sfxVolume = 0.35; // Clearly audible and balanced

// Initialize persistence from localStorage if in browser
if (typeof window !== "undefined") {
  try {
    const saved = localStorage.getItem("arena_sfx_enabled");
    if (saved !== null) {
      sfxEnabled = saved === "true";
    }
  } catch {
    // Ignore storage issues
  }
}

function ensureAudio(): { ctx: AudioContext; master: GainNode } | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      ctx = new AudioCtx();
      masterGain = ctx.createGain();
      masterGain.gain.value = sfxVolume;
      masterGain.connect(ctx.destination);
    }
    if (ctx.state === "suspended") {
      void ctx.resume();
    }
    return { ctx, master: masterGain! };
  } catch {
    return null;
  }
}

// Auto-unlock audio context on any first user gesture in browser
if (typeof window !== "undefined") {
  const unlockListener = () => {
    ensureAudio();
    window.removeEventListener("pointerdown", unlockListener);
    window.removeEventListener("keydown", unlockListener);
  };
  window.addEventListener("pointerdown", unlockListener, { once: true, passive: true });
  window.addEventListener("keydown", unlockListener, { once: true, passive: true });
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType = "sine",
  volume = 0.15,
  delay = 0
) {
  if (!sfxEnabled) return;
  const a = ensureAudio();
  if (!a) return;
  const { ctx, master } = a;
  try {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    g.gain.setValueAtTime(0.0001, ctx.currentTime + delay);
    g.gain.linearRampToValueAtTime(volume, ctx.currentTime + delay + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + duration);
    o.connect(g).connect(master);
    o.start(ctx.currentTime + delay);
    o.stop(ctx.currentTime + delay + duration + 0.02);
  } catch {
    // Ignore audio glitches
  }
}

function noise(duration: number, volume = 0.08, delay = 0) {
  if (!sfxEnabled) return;
  const a = ensureAudio();
  if (!a) return;
  const { ctx, master } = a;
  try {
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.4;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const g = ctx.createGain();
    g.gain.setValueAtTime(volume, ctx.currentTime + delay);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + duration);
    src.connect(g).connect(master);
    src.start(ctx.currentTime + delay);
    src.stop(ctx.currentTime + delay + duration + 0.02);
  } catch {
    // Ignore
  }
}

export const audio = {
  /** Unlock audio context after first user interaction */
  unlock: ensureAudio,

  /** Get/set SFX enabled */
  get sfxEnabled() {
    return sfxEnabled;
  },
  set sfxEnabled(v: boolean) {
    sfxEnabled = v;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("arena_sfx_enabled", String(v));
      } catch {
        // Ignore
      }
    }
  },

  /** Toggle sound on/off */
  toggle() {
    this.sfxEnabled = !this.sfxEnabled;
    if (this.sfxEnabled) {
      ensureAudio();
      this.click();
    }
    return this.sfxEnabled;
  },

  /** Get/set SFX volume (0-1) */
  get volume() {
    return sfxVolume;
  },
  set volume(v: number) {
    sfxVolume = Math.max(0, Math.min(1, v));
    if (masterGain) masterGain.gain.value = sfxVolume;
  },

  // ── UI Sounds ────────────────────────────────────────────
  click() {
    tone(640, 0.05, "sine", 0.16);
  },

  tap() {
    tone(720, 0.03, "sine", 0.12);
  },

  hover() {
    tone(460, 0.025, "sine", 0.06);
  },

  select() {
    tone(540, 0.06, "sine", 0.18);
    tone(720, 0.05, "sine", 0.14, 0.035);
  },

  navigate() {
    tone(500, 0.04, "sine", 0.14);
  },

  // ── Timer Sounds ─────────────────────────────────────────
  tick() {
    tone(800, 0.04, "sine", 0.15);
  },

  urgentTick() {
    tone(1020, 0.05, "triangle", 0.22);
  },

  // ── Answer Feedback ──────────────────────────────────────
  correct() {
    tone(659.25, 0.1, "sine", 0.22); // E5
    tone(830.61, 0.14, "sine", 0.22, 0.06); // G#5
    tone(1046.5, 0.22, "sine", 0.24, 0.12); // C6
  },

  wrong() {
    tone(220, 0.14, "sawtooth", 0.18);
    tone(155, 0.2, "sawtooth", 0.16, 0.07);
  },

  timeout() {
    noise(0.18, 0.12);
    tone(280, 0.22, "triangle", 0.16, 0.04);
  },

  // ── Streak ───────────────────────────────────────────────
  streak(count: number) {
    const baseFreq = 580 + Math.min(count, 10) * 50;
    tone(baseFreq, 0.07, "sine", 0.18);
    tone(baseFreq * 1.25, 0.09, "sine", 0.18, 0.04);
    tone(baseFreq * 1.5, 0.14, "sine", 0.2, 0.08);
  },

  // ── Game Events ──────────────────────────────────────────
  roundComplete() {
    [523.25, 659.25, 783.99, 1046.5].forEach((n, i) =>
      tone(n, 0.18, "sine", 0.2, i * 0.08)
    );
  },

  win() {
    [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((n, i) =>
      tone(n, 0.24, "sine", 0.22, i * 0.09)
    );
  },

  lose() {
    [415.3, 370, 311.13, 261.63].forEach((n, i) =>
      tone(n, 0.22, "triangle", 0.18, i * 0.11)
    );
  },

  // ── Multiplayer ──────────────────────────────────────────
  buzzer() {
    tone(920, 0.09, "square", 0.24);
    tone(1380, 0.12, "square", 0.2, 0.04);
    noise(0.08, 0.1, 0.02);
  },

  opponentJoined() {
    tone(460, 0.08, "sine", 0.18);
    tone(690, 0.12, "sine", 0.16, 0.06);
  },

  // ── Challenge ────────────────────────────────────────────
  challengeCreated() {
    tone(523.25, 0.08, "sine", 0.2);
    tone(783.99, 0.1, "sine", 0.2, 0.06);
    tone(1046.5, 0.16, "sine", 0.22, 0.12);
  },
};

