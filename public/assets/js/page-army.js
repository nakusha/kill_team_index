/* 아미 상세 — 아미 특성, 고르는 능력(레지먼트·인핸스먼트), 유닛 시트. */
(function () {
  "use strict";

  var AOSX = window.AOSX;
  var mount = document.getElementById("page");
  if (!AOSX.requireData(mount)) return;

  function notFound(id) {
    mount.innerHTML =
      '<div class="databar">' +
      "<strong>아미를 찾지 못했습니다</strong><br>" +
      "<code>" + AOSX.esc(id || "(없음)") + "</code> — " +
      '<a href="spearhead.html" style="text-decoration:underline">스피어헤드 색인으로</a>' +
      "</div>";
  }

  function abilityList(abilities, emptyText) {
    if (!abilities.length) return '<p class="empty">' + AOSX.esc(emptyText) + "</p>";
    return (
      '<div class="entry-list">' +
      abilities
        .map(function (ability) {
          return AOSX.abilityCard(ability);
        })
        .join("") +
      "</div>"
    );
  }

  function main() {
    var id = AOSX.param("a");
    var army = id ? AOSX.findArmy(id) : null;

    if (!army) {
      notFound(id);
      return;
    }

    document.title = army.name + " — KT INDEX";

    document.getElementById("army-faction").textContent = army.faction;
    document.getElementById("army-name").textContent = army.name;

    var regiments = AOSX.regimentsOf(army);
    var enhancements = AOSX.enhancementsOf(army);

    document.getElementById("army-facts").innerHTML =
      AOSX.badge("유닛", army.units.length, "accent") +
      AOSX.badge("레지먼트", regiments.length) +
      AOSX.badge("인핸스먼트", enhancements.length) +
      (army.commander ? AOSX.badge("지휘관", army.commander) : "") +
      AOSX.badge("원본", army.page + "쪽");

    document.getElementById("always-body").innerHTML = abilityList(
      AOSX.alwaysOn(army),
      "자료 없음",
    );
    document.getElementById("regiment-body").innerHTML = abilityList(
      regiments,
      "원본에 레지먼트 어빌리티 소제목이 없습니다 — 위쪽 아미 특성을 확인하세요.",
    );
    document.getElementById("enhancement-body").innerHTML = abilityList(
      enhancements,
      "원본에 인핸스먼트 소제목이 없습니다 — 위쪽 아미 특성을 확인하세요.",
    );

    document.getElementById("regiment-count").textContent = regiments.length;
    document.getElementById("enhancement-count").textContent = enhancements.length;
    document.getElementById("unit-count").textContent = army.units.length;

    document.getElementById("unit-list").innerHTML = army.units.length
      ? army.units.map(AOSX.unitCard).join("")
      : '<p class="empty">자료 없음</p>';

    AOSX.renderFooter(document.getElementById("site-footer"));
  }

  main();
})();
