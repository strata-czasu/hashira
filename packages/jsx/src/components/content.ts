import {
  FileBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
} from "discord.js";
import { getTextContent, markAsHost } from "../internal/utils";
import type { JSXNode } from "../types";

export interface TextDisplayProps {
  /** Text content to display (supports markdown) */
  content?: string;
  children?: JSXNode;
}

export interface ThumbnailProps {
  /** URL of the thumbnail image */
  url: string;
  /** Alt text description */
  description?: string;
  /** Whether to display as spoiler */
  spoiler?: boolean;
  children?: undefined;
}

export interface MediaGalleryItemProps {
  /** URL of the media */
  url: string;
  /** Alt text description */
  description?: string;
  /** Whether to display as spoiler */
  spoiler?: boolean;
  children?: undefined;
}

export interface MediaGalleryProps {
  children?: JSXNode;
}

export interface FileProps {
  /** File URL (attachment://filename format) */
  url: string;
  /** Whether to display as spoiler */
  spoiler?: boolean;
  children?: undefined;
}

export const TextDisplay = markAsHost(function TextDisplay(
  props: TextDisplayProps,
): TextDisplayBuilder {
  const text = new TextDisplayBuilder();

  const hasChildren =
    props.children !== undefined &&
    props.children !== null &&
    (!Array.isArray(props.children) || props.children.length > 0);

  if (props.content !== undefined && hasChildren) {
    throw new Error("TextDisplay cannot have both `content` prop and children.");
  }

  const childContent = props.children ? getTextContent(props.children) : null;
  const content = props.content ?? childContent;

  if (content != null) text.setContent(content);

  return text;
});

export const Thumbnail = markAsHost(function Thumbnail(
  props: ThumbnailProps,
): ThumbnailBuilder {
  const thumb = new ThumbnailBuilder();
  thumb.setURL(props.url);

  if (props.description) thumb.setDescription(props.description);
  if (props.spoiler) thumb.setSpoiler(props.spoiler);

  return thumb;
});

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

export const File = markAsHost(function File(props: FileProps): FileBuilder {
  const file = new FileBuilder();
  file.setURL(props.url);

  if (props.spoiler) file.setSpoiler(props.spoiler);

  return file;
});
