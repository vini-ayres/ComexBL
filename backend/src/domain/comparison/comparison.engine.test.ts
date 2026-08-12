import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CanonicalHouseBl } from '../canonical/canonical-house-bl.js';
import type { CanonicalMasterBl } from '../canonical/canonical-master-bl.js';
import {
  emptyContainer,
  emptyParty,
  emptyPort,
} from '../canonical/canonical-shared.types.js';
import { ComparisonEngine } from './comparison.engine.js';
import { ComparisonCategory, ComparisonDifferenceReason, ComparisonSeverity } from './comparison.types.js';

const engine = new ComparisonEngine();

function createMaster(overrides: Partial<CanonicalMasterBl> = {}): CanonicalMasterBl {
  return {
    masterNumber: 'MAST001',
    referenceNumber: 'REF001',
    blTypeExportImport: 'E',
    vesselName: 'VESSEL A',
    voyage: 'V001',
    onboardDate: '2026-01-01',
    arrivalDate: '2026-01-15',
    hblCount: '2',
    shipper: { name: 'Shipper A', address: 'Address A' },
    consignee: { name: 'Consignee A', address: 'Address B' },
    notify: { name: 'Notify A', address: 'Address C' },
    carrierScacCode: 'SCAC',
    carrierName: 'Carrier A',
    cargoTypeLclFclBulk: 'F',
    loadType: 'FCL',
    serviceTerm: 'CY/CY',
    freightTerm: 'PREPAID',
    loadingPort: { code: 'BRSSZ', name: 'Santos' },
    dischargePort: { code: 'USNYC', name: 'New York' },
    deliveryPort: { code: 'USNYC', name: 'New York' },
    finalDestinationPort: { code: 'USCHI', name: 'Chicago' },
    container: {
      number: 'MSCU1234567',
      sealNo1: 'SEAL1',
      sealNo2: 'SEAL2',
      type: '40HC',
      quantity: '1',
      unitCode: 'CNT',
      grossWeight: '1000',
      volume: '50',
    },
    packingQuantity: '10',
    packingQuantityUnitCode: 'PKG',
    grossWeight: '12000',
    volumeMeasure: '25',
    ...overrides,
  };
}

function createHouse(overrides: Partial<CanonicalHouseBl> = {}): CanonicalHouseBl {
  return {
    houseNumber: 'HOUSE001',
    shipper: { name: 'House Shipper', address: 'House Shipper Address' },
    consignee: { name: 'House Consignee', address: 'House Consignee Address' },
    notify: { name: 'House Notify', address: 'House Notify Address' },
    blCargoTypeExIm: 'I',
    originalBlMethodCode: 'OBL',
    serviceTerm: 'CFS/CFS',
    freightTerm: 'COLLECT',
    receiptPort: { code: 'CNPVG', name: 'Shanghai' },
    loadingPort: { code: 'BRSSZ', name: 'Santos' },
    dischargePort: { code: 'USNYC', name: 'New York' },
    deliveryPort: { code: 'USNYC', name: 'New York' },
    packingQuantity: '5',
    packingQuantityUnitCode: 'CTN',
    grossWeight: '12000',
    volumeMeasure: '12',
    issueDate: '2026-01-10',
    itemName: 'GENERAL CARGO',
    container: {
      number: 'MSCU1234567',
      sealNo1: 'SEAL1',
      sealNo2: 'SEAL2',
      type: '40HC',
      quantity: '1',
      unitCode: 'CNT',
      grossWeight: '800',
      volume: '12',
    },
    cargo: [
      {
        brand: 'BRAND A',
        counterMark: 'CM A',
        cargoType: 'GENERAL',
        hazardClass: null,
        unNumber: null,
        packaging: 'BOX',
      },
    ],
    ncm: [{ code: '12345678' }],
    ...overrides,
  };
}

