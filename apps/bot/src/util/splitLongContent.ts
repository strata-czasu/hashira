/**
 * Splits long content into chunks that fit within Discord's message length limits.
 * Each chunk will not exceed the specified maxLength and will try to preserve line integrity.
 *
 * @param content - The full content to potentially split
 * @param maxLength - Maximum length per chunk (default: 4000)
 * @returns Array of content chunks
 */
export const splitLongContent = (content: string, maxLength = 4000): string[] => {
  if (content.length <= maxLength) {
    return [content];
  }

  const lines = content.split("\n");
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentLength = 0;

  for (const line of lines) {
    const lineLength = line.length + 1;

    if (currentLength + lineLength > maxLength) {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.join("\n"));
        currentChunk = [];
        currentLength = 0;
      }

      // Handle single lines that exceed maxLength
      if (lineLength > maxLength) {
        chunks.push(line.slice(0, maxLength));
        continue;
      }
    }

    currentChunk.push(line);
    currentLength += lineLength;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join("\n"));
  }

  return chunks;
};
