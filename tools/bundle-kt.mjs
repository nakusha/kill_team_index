/**
 * data/ → public/data/kt-data.js.
 *
 *   node tools/bundle-kt.mjs
 *
 * 정본은 사람이 고치는 아래 두 가지다. 웹에서 받아오지 않는다.
 *   data/teams/<팀ID>.json   킬팀 상세 (요원·플로이·장비·편성 가이드·팩션 규칙)
 *   data/glossary.json       무기 규칙 · 용어 뜻풀이
 *
 * 파생물이라 손대지 않아도 되는 것.
 *   data/factions.json       팩션 골격은 유지하고 팀 요약만 teams/ 에서 다시 만든다
 *   data/meta.json           집계 수치
 *   public/data/kt-data.js   페이지가 읽는 단일 번들
 *
 * 팩션 구성(순서 · sub · 한글명)은 data/factions.json 을 그대로 따른다.
 * 팀을 늘리거나 줄일 때는 그 파일의 teams 배열에 ID 를 넣고 빼면 된다.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { DATA_DIR, PUBLIC_DIR, SOURCE_LABEL } from './source-files.mjs';

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const writeJson = (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');

/** 인덱스·팩션 페이지에서 쓰는 가벼운 요약. 상세는 teams/<id>.json 에 있다. */
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

/** 페이지가 읽는 단일 번들. fetch 를 쓰지 않으므로 file:// 로 열어도 동작한다. */
function bundleSource({ meta, factions, teams, glossary, glossaryCredit }) {
  const payload = JSON.stringify({ meta, factions, teams, glossary, glossaryCredit });
  return [
    '/* 자동 생성 파일 — 직접 고치지 말 것.',
    ' *   node tools/bundle-kt.mjs',
    ' *',
    ' * 정본은 data/teams/*.json 과 data/glossary.json 이다.',
    ` * 출처: ${meta.source}`,
    ` * 생성: ${meta.generatedAt}`,
    ' */',
    `window.KTI = ${payload};`,
    '',
  ].join('\n');
}

async function main() {
  const skeleton = await readJson(join(DATA_DIR, 'factions.json'));
  const glossaryFile = await readJson(join(DATA_DIR, 'glossary.json'));

  const teams = {};
  const totals = { teams: 0, operatives: 0, ploys: 0, equipment: 0 };
  const factions = [];

  for (const faction of skeleton) {
    const summaries = [];

    for (const { id } of faction.teams) {
      const team = await readJson(join(DATA_DIR, 'teams', `${id}.json`));
      teams[id] = team;

      summaries.push(summarizeTeam(team));
      totals.teams += 1;
      totals.operatives += team.operatives.length;
      totals.ploys += team.ploys.length;
      totals.equipment += team.equipment.length;
    }

    factions.push({
      id: faction.id,
      nameEn: faction.nameEn,
      nameKo: faction.nameKo,
      sub: faction.sub ?? null,
      teams: summaries,
    });
  }

  const glossary = glossaryFile.terms ?? [];
  const meta = {
    generatedAt: new Date().toISOString(),
    source: SOURCE_LABEL,
    counts: { factions: factions.length, ...totals, glossary: glossary.length },
  };

  await writeJson(join(DATA_DIR, 'factions.json'), factions);
  await writeJson(join(DATA_DIR, 'meta.json'), meta);

  const bundleDir = join(PUBLIC_DIR, 'data');
  await mkdir(bundleDir, { recursive: true });
  await writeFile(
    join(bundleDir, 'kt-data.js'),
    bundleSource({ meta, factions, teams, glossary, glossaryCredit: glossaryFile.credit ?? null }),
    'utf8',
  );

  console.log(`팩션 ${factions.length} · 킬팀 ${totals.teams} · 요원 ${totals.operatives}`);
  console.log(`플로이 ${totals.ploys} · 팀 전용 장비 ${totals.equipment} · 용어 ${glossary.length}`);
  console.log(`\n완료 → ${join(PUBLIC_DIR, 'data', 'kt-data.js')}`);
}

main().catch((error) => {
  console.error(`\n번들 실패: ${error.message}`);
  process.exitCode = 1;
});
