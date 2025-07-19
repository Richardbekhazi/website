// ====================== game.js ======================
// Dino Runner with two enemy types.
// Controls:   ↑ / Space  Jump.   ↓  Duck.
// Folder layout:
//   Sprites/BG.png
//   Sprites/Dino/<State> (n).png      (run 1‑8, jump 1‑12, dead 1‑8)
//   Sprites/Lantern/<State> (n).png   (idle 1‑10, dead 1‑10)
//   Sprites/Plane/<State> (n).png     (fly 1‑2,  dead 1)
//------------------------------------------------------

/* ---------- Canvas ---------- */
const canvas = document.getElementById('game');
const ctx    = canvas.getContext('2d');
canvas.width  = Math.min(window.innerWidth - 20, 900);
canvas.height = 250;

const FLOOR_Y  = canvas.height - 8;  // ground line y
const SPRITE_H = 60;                 // draw height for everything

/* ---------- Background ---------- */
const bgImg = new Image();
bgImg.src   = 'Sprites/BG.png';
function drawBG() {
  if (!bgImg.complete) return;
  for (let x = 0; x < canvas.width; x += bgImg.width) {
    ctx.drawImage(bgImg, x, 0, bgImg.width, canvas.height);
  }
}

/* ---------- Dino ---------- */
const dino = {
  x: 50,
  y: 0,
  vy: 0,
  gravity: 0.6,
  jumpVel: -12,
  grounded: true,
  duck: false,
  width: 0,
  height: SPRITE_H
};
dino.y = FLOOR_Y - SPRITE_H;

/* ---------- Sprite metadata ---------- */
const DINO_STATES     = { run: 8, jump: 12, dead: 8 };
const LANTERN_STATES  = { idle: 10, dead: 10 };
const PLANE_STATES    = { fly: 2,  dead: 1 };

const dinoImgs    = {};
const lanternImgs = {};
const planeImgs   = {};
let   dinoIdx     = { run: 0, jump: 0, dead: 0 };

/* ---------- Pre‑load ---------- */
let loaded = 0;
const total =
  Object.values(DINO_STATES).reduce((a,b)=>a+b,0)+
  Object.values(LANTERN_STATES).reduce((a,b)=>a+b,0)+
  Object.values(PLANE_STATES).reduce((a,b)=>a+b,0);

function preload(store, folder, states) {
  for (const [state, count] of Object.entries(states)) {
    store[state] = [];
    const Cap = state[0].toUpperCase() + state.slice(1);
    for (let i = 1; i <= count; i++) {
      const img = new Image();
      img.src = `Sprites/${folder}/${Cap} (${i}).png`;
      img.onload = () => { if (++loaded === total) startGame(); };
      store[state].push(img);
    }
  }
}
preload(dinoImgs,    'Dino',    DINO_STATES);
preload(lanternImgs, 'Lantern', LANTERN_STATES);
preload(planeImgs,   'Plane',   PLANE_STATES);

/* ---------- Game parameters ---------- */
const BASE_SPEED     = 8;
const SPAWN_EVERY    = 100;  // frames
const PLANE_CHANCE   = 0.4;  // probability next enemy is plane
const FPS_DIV        = 5;    // ticks per animation frame
const DEATH_HOLD     = 60;   // extra frames after death
const HIT_FRAC       = 1.0;  // point‑based collision

let deathFrames;  // computed
let frame=0, score=0;
let gameOver=false, deathCounter=0;

let lanterns=[], planes=[];

/* ---------- Input ---------- */
window.addEventListener('keydown', e => {
  if (!gameOver && dino.grounded && (e.code === 'Space' || e.code === 'ArrowUp')) {
    dino.vy = dino.jumpVel;
    dino.grounded = false;
  }
  if (e.code === 'ArrowDown') dino.duck = true;
});
window.addEventListener('keyup', e => { if (e.code === 'ArrowDown') dino.duck = false; });

document.getElementById('playAgain').onclick = resetGame;

/* ---------- High scores ---------- */
function hs() { return JSON.parse(localStorage.getItem('highscores')||'[]'); }
function pushHS(s) { const a=hs(); a.push(s); a.sort((a,b)=>b-a); if(a.length>10)a.length=10; localStorage.setItem('highscores',JSON.stringify(a)); }
function showHS() { document.getElementById('scoreList').innerHTML = hs().map(n=>`<li>${n}</li>`).join(''); document.getElementById('highscores').style.display='block'; }

/* ---------- Spawning ---------- */
function spawnEnemy() { Math.random() < PLANE_CHANCE ? spawnPlane() : spawnLantern(); }
function spawnLantern() {
  lanterns.push({ x: canvas.width, y: FLOOR_Y - SPRITE_H, state:'idle', idx: Math.floor(Math.random()*LANTERN_STATES.idle), width:0, height:SPRITE_H });
}
function spawnPlane() {
  const offset = SPRITE_H/2 + Math.random()*SPRITE_H*0.5;
  planes.push({ x: canvas.width, y: FLOOR_Y - SPRITE_H - offset, state:'fly', idx:0, width:0, height:SPRITE_H });
}

