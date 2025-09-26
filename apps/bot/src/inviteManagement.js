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
exports.inviteManagement = void 0;
var core_1 = require("@hashira/core");
var date_fns_1 = require("date-fns");
var discord_js_1 = require("discord.js");
var base_1 = require("./base");
var invitesToAttachment = function (invites) {
    return new discord_js_1.AttachmentBuilder(Buffer.from(invites.map(function (invite) { return "".concat(invite.inviterId, ",").concat(invite.code); }).join("\n")), {
        name: "invites.csv",
    });
};
exports.inviteManagement = new core_1.Hashira({ name: "invite-management" })
    .use(base_1.base)
    .group("invites", function (group) {
    return group
        .setDescription("Manage invites")
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageGuild)
        .addCommand("cleanup", function (command) {
        return command
            .setDescription("Remove unused invites older than 2 weeks")
            .handle(function (_a, __1, itx_1) { return __awaiter(void 0, [_a, __1, itx_1], void 0, function (_b, __, itx) {
            var invites, now, protectedInvites, protectedInviteCodes, excludedInvites, invitesWithoutMetadata, oldInvitesToRemove, dialog;
            var prisma = _b.prisma;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!itx.inCachedGuild())
                            return [2 /*return*/];
                        return [4 /*yield*/, itx.deferReply()];
                    case 1:
                        _c.sent();
                        return [4 /*yield*/, itx.guild.invites.fetch()];
                    case 2:
                        invites = _c.sent();
                        now = Date.now();
                        return [4 /*yield*/, prisma.protectedInvite.findMany({
                                where: { guildId: itx.guildId },
                            })];
                    case 3:
                        protectedInvites = _c.sent();
                        protectedInviteCodes = protectedInvites.map(function (invite) { return invite.code; });
                        excludedInvites = invites.filter(function (invite) { return !protectedInviteCodes.includes(invite.code); });
                        invitesWithoutMetadata = excludedInvites.filter(function (invite) { return !invite.createdAt; });
                        if (!(invitesWithoutMetadata.size > 0)) return [3 /*break*/, 6];
                        return [4 /*yield*/, itx.editReply("Found ".concat(invitesWithoutMetadata.size, " invites without metadata. Sending them for manual inspection."))];
                    case 4:
                        _c.sent();
                        return [4 /*yield*/, itx.editReply({
                                files: [invitesToAttachment(invitesWithoutMetadata)],
                            })];
                    case 5:
                        _c.sent();
                        _c.label = 6;
                    case 6:
                        oldInvitesToRemove = excludedInvites.filter(function (invite) {
                            // biome-ignore lint/style/noNonNullAssertion: We ensure createdAt is set above
                            return (0, date_fns_1.differenceInWeeks)(now, invite.createdAt) > 2 && invite.uses === 0;
                        });
                        return [4 /*yield*/, itx.editReply({ files: [invitesToAttachment(oldInvitesToRemove)] })];
                    case 7:
                        _c.sent();
                        dialog = new core_1.ConfirmationDialog("Do you want to delete these invites?", "Yes", "No", function () { return __awaiter(void 0, void 0, void 0, function () {
                            var e_1;
                            var _a;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        _b.trys.push([0, 2, , 4]);
                                        return [4 /*yield*/, Promise.all(oldInvitesToRemove.map(function (invite) {
                                                return itx.guild.invites
                                                    .delete(invite.code, "Cleanup by ".concat(itx.user.id))
                                                    .then(function (inv) { var _a; return (_a = itx.channel) === null || _a === void 0 ? void 0 : _a.send("Deleted invite ".concat(inv.code)); });
                                            }))];
                                    case 1:
                                        _b.sent();
                                        return [3 /*break*/, 4];
                                    case 2:
                                        e_1 = _b.sent();
                                        return [4 /*yield*/, ((_a = itx.channel) === null || _a === void 0 ? void 0 : _a.send("Error deleting invites: ".concat(e_1)))];
                                    case 3:
                                        _b.sent();
                                        return [3 /*break*/, 4];
                                    case 4: return [2 /*return*/];
                                }
                            });
                        }); }, function () { return Promise.resolve(); }, function (buttonItx) { return buttonItx.user.id === itx.user.id; });
                        return [4 /*yield*/, dialog.render({ send: itx.editReply.bind(itx) })];
                    case 8:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
