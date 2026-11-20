import { useCallback, useEffect, useRef, useState } from 'react';
import { AdminBannerManager } from './components/AdminBannerManager';
import { FilterSidebar } from './components/FilterSidebar';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { HeroBannerSlider } from './components/HeroBannerSlider';
import { ConsultationModal, OrderInquiryModal } from './components/Modals';
import { ProductCard } from './components/ProductCard';
import { ProductDetailPage } from './components/ProductDetailPage';
import { SortToolbar } from './components/SortToolbar';
import { CatalogSkeleton, EmptyCatalogState, ErrorState } from './components/States';
import { toPersianDigits } from './lib/format';
import type { CatalogResponse, CatalogSort, PublicBanner, PublicProduct } from './types/catalog';

function extractProductSlugFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/product\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
}

interface ParsedUrlFilters {
  category: string;
  brand: string;
  q: string;
  onlyAvailable: boolean;
  sort: CatalogSort;
  openConsultation: boolean;
}

function parseFiltersFromUrlSearch(search: string): ParsedUrlFilters {
  const params = new URLSearchParams(search);
  const rawSort = params.get('sort');
  const validSort: CatalogSort =
    rawSort === 'cheapest' || rawSort === 'expensive' || rawSort === 'newest' || rawSort === 'in_stock_first'
      ? rawSort
      : 'in_stock_first';

  return {
    category: params.get('category') ?? '',
    brand: params.get('brand') ?? '',
    q: params.get('q') ?? '',
    onlyAvailable: params.get('onlyAvailable') === 'true' || params.get('onlyAvailable') === '1',
    sort: validSort,
    openConsultation: params.get('action') === 'consultation',
  };
}

