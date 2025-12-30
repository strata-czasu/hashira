import {
  bold,
  codeBlock,
  HeadingLevel,
  heading,
  inlineCode,
  italic,
  spoiler,
  strikethrough,
  subtext,
  type TimestampStylesString,
  time,
  underline,
} from "discord.js";
import { getTextContent, markAsHost } from "../internal/utils";
import type { JSXNode } from "../types";

export const H1 = markAsHost(function H1(props: { children?: JSXNode }): string {
  const content = getTextContent(props.children);
  return content ? heading(content, HeadingLevel.One) : "";
});

export const H2 = markAsHost(function H2(props: { children?: JSXNode }): string {
  const content = getTextContent(props.children);
  return content ? heading(content, HeadingLevel.Two) : "";
});

export const H3 = markAsHost(function H3(props: { children?: JSXNode }): string {
  const content = getTextContent(props.children);
  return content ? heading(content, HeadingLevel.Three) : "";
});

export const Bold = markAsHost(function Bold(props: { children?: JSXNode }): string {
  const content = getTextContent(props.children);
  return content ? bold(content) : "";
});

export const Italic = markAsHost(function Italic(props: {
  children?: JSXNode;
}): string {
  const content = getTextContent(props.children);
  return content ? italic(content) : "";
});

export const Strikethrough = markAsHost(function Strikethrough(props: {
  children?: JSXNode;
}): string {
  const content = getTextContent(props.children);
  return content ? strikethrough(content) : "";
});

export const Underline = markAsHost(function Underline(props: {
  children?: JSXNode;
}): string {
  const content = getTextContent(props.children);
  return content ? underline(content) : "";
});

export const InlineCode = markAsHost(function InlineCode(props: {
  children?: JSXNode;
}): string {
  const content = getTextContent(props.children);
  return content ? inlineCode(content) : "";
});

export const CodeBlock = markAsHost(function CodeBlock(props: {
  children?: JSXNode;
  language?: string;
}): string {
  const content = getTextContent(props.children, "\n");

  if (!content) return "";
  if (props.language) return `${codeBlock(props.language, content)}\n`;

  return `${codeBlock(content)}\n`;
});

export const Spoiler = markAsHost(function Spoiler(props: {
  children?: JSXNode;
}): string {
  const content = getTextContent(props.children);
  return content ? spoiler(content) : "";
});

export const Subtext = markAsHost(function Subtext(props: {
  children?: JSXNode;
}): string {
  const content = getTextContent(props.children);
  return content ? subtext(content) : "";
});

export const TimeStamp = markAsHost(function TimeStamp(props: {
  timestamp: Date;
  format: TimestampStylesString;
  children?: undefined;
}): string {
  return time(props.timestamp, props.format);
});

export const Br = markAsHost(function Br(): string {
  return "\n";
});
