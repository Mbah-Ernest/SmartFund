IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260221032034_InitialLedger'
)
BEGIN
    CREATE TABLE [LedgerTransactions] (
        [Id] bigint NOT NULL IDENTITY,
        [Narration] nvarchar(500) NOT NULL,
        [Status] int NOT NULL,
        [PostedAtUtc] datetime2 NULL,
        [PostedByUserId] bigint NULL,
        [SequenceNumber] nvarchar(50) NULL,
        [ReversesTransactionId] bigint NULL,
        CONSTRAINT [PK_LedgerTransactions] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260221032034_InitialLedger'
)
BEGIN
    CREATE TABLE [LedgerEntries] (
        [Id] bigint NOT NULL IDENTITY,
        [AccountId] bigint NOT NULL,
        [Debit] decimal(18,2) NOT NULL,
        [DebitCurrency] nvarchar(3) NOT NULL,
        [Credit] decimal(18,2) NOT NULL,
        [CreditCurrency] nvarchar(3) NOT NULL,
        [LedgerTransactionId] bigint NULL,
        CONSTRAINT [PK_LedgerEntries] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_LedgerEntries_LedgerTransactions_LedgerTransactionId] FOREIGN KEY ([LedgerTransactionId]) REFERENCES [LedgerTransactions] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260221032034_InitialLedger'
)
BEGIN
    CREATE INDEX [IX_LedgerEntries_LedgerTransactionId] ON [LedgerEntries] ([LedgerTransactionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260221032034_InitialLedger'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260221032034_InitialLedger', N'10.0.3');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260221033535_AddLedgerDailySequence'
)
BEGIN
    CREATE TABLE [LedgerDailySequences] (
        [DateKey] nvarchar(8) NOT NULL,
        [LastNumber] int NOT NULL,
        CONSTRAINT [PK_LedgerDailySequences] PRIMARY KEY ([DateKey])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260221033535_AddLedgerDailySequence'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260221033535_AddLedgerDailySequence', N'10.0.3');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260221235121_AddLedgerTransactionReference'
)
BEGIN
    ALTER TABLE [LedgerTransactions] ADD [ReferenceId] bigint NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260221235121_AddLedgerTransactionReference'
)
BEGIN
    ALTER TABLE [LedgerTransactions] ADD [ReferenceType] int NOT NULL DEFAULT 0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260221235121_AddLedgerTransactionReference'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260221235121_AddLedgerTransactionReference', N'10.0.3');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260222002956_AddLedgerAccounts'
)
BEGIN
    CREATE TABLE [LedgerAccounts] (
        [Id] bigint NOT NULL IDENTITY,
        [Name] nvarchar(200) NOT NULL,
        [Type] int NOT NULL,
        [Currency] nvarchar(3) NOT NULL,
        [ReferenceType] int NOT NULL,
        [ReferenceId] bigint NULL,
        CONSTRAINT [PK_LedgerAccounts] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260222002956_AddLedgerAccounts'
)
BEGIN
    CREATE INDEX [IX_LedgerEntries_AccountId] ON [LedgerEntries] ([AccountId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260222002956_AddLedgerAccounts'
)
BEGIN
    CREATE INDEX [IX_LedgerAccounts_Name] ON [LedgerAccounts] ([Name]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260222002956_AddLedgerAccounts'
)
BEGIN
    CREATE INDEX [IX_LedgerAccounts_ReferenceType_ReferenceId] ON [LedgerAccounts] ([ReferenceType], [ReferenceId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260222002956_AddLedgerAccounts'
)
BEGIN
    ALTER TABLE [LedgerEntries] ADD CONSTRAINT [FK_LedgerEntries_LedgerAccounts_AccountId] FOREIGN KEY ([AccountId]) REFERENCES [LedgerAccounts] ([Id]) ON DELETE NO ACTION;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260222002956_AddLedgerAccounts'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260222002956_AddLedgerAccounts', N'10.0.3');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260222020501_AddTranches'
)
BEGIN
    CREATE TABLE [Tranches] (
        [Id] bigint NOT NULL IDENTITY,
        [TrancheCode] nvarchar(30) NOT NULL,
        [InvestorId] bigint NOT NULL,
        [DealId] bigint NULL,
        [Principal] decimal(18,2) NOT NULL,
        [RoiType] int NOT NULL,
        [RoiRate] decimal(9,6) NOT NULL,
        [StartDate] datetime2 NOT NULL,
        [MaturityDate] datetime2 NOT NULL,
        [PayoutType] int NOT NULL,
        [NoticeDays] int NULL,
        [EarlyWithdrawalPolicy] int NOT NULL,
        [LiabilityAccountId] bigint NOT NULL,
        CONSTRAINT [PK_Tranches] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Tranches_LedgerAccounts_LiabilityAccountId] FOREIGN KEY ([LiabilityAccountId]) REFERENCES [LedgerAccounts] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260222020501_AddTranches'
)
BEGIN
    CREATE INDEX [IX_Tranches_LiabilityAccountId] ON [Tranches] ([LiabilityAccountId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260222020501_AddTranches'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Tranches_TrancheCode] ON [Tranches] ([TrancheCode]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260222020501_AddTranches'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260222020501_AddTranches', N'10.0.3');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260222021125_AddTrancheDailySequence'
)
BEGIN
    CREATE TABLE [TrancheDailySequences] (
        [DateKey] nvarchar(8) NOT NULL,
        [LastNumber] int NOT NULL,
        CONSTRAINT [PK_TrancheDailySequences] PRIMARY KEY ([DateKey])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260222021125_AddTrancheDailySequence'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260222021125_AddTrancheDailySequence', N'10.0.3');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260305000100_AddInvestors'
)
BEGIN
    CREATE TABLE [Investors] (
        [Id] bigint NOT NULL IDENTITY,
        [FullName] nvarchar(200) NOT NULL,
        [Email] nvarchar(254) NOT NULL,
        [Phone] nvarchar(30) NULL,
        [Status] int NOT NULL,
        [CreatedAtUtc] datetime2 NOT NULL,
        CONSTRAINT [PK_Investors] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260305000100_AddInvestors'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Investors_Email] ON [Investors] ([Email]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260305000100_AddInvestors'
)
BEGIN
    CREATE INDEX [IX_Tranches_InvestorId] ON [Tranches] ([InvestorId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260305000100_AddInvestors'
)
BEGIN
    ALTER TABLE [Tranches] ADD CONSTRAINT [FK_Tranches_Investors_InvestorId] FOREIGN KEY ([InvestorId]) REFERENCES [Investors] ([Id]) ON DELETE NO ACTION;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260305000100_AddInvestors'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260305000100_AddInvestors', N'10.0.3');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260305001000_AddDeals'
)
BEGIN
    CREATE TABLE [Deals] (
        [Id] bigint NOT NULL IDENTITY,
        [DealCode] nvarchar(30) NOT NULL,
        [Title] nvarchar(200) NOT NULL,
        [BorrowerName] nvarchar(200) NOT NULL,
        [LoanAmount] decimal(18,2) NOT NULL,
        [InterestRate] decimal(9,6) NOT NULL,
        [TenureMonths] int NOT NULL,
        [Status] int NOT NULL,
        [CreatedAtUtc] datetime2 NOT NULL,
        CONSTRAINT [PK_Deals] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260305001000_AddDeals'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Deals_DealCode] ON [Deals] ([DealCode]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260305001000_AddDeals'
)
BEGIN
    CREATE INDEX [IX_Tranches_DealId] ON [Tranches] ([DealId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260305001000_AddDeals'
)
BEGIN
    ALTER TABLE [Tranches] ADD CONSTRAINT [FK_Tranches_Deals_DealId] FOREIGN KEY ([DealId]) REFERENCES [Deals] ([Id]) ON DELETE NO ACTION;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260305001000_AddDeals'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260305001000_AddDeals', N'10.0.3');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260305002000_AddInsuranceWallets'
)
BEGIN
    CREATE TABLE [InsuranceWallets] (
        [Id] bigint NOT NULL IDENTITY,
        [Balance] decimal(18,2) NOT NULL,
        [Type] int NOT NULL,
        [DealId] bigint NULL,
        [ReserveAccountId] bigint NULL,
        CONSTRAINT [PK_InsuranceWallets] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_InsuranceWallets_Deals_DealId] FOREIGN KEY ([DealId]) REFERENCES [Deals] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_InsuranceWallets_LedgerAccounts_ReserveAccountId] FOREIGN KEY ([ReserveAccountId]) REFERENCES [LedgerAccounts] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260305002000_AddInsuranceWallets'
)
BEGIN
    CREATE INDEX [IX_InsuranceWallets_DealId] ON [InsuranceWallets] ([DealId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260305002000_AddInsuranceWallets'
)
BEGIN
    CREATE INDEX [IX_InsuranceWallets_ReserveAccountId] ON [InsuranceWallets] ([ReserveAccountId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260305002000_AddInsuranceWallets'
)
BEGIN
    CREATE INDEX [IX_InsuranceWallets_Type_DealId] ON [InsuranceWallets] ([Type], [DealId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260305002000_AddInsuranceWallets'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260305002000_AddInsuranceWallets', N'10.0.3');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260305003000_AddAgreements'
)
BEGIN
    CREATE TABLE [Agreements] (
        [Id] bigint NOT NULL IDENTITY,
        [TrancheId] bigint NOT NULL,
        [Version] int NOT NULL,
        [SignedName] nvarchar(200) NOT NULL,
        [SignedAtUtc] datetime2 NOT NULL,
        [DocumentUrl] nvarchar(1000) NOT NULL,
        CONSTRAINT [PK_Agreements] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Agreements_Tranches_TrancheId] FOREIGN KEY ([TrancheId]) REFERENCES [Tranches] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260305003000_AddAgreements'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Agreements_TrancheId_Version] ON [Agreements] ([TrancheId], [Version]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260305003000_AddAgreements'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260305003000_AddAgreements', N'10.0.3');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260311143557_AddAuditEntries'
)
BEGIN
    CREATE TABLE [AuditEntries] (
        [Id] bigint NOT NULL IDENTITY,
        [Category] int NOT NULL,
        [Action] nvarchar(200) NOT NULL,
        [Description] nvarchar(1000) NOT NULL,
        [LedgerTransactionId] bigint NULL,
        [ReversesAuditEntryId] bigint NULL,
        [ReversedByAuditEntryId] bigint NULL,
        [CreatedAtUtc] datetime2 NOT NULL,
        CONSTRAINT [PK_AuditEntries] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260311143557_AddAuditEntries'
)
BEGIN
    CREATE INDEX [IX_AuditEntries_Category] ON [AuditEntries] ([Category]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260311143557_AddAuditEntries'
)
BEGIN
    CREATE INDEX [IX_AuditEntries_CreatedAtUtc] ON [AuditEntries] ([CreatedAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260311143557_AddAuditEntries'
)
BEGIN
    CREATE INDEX [IX_AuditEntries_LedgerTransactionId] ON [AuditEntries] ([LedgerTransactionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260311143557_AddAuditEntries'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260311143557_AddAuditEntries', N'10.0.3');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260313232256_AddConnectedBankAccounts'
)
BEGIN
    CREATE TABLE [ConnectedBankAccounts] (
        [Id] bigint NOT NULL IDENTITY,
        [MonoAccountId] nvarchar(100) NOT NULL,
        [BankName] nvarchar(200) NOT NULL,
        [AccountNumber] nvarchar(50) NOT NULL,
        [AccountName] nvarchar(200) NOT NULL,
        [AccountType] nvarchar(50) NOT NULL,
        [Currency] nvarchar(10) NOT NULL,
        [LastKnownBalanceKobo] bigint NOT NULL,
        [LastSyncedAtUtc] datetime2 NOT NULL,
        [ConnectedAtUtc] datetime2 NOT NULL,
        CONSTRAINT [PK_ConnectedBankAccounts] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260313232256_AddConnectedBankAccounts'
)
BEGIN
    CREATE INDEX [IX_ConnectedBankAccounts_ConnectedAtUtc] ON [ConnectedBankAccounts] ([ConnectedAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260313232256_AddConnectedBankAccounts'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ConnectedBankAccounts_MonoAccountId] ON [ConnectedBankAccounts] ([MonoAccountId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260313232256_AddConnectedBankAccounts'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260313232256_AddConnectedBankAccounts', N'10.0.3');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260314114755_ExtendConnectedBankAccountSyncStatus'
)
BEGIN
    ALTER TABLE [ConnectedBankAccounts] ADD [LastSyncError] nvarchar(1000) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260314114755_ExtendConnectedBankAccountSyncStatus'
)
BEGIN
    ALTER TABLE [ConnectedBankAccounts] ADD [SyncStatus] int NOT NULL DEFAULT 0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260314114755_ExtendConnectedBankAccountSyncStatus'
)
BEGIN
    ALTER TABLE [ConnectedBankAccounts] ADD [TotalTransactionsSynced] int NOT NULL DEFAULT 0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260314114755_ExtendConnectedBankAccountSyncStatus'
)
BEGIN
    CREATE TABLE [BankCategorizationRules] (
        [Id] bigint NOT NULL IDENTITY,
        [MatchText] nvarchar(500) NOT NULL,
        [IsRegex] bit NOT NULL,
        [CaseSensitive] bit NOT NULL,
        [CategoryId] bigint NOT NULL,
        [TransactionType] int NOT NULL,
        [Priority] int NOT NULL,
        [IsActive] bit NOT NULL,
        [Description] nvarchar(200) NULL,
        [AutoPostCredits] bit NOT NULL,
        [CreatedAtUtc] datetime2 NOT NULL,
        [LastMatchedAtUtc] datetime2 NULL,
        [MatchCount] int NOT NULL,
        CONSTRAINT [PK_BankCategorizationRules] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_BankCategorizationRules_PersonalCategories_CategoryId] FOREIGN KEY ([CategoryId]) REFERENCES [PersonalCategories] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260314114755_ExtendConnectedBankAccountSyncStatus'
)
BEGIN
    CREATE TABLE [BankImportedTransactions] (
        [Id] bigint NOT NULL IDENTITY,
        [ConnectedBankAccountId] bigint NOT NULL,
        [MonoTransactionId] nvarchar(200) NOT NULL,
        [IdempotencyHash] nvarchar(64) NOT NULL,
        [AmountKobo] bigint NOT NULL,
        [Direction] nvarchar(10) NOT NULL,
        [RawNarration] nvarchar(500) NOT NULL,
        [NormalizedNarration] nvarchar(500) NULL,
        [ExtractedMerchant] nvarchar(200) NULL,
        [TransactionDateUtc] datetime2 NOT NULL,
        [ImportedAtUtc] datetime2 NOT NULL,
        [Status] int NOT NULL,
        [IsPending] bit NOT NULL,
        [IsReversal] bit NOT NULL,
        [ReversalOfMonoId] nvarchar(200) NULL,
        [LinkedPersonalTransactionId] bigint NULL,
        [TransferPairImportId] bigint NULL,
        [ReviewNote] nvarchar(500) NULL,
        [ReviewedAtUtc] datetime2 NULL,
        CONSTRAINT [PK_BankImportedTransactions] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_BankImportedTransactions_ConnectedBankAccounts_ConnectedBankAccountId] FOREIGN KEY ([ConnectedBankAccountId]) REFERENCES [ConnectedBankAccounts] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_BankImportedTransactions_PersonalTransactions_LinkedPersonalTransactionId] FOREIGN KEY ([LinkedPersonalTransactionId]) REFERENCES [PersonalTransactions] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260314114755_ExtendConnectedBankAccountSyncStatus'
)
BEGIN
    CREATE INDEX [IX_BankCategorizationRules_CategoryId] ON [BankCategorizationRules] ([CategoryId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260314114755_ExtendConnectedBankAccountSyncStatus'
)
BEGIN
    CREATE INDEX [IX_BankCategorizationRules_IsActive_Priority] ON [BankCategorizationRules] ([IsActive], [Priority]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260314114755_ExtendConnectedBankAccountSyncStatus'
)
BEGIN
    CREATE INDEX [IX_BankImportedTransactions_ConnectedBankAccountId] ON [BankImportedTransactions] ([ConnectedBankAccountId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260314114755_ExtendConnectedBankAccountSyncStatus'
)
BEGIN
    CREATE UNIQUE INDEX [IX_BankImportedTransactions_IdempotencyHash] ON [BankImportedTransactions] ([IdempotencyHash]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260314114755_ExtendConnectedBankAccountSyncStatus'
)
BEGIN
    CREATE INDEX [IX_BankImportedTransactions_LinkedPersonalTransactionId] ON [BankImportedTransactions] ([LinkedPersonalTransactionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260314114755_ExtendConnectedBankAccountSyncStatus'
)
BEGIN
    CREATE UNIQUE INDEX [IX_BankImportedTransactions_MonoTransactionId_ConnectedBankAccountId] ON [BankImportedTransactions] ([MonoTransactionId], [ConnectedBankAccountId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260314114755_ExtendConnectedBankAccountSyncStatus'
)
BEGIN
    CREATE INDEX [IX_BankImportedTransactions_Status_ImportedAtUtc] ON [BankImportedTransactions] ([Status], [ImportedAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260314114755_ExtendConnectedBankAccountSyncStatus'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260314114755_ExtendConnectedBankAccountSyncStatus', N'10.0.3');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260314114854_AddBankCategorizationRules'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260314114854_AddBankCategorizationRules', N'10.0.3');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260314114902_AddBankImportedTransactions'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260314114902_AddBankImportedTransactions', N'10.0.3');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260314171025_AddBankWalletProvenanceAndSettings'
)
BEGIN
    ALTER TABLE [PersonalTransactions] ADD [SourceBankImportedTransactionId] bigint NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260314171025_AddBankWalletProvenanceAndSettings'
)
BEGIN
    ALTER TABLE [PersonalTransactions] ADD [SourceConnectedBankAccountId] bigint NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260314171025_AddBankWalletProvenanceAndSettings'
)
BEGIN
    ALTER TABLE [ConnectedBankAccounts] ADD [PersonalWalletId] bigint NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260314171025_AddBankWalletProvenanceAndSettings'
)
BEGIN
    CREATE TABLE [PersonalFinanceSettings] (
        [Id] int NOT NULL IDENTITY,
        [LaunchDateUtc] datetime2 NOT NULL,
        [CreatedAtUtc] datetime2 NOT NULL,
        [UpdatedAtUtc] datetime2 NOT NULL,
        [LastResetAtUtc] datetime2 NULL,
        CONSTRAINT [PK_PersonalFinanceSettings] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260314171025_AddBankWalletProvenanceAndSettings'
)
BEGIN
    CREATE INDEX [IX_PersonalTransactions_SourceBankImportedTransactionId] ON [PersonalTransactions] ([SourceBankImportedTransactionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260314171025_AddBankWalletProvenanceAndSettings'
)
BEGIN
    CREATE INDEX [IX_ConnectedBankAccounts_PersonalWalletId] ON [ConnectedBankAccounts] ([PersonalWalletId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260314171025_AddBankWalletProvenanceAndSettings'
)
BEGIN
    ALTER TABLE [ConnectedBankAccounts] ADD CONSTRAINT [FK_ConnectedBankAccounts_PersonalWallets_PersonalWalletId] FOREIGN KEY ([PersonalWalletId]) REFERENCES [PersonalWallets] ([Id]) ON DELETE SET NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260314171025_AddBankWalletProvenanceAndSettings'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260314171025_AddBankWalletProvenanceAndSettings', N'10.0.3');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260315192603_AddPendingAgentActions'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260315192603_AddPendingAgentActions', N'10.0.3');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327104807_AddMultiUserSupport'
)
BEGIN
    DROP TABLE [PersonalInvestmentContributions];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327104807_AddMultiUserSupport'
)
BEGIN
    DROP INDEX [IX_PersonalCategories_Type_Name] ON [PersonalCategories];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327104807_AddMultiUserSupport'
)
BEGIN
    DROP INDEX [IX_PersonalBudgets_CategoryId_Period] ON [PersonalBudgets];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327104807_AddMultiUserSupport'
)
BEGIN
    CREATE TABLE [Users] (
        [Id] bigint NOT NULL IDENTITY,
        [Email] nvarchar(256) NOT NULL,
        [PasswordHash] nvarchar(512) NOT NULL,
        [FullName] nvarchar(200) NOT NULL,
        [Role] int NOT NULL,
        [CreatedAtUtc] datetime2 NOT NULL,
        [IsActive] bit NOT NULL,
        CONSTRAINT [PK_Users] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327104807_AddMultiUserSupport'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Users_Email] ON [Users] ([Email]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327104807_AddMultiUserSupport'
)
BEGIN

                    SET IDENTITY_INSERT Users ON;
                    INSERT INTO Users (Id, Email, PasswordHash, FullName, Role, CreatedAtUtc, IsActive)
                    VALUES (1, 'admin@smartfund.com', '$2a$12$K26nlZkoTJVtZL.ckAnLuuqxpvmFp3oh18vyWVu8BFXvzYv/eEc5C', 'Administrator', 1, GETUTCDATE(), 1);
                    SET IDENTITY_INSERT Users OFF;
                
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327104807_AddMultiUserSupport'
)
BEGIN
    ALTER TABLE [PersonalWallets] ADD [UserId] bigint NOT NULL DEFAULT CAST(1 AS bigint);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327104807_AddMultiUserSupport'
)
BEGIN
    ALTER TABLE [PersonalTransactions] ADD [UserId] bigint NOT NULL DEFAULT CAST(1 AS bigint);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327104807_AddMultiUserSupport'
)
BEGIN
    ALTER TABLE [PersonalGoals] ADD [UserId] bigint NOT NULL DEFAULT CAST(1 AS bigint);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327104807_AddMultiUserSupport'
)
BEGIN
    ALTER TABLE [PersonalFinanceSettings] DROP CONSTRAINT [PK_PersonalFinanceSettings]
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327104807_AddMultiUserSupport'
)
BEGIN
    ALTER TABLE [PersonalFinanceSettings] ALTER COLUMN [Id] bigint NOT NULL
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327104807_AddMultiUserSupport'
)
BEGIN
    ALTER TABLE [PersonalFinanceSettings] ADD CONSTRAINT [PK_PersonalFinanceSettings] PRIMARY KEY ([Id])
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327104807_AddMultiUserSupport'
)
BEGIN
    ALTER TABLE [PersonalFinanceSettings] ADD [UserId] bigint NOT NULL DEFAULT CAST(1 AS bigint);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327104807_AddMultiUserSupport'
)
BEGIN
    ALTER TABLE [PersonalCategories] ADD [UserId] bigint NOT NULL DEFAULT CAST(1 AS bigint);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327104807_AddMultiUserSupport'
)
BEGIN
    ALTER TABLE [PersonalBudgets] ADD [UserId] bigint NOT NULL DEFAULT CAST(1 AS bigint);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327104807_AddMultiUserSupport'
)
BEGIN
    ALTER TABLE [ConnectedBankAccounts] ADD [UserId] bigint NOT NULL DEFAULT CAST(1 AS bigint);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327104807_AddMultiUserSupport'
)
BEGIN
    ALTER TABLE [BankCategorizationRules] ADD [UserId] bigint NOT NULL DEFAULT CAST(1 AS bigint);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327104807_AddMultiUserSupport'
)
BEGIN

                    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='PendingAgentActions' AND xtype='U')
                    BEGIN
                        CREATE TABLE [PendingAgentActions] (
                            [Id] uniqueidentifier NOT NULL,
                            [UserId] nvarchar(200) NOT NULL,
                            [ActionType] nvarchar(100) NOT NULL,
                            [PayloadJson] nvarchar(4000) NOT NULL,
                            [Summary] nvarchar(500) NOT NULL,
                            [CreatedAtUtc] datetime2 NOT NULL,
                            [ExpiresAtUtc] datetime2 NOT NULL,
                            CONSTRAINT [PK_PendingAgentActions] PRIMARY KEY ([Id])
                        );
                        CREATE INDEX [IX_PendingAgentActions_ExpiresAtUtc] ON [PendingAgentActions] ([ExpiresAtUtc]);
                        CREATE INDEX [IX_PendingAgentActions_UserId] ON [PendingAgentActions] ([UserId]);
                    END
                
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327104807_AddMultiUserSupport'
)
BEGIN
    CREATE TABLE [LoanApplications] (
        [Id] bigint NOT NULL IDENTITY,
        [UserId] bigint NOT NULL,
        [Amount] decimal(18,2) NOT NULL,
        [PurposeCategory] int NOT NULL,
        [PurposeDescription] nvarchar(1000) NOT NULL,
        [EmploymentStatus] nvarchar(200) NOT NULL,
        [MonthlyIncome] decimal(18,2) NOT NULL,
        [LoanTermMonths] int NOT NULL,
        [Status] int NOT NULL,
        [SubmittedAtUtc] datetime2 NOT NULL,
        [ReviewedAtUtc] datetime2 NULL,
        [ReviewedByUserId] bigint NULL,
        [AdminNote] nvarchar(2000) NULL,
        CONSTRAINT [PK_LoanApplications] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_LoanApplications_Users_ReviewedByUserId] FOREIGN KEY ([ReviewedByUserId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_LoanApplications_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327104807_AddMultiUserSupport'
)
BEGIN
    CREATE INDEX [IX_PersonalWallets_UserId] ON [PersonalWallets] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327104807_AddMultiUserSupport'
)
BEGIN
    CREATE INDEX [IX_PersonalTransactions_UserId] ON [PersonalTransactions] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327104807_AddMultiUserSupport'
)
BEGIN
    CREATE INDEX [IX_PersonalGoals_UserId] ON [PersonalGoals] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327104807_AddMultiUserSupport'
)
BEGIN
    CREATE UNIQUE INDEX [IX_PersonalFinanceSettings_UserId] ON [PersonalFinanceSettings] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327104807_AddMultiUserSupport'
)
BEGIN
    CREATE INDEX [IX_PersonalCategories_UserId] ON [PersonalCategories] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327104807_AddMultiUserSupport'
)
BEGIN
    CREATE UNIQUE INDEX [IX_PersonalCategories_UserId_Type_Name] ON [PersonalCategories] ([UserId], [Type], [Name]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327104807_AddMultiUserSupport'
)
BEGIN
    CREATE INDEX [IX_PersonalBudgets_CategoryId] ON [PersonalBudgets] ([CategoryId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327104807_AddMultiUserSupport'
)
BEGIN
    CREATE INDEX [IX_PersonalBudgets_UserId] ON [PersonalBudgets] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327104807_AddMultiUserSupport'
)
BEGIN
    CREATE UNIQUE INDEX [IX_PersonalBudgets_UserId_CategoryId_Period] ON [PersonalBudgets] ([UserId], [CategoryId], [Period]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327104807_AddMultiUserSupport'
)
BEGIN
    CREATE INDEX [IX_ConnectedBankAccounts_UserId] ON [ConnectedBankAccounts] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327104807_AddMultiUserSupport'
)
BEGIN
    CREATE INDEX [IX_BankCategorizationRules_UserId] ON [BankCategorizationRules] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327104807_AddMultiUserSupport'
)
BEGIN
    CREATE INDEX [IX_LoanApplications_ReviewedByUserId] ON [LoanApplications] ([ReviewedByUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327104807_AddMultiUserSupport'
)
BEGIN
    CREATE INDEX [IX_LoanApplications_Status] ON [LoanApplications] ([Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327104807_AddMultiUserSupport'
)
BEGIN
    CREATE INDEX [IX_LoanApplications_UserId] ON [LoanApplications] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327104807_AddMultiUserSupport'
)
BEGIN
    ALTER TABLE [BankCategorizationRules] ADD CONSTRAINT [FK_BankCategorizationRules_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327104807_AddMultiUserSupport'
)
BEGIN
    ALTER TABLE [ConnectedBankAccounts] ADD CONSTRAINT [FK_ConnectedBankAccounts_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327104807_AddMultiUserSupport'
)
BEGIN
    ALTER TABLE [PersonalBudgets] ADD CONSTRAINT [FK_PersonalBudgets_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327104807_AddMultiUserSupport'
)
BEGIN
    ALTER TABLE [PersonalCategories] ADD CONSTRAINT [FK_PersonalCategories_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327104807_AddMultiUserSupport'
)
BEGIN
    ALTER TABLE [PersonalFinanceSettings] ADD CONSTRAINT [FK_PersonalFinanceSettings_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327104807_AddMultiUserSupport'
)
BEGIN
    ALTER TABLE [PersonalGoals] ADD CONSTRAINT [FK_PersonalGoals_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327104807_AddMultiUserSupport'
)
BEGIN
    ALTER TABLE [PersonalTransactions] ADD CONSTRAINT [FK_PersonalTransactions_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327104807_AddMultiUserSupport'
)
BEGIN
    ALTER TABLE [PersonalWallets] ADD CONSTRAINT [FK_PersonalWallets_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327104807_AddMultiUserSupport'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260327104807_AddMultiUserSupport', N'10.0.3');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327191255_SyncLoanAndUserSchema'
)
BEGIN
    DECLARE @var nvarchar(max);
    SELECT @var = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[LoanApplications]') AND [c].[name] = N'EmploymentStatus');
    IF @var IS NOT NULL EXEC(N'ALTER TABLE [LoanApplications] DROP CONSTRAINT ' + @var + ';');
    ALTER TABLE [LoanApplications] DROP COLUMN [EmploymentStatus];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327191255_SyncLoanAndUserSchema'
)
BEGIN
    EXEC sp_rename N'[LoanApplications].[MonthlyIncome]', N'TotalRepayable', 'COLUMN';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327191255_SyncLoanAndUserSchema'
)
BEGIN
    EXEC sp_rename N'[LoanApplications].[LoanTermMonths]', N'RepaymentInstallments', 'COLUMN';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327191255_SyncLoanAndUserSchema'
)
BEGIN
    ALTER TABLE [LoanApplications] ADD [AccountNumber] nvarchar(30) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327191255_SyncLoanAndUserSchema'
)
BEGIN
    ALTER TABLE [LoanApplications] ADD [DailyInterestRate] decimal(9,4) NOT NULL DEFAULT 0.0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327191255_SyncLoanAndUserSchema'
)
BEGIN
    ALTER TABLE [LoanApplications] ADD [DurationDays] int NOT NULL DEFAULT 0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327191255_SyncLoanAndUserSchema'
)
BEGIN
    ALTER TABLE [LoanApplications] ADD [InstallmentAmount] decimal(18,2) NOT NULL DEFAULT 0.0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327191255_SyncLoanAndUserSchema'
)
BEGIN
    ALTER TABLE [LoanApplications] ADD [InterestAmount] decimal(18,2) NOT NULL DEFAULT 0.0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327191255_SyncLoanAndUserSchema'
)
BEGIN
    CREATE TABLE [LoanApplicantProfiles] (
        [Id] bigint NOT NULL IDENTITY,
        [UserId] bigint NOT NULL,
        [SubmittedName] nvarchar(200) NOT NULL,
        [FullName] nvarchar(200) NULL,
        [PhoneNumber] nvarchar(30) NULL,
        [EmailAddress] nvarchar(200) NULL,
        [EmergencyContactNumber] nvarchar(30) NULL,
        [Status] int NOT NULL,
        [SubmittedAtUtc] datetime2 NOT NULL,
        [ReviewedAtUtc] datetime2 NULL,
        [ReviewedByUserId] bigint NULL,
        [AdminNote] nvarchar(2000) NULL,
        CONSTRAINT [PK_LoanApplicantProfiles] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_LoanApplicantProfiles_Users_ReviewedByUserId] FOREIGN KEY ([ReviewedByUserId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_LoanApplicantProfiles_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327191255_SyncLoanAndUserSchema'
)
BEGIN
    CREATE INDEX [IX_LoanApplicantProfiles_ReviewedByUserId] ON [LoanApplicantProfiles] ([ReviewedByUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327191255_SyncLoanAndUserSchema'
)
BEGIN
    CREATE INDEX [IX_LoanApplicantProfiles_Status] ON [LoanApplicantProfiles] ([Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327191255_SyncLoanAndUserSchema'
)
BEGIN
    CREATE UNIQUE INDEX [IX_LoanApplicantProfiles_UserId] ON [LoanApplicantProfiles] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327191255_SyncLoanAndUserSchema'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260327191255_SyncLoanAndUserSchema', N'10.0.3');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260327192352_AddLoanFlow'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260327192352_AddLoanFlow', N'10.0.3');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328021146_AddLoanBankDetails'
)
BEGIN
    ALTER TABLE [LoanApplications] ADD [AccountName] nvarchar(200) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328021146_AddLoanBankDetails'
)
BEGIN
    ALTER TABLE [LoanApplications] ADD [BankName] nvarchar(200) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260328021146_AddLoanBankDetails'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260328021146_AddLoanBankDetails', N'10.0.3');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260401214431_AddTransactionIntelligenceEntities'
)
BEGIN
    ALTER TABLE [PersonalTransactions] ADD [IsSmallCharge] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260401214431_AddTransactionIntelligenceEntities'
)
BEGIN
    ALTER TABLE [PersonalTransactions] ADD [SmallChargeCategory] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260401214431_AddTransactionIntelligenceEntities'
)
BEGIN
    CREATE TABLE [AiInsights] (
        [Id] bigint NOT NULL IDENTITY,
        [UserId] bigint NOT NULL,
        [InsightsJson] nvarchar(max) NOT NULL,
        [GeneratedAtUtc] datetime2 NOT NULL,
        [ExpiresAtUtc] datetime2 NOT NULL,
        CONSTRAINT [PK_AiInsights] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AiInsights_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260401214431_AddTransactionIntelligenceEntities'
)
BEGIN
    CREATE TABLE [BankStatementUploads] (
        [Id] bigint NOT NULL IDENTITY,
        [UserId] bigint NOT NULL,
        [FileName] nvarchar(260) NOT NULL,
        [FileType] nvarchar(16) NOT NULL,
        [Status] nvarchar(32) NOT NULL,
        [TotalTransactions] int NOT NULL,
        [ParsedTransactions] int NOT NULL,
        [FlaggedForReview] int NOT NULL,
        [SmallChargesFound] int NOT NULL,
        [DateRangeStart] datetime2 NULL,
        [DateRangeEnd] datetime2 NULL,
        [ErrorMessage] nvarchar(2000) NULL,
        [CreatedAtUtc] datetime2 NOT NULL,
        [CompletedAtUtc] datetime2 NULL,
        CONSTRAINT [PK_BankStatementUploads] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_BankStatementUploads_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260401214431_AddTransactionIntelligenceEntities'
)
BEGIN
    CREATE TABLE [RecurringPatterns] (
        [Id] bigint NOT NULL IDENTITY,
        [UserId] bigint NOT NULL,
        [Description] nvarchar(500) NOT NULL,
        [AverageAmount] decimal(18,2) NOT NULL,
        [Frequency] nvarchar(32) NOT NULL,
        [Category] nvarchar(100) NOT NULL,
        [PatternType] int NOT NULL,
        [FirstSeen] datetime2 NOT NULL,
        [LastSeen] datetime2 NOT NULL,
        [OccurrenceCount] int NOT NULL,
        [DetectedAtUtc] datetime2 NOT NULL,
        CONSTRAINT [PK_RecurringPatterns] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_RecurringPatterns_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260401214431_AddTransactionIntelligenceEntities'
)
BEGIN
    CREATE INDEX [IX_AiInsights_UserId] ON [AiInsights] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260401214431_AddTransactionIntelligenceEntities'
)
BEGIN
    CREATE INDEX [IX_BankStatementUploads_UserId] ON [BankStatementUploads] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260401214431_AddTransactionIntelligenceEntities'
)
BEGIN
    CREATE INDEX [IX_RecurringPatterns_UserId] ON [RecurringPatterns] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260401214431_AddTransactionIntelligenceEntities'
)
BEGIN
    CREATE INDEX [IX_RecurringPatterns_UserId_Description] ON [RecurringPatterns] ([UserId], [Description]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260401214431_AddTransactionIntelligenceEntities'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260401214431_AddTransactionIntelligenceEntities', N'10.0.3');
END;

COMMIT;
GO

