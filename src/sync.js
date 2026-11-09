// iCloud sync of worlds: decides what to do with each world, never
// overwriting a world changed on two devices without asking.

// local / remote: { id, updatedAt, device } or undefined.
// synced: the updatedAt both sides had after the last sync of this world.
export function decide(local, remote, synced) {
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
export function plan(locals, remotes, syncedById = {}) {
  const ids = new Set([
    ...locals.map((w) => w.id),
    ...remotes.map((w) => w.id),
  ]);
  return [...ids].map((id) => {
    const local = locals.find((w) => w.id === id),
      remote = remotes.find((w) => w.id === id);
    return { id, local, remote, action: decide(local, remote, syncedById[id]) };
  });
}

// A short name for this kind of device, shown when there is a conflict.
export function deviceKind(platform = "", touch = false, width = 1024) {
  if (/iPhone/.test(platform) || (touch && width < 700)) return "iPhone";
  if (/iPad/.test(platform) || touch) return "iPad";
  return "Mac";
}
