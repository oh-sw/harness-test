# Programmer 기술 스택

> 이 프로젝트에서 programmer 가 사용할 수 있는 언어/프레임워크 정의.

## 허용 스택
- **HTML** — 마크업
- **CSS** — 스타일링 (vanilla. 전처리기 금지)
- **JavaScript** — 클라이언트 로직 (vanilla ES modules)

실행 환경은 **웹 브라우저** 이다. 별도의 빌드 도구 없이 브라우저가 바로 열어 동작하는 형태를 기본으로 한다.

## 금지 사항
- TypeScript, JSX, SCSS/LESS 등 트랜스파일이 필요한 언어 금지.
- React, Vue, Svelte 등 프론트엔드 프레임워크 금지.
- Node.js 런타임 의존 코드 금지 (브라우저에서 직접 실행 가능해야 함).
- 번들러(webpack, vite, rollup 등) 도입 금지.
- npm 패키지 의존성 추가 금지. 필요한 경우 CDN `<script>` 로드를 검토하되, 먼저 보고한다.

## 코드 스타일
- JavaScript: ES2020+ 문법 사용, `const`/`let` 만 사용 (`var` 금지).
- 모듈 시스템: `<script type="module">` 기반 ES modules.
- CSS: BEM 또는 명확한 클래스 네이밍. 인라인 스타일 지양.
- HTML: 시맨틱 태그 우선 (`<header>`, `<main>`, `<section>` 등).

## 파일 배치 기본값
- `index.html` — 엔트리
- `styles/` — CSS 파일
- `scripts/` — JS 파일

plan.md 에 다른 구조가 명시되면 그것을 우선한다.
