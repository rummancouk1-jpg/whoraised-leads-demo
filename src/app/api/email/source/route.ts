import { authenticated, privateJson } from "@/lib/server/auth";
import { fetchEmailSource } from "@/lib/server/instantly";
export async function GET() {
  if (!await authenticated()) return privateJson({ error: "Please log in." }, 401);
  try { return privateJson(await fetchEmailSource()); }
  catch { return privateJson({ error: "Instantly source metrics could not be read." }, 503); }
}
