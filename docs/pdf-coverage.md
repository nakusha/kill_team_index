# 공식 룰 PDF 대조 현황

데이터 근거는 **킬 팀 공식 룰 PDF** 다. PDF 로 대조한 팀만 그 내용이 정확하다고
말할 수 있고, 아직 대조하지 못한 팀은 이전 출처(공식 앱 한글번역 추출본)를 그대로
쓰고 있다. 이 문서는 그 경계를 적어 둔다.

전체 48팀 중 **대조 완료 23팀 · 미대조 25팀**.

## 대조가 필요한 이유

대조한 팀에서 실제로 나온 것들이다. 남은 팀에도 비슷한 것이 있다고 보는 편이 맞다.

- 엑소다이트 용의 달인 — 아키타입이 빈 값(48팀 중 유일). 팩션 규칙 문장이 PDF
  2단 조판 탓에 끊겨 문장 중간이 제목으로 렌더링되고 있었다
- 살육날개 용사 외 4요원 — 한글 무기행 8행 누락. 영문과 행 수가 어긋나
  한글·영문 병기가 통째로 끊겨 있었다
- 선도 요원 — 마커라이트 표가 한 덩어리로 뭉개져 토큰 수와 규칙이 뒤섞임
  (`Saturate and Balanced 1 weapon rules. 2 Improve the Hit stat…`)
- 래버너 체력, 늑대 척후 무기 수치 등 '26년 8월 밸런스 변경 미반영

## 대조 방법

1. PDF 하단 「업데이트 로그 / UPDATE LOG」 의 에라타를 먼저 본다.
   좌측이 신규분이고, 우측 `이전 에라타 / PREVIOUS ERRATAS` 이후는 이미 반영된 것이다.
2. 데이터카드(요원 스탯 · 무기표)를 `data/teams/<팀ID>.json` 과 전수 대조한다.
   영문 `weapons` 와 한글 `weaponsKo` 는 **행 순서로 짝지어지므로, 행 수가 어긋나면
   화면에서 병기가 끊긴다.** 양쪽을 함께 맞춰야 한다.
3. 고친 뒤 `node tools/bundle-kt.mjs` 로 번들을 다시 만든다.
4. `data/teams/<팀ID>.json` 의 `source` 에 근거를 적는다.

## 파일명 규칙

`kor_<영문명>_online_rules-*.pdf` · `eng_<영문명>_online_rules-*.pdf`
아래 표의 영문명 칸에 파일명 조각을 함께 적어 두었다.

## 미대조 25팀

| | 팀 ID | 한글명 | 영문명 — 파일명 조각 | 요원 |
|---|---|---|---|---|
| | **임페리움** | | | |
|   | `IMP-DKK` | 데스 코어 | Death Korps — `death_korps` | 12 |
|   | `IMP-ESS` | 엘루시디아의 성간활보자 | Elucidian Starstriders — `elucidian_starstriders` | 7 |
|   | `IMP-AES` | 집행 분대 | Exaction Squad — `exaction_squad` | 12 |
|   | `IMP-HC` | 사냥 계통 | Hunter Clade — `hunter_clade` | 14 |
|   | `IMP-KAS` | 카스르킨 | Kasrkin — `kasrkin` | 8 |
|   | `IMP-RAT` | 래틀링 킬 팀 | Ratlings — `ratlings` | 13 |
|   | `IMP-SANC` | 정화사역단 | Sanctifiers — `sanctifiers` | 11 |
|   | `IMP-TEMPAQ` | 템페스투스 아퀼론 | Tempestus Aquilon — `tempestus_aquilon` | 8 |
| | **스마** | | | |
|   | `IMP-PHO` | 포보스 타격반 | Phobos Strike Team — `phobos_strike_team` | 13 |
|   | `IMP-SCT` | 스카웃 분대 | Scout Squad — `scout_squad` | 6 |
| | **카오스** | | | |
|   | `CHAOS-BLD` | 피칠갑 | Blooded — `blooded` | 13 |
|   | `CHAOS-CULT` | 카오스 사교도 | Chaos Cult — `chaos_cult` | 7 |
|   | `CHAOS-LEG` | 군단병 | Legionaries — `legionaries` | 10 |
|   | `CHAOS-NC` | 천벌갈퀴 | Nemesis Claw — `nemesis_claw` | 8 |
|   | `CHAOS-WC` | 워프주술회 | Warp Coven — `warp_coven` | 10 |
| | **아엘다리** | | | |
|   | `AEL-BOK` | 케인의 칼날 | Blades Of Khaine — `blades_of_khaine` | 6 |
|   | `AEL-COR` | 공허상흔 해적단 | Corsair Voidscarred — `corsair_voidscarred` | 11 |
|   | `AEL-HOTA` | 집정관의 손 | Hand Of The Archon — `hand_of_the_archon` | 9 |
|   | `AEL-MND` | 맨드레이크 | Mandrakes — `mandrakes` | 6 |
|   | `AEL-VDT` | 공허춤꾼 극단 | Void-Dancer Troupe — `void_dancer_troupe` | 4 |
| | **타이라니드** | | | |
|   | `TYR-WB` | 이무기 칼날 | Wyrmblade — `wyrmblade` | 9 |
| | **타우** | | | |
|   | `TAU-FSKB` | 먼길밟이 혈족단 | Farstalker Kinband — `farstalker_kinband` | 11 |
| | **보탄** | | | |
|   | `VOT-HKS` | 하스킨 인양단 | Hearthkyn Salvagers — `hearthkyn_salvagers` | 11 |
| | **오크** | | | |
|   | `ORK-KOM` | 코만도스 | Kommandos — `kommandos` | 11 |
|   | `ORK-WK` | 레카 크루 | Wrecka Krew — `wrecka_krew` | 7 |

