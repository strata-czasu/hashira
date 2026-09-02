import { type ColorResolvable, resolveColor } from "discord.js";

const preprocessColor = (color: string): `#${string}` => {
  if (color.startsWith("#")) {
    return color as `#${string}`;
  }
  return `#${color}`;
};

export const getColor = (rawColor: ColorResolvable | string) => {
  const color = typeof rawColor === "string" ? preprocessColor(rawColor) : rawColor;
  try {
    return resolveColor(color);
  } catch {
    return null;
  }
};
