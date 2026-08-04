-- CreateTable
CREATE TABLE "PropertyEvent" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PropertyEvent_propertyId_type_createdAt_idx" ON "PropertyEvent"("propertyId", "type", "createdAt");

-- AddForeignKey
ALTER TABLE "PropertyEvent" ADD CONSTRAINT "PropertyEvent_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
