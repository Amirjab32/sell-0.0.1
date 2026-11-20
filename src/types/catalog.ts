export type StockStatus = 'in_stock' | 'out_of_stock' | 'call';

export type CatalogSort = 'in_stock_first' | 'cheapest' | 'expensive' | 'newest';

export interface ProductSpec {
  label: string;
  value: string;
}

export interface PublicProduct {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  image_url: string;
  gallery_images: string[];
  specs: ProductSpec[];
  description: string;
  price_toman: number;
  stock_status: StockStatus;
  warranty: string;
  is_featured: boolean;
  updated_at: string;
  created_at: string;
}

export interface CatalogFacet {
  name: string;
  count: number;
}

export interface CatalogResponse {
  items: PublicProduct[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  facets: {
    categories: CatalogFacet[];
    brands: CatalogFacet[];
    minPrice: number;
    maxPrice: number;
  };
  totalCatalogCount: number;
  lastSyncedAt: string | null;
  environment: string;
}

export interface ProductDetailResponse {
  item: PublicProduct;
  related: PublicProduct[];
  lastSyncedAt: string | null;
}

export interface HealthResponse {
  ok: boolean;
  availableCount: number;
  totalVisibleCount: number;
  lastSyncedAt: string | null;
  environment: string;
}

export type BannerTargetType = 'none' | 'category' | 'brand' | 'search' | 'product' | 'url';

export interface PublicBanner {
  id: string;
  title: string;
  image_url: string;
  target_type: BannerTargetType;
  target_value: string;
  sort_order: number;
}

export interface AdminBanner extends PublicBanner {
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
