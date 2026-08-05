/**
 * 수동 업데이트 — 원본 재수집 + JSON 재빌드 + 변경분 리포트.
 *
 *   node tools/update.mjs              원본을 다시 받아 전체 갱신
 *   node tools/update.mjs --rebuild    이미 받아둔 캐시로 JSON 만 다시 만듦
 *   node tools/update.mjs --dry-run    무엇이 바뀔지 확인만 (data/ 를 원래대로 되돌림)
 *
 * 자동 갱신은 하지 않는다. 데이터는 이 명령을 실행한 시점에 고정된 스냅샷이다.
 */
import { readFile, cp, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { DATA_DIR, ROOT } from './source-files.mjs';

const DRY_RUN_BACKUP = join(ROOT, 'tools', '.dry-run-backup');

/** 갱신 전후를 비교하기 위한 현재 상태 요약. 파일이 없으면 null. */
async function snapshot() {
  try {
    const meta = JSON.parse(await readFile(join(DATA_DIR, 'meta.json'), 'utf8'));
    const factions = JSON.parse(await readFile(join(DATA_DIR, 'factions.json'), 'utf8'));

    const teams = new Map();
    for (const faction of factions) {
      for (const team of faction.teams) {
        teams.set(team.id, `${team.nameKo ?? team.nameEn} / ${team.nameEn}`);
      }
    }
    return { meta, teams };
  } catch {
    return null;
  }
}

function run(script, args = []) {
  const result = spawnSync(process.execPath, [join(ROOT, 'tools', script), ...args], {
    stdio: 'inherit',
    cwd: ROOT,
  });

  if (result.status !== 0) {
    throw new Error(`${script} 실행 실패 (exit ${result.status})`);
  }
}

const COUNT_LABEL = {
  factions: '팩션 / Factions',
  teams: '킬팀 / Kill Teams',
  operatives: '요원 / Operatives',
  ploys: '플로이 / Ploys',
  equipment: '장비 / Equipment',
};

function reportCounts(before, after) {
  console.log('\n── 수량 변화 / Counts ──');

  for (const [key, label] of Object.entries(COUNT_LABEL)) {
    const from = before?.meta?.counts?.[key] ?? 0;
    const to = after.meta.counts[key] ?? 0;
    const delta = to - from;
    const mark = delta === 0 ? '  =' : delta > 0 ? ` +${delta}` : ` ${delta}`;
    console.log(`  ${label.padEnd(22)} ${String(from).padStart(4)} → ${String(to).padStart(4)}${mark}`);
  }
}

function reportTeams(before, after) {
  if (!before) {
    console.log('\n이전 스냅샷이 없어 전체를 새로 만들었습니다 / No previous snapshot — full build.');
    return;
  }

  const added = [...after.teams.keys()].filter((id) => !before.teams.has(id));
  const removed = [...before.teams.keys()].filter((id) => !after.teams.has(id));

  console.log('\n── 킬팀 목록 변화 / Kill team roster ──');
  if (!added.length && !removed.length) {
    console.log('  변동 없음 / No change');
    return;
  }
  for (const id of added) console.log(`  + ${id}  ${after.teams.get(id)}`);
  for (const id of removed) console.log(`  - ${id}  ${before.teams.get(id)}`);
}

async function main() {
  const args = process.argv.slice(2);
  const rebuildOnly = args.includes('--rebuild');
  const dryRun = args.includes('--dry-run');

  const before = await snapshot();
  console.log(
    before
      ? `현재 스냅샷 / Current snapshot — ${before.meta.generatedAt}`
      : '현재 스냅샷 없음 / No current snapshot',
  );

  /* --dry-run 은 기존 data/ 를 백업했다가 비교 후 원상복구한다. */
  if (dryRun && before) {
    await rm(DRY_RUN_BACKUP, { recursive: true, force: true });
    await cp(DATA_DIR, DRY_RUN_BACKUP, { recursive: true });
  }

  try {
    if (rebuildOnly) {
      console.log('\n캐시로 재빌드만 수행 / Rebuild from cache only');
    } else {
      console.log('\n── 원본 재수집 / Fetching source ──');
      run('fetch-source.mjs', ['--force']);
    }

    console.log('\n── JSON 재빌드 / Rebuilding JSON ──');
    run('build-json.mjs');

    const after = await snapshot();
    if (!after) throw new Error('빌드 후 meta.json 을 읽지 못했습니다');

    reportCounts(before, after);
    reportTeams(before, after);

    console.log(`\n새 스냅샷 / New snapshot — ${after.meta.generatedAt}`);
  } finally {
    if (dryRun && before) {
      await rm(DATA_DIR, { recursive: true, force: true });
      await cp(DRY_RUN_BACKUP, DATA_DIR, { recursive: true });
      await rm(DRY_RUN_BACKUP, { recursive: true, force: true });
      console.log('\n--dry-run: data/ 를 원래대로 되돌렸습니다 / restored, nothing written.');
    }
  }
}

main().catch((error) => {
  console.error(`\n업데이트 실패 / Update failed: ${error.message}`);
  process.exit(1);
});
