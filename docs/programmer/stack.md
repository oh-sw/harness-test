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

## 외부 의존성 추가 정책
외부 라이브러리는 **꼭 필요할 때 추가할 수 있다.** 단, 아래 규칙을 지킨다.

### 로딩 방식
- 브라우저 직접 실행 전제이므로, 의존성은 **CDN 기반 ESM import** 로만 로드한다.
  - 예: `import { x } from "https://esm.sh/some-lib@1.2.3"`
  - 또는 `<script type="module" src="https://cdn.jsdelivr.net/...">` 형태.
- `npm install` 로 `node_modules/` 를 만드는 방식은 사용하지 않는다 (번들러 금지와 연동).

### 추가 기준 (모두 충족해야 함)
1. 해당 기능을 vanilla 로 구현하면 명백히 과도한 노력/위험이 드는 경우.
2. 라이브러리가 활발히 유지되고 신뢰할 수 있는 출처인 경우.
3. 버전을 **정확히 고정**(pin)할 수 있는 경우.

### 절차 (중요)
새 외부 의존성을 추가하기로 결정하면, 코드 작성 전에 **반드시 호출자(오케스트레이터)에게 먼저 보고**한다. 보고 항목:
- 라이브러리 이름, 버전, CDN URL
- 추가가 필요한 이유 (vanilla 로 안 되는 이유)
- 대체 검토: 왜 다른 옵션 대신 이것을 선택했는가
- 라이선스

호출자는 이 정보를 사용자에게 에스컬레이션한다. 승인 전까지는 해당 의존성을 사용하는 코드를 작성하지 않는다.

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
