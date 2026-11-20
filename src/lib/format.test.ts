import assert from 'node:assert/strict';
import test from 'node:test';
import { formatToman, getStockMeta, toPersianDigits } from './format';
import { DEFAULT_PRODUCT_PLACEHOLDER_SVG, getProductGallery, getProductImageUrl } from './image';

test('toPersianDigits converts Latin digits to Persian numerals', () => {
  assert.equal(toPersianDigits('98,500,000'), '۹۸,۵۰۰,۰۰۰');
  assert.equal(toPersianDigits(1403), '۱۴۰۳');
});

test('formatToman formats positive amounts with Persian digits and separators', () => {
  assert.equal(formatToman(98500000), '۹۸,۵۰۰,۰۰۰ تومان');
  assert.equal(formatToman(0), 'تماس بگیرید');
  assert.equal(formatToman(-100), 'تماس بگیرید');
});

test('getStockMeta returns Persian labels for all stock statuses', () => {
  assert.equal(getStockMeta('in_stock').label, 'موجود در انبار');
  assert.equal(getStockMeta('call').label, 'استعلام قیمت و موجودی');
  assert.equal(getStockMeta('out_of_stock').label, 'ناموجود');
});

test('getProductImageUrl normalizes valid paths and falls back cleanly', () => {
  assert.equal(getProductImageUrl('https://cdn.example.com/gpu.jpg'), 'https://cdn.example.com/gpu.jpg');
  assert.equal(getProductImageUrl('/images/gpu-card.svg'), '/images/gpu-card.svg');
  assert.equal(getProductImageUrl(''), DEFAULT_PRODUCT_PLACEHOLDER_SVG);
  assert.equal(getProductImageUrl('javascript:alert(1)'), DEFAULT_PRODUCT_PLACEHOLDER_SVG);
});

test('getProductGallery deduplicates primary and gallery images', () => {
  const gallery = getProductGallery('/images/a.svg', ['/images/a.svg', '/images/b.svg', '']);
  assert.deepEqual(gallery, ['/images/a.svg', '/images/b.svg']);

  const fallbackGallery = getProductGallery('', []);
  assert.deepEqual(fallbackGallery, [DEFAULT_PRODUCT_PLACEHOLDER_SVG]);
});
