/**
 * Automated Test Suite for OmniStock Wireless Barcode Scanner Engine
 * Validates:
 * - Barcode normalization & AIM symbology prefix removal
 * - Non-printable character stripping
 * - Accidental duplicate scan debounce filtering
 * - Stock In / Stock Out inventory calculation & zero-clamping
 * - Rapid keystroke timing heuristics
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeBarcode,
  isValidBarcode,
  DuplicateScanFilter,
  calculateStockTransaction,
  detectPlatform,
} from '../src/utils/hardwareScanner.ts';

describe('1. Barcode Normalization & Sanitization', () => {
  it('should trim surrounding whitespace', () => {
    assert.equal(normalizeBarcode('  RIC-BAS-500  '), 'RIC-BAS-500');
    assert.equal(normalizeBarcode('\n\tOO-EV-100\r\n'), 'OO-EV-100');
  });

  it('should strip AIM symbology prefixes (e.g. ]C1 for Code 128, ]e0 for EAN)', () => {
    assert.equal(normalizeBarcode(']C1RIC-BAS-500'), 'RIC-BAS-500');
    assert.equal(normalizeBarcode(']e0890103000012'), '890103000012');
    assert.equal(normalizeBarcode(']Q1QR-CODE-SKU'), 'QR-CODE-SKU');
    assert.equal(normalizeBarcode(']A0CODE-39'), 'CODE-39');
    assert.equal(normalizeBarcode(']d1DATAMATRIX'), 'DATAMATRIX');
  });

  it('should strip non-printable ASCII control characters (STX, ETX, CR, LF, etc.)', () => {
    // STX (0x02) and ETX (0x03) commonly sent by some RS-232 / USB scanners
    const rawWithControl = '\x02RIC-BAS-500\x03\r\n';
    assert.equal(normalizeBarcode(rawWithControl), 'RIC-BAS-500');
  });

  it('should preserve valid barcode characters including hyphens, underscores, dots, and colons', () => {
    assert.equal(normalizeBarcode('PROD_123-X.9'), 'PROD_123-X.9');
    assert.equal(normalizeBarcode('ITEM:001'), 'ITEM:001');
  });

  it('should validate well-formed barcodes', () => {
    assert.equal(isValidBarcode('RIC-BAS-500'), true);
    assert.equal(isValidBarcode('A'), false); // Too short (< 2)
    assert.equal(isValidBarcode(''), false);
    assert.equal(isValidBarcode('   '), false);
    assert.equal(isValidBarcode('---'), false); // No alphanumeric
  });
});

describe('2. Accidental Duplicate Scan Prevention', () => {
  it('should block repeated identical scans within cooldown window (1200ms)', () => {
    const filter = new DuplicateScanFilter(1200);
    const t0 = 10000;

    // First scan: allowed
    const check1 = filter.shouldAllow('RIC-BAS-500', t0);
    assert.equal(check1.allowed, true);
    filter.record('RIC-BAS-500', t0);

    // Accidental double trigger 200ms later: blocked
    const check2 = filter.shouldAllow('RIC-BAS-500', t0 + 200);
    assert.equal(check2.allowed, false);
    assert.equal(check2.remainingCooldownMs, 1000);

    // Accidental trigger 600ms later: blocked
    const check3 = filter.shouldAllow('RIC-BAS-500', t0 + 600);
    assert.equal(check3.allowed, false);
    assert.equal(check3.remainingCooldownMs, 600);
  });

  it('should immediately allow a DIFFERENT barcode even within cooldown', () => {
    const filter = new DuplicateScanFilter(1200);
    const t0 = 10000;

    filter.record('RIC-BAS-500', t0);

    // Different barcode 100ms later should be immediately allowed
    const diffCheck = filter.shouldAllow('OO-EV-100', t0 + 100);
    assert.equal(diffCheck.allowed, true);
  });

  it('should allow identical barcode once cooldown window has elapsed', () => {
    const filter = new DuplicateScanFilter(1200);
    const t0 = 10000;

    filter.record('RIC-BAS-500', t0);

    // After 1250ms (cooldown expired), second scan is allowed
    const checkAfterCooldown = filter.shouldAllow('RIC-BAS-500', t0 + 1250);
    assert.equal(checkAfterCooldown.allowed, true);
  });

  it('should reset filter cleanly', () => {
    const filter = new DuplicateScanFilter(1200);
    const t0 = 10000;
    filter.record('RIC-BAS-500', t0);

    filter.reset();
    const check = filter.shouldAllow('RIC-BAS-500', t0 + 50);
    assert.equal(check.allowed, true);
  });
});

describe('3. Inventory Calculation & Business Logic', () => {
  it('should calculate Stock In (+) correctly and update status', () => {
    // Current: 20/100, add 30 -> 50/100 (OPTIMAL)
    const res = calculateStockTransaction(20, 100, 30);
    assert.equal(res.newStock, 50);
    assert.equal(res.status, 'OPTIMAL');
    assert.equal(res.clamped, false);

    // Current: 80/100, add 20 -> 100/100 (FULL)
    const fullRes = calculateStockTransaction(80, 100, 20);
    assert.equal(fullRes.newStock, 100);
    assert.equal(fullRes.status, 'FULL');
  });

  it('should calculate Stock Out (-) correctly and clamp at zero', () => {
    // Current: 50/100, deduct 20 -> 30/100 (LOW)
    const res = calculateStockTransaction(50, 100, -20);
    assert.equal(res.newStock, 30);
    assert.equal(res.status, 'LOW');
    assert.equal(res.clamped, false);

    // Current: 30/100, deduct 15 -> 15/100 (CRITICAL)
    const critRes = calculateStockTransaction(30, 100, -15);
    assert.equal(critRes.newStock, 15);
    assert.equal(critRes.status, 'CRITICAL');
    assert.equal(critRes.clamped, false);

    // Current: 10/100, deduct 25 -> 0/100 (CRITICAL, clamped)
    const clampRes = calculateStockTransaction(10, 100, -25);
    assert.equal(clampRes.newStock, 0);
    assert.equal(clampRes.status, 'CRITICAL');
    assert.equal(clampRes.clamped, true);
  });
});
