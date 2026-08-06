/*
 * 내 로스터 저장소 (스키마 v2).
 *
 * 서버가 없으므로 브라우저 localStorage 에만 담는다.
 * 저장소를 못 쓰는 환경(사생활 보호 모드 등)에서는 메모리로 물러나
 * 그 세션 동안만 유지된다 — 조용히 실패하지 않고 hasSaveFailed() 로 알린다.
 *
 * v1 은 요원을 개수 맵으로 담아 같은 요원 둘이 서로 다른 무기를 드는 경우를
 * 표현하지 못했다. v2 는 인스턴스(unit) 배열로 바꿔 무기 선택을 각자 갖게 한다.
 */
window.KTR = (function () {
  "use strict";

  var STORAGE_KEY = "kt-index:roster:v2";
  var LEGACY_KEY = "kt-index:roster:v1";
  var VERSION = 2;

  var memory = null; /* localStorage 를 못 쓸 때 쓰는 대체 저장소 */
  var saveFailed = false;

  function emptyState() {
    return { version: VERSION, teams: {} };
  }

  function emptyEntry() {
    return { seq: 0, units: [], equipment: [] };
  }

  /** v1(개수 맵) → v2(인스턴스 배열). 인원은 보존하고 무기는 미선택으로 둔다. */
  function migrate(old) {
    var next = emptyState();

    Object.keys(old.teams || {}).forEach(function (teamId) {
      var found = old.teams[teamId] || {};
      var entry = emptyEntry();

      Object.keys(found.operatives || {}).forEach(function (operativeId) {
        var count = found.operatives[operativeId];
        for (var i = 0; i < count; i += 1) {
          entry.seq += 1;
          entry.units.push({ uid: "u" + entry.seq, opId: operativeId, weapons: [] });
        }
      });

      entry.equipment = Array.isArray(found.equipment) ? found.equipment.slice() : [];
      next.teams[teamId] = entry;
    });

    return next;
  }

  function parse(raw) {
    try {
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function read() {
    if (memory) return memory;

    var current = parse(window.localStorage ? safeGet(STORAGE_KEY) : null);
    if (current && current.version === VERSION && typeof current.teams === "object") {
      return current;
    }

    /* v1 이 남아 있으면 옮겨 담는다. 원본은 지우지 않고 남겨 둔다. */
    var legacy = parse(safeGet(LEGACY_KEY));
    if (legacy && legacy.version === 1 && typeof legacy.teams === "object") {
      return write(migrate(legacy));
    }

    return emptyState();
  }

  function safeGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return null;
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

    if (!Array.isArray(found.units)) found.units = [];
    if (!Array.isArray(found.equipment)) found.equipment = [];
    if (typeof found.seq !== "number") found.seq = found.units.length;
    return found;
  }

  /** 아무것도 담기지 않은 팀은 남겨두지 않는다. */
  function prune(state, teamId) {
    var found = state.teams[teamId];
    if (!found) return;
    if (!found.units.length && !found.equipment.length) {
      delete state.teams[teamId];
    }
  }

  function teamEntry(teamId) {
    return read().teams[teamId] || emptyEntry();
  }

  /* ─── 인스턴스 ────────────────────────────────────────── */

  function units(teamId) {
    return teamEntry(teamId).units;
  }

  function unitsOf(teamId, operativeId) {
    return units(teamId).filter(function (unit) {
      return unit.opId === operativeId;
    });
  }

  function unitCount(teamId, operativeId) {
    return unitsOf(teamId, operativeId).length;
  }

  function totalUnits(teamId) {
    return units(teamId).length;
  }

  function addUnit(teamId, operativeId) {
    var state = read();
    var found = entry(state, teamId);

    found.seq += 1;
    found.units.push({ uid: "u" + found.seq, opId: operativeId, weapons: [] });
    write(state);
    return found.units[found.units.length - 1].uid;
  }

  /** − 버튼용 — 그 요원의 마지막 인스턴스를 뺀다. */
  function removeLastUnit(teamId, operativeId) {
    var state = read();
    var found = entry(state, teamId);

    for (var i = found.units.length - 1; i >= 0; i -= 1) {
      if (found.units[i].opId === operativeId) {
        found.units.splice(i, 1);
        break;
      }
    }

    prune(state, teamId);
    return write(state);
  }

  function findUnit(found, uid) {
    return (
      found.units.filter(function (unit) {
        return unit.uid === uid;
      })[0] || null
    );
  }

  function unitWeapons(teamId, uid) {
    var found = teamEntry(teamId);
    var unit = findUnit(found, uid);
    return unit ? unit.weapons : [];
  }

  function toggleUnitWeapon(teamId, uid, weaponName) {
    var state = read();
    var unit = findUnit(entry(state, teamId), uid);
    if (!unit) return state;

    var at = unit.weapons.indexOf(weaponName);
    if (at === -1) unit.weapons.push(weaponName);
    else unit.weapons.splice(at, 1);

    return write(state);
  }

  function hasUnitWeapon(teamId, uid, weaponName) {
    return unitWeapons(teamId, uid).indexOf(weaponName) !== -1;
  }

  /* ─── 장비 · 플로이 ───────────────────────────────────── */

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

  function hasEquipment(teamId, equipmentId) {
    return teamEntry(teamId).equipment.indexOf(equipmentId) !== -1;
  }

  /* ─── 정리 ────────────────────────────────────────────── */

  function clearTeam(teamId) {
    var state = read();
    delete state.teams[teamId];
    return write(state);
  }

  function clearAll() {
    return write(emptyState());
  }

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
    units: units,
    unitsOf: unitsOf,
    unitCount: unitCount,
    totalUnits: totalUnits,
    addUnit: addUnit,
    removeLastUnit: removeLastUnit,
    unitWeapons: unitWeapons,
    toggleUnitWeapon: toggleUnitWeapon,
    hasUnitWeapon: hasUnitWeapon,
    toggleEquipment: toggleEquipment,
    hasEquipment: hasEquipment,
    clearTeam: clearTeam,
    clearAll: clearAll,
    teamIds: teamIds,
    isEmpty: isEmpty,
    hasSaveFailed: hasSaveFailed,
  };
})();
