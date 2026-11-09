// Keeping worlds: the browser storage, the snapshot of the world being
// played, and iCloud sync in the native apps (each world is a file in
// iCloud Drive; see shared/CloudBridge.swift).
import { validateWorld, MAX_WORLDS } from "./worlds.js";
import { plan as syncPlan } from "./sync.js";

// localStorage that never throws when reading (private windows, full disk).
// Writing still throws, so a failed save can be reported.
export const safeStorage = {
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

// Writes the live game into the world object, ready to store or export.
export function snapshotWorld(
  world,
  {
    edits,
    player,
    view,
    health,
    food,
    time,
    inventory,
    device,
    animals,
    monsters,
  },
) {
  world.edits = [...edits].map(([k, v]) => [...k.split(",").map(Number), v]);
  world.player = {
    x: player.x,
    y: player.y,
    z: player.z,
    ...view,
    health: Math.max(1, health),
    food,
  };
  world.time = time;
  world.inventory = inventory.toJSON();
  world.device = device;
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

// iCloud sync. `hooks` connect it to the game:
//   enabled()     whether the player switched iCloud on
//   busy()        true while playing (the live world is never replaced)
//   currentId()   the id of the open world, if any
//   load(world)   opens a world that came down from iCloud
//   lang()        "pt" or "en", for the time of the last sync
//   onMissing()   iCloud is not available
//   onSynced()    a sync finished (cloud.conflicts may need an answer)
//   onResolved()  the player answered a conflict
export function createCloud({ bridge, storage, store, hooks }) {
  let seq = 0,
    timer = null,
    inFlight = null,
    resolving = false;
  const waiting = new Map();
  const marks = () => {
    try {
      const value = JSON.parse(storage.getItem("biel-synced") || "{}");
      return value && typeof value === "object" && !Array.isArray(value)
        ? value
        : {};
    } catch {
      return {};
    }
  };
  const markSynced = (id, updatedAt) => {
    const all = marks();
    all[id] = updatedAt;
    try {
      storage.setItem("biel-synced", JSON.stringify(all));
    } catch {}
  };
  const cloud = {
    // "" before the first sync, "missing" without iCloud, else the time.
    status: "",
    conflicts: [],
    // The native app answers through window.cloudReply.
    reply(req, value) {
      waiting.get(req)?.(value);
      waiting.delete(req);
    },
    // Asks the native app; resolves with null if there is no answer.
    call(action, extra = {}) {
      return new Promise((resolve) => {
        if (!bridge) return resolve(null);
        const req = ++seq;
        const timeout = setTimeout(() => {
          waiting.delete(req);
          resolve(null);
        }, 8000);
        waiting.set(req, (value) => {
          clearTimeout(timeout);
          resolve(value);
        });
        try {
          bridge.postMessage({ req, action, ...extra });
        } catch {
          cloud.reply(req, null);
        }
      });
    },
    // After a save: automatic uploads use the same conflict checks as a sync.
    schedule() {
      if (!hooks.enabled() || !bridge || !hooks.currentId()) return;
      clearTimeout(timer);
      timer = setTimeout(() => cloud.sync(), 4000);
    },
    sync() {
      if (!hooks.enabled() || resolving) return Promise.resolve();
      if (inFlight) return inFlight;
      inFlight = run()
        .catch(() => {
          cloud.status = "missing";
        })
        .finally(() => {
          inFlight = null;
        });
      return inFlight;
    },
    // The player chooses which version to keep; nothing is lost silently.
    async resolve(keepHere) {
      if (resolving || inFlight || hooks.busy() || !hooks.enabled()) return;
      const c = cloud.conflicts[0];
      if (!c) return;
      resolving = true;
      try {
        if (keepHere) {
          const res = await cloud.call("save", {
            worldId: c.id,
            json: JSON.stringify(c.local),
          });
          if (!res?.ok) throw new Error("Cloud save failed");
          markSynced(c.id, c.local.updatedAt);
        } else {
          store.save(c.remote);
          markSynced(c.id, c.remote.updatedAt);
          if (hooks.currentId() === c.id) hooks.load(c.remote);
        }
        cloud.conflicts.shift();
        hooks.onResolved();
      } catch {
        cloud.status = "missing";
        hooks.onMissing();
      } finally {
        resolving = false;
      }
    },
  };
  async function run() {
    if (!hooks.enabled()) return;
    const status = await cloud.call("status");
    if (!status?.available) {
      cloud.status = "missing";
      hooks.onMissing();
      return;
    }
    // Never read a failed or incomplete listing as an empty cloud.
    const listing = await cloud.call("list");
    if (!hooks.enabled()) return;
    if (!Array.isArray(listing)) {
      cloud.status = "missing";
      hooks.onMissing();
      return;
    }
    // Keep the live game untouched; pausing saves and schedules another try.
    if (hooks.busy()) return;
    const remotes = listing.map((text) => {
      try {
        const raw = JSON.parse(text);
        if (
          !raw ||
          typeof raw.id !== "string" ||
          !/^[a-zA-Z0-9_-]{1,40}$/.test(raw.id)
        )
          return null;
        const w = validateWorld(raw, { id: raw.id });
        return w && { ...w, device: raw.device ?? "" };
      } catch {
        return null;
      }
    });
    // A corrupt remote is not an absent world: never overwrite it blindly.
    if (
      remotes.some((w) => !w) ||
      new Set(remotes.map((w) => w.id)).size !== remotes.length
    ) {
      cloud.status = "missing";
      hooks.onMissing();
      return;
    }
    const locals = store
      .list()
      .map((w) => store.load(w.id))
      .filter(Boolean);
    cloud.conflicts = [];
    for (const step of syncPlan(locals, remotes, marks())) {
      if (!hooks.enabled() || hooks.busy()) return;
      if (step.action === "upload") {
        const res = await cloud.call("save", {
          worldId: step.id,
          json: JSON.stringify(step.local),
        });
        if (!res?.ok) {
          cloud.status = "missing";
          hooks.onMissing();
          return;
        }
        markSynced(step.id, step.local.updatedAt);
      } else if (step.action === "download") {
        if (store.list().length >= MAX_WORLDS && !step.local) continue;
        store.save(step.remote);
        markSynced(step.id, step.remote.updatedAt);
        if (hooks.currentId() === step.id && !hooks.busy())
          hooks.load(step.remote);
      } else if (step.action === "conflict") cloud.conflicts.push(step);
    }
    cloud.status = new Date().toLocaleTimeString(
      hooks.lang() === "pt" ? "pt-PT" : "en-GB",
      { timeStyle: "short" },
    );
    hooks.onSynced();
  }
  return cloud;
}
