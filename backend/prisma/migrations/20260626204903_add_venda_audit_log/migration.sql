-- CreateTable
CREATE TABLE "VendaAuditLog" (
    "id" TEXT NOT NULL,
    "vendaId" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "dadosAntes" JSONB NOT NULL,
    "dadosDepois" JSONB,
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendaAuditLog_pkey" PRIMARY KEY ("id")
);
