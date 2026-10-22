// 방문·연락 버튼을 날짜별로 모은다. 방문자는 기기에 저장한 무작위 번호로만 구분한다 (이름·연락처 없음)
import { getStore } from "@netlify/blobs";

const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|yeti|daum|facebookexternalhit|kakaotalk-scrap|python|curl|wget/i;
const CONTACT = { tel: 1, sms: 1, talk: 1 };

function host(r) {
  try { return new URL(r).hostname; } catch { return ""; }
}
function source(r, src) {
  if (src) return /naver/i.test(src) ? "네이버 광고" : /google/i.test(src) ? "구글 광고" : "광고 · " + src.slice(0, 30);
  const h = host(r);
  if (!h || h.endsWith("nemojari.com")) return "직접 방문";
  if (h.includes("naver")) return h.includes("blog") ? "네이버 블로그" : h.includes("map") || h.includes("place") ? "네이버 지도" : "네이버 검색";
  if (h.includes("google")) return "구글 검색";
  if (h.includes("daum")) return "다음 검색";
  if (h.includes("kakao")) return "카카오";
  if (/instagram|facebook|band|youtube|threads/.test(h)) return "SNS";
  return h.replace(/^www\./, "").slice(0, 40);
}
function keyword(r, k) {
  if (k) return k.slice(0, 60);
  try {
    const q = new URL(r).searchParams;
    return (q.get("query") || q.get("q") || q.get("wd") || "").slice(0, 60);
  } catch { return ""; }
}

export default async (req) => {
  const ua = req.headers.get("user-agent") || "";
  if (BOT.test(ua)) return new Response(null, { status: 204 });
  const q = new URL(req.url).searchParams;
  const t = q.get("t") || "view";
  if (t !== "view" && t !== "copy" && !CONTACT[t]) return new Response(null, { status: 204 });
  const v = (q.get("v") || "x").replace(/[^a-z0-9]/gi, "").slice(0, 16) || "x";
  let p = (q.get("p") || "/").slice(0, 120);
  if (!/^\/[\w\-\/]*$/.test(p)) p = "/기타";
  const day = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10); // 한국 날짜
  const store = getStore({ name: "stats2", consistency: "strong" });
  const d = (await store.get(day, { type: "json" })) || {};
  for (const k of ["vis", "pv", "pc", "c"]) d[k] = d[k] || {};
  const inc = (o, k) => (o[k] = (o[k] || 0) + 1);
  if (t === "view") {
    inc(d.pv, p);
    if (!d.vis[v]) {
      const r = q.get("r") || "";
      d.vis[v] = { s: source(r, q.get("src") || ""), k: keyword(r, q.get("k") || ""), d: /Mobi|Android|iPhone|iPad/i.test(ua) ? "m" : "p", c: 0 };
    }
  } else if (t === "copy") {
    inc(d.c, "copy");
  } else {
    inc(d.c, t);
    inc(d.pc, p);
    if (!d.vis[v]) d.vis[v] = { s: "직접 방문", k: "", d: /Mobi|Android|iPhone|iPad/i.test(ua) ? "m" : "p", c: 0 };
    d.vis[v].c++;
  }
  await store.setJSON(day, d);
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
};

export const config = { path: "/api/t" };
