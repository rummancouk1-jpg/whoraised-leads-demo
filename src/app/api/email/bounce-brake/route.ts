import { authenticated, privateJson } from "@/lib/server/auth";
import { bounceBrakeStatus } from "@/lib/server/bounce-brake";
export async function GET() {
  if (!await authenticated()) return privateJson({ error: "Please log in." }, 401);
  try { return privateJson(await bounceBrakeStatus()); }
  catch { return privateJson({ error: "Bounce brake history could not be loaded." }, 503); }
}
