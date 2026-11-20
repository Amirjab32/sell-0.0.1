import { Check, Copy, MapPin, MessageCircle, Phone, Send, X } from 'lucide-react';
import { useState } from 'react';
import { STORE_CONTACT } from '../lib/categories';
import { formatToman, getStockMeta } from '../lib/format';
import type { PublicProduct } from '../types/catalog';

interface ConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConsultationModal({ isOpen, onClose }: ConsultationModalProps) {
  const [copiedPhone, setCopiedPhone] = useState(false);

  if (!isOpen) return null;

  const handleCopyPhone = async () => {
    try {
      await navigator.clipboard.writeText('02188941200');
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    } catch {
      setCopiedPhone(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 backdrop-blur-[1px] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="consult-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[90dvh] overflow-y-auto mini-scrollbar overscroll-contain rounded-2xl bg-white border border-zinc-200 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
          <h2 id="consult-modal-title" className="text-base sm:text-lg font-bold text-zinc-900">
            مشاوره خرید و تماس با کارشناسان
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن پنجره مشاوره"
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
            برای دریافت مشاوره تخصصی انتخاب قطعه، استعلام قیمت لحظه‌ای و اسمبل سیستم، با کارشناسان ما در ارتباط باشید.
          </p>

          <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs text-zinc-500">تلفن واحد فروش و مشاوره</div>
              <div className="mt-1 text-base sm:text-lg font-bold text-zinc-900 tabular-nums" dir="ltr">
                {STORE_CONTACT.phoneDisplay}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyPhone}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:border-zinc-300 transition-colors cursor-pointer"
              >
                {copiedPhone ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                <span>{copiedPhone ? 'کپی شد' : 'کپی'}</span>
              </button>
              <a
                href={STORE_CONTACT.phoneHref}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
              >
                <Phone className="w-4 h-4" />
                <span>تماس</span>
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <a
              href={STORE_CONTACT.telegramHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 hover:border-emerald-600 hover:text-emerald-700 transition-colors"
            >
              <Send className="w-4 h-4 text-emerald-600" />
              <span>تلگرام فروش</span>
            </a>
            <a
              href={STORE_CONTACT.whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 hover:border-emerald-600 hover:text-emerald-700 transition-colors"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>واتساپ فروش</span>
            </a>
          </div>

          <div className="pt-3 text-xs text-zinc-500 space-y-1.5 border-t border-zinc-100">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-zinc-400 shrink-0" />
              <span>{STORE_CONTACT.address}</span>
            </div>
            <div>ساعات پاسخ‌گویی: {STORE_CONTACT.hours}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface OrderInquiryModalProps {
  product: PublicProduct | null;
  onClose: () => void;
}

export function OrderInquiryModal({ product, onClose }: OrderInquiryModalProps) {
  const [copiedSummary, setCopiedSummary] = useState(false);

  if (!product) return null;

  const stockMeta = getStockMeta(product.stock_status);
  const priceText = formatToman(product.price_toman);
  const productUrl = typeof window !== 'undefined' ? window.location.href : '';
  const inquiryMessage = `سلام، جهت استعلام موجودی و ثبت سفارش کالای زیر پیام می‌دهم:\n${product.name}\nقیمت نمایش‌داده‌شده: ${priceText}\nلینک: ${productUrl}`;

  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(inquiryMessage);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
    } catch {
      setCopiedSummary(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 backdrop-blur-[1px] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-inquiry-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90dvh] overflow-y-auto mini-scrollbar overscroll-contain rounded-2xl bg-white border border-zinc-200 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
          <h2 id="order-inquiry-title" className="text-base sm:text-lg font-bold text-zinc-900">
            استعلام موجودی و ثبت سفارش
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن پنجره ثبت سفارش"
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-4 space-y-2">
            <div className="text-xs text-zinc-500">
              {product.brand ? `${product.brand} · ` : ''}
              {product.category}
            </div>
            <div dir="auto" className="text-sm font-semibold text-zinc-900 leading-relaxed">
              {product.name}
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-zinc-200/70 text-sm">
              <span className="text-zinc-500">{stockMeta.label}</span>
              <span className="font-bold text-emerald-700 tabular-nums">{priceText}</span>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
            برای تایید نهایی موجودی انبار و ثبت سفارش، پیام آماده شامل نام کالا را از طریق پیام‌رسان ارسال کنید یا مستقیماً با واحد فروش تماس بگیرید.
          </p>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <a
              href={`${STORE_CONTACT.whatsappHref}?text=${encodeURIComponent(inquiryMessage)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>ارسال پیام آماده در واتساپ</span>
            </a>
            <a
              href={`${STORE_CONTACT.telegramHref}?text=${encodeURIComponent(inquiryMessage)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 hover:border-emerald-600 hover:text-emerald-700 transition-colors"
            >
              <Send className="w-4 h-4 text-emerald-600" />
              <span>پیام در تلگرام</span>
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-100">
            <a
              href={STORE_CONTACT.phoneHref}
              className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-800 hover:text-emerald-700 transition-colors tabular-nums"
            >
              <Phone className="w-4 h-4 text-emerald-600" />
              <span>تماس مستقیم: {STORE_CONTACT.phoneDisplay}</span>
            </a>
            <button
              type="button"
              onClick={handleCopySummary}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-white hover:border-zinc-300 transition-colors cursor-pointer"
            >
              {copiedSummary ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              <span>{copiedSummary ? 'متن سفارش کپی شد' : 'کپی متن سفارش'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
