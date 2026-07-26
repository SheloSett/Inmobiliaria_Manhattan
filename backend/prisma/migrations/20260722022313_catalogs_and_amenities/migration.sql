/*
  Warnings:

  - Changed the type of `operation` on the `Property` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `type` on the `Property` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
-- Editado a mano: en vez de DROP/ADD (que perdería los datos), convertimos el enum a
-- TEXT preservando los valores existentes (SALE/RENT, APARTMENT/HOUSE/... quedan como
-- strings). El `USING col::text` hace el cast del enum a texto.
ALTER TABLE "Property" ALTER COLUMN "operation" TYPE TEXT USING "operation"::text;
ALTER TABLE "Property" ALTER COLUMN "type" TYPE TEXT USING "type"::text;

-- DropEnum
DROP TYPE "Operation";

-- DropEnum
DROP TYPE "PropertyType";

-- CreateTable
CREATE TABLE "OperationType" (
    "id" SERIAL NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "OperationType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyTypeOption" (
    "id" SERIAL NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PropertyTypeOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Amenity" (
    "id" SERIAL NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Amenity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PropertyAmenities" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "OperationType_value_key" ON "OperationType"("value");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyTypeOption_value_key" ON "PropertyTypeOption"("value");

-- CreateIndex
CREATE UNIQUE INDEX "Amenity_value_key" ON "Amenity"("value");

-- CreateIndex
CREATE UNIQUE INDEX "_PropertyAmenities_AB_unique" ON "_PropertyAmenities"("A", "B");

-- CreateIndex
CREATE INDEX "_PropertyAmenities_B_index" ON "_PropertyAmenities"("B");

-- AddForeignKey
ALTER TABLE "_PropertyAmenities" ADD CONSTRAINT "_PropertyAmenities_A_fkey" FOREIGN KEY ("A") REFERENCES "Amenity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PropertyAmenities" ADD CONSTRAINT "_PropertyAmenities_B_fkey" FOREIGN KEY ("B") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
