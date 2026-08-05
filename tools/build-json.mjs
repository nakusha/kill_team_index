/**
 * 원본 data/*.js (window.KT.data.* 에 얹히는 형태) 를 읽어
 * 팩션 인덱스 사이트가 쓰는 JSON 으로 변환한다.
 *
 *   node tools/build-json.mjs
 *
 * 출력
 *   data/meta.json          빌드 정보와 집계 수치
 *   data/factions.json      팩션 9개 + 킬팀 48개 요약 (인덱스/팩션 페이지용)
 *   data/teams/<팀ID>.json  킬팀 상세 (요원·플로이·장비·편성 가이드)
 *
 *   public/data/kt-data.js  위 JSON 을 한 덩어리로 묶은 번들. 페이지는 이것만 <script> 로
 *                           읽으므로 런타임 fetch 도, 로컬 서버도 필요 없다.
 *                           배포는 public/ 만 올리면 된다.
 */
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { createContext, runInContext } from 'node:vm';
import { CACHE_DIR, DATA_DIR, PUBLIC_DIR, SOURCE_FILES, SOURCE_LABEL } from './source-files.mjs';

const PLOY_TYPE = { s: 'strategy', f: 'firefight' };
const WEAPON_TYPE = { R: 'ranged', M: 'melee' };

/**
 * 원본 파일은 브라우저 전역(window)을 전제로 하므로
 * window === globalThis 인 샌드박스에서 평가한다.
 */
async function loadSourceData() {
  const sandbox = {};
  sandbox.window = sandbox;
  createContext(sandbox);

  for (const name of SOURCE_FILES) {
    const path = join(CACHE_DIR, `${name}.js`);
    const code = await readFile(path, 'utf8').catch(() => {
      throw new Error(`${name}.js 없음 — 먼저 'node tools/fetch-source.mjs' 를 실행하세요`);
    });
    runInContext(code, sandbox, { filename: `${name}.js` });
  }

  if (!sandbox.KT?.data?.factions) {
    throw new Error('KT.data.factions 를 찾지 못했습니다 — 원본 형식이 바뀌었을 수 있습니다');
  }
  return sandbox.KT.data;
}

const buildPloy = (ploy, ployKo) => ({
  id: ploy.id,
  name: ploy.n,
  type: PLOY_TYPE[ploy.t] ?? ploy.t,
  cp: ploy.cp,
  textEn: ploy.d ?? '',
  textKo: ployKo[ploy.id] ?? '',
});

const buildEquipment = (item, equipKo) => ({
  id: item.id,
  name: item.n,
  textEn: item.d ?? '',
  textKo: equipKo[item.id] ?? '',
});

const buildWeapon = (weapon) => ({
  name: weapon.n,
  type: WEAPON_TYPE[weapon.t] ?? weapon.t,
  profiles: (weapon.profiles ?? []).map((profile) => ({
    name: profile.n ?? '',
    attacks: profile.a ?? '',
    hit: profile.h ?? '',
    damage: profile.d ?? '',
    rules: profile.r ?? [],
  })),
});

/** 요원 = 영문 스탯(operatives) + 한글 데이터카드(datacardsKo) 를 id 로 조인. */
function buildOperative(operative, datacardsKo) {
  const card = datacardsKo[operative.id];

  return {
    id: operative.id,
    nameEn: operative.n,
    nameKo: card?.n ?? null,
    stats: {
      move: operative.mv ?? '',
      apl: operative.apl ?? null,
      save: operative.sv ?? '',
      wounds: operative.w ?? null,
    },
    weapons: (operative.weapons ?? []).map(buildWeapon),
    weaponsKo: (card?.rows ?? []).map((row) => ({
      name: row.n ?? '',
      type: WEAPON_TYPE[row.t] ?? row.t,
      attacks: row.a ?? '',
      hit: row.h ?? '',
      damage: row.d ?? '',
      rules: row.r ?? [],
    })),
    abilitiesKo: (card?.notes ?? []).map((note) => ({
      name: note.n ?? '',
      text: note.d ?? '',
    })),
  };
}

/** 편성 가이드 / 팩션 규칙 블록. blocks 가 있으면 그것을, 없으면 text 를 문단으로 쪼갠다. */
function buildGuideSection(section) {
  if (!section) return null;

  const blocks = section.blocks?.length
    ? section.blocks.map((block) => ({ type: block.type ?? 'rule', text: block.text ?? '' }))
    : String(section.text ?? '')
        .split('\n\n')
        .map((text) => ({ type: 'rule', text: text.trim() }))
        .filter((block) => block.text);

  return { brief: section.brief ?? '', blocks };
}

