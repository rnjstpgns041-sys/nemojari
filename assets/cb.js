// 네이버 앱 표시 + '가족에게 보내기' 버튼 (번호 남기기 기능은 2026-11-06 사장님 요청으로 뺌)
(function () {
  // 네이버 앱 브라우저는 오른쪽 아래에 자체 '맨 위로' 버튼이 떠서 하단 바 끝 버튼을 가린다
  if (/NAVER\(inapp/.test(navigator.userAgent)) document.documentElement.classList.add("nv-app");
  var TEL = "010-2193-8204";
  // 아직 결정 못 한 사람(가족과 상의 등)이 페이지를 카톡 등으로 보내두고 나중에 다시 연락하게
  function addShare() {
    var spots = document.querySelectorAll(".cta-band, .callband .in");
    for (var i = 0; i < spots.length; i++) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "cb-share";
      b.textContent = "가족에게 보내기 · 나중에 다시 보기";
      spots[i].appendChild(b);
    }
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest(".cb-share");
    if (!b) return;
    var h = document.querySelector("h1"), url = location.origin + location.pathname;
    var text = "네모자리 " + (h ? h.textContent.replace(/\s+/g, " ").trim() : "") + " (전화 " + TEL + ")";
    if (navigator.share) { navigator.share({ title: document.title, text: text, url: url }).catch(function () {}); return; }
    var done2 = function () { b.textContent = "링크를 복사했어요. 카톡에 붙여 보내세요"; };
    try { navigator.clipboard.writeText(text + "\n" + url).then(done2, function () { prompt("이 주소를 복사해 보내세요", url); }); }
    catch (x) { prompt("이 주소를 복사해 보내세요", url); }
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", addShare); else addShare();
})();
