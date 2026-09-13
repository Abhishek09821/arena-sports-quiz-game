/* ═══════════════════════════════════════════════════════════════
   ARENA — Audio Engine
   Centralized Web Audio API manager with volume controls
   and browser autoplay restriction handling.
   ═══════════════════════════════════════════════════════════════ */

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let sfxEnabled = true;
let sfxVolume = 0.12;

function ensureAudio(): { ctx: AudioContext; master: GainNode } | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    ctx = new AudioContext();
    masterGain = ctx.createGain();
    masterGain.gain.value = sfxVolume;
    masterGain.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return { ctx, master: masterGain! };
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType = "sine",
  volume = 0.05,
  delay = 0
) {
  if (!sfxEnabled) return;
  const a = ensureAudio();
  if (!a) return;
  const { ctx, master } = a;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, ctx.currentTime + delay);
  g.gain.linearRampToValueAtTime(volume, ctx.currentTime + delay + 0.008);
  g.gain.exponentialRampToValueAtTime(
    0.0001,
    ctx.currentTime + delay + duration
  );
  o.connect(g).connect(master);
  o.start(ctx.currentTime + delay);
  o.stop(ctx.currentTime + delay + duration + 0.02);
}

function noise(duration: number, volume = 0.02, delay = 0) {
  if (!sfxEnabled) return;
  const a = ensureAudio();
  if (!a) return;
  const { ctx, master } = a;
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.5;
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, ctx.currentTime + delay);
  g.gain.linearRampToValueAtTime(volume, ctx.currentTime + delay + 0.005);
  g.gain.exponentialRampToValueAtTime(
    0.0001,
    ctx.currentTime + delay + duration
  );
  src.connect(g).connect(master);
  src.start(ctx.currentTime + delay);
  src.stop(ctx.currentTime + delay + duration + 0.02);
}

export const audio = {
  /** Unlock audio context after first user interaction */
  unlock: ensureAudio,

  /** Get/set SFX enabled */
  get sfxEnabled() { return sfxEnabled; },
  set sfxEnabled(v: boolean) { sfxEnabled = v; },

  /** Get/set SFX volume (0-1) */
  get volume() { return sfxVolume; },
  set volume(v: number) {
    sfxVolume = Math.max(0, Math.min(1, v));
    if (masterGain) masterGain.gain.value = sfxVolume;
  },

  // ── UI Sounds ────────────────────────────────────────────
  click() {
    tone(620, 0.04, "sine", 0.02);
  },

  hover() {
    tone(420, 0.02, "sine", 0.008);
  },

  select() {
    tone(520, 0.05, "sine", 0.025);
    tone(680, 0.04, "sine", 0.018, 0.03);
  },

  // ── Timer Sounds ─────────────────────────────────────────
  tick() {
    tone(760, 0.035, "square", 0.01);
  },

  urgentTick() {
    tone(980, 0.04, "square", 0.018);
  },

  // ── Answer Feedback ──────────────────────────────────────
  correct() {
    tone(740, 0.09, "sine", 0.03);
    tone(1040, 0.14, "sine", 0.025, 0.05);
  },

  wrong() {
    tone(210, 0.12, "sawtooth", 0.02);
    tone(145, 0.16, "sawtooth", 0.015, 0.06);
  },

  timeout() {
    noise(0.15, 0.015);
    tone(300, 0.2, "triangle", 0.015, 0.05);
  },

  // ── Streak ───────────────────────────────────────────────
  streak(count: number) {
    const baseFreq = 600 + count * 40;
    tone(baseFreq, 0.06, "sine", 0.02);
    tone(baseFreq * 1.25, 0.08, "sine", 0.018, 0.04);
    tone(baseFreq * 1.5, 0.1, "sine", 0.015, 0.08);
  },

  // ── Game Events ──────────────────────────────────────────
  roundComplete() {
    [523, 659, 784].forEach((n, i) =>
      tone(n, 0.18, "sine", 0.022, i * 0.07)
    );
  },

  win() {
    [523, 659, 784, 1046].forEach((n, i) =>
      tone(n, 0.22, "sine", 0.025, i * 0.08)
    );
  },

  lose() {
    [392, 330, 262].forEach((n, i) =>
      tone(n, 0.2, "triangle", 0.02, i * 0.1)
    );
  },

  // ── Multiplayer ──────────────────────────────────────────
  buzzer() {
    tone(880, 0.08, "square", 0.03);
    tone(1320, 0.1, "square", 0.025, 0.04);
    noise(0.08, 0.01, 0.02);
  },

  opponentJoined() {
    tone(440, 0.08, "sine", 0.02);
    tone(660, 0.1, "sine", 0.018, 0.06);
  },

  // ── Challenge ────────────────────────────────────────────
  challengeCreated() {
    tone(520, 0.06, "sine", 0.02);
    tone(780, 0.08, "sine", 0.018, 0.05);
    tone(1040, 0.1, "sine", 0.015, 0.1);
  },

  // ── Navigation ───────────────────────────────────────────
  navigate() {
    tone(480, 0.03, "sine", 0.012);
  },
};
