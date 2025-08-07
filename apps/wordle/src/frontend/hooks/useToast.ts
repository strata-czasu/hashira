import { useCallback, useEffect, useState } from "react";
import type { ToastData, ToastType } from "../components/Toast";

export function useToast() {
  const [toast, setToast] = useState<ToastData | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [toast]);

  const showToast = useCallback((message: string, type: ToastType) => {
    setToast({ message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  return {
    toast,
    showToast,
    hideToast,
  };
}
