import { ohqAuthorized, ohqHealth } from "@/lib/server/ohq";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  if (!ohqAuthorized(request)) return Response.json({ error: "Unauthorized." }, { status: 401, headers });
  return Response.json(await ohqHealth(), { headers });
}
