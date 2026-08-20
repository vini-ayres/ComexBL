import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  extractCargoRecordsFromHouseRows,
  extractNcmRecordsFromHouseRows,
  mapGlobalSysCargoRecord,
  mapGlobalSysHouseRecord,
  mapGlobalSysMasterRecord,
  mapGlobalSysNcmRecord,
} from './globalsys-comparacao.mapper.js';

describe('mapGlobalSysMasterRecord (query de divergência)', () => {
  it('lê aliases da query Master de divergência', () => {
    const mapped = mapGlobalSysMasterRecord(
      {
        MasterNumber: 'SZX600254900',
        VesselName: 'KOTA PUSAKA              ',
        Voyage: '0039W',
        CarrierSCACCode: null,
        CarrierName: 'PACIFIC INTERNATIONAL LINES',
        FreightTerm: 'C',
        ContainerNumber: 'PCIU9479276',
        ContainerSealNo1: 'CR0167159',
        ContainerType: '40 HC',
      },
      'SZX600254900',
    );

    assert.equal(mapped.numeroBl, 'SZX600254900');
    assert.equal(mapped.vesselName, 'KOTA PUSAKA');
    assert.equal(mapped.voyage, '0039W');
    assert.equal(mapped.carrierName, 'PACIFIC INTERNATIONAL LINES');
    assert.equal(mapped.carrierScacCode, null);
    assert.equal(mapped.freightTerm, 'C');
    assert.equal(mapped.containerNumber, 'PCIU9479276');
    assert.equal(mapped.containerSealNo1, 'CR0167159');
    assert.equal(mapped.containerType, '40 HC');
  });

  it('aceita aliases antigos do SELECT operacional como fallback', () => {
    const mapped = mapGlobalSysMasterRecord(
      {
        NR_BL: 'SZX600254900',
        NM_NAVIO: 'KOTA PUSAKA',
        NR_VIAGEM: '0039W',
        NM_TRANSPORTADOR: 'PACIFIC INTERNATIONAL LINES',
        NM_TIPO_PAGAMENTO: 'COLLECT',
        NR_CNTR: 'PCIU9479276',
        NR_LACRE: 'CR0167159',
        NM_TIPO_CONTAINER: '40 HC',
        CD_SCAC: 'PABV',
      },
      'SZX600254900',
    );

    assert.equal(mapped.vesselName, 'KOTA PUSAKA');
    assert.equal(mapped.freightTerm, 'COLLECT');
    assert.equal(mapped.carrierScacCode, 'PABV');
    assert.equal(mapped.containerNumber, 'PCIU9479276');
  });
});

describe('mapGlobalSysHouseRecord (query de divergência)', () => {
  it('lê aliases da query House de divergência', () => {
    const mapped = mapGlobalSysHouseRecord(
      {
        HouseNumber: 'SHYY26013542',
        ShipperName: 'SHIPPER LTDA',
        ConsigneeName: 'CONSIGNEE SA',
        NotifyName: 'NOTIFY SA',
        DeliveryPortName: 'SANTOS',
        PackingQuantity: 4,
        GrossWeight: 800,
        VolumeMeasure: 12,
        ItemName: 'LASER TUBE CUTTING MACHINE',
        IssueDate: '2026-03-01',
      },
      'SHYY26013542',
    );

    assert.equal(mapped.numeroBl, 'SHYY26013542');
    assert.equal(mapped.shipperName, 'SHIPPER LTDA');
    assert.equal(mapped.consigneeName, 'CONSIGNEE SA');
    assert.equal(mapped.notifyName, 'NOTIFY SA');
    assert.equal(mapped.deliveryPortName, 'SANTOS');
    assert.equal(mapped.packingQuantity, '4');
    assert.equal(mapped.grossWeight, '800');
    assert.equal(mapped.volumeMeasure, '12');
    assert.equal(mapped.itemName, 'LASER TUBE CUTTING MACHINE');
    assert.equal(mapped.issueDate, '2026-03-01');
  });
});

describe('mapGlobalSysCargoRecord / NCM (query House de divergência)', () => {
  it('lê Brand, ConterMark, tipo, perigo e embalagem', () => {
    const cargo = mapGlobalSysCargoRecord({
      Brand: 'BRAND-A',
      ConterMark: 'CM-1',
      CargoType: 'GENERAL',
      HazardClass: '3',
      UNNumber: '1203',
      Packaging: 'CARTON',
    });

    assert.deepEqual(cargo, {
      brand: 'BRAND-A',
      counterMark: 'CM-1',
      cargoType: 'GENERAL',
      hazardClass: '3',
      unNumber: '1203',
      packaging: 'CARTON',
    });
  });

  it('lê NcmCode e CD_NCM', () => {
    assert.deepEqual(mapGlobalSysNcmRecord({ NcmCode: '8479.89.99' }), {
      ncmCode: '8479.89.99',
    });
    assert.deepEqual(mapGlobalSysNcmRecord({ CD_NCM: '8479.89.99' }), {
      ncmCode: '8479.89.99',
    });
  });

  it('extrai linhas de carga e NCM agregado da query House', () => {
    const rows = [
      {
        HouseNumber: 'H1',
        Brand: 'A',
        ConterMark: 'CM-A',
        NcmCode: '8479.89.99,0101.21.00',
      },
      {
        HouseNumber: 'H1',
        Brand: 'B',
        ConterMark: 'CM-B',
        NcmCode: '8479.89.99,0101.21.00',
      },
      {
        HouseNumber: 'H1',
        Brand: null,
        ConterMark: null,
        CargoType: null,
        HazardClass: null,
        UNNumber: null,
        Packaging: null,
        ItemName: null,
        NcmCode: '8479.89.99,0101.21.00',
      },
    ];

    const cargos = extractCargoRecordsFromHouseRows(rows).map(
      mapGlobalSysCargoRecord,
    );
    const ncms = extractNcmRecordsFromHouseRows(rows)
      .map(mapGlobalSysNcmRecord)
      .filter((item) => item != null);

    assert.equal(cargos.length, 2);
    assert.equal(cargos[0]?.brand, 'A');
    assert.equal(cargos[1]?.brand, 'B');
    assert.deepEqual(
      ncms.map((item) => item.ncmCode),
      ['8479.89.99', '0101.21.00'],
    );
  });
});
