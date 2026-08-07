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
import { extractLines, splitColumns } from './pdf-lines.mjs';

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
const TIMING =
  /^(패시브[.。]?$|.{0,20}당 한번|리액션|.{0,26}페이즈$|.{0,26}(종료시|시작시)$|.{0,26}때$|매 .{0,14}마다$)/;
/**
 * 타이밍 줄인지 — 본문 문장이 잘못 걸리지 않도록 마침표로 끝나는 줄은 뺀다.
 * 다만 "패시브." 는 조판상 마침표가 붙었을 뿐 진짜 타이밍이다.
 */
function isTimingLine(line) {
  if (line.length >= 50 || !TIMING.test(line)) return false;
  return /^패시브[.。]$/.test(line) || !/[.。]$/.test(line);
}

/*
 * 본문 줄은 15pt 간격으로 붙어 있고, 문단이 바뀌면 23pt 이상 벌어진다.
 * 그 사이인 20pt 를 경계로 삼아 문단만 줄바꿈으로 남긴다.
 */
const PARAGRAPH_GAP = 20;

/** 소제목 없이 늘 적용되는 능력에 붙이는 이름. */
const TRAIT_GROUP = '아미 특성';
/** 아미 능력을 묶는 소제목. 게임에서 고르는 건 레지먼트 1 · 인핸스먼트 1 이다. */
const ARMY_GROUPS = ['신성한 명령', '배틀 트레잇', '레지먼트 어빌리티', '인핸스먼트'];
/** 표 조각이나 쪽번호처럼 능력이 아닌 줄 */
const NOISE = /^(령|이동|무장 이름|피해|키워드|[0-9]{1,3}$)/;
const STAT_HEADER = /이동\s+체력\s+방호\s+점령/;
const KEYWORD_LINE = /^키워드\s*[:：]\s*/;
/** "○○가 이 아미의 지휘관이다" — 인핸스먼트 소제목 아래 적히는 안내문 */
const COMMANDER_LINE = /(이 ?아미의 지휘관이다|아미의 지휘관이다)/;
/** 표 항목의 표시 — 번호 목록이거나 일반/강화 같은 라벨 */
const TABLE_ITEM = /^([0-9]+\.\s|[0-9]+\+\s|[0-9]+\s*[-–~]\s*[0-9]+\s|일반\s*[:：]|강화\s*[:：])/;

/**
 * 무장 한 줄 → 이름 + 사거리 + 나머지.
 * 능력 칸이 줄바꿈으로 흩어지는 경우가 있어 열 개수를 고정하지 않고,
 * 뒤쪽 토큰을 "값처럼 생겼는지"로 갈라 값 5개(공격·명중·피해·관통·대미지)를 채운다.
 */
