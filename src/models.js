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

function pig() {
  const g = new THREE.Group();
  g.userData.legs = [];
  box(g, [0.62, 0.5, 0.9], [0, 0.55, 0], 0xf2a7b0);
  const head = new THREE.Group();
  head.position.set(0, 0.66, 0.52);
  g.add(head);
  box(head, [0.46, 0.42, 0.34], [0, 0, 0], 0xf2a7b0);
  box(head, [0.22, 0.16, 0.08], [0, -0.06, 0.2], 0xe58893);
  for (const x of [-0.05, 0.05])
    box(head, [0.04, 0.05, 0.02], [x, -0.06, 0.25], 0x8c4a52);
  for (const x of [-0.17, 0.17])
    box(head, [0.12, 0.1, 0.06], [x, 0.22, 0.04], 0xe58893);
  eyes(head, 0.08, 0.175, 0.12);
  g.userData.head = head;
  for (const [x, z] of [
    [-0.18, 0.28],
    [0.18, 0.28],
    [-0.18, -0.28],
    [0.18, -0.28],
  ])
    leg(g, [0.16, 0.3, 0.16], [x, 0.3, z], 0xe58893);
  return g;
}

function rabbit() {
  const g = new THREE.Group();
  g.userData.legs = [];
  box(g, [0.3, 0.28, 0.42], [0, 0.26, 0], 0xd9c3a5);
  box(g, [0.12, 0.12, 0.1], [0, 0.32, -0.24], 0xf6f2ea);
  const head = new THREE.Group();
  head.position.set(0, 0.46, 0.2);
  g.add(head);
  box(head, [0.24, 0.22, 0.22], [0, 0, 0], 0xd9c3a5);
  for (const x of [-0.06, 0.06])
    box(head, [0.06, 0.24, 0.04], [x, 0.22, -0.03], 0xd9c3a5);
  box(head, [0.06, 0.04, 0.02], [0, -0.04, 0.115], 0xe58893);
  eyes(head, 0.03, 0.115, 0.07, 0.045);
  g.userData.head = head;
  for (const [x, z] of [
    [-0.09, 0.12],
    [0.09, 0.12],
    [-0.09, -0.12],
    [0.09, -0.12],
  ])
    leg(g, [0.08, 0.14, 0.12], [x, 0.14, z], 0xc9b08f);
  return g;
}

function cat() {
  const g = new THREE.Group();
  g.userData.legs = [];
  const body = new THREE.Group();
  body.userData.legs = [];
  g.add(body);
  g.userData.body = body;
  box(body, [0.3, 0.28, 0.62], [0, 0.38, 0], 0xe39a4e);
  for (const z of [-0.15, 0.05])
    box(body, [0.31, 0.29, 0.06], [0, 0.38, z], 0xc77a34);
  const head = new THREE.Group();
  head.position.set(0, 0.56, 0.34);
  body.add(head);
  box(head, [0.3, 0.26, 0.24], [0, 0, 0], 0xe39a4e);
  for (const x of [-0.1, 0.1])
    box(head, [0.08, 0.1, 0.06], [x, 0.17, 0], 0xe39a4e);
  box(head, [0.05, 0.04, 0.02], [0, -0.03, 0.125], 0xe58893);
  eyes(head, 0.04, 0.125, 0.075, 0.05);
  g.userData.head = head;
  g.userData.collar = box(body, [0.32, 0.06, 0.1], [0, 0.5, 0.24], 0x4fa3d8);
  g.userData.collar.visible = false;
  const tail = box(body, [0.06, 0.06, 0.36], [0, 0.55, -0.42], 0xe39a4e);
  tail.rotation.x = 0.9;
  g.userData.tail = tail;
  for (const [x, z] of [
    [-0.09, 0.2],
    [0.09, 0.2],
    [-0.09, -0.2],
    [0.09, -0.2],
  ])
    leg(body, [0.08, 0.24, 0.08], [x, 0.24, z], 0xd98a3f);
  g.userData.legs = body.userData.legs;
  return g;
}

function horse() {
  const g = new THREE.Group();
  g.userData.legs = [];
  box(g, [0.56, 0.6, 1.3], [0, 1.0, 0], 0x8b5a34);
  const head = new THREE.Group();
  head.position.set(0, 1.42, 0.68);
  head.rotation.x = -0.35;
  g.add(head);
  box(head, [0.3, 0.6, 0.32], [0, 0, 0], 0x8b5a34);
  box(head, [0.28, 0.24, 0.42], [0, 0.18, 0.2], 0x8b5a34);
  box(head, [0.08, 0.5, 0.2], [0, 0.05, -0.2], 0x3d2a1c);
  for (const x of [-0.08, 0.08])
    box(head, [0.06, 0.12, 0.04], [x, 0.36, 0.06], 0x6f4628);
  eyes(head, 0.24, 0.415, 0.08);
  g.userData.head = head;
  box(g, [0.1, 0.5, 0.1], [0, 1.02, -0.68], 0x3d2a1c);
  // A saddle shows that the horse is Biel's friend.
  g.userData.collar = box(g, [0.6, 0.12, 0.5], [0, 1.34, 0.05], 0xc8473c);
  g.userData.collar.visible = false;
  for (const [x, z] of [
    [-0.18, 0.48],
    [0.18, 0.48],
    [-0.18, -0.48],
    [0.18, -0.48],
  ])
    leg(g, [0.16, 0.72, 0.16], [x, 0.72, z], 0x7a4d2c, 0x2b2016);
  return g;
}

