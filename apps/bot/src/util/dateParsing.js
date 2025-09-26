"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDate = void 0;
var date_fns_1 = require("date-fns");
var parse = function () {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var date = date_fns_1.parse.apply(void 0, args);
    if (!(0, date_fns_1.isValid)(date))
        return null;
    return date;
};
var alignmentTable = {
    start: {
        month: function () { return (0, date_fns_1.startOfMonth)(new Date()); },
        year: function () { return (0, date_fns_1.startOfYear)(new Date()); },
        yesterday: date_fns_1.startOfYesterday,
        today: date_fns_1.startOfToday,
        tomorrow: date_fns_1.startOfTomorrow,
        now: function () { return new Date(); },
    },
    end: {
        month: function () { return (0, date_fns_1.endOfMonth)(new Date()); },
        year: function () { return (0, date_fns_1.endOfYear)(new Date()); },
        yesterday: date_fns_1.endOfYesterday,
        today: date_fns_1.endOfToday,
        tomorrow: date_fns_1.endOfTomorrow,
        now: function () { return new Date(); },
    },
    now: {
        month: function () { return new Date(); },
        year: function () { return new Date(); },
        yesterday: function () { return (0, date_fns_1.sub)(new Date(), { days: 1 }); },
        today: function () { return new Date(); },
        tomorrow: function () { return (0, date_fns_1.add)(new Date(), { days: 1 }); },
        now: function () { return new Date(); },
    },
};
var parseNaturalDate = function (date, alignment) { var _a, _b, _c; return (_c = (_b = (_a = alignmentTable[alignment])[date]) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : null; };
var any = function () {
    var parsers = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        parsers[_i] = arguments[_i];
    }
    return function (date, alignment) {
        for (var _i = 0, parsers_1 = parsers; _i < parsers_1.length; _i++) {
            var parser = parsers_1[_i];
            var parsed = parser(date, alignment);
            if (parsed)
                return parsed;
        }
        return null;
    };
};
var parseMonthNumber = function (month) { return parse(month, "MM", new Date()); };
var parseMonthName = function (month) { return parse(month, "MMMM", new Date()); };
var parseMonthDay = function (monthDay) { return parse(monthDay, "MM-dd", new Date()); };
var parseYearNumber = function (year) { return parse(year, "yyyy", new Date()); };
var parseYearMonth = function (yearMonth) { return parse(yearMonth, "yyyy-MM", new Date()); };
var parseYearMonthDay = function (yearMonthDay) {
    return parse(yearMonthDay, "yyyy-MM-dd", new Date());
};
var parsers = [
    parseNaturalDate,
    parseMonthNumber,
    parseMonthName,
    parseMonthDay,
    parseYearNumber,
    parseYearMonth,
    parseYearMonthDay,
];
var resolveDefault = function (orDefault) {
    return orDefault instanceof Function ? orDefault() : orDefault;
};
var parseDate = function (date, alignment, orDefault) {
    var _a;
    if (!date)
        return resolveDefault(orDefault);
    return (_a = any.apply(void 0, parsers)(date, alignment)) !== null && _a !== void 0 ? _a : resolveDefault(orDefault);
};
exports.parseDate = parseDate;
