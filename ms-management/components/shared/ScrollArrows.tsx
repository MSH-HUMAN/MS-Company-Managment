"use client";

import { useRef, useState, useEffect, ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScrollArrowsProps {
  children: ReactNode;
  className?: string;
  scrollAmount?: number;
}

export default function ScrollArrows({
  children,
  className,
  scrollAmount = 320
}: ScrollArrowsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  };

  useEffect(() => {
    checkScroll();
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);

    const observer = new ResizeObserver(checkScroll);
    observer.observe(el);

    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
      observer.disconnect();
    };
  }, []);

  const scroll = (direction: "left" | "right") => {
    const el = containerRef.current;
    if (!el) return;
    const delta = direction === "left" ? -scrollAmount : scrollAmount;
    el.scrollBy({ left: delta, behavior: "smooth" });
  };

  return (
    <div className="relative group w-full flex-1 flex flex-col min-h-0">
      {/* Scroll Left Arrow */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scroll("left")}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-30 bg-slate-900/80 hover:bg-blue-600 text-white p-2 rounded-full shadow-lg backdrop-blur-xs transition-all duration-200 hover:scale-110 flex items-center justify-center border border-white/20"
          aria-label="Scroll left"
          title="Scroll Left (◀)"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}

      {/* Scroll Right Arrow */}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scroll("right")}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-30 bg-slate-900/80 hover:bg-blue-600 text-white p-2 rounded-full shadow-lg backdrop-blur-xs transition-all duration-200 hover:scale-110 flex items-center justify-center border border-white/20"
          aria-label="Scroll right"
          title="Scroll Right (▶)"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* Scrollable Container */}
      <div
        ref={containerRef}
        className={cn("w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 flex-1 min-h-0", className)}
      >
        {children}
      </div>
    </div>
  );
}
