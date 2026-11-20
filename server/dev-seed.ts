import { ensureHeroBannersTable } from './banners';
import type { D1DatabaseLike } from './db-types';

interface SeedProduct {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  image_url: string;
  gallery_images_json: string;
  specs_json: string;
  description: string;
  price_toman: number;
  stock_status: 'in_stock' | 'out_of_stock' | 'call';
  warranty: string;
  is_featured: number;
  is_visible: number;
  source_url: string;
  reference_price_toman: number;
  margin_percent: number;
}

const DEV_SEED_PRODUCTS: SeedProduct[] = [
  {
    id: 'exo-gpu-4080s',
    slug: 'asus-rog-strix-rtx-4080-super-16gb',
    name: 'کارت گرافیک ایسوس ROG Strix RTX 4080 Super OC 16GB',
    brand: 'ASUS',
    category: 'قطعات اصلی کامپیوتر',
    image_url: '/images/gpu-card.svg',
    gallery_images_json: JSON.stringify(['/images/gpu-card.svg', '/images/gpu-card-angle.svg']),
    specs_json: JSON.stringify([
      { label: 'تراشه گرافیکی', value: 'NVIDIA GeForce RTX 4080 Super' },
      { label: 'حافظه ویدیویی', value: '16GB GDDR6X' },
      { label: 'رابط حافظه', value: '256-Bit' },
      { label: 'فرکانس بوست', value: '2670 MHz (OC Mode)' },
      { label: 'خروجی تصویر', value: '2x HDMI 2.1a / 3x DisplayPort 1.4a' },
      { label: 'پاور پیشنهادی', value: '850 وات ATX 3.0' },
    ]),
    description:
      'کارت گرافیک پرچم‌دار ایسوس از سری ROG Strix با سیستم خنک‌کننده سه‌گانه Axial-tech، محفظه بخار اختصاصی و مدار تغذیه تقویت‌شده برای اجرای بازی‌های 4K و رندرینگ حرفه‌ای بدون افت فرکانس.',
    price_toman: 98500000,
    stock_status: 'in_stock',
    warranty: '۳۶ ماه گارانتی الماس رایان ایرانیان',
    is_featured: 1,
    is_visible: 1,
    source_url: 'https://internal.example/items/4080s',
    reference_price_toman: 94000000,
    margin_percent: 4.8,
  },
  {
    id: 'exo-lap-rog-g16',
    slug: 'asus-rog-strix-g16-i9-rtx4070',
    name: 'لپ‌تاپ گیمینگ ایسوس ROG Strix G16 i9-14900HX / RTX 4070',
    brand: 'ASUS',
    category: 'لپ‌تاپ',
    image_url: '/images/gaming-laptop.svg',
    gallery_images_json: JSON.stringify(['/images/gaming-laptop.svg', '/images/gaming-laptop-side.svg']),
    specs_json: JSON.stringify([
      { label: 'پردازنده', value: 'Intel Core i9-14900HX (24 Cores)' },
      { label: 'کارت گرافیک', value: 'NVIDIA GeForce RTX 4070 8GB 140W' },
      { label: 'حافظه رم', value: '32GB DDR5-5600MHz' },
      { label: 'فضای ذخیره‌سازی', value: '1TB NVMe PCIe 4.0 SSD' },
      { label: 'نمایشگر', value: '16.0" QHD+ 240Hz IPS Nebula 100% DCI-P3' },
      { label: 'وزن', value: '2.5 کیلوگرم' },
    ]),
    description:
      'لپ‌تاپ تخصصی گیمینگ و رندرینگ مجهز به پردازنده نسل چهاردهم Intel Core i9 سری HX و نمایشگر ۲۴۰ هرتز Nebula با پوشش کامل فضای رنگی DCI-P3 و خنک‌کننده فلز مایع.',
    price_toman: 124900000,
    stock_status: 'in_stock',
    warranty: '۲۴ ماه گارانتی یکپارچه',
    is_featured: 1,
    is_visible: 1,
    source_url: 'https://internal.example/items/rog-g16',
    reference_price_toman: 119000000,
    margin_percent: 4.95,
  },
  {
    id: 'exo-mon-oled240',
    slug: 'lg-ultragear-27gs95qe-oled-240hz',
    name: 'مانیتور گیمینگ ال‌جی UltraGear 27GS95QE OLED 240Hz',
    brand: 'LG',
    category: 'مانیتور',
    image_url: '/images/gaming-monitor.svg',
    gallery_images_json: JSON.stringify(['/images/gaming-monitor.svg']),
    specs_json: JSON.stringify([
      { label: 'اندازه صفحه', value: '27 اینچ' },
      { label: 'نوع پنل', value: 'WOLED ضد انعکاس' },
      { label: 'رزولوشن', value: '2560 × 1440 (QHD)' },
      { label: 'نرخ نوسازی', value: '240 هرتز' },
      { label: 'زمان پاسخ‌گویی', value: '0.03 میلی‌ثانیه (GtG)' },
      { label: 'پورت‌ها', value: '2x HDMI 2.1 / 1x DisplayPort 1.4' },
    ]),
    description:
      'پنل OLED نسل جدید با کنتراست بی‌نهایت، زمان پاسخ‌گویی ۰.۰۳ میلی‌ثانیه و نرخ نوسازی ۲۴۰ هرتز مناسب رقابت‌های E-Sports و تجربه بصری HDR با دقت رنگ استودیویی.',
    price_toman: 56800000,
    stock_status: 'in_stock',
    warranty: '۱۸ ماه گارانتی مادیران',
    is_featured: 1,
    is_visible: 1,
    source_url: 'https://internal.example/items/lg-oled',
    reference_price_toman: 54000000,
    margin_percent: 5.1,
  },
  {
    id: 'exo-cpu-7800x3d',
    slug: 'amd-ryzen-7-7800x3d-tray',
    name: 'پردازنده ای‌ام‌دی Ryzen 7 7800X3D سوکت AM5',
    brand: 'AMD',
    category: 'قطعات اصلی کامپیوتر',
    image_url: '/images/cpu-chip.svg',
    gallery_images_json: JSON.stringify(['/images/cpu-chip.svg']),
    specs_json: JSON.stringify([
      { label: 'سوکت', value: 'AM5' },
      { label: 'تعداد هسته / رشته', value: '8 هسته / 16 رشته' },
      { label: 'حافظه کش L3', value: '96MB (3D V-Cache)' },
      { label: 'فرکانس پایه / بوست', value: '4.2 GHz / 5.0 GHz' },
      { label: 'توان حرارتی (TDP)', value: '120 وات' },
    ]),
    description:
      'محبوب‌ترین پردازنده گیمینگ جهان با فناوری 3D V-Cache و ۹۶ مگابایت کش L3 که بالاترین نرخ فریم پایدار را در بازی‌های رقابتی و سنگین ارائه می‌دهد.',
    price_toman: 26400000,
    stock_status: 'in_stock',
    warranty: '۱۲ ماه گارانتی تعویض',
    is_featured: 1,
    is_visible: 1,
    source_url: 'https://internal.example/items/7800x3d',
    reference_price_toman: 25100000,
    margin_percent: 5.1,
  },
  {
    id: 'exo-mb-z790',
    slug: 'msi-mag-z790-tomahawk-wifi-ddr5',
    name: 'مادربرد ام‌اس‌آی MAG Z790 TOMAHAWK MAX WIFI',
    brand: 'MSI',
    category: 'قطعات اصلی کامپیوتر',
    image_url: '/images/motherboard.svg',
    gallery_images_json: JSON.stringify(['/images/motherboard.svg']),
    specs_json: JSON.stringify([
      { label: 'چیپست', value: 'Intel Z790' },
      { label: 'پشتیبانی رم', value: '4x DDR5 تا فرکانس 7800+ MHz' },
      { label: 'اسلات M.2', value: '4x M.2 (1x PCIe 5.0)' },
      { label: 'شبکه بی‌سیم', value: 'Wi-Fi 7 + Bluetooth 5.4' },
      { label: 'شبکه سیمی', value: '2.5Gbps LAN' },
    ]),
    description:
      'مادربرد رده‌بالای MSI با طراحی تغذیه ۱۶+۱+۱ فاز، هیت‌سینک‌های آلومینیومی گسترده و پشتیبانی کامل از نسل چهاردهم پردازنده‌های اینتل و حافظه‌های PCIe 5.0.',
    price_toman: 19800000,
    stock_status: 'in_stock',
    warranty: '۳۶ ماه گارانتی گرین',
    is_featured: 0,
    is_visible: 1,
    source_url: 'https://internal.example/items/z790-tomahawk',
    reference_price_toman: 18900000,
    margin_percent: 4.7,
  },
  {
    id: 'exo-ssd-990pro',
    slug: 'samsung-990-pro-2tb-nvme-m2',
    name: 'حافظه اس‌اس‌دی سامسونگ 990 PRO 2TB NVMe M.2',
    brand: 'Samsung',
    category: 'حافظه و ارتقا',
    image_url: '/images/ssd-nvme.svg',
    gallery_images_json: JSON.stringify(['/images/ssd-nvme.svg']),
    specs_json: JSON.stringify([
      { label: 'ظرفیت', value: '2 ترابایت' },
      { label: 'رابط اتصال', value: 'PCIe 4.0 x4 NVMe 2.0' },
      { label: 'سرعت خواندن ترتیبی', value: '7450 مگابایت بر ثانیه' },
      { label: 'سرعت نوشتن ترتیبی', value: '6900 مگابایت بر ثانیه' },
      { label: 'فرم فاکتور', value: 'M.2 2280' },
    ]),
    description:
      'سریع‌ترین SSD PCIe 4.0 سامسونگ با کنترلر اختصاصی و بهره‌وری حرارتی بالا، مناسب بارگذاری آنی بازی‌ها، تدوین ویدیوهای 4K و کنسول PS5.',
    price_toman: 12950000,
    stock_status: 'in_stock',
    warranty: '۳۶ ماه گارانتی معتبر',
    is_featured: 0,
    is_visible: 1,
    source_url: 'https://internal.example/items/990pro-2tb',
    reference_price_toman: 12200000,
    margin_percent: 6.1,
  },
  {
    id: 'exo-ram-corsair-32',
    slug: 'corsair-dominator-titanium-32gb-ddr5-6000',
    name: 'رم کورسیر Dominator Titanium 32GB (2x16) DDR5 6000MHz',
    brand: 'Corsair',
    category: 'حافظه و ارتقا',
    image_url: '/images/ram-ddr5.svg',
    gallery_images_json: JSON.stringify(['/images/ram-ddr5.svg']),
    specs_json: JSON.stringify([
      { label: 'ظرفیت کل', value: '32 گیگابایت (2 ماژول 16GB)' },
      { label: 'نوع حافظه', value: 'DDR5' },
      { label: 'فرکانس', value: '6000 MT/s' },
      { label: 'تایمینگ', value: 'CL30-36-36-76' },
      { label: 'پروفایل اورکلاک', value: 'Intel XMP 3.0 & AMD EXPO' },
    ]),
    description:
      'کیت رم پرچم‌دار کورسیر با تاخیر پایین CL30، هیت‌سینک آلومینیومی فورج‌شده و پشتیبانی هم‌زمان از پروفایل‌های XMP و EXPO.',
    price_toman: 11400000,
    stock_status: 'in_stock',
    warranty: 'گارانتی مادام‌العمر آواژنگ',
    is_featured: 0,
    is_visible: 1,
    source_url: 'https://internal.example/items/dominator-32',
    reference_price_toman: 10800000,
    margin_percent: 5.5,
  },
  {
    id: 'exo-gear-gpx2',
    slug: 'logitech-g-pro-x-superlight-2-wireless',
    name: 'ماوس گیمینگ وایرلس لاجیتک G Pro X Superlight 2',
    brand: 'Logitech',
    category: 'تجهیزات گیمینگ',
    image_url: '/images/gaming-gear.svg',
    gallery_images_json: JSON.stringify(['/images/gaming-gear.svg']),
    specs_json: JSON.stringify([
      { label: 'وزن', value: '60 گرم' },
      { label: 'سنسور', value: 'HERO 2 (تا 32,000 DPI)' },
      { label: 'نرخ نمونه‌برداری', value: '4000Hz Wireless' },
      { label: 'سوئیچ‌ها', value: 'LIGHTFORCE Hybrid Optical-Mechanical' },
      { label: 'عمر باتری', value: 'تا 95 ساعت' },
    ]),
    description:
      'ماوس استاندارد مسابقات جهانی E-Sports با وزن ۶۰ گرم، سوئیچ‌های اپتیکال-مکانیکال بدون دبل‌کلیک و پورت شارژ USB-C.',
    price_toman: 8950000,
    stock_status: 'in_stock',
    warranty: '۲۴ ماه گارانتی اسپیرو',
    is_featured: 0,
    is_visible: 1,
    source_url: 'https://internal.example/items/gpx-superlight2',
    reference_price_toman: 8400000,
    margin_percent: 6.5,
  },
  {
    id: 'exo-gear-razer-kbd',
    slug: 'razer-huntsman-v3-pro-tkl',
    name: 'کیبورد مکانیکال ریزر Huntsman V3 Pro Tenkeyless',
    brand: 'Razer',
    category: 'تجهیزات گیمینگ',
    image_url: '/images/gaming-gear.svg',
    gallery_images_json: JSON.stringify(['/images/gaming-gear.svg']),
    specs_json: JSON.stringify([
      { label: 'سایز', value: 'TKL (بدون نام‌پد)' },
      { label: 'نوع سوئیچ', value: 'Razer Analog Optical Gen-2' },
      { label: 'قابلیت Rapid Trigger', value: 'بله (تنظیم 0.1 تا 4.0mm)' },
      { label: 'جنس بدنه', value: 'صفحه رویی آلومینیوم برس‌خورده' },
      { label: 'استراحت‌گاه مچ', value: 'مغناطیسی چرمی' },
    ]),
    description:
      'کیبورد رقابتی مجهز به سوئیچ‌های آنالوگ اپتیکال نسل دوم با قابلیت تنظیم نقطه تحریک و Rapid Trigger برای واکنش لحظه‌ای در بازی‌های FPS.',
    price_toman: 13200000,
    stock_status: 'call',
    warranty: '۱۸ ماه گارانتی پانا',
    is_featured: 0,
    is_visible: 1,
    source_url: 'https://internal.example/items/huntsman-v3',
    reference_price_toman: 12500000,
    margin_percent: 5.6,
  },
  {
    id: 'exo-lap-legion-pro5',
    slug: 'lenovo-legion-pro-5-r9-rtx4060',
    name: 'لپ‌تاپ گیمینگ لنوو Legion Pro 5 Ryzen 9 / RTX 4060',
    brand: 'Lenovo',
    category: 'لپ‌تاپ',
    image_url: '/images/gaming-laptop.svg',
    gallery_images_json: JSON.stringify(['/images/gaming-laptop.svg']),
    specs_json: JSON.stringify([
      { label: 'پردازنده', value: 'AMD Ryzen 9 7945HX' },
      { label: 'کارت گرافیک', value: 'NVIDIA GeForce RTX 4060 8GB 140W' },
      { label: 'حافظه رم', value: '16GB DDR5-5200' },
      { label: 'ذخیره‌سازی', value: '1TB NVMe Gen4' },
      { label: 'نمایشگر', value: '16" WQXGA 240Hz 500nits' },
    ]),
    description:
      'لپ‌تاپ محبوب سری Legion با شاسی مستحکم، کیبورد TrueStrike دقیق و سیستم خنک‌کننده ColdFront 5.0 برای کار مداوم و گیمینگ سنگین.',
    price_toman: 84500000,
    stock_status: 'call',
    warranty: '۲۴ ماه گارانتی سازگار',
    is_featured: 0,
    is_visible: 1,
    source_url: 'https://internal.example/items/legion-pro5',
    reference_price_toman: 80000000,
    margin_percent: 5.6,
  },
  {
    id: 'exo-acc-aio-corsair',
    slug: 'corsair-icue-h150i-elite-capellix-xt',
    name: 'خنک‌کننده مایع پردازنده کورسیر iCUE H150i ELITE CAPELLIX XT 360mm',
    brand: 'Corsair',
    category: 'لوازم جانبی',
    image_url: '/images/cooler-aio.svg',
    gallery_images_json: JSON.stringify(['/images/cooler-aio.svg']),
    specs_json: JSON.stringify([
      { label: 'ابعاد رادیاتور', value: '360 میلی‌متر' },
      { label: 'تعداد فن', value: '3 عدد AF120 RGB ELITE' },
      { label: 'پشتیبانی سوکت', value: 'Intel LGA 1700/1851 و AMD AM4/AM5' },
      { label: 'خمیر حرارتی', value: 'Corsair XTM70 از پیش اعمال‌شده' },
    ]),
    description:
      'واترکولر ۳۶۰ میلی‌متری قدرتمند برای خنک‌سازی پردازنده‌های رده‌بالا با پمپ کم‌صدا و فن‌های جریان متمرکز.',
    price_toman: 10900000,
    stock_status: 'in_stock',
    warranty: '۳۶ ماه گارانتی الماس',
    is_featured: 0,
    is_visible: 1,
    source_url: 'https://internal.example/items/h150i-xt',
    reference_price_toman: 10300000,
    margin_percent: 5.8,
  },
  {
    id: 'exo-mon-samsung-g8',
    slug: 'samsung-odyssey-g8-34-oled-curved',
    name: 'مانیتور خمیده سامسونگ Odyssey OLED G8 34 اینچ',
    brand: 'Samsung',
    category: 'مانیتور',
    image_url: '/images/gaming-monitor.svg',
    gallery_images_json: JSON.stringify(['/images/gaming-monitor.svg']),
    specs_json: JSON.stringify([
      { label: 'اندازه', value: '34 اینچ اولتراواید 21:9' },
      { label: 'پنل', value: 'QD-OLED خمیده (1800R)' },
      { label: 'رزولوشن', value: '3440 × 1440 (UWQHD)' },
      { label: 'نرخ نوسازی', value: '175 هرتز' },
    ]),
    description:
      'مانیتور اولتراواید QD-OLED با بدنه فلزی بسیار باریک، پوشش رنگی خیره‌کننده و پاسخ‌گویی آنی مناسب شبیه‌سازها و تدوین حرفه‌ای.',
    price_toman: 67500000,
    stock_status: 'out_of_stock',
    warranty: '۲۴ ماه گارانتی سام سرویس',
    is_featured: 0,
    is_visible: 1,
    source_url: 'https://internal.example/items/odyssey-g8',
    reference_price_toman: 64000000,
    margin_percent: 5.4,
  },
];

