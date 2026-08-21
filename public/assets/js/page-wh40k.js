/* 40K 허브 — 용어 사전과 디테치먼트 색인 카드에 자료 규모를 얹는다. */
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

  function detachmentCounts(data) {
    var factions = 0;
    var total = 0;
    data.detachments.groups.forEach(function (group) {
      group.factions.forEach(function (faction) {
        (faction.chapters || [faction]).forEach(function (leaf) {
          factions += 1;
          total += leaf.list.length;
        });
      });
    });
    return { factions: factions, total: total };
  }

  function render() {
    var data = window.W40K;
    if (!data) {
      document.getElementById("site-footer").innerHTML =
        "<p>데이터를 읽지 못했습니다 — data/wh40k-data.js 를 확인해 주세요.</p>";
      return;
    }

    var termCount = data.weaponAbilities.length + data.coreAbilities.length;
    var det = data.detachments ? detachmentCounts(data) : null;

    document.getElementById("terms-stats").innerHTML = stats([
      { value: data.weaponAbilities.length, label: "무기 능력" },
      { value: data.coreAbilities.length, label: "코어 능력" },
      { value: data.meta.edition, label: "기준 판" },
    ]);

    var enhTotal = 0;
    var enhMap = data.enhancements || {};
    Object.keys(enhMap).forEach(function (key) {
      enhTotal += enhMap[key].length;
    });

    document.getElementById("detachment-stats").innerHTML = det
      ? stats([
          { value: det.factions, label: "팩션·챕터" },
          { value: det.total, label: "디테치먼트" },
          { value: enhTotal, label: "인핸스먼트" },
        ])
      : '<span class="game-stat">데이터 없음</span>';

    document.getElementById("hero-stats").innerHTML = [
      { value: termCount, label: "용어" },
      { value: det ? det.factions : 0, label: "팩션" },
      { value: det ? det.total : 0, label: "디테치먼트" },
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
      "<p>용어 사전은 " +
      esc(data.meta.edition) +
      " 코어 규칙, 디테치먼트 색인은 " +
      esc(det ? data.detachments.meta.edition : "-") +
      " 팩션 팩 기준입니다.</p>" +
      "<p>판정은 공식 규칙과 최신 밸런스 데이터슬레이트가 우선합니다.</p>";
  }

  render();
})();
