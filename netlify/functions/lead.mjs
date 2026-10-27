// 번호 남기기(전화 요청) 저장. 사장님 통계 화면에서 목록으로 보고, 3개월 지난 요청은 통계 화면을 열 때 지운다
import { getStore } from "@netlify/blobs";

const ok = (status = 200, o = { ok: true }) => Response.json(o, { status, headers: { "cache-control": "no-store" } });
const clip = (s, n) => String(s || "").replace(/[<>\u0000-\u001f]/g, "").trim().slice(0, n);

export default async (req) => {
  if (req.method !== "POST") return ok(405, { error: "method" });
  let b = {};
  try { b = await req.json(); } catch { return ok(400, { error: "body" }); }
  if (b.hp) return ok(); // 스팸 봇
  const tel = String(b.tel || "").replace(/\D/g, "");
  if (!/^0\d{8,10}$/.test(tel)) return ok(400, { error: "tel" });
  const now = Date.now();
  const day = new Date(now + 9 * 3600e3).toISOString().slice(0, 10);
  const leads = getStore({ name: "leads", consistency: "strong" });
  const cnt = (await leads.get("count-" + day, { type: "json" })) || { n: 0, tels: [] };
  if (cnt.tels.includes(tel)) return ok(); // 같은 날 같은 번호는 한 번만
  if (cnt.n >= 50) return ok(429, { error: "busy" });
  cnt.n++; cnt.tels.push(tel);
  await leads.setJSON("count-" + day, cnt);
  const lead = { at: now, tel, work: clip(b.work, 20), area: clip(b.area, 60), when: clip(b.when, 20), page: clip(b.page, 120) };
  await leads.setJSON("lead-" + now + "-" + Math.random().toString(36).slice(2, 6), lead);

  // 통계에도 '연락'으로 센다
  const v = String(b.v || "").replace(/[^a-z0-9]/gi, "").slice(0, 16) || "x";
  const p = /^\/[\w\-\/]*$/.test(lead.page) ? lead.page : "/기타";
  const store = getStore({ name: "stats2", consistency: "strong" });
  const d = (await store.get(day, { type: "json" })) || {};
  for (const k of ["vis", "pv", "pc", "c"]) d[k] = d[k] || {};
  d.c.lead = (d.c.lead || 0) + 1;
  d.pc[p] = (d.pc[p] || 0) + 1;
  if (d.vis[v]) { d.vis[v].c++; d.vis[v].t = d.vis[v].t || {}; d.vis[v].t.lead = (d.vis[v].t.lead || 0) + 1; }
  await store.setJSON(day, d);
  return ok();
};

export const config = { path: "/api/lead" };
