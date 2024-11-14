const numberToEmojiMap = new Map([
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

export const numberToEmoji = (number: number): string => {
  if (number < 0) throw new Error("Number must be positive");
  if (number === 10) return "🔟";

  return number
    .toString(10)
    .split("")
    .map((digit) => numberToEmojiMap.get(digit))
    .join("");
};
