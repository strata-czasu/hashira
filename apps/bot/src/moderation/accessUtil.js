"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.composeChannelRestrictionRestoreMessage = exports.composeChannelRestrictionMessage = void 0;
var discord_js_1 = require("discord.js");
var CHANNEL_RESTRICTION_TEMPLATE = "\n## Hejka {{user}}!\nPrzed chwil\u0105 {{moderator}} odebra\u0142 Ci dost\u0119p do kana\u0142u {{channel}}.\n\n**Oto pow\u00F3d odebrania dost\u0119pu:**\n{{reason}}\n\n{{duration_info}}\n\nPrzeczytaj prosz\u0119 nasze Zasady dost\u0119pne pod [tym linkiem](https://discord.com/channels/211261411119202305/873167662082056232/1270484486131290255) i je\u017Celi nie zgadzasz si\u0119 z powodem odebrania dost\u0119pu, to odwo\u0142aj si\u0119 od niego klikaj\u0105c czerwony przycisk \"Odwo\u0142aj si\u0119\" na naszym [kanale od ticket\u00F3w](https://discord.com/channels/211261411119202305/1213901611836117052/1219338768012804106). W odwo\u0142aniu spinguj nick osoby, kt\u00F3ra odebra\u0142a Ci dost\u0119p.\n\nPozdrawiam,\nBiszkopt";
var CHANNEL_RESTRICTION_RESTORE_TEMPLATE = "\n## Hejka {{user}}!\nTo znowu ja! Przed chwil\u0105 przywr\u00F3cono Ci dost\u0119p do kana\u0142u {{channel}}.\n\n{{restore_reason}}\n\n\u017Bycz\u0119 Ci mi\u0142ego dnia i jeszcze raz pozdrawiam!\n\nPozdrawiam,\nBiszkopt";
var composeChannelRestrictionMessage = function (user, moderator, channelId, reason, endsAt) {
    var durationInfo = endsAt
        ? "Dost\u0119p zostanie automatycznie przywr\u00F3cony ".concat((0, discord_js_1.time)(endsAt, discord_js_1.TimestampStyles.RelativeTime), ".")
        : "To odebranie dostępu jest permanentne i może zostać przywrócone tylko ręcznie przez moderację.";
    return CHANNEL_RESTRICTION_TEMPLATE.replace("{{user}}", user.toString())
        .replace("{{moderator}}", "".concat(moderator, " (").concat(moderator.tag, ")"))
        .replace("{{channel}}", (0, discord_js_1.channelMention)(channelId))
        .replace("{{reason}}", (0, discord_js_1.italic)(reason))
        .replace("{{duration_info}}", durationInfo);
};
exports.composeChannelRestrictionMessage = composeChannelRestrictionMessage;
var composeChannelRestrictionRestoreMessage = function (user, channelId, restoreReason) {
    var reasonInfo = restoreReason
        ? "**Pow\u00F3d przywr\u00F3cenia:** ".concat((0, discord_js_1.italic)(restoreReason))
        : "Dostęp został przywrócony automatycznie po upływie czasu blokady.";
    return CHANNEL_RESTRICTION_RESTORE_TEMPLATE.replace("{{user}}", user.toString())
        .replace("{{channel}}", (0, discord_js_1.channelMention)(channelId))
        .replace("{{restore_reason}}", reasonInfo);
};
exports.composeChannelRestrictionRestoreMessage = composeChannelRestrictionRestoreMessage;
