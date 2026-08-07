/*
 * 스피어헤드 데이터 접근과 렌더 헬퍼.
 *
 * data/aos-data.js 가 window.AOS 에 전체를 얹어두므로 런타임 fetch 가 없다.
 * 킬팀 쪽 store.js 와 역할은 같지만 데이터 모양이 달라 따로 둔다.
 */
window.AOSX = (function () {
  "use strict";

  var HTML_ESCAPE = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  var REGIMENT = "레지먼트 어빌리티";
  var ENHANCEMENT = "인핸스먼트";

  /** 데이터는 믿을 만하지만 이름·설명이 innerHTML 에 들어가므로 항상 이스케이프한다. */
  function esc(value) {
    if (value === null || value === undefined) return "";
    return String(value).replace(/[&<>"']/g, function (ch) {
      return HTML_ESCAPE[ch];
    });
  }

  function param(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function data() {
    return window.AOS || null;
  }

  function armies() {
    var bundle = data();
    return bundle ? bundle.armies : [];
  }

  function findArmy(id) {
    return (
      armies().filter(function (army) {
        return army.id === id;
      })[0] || null
    );
  }

  /** 데이터 번들이 없으면 안내를 띄우고 false 를 돌려준다. */
  function requireData(mountEl) {
    if (data() && data().armies) return true;

    if (mountEl) {
      mountEl.innerHTML =
        '<div class="databar">' +
        "<strong>스피어헤드 데이터를 찾지 못했습니다</strong><br>" +
        "<code>data/aos-data.js</code> 가 없습니다. 프로젝트 루트에서 아래를 실행하세요.<br>" +
        "<code>node tools/parse-spearhead.mjs</code>" +
        "</div>";
    }
    return false;
  }

  /** 팩션별로 아미를 묶는다 — 같은 팩션에 스피어헤드가 둘 이상인 경우가 있다. */
  function byFaction() {
    var groups = [];
    var index = {};

    armies().forEach(function (army) {
      if (!index[army.faction]) {
        index[army.faction] = { faction: army.faction, armies: [] };
        groups.push(index[army.faction]);
      }
      index[army.faction].armies.push(army);
    });

    return groups;
  }

  /** 게임에서 고르는 것 — 레지먼트 1개, 인핸스먼트 1개. */
  function abilitiesOf(army, group) {
    return (army.armyAbilities || []).filter(function (ability) {
      return ability.group === group;
    });
  }

  const regimentsOf = (army) => abilitiesOf(army, REGIMENT);
  const enhancementsOf = (army) => abilitiesOf(army, ENHANCEMENT);

  /** 어느 소제목에도 안 걸린 것 — 늘 적용되는 아미 고유 능력이다. */
  function alwaysOn(army) {
    return (army.armyAbilities || []).filter(function (ability) {
      return ability.group !== REGIMENT && ability.group !== ENHANCEMENT;
    });
  }

  function badge(label, value, variant) {
    var cls = "badge" + (variant ? " badge--" + variant : "");
    var isBare = value === undefined || value === null || value === "";
    var body = isBare ? esc(label) : esc(label) + " <b>" + esc(value) + "</b>";
    return '<span class="' + cls + '">' + body + "</span>";
  }

  /** 능력 한 덩이 — 타이밍 · 이름 · 선언 · 효과. */
  function abilityCard(ability, options) {
    var opts = options || {};

    return (
      '<div class="entry' +
      (opts.picked ? " is-picked" : "") +
      '"' +
      (opts.attribute ? " " + opts.attribute : "") +
      ">" +
      '<div class="entry__head">' +
      '<span class="entry__name">' +
      esc(ability.name) +
      "</span>" +
      badge(ability.timing) +
      (opts.action || "") +
      "</div>" +
      (ability.declare ? '<p class="entry__declare">선언: ' + esc(ability.declare) + "</p>" : "") +
      '<p class="entry__ko">' +
      esc(ability.effect) +
      "</p>" +
      "</div>"
    );
  }

  function statblock(stats) {
    var cells = [
      { label: "이동", value: stats.move },
      { label: "체력", value: stats.health },
      { label: "방호", value: stats.save },
      { label: "점령", value: stats.control },
    ];

    return (
      '<div class="statblock">' +
      cells
        .map(function (cell) {
          var value = cell.value === null || cell.value === "" ? "-" : cell.value;
          return "<div><b>" + esc(value) + "</b><span>" + esc(cell.label) + "</span></div>";
        })
        .join("") +
      "</div>"
    );
  }

  function weaponTable(weapons) {
    if (!weapons.length) return "";

    var cell = (value, label) =>
      '<td class="num" data-label="' + label + '">' + esc(value || "–") + "</td>";

    var body = weapons
      .map(function (weapon) {
        return (
          "<tr>" +
          '<td class="wname">' +
          esc(weapon.name) +
          "</td>" +
          cell(weapon.range, "사거리") +
          cell(weapon.attacks, "공격") +
          cell(weapon.hit, "명중") +
          cell(weapon.wound, "피해") +
          cell(weapon.rend, "관통") +
          cell(weapon.damage, "대미지") +
          '<td class="wrules" data-label="능력">' +
          esc(weapon.rules) +
          "</td>" +
          "</tr>"
        );
      })
      .join("");

    return (
      '<div class="table-scroll"><table class="wtable">' +
      "<thead><tr>" +
      "<th>무장</th><th>사거리</th><th>공격</th><th>명중</th><th>피해</th><th>관통</th><th>대미지</th><th>능력</th>" +
      "</tr></thead><tbody>" +
      body +
      "</tbody></table></div>"
    );
  }

  /** 유닛 카드 하나 — 스탯 · 무장 · 능력 · 키워드. */
  function unitCard(unit) {
    return (
      '<article class="operative">' +
      '<header class="operative__head">' +
      '<h3 class="operative__name">' +
      esc(unit.name) +
      "</h3>" +
      statblock(unit.stats) +
      "</header>" +
      '<div class="operative__body">' +
      weaponTable(unit.weapons || []) +
      ((unit.abilities || []).length
        ? '<div><p class="subhead">능력</p><div class="entry-list">' +
          unit.abilities
            .map(function (ability) {
              return abilityCard(ability);
            })
            .join("") +
          "</div></div>"
        : "") +
      ((unit.keywords || []).length
        ? '<p class="unit-keywords">키워드: ' + esc(unit.keywords.join(", ")) + "</p>"
        : "") +
      "</div></article>"
    );
  }

  function formatDate(iso) {
    if (!iso) return "알 수 없음";
    var date = new Date(iso);
    if (Number.isNaN(date.getTime())) return esc(iso);

    var pad = function (n) {
      return String(n).padStart(2, "0");
    };
    return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
  }

  function renderFooter(mountEl) {
    if (!mountEl) return;
    var meta = (data() && data().meta) || {};
    var counts = meta.counts || {};

    mountEl.innerHTML =
      "<p>출처 — " + esc(meta.source || "-") + "</p>" +
      "<p>자료 기준 — " + formatDate(meta.generatedAt) + "</p>" +
      "<p>아미 " + esc(counts.armies || 0) + " · 유닛 " + esc(counts.units || 0) +
      " · 레지먼트 " + esc(counts.regiments || 0) +
      " · 인핸스먼트 " + esc(counts.enhancements || 0) + "</p>" +
      "<p>판정은 공식 규칙이 우선합니다.</p>";
  }

  return {
    REGIMENT: REGIMENT,
    ENHANCEMENT: ENHANCEMENT,
    esc: esc,
    param: param,
    data: data,
    armies: armies,
    findArmy: findArmy,
    requireData: requireData,
    byFaction: byFaction,
    abilitiesOf: abilitiesOf,
    regimentsOf: regimentsOf,
    enhancementsOf: enhancementsOf,
    alwaysOn: alwaysOn,
    badge: badge,
    abilityCard: abilityCard,
    statblock: statblock,
    weaponTable: weaponTable,
    unitCard: unitCard,
    formatDate: formatDate,
    renderFooter: renderFooter,
  };
})();
