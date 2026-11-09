import { TouchInput } from "./touch-input.js";
import * as THREE from "three";
import {
  generate,
  height,
  key,
  SIZE,
  collides,
  WATER_LEVEL,
  MAX_Y,
  useTerrain,
  biomeAt,
  findSpawn,
  inWater,
  SNOW,
  ICE,
  CACTUS,
  FLOWER,
  TALL_GRASS,
  MUSHROOM,
  isPlant,
  IRON_ORE,
  GOLD_ORE,
  CRYSTAL_ORE,
  GLOWSTONE,
  CHEST,
  FURNACE,
  STONE_BRICK,
  GLASS,
  DOOR,
  DOOR_OPEN,
  seeThrough,
  toggleDoor,
  passable,
  PLANKS,
  BENCH,
  TORCH,
  BED,
  COAL,
  FARMLAND,
  CROPS,
  cropBlock,
  cropInfo,
  LADDER,
  FENCE,
  GATE,
  GATE_OPEN,
  TRAPDOOR,
  TRAPDOOR_OPEN,
  SIGN,
  POT,
  OPENS,
  WOOL_COLORS,
  woolBlock,
} from "./world.js";
import { isWatered, growCrop } from "./farm.js";
import { readPad, pressedNow, fromStandardGamepad } from "./gamepad.js";
import { plan as syncPlan, deviceKind } from "./sync.js";
import {
  SMELT,
  FUEL,
  tickFurnace,
  validateFurnace,
  emptyFurnace,
  chestLoot,
} from "./smelting.js";
import {
  LOOK,
  nextWeather,
  weatherLength,
  validateWeather,
  approach,
} from "./weather.js";
import { ITEMS, CREATIVE_BLOCKS, breakTime, drops } from "./items.js";
import { Inventory } from "./inventory.js";
import {
  ANIMALS,
  initialAnimals,
  validateAnimals,
  interact,
  findCouples,
  makeBaby,
} from "./creatures.js";
import { MODELS, nameTag, arrow, bird } from "./models.js";
import {
  CHALLENGES,
  createProgress,
  record,
  nextChallenge,
  progressOf,
  goalOf,
} from "./challenges.js";
import { TUTORIAL, advance } from "./tutorial.js";
import {
  normalizeParents,
  gateQuestion,
  allowedDifficulties,
  clampDifficulty,
  reminderDue,
  REMINDERS,
} from "./parents.js";
import {
  MONSTERS,
  allowedMonsters,
  canSpawn,
  spawnSpot,
  strike,
  weaponDamage,
  validateMonsters,
} from "./monsters.js";
import { RECIPES, canCraft, craft } from "./recipes.js";
import {
  createVitals,
  fallDamage,
  hurt,
  tick,
  eat,
  MAX_AIR,
} from "./survival.js";
import { sky, NOON } from "./daynight.js";
import {
  createStore,
  newWorld,
  normalizeOptions,
  validateWorld,
  difficultyRules,
  DAY_LENGTHS,
  DIFFICULTIES,
  MAX_WORLDS,
} from "./worlds.js";
import { Music, audioContext, pauseAudio } from "./music.js";
import "./style.css";
import { strings } from "./strings.js";
const $ = (s) => document.querySelector(s),
  app = $("#app");
let settings = {
  lang: "pt",
  theme: "system",
  sound: true,
  music: true,
  quality: "high",
};
let firstRun = true;
try {
  const stored = JSON.parse(localStorage.getItem("biel-settings") || "{}");
  firstRun = !stored.quality;
  Object.assign(settings, stored);
} catch {}
// First run: phones and smaller machines start on the light quality.
if (firstRun) {
  const phone = Math.min(screen.width, screen.height) < 500;
  settings.quality =
    phone || (navigator.hardwareConcurrency ?? 8) <= 4 ? "low" : "high";
}
settings.cloud = settings.cloud === true;
// Volumes from 0 to 1; older settings with sound or music off start at 0.
const vol = (v, on) =>
  Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : on === false ? 0 : 0.8;
settings.volume = {
  music: vol(settings.volume?.music, settings.music),
  fx: vol(settings.volume?.fx, settings.sound),
  ambient: vol(settings.volume?.ambient, settings.sound),
};
settings.sound = settings.volume.fx > 0;
settings.music = settings.volume.music > 0;
settings.bigText = settings.bigText === true;
settings.minimap = settings.minimap !== false;
if (!strings[settings.lang]) settings.lang = "pt";
settings.parents = normalizeParents(settings.parents);
const itemName = (id) =>
  id ? strings[settings.lang].items[id] : t("emptyHand");
const nested = (group, id) => strings[settings.lang][group][id];
const t = (k, vars = {}) =>
  String(strings[settings.lang][k]).replace(/\{(\w+)\}/g, (_, v) => vars[v]);
const touchInput = new TouchInput();
let mode = "splash",
  started = false,
  selected = 0,
  firstPerson = false,
  confirmDelete = null,
  invPick = null,
  inventory = new Inventory(),
  vitals = createVitals(),
  animals = [],
  targetAnimal = null,
  namingDog = null,
  riding = null,
  progress = null,
  gate = null,
  playSeconds = 0,
  questShown = "",
  monsters = [],
  arrows = [],
  targetMonster = null,
  spawnClock = 2,
  attackCooldown = 0,
  lightBlocks = [],
  cropKeys = [],
  growClock = 5,
  rainLevel = 0,
  container = null,
  signKey = null,
  containerClock = 0,
  menuAnchor = [0, 0],
  homeAnchor = [0, 0],
  lastBiome = null,
  biomeClock = 0,
  darkLevel = 0,
  thunderClock = 8,
  fishing = null,
  peakY = null,
  draft = null,
  flying = false,
  lastJump = 0,
  timeOfDay = NOON,
  scenery = "menu",
  toastTimer,
  saveTimer;
const tips = strings[settings.lang].tips,
  tip = tips[Math.floor(Math.random() * tips.length)];
