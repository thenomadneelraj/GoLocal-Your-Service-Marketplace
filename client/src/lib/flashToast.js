const FLASH_TOAST_KEY = "flash-toast";

export const queueFlashToast = (payload) => {
  if (typeof window === "undefined" || !payload?.message) {
    return;
  }

  sessionStorage.setItem(FLASH_TOAST_KEY, JSON.stringify(payload));
};

export const consumeFlashToast = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = sessionStorage.getItem(FLASH_TOAST_KEY);
  if (!raw) {
    return null;
  }

  sessionStorage.removeItem(FLASH_TOAST_KEY);

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};
