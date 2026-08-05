# KT INDEX — 킬팀 팩션 색인

Kill Team 데이터를 **팩션 → 킬팀 → 요원**으로 훑어보는 정적 색인.

- **팩션 9 · 킬팀 48 · 요원 492 · 플로이 384 · 팀 전용 장비 192 · 용어 55**
- 표기 기준: 문구는 한글, **요원 이름과 무기는 한글(영어) 병기**
- 무기 특수 규칙과 본문의 `[대괄호]` 용어는 **마우스 오버 또는 클릭하면 뜻풀이가 펼쳐진다**
- **내 로스터** — 요원·장비·플로이를 담아 한 화면에서 본다(브라우저에만 저장)
- 런타임 네트워크 호출 **없음**. 받아둔 스냅샷만 읽는다.

## 여는 법

```
public/index.html 을 브라우저에서 그대로 열면 된다 (더블클릭, file:// 가능)
```

로컬 서버가 필요 없다. 페이지는 `fetch()` 대신 `data/kt-data.js` 를 `<script>` 로
읽어 `window.KTI` 에서 데이터를 꺼낸다. 서버로 띄우려면:

```bash
cd public && python3 -m http.server 8788   # → http://127.0.0.1:8788/index.html
```

## 화면

| 파일                         | 내용                                                         |
| ---------------------------- | ------------------------------------------------------------ |
| `public/index.html`          | 팩션 9개 그리드(소속 킬팀 색 스트립) + 킬팀 48개 즉시 검색   |
| `public/faction.html?f=IMP`  | 팩션 소속 킬팀 목록                                          |
| `public/team.html?t=IMP-AOD` | 요원 스탯·무기표, 능력, 플로이, 장비, 편성 가이드, 팩션 규칙 |
| `public/roster.html`         | 담아둔 요원·장비·플로이를 킬팀별로 모아 보기 |

검색은 한글명·영문명·팀 ID·아키타입·팩션명을 한 번에 훑는다
(예: `죽음의 천사`, `Angels of Death`, `IMP-AOD`, `Recon`).

## 배포

**배포 대상은 `public/` 디렉터리 하나뿐이다.** `data/`(JSON 정본)와 `tools/`(빌드
스크립트)는 올릴 필요가 없다. 빌드 과정도 없으므로 호스팅 쪽 빌드 명령은 비워 둔다.

| 항목                 | 값                                  |
| -------------------- | ----------------------------------- |
| 빌드 명령            | (없음)                              |
| 출력 · 발행 디렉터리 | `public`                            |
| 배포 용량            | 약 1.2MB (대부분 `data/kt-data.js`) |

### 무료 호스팅 선택지 — 도메인 없이 바로 쓸 수 있다

네 곳 모두 **무료 서브도메인을 함께 준다.** 개인 도메인을 따로 사지 않아도 된다.

| 서비스               | 받는 주소                          | 무료 한도                                    | `public/` 배포                          |
| -------------------- | ---------------------------------- | -------------------------------------------- | --------------------------------------- |
| **GitHub Pages**     | `<계정>.github.io/kill_team_index` | 저장소 1GB, 월 100GB(소프트)                 | `.github/workflows/pages.yml` 이 처리   |
| **Cloudflare Pages** | `<프로젝트>.pages.dev`             | 대역폭 **무제한**, 파일 20,000개(개당 25MiB) | 출력 디렉터리에 `public` 입력           |
| Netlify              | `<이름>.netlify.app`               | 월 100GB, 빌드 300분/월                      | `netlify.toml` 에 `publish = "public"`  |
| Vercel               | `<이름>.vercel.app`                | 월 100GB                                     | 출력 디렉터리 `public` · 상업적 이용 제한 |

**도메인이 없다면 GitHub Pages 가 가장 간단하다.** 저장소가 이미 GitHub 에 있고
워크플로도 넣어 두었으므로, 설정 한 번만 바꾸면 push 할 때마다 자동 배포된다.
저장소가 공개(public)여야 무료다.

단, `public/_headers` 는 Cloudflare Pages·Netlify 전용이라 GitHub Pages 에서는
무시된다(캐시 헤더가 기본값이 될 뿐 동작에는 지장 없다). 트래픽이 늘거나 캐시까지
챙기고 싶어지면 그때 Cloudflare Pages 로 옮기면 된다 — 같은 저장소를 연결하고
출력 디렉터리만 `public` 으로 지정하면 되고, 주소도 `.pages.dev` 로 무료다.

