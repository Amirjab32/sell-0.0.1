import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  Edit3,
  Eye,
  EyeOff,
  ImagePlus,
  Link2,
  Lock,
  LogOut,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MEGA_MENU_CATEGORIES, STORE_CONTACT } from '../lib/categories';
import { toPersianDigits } from '../lib/format';
import type {
  AdminBanner,
  BannerTargetType,
  CatalogResponse,
  PublicProduct,
} from '../types/catalog';

const ADMIN_SESSION_STORAGE_KEY = 'exo_admin_sync_token';

interface AdminBannerManagerProps {
  onNavigateHome: () => void;
  onBannersChanged: () => void;
}

const TARGET_TYPE_OPTIONS: Array<{ value: BannerTargetType; label: string; hint: string }> = [
  { value: 'category', label: 'اتصال به تب دسته‌بندی سایت', hint: 'با کلیک روی بنر، تب دسته انتخابی باز می‌شود' },
  { value: 'brand', label: 'اتصال به فیلتر برند', hint: 'محصولات برند انتخابی را در کاتالوگ نمایش می‌دهد' },
  { value: 'product', label: 'اتصال به صفحه محصول مشخص', hint: 'خریدار را مستقیماً به صفحه آن کالا می‌برد' },
  { value: 'search', label: 'اتصال به نتیجه جستجوی خاص', hint: 'عبارت دلخواه را در کاتالوگ جستجو می‌کند' },
  { value: 'url', label: 'اتصال به هر صفحه یا مسیر دلخواه سایت', hint: 'یکی از صفحات آماده سایت را انتخاب کنید یا نشانی هر صفحه را بنویسید' },
  { value: 'none', label: 'فقط نمایش تصویر (بدون کلیک)', hint: 'بنر فقط نمایشی است و لینکی ندارد' },
];

const SITE_PAGE_PRESETS: Array<{ label: string; value: string }> = [
  { label: 'همه کالاهای موجود', value: '/?onlyAvailable=true' },
  { label: 'ارزان‌ترین محصولات', value: '/?sort=cheapest' },
  { label: 'جدیدترین محصولات', value: '/?sort=newest' },
  { label: 'مشاوره خرید و اسمبل', value: '/?action=consultation' },
  { label: 'صفحه اصلی فروشگاه', value: '/' },
];

function getTargetSummaryLabel(banner: AdminBanner): string {
  switch (banner.target_type) {
    case 'category':
      return banner.target_value ? `تب دسته: ${banner.target_value}` : 'دسته نامشخص';
    case 'brand':
      return banner.target_value ? `برند: ${banner.target_value}` : 'برند نامشخص';
    case 'product':
      return banner.target_value ? `محصول: ${banner.target_value}` : 'محصول نامشخص';
    case 'search':
      return banner.target_value ? `جستجو: «${banner.target_value}»` : 'جستجو نامشخص';
    case 'url':
      return banner.target_value ? `لینک: ${banner.target_value}` : 'لینک نامشخص';
    case 'none':
    default:
      return 'فقط نمایشی (بدون لینک)';
  }
}

/**
 * Optimizes uploaded raster images on an HTML canvas so banners upload fast and fit D1 safely.
 * SVGs and already-compact images are preserved cleanly.
 */
