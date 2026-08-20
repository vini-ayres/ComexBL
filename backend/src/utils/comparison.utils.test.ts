import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildCargoCampoKey,
  compactCargoKeyToken,
  normalizeComparedFieldValue,
  valuesDiverge,
} from './comparison.utils.js';

describe('compactCargoKeyToken', () => {
  it('keeps short stable keys', () => {
    assert.equal(compactCargoKeyToken('cargo:id:82'), 'cargo:id:82');
    assert.equal(compactCargoKeyToken('hazmat:3|3077'), 'hazmat:3|3077');
  });

  it('hashes long cargo descriptions so field suffixes stay unique under 50 chars', () => {
    const logicalKey = 'cargo:||LASER TUBE CUTTING MACHINE LX K12-5';
    const token = compactCargoKeyToken(logicalKey);
    const prefix = 'house.SHYY26013542.';

    const brand = buildCargoCampoKey(prefix, logicalKey, 'Brand');
    const packaging = buildCargoCampoKey(prefix, logicalKey, 'Packaging');

    assert.match(token, /^h[0-9a-f]{8}$/);
    assert.notEqual(brand, packaging);
    assert.ok(brand.length <= 50, brand);
    assert.ok(packaging.length <= 50, packaging);
    assert.equal(brand.slice(0, 50), brand);
    assert.notEqual(brand.slice(0, 50), packaging.slice(0, 50));
  });
});

describe('normalizeComparedFieldValue / freight term', () => {
  it('maps P/C to PREPAID/COLLECT so BL Final and GlobalSys conferem', () => {
    assert.equal(normalizeComparedFieldValue('freightTerm', 'P'), 'PREPAID');
    assert.equal(normalizeComparedFieldValue('freightTerm', 'C'), 'COLLECT');
    assert.equal(normalizeComparedFieldValue('house.H1.freightTerm', 'prepaid'), 'PREPAID');
    assert.equal(
      valuesDiverge(
        normalizeComparedFieldValue('freightTerm', 'PREPAID'),
        normalizeComparedFieldValue('freightTerm', 'P'),
      ),
      false,
    );
  });
});