export default function App() {
  const [pathname, setPathname] = useState<string>(() =>
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );

  const initialFilters: ParsedUrlFilters =
    typeof window !== 'undefined'
      ? parseFiltersFromUrlSearch(window.location.search)
      : {
          category: '',
          brand: '',
          q: '',
          onlyAvailable: false,
          sort: 'in_stock_first',
          openConsultation: false,
        };

  // Filter & Sort states (hydrating initial URL params for banner links and deep links)
  const [searchQuery, setSearchQuery] = useState(initialFilters.q);
  const [debouncedQuery, setDebouncedQuery] = useState(initialFilters.q.trim());
  const [selectedCategory, setSelectedCategory] = useState(initialFilters.category);
  const [selectedBrand, setSelectedBrand] = useState(initialFilters.brand);
  const [onlyAvailable, setOnlyAvailable] = useState(initialFilters.onlyAvailable);
  const [minPriceInput, setMinPriceInput] = useState('');
  const [maxPriceInput, setMaxPriceInput] = useState('');
  const [appliedMinPrice, setAppliedMinPrice] = useState('');
  const [appliedMaxPrice, setAppliedMaxPrice] = useState('');
  const [sort, setSort] = useState<CatalogSort>(initialFilters.sort);
  const [page, setPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Data states
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [banners, setBanners] = useState<PublicBanner[]>([]);
  const [bannersLoading, setBannersLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [consultOpen, setConsultOpen] = useState(initialFilters.openConsultation);
  const [inquiryProduct, setInquiryProduct] = useState<PublicProduct | null>(null);

  const catalogSectionRef = useRef<HTMLElement | null>(null);

  const isAdminPage = pathname === '/admin' || pathname === '/admin/';
  const productSlug = isAdminPage ? null : extractProductSlugFromPath(pathname);

  const applyUrlFilters = useCallback((search: string) => {
    const parsed = parseFiltersFromUrlSearch(search);
    setSelectedCategory(parsed.category);
    setSelectedBrand(parsed.brand);
    setSearchQuery(parsed.q);
    setDebouncedQuery(parsed.q.trim());
    setOnlyAvailable(parsed.onlyAvailable);
    setSort(parsed.sort);
    setMinPriceInput('');
    setMaxPriceInput('');
    setAppliedMinPrice('');
    setAppliedMaxPrice('');
    setPage(1);
    if (parsed.openConsultation) {
      setConsultOpen(true);
    }
  }, []);

  // Browser history navigation listener
  useEffect(() => {
    const onPopState = () => {
      const nextPath = window.location.pathname;
      setPathname(nextPath);
      if (nextPath !== '/admin' && nextPath !== '/admin/' && !extractProductSlugFromPath(nextPath)) {
        applyUrlFilters(window.location.search);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [applyUrlFilters]);

  const navigateTo = useCallback(
    (nextTarget: string) => {
      const resolved = new URL(nextTarget, window.location.origin);
      const nextFull = `${resolved.pathname}${resolved.search}${resolved.hash}`;
      const currentFull = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (currentFull !== nextFull) {
        window.history.pushState({}, '', nextFull);
      }
      setPathname(resolved.pathname);

      const targetIsAdmin = resolved.pathname === '/admin' || resolved.pathname === '/admin/';
      const targetIsProduct = Boolean(extractProductSlugFromPath(resolved.pathname));

      if (!targetIsAdmin && !targetIsProduct) {
        applyUrlFilters(resolved.search);
        if (resolved.search && !resolved.searchParams.has('action')) {
          setTimeout(() => {
            catalogSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 60);
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [applyUrlFilters]
  );

  // Debounce live search query for main catalog filtering
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
      setPage(1);
    }, 240);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch active hero banner slides
  const fetchBanners = useCallback(async () => {
    setBannersLoading(true);
    try {
      const res = await fetch('/api/banners');
      if (res.ok) {
        const json = (await res.json()) as { items: PublicBanner[] };
        setBanners(Array.isArray(json.items) ? json.items : []);
      }
    } catch {
      // Non-blocking: slider collapses cleanly if banner endpoint fails
    } finally {
      setBannersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  // Fetch filtered catalog
  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '12');
      params.set('sort', sort);
      if (debouncedQuery) params.set('q', debouncedQuery);
      if (selectedCategory) params.set('category', selectedCategory);
      if (selectedBrand) params.set('brand', selectedBrand);
      if (onlyAvailable) params.set('onlyAvailable', 'true');
      if (appliedMinPrice) params.set('minPrice', appliedMinPrice);
      if (appliedMaxPrice) params.set('maxPrice', appliedMaxPrice);

      const res = await fetch(`/api/catalog?${params.toString()}`);
      if (!res.ok) {
        throw new Error('خطا در دریافت کاتالوگ محصولات از سرور.');
      }
      const json = (await res.json()) as CatalogResponse;
      setCatalog(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطای ارتباط با سرور');
    } finally {
      setLoading(false);
    }
  }, [
    page,
    sort,
    debouncedQuery,
    selectedCategory,
    selectedBrand,
    onlyAvailable,
    appliedMinPrice,
    appliedMaxPrice,
  ]);

  useEffect(() => {
    if (!productSlug && !isAdminPage) {
      fetchCatalog();
    }
  }, [productSlug, isAdminPage, fetchCatalog]);

  const hasActiveFilters = Boolean(
    debouncedQuery ||
      selectedCategory ||
      selectedBrand ||
      onlyAvailable ||
      appliedMinPrice ||
      appliedMaxPrice ||
      sort !== 'in_stock_first'
  );

  const resetAllFilters = useCallback(() => {
    setSearchQuery('');
    setDebouncedQuery('');
    setSelectedCategory('');
    setSelectedBrand('');
    setOnlyAvailable(false);
    setMinPriceInput('');
    setMaxPriceInput('');
    setAppliedMinPrice('');
    setAppliedMaxPrice('');
    setSort('in_stock_first');
    setPage(1);
  }, []);

  const handleNavigateHome = useCallback(() => {
    resetAllFilters();
    if (`${window.location.pathname}${window.location.search}` !== '/') {
      window.history.pushState({}, '', '/');
    }
    setPathname('/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [resetAllFilters]);

  const handleHeaderFilterSelect = useCallback(
    (opts: { category?: string; brand?: string; q?: string }) => {
      setSelectedCategory(opts.category ?? '');
      setSelectedBrand(opts.brand ?? '');
      const nextQ = opts.q ?? '';
      setSearchQuery(nextQ);
      setDebouncedQuery(nextQ);
      setOnlyAvailable(false);
      setSort('in_stock_first');
      setPage(1);
      if (`${window.location.pathname}${window.location.search}` !== '/') {
        window.history.pushState({}, '', '/');
      }
      setPathname('/');
      setTimeout(() => {
        catalogSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    },
    []
  );

  const handleSubmitSearch = useCallback((val: string) => {
    setSearchQuery(val);
    setDebouncedQuery(val);
    setPage(1);
    if (`${window.location.pathname}${window.location.search}` !== '/') {
      window.history.pushState({}, '', '/');
    }
    setPathname('/');
    setTimeout(() => {
      catalogSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  }, []);

  const isDatabaseEmpty = Boolean(catalog && catalog.totalCatalogCount === 0);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-zinc-900">
      <Header
        searchQuery={searchQuery}
        selectedCategory={selectedCategory}
        onSearchChange={setSearchQuery}
        onSubmitSearch={handleSubmitSearch}
        onSelectFilter={handleHeaderFilterSelect}
        onNavigateHome={handleNavigateHome}
        onNavigateProduct={(slug) => navigateTo(`/product/${encodeURIComponent(slug)}`)}
        onOpenConsultation={() => setConsultOpen(true)}
      />

      <main className="flex-1">
        {isAdminPage ? (
          <AdminBannerManager
            onNavigateHome={handleNavigateHome}
            onBannersChanged={fetchBanners}
          />
        ) : productSlug ? (
          <ProductDetailPage
            slug={productSlug}
            onNavigateHome={handleNavigateHome}
            onNavigateCategory={(cat) => handleHeaderFilterSelect({ category: cat })}
            onNavigateProduct={(slug) => navigateTo(`/product/${encodeURIComponent(slug)}`)}
            onOpenOrderInquiry={(product) => setInquiryProduct(product)}
          />
        ) : (
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-5 sm:py-6 space-y-6">
            {/* Full-Width Rounded Hero Banner Carousel */}
            {!hasActiveFilters && (!isDatabaseEmpty || banners.length > 0) && (
              <HeroBannerSlider
                banners={banners}
                loading={bannersLoading}
                onSelectFilter={handleHeaderFilterSelect}
                onNavigateProduct={(slug) => navigateTo(`/product/${encodeURIComponent(slug)}`)}
                onNavigatePath={navigateTo}
              />
            )}

            {/* Catalog Section: Right Accordion Sidebar + Left 3-Column Grid */}
            <section ref={catalogSectionRef} className="space-y-4">
              {isDatabaseEmpty ? (
                loading ? (
                  <CatalogSkeleton />
                ) : (
                  <EmptyCatalogState
                    isDatabaseEmpty={true}
                    onResetFilters={resetAllFilters}
                    onRetry={() => {
                      fetchBanners();
                      fetchCatalog();
                    }}
                  />
                )
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <FilterSidebar
                    categories={catalog?.facets.categories ?? []}
                    brands={catalog?.facets.brands ?? []}
                    selectedCategory={selectedCategory}
                    selectedBrand={selectedBrand}
                    onlyAvailable={onlyAvailable}
                    minPriceInput={minPriceInput}
                    maxPriceInput={maxPriceInput}
                    appliedMinPrice={appliedMinPrice}
                    appliedMaxPrice={appliedMaxPrice}
                    totalResults={catalog?.pagination.total ?? 0}
                    hasActiveFilters={hasActiveFilters}
                    mobileOpen={mobileFiltersOpen}
                    onCloseMobile={() => setMobileFiltersOpen(false)}
                    onCategoryChange={(val) => {
                      setSelectedCategory(val);
                      setPage(1);
                    }}
                    onBrandChange={(val) => {
                      setSelectedBrand(val);
                      setPage(1);
                    }}
                    onOnlyAvailableChange={(val) => {
                      setOnlyAvailable(val);
                      setPage(1);
                    }}
                    onMinPriceChange={setMinPriceInput}
                    onMaxPriceChange={setMaxPriceInput}
                    onApplyPriceRange={() => {
                      setAppliedMinPrice(minPriceInput.trim());
                      setAppliedMaxPrice(maxPriceInput.trim());
                      setPage(1);
                    }}
                    onClearPriceRange={() => {
                      setMinPriceInput('');
                      setMaxPriceInput('');
                      setAppliedMinPrice('');
                      setAppliedMaxPrice('');
                      setPage(1);
                    }}
                    onResetFilters={resetAllFilters}
                  />

                  <div className="lg:col-span-9 space-y-4">
                    <SortToolbar
                      sort={sort}
                      totalResults={catalog?.pagination.total ?? 0}
                      searchQuery={debouncedQuery}
                      selectedCategory={selectedCategory}
                      selectedBrand={selectedBrand}
                      onlyAvailable={onlyAvailable}
                      appliedMinPrice={appliedMinPrice}
                      appliedMaxPrice={appliedMaxPrice}
                      onSortChange={(val) => {
                        setSort(val);
                        setPage(1);
                      }}
                      onOpenMobileFilters={() => setMobileFiltersOpen(true)}
                      onClearSearch={() => {
                        setSearchQuery('');
                        setDebouncedQuery('');
                        setPage(1);
                      }}
                      onClearCategory={() => {
                        setSelectedCategory('');
                        setPage(1);
                      }}
                      onClearBrand={() => {
                        setSelectedBrand('');
                        setPage(1);
                      }}
                      onClearOnlyAvailable={() => {
                        setOnlyAvailable(false);
                        setPage(1);
                      }}
                      onClearMinPrice={() => {
                        setMinPriceInput('');
                        setAppliedMinPrice('');
                        setPage(1);
                      }}
                      onClearMaxPrice={() => {
                        setMaxPriceInput('');
                        setAppliedMaxPrice('');
                        setPage(1);
                      }}
                      onResetFilters={resetAllFilters}
                    />

                    {loading ? (
                      <CatalogSkeleton />
                    ) : error ? (
                      <ErrorState
                        message={error}
                        onRetry={() => {
                          fetchBanners();
                          fetchCatalog();
                        }}
                      />
                    ) : !catalog || catalog.items.length === 0 ? (
                      <EmptyCatalogState
                        isDatabaseEmpty={false}
                        onResetFilters={resetAllFilters}
                        onRetry={() => {
                          fetchBanners();
                          fetchCatalog();
                        }}
                      />
                    ) : (
                      <>
                        <div
                          data-testid="catalog-grid"
                          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
                        >
                          {catalog.items.map((product) => (
                            <ProductCard
                              key={product.id}
                              product={product}
                              onNavigateProduct={(slug) =>
                                navigateTo(`/product/${encodeURIComponent(slug)}`)
                              }
                            />
                          ))}
                        </div>

                        {/* Pagination */}
                        {catalog.pagination.totalPages > 1 && (
                          <div className="flex items-center justify-center gap-2 pt-4">
                            <button
                              type="button"
                              disabled={page <= 1}
                              onClick={() => setPage((p) => Math.max(1, p - 1))}
                              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-700 disabled:opacity-40 hover:border-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer disabled:cursor-not-allowed"
                            >
                              صفحه قبل
                            </button>
                            <span className="px-3 text-sm text-zinc-500 tabular-nums">
                              صفحه {toPersianDigits(page)} از{' '}
                              {toPersianDigits(catalog.pagination.totalPages)}
                            </span>
                            <button
                              type="button"
                              disabled={page >= catalog.pagination.totalPages}
                              onClick={() =>
                                setPage((p) => Math.min(catalog.pagination.totalPages, p + 1))
                              }
                              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-700 disabled:opacity-40 hover:border-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer disabled:cursor-not-allowed"
                            >
                              صفحه بعد
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      <Footer
        lastSyncedAt={catalog?.lastSyncedAt ?? null}
        onSelectCategory={(cat) => handleHeaderFilterSelect({ category: cat })}
        onOpenConsultation={() => setConsultOpen(true)}
      />

      <ConsultationModal isOpen={consultOpen} onClose={() => setConsultOpen(false)} />
      <OrderInquiryModal product={inquiryProduct} onClose={() => setInquiryProduct(null)} />
    </div>
  );
}
