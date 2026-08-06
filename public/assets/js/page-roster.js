/* 내 로스터 — 담아둔 요원(인스턴스별 무기)·장비·플로이·팩션 규칙을 모아 본다. */
(function () {
  "use strict";

  var KTX = window.KTX;
  var KTR = window.KTR;
  var mount = document.getElementById("page");
  if (!KTX.requireData(mount)) return;

  var RANGE_PATTERN = /^\s*(?:사거리|Range)\s*(.+?)\s*$/i;
  var PLOY_LABEL = { strategy: "전략", firefight: "화력전" };

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

  /** 팀 상세와 같은 규칙 — 행 수가 맞을 때만 한글표에 영문 이름을 짝지어 붙인다. */
  function weaponRows(operative) {
    var rowsEn = weaponRowsEn(operative.weapons);
    var rowsKo = operative.weaponsKo;

    if (!rowsKo.length) return rowsEn;
    if (rowsKo.length !== rowsEn.length) return rowsKo;

    return rowsKo.map(function (row, index) {
      return Object.assign({}, row, { nameEn: rowsEn[index].name });
    });
  }

  function weaponTable(rows) {
    if (!rows.length) return "";

    var body = rows
      .map(function (row) {
        var split = splitRange(row.rules);
        return (
          "<tr>" +
          '<td class="wname">' +
          KTX.nameWithEn(row.name, row.nameEn) +
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
      '<div class="table-scroll"><table class="wtable">' +
      "<thead><tr>" +
      "<th>무기</th><th>구분</th><th>사거리</th><th>공격</th><th>명중</th><th>피해</th><th>특수 규칙</th>" +
      "</tr></thead><tbody>" +
      body +
      "</tbody></table></div>"
    );
  }

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

  function abilityList(abilities) {
    if (!abilities.length) return "";

    return (
      '<div><p class="subhead">능력</p><div class="entry-list">' +
      abilities
        .map(function (ability) {
          return (
            '<div class="entry">' +
            '<div class="entry__head"><span class="entry__name">' +
            KTX.esc(ability.name) +
            "</span></div>" +
            '<p class="entry__ko">' +
            KTX.linkifyTerms(KTX.esc(ability.text)) +
            "</p></div>"
          );
        })
        .join("") +
      "</div></div>"
    );
  }

  /**
   * 인스턴스 하나 = 요원 한 명.
   * 무기를 골랐으면 그것만, 안 골랐으면 전체를 보여주고 미선택임을 밝힌다.
   * 저장된 이름이 데이터에 없으면(원본 갱신 등) 조용히 넘기지 않고 알린다.
   */
  function unitCard(operative, unit, index, total) {
    var rows = weaponRows(operative);
    var chosen = unit.weapons || [];

    var shown = chosen.length
      ? rows.filter(function (row) {
          return chosen.indexOf(row.name) !== -1;
        })
      : rows;

    var known = rows.map(function (row) {
      return row.name;
    });
    var missing = chosen.filter(function (name) {
      return known.indexOf(name) === -1;
    });

    return (
      '<article class="operative">' +
      '<header class="operative__head">' +
      '<h3 class="operative__name">' +
      KTX.nameWithEn(operative.nameKo, operative.nameEn) +
      (total > 1 ? '<span class="roster-count">' + (index + 1) + "번째</span>" : "") +
      (chosen.length ? "" : '<span class="roster-count roster-count--warn">무기 미선택</span>') +
      "</h3>" +
      statblock(operative.stats) +
      "</header>" +
      '<div class="operative__body">' +
      (missing.length
        ? '<p class="roster-warn">저장된 무기 ' +
          missing.length +
          "개가 지금 데이터에 없어 표시하지 못했습니다 — " +
          KTX.esc(missing.join(", ")) +
          "</p>"
        : "") +
      weaponTable(shown) +
      abilityList(operative.abilitiesKo) +
      "</div></article>"
    );
  }

  function ployEntry(ploy) {
    return (
      '<div class="entry entry--' +
      KTX.esc(ploy.type) +
      '">' +
      '<div class="entry__head">' +
      '<span class="entry__name">' +
      KTX.esc(ploy.name) +
      "</span>" +
      KTX.badge(PLOY_LABEL[ploy.type] || ploy.type, "", ploy.type) +
      KTX.badge("CP", ploy.cp) +
      "</div>" +
      (ploy.textKo ? '<p class="entry__ko">' + KTX.linkifyTerms(KTX.esc(ploy.textKo)) + "</p>" : "") +
      "</div>"
    );
  }

  function equipmentEntry(item) {
    return (
      '<div class="entry">' +
      '<div class="entry__head"><span class="entry__name">' +
      KTX.esc(item.name) +
      "</span></div>" +
      (item.textKo ? '<p class="entry__ko">' + KTX.linkifyTerms(KTX.esc(item.textKo)) + "</p>" : "") +
      "</div>"
    );
  }

  /**
   * 플로이는 팀이 가진 것을 모두 쓸 수 있으므로 고르는 대상이 아니다.
   * 담은 것만이 아니라 그 팀의 전부를 전략 · 화력전으로 나눠 싣는다.
   */
  function ployGroups(team) {
    return ["strategy", "firefight"]
      .map(function (type) {
        var items = team.ploys.filter(function (ploy) {
          return ploy.type === type;
        });
        if (!items.length) return "";

        var label = type === "strategy" ? "전략 플로이" : "화력전 플로이";
        return (
          '<p class="subhead">' +
          label +
          '</p><div class="entry-list">' +
          items.map(ployEntry).join("") +
          "</div>"
        );
      })
      .join("");
  }

  function pickedList(title, items, render) {
    if (!items.length) return "";
    return (
      '<p class="subhead">' +
      KTX.esc(title) +
      '</p><div class="entry-list">' +
      items.map(render).join("") +
      "</div>"
    );
  }

  /**
   * 팩션 규칙은 펼친 채로 둔다 — 게임 중에는 플로이와 함께 바로 보여야 한다.
   * 길다고 느끼면 접을 수 있게 details 는 유지한다.
   */
  function factionRuleBlock(team) {
    var rule = team.factionRule;
    if (!rule || !rule.blocks.length) return "";

    var body = rule.blocks
      .map(function (block) {
        var cls = block.type === "heading" ? "guide__heading" : "guide__text";
        return '<p class="' + cls + '">' + KTX.linkifyTerms(KTX.esc(block.text)) + "</p>";
      })
      .join("");

    return (
      '<details class="roster-rule" open>' +
      "<summary>팩션 규칙" +
      (rule.brief ? ' <span class="roster-rule__brief">' + KTX.esc(rule.brief) + "</span>" : "") +
      "</summary>" +
      '<div class="guide">' +
      body +
      "</div></details>"
    );
  }

  /** 저장된 ID 를 실제 데이터와 맞춰본다. 사라진 요원 인스턴스는 건너뛴다. */
  function collect(team, entry) {
    var byId = {};
    team.operatives.forEach(function (operative) {
      byId[operative.id] = operative;
    });

    var units = (entry.units || [])
      .filter(function (unit) {
        return byId[unit.opId];
      })
      .map(function (unit) {
        return { unit: unit, operative: byId[unit.opId] };
      });

    var equipment = team.equipment.filter(function (item) {
      return entry.equipment.indexOf(item.id) !== -1;
    });

    var unpicked = units.filter(function (row) {
      return !row.unit.weapons.length;
    }).length;

    return { units: units, equipment: equipment, unpicked: unpicked };
  }

  /** 같은 요원이 여러 명이면 몇 번째인지 붙여 준다. */
  function unitCards(units) {
    var seen = {};
    var totals = {};

    units.forEach(function (row) {
      totals[row.unit.opId] = (totals[row.unit.opId] || 0) + 1;
    });

    return units
      .map(function (row) {
        var opId = row.unit.opId;
        var index = seen[opId] || 0;
        seen[opId] = index + 1;
        return unitCard(row.operative, row.unit, index, totals[opId]);
      })
      .join("");
  }

  function teamSection(team, entry) {
    var picked = collect(team, entry);
    var size = (team.size && team.size.total) || 0;
    var isOver = size > 0 && picked.units.length > size;

    return (
      '<section class="roster-team" style="--accent:' +
      KTX.esc(team.color || "var(--line-hard)") +
      '">' +
      '<header class="roster-team__head">' +
      "<div>" +
      '<h2 class="roster-team__name">' +
      KTX.esc(team.nameKo || team.nameEn) +
      "</h2>" +
      '<p class="roster-team__meta">' +
      KTX.esc(team.faction.nameKo) +
      "</p>" +
      "</div>" +
      '<div class="roster-team__actions">' +
      KTX.badge(
        "편성",
        picked.units.length + (size ? " / " + size : "") + "명",
        isOver ? "strategy" : "accent",
      ) +
      KTX.badge("장비", picked.equipment.length) +
      KTX.badge("플로이", team.ploys.length) +
      (picked.unpicked ? KTX.badge("무기 미선택", picked.unpicked + "명", "strategy") : "") +
      '<a class="roster-btn roster-btn--link" href="team.html?t=' +
      encodeURIComponent(team.id) +
      '">편집</a>' +
      '<button type="button" class="roster-btn roster-btn--ghost" data-roster-clear="' +
      KTX.esc(team.id) +
      '">비우기</button>' +
      "</div></header>" +
      (isOver ? '<p class="roster-warn">편성 정원을 넘었습니다</p>' : "") +
      /* 팀 전체에 걸리는 것(팩션 규칙 · 플로이 · 장비)을 먼저, 개별 요원 시트를 뒤에 둔다. */
      '<div class="roster-common">' +
      factionRuleBlock(team) +
      ployGroups(team) +
      pickedList("장비", picked.equipment, equipmentEntry) +
      "</div>" +
      (picked.units.length
        ? '<p class="subhead">요원</p><div class="op-list">' + unitCards(picked.units) + "</div>"
        : '<p class="empty">담은 요원이 없습니다</p>') +
      "</section>"
    );
  }

  function renderEmpty() {
    document.getElementById("roster-body").innerHTML =
      '<div class="databar">' +
      "<strong>담은 것이 없습니다</strong><br>" +
      "킬팀 상세에서 요원·장비·플로이를 담으면 여기 모입니다.<br>" +
      '<a href="index.html" style="text-decoration:underline">킬팀 고르러 가기</a>' +
      "</div>";
    document.getElementById("roster-actions").innerHTML = "";
  }

  function render() {
    var ids = KTR.teamIds();

    if (!ids.length) {
      renderEmpty();
      return;
    }

    var sections = ids
      .map(function (teamId) {
        var team = KTX.findTeam(teamId);
        return team ? teamSection(team, KTR.teamEntry(teamId)) : "";
      })
      .filter(Boolean);

    document.getElementById("roster-body").innerHTML =
      sections.join("") || '<p class="empty">담은 킬팀을 데이터에서 찾지 못했습니다</p>';

    document.getElementById("roster-actions").innerHTML =
      '<button type="button" class="roster-btn roster-btn--ghost" data-roster-clear-all>전체 비우기</button>' +
      (KTR.hasSaveFailed()
        ? '<span class="roster-bar__warn">저장 실패 — 이 창에서만 유지됩니다</span>'
        : "");
  }

  function bind() {
    document.addEventListener("click", function (event) {
      var target = event.target.closest
        ? event.target.closest("[data-roster-clear],[data-roster-clear-all]")
        : null;
      if (!target) return;
      event.preventDefault();

      if (target.hasAttribute("data-roster-clear-all")) {
        KTR.clearAll();
      } else {
        KTR.clearTeam(target.getAttribute("data-roster-clear"));
      }
      render();
    });
  }

  render();
  bind();
  KTX.bindTerms(document);
  KTX.renderFooter(document.getElementById("site-footer"));
})();
