export function getAuthHeaders(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` };
}
