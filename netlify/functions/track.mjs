// 방문·문의 버튼 클릭을 날짜별 합계로만 저장한다 (개인정보·쿠키 없음)
import { getStore } from "@netlify/blobs";

const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|yeti|daum|facebookexternalhit|kakaotalk-scrap|python|curl|wget/i;
const CLICKS = ["sms", "tel", "talk", "copy"];

function source(r) {
  if (!r) return "직접 방문";
  try {
    const h = new URL(r).hostname;
    if (h.endsWith("nemojari.com")) return "사이트 안 이동";
    if (h.includes("naver")) return "네이버";
    if (h.includes("google")) return "구글";
    if (h.includes("daum") || h.includes("kakao")) return "다음·카카오";
    if (/instagram|facebook|band|youtube/.test(h)) return "SNS";
    return h.slice(0, 60);
  } catch {
    return "기타";
  }
}

export default async (req) => {
  const ua = req.headers.get("user-agent") || "";
  if (BOT.test(ua)) return new Response(null, { status: 204 });
  const q = new URL(req.url).searchParams;
  const t = q.get("t") || "view";
  let p = (q.get("p") || "/").slice(0, 120);
  if (!/^\/[\w\-\/]*$/.test(p)) p = "/기타";
  const day = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10); // 한국 날짜
  const store = getStore({ name: "stats", consistency: "strong" });
  const d = (await store.get(day, { type: "json" })) || {};
  for (const k of ["v", "c", "r", "m", "cp"]) d[k] = d[k] || {};
  const inc = (o, k) => (o[k] = (o[k] || 0) + 1);
  if (t === "view") {
    inc(d.v, p);
    inc(d.r, source(q.get("r") || ""));
    inc(d.m, /Mobi|Android|iPhone|iPad/i.test(ua) ? "휴대폰" : "PC");
  } else if (CLICKS.includes(t)) {
    inc(d.c, t);
    inc(d.cp, p);
  } else {
    return new Response(null, { status: 204 });
  }
  await store.setJSON(day, d);
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
};

export const config = { path: "/api/t" };
