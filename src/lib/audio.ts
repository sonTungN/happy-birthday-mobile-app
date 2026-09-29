import { content } from "../content";
import { audioUrl } from "./assets";
import { storage } from "./storage";

// The Audio Session API only ships in Safari, so TypeScript doesn't know about it yet.
type AudioSessionType =
  | "auto"
  | "playback"
  | "transient"
  | "transient-solo"
  | "ambient"
  | "play-and-record";

declare global {
  interface Navigator {
    audioSession?: { type: AudioSessionType };
  }
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

export type Sfx =
  | "tap"
  | "error"
  | "unlock"
  | "shutter"
  | "motor"
  | "sparkle"
  | "pop"
  | "strike"
  | "fizzle"
  | "ignite"
  | "puff"
  | "slice"
  | "paper"
  | "unfold"
  | "ding"
  | "whoosh"
  | "wind"
  | "stamp"
  | "tick"
  | "ratchet"
  | "beep"
  | "marker"
  | "pen"
  | "rub";

interface ToneOpts {
  at?: number;
  dur?: number;
  type?: OscillatorType;
  gain?: number;
  attack?: number;
  to?: number;
  dest?: AudioNode;
}

interface NoiseOpts {
  at?: number;
  dur?: number;
  gain?: number;
  attack?: number;
  filter?: BiquadFilterType;
  freq?: number;
  to?: number;
  q?: number;
}

// Recorded effects (CC0, by Kenney.nl) for the sounds synthesis can't fake well: paper and a knife.
const SAMPLE_URLS = import.meta.glob<string>("../assets/sfx/*.wav", {
  eager: true,
  import: "default",
  query: "?url",
});
type Sample = "paper-flip" | "paper-unfold" | "knife";

function setSessionType(type: AudioSessionType): void {
  try {
    if (navigator.audioSession) navigator.audioSession.type = type;
  } catch {
    /* not supported by this browser */
  }
}

/**
 * Every sound on the site:
 * - Background music plays through an <audio> element, which still plays when the iPhone's silent switch is on.
 * - Sound effects are synthesized with Web Audio, except paper and knife sounds (small recordings in src/assets/sfx).
 *   `audioSession.type = 'playback'` keeps them audible with the silent switch on (Safari 16.4+).
 * - "holds" are reasons to pause the music (mic is open, a voice note is playing, the tab is hidden…).
 */
class AudioEngine {
  muted = storage.get("muted") === "1";
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private readonly samples = new Map<Sample, AudioBuffer>();
  private music: HTMLAudioElement | null = null;
  private musicWanted = false;
  private unlocked = false;
  private suppressed = false;
  private readonly holds = new Set<string>();
  private readonly listeners = new Set<() => void>();

  constructor() {
    if (typeof window === "undefined") return;
    // iOS only allows sound after a real tap (pointerup / touchend / click). pointerdown doesn't count.
    const unlock = () => this.unlock();
    for (const type of ["pointerup", "touchend", "click", "keydown"] as const) {
      window.addEventListener(type, unlock, { capture: true, passive: true });
    }
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.hold("hidden");
      } else {
        this.release("hidden");
        this.resumeContext();
      }
    });
  }

  /** Call from inside a tap. Safe to call many times. */
  unlock(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? window.webkitAudioContext;
      if (!Ctor) return;
      setSessionType("playback");
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      this.master.connect(this.ctx.destination);
      // Play one silent buffer so iOS fully unlocks Web Audio.
      const silent = this.ctx.createBufferSource();
      silent.buffer = this.ctx.createBuffer(1, 1, 22_050);
      silent.connect(this.ctx.destination);
      silent.start(0);
      this.loadSamples(this.ctx);
    }
    this.resumeContext();
    this.unlocked = true;
    this.ensureMusic(true);
    this.update();
  }

  playMusic(): void {
    this.musicWanted = true;
    this.ensureMusic(false);
    this.update();
  }

  hasMusic(): boolean {
    return Boolean(content.music);
  }

  hold(reason: string): void {
    this.holds.add(reason);
    this.update();
  }

  release(reason: string): void {
    this.holds.delete(reason);
    this.update();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    storage.set("muted", muted ? "1" : "0");
    if (this.ctx && this.master)
      this.master.gain.setTargetAtTime(
        muted ? 0 : 1,
        this.ctx.currentTime,
        0.02,
      );
    this.update();
    this.listeners.forEach((fn) => fn());
  }

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getMuted = (): boolean => this.muted;

  /** Before opening the mic: pause the music, silence effects (so the mic can't hear the speaker) and let Safari pick the audio session. */
  beginMic(): void {
    this.hold("mic");
    this.suppressed = true;
    setSessionType("auto");
  }

  /** After closing the mic: route sound back to the loudspeaker and bring the music back a beat later. */
  endMic(): void {
    setSessionType("playback");
    this.suppressed = false;
    this.resumeContext();
    window.setTimeout(() => this.release("mic"), 350);
  }

  sfx(name: Sfx): void {
    const out = this.output();
    if (!out) return;
    switch (name) {
      case "tap":
        this.tone(out, 1150, { dur: 0.05, gain: 0.12 });
        break;
      case "error":
        this.tone(out, 230, { dur: 0.09, type: "square", gain: 0.05 });
        this.tone(out, 180, {
          at: 0.11,
          dur: 0.12,
          type: "square",
          gain: 0.05,
        });
        break;
      case "unlock":
        this.tone(out, 660, { dur: 0.14, gain: 0.14 });
        this.tone(out, 990, { at: 0.09, dur: 0.24, gain: 0.14 });
        break;
      case "shutter":
        this.burst(out, {
          dur: 0.035,
          gain: 0.5,
          filter: "highpass",
          freq: 1800,
        });
        this.burst(out, { at: 0.07, dur: 0.05, gain: 0.35, freq: 900, q: 0.8 });
        this.tone(out, 110, { at: 0.07, dur: 0.07, gain: 0.2, to: 60 });
        break;
      case "motor":
        this.tone(out, 92, {
          dur: 0.8,
          type: "sawtooth",
          gain: 0.035,
          attack: 0.05,
        });
        this.burst(out, {
          dur: 0.8,
          gain: 0.04,
          freq: 2400,
          q: 1.5,
          attack: 0.05,
        });
        break;
      case "sparkle":
        [1318.5, 1568, 1760, 2093].forEach((f, i) =>
          this.tone(out, f, { at: i * 0.07, dur: 0.5, gain: 0.05 }),
        );
        break;
      case "pop":
        this.tone(out, 540, { dur: 0.1, gain: 0.18, to: 170 });
        break;
      case "strike":
        this.burst(out, {
          dur: 0.22,
          gain: 0.35,
          filter: "highpass",
          freq: 2600,
        });
        this.burst(out, { at: 0.05, dur: 0.12, gain: 0.2, freq: 4200, q: 3 });
        break;
      case "fizzle":
        this.burst(out, {
          dur: 0.07,
          gain: 0.12,
          filter: "highpass",
          freq: 3200,
        });
        break;
      case "ignite":
        this.burst(out, {
          dur: 0.4,
          gain: 0.22,
          filter: "lowpass",
          freq: 250,
          to: 2200,
          attack: 0.03,
        });
        this.tone(out, 130, { dur: 0.3, gain: 0.08, to: 70 });
        break;
      case "puff":
        this.burst(out, {
          dur: 0.28,
          gain: 0.18,
          filter: "lowpass",
          freq: 1100,
          to: 300,
          attack: 0.02,
        });
        break;
      case "slice":
        if (!this.sample(out, "knife", { gain: 0.9 }))
          this.burst(out, {
            dur: 0.3,
            gain: 0.28,
            freq: 5200,
            to: 1100,
            q: 2.2,
            attack: 0.02,
          });
        break;
      case "paper":
        if (
          !this.sample(out, "paper-flip", {
            gain: 1.4,
            rate: 0.94 + Math.random() * 0.12,
          })
        )
          this.softPaper(out, 0.35);
        break;
      case "unfold":
        if (!this.sample(out, "paper-unfold", { gain: 0.8 }))
          this.softPaper(out, 0.7);
        break;
      case "ding":
        this.tone(out, 1760, { dur: 1.1, gain: 0.08 });
        this.tone(out, 2637, { dur: 0.8, gain: 0.04 });
        break;
      case "whoosh":
        this.burst(out, {
          dur: 0.45,
          gain: 0.08,
          freq: 400,
          to: 2600,
          q: 0.9,
          attack: 0.18,
        });
        break;
      case "wind":
        for (let i = 0; i < 6; i++)
          this.burst(out, {
            at: i * 0.045,
            dur: 0.018,
            gain: 0.16,
            filter: "highpass",
            freq: 3000,
          });
        break;
      case "stamp":
        this.tone(out, 120, { dur: 0.12, gain: 0.3, to: 60 });
        this.burst(out, {
          dur: 0.05,
          gain: 0.25,
          filter: "lowpass",
          freq: 900,
        });
        break;
      case "tick":
        // A projector's clack
        this.burst(out, {
          dur: 0.025,
          gain: 0.3,
          filter: "highpass",
          freq: 2500,
        });
        this.tone(out, 85, { dur: 0.05, gain: 0.14, to: 50 });
        break;
      case "ratchet":
        // Winding the film on: the thumbwheel's ratchet, click by click
        for (let i = 0; i < 6; i++) {
          this.burst(out, {
            at: i * 0.07,
            dur: 0.018,
            gain: 0.32,
            filter: "highpass",
            freq: 3400,
          });
          this.tone(out, 150, { at: i * 0.07, dur: 0.035, gain: 0.1, to: 80 });
        }
        break;
      case "beep":
        // The "2-pop" at the end of a film leader
        this.tone(out, 1000, { dur: 0.17, gain: 0.12, attack: 0.003 });
        break;
      case "marker":
        // A felt-tip highlighter dragged across newsprint
        this.burst(out, {
          dur: 0.32,
          gain: 0.05,
          freq: 1500,
          to: 2300,
          q: 0.6,
          attack: 0.06,
        });
        this.burst(out, {
          dur: 0.28,
          gain: 0.022,
          filter: "highpass",
          freq: 5200,
          attack: 0.05,
        });
        break;
      case "pen":
        // A pen nib going round a phrase
        this.burst(out, {
          dur: 0.55,
          gain: 0.03,
          freq: 3400,
          to: 2600,
          q: 1.4,
          attack: 0.08,
        });
        break;
      case "rub":
        // A thumb rubbing a print: one short swish of skin on glossy paper
        this.burst(out, {
          dur: 0.13,
          gain: 0.05,
          freq: 1300,
          to: 900,
          q: 0.7,
          attack: 0.03,
        });
        this.burst(out, {
          dur: 0.1,
          gain: 0.02,
          filter: "highpass",
          freq: 4500,
          attack: 0.02,
        });
        break;
    }
  }

  /** "Happy Birthday" on a music box. Returns its length in ms, or 0 when muted. */
  musicBox(): number {
    const out = this.output();
    if (!out) return 0;
    const { ctx } = out;
    // [MIDI note, beats]
    const notes: [number, number][] = [
      [67, 0.75],
      [67, 0.25],
      [69, 1],
      [67, 1],
      [72, 1],
      [71, 2],
      [67, 0.75],
      [67, 0.25],
      [69, 1],
      [67, 1],
      [74, 1],
      [72, 2],
      [67, 0.75],
      [67, 0.25],
      [79, 1],
      [76, 1],
      [72, 1],
      [71, 1],
      [69, 2],
      [77, 0.75],
      [77, 0.25],
      [76, 1],
      [72, 1],
      [74, 1],
      [72, 3],
    ];
    const beat = 0.48;
    // A little echo so it sounds like a music box in a room
    const bus = ctx.createGain();
    const delay = ctx.createDelay(1);
    const feedback = ctx.createGain();
    const damp = ctx.createBiquadFilter();
    const wet = ctx.createGain();
    delay.delayTime.value = 0.21;
    feedback.gain.value = 0.28;
    damp.type = "lowpass";
    damp.frequency.value = 2400;
    wet.gain.value = 0.35;
    bus.connect(out.dest);
    bus.connect(delay);
    delay.connect(damp);
    damp.connect(feedback);
    feedback.connect(delay);
    damp.connect(wet);
    wet.connect(out.dest);

    let t = 0.05;
    for (const [midi, beats] of notes) {
      const f = 440 * 2 ** ((midi - 69) / 12);
      this.tone(out, f, {
        at: t,
        dur: 1.4,
        gain: 0.16,
        attack: 0.004,
        dest: bus,
      });
      this.tone(out, f * 2, {
        at: t,
        dur: 0.5,
        gain: 0.05,
        attack: 0.002,
        dest: bus,
      });
      this.tone(out, f * 3.01, {
        at: t,
        dur: 0.25,
        gain: 0.02,
        attack: 0.002,
        dest: bus,
      });
      t += beats * beat;
    }
    const total = t + 1.5;
    window.setTimeout(
      () => {
        for (const node of [bus, delay, feedback, damp, wet]) node.disconnect();
      },
      total * 1000 + 800,
    );
    return Math.round(total * 1000);
  }

  private resumeContext(): void {
    if (this.ctx && this.ctx.state !== "running")
      void this.ctx.resume().catch(() => {});
  }

  private shouldPlay(): boolean {
    return (
      this.unlocked && this.musicWanted && !this.muted && this.holds.size === 0
    );
  }

  private ensureMusic(prime: boolean): void {
    if (this.music || !content.music) return;
    const url = audioUrl(content.music);
    if (!url) return;
    const el = new Audio(url);
    el.loop = true;
    el.preload = "auto";
    el.setAttribute("playsinline", "");
    this.music = el;
    // Play it silently once inside the tap, so iOS lets us start it later without another tap.
    if (prime && !this.shouldPlay()) {
      el.muted = true;
      el.play()
        .then(() => {
          if (!this.shouldPlay()) el.pause();
        })
        .catch(() => {})
        .finally(() => {
          el.muted = false;
        });
    }
  }

  private update(): void {
    const el = this.music;
    if (!el) return;
    if (this.shouldPlay()) {
      if (el.paused) void el.play().catch(() => {});
    } else if (!el.paused && !el.muted) {
      el.pause();
    }
  }

  private output(): { ctx: AudioContext; dest: AudioNode } | null {
    if (!this.ctx || !this.master || this.muted || this.suppressed) return null;
    this.resumeContext();
    return { ctx: this.ctx, dest: this.master };
  }

  private noiseBuffer(ctx: AudioContext): AudioBuffer {
    if (!this.noise) {
      const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this.noise = buffer;
    }
    return this.noise;
  }

  private tone(
    out: { ctx: AudioContext; dest: AudioNode },
    freq: number,
    opts: ToneOpts,
  ): void {
    const {
      at = 0,
      dur = 0.15,
      type = "sine",
      gain = 0.2,
      attack = 0.005,
      to,
      dest,
    } = opts;
    const { ctx } = out;
    const t = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(dest ?? out.dest);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  private loadSamples(ctx: AudioContext): void {
    for (const [path, url] of Object.entries(SAMPLE_URLS)) {
      const name = path
        .split("/")
        .pop()
        ?.replace(/\.wav$/, "") as Sample;
      fetch(url)
        .then((res) => res.arrayBuffer())
        .then((data) => ctx.decodeAudioData(data))
        .then((buffer) => this.samples.set(name, buffer))
        .catch(() => {
          /* the synthesized fallback plays instead */
        });
    }
  }

  /** Plays a recorded effect. false = not loaded (yet), so the caller can synthesize something instead. */
  private sample(
    out: { ctx: AudioContext; dest: AudioNode },
    name: Sample,
    { gain = 1, rate = 1, at = 0 } = {},
  ): boolean {
    const buffer = this.samples.get(name);
    if (!buffer) return false;
    const { ctx } = out;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = rate;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(g);
    g.connect(out.dest);
    src.start(ctx.currentTime + at);
    return true;
  }

  /** Fallback paper: a soft, low rustle (no sharp crackle) */
  private softPaper(
    out: { ctx: AudioContext; dest: AudioNode },
    dur: number,
  ): void {
    this.burst(out, {
      dur,
      gain: 0.06,
      filter: "lowpass",
      freq: 2400,
      to: 900,
      attack: dur * 0.3,
    });
    this.burst(out, {
      at: dur * 0.2,
      dur: dur * 0.6,
      gain: 0.03,
      freq: 3200,
      q: 0.5,
      attack: dur * 0.2,
    });
  }

  private burst(
    out: { ctx: AudioContext; dest: AudioNode },
    opts: NoiseOpts,
  ): void {
    const {
      at = 0,
      dur = 0.2,
      gain = 0.2,
      attack = 0.005,
      filter = "bandpass",
      freq = 1000,
      to,
      q = 1,
    } = opts;
    const { ctx } = out;
    const t = ctx.currentTime + at;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(ctx);
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = filter;
    f.frequency.setValueAtTime(freq, t);
    if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(out.dest);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }
}

export const audio = new AudioEngine();
