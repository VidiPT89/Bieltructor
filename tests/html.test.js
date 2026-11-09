import test from "node:test";
import assert from "node:assert/strict";
import { escapeHtml, field, parentField, wearBar } from "../src/ui/html.js";

test("names typed by a child cannot break the page", () => {
  assert.equal(
    escapeHtml(`<b>"Biel" & 'Ana'</b>`),
    "&lt;b&gt;&quot;Biel&quot; &amp; &#39;Ana&#39;&lt;/b&gt;",
  );
});

test("option fields select the current value, booleans included", () => {
  const html = field("hunger", "Fome", false, [
    [true, "Sim"],
    [false, "Não"],
  ]);
  assert.match(html, /<option value="false" selected>Não/);
  assert.match(html, /data-option="hunger"/);
  assert.match(parentField("x", "X", 1, [[1, "um"]]), /data-parent="x"/);
});

test("the wear bar shows what is left, and nothing for new tools", () => {
  assert.equal(wearBar(0, 60), "");
  assert.equal(wearBar(5, 0), "");
  assert.match(wearBar(15, 60), /--left:75%/);
});
