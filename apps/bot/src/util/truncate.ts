export function truncate(text: string, length: number) {
  return text.length > length - 3 ? `${text.substring(0, length - 3)}...` : text;
}
