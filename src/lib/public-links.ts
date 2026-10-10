/** Public aliases leave stored partner IDs and all historical attribution intact. */
export function publicSlug(slug: string) {
  return slug.replace(/^preclient-/, "");
}

export function trackedLink(slug: string, baseUrl: string) {
  return new URL(`/go/${encodeURIComponent(publicSlug(slug))}`, baseUrl).href;
}
