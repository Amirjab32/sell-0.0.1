import { Clock, MapPin, Phone } from 'lucide-react';
import { MEGA_MENU_CATEGORIES, STORE_CONTACT } from '../lib/categories';
import { formatSyncTimestamp } from '../lib/format';

interface FooterProps {
  lastSyncedAt: string | null;
  onSelectCategory: (category: string) => void;
  onOpenConsultation: () => void;
}

export function Footer({ lastSyncedAt, onSelectCategory, onOpenConsultation }: FooterProps) {
  return (
    <footer className="mt-16 bg-zinc-900 text-zinc-300 border-t border-zinc-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-10">
        <div className="space-y-3">
          <div className="flex items-center gap-2.5 text-lg font-extrabold text-white">
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
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-sm">
            فروشگاه تخصصی سخت‌افزار، لپ‌تاپ‌های گیمینگ و مهندسی، مانیتورهای حرفه‌ای و تجهیزات جانبی با گارانتی معتبر و قیمت‌های به‌روز.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-bold text-white mb-3">دسته‌بندی‌های اصلی</h3>
          <ul className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
            {MEGA_MENU_CATEGORIES.map((cat) => (
              <li key={cat.id}>
                <button
                  type="button"
                  onClick={() => onSelectCategory(cat.categoryFilter)}
                  className="text-zinc-400 hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  {cat.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white">ارتباط و مشاوره</h3>
          <div className="space-y-2.5 text-xs sm:text-sm text-zinc-400">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
              <button
                type="button"
                onClick={onOpenConsultation}
                className="hover:text-emerald-400 transition-colors tabular-nums cursor-pointer"
              >
                {STORE_CONTACT.phoneDisplay}
              </button>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{STORE_CONTACT.address}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-zinc-800 bg-zinc-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
            <span>آخرین همگام‌سازی قیمت‌ها:</span>
            <span className="text-zinc-200 font-medium tabular-nums">
              {formatSyncTimestamp(lastSyncedAt)}
            </span>
          </div>
          <div>تمامی حقوق برای فروشگاه تخصصی {STORE_CONTACT.brandName} محفوظ است.</div>
        </div>
      </div>
    </footer>
  );
}
