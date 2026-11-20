export interface MegaMenuCategory {
  id: string;
  label: string;
  categoryFilter: string;
  subcategories: Array<{ label: string; query: string }>;
  brands: string[];
}

export const MEGA_MENU_CATEGORIES: MegaMenuCategory[] = [
  {
    id: 'laptops',
    label: 'لپ‌تاپ',
    categoryFilter: 'لپ‌تاپ',
    subcategories: [
      { label: 'لپ‌تاپ گیمینگ حرفه‌ای', query: 'گیمینگ' },
      { label: 'لپ‌تاپ مهندسی و رندرینگ', query: 'RTX' },
      { label: 'لپ‌تاپ‌های سری ROG و Legion', query: 'ROG' },
    ],
    brands: ['ASUS', 'MSI', 'Lenovo'],
  },
  {
    id: 'monitors',
    label: 'مانیتور',
    categoryFilter: 'مانیتور',
    subcategories: [
      { label: 'مانیتور گیمینگ ۲۴۰Hz و بالاتر', query: '240Hz' },
      { label: 'مانیتور OLED و QHD', query: 'OLED' },
      { label: 'مانیتور ۴K و طراحی دقیق', query: '4K' },
    ],
    brands: ['ASUS', 'LG', 'Samsung', 'MSI'],
  },
  {
    id: 'core-parts',
    label: 'قطعات اصلی کامپیوتر',
    categoryFilter: 'قطعات اصلی کامپیوتر',
    subcategories: [
      { label: 'کارت گرافیک RTX و Radeon', query: 'کارت گرافیک' },
      { label: 'پردازنده Intel و Ryzen', query: 'پردازنده' },
      { label: 'مادربرد و منبع تغذیه', query: 'مادربرد' },
    ],
    brands: ['ASUS', 'MSI', 'AMD', 'Intel', 'Corsair'],
  },
  {
    id: 'gaming-gear',
    label: 'تجهیزات گیمینگ',
    categoryFilter: 'تجهیزات گیمینگ',
    subcategories: [
      { label: 'کیبورد مکانیکال گیمینگ', query: 'کیبورد' },
      { label: 'ماوس وایرلس سبک‌وزن', query: 'ماوس' },
      { label: 'هدست استودیویی و گیمینگ', query: 'هدست' },
    ],
    brands: ['Logitech', 'Razer', 'SteelSeries'],
  },
  {
    id: 'accessories',
    label: 'لوازم جانبی',
    categoryFilter: 'لوازم جانبی',
    subcategories: [
      { label: 'ماوس‌پد کنترلی و سرعتی', query: 'ماوس‌پد' },
      { label: 'خنک‌کننده و خمیر حرارتی', query: 'خنک‌کننده' },
      { label: 'پایه مانیتور و هاب USB-C', query: 'پایه' },
    ],
    brands: ['Corsair', 'Logitech', 'Cooler Master'],
  },
  {
    id: 'storage-upgrade',
    label: 'حافظه و ارتقا',
    categoryFilter: 'حافظه و ارتقا',
    subcategories: [
      { label: 'حافظه SSD NVMe پرسرعت', query: 'SSD' },
      { label: 'رم DDR5 گیمینگ', query: 'DDR5' },
      { label: 'کیت‌های ارتقای سیستم', query: 'رم' },
    ],
    brands: ['Samsung', 'Corsair', 'Kingston', 'WD'],
  },
];

export const STORE_CONTACT = {
  brandName: 'اگزو تک',
  phoneDisplay: '۰۲۱-۸۸۹۴۱۲۰۰',
  phoneHref: 'tel:+982188941200',
  telegramHref: 'https://t.me/exotech_support',
  whatsappHref: 'https://wa.me/989120000000',
  hours: 'شنبه تا پنج‌شنبه، ۱۰:۰۰ تا ۱۹:۰۰',
  address: 'تهران، خیابان ولیعصر، مجتمع فناوری نور، واحد ۳۰۴',
};
