"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var bun_test_1 = require("bun:test");
var range_1 = require("./range");
(0, bun_test_1.describe)("range", function () {
    (0, bun_test_1.it)("should create an array with numbers from start to end-1", function () {
        (0, bun_test_1.expect)((0, range_1.range)(0, 5)).toEqual([0, 1, 2, 3, 4]);
        (0, bun_test_1.expect)((0, range_1.range)(2, 6)).toEqual([2, 3, 4, 5]);
    });
    (0, bun_test_1.it)("should return empty array when start equals end", function () {
        (0, bun_test_1.expect)((0, range_1.range)(5, 5)).toEqual([]);
    });
    (0, bun_test_1.it)("should return empty array when start is greater than end", function () {
        // Use type assertion for this edge case to avoid TypeScript recursion issues
        var rangeForInvalidRange = range_1.range;
        (0, bun_test_1.expect)(rangeForInvalidRange(10, 5)).toEqual([]);
    });
    (0, bun_test_1.it)("should handle single element range", function () {
        (0, bun_test_1.expect)((0, range_1.range)(5, 6)).toEqual([5]);
    });
    (0, bun_test_1.it)("should handle range starting from zero", function () {
        (0, bun_test_1.expect)((0, range_1.range)(0, 3)).toEqual([0, 1, 2]);
    });
    (0, bun_test_1.it)("should handle larger ranges", function () {
        (0, bun_test_1.expect)((0, range_1.range)(10, 15)).toEqual([10, 11, 12, 13, 14]);
    });
    // Without this, TypeScript will suffer a stroke and it will tell you that maximum call stack size has been exceeded
    var rangeForNegatives = range_1.range;
    (0, bun_test_1.it)("should throw an error when start is negative", function () {
        (0, bun_test_1.expect)(function () { return rangeForNegatives(-1, 5); }).toThrow("Range bounds must be non-negative integers");
    });
    (0, bun_test_1.it)("should throw an error when end is negative", function () {
        (0, bun_test_1.expect)(function () { return rangeForNegatives(0, -5); }).toThrow("Range bounds must be non-negative integers");
    });
    (0, bun_test_1.it)("should throw an error when both start and end are negative", function () {
        (0, bun_test_1.expect)(function () { return rangeForNegatives(-3, -1); }).toThrow("Range bounds must be non-negative integers");
    });
});
(0, bun_test_1.describe)("rangeObject", function () {
    (0, bun_test_1.it)("should create an object with keys from start to end-1 and mapped values", function () {
        var result = (0, range_1.rangeObject)(0, 3, function (i) { return i * 2; });
        (0, bun_test_1.expect)(result).toEqual({
            0: 0,
            1: 2,
            2: 4,
        });
    });
    (0, bun_test_1.it)("should handle string values from mapper", function () {
        var result = (0, range_1.rangeObject)(1, 4, function (i) { return "value-".concat(i); });
        (0, bun_test_1.expect)(result).toEqual({
            1: "value-1",
            2: "value-2",
            3: "value-3",
        });
    });
    (0, bun_test_1.it)("should handle object values from mapper", function () {
        var result = (0, range_1.rangeObject)(0, 2, function (i) { return ({ id: i, name: "Item ".concat(i) }); });
        (0, bun_test_1.expect)(result).toEqual({
            0: { id: 0, name: "Item 0" },
            1: { id: 1, name: "Item 1" },
        });
    });
    (0, bun_test_1.it)("should handle empty range", function () {
        var result = (0, range_1.rangeObject)(5, 5, function (i) { return i; });
        (0, bun_test_1.expect)(result).toEqual({});
    });
    (0, bun_test_1.it)("should return empty object when start is greater than end", function () {
        // Use type assertion for this edge case to avoid TypeScript recursion issues
        var rangeObjectForInvalidRange = range_1.rangeObject;
        var result = rangeObjectForInvalidRange(10, 5, function (i) { return i; });
        (0, bun_test_1.expect)(result).toEqual({});
    });
    (0, bun_test_1.it)("should handle single element range", function () {
        var result = (0, range_1.rangeObject)(5, 6, function (i) { return i * 2; });
        (0, bun_test_1.expect)(result).toEqual({ 5: 10 });
    });
    (0, bun_test_1.it)("should handle range starting from zero", function () {
        var result = (0, range_1.rangeObject)(0, 2, function (i) { return "item-".concat(i); });
        (0, bun_test_1.expect)(result).toEqual({
            0: "item-0",
            1: "item-1",
        });
    });
    (0, bun_test_1.it)("should work with custom keyMapper", function () {
        var result = (0, range_1.rangeObject)(0, 3, function (i) { return i * 2; }, function (i) { return "key-".concat(i); });
        (0, bun_test_1.expect)(result).toEqual({
            "key-0": 0,
            "key-1": 2,
            "key-2": 4,
        });
    });
    (0, bun_test_1.it)("should work with keyMapper returning numbers", function () {
        var result = (0, range_1.rangeObject)(0, 3, function (i) { return "value-".concat(i); }, function (i) { return i + 100; });
        (0, bun_test_1.expect)(result).toEqual({
            100: "value-0",
            101: "value-1",
            102: "value-2",
        });
    });
    (0, bun_test_1.it)("should handle larger ranges", function () {
        var result = (0, range_1.rangeObject)(10, 13, function (i) { return i * i; });
        (0, bun_test_1.expect)(result).toEqual({
            10: 100,
            11: 121,
            12: 144,
        });
    });
    // Without this, TypeScript will suffer a stroke and it will tell you that maximum call stack size has been exceeded
    var rangeObjectForNegatives = range_1.rangeObject;
    (0, bun_test_1.it)("should throw an error when start is negative", function () {
        (0, bun_test_1.expect)(function () { return rangeObjectForNegatives(-1, 5, function (i) { return i; }); }).toThrow("Range bounds must be non-negative integers");
    });
    (0, bun_test_1.it)("should throw an error when end is negative", function () {
        (0, bun_test_1.expect)(function () { return rangeObjectForNegatives(0, -5, function (i) { return i; }); }).toThrow("Range bounds must be non-negative integers");
    });
    (0, bun_test_1.it)("should throw an error when both start and end are negative", function () {
        (0, bun_test_1.expect)(function () { return rangeObjectForNegatives(-3, -1, function (i) { return i; }); }).toThrow("Range bounds must be non-negative integers");
    });
});