const music = new Music();
music.volume = settings.volume.music;
// Worlds live in the browser storage of the app; see src/worlds.js.
const storage = {
  getItem: (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem: (k, v) => localStorage.setItem(k, v),
  removeItem: (k) => {
    try {
      localStorage.removeItem(k);
    } catch {}
  },
};
const store = createStore(storage);
try {
  progress = createProgress(JSON.parse(storage.getItem("biel-stickers")));
} catch {
  progress = createProgress();
}
const makeId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
store.migrate(makeId);
let world = store.load(store.current()) ?? null;
const rules = () => difficultyRules[world?.options.difficulty ?? "peaceful"];
const creative = () => world?.mode === "creative";
// The time the sky shows: the clock, or a fixed time for "always day/night".
const skyTime = () =>
  world?.options.cycle === "day"
    ? NOON + 0.03
    : world?.options.cycle === "night"
      ? 0.75
      : timeOfDay;
const isNight = () => sky(skyTime()).night;
const WEATHER_ICON = { clear: "", cloudy: " ☁︎", rain: " 🌧", storm: " ⛈" };
const clock = () =>
  `${isNight() ? `☾︎ ${t("night")}` : `☀︎ ${t("day")}`}${WEATHER_ICON[world?.weather?.state ?? "clear"] ?? ""} · ${t("dayCount", { n: world?.day ?? 1 })}${lastBiome && lastBiome !== "valley" ? ` · ${nested("biomes", lastBiome)}` : ""}`;
const colors = [
  0x789b45, 0x95704c, 0x8e9797, 0xe9cf8b, 0x93633c, 0x447951, 0xbb6346,
  0xefad36, 0xbfe6ec, 0x8a5a33, 0x8a5a33, 0xc08a55, 0xa0703f, 0xf2b544,
  0xc8473c, 0x5b5f60, 0xf1ede4, 0x6b4a2e,
  // Crops: wheat, carrot and potato, four stages each.
  0x7cbf4e, 0x8bc34a, 0xa8c94a, 0xe0b54a, 0x6fbf5a, 0x76c25a, 0x7fc45a,
  0xee8a2b, 0x6aa84f, 0x72ad52, 0x7db257, 0xb48a4c,
  // Snow, ice, cactus, ores, glowstone, plants, chest, furnace, stone bricks.
  0xf4f8fb, 0xa9d8ee, 0x4f9a46, 0x9a8b80, 0xd8b84a, 0x5fb8e8, 0xffd36b,
  0xe85d8a, 0x6fae4e, 0xc8473c, 0x9a6a3c, 0x6b6f70, 0x8a9090,
  // Ladder, fence, gate, open gate, trapdoor, open trapdoor, sign, pot.
  0x9a6a3c, 0x8a5a33, 0x8a5a33, 0x8a5a33, 0x9a6a3c, 0x9a6a3c, 0xc08a55,
  0xb5603c,
  // Wool: red, orange, yellow, green, blue, purple, black.
  0xc8473c, 0xe98d2b, 0xf2c94c, 0x5f9f4a, 0x3f6fc8, 0x8a4fb5, 0x2b2b30,
];
const credits = () =>
  `<div class="credits">Developed by <strong>David Arsénio Martins</strong><div><a href="https://ividi.dev/" target="_blank" rel="noopener">ividi.dev ↗︎</a><span>·</span><a href="https://github.com/VidiPT89/" target="_blank" rel="noopener">GitHub ↗︎</a></div></div>`;
const logo = `<img class="brand-icon" src="logo.webp" alt=""><span>BIEL<span class="brand-accent">TRUCTOR</span></span>`;
function theme() {
  document.documentElement.dataset.theme = settings.theme;
  document.documentElement.classList.toggle("big-text", settings.bigText);
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
function button(action, label, cls = "", arg = "") {
  return `<button data-action="${action}" ${arg ? `data-arg="${arg}"` : ""} ${["view", "pause"].includes(action) ? `aria-label="${t(action)}"` : action === "inventory" ? `aria-label="${t("backpack")}"` : ""} class="${cls}">${label}</button>`;
}
// Blocks show their colour; other items show a picture.
const icon = (id) =>
  ITEMS[id].block !== undefined
    ? `<i class="swatch" style="--block:#${colors[ITEMS[id].block].toString(16).padStart(6, "0")}"></i>`
    : `<span class="item-icon">${ITEMS[id].icon}</span>`;
function slotButton(slot, i, attrs, active, label = "") {
  return `<button ${attrs} aria-label="${itemName(slot?.id)}" class="slot ${active ? "selected" : ""}">${label ? `<small>${label}</small>` : ""}${slot ? icon(slot.id) : ""}${slot && !creative() && slot.count > 1 ? `<b class="count">${slot.count}</b>` : ""}</button>`;
}
const escapeHtml = (text) =>
  String(text).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const modeLabel = (w) =>
  `${w.mode === "creative" ? t("creativeMode") : t("adventure")} · ${t(w.options.difficulty)}`;
// One <select> for a world option. Booleans are stored as "true"/"false".
function field(id, label, value, choices) {
  return `<label>${label}<select id="opt-${id}" data-option="${id}">${choices
    .map(
      ([v, l]) =>
        `<option value="${v}" ${String(value) === String(v) ? "selected" : ""}>${l}</option>`,
    )
    .join("")}</select></label>`;
}
function parentField(id, label, value, choices) {
  return field(id, label, value, choices).replace(
    'data-option="',
    'data-parent="',
  );
}
function worldFields(o, withMode) {
  const yesNo = [
    [true, t("yes")],
    [false, t("no")],
  ];
  return [
    withMode
      ? field("mode", t("gameMode"), draft.mode, [
          ["adventure", t("adventure")],
          ["creative", t("creativeMode")],
        ]) +
        `<p class="field-hint">${draft.mode === "creative" ? t("creativeHint") : t("adventureHint")}</p>` +
        field("size", t("worldSize"), draft.size, [
          ["classic", t("classic")],
          ["small", t("small")],
          ["medium", t("medium")],
          ["large", t("large")],
        ]) +
        `<label>${t("seed")}<input id="world-seed" inputmode="numeric" maxlength="9" value="${escapeHtml(draft.seed)}"></label><p class="field-hint">${t("seedHint")}</p>` +
        (draft.mode === "adventure"
          ? field("tutorial", t("tutorialOption"), draft.tutorial, [
              [true, t("yes")],
              [false, t("no")],
            ])
          : "")
      : "",
    '<div class="options-grid">',
    field(
      "difficulty",
      t("difficulty"),
      o.difficulty,
      allowedDifficulties(settings.parents.maxDifficulty).map((d) => [d, t(d)]),
    ),
    o.difficulty === "peaceful" || settings.parents.noMonsters
      ? ""
      : field("monsters", t("monsters"), o.monsters, yesNo),
    field("animals", t("animals"), o.animals, yesNo),
    field("cycle", t("cycle"), o.cycle, [
      ["normal", t("cycleNormal")],
      ["day", t("alwaysDay")],
      ["night", t("alwaysNight")],
    ]),
    field("dayLength", t("dayLength"), o.dayLength, [
      ["short", t("short")],
      ["normal", t("normalDay")],
      ["long", t("long")],
    ]),
    field("hunger", t("hunger"), o.hunger, yesNo),
    field("weather", t("weather"), o.weather, yesNo),
    field("keepInventory", t("keepInventory"), o.keepInventory, yesNo),
    "</div>",
  ].join("");
}
function render() {
  app.className = mode;
  if (mode !== "playing") touchInput.clear();
  let content = "";
  if (mode === "splash")
    content = `<div class="splash-inner"><img class="splash-logo" src="logo.webp" alt="Bieltructor"><p>${t("loading")}<span class="dots">…</span></p><p class="tip">${tip}</p></div>${credits()}`;
  if (mode === "menu")
    content = `<header><div class="brand">${logo}</div><span class="edition">${t("edition")}</span>${button("settings", "⚙︎ <span>" + t("settings") + "</span>", "quiet")}</header><main class="intro"><div class="eyebrow"><i></i>${t("tag")}</div><h1>${t("title")}</h1><p>${t("intro")}</p><div class="menu-actions">${button("play", `${world ? t("resume") : t("start")} <span>↗︎</span>`, "primary")}${button("worlds", t("worlds"), "secondary")}${button("stickers", "📒 " + t("stickers"), "secondary")}${button("help", t("help"), "secondary")}</div><div class="world-info"><span class="world-icon">▧</span><div><strong>${world ? escapeHtml(world.name) : t("newWorld")}</strong><small>${world ? modeLabel(world) : t("noWorlds")} · ${t("storage")}</small></div></div></main><div class="biel-label"><span>BIEL</span><small>${t("ready")}</small></div><footer>${credits()}<span class="version">v2.0 · ${t("made")}</span></footer>`;
  if (mode === "playing")
    content = `<div class="hud-top"><div class="world-title"><b>${escapeHtml(world.name)}</b><small>${creative() ? t("creative") : t("adventureLabel")} · <span class="clock">${clock()}</span></small></div><div>${button("inventory", "🎒", "icon")}${button("view", "◉", "icon")}${button("pause", "Ⅱ", "icon")}</div></div><div class="quest-slot">${questBox()}</div>${settings.minimap ? `<canvas class="minimap" width="132" height="132" aria-hidden="true"></canvas>` : ""}<div class="crosshair">+</div><div class="hotbar-wrap">${creative() ? "" : `<div class="vitals" aria-live="polite"></div>`}<div class="material-label">${itemName(heldId())}</div><div class="hotbar">${inventory.slots
      .slice(0, 9)
      .map((slot, i) =>
        slotButton(
          slot,
          i,
          `data-slot="${i}" aria-pressed="${i === selected}"`,
          i === selected,
          i + 1,
        ),
      )
      .join(
        "",
      )}</div><div class="hint">${t(creative() ? "hint" : "hintAdventure")}</div></div><div class="touch-controls"><div class="dpad"><button data-key="KeyW" aria-label="${t("forward")}">↑</button><button data-key="KeyA" aria-label="${t("left")}">←</button><button data-key="KeyS" aria-label="${t("backward")}">↓</button><button data-key="KeyD" aria-label="${t("right")}">→</button></div><div class="touch-actions"><button data-key="ShiftLeft">${t("run")}</button><button data-key="Break">${t("break")}</button>${button("place", t("place"))}${creative() ? "" : button("attack", t("attack"), "attack-btn hidden")}<button data-key="Space">${t("jump")}</button>${flying || riding ? `<button data-key="KeyC">${t("descend")}</button>` : ""}</div></div>`;
  if (mode === "conflict" && conflicts[0]) {
    const c = conflicts[0],
      when = (d) =>
        new Date(d).toLocaleString(settings.lang === "pt" ? "pt-PT" : "en-GB", {
          dateStyle: "short",
          timeStyle: "short",
        });
    content = `<div class="modal-backdrop"><section class="panel" role="dialog" aria-modal="true" aria-label="${t("conflictTitle")}"><span class="eyebrow">☁︎ iCloud</span><h2>${t("conflictTitle")}</h2><p class="help-copy">${t("conflictText", { name: escapeHtml(c.local.name), here: thisDevice, hereDate: when(c.local.updatedAt), there: escapeHtml(c.remote.device || "?"), thereDate: when(c.remote.updatedAt) })}</p>${button("keephere", t("keepHere", { device: thisDevice }), "primary wide")}${button("keepthere", t("keepThere", { device: escapeHtml(c.remote.device || "?") }), "wide")}</section></div>`;
  }
  if (mode === "rest")
    content = `<div class="modal-backdrop"><section class="panel" role="dialog" aria-modal="true" aria-label="${t("restTitle")}"><span class="eyebrow">👪 ${t("parents")}</span><h2>${t("restTitle")}</h2><p class="help-copy">${t("restText", { n: settings.parents.reminder })}</p>${button("restdone", t("continue"), "primary wide")}</section></div>`;
  if (mode === "signtext")
    content = `<div class="modal-backdrop"><section class="panel" role="dialog" aria-modal="true" aria-label="${t("signTitle")}"><span class="eyebrow">🪧</span><h2>${t("signTitle")}</h2><label><input id="sign-text" maxlength="30" value="${escapeHtml(world.signs[signKey] ?? "")}"></label>${button("signdone", t("done"), "primary wide")}</section></div>`;
  if (mode === "namedog")
    content = `<div class="modal-backdrop"><section class="panel" role="dialog" aria-modal="true" aria-label="${t("nameDog", { animal: nested("animalNouns", namingDog.type) })}"><span class="eyebrow">💛</span><h2>${t("nameDog", { animal: nested("animalNouns", namingDog.type) })}</h2><label><input id="dog-name" maxlength="20" value="${escapeHtml(nested("petDefaults", namingDog.type))}"></label>${button("namedone", t("done"), "primary wide")}</section></div>`;
  if (mode === "asleep")
    content = `<div class="modal-backdrop asleep"><section class="panel" role="dialog" aria-modal="true" aria-label="${t("asleep")}"><span class="eyebrow">☾︎ ${t("dayCount", { n: world.day })}</span><h2>${t("asleep")}</h2><p class="help-copy">${t("asleepText")}</p>${button("wake", t("wake"), "primary wide")}</section></div>`;
  if (MODALS.includes(mode)) {
    let inner = "";
    if (mode === "worlds") {
      const list = store.list();
      inner = `<span class="eyebrow">BIELTRUCTOR</span><h2>${t("worlds")}</h2><div class="world-list">${
        list.length
          ? list
              .map(
                (w) =>
                  `<div class="world-card ${w.id === world?.id ? "current" : ""}"><div><strong>${escapeHtml(w.name)}</strong><small>${w.mode === "creative" ? t("creativeMode") : t("adventure")} · ${t(w.difficulty)} · ${new Date(w.updatedAt).toLocaleDateString(settings.lang === "pt" ? "pt-PT" : "en-GB")}</small></div>${button("openworld", t("play"), "primary", w.id)}${button("deleteworld", confirmDelete === w.id ? t("confirmDelete") : t("deleteWorld"), confirmDelete === w.id ? "danger confirm" : "danger", w.id)}</div>`,
              )
              .join("")
          : `<p class="help-copy">${t("noWorlds")}</p>`
      }</div>${list.length >= MAX_WORLDS ? `<p class="field-hint">${t("worldFull")}</p>` : button("newworld", "+ " + t("newWorld"), "primary wide")}${button("back", t("back"), "quiet wide")}`;
    }
    if (mode === "newworld")
      inner = `<span class="eyebrow">BIELTRUCTOR</span><h2>${t("newWorld")}</h2><label>${t("worldName")}<input id="world-name" maxlength="32" value="${escapeHtml(draft.name)}"></label>${worldFields(draft.options, true)}${button("create", t("create"), "primary wide")}${button("back", t("back"), "quiet wide")}`;
    if (mode === "inventory" && creative())
      inner = `<span class="eyebrow">${t("creativeMode")}</span><h2>${t("allBlocks")}</h2><p class="field-hint">${t("pickBlock", { n: selected + 1 })}</p><div class="inv-grid">${CREATIVE_BLOCKS.map((id) => slotButton({ id, count: 1 }, 0, `data-give="${id}" title="${itemName(id)}"`, heldId() === id)).join("")}</div>${button("back", t("back"), "primary wide")}`;
    else if (mode === "inventory") {
      const bench = nearBench();
      inner = `<span class="eyebrow">${t("adventure")}</span><h2>${t("backpack")}</h2><p class="field-hint">${t("swapHint")}</p><div class="inv-grid">${inventory.slots.map((slot, i) => slotButton(slot, i, `data-inv="${i}" title="${itemName(slot?.id)}"`, invPick === i, i < 9 ? i + 1 : "")).join("")}</div><h3>${t("recipes")}</h3><p class="field-hint">${bench ? t("benchNear") : t("benchFar")}</p><div class="recipes">${RECIPES.map(
        (r) => {
          const ok = canCraft(inventory, r, bench);
          return `<div class="recipe ${ok ? "ok" : ""}">${icon(r.out[0])}<div><strong>${itemName(r.out[0])}${r.out[1] > 1 ? ` ×${r.out[1]}` : ""}</strong><span class="needs">${Object.entries(
            r.needs,
          )
            .map(
              ([id, n]) =>
                `<em class="${inventory.count(id) >= n ? "have" : ""}">${n} ${itemName(id)}</em>`,
            )
            .join(
              "",
            )}</span>${r.bench ? `<small class="${bench ? "have" : ""}">🔨 ${t("needsBench")}</small>` : ""}</div><button data-action="craft" data-arg="${r.id}" class="${ok ? "primary" : ""}" ${ok ? "" : "disabled"}>${t("craftIt")}</button></div>`;
        },
      ).join("")}</div>${button("back", t("back"), "primary wide")}`;
    }
    if (mode === "chest") {
      const chest = chestAt(container.key);
      inner = `<span class="eyebrow">📦</span><h2>${itemName("chest")}</h2><p class="field-hint">${t("chestHint")}</p><div class="inv-grid">${chest.slots.map((slot, i) => slotButton(slot, i, `data-move="chest" data-index="${i}" title="${itemName(slot?.id)}"`, false)).join("")}</div><h3>${t("backpack")}</h3><div class="inv-grid">${inventory.slots.map((slot, i) => slotButton(slot, i, `data-move="bag" data-index="${i}" title="${itemName(slot?.id)}"`, false, i < 9 ? i + 1 : "")).join("")}</div>${button("back", t("back"), "primary wide")}`;
    }
    if (mode === "furnace") {
      const f = validateFurnace(world.furnaces[container.key]);
      const cell = (slot, label, cls = "") =>
        `<div class="furnace-cell ${cls}"><small>${label}</small>${slotButton(f[slot] ? { id: f[slot][0], count: f[slot][1] } : null, 0, `data-move="${slot}" data-index="0"`, false)}</div>`;
      inner = `<span class="eyebrow">🔥</span><h2>${itemName("furnace")}</h2><p class="field-hint">${t("furnaceHint")}</p><div class="furnace">${cell("input", t("toCook"))}${cell("fuel", t("fuelSlot"), f.burn > 0 ? "burning" : "")}<div class="furnace-progress"><i style="width:${Math.round(f.progress * 100)}%"></i></div>${cell("output", t("readySlot"))}</div><h3>${t("backpack")}</h3><div class="inv-grid">${inventory.slots.map((slot, i) => slotButton(slot, i, `data-move="bag" data-index="${i}" title="${itemName(slot?.id)}"`, false, i < 9 ? i + 1 : "")).join("")}</div>${button("back", t("back"), "primary wide")}`;
    }
    if (mode === "map")
      inner = `<span class="eyebrow">🗺️ ${escapeHtml(world.name)}</span><h2>${t("map")}</h2><canvas class="big-map" width="520" height="520"></canvas><p class="field-hint">${t("mapLegend")}</p>${button("back", t("back"), "primary wide")}`;
    if (mode === "stickers") {
      const n = Object.keys(progress.done).length;
      inner = `<span class="eyebrow">${t("stickerCount", { n })}</span><h2>${t("stickerBook")}</h2><div class="sticker-grid">${CHALLENGES.map(
        (c) => {
          const [title, text] = nested("challenges", c.id),
            done = progress.done[c.id];
          return `<div class="sticker ${done ? "done" : ""}"><span class="sticker-face">${done ? c.sticker : "?"}</span><strong>${title}</strong><small>${text}</small>${done ? "" : `<em>${progressOf(progress, c)}/${goalOf(c)}</em>`}</div>`;
        },
      ).join("")}</div>${button("back", t("back"), "primary wide")}`;
    }
    if (mode === "parentsgate")
      inner = `<span class="eyebrow">👪 ${t("parents")}</span><h2>${t("parents")}</h2><label>${t("parentsQuestion", { a: gate.a, b: gate.b })}<input id="parents-answer" inputmode="numeric" autocomplete="off"></label>${button("parentscheck", t("enter"), "primary wide")}${button("back", t("back"), "quiet wide")}`;
    if (mode === "parents") {
      const pr = settings.parents;
      inner = `<span class="eyebrow">👪 ${t("parents")}</span><h2>${t("parents")}</h2>${parentField(
        "reminder",
        t("reminder"),
        pr.reminder,
        REMINDERS.map((m) => [
          m,
          m ? t("minutes", { n: m }) : t("reminderOff"),
        ]),
      )}${parentField(
        "maxDifficulty",
        t("maxDifficulty"),
        pr.maxDifficulty,
        DIFFICULTIES.map((d) => [d, t(d)]),
      )}${parentField("noMonsters", t("noMonstersOption"), pr.noMonsters, [
        [true, t("yes")],
        [false, t("no")],
      ])}<p class="field-hint">${t("parentsNote")}</p>${button("back", t("back"), "primary wide")}`;
    }
    if (mode === "worldsettings")
      inner = `<span class="eyebrow">${modeLabel(world)}</span><h2>${t("worldSettings")}</h2><label>${t("worldName")}<input id="world-name" maxlength="32" value="${escapeHtml(world.name)}"></label>${worldFields(world.options, false)}<p class="field-hint">${t("fixedOptions")}</p>${button("back", t("back"), "primary wide")}`;
    if (mode === "paused")
      inner = `<span class="eyebrow">BIELTRUCTOR</span><h2>${t("pause")}</h2>${button("play", t("continue"), "primary wide")}${button("map", "🗺️ " + t("map"), "wide")}${button("worldsettings", t("worldSettings"), "wide")}${button("stickers", "📒 " + t("stickers"), "wide")}${button("settings", t("settings"), "wide")}${button("help", t("help"), "wide")}${button("spawn", t("reset"), "wide")}${button("home", t("home"), "quiet wide")}`;
    if (mode === "help")
      inner = `<span class="eyebrow">BIELTRUCTOR</span><h2>${t("help")}</h2><p class="help-copy">${t("helpText")}</p><p class="touch-help">${t("mobile")}</p><div class="key-demo"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><kbd>${t("space")}</kbd></div>${world && !creative() ? button("starttutorial", "🎓 " + t("startTutorial"), "wide") : ""}${button("back", t("back"), "primary wide")}`;
    if (mode === "settings")
      inner = `<h2>${t("settings")}</h2><label>${t("language")}<select id="language"><option value="pt" ${settings.lang === "pt" ? "selected" : ""}>Português (Portugal)</option><option value="en" ${settings.lang === "en" ? "selected" : ""}>English</option></select></label><label>${t("appearance")}<select id="appearance">${["dark", "light", "system"].map((v) => `<option value="${v}" ${settings.theme === v ? "selected" : ""}>${t(v)}</option>`).join("")}</select></label>${["music", "fx", "ambient"].map((k) => `<label>${t({ music: "music", fx: "sound", ambient: "ambient" }[k])} <b class="volume-value">${Math.round(settings.volume[k] * 100)}%</b><input type="range" min="0" max="100" step="5" data-volume="${k}" value="${Math.round(settings.volume[k] * 100)}"></label>`).join("")}<label>${t("minimap")}<select id="minimap"><option value="on" ${settings.minimap ? "selected" : ""}>${t("on")}</option><option value="off" ${!settings.minimap ? "selected" : ""}>${t("off")}</option></select></label><label>${t("bigText")}<select id="bigtext"><option value="on" ${settings.bigText ? "selected" : ""}>${t("on")}</option><option value="off" ${!settings.bigText ? "selected" : ""}>${t("off")}</option></select></label><label>${t("quality")}<select id="quality">${["high", "low"].map((v) => `<option value="${v}" ${settings.quality === v ? "selected" : ""}>${t(v)}</option>`).join("")}</select></label><div class="file-actions">${world ? button("export", t("export")) : ""}${button("import", t("import"))}</div>${cloudBridge ? `<label>${t("icloud")}<select id="cloud"><option value="on" ${settings.cloud ? "selected" : ""}>${t("on")}</option><option value="off" ${!settings.cloud ? "selected" : ""}>${t("off")}</option></select></label><p class="field-hint">${!settings.cloud ? t("icloudOff") : cloudStatus === "missing" ? t("icloudMissing") : cloudStatus ? t("icloudSynced", { time: cloudStatus }) : t("icloudOn")}</p>` : ""}${button("parentsgate", "👪 " + t("parents"), "wide")}<small>${t("storage")}</small>${button("back", t("back"), "primary wide")}`;
    content = `<div class="modal-backdrop"><section class="panel ${["newworld", "worldsettings", "inventory", "stickers", "chest", "furnace"].includes(mode) ? "wide-panel" : ""}" role="dialog" aria-modal="true" aria-label="${t({ paused: "pause", newworld: "newWorld", worldsettings: "worldSettings", inventory: "backpack", stickers: "stickerBook", parentsgate: "parents" }[mode] ?? mode)}">${inner}</section></div>`;
  }
  app.innerHTML = content;
  app
    .querySelectorAll("[data-action]")
    .forEach(
      (b) => (b.onclick = () => action(b.dataset.action, b.dataset.arg)),
    );
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
      ["quality", "quality"],
      ["cloud", "cloud"],
      ["bigtext", "bigText"],
      ["minimap", "minimap"],
    ])
      $("#" + id).onchange = (e) => {
        settings[prop] =
          prop === "cloud" || prop === "bigText" || prop === "minimap"
            ? e.target.value === "on"
            : e.target.value;
        if (prop === "cloud" && settings.cloud) syncNow();
        theme();
        applyQuality();
        render();
      };
  }
  app
    .querySelectorAll("[data-move]")
    .forEach(
      (b) =>
        (b.onclick = () => moveStack(b.dataset.move, Number(b.dataset.index))),
    );
  // Backpack: tap one slot, then another, to swap them.
  app.querySelectorAll("[data-inv]").forEach(
    (b) =>
      (b.onclick = () => {
        const i = +b.dataset.inv;
        if (invPick === null) invPick = i;
        else {
          if (invPick !== i) inventory.swap(invPick, i);
          invPick = null;
        }
        render();
      }),
  );
  app.querySelectorAll("[data-give]").forEach(
    (b) =>
      (b.onclick = () => {
        inventory.slots[selected] = { id: b.dataset.give, count: 1 };
        action("back");
      }),
  );
  app.querySelectorAll("[data-volume]").forEach(
    (el) =>
      (el.oninput = () => {
        settings.volume[el.dataset.volume] = Number(el.value) / 100;
        settings.sound = settings.volume.fx > 0;
        settings.music = settings.volume.music > 0;
        el.previousElementSibling.textContent = `${el.value}%`;
        music.setVolume(settings.volume.music);
        if (settings.music && !music.enabled) music.start();
        if (!settings.music && music.enabled) music.stop();
        theme();
      }),
  );
  app.querySelectorAll("[data-parent]").forEach(
    (el) =>
      (el.onchange = () => {
        const raw =
          el.value === "true" ? true : el.value === "false" ? false : el.value;
        settings.parents = normalizeParents({
          ...settings.parents,
          [el.dataset.parent]:
            el.dataset.parent === "reminder" ? Number(raw) : raw,
        });
        theme();
        if (world) applyParentLimits();
        render();
      }),
  );
  // World options: the new-world draft, or the live world from the pause menu.
  app.querySelectorAll("[data-option]").forEach(
    (el) =>
      (el.onchange = () => {
        const target = mode === "newworld" ? draft : world;
        const raw =
          el.value === "true" ? true : el.value === "false" ? false : el.value;
        if (el.dataset.option === "mode") draft.mode = raw;
        else if (el.dataset.option === "tutorial") draft.tutorial = raw;
        else if (el.dataset.option === "size") draft.size = raw;
        else if (el.dataset.option === "difficulty")
          // A new difficulty brings its own sensible defaults.
          target.options = normalizeOptions({
            ...target.options,
            difficulty: raw,
            monsters: raw !== "peaceful",
            hunger: undefined,
            keepInventory: undefined,
          });
        else
          target.options = normalizeOptions({
            ...target.options,
            [el.dataset.option]: raw,
          });
        if (mode === "worldsettings") save();
        render();
      }),
  );
  const seedInput = $("#world-seed");
  if (seedInput)
    seedInput.oninput = () => (draft.seed = seedInput.value.replace(/\D/g, ""));
  const nameInput = $("#world-name");
  if (nameInput)
    nameInput.oninput = () => {
      if (mode === "newworld") draft.name = nameInput.value;
      else {
        world.name = nameInput.value.trim().slice(0, 32) || world.name;
        scheduleSave();
      }
    };
  if (MODALS.includes(mode))
    app
      .querySelector(
        ["inventory", "chest", "furnace"].includes(mode)
          ? '[data-action="back"]'
          : "button,select",
      )
      ?.focus({ preventScroll: true });
}
// A new world suggests Adventure on Easy (within the parents' limit), with the tutorial.
function newDraft() {
  return {
    name: t("defaultName"),
    mode: "adventure",
    tutorial: true,
    size: "medium",
    seed: "",
    options: normalizeOptions({
      difficulty: clampDifficulty("easy", settings.parents.maxDifficulty),
    }),
  };
}
function applyParentLimits() {
  const capped = clampDifficulty(
    world.options.difficulty,
    settings.parents.maxDifficulty,
  );
  if (capped !== world.options.difficulty)
    world.options = normalizeOptions({
      ...world.options,
      difficulty: capped,
      monsters: capped !== "peaceful" && world.options.monsters,
    });
}
// Only events that some sticker cares about are kept in the progress.
const STICKER_EVENTS = new Set(
  CHALLENGES.flatMap((c) => [c.event, ...(c.all ?? []), c.distinct]).filter(
    Boolean,
  ),
);
function saveProgress() {
  try {
    storage.setItem("biel-stickers", JSON.stringify(progress));
  } catch {}
}
function emit(event, amount = 1) {
  if (STICKER_EVENTS.has(event) || STICKER_EVENTS.has(event.split(":")[0])) {
    const fresh = record(progress, event, amount);
    saveProgress();
    fresh.forEach((id, i) => setTimeout(() => celebrate(id), i * 1800));
  }
  tutorialEvent(event, amount);
  updateQuestBox();
}
function tutorialEvent(event, amount = 1) {
  if (!world?.tutorial) return;
  const r = advance(world.tutorial, event, amount);
  world.tutorial = r.state;
  if (r.moved) {
    jingle();
    if (r.finished) toast(t("tutorialDone"));
    scheduleSave();
  }
  updateQuestBox();
}
function celebrate(id) {
  const c = CHALLENGES.find((x) => x.id === id);
  toast(
    t("newSticker", { sticker: c.sticker, title: nested("challenges", id)[0] }),
  );
  if (Object.keys(progress.done).length === CHALLENGES.length)
    setTimeout(() => toast(t("allDone")), 3800);
  jingle();
  sparkle([player.x, player.y + 1.6, player.z]);
}
function jingle() {
  if (!settings.sound) return;
  [523, 659, 784].forEach((f, i) => beepAt(f, f * 1.01, i * 0.11));
}
// The card at the top left: the tutorial step, or the next sticker to earn.
function questBox() {
  if (!world) return "";
  const touch =
    document.documentElement.dataset.platform === "ios" ||
    matchMedia("(pointer: coarse)").matches;
  if (world.tutorial) {
    const step = TUTORIAL[world.tutorial.step],
      ratio = Math.min(1, world.tutorial.amount / (step.goal ?? 1));
    return `<div class="quest tutorial"><span>🎓</span><div><b>${t("tutorial")} ${world.tutorial.step + 1}/${TUTORIAL.length}</b><p>${nested("tutorialSteps", step.id)[touch ? 1 : 0]}</p><div class="progress"><i style="width:${Math.round(ratio * 100)}%"></i></div></div>${button("skiptutorial", t("skip"), "quiet skip")}</div>`;
  }
  const c = nextChallenge(progress);
  if (!c)
    return `<div class="quest"><span>🏆</span><div><b>${t("stickerBook")}</b><p>${t("allDone")}</p></div></div>`;
  const [title, text] = nested("challenges", c.id),
    have = progressOf(progress, c),
    goal = goalOf(c);
  return `<div class="quest"><span>${c.sticker}</span><div><small class="quest-kicker">${t("nextGoal")}</small><b>${title}</b><p>${text}</p><div class="progress"><i style="width:${Math.round((have / goal) * 100)}%"></i></div></div><small>${have}/${goal}</small></div>`;
}
function updateQuestBox() {
  const slot = app.querySelector(".quest-slot");
  if (!slot) return;
  const html = questBox();
  if (html === questShown) return;
  questShown = html;
  slot.innerHTML = html;
  slot
    .querySelectorAll("[data-action]")
    .forEach(
      (b) => (b.onclick = () => action(b.dataset.action, b.dataset.arg)),
    );
}
// iCloud sync (native apps only). Each world is a file in iCloud Drive.
const cloudBridge = window.webkit?.messageHandlers?.cloud;
const thisDevice = deviceKind(
  navigator.platform,
  navigator.maxTouchPoints > 0,
  Math.min(screen.width, screen.height) < 500 ? 390 : 1024,
);
let cloudSeq = 0,
  cloudStatus = "",
  conflicts = [],
  cloudTimer;
const cloudWaiting = new Map();
window.cloudReply = (req, value) => {
  cloudWaiting.get(req)?.(value);
  cloudWaiting.delete(req);
};
// Asks the native app; resolves with null if there is no answer.
let cloudCall = (action, extra = {}) =>
  new Promise((resolve) => {
    if (!cloudBridge) return resolve(null);
    const req = ++cloudSeq;
    cloudWaiting.set(req, resolve);
    cloudBridge.postMessage({ req, action, ...extra });
    setTimeout(() => {
      if (cloudWaiting.delete(req)) resolve(null);
    }, 8000);
  });
const syncedMarks = () => {
  try {
    return JSON.parse(storage.getItem("biel-synced") || "{}");
  } catch {
    return {};
  }
};
const markSynced = (id, updatedAt) => {
  const marks = syncedMarks();
  marks[id] = updatedAt;
  try {
    storage.setItem("biel-synced", JSON.stringify(marks));
  } catch {}
};
function scheduleCloudUpload() {
  if (!settings.cloud || !cloudBridge || !world) return;
  clearTimeout(cloudTimer);
  // Automatic saves use the same conflict checks as manual synchronization.
  cloudTimer = setTimeout(() => {
    syncNow();
  }, 4000);
}
let syncInFlight = null;
function syncNow() {
  if (!settings.cloud) return Promise.resolve();
  if (syncInFlight) return syncInFlight;
  syncInFlight = performSync()
    .catch(() => {
      cloudStatus = "missing";
    })
    .finally(() => {
      syncInFlight = null;
    });
  return syncInFlight;
}

