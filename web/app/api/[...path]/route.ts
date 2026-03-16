import { NextRequest } from "next/server";

// Server-side only backend URL (not exposed to browser)
const BACKEND_URL = process.env.API_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

async function proxyRequest(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const targetPath = `/api/${path.join("/")}`;
  const url = new URL(targetPath, BACKEND_URL);

  // Forward query string
  const searchParams = request.nextUrl.searchParams.toString();
  if (searchParams) {
    url.search = searchParams;
  }

  // Forward headers, add X-Forwarded-For for IP detection
  const headers = new Headers(request.headers);
  headers.delete("host");

  // Pass client IP to backend for IP detection
  const clientIP = request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (clientIP) {
    headers.set("X-Forwarded-For", clientIP);
  }

  const response = await fetch(url.toString(), {
    method: request.method,
    headers,
    body: request.method !== "GET" && request.method !== "HEAD"
      ? await request.text()
      : undefined,
  });

  // Forward response
  const responseHeaders = new Headers(response.headers);
  // Remove hop-by-hop headers
  responseHeaders.delete("transfer-encoding");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const DELETE = proxyRequest;
export const PATCH = proxyRequest;
