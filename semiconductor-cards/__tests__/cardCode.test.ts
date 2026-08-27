import { test } from "node:test";
import assert from "node:assert/strict";
import { cardCode } from "../lib/cardCode";

test("multi-word names become initials", () => {
  assert.equal(cardCode("Texas Instruments"), "TI");
  assert.equal(cardCode("Advanced Micro Devices"), "AMD");
});

test("single-word names use the first few letters", () => {
  assert.equal(cardCode("TSMC"), "TSMC");
  assert.equal(cardCode("NVIDIA"), "NVID");
  assert.equal(cardCode("Qualcomm"), "QUAL");
});

test("caps out at 4 characters", () => {
  assert.ok(cardCode("Texas Instruments Semiconductor Group Holdings").length <= 4);
  assert.ok(cardCode("Broadcom").length <= 4);
});
