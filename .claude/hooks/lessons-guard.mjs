#!/usr/bin/env node
/* Stop hook: if Colin's last message reads like a correction of how Claude
   works, block the stop once and ask Claude to check garden/lessons.yaml.
   Specific markers only: a bare "no" is how he answers a multiple-choice
   question, so it must not fire. It never edits anything itself, and it
   fires at most once per turn (stop_hook_active). See CLAUDE.md § Lessons. */
import { readFileSync } from "node:fs";

export const MARKERS = [
  /\bi (?:already |just )?(?:told|asked) you\b/i,
  /\bi (?:already )?said (?:not to|no|to)\b/i,
  /\byou (?:forgot|missed|ignored|skipped|keep|always|never)\b/i,
  /\b(?:that'?s|this is) (?:wrong|not right|not what i (?:asked|said|meant))\b/i,
  /\bnot what i (?:asked|said|meant)\b/i,
  /\b(?:stop|quit) (?:doing|adding|asking|putting)\b/i,
  /\bdon'?t (?:do that|ever|keep)\b/i,
  /\bwhy (?:did|do|would) you\b/i,
  /\bagain\?{1,}|\bagain[.!]{1,}\s*$/im,
  /\bhow many times\b/i,
];

export function isCorrection(text) {
  return MARKERS.some((re) => re.test(text));
}

// The last message Colin typed: skip tool results and harness-injected text.
export function lastUserText(lines) {
  for (let i = lines.length - 1; i >= 0; i--) {
    let e; try { e = JSON.parse(lines[i]); } catch { continue; }
    if (e.type !== "user" || e.isMeta || e.isSidechain) continue;
    const c = e.message?.content;
    const text = typeof c === "string" ? c : Array.isArray(c) && c.every((b) => b.type === "text") ? c.map((b) => b.text).join("\n") : null;
    if (text == null) continue; // a tool result
    const t = text.trim();
    if (!t || t.startsWith("<")) continue; // command, notification or reminder wrappers
    return t;
  }
  return null;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  let input = {};
  try { input = JSON.parse(readFileSync(0, "utf8") || "{}"); } catch {}
  if (input.stop_hook_active || !input.transcript_path) process.exit(0);
  let text = null;
  try { text = lastUserText(readFileSync(input.transcript_path, "utf8").split("\n")); } catch { process.exit(0); }
  if (!text || !isCorrection(text)) process.exit(0);
  const quote = text.length > 160 ? text.slice(0, 157) + "…" : text;
  console.log(JSON.stringify({
    decision: "block",
    reason: `Colin's last message may be a correction: "${quote}". Before stopping, apply CLAUDE.md § Lessons: if it corrects how you or a skill behave (not a fact about him or a trip), add an episode to garden/lessons.yaml (new lesson or an existing one) on this branch, and follow the 1/2/3 escalation. If it's a fact, it belongs in its own file instead. If it's neither, stop without comment.`,
  }));
}
