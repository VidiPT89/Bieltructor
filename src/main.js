import { TouchInput } from "./touch-input.js";
import * as THREE from "three";
import {
  generate,
  height,
  key,
  SIZE,
  collides,
  validateSave,
  validatePlayer,
  WATER_LEVEL,
  GLASS,
  DOOR,
  DOOR_OPEN,
  TYPES,
  seeThrough,
  toggleDoor,
} from "./world.js";
import { sky, DAY_LENGTH, NOON } from "./daynight.js";
import { Music, audioContext, pauseAudio } from "./music.js";
import "./style.css";
const $ = (s) => document.querySelector(s),
  app = $("#app");
const strings = {
  pt: {
    tag: "UM MUNDO À TUA MEDIDA",
    title: "Pequenos blocos.<br>Grandes aventuras.",
    intro: "Olá, Biel! O próximo grande mundo começa contigo.",
    play: "Vamos construir",
    resume: "Continuar aventura",
    settings: "Definições",
    back: "Voltar",
    language: "Idioma",
    appearance: "Aparência",
    dark: "Escuro",
    light: "Claro",
    system: "Sistema",
    sound: "Efeitos sonoros",
    on: "Ligados",
    off: "Desligados",
    help: "Como jogar",
    helpText:
      "W A S D ou setas para andar · Shift para correr · Espaço para saltar (e nadar). Arrasta o rato para olhar à volta. Clica num bloco para o partir. Botão direito ou Shift + clique para construir. Teclas 1–9 e 0 para escolher um material. Botão direito numa porta abre-a e fecha-a. À noite, o âmbar brilha como uma lanterna. V muda a perspetiva. Esc abre o menu.",
    world: "O vale do Biel",
    creative: "MODO CRIATIVO",
    saved: "Mundo guardado",
    saveError:
      "Não foi possível guardar. Exporta o mundo para não perderes as alterações.",
    pause: "Uma pequena pausa",
    continue: "Voltar à aventura",
    home: "Menu principal",
    export: "Exportar mundo",
    import: "Importar mundo",
    invalid: "Este ficheiro não é um mundo Bieltructor válido.",
    ready: "Pronto para explorar?",
    hint: "Arrasta para olhar · Clica para partir · Botão direito para construir",
    blocks: [
      "Relva",
      "Terra",
      "Pedra",
      "Areia",
      "Madeira",
      "Folhas",
      "Tijolo",
      "Âmbar",
      "Vidro",
      "Porta",
    ],
    break: "Partir",
    place: "Construir",
    jump: "Saltar",
    run: "Correr",
    forward: "Avançar",
    left: "Esquerda",
    right: "Direita",
    backward: "Recuar",
    loading: "A preparar a aventura",
    quest: "O teu primeiro abrigo",
    questText: "Coloca 12 blocos e dá uma casa à imaginação.",
    done: "Abrigo a crescer! Continua a criar.",
    view: "Perspetiva",
    reset: "Regressar ao início",
    mobile:
      "Usa os botões para andar. Arrasta o cenário para olhar e toca num bloco para o selecionar. Escolhe uma porta e carrega em Construir para a abrir ou fechar.",
    quality: "Qualidade",
    high: "Alta",
    low: "Leve",
    storage: "O mundo é guardado neste dispositivo.",
    edition: "EDIÇÃO CRIATIVA / 01",
    made: "Feito para imaginar",
    resetWorld: "Recomeçar o mundo",
    confirmReset: "Carrega outra vez para apagar tudo",
    worldReset: "Mundo novo, pronto a construir!",
    space: "Espaço",
    music: "Música",
    cycle: "Dia e noite",
    cycleOn: "Ciclo de 8 minutos",
    alwaysDay: "Sempre de dia",
    day: "Dia",
    night: "Noite",
  },
  en: {
    tag: "A WORLD OF YOUR OWN",
    title: "Little blocks.<br>Big adventures.",
    intro: "Hey, Biel! The next great world starts with you.",
    play: "Let’s build",
    resume: "Continue adventure",
    settings: "Settings",
    back: "Back",
    language: "Language",
    appearance: "Appearance",
    dark: "Dark",
    light: "Light",
    system: "System",
    sound: "Sound effects",
    on: "On",
    off: "Off",
    help: "How to play",
    helpText:
      "W A S D or arrow keys to move · Shift to run · Space to jump (and swim). Drag to look around. Click a block to break it. Right-click or Shift + click to build. Keys 1–9 and 0 select a material. Right-click a door to open or close it. At night, amber glows like a lantern. V changes perspective. Esc opens the menu.",
    world: "Biel’s valley",
    creative: "CREATIVE MODE",
    saved: "World saved",
    saveError: "Could not save. Export your world to keep your changes.",
    pause: "A little break",
    continue: "Back to the adventure",
    home: "Main menu",
    export: "Export world",
    import: "Import world",
    invalid: "This file is not a valid Bieltructor world.",
    ready: "Ready to explore?",
    hint: "Drag to look · Click to break · Right-click to build",
    blocks: [
      "Grass",
      "Dirt",
      "Stone",
      "Sand",
      "Wood",
      "Leaves",
      "Brick",
      "Amber",
      "Glass",
      "Door",
    ],
    break: "Break",
    place: "Build",
    jump: "Jump",
    run: "Run",
    forward: "Forward",
    left: "Left",
    right: "Right",
    backward: "Backwards",
    loading: "Getting your adventure ready",
    quest: "Your first shelter",
    questText: "Place 12 blocks and give your imagination a home.",
    done: "Looking like home! Keep creating.",
    view: "Perspective",
    reset: "Return to spawn",
    mobile:
      "Use the buttons to move. Drag the scene to look and tap a block to select it. Select a door and press Build to open or close it.",
    quality: "Quality",
    high: "High",
    low: "Light",
    storage: "Your world is saved on this device.",
    edition: "CREATIVE EDITION / 01",
    made: "Made for imagination",
    resetWorld: "Start a new world",
    confirmReset: "Press again to erase everything",
    worldReset: "A fresh world, ready to build!",
    space: "Space",
    music: "Music",
    cycle: "Day and night",
    cycleOn: "8-minute cycle",
    alwaysDay: "Always day",
    day: "Day",
    night: "Night",
  },
};
let settings = {
  lang: "pt",
  theme: "system",
  sound: true,
  music: true,
  cycle: "cycle",
  quality: "high",
};
try {
  Object.assign(
    settings,
    JSON.parse(localStorage.getItem("biel-settings") || "{}"),
  );
} catch {}
if (!strings[settings.lang]) settings.lang = "pt";
const t = (k) => strings[settings.lang][k];
const touchInput = new TouchInput();
let mode = "splash",
  previous = "menu",
  started = false,
  selected = 0,
  firstPerson = false,
  confirmReset = false,
  timeOfDay = NOON,
  scenery = "menu",
  toastTimer,
  saveTimer;
