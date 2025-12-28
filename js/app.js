const $ = (sel) => document.querySelector(sel);

const el = {
  id: $("#pk-id"),
  name: $("#pk-name"),
  sprite: $("#pk-sprite"),
  types: $("#pk-types"),
  abil: $("#pk-abil"),
  ht: $("#pk-ht"),
  wt: $("#pk-wt"),

  genus: $("#pk-genus"),
  habitat: $("#pk-habitat"),
  catchRate: $("#pk-catch"),
  happy: $("#pk-happy"),

  viewInfo: $("#view-info"),
  viewStats: $("#view-stats"),
  radar: $("#radar"),

  ledReady: $("#led-ready"),
  ledLoad: $("#led-load"),
  ledErr: $("#led-err"),

  speaker: $("#speaker-bars"),

  btnA: $("#btn-a"),
  btnB: $("#btn-b"),
  btnSelect: $("#btn-select"),

  dUp: $("#d-up"),
  dDown: $("#d-down"),
  dLeft: $("#d-left"),
  dRight: $("#d-right"),

  input: $("#search"),
  btnSearch: $("#btn-search"),
  list: $("#pk-list"),
  mini: $("#mini-screen"),

  typePrev: $("#type-prev"),
  typeNext: $("#type-next"),
  typeValue: $("#type-value"),
};

const API = "https://pokeapi.co/api/v2";

// ---------- MARQUEE (LCD scroll si overflow) ----------
function applyMarqueeIfOverflow(node){
  if (!node) return;

  // reset
  node.classList.remove("marquee");
  const inner = node.querySelector(".marquee-inner");
  if (inner){
    const base = inner.textContent.split("   •   ")[0];
    node.textContent = base;
  }

  requestAnimationFrame(() => {
    if (node.scrollWidth > node.clientWidth + 2){
      const txt = node.textContent.trim();
      node.classList.add("marquee");
      node.innerHTML = `<span class="marquee-inner">${txt}   •   ${txt}</span>`;
    }
  });
}

