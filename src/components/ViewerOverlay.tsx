import React from "react";
import {
  ChevronLeft, ChevronRight, Play, Pause, Volume2, VolumeX, Clock, Maximize
} from "lucide-react";

interface ViewerOverlayProps {
  currentItem: { url: string; ext?: string } | null;
  viewerOverlay: boolean;
  fadeIn: boolean;
  setImageLoading: (v: boolean) => void;
  isVideo: boolean;
  isSlideshow: boolean;
  setIsSlideshow: (v: boolean) => void;
  slideshowSpeed: number;
  setSlideshowSpeed: (v: number) => void;
  autoMuteVideos: boolean;
  setAutoMuteVideos: (v: boolean) => void;
  waitForVideoEnd: boolean;
  setWaitForVideoEnd: (v: boolean) => void;
  globalMute: boolean;
  showHud: boolean;
  pokeHud: () => void;
  scheduleHudHide: () => void;
  hudHoverRef: React.MutableRefObject<boolean>;
  goToPrev: (manual: boolean) => void;
  goToNext: (manual: boolean) => void;
  setViewerOverlay: (v: boolean) => void;
  currentIndex: number;
  itemCount: number;
  fullscreenVideoRef: React.RefObject<HTMLVideoElement | null>;
  savedVideoTimeRef: React.MutableRefObject<number>;
}

export function ViewerOverlay(props: ViewerOverlayProps) {
  const {
    currentItem, viewerOverlay, fadeIn, setImageLoading,
    isVideo, isSlideshow, setIsSlideshow,
    slideshowSpeed, setSlideshowSpeed,
    autoMuteVideos, setAutoMuteVideos,
    waitForVideoEnd, setWaitForVideoEnd,
    globalMute, showHud, pokeHud, scheduleHudHide,
    hudHoverRef, goToPrev, goToNext, setViewerOverlay,
    currentIndex, itemCount,
    fullscreenVideoRef, savedVideoTimeRef,
  } = props;

  if (!viewerOverlay || !currentItem) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black"
      onMouseMove={pokeHud}
      onMouseDown={pokeHud}
      onWheel={pokeHud}
      onTouchStart={pokeHud}
    >
      <div className="relative w-full h-full">
        <div className="absolute inset-y-0 left-0 w-1/5 z-10 cursor-pointer" onClick={() => goToPrev(true)} />
        <div className="absolute inset-y-0 right-0 w-1/5 z-10 cursor-pointer" onClick={() => goToNext(true)} />

        <div className="w-full h-full flex items-center justify-center relative">
          {!isVideo && currentItem && (
            <div
              className="absolute inset-0 scale-110 blur-3xl opacity-15"
              style={{ backgroundImage: `url(${currentItem.url})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
            />
          )}
          {isVideo ? (
            <video
              ref={fullscreenVideoRef}
              key={currentItem.url}
              src={currentItem.url}
              controls
              autoPlay
              loop={!waitForVideoEnd || !isSlideshow}
              muted={globalMute || autoMuteVideos}
              className={`w-full h-full object-contain transition-opacity duration-300 ${fadeIn ? "opacity-100" : "opacity-0"}`}
              style={{ pointerEvents: 'none' }}
              onCanPlay={(e) => {
                if (!globalMute && !autoMuteVideos) (e.target as HTMLVideoElement).volume = 1.0;
                if (savedVideoTimeRef.current > 0) {
                  (e.target as HTMLVideoElement).currentTime = savedVideoTimeRef.current;
                  savedVideoTimeRef.current = 0;
                }
              }}
              onLoadedData={() => setImageLoading(false)}
              onError={() => setImageLoading(false)}
              onEnded={() => { if (waitForVideoEnd && isSlideshow) goToNext(false); }}
            />
          ) : (
            <img
              key={currentItem.url}
              src={currentItem.url}
              alt=""
              className={`w-full h-full object-contain transition-opacity duration-200 ${fadeIn ? "opacity-100" : "opacity-0"}`}
              onLoad={() => setImageLoading(false)}
              onError={(e) => {
                setImageLoading(false);
                (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23374151' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' fill='%239CA3AF' font-size='20'%3EImage not found%3C/text%3E%3C/svg%3E";
              }}
            />
          )}
        </div>

        <div
          className={`absolute bottom-6 left-1/2 -translate-x-1/2 transition-all duration-300 ease-out ${showHud ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}
          onMouseEnter={() => { hudHoverRef.current = true; }}
          onMouseLeave={() => { hudHoverRef.current = false; scheduleHudHide(); }}
        >
          <div className="relative z-20 px-6 py-4 bg-gray-900/80 backdrop-blur-md rounded-2xl border border-gray-700/50 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-center gap-1.5">
              <button onClick={() => goToPrev(true)} className="p-1.5 bg-[#1d1b2d] hover:bg-[#4c4b5a] rounded"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => setIsSlideshow(!isSlideshow)} className="p-1.5 bg-[#967abc] hover:bg-[#967abc]/80 rounded">{isSlideshow ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}</button>
              <input
                type="range"
                min={1}
                max={15}
                step={1}
                value={slideshowSpeed / 1000}
                onChange={(e) => setSlideshowSpeed(Number(e.target.value) * 1000)}
                className="w-24 h-1.5 cursor-pointer accent-[#967abc]"
              />
              <span className="text-xs text-[#9e98aa] font-mono w-6">{slideshowSpeed / 1000}s</span>
              <button onClick={() => setAutoMuteVideos(!autoMuteVideos)} className={`p-1.5 rounded ${autoMuteVideos ? 'bg-[#967abc] hover:bg-[#967abc]/80' : 'bg-[#1d1b2d] hover:bg-[#4c4b5a]'}`}>{autoMuteVideos ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}</button>
              <button onClick={() => setWaitForVideoEnd(!waitForVideoEnd)} className={`p-1.5 rounded ${waitForVideoEnd ? 'bg-[#967abc] hover:bg-[#967abc]/80' : 'bg-[#1d1b2d] hover:bg-[#4c4b5a]'}`}><Clock className="w-4 h-4" /></button>
              <button onClick={async () => { await document.exitFullscreen(); setViewerOverlay(false); }} className="p-1.5 bg-[#1d1b2d] hover:bg-[#4c4b5a] rounded"><Maximize className="w-4 h-4" /></button>
              <button onClick={() => goToNext(true)} className="p-1.5 bg-[#1d1b2d] hover:bg-[#4c4b5a] rounded"><ChevronRight className="w-4 h-4" /></button>
              <span className="text-xs text-[#4c4b5a] ml-1">{currentIndex + 1}/{itemCount}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}