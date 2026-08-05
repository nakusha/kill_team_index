/** 원본(kt-dashboard) 데이터 파일 목록과 공용 경로. */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const CACHE_DIR = join(ROOT, "tools", ".cache");

/** JSON 정본 — 사람이 읽고 재가공하는 용도. 배포하지 않는다. */
export const DATA_DIR = join(ROOT, "data");

/** 배포 대상 — 이 디렉터리 하나만 올리면 사이트가 뜬다. */
export const PUBLIC_DIR = join(ROOT, "public");

export const SOURCE_ORIGIN = "킬팀 공식앱 한글번역";

/** 팩션 인덱스를 만드는 데 실제로 쓰는 파일만 받는다. */
export const SOURCE_FILES = [
  "factions", // 팩션 9 · 킬팀 48 · 플로이 · 팀 전용 장비
  "operatives", // 요원 스탯과 무기 프로필 (영문)
  "datacards-ko", // 요원 한글명 · 한글 무기표 · 한글 능력
  "team-guides", // 팀 편성 가이드와 팩션 규칙
  "team-colors", // 팀 대표색
  "team-size", // 편성 인원
  "ploy-ko", // 플로이 한글 요약
  "equipment-ko", // 팀 전용 장비 한글 요약 + 장비 보너스
  "glossary-ko", // 무기 규칙 · 용어 뜻풀이 (한글) + 출처
  "glossary-en", // 무기 규칙 뜻풀이 (영문)
];
