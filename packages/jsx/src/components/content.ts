import {
  FileBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
} from "discord.js";
import { getTextContent, markAsHost } from "../internal/utils";
import type {
  FileProps,
  MediaGalleryItemProps,
  MediaGalleryProps,
  TextDisplayProps,
  ThumbnailProps,
} from "../types";

export const TextDisplay = markAsHost(function TextDisplay(
  props: TextDisplayProps,
): TextDisplayBuilder {
  const text = new TextDisplayBuilder();

  if (Array.isArray(props.children) && props.children.length > 0 && props.content) {
    throw new Error("TextDisplay cannot have both `content` prop and children.");
  }

  const childContent = props.children ? getTextContent(props.children) : null;
  const content = props.content ?? childContent;

  if (content) text.setContent(content);

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
