// 네이버 앱 표시 (번호 남기기·가족에게 보내기는 2026-11-06 사장님 요청으로 뺌)
(function () {
  // 네이버 앱 브라우저는 오른쪽 아래에 자체 '맨 위로' 버튼이 떠서 하단 바 끝 버튼을 가린다
  if (/NAVER\(inapp/.test(navigator.userAgent)) document.documentElement.classList.add("nv-app");
})();
