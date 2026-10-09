import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";

test("real-code multi-day replay: all 18 independent contracts", () => {
  test.setTimeout(180000);
  const output = execFileSync(process.execPath, ["tests/r2-independent-replay.cjs"], {
    encoding: "utf8", timeout: 120000, env: { ...process.env, EVIDENCE_ROOT: "evidence/r2-fix/replay" },
  });
  expect(output).toContain("18/18 checks passed");
});
