let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function ensureAudio() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.09;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return { ctx, master: master! };
}

function tone(freq: number, duration: number, type: OscillatorType = "sine", volume = 0.05, delay = 0) {
  const audio = ensureAudio();
  if (!audio) return;
  const { ctx, master } = audio;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, ctx.currentTime + delay);
  g.gain.linearRampToValueAtTime(volume, ctx.currentTime + delay + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + duration);
  o.connect(g).connect(master);
  o.start(ctx.currentTime + delay);
  o.stop(ctx.currentTime + delay + duration + 0.02);
}

export const audio = {
  unlock: ensureAudio,
  click() { tone(620, 0.045, "sine", 0.022); },
  hover() { tone(420, 0.025, "sine", 0.012); },
  tick() { tone(760, 0.045, "square", 0.014); },
  urgentTick() { tone(980, 0.05, "square", 0.022); },
  correct() { tone(740, 0.09, "sine", 0.035); tone(1040, 0.15, "sine", 0.028, 0.055); },
  wrong() { tone(210, 0.13, "sawtooth", 0.025); tone(145, 0.18, "sawtooth", 0.02, 0.07); },
  win() { [523, 659, 784, 1046].forEach((n, i) => tone(n, 0.22, "sine", 0.028, i * 0.08)); },
  lose() { [392, 330, 262].forEach((n, i) => tone(n, 0.23, "triangle", 0.026, i * 0.12)); },
};
