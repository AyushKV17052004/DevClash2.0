/** Backend base URL — set VITE_API_URL in .env for production */
const rawUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
export const API_BASE = rawUrl.endsWith("/") ? rawUrl.slice(0, -1) : rawUrl;
