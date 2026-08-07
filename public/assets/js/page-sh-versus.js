/*
 * 스피어헤드 대전 — 양쪽이 아미를 고르고, 레지먼트 1개와 인핸스먼트 1개를 정한다.
 *
 * 스피어헤드는 아미 구성이 고정이라 로스터를 꾸릴 게 없다.
 * 대신 고르는 것(레지먼트 · 인핸스먼트)과 상대 유닛 시트를 한 화면에서 본다.
 */
(function () {
  "use strict";

  var AOSX = window.AOSX;
  var mount = document.getElementById("page");
  if (!AOSX.requireData(mount)) return;

  var PICK_KEY = "kt-index:sh-versus:v1";
  var SIDES = [
    { key: "left", label: "내 아미" },
    { key: "right", label: "상대 아미" },
  ];

  var grid = document.getElementById("versus-grid");
  var tabs = document.getElementById("versus-tabs");

  function readPick() {
    try {
      return JSON.parse(window.localStorage.getItem(PICK_KEY)) || {};
    } catch (error) {
      return {};
    }
  }

  function writePick() {
    try {
      window.localStorage.setItem(PICK_KEY, JSON.stringify(picked));
    } catch (error) {
      /* 저장 못 해도 이번 화면에서는 그대로 보여준다 */
    }
  }

  var picked = readPick();

  function stateOf(sideKey) {
    if (!picked[sideKey]) picked[sideKey] = { army: null, regiment: null, enhancement: null };
    return picked[sideKey];
  }

  function armySelect(sideKey, current) {
    var options = AOSX.byFaction()
      .map(function (group) {
        return (
          '<optgroup label="' + AOSX.esc(group.faction) + '">' +
          group.armies
            .map(function (army) {
              return (
                '<option value="' + AOSX.esc(army.id) + '"' +
                (army.id === current ? " selected" : "") + ">" +
                AOSX.esc(army.name) + "</option>"
              );
            })
            .join("") +
          "</optgroup>"
        );
      })
      .join("");

    return (
      '<select class="versus-select" data-army-select="' + sideKey + '" aria-label="아미 고르기">' +
      '<option value=""' + (current ? "" : " selected") + ">아미 고르기…</option>" +
      options +
      "</select>"
    );
  }

  /** 고르는 능력 — 하나만 켜지도록 라디오처럼 다룬다. */
  function pickList(sideKey, kind, abilities, chosen) {
    if (!abilities.length) {
      return '<p class="empty">원본에 이 항목의 소제목이 없습니다 — 아미 능력을 확인하세요.</p>';
    }

    return (
      '<div class="entry-list">' +
      abilities
        .map(function (ability) {
          var isOn = ability.name === chosen;
          return AOSX.abilityCard(ability, {
            picked: isOn,
            action:
              '<button type="button" class="roster-pick' + (isOn ? " is-on" : "") +
              '" data-pick="' + kind + '" data-side="' + sideKey +
              '" data-name="' + AOSX.esc(ability.name) + '" aria-pressed="' +
              (isOn ? "true" : "false") + '">' + (isOn ? "선택함" : "선택") + "</button>",
          });
        })
        .join("") +
      "</div>"
    );
  }

  function chosenSummary(army, state) {
    if (!army) return "";

    var regiment = state.regiment || "고르지 않음";
    var enhancement = state.enhancement || "고르지 않음";

    return (
      '<div class="sh-summary">' +
      '<div><span>레지먼트</span><b>' + AOSX.esc(regiment) + "</b></div>" +
      '<div><span>인핸스먼트</span><b>' + AOSX.esc(enhancement) + "</b></div>" +
      "</div>"
    );
  }

  function sidePanel(side) {
    var state = stateOf(side.key);
    var army = state.army ? AOSX.findArmy(state.army) : null;

    var body = army
      ? chosenSummary(army, state) +
        '<p class="subhead">늘 적용되는 아미 능력</p>' +
        (AOSX.alwaysOn(army).length
          ? '<div class="entry-list">' +
            AOSX.alwaysOn(army).map(function (a) { return AOSX.abilityCard(a); }).join("") +
            "</div>"
          : '<p class="empty">자료 없음</p>') +
        '<p class="subhead">레지먼트 어빌리티 — 1개 선택</p>' +
        pickList(side.key, "regiment", AOSX.regimentsOf(army), state.regiment) +
        '<p class="subhead">인핸스먼트 — 1개 선택</p>' +
        pickList(side.key, "enhancement", AOSX.enhancementsOf(army), state.enhancement) +
        '<p class="subhead">유닛</p>' +
        '<div class="op-list">' + army.units.map(AOSX.unitCard).join("") + "</div>"
      : '<div class="versus-empty">' +
        "<h3>" + AOSX.esc(side.label) + "를 고르세요</h3>" +
        "<p>위 목록에서 아미를 고르면 능력과 유닛 시트가 나옵니다.</p>" +
        '<div class="versus-empty__actions">' +
        '<a class="roster-btn roster-btn--link" href="spearhead.html">아미 둘러보기</a>' +
        "</div></div>";

    return (
      '<section class="versus-side" data-side="' + side.key + '">' +
      '<header class="versus-side__head"><div>' +
      '<p class="versus-side__role">' + AOSX.esc(side.label) + "</p>" +
      '<h2 class="versus-side__title">' + AOSX.esc(army ? army.name : "아직 없음") + "</h2>" +
      (army ? '<p class="versus-side__summary">' + AOSX.esc(army.faction) + "</p>" : "") +
      "</div>" +
      '<div class="versus-controls">' + armySelect(side.key, state.army) +
      (army
        ? '<button type="button" class="roster-btn roster-btn--ghost" data-reset="' + side.key + '">비우기</button>'
        : "") +
      "</div></header>" +
      '<div class="versus-side__body">' + body + "</div></section>"
    );
  }

  /**
   * 고를 때마다 통째로 다시 그리면 방금 누른 버튼이 사라지고 스크롤도 튄다.
   * 버튼 상태와 요약만 고쳐 쓴다.
   */
  function refreshPicks(sideKey) {
    var panel = document.querySelector('[data-side="' + sideKey + '"]');
    if (!panel) return;

    var state = stateOf(sideKey);
    panel.querySelectorAll("[data-pick]").forEach(function (button) {
      var kind = button.getAttribute("data-pick");
      var isOn = state[kind] === button.getAttribute("data-name");

      button.classList.toggle("is-on", isOn);
      button.setAttribute("aria-pressed", isOn ? "true" : "false");
      button.textContent = isOn ? "선택함" : "선택";

      var entry = button.closest(".entry");
      if (entry) entry.classList.toggle("is-picked", isOn);
    });

    var summary = panel.querySelector(".sh-summary");
    var army = state.army ? AOSX.findArmy(state.army) : null;
    if (summary && army) summary.outerHTML = chosenSummary(army, state);
  }

  function renderTabs() {
    tabs.innerHTML = SIDES.map(function (side, index) {
      return (
        '<button type="button" class="versus-tab' + (index === 0 ? " is-active" : "") +
        '" data-versus-tab="' + side.key + '">' + AOSX.esc(side.label) + "</button>"
      );
    }).join("");
  }

  function render() {
    grid.innerHTML = SIDES.map(sidePanel).join("");
  }

  function bind() {
    document.addEventListener("click", function (event) {
      var target = event.target.closest
        ? event.target.closest("[data-versus-tab],[data-pick],[data-reset]")
        : null;
      if (!target) return;

      var tabKey = target.getAttribute("data-versus-tab");
      if (tabKey) {
        grid.setAttribute("data-active", tabKey);
        tabs.querySelectorAll(".versus-tab").forEach(function (tab) {
          tab.classList.toggle("is-active", tab.getAttribute("data-versus-tab") === tabKey);
        });
        return;
      }

      event.preventDefault();

      var resetKey = target.getAttribute("data-reset");
      if (resetKey) {
        picked[resetKey] = { army: null, regiment: null, enhancement: null };
        writePick();
        render();
        return;
      }

      var kind = target.getAttribute("data-pick");
      if (kind) {
        var state = stateOf(target.getAttribute("data-side"));
        var name = target.getAttribute("data-name");
        /* 같은 것을 다시 누르면 선택을 푼다 — 하나만 고르는 규칙이다. */
        state[kind] = state[kind] === name ? null : name;
        writePick();
        refreshPicks(target.getAttribute("data-side"));
      }
    });

    document.addEventListener("change", function (event) {
      var sideKey = event.target.getAttribute && event.target.getAttribute("data-army-select");
      if (!sideKey) return;

      var state = stateOf(sideKey);
      state.army = event.target.value || null;
      /* 아미가 바뀌면 고른 능력은 더 이상 그 아미 것이 아니다. */
      state.regiment = null;
      state.enhancement = null;
      writePick();
      render();
    });
  }

  renderTabs();
  grid.setAttribute("data-active", "left");
  render();
  bind();
  AOSX.renderFooter(document.getElementById("site-footer"));
})();
