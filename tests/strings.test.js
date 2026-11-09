import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { strings } from "../src/strings.js";

// Keys of an object, nested ones as "group.key".
const keys = (o, prefix = "") =>
  Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? keys(v, prefix + k + ".")
      : [prefix + k],
  );

test("Portuguese and English have exactly the same texts", () => {
  assert.deepEqual(keys(strings.pt).sort(), keys(strings.en).sort());
});

test("no text key is written twice (the second would silently win)", () => {
  const source = readFileSync(
    new URL("../src/strings.js", import.meta.url),
    "utf8",
  );
  for (const lang of ["pt", "en"]) {
    const start = source.indexOf(`  ${lang}: {`),
      end = lang === "pt" ? source.indexOf("  en: {") : source.length;
    const top = [...source.slice(start, end).matchAll(/^    (\w+):/gm)].map(
      (m) => m[1],
    );
    const twice = top.filter((k, i) => top.indexOf(k) !== i);
    assert.deepEqual(twice, [], `${lang}: ${twice.join(", ")}`);
  }
});

test("no Portuguese text uses a long dash", () => {
  assert(!JSON.stringify(strings.pt).includes("—"));
});
