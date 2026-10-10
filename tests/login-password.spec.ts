import { test, expect } from "@playwright/test";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { harness } = require("./r2-independent-replay.cjs");

test("workspace login trims surrounding whitespace on both sides while preserving internal spaces and case", () => {
  const h = harness();
  h.env.GG_ACCESS_PASSWORD = " \tCorrect Horse\r\n";
  const { passwordMatches, equal } = h.load("src/lib/server/auth.ts");
  for (const input of ["Correct Horse", " \tCorrect Horse\n", "Correct Horse\r\n"]) expect(passwordMatches(input)).toBe(true);
  for (const input of ["correct Horse", "CorrectHorse", "Correct  Horse", "", null, undefined, 123, {}]) expect(passwordMatches(input)).toBe(false);
  // The fixed-length digest comparison remains exact for bearer tokens and session signatures.
  expect(equal("token", "token")).toBe(true);
  expect(equal("token", " token ")).toBe(false);
  expect(equal("short", "much longer input")).toBe(false);
});

test("unset or whitespace-only configured passwords never authenticate", () => {
  const h = harness();
  const { passwordMatches } = h.load("src/lib/server/auth.ts");
  for (const configured of [undefined, "", " \r\n\t"]) {
    h.env.GG_ACCESS_PASSWORD = configured;
    expect(passwordMatches("")).toBe(false);
    expect(passwordMatches(" \r\n\t")).toBe(false);
  }
});
