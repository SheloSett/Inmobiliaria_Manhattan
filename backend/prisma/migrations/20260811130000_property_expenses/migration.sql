-- Expensas de la propiedad: monto mensual opcional + su moneda (default ARS).
ALTER TABLE "Property" ADD COLUMN "expenses" DOUBLE PRECISION;
ALTER TABLE "Property" ADD COLUMN "expensesCurrency" TEXT NOT NULL DEFAULT 'ARS';
