// Courtesy of https://github.com/Glitchii/embedbuilder

export const decodeJson = (json: string): unknown => {
  const jsonData = decodeURIComponent(json);

  try {
    return JSON.parse(decodeURIComponent(atob(jsonData)));
  } catch {
    return null;
  }
};

export const encodeJson = (json: unknown): string => {
  const data = JSON.stringify(json);
  const url = new URL("https://glitchii.github.io/embedbuilder/");

  // Remove any padding from the base64 encoding
  const dataParam = btoa(encodeURIComponent(data)).replace(/=*$/, "");

  url.searchParams.set("data", dataParam);

  return url.toString();
};
