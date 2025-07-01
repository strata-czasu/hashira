"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLogMessageEmbed = void 0;
var discord_js_1 = require("discord.js");
var getLogMessageEmbed = function (author, _timestamp) {
    var _a;
    var user = author instanceof discord_js_1.GuildMember ? author.user : author;
    var tag = (_a = user.tag) !== null && _a !== void 0 ? _a : "Nieznany";
    return new discord_js_1.EmbedBuilder().setAuthor({
        name: "".concat(tag, " (").concat(user.id, ")"),
        iconURL: user.displayAvatarURL(),
    });
};
exports.getLogMessageEmbed = getLogMessageEmbed;
