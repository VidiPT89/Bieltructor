import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { MODELS, arrow, disposeModel } from "../src/models.js";

test("discarded models release geometry but keep shared colours alive", () => {
  const parent = new THREE.Group();
  const first = MODELS.sheep(),
    second = MODELS.sheep();
  parent.add(first, second);
  let geometries = 0,
    disposed = 0,
    sharedDisposed = 0;
  first.traverse((node) => {
    if (!node.isMesh) return;
    geometries++;
    node.geometry.addEventListener("dispose", () => disposed++);
  });
  second.userData.wool.material.addEventListener(
    "dispose",
    () => sharedDisposed++,
  );
  disposeModel(first);
  assert.equal(disposed, geometries);
  assert.equal(sharedDisposed, 0);
  assert.deepEqual(parent.children, [second]);
});

test("custom materials and label textures are released without disposing shared sprite geometry", () => {
  const model = arrow();
  const texture = new THREE.Texture();
  const material = new THREE.SpriteMaterial({ map: texture });
  const label = new THREE.Sprite(material);
  model.add(label);
  let maps = 0,
    materials = 0,
    geometries = 0;
  texture.addEventListener("dispose", () => maps++);
  material.addEventListener("dispose", () => materials++);
  label.geometry.addEventListener("dispose", () => geometries++);
  disposeModel(model);
  assert.equal(maps, 1);
  assert.equal(materials, 1);
  assert.equal(geometries, 0);
});
