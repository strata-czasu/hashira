export function getAuthHeaders(userId: string, guildId: string) {
  return { "User-ID": userId, "Guild-ID": guildId };
}
