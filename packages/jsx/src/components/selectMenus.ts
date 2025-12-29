import {
  ChannelSelectMenuBuilder,
  MentionableSelectMenuBuilder,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  UserSelectMenuBuilder,
} from "discord.js";
import { markAsHost } from "../internal/utils";
import type {
  ChannelSelectProps,
  MentionableSelectProps,
  OptionProps,
  RoleSelectProps,
  StringSelectProps,
  UserSelectProps,
} from "../types";

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
