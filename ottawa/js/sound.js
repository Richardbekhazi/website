// Street Test - sound.js: car sounds made in the browser. No sound files: everything is synthesised with the Web
// Audio API (own work, so no licence questions for a sold game).
// R63 rewrite: the first version (two buzzy sawtooth/square oscillators) sounded harsh, so the owner asked for a
// better sound that starts MUTED. Now:
//  - engine: a 4-cylinder model. The engine "fires" twice per turn, so the main pitch is rpm / 30 (850 rpm idle =
//    28 Hz, 6,000 rpm = 200 Hz). One soft custom wave plays the firing note and its overtones, plus quieter
//    half-step notes that give the uneven "rumble" of a real engine. A low-pass filter opens with rpm and
//    throttle; a little filtered noise adds intake air when you press the gas. Automatic gearbox: 5 gears.
//  - tires: a quiet tonal squeal (a wobbling tone plus a little hiss) only when braking hard or turning sharply fast
//  - crash: a short low thud when the crash counter goes up
// Sound is OFF at the start of every visit; the player turns it on with V or the speaker button (bottom right).
// Plain script, loaded after game.js; it only reads `state`, never changes the car.
'use strict';
(function () {
  let ctx = null, master, eng, engF, engG, air, airF, airG, sq, sqG, hissG, hissF, on = false;
  const last = { speed: 0, crashes: 0, rpm: 850 };

  // ---- speaker button (bottom right, above the credits)
  const btn = document.createElement('button');
  btn.id = 'soundBtn';
  btn.style.cssText = 'position:fixed;right:16px;bottom:40px;font:600 12px system-ui,"Segoe UI",sans-serif;color:var(--hud-fg);' +
    'background:var(--hud-bg);border:1px solid rgba(255,255,255,0.25);border-radius:8px;padding:6px 10px;cursor:pointer;z-index:5';
  const paint = () => { btn.textContent = on ? '🔊 Sound on (V)' : '🔇 Sound off (V)'; btn.title = on ? 'Turn sound off (V)' : 'Turn sound on (V)'; };
  paint();
  btn.addEventListener('click', e => { e.stopPropagation(); toggle(); btn.blur(); });
  (document.body ? Promise.resolve() : new Promise(r => addEventListener('DOMContentLoaded', r))).then(() => document.body.appendChild(btn));

  function noiseBuffer(brown) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = buf.getChannelData(0);
    let b = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      if (brown) { b = (b + 0.02 * w) / 1.02; d[i] = b * 3.5; } else d[i] = w;
    }
    return buf;
  }
  function loop(buf) { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.start(); return s; }

  function build() {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0;
    // gentle compressor so nothing ever clips or jumps out
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4;
    master.connect(comp); comp.connect(ctx.destination);

    // engine: one oscillator at HALF the firing note. Even overtones (= the firing note and its multiples) are
    // strong, odd ones (the half-steps) are quiet: that unevenness is what makes it sound like an engine.
    const N = 24, re = new Float32Array(N + 1), im = new Float32Array(N + 1);
    for (let n = 1; n <= N; n++) im[n] = (n % 2 === 0 ? 1 : 0.28) / Math.pow(n, 1.15);
    eng = ctx.createOscillator(); eng.setPeriodicWave(ctx.createPeriodicWave(re, im)); eng.frequency.value = 14;
    engF = ctx.createBiquadFilter(); engF.type = 'lowpass'; engF.frequency.value = 300; engF.Q.value = 0.7;
    engG = ctx.createGain(); engG.gain.value = 0;
    eng.connect(engF); engF.connect(engG); engG.connect(master); eng.start();

    // intake air: brown noise, low-passed, louder with throttle and rpm
    air = loop(noiseBuffer(true));
    airF = ctx.createBiquadFilter(); airF.type = 'lowpass'; airF.frequency.value = 400;
    airG = ctx.createGain(); airG.gain.value = 0;
    air.connect(airF); airF.connect(airG); airG.connect(master);

    // tire squeal: a wobbling tone (rubber chirp) plus a little band-passed hiss
    sq = ctx.createOscillator(); sq.type = 'triangle'; sq.frequency.value = 820;
    const wob = ctx.createOscillator(), wobG = ctx.createGain(); wob.frequency.value = 7; wobG.gain.value = 35;
    wob.connect(wobG); wobG.connect(sq.frequency); wob.start();
    sqG = ctx.createGain(); sqG.gain.value = 0; sq.connect(sqG); sqG.connect(master); sq.start();
    const hiss = loop(noiseBuffer(false));
    hissF = ctx.createBiquadFilter(); hissF.type = 'bandpass'; hissF.frequency.value = 1500; hissF.Q.value = 2;
    hissG = ctx.createGain(); hissG.gain.value = 0; hiss.connect(hissF); hissF.connect(hissG); hissG.connect(master);

    requestAnimationFrame(tick);
    return true;
  }

  // only builds the sound when it is on (browsers allow sound only after a key press or click)
  function wake() {
    if (!on) return;
    if (!ctx && !build()) return;
    if (ctx.state === 'suspended') ctx.resume();
    master.gain.setTargetAtTime(0.55, ctx.currentTime, 0.08);
  }
  function toggle() {
    on = !on; paint();
    if (on) wake(); else if (ctx) master.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
  }

  function thud(strength) {
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = 'sine'; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.3);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25 + strength * 0.5, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    f.type = 'lowpass'; f.frequency.value = 500;
    o.connect(f); f.connect(g); g.connect(master); o.start(t); o.stop(t + 0.45);
  }

  // automatic gearbox: top speed of each gear in m/s (about 25, 45, 65, 85, 110 km/h)
  const GEAR_TOP = [7, 12.5, 18, 23.5, 30.5];
  function rpmFor(v) {
    if (v < 0.3) return 850;
    let g = 0; while (g < GEAR_TOP.length - 1 && v > GEAR_TOP[g]) g++;
    const lo = g ? GEAR_TOP[g - 1] : 0, frac = Math.min(1, (v - lo) / (GEAR_TOP[g] - lo));
    const from = g ? 2300 : 900;                    // after each up-shift the revs drop back to ~2,300
    return from + frac * (5600 - from);
  }

  let lastT = performance.now();
  function tick(now) {
    requestAnimationFrame(tick);
    const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
    if (!dt || !on) return;
    const t = ctx.currentTime, inCar = state.mode === 'car' && !(window.Interior && Interior.active);
    const v = Math.abs(state.speed), throttle = (keys.KeyW || keys.ArrowUp || keys.KeyS || keys.ArrowDown) ? 1 : 0;
    // revs: from the gearbox, a little higher under throttle (load), smoothed so shifts glide instead of jumping
    const target = inCar ? rpmFor(v) + throttle * 250 : 850;
    last.rpm += (target - last.rpm) * Math.min(1, dt * 6);
    const r = last.rpm, x = (r - 850) / (6000 - 850);   // 0 at idle, 1 at redline
    const fire = r / 30;                               // 4 cylinders: 2 firings per turn
    eng.frequency.setTargetAtTime(fire / 2, t, 0.03);
    engF.frequency.setTargetAtTime(fire * (3 + throttle * 3) + 150, t, 0.08);
    // quieter when you are on foot (the parked car idles in the background)
    const near = inCar ? 1 : 0.25;
    engG.gain.setTargetAtTime(near * (0.22 + x * 0.18 + throttle * 0.1), t, 0.1);
    airF.frequency.setTargetAtTime(300 + x * 900, t, 0.1);
    airG.gain.setTargetAtTime(inCar ? 0.03 + throttle * (0.05 + x * 0.08) : 0, t, 0.12);
    // tires: hard braking (speed dropping fast) or a sharp turn at speed
    const decel = (last.speed - v) / dt, turn = Math.abs(state.steer || 0) * v;
    const squeal = inCar && v > 4 ? Math.min(1, Math.max(0, (decel - 9) / 10) + Math.max(0, (turn - 10) / 8)) : 0;
    sqG.gain.setTargetAtTime(squeal * 0.05, t, 0.05);
    hissG.gain.setTargetAtTime(squeal * 0.07, t, 0.05);
    sq.frequency.setTargetAtTime(760 + Math.min(200, v * 6), t, 0.1);
    if (state.crashes > last.crashes) thud(Math.min(0.7, v / 20));
    last.speed = v; last.crashes = state.crashes;
  }

  addEventListener('keydown', e => {
    if (e.code === 'KeyV' && !e.repeat) toggle(); else wake();
  });
  addEventListener('pointerdown', wake);
  window.__sound = () => ({ started: !!ctx, on, state: ctx && ctx.state, rpm: Math.round(last.rpm) });   // for testing
})();

(window.__loadT = window.__loadT || []).push(['sound', Math.round(performance.now())]);   // load timing (see ?debug)
