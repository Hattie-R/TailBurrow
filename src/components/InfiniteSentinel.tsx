import { useRef, useEffect } from "react";
import { INFINITE_SCROLL_MARGIN } from "../constants";

export function InfiniteSentinel({ onVisible, disabled }: { onVisible: () => void; disabled?: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const callbackRef = useRef(onVisible);
  callbackRef.current = onVisible;

  useEffect(() => {
    if (disabled) return;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) callbackRef.current(); },
      { root: null, rootMargin: INFINITE_SCROLL_MARGIN, threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [disabled]);

  return <div ref={ref} className="h-10 w-full" />;
}
