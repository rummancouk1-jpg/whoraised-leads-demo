import { test } from "@playwright/test";
import { execFileSync } from "node:child_process";
test("resumable large sync and signed attribution contracts", () => {
  test.setTimeout(180000);
  execFileSync(process.execPath,["tests/r2-extra-contracts.cjs"],{timeout:120000,stdio:"pipe"});
});
