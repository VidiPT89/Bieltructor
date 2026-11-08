// Voxel models for the animals, built from simple boxes.
import * as THREE from "three";

const cache = new Map();
const material = (color) => {
  if (!cache.has(color))
    cache.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.9 }));
  return cache.get(color);
};
function box(parent, [w, h, d], [x, y, z], color) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}
// A leg that swings from the hip.
function leg(group, [w, h, d], [x, y, z], color, foot) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, z);
  box(pivot, [w, h, d], [0, -h / 2, 0], color);
  if (foot) box(pivot, [w + 0.02, 0.06, d + 0.06], [0, -h + 0.03, 0.02], foot);
  group.add(pivot);
  group.userData.legs.push(pivot);
}
function eyes(head, y, z, spread, size = 0.06) {
  for (const x of [-spread, spread])
    box(head, [size, size, 0.02], [x, y, z], 0x221a14);
}

function chicken() {
  const g = new THREE.Group();
  g.userData.legs = [];
  box(g, [0.38, 0.32, 0.48], [0, 0.42, 0], 0xf7f3ea);
  for (const x of [-0.21, 0.21])
    box(g, [0.05, 0.22, 0.34], [x, 0.44, -0.02], 0xe8e1d2);
  const head = new THREE.Group();
  head.position.set(0, 0.7, 0.2);
  g.add(head);
  box(head, [0.24, 0.26, 0.22], [0, 0, 0], 0xf7f3ea);
  box(head, [0.1, 0.07, 0.1], [0, -0.02, 0.15], 0xf2a33a);
  box(head, [0.06, 0.1, 0.12], [0, 0.17, 0.02], 0xe0483e);
  eyes(head, 0.04, 0.115, 0.07, 0.045);
  g.userData.head = head;
  for (const x of [-0.09, 0.09])
    leg(g, [0.05, 0.26, 0.05], [x, 0.26, 0], 0xf2a33a, 0xf2a33a);
  return g;
}

function cow() {
  const g = new THREE.Group();
  g.userData.legs = [];
  box(g, [0.86, 0.6, 1.25], [0, 0.85, 0], 0xf0e6d4);
  // Brown patches on both sides and on the back.
  box(g, [0.02, 0.3, 0.4], [0.44, 0.9, 0.2], 0x7a5236);
  box(g, [0.02, 0.28, 0.35], [-0.44, 0.8, -0.25], 0x7a5236);
  box(g, [0.4, 0.02, 0.3], [0.1, 1.16, -0.3], 0x7a5236);
  const head = new THREE.Group();
  head.position.set(0, 1.02, 0.72);
  g.add(head);
  box(head, [0.5, 0.44, 0.4], [0, 0, 0], 0xf0e6d4);
  box(head, [0.34, 0.18, 0.08], [0, -0.12, 0.22], 0xe9a6a0);
  for (const x of [-0.22, 0.22])
    box(head, [0.08, 0.1, 0.08], [x, 0.26, 0], 0xe8dcc0);
  eyes(head, 0.06, 0.205, 0.13);
  g.userData.head = head;
  for (const [x, z] of [
    [-0.28, 0.45],
    [0.28, 0.45],
    [-0.28, -0.45],
    [0.28, -0.45],
  ])
    leg(g, [0.2, 0.55, 0.2], [x, 0.55, z], 0xf0e6d4, 0x4a3a2c);
  return g;
}

function sheep() {
  const g = new THREE.Group();
  g.userData.legs = [];
  g.userData.wool = box(g, [0.86, 0.66, 1.02], [0, 0.78, 0], 0xf6f2ea);
  box(g, [0.6, 0.45, 0.82], [0, 0.78, 0], 0xd9cfc0);
  const head = new THREE.Group();
  head.position.set(0, 0.95, 0.58);
  g.add(head);
  box(head, [0.34, 0.34, 0.34], [0, 0, 0], 0x4a4039);
  box(head, [0.42, 0.14, 0.3], [0, 0.18, -0.04], 0xf6f2ea);
  eyes(head, 0.03, 0.175, 0.09);
  g.userData.head = head;
  for (const [x, z] of [
    [-0.25, 0.32],
    [0.25, 0.32],
    [-0.25, -0.32],
    [0.25, -0.32],
  ])
    leg(g, [0.16, 0.48, 0.16], [x, 0.48, z], 0x4a4039);
  return g;
}

function dog() {
  const g = new THREE.Group();
  g.userData.legs = [];
  const body = new THREE.Group();
  body.userData.legs = [];
  g.add(body);
  g.userData.body = body;
  box(body, [0.38, 0.36, 0.74], [0, 0.52, 0], 0xc98b4b);
  const head = new THREE.Group();
  head.position.set(0, 0.78, 0.42);
  body.add(head);
  box(head, [0.36, 0.34, 0.34], [0, 0, 0], 0xc98b4b);
  box(head, [0.2, 0.14, 0.16], [0, -0.07, 0.24], 0xe6c08f);
  box(head, [0.08, 0.06, 0.04], [0, -0.02, 0.33], 0x2a1f18);
  for (const x of [-0.17, 0.17])
    box(head, [0.08, 0.18, 0.12], [x, 0.12, -0.04], 0x8a5a33);
  eyes(head, 0.06, 0.175, 0.09);
  g.userData.head = head;
  g.userData.collar = box(body, [0.4, 0.07, 0.12], [0, 0.66, 0.32], 0xed852b);
  g.userData.collar.visible = false;
  const tail = box(body, [0.08, 0.08, 0.3], [0, 0.66, -0.46], 0xc98b4b);
  tail.rotation.x = 0.6;
  g.userData.tail = tail;
  for (const [x, z] of [
    [-0.12, 0.25],
    [0.12, 0.25],
    [-0.12, -0.25],
    [0.12, -0.25],
  ])
    leg(body, [0.12, 0.34, 0.12], [x, 0.34, z], 0xb67a3e);
  g.userData.legs = body.userData.legs;
  return g;
}

export const MODELS = { chicken, cow, sheep, dog };

// A floating name tag drawn on a canvas.
export function nameTag(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#172324cc";
  ctx.beginPath();
  ctx.roundRect(8, 8, 240, 48, 24);
  ctx.fill();
  ctx.fillStyle = "#fff4dc";
  ctx.font = "bold 28px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 128, 33);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(canvas),
      depthWrite: false,
    }),
  );
  sprite.scale.set(1.4, 0.35, 1);
  return sprite;
}
