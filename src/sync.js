// iCloud sync of worlds: decides what to do with each world, never
// overwriting a world changed on two devices without asking.
//
// A deleted world leaves a small marker in iCloud ({ id, deleted: true,
// updatedAt }) so other devices remove it too instead of sending it back,
// and this device remembers its own deletions until the marker is written.

// local: { id, updatedAt } or undefined.
// remote: { id, updatedAt, deleted? } or undefined.
// synced: the updatedAt both sides had after the last sync of this world.
// deletedHere: true when this device deleted the world and iCloud may not
// know yet.
export function decide(local, remote, synced, deletedHere = false) {
  if (remote?.deleted) {
    if (!local) return deletedHere ? "forget" : "none";
    // Played here since the last sync: keep it, it goes back up.
    return local.updatedAt !== synced ? "upload" : "removeLocal";
  }
  if (deletedHere && !local) {
    if (!remote) return "forget";
    // Changed on another device after this one last saw it: it stays.
    return remote.updatedAt === synced ? "bury" : "download";
  }
  if (!local && !remote) return "none";
  if (!remote) return "upload";
  if (!local) return "download";
  if (local.updatedAt === remote.updatedAt) return "none";
  const localChanged = local.updatedAt !== synced,
    remoteChanged = remote.updatedAt !== synced;
  if (localChanged && remoteChanged) return "conflict";
  return localChanged ? "upload" : "download";
}

// A whole plan for every world on either side.
export function plan(locals, remotes, syncedById = {}, deletedById = {}) {
  const ids = new Set([
    ...locals.map((w) => w.id),
    ...remotes.map((w) => w.id),
    ...Object.keys(deletedById),
  ]);
  return [...ids].map((id) => {
    const local = locals.find((w) => w.id === id),
      remote = remotes.find((w) => w.id === id);
    return {
      id,
      local,
      remote,
      action: decide(local, remote, syncedById[id], !!deletedById[id]),
    };
  });
}

// The marker a deleted world leaves in iCloud.
export const tombstone = (id, now = Date.now()) => ({
  id,
  deleted: true,
  updatedAt: now,
});

// A short name for this kind of device, shown when there is a conflict.
export function deviceKind(platform = "", touch = false, width = 1024) {
  if (/iPhone/.test(platform) || (touch && width < 700)) return "iPhone";
  if (/iPad/.test(platform) || touch) return "iPad";
  return "Mac";
}
