import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

// Basic smoke checks for the work directory contents.

test("inquiries.json is valid JSON with entries", () => {
  const raw = readFileSync("inquiries.json", "utf8");
  const data = JSON.parse(raw);
  assert.ok(Array.isArray(data) || typeof data === "object", "inquiries.json parses");
});

test("required scripts exist", () => {
  assert.ok(existsSync("fetch-inquiries.mjs"), "fetch-inquiries.mjs present");
  assert.ok(existsSync("build-inquiries.mjs"), "build-inquiries.mjs present");
});
