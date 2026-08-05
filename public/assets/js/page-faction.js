/* 팩션 페이지 — ?f=<팩션ID> 소속 킬팀 목록. */
(function () {
  "use strict";

  var KTX = window.KTX;
  var mount = document.getElementById("page");
  if (!KTX.requireData(mount)) return;

  function teamCard(team) {
    var size = team.size && team.size.total ? team.size.total + "명" : "-";

    return (
      '<a class="team-card" href="team.html?t=' +
      encodeURIComponent(team.id) +
      '" style="--accent:' +
      KTX.esc(team.color || "var(--line-hard)") +
      '">' +
      '<h3 class="team-card__name">' +
      KTX.nameWithEn(team.nameKo, team.nameEn) +
      "</h3>" +
      (team.archetype ? '<p class="team-card__brief">' + KTX.esc(team.archetype) + "</p>" : "") +
      (team.brief ? '<p class="team-card__brief muted">' + KTX.esc(team.brief) + "</p>" : "") +
      '<div class="team-card__counts">' +
      KTX.badge("편성", size) +
      KTX.badge("요원", team.counts.operatives) +
      KTX.badge("플로이", team.counts.ploys) +
      KTX.badge("장비", team.counts.equipment) +
      "</div></a>"
    );
  }

  function notFound(id) {
    mount.innerHTML =
      '<div class="databar">' +
      "<strong>팩션을 찾지 못했습니다</strong><br>" +
      "<code>" +
      KTX.esc(id || "(없음)") +
      "</code> — " +
      '<a href="index.html" style="text-decoration:underline">인덱스로 돌아가기</a>' +
      "</div>";
  }

  function main() {
    var id = KTX.param("f");
    var faction = id ? KTX.findFaction(id) : null;

    if (!faction) {
      notFound(id);
      return;
    }

    document.title = faction.nameKo + "(" + faction.nameEn + ") — KT INDEX";

    /* 팩션 대표색은 원본에 없으므로 소속 첫 킬팀 색을 강조색으로 빌려 쓴다. */
    var lead = faction.teams.find(function (team) {
      return team.color;
    });
    KTX.setAccent(lead && lead.color);

    document.getElementById("faction-name-ko").textContent = faction.nameKo;
    document.getElementById("faction-name-en").textContent = "(" + faction.nameEn + ")";

    var operatives = faction.teams.reduce(function (sum, team) {
      return sum + team.counts.operatives;
    }, 0);
    var ploys = faction.teams.reduce(function (sum, team) {
      return sum + team.counts.ploys;
    }, 0);

    document.getElementById("faction-facts").innerHTML =
      KTX.badge("킬팀", faction.teams.length, "accent") +
      KTX.badge("요원", operatives) +
      KTX.badge("플로이", ploys) +
      (faction.sub ? KTX.badge("소속", faction.sub) : "");

    document.getElementById("team-count").textContent = faction.teams.length + "개";
    document.getElementById("team-grid").innerHTML = faction.teams.map(teamCard).join("");

    KTX.renderFooter(document.getElementById("site-footer"));
  }

  main();
})();
