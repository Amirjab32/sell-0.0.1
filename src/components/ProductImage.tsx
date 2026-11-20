import { Cpu } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DEFAULT_PRODUCT_PLACEHOLDER_SVG, getProductImageUrl } from '../lib/image';

interface ProductImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  eager?: boolean;
}

export function ProductImage({ src, alt, className = '', eager = false }: ProductImageProps) {
  const resolved = getProductImageUrl(src);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [resolved]);

  if (hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 bg-slate-50 text-slate-400 p-4 rounded-lg ${className}`}
        role="img"
        aria-label={alt}
      >
        <Cpu className="w-9 h-9 text-emerald-600/60" aria-hidden="true" />
        <span className="text-xs text-slate-500 text-center line-clamp-2 max-w-[180px]">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={resolved}
      alt={alt}
      referrerPolicy="no-referrer"
      loading={eager ? 'eager' : 'lazy'}
      onError={(e) => {
        const img = e.currentTarget;
        if (img.src !== DEFAULT_PRODUCT_PLACEHOLDER_SVG) {
          img.src = DEFAULT_PRODUCT_PLACEHOLDER_SVG;
        } else {
          setHasError(true);
        }
      }}
      className={className}
    />
  );
}
