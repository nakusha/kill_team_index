/*
 * 공용 데이터 접근과 렌더 헬퍼.
 *
 * data/kt-data.js 가 window.KTI 에 전체 데이터를 얹어두므로 런타임 fetch 가 없다.
 * file:// 로 열어도 동작하도록 ES 모듈 대신 클래식 스크립트 + 전역 네임스페이스를 쓴다.
 */
window.KTX = (function () {
  "use strict";

  var HTML_ESCAPE = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };

  /** 데이터는 신뢰 가능하지만, 이름/설명이 그대로 innerHTML 에 들어가므로 항상 이스케이프한다. */
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
    return window.KTI || null;
  }

  /** 데이터 번들이 없으면 안내를 띄우고 false 를 돌려준다. */
  function requireData(mountEl) {
    if (data() && data().factions) return true;

    if (mountEl) {
      mountEl.innerHTML =
        '<div class="databar">' +
        "<strong>데이터 번들을 찾지 못했습니다 / Data bundle not found</strong><br>" +
        "<code>data/kt-data.js</code> 가 없습니다. 프로젝트 루트에서 아래를 실행하세요.<br>" +
        "<code>node tools/update.mjs</code>" +
        "</div>";
    }
    return false;
  }

  function factions() {
    var bundle = data();
    return bundle ? bundle.factions : [];
  }

  function findFaction(id) {
    return (
      factions().find(function (faction) {
        return faction.id === id;
      }) || null
    );
  }

  function findTeam(id) {
    var bundle = data();
    return bundle && bundle.teams ? bundle.teams[id] || null : null;
  }

  /** 모든 킬팀 요약을 팩션 정보와 함께 평탄화 — 인덱스 검색용. */
  function allTeamSummaries() {
    return factions().flatMap(function (faction) {
      return faction.teams.map(function (team) {
        return Object.assign({}, team, {
          factionId: faction.id,
          factionKo: faction.nameKo,
          factionEn: faction.nameEn,
        });
      });
    });
  }

  /* ─── 용어집 ─────────────────────────────────────────── */

  var termIndex = null;

  /** 긴 검색어가 먼저 걸리도록 정렬한 색인. 한 번만 만든다. */
  function buildTermIndex() {
    var bundle = data();
    var terms = (bundle && bundle.glossary) || [];
    var pairs = [];

    terms.forEach(function (term) {
      (term.keys || []).forEach(function (key) {
        if (key) pairs.push({ key: key.toLowerCase(), term: term });
      });
    });

    pairs.sort(function (a, b) {
      return b.key.length - a.key.length;
    });
    return pairs;
  }

  /** 규칙 문자열("관통 1", "Piercing 1")에서 해당 용어를 찾는다. 없으면 null. */
  function findTerm(text) {
    if (!text) return null;
    if (!termIndex) termIndex = buildTermIndex();

    var haystack = String(text).toLowerCase();
    var hit = termIndex.find(function (pair) {
      return haystack.indexOf(pair.key) !== -1;
    });
    return hit ? hit.term : null;
  }

  function glossaryCredit() {
    var bundle = data();
    return (bundle && bundle.glossaryCredit) || null;
  }

  /**
   * 용어 칩 — 마우스를 올리면 뜻이 뜨고, 누르면 고정된다.
   * 뜻을 찾지 못하면 그냥 평범한 조각으로 남긴다.
   */
  function termChip(label, extraClass) {
    var term = findTerm(label);
    var cls = "term" + (extraClass ? " " + extraClass : "");

    if (!term) {
      return '<span class="' + cls + ' term--plain">' + esc(label) + "</span>";
    }

    var title = term.nameKo ? term.nameKo + "(" + term.nameEn + ")" : term.nameEn;
    var body = term.textKo || term.textEn || "";
    var alt =
      term.textKo && term.textEn ? '<span class="term__en">' + esc(term.textEn) + "</span>" : "";

    return (
      '<button type="button" class="' +
      cls +
      '" aria-expanded="false">' +
      '<span class="term__label">' +
      esc(label) +
      "</span>" +
      '<span class="term__pop" role="tooltip">' +
      '<b class="term__title">' +
      esc(title) +
      "</b>" +
      '<span class="term__body">' +
      esc(body) +
      "</span>" +
      alt +
      "</span></button>"
    );
  }

  /**
   * 본문 속 [대괄호] 표기를 용어 칩으로 바꾼다.
   * 이미 이스케이프된 문자열을 받는다 — 대괄호는 이스케이프 대상이 아니라 그대로 남아 있다.
   */
  function linkifyTerms(escapedText) {
    return String(escapedText).replace(/\[([^\]]{1,24})\]/g, function (whole, inner) {
      return findTerm(inner) ? termChip(inner, "term--inline") : whole;
    });
  }

  function closeAllTerms(scope) {
    scope.querySelectorAll("button.term.is-open").forEach(function (open) {
      open.classList.remove("is-open");
      open.setAttribute("aria-expanded", "false");
    });
  }

  var POP_GAP = 8;

  /**
   * 팝오버 위치를 뷰포트 기준으로 계산한다.
   * 무기표가 가로 스크롤 컨테이너 안에 있어 문서 흐름에 두면 잘리기 때문이다.
   */
  function positionPop(chip) {
    var pop = chip.querySelector(".term__pop");
    if (!pop) return;

    /* 크기를 재려면 일단 그려야 하므로, 보이지 않게 띄운 뒤 잰다. */
    pop.style.visibility = "hidden";
    pop.style.display = "block";

    var anchor = chip.getBoundingClientRect();
    var box = pop.getBoundingClientRect();

    var left = Math.max(POP_GAP, Math.min(anchor.left, window.innerWidth - box.width - POP_GAP));
    var top = anchor.top - box.height - POP_GAP;
    if (top < POP_GAP) top = anchor.bottom + POP_GAP; /* 위가 좁으면 아래로 */

    /* 좁은 화면에서는 아래로 내려도 넘칠 수 있어 화면 안으로 당긴다. */
    var maxTop = window.innerHeight - box.height - POP_GAP;
    if (top > maxTop) top = Math.max(POP_GAP, maxTop);

    pop.style.left = Math.round(left) + "px";
    pop.style.top = Math.round(top) + "px";
    pop.style.display = "";
    pop.style.visibility = "";
  }

  /** 용어 칩 열고 닫기. 페이지마다 한 번만 붙이면 된다. */
  function bindTerms(root) {
    var scope = root || document;

    /* 마우스가 닿는 순간과 포커스가 오는 순간에 위치를 잡아둔다. */
    scope.addEventListener("mouseover", function (event) {
      var chip = event.target.closest ? event.target.closest("button.term") : null;
      if (chip) positionPop(chip);
    });

    scope.addEventListener("focusin", function (event) {
      var chip = event.target.closest ? event.target.closest("button.term") : null;
      if (chip) positionPop(chip);
    });

    /* 스크롤하면 고정 좌표가 어긋나므로 열려 있던 것을 닫는다. */
    window.addEventListener("scroll", function () {
      closeAllTerms(scope);
    }, { passive: true });
    window.addEventListener("resize", function () {
      closeAllTerms(scope);
    });

    scope.addEventListener("click", function (event) {
      var chip = event.target.closest ? event.target.closest("button.term") : null;

      scope.querySelectorAll("button.term.is-open").forEach(function (open) {
        if (open === chip) return;
        open.classList.remove("is-open");
        open.setAttribute("aria-expanded", "false");
      });

      if (!chip) return;
      event.preventDefault();
      var next = !chip.classList.contains("is-open");
      if (next) positionPop(chip);
      chip.classList.toggle("is-open", next);
      chip.setAttribute("aria-expanded", String(next));
    });

    scope.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeAllTerms(scope);
    });
  }

  /** 킬팀 대표색을 강조색으로 주입. 없으면 토큰 기본값을 유지한다. */
  function setAccent(color, target) {
    if (!color) return;
    (target || document.documentElement).style.setProperty("--accent", color);
  }

  /**
   * 이름 표기 규칙 — 한글(영어). 한글본이 없으면 영문만 쓴다.
   * 이름 외의 설명·라벨은 한글만 쓴다.
   */
  function nameWithEn(ko, en) {
    if (!ko) return esc(en);
    if (!en || ko === en) return esc(ko);
    return esc(ko) + '<span class="name-en">(' + esc(en) + ")</span>";
  }

  /** 한글이 있으면 한글을 주로, 영문을 종으로 병기한다. */
  function bilingual(ko, en) {
    if (!ko) return '<span class="bilingual__ko">' + esc(en) + "</span>";
    return (
      '<span class="bilingual__ko">' +
      esc(ko) +
      "</span>" +
      '<span class="bilingual__en">' +
      esc(en) +
      "</span>"
    );
  }

  function badge(label, value, variant) {
    var cls = "badge" + (variant ? " badge--" + variant : "");
    var isBare = value === undefined || value === null || value === "";
    var body = isBare ? esc(label) : esc(label) + " <b>" + esc(value) + "</b>";
    return '<span class="' + cls + '">' + body + "</span>";
  }

  function formatDate(iso) {
    if (!iso) return "알 수 없음 / unknown";
    var date = new Date(iso);
    if (Number.isNaN(date.getTime())) return esc(iso);
    var pad = function (n) {
      return String(n).padStart(2, "0");
    };
    return (
      date.getFullYear() +
      "-" +
      pad(date.getMonth() + 1) +
      "-" +
      pad(date.getDate()) +
      " " +
      pad(date.getHours()) +
      ":" +
      pad(date.getMinutes())
    );
  }

  /** 데이터 기준 시각을 푸터에 찍어 오래된 스냅샷을 눈치챌 수 있게 한다. */
  function renderFooter(mountEl) {
    if (!mountEl) return;
    var meta = (data() && data().meta) || {};
    var counts = meta.counts || {};

    // mountEl.innerHTML =
    //   '<p>데이터 기준 / Snapshot — <span class="mono">' + formatDate(meta.generatedAt) + '</span></p>' +
    //   '<p>원본 / Source — <span class="mono">' + esc(meta.source || '-') + '</span></p>' +
    //   '<p>팩션 ' + esc(counts.factions || 0) + ' · 킬팀 ' + esc(counts.teams || 0) +
    //   ' · 요원 ' + esc(counts.operatives || 0) + ' · 플로이 ' + esc(counts.ploys || 0) +
    //   ' · 장비 ' + esc(counts.equipment || 0) + '</p>' +
    //   '<p>수동 갱신 / Manual update — <span class="mono">node tools/update.mjs</span></p>';
  }

  return {
    esc: esc,
    param: param,
    data: data,
    requireData: requireData,
    factions: factions,
    findFaction: findFaction,
    findTeam: findTeam,
    allTeamSummaries: allTeamSummaries,
    setAccent: setAccent,
    nameWithEn: nameWithEn,
    findTerm: findTerm,
    termChip: termChip,
    linkifyTerms: linkifyTerms,
    bindTerms: bindTerms,
    glossaryCredit: glossaryCredit,
    bilingual: bilingual,
    badge: badge,
    formatDate: formatDate,
    renderFooter: renderFooter,
  };
})();
