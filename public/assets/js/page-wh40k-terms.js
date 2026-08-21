/* 40K 데이터시트 참고 — window.W40K 를 목록으로 그리고, 한 검색창으로 거른다. */
(function () {
  "use strict";

  var HTML_ESCAPE = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

  function esc(value) {
    if (value === null || value === undefined) return "";
    return String(value).replace(/[&<>"']/g, function (ch) {
      return HTML_ESCAPE[ch];
    });
  }

  function entryHtml(item) {
    return (
      '<div class="entry" data-haystack="' +
      esc((item.nameKo + " " + item.nameEn + " " + item.textKo).toLowerCase()) +
      '">' +
      '<div class="entry__head">' +
      '<span class="entry__name">' +
      esc(item.nameKo) +
      ' <small class="name-en">' +
      esc(item.nameEn) +
      "</small></span>" +
      "</div>" +
      '<p class="entry__ko">' +
      esc(item.textKo) +
      "</p>" +
      "</div>"
    );
  }

  function renderList(elementId, countId, items) {
    document.getElementById(elementId).innerHTML = items.map(entryHtml).join("");
    document.getElementById(countId).textContent = items.length + "개";
  }

  function applyFilter(query) {
    var needle = query.trim().toLowerCase();
    var entries = document.querySelectorAll(".entry[data-haystack]");
    var visible = 0;

    entries.forEach(function (entry) {
      var hit = !needle || entry.getAttribute("data-haystack").indexOf(needle) !== -1;
      entry.hidden = !hit;
      if (hit) visible += 1;
    });

    document.getElementById("search-empty").hidden = visible > 0;
  }

  function render() {
    var data = window.W40K;
    var empty = document.getElementById("search-empty");
    if (!data) {
      empty.hidden = false;
      empty.textContent = "데이터를 읽지 못했습니다 — data/wh40k-data.js 를 확인해 주세요.";
      return;
    }

    renderList("weapon-list", "weapon-count", data.weaponAbilities);
    renderList("core-list", "core-count", data.coreAbilities);
    renderList("kinds-list", "kinds-count", data.abilityKinds);

    document.getElementById("hero-stats").innerHTML = [
      { value: data.weaponAbilities.length, label: "무기 능력" },
      { value: data.coreAbilities.length, label: "코어 능력" },
      { value: data.meta.edition, label: "기준 판" },
    ]
      .map(function (pair) {
        return (
          '<span class="hero__stat"><b>' +
          esc(pair.value) +
          "</b><span>" +
          esc(pair.label) +
          "</span></span>"
        );
      })
      .join("");

    document.getElementById("site-footer").innerHTML =
      "<p>" +
      esc(data.meta.referenceKo) +
      " · 설명문은 " +
      esc(data.meta.edition) +
      " 코어 규칙을 요약해 직접 정리한 것입니다.</p>" +
      "<p>판정은 공식 코어 규칙이 우선합니다. 무기 능력의 X 는 무기마다 데이터시트에 적힌 수치입니다.</p>";

    document.getElementById("search-input").addEventListener("input", function (event) {
      applyFilter(event.target.value);
    });
  }

  render();
})();
