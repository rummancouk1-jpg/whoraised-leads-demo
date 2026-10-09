import { test, expect } from "@playwright/test";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

test("logout waits for registration, unregisters before CLEAR, and prevents reinstall", async () => {
  const events: string[] = [];
  let finishInstall!: (value: unknown) => void;
  const install = new Promise(resolve => { finishInstall = resolve; });
  const registration = {
    unregister: async () => { events.push("unregister"); },
    active: { postMessage: () => { events.push("clear"); queueMicrotask(() => port.onmessage?.()); } },
  };
  const port = { onmessage: null as (() => void) | null, close() {} };
  const local: Record<string, string> = { "gg-views": "private", unrelated: "keep" };
  const localStorage = new Proxy(local, { get(target, key) { return key === "removeItem" ? (name: string) => { delete target[name]; } : target[String(key)]; } });
  const exports = {} as { registerStaticWorker: () => void; clearClientState: () => Promise<void> };
  const source = ts.transpileModule(fs.readFileSync("src/lib/session-navigation.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { exports, navigator: { serviceWorker: { register: () => { events.push("register"); return install; }, getRegistrations: async () => { events.push("list"); return [registration]; } } }, localStorage, sessionStorage: { clear() { events.push("storage"); } }, window: { caches: true }, caches: { keys: async () => ["static"], delete: async () => { events.push("delete"); } }, MessageChannel: class { port1 = port; port2 = {}; }, setTimeout, clearTimeout, Promise, URL });
  exports.registerStaticWorker();
  const cleanup = exports.clearClientState();
  exports.registerStaticWorker();
  await Promise.resolve();
  expect(events).toEqual(["register", "storage"]);
  finishInstall(registration);
  await cleanup;
  expect(events).toEqual(["register", "storage", "list", "unregister", "clear", "delete"]);
  expect(local).toEqual({ unrelated: "keep" });
});
