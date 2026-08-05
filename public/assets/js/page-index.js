/* 인덱스 페이지 — 팩션 9개 그리드 + 킬팀 48개 즉시 검색. */
(function () {
  "use strict";

  var KTX = window.KTX;
  var mount = document.getElementById("page");
  if (!KTX.requireData(mount)) return;

  var SWATCH_LIMIT = 14; /* 색 스트립이 너무 잘게 쪼개지지 않게 */

  function renderHeroStats(el) {
    var counts = (KTX.data().meta || {}).counts || {};
    var stats = [
      { value: counts.factions, label: "팩션" },
      { value: counts.teams, label: "킬팀" },
      { value: counts.operatives, label: "요원" },
      { value: counts.ploys, label: "플로이" },
      { value: counts.equipment, label: "장비" },
    ];

    el.innerHTML = stats
      .map(function (stat) {
        return (
          '<div class="hero__stat"><b>' +
          KTX.esc(stat.value || 0) +
          "</b><span>" +
          KTX.esc(stat.label) +
          "</span></div>"
        );
      })
      .join("");
  }

  function factionCard(faction) {
    var swatches = faction.teams
      .slice(0, SWATCH_LIMIT)
      .map(function (team) {
        return '<i style="--swatch:' + KTX.esc(team.color || "var(--line-hard)") + '"></i>';
      })
      .join("");

    var operatives = faction.teams.reduce(function (sum, team) {
      return sum + (team.counts ? team.counts.operatives : 0);
    }, 0);

    return (
      '<a class="faction-card" href="faction.html?f=' +
      encodeURIComponent(faction.id) +
      '">' +
      '<h3 class="faction-card__name">' +
      KTX.esc(faction.nameKo) +
      (faction.sub ? "<small>" + KTX.esc(faction.sub) + "</small>" : "") +
      "</h3>" +
      '<div class="faction-card__swatches" aria-hidden="true">' +
      swatches +
      "</div>" +
      '<div class="faction-card__meta">' +
      "<span>킬팀 <b>" +
      faction.teams.length +
      "</b></span>" +
      "<span>요원 " +
      operatives +
      "</span>" +
      "</div></a>"
    );
  }

  function teamCard(team) {
    var size = team.size && team.size.total ? team.size.total + "명" : "-";

    return (
      '<a class="team-card" href="team.html?t=' +
      encodeURIComponent(team.id) +
      '" style="--accent:' +
      KTX.esc(team.color || "var(--line-hard)") +
      '">' +
      '<span class="team-card__eyebrow">' +
      KTX.esc(team.factionKo) +
      "</span>" +
      '<h3 class="team-card__name">' +
      KTX.nameWithEn(team.nameKo, team.nameEn) +
      "</h3>" +
      (team.brief ? '<p class="team-card__brief">' + KTX.esc(team.brief) + "</p>" : "") +
      '<div class="team-card__counts">' +
      KTX.badge("편성", size) +
      KTX.badge("요원", team.counts.operatives) +
      KTX.badge("플로이", team.counts.ploys) +
      KTX.badge("장비", team.counts.equipment) +
      "</div></a>"
    );
  }

  /** 한글·영문·ID·아키타입·팩션명을 한 번에 훑는 단순 부분일치 검색. */
  function matches(team, query) {
    if (!query) return true;
    var haystack = [
      team.id,
      team.nameEn,
      team.nameKo,
      team.archetype,
      team.brief,
      team.factionEn,
      team.factionKo,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return query
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .every(function (token) {
        return haystack.indexOf(token) !== -1;
      });
  }

  function main() {
    renderHeroStats(document.getElementById("hero-stats"));

    document.getElementById("faction-grid").innerHTML = KTX.factions().map(factionCard).join("");

    var teams = KTX.allTeamSummaries();
    var results = document.getElementById("team-results");
    var counter = document.getElementById("team-count");
    var input = document.getElementById("search-input");

    function paint() {
      var query = input.value.trim();
      var visible = teams.filter(function (team) {
        return matches(team, query);
      });

      counter.textContent = visible.length + " / " + teams.length;
      results.innerHTML = visible.length
        ? visible.map(teamCard).join("")
        : '<p class="empty">일치하는 킬팀이 없습니다</p>';
    }

    input.addEventListener("input", paint);
    paint();

    KTX.renderFooter(document.getElementById("site-footer"));
  }

  main();
})();
