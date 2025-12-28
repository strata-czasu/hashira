import type {
  APIMediaGalleryItem,
  APISelectMenuOption,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ComponentBuilder,
  ComponentEmojiResolvable,
  JSONEncodable,
  SeparatorSpacingSize,
  Snowflake,
  ThumbnailBuilder,
} from "discord.js";

export type JSXRecord = { children?: JSXNode };

export type ComponentFunction<
  P extends JSXRecord = JSXRecord,
  R extends JSXNode = JSXNode,
> = (props: P) => R;

export const vnodeMarker = Symbol.for("vnode");

export interface VNode<P extends JSXRecord, R extends JSXNode> {
  readonly [vnodeMarker]: true;
  readonly type: ComponentFunction<P, R>;
  readonly props: P;
  readonly key?: string | number;
}

export function isVNode(value: unknown): value is VNode<JSXRecord, JSXNode> {
  return (
    typeof value === "object" && value !== null && Object.hasOwn(value, vnodeMarker)
  );
}

export const hostMarker = Symbol.for("host-component");

export interface HostComponent<P extends JSXRecord, R extends JSXNode>
  extends ComponentFunction<P, R> {
  readonly [hostMarker]: true;
}

export function isHostComponent(fn: unknown): fn is HostComponent<JSXRecord, JSXNode> {
  return typeof fn === "function" && Object.hasOwn(fn, hostMarker);
}

export type JSXNode =
  | VNode<JSXRecord, JSXNode>
  | ComponentBuilder
  | JSONEncodable<APISelectMenuOption>
  | JSONEncodable<APIMediaGalleryItem>
  | string
  | number
  | boolean
  | null
  | undefined
  | JSXNode[];

export interface BaseProps {
  children?: JSXNode;
}

interface BaseButtonProps extends BaseProps {
  /** Text that appears on the button; max 80 characters */
  label?: string;
  /** Emoji to display on the button */
  emoji?: ComponentEmojiResolvable;
  /** Whether the button is disabled */
  disabled?: boolean;
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

export interface ActionRowProps extends BaseProps {}

// ============================================================================
// Select Menu Types
// ============================================================================

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
export interface StringSelectProps extends BaseSelectMenuProps, BaseProps {}

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

// ============================================================================
// V2 Layout Component Types
// ============================================================================

/**
 * Props for Section component
 */
export interface SectionProps extends BaseProps {
  /** Required accessory component (Button or Thumbnail) */
  accessory: ButtonBuilder | ThumbnailBuilder | JSXNode;
}

/**
 * Props for TextDisplay component
 */
export interface TextDisplayProps extends BaseProps {
  /** Text content to display (supports markdown) */
  content?: string;
}

/**
 * Props for Thumbnail component
 */
export interface ThumbnailProps {
  /** URL of the thumbnail image */
  url: string;
  /** Alt text description */
  description?: string;
  /** Whether to display as spoiler */
  spoiler?: boolean;
  children?: undefined;
}

/**
 * Item in a MediaGallery
 */
export interface MediaGalleryItemProps {
  /** URL of the media */
  url: string;
  /** Alt text description */
  description?: string;
  /** Whether to display as spoiler */
  spoiler?: boolean;
  children?: undefined;
}

/**
 * Props for MediaGallery component
 */
export interface MediaGalleryProps extends BaseProps {}

/**
 * Props for File component
 */
export interface FileProps {
  /** File URL (attachment://filename format) */
  url: string;
  /** Whether to display as spoiler */
  spoiler?: boolean;
  children?: undefined;
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
export interface ContainerProps extends BaseProps {
  /** Accent color as integer (e.g., 0xFF0000 for red) */
  accentColor?: number;
  /** Whether the container content is spoilered */
  spoiler?: boolean;
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

declare global {
  namespace JSX {
    type Element = JSXNode;
    interface IntrinsicElements {}
    interface ElementAttributesProperty {
      props: object;
    }
    interface ElementChildrenAttribute {
      children: object;
    }
  }
}
