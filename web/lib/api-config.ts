// API base URL for the Go backend.
// In production, set NEXT_PUBLIC_API_URL to the Go server address.
// In development, defaults to empty string for same-origin requests.
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";
