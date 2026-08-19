-- 1) keyStatus: reemplaza al booleano "hasKey" por tres estados
--    ("WITH" = con llave, "WITHOUT" = sin llave, "HIDDEN" = no mostrar).
--    Se backfillea desde hasKey para que NINGUNA propiedad existente cambie de
--    aspecto al deployar: las que tenían llave quedan en WITH y el resto en WITHOUT.
--    La columna hasKey NO se elimina (regla del proyecto de no borrar) y se sigue
--    escribiendo en sincronía desde el controller.
ALTER TABLE "Property" ADD COLUMN "keyStatus" TEXT NOT NULL DEFAULT 'WITHOUT';
UPDATE "Property" SET "keyStatus" = 'WITH' WHERE "hasKey" = true;

-- 2) published: permite pausar una publicación sin borrarla. Default true para que
--    todas las propiedades ya cargadas sigan visibles después de la migración.
ALTER TABLE "Property" ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT true;