describe('ComparisonEngine.compareMaster', () => {
  it('returns equal result for identical objects', () => {
    const master = createMaster();
    const result = engine.compareMaster(master, structuredClone(master));

    assert.equal(result.equal, true);
    assert.equal(result.differenceCount, 0);
    assert.deepEqual(result.differences, []);
  });

  it('detects a simple scalar difference', () => {
    const local = createMaster({ grossWeight: '12000' });
    const globalSys = createMaster({ grossWeight: '12500' });

    const result = engine.compareMaster(local, globalSys);

    assert.equal(result.equal, false);
    assert.equal(result.differenceCount, 1);
    assert.deepEqual(result.differences[0], {
      path: 'grossWeight',
      field: 'GrossWeight',
      category: ComparisonCategory.GENERAL,
      severity: ComparisonSeverity.WARNING,
      reason: ComparisonDifferenceReason.VALUE_MISMATCH,
      localValue: '12000',
      globalSysValue: '12500',
    });
  });

  it('detects multiple differences in natural field order', () => {
    const local = createMaster({
      referenceNumber: 'REF001',
      voyage: 'V001',
    });
    const globalSys = createMaster({
      referenceNumber: 'REF002',
      voyage: 'V002',
    });

    const result = engine.compareMaster(local, globalSys);

    assert.equal(result.differenceCount, 2);
    assert.equal(result.differences[0]?.path, 'referenceNumber');
    assert.equal(result.differences[1]?.path, 'voyage');
  });

  it('detects null vs value as divergence', () => {
    const local = createMaster({ referenceNumber: null });
    const globalSys = createMaster({ referenceNumber: 'REF001' });

    const result = engine.compareMaster(local, globalSys);

    assert.equal(result.differenceCount, 1);
    assert.equal(result.differences[0]?.reason, ComparisonDifferenceReason.MISSING_LOCAL);
    assert.equal(result.differences[0]?.localValue, null);
    assert.equal(result.differences[0]?.globalSysValue, 'REF001');
  });

  it('classifies missing global value as MISSING_GLOBAL', () => {
    const local = createMaster({ referenceNumber: 'REF001' });
    const globalSys = createMaster({ referenceNumber: null });

    const result = engine.compareMaster(local, globalSys);

    assert.equal(result.differenceCount, 1);
    assert.equal(result.differences[0]?.reason, ComparisonDifferenceReason.MISSING_GLOBAL);
  });

  it('does not report difference when both values are null', () => {
    const local = createMaster({ referenceNumber: null });
    const globalSys = createMaster({ referenceNumber: null });

    const result = engine.compareMaster(local, globalSys);

    assert.equal(result.equal, true);
    assert.equal(
      result.differences.some((difference) => difference.path === 'referenceNumber'),
      false,
    );
  });

  it('compares parties field by field', () => {
    const local = createMaster({
      shipper: { name: 'Shipper A', address: 'Address A' },
    });
    const globalSys = createMaster({
      shipper: { name: 'Shipper B', address: 'Address A' },
    });

    const result = engine.compareMaster(local, globalSys);

    assert.equal(result.differenceCount, 1);
    assert.deepEqual(result.differences[0], {
      path: 'shipper.name',
      field: 'Name',
      category: ComparisonCategory.PARTY,
      severity: ComparisonSeverity.WARNING,
      reason: ComparisonDifferenceReason.VALUE_MISMATCH,
      localValue: 'Shipper A',
      globalSysValue: 'Shipper B',
    });
  });

  it('compares ports field by field', () => {
    const local = createMaster({
      loadingPort: { code: 'BRSSZ', name: 'Santos' },
    });
    const globalSys = createMaster({
      loadingPort: { code: 'BRPNG', name: 'Santos' },
    });

    const result = engine.compareMaster(local, globalSys);

    assert.equal(result.differenceCount, 1);
    assert.deepEqual(result.differences[0], {
      path: 'loadingPort.code',
      field: 'Code',
      category: ComparisonCategory.PORT,
      severity: ComparisonSeverity.WARNING,
      reason: ComparisonDifferenceReason.VALUE_MISMATCH,
      localValue: 'BRSSZ',
      globalSysValue: 'BRPNG',
    });
  });

  it('compares container fields using domain paths', () => {
    const local = createMaster({
      container: {
        ...createMaster().container,
        number: 'MSCU1234567',
      },
    });
    const globalSys = createMaster({
      container: {
        ...createMaster().container,
        number: 'MSCU7654321',
      },
    });

    const result = engine.compareMaster(local, globalSys);

    assert.equal(result.differenceCount, 1);
    assert.deepEqual(result.differences[0], {
      path: 'container.number',
      field: 'ContainerNumber',
      category: ComparisonCategory.CONTAINER,
      severity: ComparisonSeverity.WARNING,
      reason: ComparisonDifferenceReason.VALUE_MISMATCH,
      localValue: 'MSCU1234567',
      globalSysValue: 'MSCU7654321',
    });
  });

  it('uses strict equality without normalization', () => {
    const local = createMaster({ grossWeight: '123' });
    const globalSys = createMaster({ grossWeight: '123.00' });

    const result = engine.compareMaster(local, globalSys);

    assert.equal(result.equal, false);
    assert.equal(result.differenceCount, 1);
  });
});

