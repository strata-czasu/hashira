import { ButtonBuilder, ButtonStyle } from "discord.js";
import { getTextContent, markAsHost } from "../internal/utils";
import type { ButtonProps } from "../types";

export const Button = markAsHost(function Button(props: ButtonProps): ButtonBuilder {
  const btn = new ButtonBuilder();

  const childLabel = props.children ? getTextContent(props.children) : null;

  if (childLabel && props.label) {
    throw new Error("Button cannot have both 'label' prop and children.");
  }

  const label = props.label ?? childLabel;

  if (props.skuId) {
    btn.setStyle(ButtonStyle.Premium);
    btn.setSKUId(props.skuId);
    return btn;
  }

  if (label) btn.setLabel(label);
  if (props.emoji) btn.setEmoji(props.emoji);
  if (props.disabled) btn.setDisabled(props.disabled);

  if (props.url) {
    btn.setStyle(ButtonStyle.Link);
    btn.setURL(props.url);
    return btn;
  }

  if (props.style) {
    btn.setStyle(props.style);
  } else {
    btn.setStyle(ButtonStyle.Secondary);
  }

  if (props.customId) btn.setCustomId(props.customId);

  return btn;
});
