"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.numberToEmoji = void 0;
var numberToEmojiMap = new Map([
    ["0", "0️⃣"],
    ["1", "1️⃣"],
    ["2", "2️⃣"],
    ["3", "3️⃣"],
    ["4", "4️⃣"],
    ["5", "5️⃣"],
    ["6", "6️⃣"],
    ["7", "7️⃣"],
    ["8", "8️⃣"],
    ["9", "9️⃣"],
]);
var numberToEmoji = function (number) {
    if (number < 0)
        throw new Error("Number must be positive");
    if (number === 10)
        return "🔟";
    return number
        .toString(10)
        .split("")
        .map(function (digit) { return numberToEmojiMap.get(digit); })
        .join("");
};
exports.numberToEmoji = numberToEmoji;
