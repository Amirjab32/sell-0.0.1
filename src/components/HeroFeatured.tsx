import { ArrowDownLeft, CheckCircle2, Phone, PhoneCall, ShieldCheck, XCircle } from 'lucide-react';
import { formatTomanParts, getStockMeta } from '../lib/format';
import type { PublicProduct } from '../types/catalog';
import { ProductImage } from './ProductImage';

interface HeroFeaturedProps {
  featuredProducts: PublicProduct[];
  onBrowseCatalog: () => void;
  onOpenConsultation: () => void;
  onNavigateProduct: (slug: string) => void;
}

export function HeroFeatured({
  featuredProducts,
  onBrowseCatalog,
  onOpenConsultation,
  onNavigateProduct,
}: HeroFeaturedProps) {
  const spotlight = featuredProducts[0] ?? null;

  const renderSpotlight = (product: PublicProduct) => {
    const stockMeta = getStockMeta(product.stock_status);
    const priceParts = formatTomanParts(product.price_toman);

    const StockIcon =
      product.stock_status === 'in_stock'
        ? CheckCircle2
        : product.stock_status === 'call'
          ? PhoneCall
          : XCircle;

    const stockColor =
      product.stock_status === 'in_stock'
        ? 'text-emerald-700'
        : product.stock_status === 'call'
          ? 'text-amber-700'
          : 'text-slate-400';

    return (
      <a
        href={`/product/${encodeURIComponent(product.slug)}`}
        onClick={(e) => {
          if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
            e.preventDefault();
            onNavigateProduct(product.slug);
          }
        }}
        data-testid="featured-card"
        className="group lg:col-span-5 rounded-xl bg-white border border-slate-200 p-4 sm:p-5 flex items-center gap-4 hover:border-emerald-600/60 hover:shadow-sm transition-[border-color,box-shadow] duration-150"
      >
        <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded-lg bg-white border border-slate-100 p-2 flex items-center justify-center overflow-hidden">
          <ProductImage
            src={product.image_url}
            alt={product.name}
            eager
            className="w-full h-full object-contain"
          />
        </div>

        <div className="flex-1 min-w-0 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
            <span className="font-semibold text-emerald-700">کالای منتخب ویترین</span>
            <span className={`inline-flex items-center gap-1 font-medium ${stockColor}`}>
              <StockIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{stockMeta.label}</span>
            </span>
          </div>

          <h2
            dir="auto"
            title={product.name}
            className="text-sm sm:text-[15px] font-semibold text-slate-900 leading-snug line-clamp-2 group-hover:text-emerald-700 transition-colors"
          >
            {product.name}
          </h2>

          <div className="flex items-baseline justify-between gap-2 pt-1.5 border-t border-slate-100">
            <div className="tabular-nums">
              {product.stock_status === 'out_of_stock' ? (
                <span className="text-sm font-semibold text-slate-400">ناموجود</span>
              ) : (
                <>
                  <span className="text-base font-extrabold text-slate-900">{priceParts.value}</span>
                  {priceParts.unit && (
                    <span className="text-xs font-medium text-slate-500 mr-1">
                      {priceParts.unit}
                    </span>
                  )}
                </>
              )}
            </div>
            <span className="text-xs font-medium text-emerald-700 whitespace-nowrap shrink-0">
              مشاهده ←
            </span>
          </div>
        </div>
      </a>
    );
  };

  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
      {/* Compact Intro Strip */}
      <div
        className={`${
          spotlight ? 'lg:col-span-7' : 'lg:col-span-12'
        } rounded-xl bg-white border border-slate-200 px-5 py-4 sm:px-6 sm:py-5 flex flex-col justify-between gap-3`}
      >
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span className="font-semibold text-emerald-700">فروشگاه تخصصی سخت‌افزار اگزو تک</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
              ضمانت اصالت و گارانتی معتبر
            </span>
          </div>
          <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 leading-snug [text-wrap:balance]">
            تامین تخصصی قطعات کامپیوتر، لپ‌تاپ و تجهیزات گیمینگ با قیمت به‌روز
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={onBrowseCatalog}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-emerald-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <span>مشاهده کاتالوگ</span>
            <ArrowDownLeft className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onOpenConsultation}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:border-emerald-600 hover:text-emerald-700 hover:bg-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Phone className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
            <span>مشاوره خرید و اسمبل</span>
          </button>
        </div>
      </div>

      {/* Single Featured Spotlight Card */}
      {spotlight && renderSpotlight(spotlight)}
    </section>
  );
}