const music = new Music();
const isNight = () => settings.cycle === "cycle" && sky(timeOfDay).night;
const clock = () => (isNight() ? `☾︎ ${t("night")}` : `☀︎ ${t("day")}`);
const colors = [
  0x789b45, 0x95704c, 0x8e9797, 0xe9cf8b, 0x93633c, 0x447951, 0xbb6346,
  0xefad36, 0xbfe6ec, 0x8a5a33,
];
const credits = () =>
  `<div class="credits">Developed by <strong>David Arsénio Martins</strong><div><a href="https://ividi.dev/" target="_blank" rel="noopener">ividi.dev ↗︎</a><span>·</span><a href="https://github.com/VidiPT89/" target="_blank" rel="noopener">GitHub ↗︎</a></div></div>`;
const logo = `<img class="brand-icon" src="logo.webp" alt=""><span>BIEL<span class="brand-accent">TRUCTOR</span></span>`;
function theme() {
  document.documentElement.dataset.theme = settings.theme;
  document.documentElement.lang = settings.lang === "pt" ? "pt-PT" : "en";
  try {
    localStorage.setItem("biel-settings", JSON.stringify(settings));
  } catch {}
}
theme();
const toastEl = document.createElement("div");
toastEl.id = "toast";
toastEl.setAttribute("role", "status");
document.body.append(toastEl);
function button(action, label, cls = "") {
  return `<button data-action="${action}" ${action === "view" || action === "pause" ? `aria-label="${t(action)}"` : ""} class="${cls}">${label}</button>`;
}
function render() {
  app.className = mode;
  if (mode !== "playing") touchInput.clear();
  let content = "";
  if (mode === "splash")
    content = `<div class="splash-inner"><img class="splash-logo" src="logo.webp" alt="Bieltructor"><p>${t("loading")}<span class="dots">…</span></p></div>${credits()}`;
  if (mode === "menu")
    content = `<header><div class="brand">${logo}</div><span class="edition">${t("edition")}</span>${button("settings", "⚙︎ <span>" + t("settings") + "</span>", "quiet")}</header><main class="intro"><div class="eyebrow"><i></i>${t("tag")}</div><h1>${t("title")}</h1><p>${t("intro")}</p><div class="menu-actions">${button("play", `${started ? t("resume") : t("play")} <span>↗︎</span>`, "primary")}${button("help", t("help"), "secondary")}</div><div class="world-info"><span class="world-icon">▧</span><div><strong>${t("world")}</strong><small>${t("creative")} · ${t("storage")}</small></div></div></main><div class="biel-label"><span>BIEL</span><small>${t("ready")}</small></div><footer>${credits()}<span class="version">v1.0 · ${t("made")}</span></footer>`;
  if (mode === "playing")
    content = `<div class="hud-top"><div class="world-title"><b>${t("world")}</b><small>${t("creative")} · <span class="clock">${clock()}</span></small></div><div>${button("view", "◉", "icon")}${button("pause", "Ⅱ", "icon")}</div></div><div class="quest"><span>✦</span><div><b>${t("quest")}</b><p>${placed() >= 12 ? t("done") : t("questText")}</p><div class="progress"><i style="width:${Math.min(100, (placed() / 12) * 100)}%"></i></div></div><small>${Math.min(placed(), 12)}/12</small></div><div class="crosshair">+</div><div class="hotbar-wrap"><div class="material-label">${t("blocks")[selected]}</div><div class="hotbar">${colors.map((c, i) => `<button data-slot="${i}" aria-label="${t("blocks")[i]}" aria-pressed="${i === selected}" class="slot ${i === selected ? "selected" : ""}"><small>${(i + 1) % 10}</small><i style="--block:#${c.toString(16)}"></i></button>`).join("")}</div><div class="hint">${t("hint")}</div></div><div class="touch-controls"><div class="dpad"><button data-key="KeyW" aria-label="${t("forward")}">↑</button><button data-key="KeyA" aria-label="${t("left")}">←</button><button data-key="KeyS" aria-label="${t("backward")}">↓</button><button data-key="KeyD" aria-label="${t("right")}">→</button></div><div class="touch-actions"><button data-key="ShiftLeft">${t("run")}</button>${button("break", t("break"))}${button("place", t("place"))}<button data-key="Space">${t("jump")}</button></div></div>`;
  if (["settings", "help", "paused"].includes(mode)) {
    let inner = "";
    if (mode === "paused")
      inner = `<span class="eyebrow">BIELTRUCTOR</span><h2>${t("pause")}</h2>${button("play", t("continue"), "primary wide")}${button("settings", t("settings"), "wide")}${button("help", t("help"), "wide")}${button("spawn", t("reset"), "wide")}${button("home", t("home"), "quiet wide")}`;
    if (mode === "help")
      inner = `<span class="eyebrow">BIELTRUCTOR</span><h2>${t("help")}</h2><p class="help-copy">${t("helpText")}</p><p class="touch-help">${t("mobile")}</p><div class="key-demo"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><kbd>${t("space")}</kbd></div>${button("back", t("back"), "primary wide")}`;
    if (mode === "settings")
      inner = `<h2>${t("settings")}</h2><label>${t("language")}<select id="language"><option value="pt" ${settings.lang === "pt" ? "selected" : ""}>Português (Portugal)</option><option value="en" ${settings.lang === "en" ? "selected" : ""}>English</option></select></label><label>${t("appearance")}<select id="appearance">${["dark", "light", "system"].map((v) => `<option value="${v}" ${settings.theme === v ? "selected" : ""}>${t(v)}</option>`).join("")}</select></label><label>${t("sound")}<select id="sound"><option value="on" ${settings.sound ? "selected" : ""}>${t("on")}</option><option value="off" ${!settings.sound ? "selected" : ""}>${t("off")}</option></select></label><label>${t("music")}<select id="music"><option value="on" ${settings.music ? "selected" : ""}>${t("on")}</option><option value="off" ${!settings.music ? "selected" : ""}>${t("off")}</option></select></label><label>${t("cycle")}<select id="cycle"><option value="cycle" ${settings.cycle === "cycle" ? "selected" : ""}>${t("cycleOn")}</option><option value="day" ${settings.cycle === "day" ? "selected" : ""}>${t("alwaysDay")}</option></select></label><label>${t("quality")}<select id="quality">${["high", "low"].map((v) => `<option value="${v}" ${settings.quality === v ? "selected" : ""}>${t(v)}</option>`).join("")}</select></label><div class="file-actions">${button("export", t("export"))}${button("import", t("import"))}${button("reset", confirmReset ? t("confirmReset") : t("resetWorld"), confirmReset ? "danger confirm" : "danger")}</div><small>${t("storage")}</small>${button("back", t("back"), "primary wide")}`;
    content = `<div class="modal-backdrop"><section class="panel" role="dialog" aria-modal="true" aria-label="${t(mode === "paused" ? "pause" : mode)}">${inner}</section></div>`;
  }
  app.innerHTML = content;
  app
    .querySelectorAll("[data-action]")
    .forEach((b) => (b.onclick = () => action(b.dataset.action)));
  app.querySelectorAll("[data-slot]").forEach(
    (b) =>
      (b.onclick = () => {
        selected = +b.dataset.slot;
        render();
      }),
  );
  if (mode === "settings") {
    for (const [id, prop] of [
      ["language", "lang"],
      ["appearance", "theme"],
      ["sound", "sound"],
      ["music", "music"],
      ["cycle", "cycle"],
      ["quality", "quality"],
    ])
      $("#" + id).onchange = (e) => {
        settings[prop] =
          prop === "sound" || prop === "music"
            ? e.target.value === "on"
            : e.target.value;
        if (prop === "music") settings.music ? music.start() : music.stop();
        theme();
        applyQuality();
        render();
      };
  }
  if (["settings", "help", "paused"].includes(mode))
    app.querySelector("button,select")?.focus();
}
function action(a) {
  if (a !== "reset") confirmReset = false;
  if (a === "reset") {
    if (!confirmReset) {
      confirmReset = true;
    } else {
      confirmReset = false;
      resetWorld();
    }
  } else if (a === "play") {
    mode = "playing";
    started = true;
    keys.clear();
  } else if (a === "pause") {
    mode = "paused";
    save();
  } else if (a === "settings" || a === "help") {
    previous = mode === "playing" ? "paused" : mode;
    mode = a;
  } else if (a === "back") {
    mode = previous;
    previous = "menu";
  } else if (a === "home") {
    mode = "menu";
    save();
  } else if (a === "view") {
    togglePerspective();
  } else if (a === "spawn") {
    spawn();
    mode = "playing";
  } else if (a === "export") {
    if (window.webkit?.messageHandlers?.files) {
      window.webkit.messageHandlers.files.postMessage({
        action: "export",
        json: JSON.stringify(saveData()),
      });
      return;
    }
    const blob = new Blob([JSON.stringify(saveData())], {
        type: "application/json",
      }),
      url = URL.createObjectURL(blob),
      link = document.createElement("a");
    link.href = url;
    link.download = "bieltructor-world.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  } else if (a === "import") {
    importWorld();
    return;
  } else if (a === "break" || a === "place") {
    edit(a === "place");
    return;
  }
  render();
}
function toast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 3500);
}
const blocks = generate(),
  edits = new Map();
