import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ComponentBuilder,
  ContainerBuilder,
  FileBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MentionableSelectMenuBuilder,
  type MessageActionRowComponentBuilder,
  RoleSelectMenuBuilder,
  SectionBuilder,
  SeparatorBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
  UserSelectMenuBuilder,
} from "discord.js";
import {
  type ActionRowProps,
  type ButtonProps,
  type ChannelSelectProps,
  type ContainerProps,
  type FileProps,
  type HostComponent,
  hostMarker,
  type JSXNode,
  type JSXRecord,
  type MediaGalleryItemProps,
  type MediaGalleryProps,
  type MentionableSelectProps,
  type OptionProps,
  type RoleSelectProps,
  type SectionProps,
  type SeparatorProps,
  type StringSelectProps,
  type TextDisplayProps,
  type ThumbnailProps,
  type UserSelectProps,
} from "./types";

function markAsHost<P extends JSXRecord, R extends JSXNode>(fn: (props: P) => R) {
  return Object.assign(fn, { [hostMarker]: true }) as HostComponent<P, R>;
}

function flattenChildren(children: JSXNode): ComponentBuilder[] {
  if (Array.isArray(children)) {
    return children.flatMap(flattenChildren);
  }

  if (children instanceof ComponentBuilder) {
    return [children];
  }
  return [];
}

function getTextContent(children: JSXNode): string | null {
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }

  if (Array.isArray(children)) {
    const parts = children.map(getTextContent).filter((s): s is string => s !== null);

    return parts.length > 0 ? parts.join("") : null;
  }

  return null;
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

export const StringSelectMenu = markAsHost(function StringSelectMenu(
  props: StringSelectProps,
): StringSelectMenuBuilder {
  const select = new StringSelectMenuBuilder();
  select.setCustomId(props.customId);

  if (props.placeholder) select.setPlaceholder(props.placeholder);
  if (props.minValues !== undefined) select.setMinValues(props.minValues);
  if (props.maxValues !== undefined) select.setMaxValues(props.maxValues);
  if (props.disabled) select.setDisabled(props.disabled);

  if (props.children) {
    if (!Array.isArray(props.children)) {
      throw new Error(
        "StringSelect children must be an array of StringSelectOption components",
      );
    }

    const options = props.children.filter(
      (value) => value instanceof StringSelectMenuOptionBuilder,
    );
    select.addOptions(options);
  }

  return select;
});

export const StringSelectOption = markAsHost(function StringSelectOption(
  props: OptionProps,
): StringSelectMenuOptionBuilder {
  const option = new StringSelectMenuOptionBuilder()
    .setLabel(props.label)
    .setValue(props.value);

  if (props.description) option.setDescription(props.description);
  if (props.emoji) option.setEmoji(props.emoji);
  if (props.default) option.setDefault(props.default);

  return option;
});

/**
 * @deprecated Use StringSelect instead
 */
export const SelectMenu = StringSelectMenu;

/**
 * UserSelect component - auto-populated select menu for users
 */
export const UserSelect = markAsHost(function UserSelect(
  props: UserSelectProps,
): UserSelectMenuBuilder {
  const select = new UserSelectMenuBuilder().setCustomId(props.customId);

  if (props.placeholder) select.setPlaceholder(props.placeholder);
  if (props.minValues !== undefined) select.setMinValues(props.minValues);
  if (props.maxValues !== undefined) select.setMaxValues(props.maxValues);
  if (props.disabled) select.setDisabled(props.disabled);
  if (props.defaultUsers && props.defaultUsers.length > 0) {
    select.setDefaultUsers(props.defaultUsers);
  }

  return select;
});

/**
 * RoleSelect component - auto-populated select menu for roles
 */
export const RoleSelect = markAsHost(function RoleSelect(
  props: RoleSelectProps,
): RoleSelectMenuBuilder {
  const select = new RoleSelectMenuBuilder().setCustomId(props.customId);

  if (props.placeholder) select.setPlaceholder(props.placeholder);
  if (props.minValues) select.setMinValues(props.minValues);
  if (props.maxValues) select.setMaxValues(props.maxValues);
  if (props.disabled) select.setDisabled(props.disabled);

  if (props.defaultRoles && props.defaultRoles.length > 0) {
    select.setDefaultRoles(props.defaultRoles);
  }

  return select;
});

