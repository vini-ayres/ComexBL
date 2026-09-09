import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LOT_STATUS, XML_DISPATCH_UI_STATUS } from '../../constants/xml-dispatch.constants.js';
import {
  computeLotStatus,
  isHouseReadyForDispatch,
  isLotReadyForDispatch,
} from './lot-status.js';

describe('computeLotStatus', () => {
  it('trata 1:1 como pronto quando Master e um House estão finalizados', () => {
    assert.equal(
      computeLotStatus({
        masterFinalized: true,
        houses: [
          {
            houseFinalized: true,
            xmlStatus: XML_DISPATCH_UI_STATUS.NAO_ENVIADO,
          },
        ],
      }),
      LOT_STATUS.PRONTO,
    );
    assert.equal(
      isLotReadyForDispatch({
        masterFinalized: true,
        houses: [
          {
            houseFinalized: true,
            xmlStatus: XML_DISPATCH_UI_STATUS.ENVIADO,
          },
        ],
      }),
      true,
    );
  });

  it('no partlot dispara o House finalizado sem esperar os demais', () => {
    assert.equal(
      isHouseReadyForDispatch({
        masterFinalized: true,
        houseFinalized: true,
      }),
      true,
    );
    assert.equal(
      isLotReadyForDispatch({
        masterFinalized: true,
        houses: [
          {
            houseFinalized: true,
            xmlStatus: XML_DISPATCH_UI_STATUS.ENVIADO,
          },
          {
            houseFinalized: false,
            xmlStatus: XML_DISPATCH_UI_STATUS.NAO_ENVIADO,
          },
        ],
      }),
      true,
    );
    assert.equal(
      computeLotStatus({
        masterFinalized: true,
        houses: [
          {
            houseFinalized: true,
            xmlStatus: XML_DISPATCH_UI_STATUS.ENVIADO,
          },
          {
            houseFinalized: false,
            xmlStatus: XML_DISPATCH_UI_STATUS.NAO_ENVIADO,
          },
        ],
      }),
      LOT_STATUS.HOUSE_NAO_FINALIZADO,
    );
  });

  it('marca xml_enviado só quando todos os Houses do Master já enviaram', () => {
    assert.equal(
      computeLotStatus({
        masterFinalized: true,
        houses: [
          {
            houseFinalized: true,
            xmlStatus: XML_DISPATCH_UI_STATUS.ENVIADO,
          },
          {
            houseFinalized: true,
            xmlStatus: XML_DISPATCH_UI_STATUS.ENVIADO,
          },
        ],
      }),
      LOT_STATUS.XML_ENVIADO,
    );
  });

  it('marca xml_sucesso quando o n8n confirma integração de todos os Houses', () => {
    assert.equal(
      computeLotStatus({
        masterFinalized: true,
        houses: [
          {
            houseFinalized: true,
            xmlStatus: XML_DISPATCH_UI_STATUS.SUCESSO,
          },
          {
            houseFinalized: true,
            xmlStatus: XML_DISPATCH_UI_STATUS.SUCESSO,
          },
        ],
      }),
      LOT_STATUS.XML_SUCESSO,
    );
  });

  it('mantém xml_enviado enquanto algum House ainda aguarda integração no GlobalSys', () => {
    assert.equal(
      computeLotStatus({
        masterFinalized: true,
        houses: [
          {
            houseFinalized: true,
            xmlStatus: XML_DISPATCH_UI_STATUS.SUCESSO,
          },
          {
            houseFinalized: true,
            xmlStatus: XML_DISPATCH_UI_STATUS.ENVIADO,
          },
        ],
      }),
      LOT_STATUS.XML_ENVIADO,
    );
  });

  it('marca xml_erro quando a integração no GlobalSys falha', () => {
    assert.equal(
      computeLotStatus({
        masterFinalized: true,
        houses: [
          {
            houseFinalized: true,
            xmlStatus: XML_DISPATCH_UI_STATUS.ERRO,
          },
        ],
      }),
      LOT_STATUS.XML_ERRO,
    );
  });

  it('não dispara se o House do lote ainda não finalizou', () => {
    assert.equal(
      computeLotStatus({
        masterFinalized: true,
        houses: [
          {
            houseFinalized: false,
            xmlStatus: XML_DISPATCH_UI_STATUS.NAO_ENVIADO,
          },
        ],
      }),
      LOT_STATUS.HOUSE_NAO_FINALIZADO,
    );
    assert.equal(
      isHouseReadyForDispatch({
        masterFinalized: true,
        houseFinalized: false,
      }),
      false,
    );
  });

  it('aguarda House quando o Master já finalizou sem vínculo', () => {
    assert.equal(
      computeLotStatus({
        masterFinalized: true,
        houses: [],
      }),
      LOT_STATUS.AGUARDANDO_HOUSE,
    );
  });
});
