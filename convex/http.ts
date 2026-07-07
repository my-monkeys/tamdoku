import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

// La SPA (tamdoku.fr) appelle cet endpoint cross-origin → CORS explicite.
const ALLOWED = new Set(["https://tamdoku.fr", "http://localhost:5173"]);

function cors(origin: string | null): Record<string, string> {
  const allow = origin && ALLOWED.has(origin) ? origin : "https://tamdoku.fr";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

const http = httpRouter();

http.route({
  path: "/submit",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, req) => {
    return new Response(null, { status: 204, headers: cors(req.headers.get("Origin")) });
  }),
});

http.route({
  path: "/submit",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const origin = req.headers.get("Origin");
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response("bad json", { status: 400, headers: cors(origin) });
    }
    const { date, anon, cells } = (body ?? {}) as Record<string, unknown>;
    if (typeof date !== "string" || typeof anon !== "string" || !Array.isArray(cells)) {
      return new Response("bad args", { status: 400, headers: cors(origin) });
    }
    const res = await ctx.runMutation(api.submit.submit, {
      date,
      anon,
      cells: cells as { cell: number; station: string }[],
    });
    return new Response(JSON.stringify(res), {
      status: 200,
      headers: { ...cors(origin), "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/popularity",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const date = new URL(req.url).searchParams.get("date") ?? undefined;
    const res = await ctx.runQuery(api.popularity.get, { date });
    return new Response(JSON.stringify(res), {
      status: 200,
      headers: {
        ...cors(req.headers.get("Origin")),
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300",
      },
    });
  }),
});

export default http;
