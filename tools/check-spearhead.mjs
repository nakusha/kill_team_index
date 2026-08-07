#!/usr/bin/env node
/*
 * 스피어헤드 데이터 점검 — 아미마다 반드시 성립해야 하는 것만 본다.
 *
 *   · 아미 특성(레지먼트·인핸스먼트가 아닌 상시 능력) 1개 이상
 *   · 레지먼트 어빌리티 정확히 2개
 *   · 인핸스먼트 정확히 4개
 *   · 능력마다 이름과 효과가 있음
 *
 * 파서를 고칠 때마다 돌려서 회귀를 잡는다. 문제가 있으면 종료 코드 1.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DATA_DIR } from './source-files.mjs';

const REGIMENT = '레지먼트 어빌리티';
const ENHANCEMENT = '인핸스먼트';
const PICKABLE = [REGIMENT, ENHANCEMENT];

async function loadArmies() {
  const dir = join(DATA_DIR, 'spearhead');
  const files = (await readdir(dir)).filter((name) => /^SH\d+\.json$/.test(name)).sort();

  return Promise.all(
    files.map(async (name) => JSON.parse(await readFile(join(dir, name), 'utf8'))),
  );
}

function checkArmy(army) {
  const problems = [];
  const by = (group) => army.armyAbilities.filter((ability) => ability.group === group);
  const traits = army.armyAbilities.filter((ability) => !PICKABLE.includes(ability.group));

  if (!traits.length) problems.push('아미 특성 없음');
  if (by(REGIMENT).length !== 2) problems.push(`레지먼트 ${by(REGIMENT).length}개`);
  if (by(ENHANCEMENT).length !== 4) problems.push(`인핸스먼트 ${by(ENHANCEMENT).length}개`);

  const all = army.armyAbilities.concat(...army.units.map((unit) => unit.abilities));
  const broken = all.filter((ability) => !ability.name || !ability.effect);
  if (broken.length) problems.push(`이름·효과 빠진 능력 ${broken.length}개`);

  return problems;
}

const armies = await loadArmies();
const failed = armies
  .map((army) => ({ army, problems: checkArmy(army) }))
  .filter((row) => row.problems.length);

failed.forEach(({ army, problems }) => {
  console.log(`✗ ${army.name} (p${army.page}) — ${problems.join(', ')}`);
  army.armyAbilities.forEach((ability) => {
    console.log(`    [${ability.group}] ${ability.timing || '(타이밍 없음)'} / ${ability.name}`);
  });
});

const inferred = armies.flatMap((army) =>
  army.armyAbilities
    .filter((ability) => ability.inferred)
    .map((ability) => `${army.name}/${ability.name}`),
);

console.log(`\n아미 ${armies.length}개 · 문제 ${failed.length}개`);
if (inferred.length) console.log(`위치로 추정한 항목 ${inferred.length}개 — ${inferred.join(', ')}`);

process.exit(failed.length ? 1 : 0);
