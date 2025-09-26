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
exports.waitForButtonClick = waitForButtonClick;
var discord_js_1 = require("discord.js");
var duration_1 = require("./duration");
function ok(interaction, component) {
    return {
        interaction: interaction,
        component: component,
        editButton: function (fn) {
            return editButton(interaction.message, component, fn);
        },
        removeButton: function () {
            return removeButton(interaction.message);
        },
    };
}
function err(component, message) {
    return {
        interaction: null,
        component: component,
        editButton: function (fn) {
            return editButton(message, component, fn);
        },
        removeButton: function () {
            return removeButton(message);
        },
    };
}
/**
 * Waits for a button click on a Discord message and returns the interaction result.
 *
 * This function creates a component collector that listens for button interactions
 * on a specific button within a message. It will resolve when the button is clicked
 * or when the timeout is reached.
 *
 * @param message - The Discord message containing the button to wait for
 * @param customId - The custom ID of the button to listen for clicks on
 * @param timeout - The duration to wait for a button click before timing out
 * @param filter - A filter function to determine which button interactions to accept
 *
 * @returns A promise that resolves to a Result object containing:
 *   - If successful: the button interaction, component, and editButton function
 *   - If timeout: null interaction, component, and editButton function
 *
 * @throws {Error} When the button with the specified customId is not found in the message
 *
 * @example
 * ```typescript
 * const result = await waitForButtonClick(
 *   message,
 *   'confirm-button',
 *   { minutes: 5 },
 *   (interaction) => interaction.user.id === userId
 * );
 *
 * if (result.interaction) {
 *   await result.interaction.reply('Button clicked!');
 * } else {
 *   console.log('Button click timed out');
 * }
 * ```
 */
function waitForButtonClick(message, customId, timeout, filter) {
    var component = message.resolveComponent(customId);
    if (!component || !(component instanceof discord_js_1.ButtonComponent)) {
        throw new Error("Button with customId \"".concat(customId, "\" not found in message."));
    }
    // Based on https://github.com/discordjs/discord.js/blob/8124fc68bee3e4a2e4e83240d9885abcad942fb0/packages/discord.js/src/structures/Message.js#L690
    return new Promise(function (resolve) {
        var collector = message.createMessageComponentCollector({
            componentType: discord_js_1.ComponentType.Button,
            time: (0, duration_1.durationToMilliseconds)(timeout),
            max: 1,
            filter: filter,
        });
        collector.once("end", function (interactions, _) {
            var interaction = interactions.first();
            if (interaction)
                resolve(ok(interaction, component));
            else
                resolve(err(component, message));
        });
    });
}
function editButton(message, button, fn) {
    return __awaiter(this, void 0, void 0, function () {
        var builder, row;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fn(discord_js_1.ButtonBuilder.from(button))];
                case 1:
                    builder = _a.sent();
                    row = new discord_js_1.ActionRowBuilder().addComponents(builder);
                    return [4 /*yield*/, message.edit({ components: [row] })];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function removeButton(message) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, message.edit({ components: [] })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
