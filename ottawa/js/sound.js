// Street Test - sound.js: car sounds made in the browser (R61 loop 2 round 4). No sound files: everything is
// synthesised with the Web Audio API (own work, so no licence questions for a sold game).
//  - engine: two detuned oscillators through a low-pass filter; the pitch follows the speed through 5 "gears"
//  - tires: filtered noise that squeals when braking hard or turning sharply at speed
//  - crash: a short low thud when the crash counter goes up
// Browsers only allow sound after a key press or click, so it starts on the first one. V turns sound on/off
// (remembered in this browser). Plain script, loaded after game.js; it only reads `state`, never changes the car.
'use strict';
(function () {
  let ctx = null, master, eng, eng2, engF, engG, tireG, tireF, last = { speed: 0, crashes: 0 }, on = true;
  try { on = localStorage.getItem('streetSound') !== 'off'; } catch (e) { }
  function start() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = on ? 0.5 : 0; master.connect(ctx.destination);
    // engine
    engF = ctx.createBiquadFilter(); engF.type = 'lowpass'; engF.frequency.value = 420; engF.Q.value = 2;
    engG = ctx.createGain(); engG.gain.value = 0; engF.connect(engG); engG.connect(master);
    eng = ctx.createOscillator(); eng.type = 'sawtooth'; eng.frequency.value = 38; eng.connect(engF); eng.start();
    eng2 = ctx.createOscillator(); eng2.type = 'square'; eng2.frequency.value = 19; eng2.detune.value = 9;
    const g2 = ctx.createGain(); g2.gain.value = 0.5; eng2.connect(g2); g2.connect(engF); eng2.start();
    // tires: looped white noise, band-passed high
    const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource(); noise.buffer = buf; noise.loop = true;
    tireF = ctx.createBiquadFilter(); tireF.type = 'bandpass'; tireF.frequency.value = 1900; tireF.Q.value = 6;
    tireG = ctx.createGain(); tireG.gain.value = 0;
    noise.connect(tireF); tireF.connect(tireG); tireG.connect(master); noise.start();
    requestAnimationFrame(tick);
  }
  function thud(strength) {
    const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
    o.type = 'sine'; o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(35, t + 0.35);
    g.gain.setValueAtTime(Math.min(1, 0.3 + strength), t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.5);
  }
  let lastT = performance.now();
  function tick(now) {
    requestAnimationFrame(tick);
    const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now; if (!dt) return;
    const t = ctx.currentTime, inCar = state.mode === 'car' && !(window.Interior && Interior.active);
    const v = Math.abs(state.speed);
    // engine: 5 gears up to ~100 km/h; rpm climbs within a gear and drops at each shift
    const top = 27, gears = 5, gv = Math.min(0.999, v / top) * gears, gear = Math.floor(gv), within = gv - gear;
    const rpm = v < 0.3 ? 0 : 0.25 + within * 0.75 - gear * 0.04;   // 0 = idle, 1 = redline
    const throttle = (keys.KeyW || keys.ArrowUp) ? 1 : 0;
    eng.frequency.setTargetAtTime(38 + rpm * 90, t, 0.08); eng2.frequency.setTargetAtTime((38 + rpm * 90) / 2, t, 0.08);
    engF.frequency.setTargetAtTime(380 + rpm * 900 + throttle * 300, t, 0.1);
    engG.gain.setTargetAtTime(inCar ? 0.18 + rpm * 0.12 + throttle * 0.08 : 0.04, t, 0.15);
    // tires: hard braking (speed falling fast) or a sharp turn at speed
    const decel = (last.speed - v) / dt, turn = Math.abs(state.steer || 0) * v;
    const squeal = inCar ? Math.max(0, Math.min(1, (decel - 9) / 10)) + Math.max(0, Math.min(1, (turn - 9) / 8)) : 0;
    tireG.gain.setTargetAtTime(Math.min(0.35, squeal * 0.3), t, 0.06);
    tireF.frequency.setTargetAtTime(1700 + Math.min(600, v * 20), t, 0.1);
    if (state.crashes > last.crashes) thud(Math.min(0.7, v / 20));
    last.speed = v; last.crashes = state.crashes;
  }
  addEventListener('keydown', e => {
    start();
    if (e.code === 'KeyV' && !e.repeat) {
      on = !on; try { localStorage.setItem('streetSound', on ? 'on' : 'off'); } catch (err) { }
      if (master) master.gain.setTargetAtTime(on ? 0.5 : 0, ctx.currentTime, 0.05);
    }
  });
  addEventListener('pointerdown', start);
  window.__sound = () => ({ started: !!ctx, on, state: ctx && ctx.state });   // for testing
})();

(window.__loadT = window.__loadT || []).push(['sound', Math.round(performance.now())]);   // load timing (see ?debug)
