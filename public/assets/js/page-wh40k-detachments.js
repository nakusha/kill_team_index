/* 40K 디테치먼트 색인 — window.W40K.detachments 를 대분류 섹션과
 * 팩션 아코디언(details)으로 그린다. 스페이스 마린은 챕터별 하위
 * 아코디언으로 한 단계 더 나뉘고, 챕터마다 전용 + 코덱스 공용을
 * 함께 보여준다(공용은 중복 표시). 한 검색창으로 전체를 거른다. */
(function () {
  "use strict";

  var HTML_ESCAPE = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

  function esc(value) {
    if (value === null || value === undefined) return "";
    return String(value).replace(/[&<>"']/g, function (ch) {
      return HTML_ESCAPE[ch];
    });
  }

  function dispKo(data, en) {
    var found = data.dispositions.find(function (item) {
      return item.en === en;
    });
    return found ? found.ko : en;
  }

  /* 검색은 띄어쓰기를 무시한다 — "레이븐가드"로도 "레이븐 가드"가 잡히게. */
  function normalize(text) {
    return text.toLowerCase().replace(/\s+/g, "");
  }

  function enhancementsOf(item) {
    var map = window.W40K && window.W40K.enhancements;
    return (map && map[item.en]) || null;
  }

  function entryHtml(data, item, isDup) {
    var body = item.ruleKo || item.ko;
    var enhancements = enhancementsOf(item);
    var haystackParts = [item.en, item.ko, item.ruleKo || "", item.disp || "", item.disp ? dispKo(data, item.disp) : "", item.dp + "dp"];
    if (enhancements) {
      enhancements.forEach(function (enh) {
        haystackParts.push(enh.en, enh.ko || "");
      });
    }
    var haystack = normalize(haystackParts.join(" "));

    var badges =
      '<span class="det-entry__badges">' +
      '<span class="badge badge--accent"><b>' + esc(item.dp) + "</b>DP</span>" +
      (item.disp
        ? '<span class="badge">' + esc(dispKo(data, item.disp)) + "</span>"
        : "") +
      "</span>";

    var enhHtml = "";
    if (enhancements && enhancements.length) {
      var enhHaystack = normalize(
        enhancements
          .map(function (enh) {
            return enh.en + " " + (enh.ko || "");
          })
          .join(" ")
      );
      enhHtml =
        '<details class="det-enh" data-haystack="' + esc(enhHaystack) + '"><summary>인핸스먼트 ' + enhancements.length + "개</summary>" +
        enhancements
          .map(function (enh) {
            return (
              '<div class="det-enh__row">' +
              '<span class="det-enh__head">' +
              esc(enh.en) +
              (enh.pts !== null && enh.pts !== undefined
                ? ' <small class="name-en">' + esc(enh.pts) + "pts</small>"
                : "") +
              "</span>" +
              (enh.ko ? '<p class="det-enh__ko">' + esc(enh.ko) + "</p>" : "") +
              "</div>"
            );
          })
          .join("") +
        "</details>";
    }

    return (
      '<div class="entry det-entry" data-haystack="' + esc(haystack) + '"' +
      (isDup ? ' data-dup="1"' : "") +
      ">" +
      '<div class="entry__head">' +
      '<span class="entry__name">' + esc(item.en) +
      ' <small class="name-en">' + esc(item.ko) + "</small></span>" +
      badges +
      "</div>" +
      '<p class="entry__ko">' + esc(body) + "</p>" +
      enhHtml +
      "</div>"
    );
  }

  /* 한 팩션(또는 챕터) 아코디언. sharedList 가 있으면 전용 목록 뒤에
   * 코덱스 공용을 중복 표시한다(검색에서는 중복분을 제외). */
  function factionHtml(data, faction, namePrefix, sharedList) {
    var countText = faction.list.length + "개";
    if (sharedList) {
      countText = "전용 " + faction.list.length + " · 공용 " + sharedList.length;
    }

    var body = faction.list
      .map(function (item) {
        return entryHtml(data, item, false);
      })
      .join("");

    if (sharedList) {
      body +=
        '<p class="subhead">코덱스 공용 — 함께 사용 가능</p>' +
        sharedList
          .map(function (item) {
            return entryHtml(data, item, true);
          })
          .join("");
    }
    if (faction.noteKo) {
      body += '<p class="section__note">' + esc(faction.noteKo) + "</p>";
    }

    return (
      '<details class="det-faction" data-name="' +
      esc(normalize((namePrefix || "") + " " + faction.nameKo + " " + faction.nameEn)) +
      '">' +
      "<summary>" +
      '<span class="det-faction__name">' +
      esc(faction.nameKo) +
      ' <small class="name-en">' +
      esc(faction.nameEn) +
      "</small></span>" +
      '<span class="det-faction__count">' +
      esc(countText) +
      "</span>" +
      "</summary>" +
      '<div class="det-faction__body">' +
      body +
      "</div></details>"
    );
  }

  /* 챕터를 가진 상위 팩션(스페이스 마린) — 챕터 아코디언을 품는다. */
  function umbrellaHtml(data, faction) {
    var shared = faction.chapters.find(function (chapter) {
      return chapter.shared;
    });
    var total = faction.chapters.reduce(function (sum, chapter) {
      return sum + chapter.list.length;
    }, 0);

    return (
      '<details class="det-faction det-umbrella">' +
      "<summary>" +
      '<span class="det-faction__name">' +
      esc(faction.nameKo) +
      ' <small class="name-en">' +
      esc(faction.nameEn) +
      "</small></span>" +
      '<span class="det-faction__count">챕터 ' +
      faction.chapters.length +
      " · " +
      total +
      "개</span>" +
      "</summary>" +
      '<div class="det-faction__body">' +
      faction.chapters
        .map(function (chapter) {
          var sharedList = chapter.usesShared && shared ? shared.list : null;
          return factionHtml(data, chapter, faction.nameKo + " " + faction.nameEn, sharedList);
        })
        .join("") +
      "</div></details>"
    );
  }

  function groupHtml(data, group, index) {
    var total = 0;
    group.factions.forEach(function (faction) {
      (faction.chapters || [faction]).forEach(function (leaf) {
        total += leaf.list.length;
      });
    });
    return (
      '<section class="section det-group" aria-labelledby="group-' + index + '">' +
      '<div class="section__head">' +
      '<h2 id="group-' + index + '">' +
      esc(group.nameKo) +
      ' <small class="name-en">' + esc(group.nameEn) + "</small></h2>" +
      '<span class="section__count">' + total + "개</span>" +
      "</div>" +
      group.factions
        .map(function (faction) {
          return faction.chapters ? umbrellaHtml(data, faction) : factionHtml(data, faction, "", null);
        })
        .join("") +
      "</section>"
    );
  }

  function applyFilter(query) {
    var needle = normalize(query);
    var visible = 0;

    document.querySelectorAll(".det-faction:not(.det-umbrella)").forEach(function (faction) {
      var factionHit = needle && faction.getAttribute("data-name").indexOf(needle) !== -1;
      var shown = 0;

      faction.querySelectorAll(".det-entry").forEach(function (entry) {
        /* 챕터에 중복 표시된 코덱스 공용은 검색 결과에서 제외한다. */
        if (needle && entry.getAttribute("data-dup")) {
          entry.hidden = true;
          return;
        }
        var hit =
          !needle || factionHit || entry.getAttribute("data-haystack").indexOf(needle) !== -1;
        entry.hidden = !hit;
        if (hit) shown += 1;

        /* 검색어가 인핸스먼트에 걸렸으면 그 목록을 펼쳐 보여준다. */
        var enhBox = entry.querySelector(".det-enh");
        if (enhBox) {
          enhBox.open =
            Boolean(needle) && hit && enhBox.getAttribute("data-haystack").indexOf(needle) !== -1;
        }
      });

      /* 검색 중에는 소제목·안내문을 숨긴다. */
      faction.querySelectorAll(".subhead, .section__note").forEach(function (extra) {
        extra.hidden = Boolean(needle);
      });

      faction.hidden = shown === 0;
      /* 검색 중에는 걸린 팩션을 펼쳐 보여주고, 지우면 다시 접는다. */
      faction.open = needle ? shown > 0 : false;
      visible += shown;
    });

    document.querySelectorAll(".det-umbrella").forEach(function (umbrella) {
      var anyVisible =
        umbrella.querySelectorAll(".det-faction:not(.det-umbrella):not([hidden])").length > 0;
      umbrella.hidden = !anyVisible;
      umbrella.open = needle ? anyVisible : false;
    });

    document.querySelectorAll(".det-group").forEach(function (group) {
      group.hidden =
        group.querySelectorAll(".det-faction:not([hidden])").length === 0;
    });

    document.getElementById("search-empty").hidden = visible > 0;
  }

  function render() {
    var data = window.W40K && window.W40K.detachments;
    var empty = document.getElementById("search-empty");
    if (!data) {
      empty.hidden = false;
      empty.textContent =
        "데이터를 읽지 못했습니다 — data/wh40k-detachments-data.js 를 확인해 주세요.";
      return;
    }

    document.getElementById("rules-list").innerHTML = data.rules
      .map(function (rule) {
        return (
          '<div class="entry">' +
          '<div class="entry__head"><span class="entry__name">' +
          esc(rule.nameKo) +
          "</span></div>" +
          '<p class="entry__ko">' +
          esc(rule.textKo) +
          "</p></div>"
        );
      })
      .join("");

    document.getElementById("disposition-note").textContent =
      "성향(Disposition) 다섯 가지 — " +
      data.dispositions
        .map(function (item) {
          return item.ko + "(" + item.en + ")";
        })
        .join(" · ");

    document.getElementById("group-sections").innerHTML = data.groups
      .map(function (group, index) {
        return groupHtml(data, group, index);
      })
      .join("");

    var leaves = 0;
    var total = 0;
    data.groups.forEach(function (group) {
      group.factions.forEach(function (faction) {
        (faction.chapters || [faction]).forEach(function (leaf) {
          leaves += 1;
          total += leaf.list.length;
        });
      });
    });

    var enhTotal = 0;
    var enhMap = window.W40K.enhancements || {};
    Object.keys(enhMap).forEach(function (key) {
      enhTotal += enhMap[key].length;
    });

    document.getElementById("hero-stats").innerHTML = [
      { value: data.groups.length, label: "대분류" },
      { value: leaves, label: "팩션·챕터" },
      { value: total, label: "디테치먼트" },
      { value: enhTotal, label: "인핸스먼트" },
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
      esc(data.meta.sourceKo) +
      "</p>" +
      "<p>능력 설명은 특규를 요약한 것으로 규칙 전문이 아닙니다. 챕터 항목의 코덱스 공용은 편의상 중복 표시한 것입니다. DP·구성은 밸런스 데이터슬레이트로 바뀔 수 있으며, 판정은 공식 팩션 팩 PDF가 우선합니다.</p>";

    document.getElementById("search-input").addEventListener("input", function (event) {
      applyFilter(event.target.value);
    });
  }

  render();
})();
