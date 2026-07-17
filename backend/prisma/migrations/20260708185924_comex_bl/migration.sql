BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[BL_Master] (
    [Id] INT NOT NULL IDENTITY(1,1),
    [ReferenceNumber] VARCHAR(50),
    [MasterNumber] VARCHAR(50) NOT NULL,
    [BLTypeExportImport] CHAR(1),
    [VesselName] NVARCHAR(200),
    [Voyage] VARCHAR(50),
    [OnboardDate] DATE,
    [ArrivalDate] DATE,
    [HBLCount] INT,
    [ShipperName] NVARCHAR(300),
    [ShipperAddress] NVARCHAR(1000),
    [ConsigneeName] NVARCHAR(300),
    [ConsigneeAddress] NVARCHAR(1000),
    [NotifyName] NVARCHAR(300),
    [NotifyAddress] NVARCHAR(1000),
    [CarrierSCACCode] VARCHAR(20),
    [CarrierName] NVARCHAR(300),
    [CargoTypeLclFclBulk] CHAR(1),
    [ServiceTerm] VARCHAR(30),
    [FreightTerm] VARCHAR(10),
    [LoadingPortCode] VARCHAR(10),
    [LoadingPortName] NVARCHAR(200),
    [DischargePortCode] VARCHAR(10),
    [DischargePortName] NVARCHAR(200),
    [DeliveryPortCode] VARCHAR(10),
    [DeliveryPortName] NVARCHAR(200),
    [FinalDestinationPortCode] VARCHAR(10),
    [FinalDestinationPortName] NVARCHAR(200),
    [ContainerNumber] VARCHAR(20),
    [ContainerType] VARCHAR(20),
    [PackingQuantity] INT,
    [PackingQuantityUnitCode] VARCHAR(10),
    [GrossWeight] DECIMAL(18,3),
    [VolumeMeasure] DECIMAL(18,3),
    [Status] BIT NOT NULL CONSTRAINT [DF_BL_Master_Status] DEFAULT 0,
    [ItemId] NVARCHAR(255),
    [DriveId] NVARCHAR(255),
    CONSTRAINT [PK_BL_Master] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_BL_Master_MasterNumber] UNIQUE NONCLUSTERED ([MasterNumber])
);

-- CreateTable
CREATE TABLE [dbo].[BL_House] (
    [Id] INT NOT NULL IDENTITY(1,1),
    [BLMasterId] INT,
    [HouseNumber] VARCHAR(50) NOT NULL,
    [ShipperName] NVARCHAR(300),
    [ShipperAddress] NVARCHAR(1000),
    [ConsigneeName] NVARCHAR(300),
    [ConsigneeAddress] NVARCHAR(1000),
    [NotifyName] NVARCHAR(300),
    [NotifyAddress] NVARCHAR(1000),
    [BLCargoTypeExIm] CHAR(1),
    [OriginalBLMethodCode] VARCHAR(10),
    [ServiceTerm] VARCHAR(30),
    [FreightTerm] VARCHAR(10),
    [ReceiptPortCode] VARCHAR(10),
    [ReceiptPortName] VARCHAR(200),
    [LoadingPortCode] VARCHAR(10),
    [LoadingPortName] VARCHAR(200),
    [DischargePortCode] VARCHAR(10),
    [DischargePortName] VARCHAR(200),
    [DeliveryPortCode] VARCHAR(10),
    [DeliveryPortName] VARCHAR(200),
    [PackingQuantity] INT,
    [PackingQuantityUnitCode] VARCHAR(10),
    [GrossWeight] DECIMAL(18,3),
    [VolumeMeasure] DECIMAL(18,3),
    [IssueDate] DATETIME2,
    [ItemName] NVARCHAR(max),
    [ContainerNumber] VARCHAR(20),
    [ContainerSealNo1] VARCHAR(30),
    [ContainerSealNo2] VARCHAR(30),
    [ContainerType] VARCHAR(20),
    [ContainerQTY] INT,
    [ContainerUnitCode] VARCHAR(50),
    [ContainerGWT] DECIMAL(18,3),
    [ContainerCBM] DECIMAL(18,3),
    [Status] BIT NOT NULL CONSTRAINT [DF_BL_House_Status] DEFAULT 0,
    [ItemId] NVARCHAR(255),
    [DriveId] NVARCHAR(255),
    CONSTRAINT [PK_BL_House] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_BL_House_HouseNumber] UNIQUE NONCLUSTERED ([HouseNumber])
);

