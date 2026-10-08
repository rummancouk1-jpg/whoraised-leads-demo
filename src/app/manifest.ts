import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GG Outreach", short_name: "GG Outreach",
    description: "Private workspace for the GG team only.",
    start_url: "/login", display: "standalone",
    background_color: "#0b0f14", theme_color: "#0b0f14",
  };
}
