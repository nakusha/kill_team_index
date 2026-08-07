/**
 * 스피어헤드 아미 규칙 PDF → JSON.
 *
 *   node tools/parse-spearhead.mjs [PDF경로]
 *
 * PDF 는 2단 조판이라 그냥 뽑으면 좌우가 섞인다. 그래서 세 벌을 만든다.
 *   전체폭  — 유닛 이름 · 스탯 · 무장표(표는 페이지 폭을 다 쓴다)
 *   좌반쪽  — 왼쪽 단의 능력
 *   우반쪽  — 오른쪽 단의 능력
 * 능력은 좌 → 우 순서로 붙인다.
 *
 * 출력
 *   data/spearhead/meta.json        빌드 정보와 집계
 *   data/spearhead/<아미ID>.json    아미별 상세
 *   public/data/aos-data.js         페이지가 읽는 번들 (window.AOS)
 */
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { DATA_DIR, PUBLIC_DIR } from './source-files.mjs';

const DEFAULT_PDF = '/Users/jys/Downloads/NAVERWORKS/스피어헤드 아미 규칙_1.8.3.pdf';
const PAGE_WIDTH = 595; /* A4 */
const PAGE_HEIGHT = 842;

/** 아미 헤더 — "<아미명> ‒ <팩션명>". 원본에 대시 종류가 섞여 있다. */
const ARMY_LINE = /^(.{3,40}?)\s+[‒–—-]\s+(.{2,20})$/;
/**
 * 능력의 시작을 알리는 타이밍 줄.
 * 원본 표현이 다양하다 — "패시브", "게임 당 한번, …", "페이즈 당 한번, …",
 * "자신의 히어로 페이즈", "아무 턴 종료시", "리액션: …".
 * 본문 문장이 잘못 걸리지 않도록 마침표로 끝나는 줄은 제외한다.
 */
const TIMING = /^(패시브$|.{0,20}당 한번|리액션|.{0,24}페이즈$|.{0,24}(종료시|시작시)$|매 .{0,20}마다)/;
/** 아미 능력을 묶는 소제목. 게임에서 고르는 건 레지먼트 1 · 인핸스먼트 1 이다. */
const ARMY_GROUPS = ['신성한 명령', '배틀 트레잇', '레지먼트 어빌리티', '인핸스먼트'];
/** 표 조각이나 쪽번호처럼 능력이 아닌 줄 */
const NOISE = /^(령|이동|무장 이름|피해|키워드|[0-9]{1,3}$)/;
const STAT_HEADER = /이동\s+체력\s+방호\s+점령/;
const KEYWORD_LINE = /^키워드\s*[:：]\s*/;

/**
 * 무장 한 줄 → 이름 + 사거리 + 나머지.
 * 능력 칸이 줄바꿈으로 흩어지는 경우가 있어 열 개수를 고정하지 않고,
 * 뒤쪽 토큰을 "값처럼 생겼는지"로 갈라 값 5개(공격·명중·피해·관통·대미지)를 채운다.
 */
