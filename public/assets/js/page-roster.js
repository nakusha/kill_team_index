/* 내 로스터 — 담아둔 요원·장비·플로이를 한 화면에 모아 본다. */
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

  /**
   * 팀 상세와 같은 규칙 — 한글표에 영문 이름을 짝지어 붙인다.
   * 행 수가 어긋나면 잘못 짝짓느니 한글표만 쓴다.
   */
  function weaponRows(operative) {
    var rowsEn = weaponRowsEn(operative.weapons);
    var rowsKo = operative.weaponsKo;

    if (!rowsKo.length) return rowsEn;
    if (rowsKo.length !== rowsEn.length) return rowsKo;

    return rowsKo.map(function (row, index) {
      return Object.assign({}, row, { nameEn: rowsEn[index].name });
    });
  }

  function weaponTable(operative) {
    var rows = weaponRows(operative);
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

  function operativeCard(operative, count) {
    return (
      '<article class="operative">' +
      '<header class="operative__head">' +
      '<h3 class="operative__name">' +
      KTX.nameWithEn(operative.nameKo, operative.nameEn) +
      (count > 1 ? '<span class="roster-count">×' + count + "</span>" : "") +
      "</h3>" +
      statblock(operative.stats) +
      "</header>" +
      '<div class="operative__body">' +
      weaponTable(operative) +
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

  function pickedList(title, items, render) {
    if (!items.length) return "";
    return (
      '<p class="subhead">' +
      KTX.esc(title) +
      "</p><div class=\"entry-list\">" +
      items.map(render).join("") +
      "</div>"
    );
  }

  /** 저장된 ID 를 실제 데이터와 맞춰본다. 원본이 바뀌어 사라진 ID 는 건너뛴다. */
  function collect(team, entry) {
    var operatives = team.operatives
      .filter(function (operative) {
        return entry.operatives[operative.id] > 0;
      })
      .map(function (operative) {
        return { operative: operative, count: entry.operatives[operative.id] };
      });

    var equipment = team.equipment.filter(function (item) {
      return entry.equipment.indexOf(item.id) !== -1;
    });

    var ploys = team.ploys.filter(function (ploy) {
      return entry.ploys.indexOf(ploy.id) !== -1;
    });

    var total = operatives.reduce(function (sum, row) {
      return sum + row.count;
    }, 0);

    return { operatives: operatives, equipment: equipment, ploys: ploys, total: total };
  }

  function teamSection(team, entry) {
    var picked = collect(team, entry);
    var size = (team.size && team.size.total) || 0;
    var isOver = size > 0 && picked.total > size;

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
        picked.total + (size ? " / " + size : "") + "명",
        isOver ? "strategy" : "accent",
      ) +
      KTX.badge("장비", picked.equipment.length) +
      KTX.badge("플로이", picked.ploys.length) +
      '<a class="roster-btn roster-btn--link" href="team.html?t=' +
      encodeURIComponent(team.id) +
      '">편집</a>' +
      '<button type="button" class="roster-btn roster-btn--ghost" data-roster-clear="' +
      KTX.esc(team.id) +
      '">비우기</button>' +
      "</div></header>" +
      (isOver ? '<p class="roster-warn">편성 정원을 넘었습니다</p>' : "") +
      (picked.operatives.length
        ? '<div class="op-list">' +
          picked.operatives
            .map(function (row) {
              return operativeCard(row.operative, row.count);
            })
            .join("") +
          "</div>"
        : '<p class="empty">담은 요원이 없습니다</p>') +
      pickedList("장비", picked.equipment, equipmentEntry) +
      pickedList("플로이", picked.ploys, ployEntry) +
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
      '<button type="button" class="roster-btn roster-btn--ghost" data-roster-clear-all>전체 비우기</button>';
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