async function prepareBannerImageDataUrl(file: File): Promise<{ dataUrl: string; summary: string }> {
  const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');

  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('خواندن فایل تصویر ناموفق بود.'));
    reader.readAsDataURL(file);
  });

  if (isSvg) {
    if (rawDataUrl.length > 1_300_000) {
      throw new Error('حجم فایل برداری بیش از حد مجاز است.');
    }
    return {
      dataUrl: rawDataUrl,
      summary: `${Math.max(1, Math.round(file.size / 1024))} کیلوبایت`,
    };
  }

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('فایل انتخاب‌شده یک تصویر معتبر نیست.'));
    el.src = rawDataUrl;
  });

  const maxWidth = 1600;
  const maxHeight = 720;
  let targetW = img.naturalWidth || 1280;
  let targetH = img.naturalHeight || 360;

  if (targetW > maxWidth) {
    const ratio = maxWidth / targetW;
    targetW = maxWidth;
    targetH = Math.round(targetH * ratio);
  }
  if (targetH > maxHeight) {
    const ratio = maxHeight / targetH;
    targetH = maxHeight;
    targetW = Math.round(targetW * ratio);
  }

  // Keep already-small raster files untouched if under 380KB and within bounds
  if (rawDataUrl.length <= 520_000 && img.naturalWidth <= maxWidth && img.naturalHeight <= maxHeight) {
    return {
      dataUrl: rawDataUrl,
      summary: `${img.naturalWidth}×${img.naturalHeight} · ${Math.max(1, Math.round(file.size / 1024))} کیلوبایت`,
    };
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, targetW);
  canvas.height = Math.max(1, targetH);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return {
      dataUrl: rawDataUrl,
      summary: `${Math.max(1, Math.round(file.size / 1024))} کیلوبایت`,
    };
  }

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  let optimized = canvas.toDataURL('image/webp', 0.88);
  if (!optimized.startsWith('data:image/webp')) {
    optimized = canvas.toDataURL('image/jpeg', 0.88);
  }
  if (optimized.length > 1_250_000) {
    optimized = canvas.toDataURL('image/jpeg', 0.78);
  }
  if (optimized.length > 1_350_000) {
    throw new Error('حجم تصویر حتی پس از فشرده‌سازی زیاد است. لطفاً تصویر کم‌حجم‌تری انتخاب کنید.');
  }

  const approxKb = Math.max(1, Math.round((optimized.length * 0.75) / 1024));
  return {
    dataUrl: optimized,
    summary: `${canvas.width}×${canvas.height} · بهینه‌شده به ${approxKb} کیلوبایت`,
  };
}

