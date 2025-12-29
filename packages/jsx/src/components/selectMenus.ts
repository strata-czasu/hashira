import {
  ChannelSelectMenuBuilder,
  type ChannelType,
  type ComponentEmojiResolvable,
  MentionableSelectMenuBuilder,
  RoleSelectMenuBuilder,
  type Snowflake,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  UserSelectMenuBuilder,
} from "discord.js";
import { markAsHost } from "../internal/utils";
import type { JSXNode } from "../types";

/**
 * Base props shared by all select menu types
 */
interface BaseSelectMenuProps {
  /** Developer-defined identifier; max 100 characters */
  customId: string;
  /** Placeholder text if nothing is selected; max 150 characters */
  placeholder?: string;
  /** Minimum number of items that must be chosen (0-25, default 1) */
  minValues?: number;
  /** Maximum number of items that can be chosen (1-25, default 1) */
  maxValues?: number;
  /** Whether the select menu is disabled */
  disabled?: boolean;
}

/**
 * Props for StringSelect (string select menu with predefined options)
 */
export interface StringSelectProps extends BaseSelectMenuProps {
  children?: JSXNode;
}

/**
 * Props for UserSelect (auto-populated with server users)
 */
export interface UserSelectProps extends BaseSelectMenuProps {
  /** Default selected user IDs */
  defaultUsers?: Snowflake[];
  children?: undefined;
}

/**
 * Props for RoleSelect (auto-populated with server roles)
 */
export interface RoleSelectProps extends BaseSelectMenuProps {
  /** Default selected role IDs */
  defaultRoles?: Snowflake[];
  children?: undefined;
}

/**
 * Props for MentionableSelect (auto-populated with users and roles)
 */
export interface MentionableSelectProps extends BaseSelectMenuProps {
  /** Default selected user IDs */
  defaultUsers?: Snowflake[];
  /** Default selected role IDs */
  defaultRoles?: Snowflake[];
  children?: undefined;
}

/**
 * Props for ChannelSelect (auto-populated with server channels)
 */
export interface ChannelSelectProps extends BaseSelectMenuProps {
  /** Filter by channel types */
  channelTypes?: ChannelType[];
  /** Default selected channel IDs */
  defaultChannels?: Snowflake[];
  children?: undefined;
}

/**
 * Props for StringSelectOption component
 */
export interface OptionProps {
  /** User-facing name of the option; max 100 characters */
  label: string;
  /** Developer-defined value of the option; max 100 characters */
  value: string;
  /** Additional description of the option; max 100 characters */
  description?: string;
  /** Emoji to display */
  emoji?: ComponentEmojiResolvable;
  /** Whether this option is selected by default */
  default?: boolean;
  children?: undefined;
}

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
 * @deprecated Use StringSelectMenu instead
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
