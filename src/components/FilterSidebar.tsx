import { ChevronDown, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';
import { formatTomanNumber, toPersianDigits } from '../lib/format';
import type { CatalogFacet } from '../types/catalog';

interface FilterSidebarProps {
  categories: CatalogFacet[];
  brands: CatalogFacet[];
  selectedCategory: string;
  selectedBrand: string;
  onlyAvailable: boolean;
  minPriceInput: string;
  maxPriceInput: string;
  appliedMinPrice: string;
  appliedMaxPrice: string;
  totalResults: number;
  hasActiveFilters: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onCategoryChange: (value: string) => void;
  onBrandChange: (value: string) => void;
  onOnlyAvailableChange: (value: boolean) => void;
  onMinPriceChange: (value: string) => void;
  onMaxPriceChange: (value: string) => void;
  onApplyPriceRange: () => void;
  onClearPriceRange: () => void;
  onResetFilters: () => void;
}

interface AccordionSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function AccordionSection({ title, defaultOpen = true, children }: AccordionSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-semibold text-slate-900 hover:bg-slate-50/70 transition-colors cursor-pointer"
      >
        <span>{title}</span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-150 ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

export function FilterSidebar({
  categories,
  brands,
  selectedCategory,
  selectedBrand,
  onlyAvailable,
  minPriceInput,
  maxPriceInput,
  appliedMinPrice,
  appliedMaxPrice,
  totalResults,
  hasActiveFilters,
  mobileOpen,
  onCloseMobile,
  onCategoryChange,
  onBrandChange,
  onOnlyAvailableChange,
  onMinPriceChange,
  onMaxPriceChange,
  onApplyPriceRange,
  onClearPriceRange,
  onResetFilters,
}: FilterSidebarProps) {
  const hasPriceApplied = Boolean(appliedMinPrice || appliedMaxPrice);

  const filterBody = (
    <div className="divide-y divide-slate-100">
      {/* Availability Switch */}
      <div className="px-4 py-3.5 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-slate-900">فقط کالاهای موجود</span>
        <button
          type="button"
          role="switch"
          aria-checked={onlyAvailable}
          aria-label="فقط کالاهای موجود"
          onClick={() => onOnlyAvailableChange(!onlyAvailable)}
          className={`h-6 w-11 rounded-full p-0.5 transition-colors flex items-center cursor-pointer ${
            onlyAvailable ? 'bg-emerald-600 justify-start' : 'bg-slate-200 justify-end'
          }`}
        >
          <span className="h-5 w-5 rounded-full bg-white shadow-sm" />
        </button>
      </div>

      {/* Category Accordion */}
      <AccordionSection title="دسته‌بندی">
        <div className="space-y-1 max-h-56 overflow-y-auto mini-scrollbar overscroll-contain pl-1.5">
          <button
            type="button"
            onClick={() => onCategoryChange('')}
            className={`w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs sm:text-sm text-right transition-colors cursor-pointer ${
              selectedCategory === ''
                ? 'bg-emerald-50 text-emerald-700 font-semibold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <span>همه دسته‌بندی‌ها</span>
          </button>
          {categories.map((cat) => {
            const active = selectedCategory === cat.name;
            return (
              <button
                key={cat.name}
                type="button"
                onClick={() => onCategoryChange(active ? '' : cat.name)}
                className={`w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm text-right transition-colors cursor-pointer ${
                  active
                    ? 'bg-emerald-50 text-emerald-700 font-semibold'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className="truncate">{cat.name}</span>
                <span className="text-xs text-slate-400 tabular-nums shrink-0">
                  {toPersianDigits(cat.count)}
                </span>
              </button>
            );
          })}
        </div>
      </AccordionSection>

      {/* Brand Accordion */}
      <AccordionSection title="برند">
        <div className="space-y-1 max-h-56 overflow-y-auto mini-scrollbar overscroll-contain pl-1.5">
          <button
            type="button"
            onClick={() => onBrandChange('')}
            className={`w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs sm:text-sm text-right transition-colors cursor-pointer ${
              selectedBrand === ''
                ? 'bg-emerald-50 text-emerald-700 font-semibold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <span>همه برندها</span>
          </button>
          {brands.map((brand) => {
            const active = selectedBrand === brand.name;
            return (
              <button
                key={brand.name}
                type="button"
                onClick={() => onBrandChange(active ? '' : brand.name)}
                className={`w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm text-right transition-colors cursor-pointer ${
                  active
                    ? 'bg-emerald-50 text-emerald-700 font-semibold'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className="truncate">{brand.name}</span>
                <span className="text-xs text-slate-400 tabular-nums shrink-0">
                  {toPersianDigits(brand.count)}
                </span>
              </button>
            );
          })}
        </div>
      </AccordionSection>

      {/* Price Range Accordion */}
      <AccordionSection title="محدوده قیمت (تومان)">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onApplyPriceRange();
          }}
          className="space-y-3"
        >
          <div className="space-y-2">
            <div>
              <label htmlFor="sidebar-min-price" className="block text-[11px] text-slate-500 mb-1">
                از مبلغ
              </label>
              <input
                id="sidebar-min-price"
                type="number"
                min={0}
                inputMode="numeric"
                value={minPriceInput}
                onChange={(e) => onMinPriceChange(e.target.value)}
                placeholder="مثلاً ۱۰۰۰۰۰۰۰"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-600 focus:outline-none tabular-nums"
              />
            </div>

            <div>
              <label htmlFor="sidebar-max-price" className="block text-[11px] text-slate-500 mb-1">
                تا مبلغ
              </label>
              <input
                id="sidebar-max-price"
                type="number"
                min={0}
                inputMode="numeric"
                value={maxPriceInput}
                onChange={(e) => onMaxPriceChange(e.target.value)}
                placeholder="مثلاً ۱۵۰۰۰۰۰۰۰"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-600 focus:outline-none tabular-nums"
              />
            </div>
          </div>

          {hasPriceApplied && (
            <div className="text-[11px] text-slate-500 tabular-nums">
              اعمال‌شده:{' '}
              {appliedMinPrice ? `از ${formatTomanNumber(Number(appliedMinPrice))}` : 'بدون کف'} تا{' '}
              {appliedMaxPrice ? `${formatTomanNumber(Number(appliedMaxPrice))} تومان` : 'بدون سقف'}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              اعمال بازه قیمت
            </button>
            {hasPriceApplied && (
              <button
                type="button"
                onClick={onClearPriceRange}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-colors cursor-pointer"
              >
                حذف
              </button>
            )}
          </div>
        </form>
      </AccordionSection>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Accordion Sidebar */}
      <aside aria-label="فیلترهای محصولات" className="hidden lg:block lg:col-span-3">
        <div className="sticky top-20 rounded-xl bg-white border border-slate-200 overflow-hidden">
          <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <SlidersHorizontal className="w-4 h-4 text-emerald-600" aria-hidden="true" />
              <span>فیلترها</span>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={onResetFilters}
                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" aria-hidden="true" />
                <span>پاک کردن</span>
              </button>
            )}
          </div>
          {filterBody}
        </div>
      </aside>

      {/* Mobile Slide-Over Filter Drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex justify-start"
          role="dialog"
          aria-modal="true"
          aria-label="فیلتر محصولات"
        >
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-[1px]"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-xs bg-white h-full flex flex-col shadow-2xl">
            <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <SlidersHorizontal className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                <span>فیلتر محصولات</span>
              </div>
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={onResetFilters}
                    className="text-xs font-medium text-emerald-700 hover:text-emerald-800 cursor-pointer"
                  >
                    حذف همه
                  </button>
                )}
                <button
                  type="button"
                  onClick={onCloseMobile}
                  aria-label="بستن پنل فیلتر"
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto mini-scrollbar overscroll-contain">{filterBody}</div>

            <div className="p-4 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={onCloseMobile}
                className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors cursor-pointer tabular-nums"
              >
                مشاهده {toPersianDigits(totalResults)} کالا
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