async function performSync() {
  if (!settings.cloud) return;
  const status = await cloudCall("status");
  if (!status?.available) {
    cloudStatus = "missing";
    if (mode === "settings") render();
    return;
  }
  // Never interpret a failed or incomplete cloud listing as an empty cloud.
  const listing = await cloudCall("list");
  if (!Array.isArray(listing) || !settings.cloud) return;
  // Keep the live game untouched; pausing saves and schedules another attempt.
  if (mode === "playing") return;
  const remotes = listing
    .map((text) => {
      try {
        const raw = JSON.parse(text);
        const w = validateWorld(raw, { id: raw.id });
        return w && { ...w, device: raw.device ?? "" };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  const locals = store
    .list()
    .map((w) => store.load(w.id))
    .filter(Boolean);
  const marks = syncedMarks();
  conflicts = [];
  for (const step of syncPlan(locals, remotes, marks)) {
    if (step.action === "upload") {
      const res = await cloudCall("save", {
        worldId: step.id,
        json: JSON.stringify(step.local),
      });
      if (res?.ok) markSynced(step.id, step.local.updatedAt);
    } else if (step.action === "download") {
      if (store.list().length >= MAX_WORLDS && !step.local) continue;
      store.save(step.remote);
      markSynced(step.id, step.remote.updatedAt);
      if (world?.id === step.id && mode !== "playing") loadWorld(step.remote);
    } else if (step.action === "conflict") conflicts.push(step);
  }
  cloudStatus = new Date().toLocaleTimeString(
    settings.lang === "pt" ? "pt-PT" : "en-GB",
    { timeStyle: "short" },
  );
  if (conflicts.length && mode !== "playing") mode = "conflict";
  render();
}
// The player chooses which version of a world to keep; nothing is lost silently.
async function resolveConflict(keepHere) {
  const c = conflicts.shift();
  if (keepHere) {
    const res = await cloudCall("save", {
      worldId: c.id,
      json: JSON.stringify(c.local),
    });
    if (res?.ok) markSynced(c.id, c.local.updatedAt);
  } else {
    store.save(c.remote);
    markSynced(c.id, c.remote.updatedAt);
    if (world?.id === c.id) loadWorld(c.remote);
  }
  mode = conflicts.length ? "conflict" : "menu";
  render();
}
const MODALS = [
  "settings",
  "help",
  "paused",
  "worlds",
  "newworld",
  "worldsettings",
  "inventory",
  "chest",
  "furnace",
  "map",
  "stickers",
  "parentsgate",
  "parents",
];
// Screens opened on top of each other; "back" returns to the previous one.
const history = [];
function open(screen) {
  // The backpack returns straight to the game; other screens go via the pause menu.
  history.push(
    mode === "playing" && !["inventory", "chest", "furnace"].includes(screen)
      ? "paused"
      : mode,
  );
  mode = screen;
}
function action(a, arg) {
  if (a !== "deleteworld") confirmDelete = null;
  if (a === "play") {
    if (!world) {
      draft = newDraft();
      open("newworld");
    } else {
      mode = "playing";
      history.length = 0;
      started = true;
      keys.clear();
    }
  } else if (a === "pause") {
    mode = "paused";
    save();
  } else if (a === "signdone") {
    const text = ($("#sign-text")?.value ?? "").trim().slice(0, 30);
    if (text) world.signs[signKey] = text;
    else delete world.signs[signKey];
    refreshSigns();
    mode = "playing";
    scheduleSave();
  } else if (a === "namedone") {
    const name =
      $("#dog-name")?.value.trim().slice(0, 20) ||
      nested("petDefaults", namingDog?.type ?? "dog");
    if (namingDog) {
      namingDog.name = name;
      dressAnimal(namingDog);
      toast(t("follow", { name }));
    }
    namingDog = null;
    mode = "playing";
    scheduleSave();
  } else if (a === "map") {
    open("map");
    render();
    drawMap($(".big-map"), 0, 0, SIZE, true);
    return;
  } else if (a === "stickers") {
    open("stickers");
  } else if (a === "parentsgate") {
    gate = gateQuestion(Math.random, settings.lang);
    open("parentsgate");
  } else if (a === "parentscheck") {
    if (Number($("#parents-answer")?.value) === gate?.answer) mode = "parents";
    else toast(t("wrongAnswer"));
  } else if (a === "keephere" || a === "keepthere") {
    resolveConflict(a === "keephere");
    return;
  } else if (a === "restdone") {
    playSeconds = 0;
    mode = "playing";
  } else if (a === "starttutorial") {
    world.tutorial = { step: 0, amount: 0 };
    mode = "playing";
    history.length = 0;
  } else if (a === "skiptutorial") {
    world.tutorial = null;
    scheduleSave();
  } else if (a === "wake") {
    vitals = createVitals();
    spawn();
    mode = "playing";
  } else if (a === "inventory") {
    invPick = null;
    open("inventory");
    tutorialEvent("open:inventory");
  } else if (a === "craft") {
    const recipe = RECIPES.find((r) => r.id === arg);
    if (recipe && craft(inventory, recipe, nearBench())) {
      toast(t("crafted", { item: itemName(recipe.out[0]) }));
      emit("craft:" + recipe.id);
      beep(true);
      scheduleSave();
    }
  } else if (["settings", "help", "worlds", "worldsettings"].includes(a)) {
    if (a === "worlds" && world) save();
    if (a === "worlds") syncNow();
    open(a);
  } else if (a === "newworld") {
    draft = newDraft();
    open("newworld");
  } else if (a === "create") {
    if (store.list().length >= MAX_WORLDS) {
      toast(t("worldFull"));
      return;
    }
    if (world) save();
    // "Classic" keeps the original valley; other sizes make a new island.
    const classic = draft.size === "classic";
    const created = newWorld({
      id: makeId(),
      ...draft,
      size: classic ? null : draft.size,
      seed: classic
        ? null
        : Number.parseInt(draft.seed, 10) ||
          1 + Math.floor(Math.random() * 999999),
    });
    if (created.mode === "adventure" && draft.tutorial)
      created.tutorial = { step: 0, amount: 0 };
    store.save(created);
    loadWorld(created);
    mode = "playing";
    history.length = 0;
  } else if (a === "openworld") {
    if (world) save();
    const chosen = store.load(arg);
    if (chosen) loadWorld(chosen);
    mode = "playing";
    history.length = 0;
  } else if (a === "deleteworld") {
    if (confirmDelete !== arg) confirmDelete = arg;
    else {
      confirmDelete = null;
      store.remove(arg);
      if (settings.cloud) cloudCall("delete", { worldId: arg });
      if (world?.id === arg) {
        world = null;
        started = false;
      }
      toast(t("worldDeleted"));
    }
  } else if (a === "back") {
    mode = history.pop() ?? "menu";
  } else if (a === "home") {
    mode = "menu";
    history.length = 0;
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
  } else if (a === "place") {
    edit(true);
    return;
  } else if (a === "attack") {
    attack();
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
// Blocks Biel has placed that are still standing (drives the shelter quest).
const placed = () => [...edits.values()].filter((v) => v !== null).length;
// The current world, ready to be stored or exported.
function saveData() {
  world.edits = [...edits].map(([k, v]) => [...k.split(",").map(Number), v]);
  world.player = {
    x: player.x,
    y: player.y,
    z: player.z,
    yaw,
    pitch,
    firstPerson,
    health: Math.max(1, vitals.health),
    food: vitals.food,
  };
  world.time = timeOfDay;
  world.inventory = inventory.toJSON();
  world.device = thisDevice;
  world.creatures = animals.map(
    ({ mesh, timer, walking, bite, ...data }) => data,
  );
  world.monsters = monsters.map(({ type, x, y, z, hp, small }) => ({
    type,
    x,
    y,
    z,
    hp,
    small,
  }));
  world.updatedAt = Date.now();
  return world;
}
function save() {
  if (!world) return true;
  try {
    store.save(saveData());
    scheduleCloudUpload();
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
scene.add(sun.target);
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
let meshes = [];
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
// Small hand-drawn textures for the crafted blocks.
function drawTexture(draw) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 16;
  draw(canvas.getContext("2d"));
  return pixelTexture(canvas);
}
const plankLines = (ctx, base, line) => {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 16, 16);
  ctx.fillStyle = line;
  for (const y of [3, 7, 11, 15]) ctx.fillRect(0, y, 16, 1);
  for (const [x, y] of [
    [5, 0],
    [11, 4],
    [3, 8],
    [9, 12],
  ])
    ctx.fillRect(x, y, 1, 3);
};
// Stone with coloured specks for each ore.
const oreTexture = (speck) => () =>
  drawTexture((ctx) => {
    ctx.fillStyle = "#8e9797";
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = speck;
    for (const [x, y] of [
      [2, 3],
      [9, 2],
      [5, 9],
      [12, 10],
      [3, 13],
      [11, 14],
    ])
      ctx.fillRect(x, y, 2, 2);
  });
const blockTextures = {
  [IRON_ORE]: oreTexture("#d6a77a"),
  [GOLD_ORE]: oreTexture("#f2c94c"),
  [CRYSTAL_ORE]: oreTexture("#5fd0f2"),
  [GLOWSTONE]: () =>
    drawTexture((ctx) => {
      ctx.fillStyle = "#ffd36b";
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = "#fff2b8";
      for (const [x, y] of [
        [1, 1],
        [8, 4],
        [4, 10],
        [12, 12],
        [11, 1],
      ])
        ctx.fillRect(x, y, 3, 3);
    }),
  [CHEST]: () =>
    drawTexture((ctx) => {
      plankLines(ctx, "#9a6a3c", "#6c4325");
      ctx.fillStyle = "#4a3320";
      ctx.fillRect(0, 6, 16, 2);
      ctx.fillStyle = "#f2c14e";
      ctx.fillRect(7, 6, 2, 4);
    }),
  [FURNACE]: () =>
    drawTexture((ctx) => {
      ctx.fillStyle = "#6b6f70";
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = "#2c2f30";
      ctx.fillRect(4, 8, 8, 6);
      ctx.fillStyle = "#ff8a2b";
      ctx.fillRect(5, 11, 6, 2);
    }),
  [STONE_BRICK]: () =>
    drawTexture((ctx) => {
      ctx.fillStyle = "#8a9090";
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = "#6e7474";
      for (const y of [0, 7, 15]) ctx.fillRect(0, y, 16, 1);
      for (const [x, y] of [
        [0, 0],
        [8, 0],
        [4, 8],
        [12, 8],
      ])
        ctx.fillRect(x, y, 1, 7);
    }),
  [SNOW]: () =>
    drawTexture((ctx) => {
      ctx.fillStyle = "#f4f8fb";
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = "#dce9f2";
      for (const [x, y] of [
        [2, 3],
        [9, 2],
        [5, 9],
        [12, 11],
        [3, 13],
      ])
        ctx.fillRect(x, y, 2, 1);
    }),
  [CACTUS]: () =>
    drawTexture((ctx) => {
      ctx.fillStyle = "#4f9a46";
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = "#3d7d36";
      for (const x of [3, 8, 13]) ctx.fillRect(x, 0, 1, 16);
      ctx.fillStyle = "#e9e3c8";
      for (const [x, y] of [
        [1, 4],
        [6, 10],
        [11, 6],
        [14, 13],
      ])
        ctx.fillRect(x, y, 1, 1);
    }),
  [FARMLAND]: () =>
    drawTexture((ctx) => {
      ctx.fillStyle = "#6b4a2e";
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = "#4f3520";
      for (const y of [2, 6, 10, 14]) ctx.fillRect(0, y, 16, 2);
    }),
  [PLANKS]: () => drawTexture((ctx) => plankLines(ctx, "#c08a55", "#9a6a3c")),
  [BENCH]: () =>
    drawTexture((ctx) => {
      plankLines(ctx, "#a0703f", "#7a522c");
      ctx.fillStyle = "#4a4f50";
      ctx.fillRect(2, 2, 5, 2);
      ctx.fillStyle = "#d9d2c3";
      ctx.fillRect(10, 1, 2, 6);
    }),
  [TORCH]: () =>
    drawTexture((ctx) => {
      ctx.fillStyle = "#7a522c";
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = "#ffd25e";
      ctx.fillRect(0, 0, 16, 4);
      ctx.fillStyle = "#ff8a2b";
      ctx.fillRect(4, 1, 8, 2);
    }),
  [BED]: () =>
    drawTexture((ctx) => {
      ctx.fillStyle = "#c8473c";
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = "#f4efe6";
      ctx.fillRect(0, 0, 16, 5);
      ctx.fillStyle = "#a8382f";
      for (const x of [3, 8, 13]) ctx.fillRect(x, 6, 1, 10);
    }),
  [COAL]: () =>
    drawTexture((ctx) => {
      ctx.fillStyle = "#8e9797";
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = "#24282a";
      for (const [x, y] of [
        [2, 3],
        [9, 2],
        [5, 9],
        [12, 10],
        [3, 13],
      ])
        ctx.fillRect(x, y, 3, 2);
    }),
};
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
for (const [type, make] of Object.entries(blockTextures))
  materials[type] = new THREE.MeshStandardMaterial({
    map: make(),
    roughness: 0.95,
  });
// Crops: two crossed see-through panels that grow taller stage by stage.
function cropTexture(crop, stage) {
  return drawTexture((ctx) => {
    const ripe = stage === 3;
    const stalk = ripe && crop === "wheat" ? "#d9a93c" : "#5fae46";
    for (let x = 1; x < 16; x += 3) {
      ctx.fillStyle = stalk;
      ctx.fillRect(x, 4, 1, 12);
      ctx.fillRect(x + 1, 7, 1, 3);
    }
    if (ripe) {
      ctx.fillStyle = {
        wheat: "#f2c75c",
        carrot: "#ee8a2b",
        potato: "#b48a4c",
      }[crop];
      for (let x = 1; x < 16; x += 3)
        ctx.fillRect(
          x - (crop === "wheat" ? 0 : 1),
          crop === "wheat" ? 1 : 13,
          crop === "wheat" ? 2 : 3,
          3,
        );
      if (crop === "potato") {
        ctx.fillStyle = "#f4efe6";
        ctx.fillRect(7, 2, 2, 2);
      }
    }
  });
}
function crossGeometry(height) {
  const parts = [Math.PI / 4, -Math.PI / 4].map((angle) =>
    new THREE.PlaneGeometry(0.9, height)
      .rotateY(angle)
      .translate(0, -0.5 + height / 2, 0),
  );
  const geometry = new THREE.BufferGeometry();
  for (const name of ["position", "normal", "uv"])
    geometry.setAttribute(
      name,
      new THREE.Float32BufferAttribute(
        [
          ...parts[0].attributes[name].array,
          ...parts[1].attributes[name].array,
        ],
        name === "uv" ? 2 : 3,
      ),
    );
  const offset = parts[0].attributes.position.count;
  geometry.setIndex([
    ...parts[0].index.array,
    ...[...parts[1].index.array].map((i) => i + offset),
  ]);
  return geometry;
}
// Little plants of the new worlds: flowers, tall grass and mushrooms.
const plantTextures = {
  [FLOWER]: (ctx) => {
    ctx.fillStyle = "#4f9a46";
    for (const x of [4, 11]) ctx.fillRect(x, 6, 1, 10);
    ctx.fillStyle = "#e85d8a";
    ctx.fillRect(2, 2, 5, 4);
    ctx.fillStyle = "#f6d24a";
    ctx.fillRect(9, 3, 5, 4);
  },
  [TALL_GRASS]: (ctx) => {
    ctx.fillStyle = "#6fae4e";
    for (let x = 1; x < 16; x += 2) ctx.fillRect(x, 4 + ((x * 7) % 6), 1, 12);
  },
  [MUSHROOM]: (ctx) => {
    ctx.fillStyle = "#efe6d6";
    ctx.fillRect(6, 9, 4, 7);
    ctx.fillStyle = "#c8473c";
    ctx.fillRect(3, 5, 10, 5);
    ctx.fillStyle = "#fff4e6";
    for (const x of [5, 9]) ctx.fillRect(x, 6, 2, 2);
  },
};
for (const [type, draw] of Object.entries(plantTextures))
  materials[type] = new THREE.MeshStandardMaterial({
    map: drawTexture(draw),
    alphaTest: 0.5,
    side: THREE.DoubleSide,
    roughness: 1,
  });
materials[ICE] = new THREE.MeshStandardMaterial({
  color: 0xbfe6f5,
  transparent: true,
  opacity: 0.72,
  roughness: 0.1,
});
for (const crop of CROPS)
  for (let stage = 0; stage < 4; stage++)
    materials[cropBlock(crop, stage)] = new THREE.MeshStandardMaterial({
      map: cropTexture(crop, stage),
      alphaTest: 0.5,
      side: THREE.DoubleSide,
      roughness: 1,
    });
// Glowstone and furnaces glow.
for (const type of [GLOWSTONE, FURNACE]) {
  materials[type].emissive.set(type === GLOWSTONE ? 0xffd36b : 0xff8a2b);
  materials[type].emissiveMap = materials[type].map;
  materials[type].emissiveIntensity = type === GLOWSTONE ? 0.9 : 0.25;
}
// Torches always glow a little, and more at night.
const torchMaterial = materials[TORCH];
torchMaterial.emissive.set(0xffb347);
torchMaterial.emissiveMap = torchMaterial.map;
torchMaterial.emissiveIntensity = 0.6;
// Torches are thin sticks and beds are low, so they get their own shapes.
const shapes = {
  [DOOR_OPEN]: new THREE.BoxGeometry(0.14, 1, 1).translate(-0.43, 0, 0),
  [TORCH]: new THREE.BoxGeometry(0.16, 0.66, 0.16).translate(0, -0.17, 0),
  [BED]: new THREE.BoxGeometry(1, 0.56, 1).translate(0, -0.22, 0),
};
for (const crop of CROPS)
  for (let stage = 0; stage < 4; stage++)
    shapes[cropBlock(crop, stage)] = crossGeometry(0.3 + stage * 0.2);
for (const type of [FLOWER, TALL_GRASS, MUSHROOM])
  shapes[type] = crossGeometry(0.7);
// Building shapes made of a few boxes: [width, height, depth, x, y, z].
function boxesGeometry(parts) {
  const geos = parts.map(([w, h, d, x, y, z]) =>
    new THREE.BoxGeometry(w, h, d).translate(x, y, z),
  );
  const geometry = new THREE.BufferGeometry();
  for (const name of ["position", "normal", "uv"])
    geometry.setAttribute(
      name,
      new THREE.Float32BufferAttribute(
        geos.flatMap((g) => [...g.attributes[name].array]),
        name === "uv" ? 2 : 3,
      ),
    );
  let offset = 0;
  const index = [];
  for (const g of geos) {
    index.push(...[...g.index.array].map((i) => i + offset));
    offset += g.attributes.position.count;
  }
  geometry.setIndex(index);
  return geometry;
}
Object.assign(shapes, {
  [LADDER]: boxesGeometry([
    [0.08, 1, 0.08, -0.35, 0, 0],
    [0.08, 1, 0.08, 0.35, 0, 0],
    [0.7, 0.06, 0.06, 0, -0.3, 0],
    [0.7, 0.06, 0.06, 0, 0, 0],
    [0.7, 0.06, 0.06, 0, 0.3, 0],
  ]),
  [FENCE]: boxesGeometry([
    [0.24, 1, 0.24, 0, 0, 0],
    [1, 0.12, 0.1, 0, 0.18, 0],
    [1, 0.12, 0.1, 0, -0.18, 0],
    [0.1, 0.12, 1, 0, 0.18, 0],
    [0.1, 0.12, 1, 0, -0.18, 0],
  ]),
  [GATE]: boxesGeometry([
    [0.12, 0.9, 0.12, -0.45, -0.05, 0],
    [0.12, 0.9, 0.12, 0.45, -0.05, 0],
    [0.8, 0.1, 0.08, 0, 0.22, 0],
    [0.8, 0.1, 0.08, 0, -0.18, 0],
    [0.1, 0.5, 0.08, 0, 0.02, 0],
  ]),
  [GATE_OPEN]: boxesGeometry([
    [0.12, 0.9, 0.12, -0.45, -0.05, 0],
    [0.12, 0.9, 0.12, 0.45, -0.05, 0],
    [0.08, 0.1, 0.8, -0.4, 0.22, 0.4],
    [0.08, 0.1, 0.8, -0.4, -0.18, 0.4],
  ]),
  [TRAPDOOR]: new THREE.BoxGeometry(1, 0.16, 1).translate(0, -0.42, 0),
  [TRAPDOOR_OPEN]: new THREE.BoxGeometry(1, 1, 0.16).translate(0, 0, -0.42),
  [SIGN]: boxesGeometry([
    [0.1, 0.6, 0.1, 0, -0.2, 0],
    [0.8, 0.45, 0.08, 0, 0.18, 0],
  ]),
  [POT]: boxesGeometry([
    [0.4, 0.35, 0.4, 0, -0.32, 0],
    [0.06, 0.3, 0.06, 0, -0.02, 0],
    [0.22, 0.16, 0.22, 0, 0.18, 0],
  ]),
});
// Amber works as a lantern: it glows as night falls.
const amber = materials[7];
amber.emissive.set(0xffa040);
amber.emissiveMap = amber.map;
amber.emissiveIntensity = 0;
// Top block of each column, remembered for the maps until something changes.
const topCache = new Map();
function topInfo(x, z) {
  const k = x + "," + z;
  let info = topCache.get(k);
  if (!info) {
    info = { y: -1, type: undefined };
    for (let y = MAX_Y; y >= 0; y--) {
      const type = blocks.get(key(x, y, z));
      if (
        type !== undefined &&
        !cropInfo(type) &&
        !isPlant(type) &&
        type !== TORCH
      ) {
        info = { y, type };
        break;
      }
    }
    topCache.set(k, info);
  }
  return info;
}
// Draws the island around (cx, cz). Home always shows, pinned to the edge
// when it is far away, so the map is also a compass.
function drawMap(canvas, cx, cz, radius, whole = false) {
  if (!canvas || !world) return;
  const ctx = canvas.getContext("2d"),
    size = canvas.width,
    cells = radius * 2 + 1,
    cell = size / cells;
  ctx.fillStyle = "#1f6f86";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < cells; i++)
    for (let j = 0; j < cells; j++) {
      const x = Math.round(cx) - radius + i,
        z = Math.round(cz) - radius + j;
      if (Math.abs(x) > SIZE || Math.abs(z) > SIZE) continue;
      const { y, type } = topInfo(x, z);
      if (type === undefined) continue;
      if (y + 0.5 < WATER_LEVEL) ctx.fillStyle = "#3f9fb4";
      else {
        const shade = Math.max(-0.25, Math.min(0.25, (y - player.y) * 0.03));
        const c = new THREE.Color(colors[type] ?? 0x888888);
        c.offsetHSL(0, 0, shade);
        ctx.fillStyle = "#" + c.getHexString();
      }
      ctx.fillRect(i * cell, j * cell, Math.ceil(cell), Math.ceil(cell));
    }
  const toMap = (x, z, pin) => {
    let u = (x - (Math.round(cx) - radius) + 0.5) * cell,
      v = (z - (Math.round(cz) - radius) + 0.5) * cell;
    if (pin) {
      u = Math.max(8, Math.min(size - 8, u));
      v = Math.max(8, Math.min(size - 8, v));
    }
    return [u, v];
  };
  const dot = (x, z, color, r, pin = false) => {
    const [u, v] = toMap(x, z, pin);
    if (u < 0 || v < 0 || u > size || v > size) return;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(u, v, r, 0, Math.PI * 2);
    ctx.fill();
  };
  for (const k of Object.keys(world.chests)) {
    const [x, , z] = k.split(",").map(Number);
    dot(x, z, "#f2c14e", whole ? 4 : 2.5);
  }
  for (const a of animals) if (a.tamed) dot(a.x, a.z, "#ffd36b", whole ? 4 : 3);
  for (const m of monsters) dot(m.x, m.z, "#ef5b4c", whole ? 4 : 3);
  // Home is the bed, or the starting point of the world.
  const [hx, hz] = world.spawnPoint
    ? [world.spawnPoint[0], world.spawnPoint[2]]
    : homeAnchor;
  const [hu, hv] = toMap(hx, hz, true);
  ctx.font = `${whole ? 22 : 15}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🏠", hu, hv);
  // Biel: an arrow pointing the way he looks.
  const [pu, pv] = toMap(player.x, player.z);
  ctx.save();
  ctx.translate(pu, pv);
  ctx.rotate(-yaw);
  ctx.fillStyle = "#ed8524";
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  const s = whole ? 9 : 7;
  ctx.moveTo(0, -s);
  ctx.lineTo(s * 0.7, s);
  ctx.lineTo(0, s * 0.5);
  ctx.lineTo(-s * 0.7, s);
  ctx.closePath();
  ctx.stroke();
  ctx.fill();
  ctx.restore();
}
let minimapClock = 0;
function updateMinimap(dt) {
  minimapClock -= dt;
  if (minimapClock > 0) return;
  minimapClock = 0.4;
  drawMap(app.querySelector(".minimap"), player.x, player.z, 24);
}
// The world is drawn in 16 × 16 chunks; an edit only redraws its own chunk.
const CHUNK = 16;
const chunks = new Map();
const chunkKey = (cx, cz) => `${cx},${cz}`;
const exposed = (x, y, z) =>
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
  });
function clearChunk(id) {
  const chunk = chunks.get(id);
  if (!chunk) return;
  for (const m of chunk.meshes) {
    terrain.remove(m);
    m.dispose();
  }
  chunks.delete(id);
}
function buildChunk(cx, cz, cells) {
  const id = chunkKey(cx, cz);
  clearChunk(id);
  const groups = new Map(),
    lights = [],
    crops = [];
  for (const [x, y, z, type] of cells) {
    if (type === TORCH || type === 7 || type === 36) lights.push([x, y, z]);
    if (cropInfo(type) && cropInfo(type).stage < 3) crops.push(key(x, y, z));
    if (!exposed(x, y, z)) continue;
    if (!groups.has(type)) groups.set(type, []);
    groups.get(type).push([x, y, z]);
  }
  const matrix = new THREE.Matrix4(),
    meshList = [];
  for (const [type, group] of groups) {
    const mesh = new THREE.InstancedMesh(
      shapes[type] ?? cube,
      materials[type],
      group.length,
    );
    group.forEach(([x, y, z], j) =>
      mesh.setMatrixAt(j, matrix.makeTranslation(x, y, z)),
    );
    mesh.castShadow =
      type !== GLASS &&
      type !== TORCH &&
      type !== ICE &&
      !cropInfo(type) &&
      !isPlant(type);
    mesh.receiveShadow = true;
    mesh.userData.type = type;
    mesh.userData.cells = group;
    mesh.computeBoundingSphere();
    terrain.add(mesh);
    meshList.push(mesh);
  }
  chunks.set(id, {
    meshes: meshList,
    lights,
    crops,
    x: cx * CHUNK + CHUNK / 2,
    z: cz * CHUNK + CHUNK / 2,
  });
}
function refreshChunkLists() {
  topCache.clear();
  meshes = [];
  lightBlocks = [];
  cropKeys = [];
  for (const chunk of chunks.values()) {
    meshes.push(...chunk.meshes);
    lightBlocks.push(...chunk.lights);
    cropKeys.push(...chunk.crops);
  }
}
// Redraws the whole world (used when a world is loaded).
function rebuild() {
  for (const id of [...chunks.keys()]) clearChunk(id);
  const byChunk = new Map();
  for (const [k, type] of blocks) {
    const [x, y, z] = k.split(",").map(Number);
    const id = chunkKey(Math.floor(x / CHUNK), Math.floor(z / CHUNK));
    if (!byChunk.has(id)) byChunk.set(id, []);
    byChunk.get(id).push([x, y, z, type]);
  }
  for (const [id, cells] of byChunk) {
    const [cx, cz] = id.split(",").map(Number);
    buildChunk(cx, cz, cells);
  }
  refreshChunkLists();
}
function rebuildChunk(cx, cz) {
  const cells = [];
  for (let x = cx * CHUNK; x < (cx + 1) * CHUNK; x++)
    for (let z = cz * CHUNK; z < (cz + 1) * CHUNK; z++)
      for (let y = 0; y <= MAX_Y; y++) {
        const type = blocks.get(key(x, y, z));
        if (type !== undefined) cells.push([x, y, z, type]);
      }
  buildChunk(cx, cz, cells);
}
// Redraws the chunks around the given blocks (neighbours too, at the borders).
function rebuildAt(...points) {
  const todo = new Set();
  for (const [x, , z] of points) {
    const cx = Math.floor(x / CHUNK),
      cz = Math.floor(z / CHUNK),
      lx = x - cx * CHUNK,
      lz = z - cz * CHUNK;
    todo.add(chunkKey(cx, cz));
    if (lx === 0) todo.add(chunkKey(cx - 1, cz));
    if (lx === CHUNK - 1) todo.add(chunkKey(cx + 1, cz));
    if (lz === 0) todo.add(chunkKey(cx, cz - 1));
    if (lz === CHUNK - 1) todo.add(chunkKey(cx, cz + 1));
  }
  for (const id of todo) {
    const [cx, cz] = id.split(",").map(Number);
    rebuildChunk(cx, cz);
  }
  refreshChunkLists();
}
// Far-away chunks are hidden; the fog covers the edge.
function cullChunks() {
  const far = settings.quality === "high" ? 88 : 56;
  for (const chunk of chunks.values()) {
    const show =
      Math.hypot(chunk.x - camera.position.x, chunk.z - camera.position.z) <
      far;
    for (const m of chunk.meshes) m.visible = show;
  }
  scene.fog.far = Math.min(105, far + 10);
}
function isRendered(x, y, z) {
  const chunk = chunks.get(
    chunkKey(Math.floor(x / CHUNK), Math.floor(z / CHUNK)),
  );
  return !!chunk?.meshes.some((m) =>
    m.userData.cells.some(([a, b, c]) => a === x && b === y && c === z),
  );
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
    player.x + sunDirection.x * 40,
    player.y + Math.max(sunDirection.y, 0.15) * 40,
    player.z + 12,
  );
  sun.target.position.copy(player);
  sun.target.updateMatrixWorld();
  skyDome.position.copy(camera.position);
  sunDisc.position.copy(sunDirection).multiplyScalar(90);
  moonDisc.position.copy(sunDirection).multiplyScalar(-90);
  sunDisc.lookAt(camera.position);
  moonDisc.lookAt(camera.position);
  sunDisc.material.opacity = Math.min(1, s.daylight * 3);
  moonDisc.material.opacity = 1 - s.daylight;
  stars.material.opacity = Math.max(0, 1 - s.daylight * 1.6);
  amber.emissiveIntensity = (1 - s.daylight) * 1.4;
  torchMaterial.emissiveIntensity = 0.6 + (1 - s.daylight) * 1.2;
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
  const bed = world?.spawnPoint;
  if (bed && blocks.get(key(...bed)) === BED)
    player.set(bed[0], bed[1] + 0.51, bed[2]);
  else {
    // Start on open ground, not on top of a tree.
    const [sx, sz] = findSpawn(
      (x, z) =>
        !blocks.has(key(x, height(x, z) + 1, z)) &&
        !blocks.has(key(x, height(x, z) + 2, z)),
    );
    player.set(sx, height(sx, sz) + 0.51, sz);
    homeAnchor = [sx, sz];
  }
  while (collides(blocks, player) && player.y < 33) player.y++;
  velocity = 0;
}
spawn();
// Rebuilds the scene for a world: generated terrain plus the player's edits.
function loadWorld(w) {
  world = w;
  store.setCurrent(w.id);
  useTerrain({ seed: w.seed, size: w.size });
  water.scale.setScalar((SIZE * 2 + 90) / 125);
  blocks.clear();
  for (const [k, v] of generate()) blocks.set(k, v);
  edits.clear();
  for (const [x, y, z, type] of w.edits) {
    const k = key(x, y, z);
    edits.set(k, type);
    if (type === null) blocks.delete(k);
    else blocks.set(k, type);
  }
  rebuild();
  // The menu needs dry ground for Biel and nothing tall between him and the camera.
  const clear = (x, z) =>
    [1, 2, 3, 4].every((dy) => !blocks.has(key(x, height(x, z) + dy, z)));
  menuAnchor = findSpawn((x, z) => {
    if (height(x + 6, z + 5) <= WATER_LEVEL) return false;
    for (let dx = 2; dx <= 14; dx++)
      for (let dz = 1; dz <= 19; dz++) if (!clear(x + dx, z + dz)) return false;
    return true;
  });
  lastBiome = null;
  spawn();
  if (w.player) {
    player.set(w.player.x, w.player.y, w.player.z);
    ({ yaw, pitch, firstPerson } = w.player);
    if (collides(blocks, player)) spawn();
  }
  timeOfDay = w.time;
  flying = false;
  inventory = Inventory.from(w.inventory);
  vitals = createVitals(w.player?.health, w.player?.food);
  applyParentLimits();
  questShown = "";
  riding = null;
  setupAnimals();
  for (const m of [...monsters]) removeMonster(m, false);
  for (const a of arrows) scene.remove(a.mesh);
  arrows = [];
  // Monsters from last time come back where they were.
  for (const saved of validateMonsters(w.monsters).filter(
    (m) =>
      w.mode === "adventure" &&
      w.options.monsters &&
      !settings.parents.noMonsters &&
      allowedMonsters(w.options.difficulty, true).includes(m.type),
  )) {
    const m = addMonster(saved.type, saved, saved.small, true);
    m.hp = saved.hp;
    m.warned = true;
  }
  rebuildBackpacks();
  refreshSigns();
  selected = 0;
  if (!inventory.slots.some(Boolean)) {
    // A fresh backpack: building blocks in Creative, a few apples in Adventure.
    if (creative())
      [
        "grass",
        "dirt",
        "stone",
        "wood",
        "planks",
        "brick",
        "glass",
        "door",
        "torch",
      ].forEach((id, i) => (inventory.slots[i] = { id, count: 1 }));
    else inventory.add("apple", 3);
  }
  started = true;
  document.documentElement.classList.toggle("first-person", firstPerson);
}
document.documentElement.classList.toggle("first-person", firstPerson);
// Creative mode: a quick double tap on jump starts or stops flying.
function jumpTapped() {
  const now = performance.now();
  if (creative() && now - lastJump < 320) {
    setFlying(!flying);
    lastJump = 0;
  } else lastJump = now;
}
function setFlying(on) {
  if (flying === on) return;
  flying = on;
  velocity = 0;
  toast(t(on ? "flying" : "walking"));
  render();
}
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
  pointerDown = null,
  mouseBreak = false,
  breaking = { key: null, time: 0 },
  breakCooldown = 0;
const keys = new Set();
const pressed = (code) =>
  keys.has(code) || touchInput.has(code) || padHeld.has(code);
// Game controllers: the native apps send the state; browsers use the Gamepad API.
let nativePad = null,
  padActions = null,
  padHeld = new Set(),
  menuRepeat = 0;
window.nativeGamepad = (state) => (nativePad = state);
function pollGamepad(dt) {
  let state = nativePad;
  if (!state && navigator.getGamepads)
    state = fromStandardGamepad([...navigator.getGamepads()].find(Boolean));
  const now = state ? readPad(state) : null,
    before = padActions;
  padActions = now;
  padHeld = mode === "playing" && now ? now.held : new Set();
  if (!now) return;
  const hit = (name) => pressedNow(now, before, name);
  const touched =
    now.held.size ||
    now.look.some(Boolean) ||
    [
      "place",
      "attack",
      "backpack",
      "pause",
      "next",
      "previous",
      "confirm",
      "back",
    ].some((n) => now[n]);
  if (touched) {
    document.documentElement.classList.add("gamepad");
    pointerKind = "pad";
  }
  if (mode === "playing") {
    yaw -= now.look[0] * 2.6 * dt;
    pitch = Math.max(-0.25, Math.min(1.15, pitch + now.look[1] * 2 * dt));
    if (hit("confirm")) jumpTapped();
    if (hit("place")) edit(true);
    if (hit("attack")) attack();
    if (hit("backpack")) action("inventory");
    if (hit("pause")) action("pause");
    if (hit("next") || hit("previous")) {
      selected = (selected + (hit("next") ? 1 : 8)) % 9;
      render();
    }
    if (hit("back") && riding) dismount();
    return;
  }
  // Menus: up and down move between buttons, A presses, B goes back.
  const focusable = [
    ...app.querySelectorAll("button:not([disabled]), select, input"),
  ];
  if (!focusable.length) return;
  menuRepeat -= dt;
  const step = now.menuDown ? 1 : now.menuUp ? -1 : 0;
  if (step && (menuRepeat <= 0 || hit("menuUp") || hit("menuDown"))) {
    menuRepeat = 0.25;
    const at = focusable.indexOf(document.activeElement);
    focusable[(at + step + focusable.length) % focusable.length].focus();
  }
  if (hit("confirm"))
    (focusable.includes(document.activeElement)
      ? document.activeElement
      : focusable[0]
    ).click();
  if (hit("back") && MODALS.includes(mode)) action("back");
  if (hit("pause") && mode === "paused") action("play");
}
// Menu shortcuts from the Mac menu bar (⌘N, ⌘E, ⌘,).
window.nativeMenu = (what) => {
  if (mode === "playing") action("pause");
  if (what === "newworld") action("newworld");
  else if (what === "settings") action("settings");
  else if (what === "export" && world) action("export");
};
// A keyboard on an iPad hides the touch buttons; touching the screen brings them back.
window.addEventListener("keydown", () =>
  document.documentElement.classList.add("keyboard"),
);
window.addEventListener(
  "touchstart",
  () => {
    document.documentElement.classList.remove("keyboard", "gamepad");
    pointerKind = "touch";
  },
  { passive: true },
);
app.addEventListener("pointerdown", (e) => {
  const control = e.target.closest("[data-key]");
  if (!control || mode !== "playing") return;
  e.preventDefault();
  touchInput.press(e.pointerId, control.dataset.key);
  if (control.dataset.key === "Space") jumpTapped();
  if (control.dataset.key === "KeyC" && riding) dismount();
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

// Friendly animals: they wander, give things and (the dog) follow Biel.
const animalGroup = new THREE.Group();
scene.add(animalGroup);
const worldSeed = () =>
  [...(world?.id ?? "biel")].reduce(
    (h, c) => (h * 31 + c.charCodeAt(0)) >>> 0,
    7,
  );
// Feet height on the column at x,z, looking down from just above `fromY`.
function surfaceY(x, z, fromY) {
  const bx = Math.round(x),
    bz = Math.round(z);
  for (let y = Math.floor(fromY + 1.5); y >= 0; y--) {
    const type = blocks.get(key(bx, y, bz));
    if (type !== undefined && !passable(type)) return y + 0.51;
  }
  return -10;
}
function setupAnimals() {
  animals = validateAnimals(world.creatures);
  if (!world.animalsSpawned && world.options.animals) {
    animals = initialAnimals(worldSeed());
    world.animalsSpawned = true;
  }
  animalGroup.clear();
  for (const a of animals) {
    a.mesh = MODELS[a.type]();
    a.mesh.userData.animal = a;
    dressAnimal(a);
    animalGroup.add(a.mesh);
  }
}
// Collar and name tag for a dog that is Biel's friend.
const DYE_COLORS = {
  red: 0xc8473c,
  orange: 0xe98d2b,
  yellow: 0xf2c94c,
  green: 0x5f9f4a,
  blue: 0x3f6fc8,
  purple: 0x8a4fb5,
  black: 0x2b2b30,
};
function dressAnimal(a) {
  const m = a.mesh;
  if (m.userData.wool && a.color)
    m.userData.wool.material = new THREE.MeshStandardMaterial({
      color: DYE_COLORS[a.color],
      roughness: 0.9,
    });
  if (m.userData.collar) m.userData.collar.visible = a.tamed;
  if (m.userData.tag) m.remove(m.userData.tag);
  if (a.tamed && a.name) {
    m.userData.tag = nameTag(a.name);
    m.userData.tag.position.y = 1.35;
    m.add(m.userData.tag);
  }
}
function interactWith(a) {
  if (a === riding) return;
  const kind = ANIMALS[a.type],
    held = creative() && kind.tameWith && !a.tamed ? kind.tameWith : heldId();
  const res = interact(a, held, world.age, Math.random());
  const who = nested("animalNames", a.type);
  if (res.use && !creative()) inventory.remove(res.use, 1);
  if (res.result === "gave") {
    if (!creative() && inventory.add(...res.give)) toast(t("full"));
    else toast(t("gave_" + a.type));
    beepAt(620, 920);
  } else if (res.result === "tamed") {
    hearts(a);
    beepAt(420, 260);
    beepAt(440, 280, 0.18);
    dressAnimal(a);
    toast(t("tamed", { animal: who }));
    emit("tame:" + a.type);
    namingDog = a;
    mode = "namedog";
  } else if (res.result === "mount") {
    mount(a);
  } else if (res.result === "dyed") {
    dressAnimal(a);
    toast(t("dyed", { animal: who }));
  } else if (res.result === "love") {
    hearts(a);
    toast(t("love", { animal: who }));
  } else if (res.result === "sit" || res.result === "follow")
    toast(t(res.result, { name: a.name || nested("petDefaults", a.type) }));
  else if (res.result === "wants") toast(t("wants_" + a.type));
  else toast(t(res.result, { animal: who }));
  scheduleSave();
  render();
}
// Little pink hearts above a happy animal.
const heartMaterial = new THREE.MeshBasicMaterial({ color: 0xff6b8a });
function hearts(a) {
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(cube, heartMaterial);
    m.scale.setScalar(0.12);
    m.position.set(a.x, a.y + 1.2, a.z);
    scene.add(m);
    particles.push({
      m,
      v: new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        1.5 + Math.random(),
        (Math.random() - 0.5) * 1.5,
      ),
      life: 1,
    });
  }
}
// Riding a friendly horse: Biel sits on top and goes faster.
function mount(a) {
  riding = a;
  flying = false;
  player.set(a.x, Math.max(player.y, a.y), a.z);
  toast(t("mount"));
  render();
}
function dismount() {
  if (!riding) return;
  riding.x = player.x;
  riding.z = player.z;
  riding.y = player.y;
  riding = null;
  toast(t("dismount"));
  render();
}
// Birds circle over the island during the day.
const flock = new THREE.Group();
scene.add(flock);
for (let i = 0; i < 6; i++) {
  const b = bird();
  b.userData.phase = (i / 6) * Math.PI * 2;
  b.userData.radius = 9 + (i % 3) * 3;
  flock.add(b);
}
function updateBirds(dt, daylight) {
  flock.visible = daylight > 0.5 && (world?.options.animals ?? true);
  if (!flock.visible) return;
  for (const b of flock.children) {
    const a = elapsed * 0.25 + b.userData.phase;
    b.position.set(
      Math.cos(a) * b.userData.radius,
      16 + Math.sin(a * 2) * 1.5,
      Math.sin(a) * b.userData.radius,
    );
    b.rotation.y = -a;
    for (const w of b.userData.wings)
      w.rotation.z =
        Math.sin(elapsed * 12 + b.userData.phase) * 0.6 * w.userData.side;
  }
}
let breedClock = 1;
function breedAnimals(dt) {
  breedClock -= dt;
  if (breedClock > 0) return;
  breedClock = 1;
  // Every world starts with 19 animals, so even "light" leaves room for babies.
  const limit = settings.quality === "high" ? 40 : 28;
  for (const [a, b] of findCouples(animals, world.age)) {
    if (animals.length >= limit) break;
    const baby = makeBaby(a, b, world.age);
    baby.mesh = MODELS[baby.type]();
    baby.mesh.userData.animal = baby;
    animalGroup.add(baby.mesh);
    animals.push(baby);
    hearts(baby);
    toast(t("born"));
    jingle();
  }
}
function updateAnimals(dt) {
  for (const a of animals) {
    const m = a.mesh,
      active = world.options.animals || a.tamed;
    m.visible = active;
    if (!active) continue;
    let speed = 0;
    if (a.baby && world.age >= a.grownAt) a.baby = false;
    m.scale.setScalar(a.baby ? 0.55 : 1);
    if (a === riding) {
      // The horse carries Biel: it simply stays under him.
      a.x = player.x;
      a.z = player.z;
      a.y = player.y;
      a.yaw = biel.rotation.y;
      m.position.set(a.x, a.y - 0.01, a.z);
      m.rotation.y = a.yaw;
      const gallop =
        pressed("KeyW") ||
        pressed("KeyA") ||
        pressed("KeyS") ||
        pressed("KeyD") ||
        pressed("ArrowUp") ||
        pressed("ArrowDown") ||
        pressed("ArrowLeft") ||
        pressed("ArrowRight");
      const swingRide = gallop ? Math.sin(elapsed * 14) * 0.7 : 0;
      m.userData.legs.forEach(
        (l, i) => (l.rotation.x = i % 2 ? swingRide : -swingRide),
      );
      continue;
    }
    if (ANIMALS[a.type].companion && a.tamed) {
      // Friendly dogs and cats follow Biel; a dog also chases monsters away.
      const foe =
        a.sitting || a.type !== "dog"
          ? null
          : monsters.find(
              (m) => Math.hypot(m.x - player.x, m.z - player.z) < 7,
            );
      const goal = foe ?? player;
      const dx = goal.x - a.x,
        dz = goal.z - a.z,
        d = Math.hypot(dx, dz) + (foe ? 1.6 : 0);
      if (foe && d < 2.9) {
        a.bite = (a.bite ?? 0) - dt;
        if (a.bite <= 0) {
          a.bite = 1;
          hitMonster(foe, 2);
        }
      }
      if (!a.sitting && d > 18) {
        a.x = player.x - 1;
        a.z = player.z - 1;
        a.y = player.y;
      } else if (!a.sitting && d > 2.6) {
        a.yaw = Math.atan2(dx, dz);
        speed = d > 6 ? 4.2 : 2.6;
      }
    } else if (
      ANIMALS[a.type].shy &&
      Math.hypot(player.x - a.x, player.z - a.z) < 4
    ) {
      // Rabbits hop away when Biel comes close.
      a.yaw = Math.atan2(a.x - player.x, a.z - player.z);
      speed = 3.2;
    } else {
      a.timer = (a.timer ?? 0) - dt;
      if (a.timer <= 0) {
        a.walking = Math.random() < 0.6;
        a.yaw += (Math.random() - 0.5) * 2.4;
        a.timer = 2 + Math.random() * 3;
      }
      if (a.walking) speed = ANIMALS[a.type].speed;
    }
    if (speed) {
      const nx = a.x + Math.sin(a.yaw) * speed * dt,
        nz = a.z + Math.cos(a.yaw) * speed * dt,
        ny = surfaceY(nx, nz, a.y);
      const blocked =
        Math.abs(nx) > SIZE - 1 ||
        Math.abs(nz) > SIZE - 1 ||
        ny - a.y > 1.05 ||
        (ny < WATER_LEVEL - 0.3 && !a.tamed);
      if (blocked) {
        a.yaw += Math.PI * (0.5 + Math.random());
        a.timer = 1;
        speed = 0;
      } else {
        a.x = nx;
        a.z = nz;
      }
    }
    const ground = surfaceY(a.x, a.z, a.y);
    a.y = ground > a.y ? ground : Math.max(ground, a.y - 6 * dt);
    m.position.set(a.x, a.y - 0.01, a.z);
    m.rotation.y +=
      Math.atan2(
        Math.sin(a.yaw - m.rotation.y),
        Math.cos(a.yaw - m.rotation.y),
      ) * Math.min(1, dt * 8);
    const swing = speed ? Math.sin(elapsed * 10) * 0.6 : 0;
    m.userData.legs.forEach((l, i) => (l.rotation.x = i % 2 ? swing : -swing));
    if (m.userData.head)
      m.userData.head.rotation.x = speed
        ? 0
        : Math.sin(elapsed * 1.5 + a.x) * 0.12;
    if (m.userData.body) m.userData.body.rotation.x = a.sitting ? -0.35 : 0;
    if (m.userData.tail)
      m.userData.tail.rotation.y = a.tamed ? Math.sin(elapsed * 14) * 0.5 : 0;
    if (m.userData.wool)
      m.userData.wool.scale.setScalar(world.age < a.readyAt ? 0.82 : 1);
  }
}
// Night monsters. They are not saved: a new night brings new ones.
const monsterGroup = new THREE.Group();
scene.add(monsterGroup);
const monstersAllowed = () =>
  world &&
  !settings.parents.noMonsters &&
  world.mode === "adventure" &&
  world.options.monsters &&
  world.options.difficulty !== "peaceful";
function addMonster(type, at, small = false, quiet = false) {
  const m = {
    type,
    x: at.x,
    y: at.y,
    z: at.z,
    yaw: 0,
    hp: small ? 1 : MONSTERS[type].hp,
    small,
    cooldown: 1,
    warned: false,
    hop: Math.random() * 6,
    flash: 0,
  };
  m.mesh =
    type === "jelly"
      ? MODELS.jelly(small, Math.floor(Math.random() * 3))
      : MODELS[type]();
  m.mesh.userData.monster = m;
  m.mesh.position.set(m.x, m.y, m.z);
  monsterGroup.add(m.mesh);
  monsters.push(m);
  if (!quiet) sparkle([m.x, m.y + 0.6, m.z]);
  return m;
}
// Biel is underground when there is rock a few blocks over his head.
const underground = () =>
  topAt(Math.round(player.x), Math.round(player.z)) > player.y + 3;
// A dark empty spot in the cave near Biel, with floor under it.
function caveSpot() {
  for (let i = 0; i < 24; i++) {
    const x = Math.round(player.x + (Math.random() - 0.5) * 20),
      z = Math.round(player.z + (Math.random() - 0.5) * 20),
      y = Math.round(player.y + (Math.random() - 0.5) * 6);
    if (Math.hypot(x - player.x, z - player.z) < 6) continue;
    if (
      blocks.has(key(x, y, z)) ||
      blocks.has(key(x, y + 1, z)) ||
      !blocks.has(key(x, y - 1, z))
    )
      continue;
    if (
      lightBlocks.some(([lx, ly, lz]) => Math.hypot(lx - x, ly - y, lz - z) < 6)
    )
      continue;
    return { x, y: y - 0.49, z };
  }
  return null;
}
function trySpawnMonster() {
  const below = underground();
  const state = {
    mode: world.mode,
    options: world.options,
    night: isNight(),
    count: monsters.length,
    rules: rules(),
    underground: below,
  };
  if (!canSpawn(state)) return null;
  const spot = below
    ? caveSpot()
    : spawnSpot({
        rand: Math.random,
        player,
        lights: lightBlocks,
        surface: (x, z) => surfaceY(x, z, 40),
      });
  if (!spot) return null;
  const types = allowedMonsters(world.options.difficulty, below);
  const m = addMonster(types[Math.floor(Math.random() * types.length)], spot);
  m.cave = below;
  return m;
}
// PUF: a big push and a few natural blocks knocked over (never Biel's builds).
function puffBoom(m) {
  hurtPlayer(MONSTERS.puff.damage, m);
  const away = Math.atan2(player.x - m.x, player.z - m.z);
  for (let i = 0; i < 12; i++)
    for (const [axis, d] of [
      ["x", Math.sin(away) * 0.12],
      ["z", Math.cos(away) * 0.12],
    ]) {
      player[axis] += d;
      if (collides(blocks, player)) player[axis] -= d;
    }
  const natural = [0, 1, 2, 3, 5, SNOW];
  const knocked = [];
  for (let dx = -1; dx <= 1 && knocked.length < 3; dx++)
    for (let dz = -1; dz <= 1 && knocked.length < 3; dz++)
      for (let dy = -1; dy <= 1 && knocked.length < 3; dy++) {
        const p = [
            Math.round(m.x) + dx,
            Math.round(m.y) + dy,
            Math.round(m.z) + dz,
          ],
          k = key(...p);
        if (p[1] < 1 || edits.has(k) || !natural.includes(blocks.get(k)))
          continue;
        burst(p, blocks.get(k));
        blocks.delete(k);
        edits.set(k, null);
        knocked.push(p);
      }
  if (knocked.length) rebuildAt(...knocked);
  for (let i = 0; i < 3; i++) sparkle([m.x, m.y + 0.8, m.z]);
  beepAt(160, 60);
  removeMonster(m, false);
}
function removeMonster(m, poof = true) {
  if (poof) sparkle([m.x, m.y + 0.6, m.z]);
  monsterGroup.remove(m.mesh);
  monsters = monsters.filter((x) => x !== m);
  if (targetMonster === m) targetMonster = null;
}
// Colourful sparkles instead of anything scary.
const sparkleMaterials = [0xffd25e, 0x8fd3f4, 0xf08cc0, 0x9fd36f].map(
  (color) => new THREE.MeshBasicMaterial({ color }),
);
function sparkle(p) {
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(cube, sparkleMaterials[i % 4]);
    m.scale.setScalar(0.1);
    m.position.set(...p);
    scene.add(m);
    particles.push({
      m,
      v: new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        Math.random() * 4,
        (Math.random() - 0.5) * 4,
      ),
      life: 0.7,
    });
  }
}
function hurtPlayer(amount, from) {
  if (creative()) return;
  if (!hurt(vitals, amount, rules())) return;
  hurtFlash();
  beepAt(240, 120);
  // A gentle push away from whatever hit Biel.
  const away = Math.atan2(player.x - from.x, player.z - from.z);
  for (let i = 0; i < 6; i++)
    for (const [axis, d] of [
      ["x", Math.sin(away) * 0.12],
      ["z", Math.cos(away) * 0.12],
    ]) {
      player[axis] += d;
      if (collides(blocks, player)) player[axis] -= d;
    }
  if (grounded) velocity = 4;
}
function hitMonster(m, damage) {
  const res = strike(m, damage);
  m.flash = 0.2;
  const away = Math.atan2(m.x - player.x, m.z - player.z);
  m.x += Math.sin(away) * 0.6;
  m.z += Math.cos(away) * 0.6;
  beepAt(700, 300);
  if (res.result === "split") {
    removeMonster(m);
    for (const side of [-0.5, 0.5])
      addMonster("jelly", { x: m.x + side, y: m.y, z: m.z - side }, true);
  } else if (res.result === "poof") {
    removeMonster(m);
    if (!creative() && !inventory.add(...res.drop))
      setTimeout(() => flashLabel(`+${res.drop[1]} ${itemName(res.drop[0])}`));
    render();
  }
}
// Biel's attack: the monster under the pointer, or the nearest one in reach.
function attack() {
  if (mode !== "playing" || attackCooldown > 0) return;
  const foe =
    targetMonster ??
    monsters
      .filter((m) => Math.hypot(m.x - player.x, m.z - player.z) < 3.2)
      .sort(
        (a, b) =>
          Math.hypot(a.x - player.x, a.z - player.z) -
          Math.hypot(b.x - player.x, b.z - player.z),
      )[0];
  if (!foe) return;
  attackCooldown = 0.45;
  rightArm.rotation.x = -1.6;
  hitMonster(foe, weaponDamage(heldId()));
}
// Biel's own arrows: they fly where he aims and fall a little.
let bielArrows = [];
function shootBow() {
  if (!creative() && !inventory.remove("arrows", 1))
    return toast(t("noArrows"));
  const aim = new THREE.Raycaster();
  aim.setFromCamera(
    (firstPerson && pointerKind !== "touch") || pointerKind === "pad"
      ? center
      : pointer,
    camera,
  );
  const mesh = arrow(),
    from = new THREE.Vector3(
      player.x,
      player.y + 1.4,
      player.z,
    ).addScaledVector(aim.ray.direction, 0.6);
  mesh.position.copy(from);
  scene.add(mesh);
  bielArrows.push({
    mesh,
    vel: aim.ray.direction.clone().multiplyScalar(18),
    life: 3,
  });
  beepAt(500, 900);
  render();
}
function updateBielArrows(dt) {
  for (const a of [...bielArrows]) {
    a.life -= dt;
    a.vel.y -= 6 * dt;
    a.mesh.position.addScaledVector(a.vel, dt);
    a.mesh.lookAt(a.mesh.position.clone().add(a.vel));
    const p = a.mesh.position;
    const foe = monsters.find(
      (m) => Math.hypot(m.x - p.x, m.y + 0.8 - p.y, m.z - p.z) < 0.8,
    );
    if (foe) hitMonster(foe, 3);
    const t0 = blocks.get(
      key(Math.round(p.x), Math.round(p.y), Math.round(p.z)),
    );
    if (foe || (t0 !== undefined && !passable(t0)) || a.life <= 0) {
      scene.remove(a.mesh);
      bielArrows = bielArrows.filter((x) => x !== a);
    }
  }
}
function shootArrow(m) {
  const mesh = arrow(),
    from = new THREE.Vector3(m.x, m.y + 1.2, m.z),
    to = new THREE.Vector3(player.x, player.y + 1, player.z);
  const vel = to.sub(from).normalize().multiplyScalar(7);
  mesh.position.copy(from);
  mesh.lookAt(from.clone().add(vel));
  scene.add(mesh);
  arrows.push({ mesh, vel, life: 3 });
  beepAt(900, 500);
}
function updateMonsters(dt) {
  attackCooldown -= dt;
  if (!monstersAllowed()) {
    for (const m of [...monsters]) removeMonster(m, false);
    return;
  }
  const night = isNight();
  spawnClock -= dt;
  if (spawnClock <= 0) {
    spawnClock = 4;
    if (night || underground()) trySpawnMonster();
  }
  for (const m of [...monsters]) {
    // At sunrise they fizzle away in sparkles (cave monsters stay in the dark).
    if (!night && !(m.cave && underground())) {
      // Each one fizzles at its own moment, within two seconds.
      m.dawn = (m.dawn ?? Math.random() * 2) - dt;
      if (m.dawn <= 0) removeMonster(m);
      continue;
    }
    const dx = player.x - m.x,
      dz = player.z - m.z,
      d = Math.hypot(dx, dz);
    if (d > 40) {
      removeMonster(m, false);
      continue;
    }
    if (!m.warned && d < 10) {
      m.warned = true;
      toast(t("monsterNear"));
      beepAt(330, 520);
      beepAt(520, 330, 0.15);
    }
    let speed = MONSTERS[m.type].speed * rules().monsterSpeed,
      dir = Math.atan2(dx, dz);
    m.cooldown -= dt;
    if (m.type === "archer") {
      if (d < 5) dir += Math.PI;
      else if (d < 8) speed = 0;
      if (d < 11 && m.cooldown <= 0) {
        m.cooldown = 2.8;
        shootArrow(m);
      }
    } else if (
      MONSTERS[m.type].puff &&
      d < 2.2 &&
      Math.abs(player.y - m.y) < 2
    ) {
      // Puffy swells up for a moment, then goes PUF.
      speed = 0;
      m.fuse = (m.fuse ?? 1.2) - dt;
      m.flash = Math.max(m.flash, 0.15 * (1 - m.fuse));
      if (m.fuse <= 0) {
        puffBoom(m);
        continue;
      }
    } else if (d < 1.15 && Math.abs(player.y - m.y) < 1.5) {
      speed = 0;
      if (m.cooldown <= 0) {
        m.cooldown = 1.2;
        hurtPlayer(MONSTERS[m.type].damage, m);
      }
    }
    if (m.type === "jelly") {
      m.hop += dt * 5;
      speed *= Math.sin(m.hop) > 0 ? 1.7 : 0.2;
    }
    // A friendly cat scares the sleepwalkers and jellies away.
    const cat = animals.find(
      (a) =>
        a.type === "cat" && a.tamed && Math.hypot(a.x - m.x, a.z - m.z) < 6,
    );
    if (cat && (m.type === "sleepy" || m.type === "jelly"))
      dir = Math.atan2(m.x - cat.x, m.z - cat.z);
    m.yaw = Math.atan2(dx, dz);
    if (MONSTERS[m.type].flies) {
      // Ghosts float straight through rock towards Biel.
      const dy = player.y + 0.8 - m.y,
        len = Math.hypot(dx, dy, dz) || 1;
      if (len > 1) {
        m.x += (dx / len) * speed * dt;
        m.y += (dy / len) * speed * dt;
        m.z += (dz / len) * speed * dt;
      } else if (m.cooldown <= 0) {
        m.cooldown = 1.2;
        hurtPlayer(MONSTERS[m.type].damage, m);
      }
    } else if (speed) {
      const nx = m.x + Math.sin(dir) * speed * dt,
        nz = m.z + Math.cos(dir) * speed * dt,
        ny = surfaceY(nx, nz, m.y);
      if (
        ny - m.y <= (MONSTERS[m.type].climbs ? 3.05 : 1.05) &&
        ny > -5 &&
        Math.abs(nx) < SIZE &&
        Math.abs(nz) < SIZE
      ) {
        m.x = nx;
        m.z = nz;
      }
    }
    if (!MONSTERS[m.type].flies) {
      const ground = surfaceY(m.x, m.z, m.y);
      m.y = ground > m.y ? ground : Math.max(ground, m.y - 6 * dt);
    }
    const mesh = m.mesh;
    mesh.position.set(
      m.x,
      m.y -
        0.01 +
        (m.type === "jelly" ? Math.max(0, Math.sin(m.hop)) * 0.35 : 0),
      m.z,
    );
    mesh.rotation.y = m.yaw;
    const swing = speed ? Math.sin(elapsed * 8) * 0.5 : 0;
    mesh.userData.legs.forEach(
      (l, i) => (l.rotation.x = i % 2 ? swing : -swing),
    );
    if (mesh.userData.head)
      mesh.userData.head.rotation.z = Math.sin(elapsed * 2 + m.x) * 0.15;
    if (MONSTERS[m.type].flies)
      mesh.position.y += Math.sin(elapsed * 2 + m.z) * 0.15;
    m.flash = Math.max(0, m.flash - dt);
    mesh.scale.setScalar((m.small ? 0.55 : 1) * (1 + m.flash));
  }
  for (const a of [...arrows]) {
    a.life -= dt;
    a.mesh.position.addScaledVector(a.vel, dt);
    const p = a.mesh.position;
    const hitBlock = blocks.has(
      key(Math.round(p.x), Math.round(p.y), Math.round(p.z)),
    );
    const hitBiel =
      p.distanceTo(new THREE.Vector3(player.x, player.y + 0.9, player.z)) <
      0.75;
    if (hitBiel)
      hurtPlayer(MONSTERS.archer.damage, {
        x: p.x - a.vel.x,
        z: p.z - a.vel.z,
      });
    if (hitBiel || hitBlock || a.life <= 0) {
      scene.remove(a.mesh);
      arrows = arrows.filter((x) => x !== a);
    }
  }
  const btn = app.querySelector(".attack-btn");
  if (btn)
    btn.classList.toggle(
      "hidden",
      !monsters.some((m) => Math.hypot(m.x - player.x, m.z - player.z) < 3.5),
    );
}
// Torches and lanterns light up the night around Biel (nearest few only).
const torchLights = Array.from({ length: 6 }, () => {
  const light = new THREE.PointLight(0xffb35a, 0, 10, 1.6);
  scene.add(light);
  return light;
});
let lightClock = 0;
function updateTorchLights(dt, daylight) {
  lightClock -= dt;
  if (lightClock > 0) return;
  lightClock = 0.5;
  const count = settings.quality === "high" ? 6 : 3;
  const nearest = lightBlocks
    .map((b) => [
      Math.hypot(b[0] - player.x, b[1] - player.y, b[2] - player.z),
      b,
    ])
    .filter(([d]) => d < 24)
    .sort((a, b) => a[0] - b[0])
    .slice(0, count);
  torchLights.forEach((light, i) => {
    const b = nearest[i]?.[1];
    light.intensity = b ? (1 - daylight) * 7 : 0;
    if (b) light.position.set(b[0], b[1] + 0.3, b[2]);
  });
}
// Weather: rain drops around the camera, a darker sky and soft thunder.
const DROPS = 2000;
const rainGeometry = new THREE.BufferGeometry();
const rainPositions = new Float32Array(DROPS * 6);
for (let i = 0; i < DROPS; i++) {
  const x = (Math.random() - 0.5) * 26,
    y = Math.random() * 24,
    z = (Math.random() - 0.5) * 26;
  rainPositions.set([x, y, z, x + 0.08, y - 0.8, z], i * 6);
}
rainGeometry.setAttribute(
  "position",
  new THREE.BufferAttribute(rainPositions, 3),
);
const rain = new THREE.LineSegments(
  rainGeometry,
  new THREE.LineBasicMaterial({
    color: 0x5f7f99,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  }),
);
rain.frustumCulled = false;
scene.add(rain);
const STORM_SKY = new THREE.Color(0x5d6b73);
let rainSound = null;
function rainNoise(level) {
  if (!settings.volume.ambient || level < 0.05) {
    if (rainSound) rainSound.gain.gain.value = 0;
    return;
  }
  try {
    const audio = audioContext();
    if (!rainSound) {
      const buffer = audio.createBuffer(
        1,
        audio.sampleRate * 2,
        audio.sampleRate,
      );
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const source = audio.createBufferSource(),
        filter = audio.createBiquadFilter(),
        gain = audio.createGain();
      source.buffer = buffer;
      source.loop = true;
      filter.type = "lowpass";
      filter.frequency.value = 900;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(audio.destination);
      source.start();
      rainSound = { source, gain };
    }
    rainSound.gain.gain.value = level * 0.035 * settings.volume.ambient;
  } catch {}
}
function thunder() {
  overlay.className = "flash";
  setTimeout(() => (overlay.className = ""), 160);
  if (!settings.sound) return;
  try {
    const audio = audioContext(),
      at = audio.currentTime + 0.4,
      osc = audio.createOscillator(),
      gain = audio.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(55, at);
    osc.frequency.exponentialRampToValueAtTime(30, at + 1.6);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(
      0.05 * settings.volume.ambient + 0.0001,
      at + 0.1,
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 1.8);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(at);
    osc.stop(at + 1.9);
  } catch {}
}
function updateWeather(dt, inGame) {
  let state = "clear";
  if (inGame && world.options.weather) {
    world.weather = validateWeather(world.weather);
    if (world.age >= world.weather.until)
      world.weather = {
        state: nextWeather(Math.random, world.options.difficulty),
        until: world.age + weatherLength(Math.random),
      };
    state = world.weather.state;
  }
  rainLevel = approach(rainLevel, LOOK[state].rain, dt);
  darkLevel = approach(darkLevel, LOOK[state].dark, dt, 0.15);
  // The sky, light and clouds turn grey with the weather.
  scene.background.lerp(STORM_SKY, darkLevel);
  scene.fog.color.copy(scene.background);
  hemi.intensity *= 1 - darkLevel * 0.6;
  sun.intensity *= 1 - darkLevel * 1.4;
  cloudMat.color.setRGB(
    1 - darkLevel * 0.5,
    0.98 - darkLevel * 0.5,
    0.92 - darkLevel * 0.45,
  );
  // Snow in the cold biome, and no rain under a roof or in a cave.
  const snowing = lastBiome === "snow",
    sheltered =
      inGame &&
      topAt(Math.round(player.x), Math.round(player.z)) > player.y + 2;
  rain.visible = rainLevel > 0.01 && !sheltered;
  rain.material.opacity = rainLevel * 0.8;
  rain.material.color.set(snowing ? 0xffffff : 0x5f7f99);
  if (rain.visible) {
    const count = settings.quality === "high" ? DROPS : 700;
    rain.geometry.setDrawRange(0, count * 2);
    rain.position.set(
      camera.position.x,
      camera.position.y - 10,
      camera.position.z,
    );
    const fall = dt * (snowing ? 4 : 22);
    for (let i = 0; i < count; i++) {
      const o = i * 6;
      rainPositions[o + 1] -= fall;
      rainPositions[o + 4] -= fall;
      if (rainPositions[o + 1] < 0) {
        rainPositions[o + 1] += 24;
        rainPositions[o + 4] += 24;
      }
    }
    rain.geometry.attributes.position.needsUpdate = true;
  }
  rainNoise(inGame && !snowing ? rainLevel * (sheltered ? 0.4 : 1) : 0);
  if (inGame && state === "storm") {
    thunderClock -= dt;
    if (thunderClock <= 0) {
      thunderClock = 6 + Math.random() * 12;
      thunder();
    }
  }
}
function pick() {
  // First person with a mouse aims with the crosshair; touch aims where the finger tapped.
  ray.setFromCamera(
    (firstPerson && pointerKind !== "touch") || pointerKind === "pad"
      ? center
      : pointer,
    camera,
  );
  const hits = ray.intersectObjects(meshes, false);
  target = null;
  outline.visible = false;
  // A monster or a friendly animal in front of the blocks wins.
  targetMonster = null;
  const monsterHit = ray.intersectObjects(monsterGroup.children, true)[0];
  if (monsterHit && (!hits[0] || monsterHit.distance < hits[0].distance)) {
    let o = monsterHit.object;
    while (o && !o.userData.monster) o = o.parent;
    if (o && o.position.distanceTo(player) < 5) {
      targetMonster = o.userData.monster;
      return;
    }
  }
  targetAnimal = null;
  const animalHit = ray.intersectObjects(animalGroup.children, true)[0];
  if (animalHit && (!hits[0] || animalHit.distance < hits[0].distance)) {
    let o = animalHit.object;
    while (o && !o.userData.animal) o = o.parent;
    if (
      o &&
      o.userData.animal !== riding &&
      o.position.distanceTo(player) < 5
    ) {
      targetAnimal = o.userData.animal;
      return;
    }
  }
  for (const hit of hits) {
    const p = hit.object.userData.cells[hit.instanceId];
    if (new THREE.Vector3(...p).distanceTo(player) < 7) {
      target = { p, normal: hit.face.normal };
      outline.position.set(...p);
      outline.visible = true;
      break;
    }
  }
}
// Holding Break (button, touch or mouse) chips away at the targeted block.
function updateBreaking(dt) {
  breakCooldown -= dt;
  const holding = pressed("Break") || mouseBreak;
  if (!holding || !target) {
    breaking = { key: null, time: 0 };
    outline.material.color.set(0xfff3b6);
    return;
  }
  const k = key(...target.p);
  if (breaking.key !== k) breaking = { key: k, time: 0 };
  breaking.time += dt;
  const needed = creative() ? 0 : breakTime(blocks.get(k), heldId());
  const progress = needed ? Math.min(1, breaking.time / needed) : 1;
  outline.material.color.setHSL(
    0.12 - progress * 0.1,
    1,
    0.75 - progress * 0.2,
  );
  if (progress >= 1 && breakCooldown <= 0) {
    edit(false);
    breaking = { key: null, time: 0 };
    // In Creative, holding Break keeps breaking at a calm pace.
    breakCooldown = creative() ? 0.25 : 0;
  }
}
function beepAt(from, to, delay = 0) {
  try {
    const audio = audioContext(),
      at = audio.currentTime + delay,
      osc = audio.createOscillator(),
      gain = audio.createGain();
    osc.frequency.setValueAtTime(from, at);
    osc.frequency.exponentialRampToValueAtTime(to, at + 0.1);
    gain.gain.setValueAtTime(0.06 * settings.volume.fx + 0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.001, at + 0.12);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(at);
    osc.stop(at + 0.13);
  } catch {}
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
    gain.gain.setValueAtTime(
      0.08 * settings.volume.fx + 0.0001,
      audio.currentTime,
    );
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
const heldId = () => inventory.slots[selected]?.id ?? null;
// Beds: the newest one becomes home; at night, sleeping skips to the morning.
// A real home: a bed with a door and a glass window close by.
function isHouse(p) {
  let door = false,
    glass = false;
  for (let x = p[0] - 5; x <= p[0] + 5; x++)
    for (let y = p[1] - 2; y <= p[1] + 3; y++)
      for (let z = p[2] - 5; z <= p[2] + 5; z++) {
        const type = blocks.get(key(x, y, z));
        if (type === DOOR || type === DOOR_OPEN) door = true;
        if (type === GLASS) glass = true;
      }
  return door && glass;
}
function sleepIn(p) {
  if (monsters.some((m) => Math.hypot(m.x - player.x, m.z - player.z) < 10)) {
    toast(t("cantSleep"));
    return;
  }
  world.spawnPoint = [...p];
  if (isNight() && world.options.cycle === "normal") {
    fadeScreen();
    timeOfDay = 0.02;
    world.day++;
    toast(t("sleepNight"));
    emit("sleep");
    if (isHouse(p)) emit("house");
  } else toast(t("sleepDay"));
  scheduleSave();
}
const overlay = document.createElement("div");
overlay.id = "overlay";
document.body.append(overlay);
function fadeScreen() {
  overlay.className = "sleep";
  setTimeout(() => (overlay.className = ""), 1200);
}
function hurtFlash() {
  overlay.className = "hurt";
  setTimeout(() => (overlay.className = ""), 280);
}
function chomp() {
  if (!settings.sound) return;
  for (const delay of [0, 0.12]) beepAt(300, 200, delay);
}
// Backpacks left behind on harder difficulties, waiting to be picked up.
const backpackGroup = new THREE.Group();
scene.add(backpackGroup);
const backpackMaterial = new THREE.MeshStandardMaterial({
  color: 0xe9852b,
  roughness: 0.8,
});
const backpackGeometry = new THREE.BoxGeometry(0.5, 0.55, 0.35);
function rebuildBackpacks() {
  backpackGroup.clear();
  for (const pack of world?.backpacks ?? []) {
    const m = new THREE.Mesh(backpackGeometry, backpackMaterial);
    m.position.set(pack.x, pack.y + 0.3, pack.z);
    m.userData.pack = pack;
    backpackGroup.add(m);
  }
}
function fallAsleep() {
  mode = "asleep";
  keys.clear();
  touchInput.clear();
  if (!world.options.keepInventory && inventory.slots.some(Boolean)) {
    world.backpacks.push({
      x: player.x,
      y: player.y,
      z: player.z,
      items: inventory.toJSON(),
    });
    inventory = new Inventory();
    rebuildBackpacks();
    setTimeout(() => toast(t("backpackLeft")), 300);
  }
  save();
  render();
}
// Hearts, drumsticks and bubbles, only redrawn when something changes.
let vitalsShown = "";
function updateVitalsHud(underwater) {
  const el = app.querySelector(".vitals");
  if (!el) return;
  const air = Math.ceil(vitals.air);
  const sig = `${vitals.health}|${vitals.food}|${air}|${underwater}`;
  if (sig === vitalsShown && el.childElementCount) return;
  vitalsShown = sig;
  const row = (value, cls) =>
    Array.from({ length: 10 }, (_, i) => {
      const v = value - i * 2;
      return `<i class="${cls} ${v >= 2 ? "full" : v >= 1 ? "half" : "empty"}"></i>`;
    }).join("");
  el.innerHTML = `<span class="hearts" aria-label="${t("health")} ${vitals.health / 2}/10">${row(vitals.health, "heart")}</span>${
    world.options.hunger
      ? `<span class="foods" aria-label="${t("food")} ${Math.floor(vitals.food / 2)}/10">${row(vitals.food, "drum")}</span>`
      : ""
  }${underwater || air < MAX_AIR ? `<span class="bubbles">${'<i class="bubble"></i>'.repeat(air)}</span>` : ""}`;
}
function setBlock(p, type) {
  const k = key(...p);
  blocks.set(k, type);
  edits.set(k, type);
}
// Height of the highest block in a column (the water line is just above 1).
function topAt(x, z) {
  for (let y = MAX_Y; y >= 0; y--) if (blocks.has(key(x, y, z))) return y;
  return -1;
}
// Every few seconds, crops may grow a stage; water nearby (or rain) helps.
function growCrops(dt) {
  growClock -= dt;
  if (growClock > 0) return;
  const step = 5 - growClock;
  growClock = 5;
  const changed = [];
  for (const k of cropKeys) {
    const type = blocks.get(k);
    if (!cropInfo(type)) continue;
    const [x, , z] = k.split(",").map(Number);
    const grown = growCrop(
      type,
      step,
      raining() || isWatered(topAt, x, z),
      Math.random(),
    );
    if (grown !== type) {
      blocks.set(k, grown);
      edits.set(k, grown);
      changed.push(k.split(",").map(Number));
    }
  }
  if (changed.length) rebuildAt(...changed);
}
const raining = () => rainLevel > 0.5;
const bobber = new THREE.Mesh(
  new THREE.SphereGeometry(0.09, 8, 6),
  new THREE.MeshStandardMaterial({ color: 0xe6574a }),
);
bobber.visible = false;
scene.add(bobber);
function castLine() {
  const waterHit = new THREE.Raycaster();
  waterHit.setFromCamera(
    (firstPerson && pointerKind !== "touch") || pointerKind === "pad"
      ? center
      : pointer,
    camera,
  );
  const hit = waterHit.intersectObject(water)[0];
  if (
    !hit ||
    hit.point.distanceTo(player) > 10 ||
    topAt(Math.round(hit.point.x), Math.round(hit.point.z)) + 0.5 >= WATER_LEVEL
  )
    return;
  fishing = { until: elapsed + 2 + Math.random() * 3, from: player.clone() };
  bobber.position.copy(hit.point);
  bobber.visible = true;
  toast(t("fishing"));
}
function updateFishing() {
  if (!fishing) return;
  bobber.position.y = WATER_LEVEL + 0.05 + Math.sin(elapsed * 4) * 0.03;
  if (player.distanceTo(fishing.from) > 3 || ITEMS[heldId()]?.tool !== "rod") {
    fishing = null;
    bobber.visible = false;
  } else if (elapsed >= fishing.until) {
    fishing = null;
    bobber.visible = false;
    if (!creative() && inventory.add("fish", 1)) toast(t("full"));
    else toast(t("caught"));
    beepAt(700, 1000);
    render();
  }
}
// Signs: the text floats just above the board.
const signGroup = new THREE.Group();
scene.add(signGroup);
function refreshSigns() {
  signGroup.clear();
  for (const [k, text] of Object.entries(world?.signs ?? {})) {
    if (blocks.get(k) !== SIGN) continue;
    const [x, y, z] = k.split(",").map(Number);
    const tag = nameTag(text);
    tag.position.set(x, y + 0.75, z);
    signGroup.add(tag);
  }
}
function editSign(k) {
  signKey = k;
  mode = "signtext";
  render();
  $("#sign-text")?.focus();
}
// Chests and furnaces. A chest found in ruins or cabins is filled with
// treasure the first time it is opened.
function chestAt(k) {
  if (!world.chests[k]) {
    const [x, y, z] = k.split(",").map(Number);
    const inv = new Inventory(27);
    for (const [id, n] of chestLoot(world.seed ?? 1, x, y, z)) inv.add(id, n);
    world.chests[k] = inv.toJSON();
  }
  return Inventory.from(world.chests[k], 27);
}
function openContainer(type, k) {
  container = { type, key: k };
  invPick = null;
  open(type === CHEST ? "chest" : "furnace");
  render();
}
function emptyContainer(type, k) {
  const items =
    type === CHEST
      ? chestAt(k)
          .slots.filter(Boolean)
          .map((s) => [s.id, s.count])
      : ["input", "fuel", "output"]
          .map((slot) => validateFurnace(world.furnaces[k])[slot])
          .filter(Boolean);
  for (const [id, n] of items) if (inventory.add(id, n)) toast(t("full"));
  delete world.chests[k];
  delete world.furnaces[k];
}
// Moves a whole stack between the backpack and the open chest or furnace.
function moveStack(from, index) {
  if (container.type === CHEST) {
    const chest = chestAt(container.key);
    const [source, dest] =
      from === "bag" ? [inventory, chest] : [chest, inventory];
    const slot = source.slots[index];
    if (!slot) return;
    const left = dest.add(slot.id, slot.count);
    source.slots[index] = left ? { id: slot.id, count: left } : null;
    world.chests[container.key] = chest.toJSON();
  } else {
    const f = validateFurnace(world.furnaces[container.key]);
    if (from === "bag") {
      const slot = inventory.slots[index];
      if (!slot) return;
      const where = SMELT[slot.id] ? "input" : FUEL[slot.id] ? "fuel" : null;
      if (!where) return toast(t("notForFurnace"));
      if (f[where] && f[where][0] !== slot.id) {
        // Swap through the slot being emptied, even when the backpack is full.
        const previous = f[where];
        f[where] = [slot.id, slot.count];
        inventory.slots[index] = { id: previous[0], count: previous[1] };
        f.progress = 0;
        world.furnaces[container.key] = f;
        scheduleSave();
        render();
        return;
      }
      const total = (f[where]?.[0] === slot.id ? f[where][1] : 0) + slot.count;
      f[where] = [slot.id, Math.min(64, total)];
      inventory.slots[index] =
        total > 64 ? { id: slot.id, count: total - 64 } : null;
    } else if (f[from]) {
      const left = inventory.add(...f[from]);
      f[from] = left ? [f[from][0], left] : null;
    }
    world.furnaces[container.key] = f;
  }
  scheduleSave();
  render();
}
// Furnaces keep cooking even when nobody is looking.
function updateFurnaces(dt) {
  for (const [k, raw] of Object.entries(world.furnaces)) {
    const f = validateFurnace(raw);
    tickFurnace(f, dt);
    world.furnaces[k] = f;
  }
  containerClock -= dt;
  if (mode === "furnace" && containerClock <= 0) {
    containerClock = 0.5;
    render();
  }
}
// Advanced recipes need a workbench within four blocks.
function nearBench() {
  const [px, py, pz] = [player.x, player.y, player.z].map(Math.round);
  for (let x = px - 4; x <= px + 4; x++)
    for (let y = py - 2; y <= py + 3; y++)
      for (let z = pz - 4; z <= pz + 4; z++)
        if (blocks.get(key(x, y, z)) === BENCH) return true;
  return false;
}
// A short "+1 Wood" note above the hotbar when something is collected.
let labelTimer;
function flashLabel(text) {
  const label = app.querySelector(".material-label");
  if (!label) return;
  label.textContent = text;
  label.classList.add("flash");
  clearTimeout(labelTimer);
  labelTimer = setTimeout(() => {
    label.textContent = itemName(heldId());
    label.classList.remove("flash");
  }, 1200);
}
function edit(place) {
  if (mode !== "playing") return;
  // Holding food: eat it instead of building.
  const food = ITEMS[heldId()]?.food;
  if (place && food && !creative()) {
    const heal = ITEMS[heldId()]?.heal ?? 0;
    if (heal && vitals.health < 20)
      vitals.health = Math.min(20, vitals.health + heal);
    if (eat(vitals, food) || heal) {
      const name = itemName(inventory.takeFrom(selected));
      toast(t("yum", { item: name }));
      chomp();
      render();
    } else flashLabel(t("notHungry"));
    return;
  }
  if (place && targetAnimal) {
    interactWith(targetAnimal);
    return;
  }
  // A bow shoots an arrow where Biel is aiming.
  if (place && ITEMS[heldId()]?.tool === "bow") {
    shootBow();
    return;
  }
  // Fishing: cast the line onto water in front of Biel.
  if (place && ITEMS[heldId()]?.tool === "rod") {
    castLine();
    return;
  }
  if (!target) return;
  const p = [...target.p];
  const targetType = blocks.get(key(...p)),
    above = key(p[0], p[1] + 1, p[2]);
  // A hoe turns grass or dirt into farmland.
  if (
    place &&
    ITEMS[heldId()]?.tool === "hoe" &&
    (targetType === 0 || targetType === 1) &&
    !blocks.has(above)
  ) {
    setBlock(p, FARMLAND);
    toast(t("tilled"));
    beepAt(200, 140);
    rebuildAt(p);
    scheduleSave();
    return;
  }
  // Seeds, carrots and potatoes are planted on farmland.
  const plants = ITEMS[heldId()]?.plants;
  if (place && plants && targetType === FARMLAND && !blocks.has(above)) {
    const name = itemName(heldId());
    setBlock([p[0], p[1] + 1, p[2]], cropBlock(plants, 0));
    if (!creative()) inventory.takeFrom(selected);
    toast(t("planted", { item: name }));
    beepAt(500, 700);
    rebuildAt(p);
    scheduleSave();
    render();
    return;
  }
  const usedType = blocks.get(key(...p));
  if (place && (usedType === CHEST || usedType === FURNACE)) {
    openContainer(usedType, key(...p));
    return;
  }
  if (place && blocks.get(key(...p)) === BED) {
    sleepIn(p);
    return;
  }
  // Gates and trapdoors open and close too (not on top of Biel).
  const swing = OPENS[blocks.get(key(...p))];
  if (place && swing) {
    const k0 = key(...p),
      before = blocks.get(k0);
    blocks.set(k0, swing);
    if (collides(blocks, player)) {
      blocks.set(k0, before);
      return;
    }
    edits.set(k0, swing);
    beep(true);
    rebuildAt(p);
    scheduleSave();
    return;
  }
  // Writing on a sign.
  if (place && blocks.get(key(...p)) === SIGN) {
    editSign(key(...p));
    return;
  }
  // Building on a door opens or closes it instead.
  if (place && isDoor(blocks.get(key(...p)))) {
    const changed = toggleDoor(blocks, ...p);
    if (collides(blocks, player)) {
      toggleDoor(blocks, ...p);
      return;
    }
    for (const k of changed) edits.set(k, blocks.get(k));
    beep(true);
    rebuildAt(p);
    pick();
    scheduleSave();
    return;
  }
  if (place) {
    p[0] += Math.round(target.normal.x);
    p[1] += Math.round(target.normal.y);
    p[2] += Math.round(target.normal.z);
  }
  if (
    Math.abs(p[0]) > SIZE ||
    Math.abs(p[2]) > SIZE ||
    p[1] < 1 ||
    p[1] > MAX_Y - 1
  )
    return;
  const k = key(...p);
  const held = ITEMS[heldId()];
  if (place) {
    if (held?.block === undefined || blocks.has(k)) return;
    const type = held.block;
    blocks.set(k, type);
    if (collides(blocks, player)) {
      blocks.delete(k);
      return;
    }
    edits.set(k, type);
    if (!creative()) inventory.takeFrom(selected);
    if (type === CHEST) world.chests[k] = [];
    if (type === SIGN) setTimeout(() => editSign(k));
    if (type === FURNACE) world.furnaces[k] = emptyFurnace();
    emit("place");
    if (type === TORCH) emit("place:torch");
    // Doors are two blocks tall when there is room above.
    const above = key(p[0], p[1] + 1, p[2]);
    if (type === DOOR && p[1] < MAX_Y - 1 && !blocks.has(above)) {
      blocks.set(above, DOOR);
      if (collides(blocks, player)) blocks.delete(above);
      else edits.set(above, DOOR);
    }
  } else {
    const type = blocks.get(k);
    burst(p, type);
    if (type === CHEST || type === FURNACE) emptyContainer(type, k);
    if (type === SIGN) {
      delete world.signs[k];
      refreshSigns();
    }
    tutorialEvent("break");
    // Adventure: what you break goes into the backpack.
    if (!creative()) {
      const got = drops(type, heldId(), Math.random());
      if (cropInfo(type)?.crop === "wheat" && cropInfo(type).stage === 3)
        emit("harvest:wheat");
      for (const [id] of got) {
        emit("got:" + id);
        if (id === "iron_ore") emit("got:iron");
      }
      for (const [id, n] of got) if (inventory.add(id, n)) toast(t("full"));
      if (got.length)
        setTimeout(() => flashLabel(`+${got[0][1]} ${itemName(got[0][0])}`));
    }
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
  rebuildAt(p);
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
  if (targetMonster && e.button === 0 && e.pointerType !== "touch") {
    attack();
    return;
  }
  // Adventure: holding the left mouse button breaks the block under it.
  mouseBreak =
    !creative() && e.pointerType !== "touch" && e.button === 0 && !e.shiftKey;
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
    if (Math.abs(dx) + Math.abs(dy) > 2) {
      pointerDown.moved = true;
      mouseBreak = false;
    }
    yaw -= dx * 0.006;
    if (mode === "playing") tutorialEvent("look", Math.abs(dx) * 0.006);
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
    const place = pointerDown.button === 2 || e.shiftKey;
    // Creative breaks on click; Adventure breaks while the button is held.
    if (e.pointerType === "touch" && targetMonster) attack();
    else if (e.pointerType === "touch" && targetAnimal)
      interactWith(targetAnimal);
    else if (e.pointerType !== "touch" && (place || creative())) edit(place);
  }
  pointerDown = null;
  mouseBreak = false;
};
canvas.onpointercancel = (e) => {
  if (pointerDown?.id === e.pointerId) pointerDown = null;
  mouseBreak = false;
};
canvas.onwheel = (e) => {
  if (mode !== "playing" || !e.deltaY) return;
  selected = (selected + Math.sign(e.deltaY) + 9) % 9;
  render();
};
window.addEventListener("keydown", (e) => {
  if (["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName))
    return;
  const wasMode = mode;
  if (mode === "playing") {
    if (
      ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
        e.code,
      )
    )
      e.preventDefault();
    keys.add(e.code);
    if (e.code === "Space" && !e.repeat) jumpTapped();
    if (/^[1-9]$/.test(e.key)) {
      selected = +e.key - 1;
      render();
    }
    if (e.code === "KeyE" && !e.repeat) action("inventory");
    if (e.code === "KeyF" && !e.repeat) attack();
    if (e.code === "KeyC" && !e.repeat && riding) dismount();
    if (e.code === "KeyV" && !e.repeat) togglePerspective();
  }
  if (e.code === "Escape" && !e.repeat) {
    if (mode === "playing") action("pause");
    else if (mode === "paused") action("play");
    else if (MODALS.includes(mode)) action("back");
  } else if (e.code === "KeyE" && !e.repeat && wasMode === "inventory") {
    action("back");
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
  pollGamepad(dt);
  if (mode === "playing") scenery = "game";
  if (mode === "menu" || mode === "splash") scenery = "menu";
  if (mode === "playing" && world.options.cycle === "normal") {
    timeOfDay += dt / DAY_LENGTHS[world.options.dayLength];
    if (timeOfDay >= 1) {
      timeOfDay -= 1;
      world.day++;
      if (!creative()) emit("night");
    }
  }
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
        (riding ? 2 : 1) *
        (inWater(blocks, player.x, player.y + 0.9, player.z) ? 0.6 : 1);
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
    const swimming = inWater(blocks, player.x, player.y + 0.9, player.z);
    const onLadder = [0.1, 1].some(
      (dy) =>
        blocks.get(
          key(
            Math.round(player.x),
            Math.round(player.y + dy),
            Math.round(player.z),
          ),
        ) === LADDER,
    );
    if (flying) {
      velocity = (pressed("Space") ? 6 : 0) - (pressed("KeyC") ? 6 : 0);
    } else if (onLadder) {
      velocity =
        pressed("Space") || pressed("KeyW") || pressed("ArrowUp") ? 3 : -1.2;
    } else if (swimming) {
      velocity = pressed("Space")
        ? Math.min(velocity + 30 * dt, 3)
        : Math.max(velocity - 6 * dt, -1.5);
    } else {
      if (pressed("Space") && grounded) {
        velocity = riding ? 8.5 : 7;
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
        // Landing while flying ends the flight.
        if (flying && velocity < 0) setFlying(false);
        velocity = 0;
        break;
      }
    }
    if (player.y < -5) spawn();
    world.age += dt;
    // Visiting a new biome counts for the explorer sticker.
    biomeClock -= dt;
    if (biomeClock <= 0) {
      biomeClock = 1;
      const here = biomeAt(Math.round(player.x), Math.round(player.z));
      if (here !== lastBiome) {
        lastBiome = here;
        if (here !== "valley") emit("biome:" + here);
      }
    }
    // Break reminder set by the parents.
    playSeconds += dt;
    if (reminderDue(playSeconds, settings.parents.reminder)) {
      save();
      mode = "rest";
      render();
    }
    if (dx || dz) tutorialEvent("walk", speed * dt);
    updateAnimals(dt);
    breedAnimals(dt);
    updateMinimap(dt);
    updateFurnaces(dt);
    updateMonsters(dt);
    updateBielArrows(dt);
    growCrops(dt);
    updateFishing();
    // Adventure: falls, hunger, air and health.
    if (!creative()) {
      if (grounded || swimming || flying || onLadder) {
        if (peakY !== null && grounded) {
          const before = vitals.health;
          hurt(vitals, fallDamage(peakY - player.y), rules());
          if (vitals.health < before) hurtFlash();
        }
        peakY = null;
      } else peakY = Math.max(peakY ?? player.y, player.y);
      const underwater = inWater(blocks, player.x, player.y + 1.6, player.z),
        moving = dx || dz,
        running = pressed("ShiftLeft") || pressed("ShiftRight");
      const before = vitals.health;
      tick(vitals, dt, {
        rules: rules(),
        hunger: world.options.hunger,
        exertion: moving ? (running ? 1 : 0.3) : 0,
        underwater,
      });
      if (vitals.health < before) hurtFlash();
      updateVitalsHud(underwater);
      for (const m of [...backpackGroup.children]) {
        m.rotation.y += dt;
        const pack = m.userData.pack;
        if (m.position.distanceTo(player) < 1.4 && !(pack.wait > elapsed)) {
          // Whatever does not fit stays in the backpack on the ground.
          pack.items = pack.items.flatMap((slot) => {
            if (!slot) return [];
            const left = inventory.add(slot[0], slot[1]);
            return left ? [[slot[0], left]] : [];
          });
          if (pack.items.length) {
            pack.wait = elapsed + 5;
            toast(t("full"));
          } else {
            world.backpacks = world.backpacks.filter((b) => b !== pack);
            rebuildBackpacks();
            toast(t("backpackFound"));
          }
          render();
        }
      }
      if (vitals.health <= 0) fallAsleep();
    }
    biel.position.copy(player);
    if (riding) biel.position.y += 0.75;
    biel.visible = !firstPerson;
    if (dx || dz) biel.rotation.y = Math.atan2(vx, vz);
    const stride =
      dx || dz
        ? Math.sin(elapsed * (speed > 4 ? 14 : 10)) * 0.65
        : Math.sin(elapsed * 2) * 0.035;
    leftLeg.rotation.x = stride;
    rightLeg.rotation.x = -stride;
    leftArm.rotation.x = -stride;
    rightArm.rotation.x = attackCooldown > 0.25 ? -1.6 : stride;
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
    updateBreaking(dt);
  } else if (mode === "menu" || mode === "splash") {
    biel.visible = true;
    biel.scale.setScalar(2.1);
    const [ax, az] = menuAnchor,
      groundY = height(ax, az);
    biel.position.set(ax + 6, height(ax + 6, az + 5) + 0.51, az + 5);
    biel.rotation.y = 0.55;
    leftArm.rotation.x = Math.sin(elapsed * 2) * 0.12;
    rightArm.rotation.z = -0.15 + Math.sin(elapsed * 2) * 0.08;
    head.rotation.z = Math.sin(elapsed) * 0.04;
    camera.position.set(
      ax + 12 + Math.sin(elapsed * 0.07) * 1.3,
      groundY + 8,
      az + 17,
    );
    camera.lookAt(ax - 3, groundY + 1, az);
    outline.visible = false;
  }
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
    water.position.y = WATER_LEVEL + Math.sin(elapsed * 0.7) * 0.035;
  clouds.rotation.y = elapsed * 0.003;
  // The menu always shows a sunny day; the game follows the clock.
  const skyNow = applySky(scenery === "game" ? skyTime() : NOON + 0.03);
  cullChunks();
  updateTorchLights(dt, skyNow.daylight);
  updateBirds(dt, skyNow.daylight);
  updateWeather(dt, scenery === "game" && !!world);
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
  updateStats(dt);
}
// The saved world loads once every part of the scene exists.
if (world) loadWorld(world);
setTimeout(syncNow, 1500);
render();
// Performance numbers, shown with F3 or a triple tap with two fingers.
const statsEl = document.createElement("div");
statsEl.id = "stats";
document.body.append(statsEl);
let statsOn = false,
  statsFrames = 0,
  statsClock = 0,
  twoFingerTaps = [];
function toggleStats() {
  statsOn = !statsOn;
  statsEl.classList.toggle("show", statsOn);
}
window.addEventListener("keydown", (e) => {
  if (e.code === "F3") {
    e.preventDefault();
    toggleStats();
  }
});
window.addEventListener(
  "touchstart",
  (e) => {
    if (e.touches.length !== 2) return;
    const now = performance.now();
    twoFingerTaps = [...twoFingerTaps.filter((t0) => now - t0 < 900), now];
    if (twoFingerTaps.length >= 3) {
      twoFingerTaps = [];
      toggleStats();
    }
  },
  { passive: true },
);
function updateStats(dt) {
  statsFrames++;
  statsClock += dt;
  if (!statsOn || statsClock < 0.5) return;
  const shown = [...chunks.values()].filter((c) => c.meshes[0]?.visible).length;
  statsEl.textContent = `${Math.round(statsFrames / statsClock)} fps · ${renderer.info.render.calls} draws · ${Math.round(renderer.info.render.triangles / 1000)}k tris · ${shown}/${chunks.size} chunks · ${blocks.size} blocks · ${animals.length} animals · ${monsters.length} monsters · ${settings.quality}${lowPower ? " · low power" : ""}`;
  statsFrames = 0;
  statsClock = 0;
}
// Low Power Mode: draw at about 30 frames per second.
let lowPower = false,
  lastDrawn = 0;
window.nativePowerSaving = (on) => (lowPower = !!on);
function animate(now) {
  if (!lowPower || now - lastDrawn > 30) {
    lastDrawn = now;
    frame(now);
  }
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

// An imported file always becomes a new world, so nothing is overwritten.
function applyImportedWorld(json) {
  const imported = validateWorld(JSON.parse(json), { id: makeId() });
  if (!imported) throw Error("Invalid world");
  if (store.list().length >= MAX_WORLDS) {
    toast(t("worldFull"));
    return;
  }
  if (world) save();
  imported.id = makeId();
  store.save(imported);
  loadWorld(imported);
  toast(t("saved"));
  render();
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
    const hold = (id) => {
      inventory.slots[0] = { id, count: 1 };
      selected = 0;
    };
    const check = (name, ok) => {
      checks.push({ name, ok: !!ok });
      if (!ok) throw Error(name);
    };
    // The intro may still be showing on a slower device.
    leaveSplash();
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
    check("first play opens the new world screen", mode === "newworld");
    draft.mode = "creative";
    draft.options = normalizeOptions({ difficulty: "peaceful" });
    // The older checks were written for the classic valley.
    if (draft.seed === "") draft.size = "classic";
    action("create");
    check(
      "creative world created",
      world?.mode === "creative" &&
        mode === "playing" &&
        store.list().length === 1,
    );
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
    hold("brick");
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
    hold("glass");
    edit(true);
    check(
      "glass shows the block below",
      blocks.get(key(gx, gy + 1, gz)) === GLASS && isRendered(gx, gy, gz),
    );
    target = {
      p: [gx + 1, height(gx + 1, gz), gz],
      normal: new THREE.Vector3(0, 1, 0),
    };
    hold("door");
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
    check("save round trip", store.load(world.id).edits.length > 0);
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
    // A second world, then delete it from the list in two steps.
    const firstId = world.id;
    action("pause");
    action("worlds");
    action("newworld");
    draft.options = normalizeOptions({ difficulty: "normal" });
    // The older checks were written for the classic valley.
    if (draft.seed === "") draft.size = "classic";
    action("create");
    check(
      "adventure world on normal",
      world.mode === "adventure" && world.options.monsters,
    );
    check("adventure starts with apples", inventory.count("apple") === 3);
    target = { p: [2, height(2, 2), 2], normal: new THREE.Vector3(0, 1, 0) };
    touchInput.press(201, "Break");
    updateBreaking(0.1);
    check(
      "breaking takes time in adventure",
      blocks.has(key(2, height(2, 2), 2)),
    );
    for (let i = 0; i < 12; i++) {
      target = { p: [2, height(2, 2), 2], normal: new THREE.Vector3(0, 1, 0) };
      updateBreaking(0.1);
    }
    touchInput.release(201);
    check("holding Break collects dirt", inventory.count("dirt") === 1);
    inventory.add("wood", 1);
    action("craft", "planks");
    check("craft planks from wood", inventory.count("planks") === 4);
    inventory.add("planks", 2);
    const doorRecipe = RECIPES.find((r) => r.id === "door");
    check(
      "door needs a workbench",
      !canCraft(inventory, doorRecipe, nearBench()),
    );
    blocks.set(
      key(Math.round(player.x) + 2, Math.round(player.y), Math.round(player.z)),
      BENCH,
    );
    check(
      "workbench nearby unlocks the door",
      canCraft(inventory, doorRecipe, nearBench()),
    );
    action("inventory");
    check(
      "backpack screen lists recipes",
      app.querySelectorAll(".recipe").length === RECIPES.length,
    );
    action("back");
    // Survival on Normal: damage, food, falls, beds, falling asleep.
    hurt(vitals, 4, rules());
    check("normal difficulty hurts", vitals.health === 16);
    vitals.food = 10;
    hold("apple");
    edit(true);
    check("eating an apple", vitals.food === 14 && heldId() === null);
    vitals.hurtCooldown = 0;
    const healthBeforeFall = vitals.health;
    player.y += 9;
    velocity = 0;
    for (let i = 0; i < 90; i++) frame(last + 16);
    check("a long fall hurts", vitals.health < healthBeforeFall && grounded);
    const bedPos = [
      Math.round(player.x) + 1,
      Math.round(player.y),
      Math.round(player.z) + 1,
    ];
    blocks.set(key(...bedPos), BED);
    timeOfDay = 0.75;
    target = { p: bedPos, normal: new THREE.Vector3(0, 1, 0) };
    edit(true);
    check(
      "sleeping at night skips to morning",
      timeOfDay < 0.1 &&
        world.day === 2 &&
        world.spawnPoint.join() === bedPos.join(),
    );
    inventory.add("stone", 5);
    const awayFromHome = [player.x + 4, player.y, player.z];
    player.set(...awayFromHome);
    while (collides(blocks, player)) player.y++;
    awayFromHome[1] = player.y;
    vitals.health = 0;
    frame(last + 16);
    check(
      "falling asleep leaves the backpack behind on normal",
      mode === "asleep" &&
        world.backpacks.length === 1 &&
        !inventory.count("stone"),
    );
    action("wake");
    check(
      "waking up at the bed",
      mode === "playing" &&
        vitals.health === 20 &&
        Math.abs(player.x - bedPos[0]) < 0.5,
    );
    player.set(...awayFromHome);
    frame(last + 16);
    check(
      "walking to the backpack gets everything back",
      inventory.count("stone") === 5 && world.backpacks.length === 0,
    );
    // Animals: products, waiting time and a dog that becomes a friend.
    check(
      "animals in the new world",
      animals.length === 19 && animalGroup.children.length === 19,
    );
    const cow = animals.find((x) => x.type === "cow"),
      dog = animals.find((x) => x.type === "dog");
    interactWith(cow);
    check("the cow gives milk", inventory.count("milk") === 1);
    interactWith(cow);
    check("the cow needs a rest", inventory.count("milk") === 1);
    interactWith(animals.find((x) => x.type === "sheep"));
    check("shearing gives wool", inventory.count("wool") === 2);
    hold("apple");
    interactWith(dog);
    check("the dog wants a treat", !dog.tamed);
    inventory.add("treat", 1);
    hold("treat");
    interactWith(dog);
    check("a treat makes a friend", dog.tamed && mode === "namedog");
    $("#dog-name").value = "Faísca";
    action("namedone");
    check("the dog gets a name", dog.name === "Faísca" && mode === "playing");
    dog.x = player.x + 10;
    dog.z = player.z;
    for (let i = 0; i < 150; i++) frame(last + 16);
    check(
      "the dog follows Biel",
      Math.hypot(dog.x - player.x, dog.z - player.z) < 4,
    );
    save();
    check(
      "animals are saved",
      store.load(world.id).creatures.find((x) => x.type === "dog").name ===
        "Faísca",
    );
    // More animals: babies, a shy rabbit, a cat friend and a horse to ride.
    const [cowA, cowB] = animals.filter((x) => x.type === "cow");
    cowB.x = cowA.x + 1;
    cowB.z = cowA.z;
    for (const c of [cowA, cowB]) {
      inventory.add("wheat", 1);
      hold("wheat");
      interactWith(c);
    }
    const herdBefore = animals.length;
    breedClock = 0;
    frame(last + 16);
    const calf = animals.find((x) => x.baby && x.type === "cow");
    check(
      "two happy cows have a calf",
      animals.length === herdBefore + 1 && calf,
    );
    world.age = calf.grownAt + 1;
    frame(last + 16);
    check("the calf grows up", !calf.baby);
    const bunny = animals.find((x) => x.type === "rabbit");
    bunny.x = player.x + 1.5;
    bunny.z = player.z;
    bunny.y = surfaceY(bunny.x, bunny.z, player.y + 2);
    frame(last + 16);
    for (let i = 0; i < 30; i++) frame(last + 16);
    check(
      "the rabbit hops away",
      Math.hypot(bunny.x - player.x, bunny.z - player.z) > 2,
    );
    const kitty = animals.find((x) => x.type === "cat");
    inventory.add("fish", 1);
    hold("fish");
    interactWith(kitty);
    check("fish makes the cat a friend", kitty.tamed && mode === "namedog");
    action("namedone");
    const pony = animals.find((x) => x.type === "horse");
    inventory.add("apple", 30);
    hold("apple");
    inventory.slots[0].count = 30;
    for (let i = 0; i < 30 && !pony.tamed; i++) interactWith(pony);
    check("apples make the horse a friend", pony.tamed);
    action("namedone");
    interactWith(pony);
    check("riding the horse", riding === pony);
    // Compare identical unobstructed paths, not two random slopes or trees.
    player.set(0, MAX_Y + 2, 0);
    flying = true;
    velocity = 0;
    yaw = 0;
    const rideStart = player.clone();
    keys.add("KeyW");
    for (let i = 0; i < 30; i++) frame(last + 16);
    keys.delete("KeyW");
    const rideDistance = player.distanceTo(rideStart);
    dismount();
    player.copy(rideStart);
    const walkStart = player.clone();
    keys.add("KeyW");
    for (let i = 0; i < 30; i++) frame(last + 16);
    keys.delete("KeyW");
    check(
      "the horse is faster than walking",
      rideDistance > player.distanceTo(walkStart) * 1.3 && riding === null,
    );
    flying = false;
    // Monsters on Normal at night: appear, hurt, get chased off, vanish at dawn.
    dog.sitting = true;
    spawn();
    for (let i = 0; i < 20; i++) frame(last + 16);
    timeOfDay = 0.75;
    let spawned = null;
    for (let i = 0; i < 6 && !spawned; i++) spawned = trySpawnMonster();
    check(
      "monsters appear at night on normal",
      spawned && monsters.length >= 1,
    );
    for (const m of [...monsters]) removeMonster(m, false);
    const sleepyOne = addMonster("sleepy", {
      x: player.x + 0.9,
      y: player.y,
      z: player.z,
    });
    vitals.hurtCooldown = 0;
    vitals.health = 20;
    for (let i = 0; i < 100; i++) frame(last + 16);
    check(
      "a sleepwalker bumps into Biel",
      vitals.health < 20 && vitals.health > 0,
    );
    check(
      "you cannot sleep with a monster nearby",
      (() => {
        const day = world.day;
        sleepIn(bedPos);
        return world.day === day;
      })(),
    );
    hold("stone_sword");
    targetMonster = sleepyOne;
    attackCooldown = 0;
    attack();
    attackCooldown = 0;
    targetMonster = sleepyOne;
    attack();
    check(
      "the sword sends it off in sparkles",
      !monsters.includes(sleepyOne) && inventory.count("stick") >= 2,
    );
    const bigJelly = addMonster("jelly", {
      x: player.x + 1,
      y: player.y,
      z: player.z,
    });
    bigJelly.hp = 1;
    targetMonster = bigJelly;
    attackCooldown = 0;
    attack();
    check(
      "a jelly splits in two",
      monsters.filter((m) => m.small).length === 2,
    );
    const archerOne = addMonster("archer", {
      x: player.x + 7,
      y: player.y,
      z: player.z,
    });
    archerOne.cooldown = 0;
    frame(last + 16);
    check("the archer shoots suction-cup arrows", arrows.length >= 1);
    const monstersBefore = monsters.length;
    save();
    loadWorld(store.load(world.id));
    check(
      "monsters are saved with the world",
      monstersBefore > 0 && monsters.length === monstersBefore,
    );
    blocks.set(
      key(
        Math.round(player.x),
        Math.round(player.y) + 1,
        Math.round(player.z) + 3,
      ),
      TORCH,
    );
    rebuild();
    check("torches are light sources", lightBlocks.length > 0);
    timeOfDay = 0.3;
    for (let i = 0; i < 240; i++) frame(last + 16);
    check("monsters fizzle away at sunrise", monsters.length === 0);
    // The newer monsters: a climbing spider, Puffy and the cave ghost.
    world.options = normalizeOptions({
      ...world.options,
      difficulty: "hard",
      monsters: true,
    });
    timeOfDay = 0.75;
    const px0 = Math.round(player.x),
      pz0 = Math.round(player.z),
      floor0 = Math.round(player.y - 0.51);
    setBlock([px0 + 2, floor0 + 1, pz0], 2);
    setBlock([px0 + 2, floor0 + 2, pz0], 2);
    rebuildAt([px0 + 2, floor0 + 1, pz0]);
    const climber = addMonster("spider", { x: px0 + 3.6, y: player.y, z: pz0 });
    let highest = climber.y;
    for (let i = 0; i < 120; i++) {
      frame(last + 16);
      highest = Math.max(highest, climber.y);
    }
    check("the woolly spider climbs walls", highest > player.y + 1.5);
    removeMonster(climber, false);
    for (const m of [...monsters]) removeMonster(m, false);
    const built = [px0 - 1, floor0 + 1, pz0 - 1];
    setBlock(built, 6);
    const cloud = addMonster("puff", { x: px0 - 1.4, y: player.y, z: pz0 - 1 });
    cloud.fuse = 0;
    vitals.hurtCooldown = 0;
    vitals.health = 20;
    const editsBefore = [...edits.values()].filter((v) => v === null).length;
    frame(last + 16);
    check(
      "Puffy goes PUF: knocks natural blocks but never Biel's builds",
      !monsters.includes(cloud) &&
        blocks.get(key(...built)) === 6 &&
        [...edits.values()].filter((v) => v === null).length > editsBefore &&
        vitals.health < 20,
    );
    const roofX = Math.round(player.x),
      roofZ = Math.round(player.z),
      roofY = Math.round(player.y);
    for (let y = roofY + 4; y <= roofY + 6; y++) setBlock([roofX, y, roofZ], 2);
    timeOfDay = 0.3;
    let caveMonster = null;
    for (let i = 0; i < 30 && !caveMonster; i++)
      caveMonster = trySpawnMonster();
    check(
      "on Hard, caves have monsters even by day",
      underground() && caveMonster?.cave,
    );
    for (const m of [...monsters]) removeMonster(m, false);
    const spook = addMonster("ghost", { x: px0 + 6, y: player.y + 1, z: pz0 });
    spook.cave = true;
    const ghostStart = Math.hypot(spook.x - player.x, spook.z - player.z);
    for (let i = 0; i < 60; i++) frame(last + 16);
    check(
      "the mist ghost floats through rock",
      Math.hypot(spook.x - player.x, spook.z - player.z) < ghostStart - 0.8,
    );
    for (const m of [...monsters]) removeMonster(m, false);
    for (let y = roofY + 4; y <= roofY + 6; y++) {
      blocks.delete(key(roofX, y, roofZ));
      edits.set(key(roofX, y, roofZ), null);
    }
    rebuildAt([roofX, roofY + 4, roofZ]);
    world.options = normalizeOptions({
      ...world.options,
      difficulty: "normal",
    });
    world.options = normalizeOptions({ ...world.options, monsters: false });
    timeOfDay = 0.75;
    for (let i = 0; i < 6; i++) trySpawnMonster();
    check("no monsters when switched off", monsters.length === 0);
    timeOfDay = 0.3;
    const secondId = world.id;
    action("pause");
    action("worlds");
    action("deleteworld", secondId);
    check("delete asks for confirmation", store.list().length === 2);
    action("deleteworld", secondId);
    check("world deleted", store.list().length === 1 && world === null);
    action("openworld", firstId);
    check("first world reopened", world?.id === firstId && edits.size > 0);
    // Tutorial, sticker book and the parents' corner.
    action("pause");
    action("worlds");
    action("newworld");
    check("new worlds offer the tutorial", draft.tutorial === true);
    // The older checks were written for the classic valley.
    if (draft.seed === "") draft.size = "classic";
    action("create");
    check(
      "the tutorial starts in a new adventure world",
      world.tutorial?.step === 0 && app.querySelector(".quest.tutorial"),
    );
    tutorialEvent("walk", 5);
    check("walking moves the tutorial on", world.tutorial.step === 1);
    action("skiptutorial");
    check(
      "the tutorial can be skipped",
      world.tutorial === null && !app.querySelector(".quest.tutorial"),
    );
    check(
      "placing blocks counts for the shelter sticker",
      (progress.counters.place ?? 0) >= 1,
    );
    inventory.add("planks", 4);
    action("craft", "bench");
    check("a workbench earns a sticker", !!progress.done.bench);
    check("the dog sticker from earlier", !!progress.done.dog);
    action("stickers");
    check(
      "the sticker book shows twelve stickers",
      app.querySelectorAll(".sticker").length === 12 &&
        app.querySelectorAll(".sticker.done").length >= 2,
    );
    action("back");
    action("pause");
    action("settings");
    action("parentsgate");
    $("#parents-answer").value = "1";
    action("parentscheck");
    check(
      "a wrong answer keeps the parents' corner closed",
      mode === "parentsgate",
    );
    $("#parents-answer").value = String(gate.answer);
    action("parentscheck");
    check("the right answer opens the parents' corner", mode === "parents");
    settings.parents = normalizeParents({
      ...settings.parents,
      noMonsters: true,
      maxDifficulty: "easy",
      reminder: 30,
    });
    world.options = normalizeOptions({ ...world.options, difficulty: "hard" });
    applyParentLimits();
    check(
      "parents can switch monsters off and cap the difficulty",
      !monstersAllowed() && world.options.difficulty === "easy",
    );
    mode = "playing";
    playSeconds = 30 * 60 - 0.001;
    frame(last + 16);
    check("the break reminder appears", mode === "rest");
    action("restdone");
    check("and play goes on", mode === "playing" && playSeconds === 0);
    settings.parents = normalizeParents({});
    // Farming: till, plant, grow, harvest, bake; and a little fishing.
    const fx = Math.round(player.x) + 2,
      fz = Math.round(player.z),
      fy = topAt(fx, fz);
    setBlock([fx, fy, fz], 1);
    hold("wooden_hoe");
    target = { p: [fx, fy, fz], normal: new THREE.Vector3(0, 1, 0) };
    edit(true);
    check("the hoe makes farmland", blocks.get(key(fx, fy, fz)) === FARMLAND);
    hold("wheat_seeds");
    edit(true);
    check(
      "seeds are planted",
      cropInfo(blocks.get(key(fx, fy + 1, fz)))?.stage === 0,
    );
    rebuild();
    for (
      let i = 0;
      i < 200 && cropInfo(blocks.get(key(fx, fy + 1, fz))).stage < 3;
      i++
    )
      growCrops(30);
    check(
      "wheat grows ripe",
      cropInfo(blocks.get(key(fx, fy + 1, fz))).stage === 3,
    );
    const wheatBefore = inventory.count("wheat");
    target = { p: [fx, fy + 1, fz], normal: new THREE.Vector3(0, 1, 0) };
    edit(false);
    check(
      "harvesting wheat earns the farmer sticker",
      inventory.count("wheat") > wheatBefore && !!progress.done.wheat,
    );
    inventory.add("wheat", 3);
    action("craft", "bread");
    check("bread from wheat", inventory.count("bread") >= 1);
    hold("fishing_rod");
    fishing = { until: elapsed - 1, from: player.clone() };
    const fishBefore = inventory.count("fish");
    updateFishing();
    check("fishing catches a fish", inventory.count("fish") === fishBefore + 1);
    // Weather: rain comes in gently, waters the farm and greys the sky.
    world.weather = { state: "rain", until: world.age + 999 };
    timeOfDay = 0.3;
    for (let i = 0; i < 320; i++) frame(last + 16);
    check(
      "rain falls and waters the farm",
      rain.visible && raining() && darkLevel > 0.3,
    );
    check(
      "the clock shows the rain",
      app.querySelector(".clock").textContent.includes("🌧"),
    );
    world.options = normalizeOptions({ ...world.options, weather: false });
    for (let i = 0; i < 320; i++) frame(last + 16);
    check("no weather when switched off", !rain.visible && !raining());
    // Chests, the furnace, iron tools and treasure.
    const cx0 = Math.round(player.x) + 2,
      cz0 = Math.round(player.z) - 2,
      cy0 = topAt(cx0, cz0);
    inventory.add("chest", 1);
    hold("chest");
    target = { p: [cx0, cy0, cz0], normal: new THREE.Vector3(0, 1, 0) };
    edit(true);
    const chestKey = key(cx0, cy0 + 1, cz0);
    check(
      "a chest is placed empty",
      blocks.get(chestKey) === CHEST && world.chests[chestKey].length === 0,
    );
    target = { p: [cx0, cy0 + 1, cz0], normal: new THREE.Vector3(0, 1, 0) };
    edit(true);
    check("using a chest opens it", mode === "chest");
    inventory.add("dirt", 5);
    moveStack(
      "bag",
      inventory.slots.findIndex((x) => x?.id === "dirt"),
    );
    check(
      "things move into the chest",
      chestAt(chestKey).count("dirt") >= 5 && !inventory.count("dirt"),
    );
    action("back");
    const fx0 = cx0 + 1;
    inventory.add("furnace", 1);
    hold("furnace");
    target = {
      p: [fx0, topAt(fx0, cz0), cz0],
      normal: new THREE.Vector3(0, 1, 0),
    };
    edit(true);
    const furnaceKey = key(fx0, topAt(fx0, cz0), cz0);
    target = {
      p: furnaceKey.split(",").map(Number),
      normal: new THREE.Vector3(0, 1, 0),
    };
    edit(true);
    check("using a furnace opens it", mode === "furnace");
    inventory.add("iron_ore", 3);
    inventory.add("coal", 1);
    moveStack(
      "bag",
      inventory.slots.findIndex((x) => x?.id === "iron_ore"),
    );
    moveStack(
      "bag",
      inventory.slots.findIndex((x) => x?.id === "coal"),
    );
    for (let i = 0; i < 40; i++) updateFurnaces(0.5);
    moveStack("output", 0);
    check("the furnace melts iron bars", inventory.count("iron_ingot") === 3);
    action("back");
    setBlock(
      [Math.round(player.x) - 2, Math.round(player.y), Math.round(player.z)],
      BENCH,
    );
    inventory.add("stick", 2);
    action("craft", "iron_pickaxe");
    check(
      "an iron pickaxe earns its sticker",
      inventory.count("iron_pickaxe") === 1 && !!progress.done.ironPickaxe,
    );
    const oreAt = [Math.round(player.x) + 3, 1, Math.round(player.z) + 3];
    setBlock(oreAt, IRON_ORE);
    hold("iron_pickaxe");
    target = { p: oreAt, normal: new THREE.Vector3(0, 1, 0) };
    edit(false);
    check(
      "iron ore needs a pickaxe and counts for the ore hunter",
      inventory.count("iron_ore") >= 1 &&
        (progress.counters["got:iron"] ?? 0) >= 1,
    );
    const treasureKey = key(5, 30, 5);
    delete world.chests[treasureKey];
    check(
      "chests in ruins and cabins hold treasure",
      chestAt(treasureKey).slots.some(Boolean),
    );
    // Building shapes: ladders, fences, gates, trapdoors, signs, dyed wool.
    const bx0 = Math.round(player.x),
      bz0 = Math.round(player.z),
      by0 = Math.round(player.y);
    for (let y = by0; y <= by0 + 3; y++) setBlock([bx0, y, bz0], LADDER);
    rebuildAt([bx0, by0, bz0]);
    player.set(bx0, by0 - 0.49 + 0.01, bz0);
    velocity = 0;
    const ladderStart = player.y;
    keys.add("Space");
    for (let i = 0; i < 40; i++) frame(last + 16);
    keys.delete("Space");
    check("ladders can be climbed", player.y > ladderStart + 1.2);
    for (let y = by0; y <= by0 + 3; y++) {
      blocks.delete(key(bx0, y, bz0));
      edits.set(key(bx0, y, bz0), null);
    }
    rebuildAt([bx0, by0, bz0]);
    spawn();
    for (let i = 0; i < 20; i++) frame(last + 16);
    const gx0 = Math.round(player.x) + 2,
      gz0 = Math.round(player.z),
      gy0 = topAt(gx0, gz0) + 1;
    setBlock([gx0, gy0, gz0], FENCE);
    check(
      "fences block the way",
      collides(blocks, { x: gx0, y: gy0 - 0.49, z: gz0 }),
    );
    setBlock([gx0, gy0, gz0], GATE);
    target = { p: [gx0, gy0, gz0], normal: new THREE.Vector3(0, 1, 0) };
    edit(true);
    check(
      "gates open",
      blocks.get(key(gx0, gy0, gz0)) === GATE_OPEN &&
        !collides(blocks, { x: gx0, y: gy0 - 0.49, z: gz0 }),
    );
    setBlock([gx0, gy0, gz0], TRAPDOOR);
    edit(true);
    check("trapdoors open", blocks.get(key(gx0, gy0, gz0)) === TRAPDOOR_OPEN);
    blocks.delete(key(gx0, gy0, gz0));
    inventory.add("sign", 1);
    hold("sign");
    target = { p: [gx0, gy0 - 1, gz0], normal: new THREE.Vector3(0, 1, 0) };
    edit(true);
    await new Promise((r) => setTimeout(r, 0));
    check("placing a sign asks for its text", mode === "signtext");
    $("#sign-text").value = "Casa do Biel";
    action("signdone");
    check(
      "the sign shows its text",
      world.signs[key(gx0, gy0, gz0)] === "Casa do Biel" &&
        signGroup.children.length >= 1,
    );
    const ewe = animals.find((x) => x.type === "sheep");
    ewe.readyAt = 0;
    inventory.add("blue_dye", 1);
    hold("blue_dye");
    interactWith(ewe);
    hold("apple");
    interactWith(ewe);
    check(
      "a blue sheep gives blue wool",
      ewe.color === "blue" && inventory.count("wool_blue") === 2,
    );
    hold("wool_blue");
    target = {
      p: [gx0 + 1, topAt(gx0 + 1, gz0), gz0],
      normal: new THREE.Vector3(0, 1, 0),
    };
    edit(true);
    check(
      "coloured wool is built",
      blocks.get(key(gx0 + 1, topAt(gx0 + 1, gz0), gz0)) === woolBlock("blue"),
    );
    // A game controller drives the same actions.
    const padStart = player.clone();
    window.nativeGamepad({ ly: -1 });
    for (let i = 0; i < 40; i++) frame(last + 16);
    check(
      "the left stick walks",
      player.distanceTo(padStart) > 1 &&
        document.documentElement.classList.contains("gamepad"),
    );
    window.nativeGamepad({ y: true });
    frame(last + 16);
    check("Y opens the backpack", mode === "inventory");
    window.nativeGamepad({ b: true });
    frame(last + 16);
    check("B goes back", mode === "playing");
    window.nativeGamepad({ start: true });
    frame(last + 16);
    window.nativeGamepad({ down: true });
    frame(last + 16);
    const focused = document.activeElement?.textContent;
    window.nativeGamepad({});
    frame(last + 16);
    check(
      "the d-pad moves between menu buttons",
      mode === "paused" && focused && focused !== t("continue"),
    );
    window.nativeGamepad({ start: true });
    frame(last + 16);
    check("start goes back to the game", mode === "playing");
    window.nativeGamepad(null);
    frame(last + 16);
    document.documentElement.classList.remove("gamepad");
    // The new terrain: a seeded medium island, drawn chunk by chunk.
    action("pause");
    action("worlds");
    for (const w of store.list().slice(2)) store.remove(w.id);
    action("newworld");
    draft.size = "medium";
    draft.seed = "4242";
    draft.mode = "creative";
    const t0 = performance.now();
    // The older checks were written for the classic valley.
    if (draft.seed === "") draft.size = "classic";
    action("create");
    const loadMs = performance.now() - t0;
    check(
      "a medium island with a seed",
      world.seed === 4242 &&
        SIZE === 48 &&
        WATER_LEVEL > 10 &&
        chunks.size > 30,
    );
    check("a medium island loads quickly", loadMs < 4000);
    check(
      "Biel starts on dry land",
      height(Math.round(player.x), Math.round(player.z)) > WATER_LEVEL &&
        !collides(blocks, player),
    );
    const biomesHere = new Set();
    for (let x = -46; x <= 46; x += 3)
      for (let z = -46; z <= 46; z += 3) biomesHere.add(biomeAt(x, z));
    check("the island has several biomes", biomesHere.size >= 3);
    const ex = Math.round(player.x) + 2,
      ez = Math.round(player.z),
      ey = topAt(ex, ez) + 1;
    const otherChunk = [...chunks.entries()].find(
      ([id]) =>
        id !== chunkKey(Math.floor(ex / CHUNK), Math.floor(ez / CHUNK)) &&
        Math.abs(Number(id.split(",")[0]) - Math.floor(ex / CHUNK)) > 1,
    );
    const untouched = otherChunk[1].meshes[0];
    setBlock([ex, ey, ez], 6);
    rebuildAt([ex, ey, ez]);
    check(
      "an edit only redraws its own chunk",
      isRendered(ex, ey, ez) && otherChunk[1].meshes[0] === untouched,
    );
    save();
    action("pause");
    action("worlds");
    const classic = store
      .list()
      .map((w) => store.load(w.id))
      .find((w) => w.seed === null);
    action("openworld", classic.id);
    check(
      "classic worlds keep the original valley",
      SIZE === 28 && WATER_LEVEL === 2.2 && world.seed === null,
    );
    // Settings and helpers added in the final review.
    if (!world) loadWorld(store.load(store.list()[0].id));
    mode = "playing";
    render();
    minimapClock = 0;
    frame(last + 16);
    const mini = app.querySelector(".minimap");
    const px = mini?.getContext("2d").getImageData(66, 66, 1, 1).data;
    check("the minimap is drawn", mini && px[3] === 255);
    action("pause");
    action("map");
    check(
      "the big map opens from the pause menu",
      mode === "map" && $(".big-map"),
    );
    action("back");
    action("settings");
    const fxSlider = app.querySelector('[data-volume="fx"]');
    fxSlider.value = "30";
    fxSlider.dispatchEvent(new Event("input"));
    check(
      "effects volume slider",
      settings.volume.fx === 0.3 && settings.sound,
    );
    $("#bigtext").value = "on";
    $("#bigtext").dispatchEvent(new Event("change"));
    check(
      "large text",
      document.documentElement.classList.contains("big-text"),
    );
    $("#bigtext").value = "off";
    $("#bigtext").dispatchEvent(new Event("change"));
    action("back");
    action("play");
    toggleStats();
    statsClock = 1;
    frame(last + 16);
    check(
      "the performance overlay shows numbers",
      /fps/.test(statsEl.textContent),
    );
    toggleStats();
    world.options = normalizeOptions({
      ...world.options,
      monsters: true,
      difficulty: "normal",
    });
    // The target stands where Biel aims, with nothing in between.
    for (const other of [...monsters]) removeMonster(other, false);
    inventory = new Inventory();
    hold("bow");
    inventory.add("arrows", 2);
    firstPerson = true;
    pointerKind = "mouse";
    yaw = 0;
    pitch = 0.05;
    frame(last + 16);
    const aimDir = new THREE.Vector3();
    camera.getWorldDirection(aimDir);
    for (let d = 0.5; d <= 4; d += 0.25) {
      const c = camera.position.clone().addScaledVector(aimDir, d);
      for (const dy of [-1, 0]) {
        const k = key(Math.round(c.x), Math.round(c.y) + dy, Math.round(c.z));
        if (blocks.has(k)) {
          blocks.delete(k);
          edits.set(k, null);
        }
      }
    }
    const aimAt = camera.position.clone().addScaledVector(aimDir, 3);
    const target0 = addMonster("sleepy", {
      x: aimAt.x,
      y: aimAt.y - 0.8,
      z: aimAt.z,
    });
    target0.hp = 3;
    target0.cooldown = 99;
    edit(true);
    for (let i = 0; i < 40; i++) frame(last + 16);
    check(
      "the bow shoots arrows at monsters",
      !monsters.includes(target0) && inventory.count("arrows") === 1,
    );
    firstPerson = false;
    vitals.health = 6;
    hold("golden_apple");
    edit(true);
    check("a golden apple heals", vitals.health === 16);
    inventory.add("bone", 1);
    const treatsBefore = inventory.count("treat");
    action("craft", "treat_bone");
    check(
      "bones make dog treats",
      inventory.count("treat") === treatsBefore + 3,
    );
    check(
      "there are tips for the intro",
      strings.pt.tips.length >= 5 &&
        strings.en.tips.length === strings.pt.tips.length,
    );

    const beforePeacefulLoad = saveData();
    const peacefulImport = validateWorld({
      ...beforePeacefulLoad,
      options: {
        ...beforePeacefulLoad.options,
        difficulty: "peaceful",
        monsters: true,
      },
      monsters: [{ type: "sleepy", x: 0, y: 3, z: 0, hp: 4 }],
    });
    loadWorld(peacefulImport);
    check(
      "loading a peaceful save never restores a saved monster",
      monsters.length === 0,
    );
    loadWorld(beforePeacefulLoad);

    // A full backpack must not discard the previous furnace ingredient.
    const savedInventory = inventory;
    inventory = new Inventory();
    for (let i = 0; i < 36; i++)
      inventory.slots[i] = { id: "stone", count: 64 };
    inventory.slots[0] = { id: "potato", count: 4 };
    const swapFurnaceKey = "0,1,0";
    container = { type: FURNACE, key: swapFurnaceKey };
    world.furnaces[swapFurnaceKey] = {
      ...emptyFurnace(),
      input: ["iron_ore", 7],
      progress: 0.8,
    };
    moveStack("bag", 0);
    check(
      "swapping furnace ingredients keeps items in a full backpack",
      inventory.slots[0].id === "iron_ore" &&
        inventory.slots[0].count === 7 &&
        world.furnaces[swapFurnaceKey].input[0] === "potato" &&
        world.furnaces[swapFurnaceKey].progress === 0,
    );
    delete world.furnaces[swapFurnaceKey];
    inventory = savedInventory;
    container = null;

    // iCloud sync, with a pretend iCloud (the test app has no iCloud capability).
    const realCloud = cloudCall;
    check(
      "without iCloud the switch explains why",
      await (async () => {
        settings.cloud = true;
        await syncNow();
        return cloudStatus === "missing" || !cloudBridge;
      })(),
    );
    const fakeCloud = new Map();
    cloudCall = async (action, extra = {}) => {
      if (action === "status") return { available: true };
      if (action === "list") return [...fakeCloud.values()];
      if (action === "save")
        return fakeCloud.set(extra.worldId, extra.json) && { ok: true };
      if (action === "delete") return { ok: fakeCloud.delete(extra.worldId) };
      return null;
    };
    for (const w of store.list().slice(3)) store.remove(w.id);
    mode = "menu";
    await syncNow();
    check("worlds go up to iCloud", fakeCloud.size === store.list().length);
    const fromIpad = newWorld({
      id: "fromipad",
      name: "Do iPad",
      mode: "creative",
      options: {},
    });
    fromIpad.device = "iPad";
    fakeCloud.set(fromIpad.id, JSON.stringify(fromIpad));
    await syncNow();
    check(
      "a world made on the iPad comes down",
      store.load("fromipad")?.name === "Do iPad",
    );
    const changedHere = store.load("fromipad");
    changedHere.updatedAt += 1000;
    store.save(changedHere);
    const changedThere = JSON.parse(fakeCloud.get("fromipad"));
    changedThere.updatedAt += 2000;
    changedThere.name = "Do iPad (mudado)";
    fakeCloud.set("fromipad", JSON.stringify(changedThere));
    await syncNow();
    check(
      "changes on both devices ask which to keep",
      mode === "conflict" &&
        conflicts.length === 1 &&
        app.textContent.includes("Do iPad"),
    );
    await resolveConflict(false);
    check(
      "keeping the other device's version",
      store.load("fromipad").name === "Do iPad (mudado)" && mode === "menu",
    );
    let unexpectedUploads = 0;
    cloudCall = async (action) => {
      if (action === "save") unexpectedUploads++;
      return action === "status" ? { available: true } : null;
    };
    await syncNow();
    check(
      "an unavailable cloud listing never uploads local worlds",
      unexpectedUploads === 0,
    );
    cloudCall = realCloud;
    settings.cloud = false;
    if (!world) loadWorld(store.load(store.list()[0].id));

    action("home");
    frame(last + 16);
    return { ok: true, checks, triangles: renderer.info.render.triangles };
  };
