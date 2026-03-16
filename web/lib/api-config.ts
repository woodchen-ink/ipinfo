// API base URL for client-side requests.
// On EdgeOne Pages: set NEXT_PUBLIC_API_URL to the Go backend address (browser requests directly).
// In Docker: leave empty — nginx proxies /api/* to the Go backend on same origin.
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";
