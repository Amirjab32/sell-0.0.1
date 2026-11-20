import { ArrowUpDown, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { formatTomanNumber, toPersianDigits } from '../lib/format';
import type { CatalogSort } from '../types/catalog';

interface SortToolbarProps {
  sort: CatalogSort;
  totalResults: number;
  searchQuery: string;
  selectedCategory: string;
  selectedBrand: string;
  onlyAvailable: boolean;
  appliedMinPrice: string;
  appliedMaxPrice: string;
  onSortChange: (value: CatalogSort) => void;
  onOpenMobileFilters: () => void;
  onClearSearch: () => void;
  onClearCategory: () => void;
  onClearBrand: () => void;
  onClearOnlyAvailable: () => void;
  onClearMinPrice: () => void;
  onClearMaxPrice: () => void;
  onResetFilters: () => void;
}

const SORT_OPTIONS: Array<{ value: CatalogSort; label: string }> = [
  { value: 'in_stock_first', label: 'موجودها اول' },
  { value: 'newest', label: 'جدیدترین' },
  { value: 'cheapest', label: 'ارزان‌ترین' },
  { value: 'expensive', label: 'گران‌ترین' },
];

export function SortToolbar({
  sort,
  totalResults,
  searchQuery,
  selectedCategory,
  selectedBrand,
  onlyAvailable,
  appliedMinPrice,
  appliedMaxPrice,
  onSortChange,
  onOpenMobileFilters,
  onClearSearch,
  onClearCategory,
  onClearBrand,
  onClearOnlyAvailable,
  onClearMinPrice,
  onClearMaxPrice,
  onResetFilters,
}: SortToolbarProps) {
  const activeChips: Array<{ key: string; label: string; onRemove: () => void }> = [];

  if (searchQuery) {
    activeChips.push({
      key: 'q',
      label: `جستجو: «${searchQuery}»`,
      onRemove: onClearSearch,
    });
  }
  if (selectedCategory) {
    activeChips.push({
      key: 'category',
      label: `دسته: ${selectedCategory}`,
      onRemove: onClearCategory,
    });
  }
  if (selectedBrand) {
    activeChips.push({
      key: 'brand',
      label: `برند: ${selectedBrand}`,
      onRemove: onClearBrand,
    });
  }
  if (onlyAvailable) {
    activeChips.push({
      key: 'available',
      label: 'فقط کالاهای موجود',
      onRemove: onClearOnlyAvailable,
    });
  }
  if (appliedMinPrice) {
    activeChips.push({
      key: 'minPrice',
      label: `حداقل قیمت: ${formatTomanNumber(Number(appliedMinPrice))} تومان`,
      onRemove: onClearMinPrice,
    });
  }
  if (appliedMaxPrice) {
    activeChips.push({
      key: 'maxPrice',
      label: `حداکثر قیمت: ${formatTomanNumber(Number(appliedMaxPrice))} تومان`,
      onRemove: onClearMaxPrice,
    });
  }

  return (
    <div id="catalog-toolbar" className="space-y-3">
      {/* Horizontal Tabbed Sort Bar + Result Count */}
      <div className="rounded-xl bg-white border border-slate-200 px-3 sm:px-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
          {/* Mobile Filter Trigger */}
          <button
            type="button"
            onClick={onOpenMobileFilters}
            className="lg:hidden inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 my-2 text-xs font-semibold text-slate-800 hover:border-emerald-600 cursor-pointer whitespace-nowrap shrink-0"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
            <span>فیلترها</span>
            {activeChips.length > 0 && (
              <span className="text-emerald-700 tabular-nums">
                ({toPersianDigits(activeChips.length)})
              </span>
            )}
          </button>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 pl-2 whitespace-nowrap shrink-0">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            <span>مرتب‌سازی:</span>
          </div>

          <div className="flex items-center gap-1" role="tablist" aria-label="مرتب‌سازی محصولات">
            {SORT_OPTIONS.map((option) => {
              const active = sort === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onSortChange(option.value)}
                  className={`px-2.5 sm:px-3 py-3 text-xs sm:text-sm whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer ${
                    active
                      ? 'border-emerald-600 text-emerald-700 font-semibold'
                      : 'border-transparent text-slate-600 hover:text-slate-900 font-medium'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="py-2 text-xs sm:text-sm text-slate-500 tabular-nums whitespace-nowrap shrink-0">
          {toPersianDigits(totalResults)} کالا
        </div>
      </div>

      {/* Removable Active Filter Chips + Clear All */}
      {activeChips.length > 0 && (
        <div
          aria-label="فیلترهای فعال"
          className="flex flex-wrap items-center gap-2 text-xs"
        >
          <span className="text-slate-500 font-medium">فیلترهای فعال:</span>
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.onRemove}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700 hover:border-red-300 hover:text-red-700 transition-colors cursor-pointer tabular-nums"
            >
              <span>{chip.label}</span>
              <X className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            </button>
          ))}
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>پاک کردن فیلترها</span>
          </button>
        </div>
      )}
    </div>
  );
}