try {
  const loaded = validateSave(JSON.parse(localStorage.getItem("biel-world")));
  if (loaded) {
    for (const [x, y, z, type] of loaded) {
      const k = key(x, y, z);
      edits.set(k, type);
      if (type === null) blocks.delete(k);
      else blocks.set(k, type);
    }
    started = loaded.length > 0;
  }
} catch {}
// Blocks Biel has placed that are still standing (drives the shelter quest).
const placed = () => [...edits.values()].filter((v) => v !== null).length;
function saveData() {
  return {
    version: 1,
    edits: [...edits].map(([k, v]) => [...k.split(",").map(Number), v]),
  };
}
function save() {
  try {
    localStorage.setItem("biel-world", JSON.stringify(saveData()));
    localStorage.setItem(
      "biel-player",
      JSON.stringify({
        x: player.x,
        y: player.y,
        z: player.z,
        yaw,
        pitch,
        firstPerson,
        time: timeOfDay,
      }),
    );
    return true;
  } catch {
    toast(t("saveError"));
    return false;
  }
}
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (save()) toast(t("saved"));
  }, 700);
}
function importWorld() {
  if (window.webkit?.messageHandlers?.files) {
    window.webkit.messageHandlers.files.postMessage({ action: "import" });
    return;
  }
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json,application/json";
  input.onchange = async () => {
    const f = input.files[0];
    if (!f) return;
    try {
      if (f.size > 3000000) throw Error();
      applyImportedWorld(await f.text());
    } catch {
      toast(t("invalid"));
    }
  };
  input.click();
}
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb6d7dc);
scene.fog = new THREE.Fog(0xb6d7dc, 35, 105);
const camera = new THREE.PerspectiveCamera(
  48,
  innerWidth / innerHeight,
  0.1,
  160,
);
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: $("#world"), antialias: true });
} catch {
  app.innerHTML =
    '<p style="padding:3rem">Bieltructor precisa de WebGL. Abre num navegador com aceleração gráfica. / Bieltructor needs WebGL. Please enable hardware acceleration.</p>';
  throw Error("WebGL unavailable");
}
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
const hemi = new THREE.HemisphereLight(0xe5f3ff, 0x667349, 2.5);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe6b2, 3);
sun.position.set(18, 35, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, {
  left: -35,
  right: 35,
  top: 35,
  bottom: -35,
  near: 1,
  far: 100,
});
sun.shadow.bias = -0.0005;
scene.add(sun);
// "Light" quality halves the pixel work and turns shadows off for older devices.
function applyQuality() {
  const high = settings.quality === "high";
  renderer.setPixelRatio(Math.min(devicePixelRatio, high ? 2 : 1));
  if (sun.castShadow !== high) {
    sun.castShadow = high;
    scene.traverse((o) => o.material && (o.material.needsUpdate = true));
  }
}
applyQuality();
const cube = new THREE.BoxGeometry(1, 1, 1);
const terrain = new THREE.Group();
scene.add(terrain);
let meshes = [],
  mapping = [];
