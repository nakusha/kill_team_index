/*
 * 워해머 40,000 데이터시트 참고 데이터 — 10판 코어 규칙 기준.
 * 항목 구성은 나무위키 「워해머 40,000/데이터시트」 문서의 3.1(무기 능력) ·
 * 4(능력) · 4.1(워기어 능력) 절을 참고했고, 설명문은 직접 정리했다.
 * 판정은 공식 코어 규칙이 우선한다.
 */
window.W40K = {
  meta: {
    edition: "10판",
    referenceKo: "항목 구성 참고: 나무위키 「워해머 40,000/데이터시트」",
  },

  /* 능력의 종류 — 데이터시트의 '능력' 칸이 나뉘는 네 갈래 */
  abilityKinds: [
    {
      nameKo: "코어 능력",
      nameEn: "Core Abilities",
      textKo:
        "여러 데이터시트가 공유하는 공통 능력. 데이터시트에는 이름만 적히고, 규칙 본문은 코어 규칙에 있다. 아래 「코어 능력」 목록이 이것이다.",
    },
    {
      nameKo: "팩션 능력",
      nameEn: "Faction Abilities",
      textKo:
        "같은 팩션이 공유하는 능력. 데이터시트에는 이름만 적히고, 내용은 그 아미의 팩션 규칙에 있다. 예: 스페이스 마린의 「순간의 맹세(Oath of Moment)」.",
    },
    {
      nameKo: "데이터시트 능력",
      nameEn: "Datasheet Abilities",
      textKo: "그 유닛만의 고유 능력. 규칙 전문이 데이터시트에 그대로 적혀 있다.",
    },
    {
      nameKo: "워기어 능력",
      nameEn: "Wargear Abilities",
      textKo:
        "특정 워기어(장비)를 장비한 모델만 쓰는 능력. 데이터시트의 워기어 능력 칸에 따로 적히며, 유닛 구성에서 해당 장비를 골랐을 때만 적용된다. 예: 터미네이터 스쿼드의 「텔레포트 호머(Teleport Homer)」.",
    },
  ],

  /* 무기 능력 — 무기 프로필의 [대괄호] 키워드 */
  weaponAbilities: [
    {
      nameKo: "기동 사격",
      nameEn: "Assault",
      textKo: "이번 턴에 전진(Advance)한 유닛도 이 무기로 사격할 수 있다.",
    },
    {
      nameKo: "속사 X",
      nameEn: "Rapid Fire X",
      textKo: "사거리 절반 이내의 대상을 사격하면 공격 횟수가 X만큼 늘어난다.",
    },
    {
      nameKo: "엄폐 무시",
      nameEn: "Ignores Cover",
      textKo: "대상은 이 공격에 대해 엄폐 이득(Benefit of Cover)을 받을 수 없다.",
    },
    {
      nameKo: "2연장",
      nameEn: "Twin-linked",
      textKo: "이 무기의 운드 굴림을 다시 굴릴 수 있다.",
    },
    {
      nameKo: "권총",
      nameEn: "Pistol",
      textKo:
        "적 교전 범위 안에 있어도 사격할 수 있다. 단, 그때는 자신과 교전 중인 적 유닛만 노릴 수 있다. 한 모델이 같은 페이즈에 권총과 권총 아닌 무기를 함께 쏠 수는 없다.",
    },
    {
      nameKo: "방사",
      nameEn: "Torrent",
      textKo: "명중 굴림을 하지 않는다. 공격이 자동으로 명중한다.",
    },
    {
      nameKo: "살상타",
      nameEn: "Lethal Hits",
      textKo: "크리티컬 히트(보정 전 명중 굴림 6)가 나오면 운드 굴림 없이 자동으로 운드시킨다.",
    },
    {
      nameKo: "랜스",
      nameEn: "Lance",
      textKo: "이 무기를 든 유닛이 이번 턴에 차지(Charge)했다면 운드 굴림에 +1을 받는다.",
    },
    {
      nameKo: "간접 사격",
      nameEn: "Indirect Fire",
      textKo:
        "시야가 닿지 않는 적 유닛도 대상으로 삼을 수 있다. 시야 밖 대상을 쏠 때는 명중 굴림에 -1을 받고, 대상은 엄폐 이득을 받는다.",
    },
    {
      nameKo: "정밀",
      nameEn: "Precision",
      textKo:
        "캐릭터가 합류한 유닛에 이 공격이 운드를 입히면, 공격자는 피해를 그 유닛의 눈에 보이는 캐릭터 모델에 직접 배정할 수 있다.",
    },
    {
      nameKo: "폭발",
      nameEn: "Blast",
      textKo:
        "대상 유닛의 모델 5구마다 공격 횟수 +1. 아군 유닛의 교전 범위 안에 있는 적 유닛에는 쏠 수 없다.",
    },
    {
      nameKo: "멜타 X",
      nameEn: "Melta X",
      textKo: "사거리 절반 이내의 대상을 사격하면 대미지가 X만큼 늘어난다.",
    },
    {
      nameKo: "중화기",
      nameEn: "Heavy",
      textKo:
        "이 무기를 든 유닛이 이번 턴에 제자리를 지켰다면(Remained Stationary) 명중 굴림에 +1을 받는다.",
    },
    {
      nameKo: "위험",
      nameEn: "Hazardous",
      textKo:
        "이 무기로 공격을 마친 뒤 위험 판정을 한다. 무기 하나마다 D6을 굴려 1이 나오면 그 무기를 든 모델 하나가 파괴된다. 그 모델이 캐릭터·몬스터·비클이라면 파괴 대신 모탈 운드 3점을 입는다.",
    },
    {
      nameKo: "궤멸타",
      nameEn: "Devastating Wounds",
      textKo:
        "크리티컬 운드(보정 전 운드 굴림 6)가 나오면 그 공격에는 어떤 세이브도 할 수 없다(절대 방호 포함).",
    },
    {
      nameKo: "연타 X",
      nameEn: "Sustained Hits X",
      textKo: "크리티컬 히트(보정 전 명중 굴림 6)마다 추가 명중 X회가 발생한다.",
    },
    {
      nameKo: "추가타",
      nameEn: "Extra Attacks",
      textKo:
        "다른 무기로 공격하는 것에 더해 이 무기로도 공격한다. 공격할 무기를 고를 때 이 무기는 선택을 소모하지 않는다.",
    },
    {
      nameKo: "특화 X+",
      nameEn: "Anti-키워드 X+",
      textKo:
        "지정된 키워드를 가진 대상을 공격할 때, 보정 전 운드 굴림이 X 이상이면 크리티컬 운드가 된다. 예: Anti-VEHICLE 4+ 는 비클 상대로 운드 굴림 4+ 가 크리티컬 운드.",
    },
    {
      nameKo: "단발",
      nameEn: "One Shot",
      textKo: "게임 전체에서 한 번만 발사할 수 있다.",
    },
    {
      nameKo: "사이킥",
      nameEn: "Psychic",
      textKo: "이 공격은 사이킥 공격으로 취급되어, 사이킥에 반응하는 규칙·능력과 상호작용한다.",
    },
  ],

  /* 코어 능력 — 여러 데이터시트가 공유하는 공통 능력 */
  coreAbilities: [
    {
      nameKo: "리더",
      nameEn: "Leader",
      textKo:
        "이 캐릭터는 지정된 보디가드 유닛에 합류(Attach)할 수 있다. 합류한 동안 하나의 유닛으로 취급되어 함께 움직이고 함께 공격받는다.",
    },
    {
      nameKo: "심층 타격",
      nameEn: "Deep Strike",
      textKo:
        "배치 때 전장 밖 예비대에 둘 수 있다. 자기 이동 페이즈 끝에, 모든 적 모델에서 9\" 넘게 떨어진 곳이라면 전장 어디에나 내려놓을 수 있다.",
    },
    {
      nameKo: "정찰 X\"",
      nameEn: "Scouts X\"",
      textKo:
        "첫 턴이 시작되기 전에 X\" 이하의 일반 이동을 한 번 한다. 이동을 마친 위치는 모든 적 모델에서 9\" 넘게 떨어져 있어야 한다. 전용 수송차량에 타고 있다면 수송차량이 대신 이동할 수 있다.",
    },
    {
      nameKo: "침투",
      nameEn: "Infiltrators",
      textKo:
        "배치할 때, 적 배치 지역과 모든 적 모델에서 9\" 넘게 떨어진 곳이라면 전장 어디에나 놓을 수 있다.",
    },
    {
      nameKo: "은신",
      nameEn: "Stealth",
      textKo: "이 유닛을 노리는 원거리 공격은 명중 굴림에 -1을 받는다.",
    },
    {
      nameKo: "단독 작전",
      nameEn: "Lone Operative",
      textKo: "공격자가 12\" 이내에 있지 않으면 이 유닛을 원거리 공격의 대상으로 지정할 수 없다.",
    },
    {
      nameKo: "고통 무시 X+",
      nameEn: "Feel No Pain X+",
      textKo:
        "이 유닛의 모델이 운드를 1점 잃을 때마다(모탈 운드 포함) D6을 굴려, X 이상이 나오면 그 운드를 잃지 않는다.",
    },
    {
      nameKo: "선제 전투",
      nameEn: "Fights First",
      textKo: "전투 페이즈의 선제 전투 단계에 싸운다. 상대보다 먼저 공격할 기회를 얻는다.",
    },
    {
      nameKo: "치명적 최후 X",
      nameEn: "Deadly Demise X",
      textKo:
        "이 모델이 파괴되면 D6을 굴린다. 6이 나오면 6\" 이내의 모든 유닛이(아군 포함) 모탈 운드 X점을 입는다.",
    },
    {
      nameKo: "사격 갑판 X",
      nameEn: "Firing Deck X",
      textKo:
        "이 수송차량이 사격할 때, 탑승 중인 모델 X구를 골라 그들의 원거리 무기를 이 모델의 무기처럼 쏠 수 있다.",
    },
    {
      nameKo: "제자리 비행",
      nameEn: "Hover",
      textKo:
        "게임 시작 전에 선언하면 이 비행체는 제자리 비행 모드로 작전한다. 이동 능력치가 20\" 이 되고, 모든 규칙에서 비행체(AIRCRAFT) 키워드를 잃어 일반 모델처럼 움직인다.",
    },
  ],

};
