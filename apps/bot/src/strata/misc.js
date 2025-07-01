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
exports.misc = void 0;
var core_1 = require("@hashira/core");
var paginate_1 = require("@hashira/paginate");
var discord_js_1 = require("discord.js");
var es_toolkit_1 = require("es-toolkit");
var base_1 = require("../base");
var parseUsers_1 = require("../util/parseUsers");
exports.misc = new core_1.Hashira({ name: "strata-misc" })
    .use(base_1.base)
    .group("strata", function (group) {
    return group
        .setDefaultMemberPermissions(0)
        .setDescription("Dodatkowe komendy :3")
        .addCommand("ok-lista", function (command) {
        return command
            .setDescription("Zgarnij listę Opiekunów Kanałów")
            .handle(function (_, __, itx) { return __awaiter(void 0, void 0, void 0, function () {
            var channels, mentionedUsers, _i, _a, channel, _b, _c, userId, usersById, users, paginator, paginatedView;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.guild.channels.fetch()];
                    case 1:
                        channels = _d.sent();
                        mentionedUsers = [];
                        for (_i = 0, _a = channels.values(); _i < _a.length; _i++) {
                            channel = _a[_i];
                            if (!channel)
                                continue;
                            if (channel.isVoiceBased() || !channel.isTextBased())
                                continue;
                            if (!channel.topic)
                                continue;
                            for (_b = 0, _c = (0, parseUsers_1.parseUserMentions)(channel.topic); _b < _c.length; _b++) {
                                userId = _c[_b];
                                mentionedUsers.push({ userId: userId, channelId: channel.id });
                            }
                        }
                        usersById = (0, es_toolkit_1.groupBy)(mentionedUsers, function (user) {
                            return (0, discord_js_1.userMention)(user.userId);
                        });
                        users = (0, es_toolkit_1.mapValues)(usersById, function (user) {
                            return user.map(function (u) { return (0, discord_js_1.channelMention)(u.channelId); });
                        });
                        paginator = new paginate_1.StaticPaginator({
                            items: Object.entries(users),
                            pageSize: 10,
                        });
                        paginatedView = new core_1.PaginatedView(paginator, "Opiekunowie Kanałów", function (_a) {
                            var userMention = _a[0], channels = _a[1];
                            return "".concat((0, discord_js_1.bold)(userMention), ": ").concat(channels.join(", "));
                        });
                        return [4 /*yield*/, paginatedView.render(itx)];
                    case 2:
                        _d.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
