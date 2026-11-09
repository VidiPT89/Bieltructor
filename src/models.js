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

// A round little bee with stripes and buzzing wings.
export function bee() {
  const g = new THREE.Group();
  box(g, [0.2, 0.18, 0.26], [0, 0, 0], 0xf2c94c);
  for (const z of [-0.05, 0.06])
    box(g, [0.21, 0.19, 0.04], [0, 0, z], 0x2b2b30);
  eyes(g, 0.03, 0.135, 0.05, 0.04);
  g.userData.wings = [-1, 1].map((side) => {
    const w = box(g, [0.16, 0.02, 0.12], [side * 0.12, 0.11, 0], 0xf4f8fb);
    w.castShadow = false;
    w.userData.side = side;
    return w;
  });
  return g;
}

// A small fish with a tail that wiggles.
export function fish(color = 0xe98d2b) {
  const g = new THREE.Group();
  box(g, [0.1, 0.18, 0.32], [0, 0, 0], color);
  eyes(g, 0.03, 0.161, 0.03, 0.035);
  const tail = new THREE.Group();
  tail.position.set(0, 0, -0.16);
  box(tail, [0.04, 0.16, 0.12], [0, 0, -0.06], color);
  g.add(tail);
  g.userData.tail = tail;
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

function spider() {
  const g = new THREE.Group();
  g.userData.legs = [];
  box(g, [0.7, 0.42, 0.8], [0, 0.42, -0.1], 0x8d8f9c);
  const head = new THREE.Group();
  head.position.set(0, 0.42, 0.38);
  g.add(head);
  box(head, [0.46, 0.36, 0.3], [0, 0, 0], 0x9fa1ae);
  // Eight little round eyes.
  for (const [x, y] of [
    [-0.14, 0.06],
    [0.14, 0.06],
    [-0.06, 0.1],
    [0.06, 0.1],
    [-0.18, -0.04],
    [0.18, -0.04],
    [-0.07, -0.02],
    [0.07, -0.02],
  ])
    box(head, [0.06, 0.06, 0.02], [x, y, 0.16], 0x2b2620);
  g.userData.head = head;
  for (const side of [-1, 1])
    for (const z of [0.18, 0.02, -0.14, -0.3]) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.34, 0.42, z);
      const leg = box(
        pivot,
        [0.5, 0.07, 0.07],
        [side * 0.22, -0.12, 0],
        0x6e7080,
      );
      leg.rotation.z = side * -0.6;
      g.add(pivot);
      g.userData.legs.push(pivot);
    }
  return g;
}

function puff() {
  const g = new THREE.Group();
  g.userData.legs = [];
  const body = new THREE.Group();
  g.add(body);
  g.userData.body = body;
  for (const [w, x, y, z] of [
    [0.7, 0, 0.75, 0],
    [0.5, 0.3, 0.95, 0.05],
    [0.5, -0.3, 0.9, -0.05],
    [0.45, 0, 1.1, -0.1],
    [0.4, 0.15, 0.55, 0.2],
  ])
    box(body, [w, w * 0.8, w], [x, y, z], 0x9aa0a6);
  for (const x of [-0.13, 0.13])
    box(body, [0.1, 0.12, 0.02], [x, 0.82, 0.36], 0x2b2f33);
  box(body, [0.18, 0.05, 0.02], [0, 0.66, 0.36], 0x2b2f33);
  return g;
}

function ghost() {
  const g = new THREE.Group();
  g.userData.legs = [];
  const sheet = new THREE.MeshStandardMaterial({
    color: 0xf2f6ff,
    transparent: true,
    opacity: 0.6,
    roughness: 0.4,
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.9, 0.5), sheet);
  body.position.y = 0.95;
  g.add(body);
  // A wavy hem at the bottom.
  for (const x of [-0.22, 0, 0.22]) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, 0.5), sheet);
    tail.position.set(x, 0.42, 0);
    g.add(tail);
  }
  for (const x of [-0.12, 0.12])
    box(g, [0.1, 0.14, 0.02], [x, 1.08, 0.26], 0x3a4157);
  box(g, [0.12, 0.1, 0.02], [0, 0.88, 0.26], 0x3a4157);
  g.userData.body = body;
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
  spider,
  puff,
  ghost,
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
