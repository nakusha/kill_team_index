/* 킬팀 상세 페이지 — ?t=<킬팀ID>. 이름만 한글(영어), 나머지 문구는 한글. */
(function () {
  "use strict";

  var KTX = window.KTX;
  var KTR = window.KTR;
  var mount = document.getElementById("page");
  if (!KTX.requireData(mount)) return;

  var PLOY_LABEL = { strategy: "전략", firefight: "화력전" };
  var RANGE_PATTERN = /^\s*(?:사거리|Range)\s*(.+?)\s*$/i;

  var current = null; /* 지금 보고 있는 킬팀 — 로스터 조작에 필요하다 */
  var activeUnit = {}; /* 요원별로 지금 편집 중인 인스턴스 uid */

  /* ─── 요원 ─────────────────────────────────────────────── */

  function statblock(stats) {
    var cells = [
      { label: "APL", value: stats.apl },
      { label: "이동", value: stats.move },
      { label: "방어", value: stats.save },
      { label: "체력", value: stats.wounds },
    ];

    return (
      '<div class="statblock">' +
      cells
        .map(function (cell) {
          var value = cell.value === null || cell.value === "" ? "-" : cell.value;
          return "<div><b>" + KTX.esc(value) + "</b><span>" + KTX.esc(cell.label) + "</span></div>";
        })
        .join("") +
      "</div>"
    );
  }

  /** 영문 원본은 무기 → 프로필 2단 구조라 프로필마다 한 줄로 펼친다. */
  function weaponRowsEn(weapons) {
    return weapons.flatMap(function (weapon) {
      return weapon.profiles.map(function (profile) {
        return {
          name: weapon.name + (profile.name ? " (" + profile.name + ")" : ""),
          type: weapon.type,
          attacks: profile.attacks,
          hit: profile.hit,
          damage: profile.damage,
          rules: profile.rules,
        };
      });
    });
  }

  /**
   * 사거리는 특수 규칙이 아니라 원거리 무기의 기본 속성이라 별도 열로 뺀다.
   * 원본은 규칙 목록 안에 "사거리 8\"" / "Range 8\"" 형태로 섞여 들어온다.
   */
  function splitRange(rules) {
    var range = "";
    var rest = [];

    (rules || []).forEach(function (rule) {
      var matched = RANGE_PATTERN.exec(rule);
      if (matched && !range) {
        range = matched[1];
        return;
      }
      rest.push(rule);
    });

    return { range: range, rest: rest };
  }

  /**
   * uid 가 있으면 무기 이름 앞에 체크박스를 달아 그 인스턴스의 장비로 담게 한다.
   * 담지 않은 요원은 체크박스 없이 표만 보여준다 — 먼저 담아야 고를 수 있다.
   */
  function weaponNameCell(row, uid) {
    var label = KTX.nameWithEn(row.name, row.nameEn);
    if (!uid) return label;

    var isOn = KTR.hasUnitWeapon(current.id, uid, row.name);
    return (
      '<label class="wcheck">' +
      '<input type="checkbox" data-weapon="' +
      KTX.esc(row.name) +
      '" data-unit="' +
      KTX.esc(uid) +
      '"' +
      (isOn ? " checked" : "") +
      " />" +
      "<span>" +
      label +
      "</span></label>"
    );
  }

  function weaponTable(rows, caption, uid) {
    if (!rows.length) return "";

    var body = rows
      .map(function (row) {
        var split = splitRange(row.rules);
        var isOn = uid && KTR.hasUnitWeapon(current.id, uid, row.name);

        /* data-label 은 좁은 화면에서 표를 카드로 접을 때 열 이름 대신 쓴다. */
        return (
          '<tr class="' +
          (isOn ? "is-picked" : "") +
          '">' +
          '<td class="wname">' +
          weaponNameCell(row, uid) +
          "</td>" +
          '<td data-label="구분">' +
          KTX.badge(row.type === "melee" ? "근접" : "원거리", "", row.type) +
          "</td>" +
          '<td class="num" data-label="사거리">' +
          KTX.esc(split.range || "–") +
          "</td>" +
          '<td class="num" data-label="공격">' +
          KTX.esc(row.attacks) +
          "</td>" +
          '<td class="num" data-label="명중">' +
          KTX.esc(row.hit) +
          "</td>" +
          '<td class="num" data-label="피해">' +
          KTX.esc(row.damage) +
          "</td>" +
          '<td class="wrules" data-label="특수 규칙">' +
          split.rest
            .map(function (rule) {
              return KTX.termChip(rule);
            })
            .join("") +
          "</td>" +
          "</tr>"
        );
      })
      .join("");

    return (
      "<div>" +
      '<p class="subhead">' +
      KTX.esc(caption) +
      "</p>" +
      '<div class="table-scroll"><table class="wtable">' +
      "<thead><tr>" +
      "<th>무기</th><th>구분</th><th>사거리</th><th>공격</th><th>명중</th><th>피해</th><th>특수 규칙</th>" +
      "</tr></thead><tbody>" +
      body +
      "</tbody></table></div></div>"
    );
  }

  function abilityList(abilities) {
    if (!abilities.length) return "";

    return (
      "<div>" +
      '<p class="subhead">능력</p>' +
      '<div class="entry-list">' +
      abilities
        .map(function (ability) {
          return (
            '<div class="entry">' +
            '<div class="entry__head"><span class="entry__name">' +
            KTX.esc(ability.name) +
            "</span></div>" +
            '<p class="entry__ko">' +
            KTX.linkifyTerms(KTX.esc(ability.text)) +
            "</p>" +
            "</div>"
          );
        })
        .join("") +
      "</div></div>"
    );
  }

  /**
   * 캐릭터 시트의 무기는 한글(영어)로 병기한다.
   * 한글표와 영문표는 행 순서가 같지만 행 수가 어긋날 수 있어, 같을 때만 짝을 짓는다.
   */
  function weaponRows(operative) {
    var rowsEn = weaponRowsEn(operative.weapons);
    var rowsKo = operative.weaponsKo;

    if (!rowsKo.length) return { rows: rowsEn, caption: "무기 (한글본 없음 · 영문 원본)" };
    if (rowsKo.length !== rowsEn.length) return { rows: rowsKo, caption: "무기" };

    return {
      rows: rowsKo.map(function (row, index) {
        return Object.assign({}, row, { nameEn: rowsEn[index].name });
      }),
      caption: "무기",
    };
  }

  /* ─── 담기 컨트롤 ──────────────────────────────────────── */

  /** 담기 전에는 버튼 하나, 담은 뒤에는 인원 조절기. */
  function operativeControl(operativeId) {
    var count = KTR.unitCount(current.id, operativeId);
    var id = KTX.esc(operativeId);

    if (!count) {
      return '<button type="button" class="roster-btn" data-roster-add="' + id + '">담기</button>';
    }

    return (
      '<span class="roster-step">' +
      '<button type="button" data-roster-remove="' +
      id +
      '" aria-label="한 명 빼기">−</button>' +
      "<b>" +
      count +
      "</b>" +
      '<button type="button" data-roster-add="' +
      id +
      '" aria-label="한 명 더">+</button>' +
      "</span>"
    );
  }

  /** 지금 편집 중인 인스턴스. 없거나 사라졌으면 첫 번째를 쓴다. */
  function activeUidOf(operativeId) {
    var list = KTR.unitsOf(current.id, operativeId);
    if (!list.length) return null;

    var chosen = activeUnit[operativeId];
    var exists = list.some(function (unit) {
      return unit.uid === chosen;
    });
    return exists ? chosen : list[0].uid;
  }

  /** 같은 요원을 둘 이상 담았을 때만 인스턴스 탭을 보여준다. */
  function unitTabs(operativeId) {
    var list = KTR.unitsOf(current.id, operativeId);
    if (list.length < 2) return "";

    var active = activeUidOf(operativeId);
    return (
      '<div class="unit-tabs" role="tablist">' +
      list
        .map(function (unit, index) {
          var picked = unit.weapons.length;
          return (
            '<button type="button" role="tab" class="unit-tab' +
            (unit.uid === active ? " is-active" : "") +
            '" data-unit-tab="' +
            KTX.esc(unit.uid) +
            '" data-unit-op="' +
            KTX.esc(operativeId) +
            '" aria-selected="' +
            (unit.uid === active ? "true" : "false") +
            '">' +
            (index + 1) +
            "번째" +
            (picked ? " · " + picked : "") +
            "</button>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function operativeCard(operative) {
    var uid = activeUidOf(operative.id);
    var weapons = weaponRows(operative);
    var count = KTR.unitCount(current.id, operative.id);

    return (
      '<article class="operative" id="' +
      KTX.esc(operative.id) +
      '">' +
      '<header class="operative__head">' +
      '<h3 class="operative__name">' +
      KTX.nameWithEn(operative.nameKo, operative.nameEn) +
      "</h3>" +
      '<span class="roster-control" data-roster-control="' +
      KTX.esc(operative.id) +
      '">' +
      operativeControl(operative.id) +
      "</span>" +
      statblock(operative.stats) +
      "</header>" +
      '<div class="operative__body">' +
      unitTabs(operative.id) +
      (count
        ? '<p class="loadout-hint">체크한 무기가 내 로스터에 담깁니다. 몇 개를 골라야 하는지는 아래 <a href="#selection">편성 가이드</a>를 확인하세요.</p>'
        : "") +
      weaponTable(weapons.rows, weapons.caption, uid) +
      abilityList(operative.abilitiesKo) +
      "</div></article>"
    );
  }

  /* ─── 플로이 · 장비 ────────────────────────────────────── */

  /** 설명은 한글을 쓰고, 한글본이 없을 때만 영문을 대신 보여준다. */
  function description(textKo, textEn) {
    if (textKo) return '<p class="entry__ko">' + KTX.linkifyTerms(KTX.esc(textKo)) + "</p>";
    if (textEn) return '<p class="entry__en">' + KTX.linkifyTerms(KTX.esc(textEn)) + "</p>";
    return "";
  }

  /** 로스터에 담아둘 항목(장비·플로이)을 켜고 끄는 버튼. */
  function pickButton(attribute, id, isOn) {
    return (
      '<button type="button" class="roster-pick' +
      (isOn ? " is-on" : "") +
      '" ' +
      attribute +
      '="' +
      KTX.esc(id) +
      '" aria-pressed="' +
      (isOn ? "true" : "false") +
      '">' +
      (isOn ? "담김" : "담기") +
      "</button>"
    );
  }

  /* 플로이는 팀이 가진 것을 모두 쓸 수 있어 고르는 대상이 아니다 — 담기 버튼이 없다. */
  function ployEntry(ploy) {
    return (
      '<div class="entry entry--' +
      KTX.esc(ploy.type) +
      '" data-entry="' +
      KTX.esc(ploy.id) +
      '">' +
      '<div class="entry__head">' +
      '<span class="entry__name">' +
      KTX.esc(ploy.name) +
      "</span>" +
      KTX.badge(PLOY_LABEL[ploy.type] || ploy.type, "", ploy.type) +
      KTX.badge("CP", ploy.cp) +
      "</div>" +
      description(ploy.textKo, ploy.textEn) +
      "</div>"
    );
  }

  function equipmentEntry(item) {
    var isOn = KTR.hasEquipment(current.id, item.id);

    return (
      '<div class="entry' +
      (isOn ? " is-picked" : "") +
      '" data-entry="' +
      KTX.esc(item.id) +
      '">' +
      '<div class="entry__head"><span class="entry__name">' +
      KTX.esc(item.name) +
      "</span>" +
      pickButton("data-roster-equip", item.id, isOn) +
      "</div>" +
      description(item.textKo, item.textEn) +
      "</div>"
    );
  }

  /* ─── 편성 가이드 · 팩션 규칙 ──────────────────────────── */

  function guideSection(section) {
    if (!section || !section.blocks.length) {
      return '<p class="empty">자료 없음</p>';
    }

    var blocks = section.blocks
      .map(function (block) {
        var cls = block.type === "heading" ? "guide__heading" : "guide__text";
        return '<p class="' + cls + '">' + KTX.linkifyTerms(KTX.esc(block.text)) + "</p>";
      })
      .join("");

    return '<div class="guide">' + blocks + "</div>";
  }

  /* ─── 내 로스터 ────────────────────────────────────────── */

  /**
   * 인원은 편성 정원과 비교해 보여준다.
   * 요원 목록 안의 선택 제약("↘ 1 … 중 선택")은 원본이 자연어라 자동 검증하지 않는다.
   */
  function renderRosterBar() {
    var bar = document.getElementById("roster-bar");
    if (!bar) return;

    var entry = KTR.teamEntry(current.id);
    var picked = KTR.totalUnits(current.id);
    var size = (current.size && current.size.total) || 0;
    var isOver = size > 0 && picked > size;
    var isEmpty = picked === 0 && !entry.equipment.length;

    bar.innerHTML =
      '<span class="roster-bar__counts">' +
      '<b class="' +
      (isOver ? "is-over" : "") +
      '">' +
      picked +
      (size ? " / " + size : "") +
      "</b>명" +
      "<span>장비 " +
      entry.equipment.length +
      "</span>" +
      "</span>" +
      (isOver ? '<span class="roster-bar__warn">정원 초과</span>' : "") +
      (KTR.hasSaveFailed()
        ? '<span class="roster-bar__warn">저장 실패 — 이 창에서만 유지됩니다</span>'
        : "") +
      '<span class="roster-bar__actions">' +
      (isEmpty
        ? ""
        : '<button type="button" class="roster-btn roster-btn--ghost" data-roster-clear>비우기</button>') +
      '<a class="roster-btn roster-btn--link" href="roster.html">내 로스터</a>' +
      "</span>";
  }

  function operativeById(operativeId) {
    return (
      current.operatives.filter(function (operative) {
        return operative.id === operativeId;
      })[0] || null
    );
  }

  /** 담기·무기 선택이 바뀌면 그 요원 카드만 다시 그린다. */
  function refreshOperative(operativeId) {
    var el = document.getElementById(operativeId);
    var operative = operativeById(operativeId);
    if (!el || !operative) return;

    el.outerHTML = operativeCard(operative);
    renderRosterBar();
  }

  /** 탭 라벨의 "· n"(고른 무기 수)만 갱신한다. */
  function updateTabCounts(card) {
    var list = KTR.unitsOf(current.id, card.id);

    card.querySelectorAll(".unit-tab").forEach(function (tab, index) {
      var unit = list[index];
      if (!unit) return;
      tab.textContent = index + 1 + "번째" + (unit.weapons.length ? " · " + unit.weapons.length : "");
    });
  }

  function refreshPick(button, isOn) {
    button.classList.toggle("is-on", isOn);
    button.setAttribute("aria-pressed", isOn ? "true" : "false");
    button.textContent = isOn ? "담김" : "담기";

    var entry = button.closest(".entry");
    if (entry) entry.classList.toggle("is-picked", isOn);
  }

  var ROSTER_SELECTOR =
    "[data-roster-add],[data-roster-remove],[data-roster-equip],[data-roster-clear],[data-unit-tab]";

  function bindRoster() {
    document.addEventListener("click", function (event) {
      var target = event.target.closest ? event.target.closest(ROSTER_SELECTOR) : null;
      if (!target) return;
      event.preventDefault();

      if (target.hasAttribute("data-roster-clear")) {
        KTR.clearTeam(current.id);
        activeUnit = {};
        renderAll();
        return;
      }

      var tabUid = target.getAttribute("data-unit-tab");
      if (tabUid) {
        var tabOp = target.getAttribute("data-unit-op");
        activeUnit[tabOp] = tabUid;
        refreshOperative(tabOp);
        return;
      }

      var addId = target.getAttribute("data-roster-add");
      if (addId) {
        activeUnit[addId] = KTR.addUnit(current.id, addId);
        refreshOperative(addId);
        return;
      }

      var removeId = target.getAttribute("data-roster-remove");
      if (removeId) {
        KTR.removeLastUnit(current.id, removeId);
        delete activeUnit[removeId];
        refreshOperative(removeId);
        return;
      }

      var equipId = target.getAttribute("data-roster-equip");
      if (equipId) {
        KTR.toggleEquipment(current.id, equipId);
        refreshPick(target, KTR.hasEquipment(current.id, equipId));
        renderRosterBar();
        return;
      }

    });

    /* 무기 체크박스 — 체크한 무기가 그 인스턴스의 장비가 된다. */
    document.addEventListener("change", function (event) {
      var box = event.target;
      if (!box.matches || !box.matches("input[type=checkbox][data-weapon]")) return;

      KTR.toggleUnitWeapon(current.id, box.getAttribute("data-unit"), box.getAttribute("data-weapon"));

      var row = box.closest("tr");
      if (row) row.classList.toggle("is-picked", box.checked);

      /*
       * 카드를 통째로 다시 그리면 방금 누른 체크박스가 사라져 연속 선택이 끊긴다.
       * 탭에 적힌 선택 개수만 고쳐 쓴다.
       */
      var card = box.closest(".operative");
      if (card) updateTabCounts(card);
    });
  }

  /** 용어 뜻풀이 출처를 밝힌다 — 번역 색인을 그대로 쓰고 있으므로. */
  function renderGlossaryCredit() {
    var el = document.getElementById("glossary-credit");
    if (!el) return;

    var credit = KTX.glossaryCredit();
    if (!credit) return;

    var note = credit.note && credit.note.ko ? " · " + credit.note.ko : "";
    el.textContent = (credit.short && credit.short.ko ? credit.short.ko : credit.ko || "") + note;
  }

  /* ─── 조립 ─────────────────────────────────────────────── */

  function notFound(id) {
    mount.innerHTML =
      '<div class="databar">' +
      "<strong>킬팀을 찾지 못했습니다</strong><br>" +
      "<code>" +
      KTX.esc(id || "(없음)") +
      "</code> — " +
      '<a href="index.html" style="text-decoration:underline">인덱스로 돌아가기</a>' +
      "</div>";
  }

  function renderHeader(team) {
    document.getElementById("team-name-ko").textContent = team.nameKo || team.nameEn;
    document.getElementById("team-name-en").textContent = team.nameKo ? "(" + team.nameEn + ")" : "";

    var backlink = document.getElementById("faction-back");
    backlink.href = "faction.html?f=" + encodeURIComponent(team.faction.id);
    backlink.textContent = "← " + team.faction.nameKo + "(" + team.faction.nameEn + ")";

    var size = team.size || {};
    var sizeText = size.total ? size.total + "명" : "-";
    if (size.min && size.min !== size.total) sizeText = size.min + "–" + size.total + "명";

    document.getElementById("team-facts").innerHTML =
      KTX.badge("편성", sizeText, "accent") +
      (team.archetype ? KTX.badge("아키타입", team.archetype) : "") +
      KTX.badge("요원", team.operatives.length) +
      KTX.badge("플로이", team.ploys.length) +
      KTX.badge("장비", team.equipment.length);

    document.getElementById("team-brief").textContent =
      (team.selectionGuide && team.selectionGuide.brief) || "";
  }

  function renderPloys(team) {
    var groups = ["strategy", "firefight"].map(function (type) {
      return {
        label: type === "strategy" ? "전략 플로이" : "화력전 플로이",
        items: team.ploys.filter(function (ploy) {
          return ploy.type === type;
        }),
      };
    });

    var html = groups
      .filter(function (group) {
        return group.items.length;
      })
      .map(function (group) {
        return (
          '<p class="subhead">' +
          KTX.esc(group.label) +
          "</p>" +
          '<div class="entry-list">' +
          group.items.map(ployEntry).join("") +
          "</div>"
        );
      })
      .join("");

    document.getElementById("ploy-body").innerHTML = html || '<p class="empty">자료 없음</p>';
    document.getElementById("ploy-count").textContent = team.ploys.length;
  }

  function renderEquipment(team) {
    var bonus = team.equipmentBonusKo
      ? '<div class="databar" style="margin-block:0 1rem">' +
        KTX.esc(team.equipmentBonusKo) +
        "</div>"
      : "";

    document.getElementById("equip-body").innerHTML =
      bonus +
      (team.equipment.length
        ? '<div class="entry-list">' + team.equipment.map(equipmentEntry).join("") + "</div>"
        : '<p class="empty">자료 없음</p>');

    document.getElementById("equip-count").textContent = team.equipment.length;
  }

  /** 로스터가 통째로 바뀌었을 때(비우기) 다시 그린다. */
  function renderAll() {
    document.getElementById("op-list").innerHTML = current.operatives.length
      ? current.operatives.map(operativeCard).join("")
      : '<p class="empty">자료 없음</p>';

    renderPloys(current);
    renderEquipment(current);
    renderRosterBar();
  }

  function main() {
    var id = KTX.param("t");
    var team = id ? KTX.findTeam(id) : null;

    if (!team) {
      notFound(id);
      return;
    }

    current = team;
    document.title = (team.nameKo || team.nameEn) + "(" + team.nameEn + ") — KT INDEX";
    KTX.setAccent(team.color);

    renderHeader(team);
    document.getElementById("op-count").textContent = team.operatives.length;
    renderAll();

    document.getElementById("selection-body").innerHTML = guideSection(team.selectionGuide);
    document.getElementById("faction-rule-body").innerHTML = guideSection(team.factionRule);

    renderGlossaryCredit();
    bindRoster();
    KTX.bindTerms(document);
    KTX.renderFooter(document.getElementById("site-footer"));
  }

  main();
})();
