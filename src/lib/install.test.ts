import { test } from "node:test";
import assert from "node:assert/strict";
import { pipInstall, PYPI_URL, RELEASE } from "./install.ts";

test("the plain install command installs the stegguard package from PyPI", () => {
  assert.equal(pipInstall(), "pip install stegguard");
});

test("an extra is appended in brackets and quoted for zsh", () => {
  assert.equal(pipInstall("images"), "pip install 'stegguard[images]'");
});

test("an extra containing shell metacharacters is rejected", () => {
  assert.throws(() => pipInstall("images]; rm -rf ~"), /invalid extra: "images\]; rm -rf ~"/);
});

test("an empty extra is rejected rather than producing empty brackets", () => {
  assert.throws(() => pipInstall(""), /invalid extra: ""/);
});

test("the PyPI link points at the stegguard project page", () => {
  assert.equal(PYPI_URL, "https://pypi.org/project/stegguard/");
});

test("the advertised release is the version published on PyPI", () => {
  assert.equal(RELEASE, "0.4.0");
});
