import { authenticated, privateJson, sameOrigin } from "@/lib/server/auth";
import { getLeads, importCsv } from "@/lib/server/leads";
import { getClickAnalytics } from "@/lib/server/clicks";

export async function GET() {
  if (!await authenticated()) return privateJson({ error: "Please log in." }, 401);
  try { const [leads, clicks] = await Promise.all([getLeads(), getClickAnalytics()]); return privateJson({ leads, clicks }); }
  catch { return privateJson({ error: "Shared workspace could not be loaded. Retry shortly." }, 503); }
}
export async function POST(request: Request) {
  if (!await authenticated()) return privateJson({ error: "Please log in." }, 401);
  if (!sameOrigin(request)) return privateJson({ error: "Invalid request origin." }, 403);
  try {
    const body = await request.text();
    if (body.length > 1_100_000) return privateJson({ error: "CSV exceeds the 1 MB limit." }, 413);
    const data = JSON.parse(body);
    if (typeof data.csv !== "string") throw new Error("Supply CSV text.");
    return privateJson({ leads: await importCsv(data.csv, data.replace === true, data.oneTime === true) });
  } catch (e) { return privateJson({ error: (e as Error).message.startsWith("CSV") || /^(Import|Row|Header|This CSV|Supply|Expected|Missing|Duplicate|Invalid)/.test((e as Error).message) ? (e as Error).message : "Import failed. Check your CSV and database configuration." }, 400); }
}
