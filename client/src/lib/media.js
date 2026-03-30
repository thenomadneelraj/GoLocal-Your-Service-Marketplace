export const resolveMediaUrl = (value) => {
  if (!value) {
    return "";
  }

  const trimmed = String(value).trim();
  if (!trimmed) {
    return "";
  }

  if (/^(data:|blob:|https?:\/\/)/i.test(trimmed)) {
    return trimmed;
  }

  const baseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
  if (!baseUrl) {
    return trimmed;
  }

  return trimmed.startsWith("/") ? `${baseUrl}${trimmed}` : `${baseUrl}/${trimmed}`;
};
