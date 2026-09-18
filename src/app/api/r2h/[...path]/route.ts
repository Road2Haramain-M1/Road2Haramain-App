import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_BACKEND_URL = "http://localhost:8000/api/v1";
const TIMEOUT_MS = 10_000;

function backendUrl(path: string[], search: string): string {
  const base = process.env.R2H_BACKEND_URL ?? DEFAULT_BACKEND_URL;
  const normalized = base.replace(/\/$/, "");
  const safePath = path.map((segment) => encodeURIComponent(segment)).join("/");
  return `${normalized}/${safePath}${search}`;
}

/**
 * Proxies browser API calls to the server-configured R2H backend.
 * The backend URL remains server-only and upstream failures are reduced to a
 * stable error shape so provider details and stack traces never reach users.
 */
async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }): Promise<Response> {
  const { path } = await context.params;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const upstream = await fetch(backendUrl(path, request.nextUrl.search), {
      method: request.method,
      headers: {
        "Content-Type": request.headers.get("content-type") ?? "application/json",
        ...(request.headers.get("idempotency-key") ? { "Idempotency-Key": request.headers.get("idempotency-key")! } : {}),
      },
      body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.text(),
      cache: "no-store",
      signal: controller.signal,
    });

    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json", "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof DOMException && error.name === "AbortError"
      ? "The backend request timed out."
      : "The backend service is unavailable.";
    return Response.json({ code: "BACKEND_UNAVAILABLE", message }, { status: 503 });
  } finally {
    clearTimeout(timeout);
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
