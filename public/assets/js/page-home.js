/* 첫 화면 — 두 게임 중 하나를 고른다. 카드에 각 자료의 규모만 얹는다. */
(function () {
  "use strict";

  var HTML_ESCAPE = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

  function esc(value) {
    if (value === null || value === undefined) return "";
    return String(value).replace(/[&<>"']/g, function (ch) {
      return HTML_ESCAPE[ch];
    });
  }

  function stats(pairs) {
    return pairs
      .filter(function (pair) {
        return pair.value;
      })
      .map(function (pair) {
        return '<span class="game-stat"><b>' + esc(pair.value) + "</b>" + esc(pair.label) + "</span>";
      })
      .join("");
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

  function render() {
    var kt = (window.KTI && window.KTI.meta) || null;
    var aos = (window.AOS && window.AOS.meta) || null;
    var w40k = window.W40K || null;

    document.getElementById("kt-stats").innerHTML = kt
      ? stats([
          { value: kt.counts.factions, label: "팩션" },
          { value: kt.counts.teams, label: "킬팀" },
          { value: kt.counts.operatives, label: "요원" },
        ])
      : '<span class="game-stat">데이터 없음</span>';

    document.getElementById("aos-stats").innerHTML = aos
      ? stats([
          { value: aos.counts.armies, label: "아미" },
          { value: aos.counts.units, label: "유닛" },
          { value: aos.counts.enhancements, label: "인핸스먼트" },
        ])
      : '<span class="game-stat">데이터 없음</span>';

    var w40kDetachments = 0;
    if (w40k && w40k.detachments) {
      w40k.detachments.groups.forEach(function (group) {
        group.factions.forEach(function (faction) {
          (faction.chapters || [faction]).forEach(function (leaf) {
            w40kDetachments += leaf.list.length;
          });
        });
      });
    }

    document.getElementById("w40k-stats").innerHTML = w40k
      ? stats([
          {
            value: w40k.weaponAbilities.length + w40k.coreAbilities.length,
            label: "용어",
          },
          { value: w40kDetachments, label: "디테치먼트" },
          {
            value: w40k.detachments ? w40k.detachments.meta.edition : w40k.meta.edition,
            label: "기준 판",
          },
        ])
      : '<span class="game-stat">데이터 없음</span>';

    var lines = [];
    if (kt) lines.push("킬팀 — " + esc(kt.source) + " · " + formatDate(kt.generatedAt) + " 기준");
    if (aos) {
      lines.push("스피어헤드 — " + esc(aos.source) + " · " + formatDate(aos.generatedAt) + " 기준");
    }
    lines.push("자료는 내려받은 시점에 고정된 스냅샷입니다. 판정은 공식 규칙이 우선합니다.");

    document.getElementById("site-footer").innerHTML = lines
      .map(function (line) {
        return "<p>" + line + "</p>";
      })
      .join("");
  }

  render();
})();
