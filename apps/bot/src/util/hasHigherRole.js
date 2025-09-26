"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasHigherRole = void 0;
var hasHigherRole = function (member, target) {
    return member.roles.highest.position > target.roles.highest.position;
};
exports.hasHigherRole = hasHigherRole;
