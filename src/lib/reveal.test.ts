import { test } from "node:test";
import assert from "node:assert/strict";
import { segment, encodeZeroWidth, decodeZeroWidth, analyze } from "./reveal.ts";

test("plain text with no hidden characters comes back as a single text segment", () => {
  assert.deepEqual(segment("Q3 numbers are final."), [{ kind: "text", text: "Q3 numbers are final." }]);
});

test("an empty string produces no segments", () => {
  assert.deepEqual(segment(""), []);
});

test("a run of mixed zero-width characters collapses into one counted segment", () => {
  assert.deepEqual(segment("a​‌‍⁠﻿b"), [
    { kind: "text", text: "a" },
    { kind: "zwc", count: 5, label: "5 zero-width", raw: "​‌‍⁠﻿" },
    { kind: "text", text: "b" },
  ]);
});

test("a single zero-width character is labelled with a count of one", () => {
  assert.deepEqual(segment("​"), [{ kind: "zwc", count: 1, label: "1 zero-width", raw: "​" }]);
});

test("zero-width runs separated by text stay as separate segments", () => {
  assert.deepEqual(segment("​x​​"), [
    { kind: "zwc", count: 1, label: "1 zero-width", raw: "​" },
    { kind: "text", text: "x" },
    { kind: "zwc", count: 2, label: "2 zero-width", raw: "​​" },
  ]);
});

test("a right-to-left override is labelled with its code point and short name", () => {
  assert.deepEqual(segment("x‮y"), [
    { kind: "text", text: "x" },
    { kind: "bidi", codepoint: "U+202E", label: "U+202E RLO", raw: "‮" },
    { kind: "text", text: "y" },
  ]);
});

test("adjacent bidi controls are reported one per segment", () => {
  assert.deepEqual(segment("⁦⁩"), [
    { kind: "bidi", codepoint: "U+2066", label: "U+2066 LRI", raw: "⁦" },
    { kind: "bidi", codepoint: "U+2069", label: "U+2069 PDI", raw: "⁩" },
  ]);
});

test("characters just outside the bidi and zero-width ranges are treated as text", () => {
  // U+2029 paragraph separator and U+206A sit next to the ranges but are not flagged.
  assert.deepEqual(segment(" ⁪‎"), [{ kind: "text", text: " ⁪‎" }]);
});

test("encoding 'hi' produces the 16-character bit pattern 01101000 01101001", () => {
  const encoded = encodeZeroWidth("hi");
  const bits = [...encoded].map((c) => (c === "​" ? "0" : c === "‌" ? "1" : "?")).join("");
  assert.equal(bits, "0110100001101001");
});

test("encoding an empty message produces an empty string", () => {
  assert.equal(encodeZeroWidth(""), "");
});

test("encoding a non-ASCII character throws instead of truncating it", () => {
  assert.throws(() => encodeZeroWidth("é"), /only takes ASCII, got "é"/);
});

test("an encoded message segments back to one run with one zero-width per bit", () => {
  assert.deepEqual(segment(`ok${encodeZeroWidth("hi")}.`), [
    { kind: "text", text: "ok" },
    { kind: "zwc", count: 16, label: "16 zero-width", raw: encodeZeroWidth("hi") },
    { kind: "text", text: "." },
  ]);
});

test("a hidden segment keeps the raw characters it was built from", () => {
  const input = `a${encodeZeroWidth("hi")}b‮c`;
  const raws = segment(input).flatMap((s) => (s.kind === "text" ? [] : [s.raw]));
  assert.deepEqual(raws, [encodeZeroWidth("hi"), "‮"]);
  assert.equal(segment(input).map((s) => (s.kind === "text" ? s.text : s.raw)).join(""), input);
});

test("decodeZeroWidth reverses encodeZeroWidth", () => {
  assert.equal(decodeZeroWidth(encodeZeroWidth("hi")), "hi");
});

test("decodeZeroWidth returns null for lengths that are not a multiple of 8", () => {
  assert.equal(decodeZeroWidth(encodeZeroWidth("hi").slice(0, 15)), null);
  assert.equal(decodeZeroWidth(""), null);
});

test("decodeZeroWidth returns null for non-printable bytes", () => {
  assert.equal(decodeZeroWidth("​".repeat(8)), null); // 0x00
  assert.equal(decodeZeroWidth("‌".repeat(8)), null); // 0xFF
});

test("decodeZeroWidth returns null when other characters are mixed in", () => {
  assert.equal(decodeZeroWidth("‍" + encodeZeroWidth("hi").slice(1)), null);
});

test("a Cyrillic letter inside a Latin word is flagged as a glyph with homoglyphs on", () => {
  assert.deepEqual(segment("pаypal.com", { homoglyphs: true }), [
    { kind: "text", text: "p" },
    { kind: "glyph", char: "а", label: "Cyrillic U+0430" },
    { kind: "text", text: "ypal.com" },
  ]);
});

test("homoglyph detection is off unless asked for", () => {
  assert.deepEqual(segment("pаypal"), [{ kind: "text", text: "pаypal" }]);
});

test("a word written entirely in Cyrillic is not flagged", () => {
  assert.deepEqual(segment("привет", { homoglyphs: true }), [
    { kind: "text", text: "привет" },
  ]);
});

test("a Greek letter inside a Latin word is flagged", () => {
  const glyphs = segment("lοgin", { homoglyphs: true }).filter((s) => s.kind === "glyph");
  assert.deepEqual(glyphs, [{ kind: "glyph", char: "ο", label: "Greek U+03BF" }]);
});

test("analyze describes a decoded message and an override", () => {
  const { findings } = analyze(`ok${encodeZeroWidth("hi")} the ‮board.`);
  assert.equal(findings.length, 2);
  assert.match(findings[0], /16 zero-width characters spell "hi" in binary/);
  assert.match(findings[1], /right-to-left override/);
});

test("analyze reports nothing for clean text", () => {
  assert.deepEqual(analyze("Nothing to see here.").findings, []);
});
