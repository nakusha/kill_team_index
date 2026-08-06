/*
 * 로스터 라이브러리 (스키마 v3).
 *
 * 이름 붙인 로스터를 여러 개 두고, 그중 하나를 "활성"으로 삼아 킬팀 상세에서 편집한다.
 * 대전 화면은 좌·우에 각각 원하는 항목을 골라 올린다.
 *
 * 서버가 없으므로 브라우저 localStorage 에만 담는다. 저장소를 못 쓰는 환경에서는
 * 메모리로 물러나 그 세션 동안만 유지되며, hasSaveFailed() 로 그 사실을 알린다.
 *
 *   v1  요원을 개수 맵으로 담던 시절 (같은 요원 둘의 무기를 구분 못 함)
 *   v2  인스턴스 배열 — 로스터는 하나뿐
 *   v3  이름 붙인 로스터 여러 개  ← 지금
 */
window.KTR = (function () {
  "use strict";

  var STORAGE_KEY = "kt-index:library:v3";
  var LEGACY_V2 = "kt-index:roster:v2";
  var LEGACY_V1 = "kt-index:roster:v1";
  var VERSION = 3;
  var EXPORT_KIND = "kt-index-roster";

  var memory = null;
  var saveFailed = false;
  var counter = 0;

  function safeGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function parse(raw) {
    try {
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function stamp() {
    return new Date().toISOString();
  }

  /** 항목 id — 시각과 증가 카운터를 섞어 한 세션 안에서 겹치지 않게 한다. */
  function newId() {
    counter += 1;
    return "r" + Date.now().toString(36) + counter.toString(36);
  }

  function emptyEntry() {
    return { seq: 0, units: [], equipment: [] };
  }

  function newItem(name, teams) {
    return { id: newId(), name: name || "새 로스터", savedAt: stamp(), teams: teams || {} };
  }

  function emptyState() {
    var item = newItem("내 로스터");
    return { version: VERSION, activeId: item.id, items: [item] };
  }

  /** v1(개수 맵) → 인스턴스 배열. 인원은 보존하고 무기는 미선택으로 둔다. */
  function migrateV1Teams(teams) {
    var next = {};

    Object.keys(teams || {}).forEach(function (teamId) {
      var found = teams[teamId] || {};
      var entry = emptyEntry();

      Object.keys(found.operatives || {}).forEach(function (operativeId) {
        var count = found.operatives[operativeId];
        for (var i = 0; i < count; i += 1) {
          entry.seq += 1;
          entry.units.push({ uid: "u" + entry.seq, opId: operativeId, weapons: [] });
        }
      });

      entry.equipment = Array.isArray(found.equipment) ? found.equipment.slice() : [];
      next[teamId] = entry;
    });

    return next;
  }

  /** 불러온 데이터를 그대로 믿지 않는다 — 모양이 맞는 것만 남긴다. */
  function sanitizeTeams(teams) {
    var clean = {};

    Object.keys(teams || {}).forEach(function (teamId) {
      var found = teams[teamId];
      if (!found || typeof found !== "object") return;

      var units = (Array.isArray(found.units) ? found.units : [])
        .filter(function (unit) {
          return unit && typeof unit.opId === "string";
        })
        .map(function (unit, index) {
          return {
            uid: typeof unit.uid === "string" ? unit.uid : "u" + (index + 1),
            opId: unit.opId,
            weapons: (Array.isArray(unit.weapons) ? unit.weapons : []).filter(function (name) {
              return typeof name === "string";
            }),
          };
        });

      var equipment = (Array.isArray(found.equipment) ? found.equipment : []).filter(function (id) {
        return typeof id === "string";
      });

      if (!units.length && !equipment.length) return;
      clean[teamId] = { seq: units.length, units: units, equipment: equipment };
    });

    return clean;
  }

  /** 예전 단일 로스터를 항목 하나로 흡수한다. 원본 키는 지우지 않는다. */
  function adoptLegacy() {
    var v2 = parse(safeGet(LEGACY_V2));
    if (v2 && v2.teams && Object.keys(v2.teams).length) {
      var fromV2 = newItem("내 로스터", sanitizeTeams(v2.teams));
      return { version: VERSION, activeId: fromV2.id, items: [fromV2] };
    }

    var v1 = parse(safeGet(LEGACY_V1));
    if (v1 && v1.teams && Object.keys(v1.teams).length) {
      var fromV1 = newItem("내 로스터", sanitizeTeams(migrateV1Teams(v1.teams)));
      return { version: VERSION, activeId: fromV1.id, items: [fromV1] };
    }

    return null;
  }

  function read() {
    if (memory) return memory;

    var current = parse(safeGet(STORAGE_KEY));
    if (current && current.version === VERSION && Array.isArray(current.items) && current.items.length) {
      return current;
    }

    var adopted = adoptLegacy();
    return adopted ? write(adopted) : emptyState();
  }

  function write(state) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      memory = null;
      saveFailed = false;
    } catch (error) {
      memory = state;
      saveFailed = true;
    }
    return state;
  }

  function itemOf(state, id) {
    var wanted = id || state.activeId;
    return (
      state.items.filter(function (item) {
        return item.id === wanted;
      })[0] || state.items[0]
    );
  }

  function activeItem() {
    return itemOf(read(), null);
  }

  /* ─── 활성 로스터 편집 (킬팀 상세에서 쓴다) ──────────────── */

  function entry(item, teamId) {
    if (!item.teams[teamId]) item.teams[teamId] = emptyEntry();
    var found = item.teams[teamId];

    if (!Array.isArray(found.units)) found.units = [];
    if (!Array.isArray(found.equipment)) found.equipment = [];
    if (typeof found.seq !== "number") found.seq = found.units.length;
    return found;
  }

  /** 아무것도 담기지 않은 팀은 남겨두지 않는다. */
  function prune(item, teamId) {
    var found = item.teams[teamId];
    if (!found) return;
    if (!found.units.length && !found.equipment.length) delete item.teams[teamId];
  }

  /** 활성 항목을 고쳐 쓰는 공통 절차 — 수정 시각도 함께 남긴다. */
  function mutate(fn) {
    var state = read();
    var item = itemOf(state, null);

    fn(item);
    item.savedAt = stamp();
    return write(state);
  }

  function teamEntry(teamId) {
    return activeItem().teams[teamId] || emptyEntry();
  }

  function units(teamId) {
    return teamEntry(teamId).units;
  }

  function unitsOf(teamId, operativeId) {
    return units(teamId).filter(function (unit) {
      return unit.opId === operativeId;
    });
  }

  function findUnit(item, teamId, uid) {
    return (
      entry(item, teamId).units.filter(function (unit) {
        return unit.uid === uid;
      })[0] || null
    );
  }

  function unitWeapons(teamId, uid) {
    return (
      (teamEntry(teamId).units.filter(function (unit) {
        return unit.uid === uid;
      })[0] || {}).weapons || []
    );
  }

  /* ─── 라이브러리 ──────────────────────────────────────── */

  function list() {
    return read().items.map(function (item) {
      return {
        id: item.id,
        name: item.name,
        savedAt: item.savedAt,
        teams: Object.keys(item.teams).length,
        units: Object.keys(item.teams).reduce(function (sum, teamId) {
          return sum + (item.teams[teamId].units || []).length;
        }, 0),
      };
    });
  }

  /** 읽기 전용 뷰 — 대전 화면이 항목을 그릴 때 쓴다. */
  function viewOf(id) {
    var item = itemOf(read(), id);

    return {
      id: item.id,
      label: item.name,
      teamIds: function () {
        return Object.keys(item.teams);
      },
      teamEntry: function (teamId) {
        return item.teams[teamId] || emptyEntry();
      },
      totalUnits: function (teamId) {
        return (item.teams[teamId] || emptyEntry()).units.length;
      },
      isEmpty: function () {
        return Object.keys(item.teams).length === 0;
      },
    };
  }

  function exportJson(id) {
    var item = itemOf(read(), id);
    return JSON.stringify(
      {
        kind: EXPORT_KIND,
        version: 2,
        name: item.name,
        exportedAt: stamp(),
        teams: item.teams,
      },
      null,
      2,
    );
  }

  /**
   * 붙여넣은 텍스트나 파일 내용을 새 항목으로 들인다.
   * 무엇이 잘못됐는지 말해 주기 위해 성공/실패를 객체로 돌려준다.
   */
  function importJson(text, fallbackName) {
    var parsed = parse(String(text || "").trim());
    if (!parsed || typeof parsed !== "object") {
      return { ok: false, message: "JSON 형식이 아닙니다." };
    }
    if (parsed.kind && parsed.kind !== EXPORT_KIND) {
      return { ok: false, message: "이 사이트의 로스터 파일이 아닙니다." };
    }

    var rawTeams = parsed.version === 1 ? migrateV1Teams(parsed.teams) : parsed.teams || parsed;
    var teams = sanitizeTeams(rawTeams);
    if (!Object.keys(teams).length) {
      return { ok: false, message: "불러올 킬팀이 없습니다." };
    }

    var item = newItem(parsed.name || fallbackName || "불러온 로스터", teams);
    var state = read();
    state.items.push(item);
    write(state);

    return { ok: true, id: item.id, name: item.name, teams: Object.keys(teams).length };
  }

  return {
    /* ─ 활성 로스터 편집 ─ */
    teamEntry: teamEntry,
    units: units,
    unitsOf: unitsOf,
    unitCount: function (teamId, operativeId) {
      return unitsOf(teamId, operativeId).length;
    },
    totalUnits: function (teamId) {
      return units(teamId).length;
    },
    teamIds: function () {
      return Object.keys(activeItem().teams);
    },
    isEmpty: function () {
      return Object.keys(activeItem().teams).length === 0;
    },
    addUnit: function (teamId, operativeId) {
      var uid = null;
      mutate(function (item) {
        var found = entry(item, teamId);
        found.seq += 1;
        uid = "u" + found.seq;
        found.units.push({ uid: uid, opId: operativeId, weapons: [] });
      });
      return uid;
    },
    /** − 버튼용 — 그 요원의 마지막 인스턴스를 뺀다. */
    removeLastUnit: function (teamId, operativeId) {
      return mutate(function (item) {
        var found = entry(item, teamId);
        for (var i = found.units.length - 1; i >= 0; i -= 1) {
          if (found.units[i].opId === operativeId) {
            found.units.splice(i, 1);
            break;
          }
        }
        prune(item, teamId);
      });
    },
    unitWeapons: unitWeapons,
    toggleUnitWeapon: function (teamId, uid, weaponName) {
      return mutate(function (item) {
        var unit = findUnit(item, teamId, uid);
        if (!unit) return;

        var at = unit.weapons.indexOf(weaponName);
        if (at === -1) unit.weapons.push(weaponName);
        else unit.weapons.splice(at, 1);
      });
    },
    hasUnitWeapon: function (teamId, uid, weaponName) {
      return unitWeapons(teamId, uid).indexOf(weaponName) !== -1;
    },
    toggleEquipment: function (teamId, equipmentId) {
      return mutate(function (item) {
        var found = entry(item, teamId);
        var at = found.equipment.indexOf(equipmentId);

        if (at === -1) found.equipment.push(equipmentId);
        else found.equipment.splice(at, 1);
        prune(item, teamId);
      });
    },
    hasEquipment: function (teamId, equipmentId) {
      return teamEntry(teamId).equipment.indexOf(equipmentId) !== -1;
    },
    clearTeam: function (teamId) {
      return mutate(function (item) {
        delete item.teams[teamId];
      });
    },
    clearAll: function () {
      return mutate(function (item) {
        item.teams = {};
      });
    },

    /* ─ 라이브러리 ─ */
    list: list,
    viewOf: viewOf,
    activeId: function () {
      return activeItem().id;
    },
    activeName: function () {
      return activeItem().name;
    },
    setActive: function (id) {
      var state = read();
      if (
        state.items.some(function (item) {
          return item.id === id;
        })
      ) {
        state.activeId = id;
        write(state);
      }
      return state;
    },
    create: function (name) {
      var state = read();
      var item = newItem(name);

      state.items.push(item);
      state.activeId = item.id;
      write(state);
      return item.id;
    },
    duplicate: function (id) {
      var state = read();
      var source = itemOf(state, id);
      var copy = newItem(source.name + " 사본", JSON.parse(JSON.stringify(source.teams)));

      state.items.push(copy);
      write(state);
      return copy.id;
    },
    rename: function (id, name) {
      var state = read();
      var item = itemOf(state, id);

      item.name = String(name || "").trim() || item.name;
      item.savedAt = stamp();
      return write(state);
    },
    /** 마지막 하나는 지우지 않고 비우기만 한다 — 편집할 대상이 사라지면 안 된다. */
    remove: function (id) {
      var state = read();

      if (state.items.length <= 1) {
        state.items[0].teams = {};
        state.items[0].savedAt = stamp();
        return write(state);
      }

      state.items = state.items.filter(function (item) {
        return item.id !== id;
      });
      if (state.activeId === id) state.activeId = state.items[0].id;
      return write(state);
    },
    exportJson: exportJson,
    importJson: importJson,

    /** 저장에 실패한 적이 있으면 true — 화면에 경고를 띄우는 데 쓴다. */
    hasSaveFailed: function () {
      return saveFailed;
    },
  };
})();
