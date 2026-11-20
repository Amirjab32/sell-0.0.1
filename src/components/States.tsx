import { AlertTriangle, Database, RefreshCw, SearchX } from 'lucide-react';

export function CatalogSkeleton() {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
      aria-label="در حال بارگذاری محصولات"
    >
      {Array.from({ length: 6 }).map((_, idx) => (
        <div
          key={idx}
          className="rounded-xl bg-white border border-slate-200 overflow-hidden animate-pulse"
        >
          <div className="aspect-square bg-slate-50 border-b border-slate-100" />
          <div className="p-4 space-y-3">
            <div className="flex justify-between">
              <div className="h-3 w-16 rounded bg-slate-200" />
              <div className="h-3 w-14 rounded bg-slate-200" />
            </div>
            <div className="h-4 w-full rounded bg-slate-200" />
            <div className="h-4 w-3/4 rounded bg-slate-200" />
            <div className="h-3 w-28 rounded bg-slate-100" />
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <div className="h-5 w-28 rounded bg-slate-200" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

interface EmptyCatalogStateProps {
  isDatabaseEmpty: boolean;
  onResetFilters: () => void;
  onRetry: () => void;
}

export function EmptyCatalogState({
  isDatabaseEmpty,
  onResetFilters,
  onRetry,
}: EmptyCatalogStateProps) {
  if (isDatabaseEmpty) {
    return (
      <div className="rounded-xl bg-white border border-slate-200 p-8 sm:p-10 text-center max-w-2xl mx-auto">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
          <Database className="w-6 h-6" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-lg font-bold text-slate-900">
          ویترین آماده همگام‌سازی اولیه است
        </h2>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          در حال حاضر هیچ محصولی در پایگاه داده ثبت نشده است. برای انتشار کاتالوگ، همگام‌سازی اولیه را از سمت سرور اجرا کنید.
        </p>
        <div
          className="mt-4 rounded-lg bg-slate-50 border border-slate-200 p-3 text-left text-xs font-mono text-slate-700 overflow-x-auto no-scrollbar"
          dir="ltr"
        >
          POST /api/sync/import-from-source
        </div>
        <div className="mt-5">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            <span>بررسی مجدد کاتالوگ</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white border border-slate-200 p-8 sm:p-10 text-center max-w-lg mx-auto">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-500">
        <SearchX className="w-6 h-6" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-base sm:text-lg font-bold text-slate-900">
        محصولی با این فیلترها پیدا نشد
      </h3>
      <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed">
        عبارت جستجو یا فیلترهای دسته‌بندی، برند و محدوده قیمت را تغییر دهید تا کالاهای بیشتری نمایش داده شوند.
      </p>
      <div className="mt-5">
        <button
          type="button"
          onClick={onResetFilters}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors cursor-pointer"
        >
          <span>پاک کردن فیلترها و نمایش همه</span>
        </button>
      </div>
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="rounded-xl bg-white border border-red-200 p-8 text-center max-w-lg mx-auto"
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
        <AlertTriangle className="w-6 h-6" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-base font-bold text-slate-900">خطا در دریافت اطلاعات فروشگاه</h3>
      <p className="mt-2 text-sm text-slate-600">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors cursor-pointer"
      >
        <RefreshCw className="w-4 h-4" aria-hidden="true" />
        <span>تلاش مجدد</span>
      </button>
    </div>
  );
}
