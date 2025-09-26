"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeMap = void 0;
var mergeMap = function (onConflict) {
    var maps = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        maps[_i - 1] = arguments[_i];
    }
    var result = new Map();
    for (var _a = 0, maps_1 = maps; _a < maps_1.length; _a++) {
        var map = maps_1[_a];
        for (var _b = 0, map_1 = map; _b < map_1.length; _b++) {
            var _c = map_1[_b], key = _c[0], value = _c[1];
            var existing = result.get(key);
            if (existing !== undefined) {
                result.set(key, onConflict(existing, value, key));
            }
            else {
                result.set(key, value);
            }
        }
    }
    return result;
};
exports.mergeMap = mergeMap;