### 절차

**GitHub Pages (도메인 불필요)**

1. 저장소 → Settings → Pages → Source 를 **GitHub Actions** 로 변경
2. `git push` — `.github/workflows/pages.yml` 이 `public/` 만 배포한다
3. 주소: `https://<계정>.github.io/kill_team_index/`

**Cloudflare Pages (대안)**

```
Workers & Pages → Create → Pages → Connect to Git → kill_team_index
  Production branch:       main
  Build command:           (비움)
  Build output directory:  public
```

주소는 `<프로젝트>.pages.dev` 로 발급된다.

## 수동 업데이트

자동 갱신은 하지 않는다. 데이터는 아래 명령을 실행한 시점에 고정된 스냅샷이며,
기준 시각은 `data/meta.json` 의 `generatedAt` 에서 확인할 수 있다.

```bash
node tools/update.mjs            # 원본 재수집 + JSON 재빌드 + 변경분 리포트
node tools/update.mjs --rebuild  # 이미 받아둔 캐시로 JSON 만 다시 만듦
node tools/update.mjs --dry-run  # 무엇이 바뀌는지 확인만 (data/ 는 원상복구)
```

리포트 예시:

```
── 수량 변화 / Counts ──
  킬팀 / Kill Teams          48 →   49  +1
── 킬팀 목록 변화 / Kill team roster ──
  + XXX-YY  새 킬팀 / New Kill Team
```

갱신하면 `public/data/kt-data.js` 가 새로 쓰인다. 그대로 커밋해서 다시 배포하면 된다.

## 구조

```
kt-index/
├── .github/workflows/pages.yml   GitHub Pages 자동 배포
│
├── public/                   ← 배포 대상. 이 디렉터리만 올리면 된다
│   ├── index.html · faction.html · team.html · roster.html
│   ├── _headers              캐시 · 보안 헤더 (Cloudflare Pages · Netlify)
│   ├── assets/
│   │   ├── css/  tokens.css · base.css · components.css
│   │   └── js/   store.js · roster.js · page-*.js (index/faction/team/roster)
│   └── data/kt-data.js       페이지가 읽는 단일 번들 (window.KTI)
│
├── data/                     ← JSON 정본. 배포하지 않는다
│   ├── factions.json         팩션 + 킬팀 요약
│   ├── glossary.json         용어 뜻풀이 + 출처
│   ├── meta.json             빌드 시각 · 원본 · 집계
│   └── teams/<팀ID>.json     킬팀 48개 상세
│
└── tools/                    ← 빌드. 배포하지 않는다
    ├── source-files.mjs      원본 파일 목록과 경로 상수
    ├── fetch-source.mjs      원본 내려받기 → tools/.cache/
    ├── build-json.mjs        캐시 → JSON 정본 + 배포 번들
    └── update.mjs            위 둘을 묶은 수동 업데이트
```

JSON 은 사람이 읽고 다시 가공하기 위한 정본이고, `public/data/kt-data.js` 는 그것을
한 덩어리로 묶은 파생물이다. 둘 다 `build-json.mjs` 가 같은 소스에서 만든다.

## 데이터 스키마

`data/teams/<팀ID>.json`:

```jsonc
{
  "id": "IMP-AOD",
  "nameEn": "Angels of Death",
  "nameKo": "죽음의 천사",
  "archetype": "Security/Seek & Destroy",
  "color": "#4f82cc",
  "size": { "total": 6 },
  "faction": { "id": "IMP", "nameEn": "Imperium", "nameKo": "임페리움" },
  "ploys": [
    {
      "id": "…",
      "name": "…",
      "type": "strategy|firefight",
      "cp": 1,
      "textEn": "…",
      "textKo": "…",
    },
  ],
  "equipment": [{ "id": "…", "name": "…", "textEn": "…", "textKo": "…" }],
  "equipmentBonusKo": null,
  "operatives": [
    {
      "id": "IMP-AOD-CPT",
      "nameEn": "Space Marine Captain",
      "nameKo": "스페이스 마린 캡틴",
      "stats": { "move": "6\"", "apl": 3, "save": "3+", "wounds": 15 },
      "weapons": [
        {
          "name": "…",
          "type": "ranged|melee",
          "profiles": [
            {
              "name": "",
              "attacks": "4",
              "hit": "3+",
              "damage": "3/5",
              "rules": [],
            },
          ],
        },
      ],
      "weaponsKo": [
        {
          "name": "…",
          "type": "ranged|melee",
          "attacks": "4",
          "hit": "3+",
          "damage": "3/5",
          "rules": [],
        },
      ],
      "abilitiesKo": [{ "name": "…", "text": "…" }],
    },
  ],
  "selectionGuide": {
    "brief": "…",
    "blocks": [{ "type": "heading|rule", "text": "…" }],
  },
  "factionRule": { "brief": "…", "blocks": [] },
}
```

