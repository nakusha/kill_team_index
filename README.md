# KT INDEX — 킬팀 · 스피어헤드 색인

워해머 두 게임의 규칙 자료를 한글로 훑어보는 정적 색인. 첫 화면에서 갈라진다.

- **킬 팀**(40K) — 팩션 → 킬팀 → 요원
- **스피어헤드**(AoS) — 팩션 → 아미 → 유닛

- **팩션 9 · 킬팀 48 · 요원 492 · 플로이 384 · 팀 전용 장비 192 · 용어 55**
- 표기 기준: 문구는 한글, **요원 이름과 무기는 한글(영어) 병기**
- 무기 특수 규칙과 본문의 `[대괄호]` 용어는 **마우스 오버 또는 클릭하면 뜻풀이가 펼쳐진다**
- **내 로스터** — 이름 붙인 로스터를 여러 개 두고, 요원(고른 무기)과 장비를 담는다
- **대전** — 로스터 둘을 탭으로 오가며 본다. 파일·붙여넣기로 주고받는다
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
| `public/index.html`          | 첫 화면 — 킬팀 / 스피어헤드 분기 |
| `public/killteam.html`       | 킬팀 색인 — 팩션 9개 + 킬팀 48개 즉시 검색 |
| `public/faction.html?f=IMP`  | 팩션 소속 킬팀 목록                                          |
| `public/team.html?t=IMP-AOD` | 요원 스탯·무기표, 능력, 플로이, 장비, 편성 가이드, 팩션 규칙 |
| `public/roster.html`         | 로스터 보관함(만들기·이름·복제·삭제·내보내기·불러오기) + 편집 중 로스터 |
| `public/versus.html`         | 킬팀 대전 — 로스터 둘을 탭으로 오가며 비교 |
| `public/spearhead.html`      | 스피어헤드 색인 — 팩션별 아미 28개 |
| `public/army.html?a=SH01`    | 아미 상세 — 아미 능력 · 레지먼트 · 인핸스먼트 · 유닛 시트 |
| `public/sh-versus.html`      | 스피어헤드 대전 — 아미 + 레지먼트 1 · 인핸스먼트 1 선택 |
| `public/wh40k.html`          | 40K 데이터시트 참고 — 무기 능력 20 · 코어 능력 11 키워드 사전 (10판) |

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

자동 갱신도, 웹 수집도 하지 않는다. **킬 팀 공식 한글 룰 PDF 가 근거이고,
`data/teams/<팀ID>.json` 이 정본이다.** 사람이 고치는 파일이니 직접 편집하면 된다.
기준 시각은 `data/meta.json` 의 `generatedAt` 에서 확인할 수 있다.

```bash
# 킬팀 — data/ 를 고친 뒤 배포 번들을 다시 만든다
node tools/bundle-kt.mjs

# 스피어헤드 — PDF 에서 추출
node tools/parse-spearhead.mjs [PDF경로]   # 기본값은 Downloads 의 1.8.3 판
```

킬팀 데이터를 고치는 순서.

1. 공식 한글 룰 PDF 를 확보한다. 팀 룰 PDF 하단 「업데이트 로그」의 에라타가
   무엇이 바뀌었는지 알려 준다.
2. `data/teams/<팀ID>.json` 을 고친다. 팀을 늘리거나 줄일 때는
   `data/factions.json` 의 해당 팩션 `teams` 배열에 ID 를 넣고 뺀다.
3. `node tools/bundle-kt.mjs` 를 돌린다. `data/factions.json` 의 팀 요약과
   `data/meta.json` 의 집계, `public/data/kt-data.js` 가 다시 쓰인다.
4. 그대로 커밋하면 배포된다.

`data/teams/<팀ID>.json` 의 `source` 필드에 그 팀 데이터의 근거를 적어 둔다.

## 구조

```
kt-index/
├── .github/workflows/pages.yml   GitHub Pages 자동 배포
│
├── public/                   ← 배포 대상. 이 디렉터리만 올리면 된다
│   ├── index.html · faction.html · team.html · roster.html · versus.html
│   ├── _headers              캐시 · 보안 헤더 (Cloudflare Pages · Netlify)
│   ├── assets/
│   │   ├── css/  tokens.css · base.css · components.css
│   │   └── js/   store.js · roster.js · render-roster.js · page-*.js
│   └── data/                 kt-data.js (window.KTI) · aos-data.js (window.AOS)
│                             · wh40k-data.js (window.W40K — 40K 키워드 사전, 수기 관리)
│
├── data/                     ← JSON 정본. 배포하지 않는다
│   ├── factions.json         팩션 + 킬팀 요약
│   ├── glossary.json         용어 뜻풀이 + 출처
│   ├── meta.json             빌드 시각 · 원본 · 집계
│   ├── teams/<팀ID>.json     킬팀 48개 상세
│   └── spearhead/            아미 28개 상세 + meta.json
│
└── tools/                    ← 빌드. 배포하지 않는다
    ├── source-files.mjs      경로 상수와 출처 표기
    ├── bundle-kt.mjs         킬팀 data/ → 배포 번들
    ├── pdf-lines.mjs         PDF 줄 단위 좌표 추출 (2단 조판 대응)
    ├── parse-spearhead.mjs   스피어헤드 PDF → JSON + 번들
    └── check-spearhead.mjs   스피어헤드 추출 결과 점검
```

`data/teams/*.json` 과 `data/glossary.json` 이 정본이고, 사람이 공식 PDF 를 보고 고친다.
`data/factions.json` 의 팀 요약 · `data/meta.json` · `public/data/kt-data.js` 는
`bundle-kt.mjs` 가 정본에서 다시 만드는 파생물이다.

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

