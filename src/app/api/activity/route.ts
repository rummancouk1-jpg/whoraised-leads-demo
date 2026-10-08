import { authenticated, privateJson } from "@/lib/server/auth";
import { getActivity } from "@/lib/server/activity";
export async function GET() {
  if (!await authenticated()) return privateJson({ error: "Please log in." }, 401);
  try { return privateJson(await getActivity()); }
  catch { return privateJson({ error: "Activity could not be loaded. Retry shortly." }, 503); }
}
