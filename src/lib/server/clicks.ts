import "server-only";
import { database, initializeDatabase } from "./db";
import { isTestClick, platformGuess, safeReferrer } from "@/lib/click-tracking";

export async function recordClick(slug: string, agent: string, referrer: string, url?: string, marker = "") {
  await initializeDatabase();
  // Unknown slugs are never counted. Group is captured at click time.
  const rows = await database()`INSERT INTO gg_clicks (slug, lead_group, referrer, platform_guess, is_example, is_test)
    SELECT slug, data->>'platform', ${safeReferrer(referrer)}, ${platformGuess(agent, referrer)},
      (data->>'name' ~* '\\mEXAMPLE\\M'), (${isTestClick(slug, url, agent, marker)} OR data->>'name' ~* '\\mEXAMPLE\\M') FROM gg_leads WHERE slug=${slug} RETURNING id`;
  return rows.length > 0;
}

export async function getClickAnalytics() {
  await initializeDatabase();
  const sql = database();
  const [leads, groups, daily, dailyBySlug] = await sql.transaction([
    sql`SELECT slug, count(*)::int AS clicks FROM gg_clicks WHERE NOT is_test AND NOT is_example GROUP BY slug ORDER BY slug`,
    sql`SELECT lead_group AS "group", count(*)::int AS clicks FROM gg_clicks WHERE NOT is_test AND NOT is_example GROUP BY lead_group ORDER BY lead_group`,
    sql`SELECT to_char(day, 'YYYY-MM-DD') AS day, count(c.id)::int AS clicks
      FROM generate_series((now() AT TIME ZONE 'UTC')::date - 29, (now() AT TIME ZONE 'UTC')::date, interval '1 day') day
      LEFT JOIN gg_clicks c ON (c.clicked_at AT TIME ZONE 'UTC')::date=day::date AND NOT c.is_example AND NOT c.is_test
      GROUP BY day ORDER BY day`,
    sql`SELECT slug, to_char(clicked_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day, count(*)::int AS clicks FROM gg_clicks WHERE NOT is_test AND NOT is_example AND (clicked_at AT TIME ZONE 'UTC')::date >= (now() AT TIME ZONE 'UTC')::date - 29 GROUP BY slug, day ORDER BY day, slug`,
  ]);
  return { leads, groups, daily, dailyBySlug };
}
