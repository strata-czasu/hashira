import {
  ActionRowBuilder,
  ButtonBuilder,
  ChannelSelectMenuBuilder,
  ContainerBuilder,
  FileBuilder,
  MediaGalleryBuilder,
  MentionableSelectMenuBuilder,
  type MessageActionRowComponentBuilder,
  RoleSelectMenuBuilder,
  SectionBuilder,
  SeparatorBuilder,
  type SeparatorSpacingSize,
  StringSelectMenuBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
  UserSelectMenuBuilder,
} from "discord.js";
import { flattenChildren, markAsHost } from "../internal/utils";
import type { JSXNode } from "../types";

export interface ActionRowProps {
  children?: JSXNode;
}

/**
 * Props for Section component
 */
export interface SectionProps {
  /** Required accessory component (Button or Thumbnail) */
  accessory: ButtonBuilder | ThumbnailBuilder | JSXNode;
  children?: JSXNode;
}

/**
 * Props for Separator component
 */
export interface SeparatorProps {
  /** Whether to show a visible divider line */
  divider?: boolean;
  /** Spacing size (Small=1, Large=2) */
  spacing?: SeparatorSpacingSize;
  children?: undefined;
}

/**
 * Props for Container component
 */
export interface ContainerProps {
  /** Accent color as integer (e.g., 0xFF0000 for red) */
  accentColor?: number;
  /** Whether the container content is spoilered */
  spoiler?: boolean;
  children?: JSXNode;
}

export const ActionRow = markAsHost(function ActionRow({
  children,
}: ActionRowProps): ActionRowBuilder<MessageActionRowComponentBuilder> {
  const row = new ActionRowBuilder<MessageActionRowComponentBuilder>();

  if (children) {
    const components = flattenChildren(children);
    for (const component of components) {
      // I don't see a better way to type this, so we'll just check the instance types
      if (
        component instanceof ButtonBuilder ||
        component instanceof StringSelectMenuBuilder ||
        component instanceof UserSelectMenuBuilder ||
        component instanceof RoleSelectMenuBuilder ||
        component instanceof MentionableSelectMenuBuilder ||
        component instanceof ChannelSelectMenuBuilder
      ) {
        row.addComponents(component);
      }
    }
  }

  return row;
});

export const Section = markAsHost(function Section(
  props: SectionProps,
): SectionBuilder {
  const section = new SectionBuilder();

  const accessory = props.accessory;
  if (accessory instanceof ButtonBuilder) {
    section.setButtonAccessory(accessory);
  } else if (accessory instanceof ThumbnailBuilder) {
    section.setThumbnailAccessory(accessory);
  } else {
    throw new Error("Section accessory must be a Button or Thumbnail component");
  }

  if (props.children) {
    const components = flattenChildren(props.children);
    const textDisplays = components.filter((c) => c instanceof TextDisplayBuilder);
    section.addTextDisplayComponents(textDisplays);
  }

  return section;
});

export const Separator = markAsHost(function Separator(
  props: SeparatorProps,
): SeparatorBuilder {
  const sep = new SeparatorBuilder();

  if (props.divider) sep.setDivider(props.divider);
  if (props.spacing) sep.setSpacing(props.spacing);

  return sep;
});

export const Container = markAsHost(function Container(
  props: ContainerProps,
): ContainerBuilder {
  const container = new ContainerBuilder();

  if (props.accentColor) container.setAccentColor(props.accentColor);
  if (props.spoiler) container.setSpoiler(props.spoiler);

  if (!props.children) return container;

  const components = flattenChildren(props.children);

  for (const component of components) {
    if (component instanceof ActionRowBuilder) {
      container.addActionRowComponents(component);
    } else if (component instanceof FileBuilder) {
      container.addFileComponents(component);
    } else if (component instanceof MediaGalleryBuilder) {
      container.addMediaGalleryComponents(component);
    } else if (component instanceof SectionBuilder) {
      container.addSectionComponents(component);
    } else if (component instanceof SeparatorBuilder) {
      container.addSeparatorComponents(component);
    } else if (component instanceof TextDisplayBuilder) {
      container.addTextDisplayComponents(component);
    }
  }

  return container;
});
