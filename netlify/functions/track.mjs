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
// 접속 지역(통신사 IP 기준이라 대략적), 브라우저·앱, 기기 종류
const PROV = [[/seoul/i, "서울"], [/incheon/i, "인천"], [/gyeonggi/i, "경기"], [/chungcheongnam|chungnam/i, "충남"], [/chungcheongbuk|chungbuk/i, "충북"], [/sejong/i, "세종"], [/daejeon/i, "대전"], [/gangwon/i, "강원"], [/jeollabuk|jeonbuk/i, "전북"], [/jeollanam|jeonnam/i, "전남"], [/gwangju/i, "광주"], [/gyeongsangbuk|gyeongbuk/i, "경북"], [/gyeongsangnam|gyeongnam/i, "경남"], [/daegu/i, "대구"], [/busan/i, "부산"], [/ulsan/i, "울산"], [/jeju/i, "제주"]];
const CITY = { cheonan: "천안", asan: "아산", dangjin: "당진", seosan: "서산", hongseong: "홍성", yesan: "예산", boryeong: "보령", gongju: "공주", nonsan: "논산", taean: "태안", seocheon: "서천", hwaseong: "화성", suwon: "수원", yongin: "용인", pyeongtaek: "평택", osan: "오산", anseong: "안성", seongnam: "성남", goyang: "고양", bucheon: "부천", ansan: "안산", anyang: "안양", siheung: "시흥", gimpo: "김포", hanam: "하남", namyangju: "남양주", uijeongbu: "의정부", paju: "파주", gwangmyeong: "광명", gunpo: "군포", icheon: "이천", cheongju: "청주", chungju: "충주", jecheon: "제천", sejong: "세종", daejeon: "대전", seoul: "서울", incheon: "인천" };
function region(geo) {
  if (!geo || !geo.country) return "";
  if (geo.country.code && geo.country.code !== "KR") return "해외";
  const sub = (geo.subdivision && geo.subdivision.name) || "";
  const prov = (PROV.find(([re]) => re.test(sub)) || [])[1] || "";
  const ck = (geo.city || "").toLowerCase().replace(/[^a-z]/g, "").replace(/si$/, "");
  const city = CITY[ck] || "";
  if (!prov && !city) return "지역 모름";
  return city && city !== prov ? (prov ? prov + " " + city : city) : prov;
}
function browser(ua) {
  if (/NAVER\(inapp|NAVER/.test(ua)) return "네이버 앱";
  if (/KAKAOTALK/i.test(ua)) return "카카오톡";
  if (/Instagram|FBAN|FBAV/.test(ua)) return "인스타·페북";
  if (/DaumApps/i.test(ua)) return "다음 앱";
  if (/SamsungBrowser/.test(ua)) return "삼성 인터넷";
  if (/Whale/.test(ua)) return "웨일";
  if (/Edg\//.test(ua)) return "엣지";
  if (/CriOS|Chrome/.test(ua)) return "크롬";
  if (/Safari/.test(ua)) return "사파리";
  return "기타";
}
function os(ua) {
  if (/iPhone|iPad|iPod/.test(ua)) return "아이폰";
  if (/Android/.test(ua)) return "안드로이드";
  if (/Windows/.test(ua)) return "윈도우";
  if (/Macintosh/.test(ua)) return "맥";
  return "기타";
}
function newVisitor(ua, ctx, extra) {
  return Object.assign({ d: /Mobi|Android|iPhone|iPad/i.test(ua) ? "m" : "p", c: 0, n: 0, h: new Date(Date.now() + 9 * 3600e3).getUTCHours(), g: region(ctx && ctx.geo), b: browser(ua), o: os(ua) }, extra);
}
function keyword(r, k) {
  if (k) return k.slice(0, 60);
  try {
    const q = new URL(r).searchParams;
    return (q.get("query") || q.get("q") || q.get("wd") || "").slice(0, 60);
  } catch { return ""; }
}

export default async (req, context) => {
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
      d.vis[v] = newVisitor(ua, context, { s: source(r, q.get("src") || ""), k: keyword(r, q.get("k") || ""), l: p });
    }
    d.vis[v].n = (d.vis[v].n || 0) + 1;
  } else if (t === "copy") {
    inc(d.c, "copy");
  } else {
    inc(d.c, t);
    inc(d.pc, p);
    if (!d.vis[v]) d.vis[v] = newVisitor(ua, context, { s: "직접 방문", k: "", l: p });
    d.vis[v].c++;
    d.vis[v].t = d.vis[v].t || {};
    inc(d.vis[v].t, t);
  }
  await store.setJSON(day, d);
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
};

export const config = { path: "/api/t" };
