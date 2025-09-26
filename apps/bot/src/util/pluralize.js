"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pluralizers = exports.createPluralize = exports.pluralize = void 0;
var internalPluralize = function (count, declinations) {
    for (var _i = 0, declinations_1 = declinations; _i < declinations_1.length; _i++) {
        var _a = declinations_1[_i], key = _a[0], value = _a[1];
        if (count >= key)
            return value;
    }
    // biome-ignore lint/style/noNonNullAssertion: This will always be defined considering how the function is used
    return declinations.at(-1)[1];
};
var extractDeclinations = function (declinations) {
    var entries = Object.entries(declinations).map(function (_a) {
        var key = _a[0], value = _a[1];
        return [Number.parseInt(key, 10), value];
    });
    if (entries.length === 0)
        throw new Error("No possibilities provided");
    return entries.toSorted(function (_a, _b) {
        var numA = _a[0];
        var numB = _b[0];
        return numB - numA;
    });
};
var pluralize = function (count, declinations) {
    var declinationsArray = extractDeclinations(declinations);
    return internalPluralize(count, declinationsArray);
};
exports.pluralize = pluralize;
var createPluralize = function (declinations) {
    var declinationsArray = extractDeclinations(declinations);
    return function (count) { return internalPluralize(count, declinationsArray); };
};
exports.createPluralize = createPluralize;
exports.pluralizers = {
    users: (0, exports.createPluralize)({
        0: "użytkowników",
        1: "użytkownik",
        2: "użytkowników",
    }),
    messages: (0, exports.createPluralize)({
        0: "wiadomości",
        1: "wiadomość",
        2: "wiadomości",
    }),
    points: (0, exports.createPluralize)({
        0: "punktów",
        1: "punkt",
        2: "punkty",
        5: "punktów",
    }),
    days: (0, exports.createPluralize)({
        0: "dni",
        1: "dzień",
        2: "dni",
    }),
    genitiveDays: (0, exports.createPluralize)({
        0: "dni",
        1: "dnia",
        2: "dni",
    }),
};
