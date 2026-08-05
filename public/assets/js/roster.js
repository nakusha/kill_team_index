/*
 * 내 로스터 저장소.
 *
 * 서버가 없으므로 브라우저 localStorage 에만 담는다.
 * 저장소를 못 쓰는 환경(사생활 보호 모드 등)에서는 메모리로 물러나
 * 그 세션 동안만 유지된다 — 조용히 실패하지 않고 hasSaveFailed() 로 알린다.
 */
window.KTR = (function () {
  "use strict";

  var STORAGE_KEY = "kt-index:roster:v1";
  var VERSION = 1;

  var memory = null; /* localStorage 를 못 쓸 때 쓰는 대체 저장소 */
  var saveFailed = false;

  function emptyState() {
    return { version: VERSION, teams: {} };
  }

  function emptyEntry() {
    /* operatives 는 같은 요원을 여러 명 편성할 수 있어 개수 맵으로 둔다. */
    return { operatives: {}, equipment: [], ploys: [] };
  }

  function read() {
    if (memory) return memory;

    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyState();

      var parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== VERSION || typeof parsed.teams !== "object") {
        return emptyState();
      }
      return parsed;
    } catch (error) {
      return emptyState();
    }
  }

  function write(state) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      memory = null;
      saveFailed = false;
    } catch (error) {
      /* 용량 초과나 저장소 차단 — 메모리로 물러난다. */
      memory = state;
      saveFailed = true;
    }
    return state;
  }

  function entry(state, teamId) {
    if (!state.teams[teamId]) state.teams[teamId] = emptyEntry();
    var found = state.teams[teamId];

    if (!found.operatives || typeof found.operatives !== "object") found.operatives = {};
    if (!Array.isArray(found.equipment)) found.equipment = [];
    if (!Array.isArray(found.ploys)) found.ploys = [];
    return found;
  }

  /** 아무것도 담기지 않은 팀은 남겨두지 않는다. */
  function prune(state, teamId) {
    var found = state.teams[teamId];
    if (!found) return;

    var hasOperative = Object.keys(found.operatives).length > 0;
    if (!hasOperative && !found.equipment.length && !found.ploys.length) {
      delete state.teams[teamId];
    }
  }

  function teamEntry(teamId) {
    return read().teams[teamId] || emptyEntry();
  }

  function operativeCount(teamId, operativeId) {
    return teamEntry(teamId).operatives[operativeId] || 0;
  }

  function totalOperatives(teamId) {
    var operatives = teamEntry(teamId).operatives;
    return Object.keys(operatives).reduce(function (sum, id) {
      return sum + operatives[id];
    }, 0);
  }

  function addOperative(teamId, operativeId) {
    var state = read();
    var found = entry(state, teamId);
    found.operatives[operativeId] = (found.operatives[operativeId] || 0) + 1;
    return write(state);
  }

  function removeOperative(teamId, operativeId) {
    var state = read();
    var found = entry(state, teamId);
    var next = (found.operatives[operativeId] || 0) - 1;

    if (next > 0) found.operatives[operativeId] = next;
    else delete found.operatives[operativeId];

    prune(state, teamId);
    return write(state);
  }

  function toggleIn(list, id) {
    var at = list.indexOf(id);
    if (at === -1) list.push(id);
    else list.splice(at, 1);
    return list;
  }

  function toggleEquipment(teamId, equipmentId) {
    var state = read();
    toggleIn(entry(state, teamId).equipment, equipmentId);
    prune(state, teamId);
    return write(state);
  }

  function togglePloy(teamId, ployId) {
    var state = read();
    toggleIn(entry(state, teamId).ploys, ployId);
    prune(state, teamId);
    return write(state);
  }

  function hasEquipment(teamId, equipmentId) {
    return teamEntry(teamId).equipment.indexOf(equipmentId) !== -1;
  }

  function hasPloy(teamId, ployId) {
    return teamEntry(teamId).ploys.indexOf(ployId) !== -1;
  }

  function clearTeam(teamId) {
    var state = read();
    delete state.teams[teamId];
    return write(state);
  }

  function clearAll() {
    return write(emptyState());
  }

  /** 무언가 담긴 킬팀 ID 목록. */
  function teamIds() {
    return Object.keys(read().teams);
  }

  function isEmpty() {
    return teamIds().length === 0;
  }

  /** 저장에 실패한 적이 있으면 true — 화면에 경고를 띄우는 데 쓴다. */
  function hasSaveFailed() {
    return saveFailed;
  }

  return {
    teamEntry: teamEntry,
    operativeCount: operativeCount,
    totalOperatives: totalOperatives,
    addOperative: addOperative,
    removeOperative: removeOperative,
    toggleEquipment: toggleEquipment,
    togglePloy: togglePloy,
    hasEquipment: hasEquipment,
    hasPloy: hasPloy,
    clearTeam: clearTeam,
    clearAll: clearAll,
    teamIds: teamIds,
    isEmpty: isEmpty,
    hasSaveFailed: hasSaveFailed,
  };
})();
