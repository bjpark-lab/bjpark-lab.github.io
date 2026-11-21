# SSIT · MORE 전술판 공통 엔진

두 팀 메인 전술판은 다음 파일을 공통으로 사용합니다.

- `basketball/shared/playbook.css`: 코트/목록/단계/모바일 레이아웃
- `basketball/shared/playbook.js`: 동일한 코트 SVG, 선수/볼/화살표, 단계 이동, 자동 재생, 좌우 반전, 즐겨찾기, 공유
- `basketball/ssit/plays.js`: SSIT 전술 15개
- `basketball/more/plays.js`: MORE 전술 22개
- `basketball/{ssit,more}/index.html`: 팀별 제목·분류·원본 참조만 다르게 설정

## 규칙
1. 모든 전술은 하프코트(공격 골대 위쪽)와 동일한 선수 번호 스타일을 사용합니다.
2. 이동은 파란 실선, 패스는 빨간 점선, 슛은 노란 점선, 스크린은 보라색으로 표시합니다.
3. 각 전술은 `steps` 배열에 `label`, `detail`, `pos`(1~5번 배열), `ball`을 정의합니다.
4. 특정 단계에 `arrows`가 있으면 원본 도면의 화살표를 그대로 표현하고, 그렇지 않으면 직전 단계 변화에서 동선을 그립니다.
5. 서로 다른 마무리는 `branch`와 `branchFrom`으로 구분합니다. 자동 재생은 분기 전에 멈춥니다.
6. SSIT 개별 상세 HTML 원본은 `basketball/ssit/original/`에 보존하고, 기존 개별 전술 주소는 공통 전술판으로 연결합니다.
7. 원본이 이미지·영상만인 MORE의 네 전술은 동선을 추정하지 않고 출처 링크만 제공합니다.

## 갱신 방법
전술 추가/수정: 각 팀 `plays.js`만 수정합니다. 화면/조작법 수정: `shared/`만 수정합니다.
예전 MORE CSS·JS 사본은 더 이상 사용하지 않습니다.
