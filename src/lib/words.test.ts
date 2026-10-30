import { test } from "node:test";
import assert from "node:assert/strict";
import { countWord, capitalize } from "./words.ts";

test("counts from zero to twelve are spelled out", () => {
  assert.equal(countWord(0), "zero");
  assert.equal(countWord(7), "seven");
  assert.equal(countWord(12), "twelve");
});

test("counts above twelve stay as numerals", () => {
  assert.equal(countWord(13), "13");
  assert.equal(countWord(161), "161");
});

test("negative and fractional counts stay as numerals", () => {
  assert.equal(countWord(-1), "-1");
  assert.equal(countWord(2.5), "2.5");
});

test("capitalize uppercases only the first letter", () => {
  assert.equal(capitalize("seven sample files"), "Seven sample files");
  assert.equal(capitalize(""), "");
});