const RANGE_CELL = /^(근접|[0-9]+\s*["”'])$/;
/** 대미지 칸에 들어갈 수 있는 값 — 넘침을 가려낼 때 쓴다. */
const DAMAGE_VALUE = /^([0-9]+|D[0-9]+|[0-9]D[0-9]+|D[0-9]+\+[0-9]+)$/;

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
function parseAbilities(rows) {
  const out = [];
  const leftovers = [];
  let current = null;
  let mode = null;
  let lastY = null;

  const flush = () => {
    if (current && current.effect) out.push(current);
    current = null;
    mode = null;
  };

  for (const row of rows) {
    const line = row.text;
    const previousY = lastY;
    lastY = row.y;

    if (ARMY_GROUPS.includes(line)) {
      flush();
      continue;
    }
    if (isTimingLine(line)) {
      /*
       * 타이밍이 단 폭에 걸려 두 줄로 접히기도 한다.
       * ("게임 당 한번, 리액션: … 완전히 들어" / "간 아군 유닛이 차지 능력을 사용할 때")
       * 이름을 기다리는 중에 또 타이밍이 오면 새 능력이 아니라 앞 타이밍의 이어짐이다.
       */
      if (current && mode === 'name') {
        current.timing = glue(current.timing, line);
        continue;
      }

      flush();
      current = { timing: line.replace(/[.。]$/, ''), name: '', declare: '', effect: '', y: row.y };
      mode = 'name';
      continue;
    }
    if (!current) {
      leftovers.push(row);
      continue;
    }

    if (KEYWORD_LINE.test(line) || STAT_HEADER.test(line)) {
      flush();
      continue;
    }
    if (NOISE.test(line)) {
      if (mode === 'effect') flush();
      continue;
    }

    if (mode === 'name') {
      /* "1. 간조: …" 같은 표 항목은 능력이 아니다. */
      if (/^[0-9]+\.\s/.test(line)) {
        flush();
        leftovers.push(row);
        continue;
      }
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
    const isParagraph = previousY !== null && row.y - previousY >= PARAGRAPH_GAP;
    if (mode === 'declare') {
      current.declare = isParagraph ? current.declare + '\n' + line : glue(current.declare, line);
    } else if (mode === 'effect') {
      current.effect = isParagraph ? current.effect + '\n' + line : glue(current.effect, line);
    }
  }

  flush();

  /* 능력이 차지하는 세로 구간 — 반대편 단의 부속 표를 붙일 때 쓴다. */
  out.forEach((ability, i) => {
    ability.yEnd = i + 1 < out.length ? out[i + 1].y : Infinity;
  });

  return { abilities: out, leftovers: leftovers };
}

/**
 * 이 능력이 어느 소제목 아래에 있는지 — 세로 위치로 판단한다.
 * 소제목과 능력 사이에 유닛 카드가 시작됐다면 그 능력은 유닛 것이지 아미 것이 아니다.
 */
function groupAt(y, headings, unitTops, armyTop) {
  const heading = headings.filter((h) => h.y <= y && h.y >= armyTop).pop();
  if (!heading) return null;

  const unitBetween = unitTops.some((top) => top > heading.y && top <= y);
  return unitBetween ? null : heading.group;
}

/**
 * 유닛 카드가 시작되는 세로 위치들.
 * 좌표 출력에서 스탯 머리글은 "이동" "체력" "방호" "점령" 네 조각으로 흩어지므로,
 * 같은 높이에 넷이 모인 지점을 유닛 카드의 시작으로 본다.
 */
function findUnitTops(rows) {
  const byRow = new Map();

  rows.forEach((row) => {
    if (!/^(이동|체력|방호|점령)$/.test(row.text)) return;
    const key = Math.round(row.y);
    if (!byRow.has(key)) byRow.set(key, new Set());
    byRow.get(key).add(row.text);
  });

  return [...byRow.entries()]
    .filter(([, labels]) => labels.size >= 4)
    .map(([y]) => y)
    .sort((a, b) => a - b);
}

/** 이 능력이 몇 번째 유닛 카드에 속하는지. -1 이면 유닛 위쪽, 즉 아미 능력이다. */
function ownerAt(y, unitTops) {
  let index = -1;
  unitTops.forEach((top, i) => {
    if (top <= y) index = i;
  });
  return index;
}

/**
 * 능력 옆(반대편 단)에 딸린 표를 그 능력에 붙인다.
 * "룬 각성"의 룬 목록이나 "신들의 시선"의 D6 표처럼, 본문이 아니라 옆에 놓인 자료다.
 * 능력이 차지하는 세로 구간 안에 있는 반대편 줄만 가져온다.
 */
function attachSideNotes(abilities, otherLeftovers, skipTexts) {
  abilities.forEach((ability) => {
    const lines = otherLeftovers
      .filter((row) => row.y >= ability.y - 4 && row.y < ability.yEnd)
      .map((row) => row.text)
      .filter(
        (text) =>
          text.length > 1 &&
          !skipTexts.has(text) &&
          !/^[0-9]{1,3}$/.test(text) &&
          !COMMANDER_LINE.test(text),
      );

    const notes = joinWrapped(lines);

    /*
     * 표를 알아보는 두 가지 신호.
     *   번호("1. …")나 라벨("일반:", "강화:")이 되풀이되거나
     *   짧은 항목이 여럿 늘어서 있거나("런 굴림", "돌격 굴림", …)
     * 옆 단의 다른 능력 본문이 흘러드는 것은 둘 다에 걸리지 않는다.
     */
    const marks = notes.filter((note) => TABLE_ITEM.test(note)).length;
    const shortItems = notes.filter((note) => note.length <= 22).length;
    if (marks >= 2 || shortItems >= 3) ability.notes = notes;
  });
}

/**
 * 단 폭에 걸려 잘린 줄을 잇는다.
 * 앞 줄이 길게 차 있고 다음 줄이 새 항목("3. …")이 아니면 이어진 문장으로 본다.
 */
function joinWrapped(lines) {
  const out = [];

  lines.forEach((line) => {
    const previous = out[out.length - 1];
    const startsItem = TABLE_ITEM.test(line);
    /*
     * 앞 줄이 단 폭을 꽉 채우고 문장이 끝나지 않았을 때만 이어진 것으로 본다.
     * 마침표로 끝났거나 짧으면 그 자체로 완결된 항목이다("주문 시전 굴림", "런 굴림").
     */
    const wrapped = previous && previous.length >= 30 && !/[.。]$/.test(previous);

    if (wrapped && !startsItem) out[out.length - 1] = glue(previous, line);
    else out.push(line);
  });

  return out;
}

/**
 * 잘린 줄을 잇는다.
 * PDF 는 어절 중간에서 줄을 끊는다("… 권총+절단기 모델" / "과 1명의 …").
 * 그대로 공백으로 이으면 "모델 과" 가 되므로, 한글끼리 만나면 붙여 쓴다.
 */
const glue = (before, after) =>
  /[가-힣]$/.test(before) && /^[가-힣]/.test(after) ? before + after : before + ' ' + after;

/** 조판 때문에 생긴 여분의 공백을 지운다. */
/** 줄 안의 군더더기 공백만 걷어낸다 — 문단을 가르는 줄바꿈은 남긴다. */
const tidy = (text) =>
  String(text || '')
    .split('\n')
    .map((line) => line.replace(/[^\S\n]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');

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

/**
 * 두 조각을 잇되 겹치는 부분은 한 번만 쓴다.
 * 열 경계에 걸친 글자는 양쪽 칸에 모두 잡히기 때문이다("크리" + "리(오토-운드)").
 */
function mergeOverlap(head, tail) {
  if (!head) return tail;
  if (!tail) return head;

  for (let n = Math.min(head.length, tail.length); n > 0; n -= 1) {
    if (head.slice(-n) === tail.slice(0, n)) return head + tail.slice(n);
  }
  return `${head}${tail}`;
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
  /* 능력 칸이 무장 줄보다 위에 걸리기도 한다("크리(오토-운드)," 다음 줄에 무장). */
  let pendingRules = '';

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
    const [name, range, attacks, hit, wound, rend] = cells;
    let damage = cells[6];
    let rules = cells[7];

    /*
     * 능력 칸 글자가 헤더보다 왼쪽에서 시작하는 판이 있어 앞 칸으로 한두 글자가 넘어온다
     * ("크리(오토-운드)" 의 "크" 가 대미지 칸에 붙는다). 숫자 뒤에 남은 글자는 능력으로 돌린다.
     */
    /*
     * 대미지 칸에 능력 글자가 넘어오는 두 가지 경우를 되돌린다.
     *   "1     돌격(대"  값 뒤에 공백을 두고 능력이 붙은 것
     *   "크리"           열 경계에 한두 글자가 걸친 것
     * "하단 참조" 처럼 칸 전체가 글자인 것은 진짜 값이므로 건드리지 않는다.
     */
    const split = /^(\S+)\s{2,}(.+)$/.exec(damage);
    if (split && DAMAGE_VALUE.test(split[1])) {
      rules = mergeOverlap(split[2], rules);
      damage = split[1];
    } else {
      const spillAt = damage.search(/[가-힣(]/);
      if (spillAt !== -1) {
        const tail = damage.slice(spillAt).trim();
        if (tail.length <= 3) {
          rules = mergeOverlap(tail, rules);
          damage = damage.slice(0, spillAt).trim();
        }
      }
    }

    /* 사거리 칸이 "근접"이나 "10”" 이어야 무장 줄이다 — 본문 문장을 걸러낸다. */
    if (!RANGE_CELL.test(range)) {
      if (!name && !range && !attacks && rules) {
        /* 무장이 이미 있으면 그 무장의 능력이 이어진 것, 없으면 다음 무장 것이다. */
        if (weapons.length) {
          const last = weapons[weapons.length - 1];
          last.rules = `${last.rules} ${rules}`.trim();
        } else {
          pendingRules = `${pendingRules} ${rules}`.trim();
        }
      }
      continue;
    }
    if (!name) continue;

    weapons.push({
      name,
      range,
      attacks,
      hit,
      wound,
      rend,
      damage,
      rules: `${pendingRules} ${rules}`.trim(),
    });
    pendingRules = '';
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

/**
 * "무장 선택" 안내 블록 — 능력은 아니지만 편성에 필요한 정보다.
 * 타이밍이 없어 능력 파서가 지나치므로 따로 거둔다.
 */
function findLoadoutNote(rows, top, bottom, middle) {
  const title = rows.find((row) => row.text === '무장 선택' && row.y >= top && row.y < bottom);
  if (!title) return null;

  const sameColumn = (row) => row.x < middle === title.x < middle;
  const body = [];

  for (const row of rows) {
    if (row.y <= title.y || row.y >= bottom || !sameColumn(row)) continue;
    /* 다음 능력이나 키워드가 나오면 블록이 끝난 것이다. */
    if (TIMING.test(row.text) || KEYWORD_LINE.test(row.text) || STAT_HEADER.test(row.text)) break;
    body.push(row.text);
  }

  return body.length ? joinWrapped(body).reduce(glue) : null;
}

/** 줄들을 본문 한 덩이로 — 세로로 크게 벌어진 자리만 문단으로 나눈다. */
function joinBody(rows) {
  let text = '';
  let lastY = null;

  rows.forEach((row) => {
    if (!text) text = row.text;
    else if (lastY !== null && row.y - lastY >= PARAGRAPH_GAP) text += '\n' + row.text;
    else text = glue(text, row.text);
    lastY = row.y;
  });

  return text;
}

/**
 * 타이밍 표기 없이 이름과 본문만 적힌 상시 능력을 거둔다.
 * ("피의 의식" 처럼 아미 헤더 바로 아래 놓이는 팩션 고유 능력)
 * 능력 파서는 타이밍 줄을 앵커로 삼기 때문에 이런 것들을 통째로 지나친다.
 */
function findAlwaysOnAbility(columnRows, armyTop, stopAt) {
  const block = columnRows.filter((row) => row.y > armyTop && row.y < stopAt);
  if (block.length < 2) return null;

  const [title, ...body] = block;
  if (ARMY_GROUPS.includes(title.text) || COMMANDER_LINE.test(title.text)) return null;

  /*
   * 이름 없이 본문만 적힌 것도 있다(배치 규칙 등).
   * 첫 줄이 문장이면 이름을 지어내지 않고 "아미 규칙"으로 둔다.
   */
  const hasName = title.text.length <= 28 && body.length > 0;
  const rows = hasName ? body : block;

  /* 번호 붙은 표는 효과 본문이 아니라 옆에 딸린 자료다. */
  const tableLines = rows.filter((row) => TABLE_ITEM.test(row.text)).map((row) => row.text);
  const bodyRows = rows.filter((row) => !TABLE_ITEM.test(row.text));

  const effect = joinBody(bodyRows).trim();
  if (!effect || effect.length < 10) return null;

  const ability = {
    timing: '패시브',
    name: hasName ? title.text : '아미 규칙',
    declare: '',
    effect: effect,
    y: title.y,
    yEnd: stopAt,
  };
  if (tableLines.length >= 2) ability.notes = joinWrapped(tableLines);

  return ability;
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

/** "○○가 이 아미의 지휘관이다" 에서 이름만 남긴다. */
function cleanCommander(line) {
  return line
    .replace(/\s*(이 ?아미의 지휘관이다\.?)\s*$/, '')
    .replace(/(가|이)$/, '')
    .trim();
}

/** 아미 ID — 원본에 코드가 없어 순번으로 만든다. */
const armyId = (index) => `SH${String(index + 1).padStart(2, '0')}`;

const shape = (ability) => {
  const out = {
    timing: ability.timing,
    name: ability.name,
    declare: tidy(ability.declare),
    effect: tidy(ability.effect),
  };
  if (ability.notes && ability.notes.length) out.notes = ability.notes;
  if (ability.inferred) out.inferred = true;
  return out;
};

/**
 * 아미마다 레지먼트 2개 · 인핸스먼트 4개가 규칙이다.
 * 원본에 "레지먼트 어빌리티" 소제목이 빠진 아미가 있어(1.8.3 기준 소울레이드 헌트)
 * 인핸스먼트 앞에 남은 미분류 능력이 정확히 둘일 때만 레지먼트로 본다.
 * 추정한 것은 inferred 로 표시해 화면에서 밝힌다.
 */
function inferMissingRegiment(army) {
  const regiments = army.armyAbilities.filter((a) => a.group === '레지먼트 어빌리티');
  if (regiments.length) return;

  const firstEnhancement = army.armyAbilities.findIndex((a) => a.group === '인핸스먼트');
  if (firstEnhancement === -1) return;

  /* 배틀 트레잇처럼 소제목이 명시된 것은 레지먼트가 아니다. */
  const candidates = army.armyAbilities
    .slice(0, firstEnhancement)
    .filter((a) => a.group === TRAIT_GROUP);

  /* 딱 둘일 때만 손댄다 — 어림짐작으로 채우지 않는다. */
  if (candidates.length !== 2) return;

  candidates.forEach((ability) => {
    ability.group = '레지먼트 어빌리티';
    ability.inferred = true;
  });
}

async function main() {
  const pdfPath = process.argv[2] || DEFAULT_PDF;

  const half = Math.floor(PAGE_WIDTH / 2);
  /* 무장표는 열 위치가 필요해 들여쓰기를 살린 원본을 쓴다. */
  const full = extractRaw(pdfPath, []);
  const fullTrimmed = trimPages(full);
  /* 능력은 세로 위치로 좌·우를 맞춰야 해서 좌표가 붙은 줄을 쓴다. */
  const boxed = extractLines(pdfPath);

  const armies = [];

  full.forEach((pageLines, pageIndex) => {
    const header = findArmyHeader(fullTrimmed[pageIndex] || []);
    const rows = boxed[pageIndex] || [];
    const columns = splitColumns(rows, half);

    /* 소제목과 유닛 카드의 세로 위치 — 능력이 어디에 속하는지 가르는 기준이다. */
    /* 한 페이지에 아미 둘이 걸치기도 한다 — 헤더보다 위의 소제목은 앞 아미 것이다. */
    const headerRow = header
      ? rows.filter((row) => row.text.includes(header.name)).map((row) => row.y)[0]
      : undefined;
    const armyTop = headerRow === undefined ? -Infinity : headerRow;

    const headings = rows
      .filter((row) => ARMY_GROUPS.includes(row.text))
      .map((row) => ({ y: row.y, group: row.text }));
    const unitTops = findUnitTops(rows);

    const leftParsed = parseAbilities(columns.left);
    const rightParsed = parseAbilities(columns.right);

    /*
     * 아미 헤더와 첫 소제목·첫 능력 사이에 타이밍 없는 상시 능력이 놓이기도 한다.
     * 이미 잡힌 능력이 없을 때만 거둔다 — 중복으로 넣지 않는다.
     */
    /*
     * 배틀 트레잇이 아미 헤더보다 위에 찍히는 판형이 있다(1.8.3 의 소울레이드 헌트).
     * 그 페이지에서 헤더 위에 유닛 카드가 없다면 앞 아미가 아니라 이 아미의 도입부다.
     */
    if (header && armyTop !== -Infinity && !unitTops.some((top) => top < armyTop)) {
      const intro = headings.filter((h) => h.y < armyTop).pop();
      if (intro) {
        [leftParsed, rightParsed].forEach((parsed) => {
          parsed.abilities.forEach((ability) => {
            if (ability.y > intro.y && ability.y < armyTop) ability.introGroup = intro.group;
          });
        });

        /* 도입부 능력에도 타이밍 표기가 없는 경우가 있다("죽음의 파도"). */
        const already = leftParsed.abilities.some((a) => a.y > intro.y && a.y < armyTop);
        if (!already) {
          const introAbility = findAlwaysOnAbility(columns.left, intro.y, armyTop);
          if (introAbility) {
            introAbility.introGroup = intro.group;
            leftParsed.abilities.unshift(introAbility);
            leftParsed.leftovers = leftParsed.leftovers.filter(
              (row) => row.y <= intro.y || row.y >= armyTop,
            );
          }
        }
      }
    }

    if (header && armyTop !== -Infinity) {
      const anchors = [
        ...headings.map((h) => h.y),
        ...leftParsed.abilities.map((a) => a.y),
        ...unitTops,
      ].filter((y) => y > armyTop);
      const stopAt = anchors.length ? Math.min(...anchors) : Infinity;

      const extra = findAlwaysOnAbility(columns.left, armyTop, stopAt);
      if (extra) {
        leftParsed.abilities.unshift(extra);
        leftParsed.leftovers = leftParsed.leftovers.filter(
          (row) => row.y <= armyTop || row.y >= stopAt,
        );
      }
    }

    /* 아미 헤더·소제목은 표가 아니므로 부속 자료에서 뺀다. */
    const skip = new Set([...ARMY_GROUPS, ...(header ? [header.name + ' ‒ ' + header.faction] : [])]);
    rows.forEach((row) => {
      if (header && row.text.includes(header.name)) skip.add(row.text);
    });

    attachSideNotes(leftParsed.abilities, rightParsed.leftovers, skip);
    attachSideNotes(rightParsed.abilities, leftParsed.leftovers, skip);

    const abilities = [...leftParsed.abilities, ...rightParsed.abilities]
      .map((ability) => ({
        ...ability,
        group: ability.introGroup || groupAt(ability.y, headings, unitTops, armyTop),
        owner: ability.introGroup ? -1 : ownerAt(ability.y, unitTops),
      }))
      .sort((a, b) => a.owner - b.owner || a.y - b.y);

    const units = parseUnits(pageLines);

    if (header) {
      const commanderRow = rows.filter((row) => COMMANDER_LINE.test(row.text))[0];

      armies.push({
        id: armyId(armies.length),
        name: header.name,
        faction: header.faction,
        page: pageIndex + 1,
        commander: commanderRow ? cleanCommander(commanderRow.text) : null,
        armyAbilities: [],
        units: [],
      });
    }

    const army = armies[armies.length - 1];
    if (!army) return;

    units.forEach((unit, i) => {
      delete unit.statIndex;

      const top = unitTops[i];
      const bottom = unitTops[i + 1] === undefined ? Infinity : unitTops[i + 1];
      if (top !== undefined) {
        const loadout = findLoadoutNote(rows, top, bottom, half);
        if (loadout) unit.loadout = loadout;
      }

      army.units.push(unit);
    });

    abilities.forEach((ability) => {
      /* 소제목 아래에 있으면 아미 능력, 유닛 카드 아래면 그 유닛 것. */
      if (ability.group) {
        army.armyAbilities.push({ group: ability.group, ...shape(ability) });
        return;
      }
      if (ability.owner === -1) {
        /* 유닛보다 위에 있는데 소제목이 없다 — 늘 걸리는 아미 고유 능력이다. */
        if (header) army.armyAbilities.push({ group: TRAIT_GROUP, ...shape(ability) });
        return;
      }

      const unit = units[ability.owner] || army.units[army.units.length - 1];
      if (!unit) return;

      /*
       * 옆에 딸린 표는 상시 발동 아미 능력에만 있다.
       * 유닛 카드 옆은 무장표라, 그대로 두면 "피해 관통 대미지" 같은 조각이 섞인다.
       */
      const shaped = shape(ability);
      delete shaped.notes;
      unit.abilities.push(shaped);
    });
  });

  armies.forEach(inferMissingRegiment);

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