/* ---------- Start ---------- */
function startGame() {
  if (startGame.started) return;
  startGame.started = true;
  deathFrames = Math.max(LANTERN_STATES.dead, PLANE_STATES.dead) * FPS_DIV + DEATH_HOLD;
  requestAnimationFrame(loop);
}

/* ---------- Main loop ---------- */
function loop() {
  frame++;
  drawBG();
  // ground line
  ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(0,FLOOR_Y); ctx.lineTo(canvas.width,FLOOR_Y); ctx.stroke();

  /* Physics */
  if (!gameOver) {
    dino.vy += dino.gravity;
    dino.y  += dino.vy;
    if (dino.y + SPRITE_H > FLOOR_Y) { dino.y = FLOOR_Y - SPRITE_H; dino.vy = 0; dino.grounded = true; }
    if (frame % SPAWN_EVERY === 0) spawnEnemy();
    planes.forEach(p => p.x -= BASE_SPEED);
    lanterns.forEach(l => l.x -= BASE_SPEED);
    score = Math.floor(frame / 10);
  }

  /* Dino animation */
  const dState = gameOver ? 'dead' : (dino.grounded ? 'run' : 'jump');
  if (frame % FPS_DIV === 0) dinoIdx[dState] = (dinoIdx[dState] + 1) % DINO_STATES[dState];
  drawEntity(dinoImgs[dState][dinoIdx[dState]], dino.x, dino.y, dino.width = SPRITE_H * (dinoImgs[dState][0].naturalWidth / dinoImgs[dState][0].naturalHeight));

  /* Lanterns */
  lanterns.forEach((l,i) => {
    if (frame % FPS_DIV === 0) l.idx = (l.idx + 1) % LANTERN_STATES[l.state];
    drawEntity(lanternImgs[l.state][l.idx], l.x, l.y, l.width = SPRITE_H * (lanternImgs[l.state][0].naturalWidth / lanternImgs[l.state][0].naturalHeight));
    if (!gameOver && hit(l)) triggerDeath();
    if (l.x + l.width < 0) lanterns.splice(i,1);
  });

  /* Planes */
  planes.forEach((p,i) => {
    if (frame % FPS_DIV === 0) p.idx = (p.idx + 1) % PLANE_STATES[p.state];
    drawPlane(p);
    if (!gameOver && hit(p)) triggerDeath();
    if (p.x + p.width < 0) planes.splice(i,1);
  });

  /* Score */
  ctx.fillStyle = '#fff'; ctx.font='16px sans-serif'; ctx.fillText(`Score: ${score}`, canvas.width - 100, 30);

  /* Flow */
  if (gameOver) {
    if (deathCounter++ >= deathFrames) { pushHS(score); showHS(); }
    else requestAnimationFrame(loop);
  } else requestAnimationFrame(loop);
}

/* ---------- drawing helpers ---------- */
function drawEntity(img,x,y,w) { ctx.drawImage(img, x, y, w, SPRITE_H); }
function drawPlane(p) {
  const img = planeImgs[p.state][p.idx];
  const r   = img.naturalWidth / img.naturalHeight;
  p.width   = SPRITE_H * r;
  ctx.save(); ctx.translate(p.x + p.width/2, p.y + SPRITE_H/2); ctx.scale(-1,1);
  ctx.drawImage(img, -p.width/2, -SPRITE_H/2, p.width, SPRITE_H); ctx.restore(); }

/* ---------- collision ---------- */
function hit(e) {
  const hh = dino.duck ? SPRITE_H/2 : SPRITE_H;
  const hy = dino.y + SPRITE_H - hh;
  const ix = e.width * HIT_FRAC; const iy = hh * HIT_FRAC;
  return dino.x < e.x + e.width - ix && dino.x + dino.width > e.x + ix && hy < e.y + SPRITE_H - iy && hy + hh > e.y + iy;
}

/* ---------- trigger death ---------- */
function triggerDeath() {
  gameOver = true; deathCounter = 1;
  planes.forEach(p=>{p.state='dead'; p.idx=0;});
  lanterns.forEach(l=>{l.state='dead'; l.idx=0;});
}

/* ---------- reset ---------- */
function resetGame() {
  planes.length = lanterns.length = 0;
  frame = score = 0; gameOver = false; deathCounter = 0;
  dino.y = FLOOR_Y - SPRITE_H; dino.vy = 0; dino.grounded = true; dino.duck = false;
  dinoIdx = { run:0, jump:0, dead:0 };
  document.getElementById('highscores').style.display='none';
  requestAnimationFrame(loop);
}
