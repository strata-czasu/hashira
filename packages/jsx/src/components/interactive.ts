import { ButtonBuilder, ButtonStyle, type ComponentEmojiResolvable } from "discord.js";
import { getTextContent, markAsHost } from "../internal/utils";
import type { JSXNode } from "../types";

interface BaseButtonProps {
  /** Text that appears on the button; max 80 characters */
  label?: string;
  /** Emoji to display on the button */
  emoji?: ComponentEmojiResolvable;
  /** Whether the button is disabled */
  disabled?: boolean;
  children?: JSXNode;
}

export interface InteractiveButtonProps extends BaseButtonProps {
  /** Button style - Primary, Secondary, Success, or Danger */
  style:
    | ButtonStyle.Primary
    | ButtonStyle.Secondary
    | ButtonStyle.Success
    | ButtonStyle.Danger;
  /** Developer-defined identifier; max 100 characters */
  customId: string;
  /** URL is not allowed for interactive buttons */
  url?: never;
  /** SKU ID is not allowed for interactive buttons */
  skuId?: never;
}

export interface LinkButtonProps extends BaseButtonProps {
  /** Must be Link style */
  style?: ButtonStyle.Link;
  /** URL to navigate to; max 512 characters */
  url: string;
  /** Custom ID is not allowed for link buttons */
  customId?: never;
  /** SKU ID is not allowed for link buttons */
  skuId?: never;
}

export interface PremiumButtonProps {
  /** Must be Premium style */
  style?: ButtonStyle.Premium;
  /** Identifier for a purchasable SKU */
  skuId: string;
  /** Label is not allowed for premium buttons */
  label?: never;
  /** Emoji is not allowed for premium buttons */
  emoji?: never;
  /** URL is not allowed for premium buttons */
  url?: never;
  /** Custom ID is not allowed for premium buttons */
  customId?: never;
  /** Disabled is not allowed for premium buttons */
  disabled?: never;
  /** Children are not allowed for premium buttons */
  children?: never;
}

export type ButtonProps = InteractiveButtonProps | LinkButtonProps | PremiumButtonProps;

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