## 대조 완료 23팀

`'26년 8월` 은 그 판 에라타까지 반영했다는 뜻이다. 팀별 근거는 각
`data/teams/<팀ID>.json` 의 `source` 에 적혀 있다.

| | 팀 ID | 한글명 | 영문명 — 파일명 조각 | 요원 |
|---|---|---|---|---|
| | **임페리움** | | | |
| ✓ | `IMP-BC` | 전투계통 | Battleclade — `battleclade` | 7 |
| ✓ | `IMP-CI` | 셀레스티안 항마단 | Celestian Insidiants — `celestian_insidiants` | 8 |
| ✓ | `IMP-INB` | 제국 해군 돌파조 | Imperial Navy Breachers — `imperial_navy_breachers` | 11 |
| ✓ | `IMP-INQ` | 이단심문관 심복요원 | Inquisitorial Agents — `inquisitorial_agents` | 56 |
| ✓ | `IMP-NOV` | 수습 수녀단 | Novitiates — `novitiates` | 12 |
| ✓ | `IMP-SPECT` | 유령 분대 | Spectre Squad — `spectre_squad` | 12 |
| | **스마** | | | |
| ✓ | `IMP-AOD` | 죽음의 천사 | Angels Of Death — `angels_of_death` | 9 |
| ✓ | `IMP-DW` | 데스워치 | Deathwatch — `deathwatch` | 11 |
| ✓ | `IMP-WS` | 늑대 척후 | Wolf Scouts — `wolf_scouts` | 8 |
| | **카오스** | | | |
| ✓ | `CHAOS-FELL` | 펠고어 약탈자 | Fellgor Ravagers — `fellgor_ravagers` | 11 |
| ✓ | `CHAOS-GPI` | 겔러폭스 감염자 | Gellerpox Infected — `gellerpox_infected` | 9 |
| ✓ | `CHAOS-GORE` | 유혈광 | Goremongers — `goremongers` | 7 |
| ✓ | `CHAOS-MW` | 살육날개 | Murderwing — `murderwing` | 9 |
| ✓ | `CHAOS-PM` | 플레이그 마린 킬 팀 | Plague Marines — `plague_marines` | 7 |
| | **아엘다리** | | | |
| ✓ | `AEL-EDM` | 엑소다이트 용의 달인 | Exodite Dragon Masters — `exodite_dragon_masters` | 4 |
| | **타이라니드** | | | |
| ✓ | `TYR-BBRO` | 무리 형제단 | Brood Brothers — `brood_brothers` | 15 |
| ✓ | `TYR-RAV` | 래버너 | Raveners — `raveners` | 6 |
| | **네크론** | | | |
| ✓ | `NEC-CAN` | 카놉텍 회합 | Canoptek Circle — `canoptek_circle` | 5 |
| ✓ | `NEC-HIER` | 히에로텍 회합 | Hierotek Circle — `hierotek_circle` | 9 |
| | **타우** | | | |
| ✓ | `TAU-PF` | 선도 요원 | Pathfinders — `pathfinders` | 16 |
| ✓ | `TAU-VESP` | 베스피드 독침날개 | Vespid Stingwings — `vespid_stingwings` | 7 |
| ✓ | `TAU-XV26` | XV26 스텔스 배틀슈트 | XV26 Stealth Battlesuits — `xv26_stealth_battlesuits` | 8 |
| | **보탄** | | | |
| ✓ | `VOT-HKY` | 헤른킨 예이기르 | Hernkyn Yaegirs — `hernkyn_yaegirs` | 8 |
