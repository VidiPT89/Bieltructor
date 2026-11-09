// Small HTML pieces for the screens. They only use what they are given.

export const escapeHtml = (text) =>
  String(text).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

// One <select> for a world option. Booleans are stored as "true"/"false".
export function field(id, label, value, choices) {
  return `<label>${label}<select id="opt-${id}" data-option="${id}">${choices
    .map(
      ([v, l]) =>
        `<option value="${v}" ${String(value) === String(v) ? "selected" : ""}>${l}</option>`,
    )
    .join("")}</select></label>`;
}
// The same, for the parents' corner.
export function parentField(id, label, value, choices) {
  return field(id, label, value, choices).replace(
    'data-option="',
    'data-parent="',
  );
}

// How much of a tool is left, as a small bar under its slot.
export const wearBar = (wear, uses) =>
  wear && uses
    ? `<i class="wear" style="--left:${Math.round(100 - (100 * wear) / uses)}%"></i>`
    : "";

export const credits = () =>
  `<div class="credits">Developed by <strong>David Arsénio Martins</strong><div><a href="https://ividi.dev/" target="_blank" rel="noopener">ividi.dev ↗︎</a><span>·</span><a href="https://github.com/VidiPT89/" target="_blank" rel="noopener">GitHub ↗︎</a></div></div>`;
export const logo = `<img class="brand-icon" src="logo.webp" alt=""><span>BIEL<span class="brand-accent">TRUCTOR</span></span>`;
