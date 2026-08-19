import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LOT_STATUS, XML_DISPATCH_UI_STATUS } from '../../constants/xml-dispatch.constants.js';
import { computeLotStatus, isLotReadyForDispatch } from './lot-status.js';

describe('computeLotStatus', () => {
  it('trata 1:1 como pronto quando Master e um House estão finalizados', () => {
    assert.equal(
      computeLotStatus({
        hblCount: 1,
        masterFinalized: true,
        linkedCount: 1,
        finalizedHouseCount: 1,
        xmlStatus: XML_DISPATCH_UI_STATUS.NAO_ENVIADO,
      }),
      LOT_STATUS.PRONTO,
    );
    assert.equal(
      isLotReadyForDispatch({
        hblCount: 1,
        masterFinalized: true,
        linkedCount: 1,
        finalizedHouseCount: 1,
        xmlStatus: XML_DISPATCH_UI_STATUS.ENVIADO,
      }),
      true,
    );
  });

  it('aguarda Houses no partlot até a cota do HBLCount', () => {
    assert.equal(
      computeLotStatus({
        hblCount: 3,
        masterFinalized: true,
        linkedCount: 2,
        finalizedHouseCount: 2,
        xmlStatus: XML_DISPATCH_UI_STATUS.NAO_ENVIADO,
      }),
      LOT_STATUS.AGUARDANDO_HOUSE,
    );
  });

  it('não dispara se o House do lote ainda não finalizou', () => {
    assert.equal(
      computeLotStatus({
        hblCount: 2,
        masterFinalized: true,
        linkedCount: 2,
        finalizedHouseCount: 1,
        xmlStatus: XML_DISPATCH_UI_STATUS.NAO_ENVIADO,
      }),
      LOT_STATUS.HOUSE_NAO_FINALIZADO,
    );
  });

  it('não usa HBLCount nulo como cota', () => {
    assert.equal(
      computeLotStatus({
        hblCount: null,
        masterFinalized: true,
        linkedCount: 1,
        finalizedHouseCount: 1,
        xmlStatus: XML_DISPATCH_UI_STATUS.NAO_ENVIADO,
      }),
      LOT_STATUS.COUNT_AUSENTE,
    );
  });

  it('preserva xml_enviado mesmo se o lote mudar depois', () => {
    assert.equal(
      computeLotStatus({
        hblCount: 3,
        masterFinalized: true,
        linkedCount: 1,
        finalizedHouseCount: 1,
        xmlStatus: XML_DISPATCH_UI_STATUS.ENVIADO,
      }),
      LOT_STATUS.XML_ENVIADO,
    );
  });
});
