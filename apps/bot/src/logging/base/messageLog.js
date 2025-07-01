"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageLog = void 0;
var core_1 = require("@hashira/core");
var discord_js_1 = require("discord.js");
var logger_1 = require("./logger");
var util_1 = require("./util");
var linkMessage = function (message) { return "[Wiadomo\u015B\u0107](".concat(message.url, ")"); };
var linkChannel = function (channel) {
    return "".concat((0, discord_js_1.channelMention)(channel.id), " (").concat(channel.name, ")");
};
var getMessageUpdateLogContent = function (message, content) {
    var out = content;
    if (message.attachments.size > 0) {
        out += "\n\n**Za\u0142\u0105czniki**\n".concat(message.attachments.map(function (a) { return "- ".concat(a.proxyURL); }).join("\n"));
    }
    return out;
};
exports.messageLog = new core_1.Hashira({ name: "messageLog" }).const("messageLog", new logger_1.Logger()
    .addMessageType("messageDelete", function (_a, _b) { return __awaiter(void 0, [_a, _b], void 0, function (_c, _d) {
    var embed, fieldName;
    var timestamp = _c.timestamp;
    var message = _d.message;
    return __generator(this, function (_e) {
        embed = (0, util_1.getLogMessageEmbed)(message.author, timestamp)
            .setDescription("**".concat(linkMessage(message), " usuni\u0119ta na ").concat(linkChannel(message.channel), "**\n").concat(message.content))
            .setColor("Red");
        if (message.attachments.size > 0) {
            fieldName = message.attachments.size > 1 ? "Załączniki" : "Załącznik";
            embed.addFields([
                {
                    name: fieldName,
                    value: message.attachments.map(function (a) { return "- ".concat(a.proxyURL); }).join("\n"),
                },
            ]);
        }
        return [2 /*return*/, embed];
    });
}); })
    .addMessageType("messageUpdate", function (_a, _b) { return __awaiter(void 0, [_a, _b], void 0, function (_c, _d) {
    var lines, embed;
    var timestamp = _c.timestamp;
    var oldMessage = _d.oldMessage, newMessage = _d.newMessage, oldMessageContent = _d.oldMessageContent, newMessageContent = _d.newMessageContent;
    return __generator(this, function (_e) {
        lines = [
            "**".concat(linkMessage(newMessage), " edytowana na ").concat(linkChannel(newMessage.channel), "**"),
            "### Stara wiadomo\u015B\u0107\n".concat(getMessageUpdateLogContent(oldMessage, oldMessageContent)),
            "### Nowa wiadomo\u015B\u0107\n".concat(getMessageUpdateLogContent(newMessage, newMessageContent)),
        ];
        embed = (0, util_1.getLogMessageEmbed)(newMessage.author, timestamp)
            .setDescription(lines.join("\n"))
            .setColor("Yellow");
        return [2 /*return*/, embed];
    });
}); }));
