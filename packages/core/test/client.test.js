"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var bun_test_1 = require("bun:test");
var expect_type_1 = require("expect-type");
var src_1 = require("../src");
(0, bun_test_1.describe)("Hashira", function () {
    var bar = new src_1.Hashira({ name: "bar" }).state("bux", 1);
    var foo = new src_1.Hashira({ name: "foo" })
        .const("foo", 1)
        .state("bar", 2)
        .derive(function (_a) {
        var foo = _a.foo;
        return ({ baz: foo + 1 });
    });
    var baz = new src_1.Hashira({ name: "baz" }).use(bar).state("baz", 3);
    (0, bun_test_1.test)("should be able to chain const, derive, and state", function () {
        (0, expect_type_1.expectTypeOf)(bar).toEqualTypeOf();
        (0, expect_type_1.expectTypeOf)(foo).toEqualTypeOf();
    });
    (0, bun_test_1.test)("should be able to use another Hashira instance", function () {
        (0, expect_type_1.expectTypeOf)(baz).toEqualTypeOf();
    });
});