export function AdminBannerManager({
  onNavigateHome,
  onBannersChanged,
}: AdminBannerManagerProps) {
  const [token, setToken] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return window.sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY) ?? '';
  });
  const [tokenInput, setTokenInput] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(() => Boolean(token));
  const [authError, setAuthError] = useState<string | null>(null);
  const [serverUnconfigured, setServerUnconfigured] = useState(false);

  // Banner list & catalog facets for no-code target selectors
  const [banners, setBanners] = useState<AdminBanner[]>([]);
  const [loadingBanners, setLoadingBanners] = useState(false);
  const [catalogFacets, setCatalogFacets] = useState<{
    categories: string[];
    brands: string[];
    products: PublicProduct[];
  }>({ categories: [], brands: [], products: [] });

  // Form states (Add / Edit)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [imageMode, setImageMode] = useState<'upload' | 'url'>('upload');
  const [imageUrl, setImageUrl] = useState('');
  const [imageInfo, setImageInfo] = useState('');
  const [targetType, setTargetType] = useState<BannerTargetType>('category');
  const [targetValue, setTargetValue] = useState<string>(MEGA_MENU_CATEGORIES[0]?.categoryFilter ?? '');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const categoryOptions = useMemo(() => {
    const merged = new Set<string>(MEGA_MENU_CATEGORIES.map((c) => c.categoryFilter));
    for (const cat of catalogFacets.categories) {
      merged.add(cat);
    }
    return Array.from(merged);
  }, [catalogFacets.categories]);

  const brandOptions = useMemo(() => {
    const merged = new Set<string>();
    for (const cat of MEGA_MENU_CATEGORIES) {
      for (const b of cat.brands) merged.add(b);
    }
    for (const b of catalogFacets.brands) merged.add(b);
    return Array.from(merged).sort();
  }, [catalogFacets.brands]);

  const verifyAndLoad = useCallback(async (candidateToken: string) => {
    const clean = candidateToken.trim();
    if (!clean) {
      setAuthChecking(false);
      setIsAuthenticated(false);
      return;
    }

    setAuthChecking(true);
    setAuthError(null);
    setServerUnconfigured(false);

    try {
      const verifyRes = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: {
          'X-Admin-Sync-Token': clean,
        },
      });

      if (verifyRes.status === 503) {
        setServerUnconfigured(true);
        setIsAuthenticated(false);
        setAuthError('کلید امنیتی مدیریت روی سرور تنظیم نشده است.');
        return;
      }

      if (!verifyRes.ok) {
        if (typeof window !== 'undefined') {
          window.sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
        }
        setToken('');
        setIsAuthenticated(false);
        setAuthError('کلید مدیریت نامعتبر است.');
        return;
      }

      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(ADMIN_SESSION_STORAGE_KEY, clean);
      }
      setToken(clean);
      setIsAuthenticated(true);
    } catch {
      setAuthError('خطا در برقراری ارتباط با سرور.');
      setIsAuthenticated(false);
    } finally {
      setAuthChecking(false);
    }
  }, []);

  const loadAdminData = useCallback(async (activeToken: string) => {
    setLoadingBanners(true);
    try {
      const [bannersRes, catalogRes] = await Promise.all([
        fetch('/api/admin/banners', {
          headers: { 'X-Admin-Sync-Token': activeToken },
        }),
        fetch('/api/catalog?limit=100&sort=in_stock_first'),
      ]);

      if (bannersRes.ok) {
        const bJson = (await bannersRes.json()) as { items: AdminBanner[] };
        setBanners(bJson.items);
      }

      if (catalogRes.ok) {
        const cJson = (await catalogRes.json()) as CatalogResponse;
        setCatalogFacets({
          categories: cJson.facets.categories.map((c) => c.name),
          brands: cJson.facets.brands.map((b) => b.name),
          products: cJson.items,
        });
      }
    } finally {
      setLoadingBanners(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      verifyAndLoad(token);
    } else {
      setAuthChecking(false);
    }
  }, [token, verifyAndLoad]);

  useEffect(() => {
    if (isAuthenticated && token) {
      loadAdminData(token);
    }
  }, [isAuthenticated, token, loadAdminData]);

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setImageMode('upload');
    setImageUrl('');
    setImageInfo('');
    setTargetType('category');
    setTargetValue(categoryOptions[0] ?? '');
    setIsActive(true);
    setFormError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFilePicked = async (file: File | null | undefined) => {
    if (!file) return;
    setFormError(null);
    setFormSuccess(null);
    try {
      const { dataUrl, summary } = await prepareBannerImageDataUrl(file);
      setImageUrl(dataUrl);
      setImageInfo(summary);
      if (!title.trim()) {
        const baseName = file.name.replace(/\.[^.]+$/, '');
        setTitle(baseName);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'خطا در آماده‌سازی تصویر.');
    }
  };

  const handleTargetTypeChange = (nextType: BannerTargetType) => {
    setTargetType(nextType);
    if (nextType === 'category') {
      setTargetValue(categoryOptions[0] ?? '');
    } else if (nextType === 'brand') {
      setTargetValue(brandOptions[0] ?? '');
    } else if (nextType === 'product') {
      setTargetValue(catalogFacets.products[0]?.slug ?? '');
    } else {
      setTargetValue('');
    }
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!imageUrl.trim()) {
      setFormError('لطفاً ابتدا یک تصویر بنر آپلود کنید یا آدرس آن را وارد نمایید.');
      return;
    }
    if (targetType !== 'none' && !targetValue.trim()) {
      setFormError('لطفاً مقصد اتصال بنر را انتخاب یا وارد کنید.');
      return;
    }

    setSaving(true);
    try {
      const endpoint = editingId
        ? `/api/admin/banners/${encodeURIComponent(editingId)}`
        : '/api/admin/banners';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Sync-Token': token,
        },
        body: JSON.stringify({
          title: title.trim(),
          image_url: imageUrl.trim(),
          target_type: targetType,
          target_value: targetType === 'none' ? '' : targetValue.trim(),
          is_active: isActive,
        }),
      });

      const json = (await res.json()) as { item?: AdminBanner; error?: string };
      if (!res.ok) {
        setFormError(json.error || 'خطا در ذخیره‌سازی بنر.');
        return;
      }

      setFormSuccess(editingId ? 'بنر با موفقیت ویرایش شد.' : 'بنر جدید با موفقیت اضافه شد.');
      resetForm();
      await loadAdminData(token);
      onBannersChanged();
    } catch {
      setFormError('خطا در ارتباط با سرور هنگام ذخیره بنر.');
    } finally {
      setSaving(false);
    }
  };

  const startEditBanner = (banner: AdminBanner) => {
    setEditingId(banner.id);
    setTitle(banner.title);
    setImageMode(banner.image_url.startsWith('/api/banners/image/') ? 'upload' : 'url');
    setImageUrl(banner.image_url);
    setImageInfo('تصویر فعلی بنر');
    setTargetType(banner.target_type);
    setTargetValue(banner.target_value);
    setIsActive(banner.is_active);
    setFormError(null);
    setFormSuccess(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleActive = async (banner: AdminBanner) => {
    try {
      const res = await fetch(`/api/admin/banners/${encodeURIComponent(banner.id)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Sync-Token': token,
        },
        body: JSON.stringify({ is_active: !banner.is_active }),
      });
      if (res.ok) {
        await loadAdminData(token);
        onBannersChanged();
      }
    } catch {
      // ignore transient error
    }
  };

  const handleDeleteBanner = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/banners/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'X-Admin-Sync-Token': token },
      });
      if (res.ok) {
        setConfirmDeleteId(null);
        if (editingId === id) {
          resetForm();
        }
        await loadAdminData(token);
        onBannersChanged();
      }
    } catch {
      // ignore transient error
    }
  };

  const handleMoveBanner = async (index: number, direction: -1 | 1) => {
    const nextIdx = index + direction;
    if (nextIdx < 0 || nextIdx >= banners.length) return;
    const reordered = [...banners];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(nextIdx, 0, moved);
    setBanners(reordered);

    try {
      const res = await fetch('/api/admin/banners/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Sync-Token': token,
        },
        body: JSON.stringify({ ids: reordered.map((b) => b.id) }),
      });
      if (res.ok) {
        const json = (await res.json()) as { items: AdminBanner[] };
        setBanners(json.items);
        onBannersChanged();
      }
    } catch {
      await loadAdminData(token);
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
    }
    setToken('');
    setTokenInput('');
    setIsAuthenticated(false);
    setBanners([]);
  };

  if (authChecking) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="rounded-2xl bg-white border border-zinc-200 p-8 space-y-3">
          <div className="mx-auto h-10 w-10 rounded-xl bg-zinc-100 animate-pulse" />
          <p className="text-sm text-zinc-600">در حال بررسی دسترسی مدیریت...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 sm:py-16">
        <div className="rounded-2xl bg-white border border-zinc-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="space-y-2 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-white">
              <Lock className="w-5 h-5 text-emerald-400" aria-hidden="true" />
            </div>
            <h1 className="text-lg font-extrabold text-zinc-900">
              پنل اختصاصی مدیریت بنرهای {STORE_CONTACT.brandName}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 leading-relaxed">
              این بخش فقط با کلید امنیتی مدیر باز می‌شود و خریداران به آن دسترسی ندارند.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              verifyAndLoad(tokenInput);
            }}
            className="space-y-4"
          >
            <div>
              <label htmlFor="admin-token-input" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                کلید امنیتی مدیریت
              </label>
              <input
                id="admin-token-input"
                type="password"
                autoComplete="current-password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="مقدار ADMIN_SYNC_TOKEN را وارد کنید"
                dir="ltr"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:border-emerald-600 focus:outline-none"
              />
            </div>

            {authError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700 leading-relaxed">
                {authError}
                {serverUnconfigured && (
                  <div className="mt-2 pt-2 border-t border-red-200/70 text-[11px] text-red-800" dir="ltr">
                    <code>ADMIN_SYNC_TOKEN=&quot;your-secret-key&quot;</code>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              ورود به مدیریت بنرها
            </button>
          </form>

          <div className="pt-4 border-t border-zinc-100 text-center">
            <button
              type="button"
              onClick={onNavigateHome}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
            >
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              <span>بازگشت به فروشگاه</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Top Admin Header */}
      <div className="rounded-2xl bg-white border border-zinc-200 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-base sm:text-lg font-extrabold text-zinc-900">
            مدیریت بنرهای اسلایدر صفحه اصلی
          </h1>
          <p className="text-xs text-zinc-500">
            بدون نیاز به کدنویسی عکس آپلود کنید و هر بنر را به تب دسته‌بندی، برند یا صفحه محصول وصل نمایید (تعویض خودکار هر ۵ ثانیه).
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onNavigateHome}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-xs font-semibold text-zinc-700 hover:bg-white hover:border-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
            <span>مشاهده فروشگاه</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-medium text-zinc-600 hover:border-red-300 hover:text-red-700 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            <span>خروج</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Right Column: Add / Edit Banner Form */}
        <section className="lg:col-span-5 rounded-2xl bg-white border border-zinc-200 p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              {editingId ? (
                <Edit3 className="w-4 h-4 text-emerald-600" aria-hidden="true" />
              ) : (
                <Plus className="w-4 h-4 text-emerald-600" aria-hidden="true" />
              )}
              <span>{editingId ? 'ویرایش بنر انتخابی' : 'افزودن بنر جدید'}</span>
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs font-medium text-zinc-500 hover:text-zinc-900 cursor-pointer"
              >
                انصراف
              </button>
            )}
          </div>

          <form onSubmit={handleSaveBanner} className="space-y-4">
            {/* Image Source Mode Switch */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-100">
              <button
                type="button"
                onClick={() => setImageMode('upload')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  imageMode === 'upload'
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                آپلود تصویر از سیستم
              </button>
              <button
                type="button"
                onClick={() => setImageMode('url')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  imageMode === 'url'
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                وارد کردن آدرس تصویر
              </button>
            </div>

            {imageMode === 'upload' ? (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/avif,image/svg+xml"
                  onChange={(e) => handleFilePicked(e.target.files?.[0])}
                  className="sr-only"
                  id="banner-file-upload"
                />
                <label
                  htmlFor="banner-file-upload"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleFilePicked(e.dataTransfer.files?.[0]);
                  }}
                  className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50 px-4 py-5 text-center hover:border-emerald-600 hover:bg-emerald-50/30 transition-colors cursor-pointer"
                >
                  <Upload className="w-6 h-6 text-emerald-600" aria-hidden="true" />
                  <div className="text-xs font-semibold text-zinc-800">
                    برای انتخاب فایل کلیک کنید یا تصویر را اینجا بکشید
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    ابعاد پیشنهادی: ۱۲۸۰×۳۶۰ پیکسل (فشرده‌سازی خودکار انجام می‌شود)
                  </div>
                </label>
                {imageInfo && (
                  <div className="mt-1.5 text-[11px] text-emerald-700 font-medium">{imageInfo}</div>
                )}
              </div>
            ) : (
              <div>
                <label htmlFor="banner-image-url" className="block text-xs font-semibold text-zinc-700 mb-1">
                  آدرس مستقیم تصویر
                </label>
                <input
                  id="banner-image-url"
                  type="text"
                  dir="ltr"
                  value={imageUrl}
                  onChange={(e) => {
                    setImageUrl(e.target.value);
                    setImageInfo('');
                  }}
                  placeholder="https://... یا /images/banner-gpu.svg"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs sm:text-sm text-zinc-900 focus:bg-white focus:border-emerald-600 focus:outline-none"
                />
              </div>
            )}

            {/* Live Wide Preview */}
            {imageUrl && (
              <div className="space-y-1.5">
                <div className="text-[11px] font-medium text-zinc-500">پیش‌نمایش اسلایدر:</div>
                <div className="relative aspect-[16/5] w-full rounded-xl overflow-hidden border border-zinc-200 bg-white">
                  <img
                    src={imageUrl}
                    alt={title || 'پیش‌نمایش بنر'}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-1.5 inset-x-0 flex justify-center gap-1">
                    <span className="h-1 w-5 rounded-full bg-emerald-600 ring-1 ring-white/80" />
                    <span className="h-1 w-3 rounded-full bg-zinc-900/30 ring-1 ring-white/60" />
                  </div>
                </div>
              </div>
            )}

            {/* Title / Alt */}
            <div>
              <label htmlFor="banner-title-input" className="block text-xs font-semibold text-zinc-700 mb-1">
                عنوان بنر (برای دسترسی‌پذیری و مدیریت)
              </label>
              <input
                id="banner-title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثلاً: جشنواره کارت‌های گرافیک RTX"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:border-emerald-600 focus:outline-none"
              />
            </div>

            {/* No-Code Tab/Link Connector */}
            <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-3.5 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-800">
                <Link2 className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                <span>اتصال بنر به تب یا بخش سایت</span>
              </div>

              <div>
                <label htmlFor="banner-target-type" className="block text-[11px] text-zinc-500 mb-1">
                  نوع مقصد
                </label>
                <select
                  id="banner-target-type"
                  value={targetType}
                  onChange={(e) => handleTargetTypeChange(e.target.value as BannerTargetType)}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs sm:text-sm text-zinc-900 focus:border-emerald-600 focus:outline-none"
                >
                  {TARGET_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-zinc-500">
                  {TARGET_TYPE_OPTIONS.find((o) => o.value === targetType)?.hint}
                </p>
              </div>

              {targetType === 'category' && (
                <div>
                  <label htmlFor="banner-target-category" className="block text-[11px] text-zinc-500 mb-1">
                    انتخاب تب دسته‌بندی
                  </label>
                  <select
                    id="banner-target-category"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs sm:text-sm text-zinc-900 focus:border-emerald-600 focus:outline-none"
                  >
                    {categoryOptions.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {targetType === 'brand' && (
                <div>
                  <label htmlFor="banner-target-brand" className="block text-[11px] text-zinc-500 mb-1">
                    انتخاب برند
                  </label>
                  <select
                    id="banner-target-brand"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs sm:text-sm text-zinc-900 focus:border-emerald-600 focus:outline-none"
                  >
                    {brandOptions.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {targetType === 'product' && (
                <div>
                  <label htmlFor="banner-target-product" className="block text-[11px] text-zinc-500 mb-1">
                    انتخاب محصول از کاتالوگ
                  </label>
                  {catalogFacets.products.length > 0 ? (
                    <select
                      id="banner-target-product"
                      value={targetValue}
                      onChange={(e) => setTargetValue(e.target.value)}
                      className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs sm:text-sm text-zinc-900 focus:border-emerald-600 focus:outline-none"
                    >
                      {catalogFacets.products.map((prod) => (
                        <option key={prod.id} value={prod.slug}>
                          {prod.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id="banner-target-product"
                      type="text"
                      dir="ltr"
                      value={targetValue}
                      onChange={(e) => setTargetValue(e.target.value)}
                      placeholder="اسلاگ محصول (مثلاً asus-rog-strix-rtx-4080-super-16gb)"
                      className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-emerald-600 focus:outline-none"
                    />
                  )}
                </div>
              )}

              {targetType === 'search' && (
                <div>
                  <label htmlFor="banner-target-search" className="block text-[11px] text-zinc-500 mb-1">
                    عبارت جستجو
                  </label>
                  <input
                    id="banner-target-search"
                    type="text"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    placeholder="مثلاً: کارت گرافیک یا OLED"
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs sm:text-sm text-zinc-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              )}

              {targetType === 'url' && (
                <div className="space-y-2.5">
                  <div>
                    <span className="block text-[11px] text-zinc-500 mb-1.5">
                      انتخاب سریع از صفحات سایت:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {SITE_PAGE_PRESETS.map((preset) => (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => setTargetValue(preset.value)}
                          className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                            targetValue === preset.value
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                              : 'border-zinc-200 bg-white text-zinc-700 hover:border-emerald-600 hover:text-emerald-700'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label htmlFor="banner-target-url" className="block text-[11px] text-zinc-500 mb-1">
                      مسیر صفحه سایت یا لینک دلخواه
                    </label>
                    <input
                      id="banner-target-url"
                      type="text"
                      dir="ltr"
                      value={targetValue}
                      onChange={(e) => setTargetValue(e.target.value)}
                      placeholder="/product/... یا /?onlyAvailable=true یا https://..."
                      className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs sm:text-sm text-zinc-900 focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-semibold text-zinc-800">نمایش در اسلایدر صفحه اصلی</span>
              <button
                type="button"
                role="switch"
                aria-checked={isActive}
                onClick={() => setIsActive((prev) => !prev)}
                className={`h-6 w-11 rounded-full p-0.5 transition-colors flex items-center cursor-pointer ${
                  isActive ? 'bg-emerald-600 justify-start' : 'bg-zinc-200 justify-end'
                }`}
              >
                <span className="h-5 w-5 rounded-full bg-white shadow-sm" />
              </button>
            </div>

            {formError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
                {formError}
              </div>
            )}

            {formSuccess && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-800 flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
                <span>{formSuccess}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {saving ? 'در حال ذخیره‌سازی...' : editingId ? 'ذخیره تغییرات بنر' : 'افزودن به اسلایدر'}
            </button>
          </form>
        </section>

        {/* Left Column: Current Banners List */}
        <section className="lg:col-span-7 rounded-2xl bg-white border border-zinc-200 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <h2 className="text-sm font-bold text-zinc-900">
              بنرهای ثبت‌شده ({toPersianDigits(banners.length)})
            </h2>
            <span className="text-xs text-zinc-500">ترتیب از بالا به پایین نمایش داده می‌شود</span>
          </div>

          {loadingBanners ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 rounded-xl bg-zinc-100 animate-pulse" />
              ))}
            </div>
          ) : banners.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-10 text-center space-y-2">
              <ImagePlus className="w-8 h-8 text-zinc-400 mx-auto" aria-hidden="true" />
              <div className="text-sm font-semibold text-zinc-800">هنوز بنری ثبت نشده است</div>
              <p className="text-xs text-zinc-500">
                از فرم سمت راست اولین بنر خود را آپلود کرده و به تب دلخواه وصل کنید.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {banners.map((banner, idx) => (
                <div
                  key={banner.id}
                  className={`rounded-xl border p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 transition-colors ${
                    banner.is_active
                      ? 'border-zinc-200 bg-white'
                      : 'border-zinc-200 bg-zinc-50/70 opacity-75'
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="w-full sm:w-44 aspect-[16/5] rounded-lg border border-zinc-200 bg-zinc-50 overflow-hidden shrink-0">
                    <img
                      src={banner.image_url}
                      alt={banner.title || 'بنر'}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Metadata */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <span className="font-semibold text-zinc-700 tabular-nums">
                        اسلاید {toPersianDigits(idx + 1)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className={banner.is_active ? 'text-emerald-700 font-medium' : 'text-zinc-500'}>
                        {banner.is_active ? 'فعال' : 'مخفی'}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-zinc-900 truncate">
                      {banner.title || 'بدون عنوان'}
                    </div>
                    <div className="text-xs text-zinc-500 truncate">
                      {getTargetSummaryLabel(banner)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 justify-end">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveBanner(idx, -1)}
                      aria-label="انتقال به بالا"
                      className="rounded-lg border border-zinc-200 p-1.5 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === banners.length - 1}
                      onClick={() => handleMoveBanner(idx, 1)}
                      aria-label="انتقال به پایین"
                      className="rounded-lg border border-zinc-200 p-1.5 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(banner)}
                      aria-label={banner.is_active ? 'مخفی کردن بنر' : 'فعال کردن بنر'}
                      title={banner.is_active ? 'مخفی کردن' : 'فعال کردن'}
                      className="rounded-lg border border-zinc-200 p-1.5 text-zinc-600 hover:bg-zinc-50 hover:text-emerald-700 cursor-pointer"
                    >
                      {banner.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => startEditBanner(banner)}
                      aria-label="ویرایش بنر"
                      title="ویرایش"
                      className="rounded-lg border border-zinc-200 p-1.5 text-zinc-600 hover:bg-zinc-50 hover:text-emerald-700 cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    {confirmDeleteId === banner.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDeleteBanner(banner.id)}
                          className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700 cursor-pointer"
                        >
                          تایید حذف
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded-lg border border-zinc-200 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50 cursor-pointer"
                        >
                          لغو
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(banner.id)}
                        aria-label="حذف بنر"
                        title="حذف"
                        className="rounded-lg border border-zinc-200 p-1.5 text-zinc-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
