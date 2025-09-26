"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGuildSetting = getGuildSetting;
/**
 * Retrieves a value from a mapping keyed by guild ID.
 * @param map Mapping from guild ID to value
 * @param guildId The guild ID to lookup
 * @returns The value for the guild or null if not found
 */
function getGuildSetting(map, guildId) {
    var _a;
    return (_a = map[guildId]) !== null && _a !== void 0 ? _a : null;
}
