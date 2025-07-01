"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var bun_test_1 = require("bun:test");
var pluralize_1 = require("../src/util/pluralize");
(0, bun_test_1.test)("returns correct pluralized string for count 0", function () {
    var declinations = {
        0: "apple",
        1: "apples",
        2: "apples",
    };
    var pluralize = (0, pluralize_1.createPluralize)(declinations);
    var result = pluralize(0);
    (0, bun_test_1.expect)(result).toBe("apple");
});
(0, bun_test_1.test)("returns correct pluralized string for count 1", function () {
    var declinations = {
        0: "apple",
        1: "apples",
        2: "apples",
    };
    var pluralize = (0, pluralize_1.createPluralize)(declinations);
    var result = pluralize(1);
    (0, bun_test_1.expect)(result).toBe("apples");
});
(0, bun_test_1.test)("returns correct pluralized string for count 2", function () {
    var declinations = {
        0: "apple",
        1: "apples",
        2: "applebees",
    };
    var pluralize = (0, pluralize_1.createPluralize)(declinations);
    var result = pluralize(2);
    (0, bun_test_1.expect)(result).toBe("applebees");
});
(0, bun_test_1.test)("returns correct pluralized string for count 3", function () {
    var declinations = {
        0: "apple",
        1: "apples",
        2: "apples",
    };
    var pluralize = (0, pluralize_1.createPluralize)(declinations);
    var result = pluralize(3);
    (0, bun_test_1.expect)(result).toBe("apples");
});
