import { test, expect } from "@playwright/test";
import { isTestClick, isPreviewBot, platformGuess, preregDestination, safeReferrer } from "../src/lib/click-tracking";
import { groupResults, suggestedWeights } from "../src/lib/outreach";
import type { Lead } from "../src/types/outreach";

test("Test slugs and query markers never train real conversion metrics", () => {
  expect(isTestClick("example-proof")).toBe(true);
  expect(isTestClick("test-proof")).toBe(true);
  expect(isTestClick("creator", "https://gg-tourney-hub.vercel.app/go/creator?test=1")).toBe(true);
  expect(isTestClick("creator", "https://gg-tourney-hub.vercel.app/go/creator?test=0")).toBe(false);
  expect(isTestClick("creator", undefined, "GG-Outreach-Audit/1.0")).toBe(true);
  expect(isTestClick("creator", undefined, "Mozilla iPhone", "1")).toBe(true);
  expect(isTestClick("creator", undefined, "Mozilla iPhone", "")).toBe(false);
  const click = { slug: "creator", group: "YouTube", day: "2026-10-07", url: "https://gg-tourney-hub.vercel.app/go/creator" };
  const markedClicks = [
    { ...click, slug: "example-proof" },
    { ...click, slug: "test-proof" },
    { ...click, url: click.url + "?test=1" },
  ];
  const metrics = (events: typeof click[]) => {
    const real = events.filter(e => !isTestClick(e.slug, e.url));
    return { total: real.length, lead: real.filter(e => e.slug === click.slug).length,
      group: real.filter(e => e.group === click.group).length, daily: real.filter(e => e.day === click.day).length };
  };
  expect(metrics([click, ...markedClicks])).toEqual(metrics([click]));
  const real: Lead = { name: "Creator", handle: "creator", platform: "YouTube", kind: "creator", audience_size: 10000, niche: "options", us_focus: "yes", contact: "", tracked_slug: "creator", stage: "Joined", signups: 1, last_touch: "", notes: "" };
  const baseline = [real, { ...real, tracked_slug: "creator-two" }, { ...real, tracked_slug: "creator-three" }];
  const tests = ["example-proof", "test-proof"].map(tracked_slug => ({ ...real, tracked_slug, signups: 99999 }));
  expect(groupResults([...baseline, ...tests], l => l.platform)).toEqual(groupResults(baseline, l => l.platform));
  expect(suggestedWeights([...baseline, ...tests])).toEqual(suggestedWeights(baseline));
});

test("Preview bots excluded while phone and desktop browsers count", () => {
  for (const agent of ["Twitterbot/1.0", "facebookexternalhit/1.1", "Slackbot-LinkExpanding", "Discordbot", "LinkedInBot", "WhatsApp/2", "TelegramBot", "Googlebot", "bingbot", "SkypeUriPreview", "Pinterestbot", "Embedly", "Iframely"]) expect(isPreviewBot(agent)).toBe(true);
  for (const agent of ["Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) Mobile Safari", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0 Safari/537.36"]) expect(isPreviewBot(agent)).toBe(false);
});

test("Redirect preserves destination parameters and overrides attribution", () => {
  const url = new URL(preregDestination("creator-a", "https://earningstournament.com/register?invite=gg&utm_source=old#join"));
  expect(url.pathname).toBe("/register");
  expect(url.searchParams.get("invite")).toBe("gg");
  expect(url.searchParams.get("utm_source")).toBe("creator");
  expect(url.searchParams.get("utm_campaign")).toBe("gg-q3");
  expect(url.searchParams.get("utm_content")).toBe("creator-a");
  expect(url.hash).toBe("#join");
  expect(preregDestination("a")).toContain("https://earningstournament.com/");
  expect(() => preregDestination("a", "javascript:alert(1)")).toThrow();
  const incoming = new URL(preregDestination("creator-a", undefined, "https://gg-tourney-hub.vercel.app/go/creator-a?utm_medium=email&utm_source=partner&utm_campaign=launch&utm_content=forged&token=private"));
  expect(incoming.searchParams.get("utm_medium")).toBe("email");
  expect(incoming.searchParams.get("utm_source")).toBe("partner");
  expect(incoming.searchParams.get("utm_campaign")).toBe("launch");
  expect(incoming.searchParams.get("utm_content")).toBe("creator-a");
  expect(incoming.searchParams.has("token")).toBe(false);
});

test("Referrer privacy and platform heuristics", () => {
  expect(safeReferrer("https://x.com/private?email=person@example.com#token")).toBe("x.com");
  expect(safeReferrer("invalid")).toBe("");
  expect(safeReferrer("file:///secret")).toBe("");
  expect(platformGuess("Mobile iPhone", "")).toBe("phone");
  expect(platformGuess("Mozilla Windows", "")).toBe("desktop");
  expect(platformGuess("Mobile iPhone", "https://t.co/path")).toBe("phone");
  expect(platformGuess("Mozilla", "https://www.x.com/post")).toBe("X");
  expect(platformGuess("Mozilla", "https://x.com.attacker.test/")).toBe("desktop");
});
