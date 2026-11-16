import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import YAML from "yaml";
import { isCorrection, lastUserText } from "../../.claude/hooks/lessons-guard.mjs";
import { lessonsDue } from "../lib/garden.mjs";

const HOOK = new URL("../../.claude/hooks/lessons-guard.mjs", import.meta.url).pathname;

test("corrections fire; ordinary answers don't", () => {
  for (const s of ["I already told you not to ask about the allergy", "you forgot the sunset time again", "that's not what I asked", "why did you put a brewery in", "how many times do I have to say it", "stop adding coffee"])
    assert.ok(isCorrection(s), s);
  for (const s of ["no", "B", "No, the second one", "nah, skip Kaymoor", "what about Zion in March?", "log: Honey Creek was muddy", "I said yes to the golf", "again tomorrow maybe"])
    assert.ok(!isCorrection(s), s);
});

const line = (o) => JSON.stringify(o);
test("the last message Colin typed, not a tool result or a harness wrapper", () => {
  const lines = [
    line({ type: "user", message: { content: "you forgot the ferry" } }),
    line({ type: "assistant", message: { content: [{ type: "text", text: "sorry" }] } }),
    line({ type: "user", message: { content: [{ type: "tool_result", content: "ok" }] } }),
    line({ type: "user", message: { content: "<task-notification>done</task-notification>" } }),
    line({ type: "user", isMeta: true, message: { content: "meta" } }),
  ];
  assert.equal(lastUserText(lines), "you forgot the ferry");
  assert.equal(lastUserText([line({ type: "user", message: { content: [{ type: "text", text: "why did you do that" }] } })]), "why did you do that");
  assert.equal(lastUserText([]), null);
});

test("the hook blocks once on a correction and stays quiet otherwise", () => {
  const dir = mkdtempSync(join(tmpdir(), "lessons-"));
  const run = (content, active = false) => {
    const t = join(dir, "t.jsonl");
    writeFileSync(t, line({ type: "user", message: { content } }) + "\n");
    return execFileSync(process.execPath, [HOOK], { input: JSON.stringify({ transcript_path: t, stop_hook_active: active }), encoding: "utf8" }).trim();
  };
  assert.equal(JSON.parse(run("I told you not to nag about bookings")).decision, "block");
  assert.equal(run("I told you not to nag about bookings", true), "", "never twice in one turn");
  assert.equal(run("sounds good, book it"), "");
});

test("a lesson is ready at 3 independent sessions, not 3 repeats in one", () => {
  const ep = (session) => ({ date: "2026-11-16", session, quote: "x" });
  const l = (episodes, status = "open") => ({ id: "a", target: "me/working-rules.md", lesson: "Do the thing.", status, episodes });
  assert.equal(lessonsDue([l([ep("s1"), ep("s1"), ep("s1")])]).length, 0, "one session counts once");
  assert.equal(lessonsDue([l([ep("s1"), ep("s2")])]).length, 0);
  const due = lessonsDue([l([ep("s1"), ep("s2"), ep("s3")])]);
  assert.equal(due.length, 1);
  assert.match(due[0].why, /me\/working-rules\.md/);
  assert.equal(lessonsDue([l([ep("s1"), ep("s2"), ep("s3")], "promoted")]).length, 0);
});

test("garden/lessons.yaml parses and every lesson has the fields the ladder needs", () => {
  const lessons = YAML.parse(readFileSync(new URL("../../garden/lessons.yaml", import.meta.url), "utf8")) ?? [];
  assert.ok(Array.isArray(lessons));
  for (const l of lessons) {
    for (const k of ["id", "target", "lesson", "status", "episodes"]) assert.ok(l[k] != null, `${l.id ?? "?"}: ${k}`);
    assert.ok(["open", "proposed", "promoted", "rejected"].includes(l.status), `${l.id}: status`);
    if (l.status === "rejected") assert.ok(l.reason, `${l.id}: a rejected lesson keeps Colin's reason`);
  }
});
