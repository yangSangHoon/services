/**
 * Web Audio 로 합성한 모기 날갯소리. 음원 파일 없이
 * 살짝 어긋난 톱니파 두 개(맥놀이) + 느린 비브라토 + 로우패스.
 */
export class Buzz {
  readonly out: GainNode;
  private oscs: OscillatorNode[];
  private vib: OscillatorNode;
  private vibDepth: GainNode;
  private amp: GainNode;
  private pan: StereoPannerNode;
  private base = 560;

  constructor(private ctx: AudioContext) {
    this.out = ctx.createGain();
    this.out.gain.value = 0.55;
    this.pan = ctx.createStereoPanner();
    this.amp = ctx.createGain();
    this.amp.gain.value = 0;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 4200;
    lp.Q.value = 0.8;
    const mix = ctx.createGain();
    mix.gain.value = 0.5;

    this.vib = ctx.createOscillator();
    this.vib.frequency.value = 7;
    this.vibDepth = ctx.createGain();
    this.vibDepth.gain.value = this.base * 0.025;
    this.vib.connect(this.vibDepth);

    this.oscs = [1, 1.007].map((ratio, i) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = this.base * ratio;
      this.vibDepth.connect(o.frequency);
      const g = ctx.createGain();
      g.gain.value = i ? 0.6 : 1;
      o.connect(g).connect(mix);
      return o;
    });

    mix.connect(lp).connect(this.amp).connect(this.pan).connect(this.out);
    [...this.oscs, this.vib].forEach((o) => o.start());
  }

  /** 모기마다 날갯짓 높이가 조금씩 다르다 */
  setPitch(hz: number) {
    this.base = hz;
    this.vibDepth.gain.setTargetAtTime(hz * 0.025, this.ctx.currentTime, 0.05);
  }

  /** volume 0~1, pan -1~1, doppler 다가올 때 + */
  set(volume: number, pan: number, doppler: number) {
    const t = this.ctx.currentTime;
    this.amp.gain.setTargetAtTime(volume, t, 0.04);
    this.pan.pan.setTargetAtTime(pan, t, 0.05);
    this.oscs.forEach((o, i) => o.frequency.setTargetAtTime(this.base * (i ? 1.007 : 1) * (1 + doppler), t, 0.05));
  }

  /** 손바닥으로 탁! 소리가 끊기며 짧은 타격음 */
  splat() {
    const { ctx } = this;
    const t = ctx.currentTime;
    this.amp.gain.cancelScheduledValues(t);
    this.amp.gain.setValueAtTime(0, t);

    const len = Math.floor(ctx.sampleRate * 0.12);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1400;
    const g = ctx.createGain();
    g.gain.value = 1.4;
    noise.connect(lp).connect(g).connect(this.out);
    noise.start(t);

    const thump = ctx.createOscillator();
    thump.frequency.setValueAtTime(160, t);
    thump.frequency.exponentialRampToValueAtTime(60, t + 0.1);
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(1, t);
    tg.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    thump.connect(tg).connect(this.out);
    thump.start(t);
    thump.stop(t + 0.13);
  }

  dispose() {
    [...this.oscs, this.vib].forEach((o) => o.stop());
    this.out.disconnect();
  }
}
