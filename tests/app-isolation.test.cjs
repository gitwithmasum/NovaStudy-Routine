"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");

test("NovaStudy has no embedded Chronos widget or third-party loader", () => {
  const html = read("index.html");
  assert.doesNotMatch(html, /chronos-widget|chronos-integration|MASUM CHRONOS|gitwithmasum\.github\.io\/Masum-Chronos/i);
  assert.doesNotMatch(html, /<script[^>]+Masum-Chronos/i);
  assert.doesNotMatch(html, /chronos-widget-integration\.css/i);
});

test("NovaStudy keeps its own installable PWA identity and scope", () => {
  const manifest = JSON.parse(read("manifest.webmanifest"));
  assert.equal(manifest.name, "NovaStudy — Student Routine OS");
  assert.equal(manifest.short_name, "NovaStudy");
  assert.equal(manifest.id, "./");
  assert.equal(manifest.start_url, "./");
  assert.equal(manifest.scope, "./");
  assert.ok(manifest.icons.some(icon => icon.src === "./assets/icon-192.png"));
});

test("the isolated service worker does not cache or load Chronos assets", () => {
  const sw = read("sw.js");
  assert.match(sw, /const CACHE='novastudy-v3\.6\.5-isolated'/);
  assert.doesNotMatch(sw, /chronos-widget|Masum-Chronos/i);
});

test("NovaStudy remains independent while its core app assets stay present", () => {
  const html = read("index.html");
  for (const file of ["./app.js", "./core.js", "./auth.js", "./manifest.webmanifest"]) {
    assert.ok(html.includes(file), "Expected NovaStudy core asset: " + file);
  }
});