describe('ComparisonEngine.compareHouse', () => {
  it('returns equal result for identical objects', () => {
    const house = createHouse();
    const result = engine.compareHouse(house, structuredClone(house));

    assert.equal(result.equal, true);
    assert.equal(result.differenceCount, 0);
  });

  it('detects container, scalar and cargo differences together', () => {
    const local = createHouse({
      grossWeight: '12000',
      container: {
        ...createHouse().container,
        number: 'MSCU1234567',
      },
      cargo: [
        {
          brand: 'BRAND A',
          counterMark: 'CM A',
          cargoType: 'GENERAL',
          hazardClass: null,
          unNumber: null,
          packaging: 'BOX',
        },
      ],
    });
    const globalSys = createHouse({
      grossWeight: '12500',
      container: {
        ...createHouse().container,
        number: 'MSCU7654321',
      },
      cargo: [
        {
          brand: 'BRAND A',
          counterMark: 'CM A',
          cargoType: 'GENERAL',
          hazardClass: null,
          unNumber: null,
          packaging: 'PALLET',
        },
      ],
    });

    const result = engine.compareHouse(local, globalSys);

    assert.equal(result.equal, false);
    assert.equal(result.differenceCount, 3);
    assert.deepEqual(result.differences, [
      {
        path: 'grossWeight',
        field: 'GrossWeight',
        category: ComparisonCategory.GENERAL,
        severity: ComparisonSeverity.WARNING,
        reason: ComparisonDifferenceReason.VALUE_MISMATCH,
        localValue: '12000',
        globalSysValue: '12500',
      },
      {
        path: 'container.number',
        field: 'ContainerNumber',
        category: ComparisonCategory.CONTAINER,
        severity: ComparisonSeverity.WARNING,
        reason: ComparisonDifferenceReason.VALUE_MISMATCH,
        localValue: 'MSCU1234567',
        globalSysValue: 'MSCU7654321',
      },
      {
        path: 'cargo[0].packaging',
        field: 'Packaging',
        category: ComparisonCategory.CARGO,
        severity: ComparisonSeverity.WARNING,
        reason: ComparisonDifferenceReason.VALUE_MISMATCH,
        localValue: 'BOX',
        globalSysValue: 'PALLET',
      },
    ]);
  });

  it('compares cargo collections by position', () => {
    const local = createHouse({
      cargo: [
        {
          brand: 'A',
          counterMark: null,
          cargoType: null,
          hazardClass: null,
          unNumber: null,
          packaging: 'BOX',
        },
        {
          brand: 'B',
          counterMark: null,
          cargoType: null,
          hazardClass: null,
          unNumber: null,
          packaging: 'CRATE',
        },
      ],
    });
    const globalSys = createHouse({
      cargo: [
        {
          brand: 'A',
          counterMark: null,
          cargoType: null,
          hazardClass: null,
          unNumber: null,
          packaging: 'BOX',
        },
        {
          brand: 'B',
          counterMark: null,
          cargoType: null,
          hazardClass: null,
          unNumber: null,
          packaging: 'PALLET',
        },
      ],
    });

    const result = engine.compareHouse(local, globalSys);

    assert.equal(result.differenceCount, 1);
    assert.equal(result.differences[0]?.path, 'cargo[1].packaging');
  });

  it('compares missing cargo positions as null vs value', () => {
    const local = createHouse({
      cargo: [
        {
          brand: 'A',
          counterMark: null,
          cargoType: null,
          hazardClass: null,
          unNumber: null,
          packaging: 'BOX',
        },
        {
          brand: 'B',
          counterMark: null,
          cargoType: null,
          hazardClass: null,
          unNumber: null,
          packaging: 'CRATE',
        },
      ],
    });
    const globalSys = createHouse({ cargo: [] });

    const result = engine.compareHouse(local, globalSys);

    assert.equal(result.differenceCount, 4);
    assert.equal(result.differences[0]?.reason, ComparisonDifferenceReason.MISSING_GLOBAL);
    assert.equal(result.differences[0]?.path, 'cargo[0].brand');
    assert.equal(result.differences[0]?.localValue, 'A');
    assert.equal(result.differences[0]?.globalSysValue, null);
    assert.equal(result.differences[1]?.path, 'cargo[0].packaging');
    assert.equal(result.differences[2]?.path, 'cargo[1].brand');
    assert.equal(result.differences[3]?.path, 'cargo[1].packaging');
  });

  it('compares ncm collections by position without sorting', () => {
    const local = createHouse({
      ncm: [{ code: '11111111' }, { code: '22222222' }],
    });
    const globalSys = createHouse({
      ncm: [{ code: '22222222' }, { code: '11111111' }],
    });

    const result = engine.compareHouse(local, globalSys);

    assert.equal(result.differenceCount, 2);
    assert.deepEqual(result.differences[0], {
      path: 'ncm[0].code',
      field: 'Code',
      category: ComparisonCategory.NCM,
      severity: ComparisonSeverity.WARNING,
      reason: ComparisonDifferenceReason.VALUE_MISMATCH,
      localValue: '11111111',
      globalSysValue: '22222222',
    });
    assert.deepEqual(result.differences[1], {
      path: 'ncm[1].code',
      field: 'Code',
      category: ComparisonCategory.NCM,
      severity: ComparisonSeverity.WARNING,
      reason: ComparisonDifferenceReason.VALUE_MISMATCH,
      localValue: '22222222',
      globalSysValue: '11111111',
    });
  });

  it('compares notify party and delivery port', () => {
    const local = createHouse({
      notify: emptyParty(),
      deliveryPort: emptyPort(),
    });
    const globalSys = createHouse({
      notify: { name: 'Notify X', address: null },
      deliveryPort: { code: 'USLAX', name: 'Los Angeles' },
    });

    const result = engine.compareHouse(local, globalSys);

    assert.equal(result.differences.some((item) => item.path === 'notify.name'), true);
    assert.equal(
      result.differences.some((item) => item.path === 'deliveryPort.code'),
      true,
    );
  });

  it('treats whitespace differences as divergence', () => {
    const local = createHouse({ itemName: ' ABC ' });
    const globalSys = createHouse({ itemName: 'ABC' });

    const result = engine.compareHouse(local, globalSys);

    assert.equal(result.equal, false);
    assert.equal(result.differences[0]?.path, 'itemName');
  });

  it('compares container seal and cbm paths', () => {
    const local = createHouse({
      container: {
        ...emptyContainer(),
        sealNo1: 'SEAL-A',
        volume: '10',
      },
    });
    const globalSys = createHouse({
      container: {
        ...emptyContainer(),
        sealNo1: 'SEAL-B',
        volume: '11',
      },
    });

    const result = engine.compareHouse(local, globalSys);

    assert.deepEqual(result.differences[0], {
      path: 'container.seal1',
      field: 'SealNo1',
      category: ComparisonCategory.CONTAINER,
      severity: ComparisonSeverity.WARNING,
      reason: ComparisonDifferenceReason.VALUE_MISMATCH,
      localValue: 'SEAL-A',
      globalSysValue: 'SEAL-B',
    });
    assert.deepEqual(result.differences[1], {
      path: 'container.cbm',
      field: 'CBM',
      category: ComparisonCategory.CONTAINER,
      severity: ComparisonSeverity.WARNING,
      reason: ComparisonDifferenceReason.VALUE_MISMATCH,
      localValue: '10',
      globalSysValue: '11',
    });
  });
});
