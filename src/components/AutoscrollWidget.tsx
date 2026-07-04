import { Pause, ChevronsDown } from "lucide-react";

export const AutoscrollWidget = ({ active, autoscroll, setAutoscroll, autoscrollSpeed, setAutoscrollSpeed, hidden, rightOffset }: {
  active: boolean; autoscroll: boolean; setAutoscroll: (v: boolean) => void;
  autoscrollSpeed: number; setAutoscrollSpeed: (v: number) => void; hidden: boolean; rightOffset?: number;
}) => {
  if (!active || hidden) return null;

  const rightPx = (rightOffset || 0) + 16;

  if (!autoscroll) {
    return (
      <button
        onClick={() => setAutoscroll(true)}
        className="fixed bottom-12 px-3 py-2 rounded-xl shadow-lg border transition-all z-40 flex items-center gap-2 text-xs font-medium bg-[#161621] hover:bg-[#1d1b2d] text-[#9e98aa] hover:text-white border-[#1d1b2d]"
        style={{ right: rightPx }}
        title="Start Autoscroll"
      >
        <ChevronsDown className="w-4 h-4" />
        Scroll
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-12 backdrop-blur border rounded-xl shadow-xl z-40 animate-in fade-in slide-in-from-bottom-4 bg-[#161621]/95 border-[#1d1b2d]"
      style={{ right: rightPx }}
    >
      <div className="flex items-center gap-2 p-2">
        <button
          onClick={() => setAutoscroll(false)}
          className="p-1.5 rounded-lg transition-colors hover:bg-[#1d1b2d] text-red-400"
          title="Stop"
        >
          <Pause className="w-4 h-4" />
        </button>
        <input
          type="range"
          min="1"
          max="10"
          step="0.5"
          value={autoscrollSpeed}
          onChange={(e) => setAutoscrollSpeed(Number(e.target.value))}
          className="w-24 h-1.5 cursor-pointer accent-[#967abc]"
        />
        <span className="text-[10px] font-mono w-6 text-right text-[#9e98aa]">{autoscrollSpeed}x</span>
      </div>
    </div>
  );
};
