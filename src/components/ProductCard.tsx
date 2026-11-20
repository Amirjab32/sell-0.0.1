import { CheckCircle2, PhoneCall, ShieldCheck, XCircle } from 'lucide-react';
import { formatTomanParts, getStockMeta } from '../lib/format';
import type { PublicProduct } from '../types/catalog';
import { ProductImage } from './ProductImage';

interface ProductCardProps {
  product: PublicProduct;
  onNavigateProduct: (slug: string) => void;
}

export function ProductCard({ product, onNavigateProduct }: ProductCardProps) {
  const stockMeta = getStockMeta(product.stock_status);
  const priceParts = formatTomanParts(product.price_toman);

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
        : 'text-slate-400';

  const shortStockLabel =
    product.stock_status === 'in_stock'
      ? 'موجود'
      : product.stock_status === 'call'
        ? 'استعلام قیمت'
        : stockMeta.label;

  return (
    <a
      href={`/product/${encodeURIComponent(product.slug)}`}
      onClick={(e) => {
        if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
          e.preventDefault();
          onNavigateProduct(product.slug);
        }
      }}
      data-testid="product-card"
      className="group flex flex-col h-full rounded-xl bg-white border border-slate-200 overflow-hidden hover:border-emerald-600/70 hover:shadow-md transition-[border-color,box-shadow] duration-150 focus-visible:outline-2 focus-visible:outline-emerald-600"
    >
      {/* Square Image Frame on Pure White */}
      <div className="aspect-square w-full bg-white p-4 border-b border-slate-100 flex items-center justify-center overflow-hidden">
        <ProductImage
          src={product.image_url}
          alt={product.name}
          className="h-full w-full object-contain"
        />
      </div>

      {/* Card Content */}
      <div className="flex flex-1 flex-col p-4">
        {/* Subtle Brand + Compact Stock Status */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-medium text-slate-500 truncate">
            {product.brand || product.category}
          </span>
          <span className={`inline-flex items-center gap-1 font-medium shrink-0 ${stockColorClass}`}>
            <StockIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{shortStockLabel}</span>
          </span>
        </div>

        {/* 2-Line Clamped Title with Full Hover Tooltip */}
        <h3
          dir="auto"
          title={product.name}
          className="mt-2 text-sm font-semibold text-slate-900 leading-6 line-clamp-2 min-h-[3rem] group-hover:text-emerald-700 transition-colors"
        >
          {product.name}
        </h3>

        {/* Single Short Warranty Line */}
        <div className="mt-2 min-h-[1.25rem] flex items-center gap-1.5 text-xs text-slate-500">
          {product.warranty ? (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
              <span className="truncate">{product.warranty}</span>
            </>
          ) : (
            <span className="truncate text-slate-400">{product.category}</span>
          )}
        </div>

        {/* Bottom-Aligned Toman Price */}
        <div className="mt-auto pt-3 mt-3 border-t border-slate-100 flex items-baseline justify-end gap-1">
          {product.stock_status === 'out_of_stock' ? (
            <span className="text-sm font-semibold text-slate-400">ناموجود</span>
          ) : product.stock_status === 'call' && product.price_toman <= 0 ? (
            <span className="text-sm font-semibold text-amber-700">تماس بگیرید</span>
          ) : (
            <div className="tabular-nums text-left">
              <span className="text-base sm:text-[17px] font-extrabold text-slate-900">
                {priceParts.value}
              </span>
              {priceParts.unit && (
                <span className="text-xs font-medium text-slate-500 mr-1">{priceParts.unit}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </a>
  );
}
