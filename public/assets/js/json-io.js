/*
 * JSON 주고받기 상자.
 *
 * 파일로 옮기는 게 번거로운 자리(특히 휴대폰)를 위해 텍스트로 복사·붙여넣기 한다.
 * window.prompt 는 긴 JSON 을 넣고 빼기 어려워 쓰지 않는다.
 */
window.KTIO = (function () {
  "use strict";

  var dialog = null;
  var textarea = null;
  var titleEl = null;
  var hintEl = null;
  var primaryEl = null;
  var onPrimary = null;

  function build() {
    if (dialog) return;

    dialog = document.createElement("dialog");
    dialog.className = "jsonbox";
    dialog.innerHTML =
      '<form method="dialog" class="jsonbox__form">' +
      '<h2 class="jsonbox__title"></h2>' +
      '<p class="jsonbox__hint"></p>' +
      '<textarea class="jsonbox__text" spellcheck="false" autocapitalize="off"></textarea>' +
      '<div class="jsonbox__actions">' +
      '<button type="button" class="roster-btn jsonbox__primary"></button>' +
      '<button type="submit" class="roster-btn roster-btn--ghost">닫기</button>' +
      "</div></form>";

    document.body.appendChild(dialog);

    textarea = dialog.querySelector(".jsonbox__text");
    titleEl = dialog.querySelector(".jsonbox__title");
    hintEl = dialog.querySelector(".jsonbox__hint");
    primaryEl = dialog.querySelector(".jsonbox__primary");

    primaryEl.addEventListener("click", function () {
      if (onPrimary) onPrimary();
    });
  }

  function open(options) {
    build();

    titleEl.textContent = options.title;
    hintEl.textContent = options.hint || "";
    textarea.value = options.value || "";
    textarea.readOnly = !!options.readOnly;
    primaryEl.textContent = options.primaryLabel;
    onPrimary = options.onPrimary;

    dialog.showModal();
    textarea.focus();
    if (options.readOnly) textarea.select();
  }

  function close() {
    if (dialog && dialog.open) dialog.close();
  }

  /** 내보낼 내용을 보여주고 클립보드로 복사한다. 복사가 막히면 직접 고를 수 있게 둔다. */
  function showCopy(title, text, onDone) {
    open({
      title: title,
      hint: "아래 내용을 복사해 상대에게 보내세요. 상자를 눌러 직접 골라도 됩니다.",
      value: text,
      readOnly: true,
      primaryLabel: "클립보드로 복사",
      onPrimary: function () {
        var report = function (ok) {
          if (onDone) onDone(ok);
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(
            function () {
              report(true);
              close();
            },
            function () {
              textarea.select();
              report(false);
            },
          );
          return;
        }

        /* 구형 경로 — 선택 후 복사 명령을 시도한다. */
        textarea.select();
        var ok = false;
        try {
          ok = document.execCommand("copy");
        } catch (error) {
          ok = false;
        }
        report(ok);
        if (ok) close();
      },
    });
  }

  /** 붙여넣은 내용을 콜백으로 넘긴다. 비어 있으면 아무 일도 하지 않는다. */
  function showPaste(title, onSubmit) {
    open({
      title: title,
      hint: "받은 로스터 JSON 을 붙여넣고 불러오기를 누르세요.",
      value: "",
      readOnly: false,
      primaryLabel: "불러오기",
      onPrimary: function () {
        var text = textarea.value.trim();
        if (!text) return;

        close();
        onSubmit(text);
      },
    });
  }

  return { showCopy: showCopy, showPaste: showPaste, close: close };
})();
