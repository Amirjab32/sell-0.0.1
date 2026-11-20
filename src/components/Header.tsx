import { ChevronDown, ChevronLeft, Menu, Phone, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { MEGA_MENU_CATEGORIES, STORE_CONTACT, type MegaMenuCategory } from '../lib/categories';
import { formatToman, getStockMeta } from '../lib/format';
import type { CatalogResponse, PublicProduct } from '../types/catalog';
import { ProductImage } from './ProductImage';

interface HeaderProps {
  searchQuery: string;
  selectedCategory: string;
  onSearchChange: (value: string) => void;
  onSubmitSearch: (value: string) => void;
  onSelectFilter: (opts: { category?: string; brand?: string; q?: string }) => void;
  onNavigateHome: () => void;
  onNavigateProduct: (slug: string) => void;
  onOpenConsultation: () => void;
}

export function Header({
  searchQuery,
  selectedCategory,
  onSearchChange,
  onSubmitSearch,
  onSelectFilter,
  onNavigateHome,
  onNavigateProduct,
  onOpenConsultation,
}: HeaderProps) {
  const [megaOpen, setMegaOpen] = useState(false);
  const [hoveredCatId, setHoveredCatId] = useState<string>(MEGA_MENU_CATEGORIES[0]?.id ?? 'laptops');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Instant search dropdown state
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [instantLoading, setInstantLoading] = useState(false);
  const [instantResults, setInstantResults] = useState<PublicProduct[]>([]);

  const navContainerRef = useRef<HTMLDivElement | null>(null);
  const desktopSearchRef = useRef<HTMLDivElement | null>(null);
  const mobileSearchRef = useRef<HTMLDivElement | null>(null);

  const activeCategory: MegaMenuCategory | undefined =
    MEGA_MENU_CATEGORIES.find((c) => c.id === hoveredCatId) ?? MEGA_MENU_CATEGORIES[0];

  // Close mega-menu and search dropdown on outside click or Escape
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (navContainerRef.current && !navContainerRef.current.contains(target)) {
        setMegaOpen(false);
      }
      const inDesktopSearch = desktopSearchRef.current?.contains(target);
      const inMobileSearch = mobileSearchRef.current?.contains(target);
      if (!inDesktopSearch && !inMobileSearch) {
        setDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMegaOpen(false);
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Fetch instant search results as user types
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setInstantResults([]);
      setInstantLoading(false);
      return;
    }

    const controller = new AbortController();
    setInstantLoading(true);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/catalog?q=${encodeURIComponent(trimmed)}&limit=6&sort=in_stock_first`,
          { signal: controller.signal }
        );
        if (res.ok) {
          const data = (await res.json()) as CatalogResponse;
          setInstantResults(data.items);
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setInstantResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setInstantLoading(false);
        }
      }
    }, 180);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  const handleCategoryAction = (opts: { category?: string; brand?: string; q?: string }) => {
    setMegaOpen(false);
    setMobileMenuOpen(false);
    setDropdownOpen(false);
    onSelectFilter(opts);
  };

  const handlePickInstantProduct = (slug: string) => {
    setDropdownOpen(false);
    onNavigateProduct(slug);
  };

  const handleSearchFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDropdownOpen(false);
    onSubmitSearch(searchQuery.trim());
  };

  const renderInstantDropdown = () => {
    const trimmed = searchQuery.trim();
    if (!dropdownOpen || trimmed.length < 2) return null;

    return (
      <div
        role="listbox"
        aria-label="نتایج فوری جستجو"
        className="absolute inset-x-0 top-full mt-1.5 z-50 rounded-xl bg-white border border-slate-200 shadow-xl overflow-hidden text-slate-900"
      >
        {instantLoading ? (
          <div className="p-3 space-y-2.5">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="flex items-center gap-3 animate-pulse">
                <div className="w-11 h-11 rounded-lg bg-slate-100 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-3/4 rounded bg-slate-100" />
                  <div className="h-3 w-1/3 rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : instantResults.length === 0 ? (
          <div className="px-4 py-4 text-xs text-slate-500 text-center">
            کالایی با عبارت «{trimmed}» یافت نشد.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto mini-scrollbar overscroll-contain">
            {instantResults.map((item) => {
              const stock = getStockMeta(item.stock_status);
              return (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  onClick={() => handlePickInstantProduct(item.slug)}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-right hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="w-11 h-11 rounded-lg border border-slate-200 bg-white p-1 shrink-0 flex items-center justify-center overflow-hidden">
                    <ProductImage
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      dir="auto"
                      title={item.name}
                      className="text-xs sm:text-sm font-medium text-slate-900 truncate"
                    >
                      {item.name}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                      {item.brand && <span>{item.brand}</span>}
                      {item.brand && <span aria-hidden="true">·</span>}
                      <span>{item.category}</span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={
                          item.stock_status === 'in_stock'
                            ? 'text-emerald-700'
                            : item.stock_status === 'call'
                              ? 'text-amber-700'
                              : 'text-slate-400'
                        }
                      >
                        {stock.label}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 text-left text-xs sm:text-sm font-bold text-slate-900 tabular-nums whitespace-nowrap">
                    {item.stock_status === 'out_of_stock'
                      ? 'ناموجود'
                      : formatToman(item.price_toman)}
                  </div>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                setDropdownOpen(false);
                onSubmitSearch(trimmed);
              }}
              className="w-full px-4 py-2.5 text-xs font-semibold text-emerald-700 bg-slate-50 hover:bg-emerald-50/70 transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>مشاهده همه نتایج برای «{trimmed}»</span>
              <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <header className="relative z-40">
      {/* Row 1: Deep Slate-Navy (#0F172A) Sticky Bar */}
      <div className="sticky top-0 z-40 bg-[#0F172A] text-white border-b border-slate-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between gap-4 sm:gap-6">
          {/* Right: Mobile menu toggle + Minimal bespoke logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? 'بستن منوی دسته‌بندی‌ها' : 'باز کردن منوی دسته‌بندی‌ها'}
              aria-expanded={mobileMenuOpen}
              className="lg:hidden rounded-lg p-2 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <a
              href="/"
              onClick={(e) => {
                if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
                  e.preventDefault();
                  setDropdownOpen(false);
                  onNavigateHome();
                }
              }}
              className="flex items-center gap-2.5 text-base sm:text-lg font-extrabold tracking-tight text-white whitespace-nowrap shrink-0"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shrink-0">
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                  <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 15h3M1 9h3M1 15h3" />
                </svg>
              </span>
              <span>{STORE_CONTACT.brandName}</span>
            </a>
          </div>

          {/* Center: Wide Desktop Live Search with Instant Results Dropdown */}
          <div ref={desktopSearchRef} className="flex-1 max-w-2xl hidden md:block relative">
            <form onSubmit={handleSearchFormSubmit}>
              <label htmlFor="header-search-input" className="sr-only">
                جستجو در محصولات سخت‌افزاری
              </label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="header-search-input"
                  type="search"
                  autoComplete="off"
                  value={searchQuery}
                  onFocus={() => setDropdownOpen(true)}
                  onChange={(e) => {
                    onSearchChange(e.target.value);
                    setDropdownOpen(true);
                  }}
                  placeholder="جستجوی کارت گرافیک، لپ‌تاپ، مانیتور، پردازنده یا برند..."
                  className="w-full rounded-xl bg-white border border-transparent pr-10 pl-9 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      onSearchChange('');
                      setInstantResults([]);
                    }}
                    aria-label="پاک کردن عبارت جستجو"
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </form>
            {renderInstantDropdown()}
          </div>

          {/* Left: Consultation / Contact Button */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={onOpenConsultation}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-emerald-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Phone className="w-4 h-4" aria-hidden="true" />
              <span>مشاوره خرید</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Search Bar (non-sticky for compact viewport budget) */}
      <div
        ref={mobileSearchRef}
        className="md:hidden px-4 py-2.5 bg-[#0F172A] border-b border-slate-800 relative"
      >
        <form onSubmit={handleSearchFormSubmit}>
          <label htmlFor="mobile-search-input" className="sr-only">
            جستجو در محصولات
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              aria-hidden="true"
            />
            <input
              id="mobile-search-input"
              type="search"
              autoComplete="off"
              value={searchQuery}
              onFocus={() => setDropdownOpen(true)}
              onChange={(e) => {
                onSearchChange(e.target.value);
                setDropdownOpen(true);
              }}
              placeholder="جستجو در کاتالوگ سخت‌افزار..."
              className="w-full rounded-xl bg-white pr-9 pl-8 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  onSearchChange('');
                  setInstantResults([]);
                }}
                aria-label="پاک کردن جستجو"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>
        <div className="relative">{renderInstantDropdown()}</div>
      </div>

      {/* Row 2: Light Category & Mega-Menu Bar (#FFFFFF) */}
      <div
        ref={navContainerRef}
        className="relative bg-white border-b border-slate-200"
        onMouseLeave={() => setMegaOpen(false)}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex items-center gap-3 h-11">
          {/* Desktop Mega-Menu Trigger */}
          <div className="hidden lg:flex items-center shrink-0">
            <button
              type="button"
              aria-expanded={megaOpen}
              onMouseEnter={() => setMegaOpen(true)}
              onClick={() => setMegaOpen((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 py-2.5 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                megaOpen ? 'text-emerald-700' : 'text-slate-900 hover:text-emerald-700'
              }`}
            >
              <Menu className="w-4 h-4 text-emerald-600" aria-hidden="true" />
              <span>دسته‌بندی کالاها</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
                  megaOpen ? 'rotate-180 text-emerald-600' : ''
                }`}
                aria-hidden="true"
              />
            </button>
            <span className="mx-3 h-4 w-px bg-slate-200" aria-hidden="true" />
          </div>

          {/* Horizontal Quick Category Strip (1-click access on desktop & mobile) */}
          <nav
            aria-label="دسترسی سریع دسته‌بندی‌ها"
            className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar h-full flex-1"
          >
            <button
              type="button"
              onClick={() => handleCategoryAction({ category: '' })}
              className={`h-full px-2.5 inline-flex items-center text-xs sm:text-sm whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer ${
                !selectedCategory
                  ? 'border-emerald-600 text-emerald-700 font-semibold'
                  : 'border-transparent text-slate-600 hover:text-slate-900 font-medium'
              }`}
            >
              همه محصولات
            </button>

            {MEGA_MENU_CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.categoryFilter;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryAction({ category: cat.categoryFilter })}
                  className={`h-full px-2.5 inline-flex items-center text-xs sm:text-sm whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer ${
                    isActive
                      ? 'border-emerald-600 text-emerald-700 font-semibold'
                      : 'border-transparent text-slate-600 hover:text-slate-900 font-medium'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Organized Desktop Mega-Menu Panel */}
        {megaOpen && activeCategory && (
          <div className="hidden lg:block absolute inset-x-0 top-full z-50 bg-white border-b border-slate-200 shadow-lg">
            <div className="mx-auto max-w-7xl px-6 py-5 grid grid-cols-12 gap-6">
              {/* Left-aligned in RTL (Right column): Category list */}
              <div className="col-span-3 border-l border-slate-100 pl-4 space-y-1">
                {MEGA_MENU_CATEGORIES.map((cat) => {
                  const isSelected = cat.id === activeCategory.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onMouseEnter={() => setHoveredCatId(cat.id)}
                      onClick={() => handleCategoryAction({ category: cat.categoryFilter })}
                      className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm text-right transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50 text-emerald-700 font-semibold'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <span>{cat.label}</span>
                      <ChevronLeft className="w-4 h-4 opacity-60" aria-hidden="true" />
                    </button>
                  );
                })}
              </div>

              {/* Subcategories */}
              <div className="col-span-5 pr-2">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-500">
                    زیرمجموعه‌های {activeCategory.label}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCategoryAction({ category: activeCategory.categoryFilter })
                    }
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-600 transition-colors cursor-pointer"
                  >
                    مشاهده همه ←
                  </button>
                </div>
                <ul className="space-y-2">
                  {activeCategory.subcategories.map((sub) => (
                    <li key={sub.label}>
                      <button
                        type="button"
                        onClick={() =>
                          handleCategoryAction({
                            category: activeCategory.categoryFilter,
                            q: sub.query,
                          })
                        }
                        className="text-sm text-slate-700 hover:text-emerald-700 transition-colors cursor-pointer"
                      >
                        {sub.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Featured Brands */}
              <div className="col-span-4 border-r border-slate-100 pr-6">
                <div className="text-xs font-semibold text-slate-500 mb-3">
                  برندهای منتخب در {activeCategory.label}
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeCategory.brands.map((brand) => (
                    <button
                      key={brand}
                      type="button"
                      onClick={() =>
                        handleCategoryAction({
                          category: activeCategory.categoryFilter,
                          brand,
                        })
                      }
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:border-emerald-600 hover:text-emerald-700 hover:bg-white transition-colors cursor-pointer"
                    >
                      {brand}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Category Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-slate-200 bg-white px-4 py-4 space-y-4 shadow-md max-h-[calc(100dvh-7rem)] overflow-y-auto mini-scrollbar overscroll-contain">
          {MEGA_MENU_CATEGORIES.map((cat) => (
            <div key={cat.id} className="border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
              <button
                type="button"
                onClick={() => handleCategoryAction({ category: cat.categoryFilter })}
                className="w-full flex items-center justify-between text-right text-sm font-bold text-slate-900 hover:text-emerald-700 py-1 cursor-pointer"
              >
                <span>{cat.label}</span>
                <ChevronLeft className="w-4 h-4 text-slate-400" aria-hidden="true" />
              </button>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {cat.subcategories.map((sub) => (
                  <button
                    key={sub.label}
                    type="button"
                    onClick={() =>
                      handleCategoryAction({ category: cat.categoryFilter, q: sub.query })
                    }
                    className="rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1 text-xs text-slate-700 hover:border-emerald-600 hover:text-emerald-700 cursor-pointer"
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </header>
  );
}
