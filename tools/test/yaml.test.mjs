// Every fenced ```yaml block in the repo's Markdown, and every .yaml file,
// must parse. The tools read these (gear.md feeds the briefing and the
// gardener), and a broken block crashes them while every other test passes:
// that happened on 2026-11-01, when a quote inside a gear note broke
// `node tools/now.mjs` and `npm test` stayed green.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import YAML from "yaml";

const root = new URL("../../", import.meta.url);
const files = execFileSync("git", ["ls-files", "*.md", "*.yaml", "*.yml"], { cwd: root, encoding: "utf8" })
  .split("\n").filter(Boolean);

const lineOf = (text, index) => text.slice(0, index).split("\n").length;

test("every fenced yaml block in Markdown parses", () => {
  const bad = [];
  for (const f of files.filter((f) => f.endsWith(".md"))) {
    const text = readFileSync(new URL(f, root), "utf8");
    for (const m of text.matchAll(/```yaml[^\n]*\n([\s\S]*?)```/g)) {
      const doc = YAML.parseDocument(m[1]);
      if (doc.errors.length) {
        const start = lineOf(text, m.index) + 1;
        const e = doc.errors[0];
        bad.push(`${f}:${start + (e.linePos?.[0]?.line ?? 1) - 1} ${e.message.split("\n")[0]}`);
      }
    }
  }
  assert.deepEqual(bad, [], `broken yaml blocks:\n${bad.join("\n")}`);
});

test("every .yaml file parses", () => {
  const bad = [];
  for (const f of files.filter((f) => /\.ya?ml$/.test(f))) {
    for (const doc of YAML.parseAllDocuments(readFileSync(new URL(f, root), "utf8"))) {
      if (doc.errors.length) bad.push(`${f}: ${doc.errors[0].message.split("\n")[0]}`);
    }
  }
  assert.deepEqual(bad, [], `broken yaml files:\n${bad.join("\n")}`);
});