-- CreateTable
CREATE TABLE [dbo].[TB_FREIGHT_CHARGE] (
    [ID] INT NOT NULL IDENTITY(1,1),
    [BL_NUMBER] VARCHAR(50),
    [BL_TYPE] VARCHAR(10),
    [CHARGE_TYPE] VARCHAR(50),
    [AMOUNT] DECIMAL(18,2),
    [CURRENCY] VARCHAR(10),
    [FREIGHT_TERM] VARCHAR(50),
    CONSTRAINT [PK__TB_FREIG__3214EC273024D904] PRIMARY KEY CLUSTERED ([ID])
);

-- CreateTable
CREATE TABLE [dbo].[TB_HBL] (
    [BL_NUMBER] VARCHAR(20) NOT NULL,
    [SHIPPER] VARCHAR(255),
    [CONSIGNEE] VARCHAR(max),
    [PORT_LOADING] VARCHAR(50),
    [PORT_DISCHARGE] VARCHAR(50),
    [PLACE_DELIVERY] VARCHAR(50),
    [ID_MBL] VARCHAR(20),
    [MARKS_NUMBER] VARCHAR(20),
    [PACKAGE] VARCHAR(50),
    [GROSS_WEIGHT] VARCHAR(20),
    [CUBIC_METER] VARCHAR(20),
    [PACKAGE_TYPE] VARCHAR(20),
    [CONTAINER_TYPE] VARCHAR(10),
    [CARGO_DESCRIPTION] NVARCHAR(max),
    [NCM_NUMBER] NVARCHAR(max),
    [CONTAINER_NUMBER] VARCHAR(20),
    [WOODEN_PACKING] VARCHAR(50),
    CONSTRAINT [PK_TB_HBL] PRIMARY KEY CLUSTERED ([BL_NUMBER])
);

-- CreateTable
CREATE TABLE [dbo].[TB_MBL] (
    [BL_NUMBER] VARCHAR(20) NOT NULL,
    [VESSEL_NUMBER] VARCHAR(255),
    [PORT_LOADING] VARCHAR(50),
    [PORT_DISCHARGE] VARCHAR(50),
    [CARRIER_NAME] VARCHAR(50),
    [CONTAINER_NUMBER] VARCHAR(20),
    [SEAL_NUMBER] VARCHAR(20),
    [CONTAINER_TYPE] VARCHAR(10),
    CONSTRAINT [PK_TB_MBL] PRIMARY KEY CLUSTERED ([BL_NUMBER]),
    CONSTRAINT [UQ_TB_MBL_BL_NUMBER] UNIQUE NONCLUSTERED ([BL_NUMBER])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_BL_Master_ContainerNumber] ON [dbo].[BL_Master]([ContainerNumber]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_BL_Master_DeliveryPortCode] ON [dbo].[BL_Master]([DeliveryPortCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_BL_Master_LoadingPortCode] ON [dbo].[BL_Master]([LoadingPortCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_BL_Master_OnboardDate] ON [dbo].[BL_Master]([OnboardDate]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_BL_Master_VesselName] ON [dbo].[BL_Master]([VesselName]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_BL_House_BLMasterId] ON [dbo].[BL_House]([BLMasterId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_BL_House_ContainerNumber] ON [dbo].[BL_House]([ContainerNumber]);

-- AddForeignKey
ALTER TABLE [dbo].[TB_HBL] ADD CONSTRAINT [FK_TB_HBL_TB_MBL] FOREIGN KEY ([ID_MBL]) REFERENCES [dbo].[TB_MBL]([BL_NUMBER]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