function texture(hex) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 16;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#" + hex.toString(16);
  ctx.fillRect(0, 0, 16, 16);
  for (let i = 0; i < 65; i++) {
    ctx.fillStyle = i % 2 ? "#ffffff12" : "#00000012";
    ctx.fillRect((i * 7) % 16, (i * 11 + Math.floor(i / 16) * 3) % 16, 2, 2);
  }
  return pixelTexture(canvas);
}
// Glass: a light frame with a clear centre and a little shine.
function glassTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 16;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#cdeef488";
  ctx.fillRect(0, 0, 16, 16);
  ctx.clearRect(1, 1, 14, 14);
  ctx.fillStyle = "#e6f8fb33";
  ctx.fillRect(1, 1, 14, 14);
  ctx.fillStyle = "#ffffffaa";
  for (let i = 0; i < 4; i++) ctx.fillRect(3 + i, 9 - i * 2, 1, 2);
  return pixelTexture(canvas);
}
// Door: wooden planks, a small window and a brass handle.
function doorTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 16;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#8a5a33";
  ctx.fillRect(0, 0, 16, 16);
  ctx.fillStyle = "#6c4325";
  for (const x of [0, 5, 10, 15]) ctx.fillRect(x, 0, 1, 16);
  ctx.fillRect(0, 0, 16, 1);
  ctx.fillRect(0, 15, 16, 1);
  ctx.fillStyle = "#bfe6ec";
  ctx.fillRect(4, 3, 8, 4);
  ctx.fillStyle = "#f2c14e";
  ctx.fillRect(12, 9, 2, 2);
  return pixelTexture(canvas);
}
function pixelTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const doorMaterial = new THREE.MeshStandardMaterial({
  map: doorTexture(),
  roughness: 0.9,
});
const materials = colors.map((c, i) =>
  i === GLASS
    ? new THREE.MeshStandardMaterial({
        map: glassTexture(),
        transparent: true,
        roughness: 0.15,
        depthWrite: false,
      })
    : i === DOOR
      ? doorMaterial
      : new THREE.MeshStandardMaterial({ map: texture(c), roughness: 1 }),
);
materials[DOOR_OPEN] = doorMaterial;
// Amber works as a lantern: it glows as night falls.
const amber = materials[7];
amber.emissive.set(0xffa040);
amber.emissiveMap = amber.map;
amber.emissiveIntensity = 0;
// An open door folds against the side of its block.
const doorPanel = new THREE.BoxGeometry(0.14, 1, 1).translate(-0.43, 0, 0);
function rebuild() {
  for (const m of meshes) {
    terrain.remove(m);
    m.dispose();
  }
  meshes = [];
  mapping = [];
  const groups = Array.from({ length: TYPES }, () => []);
  for (const [k, type] of blocks) {
    const [x, y, z] = k.split(",").map(Number);
    if (
      [
        [1, 0, 0],
        [-1, 0, 0],
        [0, 1, 0],
        [0, -1, 0],
        [0, 0, 1],
        [0, 0, -1],
      ].some(([a, b, c]) => {
        const next = blocks.get(key(x + a, y + b, z + c));
        return next === undefined || seeThrough(next);
      })
    )
      groups[type].push([x, y, z]);
  }
  const matrix = new THREE.Matrix4();
  groups.forEach((group, i) => {
    const mesh = new THREE.InstancedMesh(
      i === DOOR_OPEN ? doorPanel : cube,
      materials[i],
      group.length,
    );
    group.forEach(([x, y, z], j) =>
      mesh.setMatrixAt(j, matrix.makeTranslation(x, y, z)),
    );
    mesh.castShadow = i !== GLASS;
    mesh.receiveShadow = true;
    mesh.userData.type = i;
    terrain.add(mesh);
    meshes.push(mesh);
    mapping[i] = group;
    mesh.computeBoundingSphere();
  });
}
rebuild();
const water = new THREE.Mesh(
  new THREE.PlaneGeometry(125, 125),
  new THREE.MeshStandardMaterial({
    color: 0x4dacae,
    transparent: true,
    opacity: 0.67,
    roughness: 0.28,
    metalness: 0.3,
  }),
);
water.rotation.x = -Math.PI / 2;
water.position.y = WATER_LEVEL;
scene.add(water);
const clouds = new THREE.Group();
scene.add(clouds);
const cloudMat = new THREE.MeshStandardMaterial({
  color: 0xfff9e9,
  roughness: 1,
});
for (let i = 0; i < 13; i++) {
  const group = new THREE.Group();
  for (let j = 0; j < 4; j++) {
    const mesh = new THREE.Mesh(cube, cloudMat);
    mesh.scale.set(3 + (j % 2) * 2, 1.2 + (j % 2), 2.7);
    mesh.position.set(j * 2, Math.sin(j) * 0.5, 0);
    group.add(mesh);
  }
  group.position.set(
    Math.sin(i * 7) * 47,
    19 + (i % 3) * 3,
    Math.cos(i * 4) * 45,
  );
  clouds.add(group);
}
// Sky: stars, sun and moon live far away and follow the camera.
const skyDome = new THREE.Group();
scene.add(skyDome);
const starPositions = [];
for (let i = 0; i < 450; i++) {
  const u = Math.random() * Math.PI * 2,
    v = Math.random() * 0.9 + 0.05;
  starPositions.push(
    Math.cos(u) * Math.sqrt(1 - v * v) * 95,
    v * 95,
    Math.sin(u) * Math.sqrt(1 - v * v) * 95,
  );
}
const stars = new THREE.Points(
  new THREE.BufferGeometry().setAttribute(
    "position",
    new THREE.Float32BufferAttribute(starPositions, 3),
  ),
  new THREE.PointsMaterial({
    color: 0xfff8e6,
    size: 1.3,
    transparent: true,
    opacity: 0,
    fog: false,
    depthWrite: false,
  }),
);
skyDome.add(stars);
const disc = (color, size) => {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ color, fog: false, transparent: true }),
  );
  skyDome.add(m);
  return m;
};
const sunDisc = disc(0xfff0a8, 9),
  moonDisc = disc(0xe9eef8, 6);
const DAY_SKY = new THREE.Color(0xb6d7dc),
  NIGHT_SKY = new THREE.Color(0x0c1630),
  DUSK_SKY = new THREE.Color(0xf09a5c),
  SUNLIGHT = new THREE.Color(0xffe6b2),
  DUSK_LIGHT = new THREE.Color(0xff9a5a),
  DAY_HEMI = new THREE.Color(0xe5f3ff),
  NIGHT_HEMI = new THREE.Color(0x9db0e8),
  sunDirection = new THREE.Vector3();
