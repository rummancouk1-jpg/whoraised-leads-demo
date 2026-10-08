"use client";

import { useEffect, useState } from "react";

import { useOutreach } from "@/contexts/OutreachContext";

import { isExample, leadGroup, leadTier } from "@/lib/outreach";

import { sendingState } from "@/lib/email-state";
import type { EmailResponse } from "@/types/email";



export function StatusStrip() {

  const { leads, loading, error, clicks } = useOutreach();

  const [email, setEmail] = useState<EmailResponse | null>(null);

  const [failed, setFailed] = useState(false);

  useEffect(() => {

    let active = true;
    const controller = new AbortController();
    const cancelReads = () => controller.abort();
    window.addEventListener("pagehide", cancelReads);
    window.addEventListener("beforeunload", cancelReads);

    const read = async () => {

      try {

        const response = await fetch("/api/email", { cache: "no-store", signal: controller.signal });

        if (!response.ok) throw new Error("Awaiting data");

        const data = await response.json();

        if (active) { setEmail(data); setFailed(false); }

      } catch { if (active && !controller.signal.aborted) setFailed(true); }

    };

    void read();

    const timer = setInterval(() => void read(), 60000);

    return () => { active = false; controller.abort(); window.removeEventListener("pagehide", cancelReads); window.removeEventListener("beforeunload", cancelReads); clearInterval(timer); };

  }, []);

  const snapshot = email?.live ?? email?.history[0]?.metrics;

  const warming = snapshot?.inboxes.filter(i => i.warmup === "Active");

  const health = warming?.flatMap(i => i.health === null ? [] : [i.health]) ?? [];

  const queued = leads.filter(l => !isExample(l) && l.stage === "New");

  const real = leads.filter(l => !isExample(l));

  const priorityCount = real.filter(l => leadTier(l) === "priority").length;

  const longTailCount = real.length - priorityCount;

  const groups = [...new Set(real.map(leadGroup))].sort().map(g => `${g}: ${real.filter(l => leadGroup(l) === g).length}`);

  const status = snapshot?.campaign?.status;

  const labels: Record<string, string> = { "0": "Draft", "1": "Active", "2": "Paused", "3": "Completed", "4": "Running subsequences" };

  return <section className="gg-status-strip" aria-label="Outreach status">

    <div><p>Inboxes warming</p><strong>{warming ? warming.length : failed || email ? "Awaiting data" : "Loading…"}</strong><small>{health.length ? `${Math.round(health.reduce((a, b) => a + b, 0) / health.length)}% average health · ${health.length}/${warming?.length} measured` : "Awaiting health metrics"}{snapshot && ` · ${email?.live ? "Instantly" : "Saved snapshot"} ${snapshot.fetchedAt}`}</small></div>

    <div><p>Outreach queued</p><strong>{loading ? "Loading…" : error ? "Awaiting data" : queued.length}</strong><small>{!loading && !error ? `Priority: ${priorityCount} · Long tail: ${longTailCount} · ${groups.join(" · ")}` : "Awaiting shared workspace"}</small></div>

    <div><p>Tracked clicks</p><strong>{clicks ? clicks.groups.reduce((n, g) => n + g.clicks, 0) : "Loading…"}</strong><small>Creator link visits</small></div>

    <div><p>Campaign</p><strong>{snapshot ? snapshot.campaign ? labels[String(status)] ?? (status === undefined ? "Awaiting status" : `Status ${status}`) : snapshot.campaignMessage.startsWith("Multiple") ? "Selection required" : sendingState(snapshot) : failed || email ? "Awaiting data" : "Loading…"}</strong><small>{snapshot?.campaign?.name ?? (snapshot ? "Instantly snapshot" : "Awaiting Instantly data")}</small></div>

  </section>;

}