// ---------- AUDIO (synth 8/16-bit) ----------
let audioCtx = null;
function ensureAudio(){
  if (!audioCtx){
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}
function beep({type="square", freq=440, dur=0.08, gain=0.05, slideTo=null} = {}){
  ensureAudio();
  const t0 = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo){
    osc.frequency.linearRampToValueAtTime(slideTo, t0 + dur);
  }

  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  osc.connect(g);
  g.connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

const SFX = {
  move(){ beep({freq: 740, dur: 0.05, gain: 0.035, type:"square"}); },
  confirm(){
    beep({freq: 660, dur: 0.06, gain: 0.05, type:"square"});
    setTimeout(()=>beep({freq: 880, dur: 0.06, gain: 0.05, type:"square"}), 70);
  },
  error(){ beep({freq: 220, dur: 0.10, gain: 0.06, type:"square", slideTo: 140}); },
  scan(durMs=480){
    const steps = Math.max(6, Math.floor(durMs / 60));
    for (let i=0; i<steps; i++){
      setTimeout(()=>beep({freq: 520 + (i%2)*180, dur: 0.04, gain: 0.03, type:"square"}), i*55);
    }
  }
};

["pointerdown","keydown"].forEach(evt=>{
  window.addEventListener(evt, () => {
    try{ ensureAudio(); audioCtx.resume?.(); }catch{}
  }, {once:true});
});

// ---------- LED + SPEAKER ANIM ----------
let idleBlinkTimer = null;
let errorBlinkTimer = null;
let speakerTimer = null;

function stopIdleBlink(){
  if (idleBlinkTimer) clearInterval(idleBlinkTimer);
  idleBlinkTimer = null;
}
function stopErrorBlink(){
  if (errorBlinkTimer) clearInterval(errorBlinkTimer);
  errorBlinkTimer = null;
}

function setLED(mode){
  el.ledReady.classList.remove("on");
  el.ledLoad.classList.remove("on");
  el.ledErr.classList.remove("on");

  if (mode === "idle") el.ledReady.classList.add("on");
  if (mode === "scan") el.ledLoad.classList.add("on");
  if (mode === "err") el.ledErr.classList.add("on");
}

function startIdleBlink(){
  stopErrorBlink();
  stopIdleBlink();
  setLED("idle");

  let on = true;
  idleBlinkTimer = setInterval(()=>{
    on = !on;
    el.ledReady.classList.toggle("on", on);
  }, 650);
}

function startErrorBlink(){
  stopIdleBlink();
  stopErrorBlink();
  setLED("err");

  let on = true;
  errorBlinkTimer = setInterval(()=>{
    on = !on;
    el.ledErr.classList.toggle("on", on);
  }, 650);
}

function stopSpeakerAnim(){
  if (speakerTimer) clearInterval(speakerTimer);
  speakerTimer = null;
}

function speakerIdle(){
  stopSpeakerAnim();
  const bars = [...el.speaker.querySelectorAll("i")];
  bars.forEach((b, idx)=> b.style.height = (8 + (idx%3)*2) + "px");
}

function speakerScan(){
  stopSpeakerAnim();
  const bars = [...el.speaker.querySelectorAll("i")];
  speakerTimer = setInterval(()=>{
    bars.forEach((b)=> {
      const h = 6 + Math.floor(Math.random()*9);
      b.style.height = h + "px";
      b.style.opacity = 0.65;
    });
  }, 80);
}

function speakerError(){
  stopSpeakerAnim();
  const bars = [...el.speaker.querySelectorAll("i")];
  let n = 0;
  speakerTimer = setInterval(()=>{
    n++;
    const on = n % 2 === 0;
    bars.forEach((b)=> { b.style.opacity = on ? 0.7 : 0.25; });
    if (n >= 6){
      stopSpeakerAnim();
      bars.forEach((b)=> { b.style.height = "8px"; b.style.opacity = 0.55; });
    }
  }, 120);
}

async function scanDelay(ms=480){
  stopIdleBlink();
  stopErrorBlink();
  setLED("scan");
  speakerScan();
  SFX.scan(ms);
  await new Promise(r => setTimeout(r, ms));
}

// ---------- VIEW SWITCH ----------
function showInfo(){
  el.viewInfo.style.display = "grid";
  el.viewStats.style.display = "none";
}
function showStats(){
  el.viewInfo.style.display = "none";
  el.viewStats.style.display = "grid";
}

// ---------- POKEAPI ----------
const cachePokemon = new Map();
const cacheSpecies = new Map();

async function fetchJSON(url){
  const res = await fetch(url);
  if (!res.ok) throw new Error(String(res.status));
  return await res.json();
}

async function getPokemon(query){
  const q = String(query).trim().toLowerCase();
  if (!q) throw new Error("EMPTY");
  if (cachePokemon.has(q)) return cachePokemon.get(q);

  const data = await fetchJSON(`${API}/pokemon/${encodeURIComponent(q)}`);
  cachePokemon.set(q, data);
  cachePokemon.set(String(data.id), data);
  cachePokemon.set(data.name, data);
  return data;
}

async function getSpeciesById(id){
  if (cacheSpecies.has(id)) return cacheSpecies.get(id);
  const data = await fetchJSON(`${API}/pokemon-species/${id}`);
  cacheSpecies.set(id, data);
  return data;
}

function mapForUI(pokemon, species){
  const types = pokemon.types.map(t => t.type.name.toUpperCase());
  const abilities = pokemon.abilities.map(a => a.ability.name.toUpperCase());
  const abilText = abilities.slice(0,2).join(" / ") || "--";

  const statMap = new Map(pokemon.stats.map(s => [s.stat.name, s.base_stat]));
  const stats = [
    { key: "HP",  value: statMap.get("hp") ?? 0 },
    { key: "ATK", value: statMap.get("attack") ?? 0 },
    { key: "DEF", value: statMap.get("defense") ?? 0 },
    { key: "SPA", value: statMap.get("special-attack") ?? 0 },
    { key: "SPD", value: statMap.get("special-defense") ?? 0 },
    { key: "SPE", value: statMap.get("speed") ?? 0 },
  ];

  const sprite =
    pokemon.sprites?.front_default ||
    pokemon.sprites?.versions?.["generation-v"]?.["black-white"]?.front_default ||
    "";

  const genusEn = (species.genera || []).find(g => g.language?.name === "en")?.genus || "POKéMON";
  const habitat = species.habitat?.name ? species.habitat.name.toUpperCase() : "--";
  const catchRate = (typeof species.capture_rate === "number") ? String(species.capture_rate) : "--";
  const happy = (typeof species.base_happiness === "number") ? String(species.base_happiness) : "--";

  return {
    id: pokemon.id,
    name: pokemon.name.toUpperCase(),
    types,
    abilText,
    heightM: (pokemon.height/10).toFixed(1) + "m",
    weightKg: (pokemon.weight/10).toFixed(1) + "kg",
    genus: genusEn.toUpperCase().replace(" POKÉMON","").trim() || genusEn.toUpperCase(),
    habitat,
    catchRate,
    happy,
    sprite,
    stats
  };
}

const TRANSPARENT_1PX =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>`);

function renderNotFound(){
  el.id.textContent = "---";
  el.name.textContent = "NOT FOUND";

  el.types.textContent = "--";
  el.abil.textContent = "--";
  el.ht.textContent = "--";
  el.wt.textContent = "--";

  el.genus.textContent = "--";
  el.habitat.textContent = "--";
  el.catchRate.textContent = "--";
  el.happy.textContent = "--";

  el.sprite.src = TRANSPARENT_1PX;
  el.sprite.classList.add("hidden");

  drawRadar([
    {key:"HP",value:0},{key:"ATK",value:0},{key:"DEF",value:0},
    {key:"SPA",value:0},{key:"SPD",value:0},{key:"SPE",value:0},
  ]);

  applyMarqueeIfOverflow(el.types);
  applyMarqueeIfOverflow(el.abil);
  applyMarqueeIfOverflow(el.typeValue);
  applyMarqueeIfOverflow(el.genus);
  applyMarqueeIfOverflow(el.habitat);
}

function renderViewer(ui){
  el.id.textContent = String(ui.id).padStart(3,"0");
  el.name.textContent = ui.name;

  el.types.textContent = ui.types.join(" / ");
  el.abil.textContent = ui.abilText;
  el.ht.textContent = ui.heightM;
  el.wt.textContent = ui.weightKg;

  el.genus.textContent = ui.genus;
  el.habitat.textContent = ui.habitat;
  el.catchRate.textContent = ui.catchRate;
  el.happy.textContent = ui.happy;

  if (ui.sprite){
    el.sprite.src = ui.sprite;
    el.sprite.classList.remove("hidden");
  } else {
    el.sprite.src = TRANSPARENT_1PX;
    el.sprite.classList.add("hidden");
  }

  drawRadar(ui.stats);

  applyMarqueeIfOverflow(el.types);
  applyMarqueeIfOverflow(el.abil);
  applyMarqueeIfOverflow(el.genus);
  applyMarqueeIfOverflow(el.habitat);
}

function drawRadar(stats){
  const c = el.radar;
  const ctx = c.getContext("2d");

  const cssW = c.width, cssH = c.height;
  const dpr = window.devicePixelRatio || 1;
  c.width = Math.floor(cssW * dpr);
  c.height = Math.floor(cssH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0,0,cssW,cssH);

  const cx = cssW / 2;
  const cy = cssH / 2;
  const R  = Math.min(cssW, cssH) * 0.40;

  const labels = stats.map(s => s.key);
  const values = stats.map(s => s.value);

  const MAX = 200;
  const ink = "rgba(31,42,31,0.70)";
  const grid = "rgba(31,42,31,0.18)";
  const fill = "rgba(31,42,31,0.22)";

  ctx.lineWidth = 1;
  for (let k=1; k<=5; k++){
    const r = (R * k) / 5;
    ctx.beginPath();
    for (let i=0; i<labels.length; i++){
      const a = (-Math.PI/2) + (i * 2*Math.PI/labels.length);
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.closePath();
    ctx.strokeStyle = grid;
    ctx.stroke();
  }

  for (let i=0; i<labels.length; i++){
    const a = (-Math.PI/2) + (i * 2*Math.PI/labels.length);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a)*R, cy + Math.sin(a)*R);
    ctx.strokeStyle = grid;
    ctx.stroke();
  }

/* Labels: más discretos y más cerca del polígono (evita tapar stats) */
ctx.font = "11px VT323, monospace";     // antes 15px
ctx.fillStyle = ink;
ctx.textAlign = "center";
ctx.textBaseline = "middle";

for (let i=0; i<labels.length; i++){
  const a = (-Math.PI/2) + (i * 2*Math.PI/labels.length);

  // acercamos los labels al borde del radar
  const x = cx + Math.cos(a) * (R + 10);  // antes R + 22
  const y = cy + Math.sin(a) * (R + 6);   // antes R + 14

  ctx.fillText(labels[i], x, y);
}


  ctx.beginPath();
  for (let i=0; i<values.length; i++){
    const v = Math.max(0, Math.min(MAX, values[i])) / MAX;
    const a = (-Math.PI/2) + (i * 2*Math.PI/labels.length);
    const x = cx + Math.cos(a) * (R * v);
    const y = cy + Math.sin(a) * (R * v);
    if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 2;
  ctx.stroke();
}

// ---------- BROWSER ----------
const TYPES = ["ALL","NORMAL","FIRE","WATER","ELECTRIC","GRASS","ICE","FIGHTING","POISON","GROUND","FLYING","PSYCHIC","BUG","ROCK","GHOST","DRAGON","DARK","STEEL","FAIRY"];
let typeIndex = 0;

let allNames = [];
let nameToId = new Map();
let filteredNames = [];
let page = 0;
let PAGE_SIZE = 10;
let selectedIndex = 0;
let activeName = "pikachu";

async function loadKanto151(){
  const data = await fetchJSON(`${API}/pokemon?limit=151&offset=0`);
  allNames = data.results.map(r => r.name);

  nameToId = new Map();
  for (const r of data.results){
    const m = r.url.match(/\/pokemon\/(\d+)\/?$/);
    const id = m ? Number(m[1]) : null;
    if (id) nameToId.set(r.name, id);
  }
}

async function applyTypeFilter(){
  const t = TYPES[typeIndex].toLowerCase();
  if (t === "all"){
    filteredNames = allNames.slice();
    return;
  }
  const data = await fetchJSON(`${API}/type/${encodeURIComponent(t)}`);
  const set = new Set(data.pokemon.map(p => p.pokemon.name));
  filteredNames = allNames.filter(n => set.has(n));
}

function totalPages(){
  return Math.max(1, Math.ceil(filteredNames.length / PAGE_SIZE));
}
function clampPage(){
  const tp = totalPages();
  if (page < 0) page = 0;
  if (page > tp-1) page = tp-1;
}
function visibleSlice(){
  const start = page * PAGE_SIZE;
  return filteredNames.slice(start, start + PAGE_SIZE);
}
function updateMini(){
  const tp = totalPages();
  el.mini.textContent = `PAGE ${String(page+1).padStart(2,"0")}/${String(tp).padStart(2,"0")}`;
}
function setTypeUI(){
  el.typeValue.textContent = TYPES[typeIndex];
  applyMarqueeIfOverflow(el.typeValue);
}

function renderList(){
  el.list.innerHTML = "";
  const items = visibleSlice();

  if (items.length === 0){
    const li = document.createElement("li");
    li.className = "list-item";
    li.innerHTML = `<span class="nm">NO RESULTS</span><span class="num">---</span>`;
    el.list.appendChild(li);
    updateMini();
    return;
  }

  items.forEach((name, i) => {
    const li = document.createElement("li");
    li.className = "list-item";
    li.dataset.name = name;

    const id = nameToId.get(name);
    const idTxt = id ? String(id).padStart(3,"0") : "---";

    li.innerHTML = `
      <span class="nm">${name.toUpperCase()}</span>
      <span class="num">${idTxt}</span>
    `;

    if (i === selectedIndex) li.classList.add("selected");
    if (name === activeName) li.classList.add("active");

    li.addEventListener("mouseenter", () => {
      selectedIndex = i;
      highlightSelection();
    });

    li.addEventListener("click", async () => {
      selectedIndex = i;
      highlightSelection();
      await confirmSelection();
    });

    el.list.appendChild(li);
  });

  updateMini();
}

function highlightSelection(){
  const items = [...el.list.querySelectorAll(".list-item")];
  items.forEach((li, i) => li.classList.toggle("selected", i === selectedIndex));
}

function moveSelection(delta){
  const items = visibleSlice();
  if (items.length === 0){ speakerError(); startErrorBlink(); SFX.error(); return; }

  selectedIndex += delta;
  if (selectedIndex < 0) selectedIndex = 0;
  if (selectedIndex > items.length - 1) selectedIndex = items.length - 1;

  highlightSelection();
  SFX.move();
}

function changePage(delta){
  page += delta;
  clampPage();
  selectedIndex = 0;
  renderList();
  SFX.move();
}

async function setType(delta){
  typeIndex = (typeIndex + delta + TYPES.length) % TYPES.length;
  setTypeUI();
  page = 0;
  selectedIndex = 0;

  SFX.move();
  await applyTypeFilter();
  recalcPageSize();
  renderList();
}

function recalcPageSize(){
  const temp = document.createElement("li");
  temp.className = "list-item";
  temp.style.visibility = "hidden";
  temp.innerHTML = `<span class="nm">TEST</span><span class="num">000</span>`;
  el.list.appendChild(temp);

  const rowH = temp.getBoundingClientRect().height || 28;
  temp.remove();

  const listH = el.list.getBoundingClientRect().height || 300;
  const size = Math.max(6, Math.floor(listH / rowH) - 1);
  PAGE_SIZE = size;
  clampPage();
}

async function confirmSelection(){
  const items = visibleSlice();
  if (items.length === 0){
    renderNotFound();
    speakerError();
    startErrorBlink();
    SFX.error();
    return;
  }

  const name = items[selectedIndex];

  await scanDelay(480);

  try{
    const p = await getPokemon(name);
    const s = await getSpeciesById(p.id);
    const ui = mapForUI(p, s);
    renderViewer(ui);

    activeName = p.name;
    renderList();

    SFX.confirm();
    speakerIdle();
    startIdleBlink();
  } catch {
    renderNotFound();
    speakerError();
    startErrorBlink();
    SFX.error();
  }
}

async function searchAndLoad(query){
  const q = String(query).trim().toLowerCase();

  if (!q){
    renderNotFound();
    speakerError();
    startErrorBlink();
    SFX.error();
    return;
  }

  await scanDelay(480);

  try{
    const p = await getPokemon(q);
    const s = await getSpeciesById(p.id);
    const ui = mapForUI(p, s);
    renderViewer(ui);

    activeName = p.name;

    const idx = filteredNames.indexOf(activeName);
    if (idx !== -1){
      page = Math.floor(idx / PAGE_SIZE);
      selectedIndex = idx % PAGE_SIZE;
    } else {
      typeIndex = 0;
      setTypeUI();
      await applyTypeFilter();
      const idx2 = filteredNames.indexOf(activeName);
      page = idx2 !== -1 ? Math.floor(idx2 / PAGE_SIZE) : 0;
      selectedIndex = idx2 !== -1 ? idx2 % PAGE_SIZE : 0;
    }

    renderList();

    SFX.confirm();
    speakerIdle();
    startIdleBlink();
  } catch {
    renderNotFound();
    speakerError();
    startErrorBlink();
    SFX.error();
  }
}

// ---------- EVENTS ----------
el.btnA.addEventListener("click", () => { showInfo(); SFX.move(); });
el.btnB.addEventListener("click", () => { showStats(); SFX.move(); });
el.btnSelect.addEventListener("click", confirmSelection);

el.btnSearch.addEventListener("click", () => searchAndLoad(el.input.value));
el.input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") searchAndLoad(el.input.value);
});

el.typePrev.addEventListener("click", () => setType(-1));
el.typeNext.addEventListener("click", () => setType(+1));

el.dUp.addEventListener("click", () => moveSelection(-1));
el.dDown.addEventListener("click", () => moveSelection(+1));
el.dLeft.addEventListener("click", () => changePage(-1));
el.dRight.addEventListener("click", () => changePage(+1));

window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowUp") moveSelection(-1);
  else if (e.key === "ArrowDown") moveSelection(+1);
  else if (e.key === "ArrowLeft") changePage(-1);
  else if (e.key === "ArrowRight") changePage(+1);
  else if (e.key === " ") { e.preventDefault(); confirmSelection(); }
  else if (e.key.toLowerCase() === "a") showInfo();
  else if (e.key.toLowerCase() === "b") showStats();
});

window.addEventListener("resize", () => {
  recalcPageSize();
  renderList();
  applyMarqueeIfOverflow(el.typeValue);
  applyMarqueeIfOverflow(el.types);
  applyMarqueeIfOverflow(el.abil);
  applyMarqueeIfOverflow(el.genus);
  applyMarqueeIfOverflow(el.habitat);
});

// ---------- INIT ----------
(async function init(){
  speakerIdle();
  startIdleBlink();

  setTypeUI();
  await loadKanto151();
  filteredNames = allNames.slice();

  recalcPageSize();
  renderList();

  showInfo();
  await searchAndLoad("pikachu");
})();
