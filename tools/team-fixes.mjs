/**
 * 원본(kt-dashboard) 데이터의 누락·조판 오류를 빌드 시점에 보정한다.
 * 캐시는 tools/update.mjs 가 다시 받아오므로 보정은 반드시 여기에 둔다.
 *
 * 근거는 킬팀 공식앱 PDF(영문·한글판) 원문이다.
 */

/** 원본 arch 가 빈 문자열인 팀. PDF 의 ARCHETYPE 표기를 그대로 옮긴다. */
export const TEAM_ARCHETYPE = {
  // eng/kor 22-07 Exodite Dragon Masters — "ARCHETYPE: RECON, SEEK & DESTROY"
  'AEL-EDM': 'Recon/Seek & Destroy',
};

/**
 * PDF 2단 조판 탓에 한 문장이 여러 블록으로 끊긴 곳.
 * head 는 시작 블록의 텍스트 전문이다. 앞부분만 같은 다른 블록까지 끌려오지 않도록
 * 부분 일치가 아닌 완전 일치로 찾는다(예: "사이킥. …아군 엑소다이트 용의" 는
 * 창백한 달의 정화와 바람의 은혜 두 곳에서 시작이 겹친다).
 */
export const GUIDE_BLOCK_MERGES = {
  'AEL-EDM/factionRule': [
    { head: '모든 아군 엑소다이트 용의 달인 기승 요원은 저밀도', count: 2, type: 'rule' },
    { head: '• 쾌주 행동을 수행했으며, 앞으로 4" 미만, 혹은 뒤로', count: 2, type: 'rule' },
    { head: '엑소다이트 용의 달인 달음룡붙이 요원의 속도 변화는', count: 2, type: 'rule' },
    { head: '사이킥. 이 요원의 시야에 들어오는 아군 엑소다이트 용의', count: 4, type: 'rule' },
  ],
};

/** heading 으로 잘못 분류된 본문. 시작 텍스트가 정확히 일치하면 rule 로 내린다. */
export const GUIDE_BLOCK_DEMOTIONS = {
  'AEL-EDM/factionRule': [
    '무기 명칭 공격 명중 피해',
    '대지가 빚은 분노 4 3+ 4/3',
    '무기 규칙',
    '궤멸 2, 포화, 대지가 빚은 분노*',
  ],
};

/** 추출 과정에서 어절 중간에 공백이 끼어든 곳. 전 팀 공통으로 적용한다. */
const WORD_REPAIRS = [
  ['방어 주사 위', '방어 주사위'],
  ['비로 소 소진', '비로소 소진'],
  ['기존에 상실 한 체력', '기존에 상실한 체력'],
  ['여러 번수행', '여러 번 수행'],
  ['제거합니 다.', '제거합니다.'],
  ['2"씩차감합니다', '2"씩 차감합니다'],
];

export function repairText(text) {
  return WORD_REPAIRS.reduce((acc, [from, to]) => acc.split(from).join(to), text ?? '');
}

/**
 * 병합·강등·어절 보정을 한 번에 적용한 blocks 를 새로 만든다.
 * 원본이 고쳐져 규칙이 헛도는 것을 모르고 지나치지 않도록, 병합 규칙이
 * 정확히 한 번씩 걸리지 않으면 빌드를 세운다.
 */
export function repairGuideBlocks(teamId, section, blocks) {
  const key = `${teamId}/${section}`;
  const merges = GUIDE_BLOCK_MERGES[key] ?? [];
  const demotions = new Set(GUIDE_BLOCK_DEMOTIONS[key] ?? []);
  const hits = new Map(merges.map((rule) => [rule.head, 0]));

  const repaired = [];
  for (let i = 0; i < blocks.length; ) {
    const text = repairText(blocks[i].text);
    const merge = merges.find((rule) => text === rule.head && i + rule.count <= blocks.length);

    if (merge) {
      hits.set(merge.head, hits.get(merge.head) + 1);
      const joined = blocks
        .slice(i, i + merge.count)
        .map((block) => repairText(block.text).trim())
        .join(' ');
      repaired.push({ type: merge.type, text: repairText(joined) });
      i += merge.count;
      continue;
    }

    repaired.push({ type: demotions.has(text) ? 'rule' : blocks[i].type, text });
    i += 1;
  }

  for (const [head, count] of hits) {
    if (count !== 1) {
      throw new Error(`${key} 병합 규칙이 ${count}번 걸렸다(1번이어야 함): ${head}`);
    }
  }

  return repaired;
}
