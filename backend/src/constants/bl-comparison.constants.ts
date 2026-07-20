/** Campos escalares comparáveis do Master (exclui Id, BlVersion, Status, metadados OCR). */
export const MASTER_SCALAR_FIELDS = [
  { key: 'ReferenceNumber', label: 'Reference Number' },
  { key: 'BLTypeExportImport', label: 'BL Type Export/Import' },
  { key: 'VesselName', label: 'Vessel Name' },
  { key: 'Voyage', label: 'Voyage' },
  { key: 'OnboardDate', label: 'Onboard Date' },
  { key: 'ArrivalDate', label: 'Arrival Date' },
  { key: 'HBLCount', label: 'HBL Count' },
  { key: 'ShipperName', label: 'Shipper Name' },
  { key: 'ShipperAddress', label: 'Shipper Address' },
  { key: 'ConsigneeName', label: 'Consignee Name' },
  { key: 'ConsigneeAddress', label: 'Consignee Address' },
  { key: 'NotifyName', label: 'Notify Name' },
  { key: 'NotifyAddress', label: 'Notify Address' },
  { key: 'CarrierSCACCode', label: 'Carrier SCAC Code' },
  { key: 'CarrierName', label: 'Carrier Name' },
  { key: 'CargoTypeLclFclBulk', label: 'Cargo Type LCL/FCL/Bulk' },
  { key: 'LoadType', label: 'Load Type' },
  { key: 'ServiceTerm', label: 'Service Term' },
  { key: 'FreightTerm', label: 'Freight Term' },
  { key: 'LoadingPortCode', label: 'Loading Port Code' },
  { key: 'LoadingPortName', label: 'Loading Port Name' },
  { key: 'DischargePortCode', label: 'Discharge Port Code' },
  { key: 'DischargePortName', label: 'Discharge Port Name' },
  { key: 'DeliveryPortCode', label: 'Delivery Port Code' },
  { key: 'DeliveryPortName', label: 'Delivery Port Name' },
  { key: 'FinalDestinationPortCode', label: 'Final Destination Port Code' },
  { key: 'FinalDestinationPortName', label: 'Final Destination Port Name' },
  { key: 'ContainerNumber', label: 'Container Number' },
  { key: 'ContainerSealNo1', label: 'Container Seal No 1' },
  { key: 'ContainerType', label: 'Container Type' },
  { key: 'PackingQuantity', label: 'Packing Quantity' },
  { key: 'PackingQuantityUnitCode', label: 'Packing Quantity Unit Code' },
  { key: 'GrossWeight', label: 'Gross Weight' },
  { key: 'VolumeMeasure', label: 'Volume Measure' },
] as const;

/** Campos escalares comparáveis do House. */
export const HOUSE_SCALAR_FIELDS = [
  { key: 'ShipperName', label: 'Shipper Name' },
  { key: 'ShipperAddress', label: 'Shipper Address' },
  { key: 'ConsigneeName', label: 'Consignee Name' },
  { key: 'ConsigneeAddress', label: 'Consignee Address' },
  { key: 'NotifyName', label: 'Notify Name' },
  { key: 'NotifyAddress', label: 'Notify Address' },
  { key: 'BLCargoTypeExIm', label: 'BL Cargo Type Ex/Im' },
  { key: 'OriginalBLMethodCode', label: 'Original BL Method Code' },
  { key: 'ServiceTerm', label: 'Service Term' },
  { key: 'FreightTerm', label: 'Freight Term' },
  { key: 'ReceiptPortCode', label: 'Receipt Port Code' },
  { key: 'ReceiptPortName', label: 'Receipt Port Name' },
  { key: 'LoadingPortCode', label: 'Loading Port Code' },
  { key: 'LoadingPortName', label: 'Loading Port Name' },
  { key: 'DischargePortCode', label: 'Discharge Port Code' },
  { key: 'DischargePortName', label: 'Discharge Port Name' },
  { key: 'DeliveryPortCode', label: 'Delivery Port Code' },
  { key: 'DeliveryPortName', label: 'Delivery Port Name' },
  { key: 'PackingQuantity', label: 'Packing Quantity' },
  { key: 'PackingQuantityUnitCode', label: 'Packing Quantity Unit Code' },
  { key: 'GrossWeight', label: 'Gross Weight' },
  { key: 'VolumeMeasure', label: 'Volume Measure' },
  { key: 'IssueDate', label: 'Issue Date' },
  { key: 'ItemName', label: 'Item Name' },
  { key: 'ContainerNumber', label: 'Container Number' },
  { key: 'ContainerSealNo1', label: 'Container Seal No 1' },
  { key: 'ContainerSealNo2', label: 'Container Seal No 2' },
  { key: 'ContainerType', label: 'Container Type' },
  { key: 'ContainerQTY', label: 'Container QTY' },
  { key: 'ContainerUnitCode', label: 'Container Unit Code' },
  { key: 'ContainerGWT', label: 'Container GWT' },
  { key: 'ContainerCBM', label: 'Container CBM' },
] as const;

export const CARGO_COMPARABLE_FIELDS = [
  'Brand',
  'CounterMark',
  'CargoType',
  'HazardClass',
  'UNNumber',
  'Packaging',
] as const;

export type ComparisonStatus =
  | 'completo_sem_divergencia'
  | 'completo_com_divergencia'
  | 'documento_incompleto'
  | 'erro_comparacao';

export type DivergenciaCampoCategoria = 'master' | 'house' | 'cargo' | 'ncm';
