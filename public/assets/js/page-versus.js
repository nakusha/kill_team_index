/*
 * 대전 — 로스터 둘을 나란히 놓고 본다.
 *
 * 넓은 화면에서는 반반으로 갈라, 좁은 화면에서는 탭으로 전환해 보여준다.
 * 양쪽 모두 라이브러리에서 고르거나, 파일·붙여넣기로 새로 들일 수 있다.
 */
(function () {
  "use strict";

  var KTX = window.KTX;
  var KTR = window.KTR;
  var KTRender = window.KTRender;
  var mount = document.getElementById("page");
  if (!KTX.requireData(mount)) return;

  var PICK_KEY = "kt-index:versus:v1";
  var SIDES = [
    { key: "left", label: "내 로스터" },
    { key: "right", label: "상대 로스터" },
  ];

  var grid = document.getElementById("versus-grid");
  var tabs = document.getElementById("versus-tabs");
  var notice = document.getElementById("versus-notice");

  /** 어느 항목을 어느 쪽에 올렸는지 기억해 둔다. */
  function readPick() {
    try {
      return JSON.parse(window.localStorage.getItem(PICK_KEY)) || {};
    } catch (error) {
      return {};
    }
  }

  function writePick(pick) {
    try {
      window.localStorage.setItem(PICK_KEY, JSON.stringify(pick));
    } catch (error) {
      /* 저장 못 해도 이번 화면에서는 그대로 보여준다 */
    }
  }

  var picked = readPick();

  /**
   * 어느 항목을 올릴지 정한다.
   * 왼쪽은 지금 편집 중인 로스터를 기본으로 삼지만, 오른쪽(상대)은 **고르기 전까지 비워 둔다** —
   * 내 로스터를 상대 자리에 슬쩍 올려두면 남의 것으로 착각하기 쉽다.
   */
  function resolve(sideKey) {
    var wanted = picked[sideKey];
    var found = KTR.list().filter(function (item) {
      return item.id === wanted;
    })[0];

    if (found) return found.id;
    return sideKey === "left" ? KTR.activeId() : null;
  }

  function selector(sideKey, currentId) {
    var placeholder =
      '<option value=""' +
      (currentId ? "" : " selected") +
      ">" +
      (sideKey === "left" ? "로스터 고르기…" : "상대 로스터 고르기…") +
      "</option>";

    var options = KTR.list()
      .map(function (item) {
        return (
          '<option value="' +
          KTX.esc(item.id) +
          '"' +
          (item.id === currentId ? " selected" : "") +
          ">" +
          KTX.esc(item.name) +
          " — 킬팀 " +
          item.teams +
          " · 요원 " +
          item.units +
          "명</option>"
        );
      })
      .join("");

    return (
      '<select class="versus-select" data-side-select="' +
      sideKey +
      '" aria-label="로스터 고르기">' +
      placeholder +
      options +
      "</select>"
    );
  }

  function controls(sideKey, currentId) {
    return (
      '<div class="versus-controls">' +
      selector(sideKey, currentId) +
      '<label class="roster-btn roster-btn--link">파일 불러오기' +
      '<input type="file" accept="application/json,.json" data-import-file="' +
      sideKey +
      '" hidden />' +
      "</label>" +
      '<button type="button" class="roster-btn roster-btn--link" data-import-text="' +
      sideKey +
      '">붙여넣기</button>' +
      (currentId
        ? '<button type="button" class="roster-btn roster-btn--link" data-export="' +
          sideKey +
          '">내보내기</button>'
        : "") +
      "</div>"
    );
  }

  /** 아직 아무것도 안 올렸을 때 — 무엇을 하면 되는지 그 자리에서 안내한다. */
  function emptyPanel(side) {
    var isOpponent = side.key === "right";
    var hasLibrary = KTR.list().length > 0;

    return (
      '<div class="versus-empty">' +
      "<h3>" +
      (isOpponent ? "상대 로스터가 없습니다" : "올린 로스터가 없습니다") +
      "</h3>" +
      "<p>" +
      (isOpponent
        ? "상대가 보낸 파일을 불러오거나 JSON 을 붙여넣으세요." +
          (hasLibrary ? " 보관함에 이미 있다면 위에서 골라도 됩니다." : "")
        : "보관함에서 고르거나 파일을 불러오세요.") +
      "</p>" +
      '<div class="versus-empty__actions">' +
      '<label class="roster-btn">상대 로스터 파일 불러오기' +
      '<input type="file" accept="application/json,.json" data-import-file="' +
      side.key +
      '" hidden />' +
      "</label>" +
      '<button type="button" class="roster-btn" data-import-text="' +
      side.key +
      '">JSON 붙여넣기</button>' +
      (isOpponent
        ? ""
        : '<a class="roster-btn roster-btn--link" href="roster.html">내 로스터 편집</a>') +
      "</div>" +
      (isOpponent
        ? '<p class="versus-empty__hint">상대도 이 사이트를 쓴다면, 대전 화면의 ' +
          "<b>내보내기</b> 로 받은 파일을 그대로 넣으면 됩니다.</p>"
        : "") +
      "</div>"
    );
  }

  function sidePanel(side) {
    var id = resolve(side.key);
    var view = id ? KTR.viewOf(id) : null;
    var body = view ? KTRender.sideBody(view, { actions: false, collapseRule: true }) : "";

    return (
      '<section class="versus-side" data-side="' +
      side.key +
      '">' +
      '<header class="versus-side__head">' +
      "<div>" +
      '<p class="versus-side__role">' +
      KTX.esc(side.label) +
      "</p>" +
      '<h2 class="versus-side__title">' +
      KTX.esc(view ? view.label : "아직 없음") +
      "</h2>" +
      "</div>" +
      controls(side.key, id) +
      "</header>" +
      '<div class="versus-side__body">' +
      (body || emptyPanel(side)) +
      "</div></section>"
    );
  }

  function renderTabs() {
    tabs.innerHTML = SIDES.map(function (side, index) {
      return (
        '<button type="button" class="versus-tab' +
        (index === 0 ? " is-active" : "") +
        '" data-versus-tab="' +
        side.key +
        '">' +
        KTX.esc(side.label) +
        "</button>"
      );
    }).join("");
  }

  function render() {
    grid.innerHTML = SIDES.map(sidePanel).join("");
    KTX.bindTerms(document);
  }

  function notify(message, isError) {
    notice.textContent = message;
    notice.className = "versus-notice" + (isError ? " is-error" : "");
  }

  /* ─── 불러오기 · 내보내기 ──────────────────────────────── */

  function applyImport(sideKey, text) {
    var result = KTR.importJson(text, sideKey === "right" ? "상대 로스터" : "불러온 로스터");

    if (!result.ok) {
      notify("불러오기 실패 — " + result.message, true);
      return;
    }

    picked[sideKey] = result.id;
    writePick(picked);
    notify('"' + result.name + '" 를 불러와 ' + (sideKey === "left" ? "왼쪽" : "오른쪽") + "에 올렸습니다.");
    render();
  }

  function readFile(sideKey, file) {
    var reader = new FileReader();

    reader.onload = function () {
      applyImport(sideKey, reader.result);
    };
    reader.onerror = function () {
      notify("파일을 읽지 못했습니다.", true);
    };
    reader.readAsText(file);
  }

  /** 서버가 없으므로 Blob 을 만들어 그 자리에서 내려받는다. */
  function download(sideKey) {
    var id = resolve(sideKey);
    if (!id) return;

    var view = KTR.viewOf(id);
    var blob = new Blob([KTR.exportJson(id)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");

    link.href = url;
    link.download = "kt-roster-" + view.label.replace(/\s+/g, "-") + ".json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    notify('"' + view.label + '" 를 파일로 내보냈습니다.');
  }

  function bind() {
    document.addEventListener("click", function (event) {
      var target = event.target.closest
        ? event.target.closest("[data-versus-tab],[data-import-text],[data-export]")
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

      var pasteKey = target.getAttribute("data-import-text");
      if (pasteKey) {
        var text = window.prompt("로스터 JSON 을 붙여넣으세요.");
        if (text) applyImport(pasteKey, text);
        return;
      }

      var exportKey = target.getAttribute("data-export");
      if (exportKey) download(exportKey);
    });

    document.addEventListener("change", function (event) {
      var el = event.target;

      var selectSide = el.getAttribute && el.getAttribute("data-side-select");
      if (selectSide) {
        if (el.value) picked[selectSide] = el.value;
        else delete picked[selectSide]; /* "고르기…" 로 되돌리면 비운다 */
        writePick(picked);
        render();
        return;
      }

      if (!el.matches || !el.matches("input[type=file][data-import-file]")) return;

      var file = el.files && el.files[0];
      if (file) readFile(el.getAttribute("data-import-file"), file);
      el.value = ""; /* 같은 파일을 다시 골라도 동작하게 */
    });
  }

  renderTabs();
  grid.setAttribute("data-active", "left");
  render();
  bind();
  KTX.renderFooter(document.getElementById("site-footer"));
})();
