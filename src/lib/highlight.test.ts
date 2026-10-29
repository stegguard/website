import { test } from "node:test";
import assert from "node:assert/strict";
import { highlightShell } from "./highlight.ts";

test("the prompt is muted and the first word after it is marked as the command", () => {
  assert.deepEqual(highlightShell("$ stegguard detect report.md"), [
    { cls: "tk-com", text: "$ " },
    { cls: "tk-cmd", text: "stegguard" },
    { cls: "", text: " detect report.md" },
  ]);
});

test("a line without a prompt still marks its first word as the command", () => {
  assert.deepEqual(highlightShell("pip install x"), [
    { cls: "tk-cmd", text: "pip" },
    { cls: "", text: " install x" },
  ]);
});

test("long flags are marked and a trailing backslash is muted", () => {
  assert.deepEqual(highlightShell("stegguard detect upload.zip \\"), [
    { cls: "tk-cmd", text: "stegguard" },
    { cls: "", text: " detect upload.zip " },
    { cls: "tk-com", text: "\\" },
  ]);
});

test("an indented continuation line treats its first word as a flag, not a command", () => {
  assert.deepEqual(highlightShell("  --max-file-bytes 16777216 \\"), [
    { cls: "", text: "  " },
    { cls: "tk-flag", text: "--max-file-bytes" },
    { cls: "", text: " 16777216 " },
    { cls: "tk-com", text: "\\" },
  ]);
});

test("each of two adjacent flags is marked, with the space between them left plain", () => {
  assert.deepEqual(highlightShell("x --in-place --confirm"), [
    { cls: "tk-cmd", text: "x" },
    { cls: "", text: " " },
    { cls: "tk-flag", text: "--in-place" },
    { cls: "", text: " " },
    { cls: "tk-flag", text: "--confirm" },
  ]);
});

test("a single-dash option is left as plain text", () => {
  assert.deepEqual(highlightShell("stegguard -r"), [
    { cls: "tk-cmd", text: "stegguard" },
    { cls: "", text: " -r" },
  ]);
});

test("an empty line produces no tokens", () => {
  assert.deepEqual(highlightShell(""), []);
});

test("the joined token text always equals the input line", () => {
  const line = "$ stegguard sanitize report.md --in-place --confirm";
  assert.equal(highlightShell(line).map((t) => t.text).join(""), line);
});
