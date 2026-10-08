import type { Instrumentation } from "next";

/** Server-side errors from route handlers, server components and the proxy land in gg_errors (see lib/server/errors). */
export const onRequestError: Instrumentation.onRequestError = async (error, request) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { recordError } = await import("@/lib/server/errors");
  const e = error as { name?: string; message?: string };
  await recordError({ surface: "server", name: e.name, message: e.message, route: request.path });
};
