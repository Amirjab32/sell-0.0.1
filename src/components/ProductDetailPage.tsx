import {
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Headset,
  PhoneCall,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatSyncTimestamp, formatTomanParts, getStockMeta } from '../lib/format';
import { getProductGallery } from '../lib/image';
import type { ProductDetailResponse, PublicProduct } from '../types/catalog';
import { ProductCard } from './ProductCard';
import { ProductImage } from './ProductImage';
import { ErrorState } from './States';

interface ProductDetailPageProps {
  slug: string;
  onNavigateHome: () => void;
  onNavigateCategory: (category: string) => void;
  onNavigateProduct: (slug: string) => void;
  onOpenOrderInquiry: (product: PublicProduct) => void;
}

export function ProductDetailPage({
  slug,
  onNavigateHome,
  onNavigateCategory,
  onNavigateProduct,
  onOpenOrderInquiry,
}: ProductDetailPageProps) {
  const [data, setData] = useState<ProductDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);

  const loadProduct = async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    setSelectedImageIdx(0);
    try {
      const res = await fetch(`/api/catalog/${encodeURIComponent(slug)}`);
      if (res.status === 404) {
        setNotFound(true);
        setData(null);
        return;
      }
      if (!res.ok) {
        throw new Error('امکان دریافت اطلاعات محصول وجود ندارد.');
      }
      const json = (await res.json()) as ProductDetailResponse;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطای غیرمنتظره در دریافت محصول');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    loadProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      setCopiedLink(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-6 animate-pulse">
        <div className="h-4 w-56 rounded bg-zinc-200" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 aspect-square rounded-xl bg-white border border-zinc-200" />
          <div className="lg:col-span-5 rounded-xl bg-white border border-zinc-200 p-6 space-y-4">
            <div className="h-4 w-32 rounded bg-zinc-200" />
            <div className="h-6 w-full rounded bg-zinc-200" />
            <div className="h-4 w-44 rounded bg-zinc-200" />
            <div className="h-24 w-full rounded bg-zinc-100 mt-4" />
          </div>
          <div className="lg:col-span-3 rounded-xl bg-white border border-zinc-200 p-6 space-y-4">
            <div className="h-4 w-24 rounded bg-zinc-200" />
            <div className="h-8 w-40 rounded bg-zinc-200" />
            <div className="h-11 w-full rounded-xl bg-zinc-200" />
          </div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-16 text-center">
        <div className="rounded-xl bg-white border border-zinc-200 p-10">
          <h1 className="text-xl font-bold text-zinc-900">محصول مورد نظر یافت نشد</h1>
          <p className="mt-2 text-sm text-zinc-500">
            ممکن است این کالا از ویترین فروشگاه خارج شده یا آدرس آن تغییر کرده باشد.
          </p>
          <button
            type="button"
            onClick={onNavigateHome}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
            <span>بازگشت به صفحه اصلی</span>
          </button>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
        <ErrorState message={error || 'خطا در بارگذاری محصول'} onRetry={loadProduct} />
      </div>
    );
  }

  const { item: product, related, lastSyncedAt } = data;
  const gallery = getProductGallery(product.image_url, product.gallery_images);
  const activeImage = gallery[selectedImageIdx] ?? gallery[0];
  const stockMeta = getStockMeta(product.stock_status);
  const priceParts = formatTomanParts(product.price_toman);
  const keyHighlights = product.specs.slice(0, 4);

  const StockIcon =
    product.stock_status === 'in_stock'
      ? CheckCircle2
      : product.stock_status === 'call'
        ? PhoneCall
        : XCircle;

  const stockColorClass =
    product.stock_status === 'in_stock'
      ? 'text-emerald-700'
      : product.stock_status === 'call'
        ? 'text-amber-700'
        : 'text-zinc-400';

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8 space-y-10">
      {/* Clear Breadcrumb */}
      <nav
        aria-label="مسیر صفحه"
        className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-zinc-500"
      >
        <button
          type="button"
          onClick={onNavigateHome}
          className="hover:text-emerald-700 transition-colors cursor-pointer"
        >
          صفحه اصلی
        </button>
        <span aria-hidden="true">/</span>
        <button
          type="button"
          onClick={() => onNavigateCategory(product.category)}
          className="hover:text-emerald-700 transition-colors cursor-pointer"
        >
          {product.category}
        </button>
        <span aria-hidden="true">/</span>
        <span dir="auto" className="text-zinc-800 font-medium truncate max-w-xs sm:max-w-lg">
          {product.name}
        </span>
      </nav>

      {/* Standard 3-Column Desktop Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Right Column: Image Gallery */}
        <div className="lg:col-span-4 space-y-3">
          <div className="aspect-square w-full rounded-xl bg-white border border-zinc-200 overflow-hidden flex items-center justify-center p-5">
            <ProductImage
              src={activeImage}
              alt={product.name}
              eager
              className="h-full w-full object-contain"
            />
          </div>

          {gallery.length > 1 && (
            <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-1">
              {gallery.map((imgUrl, idx) => (
                <button
                  key={`${imgUrl}-${idx}`}
                  type="button"
                  onClick={() => setSelectedImageIdx(idx)}
                  aria-label={`نمایش تصویر ${idx + 1} از ${product.name}`}
                  aria-current={idx === selectedImageIdx ? 'true' : undefined}
                  className={`h-16 w-16 shrink-0 rounded-lg bg-white border p-1.5 overflow-hidden transition-colors cursor-pointer ${
                    idx === selectedImageIdx
                      ? 'border-emerald-600 ring-1 ring-emerald-600'
                      : 'border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  <ProductImage
                    src={imgUrl}
                    alt={`${product.name} - نمای ${idx + 1}`}
                    className="h-full w-full object-contain"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Center Column: Title, Highlights, Specs Table & Description */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-xl bg-white border border-zinc-200 p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              {product.brand && (
                <>
                  <span className="font-semibold text-emerald-700">{product.brand}</span>
                  <span aria-hidden="true">·</span>
                </>
              )}
              <span>{product.category}</span>
            </div>

            <h1
              dir="auto"
              className="text-lg sm:text-xl font-extrabold text-zinc-900 leading-relaxed"
            >
              {product.name}
            </h1>

            {product.warranty && (
              <div className="pt-3 border-t border-zinc-100 flex items-center gap-2 text-xs sm:text-sm text-zinc-700">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
                <span>گارانتی: {product.warranty}</span>
              </div>
            )}

            {/* Key Highlights Summary */}
            {keyHighlights.length > 0 && (
              <div className="pt-3 border-t border-zinc-100 space-y-2.5">
                <h2 className="text-xs font-bold text-zinc-500">ویژگی‌های کلیدی</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {keyHighlights.map((spec, idx) => (
                    <div
                      key={`${spec.label}-${idx}`}
                      className="rounded-lg bg-zinc-50 border border-zinc-100 px-3 py-2 text-xs"
                    >
                      <div className="text-zinc-500 truncate">{spec.label}</div>
                      <div className="mt-0.5 font-semibold text-zinc-900 truncate tabular-nums">
                        {spec.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Zebra-Striped Technical Specifications Table */}
          <section className="rounded-xl bg-white border border-zinc-200 p-5 sm:p-6 space-y-4">
            <h2 className="text-base font-bold text-zinc-900 border-b border-zinc-100 pb-3">
              مشخصات فنی
            </h2>
            {product.specs.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-zinc-200">
                <table className="w-full text-xs sm:text-sm text-right">
                  <tbody className="divide-y divide-zinc-100">
                    {product.specs.map((spec, idx) => (
                      <tr
                        key={`${spec.label}-${idx}`}
                        className={idx % 2 === 0 ? 'bg-zinc-50/80' : 'bg-white'}
                      >
                        <th
                          scope="row"
                          className="w-2/5 px-3.5 py-2.5 font-medium text-zinc-500 align-top"
                        >
                          {spec.label}
                        </th>
                        <td className="px-3.5 py-2.5 font-medium text-zinc-900 tabular-nums">
                          {spec.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-zinc-500">
                مشخصات فنی تفصیلی برای این کالا ثبت نشده است. برای اطلاعات بیشتر با مشاوران فروش تماس بگیرید.
              </p>
            )}
          </section>

          {/* Product Description */}
          {product.description && (
            <section className="rounded-xl bg-white border border-zinc-200 p-5 sm:p-6 space-y-3">
              <h2 className="text-base font-bold text-zinc-900 border-b border-zinc-100 pb-3">
                معرفی و توضیحات محصول
              </h2>
              <p className="text-xs sm:text-sm text-zinc-600 leading-7 whitespace-pre-line">
                {product.description}
              </p>
            </section>
          )}
        </div>

        {/* Left Sticky Column: Price, CTA, Copy Link & 3 Trust Points */}
        <aside className="lg:col-span-3 lg:sticky lg:top-20">
          <div className="rounded-xl bg-white border border-zinc-200 p-5 space-y-4">
            <div className={`flex items-center gap-2 text-sm font-semibold ${stockColorClass}`}>
              <StockIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{stockMeta.label}</span>
            </div>

            <div className="pt-3 border-t border-zinc-100 space-y-1">
              <div className="text-xs text-zinc-500">قیمت فروش</div>
              {product.stock_status === 'out_of_stock' ? (
                <div className="text-xl font-bold text-zinc-400">ناموجود</div>
              ) : (
                <div className="tabular-nums">
                  <span className="text-2xl font-extrabold text-zinc-900">{priceParts.value}</span>
                  {priceParts.unit && (
                    <span className="text-xs font-medium text-zinc-500 mr-1.5">
                      {priceParts.unit}
                    </span>
                  )}
                </div>
              )}
              {lastSyncedAt && (
                <div className="text-[11px] text-zinc-400 pt-0.5 tabular-nums">
                  به‌روزرسانی: {formatSyncTimestamp(lastSyncedAt)}
                </div>
              )}
            </div>

            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={() => onOpenOrderInquiry(product)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition-colors cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" aria-hidden="true" />
                <span>استعلام موجودی و ثبت سفارش</span>
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-xs sm:text-sm font-medium text-zinc-700 hover:border-emerald-600 hover:text-emerald-700 hover:bg-white transition-colors cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                    <span className="text-emerald-700">لینک محصول کپی شد</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" aria-hidden="true" />
                    <span>کپی لینک محصول</span>
                  </>
                )}
              </button>
            </div>

            {/* 3 Concise Trust Points */}
            <div className="pt-3 border-t border-zinc-100 space-y-2.5 text-xs text-zinc-600">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
                <span>تضمین اصالت و سلامت کالا</span>
              </div>
              <div className="flex items-center gap-2">
                <Headset className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
                <span>مشاوره تخصصی انتخاب قطعه</span>
              </div>
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
                <span>به‌روزرسانی هفتگی قیمت و موجودی</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Related In-Category Products */}
      {related.length > 0 && (
        <section className="space-y-4 pt-6 border-t border-zinc-200">
          <h2 className="text-base sm:text-lg font-bold text-zinc-900">
            محصولات مرتبط در {product.category}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {related.map((rel) => (
              <ProductCard
                key={rel.id}
                product={rel}
                onNavigateProduct={onNavigateProduct}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
