// 배포가 끝날 때마다 sitemap.xml의 주소를 네이버(서치어드바이저)와 IndexNow(빙 등)에 수집 요청한다
const SITE = "https://nemojari.com";
const KEY = "e85f38032bbd38721dcb075d6e46f6a8";
const ENDPOINTS = ["https://searchadvisor.naver.com/indexnow", "https://api.indexnow.org/indexnow"];

export const handler = async (event) => {
  const deploy = (JSON.parse(event.body || "{}").payload) || {};
  if (deploy.context && deploy.context !== "production") return { statusCode: 200, body: "skip: " + deploy.context };
  const xml = await (await fetch(SITE + "/sitemap.xml")).text();
  const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  const body = JSON.stringify({ host: "nemojari.com", key: KEY, keyLocation: SITE + "/" + KEY + ".txt", urlList });
  const out = await Promise.all(ENDPOINTS.map(async (u) => {
    try {
      const r = await fetch(u, { method: "POST", headers: { "Content-Type": "application/json; charset=utf-8" }, body });
      return u + " " + r.status;
    } catch (e) {
      return u + " error " + e.message;
    }
  }));
  console.log("IndexNow", urlList.length, "urls:", out.join(", "));
  return { statusCode: 200, body: out.join("\n") };
};