function applySky(time) {
  const s = sky(time);
  scene.background
    .copy(NIGHT_SKY)
    .lerp(DAY_SKY, s.daylight)
    .lerp(DUSK_SKY, s.dusk * 0.55);
  scene.fog.color.copy(scene.background);
  hemi.intensity = 1.25 + 1.25 * s.daylight;
  hemi.color.copy(NIGHT_HEMI).lerp(DAY_HEMI, s.daylight);
  sun.intensity = 3 * s.daylight;
  sun.color.copy(SUNLIGHT).lerp(DUSK_LIGHT, s.dusk);
  sunDirection.set(...s.sun).normalize();
  sun.position.set(
    sunDirection.x * 40,
    Math.max(sunDirection.y, 0.15) * 40,
    12,
  );
  skyDome.position.copy(camera.position);
  sunDisc.position.copy(sunDirection).multiplyScalar(90);
  moonDisc.position.copy(sunDirection).multiplyScalar(-90);
  sunDisc.lookAt(camera.position);
  moonDisc.lookAt(camera.position);
  sunDisc.material.opacity = Math.min(1, s.daylight * 3);
  moonDisc.material.opacity = 1 - s.daylight;
  stars.material.opacity = Math.max(0, 1 - s.daylight * 1.6);
  amber.emissiveIntensity = (1 - s.daylight) * 1.4;
  music.night = s.night;
  return s;
}
// Biel's original voxel explorer: short brown hair, brown eyes and orange jacket.
const biel = new THREE.Group();
scene.add(biel);
const mat = (c) =>
  new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 });
const skin = mat(0xdba77f),
  hair = mat(0x594437),
  shirt = mat(0xed882e),
  pants = mat(0x334751),
  shoe = mat(0xf0e4cf),
  dark = mat(0x302923);
function part(parent, w, h, d, x, y, z, material) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
part(biel, 0.68, 0.65, 0.38, 0, 1.05, 0, shirt);
part(biel, 0.07, 0.58, 0.015, 0, 1.08, 0.2, mat(0xf7bd46));
part(biel, 0.35, 0.42, 0.18, 0, 1.05, -0.27, mat(0x9c6941));
const head = new THREE.Group();
head.position.y = 1.64;
biel.add(head);
part(head, 0.66, 0.59, 0.58, 0, 0, 0, skin);
part(head, 0.69, 0.16, 0.61, 0, 0.27, 0, hair);
part(head, 0.69, 0.22, 0.13, 0, 0.13, -0.24, hair);
for (const x of [-0.32, 0.32])
  part(head, 0.08, 0.2, 0.42, x, 0.17, -0.04, hair);
for (const x of [-0.16, 0.16]) {
  part(head, 0.15, 0.12, 0.025, x, 0.02, 0.3, shoe);
  part(head, 0.075, 0.09, 0.035, x, 0.01, 0.32, dark);
  part(head, 0.16, 0.035, 0.03, x, 0.13, 0.31, hair);
}
part(head, 0.22, 0.04, 0.025, 0, -0.16, 0.3, shoe);
part(head, 0.09, 0.08, 0.08, 0, -0.055, 0.32, skin);
function limb(x, y, material, leg) {
  const g = new THREE.Group();
  g.position.set(x, y, 0);
  biel.add(g);
  part(g, leg ? 0.27 : 0.22, leg ? 0.53 : 0.48, 0.29, 0, -0.22, 0, material);
  part(
    g,
    leg ? 0.28 : 0.22,
    leg ? 0.15 : 0.17,
    leg ? 0.4 : 0.29,
    0,
    -0.49,
    leg ? 0.05 : 0,
    leg ? shoe : skin,
  );
  return g;
}
const leftArm = limb(-0.47, 1.32, shirt, false),
  rightArm = limb(0.47, 1.32, shirt, false),
  leftLeg = limb(-0.18, 0.57, pants, true),
  rightLeg = limb(0.18, 0.57, pants, true);
const player = new THREE.Vector3(0, 8, 0);
let velocity = 0,
  grounded = false,
  yaw = 0.7,
  pitch = 0.4;
function spawn() {
  player.set(0, height(0, 0) + 0.51, 0);
  while (collides(blocks, player) && player.y < 33) player.y++;
  velocity = 0;
}
spawn();
// Return to where Biel was standing last time, when that spot is still free.
try {
  const raw = JSON.parse(localStorage.getItem("biel-player"));
  if (Number.isFinite(raw?.time)) timeOfDay = ((raw.time % 1) + 1) % 1;
  const last = validatePlayer(raw);
  if (last) {
    player.set(last.x, last.y, last.z);
    ({ yaw, pitch, firstPerson } = last);
    if (collides(blocks, player)) spawn();
  }
} catch {}
document.documentElement.classList.toggle("first-person", firstPerson);
function togglePerspective() {
  firstPerson = !firstPerson;
  document.documentElement.classList.toggle("first-person", firstPerson);
}
const outline = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(1.025, 1.025, 1.025)),
  new THREE.LineBasicMaterial({ color: 0xfff3b6 }),
);
scene.add(outline);
outline.visible = false;
const ray = new THREE.Raycaster(),
  pointer = new THREE.Vector2(0, 0),
  center = new THREE.Vector2(0, 0);
let pointerKind = "mouse";
let target = null,
  pointerDown = null;
const keys = new Set();
const pressed = (code) => keys.has(code) || touchInput.has(code);
app.addEventListener("pointerdown", (e) => {
  const control = e.target.closest("[data-key]");
  if (!control || mode !== "playing") return;
  e.preventDefault();
  touchInput.press(e.pointerId, control.dataset.key);
  app.setPointerCapture(e.pointerId);
});
for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
  app.addEventListener(event, (e) => touchInput.release(e.pointerId));
window.pauseNativeGame = () => {
  pauseAudio(true);
  keys.clear();
  touchInput.clear();
  pointerDown = null;
  if (mode === "playing") action("pause");
  else save();
};
window.nativeFileError = () => toast(t("invalid"));

