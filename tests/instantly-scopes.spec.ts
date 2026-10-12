import { expect, test } from "@playwright/test";
import { scopesCover } from "../src/lib/server/instantly-scopes";

test("all:all covers every requested Instantly scope", () => {
  expect(scopesCover(["all:all"], ["leads:read", "emails:read"])).toBe(true);
});

test("exact grants cover their matching required scopes", () => {
  expect(scopesCover(["leads:read", "emails:read"], ["leads:read", "emails:read"])).toBe(true);
});

test("missing a required scope is rejected", () => {
  expect(scopesCover(["leads:read"], ["leads:read", "emails:read"])).toBe(false);
});
