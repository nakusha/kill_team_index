/** 공용 경로와 출처 표기. */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * 정본 — 사람이 읽고 고친다. 웹에서 받아오지 않으며, 공식 PDF 를 근거로 갱신한다.
 *   teams/<팀ID>.json  킬팀 상세      glossary.json  용어 뜻풀이
 *   factions.json      팩션 골격      spearhead/     스피어헤드 아미
 */
export const DATA_DIR = join(ROOT, "data");

/** 배포 대상 — 이 디렉터리 하나만 올리면 사이트가 뜬다. */
export const PUBLIC_DIR = join(ROOT, "public");

/**
 * 화면과 meta.json 에 적는 출처 이름.
 * 팀별 근거는 각 teams/<팀ID>.json 의 source 필드에 따로 적는다.
 */
export const SOURCE_LABEL = "킬 팀 공식 한글 룰";
