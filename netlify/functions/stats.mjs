// 최근 N일 통계를 한 번에 돌려준다
import { getStore } from "@netlify/blobs";

export default async (req) => {
  const n = Math.min(Math.max(parseInt(new URL(req.url).searchParams.get("days") || "30", 10) || 30, 1), 90);
  const store = getStore({ name: "stats", consistency: "strong" });
  const now = Date.now() + 9 * 3600e3;
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const day = new Date(now - i * 86400e3).toISOString().slice(0, 10);
    days.push({ day, ...((await store.get(day, { type: "json" })) || {}) });
  }
  return Response.json({ days }, { headers: { "cache-control": "no-store" } });
};

export const config = { path: "/api/stats" };