export function bird() {
  const g = new THREE.Group();
  box(g, [0.18, 0.14, 0.3], [0, 0, 0], 0x5d7fa8);
  box(g, [0.08, 0.06, 0.08], [0, 0, 0.18], 0xf2a33a);
  g.userData.wings = [-1, 1].map((side) => {
    const w = box(g, [0.3, 0.03, 0.16], [side * 0.22, 0.03, 0], 0x4b6b93);
    w.userData.side = side;
    return w;
  });
  return g;
}

// Monsters: silly rather than scary.
function sleepy() {
  const g = new THREE.Group();
  g.userData.legs = [];
  box(g, [0.56, 0.7, 0.36], [0, 1.0, 0], 0x7fbf86);
  for (const y of [0.8, 1.05, 1.3])
    box(g, [0.58, 0.04, 0.38], [0, y, 0], 0x5f9f69);
  const head = new THREE.Group();
  head.position.set(0, 1.6, 0);
  g.add(head);
  box(head, [0.5, 0.48, 0.46], [0, 0, 0], 0xb9d9a8);
  // Closed sleepy eyes and a big yawn.
  for (const x of [-0.12, 0.12])
    box(head, [0.14, 0.03, 0.02], [x, 0.06, 0.24], 0x2d3a2a);
  box(head, [0.12, 0.1, 0.02], [0, -0.12, 0.24], 0x6b2c2c);
  // A striped nightcap with a pompom.
  box(head, [0.52, 0.12, 0.48], [0, 0.29, 0], 0xe6574a);
  box(head, [0.36, 0.12, 0.34], [0.04, 0.4, -0.04], 0xf4efe6);
  box(head, [0.2, 0.12, 0.2], [0.1, 0.5, -0.08], 0xe6574a);
  box(head, [0.1, 0.1, 0.1], [0.18, 0.6, -0.1], 0xf4efe6);
  g.userData.head = head;
  for (const x of [-0.36, 0.36]) {
    const arm = box(g, [0.16, 0.16, 0.62], [x, 1.25, 0.32], 0x7fbf86);
    arm.userData.arm = true;
  }
  for (const x of [-0.14, 0.14])
    leg(g, [0.2, 0.62, 0.22], [x, 0.66, 0], 0x5f9f69, 0xb9d9a8);
  return g;
}

const JELLY_COLORS = [0x6fd3c6, 0xf08cc0, 0x9fd36f];
function jelly(small = false, colorIndex = 0) {
  const g = new THREE.Group();
  g.userData.legs = [];
  const color = JELLY_COLORS[colorIndex % JELLY_COLORS.length];
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.8, 0.8),
    new THREE.MeshStandardMaterial({
      color,
      transparent: true,
      opacity: 0.78,
      roughness: 0.2,
    }),
  );
  body.position.y = 0.4;
  body.castShadow = true;
  g.add(body);
  box(body, [0.4, 0.4, 0.4], [0, -0.05, 0], color);
  for (const x of [-0.17, 0.17]) {
    box(body, [0.14, 0.16, 0.02], [x, 0.1, 0.41], 0xffffff);
    box(body, [0.07, 0.08, 0.02], [x, 0.08, 0.42], 0x1d2a2e);
  }
  box(body, [0.2, 0.05, 0.02], [0, -0.1, 0.41], 0x1d2a2e);
  g.userData.body = body;
  if (small) g.scale.setScalar(0.55);
  return g;
}

function archer() {
  const g = new THREE.Group();
  g.userData.legs = [];
  box(g, [0.34, 0.6, 0.22], [0, 1.0, 0], 0xece6d6);
  for (const y of [0.84, 1.0, 1.16])
    box(g, [0.4, 0.05, 0.26], [0, y, 0], 0xd6cfbd);
  const head = new THREE.Group();
  head.position.set(0, 1.52, 0);
  g.add(head);
  box(head, [0.44, 0.42, 0.42], [0, 0, 0], 0xf4efe2);
  for (const x of [-0.11, 0.11])
    box(head, [0.12, 0.12, 0.02], [x, 0.04, 0.22], 0x2b2620);
  box(head, [0.22, 0.04, 0.02], [0, -0.12, 0.22], 0x2b2620);
  // A floppy brown hat.
  box(head, [0.62, 0.06, 0.62], [0, 0.23, 0], 0x7a5236);
  box(head, [0.38, 0.16, 0.38], [0, 0.33, 0], 0x8a6040);
  g.userData.head = head;
  const bow = box(g, [0.06, 0.7, 0.08], [0.3, 1.05, 0.25], 0x9a6a3c);
  bow.rotation.z = 0.15;
  box(g, [0.12, 0.12, 0.4], [-0.25, 1.1, 0.12], 0xece6d6);
  for (const x of [-0.1, 0.1])
    leg(g, [0.12, 0.66, 0.12], [x, 0.7, 0], 0xece6d6);
  return g;
}

export function arrow() {
  const g = new THREE.Group();
  box(g, [0.05, 0.05, 0.6], [0, 0, 0], 0x9a6a3c);
  box(g, [0.14, 0.14, 0.06], [0, 0, 0.32], 0xe6574a);
  return g;
}

export const MODELS = {
  chicken,
  cow,
  sheep,
  dog,
  pig,
  rabbit,
  cat,
  horse,
  sleepy,
  jelly,
  archer,
};

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