export async function seedDevDatabaseIfEmpty(db: D1DatabaseLike): Promise<void> {
  const countRow = await db.prepare('SELECT COUNT(*) AS count FROM products').first<{ count: number }>();
  if (Number(countRow?.count ?? 0) > 0) {
    return;
  }

  const now = new Date().toISOString();
  const statements = DEV_SEED_PRODUCTS.map((p) =>
    db
      .prepare(
        `INSERT INTO products (
          id, slug, name, brand, category, image_url, gallery_images_json, specs_json,
          description, price_toman, stock_status, warranty, is_featured, is_visible,
          updated_at, created_at, source_url, reference_price_toman, margin_percent, manual_price_lock
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
      )
      .bind(
        p.id,
        p.slug,
        p.name,
        p.brand,
        p.category,
        p.image_url,
        p.gallery_images_json,
        p.specs_json,
        p.description,
        p.price_toman,
        p.stock_status,
        p.warranty,
        p.is_featured,
        p.is_visible,
        now,
        now,
        p.source_url,
        p.reference_price_toman,
        p.margin_percent
      )
  );

  await db.batch(statements);

  await db
    .prepare(
      'INSERT INTO sync_logs (id, synced_at, source_count, upserted_count, deleted_count, status, message) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    .bind('dev-initial-seed', now, DEV_SEED_PRODUCTS.length, DEV_SEED_PRODUCTS.length, 0, 'success', 'Local dev seed')
    .run();
}

const DEV_SEED_BANNERS = [
  {
    id: 'banner-seed-gpu',
    title: 'کارت‌های گرافیک و قطعات اصلی کامپیوتر',
    image_url: '/images/banner-gpu.svg',
    target_type: 'category',
    target_value: 'قطعات اصلی کامپیوتر',
    sort_order: 0,
  },
  {
    id: 'banner-seed-laptop',
    title: 'لپ‌تاپ‌های گیمینگ و مهندسی',
    image_url: '/images/banner-laptop.svg',
    target_type: 'category',
    target_value: 'لپ‌تاپ',
    sort_order: 1,
  },
  {
    id: 'banner-seed-monitor',
    title: 'مانیتورهای OLED و گیمینگ',
    image_url: '/images/banner-monitor.svg',
    target_type: 'category',
    target_value: 'مانیتور',
    sort_order: 2,
  },
];

export async function seedDevBannersIfEmpty(db: D1DatabaseLike): Promise<void> {
  await ensureHeroBannersTable(db);
  const countRow = await db.prepare('SELECT COUNT(*) AS count FROM hero_banners').first<{ count: number }>();
  if (Number(countRow?.count ?? 0) > 0) {
    return;
  }

  const now = new Date().toISOString();
  const statements = DEV_SEED_BANNERS.map((b) =>
    db
      .prepare(
        `INSERT INTO hero_banners (
          id, title, image_url, target_type, target_value, sort_order, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`
      )
      .bind(b.id, b.title, b.image_url, b.target_type, b.target_value, b.sort_order, now, now)
  );

  await db.batch(statements);
}