const RANGE_CELL = /^(근접|[0-9]+\s*["”'])$/;

function extractRaw(pdfPath, args) {
  return execFileSync('pdftotext', [...args, '-layout', pdfPath, '-'], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  })
    .split('\f')
    .map((page) => page.split('\n').filter((line) => line.trim()));
}

/** 능력 파싱은 들여쓰기가 필요 없다. */
const trimPages = (pages) => pages.map((lines) => lines.map((line) => line.trim()));

/**
 * 한 단(컬럼)에서 능력을 순서대로 읽는다.
 * 소제목은 왼쪽 단에만 찍히므로 그룹 추적도 여기서 함께 한다.
 * at 은 그 단 안에서의 줄 번호 — 아미 능력과 유닛 능력을 가르는 데 쓴다.
 */
function parseAbilities(lines) {
  const out = [];
  let current = null;
  let mode = null;
  let group = null;

  const flush = () => {
    if (current && current.effect) out.push(current);
    current = null;
    mode = null;
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    if (ARMY_GROUPS.includes(line)) {
      flush();
      group = line;
      continue;
    }
    if (TIMING.test(line) && line.length < 50 && !/[.。]$/.test(line)) {
      flush();
      current = { timing: line, name: '', declare: '', effect: '', group, at: i };
      mode = 'name';
      continue;
    }
    if (!current) continue;

    if (KEYWORD_LINE.test(line) || STAT_HEADER.test(line)) {
      flush();
      continue;
    }
    if (NOISE.test(line)) {
      if (mode === 'effect') flush();
      continue;
    }

    if (mode === 'name') {
      current.name = line;
      mode = 'wait';
      continue;
    }
    if (/^(선언|사용자)\s*[:：]/.test(line)) {
      current.declare = line.replace(/^(선언|사용자)\s*[:：]\s*/, '');
      mode = 'declare';
      continue;
    }
    if (/^효과\s*[:：]/.test(line)) {
      current.effect = line.replace(/^효과\s*[:：]\s*/, '');
      mode = 'effect';
      continue;
    }
    /* "효과:" 라벨 없이 본문만 적힌 능력도 있다(예: 인핸스먼트의 패시브). */
    if (mode === 'wait') {
      current.effect = line;
      mode = 'effect';
      continue;
    }
    if (mode === 'declare') current.declare += ' ' + line;
    else if (mode === 'effect') current.effect += ' ' + line;
  }

  flush();
  return out;
}

/** 그 단에서 유닛 카드가 시작되는 줄. 없으면 Infinity — 전부 아미 능력이라는 뜻. */
function firstUnitAt(lines) {
  const at = lines.findIndex((line) => STAT_HEADER.test(line) || /^령$/.test(line));
  return at === -1 ? Infinity : at;
}

/**
 * 오른쪽 단에는 소제목이 없다. 그룹은 왼쪽 단과 같은 순서로 짝을 이루므로
 * 같은 순번의 그룹을 물려준다.
 */
function inheritGroups(leftAbilities, rightAbilities) {
  rightAbilities.forEach((ability, i) => {
    if (ability.group) return;
    const partner = leftAbilities[i] || leftAbilities[leftAbilities.length - 1];
    ability.group = partner ? partner.group : null;
  });
  return rightAbilities;
}

/** 조판 때문에 한글 낱말 사이에 끼어든 공백을 지운다. */
const tidy = (text) => String(text || '').replace(/\s+/g, ' ').trim();

/**
 * 무장표 헤더에서 각 열이 시작하는 문자 위치를 읽는다.
 * -layout 출력은 공백으로 열을 유지하므로, 빈 칸이 있어도 위치로 정확히 가를 수 있다.
 * 토큰을 순서대로 채우면 빈 칸에서 값이 한 칸씩 밀린다 — 관통과 대미지가 뒤바뀐다.
 */
function columnBounds(headerLine) {
  const labels = ['무장 이름', '사거리', '공격', '명중', '피해', '관통', '대미지', '능력'];
  const starts = [];

  labels.forEach((label) => {
    const at = headerLine.indexOf(label, starts.length ? starts[starts.length - 1] + 1 : 0);
    if (at !== -1) starts.push(at);
  });

  return starts.length === labels.length ? starts : null;
}

/** 헤더 위치로 한 줄을 잘라 각 칸의 글자를 뽑는다. */
function sliceByColumns(line, starts) {
  return starts.map((start, i) => {
    /* 앞 칸의 글자가 경계에 걸치는 일이 있어 한 칸씩 여유를 둔다. */
    const from = i === 0 ? 0 : start - 2;
    const to = i === starts.length - 1 ? line.length : starts[i + 1] - 1;
    return line.slice(from, to).trim();
  });
}

function parseWeapons(lines, startIndex) {
  const weapons = [];
  let starts = null;

  for (let i = startIndex; i < lines.length; i += 1) {
    const line = lines[i];
    const bare = line.trim();

    if (STAT_HEADER.test(bare) || KEYWORD_LINE.test(bare) || TIMING.test(bare)) break;
    /* 능력 본문이 시작되면 표는 끝났다. */
    if (/^(선언|효과|사용자)\s*[:：]/.test(bare)) break;

    if (/^무장 이름/.test(bare)) {
      starts = columnBounds(line);
      continue;
    }
    if (!starts) continue;

    const cells = sliceByColumns(line, starts);
    const [name, range, attacks, hit, wound, rend, damage, rules] = cells;

    /* 사거리 칸이 "근접"이나 "10”" 이어야 무장 줄이다 — 본문 문장을 걸러낸다. */
    if (!RANGE_CELL.test(range)) {
      /* 능력 칸만 다음 줄로 넘어간 경우는 앞 무장에 이어 붙인다. */
      if (!name && !range && !attacks && rules && weapons.length) {
        const last = weapons[weapons.length - 1];
        last.rules = `${last.rules} ${rules}`.trim();
      }
      continue;
    }
    if (!name) continue;

    weapons.push({ name, range, attacks, hit, wound, rend, damage, rules });
  }

  return weapons.map((w) => ({
    ...w,
    rules: w.rules.replace(/\s*,\s*/g, ', ').replace(/(^,|,$)/g, '').trim(),
  }));
}

/** 전체폭 텍스트에서 유닛(이름 · 스탯 · 무장 · 키워드)을 읽는다. */
function parseUnits(lines) {
  const units = [];

  lines.forEach((line, i) => {
    if (!STAT_HEADER.test(line)) return;

    const values = (lines[i + 1] || '').trim().split(/\s+/).filter(Boolean);
    if (values.length < 4) return;

    const name = (lines[i - 1] || '').trim();
    if (!name || STAT_HEADER.test(name)) return;

    const keywordLine = lines.slice(i, i + 30).find((l) => KEYWORD_LINE.test(l.trim()));

    units.push({
      name,
      statIndex: i,
      stats: {
        move: values[0],
        health: Number(values[1]) || values[1],
        save: values[2],
        control: Number(values[3]) || values[3],
      },
      weapons: parseWeapons(lines, i + 2),
      keywords: keywordLine
        ? keywordLine
            .trim()
            .replace(KEYWORD_LINE, '')
            .split(/\s*,\s*/)
            .filter(Boolean)
        : [],
      abilities: [],
    });
  });

  return units;
}

/** 아미 헤더가 있는 줄을 찾는다. 숫자나 따옴표가 섞이면 표 조각이다. */
function findArmyHeader(lines) {
  for (const line of lines) {
    if (line.length < 8 || line.length > 50) continue;
    if (/["”0-9]/.test(line)) continue;
    if (ARMY_GROUPS.includes(line)) continue;

    const matched = ARMY_LINE.exec(line);
    if (matched) return { name: matched[1].trim(), faction: matched[2].trim() };
  }
  return null;
}

/** 아미 ID — 원본에 코드가 없어 순번으로 만든다. */
const armyId = (index) => `SH${String(index + 1).padStart(2, '0')}`;

const shape = (ability) => ({
  timing: ability.timing,
  name: ability.name,
  declare: tidy(ability.declare),
  effect: tidy(ability.effect),
});

async function main() {
  const pdfPath = process.argv[2] || DEFAULT_PDF;

  const half = Math.floor(PAGE_WIDTH / 2);
  /* 무장표는 열 위치가 필요해 들여쓰기를 살린 원본을 쓴다. */
  const full = extractRaw(pdfPath, []);
  const fullTrimmed = trimPages(full);
  const left = trimPages(extractRaw(pdfPath, ['-x', '0', '-y', '0', '-W', String(half), '-H', String(PAGE_HEIGHT)]));
  const right = trimPages(extractRaw(pdfPath, [
    '-x', String(half), '-y', '0',
    '-W', String(PAGE_WIDTH - half), '-H', String(PAGE_HEIGHT),
  ]));

  const armies = [];

  full.forEach((pageLines, pageIndex) => {
    const header = findArmyHeader(fullTrimmed[pageIndex] || []);
    const leftLines = left[pageIndex] || [];
    const rightLines = right[pageIndex] || [];

    /* 아미 능력과 유닛 능력의 경계는 각 단 안에서 유닛 카드가 시작되는 자리다. */
    const boundary = { left: firstUnitAt(leftLines), right: firstUnitAt(rightLines) };
    const leftAbilities = parseAbilities(leftLines);
    const rightAbilities = inheritGroups(leftAbilities, parseAbilities(rightLines));

    const units = parseUnits(pageLines);

    if (header) {
      armies.push({
        id: armyId(armies.length),
        name: header.name,
        faction: header.faction,
        page: pageIndex + 1,
        armyAbilities: [],
        units: [],
      });
    }

    const army = armies[armies.length - 1];
    if (!army) return;

    /*
     * 아미 첫 페이지에는 아미 능력과 지휘관 카드가 함께 놓인다.
     * 소제목(레지먼트 어빌리티 · 인핸스먼트) 아래에 있으면 유닛 카드보다 뒤에 있어도 아미 능력이다.
     */
    const isArmyAbility = (ability, side) =>
      Boolean(ability.group) || (header && ability.at < boundary[side]);

    const armyOnly = [
      ...leftAbilities.filter((a) => isArmyAbility(a, 'left')),
      ...rightAbilities.filter((a) => isArmyAbility(a, 'right')),
    ];
    const unitAbilities = [
      ...leftAbilities.filter((a) => !isArmyAbility(a, 'left')),
      ...rightAbilities.filter((a) => !isArmyAbility(a, 'right')),
    ];

    if (armyOnly.length) {
      army.armyAbilities = armyOnly.map((a) => ({ group: a.group || '아미 능력', ...shape(a) }));
    }

    units.forEach((unit) => {
      delete unit.statIndex;
      army.units.push(unit);
    });

    /* 이 페이지의 능력은 이 페이지 유닛에게 순서대로 나눠 준다. */
    const targets = units.length ? units : army.units.slice(-1);
    unitAbilities.forEach((ability, i) => {
      const unit = targets[Math.min(i, targets.length - 1)];
      if (unit) unit.abilities.push(shape(ability));
    });
  });

  const outDir = join(DATA_DIR, 'spearhead');
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  for (const army of armies) {
    await writeFile(join(outDir, `${army.id}.json`), `${JSON.stringify(army, null, 2)}\n`, 'utf8');
  }

  const sum = (fn) => armies.reduce((total, army) => total + fn(army), 0);
  const counts = {
    armies: armies.length,
    units: sum((a) => a.units.length),
    weapons: sum((a) => a.units.reduce((s, u) => s + u.weapons.length, 0)),
    unitAbilities: sum((a) => a.units.reduce((s, u) => s + u.abilities.length, 0)),
    armyAbilities: sum((a) => a.armyAbilities.length),
    regiments: sum((a) => a.armyAbilities.filter((x) => x.group === '레지먼트 어빌리티').length),
    enhancements: sum((a) => a.armyAbilities.filter((x) => x.group === '인핸스먼트').length),
  };

  const meta = {
    generatedAt: new Date().toISOString(),
    source: '스피어헤드 아미 규칙 1.8.3',
    counts,
  };

  await writeFile(join(outDir, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`, 'utf8');

  const bundleDir = join(PUBLIC_DIR, 'data');
  await mkdir(bundleDir, { recursive: true });
  await writeFile(
    join(bundleDir, 'aos-data.js'),
    [
      '/* 자동 생성 파일 — 직접 고치지 말 것.',
      ' *   node tools/parse-spearhead.mjs',
      ' *',
      ` * 출처: ${meta.source}`,
      ` * 생성: ${meta.generatedAt}`,
      ' */',
      `window.AOS = ${JSON.stringify({ meta, armies })};`,
      '',
    ].join('\n'),
    'utf8',
  );

  console.log(`아미 ${counts.armies} · 유닛 ${counts.units} · 무장 ${counts.weapons}`);
  console.log(`유닛 능력 ${counts.unitAbilities} · 아미 능력 ${counts.armyAbilities}`);
  console.log(`  레지먼트 ${counts.regiments} · 인핸스먼트 ${counts.enhancements}`);
  console.log(`\n완료 → ${outDir}`);
}

main().catch((error) => {
  console.error(`\n파싱 실패: ${error.message}`);
  process.exit(1);
});