export const MentionableSelect = markAsHost(function MentionableSelect(
  props: MentionableSelectProps,
): MentionableSelectMenuBuilder {
  const select = new MentionableSelectMenuBuilder().setCustomId(props.customId);

  if (props.placeholder) select.setPlaceholder(props.placeholder);
  if (props.minValues) select.setMinValues(props.minValues);
  if (props.maxValues) select.setMaxValues(props.maxValues);
  if (props.disabled) select.setDisabled(props.disabled);

  if (props.defaultUsers && props.defaultUsers.length > 0) {
    select.addDefaultUsers(props.defaultUsers);
  }

  if (props.defaultRoles && props.defaultRoles.length > 0) {
    select.addDefaultRoles(props.defaultRoles);
  }

  return select;
});

export const ChannelSelect = markAsHost(function ChannelSelect(
  props: ChannelSelectProps,
): ChannelSelectMenuBuilder {
  const select = new ChannelSelectMenuBuilder().setCustomId(props.customId);

  if (props.placeholder) select.setPlaceholder(props.placeholder);
  if (props.minValues) select.setMinValues(props.minValues);
  if (props.maxValues) select.setMaxValues(props.maxValues);
  if (props.disabled) select.setDisabled(props.disabled);

  if (props.channelTypes && props.channelTypes.length > 0) {
    select.setChannelTypes(props.channelTypes);
  }

  if (props.defaultChannels && props.defaultChannels.length > 0) {
    select.setDefaultChannels(props.defaultChannels);
  }

  return select;
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

/**
 * TextDisplay component - displays markdown text
 */
export const TextDisplay = markAsHost(function TextDisplay(
  props: TextDisplayProps,
): TextDisplayBuilder {
  const text = new TextDisplayBuilder();

  const childContent = props.children ? getTextContent(props.children) : null;
  const content = props.content ?? childContent;

  if (content) text.setContent(content);

  return text;
});

/**
 * Thumbnail component - small image accessory
 */
export const Thumbnail = markAsHost(function Thumbnail(
  props: ThumbnailProps,
): ThumbnailBuilder {
  const thumb = new ThumbnailBuilder();
  thumb.setURL(props.url);

  if (props.description) thumb.setDescription(props.description);
  if (props.spoiler) thumb.setSpoiler(props.spoiler);

  return thumb;
});

/**
 * MediaGallery component - displays multiple media items
 */
export const MediaGallery = markAsHost(function MediaGallery(
  props: MediaGalleryProps,
): MediaGalleryBuilder {
  const gallery = new MediaGalleryBuilder();

  if (props.children) {
    if (!Array.isArray(props.children)) {
      throw new Error(
        "MediaGallery children must be an array of MediaGalleryItem components",
      );
    }

    const items = props.children.filter(
      (value) => value instanceof MediaGalleryItemBuilder,
    );
    gallery.addItems(items);
  }

  return gallery;
});

export const MediaGalleryItem = markAsHost(function MediaGalleryItem(
  props: MediaGalleryItemProps,
): MediaGalleryItemBuilder {
  const item = new MediaGalleryItemBuilder().setURL(props.url);

  if (props.description) item.setDescription(props.description);
  if (props.spoiler) item.setSpoiler(props.spoiler);

  return item;
});

/**
 * File component - displays an attached file
 */
export const File = markAsHost(function File(props: FileProps): FileBuilder {
  const file = new FileBuilder();
  file.setURL(props.url);

  if (props.spoiler) file.setSpoiler(props.spoiler);

  return file;
});

/**
 * Separator component - adds vertical padding and optional divider
 */
export const Separator = markAsHost(function Separator(
  props: SeparatorProps,
): SeparatorBuilder {
  const sep = new SeparatorBuilder();

  if (props.divider) sep.setDivider(props.divider);
  if (props.spacing) sep.setSpacing(props.spacing);

  return sep;
});

/**
 * Container component - visually groups components
 */
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
