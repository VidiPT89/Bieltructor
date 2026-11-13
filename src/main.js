import { TouchInput } from "./input/touch-input.js";
import { isHeld, actionsForKey } from "./input/actions.js";
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
  fillsBlock,
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
  TRAPDOOR,
  SIGN,
  POT,
  OPENS,
  WATER,
  isWater,
  COPPER_ORE,
  COPPER_BLOCK,
  BEE_NEST,
  LAVA,
  LAVA_FLOW,
  isLava,
  isLiquid,
  inLava,
  CAMPFIRE,
  CAMPFIRE_OUT,
  RED_SAND,
  IRON_BLOCK,
  GOLD_BLOCK,
  LANTERN,
  BLUE_FLOWER,
  WHITE_FLOWER,
  YELLOW_FLOWER,
  BED_COLORS,
  bedBlock,
  isBed,
  COBBLESTONE,
  SIZES,
  makeTerrain,
  directionTo,
} from "./world.js";
import { isWatered, growCrop } from "./farm.js";
import { LightMap, brightness } from "./lighting.js";
import { flowWater, flowLava, quench, around } from "./water.js";
import { readPad, pressedNow, fromStandardGamepad } from "./input/gamepad.js";
import { deviceKind } from "./sync.js";
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
import { ITEMS, CREATIVE_BLOCKS, breakTime, drops, toolUses } from "./items.js";
import { Inventory } from "./inventory.js";
import { collectRewards } from "./loot.js";
import { FixedStep, EntityInterpolation, TICK_SECONDS } from "./simulation.js";
import { BLOCKS } from "./blocks.js";
import { openStorage, idbBackend } from "./storage.js";
import { step, settle } from "./entities.js";
import {
  buildChunkGeometry,
  atlasRows,
  tilePixel,
  TILE,
  GUTTER,
  CELL,
  ATLAS_COLUMNS,
} from "./chunkmesh.js";
import {
  ANIMALS,
  initialAnimals,
  validateAnimals,
  interact,
  findCouples,
  makeBaby,
  huntable,
  hitAnimal,
} from "./creatures.js";
import {
  MODELS,
  disposeModel,
  nameTag,
  arrow,
  bird,
  bee,
  fish,
} from "./models.js";
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
  attacksNow,
  bowShot,
  validateMonsters,
} from "./monsters.js";
import {
  RECIPES,
  canCraft,
  craft,
  GRID,
  gridMatches,
  gridFor,
  pruneGrid,
} from "./recipes.js";
import {
  createVitals,
  fallDamage,
  hurt,
  tick,
  eat,
  shieldDamage,
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
import { stepKind, playStep, playVoice } from "./sounds.js";
import "./style.css";
import { strings } from "./strings.js";
import { installSmokeTests } from "./dev/smoke-tests.js";
import { safeStorage, snapshotWorld, createCloud } from "./persistence.js";
import { createRandom } from "./random.js";

import {
  escapeHtml,
  field,
  parentField,
  wearBar,
  credits,
  logo,
} from "./ui/html.js";

const simulationClock = new FixedStep();
const entityInterpolation = new EntityInterpolation();
let simulationRunning = false,
  tickMilliseconds = 0;

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
// Icons instead of words on the game buttons, for children who do not read yet.
settings.icons = settings.icons === true;
settings.minimap = settings.minimap !== false;
// On a touch screen: a finger held on a block mines it, or a tap builds.
settings.touchMode = settings.touchMode === "build" ? "build" : "mine";
if (!strings[settings.lang]) settings.lang = "pt";
settings.parents = normalizeParents(settings.parents);
const itemName = (id) =>
  id ? strings[settings.lang].items[id] : t("emptyHand");
const nested = (group, id) => strings[settings.lang][group][id];
const t = (k, vars = {}) =>
  String(strings[settings.lang][k]).replace(/\{(\w+)\}/g, (_, v) => vars[v]);
const touchInput = new TouchInput();
let mode = "splash",
  selected = 0,
  firstPerson = false,
  confirmDelete = null,
  invPick = null,
  invDrag = null,
  renaming = null,
  backupsOf = null,
  confirmRestore = null,
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
  nestBlocks = [],
  targetWater = null,
  targetLava = null,
  waterDirty = new Set(),
  lavaDirty = new Set(),
  waterClock = 0,
  lavaClock = 0,
  cropKeys = [],
  growClock = 5,
  rainLevel = 0,
  container = null,
  benchGrid = Array(GRID).fill(null),
  keepScroll = true,
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
// Worlds live in IndexedDB, with a second copy of what fits in the small
// browser storage; see src/storage.js and src/worlds.js. The first time,
// the worlds kept in the small storage are copied over.
const storage = await openStorage({
  backend: idbBackend(),
  local: safeStorage,
  onError: () => toast(t("saveError")),
});
const store = createStore(storage);
try {
  progress = createProgress(JSON.parse(storage.getItem("biel-stickers")));
} catch {
  progress = createProgress();
}
// Rolls for the rules of the game (what a block drops, where a monster
// appears, the weather). Seeded again for each world that is loaded.
let roll = createRandom(Date.now());
let ambientRoll = roll.fork("ambient-fish");
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
// The base colour of each block, by block number.
const colors = BLOCKS.map((block) => block.color);
function theme() {
  document.documentElement.dataset.theme = settings.theme;
  document.documentElement.classList.toggle("big-text", settings.bigText);
  document.documentElement.classList.toggle("icons", settings.icons);
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
function button(action, label, cls = "", arg = "", extra = "") {
  return `<button data-action="${action}" ${arg ? `data-arg="${arg}"` : ""} ${["view", "pause"].includes(action) ? `aria-label="${t(action)}"` : action === "inventory" ? `aria-label="${t("backpack")}"` : ""} ${extra} class="${cls}">${label}</button>`;
}
// The Mac app (not the iPad or iPhone app, nor a browser) can quit itself.
const isMacApp = () =>
  !!window.webkit?.messageHandlers?.files &&
  document.documentElement.dataset.platform !== "ios";
// The game buttons show a word, or a picture with "Icons instead of words".
const ICONS = {
  run: "🏃",
  break: "⛏️",
  place: "🧱",
  attack: "⚔️",
  jump: "⤴︎",
  descend: "⤵︎",
};
const word = (name) =>
  settings.icons ? `<span class="icon-word">${ICONS[name]}</span>` : t(name);
// With pictures, the button still says its name to VoiceOver.
const say = (name) => (settings.icons ? `aria-label="${t(name)}"` : "");
// Blocks show the same drawing they have in the world (their colour until
// the drawings exist); other items show a picture.
let blockPictures = null;
// Things with their own shape get a small drawing of that shape, since
// their texture alone would look like a plain square.
const bars = (ctx, color, list) => {
  ctx.fillStyle = color;
  for (const [x, y, w, h] of list) ctx.fillRect(x, y, w, h);
};
const SHAPE_PICTURES = {
  [TORCH]: (ctx) => {
    bars(ctx, "#8a5a33", [[7, 6, 2, 9]]);
    bars(ctx, "#f2a12b", [[6, 2, 4, 4]]);
    bars(ctx, "#ffe07a", [[7, 3, 2, 2]]);
  },
  [LADDER]: (ctx) => {
    bars(ctx, "#8a5a33", [
      [3, 1, 2, 14],
      [11, 1, 2, 14],
    ]);
    bars(ctx, "#b98552", [
      [5, 3, 6, 1],
      [5, 7, 6, 1],
      [5, 11, 6, 1],
    ]);
  },
  [FENCE]: (ctx) => {
    bars(ctx, "#8a5a33", [
      [2, 3, 3, 12],
      [11, 3, 3, 12],
    ]);
    bars(ctx, "#b98552", [
      [0, 6, 16, 2],
      [0, 11, 16, 2],
    ]);
  },
  [GATE]: (ctx) => {
    bars(ctx, "#8a5a33", [
      [1, 2, 2, 13],
      [13, 2, 2, 13],
    ]);
    bars(ctx, "#b98552", [
      [3, 5, 10, 2],
      [3, 10, 10, 2],
      [7, 5, 2, 7],
    ]);
    bars(ctx, "#f2c14e", [[10, 8, 2, 1]]);
  },
  [TRAPDOOR]: (ctx) => {
    bars(ctx, "#9a6a3c", [[1, 4, 14, 9]]);
    bars(ctx, "#6c4325", [
      [1, 4, 14, 1],
      [1, 12, 14, 1],
      [1, 4, 1, 9],
      [14, 4, 1, 9],
      [5, 5, 1, 7],
      [10, 5, 1, 7],
    ]);
    bars(ctx, "#f2c14e", [[7, 8, 2, 1]]);
  },
  [SIGN]: (ctx) => {
    bars(ctx, "#8a5a33", [[7, 9, 2, 6]]);
    bars(ctx, "#c08a55", [[2, 2, 12, 7]]);
    bars(ctx, "#6c4325", [
      [4, 4, 8, 1],
      [4, 6, 6, 1],
    ]);
  },
  [POT]: (ctx) => {
    bars(ctx, "#5f9f4a", [
      [7, 2, 2, 6],
      [4, 3, 3, 2],
      [9, 4, 3, 2],
    ]);
    bars(ctx, "#b5603c", [
      [3, 8, 10, 2],
      [4, 10, 8, 5],
    ]);
  },
  [LANTERN]: (ctx) => {
    bars(ctx, "#3b3f40", [
      [6, 1, 4, 2],
      [4, 3, 8, 2],
      [4, 12, 8, 2],
      [4, 5, 1, 7],
      [11, 5, 1, 7],
    ]);
    bars(ctx, "#ffd36b", [[5, 5, 6, 7]]);
    bars(ctx, "#fff4c2", [[7, 7, 2, 3]]);
  },
};
function drawBlockPictures() {
  blockPictures = new Set();
  const rules = [];
  materials.forEach((material, type) => {
    try {
      let image = material?.map?.image;
      const draw = SHAPE_PICTURES[type];
      if (draw) {
        image = document.createElement("canvas");
        image.width = image.height = 16;
        draw(image.getContext("2d"));
      }
      // Translucent materials such as ice have no world texture.
      // Give their inventory picture the same pixel finish as other blocks.
      if (!image) {
        const preview = texture(colors[type]);
        image = preview.image;
        preview.dispose();
      }
      const url = image?.toDataURL?.();
      if (!url) return;
      rules.push(`.blk-${type}{--img:url(${url})}`);
      // Flowers, mushrooms, crops and shaped things are drawn alone,
      // without a block behind.
      blockPictures.add(type + (draw || material.alphaTest ? ":plant" : ""));
    } catch {}
  });
  const sheet = document.createElement("style");
  sheet.textContent = rules.join("");
  document.head.append(sheet);
}
const icon = (id) => {
  const type = ITEMS[id].block;
  if (type === undefined)
    return `<span class="item-icon">${ITEMS[id].icon}</span>`;
  if (!blockPictures) drawBlockPictures();
  return `<i class="swatch blk-${type}${blockPictures.has(type + ":plant") ? " plant" : ""}" style="--block:#${colors[type].toString(16).padStart(6, "0")}"></i>`;
};
// One line of the recipe book: what it makes, what it needs and a button.
function recipeRow(r, bench, act, label) {
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
    )}</span>${r.bench ? `<small class="${bench ? "have" : ""}">🔨 ${t("needsBench")}</small>` : ""}</div><button data-action="${act}" data-arg="${r.id}" class="${ok ? "primary" : ""}" ${ok ? "" : "disabled"}>${label}</button></div>`;
}
function slotButton(slot, i, attrs, active, label = "") {
  return `<button ${attrs} aria-label="${itemName(slot?.id)}" class="slot ${active ? "selected" : ""}">${label ? `<small>${label}</small>` : ""}${slot ? icon(slot.id) : ""}${slot && !creative() && slot.count > 1 ? `<b class="count">${slot.count}</b>` : ""}${creative() ? "" : wearBar(slot?.wear, toolUses(slot?.id))}</button>`;
}
const modeLabel = (w) =>
  `${w.mode === "creative" ? t("creativeMode") : t("adventure")} · ${t(w.options.difficulty)}`;
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
        (draft.size === "classic"
          ? ""
          : `<figure class="world-preview"><canvas id="world-preview" width="128" height="128" aria-label="${t("preview")}"></canvas><figcaption>${t("preview")}</figcaption></figure>`) +
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
    field("friendsOnly", t("friendsOnly"), o.friendsOnly, yesNo),
    "</div>",
  ].join("");
}
function render() {
  if (mode !== "playing") {
    simulationClock.reset();
    simulationRunning = false;
  }
  app.className = mode;
  if (mode !== "playing") touchInput.clear();
  let content = "";
  if (mode === "splash")
    content = `<div class="splash-inner"><img class="splash-logo" src="logo.webp" alt="Bieltructor"><p>${t("loading")}<span class="dots">…</span></p><p class="tip">${tip}</p></div>${credits()}`;
  if (mode === "menu")
    content = `<header><div class="brand">${logo}</div><span class="edition">${t("edition")}</span>${button("settings", "⚙︎ <span>" + t("settings") + "</span>", "quiet")}</header><main class="intro"><div class="eyebrow"><i></i>${t("tag")}</div><h1>${t("title")}</h1><p>${t("intro")}</p><div class="menu-actions">${button("play", `${world ? t("resume") : t("start")} <span>↗︎</span>`, "primary")}${button("worlds", t("worlds"), "secondary")}${button("stickers", "📒 " + t("stickers"), "secondary")}${button("help", t("help"), "secondary")}</div><div class="world-info"><span class="world-icon">▧</span><div><strong>${world ? escapeHtml(world.name) : t("newWorld")}</strong><small>${world ? modeLabel(world) : t("noWorlds")} · ${t("storage")}</small></div></div></main><div class="biel-label"><span>BIEL</span><small>${t("ready")}</small></div><footer>${credits()}<span class="version">v2.0 · ${t("made")}</span></footer>`;
  if (mode === "playing")
    content = `<div class="hud-top"><div class="world-title"><b>${escapeHtml(world.name)}</b><small>${creative() ? t("creative") : t("adventureLabel")} · <span class="clock">${clock()}</span></small></div><div>${button("touchmode", settings.touchMode === "build" ? "🧱" : "⛏️", "icon touch-only", "", `aria-label="${t(settings.touchMode === "build" ? "buildMode" : "mineMode")}"`)}${button("inventory", "🎒", "icon")}${button("view", "◉", "icon")}${button("pause", "Ⅱ", "icon")}</div></div><div class="quest-slot">${questBox()}</div>${settings.minimap ? `<canvas class="minimap" width="132" height="132" aria-hidden="true"></canvas>` : ""}<div class="crosshair">+</div><div class="hotbar-wrap">${creative() ? "" : `<div class="vitals" aria-live="polite"></div>`}<div class="material-label">${itemName(heldId())}</div><div class="draw-meter" aria-hidden="true"><i></i></div><div class="hotbar">${inventory.slots
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
      )}</div><div class="hint">${t(creative() ? "hint" : "hintAdventure")}</div></div><div class="touch-controls"><div class="dpad"><button data-key="forward" aria-label="${t("forward")}">↑</button><button data-key="left" aria-label="${t("left")}">←</button><button data-key="backward" aria-label="${t("backward")}">↓</button><button data-key="right" aria-label="${t("right")}">→</button></div><div class="touch-actions"><button data-key="run" ${say("run")}>${word("run")}</button><button data-key="break" ${say("break")}>${word("break")}</button>${button("place", word("place"), "", "", say("place"))}${creative() ? "" : button("attack", word("attack"), "attack-btn hidden", "", say("attack"))}<button data-key="jump" ${say("jump")}>${word("jump")}</button>${flying || riding ? `<button data-key="down" ${say("descend")}>${word("descend")}</button>` : ""}</div></div>`;
  if (mode === "conflict" && cloud.conflicts[0]) {
    const c = cloud.conflicts[0],
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
                  `<div class="world-card ${w.id === world?.id ? "current" : ""}">${store.thumb(w.id) ? `<img class="world-thumb" src="${store.thumb(w.id)}" alt="">` : `<span class="world-thumb">▧</span>`}<div><strong>${escapeHtml(w.name)}</strong><small>${w.mode === "creative" ? t("creativeMode") : t("adventure")} · ${t(w.difficulty)} · ${new Date(w.updatedAt).toLocaleDateString(settings.lang === "pt" ? "pt-PT" : "en-GB")}</small></div>${button("openworld", t("play"), "primary", w.id)}<div class="world-actions">${button("renameworld", "✏️", "copy", w.id, `aria-label="${t("rename")}" title="${t("rename")}"`)}${button("export", "⤓", "copy", w.id, `aria-label="${t("export")}" title="${t("export")}"`)}${list.length < MAX_WORLDS ? button("duplicateworld", "⧉", "copy", w.id, `aria-label="${t("duplicate")}" title="${t("duplicate")}"`) : ""}${button("backupsworld", "🕘", "copy", w.id, `aria-label="${t("backups")}" title="${t("backups")}"`)}</div>${button("deleteworld", confirmDelete === w.id ? t("confirmDelete") : t("deleteWorld"), confirmDelete === w.id ? "danger confirm" : "danger", w.id)}</div>`,
              )
              .join("")
          : `<p class="help-copy">${t("noWorlds")}</p>`
      }</div>${list.length >= MAX_WORLDS ? `<p class="field-hint">${t("worldFull")}</p>` : button("newworld", "+ " + t("newWorld"), "primary wide")}${button("back", t("back"), "quiet wide")}`;
    }
    if (mode === "backups") {
      const list = store.backups(backupsOf),
        when = (at) =>
          new Date(at).toLocaleString(
            settings.lang === "pt" ? "pt-PT" : "en-GB",
            {
              dateStyle: "medium",
              timeStyle: "short",
            },
          );
      inner = `<span class="eyebrow">🕘 ${escapeHtml(store.load(backupsOf)?.name ?? "")}</span><h2>${t("backups")}</h2><p class="help-copy">${t("backupsHelp")}</p><div class="world-list">${
        list.length
          ? list
              .map(
                (b) =>
                  `<div class="world-card backup-card"><div><strong>${when(b.at)}</strong><small>${t("dayCount", { n: b.day })}</small></div>${button("restorebackup", confirmRestore === b.at ? t("confirmDelete") : t("restore"), confirmRestore === b.at ? "danger confirm" : "primary", b.at)}</div>`,
              )
              .join("")
          : `<p class="help-copy">${t("noBackups")}</p>`
      }</div>${button("back", t("back"), "quiet wide")}`;
    }
    if (mode === "newworld")
      inner = `<span class="eyebrow">BIELTRUCTOR</span><h2>${t("newWorld")}</h2><label>${t("worldName")}<input id="world-name" maxlength="32" value="${escapeHtml(draft.name)}"></label>${worldFields(draft.options, true)}${button("create", t("create"), "primary wide")}${button("back", t("back"), "quiet wide")}`;
    if (mode === "inventory" && creative())
      inner = `<span class="eyebrow">${t("creativeMode")}</span><h2>${t("allBlocks")}</h2><p class="field-hint">${t("pickBlock", { n: selected + 1 })}</p><div class="inv-grid">${CREATIVE_BLOCKS.map((id) => slotButton({ id, count: 1 }, 0, `data-give="${id}" title="${itemName(id)}"`, heldId() === id)).join("")}</div>${button("back", t("back"), "primary wide")}`;
    else if (mode === "inventory") {
      const bench = nearBench();
      inner = `<span class="eyebrow">${t("adventure")}</span><h2>${t("backpack")}</h2><p class="field-hint">${t("swapHint")}</p><div class="inv-grid">${inventory.slots.map((slot, i) => slotButton(slot, i, `data-inv="${i}" title="${itemName(slot?.id)}"`, invPick === i, i < 9 ? i + 1 : "")).join("")}</div>${invPick !== null && inventory.slots[invPick]?.count > 1 ? button("split", "✂︎ " + t("split"), "secondary") : ""}<h3>${t("recipes")}</h3><p class="field-hint">${bench ? t("benchNear") : t("benchFar")}</p>${bench ? button("bench", "🔨 " + t("benchOpen"), "secondary") : ""}<div class="recipes">${RECIPES.map((r) => recipeRow(r, bench, "craft", t("craftIt"))).join("")}</div>${button("back", t("back"), "primary wide")}`;
    }
    if (mode === "bench") {
      const made = gridMatches(benchGrid),
        some = benchGrid.some(Boolean),
        used = {};
      for (const id of benchGrid) if (id) used[id] = (used[id] ?? 0) + 1;
      // What sits in the squares is still in the backpack: show what is left.
      const bag = inventory.slots.map((slot) => {
        if (!slot || !used[slot.id]) return slot;
        const take = Math.min(slot.count, used[slot.id]);
        used[slot.id] -= take;
        return take === slot.count
          ? null
          : { ...slot, count: slot.count - take };
      });
      inner = `<span class="eyebrow">🔨</span><h2>${t("bench")}</h2><p class="field-hint">${t("benchHint")}</p><div class="bench"><div class="bench-grid">${benchGrid.map((id, i) => slotButton(id ? { id, count: 1 } : null, i, `data-bench="${i}"`, false)).join("")}</div><span class="bench-arrow" aria-hidden="true">➜</span><div class="bench-result">${
        made.length
          ? `<small>${t("benchTake")}</small>${made.map((r) => `<button data-action="benchcraft" data-arg="${r.id}" class="primary bench-make">${icon(r.out[0])}<span>${itemName(r.out[0])}${r.out[1] > 1 ? ` ×${r.out[1]}` : ""}</span></button>`).join("")}`
          : `<p class="field-hint">${t(some ? "benchNothing" : "benchEmpty")}</p>`
      }${some ? button("benchclear", t("benchClear"), "quiet") : ""}</div></div><h3>${t("backpack")}</h3><div class="inv-grid">${bag.map((slot, i) => slotButton(slot, i, `data-benchadd="${i}" title="${itemName(slot?.id)}"`, false, i < 9 ? i + 1 : "")).join("")}</div><h3>${t("recipes")}</h3><div class="recipes">${RECIPES.map((r) => recipeRow(r, true, "benchfill", t("benchShow"))).join("")}</div>${button("back", t("back"), "primary wide")}`;
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
    if (mode === "renameworld")
      inner = `<span class="eyebrow">BIELTRUCTOR</span><h2>${t("rename")}</h2><label>${t("worldName")}<input id="rename-input" maxlength="32" value="${escapeHtml(store.load(renaming)?.name ?? "")}"></label>${button("renamedone", t("done"), "primary wide")}${button("back", t("back"), "quiet wide")}`;
    if (mode === "worldsettings")
      inner = `<span class="eyebrow">${modeLabel(world)}</span><h2>${t("worldSettings")}</h2><label>${t("worldName")}<input id="world-name" maxlength="32" value="${escapeHtml(world.name)}"></label>${worldFields(world.options, false)}<p class="field-hint">${t("fixedOptions")}</p>${button("back", t("back"), "primary wide")}`;
    if (mode === "paused")
      inner = `<span class="eyebrow">BIELTRUCTOR</span><h2>${t("pause")}</h2>${button("play", t("continue"), "primary wide")}<div class="pause-grid">${button("map", "🗺️ " + t("map"))}${button("stickers", "📒 " + t("stickers"))}${button("worldsettings", t("worldSettings"))}${button("settings", t("settings"))}${button("help", t("help"))}${button("export", t("export"))}${button("spawn", t("reset"))}${button("home", t("home"))}</div>${isMacApp() ? button("quit", t("quit"), "wide") : ""}`;
    if (mode === "help")
      inner = `<span class="eyebrow">BIELTRUCTOR</span><h2>${t("help")}</h2><p class="help-copy">${t("helpText")}</p><p class="touch-help">${t("mobile")}</p><div class="key-demo"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><kbd>${t("space")}</kbd></div>${world && !creative() ? button("starttutorial", "🎓 " + t("startTutorial"), "wide") : ""}${button("back", t("back"), "primary wide")}`;
    if (mode === "settings")
      inner = `<h2>${t("settings")}</h2><label>${t("language")}<select id="language"><option value="pt" ${settings.lang === "pt" ? "selected" : ""}>Português (Portugal)</option><option value="en" ${settings.lang === "en" ? "selected" : ""}>English</option></select></label><label>${t("appearance")}<select id="appearance">${["dark", "light", "system"].map((v) => `<option value="${v}" ${settings.theme === v ? "selected" : ""}>${t(v)}</option>`).join("")}</select></label>${["music", "fx", "ambient"].map((k) => `<label>${t({ music: "music", fx: "sound", ambient: "ambient" }[k])} <b class="volume-value">${Math.round(settings.volume[k] * 100)}%</b><input type="range" min="0" max="100" step="5" data-volume="${k}" value="${Math.round(settings.volume[k] * 100)}"></label>`).join("")}<label>${t("minimap")}<select id="minimap"><option value="on" ${settings.minimap ? "selected" : ""}>${t("on")}</option><option value="off" ${!settings.minimap ? "selected" : ""}>${t("off")}</option></select></label><label>${t("bigText")}<select id="bigtext"><option value="on" ${settings.bigText ? "selected" : ""}>${t("on")}</option><option value="off" ${!settings.bigText ? "selected" : ""}>${t("off")}</option></select></label><label>${t("iconsOnly")}<select id="icons"><option value="on" ${settings.icons ? "selected" : ""}>${t("on")}</option><option value="off" ${!settings.icons ? "selected" : ""}>${t("off")}</option></select></label><label>${t("quality")}<select id="quality">${["high", "low"].map((v) => `<option value="${v}" ${settings.quality === v ? "selected" : ""}>${t(v)}</option>`).join("")}</select></label><div class="file-actions">${world ? button("export", t("export")) : ""}${button("import", t("import"))}</div>${cloudBridge ? `<label>${t("icloud")}<select id="cloud"><option value="on" ${settings.cloud ? "selected" : ""}>${t("on")}</option><option value="off" ${!settings.cloud ? "selected" : ""}>${t("off")}</option></select></label><p class="field-hint">${!settings.cloud ? t("icloudOff") : cloud.status === "missing" ? t("icloudMissing") : cloud.status ? t("icloudSynced", { time: cloud.status }) : t("icloudOn")}</p>` : ""}${button("parentsgate", "👪 " + t("parents"), "wide")}<small>${t("storage")}</small>${button("back", t("back"), "primary wide")}`;
    content = `<div class="modal-backdrop"><section class="panel ${["newworld", "worldsettings", "inventory", "stickers", "chest", "furnace", "bench"].includes(mode) ? "wide-panel" : ""}" role="dialog" aria-modal="true" aria-label="${t({ paused: "pause", newworld: "newWorld", worldsettings: "worldSettings", inventory: "backpack", stickers: "stickerBook", parentsgate: "parents" }[mode] ?? mode)}">${inner}</section></div>`;
  }
  // A long list stays where it was when the same screen is drawn again.
  const panel = app.querySelector(".panel"),
    scroll = keepScroll && panel?.dataset.screen === mode ? panel.scrollTop : 0;
  keepScroll = true;
  app.innerHTML = content;
  const drawn = app.querySelector(".panel");
  if (drawn) {
    drawn.dataset.screen = mode;
    drawn.scrollTop = scroll;
  }
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
      ["icons", "icons"],
      ["minimap", "minimap"],
    ])
      $("#" + id).onchange = (e) => {
        settings[prop] = ["cloud", "bigText", "icons", "minimap"].includes(prop)
          ? e.target.value === "on"
          : e.target.value;
        if (prop === "cloud" && settings.cloud) cloud.sync();
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
  // Backpack: tap one slot, then another (or drag it there) to move it.
  // The same item joins the stack; anything else swaps places.
  app.querySelectorAll("[data-inv]").forEach((b) => {
    b.onpointerdown = (e) => {
      if (inventory.slots[+b.dataset.inv])
        invDrag = { from: +b.dataset.inv, x: e.clientX, y: e.clientY };
    };
    b.onclick = () => {
      const i = +b.dataset.inv;
      if (invPick === null) invPick = inventory.slots[i] ? i : null;
      else {
        inventory.move(invPick, i);
        invPick = null;
      }
      render();
    };
  });
  // Workbench: a tap on something in the backpack puts one in the next free
  // square; a tap on a square empties it.
  app.querySelectorAll("[data-benchadd]").forEach(
    (b) =>
      (b.onclick = () => {
        const id = inventory.slots[+b.dataset.benchadd]?.id,
          free = benchGrid.indexOf(null);
        if (!id) return;
        if (free < 0) return toast(t("benchFull"));
        if (benchGrid.filter((x) => x === id).length >= inventory.count(id))
          return toast(t("benchNoMore"));
        benchGrid[free] = id;
        render();
      }),
  );
  app.querySelectorAll("[data-bench]").forEach(
    (b) =>
      (b.onclick = () => {
        benchGrid[+b.dataset.bench] = null;
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
            friendsOnly: undefined,
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
    seedInput.oninput = () => {
      draft.seed = seedInput.value.replace(/\D/g, "");
      drawPreview();
    };
  drawPreview();
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
        ["inventory", "chest", "furnace", "bench"].includes(mode)
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
    // The island shown in the preview when no seed is typed in.
    previewSeed: 1 + Math.floor(Math.random() * 999999),
    options: normalizeOptions({
      difficulty: clampDifficulty("easy", settings.parents.maxDifficulty),
    }),
  };
}
// A small map of the island the new world will have: sea, beaches and
// each biome in its colour, from the same seed and size.
const PREVIEW_COLOURS = {
  beach: "#e9cf8b",
  plains: "#7cbf4e",
  forest: "#3f8a3f",
  desert: "#e0b05a",
  snow: "#eef3f6",
  swamp: "#5c7a4a",
};
function drawPreview() {
  const canvas = $("#world-preview");
  if (!canvas || mode !== "newworld") return;
  const size = SIZES[draft.size],
    seed = Number.parseInt(draft.seed, 10) || draft.previewSeed,
    land = makeTerrain(seed, size, 3),
    ctx = canvas.getContext("2d"),
    cell = canvas.width / (size * 2 + 1);
  ctx.fillStyle = "#3f9fb4";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const step = Math.max(1, Math.round(size / 32));
  for (let x = -size; x <= size; x += step)
    for (let z = -size; z <= size; z += step) {
      if (land.height(x, z) < land.water) continue;
      ctx.fillStyle = PREVIEW_COLOURS[land.biome(x, z)] ?? "#7cbf4e";
      ctx.fillRect(
        (x + size) * cell,
        (z + size) * cell,
        cell * step + 0.5,
        cell * step + 0.5,
      );
    }
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
// Short, happy notes the first time Biel does something big (kept with the
// sticker progress, so each one shows once on this device).
const FIRSTS = {
  "place:torch": "firstTorch",
  "craft:bench": "firstBench",
  "got:coal": "firstCoal",
  "got:iron": "firstIron",
  "craft:wooden_pickaxe": "firstPickaxe",
  "got:crystal": "firstCrystal",
  lava: "firstLava",
};
function emit(event, amount = 1) {
  if (FIRSTS[event] && !creative()) {
    if (!progress.firsts[event]) {
      progress.firsts[event] = 1;
      saveProgress();
      toast(t(FIRSTS[event]));
    }
  }
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
const cloud = createCloud({
  bridge: cloudBridge,
  storage,
  store,
  hooks: {
    enabled: () => settings.cloud,
    busy: () => mode === "playing",
    currentId: () => world?.id,
    load: (w) => loadWorld(w),
    lang: () => settings.lang,
    onMissing: () => {
      if (mode === "conflict") toast(t("icloudMissing"));
      if (mode === "settings") render();
    },
    onSynced: () => {
      if (cloud.conflicts.length && mode !== "playing") mode = "conflict";
      render();
    },
    onResolved: () => {
      mode = cloud.conflicts.length ? "conflict" : "menu";
      render();
    },
    // Deleted on another device (and not played here since): it goes here too.
    removed: (id) => {
      if (world?.id === id) world = null;
      render();
    },
  },
});
window.cloudReply = cloud.reply;
const MODALS = [
  "renameworld",
  "backups",
  "settings",
  "help",
  "paused",
  "worlds",
  "newworld",
  "worldsettings",
  "inventory",
  "chest",
  "furnace",
  "bench",
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
    mode === "playing" &&
      !["inventory", "chest", "furnace", "bench"].includes(screen)
      ? "paused"
      : mode,
  );
  mode = screen;
}
function action(a, arg) {
  if (a !== "deleteworld") confirmDelete = null;
  if (a !== "restorebackup") confirmRestore = null;
  if (a === "play") {
    if (!world) {
      draft = newDraft();
      open("newworld");
    } else {
      mode = "playing";
      history.length = 0;
      keys.clear();
    }
  } else if (a === "pause") {
    snapThumb();
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
      emit("name:" + namingDog.type);
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
    cloud.resolve(a === "keephere");
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
  } else if (a === "craft" || a === "benchcraft") {
    // From the recipe book, or from what is in the nine squares.
    const recipe = (a === "craft" ? RECIPES : gridMatches(benchGrid)).find(
      (r) => r.id === arg,
    );
    const bench = a === "benchcraft" || nearBench(),
      can = recipe && canCraft(inventory, recipe, bench);
    if (can && craft(inventory, recipe, bench)) {
      toast(t("crafted", { item: itemName(recipe.out[0]) }));
      emit("craft:" + recipe.id);
      beep(true);
      scheduleSave();
    } else if (can) toast(t("full"));
    pruneGrid(benchGrid, inventory);
  } else if (a === "bench") {
    benchGrid.fill(null);
    open("bench");
  } else if (a === "benchfill") {
    const recipe = RECIPES.find((r) => r.id === arg);
    if (recipe) benchGrid = pruneGrid(gridFor(recipe), inventory);
    // Back to the top, where the squares are.
    keepScroll = false;
  } else if (a === "benchclear") {
    benchGrid.fill(null);
  } else if (a === "touchmode") {
    settings.touchMode = settings.touchMode === "build" ? "mine" : "build";
    theme();
    toast(t(settings.touchMode === "build" ? "buildModeOn" : "mineModeOn"));
  } else if (["settings", "help", "worlds", "worldsettings"].includes(a)) {
    if (a === "worlds" && world) save();
    if (a === "worlds") cloud.sync();
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
        : Number.parseInt(draft.seed, 10) || draft.previewSeed,
    });
    if (created.mode === "adventure" && draft.tutorial)
      created.tutorial = { step: 0, amount: 0 };
    store.save(created);
    loadWorld(created);
    mode = "playing";
    history.length = 0;
  } else if (a === "renameworld") {
    renaming = arg;
    open("renameworld");
  } else if (a === "renamedone") {
    const chosen = store.load(renaming),
      name = ($("#rename-input")?.value ?? "").trim().slice(0, 32);
    if (chosen && name) {
      if (world?.id === chosen.id) {
        world.name = name;
        save();
      } else store.save({ ...chosen, name });
    }
    renaming = null;
    action("back");
    return;
  } else if (a === "backupsworld") {
    // What is being played is saved first, so the list is up to date.
    if (world?.id === arg) save();
    backupsOf = arg;
    open("backups");
  } else if (a === "restorebackup") {
    const at = Number(arg);
    if (confirmRestore !== at) confirmRestore = at;
    else {
      confirmRestore = null;
      const restored = store.restore(backupsOf, at);
      if (restored) {
        if (world?.id === restored.id) loadWorld(restored);
        cloud.schedule();
        toast(t("backupRestored"));
      } else toast(t("backupBroken"));
    }
  } else if (a === "quit") {
    // Only the Mac app can quit; iPad and iPhone apps are closed by the system.
    save();
    // The last save reaches the big storage first (or a second passes).
    Promise.race([
      storage.flush(),
      new Promise((done) => setTimeout(done, 1500)),
    ]).then(() =>
      window.webkit?.messageHandlers?.files?.postMessage({ action: "quit" }),
    );
    return;
  } else if (a === "duplicateworld") {
    if (world?.id === arg) save();
    const original = store.load(arg);
    if (original && store.list().length < MAX_WORLDS) {
      const copy = validateWorld(
        {
          ...JSON.parse(JSON.stringify(original)),
          id: makeId(),
          name: `${original.name.slice(0, 24)} (${t("copy")})`,
        },
        {},
      );
      copy.createdAt = copy.updatedAt = Date.now();
      store.save(copy);
      const picture = store.thumb(arg);
      if (picture) store.saveThumb(copy.id, picture);
      toast(t("duplicated", { name: copy.name }));
    }
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
      if (settings.cloud) cloud.forget(arg);
      if (world?.id === arg) {
        world = null;
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
    // The world being played, or any world from the list.
    const data = arg && arg !== world?.id ? store.load(arg) : saveData();
    if (!data) return;
    if (window.webkit?.messageHandlers?.files) {
      window.webkit.messageHandlers.files.postMessage({
        action: "export",
        json: JSON.stringify(data),
      });
      return;
    }
    const blob = new Blob([JSON.stringify(data)], {
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
  } else if (a === "split") {
    if (invPick !== null) inventory.split(invPick);
    invPick = null;
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
  return snapshotWorld(world, {
    edits,
    player,
    view: { yaw, pitch, firstPerson },
    health: vitals.health,
    food: vitals.food,
    time: timeOfDay,
    inventory,
    device: thisDevice,
    animals,
    monsters,
  });
}
function save() {
  if (!world) return true;
  try {
    // The copy from before this play time is kept, at most every half hour.
    store.backup(world.id);
    store.save(saveData());
    cloud.schedule();
    return true;
  } catch {
    toast(t("saveError"));
    return false;
  }
}
// Keeps a small picture of the world being played, for the world list.
const thumbCanvas = document.createElement("canvas");
function snapThumb() {
  if (!world || mode !== "playing") return;
  try {
    renderer.render(scene, camera);
    const src = renderer.domElement,
      h = 90,
      w = Math.round((h * src.width) / src.height);
    thumbCanvas.width = Math.min(w, 200);
    thumbCanvas.height = h;
    const ctx = thumbCanvas.getContext("2d");
    // Crop to the middle when the screen is very wide or very tall.
    const sw = (src.height * thumbCanvas.width) / h;
    ctx.drawImage(
      src,
      (src.width - sw) / 2,
      0,
      sw,
      src.height,
      0,
      0,
      thumbCanvas.width,
      h,
    );
    store.saveThumb(world.id, thumbCanvas.toDataURL("image/jpeg", 0.7));
  } catch {}
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
// A bed: a pillow at the top and a blanket in its colour.
const bedTexture = (blanket, fold) => () =>
  drawTexture((ctx) => {
    ctx.fillStyle = blanket;
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = "#f4efe6";
    ctx.fillRect(0, 0, 16, 5);
    ctx.fillStyle = fold;
    for (const x of [3, 8, 13]) ctx.fillRect(x, 6, 1, 10);
  });
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
  [COPPER_ORE]: oreTexture("#e07b4f"),
  [COPPER_BLOCK]: () =>
    drawTexture((ctx) => {
      ctx.fillStyle = "#d8834f";
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = "#f0a875";
      ctx.fillRect(1, 1, 14, 2);
      ctx.fillRect(1, 1, 2, 14);
      ctx.fillStyle = "#a95f37";
      ctx.fillRect(1, 13, 14, 2);
      ctx.fillRect(13, 1, 2, 14);
      ctx.fillStyle = "#5fb8a0";
      for (const [x, y] of [
        [5, 6],
        [9, 9],
      ])
        ctx.fillRect(x, y, 2, 2);
    }),
  [IRON_BLOCK]: () =>
    drawTexture((ctx) => {
      ctx.fillStyle = "#d9dcdc";
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = "#f4f6f6";
      ctx.fillRect(1, 1, 14, 2);
      ctx.fillStyle = "#a9adad";
      ctx.fillRect(1, 13, 14, 2);
      ctx.fillRect(7, 3, 2, 10);
    }),
  [GOLD_BLOCK]: () =>
    drawTexture((ctx) => {
      ctx.fillStyle = "#f2c94c";
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = "#fff0a8";
      ctx.fillRect(1, 1, 14, 2);
      ctx.fillStyle = "#c99a2e";
      ctx.fillRect(1, 13, 14, 2);
      ctx.fillRect(7, 3, 2, 10);
    }),
  [RED_SAND]: () =>
    drawTexture((ctx) => {
      ctx.fillStyle = "#c9663a";
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = "#df8456";
      for (const [x, y] of [
        [2, 2],
        [10, 4],
        [5, 11],
        [13, 12],
      ])
        ctx.fillRect(x, y, 2, 1);
    }),
  [CAMPFIRE]: () =>
    drawTexture((ctx) => {
      plankLines(ctx, "#8a5a33", "#5b3a20");
      ctx.fillStyle = "#ff8a2b";
      ctx.fillRect(3, 0, 10, 6);
      ctx.fillStyle = "#ffd36b";
      ctx.fillRect(6, 0, 4, 4);
    }),
  [CAMPFIRE_OUT]: () =>
    drawTexture((ctx) => plankLines(ctx, "#5b4a3c", "#3b2f25")),
  [LANTERN]: () =>
    drawTexture((ctx) => {
      ctx.fillStyle = "#3b3f40";
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = "#ffd36b";
      ctx.fillRect(3, 3, 10, 10);
      ctx.fillStyle = "#fff2b8";
      ctx.fillRect(6, 5, 4, 6);
    }),
  [BEE_NEST]: () =>
    drawTexture((ctx) => {
      ctx.fillStyle = "#e0b54a";
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = "#b8862e";
      for (const y of [3, 8, 13]) ctx.fillRect(0, y, 16, 1);
      ctx.fillStyle = "#3b2a14";
      ctx.fillRect(6, 9, 4, 3);
    }),
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
  [BED]: bedTexture("#c8473c", "#a8382f"),
  ...Object.fromEntries(
    BED_COLORS.map((color, i) => [
      bedBlock(color),
      bedTexture(
        ["#e98d2b", "#f2c94c", "#5f9f4a", "#3f6fc8", "#8a4fb5", "#2b2b30"][i],
        "#00000033",
      ),
    ]),
  ),
  [COBBLESTONE]: () =>
    drawTexture((ctx) => {
      ctx.fillStyle = "#5e6464";
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = "#8e9797";
      for (const [x, y, w, h] of [
        [1, 1, 6, 4],
        [8, 1, 7, 5],
        [1, 6, 4, 5],
        [6, 7, 5, 4],
        [12, 7, 3, 5],
        [1, 12, 7, 3],
        [9, 12, 6, 3],
      ])
        ctx.fillRect(x, y, w, h);
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
  ...Object.fromEntries(
    [
      [BLUE_FLOWER, "#5f8fe8"],
      [WHITE_FLOWER, "#f4f1ea"],
      [YELLOW_FLOWER, "#f2c94c"],
    ].map(([type, petal]) => [
      type,
      (ctx) => {
        ctx.fillStyle = "#4f9a46";
        ctx.fillRect(7, 7, 2, 9);
        ctx.fillRect(4, 11, 3, 1);
        ctx.fillStyle = petal;
        ctx.fillRect(5, 2, 6, 5);
        ctx.fillStyle = "#f6d24a";
        ctx.fillRect(7, 4, 2, 2);
      },
    ]),
  ),
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
// Water blocks share one see-through material; flowing water is lower.
const waterMaterial = new THREE.MeshStandardMaterial({
  color: 0x4dacae,
  transparent: true,
  opacity: 0.62,
  roughness: 0.28,
  depthWrite: false,
});
for (let i = 0; i < 4; i++) materials[WATER + i] = waterMaterial;
// Lava glows by itself, bright orange with darker crust.
const lavaMaterial = new THREE.MeshStandardMaterial({
  map: drawTexture((ctx) => {
    ctx.fillStyle = "#f06a1f";
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = "#ffb347";
    for (const [x, y, w] of [
      [1, 2, 5],
      [9, 5, 4],
      [3, 10, 6],
      [11, 12, 3],
    ])
      ctx.fillRect(x, y, w, 2);
    ctx.fillStyle = "#b8401a";
    for (const [x, y] of [
      [7, 1],
      [2, 7],
      [12, 9],
      [8, 14],
    ])
      ctx.fillRect(x, y, 3, 1);
  }),
  roughness: 0.6,
});
lavaMaterial.emissive.set(0xff6a1f);
lavaMaterial.emissiveMap = lavaMaterial.map;
lavaMaterial.emissiveIntensity = 0.9;
materials[LAVA] = materials[LAVA_FLOW] = lavaMaterial;
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
// Glowstone, lanterns, campfires and furnaces glow.
for (const type of [GLOWSTONE, LANTERN, CAMPFIRE, FURNACE]) {
  materials[type].emissive.set(type === FURNACE ? 0xff8a2b : 0xffd36b);
  materials[type].emissiveMap = materials[type].map;
  materials[type].emissiveIntensity = type === FURNACE ? 0.25 : 0.9;
}
// Torches always glow a little, and more at night.
const torchMaterial = materials[TORCH];
torchMaterial.emissive.set(0xffb347);
torchMaterial.emissiveMap = torchMaterial.map;
torchMaterial.emissiveIntensity = 0.6;
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
// Blocks that are not a whole cube: their boxes or crossed panels are
// listed in blocks.js.
const shapes = {};
BLOCKS.forEach((block, type) => {
  if (block.boxes) shapes[type] = boxesGeometry(block.boxes);
  else if (block.cross) shapes[type] = crossGeometry(block.cross);
});
// Amber works as a lantern: it glows as night falls.
const amber = materials[7];
amber.emissive.set(0xffa040);
amber.emissiveMap = amber.map;
amber.emissiveIntensity = 0;
// Plain blocks (whole cubes that do not glow or let light through) share
// one picture with all their drawings, and one material: each chunk draws
// them as a single mesh with only the faces that can be seen.
const plainTile = new Map();
materials.forEach((material, type) => {
  if (
    fillsBlock(type) &&
    !BLOCKS[type].light &&
    material?.map?.image &&
    !material.transparent &&
    !material.alphaTest &&
    !material.emissiveMap
  )
    plainTile.set(type, plainTile.size);
});
const ATLAS_ROWS = atlasRows(plainTile.size);
const atlasCanvas = document.createElement("canvas");
atlasCanvas.width = ATLAS_COLUMNS * CELL;
atlasCanvas.height = ATLAS_ROWS * CELL;
{
  const ctx = atlasCanvas.getContext("2d"),
    last = TILE - 1;
  ctx.imageSmoothingEnabled = false;
  for (const [type, tile] of plainTile) {
    const image = materials[type].map.image,
      [x, y] = tilePixel(tile);
    // Each piece: [from x, y, width, height] of the drawing, then where
    // it goes. The four edges and four corners are stretched outwards.
    for (const [sx, sy, sw, sh, dx, dy, dw, dh] of [
      [0, 0, TILE, TILE, 0, 0, TILE, TILE],
      [0, 0, 1, TILE, -GUTTER, 0, GUTTER, TILE],
      [last, 0, 1, TILE, TILE, 0, GUTTER, TILE],
      [0, 0, TILE, 1, 0, -GUTTER, TILE, GUTTER],
      [0, last, TILE, 1, 0, TILE, TILE, GUTTER],
      [0, 0, 1, 1, -GUTTER, -GUTTER, GUTTER, GUTTER],
      [last, 0, 1, 1, TILE, -GUTTER, GUTTER, GUTTER],
      [0, last, 1, 1, -GUTTER, TILE, GUTTER, GUTTER],
      [last, last, 1, 1, TILE, TILE, GUTTER, GUTTER],
    ])
      ctx.drawImage(image, sx, sy, sw, sh, x + dx, y + dy, dw, dh);
  }
}
const plainMaterial = new THREE.MeshStandardMaterial({
  map: pixelTexture(atlasCanvas),
  roughness: 1,
  vertexColors: true,
});
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
const exposed = (x, y, z, wet = isWater(blocks.get(key(x, y, z)))) =>
  [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ].some(([a, b, c]) => {
    const next = blocks.get(key(x + a, y + b, z + c));
    return next === undefined || (seeThrough(next) && !(wet && isWater(next)));
  });
function clearChunk(id) {
  const chunk = chunks.get(id);
  if (!chunk) return;
  for (const m of chunk.meshes) {
    terrain.remove(m);
    // Instanced meshes share their shape; the plain mesh owns its own.
    if (m.isInstancedMesh) m.dispose();
    else m.geometry.dispose();
  }
  chunks.delete(id);
}
function buildChunk(cx, cz, cells) {
  const id = chunkKey(cx, cz);
  clearChunk(id);
  const groups = new Map(),
    plain = [],
    lights = [],
    nests = [],
    crops = [];
  for (const [x, y, z, type] of cells) {
    if ([TORCH, 7, GLOWSTONE, CAMPFIRE, LANTERN].includes(type))
      lights.push([x, y, z]);
    if (type === BEE_NEST) nests.push([x, y, z]);
    if (cropInfo(type) && cropInfo(type).stage < 3) crops.push(key(x, y, z));
    if (plainTile.has(type)) {
      plain.push([x, y, z, type]);
      continue;
    }
    if (!exposed(x, y, z)) continue;
    if (!groups.has(type)) groups.set(type, []);
    groups.get(type).push([x, y, z]);
  }
  const matrix = new THREE.Matrix4(),
    meshList = [];
  const built = buildChunkGeometry(
    plain,
    (x, y, z) => fillsBlock(blocks.get(key(x, y, z))),
    (type) => plainTile.get(type),
    ATLAS_ROWS,
  );
  if (built.cells.length) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(built.positions, 3),
    );
    geometry.setAttribute(
      "normal",
      new THREE.BufferAttribute(built.normals, 3),
    );
    geometry.setAttribute("uv", new THREE.BufferAttribute(built.uvs, 2));
    geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(new Float32Array(built.positions.length), 3),
    );
    geometry.setIndex(new THREE.BufferAttribute(built.indices, 1));
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, plainMaterial);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.userData.cells = built.cells;
    mesh.userData.faceCell = built.faceCell;
    mesh.userData.cellVertex = built.cellVertex;
    measureLight(mesh);
    terrain.add(mesh);
    meshList.push(mesh);
  }
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
      !isLiquid(type) &&
      !cropInfo(type) &&
      !isPlant(type);
    mesh.receiveShadow = true;
    mesh.userData.type = type;
    mesh.userData.cells = group;
    measureLight(mesh);
    mesh.computeBoundingSphere();
    terrain.add(mesh);
    meshList.push(mesh);
  }
  chunks.set(id, {
    meshes: meshList,
    lights,
    nests,
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
  nestBlocks = [];
  for (const chunk of chunks.values()) {
    nestBlocks.push(...chunk.nests);
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
// Block light for each instance: the brightest open cell next to it.
let light = null,
  paintedDay = -1;
const lightColor = new THREE.Color();
function measureLight(mesh) {
  const cells = mesh.userData.cells,
    sky = new Uint8Array(cells.length),
    glow = new Uint8Array(cells.length);
  if (light)
    cells.forEach(([x, y, z], i) => {
      for (const [dx, dy, dz] of [
        [0, 1, 0],
        [1, 0, 0],
        [-1, 0, 0],
        [0, 0, 1],
        [0, 0, -1],
        [0, -1, 0],
        [0, 0, 0],
      ]) {
        const nx = x + dx,
          ny = y + dy,
          nz = z + dz;
        if (
          !light.inside(nx, ny, nz) ||
          (dx | dy | dz && light.blocked(nx, ny, nz))
        )
          continue;
        const j = light.index(nx, ny, nz);
        sky[i] = Math.max(sky[i], light.sky[j]);
        glow[i] = Math.max(glow[i], light.block[j]);
      }
    });
  else sky.fill(15);
  mesh.userData.sky = sky;
  mesh.userData.glow = glow;
  paintMesh(mesh, paintedDay < 0 ? 1 : paintedDay);
}
// Torch light is warm; sky light follows the time of day.
function paintMesh(mesh, day) {
  const { sky, glow, cellVertex } = mesh.userData,
    corners = mesh.isInstancedMesh ? null : mesh.geometry.attributes.color;
  for (let i = 0; i < sky.length; i++) {
    const fromSky = sky[i] * day,
      level = Math.max(glow[i], fromSky),
      b = brightness(level);
    if (glow[i] > fromSky) lightColor.setRGB(b, b * 0.93, b * 0.8);
    else lightColor.setRGB(b, b, b);
    if (!corners) mesh.setColorAt(i, lightColor);
    else
      // The plain mesh: every corner of the block takes its light.
      for (let v = cellVertex[i]; v < cellVertex[i + 1]; v++)
        corners.setXYZ(v, lightColor.r, lightColor.g, lightColor.b);
  }
  if (corners) corners.needsUpdate = true;
  else if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}
// The block a ray hit: an instance of a shaped block, or a face of the
// plain mesh.
const hitCell = (hit) =>
  hit.object.isInstancedMesh
    ? hit.object.userData.cells[hit.instanceId]
    : hit.object.userData.cells[
        hit.object.userData.faceCell[hit.faceIndex >> 1]
      ];
// Repaints everything when the sky gets noticeably lighter or darker.
function paintAll(day) {
  if (Math.abs(day - paintedDay) < 0.03) return;
  paintedDay = day;
  for (const chunk of chunks.values())
    for (const m of chunk.meshes) paintMesh(m, day);
}
// Redraws the chunks around the given blocks (neighbours too, at the borders).
// Light is recomputed 15 blocks around, and nearby chunks are repainted.
function rebuildAt(...points) {
  const todo = new Set();
  if (light) {
    const xs = points.map((p) => p[0]),
      zs = points.map((p) => p[2]);
    const box = [
      Math.min(...xs) - 15,
      Math.max(...xs) + 15,
      Math.min(...zs) - 15,
      Math.max(...zs) + 15,
    ];
    light.relight(...box);
    for (const [id, chunk] of chunks) {
      const [cx, cz] = id.split(",").map(Number);
      if (
        (cx + 1) * CHUNK - 1 < box[0] ||
        cx * CHUNK > box[1] ||
        (cz + 1) * CHUNK - 1 < box[2] ||
        cz * CHUNK > box[3]
      )
        continue;
      for (const m of chunk.meshes) measureLight(m);
    }
  }
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
  music.cave = mode === "playing" && underground();
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
  if (bed && isBed(blocks.get(key(...bed))))
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
  simulationClock.reset();
  entityInterpolation.reset();
  simulationRunning = false;
  tickMilliseconds = 0;
  world = w;
  // Rule clocks belong to a world, never to the menu or the previous island.
  spawnClock = 2;
  growClock = 5;
  waterClock = lavaClock = biomeClock = containerClock = 0;
  breedClock = 1;
  thunderClock = 8;
  autosaveClock = 60;
  attackCooldown = 0;
  // Biel arrives standing still, whatever he was doing in the last world.
  velocity = 0;
  grounded = false;
  peakY = null;
  jumpQueued = false;
  fishing = null;
  bobber.visible = false;
  rainLevel = darkLevel = 0;
  // The same world at the same age rolls the same way.
  roll = createRandom(`${w.id}:${Math.floor(w.age ?? 0)}`);
  ambientRoll = roll.fork("ambient-fish");
  fishClock = 0;
  school.children.forEach((f) => {
    f.userData.home = null;
  });
  store.setCurrent(w.id);
  useTerrain({ seed: w.seed, size: w.size, gen: w.gen });
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
  light = new LightMap({
    size: SIZE,
    maxY: MAX_Y,
    typeAt: (x, y, z) => blocks.get(key(x, y, z)),
    opaque: (type) =>
      type !== undefined && !seeThrough(type) && !passable(type),
  });
  light.relightAll();
  waterDirty = new Set();
  lavaDirty = new Set();
  honeyReady.clear();
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
  for (const a of [...arrows, ...bielArrows]) disposeModel(a.mesh);
  arrows = [];
  bielArrows = [];
  drawStart = null;
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
// Whether an action (see input/actions.js) is held on any input.
const pressed = (name) =>
  isHeld(name, { keys, touch: touchInput, pad: padHeld });
// Actions that happen once per press, from the keyboard, touch or a controller.
function trigger(name) {
  if (name === "jump") jumpTapped();
  else if (name === "down" && riding) dismount();
  else if (name === "place") edit(true);
  else if (name === "attack") attack();
  else if (name === "backpack") action("inventory");
  else if (name === "pause") action("pause");
  else if (name === "view") togglePerspective();
  else if (name === "next" || name === "previous") {
    selected = (selected + (name === "next" ? 1 : 8)) % 9;
    render();
  }
}
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
    if (hit("confirm")) trigger("jump");
    if (hit("back")) trigger("down");
    // With a bow, pressing draws it and letting go shoots.
    if (hit("place"))
      holdingBow() || holdingShield() ? startDraw() : trigger("place");
    if (before?.place && !now.place && drawStart !== null) trigger("place");
    for (const name of ["attack", "backpack", "pause", "next", "previous"])
      if (hit(name)) trigger(name);
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
  if (e.target.closest('[data-action="place"]')) startDraw();
  const control = e.target.closest("[data-key]");
  if (!control || mode !== "playing") return;
  e.preventDefault();
  touchInput.press(e.pointerId, control.dataset.key);
  if (["jump", "down"].includes(control.dataset.key))
    trigger(control.dataset.key);
  app.setPointerCapture(e.pointerId);
});
for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
  app.addEventListener(event, (e) => touchInput.release(e.pointerId));
// Dragging in the backpack: let go over another slot to move the stack there.
window.addEventListener("pointermove", (e) => {
  if (!invDrag || mode !== "inventory") return;
  const far = Math.hypot(e.clientX - invDrag.x, e.clientY - invDrag.y) > 12;
  app
    .querySelector(`[data-inv="${invDrag.from}"]`)
    ?.classList.toggle("dragging", far);
});
window.addEventListener("pointerup", (e) => {
  // A finger that slides off Build lets the bow go slack.
  const drawn = drawStart;
  if (drawn !== null && e.pointerType === "touch")
    setTimeout(() => drawStart === drawn && (drawStart = null), 400);
  const drag = invDrag;
  invDrag = null;
  if (!drag || mode !== "inventory") return;
  // A short tap is a click; the click handler deals with it.
  if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) <= 12) return;
  const over = document
    .elementFromPoint(e.clientX, e.clientY)
    ?.closest("[data-inv]");
  if (over) inventory.move(drag.from, +over.dataset.inv);
  invPick = null;
  render();
});
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
    // The cat starts near a ruin or cabin, if the island has one.
    const cat = animals.find((a) => a.type === "cat"),
      chest = [...blocks].find(([, type]) => type === CHEST);
    if (cat && chest) {
      const [x, , z] = chest[0].split(",").map(Number);
      Object.assign(cat, { x: x + 3, z, y: height(x + 3, z) + 0.51 });
    }
    world.animalsSpawned = true;
  }
  for (const model of [...animalGroup.children]) disposeModel(model);
  for (const a of animals) {
    a.mesh = MODELS[a.type]();
    a.mesh.position.set(a.x, a.y - 0.01, a.z);
    a.mesh.rotation.y = a.yaw;
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
  if (m.userData.wool && a.color) {
    if (m.userData.dyedWool) m.userData.wool.material.dispose();
    m.userData.dyedWool = true;
    m.userData.wool.material = new THREE.MeshStandardMaterial({
      color: DYE_COLORS[a.color],
      roughness: 0.9,
    });
  }
  if (m.userData.collar) m.userData.collar.visible = a.tamed;
  if (m.userData.tag) {
    disposeModel(m.userData.tag);
    m.userData.tag = null;
  }
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
  const res = interact(a, held, world.age, roll());
  const who = nested("animalNames", a.type);
  animalVoice(a);
  if (res.use && !creative()) inventory.remove(res.use, 1);
  // Collect every product together: a partial stack must not duplicate wool
  // or lose the chicken's feather when the animal is asked again.
  if (
    res.give &&
    !creative() &&
    !inventory.collect([res.give, ...(res.extra ? [res.extra] : [])])
  ) {
    a.readyAt = 0;
    toast(t("full"));
    return;
  }
  if (res.result === "gave") {
    toast(t("gave_" + a.type) + (res.extra ? " " + t("gotFeather") : ""));
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
  } else if (res.result === "shorn") {
    toast(t("shorn", { n: res.give[1] }));
    beepAt(620, 920);
    wearHeld();
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
  for (let i = 0; i < 6; i++)
    particle(heartMaterial, 0.12, [a.x, a.y + 1.2, a.z], 1.5, 1.5, 1);
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
// Bees buzz around their nests by day; they go home at night and in rain.
const swarm = new THREE.Group();
scene.add(swarm);
for (let i = 0; i < 8; i++) {
  const b = bee();
  b.userData.phase = i * 2.4;
  swarm.add(b);
}
function updateBees(dt, daylight) {
  const on =
    scenery === "game" &&
    (world?.options.animals ?? false) &&
    daylight > 0.45 &&
    rainLevel < 0.5;
  const near = on
    ? nestBlocks
        .map((p) => [p, Math.hypot(p[0] - player.x, p[2] - player.z)])
        .filter(([, d]) => d < 32)
        .sort((a, b) => a[1] - b[1])
        .slice(0, 4)
        .map(([p]) => p)
    : [];
  swarm.children.forEach((b, i) => {
    const home = near[i % Math.max(1, near.length)];
    b.visible = !!home && i < near.length * 2;
    if (!b.visible) return;
    const a = elapsed * (0.9 + (i % 3) * 0.2) + b.userData.phase,
      r = 1.4 + (i % 2) * 1.1;
    b.position.set(
      home[0] + Math.cos(a) * r,
      home[1] + 0.4 + Math.sin(a * 2.3) * 0.5,
      home[2] + Math.sin(a) * r,
    );
    b.rotation.y = -a;
    for (const w of b.userData.wings)
      w.rotation.z = Math.sin(elapsed * 40 + i) * 0.7 * w.userData.side;
  });
}
// Fish swim in the sea near Biel, and dart away when he gets close.
const school = new THREE.Group();
scene.add(school);
[0xe98d2b, 0x5fb8e8, 0xf2c94c, 0xe85d8a, 0x9fd36b, 0xe98d2b].forEach(
  (color, i) => {
    const f = fish(color);
    f.userData.phase = i * 1.7;
    school.add(f);
  },
);
let fishClock = 0;
function updateFish(dt) {
  const on = scenery === "game" && (world?.options.animals ?? false);
  fishClock -= dt;
  if (on && fishClock <= 0) {
    // Every few seconds each fish picks deep water near Biel to swim around.
    fishClock = 6;
    school.children.forEach((f, i) => {
      f.userData.home = null;
      for (let tries = 0; tries < 12 && !f.userData.home; tries++) {
        const x = Math.round(player.x + (ambientRoll() - 0.5) * 28),
          z = Math.round(player.z + (ambientRoll() - 0.5) * 28),
          floor = topAt(x, z);
        if (
          Math.abs(x) <= SIZE &&
          Math.abs(z) <= SIZE &&
          floor + 0.5 < WATER_LEVEL - 1.2
        )
          f.userData.home = [x, (floor + 0.5 + WATER_LEVEL) / 2, z];
      }
      if (i === 0 && !f.userData.home) fishClock = 2;
    });
  }
  for (const f of school.children) {
    const home = f.userData.home;
    f.visible = on && !!home;
    if (!f.visible) continue;
    const scared =
      Math.hypot(f.position.x - player.x, f.position.z - player.z) < 2.5;
    f.userData.phase += dt * (scared ? 2.4 : 0.6);
    const a = f.userData.phase;
    f.position.set(
      home[0] + Math.cos(a) * 2.2,
      Math.min(WATER_LEVEL - 0.35, home[1] + Math.sin(a * 1.7) * 0.25),
      home[2] + Math.sin(a) * 2.2,
    );
    f.rotation.y = -a;
    f.userData.tail.rotation.y = Math.sin(elapsed * (scared ? 22 : 9)) * 0.5;
  }
}
// Every world starts with 19 animals, so even "light" leaves room for babies.
const animalLimit = () => (settings.quality === "high" ? 40 : 28);
let breedClock = 1;
function breedAnimals(dt) {
  breedClock -= dt;
  if (breedClock > 0) return;
  breedClock = 1;
  const limit = animalLimit();
  // Over the limit, a wild animal far away (never a friend) wanders off.
  if (animals.length > limit) {
    const far = animals
      .filter((a) => !a.tamed && a !== riding)
      .map((a) => [a, Math.hypot(a.x - player.x, a.z - player.z)])
      .filter(([, d]) => d > 40)
      .sort((a, b) => b[1] - a[1])[0]?.[0];
    if (far) {
      disposeModel(far.mesh);
      if (targetAnimal === far) targetAnimal = null;
      animals = animals.filter((x) => x !== far);
    }
  }
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
        pressed("forward") ||
        pressed("left") ||
        pressed("backward") ||
        pressed("right");
      m.userData.moving = gallop;
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
        a.walking = roll() < 0.6;
        a.yaw += (roll() - 0.5) * 2.4;
        a.timer = 2 + roll() * 3;
      }
      if (a.walking) speed = ANIMALS[a.type].speed;
    }
    if (speed) {
      // Animals stay on the island, do not climb walls and, unless they
      // are pets, keep out of the water. A blocked animal turns away.
      const moved = step(
        a,
        a.yaw,
        speed,
        dt,
        surfaceY,
        (nx, nz, ny) =>
          Math.abs(nx) <= SIZE - 1 &&
          Math.abs(nz) <= SIZE - 1 &&
          ny - a.y <= 1.05 &&
          (ny >= WATER_LEVEL - 0.3 || a.tamed),
      );
      if (!moved) {
        a.yaw += Math.PI * (0.5 + roll());
        a.timer = 1;
        speed = 0;
      }
    }
    settle(a, dt, surfaceY);
    m.position.set(a.x, a.y - 0.01, a.z);
    m.rotation.y +=
      Math.atan2(
        Math.sin(a.yaw - m.rotation.y),
        Math.cos(a.yaw - m.rotation.y),
      ) * Math.min(1, dt * 8);
    m.userData.moving = speed > 0;
    if (m.userData.body) m.userData.body.rotation.x = a.sitting ? -0.35 : 0;
    if (m.userData.wool)
      m.userData.wool.scale.setScalar(world.age < a.readyAt ? 0.82 : 1);
  }
}
// The rules say who is walking, twenty times a second. Legs, heads and tails
// swing on every drawn frame, so they stay smooth between ticks.
function poseCreatures() {
  const swingLegs = (mesh, swing) =>
    mesh.userData.legs.forEach(
      (l, i) => (l.rotation.x = i % 2 ? swing : -swing),
    );
  for (const a of animals) {
    const m = a.mesh,
      moving = m.userData.moving;
    if (!m.visible) continue;
    if (a === riding) {
      swingLegs(m, moving ? Math.sin(elapsed * 14) * 0.7 : 0);
      continue;
    }
    swingLegs(m, moving ? Math.sin(elapsed * 10) * 0.6 : 0);
    if (m.userData.head)
      m.userData.head.rotation.x = moving
        ? 0
        : Math.sin(elapsed * 1.5 + a.x) * 0.12;
    if (m.userData.tail)
      m.userData.tail.rotation.y = a.tamed ? Math.sin(elapsed * 14) * 0.5 : 0;
  }
  for (const { mesh, x } of monsters) {
    swingLegs(mesh, mesh.userData.moving ? Math.sin(elapsed * 8) * 0.5 : 0);
    if (mesh.userData.head)
      mesh.userData.head.rotation.z = Math.sin(elapsed * 2 + x) * 0.15;
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
    hop: roll() * 6,
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
    const x = Math.round(player.x + (roll() - 0.5) * 20),
      z = Math.round(player.z + (roll() - 0.5) * 20),
      y = Math.round(player.y + (roll() - 0.5) * 6);
    if (Math.hypot(x - player.x, z - player.z) < 6) continue;
    if (
      blocks.has(key(x, y, z)) ||
      blocks.has(key(x, y + 1, z)) ||
      !blocks.has(key(x, y - 1, z))
    )
      continue;
    if (
      light
        ? light.level(x, y, z, isNight() ? 0 : 1) > 7
        : lightBlocks.some(
            ([lx, ly, lz]) => Math.hypot(lx - x, ly - y, lz - z) < 6,
          )
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
        rand: roll,
        player,
        lights: lightBlocks,
        lightAt: light
          ? (x, y, z) => light.level(x, y, z, state.night ? 0 : 1)
          : null,
        surface: (x, z) => surfaceY(x, z, 40),
      });
  if (!spot) return null;
  const types = allowedMonsters(world.options.difficulty, below);
  const m = addMonster(types[Math.floor(roll() * types.length)], spot);
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
  disposeModel(m.mesh);
  monsters = monsters.filter((x) => x !== m);
  if (targetMonster === m) targetMonster = null;
}
// Colourful sparkles instead of anything scary.
const sparkleMaterials = [0xffd25e, 0x8fd3f4, 0xf08cc0, 0x9fd36f].map(
  (color) => new THREE.MeshBasicMaterial({ color }),
);
function sparkle(p) {
  for (let i = 0; i < 14; i++)
    particle(sparkleMaterials[i % 4], 0.1, p, 4, 0, 0.7);
}
function hurtPlayer(amount, from) {
  if (creative()) return;
  // A shield anywhere in the hotbar stops half of a hit from the front;
  // held up (Build held down) it stops all of it.
  const raised = drawStart !== null && holdingShield();
  const shield = raised
    ? selected
    : inventory.slots.findIndex((s, i) => i < 9 && s?.id === "shield");
  if (shield >= 0 && vitals.hurtCooldown <= 0) {
    const through = shieldDamage(amount, yaw, player, from, raised);
    if (through < amount) {
      beepAt(180, 110);
      wearSlot(shield);
      emit("block");
      if (!through) {
        vitals.hurtCooldown = 0.8;
        return;
      }
      amount = through;
    }
  }
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
  const previousHealth = m.hp;
  const res = strike(m, damage);
  if (res.result === "poof" && !creative() && !giveRewards([res.drop])) {
    m.hp = previousHealth;
    return false;
  }
  m.flash = 0.2;
  const away = Math.atan2(m.x - player.x, m.z - player.z);
  m.x += Math.sin(away) * 0.6;
  m.z += Math.cos(away) * 0.6;
  beepAt(700, 300);
  sound(m.type, 0.6);
  if (res.result === "split") {
    removeMonster(m);
    for (const side of [-0.5, 0.5])
      addMonster("jelly", { x: m.x + side, y: m.y, z: m.z - side }, true);
  } else if (res.result === "poof") {
    removeMonster(m);
    if (!creative())
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
  if (!foe) {
    const prey = preyNearby();
    if (!prey) return;
    attackCooldown = 0.45;
    rightArm.rotation.x = -1.6;
    catchAnimal(prey);
    return;
  }
  attackCooldown = 0.45;
  rightArm.rotation.x = -1.6;
  if (
    hitMonster(foe, weaponDamage(heldId())) !== false &&
    ITEMS[heldId()]?.damage
  )
    wearHeld();
}
// With "Animals only friends" off, farm animals can be caught for food:
// the animal under the pointer, or the nearest one in reach.
const canHunt = (a) =>
  !creative() && a !== riding && huntable(a, world.options);
function preyNearby() {
  if (targetAnimal && canHunt(targetAnimal)) return targetAnimal;
  return animals
    .filter(
      (a) => canHunt(a) && Math.hypot(a.x - player.x, a.z - player.z) < 3.2,
    )
    .sort(
      (a, b) =>
        Math.hypot(a.x - player.x, a.z - player.z) -
        Math.hypot(b.x - player.x, b.z - player.z),
    )[0];
}
function catchAnimal(a) {
  const who = nested("animalNames", a.type);
  animalVoice(a);
  const previousHits = a.hits;
  const give = hitAnimal(a);
  if (!give) {
    // The first hit makes it hop away from Biel.
    const away = Math.atan2(a.x - player.x, a.z - player.z);
    a.x += Math.sin(away) * 1.2;
    a.z += Math.cos(away) * 1.2;
    a.yaw = away;
    toast(t("ouch", { animal: who }));
    return;
  }
  if (!giveRewards(give)) {
    a.hits = previousHits;
    return;
  }
  sparkle([a.x, a.y + 0.5, a.z]);
  disposeModel(a.mesh);
  animals = animals.filter((x) => x !== a);
  if (targetAnimal === a) targetAnimal = null;
  toast(t("hunted", { animal: who }));
  if (ITEMS[heldId()]?.damage) wearHeld();
  scheduleSave();
  render();
}
// Biel's own arrows: they fly where he aims and fall a little.
let bielArrows = [];
// Drawing the bow: pressing Build starts it, letting go shoots.
let drawStart = null;
const holdingBow = () => ITEMS[heldId()]?.tool === "bow";
// The same press holds a shield up.
const holdingShield = () => ITEMS[heldId()]?.tool === "shield";
function startDraw() {
  if (mode === "playing" && (holdingBow() || holdingShield()))
    drawStart = performance.now();
}
function shootBow(drawnAt) {
  const shot = bowShot(
    drawnAt === null ? undefined : (performance.now() - drawnAt) / 1000,
  );
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
    vel: aim.ray.direction.clone().multiplyScalar(shot.speed),
    damage: shot.damage,
    life: 3,
  });
  beepAt(400 + 300 * shot.power, 700 + 400 * shot.power);
  wearHeld();
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
    if (foe) hitMonster(foe, a.damage);
    const t0 = blocks.get(
      key(Math.round(p.x), Math.round(p.y), Math.round(p.z)),
    );
    if (foe || (t0 !== undefined && !passable(t0)) || a.life <= 0) {
      disposeModel(a.mesh);
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
      m.dawn = (m.dawn ?? roll() * 2) - dt;
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
      sound(m.type, 0.7);
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
    } else if (!attacksNow(m.type, isNight())) {
      // By day a spider keeps its distance and just wanders.
      if (d < 3) dir += Math.PI;
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
    } else if (speed)
      // Monsters stay on the island; spiders climb walls three blocks high.
      step(
        m,
        dir,
        speed,
        dt,
        surfaceY,
        (nx, nz, ny) =>
          ny - m.y <= (MONSTERS[m.type].climbs ? 3.05 : 1.05) &&
          ny > -5 &&
          Math.abs(nx) < SIZE &&
          Math.abs(nz) < SIZE,
      );
    if (!MONSTERS[m.type].flies) settle(m, dt, surfaceY);
    const mesh = m.mesh;
    mesh.position.set(
      m.x,
      m.y -
        0.01 +
        (m.type === "jelly" ? Math.max(0, Math.sin(m.hop)) * 0.35 : 0),
      m.z,
    );
    mesh.rotation.y = m.yaw;
    mesh.userData.moving = speed > 0;
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
      disposeModel(a.mesh);
      arrows = arrows.filter((x) => x !== a);
    }
  }
  const btn = app.querySelector(".attack-btn");
  if (btn)
    btn.classList.toggle(
      "hidden",
      !monsters.some((m) => Math.hypot(m.x - player.x, m.z - player.z) < 3.5) &&
        !preyNearby(),
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
function tickWeather(dt) {
  let state = "clear";
  if (world.options.weather) {
    world.weather = validateWeather(world.weather);
    if (world.age >= world.weather.until)
      world.weather = {
        state: nextWeather(roll, world.options.difficulty),
        until: world.age + weatherLength(roll),
      };
    state = world.weather.state;
  }
  rainLevel = approach(rainLevel, LOOK[state].rain, dt);
  darkLevel = approach(darkLevel, LOOK[state].dark, dt, 0.15);
  if (state === "storm") {
    thunderClock -= dt;
    if (thunderClock <= 0) {
      thunderClock = 6 + roll() * 12;
      thunder();
    }
  }
}
function updateWeather(dt, inGame) {
  if (!inGame) {
    rainLevel = approach(rainLevel, 0, dt);
    darkLevel = approach(darkLevel, 0, dt, 0.15);
  }
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
  targetWater = null;
  targetLava = null;
  for (const hit of hits) {
    const p = hitCell(hit);
    // Water and lava are looked through; a bucket can still scoop them.
    const liquid = hit.object.userData.type;
    if (isLiquid(liquid)) {
      const near = new THREE.Vector3(...p).distanceTo(player) < 6;
      if (near && isWater(liquid) && !targetWater) targetWater = p;
      if (near && isLava(liquid) && !targetLava) targetLava = p;
      continue;
    }
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
  const holding = pressed("break") || mouseBreak || !!pointerDown?.mining;
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
  if (!settings.sound) return;
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
// Small flying cubes (crumbs, sparkles, hearts). Finished ones wait in a
// pool and are used again, so breaking blocks does not keep making meshes.
const particles = [],
  particlePool = [];
function particle(material, size, [x, y, z], spread, lift, life) {
  const m = particlePool.pop() ?? new THREE.Mesh(cube);
  m.material = material;
  m.scale.setScalar(size);
  m.position.set(x, y, z);
  m.rotation.set(0, 0, 0);
  scene.add(m);
  particles.push({
    m,
    v: new THREE.Vector3(
      (Math.random() - 0.5) * spread,
      lift + Math.random() * (lift ? 1 : spread),
      (Math.random() - 0.5) * spread,
    ),
    life,
  });
}
function burst(p, type) {
  for (let i = 0; i < 8; i++) particle(materials[type], 0.12, p, 3, 0, 0.6);
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
// A footstep that sounds like the ground under Biel.
function footstep() {
  if (!settings.sound) return;
  const x = Math.round(player.x),
    z = Math.round(player.z),
    wading = blocks.get(key(x, Math.round(player.y + 0.2), z));
  const kind = isWater(wading)
    ? "water"
    : stepKind(blocks.get(key(x, Math.round(player.y - 0.3), z)));
  try {
    if (kind) playStep(audioContext(), kind, settings.volume.fx);
  } catch {}
}
// A short sound from sounds.js (doors, chests, the furnace, monsters).
function sound(name, volume = 1) {
  if (!settings.sound) return;
  try {
    playVoice(audioContext(), name, settings.volume.fx * volume);
  } catch {}
}
// An animal says something, softer when it is further away.
function animalVoice(a) {
  if (!settings.sound) return;
  const far = Math.hypot(a.x - player.x, a.z - player.z);
  try {
    playVoice(
      audioContext(),
      a.type,
      settings.volume.fx * Math.max(0.15, 1 - far / 14),
      a.baby ? 1.4 : 0.9 + Math.random() * 0.2,
    );
  } catch {}
}
// Now and then a nearby animal moos, baas or clucks.
let autosaveClock = 60,
  stepClock = 0,
  chatterClock = 6;
function animalChatter(dt) {
  chatterClock -= dt;
  if (chatterClock > 0) return;
  chatterClock = 8 + Math.random() * 12;
  const near = animals.filter(
    (a) => a !== riding && Math.hypot(a.x - player.x, a.z - player.z) < 12,
  );
  if (near.length) animalVoice(near[Math.floor(Math.random() * near.length)]);
}
// Backpacks left behind on harder difficulties, waiting to be picked up.
const backpackGroup = new THREE.Group();
scene.add(backpackGroup);
const backpackMaterial = new THREE.MeshStandardMaterial({
  color: 0xe9852b,
  roughness: 0.8,
});
const backpackGeometry = new THREE.BoxGeometry(0.5, 0.55, 0.35);
function bagPosition(position) {
  return {
    x: Math.max(-SIZE, Math.min(SIZE, position.x)),
    y: Math.max(0, Math.min(MAX_Y + 10, position.y)),
    z: Math.max(-SIZE, Math.min(SIZE, position.z)),
  };
}
function giveRewards(items) {
  const where = inLava(blocks, player.x, player.y, player.z)
    ? lastSafe
    : player;
  const result = collectRewards(
    inventory,
    world.backpacks,
    items,
    bagPosition(where),
  );
  if (!result.ok) {
    toast(t("groundBagsFull"));
    return false;
  }
  if (result.dropped) {
    rebuildBackpacks();
    setTimeout(() => toast(t("rewardsLeft")), 0);
  }
  scheduleSave();
  return true;
}
function rebuildBackpacks() {
  backpackGroup.clear();
  for (const pack of world?.backpacks ?? []) {
    const m = new THREE.Mesh(backpackGeometry, backpackMaterial);
    m.position.set(pack.x, pack.y + 0.3, pack.z);
    m.userData.pack = pack;
    backpackGroup.add(m);
  }
}
// Lava: on Normal and Hard it burns; on gentler levels it is warm magma
// that only nudges Biel out. The last safe spot keeps a lost backpack
// out of the lava.
let lavaNoteClock = 0;
const lastSafe = { x: 0, y: 0, z: 0 };
function touchLava(dt) {
  lavaNoteClock -= dt;
  const hot =
    inLava(blocks, player.x, player.y, player.z) ||
    inLava(blocks, player.x, player.y + 1, player.z);
  if (!hot) {
    if (grounded) Object.assign(lastSafe, player);
    return;
  }
  if (creative()) return;
  if (rules().lavaHurts) {
    if (hurt(vitals, 3, rules())) {
      hurtFlash();
      beepAt(260, 140);
    }
    if (lavaNoteClock <= 0) toast(t("lavaHot"));
  } else {
    velocity = Math.max(velocity, 5);
    if (lavaNoteClock <= 0) toast(t("lavaWarm"));
  }
  if (lavaNoteClock <= 0) {
    lavaNoteClock = 4;
    emit("lava");
  }
}
function fallAsleep() {
  mode = "asleep";
  keys.clear();
  touchInput.clear();
  if (!world.options.keepInventory && inventory.slots.some(Boolean)) {
    const where = inLava(blocks, player.x, player.y, player.z)
      ? lastSafe
      : player;
    const stored = collectRewards(
      new Inventory(0),
      world.backpacks,
      inventory.toJSON().filter(Boolean),
      bagPosition(where),
    );
    if (stored.ok) {
      inventory = new Inventory();
      rebuildBackpacks();
      setTimeout(() => toast(t("backpackLeft")), 300);
    } else {
      // Never discard a backpack when every ground bag is full.
      setTimeout(() => toast(t("backpackKept")), 300);
    }
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
  if (type === null) blocks.delete(k);
  else blocks.set(k, type);
  edits.set(k, type);
}
// Water and lava near a changed block get a look on their next step.
function wakeWater(...points) {
  for (const p of points)
    for (const k of around(p)) {
      waterDirty.add(k);
      lavaDirty.add(k);
    }
}
const typeAtCell = (x, y, z) => blocks.get(key(x, y, z));
const insideWorld = (x, y, z) =>
  Math.abs(x) <= SIZE && Math.abs(z) <= SIZE && y >= 1 && y < MAX_Y;
function applyFlow(changes) {
  if (!changes.length) return;
  for (const [x, y, z, type] of changes) setBlock([x, y, z], type);
  rebuildAt(...changes.map(([x, y, z]) => [x, y, z]));
  scheduleSave();
}
// Water flows every 0.35 s; lava is slower. Lava touching water cools
// into stone first.
function updateWater(dt) {
  waterClock -= dt;
  lavaClock -= dt;
  if (waterClock <= 0 && (waterDirty.size || lavaDirty.size)) {
    const cooled = quench([...waterDirty, ...lavaDirty], typeAtCell);
    if (cooled.length) {
      applyFlow(cooled);
      wakeWater(...cooled.map(([x, y, z]) => [x, y, z]));
      if (
        cooled.some(
          ([x, y, z]) =>
            Math.hypot(x - player.x, y - player.y, z - player.z) < 8,
        )
      ) {
        toast(t("lavaStone"));
        beepAt(900, 300);
      }
    }
  }
  if (waterClock <= 0 && waterDirty.size) {
    waterClock = 0.35;
    const { changes, dirty } = flowWater(
      waterDirty,
      typeAtCell,
      insideWorld,
      48,
    );
    waterDirty = dirty;
    applyFlow(changes);
  }
  if (lavaClock <= 0 && lavaDirty.size) {
    lavaClock = 1.2;
    const { changes, dirty } = flowLava(lavaDirty, typeAtCell, insideWorld, 48);
    lavaDirty = dirty;
    applyFlow(changes);
  }
}
// Tools wear out on Normal and Hard, with a friendly warning first.
function wearHeld() {
  wearSlot(selected);
}
function wearSlot(index) {
  if (creative() || !rules().toolWear) return;
  const name = itemName(inventory.slots[index]?.id),
    result = inventory.wearOut(index);
  if (result === "tired") toast(t("toolTired", { item: name }));
  if (result === "broke") {
    toast(t("toolBroke", { item: name }));
    beepAt(320, 160);
  }
  render();
}
// An empty bucket scoops still water (or the sea) or a lava source; a full
// one pours it out again.
function useBucket(full, lava = false) {
  if (!full && targetLava && blocks.get(key(...targetLava)) === LAVA) {
    setBlock(targetLava, null);
    wakeWater(targetLava);
    rebuildAt(targetLava);
    if (!creative())
      inventory.slots[selected] = { id: "lava_bucket", count: 1 };
    toast(t("gotLava"));
    beepAt(200, 420);
  } else if (!full) {
    let ok = false;
    if (targetWater && blocks.get(key(...targetWater)) === WATER) {
      setBlock(targetWater, null);
      wakeWater(targetWater);
      rebuildAt(targetWater);
      ok = true;
    } else {
      const aim = new THREE.Raycaster();
      aim.setFromCamera(
        (firstPerson && pointerKind !== "touch") || pointerKind === "pad"
          ? center
          : pointer,
        camera,
      );
      const hit = aim.intersectObject(water)[0];
      ok =
        !!hit &&
        hit.point.distanceTo(player) < 6 &&
        (!target ||
          hit.distance <
            aim.ray.origin.distanceTo(new THREE.Vector3(...target.p))) &&
        topAt(Math.round(hit.point.x), Math.round(hit.point.z)) + 0.5 <
          WATER_LEVEL;
    }
    if (!ok) return flashLabel(t("noWater"));
    if (!creative())
      inventory.slots[selected] = { id: "water_bucket", count: 1 };
    toast(t("gotWater"));
    beepAt(300, 520);
  } else {
    if (!target) return;
    const p = target.p.map((v, i) =>
      Math.round(v + [target.normal.x, target.normal.y, target.normal.z][i]),
    );
    const there = blocks.get(key(...p));
    if (
      Math.abs(p[0]) > SIZE ||
      Math.abs(p[2]) > SIZE ||
      p[1] < 1 ||
      p[1] >= MAX_Y ||
      (there !== undefined && !isLiquid(there))
    )
      return;
    setBlock(p, lava ? LAVA : WATER);
    wakeWater(p);
    rebuildAt(p);
    if (!creative()) inventory.slots[selected] = { id: "bucket", count: 1 };
    toast(t(lava ? "pouredLava" : "pouredWater"));
    beepAt(lava ? 300 : 520, lava ? 160 : 260);
  }
  emit("bucket");
  scheduleSave();
  render();
}
// Bee nests give honey to a bottle, then the bees need a little while.
const honeyReady = new Map();
function collectHoney(k) {
  if ((honeyReady.get(k) ?? 0) > world.age) return toast(t("beesBusy"));
  honeyReady.set(k, world.age + 60);
  if (!creative()) {
    inventory.takeFrom(selected);
    // No room for the honey: the bottle goes back and the bees keep it.
    if (inventory.add("honey", 1)) {
      inventory.add("bottle", 1);
      honeyReady.delete(k);
      return toast(t("full"));
    }
  }
  toast(t("gotHoney"));
  emit("got:honey");
  beepAt(620, 880);
  render();
}
// Height of the highest block in a column (the water line is just above 1).
function topAt(x, z) {
  for (let y = MAX_Y; y >= 0; y--) if (blocks.has(key(x, y, z))) return y;
  return -1;
}
// Every few seconds, crops may grow a stage; water nearby (or rain) helps.
// Rain puts out campfires that have nothing over them. Campfires are only
// ever built by Biel, so they are all in the edits.
const underSky = (x, y, z) => topAt(x, z) === y;
function rainOnCampfires() {
  if (!raining()) return;
  const out = [];
  for (const [k, type] of edits)
    if (type === CAMPFIRE) {
      const p = k.split(",").map(Number);
      if (underSky(...p)) out.push(p);
    }
  if (!out.length) return;
  for (const p of out) setBlock(p, CAMPFIRE_OUT);
  rebuildAt(...out);
  if (out.some((p) => Math.hypot(p[0] - player.x, p[2] - player.z) < 16))
    toast(t("campfireOut"));
  scheduleSave();
}
function growCrops(dt) {
  growClock -= dt;
  if (growClock > 0) return;
  rainOnCampfires();
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
      roll(),
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
  fishing = { until: world.age + 2 + roll() * 3, from: player.clone() };
  bobber.position.copy(hit.point);
  bobber.visible = true;
  toast(t("fishing"));
}
function updateFishing() {
  if (!fishing) return;
  if (player.distanceTo(fishing.from) > 3 || ITEMS[heldId()]?.tool !== "rod") {
    fishing = null;
    bobber.visible = false;
  } else if (world.age >= fishing.until) {
    if (!creative() && !giveRewards([["fish", 1]])) {
      fishing.until = world.age + 5;
      return;
    }
    fishing = null;
    bobber.visible = false;
    toast(t("caught"));
    beepAt(700, 1000);
    wearHeld();
    render();
  }
}
// Signs: the text floats just above the board.
const signGroup = new THREE.Group();
scene.add(signGroup);
function refreshSigns() {
  for (const tag of [...signGroup.children]) disposeModel(tag);
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
  sound(type === CHEST ? "chest" : "furnace");
  container = { type, key: k };
  invPick = null;
  open(type === CHEST ? "chest" : "furnace");
  render();
}
function emptyContainer(type, k, extra = []) {
  const items =
    type === CHEST
      ? chestAt(k)
          .slots.filter(Boolean)
          .map((s) => [s.id, s.count, s.wear])
      : ["input", "fuel", "output"]
          .map((slot) => validateFurnace(world.furnaces[k])[slot])
          .filter(Boolean);
  if (!inventory.collect([...items, ...extra])) {
    toast(t("full"));
    return false;
  }
  delete world.chests[k];
  delete world.furnaces[k];
  return true;
}
// Moves a whole stack between the backpack and the open chest or furnace.
function moveStack(from, index) {
  if (container.type === CHEST) {
    const chest = chestAt(container.key);
    const [source, dest] =
      from === "bag" ? [inventory, chest] : [chest, inventory];
    const slot = source.slots[index];
    if (!slot) return;
    const left = dest.add(slot.id, slot.count, slot.wear);
    source.slots[index] = left ? { ...slot, count: left } : null;
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
  // Any use of Build ends drawing the bow; only a shot uses the draw.
  const drawnAt = drawStart;
  drawStart = null;
  if (mode !== "playing") return;
  // Letting go of a shield that was held up does nothing else (a quick
  // tap still opens doors and the like).
  if (
    place &&
    holdingShield() &&
    drawnAt !== null &&
    performance.now() - drawnAt > 250
  )
    return;
  if (place && targetAnimal) {
    interactWith(targetAnimal);
    return;
  }
  // Doors, chests, beds and the like are used, and seeds go into farmland,
  // even with food in the hand. Otherwise food is eaten instead of building.
  const aimed = target ? blocks.get(key(...target.p)) : undefined,
    usable =
      [CHEST, FURNACE, BENCH, SIGN, CAMPFIRE_OUT].includes(aimed) ||
      isBed(aimed) ||
      isDoor(aimed) ||
      !!OPENS[aimed] ||
      (!!ITEMS[heldId()]?.plants && aimed === FARMLAND);
  const food = ITEMS[heldId()]?.food;
  if (place && food && !creative() && !usable) {
    const heal = ITEMS[heldId()]?.heal ?? 0,
      healed = heal > 0 && vitals.health < 20;
    if (healed) vitals.health = Math.min(20, vitals.health + heal);
    if (eat(vitals, food) || healed) {
      const name = itemName(inventory.takeFrom(selected));
      toast(t("yum", { item: name }));
      chomp();
      render();
      return;
    }
    // Not hungry: a mushroom can still be put down like any block.
    if (ITEMS[heldId()].block === undefined) {
      flashLabel(t("notHungry"));
      return;
    }
  }
  // The compass says where home is; the map item opens the map.
  if (place && heldId() === "compass") {
    const [hx, hz] = world.spawnPoint
        ? [world.spawnPoint[0], world.spawnPoint[2]]
        : homeAnchor,
      dx = hx - player.x,
      dz = hz - player.z,
      n = Math.round(Math.hypot(dx, dz));
    toast(
      n < 3
        ? t("compassHere")
        : t("compassSays", {
            n,
            dir: nested("directions", directionTo(dx, dz)),
          }),
    );
    return;
  }
  if (place && heldId() === "map") {
    action("map");
    return;
  }
  // A bow shoots an arrow where Biel is aiming.
  if (place && ITEMS[heldId()]?.tool === "bow") {
    shootBow(drawnAt);
    return;
  }
  // Fishing: cast the line onto water in front of Biel.
  if (place && ITEMS[heldId()]?.tool === "rod") {
    castLine();
    return;
  }
  if (place && ITEMS[heldId()]?.tool === "bucket") {
    useBucket(ITEMS[heldId()].full === true, ITEMS[heldId()].lava === true);
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
    wearHeld();
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
  // A workbench opens its nine squares.
  if (place && usedType === BENCH && !creative()) {
    sound("chest");
    action("bench");
    return;
  }
  if (place && usedType === BEE_NEST && heldId() === "bottle") {
    collectHoney(key(...p));
    return;
  }
  // Without a bottle (and nothing to build with), say what the bees want.
  if (place && usedType === BEE_NEST && ITEMS[heldId()]?.block === undefined) {
    toast(t("needBottle"));
    return;
  }
  if (place && isBed(blocks.get(key(...p)))) {
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
    sound("door");
    rebuildAt(p);
    scheduleSave();
    return;
  }
  // A campfire that went out lights again, unless the rain is on it.
  if (place && usedType === CAMPFIRE_OUT) {
    if (raining() && underSky(...p)) return flashLabel(t("campfireWet"));
    setBlock(p, CAMPFIRE);
    rebuildAt(p);
    toast(t("campfireLit"));
    beepAt(300, 700);
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
    sound("door");
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
    if (
      held?.block === undefined ||
      (blocks.has(k) && !isLiquid(blocks.get(k)))
    )
      return;
    const type = held.block,
      wasWater = blocks.get(k);
    blocks.set(k, type);
    if (collides(blocks, player)) {
      if (wasWater === undefined) blocks.delete(k);
      else blocks.set(k, wasWater);
      return;
    }
    edits.set(k, type);
    wakeWater(p);
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
    const got = creative() ? [] : drops(type, heldId(), roll());
    if (type === CHEST || type === FURNACE) {
      if (!emptyContainer(type, k, got)) return;
    } else if (!inventory.collect(got)) {
      toast(t("full"));
      return;
    }
    burst(p, type);
    if (type === SIGN) {
      delete world.signs[k];
      refreshSigns();
    }
    tutorialEvent("break");
    // Adventure: what you break goes into the backpack.
    if (!creative()) {
      const kind = ITEMS[heldId()]?.tool;
      if (kind && kind !== "bow" && kind !== "rod") wearHeld();
      if (cropInfo(type)?.crop === "wheat" && cropInfo(type).stage === 3)
        emit("harvest:wheat");
      for (const [id] of got) {
        emit("got:" + id);
        if (id === "iron_ore") emit("got:iron");
      }
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
      wakeWater([p[0], y, p[2]]);
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
    startX: e.clientX,
    startY: e.clientY,
    at: performance.now(),
    touch: e.pointerType === "touch",
    moved: false,
    mining: false,
    button: e.button,
  };
  if (
    e.button === 0 &&
    e.pointerType !== "touch" &&
    (targetMonster || (targetAnimal && canHunt(targetAnimal)))
  ) {
    attack();
    return;
  }
  if (e.button === 2) startDraw();
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
      dy = e.clientY - pointerDown.y,
      far = Math.hypot(
        e.clientX - pointerDown.startX,
        e.clientY - pointerDown.startY,
      );
    // A finger that is mining stays on its block and does not turn the
    // view; a real drag stops the mining and looks around again.
    if (pointerDown.mining && far <= 30) return;
    pointerDown.mining = false;
    // A finger wobbles more than a mouse before it really drags.
    if (far > (pointerDown.touch ? 10 : 2)) {
      pointerDown.moved = true;
      mouseBreak = false;
    }
    pointerDown.x = e.clientX;
    pointerDown.y = e.clientY;
    if (pointerDown.touch && !pointerDown.moved) return;
    yaw -= dx * 0.006;
    if (mode === "playing") tutorialEvent("look", Math.abs(dx) * 0.006);
    pitch = Math.max(-0.25, Math.min(1.15, pitch + dy * 0.005));
  }
};
canvas.onpointerup = (e) => {
  if (!pointerDown || e.pointerId !== pointerDown.id) return;
  pointer.set(
    (e.clientX / innerWidth) * 2 - 1,
    (-e.clientY / innerHeight) * 2 + 1,
  );
  // A drawn bow shoots when the button is let go, even after turning to aim.
  if (pointerDown?.button === 2 && pointerDown.moved && drawStart !== null)
    edit(true);
  else if (pointerDown && !pointerDown.moved && !pointerDown.mining) {
    pick();
    const place = pointerDown.button === 2 || e.shiftKey,
      touch = e.pointerType === "touch";
    // Creative breaks on click; Adventure breaks while the button is held.
    if (touch && targetMonster) attack();
    else if (touch && targetAnimal) interactWith(targetAnimal);
    // A tap builds in Build mode. In Mine mode it breaks at once in
    // Creative, and in Adventure it says to keep the finger down.
    else if (touch && settings.touchMode === "build") edit(true);
    else if (touch && creative()) edit(false);
    else if (touch && target) flashLabel(t("holdToMine"));
    else if (!touch && (place || creative())) edit(place);
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
    // Every key belongs to the game while playing (⌘ and Ctrl shortcuts
    // excepted): the page does not scroll and the Mac does not beep.
    if (!e.metaKey && !e.ctrlKey) e.preventDefault();
    keys.add(e.code);
    if (/^[1-9]$/.test(e.key)) {
      selected = +e.key - 1;
      render();
    }
    if (!e.repeat) for (const name of actionsForKey(e.code)) trigger(name);
  }
  if (e.code === "Escape" && !e.repeat) {
    e.preventDefault();
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
// Biel's own movement. It runs inside the ticks, in three steps of 1/60 of
// a second, so walking and jumping are the same at any drawing rate and
// feel as they did at 60 frames a second. The drawing shows him between
// his last two places (see frame()).
const PLAYER_STEPS = 3;
const playerBefore = new THREE.Vector3(),
  playerShown = new THREE.Vector3();
// What the drawing needs to know about the last step.
const motion = { moving: false, speed: 0, heading: 0 };
// A quick tap on Jump between two ticks still counts.
let jumpQueued = false;
function movePlayer(dt) {
  let dx = Number(pressed("right")) - Number(pressed("left")),
    dz = Number(pressed("forward")) - Number(pressed("backward"));
  const len = Math.hypot(dx, dz) || 1,
    speed =
      (pressed("run") ? 6 : 3.8) *
      (riding ? 2 : 1) *
      (inWater(blocks, player.x, player.y + 0.9, player.z) ? 0.6 : 1) *
      (inLava(blocks, player.x, player.y, player.z) ? 0.5 : 1);
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
  // Lava is thick: Biel paddles up through it like water.
  const swimming =
    inWater(blocks, player.x, player.y + 0.9, player.z) ||
    inLava(blocks, player.x, player.y + 0.4, player.z);
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
    velocity = (pressed("jump") ? 6 : 0) - (pressed("down") ? 6 : 0);
  } else if (onLadder) {
    velocity = pressed("jump") || pressed("forward") ? 3 : -1.2;
  } else if (swimming) {
    velocity = pressed("jump")
      ? Math.min(velocity + 30 * dt, 3)
      : Math.max(velocity - 6 * dt, -1.5);
  } else {
    if ((pressed("jump") || jumpQueued) && grounded) {
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
  // Footsteps while walking on the ground (riding and flying are quiet).
  if (grounded && !flying && !riding && (dx || dz)) {
    stepClock -= speed * dt;
    if (stepClock <= 0) {
      stepClock = 2.2;
      footstep();
    }
  }
  if (dx || dz) tutorialEvent("walk", speed * dt);
  motion.moving = !!(dx || dz);
  motion.speed = speed;
  if (motion.moving) motion.heading = Math.atan2(vx, vz);
  // Adventure: a long fall hurts on landing.
  if (!creative()) {
    if (grounded || swimming || flying || onLadder) {
      if (peakY !== null && grounded) {
        const before = vitals.health;
        hurt(vitals, fallDamage(peakY - player.y), rules());
        if (vitals.health < before) hurtFlash();
      }
      peakY = null;
    } else peakY = Math.max(peakY ?? player.y, player.y);
  }
}
const simulatedObjects = () => [
  ...animals.map((a) => a.mesh),
  ...monsters.map((m) => m.mesh),
  ...arrows.map((a) => a.mesh),
  ...bielArrows.map((a) => a.mesh),
];
function simulationTick() {
  const dt = TICK_SECONDS;
  if (mode !== "playing" || !world) return false;
  const started = performance.now();
  entityInterpolation.begin(simulatedObjects());
  playerBefore.copy(player);
  for (let i = 0; i < PLAYER_STEPS; i++) movePlayer(dt / PLAYER_STEPS);
  jumpQueued = false;
  if (mode !== "playing") return false;
  if (world.options.cycle === "normal") {
    timeOfDay += dt / DAY_LENGTHS[world.options.dayLength];
    if (timeOfDay >= 1) {
      timeOfDay -= 1;
      world.day++;
      if (!creative()) emit("night");
    }
  }
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
  // A quiet save every minute keeps where Biel is, the time and the animals.
  autosaveClock -= dt;
  if (autosaveClock <= 0) {
    autosaveClock = 60;
    save();
  }
  // Break reminder set by the parents.
  playSeconds += dt;
  if (reminderDue(playSeconds, settings.parents.reminder)) {
    save();
    mode = "rest";
    render();
    return false;
  }
  tickWeather(dt);
  updateAnimals(dt);
  breedAnimals(dt);
  updateFurnaces(dt);
  updateMonsters(dt);
  updateBielArrows(dt);
  growCrops(dt);
  updateFishing();
  updateWater(dt);
  touchLava(dt);
  if (!creative()) {
    const underwater = inWater(blocks, player.x, player.y + 1.6, player.z),
      moving =
        pressed("left") ||
        pressed("right") ||
        pressed("forward") ||
        pressed("backward"),
      running = pressed("run");
    const before = vitals.health;
    tick(vitals, dt, {
      rules: rules(),
      hunger: world.options.hunger,
      exertion: moving ? (running ? 1 : 0.3) : 0,
      underwater,
    });
    if (vitals.health < before) hurtFlash();
    for (const m of [...backpackGroup.children]) {
      const pack = m.userData.pack;
      if (m.position.distanceTo(player) < 1.4 && !(pack.wait > world.age)) {
        // Whatever does not fit stays in the backpack on the ground.
        pack.items = pack.items.flatMap((slot) => {
          if (!slot) return [];
          const left = inventory.add(...slot);
          return left ? [[slot[0], left, slot[2]]] : [];
        });
        if (pack.items.length) {
          pack.wait = world.age + 5;
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
  entityInterpolation.end(simulatedObjects());
  tickMilliseconds = performance.now() - started;
  return mode === "playing";
}
function frame(now) {
  const frameSeconds = Math.max(0, (now - last) / 1000);
  const dt = Math.min(frameSeconds, 0.04);
  last = now;
  if (mode !== "playing") {
    simulationClock.reset();
    simulationRunning = false;
    entityInterpolation.draw(simulatedObjects(), 1);
  }
  elapsed += dt;
  pollGamepad(dt);
  // How far the bow is drawn, shown above the hotbar.
  if (
    drawStart !== null &&
    (mode !== "playing" || !(holdingBow() || holdingShield()))
  )
    drawStart = null;
  document.documentElement.classList.toggle(
    "drawing",
    drawStart !== null && holdingBow(),
  );
  document.documentElement.classList.toggle(
    "guarding",
    drawStart !== null && holdingShield(),
  );
  if (drawStart !== null && holdingBow())
    document.documentElement.style.setProperty(
      "--draw",
      bowShot((now - drawStart) / 1000).power,
    );
  // Mine mode on a touch screen: a finger resting on a block breaks it.
  if (
    pointerDown?.touch &&
    settings.touchMode === "mine" &&
    target &&
    !pointerDown.moved &&
    performance.now() - pointerDown.at > 200
  )
    pointerDown.mining = true;
  if (mode === "playing") scenery = "game";
  if (mode === "menu" || mode === "splash") scenery = "menu";
  if (mode === "playing") {
    biel.scale.setScalar(1);
    if (pressed("jump")) jumpQueued = true;
    animalChatter(dt);
    // The frame that resumes the game shows Biel where he is.
    if (!simulationRunning) playerBefore.copy(player);
    const alpha = simulationClock.advance(
      simulationRunning ? frameSeconds : 0,
      simulationTick,
    );
    simulationRunning = mode === "playing";
    entityInterpolation.draw(simulatedObjects(), alpha);
    // Biel is drawn between his last two places, unless he was just
    // carried somewhere else (home, a bed, another world).
    if (playerBefore.distanceTo(player) > 3) playerShown.copy(player);
    else playerShown.lerpVectors(playerBefore, player, alpha);
    poseCreatures();
    updateMinimap(dt);
    // Adventure: falls, hunger, air and health.
    if (!creative()) {
      const underwater = inWater(blocks, player.x, player.y + 1.6, player.z);
      updateVitalsHud(underwater);
      if (vitals.health <= 0) fallAsleep();
    }
    biel.position.copy(playerShown);
    if (riding) biel.position.y += 0.75;
    biel.visible = !firstPerson;
    if (motion.moving) biel.rotation.y = motion.heading;
    const stride = motion.moving
      ? Math.sin(elapsed * (motion.speed > 4 ? 14 : 10)) * 0.65
      : Math.sin(elapsed * 2) * 0.035;
    leftLeg.rotation.x = stride;
    rightLeg.rotation.x = -stride;
    leftArm.rotation.x = -stride;
    rightArm.rotation.x = attackCooldown > 0.25 ? -1.6 : stride;
    rightArm.rotation.z = 0;
    head.rotation.z = Math.sin(elapsed * 2) * 0.025;
    look.copy(playerShown).add(new THREE.Vector3(0, 1.5, 0));
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
    // Both arms hang the same way and sway a little, one after the other.
    leftArm.rotation.x = Math.sin(elapsed * 2) * 0.12;
    rightArm.rotation.x = -Math.sin(elapsed * 2) * 0.12;
    rightArm.rotation.z = 0;
    leftLeg.rotation.x = rightLeg.rotation.x = 0;
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
  paintAll(0.5 + 0.5 * skyNow.daylight);
  updateBirds(dt, skyNow.daylight);
  updateBees(dt, skyNow.daylight);
  updateFish(dt);
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
      if (particlePool.length < 200) particlePool.push(p.m);
    }
  }
  for (const bag of backpackGroup.children) bag.rotation.y += dt;
  if (fishing)
    bobber.position.y = WATER_LEVEL + 0.05 + Math.sin(elapsed * 4) * 0.03;
  renderer.render(scene, camera);
  updateStats(frameSeconds);
}
// The saved world loads once every part of the scene exists.
if (world) loadWorld(world);
setTimeout(() => cloud.sync(), 1500);
render();
// Performance numbers, shown with F3 or a triple tap with two fingers.
const statsEl = document.createElement("div");
statsEl.id = "stats";
document.body.append(statsEl);
let statsOn = false,
  statsFrames = 0,
  statsClock = 0,
  statsWork = 0,
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
  const shown = [...chunks.values()].filter((c) => c.meshes[0]?.visible).length,
    [bx, by, bz] = [player.x, player.y + 1, player.z].map(Math.round),
    place = world
      ? ` · ${bx}, ${by}, ${bz} · ${biomeAt(bx, bz)} · light ${light?.inside(bx, by, bz) ? light.level(bx, by, bz, paintedDay < 0 ? 1 : paintedDay) : "-"}`
      : "";
  statsEl.textContent = `${Math.round(statsFrames / statsClock)} fps · ${renderer.info.render.calls} draws · ${Math.round(renderer.info.render.triangles / 1000)}k tris · ${shown}/${chunks.size} chunks · ${blocks.size} blocks · ${animals.length} animals · ${monsters.length} monsters · ${settings.quality}${lowPower ? " · low power" : ""} · ${(statsWork / statsFrames).toFixed(1)} ms · tick ${tickMilliseconds.toFixed(2)} ms (20 Hz) · ${storage.kind}${place}`;
  statsWork = 0;
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
    const before = performance.now();
    frame(now);
    statsWork += performance.now() - before;
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
// The in-game checks live in dev/smoke-tests.js; they see the game through these.
installSmokeTests({
  get storage() {
    return storage;
  },
  get simulationTick() {
    return simulationTick;
  },
  get $() {
    return $;
  },
  get hurtPlayer() {
    return hurtPlayer;
  },
  get emit() {
    return emit;
  },
  set autosaveClock(v) {
    autosaveClock = v;
  },
  get drawStart() {
    return drawStart;
  },
  set drawStart(v) {
    drawStart = v;
  },
  get snapThumb() {
    return snapThumb;
  },
  get action() {
    return action;
  },
  get addMonster() {
    return addMonster;
  },
  get amber() {
    return amber;
  },
  get animalGroup() {
    return animalGroup;
  },
  get animals() {
    return animals;
  },
  get app() {
    return app;
  },
  get applyParentLimits() {
    return applyParentLimits;
  },
  get applySky() {
    return applySky;
  },
  get arrows() {
    return arrows;
  },
  get attack() {
    return attack;
  },
  get attackCooldown() {
    return attackCooldown;
  },
  set attackCooldown(v) {
    attackCooldown = v;
  },
  get blocks() {
    return blocks;
  },
  get breedClock() {
    return breedClock;
  },
  set breedClock(v) {
    breedClock = v;
  },
  get camera() {
    return camera;
  },
  get chestAt() {
    return chestAt;
  },
  get CHUNK() {
    return CHUNK;
  },
  get chunkKey() {
    return chunkKey;
  },
  get chunks() {
    return chunks;
  },
  get cloud() {
    return cloud;
  },
  get cloudBridge() {
    return cloudBridge;
  },
  get benchGrid() {
    return benchGrid;
  },
  get container() {
    return container;
  },
  set container(v) {
    container = v;
  },
  get darkLevel() {
    return darkLevel;
  },
  get dismount() {
    return dismount;
  },
  get draft() {
    return draft;
  },
  get edit() {
    return edit;
  },
  get edits() {
    return edits;
  },
  get firstPerson() {
    return firstPerson;
  },
  set firstPerson(v) {
    firstPerson = v;
  },
  get fishing() {
    return fishing;
  },
  set fishing(v) {
    fishing = v;
  },
  get flying() {
    return flying;
  },
  set flying(v) {
    flying = v;
  },
  get frame() {
    return frame;
  },
  get gate() {
    return gate;
  },
  get grounded() {
    return grounded;
  },
  get growCrops() {
    return growCrops;
  },
  get heldId() {
    return heldId;
  },
  get interactWith() {
    return interactWith;
  },
  get inventory() {
    return inventory;
  },
  set inventory(v) {
    inventory = v;
  },
  get isRendered() {
    return isRendered;
  },
  get keys() {
    return keys;
  },
  get last() {
    return last;
  },
  get leaveSplash() {
    return leaveSplash;
  },
  get light() {
    return light;
  },
  get lightBlocks() {
    return lightBlocks;
  },
  get loadWorld() {
    return loadWorld;
  },
  get minimapClock() {
    return minimapClock;
  },
  set minimapClock(v) {
    minimapClock = v;
  },
  get mode() {
    return mode;
  },
  set mode(v) {
    mode = v;
  },
  get monsters() {
    return monsters;
  },
  get monstersAllowed() {
    return monstersAllowed;
  },
  get moveStack() {
    return moveStack;
  },
  get music() {
    return music;
  },
  get nearBench() {
    return nearBench;
  },
  get nestBlocks() {
    return nestBlocks;
  },
  get pick() {
    return pick;
  },
  get pitch() {
    return pitch;
  },
  set pitch(v) {
    pitch = v;
  },
  get placed() {
    return placed;
  },
  get player() {
    return player;
  },
  get playSeconds() {
    return playSeconds;
  },
  set playSeconds(v) {
    playSeconds = v;
  },
  get pointerKind() {
    return pointerKind;
  },
  set pointerKind(v) {
    pointerKind = v;
  },
  get pressed() {
    return pressed;
  },
  get progress() {
    return progress;
  },
  get rain() {
    return rain;
  },
  get raining() {
    return raining;
  },
  get rainLevel() {
    return rainLevel;
  },
  set rainLevel(v) {
    rainLevel = v;
  },
  get rebuild() {
    return rebuild;
  },
  get rebuildAt() {
    return rebuildAt;
  },
  get removeMonster() {
    return removeMonster;
  },
  get render() {
    return render;
  },
  get renderer() {
    return renderer;
  },
  get riding() {
    return riding;
  },
  get rules() {
    return rules;
  },
  get save() {
    return save;
  },
  get saveData() {
    return saveData;
  },
  get scene() {
    return scene;
  },
  get selected() {
    return selected;
  },
  set selected(v) {
    selected = v;
  },
  get setBlock() {
    return setBlock;
  },
  get settings() {
    return settings;
  },
  get signGroup() {
    return signGroup;
  },
  get sleepIn() {
    return sleepIn;
  },
  get spawn() {
    return spawn;
  },
  get statsClock() {
    return statsClock;
  },
  set statsClock(v) {
    statsClock = v;
  },
  get statsEl() {
    return statsEl;
  },
  get store() {
    return store;
  },
  get surfaceY() {
    return surfaceY;
  },
  get swarm() {
    return swarm;
  },
  get t() {
    return t;
  },
  get target() {
    return target;
  },
  set target(v) {
    target = v;
  },
  get targetAnimal() {
    return targetAnimal;
  },
  set targetAnimal(v) {
    targetAnimal = v;
  },
  get targetMonster() {
    return targetMonster;
  },
  set targetMonster(v) {
    targetMonster = v;
  },
  get targetWater() {
    return targetWater;
  },
  get targetLava() {
    return targetLava;
  },
  set targetLava(v) {
    targetLava = v;
  },
  get touchLava() {
    return touchLava;
  },
  get rainOnCampfires() {
    return rainOnCampfires;
  },
  set targetWater(v) {
    targetWater = v;
  },
  get timeOfDay() {
    return timeOfDay;
  },
  set timeOfDay(v) {
    timeOfDay = v;
  },
  get toast() {
    return toast;
  },
  get toastEl() {
    return toastEl;
  },
  get togglePerspective() {
    return togglePerspective;
  },
  get toggleStats() {
    return toggleStats;
  },
  get topAt() {
    return topAt;
  },
  get touchInput() {
    return touchInput;
  },
  get trySpawnMonster() {
    return trySpawnMonster;
  },
  get tutorialEvent() {
    return tutorialEvent;
  },
  get underground() {
    return underground;
  },
  get updateBreaking() {
    return updateBreaking;
  },
  get updateFishing() {
    return updateFishing;
  },
  get updateFurnaces() {
    return updateFurnaces;
  },
  get updateWater() {
    return updateWater;
  },
  get velocity() {
    return velocity;
  },
  set velocity(v) {
    velocity = v;
  },
  get vitals() {
    return vitals;
  },
  get waterDirty() {
    return waterDirty;
  },
  get wearHeld() {
    return wearHeld;
  },
  get world() {
    return world;
  },
  get yaw() {
    return yaw;
  },
  set yaw(v) {
    yaw = v;
  },
});
