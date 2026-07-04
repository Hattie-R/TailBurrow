import React, { useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";
import { TOOLTIP_GRACE_MS } from "../constants";

export const HelpTooltip = ({ text }: { text: React.ReactNode }) => {
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = useCallback(() => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    if (!coords && iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      setCoords({ x: rect.left + rect.width / 2, y: rect.top - 8 });
    }
  }, [coords]);

  const handleLeave = useCallback(() => {
    timeoutRef.current = setTimeout(() => setCoords(null), TOOLTIP_GRACE_MS);
  }, []);

  return (
    <>
      <div ref={iconRef} onMouseEnter={handleEnter} onMouseLeave={handleLeave} className="inline-block ml-2 cursor-help">
        <Info className="w-4 h-4 text-gray-400 hover:text-purple-400 transition-colors" />
      </div>
      {coords && createPortal(
        <div
          className="fixed z-[9999] w-64 p-3 bg-gray-900 border border-gray-600 rounded-lg shadow-xl text-xs text-gray-200 animate-in fade-in zoom-in-95 duration-150"
          style={{ left: coords.x, top: coords.y, transform: "translate(-50%, -100%)", pointerEvents: "auto" }}
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
        >
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-600" />
        </div>,
        document.body
      )}
    </>
  );
};
