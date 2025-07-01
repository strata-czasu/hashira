"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var bun_test_1 = require("bun:test");
var numberToEmoji_1 = require("../src/util/numberToEmoji");
(0, bun_test_1.describe)("numberToEmoji", function () {
    (0, bun_test_1.test)("converts number to emoji", function () {
        (0, bun_test_1.expect)((0, numberToEmoji_1.numberToEmoji)(123)).toBe("1️⃣2️⃣3️⃣");
    });
    (0, bun_test_1.test)("converts 10 to emoji", function () {
        (0, bun_test_1.expect)((0, numberToEmoji_1.numberToEmoji)(10)).toBe("🔟");
    });
    (0, bun_test_1.test)("throws for negative number", function () {
        (0, bun_test_1.expect)(function () { return (0, numberToEmoji_1.numberToEmoji)(-1); }).toThrow("Number must be positive");
    });
});