function pick() {
  // First person with a mouse aims with the crosshair; touch aims where the finger tapped.
  ray.setFromCamera(
    firstPerson && pointerKind !== "touch" ? center : pointer,
    camera,
  );
  const hits = ray.intersectObjects(meshes, false);
  target = null;
  outline.visible = false;
  for (const hit of hits) {
    const p = mapping[hit.object.userData.type][hit.instanceId];
    if (new THREE.Vector3(...p).distanceTo(player) < 7) {
      target = { p, normal: hit.face.normal };
      outline.position.set(...p);
      outline.visible = true;
      break;
    }
  }
}
function beep(build) {
  if (!settings.sound) return;
  try {
    const audio = audioContext();
    audio.resume();
    const osc = audio.createOscillator(),
      gain = audio.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(build ? 520 : 180, audio.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      build ? 780 : 70,
      audio.currentTime + 0.11,
    );
    gain.gain.setValueAtTime(0.08, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + 0.16);
  } catch {}
}
const particles = [];
function burst(p, type) {
  for (let i = 0; i < 8; i++) {
    const m = new THREE.Mesh(cube, materials[type]);
    m.scale.setScalar(0.12);
    m.position.set(...p);
    scene.add(m);
    particles.push({
      m,
      v: new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        Math.random() * 3,
        (Math.random() - 0.5) * 3,
      ),
      life: 0.6,
    });
  }
}
const isDoor = (type) => type === DOOR || type === DOOR_OPEN;
function edit(place) {
  if (mode !== "playing" || !target) return;
  const p = [...target.p];
  // Building on a door opens or closes it instead.
  if (place && isDoor(blocks.get(key(...p)))) {
    const changed = toggleDoor(blocks, ...p);
    if (collides(blocks, player)) {
      toggleDoor(blocks, ...p);
      return;
    }
    for (const k of changed) edits.set(k, blocks.get(k));
    beep(true);
    rebuild();
    pick();
    scheduleSave();
    return;
  }
  if (place) {
    p[0] += Math.round(target.normal.x);
    p[1] += Math.round(target.normal.y);
    p[2] += Math.round(target.normal.z);
  }
  if (Math.abs(p[0]) > SIZE || Math.abs(p[2]) > SIZE || p[1] < 1 || p[1] > 30)
    return;
  const k = key(...p);
  if (place) {
    if (blocks.has(k)) return;
    blocks.set(k, selected);
    if (collides(blocks, player)) {
      blocks.delete(k);
      return;
    }
    edits.set(k, selected);
    // Doors are two blocks tall when there is room above.
    const above = key(p[0], p[1] + 1, p[2]);
    if (selected === DOOR && p[1] < 30 && !blocks.has(above)) {
      blocks.set(above, DOOR);
      if (collides(blocks, player)) blocks.delete(above);
      else edits.set(above, DOOR);
    }
  } else {
    const type = blocks.get(k);
    burst(p, type);
    // Breaking a door removes the whole door.
    const removed = [p[1]];
    if (isDoor(type)) {
      for (let y = p[1] + 1; isDoor(blocks.get(key(p[0], y, p[2]))); y++)
        removed.push(y);
      for (
        let y = p[1] - 1;
        y >= 1 && isDoor(blocks.get(key(p[0], y, p[2])));
        y--
      )
        removed.push(y);
    }
    for (const y of removed) {
      blocks.delete(key(p[0], y, p[2]));
      edits.set(key(p[0], y, p[2]), null);
    }
  }
  beep(place);
  rebuild();
  pick();
  scheduleSave();
  render();
}
const canvas = $("#world");
canvas.oncontextmenu = (e) => e.preventDefault();
canvas.onpointerdown = (e) => {
  if (mode !== "playing" || pointerDown) return;
  pointerKind = e.pointerType;
  pointer.set(
    (e.clientX / innerWidth) * 2 - 1,
    (-e.clientY / innerHeight) * 2 + 1,
  );
  pointerDown = {
    id: e.pointerId,
    x: e.clientX,
    y: e.clientY,
    moved: false,
    button: e.button,
  };
  canvas.setPointerCapture(e.pointerId);
};
canvas.onpointermove = (e) => {
  if (pointerDown && e.pointerId !== pointerDown.id) return;
  pointer.set(
    (e.clientX / innerWidth) * 2 - 1,
    (-e.clientY / innerHeight) * 2 + 1,
  );
  if (pointerDown) {
    const dx = e.clientX - pointerDown.x,
      dy = e.clientY - pointerDown.y;
    if (Math.abs(dx) + Math.abs(dy) > 2) pointerDown.moved = true;
    yaw -= dx * 0.006;
    pitch = Math.max(-0.25, Math.min(1.15, pitch + dy * 0.005));
    pointerDown.x = e.clientX;
    pointerDown.y = e.clientY;
  }
};
canvas.onpointerup = (e) => {
  if (!pointerDown || e.pointerId !== pointerDown.id) return;
  pointer.set(
    (e.clientX / innerWidth) * 2 - 1,
    (-e.clientY / innerHeight) * 2 + 1,
  );
  if (pointerDown && !pointerDown.moved) {
    pick();
    if (e.pointerType !== "touch") edit(pointerDown.button === 2 || e.shiftKey);
  }
  pointerDown = null;
};
canvas.onpointercancel = (e) => {
  if (pointerDown?.id === e.pointerId) pointerDown = null;
};
window.addEventListener("keydown", (e) => {
  if (["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName))
    return;
  if (mode === "playing") {
    if (
      ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
        e.code,
      )
    )
      e.preventDefault();
    keys.add(e.code);
    if (/^[0-9]$/.test(e.key)) {
      selected = e.key === "0" ? 9 : +e.key - 1;
      render();
    }
    if (e.code === "KeyV" && !e.repeat) togglePerspective();
  }
  if (e.code === "Escape" && !e.repeat) {
    if (mode === "playing") action("pause");
    else if (mode === "paused") action("play");
    else if (mode === "help" || mode === "settings") action("back");
  }
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", () => {
  keys.clear();
  touchInput.clear();
  pointerDown = null;
  if (mode === "playing") action("pause");
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && mode === "playing") action("pause");
  pauseAudio(document.hidden);
});
// Browsers only allow sound after the player touches or presses something.
const startMusic = () => {
  if (settings.music && !music.enabled) music.start();
};
window.addEventListener("pointerdown", startMusic);
window.addEventListener("keydown", startMusic);
window.addEventListener("pagehide", save);
window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
let last = performance.now(),
  elapsed = 0;
const desired = new THREE.Vector3(),
  look = new THREE.Vector3();
