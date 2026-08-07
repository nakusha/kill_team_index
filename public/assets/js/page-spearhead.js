/* 스피어헤드 색인 — 팩션별 아미 목록과 즉시 검색. */
(function () {
  "use strict";

  var AOSX = window.AOSX;
  var mount = document.getElementById("page");
  if (!AOSX.requireData(mount)) return;

  /* 팩션마다 카드 인상이 달라지도록 이름에서 색을 정한다 — 원본에 대표색이 없다. */
  function hueOf(name) {
    var sum = 0;
    for (var i = 0; i < name.length; i += 1) sum = (sum + name.charCodeAt(i) * (i + 7)) % 360;
    return sum;
  }

  function armyCard(army) {
    return (
      '<a class="team-card" href="army.html?a=' +
      encodeURIComponent(army.id) +
      '" style="--accent: oklch(70% 0.14 ' + hueOf(army.faction) + ')">' +
      '<span class="team-card__eyebrow">' + AOSX.esc(army.faction) + "</span>" +
      '<h3 class="team-card__name">' + AOSX.esc(army.name) + "</h3>" +
      '<div class="team-card__counts">' +
      AOSX.badge("유닛", army.units.length) +
      AOSX.badge("레지먼트", AOSX.regimentsOf(army).length) +
      AOSX.badge("인핸스먼트", AOSX.enhancementsOf(army).length) +
      "</div></a>"
    );
  }

  function matches(army, query) {
    if (!query) return true;
    var haystack = [army.name, army.faction, army.id].join(" ").toLowerCase();

    return query
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .every(function (token) {
        return haystack.indexOf(token) !== -1;
      });
  }

  function renderStats() {
    var counts = (AOSX.data().meta || {}).counts || {};
    var stats = [
      { value: counts.armies, label: "아미" },
      { value: counts.units, label: "유닛" },
      { value: counts.weapons, label: "무장" },
      { value: counts.regiments, label: "레지먼트" },
      { value: counts.enhancements, label: "인핸스먼트" },
    ];

    document.getElementById("hero-stats").innerHTML = stats
      .map(function (stat) {
        return (
          '<div class="hero__stat"><b>' + AOSX.esc(stat.value || 0) + "</b>" +
          "<span>" + AOSX.esc(stat.label) + "</span></div>"
        );
      })
      .join("");
  }

  function main() {
    renderStats();

    var groups = AOSX.byFaction();
    var results = document.getElementById("army-results");
    var counter = document.getElementById("army-count");
    var input = document.getElementById("search-input");
    var total = AOSX.armies().length;

    function paint() {
      var query = input.value.trim();
      var shown = 0;

      var html = groups
        .map(function (group) {
          var armies = group.armies.filter(function (army) {
            return matches(army, query);
          });
          if (!armies.length) return "";

          shown += armies.length;
          return (
            '<section class="faction-group">' +
            '<div class="section__head">' +
            "<h2>" + AOSX.esc(group.faction) + "</h2>" +
            '<span class="section__count">' + armies.length + "개</span>" +
            "</div>" +
            '<div class="team-grid">' + armies.map(armyCard).join("") + "</div>" +
            "</section>"
          );
        })
        .join("");

      counter.textContent = shown + " / " + total;
      results.innerHTML = html || '<p class="empty">일치하는 아미가 없습니다</p>';
    }

    input.addEventListener("input", paint);
    paint();

    AOSX.renderFooter(document.getElementById("site-footer"));
  }

  main();
})();
