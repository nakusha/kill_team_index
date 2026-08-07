/*
 * 내 로스터 — 이름 붙인 로스터를 여러 개 두고, 활성 로스터의 내용을 본다.
 *
 * 담기·무기 고르기는 킬팀 상세에서 하고, 여기서는 목록 관리(만들기·이름 변경·복제·
 * 삭제·내보내기·불러오기)와 활성 전환을 한다. 그리기는 render-roster.js 가 맡는다.
 */
(function () {
  "use strict";

  var KTX = window.KTX;
  var KTR = window.KTR;
  var KTRender = window.KTRender;
  var KTIO = window.KTIO;
  var mount = document.getElementById("page");
  if (!KTX.requireData(mount)) return;

  function formatDate(iso) {
    return KTX.formatDate(iso);
  }

  /** 라이브러리 목록 — 지금 편집 중인 항목을 표시하고 전환할 수 있게 한다. */
  function libraryCard(item, activeId) {
    var isActive = item.id === activeId;

    return (
      '<article class="library-item' +
      (isActive ? " is-active" : "") +
      '">' +
      '<div class="library-item__main">' +
      '<h3 class="library-item__name">' +
      KTX.esc(item.name) +
      (isActive ? '<span class="library-item__flag">편집 중</span>' : "") +
      "</h3>" +
      '<p class="library-item__meta">킬팀 ' +
      item.teams +
      " · 요원 " +
      item.units +
      "명 · " +
      KTX.esc(formatDate(item.savedAt)) +
      "</p>" +
      "</div>" +
      '<div class="library-item__actions">' +
      (isActive
        ? ""
        : '<button type="button" class="roster-btn" data-activate="' +
          KTX.esc(item.id) +
          '">편집하기</button>') +
      '<button type="button" class="roster-btn roster-btn--link" data-rename="' +
      KTX.esc(item.id) +
      '">이름</button>' +
      '<button type="button" class="roster-btn roster-btn--link" data-duplicate="' +
      KTX.esc(item.id) +
      '">복제</button>' +
      '<button type="button" class="roster-btn roster-btn--link" data-copy="' +
      KTX.esc(item.id) +
      '">복사</button>' +
      '<button type="button" class="roster-btn roster-btn--link" data-export="' +
      KTX.esc(item.id) +
      '">파일</button>' +
      '<button type="button" class="roster-btn roster-btn--ghost" data-remove="' +
      KTX.esc(item.id) +
      '">삭제</button>' +
      "</div></article>"
    );
  }

  function renderLibrary() {
    var activeId = KTR.activeId();

    document.getElementById("library-list").innerHTML = KTR.list()
      .map(function (item) {
        return libraryCard(item, activeId);
      })
      .join("");

    document.getElementById("library-actions").innerHTML =
      '<button type="button" class="roster-btn" data-create>새 로스터</button>' +
      '<label class="roster-btn roster-btn--link">파일 불러오기' +
      '<input type="file" accept="application/json,.json" id="import-file" hidden />' +
      "</label>" +
      '<button type="button" class="roster-btn roster-btn--link" data-import-text>붙여넣기</button>' +
      '<a class="roster-btn roster-btn--link" href="versus.html">대전에서 보기</a>' +
      (KTR.hasSaveFailed()
        ? '<span class="roster-bar__warn">저장 실패 — 이 창에서만 유지됩니다</span>'
        : "");
  }

  function renderBody() {
    var body = KTRender.sideBody(KTR, { actions: true });

    document.getElementById("roster-body").innerHTML =
      body ||
      '<div class="databar">' +
        "<strong>이 로스터는 비어 있습니다</strong><br>" +
        "킬팀 상세에서 요원·무기·장비를 담으면 여기 모입니다.<br>" +
        '<a href="killteam.html" style="text-decoration:underline">킬팀 고르러 가기</a>' +
        "</div>";

    document.getElementById("roster-active-name").textContent = KTR.activeName();
  }

  function render() {
    renderLibrary();
    renderBody();
    KTX.bindTerms(document);
  }

  function notify(message, isError) {
    var el = document.getElementById("roster-notice");
    el.textContent = message;
    el.className = "versus-notice" + (isError ? " is-error" : "");
  }

  /** 서버가 없으므로 Blob 을 만들어 그 자리에서 내려받는다. */
  function download(id) {
    var name = KTR.viewOf(id).label;
    var blob = new Blob([KTR.exportJson(id)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");

    link.href = url;
    link.download = "kt-roster-" + name.replace(/\s+/g, "-") + ".json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    notify('"' + name + '" 를 파일로 내보냈습니다.');
  }

  function applyImport(text) {
    var result = KTR.importJson(text, "불러온 로스터");

    if (!result.ok) {
      notify("불러오기 실패 — " + result.message, true);
      return;
    }

    notify('"' + result.name + '" 를 불러왔습니다 — 킬팀 ' + result.teams + "개");
    render();
  }

  var ACTION_SELECTOR =
    "[data-activate],[data-rename],[data-duplicate],[data-export],[data-copy],[data-remove]," +
    "[data-create],[data-import-text],[data-roster-clear]";

  function bind() {
    document.addEventListener("click", function (event) {
      var target = event.target.closest ? event.target.closest(ACTION_SELECTOR) : null;
      if (!target) return;
      event.preventDefault();

      var activateId = target.getAttribute("data-activate");
      if (activateId) {
        KTR.setActive(activateId);
        notify('"' + KTR.activeName() + '" 를 편집 대상으로 바꿨습니다.');
        render();
        return;
      }

      var renameId = target.getAttribute("data-rename");
      if (renameId) {
        var name = window.prompt("로스터 이름", KTR.viewOf(renameId).label);
        if (name) {
          KTR.rename(renameId, name);
          render();
        }
        return;
      }

      var duplicateId = target.getAttribute("data-duplicate");
      if (duplicateId) {
        KTR.duplicate(duplicateId);
        notify("복제했습니다.");
        render();
        return;
      }

      var exportId = target.getAttribute("data-export");
      if (exportId) {
        download(exportId);
        return;
      }

      var removeId = target.getAttribute("data-remove");
      if (removeId) {
        var label = KTR.viewOf(removeId).label;
        if (!window.confirm('"' + label + '" 를 삭제할까요?')) return;

        KTR.remove(removeId);
        notify('"' + label + '" 를 삭제했습니다.');
        render();
        return;
      }

      if (target.hasAttribute("data-create")) {
        var newName = window.prompt("새 로스터 이름", "새 로스터");
        if (newName === null) return;

        KTR.create(newName);
        notify('"' + KTR.activeName() + '" 를 만들었습니다. 킬팀 상세에서 담아 보세요.');
        render();
        return;
      }

      if (target.hasAttribute("data-import-text")) {
        KTIO.showPaste("로스터 붙여넣기", applyImport);
        return;
      }

      var copyId = target.getAttribute("data-copy");
      if (copyId) {
        var copyName = KTR.viewOf(copyId).label;
        KTIO.showCopy(copyName + " 내보내기", KTR.exportJson(copyId), function (ok) {
          notify(
            ok
              ? '"' + copyName + '" 를 클립보드에 복사했습니다.'
              : "복사가 막혀 있습니다 — 상자의 내용을 직접 골라 복사하세요.",
            !ok,
          );
        });
        return;
      }

      /* 활성 로스터에서 팀 하나 비우기 (render-roster.js 가 붙인 버튼) */
      var clearTeamId = target.getAttribute("data-roster-clear");
      if (clearTeamId) {
        KTR.clearTeam(clearTeamId);
        render();
      }
    });

    document.addEventListener("change", function (event) {
      var input = event.target;
      if (!input.matches || !input.matches("#import-file")) return;

      var file = input.files && input.files[0];
      if (!file) return;

      var reader = new FileReader();
      reader.onload = function () {
        applyImport(reader.result);
      };
      reader.onerror = function () {
        notify("파일을 읽지 못했습니다.", true);
      };
      reader.readAsText(file);
      input.value = ""; /* 같은 파일을 다시 골라도 동작하게 */
    });
  }

  render();
  bind();
  KTX.renderFooter(document.getElementById("site-footer"));
})();
