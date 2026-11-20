import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PublicBanner } from '../types/catalog';

const AUTO_SLIDE_INTERVAL_MS = 5000;

interface HeroBannerSliderProps {
  banners: PublicBanner[];
  loading: boolean;
  onSelectFilter: (opts: { category?: string; brand?: string; q?: string }) => void;
  onNavigateProduct: (slug: string) => void;
  onNavigatePath: (path: string) => void;
}

function getBannerHref(banner: PublicBanner): string | null {
  const val = banner.target_value.trim();
  if (!val || banner.target_type === 'none') return null;

  switch (banner.target_type) {
    case 'category':
      return `/?category=${encodeURIComponent(val)}`;
    case 'brand':
      return `/?brand=${encodeURIComponent(val)}`;
    case 'search':
      return `/?q=${encodeURIComponent(val)}`;
    case 'product':
      return `/product/${encodeURIComponent(val)}`;
    case 'url':
      return val;
    default:
      return null;
  }
}

export function HeroBannerSlider({
  banners,
  loading,
  onSelectFilter,
  onNavigateProduct,
  onNavigatePath,
}: HeroBannerSliderProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const count = banners.length;

  useEffect(() => {
    if (activeIndex >= count && count > 0) {
      setActiveIndex(0);
    }
  }, [activeIndex, count]);

  const goNext = useCallback(() => {
    if (count <= 1) return;
    setActiveIndex((prev) => (prev + 1) % count);
  }, [count]);

  const goPrev = useCallback(() => {
    if (count <= 1) return;
    setActiveIndex((prev) => (prev - 1 + count) % count);
  }, [count]);

  // Standard 5-second auto-advance, pausing on hover/focus/hidden tab or reduced motion
  useEffect(() => {
    if (count <= 1 || isPaused) return;
    if (typeof window !== 'undefined') {
      const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (reducedMotion) return;
    }

    const timer = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      setActiveIndex((prev) => (prev + 1) % count);
    }, AUTO_SLIDE_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [count, isPaused]);

  const handleBannerClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    banner: PublicBanner,
    href: string
  ) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    const val = banner.target_value.trim();
    if (!val || banner.target_type === 'none') {
      e.preventDefault();
      return;
    }

    if (banner.target_type === 'category') {
      e.preventDefault();
      onSelectFilter({ category: val });
      return;
    }

    if (banner.target_type === 'brand') {
      e.preventDefault();
      onSelectFilter({ brand: val });
      return;
    }

    if (banner.target_type === 'search') {
      e.preventDefault();
      onSelectFilter({ q: val });
      return;
    }

    if (banner.target_type === 'product') {
      e.preventDefault();
      onNavigateProduct(val);
      return;
    }

    if (banner.target_type === 'url' && href.startsWith('/')) {
      e.preventDefault();
      onNavigatePath(href);
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null || count <= 1) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const delta = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 40) return;
    if (delta > 0) {
      goNext();
    } else {
      goPrev();
    }
  };

  if (loading && count === 0) {
    return (
      <section aria-label="در حال بارگذاری بنرها">
        <div className="w-full h-[175px] sm:h-[250px] md:h-[310px] lg:h-[350px] rounded-xl sm:rounded-2xl bg-zinc-200/70 border border-zinc-200 animate-pulse" />
      </section>
    );
  }

  if (count === 0) {
    return null;
  }

  return (
    <section
      aria-label="بنرهای ویژه فروشگاه"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      <div
        data-testid="hero-banner-slider"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative w-full h-[175px] sm:h-[250px] md:h-[310px] lg:h-[350px] rounded-xl sm:rounded-2xl overflow-hidden border border-zinc-200 bg-white group"
      >
        {banners.map((banner, idx) => {
          const isCurrent = idx === activeIndex;
          const href = getBannerHref(banner);
          const altText = banner.title || 'بنر ویژه فروشگاه اگزو تک';

          const slideContent = (
            <img
              src={banner.image_url}
              alt={altText}
              referrerPolicy="no-referrer"
              loading={idx === 0 ? 'eager' : 'lazy'}
              className="w-full h-full object-cover select-none"
              draggable={false}
            />
          );

          return (
            <div
              key={banner.id}
              aria-hidden={!isCurrent}
              className={`absolute inset-0 transition-opacity duration-500 ease-out ${
                isCurrent ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              {href ? (
                <a
                  href={href}
                  tabIndex={isCurrent ? 0 : -1}
                  onClick={(e) => handleBannerClick(e, banner, href)}
                  aria-label={altText}
                  className="block w-full h-full focus-visible:outline-2 focus-visible:outline-emerald-600"
                >
                  {slideContent}
                </a>
              ) : (
                <div className="w-full h-full">{slideContent}</div>
              )}
            </div>
          );
        })}

        {/* Subtle Edge Navigation Arrows (Shown on hover/focus when multiple slides exist) */}
        {count > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label="بنر قبلی"
              className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 z-20 h-9 w-9 items-center justify-center rounded-full bg-white/85 backdrop-blur-sm border border-zinc-200/80 text-zinc-800 shadow-sm opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-white hover:text-emerald-700 transition-all duration-150 cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="بنر بعدی"
              className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 z-20 h-9 w-9 items-center justify-center rounded-full bg-white/85 backdrop-blur-sm border border-zinc-200/80 text-zinc-800 shadow-sm opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-white hover:text-emerald-700 transition-all duration-150 cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" aria-hidden="true" />
            </button>
          </>
        )}

        {/* Bottom-Center Horizontal Dash Indicators matching reference screenshot */}
        {count > 1 && (
          <div
            role="tablist"
            aria-label="انتخاب بنر"
            className="absolute bottom-3 inset-x-0 z-20 flex items-center justify-center gap-1.5 px-4"
          >
            {banners.map((banner, idx) => {
              const isCurrent = idx === activeIndex;
              return (
                <button
                  key={banner.id}
                  type="button"
                  role="tab"
                  aria-selected={isCurrent}
                  aria-label={`نمایش بنر ${idx + 1}${banner.title ? `: ${banner.title}` : ''}`}
                  onClick={() => setActiveIndex(idx)}
                  className={`h-1 rounded-full transition-all duration-200 cursor-pointer ${
                    isCurrent
                      ? 'w-7 bg-zinc-700 ring-1 ring-white/85'
                      : 'w-5 bg-zinc-400/55 ring-1 ring-white/60 hover:bg-zinc-600/80'
                  }`}
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
