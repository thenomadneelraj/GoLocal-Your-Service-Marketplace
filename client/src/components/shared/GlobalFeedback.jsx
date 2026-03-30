import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Toaster, toast } from "sonner";
import { useTheme } from "@/components/contexts/ThemeContext";
import { consumeFlashToast } from "@/lib/flashToast";

export default function GlobalFeedback() {
  const { theme } = useTheme();
  const location = useLocation();

  useEffect(() => {
    const payload = consumeFlashToast();
    if (!payload?.message) {
      return;
    }

    const type = String(payload.type || "success").toLowerCase();
    if (type === "error") {
      toast.error(payload.message);
      return;
    }

    if (type === "info") {
      toast.info(payload.message);
      return;
    }

    if (type === "warning") {
      toast.warning(payload.message);
      return;
    }

    toast.success(payload.message);
  }, [location.key]);

  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      theme={theme === "dark" ? "dark" : "light"}
    />
  );
}
