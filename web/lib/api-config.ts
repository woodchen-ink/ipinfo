// API base URL for the Go backend.
// In Docker/production: empty string — Go serves both API and frontend on same origin.
// In development: set NEXT_PUBLIC_API_URL to the Go server address if needed.
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";
