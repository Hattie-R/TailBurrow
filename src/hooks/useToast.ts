import { useState, useCallback } from "react";
import type { Toast } from "../types";
import { TOAST_DURATION_MS } from "../constants";

let toastIdCounter = 0;

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: 'info' | 'error' | 'success' = 'info') => {
    const id = ++toastIdCounter;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, TOAST_DURATION_MS);
  }, []);

  return { toasts, toast, dismissToast };
}
