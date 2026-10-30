// Guards the committed output of scripts/build_demo.py. These fail if the demo
// is regenerated with absolute paths, an old-style report, or a broken decode.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { segment } from "./reveal.ts";

const report = readFileSync(new URL("../../public/demo/report.html", import.meta.url), "utf8");
const data = JSON.parse(readFileSync(new URL("../data/demo.json", import.meta.url), "utf8"));

test("the demo report loads nothing from the network", () => {
  assert.deepEqual(report.match(/<(?:link|img|iframe|script)\b[^>]*\b(?:src|href)\s*=/g), null);
  assert.equal(report.includes("googleapis"), false);
});

test("the demo report carries no local filesystem paths", () => {
  assert.equal(/\/home\/|\/Users\/|[A-Z]:\\\\/.test(report), false);
});

test("the demo report is the StegGuard-branded report, not the old Steg Detector one", () => {
  assert.match(report, /<title>StegGuard report · \d{4}-\d\d-\d\d \d\d:\d\d:\d\d<\/title>/);
});

test("the walkthrough file decodes to the planted message", () => {
  assert.equal(data.walkthrough.decoded, "rotate the staging keys before friday");
  assert.equal(data.walkthrough.occurrences, 296);
});

test("sanitizing the walkthrough file removes every zero-width character and keeps the original", () => {
  assert.equal(data.walkthrough.changes.zero_width_removed, data.walkthrough.occurrences);
  assert.equal(data.walkthrough.original_preserved, true);
});

test("the flagged count matches the files listed as not clean", () => {
  const flagged = data.files.filter((f: { severity: string }) => f.severity !== "clean").length;
  assert.equal(flagged, data.flagged_files);
  assert.equal(data.files.length, data.total_files);
});

test("file names in the demo data are relative to the samples folder", () => {
  for (const f of data.files) assert.equal(f.file.includes("/"), false, f.file);
});

test("the walkthrough line renders as its visible text followed by one zero-width run", () => {
  assert.deepEqual(segment(data.walkthrough.line), [
    { kind: "text", text: "- Faster startup on Windows." },
    { kind: "zwc", count: 296, label: "296 zero-width" },
  ]);
});
