-- Contrato n8n: webhook POST /enviar-xml-globalsys
-- Body: { "masterId": number, "houseId": number }
-- HBLCount no Master é sempre 1. Partlot agrega um House extra ao Master
-- do mesmo container e dispara um XML novo só para esse House.
-- Filename deve incluir BlVersion e HouseNumber para não sobrescrever envios:
--   CTR NO. {container}, MBL NO. {masterNumber}, HBL NO. {houseNumber}, {BlVersion}

SELECT (
    SELECT
        m.Id,
        m.ReferenceNumber,
        m.MasterNumber,
        m.BlVersion,
        m.BLTypeExportImport,
        m.VesselName,
        m.Voyage,
        m.OnboardDate,
        m.ArrivalDate,
        1 AS HBLCount,

        m.ShipperName,
        m.ShipperAddress,

        m.ConsigneeName,
        m.ConsigneeAddress,

        m.NotifyName,
        m.NotifyAddress,

        m.CarrierSCACCode,
        m.CarrierName,

        m.CargoTypeLclFclBulk,
        m.ServiceTerm,
        m.FreightTerm,

        m.LoadingPortCode,
        m.LoadingPortName,

        m.DischargePortCode,
        m.DischargePortName,

        m.DeliveryPortCode,
        m.DeliveryPortName,

        m.FinalDestinationPortCode,
        m.FinalDestinationPortName,

        m.ContainerNumber,
        m.ContainerType,

        m.PackingQuantity,
        m.PackingQuantityUnitCode,
        m.GrossWeight,
        m.VolumeMeasure,

        JSON_QUERY((
            SELECT
                h.Id,
                h.HouseNumber,

                h.ShipperName,
                h.ShipperAddress,

                h.ConsigneeName,
                h.ConsigneeAddress,

                h.NotifyName,
                h.NotifyAddress,

                h.BLCargoTypeExIm,
                h.OriginalBLMethodCode,

                h.ServiceTerm,
                h.FreightTerm,

                h.ReceiptPortCode,
                h.ReceiptPortName,

                h.LoadingPortCode,
                h.LoadingPortName,

                h.DischargePortCode,
                h.DischargePortName,

                h.DeliveryPortCode,
                h.DeliveryPortName,

                h.PackingQuantity,
                h.PackingQuantityUnitCode,

                h.GrossWeight,
                h.VolumeMeasure,

                h.IssueDate,
                h.ItemName,

                h.ContainerNumber,
                h.ContainerSealNo1,
                h.ContainerSealNo2,
                h.ContainerType,
                h.ContainerQTY,
                h.ContainerUnitCode,
                h.ContainerGWT,
                h.ContainerCBM,

                JSON_QUERY((
                    SELECT
                        c.Id,
                        c.Brand,
                        c.CounterMark,
                        c.CargoType,
                        c.HazardClass,
                        c.UNNumber,
                        c.Packaging
                    FROM BL_House_Cargo c
                    WHERE c.BlHouseId = h.Id
                    FOR JSON PATH
                )) AS Cargos,

                JSON_QUERY((
                    SELECT
                        n.Id,
                        n.NcmCode
                    FROM BL_House_NCM n
                    WHERE n.BlHouseId = h.Id
                    FOR JSON PATH
                )) AS Ncms

            FROM BL_House h
            WHERE h.Id = {{ $json.body.houseId }}
              AND h.BLMasterId = m.Id
            FOR JSON PATH
        )) AS Houses

    FROM BL_Master m
    WHERE m.Id = {{ $json.body.masterId }}

    FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
) AS Result;
