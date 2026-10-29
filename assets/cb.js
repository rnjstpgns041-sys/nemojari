// 번호 남기기(전화 요청): 전화가 부담되는 방문자가 번호를 남기면 사장님이 다시 전화한다
(function () {
  // 네이버 앱 브라우저는 오른쪽 아래에 자체 '맨 위로' 버튼이 떠서 하단 바 끝 버튼을 가린다
  if (/NAVER\(inapp/.test(navigator.userAgent)) document.documentElement.classList.add("nv-app");
  var TEL = "010-2193-8204";
  var WORKS = [["fridge", "냉장고장"], ["sink|dishwasher", "하부장·식세기"], ["storage|closet", "신발장·붙박이장"], ["pet-door", "펫도어·문"], ["", "기타"]];
  var WHEN = ["아무 때나", "오늘 저녁", "내일 이후"];
  var dlg, form, done;
  function guessWork() {
    var p = location.pathname;
    for (var i = 0; i < WORKS.length - 1; i++) if (new RegExp(WORKS[i][0]).test(p)) return WORKS[i][1];
    return "";
  }
  function radios(name, list, pick) {
    return list.map(function (x) {
      return '<label class="cb-chip"><input type="radio" name="' + name + '" value="' + x + '"' + (x === pick ? " checked" : "") + "><span>" + x + "</span></label>";
    }).join("");
  }
  function build() {
    dlg = document.createElement("dialog");
    dlg.className = "cb";
    dlg.setAttribute("aria-labelledby", "cbH");
    dlg.innerHTML =
      '<button type="button" class="cb-x" aria-label="닫기">×</button>' +
      '<form novalidate><h2 id="cbH">번호 남기면 전화드려요</h2>' +
      '<p class="cb-sub">전화 걸기 부담되시면 번호만 남겨주세요. 작업 끝나는 대로 사장님이 직접 전화드려요.</p>' +
      '<label class="cb-l" for="cbTel">휴대폰 번호</label><input id="cbTel" name="tel" type="tel" inputmode="tel" autocomplete="tel" placeholder="010-0000-0000" required>' +
      '<p class="cb-l">어떤 작업이세요?</p><div class="cb-chips">' + radios("work", WORKS.map(function (w) { return w[1]; }), guessWork()) + "</div>" +
      '<label class="cb-l" for="cbArea">사는 동네 <small>(선택)</small></label><input id="cbArea" name="area" autocomplete="address-level2" placeholder="예) 당진 송악읍">' +
      '<p class="cb-l">통화 편한 때</p><div class="cb-chips">' + radios("when", WHEN, WHEN[0]) + "</div>" +
      '<input name="bot-field" tabindex="-1" autocomplete="off" class="cb-hp" aria-hidden="true">' +
      '<label class="cb-ok"><input type="checkbox" name="agree" checked> 상담 전화를 위해 번호·동네를 받아요. 상담에만 쓰고 3개월 뒤 지워요. (동의)</label>' +
      '<p class="cb-err" role="alert"></p>' +
      '<button class="btn btn-primary cb-go" type="submit">전화 요청 보내기</button>' +
      '<p class="cb-or">바로 통화하고 싶으시면 <a href="tel:' + TEL.replace(/-/g, "") + '">' + TEL + "</a></p></form>" +
      '<div class="cb-done" hidden><h2>접수됐어요</h2><p class="cb-sub"><b class="cb-num"></b> 번호로 작업 끝나는 대로 전화드려요. ' + TEL + ' 번호로 걸려 가니 꼭 받아주세요.</p><p class="cb-sub">사진이 있으면 문자로 같이 보내주시면 더 정확하게 말씀드릴 수 있어요.</p><a class="btn btn-soft" href="sms:' + TEL.replace(/-/g, "") + '">사진 문자로 보내기</a> <button type="button" class="btn btn-soft cb-close">닫기</button></div>';
    document.body.appendChild(dlg);
    form = dlg.querySelector("form");
    done = dlg.querySelector(".cb-done");
    dlg.querySelector(".cb-x").onclick = close;
    dlg.querySelector(".cb-close").onclick = close;
    dlg.addEventListener("click", function (e) { if (e.target === dlg) close(); });
    form.addEventListener("submit", submit);
  }
  function open(work) {
    if (!dlg) build();
    if (dlg.open) return;
    if (work) { var r = form.querySelector('input[name="work"][value="' + work + '"]'); if (r) r.checked = true; }
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
    setTimeout(function () { var t = dlg.querySelector("#cbTel"); if (t && !form.hidden) t.focus(); }, 60);
    beacon("cbopen");
  }
  function close() { if (dlg.close) dlg.close(); else dlg.removeAttribute("open"); }
  function val(n) { var x = form.querySelector('[name="' + n + '"]:checked') || form.querySelector('[name="' + n + '"]'); return x ? x.value.trim() : ""; }
  function beacon(t) {
    try {
      if (!/nemojari\.com$/.test(location.hostname) || localStorage.getItem("nj-owner")) return;
      var v = localStorage.getItem("nj-vid") || "x";
      navigator.sendBeacon("/api/t?t=" + t + "&v=" + v + "&p=" + encodeURIComponent(location.pathname));
    } catch (e) {}
  }
  function submit(e) {
    e.preventDefault();
    var err = form.querySelector(".cb-err"), btn = form.querySelector(".cb-go");
    var tel = val("tel").replace(/[^0-9]/g, "");
    if (!/^0\d{8,10}$/.test(tel)) { err.textContent = "전화번호를 다시 확인해 주세요."; form.querySelector("#cbTel").focus(); return; }
    if (!form.querySelector('[name="agree"]').checked) { err.textContent = "번호를 받으려면 동의가 필요해요."; return; }
    err.textContent = "";
    btn.disabled = true; btn.textContent = "보내는 중…";
    var data = { tel: tel, work: val("work"), area: val("area").slice(0, 60), when: val("when"), page: location.pathname, hp: val("bot-field") };
    try { data.v = localStorage.getItem("nj-vid") || ""; } catch (x) {}
    // 사장님 메일 알림용(넷리파이 폼). 실패해도 아래 저장은 따로 된다
    var fd = new URLSearchParams({ "form-name": "callback", tel: tel, work: data.work, area: data.area, when: data.when, page: data.page, "bot-field": data.hp });
    fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: fd.toString() }).catch(function () {});
    fetch("/api/lead", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
      .then(function (r) { if (!r.ok) throw 0; ok(tel); })
      .catch(function () {
        btn.disabled = false; btn.textContent = "전화 요청 보내기";
        err.innerHTML = '보내지 못했어요. 번거로우시겠지만 <a href="sms:' + TEL.replace(/-/g, "") + '">문자</a>나 <a href="tel:' + TEL.replace(/-/g, "") + '">전화</a>로 연락 주세요.';
      });
  }
  function ok(tel) {
    form.hidden = true; done.hidden = false;
    done.querySelector(".cb-num").textContent = tel.replace(/^(\d{3})(\d{3,4})(\d{4})$/, "$1-$2-$3");
    try { sessionStorage.setItem("nj-cb", "1"); } catch (x) {}
    var n = document.querySelector(".cb-nudge"); if (n) n.remove();
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('[data-cb],a[href="#cb"]');
    if (!a) return;
    e.preventDefault();
    open(a.getAttribute("data-cb"));
  });
  // 휴대폰에서 한참 둘러보고도 연락 안 한 사람에게 한 번만 살짝 권한다
  function nudge() {
    try { if (sessionStorage.getItem("nj-cb") || sessionStorage.getItem("nj-nudge")) return; sessionStorage.setItem("nj-nudge", "1"); } catch (x) { return; }
    if (!document.querySelector(".mcta") || innerWidth > 720 || (dlg && dlg.open)) return;
    var b = document.createElement("div");
    b.className = "cb-nudge";
    b.innerHTML = '<span>전화가 부담되시면 <b>번호만 남겨주세요</b></span><button type="button" data-cb>남기기</button><button type="button" class="cb-nx" aria-label="닫기">×</button>';
    document.body.appendChild(b);
    b.querySelector(".cb-nx").onclick = function () { b.remove(); };
  }
  var timer = setTimeout(nudge, 45000);
  addEventListener("scroll", function onS() {
    if (scrollY > (document.documentElement.scrollHeight - innerHeight) * 0.5) { removeEventListener("scroll", onS); clearTimeout(timer); setTimeout(nudge, 1500); }
  }, { passive: true });
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="tel:"],a[href^="sms:"],a[href*="talk.naver"]');
    if (a) { clearTimeout(timer); try { sessionStorage.setItem("nj-cb", "1"); } catch (x) {} }
  }, true);
})();
