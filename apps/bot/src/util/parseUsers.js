"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseUserMentions = void 0;
var mentionRegex = /^<@!?(\d{15,20})>$/;
var idRegex = /^\d{15,20}$/;
var getFromIdOrMention = function (idOrMention) {
    var _a;
    var match = idOrMention.match(mentionRegex);
    if (match)
        return (_a = match[1]) !== null && _a !== void 0 ? _a : null;
    return idRegex.test(idOrMention) ? idOrMention : null;
};
var parseUserMentions = function (content) {
    return content
        .replaceAll("<", " <")
        .split(/\s+/)
        .map(getFromIdOrMention)
        .filter(function (id) { return !!id; });
};
exports.parseUserMentions = parseUserMentions;
