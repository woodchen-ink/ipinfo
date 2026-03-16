// API base URL for client-side requests.
// On EdgeOne Pages: leave empty — requests go through Next.js API route handlers which proxy to the Go backend.
// In Docker: leave empty — nginx proxies /api/* to the Go backend.
// In development: leave empty — Next.js route handlers proxy to NEXT_PUBLIC_API_URL or localhost:8080.
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";
