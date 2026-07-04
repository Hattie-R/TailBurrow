import { useRef, useEffect } from "react";

export const ResizeHandle = ({ onDrag }: { onDrag: (clientX: number) => void }) => {
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => { cleanupRef.current?.(); };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const onMouseMove = (ev: MouseEvent) => onDrag(ev.clientX);
    const cleanup = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      cleanupRef.current = null;
    };
    const onMouseUp = () => cleanup();
    cleanupRef.current = cleanup;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      className="w-1.5 flex-shrink-0 cursor-col-resize bg-[#1d1b2d] hover:bg-[#967abc] active:bg-[#967abc]/80 transition-colors"
    />
  );
};