function buildTeam(team, faction, data) {
  const guide = data.teamGuides[team.id];
  const operatives = data.operatives[team.id] ?? [];

  return {
    id: team.id,
    nameEn: team.n,
    nameKo: guide?.teamKo ?? null,
    archetype: team.arch ?? '',
    color: data.teamColor[team.id] ?? null,
    size: data.teamSize[team.id] ?? null,
    faction: {
      id: faction.id,
      nameEn: faction.n,
      nameKo: faction.ko,
    },
    ploys: (team.ploys ?? []).map((ploy) => buildPloy(ploy, data.ployKo ?? {})),
    equipment: (team.equip ?? []).map((item) => buildEquipment(item, data.equipKo ?? {})),
    equipmentBonusKo: data.eqBonusKo?.[team.id] ?? null,
    operatives: operatives.map((operative) => buildOperative(operative, data.datacardsKo ?? {})),
    selectionGuide: buildGuideSection(guide?.selection),
    factionRule: buildGuideSection(guide?.faction),
    source: guide?.source ?? null,
  };
}

/**
 * 무기 규칙 · 용어 뜻풀이. 한글본(glossary)과 영문본(glossaryEn)을 영문 표제어로 잇는다.
 * keys 는 무기 규칙 문자열에서 용어를 찾아낼 때 쓰는 검색어다(예: "관통 1" → "관통").
 */
function buildGlossary(data) {
  const englishById = new Map((data.glossaryEn ?? []).map((entry) => [entry.en, entry]));

  return (data.glossary ?? []).map((entry) => ({
    id: entry.en,
    nameKo: entry.ko || null,
    nameEn: entry.en,
    kind: entry.kind ?? null,
    keys: [...new Set([...(entry.keys ?? []), ...(englishById.get(entry.en)?.keys ?? [])])],
    textKo: entry.d ?? '',
    textEn: englishById.get(entry.en)?.d ?? '',
  }));
}

/** 인덱스/팩션 페이지에서 쓰는 가벼운 요약. 상세는 teams/<id>.json 에 있다. */
const summarizeTeam = (team) => ({
  id: team.id,
  nameEn: team.nameEn,
  nameKo: team.nameKo,
  archetype: team.archetype,
  color: team.color,
  size: team.size,
  brief: team.selectionGuide?.brief ?? '',
  counts: {
    operatives: team.operatives.length,
    ploys: team.ploys.length,
    equipment: team.equipment.length,
  },
});

const writeJson = (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');

/**
 * 페이지가 읽는 단일 번들. fetch 를 쓰지 않으므로 file:// 로 열어도 그대로 동작한다.
 * JSON 파일은 사람이 읽고 재가공하기 위한 정본으로 따로 남긴다.
 */
function bundleSource({ meta, factions, teams, glossary, glossaryCredit }) {
  const payload = JSON.stringify({ meta, factions, teams, glossary, glossaryCredit });
  return [
    '/* 자동 생성 파일 — 직접 고치지 말 것.',
    ' *   node tools/build-json.mjs',
    ' *',
    ` * 출처: ${meta.source}`,
    ` * 생성: ${meta.generatedAt}`,
    ' */',
    `window.KTI = ${payload};`,
    '',
  ].join('\n');
}

async function main() {
  const data = await loadSourceData();
  const teamsDir = join(DATA_DIR, 'teams');

  await rm(teamsDir, { recursive: true, force: true });
  await mkdir(teamsDir, { recursive: true });

  const factions = [];
  const teams = {};
  const totals = { teams: 0, operatives: 0, ploys: 0, equipment: 0 };

  for (const faction of data.factions) {
    const summaries = [];

    for (const rawTeam of faction.teams) {
      const team = buildTeam(rawTeam, faction, data);
      await writeJson(join(teamsDir, `${team.id}.json`), team);
      teams[team.id] = team;

      summaries.push(summarizeTeam(team));
      totals.teams += 1;
      totals.operatives += team.operatives.length;
      totals.ploys += team.ploys.length;
      totals.equipment += team.equipment.length;
    }

    factions.push({
      id: faction.id,
      nameEn: faction.n,
      nameKo: faction.ko,
      sub: faction.sub || null,
      teams: summaries,
    });
  }

  const glossary = buildGlossary(data);
  const glossaryCredit = data.glossaryCredit ?? null;

  const meta = {
    generatedAt: new Date().toISOString(),
    source: SOURCE_LABEL,
    counts: { factions: factions.length, ...totals, glossary: glossary.length },
  };

  await writeJson(join(DATA_DIR, 'factions.json'), factions);
  await writeJson(join(DATA_DIR, 'glossary.json'), { credit: glossaryCredit, terms: glossary });
  await writeJson(join(DATA_DIR, 'meta.json'), meta);

  const bundleDir = join(PUBLIC_DIR, 'data');
  await mkdir(bundleDir, { recursive: true });
  await writeFile(
    join(bundleDir, 'kt-data.js'),
    bundleSource({ meta, factions, teams, glossary, glossaryCredit }),
    'utf8',
  );

  console.log(`팩션 ${factions.length} · 킬팀 ${totals.teams} · 요원 ${totals.operatives}`);
  console.log(`플로이 ${totals.ploys} · 팀 전용 장비 ${totals.equipment} · 용어 ${glossary.length}`);
  console.log(`\n완료 → ${DATA_DIR}`);
}

main().catch((error) => {
  console.error(`\n빌드 실패: ${error.message}`);
  process.exit(1);
});