function frame(now) {
  const dt = Math.max(0, Math.min((now - last) / 1000, 0.04));
  last = now;
  elapsed += dt;
  if (mode === "playing") scenery = "game";
  if (mode === "menu" || mode === "splash") scenery = "menu";
  if (mode === "playing" && settings.cycle === "cycle")
    timeOfDay = (timeOfDay + dt / DAY_LENGTH) % 1;
  if (mode === "playing") {
    biel.scale.setScalar(1);
    let dx =
        Number(pressed("KeyD") || pressed("ArrowRight")) -
        Number(pressed("KeyA") || pressed("ArrowLeft")),
      dz =
        Number(pressed("KeyW") || pressed("ArrowUp")) -
        Number(pressed("KeyS") || pressed("ArrowDown"));
    const len = Math.hypot(dx, dz) || 1,
      speed =
        (pressed("ShiftLeft") || pressed("ShiftRight") ? 6 : 3.8) *
        (player.y + 0.9 < WATER_LEVEL ? 0.6 : 1);
    dx /= len;
    dz /= len;
    const vx = (Math.cos(yaw) * dx - Math.sin(yaw) * dz) * speed * dt,
      vz = (-Math.sin(yaw) * dx - Math.cos(yaw) * dz) * speed * dt;
    for (const [axis, amount] of [
      ["x", vx],
      ["z", vz],
    ]) {
      player[axis] += amount;
      if (collides(blocks, player)) player[axis] -= amount;
      player[axis] = Math.max(-SIZE + 0.3, Math.min(SIZE - 0.3, player[axis]));
    }
    // Swimming: when Biel's chest is under water, sink slowly and Space paddles up.
    const swimming = player.y + 0.9 < WATER_LEVEL;
    if (swimming) {
      velocity = pressed("Space")
        ? Math.min(velocity + 30 * dt, 3)
        : Math.max(velocity - 6 * dt, -1.5);
    } else {
      if (pressed("Space") && grounded) {
        velocity = 7;
        grounded = false;
      }
      velocity -= 19 * dt;
    }
    const steps = Math.ceil(Math.abs(velocity * dt) / 0.15) || 1;
    grounded = false;
    for (let i = 0; i < steps; i++) {
      const delta = (velocity * dt) / steps;
      player.y += delta;
      if (collides(blocks, player)) {
        player.y -= delta;
        if (velocity < 0) grounded = true;
        velocity = 0;
        break;
      }
    }
    if (player.y < -5) spawn();
    biel.position.copy(player);
    biel.visible = !firstPerson;
    if (dx || dz) biel.rotation.y = Math.atan2(vx, vz);
    const stride =
      dx || dz
        ? Math.sin(elapsed * (speed > 4 ? 14 : 10)) * 0.65
        : Math.sin(elapsed * 2) * 0.035;
    leftLeg.rotation.x = stride;
    rightLeg.rotation.x = -stride;
    leftArm.rotation.x = -stride;
    rightArm.rotation.x = stride;
    head.rotation.z = Math.sin(elapsed * 2) * 0.025;
    look.copy(player).add(new THREE.Vector3(0, 1.5, 0));
    if (firstPerson) {
      camera.position.copy(look);
      camera.lookAt(
        look.x - Math.sin(yaw) * 10,
        look.y - Math.sin(pitch) * 8,
        look.z - Math.cos(yaw) * 10,
      );
    } else {
      desired.set(
        look.x + Math.sin(yaw) * 6.5 * Math.cos(pitch),
        look.y + Math.sin(pitch) * 6.5 + 1,
        look.z + Math.cos(yaw) * 6.5 * Math.cos(pitch),
      );
      const direction = desired.clone().sub(look),
        distance = direction.length();
      ray.set(look, direction.normalize());
      const hit = ray.intersectObjects(meshes, false)[0];
      if (hit && hit.distance < distance)
        desired
          .copy(look)
          .addScaledVector(direction, Math.max(0.3, hit.distance - 0.2));
      camera.position.lerp(desired, 1 - Math.exp(-dt * 12));
      camera.lookAt(look);
    }
    pick();
  } else if (mode === "menu" || mode === "splash") {
    biel.visible = true;
    biel.scale.setScalar(2.1);
    biel.position.set(6, height(6, 5) + 0.51, 5);
    biel.rotation.y = 0.55;
    leftArm.rotation.x = Math.sin(elapsed * 2) * 0.12;
    rightArm.rotation.z = -0.15 + Math.sin(elapsed * 2) * 0.08;
    head.rotation.z = Math.sin(elapsed) * 0.04;
    camera.position.set(12 + Math.sin(elapsed * 0.07) * 1.3, 11, 17);
    camera.lookAt(-3, 4, 0);
    outline.visible = false;
  }
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
    water.position.y = WATER_LEVEL + Math.sin(elapsed * 0.7) * 0.035;
  clouds.rotation.y = elapsed * 0.003;
  // The menu always shows a sunny day; the game follows the clock.
  applySky(
    scenery === "game" && settings.cycle === "cycle" ? timeOfDay : NOON + 0.03,
  );
  const clockEl = app.querySelector(".clock");
  if (clockEl && clockEl.textContent !== clock()) clockEl.textContent = clock();
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    p.v.y -= dt * 8;
    p.m.position.addScaledVector(p.v, dt);
    p.m.rotation.x += dt * 3;
    if (p.life <= 0) {
      scene.remove(p.m);
      particles.splice(i, 1);
    }
  }
  renderer.render(scene, camera);
}
render();
function animate(now) {
  frame(now);
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
setInterval(() => {
  if (performance.now() - last > 100 && !document.hidden)
    frame(performance.now());
}, 50);
// The intro shows for three seconds; a tap, click or key skips it.
function leaveSplash() {
  if (mode !== "splash") return;
  mode = "menu";
  render();
}
setTimeout(leaveSplash, 3000);
app.addEventListener("click", leaveSplash);
window.addEventListener("keydown", leaveSplash);

function applyImportedWorld(json) {
  const data = JSON.parse(json),
    valid = validateSave(data);
  if (!valid || valid.length !== data.edits.length)
    throw Error("Invalid world");
  blocks.clear();
  for (const [k, v] of generate()) blocks.set(k, v);
  edits.clear();
  for (const [x, y, z, v] of valid) {
    const k = key(x, y, z);
    edits.set(k, v);
    if (v === null) blocks.delete(k);
    else blocks.set(k, v);
  }
  rebuild();
  spawn();
  save();
  toast(t("saved"));
}
function resetWorld() {
  blocks.clear();
  for (const [k, v] of generate()) blocks.set(k, v);
  edits.clear();
  rebuild();
  spawn();
  save();
  toast(t("worldReset"));
}
window.importNativeWorld = (json) => {
  try {
    applyImportedWorld(json);
  } catch {
    toast(t("invalid"));
  }
};
if (new URLSearchParams(location.search).has("test"))
  window.runSmokeTests = async () => {
    const checks = [];
    const check = (name, ok) => {
      checks.push({ name, ok: !!ok });
      if (!ok) throw Error(name);
    };
    check("menu loaded", mode === "menu");
    frame(performance.now());
    check("terrain rendered", renderer.info.render.triangles > 1000);
    action("settings");
    $("#language").value = "en";
    $("#language").dispatchEvent(new Event("change"));
    check("English settings", app.textContent.includes("Appearance"));
    $("#appearance").value = "light";
    $("#appearance").dispatchEvent(new Event("change"));
    check("light theme", document.documentElement.dataset.theme === "light");
    $("#language").value = "pt";
    $("#language").dispatchEvent(new Event("change"));
    $("#appearance").value = "dark";
    $("#appearance").dispatchEvent(new Event("change"));
    action("back");
    action("play");
    for (let i = 0; i < 30; i++) frame(last + 16);
    check("spawn above ground", !collides(blocks, player));
    const before = player.clone();
    keys.add("KeyW");
    for (let i = 0; i < 25; i++) frame(last + 16);
    keys.delete("KeyW");
    check("movement", player.distanceTo(before) > 0.3);
    for (let i = 0; i < 80; i++) frame(last + 16);
    const jumpStart = player.y;
    keys.add("Space");
    for (let i = 0; i < 12; i++) frame(last + 16);
    keys.delete("Space");
    check("jump", player.y > jumpStart + 0.2);
    for (let i = 0; i < 65; i++) frame(last + 16);
    const x = 2,
      z = 2,
      y = height(x, z);
    target = { p: [x, y, z], normal: new THREE.Vector3(0, 1, 0) };
    selected = 6;
    edit(true);
    check("place block", blocks.get(key(x, y + 1, z)) === 6);
    target = { p: [x, y + 1, z], normal: new THREE.Vector3(0, 1, 0) };
    edit(false);
    check("break block", !blocks.has(key(x, y + 1, z)));
    check("quest counts standing blocks", placed() === 0);
    // Glass keeps the block behind it visible; doors are two tall and open with Build.
    const gx = -3,
      gz = 3,
      gy = height(gx, gz);
    target = { p: [gx, gy, gz], normal: new THREE.Vector3(0, 1, 0) };
    selected = GLASS;
    edit(true);
    check(
      "glass shows the block below",
      blocks.get(key(gx, gy + 1, gz)) === GLASS &&
        mapping[blocks.get(key(gx, gy, gz))].some(
          ([a, b, c]) => a === gx && b === gy && c === gz,
        ),
    );
    target = {
      p: [gx + 1, height(gx + 1, gz), gz],
      normal: new THREE.Vector3(0, 1, 0),
    };
    selected = DOOR;
    edit(true);
    const doorY = height(gx + 1, gz) + 1;
    check(
      "door is two blocks tall",
      blocks.get(key(gx + 1, doorY, gz)) === DOOR &&
        blocks.get(key(gx + 1, doorY + 1, gz)) === DOOR,
    );
    target = { p: [gx + 1, doorY + 1, gz], normal: new THREE.Vector3(1, 0, 0) };
    edit(true);
    check(
      "door opens and can be walked through",
      blocks.get(key(gx + 1, doorY, gz)) === DOOR_OPEN &&
        !collides(blocks, { x: gx + 1, y: doorY - 0.49, z: gz }),
    );
    target = { p: [gx + 1, doorY, gz], normal: new THREE.Vector3(0, 1, 0) };
    edit(false);
    check(
      "breaking a door removes all of it",
      !blocks.has(key(gx + 1, doorY + 1, gz)),
    );
    target = { p: [gx, gy + 1, gz], normal: new THREE.Vector3(0, 1, 0) };
    edit(false);
    const night = applySky(0.75);
    check(
      "night sky with glowing amber",
      night.night && scene.background.r < 0.15 && amber.emissiveIntensity > 1,
    );
    check(
      "day sky",
      applySky(NOON).daylight === 1 && amber.emissiveIntensity === 0,
    );
    music.start();
    check("music starts", music.enabled);
    music.stop();
    // Swimming: drop Biel into a dug hole under the water and paddle up.
    let hole = null;
    for (let i = -SIZE + 2; i < SIZE - 2 && !hole; i++)
      for (let j = -SIZE + 2; j < SIZE - 2 && !hole; j++)
        if (height(i, j) === 1) hole = [i, j];
    const holeKey = key(hole[0], 1, hole[1]),
      holeType = blocks.get(holeKey);
    blocks.delete(holeKey);
    player.set(hole[0], 0.51, hole[1]);
    velocity = 0;
    keys.add("Space");
    for (let i = 0; i < 40; i++) frame(last + 16);
    keys.delete("Space");
    check("swim up", player.y > 1);
    blocks.set(holeKey, holeType);
    spawn();
    toast("smoke");
    render();
    check(
      "toast survives HUD render",
      toastEl.isConnected && toastEl.classList.contains("show"),
    );
    togglePerspective();
    check(
      "first person crosshair",
      document.documentElement.classList.contains("first-person"),
    );
    togglePerspective();
    check("save", save());
    check(
      "save round trip",
      validateSave(JSON.parse(localStorage.getItem("biel-world"))).length > 0,
    );
    touchInput.press(101, "KeyW");
    touchInput.press(102, "Space");
    check("multitouch movement and jump", pressed("KeyW") && pressed("Space"));
    render();
    check(
      "held controls survive inventory render",
      pressed("KeyW") && pressed("Space"),
    );
    touchInput.release(102);
    check("independent finger release", pressed("KeyW") && !pressed("Space"));
    action("pause");
    check("touch controls clear on pause", !touchInput.has("KeyW"));
    check("pause menu", mode === "paused");
    action("play");
    check("resume", mode === "playing");
    action("settings");
    action("reset");
    check(
      "reset asks for confirmation",
      edits.size > 0 && app.textContent.includes("outra vez"),
    );
    action("reset");
    check("reset world", edits.size === 0 && placed() === 0);
    action("back");
    action("home");
    frame(last + 16);
    return { ok: true, checks, triangles: renderer.info.render.triangles };
  };