`data/glossary.json`:

```jsonc
{
  "credit": {
    "ko": "…",
    "en": "…",
    "note": { "ko": "…" },
    "short": { "ko": "…" },
  },
  "terms": [
    {
      "id": "Piercing X",
      "nameKo": "관통",
      "nameEn": "Piercing X",
      "kind": "weapon",
      "keys": ["관통", "Piercing"],
      "textKo": "…",
      "textEn": "…",
    },
  ],
}
```

`data/meta.json` 의 `generatedAt` 은 ISO 8601 UTC(`1970-01-01T00:00:00.000Z` 형식)다.
모든 데이터는 팀 ID(`IMP-AOD` 형식) 하나로 조인된다.

### 용어 확장이 동작하는 방식

`keys` 를 길이 내림차순으로 훑어 규칙 문자열에서 용어를 찾는다. 예를 들어 무기 규칙
`관통 1` 은 `keys: ["관통", "Piercing"]` 에 걸려 뜻풀이가 붙는다. 뜻풀이를 찾지
못한 규칙은 밑줄 없이 평범한 글자로 남는다. 팝오버는 무기표가 가로 스크롤 컨테이너
안에 있어 잘리므로, 뷰포트 기준(`position: fixed`)으로 좌표를 계산해 띄운다.

### 내 로스터가 동작하는 방식

킬팀 상세에서 요원을 담고(같은 요원을 여러 명 담을 수 있다), 팀 전용 장비와 플로이를
골라 둔다. 저장은 브라우저 `localStorage` 한 곳 — 키는 `kt-index:roster:v1` 이다.

```jsonc
{
  "version": 1,
  "teams": {
    "IMP-AOD": {
      "operatives": { "IMP-AOD-CPT": 2 }, // 같은 요원 중복 편성을 위해 개수 맵
      "equipment": ["IMP-AOD-CR"],
      "ploys": ["IMP-AOD-S-ADT"]
    }
  }
}
```

- 서버로 보내지 않는다. 기기·브라우저가 바뀌면 따라오지 않는다.
- 저장소를 못 쓰는 환경(사생활 보호 모드 등)에서는 메모리로 물러나고, 화면에
  "저장 실패 — 이 창에서만 유지됩니다" 를 띄운다. 조용히 삼키지 않는다.
- 인원은 편성 정원(`size.total`)과 비교해 초과를 표시한다. 다만 요원 목록 안의
  선택 제약("↘ 1 … 중 선택")은 원본이 자연어라 **자동 검증하지 않는다.**
- 원본이 갱신돼 사라진 ID 는 로스터 화면에서 조용히 건너뛴다.

### 알아둘 점

- **한글 데이터카드는 요원 492명 중 301명분만 존재**한다. 없으면 한글 이름·무기표가
  비고, 화면에는 영문 무기표가 대신 나온다("무기 (한글본 없음 · 영문 원본)").
- 한글 무기표와 영문 무기표의 행 수가 어긋나면 병기하지 않고 한글표만 보여준다.
  잘못 짝지어 붙이는 것보다 낫기 때문이다.
- 팩션에는 원본에 대표색이 없어, 팩션 페이지 강조색은 **소속 첫 킬팀 색**을 빌려 쓴다.
- 요원 능력은 한글본만 있다(`abilitiesKo`). 영문 능력 텍스트는 원본에 없다.
- 용어 뜻풀이 출처는 Youngxee 「킬팀 한글화 공식 인덱스」이며 팀 상세 페이지에
  표기한다. 판정은 공식 코어 규칙이 우선한다.

## 디자인 방향

단일 다크 테마로 고정했다. 라이트 모드를 두지 않은 것은 기본값을 따른 게 아니라,
전장 기록물(dossier) 톤 — 그을린 건메탈 표면, 뼈색 활자, 위험 표식 오렌지 — 을
의도적으로 택했기 때문이다. 강조색은 킬팀 대표색을 `--accent` 로 주입해
팀마다 페이지 인상이 달라진다. 토큰은 `public/assets/css/tokens.css` 한 곳에 모여 있다.
