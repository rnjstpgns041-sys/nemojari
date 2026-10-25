// 사장님용 통계: 비밀번호(6자리) 확인 후 기간 합계를 돌려준다
import { getStore } from "@netlify/blobs";
import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

const json = (o, status = 200) => Response.json(o, { status, headers: { "cache-control": "no-store" } });
const hash = (pin, salt) => pbkdf2Sync(pin, salt, 120000, 32, "sha256").toString("hex");
const kst = (ms) => new Date(ms + 9 * 3600e3).toISOString().slice(0, 10);

export default async (req) => {
  const auth = getStore({ name: "auth", consistency: "strong" });
  const saved = await auth.get("pin", { type: "json" });
  if (req.method === "GET") return json({ set: !!saved });
  let body = {};
  try { body = await req.json(); } catch {}
  const pin = String(body.pin || "");
  if (!/^\d{6}$/.test(pin)) return json({ error: "format" }, 400);

  if (body.setup) {
    if (saved) return json({ error: "already" }, 409);
    const salt = randomBytes(16).toString("hex");
    await auth.setJSON("pin", { salt, hash: hash(pin, salt) });
    return json({ ok: true });
  }
  if (!saved) return json({ error: "notset" }, 409);

  const fail = (await auth.get("fail", { type: "json" })) || { n: 0, until: 0 };
  if (fail.until > Date.now()) return json({ error: "locked", wait: Math.ceil((fail.until - Date.now()) / 60000) }, 429);
  const ok = timingSafeEqual(Buffer.from(hash(pin, saved.salt), "hex"), Buffer.from(saved.hash, "hex"));
  if (!ok) {
    fail.n++;
    if (fail.n >= 5) { fail.n = 0; fail.until = Date.now() + 15 * 60000; }
    await auth.setJSON("fail", fail);
    return json({ error: "pin" }, 401);
  }
  if (fail.n) await auth.setJSON("fail", { n: 0, until: 0 });

  const days = [1, 7, 30, 90].includes(+body.days) ? +body.days : 7;
  const store = getStore({ name: "stats2", consistency: "strong" });
  const now = Date.now();
  // 이번 기간 + 바로 앞 같은 길이 기간(비교용)을 한 번에 읽는다
  const all = await Promise.all(Array.from({ length: days * 2 }, (_, i) => {
    const day = kst(now - (days * 2 - 1 - i) * 86400e3);
    return store.get(day, { type: "json" }).then((d) => ({ day, d: d || {} }), () => ({ day, d: {} }));
  }));
  const prev = all.slice(0, days), list = all.slice(days);
  const cur = summarize(list);
  const p = summarize(prev).totals;
  return json(Object.assign({ days, today: list[list.length - 1].day, prev: p }, cur));
};

const by = (k) => (a, b) => b[k] - a[k];
const bump = (o, key, base, f) => { const x = (o[key] = o[key] || Object.assign({}, base)); f(x); };

function summarize(list) {
  const T = { visitors: 0, unique: 0, returning: 0, views: 0, phone: 0, sms: 0, talk: 0, copy: 0, contact_visitors: 0 };
  const src = {}, kw = {}, pages = {}, cpages = {}, dev = { mobile: 0, pc: 0 };
  const geo = {}, br = {}, osm = {}, land = {}, seen = {};
  const hours = Array.from({ length: 7 }, () => Array(24).fill(0));
  const depth = { d1: 0, d2: 0, d3: 0, d5: 0 };
  const funnel = { tracked: 0, multi: 0, contact: 0 };
  const week = Array.from({ length: 7 }, () => ({ days: 0, visitors: 0, contacts: 0 }));
  let kwSearch = 0, kwKnown = 0;
  const daily = list.map(({ day, d }) => {
    const vis = Object.entries(d.vis || {}), c = d.c || {};
    const wd = new Date(day + "T00:00:00Z").getUTCDay();
    const views = Object.values(d.pv || {}).reduce((a, b) => a + b, 0);
    let cv = 0;
    for (const [id, x] of vis) {
      seen[id] = (seen[id] || 0) + 1;
      bump(src, x.s, { name: x.s, visitors: 0, contacts: 0 }, (s) => { s.visitors++; if (x.c) s.contacts++; });
      if (x.c) { T.contact_visitors++; cv++; }
      x.d === "m" ? dev.mobile++ : dev.pc++;
      if (/검색|광고/.test(x.s)) { kwSearch++; if (x.k) kwKnown++; }
      if (x.k) bump(kw, x.k + "|" + x.s, { kw: x.k, src: x.s, visitors: 0, contacts: 0 }, (k) => { k.visitors++; if (x.c) k.contacts++; });
      // 아래는 2026-10-25부터 새로 모으는 항목 (그 전 방문에는 없음)
      if (x.g) bump(geo, x.g, { name: x.g, visitors: 0, contacts: 0 }, (g) => { g.visitors++; if (x.c) g.contacts++; });
      if (x.b) bump(br, x.b, { name: x.b, visitors: 0 }, (b) => b.visitors++);
      if (x.o) bump(osm, x.o, { name: x.o, visitors: 0 }, (o) => o.visitors++);
      if (x.l) bump(land, x.l, { path: x.l, visitors: 0, contacts: 0 }, (l) => { l.visitors++; if (x.c) l.contacts++; });
      if (typeof x.h === "number") hours[wd][x.h]++;
      if (x.n) {
        funnel.tracked++;
        if (x.n > 1) funnel.multi++;
        if (x.c) funnel.contact++;
        depth[x.n >= 5 ? "d5" : x.n >= 3 ? "d3" : x.n === 2 ? "d2" : "d1"]++;
      }
    }
    for (const [p, n] of Object.entries(d.pv || {})) bump(pages, p, { path: p, views: 0, contacts: 0 }, (x) => (x.views += n));
    for (const [p, n] of Object.entries(d.pc || {})) {
      bump(pages, p, { path: p, views: 0, contacts: 0 }, (x) => (x.contacts += n));
      bump(cpages, p, { path: p, contacts: 0 }, (x) => (x.contacts += n));
    }
    const row = { day, visitors: vis.length, views, phone: c.tel || 0, sms: c.sms || 0, talk: c.talk || 0, copy: c.copy || 0, contact_visitors: cv };
    week[wd].days++; week[wd].visitors += row.visitors; week[wd].contacts += row.phone + row.sms + row.talk;
    T.visitors += row.visitors; T.views += views; T.phone += row.phone; T.sms += row.sms; T.talk += row.talk; T.copy += row.copy;
    return row;
  });
  const ids = Object.values(seen);
  T.unique = ids.length;
  T.returning = ids.filter((n) => n > 1).length;
  const td = daily[daily.length - 1];
  return {
    totals: T,
    today_totals: { visitors: td.visitors, phone: td.phone, sms: td.sms, talk: td.talk },
    daily, devices: dev, kw_search: kwSearch, kw_known: kwKnown,
    sources: Object.values(src).sort(by("visitors")).slice(0, 15),
    keywords: Object.values(kw).sort(by("visitors")).slice(0, 30),
    pages: Object.values(pages).sort(by("views")),
    contact_pages: Object.values(cpages).sort(by("contacts")).slice(0, 15),
    regions: Object.values(geo).sort(by("visitors")).slice(0, 15),
    browsers: Object.values(br).sort(by("visitors")),
    os: Object.values(osm).sort(by("visitors")),
    landings: Object.values(land).sort(by("visitors")).slice(0, 15),
    hours, depth, funnel, week,
  };
}

export const config = { path: "/api/stats" };