### 내 로스터와 대전이 동작하는 방식

이름 붙인 로스터를 여러 개 두고, 그중 하나를 **활성**으로 삼아 킬팀 상세에서 편집한다.
저장은 브라우저 `localStorage` 한 곳 — 키는 `kt-index:library:v3` 다.

```jsonc
{
  "version": 3,
  "activeId": "r1",                    // 킬팀 상세에서 담기는 대상
  "items": [
    {
      "id": "r1",
      "name": "내 로스터",
      "savedAt": "1970-01-01T00:00:00.000Z",
      "teams": {
        "IMP-AOD": {
          "seq": 2,
          "units": [                    // 요원 한 명 = 인스턴스 하나
            { "uid": "u1", "opId": "IMP-AOD-ISGT", "weapons": ["볼트 소총", "체인소드"] },
            { "uid": "u2", "opId": "IMP-AOD-ISGT", "weapons": [] }   // [] = 미선택
          ],
          "equipment": ["IMP-AOD-CR"]
        }
      }
    }
  ]
}
```

- 무기에는 ID 가 없어 **행 이름**을 키로 쓴다(한글표가 있으면 한글명). 원본 갱신으로
  이름이 바뀌면 "저장된 무기 n개가 지금 데이터에 없어 표시하지 못했습니다" 를 띄운다.
  조용히 삼키지 않는다.
- 같은 요원을 둘 이상 담으면 요원 카드에 **인스턴스 탭**(`1번째 · 2`)이 생기고,
  탭마다 무기 선택이 따로 저장된다.
- **팩션 규칙과 플로이는 고르는 대상이 아니다.** 팩션 규칙은 팀에 늘 걸리고, 플로이는
  팀이 가진 것을 CP 만 내면 모두 쓸 수 있다. 그래서 저장하지 않고 팀의 전부를 그대로
  보여준다. 요원 시트보다 위에 둬 게임 중 이 화면만 봐도 되게 한다.
- **주고받기**: `{kind:"kt-index-roster", version:2, name, exportedAt, teams}` 형태의 JSON 을
  두 방식으로 주고받는다 — **복사**(텍스트 상자에서 클립보드로)와 **파일**(내려받기).
  휴대폰에서는 파일보다 복사·붙여넣기가 편해 둘 다 둔다. 불러오면 **새 항목으로 추가**되며
  기존 것을 덮어쓰지 않고, 받은 값은 모양을 검사해 맞는 것만 남긴다(믿고 쓰지 않는다).
- **대전**(`versus.html`)은 좌·우에 각각 보관함 항목을 골라 올리고 탭으로 오간다.
  상대 쪽은 고르기 전까지 비워 두고 "상대 로스터가 없습니다" 안내를 띄운다 —
  내 로스터를 상대 자리에 올려두면 남의 것으로 착각하기 쉽다.
  **내리기**는 그 자리에서만 치우고(보관함에는 남음), **지우기**는 보관함에서 없앤다.
  나란히 놓으면 양쪽 다 좁아져 요원 시트가 읽기 어려워지므로 한 쪽씩 넓게 본다.
  고른 조합은 `kt-index:versus:v1` 에 남아 다음에 열어도 그대로다.
- 서버로 보내지 않는다. 기기·브라우저가 바뀌면 따라오지 않는다.
- 저장소를 못 쓰는 환경에서는 메모리로 물러나고 "저장 실패 — 이 창에서만 유지됩니다"
  를 띄운다.
- 인원은 편성 정원(`size.total`)과 비교해 초과를 표시한다. 다만 요원 목록 안의
  선택 제약("↘ 1 … 중 선택")은 원본이 자연어라 **자동 검증하지 않는다**
  (근거는 `docs/plan/roster-loadout.md` — 요원 이름 매칭률 6%).
- 예전 스키마(v1 개수 맵, v2 단일 로스터)는 처음 읽을 때 항목 하나로 흡수한다.
  원본 키는 지우지 않는다.

### 스피어헤드가 동작하는 방식

원본이 PDF 뿐이라 `pdftotext` 로 뽑아 파싱한다. 2단 조판이어서 한 번에 뽑으면 좌우가
섞이므로 **세 벌**을 만들어 조합한다 — 전체폭(유닛·스탯·무장표), 좌반쪽·우반쪽(능력).

무장표는 열 위치로 자른다. 토큰을 순서대로 채우면 빈 칸에서 값이 밀려 **관통과 대미지가
뒤바뀐다**. 헤더(`무장 이름 사거리 공격 …`)의 글자 위치를 기준으로 잘라야 정확하다.

추출 결과: 아미 28 · 유닛 112 · 무장 198(핵심값 99%) · 유닛 능력 130 ·
레지먼트 52 · 인핸스먼트 94.

대전(`sh-versus.html`)은 양쪽이 아미를 고르고 **레지먼트 1개 · 인핸스먼트 1개**를
정한다. 같은 것을 다시 누르면 선택이 풀린다. 고른 조합은 `kt-index:sh-versus:v1` 에
남는다. 스피어헤드는 아미 구성이 고정이라 로스터를 따로 두지 않았다.

**알려진 한계**: 아미 2개(소울레이드 헌트 · 슬래셔 호스트)는 원본에 레지먼트/인핸스먼트
소제목이 없어 그 능력들이 `아미 능력` 으로 묶인다. 추측해서 채우지 않았다.

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
