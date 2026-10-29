import { test } from "node:test";
import assert from "node:assert/strict";
import { segment, encodeZeroWidth } from "./reveal.ts";

test("plain text with no hidden characters comes back as a single text segment", () => {
  assert.deepEqual(segment("Q3 numbers are final."), [{ kind: "text", text: "Q3 numbers are final." }]);
});

test("an empty string produces no segments", () => {
  assert.deepEqual(segment(""), []);
});

test("a run of mixed zero-width characters collapses into one counted segment", () => {
  assert.deepEqual(segment("a​‌‍⁠﻿b"), [
    { kind: "text", text: "a" },
    { kind: "zwc", count: 5, label: "5 zero-width" },
    { kind: "text", text: "b" },
  ]);
});

test("a single zero-width character is labelled with a count of one", () => {
  assert.deepEqual(segment("​"), [{ kind: "zwc", count: 1, label: "1 zero-width" }]);
});

test("zero-width runs separated by text stay as separate segments", () => {
  assert.deepEqual(segment("​x​​"), [
    { kind: "zwc", count: 1, label: "1 zero-width" },
    { kind: "text", text: "x" },
    { kind: "zwc", count: 2, label: "2 zero-width" },
  ]);
});

test("a right-to-left override is labelled with its code point and short name", () => {
  assert.deepEqual(segment("x‮y"), [
    { kind: "text", text: "x" },
    { kind: "bidi", codepoint: "U+202E", label: "U+202E RLO" },
    { kind: "text", text: "y" },
  ]);
});

test("adjacent bidi controls are reported one per segment", () => {
  assert.deepEqual(segment("⁦⁩"), [
    { kind: "bidi", codepoint: "U+2066", label: "U+2066 LRI" },
    { kind: "bidi", codepoint: "U+2069", label: "U+2069 PDI" },
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
    { kind: "zwc", count: 16, label: "16 zero-width" },
    { kind: "text", text: "." },
  ]);
});
