# 네모자리 홈페이지

`index.html` 한 파일과 `img/` 사진 폴더로 된 정적 홈페이지예요. 이 저장소의 main 브랜치에 올라간 내용이 Netlify에 자동으로 반영돼요.

## 통계

- `/stats/` : 방문 수와 문의 버튼(문자·전화·톡톡·복사) 누른 횟수를 보는 페이지 (검색 제외).
- 각 페이지 하단 스크립트가 `/api/t` 로 날짜별 합계만 보낸다. 저장은 Netlify Blobs (`netlify/functions/track.mjs`, `stats.mjs`). 개인정보·쿠키 없음.
