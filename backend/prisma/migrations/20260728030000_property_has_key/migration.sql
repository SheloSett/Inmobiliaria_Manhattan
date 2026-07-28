-- Agrega el campo "con llave" (hasKey) a Property.
-- Indica que la inmobiliaria tiene la llave para mostrar la propiedad.
ALTER TABLE "Property" ADD COLUMN "hasKey" BOOLEAN NOT NULL DEFAULT false;
