import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { Toast } from "../types";

export function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return createPortal(
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-xl border backdrop-blur-sm animate-in slide-in-from-right fade-in duration-200 cursor-pointer ${
            toast.type === 'error'
              ? 'bg-red-900/90 border-red-700 text-red-100'
              : toast.type === 'success'
              ? 'bg-green-900/90 border-green-700 text-green-100'
              : 'bg-gray-800/90 border-gray-600 text-gray-100'
          }`}
          onClick={() => onDismiss(toast.id)}
        >
          <span className="text-sm flex-1 break-words">{toast.message}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onDismiss(toast.id); }}
            className="text-current opacity-60 hover:opacity-100 flex-shrink-0 mt-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>,
    document.body
  );
}
